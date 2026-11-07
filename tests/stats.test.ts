import { describe, expect, it } from 'vitest';
import {
  activityCalendar,
  addDays,
  compareAreas,
  compareBuckets,
  dayPartOf,
  dueMonthReview,
  duelRecord,
  foldFrom,
  frameRange,
  frameSeries,
  historyRows,
  medianFromBins,
  mergeCounts,
  mergeStatsDays,
  monthReview,
  pastMe,
  percentile,
  personalRecords,
  speedBin,
  statsAfterResult,
  strongWeak,
  timeOfDayBuckets,
  trimIntoBase,
  type ResultLike,
  type StatsState,
} from '../src/engine/stats';
import { foldRatings, type RatingEvent } from '../src/engine/rating';
import { achievements, closestToUnlock, earnAwards, firstLaunchAwards, mergeAwards, tierOf } from '../src/engine/achievements';
import { emptyProgress } from '../src/storage/progress';

const TODAY = '2026-11-07';
const pt = (day: string, r: number) => ({ day, r, n: 1 });

describe('frames (S12)', () => {
  it('are local days inclusive of today', () => {
    expect(frameRange('7d', TODAY)).toEqual({ start: '2026-11-01', end: TODAY });
    expect(frameRange('30d', TODAY).start).toBe(addDays(TODAY, -29));
    expect(frameRange('all', TODAY).start).toBeNull();
  });
  it('change is measured from the last value at or before the frame start', () => {
    const pts = [pt('2026-10-01', 1000), pt('2026-10-31', 1040), pt('2026-11-03', 1100)];
    const fs = frameSeries(pts, '7d', TODAY);
    expect(fs.start).toBe(1040);
    expect(fs.change).toEqual({ kind: 'up', d: 60 });
    // The chart starts at the frame edge carrying the start value.
    expect(fs.pts[0]).toMatchObject({ day: '2026-11-01', r: 1040 });
    expect(fs.best?.r).toBe(1100);
  });
  it('"new" when unmeasured at the start, "steady" under 15 points, nothing for an empty series', () => {
    expect(frameSeries([pt('2026-11-05', 1050)], '7d', TODAY).change).toEqual({ kind: 'new' });
    expect(frameSeries([pt('2026-10-01', 1000), pt('2026-11-05', 1010)], '7d', TODAY).change).toEqual({ kind: 'steady', d: 10 });
    const empty = frameSeries([], '30d', TODAY);
    expect(empty.change).toEqual({ kind: 'none' });
    expect(empty.pts).toEqual([]);
  });
  it('a frame with no points inside still shows the carried level (flat)', () => {
    const fs = frameSeries([pt('2026-09-01', 1200)], '7d', TODAY);
    expect(fs.pts).toEqual([{ day: '2026-11-01', r: 1200, n: 0 }]);
    expect(fs.change).toEqual({ kind: 'steady', d: 0 });
  });
});

const ev = (i: number, correct: boolean, day = 1): RatingEvent => ({ id: `e${i}`, skill: 'intervals', difficulty: 1000 + (i % 5) * 40, correct, at: `2026-10-${String(day).padStart(2, '0')}T10:00:${String(i % 60).padStart(2, '0')}.${String(i).padStart(3, '0')}Z` });

describe('rating base (S1)', () => {
  it('trimming folds the dropped prefix into the base — levels never drift', () => {
    const all = Array.from({ length: 50 }, (_, i) => ev(i, i % 3 !== 0, 1 + Math.floor(i / 10)));
    const { base, events } = trimIntoBase(undefined, all, 20);
    expect(events).toHaveLength(20);
    expect(base.n).toBe(30);
    expect(foldFrom(base, events).intervals!.r).toBe(foldRatings(all).intervals!.r);
    // Trimming twice keeps folding from the previous base.
    const again = trimIntoBase(base, [...events, ...Array.from({ length: 10 }, (_, i) => ev(100 + i, true, 9))], 20);
    expect(foldFrom(again.base, again.events).intervals!.r).toBe(foldRatings([...all, ...Array.from({ length: 10 }, (_, i) => ev(100 + i, true, 9))]).intervals!.r);
  });
});

