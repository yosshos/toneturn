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
});
