// SPEC-PRACTICE-SESSION §11.3: the stretch factor — every band rule, the order, the daily cap, the answer factor, the line.
import { describe, expect, it } from 'vitest';
import { addBandMs, answerFactor, answerXp, bandLine, bumpTake, dailyRepeatFactor, stretchXp, takeBand, type TakeBandInput } from '../src/engine/stretch';

// a closed item, not due, played clean at its best: plain comfort, every other signal neutral
const base: TakeBandInput = { status: 'closed', clean: true, takeBpm: 100, bestBpm: 100, prevCleanBpm: 100, targetBpm: 100, due: false, itemTier: 3, playerTier: 3, easyRun: 0, keySessions: 10, keyClosed: true };
const band = (x: Partial<TakeBandInput>) => takeBand({ ...base, ...x });

describe('takeBand: stretch (×1.5)', () => {
  it('a new clean best tempo', () => expect(band({ takeBpm: 104 })).toMatchObject({ band: 'stretch', factor: 1.5, reason: 'record' }));
  it('a faster take that is not clean is not a record', () => expect(band({ takeBpm: 104, clean: false }).reason).not.toBe('record'));
  it('at or above the previous clean tempo while not closed', () => expect(band({ status: 'almost', takeBpm: 96, bestBpm: 98, prevCleanBpm: 96 })).toMatchObject({ band: 'stretch', reason: 'push' }));
  it('the same tempo on a closed item is not a push', () => expect(band({ takeBpm: 100 }).band).toBe('comfort'));
  it('an item a tier above the player', () => expect(band({ itemTier: 4 })).toMatchObject({ band: 'stretch', reason: 'tierUp' }));
  it('a key not closed and played in fewer than 3 sessions', () => {
    expect(band({ keyClosed: false, keySessions: 2 })).toMatchObject({ band: 'stretch', reason: 'rareKey' });
    expect(band({ keyClosed: false, keySessions: 3 }).band).toBe('comfort');
    expect(band({ keyClosed: true, keySessions: 0 }).band).toBe('comfort');
  });
  it('the weaker channel', () => expect(band({ weakerChannel: true })).toMatchObject({ band: 'stretch', reason: 'weakChannel' }));
  it('the weaker area', () => expect(band({ weakerArea: true })).toMatchObject({ band: 'stretch', reason: 'weakArea' }));
  it('the first clean take of a new item', () => expect(band({ status: 'new', bestBpm: 0, prevCleanBpm: 0, takeBpm: 60 })).toMatchObject({ band: 'stretch', reason: 'firstClean' }));
  it('unknown player tier skips the tier rules', () => expect(band({ itemTier: 8, playerTier: -1 }).band).toBe('comfort'));
});

describe('takeBand: work (×1)', () => {
  const learning: Partial<TakeBandInput> = { status: 'learning', bestBpm: 90, prevCleanBpm: 90, takeBpm: 85 };
  it('learning / almost at the working tempo', () => {
    expect(band(learning)).toMatchObject({ band: 'work', factor: 1, reason: 'working' });
    expect(band({ ...learning, status: 'almost' }).reason).toBe('working');
  });
  it('the rubato and slow stages of an item not closed — even far under the best', () => {
    expect(band({ ...learning, takeBpm: 50, stage: 'rubato' })).toMatchObject({ band: 'work', reason: 'slowStage' });
    expect(band({ ...learning, takeBpm: 50, stage: 'slow' }).reason).toBe('slowStage');
  });
  it('a slow stage on a closed item is still comfort', () => expect(band({ takeBpm: 60, stage: 'slow' }).band).toBe('comfort'));
  it('a due review', () => expect(band({ due: true })).toMatchObject({ band: 'work', reason: 'due' }));
  it('a due review far under the best is still work (maintenance)', () => expect(band({ due: true, takeBpm: 60 }).band).toBe('work'));
});

