// "Truth or Bluff" (product owner): true-or-false statements about music theory — no sound needed, so it can
// be played anywhere. Topics × three stages (basics → intermediate → advanced). Every statement is generated
// (keys, intervals, chords… in any key), and a bluff is always a near miss (one sharp too many, a minor third
// called major, the wrong relative minor…), never absurd. Each comes with the reason, shown after answering.
// The interval trios of the original "True or false?" stay as two topics (by name, and by ear). Pure, seedable.

import type { ChoiceQuestion, Question, SkillId } from './lesson';
import { tfQuestion } from './lesson';
import { tfItem, type TFItem, type TFLevel } from './truefalse';

export type FactTopic = 'notes' | 'rhythm' | 'keys' | 'intervals' | 'chords' | 'scales' | 'circle' | 'harmony' | 'jazz' | 'trio' | 'trio-ear';
export type FactLevel = 1 | 2 | 3;

type Bi = { en: string; he: string };
export interface Fact {
  topic: FactTopic;
  level: FactLevel;
  text: Bi;
  truth: boolean;
  /** Why (shown after answering): the correct fact. */
  why: Bi;
  skill: SkillId;
  /** Interval-trio statements (the original game): drawn as three notes, optionally heard. */
  trio?: TFItem;
  /** Statements about a sound (by ear): the notes to play. */
  midis?: number[];
}

export const FACT_TOPICS: { id: FactTopic; emoji: string; title: Bi; sound?: boolean }[] = [
  { id: 'notes', emoji: '🎼', title: { en: 'Notes & clefs', he: 'תווים ומפתחות' } },
  { id: 'rhythm', emoji: '🥁', title: { en: 'Rhythm & meter', he: 'מקצב ומשקל' } },
  { id: 'keys', emoji: '🔑', title: { en: 'Key signatures', he: 'סימני היתק' } },
  { id: 'intervals', emoji: '📏', title: { en: 'Intervals', he: 'מרווחים' } },
  { id: 'chords', emoji: '🎹', title: { en: 'Chords', he: 'אקורדים' } },
  { id: 'scales', emoji: '🪜', title: { en: 'Scales & modes', he: 'סולמות ומודוסים' } },
  { id: 'circle', emoji: '⭕', title: { en: 'Circle of fifths', he: 'מעגל הקווינטות' } },
  { id: 'harmony', emoji: '🔗', title: { en: 'Harmony in a key', he: 'הרמוניה בסולם' } },
  { id: 'jazz', emoji: '🎷', title: { en: 'Jazz chords', he: 'אקורדים בג׳אז' } },
  { id: 'trio', emoji: '✓✗', title: { en: 'Interval trios', he: 'שלישיות מרווחים' } },
  { id: 'trio-ear', emoji: '👂', title: { en: 'Interval trios by ear', he: 'שלישיות מרווחים בשמיעה' }, sound: true },
];
export const SILENT_TOPICS: FactTopic[] = FACT_TOPICS.filter((x) => !x.sound).map((x) => x.id);

// ---------------------------------------------------------------- spelling

const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT = [0, 2, 4, 5, 7, 9, 11];
type N = { l: number; a: number };
const mod = (x: number, m: number) => ((x % m) + m) % m;
const semis = (n: N) => mod(NAT[n.l] + n.a, 12);
/** A spelled note name, e.g. F♯, B♭, E♭♭. */
export const nn = (n: N) => LET[n.l] + (n.a > 0 ? '♯'.repeat(n.a) : n.a < 0 ? '♭'.repeat(-n.a) : '');
const N_ = (s: string): N => ({ l: LET.indexOf(s[0]), a: [...s.slice(1)].reduce((a, c) => a + (c === '♯' || c === '#' ? 1 : c === '♭' || c === 'b' ? -1 : 0), 0) });
/** The note `steps` letters and `st` semitones above n. */
function up(n: N, steps: number, st: number): N {
  const l = mod(n.l + steps, 7);
  let a = mod(semis(n) + st - NAT[l], 12);
  if (a > 6) a -= 12;
  return { l, a };
}
const MAJ_ST = [0, 2, 4, 5, 7, 9, 11];
const scaleOf = (tonic: N, st = MAJ_ST) => st.map((s, i) => up(tonic, i, s));

/** Major keys around the circle: name and number of sharps (+) or flats (−). */
const MAJOR_KEYS: [string, number][] = [
  ['C', 0], ['G', 1], ['D', 2], ['A', 3], ['E', 4], ['B', 5], ['F♯', 6], ['C♯', 7],
  ['F', -1], ['B♭', -2], ['E♭', -3], ['A♭', -4], ['D♭', -5], ['G♭', -6], ['C♭', -7],
];
const SHARP_ORDER = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯'];
const FLAT_ORDER = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭'];
const relMinor = (k: string) => nn(up(N_(k), 5, 9));
const keysUpTo = (n: number) => MAJOR_KEYS.filter(([, c]) => Math.abs(c) <= n);

// ---------------------------------------------------------------- helpers

