import { describe, expect, it } from 'vitest';
import { bassLineQuestion, BASS_LINES, compareStimulus, pcFromKey, slashLesson, slashQuestion } from '../src/engine/lesson';
import { pc, pcValue } from '../src/engine/pitch';
import { parseAnswer } from '../src/game/content';

describe('slash chords and bass lines', () => {
  it('the bass really is the answer note; the triad sits above it', () => {
    for (const role of ['root', 'third', 'fifth', 'other'] as const)
      for (const r of ['C', 'F', 'G', 'D', 'Bb']) {
        const q = slashQuestion('x', pc(r), role, 10);
        const bass = pcFromKey(q.answer)!;
        expect(((q.midis[0] % 12) + 12) % 12).toBe(pcValue(bass));
        expect(q.midis[0]).toBeLessThan(Math.min(...q.midis.slice(1)));
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(4);
      }
  });
  it('C/B♭ is spelled with a flat', () => {
    expect(slashQuestion('x', pc('C'), 'other', 10).answer).toBe('B-1');
  });
  it('voice: "C over E", "E in the bass", Hebrew note names', () => {
    const q = slashQuestion('x', pc('C'), 'third');
    expect(parseAnswer(q, ['C over E'])).toMatchObject({ kind: 'answer', value: 'E0' });
    expect(parseAnswer(q, ['E'])).toMatchObject({ kind: 'answer', value: 'E0' });
    expect(parseAnswer(q, ['מי'], 'solfege')).toMatchObject({ kind: 'answer', value: 'E0' });
    expect(compareStimulus(q, 'G0')).not.toBeNull();
  });
  it('bass lines: the lowest note of each chord is the named degree', () => {
    for (const line of BASS_LINES) {
      const q = bassLineQuestion('x', pc('C'), line);
      const chords = q.stimulus.filter((s) => s.kind === 'chord');
      expect(chords).toHaveLength(line.length);
      chords.forEach((c, i) => {
        if (c.kind !== 'chord') return;
        const low = Math.min(...c.midis);
        expect(low).toBe(c.midis[0]);
        expect([0, 2, 4, 5, 7, 9, 11][line[i] - 1]).toBe(((low % 12) + 12) % 12);
      });
    }
    expect(slashLesson(3).questions).toHaveLength(6);
  });
});