const result = (id: string, at: string, items: { ok: boolean; ms?: number }[], extra: Partial<ResultLike> = {}): ResultLike => ({
  lessonId: 'intervals-1',
  sessionId: id,
  completedAt: at,
  firstTry: items.filter((x) => x.ok).length,
  total: items.length,
  xp: 10,
  items: items.map((x, i) => ({ id: `${id}:${i}`, skill: 'intervals', correct: x.ok, timeMs: x.ms ?? null })),
  ...extra,
});

describe('aggregates (statsDays)', () => {
  it('a saved result updates the day, the 7×24 total, speed bins, counters and records', () => {
    const at = new Date(2026, 10, 7, 9, 30).toISOString();
    const r = result('s1', at, [{ ok: true, ms: 900 }, { ok: true, ms: 1500 }, { ok: true, ms: 1600 }], { durationMs: 90000 });
    const after = foldRatings([]);
    const st = statsAfterResult({}, r, after);
    const d = st.statsDays![TODAY];
    expect(d).toMatchObject({ items: 3, correct: 3, xp: 10, sessions: 1, ms: 90000 });
    expect(d.byArea.pitch).toEqual([3, 3]);
    expect(d.speed![speedBin(1500)]).toBe(2);
    const slot = new Date(at).getDay() * 24 + 9;
    expect(st.statsHours!.n[slot]).toBe(3);
    expect(st.counts).toMatchObject({ lessons: 1, perfect: 1 });
    expect(st.records!.fastPerfect!.ms).toBe(90000);
    expect(st.records!.run!.n).toBe(3);
  });
  it('days survive the event cap (they are not rebuilt from events) and merge by max', () => {
    let st: StatsState = {};
    for (let i = 0; i < 5; i++) st = statsAfterResult(st, result(`s${i}`, new Date(2026, 9, 1 + i, 12).toISOString(), [{ ok: true }, { ok: false }]), {});
    expect(Object.keys(st.statsDays!)).toHaveLength(5);
    const other = statsAfterResult({}, result('x', new Date(2026, 9, 1, 12).toISOString(), [{ ok: true }, { ok: true }, { ok: true }]), {});
    const m = mergeStatsDays(st.statsDays, other.statsDays);
    expect(m['2026-10-01'].items).toBe(3);
    expect(Object.keys(m)).toHaveLength(5);
    expect(mergeCounts({ lessons: 4, tuneUpCents: 9 }, { lessons: 2, tuneUpCents: 4 })).toEqual({ lessons: 4, tuneUpCents: 4 });
  });
  it('median speed from 8 log bins', () => {
    expect(medianFromBins([0, 0, 0, 0, 0, 0, 0, 0])).toBeNull();
    const m = medianFromBins([0, 0, 10, 0, 0, 0, 0, 0])!;
    expect(m).toBeGreaterThanOrEqual(1000);
    expect(m).toBeLessThan(1400);
  });
});

describe('peaks', () => {
  it('best ever only once a skill is past provisional, and never goes down', () => {
    const at = new Date(2026, 10, 1, 12).toISOString();
    const prov = statsAfterResult({}, result('a', at, [{ ok: true }]), { intervals: { r: 1100, n: 3, correct: 3, recent: [] } });
    expect(prov.peaks?.intervals).toBeUndefined();
    const st1 = statsAfterResult(prov, result('b', at, [{ ok: true }]), { intervals: { r: 1200, n: 12, correct: 10, recent: [] } });
    expect(st1.peaks!.intervals!.r).toBe(1200);
    const st2 = statsAfterResult(st1, result('c', at, [{ ok: false }]), { intervals: { r: 1150, n: 13, correct: 10, recent: [] } });
    expect(st2.peaks!.intervals!.r).toBe(1200);
    expect(st2.statsDays!['2026-11-01'].bySkillR!.intervals).toBe(1150);
  });
});

