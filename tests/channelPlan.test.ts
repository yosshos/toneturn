import { describe, expect, it } from 'vitest';
import { drawOf, earCheckDrill, fadeable, inFingersShare, mixForWeek, mixLine, patternIdOf, patternKeys, rhythmDrill, runPresentation, sightCheckDrill, sightDrill, sightForToday, takeChannel } from '../src/engine/channelPlan';
import { generate } from '../src/engine/drills/generate';
import { familyById, levelDrills } from '../src/engine/drills/plan';
import { START_MIX } from '../src/engine/presentation';
import type { Drill, ItemState } from '../src/engine/drills/types';

// Phase 6 (BUILD-PLAN-2026-11; SPEC-EAR-AND-READING §2, §3.1, §8, §8a).
const scales = familyById('scales')!;
const drillsL1 = levelDrills(scales.levels[0], 'fifths-up');
const d0 = drillsL1[0];
const closedState = (d: Drill, extra: Partial<ItemState> = {}): ItemState => ({
  itemId: d.itemId, family: d.spec.family, key: d.spec.key, hands: d.spec.hands, cleanBpm: 200, goalBpm: 200, streak: 0, fails: 0,
  ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0 }, takes: 5, last: '', history: [], targetBpm: 100,
  passLog: [{ at: '2026-11-01T10:00:00Z', bpm: 120 }, { at: '2026-11-01T11:00:00Z', bpm: 120 }, { at: '2026-11-02T10:00:00Z', bpm: 120 }], ...extra,
});
const sameInKey = (d: Drill, key: number) => generate({ ...d.spec, key });

describe('presentation in a technique run', () => {
  it('the pattern is the item id without its key', () => {
    expect(patternIdOf('scales:scale:7:R:major')).toBe('scales:scale:R:major');
    expect(patternIdOf(sameInKey(d0, 2).itemId)).toBe(patternIdOf(sameInKey(d0, 9).itemId));
  });
  it('new → full notation (by ear for an ear-strong player); closed here → rhythm; the pattern closed in ≥3 other keys → name only', () => {
    const t = 100;
    expect(runPresentation({ drill: d0, items: {}, targetBpm: t, strong: 'page', day: '2026-11-22' })).toMatchObject({ fade: 'full', byEar: false, why: 'new' });
    expect(runPresentation({ drill: d0, items: {}, targetBpm: t, strong: 'ear', day: '2026-11-22' })).toMatchObject({ fade: 'full', byEar: true });
    const other = [2, 9, 4].map((k) => sameInKey(d0, k));
    const items = Object.fromEntries(other.map((d) => [d.itemId, closedState(d)]));
    expect(patternKeys(d0, items, t)).toBe(3);
    // find a day where the mix keeps the page channel (r ≥ memory + weak)
    const day = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => `2026-11-2${x}`).find((dd) => drawOf(`${d0.itemId}|${dd}`) >= START_MIX.memory + START_MIX.weak)!;
    expect(runPresentation({ drill: d0, items, targetBpm: t, strong: 'page', day })).toMatchObject({ fade: 'name', why: 'pattern' });
    const here = { [d0.itemId]: closedState(d0) };
    expect(runPresentation({ drill: d0, items: here, targetBpm: t, strong: 'page', day })).toMatchObject({ fade: 'rhythm', why: 'known' });
  });
  it('a known item takes the weekly mix: ear plays it first, memory hides everything', () => {
    const here = { [d0.itemId]: closedState(d0) };
    const days = Array.from({ length: 60 }, (_, i) => `2026-12-${String(i).padStart(2, '0')}`);
    const mem = days.find((dd) => drawOf(`${d0.itemId}|${dd}`) < START_MIX.memory)!;
    const ear = days.find((dd) => { const r = drawOf(`${d0.itemId}|${dd}`); return r >= START_MIX.memory && r < START_MIX.memory + START_MIX.weak; })!;
    expect(runPresentation({ drill: d0, items: here, targetBpm: 100, strong: 'page', day: mem })).toMatchObject({ fade: 'none', why: 'mix-memory' });
    expect(runPresentation({ drill: d0, items: here, targetBpm: 100, strong: 'page', day: ear })).toMatchObject({ byEar: true, why: 'mix-ear' });
  });
  it('a miss brings back one step of notation; ear / reading families never fade', () => {
    const items = { [d0.itemId]: closedState(d0, { channels: { unaided: { n: 1, clean: 1, best: 100 } } }) };
    const page = Array.from({ length: 60 }, (_, i) => `2027-01-${i}`).find((dd) => drawOf(`${d0.itemId}|${dd}`) >= START_MIX.memory + START_MIX.weak)!;
    expect(runPresentation({ drill: d0, items, targetBpm: 100, strong: 'page', day: page }).fade).toBe('none');
    expect(runPresentation({ drill: d0, items, targetBpm: 100, strong: 'page', day: page, missedLast: true }).fade).toBe('name');
    const read = levelDrills(familyById('k-read')!.levels[0], 'fifths-up')[0];
    expect(fadeable(read)).toBe(false);
    expect(runPresentation({ drill: read, items: {}, targetBpm: 80, strong: 'ear', day: page })).toMatchObject({ fade: 'full', byEar: false, why: 'off' });
  });
  it('the take channel: shown → page, by ear → ear-known, a name / nothing → unaided', () => {
    expect(takeChannel({ drill: d0, st: undefined, fade: 'name', byEar: false, shown: true })).toBe('page-known');
    expect(takeChannel({ drill: d0, st: undefined, fade: 'full', byEar: true, shown: false })).toBe('ear-known');
    expect(takeChannel({ drill: d0, st: undefined, fade: 'none', byEar: false, shown: false })).toBe('unaided');
    expect(takeChannel({ drill: d0, st: undefined, fade: 'rhythm', byEar: false, shown: false })).toBe('page-known');
  });
  it('the rhythm view keeps the onsets and drops the pitches', () => {
    const r = rhythmDrill(d0);
    expect(new Set(r.notes.map((n) => n.pitch)).size).toBeLessThanOrEqual(2);
    expect(r.notes.map((n) => n.beat)).toEqual([...new Set(d0.notes.map((n) => `${n.hand}|${n.beat}`))].map((k) => Number(k.split('|')[1])));
  });
  it('in the fingers: closed items also passed from memory', () => {
    const a = closedState(d0), b = closedState(drillsL1[1], { channels: { unaided: { n: 2, clean: 1, best: 90 } } });
    expect(inFingersShare({ [a.itemId]: a, [b.itemId]: b })).toBe(0.5);
  });
});

