// Badges (docs/SPEC-STATS.md §9, owner 2026-11-07): a large catalogue with creative names, pure data + rules.
// Every badge is { id, cat, icon, name, desc, rule } where rule is a pure function of one typed input bundle
// (BadgeInput) returning whether it is earned and how close it is. Badges are earned "for ever" once the
// caller stores them (earnBadges → progress.badges), so a level that later dips never takes one away.
//
// Categories
//   area       7 areas + technique × Bronze / Silver / Gold / Platinum / Diamond / Master (from ranks.best)
//   skill      every Skill Map skill × Developing 900 / Solid 1150 / Advanced 1400 / Master 1600 (evidence: n ≥ 8, ≥ 20 from Advanced)
//   sub        every taxonomy sub-skill "mastered": accuracy EWMA ≥ 0.85 with n ≥ 20 (foldSubs)
//   technique  every drill family × its levels (piano 7, guitar 4–7), all 12 keys clean per family, even hands,
//              clean takes, tempo records, guitar specials (bends, vibrato, boxes, CAGED, changes, barre, grooves, bass)
//   special    streaks, time of day, variety, big days
//   season     monthly area challenges (ranks.ts)

import type { SkillId } from './lesson';
import type { BassFamilyId, DrumFamilyId, FamilyId } from './drills/types';
import { guitarCatalog, type GuitarLevelDef } from './drills/guitar';
import { catalog } from './drills/generate';
import { BASS_SUMMITS } from './drills/bassNiche';
import { SETLIST } from './drills/bassNiche2';
import { DOMAINS, PROVISIONAL_UNTIL, SKILLS, type DomainId, type Ratings } from './rating';
import { SUB_SKILLS, type SubStat } from './taxonomy';
import { addDays, type Counts, type InputKind, type Peaks, type StatsDays, type StatsHours } from './stats';
import type { CourseId } from './courses';
import { tiersCleared, topCleared, type GameTiers } from './gameTiers';
import { gameBadgeCourse, gameBadgeSeeds } from './gameBadges';
import { VOICE_FAMILIES } from './voiceFamilies';
import { COURSE_GAMES } from '../ui/courseRows';
import { AREA_NAME, completedChallenges, RANK_AREAS, RANK_TIERS, TIER_NAME, tierStart, type RankArea, type Ranks, type RankTier } from './ranks';

export type L = { en: string; he: string };
export type BadgeCat = 'area' | 'skill' | 'sub' | 'technique' | 'special' | 'season';
export const BADGE_CATS: BadgeCat[] = ['area', 'skill', 'sub', 'technique', 'special', 'season'];
export const BADGE_CAT_NAME: Record<BadgeCat, L> = {
  area: { en: 'Area titles', he: 'תארי תחום' },
  skill: { en: 'Skill levels', he: 'רמות מיומנות' },
  sub: { en: 'Mastered', he: 'נכבש!' },
  technique: { en: 'Technique', he: 'טכניקה' },
  special: { en: 'Specials', he: 'מיוחדים' },
  season: { en: 'Seasons', he: 'עונות' },
};

/** Everything a badge rule may read. All optional except today; missing data simply leaves badges locked. */
export interface BadgeInput {
  /** Local day "YYYY-MM-DD". */
  today: string;
  ratings?: Ratings;
  /** Best-ever levels (progress.peaks) — a skill badge counts the peak once measured. */
  peaks?: Peaks;
  /** foldSubs(events) */
  subs?: Record<string, SubStat>;
  ranks?: Ranks;
  statsDays?: StatsDays;
  statsHours?: StatsHours;
  counts?: Counts;
  /** Practice days (local), e.g. practiceDays(progress); merged with statsDays days that have items. */
  days?: string[];
  /** Weekend weekdays (0 = Sunday); default Saturday + Sunday — pass [5, 6] for a Friday–Saturday weekend. */
  weekendDays?: number[];
  /** Days a daily workout was completed (local). */
  workoutDays?: string[];
  /** Game tiers (GAMES_TIERS_PLAN §5.2): the highest tier cleared per game. */
  gameTiers?: GameTiers;
  /** Repertoire (SPEC-REPERTOIRE): standards learned per course (tiers 3–4) and advanced pieces learned (tier 4). */
  repertoire?: Partial<Record<CourseId, { standards: number; advanced: number }>>;
  /** SPEC-COURSE-START: courses whose measured first win was recorded (Settings.courseStart, never for migrated players). */
  firstWins?: CourseId[];
  /** Vocal levels passed (progress.vocal.passed): the voice course's family and milestone badges. */
  vocalPassed?: number[];
  technique?: {
    /** Family level 0–7 (drills engine, e.g. familyLevel(states, f)). */
    levels?: Partial<Record<FamilyId, number>>;
    /** Keys 0–12 with at least one clean take, per family. */
    keysClean?: Partial<Record<FamilyId, number>>;
    /** Best take's max(cvR, cvL) in a hands-together take (0..1), lower is better. */
    bestEvenCv?: number | null;
    /** Clean takes, lifetime. */
    cleanTakes?: number;
    /** Personal tempo records set, lifetime. */
    tempoRecords?: number;
    /** Items with a clean take: itemId → best clean tempo (ItemState.cleanBpm > 0). Feeds the guitar specials
     *  (bends, vibrato, boxes, CAGED, chord changes, barre, rhythm patterns, bass), which read the itemIds. */
    cleanItems?: Record<string, number>;
  };
}
export interface BadgeCheck {
  done: boolean;
  /** 0..1 towards it. */
  p: number;
  /** Shown as "v / goal" when present. */
  v?: number;
  goal?: number;
}
export interface Badge {
  id: string;
  cat: BadgeCat;
  icon: string;
  name: L;
  desc: L;
  /** Group inside the category (area id, skill id, family id …) for the grid. */
  group?: string;
  /** Crest colour. */
  tone?: RankTier;
  /** 0.65 (owner, per course): the course the badge belongs to ('general' = streaks, days, seasons). Set for every
   *  catalogue badge by badgeCourse. */
  course?: BadgeCourse;
  /** Other courses that show it too (a technique count shared by the three instruments, ear areas in Exams). */
  alsoIn?: CourseId[];
  rule: (x: BadgeInput) => BadgeCheck;
}
export type BadgeCourse = CourseId | 'general';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const count = (v: number, goal: number): BadgeCheck => ({ done: v >= goal, p: clamp01(v / goal), v: Math.min(v, goal), goal });
const both = (a: BadgeCheck, b: BadgeCheck): BadgeCheck => ({ done: a.done && b.done, p: Math.min(a.p, b.p), v: a.v, goal: a.goal });

// ======================================================================= derived (memoised per input object)

interface Derived {
  days: string[];
  bestStreak: number;
  workoutStreak: number;
  challenges: { month: string; area: DomainId; tier: number }[];
  bestWeekAreas: number;
  inputs: number;
  bestDayItems: number;
  bullseye: boolean;
  dawn: number;
  night: number;
  weekend: number;
}
const memo = new WeakMap<BadgeInput, Derived>();
function longestRun(days: string[]): number {
  const s = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of s) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
function derived(x: BadgeInput): Derived {
  const hit = memo.get(x);
  if (hit) return hit;
  const sd = x.statsDays ?? {};
  const days = [...new Set([...(x.days ?? []), ...Object.entries(sd).filter(([, d]) => d.items > 0 || d.sessions > 0).map(([d]) => d)])].sort();
  // Most areas practised in any 7-day window.
  let bestWeekAreas = 0;
  for (const d of Object.keys(sd)) {
    const areas = new Set<string>();
    for (let i = 0; i < 7; i++) for (const [a, v] of Object.entries(sd[addDays(d, i)]?.byArea ?? {})) if (v && v[0] > 0) areas.add(a);
    bestWeekAreas = Math.max(bestWeekAreas, areas.size);
  }
  const inputs = new Set<InputKind>();
  for (const d of Object.values(sd)) for (const [k, v] of Object.entries(d.byInput ?? {})) if (v && v[0] > 0) inputs.add(k as InputKind);
  const vals = Object.values(sd);
  const h = x.statsHours?.n ?? [];
  const ALL = Array.from({ length: 24 }, (_, i) => i);
  const hours = (hrs: number[], weekdays = [0, 1, 2, 3, 4, 5, 6]) => weekdays.reduce((a, w) => a + hrs.reduce((b, hr) => b + (h[w * 24 + hr] ?? 0), 0), 0);
  const out: Derived = {
    days,
    bestStreak: longestRun(days),
    workoutStreak: longestRun(x.workoutDays ?? []),
    challenges: completedChallenges(x.statsDays),
    bestWeekAreas,
    inputs: inputs.size,
    bestDayItems: Math.max(0, ...vals.map((d) => d.items)),
    bullseye: vals.some((d) => d.items >= 50 && d.correct / d.items >= 0.95),
    dawn: hours([5, 6, 7]),
    night: hours([23, 0, 1, 2, 3]),
    weekend: hours(ALL, x.weekendDays ?? [0, 6]),
  };
  memo.set(x, out);
  return out;
}

// ======================================================================= area titles (7 areas + technique × 6)

const AREA_TITLES: Record<RankArea, [string, string][]> = {
  // [EN, HE] for bronze, silver, gold, platinum, diamond, master
  pitch: [['Tuning Fork', 'מזלג כוונון'], ['Chord Detective', 'הבלש של האקורדים'], ['Harmony Hunter', 'צייד ההרמוניות'], ['Overtone Whisperer', 'לוחש לצלילים העיליים'], ['Golden Ear', 'אוזן של זהב'], ['Music of the Spheres', 'מוזיקת הספֵרות']],
  time: [['Pulse Keeper', 'שומר הפעמה'], ['Groove Cadet', 'צוער הגרוב'], ['Swing Commander', 'מפקד הסווינג'], ['Polyrhythm Pilot', 'טייס פולי־ריתם'], ['Human Metronome', 'מטרונום אנושי'], ['Lord of Time', 'אדון הזמן']],
  memory: [['Echo Catcher', 'לוכד הדים'], ['Motif Collector', 'אספן מוטיבים'], ['Phrase Architect', 'אדריכל המשפטים'], ['Score in the Head', 'פרטיטורה בראש'], ['Elephant Ears', 'זיכרון של פיל'], ['Living Archive', 'ארכיון מהלך']],
  voice: [['Shower Singer', 'זמר מקלחות'], ['Choir Recruit', 'טירון במקהלה'], ['Steady Songbird', 'ציפור שיר יציבה'], ['Velvet Voice', 'קול של קטיפה'], ['Golden Throat', 'גרון של זהב'], ['Nightingale Supreme', 'הזמיר העליון']],
  reading: [['Note Spotter', 'מזהה התווים'], ['Staff Scout', 'סייר החמשה'], ['Clef Cracker', 'פורץ המפתחות'], ['Page Turner', 'מדפדף סדרתי'], ['Score Whisperer', 'לוחש לפרטיטורות'], ['Grand Librarian', 'הספרן הגדול']],
  creative: [['Sound Doodler', 'משרבט צלילים'], ['Riff Tinkerer', 'שרברב ריפים'], ['Key Shifter', 'מזיז סולמות'], ['Jam Captain', 'קפטן הג׳אם'], ['Improv Alchemist', 'אלכימאי האלתור'], ['Composer in Residence', 'מלחין הבית']],
  instrument: [['Knob Twiddler', 'מסובב כפתורים'], ['Sound Explorer', 'חוקר סאונד'], ['Mix Navigator', 'נווט המיקס'], ['Studio Wizard', 'קוסם האולפן'], ['Golden Fader', 'פיידר של זהב'], ['Sound Sculptor', 'פַּסל הסאונד']],
  technique: [['Warm-Up Hands', 'ידיים מתחממות'], ['Steady Fingers', 'אצבעות יציבות'], ['Scale Runner', 'רץ הסולמות'], ['Velvet Touch', 'מגע של קטיפה'], ['Lightning Hands', 'ידיים של ברק'], ['Titan of Technique', 'טיטאן הטכניקה']],
};
const TIER_ICON: Record<RankTier, string> = { bronze: 'trophy', silver: 'trophy', gold: 'trophy', platinum: 'star', diamond: 'star', master: 'trophy' };

const areaBadges: Badge[] = RANK_AREAS.flatMap((a) =>
  RANK_TIERS.map((t, i) => {
    const start = tierStart(t);
    const [en, he] = AREA_TITLES[a][i];
    return {
      id: `area:${a}:${t}`,
      cat: 'area' as const,
      icon: TIER_ICON[t],
      group: a,
      tone: t,
      name: { en, he },
      desc: { en: `Reach ${TIER_NAME[t].en} in ${AREA_NAME[a].en}.`, he: `להגיע לדרגת ${TIER_NAME[t].he} ב${AREA_NAME[a].he}.` },
      rule: (x: BadgeInput): BadgeCheck => {
        const best = x.ranks?.[a]?.best;
        if (best === undefined) return { done: false, p: 0 };
        return { done: best >= start, p: clamp01((best + 1) / (start + 1)) };
      },
    };
  }),
);

// ======================================================================= skill levels (27 skills × 4)

