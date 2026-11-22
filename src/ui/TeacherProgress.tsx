// The teacher's progress charts (docs/SPEC-PROGRESS-CHARTS.md §4; owner 2026-11-22): small cards per student (minutes
// and closed over 4 weeks, sorted by who needs attention first), a students × weeks heat map, and the switch that
// shows students the anonymous class median. Read from the synced daily snapshots (cloud/snapshots.ts).

import { useMemo, useState } from 'react';
import type { Snapshot } from '../engine/snapshot';
import { areaColor } from '../engine/areaColors';
import '../progress-time.css';

type Lang = 'he' | 'en';
export interface StudentSnaps {
  id: string;
  name: string;
  snaps: Record<string, Snapshot>;
}

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const weekOf = (day: string) => {
  const d = new Date(day + 'T00:00:00Z');
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
};
const mins = (s: Snapshot) => Object.values(s.minutes).reduce((a, b) => a + b, 0);
const closed = (s: Snapshot) => Object.values(s.status).reduce((n, st) => n + (st.closed ?? 0), 0);

/** Four weeks of a student: minutes per week, closed at each week's end, practice days in the last 14, and a need score. */
export function studentSummary(st: StudentSnaps, today: string) {
  const days = Object.values(st.snaps).filter((s) => s.day > addDays(today, -28) && s.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  const weeks = [3, 2, 1, 0].map((k) => weekOf(addDays(today, -7 * k)));
  const minutes = weeks.map((w) => Math.round(days.filter((s) => weekOf(s.day) === w).reduce((n, s) => n + mins(s), 0)));
  const closedAt = weeks.map((w) => {
    const inW = days.filter((s) => weekOf(s.day) <= w);
    return inW.length ? closed(inW[inW.length - 1]) : 0;
  });
  const practised14 = days.filter((s) => s.day > addDays(today, -14) && s.practised).length;
  const last = days.filter((s) => s.practised).at(-1)?.day ?? null;
  const moved = closedAt[3] - closedAt[0];
  // who needs attention first: few practice days, then nothing closing
  const need = (practised14 < 3 ? 2 : 0) + (moved <= 0 ? 1 : 0);
  return { weeks, minutes, closedAt, practised14, last, moved, need };
}

function Spark({ vals, color, label }: { vals: number[]; color: string; label: string }) {
  const w = 96, h = 28;
  const max = Math.max(1, ...vals);
  const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * (w - 4) + 2},${h - 3 - (v / max) * (h - 6)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`${label}: ${vals.join(', ')}`} style={{ direction: 'ltr' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ClassProgress({ students, lang, today, onOpenStudent }: { students: StudentSnaps[]; lang: Lang; today: string; onOpenStudent?: (id: string) => void }) {
  const he = lang === 'he';
  const rows = useMemo(() => students.map((s) => ({ s, sum: studentSummary(s, today) })).sort((a, b) => b.sum.need - a.sum.need || a.sum.practised14 - b.sum.practised14), [students, today]);
  const [metric, setMetric] = useState<'minutes' | 'closed'>('minutes');
  if (!students.length) return <p className="pt-empty">{he ? 'עוד אין נתונים מהתלמידים.' : 'No data from the students yet.'}</p>;
  const weeks = rows[0].sum.weeks;
  const val = (r: (typeof rows)[number], i: number) => (metric === 'minutes' ? r.sum.minutes[i] : r.sum.closedAt[i] - (i ? r.sum.closedAt[i - 1] : r.sum.closedAt[0]));
  const max = Math.max(1, ...rows.flatMap((r) => weeks.map((_, i) => val(r, i))));
  return (
    <div className="pt-wrap" data-class-progress={students.length}>
      <section className="pt-card" aria-label={he ? 'התלמידים' : 'Students'}>
        <div className="pt-card-head">
          <h3>{he ? 'התלמידים, 4 שבועות' : 'Students, 4 weeks'}</h3>
        </div>
        <div className="tp-cards">
          {rows.map(({ s, sum }) => (
            <button key={s.id} type="button" className={`tp-card ${sum.need >= 2 ? 'need' : ''}`} onClick={() => onOpenStudent?.(s.id)} data-student={s.id}>
              <b>{s.name}</b>
              <span className="tp-sparks">
                <Spark vals={sum.minutes} color={areaColor('time')} label={he ? 'דקות' : 'Minutes'} />
                <Spark vals={sum.closedAt} color={areaColor('technique')} label={he ? 'סגורים' : 'Closed'} />
              </span>
              <small>
                {he ? `${sum.practised14} ימי אימון מתוך 14 · ${sum.moved >= 0 ? '+' : ''}${sum.moved} נסגרו` : `${sum.practised14} practice days of 14 · ${sum.moved >= 0 ? '+' : ''}${sum.moved} closed`}
              </small>
            </button>
          ))}
        </div>
      </section>
      <section className="pt-card" aria-label={he ? 'תלמידים מול שבועות' : 'Students by week'}>
        <div className="pt-card-head">
          <h3>{he ? 'תלמידים מול שבועות' : 'Students by week'}</h3>
          <div className="chips" role="radiogroup">
            <button type="button" role="radio" aria-checked={metric === 'minutes'} className={`chip ${metric === 'minutes' ? 'on' : ''}`} onClick={() => setMetric('minutes')}>
              {he ? 'דקות' : 'Minutes'}
            </button>
            <button type="button" role="radio" aria-checked={metric === 'closed'} className={`chip ${metric === 'closed' ? 'on' : ''}`} onClick={() => setMetric('closed')}>
              {he ? 'נסגרו' : 'Closed'}
            </button>
          </div>
        </div>
        <table className="pt-table tp-heat">
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id}>
                <td>{r.s.name}</td>
                {weeks.map((w, i) => {
                  const v = val(r, i);
                  return (
                    <td key={w} title={`${r.s.name} · ${w} · ${v}`} style={{ background: `color-mix(in oklab, ${areaColor(metric === 'minutes' ? 'time' : 'technique')} ${Math.round(8 + (v / max) * 80)}%, var(--card))` }} dir="ltr">
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** The class setting (owner 2026-11-22): show students the anonymous class median, default off. */
export function MedianSwitch({ on, lang, onChange }: { on: boolean; lang: Lang; onChange: (on: boolean) => void }) {
  const he = lang === 'he';
  return (
    <label className="tp-switch" data-median-switch={on ? 'on' : 'off'}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>{he ? 'להציג לתלמידים את חציון הכיתה (בלי שמות)' : 'Show students the class median (no names)'}</span>
    </label>
  );
}
