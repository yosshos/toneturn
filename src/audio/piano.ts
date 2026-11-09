// Procedural piano + UI cue synthesis on Web Audio. No samples, works offline.
//
// Piano model per note:
//  - stiff-string partials (f_n = n·f0·√(1 + B·n²)) with per-partial decay; low notes ring longer
//  - two-stage decay (prompt sound then aftersound) like a real hammered string
//  - unison detune on the lowest partials for gentle beating
//  - band-passed hammer noise for the attack
//  - a low-pass that closes over time so notes darken as they decay
//  - damper release at note-off
// Bus: voices → (dry + small convolution room) → compressor/limiter → master.

import { midiToHz } from '../engine/pitch';
import { CHANNELS, ChannelStrip, effectiveVol, mixerOf, type ChannelId, type MixerSettings } from './mixer';
import { KIT_FILES, type DrumKit } from '../engine/grooves';
import type { NoteEvent, PercKind } from '../engine/lesson';
import { Cancelled, type AudioEngine, type CueKind, type RhythmAudio, type RhythmTimelineLike } from '../game/adapters';
import { renderFx } from './fx';
import { layerGain, layerOf, RoundRobin, WURLI_LAYERS, wurliGain } from './layers';
import { Leslie, organKey, REGISTRATIONS, type Registration } from './organ';
import { autoPan, epKey } from './epiano';
import { damperTau, layerFor, lightDevice, loadOrder, nearestLoaded, NO_DAMPER_FROM, releaseNoiseGain, releaseResGain, targetDb, vel127, type GrandLayer } from './grand';

interface Voice {
  out: GainNode;
  oscs: AudioScheduledSourceNode[];
  end: number;
}

type SampleBank = { id: string; notes: number[]; buffers: Map<number, AudioBuffer> };
type SetInfo = { ext: string; notes: number[]; lovel?: number; db?: number; rtDecay?: number };

/**
 * Level trim of the 16-layer grand (its samples keep their recorded dynamics, the loudest peak at −1 dBFS):
 * set so a velocity of 0.75 sounds as loud as the earlier 4-layer grand did.
 */
const GRAND_TRIM = 0.61;
/** Per-piece level of the recorded jazz kit (dB), matched to the earlier one-shots at a velocity of 0.8. */
const DRUM_TRIM_DB: Record<string, number> = { kick: 5.5, snare: 1.5, rim: 4.5, hat: 7, 'hat-foot': 6, 'hat-open': 5, ride: 8, 'ride-bell': 6, crash: 2, 'tom-hi': 2, 'tom-lo': 2 };
/** The pizzicato bass, matched to the earlier single-layer bass at a velocity of 0.7. */
const BASS_TRIM = 0.8;
/**
 * Instruments with recorded dynamics (0.58, VCSL): the vibraphone (soft mallets for soft playing, hard for loud —
 * so the colour never jumps back) and the marimba. The middle layer loads first; the trim matches the earlier
 * single-layer sound at a velocity of 0.75.
 */
const LAYERED: Record<string, { sets: string[]; trim: number }> = {
  vibraphone: { sets: ['vibes-1', 'vibes-2', 'vibes-4'], trim: Math.pow(10, -0.3 / 20) },
  marimba: { sets: ['marimba-1', 'marimba-2', 'marimba-3'], trim: Math.pow(10, 4.5 / 20) },
  upright: { sets: ['upright-1', 'upright-2', 'upright-3'], trim: Math.pow(10, -1.4 / 20) },
};
/** The Wurlitzer next to the grand. */
const WURLI_TRIM = 0.6;
/** Percussion kinds → pieces of the recorded kit. */
const PERC_PIECE: Partial<Record<PercKind, string>> = {
  kick: 'kick', snare: 'snare', 'snare-soft': 'snare', hat: 'hat', ride: 'ride', 'ride-bell': 'ride-bell', 'hat-foot': 'hat-foot',
  'hat-open': 'hat-open', rim: 'rim', crash: 'crash', 'tom-hi': 'tom-hi', 'tom-lo': 'tom-lo',
};

/** Touch response of the MIDI keys (like a keyboard's velocity curve): light = soft touch already sounds full. */
export type LiveCurve = 'light' | 'normal' | 'heavy' | 'fixed';
export function liveVelocity(v127: number, curve: LiveCurve): number {
  if (curve === 'fixed') return 0.7;
  const x = Math.max(1, Math.min(127, v127)) / 127;
  const y = curve === 'light' ? Math.pow(x, 0.6) : curve === 'heavy' ? Math.pow(x, 1.6) : x;
  return Math.max(0.08, Math.min(1, y));
}