type Rnd = () => number;
const pick = <T,>(r: Rnd, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const coin = (r: Rnd) => r() < 0.5;
// Note names stay as letters in Hebrew too (C D E…), as Israeli musicians write them.
const accWord = (c: number): Bi =>
  c === 0
    ? { en: 'no sharps or flats', he: 'בלי דיאזים ובמולים' }
    : c > 0
      ? { en: `${c} sharp${c > 1 ? 's' : ''}`, he: c === 1 ? 'דיאז אחד' : `${c} דיאזים` }
      : { en: `${-c} flat${c < -1 ? 's' : ''}`, he: c === -1 ? 'במול אחד' : `${-c} במולים` };
/** "a" or "an" before a word (an augmented, an octave, an E, an F♯…). */
const a_ = (w: string) => (/^([aeio]|[AEF](?![a-z])|[AEF][♯♭]|eighth|eleven)/.test(w) ? `an ${w}` : `a ${w}`);
const COMMON = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** The everyday name for a pitch (B, not C♭; A, not B♭♭). */
const common = (n: N) => COMMON[semis(n)];
/** Pick a true value or a near miss of it. */
function claim<T>(r: Rnd, truth: T, misses: T[]): { shown: T; truth: boolean } {
  const ok = coin(r) || !misses.length;
  return { shown: ok ? truth : pick(r, misses), truth: ok };
}
function fact(topic: FactTopic, level: FactLevel, skill: SkillId, truth: boolean, text: Bi, why: Bi): Fact {
  return { topic, level, skill, truth, text, why };
}
/** A curated statement list: [en, he, truth, why en, why he]. */
type Row = [string, string, boolean, string, string];
const fromRows = (topic: FactTopic, level: FactLevel, skill: SkillId, r: Rnd, rows: Row[]) => {
  const [en, h, t, we, wh] = pick(r, rows);
  return fact(topic, level, skill, t, { en, he: h }, { en: we, he: wh });
};

// ---------------------------------------------------------------- intervals

/** [quality-size label en, he, letter steps, semitones] */
const IV: [string, string, number, number][] = [
  ['minor 2nd', 'סקונדה קטנה', 1, 1],
  ['major 2nd', 'סקונדה גדולה', 1, 2],
  ['minor 3rd', 'טרצה קטנה', 2, 3],
  ['major 3rd', 'טרצה גדולה', 2, 4],
  ['perfect 4th', 'קוורטה זכה', 3, 5],
  ['augmented 4th', 'קוורטה מוגדלת', 3, 6],
  ['diminished 5th', 'קווינטה מוקטנת', 4, 6],
  ['perfect 5th', 'קווינטה זכה', 4, 7],
  ['minor 6th', 'סקסטה קטנה', 5, 8],
  ['major 6th', 'סקסטה גדולה', 5, 9],
  ['minor 7th', 'ספטימה קטנה', 6, 10],
  ['major 7th', 'ספטימה גדולה', 6, 11],
  ['octave', 'אוקטבה', 7, 12],
];
const ivBy = (steps: number, st: number) => IV.find((x) => x[2] === steps && x[3] === st);
const sameSize = (i: (typeof IV)[number]) => IV.filter((x) => x[2] === i[2] && x !== i);

// ---------------------------------------------------------------- chords

const TRIAD: Record<string, { st: [number, number]; en: string; he: string }> = {
  maj: { st: [4, 7], en: 'major', he: 'מז׳ור' },
  min: { st: [3, 7], en: 'minor', he: 'מינור' },
  dim: { st: [3, 6], en: 'diminished', he: 'מוקטן' },
  aug: { st: [4, 8], en: 'augmented', he: 'מוגדל' },
};
const SEVENTH: Record<string, { st: [number, number, number]; en: string; he: string; sym: string }> = {
  maj7: { st: [4, 7, 11], en: 'major seventh', he: 'מז׳ור 7', sym: 'maj7' },
  dom7: { st: [4, 7, 10], en: 'dominant seventh', he: 'דומיננט 7', sym: '7' },
  m7: { st: [3, 7, 10], en: 'minor seventh', he: 'מינור 7', sym: 'm7' },
  m7b5: { st: [3, 6, 10], en: 'half-diminished', he: 'חצי מוקטן', sym: 'm7♭5' },
  dim7: { st: [3, 6, 9], en: 'diminished seventh', he: 'מוקטן 7', sym: '°7' },
};
const spellChord = (root: N, st: number[]) => [root, ...st.map((s, i) => up(root, (i + 1) * 2, s))];
const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'B♭', 'E♭', 'A♭', 'F♯', 'D♭'];
const EASY_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A'];

// ---------------------------------------------------------------- generators

