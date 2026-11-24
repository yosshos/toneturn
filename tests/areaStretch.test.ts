// SPEC-PRACTICE-SESSION §11.5 (the weaker / stronger area) and §11.4 (rating gained into the week's gains).
import { describe, expect, it } from 'vitest';
import { answerAreaTilt, answerStretchFactor, areaStretch, areaTilt, beyondShare, instrumentAreaOfKind, instrumentAreaStretch, takeInWeakerArea, weakStrong, weekDomainMinutes, AREA_MIN_WEEK } from '../src/engine/areaStretch';
import { takeBand } from '../src/engine/stretch';
import { stretchBase } from '../src/engine/session';
import { bookTime, emptyLedger } from '../src/engine/practiceTime';
import { foldRatings, ratingGain, type RatingEvent, type Ratings } from '../src/engine/rating';
import { applyResult, emptyProgress, mergeRewards, withRatingGain, withWeekGains, type LessonResult } from '../src/storage/progress';
import type { Question } from '../src/engine/lesson';

const MIN = 60_000;

describe('§11.5 weakest and strongest area', () => {
  it('needs two measured areas, AREA_GAP apart', () => {
    expect(weakStrong({ pitch: 0.4, time: 0.7, memory: null })).toEqual({ weakest: 'pitch', strongest: 'time' });
    expect(weakStrong({ pitch: 0.4, time: undefined })).toEqual({ weakest: null, strongest: null });
    expect(weakStrong({ pitch: 0.5, time: 0.52 })).toEqual({ weakest: null, strongest: null });
  });
  it('beyond its share: the area got more than its planned share of the week (20 minutes at least)', () => {
    expect(beyondShare({ tech: 30, improv: 10 }, { tech: 0.7, improv: 0.3 }, 'tech')).toBe(true); // 75 % > 70 %
    expect(beyondShare({ tech: 26, improv: 14 }, { tech: 0.7, improv: 0.3 }, 'tech')).toBe(false); // 65 %
    expect(beyondShare({ tech: 26, improv: 14 }, { tech: 0.7, improv: 0.3 }, 'improv')).toBe(true); // 35 % > 30 %
    expect(beyondShare({ tech: AREA_MIN_WEEK - 1, improv: 0 }, { tech: 0.5, improv: 0.5 }, 'tech')).toBe(false); // too little measured
    expect(beyondShare({ a: 30 }, { a: 1, b: 1 }, 'c')).toBe(false);
  });
  it('the tilt: ×1.2 on the weakest past its share, ×0.8 on the strongest past its share', () => {
    const planned = { pitch: 1, time: 1, reading: 1 };
    const a = areaStretch({ pitch: 0.3, time: 0.5, reading: 0.8 }, { pitch: 20, time: 5, reading: 15 }, planned);
    expect(a).toEqual({ weakest: 'pitch', strongest: 'reading', weakBeyond: true, strongBeyond: true });
    expect(areaTilt(a)).toEqual({ pitch: 1.2, reading: 0.8 });
    const b = areaStretch({ pitch: 0.3, time: 0.5, reading: 0.8 }, { pitch: 5, time: 30, reading: 5 }, planned);
    expect(areaTilt(b)).toEqual({});
  });
  it('the combined answer factor stays within 0.3–1.5', () => {
    expect(answerStretchFactor(0.5, 1.2)).toBe(1.5); // 1.3 × 1.2 = 1.56 → 1.5
    expect(answerStretchFactor(0.97, 0.8)).toBeCloseTo(0.4); // 0.5 × 0.8
    expect(answerStretchFactor(0.8, 0.8)).toBeCloseTo(0.8);
    expect(answerStretchFactor(undefined, 1.2)).toBeCloseTo(1.2);
    expect(answerStretchFactor(0.8)).toBe(1);
    expect(answerStretchFactor(0.97, 0.1)).toBe(0.3);
  });
});

