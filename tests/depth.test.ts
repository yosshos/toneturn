import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import '../src/engine/basics';
import type { ChoiceQuestion } from '../src/engine/lesson';

// SPEC-0.48 §D: no topic with fewer than three levels; every new level answers one of its own choices.
const DEEP = ['form', 'chromatic-added', 'bh-keys', 'bh-tone', 'bh-convert-2', 'bh-pivot', 'bh-brothers', 'width-ear', 'ornaments'];

describe('topic depth (0.48)', () => {
  it('every topic has at least three levels', () => {
    for (const [k, t] of Object.entries(TOPIC_GEN)) expect(t.levels.length, k).toBeGreaterThanOrEqual(3);
  });
  it('the deepened topics build sound, deterministic items on every level', () => {
    for (const k of DEEP) {
      const T = TOPIC_GEN[k];
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed <= 40; seed++) {
          const q = T.gen(seed * 7919, level, 'x') as ChoiceQuestion;
          expect(q.level, `${k} L${level}`).toBe(level);
          expect(q.choices, `${k} L${level} s${seed}`).toContain(q.answer);
          expect(new Set(q.choices).size, `${k} L${level} unique`).toBe(q.choices.length);
          for (const c of q.choices) expect(q.names[c]?.he, `${k} ${c}`).toBeTruthy();
          expect(JSON.stringify(T.gen(seed * 7919, level, 'x'))).toBe(JSON.stringify(q));
        }
    }
  });
  it('brother dominants: the stranger is never a minor third / tritone from the reference', () => {
    const T = TOPIC_GEN['bh-brothers'];
    for (let seed = 1; seed < 200; seed++) {
      const q = T.gen(seed, T.levels.length, 'x') as ChoiceQuestion;
      const roots = q.stimulus.filter((s) => s.kind === 'chord').map((s) => (s.kind === 'chord' ? s.midis : []));
      expect(roots).toHaveLength(3);
    }
  });
});

import { dropTwo } from '../src/engine/topicsJazz';
describe('jazz round 2 (owner 2026-11-08)', () => {
  const NEW = ['bh-family', 'bh-block', 'comping', 'turnarounds', 'guide-tones'];
  it('new topics are sound and deterministic on every level', () => {
    for (const k of NEW) {
      const T = TOPIC_GEN[k];
      expect(T, k).toBeTruthy();
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed <= 60; seed++) {
          const q = T.gen(seed * 104729, level, 'x') as ChoiceQuestion;
          expect(q.choices, `${k} L${level}`).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          for (const c of q.choices) expect(q.names[c]?.he, `${k} ${c}`).toBeTruthy();
          expect(JSON.stringify(T.gen(seed * 104729, level, 'x'))).toBe(JSON.stringify(q));
        }
    }
  });
  it('drop 2: C6 with C on top is A E G C', () => {
    expect(dropTwo(72, [0, 4, 7, 9])).toEqual([57, 64, 67, 72]);
  });
  it('same notes, other names: C6 ↔ Am7, G7♭9 − G ↔ B°7 family', () => {
    for (let seed = 1; seed < 80; seed++) {
      const q = TOPIC_GEN['bh-family'].gen(seed, 1, 'x') as ChoiceQuestion;
      const ask = q.text!.en;
      const r = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'].indexOf(ask.replace(/(m7|6)$/, ''));
      const ans = Number(q.answer.slice(1));
      expect(ans, ask).toBe(ask.endsWith('6') ? (r + 9) % 12 : (r + 3) % 12);
    }
    const q3 = TOPIC_GEN['bh-family'].gen(2, 3, 'x') as ChoiceQuestion;
    expect(q3.choices.length).toBeGreaterThanOrEqual(3);
  });
});
