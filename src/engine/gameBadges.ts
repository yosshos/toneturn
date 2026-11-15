// Game badges (DRUMS_NICHE_PLAN "Not built" + the advanced games): the newer games had no badge of their own — only
// the shared tier badges (special:tier-*, special:tierc:*). Each gets three: clear mp, f and ff in that game (a tier
// is cleared when 2 of its last 3 runs met the rule, gameTiers.afterRun — measured play only). Serious titles, drawn
// art per game (BadgeArt GLYPHS 'special:game:<game>'), no emoji. Pure; badges.ts adds them to the catalogue.
//
// Ids: special:game:<game>:<tier>. group = the game's home course (badgeCourse), alsoIn = the other courses that list
// the game in courseRows.COURSE_GAMES.

import type { CourseId } from './courses';
import type { RankTier } from './ranks';
import { tierIndex, tierKey, type DynName, type GameTiers } from './gameTiers';

type L = { en: string; he: string };
type Check = { done: boolean; p: number; v?: number; goal?: number };

export interface GameBadgeDef {
  game: string;
  name: L;
  course: CourseId;
  alsoIn?: CourseId[];
  /** Titles for mp, f, ff. */
  titles: [L, L, L];
}

const l = (en: string, he: string): L => ({ en, he });

export const GAME_BADGE_GAMES: GameBadgeDef[] = [
  // Drums (DRUMS_NICHE_PLAN §3).
  { game: 'time-lock', name: l('Time Lock', 'נעילת זמן'), course: 'drums', titles: [l('Inner Clock', 'שעון פנימי'), l('Through the Silence', 'דרך השקט'), l('Time Keeper', 'שומר הזמן')] },
  { game: 'ghost-control', name: l('Ghost Control', 'שליטה ברפאים'), course: 'drums', titles: [l('Quiet Hands', 'ידיים שקטות'), l('Two Levels', 'שתי עוצמות'), l('Dynamic Control', 'שליטה בדינמיקה')] },
  { game: 'rudiment-rush', name: l('Rudiment Rush', 'מרוץ רודימנטים'), course: 'drums', titles: [l('Clean Sticking', 'סטיקינג נקי'), l('Even Hands', 'ידיים שוות'), l('Rudimental Drummer', 'מתופף רודימנטים')] },
  { game: 'groove-off', name: l('Groove-off', 'קרב גרובים'), course: 'drums', titles: [l('In the Pocket', 'בתוך הכיס'), l('Style Range', 'מנעד סגנונות'), l('Groove Authority', 'סמכות הגרוב')] },
  // Advanced games (P2 rest + P3, 0.70).
  { game: 'rush-voicing', name: l('Voicing Spy', 'מרגל הוויסינגים'), course: 'jazz', alsoIn: ['ear', 'keys', 'guitar'], titles: [l('Close and Open', 'צפוף ופתוח'), l('Shells and Rootless', 'שֶׁלים ובלי שורש'), l('Voicing Analyst', 'מנתח וויסינגים')] },
  { game: 'rush-scale', name: l('Scale & Mode Rush', 'מרוץ סולמות ומודוסים'), course: 'jazz', alsoIn: ['ear', 'voice'], titles: [l('Modal Ear', 'אוזן מודאלית'), l('Bebop Colours', 'צבעי ביבופ'), l('Melodic-Minor Modes', 'מודוסים של מינור מלודי')] },
  { game: 'rush-standard', name: l('Name That Standard', 'זהו את הסטנדרט'), course: 'jazz', alsoIn: ['ear'], titles: [l('Knows the Changes', 'מכיר את המהלכים'), l('From the Bridge', 'מהגשר'), l('Repertoire by Ear', 'רפרטואר בשמיעה')] },
  { game: 'reharm', name: l('Reharm Spotter', 'מזהה הריהרמוניזציה'), course: 'jazz', alsoIn: ['ear'], titles: [l('Hears the Change', 'שומע את השינוי'), l('Names the Substitute', 'מזהה את התחליף'), l('Reharmonisation Ear', 'אוזן של ריהרמוניזציה')] },
  { game: 'transcribe', name: l('Transcription Race', 'מרוץ תמלול'), course: 'jazz', alsoIn: ['ear', 'keys'], titles: [l('Quick Transcriber', 'מתמלל מהיר'), l('Lines by Ear', 'קווים בשמיעה'), l('Transcription Fluency', 'שטף תמלול')] },
  { game: 'bhtime', name: l('Barry Harris in Time', 'בארי האריס בזמן'), course: 'jazz', alsoIn: ['keys'], titles: [l('Sixth on Time', 'שישית בזמן'), l('Diminished in Motion', 'מוקטן בתנועה'), l('Barry Harris Fluency', 'שטף בארי האריס')] },
  { game: 'riffecho', name: l('Odd-Meter Riff Echo', 'הד ריפים במשקל עקום'), course: 'keys', alsoIn: ['guitar', 'bass'], titles: [l('Riff in Six', 'ריף בשש'), l('Riff in Seven', 'ריף בשבע'), l('Odd-Meter Fluency', 'שטף במשקלים עקומים')] },
  { game: 'polylock', name: l('Polyrhythm Lock', 'נעילת פולי־ריתם'), course: 'drums', alsoIn: ['ear', 'keys'], titles: [l('Three Against Two', 'שלוש נגד שתיים'), l('Five Against Four', 'חמש נגד ארבע'), l('Polyrhythm Independence', 'עצמאות פולי־ריתמית')] },
  // AUDIT-GAMES §4.2 new games (2026-11-15).
  { game: 'bordercontrol', name: l('Border Control', 'ביקורת גבולות'), course: 'jazz', alsoIn: ['ear'], titles: [l('Hears the Pivot', 'שומע את הציר'), l('Through the Diminished', 'דרך הדימיניש'), l('Key Centre Reader', 'קורא מרכזים טונליים')] },
  { game: 'whichbrother', name: l('Which Brother?', 'איזה אח?'), course: 'jazz', alsoIn: ['keys'], titles: [l('Knows the Family', 'מכיר את המשפחה'), l('Names the Brother', 'קורא לאח בשמו'), l('Family Pianist', 'פסנתרן המשפחה')] },
  { game: 'runcatcher', name: l('Run Catcher', 'תופסים ראן'), course: 'voice', titles: [l('Quick Turns', 'סיבובים מהירים'), l('Melisma in Time', 'מליסמה בזמן'), l('Bebop Voice', 'קול ביבופ')] },
  { game: 'compcaller', name: l('Comp Caller', 'קורא הליווי'), course: 'keys', alsoIn: ['guitar', 'jazz'], titles: [l('On the Charleston', 'על הצ׳רלסטון'), l('Switches on the Bar', 'מחליף על התיבה'), l('Comping Vocabulary', 'אוצר מילים בליווי')] },
  { game: 'elevator', name: l('Elevator', 'המעלית'), course: 'keys', alsoIn: ['guitar'], titles: [l('First Floors', 'קומות ראשונות'), l('Contrary Motion', 'תנועה נגדית'), l('Rides Every Floor', 'עולה לכל הקומות')] },
  // AUDIT-GAMES §4.2 new games.
  { game: 'guidetone', name: l('Guide-Tone Runner', 'רץ הצלילים המובילים'), course: 'jazz', alsoIn: ['keys', 'guitar', 'bass'], titles: [l('Thirds and Sevenths', 'טרצות וספטימות'), l('Through the Blues', 'דרך הבלוז'), l('Guide-Tone Fluency', 'שטף צלילים מובילים')] },
  { game: 'call5432', name: l('5-4-3-2 Call', 'קריאת 5-4-3-2'), course: 'jazz', alsoIn: ['keys', 'guitar', 'bass'], titles: [l('Knows the Numbers', 'מכיר את המספרים'), l('On the Changes', 'על המהלך'), l('Barry Harris Phrases', 'המשפטים של בארי האריס')] },
  { game: 'enclosure', name: l('Enclosure Target', 'מטרת הכיתור'), course: 'jazz', alsoIn: ['keys', 'guitar', 'bass'], titles: [l('Lands the Target', 'נוחת על המטרה'), l('Bebop Enclosures', 'כיתורי ביבופ'), l('Through the Changes', 'דרך המהלך')] },
  { game: 'crossword', name: l('Changes Crossword', 'תשבץ המהלכים'), course: 'ear', alsoIn: ['jazz'], titles: [l('Hears the Roots', 'שומע את היסודות'), l('Borrowed and Bent', 'שאולים ומוטים'), l('Changes by Ear', 'מהלכים בשמיעה')] },
  { game: 'holdnote', name: l('Hold the Note', 'להחזיק את הצליל'), course: 'jazz', alsoIn: ['ear', 'keys'], titles: [l('One Note, Many Chords', 'צליל אחד, הרבה אקורדים'), l('Tension Reader', 'קורא טנשנים'), l('Eight Ways', 'שמונה דרכים')] },
];

