// The scale rotation on the neck (SPEC-RBI-ROTATION §4: "guitar and bass: the notes on the neck in the current
// position"). Every chord's scale is shown in one playable position: a 5-fret box (index finger on the box's first
// fret, the little finger one fret past the fourth, the way a jazz guitarist plays through changes in position; on bass
// one finger per fret plus the shift). The first box sits where the key's tonic falls on the lowest string (the 5th
// string when that is past the 8th fret); after that each chord's box stays where the hand already is and moves at
// most a fret, only to bring the chord's root under the low strings. Any 5-fret box on a neck tuned mostly in 4ths
// holds all twelve notes, so the scale is always complete in place. Pure.
import { noteAt, type NeckPos, type Tuning } from './fretboard';
import { chordPcs } from './rotation';
import { cellNotes, type RotationSheet, type SheetCell } from './rotationSheet';

const mod = (n: number) => ((n % 12) + 12) % 12;

/** Frets in a box: lo … lo + 4. */
export const BOX_FRETS = 5;
/** The highest fret a box may reach (guitar: the 15th; bass: the 12th, the octave). */
export const maxFretOf = (t: Tuning): number => (t.instrument === 'bass' ? 12 : 15);

export type NeckRole = 'root' | 'chord' | 'colour' | 'scale';
export interface NeckNote extends NeckPos {
  midi: number;
  pc: number;
  role: NeckRole;
  /** An avoid note of the scale over this chord (outlined). */
  avoid: boolean;
  /** A chord tone's degree above the chord root ("1", "♭3", "5", "♭7"…). */
  deg?: string;
}
export interface NeckBox {
  /** The box's first fret (0 = open position: the open strings and frets 1–4). */
  lo: number;
  hi: number;
  notes: NeckNote[];
}

const DEG = ['1', '♭9', '9', '♭3', '3', '4', '♭5', '5', '♯5', '6', '♭7', '7'];

/** Every position in frets lo … lo + 4 whose note is in `pcs`; a pitch found twice (the G–B 3rd on guitar) is kept
 *  once, on the higher string (the lower fret, where the box's fingering takes it). */
export function boxPositions(t: Tuning, lo: number, pcs: number[]): (NeckPos & { midi: number })[] {
  const set = new Set(pcs.map(mod));
  const out: (NeckPos & { midi: number })[] = [];
  const seen = new Set<number>();
  // string 1 (highest) first, so the higher string wins a repeated pitch
  for (let s = 1; s <= t.open.length; s++)
    for (let f = lo; f <= lo + BOX_FRETS - 1; f++) {
      const m = noteAt(t, s, f);
      if (!set.has(mod(m)) || seen.has(m)) continue;
      seen.add(m);
      out.push({ str: s, fret: f, midi: m });
    }
  return out;
}

/** The first box of a take: the key's tonic on the lowest string (index finger a fret below it), or on the next string
 *  up when the lowest string puts it past the 8th fret. */
export function homeLo(t: Tuning, tonic: number): number {
  const n = t.open.length;
  const top = maxFretOf(t) - (BOX_FRETS - 1);
  let r = mod(tonic - t.open[n - 1]);
  if (r > 8 && n > 1) r = mod(tonic - t.open[n - 2]);
  return Math.max(0, Math.min(top, r - 1));
}

/** Does the box hold the chord's root on one of the two lowest strings (where the chord's shape is anchored)? */
const rootLow = (t: Tuning, lo: number, root: number): boolean => {
  const n = t.open.length;
  return [n, n - 1].some((s) => {
    for (let f = lo; f <= lo + BOX_FRETS - 1; f++) if (mod(noteAt(t, s, f)) === mod(root)) return true;
    return false;
  });
};

/** How far a box may sit from the take's home position (the hand stays in one region of the neck). */
export const HOME_REACH = 2;

/** The box for the next chord from where the hand is: a fret of movement costs 1, the root off the low strings 1.5, a
 *  fret away from the take's home position 0.1; never more than HOME_REACH frets from home (so it never drifts up the
 *  neck); a tie stays put. */
export function nextLo(t: Tuning, prevLo: number, chordRoot: number, home: number): number {
  const top = maxFretOf(t) - (BOX_FRETS - 1);
  let best = prevLo;
  let bestCost = Infinity;
  for (let lo = Math.max(0, home - HOME_REACH); lo <= Math.min(top, home + HOME_REACH); lo++) {
    const cost = Math.abs(lo - prevLo) + (rootLow(t, lo, chordRoot) ? 0 : 1.5) + 0.1 * Math.abs(lo - home);
    if (cost < bestCost - 1e-9 || (Math.abs(cost - bestCost) < 1e-9 && Math.abs(lo - prevLo) < Math.abs(best - prevLo))) {
      best = lo;
      bestCost = cost;
    }
  }
  return best;
}

/** The chord tones and the chord root of a cell (the substitution's when there is one). */
export function cellChord(c: SheetCell, sheet: RotationSheet): { root: number; pcs: number[] } {
  const span = sheet.plan.find((x) => Math.abs(x.span.at - c.at) < 1e-6)?.span;
  if (!span) return { root: c.root, pcs: [mod(c.root)] };
  return { root: mod(span.sub ? span.sub.root : span.root), pcs: chordPcs(span) };
}

/** One cell's scale in a box at `lo`: the chord root, the chord tones, the colour notes, the rest of the scale. */
export function cellBox(t: Tuning, c: SheetCell, sheet: RotationSheet, lo: number): NeckBox {
  const marks = cellNotes(c, sheet);
  const ch = cellChord(c, sheet);
  const notes = boxPositions(t, lo, marks.pcs).map((p): NeckNote => {
    const pc = mod(p.midi);
    const role: NeckRole = pc === ch.root ? 'root' : ch.pcs.includes(pc) ? 'chord' : marks.colour.includes(pc) ? 'colour' : 'scale';
    return { ...p, pc, role, avoid: marks.avoid.includes(pc), ...(role === 'root' || role === 'chord' ? { deg: DEG[mod(pc - ch.root)] } : {}) };
  });
  return { lo, hi: lo + BOX_FRETS - 1, notes };
}

/** The boxes of a whole take, cell by cell: home from the sheet's tonic, then the least movement chord to chord. */
export function neckPath(t: Tuning, sheet: RotationSheet): NeckBox[] {
  const home = homeLo(t, sheet.tonic);
  let lo = home;
  return sheet.cells.map((c, i) => {
    lo = nextLo(t, i === 0 ? home : lo, cellChord(c, sheet).root, home);
    return cellBox(t, c, sheet, lo);
  });
}

/** The frets to draw: two either side of the box (and the next box when it is previewed), inside the neck. */
export function neckView(t: Tuning, cur: NeckBox, next?: NeckBox | null): [number, number] {
  const a = Math.min(cur.lo, next?.lo ?? cur.lo);
  const b = Math.max(cur.hi, next?.hi ?? cur.hi);
  let lo = Math.max(0, a - 2);
  let hi = Math.min(maxFretOf(t) + 2, b + 2);
  // at least 9 frets in view, so the picture's scale stays the same from chord to chord
  while (hi - lo < 8) hi < maxFretOf(t) + 2 ? hi++ : lo--;
  return [Math.max(0, lo), hi];
}
