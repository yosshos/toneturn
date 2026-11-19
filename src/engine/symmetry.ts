// Symmetry unit (owner 2026-11-19): the pure theory behind the three topics (src/engine/topicsSymmetry.ts) and the
// Tonnetz game (src/engine/tonnetz.ts). Every answer the app gives is computed here, never written by hand:
//   · equal divisions of the octave (12 semitones / N) and how many transpositions a symmetric set has;
//   · the neo-Riemannian P, L, R on major and minor triads, chains of them, the shortest chain between two triads;
//   · interval-class vectors <ic1 … ic6>.
// Standard theory only (Cohn, "Audacious Euphony"; Forte / Rahn interval vectors). Pure.

export const mod12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;

// ---------------------------------------------------------------- dividing the octave

/** The equal divisions of the octave the unit names: N parts → the interval of each part (semitones). */
export const DIVISIONS = [2, 3, 4, 6, 12] as const;
export type Division = (typeof DIVISIONS)[number];
export const partSize = (n: number): number => 12 / n;
/** The pitch classes of the octave split into `n` equal parts from `root` (2 → tritone, 3 → augmented triad …). */
export const divisionSet = (n: number, root = 0): number[] => Array.from({ length: n }, (_, k) => mod12(root + k * partSize(n)));

/** The distinct transpositions of a pitch-class set (T0 … T11 that give different sets). */
export function transpositions(pcs: number[]): number {
  const key = (xs: number[]) => [...new Set(xs.map(mod12))].sort((a, b) => a - b).join(',');
  return new Set(Array.from({ length: 12 }, (_, t) => key(pcs.map((p) => p + t)))).size;
}

// ---------------------------------------------------------------- triads and P / L / R

export interface Triad {
  /** Root pitch class. */
  root: number;
  minor: boolean;
}
export type Op = 'P' | 'L' | 'R';
export const OPS: Op[] = ['P', 'L', 'R'];

export const triadPcs = (t: Triad): number[] => [t.root, t.root + (t.minor ? 3 : 4), t.root + 7].map(mod12);
export const sameTriad = (a: Triad, b: Triad): boolean => mod12(a.root) === mod12(b.root) && a.minor === b.minor;
export const triadKey = (t: Triad): string => `${mod12(t.root)}${t.minor ? 'm' : 'M'}`;

/**
 * P (parallel): C ↔ Cm — the 3rd moves a semitone. R (relative): C ↔ Am — the 5th of the major triad moves up a whole
 * tone (in the minor triad the root moves down one). L (leading-tone exchange): C ↔ Em — the root of the major triad
 * moves down a semitone (in the minor triad the 5th moves up one). Each is its own inverse.
 */
export function applyOp(t: Triad, op: Op): Triad {
  const r = mod12(t.root);
  if (op === 'P') return { root: r, minor: !t.minor };
  if (op === 'R') return t.minor ? { root: mod12(r + 3), minor: false } : { root: mod12(r + 9), minor: true };
  return t.minor ? { root: mod12(r + 8), minor: false } : { root: mod12(r + 4), minor: true };
}
/** A chain applied left to right: chain(C, ['P', 'L']) = C → Cm → A♭. */
export const applyChain = (t: Triad, ops: Op[]): Triad => ops.reduce(applyOp, t);
/** Every triad on the way, the start included. */
export const chainPath = (t: Triad, ops: Op[]): Triad[] => ops.reduce<Triad[]>((acc, op) => [...acc, applyOp(acc[acc.length - 1], op)], [t]);

/** Which note moves under an operation, from where to where (semitones, signed), and the two notes kept. */
export function moveOf(t: Triad, op: Op): { from: number; to: number; step: number; kept: number[] } {
  const a = triadPcs(t);
  const b = triadPcs(applyOp(t, op));
  const from = a.find((x) => !b.includes(x))!;
  const to = b.find((x) => !a.includes(x))!;
  let step = mod12(to - from);
  if (step > 6) step -= 12;
  return { from, to, step, kept: a.filter((x) => b.includes(x)) };
}

/** All 24 major and minor triads. */
export const ALL_TRIADS: Triad[] = Array.from({ length: 24 }, (_, i) => ({ root: i % 12, minor: i >= 12 }));

/** Shortest P/L/R distance from `a` to every triad (breadth first). */
export function distances(a: Triad): Map<string, number> {
  const d = new Map<string, number>([[triadKey(a), 0]]);
  let front = [a];
  while (front.length) {
    const next: Triad[] = [];
    for (const t of front)
      for (const op of OPS) {
        const u = applyOp(t, op);
        if (d.has(triadKey(u))) continue;
        d.set(triadKey(u), d.get(triadKey(t))! + 1);
        next.push(u);
      }
    front = next;
  }
  return d;
}
export const distance = (a: Triad, b: Triad): number => distances(a).get(triadKey(b)) ?? Infinity;

