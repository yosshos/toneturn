// Progress tab (docs/SPEC-STATS.md §3): Map · Stats · Insights · History · Awards.
// Every number follows the shared time frame (Trends.tsx). Data-viz rules as in Trends: one axis, level
// bands, tooltips, a table view, ▲/▼ never colour alone; time axes left → right in both languages,
// numbers in LTR islands.

import { useMemo, useState, type ReactNode } from 'react';
import { achievements, AWARD_CATEGORIES, closestToUnlock, tierName, type Achievement, type AchievementExtra, type AwardCategory, type ProgressStats, type TierName } from '../engine/achievements';
import type { SkillId } from '../engine/lesson';
import { band, DOMAINS, domainValue, overallRating, SKILLS, type DomainId } from '../engine/rating';
import {
  activityCalendar,
  bestSessions,
  compareBuckets,
  dueMonthReview,
  foldFromMemo,
  frameRange,
  frameSeries,
  frameTotals,
  historyRows,
  INPUT_KINDS,
  longSeries,
  monthReview,
  nokBuckets,
  percentile,
  personalRecords,
  seriesFrom,
  strongWeak,
  timeOfDayBuckets,
  trickyPairs,
  weekdayBuckets,
  type Bucket,
  type DayPart,
  type FrameTotals,
  type InputKind,
  type MonthReview,
  type SessionKind,
} from '../engine/stats';
import type { Strings } from '../i18n/strings';
import { localDay, practiceDays, type LessonResult, type Progress } from '../storage/progress';
import { fmtDay, FrameChips, FrameDelta, Spark, TrendDetail, useStatsFrame } from './Trends';

