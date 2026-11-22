// "Since the last lesson" (docs/SPEC-PROGRESS-CHARTS.md §3, §4.1): a date (the lesson day) and a table of what changed
// since, per area, with a short line each. Shown on the student's "Over time" tab and on the teacher's class page for
// one student — the same table.

import { useMemo, useState } from 'react';
import type { Snapshot } from '../engine/snapshot';
import { sinceLesson, sinceLine } from '../engine/sinceLesson';
import '../progress-time.css';

type Lang = 'he' | 'en';
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

export function SinceLesson({ snaps, lang, today, areaName, who }: { snaps: Record<string, Snapshot>; lang: Lang; today: string; areaName: (a: string) => string; /** The teacher's view: the student's name. */ who?: string }) {
  const he = lang === 'he';
  const first = useMemo(() => Object.keys(snaps).sort()[0] ?? today, [snaps, today]);
  const [from, setFrom] = useState(() => (addDays(today, -7) < first ? first : addDays(today, -7)));
  const s = useMemo(() => sinceLesson(snaps, from, today), [snaps, from, today]);
  return (
    <section className="pt-card since-card" aria-label={he ? 'מאז השיעור האחרון' : 'Since the last lesson'} data-since={from}>
      <div className="pt-card-head">
        <h3>{who ? `${who} · ` : ''}{he ? 'מאז השיעור האחרון' : 'Since the last lesson'}</h3>
        <label className="since-date">
          <span>{he ? 'יום השיעור' : 'Lesson day'}</span>
          <input type="date" value={from} min={first} max={today} onChange={(e) => e.target.value && setFrom(e.target.value)} dir="ltr" data-since-date="1" />
        </label>
      </div>
      <p className="pt-sub" data-since-sum={`${s.minutes}/${s.days}`}>
        {he ? `${s.minutes} דקות · ${s.days} ימי אימון` : `${s.minutes} minutes · ${s.days} practice days`}
      </p>
      {s.rows.length ? (
        <table className="pt-table since-table">
          <thead>
            <tr>
              <th>{he ? 'תחום' : 'Area'}</th>
              <th>{he ? 'סגורים' : 'Closed'}</th>
              <th>{he ? 'מה השתנה' : 'What changed'}</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.area} data-since-area={r.area}>
                <td>{areaName(r.area)}</td>
                <td dir="ltr">
                  {r.closedThen} → {r.closedNow}
                </td>
                <td>{sinceLine(r, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="pt-empty">{he ? 'עוד אין נתונים מהתקופה הזאת.' : 'No data from this period yet.'}</p>
      )}
    </section>
  );
}
