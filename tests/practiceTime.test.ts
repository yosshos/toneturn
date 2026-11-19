import { describe, expect, it, beforeEach } from 'vitest';
import {
  IDLE_MS,
  STREAK_MIN_MS,
  addNote,
  bookItem,
  bookTime,
  bucketKey,
  clockInput,
  clockLap,
  clockTick,
  drillTakeQuality,
  emptyLedger,
  kindOfRoute,
  lessonQuality,
  measuredDays,
  measuredMsOn,
  migrateLedger,
  msByDay,
  newClock,
  parseBucket,
  practiceDigest,
  qualityRatio,
  summarize,
  weekStart,
  weekTotals,
  type Clock,
} from '../src/engine/practiceTime';
import { journalDays, latestNext, searchJournal } from '../src/engine/journal';
import { brokeThrough, detectPlateaus, itemFading, itemPlateau, otherKey, passedAtTarget, skillPlateaus, stepBack } from '../src/engine/plateau';
import { streakState, weekCovers } from '../src/engine/streak';
import { MEASURED_STREAK_FROM, addSessionStats, emptyProgress, practiceDays, applyResult, type LessonResult } from '../src/storage/progress';
import { mergeResults } from '../src/storage/sync';
import { _addPending, _resetPractice, addJournalNote, bookDrillTake, bookGameRun, bookResult, loadLedger } from '../src/storage/practice';
import type { ItemState } from '../src/engine/drills/types';

const item = (o: Partial<ItemState> = {}): ItemState => ({
  itemId: 'scales-1:0:RL',
  family: 'scales' as ItemState['family'],
  key: 0,
  hands: 'RL',
  cleanBpm: 80,
  goalBpm: 84,
  streak: 0,
  fails: 0,
  ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 },
  takes: 20,
  last: '2026-11-14T10:00:00.000Z',
  history: [],
  ...o,
});

describe('active clock (time accounting)', () => {
  it('counts only on a practice screen, visible, and within 60 s of input', () => {
    let c: Clock = { ...newClock(0), kind: 'technique' };
    for (let t = 1000; t <= 10_000; t += 1000) c = clockTick(c, t, true);
    expect(c.pending).toBe(10_000);
    // Hidden: nothing.
    c = clockTick(c, 11_000, false);
    expect(c.pending).toBe(10_000);
    // Idle beyond 60 s since the last input (at 0): nothing more.
    for (let t = 12_000; t <= IDLE_MS + 5000; t += 1000) c = clockTick(c, t, true);
    expect(c.pending).toBe(10_000 + (IDLE_MS - 11_000));
    // An input starts it again.
    c = clockInput(c, IDLE_MS + 6000);
    c = clockTick(c, IDLE_MS + 7000, true);
    expect(c.pending).toBe(10_000 + (IDLE_MS - 11_000) + 1000);
  });
  it('never books a long gap (a throttled timer) and nothing off a practice screen', () => {
    let c: Clock = { ...newClock(0), kind: 'lesson' };
    c = clockTick(c, 30_000, true);
    expect(c.pending).toBe(2000);
    let m: Clock = { ...newClock(0), kind: null };
    m = clockTick(m, 1000, true);
    expect(m.pending).toBe(0);
  });
  it('a lap takes the pending time and keeps the clock running', () => {
    const [c, ms] = clockLap({ ...newClock(0), kind: 'game', pending: 4321 });
    expect(ms).toBe(4321);
    expect(c.pending).toBe(0);
    expect(c.kind).toBe('game');
  });
  it('maps screens to kinds; menus and the tuner are not practice', () => {
    expect(kindOfRoute('drills')).toBe('technique');
    expect(kindOfRoute('lesson')).toBe('lesson');
    expect(kindOfRoute('mysong')).toBe('song');
    expect(kindOfRoute('flight')).toBe('game');
    expect(kindOfRoute('home')).toBeNull();
    expect(kindOfRoute('tuner')).toBeNull();
    expect(kindOfRoute('diary')).toBeNull();
    expect(kindOfRoute('workoutrun')).toBeNull();
  });
});

