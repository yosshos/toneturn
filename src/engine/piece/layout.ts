// Score layout (0.49, PLAN §2.1): a Piece as engraving-ready bars — per bar and hand, chords and rests in standard
// note values (whole … sixteenth, dotted), long notes split with ties, gaps filled with rests. Pure; the ScoreView
// draws it with VexFlow. Onsets are quantised to a 16th (triplets are rounded — later).

import type { Piece, PieceHand } from './score';

export interface LayoutEv {
  /** Onset inside the bar (quarter beats). */
  at: number;
  /** Written length (quarter beats): one standard value. */
  dur: number;
  /** MIDI notes (empty = a rest). */
  midis: number[];
  /** Indexes into Piece.notes of the notes that start here (for marks and following). */
  refs: number[];
  /** Tied to the next event of the same hand (a long note split by a value or the bar line). */
  tie: boolean;
  /** This event continues a tie (no new attack). */
  cont?: boolean;
}
export interface LayoutBar {
  index: number;
  number: string;
  beats: number;
  sig: [number, number];
  hands: Record<PieceHand, LayoutEv[]>;
}

const Q = 0.25;
const q = (x: number) => Math.round(x / Q) * Q;
/** Standard written values (quarter beats), longest first. */
export const VALUES = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25];
export const VF_DUR: Record<number, { d: string; dots: number }> = {
  4: { d: 'w', dots: 0 },
  3: { d: 'h', dots: 1 },
  2: { d: 'h', dots: 0 },
  1.5: { d: 'q', dots: 1 },
  1: { d: 'q', dots: 0 },
  0.75: { d: '8', dots: 1 },
  0.5: { d: '8', dots: 0 },
  0.375: { d: '16', dots: 1 },
  0.25: { d: '16', dots: 0 },
};

/** Split a length into standard values, aligned so that a value never crosses a beat it should not (simple rule:
 * greedy longest that fits and keeps the position on a grid of that value's own size when ≥ 1 beat). */
export function splitDur(at: number, len: number): number[] {
  const out: number[] = [];
  let pos = at;
  let left = q(len);
  let guard = 0;
  while (left > 1e-6 && guard++ < 64) {
    // values shorter than a beat do not cross the beat; longer ones start on a beat
    const fits = (x: number) => (x < 1 ? Math.floor(pos + 1e-6) === Math.floor(pos + x - 1e-6) : Math.abs(pos - Math.round(pos)) < 1e-6 && (x <= 2 || x === 3 || Math.abs(pos / 2 - Math.round(pos / 2)) < 1e-6 || x === 4 && pos === 0));
    const v = VALUES.find((x) => x <= left + 1e-6 && fits(x)) ?? Q;
    out.push(v);
    pos += v;
    left = q(left - v);
  }
  return out;
}

export function layoutPiece(p: Piece): LayoutBar[] {
  return p.bars.map((b, bi) => {
    const hands = { R: [] as LayoutEv[], L: [] as LayoutEv[] };
    for (const h of ['R', 'L'] as PieceHand[]) {
      // notes sounding in this bar for this hand: starting here, or held over from earlier bars
      const idx = p.notes.map((n, i) => ({ n, i })).filter(({ n }) => n.hand === h && n.start < b.start + b.beats - 1e-6 && n.start + n.dur > b.start + 1e-6);
      // onset groups (chords) by quantised start inside the bar; held-over notes start at 0 as a continuation
      const groups = new Map<number, { midis: number[]; refs: number[]; end: number; cont: boolean }>();
      for (const { n, i } of idx) {
        const held = n.start < b.start - 1e-6;
        const at = held ? 0 : Math.max(0, Math.min(b.beats - Q, q(n.start - b.start)));
        const end = Math.min(b.beats, q(n.start + n.dur - b.start));
        const g = groups.get(at) ?? { midis: [], refs: [], end: 0, cont: held };
        if (!g.midis.includes(n.midi)) g.midis.push(n.midi);
        if (!held) g.refs.push(i);
        g.end = Math.max(g.end, end);
        g.cont = g.cont && held;
        groups.set(at, g);
      }
      const starts = [...groups.keys()].sort((a, c) => a - c);
      let pos = 0;
      const evs: LayoutEv[] = [];
      const pushRest = (from: number, to: number) => {
        for (const v of splitDur(from, to - from)) {
          evs.push({ at: from, dur: v, midis: [], refs: [], tie: false });
          from += v;
        }
      };
      starts.forEach((at, k) => {
        if (at < pos - 1e-6) return; // overlapping onset inside a held chord: drawn with the earlier one
        if (at > pos + 1e-6) pushRest(pos, at);
        const g = groups.get(at)!;
        const next = starts.slice(k + 1).find((s) => s > at + 1e-6) ?? b.beats;
        const end = Math.max(at + Q, Math.min(g.end, next));
        const crossesBar = idx.some(({ n }) => g.midis.includes(n.midi) && n.start + n.dur > b.start + b.beats + 1e-6 && Math.abs(q(n.start - b.start) - at) < 1e-6) && end >= b.beats - 1e-6;
        const parts = splitDur(at, end - at);
        let p0 = at;
        parts.forEach((v, j) => {
          evs.push({ at: p0, dur: v, midis: g.midis.slice().sort((x, y) => x - y), refs: j === 0 ? g.refs : [], tie: j < parts.length - 1 || crossesBar, ...(j > 0 || g.cont ? { cont: true } : {}) });
          p0 += v;
        });
        pos = end;
      });
      if (pos < b.beats - 1e-6) pushRest(pos, b.beats);
      hands[h] = evs;
    }
    return { index: bi, number: b.number, beats: b.beats, sig: b.sig, hands };
  });
}
