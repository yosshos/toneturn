// SPEC-PROGRESS-CHARTS audit fixes (2026-11-23): the Ear course's own areas in the snapshots and its "Over time" tab;
// the snapshot rewritten after every session end (any booking in the ledger); the snapshot's full fields (the 7-step
// ladder, minutes per channel, the week's mix and its target, vocab, improvisation); charts 4 (area filter), 6 (mix vs
// target), 7 (the planned split), 8 (language), 9 (improvisation + mode × function); the time frame remembered; the
// small charts in the places (item tempo, key line, the weekly ring, the weekly summary); the teacher's charts and the
// parent digest (through the mock snapshot backend).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { daySnapshot, earStatus, EAR_AREAS, backfillSnapshots, type Snapshot } from '../src/engine/snapshot';
import { earSteps } from '../src/engine/earSnapshot';
import { installSnapshotRecorder, loadSnapshots, noteImprovTake, recordSnapshot, resetSnapshotStore } from '../src/storage/snapshots';
import { ladderByWeek, languageSeries, minutesSplit, modeFunctionGrid, improvSeries, weekMix, weeklySummary, levelSeries, PLANNED_SPLIT } from '../src/engine/progressSeries';
import { ProgressOverTime, ownArea } from '../src/ui/ProgressOverTime';
import { areaLabel } from '../src/ui/Stats';
import { areaColor } from '../src/engine/areaColors';
import { ItemTempoChart, KeyClosedLine, WeeklyRingTile, WeeklySummaryCard, itemTempoPoints } from '../src/ui/PlaceCharts';
import { assignmentSpread, classAreas, classMedianOf, tempoSpread, askedMinutes, quantile } from '../src/engine/classCharts';
import { AssignmentAcrossClass, ClassAreasCard, DigestCharts, MinutesVsAsked } from '../src/ui/TeacherProgress';
import { MOCK_STUDENTS, mockSnapshotRpc, mockStudentSnaps } from '../src/cloud/snapshotsMock';
import { digestSnapshots, setSnapshotsBackend } from '../src/cloud/snapshots';
import type { ItemState } from '../src/engine/drills/types';
import { stepCatalogue } from '../src/engine/path';
import '../src/engine/topics';

const item = (id: string, family: string, key: number, target: number, log: [string, number][], extra: Partial<ItemState> = {}): ItemState =>
  ({ itemId: id, family, key, hands: 'R', cleanBpm: Math.max(0, ...log.map((x) => x[1])), goalBpm: target, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: log.length, last: log.at(-1)?.[0] ?? '', history: log.map(([at, bpm]) => ({ at, bpm, cv: 0 })), passLog: log.map(([at, bpm]) => ({ at, bpm })), targetBpm: target, ...extra }) as ItemState;
const closedLog: [string, number][] = [['2026-11-10T10:00:00Z', 80], ['2026-11-10T10:05:00Z', 80], ['2026-11-12T09:00:00Z', 80]];

