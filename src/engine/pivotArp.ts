// BH-G (docs/AUDIT-CONTENT-THEORY.md §ז.2): the pivot — Barry Harris's pivot arpeggio. Owner-confirmed definition
// (2026-11-14): a pivot is an arpeggio with some of its notes moved an octave, so the order stays the same and the
// contour changes. The canonical case: the root ON TOP first, then drop to the next chord tone below and climb —
// Cmaj7 = C5 → E4 G4 B4. The drop from the top root to the 3rd is a minor 6th over a major 3rd, a major 6th over a
// minor 3rd. It works on any four-note chord.
// Extensions: another chord tone on top (rotations: 3rd on top → drop to the 5th, climb 5-7-1); the mirror (the lowest
// note first, leap up to the chord tone below it an octave higher, fall); chained through ii–V–I; inside a Harris
// descending scale line (scalePivotLine); alternating with three-note enclosures down the major bebop scale (the Harry
// Likas / Barry Harris warm-up, pivotEnclosureLine).
// Pure. The topic (topicsPivotArp.ts), the keys drills (harris 19–24), the guitar levels (g-harris 8–10) and the bass
// levels (b-barry 7–8) all build on it.

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export type ArpQuality = 'maj7' | 'm7' | '7' | 'm7b5' | '6' | 'dim7' | 'm6';
/** Chord tones above the root, ascending inside one octave. */
export const ARP_QUALITY: Record<ArpQuality, number[]> = {
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  '6': [0, 4, 7, 9],
  dim7: [0, 3, 6, 9],
  m6: [0, 3, 7, 9],
};
/** Chord symbols as charts write them (same in both languages). */
export const ARP_SYM: Record<ArpQuality, string> = { maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5', '6': '6', dim7: '°7', m6: 'm6' };
export const ARP_QUALITIES: ArpQuality[] = ['maj7', 'm7', '7', 'm7b5', '6', 'dim7'];

/**
 * The arpeggio from the top on a chord whose root is the MIDI note `root` (the low octave): chord tone `rot` (0 = root,
 * 1 = 3rd, 2 = 5th, 3 = 7th/6th) an octave up on top, then the next chord tone below it and the climb through the rest.
 * pivotArp(60, 'maj7') = [72, 64, 67, 71]; pivotArp(60, 'maj7', 1) = [76, 67, 71, 72].
 */
export function pivotArp(root: number, q: ArpQuality, rot = 0): number[] {
  const t = ARP_QUALITY[q].map((x) => root + x);
  const r = ((rot % 4) + 4) % 4;
  const out = [t[r] + 12];
  for (let k = 1; k <= 3; k++) {
    const i = r + k;
    out.push(t[i % 4] + 12 * Math.floor(i / 4));
  }
  return out;
}
/** The straight arpeggio from the bottom (1-3-5-7), for comparison: straightArp(60, 'maj7') = [60, 64, 67, 71]. */
export const straightArp = (root: number, q: ArpQuality): number[] => ARP_QUALITY[q].map((x) => root + x);
/**
 * The mirror: the chord tone `rot` at the bottom, a leap up to the chord tone just below it an octave higher, then down.
 * mirrorArp(60, 'maj7') = [60, 71, 67, 64].
 */
export function mirrorArp(root: number, q: ArpQuality, rot = 0): number[] {
  const up = pivotArp(root, q, rot);
  return [up[0] - 12, ...up.slice(1).reverse()];
}
/** The drop in semitones from the top note to the next (the leap you hear): a minor 6th (8) over a major 3rd, a major 6th (9) over a minor 3rd. */
export const dropOf = (line: number[]): number => line[0] - line[1];
/** Which chord tone sits on top (0–3) for an arpeggio from the top on `rootPc`, or -1. */
export function topTone(line: number[], rootPc: number, q: ArpQuality): number {
  return ARP_QUALITY[q].findIndex((x) => mod12(rootPc + x) === mod12(line[0]));
}
/** The root MIDI note (≤ the line's 2nd note) that puts the arpeggio's top note nearest `aim`. */
export function rootNear(rootPc: number, q: ArpQuality, aim: number, rot = 0): number {
  let best = 0;
  let cost = Infinity;
  for (let r = 36 + mod12(rootPc - 36); r <= 84; r += 12) {
    const c = Math.abs(pivotArp(r, q, rot)[0] - aim);
    if (c < cost) {
      cost = c;
      best = r;
    }
  }
  return best;
}

// ---------------------------------------------------------------- lines with a pivot inside

/** One note of a line: pitch, beat, length in beats, chord tone. */
export interface LineNote {
  p: number;
  beat: number;
  dur: number;
  ct: boolean;
}
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * Barry's half-step rule going down (the same rule as the keys' Harris lines): chord tones on the beats; between two
 * chord tones the one scale tone between them, a chromatic one where none fits. 2 × beats 8ths, and the next chord tone.
 */
