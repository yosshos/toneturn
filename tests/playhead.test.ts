import { describe, expect, it } from 'vitest';
import { glidePos, nowX } from '../src/engine/playhead';
import { answerFromMidi, type Question } from '../src/engine/lesson';

describe('staff playhead: glides through each note in its own time', () => {
  // A dotted quarter, an eighth, a triplet of eighths, a half: starts in quarter notes, the bar ends at 4.
  const ats = [0, 1.5, 2, 2 + 1 / 3, 2 + 2 / 3];
  const end = 4;
  it('stands on a note exactly when it is due, also triplets', () => {
    ats.forEach((a, i) => expect(glidePos(ats, end, a)).toBeCloseTo(i, 5));
  });
  it('moves slowly through a long note and fast through a short one', () => {
    expect(glidePos(ats, end, 0.75)).toBeCloseTo(0.5, 5); // half-way through the dotted quarter
    expect(glidePos(ats, end, 1.75)).toBeCloseTo(1.5, 5); // half-way through the eighth
    expect(glidePos(ats, end, 3.5)).toBeCloseTo(4 + (3.5 - ats[4]) / (end - ats[4]), 5); // the last note heads for the bar end
    expect(glidePos(ats, end, -0.5)).toBe(-1);
  });
  it('turns a fractional place into an x between the noteheads (uneven spacing kept)', () => {
    const xs = [0.1, 0.3, 0.38, 0.5, 0.6, 0.95];
    expect(nowX(xs, 0)).toBeCloseTo(0.1);
    expect(nowX(xs, 1)).toBeCloseTo(0.3);
    expect(nowX(xs, 1.5)).toBeCloseTo(0.34);
    expect(nowX(xs, 4.999)).toBeCloseTo(0.95, 2);
    expect(nowX(xs, -1)).toBeNull();
  });
});

describe('a MIDI key answers a spelled-note choice', () => {
  const q = { id: 'x', kind: 'choice', topic: 't', level: 1, seed: 1, skill: 'theory', ask: { en: '', he: '' }, names: { 'B♯': { en: 'B♯', he: 'B♯' }, D: { en: 'D', he: 'D' }, 'E♭': { en: 'E♭', he: 'E♭' } }, answer: 'B♯', choices: ['B♯', 'D', 'E♭'] } as unknown as Question;
  it('the key that sounds the note picks it (C plays B♯)', () => {
    expect(answerFromMidi(q, 60)).toBe('B♯');
    expect(answerFromMidi(q, 63)).toBe('E♭');
    expect(answerFromMidi(q, 61)).toBeNull();
  });
  it('choices that are not notes are left to the buttons', () => {
    const c = { ...q, names: { maj7: { en: 'maj7', he: 'maj7' }, m7: { en: 'm7', he: 'm7' } }, choices: ['maj7', 'm7'], answer: 'm7' } as unknown as Question;
    expect(answerFromMidi(c, 60)).toBeNull();
  });
});
