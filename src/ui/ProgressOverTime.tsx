// The "Over time" tab (docs/SPEC-PROGRESS-CHARTS.md §2; owner 2026-11-22): progress in every area over time, from the
// daily snapshots. Rules (§0): one y-axis per chart; one series per small chart or up to 4 with a legend and names
// beside the marks; colour follows the area (areaColors.ts, validated); never colour alone (names, ▲/▼, a table view);
// the time axis reads left → right (an LTR island); touch / hover tooltips. Frames open with tenure (30 days default).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../engine/snapshot';
import { areaColor } from '../engine/areaColors';
import { areasOf, channelSeries, closedSeries, defaultFrame, framesFor, inFrame, insights, keysByWeek, minutesByWeek, statusByWeek, tempoSeries, tenureDays, weekTiles, type Frame, type Point } from '../engine/progressSeries';
import { STATUS_WORD, type ItemStatus } from '../engine/drills/itemStatus';
import { loadSnapshots } from '../storage/snapshots';
import { localDay } from '../storage/progress';
import { SinceLesson } from './SinceLesson';
import { useClassMedian } from './useClassMedian';
import '../progress-time.css';

/** The Monday a day's week starts on (the minutes chart's columns). */
const weekStart = (day: string) => {
  const d = new Date(day + 'T00:00:00Z');
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
};

