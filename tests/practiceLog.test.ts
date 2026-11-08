import { describe, expect, it } from 'vitest';
import { LOG_XP_PER_DAY, logKind, logMinutes, logXp, logXpOn, makeLogResult } from '../src/engine/practiceLog';
import { applyResult, emptyProgress, localDay, practiceDays } from '../src/storage/progress';

describe('practice log (SPEC-0.48 §P1)', () => {
  it('a log entry is an ordinary result: minutes as total, small capped XP', () => {
    const r = makeLogResult('piece', 30, 0, new Date('2026-11-08T10:00:00Z'), 'a');
    expect(r.lessonId).toBe('log:piece');
    expect(r.total).toBe(30);
    expect(r.xp).toBe(15);
    expect(logMinutes(r)).toBe(30);
    expect(logKind(r.lessonId)).toBe('piece');
    expect(logXp(60, 15)).toBe(LOG_XP_PER_DAY - 15);
    expect(logXp(60, LOG_XP_PER_DAY)).toBe(0);
  });
  it('counts toward the streak days and the day’s practice time, also when rebuilt without a duration', () => {
    const now = new Date('2026-11-08T10:00:00Z');
    const r = makeLogResult('technique', 20, 0, now, 'b');
    const { durationMs: _d, ...synced } = r;
    void _d;
    const p = applyResult(emptyProgress(), synced, now);
    const day = localDay(now);
    expect(practiceDays(p).has(day)).toBe(true);
    expect(p.statsDays?.[day]?.ms).toBe(20 * 60000);
    expect(logXpOn(p.history, day, (iso) => localDay(new Date(iso)))).toBe(10);
  });
});
