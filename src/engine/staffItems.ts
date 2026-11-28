// The items of one drawn staff line (notes, tied continuations, rests), each with where it really starts. Pure: the
// score (DrillStaff) draws them and the now-cue glides over their `at`s, so the guard tests can check — for any drill —
// that the item the cursor is on is the note due now (owner 2026-11-28: "the cursor must ALWAYS be on the note that
// should be playing now"). Moved out of DrillStaff unchanged.

import type { Drill, ExpNote } from './drills/types';
import { splitDur } from './piece/layout';

/** One drawn item. `at`: where it really starts (quarter notes); the now-cue follows `at`, never a sum of written values. */
export type StaffItem = { n: ExpNote | null; dur: number; at: number; /** A tied continuation's pitch (n null, not a rest). */ p?: number; extra?: number[]; tie?: boolean; orn?: string; /** Two voices: which one (2 = stems down). */ v?: 1 | 2 };

export interface LineItemsIn {
  /** The line's notes (first of each chord), in order. */
  xs: ExpNote[];
  /** Every shown note of the staff (first of each chord). */
  all: ExpNote[];
  /** Every note of the staff (chords: the extra heads). */
  ns: ExpNote[];
  lineStart: number;
  lineEnd: number;
  /** The end of the bar holding position q (quarter notes; a bar's own start gives that bar's end). */
  barEnd: (q: number) => number;
  /** Drill beats → quarter notes (eighth-note meters: ½). */
  qk: number;
  /** Written above the sound (bass: an octave). */
  shift: number;
  ornCode?: Map<ExpNote, string>;
}

export interface LineItemsOut {
  items: StaffItem[];
  /** Two voices: the items tied in from the line before. */
  tins: Set<number>;
  /** One voice: the note tied in from the line before. */
  carry: ExpNote | undefined;
  two: boolean;
}

