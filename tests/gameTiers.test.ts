import { describe, expect, it } from 'vitest';
import { DYN } from '../src/engine/courseSocial';
import {
  afterRun,
  bandOfTier,
  bandsOpen,
  clearsRun,
  DYN_FROM,
  DYN_NAMES,
  GAME_TIERS,
  gameXp,
  lockReason,
  seedTier,
  tierAllowed,
  tierDifficulty,
  tierInfo,
  tierOfRating,
  tierSeed,
  tierStepStars,
} from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';
import { ladderOf, newRush, rushAnswer, rushItem, rushResult } from '../src/engine/rush';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import { applyGameRun, emptyProgress } from '../src/storage/progress';
import type { Ratings } from '../src/engine/rating';

const R = (r: number, n: number): Ratings => ({ chords: { r, n, rd: 0 } as never });

describe('game tiers', () => {
  it('uses the course-level bands (DYN)', () => {
    expect(DYN_NAMES).toEqual(DYN.map((d) => d.name));
    expect(DYN_FROM).toEqual(DYN.map((d) => d.from));
    expect(tierOfRating(700)).toBe('pp');
    expect(tierOfRating(1120)).toBe('mf');
    expect(tierOfRating(1500)).toBe('ff');
  });

  it('opens at the rating tier, one lower while provisional, never below cleared + 1', () => {
    expect(tierInfo('rush-chord', R(1120, 20), undefined, 'ear').open).toBe('mf');
    expect(tierInfo('rush-chord', R(1120, 3), undefined, 'ear').open).toBe('mp');
    expect(tierInfo('rush-chord', {}, undefined, 'ear').open).toBe('pp');
    const st = { cleared: 'f' as const, recent: {}, best: {}, runs: 5 };
    expect(tierInfo('rush-chord', R(900, 20), st, 'ear').open).toBe('ff');
  });

  it('allows lower tiers and one above; locks the rest with a reason', () => {
    const info = tierInfo('rush-chord', R(1000, 20), undefined, 'ear'); // mp
    expect(tierAllowed(info, 'pp')).toBe(true);
    expect(tierAllowed(info, 'mf')).toBe(true);
    expect(tierAllowed(info, 'f')).toBe(false);
    expect(lockReason(info, 'f', 'en')).toBe('clear mp first');
    expect(tierAllowed({ ...info, forced: 'ff' }, 'ff')).toBe(true);
  });

  it('clears a tier on 2 of the last 3 runs, never demotes', () => {
    let s = afterRun(undefined, 'mp', true, 100).state;
    expect(s.cleared).toBeNull();
    const r = afterRun(s, 'mp', true, 120);
    expect(r.newlyCleared).toBe('mp');
    s = r.state;
    s = afterRun(s, 'mp', false, 10).state;
    s = afterRun(s, 'p', false, 10).state;
    expect(s.cleared).toBe('mp');
    expect(afterRun(s, 'p', true, 1).newlyCleared).toBeNull();
  });

  it('rush clear rule: top rung, accuracy and target', () => {
    const n = GAME_TIERS['rush-chord'].tiers.mf.rungs!.length;
    expect(clearsRun('rush-chord', 'mf', 0, { right: 16, wrong: 2, level: n })).toBe(true);
    expect(clearsRun('rush-chord', 'mf', 0, { right: 16, wrong: 6, level: n })).toBe(false);
    expect(clearsRun('rush-chord', 'mf', 0, { right: 10, wrong: 0, level: n })).toBe(false);
    expect(clearsRun('pitchmemory', 'mf', 0, { cents: 30 })).toBe(true);
    expect(clearsRun('pitchmemory', 'ff', 0, { cents: 30 })).toBe(false);
  });

  it('XP: per right answer × tier, at most 25 a game', () => {
    expect(gameXp('rush-chord', 'pp', 0, { right: 10, wrong: 0 })).toBe(10);
    expect(gameXp('rush-chord', 'ff', 0, { right: 10, wrong: 0 })).toBe(15);
    expect(gameXp('rush-chord', 'ff', 0, { right: 40, wrong: 0 })).toBe(25);
  });

  it('every rush rung exists in the topic catalogue', () => {
    for (const spec of Object.values(GAME_TIERS))
      for (const t of DYN_NAMES)
        for (const r of spec.tiers[t].rungs ?? []) {
          if (r.topic === 'fretboard') continue;
          expect(TOPIC_GEN[r.topic], r.topic).toBeTruthy();
          expect(r.level).toBeLessThanOrEqual(TOPIC_GEN[r.topic].levels.length);
        }
  });

  it('a tiered rush run climbs only inside its rungs and rates in its band', () => {
    for (const mode of ['chord', 'interval', 'progression', 'note', 'keysig', 'fretboard'] as const) {
      for (const t of DYN_NAMES) {
        const rungs = GAME_TIERS[`rush-${mode}`].tiers[t].rungs!;
        let s = newRush({ mode, seed: 7, startLevel: 1, tier: t, rungs });
        for (let i = 0; i < 40; i++) {
          rushItem(s.opts, s.i, s.level);
          s = rushAnswer(s, true).state;
          if (s.over) break;
        }
        expect(s.level).toBeLessThanOrEqual(ladderOf(s.opts).length);
        const res = rushResult(s);
        expect(res.detail.tier).toBe(t);
        const evs = gameEvents(`rush-${mode}`, res.score, res.detail, '2026-11-10T00:00:00Z', 'x');
        const [lo, hi] = [tierDifficulty(t, 0, 99), tierDifficulty(t, 98, 99)];
        for (const e of evs) {
          expect(e.difficulty).toBeGreaterThanOrEqual(lo);
          expect(e.difficulty).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  it('game XP goes into a result with the course, capped at 100 a day', () => {
    let p = emptyProgress();
    const now = new Date('2026-11-10T10:00:00');
    let total = 0;
    for (let i = 0; i < 8; i++) {
      const r = applyGameRun(p, { game: 'rush-chord', tier: 'ff', score: 300, detail: { right: 30, wrong: 0, level: 2 }, runId: `r${i}`, course: 'jazz' }, now);
      p = r.progress;
      total += r.xp;
    }
    expect(total).toBe(100);
    expect(p.xp).toBe(100);
    const games = p.history.filter((h) => h.lessonId === 'game-rush-chord');
    expect(games.every((h) => h.course === 'jazz' && h.total >= 2 && h.xp <= h.total * 20)).toBe(true);
    expect(p.gameTiers?.['rush-chord'].cleared).toBe('ff');
    // idempotent by run id
    expect(applyGameRun(p, { game: 'rush-chord', tier: 'ff', score: 1, runId: 'r0' }, now).progress).toBe(p);
  });

  it('path step stars: 3 only for the rule at the step tier', () => {
    expect(tierStepStars('mf', 'mf', true, 0.9)).toBe(3);
    expect(tierStepStars('mf', 'mp', true, 0.99)).toBe(2);
    expect(tierStepStars('mf', 'f', true, 0.5)).toBe(3);
  });

  it('tier rides in the seed; old seeds stay pp', () => {
    for (const t of DYN_NAMES) expect(seedTier(tierSeed(123456789, t))).toBe(t);
    expect(seedTier(0xe3000000 ^ 0x40000000)).toBe('pp');
    expect(seedTier(tierSeed(0xe3001234, 'pp'))).toBe('pp');
    expect(seedTier(2 ** 33)).toBe('pp');
  });

  it('daily bands', () => {
    expect(bandOfTier('pp')).toBe('soft');
    expect(bandOfTier('mf')).toBe('mid');
    expect(bandOfTier('ff')).toBe('loud');
    expect(bandsOpen('soft')).toEqual(['soft', 'mid']);
    expect(bandsOpen('loud')).toEqual(['soft', 'mid', 'loud']);
  });
});
