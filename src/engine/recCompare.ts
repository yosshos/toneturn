// A/B compare of two takes (SPEC-PHRASE-STUDIO §6.6) and the progress of one item over time. Pure.
//  · Alignment: two takes with a known tempo line up bar by bar (beat 0 = the first bar line of each); free takes are
//    scaled by their median inter-onset ratio and shifted to the offset where the most notes of the same pitch meet.
//  · Per note: matched (with its timing deviation from the other take, ms at A's tempo) or not matched ("wrong").
//  · Measured deltas: tempo, accuracy (the graded result when there is one, else the share of matched notes), timing
//    spread (SD of each onset's distance to the nearest sixteenth when the tempo is known, else of the IOI ratios).

export interface CmpNote {
  pitch: number;
  /** ms from beat 0 (tempo known) or from the take's start */
  on: number;
  off?: number | null;
  vel?: number;
}
export interface CmpTake {
  notes: readonly CmpNote[];
  bpm?: number;
  meter?: number;
  result?: { acc?: number; bpm?: number } | null;
  at?: string;
}
export interface Aligned {
  method: 'bars' | 'onsets';
  /** each note's position on the shared axis, in beats (bars) or A-seconds (onsets) */
  posA: number[];
  posB: number[];
  /** shared axis span */
  span: [number, number];
  /** beats per bar on the shared axis (bars) — null for free takes */
  barLen: number | null;
  /** index in B of A's match (−1 = none) */
  matchA: number[];
  matchB: number[];
  /** ms: B's onset − A's onset for matched notes (by A index; null when not matched) */
  devA: (number | null)[];
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const onsetsOf = (ns: readonly CmpNote[]) => [...ns].sort((a, b) => a.on - b.on);
function iois(ns: readonly CmpNote[]): number[] {
  const on = [...new Set(onsetsOf(ns).map((n) => Math.round(n.on)))];
  const out: number[] = [];
  for (let i = 1; i < on.length; i++) if (on[i] - on[i - 1] > 40) out.push(on[i] - on[i - 1]);
  return out;
}

/** Greedy matching of two position lists of the same pitch within `win` (shared units). */
function match(a: readonly CmpNote[], pa: number[], b: readonly CmpNote[], pb: number[], win: number): { ma: number[]; mb: number[] } {
  const ma = a.map(() => -1);
  const mb = b.map(() => -1);
  const pairs: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      if (a[i].pitch !== b[j].pitch) continue;
      const d = Math.abs(pa[i] - pb[j]);
      if (d <= win) pairs.push({ i, j, d });
    }
  pairs.sort((x, y) => x.d - y.d);
  for (const p of pairs) if (ma[p.i] < 0 && mb[p.j] < 0) (ma[p.i] = p.j), (mb[p.j] = p.i);
  return { ma, mb };
}

export function alignTakes(A: CmpTake, B: CmpTake): Aligned {
  const a = onsetsOf(A.notes);
  const b = onsetsOf(B.notes);
  if (A.bpm && B.bpm) {
    const pa = a.map((n) => (n.on * A.bpm!) / 60000);
    const pb = b.map((n) => (n.on * B.bpm!) / 60000);
    const { ma, mb } = match(a, pa, b, pb, 0.5);
    const msPerBeat = 60000 / A.bpm;
    const all = [...pa, ...pb];
    return {
      method: 'bars',
      posA: pa,
      posB: pb,
      span: [Math.min(0, ...all), Math.max(1, ...all.map((x) => x + 0.5))],
      barLen: A.meter ?? 4,
      matchA: ma,
      matchB: mb,
      devA: ma.map((j, i) => (j < 0 ? null : Math.round((pb[j] - pa[i]) * msPerBeat))),
    };
  }
  // free takes: scale B by the IOI ratio, then the shift that lines up the most notes
  const r = median(iois(a)) && median(iois(b)) ? median(iois(a)) / median(iois(b)) : 1;
  const pa = a.map((n) => n.on / 1000);
  const pb0 = b.map((n) => (n.on * r) / 1000);
  let best = { shift: (pa[0] ?? 0) - (pb0[0] ?? 0), n: -1 };
  const cand = new Set<number>();
  for (let i = 0; i < Math.min(16, a.length); i++) for (let j = 0; j < Math.min(16, b.length); j++) if (a[i].pitch === b[j].pitch) cand.add(Math.round((pa[i] - pb0[j]) * 100) / 100);
  for (const s of cand) {
    const n = match(a, pa, b, pb0.map((x) => x + s), 0.1).ma.filter((x) => x >= 0).length;
    if (n > best.n) best = { shift: s, n };
  }
  const pb = pb0.map((x) => x + best.shift);
  const { ma, mb } = match(a, pa, b, pb, 0.15);
  const all = [...pa, ...pb];
  return {
    method: 'onsets',
    posA: pa,
    posB: pb,
    span: [Math.min(...all, 0), Math.max(0.5, ...all) + 0.3],
    barLen: null,
    matchA: ma,
    matchB: mb,
    devA: ma.map((j, i) => (j < 0 ? null : Math.round((pb[j] - pa[i]) * 1000))),
  };
}

