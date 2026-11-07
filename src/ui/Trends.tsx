// Skill trends: is each skill going up or down over time? Small multiples (one per measured skill)
// plus a detail chart for the selected skill with level bands, hover / touch tooltip and a table view.
// One series per chart (no legend: the title names it); change shown as ▲/▼ + number, never colour alone.
// Time frames (docs/SPEC-STATS.md §2, S12): 7 days · 30 days · 90 days · 1 year · All, remembered per device.
// The time axis reads left → right in both languages (the chart is an LTR island).

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { SkillId } from '../engine/lesson';
import { band, overallHistory, ratingHistory, trendDelta, type RatingEvent, type TrendPoint } from '../engine/rating';
import { DEFAULT_FRAME, dayOrdinal, FRAMES, frameSeries, longSeries, seriesFrom, type Change, type Frame, type Peaks, type RatingBase, type StatsDays } from '../engine/stats';
import { STRINGS, type Strings } from '../i18n/strings';
import { localDay } from '../storage/progress';

const dayOfLocal = (iso: string) => localDay(new Date(iso));
export const langOf = (t: Strings): 'he' | 'en' => (t === STRINGS.he ? 'he' : 'en');
type L = { en: string; he: string };

const TX = {
  frame: { en: 'Time frame', he: 'טווח זמן' },
  frames: { '7d': { en: '7 days', he: '7 ימים' }, '30d': { en: '30 days', he: '30 יום' }, '90d': { en: '90 days', he: '90 יום' }, '1y': { en: '1 year', he: 'שנה' }, all: { en: 'All', he: 'הכול' } } as Record<Frame, L>,
  steady: { en: 'steady', he: 'יציב' },
  upIn: { en: 'up in this time frame', he: 'עלייה בטווח הזה' },
  downIn: { en: 'down in this time frame', he: 'ירידה בטווח הזה' },
  bestFrame: { en: 'best in frame', he: 'שיא בטווח' },
  bestEver: { en: 'best ever', he: 'השיא' },
  noData: { en: 'No answers in this time frame yet.', he: 'עדיין אין תשובות בטווח הזה.' },
};

// ---------------------------------------------------------------- the frame (a per-device convenience)

const FRAME_KEY = 'toneturn.statsFrame';
let frameNow: Frame | null = null;
const listeners = new Set<() => void>();
function readFrame(): Frame {
  if (frameNow) return frameNow;
  try {
    const v = localStorage.getItem(FRAME_KEY) as Frame | null;
    frameNow = v && FRAMES.includes(v) ? v : DEFAULT_FRAME;
  } catch {
    frameNow = DEFAULT_FRAME;
  }
  return frameNow;
}
export function setStatsFrame(f: Frame) {
  frameNow = f;
  try {
    localStorage.setItem(FRAME_KEY, f);
  } catch {
    /* private mode: kept for this visit only */
  }
  listeners.forEach((l) => l());
}
/** The shared frame: every stats screen follows the same chips. */
export function useStatsFrame(): [Frame, (f: Frame) => void] {
  const f = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readFrame,
    () => DEFAULT_FRAME,
  );
  return [f, setStatsFrame];
}

export function FrameChips({ lang, frame, onChange, allowed }: { lang: 'he' | 'en'; frame?: Frame; onChange?: (f: Frame) => void; allowed?: Frame[] }) {
  const [shared, setShared] = useStatsFrame();
  const cur = frame ?? shared;
  const set = onChange ?? setShared;
  return (
    <div className="frame-chips" role="radiogroup" aria-label={TX.frame[lang]}>
      {FRAMES.map((f) => {
        const ok = !allowed || allowed.includes(f);
        return (
          <button key={f} role="radio" aria-checked={cur === f} className={`frame-chip ${cur === f ? 'on' : ''}`} disabled={!ok} onClick={() => set(f)}>
            {TX.frames[f][lang]}
          </button>
        );
      })}
    </div>
  );
}

export function fmtDay(day: string, lang: 'he' | 'en', year = false) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
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

/** Change in the frame: ▲/▼ + number, "steady" under 15 points (S8), "new" when unmeasured at the frame start. */
export function FrameDelta({ c, t }: { c: Change; t: Strings }) {
  const lang = langOf(t);
  if (c.kind === 'none') return null;
  if (c.kind === 'new') return <span className="trend-delta flat">{t.trendNew}</span>;
  if (c.kind === 'steady') return <span className="trend-delta flat">≈ {TX.steady[lang]}</span>;
  const up = c.kind === 'up';
  return (
    <span className={`trend-delta ${up ? 'up' : 'down'}`} dir="ltr">
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {up ? '+' : '−'}
      {Math.abs(c.d)}
      <span className="sr-only"> {up ? TX.upIn[lang] : TX.downIn[lang]}</span>
    </span>
  );
}

/** Scales shared by the sparkline and the detail chart. x follows the calendar (days), y the rating. */
function scales(pts: TrendPoint[], w: number, h: number, pad: { l: number; r: number; t: number; b: number }) {
  const rs = pts.map((p) => p.r);
  const lo = Math.min(800, ...rs) - 20;
  const hi = Math.max(1400, ...rs) + 20;
  const d0 = pts.length ? dayOrdinal(pts[0].day) : 0;
  const d1 = pts.length ? dayOrdinal(pts[pts.length - 1].day) : 0;
  const x = (i: number) => (pts.length === 1 || d1 === d0 ? pad.l + (w - pad.l - pad.r) / 2 : pad.l + ((dayOrdinal(pts[i].day) - d0) * (w - pad.l - pad.r)) / (d1 - d0));
  const y = (r: number) => pad.t + ((hi - r) * (h - pad.t - pad.b)) / (hi - lo);
  return { x, y, lo, hi };
}

