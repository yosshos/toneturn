// The small charts inside the places (docs/SPEC-PROGRESS-CHARTS.md §2 "small charts inside the places", §5): the same
// snapshot data, compact —
// - an item's page: its tempo over time with the target line and a ceiling marker where it plateaued;
// - a key page: how much of the key is closed, over time;
// - Today: the weekly ring (this week's minutes against last week's, ▲/▼) and, once a week, the weekly summary (the
//   4 tiles, the chart where the change was largest, one sentence).
// The §0 rules: one axis, a 2px line, names and numbers (never colour alone), hover / touch, LTR islands.

import { useEffect, useRef, useState } from 'react';
import type { ItemState } from '../engine/drills/types';
import type { Snapshot } from '../engine/snapshot';
import { weekTiles, weeklySummary, type Point } from '../engine/progressSeries';
import { loadSnapshots } from '../storage/snapshots';
import { areaColor } from '../engine/areaColors';
import { SmallLine, useDark } from './ProgressOverTime';
import { WeeklyRing } from './OverTimeCharts';
import { Icon } from './icons';
import '../progress-time.css';

type Lang = 'he' | 'en';
const fmtDay = (d: string, lang: Lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The snapshots on this device (given in tests). */
function useSnaps(given?: Record<string, Snapshot>): Record<string, Snapshot> | null {
  const [all, setAll] = useState<Record<string, Snapshot> | null>(given ?? null);
  useEffect(() => {
    if (given) return setAll(given);
    let alive = true;
    void loadSnapshots().then((x) => alive && setAll(x));
    return () => {
      alive = false;
    };
  }, [given]);
  return all;
}

/** An item's best clean tempo per day, oldest first. */
export function itemTempoPoints(st: Pick<ItemState, 'history'>): Point[] {
  const best = new Map<string, number>();
  for (const h of st.history ?? []) best.set(h.at.slice(0, 10), Math.max(best.get(h.at.slice(0, 10)) ?? 0, h.bpm));
  return [...best.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, v }));
}

