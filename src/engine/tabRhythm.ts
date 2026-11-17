// Rhythm under the tab (GUITAR-AUDIT T2): standard tab-rhythm notation — a stem under each column, beams joining the
// 8ths and 16ths of one beat, a dot for dotted values, "3" under a triplet group; a whole note has no stem, a half note
// a short one. Pure: column durations in, what to draw out (TabLine draws it).

/** One column's rhythm symbol. */
export interface StemMark {
  /** 0 = whole (no stem), 1 = half (short stem), 2 = quarter, 3 = 8th, 4 = 16th. */
  kind: 0 | 1 | 2 | 3 | 4;
  dotted: boolean;
  triplet: boolean;
}
/** A beam: columns `from` … `to` (indices), `level` 1 = the 8th beam, 2 = the 16th beam (may cover part of a group). */
export interface Beam {
  from: number;
  to: number;
  level: 1 | 2;
}
export interface TabRhythm {
  marks: StemMark[];
  beams: Beam[];
  /** Column index ranges under one "3". */
  triplets: [number, number][];
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.02;

/** A duration in quarter notes → its symbol (rounded to the nearest written value). */
export function stemMark(q: number): StemMark {
  const trip = [1 / 3, 1 / 6, 2 / 3].some((t) => near(q, t));
  if (trip) return { kind: near(q, 2 / 3) ? 2 : near(q, 1 / 3) ? 3 : 4, dotted: false, triplet: true };
  const dot = (base: number) => near(q, base * 1.5);
  if (q >= 3.9) return { kind: 0, dotted: false, triplet: false };
  if (q >= 1.9) return { kind: 1, dotted: dot(2), triplet: false };
  if (q >= 0.95) return { kind: 2, dotted: dot(1), triplet: false };
  if (q >= 0.45) return { kind: 3, dotted: dot(0.5), triplet: false };
  return { kind: 4, dotted: dot(0.25), triplet: false };
}

/**
 * The rhythm of a tab line. `at` = each column's start (quarter notes from the line's start), `dur` = its written length
 * (quarters; never past the next column), `group` = the beaming unit in quarters (1; 1.5 in 6/8).
 */
export function tabRhythm(at: number[], dur: number[], group = 1): TabRhythm {
  const marks = dur.map((d, i) => stemMark(Math.min(d, i + 1 < at.length ? at[i + 1] - at[i] : d)));
  const beams: Beam[] = [];
  const triplets: [number, number][] = [];
  const gOf = (i: number) => Math.floor(at[i] / group + 1e-6);
  let i = 0;
  while (i < marks.length) {
    if (marks[i].kind < 3) {
      i++;
      continue;
    }
    // a run of 8ths / 16ths in one beat group, each starting where the one before ends (no rest in between)
    let j = i;
    while (j + 1 < marks.length && marks[j + 1].kind >= 3 && gOf(j + 1) === gOf(i) && near(at[j] + Math.min(dur[j], at[j + 1] - at[j]), at[j + 1])) j++;
    if (j > i) {
      beams.push({ from: i, to: j, level: 1 });
      // the 16th beam over each sub-run of 16ths (a lone 16th inside a group gets a stub, drawn by TabLine)
      let k = i;
      while (k <= j) {
        if (marks[k].kind === 4) {
          let e = k;
          while (e + 1 <= j && marks[e + 1].kind === 4) e++;
          beams.push({ from: k, to: e, level: 2 });
          k = e + 1;
        } else k++;
      }
      if (marks.slice(i, j + 1).every((m) => m.triplet)) triplets.push([i, j]);
    }
    i = j + 1;
  }
  return { marks, beams, triplets };
}

/** Too dense for stems (a phone line of many 16ths): the tab is drawn without them. */
export const TAB_RHYTHM_MAX_COLS = 16;