describe('ledger', () => {
  it('books time by bucket and sums it per course, kind, skill, key and quality', () => {
    let l = emptyLedger('2026-11-10');
    l = bookTime(l, '2026-11-10', { course: 'keys', kind: 'technique', skill: 'scales', key: 3, q: 'edge' }, 600_000);
    l = bookTime(l, '2026-11-10', { course: 'keys', kind: 'technique', skill: 'scales', key: 3, q: 'edge' }, 60_000);
    l = bookTime(l, '2026-11-11', { course: 'ear', kind: 'lesson', skill: 'intervals', q: 'consolidation' }, 300_000);
    l = bookTime(l, '2026-11-11', { course: 'ear', kind: 'game', skill: 'flight', q: 'run' }, 120_000);
    l = bookTime(l, '2026-11-12', { course: 'keys', kind: 'offapp', skill: 'piece', q: 'offapp' }, 1_800_000);
    const s = summarize(l, '2026-11-10', '2026-11-12');
    expect(s.ms).toBe(660_000 + 300_000 + 120_000 + 1_800_000);
    expect(s.inApp).toBe(1_080_000);
    expect(s.offApp).toBe(1_800_000);
    expect(s.quality).toBe(960_000);
    expect(s.byKind.technique).toBe(660_000);
    expect(s.byCourse.keys).toBe(660_000 + 1_800_000);
    expect(s.byKey['scales|3']).toBe(660_000);
    expect(qualityRatio(s)).toBeCloseTo(960 / 1080);
    expect(summarize(l, '2026-11-10', '2026-11-12', 'ear').ms).toBe(420_000);
    expect(msByDay(l)['2026-11-12']).toBe(1_800_000);
  });
  it('round-trips bucket keys', () => {
    const k = bucketKey({ course: 'keys', kind: 'technique', skill: 'bh|6dim', key: 14, q: 'review' });
    expect(parseBucket(k)).toEqual({ course: 'keys', kind: 'technique', skill: 'bh/6dim', key: 2, q: 'review' });
  });
  it('the quality ledger keeps cleanness and the best tempo per item and day', () => {
    let l = emptyLedger('2026-11-10');
    l = bookItem(l, 'd:x', '2026-11-10', { c: 0, ms: 1000 });
    l = bookItem(l, 'd:x', '2026-11-10', { c: 1, bpm: 92, ms: 2000 });
    l = bookItem(l, 'd:x', '2026-11-11', { c: 1, bpm: 96 });
    expect(l.items['d:x']).toEqual([
      { d: '2026-11-10', n: 2, c: 1, of: 2, ms: 3000, b: 92 },
      { d: '2026-11-11', n: 1, c: 1, of: 1, ms: 0, b: 96 },
    ]);
  });
  it('a corrupt or old store becomes a valid ledger', () => {
    expect(migrateLedger(null, '2026-11-15').days).toEqual({});
    expect(migrateLedger({ days: { a: {} }, notes: 'x' }, '2026-11-15').notes).toEqual([]);
  });
  it('classifies quality from the data the app has', () => {
    expect(drillTakeQuality({ cleanBpm: 80, goalBpm: 84, targetBpm: 120 }, true)).toBe('edge');
    expect(drillTakeQuality({ cleanBpm: 120, goalBpm: 120, targetBpm: 120 }, true)).toBe('consolidation');
    expect(drillTakeQuality({ cleanBpm: 120, goalBpm: 120, targetBpm: 120 }, false)).toBe('edge');
    expect(lessonQuality({ lessonId: 'review', firstTry: 5, total: 5 }, true)).toBe('review');
    expect(lessonQuality({ lessonId: 'intervals-3', firstTry: 10, total: 10 }, true)).toBe('consolidation');
    expect(lessonQuality({ lessonId: 'intervals-3', firstTry: 10, total: 10 }, false)).toBe('edge');
  });
  it('measured days need 5 in-app minutes; tools and off-app minutes do not count', () => {
    let l = emptyLedger('2026-11-10');
    l = bookTime(l, '2026-11-10', { kind: 'offapp', q: 'offapp' }, 3_600_000);
    l = bookTime(l, '2026-11-10', { kind: 'tool', q: 'run' }, 900_000);
    l = bookTime(l, '2026-11-11', { kind: 'song', q: 'run' }, STREAK_MIN_MS);
    expect(measuredMsOn(l, '2026-11-10')).toBe(0);
    expect(measuredDays(l)).toEqual(['2026-11-11']);
  });
  it('weeks are Monday-based; the digest names minutes and quality share', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-09'); // a Sunday
    let l = emptyLedger('2026-11-01');
    l = bookTime(l, '2026-11-10', { kind: 'technique', skill: 'scales', q: 'edge' }, 1_200_000);
    l = bookTime(l, '2026-11-11', { kind: 'game', skill: 'flight', q: 'run' }, 600_000);
    l = bookTime(l, '2026-11-03', { kind: 'game', q: 'run' }, 300_000);
    const w = weekTotals(l, '2026-11-15', 2);
    expect(w.map((x) => x.ms)).toEqual([300_000, 1_800_000]);
    const d = practiceDigest(l, '2026-11-15');
    expect(d).toMatchObject({ minutes: 30, qualityMinutes: 20, lastWeekMinutes: 5, topSkills: ['scales', 'flight'] });
    expect(d.qualityShare).toBeCloseTo(0.67, 2);
  });
});

