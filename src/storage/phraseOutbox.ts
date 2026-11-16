// The student's side of a teacher phrase assignment (SPEC-PHRASE-STUDIO §11.3, §13.6): each key passed at the target
// becomes one submission. Submissions queue on this device first (never lost offline, never sent twice) and are sent
// when signed in and online — like the results queue. The queue holds only small rows (key, score, metrics ≈ 200 B).

import type { ItemState } from '../engine/drills/types';
import type { LickBook, LickInstrument } from '../engine/licks';
import { assignmentIdOf, isTeacherPhrase, pendingKeySubmissions, phraseInstOf, type KeySubmission } from '../engine/encore/assign';
import { phrasesOf } from '../engine/encore/connect';

export interface OutboxRow {
  id: string;
  assignmentId: string;
  key: number;
  score: number;
  minutes: number;
  metrics: KeySubmission['metrics'];
  at: string;
  tries?: number;
}
export interface OutboxState {
  /** Keys already sent, per assignment. */
  sent: Record<string, number[]>;
  queue: OutboxRow[];
}
export const emptyOutbox = (): OutboxState => ({ sent: {}, queue: [] });

/** Queue the passed-but-unsent keys of every teacher phrase in the book. Pure: returns the new state and the new rows. */
export function enqueuePassed(state: OutboxState, book: LickBook | undefined, items: Record<string, ItemState>, now: string, inst?: LickInstrument, minutes: (assignmentId: string) => number = () => 0): { state: OutboxState; added: OutboxRow[] } {
  const added: OutboxRow[] = [];
  for (const l of phrasesOf(book).filter(isTeacherPhrase)) {
    const aid = assignmentIdOf(l)!;
    const known = [...(state.sent[aid] ?? []), ...state.queue.filter((q) => q.assignmentId === aid).map((q) => q.key)];
    // each assignment on its own instrument (the teacher picks it; the old piano-only ones read piano)
    for (const s of pendingKeySubmissions(l, items, known, inst ?? phraseInstOf(l))) {
      added.push({ id: `${aid}:${s.key}`, assignmentId: aid, key: s.key, score: s.score, minutes: Math.round(minutes(aid)), metrics: s.metrics, at: now });
    }
  }
  return { state: added.length ? { ...state, queue: [...state.queue, ...added] } : state, added };
}

/** A row went through: it leaves the queue and its key counts as sent. */
export function markSent(state: OutboxState, id: string): OutboxState {
  const row = state.queue.find((q) => q.id === id);
  if (!row) return state;
  const sent = [...new Set([...(state.sent[row.assignmentId] ?? []), row.key])].sort((a, b) => a - b);
  return { sent: { ...state.sent, [row.assignmentId]: sent }, queue: state.queue.filter((q) => q.id !== id) };
}
/** A send failed: keep it (a refused assignment — gone from the class — is dropped after 5 tries). */
export function markFailed(state: OutboxState, id: string): OutboxState {
  return { ...state, queue: state.queue.map((q) => (q.id === id ? { ...q, tries: (q.tries ?? 0) + 1 } : q)).filter((q) => (q.tries ?? 0) < 5) };
}

// ───────────────────────────── device copy ─────────────────────────────

const KEY = 'tt.phraseOutbox.v1';
const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};
export function loadOutbox(): OutboxState {
  try {
    const raw = ls()?.getItem(KEY);
    if (!raw) return emptyOutbox();
    const o = JSON.parse(raw) as OutboxState;
    return { sent: o.sent ?? {}, queue: Array.isArray(o.queue) ? o.queue : [] };
  } catch {
    return emptyOutbox();
  }
}
export function saveOutbox(s: OutboxState) {
  try {
    ls()?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* full or private: the queue is rebuilt from the items next time */
  }
}

let flushing: Promise<number> | null = null;
/** Send the queue in order; stops at the first failure (offline). Returns how many went. */
export function flushOutbox(send: (r: OutboxRow) => Promise<unknown>): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    let n = 0;
    let s = loadOutbox();
    for (const r of [...s.queue]) {
      try {
        await send(r);
        s = markSent(s, r.id);
        n++;
        saveOutbox(s);
      } catch {
        s = markFailed(s, r.id);
        saveOutbox(s);
        break;
      }
    }
    return n;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Queue what passed (device copy) and return the rows added. */
export function queuePassed(book: LickBook | undefined, items: Record<string, ItemState>, inst?: LickInstrument, now = new Date().toISOString()): OutboxRow[] {
  const r = enqueuePassed(loadOutbox(), book, items, now, inst);
  if (r.added.length) saveOutbox(r.state);
  return r.added;
}