describe('award tiers (§5, S2, S7, S14)', () => {
  it('threshold crossing', () => {
    expect(tierOf(9, [10, 50, 200, 1000])).toBe(0);
    expect(tierOf(10, [10, 50, 200, 1000])).toBe(1);
    expect(tierOf(250, [10, 50, 200, 1000])).toBe(3);
    expect(tierOf(4, [5], true)).toBe(1);
    expect(tierOf(null, [5], true)).toBe(0);
  });
  it('tiers come from counters, keep the earned date and merge as max tier / earliest date', () => {
    const p = { ...emptyProgress(), counts: { lessons: 55, duelsWon: 1 } };
    const list = achievements(p);
    const lessons = list.find((a) => a.id === 'ten-lessons')!;
    expect(lessons).toMatchObject({ tier: 2, next: 200, got: true });
    const first = earnAwards(undefined, list, '2026-11-01T10:00:00Z');
    expect(first.awards['ten-lessons']).toEqual({ tier: 2, at: '2026-11-01T10:00:00Z' });
    expect(first.newly.some((x) => x.id === 'duels-won')).toBe(true);
    const again = earnAwards(first.awards, list, '2026-11-05T10:00:00Z');
    expect(again.newly).toEqual([]);
    expect(mergeAwards({ a: { tier: 2, at: '2026-03-01' } }, { a: { tier: 2, at: '2026-02-01' }, b: { tier: 1, at: '2026-01-01' } })).toEqual({ a: { tier: 2, at: '2026-02-01' }, b: { tier: 1, at: '2026-01-01' } });
    expect(mergeAwards({ a: { tier: 1, at: '2026-01-01' } }, { a: { tier: 3, at: '2026-05-01' } }).a.tier).toBe(3);
  });
  it('a stored award is never taken away; first launch awards silently', () => {
    const p = { ...emptyProgress(), awards: { 'ten-lessons': { tier: 3, at: '2026-01-01' } } };
    expect(achievements(p).find((a) => a.id === 'ten-lessons')!.tier).toBe(3);
    const q = { ...emptyProgress(), counts: { lessons: 12 } };
    const f = firstLaunchAwards(q, {}, '2026-11-07T00:00:00Z');
    expect(f.count).toBeGreaterThan(0);
    expect(f.awards['ten-lessons'].pre).toBe(true);
  });
  it('closest to unlock: the top 3 by progress, started and unfinished', () => {
    const p = { ...emptyProgress(), counts: { lessons: 9, duelsWon: 0, gates: 50 } };
    const c = closestToUnlock(achievements(p));
    expect(c.length).toBeLessThanOrEqual(3);
    expect(c[0].id).toBe('ten-lessons');
    expect(c.every((a) => a.progress > 0 && a.progress < 1)).toBe(true);
  });
});

describe('insights (S8, S15)', () => {
  it('time-of-day buckets', () => {
    expect([5, 11, 12, 16, 17, 21, 22, 4].map(dayPartOf)).toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night']);
    const n = new Array(168).fill(0);
    const ok = new Array(168).fill(0);
    n[8] = 40; ok[8] = 36; // Sunday 08:00
    n[24 + 20] = 40; ok[24 + 20] = 20; // Monday 20:00
    const b = timeOfDayBuckets({ n, ok });
    expect(b.find((x) => x.key === 'morning')).toMatchObject({ n: 40, ok: 36 });
    expect(compareBuckets(b)).toMatchObject({ best: { key: 'morning' }, worst: { key: 'evening' }, diff: 40 });
  });
  it('needs ≥ 30 items per bucket and a ≥ 10-point difference', () => {
    expect(compareBuckets([{ key: 'a', n: 29, ok: 29 }, { key: 'b', n: 100, ok: 10 }])).toBeNull();
    expect(compareBuckets([{ key: 'a', n: 30, ok: 27 }, { key: 'b', n: 30, ok: 25 }])).toBeNull();
  });
  it('strongest / weakest need n ≥ 20', () => {
    expect(strongWeak({ intervals: [19, 19], chords: [40, 10] })).toBeNull();
    expect(strongWeak({ intervals: [20, 19], chords: [40, 10], degrees: [30, 20] })).toMatchObject({ strong: { key: 'intervals' }, weak: { key: 'chords' } });
  });
});

describe('compare and percentile (S4, S13)', () => {
  it('radar overlay keeps unmeasured areas as null (never zero)', () => {
    const rows = compareAreas({ pitch: 1100, time: 950 }, { pitch: 1200, voice: 1000 });
    expect(rows.find((r) => r.d === 'pitch')).toEqual({ d: 'pitch', me: 1100, them: 1200 });
    expect(rows.find((r) => r.d === 'time')).toEqual({ d: 'time', me: 950, them: null });
    expect(rows.find((r) => r.d === 'voice')).toEqual({ d: 'voice', me: null, them: 1000 });
    expect(compareAreas({ pitch: 1 }, null).every((r) => r.them === null)).toBe(true);
  });
  it('percentile among a group: lower share, ties half, groups under 5 hidden', () => {
    expect(percentile(1000, [900, 950, 1000, 1100])).toBeNull();
    expect(percentile(1000, [900, 950, 1000, 1100, 1200])).toBe(50);
    expect(percentile(1300, [900, 950, 1000, 1100, 1200])).toBe(100);
  });
  it('duel record head to head', () => {
    const d = [
      { other: 'f', myPoints: 3, theirPoints: 1 },
      { other: 'f', myPoints: 1, theirPoints: 2 },
      { other: 'f', myPoints: 2, theirPoints: 2 },
      { other: 'f', myPoints: null, theirPoints: 2 },
      { other: 'g', myPoints: 3, theirPoints: 1 },
    ];
    expect(duelRecord(d, 'f')).toEqual({ w: 1, l: 1, d: 1 });
  });
});

