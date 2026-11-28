// MIDI keyboard input (Web MIDI). A played note can stand in for a sung one (perfectly in tune),
// and a key press can answer degree / note-name questions. Optional: enabled in Settings.

import type { SungFrame } from '../engine/sing';
import type { PitchCapture, SingCaptureResult, SingOptions } from '../game/adapters';
import { notifyInput } from '../engine/inputCheck';
import type { GuitarChannelMode } from '../engine/midiGuitar';
import { DEFAULT_KIT, hatState, hatVoice, openness, voiceOf, VOICE_NOTE, type DrumVoice, type HatState, type KitProfile } from '../engine/drumKit';

/**
 * The hi-hat foot from CC4 alone (DRUMS_CURRICULUM §3.3, DRUMS_AUDIT P1): kits that send no pedal note still close the
 * pedal fast for a "chick" — openness from ≥ 0.35 to closed (< 0.2) within this many ms is a pedal hit.
 */
export const CHICK_MS = 150;

/** `ch` = the MIDI channel 0–15 (a per-string MIDI guitar sends each string on its own channel, GUITAR-AUDIT B7). */
type NoteListener = (midi: number, on: boolean, at: number, velocity: number, ch: number) => void;
/** Pitch bend (B7): channel 0–15, the bend in cents (the channel's bend range applied), timestamp. */
type BendListener = (ch: number, cents: number, at: number) => void;
/** Control change (CC64 sustain, CC67 soft…): controller number, value 0–127, timestamp. */
type CcListener = (cc: number, value: number, at: number) => void;

/** One drum hit (drum mode): the raw note, the voice it plays on this kit, velocity, time, hi-hat openness at hit time. */
export interface DrumHitEvent {
  note: number;
  voice: DrumVoice | null;
  vel: number;
  at: number;
  /** CC4 openness 0..1 when the kit sends CC4 (null = never seen). */
  open: number | null;
  hat: HatState | null;
}
type HitListener = (h: DrumHitEvent) => void;
/** Cymbal choke (polyphonic key pressure 0xA0 on the cymbal's note): note, pressure, time. */
type ChokeListener = (note: number, pressure: number, at: number) => void;

/** Minimal shape of the Web MIDI objects we use (not in every TS lib). */
interface MidiInputLike {
  name?: string | null;
  onmidimessage: ((e: { data: Uint8Array; timeStamp: number }) => void) | null;
}
interface MidiAccessLike {
  inputs: Map<string, MidiInputLike>;
  onstatechange: (() => void) | null;
}

export class MidiInput {
  private listeners = new Set<NoteListener>();
  /** Held notes by (channel, note) — `ch * 128 + note` → note and since (perf ms): one pitch on two strings is two notes. */
  private held = new Map<number, { note: number; at: number }>();
  private access: MidiAccessLike | null = null;
  devices: string[] = [];
  private stateListeners = new Set<() => void>();
  /**
   * Settings → MIDI: listen to one device only (null = all), shift by octaves (small keyboards), invert the pedal.
   * Drum mode (the drums course, DRUMS_CURRICULUM §3.5): raw notes (no octave shift, no pedal invert), CC4 kept as the
   * hi-hat openness, 0xA0 chokes forwarded, note-offs never end a hit, the kit's map names each hit; optional cross-talk
   * filter (a neighbour pad within 3 ms at < 25 % of the main hit's velocity is bleed).
   */
  opts: { only: string | null; octave: number; pedalInvert: boolean; drums: boolean; kit: KitProfile; crosstalk: boolean; bendRange: number; guitarChannels: GuitarChannelMode } = { only: null, octave: 0, pedalInvert: false, drums: false, kit: DEFAULT_KIT, crosstalk: false, bendRange: 2, guitarChannels: 'auto' };
  /**
   * B7: per channel, the pitch-bend range in semitones the device announced (RPN 0 by CC101 / CC100 = 0, then CC6 / CC38),
   * else `opts.bendRange`; and the RPN each channel has selected.
   */
  private bendRanges = new Map<number, number>();
  private rpn = new Map<number, { msb: number; lsb: number }>();
  /** The latest bend per channel (cents). */
  private bends = new Map<number, number>();
  /** The bend range of a channel (semitones): the device's own RPN 0 when it sent one, else the setting. */
  bendRangeOf(ch: number): number {
    return this.bendRanges.get(ch) ?? this.opts.bendRange;
  }
  /** The current bend of a channel (cents, 0 = none). */
  bendOf(ch: number): number {
    return this.bends.get(ch) ?? 0;
  }
  /** Latest CC4 value (drum mode), null until the kit sends one. */
  cc4: number | null = null;
  private lastHit: { note: number; vel: number; at: number } | null = null;
  /** The pedal from CC4: when the hat was last open, whether the kit sends a pedal note itself, the last emitted chick. */
  private pedal = { openAt: null as number | null, noteSeen: false, lastNote: -Infinity, lastChick: -Infinity };
  setOptions(o: Partial<MidiInput['opts']>) {
    if (o.drums === false || (o.drums && !this.opts.drums)) {
      this.cc4 = null;
      this.pedal = { openAt: null, noteSeen: false, lastNote: -Infinity, lastChick: -Infinity };
    }
    this.opts = { ...this.opts, ...o };
    this.bind();
  }

