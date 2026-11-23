// The verification pass on BUILD-PLAN-2026-11 / SPEC-DAILY-WORKOUT / SPEC-WORKOUT / SPEC-KEY-SESSION /
// SPEC-PATH-TODAY-PRACTICE: the remaining defects, one test each where practical (never lose progress, the between-blocks
// screen at the end of the take, measured time, the teacher's minutes a day, "+N opened", today's context kept for the
// day, FSRS maintenance, the rung page's ways in, "part of today", the minor week, the step's channel, one status ladder,
// the week's coverage, a piece's key mode and course).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import '../src/engine/topics';
import { families, levelDrills, levelKeys, targetBpmOf } from '../src/engine/drills/plan';
import { catalog, type LevelDef } from '../src/engine/drills/generate';
import { specDrills } from '../src/engine/drills/plan';
import type { DrillSettings, ItemState } from '../src/engine/drills/types';
import { cellKey, keyMatrix, type MatrixCell } from '../src/engine/drills/keyMatrix';
import { resizePlan, todayTechPlan, weekKeyForLevel, type PlanCell } from '../src/engine/drills/todayPlan';
import { betweenNow, BETWEEN_QUIET_MS, improvLevelToday, pieceWhyToday, teacherItems, teacherToday, type Block } from '../src/engine/workout2';
import { takeActiveMs, TAKE_CAP_MS, SETUP_CAP_MS } from '../src/engine/activeTime';
import { notifyInput } from '../src/engine/inputCheck';
import { keyLadder, keyWeekCoverage, openKeyRungs } from '../src/engine/drills/keyIndex';
import { withLadderFacts } from '../src/engine/ladderFacts';
import { decorateMastery, missingFor, type MasteryCtx } from '../src/engine/pathMastery';
import { levelLadder } from '../src/engine/statusLadder';
import type { PathFacts, PathStep, PathView, UnitStep } from '../src/engine/path';
import { LICKS, lickItemId, lickTempoItem } from '../src/engine/licks';
import { pieceDrillCourse } from '../src/engine/repLibrary';
import { IMPROV_LEVELS } from '../src/engine/charts';

