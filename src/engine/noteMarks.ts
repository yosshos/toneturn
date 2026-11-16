// Per-note result marks on the staff (after an answer or a drill take). Pure.
// COURSE-FEEDBACK-UI §4.1: two signals per note — the head carries pitch (right / wrong / missed), a tick beside it
// carries timing (early on the left, late on the right). "Off time" is split into early and late, with the offset.

import type { Question } from './lesson';
import type { NoteResult, TakeMetrics } from './drills/types';

export type NoteMark = 'ok' | 'early' | 'late' | 'wrong' | 'missed' | 'extra' | undefined;

/** Worst first: a chord (or a bar) shows the worst mark of its notes. */
export const MARK_ORDER: Exclude<NoteMark, undefined>[] = ['missed', 'wrong', 'extra', 'late', 'early', 'ok'];
/** The worst of some marks (undefined when none). */
export const worstMark = (ms: NoteMark[]): NoteMark => MARK_ORDER.find((w) => ms.includes(w));

/** A drill note's mark: missed, wrong pitch, right but early / late beyond `timingMs`, or right. */
export function markOf(r: NoteResult | undefined, timingMs: number): NoteMark {
  if (!r) return undefined;
  if (!r.played) return 'missed';
  // Not ok but the right note (a drum hit matched beyond the timing window): a timing error, not a wrong note.
  if (!r.ok) return r.dev !== null && Math.abs(r.dev) > timingMs && r.played.pitch === r.exp.pitch ? (r.dev < 0 ? 'early' : 'late') : 'wrong';
  if (r.dev !== null && Math.abs(r.dev) > timingMs) return r.dev < 0 ? 'early' : 'late';
  return 'ok';
}

/** Length (px) of the timing tick: 4 at the window's edge, growing to 12 at twice the window. */
export function tickLen(dev: number, win: number): number {
  const w = Math.max(1, win);
  const over = Math.max(0, Math.min(1, (Math.abs(dev) - w) / w));
  return 4 + 8 * over;
}

/** Counts of each mark over a take — the same numbers the review shows (no "all green but 83 %"). */
export function markCounts(m: Pick<TakeMetrics, 'perNote'>, timingMs: number): Record<Exclude<NoteMark, undefined>, number> {
  const out = { ok: 0, early: 0, late: 0, wrong: 0, missed: 0, extra: 0 };
  for (const r of m.perNote) {
    const k = markOf(r, timingMs);
    if (k) out[k]++;
  }
  return out;
}

/**
 * Where a played-only note goes on a drawn line: a fractional index into the line's items (`ats`, their start
 * positions in time order; `end` the line's end, drawn as one more position). 2.5 = halfway from item 2 to the next item
 * that starts later. Items starting together (two voices, a chord) share a position: the index is the group's first.
 * Null when `q` is outside [half a beat before the first start, end).
 */
export function extraIndex(ats: number[], q: number, end: number): number | null {
  if (!ats.length || q >= end - 1e-6) return null;
  if (q < ats[0] - 1e-6) return q >= ats[0] - 0.5 ? 0 : null;
  let i = 0;
  for (let k = 0; k < ats.length; k++) if (ats[k] <= q + 1e-6) i = k;
  while (i > 0 && Math.abs(ats[i - 1] - ats[i]) < 1e-6) i--;
  let j = i + 1;
  while (j < ats.length && ats[j] <= ats[i] + 1e-6) j++;
  const b = j < ats.length ? ats[j] : end;
  return b > ats[i] + 1e-6 ? i + Math.min(0.999, (q - ats[i]) / (b - ats[i])) : i;
}

/** Note-by-note marks for a sequence answer (degrees / names): which notes of the melody were right. */
export function seqMarks(q: Question, answer: unknown): NoteMark[] | undefined {
  if ((q.kind !== 'degree-seq' && q.kind !== 'name-seq') || answer === undefined || answer === null) return undefined;
  const sep = q.kind === 'degree-seq' ? '-' : '.';
  const want = String(q.answer).split(sep);
  const got = String(answer).split(sep);
  return want.map((w, i) => (got[i] === undefined || got[i] === '' ? 'missed' : got[i] === w ? 'ok' : 'wrong'));
}