const TIERS: { t: DynName; tone: RankTier }[] = [
  { t: 'mp', tone: 'bronze' },
  { t: 'f', tone: 'gold' },
  { t: 'ff', tone: 'diamond' },
];

/** The tier index cleared in a game (−1 = none). */
export function gameClearedIndex(tiers: GameTiers | undefined, game: string): number {
  const c = tiers?.[tierKey(game)]?.cleared;
  return c ? tierIndex(c) : -1;
}

export interface GameBadgeSeed {
  id: string;
  icon: string;
  tone: RankTier;
  name: L;
  desc: L;
  group: CourseId;
  course: CourseId;
  alsoIn?: CourseId[];
  rule: (tiers: GameTiers | undefined) => Check;
}

/** Three badges per game (mp, f, ff). Progress: tiers cleared towards the target tier. */
export function gameBadgeSeeds(): GameBadgeSeed[] {
  return GAME_BADGE_GAMES.flatMap((g) =>
    TIERS.map(({ t, tone }, i) => {
      const want = tierIndex(t);
      const title = g.titles[i];
      return {
        id: `special:game:${g.game}:${t}`,
        icon: '◆',
        tone,
        name: title,
        desc: { en: `${g.name.en}: clear ${t}.`, he: `${g.name.he}: לעבור את ${t}.` },
        group: g.course,
        course: g.course,
        ...(g.alsoIn ? { alsoIn: g.alsoIn } : {}),
        rule: (tiers) => {
          const have = gameClearedIndex(tiers, g.game);
          const done = have >= want;
          // pp = 0 … the first measured level counts as a start.
          return { done, p: done ? 1 : Math.max(0, Math.min(1, (have + 1) / (want + 1))) };
        },
      };
    }),
  );
}

/** Home course + other courses of a game badge id (null when it is not one). */
export function gameBadgeCourse(id: string): { course: CourseId; alsoIn?: CourseId[] } | null {
  const m = /^special:game:([^:]+):/.exec(id);
  if (!m) return null;
  const g = GAME_BADGE_GAMES.find((x) => x.game === m[1]);
  return g ? { course: g.course, ...(g.alsoIn ? { alsoIn: g.alsoIn } : {}) } : null;
}