/** A take's tempo: the graded / known one, else from its median inter-onset (taken as an eighth when quick). */
export function takeTempo(t: CmpTake): number | null {
  if (t.result?.bpm) return Math.round(t.result.bpm);
  if (t.bpm) return Math.round(t.bpm);
  const m = median(iois(t.notes));
  if (!m) return null;
  let bpm = 60000 / m;
  while (bpm > 240) bpm /= 2;
  while (bpm < 50) bpm *= 2;
  return Math.round(bpm);
}
/** Timing spread (ms). */
export function timingSpread(t: CmpTake): number | null {
  const ons = onsetsOf(t.notes).map((n) => n.on);
  if (ons.length < 4) return null;
  if (t.bpm) {
    const g = 60000 / t.bpm / 4; // the sixteenth
    return Math.round(sd(ons.map((x) => x - Math.round(x / g) * g)));
  }
  const ii = iois(t.notes);
  if (ii.length < 3) return null;
  const m = median(ii);
  // each IOI against the nearest multiple of half the median (eighths and quarters both count as "in time")
  const unit = m / 2;
  return Math.round(sd(ii.map((x) => x - Math.max(1, Math.round(x / unit)) * unit)));
}
/** Accuracy (0..1): the graded result, else the share of this take's notes that met the other take's. */
export function accuracyOf(t: CmpTake, matched?: number[]): number | null {
  if (t.result?.acc !== undefined && t.result.acc !== null) return t.result.acc;
  if (!matched || !matched.length) return null;
  return matched.filter((x) => x >= 0).length / matched.length;
}

export interface CompareDeltas {
  tempo: [number | null, number | null];
  acc: [number | null, number | null];
  spread: [number | null, number | null];
  /** notes of B not in A, and of A not in B */
  wrongB: number;
  missedA: number;
}
export function compareDeltas(A: CmpTake, B: CmpTake, al: Aligned = alignTakes(A, B)): CompareDeltas {
  return {
    tempo: [takeTempo(A), takeTempo(B)],
    acc: [accuracyOf(A, al.matchA), accuracyOf(B, al.matchB)],
    spread: [timingSpread(A), timingSpread(B)],
    wrongB: al.matchB.filter((x) => x < 0).length,
    missedA: al.matchA.filter((x) => x < 0).length,
  };
}

/** The progress of one item over time: tempo and accuracy per kept take, oldest first. */
export function progressPoints(takes: readonly (CmpTake & { id: string; at: string })[]): { id: string; at: string; bpm: number | null; acc: number | null }[] {
  return [...takes].sort((a, b) => a.at.localeCompare(b.at)).map((t) => ({ id: t.id, at: t.at, bpm: takeTempo(t), acc: t.result?.acc ?? null }));
}

/** Playback plan for "A ↔ B alternating" (per loop) or "in a row": the order of (take, from, to) segments, seconds. */
export function comparePlan(mode: 'alt' | 'row', spanA: [number, number], spanB: [number, number], loops = 2): { take: 'A' | 'B'; from: number; to: number }[] {
  const one = [
    { take: 'A' as const, from: spanA[0], to: spanA[1] },
    { take: 'B' as const, from: spanB[0], to: spanB[1] },
  ];
  if (mode === 'row') return one;
  return Array.from({ length: loops }, () => one).flat();
}
