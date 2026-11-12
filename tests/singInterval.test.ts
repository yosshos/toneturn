import { describe, expect, it } from 'vitest';
import { isSiSave, newSi, siAnswer, siCents, siCurrent, siItem, siResult, siTick, SiJudge, SI_RUN_MS, SI_TIMEOUT_MS } from '../src/engine/singInterval';
import { clearsRun } from '../src/engine/gameTiers';

describe('sing the interval: items', () => {
  it('is deterministic, the target sits in the range, the interval matches the level', () => {
    const pools: Record<number, number[]> = { 1: [3, 4, 5, 7, 12], 2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 4: [8, 9, 10, 11], 5: [13, 14, 15, 16] };
    for (let lv = 1; lv <= 6; lv++)
      for (let i = 0; i < 60; i++) {
        const it = siItem(7, i, lv, 55, 67);
        expect(it).toEqual(siItem(7, i, lv, 55, 67));
        expect(it.target).toBeGreaterThanOrEqual(55);
        expect(it.target).toBeLessThanOrEqual(67);
        expect(it.target - it.ref).toBe(it.semis);
        if (lv <= 5) expect(pools[lv]).toContain(Math.abs(it.semis));
        if (lv === 1 || lv === 2 || lv === 5) expect(it.semis).toBeGreaterThan(0);
        if (lv === 6) expect(it.ask.en).toMatch(/^the .+ of [A-G]/);
      }
  });
  it('levels 3 and 4 go both ways', () => {
    const dirs = new Set(Array.from({ length: 40 }, (_, i) => Math.sign(siItem(3, i, 3, 55, 67).semis)));
    expect(dirs).toEqual(new Set([1, -1]));
  });
  it('never repeats an interval right away', () => {
    let s = newSi(11, 1, 50, 55, 67);
    for (let i = 0; i < 30; i++) {
      const a = siCurrent(s);
      s = siAnswer({ ...s, timeLeftMs: SI_RUN_MS }, true);
      expect(siCurrent(s).key).not.toBe(a.key);
    }
  });
  it('octave-shifted singing counts, except for octave intervals', () => {
    expect(siCents(64.2, { target: 64, semis: 4 })).toBe(20);
    expect(siCents(52.1, { target: 64, semis: 4 })).toBe(10);
    expect(siCents(60, { target: 72, semis: 12 })).toBe(-1200);
  });
});

describe('sing the interval: the judge', () => {
  it('right after a steady hold in the window', () => {
    const j = new SiJudge({ target: 64, semis: 4 }, 50);
    expect(j.feed(0, 64.1)).toBeNull();
    expect(j.feed(200, 64.2)).toBeNull();
    expect(j.feed(320, 63.9)).toBe('right');
  });
  it('a slide through is not wrong; a steady wrong pitch is', () => {
    const j = new SiJudge({ target: 64, semis: 4 }, 50);
    expect(j.feed(0, 61)).toBeNull();
    expect(j.feed(100, 62)).toBeNull();
    expect(j.feed(200, 67)).toBeNull();
    expect(j.feed(500, 67)).toBeNull();
    expect(j.feed(820, 67.1)).toBe('wrong');
  });
  it('silence times out', () => {
    const j = new SiJudge({ target: 64, semis: 4 }, 50);
    expect(j.feed(0, null)).toBeNull();
    expect(j.feed(SI_TIMEOUT_MS, null)).toBe('wrong');
  });
});

describe('sing the interval: the run', () => {
  it('90 s, wrong costs 3 s, result clears by the rush rule', () => {
    let s = newSi(5, 2, 50, 55, 67, 'p');
    expect(isSiSave(s)).toBe(true);
    s = siAnswer(s, false);
    expect(s.timeLeftMs).toBe(SI_RUN_MS - 3000);
    for (let i = 0; i < 9; i++) s = siAnswer(s, true);
    s = siTick(s, 1e6);
    expect(s.over).toBe(true);
    expect(isSiSave(s)).toBe(false);
    const r = siResult(s);
    expect(r.detail).toMatchObject({ right: 9, wrong: 1, level: 2, tier: 'p', input: 'mic' });
    expect(clearsRun('singinterval', 'p', r.score, r.detail)).toBe(true);
    expect(clearsRun('singinterval', 'p', r.score, { ...r.detail, right: 8 })).toBe(false);
    expect(clearsRun('singinterval', 'p', r.score, { ...r.detail, input: 'touch' })).toBe(false);
  });
});