export class PianoEngine implements AudioEngine, RhythmAudio {
  private ctx: AudioContext | null = null;
  private pianoBus!: GainNode;
  private cueBus!: GainNode;
  private noise!: AudioBuffer;
  private limiter!: DynamicsCompressorNode;
  /** Recorded one-shots (VCSL, CC0): kick, snare, hats, ride, rim, clap, cowbell, shaker, the option bell. Synthesised stand-ins play until they load. */
  private percBank = new Map<string, AudioBuffer>();
  /** The metronome's drum kit (0.43) and its recorded one-shots, loaded on demand ("kit:id"). */
  private kit: DrumKit = 'classic';
  private kitBank = new Map<string, AudioBuffer>();
  private kitLoads = new Map<string, Promise<void>>();
  private percBus!: GainNode;
  private drone: { gain: GainNode; oscs: AudioScheduledSourceNode[] } | null = null;
  /** Drone sound: the soft synth, or a recorded sustained instrument (looped). */
  private droneBank: { id: string; notes: number[]; buffers: Map<number, AudioBuffer> } | null = null;
  private voices = new Set<Voice>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private active = new Map<number, number>(); // midi → count
  private listeners = new Set<(active: number[]) => void>();
  /** Master volume (0..1). */
  volume = 0.9;
  /** Right / wrong / done chimes (Settings → Sound). The "ready" cue stays: it tells you to answer. */
  cuesOn = true;
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }
  /** Instrument sound (spec Q): 'classic' = the synthesised piano; otherwise a sample set from /samples. */
  private sound = 'classic';
  private bank: { id: string; notes: number[]; buffers: Map<number, AudioBuffer> } | null = null;
  private sampleBus!: GainNode;
  /** Processed sounds (spec AE `fx`): straight to the master (past the limiter, so compression items stay honest). */
  private master!: GainNode;
  private fxPlaying = new Set<{ src: AudioBufferSourceNode; gain: GainNode }>();
  /** Extra sample sets loaded in the background: the grand's velocity layers and the upright bass. */
  private extras = new Map<string, SampleBank>();
  private extraLoads = new Set<string>();
  private extraFailed = new Map<string, number>();
  /** The light room on the piano / bass. */
  private roomWet: GainNode | null = null;
  private roomOn = true;
  /** The mixer (owner 2026-11-08): a channel strip per source — piano, bass, drums & metronome, cues. */
  private strips: Partial<Record<ChannelId, ChannelStrip>> = {};
  private mixer: MixerSettings = mixerOf(null);
  private bassBus!: GainNode;
  private delayNode: DelayNode | null = null;
  private delayFb: GainNode | null = null;
  /** Apply mixer settings (levels, EQ, effects, sends); kept for when the audio graph is built later. */
  setMixer(m: Partial<MixerSettings> | null | undefined) {
    this.mixer = mixerOf(m);
    this.applyMixer();
  }
  private applyMixer() {
    if (!this.ctx) return;
    for (const id of CHANNELS) this.strips[id]?.apply(this.mixer.channels[id], effectiveVol(this.mixer, id));
    const t = this.ctx.currentTime;
    this.delayNode?.delayTime.setTargetAtTime(Math.max(0.05, Math.min(1.5, this.mixer.delayMs / 1000)), t, 0.05);
    this.delayFb?.gain.setTargetAtTime(Math.max(0, Math.min(0.8, this.mixer.feedback)), t, 0.05);
  }

  get soundId() {
    return this.bank ? this.bank.id : 'classic';
  }

  /**
   * Choose the instrument. Sample sets download on first use (then the service worker keeps them for
   * offline use). Resolves false — and keeps the classic piano — when anything fails.
   */
  setSound(id: string, onProgress?: (done: number, total: number) => void): Promise<boolean> {
    this.sound = id;
    if (id === 'classic') {
      this.bank = null;
      return Promise.resolve(true);
    }
    if (this.bank?.id === id) return Promise.resolve(true);
    // modelled instruments: nothing to download
    if (id === 'tonewheel' || id === 'tine') {
      this.bank = { id, notes: [], buffers: new Map() };
      return Promise.resolve(true);
    }
    const load = (async () => {
      try {
        // the Wurlitzer: its mp layer is the base, the other dynamics load behind it
        const lay = LAYERED[id];
        const baseSet = lay ? lay.sets[1] : null;
        const bank = id === 'wurli' ? { ...(await this.loadSet('wurli-mp', onProgress)), id: 'wurli' } : baseSet ? { ...(await this.loadSet(baseSet, onProgress)), id } : await this.loadSet(id, onProgress);
        if (lay && baseSet) {
          this.extras.set(baseSet, { ...bank, id: baseSet });
          for (const l of lay.sets) this.loadExtra(l);
          void this.sets().then((all) => lay.sets.forEach((l) => all[l] && (this.info[l] = all[l])));
        }
        if (id === 'wurli') {
          this.extras.set('wurli-mp', { ...bank, id: 'wurli-mp' });
          for (const l of WURLI_LAYERS) this.loadExtra(l.id);
        }
        if (this.sound !== id) return false; // changed meanwhile
        this.bank = bank;
        if (id === 'grand') void this.prefetchGrand();
        return true;
      } catch {
        if (this.sound === id) this.bank = null;
        return false;
      }
    })();
    return load;
  }

  private manifestP: Promise<Record<string, SetInfo>> | null = null;
  /** The sample manifest (fetched once). */
  private sets(): Promise<Record<string, SetInfo>> {
    const base = import.meta.env.BASE_URL ?? '/';
    this.manifestP ??= fetch(`${base}samples/manifest.json`)
      .then((r) => r.json() as Promise<{ sets: Record<string, SetInfo> }>)
      .then((m) => m.sets)
      .catch((e) => {
        this.manifestP = null;
        throw e;
      });
    return this.manifestP;
  }

  // ---- the 16-layer concert grand (0.54)
  private grandLayers: GrandLayer[] | null = null;
  private grandInfo: Record<string, SetInfo> = {};
  /** 'auto' = every layer on a computer, eight on a light phone; or set by the player. */
  private pianoDetail: 'auto' | 'full' | 'light' = 'auto';
  setPianoDetail(d: 'auto' | 'full' | 'light') {
    this.pianoDetail = d;
    if (this.bank?.id === 'grand') void this.prefetchGrand();
  }
  /** How many of the grand's layers are ready (for Settings). */
  get grandReady(): { loaded: number; total: number } {
    const ids = this.grandLayers?.map((l) => l.id) ?? [];
    return { loaded: ids.filter((id) => this.extras.has(id)).length, total: ids.length };
  }
  private prefetching = false;
  /** Load the grand's layers in the background, the everyday ones first, then its release and pedal sounds. */
  private async prefetchGrand() {
    try {
      const sets = await this.sets();
      this.grandInfo = sets;
      this.grandLayers ??= Object.keys(sets)
        .filter((k) => /^grand-v\d\d$/.test(k))
        .sort()
        .map((id) => ({ id, lovel: sets[id].lovel ?? 1, db: sets[id].db ?? 0 }));
      if (this.prefetching || !this.grandLayers.length) return;
      this.prefetching = true;
      const light = this.pianoDetail === 'light' || (this.pianoDetail === 'auto' && lightDevice());
      const order = loadOrder(this.grandLayers.length, light).map((i) => this.grandLayers![i].id);
      const extrasAfter = 2; // release and pedal sounds right after the two everyday layers
      for (let k = 0; k < order.length; k++) {
        if (this.bank?.id !== 'grand') break;
        await this.loadNow(order[k]);
        if (k + 1 === extrasAfter) for (const id of ['grand-rel', 'grand-resL', 'grand-resS', 'grand-pedal']) if (sets[id]) await this.loadNow(id);
      }
    } catch {
      /* offline: the layers that loaded play, the rest stand in */
    } finally {
      this.prefetching = false;
    }
  }
  /** Load a set into `extras` now (awaitable; shares the in-flight guard with loadExtra). */
  private async loadNow(id: string) {
    if (this.extras.has(id) || this.extraLoads.has(id)) return;
    this.extraLoads.add(id);
    try {
      this.extras.set(id, await this.loadSet(id));
    } catch {
      this.extraFailed.set(id, Date.now());
    } finally {
      this.extraLoads.delete(id);
    }
  }

  /** Load a sample set (shared by instrument sounds and the drone). */
  private async loadSet(id: string, onProgress?: (done: number, total: number) => void) {
    const base = import.meta.env.BASE_URL ?? '/';
    const set = (await this.sets())[id];
    if (!set) throw new Error('no set');
    // Decode at the playing rate: decoding into a 22 kHz context (as before 0.54) cut everything above 11 kHz.
    const decoder: BaseAudioContext = this.ctx ?? new OfflineAudioContext(2, 1, 48000);
    const buffers = new Map<number, AudioBuffer>();
    let done = 0;
    await Promise.all(
      set.notes.map(async (m) => {
        const res = await fetch(`${base}samples/${id}/${m}.${set.ext}`);
        if (!res.ok) throw new Error(String(res.status));
        buffers.set(m, await decoder.decodeAudioData(await res.arrayBuffer()));
        onProgress?.(++done, set.notes.length);
      }),
    );
    return { id, notes: set.notes, buffers };
  }

  get droneSoundId() {
    return this.droneBank ? this.droneBank.id : 'soft';
  }

  /** Choose the drone sound: 'soft' (synthesised) or a sustained sample set such as 'organ'. False on failure. */
  async setDroneSound(id: string, onProgress?: (done: number, total: number) => void): Promise<boolean> {
    if (id === 'soft') {
      this.droneBank = null;
      return true;
    }
    if (this.droneBank?.id === id) return true;
    try {
      this.droneBank = this.bank?.id === id ? this.bank : await this.loadSet(id, onProgress);
      return true;
    } catch {
      this.droneBank = null;
      return false;
    }
  }

  /** Loop points on rising zero crossings in the steady middle of a sample (no clicks). */
  private static loopPoints(buf: AudioBuffer): [number, number] {
    const d = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const rising = (from: number) => {
      for (let i = Math.max(1, from); i < d.length - 1; i++) if (d[i - 1] < 0 && d[i] >= 0) return i;
      return from;
    };
    const a = rising(Math.floor(buf.duration * 0.3 * sr));
    const b = rising(Math.floor(buf.duration * 0.85 * sr));
    return [a / sr, b / sr];
  }

  /** Load a velocity layer of the grand ("grand-pp" …) or the bass once, in the background; failures retry after a minute. */
  private loadExtra(id: string) {
    if (this.extras.has(id) || this.extraLoads.has(id) || Date.now() - (this.extraFailed.get(id) ?? -1e9) < 60_000) return;
    this.extraLoads.add(id);
    this.loadSet(id)
      .then((b) => void this.extras.set(id, b))
      .catch(() => void this.extraFailed.set(id, Date.now()))
      .finally(() => this.extraLoads.delete(id));
  }

  /** Room reverb on the piano / bass (Settings could switch it off; the metronome and processed sounds never use it). */
  setRoom(on: boolean) {
    this.roomOn = on;
    if (this.roomWet && this.ctx) this.roomWet.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  /** Play one note from the sample bank; false when there is no bank (the synth plays instead). */
  private sample(midi: number, velocity: number, start: number, dur: number, inst?: NoteEvent['inst']): boolean {
    const ctx = this.ctx;
    if (!ctx) return false;
    if (inst === 'bass') {
      if (this.playBass(midi, velocity, start, dur)) return true;
      void this.loadStems('bass-pizz');
      const bass = this.extras.get('bass');
      if (bass) {
        // Pizzicato upright bass (one mf layer): a gentle gain with velocity; out of its range the piano plays.
        const ok = this.playBuf(bass, midi, start, dur, 0.3 + 0.47 * velocity, 4, this.bassBus);
        if (ok) return true;
      } else this.loadExtra('bass');
    }
    const bank = this.bank;
    if (!bank) return false;
    if (bank.id === 'tonewheel') return this.playOrgan(midi, velocity, start, dur);
    if (bank.id === 'tine') return this.playTine(midi, velocity, start, dur);
    if (bank.id === 'wurli') return this.playWurli(midi, velocity, start, dur);
    if (LAYERED[bank.id]) {
      const lay = LAYERED[bank.id];
      const want = layerOf(velocity, lay.sets.length);
      if (!this.extras.has(lay.sets[want])) this.loadExtra(lay.sets[want]);
      const i = nearestLoaded(lay.sets.length, want, (k) => this.extras.has(lay.sets[k]));
      const dbs = lay.sets.map((l) => this.info[l]?.db ?? -20);
      if (i >= 0) return this.playBuf(this.extras.get(lay.sets[i])!, midi, start, dur, layerGain(velocity, dbs, i) * lay.trim);
    }
    if (bank.id === 'grand' && this.grandLayers?.length) {
      // 16 velocity layers: the layer gives the timbre, the level follows a smooth line through the layers' measured
      // loudness. A layer still loading is stood in for by its nearest loaded neighbour (and asked for now).
      const L = this.grandLayers;
      const v = vel127(velocity);
      const want = layerFor(L, v);
      if (!this.extras.has(L[want].id)) this.loadExtra(L[want].id);
      const i = nearestLoaded(L.length, want, (k) => this.extras.has(L[k].id));
      if (i >= 0) return this.playGrand(this.extras.get(L[i].id)!, midi, start, dur, v, Math.pow(10, (targetDb(L, v) - L[i].db) / 20) * GRAND_TRIM);
    }
    // Soft notes (expression exercises) really get soft; everything at 0.45 and up sounds as before.
    const peak = velocity >= 0.45 ? 0.55 + 0.45 * velocity : 0.08 + (0.7525 - 0.08) * (velocity / 0.45);
    return this.playBuf(bank, midi, start, dur, peak);
  }

  /** One sampled note from `bank` (nearest sample, re-pitched). False when no sample is within `maxShift` semitones. */
  private playBuf(bank: SampleBank, midi: number, start: number, dur: number, peak: number, maxShift = 99, bus?: GainNode): boolean {
    const ctx = this.ctx!;
    const nearest = bank.notes.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
    const buf = bank.buffers.get(nearest);
    if (!buf || Math.abs(midi - nearest) > maxShift) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - nearest) / 12);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, start);
    out.gain.linearRampToValueAtTime(peak, start + 0.006);
    out.gain.setTargetAtTime(0, start + dur, 0.11);
    src.connect(out).connect(bus ?? (this.liveRoute && this.liveSampleBus ? this.liveSampleBus : this.sampleBus));
    const stopAt = Math.min(start + buf.duration / src.playbackRate.value, start + dur + 0.8);
    src.start(start);
    src.stop(stopAt);
    const v: Voice = { out, oscs: [src], end: stopAt };
    this.voices.add(v);
    src.onended = () => {
      this.voices.delete(v);
      out.disconnect();
    };
    return true;
  }

  /**
   * One note of the concert grand: the nearest of its samples (every minor third), a hair of natural variation between
   * strikes (±2 cents, ±0.4 dB — no two hammer blows are the same), the damper by register (the top keys have none and
   * ring on), and at the release the key's damper noise and the string's release resonance, as the library maps them.
   */
  private playGrand(bank: SampleBank, midi: number, start: number, dur: number, v: number, gain: number): boolean {
    const ctx = this.ctx!;
    const nearest = bank.notes.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
    const buf = bank.buffers.get(nearest);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const cents = (Math.random() * 2 - 1) * 2;
    src.playbackRate.value = Math.pow(2, (midi - nearest) / 12 + cents / 1200);
    const out = ctx.createGain();
    const peak = gain * Math.pow(10, ((Math.random() * 2 - 1) * 0.4) / 20);
    out.gain.setValueAtTime(0, start);
    out.gain.linearRampToValueAtTime(peak, start + 0.002);
    const tau = damperTau(midi);
    const live = this.liveRoute;
    const natural = start + buf.duration / src.playbackRate.value;
    let stopAt = natural;
    if (!live && Number.isFinite(tau)) {
      out.gain.setTargetAtTime(0, start + dur, tau);
      stopAt = Math.min(natural, start + dur + tau * 8);
    }
    src.connect(out).connect(live && this.liveSampleBus ? this.liveSampleBus : this.sampleBus);
    src.start(start);
    src.stop(stopAt);
    const voice: Voice & { grand?: { v: number; t0: number } } = { out, oscs: [src], end: stopAt, grand: { v, t0: start } };
    this.voices.add(voice);
    src.onended = () => {
      this.voices.delete(voice);
      out.disconnect();
    };
    if (!live && midi < NO_DAMPER_FROM) this.grandRelease(midi, v, start + dur, dur);
    return true;
  }

  /** The release of a grand key at `at`: the damper's noise and the string's release resonance. */
  private grandRelease(midi: number, v: number, at: number, held: number, bus?: GainNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = bus ?? this.sampleBus;
    const one = (id: string, key: number, gain: number, maxShift: number) => {
      const b = this.extras.get(id);
      if (!b || gain < 0.0005) return;
      const nearest = b.notes.reduce((a, c) => (Math.abs(c - key) < Math.abs(a - key) ? c : a));
      const buf = b.buffers.get(nearest);
      if (!buf || Math.abs(nearest - key) > maxShift) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.pow(2, (key - nearest) / 12);
      const g = ctx.createGain();
      g.gain.value = gain * GRAND_TRIM;
      src.connect(g).connect(out);
      const t = Math.max(at, ctx.currentTime);
      src.start(t);
      const vc: Voice = { out: g, oscs: [src], end: t + buf.duration };
      this.voices.add(vc);
      src.onended = () => {
        this.voices.delete(vc);
        g.disconnect();
      };
    };
    one('grand-rel', midi, releaseNoiseGain(v), 0);
    const res = v >= 45 ? 'grand-resL' : 'grand-resS';
    const info = this.grandInfo[res];
    if (info) one(res, midi, releaseResGain(info.db ?? 0, info.rtDecay ?? 7, held, v) * 0.7, 2);
  }

  // ---------------------------------------------------------------- the band and the other keyboards (0.55)

  /** Sample sets addressed by name (drum strikes "snare-2-3", bass "m-41-2"), decoded at the playing rate. */
  private stems = new Map<string, Map<string, AudioBuffer>>();
  private stemLoads = new Map<string, Promise<boolean>>();
  private info: Record<string, SetInfo & { pieces?: Record<string, { layers: string[][]; db: number[] }>; layers?: { dyn: string; notes: number[]; rr: number; db: number }[] }> = {};
  private loadStems(id: string): Promise<boolean> {
    let p = this.stemLoads.get(id);
    if (!p) {
      p = (async () => {
        const ctx = this.ctx;
        if (!ctx) return false;
        try {
          const base = import.meta.env.BASE_URL ?? '/';
          const sets = (await this.sets()) as typeof this.info;
          const set = sets[id];
          if (!set) return false;
          this.info[id] = set;
          const m = new Map<string, AudioBuffer>();
          await Promise.all(
            (set.notes as unknown as string[]).map(async (s) => {
              const r = await fetch(`${base}samples/${id}/${s}.${set.ext}`);
              if (r.ok) m.set(s, await ctx.decodeAudioData(await r.arrayBuffer()));
            }),
          );
          this.stems.set(id, m);
          return true;
        } catch {
          this.stemLoads.delete(id);
          return false;
        }
      })();
      this.stemLoads.set(id, p);
    }
    return p;
  }

  /** Which drums the backing tracks and rhythm items use: the recorded jazz kit (default) or the earlier one-shots. */
  bandDrums: 'jazz' | 'classic' = 'jazz';
  setBandDrums(k: 'jazz' | 'classic') {
    this.bandDrums = k;
    if (k === 'jazz') void this.loadStems('drums-jazz');
  }
  private rr = new RoundRobin();
  /**
   * One strike of the recorded jazz kit: the dynamic layer from the velocity, an alternate strike never the same twice
   * in a row, the level along a smooth line through the layers' measured loudness. False when the kit is not loaded.
   */
  private kitHit(piece: string, at: number, v: number): boolean {
    const P = this.info['drums-jazz']?.pieces?.[piece];
    const bufs = this.stems.get('drums-jazz');
    if (!P || !bufs || !this.ctx) {
      void this.loadStems('drums-jazz');
      return false;
    }
    const i = layerOf(v, P.layers.length);
    const list = P.layers[i];
    const buf = bufs.get(list[this.rr.pick(`${piece}:${i}`, list.length)]);
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = layerGain(v, P.db, i) * Math.pow(10, (DRUM_TRIM_DB[piece] ?? 3) / 20);
    src.connect(g).connect(this.percBus);
    src.start(Math.max(at, this.ctx.currentTime));
    src.onended = () => g.disconnect();
    return true;
  }

  /** The pizzicato double bass: 3 dynamics × 4 alternate plucks; false when not loaded or out of its range. */
  private playBass(midi: number, v: number, start: number, dur: number): boolean {
    const ctx = this.ctx;
    const L = this.info['bass-pizz']?.layers;
    const bufs = this.stems.get('bass-pizz');
    if (!ctx || !L || !bufs) return false;
    const i = layerOf(v, L.length);
    const layer = L[i];
    const near = layer.notes.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
    if (Math.abs(near - midi) > 4) return false;
    const k = this.rr.pick(`bass:${layer.dyn}:${near}`, layer.rr);
    const buf = bufs.get(`${layer.dyn}-${near}-${k + 1}`) ?? bufs.get(`${layer.dyn}-${near}-1`);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - near) / 12);
    const out = ctx.createGain();
    const peak = layerGain(v, L.map((l) => l.db), i) * BASS_TRIM;
    out.gain.setValueAtTime(peak, start);
    out.gain.setTargetAtTime(0, start + dur, 0.07); // the left hand stops the string
    src.connect(out).connect(this.bassBus);
    const stopAt = Math.min(start + buf.duration / src.playbackRate.value, start + dur + 0.6);
    src.start(start);
    src.stop(stopAt);
    const vc: Voice = { out, oscs: [src], end: stopAt };
    this.voices.add(vc);
    src.onended = () => {
      this.voices.delete(vc);
      out.disconnect();
    };
    return true;
  }

  /** The Wurlitzer: 4 recorded dynamics; prefers a layer with a sample close to the key (the set is sparse). */
  private playWurli(midi: number, v: number, start: number, dur: number): boolean {
    const v127 = vel127(v);
    let want = 0;
    WURLI_LAYERS.forEach((l, k) => l.lovel <= v127 && (want = k));
    const order = [want, want - 1, want + 1, want - 2, want + 2, want - 3, want + 3].filter((k) => k >= 0 && k < WURLI_LAYERS.length);
    const dist = (b: SampleBank) => Math.min(...b.notes.map((n) => Math.abs(n - midi)));
    let bank: SampleBank | undefined;
    for (const k of order) {
      const b = this.extras.get(WURLI_LAYERS[k].id);
      if (b && dist(b) <= 3) {
        bank = b;
        break;
      }
    }
    bank ??= order.map((k) => this.extras.get(WURLI_LAYERS[k].id)).find(Boolean) ?? this.bank ?? undefined;
    if (!bank) return false;
    const db = this.info[bank.id]?.db ?? (this.grandInfo[bank.id]?.db as number | undefined) ?? -9;
    return this.playBuf(bank, midi, start, dur, wurliGain(v127) * Math.pow(10, (-9 - db) / 20) * WURLI_TRIM);
  }

  /** Organ settings: the registration and the rotating speaker. */
  private organReg: Registration = REGISTRATIONS[0];
  private leslie: Leslie | null = null;
  private leslieFast = false;
  setOrgan(o: { reg?: string; fast?: boolean }) {
    if (o.reg) this.organReg = REGISTRATIONS.find((r) => r.id === o.reg) ?? this.organReg;
    if (o.fast !== undefined) {
      this.leslieFast = o.fast;
      this.leslie?.setSpeed(o.fast);
    }
  }
  private playOrgan(midi: number, v: number, start: number, dur: number): boolean {
    const ctx = this.ctx!;
    if (!this.leslie) {
      this.leslie = new Leslie(ctx);
      const g = ctx.createGain();
      g.gain.value = 0.26;
      this.leslie.output.connect(g).connect(this.strips.piano!.input);
      this.leslie.setSpeed(this.leslieFast);
    }
    const k = organKey(ctx, 440 * Math.pow(2, (midi - 69) / 12), this.organReg, start, start + dur, v, this.leslie.input);
    const vc: Voice = { out: k.out, oscs: k.srcs, end: k.stop };
    this.voices.add(vc);
    k.srcs[0].onended = () => {
      this.voices.delete(vc);
      k.out.disconnect();
    };
    return true;
  }

  /** The tine electric piano, with the suitcase tremolo when it is on. */
  private tineTrem: { input: AudioNode; setDepth: (x: number) => void } | null = null;
  private tremDepth = 0;
  setTremolo(depth: number) {
    this.tremDepth = Math.max(0, Math.min(1, depth));
    this.tineTrem?.setDepth(this.tremDepth);
  }
  private playTine(midi: number, v: number, start: number, dur: number): boolean {
    const ctx = this.ctx!;
    const bus = this.liveRoute && this.liveSampleBus ? this.liveSampleBus : this.sampleBus;
    if (this.tremDepth > 0 && !this.tineTrem) this.tineTrem = autoPan(ctx, this.sampleBus, 4.2, this.tremDepth);
    const k = epKey(ctx, midi, v, start, start + dur, bus, this.tremDepth > 0 ? this.tineTrem!.input : undefined);
    const vc: Voice = { out: k.out, oscs: k.srcs, end: k.stop };
    this.voices.add(vc);
    k.srcs[0].onended = () => {
      this.voices.delete(vc);
      k.out.disconnect();
    };
    return true;
  }

  /**
   * Brushes (0.56), modelled: no free recording is good enough. A sweep is the wire brush circling the snare head —
   * band-limited noise that swells and fades over about a beat while its colour drifts and it moves a little across
   * the stereo field; a tap is the brush striking — a short bright burst over a low snare-head thud.
   */
  private brush(sweep: boolean, at: number, v: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    src.connect(bp).connect(g).connect(pan).connect(this.percBus);
    if (sweep) {
      const len = 0.42 + Math.random() * 0.08;
      bp.Q.value = 0.6;
      bp.frequency.setValueAtTime(2400 + Math.random() * 600, at);
      bp.frequency.linearRampToValueAtTime(4200 + Math.random() * 800, at + len * 0.6);
      bp.frequency.linearRampToValueAtTime(3000, at + len);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.11 * v, at + len * 0.45);
      g.gain.linearRampToValueAtTime(0, at + len);
      pan.pan.setValueAtTime(-0.25, at);
      pan.pan.linearRampToValueAtTime(0.25, at + len);
      src.start(at);
      src.stop(at + len + 0.02);
      return;
    }
    bp.Q.value = 0.9;
    bp.frequency.value = 3800;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.5 * v, at + 0.002);
    g.gain.setTargetAtTime(0, at + 0.004, 0.035);
    src.start(at);
    src.stop(at + 0.25);
    // the head's low thud
    this.tone(at, 'sine', 190, 0.22 * v, 0.06);
  }

  /** The sustain pedal's own sound (felt and mechanism), and its resonance send. */
  private pedalNoise(down: boolean) {
    const ctx = this.ctx;
    const b = this.extras.get('grand-pedal');
    if (!ctx || !b || this.bank?.id !== 'grand') return;
    const key = down ? (Math.random() < 0.5 ? 1 : 2) : Math.random() < 0.5 ? 3 : 4;
    const buf = b.buffers.get(key);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = Math.pow(10, (this.grandInfo['grand-pedal']?.db ?? -20) / 20) * GRAND_TRIM;
    src.connect(g).connect(this.liveSampleBus ?? this.sampleBus);
    src.start();
    src.onended = () => g.disconnect();
  }

  // Live notes from a MIDI keyboard (0.50): the keys sound through the app, as in a piano app or a software
  // instrument — on by default, since most MIDI keyboards have no speakers. A key holds its note until released;
  // the sustain pedal (CC64) holds released notes, the sostenuto pedal (CC66) holds only the notes down when it was
  // pressed, the soft pedal (CC67) plays quieter and darker. Its own volume and touch curve; at most LIVE_MAX notes
  // sound at once (the oldest is let go); "all notes off" on request, on disconnect and when the app is hidden.
  private live = new Map<number, Voice>();
  private liveHeld = new Set<number>();
  private liveSustain = false;
  private liveSostenuto = new Set<number>();
  private liveSoft = false;
  private liveRoute = false;
  private liveSampleBus: GainNode | null = null;
  private liveSynthBus: GainNode | null = null;
  private liveOpts: { volume: number; curve: LiveCurve } = { volume: 1, curve: 'normal' };
  static LIVE_MAX = 48;
  setLiveOptions(o: Partial<{ volume: number; curve: LiveCurve }>) {
    this.liveOpts = { ...this.liveOpts, ...o };
    const ctx = this.ctx;
    if (ctx && this.liveSampleBus && this.liveSynthBus) {
      this.liveSampleBus.gain.setTargetAtTime(0.75 * this.liveOpts.volume, ctx.currentTime, 0.02);
      this.liveSynthBus.gain.setTargetAtTime(0.2 * this.liveOpts.volume, ctx.currentTime, 0.02);
    }
  }
  private ensureLiveBuses() {
    const ctx = this.ctx!;
    if (this.liveSampleBus && this.liveSynthBus) return;
    this.liveSampleBus = ctx.createGain();
    this.liveSampleBus.gain.value = 0.75 * this.liveOpts.volume;
    this.liveSampleBus.connect(this.strips.piano!.input);
    this.liveSynthBus = ctx.createGain();
    this.liveSynthBus.gain.value = 0.2 * this.liveOpts.volume;
    this.liveSynthBus.connect(this.strips.piano!.input);
    // Sympathetic resonance: with the sustain pedal down every string is free, and the whole set rings along with what
    // is played — a dense, slowly fading bloom fed by the live notes (a send that opens only while the pedal is down).
    const res = ctx.createConvolver();
    res.buffer = PianoEngine.stringBloom(ctx);
    this.pedalSend = ctx.createGain();
    this.pedalSend.gain.value = 0;
    this.liveSampleBus.connect(this.pedalSend).connect(res).connect(this.strips.piano!.input);
  }
  private pedalSend: GainNode | null = null;
  private pedalResonance(down: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.pedalSend) return;
    this.pedalSend.gain.setTargetAtTime(down && this.bank?.id === 'grand' ? 0.22 : 0, ctx.currentTime, down ? 0.05 : 0.25);
  }
  /**
   * The undamped strings' bloom: a stereo impulse of decorrelated noise shaped like many strings ringing — a soft
   * onset (the strings take a moment to pick up energy), a long fade (RT60 ≈ 3.5 s) that darkens as it goes.
   */
  private static stringBloom(ctx: BaseAudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 3.6);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      let hp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * (0.35 - 0.27 * Math.min(1, t / 3));
        hp += (lp - hp) * 0.01; // take out the rumble
        const onset = 1 - Math.exp(-t / 0.06);
        d[i] = (lp - hp) * onset * Math.exp((-6.9 * t) / 3.5);
      }
    }
    return ir;
  }
  liveNote(m: number, on: boolean, velocity127: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    // A phone that was in the background (or a context made before any tap) may be suspended: wake it on each key.
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    if (on) {
      this.liveRelease(m, 0.03);
      this.ensureLiveBuses();
      let vel = liveVelocity(velocity127, this.liveOpts.curve);
      if (this.liveSoft) vel *= 0.72;
      const at = ctx.currentTime + 0.003;
      const before = new Set(this.voices);
      this.liveRoute = true;
      try {
        if (!this.sample(m, vel, at, 20)) this.voice(m, vel, at, 20);
      } finally {
        this.liveRoute = false;
      }
      const v = [...this.voices].find((x) => !before.has(x));
      if (v) this.live.set(m, v);
      this.liveHeld.add(m);
      this.noteOn(m);
      // polyphony: let go of the oldest notes that are no longer held
      if (this.live.size > PianoEngine.LIVE_MAX) {
        for (const k of [...this.live.keys()]) {
          if (this.live.size <= PianoEngine.LIVE_MAX) break;
          if (!this.liveHeld.has(k)) this.liveRelease(k, 0.05);
        }
      }
    } else {
      this.liveHeld.delete(m);
      if (!this.liveSustain && !this.liveSostenuto.has(m)) this.liveRelease(m);
    }
  }
  /** Pedals and channel messages from the keyboard. */
  liveControl(cc: number, value: number) {
    const down = value >= 64;
    if (cc === 64) {
      if (down !== this.liveSustain) {
        this.pedalNoise(down);
        this.pedalResonance(down);
      }
      this.liveSustain = down;
      if (!down) this.releaseUnheld();
    } else if (cc === 66) {
      if (down) this.liveSostenuto = new Set(this.liveHeld);
      else {
        this.liveSostenuto.clear();
        if (!this.liveSustain) this.releaseUnheld();
      }
    } else if (cc === 67) this.liveSoft = down;
    else if (cc === 120 || cc === 123) this.liveAllOff();
  }
  /** All notes off (disconnect, app hidden, panic). */
  liveAllOff() {
    this.liveHeld.clear();
    this.liveSostenuto.clear();
    this.liveSustain = false;
    this.liveSoft = false;
    this.pedalResonance(false);
    for (const m of [...this.live.keys()]) this.liveRelease(m);
  }
  private releaseUnheld() {
    for (const m of [...this.live.keys()]) if (!this.liveHeld.has(m) && !this.liveSostenuto.has(m)) this.liveRelease(m);
  }
  private liveRelease(m: number, tau = 0.09) {
    const v = this.live.get(m) as (Voice & { grand?: { v: number; t0: number } }) | undefined;
    if (!v || !this.ctx) return;
    this.live.delete(m);
    const t = this.ctx.currentTime;
    if (v.grand) {
      // The grand: its damper by register (a re-struck key or a polyphony steal still stops quickly), the top keys
      // ring on, and the release sounds play.
      const quick = tau < 0.09;
      const dt = quick ? tau : damperTau(m);
      if (!quick) this.grandRelease(m, v.grand.v, t, t - v.grand.t0, this.liveSampleBus ?? undefined);
      if (!Number.isFinite(dt)) {
        this.noteOff(m);
        return;
      }
      tau = dt;
    }
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.setTargetAtTime(0, t, tau);
    for (const o of v.oscs) {
      try {
        o.stop(t + tau * 7);
      } catch {
        /* already stopped */
      }
    }
    this.noteOff(m);
  }

  // The output device (0.52): an audio interface such as a MIDI keyboard with a headphone jack can become the system
  // default, and the sound then goes there. Settings can send it to a chosen device (AudioContext.setSinkId, Chromium).
  private sinkId: string | null = null;
  get canChooseOutput() {
    return typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
  }
  async setOutputDevice(id: string | null) {
    this.sinkId = id;
    const ctx = this.ctx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!ctx?.setSinkId) return;
    try {
      await ctx.setSinkId(id ?? '');
    } catch {
      /* device gone: the system default plays */
    }
  }

  /** Whether sound can play now (false until the first tap, or after the system suspended it). */
  get audioRunning() {
    return this.ctx?.state === 'running';
  }

  get context() {
    return this.ctx;
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.build(this.ctx);
      void this.loadPerc();
      void this.loadKit(this.kit);
      this.loadExtra('bass'); // small (≈0.4 MB), so backing tracks have it from their first note
      // the band (0.55): the jazz kit (≈5.6 MB) and the pizzicato bass (≈2 MB) load in the background
      setTimeout(() => {
        if (this.bandDrums === 'jazz') void this.loadStems('drums-jazz');
        void this.loadStems('bass-pizz');
      }, 1500);
    }
    if (this.sinkId !== null) void this.setOutputDevice(this.sinkId);
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  private build(ctx: AudioContext) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = this.volume;
    limiter.connect(master).connect(ctx.destination);
    this.limiter = limiter;
    this.master = master;

    this.pianoBus = ctx.createGain();
    this.pianoBus.gain.value = 0.2;
    // Shared effects returns (the mixer's sends feed them):
    // the hall (1.9 s; drums and cues by default) …
    const reverb = ctx.createConvolver();
    reverb.buffer = this.roomImpulse(ctx, 1.9);
    reverb.connect(limiter);
    // … a short, light room (synthetic impulse, generated here — no licence needed; piano and bass by default) …
    const room = ctx.createConvolver();
    room.buffer = PianoEngine.smallRoom(ctx);
    this.roomWet = ctx.createGain();
    this.roomWet.gain.value = this.roomOn ? 1 : 0;
    room.connect(this.roomWet).connect(limiter);
    // … and a feedback delay, darkened a little on each repeat.
    const delayIn = ctx.createGain();
    const dl = ctx.createDelay(2);
    const fb = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3500;
    delayIn.connect(dl).connect(tone).connect(limiter);
    tone.connect(fb).connect(dl);
    this.delayNode = dl;
    this.delayFb = fb;
    const buses = { room, hall: reverb, delay: delayIn };
    for (const id of CHANNELS) this.strips[id] = new ChannelStrip(ctx, limiter, buses);
    // Sources into their channel strips (each keeps its old trim, so the default mix sounds as before).
    this.pianoBus.connect(this.strips.piano!.input);
    this.sampleBus = ctx.createGain();
    this.sampleBus.gain.value = 0.75;
    this.sampleBus.connect(this.strips.piano!.input);
    this.bassBus = ctx.createGain();
    this.bassBus.gain.value = 0.75;
    this.bassBus.connect(this.strips.bass!.input);

    this.percBus = ctx.createGain();
    this.percBus.gain.value = 0.85;
    this.percBus.connect(this.strips.drums!.input);

    this.cueBus = ctx.createGain();
    this.cueBus.gain.value = 0.18;
    this.cueBus.connect(this.strips.cues!.input);
    this.applyMixer();

    const len = Math.floor(ctx.sampleRate * 0.5);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  /**
   * A small room (~1 s): 6 ms pre-delay, a handful of early reflections, then a decorrelated stereo tail
   * (RT60 ≈ 0.9 s) that gets darker as it decays.
   */
  private static smallRoom(ctx: BaseAudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const seconds = 1.1;
    const len = Math.floor(sr * seconds);
    const ir = ctx.createBuffer(2, len, sr);
    const pre = Math.floor(0.006 * sr);
    const refl: [number, number, number][] = [
      [0.011, 0.5, 0.35], [0.017, 0.4, 0.45], [0.023, 0.38, 0.3], [0.031, 0.3, 0.32], [0.041, 0.26, 0.2], [0.053, 0.2, 0.24],
    ];
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (const [t, l, r] of refl) {
        const i = pre + Math.floor((t + (ch ? 0.0013 : 0)) * sr);
        if (i < len) d[i] += ch ? r : l;
      }
      let lp = 0;
      const k = 6.9 / 0.9; // −60 dB in 0.9 s
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * Math.min(1, t / 0.8));
        const fadeIn = t < 0.02 ? t / 0.02 : 1;
        d[i] += 0.5 * lp * Math.exp(-k * t) * fadeIn;
      }
    }
    return ir; // the ConvolverNode normalises it (normalize = true), as with the hall
  }

  private roomImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const white = Math.random() * 2 - 1;
        lp += (white - lp) * (0.55 - 0.4 * (t / seconds)); // darker tail
        d[i] = lp * Math.pow(1 - t / seconds, 2.2) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    return ir;
  }

  private voice(midi: number, velocity: number, start: number, dur: number) {
    const ctx = this.ctx!;
    const f0 = midiToHz(midi);
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.5;
    const bright = Math.min(16000, f0 * (5 + 12 * velocity));
    lp.frequency.setValueAtTime(bright, start);
    lp.frequency.setTargetAtTime(Math.min(bright, f0 * 3 + 900), start + 0.02, 0.7);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.6, Math.min(0.6, (midi - 62) / 40));
    lp.connect(out).connect(pan).connect(this.liveRoute && this.liveSynthBus ? this.liveSynthBus : this.pianoBus);

    // Loudness compensation: high notes are thinner; keep perceived level even.
    const level = velocity * (midi < 48 ? 0.85 : midi > 76 ? 1.15 : 1);
    const B = 0.00008 * Math.pow(2, (midi - 48) / 14);
    const T60 = Math.max(1.2, 9 * Math.pow(2, -(midi - 40) / 22));
    const oscs: AudioScheduledSourceNode[] = [];
    const stopAt = start + dur + 0.8;

    for (let n = 1; n <= 10; n++) {
      const fn = n * f0 * Math.sqrt(1 + B * n * n);
      if (fn > 9000) break;
      let amp = level / Math.pow(n, 1.75 - 0.75 * velocity);
      if (n === 7) amp *= 0.3; // hammer strike point ≈ 1/7 of the string
      const Tn = T60 / (1 + 0.7 * (n - 1));
      const unison = n <= 3 ? [-0.7, 0.7] : [0];
      for (const cents of unison) {
        const osc = ctx.createOscillator();
        osc.frequency.value = fn;
        osc.detune.value = cents;
        const g = ctx.createGain();
        const a = amp / unison.length;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(a, start + 0.003 + 0.002 * n * 0.2);
        g.gain.setTargetAtTime(a * 0.4, start + 0.006, 0.06 + 0.25 / n); // prompt sound
        g.gain.setTargetAtTime(0, start + 0.35, Tn / 6.9); // aftersound
        osc.connect(g).connect(lp);
        osc.start(start);
        osc.stop(stopAt);
        oscs.push(osc);
      }
    }

    // Hammer
    const hammer = ctx.createBufferSource();
    hammer.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(5000, f0 * 5);
    bp.Q.value = 0.9;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0, start);
    hg.gain.linearRampToValueAtTime(0.22 * velocity, start + 0.002);
    hg.gain.setTargetAtTime(0, start + 0.003, 0.012);
    hammer.connect(bp).connect(hg).connect(out);
    hammer.start(start);
    hammer.stop(start + 0.15);
    oscs.push(hammer);

    // Damper
    out.gain.setValueAtTime(1, start);
    out.gain.setTargetAtTime(0, start + dur, 0.09);

    const v: Voice = { out, oscs, end: stopAt };
    this.voices.add(v);
    oscs[0].onended = () => {
      this.voices.delete(v);
      out.disconnect();
    };
  }

  play(events: NoteEvent[], length: number, signal: AbortSignal): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return Promise.reject(new Error('Audio not unlocked'));
    if (signal.aborted) return Promise.reject(new Cancelled());
    // Processed sounds (spec AE) are rendered offline first (cached), then everything is scheduled together.
    const fx = events.filter((e) => e.fx);
    if (!fx.length) return this.playNow(events, length, signal, []);
    return Promise.all(fx.map((e) => renderFx(e.fx!))).then((bufs) => {
      if (signal.aborted) throw new Cancelled();
      return this.playNow(events, length, signal, bufs);
    });
  }

  /** A soft sustained hum (rhythm items): shows how long a note lasts under a drum hit, without sounding like a piano. */
  private hum(midi: number, velocity: number, start: number, dur: number) {
    const ctx = this.ctx!;
    const f = 440 * 2 ** ((midi - 69) / 12);
    const out = ctx.createGain();
    const peak = 0.22 * velocity;
    out.gain.setValueAtTime(0, start);
    out.gain.linearRampToValueAtTime(peak, start + 0.02);
    out.gain.setValueAtTime(peak, start + Math.max(0.03, dur - 0.04));
    out.gain.linearRampToValueAtTime(0, start + dur);
    out.connect(this.percBus);
    const oscs: AudioScheduledSourceNode[] = [];
    for (const [type, amp] of [['sine', 1], ['triangle', 0.25]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g).connect(out);
      o.start(start);
      o.stop(start + dur + 0.05);
      oscs.push(o);
    }
    const v: Voice = { out, oscs, end: start + dur + 0.05 };
    this.voices.add(v);
    oscs[0].onended = () => {
      this.voices.delete(v);
      out.disconnect();
    };
  }

  private playFx(buf: AudioBuffer, at: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain).connect(this.master);
    const h = { src, gain };
    this.fxPlaying.add(h);
    src.onended = () => {
      this.fxPlaying.delete(h);
      gain.disconnect();
    };
    src.start(Math.max(at, ctx.currentTime));
  }

  private playNow(events: NoteEvent[], length: number, signal: AbortSignal, fxBufs: AudioBuffer[]): Promise<void> {
    const ctx = this.ctx!;
    let fxI = 0;
    const t0 = ctx.currentTime + 0.06;
    const local = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        local.delete(t);
        this.timers.delete(t);
        fn();
      }, Math.max(0, ms));
      local.add(t);
      this.timers.add(t);
    };
    for (const e of events) {
      if (e.fx) {
        this.playFx(fxBufs[fxI++], t0 + e.start);
        continue;
      }
      if (e.perc) {
        this.perc(e.perc, t0 + e.start, e.velocity);
        continue;
      }
      if (e.inst === 'hum') {
        this.hum(e.midi, e.velocity, t0 + e.start, e.duration);
        continue;
      }
      if (!this.sample(e.midi, e.velocity, t0 + e.start, e.duration, e.inst === 'bass' ? 'bass' : undefined)) this.voice(e.midi, e.velocity, t0 + e.start, e.duration);
      const lead = (t0 - ctx.currentTime) * 1000;
      later(lead + e.start * 1000, () => this.noteOn(e.midi));
      later(lead + (e.start + e.duration) * 1000, () => this.noteOff(e.midi));
    }
    return new Promise((resolve, reject) => {
      const done = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, (t0 - ctx.currentTime + length) * 1000);
      const onAbort = () => {
        clearTimeout(done);
        local.forEach((t) => {
          clearTimeout(t);
          this.timers.delete(t);
        });
        this.stopAll();
        reject(new Cancelled());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /** Sustained drone (drone practice): soft sine + triangle per note, slow attack; stays until stopDrone(). */
  startDrone(midis: number[], level = 0.16) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopDrone();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(level, ctx.currentTime, 0.35);
    gain.connect(this.limiter);
    const oscs: AudioScheduledSourceNode[] = [];
    const db = this.droneBank;
    if (db) {
      // A recorded sustained sound, looped between zero crossings.
      for (const m of midis) {
        const nearest = db.notes.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
        const buf = db.buffers.get(nearest);
        if (!buf) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = Math.pow(2, (m - nearest) / 12);
        [src.loopStart, src.loopEnd] = PianoEngine.loopPoints(buf);
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = 1.6 / midis.length;
        src.connect(g).connect(gain);
        src.start();
        oscs.push(src);
      }
      this.drone = { gain, oscs };
      return;
    }
    for (const m of midis) {
      const f = 440 * 2 ** ((m - 69) / 12);
      for (const [type, amp, detune] of [['sine', 1, 0], ['triangle', 0.35, 3], ['sine', 0.5, -3]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = amp / midis.length;
        o.connect(g).connect(gain);
        o.start();
        oscs.push(o);
      }
    }
    this.drone = { gain, oscs };
  }

  stopDrone() {
    const ctx = this.ctx;
    const d = this.drone;
    if (!ctx || !d) return;
    this.drone = null;
    d.gain.gain.cancelScheduledValues(ctx.currentTime);
    d.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    for (const o of d.oscs) o.stop(ctx.currentTime + 0.6);
  }

  get droning() {
    return this.drone !== null;
  }

  stopAll() {
    const ctx = this.ctx;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.active.clear();
    this.emit();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const h of this.fxPlaying) {
      h.gain.gain.cancelScheduledValues(now);
      h.gain.gain.setValueAtTime(h.gain.gain.value, now);
      h.gain.gain.setTargetAtTime(0, now, 0.02);
      try {
        h.src.stop(now + 0.12);
      } catch {
        /* not started / already stopped */
      }
    }
    for (const v of this.voices) {
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setValueAtTime(v.out.gain.value, now);
      v.out.gain.setTargetAtTime(0, now, 0.03);
      for (const o of v.oscs) {
        try {
          o.stop(now + 0.2);
        } catch {
          /* already stopped */
        }
      }
    }
    this.cutScheduledPerc(now);
  }

  /**
   * Drum hits, clicks and cues are scheduled ahead and not tracked one by one, so Stop / Pause / Repeat used to leave
   * the rest of a pattern (or the count-in) playing over the next one. Swap their buses: everything already scheduled
   * goes to the old bus, which fades out and is unplugged; new sounds go to fresh ones.
   */
  private cutScheduledPerc(now: number) {
    const ctx = this.ctx;
    if (!ctx || !this.percBus || !this.cueBus) return;
    const old = [this.percBus, this.cueBus];
    for (const b of old) {
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(b.gain.value, now);
      b.gain.setTargetAtTime(0, now, 0.012);
    }
    setTimeout(() => old.forEach((b) => b.disconnect()), 120);
    this.percBus = ctx.createGain();
    this.percBus.gain.value = 0.85;
    this.percBus.connect(this.strips.drums!.input);
    this.cueBus = ctx.createGain();
    this.cueBus.gain.value = 0.18;
    this.cueBus.connect(this.strips.cues!.input);
  }

  cue(kind: CueKind) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.cuesOn && kind !== 'ready') return;
    const t = ctx.currentTime + 0.02;
    const bell = (midi: number, at: number, dur: number, amp: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = midiToHz(midi);
      const o2 = ctx.createOscillator(); // bell-like inharmonic overtone
      o2.frequency.value = midiToHz(midi) * 2.76;
      const g = ctx.createGain();
      const g2 = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(amp, at + 0.005);
      g.gain.setTargetAtTime(0, at + 0.01, dur / 4);
      g2.gain.setValueAtTime(0, at);
      g2.gain.linearRampToValueAtTime(amp * 0.25, at + 0.003);
      g2.gain.setTargetAtTime(0, at + 0.005, dur / 10);
      o.connect(g).connect(this.cueBus);
      o2.connect(g2).connect(this.cueBus);
      o.start(at);
      o2.start(at);
      o.stop(at + dur + 0.3);
      o2.stop(at + dur + 0.3);
    };
    switch (kind) {
      case 'ready':
        bell(88, t, 0.25, 0.35);
        break;
      case 'correct':
        bell(84, t, 0.5, 0.6);
        bell(88, t + 0.09, 0.5, 0.6);
        bell(91, t + 0.18, 0.9, 0.7);
        break;
      case 'wrong':
        bell(67, t, 0.35, 0.5, 'triangle');
        bell(63, t + 0.16, 0.6, 0.5, 'triangle');
        break;
      case 'complete':
        [72, 76, 79, 84, 88].forEach((m, i) => bell(m, t + i * 0.1, 0.9, 0.55));
        break;
    }
  }

  /** Choose the drum kit for metronome hits; its samples load in the background (stand-ins play meanwhile). */
  setDrumKit(kit: DrumKit): Promise<void> {
    this.kit = kit;
    return this.loadKit(kit);
  }

  private loadKit(kit: DrumKit): Promise<void> {
    if (kit === 'jazz') return this.loadStems('drums-jazz').then(() => undefined);
    const ctx = this.ctx;
    const ids = KIT_FILES[kit];
    if (!ctx || !ids) return Promise.resolve();
    let p = this.kitLoads.get(kit);
    if (!p) {
      const base = import.meta.env.BASE_URL ?? '/';
      p = Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`${base}samples/kits/${kit}/${id}.wav`);
            if (res.ok) this.kitBank.set(`${kit}:${id}`, await ctx.decodeAudioData(await res.arrayBuffer()));
          } catch {
            /* the classic kit plays this piece */
          }
        }),
      ).then(() => undefined);
      this.kitLoads.set(kit, p);
    }
    return p;
  }

  private async loadPerc() {
    const base = import.meta.env.BASE_URL ?? '/';
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      ['snare', 'snare_soft', 'kick', 'bell', 'hat', 'hat_open', 'ride', 'rim', 'clap', 'cowbell', 'shaker'].map(async (id) => {
        try {
          const res = await fetch(`${base}samples/perc/${id}.wav`);
          if (res.ok) this.percBank.set(id, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* the synthesised stand-in plays */
        }
      }),
    );
  }

  /** A recorded one-shot; false when it isn't loaded (yet). */
  private shot(id: string, at: number, level: number, rate = 1): boolean {
    const ctx = this.ctx!;
    const buf = this.percBank.get(id);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(g).connect(this.percBus);
    src.start(at);
    return true;
  }

  /** Drum kit: kick (recorded hit + a synthesised thump for punch), snare (recorded), closed hi-hat. */
  private drum(kind: 'kick' | 'snare' | 'snare-soft' | 'hat', at: number, velocity: number) {
    const ctx = this.ctx!;
    const env = (g: GainNode, peak: number, tau: number, hold = 0.004) => {
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(peak, at + 0.002);
      g.gain.setTargetAtTime(0, at + hold, tau);
    };
    if (kind === 'kick') {
      this.shot('kick', at, 0.7 * velocity);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(150, at);
      o.frequency.exponentialRampToValueAtTime(48, at + 0.12);
      const g = ctx.createGain();
      env(g, 1.1 * velocity, 0.09, 0.02);
      o.connect(g).connect(this.percBus);
      o.start(at);
      o.stop(at + 0.6);
      return;
    }
    if (kind === 'snare' || kind === 'snare-soft') {
      const soft = kind === 'snare-soft';
      if (this.shot(soft ? 'snare_soft' : 'snare', at, (soft ? 0.6 : 0.9) * velocity, 0.98 + Math.random() * 0.04)) return;
      // Stand-in: high-passed noise (the wires) over a short tuned body.
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1500;
      const ng = ctx.createGain();
      env(ng, (soft ? 0.45 : 0.8) * velocity, 0.05);
      src.connect(hp).connect(ng).connect(this.percBus);
      src.start(at);
      src.stop(at + 0.3);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, at);
      o.frequency.exponentialRampToValueAtTime(170, at + 0.08);
      const og = ctx.createGain();
      env(og, 0.6 * velocity, 0.04);
      o.connect(og).connect(this.percBus);
      o.start(at);
      o.stop(at + 0.3);
      return;
    }
    if (this.shot('hat', at, 0.55 * velocity, 0.97 + Math.random() * 0.06)) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    env(g, 0.35 * velocity, 0.018, 0.002);
    src.connect(hp).connect(g).connect(this.percBus);
    src.start(at);
    src.stop(at + 0.15);
  }

  // ---------------------------------------------------------------- metronome & groove kit (0.42)

  /** Audio-clock "now" (seconds), or null before the audio is unlocked. */
  audioNow(): number | null {
    return this.ctx ? this.ctx.currentTime : null;
  }
  /** performance.now() time at which a sound scheduled for audio time `t` is heard. */
  heardTime(t: number): number {
    return this.ctx ? this.heardAt(t) : performance.now();
  }

  /** One metronome / groove hit at audio time `at`: recorded VCSL one-shots (CC0), synthesised stand-ins until they load. */
  metroHit(kind: MetroKind, at: number, velocity = 0.8) {
    if (!this.ctx) return;
    if (this.kit === 'electro' && this.machine(kind, at, velocity)) return;
    if (this.kit === 'jazz') {
      const piece = ({ kick: 'kick', snare: 'snare', 'snare-soft': 'snare', hat: 'hat', 'hat-open': 'hat-open', ride: 'ride', rim: 'rim' } as Partial<Record<MetroKind, string>>)[kind];
      if (piece && this.kitHit(piece, at, kind === 'snare-soft' ? velocity * 0.55 : velocity)) return;
    }
    const piece = KIT_PIECE[kind];
    if (piece && this.kit !== 'classic') {
      const buf = this.kitBank.get(`${this.kit}:${piece}`);
      if (buf) {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 0.99 + Math.random() * 0.02;
        const g = this.ctx.createGain();
        g.gain.value = 0.95 * velocity;
        src.connect(g).connect(this.percBus);
        src.start(at);
        return;
      }
    }
    const rec: Partial<Record<MetroKind, [string, number]>> = {
      hat: ['hat', 0.55], 'hat-open': ['hat_open', 0.45], ride: ['ride', 0.4], rim: ['rim', 0.75],
      clap: ['clap', 0.7], cowbell: ['cowbell', 0.5], shaker: ['shaker', 0.5],
    };
    const r = rec[kind];
    if (r && this.shot(r[0], at, r[1] * velocity, 0.98 + Math.random() * 0.04)) return;
    this.synthHit(kind, at, velocity);
  }

  /** The synthesised voice of a hit (the stand-in while samples load, and the drum machine's sound). */
  private synthHit(kind: MetroKind, at: number, velocity: number): void {
    switch (kind) {
      case 'click':
      case 'accent':
      case 'wood':
      case 'kick':
      case 'snare':
      case 'snare-soft':
      case 'bell':
        return this.perc(kind, at, velocity);
      case 'hat':
        return this.metal(at, 0.32 * velocity, 0.022, 8000);
      case 'hat-open':
        return this.metal(at, 0.26 * velocity, 0.16, 7500);
      case 'ride': {
        this.metal(at, 0.16 * velocity, 0.35, 5200);
        return this.tone(at, 'sine', 3150, 0.07 * velocity, 0.25);
      }
      case 'rim':
        this.noiseHit(at, 'bandpass', 1900, 6, 0.9 * velocity, 0.012);
        return this.tone(at, 'triangle', 820, 0.3 * velocity, 0.018);
      case 'clap':
        for (const [d, a] of [[0, 0.7], [0.011, 0.6], [0.022, 0.8]] as const) this.noiseHit(at + d, 'bandpass', 1200, 1.4, a * velocity, d === 0.022 ? 0.09 : 0.008);
        return;
      case 'cowbell':
        this.tone(at, 'square', 545, 0.12 * velocity, 0.09, 2600);
        return this.tone(at, 'square', 815, 0.12 * velocity, 0.09, 2600);
      case 'shaker':
        return this.noiseHit(at, 'bandpass', 6500, 1.2, 0.35 * velocity, 0.03, 0.012);
    }
  }

  /** The drum machine kit: an 808-style kick and snare; hats, rim, clap… use the synthesised voices below. */
  private machine(kind: MetroKind, at: number, velocity: number): boolean {
    const ctx = this.ctx!;
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(130, at);
      o.frequency.exponentialRampToValueAtTime(46, at + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1.2 * velocity, at + 0.003);
      g.gain.setTargetAtTime(0, at + 0.02, 0.16);
      o.connect(g).connect(this.percBus);
      o.start(at);
      o.stop(at + 1.2);
      this.tone(at, 'square', 900, 0.08 * velocity, 0.004);
      return true;
    }
    if (kind === 'snare' || kind === 'snare-soft') {
      const v = (kind === 'snare' ? 1 : 0.55) * velocity;
      this.tone(at, 'triangle', 185, 0.5 * v, 0.05);
      this.tone(at, 'triangle', 330, 0.3 * v, 0.03);
      this.noiseHit(at, 'highpass', 1800, 0.7, 0.7 * v, 0.06);
      return true;
    }
    return ['hat', 'hat-open', 'ride', 'rim', 'clap', 'cowbell', 'shaker'].includes(kind) ? (this.synthHit(kind, at, velocity), true) : false;
  }

  /** 808-style metal: six detuned squares through a band → hi-hat / ride shimmer. */
  private metal(at: number, amp: number, tau: number, hpf: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.001);
    g.gain.setTargetAtTime(0, at + 0.002, tau);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 10000;
    bp.Q.value = 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpf;
    bp.connect(hp).connect(g).connect(this.percBus);
    for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f * 2;
      o.connect(bp);
      o.start(at);
      o.stop(at + tau * 8 + 0.05);
    }
    // a little noise for air
    this.noiseHit(at, 'highpass', 9000, 0.7, amp * 0.5, tau * 0.8);
  }

  private noiseHit(at: number, type: BiquadFilterType, freq: number, q: number, amp: number, tau: number, attack = 0.001) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + attack);
    g.gain.setTargetAtTime(0, at + attack + 0.001, tau);
    src.connect(f).connect(g).connect(this.percBus);
    src.start(at);
    src.stop(at + tau * 8 + 0.05);
  }

  private tone(at: number, type: OscillatorType, freq: number, amp: number, tau: number, lp?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.001);
    g.gain.setTargetAtTime(0, at + 0.002, tau);
    let n: AudioNode = o;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = lp;
      f.Q.value = 1.5;
      n = o.connect(f);
    }
    n.connect(g).connect(this.percBus);
    o.start(at);
    o.stop(at + tau * 8 + 0.05);
  }

  /** The option bell: a glockenspiel "ding" — not a piano note, so it never sounds like part of the music. */
  private optionBell(at: number) {
    if (this.shot('bell', at, 0.5)) return;
    const ctx = this.ctx!;
    for (const [ratio, amp, tau] of [[1, 0.35, 0.35], [2.76, 0.18, 0.12], [5.4, 0.1, 0.06]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = 2093 * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(amp, at + 0.002);
      g.gain.setTargetAtTime(0, at + 0.004, tau);
      o.connect(g).connect(this.percBus);
      o.start(at);
      o.stop(at + 1.5);
    }
  }

  /** Percussion: metronome click (accented on 1), woodblock, drum kit, the option bell. */
  private perc(kind: PercKind, at: number, velocity = 0.8): void {
    // the recorded jazz kit (0.55): every drum sound in backing tracks, grooves and rhythm items
    const piece = PERC_PIECE[kind];
    if (piece && this.bandDrums === 'jazz' && this.kitHit(piece, at, kind === 'snare-soft' ? velocity * 0.55 : velocity)) return;
    if (kind === 'kick' || kind === 'snare' || kind === 'snare-soft' || kind === 'hat') return this.drum(kind, at, velocity);
    // stand-ins for the kit's other pieces while it loads (or with the earlier kit)
    if (kind === 'ride' || kind === 'ride-bell') return this.synthHit('ride', at, velocity);
    if (kind === 'hat-foot') return this.synthHit('hat', at, velocity * 0.6);
    if (kind === 'hat-open' || kind === 'crash') return this.synthHit('hat-open', at, velocity);
    if (kind === 'rim') return this.synthHit('rim', at, velocity);
    if (kind === 'tom-hi' || kind === 'tom-lo') return this.tone(at, 'sine', kind === 'tom-hi' ? 196 : 131, 0.5 * velocity, 0.18);
    if (kind === 'brush-sweep' || kind === 'brush-tap') return this.brush(kind === 'brush-sweep', at, velocity);
    if (kind === 'bell') return this.optionBell(at);
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(this.cueBus);
    if (kind === 'wood') {
      // two resonant noise bands + a falling sine tick → hollow "tok"
      const bands: [number, number, number][] = [
        [880, 18, 1.4],
        [1320, 12, 0.6],
      ];
      for (const [f, q, a] of bands) {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f;
        bp.Q.value = q;
        const eg = ctx.createGain();
        eg.gain.setValueAtTime(0, at);
        eg.gain.linearRampToValueAtTime(a * 3, at + 0.002);
        eg.gain.setTargetAtTime(0, at + 0.003, 0.035);
        src.connect(bp).connect(eg).connect(g);
        src.start(at);
        src.stop(at + 0.25);
      }
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(1050, at);
      o.frequency.exponentialRampToValueAtTime(700, at + 0.05);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, at);
      og.gain.linearRampToValueAtTime(0.9, at + 0.002);
      og.gain.setTargetAtTime(0, at + 0.004, 0.025);
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 0.2);
      return;
    }
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = kind === 'accent' ? 1760 : 1320;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(kind === 'accent' ? 0.55 : 0.32, at + 0.001);
    g.gain.setTargetAtTime(0, at + 0.002, 0.012);
    o.connect(hp).connect(g);
    o.start(at);
    o.stop(at + 0.08);
  }

  /** performance.now() time at which audio scheduled for context time `t` is heard. */
  private heardAt(t: number): number {
    const ctx = this.ctx!;
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.performanceTime + (t - ts.contextTime) * 1000;
    }
    const lat = (ctx.baseLatency ?? 0) + ((ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0);
    return performance.now() + (t - ctx.currentTime + lat) * 1000;
  }

  playTimeline(
    tl: RhythmTimelineLike,
    signal: AbortSignal,
    onBeat?: (i: number, accent: boolean) => void,
    onResponseStart?: (perfMs: number) => void,
  ): Promise<number> {
    const ctx = this.ctx;
    if (!ctx) return Promise.reject(new Error('Audio not unlocked'));
    if (signal.aborted) return Promise.reject(new Cancelled());
    const t0 = ctx.currentTime + 0.12;
    tl.clicks.forEach((c) => this.perc(c.accent ? 'accent' : 'click', t0 + c.t, c.soft ? 0.4 : undefined));
    tl.wood.forEach((w, i) => {
      const d = tl.drums?.[i];
      this.perc(d === 'k' ? 'kick' : d === 's' ? 'snare' : 'wood', t0 + w, 0.85);
    });
    const responsePerf = this.heardAt(t0 + tl.responseAt);
    const nowPerf = performance.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    tl.clicks.forEach((c, i) => {
      timers.push(setTimeout(() => onBeat?.(i, c.accent), Math.max(0, this.heardAt(t0 + c.t) - nowPerf)));
    });
    timers.push(setTimeout(() => onResponseStart?.(responsePerf), Math.max(0, responsePerf - nowPerf - 60)));
    return new Promise((resolve, reject) => {
      const end = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve(responsePerf);
      }, Math.max(0, this.heardAt(t0 + tl.responseEnd) - nowPerf));
      const onAbort = () => {
        clearTimeout(end);
        timers.forEach(clearTimeout);
        this.stopAll();
        reject(new Cancelled());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  onNotes(cb: (active: number[]) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private noteOn(m: number) {
    this.active.set(m, (this.active.get(m) ?? 0) + 1);
    this.emit();
  }
  private noteOff(m: number) {
    const c = (this.active.get(m) ?? 1) - 1;
    if (c <= 0) this.active.delete(m);
    else this.active.set(m, c);
    this.emit();
  }
  private emit() {
    const list = [...this.active.keys()];
    this.listeners.forEach((l) => l(list));
  }
}

/** Metronome hit → the kit sample piece. */
const KIT_PIECE: Partial<Record<MetroKind, string>> = {
  kick: 'kick', snare: 'snare', 'snare-soft': 'snare_soft', hat: 'hat', 'hat-open': 'hat_open', ride: 'ride', rim: 'rim', clap: 'clap', cowbell: 'cowbell', shaker: 'shaker',
};

export type MetroKind = 'click' | 'accent' | 'wood' | 'kick' | 'snare' | 'snare-soft' | 'bell' | 'hat' | 'hat-open' | 'ride' | 'rim' | 'clap' | 'cowbell' | 'shaker';
