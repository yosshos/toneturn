// Post-tonal theory helpers (owner-approved 2026-11-19): Messiaen's seven modes of limited transposition and the
// twelve-tone row forms (P, I, R, RI, the matrix). Standard definitions only; tests/postTonal.test.ts pins every number.
// Pure.

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

// ---------------------------------------------------------------- Messiaen's modes of limited transposition

/**
 * The seven modes as interval patterns in semitones, one octave each (Messiaen, "Technique de mon langage musical",
 * 1944). Mode 1 = the whole-tone scale, mode 2 = the octatonic (half–whole diminished) scale.
 */
export const MESSIAEN_MODES: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number[]> = {
  1: [2, 2, 2, 2, 2, 2],
  2: [1, 2, 1, 2, 1, 2, 1, 2],
  3: [2, 1, 1, 2, 1, 1, 2, 1, 1],
  4: [1, 1, 3, 1, 1, 1, 3, 1],
  5: [1, 4, 1, 1, 4, 1],
  6: [2, 2, 1, 1, 2, 2, 1, 1],
  7: [1, 1, 1, 2, 1, 1, 1, 1, 2, 1],
};
export type MessiaenMode = keyof typeof MESSIAEN_MODES;
export const MODE_IDS: MessiaenMode[] = [1, 2, 3, 4, 5, 6, 7];

/** The pitch classes of an interval pattern started on `t` (sorted). */
export function patternPcs(pattern: number[], t = 0): number[] {
  const out: number[] = [];
  let p = t;
  for (const step of pattern.slice(0, -1)) {
    out.push(mod12(p));
    p += step;
  }
  out.push(mod12(p));
  return [...new Set(out)].sort((a, b) => a - b);
}
/** How many different notes the pattern has in an octave. */
export const noteCount = (pattern: number[]): number => patternPcs(pattern).length;
/** How many different pitch-class sets the 12 transpositions of the pattern give (12 for an ordinary scale). */
export function transpositionCount(pattern: number[]): number {
  const sets = new Set<string>();
  for (let t = 0; t < 12; t++) sets.add(patternPcs(pattern, t).join(','));
  return sets.size;
}
/** The smallest move up (in semitones) that lands the pattern back on its own notes (12 = none smaller). */
export function selfMapAt(pattern: number[]): number {
  const base = patternPcs(pattern).join(',');
  for (let t = 1; t <= 12; t++) if (patternPcs(pattern, t).join(',') === base) return t;
  return 12;
}
/** Is the set `pcs` inside some transposition of the pattern? */
export function inSomeTransposition(pcs: number[], pattern: number[]): boolean {
  for (let t = 0; t < 12; t++) {
    const s = new Set(patternPcs(pattern, t));
    if (pcs.every((p) => s.has(mod12(p)))) return true;
  }
  return false;
}

// ---------------------------------------------------------------- twelve-tone rows

export type RowForm = 'P' | 'I' | 'R' | 'RI';
/** Retrograde: the row backwards. */
export const retrograde = (row: number[]): number[] => row.slice().reverse();
/** Inversion: every interval mirrored, starting on the same note (MIDI or pitch classes alike). */
export const inversion = (row: number[]): number[] => row.map((n) => 2 * row[0] - n);
/** Retrograde inversion: the inversion backwards. */
export const retroInversion = (row: number[]): number[] => retrograde(inversion(row));
/** Pn: the row moved by n semitones. */
export const transposeRow = (row: number[], n: number): number[] => row.map((x) => x + n);
/** A row form of `row` (untransposed). */
export function rowForm(row: number[], f: RowForm): number[] {
  return f === 'P' ? row.slice() : f === 'I' ? inversion(row) : f === 'R' ? retrograde(row) : retroInversion(row);
}
/** A valid twelve-tone row: 12 notes, every pitch class exactly once. */
export function isValidRow(row: number[]): boolean {
  return row.length === 12 && new Set(row.map(mod12)).size === 12;
}
/**
 * The matrix of a row (or a shorter cell): row i is the prime moved to start on the i-th note of the inversion (the
 * first column), so M[i][j] = P[j] + P[0] − P[i] (mod 12). The first row is P0, the first column I0.
 */
export function rowMatrix(row: number[]): number[][] {
  return row.map((ri) => row.map((pj) => mod12(pj + row[0] - ri)));
}
