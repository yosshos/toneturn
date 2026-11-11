// Game level tiers (docs/research/GAMES_TIERS_PLAN.md, owner-approved 2026-11-10). Every game has six tiers named
// with the app's dynamics scale pp · p · mp · mf · f · ff — the same rating bands as the course level (DYN in
// courseSocial.ts), so "mf in Chord Rush" and "mf in the Ear course" mean the same rating band.
//   * The game opens at the player's tier: the rating of its main skill (one tier lower while that rating is
//     provisional), never below the last tier cleared + 1.
//   * The player may pick any lower tier (warm-up) and ONE tier above the open one (rated, counts toward clearing it).
//   * A tier is cleared when 2 of its last 3 runs meet the game's rule. No demotion: a cleared tier stays cleared.
//   * Rated difficulty follows the tier's band, so an ff run is ff evidence.
//   * Games give XP: per right answer (or per 10 % accuracy), × the tier's factor, at most 25 a game and 100 a day.
// Pure: tables + functions; the state lives in progress.gameTiers (src/storage/progress.ts).

import { courseRating, type DynName } from './courseSocial';
import type { CourseId } from './courses';
import { PROVISIONAL_UNTIL, type CourseSub, type Ratings } from './rating';
import type { SkillId } from './lesson';

export type { DynName };
// Own copies of courseSocial's DYN (same names and thresholds — tests/gameTiers.test.ts checks): this module is
// imported by gameRating.ts, which sits in an import cycle with courseSocial.ts, so nothing from there is read at load.
export const DYN_NAMES: DynName[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
export const DYN_FROM: number[] = [0, 800, 950, 1100, 1250, 1400];
export const TIERS: DynName[] = DYN_NAMES;
export const isTier = (x: unknown): x is DynName => typeof x === 'string' && (DYN_NAMES as string[]).includes(x);
export const tierIndex = (t: DynName): number => DYN_NAMES.indexOf(t);
export const tierAt = (i: number): DynName => DYN_NAMES[Math.max(0, Math.min(DYN_NAMES.length - 1, Math.round(i)))];

/** The rating band of each tier (pp starts at 650 and ff runs to 1600 so the end tiers have a width). */
export const TIER_BANDS: Record<DynName, [number, number]> = { pp: [650, 800], p: [800, 950], mp: [950, 1100], mf: [1100, 1250], f: [1250, 1400], ff: [1400, 1600] };

/** The tier of a rating (DYN thresholds). */
export function tierOfRating(r: number): DynName {
  let i = 0;
  DYN_FROM.forEach((from, k) => {
    if (r >= from) i = k;
  });
  return DYN_NAMES[i];
}

/** Difficulty of a rated event in tier `t`, rung `i` of `n` (linear across the band). */
export function tierDifficulty(t: DynName, i = 0, n = 1): number {
  const [lo, hi] = TIER_BANDS[t];
  const k = Math.max(0, Math.min(n - 1, i));
  return Math.round(lo + ((k + 0.5) / Math.max(1, n)) * (hi - lo));
}

/** XP factor of a tier (pp 1.0 … ff 1.5). */
export const tierFactor = (t: DynName) => 1 + 0.1 * tierIndex(t);
export const GAME_XP_MAX = 25;
export const GAME_XP_DAY = 100;

// ---------------------------------------------------------------- per-game tier tables

export type Bi = { en: string; he: string };
/** A topic level used as a rung (TOPIC_GEN id + 1-based level). */
export interface RungRef {
  topic: string;
  level: number;
}
export type ClearKind = 'rush' | 'streak' | 'timing' | 'accuracy' | 'flight' | 'chain' | 'window' | 'social';

export interface TierDef {
  /** One line on the setup screen: what this tier holds. */
  label: Bi;
  /** Rush games: the tier's rungs, easiest first (the run climbs inside them). */
  rungs?: RungRef[];
  /** Games with their own levels: the level(s) of the tier (Highway: one per song chip). */
  levels?: number[];
  /** Game parameters (BPM, pad set, notes, cents window …). */
  params?: Record<string, number | string | boolean | number[]>;
  /** Clear rule target (right answers, chain length, gates …). */
  target?: number;
  /** Content the plan calls for that is not built yet (shown nowhere; listed in the plan's Implemented section). */
  todo?: string;
}

export interface GameTierSpec {
  game: string;
  /** The rating that opens the game. */
  source: (course: CourseId) => SkillId | CourseSub;
  clear: ClearKind;
  tiers: Record<DynName, TierDef>;
  /** Advanced games open at this tier (lower ones are shown as "opens at mp"). */
  minTier?: DynName;
}

const r = (topic: string, ...levels: number[]): RungRef[] => levels.map((level) => ({ topic, level }));
const L = (en: string, he: string): Bi => ({ en, he });
const RUSH_TARGET: Record<DynName, number> = { pp: 12, p: 14, mp: 15, mf: 16, f: 18, ff: 20 };
const rushTiers = (defs: Record<DynName, Omit<TierDef, 'target'>>): Record<DynName, TierDef> =>
  Object.fromEntries(DYN_NAMES.map((t) => [t, { ...defs[t], target: RUSH_TARGET[t] }])) as Record<DynName, TierDef>;

export const GAME_TIERS: Record<string, GameTierSpec> = {
  'rush-interval': {
    game: 'rush-interval',
    source: () => 'intervals',
    clear: 'rush',
    tiers: rushTiers({
      pp: { label: L('Up: 3rds, 4th, 5th, octave', 'עולים: טרצות, קוורטה, קווינטה, אוקטבה'), rungs: r('intervals-all', 1) },
      p: { label: L('Up: all twelve', 'עולים: כל השנים־עשר'), rungs: r('intervals-all', 1, 2) },
      mp: { label: L('Up and down', 'עולים ויורדים'), rungs: [...r('intervals-all', 2), ...r('intervals-all', 4)] },
      mf: { label: L('Together (harmonic) and down', 'יחד (הרמוני) ויורדים'), rungs: r('intervals-all', 4, 3) },
      f: { label: L('Compound: 9ths and 10ths', 'מורכבים: נונות ודצימות'), rungs: [...r('intervals-all', 3), ...r('compound-intervals', 1, 2)] },
      ff: { label: L('Everything to the 12th, together', 'הכול עד הדואודצימה, יחד'), rungs: [...r('compound-intervals', 2, 3)], todo: 'two intervals in a row (3-note cell); jazz names ♭9 ♯11 ♭13; 1.2 s notes, no replay' },
    }),
  },
  'rush-chord': {
    game: 'rush-chord',
    source: () => 'chords',
    clear: 'rush',
    tiers: rushTiers({
      pp: { label: L('Major and minor', 'מז׳ור ומינור'), rungs: r('chord-read', 1) },
      p: { label: L('+ diminished and augmented', '+ מוקטן ומוגדל'), rungs: r('chord-read', 1, 2) },
      mp: { label: L('Seventh chords', 'אקורדי ספטים'), rungs: r('chord-read', 2, 3) },
      mf: { label: L('Inversions and guitar shapes', 'היפוכים וצורות גיטרה'), rungs: r('chord-read', 3, 4, 5) },
      f: { label: L('Extensions: 9, 11, 13', 'הרחבות: 9, 11, 13'), rungs: r('chord-read', 5, 6) },
      ff: { label: L('Altered, upper structures, quartal, everything', 'אלטרד, מבנים עליונים, קוורטלי, הכול'), rungs: [...r('chord-read', 7), ...r('chord-read-alt', 1, 2, 3)] },
    }),
  },
  'rush-progression': {
    game: 'rush-progression',
    source: () => 'cadences',
    clear: 'streak',
    tiers: rushTiers({
      pp: { label: L('I, IV, V', 'I, IV, V'), rungs: r('harmonic-dictation', 1) },
      p: { label: L('Pop progressions, ii and vi', 'מהלכי פופ, ii ו־vi'), rungs: [...r('progressions', 1), ...r('harmonic-dictation', 2)] },
      mp: { label: L('Inversions, V/V, minor keys', 'היפוכים, V/V, מינור'), rungs: r('harmonic-dictation', 3, 4) },
      mf: { label: L('Sevenths, ii–V–I, jazz', 'ספטים, ii–V–I, ג׳אז'), rungs: [...r('harmonic-dictation', 5), ...r('progressions', 2), ...r('turnarounds', 1)] },
      f: { label: L('Secondary dominants, borrowed, blues', 'דומיננטות משניות, שאולים, בלוז'), rungs: [...r('harmonic-dictation', 6), ...r('progressions', 3), ...r('turnarounds', 2), ...r('chromatic-harmony', 4)] },
      ff: { label: L('Tritone subs, backdoor, ii–V chains, Coltrane', 'תחליף טריטון, דלת אחורית, שרשראות ii–V, קולטריין'), rungs: [...r('turnarounds', 3), ...r('chromatic-harmony', 6), ...r('jazz-chains', 1, 2, 3)] },
    }),
  },
  'rush-note': {
    game: 'rush-note',
    source: () => 'notes',
    clear: 'rush',
    tiers: rushTiers({
      pp: { label: L('Treble clef', 'מפתח סול'), rungs: r('note-reading', 1) },
      p: { label: L('Bass clef', 'מפתח פה'), rungs: r('note-reading', 1, 2) },
      mp: { label: L('Grand staff', 'חמשה כפולה'), rungs: r('note-reading', 2, 6) },
      mf: { label: L('Ledger lines, any clef', 'קווי עזר, כל מפתח'), rungs: r('note-reading', 6, 4) },
      f: { label: L('Alto clef', 'מפתח דו (אלט)'), rungs: r('note-reading', 4, 3) },
      ff: { label: L('Tenor clef, transposing instruments', 'מפתח טנור, כלים מטרנספזים'), rungs: [...r('note-reading', 5), ...r('transposition', 2, 3)] },
    }),
  },
  'rush-keysig': {
    game: 'rush-keysig',
    source: () => 'theory',
    clear: 'rush',
    tiers: rushTiers({
      pp: { label: L('Up to 2 sharps or flats', 'עד 2 דיאזים או במולים'), rungs: r('key-signatures', 1) },
      p: { label: L('Up to 4', 'עד 4'), rungs: r('key-signatures', 1, 2) },
      mp: { label: L('Up to 6, major or minor', 'עד 6, מז׳ור או מינור'), rungs: r('key-signatures', 2, 3) },
      mf: { label: L('All keys, relative minor', 'כל הסולמות, המינור המקביל'), rungs: [...r('key-signatures', 3), ...r('circle-fifths', 1, 2)] },
      f: { label: L('Modes and chord-scales', 'מודוסים וסולמות־אקורד'), rungs: [...r('circle-fifths', 3), ...r('chord-scale', 1)] },
      ff: { label: L('Key of a chart, melodic-minor scales', 'הסולם של תרשים, סולמות מינור מלודי'), rungs: [...r('chart-analysis', 1), ...r('chord-scale', 2, 3)] },
    }),
  },
  'rush-fretboard': {
    game: 'rush-fretboard',
    source: (c) => (c === 'bass' ? 'instrument/bass-tech' : 'instrument/guitar-tech'),
    clear: 'rush',
    tiers: rushTiers({
      pp: { label: L('Natural notes, low strings', 'תווים טבעיים, מיתרים נמוכים'), rungs: r('fretboard', 1) },
      p: { label: L('Natural notes, every string', 'תווים טבעיים, כל המיתרים'), rungs: r('fretboard', 1, 2) },
      mp: { label: L('Sharps and flats, low strings', 'דיאזים ובמולים, מיתרים נמוכים'), rungs: r('fretboard', 2, 3) },
      mf: { label: L('Every note, every string', 'כל התווים, כל המיתרים'), rungs: r('fretboard', 3, 4) },
      f: { label: L('The exact pitch (octave)', 'הגובה המדויק (אוקטבה)'), rungs: r('fretboard', 4, 5) },
      ff: { label: L('The exact pitch, fast', 'הגובה המדויק, מהר'), rungs: r('fretboard', 5), todo: 'chord tones from a named chord ("the 3rd of B♭7 on string 3"), drop-2/3 tones, intervals across the G–B shift; bass: walking approach notes' },
    }),
  },
  highway: {
    game: 'highway',
    source: (c) => (c === 'drums' ? 'instrument/drum-tech' : 'rhythm-reading'),
    clear: 'timing',
    tiers: {
      pp: { label: L('Quarters and halves', 'רבעים וחצאים'), levels: [1], params: { bpm: 70, pitch: [1], kit: [1], lanes: 3 }, target: 90 },
      p: { label: L('Eighths', 'שמיניות'), levels: [2], params: { bpm: 85, pitch: [1], kit: [2], lanes: 3 }, target: 90 },
      mp: { label: L('Dotted notes, sixteenths', 'מנוקדים, שש־עשריות'), levels: [3, 4, 4], params: { bpm: 95, pitch: [2], kit: [3], lanes: 4 }, target: 90 },
      mf: { label: L('Syncopation', 'סינקופות'), levels: [5], params: { bpm: 105, pitch: [3], kit: [4], lanes: 4 }, target: 90 },
      f: { label: L('Triplets, 3/4 · 6/8, swing', 'טריולות, 3/4 · 6/8, סווינג'), levels: [6, 7, 8], params: { bpm: 120, pitch: [4], kit: [5, 6, 6], lanes: 5 }, target: 90 },
      ff: { label: L('Odd meters, polyrhythm; kit: 7/8, double kick, half-time shuffle', 'משקלים אי־זוגיים, פולי־ריתם; מערכת: 7/8, קיק כפול, שאפל חצי־זמן'), levels: [9, 10, 9], params: { bpm: 140, pitch: [4], kit: [7], lanes: 5 }, target: 92 },
    },
  },
  melody: {
    game: 'melody',
    source: () => 'sequences',
    clear: 'chain',
    tiers: {
      pp: { label: L('Four pads: 1 2 3 5', 'ארבעה פדים: 1 2 3 5'), params: { pads: 'basic', bpm: 80 }, target: 5 },
      p: { label: L('Pentatonic pads', 'פדים פנטטוניים'), params: { pads: 'penta', bpm: 85 }, target: 6 },
      mp: { label: L('All seven degrees', 'כל שבע הדרגות'), params: { pads: 'full', bpm: 90 }, target: 6 },
      mf: { label: L('Seven degrees + ♭3 and ♭7', 'שבע דרגות + ♭3 ו־♭7'), params: { pads: 'blue', bpm: 100 }, target: 7 },
      f: { label: L('All twelve notes', 'כל שנים־עשר הצלילים'), params: { pads: 'chroma', bpm: 110 }, target: 7 },
      ff: { label: L('All twelve notes, fast, long chains', 'כל שנים־עשר הצלילים, מהר, שרשראות ארוכות'), params: { pads: 'chroma', bpm: 120 }, target: 9, todo: 'no pads shown: answer on the instrument / voice only' },
    },
  },
  rhythm: {
    game: 'rhythm',
    source: () => 'rhythm',
    clear: 'chain',
    tiers: {
      pp: { label: L('Slow', 'לאט'), params: { bpm: 75, swing: false }, target: 5 },
      p: { label: L('A little faster', 'קצת יותר מהר'), params: { bpm: 85, swing: false }, target: 6 },
      mp: { label: L('Medium', 'בינוני'), params: { bpm: 95, swing: false }, target: 6 },
      mf: { label: L('Swing', 'סווינג'), params: { bpm: 100, swing: true }, target: 7 },
      f: { label: L('Fast', 'מהר'), params: { bpm: 110, swing: false }, target: 8, todo: 'triplets, 3/4 and 6/8 phrases' },
      ff: { label: L('Fast swing', 'סווינג מהיר'), params: { bpm: 125, swing: true }, target: 9, todo: '5/8, 7/8 phrases and displaced (+1 sixteenth) patterns' },
    },
  },
  melodypuzzle: {
    game: 'melodypuzzle',
    source: () => 'dictation',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('Three notes by step', 'שלושה צלילים בצעדים'), levels: [1, 2], target: 85 },
      p: { label: L('Longer, with leaps', 'ארוך יותר, עם קפיצות'), levels: [3, 3], target: 85 },
      mp: { label: L('Five and six notes', 'חמישה ושישה צלילים'), levels: [4, 5], target: 85 },
      mf: { label: L('Minor', 'מינור'), levels: [6, 6], target: 85 },
      f: { label: L('Chromatic notes', 'צלילים כרומטיים'), levels: [7, 7], target: 85 },
      ff: { label: L('Eight notes, chromatic', 'שמונה צלילים, כרומטי'), levels: [8, 8], target: 85, todo: 'chromatic jazz lines (enclosures, bebop passing tones), bass clef' },
    },
  },
  flight: {
    game: 'flight',
    source: () => 'singing',
    clear: 'flight',
    tiers: {
      pp: { label: L('Wide gates, by step', 'שערים רחבים, בצעדים'), levels: [1], target: 20 },
      p: { label: L('Steps, longer flight', 'צעדים, טיסה ארוכה'), levels: [1], target: 30 },
      mp: { label: L('Leaps', 'קפיצות'), levels: [2], target: 30 },
      mf: { label: L('Leaps, longer flight', 'קפיצות, טיסה ארוכה'), levels: [2], target: 40 },
      f: { label: L('Chromatic', 'כרומטי'), levels: [3], target: 30 },
      ff: { label: L('Chromatic, longer flight', 'כרומטי, טיסה ארוכה'), levels: [3], target: 45, todo: 'drone off (tonic once), 25 ¢ gates, jazz degrees over a sounding chord' },
    },
  },
  nametune: {
    game: 'nametune',
    source: () => 'sequences',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('The whole opening', 'הפתיחה כולה'), params: { notes: 0 }, target: 85 },
      p: { label: L('More folk songs and spirituals, six notes', 'עוד שירי עם וספיריטואלס, שישה צלילים'), params: { notes: 6 }, target: 85 },
      mp: { label: L('Classical themes, five notes', 'נושאים קלאסיים, חמישה צלילים'), params: { notes: 5 }, target: 85 },
      mf: { label: L('Ragtime, Foster, waltzes, four notes', 'רגטיים, פוסטר, ואלסים, ארבעה צלילים'), params: { notes: 4 }, target: 85 },
      f: { label: L('Everything, in minor, four notes', 'הכול, במינור, ארבעה צלילים'), params: { notes: 4, minor: true }, target: 80, todo: 'started mid-phrase' },
      ff: { label: L('Everything, three notes (next: Name That Standard)', 'הכול, שלושה צלילים (הבא: זהו את הסטנדרט)'), params: { notes: 3 }, target: 90 },
    },
  },
  truefalse: {
    game: 'truefalse',
    source: () => 'theory',
    clear: 'rush',
    tiers: {
      pp: { label: L('Basics', 'יסודות'), levels: [1], target: 10 },
      p: { label: L('Basics, more topics', 'יסודות, יותר נושאים'), levels: [1], target: 14 },
      mp: { label: L('Medium', 'בינוני'), levels: [2], target: 12 },
      mf: { label: L('Medium, faster', 'בינוני, מהר יותר'), levels: [2], target: 16 },
      f: { label: L('Modes, harmony, jazz', 'מודוסים, הרמוניה, ג׳אז'), levels: [3], target: 12 },
      ff: { label: L('Hard + jazz harmony: upper structures, chord-scales, Barry Harris', 'קשה + הרמוניית ג׳אז: מבנים עליונים, סולמות־אקורד, בארי האריס'), levels: [3], params: { jazz: true }, target: 16, todo: '5 s per statement' },
    },
  },
  peakhunter: {
    game: 'peakhunter',
    source: () => 'timbre',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('Wide bands', 'פסים רחבים'), levels: [1], target: 70 },
      p: { label: L('Wide bands, closer', 'פסים רחבים, מדויק יותר'), levels: [1], target: 85 },
      mp: { label: L('Octave bands', 'פסי אוקטבה'), levels: [2], target: 75 },
      mf: { label: L('Octave bands, closer', 'פסי אוקטבה, מדויק יותר'), levels: [2], target: 85 },
      f: { label: L('Narrow bands', 'פסים צרים'), levels: [3], target: 75 },
      ff: { label: L('Narrow bands, closer', 'פסים צרים, מדויק יותר'), levels: [3], target: 85, todo: 'third-octave neighbours, the amount (eq-ear 5–7) on a full mix' },
    },
  },
  tuneup: {
    game: 'tuneup',
    source: () => 'pitch',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('Far out: 30–50 cents', 'רחוק: 30–50 סנט'), params: { lo: 30, hi: 50 }, target: 85 },
      p: { label: L('20–30 cents', '20–30 סנט'), params: { lo: 20, hi: 30 }, target: 85 },
      mp: { label: L('15–25 cents', '15–25 סנט'), params: { lo: 15, hi: 25 }, target: 85 },
      mf: { label: L('10–15 cents', '10–15 סנט'), params: { lo: 10, hi: 15 }, target: 85 },
      f: { label: L('6–10 cents', '6–10 סנט'), params: { lo: 6, hi: 10 }, target: 88 },
      ff: { label: L('4–6 cents', '4–6 סנט'), params: { lo: 4, hi: 6 }, target: 90, todo: 'tune a string to a sounding chord (no unison reference)' },
    },
  },
  pitchmemory: {
    game: 'pitchmemory',
    source: () => 'absolute',
    clear: 'window',
    tiers: {
      pp: { label: L('Within 100 cents', 'עד 100 סנט'), params: { cents: 100 } },
      p: { label: L('Within 70 cents', 'עד 70 סנט'), params: { cents: 70 } },
      mp: { label: L('Within 50 cents', 'עד 50 סנט'), params: { cents: 50 } },
      mf: { label: L('Within 35 cents', 'עד 35 סנט'), params: { cents: 35 } },
      f: { label: L('Within 25 cents', 'עד 25 סנט'), params: { cents: 25 } },
      ff: { label: L('Within 15 cents', 'עד 15 סנט'), params: { cents: 15 }, todo: 'two notes (a named interval from memory)' },
    },
  },
  groove: {
    game: 'groove',
    source: () => 'timing',
    clear: 'timing',
    tiers: {
      pp: { label: L('1 silent bar', 'תיבה שקטה אחת'), params: { bars: 1, bpm: 90 }, target: 85 },
      p: { label: L('2 silent bars', '2 תיבות שקטות'), params: { bars: 2, bpm: 90 }, target: 85 },
      mp: { label: L('4 silent bars', '4 תיבות שקטות'), params: { bars: 4, bpm: 90 }, target: 85 },
      mf: { label: L('4 bars at 60', '4 תיבות ב־60'), params: { bars: 4, bpm: 60 }, target: 85 },
      f: { label: L('8 bars', '8 תיבות'), params: { bars: 8, bpm: 90 }, target: 85 },
      ff: { label: L('8 bars, slow', '8 תיבות, לאט'), params: { bars: 8, bpm: 60 }, target: 85, todo: 'odd meter / a tempo change to hold; pocket vs a pushing band; match a played swing feel' },
      // 0.70: the level test (GrooveTrainer 'Level test' tab) scores accuracy 0..100; cleared at 85.
    },
  },
  // Drum games P1 (DRUMS_NICHE_PLAN §3; rounds in engine/drumGames.ts): five measured takes on the kit, cleared at the
  // target share of rounds passed.
  land: {
    game: 'land',
    source: () => 'instrument/drum-tech',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('1- and 2-beat fills, ♩70, ±30 ms', 'מעברים של 1–2 פעמות, ♩70, ±30 מ״ש'), params: { bpm: 70, ms: 30 }, target: 80 },
      p: { label: L('1- and 2-beat fills, ♩80, ±27 ms', 'מעברים של 1–2 פעמות, ♩80, ±27 מ״ש'), params: { bpm: 80, ms: 27 }, target: 80 },
      mp: { label: L('+ a whole-bar fill, ♩90', '+ מעבר של תיבה, ♩90'), params: { bpm: 90, ms: 24 }, target: 80 },
      mf: { label: L('16th hi-hat groove, ♩100', 'גרוב היי־האט בשש-עשריות, ♩100'), params: { bpm: 100, ms: 22 }, target: 80 },
      f: { label: L('Long fills, ♩110, ±20 ms', 'מעברים ארוכים, ♩110, ±20 מ״ש'), params: { bpm: 110, ms: 20 }, target: 80 },
      ff: { label: L('Triplet and 16th fills, ♩120, ±18 ms', 'מעברים בטריולות ובשש-עשריות, ♩120, ±18 מ״ש'), params: { bpm: 120, ms: 18 }, target: 80 },
    },
  },
  'groove-echo': {
    game: 'groove-echo',
    source: () => 'instrument/drum-tech',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('Rock 8ths', 'רוק בשמיניות'), params: { bpm: 70 }, target: 80 },
      p: { label: L('Rock, kick variations', 'רוק, וריאציות קיק'), params: { bpm: 80 }, target: 80 },
      mp: { label: L('16th hi-hat, ghost notes', 'היי־האט בשש-עשריות, רפאים'), params: { bpm: 85 }, target: 80 },
      mf: { label: L('Shuffle', 'שאפל'), params: { bpm: 90 }, target: 80 },
      f: { label: L('Bossa nova, maqsum', 'בוסה נובה, מקסום'), params: { bpm: 95 }, target: 80 },
      ff: { label: L('Two bars with a fill', 'שתי תיבות עם מעבר'), params: { bpm: 100 }, target: 80 },
    },
  },
  'odd-echo': {
    game: 'odd-echo',
    source: () => 'instrument/drum-tech',
    clear: 'accuracy',
    tiers: {
      pp: { label: L('5/8: 3+2 or 2+3', '5/8: 3+2 או 2+3'), params: { bpm: 180, meters: [5] }, target: 80 },
      p: { label: L('7/8: 2+2+3 or 3+2+2', '7/8: 2+2+3 או 3+2+2'), params: { bpm: 190, meters: [7] }, target: 80 },
      mp: { label: L('7/8: three groupings', '7/8: שלוש חלוקות'), params: { bpm: 200, meters: [7] }, target: 80 },
      mf: { label: L('9/8: 2+2+2+3 or 3+3+3', '9/8: 2+2+2+3 או 3+3+3'), params: { bpm: 210, meters: [9] }, target: 80 },
      f: { label: L('11/8 and 9/8', '11/8 ו־9/8'), params: { bpm: 220, meters: [11, 9] }, target: 80 },
      ff: { label: L('13/8 and 15/8', '13/8 ו־15/8'), params: { bpm: 240, meters: [13, 15] }, target: 80 },
    },
  },
};