const GEN: Record<Exclude<FactTopic, 'trio' | 'trio-ear'>, (lv: FactLevel, r: Rnd) => Fact> = {
  notes(lv, r) {
    if (lv === 1) {
      const i = Math.floor(r() * 7);
      const a = LET[i];
      const b = LET[(i + 1) % 7];
      const half = a === 'E' || a === 'B';
      const sayHalf = coin(r);
      return fact('notes', 1, 'notes', sayHalf === half,
        sayHalf ? { en: `${a} and ${b} are a half step apart`, he: `בין ${a} ל־${b} יש חצי טון` } : { en: `${a} and ${b} are a whole step apart`, he: `בין ${a} ל־${b} יש טון שלם` },
        half ? { en: `${a}–${b} is a half step: there is no black key between them`, he: `${a}–${b} זה חצי טון: אין קליד שחור ביניהם` } : { en: `${a}–${b} is a whole step: a black key sits between them`, he: `${a}–${b} זה טון שלם: יש ביניהם קליד שחור` });
    }
    if (lv === 2) {
      const treble = coin(r);
      const lines = treble ? ['E', 'G', 'B', 'D', 'F'] : ['G', 'B', 'D', 'F', 'A'];
      const spaces = treble ? ['F', 'A', 'C', 'E'] : ['A', 'C', 'E', 'G'];
      const onLine = coin(r);
      const k = Math.floor(r() * (onLine ? 5 : 4));
      const real = (onLine ? lines : spaces)[k];
      const c = claim(r, real, [LET[mod(LET.indexOf(real) + 1, 7)], LET[mod(LET.indexOf(real) - 1, 7)]]);
      const clef: Bi = treble ? { en: 'treble clef', he: 'מפתח סול' } : { en: 'bass clef', he: 'מפתח פה' };
      const ord = ['1st', '2nd', '3rd', '4th', '5th'][k];
      const where: Bi = onLine ? { en: `the ${ord} line (from the bottom)`, he: `הקו ה־${k + 1} (מלמטה)` } : { en: `the ${ord} space (from the bottom)`, he: `הרווח ה־${k + 1} (מלמטה)` };
      return fact('notes', 2, 'notes', c.truth, { en: `In the ${clef.en}, ${where.en} is ${c.shown}`, he: `ב${clef.he}, ${where.he} הוא ${c.shown}` },
        { en: `${clef.en}: lines ${lines.join(' ')}, spaces ${spaces.join(' ')}`, he: `${clef.he}: קווים ${lines.join(' ')}, רווחים ${spaces.join(' ')}` });
    }
    // Enharmonics
    const pairs: [string, string][] = [['F♭', 'E'], ['E♯', 'F'], ['B♯', 'C'], ['C♭', 'B'], ['C♯', 'D♭'], ['F♯', 'G♭'], ['G♯', 'A♭'], ['A♯', 'B♭'], ['D♯', 'E♭'], ['C𝄪', 'D']];
    const [x, y] = pick(r, pairs);
    const truth = coin(r);
    const z = truth ? y : nn(up(N_(y.replace('𝄪', '')), 0, 1));
    return fact('notes', 3, 'notes', truth, { en: `${x} sounds the same as ${z}`, he: `${x} נשמע כמו ${z}` }, { en: `${x} = ${y} (enharmonic)`, he: `${x} = ${y} (אנהרמוני)` });
  },

  rhythm(lv, r) {
    const V: [string, string, number][] = [
      ['whole note', 'תו שלם', 4],
      ['half note', 'חצי', 2],
      ['quarter note', 'רבע', 1],
      ['eighth note', 'שמינית', 0.5],
      ['sixteenth note', 'שש־עשרית', 0.25],
    ];
    if (lv === 1) {
      const i = Math.floor(r() * 3);
      const j = i + 1 + Math.floor(r() * (V.length - i - 1));
      const k = V[i][2] / V[j][2];
      const c = claim(r, k, [k * 2, k / 2 > 1 ? k / 2 : k + 1]);
      return fact('rhythm', 1, 'theory', c.truth, { en: `A ${V[i][0]} lasts as long as ${c.shown} ${V[j][0]}s`, he: `${V[i][1]} נמשך כמו ${c.shown} ${V[j][1] === 'חצי' ? 'חצאים' : V[j][1] === 'רבע' ? 'רבעים' : V[j][1] === 'שמינית' ? 'שמיניות' : 'שש־עשריות'}` },
        { en: `A ${V[i][0]} = ${k} ${V[j][0]}s`, he: `${V[i][1]} = ${k} ${V[j][1] === 'חצי' ? 'חצאים' : V[j][1] === 'רבע' ? 'רבעים' : V[j][1] === 'שמינית' ? 'שמיניות' : 'שש־עשריות'}` });
    }
    if (lv === 2) {
      if (coin(r)) {
        const D: [string, string, number, string, string][] = [
          ['dotted half note', 'חצי עם נקודה', 3, 'quarter notes', 'רבעים'],
          ['dotted quarter note', 'רבע עם נקודה', 3, 'eighth notes', 'שמיניות'],
          ['dotted eighth note', 'שמינית עם נקודה', 3, 'sixteenth notes', 'שש־עשריות'],
        ];
        const [en, h, n, uen, uhe] = pick(r, D);
        const c = claim(r, n, [2, 4]);
        return fact('rhythm', 2, 'theory', c.truth, { en: `A ${en} equals ${c.shown} ${uen}`, he: `${h} שווה ל־${c.shown} ${uhe}` }, { en: `A dot adds half the value: ${en} = ${n} ${uen}`, he: `נקודה מוסיפה חצי מהערך: ${h} = ${n} ${uhe}` });
      }
      const M: [string, number, string, string][] = [
        ['3/4', 3, 'quarter notes', 'רבעים'],
        ['4/4', 8, 'eighth notes', 'שמיניות'],
        ['2/4', 4, 'eighth notes', 'שמיניות'],
        ['6/8', 3, 'quarter notes', 'רבעים'],
        ['6/8', 6, 'eighth notes', 'שמיניות'],
        ['5/4', 10, 'eighth notes', 'שמיניות'],
        ['3/8', 6, 'sixteenth notes', 'שש־עשריות'],
      ];
      const [m, n, uen, uhe] = pick(r, M);
      const c = claim(r, n, [n + 1, n - 1]);
      return fact('rhythm', 2, 'theory', c.truth, { en: `A bar of ${m} holds exactly ${c.shown} ${uen}`, he: `תיבה של ${m} מכילה בדיוק ${c.shown} ${uhe}` }, { en: `${m}: ${n} ${uen} fill one bar`, he: `${m}: ${n} ${uhe} ממלאים תיבה` });
    }
    return fromRows('rhythm', 3, 'theory', r, [
      ['6/8 is felt in two beats', '6/8 מורגש בשתי פעמות', true, '6/8 is compound duple: two dotted-quarter beats', '6/8 הוא משקל מורכב זוגי: שתי פעמות של רבע עם נקודה'],
      ['3/4 is a compound meter', '3/4 הוא משקל מורכב', false, '3/4 is simple triple; 9/8 is compound triple', '3/4 הוא משקל פשוט משולש; 9/8 הוא מורכב משולש'],
      ['An eighth-note triplet fills one quarter note', 'טריולה של שמיניות ממלאת רבע אחד', true, 'Three triplet eighths = one quarter', 'שלוש שמיניות בטריולה = רבע אחד'],
      ['A quarter-note triplet fills one quarter note', 'טריולה של רבעים ממלאת רבע אחד', false, 'Three triplet quarters fill a half note', 'שלושה רבעים בטריולה ממלאים חצי'],
      ['12/8 has four beats', 'ל־12/8 יש ארבע פעמות', true, '12/8 = four dotted-quarter beats', '12/8 = ארבע פעמות של רבע עם נקודה'],
      ['9/8 has three beats', 'ל־9/8 יש שלוש פעמות', true, '9/8 = three dotted-quarter beats', '9/8 = שלוש פעמות של רבע עם נקודה'],
      ['A tie adds the two notes together', 'קשת חיבור מחברת את שני התווים לאחד ארוך', true, 'Tied notes are held as one', 'תווים מחוברים בקשת מוחזקים כתו אחד'],
      ['7/8 is usually grouped 2+2+2+1', '7/8 מחולק בדרך כלל 2+2+2+1', false, '7/8 groups as 2+2+3, 3+2+2 or 2+3+2', '7/8 מחולק ל־2+2+3, 3+2+2 או 2+3+2'],
      ['Cut time (𝄵) is 2/2', 'אלה ברווה (𝄵) הוא 2/2', true, '𝄵 = 2/2: two half-note beats', '𝄵 = 2/2: שתי פעמות של חצי'],
      ['A double dot adds three quarters of the value', 'שתי נקודות מוסיפות שלושה רבעים מהערך', true, 'Dot = +½, double dot = +½ +¼', 'נקודה = +½, שתי נקודות = +½ +¼'],
      ['Swing eighths are played exactly even', 'שמיניות בסווינג מנוגנות שוות בדיוק', false, 'Swing lengthens the first eighth of each pair', 'סווינג מאריך את השמינית הראשונה בכל זוג'],
    ]);
  },

  keys(lv, r) {
    const pool = keysUpTo(lv === 1 ? 2 : lv === 2 ? 4 : 7);
    const [k, c] = pick(r, pool);
    const minor = lv >= 2 && coin(r);
    const name: Bi = minor ? { en: `${relMinor(k)} minor`, he: `${relMinor(k)} מינור` } : { en: `${k} major`, he: `${k} מז׳ור` };
    if (lv === 3 && c !== 0 && coin(r)) {
      // Which accidentals
      const list = (c > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, Math.abs(c));
      const wrongPool = (c > 0 ? SHARP_ORDER : FLAT_ORDER).slice(Math.abs(c));
      const truth = coin(r) || !wrongPool.length;
      const shown = truth ? list : [...list.slice(0, -1), wrongPool[0]];
      return fact('keys', 3, 'theory', truth, { en: `The key signature of ${name.en} is ${shown.join(' ')}`, he: `סימני ההיתק של ${name.he} הם ${shown.join(' ')}` },
        { en: `${name.en}: ${list.join(' ')}`, he: `${name.he}: ${list.join(' ')}` });
    }
    const near = [c + 1, c - 1].filter((x) => Math.abs(x) <= 7 && x !== 0 || (c !== 0 && x === 0));
    const cl = claim(r, c, near);
    const heHas = (x: number) => (x === 0 ? `ב־${name.he} אין דיאזים או במולים` : `ב־${name.he} יש ${accWord(x).he}`);
    return fact('keys', lv, 'theory', cl.truth, { en: `${name.en} has ${accWord(cl.shown).en}`, he: heHas(cl.shown) }, { en: `${name.en}: ${accWord(c).en}`, he: `${name.he}: ${accWord(c).he}` });
  },

  intervals(lv, r) {
    if (lv === 1) {
      const i = pick(r, IV.filter((x) => ['major 3rd', 'minor 3rd', 'perfect 4th', 'perfect 5th', 'octave', 'major 2nd'].includes(x[0])));
      const cl = claim(r, i[3], [i[3] + 1, i[3] - 1]);
      return fact('intervals', 1, 'theory', cl.truth, { en: `${a_(i[0]).replace(/^a/, 'A')} spans ${cl.shown} semitones`, he: `${i[1]} מכילה ${cl.shown} חצאי טונים` }, { en: `${i[0]} = ${i[3]} semitones`, he: `${i[1]} = ${i[3]} חצאי טונים` });
    }
    if (lv === 2) {
      const root = N_(pick(r, EASY_ROOTS));
      const i = pick(r, IV.slice(0, 12).filter((x) => x[0] !== 'augmented 4th'));
      const top = up(root, i[2], i[3]);
      const alt = pick(r, sameSize(i).filter((x) => x[0] !== 'augmented 4th' && x[0] !== 'diminished 5th') .concat(sameSize(i).length ? [] : [i]));
      const truth = coin(r) || !alt || alt === i;
      const said = truth ? i : alt;
      return fact('intervals', 2, 'theory', truth, { en: `${nn(root)} up to ${nn(top)} is ${a_(said[0])}`, he: `מ־${nn(root)} עד ${nn(top)} (למעלה) זו ${said[1]}` }, { en: `${nn(root)}–${nn(top)} = ${i[0]} (${i[3]} semitones)`, he: `${nn(root)}–${nn(top)} = ${i[1]} (${i[3]} חצאי טונים)` });
    }
    // Inversions
    const i = pick(r, IV.slice(0, 12));
    const inv = ivBy(mod(7 - i[2], 7), 12 - i[3])!;
    const wrong = sameSize(inv).filter((x) => x[3] !== inv[3]);
    const truth = coin(r) || !wrong.length;
    const said = truth ? inv : pick(r, wrong);
    return fact('intervals', 3, 'theory', truth, { en: `Inverted, ${a_(i[0])} becomes ${a_(said[0])}`, he: `${i[1]} בהיפוך הופכת ל${said[1]}` }, { en: `Sizes add to 9; major↔minor, augmented↔diminished, perfect stays perfect: ${i[0]} → ${inv[0]}`, he: `הגדלים מסתכמים ל־9; גדולה↔קטנה, מוגדלת↔מוקטנת, זכה נשארת זכה: ${i[1]} ← ${inv[1]}` });
  },

  chords(lv, r) {
    if (lv === 1) {
      return fromRows('chords', 1, 'theory', r, [
        ['A major triad is a major third with a minor third on top', 'משולש מז׳ור הוא טרצה גדולה ועליה טרצה קטנה', true, 'Major = M3 + m3 (root, 3, 5)', 'מז׳ור = טרצה גדולה + טרצה קטנה'],
        ['A minor triad is a major third with a minor third on top', 'משולש מינור הוא טרצה גדולה ועליה טרצה קטנה', false, 'Minor = m3 + M3', 'מינור = טרצה קטנה + טרצה גדולה'],
        ['A diminished triad is two minor thirds', 'משולש מוקטן הוא שתי טרצות קטנות', true, 'Diminished = m3 + m3', 'מוקטן = טרצה קטנה + טרצה קטנה'],
        ['An augmented triad is two major thirds', 'משולש מוגדל הוא שתי טרצות גדולות', true, 'Augmented = M3 + M3', 'מוגדל = טרצה גדולה + טרצה גדולה'],
        ['C E G is a C major triad', 'C E G הוא משולש C מז׳ור', true, 'C E G = C major', 'C E G = C מז׳ור'],
        ['A C E is an A major triad', 'A C E הוא משולש A מז׳ור', false, 'A C E = A minor (C is a minor third above A)', 'A C E = A מינור (C היא טרצה קטנה מעל A)'],
        ['D F A is a D minor triad', 'D F A הוא משולש D מינור', true, 'D F A = D minor', 'D F A = D מינור'],
        ['G B D is a G minor triad', 'G B D הוא משולש G מינור', false, 'G B D = G major', 'G B D = G מז׳ור'],
        ['A triad has three notes', 'למשולש יש שלושה צלילים', true, 'Root, third and fifth', 'שורש, טרצה וקווינטה'],
        ['The fifth of a C major chord is G', 'הקווינטה של אקורד C מז׳ור היא G', true, 'C E G: the fifth is G', 'C E G: הקווינטה היא G'],
      ]);
    }
    if (lv === 2) {
      const root = N_(pick(r, ROOTS));
      const q = pick(r, Object.keys(TRIAD));
      const notes = spellChord(root, TRIAD[q].st);
      const said = coin(r) ? q : pick(r, Object.keys(TRIAD).filter((x) => x !== q));
      const names = notes.map(nn).join(' ');
      return fact('chords', 2, 'theory', said === q, { en: `${names} is ${a_(nn(root))} ${TRIAD[said].en} triad`, he: `${names} הוא משולש ${nn(root)} ${TRIAD[said].he}` }, { en: `${names} = ${nn(root)} ${TRIAD[q].en}`, he: `${names} = ${nn(root)} ${TRIAD[q].he}` });
    }
    const root = N_(pick(r, ROOTS));
    const q = pick(r, Object.keys(SEVENTH));
    const notes = spellChord(root, SEVENTH[q].st);
    const said = coin(r) ? q : pick(r, Object.keys(SEVENTH).filter((x) => x !== q));
    const names = notes.map(nn).join(' ');
    return fact('chords', 3, 'theory', said === q, { en: `${names} is ${nn(root)} ${SEVENTH[said].en}`, he: `${names} הוא ${nn(root)} ${SEVENTH[said].he}` }, { en: `${names} = ${nn(root)}${SEVENTH[q].sym} (${SEVENTH[q].en})`, he: `${names} = ${nn(root)}${SEVENTH[q].sym} (${SEVENTH[q].he})` });
  },

  scales(lv, r) {
    if (lv === 1) {
      return fromRows('scales', 1, 'theory', r, [
        ['The major scale is whole, whole, half, whole, whole, whole, half', 'סולם מז׳ור הוא טון, טון, חצי, טון, טון, טון, חצי', true, 'W W H W W W H', 'ט ט ח ט ט ט ח'],
        ['The major scale is whole, half, whole, whole, half, whole, whole', 'סולם מז׳ור הוא טון, חצי, טון, טון, חצי, טון, טון', false, 'That is natural minor; major is W W H W W W H', 'זה מינור טבעי; מז׳ור הוא ט ט ח ט ט ט ח'],
        ['Natural minor has a ♭3, a ♭6 and a ♭7', 'למינור טבעי יש ♭3, ♭6 ו־♭7', true, 'Natural minor = major with ♭3 ♭6 ♭7', 'מינור טבעי = מז׳ור עם ♭3 ♭6 ♭7'],
        ['The major scale has a ♭7', 'לסולם מז׳ור יש ♭7', false, 'Major has a natural 7 (the leading tone)', 'למז׳ור יש 7 טבעית (צליל מוביל)'],
        ['A major scale has seven different notes', 'בסולם מז׳ור יש שבעה צלילים שונים', true, '1 2 3 4 5 6 7, then 8 = 1 again', '1 2 3 4 5 6 7, ואז 8 = שוב 1'],
        ['The major pentatonic has five notes', 'לפנטטוני מז׳ור יש חמישה צלילים', true, '1 2 3 5 6', '1 2 3 5 6'],
        ['The major pentatonic contains the 4th', 'הפנטטוני המז׳ורי מכיל את הדרגה הרביעית', false, 'Major pentatonic: 1 2 3 5 6 (no 4, no 7)', 'פנטטוני מז׳ור: 1 2 3 5 6 (בלי 4 ובלי 7)'],
        ['The chromatic scale has twelve notes', 'בסולם הכרומטי יש שנים־עשר צלילים', true, 'Every semitone of the octave', 'כל חצאי הטונים באוקטבה'],
      ]);
    }
    const MODES: [string, string, string[]][] = [
      ['Ionian', 'יוני', []],
      ['Dorian', 'דורי', ['♭3', '♭7']],
      ['Phrygian', 'פריגי', ['♭2', '♭3', '♭6', '♭7']],
      ['Lydian', 'לידי', ['♯4']],
      ['Mixolydian', 'מיקסולידי', ['♭7']],
      ['Aeolian', 'אאולי', ['♭3', '♭6', '♭7']],
      ['Locrian', 'לוקרי', ['♭2', '♭3', '♭5', '♭6', '♭7']],
    ];
    if (lv === 2) {
      const [m, mh, alts] = pick(r, MODES.slice(1));
      const all = ['♭2', '♭3', '♯4', '♭5', '♭6', '♭7'];
      const a = coin(r) ? pick(r, alts) : pick(r, all.filter((x) => !alts.includes(x)));
      const truth = alts.includes(a);
      return fact('scales', 2, 'modes', truth, { en: `Compared with major, ${m} has a ${a}`, he: `לעומת מז׳ור, ל${mh} יש ${a}` }, { en: `${m} = major with ${alts.join(' ')}`, he: `${mh} = מז׳ור עם ${alts.join(' ')}` });
    }
    return fromRows('scales', 3, 'modes', r, [
      ['Harmonic minor has an augmented 2nd between ♭6 and 7', 'במינור הרמוני יש סקונדה מוגדלת בין ♭6 ל־7', true, 'Harmonic minor = natural minor with a raised 7th: ♭6 → 7 is three semitones', 'מינור הרמוני = מינור טבעי עם 7 מוגבהת: ♭6 ← 7 זה שלושה חצאי טונים'],
      ['Jazz melodic minor is major with a ♭3', 'מינור מלודי (בג׳אז) הוא מז׳ור עם ♭3', true, '1 2 ♭3 4 5 6 7', '1 2 ♭3 4 5 6 7'],
      ['The whole-tone scale has seven notes', 'לסולם הטונים השלמים יש שבעה צלילים', false, 'Six: every whole step to the octave', 'שישה: כל הטונים השלמים עד האוקטבה'],
      ['The diminished (half-whole) scale has eight notes', 'לסולם המוקטן (חצי־שלם) יש שמונה צלילים', true, 'Eight notes, alternating half and whole steps', 'שמונה צלילים, חצי וטון לסירוגין'],
      ['The minor blues scale contains a ♭5', 'סולם הבלוז המינורי מכיל ♭5', true, '1 ♭3 4 ♭5 5 ♭7', '1 ♭3 4 ♭5 5 ♭7'],
      ['Lydian is the 4th mode of the major scale', 'לידי הוא המודוס הרביעי של סולם המז׳ור', true, 'Starting on the 4th degree: F G A B C D E', 'מתחיל מהדרגה הרביעית: F G A B C D E'],
      ['Mixolydian is the 6th mode of the major scale', 'מיקסולידי הוא המודוס השישי של סולם המז׳ור', false, 'Mixolydian is the 5th mode; Aeolian is the 6th', 'מיקסולידי הוא החמישי; אאולי הוא השישי'],
      ['The altered scale is the 7th mode of melodic minor', 'הסולם האלטרד הוא המודוס השביעי של המינור המלודי', true, 'e.g. B altered = C melodic minor from B', 'למשל B אלטרד = C מינור מלודי מ־B'],
      ['Lydian dominant is the 4th mode of melodic minor', 'לידי דומיננט הוא המודוס הרביעי של המינור המלודי', true, 'e.g. F lydian dominant = C melodic minor from F', 'למשל F לידי דומיננט = C מינור מלודי מ־F'],
      ['Phrygian dominant is the 5th mode of harmonic minor', 'פריגי דומיננט הוא המודוס החמישי של המינור ההרמוני', true, 'e.g. E phrygian dominant = A harmonic minor from E', 'למשל E פריגי דומיננט = A מינור הרמוני מ־E'],
      ['Locrian has a perfect 5th', 'ללוקרי יש קווינטה זכה', false, 'Locrian has a ♭5 — the only mode without a perfect fifth', 'ללוקרי יש ♭5 — המודוס היחיד בלי קווינטה זכה'],
    ]);
  },

  circle(lv, r) {
    if (lv === 1) {
      const [k] = pick(r, keysUpTo(3));
      const rm = relMinor(k);
      const wrong = [nn(up(N_(rm), 1, 2)), nn(up(N_(rm), 6, 10)), nn(up(N_(k), 2, 4))];
      const c = claim(r, rm, wrong);
      return fact('circle', 1, 'theory', c.truth, { en: `The relative minor of ${k} major is ${c.shown} minor`, he: `המינור המקביל של ${k} מז׳ור הוא ${c.shown} מינור` }, { en: `Relative minor = a minor third below: ${k} major → ${rm} minor`, he: `המינור המקביל = טרצה קטנה למטה: ${k} מז׳ור ← ${rm} מינור` });
    }
    if (lv === 2) {
      const [k, c] = pick(r, keysUpTo(5).filter(([, x]) => x < 6));
      const next = nn(up(N_(k), 4, 7));
      const prev = nn(up(N_(k), 3, 5));
      const cw = coin(r);
      const real = cw ? next : prev;
      const cl = claim(r, real, [cw ? prev : next, nn(up(N_(k), 1, 2))]);
      void c;
      return fact('circle', 2, 'theory', cl.truth,
        cw ? { en: `On the circle of fifths, one step from ${k} toward the sharps is ${cl.shown}`, he: `במעגל הקווינטות, צעד אחד מ־${k} לכיוון הדיאזים הוא ${cl.shown}` } : { en: `On the circle of fifths, one step from ${k} toward the flats is ${cl.shown}`, he: `במעגל הקווינטות, צעד אחד מ־${k} לכיוון הבמולים הוא ${cl.shown}` },
        { en: `Toward the sharps = up a fifth (${k} → ${next}); toward the flats = up a fourth (${k} → ${prev})`, he: `לכיוון הדיאזים = קווינטה למעלה (מ־${k} אל ${next}); לכיוון הבמולים = קוורטה למעלה (מ־${k} אל ${prev})` });
    }
    const [k] = pick(r, keysUpTo(6));
    const rm = relMinor(k);
    if (coin(r)) {
      const c = claim(r, k, [rm, common(up(N_(rm), 4, 7))].filter((x) => x !== k));
      return fact('circle', 3, 'theory', c.truth, { en: `${rm} minor has the same key signature as ${c.shown} major`, he: `ל־${rm} מינור אותם סימני היתק כמו ל־${c.shown} מז׳ור` },
        { en: `The relative major of ${rm} minor is ${k} major`, he: `המז׳ור המקביל של ${rm} מינור הוא ${k} מז׳ור` });
    }
    return fromRows('circle', 3, 'theory', r, [
      [`C minor is the parallel minor of C major`, `C מינור הוא המינור שעל אותה טוניקה (parallel) של C מז׳ור`, true, 'Parallel = same tonic; relative = same key signature', 'parallel = אותה טוניקה; relative (מקביל) = אותם סימני היתק'],
      [`The relative major of E minor is B major`, `המז׳ור המקביל של E מינור הוא B מז׳ור`, false, 'E minor ↔ G major (one sharp)', 'E מינור ↔ G מז׳ור (דיאז אחד)'],
      [`F♯ major and G♭ major sound the same`, `F♯ מז׳ור ו־G♭ מז׳ור נשמעים אותו דבר`, true, 'Enharmonic keys: 6 sharps = 6 flats', 'סולמות אנהרמוניים: 6 דיאזים = 6 במולים'],
      [`Going around the circle of fifths visits all twelve keys`, `סיבוב במעגל הקווינטות עובר בכל שנים־עשר הסולמות`, true, '12 fifths up return to the start', '12 קווינטות למעלה חוזרות להתחלה'],
      [`Neighbors on the circle differ by two accidentals`, `שכנים במעגל נבדלים בשני סימני היתק`, false, 'Neighbors differ by one sharp or flat', 'שכנים נבדלים בדיאז או במול אחד'],
    ]);
  },

  harmony(lv, r) {
    const QUAL: [string, string, string][] = [
      ['I', 'major', 'מז׳ור'], ['ii', 'minor', 'מינור'], ['iii', 'minor', 'מינור'], ['IV', 'major', 'מז׳ור'], ['V', 'major', 'מז׳ור'], ['vi', 'minor', 'מינור'], ['vii°', 'diminished', 'מוקטן'],
    ];
    if (lv === 1) {
      const i = Math.floor(r() * 7);
      const [rn, q, qh] = QUAL[i];
      const others = ['major', 'minor', 'diminished'].filter((x) => x !== q);
      const said = coin(r) ? q : pick(r, others);
      const saidHe = said === 'major' ? 'מז׳ור' : said === 'minor' ? 'מינור' : 'מוקטן';
      const deg = String(i + 1);
      return fact('harmony', 1, 'theory', said === q, { en: `In a major key, the chord on degree ${deg} is ${said}`, he: `בסולם מז׳ור, האקורד על דרגה ${deg} הוא ${saidHe}` }, { en: `Degree ${deg} = ${rn} (${q}): I ii iii IV V vi vii°`, he: `דרגה ${deg} = ${rn} (${qh}): I ii iii IV V vi vii°` });
    }
    if (lv === 2) {
      const [k] = pick(r, keysUpTo(4));
      const sc = scaleOf(N_(k));
      const i = pick(r, [1, 3, 4, 5]);
      const [rn, q, qh] = QUAL[i];
      const real = nn(sc[i]);
      const cl = claim(r, real, [nn(sc[(i + 1) % 7]), nn(sc[(i + 6) % 7])]);
      return fact('harmony', 2, 'theory', cl.truth, { en: `In ${k} major, the ${rn} chord is ${cl.shown} ${q}`, he: `ב־${k} מז׳ור, אקורד ${rn} הוא ${cl.shown} ${qh}` }, { en: `${k} major: ${rn} = ${real} ${q}`, he: `${k} מז׳ור: ${rn} = ${real} ${qh}` });
    }
    if (coin(r)) {
      // Secondary dominants: V/x = a dominant seventh a fifth above x
      const [k] = pick(r, keysUpTo(3));
      const sc = scaleOf(N_(k));
      const tIdx = pick(r, [1, 2, 3, 4, 5]);
      const target = QUAL[tIdx][0].replace('°', '');
      const real = nn(up(sc[tIdx], 4, 7));
      const cl = claim(r, real, [nn(up(sc[tIdx], 3, 5)), nn(up(sc[tIdx], 1, 2))]);
      return fact('harmony', 3, 'theory', cl.truth, { en: `In ${k} major, V/${target} is ${cl.shown}7`, he: `ב־${k} מז׳ור, V/${target} הוא ${cl.shown}7` }, { en: `V/${target} = the dominant of ${nn(sc[tIdx])}: ${real}7`, he: `V/${target} = הדומיננט של ${nn(sc[tIdx])}: ${real}7` });
    }
    return fromRows('harmony', 3, 'theory', r, [
      ['The leading tone is the 7th degree', 'הצליל המוביל הוא הדרגה השביעית', true, 'In major, 7 leads up a half step to 8', 'במז׳ור, 7 מוביל בחצי טון אל 8'],
      ['The subdominant is the 5th degree', 'הסובדומיננטה היא הדרגה החמישית', false, 'Subdominant = 4; dominant = 5', 'סובדומיננטה = 4; דומיננטה = 5'],
      ['In minor, V is usually a major chord (from harmonic minor)', 'במינור, V הוא בדרך כלל אקורד מז׳ור (מהמינור ההרמוני)', true, 'The raised 7th makes V major — a real dominant', '7 המוגבהת הופכת את V למז׳ור — דומיננט אמיתי'],
      ['A plagal cadence is IV → I', 'קדנצה פלגלית היא IV → I', true, 'IV → I, the "Amen" cadence', 'IV → I, קדנצת "אמן"'],
      ['A deceptive cadence is V → I', 'קדנצה מטעה היא V → I', false, 'Deceptive = V → vi; V → I is authentic', 'מטעה = V → vi; V → I היא אותנטית'],
      ['A half cadence ends on V', 'חצי קדנצה נגמרת על V', true, 'It stops on the dominant — open', 'היא עוצרת על הדומיננטה — פתוחה'],
      ['In a V7 chord, the 7th usually resolves up', 'באקורד V7, הספטימה נפתרת בדרך כלל למעלה', false, 'The 7th resolves down a step (e.g. F → E in G7 → C)', 'הספטימה נפתרת צעד למטה (למשל F → E ב־G7 → C)'],
    ]);
  },

  jazz(lv, r) {
    if (lv === 1) {
      const root = N_(pick(r, ['C', 'F', 'G', 'D', 'B♭', 'E♭']));
      const q = pick(r, ['maj7', 'dom7', 'm7', 'm7b5']);
      const notes = spellChord(root, SEVENTH[q].st);
      const idx = 1 + Math.floor(r() * 3);
      const real = notes[idx];
      const truth = coin(r);
      // A bluff: a chord tone a semitone off (the classic mix-up: B vs B♭ in C7), never another chord tone.
      const pcs = notes.map(semis);
      const off = [-1, 1].map((d) => mod(semis(real) + d, 12)).filter((x) => !pcs.includes(x));
      const shownName = truth || !off.length ? nn(real) : COMMON[pick(r, off)];
      const sym = `${nn(root)}${SEVENTH[q].sym}`;
      return fact('jazz', 1, 'theory', truth || !off.length, { en: `${sym} contains ${shownName}`, he: `${sym} מכיל ${shownName}` }, { en: `${sym} = ${notes.map(nn).join(' ')}`, he: `${sym} = ${notes.map(nn).join(' ')}` });
    }
    if (lv === 2) {
      const [k] = pick(r, keysUpTo(4));
      const sc = scaleOf(N_(k));
      const real = [`${nn(sc[1])}m7`, `${nn(sc[4])}7`, `${nn(sc[0])}maj7`];
      const truth = coin(r);
      const shown = truth ? real : [real[0], `${nn(sc[4])}m7`, real[2]];
      if (!truth && coin(r)) shown[0] = `${nn(sc[1])}7`;
      return fact('jazz', 2, 'theory', truth, { en: `The ii–V–I in ${k} major is ${shown.join(' – ')}`, he: `ה־ii–V–I ב־${k} מז׳ור הוא ${shown.join(' – ')}` }, { en: `${k}: ${real.join(' – ')}`, he: `${k}: ${real.join(' – ')}` });
    }
    // 0.70 (Truth or Bluff ff): generated jazz-harmony facts — upper structures, chord-scales, Barry Harris.
    if (r() < 0.5) return jazzHarmFact(r);
    if (coin(r)) {
      const root = N_(pick(r, ['C', 'G', 'D', 'F', 'B♭', 'E♭', 'A']));
      const real = common(up(root, 4, 6)); // a tritone away, by its everyday name (B7, not C♭7)
      const cl = claim(r, real, [common(up(root, 4, 7)), common(up(root, 3, 5))]);
      return fact('jazz', 3, 'theory', cl.truth, { en: `The tritone substitute of ${nn(root)}7 is ${cl.shown}7`, he: `תחליף הטריטון של ${nn(root)}7 הוא ${cl.shown}7` }, { en: `Tritone sub = a dominant a tritone away: ${nn(root)}7 → ${real}7 (same 3rd and 7th)`, he: `תחליף טריטון = דומיננט במרחק טריטון: ${nn(root)}7 ← ${real}7 (אותן טרצה וספטימה)` });
    }
    return fromRows('jazz', 3, 'theory', r, [
      ['In G7, the tritone is between B and F', 'ב־G7, הטריטון הוא בין B ל־F', true, 'The 3rd (B) and the 7th (F)', 'הטרצה (B) והספטימה (F)'],
      ['♭9 is a common tension on a dominant chord', '♭9 הוא טנשן נפוץ על אקורד דומיננטי', true, 'Dominants take ♭9 ♯9 ♯11 ♭13 as well as 9 and 13', 'דומיננטים לוקחים ♭9 ♯9 ♯11 ♭13 וגם 9 ו־13'],
      ['The 11 is usually avoided over a major seventh chord', 'בדרך כלל נמנעים מ־11 מעל אקורד מז׳ור 7', true, 'It clashes with the 3rd; ♯11 is used instead', 'היא מתחככת עם הטרצה; משתמשים ב־♯11 במקום'],
      ['Cm6 and Am7♭5 have the same four notes', 'ל־Cm6 ול־Am7♭5 יש אותם ארבעה צלילים', true, 'C E♭ G A = A C E♭ G', 'C E♭ G A = A C E♭ G'],
      ['C6 and Am7 have the same four notes', 'ל־C6 ול־Am7 יש אותם ארבעה צלילים', true, 'C E G A = A C E G', 'C E G A = A C E G'],
      ['A diminished seventh chord repeats every minor third', 'אקורד מוקטן 7 חוזר על עצמו כל טרצה קטנה', true, 'Four minor thirds fill the octave: four "brothers" share the notes', 'ארבע טרצות קטנות ממלאות אוקטבה: ארבעה "אחים" חולקים את הצלילים'],
      ['In the Barry Harris major 6th-diminished scale, the diminished notes are the 2, 4, ♭6 and 7', 'בסולם 6 דימיניש של בארי האריס, צלילי הדימיניש הם 2, 4, ♭6 ו־7', true, 'C6 (C E G A) alternates with B° (B D F A♭)', 'C6 (C E G A) מתחלף עם B° (B D F A♭)'],
      ['A "shell" voicing is the root, 3rd and 5th', 'וויסינג Shell הוא שורש, טרצה וקווינטה', false, 'Shell = root + 3rd + 7th (the guide tones)', 'Shell = שורש + טרצה + ספטימה (צלילי ההכוונה)'],
      ['Ø means half-diminished', 'Ø פירושו חצי מוקטן', true, 'Cø = Cm7♭5', 'Cø = Cm7♭5'],
      ['Δ means a dominant seventh', 'Δ פירושו ספטימה דומיננטית', false, 'Δ = major seventh (CΔ = Cmaj7)', 'Δ = מז׳ור 7 (CΔ = Cmaj7)'],
    ]);
  },
};