  get supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  /** MIDI access was granted and is live (SPEC-INPUT-SOURCE R1: enabled at start-up only when already granted). */
  get enabled() {
    return !!this.access;
  }

  /** Ask for MIDI access (no SysEx). Resolves to the connected input names. */
  async enable(): Promise<string[]> {
    if (!this.supported) throw new Error('unsupported');
    if (!this.access) {
      this.access = (await (navigator as unknown as { requestMIDIAccess: (o: object) => Promise<MidiAccessLike> }).requestMIDIAccess({ sysex: false })) as MidiAccessLike;
      this.access.onstatechange = () => {
        // A keyboard plugged out mid-note never sends its note-offs: let every held key go.
        const at = performance.now();
        for (const [k, h] of [...this.held.entries()]) {
          this.held.delete(k);
          this.listeners.forEach((l) => l(h.note, false, at, 0, k >> 7));
        }
        this.bind();
      };
    }
    this.bind();
    return this.devices;
  }

  private bind() {
    if (!this.access) return;
    this.devices = [];
    this.access.inputs.forEach((input) => {
      const name = input.name ?? 'MIDI';
      this.devices.push(name);
      const on = !this.opts.only || this.opts.only === name || !this.devicesHave(this.opts.only);
      input.onmidimessage = on ? (e) => this.message(e.data, e.timeStamp) : null;
    });
    this.stateListeners.forEach((l) => l());
  }

  private devicesHave(name: string) {
    let has = false;
    this.access?.inputs.forEach((i) => {
      if ((i.name ?? 'MIDI') === name) has = true;
    });
    return has;
  }

  /** Raw MIDI bytes → note on/off (exposed for tests). */
  message(data: Uint8Array | number[], at: number) {
    if (this.opts.drums) return this.drumMessage(data, at);
    const [status, raw, vel0] = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
    const isCC = (status & 0xf0) === 0xb0;
    const note = isCC ? raw : Math.max(0, Math.min(127, raw + 12 * this.opts.octave));
    const vel = isCC && raw === 64 && this.opts.pedalInvert ? 127 - vel0 : vel0;
    const cmd = status & 0xf0;
    const ch = status & 0x0f;
    if (cmd === 0x90 && vel > 0) {
      notifyInput('midi', at);
      this.held.set(ch * 128 + note, { note, at });
      this.listeners.forEach((l) => l(note, true, at, vel, ch));
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      // The note-off on its own channel; a keyboard that switches channel in between still lets the key go.
      if (!this.held.delete(ch * 128 + note)) for (const [k, h] of this.held) if (h.note === note) this.held.delete(k);
      this.listeners.forEach((l) => l(note, false, at, 0, ch));
    } else if (cmd === 0xb0) {
      this.rpnMessage(ch, raw, vel0);
      // Control change (spec AI: the sustain pedal CC64 is measured in the pedalling drills).
      this.ccListeners.forEach((l) => l(note, vel, at));
    } else if (cmd === 0xe0) {
      // B7: pitch bend, 14 bits centred on 8192, scaled by the channel's range.
      const v = ((vel0 & 0x7f) << 7) | (raw & 0x7f);
      const cents = Math.round(((v - 8192) / 8192) * this.bendRangeOf(ch) * 100);
      this.bends.set(ch, cents);
      this.bendListeners.forEach((l) => l(ch, cents, at));
    }
  }

