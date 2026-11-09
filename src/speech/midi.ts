// MIDI keyboard input (Web MIDI). A played note can stand in for a sung one (perfectly in tune),
// and a key press can answer degree / note-name questions. Optional: enabled in Settings.

import type { SungFrame } from '../engine/sing';
import type { PitchCapture, SingCaptureResult, SingOptions } from '../game/adapters';
import { DEFAULT_KIT, hatState, hatVoice, openness, voiceOf, type DrumVoice, type HatState, type KitProfile } from '../engine/drumKit';

type NoteListener = (midi: number, on: boolean, at: number, velocity: number) => void;
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
  private held = new Map<number, number>(); // midi → since (perf ms)
  private access: MidiAccessLike | null = null;
  devices: string[] = [];
  private stateListeners = new Set<() => void>();
  /**
   * Settings → MIDI: listen to one device only (null = all), shift by octaves (small keyboards), invert the pedal.
   * Drum mode (the drums course, DRUMS_CURRICULUM §3.5): raw notes (no octave shift, no pedal invert), CC4 kept as the
   * hi-hat openness, 0xA0 chokes forwarded, note-offs never end a hit, the kit's map names each hit; optional cross-talk
   * filter (a neighbour pad within 3 ms at < 25 % of the main hit's velocity is bleed).
   */
  opts: { only: string | null; octave: number; pedalInvert: boolean; drums: boolean; kit: KitProfile; crosstalk: boolean } = { only: null, octave: 0, pedalInvert: false, drums: false, kit: DEFAULT_KIT, crosstalk: false };
  /** Latest CC4 value (drum mode), null until the kit sends one. */
  cc4: number | null = null;
  private lastHit: { note: number; vel: number; at: number } | null = null;
  setOptions(o: Partial<MidiInput['opts']>) {
    if (o.drums === false || (o.drums && !this.opts.drums)) this.cc4 = null;
    this.opts = { ...this.opts, ...o };
    this.bind();
  }

  get supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  /** Ask for MIDI access (no SysEx). Resolves to the connected input names. */
  async enable(): Promise<string[]> {
    if (!this.supported) throw new Error('unsupported');
    if (!this.access) {
      this.access = (await (navigator as unknown as { requestMIDIAccess: (o: object) => Promise<MidiAccessLike> }).requestMIDIAccess({ sysex: false })) as MidiAccessLike;
      this.access.onstatechange = () => {
        // A keyboard plugged out mid-note never sends its note-offs: let every held key go.
        const at = performance.now();
        for (const n of [...this.held.keys()]) {
          this.held.delete(n);
          this.listeners.forEach((l) => l(n, false, at, 0));
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
    if (cmd === 0x90 && vel > 0) {
      this.held.set(note, at);
      this.listeners.forEach((l) => l(note, true, at, vel));
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      this.held.delete(note);
      this.listeners.forEach((l) => l(note, false, at, 0));
    } else if (cmd === 0xb0) {
      // Control change (spec AI: the sustain pedal CC64 is measured in the pedalling drills).
      this.ccListeners.forEach((l) => l(note, vel, at));
    }
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
      const voice = v0 ? hatVoice(v0, open) : null;
      const hit: DrumHitEvent = { note, voice, vel: v, at, open, hat: voice === 'hihat' || voice === 'hhOpen' ? (open === null ? (voice === 'hhOpen' ? 'open' : 'closed') : hatState(open)) : null };
      this.held.set(note, at);
      this.listeners.forEach((l) => l(note, true, at, v));
      this.hitListeners.forEach((l) => l(hit));
    } else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) {
      // Kits send short or meaningless note-offs: they only clear the held set, never end a hit.
      if (this.held.delete(note)) this.listeners.forEach((l) => l(note, false, at, 0));
    } else if (cmd === 0xb0) {
      if (note === 4) this.cc4 = v;
      this.ccListeners.forEach((l) => l(note, v, at));
    } else if (cmd === 0xa0) {
      this.chokeListeners.forEach((l) => l(note, v, at));
    }
  }

  private hitListeners = new Set<HitListener>();
  /** Drum hits (drum mode only). */
  onHit(cb: HitListener) {
    this.hitListeners.add(cb);
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

  /** Highest-priority sounding note: the most recently pressed one still held. */
  current(): number | null {
    let best: number | null = null;
    let at = -Infinity;
    this.held.forEach((t, n) => {
      if (t > at) {
        at = t;
        best = n;
      }
    });
    return best;
  }

  onNote(cb: NoteListener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  private ccListeners = new Set<CcListener>();
  onCC(cb: CcListener) {
    this.ccListeners.add(cb);
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

export const midi = new MidiInput();

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * PitchCapture from a MIDI keyboard: frames of the currently held key, same stop rules as the mic
 * (single note: ~0.6 s held then released, or 1.6 s; sequences: stop after `endSilenceMs` of no keys).
 */
export class MidiPitchCapture implements PitchCapture {
  constructor(
    private input: MidiInput = midi,
    private now: () => number = () => performance.now(),
  ) {}

  sing({ signal, maxMs = 4500, silenceMs = 4000, endSilenceMs, hopMs, onCapturing, onFrame }: SingOptions): Promise<SingCaptureResult> {
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
