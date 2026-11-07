// Stats, trends with time frames, insights, records and month in review (docs/SPEC-STATS.md, review pass §8).
// Pure: no storage, no DOM. Days are local calendar days "YYYY-MM-DD" (S12).
//
// Data model (new Progress fields — all optional, all synced with max() / union, never rebuilt, S3):
//   statsDays   Record<day, StatsDay>        per-day counters, kept forever (small)
//   statsHours  { n: number[168], ok: … }    one 7×24 total (weekday × hour), not per day (S11)
//   peaks       Record<SkillId|'overall', { r, at }>   best ever (S1: from the based fold, never drifts)
//   counts      Counts                       monotonic lifetime counters for awards (S2)
//   records     PersonalRecords              S20 records that need a date and are not derivable from days
//   awards      Record<id, AwardEntry>       achievements/tiers earned (achievements.ts)
//   ratingBase  RatingBase                   the trimmed prefix of rating events, folded (S1)

import { applyEvent, DOMAINS, domainOf, overallRating, PROVISIONAL_UNTIL, SKILLS, type DomainId, type RatingEvent, type Ratings, type TrendPoint } from './rating';
import type { SkillId } from './lesson';

// ======================================================================= types

export type InputKind = 'voice' | 'buttons' | 'sing' | 'play' | 'tap';
export const INPUT_KINDS: InputKind[] = ['voice', 'buttons', 'sing', 'play', 'tap'];

/** [items, correct] */
export type NOk = [number, number];

export interface StatsDay {
  items: number;
  correct: number;
  /** Practice time (sum of result durationMs; 0 for old results — shown as "—" when no day has it). */
  ms: number;
  xp: number;
  sessions: number;
  byArea: Partial<Record<DomainId, NOk>>;
  bySkill?: Partial<Record<SkillId, NOk>>;
  /** Level at the end of the day — only skills that changed that day (S11). */
  bySkillR?: Partial<Record<SkillId, number>>;
  /** Overall level at the end of the day (when measured). */
  o?: number;
  /** Answer speed: 8 log bins (S6), see SPEED_EDGES. */
  speed?: number[];
  /** By input (S5) — only items that recorded it. */
  byInput?: Partial<Record<InputKind, NOk>>;
}
export type StatsDays = Record<string, StatsDay>;

/** One 7×24 total: index = weekday (0 = Sunday) × 24 + hour. */
export interface StatsHours {
  n: number[];
  ok: number[];
}

export type PeakKey = SkillId | 'overall';
export type Peaks = Partial<Record<PeakKey, { r: number; at: string }>>;

/** Monotonic counters (S2). "Lower is better" keys are listed in LOWER_BETTER (merged with min). */
export type CountKey =
  | 'lessons'
  | 'perfect'
  | 'units'
  | 'stepsByTest'
  | 'checkpoints3'
  | 'duelsWon'
  | 'friends'
  | 'gates'
  | 'tuneUps'
  | 'tuneUpCents'
  | 'fretboardAll'
  | 'eqThird'
  | 'highwayFC'
  | 'nameTuneBest'
  | 'pitchMemoryDays'
  | 'pitchMemoryCents'
  | 'pitchCents'
  | 'steadySec'
  | 'drillClean'
  | 'tempoRecords'
  | 'evenCv';
export type Counts = Partial<Record<CountKey, number>>;
export const LOWER_BETTER: CountKey[] = ['tuneUpCents', 'pitchMemoryCents', 'pitchCents', 'evenCv'];

export interface PersonalRecords {
  fastPerfect?: { ms: number; at: string; lessonId: string };
  run?: { n: number; at: string };
  /** Current run of right first answers (device-local; not merged). */
  runCur?: number;
}

export interface AwardEntry {
  /** 1-based tier reached. */
  tier: number;
  at: string;
  /** Awarded silently at the first launch of 0.38 (S7): shown as "before 0.38". */
  pre?: boolean;
}
export type Awards = Record<string, AwardEntry>;

export interface RatingBase {
  ratings: Ratings;
  /** Number of events folded in and the time of the last one. */
  n: number;
  upTo: string | null;
}

/** What the aggregation reads from a saved result (a subset of LessonResult + the new fields). */
export interface ResultLike {
  lessonId: string;
  sessionId: string;
  completedAt: string;
  firstTry: number;
  total: number;
  xp: number;
  durationMs?: number;
  items?: ItemLike[];
}
export interface ItemLike {
  id: string;
  skill: SkillId;
  correct: boolean;
  timeMs?: number | null;
  input?: InputKind;
  set?: number;
  tags?: { skill: SkillId; sub?: string; w: number }[];
}

export interface StatsState {
  statsDays?: StatsDays;
  statsHours?: StatsHours;
  peaks?: Peaks;
  counts?: Counts;
  records?: PersonalRecords;
}