  /** RPN 0 (pitch-bend sensitivity): CC101 = 0, CC100 = 0, then CC6 = semitones (CC38 = cents). CC101 / CC100 = 127 deselects. */
  private rpnMessage(ch: number, cc: number, v: number) {
    const r = this.rpn.get(ch) ?? { msb: 127, lsb: 127 };
    if (cc === 101) this.rpn.set(ch, { ...r, msb: v });
    else if (cc === 100) this.rpn.set(ch, { ...r, lsb: v });
    else if ((cc === 6 || cc === 38) && r.msb === 0 && r.lsb === 0) {
      const prev = this.bendRanges.get(ch) ?? this.opts.bendRange;
      const semis = cc === 6 ? v + (prev % 1) : Math.floor(prev) + v / 100;
      if (semis > 0 && semis <= 48) this.bendRanges.set(ch, semis);
    }
  }

  private bendListeners = new Set<BendListener>();
  /** Pitch bend per channel (B7: a MIDI guitar's bends and vibrato). */
  onBend(cb: BendListener) {
    this.bendListeners.add(cb);
    return () => {
      this.bendListeners.delete(cb);
    };
  }

  /** Drum mode: raw notes, hits with voice + openness, CC4 state, chokes. */
  private drumMessage(data: Uint8Array | number[], at: number) {
    const [status, note, v] = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
    const cmd = status & 0xf0;
    if (cmd === 0x90 && v > 0) {
      const lh = this.lastHit;
      if (this.opts.crosstalk && lh && lh.note !== note && Math.abs(at - lh.at) <= 3 && v < 0.25 * lh.vel) return;
      if (!lh || v >= (lh.vel ?? 0) || Math.abs(at - lh.at) > 3) this.lastHit = { note, vel: v, at };
      const open = this.cc4 === null ? null : openness(this.cc4, this.opts.kit);
      const v0 = voiceOf(note, this.opts.kit);
      if (v0 === 'hhPedal') {
        // The kit sends its own pedal note: stop making chicks from CC4; drop the note that doubles one just made.
        this.pedal.noteSeen = true;
        this.pedal.lastNote = at;
        if (at - this.pedal.lastChick <= 40) return;
      }
      const voice = v0 ? hatVoice(v0, open) : null;
      notifyInput('midi', at);
      const hit: DrumHitEvent = { note, voice, vel: v, at, open, hat: voice === 'hihat' || voice === 'hhOpen' ? (open === null ? (voice === 'hhOpen' ? 'open' : 'closed') : hatState(open)) : null };
      this.held.set((status & 0x0f) * 128 + note, { note, at });
      this.listeners.forEach((l) => l(note, true, at, v, status & 0x0f));
      this.hitListeners.forEach((l) => l(hit));
    } else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) {
      // Kits send short or meaningless note-offs: they only clear the held set, never end a hit.
      if (this.held.delete((status & 0x0f) * 128 + note)) this.listeners.forEach((l) => l(note, false, at, 0, status & 0x0f));
    } else if (cmd === 0xb0) {
      if (note === 4) {
        this.pedalFromCc(v, at);
        this.cc4 = v;
      }
      this.ccListeners.forEach((l) => l(note, v, at));
    } else if (cmd === 0xa0) {
      this.chokeListeners.forEach((l) => l(note, v, at));
    }
  }

  /** A fast CC4 close is the hi-hat foot (note 44) on kits that send no pedal note. */
  private pedalFromCc(v: number, at: number) {
    const o = openness(v, this.opts.kit);
    const was = this.cc4 === null ? null : openness(this.cc4, this.opts.kit);
    if (o >= 0.35) {
      this.pedal.openAt = at;
      return;
    }
    const p = this.pedal;
    if (o >= 0.2 || was === null || was < 0.2 || p.openAt === null || at - p.openAt > CHICK_MS) return;
    const dt = at - p.openAt;
    p.openAt = null;
    if (p.noteSeen || at - p.lastNote <= 40) return;
    p.lastChick = at;
    // Faster closing = a firmer chick (velocity 40–110).
    const vel = Math.round(110 - 70 * Math.max(0, Math.min(1, dt / CHICK_MS)));
    const note = VOICE_NOTE.hhPedal;
    const hit: DrumHitEvent = { note, voice: 'hhPedal', vel, at, open: o, hat: null };
    this.listeners.forEach((l) => l(note, true, at, vel, 9));
    this.hitListeners.forEach((l) => l(hit));
  }

  private hitListeners = new Set<HitListener>();
  /** Drum hits (drum mode only). `first`: called before the other listeners (the app's own sound). */
  onHit(cb: HitListener, o?: { first?: boolean }) {
    this.hitListeners = first(this.hitListeners, cb, o);
    return () => {
      this.hitListeners.delete(cb);
    };
  }
  private chokeListeners = new Set<ChokeListener>();
  /** Cymbal chokes (drum mode; Roland sends 0xA0 — other kits may send nothing, so never required). */
  onChoke(cb: ChokeListener) {
    this.chokeListeners.add(cb);
    return () => {
      this.chokeListeners.delete(cb);
    };
  }

  /** Every key held now (My song: a MIDI keyboard's chords measured like a strum). */
  heldNotes(): number[] {
    return [...this.held.values()].map((h) => h.note);
  }

  /** Highest-priority sounding note: the most recently pressed one still held. */
  current(): number | null {
    let best: number | null = null;
    let at = -Infinity;
    this.held.forEach((h) => {
      if (h.at > at) {
        at = h.at;
        best = h.note;
      }
    });
    return best;
  }

  /**
   * Note on/off. `first` (0.69, the live sound): called before every other listener, so the key sounds before any
   * screen reacts to it.
   */
  onNote(cb: NoteListener, o?: { first?: boolean }) {
    this.listeners = first(this.listeners, cb, o);
    return () => {
      this.listeners.delete(cb);
    };
  }
  private ccListeners = new Set<CcListener>();
  onCC(cb: CcListener, o?: { first?: boolean }) {
    this.ccListeners = first(this.ccListeners, cb, o);
    return () => {
      this.ccListeners.delete(cb);
    };
  }
  onState(cb: () => void) {
    this.stateListeners.add(cb);
    return () => {
      this.stateListeners.delete(cb);
    };
  }
}

