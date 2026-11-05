// Skill trends: is each skill going up or down over time? Small multiples (one per measured skill)
// plus a detail chart for the selected skill with level bands, hover / touch tooltip and a table view.
// One series per chart (no legend: the title names it); change shown as ▲/▼ + number, never colour alone.

import { useMemo, useRef, useState } from 'react';
import type { SkillId } from '../engine/lesson';
import { band, ratingHistory, trendDelta, type RatingEvent, type TrendPoint } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { localDay } from '../storage/progress';

const dayOfLocal = (iso: string) => localDay(new Date(iso));

function fmtDay(day: string, lang: 'he' | 'en') {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

function Delta({ d, t }: { d: number | null; t: Strings }) {
  if (d === null) return <span className="trend-delta flat">{t.trendNew}</span>;
  if (d === 0) return <span className="trend-delta flat">± 0</span>;
  return (
    <span className={`trend-delta ${d > 0 ? 'up' : 'down'}`}>
      <span aria-hidden="true">{d > 0 ? '▲' : '▼'}</span> {d > 0 ? '+' : '−'}
      {Math.abs(d)}
      <span className="sr-only"> {d > 0 ? t.trendUp : t.trendDown}</span>
    </span>
  );
}

/** Scales shared by the sparkline and the detail chart. */
function scales(pts: TrendPoint[], w: number, h: number, pad: { l: number; r: number; t: number; b: number }) {
  const rs = pts.map((p) => p.r);
  const lo = Math.min(800, ...rs) - 20;
  const hi = Math.max(1400, ...rs) + 20;
  const x = (i: number) => (pts.length === 1 ? pad.l + (w - pad.l - pad.r) / 2 : pad.l + (i * (w - pad.l - pad.r)) / (pts.length - 1));
  const y = (r: number) => pad.t + ((hi - r) * (h - pad.t - pad.b)) / (hi - lo);
  return { x, y, lo, hi };
}

function Spark({ pts }: { pts: TrendPoint[] }) {
  const w = 120;
  const h = 40;
  const { x, y } = scales(pts, w, h, { l: 4, r: 6, t: 6, b: 6 });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.r).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${h - 6} L${x(0).toFixed(1)} ${h - 6} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {pts.length > 1 && <path d={area} className="spark-area" />}
      {pts.length > 1 && <path d={line} className="spark-line" vectorEffect="non-scaling-stroke" />}
      <circle cx={x(pts.length - 1)} cy={y(last.r)} r="3.5" className="spark-dot" />
    </svg>
  );
}

export function TrendTiles({ t, events, skills, sel, onSelect }: { t: Strings; events: RatingEvent[]; skills: SkillId[]; sel: string; onSelect: (k: SkillId) => void }) {
  const rows = useMemo(
    () => skills.map((k) => ({ k, pts: ratingHistory(events, k, dayOfLocal) })).filter((r) => r.pts.length > 0),
    [events, skills],
  );
  if (!rows.length) return null;
  return (
    <section className="trends" aria-label={t.trends}>
      <h2>{t.trends}</h2>
      <p className="field-hint">{t.trendsHint}</p>
      <div className="trend-grid">
        {rows.map(({ k, pts }) => (
          <button key={k} className={`trend-tile ${sel === k ? 'on' : ''}`} onClick={() => onSelect(k)} aria-pressed={sel === k}>
            <span className="trend-name">{t.skillNames[k]}</span>
            <span className="trend-now">
              <b>{pts[pts.length - 1].r}</b> <Delta d={trendDelta(pts)} t={t} />
            </span>
            <Spark pts={pts} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function TrendDetail({ t, events, skill, lang }: { t: Strings; events: RatingEvent[]; skill: SkillId; lang: 'he' | 'en' }) {
  const pts = useMemo(() => ratingHistory(events, skill, dayOfLocal), [events, skill]);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (!pts.length) return null;
  const w = 340;
  const h = 170;
  const pad = { l: 40, r: 14, t: 12, b: 24 };
  const { x, y, lo, hi } = scales(pts, w, h, pad);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.r).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${h - pad.b} L${x(0).toFixed(1)} ${h - pad.b} Z`;
  // Level boundaries as recessive gridlines (the bands of the Skill Map).
  const grid = [900, 1100, 1300].filter((g) => g > lo && g < hi);
  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * w;
    let best = 0;
    pts.forEach((_, i) => {
      if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i;
    });
    setHover(best);
  };
  const hp = hover !== null ? pts[hover] : null;
  return (
    <section className="trend-detail set-card" aria-label={`${t.trends}: ${t.skillNames[skill]}`}>
      <div className="trend-detail-head">
        <h3>{t.skillNames[skill]}</h3>
        <span className="trend-now">
          <b>{pts[pts.length - 1].r}</b> <Delta d={trendDelta(pts)} t={t} />
        </span>
      </div>
      <div className="trend-chart" dir="ltr">
        <svg
          ref={ref}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={`${t.skillNames[skill]}: ${pts[0].r} → ${pts[pts.length - 1].r}`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          {grid.map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} className="tg-grid" />
              <text x={pad.l - 6} y={y(g) + 4} className="tg-tick" textAnchor="end">
                {g}
              </text>
            </g>
          ))}
          <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
          <text x={x(0)} y={h - 6} className="tg-tick" textAnchor="start">
            {fmtDay(pts[0].day, lang)}
          </text>
          {pts.length > 1 && (
            <text x={x(pts.length - 1)} y={h - 6} className="tg-tick" textAnchor="end">
              {fmtDay(pts[pts.length - 1].day, lang)}
            </text>
          )}
          {pts.length > 1 && <path d={area} className="spark-area" />}
          {pts.length > 1 && <path d={line} className="tg-line" />}
          {hp && hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
          {pts.map((p, i) => (
            <circle key={p.day} cx={x(i)} cy={y(p.r)} r={i === hover || i === pts.length - 1 ? 5 : 3} className="tg-dot" />
          ))}
        </svg>
        {hp && hover !== null && (
          <div className="tg-tip" style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(hp.r) / h) * 100}%` }} role="status">
            <b>{hp.r}</b> · {t.bands[band(hp.r)]}
            <small>
              {fmtDay(hp.day, lang)} · {hp.n} {t.answered}
            </small>
          </div>
        )}
      </div>
      <details className="trend-table">
        <summary>{t.showTable}</summary>
        <table>
          <thead>
            <tr>
              <th>{t.dateLabel}</th>
              <th>{t.rating}</th>
              <th>{t.answered}</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p) => (
              <tr key={p.day}>
                <td dir="ltr">{fmtDay(p.day, lang)}</td>
                <td>{p.r}</td>
                <td>{p.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