// ---------------------------------------------------------------- jazz harmony (0.70)

const US_FACTS: [number, string, string][] = [
  [2, '9, ♯11 and 13', '9, ♯11 ו־13'],
  [3, '♯9, 5 and ♭7', '♯9, 5 ו־♭7'],
  [6, '♭5, ♭7 and ♭9', '♭5, ♭7 ו־♭9'],
  [8, '♭13, the root and ♯9', '♭13, השורש ו־♯9'],
  [9, '13, ♭9 and 3', '13, ♭9 ו־3'],
];
/** A generated jazz-harmony statement (upper-structure triads, melodic-minor chord-scales, the 6th-diminished scale). */
export function jazzHarmFact(r: Rnd): Fact {
  const R = pick(r, [0, 2, 3, 5, 7, 8, 10]);
  const k = Math.floor(r() * 3);
  if (k === 0) {
    const real = pick(r, US_FACTS);
    const shown = coin(r) ? real : pick(r, US_FACTS.filter((x) => x !== real));
    const sym = `${COMMON[(R + real[0]) % 12]}/${COMMON[R]}7`;
    return fact('jazz', 3, 'theory', shown === real, { en: `${sym} puts the ${shown[1]} on top`, he: `${sym} מוסיף למעלה את ${shown[2]}` }, { en: `${sym}: the triad on ${COMMON[(R + real[0]) % 12]} = ${real[1]} of ${COMMON[R]}7`, he: `${sym}: המשולש על ${COMMON[(R + real[0]) % 12]} = ${real[2]} של ${COMMON[R]}7` });
  }
  if (k === 1) {
    // altered on R7 = melodic minor a half step up; lydian dominant on R7 = melodic minor a 5th up
    const alt = coin(r);
    const real = COMMON[(R + (alt ? 1 : 7)) % 12];
    const c = claim(r, real, alt ? [COMMON[(R + 11) % 12], COMMON[(R + 2) % 12]] : [COMMON[(R + 5) % 12], COMMON[(R + 2) % 12]]);
    const mode = alt ? { en: 'altered scale', he: 'הסולם האלטרד' } : { en: 'lydian dominant', he: 'הלידי הדומיננטי' };
    return fact('jazz', 3, 'theory', c.truth, { en: `The ${mode.en} on ${COMMON[R]}7 has the notes of ${c.shown} melodic minor`, he: `ל${mode.he} על ${COMMON[R]}7 יש את הצלילים של ${c.shown} מינור מלודי` }, { en: alt ? `Altered = the 7th mode of melodic minor: ${COMMON[R]} altered = ${real} melodic minor` : `Lydian dominant = the 4th mode: ${COMMON[R]} lydian dominant = ${real} melodic minor`, he: alt ? `אלטרד = המודוס השביעי של מינור מלודי: ${COMMON[R]} אלטרד = ${real} מינור מלודי` : `לידי דומיננטי = המודוס הרביעי: ${COMMON[R]} לידי דומיננטי = ${real} מינור מלודי` });
  }
  // the diminished chord of the major 6th-diminished scale sits on its 7th
  const real = COMMON[(R + 11) % 12];
  const c = claim(r, real, [COMMON[(R + 1) % 12], COMMON[(R + 2) % 12]]);
  return fact('jazz', 3, 'theory', c.truth, { en: `In Barry Harris's ${COMMON[R]}6-diminished scale, the diminished chord is ${c.shown}°7`, he: `בסולם 6 דימיניש של בארי האריס ב־${COMMON[R]}, האקורד המוקטן הוא ${c.shown}°7` }, { en: `${COMMON[R]}6 alternates with ${real}°7, built on the 7th`, he: `${COMMON[R]}6 מתחלף עם ${real}°7, שנבנה על הספטימה` });
}