export type SkillLevel = 'developing' | 'solid' | 'advanced' | 'master';
export const SKILL_LEVELS: { id: SkillLevel; r: number; n: number; tone: RankTier; name: L }[] = [
  { id: 'developing', r: 900, n: PROVISIONAL_UNTIL, tone: 'bronze', name: { en: 'Developing', he: 'מתפתח' } },
  { id: 'solid', r: 1150, n: PROVISIONAL_UNTIL, tone: 'silver', name: { en: 'Solid', he: 'יציב' } },
  { id: 'advanced', r: 1400, n: 20, tone: 'gold', name: { en: 'Advanced', he: 'מתקדם' } },
  { id: 'master', r: 1600, n: 20, tone: 'diamond', name: { en: 'Master', he: 'מאסטר' } },
];
export const SKILL_NAME: Record<SkillId, L> = {
  degrees: { en: 'Scale degrees', he: 'דרגות בסולם' },
  intervals: { en: 'Intervals', he: 'מרווחים' },
  chords: { en: 'Chord quality', he: 'סוג אקורד' },
  cadences: { en: 'Harmony & progressions', he: 'הרמוניה ומהלכים' },
  modes: { en: 'Modes by ear', he: 'מודוסים בשמיעה' },
  pitch: { en: 'Fine pitch', he: 'גובה עדין' },
  absolute: { en: 'Absolute pitch', he: 'שמיעה מוחלטת' },
  'rhythm-dictation': { en: 'Rhythm by ear', he: 'קצב בשמיעה' },
  'rhythm-reading': { en: 'Rhythm reading', he: 'קריאה קצבית' },
  timing: { en: 'Rhythmic precision', he: 'דיוק קצבי' },
  tempo: { en: 'Tempo & pulse', he: 'טמפו ופעמה' },
  meter: { en: 'Meter', he: 'משקל' },
  sequences: { en: 'Melodic memory', he: 'זיכרון מלודי' },
  rhythm: { en: 'Rhythmic memory', he: 'זיכרון קצבי' },
  form: { en: 'Form & texture', he: 'מבנה ומרקם' },
  singing: { en: 'Singing in tune', he: 'שירה מדויקת' },
  technique: { en: 'Vocal technique', he: 'טכניקה קולית' },
  agility: { en: 'Vocal agility', he: 'גמישות קולית' },
  notes: { en: 'Note naming', he: 'שמות תווים' },
  theory: { en: 'Written theory', he: 'תיאוריה כתובה' },
  sight: { en: 'Sight-reading', he: 'קריאה מהדף' },
  dictation: { en: 'Written dictation', he: 'הכתבה בכתב' },
  improv: { en: 'Improvisation', he: 'אלתור' },
  transpose: { en: 'Transposition', he: 'טרנספוזיציה' },
  expression: { en: 'Expression', he: 'הבעה' },
  instrument: { en: 'Your instrument', he: 'הכלי שלך' },
  timbre: { en: 'Sound & production ear', he: 'אוזן של סאונד' },
};
const SKILL_TITLES: Record<SkillId, [string, string][]> = {
  degrees: [['Home Finder', 'מוצא הבית'], ['Degree Detective', 'בלש הדרגות'], ['Scale Navigator', 'נווט הסולם'], ['Tonal Compass', 'מצפן טונאלי']],
  intervals: [['Step Counter', 'סופר צעדים'], ['Leap Spotter', 'מזהה קפיצות'], ['Interval Acrobat', 'אקרובט מרווחים'], ['Distance Oracle', 'אורקל המרחקים']],
  chords: [['Triad Taster', 'טועם משולשים'], ['Chord Sommelier', 'סומלייה של אקורדים'], ['Voicing Connoisseur', 'אנין וויסינגים'], ['Harmony Chef', 'שף הרמוניות']],
  cadences: [['Cadence Cub', 'גור הקדנצות'], ['Progression Tracker', 'עוקב המהלכים'], ['Changes Cartographer', 'משרטט המהלכים'], ['The Grand Resolver', 'הפותר הגדול']],
  modes: [['Mode Tourist', 'תייר מודוסים'], ['Dorian Dabbler', 'חובב דורי'], ['Modal Traveler', 'נוסע מודאלי'], ['Lord of the Modes', 'שר המודוסים']],
  pitch: [['Ear Tuner', 'מכוון אוזניים'], ['Cent Counter', 'סופר סנטים'], ['Fine-Tune Hawk', 'נץ הכיוונון'], ['Pitch Microscope', 'מיקרוסקופ צלילים']],
  absolute: [['Pitch Guesser', 'מנחש צלילים'], ['Note Memory Keeper', 'שומר זיכרון הצליל'], ['Perfect-ish Pitch', 'כמעט מוחלט'], ['Built-In Tuner', 'טיונר מובנה']],
  'rhythm-dictation': [['Beat Listener', 'מאזין לפעמות'], ['Rhythm Transcriber', 'מתמלל מקצבים'], ['Groove Decoder', 'מפענח גרובים'], ['Rhythm Stenographer', 'קצרן הקצב']],
  'rhythm-reading': [['Rhythm Reader', 'קורא מקצבים'], ['Syncopation Spotter', 'צייד סינקופות'], ['Ink-to-Groove', 'מדיו לגרוב'], ['Living Drum Chart', 'תווי תופים מהלכים']],
  timing: [['Tapper', 'מקיש מתחיל'], ['Steady Hand', 'יד יציבה'], ['Click Whisperer', 'לוחש לקליק'], ['Atomic Clock', 'שעון אטומי']],
  tempo: [['Tempo Taster', 'טועם טמפו'], ['BPM Guesser', 'מנחש BPM'], ['Speed Reader', 'קורא מהירויות'], ['Inner Clock', 'שעון פנימי']],
  meter: [['Bar Counter', 'סופר תיבות'], ['Downbeat Finder', 'מוצא הפעמה הראשונה'], ['Odd-Meter Explorer', 'חוקר משקלים עקומים'], ['Meter Shapeshifter', 'משנה משקלים']],
  sequences: [['Melody Catcher', 'לוכד מנגינות'], ['Tune Collector', 'אספן לחנים'], ['Melody Vault', 'כספת מלודית'], ['Photographic Ears', 'אוזניים צילומיות']],
  rhythm: [['Echo Drummer', 'מתופף הד'], ['Pattern Keeper', 'שומר התבניות'], ['Rhythm Vault', 'כספת קצבים'], ['Groove Memory Bank', 'בנק הגרובים']],
  form: [['Phrase Spotter', 'מזהה משפטים'], ['Form Mapper', 'ממפה מבנים'], ['Texture Taster', 'טועם מרקמים'], ['Architect of Form', 'אדריכל הצורה']],
  singing: [['First Note', 'הצליל הראשון'], ['In-Tune Voice', 'קול מכוון'], ['Spot-On Singer', 'זמר בול'], ['Human Tuning Fork', 'מזלג כוונון אנושי']],
  technique: [['Breath Beginner', 'נושם מתחיל'], ['Steady Breather', 'נשימה יציבה'], ['Vibrato Tamer', 'מאלף הוויברטו'], ['Voice Engineer', 'מהנדס הקול']],
  agility: [['Run Rookie', 'טירון ראנים'], ['Riff Rider', 'רוכב ריפים'], ['Melisma Racer', 'מרוצת מליסמות'], ['Vocal Gymnast', 'מתעמל קולי']],
  notes: [['Note Namer', 'נותן שמות לתווים'], ['Staff Reader', 'קורא חמשה'], ['Ledger-Line Climber', 'מטפס קווי עזר'], ['Clef Ninja', 'נינג׳ת המפתחות']],
  theory: [['Theory Curious', 'סקרן תיאוריה'], ['Circle Rider', 'רוכב המעגל'], ['Roman Numeral Scholar', 'חוקר הספרות הרומיות'], ['Theory Professor', 'פרופסור לתיאוריה']],
  sight: [['Page Peeker', 'מציץ לדף'], ['First-Sight Reader', 'קורא ממבט ראשון'], ['Score Sprinter', 'ספרינטר תווים'], ['Reads Like a Novel', 'קורא תווים כמו רומן']],
  dictation: [['Note Scribe', 'סופר תווים'], ['Melody Writer', 'כותב מנגינות'], ['Two-Voice Scribe', 'סופר בשני קולות'], ['Living Dictaphone', 'דיקטפון חי']],
  improv: [['Doodler', 'משרבט'], ['Call & Responder', 'עונה בצלילים'], ['Groove Improviser', 'מאלתר בגרוב'], ['Jazz Storyteller', 'מספר סיפורים בג׳אז']],
  transpose: [['Key Hopper', 'קופץ סולמות'], ['Shape Shifter', 'משנה צורה'], ['Twelve-Key Traveler', 'נוסע ב־12 סולמות'], ['Transposition Wizard', 'קוסם הטרנספוזיציה']],
  expression: [['Volume Knob', 'כפתור ווליום'], ['Phrase Painter', 'צייר משפטים'], ['Mood Maker', 'יוצר אווירה'], ['Poet of Sound', 'משורר הצליל']],
  instrument: [['First Notes', 'צלילים ראשונים'], ['Neck Navigator', 'נווט הצוואר'], ['Fluent Fingers', 'אצבעות שוטפות'], ['One With the Instrument', 'אחד עם הכלי']],
  timbre: [['Frequency Finder', 'מוצא תדרים'], ['EQ Explorer', 'חוקר EQ'], ['Mix Detective', 'בלש המיקס'], ['Studio Golden Ears', 'אוזני הזהב של האולפן']],
};
const SKILL_ICON: Partial<Record<DomainId, string>> = { pitch: 'contour', time: 'drums', memory: 'memory', voice: 'mic', reading: 'book', creative: 'improv', instrument: 'guitar' };
const domainOfSkill = (k: SkillId) => DOMAINS.find((d) => d.skills.includes(k))!.id;

const skillBadges: Badge[] = SKILLS.flatMap((k) =>
  SKILL_LEVELS.map((lv, i) => {
    const [en, he] = SKILL_TITLES[k][i];
    return {
      id: `skill:${k}:${lv.id}`,
      cat: 'skill' as const,
      icon: SKILL_ICON[domainOfSkill(k)] ?? 'contour',
      group: k,
      tone: lv.tone,
      name: { en, he },
      desc: { en: `${SKILL_NAME[k].en}: reach ${lv.name.en} (${lv.r}).`, he: `${SKILL_NAME[k].he}: להגיע לרמת ${lv.name.he} (${lv.r}).` },
      rule: (x: BadgeInput): BadgeCheck => {
        const s = x.ratings?.[k];
        const n = s?.n ?? 0;
        if (!s || n === 0) return { done: false, p: 0 };
        const r = n >= PROVISIONAL_UNTIL ? Math.max(s.r, x.peaks?.[k]?.r ?? 0) : s.r;
        const lvl: BadgeCheck = { done: r >= lv.r, p: clamp01((r - 600) / (lv.r - 600)), v: r, goal: lv.r };
        // Level reached but not enough answers yet: show what is missing (answers), not "1150 / 900".
        if (lvl.done && n < lv.n) return { done: false, p: clamp01(n / lv.n), v: n, goal: lv.n };
        return both(lvl, { done: n >= lv.n, p: clamp01(n / lv.n) });
      },
    };
  }),
);

// ======================================================================= sub-skills "mastered" (~110)

export const SUB_MASTERY = { ewma: 0.85, n: 20 };
const SUB_HONOURS: [string, string, string][] = [
  // [icon, EN prefix, HE prefix]
  ['trophy', 'Black Belt', 'חגורה שחורה'],
  ['trophy', 'Crown', 'כתר'],
  ['star', 'Gold Star', 'כוכב זהב'],
  ['trophy', 'Master Seal', 'חותם המאסטר'],
  ['scales', 'Summit', 'פסגה'],
  ['trophy', 'Medal of Honor', 'עיטור כבוד'],
  ['theory', 'Golden Key', 'מפתח הזהב'],
];
const subBadges: Badge[] = SUB_SKILLS.map((s, i) => {
  const [icon, en, he] = SUB_HONOURS[i % SUB_HONOURS.length];
  return {
    id: `sub:${s.id}`,
    cat: 'sub' as const,
    icon,
    group: s.skill,
    tone: 'gold' as const,
    name: { en: `${en}: ${s.en}`, he: `${he}: ${s.he}` },
    desc: { en: `Master "${s.en}": 85% accuracy over at least 20 answers.`, he: `לכבוש את "${s.he}": 85% דיוק על פני 20 תשובות לפחות.` },
    rule: (x: BadgeInput): BadgeCheck => {
      const st = x.subs?.[s.id];
      if (!st) return { done: false, p: 0 };
      return both({ done: st.ewma >= SUB_MASTERY.ewma, p: clamp01(st.ewma / SUB_MASTERY.ewma), v: Math.round(100 * st.ewma), goal: 85 }, { done: st.n >= SUB_MASTERY.n, p: clamp01(st.n / SUB_MASTERY.n) });
    },
  };
});

// ======================================================================= technique (families × 7 + specials)