// ---------------------------------------------------------------- advanced games (P2 rest + P3, 0.70)
// They open at mp: pp and p are listed (the card says "opens at mp") but cannot be picked.
const OPENS = L('Opens at mp', 'נפתח ב־mp');
const advanced = (spec: Omit<GameTierSpec, 'minTier'>): GameTierSpec => ({ ...spec, minTier: 'mp' });

/** Voicing Spy: hear a chord, name its voicing type (a Rush streak mode). */
GAME_TIERS['rush-voicing'] = advanced({
  game: 'rush-voicing',
  source: () => 'chords',
  clear: 'streak',
  tiers: rushTiers({
    pp: { label: OPENS, rungs: r('triads', 5) },
    p: { label: OPENS, rungs: r('triads', 5) },
    mp: { label: L('Close or open; close or drop 2', 'צפוף או פתוח; צפוף או דרופ 2'), rungs: [...r('triads', 5), ...r('voicing-type', 1)] },
    mf: { label: L('Close, drop 2, drop 3, spread', 'צפוף, דרופ 2, דרופ 3, פרוש'), rungs: [...r('voicing-type', 2), ...r('voicings', 1)] },
    f: { label: L('Shells or rootless, inversions of 7ths', 'שֶׁלים או בלי שורש, היפוכי ספטים'), rungs: [...r('voicings', 2), ...r('voicing-type', 3)] },
    ff: { label: L('Closed, drop 2, rootless, quartal, upper structure', 'צפוף, דרופ 2, בלי שורש, קוורטלי, מבנה עליון'), rungs: [...r('voicing-type', 4), ...r('voicings', 4), ...r('voicing-type', 5)] },
  }),
});

