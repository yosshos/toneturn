import { describe, expect, it } from 'vitest';
import { seqPulse, seqTiming } from '../src/engine/singPulse';
import { midiToHz } from '../src/engine/pitch';
import type { SungFrame } from '../src/engine/sing';
import type { SingSeqQuestion } from '../src/engine/lesson';

const q = (extra: Partial<SingSeqQuestion> = {}): SingSeqQuestion =>
  ({ id: 'x', kind: 'sing-seq', key: 'C', degrees: [1, 2, 3], midis: [60, 62, 64], choices: [], answer: 'accurate', stimulus: [{ kind: 'notes', midis: [60, 62, 64], each: 0.6 }], ...extra }) as SingSeqQuestion;

/** Notes sung at the given start times (s), each 0.45 s long. */
const sing = (midis: number[], starts: number[]): SungFrame[] => {
  const out: SungFrame[] = [];
  for (let t = 0; t < starts[starts.length - 1] + 0.6; t += 0.02) {
    const k = starts.findIndex((s, i) => t >= s && t < s + 0.45 && (i === starts.length - 1 || t < starts[i + 1]));
    out.push(k < 0 ? { t, hz: null, confidence: 0, rms: 0.001 } : { t, hz: midiToHz(midis[k]), confidence: 0.95, rms: 0.08 });
  }
  return out;
};

describe('sung sequence grid', () => {
  it('takes the reference pace and a bar of count-in', () => {
    const p = seqPulse(q())!;
    expect(p.onsets).toEqual([0, 0.6, 1.2]);
    expect(p.countIn).toBe(4);
    expect(seqPulse(q({ tapBeat: { bpm: 80 } }))).toBeNull();
    const mel = seqPulse(q({ stimulus: [{ kind: 'melody', midis: [60, 62, 64], beats: [1, 0.5, 0.5], bpm: 60 }] }))!;
    expect(mel.onsets).toEqual([0, 1, 1.5]);
  });

  it('counts notes that land with the pulse, loosely', () => {
    const p = seqPulse(q())!;
    const zero = 2;
    const on = seqTiming(sing([60, 62, 64], [2.05, 2.68, 3.15]), p, zero)!;
    expect(on.inTime).toBe(3);
    const late = seqTiming(sing([60, 62, 64], [2.4, 3.05, 3.65]), p, zero)!;
    expect(late.inTime).toBeLessThan(2);
  });
});

describe('beginner melodies: right notes and time first', () => {
  it('a melody 40 cents off, in time, still passes at an easy level; harder items stay strict', async () => {
    const { gradeMelody, synthMelody } = await import('../src/engine/vocal');
    const targets = [60, 62, 64, 65, 67];
    const frames = synthMelody(targets, 0.55, { cents: 40 });
    const item = { id: 'm', kind: 'melody', level: 1, seconds: 6, reference: 'before', steps: [0, 2, 4, 5, 7], difficulty: 1050 } as import('../src/engine/vocal').VocalItem;
    const easy = gradeMelody({ ...item }, frames, targets);
    const hard = gradeMelody({ ...item, difficulty: 1500 }, frames, targets);
    expect(easy.melody!.hit).toBe(1);
    expect(easy.score).toBeGreaterThanOrEqual(0.6);
    expect(hard.score).toBeLessThan(easy.score);
    expect(easy.metrics.some((m) => m.key === 'timing')).toBe(true);
  });
});
