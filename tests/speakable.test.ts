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

  it('reads meters, ratios and groupings; parentheses become a pause (SPEC-KEY-SESSION-2 §6)', () => {
    expect(speakable('6/8 (two beats of three)', 'he')).toBe('6 שמיניות, two beats of three');
    expect(speakable('Hard swing (3:1)', 'en')).toBe('Hard swing, 3 to 1');
    expect(speakable('2+2+3', 'en')).toBe('2, 2, 3');
    expect(speakable('7alt (♯9 ♭13)', 'en')).toBe('7alt, sharp 9 flat 13');
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

describe('translated locales with a voice', () => {
  it('chord symbols are said in fixed do with the language’s words; titles keep their pause', () => {
    expect(speakable('Toca Cmaj7 y luego G7.', 'es')).toBe('Toca Do séptima mayor y luego Sol siete.');
    expect(speakable('Joue Dm7, puis B♭.', 'fr')).toBe('Joue Ré mineur sept, puis Si bémol.');
    expect(speakable('Escalas · 2 octavas', 'es')).toBe('Escalas, 2 octavas');
    expect(speakable('ii–V–I', 'pt')).toBe('dois menor, cinco, um');
  });
});

// SPEC-KEY-SESSION-2 §6 (2026-11-25): what slipped through to the voice ("3RDS", "1-2-3-5", a lone "V", "6/4").
describe('the narrator says what slipped through (§6)', () => {
  it('ordinals, singular and plural', () => {
    expect(speakable('Diatonic 3rds, broken', 'en')).toBe('Diatonic thirds, broken');
    expect(speakable('4 octaves in 16ths', 'en')).toBe('4 octaves in sixteenths');
    expect(speakable('6ths, 8ths and 10ths', 'en')).toBe('sixths, eighths and tenths');
    expect(speakable('7th chords; the 1st, 2nd, 4th, 9th, 12th and 21st', 'en')).toBe('seventh chords; the first, second, fourth, ninth, twelfth and twenty-first');
    expect(speakable('The 6th-diminished scale', 'en')).toBe('The sixth-diminished scale');
    // chord symbols are left to the chord reader
    expect(speakable('G7 then C/E', 'en')).toBe('G seven then C over E');
  });
  it('digit patterns', () => {
    expect(speakable('1-2-3-5 cells from every degree', 'en')).toBe('one two three five cells from every degree');
    expect(speakable('3-2 clave, then 2-3 clave', 'en')).toBe('three-two clave, then two-three clave');
    expect(speakable('strings 4-3-2-1', 'en')).toBe('strings four three two one');
    expect(speakable('Hanon Nos. 2–5', 'en')).toBe('Hanon Nos. 2 to 5');
    expect(speakable('3-string and 5-string sweeps', 'en')).toBe('3-string and 5-string sweeps');
    expect(speakable('תאי 1-2-3-5', 'he')).toBe('תאי אחת שתיים שלוש חמש');
  });
  it('lone Roman numerals only where they are numerals; the pronoun stays', () => {
    expect(speakable('This one stops on V, the five chord.', 'en')).toBe('This one stops on five, the five chord.');
    expect(speakable('Resolve to I.', 'en')).toBe('Resolve to one.');
    expect(speakable('Play the I chord, then V7.', 'en')).toBe('Play the one chord, then five seven.');
    expect(speakable('I and V', 'en')).toBe('one and five');
    expect(speakable('C major · V ·', 'en')).toBe('C major, five');
    expect(speakable('vii° leads home', 'en')).toBe('seven diminished leads home');
    expect(speakable('It lands on vi instead of I.', 'en')).toBe('It lands on six minor instead of one.');
    expect(speakable('Listen: I is rest, V leans forward.', 'en')).toBe('Listen: one is rest, five leans forward.');
    expect(speakable('V6/5 and V4/2', 'en')).toBe('five six five and five four two');
    // the pronoun
    expect(speakable('I think A is right. Dorian, Bass.', 'en')).toBe('I think A is right. Dorian, Bass.');
    expect(speakable('Am I right? I hope so.', 'en')).toBe('Am I right? I hope so.');
    expect(speakable('Can I play it faster than V?', 'en')).toBe('Can I play it faster than five?');
    // a translated locale's word "vi" stays
    expect(speakable('Lo vi ayer', 'es')).toBe('Lo vi ayer');
    expect(speakable('על V', 'he')).toBe('על חמש');
  });
  it('meters, slash chords and degrees, the lone ° ', () => {
    expect(speakable('9/8 and 11/8', 'en')).toBe('nine eight and eleven eight');
    expect(speakable('6/4 time', 'en')).toBe('six four time');
    expect(speakable('I–IV–I6/4–V7–I', 'en')).toBe('one, four, one six four, five seven, one');
    expect(speakable('I/5, then V/V', 'en')).toBe('one over five, then five of five');
    expect(speakable('a 3rd / 6th / 10th apart', 'en')).toBe('a third or sixth or tenth apart');
    expect(speakable('°7 chords', 'en')).toBe('diminished 7 chords');
    expect(speakable('Cm(maj7)', 'en')).toBe('C minor major seven');
  });
});

describe('every key-ladder title reaches the voice as words (§6)', () => {
  it('tiers 0–7, major and minor, piano / guitar / bass: level titles, item titles and the coach line', async () => {
    await import('../src/engine/topics');
    const { families, specDrills } = await import('../src/engine/drills/plan');
    const { keyLadder } = await import('../src/engine/drills/keyIndex');
    const { announce } = await import('../src/engine/drills/coach');
    const lines = new Map<string, 'en' | 'he'>();
    for (const inst of ['piano', 'guitar', 'bass'] as const)
      for (const g of ['major', 'minor'] as const)
        for (let tier = 0; tier <= 7; tier++)
          for (let root = 0; root < 12; root++) {
            const f = keyLadder(families(inst), root, g, tier, {}, { instrument: inst });
            if (!f) continue;
            for (const l of f.levels) {
              lines.set(l.title.en, 'en').set(l.title.he, 'he');
              l.specs.forEach((_, i) => {
                for (const d of specDrills(l, i, 'fifths-up')) {
                  lines.set(d.title.en, 'en').set(d.title.he, 'he');
                  for (const lang of ['en', 'he'] as const) lines.set(announce({ drill: d, level: l, stage: null, bpm: 72, demo: false, kind: 'main', spec: i }, lang), lang);
                }
              });
            }
          }
    expect(lines.size).toBeGreaterThan(600);
    const bad: string[] = [];
    for (const [x, lang] of lines) {
      const y = speakable(x, lang);
      if (/\d+(st|nd|rd|th|s)\b/.test(y)) bad.push(`ordinal: ${y}`);
      if (/\d\s*[-–—]\s*\d/.test(y)) bad.push(`digit-dash: ${y}`);
      if (y.includes('/')) bad.push(`slash: ${y}`);
      if (/[()°]/.test(y)) bad.push(`symbol: ${y}`);
      if (/(^|[\s,])(VII|III|IV|VI|II|V|vii|iii|iv|vi|ii|v|i)(?=$|[\s,.;:!?])/.test(y)) bad.push(`roman: ${y}`);
      if (lang === 'en' && /(^|[\s,])I(?=$|[\s,.;:!?])/.test(y) && !/\bI (think|hope|am|can|will)\b/.test(y)) bad.push(`roman I: ${y}`);
    }
    expect(bad).toEqual([]);
  });
});