describe('the Ear course gets its own areas (§1–2)', () => {
  it('its finished path steps count per Ear area (as its radar groups the skills)', () => {
    const facts = { steps: { 'topic:intervals:1': { stars: 3, at: '2026-11-10T10:00:00Z', firstAt: '2026-11-09T10:00:00Z' }, 'topic:intervals:2': { stars: 2, at: '2026-11-11T10:00:00Z' }, 'check:u1': { stars: 3, at: '2026-11-11T10:00:00Z' } } };
    const steps = earSteps(facts, (id) => (id.startsWith('topic:intervals') ? 'intervals' : undefined));
    expect(steps).toHaveLength(2);
    expect(earStatus(steps)).toEqual({ 'ear:pitch': { closed: 1, almost: 1 } });
    // a back-filled day before the last play counts it as learning
    expect(earStatus(steps, '2026-11-09')).toEqual({ 'ear:pitch': { learning: 1 } });
    const snap = daySnapshot('2026-11-12', {}, {}, { ear: { steps, level: { 'ear:pitch': 0.42 } } });
    expect(snap.status['ear:pitch']).toEqual({ closed: 1, almost: 1 });
    expect(snap.level).toEqual({ 'ear:pitch': 0.42 });
    const back = backfillSnapshots({}, {}, '2026-11-12', {}, steps);
    expect(back['2026-11-10'].status['ear:pitch']).toEqual({ closed: 1 });
    // real topics resolve through the path catalogue
    const real = stepCatalogue().find((x) => x.kind === 'topic' && x.skill === 'intervals')!;
    expect(earSteps({ steps: { [real.id]: { stars: 3, at: '2026-11-10T10:00:00Z' } } })).toEqual([{ skill: 'intervals', stars: 3, at: '2026-11-10T10:00:00Z' }]);
  });
  it("the Ear course's Over time shows its areas, not the instrument's; names and hues are its own", () => {
    expect(ownArea('ear')('ear:harmony')).toBe(true);
    expect(ownArea('ear')('keys:technique')).toBe(false);
    expect(ownArea('keys')('ear:harmony')).toBe(false);
    expect(areaLabel('ear:rhythm', 'he')).toBe('קצב');
    const hues = new Set(EAR_AREAS.map((a) => areaColor(a.id)));
    expect(hues.size).toBe(EAR_AREAS.length);
    const days = Array.from({ length: 20 }, (_, i) => new Date(Date.UTC(2026, 10, 1) + i * 86400000).toISOString().slice(0, 10));
    const snaps: Record<string, Snapshot> = Object.fromEntries(days.map((d, i) => [d, { day: d, status: { 'ear:pitch': { closed: Math.floor(i / 2), learning: 3 }, 'ear:harmony': { closed: Math.floor(i / 4), almost: 1 }, 'keys:technique': { closed: 9 } }, tempo: {}, minutes: { ear: 15 }, channels: { ear: null, reading: null }, keys: {}, vocab: { played: 0, closed: 0 }, practised: true, level: { 'ear:pitch': 0.3 + i * 0.01, 'ear:harmony': 0.2 } }]));
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'he', areaName: (a: string) => areaLabel(a, 'he'), today: days.at(-1)!, snapshots: snaps, course: 'ear' }));
    expect(html).toContain('data-area="ear:pitch"');
    expect(html).toContain('data-area="ear:harmony"');
    expect(html).not.toContain('data-area="keys:technique"');
    expect(html).toContain('data-ear-levels="2"');
    expect(levelSeries(Object.values(snaps), 'ear:pitch')).toHaveLength(20);
  });
});

describe('the snapshot is rewritten after every session end (§1)', () => {
  beforeEach(() => resetSnapshotStore());
  it('any ledger booking schedules a write (debounced) with the latest inputs', async () => {
    vi.useFakeTimers();
    const subs: (() => void)[] = [];
    let items: Record<string, ItemState> = {};
    const ledger: Record<string, Record<string, number>> = {};
    const r = installSnapshotRecorder((cb) => (subs.push(cb), () => void subs.splice(subs.indexOf(cb), 1)), () => ({ today: '2026-11-23', items, ledgerDays: ledger }), 1000);
    // an ear lesson ends: the ledger books its minutes (no drill item changed)
    ledger['2026-11-23'] = { '|ear|intervals||run': 300000 };
    subs.forEach((f) => f());
    // a game run right after: one write, not two
    ledger['2026-11-23']['|game|rush-interval||run'] = 120000;
    subs.forEach((f) => f());
    items = { a: item('a', 'scales', 0, 80, closedLog) };
    await vi.advanceTimersByTimeAsync(1500);
    vi.useRealTimers();
    await new Promise((res) => setTimeout(res, 20));
    const all = await loadSnapshots();
    expect(all['2026-11-23'].minutes).toEqual({ ear: 5, games: 2 });
    expect(all['2026-11-23'].status['keys:technique']).toEqual({ closed: 1 });
    r.stop();
    expect(subs).toHaveLength(0);
  });
  it("the day's improvisation takes give the in-scale rate", async () => {
    await noteImprovTake('2026-11-23', 0.8);
    await noteImprovTake('2026-11-23', 0.6);
    const all = await recordSnapshot('2026-11-23', {}, {}, { modeStats: { 'V-free|lydian-dom': { n: 3, cov: 0.5, last: '2026-11-23' } } });
    expect(all['2026-11-23'].improv?.inScale).toBeCloseTo(0.7);
    expect(all['2026-11-23'].improv?.cov).toBeCloseTo(0.5);
  });
});

