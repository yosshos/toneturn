// BUILD-PLAN-2026-11 phase 8 (Extras) + the rest of SPEC-PROGRESS-CHARTS: measured time and the projection (Progress
// page only, D5), the assignment burn-up and the teacher's alerts, the coach's tilt (client side) and the style taster
// suggestion, the Barry Harris way (RBI track B — verified content only), the combined sentence / reverse recognition /
// transpose by ear, the "new key" and "varied" lick cards, and the share cards. Everything connects for each new activity.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../src/engine/snapshot';
import { daySnapshot, stuckItems } from '../src/engine/snapshot';
import type { ItemState } from '../src/engine/drills/types';
import { daysAt, keyTimes, measuredPace, projection, spanWords } from '../src/engine/projection';
import { keyMatrix } from '../src/engine/drills/keyMatrix';
import { families } from '../src/engine/drills/plan';
import { alertsOf, burnup, type BurnAssign } from '../src/engine/burnup';
import { encodePhraseRef, decodePhraseRef } from '../src/engine/encore/assign';
import { activeTilt, isoWeek, proposeTilt, tasterNudge, TILT_MAX } from '../src/engine/aiTilt';
import { suggestWorkout } from '../src/engine/workout2';
import { tasterFor, offerShown } from '../src/engine/styleFocus';
import { AI_TILT_SERVER, setWeeklyExtra, weeklyExtraContext } from '../src/cloud/ai';
import { buildHarrisSheet, gradeHarris, HARRIS_TIERS, identityPcs, thoughtLabel, thoughtScale, TIERS } from '../src/engine/harrisTrack';
import { improvTake } from '../src/engine/rotationSheet';
import { combinedSentence, findEvents, gradeFind, learnedChannel, learnedLicks, passage, pickPair, sentenceChannel, sentenceDebrief, transposePlan } from '../src/engine/earVocab';
import { LICKS, lickDrill, type Lick } from '../src/engine/licks';
import { RULE_CARDS, type CardCtx, type CSpan } from '../src/engine/ruleCards';
import { CHALLENGES, VOCAB_RULES, RULE_NAME } from '../src/engine/improvRules';
import { lickEvents } from '../src/engine/licks';
import { PLACEMENT_ORDER } from '../src/engine/placement';
import { progressCardSvg, progressShareText } from '../src/ui/ShareCards';
import { lickShareCard } from '../src/ui/LickShare';

const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const snap = (day: string, o: Partial<Snapshot> = {}): Snapshot => ({ day, status: {}, tempo: {}, minutes: {}, channels: { ear: null, reading: null }, keys: {}, vocab: { played: 0, closed: 0 }, practised: false, ...o });
const TODAY = '2026-11-23';
const closedLick = (id: string, key: number, extra: Partial<ItemState> = {}): ItemState =>
  ({ itemId: `lick:${id}:piano:${key}`, family: 'licks', key, takes: 6, cleanBpm: 120, targetBpm: 120, passLog: [{ at: '2026-11-01T10:00:00Z', bpm: 120 }, { at: '2026-11-01T11:00:00Z', bpm: 120 }, { at: '2026-11-02T10:00:00Z', bpm: 120 }], history: [], last: '2026-11-02T10:00:00Z', ...extra }) as unknown as ItemState;

// ───────────────────────────── 1. measured time and the projection ─────────────────────────────

