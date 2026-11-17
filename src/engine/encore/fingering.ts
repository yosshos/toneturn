// Encore v2 (SPEC-PHRASE-STUDIO §5.6): suggested piano fingering for a captured phrase. Help only, never graded; off
// by default (plan.fingering), the player's own numbers in the home key win (Lick.marks / lhMarks).
//
// The same principles as the drills' fingering rules (generate.ts autoFingering, chromaticFinger): the thumb avoids
// black keys, never the same finger on two different neighbouring notes, the thumb passes under (or a finger crosses
// over the thumb) to continue a run, and hand spans stay within what is comfortable for each pair of fingers. A phrase
// is not a scale, so the choice is a shortest path over fingers 1–5 (dynamic programming) with those rules as costs.
// The left hand is the mirror image: its fingers count from the other side, so its line is solved reversed in pitch.

const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = (p: number) => BLACK.has(((p % 12) + 12) % 12);

/**
 * Right-hand spans (semitones from the lower-numbered finger's key to the higher one's): the practical minimum, the
 * comfortable minimum, the relaxed range, the comfortable maximum, the practical maximum. Negative = a crossing.
 */
const SPAN: Record<string, [minPrac: number, minComf: number, minRel: number, maxRel: number, maxComf: number, maxPrac: number]> = {
  '1-2': [-5, -3, 1, 5, 8, 10],
  '1-3': [-4, -2, 3, 7, 10, 12],
  '1-4': [-3, -1, 5, 9, 12, 14],
  '1-5': [-1, 1, 7, 10, 13, 15],
  '2-3': [1, 1, 1, 2, 3, 5],
  '2-4': [1, 1, 3, 4, 5, 7],
  '2-5': [2, 2, 5, 6, 8, 10],
  '3-4': [1, 1, 1, 2, 2, 4],
  '3-5': [1, 1, 3, 4, 5, 7],
  '4-5': [1, 1, 1, 2, 3, 5],
};

/** The cost of playing `p2` with `f2` right after `p1` with `f1` (right-hand orientation: p already mirrored for LH). */
export function stepCost(f1: number, p1: number, f2: number, p2: number, black2: boolean, black1: boolean): number {
  const d = p2 - p1;
  if (f1 === f2) return d === 0 ? 0.5 : 12;
  const [lo, hi, dd] = f1 < f2 ? [f1, f2, d] : [f2, f1, -d];
  const [minPrac, minComf, minRel, maxRel, maxComf, maxPrac] = SPAN[`${lo}-${hi}`];
  let c = 0;
  if (dd < minPrac || dd > maxPrac) c += 30;
  if (dd > maxComf) c += 2 * (dd - maxComf);
  if (dd < minComf) c += 2 * (minComf - dd);
  if (dd > maxRel) c += dd - maxRel;
  if (dd < minRel) c += minRel - dd;
  // a crossing (the thumb under, a finger over): only with the thumb; awkward onto a black thumb, easy from black to white
  if (dd < 0) {
    if (lo !== 1) c += 30;
    else {
      c += 1;
      const thumbBlack = f1 === 1 ? black1 : black2;
      if (thumbBlack) c += 4;
    }
  }
  // 3–4 and 4–5 are the weak pairs: a little extra for using them
  if ((lo === 3 && hi === 4) || (lo === 4 && hi === 5)) c += 0.5;
  return c;
}
const placeCost = (f: number, black: boolean, prevBlack: boolean | null, nextBlack: boolean | null): number => {
  let c = 0;
  if (f === 1 && black) c += 3;
  if (f === 5 && black && prevBlack === false && nextBlack === false) c += 1;
  return c;
};

export interface FNote {
  pitch: number;
  beat: number;
}

/**
 * Fingers 1–5 for one hand's notes (any order; returned in the input's order). Notes sounding together form a chord:
 * the line runs through its top note (RH) or bottom note (LH), the other notes take the next fingers inward.
 * `fixed` pins a finger on a note (the player's own number) — the path goes through it.
 */