/** Scale & Mode Rush: hear a scale or mode, name it (60 s). */
GAME_TIERS['rush-scale'] = advanced({
  game: 'rush-scale',
  source: () => 'modes',
  clear: 'rush',
  tiers: rushTiers({
    pp: { label: OPENS, rungs: r('scale-types', 1) },
    p: { label: OPENS, rungs: r('scale-types', 2, 3) },
    mp: { label: L('Modes of the major scale', 'המודוסים של הסולם המז׳ורי'), rungs: r('modes-ear', 1, 2, 3) },
    mf: { label: L('Melodic minor, whole tone, diminished', 'מינור מלודי, טון שלם, מוקטן'), rungs: [...r('scale-types', 4), ...r('modes-ear', 3)] },
    f: { label: L('Bebop scales, modes in a tune', 'סולמות ביבופ, מודוסים בתוך מנגינה'), rungs: [...r('scale-types', 5), ...r('modes-ear', 4)] },
    ff: { label: L('Melodic-minor modes: lydian dominant, altered, locrian ♮2', 'מודוסים של מינור מלודי: לידי דומיננטי, אלטרד, לוקרי ♮2'), rungs: [...r('modes-ear', 5), ...r('mm-modes', 1, 2)] },
  }),
});

/** Name That Standard: hear the changes comped (no melody), pick the tune among 4 (10 rounds). */
GAME_TIERS['rush-standard'] = advanced({
  game: 'rush-standard',
  source: () => 'cadences',
  clear: 'accuracy',
  tiers: {
    pp: { label: OPENS, rungs: r('name-standard', 1), target: 80 },
    p: { label: OPENS, rungs: r('name-standard', 1), target: 80 },
    mp: { label: L('Blues, rhythm changes, Autumn Leaves — from bar 1', 'בלוז, ריתם צ׳יינג׳ס, עלי שלכת — מתיבה 1'), rungs: r('name-standard', 1), target: 80 },
    mf: { label: L('+ Satin Doll, Blue Bossa, Misty — from bar 1', '+ סאטן דול, בלו בוסה, מיסטי — מתיבה 1'), rungs: r('name-standard', 1, 2), target: 80 },
    f: { label: L('Any tune, from the bridge or bar 9', 'כל שיר, מהגשר או מתיבה 9'), rungs: r('name-standard', 2, 3), target: 80 },
    ff: { label: L('Another key, mid-form, look-alike tunes', 'סולם אחר, מאמצע הצורה, שירים דומים'), rungs: r('name-standard', 3, 4), target: 80 },
  },
});

