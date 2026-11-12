import { describe, expect, it } from 'vitest';
import { barHits, barKey, isKitSave, itemSound, kitAnswer, kitBar, kitItem, kitItemOf, kitOver, kitResult, kitTick, newKitSave, KIT_LEVELS, KIT_RUN_MS, KIT_WRONG_MS } from '../src/engine/kitRead';
import { clearsRun, tierDef, TIERS } from '../src/engine/gameTiers';

describe('Kit Read Rush', () => {
  it('every tier has a level the engine knows', () => {
    for (const t of TIERS) {
      const lv = tierDef('kitread', t)?.levels?.[0];
      expect(lv).toBeGreaterThanOrEqual(1);
      expect(lv).toBeLessThanOrEqual(KIT_LEVELS);
    }
  });

  it('items are deterministic, three distinct bars, the answer among them', () => {
    for (let lv = 1; lv <= KIT_LEVELS; lv++)
      for (let i = 0; i < 25; i++) {
        const a = kitItem(1234, i, lv);
        expect(kitItem(1234, i, lv)).toEqual(a);
        expect(a.options).toHaveLength(3);
        expect(new Set(a.options.map(barKey)).size).toBe(3);
        expect(a.answer).toBeGreaterThanOrEqual(0);
        expect(a.answer).toBeLessThan(3);
        expect(barKey(a.options[a.answer])).toBe(barKey(kitBar((1234 + Math.imul(i + 1, 0x9e3779b1)) >>> 0, lv)));
      }
  });

  it('bars are well formed: lanes as long as the bar, groups sum to the steps', () => {
    for (let lv = 1; lv <= KIT_LEVELS; lv++)
      for (let s = 0; s < 40; s++) {
        const b = kitBar(s * 977, lv);
        expect(b.groups.reduce((x, y) => x + y, 0)).toBe(b.steps);
        for (const v of Object.values(b.lanes)) if (v) expect(v.length).toBe(b.steps);
        expect(barHits(b).length).toBeGreaterThan(2);
      }
  });

  it('level 6 includes odd meters, graces and the ride', () => {
    const kinds = new Set<string>();
    for (let s = 0; s < 200; s++) {
      const b = kitBar(s * 31 + 7, 6);
      kinds.add(b.den === 8 ? 'odd' : b.grace ? 'grace' : b.lanes.r ? 'ride' : 'other');
    }
    expect([...kinds].sort()).toEqual(['grace', 'odd', 'ride']);
  });

  it('the sound has a count-in and the bar after it', () => {
    const it0 = kitItem(9, 0, 1);
    const snd = itemSound(it0);
    expect(snd.events.filter((e) => e.perc === 'click' || e.perc === 'accent')).toHaveLength(4);
    expect(snd.events.some((e) => e.perc === 'kick' && e.start >= snd.startAt - 1e-9)).toBe(true);
  });

  it('run: right adds points, wrong costs time, the clock ends it, result detail', () => {
    let s = newKitSave(42, 2, 'p');
    expect(isKitSave(s)).toBe(true);
    const a = kitItemOf(s).answer;
    const r1 = kitAnswer(s, a);
    expect(r1.correct).toBe(true);
    expect(r1.state.score).toBe(10);
    s = r1.state;
    const r2 = kitAnswer(s, (kitItemOf(s).answer + 1) % 3);
    expect(r2.correct).toBe(false);
    expect(r2.state.timeLeftMs).toBe(KIT_RUN_MS - KIT_WRONG_MS);
    s = kitTick(r2.state, KIT_RUN_MS);
    expect(kitOver(s)).toBe(true);
    expect(isKitSave(s)).toBe(false);
    const res = kitResult(s);
    expect(res.detail).toMatchObject({ right: 1, wrong: 1, level: 2, tier: 'p', accuracy: 50, rounds: 2 });
  });

  it('clears with enough right answers at 85 %+', () => {
    expect(clearsRun('kitread', 'pp', 100, { right: 8, wrong: 1, level: 1 })).toBe(true);
    expect(clearsRun('kitread', 'pp', 100, { right: 7, wrong: 0, level: 1 })).toBe(false);
    expect(clearsRun('kitread', 'pp', 100, { right: 8, wrong: 3, level: 1 })).toBe(false);
  });
});
