import { describe, expect, it } from 'vitest';
import { isTimeOnly } from '../src/engine/timeOnly';
import { keepBeatQuestion } from '../src/engine/basics';
import { genTopic } from '../src/engine/topicKit';
import '../src/engine/topics';
import type { Question } from '../src/engine/lesson';

describe('pure-rhythm questions show no keyboard (owner 2026-11-12)', () => {
  it('keep the beat, a steady beat, swing or straight and rhythm topics are time-only', () => {
    expect(isTimeOnly(keepBeatQuestion('k', 90, 2))).toBe(true);
    expect(isTimeOnly(genTopic('basics-beat', 1, 1, 'b') as Question)).toBe(true);
    expect(isTimeOnly(genTopic('swing-ratio', 1, 3, 's') as Question)).toBe(true);
  });
  it('pitched questions keep their keyboard', () => {
    expect(isTimeOnly(genTopic('progressions', 1, 5, 'p') as Question)).toBe(false);
  });
});