/** Reharm Spotter: original, then reharmonised — tap the bar that changed, then name the substitution. */
GAME_TIERS.reharm = advanced({
  game: 'reharm',
  source: () => 'cadences',
  clear: 'streak',
  tiers: {
    pp: { label: OPENS, levels: [1], params: { cases: 6 } },
    p: { label: OPENS, levels: [1], params: { cases: 6 } },
    mp: { label: L('Diatonic swaps', 'החלפות דיאטוניות'), levels: [1], params: { cases: 6, bars: 4 } },
    mf: { label: L('Secondary dominants, backdoor', 'דומיננטות משניות, דלת אחורית'), levels: [2], params: { cases: 6, bars: 4 } },
    f: { label: L('Tritone subs, borrowed chords', 'תחליפי טריטון, אקורדים שאולים'), levels: [3], params: { cases: 8, bars: 8 } },
    ff: { label: L('ii–V chains, planing, Coltrane subs', 'שרשראות ii–V, הקבלה, תחליפי קולטריין'), levels: [4], params: { cases: 8, bars: 8 } },
  },
});

/** Transcription Race: hear a phrase, write it on the keys (5 phrases, accuracy × time). */
GAME_TIERS.transcribe = advanced({
  game: 'transcribe',
  source: () => 'dictation',
  clear: 'accuracy',
  tiers: {
    pp: { label: OPENS, levels: [1], params: { notes: 4 }, target: 85 },
    p: { label: OPENS, levels: [1], params: { notes: 4 }, target: 85 },
    mp: { label: L('Diatonic, four or five notes', 'דיאטוני, ארבעה–חמישה צלילים'), levels: [1], params: { notes: 5, bpm: 90 }, target: 85 },
    mf: { label: L('Minor, one chromatic note', 'מינור, צליל כרומטי אחד'), levels: [2], params: { notes: 6, bpm: 100 }, target: 85 },
    f: { label: L('Bebop line with enclosures, swing', 'קו ביבופ עם עטיפות, סווינג'), levels: [3], params: { notes: 7, bpm: 120 }, target: 85 },
    ff: { label: L('A line over changes, altered tensions', 'קו מעל מהלך, טנשנים אלטרד'), levels: [4], params: { notes: 8, bpm: 140 }, target: 85 },
  },
});