// Bass-course families (b-*) get milestone + exam badges (bassBadges below), not one title per level.
// The pianist's ear (k-ear) gets milestones by items played back clean (keysEarBadges), not tempo-band titles.
// AUDIT-6 Stage B: the first steps at the piano grew to 11 levels and have their titles now (k-first), like the
// guitar's (g-first); bass and drum first steps get the bass / drum milestones with their own names (bassBadges, drumBadges).
export type BadgeFamily = Exclude<FamilyId, 'custom' | BassFamilyId | DrumFamilyId | 'k-ear' | 'licks' | 'transcribe'>;
export const PIANO_BADGE_FAMILIES: BadgeFamily[] = ['scales', 'arpeggios', 'cadences', 'fingers', 'control', 'advanced', 'harris', 'jazz', 'voicings', 'accomp', 'k-sixdim', 'k-bebop', 'k-reharm', 'k-rhythm', 'k-vl', 'k-theory', 'k-keys', 'k-vocab', 'k-phrase', 'k-solo', 'k-harm', 'k-tune', 'k-ctx', 'k-indep', 'k-sharm', 'k-harrisline', 'k-ctone', 'k-lh', 'k-mediant', 'k-tex', 'k-organ', 'k-comp', 'k-impro', 'k-first', 'k-read', 'k-pop', 'k-pedal', 'k-classic'];
export const GUITAR_BADGE_FAMILIES: BadgeFamily[] = ['g-fretting', 'g-picking', 'g-legato', 'g-scales', 'g-arps', 'g-chords', 'g-rhythm', 'g-lead', 'g-fingerstyle', 'g-flamenco', 'g-jazz', 'g-reading', 'g-impro', 'g-bass', 'g-ear', 'g-harris', 'g-prog', 'g-meter', 'g-vl', 'g-theory', 'g-keys', 'g-bebop', 'g-phrase', 'g-solo', 'g-cmel', 'g-tune', 'g-ctx', 'g-harm', 'g-harrisline', 'g-ctone', 'g-color', 'g-first', 'g-speed', 'g-riff', 'g-fusion', 'g-cmarr', 'g-solojazz', 'g-hlfast', 'g-jblues'];
export const BADGE_FAMILIES: BadgeFamily[] = [...PIANO_BADGE_FAMILIES, ...GUITAR_BADGE_FAMILIES];
/** Families whose levels together cover all 12 keys: one "Around the Clock" badge each (guitar list checked against guitarCatalog in tests). */
export const KEYS_FAMILIES: BadgeFamily[] = [...PIANO_BADGE_FAMILIES.filter((f) => f !== 'k-classic' /* pieces stay in their own key */), 'g-picking', 'g-legato', 'g-scales', 'g-arps', 'g-chords', 'g-rhythm', 'g-fingerstyle', 'g-jazz', 'g-impro', 'g-reading', 'g-bass', 'g-ear', 'g-harris', 'g-vl', 'g-theory', 'g-keys', 'g-bebop', 'g-phrase', 'g-solo', 'g-cmel', 'g-tune', 'g-ctx', 'g-harm', 'g-lead', 'g-harrisline', 'g-ctone', 'g-color', 'g-riff', 'g-speed', 'g-fusion', 'g-cmarr', 'g-solojazz', 'g-hlfast', 'g-jblues'];
export const FAMILY_NAME: Record<BadgeFamily, L> = {
  scales: { en: 'Scales', he: 'סולמות' },
  arpeggios: { en: 'Arpeggios', he: 'ארפג׳ים' },
  cadences: { en: 'Cadences', he: 'קדנצות' },
  fingers: { en: 'Finger work', he: 'עבודת אצבעות' },
  control: { en: 'Touch & control', he: 'מגע ושליטה' },
  advanced: { en: 'Advanced technique', he: 'טכניקה מתקדמת' },
  harris: { en: 'Barry Harris', he: 'בארי האריס' },
  jazz: { en: 'Jazz patterns', he: 'תבניות ג׳אז' },
  voicings: { en: 'Voicings', he: 'וויסינגים' },
  accomp: { en: 'Accompaniment', he: 'ליווי' },
  'k-sixdim': { en: 'Barry Harris harmony', he: 'ההרמוניה של בארי האריס' },
  'k-bebop': { en: 'Bebop lines', he: 'קווי ביבופ' },
  'k-reharm': { en: 'Jazz piano harmony', he: 'הרמוניה של פסנתר ג׳אז' },
  'k-ctone': { en: 'One note, many chords', he: 'צליל אחד, הרבה אקורדים' },
  'k-mediant': { en: 'Chromatic mediants', he: 'מדיאנטות כרומטיות' },
  'k-organ': { en: 'Organ comping', he: 'ליווי באורגן' },
  'g-ctone': { en: 'One note, many chords on guitar', he: 'צליל אחד, הרבה אקורדים בגיטרה' },
  'g-color': { en: 'Colour harmony on guitar', he: 'הרמוניית צבע בגיטרה' },
  'k-theory': { en: 'Theory you play', he: 'תאוריה בביצוע' },
  'k-vocab': { en: 'Bebop vocabulary', he: 'שפת הביבופ' },
  'k-indep': { en: 'Hand independence', he: 'עצמאות הידיים' },
  'k-sharm': { en: 'Scale harmonization', he: 'הרמוניזציה של סולמות' },
  'g-harm': { en: 'Scale harmonization on the neck', he: 'הרמוניזציה של סולמות על הצוואר' },
  'k-phrase': { en: 'Phrases by ear', he: 'משפטים בשמיעה' },
  'k-solo': { en: 'Improvise with your vocabulary', he: 'לאלתר עם אוצר המילים' },
  'k-ctx': { en: 'Jazz in context', he: 'ג׳אז בהקשר' },
  'k-harrisline': { en: 'Barry Harris lines', he: 'הקווים של בארי האריס' },
  'g-harrisline': { en: 'Barry Harris lines on guitar', he: 'הקווים של בארי האריס בגיטרה' },
  'g-speed': { en: 'Speed technique', he: 'טכניקת מהירות' },
  'g-fusion': { en: 'Fusion and outside', he: 'פיוז׳ן ובחוץ' },
  'g-cmarr': { en: 'Chord-melody arranging', he: 'עיבוד אקורד-מלודיה' },
  'g-solojazz': { en: 'Solo jazz guitar', he: 'גיטרת ג׳אז סולו' },
  'g-hlfast': { en: 'Harris lines at tempo', he: 'קווי האריס בטמפו' },
  'g-fretting': { en: 'Fretting hand', he: 'היד הלוחצת' },
  'g-picking': { en: 'Picking', he: 'פריטה' },
  'g-legato': { en: 'Legato', he: 'לגאטו' },
  'g-scales': { en: 'Guitar scales', he: 'סולמות בגיטרה' },
  'g-arps': { en: 'Guitar arpeggios', he: 'ארפג׳ים בגיטרה' },
  'g-chords': { en: 'Chords & changes', he: 'אקורדים והחלפות' },
  'g-rhythm': { en: 'Rhythm guitar', he: 'גיטרה קצבית' },
  'g-lead': { en: 'Lead techniques', he: 'טכניקות סולו' },
  'g-fingerstyle': { en: 'Fingerstyle', he: 'פריטת אצבעות' },
  'g-flamenco': { en: 'Flamenco', he: 'פלמנקו' },
  'g-jazz': { en: 'Jazz guitar', he: 'גיטרת ג׳אז' },
  'g-reading': { en: 'Reading by position', he: 'קריאה לפי מצבים' },
  'g-impro': { en: 'Target-note improvising', he: 'אלתור בצלילי מטרה' },
  'g-bass': { en: 'Bass guitar', he: 'גיטרה בס' },
  'g-ear': { en: "The guitarist's ear", he: 'השמיעה של הגיטריסט' },
  'g-harris': { en: 'Barry Harris on guitar', he: 'בארי האריס בגיטרה' },
  'g-theory': { en: 'Theory you play on guitar', he: 'תאוריה בביצוע בגיטרה' },
  'g-bebop': { en: 'Bebop on guitar', he: 'ביבופ בגיטרה' },
  'g-phrase': { en: 'Phrases by ear on guitar', he: 'משפטים בשמיעה בגיטרה' },
  'g-solo': { en: 'Improvising on the neck', he: 'אלתור על הצוואר' },
  'g-ctx': { en: 'Jazz in context on guitar', he: 'ג׳אז בהקשר בגיטרה' },
  'g-prog': { en: 'Prog and fusion', he: 'פרוג ופיוז׳ן' },
  // AUDIT-CONTENT-THEORY R-1/R-2/R-4: rhythm & meter families.
  'k-rhythm': { en: 'Rhythm & meter', he: 'קצב ומשקל' },
  'g-meter': { en: 'Meter & cross-rhythm', he: 'משקל ופולי-ריתמוס' },
  // Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2).
  'k-vl': { en: 'Voice leading', he: 'הובלת קולות' },
  'g-vl': { en: 'Voice leading on the neck', he: 'הובלת קולות על הצוואר' },
  // AUDIT-GAPS-2: key changes and turnarounds.
  'k-keys': { en: 'Key changes', he: 'מעברי סולם' },
  'g-keys': { en: 'Key changes on the neck', he: 'מעברי סולם על הצוואר' },
  // AUDIT-DEPTH-3: heads — harmonise a melody, chord-melody, comp a head and reharmonise it.
  'k-harm': { en: 'Harmonise a melody', he: 'הרמון מנגינה' },
  'k-tune': { en: 'Tunes: comp the head', he: 'שירים: ליווי השיר' },
  // Solo jazz piano after Jeremy Siskind (SISKIND-SOLO-PIANO Part C).
  'k-lh': { en: 'Solo left hand', he: 'יד שמאל לסולו' },
  'k-tex': { en: 'Solo textures', he: 'מרקמי סולו' },
  'k-comp': { en: 'Comping vocabulary', he: 'אוצר מילים לליווי' },
  'k-impro': { en: 'Improv habits', he: 'הרגלי אלתור' },
  'g-cmel': { en: 'Chord-melody', he: 'אקורד-מלודיה' },
  'g-tune': { en: 'Tunes on the neck', he: 'שירים על הצוואר' },
  // AUDIT-6 Stage B: the first steps, graded sight-reading, riffs by grade.
  'k-first': { en: 'First steps at the piano', he: 'צעדים ראשונים בפסנתר' },
  'k-read': { en: 'Sight-reading at the piano', he: 'קריאה מהדף בפסנתר' },
  'g-first': { en: 'First steps on guitar', he: 'צעדים ראשונים בגיטרה' },
  'g-riff': { en: 'Riffs by grade', he: 'ריפים לפי כיתה' },
  // AUDIT-7 #10, #11: pop accompaniment, pedalling, the public-domain classical tier.
  'k-pop': { en: 'Pop accompaniment', he: 'ליווי פופ' },
  'k-pedal': { en: 'Pedalling', he: 'פדל' },
  'k-classic': { en: 'Classical pieces', he: 'יצירות קלאסיות' },
  // AUDIT-7 #2: the guitarist's jazz entry over the blues.
  'g-jblues': { en: 'Jazz on the blues', he: 'ג׳אז על הבלוז' },
};
// `icon` on every badge is a glyph kind of src/ui/Glyph.tsx (2026-11-12: no emoji left; the medal itself is BadgeArt).
const FAMILY_ICON: Record<BadgeFamily, string> = {
  scales: 'scales',
  arpeggios: 'arp',
  cadences: 'prog',
  fingers: 'fingers1234',
  control: 'hairpin',
  advanced: 'octave',
  harris: 'improv',
  jazz: 'target',
  voicings: 'voicing',
  accomp: 'walk',
  'k-sixdim': 'sixdim',
  'k-bebop': 'bebop',
  'k-reharm': 'reharm',
  // HARMONY-REHARM: a held note over moving chords; two triads a 3rd apart; drawbars; the same on the neck.
  'k-ctone': 'ctone',
  'k-mediant': 'mediant',
  'k-organ': 'organ',
  'g-ctone': 'gctone',
  'g-color': 'gcolor',
  'k-theory': 'tpair',
  'k-vocab': 'enclose',
  'k-indep': 'indep',
  'k-sharm': 'harmlad',
  'g-harm': 'gharmlad',
  'k-phrase': 'phrase',
  'k-solo': 'solo',
  'k-ctx': 'brothers',
  'k-harrisline': 'bhline',
  'g-harrisline': 'gbhline',
  'g-speed': 'gspeed',
  'g-fusion': 'gfusion',
  'g-cmarr': 'gcmarr',
  'g-solojazz': 'gsolojazz',
  'g-hlfast': 'ghlfast',
  'g-fretting': 'fingers1234',
  'g-picking': 'pick',
  'g-legato': 'slur',
  'g-scales': 'box',
  'g-arps': 'arp',
  'g-chords': 'chordbox',
  'g-rhythm': 'strum',
  'g-lead': 'bend',
  'g-fingerstyle': 'pima',
  'g-flamenco': 'fan',
  'g-jazz': 'prog',
  'g-reading': 'sight',
  'g-impro': 'improv',
  'g-bass': 'bass',
  // Glyph kinds of src/ui/Glyph.tsx (the same symbols as FAMILY_GLYPH on the path) — no emoji, no text marks.
  'g-ear': 'guitarear',
  'g-harris': 'sixdim',
  'g-theory': 'gtpair',
  'g-bebop': 'genclose',
  'g-phrase': 'gphrase',
  'g-solo': 'gsolo',
  'g-ctx': 'gbrothers',
  'g-prog': 'oddmeter',
  'k-rhythm': 'polylock',
  'g-meter': 'polymeter',
  'k-vl': 'voicelead',
  'g-vl': 'voicelead',
  'k-keys': 'keymove',
  'g-keys': 'gkeymove',
  'k-harm': 'harmmel',
  'k-tune': 'tunecomp',
  'k-lh': 'lhshell',
  'k-tex': 'mango',
  'k-comp': 'compvoc',
  'k-impro': 'phrasing',
  'g-cmel': 'chordmel',
  'g-tune': 'gtunecomp',
  'k-first': 'person',
  'k-read': 'kread',
  'g-first': 'gfirst',
  'g-riff': 'griff',
  'k-pop': 'kpop',
  'k-pedal': 'kpedal',
  'k-classic': 'kclassic',
  'g-jblues': 'gjblues',
};
// One title per catalogue level (piano 7; guitar as many as guitarCatalog has — tests check the counts).
const FAMILY_TITLES: Record<BadgeFamily, [string, string][]> = {
  scales: [['Five-Finger Position', 'מצב חמש אצבעות'], ['One-Octave Walker', 'הולך האוקטבה'], ['Thumb-Under Crossing', 'מעבר אגודל'], ['Two-Octave Runner', 'רץ שתי אוקטבות'], ['Contrary Motion', 'תנועה נגדית'], ['Four-Octave Scales', 'סולמות בארבע אוקטבות'], ['Scale Virtuoso', 'וירטואוז הסולמות']],
  arpeggios: [['Broken Chords', 'אקורדים שבורים'], ['Triad Arpeggios', 'ארפג׳י משולשים'], ['Inversions', 'היפוכים'], ['Arpeggio Agility', 'זריזות בארפג׳ים'], ['Flowing Arpeggios', 'ארפג׳ים זורמים'], ['Arpeggios Across the Keyboard', 'ארפג׳ים לאורך המקלדת'], ['Arpeggio Virtuoso', 'וירטואוז הארפג׳ים']],
  cadences: [['First Cadence', 'קדנצה ראשונה'], ['I-IV-V Cadences', 'קדנצות I-IV-V'], ['Smooth Chord Changes', 'מעברי אקורדים חלקים'], ['Voice-Leading Pro', 'מקצוען הובלת קולות'], ['Cadence Collector', 'אספן קדנצות'], ['All-Keys Closer', 'סוגר בכל הסולמות'], ['Cadence Virtuoso', 'וירטואוז הקדנצות']],
  fingers: [['Finger Warm-up', 'חימום אצבעות'], ['Five-Finger Patterns', 'תבניות חמש אצבעות'], ['Hanon Exercises', 'תרגילי האנון'], ['Even Trills', 'טרילים אחידים'], ['Independent Fingers', 'אצבעות עצמאיות'], ['Finger Speed', 'מהירות אצבעות'], ['Finger Virtuoso', 'וירטואוז האצבעות']],
  control: [['Soft Touch', 'מגע רך'], ['Even Hands', 'ידיים מאוזנות'], ['Clean Staccato', 'סטקטו נקי'], ['Connected Legato', 'לגאטו רציף'], ['Dynamic Range', 'טווח דינמי'], ['Voicing Balance', 'איזון הקולות'], ['Touch Virtuoso', 'וירטואוז המגע']],
  advanced: [['Octaves', 'אוקטבות'], ['Double Notes', 'צלילים כפולים'], ['Wide Leaps', 'קפיצות רחבות'], ['Polyrhythm Control', 'שליטה בפולי־ריתם'], ['Octave Passages', 'מעברי אוקטבות'], ['Double Thirds', 'טרצות כפולות'], ['Grand Virtuoso', 'הווירטואוז הגדול']],
  harris: [['Sixth-Diminished Scale', 'סולם שש־מוקטן'], ['Scale-Rule Student', 'תלמיד חוקי הסולם'], ['Bebop Walker', 'הולך ביבופ'], ['Chord-Tone Lander', 'נוחת על צלילי אקורד'], ['Harris Disciple', 'תלמיד של בארי'], ['Bebop Lines', 'קווי ביבופ'], ["Barry's Heir", 'היורש של בארי']],
  jazz: [['Shell Starter', 'מתחיל בקונכיות'], ['Guide Tones', 'צלילים מנחים'], ['Rootless Voicings', 'וויסינגים בלי שורש'], ['ii-V-I in All Keys', 'ii-V-I בכל הסולמות'], ['Lick Vocabulary', 'אוצר ליקים'], ['Playing the Changes', 'נגינה על המהלכים'], ['Jazz Virtuoso', 'וירטואוז הג׳אז']],
  voicings: [['Left-Hand Voicings', 'וויסינגים ביד שמאל'], ['Shape Holder', 'מחזיק צורות'], ['Smooth Changer', 'מחליף חלק'], ['Drop-2 Voicings', 'וויסינגים בדרופ־2'], ['Voice-Led Voicings', 'וויסינגים בהובלת קולות'], ['Color Palette', 'פלטת צבעים'], ['Voicing Virtuoso', 'וירטואוז הוויסינגים']],
  // PIANO_JAZZ: one title for each of the first seven levels.
  'k-sixdim': [['Scale-of-Chords Climber', 'מטפס סולם האקורדים'], ['Borrowed Diminished Notes', 'צלילים מושאלים מהמוקטן'], ['Oblique Mover', 'נע באלכסון'], ['Spread Builder', 'בונה הפריסות'], ['Passing-Chord Weaver', 'אורג האקורדים העוברים'], ['Minor-Sixth Mover', 'מניע המינור שש'], ['Diminished Mastery', 'שליטה במוקטן']],
  'k-bebop': [['Changes Runner', 'רץ על המהלכים'], ['Minor-Key Hunter', 'צייד המינור'], ['Altered Explorer', 'חוקר האלטרד'], ['Blues Liner', 'מותח קווי בלוז'], ['Rhythm Changes', 'ריתם צ׳יינג׳ס'], ['Standards Player', 'נגן הסטנדרטים'], ['Two-Handed Bebop', 'ביבופ בשתי ידיים']],
  // HARMONY-REHARM: one title per level.
  'k-ctone': [['Common-Tone Triads', 'משולשי הצליל המשותף'], ['Common-Tone Sevenths', 'ספטאקורדי הצליל המשותף'], ['Held-Note Drop 2', 'דרופ 2 מתחת לצליל'], ['Tension on Top', 'טנשן למעלה'], ['Common-Tone Phrase', 'משפט בצליל משותף'], ['Counter-Line Pianist', 'פסנתרן הקו הנגדי'], ['One Note, Eight Chords', 'צליל אחד, שמונה אקורדים']],
  'k-mediant': [['Third Relations', 'יחסי טרצה'], ['Minor-Third Mediants', 'מדיאנטות בטרצה קטנה'], ['Cycle of Thirds', 'מעגל הטרצות'], ['Doubly Chromatic Mediants', 'מדיאנטות כרומטיות כפולות'], ['Mediant Sevenths', 'ספטאקורדי מדיאנטה'], ['The Coltrane Link', 'החיבור לקולטריין'], ['Octatonic Cycle', 'המעגל האוקטטוני'], ['Hexatonic Voice Leader', 'מוביל הקולות ההקסטוני']],
  'k-organ': [['Organ Half Notes', 'חצאים באורגן'], ['Organ Walker', 'מהלך האורגן'], ['Inner-Voice Organist', 'אורגניסט הקול הפנימי'], ['Minor-Blues Organist', 'אורגניסט הבלוז המינורי'], ['Texture Shaper', 'מעצב המרקם'], ['Organ Balladeer', 'בלדות באורגן'], ['Held-Third Ballad', 'בלדת הטרצה הנשארת']],
  'g-ctone': [['Held Note on the Neck', 'צליל נשאר על הצוואר'], ['Drop 2 Under the Note', 'דרופ 2 מתחת לצליל על הצוואר'], ['Middle-String Common Tone', 'צליל משותף על המיתרים האמצעיים'], ['Tensions on the Neck', 'טנשנים על הצוואר'], ['Common-Tone Guitarist', 'גיטריסט הצליל המשותף']],
  'g-color': [['Borrowed iv on the Neck', 'iv שאול על הצוואר'], ['Flat Six, Flat Seven', '♭VI, ♭VII על הצוואר'], ['Mediant Guitarist', 'גיטריסט המדיאנטות'], ['Thirds Cycles on the Neck', 'מעגלי טרצות על הצוואר'], ['Mediant Drop 2', 'דרופ 2 מדיאנטי'], ['Minor Plagal Guitarist', 'גיטריסט הפלגלית המינורית'], ['Half-Diminished Two', 'ה־ii החצי מוקטן'], ['Dameron Turnaround', 'הטרנאראונד של דמרון'], ['Borrowing in Minor', 'השאלה במינור'], ['Planing Guitarist', 'גיטריסט הפליינינג'], ['Side-Slipper', 'מחליק הצידה'], ['Sus Reharmonizer', 'מהרמן הסאס']],
  'k-reharm': [['Altered Colourist', 'צבעי האלטרד'], ['Minor-Cadence Maker', 'עושה הקדנצה המינורית'], ['Ballad Voicer', 'מעצב הבלדות'], ['Reharmoniser', 'מחדש ההרמוניה'], ['Modal Comper', 'המלווה המודאלי'], ['Solo Pianist', 'פסנתרן סולו'], ['Harmony Master', 'אמן ההרמוניה']],
  // THEORY_PLAY: one title for each of the seven levels.
  'k-theory': [['Pentatonic Painter', 'צייר הפנטטוני'], ['Upper-Structure Builder', 'בונה המבנים העליונים'], ['Dominant Colourist', 'צבעי הדומיננט'], ['Triad-Pair Player', 'נגן זוגות המשולשים'], ['Line-Cliché Reharmoniser', 'מחדש בליין קלישה'], ['Hexatonic Liner', 'קווי ההקסטוניק'], ['Colours Through ii–V–I', 'צבעים לאורך ii–V–I']],
  accomp: [['Bass and Chord', 'בס ואקורד'], ['Alberti Bass', 'בס אלברטי'], ['Boogie Bass', 'בס בוגי'], ['Walking Bass', 'בס מהלך'], ['Stride Piano', 'פסנתר סטרייד'], ['Full Accompaniment', 'ליווי מלא'], ['Groove Accompaniment', 'ליווי בגרוב']],
  'g-fretting': [['Chromatic Fretting', 'פריטה כרומטית'], ['Finger Permutations', 'תמורות אצבעות'], ['Spider Exercise', 'תרגיל העכביש'], ['Chromatic Walk up the Neck', 'הליכה כרומטית לאורך הצוואר'], ['All 24 Permutations', 'כל 24 התמורות'], ['Stretches', 'מתיחות']],
  'g-picking': [['Alternate Picking', 'פריטה מתחלפת'], ['String Crossing', 'מעבר מיתרים'], ['Economy Picking', 'פריטה חסכונית'], ['String Skipping', 'דילוג מיתרים'], ['Tremolo Picking', 'פריטת טרמולו'], ['Sweep Picking', 'פריטת סוויפ'], ['Hybrid Picking', 'פריטה היברידית'], ['Sweep Seventh Chords', 'סוויפ על אקורדי ספטים'], ['Fusion Picking', 'פריטת פיוז׳ן'], ['Chicken Picker', 'צ׳יקן פיקר']],
  'g-legato': [['Hammer-ons', 'האמר־און'], ['Pull-offs', 'פול־אוף'], ['Trills', 'טרילים'], ['Pentatonic Legato', 'לגאטו פנטטוני'], ['Three-Note-per-String Legato', 'לגאטו שלושה צלילים למיתר'], ['Two-Hand Tapping', 'טאפינג בשתי ידיים'], ['Shifting Legato', 'לגאטו נודד'], ['Tapped Sequences', 'רצפי טאפינג']],
  'g-scales': [['Pentatonic Box 1', 'תיבה 1 בפנטטוני'], ['All Pentatonic Boxes', 'כל התיבות הפנטטוניות'], ['Blues Scale', 'סולם הבלוז'], ['Position Player', 'נגן המצבים'], ['CAGED Positions', 'מצבי CAGED'], ['Three Notes per String', 'שלושה צלילים למיתר'], ['Modes and Sequences', 'מודוסים ורצפים'], ['Position Connector', 'מחבר המצבים'], ['Across the Whole Neck', 'לאורך כל הצוואר'], ['Interval Sequencer', 'רצפי מרווחים'], ['Segovia Scales', 'סולמות סגוביה'], ['Interval Shapes', 'צורות מרווחים'], ['Harmonic Minor in Position', 'מינור הרמוני במצב'], ['Dorian and Mixolydian', 'דורי ומיקסולידי'], ['Lydian, Phrygian, Melodic Minor', 'לידי, פריגי, מינור מלודי']],
  'g-arps': [['Triads, Root on 6 and 5', 'משולשים משורש 6 ו־5'], ['CAGED Triads', 'משולשים ב־CAGED'], ['Inversions on String Sets', 'היפוכים על קבוצות מיתרים'], ['Seventh Arpeggios', 'ארפג׳י ספטים'], ['Arpeggios Through ii–V–I', 'ארפג׳ים דרך ii–V–I'], ['Five-Shape Sevenths', 'ספטימות בחמש צורות'], ['Upper-Structure Player', 'נגן המבנה העליון']],
  'g-chords': [['Open Chords', 'אקורדים פתוחים'], ['One-Minute Changes', 'החלפות בדקה'], ['Faster Changes', 'החלפות מהירות'], ['Power Chords', 'פאוור־קורדים'], ['Barre Chords', 'אקורדי ברה'], ['Barre Changes', 'החלפות ברה'], ['CAGED Chords', 'אקורדי CAGED']],
  'g-rhythm': [['Basic Strumming', 'פריטה בסיסית'], ['Strumming Patterns', 'תבניות פריטה'], ['Shuffle and Boom-Chick', 'שאפל ובום־צ׳יק'], ['Reggae Off-beats', 'אופ־ביט של רגאיי'], ['Sixteenth-Note Funk', 'פאנק בשש־עשריות'], ['Bossa Nova', 'בוסה נובה'], ['Metal Gallop', 'גאלופ מטאל'], ['Rock Riffs', 'ריפים של רוק'], ['Neo-Soul Rhythm', 'ריתם ניאו־סול'], ['Maqsum Strum', 'פריטת מקסום'], ['Riffs in Five Styles', 'ריפים בחמישה סגנונות']],
  'g-lead': [['Slides and Harmonics', 'סליידים והרמוניות'], ['Half-Step Bends', 'בנדים בחצי טון'], ['Whole-Step Bends', 'בנדים בטון שלם'], ['Bend and Release', 'בנד ושחרור'], ['Controlled Vibrato', 'ויברטו מבוקר'], ['Double Stops', 'דאבל סטופים בטרצות וסקסטות'], ['Blues Box Bends', 'בנדים בתיבת הבלוז'], ['Bends in Phrases', 'בנדים במשפטים'], ['Hybrid Lead', 'סולו משולב'], ['Pinch Harmonics', 'הרמוניות צביטה'], ['Wes Octaves', 'אוקטבות של ווס']],
  'g-fingerstyle': [['Thumb Bass', 'בס באגודל'], ['Arpeggio Patterns', 'תבניות ארפג׳יו'], ['Giuliani Patterns', 'תבניות ג׳וליאני'], ['Travis Picking', 'פריטת טראוויס'], ['Classical Touch', 'מגע קלאסי'], ['Tremolo p-a-m-i', 'טרמולו p-a-m-i']],
  'g-flamenco': [['Four-Stroke Rasgueado', 'ראסגאדו בארבע מכות'], ['Triplet Rasgueado', 'ראסגאדו בטריולות'], ['Picado', 'פיקאדו'], ['Alzapúa', 'אלזאפואה'], ['Compás', 'קומפאס']],
  'g-jazz': [['Shell Comper', 'מלווה בקונכיות'], ['Drop-2 Inversions', 'היפוכי דרופ 2'], ['Drop-3 ii–V–I', 'דרופ 3 ב־ii–V–I'], ['Smooth Voice-Leader', 'מוביל קולות חלק'], ['Guide-Tone Lines', 'קווי צלילים מנחים'], ['Walking Bass on Guitar', 'בס מהלך בגיטרה'], ['Harmonized Scale', 'סולם מהורמן'], ['Standards Comper', 'מלווה הסטנדרטים'], ['Voice-Leading Ear', 'אוזן הובלת הקולות'], ['Chord-Melody Arranger', 'מעבד האקורד-מלודיה'], ['Rhythm-Changes Comper', 'מלווה הריתם צ׳יינג׳ס'], ['Solo Guitarist', 'גיטריסט סולו'], ['Whole-Chart Comper', 'מלווה של צורה שלמה']],
  'g-reading': [['First-Position Reader', 'קורא במצב ראשון'], ['Six-String Reader', 'קורא שישה מיתרים'], ['Position Shifter', 'מחליף מצבים'], ['Position VII', 'מצב VII'], ['Positions IX and XII', 'מצבים IX ו־XII'], ['Chart Reader', 'קורא הצ׳ארטים'], ['Two-Position Reader', 'קורא בשני מצבים'], ['Lead-Sheet Reader', 'קורא דפי התווים']],
  'g-impro': [['Roots on Beat 1', 'יסודות על פעמה 1'], ['Thirds on Beat 1', 'טרצות על פעמה 1'], ['Chord-Tone Arpeggios', 'ארפג׳י צלילי אקורד'], ['Guide Tones Through the Form', 'צלילים מנחים לאורך הצורה'], ['Chord-Scale Player', 'נגן סולם-אקורד'], ['Motif Developer', 'מפתח המוטיבים'], ['Trading with the Band', 'חילופים עם הלהקה']],
  // GUITAR_DEEPENING (2026-11-11): one serious title per new level.
  'g-ear': [['Tonic Finder', 'מוצא הטוניקה'], ['One-Bar Echo', 'הד של תיבה'], ['Two-Bar Echo', 'הד של שתי תיבות'], ['Rhythm Reader', 'קורא המקצב'], ['Riff Catcher', 'תופס הריפים'], ['Root Hearer', 'שומע היסודות'], ['Harmonic Ear', 'אוזן הרמונית'], ['Quality Judge', 'מזהה הסוגים'], ['Key Finder', 'מוצא הסולם'], ['Transcriber', 'המתמלל'], ['Changes Hearer', 'שומע המהלכים'], ['Substitution Spotter', 'מזהה התחליפים'], ['Altered Comper', 'מלווה האלטרד']],
  // THEORY_PLAY: one title per level.
  'g-theory': [['Rootless Guitarist', 'גיטריסט בלי יסוד'], ['Quartal Comper', 'מלווה קוורטלי'], ['Giant Stepper', 'צועד הצעדים הגדולים'], ['Upper-Structure Guitarist', 'גיטריסט המבנים העליונים'], ['Triad-Pair Guitarist', 'גיטריסט זוגות המשולשים'], ['Superimposer', 'מלביש הצבעים'], ['Line-Cliché Guitarist', 'גיטריסט הליין קלישה']],
  'g-harris': [['Sixth-Diminished Guitarist', 'גיטריסט שש-מוקטן'], ['Scale-of-Chords Player', 'נגן סולם האקורדים'], ['Half-Step Ruler', 'שליט חצי הטון'], ['Three-to-Nine Player', 'נגן שלוש עד תשע'], ['Enclosure Player', 'נגן הכיתורים'], ["Barry's Guitarist", 'הגיטריסט של בארי'], ['String-Set Voicer', 'מעצב קבוצות המיתרים'], ['Pivot Player', 'נגן הפיבוט'], ['Scale-and-Pivot Liner', 'קווי סולם ופיבוט'], ['Pivot-and-Enclosure Player', 'נגן הפיבוט והכיתור'], ['Eight Expressions on the Neck', 'שמונה ביטויים על הצוואר'], ['Expressions in Lines', 'ביטויים בקווים'], ['Family Comper', 'מלווה המשפחה']],
  'g-prog': [['Odd-Meter Riffs', 'ריפים במשקל אי־זוגי'], ['Grouping Shifter', 'מחליף הקבוצות'], ['Bar-Line Lander', 'נוחת על קו התיבה'], ['Polyrhythm Player', 'נגן הפוליריתמיקה'], ['Tempo Shifter', 'מחליף הטמפו'], ['Modal Riffer', 'ריפים מודאליים'], ['Fusion Liner', 'קווי פיוז׳ן'], ['Unison Locker', 'נועל היוניסון']],
  'g-bass': [['Bass Fretting', 'אצבוע בבס'], ['Bass Scales', 'סולמות בבס'], ['Groove Anchor', 'עוגן הגרוב'], ['Chord Outliner', 'משרטט האקורדים'], ['Octaves and Slap', 'אוקטבות וסלאפ'], ['Walking Bassist', 'בסיסט מהלך']],
  // AUDIT-CONTENT-THEORY R-1/R-2/R-4: one title per level (keys 7, guitar 6).
  'k-rhythm': [['Hands in Time', 'ידיים בזמן'], ['Two Rhythms, Two Hands', 'שני מקצבים, שתי ידיים'], ['Hemiola Feel', 'תחושת המיולה'], ['Odd-Meter Vamp', 'וואמפ במשקל אי־זוגי'], ['Displaced Figure', 'הדמות המוזזת'], ['Five Against Four', 'חמש נגד ארבע'], ['New Beat', 'הפעמה החדשה']],
  'g-meter': [['Strumming in Time', 'פריטה בזמן'], ['Across the Bar Line', 'מעבר לקו התיבה'], ['Odd-Meter Riffer', 'ריפר במשקל אי־זוגי'], ['Shifted Riff', 'הריף המוזז'], ['Cross-Rhythm Player', 'נגן הפולי־ריתמוס'], ['Tempo Pivot', 'ציר הטמפו']],
  // Voice leading (AUDIT-CONTENT-THEORY §ה.2): piano 7 titles, guitar one per level.
  'k-vl': [['Nearest Inversion', 'ההיפוך הקרוב'], ['Smooth Over the Bass', 'חלק מעל הבס'], ['Seven to Three', 'משבע לשלוש'], ['Close-Position Mover', 'נע במצב צמוד'], ['Around the Cycle', 'סביב המעגל'], ['Drop-2 Leader', 'מוביל דרופ 2'], ['Voice-Leading Master', 'אמן הובלת הקולות']],
  // AUDIT-GAPS-2: bebop vocabulary — keys 7 titles, guitar one per level.
  'k-vocab': [['Swinging on 2 and 4', 'מסווינג על 2 ו-4'], ['Approach Player', 'נגן צלילי הגישה'], ['Double Chromatic', 'כרומטי כפול'], ['Encloser', 'אמן הכיתור'], ['Bebop Encloser', 'כיתור ביבופ'], ['Every Chord Tone', 'כל צליל אקורד'], ['Bebop Vocabulary', 'שפת הביבופ']],
  // AUDIT-SCALES: hand independence (8 levels), the harmonization ladder with borrowing (keys 25, guitar 13).
  'k-indep': [['Held Notes', 'צלילים מוחזקים'], ['Quiet Weak Fingers', 'אצבעות חלשות שקטות'], ['Two Voices, One Hand', 'שני קולות, יד אחת'], ['Ostinato Player', 'נגן האוסטינטו'], ['Three Against Two', 'שלוש נגד שתיים'], ['Legato and Staccato', 'לגאטו וסטקטו'], ['Balanced Hands', 'איזון בין הידיים'], ['Independent Hands', 'ידיים עצמאיות']],
  'k-sharm': [['Every Mode', 'כל מודוס'], ['Every Minor', 'כל מינור'], ['Broken Thirds', 'טרצות שבורות'], ['Thirds in Minor', 'טרצות במינור'], ['Thirds Together', 'טרצות יחד'], ['Double Thirds in Minor', 'טרצות כפולות במינור'], ['Triad Climber', 'מטפס המשולשים'], ['Minor Triads', 'משולשים במינור'], ['Block Triads', 'משולשים בבלוק'], ['Root and Triad', 'יסוד ומשולש'], ['Seventh Climber', 'מטפס הספטימות'], ['Chord and Diminished', 'אקורד ודימיניש'], ['Block Sevenths', 'ספטימות בבלוק'], ['Moving Inversions', 'היפוכים נעים'], ['Drop-2 Climber', 'מטפס דרופ 2'], ['Drop 2 in Minor', 'דרופ 2 במינור'], ['Drop-3 Climber', 'מטפס דרופ 3'], ['Drop 3 in Minor', 'דרופ 3 במינור'], ['One Voice Borrows', 'קול אחד שואל'], ['Borrowing in Every Scale', 'השאלה בכל סולם'], ['Two Voices Borrow', 'שני קולות שואלים'], ['Borrowing Far', 'השאלה רחוקה'], ['Walking Borrower', 'שואל בהליכה'], ['Drop-2 Borrower', 'שואל בדרופ 2'], ['Drop-3 Borrower', 'שואל בדרופ 3'], ['Eight Expressions', 'שמונה ביטויים'], ['The Brothers’ Scales', 'הסולמות של האחים'], ['The Minor Sixths’ Scales', 'הסולמות של המינור 6'], ['Mixing the Colours', 'ערבוב הצבעים'], ['Substitution Comping', 'ליווי בתחליפים'], ['Borrowing the Substitutes', 'השאלה בתחליפים'], ['Minor Sixth Cadence', 'קדנצת מינור 6'], ['The Elevator', 'המעלית'], ['Dominant Scales of Chords', 'סולמות אקורדים של הדומיננט'], ['Drop 2&4', 'דרופ 2 ו־4'], ['The Sixth on the Fifth', 'השישית על הקווינטה'], ['Harris Moves', 'המהלכים של האריס'], ['Three-Voice Borrower', 'שואל בשלושה קולות'], ['The Family Over a Shell', 'המשפחה מעל שלד'], ['The Minor Elevator', 'המעלית במינור'], ['The Voicing Ladder', 'סולם הקולות'], ['A Substitute on Every V', 'תחליף על כל V']],
  'g-harm': [['Every Scale in Position', 'כל סולם במצב'], ['Thirds on the Neck', 'טרצות על הצוואר'], ['Double Stops in Thirds', 'צלילים כפולים בטרצות'], ['Triads in Position', 'משולשים במצב'], ['Triads on String Sets', 'משולשים על קבוצות מיתרים'], ['Sevenths in Position', 'ספטימות במצב'], ['Drop 2 on Top Strings', 'דרופ 2 במיתרים העליונים'], ['Drop 2 Everywhere', 'דרופ 2 בכל מקום'], ['Drop-3 Guitarist', 'גיטריסט דרופ 3'], ['Borrowing on the Neck', 'השאלה על הצוואר'], ['Borrowing from Afar', 'השאלה ממרחק'], ['Borrowing Through the Changes', 'השאלה לאורך המהלך'], ['Borrowing on Every Set', 'השאלה על כל קבוצה']],
  // Barry Harris lines: one title per level (keys 32, guitar 10).
  'k-harrisline': [['Chromatic Arpeggio Descender', 'יורד הארפג׳ים הכרומטיים'], ['ABC Thirds', 'טרצות האלף־בית'], ['Dominant Eight Ways', 'הדומיננט בשמונה דרכים'], ['Important Arpeggios', 'הארפג׳ים החשובים'], ['Blues Outliner', 'משרטט הבלוז'], ["Barry's Chromatic Scale", 'הסולם הכרומטי של בארי'], ['Major Rule', 'חוק המז׳ור'], ['Upbeat Comper', 'מלווה הקצב החלש'], ['On the Ands', 'על ה"וְ"'], ['Rhythm Outliner', 'משרטט הריתם'], ['Dominant Chromatic', 'כרומטי דומיננטי'], ['Three Extra Notes', 'שלושה צלילים נוספים'], ['Flat-Seven Pivot', 'פיבוט ה־♭7'], ['Cherokee Outliner', 'משרטט צ׳רוקי'], ['Minor-Six Chromatic', 'כרומטי מינור שש'], ['Minor Rule', 'חוק המינור'], ['Five-Four-Three-Two', 'חמש־ארבע־שלוש־שתיים'], ['Tunisia Outliner', 'משרטט תוניסיה'], ['Chromatic in Two Voices', 'כרומטי בשני קולות'], ['Three to Flat Nine', 'שלוש עד ♭9'], ['Seven Down to Three', 'שבע למטה לשלוש'], ['Major Phrases', 'משפטי מז׳ור'], ['Minor Phrases', 'משפטי מינור'], ['Six in Four', 'שש בתוך ארבע'], ['Triplet Ruler', 'שליט הטריולות'], ['Line Composer', 'מלחין הקווים'], ['Lick Builder', 'בונה הליק'], ['Miscellaneous Rule', 'החוק השונה'], ['Phrases in the Outline', 'משפטים במתאר'], ['Giant Steps Outliner', 'משרטט הצעדים הגדולים'], ['ii–V–I Composer', 'מלחין ii–V–I'], ['Lines in a Tune', 'קווים בתוך שיר']],
  'g-harrisline': [['Chromatic Scale on the Neck', 'הסולם הכרומטי על הצוואר'], ['Outliner on the Neck', 'משרטט על הצוואר'], ['Important Arpeggios on the Neck', 'הארפג׳ים החשובים על הצוואר'], ['Rules from Every Degree', 'חוקים מכל דרגה'], ['Five-Four-Three-Two Guitarist', 'גיטריסט 5-4-3-2'], ['Seven Down on the Neck', 'שבע למטה על הצוואר'], ['Extra-Note Guitarist', 'גיטריסט הצלילים הנוספים'], ['Upbeat Guitarist', 'גיטריסט הקצב החלש'], ['Guitar Line Composer', 'מלחין קווים בגיטרה'], ['ABC Guitarist', 'גיטריסט ה־ABC']],
  // STAGE C (AUDIT-6): the guitar above grade 8 — one title per level.
  'g-speed': [['Sixteenth-Note Shredder', 'מפרק השש-עשריות'], ['Legato at Speed', 'לגאטו במהירות'], ['Sweep at Speed', 'סוויפ במהירות'], ['Tapping at Concert Tempo', 'טאפינג בטמפו של הופעה'], ['Skips and Tremolo at Speed', 'דילוגים וטרמולו במהירות']],
  'g-fusion': [['Fusion Legato at Tempo', 'לגאטו פיוז׳ן בטמפו'], ['Four Notes a String', 'ארבעה צלילים במיתר'], ['Half-Step Side-Slipper', 'מחליק חצי הטון'], ['Altered Triad Pair', 'זוג המשולשים האלטרד'], ['Outside over the Vamp', 'בחוץ מעל הוואמפ']],
  'g-cmarr': [['Melody over a Walking Bass', 'מנגינה מעל בס מהלך'], ['Reharmonised Chorus', 'פזמון בהרמון מחדש'], ['Intro, Chorus, Tag', 'פתיחה, פזמון, תג'], ['Two-Chorus Arranger', 'מעבד שני הפזמונים'], ['Rubato Ballad Arranger', 'מעבד בלדת הרובאטו']],
  'g-solojazz': [['Walking ii–V–I Soloist', 'סולן ii–V–I מהלך'], ['Solo Blues Guitarist', 'גיטריסט בלוז סולו'], ['Solo Rhythm Changes', 'ריתם צ׳יינג׳ס סולו'], ['Three-Voice Head', 'שיר בשלושה קולות']],
  'g-hlfast': [['Chromatic at Bebop Tempo', 'כרומטי בטמפו ביבופ'], ['Rules at Tempo', 'חוקים בטמפו'], ['Seven Down at Tempo', 'שבע למטה בטמפו'], ['Outlines at Tempo', 'מתארים בטמפו'], ['Composer at Bebop Tempo', 'מלחין בטמפו ביבופ']],
  // Phrases by ear: keys 7 titles, guitar one per level.
  'k-phrase': [['Chord-Tone Echo', 'הד צלילי האקורד'], ['Approach by Ear', 'גישה בשמיעה'], ['Enclosure by Ear', 'כיתור בשמיעה'], ['Bebop-Scale Ear', 'אוזן סולם הביבופ'], ['ii–V–I by Ear', 'ii–V–I בשמיעה'], ['Altered by Ear', 'אלטרד בשמיעה'], ['Solo Phrases by Ear', 'משפטי סולו בשמיעה']],
  'g-phrase': [['Chord-Tone Echo on the Neck', 'הד צלילי האקורד על הצוואר'], ['Approach by Ear on the Neck', 'גישה בשמיעה על הצוואר'], ['Enclosure by Ear on the Neck', 'כיתור בשמיעה על הצוואר'], ['Bebop-Scale Ear on the Neck', 'אוזן סולם הביבופ על הצוואר'], ['ii–V–I by Ear on the Neck', 'ii–V–I בשמיעה על הצוואר'], ['Altered by Ear on the Neck', 'אלטרד בשמיעה על הצוואר'], ['Solo Phrase by Ear on the Neck', 'משפט סולו בשמיעה על הצוואר'], ['A Chorus by Ear on the Neck', 'סבב בשמיעה על הצוואר']],
  'g-bebop': [['Swing Guitarist', 'גיטריסט הסווינג'], ['Approach-Note Guitarist', 'גיטריסט צלילי הגישה'], ['Guitar Encloser', 'הכיתור בגיטרה'], ['Bebop Enclosure on the Neck', 'כיתור ביבופ על הצוואר'], ['Every Chord Tone on the Neck', 'כל צליל אקורד על הצוואר'], ['Digital-Pattern Guitarist', 'גיטריסט התבניות הדיגיטליות'], ['Minor and Altered Liner', 'קווי מינור ואלטרד'], ['Blues and Turnaround Liner', 'קווי בלוז וטרנאראונד'], ['Rhythm-Changes Guitarist', 'גיטריסט ריתם צ׳יינג׳ס'], ['Triplet-Rule Guitarist', 'גיטריסט חוקי הטריולה'], ['Make-It-Minor Guitarist', 'גיטריסט ההמרה למינור'], ['Guitarist on 2 and 4', 'גיטריסט על 2 ו-4']],
  'g-vl': [['String-Set Triads', 'משולשים על סטי מיתרים'], ['Drop 2 by Step', 'דרופ 2 בצעדים'], ['Drop 3 by Step', 'דרופ 3 בצעדים']],
  // AUDIT-GAPS-2: key changes and turnarounds — piano 7 titles, guitar one per level.
  // AUDIT-DEPTH-3: improvising under rule cards and jazz in context — keys 7 titles, guitar one per level.
  'k-solo': [['Guide-Tone Soloist', 'סולן הצלילים המנחים'], ['Approach Soloist', 'סולן צלילי הגישה'], ['By the Rules', 'לפי החוקים'], ['Enclosing Soloist', 'סולן הכיתורים'], ['Pivot Soloist', 'סולן הפיבוטים'], ['Comp and Solo', 'מלווה וסולן'], ['Your Own Chorus', 'הכורוס שלכם']],
  'k-ctx': [['Four Brothers', 'ארבעת האחים'], ['Brother for the V', 'אח במקום ה־V'], ['Through the Backdoor', 'דרך הדלת האחורית'], ['Pairs and Pentatonics', 'זוגות ופנטטוניות'], ['Coltrane Sub', 'תחליף קולטריין'], ['In and Out', 'פתיחות וסיומים'], ['Ballad Player', 'נגן הבלדות']],
  'g-solo': [['Guide-Tone Guitarist', 'גיטריסט הצלילים המנחים'], ['Approach Guitarist', 'גיטריסט הגישה'], ['Rules on the Neck', 'חוקים על הצוואר'], ['Enclosing Guitarist', 'גיטריסט הכיתורים'], ['Pivot Guitarist', 'גיטריסט הפיבוטים'], ['Pairs on the Neck', 'זוגות על הצוואר'], ['Lick User', 'משתמש הליקים'], ['Rule Mixer', 'משלב הכללים'], ['Chord and Line', 'אקורד וקו'], ['Chorus Writer', 'כותב הכורוס']],
  'g-ctx': [['Brother Lines', 'קווי האחים'], ['Brother Comping', 'ליווי האחים'], ['All Four Brothers', 'כל ארבעת האחים'], ['Brothers in Forms', 'אחים בצורות'], ['Backdoor Guitarist', 'גיטריסט הדלת האחורית'], ['Triad Pairs in Context', 'זוגות משולשים בהקשר'], ['Pentatonic Superimposer', 'מניח הפנטטוניות'], ['Coltrane Changes, Guitar', 'שינויי קולטריין בגיטרה'], ['Intro Player', 'נגן הפתיחות'], ['Ending Player', 'נגן הסיומים'], ['Ballad Guitarist', 'גיטריסט הבלדות']],
  'k-keys': [['Turnaround Player', 'מנגן הטרנאראונדים'], ['Bridge Crosser', 'חוצה הגשר'], ['Key Jumper', 'קופץ הסולמות'], ['Pivot Finder', 'מוצא הציר'], ['Through the Diminished', 'דרך הדימיניש'], ['Four Doors', 'ארבע דלתות'], ['Master of Keys', 'אמן הסולמות']],
  'g-keys': [['Turnaround Comper', 'מלווה הטרנאראונדים'], ['Ladybird Player', 'נגן הלידיבירד'], ['Bridge on the Neck', 'הגשר על הצוואר'], ['Lift Up a Step', 'הרמה בצעד'], ['Two-Five Mover', 'מעביר ה־ii–V'], ['Pivot on the Strings', 'ציר על המיתרים'], ['One Diminished, Four Keys', 'דימיניש אחד, ארבעה סולמות'], ['Diminished Door', 'דלת הדימיניש'], ['Every Key by Diminished', 'כל סולם דרך דימיניש'], ['Seven-Flat-Nine', 'שבע במול תשע'], ['Tritone Mover', 'מעביר הטריטון'], ['Key-to-Key Liner', 'קווים מסולם לסולם']],
  // Solo jazz piano (Siskind): one title per level of k-lh (18), k-tex (20), k-comp (7), k-impro (5).
  'k-lh': [['Low Bass', 'בס נמוך'], ['Six Registers', 'שישה רגיסטרים'], ['Bud Powell Shells', 'השלדים של באד פאוול'], ['Third-Seventh Shuttle', 'טרצה וספטימה לסירוגין'], ['Type A Shell', 'שלד מסוג A'], ['Type B Shell', 'שלד מסוג B'], ['Rolled Bass', 'בס מתגלגל'], ['Shell Strider', 'צועד בשלדים'], ['Strong-Beat Shells', 'שלדים על החזקות'], ['Walking Tenths', 'דצימות מהלכות'], ['Head in Tenths', 'שיר בדצימות'], ['Peace Piece Pattern', 'תבנית השלווה'], ['Three-Three-Two', 'שלוש־שלוש־שתיים'], ['Anticipated Stride', 'סטרייד מקדים'], ['Three Against Four', 'שלוש נגד ארבע'], ['Left-Hand Break', 'הפסקת יד שמאל'], ['Stride Comper', 'מלווה סטרייד'], ['Evans Shuttle', 'השאטל של אוונס']],
  'k-tex': [['Melody and Bass', 'מנגינה ובס'], ['Melody over Shells', 'מנגינה מעל שלדים'], ['Melody over Bass Shells', 'מנגינה מעל שלדי בס'], ['Call and Response', 'שאלה ותשובה'], ['Melody over Shell Stride', 'מנגינה מעל סטרייד'], ['Notes Under the Melody', 'צלילים מתחת למנגינה'], ['Right-Hand Shuttle', 'שאטל ביד ימין'], ['Filled Octaves', 'אוקטבות ממולאות'], ['Drape and Line', 'עטיפה וקו'], ['Closed Position', 'מצב צמוד ללא בס'], ['Sidestep Blocks', 'בלוקים בצעד צד'], ['So What Melody', 'מנגינת סו וואט'], ['Stride Under a Tune', 'סטרייד מתחת לשיר'], ['Shared Hands', 'ידיים משותפות'], ['Stop-Start Rubato', 'רובאטו עוצר וזז'], ['Repeated Quarters', 'רבעים חוזרים'], ['Stride Ballad', 'בלדת סטרייד'], ['Inner Voices', 'קולות פנימיים'], ['Four Voices', 'ארבעה קולות'], ['Mango Juggler', 'מלהטט המנגו']],
  'k-comp': [['Beat-Three Charleston', 'צ׳רלסטון מהשלוש'], ['Lead-In Comper', 'מלווה בכניסות'], ['Basie Comper', 'מלווה בייסי'], ['Push-Off', 'דחיפה קדימה'], ['Accent Comper', 'מלווה בהדגשות'], ['Two-Bar Patterns', 'תבניות דו־תיבתיות'], ['Free Comper', 'מלווה חופשי']],
  'k-impro': [['Drone Melodist', 'מלודיסט הדרון'], ['Two and Rest', 'שתיים ומנוחה'], ['Play One, Rest One', 'אחת מנגנים, אחת נחים'], ['Dorian Drone', 'דרון דורי'], ['Play Two, Rest Two', 'שתיים מנגנים, שתיים נחים'], ['Hands in Dialogue', 'ידיים בשיחה'], ['Twos and Ones', 'שתיים ואחת']],
  // AUDIT-DEPTH-3: heads — piano 7 titles, guitar one per level.
  'k-harm': [['Melody Reader', 'קורא המנגינה'], ['Shells Under a Tune', 'שלדים מתחת לשיר'], ['Four-Way Close', 'ארבעה קולות צמודים'], ['Drop-2 Harmoniser', 'מהרמן בדרופ 2'], ['Drop-3 Harmoniser', 'מהרמן בדרופ 3'], ['Phrase by Phrase', 'משפט אחר משפט'], ['Melody Harmoniser', 'מהרמן המנגינות'], ['Shared-Hands Harmoniser', 'מהרמן בשתי ידיים']],
  'k-tune': [['Roots of the Tune', 'יסודות השיר'], ['Guide-Tone Comper', 'מלווה בצלילים מנחים'], ['Shells Through a Tune', 'שלדים לאורך שיר'], ['Rootless Comper', 'מלווה בלי יסוד'], ['Melody and Comp', 'מנגינה וליווי'], ['Head Reharmoniser', 'מהרמן השירים'], ['Coltrane Reharm', 'הרמון קולטריין']],
  'g-cmel': [['Melody in Position', 'מנגינה בפוזיציה'], ['Bass and Melody', 'בס ומנגינה'], ['Two Voices', 'שני קולות'], ['Drop 2 Under the Tune', 'דרופ 2 מתחת לשיר'], ['Passing Diminished', 'דימיניש עובר'], ['Chord-Melody Chorus', 'פזמון אקורד-מלודיה']],
  'g-tune': [['Roots on the Neck', 'יסודות על הצוואר'], ['Guide Tones on the Neck', 'צלילים מנחים על הצוואר'], ['Shells on the Neck', 'שלדים על הצוואר'], ['Rootless on the Neck', 'בלי יסוד על הצוואר'], ['Drop 2 Through a Tune', 'דרופ 2 לאורך שיר'], ['Melody and Comp on the Neck', 'מנגינה וליווי על הצוואר'], ['Tritone Reharm', 'הרמון טריטון'], ['Backdoor Reharm', 'הרמון דלת אחורית'], ['Coltrane on the Neck', 'קולטריין על הצוואר']],
  // AUDIT-6 Stage B: one title per level — k-first (11), k-read (10), g-first (8), g-riff (5).
  'k-first': [['Seated at the Keys', 'ליד הקלידים'], ['C Position', 'עמדת דו'], ['Thumb Under', 'האגודל מתחת'], ['Black-Key Groups', 'קבוצות השחורים'], ['Three Positions', 'שלוש עמדות'], ['Two Hands Together', 'שתי ידיים יחד'], ['Treble Clef Reader', 'קורא מפתח סול'], ['Bass Clef Reader', 'קורא מפתח פה'], ['First Piece', 'יצירה ראשונה'], ['Chord-Symbol Reader', 'קורא סימני אקורדים'], ['Pop Accompanist', 'מלווה פופ']],
  'k-read': [['Five-Finger Reader', 'קורא חמש אצבעות'], ['Rests and Eighths', 'הפסקות ושמיניות'], ['Shifting Hand', 'יד נודדת'], ['Held Below', 'מוחזק מתחת'], ['Moving Bass Reader', 'קורא בס נע'], ['Sharps and Flats at Sight', 'דיאזים ובמולים מהדף'], ['Minor at Sight', 'מינור מהדף'], ['Chords Below the Tune', 'אקורדים מתחת למנגינה'], ['Double-Note Reader', 'קורא צלילים כפולים'], ['Quick Study', 'לימוד מהיר'], ['Four-Voice Reader', 'קורא ארבעה קולות'], ['Ornament Reader', 'קורא קישוטים'], ['Metre Switcher', 'מחליף משקלים'], ['Lead Sheet with Hits', 'דף אקורדים עם מכות'], ['Grade 8 Quick Study', 'לימוד מהיר לכיתה 8']],
  'g-first': [['In Tune', 'מכוון'], ['Pick in Hand', 'מפרט ביד'], ['Open Strings in Time', 'מיתרים פתוחים בזמן'], ['First Notes', 'צלילים ראשונים'], ['First Chord Change', 'החלפת אקורדים ראשונה'], ['Steady Strummer', 'פורט יציב'], ['TAB Reader', 'קורא טאבים'], ['Muted-Strum Reader', 'קורא פריטות מושתקות']],
  'g-riff': [['First Riff', 'ריף ראשון'], ['Palm-Mute Riffer', 'ריפר מושתק'], ['Power Riffer', 'ריפר פאוור'], ['Slur Riffer', 'ריפר לגאטו'], ['Pedal-Point Riffer', 'ריפר צליל עוגב']],
  // AUDIT-7 #10, #11: one title per level — k-pop (6), k-pedal (3), k-classic (one per piece).
  'k-pop': [['Pop Rhythm Chords', 'אקורדים בקצב פופ'], ['Broken-Pattern Player', 'נגן תבניות שבורות'], ['Ballad Pusher', 'דוחף הבלדה'], ['Rock Keys', 'קלידי רוק'], ['Skank Keys', 'קלידי סקאנק'], ['Lead-Sheet Player', 'נגן דפי אקורדים']],
  'k-pedal': [['Legato Pedal', 'פדל לגאטו'], ['Pedal on the Harmony', 'פדל על ההרמוניה'], ['Half-Pedal Touch', 'מגע של חצי פדל']],
  'k-classic': [['Ode to Joy at the Keys', 'אודה לשמחה בקלידים'], ['Minuet in G', 'מינואט בסול'], ['Für Elise Opening', 'הפתיחה של לאליזה'], ['Prelude in C', 'פרלוד בדו']],
  // AUDIT-7 #2: one title per level of the jazz entry over the blues.
  'g-jblues': [['Blues Head', 'נושא בלוז'], ['Four to the Bar', 'ארבע לתיבה'], ['Blues Guide Tones', 'צלילים מנחים בבלוז'], ['Blues Charleston', 'צ׳רלסטון בבלוז']],
};
/** Number of level badges of a family (piano 7; guitar = its guitarCatalog levels). */
export const familyLevelCount = (f: string): number => FAMILY_TITLES[f as BadgeFamily]?.length ?? 7;
const levelTone = (lv: number): RankTier => (lv >= 7 ? 'master' : RANK_TIERS[Math.min(4, Math.floor((lv - 1) / 1.25))]);