/** Every shortest chain from `a` to `b` (words over P, L, R). */
export function shortestChains(a: Triad, b: Triad): Op[][] {
  const n = distance(a, b);
  if (!Number.isFinite(n)) return [];
  const out: Op[][] = [];
  const walk = (t: Triad, w: Op[]) => {
    if (w.length === n) {
      if (sameTriad(t, b)) out.push(w);
      return;
    }
    for (const op of OPS) {
      const u = applyOp(t, op);
      if (distance(u, b) === n - w.length - 1) walk(u, [...w, op]);
    }
  };
  walk(a, []);
  return out;
}

/** The cycle an alternation of two operations makes from `t` (PL: the hexatonic cycle of 6, PR: the octatonic of 8). */
export function cycleOf(t: Triad, a: Op, b: Op): Triad[] {
  const out: Triad[] = [t];
  let cur = t;
  for (let k = 0; k < 48; k++) {
    cur = applyOp(cur, k % 2 === 0 ? a : b);
    if (sameTriad(cur, t)) return out;
    out.push(cur);
  }
  return out;
}
/** The pitch classes a set of triads covers (sorted). */
export const unionPcs = (ts: Triad[]): number[] => [...new Set(ts.flatMap(triadPcs))].sort((x, y) => x - y);

/** A triad voiced close around E4, kept near the last one (so the moving note is the one you hear move). */
export function triadVoicing(t: Triad, near?: number[]): number[] {
  const centre = near ? near.reduce((a, b) => a + b, 0) / near.length : 64;
  return triadPcs(t)
    .map((p) => {
      let m = 60 + mod12(p - 60);
      while (m - centre > 6) m -= 12;
      while (centre - m > 6) m += 12;
      return m;
    })
    .sort((a, b) => a - b);
}

// ---------------------------------------------------------------- names

const MAJ = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MIN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
/** A triad as a chord symbol: C, Cm, A♭, G♯m (minor roots spelled the usual minor-key way). */
export const triadName = (t: Triad): string => (t.minor ? `${MIN[mod12(t.root)]}m` : MAJ[mod12(t.root)]);

// ---------------------------------------------------------------- interval vectors

/** The interval class of an interval in semitones (0–6: an interval and its inversion are one class). */
export const intervalClass = (semis: number): number => {
  const s = mod12(semis);
  return Math.min(s, 12 - s);
};
/** The interval-class vector <ic1 … ic6> of a pitch-class set: how many pairs of notes lie each class apart. */
export function intervalVector(pcs: number[]): number[] {
  const xs = [...new Set(pcs.map(mod12))];
  const v = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) v[intervalClass(xs[j] - xs[i]) - 1]++;
  return v;
}
export const vectorText = (v: number[]): string => `<${v.join('')}>`;
export const hasClass = (pcs: number[], ic: number): boolean => intervalVector(pcs)[ic - 1] > 0;

/** The chords and scales the vector levels use (pitch classes from C). */
export const IV_SETS: Record<string, { pcs: number[]; en: string; he: string }> = {
  major: { pcs: [0, 4, 7], en: 'Major triad', he: 'משולש מז׳ורי' },
  minor: { pcs: [0, 3, 7], en: 'Minor triad', he: 'משולש מינורי' },
  dim: { pcs: [0, 3, 6], en: 'Diminished triad', he: 'משולש מוקטן' },
  aug: { pcs: [0, 4, 8], en: 'Augmented triad', he: 'משולש מוגדל' },
  sus4: { pcs: [0, 5, 7], en: 'Sus4 chord', he: 'אקורד sus4' },
  dom7: { pcs: [0, 4, 7, 10], en: 'Dominant 7th', he: 'ספטאקורד דומיננטי' },
  maj7: { pcs: [0, 4, 7, 11], en: 'Major 7th', he: 'ספטאקורד מז׳ורי' },
  m7: { pcs: [0, 3, 7, 10], en: 'Minor 7th', he: 'ספטאקורד מינורי' },
  dim7: { pcs: [0, 3, 6, 9], en: 'Diminished 7th', he: 'ספטאקורד מוקטן' },
  mmaj7: { pcs: [0, 3, 7, 11], en: 'Minor-major 7th', he: 'מינור עם ספטימה גדולה' },
  m7b5: { pcs: [0, 3, 6, 10], en: 'Half-diminished 7th', he: 'חצי מוקטן' },
  wholetone: { pcs: [0, 2, 4, 6, 8, 10], en: 'Whole-tone scale', he: 'סולם טון שלם' },
  majorScale: { pcs: [0, 2, 4, 5, 7, 9, 11], en: 'Major scale', he: 'סולם מז׳ור' },
};