/** Barry Harris in Time: 8th-note lines on the keys over a vamp, measured by MIDI (or the mic). */
GAME_TIERS.bhtime = advanced({
  game: 'bhtime',
  source: (c) => (c === 'keys' ? 'instrument/piano-tech' : 'improv'),
  clear: 'timing',
  tiers: {
    pp: { label: OPENS, levels: [1], params: { bpm: 80 }, target: 85 },
    p: { label: OPENS, levels: [1], params: { bpm: 80 }, target: 85 },
    mp: { label: L('Major 6th-diminished scale from the root', 'סולם שישית־מוקטן מהשורש'), levels: [1], params: { bpm: 90 }, target: 85 },
    mf: { label: L('Scale runs from 3, 5 and 7', 'ריצות מ־3, 5 ו־7'), levels: [2], params: { bpm: 110 }, target: 85 },
    f: { label: L('Chromatic added notes, pivots at tempo', 'צלילים כרומטיים נוספים, פיבוטים בטמפו'), levels: [3], params: { bpm: 140 }, target: 85 },
    ff: { label: L('ii–V chains, minor 6 and dominant conversions, fast', 'שרשראות ii–V, המרות מינור 6 ודומיננטה, מהר'), levels: [4], params: { bpm: 200 }, target: 85 },
  },
});