// ---------------------------------------------------------------- licks & transcription (SPEC-LICKS-TRANSCRIPTION)
/** Lick items with a clean take: lick id + instrument → the keys (pitch classes) played clean. */
export function lickKeysClean(x: BadgeInput): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const [id, bpm] of Object.entries(x.technique?.cleanItems ?? {})) {
    if (!id.startsWith('lick:') || !(bpm > 0)) continue;
    const [, lick, inst, key] = id.split(':');
    const k = `${lick}:${inst}`;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(Number(key));
  }
  return m;
}
function lickBadges(): Badge[] {
  const licks = (x: BadgeInput) => new Set([...lickKeysClean(x).keys()].map((k) => k.split(':')[0])).size;
  const maxKeys = (x: BadgeInput) => Math.max(0, ...[...lickKeysClean(x).values()].map((s) => s.size));
  const txLevel = (x: BadgeInput) => Math.max(0, ...Object.entries(x.technique?.cleanItems ?? {}).filter(([id, b]) => id.startsWith('tx:L') && b > 0).map(([id]) => Number(id.slice(4)) || 0));
  const B = (id: string, tone: RankTier, en: string, he: string, den: string, dhe: string, group: 'licks' | 'transcribe', rule: (x: BadgeInput) => BadgeCheck): Badge => ({ id: `tech:${id}`, cat: 'technique', icon: group === 'licks' ? 'lick' : 'transcribe', group, tone, name: { en, he }, desc: { en: den, he: dhe }, rule });
  return [
    B('lick-first', 'bronze', 'First Words', 'מילים ראשונות', 'A clean take of a lick.', 'ביצוע נקי של ליק.', 'licks', (x) => count(licks(x), 1)),
    B('lick-10', 'gold', 'Vocabulary', 'אוצר מילים', 'Clean takes of 10 different licks.', 'ביצועים נקיים של 10 ליקים שונים.', 'licks', (x) => count(licks(x), 10)),
    B('lick-12keys', 'platinum', 'All Around the Cycle', 'סביב כל המעגל', 'One lick played clean in all 12 keys.', 'ליק אחד נקי בכל 12 הסולמות.', 'licks', (x) => count(maxKeys(x), 12)),
    B('tx-first', 'bronze', 'Took It Down', 'רשמתי את זה', 'Play back a transcribed phrase clean.', 'לנגן בחזרה נקי משפט שתמללתם.', 'transcribe', (x) => count(txLevel(x) > 0 ? 1 : 0, 1)),
    B('tx-bebop', 'diamond', 'Bebop Ears', 'אוזני ביבופ', 'Play back a 4-bar bebop phrase clean, by ear.', 'לנגן בחזרה נקי משפט ביבופ של 4 תיבות, בשמיעה.', 'transcribe', (x) => count(txLevel(x) >= 8 ? 1 : 0, 1)),
  ];
}