describe('the snapshot fields per §1', () => {
  it('the full ladder above closed (12 keys, in my language, in the fingers), vocab, channels, improvisation', () => {
    const items: Record<string, ItemState> = {};
    // a pattern closed in all 12 keys
    for (let k = 0; k < 12; k++) items[`p${k}`] = item(`scales:major:${k}:R:0`, 'scales', k, 80, closedLog);
    // one closed from memory (in the fingers), one lick closed and used in 3 sessions and 2 keys (in my language)
    items.mem = item('arpeggios:x:0:R:0', 'arpeggios', 0, 80, closedLog, { channels: { unaided: { n: 2, clean: 2, best: 80 }, 'page-known': { n: 3, clean: 3, best: 80 } } });
    items.lick = item('lick:maj-arp:0', 'licks', 0, 80, closedLog, { channels: { 'ear-known': { n: 2, clean: 1, best: 70 } } });
    items.lick2 = item('lick:dom-arp9:0', 'licks', 0, 80, [['2026-11-12T10:00:00Z', 50]]);
    const uses = [1, 2, 3].map((n) => ({ id: 'maj-arp', key: n % 2, session: `s${n}`, kind: 'exact' as const, at: '' }));
    const prior = { ...daySnapshot('2026-11-22', {}), chTakes: { ear: 0, page: 1, memory: 0 } };
    const weekAgo = { ...daySnapshot('2026-11-16', {}), chTakes: { ear: 0, page: 0, memory: 0 } };
    const s = daySnapshot('2026-11-23', items, { 'keys|technique|scales|0|run': 600000 }, { book: { own: [{}, {}], uses }, prior, weekAgo, mixTarget: { ear: 0.2, page: 0.7, memory: 0.1 }, modeStats: { 'I|lydian': { n: 2, cov: 1, last: '' }, 'V-free|altered': { n: 2, cov: 0, last: '' } } });
    expect(s.status['keys:technique']?.closed).toBe(13);
    expect(s.ladder?.['keys:technique']?.keys12).toBe(12);
    expect(s.ladder?.['keys:technique']?.fingers).toBe(1);
    expect(s.ladder?.lick?.language).toBe(1);
    expect(s.vocab).toMatchObject({ learned: 1, practice: 1, language: 1, encore: 2 });
    expect(s.chTakes).toEqual({ ear: 2, page: 3, memory: 2 });
    expect(s.chMinutes).toEqual({ ear: 3.3, page: 3.3, memory: 3.3 });
    expect(s.mix).toEqual({ ear: 0.286, page: 0.429, memory: 0.286 });
    expect(s.mixTarget).toEqual({ ear: 0.2, page: 0.7, memory: 0.1 });
    expect(s.improv?.map).toEqual({ 'I|lydian': 1, 'V-free|altered': 0 });
    expect(s.improv?.cov).toBeCloseTo(0.5);
  });
});

// a month of rich snapshots for the charts
const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 9, 25) + i * 86400000).toISOString().slice(0, 10));
const rich: Record<string, Snapshot> = Object.fromEntries(
  days.map((d, i) => [
    d,
    {
      day: d,
      status: { 'keys:technique': { closed: 4 + Math.floor(i / 3), learning: 4, almost: 2 }, 'keys:harmony': { learning: 3, closed: Math.floor(i / 6) }, 'keys:improv': { learning: 2, closed: 1 }, lick: { closed: 2, learning: 1 } },
      ladder: { 'keys:technique': { keys12: 2, fingers: i > 20 ? 1 : 0 }, lick: { language: 1 } },
      tempo: { 'keys:technique': 0.6 + i * 0.01, 'keys:harmony': 0.5, 'keys:improv': 0.7, lick: 0.4 + i * 0.005 },
      minutes: { technique: 20 + (i > 22 ? 15 : 0), improv: 6, ear: 4 },
      channels: { ear: 0.8, reading: 0.3 + i * 0.01 },
      keys: { 0: 0.5, 7: 0.2 },
      vocab: { played: 3, closed: 2, learned: 1 + Math.floor(i / 10), practice: 1, language: Math.floor(i / 15) },
      practised: true,
      mix: { ear: 0.15, page: 0.75, memory: 0.1 },
      mixTarget: { ear: 0.25, page: 0.65, memory: 0.1 },
      improv: { cov: 0.3 + i * 0.01, inScale: i % 2 ? 0.8 : null, map: { 'I|lydian': 0.7, 'V-free|altered': 0.2, 'ii|dorian': 0.5 } },
    } as Snapshot,
  ]),
);
const today = days.at(-1)!;
const name = (a: string) => areaLabel(a, 'he');

