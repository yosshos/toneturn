import { describe, expect, it } from 'vitest';
import { keyFacts, keyQuiz, minorModesOn, spellScale, MAJOR, HARMONIC_MINOR } from '../src/engine/keyTheory';

describe('know the key (spelled right in every key)', () => {
  it('spells major and minor scales one letter per degree', () => {
    expect(spellScale('D♭', MAJOR)).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C']);
    expect(spellScale('F♯', MAJOR)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']);
    expect(spellScale('C', HARMONIC_MINOR)).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B']);
    expect(spellScale('G♯', HARMONIC_MINOR)).toEqual(['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E', 'F𝄪']);
  });
  it('the facts of a major page: signature, chords, ii–V–I, 6th-diminished, related keys', () => {
    const c = keyFacts(0, false);
    expect(c.signature).toBe(0);
    expect(c.chords).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7♭5']);
    expect(c.cadence).toBe('Dm7 – G7 – Cmaj7');
    expect(c.sixDim).toBe('C6 + B°7');
    expect(c.relative.name).toBe('Am');
    expect(keyFacts(10, false).signature).toBe(-2);
    expect(keyFacts(4, false).signature).toBe(4);
  });
  it('the facts of a minor page: harmonic and melodic, the V7 and the minor ii–V–i', () => {
    const cm = keyFacts(0, true);
    expect(cm.signature).toBe(-3);
    expect(cm.chords[4]).toBe('G7');
    expect(cm.cadence).toBe('Dm7♭5 – G7♭9 – Cm6');
    expect(cm.sixDim).toBe('Cm6 + B°7');
    expect(cm.relative.name).toBe('E♭');
    expect(cm.more.map((m) => m.notes.join(' '))).toEqual(['C D E♭ F G A♭ B', 'C D E♭ F G A B']);
  });
  it('the minor-scale modes on a root, with their parents', () => {
    const ms = minorModesOn(0);
    const alt = ms.find((m) => m.name.en === 'C altered')!;
    expect(alt.notes).toEqual(['C', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭']);
    expect(alt.parent.startsWith('D♭ melodic minor')).toBe(true);
    const ld = ms.find((m) => m.name.en === 'C lydian dominant')!;
    expect(ld.notes).toEqual(['C', 'D', 'E', 'F♯', 'G', 'A', 'B♭']);
    const pd = ms.find((m) => m.name.en === 'C phrygian dominant')!;
    expect(pd.notes).toEqual(['C', 'D♭', 'E', 'F', 'G', 'A♭', 'B♭']);
  });
  it('a three-question warm-up whose answer is always among the options', () => {
    for (let r = 0; r < 12; r++) for (const m of [false, true]) for (const q of keyQuiz(r, m, r)) expect(q.options).toContain(q.answer);
  });
});