// ======================================================================= days

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayNum = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
export const dayOrdinal = dayNum;
export function addDays(day: string, n: number): string {
  const d = new Date((dayNum(day) + n) * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export const weekdayOf = (day: string) => new Date(dayNum(day) * 86400000).getUTCDay();

// ======================================================================= rating base (S1)

const byTime = (events: RatingEvent[]) => [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
const cloneRatings = (r: Ratings): Ratings => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v!, recent: [...v!.recent] }])) as Ratings;

export const emptyBase = (): RatingBase => ({ ratings: {}, n: 0, upTo: null });

/** Fold events on top of a base (deduplicated by id, in time order). With no base this equals foldRatings. */
export function foldFrom(base: RatingBase | undefined, events: RatingEvent[]): Ratings {
  const out = cloneRatings(base?.ratings ?? {});
  const seen = new Set<string>();
  for (const e of byTime(events)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    applyEvent(out, e);
  }
  return out;
}

let memo: { base: RatingBase | undefined; len: number; last: string | undefined; out: Ratings } | null = null;
/** foldFrom memoised per events length (S11): the same base + same events length + same last id → cached. */
export function foldFromMemo(base: RatingBase | undefined, events: RatingEvent[]): Ratings {
  const last = events[events.length - 1]?.id;
  if (memo && memo.base === base && memo.len === events.length && memo.last === last) return memo.out;
  const out = foldFrom(base, events);
  memo = { base, len: events.length, last, out };
  return out;
}

/** Before trimming to `cap`, move the dropped prefix (oldest by time) into the base. */
export function trimIntoBase(base: RatingBase | undefined, events: RatingEvent[], cap = 3000): { base: RatingBase; events: RatingEvent[] } {
  const b = base ?? emptyBase();
  if (events.length <= cap) return { base: b, events };
  const sorted = byTime(events);
  const drop = sorted.slice(0, sorted.length - cap);
  const keep = sorted.slice(sorted.length - cap);
  return { base: { ratings: foldFrom(b, drop), n: b.n + drop.length, upTo: drop[drop.length - 1].at }, events: keep };
}

/** A skill's (or the overall) level per local day, starting from a base, folding events. */
export function seriesFrom(base: RatingBase | undefined, events: RatingEvent[], skill: SkillId | 'overall', dayOf: (iso: string) => string = (iso) => localDay(new Date(iso))): TrendPoint[] {
  const cur = cloneRatings(base?.ratings ?? {});
  const seen = new Set<string>();
  const out: TrendPoint[] = [];
  for (const e of byTime(events)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const changed = applyEvent(cur, e);
    let r: number;
    let n: number;
    if (skill === 'overall') {
      const o = overallRating(cur);
      if (!o) continue;
      r = o.r;
      n = o.n;
    } else {
      if (!changed.includes(skill)) continue;
      r = cur[skill]!.r;
      n = cur[skill]!.n;
    }
    const day = dayOf(e.at);
    const last = out[out.length - 1];
    if (last && last.day === day) {
      last.r = r;
      last.n = n;
    } else out.push({ day, r, n });
  }
  return out;
}

/** Long series: day levels from statsDays (beyond the event cap) merged with the event series (events win). */
export function longSeries(days: StatsDays | undefined, eventPts: TrendPoint[], skill: SkillId | 'overall'): TrendPoint[] {
  const have = new Set(eventPts.map((p) => p.day));
  const first = eventPts[0]?.day;
  const older: TrendPoint[] = [];
  for (const [day, d] of Object.entries(days ?? {})) {
    if (have.has(day) || (first && day >= first)) continue;
    const r = skill === 'overall' ? d.o : d.bySkillR?.[skill];
    if (r !== undefined) older.push({ day, r, n: 0 });
  }
  return [...older.sort((a, b) => a.day.localeCompare(b.day)), ...eventPts];
}

// ======================================================================= frames (S12)

export type Frame = '7d' | '30d' | '90d' | '1y' | 'all';
export const FRAMES: Frame[] = ['7d', '30d', '90d', '1y', 'all'];
export const DEFAULT_FRAME: Frame = '30d';
const FRAME_DAYS: Record<Frame, number | null> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null };

/** Inclusive local-day range; 7 days = today + the 6 before. `start` null = all time. */
export function frameRange(frame: Frame, today: string): { start: string | null; end: string } {
  const n = FRAME_DAYS[frame];
  return { start: n === null ? null : addDays(today, -(n - 1)), end: today };
}
export const inFrame = (day: string, r: { start: string | null; end: string }) => (r.start === null || day >= r.start) && day <= r.end;

export type Change = { kind: 'new' } | { kind: 'steady'; d: number } | { kind: 'up' | 'down'; d: number } | { kind: 'none' };
export const STEADY_UNDER = 15;

/**
 * A series cut to a frame. `start` = last known value at or before the frame start (S12); the chart gets a
 * leading point at the start day carrying it. change = last − start ("new" when unmeasured at the start;
 * for "All" it is measured from the first point).
 */