describe('§11.5 an instrument course: takes in the weakest area', () => {
  it('technique furthest from its target and past its share → a take there is stretch', () => {
    const a = instrumentAreaStretch({ tech: 0.4, improv: 0.8 }, { tech: 36, improv: 4 }, 0.7);
    expect(takeInWeakerArea(a, 'tech')).toBe(true);
    expect(takeInWeakerArea(a, 'improv')).toBe(false);
    expect(takeInWeakerArea(instrumentAreaStretch({ tech: 0.4, improv: 0.8 }, { tech: 20, improv: 20 }, 0.7), 'tech')).toBe(false); // within its share
    expect(takeInWeakerArea(instrumentAreaStretch({ tech: 0.4 }, { tech: 40 }, 0.7), 'tech')).toBe(false); // improvisation not measured
  });
  it('the area of a screen', () => {
    expect(instrumentAreaOfKind('technique')).toBe('tech');
    expect(instrumentAreaOfKind('improv')).toBe('improv');
    expect(instrumentAreaOfKind('piece')).toBe('improv');
    expect(instrumentAreaOfKind('game')).toBeNull();
    expect(instrumentAreaOfKind(null)).toBeNull();
  });
  it('takeBand: the weaker area is stretch where no earlier rule applied (a closed item not due included)', () => {
    const base = { status: 'closed' as const, clean: true, takeBpm: 100, bestBpm: 100 };
    expect(takeBand(base).band).toBe('comfort');
    expect(takeBand({ ...base, weakerArea: true })).toMatchObject({ band: 'stretch', reason: 'weakArea' });
  });
});

describe('§11.5 lessons in the Ear course', () => {
  const r = (v: number, n = 20) => ({ r: v, n, correct: n, recent: [] });
  const ratings: Ratings = { intervals: r(800), degrees: r(800), rhythm: r(1100), timing: r(1100), notes: r(1500), sight: r(1500) };
  it('the week per area from the ledger (time under a rating skill)', () => {
    let l = emptyLedger('2026-11-01');
    l = bookTime(l, '2026-11-23', { course: 'ear', kind: 'lesson', skill: 'intervals', q: 'edge' }, 25 * MIN);
    l = bookTime(l, '2026-11-24', { course: 'ear', kind: 'lesson', skill: 'notes', q: 'edge' }, 15 * MIN);
    l = bookTime(l, '2026-11-24', { course: 'ear', kind: 'game', skill: 'flight', q: 'run' }, 9 * MIN); // not a rating skill
    l = bookTime(l, '2026-11-10', { course: 'ear', kind: 'lesson', skill: 'rhythm', q: 'edge' }, 60 * MIN); // older than 7 days
    expect(weekDomainMinutes(l, '2026-11-24', 'ear', ['pitch', 'time', 'memory', 'reading'])).toEqual({ pitch: 25, time: 0, memory: 0, reading: 15 });
    // pitch (weakest) got 25 of 40 minutes > a quarter; reading (strongest) 15 of 40 > a quarter
    expect(answerAreaTilt('ear', ratings, l, '2026-11-24')).toEqual({ pitch: 1.2, reading: 0.8 });
  });
  it('no tilt in a course with one answer area, or without a week measured', () => {
    expect(answerAreaTilt('keys', ratings, emptyLedger('2026-11-01'), '2026-11-24')).toEqual({});
    expect(answerAreaTilt('ear', ratings, emptyLedger('2026-11-01'), '2026-11-24')).toEqual({});
  });
  it("an answer's base XP: the Elo factor × the area tilt (by the question's area)", () => {
    const q = { kind: 'interval', difficulty: 1000, skill: 'intervals' } as unknown as Question;
    // rating 1000 vs difficulty 1000: expected 0.5 → ×1.3; weakest area past its share ×1.2 → 1.56 → capped 1.5
    expect(stretchBase({ ratings: { intervals: 1000 }, areaTilt: { pitch: 1.2 } }, q, 10)).toBeCloseTo(15);
    expect(stretchBase({ ratings: { intervals: 1000 } }, q, 10)).toBeCloseTo(13);
    expect(stretchBase({ areaTilt: { pitch: 0.8 } }, q, 10)).toBeCloseTo(8);
    expect(stretchBase({ areaTilt: { reading: 0.8 } }, q, 10)).toBe(10); // another area's tilt
  });
});