// ---------------------------------------------------------------- items, questions, sets

/** One statement from one of the topics, at a stage. Trio topics keep the original game's levels. */
export function factItem(topics: FactTopic[], level: FactLevel, rnd: Rnd): Fact {
  const ts = topics.length ? topics : SILENT_TOPICS;
  const t = pick(rnd, ts);
  // Interval trios, by stage: one interval → a trio of clear intervals → a trio of any intervals.
  // By ear: one clear interval heard → any interval heard → a whole trio heard.
  if ((t === 'trio' || t === 'trio-ear') && (level === 1 || (t === 'trio-ear' && level === 2))) {
    const pool = level === 1 ? IV.filter((x) => ['major 3rd', 'minor 3rd', 'perfect 4th', 'perfect 5th'].includes(x[0])) : IV.slice(0, 12);
    const i = pick(rnd, pool);
    const near = IV.filter((x) => x !== i && (x[2] === i[2] || Math.abs(x[3] - i[3]) === 1) && x[0] !== 'augmented 4th' && pool.includes(x));
    const c = claim(rnd, i, near.length ? near : pool.filter((x) => x !== i));
    if (t === 'trio') {
      const root = N_(pick(rnd, EASY_ROOTS));
      const top = up(root, i[2], i[3]);
      return { topic: t, level, skill: 'intervals', truth: c.truth, text: { en: `${nn(root)} up to ${nn(top)} is ${a_(c.shown[0])}`, he: `מ־${nn(root)} עד ${nn(top)} (למעלה) זו ${c.shown[1]}` }, why: { en: `${nn(root)}–${nn(top)} = ${i[0]}`, he: `${nn(root)}–${nn(top)} = ${i[1]}` } };
    }
    const lo = 55 + Math.floor(rnd() * 8);
    return { topic: t, level, skill: 'intervals', truth: c.truth, midis: [lo, lo + i[3]], text: { en: `Listen: this interval is ${a_(c.shown[0])}`, he: `הקשיבו: המרווח הזה הוא ${c.shown[1]}` }, why: { en: `It was ${a_(i[0])}`, he: `זו הייתה ${i[1]}` } };
  }
  if (t === 'trio' || t === 'trio-ear') {
    const item = tfItem((t === 'trio-ear' ? 4 : level - 1) as TFLevel, rnd);
    return { topic: t, level, skill: 'intervals', truth: item.truth, trio: item, text: { en: '', he: '' }, why: { en: `${item.trio.intervalLeft} · ${item.trio.intervalRight}`, he: `${item.trio.intervalLeft} · ${item.trio.intervalRight}` } };
  }
  return GEN[t](level, rnd);
}

