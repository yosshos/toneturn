import { describe, expect, it } from 'vitest';
import { barBeatsOf, gradePoly, isPolySave, newPolySave, polyBacking, polyDone, polyPattern, polyResult, polyRounds, polyWindow, POLY_BARS, type PolyTap } from '../src/engine/polyLock';
import { clearsRun, tierDef, TIERS, gameXp } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';

const tapsFor = (r: Parameters<typeof polyPattern>[0], bpm: number, shift = 0): PolyTap[] => polyPattern(r).map((o) => ({ lane: o.lane, ms: o.beat * (60000 / bpm) + shift }));

describe('polyrhythm lock', () => {
  it('each level has its rounds; tiers map mp..ff to levels 1..4', () => {
    expect(polyRounds(1).map((r) => `${r.fast}:${r.slow}`)).toEqual(['2:1', '3:2']);
    expect(polyRounds(2).some((r) => r.fast === 4 && r.slow === 3)).toBe(true);
    expect(polyRounds(3).some((r) => r.swapAt !== undefined)).toBe(true);
    expect(polyRounds(3).some((r) => r.fast === 5 && r.slow === 4)).toBe(true);
    expect(polyRounds(4).some((r) => r.fast === 7 && r.slow === 4 && r.groove)).toBe(true);
    expect(TIERS.slice(2).map((t) => tierDef('polylock', t)?.levels?.[0])).toEqual([1, 2, 3, 4]);
    expect(Number(tierDef('polylock', 'ff')?.params?.bpm)).toBe(120);
  });

  it('a pattern has fast×bars right-hand and slow×bars left-hand onsets, sharing each bar line', () => {
    const r = { fast: 3, slow: 2 };
    const p = polyPattern(r);
    expect(p.filter((o) => o.lane === 'R')).toHaveLength(3 * POLY_BARS);
    expect(p.filter((o) => o.lane === 'L')).toHaveLength(2 * POLY_BARS);
    expect(p.filter((o) => o.beat === barBeatsOf(r))).toHaveLength(2);
  });

  it('the swap round trades the lanes from its swap bar', () => {
    const r = { fast: 3, slow: 2, swapAt: 4 };
    const p = polyPattern(r);
    const bb = barBeatsOf(r);
    expect(p.filter((o) => o.beat < 4 * bb && o.lane === 'R')).toHaveLength(12);
    expect(p.filter((o) => o.beat >= 4 * bb && o.lane === 'L')).toHaveLength(12);
  });

  it('perfect taps score 100; late beyond the window misses; extra taps cost; one silent hand halves it', () => {
    const r = { fast: 4, slow: 3 };
    const bpm = 72;
    const w = polyWindow(r, bpm);
    const pat = polyPattern(r);
    expect(gradePoly(pat, tapsFor(r, bpm), bpm, w).accuracy).toBe(100);
    expect(gradePoly(pat, tapsFor(r, bpm, w - 5), bpm, w).accuracy).toBe(100);
    expect(gradePoly(pat, tapsFor(r, bpm, w + 20), bpm, w).accuracy).toBe(0);
    const extra = [...tapsFor(r, bpm), { lane: 'R' as const, ms: 10_000_000 }];
    expect(gradePoly(pat, extra, bpm, w).R.extra).toBe(1);
    expect(gradePoly(pat, extra, bpm, w).accuracy).toBeLessThan(100);
    const onlyL = tapsFor(r, bpm).filter((t) => t.lane === 'L');
    expect(gradePoly(pat, onlyL, bpm, w).accuracy).toBe(50);
    // the wrong hand does not count
    const swapped = tapsFor(r, bpm).map((t) => ({ ...t, lane: t.lane === 'L' ? ('R' as const) : ('L' as const) }));
    expect(gradePoly(pat, swapped, bpm, w).accuracy).toBeLessThan(60);
  });

  it('the window stays 40–90 ms', () => {
    for (let l = 1; l <= 4; l++) for (const r of polyRounds(l)) for (const bpm of [60, 120, 200]) expect(polyWindow(r, bpm)).toBeGreaterThanOrEqual(40), expect(polyWindow(r, bpm)).toBeLessThanOrEqual(90);
  });

  it('the backing has a count-in, a two-bar guide and one click per bar', () => {
    const r = { fast: 3, slow: 2 };
    const b = polyBacking(r, 70);
    expect(b.clicks.filter((c) => c.count)).toHaveLength(barBeatsOf(r));
    expect(b.clicks.filter((c) => !c.count)).toHaveLength(POLY_BARS);
    expect(b.wood).toHaveLength(2 * (3 + 2));
    expect(b.hats).toHaveLength(0);
    expect(polyBacking({ fast: 7, slow: 4, groove: true }, 120).hats.length).toBe(POLY_BARS * 8);
  });

  it('a run: saves, resumes, ends after its rounds, reports accuracy and clears at 85', () => {
    let s = newPolySave(2, 'mf');
    expect(isPolySave(s)).toBe(true);
    s = { ...s, rounds: [{ accuracy: 90, hitsL: 1, hitsR: 0.9 }] };
    expect(isPolySave(s)).toBe(true);
    s = { ...s, rounds: [...s.rounds, { accuracy: 84, hitsL: 0.9, hitsR: 0.8 }] };
    expect(polyDone(s)).toBe(true);
    expect(isPolySave(s)).toBe(false);
    const res = polyResult(s, 'touch');
    expect(res.detail.accuracy).toBe(87);
    expect(res.detail.tier).toBe('mf');
    expect(clearsRun('polylock', 'mf', res.score, res.detail)).toBe(true);
    expect(clearsRun('polylock', 'mf', res.score, { ...res.detail, accuracy: 80 })).toBe(false);
    expect(gameXp('polylock', 'mf', res.score, res.detail)).toBeGreaterThan(0);
    const ev = gameEvents('polylock', res.score, res.detail, '2026-11-11T10:00:00Z', 's1');
    expect(ev.length).toBeGreaterThan(0);
    expect(ev[0].difficulty).toBeGreaterThanOrEqual(1100);
  });
});