export function frameSeries(pts: TrendPoint[], frame: Frame, today: string): { pts: TrendPoint[]; start: number | null; change: Change; best: TrendPoint | null } {
  const r = frameRange(frame, today);
  const inside = pts.filter((p) => inFrame(p.day, r));
  let start: number | null = null;
  if (r.start === null) start = pts[0]?.r ?? null;
  else {
    const before = pts.filter((p) => p.day <= r.start!);
    start = before.length ? before[before.length - 1].r : null;
  }
  const shown = r.start !== null && start !== null && inside[0]?.day !== r.start ? [{ day: r.start, r: start, n: 0 }, ...inside] : inside;
  const lastPt = pts.filter((p) => p.day <= today).pop();
  let change: Change;
  if (!lastPt) change = { kind: 'none' };
  else if (start === null) change = { kind: 'new' };
  else {
    const d = lastPt.r - start;
    change = Math.abs(d) < STEADY_UNDER ? { kind: 'steady', d } : { kind: d > 0 ? 'up' : 'down', d };
  }
  const best = inside.length ? inside.reduce((a, b) => (b.r > a.r ? b : a)) : null;
  return { pts: shown, start, change, best };
}

// ======================================================================= speed bins (S6)

/** Upper edges (ms) of the first 7 bins (√2 steps); bin 7 is ≥ 5.6 s. */
export const SPEED_EDGES = [700, 1000, 1400, 2000, 2800, 4000, 5600];
const SPEED_MID = [500, 840, 1180, 1680, 2370, 3350, 4730, 8000];
export const speedBin = (ms: number) => {
  const i = SPEED_EDGES.findIndex((e) => ms < e);
  return i < 0 ? 7 : i;
};
/** Median answer time from bins: the (log) middle of the bin holding the 50 % mark, interpolated. */
export function medianFromBins(bins: number[] | undefined): number | null {
  if (!bins) return null;
  const total = bins.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let acc = 0;
  for (let i = 0; i < 8; i++) {
    if (acc + bins[i] >= total / 2) {
      const lo = i === 0 ? 350 : SPEED_EDGES[i - 1];
      const hi = i === 7 ? 11200 : SPEED_EDGES[i];
      const f = bins[i] ? (total / 2 - acc) / bins[i] : 0.5;
      return Math.round(lo * Math.pow(hi / lo, f));
    }
    acc += bins[i];
  }
  return SPEED_MID[7];
}

// ======================================================================= aggregation on save

const emptyDay = (): StatsDay => ({ items: 0, correct: 0, ms: 0, xp: 0, sessions: 0, byArea: {} });
const addNOk = <K extends string>(m: Partial<Record<K, NOk>> | undefined, k: K, ok: boolean): Partial<Record<K, NOk>> => {
  const cur = m?.[k] ?? [0, 0];
  return { ...(m ?? {}), [k]: [cur[0] + 1, cur[1] + (ok ? 1 : 0)] } as Partial<Record<K, NOk>>;
};
/** Items that count as answered: not placement "set" items, not derived memory / timing items. */
export const countedItem = (it: ItemLike) => it.set === undefined && !it.id.endsWith(':mem') && !it.id.endsWith(':timing');

function addItems(st: StatsState, items: ItemLike[], at: string): StatsState {
  const when = new Date(at);
  const day = localDay(when);
  const days = { ...(st.statsDays ?? {}) };
  let d: StatsDay = { ...(days[day] ?? emptyDay()) };
  const hours: StatsHours = { n: [...(st.statsHours?.n ?? new Array(168).fill(0))], ok: [...(st.statsHours?.ok ?? new Array(168).fill(0))] };
  const slot = when.getDay() * 24 + when.getHours();
  const records = { ...(st.records ?? {}) };
  for (const it of items.filter(countedItem)) {
    d = { ...d, items: d.items + 1, correct: d.correct + (it.correct ? 1 : 0) };
    d.byArea = addNOk(d.byArea, domainOf(it.skill), it.correct);
    d.bySkill = addNOk(d.bySkill, it.skill, it.correct);
    if (it.input) d.byInput = addNOk(d.byInput, it.input, it.correct);
    if (typeof it.timeMs === 'number' && it.timeMs > 0) {
      const bins = [...(d.speed ?? new Array(8).fill(0))];
      bins[speedBin(it.timeMs)]++;
      d.speed = bins;
    }
    hours.n[slot]++;
    if (it.correct) hours.ok[slot]++;
    const run = it.correct ? (records.runCur ?? 0) + 1 : 0;
    records.runCur = run;
    if (run > (records.run?.n ?? 0)) records.run = { n: run, at };
  }
  days[day] = d;
  return { ...st, statsDays: days, statsHours: hours, records };
}

/** Day levels (changed skills only) and peaks after a save. `after` = the based fold after the save. */
function addLevels(st: StatsState, changed: SkillId[], after: Ratings, at: string): StatsState {
  const day = localDay(new Date(at));
  const days = { ...(st.statsDays ?? {}) };
  const d = { ...(days[day] ?? emptyDay()) };
  const peaks: Peaks = { ...(st.peaks ?? {}) };
  for (const k of new Set(changed)) {
    const s = after[k];
    if (!s) continue;
    d.bySkillR = { ...(d.bySkillR ?? {}), [k]: s.r };
    if (s.n >= PROVISIONAL_UNTIL && s.r > (peaks[k]?.r ?? -Infinity)) peaks[k] = { r: s.r, at };
  }
  const o = overallRating(after);
  if (o) {
    d.o = o.r;
    if (!o.provisional && o.r > (peaks.overall?.r ?? -Infinity)) peaks.overall = { r: o.r, at };
  }
  days[day] = d;
  return { ...st, statsDays: days, peaks };
}