export const factDifficulty = (level: FactLevel) => [1000, 1250, 1500][level - 1];

const TF_NAMES = {
  true: { en: 'True', he: 'נכון', say: ['true', 'yes', 'right', 'correct', 'נכון', 'כן', 'אמת'] },
  false: { en: 'False', he: 'לא נכון', say: ['false', 'no', 'wrong', 'bluff', 'לא נכון', 'לא', 'בלוף', 'שקר'] },
};

/** A statement as a question for lessons, duels, tournaments and rooms (silent; trio facts are the 'tf' kind). */
export function factQuestion(id: string, f: Fact, seed = 0): Question {
  if (f.trio) return tfQuestion(id, f.trio, f.topic === 'trio-ear', 1000 + 100 * f.trio.level);
  const heard = f.midis ? [{ kind: 'notes' as const, midis: f.midis, each: 0.75 }] : [];
  const q: ChoiceQuestion = {
    id, kind: 'choice', topic: 'facts', level: f.level, seed, skill: f.skill, difficulty: factDifficulty(f.level),
    ask: { en: `True or bluff? ${f.text.en}`, he: `אמת או בלוף? ${f.text.he}` },
    text: f.text,
    names: TF_NAMES,
    answer: f.truth ? 'true' : 'false',
    choices: ['true', 'false'],
    stimulus: heard,
  };
  return q;
}

// Rooms and duels carry the chosen topics and stage in the seed's high bits (no server change):
// seed = base (32 bits) + 2^32 × (topic mask + 2^11 × stage). A seed below 2^32 is the original trio game.
const TOPIC_BITS = FACT_TOPICS.length;
export function factSeed(base: number, topics: FactTopic[], level: FactLevel): number {
  const mask = topics.reduce((m, t) => m | (1 << FACT_TOPICS.findIndex((x) => x.id === t)), 0);
  return (base >>> 0) + 2 ** 32 * (mask + 2 ** TOPIC_BITS * level);
}
export function factSeedInfo(seed: number): { base: number; topics: FactTopic[]; level: FactLevel } | null {
  if (seed < 2 ** 32) return null;
  const hi = Math.floor(seed / 2 ** 32);
  const mask = hi % 2 ** TOPIC_BITS;
  const level = Math.max(1, Math.min(3, Math.floor(hi / 2 ** TOPIC_BITS))) as FactLevel;
  return { base: seed % 2 ** 32, topics: FACT_TOPICS.filter((_, i) => mask & (1 << i)).map((x) => x.id), level };
}
