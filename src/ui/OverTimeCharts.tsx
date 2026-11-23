// More charts for progress over time (docs/SPEC-PROGRESS-CHARTS.md §2, §4, §5): a few series on one axis, the channel
// mix against its target, the planned split, the mode × function heat map, the class's spread (a median with its
// quartile band; a strip of dots), the class radar, the weekly ring and the practice calendar. The §0 rules hold
// throughout: one y-axis; at most 4 series with a legend and a name beside each line; colour follows the entity
// (areaColors.ts); never colour alone (names, numbers, ▲/▼); hover / touch tooltips; LTR islands for every chart;
// 2px lines, no glow, no gradients.

import { useRef, useState, type ReactNode } from 'react';
import type { Point } from '../engine/progressSeries';
import { intlTag } from '../i18n/translate';

type Lang = 'he' | 'en';
const fmtDay = (d: string, lang: Lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(intlTag(lang === 'he' ? 'he' : 'en', 'en-GB'), { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const pctOf = (v: number) => `${Math.round(v * 100)}%`;

export interface Series {
  id: string;
  name: string;
  color: string;
  pts: Point[];
}

/**
 * Up to 4 series on one axis (§0): a legend above, the name beside each line's end, a crosshair tooltip with every
 * series' value that day, an optional target line (dashed) and the grey class-median reference (same unit).
 */
export function MultiLine({ series, lang, fmt = (v) => String(Math.round(v)), target, lo, hi, refPts, refName }: { series: Series[]; lang: Lang; fmt?: (v: number) => string; target?: number; lo?: number; hi?: number; refPts?: Point[]; refName?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const ss = series.filter((s) => s.pts.length > 0).slice(0, 4);
  const days = [...new Set(ss.flatMap((s) => s.pts.map((p) => p.day)))].sort();
  if (days.length < 2) return <p className="pt-empty">{lang === 'he' ? 'עוד אין מספיק ימים' : 'Not enough days yet'}</p>;
  const w = 320, h = 140, pad = { l: 34, r: ss.length > 1 ? 70 : 12, t: 10, b: 20 };
  const di = new Map(days.map((d, i) => [d, i]));
  const ref2 = (refPts ?? []).filter((p) => di.has(p.day));
  const vs = ss.flatMap((s) => s.pts.map((p) => p.v)).concat(target !== undefined ? [target] : [], ref2.map((p) => p.v));
  const min = lo ?? Math.min(...vs), max = hi ?? Math.max(...vs, min + 1e-6);
  const x = (i: number) => pad.l + (i / (days.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const path = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(di.get(p.day)!).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const pick = (cx: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((cx - r.left) / r.width) * w;
    let b = 0;
    days.forEach((_, i) => Math.abs(x(i) - vx) < Math.abs(x(b) - vx) && (b = i));
    setHover(days[b]);
  };
  // names beside the line ends, nudged apart so they never overlap (≥ 11 px)
  const ends = ss.map((s) => ({ s, y: y(s.pts[s.pts.length - 1].v) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
  return (
    <div className="pt-chart" dir="ltr" data-multiline={ss.length}>
      {ss.length > 1 && (
        <div className="pt-legend">
          {ss.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
          {ref2.length > 1 && refName && (
            <span>
              <i className="pt-median-key" />
              {refName}
            </span>
          )}
        </div>
      )}
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ss.map((s) => `${s.name}: ${fmt(s.pts[s.pts.length - 1].v)}`).join(', ')} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
        <text x={pad.l - 4} y={y(max) + 4} className="tg-tick" textAnchor="end">{fmt(max)}</text>
        <text x={pad.l - 4} y={y(min) + 4} className="tg-tick" textAnchor="end">{fmt(min)}</text>
        {target !== undefined && <line x1={pad.l} x2={w - pad.r} y1={y(target)} y2={y(target)} className="pt-target" />}
        <text x={x(0)} y={h - 5} className="tg-tick">{fmtDay(days[0], lang)}</text>
        <text x={x(days.length - 1)} y={h - 5} className="tg-tick" textAnchor="end">{fmtDay(days[days.length - 1], lang)}</text>
        {ref2.length > 1 && <path d={path(ref2)} fill="none" className="pt-median" strokeWidth={2} strokeLinejoin="round" data-median-line="1" />}
        {ss.map((s) => (
          <path key={s.id} d={path(s.pts)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" data-series={s.id} />
        ))}
        {ss.length > 1 &&
          ends.map((e) => (
            <text key={e.s.id} x={w - pad.r + 4} y={e.y + 4} className="tg-tick pt-endname" fill={e.s.color}>
              {e.s.name.length > 11 ? `${e.s.name.slice(0, 10)}…` : e.s.name}
            </text>
          ))}
        {hover && <line x1={x(di.get(hover)!)} x2={x(di.get(hover)!)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
        {hover &&
          ss.map((s) => {
            const p = s.pts.find((q) => q.day === hover);
            return p ? <circle key={s.id} cx={x(di.get(hover)!)} cy={y(p.v)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={2} /> : null;
          })}
      </svg>
      {hover && (
        <div className="pt-hovertable" role="status">
          <b>{fmtDay(hover, lang)}</b>
          {ss.map((s) => {
            const p = s.pts.find((q) => q.day === hover);
            return p ? (
              <span key={s.id}>
                {s.name}: {fmt(p.v)}
              </span>
            ) : null;
          })}
          {(() => {
            const p = ref2.find((q) => q.day === hover);
            return p && refName ? (
              <span>
                {refName}: {fmt(p.v)}
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

/** Horizontal 100 % bars (one per row), each split into named parts, the share written in each part (≥ 8 %). */
export function ShareBars({ rows, parts, lang }: { rows: { id: string; label: string; v: Record<string, number> | null }[]; parts: { id: string; name: string; color: string }[]; lang: Lang }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="pt-chart pt-sharebars" dir="ltr">
      <div className="pt-legend">
        {parts.map((p) => (
          <span key={p.id}>
            <i style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className="pt-sbrow" data-share-row={r.id}>
          <span className="pt-sblabel">{r.label}</span>
          {r.v ? (
            <span className="pt-sbtrack" role="img" aria-label={`${r.label}: ${parts.map((p) => `${p.name} ${pctOf(r.v![p.id] ?? 0)}`).join(', ')}`}>
              {parts.map((p) => {
                const v = r.v![p.id] ?? 0;
                if (v <= 0) return null;
                return (
                  <i key={p.id} style={{ width: `${v * 100}%`, background: p.color }} onPointerEnter={() => setHover(`${r.id}|${p.id}`)} onPointerDown={() => setHover(`${r.id}|${p.id}`)} onPointerLeave={() => setHover(null)} title={`${p.name} ${pctOf(v)}`}>
                    {v >= 0.08 ? pctOf(v) : ''}
                  </i>
                );
              })}
            </span>
          ) : (
            <span className="pt-sbtrack pt-sbnone">{lang === 'he' ? 'עוד אין נתונים' : 'No data yet'}</span>
          )}
        </div>
      ))}
      {hover && (
        <div className="pt-hovertable" role="status">
          {(() => {
            const [rid, pid] = hover.split('|');
            const r = rows.find((x) => x.id === rid), p = parts.find((x) => x.id === pid);
            return r && p ? `${r.label} · ${p.name}: ${pctOf(r.v?.[pid] ?? 0)}` : null;
          })()}
        </div>
      )}
    </div>
  );
}

/** A heat grid (rows × columns, shade = 0..1 of one hue, empty cells grey), the value on hover and in each cell's title. */
export function HeatGrid({ rows, cols, cell, color, lang, label }: { rows: { id: string; name: string }[]; cols: { id: string; name: string }[]; cell: (r: string, c: string) => number | null; color: string; lang: Lang; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="pt-chart" dir="ltr">
      <div className="pt-grid" role="img" aria-label={label} style={{ gridTemplateColumns: `minmax(44px, auto) repeat(${cols.length}, minmax(18px, 1fr))` }}>
        <span />
        {cols.map((c) => (
          <span key={c.id} className="pt-gridcol" title={c.name}>
            {c.name}
          </span>
        ))}
        {rows.map((r) => (
          <GridRow key={r.id} r={r} cols={cols} cell={cell} color={color} onHover={setHover} />
        ))}
      </div>
      <div className="pt-hovertable" role="status">
        {hover ? hover : <small>{lang === 'he' ? 'כהה יותר = יותר צלילי צבע' : 'Darker = more colour notes'}</small>}
      </div>
    </div>
  );
}
function GridRow({ r, cols, cell, color, onHover }: { r: { id: string; name: string }; cols: { id: string; name: string }[]; cell: (r: string, c: string) => number | null; color: string; onHover: (s: string | null) => void }) {
  return (
    <>
      <span className="pt-gridrow">{r.name}</span>
      {cols.map((c) => {
        const v = cell(r.id, c.id);
        const t = `${r.name} · ${c.name}: ${v === null ? '–' : pctOf(v)}`;
        return <i key={c.id} className="pt-gridcell" title={t} data-cell={`${r.id}|${c.id}`} onPointerEnter={() => onHover(t)} onPointerDown={() => onHover(t)} style={{ background: v === null ? 'var(--line)' : `color-mix(in oklab, ${color} ${Math.round(12 + v * 88)}%, var(--card))` }} />;
      })}
    </>
  );
}

/**
 * One assignment across the class (§4.2): the class median line and the band from the lower to the upper quartile
 * (never 30 lines); students below the band at the end are named beside the chart.
 */
export function BandChart({ days, median, q1, q3, color, lang, outside, label, fmt = pctOf }: { days: string[]; median: number[]; q1: number[]; q3: number[]; color: string; lang: Lang; outside: string[]; label: string; fmt?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (days.length < 2) return <p className="pt-empty">{lang === 'he' ? 'עוד אין מספיק ימים' : 'Not enough days yet'}</p>;
  const w = 320, h = 120, pad = { l: 34, r: 10, t: 10, b: 20 };
  const x = (i: number) => pad.l + (i / (days.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - Math.max(0, Math.min(1, v)) * (h - pad.t - pad.b);
  const band = `${q3.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} ${[...q1].reverse().map((v, k) => `L${x(q1.length - 1 - k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} Z`;
  const pick = (cx: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((cx - r.left) / r.width) * w;
    let b = 0;
    days.forEach((_, i) => Math.abs(x(i) - vx) < Math.abs(x(b) - vx) && (b = i));
    setHover(b);
  };
  return (
    <div className="pt-chart" dir="ltr" data-band-chart={days.length}>
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${fmt(median[median.length - 1])}`} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
        <text x={pad.l - 4} y={y(1) + 4} className="tg-tick" textAnchor="end">100%</text>
        <text x={pad.l - 4} y={y(0) + 4} className="tg-tick" textAnchor="end">0</text>
        <path d={band} fill={color} opacity={0.16} data-quartile-band="1" />
        <path d={median.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <text x={x(0)} y={h - 5} className="tg-tick">{fmtDay(days[0], lang)}</text>
        <text x={x(days.length - 1)} y={h - 5} className="tg-tick" textAnchor="end">{fmtDay(days[days.length - 1], lang)}</text>
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
      </svg>
      <div className="pt-hovertable" role="status">
        {hover !== null ? (
          <>
            <b>{fmtDay(days[hover], lang)}</b>
            <span>
              {lang === 'he' ? 'חציון' : 'Median'} {fmt(median[hover])}
            </span>
            <span>
              {lang === 'he' ? 'רבעונים' : 'Quartiles'} {fmt(q1[hover])}–{fmt(q3[hover])}
            </span>
          </>
        ) : (
          <small>{lang === 'he' ? 'קו: החציון · רצועה: הרבעון התחתון עד העליון' : 'Line: the median · band: lower to upper quartile'}</small>
        )}
      </div>
      {outside.length > 0 && (
        <p className="pt-sub" data-band-outside={outside.length}>
          {lang === 'he' ? 'מתחת לרצועה: ' : 'Below the band: '}
          {outside.join(', ')}
        </p>
      )}
    </div>
  );
}

/** A strip of dots (§4.2): one dot per student on a 0–100 %+ scale, the name on hover / tap; a target line at 100 %. */
export function DotStrip({ dots, color, lang, label }: { dots: { id: string; name: string; v: number }[]; color: string; lang: Lang; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  if (!dots.length) return <p className="pt-empty">{lang === 'he' ? 'עוד אין הגשות' : 'No submissions yet'}</p>;
  const w = 320, h = 54, pad = { l: 12, r: 12 };
  const max = Math.max(1.2, ...dots.map((d) => d.v));
  const x = (v: number) => pad.l + (Math.max(0, v) / max) * (w - pad.l - pad.r);
  // dots at the same place stack upward
  const placed = [...dots].sort((a, b) => a.v - b.v).map((d, i, arr) => ({ d, row: arr.slice(0, i).filter((o) => Math.abs(x(o.v) - x(d.v)) < 9).length }));
  const hd = dots.find((d) => d.id === hover);
  return (
    <div className="pt-chart" dir="ltr" data-dot-strip={dots.length}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${dots.map((d) => `${d.name} ${pctOf(d.v)}`).join(', ')}`} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - 16} y2={h - 16} className="tg-axis" />
        <line x1={x(1)} x2={x(1)} y1={6} y2={h - 16} className="pt-target" />
        <text x={x(0)} y={h - 3} className="tg-tick">0</text>
        <text x={x(1)} y={h - 3} className="tg-tick" textAnchor="middle">100%</text>
        {placed.map(({ d, row }) => (
          <circle key={d.id} cx={x(d.v)} cy={h - 24 - row * 9} r={4} fill={color} stroke="var(--card)" strokeWidth={1.5} onPointerEnter={() => setHover(d.id)} onPointerDown={() => setHover(d.id)} data-dot={d.id}>
            <title>{`${d.name}: ${pctOf(d.v)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="pt-hovertable" role="status">
        {hd ? `${hd.name}: ${pctOf(hd.v)}` : <small>{lang === 'he' ? 'נקודה לכל תלמיד; הקו: היעד' : 'One dot per student; the line: the target'}</small>}
      </div>
    </div>
  );
}

/** A radar of up to 8 axes (0..1) beside a column of change per axis (▲/▼ with the number, never colour alone). */
export function RadarWithChange({ axes, color, lang, label }: { axes: { id: string; name: string; v: number; change: number | null }[]; color: string; lang: Lang; label: string }) {
  if (axes.length < 3) return <p className="pt-empty">{lang === 'he' ? 'עוד אין מספיק תחומים' : 'Not enough areas yet'}</p>;
  const R = 70, c = 90;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const;
  };
  const poly = axes.map((a, i) => pt(i, Math.max(0, Math.min(1, a.v))).join(',')).join(' ');
  return (
    <div className="pt-radar" data-class-radar={axes.length}>
      <svg viewBox="0 0 180 180" role="img" aria-label={`${label}: ${axes.map((a) => `${a.name} ${pctOf(a.v)}`).join(', ')}`} style={{ direction: 'ltr' }}>
        {[0.5, 1].map((r) => (
          <polygon key={r} points={axes.map((_, i) => pt(i, r).join(',')).join(' ')} fill="none" className="tg-axis" />
        ))}
        {axes.map((_, i) => (
          <line key={i} x1={c} y1={c} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} className="tg-axis" />
        ))}
        <polygon points={poly} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {axes.map((a, i) => {
          const [px, py] = pt(i, 1.18);
          return (
            <text key={a.id} x={px} y={py + 3} className="tg-tick" textAnchor={Math.abs(px - c) < 8 ? 'middle' : px > c ? 'start' : 'end'}>
              {a.name.length > 9 ? `${a.name.slice(0, 8)}…` : a.name}
            </text>
          );
        })}
      </svg>
      <table className="pt-table pt-change">
        <tbody>
          {axes.map((a) => (
            <tr key={a.id} data-change-row={a.id}>
              <td>{a.name}</td>
              <td dir="ltr">{pctOf(a.v)}</td>
              <td dir="ltr">{a.change === null ? '–' : a.change === 0 ? '=' : `${a.change > 0 ? '▲' : '▼'} ${Math.abs(Math.round(a.change * 100))}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The weekly ring (§2 "Today"): this week's minutes against last week's, ▲/▼ with the number beside it. */
export function WeeklyRing({ now, prev, lang, label, children }: { now: number; prev: number; lang: Lang; label: string; children?: ReactNode }) {
  const share = prev > 0 ? Math.min(1, now / prev) : now > 0 ? 1 : 0;
  const r = 15, C = 2 * Math.PI * r;
  const d = now - prev;
  return (
    <span className="wk-ring" data-weekly-ring={`${now}/${prev}`}>
      <svg viewBox="0 0 40 40" width={40} height={40} role="img" aria-label={`${label}: ${now} (${lang === 'he' ? 'שבוע שעבר' : 'last week'} ${prev})`}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
        <circle cx={20} cy={20} r={r} fill="none" stroke="var(--accent, #6250d6)" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${share * C} ${C}`} transform="rotate(-90 20 20)" />
      </svg>
      <span className="wk-ring-txt">
        {children}
        <small dir="ltr">{d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`}</small>
      </span>
    </span>
  );
}

/** The practice calendar (chart 10): the last weeks as columns of 7 days, shade = minutes (one hue), names on hover. */
export function PracticeCalendar({ days, color, lang, weeks = 12, today }: { days: Record<string, number>; color: string; lang: Lang; weeks?: number; today: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const end = new Date(today + 'T00:00:00Z');
  const start = new Date(end.getTime() - ((end.getUTCDay() + 6) % 7) * 86400000 - (weeks - 1) * 7 * 86400000);
  const cols: string[][] = [];
  for (let k = 0; k < weeks; k++) cols.push(Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + (k * 7 + i) * 86400000).toISOString().slice(0, 10)));
  const max = Math.max(1, ...Object.values(days));
  const n = Object.values(days).filter((m) => m > 0).length;
  return (
    <div className="pt-chart" dir="ltr" data-calendar={n}>
      <div className="pt-cal" role="img" aria-label={lang === 'he' ? `${n} ימי אימון` : `${n} practice days`}>
        {cols.map((c, k) => (
          <span key={k} className="pt-calcol">
            {c.map((d) => {
              const m = days[d] ?? 0;
              const fut = d > today;
              const t = `${fmtDay(d, lang)}: ${Math.round(m)} ${lang === 'he' ? 'דק׳' : 'min'}`;
              return <i key={d} title={t} onPointerEnter={() => setHover(t)} onPointerDown={() => setHover(t)} style={{ background: fut ? 'transparent' : m > 0 ? `color-mix(in oklab, ${color} ${Math.round(25 + (m / max) * 75)}%, var(--card))` : 'var(--line)' }} />;
            })}
          </span>
        ))}
      </div>
      <div className="pt-hovertable" role="status">
        {hover ?? <small>{lang === 'he' ? `${n} ימי אימון` : `${n} practice days`}</small>}
      </div>
    </div>
  );
}
