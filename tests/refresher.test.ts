import { describe, expect, it } from 'vitest';
import { refresherFor } from '../src/content/refresher';
import { TOPIC_GEN } from '../src/engine/topics';
import { LESSON_ORDER, makeLesson } from '../src/engine/lesson';

describe('concept refresher (owner, 2026-11-07)', () => {
  it('every practice topic and every hand-made lesson finds a mini-lesson to refresh', () => {
    const missing: string[] = [];
    for (const [topic, T] of Object.entries(TOPIC_GEN)) {
      for (let level = 1; level <= T.levels.length; level++) {
        const q = T.gen(11, level, 'r');
        if (!refresherFor(q)) missing.push(`${topic} L${level}`);
      }
    }
    for (const id of LESSON_ORDER) for (const q of makeLesson(id, 3).questions.slice(0, 3)) if (!refresherFor(q, id)) missing.push(`${id}:${q.kind}`);
    expect(Object.keys(TOPIC_GEN).length).toBeGreaterThan(80);
    expect(missing).toEqual([]);
  });
});