describe('measured time and the projection (D5: the Progress page only)', () => {
  const snaps: Record<string, Snapshot> = {};
  for (let k = 0; k < 14; k++) {
    const d = addDays(TODAY, -k);
    // practice on 10 of 14 days: 30 min technique + 10 improv
    snaps[d] = snap(d, k % 7 < 5 ? { minutes: { technique: 30, improv: 10 }, practised: true } : {});
  }
  it('the pace is the mean over the 14 calendar days (days off count as 0)', () => {
    const p = measuredPace(snaps, TODAY)!;
    expect(p.days).toBe(14);
    expect(p.practiceDays).toBe(10);
    expect(p.techPerDay).toBeCloseTo((30 * 10) / 14, 1);
    expect(p.perDay).toBeCloseTo((40 * 10) / 14, 1);
  });
  it('a newer player: the window is the days since the first snapshot; no pace before 3 practice days', () => {
    const two = { [TODAY]: snap(TODAY, { minutes: { technique: 20 }, practised: true }), [addDays(TODAY, -1)]: snap(addDays(TODAY, -1), { minutes: { technique: 20 }, practised: true }) };
    const p = measuredPace(two, TODAY)!;
    expect(p.days).toBe(2);
    expect(daysAt(300, p)).toBeNull();
    expect(measuredPace({}, TODAY)).toBeNull();
  });
  it('days to close = minutes left ÷ (technique a day − 15 % maintenance), rounded up', () => {
    const p = measuredPace(snaps, TODAY)!;
    expect(daysAt(0, p)).toBe(0);
    expect(daysAt(182, p)).toBe(Math.ceil(182 / (p.techPerDay * 0.85)));
    expect(spanWords(10, 'he')).toBe('10 ימים');
    expect(spanWords(42, 'en')).toBe('6 weeks');
  });
  it('per key: cells, closed, minutes left (cool cells skipped) and the minutes measured on its items', () => {
    const cells = keyMatrix(families('piano'), 1, {});
    const items: Record<string, ItemState> = {};
    const kt = keyTimes(cells, items);
    const c = kt.find((k) => k.root === 0 && k.group === 'major')!;
    expect(c.cells).toBe(cells.filter((x) => x.root === 0 && x.group === 'major').length);
    expect(c.left).toBeGreaterThan(0);
    expect(c.measured).toBe(0);
    const p = projection(cells, items, snaps, TODAY, 0);
    expect(p.week?.root).toBe(0);
    expect(p.all.cells).toBe(kt.reduce((n, k) => n + k.cells, 0));
    expect(p.all.days).toBe(daysAt(p.all.left, p.pace));
  }, 60000);
  it('the projection is on the Progress page, not on the key screen (D5)', () => {
    expect(src('ui/PracticeKeys.tsx')).not.toMatch(/min a day: \$\{/);
    expect(src('ui/ProgressOverTime.tsx')).toContain('<ProjectionCard p={proj} lang={lang} />');
    expect(src('ui/Stats.tsx')).toContain("matrix={courseId === 'keys' || courseId === 'guitar' || courseId === 'bass' ? props.matrix : undefined}");
    expect(src('ui/App.tsx')).toContain('matrix={() => projectionInput(s, drillSettingsOf(s), progress.drillItems ?? {})}');
  });
});

// ───────────────────────────── 2. burn-up and alerts ─────────────────────────────

describe('the assignment burn-up (SPEC-PROGRESS-CHARTS §3, §4.1)', () => {
  it('a single-item assignment: closed on its first passing submission, the due day kept on the axis', () => {
    const a: BurnAssign = { id: 'a', kind: 'drill', ref: 'drill:scales-1', dueOn: '2026-11-28', strictness: 'moderate', createdAt: '2026-11-18T09:00:00Z', submissions: [{ userId: 'u', createdAt: '2026-11-19T10:00:00Z', score: 0.5 }, { userId: 'u', createdAt: '2026-11-21T10:00:00Z', score: 0.8 }] };
    const b = burnup(a, TODAY, 'u');
    expect(b.total).toBe(1);
    expect(b.done).toBe(1);
    expect(b.start).toBe('2026-11-18');
    expect(b.end).toBe('2026-11-28');
    expect(b.pts.find((p) => p.day === '2026-11-20')!.v).toBe(0);
    expect(b.pts.find((p) => p.day === '2026-11-21')!.v).toBe(1);
    expect(burnup(a, TODAY, 'someone-else').done).toBe(0);
  });
  it('a phrase assignment: its required keys are the items; each key closes on its first pass at the strictness', () => {
    const ref = encodePhraseRef({ v: 1, name: 'P', homeKey: 0, minor: false, meter: 4, swing: 0.5, chords: [[0, 'maj7', 4]], rh: [[0, 0, 1], [4, 1, 1], [7, 2, 1]], lh: [], instrument: 'piano', plan: { goalBpm: 100, keys: [0, 5, 10], order: 'fifths', hands: 'R', band: false } } as never);
    expect(decodePhraseRef(ref)?.plan.keys).toEqual([0, 5, 10]);
    const sub = (day: string, key: number, score: number) => ({ userId: 'u', createdAt: `${day}T10:00:00Z`, score, metrics: { kind: 'phrase', key, bpm: 100, inst: 'p' } });
    const a: BurnAssign = { id: 'p', kind: 'phrase', ref, dueOn: null, strictness: 'strict', createdAt: '2026-11-15T00:00:00Z', submissions: [sub('2026-11-16', 0, 0.95), sub('2026-11-17', 5, 0.8), sub('2026-11-19', 5, 0.92), sub('2026-11-20', 3, 0.99)] };
    const b = burnup(a, TODAY);
    expect(b.total).toBe(3);
    expect(b.done).toBe(2);
    expect(b.pts.at(-1)!.v).toBe(2);
    expect(b.pts.find((p) => p.day === '2026-11-18')!.v).toBe(1);
    expect(b.due).toBeNull();
  });
});

describe("the teacher's alerts with their small charts (§4.1)", () => {
  it('"practised N days out of 14" when N ≤ 3, with the minutes line of the 14 days', () => {
    const s: Record<string, Snapshot> = {};
    for (let k = 0; k < 20; k++) s[addDays(TODAY, -k)] = snap(addDays(TODAY, -k), k === 2 || k === 9 ? { minutes: { technique: 15 }, practised: true } : {});
    const al = alertsOf(s, TODAY);
    const few = al.find((a) => a.kind === 'few-days')!;
    expect(few).toMatchObject({ days: 2, of: 14 });
    expect(few.kind === 'few-days' && few.pts.length).toBe(14);
    // a student who practised 5 days: no alert; a student who joined 4 days ago: not "behind" on days before them
    const busy: Record<string, Snapshot> = {};
    for (let k = 0; k < 20; k++) busy[addDays(TODAY, -k)] = snap(addDays(TODAY, -k), k < 5 ? { minutes: { technique: 15 }, practised: true } : {});
    expect(alertsOf(busy, TODAY).some((a) => a.kind === 'few-days')).toBe(false);
    const fresh = { [addDays(TODAY, -3)]: snap(addDays(TODAY, -3)) };
    expect(alertsOf(fresh, TODAY)).toEqual([]);
  });
  it('"stuck at the limit for 3 sessions": the ceiling held on the last 3 session days (the snapshot carries it)', () => {
    const h = (d: string, bpm: number) => ({ at: `${d}T10:00:00Z`, bpm, cv: 0.05 });
    const stuck = { itemId: 'scales:maj:2:RL:x', family: 'scales', key: 2, takes: 20, cleanBpm: 96, targetBpm: 120, ceiling: { bpm: 96, until: '2026-11-25' }, passLog: [], history: [h('2026-11-10', 90), h('2026-11-15', 96), h('2026-11-18', 95), h('2026-11-21', 96)], last: '2026-11-21' } as unknown as ItemState;
    const moving = { ...stuck, itemId: 'scales:maj:3:RL:x', history: [...stuck.history.slice(0, 3), h('2026-11-21', 104)], cleanBpm: 104 } as ItemState;
    const out = stuckItems({ a: stuck, b: moving });
    expect(out.map((x) => x.id)).toEqual(['scales:maj:2:RL:x']);
    expect(out[0]).toMatchObject({ ceiling: 96, target: 120 });
    expect(out[0].pts.at(-1)).toEqual({ day: '2026-11-21', bpm: 96 });
    const ds = daySnapshot(TODAY, { a: stuck });
    expect(ds.stuck?.[0].id).toBe('scales:maj:2:RL:x');
    expect(daySnapshot(TODAY, { b: moving }).stuck).toBeUndefined();
    const al = alertsOf({ [TODAY]: ds }, TODAY);
    expect(al.find((a) => a.kind === 'stuck')).toBeTruthy();
  });
  it('the charts: one axis, area palette, tooltips, names beside the marks; wired on the class page and the student list', () => {
    const ui = src('ui/ExtraCharts.tsx');
    expect(ui).toContain("from '../engine/areaColors'");
    expect(ui).toContain('className="tg-tip"');
    expect(ui).toContain('pt-legend');
    expect(ui).toContain('dir="ltr"');
    expect(ui).not.toMatch(/linearGradient|radialGradient|drop-shadow|[\u{1F300}-\u{1FAFF}]/u);
    expect(src('ui/ClassCharts.tsx')).toContain('<AlertCards alerts={alertsOf(st.snaps, today)}');
    expect(src('ui/ClassCharts.tsx')).toContain('burnup(a, today, st.id)');
    expect(src('ui/TeacherLoop.tsx')).toContain('<BurnUpRow b={burnup(a, localDay(new Date()))}');
  });
});

// ───────────────────────────── 3. the coach's tilt and the taster ─────────────────────────────

describe("the coach's tilt (client side; the plan changes only on yes)", () => {
  const series = (techClosed: (k: number) => number, impClosed: (k: number) => number, days = 20) => {
    const s: Record<string, Snapshot> = {};
    for (let k = days - 1; k >= 0; k--) {
      const d = addDays(TODAY, -k);
      s[d] = snap(d, { status: { 'keys:technique': { closed: techClosed(k) }, 'keys:improv': { closed: impClosed(k) } }, minutes: { technique: 20 }, practised: true });
    }
    return s;
  };
  it('technique moving and improvisation still → +5 points of improvisation, with the measured reason', () => {
    const t = proposeTilt({ snaps: series((k) => 20 - k, () => 2), today: TODAY, course: 'keys' })!;
    expect(t.improv).toBe(0.05);
    expect(t.reasons[0].en).toMatch(/technique closed \d+ items and improvisation none/);
    expect(t.reasons[0].he).toMatch(/הטכניקה סגרה/);
    expect(t.week).toBe(isoWeek(TODAY));
  });
  it('steps 5 points a week up to ±10, back toward 0 when the need is gone; nothing to propose = null', () => {
    const need = series((k) => 20 - k, () => 2);
    const flat = series(() => 5, () => 5);
    const lastWeek = { week: isoWeek(addDays(TODAY, -7)), improv: 0.05, answer: 'yes' as const };
    expect(proposeTilt({ snaps: need, today: TODAY, course: 'keys', prev: lastWeek })!.improv).toBe(0.1);
    expect(proposeTilt({ snaps: need, today: TODAY, course: 'keys', prev: { ...lastWeek, improv: 0.1 } })!.improv).toBe(TILT_MAX);
    expect(proposeTilt({ snaps: flat, today: TODAY, course: 'keys', prev: lastWeek })!.improv).toBe(0);
    expect(proposeTilt({ snaps: flat, today: TODAY, course: 'keys' })).toBeNull();
    expect(proposeTilt({ snaps: need, today: TODAY, course: 'ear' })).toBeNull();
    // weak colour coverage over ≥ 3 functions is a reason too
    const stats = { 'I|lydian': { n: 3, cov: 0.2, last: 'a' }, 'V-maj|altered': { n: 2, cov: 0.4, last: 'a' }, 'ii|dorian': { n: 4, cov: 0.5, last: 'a' } };
    expect(proposeTilt({ snaps: flat, today: TODAY, course: 'keys', stats })!.reasons[0].en).toMatch(/Colour coverage/);
  });
  it('the daily plan: unchanged without a yes; the improvisation block grows with an accepted tilt', () => {
    const base = { goal: 'general' as never, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view: { units: [] } as never, licksDue: 0, opened: 4, technique: true, course: 'keys' as const, total: 60, techTier: 2 };
    const imp = (w: ReturnType<typeof suggestWorkout>) => w.filter((b) => b.target.kind === 'improv').reduce((a, b) => a + b.minutes, 0);
    const plain = suggestWorkout(base);
    expect(imp(suggestWorkout({ ...base, tilt: 0 }))).toBe(imp(plain));
    expect(imp(suggestWorkout({ ...base, tilt: 0.1 }))).toBeGreaterThan(imp(plain));
    expect(imp(suggestWorkout({ ...base, tilt: -0.1 }))).toBeLessThan(imp(plain));
    expect(activeTilt({ week: isoWeek(TODAY), improv: 0.1, answer: 'yes' }, TODAY)).toBe(0.1);
    expect(activeTilt({ week: isoWeek(TODAY), improv: 0.1, answer: 'no' }, TODAY)).toBe(0);
    expect(activeTilt({ week: isoWeek(addDays(TODAY, -7)), improv: 0.1, answer: 'yes' }, TODAY)).toBe(0);
    expect(src('ui/App.tsx')).toContain('tilt: activeTilt(s.aiTilt, today)');
  });
  it('the server field is behind a flag defaulting to the current behaviour (the edge function is not deployed)', () => {
    expect(AI_TILT_SERVER).toBe(false);
    setWeeklyExtra({ tilt: { improvShare: 40 } });
    expect(weeklyExtraContext()).toEqual({});
    setWeeklyExtra(null);
    expect(readFileSync(new URL('../supabase/functions/toneturn-ai/index.ts', import.meta.url), 'utf8')).toMatch(/When the data has "tilt"/);
  });
});

describe('the coach suggests a style taster with a data reason (STYLE-FOCUS §9.2)', () => {
  const s = { styleFocus: { keys: { main: 'jazz' as const, also: [] } }, styleTaste: { since: '2026-08-01' } };
  it('a weak area names a style that trains it, with the reason; no weak area, no suggestion', () => {
    const n = tasterNudge(s as never, 'keys', TODAY, 'timing')!;
    expect(['afrocuban', 'soul']).toContain(n.style);
    expect(n.reason.en).toMatch(/timing/);
    expect(n.reason.he).toMatch(/התזמון/);
    expect(tasterNudge(s as never, 'keys', TODAY, null)).toBeNull();
    // a style turned down is not suggested
    const declined = { ...s, styleTaste: { since: '2026-08-01', by: { afrocuban: { declinedUntil: '2027-05-01' }, soul: { declinedUntil: '2027-05-01' } } } };
    expect(tasterNudge(declined as never, 'keys', TODAY, 'timing')).toBeNull();
  });
  it('"Show it on Today": the taster card offers that style this week, ahead of the two-week rhythm; shown once', () => {
    const recent = { ...s, styleTaste: { since: '2026-08-01', lastOffer: addDays(TODAY, -2), coach: { style: 'afrocuban' as const, course: 'keys' as const, day: addDays(TODAY, -1) } } };
    expect(tasterFor(recent as never, 'keys', TODAY)?.style).toBe('afrocuban');
    const shown = { ...recent, styleTaste: offerShown(recent.styleTaste as never, TODAY) };
    expect(shown.styleTaste.coach).toBeUndefined();
    expect(tasterFor(shown as never, 'keys', TODAY)).toBeNull();
    const old = { ...s, styleTaste: { ...recent.styleTaste, coach: { ...recent.styleTaste.coach, day: addDays(TODAY, -9) } } };
    // a week later the suggestion has lapsed: the two-week rhythm is back (offered 2 days ago → nothing today)
    expect(tasterFor(old as never, 'keys', TODAY)).toBeNull();
  });
  it('the card lives on Insights; accept / decline; no toast', () => {
    const ui = src('ui/CoachTilt.tsx');
    expect(ui).toContain('data-tilt-accept');
    expect(ui).toContain('data-tilt-decline');
    expect(ui).toContain('data-coach-taster-go');
    expect(ui.replace(/\/\/.*$/gm, '')).not.toMatch(/toast/i);
    expect(src('ui/App.tsx')).toContain('<InsightsScreen coach={<CoachTilt');
  });
});

// ───────────────────────────── 4. the Barry Harris way (verified content only) ─────────────────────────────

describe('the Barry Harris way: RBI track B, only what BARRY-HARRIS-THEORY.md verifies', () => {
  it('H-1: one dominant, the starting degree from the root, then the 3rd, the 5th, the 7th, every 4 bars', () => {
    const sh = buildHarrisSheet(1, 0);
    const starts = sh.cells.filter((c) => c.start).map((c) => c.start);
    expect(starts).toEqual(['1', '3', '5', '7']);
    expect(sh.cells.every((c) => thoughtLabel(c.think) === 'G7')).toBe(true);
  });
  it('H-2: ii is played as its V; the I as its 6 chord', () => {
    const sh = buildHarrisSheet(2, 0);
    const c0 = sh.cells.filter((c) => c.chorus === 0);
    expect(c0.map((c) => thoughtLabel(c.think))).toEqual(['G7', 'G7', 'C6', 'C6']);
    expect(sh.cells.filter((c) => c.start).map((c) => c.start)).toEqual(['1', '3', '5', '7']);
  });
  it('H-3: over the V, every 8 bars: the dominant, the important minor (Dm6), the tritone’s minor (A♭m6) — never Bm6 / Fm6', () => {
    const sh = buildHarrisSheet(3, 0);
    const v = (ch: number) => [...new Set(sh.cells.filter((c) => c.chorus === ch && c.q === 'dom').map((c) => thoughtLabel(c.think)))];
    expect(v(0)).toEqual(['G7']);
    expect(v(1)).toEqual(['Dm6']);
    expect(v(2)).toEqual(['A♭m6']);
    const all = HARRIS_TIERS.flatMap((t) => [0, 3, 7, 10].flatMap((k) => buildHarrisSheet(t, k).cells.map((c) => thoughtLabel(c.think))));
    // the four related m6s: only the important minor and the tritone's minor are used (Fm6 / Bm6 wait for the owner)
    for (const k of [0, 3, 7, 10]) {
      const sh3 = buildHarrisSheet(3, k);
      for (const c of sh3.cells.filter((x) => x.think.kind === 'm6')) expect([7, 1].map((x) => (c.root + x) % 12)).toContain(c.think.root);
    }
    expect(all.length).toBeGreaterThan(20);
    // A♭m6 over G7: the identity notes are A♭ and E♭ (its C♭ is G's 3rd, its F is G's 7th) — SPEC-RBI-ROTATION §6
    const ab = sh.cells.find((c) => c.think.name === 'tritone-minor')!;
    expect(identityPcs(ab).sort((a, b) => a - b)).toEqual([3, 8]);
  });
  it('H-4: the half-diminished is played as the dominant a major 3rd below (Dø → B♭7); the i is its m6', () => {
    const sh = buildHarrisSheet(4, 0);
    expect(sh.cells.slice(0, 3).map((c) => thoughtLabel(c.think))).toEqual(['B♭7', 'G7', 'Cm6']);
    expect(TIERS[4].every).toBe(0);
  });
  it('the scale under a thought chord: a m6 over the V is that dominant’s 9th without the root (Dm6 → the G scale)', () => {
    expect(thoughtScale({ root: 2, kind: 'm6' }).sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(thoughtScale({ root: 0, kind: 'min6' }).sort((a, b) => a - b)).toEqual([0, 2, 3, 5, 7, 9, 11]);
  });
  it('grading: thought-chord tones on the beat, a resolving half step off the beat is fine, identity notes, the start degree', () => {
    const sh = buildHarrisSheet(3, 0);
    const ab = sh.cells.find((c) => c.think.name === 'tritone-minor')!;
    // over the A♭m6 bar: A♭ (beat), G♭ (off the beat, in the D♭ scale), F (beat), E♭ (beat)
    const notes = [{ beat: ab.at, dur: 0.5, midi: 68 }, { beat: ab.at + 0.5, dur: 0.5, midi: 66 }, { beat: ab.at + 1, dur: 0.5, midi: 65 }, { beat: ab.at + 2, dur: 0.5, midi: 63 }];
    const g = gradeHarris(sh, notes);
    expect(g.onBeat).toBe(1);
    expect(g.offBeat).toBe(1);
    expect(g.hits[sh.cells.indexOf(ab)]).toBe(true);
    // the same bar with only G7's own tones: no identity note
    const plain = gradeHarris(sh, [{ beat: ab.at, dur: 1, midi: 67 }, { beat: ab.at + 1, dur: 1, midi: 71 }]);
    expect(plain.hits[sh.cells.indexOf(ab)]).toBe(false);
    const h1 = buildHarrisSheet(1, 0);
    const g1 = gradeHarris(h1, [{ beat: 0, dur: 1, midi: 67 }, { beat: 16, dur: 1, midi: 71 }, { beat: 32, dur: 1, midi: 62 }, { beat: 48, dur: 1, midi: 65 }]);
    expect(g1.start).toBe(1);
  });
  it('no mode names, no "half-whole", no unverified devices in track B; count-in + click + now-cue; both languages', () => {
    const eng = src('engine/harrisTrack.ts').replace(/\/\/.*$/gm, '');
    const ui = src('ui/HarrisWay.tsx').replace(/\/\/.*$/gm, '');
    for (const s of [eng, ui]) expect(s).not.toMatch(/mixolydian|dorian|lydian|phrygian|locrian|aeolian|ionian|half-whole|whole-half|altered scale|Bm6|Fm6/i);
    expect(ui).toContain('chartBacking(');
    expect(ui).toMatch(/perc: \(k % sheet\.meter \? 'click' : 'accent'\)/);
    expect(ui).toContain('<BeatDots countIn={4}');
    expect(ui).toContain("i === now ? ' now' : ''");
    expect(ui).toContain('<bdi dir="ltr">{c.sym}</bdi>');
    for (const t of HARRIS_TIERS) expect(TIERS[t].title.he && TIERS[t].how.he && TIERS[t].title.en).toBeTruthy();
    expect(src('ui/ImprovStudio.tsx')).toContain("'The Barry Harris way'");
    expect(src('ui/ImprovStudio.tsx')).toContain('הדרך של בארי האריס');
  });
});

// ───────────────────────────── 5. the combined sentence, reverse recognition, transpose by ear ─────────────────────────────

describe('the combined sentence (SPEC-EAR-AND-READING §3.2)', () => {
  const a = LICKS.find((l) => l.id === 'maj-arp')!;
  const b = LICKS.find((l) => l.id === 'dom-arp9')!;
  it('A + one link note (a half step below B’s first note, the approach rule) + B; each lick on a bar line; nothing composed', () => {
    const j = combinedSentence(a, b);
    const parts = j.parts.map((p) => p.kind);
    expect(parts[0]).toBe('lick');
    expect(parts.at(-1)).toBe('lick');
    const link = j.parts.find((p) => p.kind === 'link');
    const bStart = j.parts.at(-1)!.from;
    expect(bStart % 4).toBe(0);
    if (link) {
      const ln = j.lick.notes.find((n) => n[1] === link.from)!;
      expect(ln[0]).toBe(b.notes[0][0] - 1);
      expect(link.to - link.from).toBe(0.5);
    }
    // every other note is A's or B's own (shifted)
    const own = j.lick.notes.filter((n) => !link || n[1] !== link.from);
    expect(own.length).toBe(a.notes.length + b.notes.length);
    expect(j.lick.id).toBe('sent-maj-arp-dom-arp9');
    expect(j.lick.chords.length).toBe(a.chords.length + b.chords.length);
  });
  it('the other channel: page+page → by ear, ear+ear → page, mixed → the weaker channel, unknown → by ear', () => {
    expect(sentenceChannel('page', 'page')).toBe('ear');
    expect(sentenceChannel('ear', 'ear')).toBe('page');
    expect(sentenceChannel('ear', 'page', 'reading')).toBe('page');
    expect(sentenceChannel('ear', 'page', 'ear')).toBe('ear');
    expect(sentenceChannel(null, null)).toBe('ear');
    const items = { x: closedLick('maj-arp', 0, { channels: { 'ear-fresh': { n: 1, clean: 1, best: 120 }, 'ear-known': { n: 4, clean: 3, best: 120 }, 'page-known': { n: 2, clean: 2, best: 120 } } }) };
    expect(learnedChannel(items, a)).toBe('ear');
  });
  it('“learned” = closed in a key; two learned licks make a pair; the debrief names recognised parts', () => {
    const items = { x: closedLick('maj-arp', 0), y: closedLick('dom-arp9', 5), z: { ...closedLick('min-arp', 0), passLog: [] } as ItemState };
    const learned = learnedLicks(LICKS, items).map((l) => l.id).sort();
    expect(learned).toEqual(['dom-arp9', 'maj-arp']);
    expect(pickPair(learnedLicks(LICKS, items), 3)!.map((l) => l.id).sort()).toEqual(['dom-arp9', 'maj-arp']);
    expect(pickPair([a], 1)).toBeNull();
    const d = sentenceDebrief([{ name: a.name, ok: 5, total: 5 }, { name: { en: 'the link note', he: 'צליל החיבור' }, ok: 0, total: 1 }, { name: b.name, ok: 2, total: 6 }], 'he');
    expect(d.map((r) => r.known)).toEqual([true, false, false]);
  });
  it('the take runs with goal.sections (A, link, B) so the analysis reports each part', () => {
    const j = combinedSentence(a, b);
    const d = lickDrill(j.lick, 3, 'piano');
    expect(d.itemId).toBe('lick:sent-maj-arp-dom-arp9:piano:3');
    expect(src('ui/EarVocab.tsx')).toContain('sections: j.parts.map((p) => ({ from: p.from, to: p.to, name: p.name }))');
    expect(src('ui/LickTrainer.tsx')).toContain('<SentenceDebrief sections={m.sections} lang={lang} />');
  });
});

describe('reverse recognition and transpose by ear', () => {
  const a = LICKS.find((l) => l.id === 'maj-arp')!;
  it('a passage of three licks with A in one place; a tap while A sounds finds it; taps elsewhere cost', () => {
    const p = passage(a, LICKS, 4)!;
    expect(p.joined.parts.filter((x) => x.kind === 'lick').length).toBe(3);
    expect(p.targetId).toBe('maj-arp');
    const inside = (p.target.from + p.target.to) / 2;
    expect(gradeFind([inside], p.target)).toEqual({ hit: true, wrong: 0, score: 1 });
    expect(gradeFind([inside, p.target.to + 5], p.target)).toEqual({ hit: true, wrong: 1, score: 0.75 });
    expect(gradeFind([p.target.to + 5], p.target).hit).toBe(false);
    const { evs, xp } = findEvents(a, { hit: true, wrong: 0, score: 1 }, '2026-11-23T10:00:00Z', 's');
    expect(evs[0].skill).toBe('dictation');
    expect(evs[0].tags?.map((t) => t.sub)).toEqual(['dictation/recognise', 'improv/vocab']);
    expect(xp).toBe(4);
  });
  it('transpose by ear: heard in a closed key, played in the next key of the lick order not closed yet', () => {
    const items = { x: closedLick('maj-arp', 0), y: closedLick('maj-arp', 5) };
    expect(transposePlan(a, items)).toEqual({ from: 0, to: 10 });
    expect(transposePlan(a, {})).toBeNull();
    // the take is the lick itself in the new key (its own progress), by ear, with the sound from the known key
    const lt = src('ui/LickTrainer.tsx');
    expect(lt).toContain("hearFrom={r.kind === 'transpose' ? () => r.hear : undefined}");
    expect(lt).toContain("byEar={r.kind === 'transpose' || r.byEar}");
  });
  it('find the lick keeps the timing cue (count-in, a click on every beat, a moving now-cue)', () => {
    const ui = src('ui/EarVocab.tsx');
    expect(ui).toContain('const COUNT = 4;');
    expect(ui).toContain("perc: (k % 4 ? 'click' : 'accent')");
    expect(ui).toContain('<BeatDots countIn={4}');
    expect(ui).toContain('className="ev-now"');
    expect(ui).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

// ───────────────────────────── 6. the "new key" and "varied" lick cards; share cards ─────────────────────────────

describe('the "new key" and "varied" lick cards (SPEC-LICKS-IN-IMPROV §2)', () => {
  const lick = LICKS.find((l) => l.id === 'dom-arp9')!;
  const spans: CSpan[] = Array.from({ length: 8 }, (_, i) => [{ root: 7, iv: [0, 4, 7, 10], at: i * 8, beats: 4 }, { root: 0, iv: [0, 4, 7, 11], at: i * 8 + 4, beats: 4 }]).flat();
  const at = (start: number, shift = 0) => lick.notes.map(([p, b, d]) => ({ midi: 60 + p + shift, beat: start + b, dur: d }));
  const ctx = (notes: { midi: number; beat: number; dur: number }[], opt?: CardCtx['opt']): CardCtx => ({ notes, spans, meter: 4, bpm: 120, opt });
  it('new key: a use in a key where the lick is not closed counts; in a closed key it does not', () => {
    expect(RULE_CARDS['lick-new-key'].check(ctx(at(0), { licks: [lick], closedKeys: { 'dom-arp9': [5] } })).ok).toBe(1);
    expect(RULE_CARDS['lick-new-key'].check(ctx(at(0), { licks: [lick], closedKeys: { 'dom-arp9': [0] } })).ok).toBe(0);
  });
  it('varied: a partial hit (the ending changed) counts; the exact lick does not', () => {
    const changed = at(0);
    changed[changed.length - 1] = { ...changed[changed.length - 1], midi: changed[changed.length - 1].midi + 2 };
    expect(RULE_CARDS['lick-varied'].check(ctx(changed, { licks: [lick] })).ok).toBe(1);
    expect(RULE_CARDS['lick-varied'].check(ctx(at(0), { licks: [lick] })).ok).toBe(0);
  });
  it('both are vocabulary rules and challenges, named in both languages; the pool’s closed keys reach Improvise', () => {
    expect(VOCAB_RULES).toEqual(expect.arrayContaining(['lick-new-key', 'lick-varied']));
    expect(CHALLENGES.map((c) => c.id)).toEqual(expect.arrayContaining(['lick-new-key', 'lick-varied']));
    expect(RULE_NAME['lick-new-key'].he).toBe('ליק בסולם חדש');
    expect(src('ui/App.tsx')).toContain('closed: Object.fromEntries(pool.map((l) => [l.id, closedKeys(items, l.id)]))');
    expect(src('ui/Charts.tsx')).toContain('closedKeys: vocab.closed');
  });
});

describe('share cards (a share image after a clean tempo; the week), mature, no emoji', () => {
  it('the progress card: four numbers with their change, one sentence, no ranking, no gradient', () => {
    const tiles = [{ id: 'minutes', now: 140, prev: 100 }, { id: 'closed', now: 6, prev: 6 }, { id: 'days', now: 5, prev: 3 }, { id: 'tempo', now: 82, prev: 78 }] as const;
    const svg = progressCardSvg([...tiles], 'Reading rose 12 points in this period.', 'he');
    expect(svg).toContain('▲ 40');
    expect(svg).toContain('=');
    expect(svg).toContain('בלי דירוג מול אחרים');
    expect(svg).not.toMatch(/Gradient|[\u{1F300}-\u{1FAFF}]/u);
    expect(progressShareText([...tiles], 'en')).toMatch(/^This week: 140 minutes of practice, 6 items closed, 5 practice days/);
  });
  it('a technique exercise at its target tempo shares the same card as a lick ("Exercise at target tempo")', () => {
    const d = lickDrill(LICKS[0], 0, 'piano');
    expect(lickShareCard({ what: 'exercise', title: 'Scale', key: 'C', bpm: 120, drill: d }, 'en')).toContain('Exercise at target tempo');
    const dr = src('ui/Drills.tsx');
    expect(dr).toContain('share={atTargetTempo(res, drill) ?');
    expect(dr).toMatch(/res\.m\.verdict === 'clean' && target > 0 && \(res\.m\.bpm \|\| 0\) >= PASS_SHARE \* target/);
  });
});

// ───────────────────────────── everything connects ─────────────────────────────

describe('everything connects (XP, league, path, level test, workout) for the new activities', () => {
  it('the Barry Harris way: one rated result (improv), XP, booked through the studio’s completion (league, course share)', () => {
    const t = improvTake('harris', { score: 0.8, notes: 20, tier: 2, bpm: 100 });
    expect(t.lessonId).toBe('improv-harris');
    expect(t.event.skill).toBe('improv');
    expect(t.event.tags?.[0].sub).toBe('improv/play');
    expect(t.xp).toBeGreaterThan(2);
    expect(src('ui/HarrisWay.tsx')).toContain("onTake?.(improvTake('harris'");
    expect(src('ui/App.tsx')).toMatch(/recordCompletion\(\{ lessonId: t\.lessonId/);
  });
  it('the sentence and the transposition run as lick takes (drill item, rated events, XP); find the lick books its events + XP', () => {
    const l: Lick = combinedSentence(LICKS[0], LICKS[1]).lick;
    const m = { verdict: 'clean', accuracy: 1 } as never;
    const ev = lickEvents(l, 'piano', m, 100, '2026-11-23T10:00:00Z', 's', 0, 'vocab', { byEar: true, revealed: false });
    expect(ev[0].skill).toBe('dictation');
    expect(src('ui/LickTrainer.tsx')).toContain('onFound={(evs, xp) => onUsed(evs, xp)}');
    expect(src('ui/LickTrainer.tsx')).toContain('onTake={take}');
  });
  it('the level test places the skills these activities rate (improv, dictation); the path reads their sub-skills', () => {
    expect(PLACEMENT_ORDER).toEqual(expect.arrayContaining(['improv', 'dictation']));
    const path = src('engine/path.ts');
    expect(path).toContain("'dictation/'");
  });
  it('the workout: the improvisation block opens Improvise (the Barry Harris way is one tap there); the lick block opens Licks', () => {
    const base = { goal: 'general' as never, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view: { units: [] } as never, licksDue: 2, opened: 4, technique: true, course: 'keys' as const, total: 40, techTier: 2 };
    const w = suggestWorkout(base);
    expect(w.some((b) => b.target.kind === 'improv')).toBe(true);
    expect(src('ui/ImprovStudio.tsx')).toContain("{mode === 'scales' && track === 'B' && <HarrisWay");
  });
});