describe('history, calendar, records, month in review', () => {
  const days = {
    '2026-08-02': { items: 25, correct: 24, ms: 0, xp: 30, sessions: 2, byArea: { pitch: [25, 24] as [number, number] }, bySkillR: { intervals: 1000 } },
    '2026-10-03': { items: 10, correct: 5, ms: 0, xp: 10, sessions: 1, byArea: { time: [10, 5] as [number, number] }, bySkillR: { intervals: 1050 } },
    '2026-10-04': { items: 12, correct: 6, ms: 0, xp: 10, sessions: 1, byArea: {}, bySkillR: { intervals: 1080 } },
    '2026-10-20': { items: 30, correct: 24, ms: 0, xp: 40, sessions: 2, byArea: {}, bySkillR: { intervals: 1120 } },
  };
  it('sessions beyond the kept history are day rows (S17)', () => {
    const kept = [{ sessionId: 'k', lessonId: 'intervals-1', completedAt: new Date(2026, 9, 20, 12).toISOString(), firstTry: 4, total: 5, xp: 10, items: [] }];
    const rows = historyRows(kept, days, 'all', TODAY);
    expect(rows[0].type).toBe('session');
    expect(rows.filter((r) => r.type === 'day').map((r) => r.day)).toEqual(['2026-10-04', '2026-10-03', '2026-08-02']);
    expect(historyRows(kept, days, 'all', TODAY, { area: 'pitch' }).filter((r) => r.type === 'day').map((r) => r.day)).toEqual(['2026-08-02']);
  });
  it('activity calendar ends on today, Sunday-first columns', () => {
    const cal = activityCalendar(days, TODAY, 53);
    expect(cal).toHaveLength(53);
    const last = cal[52];
    expect(last[0].day).toBe('2026-11-01');
    expect(last.find((c) => c.day === TODAY)!.future).toBe(false);
    expect(last[6].day).toBe(TODAY); // 2026-11-07 is a Saturday
    expect(activityCalendar(days, '2026-11-04', 53)[52][6].future).toBe(true);
    expect(cal.flat().find((c) => c.day === '2026-10-20')!.level).toBe(3);
  });
  it('personal records (S20)', () => {
    const r = personalRecords({ run: { n: 14, at: '2026-10-20T10:00:00Z' } }, days, ['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(r.bestDay).toMatchObject({ day: '2026-08-02', items: 25 });
    expect(r.streak).toEqual({ n: 3, end: '2026-10-05' });
    expect(r.run!.n).toBe(14);
  });
  it('month in review needs ≥ 3 days and is offered once after the month end (S16)', () => {
    const m = monthReview(days, { 'ten-lessons': { tier: 1, at: '2026-10-21T10:00:00Z' } }, '2026-10')!;
    expect(m).toMatchObject({ days: 3, items: 52, xp: 60 });
    expect(m.gains[0]).toMatchObject({ skill: 'intervals', from: 1000, to: 1120, d: 120 });
    expect(m.awards).toEqual([{ id: 'ten-lessons', tier: 1 }]);
    expect(monthReview(days, undefined, '2026-08')).toBeNull();
    expect(dueMonthReview(TODAY, null, days)).toBe('2026-10');
    expect(dueMonthReview(TODAY, '2026-10', days)).toBeNull();
  });
  it('me vs past me compares with the equally long window before', () => {
    const { now, before } = pastMe(days, '30d', '2026-10-25');
    expect(now.items).toBe(52);
    expect(before!.items).toBe(0);
    expect(pastMe(days, 'all', TODAY).before).toBeNull();
  });
});
