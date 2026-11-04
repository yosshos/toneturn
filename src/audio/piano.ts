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
import type { NoteEvent } from '../engine/lesson';
import { Cancelled, type AudioEngine, type CueKind } from '../game/adapters';

interface Voice {
  out: GainNode;
  oscs: AudioScheduledSourceNode[];
  end: number;
}

export class PianoEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  private pianoBus!: GainNode;
  private cueBus!: GainNode;
  private noise!: AudioBuffer;
  private voices = new Set<Voice>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private active = new Map<number, number>(); // midi → count
  private listeners = new Set<(active: number[]) => void>();
  /** Master volume (0..1). */
  volume = 0.9;

  get context() {
    return this.ctx;
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.build(this.ctx);
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

    this.pianoBus = ctx.createGain();
    this.pianoBus.gain.value = 0.2;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.roomImpulse(ctx, 1.9);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.pianoBus.connect(limiter);
    this.pianoBus.connect(reverb).connect(wet).connect(limiter);

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
      this.voice(e.midi, e.velocity, t0 + e.start, e.duration);
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

  stopAll() {
    const ctx = this.ctx;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.active.clear();
    this.emit();
    if (!ctx) return;
    const now = ctx.currentTime;
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