export function suggestFingers(notes: readonly FNote[], hand: 'R' | 'L', fixed: (number | undefined)[] = []): number[] {
  const out = new Array<number>(notes.length).fill(0);
  if (!notes.length) return out;
  const mirror = hand === 'L' ? -1 : 1;
  // onset groups, in time order
  const idx = notes.map((_, i) => i).sort((a, b) => notes[a].beat - notes[b].beat || notes[a].pitch - notes[b].pitch);
  const groups: number[][] = [];
  for (const i of idx) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(notes[g[0]].beat - notes[i].beat) < 1e-6) g.push(i);
    else groups.push([i]);
  }
  // the line: RH top note, LH bottom note of each group (both = the highest in mirrored pitch)
  const line = groups.map((g) => g.reduce((a, b) => (notes[b].pitch * mirror > notes[a].pitch * mirror ? b : a)));
  const P = line.map((i) => notes[i].pitch * mirror);
  const B = line.map((i) => isBlack(notes[i].pitch));
  const n = line.length;
  const F = [1, 2, 3, 4, 5];
  // chords need room under the line's finger: a chord of k notes needs the line finger ≥ k
  const need = groups.map((g) => g.length);
  const cost: number[][] = Array.from({ length: n }, () => new Array(6).fill(Infinity));
  const from: number[][] = Array.from({ length: n }, () => new Array(6).fill(0));
  const allowed = (i: number, f: number) => f >= need[i] && (fixed[line[i]] === undefined || fixed[line[i]] === f);
  // a chord's span asks for a finger on its line note: a narrow chord fits under 3 or 4, an octave-ish one needs 5
  const spanOf = (gi: number) => {
    const ps = groups[gi].map((i) => notes[i].pitch * mirror);
    return Math.max(...ps) - Math.min(...ps);
  };
  const chordCost = (gi: number, f: number) => {
    if (need[gi] < 2) return 0;
    const s = spanOf(gi);
    const ideal = Math.max(need[gi], s >= 7 ? 5 : s >= 5 ? 4 : need[gi]);
    return 1.5 * Math.abs(f - ideal);
  };
  for (const f of F) if (allowed(0, f)) cost[0][f] = placeCost(f, B[0], null, n > 1 ? B[1] : null) + chordCost(0, f);
  for (let i = 1; i < n; i++)
    for (const f2 of F) {
      if (!allowed(i, f2)) continue;
      const pc = placeCost(f2, B[i], B[i - 1], i + 1 < n ? B[i + 1] : null) + chordCost(i, f2);
      for (const f1 of F) {
        if (cost[i - 1][f1] === Infinity) continue;
        const c = cost[i - 1][f1] + stepCost(f1, P[i - 1], f2, P[i], B[i], B[i - 1]) + pc;
        if (c < cost[i][f2]) {
          cost[i][f2] = c;
          from[i][f2] = f1;
        }
      }
    }
  let f = F.reduce((a, b) => (cost[n - 1][b] < cost[n - 1][a] ? b : a), 1);
  const lineF = new Array<number>(n).fill(1);
  for (let i = n - 1; i >= 0; i--) {
    lineF[i] = f;
    f = from[i][f] || f;
  }
  groups.forEach((g, gi) => {
    out[line[gi]] = lineF[gi];
    if (g.length < 2) return;
    // the rest of the chord under the line's finger: the far note on the thumb, the inner ones by their place in the
    // span (C–E–G under 5 → 1 3 5), always strictly inward
    const rest = g.filter((i) => i !== line[gi]).sort((a, b) => (notes[a].pitch - notes[b].pitch) * mirror);
    const top = notes[line[gi]].pitch * mirror;
    const low = notes[rest[0]].pitch * mirror;
    let prev = 0;
    rest.forEach((i, k) => {
      const left = rest.length - k; // notes from this one up to (not counting) the line note
      const ideal = k === 0 ? 1 : Math.round(1 + ((lineF[gi] - 1) * (notes[i].pitch * mirror - low)) / Math.max(1, top - low));
      const f2 = Math.max(prev + 1, Math.min(lineF[gi] - left, ideal));
      out[i] = fixed[i] ?? f2;
      prev = out[i];
    });
  });
  return out;
}
