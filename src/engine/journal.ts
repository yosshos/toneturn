// Practice journal (AUDIT-5 §4 #3, G1, P16). Pure.
//
// One entry per local day, built from what was measured (the time ledger, the quality ledger, the results) plus
// what the player wrote: notes from the diary, the workout's off-app block ("What did you work on?") and the practice
// log, and a "what next" line. Searchable by note text and by what was played.

import { isLog } from './practiceLog';
import { summarize, type ItemDay, type JournalNote, type PracticeKind, type PracticeLedger } from './practiceTime';

export interface JournalSession {
  sessionId: string;
  lessonId: string;
  at: string;
  firstTry: number;
  total: number;
  ms?: number;
  note?: string;
  offApp: boolean;
}
export interface JournalItem {
  id: string;
  n: number;
  c: number;
  of: number;
  /** Best clean tempo that day, and the gain over the best before it (drills). */
  b?: number;
  gain?: number;
}
export interface JournalDay {
  day: string;
  ms: number;
  inApp: number;
  offApp: number;
  quality: number;
  byKind: Partial<Record<PracticeKind, number>>;
  notes: JournalNote[];
  items: JournalItem[];
  sessions: JournalSession[];
}

type ResultLike = { sessionId: string; lessonId: string; completedAt: string; firstTry: number; total: number; durationMs?: number; note?: string };

/** The best clean tempo an item reached before a day. */
const bestBefore = (rows: ItemDay[], day: string) => rows.filter((r) => r.d < day).reduce((a, r) => Math.max(a, r.b ?? 0), 0);

export function journalDays(l: PracticeLedger, history: ResultLike[], dayOf: (iso: string) => string): JournalDay[] {
  const days = new Map<string, JournalDay>();
  const get = (d: string): JournalDay => {
    let x = days.get(d);
    if (!x) {
      const s = summarize(l, d, d);
      x = { day: d, ms: s.ms, inApp: s.inApp, offApp: s.offApp, quality: s.quality, byKind: s.byKind, notes: [], items: [], sessions: [] };
      days.set(d, x);
    }
    return x;
  };
  for (const d of Object.keys(l.days)) get(d);
  for (const n of l.notes) get(n.day).notes.push(n);
  for (const [id, rows] of Object.entries(l.items))
    for (const r of rows) {
      const b0 = bestBefore(rows, r.d);
      get(r.d).items.push({ id, n: r.n, c: r.c, of: r.of, ...(r.b ? { b: r.b } : {}), ...(r.b && b0 > 0 && r.b > b0 ? { gain: r.b - b0 } : {}) });
    }
  for (const h of history) {
    const d = dayOf(h.completedAt);
    get(d).sessions.push({ sessionId: h.sessionId, lessonId: h.lessonId, at: h.completedAt, firstTry: h.firstTry, total: h.total, ...(h.durationMs ? { ms: h.durationMs } : {}), ...(h.note ? { note: h.note } : {}), offApp: isLog(h.lessonId) });
  }
  const out = [...days.values()].filter((d) => d.ms > 0 || d.notes.length || d.items.length || d.sessions.length);
  for (const d of out) {
    d.notes.sort((a, b) => a.at.localeCompare(b.at));
    d.items.sort((a, b) => b.n - a.n);
    d.sessions.sort((a, b) => a.at.localeCompare(b.at));
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
}

/** Days matching a search: note text, session notes, or the label of anything played (case-insensitive, any word). */
export function searchJournal(days: JournalDay[], q: string, label: (id: string) => string): JournalDay[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return days;
  const has = (s: string) => {
    const t = s.toLowerCase();
    return words.every((w) => t.includes(w));
  };
  return days.filter((d) => has([...d.notes.map((n) => n.text), ...d.sessions.map((s) => `${s.note ?? ''} ${label(`l:${s.lessonId}`)}`), ...d.items.map((i) => label(i.id)), d.day].join(' \n ')));
}

/** The player's latest "what next" line (shown at the top of the diary and before the next session). */
export const latestNext = (l: PracticeLedger): JournalNote | null => [...l.notes].reverse().find((n) => n.next) ?? null;