describe('journal', () => {
  it('builds one entry a day from time, items, notes and results, and searches them', () => {
    let l = emptyLedger('2026-11-10');
    l = bookTime(l, '2026-11-10', { kind: 'technique', q: 'edge' }, 600_000);
    l = bookItem(l, 'd:a', '2026-11-09', { c: 1, bpm: 90 });
    l = bookItem(l, 'd:a', '2026-11-10', { c: 1, bpm: 96 });
    l = addNote(l, { id: 'n1', at: '2026-11-10T18:00:00Z', day: '2026-11-10', text: 'Left hand alone, bars 9–12' });
    l = addNote(l, { id: 'n2', at: '2026-11-10T18:01:00Z', day: '2026-11-10', text: 'Next: ii–V in D♭', next: true });
    const hist = [{ sessionId: 's1', lessonId: 'log:piece', completedAt: '2026-11-08T10:00:00Z', firstTry: 0, total: 20, note: 'Autumn Leaves head' }];
    const days = journalDays(l, hist, (iso) => iso.slice(0, 10));
    expect(days.map((d) => d.day)).toEqual(['2026-11-10', '2026-11-09', '2026-11-08']);
    expect(days[0].items[0]).toMatchObject({ id: 'd:a', b: 96, gain: 6 });
    expect(days[2].sessions[0]).toMatchObject({ offApp: true, note: 'Autumn Leaves head' });
    expect(searchJournal(days, 'autumn', (id) => id).map((d) => d.day)).toEqual(['2026-11-08']);
    expect(searchJournal(days, 'bars 9', (id) => id).map((d) => d.day)).toEqual(['2026-11-10']);
    expect(searchJournal(days, 'scale', (id) => (id === 'd:a' ? 'Scales C' : id)).map((d) => d.day)).toEqual(['2026-11-10', '2026-11-09']);
    expect(latestNext(l)?.id).toBe('n2');
  });
  it('notes are trimmed, capped and never duplicated', () => {
    let l = emptyLedger('2026-11-10');
    l = addNote(l, { id: 'a', at: 'x', day: '2026-11-10', text: '  ' });
    expect(l.notes).toHaveLength(0);
    l = addNote(l, { id: 'a', at: 'x', day: '2026-11-10', text: 'y'.repeat(900) });
    l = addNote(l, { id: 'a', at: 'x', day: '2026-11-10', text: 'again' });
    expect(l.notes).toHaveLength(1);
    expect(l.notes[0].text).toHaveLength(500);
  });
});