// ---------------------------------------------------------------- guitar specials (spec AI-G §12), from technique.cleanItems

/** A clean item parsed from its itemId ("g-scales:penta:9:R:m:ps2:inguitar" → family, kind, key, flags / options). */
interface CleanItem {
  family: string;
  kind: string;
  key: number;
  minor: boolean;
  op?: number;
  ps?: number;
  pb?: number;
  bpm: number;
}
function cleanItemsOf(x: BadgeInput, family: string, kinds?: string[]): CleanItem[] {
  const out: CleanItem[] = [];
  for (const [id, bpm] of Object.entries(x.technique?.cleanItems ?? {})) {
    if (!(bpm > 0)) continue;
    const [fam, kind, key, , ...rest] = id.split(':');
    if (fam !== family || (kinds && !kinds.includes(kind))) continue;
    const num = (pre: string) => {
      const t = rest.find((r) => r.startsWith(pre) && /^-?[\d.]+$/.test(r.slice(pre.length)));
      return t === undefined ? undefined : Number(t.slice(pre.length));
    };
    out.push({ family: fam, kind, key: Number(key), minor: rest.includes('m'), op: num('op'), ps: num('ps'), pb: num('pb'), bpm });
  }
  return out;
}
/** Most distinct values of `tag` reached inside one key. */
function bestInOneKey(items: CleanItem[], tag: (c: CleanItem) => string | number | undefined): number {
  const per = new Map<number, Set<string>>();
  for (const c of items) {
    const v = tag(c);
    if (v === undefined) continue;
    if (!per.has(c.key)) per.set(c.key, new Set());
    per.get(c.key)!.add(String(v));
  }
  return Math.max(0, ...[...per.values()].map((s) => s.size));
}
const RHYTHM_KINDS = ['quarters', 'eighths', 'old-faithful', 'rock8', 'shuffle', 'boom-chick', 'reggae', 'ska', 'funk16', 'bossa', 'freddie', 'gallop'];
const BASS_KINDS = ['spider', 'major', 'r58', 'arp', 'octaves', 'walking'];
/** One-minute changes: the chord changes every bar, so changes per minute = ♩ / 4. */
const changesPerMin = (x: BadgeInput) => Math.max(0, ...cleanItemsOf(x, 'g-chords', ['one-minute']).map((c) => c.bpm * (c.pb ?? 0.25)));