/** A listener set with `cb` added — at the front when `first`. */
function first<T>(set: Set<T>, cb: T, o?: { first?: boolean }): Set<T> {
  if (!o?.first) return set.add(cb);
  return new Set([cb, ...set]);
}

export const midi = new MidiInput();

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * PitchCapture from a MIDI keyboard: frames of the currently held key, same stop rules as the mic
 * (single note: ~0.6 s held then released, or 1.6 s; sequences: stop after `endSilenceMs` of no keys).
 */
/** 12-bin chroma of held keys (1 on each held pitch class). */
const chromaOfHeld = (held: number[]): number[] => {
  const c = new Array<number>(12).fill(0);
  for (const m of held) c[((m % 12) + 12) % 12] = 1;
  return c;
};

export class MidiPitchCapture implements PitchCapture {
  constructor(
    private input: MidiInput = midi,
    private now: () => number = () => performance.now(),
  ) {}

  sing({ signal, maxMs = 4500, silenceMs = 4000, endSilenceMs, hopMs, onCapturing, onFrame, chroma }: SingOptions): Promise<SingCaptureResult> {
    if (signal.aborted) return Promise.resolve({ kind: 'aborted' });
    onCapturing?.();
    const t0 = this.now();
    const frames: SungFrame[] = [];
    return new Promise((resolve) => {
      let firstOn = -1;
      let lastOn = -1;
      const finish = (r: SingCaptureResult) => {
        clearInterval(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(r);
      };
      const onAbort = () => finish({ kind: 'aborted' });
      signal.addEventListener('abort', onAbort, { once: true });
      const timer = setInterval(() => {
        const t = (this.now() - t0) / 1000;
        const n = this.input.current();
        const f: SungFrame = n === null ? { t, hz: null, confidence: 0, rms: 0.001 } : { t, hz: midiHz(n), confidence: 0.99, rms: 0.1 };
        // asked for chroma (a chord check): the held keys' pitch classes
        if (chroma && n !== null) f.chroma = chromaOfHeld(this.input.heldNotes?.() ?? [n]);
        frames.push(f);
        onFrame?.(f);
        if (n !== null) {
          if (firstOn < 0) firstOn = t;
          lastOn = t;
        }
        if (endSilenceMs !== undefined) {
          if (firstOn >= 0 && (t - lastOn) * 1000 > endSilenceMs) return finish({ kind: 'frames', frames });
        } else {
          if (firstOn >= 0 && n === null && lastOn - firstOn > 0.5) return finish({ kind: 'frames', frames });
          if (firstOn >= 0 && t - firstOn > 1.6) return finish({ kind: 'frames', frames });
        }
        if (firstOn < 0 && t * 1000 > silenceMs) return finish({ kind: 'silence' });
        if (t * 1000 > maxMs) return finish(firstOn >= 0 ? { kind: 'frames', frames } : { kind: 'silence' });
      }, hopMs ?? 20);
    });
  }
}