class MemLS {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
beforeEach(() => {
  (globalThis as unknown as { localStorage: MemLS }).localStorage = new MemLS();
});
const src = (p: string) => readFileSync(p, 'utf8');
const DAY = '2026-11-23';
const ds = { instrument: 'piano', keyOrder: 'fifths-up', emphasis: 'pop' } as unknown as DrillSettings;
const settings = { courseStart: { keys: { report: 'well' } } } as never;

describe('1. "+2 min" keeps today’s technique plan and its place', () => {
  it('resizePlan: the kept cells stay, the reached cell stays, fresh cells fill to the new length', () => {
    const cells = keyMatrix(families('piano'), 3, {}, { day: DAY });
    const kept = todayTechPlan(cells, { minutes: 30, weekRoot: 0 });
    const fresh = todayTechPlan(cells, { minutes: 40, weekRoot: 7 });
    expect(kept.length).toBeGreaterThan(3);
    const out = resizePlan(kept, fresh, 40, 2);
    expect(out.slice(0, kept.length).map((p) => cellKey(p.cell))).toEqual(kept.map((p) => cellKey(p.cell)));
    expect(out.reduce((n, p) => n + p.cell.minutes, 0)).toBeGreaterThanOrEqual(kept.reduce((n, p) => n + p.cell.minutes, 0));
    expect(new Set(out.map((p) => cellKey(p.cell))).size).toBe(out.length);
    // a shorter block trims the tail but never a reached cell
    const short = resizePlan(kept, fresh, 1, 2);
    expect(short.length).toBeGreaterThanOrEqual(3);
  });
  it('todayTech: a longer block keeps the plan and resumes at the cell reached (it used to start again at cell 0)', async () => {
    const { todayTech, setPlanAt } = await import('../src/ui/todayTech');
    const a = todayTech({ settings, ds, items: {}, minutes: 30, day: DAY })!;
    expect(a.plan.length).toBeGreaterThan(2);
    setPlanAt(DAY, 2);
    const b = todayTech({ settings, ds, items: {}, minutes: 32, day: DAY })!;
    expect(b.at).toBe(2);
    expect(b.plan.slice(0, a.plan.length).map((p) => cellKey(p.cell))).toEqual(a.plan.map((p) => cellKey(p.cell)));
    // and again on reload (the kept plan is the extended one, its place too)
    const c = todayTech({ settings, ds, items: {}, minutes: 32, day: DAY })!;
    expect(c.at).toBe(2);
    expect(c.plan.map((p) => cellKey(p.cell))).toEqual(b.plan.map((p) => cellKey(p.cell)));
  });
});

describe('2. the between-blocks screen at the end of the take', () => {
  it('waits while a take runs or the player is still playing; shows once the player is still', () => {
    const now = 1_000_000;
    expect(betweenNow(false, false, null, now)).toBe(false);
    expect(betweenNow(true, true, null, now)).toBe(false);
    expect(betweenNow(true, false, now - 500, now)).toBe(false);
    expect(betweenNow(true, false, now - BETWEEN_QUIET_MS, now)).toBe(true);
    expect(betweenNow(true, false, null, now)).toBe(true);
  });
  it('App: a live block whose time ran out goes to the run screen by itself; Improvise and a drill take hold it', () => {
    const app = src('src/ui/App.tsx');
    expect(app).toMatch(/liveTimeUp\.current = lb\.routes \?\? \[lb\.route\]/);
    expect(app).toMatch(/betweenNow\(true, takeBusy\(\), lastInputAt\(\), Date\.now\(\)\)/);
    expect(src('src/ui/ImprovStudio.tsx')).toMatch(/running \? holdTake\(\) : undefined/);
    expect(src('src/ui/DrillTake.tsx')).toMatch(/busy \? holdTake\(\) : undefined/);
  });
});

describe('3. the Repertoire review block', () => {
  it('spans the piece’s practice routes, keeps the session pending and returns to the run', () => {
    const app = src('src/ui/App.tsx');
    const routes = /const REP_REVIEW_ROUTES = \[([^\]]+)\]/.exec(app)?.[1] ?? '';
    for (const r of ['repertoire', 'drills', 'charts', 'vocal']) expect(routes).toContain(`'${r}'`);
    expect(app).toMatch(/routes: REP_REVIEW_ROUTES/);
    expect(app).toMatch(/workoutPending\.current = \{ t0: Date\.now\(\), live: true \}/);
    expect(app).toMatch(/openRep\(\{ piece: b\.target\.piece, from: 'today' \}\)/);
    expect(app).toMatch(/onLeavePiece=\{\(from\) => go\(workoutPending\.current\?\.live \? 'workoutrun'/);
  });
});

describe('4. the microphone counts as activity', () => {
  it('a note heard on the mic (the input bus) is an input for active time', async () => {
    const act = await import('../src/ui/activity');
    act.wireMicActivity();
    const before = act.lastInputAt() ?? 0;
    notifyInput('mic');
    expect(act.lastInputAt()).toBeGreaterThanOrEqual(before);
    expect(act.lastInputAt()).not.toBeNull();
    expect(src('src/speech/knock.ts')).toMatch(/notifyInput\('mic'\)/);
  });
});

describe('5. a take’s measured active time', () => {
  it('the take from its first expected note to the stop, plus the active setup in the item (count-in out)', () => {
    expect(takeActiveMs({ model: 8000, firstNoteAt: 1000, stopAt: 13000 })).toBe(12000);
    expect(takeActiveMs({ model: 8000, firstNoteAt: 1000, stopAt: 13000, setupMs: 9000, countInMs: 2000 })).toBe(19000);
    expect(takeActiveMs({ model: 8000, firstNoteAt: null, stopAt: 13000 })).toBe(8000);
    expect(takeActiveMs({ model: 1, firstNoteAt: 0, stopAt: 99 * 60000 })).toBe(TAKE_CAP_MS);
    expect(takeActiveMs({ model: 1000, firstNoteAt: null, stopAt: 0, setupMs: 10 * 60000 })).toBe(1000 + SETUP_CAP_MS);
  });
  it('the screens book the measured time, not beats × 60000 / bpm', () => {
    for (const f of ['src/ui/Drills.tsx', 'src/ui/LickTrainer.tsx']) expect(src(f)).not.toMatch(/activeMs: \(\w+\.beats \* 60000\)/);
    expect(src('src/ui/DrillTake.tsx')).toMatch(/takePlaying\(\)/);
  });
});

describe('6. the teacher’s minutes a day', () => {
  it('reach teacherToday', () => {
    const items = teacherItems([{ lessonId: 'a', dueOn: '2026-11-30', minutes: 60, perDay: 7 }]);
    expect(items[0].perDay).toBe(7);
    expect(teacherToday(items, DAY, 30)?.minutes).toBe(7);
    expect(src('src/ui/App.tsx')).toMatch(/teacherToday\(teacherItems\(assigned\)/);
  });
});

describe('7. "+N new exercises opened" on the Progress page and the key page', () => {
  it('the kept gain is readable without the matrix; both pages show it', async () => {
    const { noteMatrixSeen, matrixGained } = await import('../src/ui/todayTech');
    noteMatrixSeen('piano', 1, 40, '2026-11-20');
    expect(noteMatrixSeen('piano', 2, 70, DAY)).toBe(30);
    expect(matrixGained(DAY)).toBe(30);
    expect(matrixGained('2026-11-27')).toBe(0);
    expect(src('src/ui/ExtraCharts.tsx')).toMatch(/new exercises opened/);
    expect(src('src/ui/PracticeKeys.tsx')).toMatch(/new exercises opened/);
  });
});

describe('8. today’s context and the old default on the Today card', () => {
  it('the context is kept for the day (a reload keeps it; tomorrow starts fresh)', async () => {
    const { readDayCtx, saveDayCtx } = await import('../src/ui/workoutLog');
    const dflt = { nomic: false, quiet: false, noinst: false };
    saveDayCtx(DAY, { nomic: true, quiet: false, noinst: true });
    expect(readDayCtx(DAY, dflt)).toEqual({ nomic: true, quiet: false, noinst: true });
    expect(readDayCtx('2026-11-24', dflt)).toEqual(dflt);
    const app = src('src/ui/App.tsx');
    expect(app).toMatch(/<WorkoutCard[\s\S]*?ctx=\{wctx\}[\s\S]*?onTemplate=\{onTemplateAnswer\}/);
  });
});

describe('9. FSRS maintenance skips a due cell over the budget', () => {
  it('a long overdue cell does not stop the smaller due cells', () => {
    const base = keyMatrix(families('piano'), 3, {}, { day: DAY });
    const pick = base.slice(0, 3);
    const due = (c: MatrixCell, d: string, minutes: number): MatrixCell => ({ ...c, minutes, need: { ...c.need, s: 2, due: `${d}T10:00:00.000Z`, last: `${d}T10:00:00.000Z` } });
    const cells = [due(pick[0], '2026-11-01', 5), due(pick[1], '2026-11-02', 1), due(pick[2], '2026-11-03', 1), ...base.slice(3)];
    const plan = todayTechPlan(cells, { minutes: 20, weekRoot: null, day: DAY });
    const review = plan.filter((p) => p.why === 'review').map((p) => cellKey(p.cell));
    expect(review).toEqual([cellKey(pick[1]), cellKey(pick[2])]);
  });
});

describe('10–12. the rung page’s ways in', () => {
  it('Practice (key page rows, family rows), Today’s cells and an assignment open the rung page', () => {
    const dr = src('src/ui/Drills.tsx');
    expect(dr).toMatch(/onRung=\{\(id\) => setView\(\{ k: 'keypage'/);
    expect(dr).toMatch(/onPage=\{\(id, root\) => setView\(\{ k: 'keypage', root, rung:/);
    expect(dr).toMatch(/rung: \{ id: p\.cell\.rung, wayIn: 'today' \}/);
    expect(src('src/ui/PracticeKeys.tsx')).toMatch(/data-kp-page=/);
    const app = src('src/ui/App.tsx');
    expect(app).toMatch(/setDrillsLevel\(\{ id, wayIn: 'teacher' \}\)/);
    expect(app).toMatch(/improvLevelOpen\.current = \{ n: it\.n, wayIn: 'teacher' \}/);
  });
});

describe('11. "part of today" for pieces and improvisation levels', () => {
  const blocks = (b: Block[]) => b;
  it('a piece in today’s review block; the improvisation level being worked when Improvise is in today’s workout', () => {
    const bs = blocks([{ id: 'r', minutes: 5, target: { kind: 'game', game: 'rep-review', piece: 'rep:keys:x' } }]);
    expect(pieceWhyToday('rep:keys:x', null, bs)?.en).toBe('Review today');
    expect(pieceWhyToday('rep:keys:y', null, bs)).toBeNull();
    expect(pieceWhyToday('p', 'p', [])?.en).toBe('New from the path');
    const imp = blocks([{ id: 'i', minutes: 5, target: { kind: 'improv' } }]);
    expect(improvLevelToday(IMPROV_LEVELS, {}, imp)).toBe(IMPROV_LEVELS[0].n);
    expect(improvLevelToday(IMPROV_LEVELS, { [IMPROV_LEVELS[0].id]: 0.95 }, imp)).toBe(IMPROV_LEVELS[1].n);
    expect(improvLevelToday(IMPROV_LEVELS, {}, [])).toBeNull();
    expect(src('src/ui/ImprovStudio.tsx')).toMatch(/lv === todayLevel && <TodayMark/);
  });
});

describe('13. tempo charts: the piece page and licks per instrument', () => {
  it('a lick’s chart reads only this instrument’s items (a piano line: the family’s items)', () => {
    const l = LICKS.find((x) => !x.src)!;
    const st = (id: string, n: number): ItemState => ({ itemId: id, takes: 3, history: Array.from({ length: n }, (_, i) => ({ at: `2026-11-1${i}T10:00:00Z`, bpm: 80, cv: 0 })) }) as unknown as ItemState;
    const g = lickItemId(l, 'guitar', 0);
    const p = lickItemId(l, 'piano', 0);
    const items = { [g]: st(g, 9), [p]: st(p, 2) };
    expect(lickTempoItem(l, 'piano', items)?.itemId).toBe(p);
    expect(lickTempoItem(l, 'guitar', items)?.itemId).toBe(g);
    const line = LICKS.find((x) => x.src);
    if (line) {
      const id = lickItemId(line, 'piano', 0);
      expect(lickTempoItem(line, 'piano', { [id]: st(id, 2) })?.itemId).toBe(id);
    }
    expect(src('src/ui/Repertoire.tsx')).toMatch(/tempoItem=\{props\.tempoItemOf\?\.\(entry\) \?\? null\}/);
  });
});

describe('14. the technique step in a minor week', () => {
  it('the step and its full practice open the same key', { timeout: 180000 }, async () => {
    expect(weekKeyForLevel({ root: 0, group: 'minor' }, true)).toBe(0);
    expect(weekKeyForLevel({ root: 0, group: 'minor' }, false)).toBe(3);
    expect(weekKeyForLevel({ root: 0, group: 'major' }, true)).toBe(9);
    expect(weekKeyForLevel(null, false)).toBeNull();
    const { keptWeekGroup, keptWeekKey } = await import('../src/ui/todayTech');
    const now = `${DAY}T12:00:00`;
    keptWeekGroup('piano', () => 'minor', now);
    keptWeekKey('minor', 'piano', () => 0, now);
    const { rungKeyOf } = await import('../src/ui/itemRoutes');
    // a major level in a minor week (C minor): its rung opens in E♭ major — the key the step's run leads with
    expect(rungKeyOf('scales-4', ds, now)).toBe(weekKeyForLevel({ root: 0, group: 'minor' }, false));
    expect(src('src/ui/App.tsx')).toMatch(/weekKeyForLevel\(dayKeyIfKept\(inst\), techLevel\(step\.ladder\.ref\)\?\.keys === 'minor'\)/);
  });
});

describe('15. a step’s own channel opens it', () => {
  it('PathStep.channel is read by the opening rule', () => {
    const lv = catalog().find((f) => f.id === 'scales')!.levels[0];
    const items: Record<string, ItemState> = {};
    for (const d of levelDrills(lv, 'fifths-up')) items[d.itemId] = { itemId: d.itemId, takes: 6, cleanBpm: targetBpmOf(lv, d), goalBpm: targetBpmOf(lv, d), last: '2026-11-20T10:00:00Z', passLog: [{ at: '2026-11-19T10:00:00Z', bpm: targetBpmOf(lv, d) }, { at: '2026-11-20T10:00:00Z', bpm: targetBpmOf(lv, d) }, { at: '2026-11-20T11:00:00Z', bpm: targetBpmOf(lv, d) }], history: [], ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.95 } } as unknown as ItemState;
    const opts = { families: ['scales'], items, order: 'fifths-up' as const, start: {}, vocalPassed: [], at: '2026-11-21T00:00:00Z' };
    expect(withLadderFacts({} as PathFacts, opts).steps?.[`tech:${lv.id}`]?.stars ?? 0).toBeGreaterThan(0);
    // the same takes from the page do not open a step that says "this one by ear"
    expect(withLadderFacts({} as PathFacts, { ...opts, steps: [{ id: `tech:${lv.id}`, channel: 'ear' }] }).steps?.[`tech:${lv.id}`]).toBeUndefined();
  });
});

describe('16. the gold node follows the status ladder', () => {
  it('passes logged without counted takes (the ladder says new / learning): 4★, not "Mastered"; the sheet names the keys', () => {
    const order = 'fifths-up' as const;
    const lv = catalog().flatMap((f) => f.levels).find((l) => l.specs.length === 1 && levelKeys(l, order).length >= 12 && levelDrills(l, order).length === levelKeys(l, order).length)!;
    const items: Record<string, ItemState> = {};
    for (const d of levelDrills(lv, order)) {
      const bpm = targetBpmOf(lv, d);
      // the old star count reads the pass log alone (5★, gold); the status ladder reads no takes (new)
      items[d.itemId] = { itemId: d.itemId, takes: 0, cleanBpm: bpm, goalBpm: bpm, last: '2026-11-22T10:00:00Z', passLog: [{ at: '2026-11-20T10:00:00Z', bpm }, { at: '2026-11-22T10:00:00Z', bpm }, { at: '2026-11-22T11:00:00Z', bpm }], history: [], ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.95 } } as unknown as ItemState;
    }
    expect(levelLadder(lv, items, order).top).not.toBe('keys12');
    const step = { id: `tech:${lv.id}`, kind: 'tech', ladder: { family: 'scales', level: lv.level, ref: lv.id }, skill: 'instrument', sub: 'instrument/piano-tech', domain: 'instrument', difficulty: 900, choices: 0, title: { en: 'x', he: 'x' } } as PathStep;
    const view = { units: [{ id: 'u1', n: 1, no: 1, steps: [{ step, state: 'done', stars: 1, mstars: 1 } as UnitStep], difficulty: 900, section: 'developing', areas: ['instrument'], status: 'past' }], history: [], current: null, progress: { done: 0, checked: 0, total: 0 }, sections: {}, freeze: null } as unknown as PathView;
    const ctx: MasteryCtx = { items, order, now: new Date('2026-11-23T12:00:00Z'), facts: {} };
    const t = decorateMastery(view, ctx).units[0].steps[0];
    expect(t.mstars).toBe(4);
    expect(t.state).not.toBe('mastered');
    expect(missingFor(t, ctx).kind).toBe('tech');
  });
});

describe('17. the weekly ring opens Over time', () => {
  it('wired', () => {
    expect(src('src/ui/TodayCards.tsx')).toMatch(/<WeeklyRingTile lang=\{lang\} onOpen=\{onWeek\} \/>/);
    expect(src('src/ui/App.tsx')).toMatch(/onWeek=\{\(\) => openProgressTab\('time'\)\}/);
  });
});

describe('18. every open rung twice a week (SPEC-KEY-SESSION §3)', () => {
  it('late in the week a block’s short rung takes its slot over a rung already visited twice', () => {
    const fams = families('piano');
    const built = openKeyRungs(fams, 0, 'major', 3, {}).built;
    const lvl = (id: string) => built.find((b) => b.rung.id === id)!.lvl;
    const x = lvl('k-sharm-5');
    const y = lvl('k-sharm-9');
    const ids = (l: LevelDef) => l.specs.flatMap((_, k) => specDrills(l, k, 'fifths-up'));
    const st = (itemId: string, o: Partial<ItemState>): ItemState => ({ itemId, family: 'k-sharm', key: 0, hands: 'R', cleanBpm: 0, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '', history: [], ...o }) as ItemState;
    const items: Record<string, ItemState> = {};
    // x closed last week (not visited this week); y below its target, visited twice this week
    for (const d of ids(x)) items[d.itemId] = st(d.itemId, { cleanBpm: 999, takes: 6, last: '2026-11-20T09:00:00.000Z', passLog: [{ at: '2026-11-18T09:00:00.000Z', bpm: 999 }, { at: '2026-11-19T09:00:00.000Z', bpm: 999 }, { at: '2026-11-20T09:00:00.000Z', bpm: 999 }], history: [{ at: '2026-11-20T09:00:00.000Z', bpm: 999, cv: 0 }] });
    for (const d of ids(y)) items[d.itemId] = st(d.itemId, { cleanBpm: 40, last: '2026-11-28T09:00:00.000Z', history: [{ at: '2026-11-27T09:00:00.000Z', bpm: 40, cv: 0 }] });
    // every other open rung was passed today (out of the pick)
    for (const b of built) if (b.lvl.id !== x.id && b.lvl.id !== y.id) for (const d of ids(b.lvl)) items[d.itemId] = st(d.itemId, { cleanBpm: 999, last: '2026-11-29T09:00:00' });
    const sunday = '2026-11-29T12:00:00';
    expect(keyWeekCoverage(fams, 0, 'major', 3, items, {}, sunday).short.some((r) => r.lvl.id === x.id)).toBe(true);
    const lad = keyLadder(fams, 0, 'major', 3, items, { rungs: 1, now: sunday })!;
    expect(lad.levels.map((l) => l.id)).toContain(x.id);
    expect(lad.levels.map((l) => l.id)).not.toContain(y.id);
  });
});

describe('19–20. a piece’s key mode and course', () => {
  it('the technique chip carries minor; transcribing runs in the piece’s course', () => {
    expect(src('src/ui/Repertoire.tsx')).toMatch(/\{ k: 'technique', key: k\.root, minor: k\.minor \}/);
    expect(src('src/ui/App.tsx')).toMatch(/setDrillsGroup\(a\.minor \? 'minor'/);
    expect(src('src/ui/Drills.tsx')).toMatch(/openGroup \? openGroup/);
    expect(pieceDrillCourse('guitar', 'keys')).toBe('guitar');
    expect(pieceDrillCourse('bass', undefined)).toBe('bass');
    expect(pieceDrillCourse('jazz', 'guitar')).toBe('guitar');
    expect(pieceDrillCourse(undefined, 'ear')).toBe('keys');
    expect(src('src/ui/App.tsx')).not.toMatch(/repDrills\(\{ \.\.\.songWay, part: 'melody' \}, 'keys'/);
  });
});

// keep the import of PlanCell used (type only)
export type _P = PlanCell;
