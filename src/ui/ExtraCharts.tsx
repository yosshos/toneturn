// Phase 8 charts (docs/SPEC-PROGRESS-CHARTS.md §0, §3, §4.1; BUILD-PLAN-2026-11 phase 8):
// - the burn-up per assignment: items closed out of the assignment's items, against a due-date marker;
// - the teacher's alerts with their small charts (a minutes line; a tempo line with the ceiling);
// - measured time and the projection (Progress page only, D5): how long until the keys are closed at the measured pace.
// The §0 rules: one y-axis; colour follows the entity (areaColors.ts); names beside the marks, a legend for two series;
// touch / hover tooltips; the time axis reads left → right (an LTR island); thin lines, no glow, no gradients.

import { useMemo, useRef, useState } from 'react';
import { areaColor, NEUTRAL } from '../engine/areaColors';
import type { Burnup, Alert } from '../engine/burnup';
import type { Projection } from '../engine/projection';
import { spanWords } from '../engine/projection';
import { Card, SmallLine, useDark } from './ProgressOverTime';
import { kName } from './encore/bits';

type Lang = 'he' | 'en';
const fmtDay = (d: string, lang: Lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The hue of an assignment by its kind (a technique level is technique, a chart or a phrase is improvisation …). */
export function assignHue(kind: string, dark = false): string {
  const area = kind === 'drill' ? 'technique' : kind === 'chart' || kind === 'phrase' ? 'improv' : kind === 'piece' ? 'repertoire' : 'byear';
  return areaColor(area, dark ? 'dark' : 'light');
}

/** One assignment's burn-up: the closed items over the days (one series), the total as a dashed line, the due day marked. */
export function BurnUpChart({ b, color, lang, title }: { b: Burnup; color: string; lang: Lang; title: string }) {
  const he = lang === 'he';
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const pts = b.pts;
  const w = 300, h = 96, pad = { l: 26, r: 10, t: 10, b: 18 };
  const n = Math.max(1, pts.length - 1);
  const x = (i: number) => pad.l + (i / n) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - (v / Math.max(1, b.total)) * (h - pad.t - pad.b);
  const dueI = b.due ? pts.findIndex((p) => p.day === b.due) : -1;
  // a step line: an item closed on a day lifts the line on that day
  const d = pts.map((p, i) => (i ? `L${x(i).toFixed(1)} ${y(pts[i - 1].v).toFixed(1)} L${x(i).toFixed(1)} ${y(p.v).toFixed(1)}` : `M${x(0).toFixed(1)} ${y(p.v).toFixed(1)}`)).join(' ');
  const pick = (cx: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !pts.length) return;
    const vx = ((cx - r.left) / r.width) * w;
    let best = 0;
    pts.forEach((_, i) => Math.abs(x(i) - vx) < Math.abs(x(best) - vx) && (best = i));
    setHover(best);
  };
  const hp = hover !== null ? pts[hover] : null;
  const label = he ? `${title}: ${b.done} מתוך ${b.total}${b.due ? `, עד ${fmtDay(b.due, lang)}` : ''}` : `${title}: ${b.done} of ${b.total}${b.due ? `, due ${fmtDay(b.due, lang)}` : ''}`;
  return (
    <div className="pt-chart bu-chart" dir="ltr" data-burnup={`${b.done}/${b.total}`}>
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
        <line x1={pad.l} x2={w - pad.r} y1={y(b.total)} y2={y(b.total)} className="pt-target" />
        <text x={pad.l - 4} y={y(b.total) + 4} className="tg-tick" textAnchor="end">{b.total}</text>
        <text x={pad.l - 4} y={y(0) + 4} className="tg-tick" textAnchor="end">0</text>
        {dueI >= 0 && (
          <g data-burnup-due={b.due}>
            <line x1={x(dueI)} x2={x(dueI)} y1={pad.t} y2={h - pad.b} className="bu-due" />
            <text x={x(dueI)} y={pad.t - 1} className="tg-tick" textAnchor={dueI > n / 2 ? 'end' : 'start'}>{he ? 'עד' : 'due'}</text>
          </g>
        )}
        <text x={x(0)} y={h - 4} className="tg-tick">{fmtDay(b.start, lang)}</text>
        <text x={x(n)} y={h - 4} className="tg-tick" textAnchor="end">{fmtDay(b.end, lang)}</text>
        {pts.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
        <circle cx={x(hover ?? n)} cy={y((hp ?? pts[pts.length - 1] ?? { v: 0 }).v)} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
      </svg>
      {hp && hover !== null && (
        <div className="tg-tip" style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(hp.v) / h) * 100}%` }} role="status">
          <b>
            {hp.v}/{b.total}
          </b>
          <small>{fmtDay(hp.day, lang)}</small>
        </div>
      )}
    </div>
  );
}

/** A burn-up with its title line (the student's "From the teacher" list, the teacher's student view). */
export function BurnUpRow({ b, kind, title, lang }: { b: Burnup; kind: string; title: string; lang: Lang }) {
  const dark = useDark();
  const he = lang === 'he';
  return (
    <div className="bu-row" data-burnup-row={kind}>
      <span className="bu-name">
        <i style={{ background: assignHue(kind, dark) }} />
        {title}
        <small dir="ltr">
          {b.done}/{b.total}
        </small>
        {b.due && <small>{he ? `עד ${fmtDay(b.due, lang)}` : `due ${fmtDay(b.due, lang)}`}</small>}
      </span>
      <BurnUpChart b={b} color={assignHue(kind, dark)} lang={lang} title={title} />
    </div>
  );
}

/** The teacher's alerts for one student, each with its small chart (§4.1). */
export function AlertCards({ alerts, lang, who, itemName = (id) => id }: { alerts: Alert[]; lang: Lang; who?: string; itemName?: (id: string) => string }) {
  const dark = useDark();
  const he = lang === 'he';
  if (!alerts.length) return null;
  return (
    <Card lang={lang} title={`${who ? `${who} · ` : ''}${he ? 'דורש תשומת לב' : 'Needs attention'}`}>
      <div className="pt-multiples" data-alerts={alerts.length}>
        {alerts.map((a, i) =>
          a.kind === 'few-days' ? (
            <div key={i} className="pt-multiple" data-alert="few-days">
              <span className="pt-mname">
                <i style={{ background: areaColor('time', dark ? 'dark' : 'light') }} />
                {he ? `התאמנ/ה ${a.days} ימים מתוך ${a.of}` : `Practised ${a.days} days out of ${a.of}`}
              </span>
              <SmallLine pts={a.pts} color={areaColor('time', dark ? 'dark' : 'light')} name={he ? 'דקות ביום' : 'Minutes a day'} lang={lang} lo={0} />
            </div>
          ) : (
            <div key={i} className="pt-multiple" data-alert="stuck">
              <span className="pt-mname">
                <i style={{ background: areaColor(a.item.area, dark ? 'dark' : 'light') }} />
                {he ? `תקוע/ה בגבול 3 אימונים: ${itemName(a.item.id)}` : `Stuck at the limit for 3 sessions: ${itemName(a.item.id)}`}
              </span>
              <SmallLine pts={a.item.pts.map((p) => ({ day: p.day, v: p.bpm }))} color={areaColor(a.item.area, dark ? 'dark' : 'light')} name={itemName(a.item.id)} lang={lang} fmt={(v) => `♩${Math.round(v)}`} target={a.item.ceiling} />
              <small className="pt-sub">{he ? `הקו המקווקו: התקרה ♩${a.item.ceiling} · היעד ♩${a.item.target}` : `Dashed line: the ceiling ♩${a.item.ceiling} · target ♩${a.item.target}`}</small>
            </div>
          ),
        )}
      </div>
    </Card>
  );
}

/** Measured time and the projection (D5: the Progress page only). */
export function ProjectionCard({ p, lang }: { p: Projection; lang: Lang }) {
  const he = lang === 'he';
  const dark = useDark();
  const groups = [...new Set(p.keys.map((k) => k.group))];
  const [group, setGroup] = useState<'major' | 'minor'>('major');
  const g = groups.includes(group) ? group : (groups[0] ?? 'major');
  const rows = useMemo(() => p.keys.filter((k) => k.group === g).sort((a, b) => a.root - b.root), [p.keys, g]);
  const [hover, setHover] = useState<number | null>(null);
  const hrs = (m: number) => (m < 90 ? (he ? `${Math.round(m)} דק׳` : `${Math.round(m)} min`) : he ? `${Math.round(m / 6) / 10} שע׳` : `${Math.round(m / 6) / 10} h`);
  const doneC = areaColor('technique', dark ? 'dark' : 'light');
  const leftC = NEUTRAL[dark ? 'dark' : 'light'];
  const max = Math.max(1, ...rows.map((r) => r.measured + r.left));
  const pace = p.pace;
  const paceLine = pace
    ? he
      ? `נמדד: ${Math.round(pace.perDay)} דקות ביום, מהן ${Math.round(pace.techPerDay)} טכניקה (${pace.days} הימים האחרונים)`
      : `Measured: ${Math.round(pace.perDay)} min a day, ${Math.round(pace.techPerDay)} of them technique (the last ${pace.days} days)`
    : he
      ? 'עוד אין דקות מדודות.'
      : 'No measured minutes yet.';
  const keyLabel = (r: { root: number; group: string }) => kName(r.root, r.group === 'minor');
  return (
    <Card
      lang={lang}
      title={he ? 'כמה זמן עד שהסולמות נסגרים' : 'How long until the keys are closed'}
      sub={paceLine}
      table={rows.map((r) => [keyLabel(r), he ? `נמדד ${hrs(r.measured)} · נשאר ${hrs(r.left)} · ${r.closed}/${r.cells}` : `measured ${hrs(r.measured)} · left ${hrs(r.left)} · ${r.closed}/${r.cells}`])}
    >
      <div className="pj-lines" data-projection={p.all.days ?? 'none'}>
        <p>
          {he ? `כל התרגילים בכל הסולמות ברמה שלכם: סגורים ${p.all.closed} מתוך ${p.all.cells} · נשארו ${hrs(p.all.left)}` : `Every exercise in every key at your level: ${p.all.closed} of ${p.all.cells} closed · ${hrs(p.all.left)} left`}
          {p.all.days !== null ? (he ? ` · בקצב שלכם: כ־${spanWords(p.all.days, 'he')}` : ` · at your pace: about ${spanWords(p.all.days, 'en')}`) : ''}
        </p>
        {p.week && (
          <p data-projection-week={p.week.root}>
            {he ? 'סולם השבוע ' : 'The key of the week, '}
            <bdi dir="ltr">{keyLabel(p.week)}</bdi>
            {he ? `: נשארו ${hrs(p.week.left)}` : `: ${hrs(p.week.left)} left`}
            {p.week.days !== null ? (he ? ` · כ־${spanWords(p.week.days, 'he')}` : ` · about ${spanWords(p.week.days, 'en')}`) : ''}
          </p>
        )}
        {p.all.days === null && <p className="pt-sub">{he ? 'התחזית מופיעה אחרי שלושה ימי טכניקה לפחות.' : 'The projection appears after at least three days with technique.'}</p>}
      </div>
      {groups.length > 1 && (
        <div className="chips" role="radiogroup" aria-label={he ? 'מז׳ור או מינור' : 'Major or minor'}>
          {(['major', 'minor'] as const).filter((x) => groups.includes(x)).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={g === x} className={`chip ${g === x ? 'on' : ''}`} onClick={() => setGroup(x)}>
              {x === 'major' ? (he ? 'מז׳ור' : 'Major') : he ? 'מינור' : 'Minor'}
            </button>
          ))}
        </div>
      )}
      <div className="pt-legend">
        <span>
          <i style={{ background: doneC }} />
          {he ? 'נמדד עד עכשיו' : 'Measured so far'}
        </span>
        <span>
          <i style={{ background: leftC }} />
          {he ? 'נשאר (הערכה)' : 'Left (estimate)'}
        </span>
      </div>
      <div className="pj-bars" dir="ltr" role="img" aria-label={he ? 'זמן לפי סולם' : 'Time per key'} onPointerLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <div key={`${r.group}-${r.root}`} className="pj-row" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} data-pj-key={r.root}>
            <span className="pj-key">{keyLabel(r)}</span>
            <span className="pj-track">
              {r.measured > 0 && <i style={{ width: `${(r.measured / max) * 100}%`, background: doneC }} />}
              {r.left > 0 && <i style={{ width: `${(r.left / max) * 100}%`, background: leftC }} />}
            </span>
            <span className="pj-n">{r.closed}/{r.cells}</span>
          </div>
        ))}
      </div>
      {hover !== null && rows[hover] && (
        <div className="pt-hovertable" role="status">
          <b dir="ltr">{keyLabel(rows[hover])}</b>
          <span>{he ? `נמדד ${hrs(rows[hover].measured)}` : `measured ${hrs(rows[hover].measured)}`}</span>
          <span>{he ? `נשאר ${hrs(rows[hover].left)}` : `left ${hrs(rows[hover].left)}`}</span>
          <span>{he ? `סגורים ${rows[hover].closed}/${rows[hover].cells}` : `closed ${rows[hover].closed}/${rows[hover].cells}`}</span>
        </div>
      )}
    </Card>
  );
}