describe('plateau detector', () => {
  const today = '2026-11-15';
  const flatHist = [
    { at: '2026-10-01T10:00:00Z', bpm: 70, cv: 0 },
    { at: '2026-10-10T10:00:00Z', bpm: 80, cv: 0 },
    { at: '2026-10-28T10:00:00Z', bpm: 80, cv: 0 },
    { at: '2026-11-04T10:00:00Z', bpm: 81, cv: 0 },
    { at: '2026-11-10T10:00:00Z', bpm: 80, cv: 0 },
  ];
  it('flags a flat clean tempo over 3 weeks of practice', () => {
    const p = itemPlateau(item({ history: flatHist, targetBpm: 120 }), undefined, today);
    expect(p).toMatchObject({ kind: 'plateau', scope: 'item', now: 81, best: 80, days: 3 });
    expect(['slower', 'key', 'loop']).toContain(p!.how);
  });
  it('does not flag a rising item, a new item, an unpractised one or a passed one', () => {
    const rising = [...flatHist.slice(0, 2), { at: '2026-11-04T10:00:00Z', bpm: 86, cv: 0 }, { at: '2026-11-08T10:00:00Z', bpm: 88, cv: 0 }, { at: '2026-11-12T10:00:00Z', bpm: 90, cv: 0 }];
    expect(itemPlateau(item({ history: rising, targetBpm: 120 }), undefined, today)).toBeNull();
    expect(itemPlateau(item({ history: flatHist.slice(-3), targetBpm: 120 }), undefined, today)).toBeNull();
    expect(itemPlateau(item({ history: flatHist.slice(0, 3), targetBpm: 120 }), undefined, today)).toBeNull();
    const passLog = [{ at: '2026-11-10T10:00:00Z', bpm: 120 }, { at: '2026-11-10T10:05:00Z', bpm: 120 }, { at: '2026-11-11T10:00:00Z', bpm: 120 }];
    expect(passedAtTarget(item({ targetBpm: 120, passLog }))).toBe(true);
    expect(itemPlateau(item({ history: flatHist, targetBpm: 120, passLog }), undefined, today)).toBeNull();
  });
  it('rotates away from the suggestion tried last; reports a break-through', () => {
    const tried = { id: 'scales-1:0:RL', at: '2026-11-01T00:00:00Z', how: 'slower', base: 80 };
    for (let i = 0; i < 5; i++) expect(itemPlateau(item({ history: flatHist, targetBpm: 120, itemId: `scales-1:${i}:RL` }), undefined, today, tried)!.how).not.toBe('slower');
    expect(brokeThrough(tried, 84)).toBe(true);
    expect(brokeThrough(tried, 82)).toBe(false);
  });
  it('uses the quality ledger: stuck with no clean take at all → slow down first', () => {
    const led = ['2026-10-20', '2026-11-05', '2026-11-08', '2026-11-12'].map((d) => ({ d, n: 3, c: 0, of: 3, ms: 60000 }));
    expect(itemPlateau(item({ cleanBpm: 0, history: [] }), led, today)).toMatchObject({ how: 'slower', now: 0 });
  });
  it('flags fading: recent takes well under the best, or a falling clean share', () => {
    const led = [{ d: '2026-11-10', n: 4, c: 1, of: 4, b: 70, ms: 0 }];
    expect(itemFading(item({ cleanBpm: 100 }), led, today)).toMatchObject({ kind: 'fading', now: 70, best: 100, how: 'slower' });
    const led2 = [
      { d: '2026-10-20', n: 5, c: 5, of: 5, ms: 0 },
      { d: '2026-11-10', n: 5, c: 1, of: 5, ms: 0 },
    ];
    expect(itemFading(item({ cleanBpm: 0 }), led2, today)).toMatchObject({ kind: 'fading', how: 'loop', now: 20, best: 100 });
  });
  it('flags a flat skill rating over 4 weekly snapshots with practice each week, and a fading one', () => {
    const snaps = ['W1', 'W2', 'W3', 'W4', 'W5'].map((week, i) => ({ week, ratings: { intervals: 1200 + (i % 2) * 5, chords: [1300, 1400, 1450, 1380, 1350][i] } }));
    const f = skillPlateaus(snaps, () => 10);
    expect(f.find((x) => x.id === 'intervals')).toMatchObject({ kind: 'plateau', how: 'mix' });
    expect(f.find((x) => x.id === 'chords')).toMatchObject({ kind: 'fading' });
    expect(skillPlateaus(snaps, () => 1).find((x) => x.id === 'intervals')).toBeUndefined();
  });
  it('detectPlateaus lists plateaus before fading items', () => {
    const items = { a: item({ itemId: 'a', history: flatHist, targetBpm: 120 }), b: item({ itemId: 'b', cleanBpm: 100 }) };
    const f = detectPlateaus({ drillItems: items, ledgerItems: { 'd:b': [{ d: '2026-11-10', n: 4, c: 0, of: 4, b: 60, ms: 0 }] } }, today);
    expect(f.map((x) => [x.id, x.kind])).toEqual([
      ['a', 'plateau'],
      ['b', 'fading'],
    ]);
  });
  it('stepping back lowers only the goal; another key prefers an untouched one', () => {
    const s = stepBack(item({ cleanBpm: 100, goalBpm: 108, passLog: [{ at: 'x', bpm: 100 }] }));
    expect(s.goalBpm).toBe(85);
    expect(s.cleanBpm).toBe(100);
    expect(s.passLog).toHaveLength(1);
    const items = { a: item({ itemId: 'a', key: 0 }), b: item({ itemId: 'b', key: 7 }) };
    expect(otherKey(items, 'scales', 0, [0, 7, 2, 9])).toBe(2);
  });
});