/** Odd-Meter Riff Echo: hear an original 1–2 bar riff, play it back (mic / MIDI / kit). */
GAME_TIERS.riffecho = advanced({
  game: 'riffecho',
  source: (c) => (c === 'drums' ? 'instrument/drum-tech' : c === 'guitar' ? 'instrument/guitar-tech' : c === 'bass' ? 'instrument/bass-tech' : c === 'keys' ? 'instrument/piano-tech' : 'meter'),
  clear: 'timing',
  tiers: {
    pp: { label: OPENS, levels: [1], params: { bpm: 80 }, target: 85 },
    p: { label: OPENS, levels: [1], params: { bpm: 80 }, target: 85 },
    mp: { label: L('6/8 and 3/4 riffs', 'ריפים ב־6/8 וב־3/4'), levels: [1], params: { bpm: 90, grouping: true }, target: 85 },
    mf: { label: L('5/8 and 7/8, grouping shown', '5/8 ו־7/8, החלוקה מוצגת'), levels: [2], params: { bpm: 100, grouping: true }, target: 85 },
    f: { label: L('9/8 and 11/8, grouping hidden', '9/8 ו־11/8, החלוקה מוסתרת'), levels: [3], params: { bpm: 110, grouping: false }, target: 85 },
    ff: { label: L('Mixed meter, 13/8, displaced accents', 'משקל מעורב, 13/8, הטעמות מוזזות'), levels: [4], params: { bpm: 120, grouping: false }, target: 85 },
  },
});

/** Polyrhythm Lock: two lanes (two hands), 8 bars, % of hits in the window per hand. */
GAME_TIERS.polylock = advanced({
  game: 'polylock',
  source: () => 'timing',
  clear: 'timing',
  tiers: {
    pp: { label: OPENS, levels: [1], params: { bpm: 60 }, target: 85 },
    p: { label: OPENS, levels: [1], params: { bpm: 60 }, target: 85 },
    mp: { label: L('2 against 1, 3 against 2', '2 נגד 1, 3 נגד 2'), levels: [1], params: { bpm: 70 }, target: 85 },
    mf: { label: L('4 against 3', '4 נגד 3'), levels: [2], params: { bpm: 72 }, target: 85 },
    f: { label: L('3 against 2 with a hand swap, 5 against 4', '3 נגד 2 עם החלפת ידיים, 5 נגד 4'), levels: [3], params: { bpm: 76 }, target: 85 },
    ff: { label: L('7 against 4, over a groove', '7 נגד 4, מעל גרוב'), levels: [4], params: { bpm: 120 }, target: 85 },
  },
});

// Social sets (duel, ghost, rooms, daily): the tier picks the items (engine/tournament.ts tournamentItem).
const SOCIAL_LABEL: Record<DynName, Bi> = {
  pp: L('Triads, 3rds and 5ths, degrees 1 3 5', 'משולשים, טרצות וקווינטות, דרגות 1 3 5'),
  p: L('All intervals, all degrees', 'כל המרווחים, כל הדרגות'),
  mp: L('Sevenths, down intervals, modes', 'ספטים, מרווחים יורדים, מודוסים'),
  mf: L('Harmonic intervals, chromatic degrees', 'מרווחים הרמוניים, דרגות כרומטיות'),
  f: L('Extensions, compound intervals', 'הרחבות, מרווחים מורכבים'),
  ff: L('Altered chords, jazz changes', 'אקורדים אלטרד, מהלכי ג׳אז'),
};
const socialSpec = (game: string): GameTierSpec => ({
  game,
  source: () => 'intervals',
  clear: 'social',
  tiers: Object.fromEntries(DYN_NAMES.map((t) => [t, { label: SOCIAL_LABEL[t] }])) as Record<DynName, TierDef>,
});
GAME_TIERS.ghost = socialSpec('ghost');
GAME_TIERS.duel = socialSpec('duel');
GAME_TIERS.daily = socialSpec('daily');
GAME_TIERS.online = socialSpec('online');

/** The tier spec of a game id (Highway etc. by route id; melody-puzzle and tune-up aliases too). */
export function tierSpec(game: string): GameTierSpec | null {
  const g = game === 'melody-puzzle' ? 'melodypuzzle' : game === 'tune-up' ? 'tuneup' : game === 'name-tune' ? 'nametune' : game === 'pitch-memory' ? 'pitchmemory' : game;
  return GAME_TIERS[g] ?? null;
}
export const tierDef = (game: string, t: DynName): TierDef | null => tierSpec(game)?.tiers[t] ?? null;

// ---------------------------------------------------------------- state

export interface GameTierState {
  /** Highest tier cleared (null = none yet). */
  cleared: DynName | null;
  /** Last runs per tier: 1 = met the rule, 0 = not (newest last, at most 3). */
  recent: Partial<Record<DynName, (0 | 1)[]>>;
  /** Best score per tier. */
  best: Partial<Record<DynName, number>>;
  runs: number;
  at?: string;
}
export type GameTiers = Record<string, GameTierState>;
const EMPTY: GameTierState = { cleared: null, recent: {}, best: {}, runs: 0 };

/** Key of a game's tier state (aliases folded). */
export const tierKey = (game: string) => tierSpec(game)?.game ?? game;

/**
 * Record a run at a tier. Returns the new state and the tier this run cleared (null if none): a tier is cleared when
 * 2 of its last 3 runs met the rule. A cleared tier never goes back.
 */
export function afterRun(s: GameTierState | undefined, tier: DynName, pass: boolean, score: number, at?: string): { state: GameTierState; newlyCleared: DynName | null } {
  const cur = s ?? EMPTY;
  const recent = [...(cur.recent[tier] ?? []), pass ? 1 : 0].slice(-3) as (0 | 1)[];
  const passes = recent.reduce<number>((a, b) => a + b, 0);
  const already = cur.cleared !== null && tierIndex(cur.cleared) >= tierIndex(tier);
  const clears = !already && passes >= 2;
  const state: GameTierState = {
    cleared: clears ? tier : cur.cleared,
    recent: { ...cur.recent, [tier]: recent },
    best: { ...cur.best, [tier]: Math.max(cur.best[tier] ?? 0, score) },
    runs: cur.runs + 1,
    ...(at ? { at } : {}),
  };
  return { state, newlyCleared: clears ? tier : null };
}

