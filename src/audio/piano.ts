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
import { KIT_FILES, type DrumKit } from '../engine/grooves';
import type { NoteEvent, PercKind } from '../engine/lesson';
import { Cancelled, type AudioEngine, type CueKind, type RhythmAudio, type RhythmTimelineLike } from '../game/adapters';
import { renderFx } from './fx';

interface Voice {
  out: GainNode;
  oscs: AudioScheduledSourceNode[];
  end: number;
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
    const load = (async () => {
      try {
        const bank = await this.loadSet(id, onProgress);
        if (this.sound !== id) return false; // changed meanwhile
        this.bank = bank;
        return true;
      } catch {
        if (this.sound === id) this.bank = null;
        return false;
      }
    })();
    return load;
  }

  /** Load a sample set (shared by instrument sounds and the drone). */
  private async loadSet(id: string, onProgress?: (done: number, total: number) => void) {
    const base = import.meta.env.BASE_URL ?? '/';
    const manifest = (await (await fetch(`${base}samples/manifest.json`)).json()) as { sets: Record<string, { ext: string; notes: number[] }> };
    const set = manifest.sets[id];
    if (!set) throw new Error('no set');
    const decoder = new OfflineAudioContext(1, 1, 22050);
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

  /** Play one note from the sample bank; false when there is no bank (the synth plays instead). */
  private sample(midi: number, velocity: number, start: number, dur: number): boolean {
    const ctx = this.ctx;
    const bank = this.bank;
    if (!ctx || !bank) return false;
    const nearest = bank.notes.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
    const buf = bank.buffers.get(nearest);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - nearest) / 12);
    const out = ctx.createGain();
    // Soft notes (expression exercises) really get soft; everything at 0.45 and up sounds as before.
    const peak = velocity >= 0.45 ? 0.55 + 0.45 * velocity : 0.08 + (0.7525 - 0.08) * (velocity / 0.45);
    out.gain.setValueAtTime(0, start);
    out.gain.linearRampToValueAtTime(peak, start + 0.006);
    out.gain.setTargetAtTime(0, start + dur, 0.11);
    src.connect(out).connect(this.sampleBus);
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
    }
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
    const reverb = ctx.createConvolver();
    reverb.buffer = this.roomImpulse(ctx, 1.9);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.pianoBus.connect(limiter);
    this.pianoBus.connect(reverb).connect(wet).connect(limiter);
    // Recorded instruments: their own level, the same room.
    this.sampleBus = ctx.createGain();
    this.sampleBus.gain.value = 0.75;
    this.sampleBus.connect(limiter);
    this.sampleBus.connect(reverb);

    this.percBus = ctx.createGain();
    this.percBus.gain.value = 0.85;
    this.percBus.connect(limiter);
    const percRoom = ctx.createGain();
    percRoom.gain.value = 0.3;
    this.percBus.connect(percRoom).connect(reverb);

    this.cueBus = ctx.createGain();
    this.cueBus.gain.value = 0.18;
    this.cueBus.connect(limiter);
    this.cueBus.connect(reverb);

    const len = Math.floor(ctx.sampleRate * 0.5);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
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
    lp.connect(out).connect(pan).connect(this.pianoBus);

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
      if (!this.sample(e.midi, e.velocity, t0 + e.start, e.duration)) this.voice(e.midi, e.velocity, t0 + e.start, e.duration);
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
  private synthHit(kind: MetroKind, at: number, velocity: number) {
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
  private perc(kind: PercKind, at: number, velocity = 0.8) {
    if (kind === 'kick' || kind === 'snare' || kind === 'snare-soft' || kind === 'hat') return this.drum(kind, at, velocity);
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
