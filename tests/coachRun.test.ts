// Owner 2026-11-25: a player can stop in the middle and the session continues the same day from where they stopped.
// The real key-session ladder and coach, a few takes, a save (storage/coachRun.ts), a restore hours later — and the
// restored session asks for exactly the takes the uninterrupted one would (same rung, stage, item, note value, tempo),
// its clock not charged for the time away. Another day: nothing to restore (a new session starts).
import { beforeEach, describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { families, itemTargetBpm, familyById } from '../src/engine/drills/plan';
import { coachAfter, coachStart, coachTake, type CoachState, type CoachTake } from '../src/engine/drills/coach';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { withStageTake } from '../src/engine/drills/rubato';
import { bandOfBpm, thresholds } from '../src/engine/drills/analyze';
import { DEFAULT_DRILL_SETTINGS, type ItemState, type TakeMetrics } from '../src/engine/drills/types';
import { keySessionLadder } from '../src/engine/drills/stages';
import type { FamilyDef } from '../src/engine/drills/generate';
import { clearCoachRun, clearOpenRun, clearQueueAt, coachRunPlayable, hasCoachRun, loadCoachRun, loadOpenRun, loadQueueAt, loadQueueIds, queueRunKey, resumedState, saveCoachRun, saveOpenRun, saveQueueAt } from '../src/storage/coachRun';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const T0 = Date.parse('2026-11-25T10:00:00');
const DAY = '2026-11-25';
const order = 'fifths-up' as const;

function metrics(t: CoachTake, clean: boolean): TakeMetrics {
  const th = thresholds(bandOfBpm(t.drill, t.bpm));
  return { verdict: clean ? 'clean' : 'not', bpm: t.bpm, nps: t.nps ?? 0, accuracy: clean ? 1 : 0.8, wrong: clean ? 0 : 2, missing: 0, timingMean: 0, timingSD: t.stage === 'free' ? null : 0.5 * th.sd, cvR: null, cvL: null, handsMean: null, handsAbs: null, chordSpread: null, velSD: null, velMean: null, bandHit: null, slope: null, r2: null, accentGap: null, hesitations: 0 } as unknown as TakeMetrics;
}

/** One take the way the screen plays it: the item's state, then the coach's next state (and the stages it saved). */
function step(fam: FamilyDef, c: CoachState, items: Record<string, ItemState>, now: number, clean = true) {
  const t = coachTake(fam, c, items, order, () => true);
  const m = metrics(t, clean);
  const d = t.drill;
  const st0 = items[d.itemId] ?? newItem(d);
  items[d.itemId] = t.stage === 'free' ? withStageTake(st0, 'free', m) : applyTake(st0, m, t.bpm, new Date(now).toISOString(), DEFAULT_DRILL_SETTINGS, { targetBpm: itemTargetBpm(d) }).state;
  const nx = coachAfter(fam, c, t, m, items, order, now + 20_000, () => true);
  for (const x of nx.items ?? []) items[x.itemId] = { ...(items[x.itemId] ?? x), stages: x.stages };
  return { t, nx };
}
const sig = (t: CoachTake) => `${t.drill.itemId}|${t.stageInfo?.code ?? t.level.id}|${t.stage ?? 'tempo'}|${t.play?.per ?? '-'}|${t.play?.bpm ?? t.bpm}`;

beforeEach(() => mem.clear());

describe('coach runs resume the same day', () => {
  it('a key session saved mid-way continues with exactly the same takes, its clock not charged for the time away', () => {
    const fam = keySessionLadder(families('piano'), 0, 'major', 0, {}, { instrument: 'piano', now: T0 }) as FamilyDef;
    const items: Record<string, ItemState> = {};
    let c = coachStart(fam, items, order, T0, { noProbe: true, minutes: 30 });
    let now = T0;
    for (let k = 0; k < 7; k++) {
      const { nx } = step(fam, c, items, now, k !== 3);
      c = nx.state;
      now += 40_000;
      expect(nx.end).toBe(false);
    }
    // stopped here: saved (the ladder travels through JSON, as on the device)
    saveCoachRun({ key: 'key:piano:major:0', day: DAY, fam, state: c, xp: 42, takes: 7, clean: 6, bests: [] }, now);
    const away = 3 * 3600_000;
    const v = loadCoachRun('key:piano:major:0', DAY)!;
    expect(v).not.toBeNull();
    expect(v.fam).toEqual(JSON.parse(JSON.stringify(fam)));
    expect([v.xp, v.takes, v.clean]).toEqual([42, 7, 6]);
    const r = resumedState(v, now + away);
    expect(r.startedAt).toBe(c.startedAt + away);
    expect(r.ks!.visitAt).toBe(c.ks!.visitAt + away);
    expect(r.step).toBe(c.step);
    expect(r.ks!.nps).toBe(c.ks!.nps);
    expect(r.ks!.passed).toEqual(c.ks!.passed);
    // the uninterrupted session and the resumed one ask for the same next takes
    const a: string[] = [];
    const b: string[] = [];
    const itemsA = JSON.parse(JSON.stringify(items)) as Record<string, ItemState>;
    const itemsB = JSON.parse(JSON.stringify(items)) as Record<string, ItemState>;
    let ca = c;
    let cb = r;
    for (let k = 0; k < 10; k++) {
      const sa = step(fam, ca, itemsA, now + k * 40_000);
      const sb = step(v.fam, cb, itemsB, now + away + k * 40_000);
      a.push(sig(sa.t));
      b.push(sig(sb.t));
      ca = sa.nx.state;
      cb = sb.nx.state;
    }
    expect(b).toEqual(a);
  });

  it('a family coach (scales) keeps its step, key, hand and tempo climb', () => {
    const fam = familyById('scales')!;
    const items: Record<string, ItemState> = {};
    let c = coachStart(fam, items, order, T0, { noProbe: true });
    for (let k = 0; k < 6; k++) c = step(fam, c, items, T0 + k * 30_000).nx.state;
    saveCoachRun({ key: 'fam:piano:scales', day: DAY, fam, state: c, xp: 10, takes: 6, clean: 6, bests: [] }, T0 + 200_000);
    const v = loadCoachRun('fam:piano:scales', DAY)!;
    const r = resumedState(v, T0 + 3_600_000);
    expect({ step: r.step, keyIdx: r.keyIdx, spec: r.spec, up: r.up, run: r.run }).toEqual({ step: c.step, keyIdx: c.keyIdx, spec: c.spec, up: c.up, run: c.run });
    expect(sig(coachTake(v.fam, r, items, order))).toBe(sig(coachTake(fam, c, items, order)));
  });

  it('another day: nothing to continue — a new session starts (and the old day drops out on the next save)', () => {
    const fam = familyById('scales')!;
    const c = coachStart(fam, {}, order, T0, { noProbe: true });
    saveCoachRun({ key: 'fam:piano:scales', day: DAY, fam, state: c, xp: 0, takes: 1, clean: 1, bests: [] }, T0);
    expect(hasCoachRun('fam:piano:scales', DAY)).toBe(true);
    expect(loadCoachRun('fam:piano:scales', '2026-11-26')).toBeNull();
    saveCoachRun({ key: 'fam:piano:arpeggios', day: '2026-11-26', fam, state: c, xp: 0, takes: 1, clean: 1, bests: [] }, T0 + 86_400_000);
    expect(loadCoachRun('fam:piano:scales', DAY)).toBeNull();
    expect(hasCoachRun('fam:piano:arpeggios', '2026-11-26')).toBe(true);
  });

  it('runs are kept apart by key; clearing one (a run that reached its end) leaves the others', () => {
    const fam = familyById('scales')!;
    const c = coachStart(fam, {}, order, T0, { noProbe: true });
    for (const key of ['key:piano:major:0', 'key:piano:major:7', 'today:piano', 'block:s1:b2']) saveCoachRun({ key, day: DAY, fam, state: c, xp: 0, takes: 1, clean: 1, bests: [] }, T0);
    clearCoachRun('key:piano:major:7', DAY);
    expect(hasCoachRun('key:piano:major:7', DAY)).toBe(false);
    expect(['key:piano:major:0', 'today:piano', 'block:s1:b2'].every((k) => hasCoachRun(k, DAY))).toBe(true);
  });

  it('after an app update a saved run is not continued (its ladders may have changed)', () => {
    const fam = familyById('scales')!;
    const c = coachStart(fam, {}, order, T0, { noProbe: true });
    saveCoachRun({ key: 'fam:piano:scales', day: DAY, fam, state: c, xp: 0, takes: 1, clean: 1, bests: [] }, T0);
    expect(hasCoachRun('fam:piano:scales', DAY)).toBe(true);
    const l = JSON.parse(mem.get('toneturn.coachRun.v1')!);
    l[0].ver = 'an-older-version';
    mem.set('toneturn.coachRun.v1', JSON.stringify(l));
    expect(loadCoachRun('fam:piano:scales', DAY)).toBeNull();
  });

  it('a saved ladder the app can no longer build is not playable (dropped, never a blank screen)', () => {
    const fam = keySessionLadder(families('piano'), 0, 'major', 0, {}, { instrument: 'piano', now: T0 }) as FamilyDef;
    const c = coachStart(fam, {}, order, T0, { noProbe: true, minutes: 30 });
    saveCoachRun({ key: 'key:piano:major:0', day: DAY, fam, state: c, xp: 0, takes: 1, clean: 1, bests: [] }, T0);
    const v = loadCoachRun('key:piano:major:0', DAY)!;
    expect(coachRunPlayable(v, {}, order)).toBe(true);
    const broken = JSON.parse(JSON.stringify(v));
    for (const lv of broken.fam.levels) for (const sp of lv.specs) sp.kind = 'no-such-kind-xyz';
    expect(coachRunPlayable(broken, {}, order)).toBe(false);
    const gone = JSON.parse(JSON.stringify(v));
    gone.fam.levels = gone.fam.levels.slice(0, 1);
    gone.state.steps = [...gone.state.steps, 'a-level-that-was-removed'];
    expect(coachRunPlayable(gone, {}, order)).toBe(false);
  });

  it('a broken store never throws and restores nothing', () => {
    mem.set('toneturn.coachRun.v1', '{oops');
    expect(loadCoachRun('fam:piano:scales', DAY)).toBeNull();
    mem.set('toneturn.coachRun.v1', JSON.stringify([{ key: 'fam:piano:scales', day: DAY, fam: { levels: [] }, state: {} }]));
    expect(loadCoachRun('fam:piano:scales', DAY)).toBeNull();
  });
});

describe('list runs and the open run', () => {
  it('a list keeps its place for the day; the same items make the same key', () => {
    const k = queueRunKey('piano', ['a', 'b', 'c']);
    expect(queueRunKey('piano', ['a', 'b', 'c'])).toBe(k);
    expect(queueRunKey('piano', ['a', 'c', 'b'])).not.toBe(k);
    saveQueueAt(k, 2, DAY);
    expect(loadQueueAt(k, DAY)).toBe(2);
    expect(loadQueueAt(k, '2026-11-26')).toBeNull();
    clearQueueAt(k, DAY);
    expect(loadQueueAt(k, DAY)).toBeNull();
  });
  it("a block's list keeps the list itself: the place holds only for that list", () => {
    saveQueueAt('qb:s1:b1', 3, DAY, ['x', 'y', 'z', 'w']);
    expect(loadQueueIds('qb:s1:b1', DAY)).toEqual(['x', 'y', 'z', 'w']);
    expect(loadQueueAt('qb:s1:b1', DAY, ['x', 'y', 'z', 'w'])).toBe(3);
    expect(loadQueueAt('qb:s1:b1', DAY, ['y', 'x', 'z', 'w'])).toBeNull();
  });
  it('the run open on the technique screen is remembered for the day only', () => {
    saveOpenRun({ key: 'key:piano:major:0', ladder: true }, DAY);
    expect(loadOpenRun(DAY)).toEqual({ key: 'key:piano:major:0', ladder: true, day: DAY });
    expect(loadOpenRun('2026-11-26')).toBeNull();
    clearOpenRun();
    expect(loadOpenRun(DAY)).toBeNull();
  });
});
