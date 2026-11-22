// The student's teacher phrases (SPEC-PHRASE-STUDIO §11.2–11.3, §13.6): fetch my assignments, keep the phrase ones on
// this device (so Today, the assignment page and Encore work offline), put each phrase into the lick book as an Encore
// phrase with the teacher's locked fields, and send one submission for every key passed at the target (queued first,
// never twice). App calls useTeacherPhrases once.

import { useEffect, useRef } from 'react';
import type { ItemState } from '../engine/drills/types';
import type { LickBook } from '../engine/licks';
import { decodePhraseRef, lickFromAssignment, teacherPhraseId, withAssignedPhrase, type PhraseAssignment, type Strictness, type Mark } from '../engine/encore/assign';
import { myAssignments, submitResult, type AssignItem } from '../cloud/teacher';
import { flushOutbox, loadOutbox, queuePassed } from '../storage/phraseOutbox';

/** One phrase assignment as kept on this device. */
export interface CachedPhraseAssign {
  id: string;
  phraseId: string;
  className: string;
  dueOn: string | null;
  strictness: Strictness;
  note: string | null;
  createdAt: string;
  a: PhraseAssignment;
  /** The teacher's latest word on it (mark / comment), newest first. */
  said: { at: string; comment: string | null; mark: Mark | null; score: number | null }[];
}

const KEY = 'tt.teacherPhrases.v1';
const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};
export function cachedTeacherPhrases(): CachedPhraseAssign[] {
  try {
    const raw = ls()?.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedPhraseAssign[]) : [];
  } catch {
    return [];
  }
}
const listeners = new Set<() => void>();
export function subscribeTeacherPhrases(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
function saveCache(list: CachedPhraseAssign[]) {
  try {
    ls()?.setItem(KEY, JSON.stringify(list));
  } catch {
    /* full */
  }
  listeners.forEach((f) => f());
}

/** The phrase assignments among my assignments, decoded (pure). */
export function phraseAssignsOf(items: readonly AssignItem[]): CachedPhraseAssign[] {
  const out: CachedPhraseAssign[] = [];
  for (const it of items) {
    if (it.kind !== 'phrase') continue;
    const a = decodePhraseRef(it.ref);
    if (!a) continue;
    out.push({
      id: it.id,
      phraseId: teacherPhraseId(it.id),
      className: it.className ?? '',
      dueOn: it.dueOn,
      strictness: it.strictness,
      note: it.note,
      createdAt: it.createdAt,
      a,
      said: it.submissions.filter((s) => s.comment || s.mark).map((s) => ({ at: s.createdAt, comment: s.comment, mark: s.mark, score: s.score })),
    });
  }
  return out;
}

/** The lick book with every cached teacher phrase in it (unchanged object when nothing is missing). */
export function bookWithTeacherPhrases(book: LickBook | undefined, list: readonly CachedPhraseAssign[], now = new Date().toISOString()): LickBook | undefined {
  let b = book;
  for (const c of list) {
    if ((b?.own ?? []).some((l) => l.id === c.phraseId)) continue;
    b = withAssignedPhrase(b, lickFromAssignment(c.a, c.id, c.a.teacher ?? c.className, c.createdAt || now));
  }
  return b;
}

/** Fetch now (the assignment page's refresh). */
export async function refreshTeacherPhrases(): Promise<CachedPhraseAssign[]> {
  const list = phraseAssignsOf(await myAssignments());
  saveCache(list);
  return list;
}

/** Keys of an assignment this device has sent. */
export const sentKeysOf = (assignmentId: string): number[] => loadOutbox().sent[assignmentId] ?? [];

export function useTeacherPhrases(o: { enabled: boolean; route: string; book: LickBook | undefined; items: Record<string, ItemState>; onBook: (b: LickBook) => void }) {
  const last = useRef(0);
  const bookRef = useRef(o.book);
  bookRef.current = o.book;
  // fetch on Home / Encore / the assignment page, at most every 30 seconds; install the phrases into the lick book
  useEffect(() => {
    if (!o.enabled || !['home', 'encore', 'licks', 'teach', 'classes', 'friends'].includes(o.route)) return;
    if (Date.now() - last.current < 30_000) return;
    last.current = Date.now();
    void refreshTeacherPhrases()
      .then((list) => {
        const b = bookWithTeacherPhrases(bookRef.current, list);
        if (b && b !== bookRef.current) o.onBook(b);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.enabled, o.route]);
  // whenever the device copy changes (a refresh from the assignment page, another tab): install what is missing
  useEffect(
    () =>
      subscribeTeacherPhrases(() => {
        const b = bookWithTeacherPhrases(bookRef.current, cachedTeacherPhrases());
        if (b && b !== bookRef.current) o.onBook(b);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // every change of the drill items: queue the newly passed keys, then send what is queued
  useEffect(() => {
    if (!o.book?.own?.some((l) => l.source?.kind === 'teacher')) return;
    queuePassed(o.book, o.items);
    if (!o.enabled) return;
    void flushOutbox((r) => submitResult(r.assignmentId, r.score, r.minutes, r.metrics)).then((n) => n && listeners.forEach((f) => f()));
  }, [o.enabled, o.book, o.items]);
}