const changedSkills = (items: { skill: SkillId; tags?: { skill: SkillId }[] }[]) => [...new Set(items.flatMap((it) => [it.skill, ...(it.tags ?? []).map((t) => t.skill)]))];

/**
 * Fold one saved result into the long-lived stats (call in applyResult, once per result — applyResult is
 * already idempotent by session id). `after` = ratings after the result's events (based fold).
 */
export function statsAfterResult(st: StatsState, r: ResultLike, after: Ratings): StatsState {
  const items = r.items ?? [];
  let next = addItems(st, items, r.completedAt);
  next = addLevels(next, changedSkills(items), after, r.completedAt);
  const day = localDay(new Date(r.completedAt));
  const d = next.statsDays![day];
  next.statsDays![day] = { ...d, xp: d.xp + r.xp, sessions: d.sessions + 1, ms: d.ms + Math.max(0, r.durationMs ?? 0) };
  const counts = { ...(next.counts ?? {}) };
  if (r.lessonId !== 'placement' && r.lessonId !== 'weekly-puzzle') counts.lessons = (counts.lessons ?? 0) + 1;
  const perfect = r.total >= 3 && r.firstTry === r.total;
  if (perfect) counts.perfect = (counts.perfect ?? 0) + 1;
  const records = { ...(next.records ?? {}) };
  if (perfect && r.durationMs && r.durationMs > 0 && r.durationMs < (records.fastPerfect?.ms ?? Infinity)) records.fastPerfect = { ms: r.durationMs, at: r.completedAt, lessonId: r.lessonId };
  return { ...next, counts, records };
}

/** Rating events saved outside a result (games, drills, True or false): items + levels, no session. */
export function statsAfterEvents(st: StatsState, events: (RatingEvent & { timeMs?: number | null; input?: InputKind })[], after: Ratings): StatsState {
  if (!events.length) return st;
  let next = st;
  const byAt = new Map<string, typeof events>();
  for (const e of events) byAt.set(e.at, [...(byAt.get(e.at) ?? []), e]);
  for (const [at, es] of byAt) next = addItems(next, es, at);
  const last = events.reduce((a, b) => (b.at > a ? b.at : a), events[0].at);
  return addLevels(next, changedSkills(events), after, last);
}

/** Add to a counter (or keep the best for lower-is-better / "best" counters via mode). */
export function bumpCount(c: Counts | undefined, key: CountKey, value: number, mode: 'add' | 'max' | 'min' = 'add'): Counts {
  const cur = c?.[key];
  const v = mode === 'add' ? (cur ?? 0) + value : mode === 'max' ? Math.max(cur ?? -Infinity, value) : Math.min(cur ?? Infinity, value);
  return { ...(c ?? {}), [key]: v };
}

// ======================================================================= sync merge (S3)