/** Merge two devices' tier states (sync): the higher cleared tier, the longer history, the better bests. */
export function mergeGameTiers(a: GameTiers | undefined, b: GameTiers | undefined): GameTiers | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: GameTiers = { ...a };
  for (const [k, y] of Object.entries(b)) {
    const x = out[k];
    if (!x) {
      out[k] = y;
      continue;
    }
    const cleared = x.cleared && y.cleared ? (tierIndex(x.cleared) >= tierIndex(y.cleared) ? x.cleared : y.cleared) : (x.cleared ?? y.cleared);
    const best: GameTierState['best'] = { ...x.best };
    for (const [t, v] of Object.entries(y.best) as [DynName, number][]) best[t] = Math.max(best[t] ?? 0, v);
    out[k] = { cleared, recent: x.runs >= y.runs ? x.recent : y.recent, best, runs: Math.max(x.runs, y.runs), at: (x.at ?? '') > (y.at ?? '') ? x.at : y.at };
  }
  return out;
}

// ---------------------------------------------------------------- which tier opens

export interface TierInfo {
  game: string;
  /** The tier the game opens at. */
  open: DynName;
  /** Highest cleared tier. */
  cleared: DynName | null;
  /** Highest tier the player may pick (open + 1). */
  max: DynName;
  /** The tier the rating alone gives (before the cleared floor). */
  rated: DynName | null;
  provisional: boolean;
  /** Advanced games: tiers below this one are shown as "opens at …". */
  minTier?: DynName;
  /** A path step asked for this tier (opens there, still capped at max + steps never lock). */
  forced?: DynName;
}

/** The rating behind a game for this player, and whether it is provisional. */
export function tierRating(game: string, ratings: Ratings, course: CourseId, courses?: CourseId[]): { r: number | null; provisional: boolean } {
  const spec = tierSpec(game);
  const key = spec?.source(course);
  const own = key ? ratings[key] : undefined;
  if (own && own.n >= PROVISIONAL_UNTIL) return { r: own.r, provisional: false };
  if (own && own.n > 0) return { r: own.r, provisional: true };
  const c = courseRating(course, ratings, courses);
  return { r: c, provisional: true };
}

/** Which tier a game opens at, and how far up the player may pick. */
export function tierInfo(game: string, ratings: Ratings, state: GameTierState | undefined, course: CourseId, courses?: CourseId[]): TierInfo {
  const spec = tierSpec(game);
  const { r, provisional } = tierRating(game, ratings, course, courses);
  let i = r === null ? 0 : tierIndex(tierOfRating(r));
  if (provisional) i = Math.max(0, i - 1);
  const c = state?.cleared ? tierIndex(state.cleared) : -1;
  let open = Math.min(DYN_NAMES.length - 1, Math.max(i, c + 1));
  if (spec?.minTier) open = Math.max(open, tierIndex(spec.minTier));
  return { game: spec?.game ?? game, open: DYN_NAMES[open], cleared: state?.cleared ?? null, max: tierAt(open + 1), rated: r === null ? null : tierOfRating(r), provisional, ...(spec?.minTier ? { minTier: spec.minTier } : {}) };
}

/** May the player pick tier t now? (any tier from the advanced minimum up to open + 1; a forced tier always). */
export function tierAllowed(info: TierInfo, t: DynName): boolean {
  if (info.forced === t) return true;
  const i = tierIndex(t);
  if (info.minTier && i < tierIndex(info.minTier)) return false;
  return i <= tierIndex(info.max);
}

/** Why a tier is locked (one line), or null. */
export function lockReason(info: TierInfo, t: DynName, lang: 'en' | 'he'): string | null {
  if (tierAllowed(info, t)) return null;
  const i = tierIndex(t);
  if (info.minTier && i < tierIndex(info.minTier)) return lang === 'he' ? `נפתח ב־${info.minTier}` : `opens at ${info.minTier}`;
  const need = tierAt(i - 2);
  return lang === 'he' ? `קודם לעבור את ${need}` : `clear ${need} first`;
}

/** The tier a game should start at: the forced one (path step) else the open one. */
export const startTier = (info: TierInfo): DynName => info.forced ?? info.open;

/** What the game card shows: "mf · next f" and a thin bar (never full below ff). */
export function tierCard(info: TierInfo, state: GameTierState | undefined): { tier: DynName; next: DynName | null; into: number; isNew: boolean } {
  const t = info.open;
  const i = tierIndex(t);
  const next = i < DYN_NAMES.length - 1 ? DYN_NAMES[i + 1] : null;
  const passes = (state?.recent[t] ?? []).reduce<number>((a, b) => a + b, 0);
  const cleared = state?.cleared ? tierIndex(state.cleared) >= i : false;
  const into = !next ? (cleared ? 1 : Math.min(0.95, passes / 2)) : Math.min(0.95, passes / 2);
  return { tier: t, next, into, isNew: !state || state.runs === 0 };
}

// ---------------------------------------------------------------- the clear rule

const num = (d: Record<string, unknown>, k: string): number | null => (typeof d[k] === 'number' && Number.isFinite(d[k]) ? (d[k] as number) : null);

/** Accuracy 0..1 of a run as the tier rules read it (right / (right + wrong), else the score as a percentage). */
function runAccuracy(score: number, d: Record<string, unknown>): number {
  const right = num(d, 'right');
  const wrong = num(d, 'wrong');
  if (right !== null && wrong !== null) return right / Math.max(1, right + wrong);
  const acc = num(d, 'accuracy');
  if (acc !== null) return acc > 1 ? acc / 100 : acc;
  const max = num(d, 'max');
  if (max) return Math.max(0, Math.min(1, score / max));
  return Math.max(0, Math.min(1, score / 100));
}

