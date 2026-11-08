// Chord ring-check (SPEC-0.48 §I1): which notes of a strummed / played chord really sounded. Pure.
// A long FFT spectrum (dB, as AnalyserNode.getFloatFrequencyData gives it) folds into a 12-bin chroma vector;
// the chord's pitch classes are then checked for presence. Harmonics fold onto their own pitch class (the 3rd
// harmonic of a root is its 5th), so the check is "is each chord note present", not "is nothing else there".

/** 12-bin chroma (C = 0) from a dB spectrum; max = 1 (all zeros when silent). */
export function chromaFromSpectrum(db: ArrayLike<number>, sampleRate: number, fftSize: number, lo = 70, hi = 1600): number[] {
  const out = new Array<number>(12).fill(0);
  const binHz = sampleRate / fftSize;
  const from = Math.max(1, Math.floor(lo / binHz));
  const to = Math.min(db.length - 1, Math.ceil(hi / binHz));
  for (let k = from; k <= to; k++) {
    const d = db[k];
    if (!Number.isFinite(d) || d < -100) continue;
    // keep only local peaks — partials, not the skirts between them
    if (d < db[k - 1] || d < db[k + 1]) continue;
    const f = k * binHz;
    const midi = 69 + 12 * Math.log2(f / 440);
    const near = Math.round(midi);
    const cents = Math.abs(midi - near) * 100;
    if (cents > 40) continue;
    const mag = Math.pow(10, d / 20);
    // low partials carry the chord; very high ones are mostly overtones
    const w = (1 - cents / 50) * (f < 700 ? 1 : 0.6);
    out[((near % 12) + 12) % 12] += mag * w;
  }
  const max = Math.max(...out);
  return max > 0 ? out.map((x) => x / max) : out;
}

/** Mean of several chroma vectors (renormalised to max = 1). */
export function meanChroma(cs: number[][]): number[] {
  const out = new Array<number>(12).fill(0);
  for (const c of cs) for (let i = 0; i < 12; i++) out[i] += c[i];
  const max = Math.max(...out);
  return max > 0 ? out.map((x) => x / max) : out;
}

export interface RingCheck {
  /** Chord pitch classes heard. */
  present: number[];
  /** Chord pitch classes not heard (a muted or buzzing string, a missed key). */
  missing: number[];
  /** Strong pitch classes that are not in the chord (a wrong fret / key). */
  extra: number[];
}

/** ⚙ thresholds: a chord note counts when it reaches 18 % of the strongest class; a foreign class is "extra" above 55 %. */
export function ringCheck(chroma: number[], chordPcs: number[], present = 0.18, extra = 0.55): RingCheck {
  const want = new Set(chordPcs.map((p) => ((p % 12) + 12) % 12));
  const r: RingCheck = { present: [], missing: [], extra: [] };
  if (Math.max(...chroma) <= 0) return { present: [], missing: [...want], extra: [] };
  for (const p of want) (chroma[p] >= present ? r.present : r.missing).push(p);
  for (let p = 0; p < 12; p++) if (!want.has(p) && chroma[p] >= extra) r.extra.push(p);
  return r;
}
