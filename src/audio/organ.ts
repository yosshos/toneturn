// The tonewheel organ (0.55, owner 2026-11-09: "a quality organ"): modelled, no samples. What makes the sound:
//   • nine drawbars — sine tones at 16′ 5⅓′ 8′ 4′ 2⅔′ 2′ 1⅗′ 1⅓′ 1′ (sub, fifth, unison, octave, twelfth, fifteenth,
//     seventeenth, nineteenth, twenty-second), each 0–8 in 3 dB steps, as on the real instrument;
//   • the tonewheels' gentle imperfection — a little leakage of neighbouring wheels and a touch of harmonic content;
//   • key click — the contacts closing, a short bright burst at every key down;
//   • percussion — a decaying 2nd or 3rd harmonic on the attack (the jazz "touch");
//   • the rotating speaker — horn and drum spinning at different speeds: Doppler pitch wobble, amplitude and stereo
//     movement; slow (chorale) or fast (tremolo), ramping between them as the real motors do.
// Registrations follow the classic settings.

export type Registration = { id: string; bars: number[]; perc?: 'second' | 'third'; name: { en: string; he: string } };

/** Drawbar footages as harmonic ratios to 8′. */
export const BAR_RATIO = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];

export const REGISTRATIONS: Registration[] = [
  { id: 'jazz', bars: [8, 8, 8, 0, 0, 0, 0, 0, 0], perc: 'third', name: { en: 'Jazz (888, 3rd percussion)', he: 'ג׳אז (888, פרקשן שלישית)' } },
  { id: 'gospel', bars: [8, 8, 8, 8, 0, 0, 0, 0, 8], name: { en: 'Gospel full', he: 'גוספל מלא' } },
  { id: 'ballad', bars: [8, 3, 8, 0, 0, 0, 0, 0, 0], name: { en: 'Soft ballad', he: 'בלדה רכה' } },
  { id: 'rock', bars: [8, 8, 8, 8, 8, 8, 8, 8, 8], name: { en: 'Full organ', he: 'אורגן מלא' } },
  { id: 'flute', bars: [0, 0, 8, 0, 0, 0, 0, 0, 0], name: { en: 'Flute (8′)', he: 'חליל (8′)' } },
];

/** Level of a drawbar position: 0 = off, each step 3 dB (8 = full). */
export const barGain = (n: number) => (n <= 0 ? 0 : Math.pow(10, (-3 * (8 - n)) / 20));

/** The organ's tone for one key: the partial frequencies (Hz) and levels from a registration. */
export function partials(f0: number, bars: number[]): { f: number; a: number }[] {
  const out: { f: number; a: number }[] = [];
  bars.forEach((n, i) => {
    const g = barGain(n);
    if (!g) return;
    let f = f0 * BAR_RATIO[i];
    // the highest wheels fold back an octave above the top of the generator (foldback), as on the real organ
    while (f > 6000) f /= 2;
    out.push({ f, a: g });
  });
  const sum = out.reduce((s, p) => s + p.a, 0) || 1;
  return out.map((p) => ({ f: p.f, a: p.a / Math.max(1.8, sum) }));
}

/** The rotating speaker: horn and drum rotor speeds (Hz) for slow / fast. */
export const LESLIE = { slow: { horn: 0.83, drum: 0.67 }, fast: { horn: 6.7, drum: 5.9 } };

/**
 * A rotating speaker on a Web Audio graph: input → [horn: highs, Doppler + amplitude + pan] + [drum: lows, amplitude
 * + pan] → output. `setSpeed` ramps like the motors (the horn speeds up in about a second, the drum slower).
 */