/** Did this run meet the game's rule for its tier? */
export function clearsRun(game: string, tier: DynName, score: number, detail: unknown): boolean {
  const spec = tierSpec(game);
  if (!spec) return false;
  const def = spec.tiers[tier];
  const d = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  const target = def.target ?? 0;
  switch (spec.clear) {
    case 'rush': {
      const right = num(d, 'right') ?? 0;
      const n = def.rungs?.length ?? 1;
      const top = num(d, 'level') ?? n;
      return right >= target && runAccuracy(score, d) >= 0.85 && (!def.rungs || top >= n);
    }
    case 'streak': {
      const cases = typeof def.params?.cases === 'number' ? def.params.cases : 3 * (def.rungs?.length ?? 1);
      return (num(d, 'right') ?? 0) >= cases;
    }
    case 'timing': {
      // on-screen taps of a played-instrument game are practice (measured input only)
      if (d.input === 'touch' && (game === 'bhtime' || game === 'riffecho')) return false;
      const acc = num(d, 'accuracy') ?? score;
      return acc >= (target || 90);
    }
    case 'accuracy': {
      if (game === 'tuneup' || game === 'tune-up') {
        const mean = num(d, 'meanCents');
        return mean !== null && mean <= 7.5 - (tierIndex(tier) >= 4 ? 2 : 0);
      }
      if (game === 'peakhunter') {
        const oct = num(d, 'meanOctaves');
        return oct !== null && 1 - oct >= target / 100;
      }
      return runAccuracy(score, d) >= target / 100;
    }
    case 'flight':
      return d.input !== 'touch' && (num(d, 'gates') ?? 0) >= target;
    case 'chain':
      return (num(d, 'best') ?? num(d, 'length') ?? 0) >= target;
    case 'window': {
      const cents = num(d, 'cents');
      const w = Number(def.params?.cents ?? 50);
      return cents !== null && Math.abs(cents) <= w;
    }
    case 'social':
      return runAccuracy(score, d) >= 0.8;
  }
}

// ---------------------------------------------------------------- XP

/** XP of one finished game at a tier (before the 100-a-day cap). */
export function gameXp(game: string, tier: DynName, score: number, detail: unknown): number {
  const d = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  const right = num(d, 'right');
  const chain = num(d, 'best');
  const spec = tierSpec(game);
  let base: number;
  if (right !== null) base = right;
  else if (spec?.clear === 'chain' && chain !== null) base = chain * 2;
  else if (spec?.clear === 'window') base = 5;
  else base = Math.round(runAccuracy(score, d) * 10);
  return Math.max(0, Math.min(GAME_XP_MAX, Math.round(base * tierFactor(tier))));
}

/** XP left today from games, given what games already gave today. */
export const gameXpLeft = (today: number) => Math.max(0, GAME_XP_DAY - Math.max(0, today));

// ---------------------------------------------------------------- badges and path

/** Games whose tiers count for a course's tier badges. */
export function tiersCleared(tiers: GameTiers | undefined, games: string[], at: DynName): number {
  const want = tierIndex(at);
  return games.filter((g) => {
    const c = tiers?.[tierKey(g)]?.cleared;
    return !!c && tierIndex(c) >= want;
  }).length;
}

/** Highest tier cleared in any game. */
export function topCleared(tiers: GameTiers | undefined): DynName | null {
  let best = -1;
  for (const s of Object.values(tiers ?? {})) if (s.cleared) best = Math.max(best, tierIndex(s.cleared));
  return best < 0 ? null : DYN_NAMES[best];
}

/** The tier a path game step asks for: the band of the step's difficulty. */
export const stepTier = (difficulty: number): DynName => tierOfRating(difficulty);

/** Stars of a path game step: 3 when the run met the rule at (or above) the step's tier, else by accuracy, at most 2. */
export function tierStepStars(stepT: DynName, runTier: DynName | null, pass: boolean, acc: number): number {
  if (runTier && pass && tierIndex(runTier) >= tierIndex(stepT)) return 3;
  const s = acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
  return Math.min(2, s);
}

/** The step index of a tier's rungs for rated difficulty (Rush: the rung the run reached). */
export function runDifficulty(game: string, tier: DynName, detail: Record<string, unknown>): number {
  const def = tierDef(game, tier);
  const n = def?.rungs?.length ?? def?.levels?.length ?? 1;
  const lvl = Number(detail.level);
  const i = def?.rungs && Number.isFinite(lvl) ? lvl - 1 : Math.floor((n - 1) / 2);
  return tierDifficulty(tier, i, n);
}

// ---------------------------------------------------------------- social: tier in the seed

/**
 * Duels, rooms and ghosts carry the tier in their 32-bit seed (no schema change): the top byte is 0xE1…0xE5 for
 * p … ff; any other seed is pp (every seed from before tiers). A pp seed never has such a top byte.
 */
const TIER_MARK = 0xe0;
export function tierSeed(base: number, t: DynName): number {
  const i = tierIndex(t);
  const low = (base >>> 0) & 0xffffff;
  if (i <= 0) {
    const s = base >>> 0;
    const top = s >>> 24;
    return top > TIER_MARK && top <= TIER_MARK + 5 ? (s ^ 0x40000000) >>> 0 : s;
  }
  return ((TIER_MARK + i) * 0x1000000 + low) >>> 0;
}
export function seedTier(seed: number): DynName {
  if (!(seed >= 0 && seed < 2 ** 32)) return 'pp';
  const top = Math.floor(seed / 0x1000000);
  return top > TIER_MARK && top <= TIER_MARK + 5 ? DYN_NAMES[top - TIER_MARK] : 'pp';
}

/** Daily challenge bands (owner 2026-11-10): soft = pp–p, mid = mp–mf, loud = f–ff. */
export type DailyBand = 'soft' | 'mid' | 'loud';
export const DAILY_BANDS: DailyBand[] = ['soft', 'mid', 'loud'];
export const bandOfTier = (t: DynName): DailyBand => (tierIndex(t) <= 1 ? 'soft' : tierIndex(t) <= 3 ? 'mid' : 'loud');
/** The two tiers of a band (rounds alternate between them). */
export const bandTiers = (b: DailyBand): [DynName, DynName] => (b === 'soft' ? ['pp', 'p'] : b === 'mid' ? ['mp', 'mf'] : ['f', 'ff']);
export const BAND_NAMES: Record<DailyBand, Bi> = { soft: L('soft · pp–p', 'שקט · pp–p'), mid: L('mid · mp–mf', 'בינוני · mp–mf'), loud: L('loud · f–ff', 'חזק · f–ff') };
/** The bands a player may play: their own and one above. */
export const bandsOpen = (own: DailyBand): DailyBand[] => DAILY_BANDS.slice(0, Math.min(3, DAILY_BANDS.indexOf(own) + 2));

/** The social tier for a course: the course level, one lower while provisional (like a game). */
export function socialInfo(ratings: Ratings, course: CourseId, state: GameTierState | undefined, courses?: CourseId[]): TierInfo {
  const r = courseRating(course, ratings, courses);
  const i = r === null ? 0 : tierIndex(tierOfRating(r));
  const c = state?.cleared ? tierIndex(state.cleared) : -1;
  const open = Math.min(DYN_NAMES.length - 1, Math.max(i, c + 1));
  return { game: 'social', open: DYN_NAMES[open], cleared: state?.cleared ?? null, max: tierAt(open + 1), rated: r === null ? null : tierOfRating(r), provisional: r === null };
}
