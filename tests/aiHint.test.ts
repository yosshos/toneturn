import { describe, expect, it } from 'vitest';
import { bflatTwoHomes } from '../src/engine/lesson';
import { createSession, grade, newTurn, noteHint, outcomeOf } from '../src/engine/session';

// SPEC-AI §9 (owner 2026-11-14): a question answered right after an AI hint counts as "almost", not clean.
describe('AI hint scoring', () => {
  it('a hinted right answer is correct-retry and scores like a second try', () => {
    const s0 = newTurn(createSession(bflatTwoHomes(1)), 'listening');
    const [clean, g0] = grade(s0, s0.turn, 0, s0.lesson.questions[0].answer, 'buttons');
    expect(g0).toMatchObject({ kind: 'correct', firstTry: true });
    const s1 = noteHint(s0);
    expect(s1.records[0].hinted).toBe(true);
    const [hinted, g1] = grade(s1, s1.turn, 0, s1.lesson.questions[0].answer, 'buttons');
    expect(g1).toMatchObject({ kind: 'correct', firstTry: false });
    expect(hinted.records[0].outcome).toBe('correct-retry');
    expect(outcomeOf(hinted.records[0], false).correctOn).toBe(2);
    expect(hinted.xp).toBeLessThanOrEqual(clean.xp);
  });

  it('a hint after the question is resolved changes nothing', () => {
    const s0 = newTurn(createSession(bflatTwoHomes(1)), 'listening');
    const [done] = grade(s0, s0.turn, 0, s0.lesson.questions[0].answer, 'buttons');
    expect(noteHint(done)).toBe(done);
  });
});