function guitarSpecials(): Badge[] {
  const g = (id: string, group: BadgeFamily, icon: string, tone: RankTier, en: string, he: string, den: string, dhe: string, rule: (x: BadgeInput) => BadgeCheck): Badge => ({
    id: `tech:${id}`,
    cat: 'technique',
    icon,
    group,
    tone,
    name: { en, he },
    desc: { en: den, he: dhe },
    rule,
  });
  return [
    g('g-bend-tune', 'g-lead', 'target', 'silver', 'Bend in Tune', 'בנד מדויק', 'A clean bend that lands in tune (within 15 cents).', 'כיפוף נקי שנוחת בדיוק בגובה (בטווח 15 סנט).', (x) =>
      count(cleanItemsOf(x, 'g-lead', ['bend', 'prebend']).length ? 1 : 0, 1),
    ),
    g('g-vibrato', 'g-lead', 'slur', 'gold', 'Narrow and Wide Vibrato', 'ויברטו צר ורחב', 'Clean vibrato in the groove: narrow and wide.', 'ויברטו נקי בתוך הגרוב: צר וגם רחב.', (x) =>
      count(new Set(cleanItemsOf(x, 'g-lead', ['vibrato']).map((c) => c.op ?? 0)).size, 2),
    ),
    g('g-five-boxes', 'g-scales', 'box', 'gold', 'Five Pentatonic Boxes', 'חמש התיבות הפנטטוניות', 'All 5 minor pentatonic boxes clean in one key.', 'כל 5 התיבות של הפנטטוני המינורי, נקי, באותו סולם.', (x) =>
      count(bestInOneKey(cleanItemsOf(x, 'g-scales', ['penta']).filter((c) => c.minor), (c) => c.ps), 5),
    ),
    g('g-caged', 'g-scales', 'theory', 'platinum', 'Five CAGED Positions', 'חמשת מצבי CAGED', 'The major scale in all 5 CAGED positions, clean in one key.', 'סולם מז׳ור בכל 5 מצבי CAGED, נקי, באותו סולם.', (x) =>
      count(bestInOneKey(cleanItemsOf(x, 'g-scales', ['caged']), (c) => c.ps), 5),
    ),
    g('g-changes-30', 'g-chords', 'chordbox', 'silver', '30 Changes a Minute', '30 החלפות בדקה', 'One-minute changes: 30 clean chord changes a minute.', 'החלפות בדקה: 30 החלפות אקורד נקיות בדקה.', (x) => count(Math.floor(changesPerMin(x)), 30)),
    g('g-changes-60', 'g-chords', 'tempo', 'diamond', '60 Changes a Minute', '60 החלפות בדקה', 'One-minute changes: 60 clean chord changes a minute.', 'החלפות בדקה: 60 החלפות אקורד נקיות בדקה.', (x) => count(Math.floor(changesPerMin(x)), 60)),
    g('g-barre', 'g-chords', 'chordbox', 'gold', 'Barre Chords in Six Keys', 'אקורדי ברה בשישה סולמות', 'Every barre chord (E and A shapes, major and minor) clean in 6 keys.', 'כל אקורדי הברה (צורות E ו־A, מז׳ור ומינור) נקיים ב־6 סולמות.', (x) => {
      const per = new Map<number, Set<string>>();
      for (const c of cleanItemsOf(x, 'g-chords', ['barre-check'])) {
        if (!per.has(c.key)) per.set(c.key, new Set());
        per.get(c.key)!.add(`${c.ps}${c.minor ? 'm' : ''}`);
      }
      return count([...per.values()].filter((s) => s.size >= 4).length, 6);
    }),
    g('g-jukebox', 'g-rhythm', 'strum', 'platinum', 'Every Rhythm Pattern', 'כל תבניות הריתם', `Every rhythm-guitar pattern clean, from down-up 8ths to the metal gallop (${RHYTHM_KINDS.length}).`, `כל תבניות הגיטרה הקצבית נקיות, משמיניות למטה־למעלה ועד גאלופ המטאל (${RHYTHM_KINDS.length}).`, (x) =>
      count(new Set(cleanItemsOf(x, 'g-rhythm', RHYTHM_KINDS).map((c) => c.kind)).size, RHYTHM_KINDS.length),
    ),
    g('g-bassist', 'g-bass', 'bass', 'gold', 'Every Bass Level', 'כל שלבי הבס', 'Every bass level clean in one key.', 'כל שלבי הבס נקיים באותו סולם.', (x) => count(bestInOneKey(cleanItemsOf(x, 'g-bass', BASS_KINDS), (c) => c.kind), BASS_KINDS.length)),
  ];
}


// ---------------------------------------------------------------- bass course (0.64, BASS_AUDIT B14)
/** AUDIT-6 Stage B: the bass and drum first steps' milestones by name ("First steps on bass: first steps" read twice). */
const FIRST_NAMES: Record<string, L[]> = {
  'b-first': [{ en: 'Strap On', he: 'הרצועה על הכתף' }, { en: 'Roots Found', he: 'היסודות נמצאו' }, { en: 'Ready for the Band', he: 'מוכנים ללהקה' }],
  'd-first': [{ en: 'Sticks in Hand', he: 'מקלות ביד' }, { en: 'Counting Out Loud', he: 'סופרים בקול' }, { en: 'Ready for the Kit', he: 'מוכנים למערכת' }],
  // AUDIT-7 #15: the bass riffs and the feels.
  'b-riff': [{ en: 'Bass Riffs Through Grade 3', he: 'ריפים בבס עד כיתה 3' }, { en: 'Bass Riffs Through Grade 5', he: 'ריפים בבס עד כיתה 5' }],
  'b-feel': [{ en: 'Broken-Feel Bassist', he: 'בסיסט של תחושה שבורה' }, { en: 'Ballad and Stop-Time Bassist', he: 'בסיסט של בלדה וסטופ־טיים' }],
};
// Family milestones for every b-* family (first steps, halfway, the whole family) and exam badges from the levels'
// exam / bagrut tags. Ids live under `tech:g-bass:…` so they share the drawn bass glyph.
function bassBadges(): Badge[] {
  const fams = guitarCatalog().filter((f) => f.id.startsWith('b-'));
  const out: Badge[] = [];
  for (const f of fams) {
    const n = f.levels.length;
    const tiers = Array.from(new Set([Math.min(3, n), Math.ceil(n / 2), n])).sort((a, b) => a - b);
    tiers.forEach((lv, i) => {
      const what = lv === n ? { en: 'the whole family', he: 'כל המשפחה' } : i === 0 ? { en: 'first steps', he: 'צעדים ראשונים' } : { en: 'halfway', he: 'חצי הדרך' };
      const own = FIRST_NAMES[f.id]?.[i];
      out.push({
        id: `tech:g-bass:${f.id}:${lv}`,
        cat: 'technique',
        icon: '𝄢',
        group: f.id,
        tone: lv === n ? 'platinum' : i === 0 ? 'bronze' : 'gold',
        name: own ?? { en: `${f.title.en}: ${what.en}`, he: `${f.title.he}: ${what.he}` },
        desc: { en: `${f.title.en}: reach level ${lv} of ${n}.`, he: `${f.title.he}: להגיע לשלב ${lv} מתוך ${n}.` },
        rule: (x: BadgeInput): BadgeCheck => count(x.technique?.levels?.[f.id] ?? 0, lv),
      });
    });
  }
  // Exam badges: every level tagged for the board reached.
  const tagged = new Map<string, { fam: FamilyId; level: number }[]>();
  for (const f of fams)
    for (const l of f.levels as GuitarLevelDef[]) for (const e of l.exam ?? []) tagged.set(e.board, [...(tagged.get(e.board) ?? []), { fam: f.id, level: l.level }]);
  const BOARD: Record<string, L> = { RSL: { en: 'RSL syllabus', he: 'תוכנית RSL' }, Trinity: { en: 'Trinity Rock & Pop', he: 'טריניטי רוק ופופ' }, ABRSM: { en: 'ABRSM double bass', he: 'ABRSM קונטרבס' }, Bagrut: { en: 'Bagrut, 5 units', he: 'בגרות, 5 יחידות' }, Berklee: { en: 'Berklee core', he: 'ליבת ברקלי' } };
  for (const [board, ls] of tagged)
    out.push({
      id: `tech:g-bass:exam-${board.toLowerCase()}`,
      cat: 'technique',
      icon: '𝄢',
      group: 'bass-exams',
      tone: board === 'Bagrut' || board === 'ABRSM' ? 'diamond' : 'gold',
      name: { en: `Exam ready: ${BOARD[board]?.en ?? board}`, he: `מוכנים למבחן: ${BOARD[board]?.he ?? board}` },
      desc: { en: `Every bass level that covers the ${BOARD[board]?.en ?? board} requirements reached (${ls.length}).`, he: `כל שלבי הבס שמכסים את דרישות ${BOARD[board]?.he ?? board} הושגו (${ls.length}).` },
      rule: (x: BadgeInput): BadgeCheck => count(ls.filter((t) => (x.technique?.levels?.[t.fam] ?? 0) >= t.level).length, ls.length),
    });
  // BASS_NICHE_PLAN X1: the two summits of the bass path — every capstone level of the jazz / prog standard reached.
  for (const [track, sm] of Object.entries(BASS_SUMMITS)) {
    const caps = sm.levels.map((id) => ({ fam: id.replace(/-\d+$/, '') as FamilyId, level: Number(id.match(/-(\d+)$/)![1]) }));
    out.push({
      id: `tech:g-bass:summit-${track}`,
      cat: 'technique',
      icon: '𝄢',
      group: 'bass-exams',
      tone: 'diamond',
      name: { en: `Summit: ${sm.title.en}`, he: `פסגה: ${sm.title.he}` },
      desc: { en: `Every capstone level of the ${sm.title.en.toLowerCase()} reached (${caps.length}).`, he: `כל שלבי השיא של ${sm.title.he} הושגו (${caps.length}).` },
      rule: (x: BadgeInput): BadgeCheck => count(caps.filter((t) => (x.technique?.levels?.[t.fam] ?? 0) >= t.level).length, caps.length),
    });
  }
  // BASS_NICHE_PLAN J6: the set list — every tier of the standards ladder reached (one step per tier).
  out.push({
    id: 'tech:g-bass:setlist',
    cat: 'technique',
    icon: '𝄢',
    group: 'bass-exams',
    tone: 'platinum',
    name: { en: SETLIST.title.en, he: SETLIST.title.he },
    desc: { en: `Every tier of the standards ladder reached (${SETLIST.levels.length}).`, he: `כל הדרגות של סולם הסטנדרטים הושגו (${SETLIST.levels.length}).` },
    rule: (x: BadgeInput): BadgeCheck => count(x.technique?.levels?.['b-std' as FamilyId] ?? 0, SETLIST.levels.length),
  });
  return out;
}

