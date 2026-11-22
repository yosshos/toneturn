// The one sparkline beside a Practice place's title (docs/SPEC-PROGRESS-CHARTS.md §7 phase 3), read from the daily
// snapshots (snapshot.ts): Technique = items closed in the course; Licks = licks closed; Repertoire = minutes a day
// with pieces (songs, charts, scores); Improvise = minutes a day improvising. The last 30 days; hidden (null) with
// fewer than 3 days of data. Pure.

import type { Snapshot } from './snapshot';
import { parseBucket } from './practiceTime';
import type { CourseId } from './courses';

export type SparkPlace = 'technique' | 'licks' | 'repertoire' | 'improv';
export const SPARK_DAYS = 30;
export const SPARK_MIN_DAYS = 3;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function valueOf(s: Snapshot, place: SparkPlace, course: CourseId): number {
  if (place === 'licks') return s.vocab?.closed ?? 0;
  if (place === 'technique') return sum(Object.entries(s.status ?? {}).filter(([a]) => a.startsWith(`${course}:`)).map(([, v]) => v.closed ?? 0));
  const kinds = place === 'repertoire' ? ['song', 'chart', 'piece'] : ['improv'];
  return Math.round(
    sum(
      Object.entries(s.minutes ?? {})
        .filter(([b]) => {
          const p = parseBucket(b);
          return kinds.includes(p.kind) && (!p.course || p.course === course);
        })
        .map(([, m]) => m),
    ) * 10,
  ) / 10;
}

/** The place's series, oldest first, over the last `days` days that have a snapshot; null with fewer than 3 of them. */
export function placeSeries(snaps: Record<string, Snapshot>, place: SparkPlace, course: CourseId, today: string, days = SPARK_DAYS): number[] | null {
  const from = new Date(new Date(today + 'T00:00:00Z').getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const list = Object.values(snaps)
    .filter((s) => s.day >= from && s.day <= today)
    .sort((a, b) => a.day.localeCompare(b.day));
  if (list.length < SPARK_MIN_DAYS) return null;
  return list.map((s) => valueOf(s, place, course));
}

/** The line's words: "closed this month" (a level, the last value) or "minutes a day" (a rate, the total). */
export function sparkLabel(place: SparkPlace, series: number[], lang: 'en' | 'he'): string {
  const he = lang === 'he';
  if (place === 'technique' || place === 'licks') {
    const last = series[series.length - 1] ?? 0;
    const gain = last - (series[0] ?? 0);
    return he ? `${last} סגורים · ${gain >= 0 ? '+' : ''}${gain} בחודש` : `${last} closed · ${gain >= 0 ? '+' : ''}${gain} this month`;
  }
  const total = Math.round(sum(series));
  return he ? `${total} דק׳ בחודש` : `${total} min this month`;
}