describe('the weekly mix', () => {
  it('kept within the week, moved ≤ 5 points toward the target the next week', () => {
    const p = { ear: 0.9, reading: 0.3 };
    const w1 = mixForWeek(null, p, 0, '2026-11-16');
    expect(w1.mix.weak).toBeCloseTo(0.25, 5);
    expect(mixForWeek(w1, { ear: 0.5, reading: 0.5 }, 0, '2026-11-16')).toBe(w1);
    const w2 = mixForWeek(w1, p, 0, '2026-11-23');
    expect(w2.mix.weak).toBeCloseTo(0.3, 5);
    expect(mixLine(w2.mix, 'ear', 'en')).toBe('by ear 60% · reading 30% · memory 10%');
  });
});

describe('the daily sight dose and the level-test checks', () => {
  it('piano: a new reading exercise every day, in the key of the day, a level below the reading level', () => {
    const a = sightDrill({ instrument: 'piano', items: {}, order: 'fifths-up', key: 7, day: '2026-11-22' })!;
    const b = sightDrill({ instrument: 'piano', items: {}, order: 'fifths-up', key: 7, day: '2026-11-23' })!;
    expect(a.spec.family).toBe('k-read');
    expect(a.spec.key).toBe(7);
    expect(a.itemId).not.toBe(b.itemId);
    expect(JSON.stringify(a.notes)).not.toBe(JSON.stringify(b.notes));
    expect(a.title.en).toMatch(/^Sight dose/);
    // the level's own items are never the dose (it is new material)
    const lvIds = new Set(familyById('k-read')!.levels.flatMap((l) => levelDrills(l, 'fifths-up').map((d) => d.itemId)));
    expect(lvIds.has(a.itemId)).toBe(false);
  });
  it('kept for the day: the same item all day, done once played', () => {
    const o = { instrument: 'piano' as const, items: {} as Record<string, ItemState>, order: 'fifths-up' as const, key: 2, day: '2026-11-22' };
    const first = sightForToday(null, o)!;
    expect(first.keep).not.toBeNull();
    const again = sightForToday(first.keep, { ...o, items: { [first.drill.itemId]: closedState(first.drill) } })!;
    expect(again.drill.itemId).toBe(first.drill.itemId);
    expect(again.done).toBe(true);
    expect(again.keep).toBeNull();
    expect(sightForToday(first.keep, { ...o, day: '2026-11-23' })!.drill.itemId).not.toBe(first.drill.itemId);
  });
  it('guitar and bass: a reading item not played yet', () => {
    for (const inst of ['guitar', 'bass'] as const) {
      const d = sightDrill({ instrument: inst, items: {}, order: 'fifths-up', key: 0, day: '2026-11-22' });
      expect(d?.spec.family).toBe(inst === 'guitar' ? 'g-reading' : 'b-read');
    }
  });
  it('the level-test checks: a fresh phrase by ear, a fresh exercise at sight', () => {
    const ear = earCheckDrill({ instrument: 'piano', items: {}, order: 'fifths-up', level: 3, key: 5 })!;
    expect(ear.spec.family).toBe('k-phrase');
    const seen = { [ear.itemId]: closedState(ear) };
    expect(earCheckDrill({ instrument: 'piano', items: seen, order: 'fifths-up', level: 3, key: 5 })!.itemId).not.toBe(ear.itemId);
    expect(sightCheckDrill({ instrument: 'piano', items: {}, order: 'fifths-up', level: 4, key: 0, day: '2026-11-22' })!.spec.family).toBe('k-read');
    expect(earCheckDrill({ instrument: 'drums', items: {}, order: 'fifths-up', key: 0 })).toBeNull();
  });
});
