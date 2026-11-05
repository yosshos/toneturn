import { describe, expect, it } from 'vitest';
import { TOPIC_GEN, topicLesson } from '../src/engine/topics';
import { questionTag } from '../src/engine/lesson';
import { questionFromTag } from '../src/engine/adaptive';
import { parseNamedChoice } from '../src/engine/parser';
import { renderStimulus } from '../src/engine/lesson';

describe('topic generators (spec T–V)', () => {
  for (const [topic, T] of Object.entries(TOPIC_GEN)) {
    it(`${topic}: every level is sound, deterministic, rebuildable and speakable`, () => {
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed < 40; seed++) {
          const q = T.gen(seed * 7919, level, 'x');
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          for (const c of q.choices) expect(q.names[c], `${topic} ${c}`).toBeTruthy();
          expect(q.stimulus.length > 0 || !!q.text || !!q.show).toBe(true);
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length).toBeGreaterThan(0);
          const again = T.gen(seed * 7919, level, 'x');
          expect(again.answer).toBe(q.answer);
          const r = questionFromTag(questionTag(q), 1, 'r')!;
          expect(r.answer).toBe(q.answer);
          for (const c of q.choices) {
            const p = parseNamedChoice(q.names[c].en, q.choices, q.names);
            expect(p.kind === 'answer' ? p.value : p.kind === 'ambiguous' ? p.candidates : p.kind, `${topic} L${level} "${q.names[c].en}"`).toEqual(c);
          }
        }
      expect(topicLesson(topic, 1, 3).questions).toHaveLength(6);
    });
  }
});
