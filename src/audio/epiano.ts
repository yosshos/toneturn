// The tine electric piano (0.55): modelled, no samples (the recorded tine pianos that are free to use forbid
// commercial use). What makes the sound, and how it follows the touch:
//   • the tine's tone: a sine carrier with a frequency-modulating partner at the same pitch — soft playing is nearly
//     pure, a harder strike adds harmonics (the "bark") that fade quickly as the tine settles;
//   • the bell: a high, inharmonic partial (≈ 14× the pitch) struck with the hammer, gone in a fraction of a second;
//   • the pickup's asymmetry: a gentle even-harmonic colour, more in the low register;
//   • decay: a fast early drop then a long sustain, shorter up the keyboard; the damper's soft thump at release;
//   • optional stereo tremolo (the classic suitcase "auto-pan").

/** Modulation index for a strike (velocity 0–1): soft ≈ pure, hard = bark. */
export const barkIndex = (v: number) => 0.25 + 3.6 * Math.pow(Math.max(0, Math.min(1, v)), 1.8);

/** Sustain length (s, to −60 dB) by register: bass tines ring long, top ones short. */
export const tineT60 = (midi: number) => Math.max(1.4, 8.5 * Math.pow(2, -(midi - 40) / 26));

export function epKey(ctx: BaseAudioContext, midi: number, velocity: number, start: number, end: number, out: AudioNode, tremolo?: AudioNode) {
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const v = Math.max(0.02, Math.min(1, velocity));
  const g = ctx.createGain();
  const level = 0.3 * (0.12 + 0.88 * Math.pow(v, 1.4)); // next to the grand at the same velocity
  const t60 = tineT60(midi);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(level, start + 0.003);
  g.gain.setTargetAtTime(level * 0.55, start + 0.004, 0.25); // the early drop
  g.gain.setTargetAtTime(0, start + 0.3, t60 / 6.9);
  const rel = Math.max(start + 0.01, end);
  g.gain.cancelScheduledValues(rel);
  g.gain.setTargetAtTime(0, rel, 0.06);
  g.connect(tremolo ?? out);
  const stop = Math.min(start + t60 + 0.2, rel + 0.5);
  const srcs: AudioScheduledSourceNode[] = [];

  // carrier + modulator (FM, ratio 1): the bark fades as the tine settles
  const car = ctx.createOscillator();
  car.frequency.value = f0;
  const mod = ctx.createOscillator();
  mod.frequency.value = f0;
  const idx = ctx.createGain();
  const I = barkIndex(v) * f0;
  idx.gain.setValueAtTime(I, start);
  idx.gain.setTargetAtTime(I * 0.18, start + 0.002, 0.09 + 0.3 * (1 - v));
  mod.connect(idx).connect(car.frequency);
  // pickup asymmetry: a little 2nd harmonic, more in the bass
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  const k = 0.18 + 0.25 * Math.max(0, (60 - midi) / 30);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = x + k * x * x - k / 3;
  }
  shaper.curve = curve;
  const cg = ctx.createGain();
  cg.gain.value = 0.6;
  car.connect(shaper).connect(cg).connect(g);
  car.start(start);
  mod.start(start);
  car.stop(stop);
  mod.stop(stop);
  srcs.push(car, mod);

  // the bell: an inharmonic partial at ~14× — the hammer on the tine
  const bell = ctx.createOscillator();
  bell.frequency.value = Math.min(16000, f0 * 14.1);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0, start);
  bg.gain.linearRampToValueAtTime(0.06 + 0.16 * v, start + 0.001);
  bg.gain.setTargetAtTime(0, start + 0.002, 0.03 + 0.02 * v);
  bell.connect(bg).connect(g);
  bell.start(start);
  bell.stop(start + 0.4);
  srcs.push(bell);
  return { out: g, srcs, stop };
}

/** The suitcase tremolo: a stereo auto-pan at `rate` Hz and `depth` (0–1). */
export function autoPan(ctx: BaseAudioContext, out: AudioNode, rate = 4.2, depth = 0.6) {
  const pan = ctx.createStereoPanner();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const d = ctx.createGain();
  d.gain.value = depth;
  lfo.connect(d).connect(pan.pan);
  lfo.start();
  pan.connect(out);
  return { input: pan as AudioNode, setDepth: (x: number) => d.gain.setTargetAtTime(x, ctx.currentTime, 0.05) };
}