const maxArr = (a: number[] | undefined, b: number[] | undefined, len: number) => (a || b ? Array.from({ length: len }, (_, i) => Math.max(a?.[i] ?? 0, b?.[i] ?? 0)) : undefined);
function maxNOk<K extends string>(a: Partial<Record<K, NOk>> | undefined, b: Partial<Record<K, NOk>> | undefined) {
  if (!a && !b) return undefined;
  const out: Partial<Record<K, NOk>> = { ...(a ?? {}) } as Partial<Record<K, NOk>>;
  for (const [k, v] of Object.entries(b ?? {}) as [K, NOk][]) {
    const x = out[k];
    // Keep the pair with more items (a pair is one counter; mixing maxima could give correct > items).
    out[k] = !x || v[0] > x[0] ? v : x;
  }
  return out;
}
/** Merge two devices' day stats: per day the one with more items wins counts; levels/peaks by union. */
export function mergeStatsDays(a: StatsDays | undefined, b: StatsDays | undefined): StatsDays {
  const out: StatsDays = { ...(a ?? {}) };
  for (const [day, y] of Object.entries(b ?? {})) {
    const x = out[day];
    if (!x) {
      out[day] = y;
      continue;
    }
    const big = y.items > x.items ? y : x;
    out[day] = {
      items: big.items,
      correct: big.correct,
      ms: Math.max(x.ms, y.ms),
      xp: Math.max(x.xp, y.xp),
      sessions: Math.max(x.sessions, y.sessions),
      byArea: maxNOk(x.byArea, y.byArea) ?? {},
      bySkill: maxNOk(x.bySkill, y.bySkill),
      // Union of skills; for a skill on both devices the busier day's level wins.
      bySkillR: big === y ? { ...(x.bySkillR ?? {}), ...(y.bySkillR ?? {}) } : { ...(y.bySkillR ?? {}), ...(x.bySkillR ?? {}) },
      o: big.o ?? x.o ?? y.o,
      speed: maxArr(x.speed, y.speed, 8),
      byInput: maxNOk(x.byInput, y.byInput),
    };
  }
  return out;
}
export const mergeStatsHours = (a?: StatsHours, b?: StatsHours): StatsHours | undefined => (a || b ? { n: maxArr(a?.n, b?.n, 168)!, ok: maxArr(a?.ok, b?.ok, 168)! } : undefined);
export function mergePeaks(a?: Peaks, b?: Peaks): Peaks {
  const out: Peaks = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {}) as [PeakKey, { r: number; at: string }][]) {
    const x = out[k];
    if (!x || v.r > x.r || (v.r === x.r && v.at < x.at)) out[k] = v;
  }
  return out;
}
export function mergeCounts(a?: Counts, b?: Counts): Counts {
  const out: Counts = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {}) as [CountKey, number][]) {
    const x = out[k];
    out[k] = x === undefined ? v : LOWER_BETTER.includes(k) ? Math.min(x, v) : Math.max(x, v);
  }
  return out;
}
export function mergeRecords(a?: PersonalRecords, b?: PersonalRecords): PersonalRecords {
  const fp = [a?.fastPerfect, b?.fastPerfect].filter(Boolean).sort((x, y) => x!.ms - y!.ms)[0];
  const run = [a?.run, b?.run].filter(Boolean).sort((x, y) => y!.n - x!.n || x!.at.localeCompare(y!.at))[0];
  return { ...(fp ? { fastPerfect: fp } : {}), ...(run ? { run } : {}), runCur: a?.runCur ?? 0 };
}
/** The base that folded more events wins (both are prefixes of the same synced history). */
export const mergeBase = (a?: RatingBase, b?: RatingBase): RatingBase | undefined => (!a ? b : !b ? a : b.n > a.n ? b : a);

// ======================================================================= frame totals

export interface FrameTotals {
  items: number;
  correct: number;
  ms: number;
  xp: number;
  sessions: number;
  days: number;
  accuracy: number | null;
  medianMs: number | null;
  byArea: Partial<Record<DomainId, NOk>>;
  bySkill: Partial<Record<SkillId, NOk>>;
  byInput: Partial<Record<InputKind, NOk>>;
  /** Whether any day in the frame had durations / inputs (else those numbers show "—", S5). */
  hasTime: boolean;
  hasInput: boolean;
}
const sumNOk = <K extends string>(into: Partial<Record<K, NOk>>, m: Partial<Record<K, NOk>> | undefined) => {
  for (const [k, v] of Object.entries(m ?? {}) as [K, NOk][]) {
    const c = into[k] ?? [0, 0];
    into[k] = [c[0] + v[0], c[1] + v[1]];
  }
};
export function totalsIn(days: StatsDays | undefined, range: { start: string | null; end: string }): FrameTotals {
  const t: FrameTotals = { items: 0, correct: 0, ms: 0, xp: 0, sessions: 0, days: 0, accuracy: null, medianMs: null, byArea: {}, bySkill: {}, byInput: {}, hasTime: false, hasInput: false };
  const bins = new Array(8).fill(0);
  for (const [day, d] of Object.entries(days ?? {})) {
    if (!inFrame(day, range)) continue;
    t.items += d.items;
    t.correct += d.correct;
    t.ms += d.ms;
    t.xp += d.xp;
    t.sessions += d.sessions;
    if (d.items || d.sessions) t.days++;
    if (d.ms > 0) t.hasTime = true;
    sumNOk(t.byArea, d.byArea);
    sumNOk(t.bySkill, d.bySkill);
    if (d.byInput) {
      t.hasInput = true;
      sumNOk(t.byInput, d.byInput);
    }
    d.speed?.forEach((x, i) => (bins[i] += x));
  }
  t.accuracy = t.items ? t.correct / t.items : null;
  t.medianMs = medianFromBins(bins);
  return t;
}
export const frameTotals = (days: StatsDays | undefined, frame: Frame, today: string) => totalsIn(days, frameRange(frame, today));

/** Me vs past me: this frame and the equally long window just before it ("All" compares with nothing). */
export function pastMe(days: StatsDays | undefined, frame: Frame, today: string): { now: FrameTotals; before: FrameTotals | null } {
  const r = frameRange(frame, today);
  const now = totalsIn(days, r);
  if (r.start === null) return { now, before: null };
  const n = dayNum(r.end) - dayNum(r.start) + 1;
  return { now, before: totalsIn(days, { start: addDays(r.start, -n), end: addDays(r.start, -1) }) };
}

// ======================================================================= insights (S8, S15)

export const INSIGHT_MIN_ITEMS = 30;
export const INSIGHT_MIN_DIFF = 10; // accuracy points
export const SKILL_MIN_ITEMS = 20;

export interface Bucket<K extends string = string> {
  key: K;
  n: number;
  ok: number;
}
export type Comparison<K extends string = string> = { best: Bucket<K>; worst: Bucket<K>; diff: number } | null;

