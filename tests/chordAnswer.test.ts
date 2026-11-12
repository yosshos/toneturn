// song-strum on bass and keys (2026-11-12): the root on a bass, the chord on a MIDI keyboard, judged among the choices.
import { describe, expect, it } from 'vitest';
import { bassRootOf, choiceByChord, choiceByRoot, hzToMidi } from '../src/engine/chordAnswer';
import { TOPIC_GEN } from '../src/engine/topics';
import { inCourse } from '../src/engine/courses';
import type { ChoiceQuestion } from '../src/engine/lesson';

// G major: I = G, IV = C, V = D, vi = Em
const opts = { I: { root: 7, quality: 'M' as const }, IV: { root: 0, quality: 'M' as const }, V: { root: 2, quality: 'M' as const }, vi: { root: 4, quality: 'm' as const } };
const choices = ['I', 'IV', 'V', 'vi'];

describe('chord answers on bass and keys', () => {
  it('a bass root picks the choice with that root, in any octave', () => {
    expect(choiceByRoot(43, choices, opts)).toBe('I'); // G2
    expect(choiceByRoot(38, choices, opts)).toBe('V'); // D2
    expect(choiceByRoot(40 + 12, choices, opts)).toBe('vi');
    expect(choiceByRoot(42, choices, opts)).toBeNull(); // F#: not a choice
  });
  it('a MIDI chord needs its root and 3rd; the lowest note breaks ties; one note answers by root', () => {
    expect(choiceByChord([55, 59, 62], choices, opts)).toBe('I'); // G B D
    expect(choiceByChord([60, 64, 67], choices, opts)).toBe('IV'); // C E G
    expect(choiceByChord([52, 55, 59], choices, opts)).toBe('vi'); // E G B (Em; G-B also fits I without D — the bass note E wins)
    expect(choiceByChord([62, 66, 69], choices, opts)).toBe('V'); // D F# A
    expect(choiceByChord([60, 62], choices, opts)).toBeNull(); // no 3rd
    expect(choiceByChord([50], choices, opts)).toBe('V');
    expect(choiceByChord([], choices, opts)).toBeNull();
  });
  it('a plucked bass note: the median pitch class of confident frames', () => {
    const f = (hz: number | null, confidence = 0.95) => ({ hz, confidence, rms: 0.05 });
    const g2 = 440 * Math.pow(2, (43 - 69) / 12);
    expect(Math.round(hzToMidi(g2))).toBe(43);
    expect(bassRootOf([f(null), ...Array(6).fill(f(g2)), f(g2 * 2)])).toBe(7);
    expect(bassRootOf([f(g2), f(g2)])).toBeNull(); // too few frames
    expect(bassRootOf(Array(8).fill(f(g2, 0.3)))).toBeNull(); // not confident
  });
  it('song-strum is offered in the guitar, bass and keys courses, and its items carry the chords to play', () => {
    const def = TOPIC_GEN['song-strum'];
    for (const c of ['guitar', 'bass', 'keys'] as const) expect(inCourse({ domain: 'instrument', forPlays: def.forPlays }, c), c).toBe(true);
    expect(inCourse({ domain: 'instrument', forPlays: def.forPlays }, 'ear')).toBe(false);
    const q = def.gen(5, 2, 'x') as ChoiceQuestion;
    expect(q.strum && Object.keys(q.strum).length).toBeGreaterThan(1);
    expect(q.ask.en).toMatch(/Play it/);
  });
});