type Lang = 'he' | 'en';
type L = { en: string; he: string };
const tx = (l: L, lang: Lang) => l[lang];
const FRAME_NAME: Record<Frame, L> = { '7d': { en: '7 days', he: '7 ימים' }, '30d': { en: '30 days', he: '30 יום' }, '90d': { en: '90 days', he: '90 יום' }, '1y': { en: 'A year', he: 'שנה' }, all: { en: 'All', he: 'הכול' } };
const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Dark when the theme's background is dark (themes set --bg on the root). */
function useDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      const m = /^#([0-9a-f]{6})$/i.exec(bg);
      if (!m) return setDark(false);
      const n = parseInt(m[1], 16);
      setDark(((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 110);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

const fmtDay = (d: string, lang: Lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** One series over time: a 2px line, a crosshair tooltip, the first and last day on the axis, an optional target line. */
function SmallLine({ pts, color, name, lang, fmt = (v) => String(Math.round(v)), target, lo, hi, refPts }: { pts: Point[]; color: string; name: string; lang: Lang; fmt?: (v: number) => string; target?: number; lo?: number; hi?: number; /** SPEC-PROGRESS-CHARTS §8.1: the class median, a grey line on the same scale (no names). */ refPts?: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (pts.length < 2) return <p className="pt-empty">{lang === 'he' ? 'עוד אין מספיק ימים' : 'Not enough days yet'}</p>;
  const w = 300, h = 120, pad = { l: 34, r: 10, t: 10, b: 20 };
  const days = new Map(pts.map((p, i) => [p.day, i]));
  const refLine = (refPts ?? []).filter((p) => days.has(p.day));
  const vs = pts.map((p) => p.v).concat(target !== undefined ? [target] : [], refLine.map((p) => p.v));
  const min = lo ?? Math.min(...vs), max = hi ?? Math.max(...vs, min + 1e-6);
  const x = (i: number) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const pick = (cx: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((cx - r.left) / r.width) * w;
    let b = 0;
    pts.forEach((_, i) => Math.abs(x(i) - vx) < Math.abs(x(b) - vx) && (b = i));
    setHover(b);
  };
  const hp = hover !== null ? pts[hover] : null;
  return (
    <div className="pt-chart" dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${name}: ${fmt(pts[0].v)} → ${fmt(pts[pts.length - 1].v)}`} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
        <text x={pad.l - 4} y={y(max) + 4} className="tg-tick" textAnchor="end">{fmt(max)}</text>
        <text x={pad.l - 4} y={y(min) + 4} className="tg-tick" textAnchor="end">{fmt(min)}</text>
        {target !== undefined && <line x1={pad.l} x2={w - pad.r} y1={y(target)} y2={y(target)} className="pt-target" />}
        <text x={x(0)} y={h - 5} className="tg-tick">{fmtDay(pts[0].day, lang)}</text>
        <text x={x(pts.length - 1)} y={h - 5} className="tg-tick" textAnchor="end">{fmtDay(pts[pts.length - 1].day, lang)}</text>
        {refLine.length > 1 && <path d={refLine.map((p, i) => `${i ? 'L' : 'M'}${x(days.get(p.day)!).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')} fill="none" className="pt-median" strokeWidth={2} strokeLinejoin="round" data-median-line="1" />}
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
        <circle cx={x(hover ?? pts.length - 1)} cy={y((hp ?? pts[pts.length - 1]).v)} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />
      </svg>
      {hp && hover !== null && (
        <div className="tg-tip" style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(hp.v) / h) * 100}%` }} role="status">
          <b>{fmt(hp.v)}</b>
          <small>{fmtDay(hp.day, lang)}</small>
        </div>
      )}
    </div>
  );
}

/** Stacked columns (one per week): rounded tops, a 2px surface gap between segments, a legend above. */
function StackCols({ cols, keys, colorOf, labelOf, lang, marks }: { cols: { week: string; by: Record<string, number> }[]; keys: string[]; colorOf: (k: string) => string; labelOf: (k: string) => string; lang: Lang; /** The class median per week (minutes): a grey tick on each column. */ marks?: Record<string, number> }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!cols.length) return <p className="pt-empty">{lang === 'he' ? 'עוד אין נתונים' : 'No data yet'}</p>;
  const w = 300, h = 130, pad = { l: 8, r: 8, t: 8, b: 20 };
  const tot = cols.map((c) => keys.reduce((n, k) => n + (c.by[k] ?? 0), 0));
  const max = Math.max(1, ...tot, ...cols.map((c) => marks?.[c.week] ?? 0));
  const bw = Math.min(28, (w - pad.l - pad.r) / cols.length - 6);
  const xOf = (i: number) => pad.l + ((i + 0.5) * (w - pad.l - pad.r)) / cols.length - bw / 2;
  const scale = (v: number) => (v / max) * (h - pad.t - pad.b);
  return (
    <div className="pt-chart pt-stack" dir="ltr">
      <div className="pt-legend">
        {keys.map((k) => (
          <span key={k}>
            <i style={{ background: colorOf(k) }} />
            {labelOf(k)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={keys.map(labelOf).join(', ')} onPointerLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
        {cols.map((c, i) => {
          let y0 = h - pad.b;
          return (
            <g key={c.week} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={xOf(i) - 3} y={pad.t} width={bw + 6} height={h - pad.t - pad.b} fill="transparent" />
              {keys.map((k) => {
                const v = c.by[k] ?? 0;
                if (!v) return null;
                const hh = Math.max(1, scale(v) - 2);
                y0 -= scale(v);
                return <rect key={k} x={xOf(i)} y={y0 + 2} width={bw} height={hh} rx={3} fill={colorOf(k)} />;
              })}
            </g>
          );
        })}
        {marks &&
          cols.map((c, i) => (marks[c.week] !== undefined ? <line key={`m${c.week}`} x1={xOf(i) - 4} x2={xOf(i) + bw + 4} y1={h - pad.b - scale(marks[c.week])} y2={h - pad.b - scale(marks[c.week])} className="pt-median" strokeWidth={2} data-median-mark="1" /> : null))}
        <text x={xOf(0)} y={h - 5} className="tg-tick">{fmtDay(cols[0].week, lang)}</text>
        <text x={xOf(cols.length - 1) + bw} y={h - 5} className="tg-tick" textAnchor="end">{fmtDay(cols[cols.length - 1].week, lang)}</text>
      </svg>
      {hover !== null && (
        <div className="pt-hovertable" role="status">
          <b>{fmtDay(cols[hover].week, lang)}</b>
          {keys.filter((k) => cols[hover].by[k]).map((k) => (
            <span key={k}>
              {labelOf(k)}: {Math.round(cols[hover].by[k] * 10) / 10}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, sub, children, table, lang }: { title: string; sub?: string; children: React.ReactNode; table?: [string, string][]; lang: Lang }) {
  const tableWord = lang === 'he' ? { table: 'טבלה', chart: 'גרף' } : { table: 'Table', chart: 'Chart' };
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="pt-card" aria-label={title}>
      <div className="pt-card-head">
        <h3>{title}</h3>
        {table && (
          <button type="button" className="pt-tablebtn" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)} data-table-toggle>
            {asTable ? tableWord.chart : tableWord.table}
          </button>
        )}
      </div>
      {sub && <p className="pt-sub">{sub}</p>}
      {asTable && table ? (
        <table className="pt-table">
          <tbody>
            {table.map(([a, b], i) => (
              <tr key={i}>
                <td>{a}</td>
                <td dir="ltr">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </section>
  );
}

const STATUS_SHADES = ['#e9e4f8', '#c3b6ee', '#8f7ae0', '#5a3fc7'];

export function ProgressOverTime({ lang, areaName, today = localDay(new Date()), snapshots, course, median }: { lang: Lang; areaName: (area: string) => string; today?: string; snapshots?: Record<string, Snapshot>; /** An instrument course shows only its own areas (and the lick book). */ course?: string; /** SPEC-PROGRESS-CHARTS §8.1: the class median (the teacher turned it on, the summaries sync) — grey lines on the tempo and minutes charts. */ median?: { day: string; tempo: number; minutes: number }[] | null }) {
  const he = lang === 'he';
  const dark = useDark();
  // the class median: given (tests), or fetched when the summaries sync and the teacher turned it on
  const fetchedMedian = useClassMedian(median === undefined && !snapshots, today);
  const med = median === undefined ? fetchedMedian : median;
  const [all, setAll] = useState<Record<string, Snapshot> | null>(snapshots ?? null);
  useEffect(() => {
    if (!snapshots) void loadSnapshots().then(setAll);
  }, [snapshots]);
  const tenure = all ? tenureDays(all, today) : 0;
  const frames = framesFor(tenure);
  const [frame, setFrame] = useState<Frame | null>(null);
  const fr = frame && frames.includes(frame) ? frame : defaultFrame(tenure);
  const snaps = useMemo(() => (all ? inFrame(all, fr, today) : []), [all, fr, today]);
  if (!all) return null;
  if (!snaps.length)
    return (
      <p className="pt-empty" data-progress-time="empty">
        {he ? 'הגרפים יתמלאו אחרי כמה ימי אימון.' : 'The charts fill in after a few days of practice.'}
      </p>
    );
  const own = (a: string) => !course || !['keys', 'guitar', 'bass', 'drums'].includes(course) || a === 'lick' || a.startsWith(`${course}:`);
  const areas = areasOf(snaps).filter(own).slice(0, 6);
  const tiles = weekTiles(all, today);
  const TILE: Record<string, L> = { minutes: { en: 'Minutes', he: 'דקות' }, closed: { en: 'Closed', he: 'נסגרו' }, days: { en: 'Practice days', he: 'ימי אימון' }, tempo: { en: 'Of target tempo', he: 'מטמפו היעד' } };
  const ins = insights(snaps, areaName, lang);
  const statusKeys: ItemStatus[] = ['learning', 'almost', 'closed'];
  const status = statusByWeek(snaps).map((w) => ({ week: w.week, by: Object.fromEntries(statusKeys.map((k) => [k, w.counts[k] ?? 0])) }));
  const mins = minutesByWeek(snaps);
  const minKeys = [...new Set(mins.flatMap((m) => Object.keys(m.by)))];
  const keys = keysByWeek(snaps);
  const ear = channelSeries(snaps, 'ear'), read = channelSeries(snaps, 'reading');
  const neutral = dark ? '#9aa0a8' : '#8a8f98';
  const medTempo: Point[] | undefined = med?.length ? med.map((m) => ({ day: m.day, v: m.tempo })) : undefined;
  const medWeeks: Record<string, number> | undefined = med?.length ? med.reduce<Record<string, number>>((acc, m) => ((acc[weekStart(m.day)] = (acc[weekStart(m.day)] ?? 0) + m.minutes), acc), {}) : undefined;
  const medNote = med?.length ? (he ? 'קו אפור: חציון הכיתה' : 'Grey line: the class median') : null;
  return (
    <div className="pt-wrap" data-progress-time={fr}>
      <div className="chips pt-frames" role="radiogroup" aria-label={he ? 'טווח זמן' : 'Time frame'}>
        {frames.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={f === fr} className={`chip ${f === fr ? 'on' : ''}`} onClick={() => setFrame(f)} data-frame={f}>
            {tx(FRAME_NAME[f], lang)}
          </button>
        ))}
      </div>
      {ins.length > 0 && (
        <ul className="pt-insights">
          {ins.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <div className="pgt-tiles">
        {tiles.map((t) => {
          const d = t.now - t.prev;
          return (
            <div key={t.id} className="pgt-tile" data-tile={t.id}>
              <span>{tx(TILE[t.id], lang)}</span>
              <b dir="ltr">{t.id === 'tempo' ? `${t.now}%` : t.now}</b>
              <small dir="ltr">{d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`}</small>
            </div>
          );
        })}
      </div>

      <Card lang={lang} title={he ? 'כמה נסגר בכל תחום' : 'Closed, by area'} table={areas.map((a) => [areaName(a), String(closedSeries(snaps, a).at(-1)?.v ?? 0)])}>
        <div className="pt-multiples">
          {areas.map((a) => (
            <div key={a} className="pt-multiple" data-area={a}>
              <span className="pt-mname">
                <i style={{ background: areaColor(a, dark ? 'dark' : 'light') }} />
                {areaName(a)}
              </span>
              <SmallLine pts={closedSeries(snaps, a)} color={areaColor(a, dark ? 'dark' : 'light')} name={areaName(a)} lang={lang} lo={0} />
            </div>
          ))}
        </div>
      </Card>

      <Card lang={lang} title={he ? 'פריטים עולים בסולם' : 'Items move up the ladder'} sub={he ? 'כל עמודה: שבוע' : 'Each column: a week'} table={status.map((s) => [fmtDay(s.week, lang), statusKeys.map((k) => `${tx(STATUS_WORD[k], lang)} ${s.by[k]}`).join(' · ')])}>
        <StackCols cols={status} keys={statusKeys} colorOf={(k) => STATUS_SHADES[statusKeys.indexOf(k as ItemStatus) + 1]} labelOf={(k) => tx(STATUS_WORD[k as ItemStatus], lang)} lang={lang} />
      </Card>

      <Card lang={lang} title={he ? 'קרבה לטמפו היעד' : 'Closeness to the target tempo'} sub={(he ? 'הקו המקווקו: היעד' : 'Dashed line: the target') + (medNote ? ` · ${medNote}` : '')}>
        <div className="pt-multiples">
          {areas.filter((a) => tempoSeries(snaps, a).length > 1).slice(0, 4).map((a) => (
            <div key={a} className="pt-multiple">
              <span className="pt-mname">
                <i style={{ background: areaColor(a, dark ? 'dark' : 'light') }} />
                {areaName(a)}
              </span>
              <SmallLine pts={tempoSeries(snaps, a)} color={areaColor(a, dark ? 'dark' : 'light')} name={areaName(a)} lang={lang} fmt={pct} target={1} lo={0} hi={1.1} refPts={medTempo} />
            </div>
          ))}
        </div>
      </Card>

      {(ear.length > 1 || read.length > 1) && (
        <Card lang={lang} title={he ? 'שמיעה וקריאה' : 'By ear and reading'}>
          <div className="pt-multiples">
            <div className="pt-multiple">
              <span className="pt-mname">{he ? 'משמיעה' : 'By ear'}</span>
              <SmallLine pts={ear} color={areaColor('byear', dark ? 'dark' : 'light')} name="ear" lang={lang} fmt={pct} lo={0} hi={1} />
            </div>
            <div className="pt-multiple">
              <span className="pt-mname">{he ? 'קריאה' : 'Reading'}</span>
              <SmallLine pts={read} color={areaColor('reading', dark ? 'dark' : 'light')} name="reading" lang={lang} fmt={pct} lo={0} hi={1} />
            </div>
          </div>
        </Card>
      )}

      {keys.length > 0 && (
        <Card lang={lang} title={he ? 'הסולמות מתמלאים' : 'The keys filling up'} table={KEY_NAMES.map((n, k) => [n, pct(keys.at(-1)!.keys[k] ?? 0)])}>
          <div className="pt-heat" dir="ltr" role="img" aria-label={he ? 'סולמות לפי שבוע' : 'Keys by week'}>
            {KEY_NAMES.map((n, k) => (
              <div key={n} className="pt-heat-row">
                <span>{n}</span>
                {keys.map((w) => {
                  const v = w.keys[k];
                  return <i key={w.week} title={`${n} · ${fmtDay(w.week, lang)} · ${v === undefined ? '–' : pct(v)}`} style={{ background: v === undefined ? 'var(--line)' : `color-mix(in oklab, ${areaColor('technique', dark ? 'dark' : 'light')} ${Math.round(15 + v * 85)}%, var(--card))` }} />;
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card lang={lang} title={he ? 'לאן הולכות הדקות' : 'Where the minutes go'} sub={medNote ?? undefined} table={mins.map((m) => [fmtDay(m.week, lang), Object.entries(m.by).map(([k, v]) => `${k} ${v}`).join(' · ') + (medWeeks?.[m.week] !== undefined ? ` · ${he ? 'חציון' : 'median'} ${Math.round(medWeeks[m.week])}` : '')])}>
        <StackCols cols={mins} keys={minKeys} colorOf={(k) => (k === 'other' ? neutral : areaColor(k, dark ? 'dark' : 'light'))} labelOf={(k) => (k === 'other' ? (he ? 'אחר' : 'Other') : areaName(k))} lang={lang} marks={medWeeks} />
      </Card>

      <SinceLesson snaps={all} lang={lang} today={today} areaName={areaName} />
    </div>
  );
}
