import { describe, expect, it } from 'vitest';
import { genTopic } from '../src/engine/topicKit';
import '../src/engine/topics';
import { gradeHolds, onsetBeats } from '../src/engine/rhythm';

describe('long notes (0.69)', () => {
  it('quarters in a "tap every beat" item are never judged as long notes', () => {
    const q: any = genTopic('gap-click', 5, 1, 'x');
    const beat = 60000 / q.bpm;
    const presses = onsetBeats(q.rhythm).map((b: number) => ({ down: b * beat, up: b * beat + 80 }));
    expect(gradeHolds(q.rhythm, q.bpm, presses).judged).toBe(0);
  });
});
