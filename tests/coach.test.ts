import { describe, expect, it } from 'vitest';
import { modeDifference, retryCoach, revealCoach, sessionInsight } from '../src/engine/coach';
import type { Question } from '../src/engine/lesson';

const degreeQ = (answer: number) => ({ kind: 'degree', answer, choices: [1, 3, 5], key: { letter: 'C', acc: 0 } }) as unknown as Question;

describe('coach (spec X.4)', () => {
  it('a retry hint talks about your answer and never names the right one', () => {
    const en = retryCoach(degreeQ(3), 5, 'en', 1, null)!;
    expect(en).toMatch(/not 5/);
    expect(en).toMatch(/lower/);
    expect(en).not.toMatch(/\b3\b/);
    const he = retryCoach(degreeQ(5), 3, 'he', 2, null)!;
    expect(he).toMatch(/גבוה/);
  });
  it('the name appears now and then, never as a placeholder', () => {
    const lines = [0, 1, 2, 3, 4, 5].map((s) => retryCoach(degreeQ(3), 5, 'en', s, 'Dana')!);
    expect(lines.some((x) => x.includes('Dana'))).toBe(true);
    expect(lines.every((x) => !x.includes('{n}'))).toBe(true);
  });
  it('modes: the differing degree is found (Dorian vs Aeolian: the 6th)', () => {
    expect(modeDifference('dorian', 'aeolian')).toEqual([{ degree: 6, aHigher: true }]);
    const q = { kind: 'mode-id', answer: 'dorian', choices: ['dorian', 'aeolian'] } as unknown as Question;
    expect(retryCoach(q, 'aeolian', 'en', 1, null)).toMatch(/6th/);
    expect(revealCoach(q, 'aeolian', 'en')).toMatch(/6th is higher/);
  });
  it('melodic sequences: says how many notes were right', () => {
    const q = { kind: 'degree-seq', answer: '1-3-5-3', choices: [] } as unknown as Question;
    expect(retryCoach(q, '1-3-4-3', 'en', 1, null)).toMatch(/first 2 notes were right/);
    expect(revealCoach(q, '1-3-4-3', 'en')).toMatch(/3 of 4/);
  });
  it('session insight: the most frequent pair, praise when flawless', () => {
    const qs = [degreeQ(3), degreeQ(3), degreeQ(5)];
    const ins = sessionInsight(qs, [{ q: 0, given: 5 }, { q: 1, given: 5 }], 1, 3, 'en', 'Dana');
    expect(ins.kind).toBe('pair');
    expect(ins.text).toMatch(/3 vs 5 \(2 times\)/);
    expect(sessionInsight(qs, [], 3, 3, 'en', 'Dana').text).toMatch(/Flawless, Dana!/);
    expect(sessionInsight(qs, [{ q: 2, given: 1 }], 2, 3, 'he', null).kind).toBe('encourage');
  });
});
