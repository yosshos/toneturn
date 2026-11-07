// Per-note result marks on the staff (after an answer or a drill take): right, timing off, wrong, missed. Pure.

import type { Question } from './lesson';
import type { NoteResult } from './drills/types';

export type NoteMark = 'ok' | 'timing' | 'wrong' | 'missed' | undefined;

/** A drill note's mark: missed / wrong red, right but off time (beyond timingMs) amber, right green. */
export function markOf(r: NoteResult | undefined, timingMs: number): NoteMark {
  if (!r) return undefined;
  if (!r.played) return 'missed';
  if (!r.ok) return 'wrong';
  return r.dev !== null && Math.abs(r.dev) > timingMs ? 'timing' : 'ok';
}

/** Note-by-note marks for a sequence answer (degrees / names): which notes of the melody were right. */
export function seqMarks(q: Question, answer: unknown): NoteMark[] | undefined {
  if ((q.kind !== 'degree-seq' && q.kind !== 'name-seq') || answer === undefined || answer === null) return undefined;
  const sep = q.kind === 'degree-seq' ? '-' : '.';
  const want = String(q.answer).split(sep);
  const got = String(answer).split(sep);
  return want.map((w, i) => (got[i] === undefined || got[i] === '' ? 'missed' : got[i] === w ? 'ok' : 'wrong'));
}