describe('the series behind charts 3, 6–9 and the weekly summary', () => {
  const snaps = Object.values(rich);
  it('the ladder per week splits closed into the upper steps', () => {
    const w = ladderByWeek(snaps).at(-1)!;
    expect(w.by.keys12).toBe(2);
    expect(w.by.fingers).toBe(1);
    expect(w.by.language).toBe(1);
    expect(w.by.closed + w.by.keys12 + w.by.language + w.by.fingers).toBe(4 + 9 + 4 + 1 + 2);
  });
  it('the mix and its target, the planned split, language, improvisation, the mode × function grid', () => {
    expect(weekMix(snaps)).toEqual({ actual: { ear: 0.15, page: 0.75, memory: 0.1 }, target: { ear: 0.25, page: 0.65, memory: 0.1 } });
    const sp = minutesSplit(snaps);
    expect(sp.path + sp.technique + sp.improv + sp.other).toBeCloseTo(1, 2);
    expect(PLANNED_SPLIT.path + PLANNED_SPLIT.technique + PLANNED_SPLIT.improv).toBeCloseTo(1);
    expect(languageSeries(snaps).language.at(-1)!.v).toBe(1);
    expect(improvSeries(snaps, 'inScale').length).toBe(15);
    const g = modeFunctionGrid(snaps)!;
    expect(g.fns).toEqual(['I', 'V-free', 'ii']);
    expect(g.cell('ii', 'dorian')).toBe(0.5);
    expect(g.cell('I', 'dorian')).toBeNull();
  });
  it('the weekly summary: 4 tiles, the largest change, one sentence of fact', () => {
    const w = weeklySummary(rich, today, name, 'he');
    expect(w.tiles.map((t) => t.id)).toEqual(['minutes', 'closed', 'days', 'tempo']);
    expect(w.change?.kind).toBe('minutes');
    expect(w.change?.area).toBe('technique');
    expect(w.sentence).toContain('טכניקה');
  });
});

describe('the Over time tab: charts 4 and 6–9, the frame remembered (§0, §2)', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
  });
  it('renders the area filter (≤ 4), the mix bar, the planned split, language, improvisation and its heat map', () => {
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'he', areaName: name, today, snapshots: rich, course: 'keys' }));
    expect(html).toContain('data-tempo-area="keys:technique"');
    expect(html).toContain('data-multiline="4"');
    expect(html).toContain('data-mix-bar="1"');
    expect(html).toContain('data-share-row="target"');
    expect(html).toContain('data-planned-split="1"');
    expect(html).toContain('data-language-chart="1"');
    expect(html).toContain('data-improv-charts="1"');
    expect(html).toContain('data-mode-grid="3x3"');
    expect(html).toContain('בשפה שלי');
    expect(html).toContain('באצבעות');
    // LTR islands for every chart, a table toggle on each card
    expect((html.match(/class="pt-chart[^"]*" dir="ltr"/g) ?? []).length).toBeGreaterThan(8);
    expect((html.match(/data-table-toggle/g) ?? []).length).toBeGreaterThan(6);
  });
  it('the time frame is remembered per device', () => {
    localStorage.setItem('tt.progressFrame', '7d');
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'en', areaName: name, today, snapshots: rich }));
    expect(html).toContain('data-progress-time="7d"');
    localStorage.setItem('tt.progressFrame', 'all');
    // a frame not offered at this tenure falls back to the default
    expect(renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'en', areaName: name, today, snapshots: rich }))).toContain('data-progress-time="30d"');
  });
  it('a storage that throws never breaks the tab', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'en', areaName: name, today, snapshots: rich }))).toContain('data-progress-time="30d"');
  });
});

describe('the small charts in the places (§2, §5)', () => {
  it("an item's page: tempo over time with the target and the ceiling", () => {
    const st = item('scales:major:0:R:0', 'scales', 0, 120, [['2026-11-10T10:00:00Z', 80], ['2026-11-11T10:00:00Z', 88], ['2026-11-11T11:00:00Z', 90], ['2026-11-12T10:00:00Z', 92]], { ceiling: { bpm: 92, until: '2026-11-15' } });
    expect(itemTempoPoints(st).map((p) => p.v)).toEqual([80, 90, 92]);
    const html = renderToStaticMarkup(createElement(ItemTempoChart, { item: st, lang: 'he' }));
    expect(html).toContain('data-item-target="120"');
    expect(html).toContain('data-item-ceiling="92"');
    expect(html).toContain('dir="ltr"');
  });
  it('a key page: the share of the key closed over time', () => {
    const html = renderToStaticMarkup(createElement(KeyClosedLine, { root: 7, lang: 'en', name: 'G', snapshots: rich }));
    expect(html).toContain('data-key-line="7"');
  });
  it('Today: the weekly ring with ▲/▼, and the weekly summary card', () => {
    const ring = renderToStaticMarkup(createElement(WeeklyRingTile, { lang: 'he', today, snapshots: rich }));
    expect(ring).toMatch(/data-weekly-ring="\d+\/\d+"/);
    expect(ring).toContain('▲');
    const card = renderToStaticMarkup(createElement(WeeklySummaryCard, { lang: 'he', areaName: name, today, snapshots: rich, force: true }));
    expect(card).toContain('data-weekly-summary="minutes:technique"');
    expect((card.match(/data-tile=/g) ?? []).length).toBe(4);
    expect(card).toContain('wk-line');
  });
});

