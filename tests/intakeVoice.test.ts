import { describe, expect, it } from 'vitest';
import { AREA_WORDS, MIX_WORDS, PLAY_WORDS, matchMany, matchOption, optionsSpoken, saidAny } from '../src/engine/intakeVoice';

const he = ['רק במקלחת — בשקט', 'עם הרדיו, בכיף', 'במקהלה, בלהקה או בהרכב', 'אני זמר/ת מקצועי/ת'];
const en = ['Only in the shower — quietly', 'Along with the radio, happily', 'In a choir, a band or a group', "I'm a trained singer"];

describe('the spoken intake understands answers', () => {
  it('by number', () => {
    expect(matchOption(['שתיים'], he, 'he')).toBe(1);
    expect(matchOption(['the third one'], en, 'en')).toBe(2);
    expect(matchOption(['4'], en, 'en')).toBe(3);
    expect(matchOption(['הראשונה'], he, 'he')).toBe(0);
  });
  it('by the words of the option (with Hebrew prefixes)', () => {
    expect(matchOption(['במקלחת'], he, 'he')).toBe(0);
    expect(matchOption(['אני שר במקהלה'], he, 'he')).toBe(2);
    expect(matchOption(['along with the radio'], en, 'en')).toBe(1);
    expect(matchOption(['in a choir'], en, 'en')).toBe(2);
  });
  it('nothing clear → null (asks again)', () => {
    expect(matchOption(['בננה'], he, 'he')).toBeNull();
    expect(matchOption([''], en, 'en')).toBeNull();
  });
  it('instruments and areas in the order said', () => {
    expect(matchMany(['אני מנגן בפסנתר וגיטרה'], PLAY_WORDS.he)).toEqual(['keys', 'guitar']);
    expect(matchMany(['drums and some piano'], PLAY_WORDS.en)).toEqual(['drums', 'keys']);
    expect(matchMany(['קצב, אחר כך שירה ואז תיאוריה'], AREA_WORDS.he)).toEqual(['time', 'voice', 'reading']);
    expect(saidAny(['הכל מעורבב'], MIX_WORDS.he)).toBe(true);
  });
  it('reads the options out with numbers, without emoji', () => {
    expect(optionsSpoken(['🎹 Keys', 'Drums'], 'en')).toBe('one: Keys. two: Drums.');
  });
});
