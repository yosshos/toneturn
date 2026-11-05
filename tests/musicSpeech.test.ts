import { describe, expect, it } from 'vitest';
import { canonMusic, intervalClassOf, seventhOf, tensionsOf } from '../src/engine/musicSpeech';
import { parseInterval, parseMode, parseQuality, parseSeventh } from '../src/engine/parser';

describe('spoken synonyms', () => {
  it('the tritone has many names', () => {
    for (const t of ['#11', '♯4', 'b5', '♭5', 'tritone', 'augmented fourth', 'diminished fifth', 'sharp eleven', 'flat five', 'טריטון', 'דיאז 11', 'במול 5', 'devil’s interval']) expect(intervalClassOf(t.replace('’', "'")), t).toBe(6);
  });
  it('other intervals and their aliases', () => {
    expect(intervalClassOf('b9')).toBe(1);
    expect(intervalClassOf('half step')).toBe(1);
    expect(intervalClassOf('whole tone')).toBe(2);
    expect(intervalClassOf('#9')).toBe(3);
    expect(intervalClassOf('minor 3rd')).toBe(3);
    expect(intervalClassOf('major third')).toBe(4);
    expect(intervalClassOf('perfect 4th')).toBe(5);
    expect(intervalClassOf('#5')).toBe(8);
    expect(intervalClassOf('b13')).toBe(8);
    expect(intervalClassOf('13')).toBe(9);
    expect(intervalClassOf('b7')).toBe(10);
    expect(intervalClassOf('maj7')).toBe(11);
    expect(intervalClassOf('octave')).toBe(12);
    expect(intervalClassOf('טרצה קטנה')).toBe(3);
    expect(intervalClassOf('קווינטה')).toBe(7);
  });
  it('interval answers accept full names, refuse other named intervals', () => {
    expect(parseInterval('perfect fifth')).toMatchObject({ kind: 'answer', value: 'P5' });
    expect(parseInterval('major 3rd')).toMatchObject({ kind: 'answer', value: 'M3' });
    expect(parseInterval('an octave')).toMatchObject({ kind: 'answer', value: 'P8' });
    expect(parseInterval('third')).toMatchObject({ kind: 'answer', value: 'M3' });
    expect(parseInterval('minor third').kind).toBe('unrecognized');
    expect(parseInterval('tritone').kind).toBe('unrecognized');
  });
  it('seventh chords by symbol and by name', () => {
    for (const [t, v] of [
      ['Δ', 'maj7'], ['maj7', 'maj7'], ['major seventh', 'maj7'], ['triangle', 'maj7'], ['CM7', 'maj7'],
      ['ø', 'm7b5'], ['m7b5', 'm7b5'], ['half diminished', 'm7b5'], ['half dim', 'm7b5'], ['minor seven flat five', 'm7b5'], ['חצי מוקטן', 'm7b5'],
      ['-7', 'm7'], ['min7', 'm7'], ['minor seventh', 'm7'], ['minus seven', 'm7'], ['מינור שביעית', 'm7'],
      ['dom7', '7'], ['dominant seventh', '7'], ['seven', '7'], ['דומיננטה', '7'],
    ] as const) expect(parseSeventh(t), t).toMatchObject({ kind: 'answer', value: v });
    expect(seventhOf('°7')).toBe('dim7');
  });
  it('chord qualities by symbol', () => {
    expect(parseQuality('°')).toMatchObject({ kind: 'answer', value: 'dim' });
    expect(parseQuality('+')).toMatchObject({ kind: 'answer', value: 'aug' });
  });
  it('tensions', () => {
    expect(tensionsOf('7 #11')).toEqual(['#11']);
    expect(tensionsOf('dominant flat nine sharp eleven')).toEqual(['b9', '#11']);
    expect(tensionsOf('13')).toEqual(['13']);
    expect(tensionsOf('alt')).toEqual(['alt']);
  });
  it('modes by any of their names', () => {
    const cs = ['lydian-dominant', 'mixolydian', 'lydian', 'altered'];
    for (const t of ['lydian dominant', 'mixolydian #11', 'mixolydian sharp eleven', 'lydian b7', 'overtone scale', 'מיקסולידי דיאז 11']) expect(parseMode(t, cs), t).toMatchObject({ kind: 'answer', value: 'lydian-dominant' });
    for (const t of ['super locrian', 'superlocrian', 'altered', 'diminished whole tone']) expect(parseMode(t, cs), t).toMatchObject({ kind: 'answer', value: 'altered' });
    expect(parseMode('lydian', cs)).toMatchObject({ kind: 'answer', value: 'lydian' });
    expect(parseMode('phrygian #3', ['phrygian-dominant', 'phrygian']).kind).not.toBe('error');
    expect(parseMode('spanish phrygian', ['phrygian-dominant', 'phrygian'])).toMatchObject({ kind: 'answer', value: 'phrygian-dominant' });
    expect(parseMode('dorian b2', ['dorian-b2', 'dorian'])).toMatchObject({ kind: 'answer', value: 'dorian-b2' });
  });
  it('canonical spelling', () => {
    expect(canonMusic('G7(#11)')).toContain(' sharp eleven ');
    expect(canonMusic('Bø7')).toContain(' half diminished ');
  });
});