describe('the teacher (§4): the mock snapshot backend', () => {
  const todayM = new Date().toISOString().slice(0, 10);
  const studs = MOCK_STUDENTS.map((s) => ({ id: s.id, name: s.name, snaps: mockStudentSnaps(s) }));
  const localToday = Object.keys(studs[0].snaps).sort().at(-1)!;
  it('the class median per day, minutes a day against what was asked', () => {
    const med = classMedianOf(studs, Object.keys(studs[0].snaps).sort()[0], localToday);
    expect(med.length).toBeGreaterThan(20);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(askedMinutes({ a1: { minutes: 20 }, a2: { minutes: 30 } }, [{ id: 'a1', dueOn: null }, { id: 'a2', dueOn: '2000-01-01' }], todayM)).toBe(20);
    const html = renderToStaticMarkup(createElement(MinutesVsAsked, { snaps: studs[0].snaps, asked: 20, lang: 'he', today: localToday, who: 'Noa' }));
    expect(html).toContain('data-minutes-asked="20"');
    expect(html).toContain('pt-target');
  });
  it("one assignment across the class (median + quartile band, names below it) and the tempo spread's dots", () => {
    const created = Object.keys(studs[0].snaps).sort()[0] + 'T09:00:00Z';
    const a = { id: 'as1', kind: 'drill', ref: null, dueOn: null, strictness: 'moderate' as const, createdAt: created, targetBpm: 120, submissions: [
      { userId: 's1', createdAt: created, score: 0.9, metrics: { bpm: 118 } },
      { userId: 's3', createdAt: created, score: 0.95, metrics: { bpm: 126 } },
      { userId: 's2', createdAt: created, score: 0.5, metrics: { bpm: 80 } },
    ] };
    const sp = assignmentSpread(a, studs, localToday)!;
    expect(sp.median.at(-1)).toBe(0.5);
    expect(sp.q1.at(-1)).toBe(0);
    const dots = tempoSpread(a, studs);
    expect(dots.map((d) => d.id).sort()).toEqual(['s1', 's2', 's3']);
    expect(dots.find((d) => d.id === 's3')!.v).toBeCloseTo(1.05);
    const html = renderToStaticMarkup(createElement(AssignmentAcrossClass, { assignments: [a], students: studs, lang: 'he', today: localToday, titleOf: () => 'סולמות' }));
    expect(html).toContain('data-quartile-band="1"');
    expect(html).toContain('data-dot-strip="3"');
  });
  it('the class radar with a change column', () => {
    const areas = classAreas(studs, localToday);
    expect(areas.map((x) => x.id)).toEqual(['keys:technique', 'keys:harmony']);
    expect(areas[0].change).not.toBeNull();
    // a radar needs 3 areas: with 2 it says so quietly (nothing drawn)
    expect(renderToStaticMarkup(createElement(ClassAreasCard, { students: studs, lang: 'he', today: localToday, areaName: name }))).toBe('');
    const three = studs.map((s) => ({ ...s, snaps: Object.fromEntries(Object.entries(s.snaps).map(([d, x]) => [d, { ...x, status: { ...x.status, lick: { closed: 1, learning: 1 } } }])) }));
    const html = renderToStaticMarkup(createElement(ClassAreasCard, { students: three, lang: 'he', today: localToday, areaName: name }));
    expect(html).toContain('data-class-radar="3"');
    expect(html).toContain('data-change-row="keys:technique"');
  });
  it('the parent digest: tiles, the calendar, the week\'s minutes — from the digest RPC', async () => {
    setSnapshotsBackend(mockSnapshotRpc);
    const snaps = await digestSnapshots('tok-tok-tok-tok-tok-tok', '2000-01-01');
    setSnapshotsBackend(null);
    expect(Object.keys(snaps).length).toBe(28);
    const html = renderToStaticMarkup(createElement(DigestCharts, { snaps, lang: 'he', today: localToday, kindName: name }));
    expect(html).toContain('data-digest-charts="1"');
    expect((html.match(/data-tile=/g) ?? []).length).toBe(4);
    expect(html).toMatch(/data-calendar="\d+"/);
  });
  it("the student's §2 charts on the teacher's page, read-only, with the grey class median", () => {
    const med = classMedianOf(studs, Object.keys(studs[0].snaps).sort()[0], localToday);
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'he', areaName: name, today: localToday, snapshots: studs[0].snaps, median: med, readOnly: true }));
    expect(html).toContain('data-median-line="1"');
    expect(html).not.toContain('since-card');
  });
});
