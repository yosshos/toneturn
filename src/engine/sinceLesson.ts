// "Since the last lesson" (docs/SPEC-PROGRESS-CHARTS.md §3, §4.1): pick a date (the lesson day) and see what changed
// since, per area — items closed, the tempo index, minutes — from the daily snapshots. The student and the teacher see
// the same table. Pure.

import type { Snapshot } from './snapshot';

export interface SinceRow {
  area: string;
  closedThen: number;
  closedNow: number;
  /** The tempo index (share of target) on the lesson day and now; null where the area had none. */
  tempoThen: number | null;
  tempoNow: number | null;
}
export interface Since {
  from: string;
  to: string;
  rows: SinceRow[];
  minutes: number;
  days: number;
}

const closedIn = (s: Snapshot | undefined, area: string) => s?.status[area]?.closed ?? 0;

/** The snapshot on `day` or the last one before it (the state as the lesson left it). */
function at(sorted: Snapshot[], day: string): Snapshot | undefined {
  let best: Snapshot | undefined;
  for (const s of sorted) if (s.day <= day) best = s;
  return best;
}

/** What changed from the lesson day (exclusive) to `today` (inclusive), per area. */
export function sinceLesson(all: Record<string, Snapshot>, from: string, today: string): Since {
  const sorted = Object.values(all).sort((a, b) => a.day.localeCompare(b.day));
  const then = at(sorted, from);
  const now = at(sorted, today);
  const after = sorted.filter((s) => s.day > from && s.day <= today);
  const areas = [...new Set([...Object.keys(now?.status ?? {}), ...Object.keys(then?.status ?? {}), ...Object.keys(now?.tempo ?? {})])].sort();
  const rows = areas
    .map((area) => ({ area, closedThen: closedIn(then, area), closedNow: closedIn(now, area), tempoThen: then?.tempo[area] ?? null, tempoNow: now?.tempo[area] ?? null }))
    .filter((r) => r.closedNow || r.closedThen || r.tempoNow !== null);
  const minutes = Math.round(after.reduce((n, s) => n + Object.values(s.minutes).reduce((a, b) => a + b, 0), 0));
  return { from, to: today, rows, minutes, days: after.filter((s) => s.practised).length };
}

/** One short line per area: "+3 closed · tempo 62% → 70%" (only real changes). */
export function sinceLine(r: SinceRow, lang: 'he' | 'en'): string {
  const parts: string[] = [];
  const d = r.closedNow - r.closedThen;
  if (d) parts.push(lang === 'he' ? `${d > 0 ? '+' : ''}${d} נסגרו` : `${d > 0 ? '+' : ''}${d} closed`);
  if (r.tempoThen !== null && r.tempoNow !== null && Math.abs(r.tempoNow - r.tempoThen) >= 0.01) parts.push(lang === 'he' ? `טמפו מ־${Math.round(r.tempoThen * 100)}% ל־${Math.round(r.tempoNow * 100)}%` : `tempo ${Math.round(r.tempoThen * 100)}% → ${Math.round(r.tempoNow * 100)}%`);
  return parts.length ? parts.join(' · ') : lang === 'he' ? 'בלי שינוי' : 'No change';
}