// ---------------------------------------------------------------- drums course (DRUMS_AUDIT I2)
// The same family milestones as bass for every d-* family (first steps, halfway, the whole family). Ids live under
// `tech:drums:…` so they share the drawn drum glyph; they belong to the drums course.
function drumBadges(): Badge[] {
  const out: Badge[] = [];
  for (const f of guitarCatalog().filter((x) => x.id.startsWith('d-'))) {
    const n = f.levels.length;
    const tiers = Array.from(new Set([Math.min(3, n), Math.ceil(n / 2), n])).sort((a, b) => a - b);
    tiers.forEach((lv, i) => {
      const what = lv === n ? { en: 'the whole family', he: 'כל המשפחה' } : i === 0 ? { en: 'first steps', he: 'צעדים ראשונים' } : { en: 'halfway', he: 'חצי הדרך' };
      const own = FIRST_NAMES[f.id]?.[i];
      out.push({
        id: `tech:drums:${f.id}:${lv}`,
        cat: 'technique',
        icon: '♩',
        group: f.id,
        tone: lv === n ? 'platinum' : i === 0 ? 'bronze' : 'gold',
        name: own ?? { en: `${f.title.en}: ${what.en}`, he: `${f.title.he}: ${what.he}` },
        desc: { en: `${f.title.en}: reach level ${lv} of ${n}.`, he: `${f.title.he}: להגיע לשלב ${lv} מתוך ${n}.` },
        rule: (x: BadgeInput): BadgeCheck => count(x.technique?.levels?.[f.id] ?? 0, lv),
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------- voice course (VOICE_CURRICULUM)
// Family milestones for each of the 16 voice families (first steps, halfway, the whole family) and the four stage
// milestones of §6: Song Singer → Musician Singer → Jazz Singer → Jazz Artist. Measured singing only (levels passed).
function voiceBadges(): Badge[] {
  const out: Badge[] = [];
  for (const f of VOICE_FAMILIES) {
    const n = f.refs.length;
    const tiers = Array.from(new Set([Math.min(2, n), Math.ceil(n / 2), n])).sort((a, b) => a - b);
    tiers.forEach((k, i) => {
      const what = k === n ? { en: 'the whole family', he: 'כל המשפחה' } : i === 0 ? { en: 'first steps', he: 'צעדים ראשונים' } : { en: 'halfway', he: 'חצי הדרך' };
      out.push({
        id: `tech:voice:${f.id}:${k}`,
        cat: 'technique',
        icon: 'mic',
        group: f.id,
        tone: k === n ? 'platinum' : i === 0 ? 'bronze' : 'gold',
        name: { en: `${f.title.en}: ${what.en}`, he: `${f.title.he}: ${what.he}` },
        desc: { en: `${f.title.en}: pass ${k} of its ${n} levels.`, he: `${f.title.he}: לעבור ${k} מתוך ${n} השלבים.` },
        rule: (x: BadgeInput): BadgeCheck => count(f.refs.filter((r) => x.vocalPassed?.includes(r)).length, k),
      });
    });
  }
  const MILESTONES: [string, L, L, number[], RankTier][] = [
    ['song-singer', { en: 'Song Singer', he: 'זמר שירים' }, { en: 'A whole song with the band, every phrase passed.', he: 'שיר שלם עם הלהקה, כל משפט עבר.' }, [1303], 'gold'],
    ['musician-singer', { en: 'Musician Singer', he: 'זמר מוזיקאי' }, { en: 'Eight bars alone without drifting, swing eighths, and sight-singing level 5.', he: 'שמונה תיבות לבד בלי זחילה, שמיניות בסווינג, ושירה מתווים בשלב 5.' }, [703, 1104, 405], 'platinum'],
    ['jazz-singer', { en: 'Jazz Singer', he: 'זמר ג׳אז' }, { en: 'A ballad, and scat that lands on chord tones.', he: 'בלדה, וסקאט שנוחת על צלילי אקורד.' }, [1405, 1503], 'diamond'],
    ['jazz-artist', { en: 'Jazz Artist', he: 'אמן ג׳אז' }, { en: 'Rhythm changes at tempo, chromatic approach in scat, and the Barry Harris lines.', he: 'ריתם צ׳יינג׳ס בטמפו, גישה כרומטית בסקאט, וקווי בארי האריס.' }, [1407, 1504, 307], 'master'],
  ];
  for (const [id, name, desc, refs, tone] of MILESTONES)
    out.push({ id: `tech:voice:milestone:${id}`, cat: 'technique', icon: 'mic', group: 'voice-milestones', tone, name, desc, rule: (x: BadgeInput): BadgeCheck => count(refs.filter((r) => x.vocalPassed?.includes(r)).length, refs.length) });
  return out;
}

// ---------------------------------------------------------------- the pianist's ear (PIANO_AUDIT §3)
// Its levels are call-and-response at one calm tempo, so a tempo band says nothing: the milestones count the
// different items (kind × option, 14 in all) played back clean at least once — first steps, halfway, all of them.
export const KEYS_EAR_ITEMS = 28;
function keysEarBadges(): Badge[] {
  const tiers: [number, { en: string; he: string }, Badge['tone']][] = [
    [3, { en: 'first steps', he: 'צעדים ראשונים' }, 'bronze'],
    [7, { en: 'halfway', he: 'חצי הדרך' }, 'gold'],
    [KEYS_EAR_ITEMS, { en: 'the whole family', he: 'כל המשפחה' }, 'platinum'],
  ];
  return tiers.map(([n, what, tone]) => ({
    id: `tech:k-ear:${n}`,
    cat: 'technique' as const,
    icon: '𝄞',
    group: 'k-ear',
    tone,
    name: { en: `Pianist's ear: ${what.en}`, he: `אוזן של פסנתרן: ${what.he}` },
    desc: { en: `Play back ${n} of the ${KEYS_EAR_ITEMS} ear items cleanly.`, he: `לנגן בחזרה נקי ${n} מתוך ${KEYS_EAR_ITEMS} תרגילי השמיעה.` },
    rule: (x: BadgeInput): BadgeCheck => count(keysEarClean(x.technique?.cleanItems), n),
  }));
}
/** Different k-ear items (kind × option) with a clean take: "k-ear:echo-motif:7:R:op1" → "echo-motif:1". */
export function keysEarClean(clean: Record<string, number> | undefined): number {
  const kinds = new Set<string>();
  for (const id of Object.keys(clean ?? {})) {
    const parts = id.split(':');
    if (parts[0] !== 'k-ear') continue;
    const op = parts.find((x) => /^op\d+$/.test(x)) ?? 'op0';
    kinds.add(`${parts[1]}:${op}`);
  }
  return kinds.size;
}

/** Level numbers on show per family (levels hidden until verified, verifiedContent.ts, have no badge on show). */
const SHOWN_LEVELS: Map<string, Set<number>> = new Map([...catalog(), ...guitarCatalog()].map((f) => [f.id, new Set(f.levels.map((l) => l.level))]));
const levelShown = (f: string, lv: number): boolean => !SHOWN_LEVELS.has(f) || SHOWN_LEVELS.get(f)!.has(lv);

const techniqueBadges: Badge[] = [
  ...keysEarBadges(),
  ...BADGE_FAMILIES.flatMap((f) =>
    FAMILY_TITLES[f].flatMap(([en, he], i) => {
      const lv = i + 1;
      if (!levelShown(f, lv)) return [];
      return {
        id: `tech:${f}:${lv}`,
        cat: 'technique' as const,
        icon: FAMILY_ICON[f],
        group: f,
        tone: levelTone(lv),
        name: { en, he },
        desc: { en: `${FAMILY_NAME[f].en}: reach level ${lv} of ${FAMILY_TITLES[f].length}.`, he: `${FAMILY_NAME[f].he}: להגיע לשלב ${lv} מתוך ${FAMILY_TITLES[f].length}.` },
        rule: (x: BadgeInput): BadgeCheck => count(x.technique?.levels?.[f] ?? 0, lv),
      };
    }),
  ),
  ...KEYS_FAMILIES.map((f) => ({
    id: `tech-keys:${f}`,
    cat: 'technique' as const,
    icon: 'keys',
    group: f,
    tone: 'platinum' as const,
    name: { en: `Around the Clock: ${FAMILY_NAME[f].en}`, he: `סביב השעון: ${FAMILY_NAME[f].he}` },
    desc: { en: `A clean take in all 12 keys — ${FAMILY_NAME[f].en.toLowerCase()}.`, he: `ביצוע נקי בכל 12 הסולמות — ${FAMILY_NAME[f].he}.` },
    rule: (x: BadgeInput): BadgeCheck => count(x.technique?.keysClean?.[f] ?? 0, 12),
  })),
  ...(
    [
      ['even-3', 'keys', 0.03, 'gold', 'Twin Engines', 'מנועים תאומים', 'Both hands even within 3% in a hands-together take.', 'שתי הידיים אחידות בטווח 3% בנגינה בשתי ידיים.'],
      ['even-2', 'tempo', 0.02, 'diamond', 'Swiss Watch', 'שעון שוויצרי', 'Both hands even within 2% — clockwork.', 'שתי הידיים אחידות בטווח 2% — כמו שעון.'],
    ] as const
  ).map(([id, icon, cv, tone, en, he, den, dhe]) => ({
    id: `tech:${id}`,
    cat: 'technique' as const,
    icon,
    group: 'specials',
    tone: tone as RankTier,
    name: { en, he },
    desc: { en: den, he: dhe },
    rule: (x: BadgeInput): BadgeCheck => {
      const b = x.technique?.bestEvenCv;
      if (b === null || b === undefined) return { done: false, p: 0 };
      return { done: b <= cv, p: b <= cv ? 1 : clamp01(cv / b) };
    },
  })),
  ...(
    [
      ['clean-10', 'star', 10, 'bronze', 'Clean Start', 'התחלה נקייה'],
      ['clean-100', 'star', 100, 'gold', 'Century of Clean', 'מאה נקיים'],
      ['clean-1000', 'trophy', 1000, 'master', 'Spotless Thousand', 'אלף ללא רבב'],
    ] as const
  ).map(([id, icon, n, tone, en, he]) => ({
    id: `tech:${id}`,
    cat: 'technique' as const,
    icon,
    group: 'specials',
    tone: tone as RankTier,
    name: { en, he },
    desc: { en: `${n} clean takes.`, he: `${n} ביצועים נקיים.` },
    rule: (x: BadgeInput): BadgeCheck => count(x.technique?.cleanTakes ?? 0, n),
  })),
  ...(
    [
      ['tempo-1', 'tempo', 1, 'bronze', 'First Tempo Record', 'שיא טמפו ראשון', 'Set a personal tempo record.', 'לקבוע שיא טמפו אישי.'],
      ['tempo-25', 'tempo', 25, 'gold', '25 Tempo Records', '25 שיאי טמפו', '25 personal tempo records.', '25 שיאי טמפו אישיים.'],
      ['tempo-100', 'tempo', 100, 'diamond', '100 Tempo Records', '100 שיאי טמפו', '100 personal tempo records.', '100 שיאי טמפו אישיים.'],
    ] as const
  ).map(([id, icon, n, tone, en, he, den, dhe]) => ({
    id: `tech:${id}`,
    cat: 'technique' as const,
    icon,
    group: 'specials',
    tone: tone as RankTier,
    name: { en, he },
    desc: { en: den, he: dhe },
    rule: (x: BadgeInput): BadgeCheck => count(x.technique?.tempoRecords ?? 0, n),
  })),
  ...guitarSpecials(),
  ...bassBadges(),
  ...drumBadges(),
  ...voiceBadges(),
  ...lickBadges(),
];

// ======================================================================= specials

const sp = (id: string, icon: string, tone: RankTier, en: string, he: string, den: string, dhe: string, rule: (x: BadgeInput, d: Derived) => BadgeCheck): Badge => ({
  id: `special:${id}`,
  cat: 'special',
  icon,
  tone,
  name: { en, he },
  desc: { en: den, he: dhe },
  rule: (x) => rule(x, derived(x)),
});
const rankedAreas = (x: BadgeInput, minDiv: number) => DOMAINS.filter((d) => (x.ranks?.[d.id]?.best ?? -1) >= minDiv).length;

// Game tiers (GAMES_TIERS_PLAN §5.2): clearing levels in games; per course, f and ff in three of its games.
const TIER_TONE: Record<string, RankTier> = { mf: 'silver', f: 'gold', ff: 'diamond' };
const COURSE_TIER_NAME: Record<CourseId, L> = { ear: { en: 'Ear', he: 'שמיעה' }, jazz: { en: 'Jazz', he: 'ג׳אז' }, voice: { en: 'Voice', he: 'קול' }, keys: { en: 'Piano', he: 'פסנתר' }, guitar: { en: 'Guitar', he: 'גיטרה' }, bass: { en: 'Bass', he: 'בס' }, drums: { en: 'Drums', he: 'תופים' } };
const tierBadges = (): Badge[] => [
  sp('tier-first', '◆', 'bronze', 'First Level', 'רמה ראשונה', 'Clear a level in any game.', 'לעבור רמה באחד המשחקים.', (x) => count(topCleared(x.gameTiers) ? 1 : 0, 1)),
  ...(['mf', 'f', 'ff'] as const).map((t) =>
    sp(`tier-${t}`, '◆', TIER_TONE[t], `Plays ${t}`, `מנגנים ${t}`, `Clear ${t} in any game.`, `לעבור את ${t} באחד המשחקים.`, (x) => count(tiersCleared(x.gameTiers, Object.keys(x.gameTiers ?? {}), t) ? 1 : 0, 1)),
  ),
  ...(Object.keys(COURSE_GAMES) as CourseId[]).flatMap((c) =>
    (['f', 'ff'] as const).map((t) => ({
      ...sp(`tierc:${c}:${t}`, '◆', TIER_TONE[t], `${COURSE_TIER_NAME[c].en} games at ${t}`, `משחקי ${COURSE_TIER_NAME[c].he} ב־${t}`, `Clear ${t} in 3 games of the course.`, `לעבור את ${t} ב־3 משחקים של הקורס.`, (x) => count(tiersCleared(x.gameTiers, COURSE_GAMES[c], t), 3)),
      group: c,
    })),
  ),
];

// Repertoire (SPEC-REPERTOIRE): per course, the first standard learned (never for simple tunes), five, an advanced piece.
const repBadges = (): Badge[] =>
  (Object.keys(COURSE_TIER_NAME) as CourseId[]).flatMap((c) => [
    { ...sp(`rep:${c}:first-standard`, '♪', 'silver', `${COURSE_TIER_NAME[c].en}: first standard`, `${COURSE_TIER_NAME[c].he}: הסטנדרט הראשון`, 'Learn your first standard in the repertoire (80% or better).', 'ללמוד את הסטנדרט הראשון ברפרטואר (80% ומעלה).', (x) => count(x.repertoire?.[c]?.standards ?? 0, 1)), group: c },
    { ...sp(`rep:${c}:five-standards`, '♪', 'gold', `${COURSE_TIER_NAME[c].en}: five standards`, `${COURSE_TIER_NAME[c].he}: חמישה סטנדרטים`, 'Learn five standards in the repertoire.', 'ללמוד חמישה סטנדרטים ברפרטואר.', (x) => count(x.repertoire?.[c]?.standards ?? 0, 5)), group: c },
    { ...sp(`rep:${c}:advanced`, '♪', 'diamond', `${COURSE_TIER_NAME[c].en}: advanced repertoire`, `${COURSE_TIER_NAME[c].he}: רפרטואר מתקדם`, 'Learn a piece from the Advanced tier.', 'ללמוד יצירה מהשלב המתקדם.', (x) => count(x.repertoire?.[c]?.advanced ?? 0, 1)), group: c },
  ]);

// First session (SPEC-COURSE-START): per course, the measured first win of its taste lesson.
const firstBadges = (): Badge[] =>
  (Object.keys(COURSE_TIER_NAME) as CourseId[]).map((c) => ({
    ...sp(`first:${c}`, '◆', 'bronze', `${COURSE_TIER_NAME[c].en}: first session`, `${COURSE_TIER_NAME[c].he}: שיעור ראשון`, 'Finish the first session of the course with a measured result.', 'לסיים את השיעור הראשון בקורס עם תוצאה מדודה.', (x) => count(x.firstWins?.includes(c) ? 1 : 0, 1)),
    group: c,
  }));

// Game badges (gameBadges.ts): mp, f and ff in each of the newer drum and advanced games.
const gameBadges = (): Badge[] => gameBadgeSeeds().map((g) => ({ id: g.id, cat: 'special' as const, icon: g.icon, tone: g.tone, name: g.name, desc: g.desc, group: g.group, rule: (x: BadgeInput) => g.rule(x.gameTiers) }));

// SPEC-PATH-ROLE §8 (owner 2026-11-14): mastering a unit (every step at 5★ and its checkpoint passed).
const unitMasteryBadges = (): Badge[] => [
  sp('unit-mastered', 'trophy', 'silver', 'Unit Mastered', 'יחידה נשלטת', 'Master every step of a path unit and pass its checkpoint.', 'לשלוט בכל צעדי יחידה במסלול ולעבור את נקודת הביקורת שלה.', (x) => count(x.counts?.unitsMastered ?? 0, 1)),
  sp('units-mastered-5', 'trophy', 'gold', 'Five Units Mastered', 'חמש יחידות נשלטות', 'Master five path units.', 'לשלוט בחמש יחידות במסלול.', (x) => count(x.counts?.unitsMastered ?? 0, 5)),
  sp('units-mastered-20', 'trophy', 'diamond', 'Twenty Units Mastered', 'עשרים יחידות נשלטות', 'Master twenty path units.', 'לשלוט בעשרים יחידות במסלול.', (x) => count(x.counts?.unitsMastered ?? 0, 20)),
];

const specialBadges: Badge[] = [
  ...firstBadges(),
  ...unitMasteryBadges(),
  ...tierBadges(),
  ...gameBadges(),
  ...repBadges(),
  sp('hat-trick', 'improv', 'bronze', 'Hat Trick', 'שלושער', 'Practice 3 days in a row.', 'להתאמן 3 ימים ברצף.', (_x, d) => count(d.bestStreak, 3)),
  sp('fortnight', 'fire', 'silver', 'Fortnight Fever', 'קדחת השבועיים', 'Practice 14 days in a row.', 'להתאמן 14 ימים ברצף.', (_x, d) => count(d.bestStreak, 14)),
  sp('half-century', 'target', 'gold', 'Half-Century', 'חצי מאה', 'Practice 50 days in a row.', 'להתאמן 50 ימים ברצף.', (_x, d) => count(d.bestStreak, 50)),
  sp('two-hundred', 'trophy', 'diamond', 'The 200 Club', 'מועדון המאתיים', 'Practice 200 days in a row.', 'להתאמן 200 ימים ברצף.', (_x, d) => count(d.bestStreak, 200)),
  sp('weekly-ritual', 'calendar', 'silver', 'Weekly Ritual', 'טקס שבועי', 'Finish the daily workout 7 days in a row.', 'לסיים את האימון היומי 7 ימים ברצף.', (_x, d) => count(d.workoutStreak, 7)),
  sp('iron-routine', 'fire', 'diamond', 'Iron Routine', 'שגרה מברזל', 'Finish the daily workout every day for a month (30 in a row).', 'לסיים את האימון היומי כל יום במשך חודש (30 ברצף).', (_x, d) => count(d.workoutStreak, 30)),
  sp('seven-seas', 'tune', 'gold', 'Seven Seas', 'שבעת הימים', 'Practice all 7 areas within one week.', 'להתאמן בכל 7 התחומים בתוך שבוע אחד.', (_x, d) => count(d.bestWeekAreas, 7)),
  sp('swiss-army-ears', 'person', 'silver', 'Swiss Army Ears', 'אוזני אולר שוויצרי', 'Answer by voice, buttons, singing, playing and tapping.', 'לענות בקול, בכפתורים, בשירה, בנגינה ובהקשה.', (_x, d) => count(d.inputs, 5)),
  sp('dawn-chorus', 'calendar', 'bronze', 'Dawn Chorus', 'מקהלת השחר', '50 answers between 5 and 8 in the morning.', '50 תשובות בין 5 ל־8 בבוקר.', (_x, d) => count(d.dawn, 50)),
  sp('midnight-jazz', 'calendar', 'bronze', 'Midnight Jazz Club', 'מועדון הג׳אז של חצות', '50 answers between 11 at night and 4 in the morning.', '50 תשובות בין 11 בלילה ל־4 לפנות בוקר.', (_x, d) => count(d.night, 50)),
  sp('weekend-warrior', 'calendar', 'silver', 'Weekend Warrior', 'לוחם סוף השבוע', '300 answers on weekends.', '300 תשובות בסופי שבוע.', (_x, d) => count(d.weekend, 300)),
  sp('marathon', 'fire', 'gold', 'Marathon Session', 'מרתון', '300 answers in a single day.', '300 תשובות ביום אחד.', (_x, d) => count(d.bestDayItems, 300)),
  sp('bullseye-day', 'target', 'gold', 'Bullseye Day', 'יום בול', 'A day with at least 50 answers at 95% or better.', 'יום עם 50 תשובות לפחות ב־95% דיוק ומעלה.', (_x, d) => ({ done: d.bullseye, p: d.bullseye ? 1 : 0 })),
  sp('grand-tour', 'contour', 'silver', 'Grand Tour', 'המסע הגדול', 'Hold a rank in all 7 areas.', 'להחזיק דירוג בכל 7 התחומים.', (x) => count(rankedAreas(x, 0), 7)),
  sp('renaissance', 'trophy', 'platinum', 'Renaissance Musician', 'מוזיקאי רנסנס', 'Reach Gold in all 7 areas.', 'להגיע לזהב בכל 7 התחומים.', (x) => count(rankedAreas(x, tierStart('gold')), 7)),
  sp('hall-of-fame', 'star', 'master', 'Hall of Fame', 'היכל התהילה', 'Reach Master in any area.', 'להגיע למאסטר בתחום כלשהו.', (x) => count(RANK_AREAS.filter((a) => (x.ranks?.[a]?.best ?? -1) >= tierStart('master')).length, 1)),
];

// ======================================================================= seasons (monthly area challenges)

const ss = (id: string, icon: string, tone: RankTier, en: string, he: string, den: string, dhe: string, rule: (d: Derived) => BadgeCheck): Badge => ({
  id: `season:${id}`,
  cat: 'season',
  icon,
  tone,
  name: { en, he },
  desc: { en: den, he: dhe },
  rule: (x) => rule(derived(x)),
});
const seasonBadges: Badge[] = [
  ss('first', 'calendar', 'bronze', 'First Season', 'עונה ראשונה', 'Complete a monthly area challenge.', 'להשלים אתגר תחום חודשי.', (d) => count(d.challenges.length, 1)),
  ss('three', 'calendar', 'silver', 'Three Seasons', 'שלוש עונות', 'Complete 3 monthly area challenges.', 'להשלים 3 אתגרי תחום חודשיים.', (d) => count(d.challenges.length, 3)),
  ss('vivaldi', 'calendar', 'gold', 'Vivaldi', 'ויוואלדי', 'Complete 4 monthly challenges — the Four Seasons.', 'להשלים 4 אתגרים חודשיים — ארבע העונות.', (d) => count(d.challenges.length, 4)),
  ss('full-rotation', 'calendar', 'platinum', 'Full Rotation', 'סבב מלא', 'Complete the challenge of every one of the 7 areas.', 'להשלים את האתגר של כל אחד מ־7 התחומים.', (d) => count(new Set(d.challenges.map((c) => c.area)).size, 7)),
  ss('year', 'calendar', 'diamond', 'A Year of Music', 'שנה של מוזיקה', 'Complete 12 monthly challenges.', 'להשלים 12 אתגרים חודשיים.', (d) => count(d.challenges.length, 12)),
  ss('gold-rush', 'trophy', 'gold', 'Gold Rush', 'הבהלה לזהב', 'Reach gold in a monthly challenge.', 'להגיע לזהב באתגר חודשי.', (d) => count(d.challenges.filter((c) => c.tier >= 3).length, 1)),
  ss('golden-trio', 'trophy', 'diamond', 'Golden Trio', 'שלישיית זהב', 'Reach gold in 3 monthly challenges.', 'להגיע לזהב ב־3 אתגרים חודשיים.', (d) => count(d.challenges.filter((c) => c.tier >= 3).length, 3)),
];

// ======================================================================= catalogue + API

// ---------------------------------------------------------------- courses (0.65)

const AREA_COURSE: Record<RankArea, { course: CourseId; alsoIn?: CourseId[] }> = {
  pitch: { course: 'ear' },
  time: { course: 'ear' },
  memory: { course: 'ear' },
  reading: { course: 'ear' },
  voice: { course: 'voice' },
  creative: { course: 'jazz' },
  instrument: { course: 'keys', alsoIn: ['guitar', 'bass', 'drums'] },
  technique: { course: 'keys', alsoIn: ['guitar', 'bass', 'drums'] },
};
/** Skills the Jazz course is clearly about (chords, changes, modes); exam prep is a mode of the Ear course (0.67). */
const JAZZ_SKILLS: SkillId[] = ['chords', 'cadences', 'modes', 'improv', 'transpose'];
const isBassGroup = (g: string) => g === 'g-bass' || g === 'bass-exams' || g.startsWith('b-');

/** Which course a badge belongs to: technique families → their instrument; vocal → voice; ear / theory skills → ear
 *  (also shown in Jazz where clearly theirs); streaks, days and seasons → general. Pure. */
export function badgeCourse(b: Pick<Badge, 'id' | 'cat' | 'group'>): { course: BadgeCourse; alsoIn?: CourseId[] } {
  const g = b.group ?? '';
  switch (b.cat) {
    case 'special':
      // Per-course game-tier badges belong to their course.
      if (b.id.startsWith('special:first:')) return { course: g as CourseId };
      if (b.id.startsWith('special:tierc:') || b.id.startsWith('special:rep:')) return { course: g as CourseId };
      if (b.id.startsWith('special:game:')) return gameBadgeCourse(b.id) ?? { course: 'general' };
      return { course: 'general' };
    case 'season':
      return { course: 'general' };
    case 'area':
      return AREA_COURSE[g as RankArea] ?? { course: 'general' };
    case 'skill':
    case 'sub': {
      const d = domainOfSkill(g as SkillId);
      if (d === 'voice') return { course: 'voice' };
      if (d === 'instrument') return { course: 'keys', alsoIn: ['guitar', 'bass', 'drums'] };
      if (d === 'creative') return { course: 'jazz', alsoIn: ['ear'] };
      return JAZZ_SKILLS.includes(g as SkillId) ? { course: 'ear', alsoIn: ['jazz'] } : { course: 'ear' };
    }
    case 'technique': {
      // Licks & transcription: the Jazz course's, shown in every course that plays or sings lines.
      if (g === 'licks' || g === 'transcribe') return { course: 'jazz', alsoIn: ['keys', 'guitar', 'bass', 'voice'] };
      if (g.startsWith('v-') || g === 'voice-milestones' || b.id.startsWith('tech:voice:')) return { course: 'voice' };
      if (isBassGroup(g) || b.id.startsWith('tech:g-bass')) return { course: 'bass' };
      if (g.startsWith('d-') || b.id.startsWith('tech:drums:')) return { course: 'drums' };
      if (g.startsWith('g-')) return { course: 'guitar' };
      if ((PIANO_BADGE_FAMILIES as string[]).includes(g) || g === 'k-ear' || b.id.startsWith('tech:even-')) return { course: 'keys' };
      // Clean takes, tempo records: any instrument.
      return { course: 'keys', alsoIn: ['guitar', 'bass', 'drums'] };
    }
  }
}
/** Is the badge shown in this course's achievements ('general' ones always are)? */
export const badgeInCourse = (b: Pick<Badge, 'course' | 'alsoIn'>, c: CourseId): boolean => !b.course || b.course === 'general' || b.course === c || !!b.alsoIn?.includes(c);

export const BADGES: Badge[] = [...areaBadges, ...skillBadges, ...subBadges, ...techniqueBadges, ...specialBadges, ...seasonBadges].map((b) => {
  const c = badgeCourse(b);
  return { ...b, course: c.course, ...(c.alsoIn ? { alsoIn: c.alsoIn } : {}) };
});
export const BADGE_BY_ID: Record<string, Badge> = Object.fromEntries(BADGES.map((b) => [b.id, b]));
export const badgeCounts = (): Record<BadgeCat, number> => Object.fromEntries(BADGE_CATS.map((c) => [c, BADGES.filter((b) => b.cat === c).length])) as Record<BadgeCat, number>;

export interface BadgeState {
  badge: Badge;
  check: BadgeCheck;
  /** Earned (now, or stored earlier in the log). */
  got: boolean;
  /** Earned date from the log. */
  at?: string;
}
/** Earned badges: id → ISO date first earned (progress.badges, synced: union, earliest date). */
export type BadgeLog = Record<string, string>;

export function badgeStates(x: BadgeInput, log: BadgeLog = {}): BadgeState[] {
  return BADGES.map((badge) => {
    const check = badge.rule(x);
    const at = log[badge.id];
    return { badge, check, got: check.done || !!at, ...(at ? { at } : {}) };
  });
}
/** Badges earned by this input (now). */
export const earnedBadges = (x: BadgeInput): Badge[] => BADGES.filter((b) => b.rule(x).done);
/** The locked badges closest to unlock (started, not done), best first. */
export function badgeProgress(x: BadgeInput, n = 3, log: BadgeLog = {}): BadgeState[] {
  return badgeStates(x, log)
    .filter((s) => !s.got && s.check.p > 0)
    .sort((a, b) => b.check.p - a.check.p || a.badge.id.localeCompare(b.badge.id))
    .slice(0, n);
}
/** Store newly earned badges (for the toast after the session; never during a question). */
export function earnBadges(log: BadgeLog | undefined, x: BadgeInput, at: string): { log: BadgeLog; newly: Badge[] } {
  const out: BadgeLog = { ...(log ?? {}) };
  const newly: Badge[] = [];
  for (const b of earnedBadges(x)) {
    if (out[b.id]) continue;
    out[b.id] = at;
    newly.push(b);
  }
  return { log: out, newly };
}
export function mergeBadgeLog(a: BadgeLog | undefined, b: BadgeLog | undefined): BadgeLog {
  const out: BadgeLog = { ...(a ?? {}) };
  for (const [id, at] of Object.entries(b ?? {})) if (!out[id] || at < out[id]) out[id] = at;
  return out;
}
