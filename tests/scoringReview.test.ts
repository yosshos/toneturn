import { describe, expect, it } from 'vitest';
import { ratingScore, referenceTime } from '../src/engine/scoring';
import { SKILLS } from '../src/engine/rating';
import { STRINGS } from '../src/i18n/strings';
import { TOPIC_GEN } from '../src/engine/topics';
import type { Question } from '../src/engine/lesson';

describe('score weighting review', () => {
  it('every rated skill is on the Skill Map and has a name in both languages', () => {
    const used = new Set(Object.values(TOPIC_GEN).map((t) => t.skill));
    for (const s of used) expect(SKILLS).toContain(s);
    for (const s of SKILLS) {
      expect(STRINGS.en.skillNames[s], s).toBeTruthy();
      expect(STRINGS.he.skillNames[s], s).toBeTruthy();
    }
  });
  it('extra listens never lower the pitch rating of a sung passage, but do lower other items', () => {
    const o = { correctOn: 1, attempts: [{ correct: true, accuracy: 1, timeMs: null, modality: 'sing' as const }], replays: 3, timed: false };
    const seq = { kind: 'sing-seq', choices: [], degrees: [1, 2, 3] } as unknown as Question;
    expect(ratingScore(seq, o)).toBe(1);
    const deg = { kind: 'degree', choices: [1, 3, 5] } as unknown as Question;
    expect(ratingScore(deg, { ...o, attempts: [{ ...o.attempts[0], modality: 'buttons' as const }] })).toBeLessThan(1);
  });
  it('reading a written theory question gets extra reference time', () => {
    const q = TOPIC_GEN['interval-spelling'].gen(1, 1, 'x');
    const plain = TOPIC_GEN['progressions'].gen(1, 1, 'x');
    expect(referenceTime(q, 'buttons')).toBeGreaterThan(referenceTime(plain, 'buttons'));
  });
});