type L = { en: string; he: string };
type Lang = 'he' | 'en';
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(100 * x)}%`);
const secs = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
export function fmtDuration(ms: number, lang: Lang) {
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  const m = Math.round(ms / 60000);
  if (m < 60) return lang === 'he' ? `${m} דק׳` : `${m} min`;
  const h = Math.floor(m / 60);
  return lang === 'he' ? `${h} ש׳ ${m % 60} דק׳` : `${h} h ${m % 60} min`;
}
const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;

// ======================================================================= strings

export const SX = {
  tabs: { overview: { en: 'Overview', he: 'סקירה' }, skills: { en: 'Skills', he: 'מיומנויות' }, activity: { en: 'Activity', he: 'פעילות' }, awards: { en: 'Awards', he: 'הישגים' } } as Record<ProgressTab, L>,
  progress: { en: 'Progress', he: 'התקדמות' },
  historyTitle: { en: 'Session history', he: 'היסטוריית אימונים' },
  highlights: { en: 'Highlights', he: 'נקודות בולטות' },
  whenBest: { en: 'When you practice best', he: 'מתי אתם מתרגלים הכי טוב' },
  earnedTitle: { en: 'Earned', he: 'הושגו' },
  overall: { en: 'Overall level', he: 'רמה כללית' },
  bestEver: { en: 'best ever {r} ({d})', he: 'השיא {r} ({d})' },
  better: { en: 'Higher than {p}% of {g}', he: 'גבוה מ־{p}% מ{g}' },
  league: { en: 'your league group', he: 'קבוצת הליגה שלך' },
  friends: { en: 'your friends', he: 'החברים שלך' },
  items: { en: 'Answers', he: 'תשובות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  speed: { en: 'Median speed', he: 'מהירות חציונית' },
  time: { en: 'Practice time', he: 'זמן תרגול' },
  xp: { en: 'XP', he: 'XP' },
  days: { en: 'Days', he: 'ימים' },
  areas: { en: 'Areas', he: 'תחומים' },
  skills: { en: 'Skills', he: 'מיומנויות' },
  unmeasured: { en: 'not measured yet', he: 'עוד לא נמדד' },
  inFrame: { en: '{n} answers · {a} right', he: '{n} תשובות · {a} נכונות' },
  noData: { en: 'Not enough data yet.', he: 'עדיין אין מספיק נתונים.' },
  noDataHint: { en: 'Insights need at least 30 answers in each group and a clear difference.', he: 'תובנות צריכות לפחות 30 תשובות בכל קבוצה והבדל ברור.' },
  calendar: { en: 'Activity', he: 'פעילות' },
  calSummary: { en: '{n} practice days in the last year', he: '{n} ימי תרגול בשנה האחרונה' },
  less: { en: 'less', he: 'פחות' },
  more: { en: 'more', he: 'יותר' },
  records: { en: 'Personal records', he: 'שיאים אישיים' },
  fastPerfect: { en: 'Fastest perfect lesson', he: 'השיעור המושלם המהיר ביותר' },
  run: { en: 'Longest run of right answers', he: 'רצף התשובות הנכונות הארוך ביותר' },
  bestDay: { en: 'Best accuracy day', he: 'היום המדויק ביותר' },
  longestStreak: { en: 'Longest streak', he: 'הרצף הארוך ביותר' },
  daysN: { en: '{n} days', he: '{n} ימים' },
  inARow: { en: '{n} in a row', he: '{n} ברצף' },
  // insights
  byArea: { en: 'By area', he: 'לפי תחום' },
  byTime: { en: 'By time of day', he: 'לפי שעה ביום' },
  byWeekday: { en: 'By day of the week', he: 'לפי יום בשבוע' },
  byInput: { en: 'By input', he: 'לפי דרך תשובה' },
  strongWeak: { en: 'Strongest and weakest', he: 'החזק והחלש ביותר' },
  tricky: { en: 'Tricky pairs', he: 'זוגות מבלבלים' },
  bestSessions: { en: 'Sessions that went best', he: 'האימונים הטובים ביותר' },
  moreAcc: { en: "You're {d} points more accurate {a} than {b}.", he: 'אתם מדויקים ב־{d} נקודות יותר {a} מאשר {b}.' },
  strongest: { en: 'Strongest: {s} ({a}). Most room to grow: {w} ({b}).', he: 'הכי חזק: {s} ({a}). הכי הרבה מקום לצמוח: {w} ({b}).' },
  trickyLine: { en: '{a} heard as {g} — {n}×', he: '{a} נשמע כמו {g} — {n}×' },
  allTime: { en: 'All time (time-of-day data is not split by frame).', he: 'כל הזמן (נתוני השעות לא מחולקים לפי טווח).' },
  dayParts: { morning: { en: 'in the morning', he: 'בבוקר' }, afternoon: { en: 'in the afternoon', he: 'אחר הצהריים' }, evening: { en: 'in the evening', he: 'בערב' }, night: { en: 'at night', he: 'בלילה' } } as Record<DayPart, L>,
  dayPartsShort: { morning: { en: 'Morning', he: 'בוקר' }, afternoon: { en: 'Afternoon', he: 'צהריים' }, evening: { en: 'Evening', he: 'ערב' }, night: { en: 'Night', he: 'לילה' } } as Record<DayPart, L>,
  onDay: { en: 'on {d}', he: 'ביום {d}' },
  inputs: { voice: { en: 'Voice', he: 'קול' }, buttons: { en: 'Buttons', he: 'כפתורים' }, sing: { en: 'Singing', he: 'שירה' }, play: { en: 'Playing', he: 'נגינה' }, tap: { en: 'Tapping', he: 'הקשה' } } as Record<InputKind, L>,
  withInput: { en: 'with {x}', he: 'ב{x}' },
  // history
  allAreas: { en: 'All areas', he: 'כל התחומים' },
  allKinds: { en: 'All kinds', he: 'כל הסוגים' },
  kinds: { lesson: { en: 'Lessons', he: 'שיעורים' }, placement: { en: 'Find my level', he: 'מציאת רמה' }, puzzle: { en: 'Weekly puzzle', he: 'חידה שבועית' }, game: { en: 'Games', he: 'משחקים' }, vocal: { en: 'Vocal', he: 'קול' } } as Record<SessionKind, L>,
  dayRow: { en: '{s} sessions · {n} answers · {a}', he: '{s} אימונים · {n} תשובות · {a}' },
  empty: { en: 'Nothing in this time frame.', he: 'אין כלום בטווח הזה.' },
  area: { en: 'Area', he: 'תחום' },
  kind: { en: 'Kind', he: 'סוג' },
  // awards
  closest: { en: 'Closest to unlock', he: 'הכי קרוב לפתיחה' },
  trophyCase: { en: 'Trophy case', he: 'ארון הגביעים' },
  pin: { en: 'Pin', he: 'הצמדה' },
  unpin: { en: 'Unpin', he: 'ביטול הצמדה' },
  pinHint: { en: 'Pin up to 3 awards to your profile.', he: 'אפשר להצמיד עד 3 הישגים לפרופיל.' },
  earned: { en: 'earned {d}', he: 'הושג {d}' },
  pre038: { en: 'earned before 0.38', he: 'הושג לפני 0.38' },
  nextTier: { en: 'next: {v}', he: 'הבא: {v}' },
  share: { en: 'Share', he: 'שיתוף' },
  cats: { practice: { en: 'Practice', he: 'תרגול' }, path: { en: 'Path', he: 'מסלול' }, levels: { en: 'Levels', he: 'רמות' }, ear: { en: 'Ear', he: 'שמיעה' }, voice: { en: 'Voice', he: 'קול' }, instrument: { en: 'Instrument & sound', he: 'כלי וסאונד' }, games: { en: 'Games', he: 'משחקים' }, social: { en: 'Social', he: 'חברתי' }, memory: { en: 'Memory', he: 'זיכרון' }, learning: { en: 'Learning', he: 'למידה' } } as Record<AwardCategory, L>,
  tiers: { bronze: { en: 'Bronze', he: 'ארד' }, silver: { en: 'Silver', he: 'כסף' }, gold: { en: 'Gold', he: 'זהב' }, diamond: { en: 'Diamond', he: 'יהלום' } } as Record<TierName, L>,
  // month
  month: { en: 'Month in review', he: 'סיכום החודש' },
  monthOpen: { en: 'Your month in review is ready', he: 'סיכום החודש שלכם מוכן' },
  topArea: { en: 'Most practiced', he: 'הכי הרבה תרגול' },
  gains: { en: 'Best gains', he: 'השיפורים הגדולים' },
  newAwards: { en: 'Awards', he: 'הישגים' },
  close: { en: 'Close', he: 'סגירה' },
};

/** Award names and hints (inline strings; the old t.achievementNames cover only pre-0.38 ids). */
export const AWARD_TEXT: Record<string, { name: L; hint: L }> = {
  'first-lesson': { name: { en: 'First lesson', he: 'שיעור ראשון' }, hint: { en: 'Finish any lesson', he: 'לסיים שיעור כלשהו' } },
  'ten-lessons': { name: { en: 'Lessons', he: 'שיעורים' }, hint: { en: 'Finish {v} lessons', he: 'לסיים {v} שיעורים' } },
  days: { name: { en: 'Practice days', he: 'ימי תרגול' }, hint: { en: 'Practice on {v} different days', he: 'לתרגל ב־{v} ימים שונים' } },
  streak: { name: { en: 'Best streak', he: 'רצף שיא' }, hint: { en: 'A streak of {v} days', he: 'רצף של {v} ימים' } },
  'all-lessons': { name: { en: 'The whole path', he: 'כל המסלול' }, hint: { en: 'Finish every path lesson once', he: 'לסיים כל שיעור במסלול פעם אחת' } },
  units: { name: { en: 'Units', he: 'יחידות' }, hint: { en: 'Finish {v} units', he: 'לסיים {v} יחידות' } },
  'steps-test': { name: { en: 'Tested out', he: 'עברתי במבחן' }, hint: { en: '{v} path steps passed by test', he: '{v} צעדים במסלול שעברו במבחן' } },
  checkpoints: { name: { en: 'Three-star checkpoints', he: 'נקודות ביקורת בשלושה כוכבים' }, hint: { en: '{v} checkpoints at 3 stars', he: '{v} נקודות ביקורת בשלושה כוכבים' } },
  'area-level': { name: { en: 'Area level', he: 'רמה בתחום' }, hint: { en: 'Any area at {v}', he: 'תחום כלשהו ב־{v}' } },
  'all-areas': { name: { en: 'Every area measured', he: 'כל התחומים נמדדו' }, hint: { en: 'Measure all {v} areas', he: 'למדוד את כל {v} התחומים' } },
  overall: { name: { en: 'Overall level', he: 'רמה כללית' }, hint: { en: 'Overall level {v}', he: 'רמה כללית {v}' } },
  'perfect-lesson': { name: { en: 'Perfect lessons', he: 'שיעורים מושלמים' }, hint: { en: '{v} lessons with every answer right first time', he: '{v} שיעורים שבהם כל התשובות נכונות בניסיון הראשון' } },
  'fine-pitch': { name: { en: 'Fine pitch', he: 'גובה עדין' }, hint: { en: 'Tell pitches {v} cents apart', he: 'להבחין בגבהים בהפרש {v} סנט' } },
  'mode-ear': { name: { en: 'Mode ear', he: 'אוזן למודוסים' }, hint: { en: 'Reach {v} in Modes by ear', he: 'להגיע ל־{v} במודוסים בשמיעה' } },
  'vocal-ladder': { name: { en: 'Vocal ladder', he: 'סולם הקול' }, hint: { en: 'Pass {v} vocal levels', he: 'לעבור {v} רמות קול' } },
  'mode-singer': { name: { en: 'Mode singer', he: 'זמר המודוסים' }, hint: { en: 'Pass {v} scales & modes levels', he: 'לעבור {v} רמות סולמות ומודוסים' } },
  'octave-leap': { name: { en: 'Octave leap in tune', he: 'קפיצת אוקטבה מדויקת' }, hint: { en: 'Score 80% on the octave-leap exercise', he: '80% בתרגיל קפיצת האוקטבה' } },
  'steady-8': { name: { en: '8-second steady hold', he: 'החזקה יציבה של 8 שניות' }, hint: { en: 'Hold one note steady for 8 seconds', he: 'להחזיק צליל יציב 8 שניות' } },
  'even-vibrato': { name: { en: 'Even vibrato', he: 'ויברטו אחיד' }, hint: { en: 'A vibrato with under 10% unevenness', he: 'ויברטו עם פחות מ־10% חוסר אחידות' } },
  'range-map': { name: { en: 'Range explorer', he: 'חוקר המנעד' }, hint: { en: 'Complete the range map', he: 'להשלים את מפת המנעד' } },
  'first-tuneup': { name: { en: 'First tune-up', he: 'כיוון ראשון' }, hint: { en: 'Tune your instrument once', he: 'לכוון את הכלי פעם אחת' } },
  'tuneup-5c': { name: { en: 'Tight tuning', he: 'כיוון מדויק' }, hint: { en: 'A tune-up within {v} cents on average', he: 'כיוון בממוצע של עד {v} סנט' } },
  'fretboard-all': { name: { en: 'Whole fretboard', he: 'כל הצוואר' }, hint: { en: 'Find every note on the fretboard', he: 'למצוא כל תו על הצוואר' } },
  'eq-third': { name: { en: 'Third-octave ears', he: 'אוזן של שליש אוקטבה' }, hint: { en: 'Name EQ bands at third-octave', he: 'לזהות פסי EQ ברזולוציה של שליש אוקטבה' } },
  'flight-100': { name: { en: '100 gates', he: '100 שערים' }, hint: { en: 'Fly through {v} gates in Flight', he: 'לעבור {v} שערים בטיסה' } },
  'echo-10': { name: { en: 'Echo chain', he: 'שרשרת הד' }, hint: { en: 'An Echo Chain of {v} notes', he: 'שרשרת הד של {v} צלילים' } },
  'beat-10': { name: { en: 'Beat chain', he: 'שרשרת קצב' }, hint: { en: 'A Beat Echo of {v} beats', he: 'הד קצב של {v} פעמות' } },
  'highway-fc': { name: { en: 'Full combo', he: 'קומבו מלא' }, hint: { en: 'A Highway run without a miss', he: 'ריצת כביש בלי פספוס' } },
  'name-tune-900': { name: { en: 'Name That Tune 900', he: 'זהו את המנגינה 900' }, hint: { en: 'Score {v} in Name That Tune', he: '{v} נקודות בזהו את המנגינה' } },
  'tf-40': { name: { en: '40 in a run', he: '40 בריצה אחת' }, hint: { en: 'Score 40 in one True-or-false run', he: '40 נקודות בריצה אחת של נכון או לא' } },
  'puzzle-gold': { name: { en: 'Puzzle gold', he: 'זהב בחידה' }, hint: { en: 'Solve a weekly puzzle on the first try', he: 'לפתור חידה שבועית בניסיון הראשון' } },
  'league-ninth': { name: { en: 'The Ninth', he: 'ה־9' }, hint: { en: 'Reach the Ninth league', he: 'להגיע לליגת ה־9' } },
  'league-13': { name: { en: 'The full chord (13)', he: 'האקורד המלא (13)' }, hint: { en: 'Reach the 13 league', he: 'להגיע לליגת 13' } },
  'duels-won': { name: { en: 'Duels won', he: 'דו־קרבות שניצחתי' }, hint: { en: 'Win {v} duels', he: 'לנצח ב־{v} דו־קרבות' } },
  friends: { name: { en: 'Friends', he: 'חברים' }, hint: { en: 'Have {v} friends', he: 'להיות עם {v} חברים' } },
  'pitch-memory': { name: { en: 'Pitch memory days', he: 'ימי זיכרון גובה' }, hint: { en: 'Pitch Memory on {v} days', he: 'זיכרון גובה ב־{v} ימים' } },
  'pitch-memory-10c': { name: { en: 'Pitch from memory', he: 'גובה מהזיכרון' }, hint: { en: 'Within {v} cents from memory', he: 'עד {v} סנט מהזיכרון' } },
  'learned-10': { name: { en: 'Ten topics learned', he: 'עשרה נושאים שלמדתי' }, hint: { en: 'Hear 10 quick lessons to the end', he: 'להקשיב ל־10 שיעורים קצרים עד הסוף' } },
  'learned-all': { name: { en: 'Every quick lesson', he: 'כל השיעורים הקצרים' }, hint: { en: 'Hear every quick lesson to the end', he: 'להקשיב לכל השיעורים הקצרים עד הסוף' } },
};
export const awardName = (id: string, lang: Lang) => AWARD_TEXT[id]?.name[lang] ?? id;
export const awardHint = (a: Pick<Achievement, 'id' | 'next' | 'tiers'>, lang: Lang) => fill(AWARD_TEXT[a.id]?.hint[lang] ?? '', { v: a.next ?? a.tiers[a.tiers.length - 1] });

const TIER_GLYPH: Record<TierName, string> = { bronze: '●', silver: '◆', gold: '★', diamond: '✦' };
/** Tier badge: colour + glyph + label (S18 — never colour alone). */
export function TierBadge({ a, lang }: { a: Pick<Achievement, 'tier' | 'tiers'>; lang: Lang }) {
  const n = tierName(a);
  if (!n) return null;
  return (
    <span className={`tier-badge tier-${n}`}>
      <span aria-hidden="true">{TIER_GLYPH[n]}</span> {SX.tiers[n][lang]}
    </span>
  );
}

// ======================================================================= shared helpers

const today = () => localDay(new Date());
const P = (p: Progress) => p as ProgressStats;
function weekdayName(w: number, lang: Lang) {
  // 2026-11-01 is a Sunday.
  return new Date(2026, 10, 1 + w).toLocaleDateString(lang, { weekday: 'long' });
}
const areaLevel = (r: ReturnType<typeof foldFromMemo>, d: DomainId) => {
  const v = domainValue(r, d);
  return v ? Math.round(600 + v.v * 1000) : null;
};

// ======================================================================= ProgressTabs

/** Four tabs (owner 2026-11-07: six overlapping tabs, cut labels, the same data twice). */
export type ProgressTab = 'overview' | 'skills' | 'activity' | 'awards';
const TABS: ProgressTab[] = ['overview', 'skills', 'activity', 'awards'];
/** Old tab names (links, stored state) → their new home. */
const OLD_TAB: Record<string, ProgressTab> = { map: 'skills', stats: 'overview', insights: 'activity', history: 'activity', badges: 'awards' };
export const toTab = (x: string | null | undefined): ProgressTab | null => (x ? (TABS.includes(x as ProgressTab) ? (x as ProgressTab) : (OLD_TAB[x] ?? null)) : null);
const TAB_KEY = 'toneturn.progressTab';

export interface ProgressTabsProps {
  t: Strings;
  lang: Lang;
  progress: Progress;
  /** The Skill Map (radar, areas → skills) — shown under "Skills". */
  map?: ReactNode;
  /** Above the overall card on Overview: the area tiles, the month's challenge, the ear's chord. */
  overview?: ReactNode;
  /** Ranks + badges view (spec AG §9), mounted by the app. */
  badges?: ReactNode;
  children?: ReactNode;
  extra?: AchievementExtra;
  /** Overall levels of the league group / friends this week (percentile, S13; hidden under 5). */
  leagueLevels?: number[];
  friendLevels?: number[];
  /** Tap a kept session → its recap. */
  onOpenSession?: (sessionId: string) => void;
  /** Trophy case (Settings.trophies, ≤ 3). */
  pinned?: string[];
  onPin?: (ids: string[]) => void;
  /** Start on a tab (e.g. from a "what's new" link). */
  initial?: ProgressTab | string;
}

export function ProgressTabs(props: ProgressTabsProps) {
  const { lang } = props;
  const [tab, setTabState] = useState<ProgressTab>(() => {
    const i = toTab(props.initial as string | undefined);
    if (i) return i;
    try {
      return toTab(sessionStorage.getItem(TAB_KEY)) ?? 'overview';
    } catch {
      return 'overview';
    }
  });
  const setTab = (x: ProgressTab) => {
    setTabState(x);
    try {
      sessionStorage.setItem(TAB_KEY, x);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="progress-tabs">
      <div className="ps-seg" role="tablist" aria-label={SX.progress[lang]}>
        {TABS.map((x) => (
          <button key={x} role="tab" id={`ps-tab-${x}`} aria-selected={tab === x} aria-controls={`ps-panel-${x}`} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
            {SX.tabs[x][lang]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`ps-panel-${tab}`} aria-labelledby={`ps-tab-${tab}`} className="ps-panel">
        {tab === 'overview' && <OverviewView {...props} />}
        {tab === 'skills' && (props.map ?? props.children)}
        {tab === 'activity' && <ActivityView {...props} />}
        {tab === 'awards' && (
          <>
            {props.badges}
            <AwardsView {...props} earnedOnly />
          </>
        )}
      </div>
    </div>
  );
}

// ======================================================================= Stats

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="ps-tile">
      <small>{label}</small>
      <b>{value}</b>
      {sub && <small className="ps-sub">{sub}</small>}
    </div>
  );
}

export function TotalsTiles({ tot, lang }: { tot: FrameTotals; lang: Lang }) {
  return (
    <div className="ps-tiles">
      <Tile label={SX.items[lang]} value={<N>{tot.items}</N>} />
      <Tile label={SX.accuracy[lang]} value={<N>{pct(tot.accuracy)}</N>} />
      <Tile label={SX.speed[lang]} value={<N>{secs(tot.medianMs)}</N>} />
      <Tile label={SX.time[lang]} value={<N>{tot.hasTime ? fmtDuration(tot.ms, lang) : '—'}</N>} />
      <Tile label={SX.xp[lang]} value={<N>{tot.xp}</N>} />
      <Tile label={SX.days[lang]} value={<N>{tot.days}</N>} />
    </div>
  );
}

/** Overview: who you are now — overall level, areas and ranks, the month's challenge, your records. */
export function OverviewView(props: ProgressTabsProps) {
  const { t, lang, progress, leagueLevels, friendLevels } = props;
  const ps = P(progress);
  const events = progress.ratingEvents ?? [];
  const ratings = foldFromMemo(ps.ratingBase, events);
  const o = overallRating(ratings);
  const pl = o ? percentile(o.r, leagueLevels ?? []) : null;
  const pf = o ? percentile(o.r, friendLevels ?? []) : null;
  const peak = ps.peaks?.overall;
  return (
    <div className="ps-view">
      <section className="set-card ps-overall">
        <div className="ps-overall-head">
          <div>
            <small>{SX.overall[lang]}</small>
            <div className="ps-big">
              <N>{o ? `${o.r}${o.provisional ? '?' : ''}` : '—'}</N> {o && <span className="ps-band">{t.bands[band(o.r)]}</span>}
            </div>
          </div>
        </div>
        {peak && <p className="field-hint">{fill(SX.bestEver[lang], { r: peak.r, d: fmtDay(localDay(new Date(peak.at)), lang) })}</p>}
        {pl !== null && <p className="ps-pct">{fill(SX.better[lang], { p: pl, g: SX.league[lang] })}</p>}
        {pf !== null && <p className="ps-pct">{fill(SX.better[lang], { p: pf, g: SX.friends[lang] })}</p>}
      </section>
      {props.overview}
      <RecordsCard progress={progress} lang={lang} />
    </div>
  );
}

/** A collapsible section on Activity (closed by default except the first): no long scroll. */
function Fold({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="set-card ps-fold" open={open}>
      <summary>
        <h2>{title}</h2>
      </summary>
      {children}
    </details>
  );
}

/** Activity: how much and how well, over a chosen time frame — totals, the overall trend, the calendar, when you
 *  practise best, the highlights (best sessions + tricky answers), and the session history — each section folded. */
export function ActivityView(props: ProgressTabsProps) {
  const { t, lang, progress } = props;
  const ps = P(progress);
  const [frame] = useStatsFrame();
  const day = today();
  const events = progress.ratingEvents ?? [];
  const tot = useMemo(() => frameTotals(ps.statsDays, frame, day), [ps.statsDays, frame, day]);
  return (
    <div className="ps-view">
      <FrameChips lang={lang} />
      <section className="set-card">
        <TotalsTiles tot={tot} lang={lang} />
      </section>
      <TrendDetail t={t} events={events} skill="overall" lang={lang} base={ps.ratingBase} days={ps.statsDays} peaks={ps.peaks} chips={false} />
      <ActivityCalendar progress={progress} lang={lang} />
      <InsightsView {...props} folded />
      <Fold title={SX.historyTitle[lang]}>
        <HistoryView {...props} folded />
      </Fold>
    </div>
  );
}

export function StatsView({ t, lang, progress, leagueLevels, friendLevels }: ProgressTabsProps) {
  const ps = P(progress);
  const [frame] = useStatsFrame();
  const day = today();
  const events = progress.ratingEvents ?? [];
  const ratings = foldFromMemo(ps.ratingBase, events);
  const o = overallRating(ratings);
  const tot = useMemo(() => frameTotals(ps.statsDays, frame, day), [ps.statsDays, frame, day]);
  const overallPts = useMemo(() => longSeries(ps.statsDays, seriesFrom(ps.ratingBase, events, 'overall'), 'overall'), [ps.statsDays, ps.ratingBase, events]);
  const ofs = frameSeries(overallPts, frame, day);
  const [sel, setSel] = useState<SkillId | 'overall'>('overall');
  const skillRows = useMemo(
    () =>
      SKILLS.filter((k) => (ratings[k]?.n ?? 0) > 0).map((k) => {
        const pts = longSeries(ps.statsDays, seriesFrom(ps.ratingBase, events, k), k);
        return { k, r: ratings[k]!.r, fs: frameSeries(pts, frame, day) };
      }),
    [ratings, ps.statsDays, ps.ratingBase, events, frame, day],
  );
  const pl = o ? percentile(o.r, leagueLevels ?? []) : null;
  const pf = o ? percentile(o.r, friendLevels ?? []) : null;
  const peak = ps.peaks?.overall;
  return (
    <div className="ps-view">
      <FrameChips lang={lang} />
      <section className="set-card ps-overall">
        <div className="ps-overall-head">
          <div>
            <small>{SX.overall[lang]}</small>
            <div className="ps-big">
              <N>{o ? `${o.r}${o.provisional ? '?' : ''}` : '—'}</N> {o && <span className="ps-band">{t.bands[band(o.r)]}</span>}
            </div>
          </div>
          <FrameDelta c={ofs.change} t={t} />
        </div>
        {peak && <p className="field-hint">{fill(SX.bestEver[lang], { r: peak.r, d: fmtDay(localDay(new Date(peak.at)), lang) })}</p>}
        {pl !== null && <p className="ps-pct">{fill(SX.better[lang], { p: pl, g: SX.league[lang] })}</p>}
        {pf !== null && <p className="ps-pct">{fill(SX.better[lang], { p: pf, g: SX.friends[lang] })}</p>}
        <TotalsTiles tot={tot} lang={lang} />
      </section>

      <TrendDetail t={t} events={events} skill={sel} lang={lang} base={ps.ratingBase} days={ps.statsDays} peaks={ps.peaks} chips={false} />

      <section className="set-card">
        <h2>{SX.areas[lang]}</h2>
        <ul className="ps-areas">
          {DOMAINS.map((d) => {
            const lv = areaLevel(ratings, d.id);
            const a = tot.byArea[d.id];
            return (
              <li key={d.id} data-domain={d.id} className="ps-area">
                <span className="ps-dot" aria-hidden="true" />
                <b>{t.domainNames[d.id]}</b>
                <span className="ps-area-lv">{lv === null ? <small className="field-hint">{SX.unmeasured[lang]}</small> : <N>{lv}</N>}</span>
                <small className="field-hint">{a ? fill(SX.inFrame[lang], { n: a[0], a: pct(a[1] / a[0]) }) : '—'}</small>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="set-card">
        <h2>{SX.skills[lang]}</h2>
        <ul className="ps-skills">
          <li>
            <button className={`ps-skill ${sel === 'overall' ? 'on' : ''}`} aria-pressed={sel === 'overall'} onClick={() => setSel('overall')}>
              <span className="ps-skill-name">{SX.overall[lang]}</span>
              <span className="ps-skill-now">
                <N>{o?.r ?? '—'}</N> <FrameDelta c={ofs.change} t={t} />
              </span>
              <Spark pts={ofs.pts} />
            </button>
          </li>
          {skillRows.map(({ k, r, fs }) => {
            const a = tot.bySkill[k];
            const pk = ps.peaks?.[k];
            return (
              <li key={k}>
                <button className={`ps-skill ${sel === k ? 'on' : ''}`} aria-pressed={sel === k} onClick={() => setSel(k)}>
                  <span className="ps-skill-name">{t.skillNames[k]}</span>
                  <span className="ps-skill-now">
                    <N>{r}</N> <FrameDelta c={fs.change} t={t} />
                  </span>
                  <small className="ps-skill-facts">
                    {pk && pk.r > r ? <>{fill(SX.bestEver[lang], { r: pk.r, d: fmtDay(localDay(new Date(pk.at)), lang) })} · </> : null}
                    {a ? fill(SX.inFrame[lang], { n: a[0], a: pct(a[1] / a[0]) }) : '—'}
                  </small>
                  <Spark pts={fs.pts} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <ActivityCalendar progress={progress} lang={lang} />
      <RecordsCard progress={progress} lang={lang} />
    </div>
  );
}

// ---------------------------------------------------------------- activity calendar (S19)

export function ActivityCalendar({ progress, lang }: { progress: Progress; lang: Lang }) {
  const ps = P(progress);
  const day = today();
  const weeks = useMemo(() => activityCalendar(ps.statsDays, day, 53, practiceDays(progress)), [ps.statsDays, day, progress]);
  const cell = 11;
  const gap = 2;
  const w = weeks.length * (cell + gap);
  const h = 7 * (cell + gap);
  const active = weeks.flat().filter((c) => !c.future && c.level > 0).length;
  const months = new Map<string, { days: number; items: number }>();
  for (const c of weeks.flat()) {
    if (c.future) continue;
    const m = c.day.slice(0, 7);
    const cur = months.get(m) ?? { days: 0, items: 0 };
    if (c.level > 0) cur.days++;
    cur.items += c.items;
    months.set(m, cur);
  }
  return (
    <section className="set-card ps-cal" aria-label={SX.calendar[lang]}>
      <h2>{SX.calendar[lang]}</h2>
      <p className="field-hint">{fill(SX.calSummary[lang], { n: active })}</p>
      <div className="ps-cal-scroll" dir="ltr">
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={fill(SX.calSummary[lang], { n: active })}>
          {weeks.map((col, x) =>
            col.map((c, y) =>
              c.future ? null : (
                <rect key={c.day} x={x * (cell + gap)} y={y * (cell + gap)} width={cell} height={cell} rx={2} className={`cal-${c.level}`}>
                  <title>{`${fmtDay(c.day, lang, true)}: ${c.items}`}</title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>
      <p className="ps-cal-legend" aria-hidden="true">
        {SX.less[lang]} {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`ps-cal-sw cal-${l}`} />)} {SX.more[lang]}
      </p>
      <details className="trend-table">
        <summary>{(lang === 'he' ? 'הצגה כטבלה' : 'Show as a table')}</summary>
        <table>
          <tbody>
            {[...months.entries()].reverse().map(([m, v]) => (
              <tr key={m}>
                <td dir="ltr">{m}</td>
                <td>{fill(SX.daysN[lang], { n: v.days })}</td>
                <td dir="ltr">{v.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// ---------------------------------------------------------------- personal records (S20)

export function RecordsCard({ progress, lang }: { progress: Progress; lang: Lang }) {
  const ps = P(progress);
  const r = personalRecords(ps.records, ps.statsDays, practiceDays(progress));
  const d = (iso: string) => fmtDay(localDay(new Date(iso)), lang, true);
  const rows: [string, ReactNode, string | null][] = [
    [SX.fastPerfect[lang], r.fastPerfect ? <N>{fmtDuration(r.fastPerfect.ms, lang)}</N> : '—', r.fastPerfect ? d(r.fastPerfect.at) : null],
    [SX.run[lang], r.run ? fill(SX.inARow[lang], { n: r.run.n }) : '—', r.run ? d(r.run.at) : null],
    [SX.bestDay[lang], r.bestDay ? <N>{`${pct(r.bestDay.acc)} · ${r.bestDay.items}`}</N> : '—', r.bestDay ? fmtDay(r.bestDay.day, lang, true) : null],
    [SX.longestStreak[lang], r.streak ? fill(SX.daysN[lang], { n: r.streak.n }) : '—', r.streak ? fmtDay(r.streak.end, lang, true) : null],
  ];
  return (
    <section className="set-card ps-records">
      <h2>{SX.records[lang]}</h2>
      <dl>
        {rows.map(([k, v, when]) => (
          <div key={k} className="ps-rec">
            <dt>{k}</dt>
            <dd>
              <b>{v}</b> {when && <small className="field-hint">{when}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ======================================================================= Insights (S8, S15)

function BarRows<K extends string>({ buckets, label, lang }: { buckets: Bucket<K>[]; label: (k: K) => string; lang: Lang }) {
  const shown = buckets.filter((b) => b.n > 0);
  if (!shown.length) return <p className="field-hint">{SX.noData[lang]}</p>;
  return (
    <ul className="ps-bars">
      {shown.map((b) => {
        const a = b.ok / b.n;
        return (
          <li key={b.key}>
            <span className="ps-bar-label">{label(b.key)}</span>
            <span className="ps-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(100 * a)}%` }} />
            </span>
            <span className="ps-bar-v">
              <N>{pct(a)}</N> <small className="field-hint">({<N>{b.n}</N>})</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