export function lineItems(o: LineItemsIn): LineItemsOut {
  const { xs, all, ns, lineStart, lineEnd, barEnd, qk, shift, ornCode } = o;
  const bq = (n: ExpNote) => n.beat * qk;
  const dq = (n: ExpNote) => n.dur * qk;
  const items: StaffItem[] = [];
  // Written values; a gap before the next note (or to the bar line at the end) becomes rests of standard values.
  // The written value is rounded to a standard one (a triplet is drawn as an eighth), so the now-cue follows `at`.
  // 0.98: a length in 16ths is written exactly — 16ths, dotted 8ths, a note over the bar line as tied values (a piece's
  // ties, Bach's 16ths); anything else (triplets) keeps the old rounding to 8ths.
  const std = (d: number) => [4, 3, 2, 1.5, 1, 0.5].find((v) => v <= d + 1e-6) ?? 0.5;
  const in16 = (d: number) => Math.abs(d * 4 - Math.round(d * 4)) < 1e-3;
  const VALS16 = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  /** A length in 16ths as standard written values, longest first (tied). */
  const split16 = (d: number): number[] => {
    const out: number[] = [];
    let g = d;
    while (g > 0.24) {
      const v = VALS16.find((x) => x <= g + 1e-6)!;
      out.push(v);
      g -= v;
    }
    return out;
  };
  const pushRest = (gap: number, from: number) => {
    let g = gap;
    let at = from;
    const fine = in16(gap);
    while (g > (fine ? 0.24 : 0.49)) {
      const v = (fine ? [4, 2, 1, 0.5, 0.25] : [4, 2, 1, 0.5]).find((x) => x <= g + 1e-6)!;
      items.push({ n: null, dur: v, at });
      g -= v;
      at += v;
    }
  };
  // (a step past q, so a bar's own start gives its end — never q itself; a guard keeps every loop moving)
  const barEndOf = (q: number) => Math.max(q + 0.25, barEnd(q + 1e-3));
  const extraOf = (n: ExpNote) => (n.chordId === undefined ? undefined : ns.filter((x) => x.chordId === n.chordId && x !== n).map((x) => x.pitch + shift));
  // Two voices on this staff (0.99): each voice laid out on its own (notes, rests, ties), then merged in time order;
  // NoteStaff draws voice 1 stems up and voice 2 stems down. One voice: exactly as before.
  const two = ns.some((n) => n.staffVoice === 2);
  /** A length as written values: one voice, longest first (as before); two voices, never across a beat (layout.splitDur). */
  const splitIn = (at: number, d: number): number[] => (two ? splitDur(at, d) : split16(d));
  let carry: ExpNote | undefined;
  let tin0 = -1;
  const tins = new Set<number>();
  const build = (vxs: ExpNote[], vall: ExpNote[], v: 1 | 2) => {
    const k0 = items.length;
    tin0 = -1;
    // a note held over from the line before (a tie over the line's start): its rest of the length, tied in
    const held = vall.filter((n) => in16(dq(n)) && bq(n) < lineStart - 1e-6 && bq(n) + dq(n) > lineStart + 0.24 && !vall.some((m) => bq(m) > bq(n) + 1e-6 && bq(m) < lineStart + 1e-6));
    carry = held[0];
    let from0 = lineStart;
    if (carry) {
      const end = Math.min(lineEnd, bq(carry) + dq(carry), vxs[0] ? bq(vxs[0]) : lineEnd);
      tin0 = items.length;
      let a = lineStart;
      while (end - a > 0.24) {
        const be = Math.min(end, barEndOf(a));
        for (const w of splitIn(a, be - a)) {
          items.push({ n: null, p: carry.pitch + shift, extra: extraOf(carry), dur: w, at: a, tie: true });
          a += w;
        }
        a = be;
      }
      const last = items[items.length - 1];
      if (last && bq(carry) + dq(carry) <= lineEnd + 1e-6) last.tie = false;
      from0 = a;
    }
    if (vxs[0] && bq(vxs[0]) - from0 > 0.24) pushRest(bq(vxs[0]) - from0, from0);
    vxs.forEach((n, i) => {
      const nextAt = vxs[i + 1] ? bq(vxs[i + 1]) : Math.min(lineEnd, barEnd(bq(n) + dq(n) - 1e-6));
      const orn = ornCode?.get(n);
      if (in16(dq(n)) && in16(bq(n))) {
        // exact: the written length up to the next note, split at each bar line into tied values
        const end = Math.min(bq(n) + dq(n), nextAt, lineEnd);
        let a = bq(n);
        let first = true;
        while (end - a > 0.24) {
          const be = Math.min(end, barEndOf(a));
          for (const w of splitIn(a, be - a)) {
            items.push(first ? { n, dur: w, at: a, extra: extraOf(n), tie: true, ...(orn ? { orn } : {}) } : { n: null, p: n.pitch + shift, extra: extraOf(n), dur: w, at: a, tie: true });
            first = false;
            a += w;
          }
          a = be;
        }
        if (first) items.push({ n, dur: 0.25, at: bq(n), extra: extraOf(n), ...(orn ? { orn } : {}) });
        // the last value is tied on only when the note goes on into the next line
        else if (bq(n) + dq(n) <= lineEnd + 1e-6 || end < lineEnd - 1e-6) items[items.length - 1].tie = false;
        if (nextAt - a > 0.24) pushRest(nextAt - a, a);
        return;
      }
      const d = std(Math.min(Math.max(0.5, dq(n)), Math.max(0.5, nextAt - bq(n))));
      items.push({ n, dur: d, at: bq(n), extra: extraOf(n), ...(orn ? { orn } : {}) });
      if (nextAt - (bq(n) + d) > 0.49) pushRest(nextAt - (bq(n) + d), bq(n) + d);
    });
    if (tin0 >= 0) tins.add(tin0);
    if (two) {
      // each voice fills the line (its own rests to the line's end), so both voices meet at every bar line
      const endAt = items.length > k0 ? items[items.length - 1].at + items[items.length - 1].dur : lineStart;
      if (lineEnd - endAt > 0.24) pushRest(lineEnd - endAt, endAt);
      for (let k = k0; k < items.length; k++) items[k].v = v;
    }
    return carry;
  };
  if (!two) carry = build(xs, all, 1);
  else {
    build(
      xs.filter((n) => n.staffVoice !== 2),
      all.filter((n) => n.staffVoice !== 2),
      1,
    );
    build(
      xs.filter((n) => n.staffVoice === 2),
      all.filter((n) => n.staffVoice === 2),
      2,
    );
    // merge the voices in time order (stable: voice 1 first at the same onset); tie-ins follow their items
    const order = items.map((_, k) => k).sort((p, q) => items[p].at - items[q].at || (items[p].v ?? 1) - (items[q].v ?? 1) || p - q);
    const merged = order.map((k) => items[k]);
    const tinNew = new Set(order.map((k, j) => (tins.has(k) ? j : -1)).filter((j) => j >= 0));
    items.splice(0, items.length, ...merged);
    tins.clear();
    for (const j of tinNew) tins.add(j);
    carry = undefined;
  }
  return { items, tins, carry, two };
}

/** A score longer than 8 bars (DrillStaff pages it: every note drawn, never only the first 8 bars). */
export const longerThan8Bars = (d: Pick<Drill, 'notes' | 'meter'>): boolean => d.notes.some((n) => n.beat >= (d.meter || 4) * 8 - 1e-6);
