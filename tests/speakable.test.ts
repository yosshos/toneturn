import { describe, expect, it } from 'vitest';
import { shown, speakable, unspoken } from '../src/speech/speakable';

describe('speakable', () => {
  it('reads chord symbols as words', () => {
    expect(speakable('It was B♭maj7.', 'en')).toBe('It was B flat major seven.');
    expect(speakable('זה היה F#m7b5.', 'he')).toBe('זה היה F דיאז חצי מוקטן.');
    expect(speakable('G7 then C/E', 'en')).toBe('G seven then C over E');
    expect(speakable('Am', 'he')).toBe('A מינור');
  });

  it('reads progressions as numbers', () => {
    expect(speakable('Backdoor iv7–♭VII7–I', 'en')).toBe('Backdoor four minor seven, flat seven seven, one');
    expect(speakable('ii–V–I', 'he')).toBe('שתיים מינור, חמש, אחת');
  });

  it('leaves the English pronoun and plain words alone', () => {
    expect(speakable('I think A is right. Dorian, Bass.', 'en')).toBe('I think A is right. Dorian, Bass.');
  });

  it('reads meters, ratios and groupings', () => {
    expect(speakable('6/8 (two beats of three)', 'he')).toBe('6 שמיניות (two beats of three)');
    expect(speakable('Hard swing (3:1)', 'en')).toBe('Hard swing (3 to 1)');
    expect(speakable('2+2+3', 'en')).toBe('2, 2, 3');
    expect(speakable('7alt (♯9 ♭13)', 'en')).toBe('7alt (sharp 9 flat 13)');
  });

  it('drops emoji, arrows and unspoken spans', () => {
    expect(speakable('Higher ⬆', 'en')).toBe('Higher');
    expect(speakable(`ככה זה נשמע: ${unspoken('טָה טִי-טִי')}.`, 'he')).toBe('ככה זה נשמע.');
    expect(shown(`Count it: ${unspoken('ta ti-ti')}.`)).toBe('Count it: ta ti-ti.');
  });
  it('says the abbreviations of titles in words (owner 2026-11-21)', () => {
    expect(speakable('Now: C major · 1 oct · RH, ♩66.', 'en')).toBe('Now: C major, one octave, right hand, 66 beats a minute.');
    expect(speakable('G major cadence · I–IV–V–I · root on top · HT', 'en')).toBe('G major cadence, one, four, five, one, root on top, hands together');
    expect(speakable('C major · 2 oct · LH · even mf', 'en')).toBe('C major, 2 octaves, left hand, even mezzo forte');
    expect(speakable('cresc. out, dim. back · p then f', 'en')).toBe('crescendo out, diminuendo back, piano then forte');
    expect(speakable('עכשיו: סולם דו · 2 אוק׳ · יד ימין, ♩60.', 'he')).toBe('עכשיו: סולם דו, 2 אוקטבות, יד ימין, 60 לדקה.');
  });

  it('leaves single letters that are not dynamics alone', () => {
    expect(speakable('Play f and g', 'en')).toBe('Play f and g');
    expect(speakable('Cdim. then G7', 'en')).toBe('C diminished. then G seven');
  });
});
