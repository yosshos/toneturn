import { describe, expect, it } from 'vitest';
import { modeChoices, modeIdQuestion, modesLesson, MODE_ID_LEVELS, mulberry32, questionTag, compareStimulus } from '../src/engine/lesson';
import { MODE_NAMES, MODE_STEPS, modeDistance, type ModeId } from '../src/engine/modes';
import { parseMode } from '../src/engine/parser';
import { questionFromTag } from '../src/engine/adaptive';
import { pc } from '../src/engine/pitch';
import { answerWord, parseAnswer } from '../src/game/content';

describe('modes', () => {
  it('every mode has 7 notes + octave (or its own symmetric size) and the families are correct', () => {
    for (const [id, steps] of Object.entries(MODE_STEPS)) {
      expect(steps[0]).toBe(0);
      expect(steps[steps.length - 1]).toBe(12);
      expect(new Set(steps).size).toBe(steps.length);
      expect(MODE_NAMES[id as ModeId]).toBeTruthy();
    }
    // Modes of melodic minor are rotations of it.
    const mm = MODE_STEPS['melodic-minor'].slice(0, 7);
    const rot = (k: number) => mm.map((_, i) => (mm[(i + k) % 7] - mm[k] + 12) % 12).sort((a, b) => a - b);
    expect(MODE_STEPS.altered.slice(0, 7)).toEqual(rot(6));
    expect(MODE_STEPS['lydian-dominant'].slice(0, 7)).toEqual(rot(3));
    const hm = MODE_STEPS['harmonic-minor'].slice(0, 7);
    const rotH = (k: number) => hm.map((_, i) => (hm[(i + k) % 7] - hm[k] + 12) % 12).sort((a, b) => a - b);
    expect(MODE_STEPS['phrygian-dominant'].slice(0, 7)).toEqual(rotH(4));
    expect(MODE_STEPS.ultralocrian.slice(0, 7)).toEqual(rotH(6));
  });
  it('distractors are the nearest neighbours', () => {
    expect(modeDistance('ionian', 'mixolydian')).toBe(2);
    const cs = modeChoices('dorian', MODE_ID_LEVELS[2].pool, 4, mulberry32(3));
    expect(cs).toContain('dorian');
    expect(cs).toHaveLength(4);
    for (const c of cs) expect(modeDistance('dorian', c)).toBeLessThanOrEqual(4);
  });
  it('lessons for every level: 6 questions, answer among the choices', () => {
    for (let lv = 1; lv <= MODE_ID_LEVELS.length; lv++) {
      const L = modesLesson(lv, 42 + lv);
      expect(L.questions).toHaveLength(6);
      for (const q of L.questions) {
        expect(q.kind).toBe('mode-id');
        expect(q.choices).toContain(q.answer);
      }
    }
  });
  it('voice: long names win, Hebrew works, simulator words parse', () => {
    const q = modeIdQuestion('x', pc('G'), 'dorian-b2', ['dorian', 'dorian-b2', 'phrygian', 'aeolian'], 'updown', 0.4, 1300);
    expect(parseMode('dorian flat two', q.choices)).toMatchObject({ kind: 'answer', value: 'dorian-b2' });
    expect(parseMode('dorian', q.choices)).toMatchObject({ kind: 'answer', value: 'dorian' });
    expect(parseMode('פריגי', q.choices)).toMatchObject({ kind: 'answer', value: 'phrygian' });
    for (const c of q.choices) expect(parseAnswer(q, [answerWord(q, c, 'en')])).toMatchObject({ kind: 'answer', value: c });
    for (const c of q.choices) expect(parseAnswer(q, [answerWord(q, c, 'he')])).toMatchObject({ kind: 'answer', value: c });
  });
  it('review rebuilds the same question from its tag; compare plays the chosen mode first', () => {
    const q = modeIdQuestion('x', pc('Eb'), 'altered', ['altered', 'locrian', 'locrian-sharp2', 'ultralocrian'], 'up', 0.3, 1500);
    const r = questionFromTag(questionTag(q), 1, 'r1')!;
    expect(r.kind).toBe('mode-id');
    expect(r.answer).toBe('altered');
    expect(r.choices).toEqual(q.choices);
    const cmp = compareStimulus(q, 'locrian')!;
    expect(cmp[0]).toMatchObject({ kind: 'notes' });
  });
});