/** Best vs worst bucket by accuracy, only among buckets with ≥ 30 items and only if they differ by ≥ 10 points. */
export function compareBuckets<K extends string>(buckets: Bucket<K>[], minN = INSIGHT_MIN_ITEMS, minDiff = INSIGHT_MIN_DIFF): Comparison<K> {
  const ok = buckets.filter((b) => b.n >= minN);
  if (ok.length < 2) return null;
  const acc = (b: Bucket<K>) => (100 * b.ok) / b.n;
  const best = ok.reduce((a, b) => (acc(b) > acc(a) ? b : a));
  const worst = ok.reduce((a, b) => (acc(b) < acc(a) ? b : a));
  const diff = Math.round(acc(best) - acc(worst));
  return diff >= minDiff ? { best, worst, diff } : null;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
export const DAY_PARTS: DayPart[] = ['morning', 'afternoon', 'evening', 'night'];
/** 05–11 morning, 12–16 afternoon, 17–21 evening, 22–04 night. */
export const dayPartOf = (hour: number): DayPart => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night');

export function timeOfDayBuckets(h: StatsHours | undefined): Bucket<DayPart>[] {
  const out = DAY_PARTS.map((key) => ({ key, n: 0, ok: 0 }));
  if (!h) return out;
  for (let i = 0; i < 168; i++) {
    const b = out[DAY_PARTS.indexOf(dayPartOf(i % 24))];
    b.n += h.n[i] ?? 0;
    b.ok += h.ok[i] ?? 0;
  }
  return out;
}
export function weekdayBuckets(h: StatsHours | undefined): Bucket<string>[] {
  return Array.from({ length: 7 }, (_, w) => {
    let n = 0;
    let ok = 0;
    for (let x = 0; x < 24; x++) {
      n += h?.n[w * 24 + x] ?? 0;
      ok += h?.ok[w * 24 + x] ?? 0;
    }
    return { key: String(w), n, ok };
  });
}
export const nokBuckets = <K extends string>(m: Partial<Record<K, NOk>>): Bucket<K>[] => (Object.entries(m) as [K, NOk][]).map(([key, [n, ok]]) => ({ key, n, ok }));

/** Strongest / weakest skills by accuracy (n ≥ 20 each; S15). */
export function strongWeak(bySkill: Partial<Record<SkillId, NOk>>): { strong: Bucket<SkillId>; weak: Bucket<SkillId> } | null {
  const b = nokBuckets(bySkill).filter((x) => x.n >= SKILL_MIN_ITEMS);
  if (b.length < 2) return null;
  const acc = (x: Bucket) => x.ok / x.n;
  const sorted = [...b].sort((x, y) => acc(y) - acc(x) || y.n - x.n);
  return { strong: sorted[0], weak: sorted[sorted.length - 1] };
}

export interface SessionLike {
  sessionId: string;
  lessonId: string;
  completedAt: string;
  firstTry: number;
  total: number;
  xp: number;
  durationMs?: number;
  items?: ItemLike[];
}
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** "Sessions that went best": accuracy × speed (speed = min(1, 3 s / median answer time); 1 without times), ≥ 5 items. */
export function bestSessions<T extends SessionLike>(history: T[], n = 3): { s: T; score: number; acc: number; medianMs: number | null }[] {
  return history
    .filter((h) => h.total >= 5 && h.lessonId !== 'placement')
    .map((s) => {
      const acc = s.firstTry / s.total;
      const m = median((s.items ?? []).map((i) => i.timeMs).filter((x): x is number => typeof x === 'number' && x > 0));
      const speed = m === null ? 1 : Math.min(1, 3000 / m);
      return { s, score: acc * speed, acc, medianMs: m };
    })
    .sort((a, b) => b.score - a.score || b.s.completedAt.localeCompare(a.s.completedAt))
    .slice(0, n);
}

/** Tricky pairs from the kept history: (right answer, first wrong answer) seen at least twice. */
export function trickyPairs(history: { missed: { answer: unknown; given: unknown[] }[] }[], n = 3): { answer: string; given: string; count: number }[] {
  const m = new Map<string, { answer: string; given: string; count: number }>();
  for (const h of history)
    for (const x of h.missed ?? []) {
      const g = x.given?.[0];
      if (g === undefined || g === null) continue;
      const a = String(x.answer);
      const gs = String(g);
      if (a === gs) continue;
      const key = `${a}|${gs}`;
      const cur = m.get(key) ?? { answer: a, given: gs, count: 0 };
      cur.count++;
      m.set(key, cur);
    }
  return [...m.values()].filter((x) => x.count >= 2).sort((a, b) => b.count - a.count).slice(0, n);
}

// ======================================================================= percentile (S13)

export const PERCENTILE_MIN_GROUP = 5;
/** Share (0..100) of the group with a lower overall level; ties count half. null for groups under 5. */
export function percentile(mine: number, group: number[]): number | null {
  if (group.length < PERCENTILE_MIN_GROUP) return null;
  const lower = group.filter((x) => x < mine).length;
  const ties = group.filter((x) => x === mine).length;
  return Math.round((100 * (lower + ties / 2)) / group.length);
}

// ======================================================================= compare (S4)

export type AreaLevels = Partial<Record<DomainId, number>>;
export const domainLevel = (v: number) => Math.round(600 + v * 1000);
/** Radar overlay rows: unmeasured areas stay null (never drawn as zero). */
export function compareAreas(me: AreaLevels, them?: AreaLevels | null): { d: DomainId; me: number | null; them: number | null }[] {
  return DOMAINS.map(({ id }) => ({ d: id, me: me[id] ?? null, them: them ? (them[id] ?? null) : null }));
}
export interface DuelLike {
  other: string;
  myPoints: number | null;
  theirPoints: number | null;
}
export function duelRecord(duels: DuelLike[], other: string): { w: number; l: number; d: number } {
  const r = { w: 0, l: 0, d: 0 };
  for (const x of duels) {
    if (x.other !== other || x.myPoints === null || x.theirPoints === null) continue;
    if (x.myPoints > x.theirPoints) r.w++;
    else if (x.myPoints < x.theirPoints) r.l++;
    else r.d++;
  }
  return r;
}

// ======================================================================= records (S20), calendar (S19)

/** Longest run of consecutive days, with its end day. */
export function longestStreak(days: Iterable<string>): { n: number; end: string | null } {
  const s = [...new Set(days)].sort();
  let best = { n: 0, end: null as string | null };
  let run = 0;
  let prev: number | null = null;
  for (const d of s) {
    const x = dayNum(d);
    run = prev !== null && x === prev + 1 ? run + 1 : 1;
    prev = x;
    if (run > best.n) best = { n: run, end: d };
  }
  return best;
}
export interface RecordsView {
  fastPerfect: { ms: number; at: string } | null;
  run: { n: number; at: string } | null;
  bestDay: { day: string; acc: number; items: number } | null;
  streak: { n: number; end: string } | null;
}
export const BEST_DAY_MIN_ITEMS = 20;
export function personalRecords(rec: PersonalRecords | undefined, days: StatsDays | undefined, practiceDays: Iterable<string>): RecordsView {
  let bestDay: RecordsView['bestDay'] = null;
  for (const [day, d] of Object.entries(days ?? {})) {
    if (d.items < BEST_DAY_MIN_ITEMS) continue;
    const acc = d.correct / d.items;
    if (!bestDay || acc > bestDay.acc || (acc === bestDay.acc && d.items > bestDay.items)) bestDay = { day, acc, items: d.items };
  }
  const st = longestStreak([...practiceDays, ...Object.keys(days ?? {}).filter((k) => (days![k].items || days![k].sessions) > 0)]);
  return { fastPerfect: rec?.fastPerfect ?? null, run: rec?.run ?? null, bestDay, streak: st.end ? { n: st.n, end: st.end } : null };
}

export interface CalCell {
  day: string;
  items: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}
export const calLevel = (items: number): CalCell['level'] => (items <= 0 ? 0 : items < 10 ? 1 : items < 30 ? 2 : items < 60 ? 3 : 4);
/** Year heatmap: `weeks` columns (Sunday-first), the last one holding today. */
export function activityCalendar(days: StatsDays | undefined, today: string, weeks = 53, extraDays: Iterable<string> = []): CalCell[][] {
  const extra = new Set(extraDays);
  const lastSunday = addDays(today, -weekdayOf(today));
  const first = addDays(lastSunday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(first, w * 7 + i);
      const items = days?.[day]?.items ?? 0;
      const lv = calLevel(items);
      return { day, items, level: lv === 0 && extra.has(day) ? 1 : lv, future: day > today };
    }),
  );
}