export class Leslie {
  readonly input: GainNode;
  readonly output: GainNode;
  private lfo: { horn: OscillatorNode; drum: OscillatorNode };
  constructor(private ctx: BaseAudioContext) {
    const c = ctx;
    this.input = c.createGain();
    this.output = c.createGain();
    const split = (type: BiquadFilterType, f: number) => {
      const b = c.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      return b;
    };
    const hornF = split('highpass', 800);
    const drumF = split('lowpass', 800);
    this.input.connect(hornF);
    this.input.connect(drumF);
    const horn = c.createOscillator();
    const drum = c.createOscillator();
    horn.frequency.value = LESLIE.slow.horn;
    drum.frequency.value = LESLIE.slow.drum;
    this.lfo = { horn, drum };
    const rotor = (src: AudioNode, lfo: OscillatorNode, depthDelay: number, depthAmp: number) => {
      // Doppler: a short modulated delay; amplitude: the speaker facing toward / away; pan: left ↔ right
      const d = c.createDelay(0.02);
      d.delayTime.value = 0.004;
      const dg = c.createGain();
      dg.gain.value = depthDelay;
      lfo.connect(dg).connect(d.delayTime);
      const amp = c.createGain();
      amp.gain.value = 1 - depthAmp;
      const ag = c.createGain();
      ag.gain.value = depthAmp;
      lfo.connect(ag).connect(amp.gain);
      const pan = c.createStereoPanner();
      const pg = c.createGain();
      pg.gain.value = 0.7;
      lfo.connect(pg).connect(pan.pan);
      src.connect(d).connect(amp).connect(pan).connect(this.output);
    };
    rotor(hornF, horn, 0.0009, 0.35);
    rotor(drumF, drum, 0.0003, 0.2);
    horn.start();
    drum.start();
  }
  setSpeed(fast: boolean) {
    const t = this.ctx.currentTime;
    this.lfo.horn.frequency.setTargetAtTime(fast ? LESLIE.fast.horn : LESLIE.slow.horn, t, fast ? 0.35 : 0.7);
    this.lfo.drum.frequency.setTargetAtTime(fast ? LESLIE.fast.drum : LESLIE.slow.drum, t, fast ? 1.2 : 1.8);
  }
}

/**
 * One organ key: the drawbar partials (with a hair of wheel leakage), key click, and percussion. Returns the output
 * node and the sources so the caller can stop them; the note holds until `end` (organ notes do not decay).
 */
export function organKey(ctx: BaseAudioContext, f0: number, reg: Registration, start: number, end: number, velocity: number, out: AudioNode) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(1, start + 0.005); // contacts close fast
  g.gain.setValueAtTime(1, Math.max(start + 0.006, end));
  g.gain.linearRampToValueAtTime(0, Math.max(start + 0.006, end) + 0.012);
  g.connect(out);
  const srcs: AudioScheduledSourceNode[] = [];
  const stop = Math.max(start + 0.02, end) + 0.05;
  const level = 0.55 + 0.1 * velocity; // a real organ ignores velocity; a little life here is kinder to exercises
  for (const p of partials(f0, reg.bars)) {
    const o = ctx.createOscillator();
    o.frequency.value = p.f;
    // tonewheels are not perfect sines: a whisper of 3rd harmonic
    const real = new Float32Array([0, 1, 0, 0.03]);
    o.setPeriodicWave(ctx.createPeriodicWave(real, new Float32Array(4), { disableNormalization: true }));
    const pg = ctx.createGain();
    pg.gain.value = p.a * level;
    o.connect(pg).connect(g);
    o.start(start);
    o.stop(stop);
    srcs.push(o);
  }
  // percussion: the 2nd (4′) or 3rd (2⅔′) harmonic, decaying fast
  if (reg.perc) {
    const o = ctx.createOscillator();
    o.frequency.value = f0 * (reg.perc === 'second' ? 2 : 3);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0, start);
    pg.gain.linearRampToValueAtTime(0.32 * level, start + 0.003);
    pg.gain.setTargetAtTime(0, start + 0.004, 0.17);
    o.connect(pg).connect(g);
    o.start(start);
    o.stop(stop);
    srcs.push(o);
  }
  // key click: a 3 ms bright burst
  const len = Math.floor(ctx.sampleRate * 0.01);
  const nb = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0015));
  const click = ctx.createBufferSource();
  click.buffer = nb;
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = Math.min(9000, 2500 + f0 * 4);
  hp.Q.value = 0.8;
  const cg = ctx.createGain();
  cg.gain.value = 0.18;
  click.connect(hp).connect(cg).connect(g);
  click.start(start);
  srcs.push(click);
  return { out: g, srcs, stop };
}