export function Spark({ pts }: { pts: TrendPoint[] }) {
  const w = 120;
  const h = 40;
  if (!pts.length) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
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

/** A skill's (or the overall) long series: the based event fold, extended back with day levels from statsDays. */
export function useSeries(skill: SkillId | 'overall', events: RatingEvent[], base?: RatingBase, days?: StatsDays): TrendPoint[] {
  return useMemo(() => longSeries(days, seriesFrom(base, events, skill, dayOfLocal), skill), [skill, events, base, days]);
}

export function TrendTiles({ t, events, skills, sel, onSelect, base, days, frame }: { t: Strings; events: RatingEvent[]; skills: SkillId[]; sel: string; onSelect: (k: SkillId) => void; base?: RatingBase; days?: StatsDays; frame?: Frame }) {
  const [shared] = useStatsFrame();
  const f = frame ?? shared;
  const today = localDay(new Date());
  const all = useMemo(() => skills.map((k) => ({ k, pts: longSeries(days, seriesFrom(base, events, k, dayOfLocal), k) })).filter((r) => r.pts.length > 0), [events, skills, base, days]);
  const rows = useMemo(() => all.map((r) => ({ ...r, fs: frameSeries(r.pts, f, today) })), [all, f, today]);
  if (!rows.length) return null;
  return (
    <section className="trends" aria-label={t.trends}>
      <h2>{t.trends}</h2>
      <p className="field-hint">{t.trendsHint}</p>
      <div className="trend-grid">
        {rows.map(({ k, pts, fs }) => (
          <button key={k} className={`trend-tile ${sel === k ? 'on' : ''}`} onClick={() => onSelect(k)} aria-pressed={sel === k}>
            <span className="trend-name">{t.skillNames[k]}</span>
            <span className="trend-now">
              <b dir="ltr">{pts[pts.length - 1].r}</b> <FrameDelta c={fs.change} t={t} />
            </span>
            <Spark pts={fs.pts} />
          </button>
        ))}
      </div>
    </section>
  );
}

/** The selected skill's chart with the frame chips (the request: "Trends get a time frame"). */
export function TrendDetail({ t, events, skill, lang, base, days, peaks, chips = true }: { t: Strings; events: RatingEvent[]; skill: SkillId | 'overall'; lang: 'he' | 'en'; base?: RatingBase; days?: StatsDays; peaks?: Peaks; chips?: boolean }) {
  const [f] = useStatsFrame();
  const pts = useSeries(skill, events, base, days);
  const today = localDay(new Date());
  const fs = useMemo(() => frameSeries(pts, f, today), [pts, f, today]);
  const title = skill === 'overall' ? t.overallRating : t.skillNames[skill];
  if (!pts.length) return null;
  const peak = peaks?.[skill];
  const head = (
    <div className="trend-detail-head">
      <h3>{title}</h3>
      <span className="trend-now">
        <b dir="ltr">{pts[pts.length - 1].r}</b> <FrameDelta c={fs.change} t={t} />
      </span>
      <small className="trend-bests">
        {fs.best && (
          <span>
            {TX.bestFrame[lang]} <b dir="ltr">{fs.best.r}</b>
          </span>
        )}
        {peak && (
          // S10: best ever is a neutral fact with its date — never a red delta.
          <span>
            {' · '}
            {TX.bestEver[lang]} <b dir="ltr">{peak.r}</b> (<span dir="ltr">{fmtDay(localDay(new Date(peak.at)), lang)}</span>)
          </span>
        )}
      </small>
    </div>
  );
  return (
    <>
      {chips && <FrameChips lang={lang} />}
      {fs.pts.length ? <TrendChart t={t} pts={fs.pts} title={title} lang={lang} head={head} /> : <p className="field-hint">{TX.noData[lang]}</p>}
    </>
  );
}

/** Overall rating history (spec L.4). */
export function overallTrend(events: RatingEvent[]) {
  return overallHistory(events, dayOfLocal);
}

export { Delta, ratingHistory, trendDelta };

export function TrendChart({ t, pts, title, lang, head }: { t: Strings; pts: TrendPoint[]; title: string; lang: 'he' | 'en'; head?: React.ReactNode }) {
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
    <section className="trend-detail set-card" aria-label={`${t.trends}: ${title}`}>
      {head ?? (
        <div className="trend-detail-head">
          <h3>{title}</h3>
          <span className="trend-now">
            <b dir="ltr">{pts[pts.length - 1].r}</b> <Delta d={trendDelta(pts)} t={t} />
          </span>
        </div>
      )}
      <div className="trend-chart" dir="ltr">
        <svg
          ref={ref}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={`${title}: ${pts[0].r} → ${pts[pts.length - 1].r}`}
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
              {fmtDay(hp.day, lang)}
              {hp.n ? ` · ${hp.n} ${t.answered}` : ''}
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
                <td dir="ltr">{p.r}</td>
                <td dir="ltr">{p.n || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