describe('streak rules (AUDIT-5 #4)', () => {
  const log = (day: string): LessonResult => ({ lessonId: 'log:piece', lessonVersion: 1, sessionId: `log-${day}`, completedAt: `${day}T12:00:00`, firstTry: 0, total: 30, xp: 0, missed: [] });
  it('logged minutes no longer make a streak day (from the cut-over), but earlier days stay', () => {
    let p = emptyProgress();
    p = applyResult(p, log('2026-11-01'), new Date('2026-11-01T12:00:00'));
    p = applyResult(p, log('2026-11-20'), new Date('2026-11-20T12:00:00'));
    const days = practiceDays(p);
    expect(days.has('2026-11-01')).toBe(true);
    expect(days.has('2026-11-20')).toBe(false);
    expect(MEASURED_STREAK_FROM <= '2026-11-20').toBe(true);
    expect(addSessionStats(undefined, log('2026-11-20')).days).toEqual([]);
  });
  it('weekly-target mode: days off are rest days while the week makes its target', () => {
    // Mon 2026-11-02 … Sun 2026-11-08: 5 practice days; Mon 9 … today Fri 13: 3 so far, two days left.
    const days = ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-11', '2026-11-13'];
    const daily = streakState(days, [], '2026-11-13');
    const weekly = streakState(days, [], '2026-11-13', { weeklyTarget: 5 });
    expect(weekly.restDays).toEqual(['2026-11-04', '2026-11-07', '2026-11-10', '2026-11-12']);
    expect(weekly.count).toBe(8);
    expect(weekly.freezeDays).toEqual([]);
    // Week 2 (3 done, only today left) can no longer make 5: its gaps are freezes / breaks as usual.
    expect(weekCovers(new Set(days), '2026-11-10', '2026-11-15', 5)).toBe(false);
    expect(weekCovers(new Set(days), '2026-11-10', '2026-11-15', 3)).toBe(true);
    expect(daily.restDays).toBeUndefined();
  });
});

describe('sync keeps local-only result fields', () => {
  it('the measured duration and note survive a merge with the server copy', () => {
    const base: LessonResult = { lessonId: 'x', lessonVersion: 1, sessionId: 's', completedAt: '2026-11-10T00:00:00Z', firstTry: 1, total: 2, xp: 3, missed: [] };
    const merged = mergeResults([{ ...base, durationMs: 9000, note: 'n' }], [{ ...base, xp: 4 }]);
    expect(merged).toEqual([{ ...base, xp: 4, durationMs: 9000, note: 'n' }]);
  });
});

describe('practice store hooks', () => {
  beforeEach(() => _resetPractice());
  it('a drill take books the measured time on its family, key and quality, and its cleanness', () => {
    _addPending(90_000);
    const st = item({ history: [{ at: new Date().toISOString(), bpm: 92, cv: 0 }], cleanBpm: 92, targetBpm: 120 });
    bookDrillTake(st, item(), 'clean');
    const l = loadLedger();
    const s = summarize(l, '2000-01-01', '2999-01-01');
    expect(s.byKey['scales|0']).toBe(90_000);
    expect(s.byQuality.edge).toBe(90_000);
    const rows = l.items['d:scales-1:0:RL'];
    expect(rows[rows.length - 1]).toMatchObject({ n: 1, c: 1, b: 92 });
  });
  it('a lesson gets its duration; a log books off-app minutes and keeps its note; booking is idempotent', () => {
    _addPending(120_000, 'lesson');
    const r = bookResult<{ sessionId: string; lessonId: string; firstTry: number; total: number; durationMs?: number; items?: { skill: string }[] }>({ sessionId: 'L1', lessonId: 'intervals-1', firstTry: 9, total: 10, items: [{ skill: 'intervals' }] }, false);
    expect(r.durationMs).toBe(120_000);
    expect(bookResult<{ sessionId: string; lessonId: string; firstTry: number; total: number; durationMs?: number }>({ sessionId: 'L1', lessonId: 'intervals-1', firstTry: 9, total: 10 }, false).durationMs).toBeUndefined();
    bookResult({ sessionId: 'wk-1', lessonId: 'log:other', firstTry: 0, total: 25, note: 'Bars 9–12 slowly' }, false);
    bookResult({ sessionId: 'piece-1', lessonId: 'log:piece', firstTry: 0, total: 25 }, false);
    const l = loadLedger();
    const s = summarize(l, '2000-01-01', '2999-01-01');
    expect(s.offApp).toBe(25 * 60000);
    expect(s.byKind.lesson).toBe(120_000);
    expect(l.notes.map((n) => [n.text, n.src])).toEqual([['Bars 9–12 slowly', 'workout']]);
    addJournalNote('Next: Dm ii–V', { next: true });
    expect(latestNext(loadLedger())?.text).toBe('Next: Dm ii–V');
  });
  it('a game run below the cleared tier is a run-through; an uncleared tier is edge', () => {
    _addPending(30_000, 'game');
    bookGameRun('flight', { right: 8, of: 10, edge: true });
    _addPending(10_000, 'game');
    bookGameRun('flight', { pass: true });
    const s = summarize(loadLedger(), '2000-01-01', '2999-01-01');
    expect(s.byQuality.edge).toBe(30_000);
    expect(s.byQuality.run).toBe(10_000);
    expect(loadLedger().items['g:flight'][0]).toMatchObject({ n: 2, c: 9, of: 11 });
  });
});