describe('takeBand: comfort (×0.3)', () => {
  it('a closed item not due', () => expect(band({})).toMatchObject({ band: 'comfort', factor: 0.3, reason: 'closed' }));
  it('more than 10 % below the clean best (learning)', () => {
    expect(band({ status: 'learning', bestBpm: 100, prevCleanBpm: 100, takeBpm: 89 })).toMatchObject({ band: 'comfort', reason: 'slow', tryBpm: 100 });
    expect(band({ status: 'learning', bestBpm: 100, prevCleanBpm: 100, takeBpm: 90 }).band).toBe('work');
  });
  it('two tiers below the player (and not at the working tempo)', () => {
    // a learning item under its working tempo is "slow" first; a tier-low item with no other signal reads tierDown
    expect(band({ status: 'learning', bestBpm: 100, prevCleanBpm: 0, takeBpm: 95, itemTier: 1, playerTier: 3, easyRun: 4 }).reason).toBe('tierDown');
  });
  it('the 4th easy take in a row', () => {
    expect(band({ status: 'learning', bestBpm: 100, prevCleanBpm: 0, takeBpm: 95, easyRun: 4 })).toMatchObject({ band: 'comfort', reason: 'easyRun' });
    expect(band({ status: 'learning', bestBpm: 100, prevCleanBpm: 0, takeBpm: 95, easyRun: 3 }).band).toBe('work');
  });
  it('the comfort line suggests a faster tempo', () => {
    const b = band({});
    expect(b.tryBpm).toBe(106);
    expect(bandLine(b)).toEqual({ he: 'אזור נוחות: נסו ♩106', en: 'Comfort zone: try ♩106' });
  });
});

describe('order: the first rule wins', () => {
  it('stretch beats comfort (a record on a closed item)', () => expect(band({ takeBpm: 110 }).band).toBe('stretch'));
  it('stretch beats work (weaker channel on a due item)', () => expect(band({ due: true, weakerChannel: true }).band).toBe('stretch'));
  it('work beats comfort (due on a closed item)', () => expect(band({ due: true }).band).toBe('work'));
});

describe('the daily cap, the answer factor, the XP', () => {
  it('dailyRepeatFactor: 1–6 full, 7–15 half, then nothing', () => {
    expect([1, 6, 7, 15, 16, 40].map(dailyRepeatFactor)).toEqual([1, 1, 0.5, 0.5, 0, 0]);
  });
  it('answerFactor by the Elo expected score', () => {
    expect(answerFactor(0.95)).toBe(0.5);
    expect(answerFactor(0.97)).toBe(0.5);
    expect(answerFactor(0.94)).toBe(1);
    expect(answerFactor(0.6)).toBe(1);
    expect(answerFactor(0.59)).toBe(1.3);
    expect(answerXp(10, 0.5)).toBe(13);
    expect(answerXp(10, 0.99, 16)).toBe(0);
  });
  it('stretchXp: base × factor × cap, the boost on stretch only', () => {
    const s = band({ takeBpm: 104 });
    const c = band({});
    expect(stretchXp(4, s)).toBe(6);
    expect(stretchXp(4, c)).toBe(1);
    expect(stretchXp(4, s, 7)).toBe(3);
    expect(stretchXp(4, s, 16)).toBe(0);
    expect(stretchXp(10, s, 1, 0.1)).toBe(17);
    expect(stretchXp(10, c, 1, 0.1)).toBe(3);
    // never more than +10 %
    expect(stretchXp(10, s, 1, 0.5)).toBe(17);
  });
  it('bumpTake counts per item per day', () => {
    let [c, n] = bumpTake(undefined, '2026-11-24', 'a');
    expect(n).toBe(1);
    [c, n] = bumpTake(c, '2026-11-24', 'a');
    expect(n).toBe(2);
    [c, n] = bumpTake(c, '2026-11-24', 'b');
    expect(n).toBe(1);
    [, n] = bumpTake(c, '2026-11-25', 'a');
    expect(n).toBe(1);
  });
  it('band minutes add up', () => expect(addBandMs(addBandMs(undefined, 'stretch', 60000), 'comfort', 1000)).toEqual({ stretch: 60000, work: 0, comfort: 1000 }));
  it('lines in both languages, no exclamation marks', () => {
    for (const b of [band({ takeBpm: 104 }), band({ due: true }), band({})]) {
      const l = bandLine(b);
      expect(l.he).toBeTruthy();
      expect(l.en).toBeTruthy();
      expect(l.en + l.he).not.toMatch(/!/);
    }
    expect(bandLine(band({ takeBpm: 104 })).en).toBe('Stretch ×1.5');
  });
});
