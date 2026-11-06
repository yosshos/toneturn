import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topicsEar';
import { renderStimulus } from '../src/engine/lesson';

describe('rhythmic displacement (spec AC)', () => {
  it('every level: unique correct answer, all answers occur, playable', () => {
    const T = TOPIC_GEN['displacement'];
    for (let level = 1; level <= 4; level++) {
      const seen = new Set<string>();
      for (let s = 1; s <= 200; s++) {
        const q = T.gen(s * 7919, level, 'q');
        expect(q.choices).toContain(q.answer);
        seen.add(q.answer);
        expect(renderStimulus(q.stimulus).events.length).toBeGreaterThan(0);
        // The grids (level 2) and versions (level 3) are all different from each other.
        if (q.choiceStim) {
          const sigs = q.choices.map((c) => JSON.stringify(renderStimulus(q.choiceStim![c]).events.map((e) => [e.start.toFixed(3), e.perc ?? ''])));
          expect(new Set(sigs).size, `L${level} seed ${s}`).toBe(q.choices.length);
        }
      }
      expect(seen.size, `level ${level}`).toBe(level === 4 || level === 2 ? 4 : 3);
    }
  });
  it('Charleston one beat later starts on beat 2', () => {
    for (let s = 1; s < 400; s++) {
      const q = TOPIC_GEN['displacement'].gen(s, 2, 'q');
      if (q.ask.en.startsWith('Charleston: start it one beat later')) {
        const right = q.names[q.answer];
        expect(right.en).toBe('··  ●·  ·●  ··');
        return;
      }
    }
    throw new Error('no Charleston item');
  });
});