/** The item page's small chart: the best clean tempo per day, the target (dashed) and the coach's ceiling (dotted). */
export function ItemTempoChart({ item, lang }: { item: ItemState; lang: Lang }) {
  const he = lang === 'he';
  const dark = useDark();
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const pts = itemTempoPoints(item);
  const target = item.targetBpm ?? 0;
  const ceiling = item.ceiling?.bpm ?? null;
  if (pts.length < 2) return <p className="pt-empty">{he ? 'הגרף יופיע אחרי שני ימי נגינה' : 'The chart appears after two days of takes'}</p>;
  const color = areaColor('technique', dark ? 'dark' : 'light');
  const w = 300, h = 110, pad = { l: 32, r: 44, t: 10, b: 20 };
  const vs = [...pts.map((p) => p.v), ...(target ? [target] : []), ...(ceiling ? [ceiling] : [])];
  const min = Math.max(0, Math.min(...vs) - 4), max = Math.max(...vs) + 4;
  const x = (i: number) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const pick = (cx: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((cx - r.left) / r.width) * w;
    let b = 0;
    pts.forEach((_, i) => Math.abs(x(i) - vx) < Math.abs(x(b) - vx) && (b = i));
    setHover(b);
  };
  const hp = hover !== null ? pts[hover] : pts[pts.length - 1];
  return (
    <section className="pt-card it-tempo" aria-label={he ? 'טמפו לאורך זמן' : 'Tempo over time'} data-item-tempo={item.itemId}>
      <div className="pt-card-head">
        <h3>{he ? 'טמפו לאורך זמן' : 'Tempo over time'}</h3>
      </div>
      <div className="pt-chart" dir="ltr">
        <svg ref={ref} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${he ? 'טמפו' : 'Tempo'} ${pts[0].v} → ${pts[pts.length - 1].v}${target ? `, ${he ? 'יעד' : 'target'} ${target}` : ''}${ceiling ? `, ${he ? 'תקרה' : 'ceiling'} ${ceiling}` : ''}`} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
          <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="tg-axis" />
          <text x={pad.l - 4} y={y(max) + 4} className="tg-tick" textAnchor="end">{Math.round(max)}</text>
          <text x={pad.l - 4} y={y(min) + 4} className="tg-tick" textAnchor="end">{Math.round(min)}</text>
          {target > 0 && (
            <g data-item-target={target}>
              <line x1={pad.l} x2={w - pad.r} y1={y(target)} y2={y(target)} className="pt-target" />
              <text x={w - pad.r + 3} y={y(target) + 3} className="tg-tick">{he ? `יעד ${target}` : `target ${target}`}</text>
            </g>
          )}
          {ceiling !== null && (
            <g data-item-ceiling={ceiling}>
              <line x1={pad.l} x2={w - pad.r} y1={y(ceiling)} y2={y(ceiling)} className="it-ceiling" />
              <text x={w - pad.r + 3} y={y(ceiling) + 3} className="tg-tick">{he ? `תקרה ${ceiling}` : `ceiling ${ceiling}`}</text>
            </g>
          )}
          <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <text x={x(0)} y={h - 5} className="tg-tick">{fmtDay(pts[0].day, lang)}</text>
          <text x={x(pts.length - 1)} y={h - 5} className="tg-tick" textAnchor="end">{fmtDay(pts[pts.length - 1].day, lang)}</text>
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="tg-cross" />}
          <circle cx={x(hover ?? pts.length - 1)} cy={y(hp.v)} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />
        </svg>
        <div className="pt-hovertable" role="status">
          <b>{fmtDay(hp.day, lang)}</b>
          <span dir="ltr">♩ {hp.v}</span>
        </div>
      </div>
    </section>
  );
}

/** The key page's line: the share of the key's played items that are closed, over the snapshots (§2). */
export function KeyClosedLine({ root, lang, name, snapshots }: { root: number; lang: Lang; name: string; snapshots?: Record<string, Snapshot> }) {
  const all = useSnaps(snapshots);
  const dark = useDark();
  if (!all) return null;
  const pts = Object.values(all)
    .filter((s) => s.keys[root] !== undefined)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-90)
    .map((s) => ({ day: s.day, v: s.keys[root] }));
  if (pts.length < 2) return null;
  return (
    <section className="pt-card" aria-label={lang === 'he' ? 'כמה מהסולם נסגר' : 'How much of the key is closed'} data-key-line={root}>
      <div className="pt-card-head">
        <h3>{lang === 'he' ? 'כמה מהסולם נסגר' : 'How much of the key is closed'}</h3>
      </div>
      <SmallLine pts={pts} color={areaColor('technique', dark ? 'dark' : 'light')} name={name} lang={lang} fmt={(v) => `${Math.round(v * 100)}%`} lo={0} hi={1} />
    </section>
  );
}

/** The local day (YYYY-MM-DD). */
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today's small weekly ring: this week's minutes against last week's, with ▲/▼ (§2 "Today"). */
export function WeeklyRingTile({ lang, today = localDay(), snapshots, onOpen }: { lang: Lang; today?: string; snapshots?: Record<string, Snapshot>; onOpen?: () => void }) {
  const all = useSnaps(snapshots);
  if (!all || !Object.keys(all).length) return null;
  const m = weekTiles(all, today).find((t) => t.id === 'minutes')!;
  const label = lang === 'he' ? 'דקות השבוע' : 'Minutes this week';
  return (
    <button type="button" className="tc-card st-stat st-week" onClick={onOpen} data-today-week="1">
      <small>{label}</small>
      <WeeklyRing now={m.now} prev={m.prev} lang={lang} label={label}>
        <b dir="ltr">{m.now}</b>
      </WeeklyRing>
    </button>
  );
}

const WEEK_KEY = 'tt.weekSummarySeen';
const mondayOf = (day: string) => {
  const d = new Date(day + 'T00:00:00Z');
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
};
const seenWeek = (): string | null => {
  try {
    return localStorage.getItem(WEEK_KEY);
  } catch {
    return null;
  }
};

/**
 * The weekly summary in Today (§5), once a week until closed: the 4 tiles with ▲/▼, one chart where the change was
 * largest, and one sentence. Shown from the second week of snapshots (a week to compare against).
 */
export function WeeklySummaryCard({ lang, areaName, today = localDay(), snapshots, force = false }: { lang: Lang; areaName: (a: string) => string; today?: string; snapshots?: Record<string, Snapshot>; /** Tests: show regardless of the week already seen. */ force?: boolean }) {
  const all = useSnaps(snapshots);
  const dark = useDark();
  const week = mondayOf(today);
  const [hidden, setHidden] = useState(() => !force && seenWeek() === week);
  if (!all || hidden) return null;
  const days = Object.keys(all).sort();
  // a week to compare against: snapshots from before this week
  if (!days.length || days[0] >= week) return null;
  const he = lang === 'he';
  const s = weeklySummary(all, today, areaName, lang);
  const TILE: Record<string, { en: string; he: string }> = { minutes: { en: 'Minutes', he: 'דקות' }, closed: { en: 'Closed', he: 'נסגרו' }, days: { en: 'Practice days', he: 'ימי אימון' }, tempo: { en: 'Of target tempo', he: 'מטמפו היעד' } };
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(WEEK_KEY, week);
    } catch {
      /* not remembered: it shows again next visit this week */
    }
  };
  const c = s.change;
  const color = c ? areaColor(c.area, dark ? 'dark' : 'light') : '';
  return (
    <section className="tc-card wk-summary" aria-label={he ? 'סיכום השבוע' : 'The week in summary'} data-weekly-summary={c ? `${c.kind}:${c.area}` : 'none'}>
      <div className="wk-summary-head">
        <h3>{he ? 'סיכום השבוע' : 'The week in summary'}</h3>
        <button type="button" className="icon-btn" aria-label={he ? 'סגירה' : 'Close'} title={he ? 'סגירה' : 'Close'} onClick={close} data-weekly-close="1">
          <Icon k="close" size={14} />
        </button>
      </div>
      <div className="pgt-tiles">
        {s.tiles.map((t) => {
          const d = t.now - t.prev;
          return (
            <div key={t.id} className="pgt-tile" data-tile={t.id}>
              <span>{TILE[t.id][lang]}</span>
              <b dir="ltr">{t.id === 'tempo' ? `${t.now}%` : t.now}</b>
              <small dir="ltr">{d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`}</small>
            </div>
          );
        })}
      </div>
      {c && c.pts.length > 1 && <SmallLine pts={c.pts} color={color} name={areaName(c.area)} lang={lang} fmt={c.kind === 'tempo' ? (v) => `${Math.round(v * 100)}%` : undefined} lo={0} />}
      <p className="wk-line">{s.sentence}</p>
    </section>
  );
}
