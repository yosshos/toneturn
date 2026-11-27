// Owner 2026-11-27: the calibration accounts' take traces reach the server (only the ones not sent yet, oldest first),
// and a coach session's closing line goes with a teacher's assignment result.
import { describe, expect, it } from 'vitest';
import { unsent } from '../src/cloud/calibUpload';
import { setLastCoachLine, takeLastCoachLine } from '../src/storage/lastCoachLine';
import type { TakeTrace } from '../src/engine/drills/tendency';

const tr = (at: string): TakeTrace => ({ v: 1, id: 'x', fam: 'scales', at, bpm: 80, ioi: 375, src: 'midi', kind: 'normal', verdict: 'clean', lead: 0, drift: null });

describe('calibration upload', () => {
  it('sends only traces after the last one sent, oldest first', () => {
    const list = [tr('2026-11-27T12:03:00Z'), tr('2026-11-27T12:01:00Z'), tr('2026-11-27T12:02:00Z')];
    expect(unsent(list, '').map((t) => t.at)).toEqual(['2026-11-27T12:01:00Z', '2026-11-27T12:02:00Z', '2026-11-27T12:03:00Z']);
    expect(unsent(list, '2026-11-27T12:02:00Z').map((t) => t.at)).toEqual(['2026-11-27T12:03:00Z']);
  });
});

describe("the coach's closing line", () => {
  it('is kept for a few minutes and read once', () => {
    setLastCoachLine({ he: 'זה הסשן', en: "That's the session" }, 1000);
    expect(takeLastCoachLine(1000 + 60_000)?.he).toBe('זה הסשן');
    expect(takeLastCoachLine(1000 + 61_000)).toBeNull();
    setLastCoachLine({ he: 'a', en: 'a' }, 0);
    expect(takeLastCoachLine(60 * 60_000)).toBeNull();
  });
});