// ======================================================================= history (S17)

export type SessionKind = 'lesson' | 'placement' | 'puzzle' | 'game' | 'vocal';
export const sessionKind = (lessonId: string): SessionKind =>
  lessonId === 'placement' ? 'placement' : lessonId === 'weekly-puzzle' ? 'puzzle' : lessonId.startsWith('vocal') ? 'vocal' : /^(g[:-]|game)/.test(lessonId) ? 'game' : 'lesson';
export function sessionArea(s: { items?: ItemLike[] }): DomainId | null {
  const c = new Map<DomainId, number>();
  for (const it of (s.items ?? []).filter(countedItem)) c.set(domainOf(it.skill), (c.get(domainOf(it.skill)) ?? 0) + 1);
  let best: DomainId | null = null;
  for (const [d, n] of c) if (!best || n > c.get(best)!) best = d;
  return best;
}
export type HistoryRow<T> = { type: 'session'; day: string; s: T; kind: SessionKind; area: DomainId | null } | { type: 'day'; day: string; items: number; correct: number; xp: number; sessions: number };
/**
 * Kept sessions (tappable), then — for days before the oldest kept session — one day row each from statsDays.
 * Filters: frame, area, kind (day rows only pass "all kinds" and match an area when that area has items).
 */
export function historyRows<T extends SessionLike>(history: T[], days: StatsDays | undefined, frame: Frame, today: string, f: { area?: DomainId | 'all'; kind?: SessionKind | 'all' } = {}): HistoryRow<T>[] {
  const r = frameRange(frame, today);
  const out: HistoryRow<T>[] = [];
  const kept = [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const oldestKept = kept.length ? localDay(new Date(kept[kept.length - 1].completedAt)) : null;
  for (const s of kept) {
    const day = localDay(new Date(s.completedAt));
    if (!inFrame(day, r)) continue;
    const kind = sessionKind(s.lessonId);
    const area = sessionArea(s);
    if (f.kind && f.kind !== 'all' && kind !== f.kind) continue;
    if (f.area && f.area !== 'all' && area !== f.area) continue;
    out.push({ type: 'session', day, s, kind, area });
  }
  if (!f.kind || f.kind === 'all') {
    const older = Object.entries(days ?? {})
      .filter(([day, d]) => (oldestKept === null || day < oldestKept) && inFrame(day, r) && (d.sessions > 0 || d.items > 0))
      .filter(([, d]) => !f.area || f.area === 'all' || (d.byArea[f.area]?.[0] ?? 0) > 0)
      .sort((a, b) => b[0].localeCompare(a[0]));
    for (const [day, d] of older) {
      const a = f.area && f.area !== 'all' ? d.byArea[f.area] : null;
      out.push({ type: 'day', day, items: a ? a[0] : d.items, correct: a ? a[1] : d.correct, xp: d.xp, sessions: d.sessions });
    }
  }
  return out;
}

// ======================================================================= month in review (S16)

export const monthOf = (day: string) => day.slice(0, 7);
export const prevMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
export const MONTH_MIN_DAYS = 3;
export interface MonthReview {
  month: string;
  days: number;
  items: number;
  accuracy: number | null;
  xp: number;
  ms: number;
  topArea: DomainId | null;
  gains: { skill: SkillId; from: number | null; to: number; d: number }[];
  awards: { id: string; tier: number }[];
}
/** Data for one month (null under 3 practice days). Gains: level at month end vs the last level before it. */
export function monthReview(days: StatsDays | undefined, awards: Awards | undefined, month: string): MonthReview | null {
  const all = Object.entries(days ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  const inMonth = all.filter(([d]) => monthOf(d) === month);
  const active = inMonth.filter(([, d]) => d.items > 0 || d.sessions > 0);
  if (active.length < MONTH_MIN_DAYS) return null;
  const t = totalsIn(days, { start: `${month}-01`, end: `${month}-31` });
  const topArea = (Object.entries(t.byArea) as [DomainId, NOk][]).sort((a, b) => b[1][0] - a[1][0])[0]?.[0] ?? null;
  const gains: MonthReview['gains'] = [];
  for (const k of SKILLS) {
    let to: number | undefined;
    for (const [, d] of inMonth) if (d.bySkillR?.[k] !== undefined) to = d.bySkillR[k];
    if (to === undefined) continue;
    let from: number | null = null;
    for (const [day, d] of all) if (monthOf(day) < month && d.bySkillR?.[k] !== undefined) from = d.bySkillR[k]!;
    gains.push({ skill: k, from, to, d: from === null ? 0 : to - from });
  }
  gains.sort((a, b) => b.d - a.d);
  const aw = Object.entries(awards ?? {})
    .filter(([, a]) => !a.pre && monthOf(localDay(new Date(a.at))) === month)
    .map(([id, a]) => ({ id, tier: a.tier }));
  return { month, days: active.length, items: t.items, accuracy: t.accuracy, xp: t.xp, ms: t.ms, topArea, gains: gains.filter((g) => g.d > 0).slice(0, 3), awards: aw };
}
/** The month to offer (S16): the previous month, at the first open after it ended, if not seen and ≥ 3 days. */
export function dueMonthReview(today: string, seenMonth: string | null | undefined, days: StatsDays | undefined): string | null {
  const m = prevMonth(monthOf(today));
  if (seenMonth && seenMonth >= m) return null;
  return monthReview(days, undefined, m) ? m : null;
}

// ======================================================================= area levels (for compare / profile)

/** Area levels on the rating scale from a ratings map (domain value mapped back to 600..1600). */
export function areaLevels(ratings: Ratings, domainValue: (r: Ratings, d: DomainId) => { v: number } | null): AreaLevels {
  const out: AreaLevels = {};
  for (const d of DOMAINS) {
    const v = domainValue(ratings, d.id);
    if (v) out[d.id] = domainLevel(v.v);
  }
  return out;
}

// ======================================================================= privacy (S9)

/** Settings → "Share my stats with friends". Default: levels only. */
export type ShareStats = 'levels' | 'activity' | 'nothing';
export const DEFAULT_SHARE: ShareStats = 'levels';
/** What a friend may see of a player with this setting (absent = a pre-0.38 friend: the server already shares activity). */
export const canSeeLevels = (s: ShareStats | null | undefined) => s !== 'nothing';
export const canSeeActivity = (s: ShareStats | null | undefined) => s === undefined || s === null || s === 'activity';