function Reading({ text, lang }: { text: string | null; lang: Lang }) {
  return <p className="ps-reading">{text ?? SX.noData[lang]}</p>;
}

export function InsightsView({ t, lang, progress, folded }: ProgressTabsProps & { folded?: boolean }) {
  const ps = P(progress);
  const [frame] = useStatsFrame();
  const day = today();
  const tot = useMemo(() => frameTotals(ps.statsDays, frame, day), [ps.statsDays, frame, day]);
  const areaB = nokBuckets(tot.byArea);
  const areaC = compareBuckets(areaB);
  const tod = timeOfDayBuckets(ps.statsHours);
  const todC = compareBuckets(tod);
  const wd = weekdayBuckets(ps.statsHours);
  const wdC = compareBuckets(wd);
  const inB = INPUT_KINDS.map((k) => ({ key: k, n: tot.byInput[k]?.[0] ?? 0, ok: tot.byInput[k]?.[1] ?? 0 }));
  const inC = compareBuckets(inB);
  const sw = strongWeak(tot.bySkill);
  const r = frameRange(frame, day);
  const kept = progress.history.filter((h) => {
    const d = localDay(new Date(h.completedAt));
    return (r.start === null || d >= r.start) && d <= r.end;
  });
  const best = bestSessions(kept);
  const pairs = trickyPairs(kept);
  const more = (c: { diff: number }, a: string, b: string) => fill(SX.moreAcc[lang], { d: c.diff, a, b });
  // Each block folds on Activity (owner: no long scroll); the highlights — strongest / weakest, best sessions and
  // tricky answers — are ONE section now (they were spread over two tabs).
  const Box = ({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) =>
    folded ? (
      <Fold title={title} open={open}>
        {children}
      </Fold>
    ) : (
      <section className="set-card">
        <h2>{title}</h2>
        {children}
      </section>
    );
  return (
    <>
      <Box title={SX.highlights[lang]} open>
        <Reading lang={lang} text={sw && fill(SX.strongest[lang], { s: t.skillNames[sw.strong.key], a: pct(sw.strong.ok / sw.strong.n), w: t.skillNames[sw.weak.key], b: pct(sw.weak.ok / sw.weak.n) })} />
        {best.length > 0 && (
          <>
            <h3 className="ps-sub-h">{SX.bestSessions[lang]}</h3>
            <ul className="ps-list">
              {best.map((x, i) => (
                <li key={`${x.s.sessionId ?? ""}-${i}`}>
                  <b>{fmtDay(localDay(new Date(x.s.completedAt)), lang)}</b> · <N>{pct(x.acc)}</N> · <N>{secs(x.medianMs)}</N>
                </li>
              ))}
            </ul>
          </>
        )}
        {pairs.length > 0 && (
          <>
            <h3 className="ps-sub-h">{SX.tricky[lang]}</h3>
            <ul className="ps-list">
              {pairs.map((x, i) => (
                <li key={`${x.answer}|${x.given}|${i}`}>{fill(SX.trickyLine[lang], { a: x.answer, g: x.given, n: x.count })}</li>
              ))}
            </ul>
          </>
        )}
      </Box>
      <Box title={SX.whenBest[lang]}>
        <h3 className="ps-sub-h">{SX.byTime[lang]}</h3>
        <Reading lang={lang} text={todC && more(todC, SX.dayParts[todC.best.key][lang], SX.dayParts[todC.worst.key][lang])} />
        <BarRows buckets={tod} label={(k) => SX.dayPartsShort[k][lang]} lang={lang} />
        <h3 className="ps-sub-h">{SX.byWeekday[lang]}</h3>
        <Reading lang={lang} text={wdC && more(wdC, fill(SX.onDay[lang], { d: weekdayName(+wdC.best.key, lang) }), fill(SX.onDay[lang], { d: weekdayName(+wdC.worst.key, lang) }))} />
        <BarRows buckets={wd} label={(k) => weekdayName(+k, lang)} lang={lang} />
        {tot.hasInput && (
          <>
            <h3 className="ps-sub-h">{SX.byInput[lang]}</h3>
            <Reading lang={lang} text={inC && more(inC, fill(SX.withInput[lang], { x: SX.inputs[inC.best.key][lang] }), fill(SX.withInput[lang], { x: SX.inputs[inC.worst.key][lang] }))} />
            <BarRows buckets={inB} label={(k) => SX.inputs[k][lang]} lang={lang} />
          </>
        )}
      </Box>
      <Box title={SX.byArea[lang]}>
        <Reading lang={lang} text={areaC && more(areaC, `${lang === 'he' ? 'ב' : 'in '}${t.domainNames[areaC.best.key]}`, `${lang === 'he' ? 'ב' : 'in '}${t.domainNames[areaC.worst.key]}`)} />
        <BarRows buckets={areaB} label={(k) => t.domainNames[k]} lang={lang} />
      </Box>
    </>
  );
}

// ======================================================================= History (S17)

export function HistoryView({ t, lang, progress, onOpenSession, folded }: ProgressTabsProps & { folded?: boolean }) {
  const ps = P(progress);
  const [frame] = useStatsFrame();
  const [area, setArea] = useState<DomainId | 'all'>('all');
  const [kind, setKind] = useState<SessionKind | 'all'>('all');
  const rows = useMemo(() => historyRows<LessonResult>(progress.history, ps.statsDays, frame, today(), { area, kind }), [progress.history, ps.statsDays, frame, area, kind]);
  return (
    <div className="ps-view">
      {!folded && <FrameChips lang={lang} />}
      <div className="ps-filters">
        <label>
          <span className="sr-only">{SX.area[lang]}</span>
          <select value={area} onChange={(e) => setArea(e.target.value as DomainId | 'all')}>
            <option value="all">{SX.allAreas[lang]}</option>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {t.domainNames[d.id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{SX.kind[lang]}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as SessionKind | 'all')}>
            <option value="all">{SX.allKinds[lang]}</option>
            {(Object.keys(SX.kinds) as SessionKind[]).map((k) => (
              <option key={k} value={k}>
                {SX.kinds[k][lang]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!rows.length && <p className="field-hint">{SX.empty[lang]}</p>}
      <ul className="ps-history">
        {rows.map((r) =>
          r.type === 'session' ? (
            <li key={r.s.sessionId}>
              <button className="ps-hrow" onClick={() => onOpenSession?.(r.s.sessionId)} disabled={!onOpenSession} data-domain={r.area ?? undefined}>
                <span className="ps-dot" aria-hidden="true" />
                <span className="ps-h-main">
                  <b>{SX.kinds[r.kind][lang]}</b>
                  <small className="field-hint">
                    {fmtDay(r.day, lang)} · {r.area ? t.domainNames[r.area] : '—'}
                  </small>
                </span>
                <span className="ps-h-facts">
                  <N>{`${r.s.firstTry}/${r.s.total}`}</N> · <N>{`+${r.s.xp} XP`}</N>
                  {(r.s as LessonResult & { durationMs?: number }).durationMs ? (
                    <>
                      {' · '}
                      <N>{fmtDuration((r.s as LessonResult & { durationMs?: number }).durationMs!, lang)}</N>
                    </>
                  ) : null}
                </span>
              </button>
            </li>
          ) : (
            <li key={`d:${r.day}`} className="ps-hday">
              <b>{fmtDay(r.day, lang, true)}</b>
              <small className="field-hint">{fill(SX.dayRow[lang], { s: r.sessions, n: r.items, a: pct(r.items ? r.correct / r.items : null) })}</small>
              <N>{`+${r.xp} XP`}</N>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

// ======================================================================= Awards (§5, S18, S21, S22)

export function AwardCard({ a, lang, pinned, onTogglePin, onShare }: { a: Achievement; lang: Lang; pinned?: boolean; onTogglePin?: () => void; onShare?: () => void }) {
  const n = tierName(a);
  return (
    <li className={`aw-card ${a.got ? 'got' : ''} ${n ? `tier-${n}` : ''}`}>
      <span className="aw-icon" aria-hidden="true">
        {a.icon}
      </span>
      <span className="aw-main">
        <b>{awardName(a.id, lang)}</b>
        <TierBadge a={a} lang={lang} />
        <small className="field-hint">{awardHint(a, lang)}</small>
        {a.next !== null && (
          <span className="aw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * a.progress)} aria-label={fill(SX.nextTier[lang], { v: a.next })}>
            <span style={{ width: `${Math.round(100 * a.progress)}%` }} />
          </span>
        )}
        {a.got && <small className="field-hint">{a.pre ? SX.pre038[lang] : a.at ? fill(SX.earned[lang], { d: fmtDay(localDay(new Date(a.at)), lang, true) }) : ''}</small>}
      </span>
      {a.got && (onTogglePin || onShare) && (
        <span className="aw-actions">
          {onTogglePin && (
            <button className="chip" aria-pressed={!!pinned} onClick={onTogglePin}>
              {pinned ? SX.unpin[lang] : SX.pin[lang]}
            </button>
          )}
          {onShare && (
            <button className="chip" onClick={onShare}>
              {SX.share[lang]}
            </button>
          )}
        </span>
      )}
    </li>
  );
}

export function AwardsView({ lang, progress, extra, pinned = [], onPin, earnedOnly }: ProgressTabsProps & { earnedOnly?: boolean }) {
  const all = useMemo(() => achievements(progress, extra), [progress, extra]);
  // Progress → Awards shows only what you earned (owner: unearned badges should not appear); "closest" stays on badges.
  const list = earnedOnly ? all.filter((a) => a.got) : all;
  const close = earnedOnly ? [] : closestToUnlock(all);
  const toggle = (id: string) => {
    if (!onPin) return;
    onPin(pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(-3));
  };
  const share = (a: Achievement) => void shareAward(a, lang);
  const got = list.filter((a) => a.got).length;
  return (
    <div className="ps-view">
      <p className="field-hint">
        <N>{`${got} / ${list.length}`}</N>
      </p>
      {close.length > 0 && (
        <section className="set-card">
          <h2>{SX.closest[lang]}</h2>
          <ul className="aw-list">
            {close.map((a) => (
              <AwardCard key={a.id} a={a} lang={lang} />
            ))}
          </ul>
        </section>
      )}
      <TrophyCase list={list} pinned={pinned} lang={lang} />
      {onPin && <p className="field-hint">{SX.pinHint[lang]}</p>}
      {AWARD_CATEGORIES.map((c) => {
        const xs = list.filter((a) => a.cat === c);
        if (!xs.length) return null;
        return (
          <section key={c} className="set-card">
            <h2>{SX.cats[c][lang]}</h2>
            <ul className="aw-list">
              {xs.map((a) => (
                <AwardCard key={a.id} a={a} lang={lang} pinned={pinned.includes(a.id)} onTogglePin={onPin ? () => toggle(a.id) : undefined} onShare={() => share(a)} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function TrophyCase({ list, pinned, lang }: { list: Achievement[]; pinned: string[]; lang: Lang }) {
  const shown = pinned.map((id) => list.find((a) => a.id === id && a.got)).filter((a): a is Achievement => !!a);
  return (
    <section className="set-card aw-case" aria-label={SX.trophyCase[lang]}>
      <h2>{SX.trophyCase[lang]}</h2>
      <ul className="aw-case-row">
        {[0, 1, 2].map((i) => {
          const a = shown[i];
          const n = a ? tierName(a) : null;
          return (
            <li key={i} className={`aw-slot ${n ? `tier-${n}` : 'empty'}`}>
              {a ? (
                <>
                  <span className="aw-icon" aria-hidden="true">
                    {a.icon}
                  </span>
                  <small>{awardName(a.id, lang)}</small>
                  <TierBadge a={a} lang={lang} />
                </>
              ) : (
                <span aria-hidden="true">＋</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ======================================================================= share card (S22)

const TIER_HEX: Record<TierName, string> = { bronze: '#CD7F32', silver: '#C0C6D6', gold: '#FFC94D', diamond: '#7DE3FF' };

/** Draw on a canvas and hand it to Web Share (files), else download a PNG. */
export async function shareCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, filename: string, text: string): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const w = 1080;
    const h = 1080;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return 'failed';
    const g = ctx.createRadialGradient(w / 2, -100, 50, w / 2, h / 2, h);
    g.addColorStop(0, '#2a2363');
    g.addColorStop(1, '#0f1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
    ctx.fillStyle = '#a9a6c9';
    ctx.font = '600 34px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ToneTurn', w / 2, h - 60);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    if (!blob) return 'failed';
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text });
        return 'shared';
      } catch {
        /* cancelled → fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

export function shareAward(a: Achievement, lang: Lang) {
  const n = tierName(a);
  const name = awardName(a.id, lang);
  return shareCanvas(
    (ctx, w, h) => {
      ctx.textAlign = 'center';
      ctx.strokeStyle = n ? TIER_HEX[n] : '#FFC94D';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 110, 190, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '200px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.fillStyle = '#f4f1ff';
      ctx.fillText(a.icon, w / 2, h / 2 - 40);
      ctx.font = '700 64px Rubik, system-ui, sans-serif';
      ctx.direction = lang === 'he' ? 'rtl' : 'ltr';
      ctx.fillText(name, w / 2, h / 2 + 180);
      if (n) {
        ctx.font = '700 46px Rubik, system-ui, sans-serif';
        ctx.fillStyle = n ? TIER_HEX[n] : '#FFC94D';
        ctx.fillText(`${TIER_GLYPH[n]} ${SX.tiers[n][lang]}`, w / 2, h / 2 + 260);
      }
    },
    `toneturn-${a.id}.png`,
    name,
  );
}

export function shareMonth(m: MonthReview, lang: Lang, t: Strings) {
  return shareCanvas(
    (ctx, w) => {
      ctx.textAlign = 'center';
      ctx.direction = lang === 'he' ? 'rtl' : 'ltr';
      ctx.fillStyle = '#FFC94D';
      ctx.font = '700 70px Rubik, system-ui, sans-serif';
      ctx.fillText(SX.month[lang], w / 2, 170);
      ctx.fillStyle = '#f4f1ff';
      ctx.font = '600 52px Rubik, system-ui, sans-serif';
      ctx.fillText(monthLabel(m.month, lang), w / 2, 250);
      const lines = [
        `${SX.days[lang]}: ${m.days}`,
        `${SX.items[lang]}: ${m.items}`,
        `${SX.accuracy[lang]}: ${pct(m.accuracy)}`,
        `${SX.xp[lang]}: ${m.xp}`,
        ...(m.topArea ? [`${SX.topArea[lang]}: ${t.domainNames[m.topArea]}`] : []),
        ...m.gains.map((g) => `${t.skillNames[g.skill]} ▲ +${g.d}`),
      ];
      ctx.font = '500 46px Rubik, system-ui, sans-serif';
      lines.forEach((l, i) => ctx.fillText(l, w / 2, 380 + i * 80));
    },
    `toneturn-${m.month}.png`,
    SX.month[lang],
  );
}

// ======================================================================= month in review (S16)

const monthLabel = (month: string, lang: Lang) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
};

/**
 * Small header icon (like "what's new"): shown when last month's review is due (first open after the month
 * end, ≥ 3 practice days, not seen). Opening it calls onSeen(month) so it does not come back.
 */
export function MonthReviewIcon({ t, lang, progress, seenMonth, onSeen }: { t: Strings; lang: Lang; progress: Progress; seenMonth?: string | null; onSeen: (month: string) => void }) {
  const ps = P(progress);
  const due = dueMonthReview(today(), seenMonth, ps.statsDays);
  const [open, setOpen] = useState<string | null>(null);
  if (!due && !open) return null;
  return (
    <>
      {due && (
        <button
          className="icon-btn ps-month-btn"
          aria-label={SX.monthOpen[lang]}
          title={SX.monthOpen[lang]}
          onClick={() => {
            setOpen(due);
            onSeen(due);
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="14" rx="2" />
            <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
          </svg>
        </button>
      )}
      {open && <MonthReviewSheet t={t} lang={lang} progress={progress} month={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function MonthReviewSheet({ t, lang, progress, month, onClose }: { t: Strings; lang: Lang; progress: Progress; month: string; onClose: () => void }) {
  const ps = P(progress);
  const m = monthReview(ps.statsDays, ps.awards, month);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ps-month" role="dialog" aria-modal="true" aria-labelledby="ps-month-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="ps-month-title">
          {SX.month[lang]} · {monthLabel(month, lang)}
        </h2>
        {!m ? (
          <p className="field-hint">{SX.noData[lang]}</p>
        ) : (
          <>
            <div className="ps-tiles">
              <Tile label={SX.days[lang]} value={<N>{m.days}</N>} />
              <Tile label={SX.items[lang]} value={<N>{m.items}</N>} />
              <Tile label={SX.accuracy[lang]} value={<N>{pct(m.accuracy)}</N>} />
              <Tile label={SX.xp[lang]} value={<N>{m.xp}</N>} />
            </div>
            {m.topArea && (
              <p>
                {SX.topArea[lang]}: <b>{t.domainNames[m.topArea]}</b>
              </p>
            )}
            {m.gains.length > 0 && (
              <>
                <h3>{SX.gains[lang]}</h3>
                <ul className="ps-list">
                  {m.gains.map((g) => (
                    <li key={g.skill}>
                      {t.skillNames[g.skill]}{' '}
                      <span className="trend-delta up" dir="ltr">
                        <span aria-hidden="true">▲</span> +{g.d}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {m.awards.length > 0 && (
              <>
                <h3>{SX.newAwards[lang]}</h3>
                <ul className="ps-list">
                  {m.awards.map((a) => (
                    <li key={a.id}>{awardName(a.id, lang)}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <div className="ps-sheet-actions">
          {m && (
            <button className="btn" onClick={() => void shareMonth(m, lang, t)}>
              {SX.share[lang]}
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            {SX.close[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