describe('§11.4 rating gained into the week', () => {
  const ev = (id: string, correct: boolean, at = '2026-11-24T12:00:00Z', o: Partial<RatingEvent> = {}): RatingEvent => ({ id, skill: 'intervals', difficulty: 1100, correct, at, ...o });
  it('sums the net rise per skill; falls give nothing; a placement set is not a gain', () => {
    const up = ratingGain({}, [ev('a', true)]);
    expect(up).toBeGreaterThan(0);
    expect(ratingGain({}, [ev('a', false)])).toBe(0);
    expect(ratingGain({}, [ev('s', true, '2026-11-24T12:00:00Z', { set: 1400 })])).toBe(0);
    // two skills: one up, one down — only the rise counts
    const mixed = ratingGain({}, [ev('a', true), ev('b', false, '2026-11-24T12:01:00Z', { skill: 'rhythm' })]);
    expect(mixed).toBe(up);
    // the same id twice counts once
    expect(ratingGain({}, [ev('a', true), ev('a', true)])).toBe(up);
    // equals the fold's change
    expect(up).toBe((foldRatings([ev('a', true)]).intervals?.r ?? 0) - 1000);
  });
  it('withRatingGain adds into the week of the latest event; nothing new → the same progress', () => {
    const p0 = emptyProgress();
    const p = withRatingGain(p0, [ev('a', true)]);
    expect(p.weekGains?.['2026-11-23']?.rating).toBeGreaterThan(0);
    expect(withRatingGain(p0, [ev('a', false)])).toBe(p0);
    const known = { ...p0, ratingEvents: [ev('a', true)] };
    expect(withRatingGain(known, [ev('a', true)])).toBe(known);
  });
  it('a completed lesson writes its rating gain into the week (and keeps the week’s other gains)', () => {
    const r: LessonResult = { lessonId: 'intervals-1', lessonVersion: 1, sessionId: 'x1', completedAt: '2026-11-24T12:00:00Z', firstTry: 2, total: 2, xp: 10, missed: [], items: [
      { id: 'x1:q1', skill: 'intervals', difficulty: 1100, correct: true, tag: 'P5' },
      { id: 'x1:q2', skill: 'intervals', difficulty: 1150, correct: true, tag: 'M3' },
    ] };
    const p0 = withWeekGains(emptyProgress(), '2026-11-24', { records: 2 });
    const p = applyResult(p0, r, new Date(r.completedAt));
    expect(p.weekGains?.['2026-11-23']?.records).toBe(2);
    expect(p.weekGains?.['2026-11-23']?.rating).toBeGreaterThan(0);
    // idempotent: the same result again changes nothing
    expect(applyResult(p, r, new Date(r.completedAt))).toBe(p);
  });
  it('a second result keeps the first one’s rating events and adds its own (the stats merge restores nothing)', () => {
    const mk = (s: string): LessonResult => ({ lessonId: 'intervals-1', lessonVersion: 1, sessionId: s, completedAt: '2026-11-24T12:00:00Z', firstTry: 1, total: 1, xp: 5, missed: [], items: [{ id: `${s}:q1`, skill: 'intervals', difficulty: 1100, correct: true, tag: 'P5' }] });
    const p1 = applyResult(emptyProgress(), mk('a'), new Date('2026-11-24T12:00:00Z'));
    const p2 = applyResult(p1, mk('b'), new Date('2026-11-24T12:00:00Z'));
    expect(p2.ratingEvents?.map((e) => e.id)).toEqual(['a:q1', 'b:q1']);
    expect(p2.weekGains?.['2026-11-23']?.rating ?? 0).toBeGreaterThan(p1.weekGains?.['2026-11-23']?.rating ?? 0);
    expect(p2.counts?.lessons).toBe(2);
  });
  it('a sync rebuild keeps the larger rating gain per week', () => {
    const a = withWeekGains(emptyProgress(), '2026-11-24', { rating: 40, records: 1 });
    const b = withWeekGains(emptyProgress(), '2026-11-24', { rating: 25, records: 3 });
    expect(mergeRewards(a, b).weekGains?.['2026-11-23']).toEqual({ rating: 40, records: 3 });
  });
});