export function stepDown(start: number, ct: number[], scale: number[], beats: number, b0 = 0): { line: LineNote[]; next: number } {
  const line: LineNote[] = [];
  let p = start;
  for (let b = 0; b < beats; b++) {
    let tgt = p - 1;
    while (!ct.includes(mod12(tgt))) tgt--;
    if (p - tgt === 1) {
      tgt--;
      while (!ct.includes(mod12(tgt))) tgt--;
    }
    const between: number[] = [];
    for (let q = p - 1; q > tgt; q--) if (scale.includes(mod12(q))) between.push(q);
    line.push({ p, beat: r6(b0 + b), dur: 0.5, ct: ct.includes(mod12(p)) });
    line.push({ p: between.length ? between[between.length - 1] : p - 1, beat: r6(b0 + b + 0.5), dur: 0.5, ct: false });
    p = tgt;
  }
  return { line, next: p };
}

/** The scales of the scale-and-pivot lines: the 6th chord over the major scale, the dominant over its descending scale (root → ♮7 → ♭7). */
export const SCALE_PIVOT: Record<'6' | '7', { ct: number[]; scale: number[] }> = {
  '6': { ct: [0, 4, 7, 9], scale: [0, 2, 4, 5, 7, 9, 11] },
  '7': { ct: [0, 4, 7, 10], scale: [0, 2, 4, 5, 7, 9, 10, 11] },
};
/**
 * Descending scale plus pivot: from the root `top` (a MIDI note of the key) the scale comes down by the half-step rules
 * for `at` beats (1–3), lands on a chord tone on the beat and pivots there — that tone on top, the drop to the next chord
 * tone below, the climb — then the scale comes down again from the pivot's top note to fill six beats, and lands.
 * In C6, at 2: C B A A♭ | G A C E | G F E D | C.
 */
export function scalePivotLine(top: number, q: '6' | '7', at: number): { line: LineNote[]; pivotBeat: number } {
  const key = mod12(top);
  const { ct, scale } = SCALE_PIVOT[q];
  const cts = ct.map((x) => mod12(key + x));
  const sc = scale.map((x) => mod12(key + x));
  const a = stepDown(top, cts, sc, at, 0);
  const X = a.next;
  const r = ct.findIndex((x) => mod12(key + x) === mod12(X));
  const piv = pivotArp(X - 12 - ct[r], q, r).map((p, i) => ({ p, beat: at + i / 2, dur: 0.5, ct: true }));
  const b = stepDown(X, cts, sc, 4 - at, at + 2);
  return { line: [...a.line, ...piv, ...b.line, { p: b.next, beat: 6, dur: 2, ct: true }], pivotBeat: at };
}

/** The major bebop scale (the major scale with ♭6): its chord tones are the 6th chord's, so they fall on the beats. */
export const BEBOP_MAJOR = [0, 2, 4, 5, 7, 8, 9, 11];
/**
 * Pivot plus enclosure (the Harry Likas / Barry Harris warm-up) down the major bebop scale, chord tones (the 6th chord)
 * on the beats, alternating two moves: a pivot — the chord tone, then the next scale note moved an octave (up, or down
 * when up runs past the top), and the next chord tone a step from it — and a three-note enclosure — the chord tone
 * above, the half step below, the target. `from` 0 starts on the root, 2 on the 5th; the first note is in [lo, lo + 11].
 * In C from C5: C5 B5 | A5 F♯5 | G5 F4 | E4 B3 | C4 B4 | A4 F♯4 | G4 F5 | E5 B4 | C5.
 */
export function pivotEnclosureLine(key: number, from: 0 | 2, lo: number): LineNote[] {
  const ct = [0, 4, 7, 9].map((x) => mod12(key + x));
  const bebop = BEBOP_MAJOR.map((x) => mod12(key + x));
  let X = lo + mod12(key + [0, 4, 7, 9][from] - lo);
  const limit = X + 12;
  const out: LineNote[] = [];
  for (let i = 0; i < 8; i++) {
    let y = X - 1;
    while (!ct.includes(mod12(y))) y--;
    out.push({ p: X, beat: i, dur: 0.5, ct: true });
    if (i % 2 === 0) {
      let s = X - 1;
      while (!bebop.includes(mod12(s))) s--;
      const sp = s + 12 <= limit ? s + 12 : s - 12;
      const Y = [y - 12, y, y + 12, y + 24].reduce((a, b) => (Math.abs(b - sp) < Math.abs(a - sp) ? b : a));
      out.push({ p: sp, beat: i + 0.5, dur: 0.5, ct: false });
      X = Y;
    } else {
      out.push({ p: y - 1, beat: i + 0.5, dur: 0.5, ct: false });
      X = y;
    }
  }
  out.push({ p: X, beat: 8, dur: 2, ct: true });
  return out;
}
