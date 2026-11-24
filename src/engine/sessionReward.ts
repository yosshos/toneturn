// The end screen's content (docs/SPEC-PRACTICE-SESSION.md §5, §6, §11.6). Pure.
//
// What a finished session shows, in this order: the headline (minutes, what was done), at most one big milestone and two
// small ones (only what was really reached), the week ring against the weekly goal, the week / month / year totals, the
// stretch minutes, ONE graph (the first that applies: improvement today → minutes up → average session up → the streak
// calendar — never a falling line), tomorrow's line, and (§6) the one-time "raise the goal" question.

import type { CourseId } from './courses';
import type { SessionRecord, SessionTotals } from './practiceSession';
import { addDay, averageSession, monthTotals, msByDay, weekStart, weekTotals, yearTotal, type PracticeLedger } from './practiceTime';
import type { StreakState } from './streak';
import type { Point } from './progressSeries';
import type { T2 } from './stretch';

export const HOUR_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;
export const SESSION_MILESTONES = [1, 10, 25, 50, 100, 250, 500] as const;
/** The average session must rise this much to be shown (§5: ≥ 2 min). */
export const AVG_UP_MS = 2 * 60_000;
const H = 3_600_000;

export type MilestoneKind = 'hours' | 'sessions' | 'streak' | 'longest' | 'bestWeek' | 'bestMonth' | 'average' | 'weekGoal' | 'itemClosed' | 'keyFilled';

export interface Milestone {
  kind: MilestoneKind;
  /** hours / sessions / streak days / minutes (records, average) / count (skill). */
  value: number;
  /** average: last week's minutes. */
  from?: number;
  /** Skill: what was closed or filled. */
  name?: T2;
  /** Ordering (higher first). */
  rank: number;
  /** May be the big one. */
  big: boolean;
}

export type GraphChoice =
  | { kind: 'improvement'; name: T2; unit: 'bpm' | 'pct'; pts: Point[]; from: number; to: number }
  | { kind: 'minutes'; days: { day: string; min: number }[]; today: string; lastWeekAvgMin: number }
  | { kind: 'average'; pts: Point[]; from: number; to: number }
  | { kind: 'calendar'; days: Record<string, number>; today: string; weeks: number };

export interface RewardInput {
  today: string;
  /** This session (already counted in `sessions` and `totalsAfter`). */
  rec: SessionRecord;
  /** Every kept session, this one included. */
  sessions: readonly SessionRecord[];
  totalsBefore?: SessionTotals;
  totalsAfter: SessionTotals;
  /** The time ledger (this session's minutes are already booked in it). */
  ledger: PracticeLedger;
  /** Limit the week / month / year totals to a course (absent = all). */
  course?: CourseId;
  /** The streak after this session (streak.ts streakState). */
  streak?: StreakState;
  /** The weekly minutes goal (practiceSession.weeklyGoalMin). */
  weeklyGoalMin: number;
  /** The daily length (for the "raise the goal" question). */
  dailyMin?: number;
  /** Items closed at target tempo today, and keys filled today (names). */
  closedToday?: T2[];
  keysFilledToday?: T2[];
  /** Today's main item: its tempo (or accuracy) over its last takes, oldest first; `today` marks today's takes. */
  improvement?: { name: T2; unit: 'bpm' | 'pct'; pts: Point[] };
  /** Active ms of this session in the stretch band (§11.6). */
  stretchMs?: number;
  /** What the plan has for tomorrow. */
  tomorrow?: { minutes: number; first?: T2 };
  /** What was done (block names), for the headline line. */
  parts?: T2[];
  /** §6: when the "raise the goal" question was last asked (a day), if ever. */
  raiseAskedOn?: string;
}

export interface SessionReward {
  minutes: number;
  parts: T2[];
  big: Milestone | null;
  small: Milestone[];
  ring: { nowMin: number; goalMin: number; lastWeekMin: number; /** Minutes above last week, only when up. */ upMin: number | null };
  totals: { weekMs: number; monthMs: number; yearMs: number };
  stretch: { stretchMin: number; totalMin: number } | null;
  graph: GraphChoice;
  tomorrow: { minutes: number; first?: T2 } | null;
  /** §6: ask once "Make it N minutes a day?" */
  raiseGoal: { to: number } | null;
}

const crossed = (before: number, after: number, t: number) => before < t && after >= t;

/** Every milestone reached by this session, best first. */
export function milestonesOf(x: RewardInput): Milestone[] {
  const out: Milestone[] = [];
  const b = x.totalsBefore ?? { finished: 0, totalMs: 0, longestMs: 0 };
  const a = x.totalsAfter;
  // the total practice time (the largest threshold crossed)
  const hrs = [...HOUR_MILESTONES].reverse().find((h) => crossed(b.totalMs, a.totalMs, h * H));
  if (hrs) out.push({ kind: 'hours', value: hrs, rank: 70 + Math.log10(hrs), big: hrs >= 5 });
  const ses = [...SESSION_MILESTONES].reverse().find((n) => crossed(b.finished, a.finished, n));
  if (ses) out.push({ kind: 'sessions', value: ses, rank: 65 + Math.log10(ses), big: ses === 1 || ses >= 25 });
  // the streak: a milestone reached today (streak.ts)
  const st = x.streak;
  const sm = st?.milestones.find((m) => m.day === x.today && m.days === st.count);
  if (sm) out.push({ kind: 'streak', value: sm.days, rank: 60 + Math.log10(sm.days) * 5, big: sm.days >= 7 });
  // records: only against an earlier record (the first session is the sessions milestone, not a record)
  const week = weekStart(x.today);
  const month = x.today.slice(0, 7);
  if (b.bestMonth && b.bestMonth.month !== month && a.bestMonth?.month === month && a.bestMonth.ms > b.bestMonth.ms) out.push({ kind: 'bestMonth', value: Math.round(a.bestMonth.ms / 60000), rank: 55, big: true });
  if (b.bestWeek && b.bestWeek.week !== week && a.bestWeek?.week === week && a.bestWeek.ms > b.bestWeek.ms) out.push({ kind: 'bestWeek', value: Math.round(a.bestWeek.ms / 60000), rank: 50, big: false });
  if (x.rec.finished && b.finished >= 1 && x.rec.activeMs > b.longestMs && b.longestMs > 0) out.push({ kind: 'longest', value: Math.round(x.rec.activeMs / 60000), rank: 45, big: false });
  // the weekly goal reached by this session
  const wk = weekTotals(x.ledger, x.today, 1, x.course)[0]?.ms ?? 0;
  const goal = x.weeklyGoalMin * 60000;
  if (goal > 0 && crossed(wk - x.rec.activeMs, wk, goal)) out.push({ kind: 'weekGoal', value: x.weeklyGoalMin, rank: 40, big: false });
  // the average session this week, up ≥ 2 min on last week
  const av = averageSession(x.sessions, x.today, 2);
  if (av.length === 2 && av[0].count > 0 && av[1].count > 0 && av[1].avgMs - av[0].avgMs >= AVG_UP_MS) out.push({ kind: 'average', value: Math.round(av[1].avgMs / 60000), from: Math.round(av[0].avgMs / 60000), rank: 30, big: false });
  // skill: a key filled (big), an item closed (small)
  for (const n of (x.keysFilledToday ?? []).slice(0, 1)) out.push({ kind: 'keyFilled', value: x.keysFilledToday!.length, name: n, rank: 90, big: true });
  for (const n of (x.closedToday ?? []).slice(0, 1)) out.push({ kind: 'itemClosed', value: x.closedToday!.length, name: n, rank: 35, big: false });
  return out.sort((p, q) => q.rank - p.rank);
}

/** At most one big and two small (§5): the big one is the best milestone that may be big; the next two are chips. */
export function pickMilestones(all: readonly Milestone[]): { big: Milestone | null; small: Milestone[] } {
  const big = all.find((m) => m.big) ?? null;
  return { big, small: all.filter((m) => m !== big).slice(0, 2) };
}

/** The longest non-falling tail of a series (each point ≥ the one before), ≥ 2 points — or null. */
export function risingTail(pts: readonly Point[]): Point[] | null {
  let i = pts.length - 1;
  while (i > 0 && pts[i].v >= pts[i - 1].v) i--;
  const tail = pts.slice(i);
  return tail.length >= 2 && tail[tail.length - 1].v > tail[0].v ? tail : null;
}

/** The running best of a series (a best-so-far line never falls). */
export const runningBest = (pts: readonly Point[]): Point[] => {
  let m = -Infinity;
  return pts.map((p) => ({ day: p.day, v: (m = Math.max(m, p.v)) }));
};

/**
 * The ONE graph (§5), the first that applies — and never a falling line:
 *   1. improvement today: today's main item's best over its last 10 takes rose, and today set the best;
 *   2. minutes up: this week, through today, above last week through the same weekday (bars, last week's daily average);
 *   3. average session: the average per week rose (the rising tail of the last 8 weeks);
 *   4. the streak calendar: the last 5 weeks.
 */
export function chooseGraph(x: Pick<RewardInput, 'today' | 'ledger' | 'sessions' | 'improvement' | 'course'>): GraphChoice {
  const im = x.improvement;
  if (im && im.pts.length >= 2) {
    const pts = runningBest(im.pts.slice(-10));
    const last = pts[pts.length - 1].v;
    const todayRaised = pts.some((p, i) => p.day === x.today && (i === 0 ? false : p.v > pts[i - 1].v));
    if (last > pts[0].v && todayRaised) return { kind: 'improvement', name: im.name, unit: im.unit, pts, from: pts[0].v, to: last };
  }
  const byDay = msByDay(x.ledger);
  const w = weekStart(x.today);
  const dow = Math.round((Date.parse(`${x.today}T00:00:00Z`) - Date.parse(`${w}T00:00:00Z`)) / 86400000);
  const sum = (from: string, n: number) => Array.from({ length: n }, (_, i) => byDay[addDay(from, i)] ?? 0).reduce((s, v) => s + v, 0);
  const lw = addDay(w, -7);
  if (sum(w, dow + 1) > sum(lw, dow + 1) && sum(w, dow + 1) > 0) {
    const days = Array.from({ length: 7 }, (_, i) => addDay(w, i)).map((d) => ({ day: d, min: Math.round((byDay[d] ?? 0) / 60000) }));
    return { kind: 'minutes', days, today: x.today, lastWeekAvgMin: Math.round(sum(lw, 7) / 7 / 60000) };
  }
  const av = averageSession(x.sessions, x.today, 8).filter((a) => a.count > 0).map((a) => ({ day: a.week, v: Math.round(a.avgMs / 60000) }));
  const tail = av.length >= 2 && av[av.length - 1].day === w ? risingTail(av) : null;
  if (tail) return { kind: 'average', pts: tail, from: tail[0].v, to: tail[tail.length - 1].v };
  const cal: Record<string, number> = {};
  const start = addDay(w, -28);
  for (const [d, ms] of Object.entries(byDay)) if (d >= start && d <= x.today && ms > 0) cal[d] = ms / 60000;
  return { kind: 'calendar', days: cal, today: x.today, weeks: 5 };
}

/**
 * §6: after 3 weeks in a row at or above the weekly goal, ask once "Make it N minutes a day?" (+5). Not again for 3
 * weeks after it was asked. `weeks` are the completed weeks' ms (oldest first, this week excluded).
 */
export function raiseGoalAsk(weeks: readonly { week: string; ms: number }[], weeklyGoalMin: number, dailyMin: number | undefined, today: string, askedOn?: string): { to: number } | null {
  if (!dailyMin || dailyMin >= 180 || weeklyGoalMin <= 0) return null;
  if (askedOn && askedOn > addDay(today, -21)) return null;
  const last3 = weeks.slice(-3);
  if (last3.length < 3 || last3.some((w) => w.ms < weeklyGoalMin * 60000)) return null;
  return { to: Math.min(180, dailyMin + 5) };
}

/** Everything the end screen shows. */
export function sessionReward(x: RewardInput): SessionReward {
  const { big, small } = pickMilestones(milestonesOf(x));
  const wks = weekTotals(x.ledger, x.today, 5, x.course);
  const nowMs = wks[wks.length - 1]?.ms ?? 0;
  const lastMs = wks[wks.length - 2]?.ms ?? 0;
  const nowMin = Math.round(nowMs / 60000);
  const lastWeekMin = Math.round(lastMs / 60000);
  const minutes = Math.round(x.rec.activeMs / 60000);
  return {
    minutes,
    parts: x.parts ?? [],
    big,
    small,
    ring: { nowMin, goalMin: x.weeklyGoalMin, lastWeekMin, upMin: nowMin > lastWeekMin ? nowMin - lastWeekMin : null },
    totals: { weekMs: nowMs, monthMs: monthTotals(x.ledger, x.today, 1, x.course)[0]?.ms ?? 0, yearMs: yearTotal(x.ledger, x.today, x.course).ms },
    stretch: x.stretchMs !== undefined && minutes > 0 ? { stretchMin: Math.min(minutes, Math.round(x.stretchMs / 60000)), totalMin: minutes } : null,
    graph: chooseGraph(x),
    tomorrow: x.tomorrow ?? null,
    raiseGoal: raiseGoalAsk(wks.slice(0, -1), x.weeklyGoalMin, x.dailyMin, x.today, x.raiseAskedOn),
  };
}

// ---------------------------------------------------------------- the words (he + en): a calm teacher, one sentence each

/** "1 h 20 min" / "1 ש׳ 20 דק׳" (minutes alone under an hour). */
export function hm(ms: number, lang: 'he' | 'en'): string {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  const [hu, mu] = lang === 'he' ? ['ש׳', 'דק׳'] : ['h', 'min'];
  return h ? (r ? `${h} ${hu} ${r} ${mu}` : `${h} ${hu}`) : `${r} ${mu}`;
}

export function milestoneText(m: Milestone): T2 {
  switch (m.kind) {
    case 'hours':
      return m.value === 1 ? { he: 'שעת אימון ראשונה', en: 'Your first hour of practice' } : { he: `${m.value} שעות אימון בסך הכול`, en: `${m.value} hours of practice in all` };
    case 'sessions':
      return m.value === 1 ? { he: 'האימון הראשון הושלם', en: 'Your first session is done' } : { he: `${m.value} אימונים הושלמו`, en: `${m.value} sessions finished` };
    case 'streak':
      return { he: `${m.value} ימים ברצף`, en: `${m.value} days in a row` };
    case 'longest':
      return { he: `האימון הארוך ביותר שלך: ${m.value} דק׳`, en: `Your longest session: ${m.value} min` };
    case 'bestWeek':
      return { he: `השבוע הכי מלא שלך: ${m.value} דק׳`, en: `Your fullest week: ${m.value} min` };
    case 'bestMonth':
      return { he: `החודש הכי מלא שלך: ${m.value} דק׳`, en: `Your fullest month: ${m.value} min` };
    case 'average':
      return { he: `אימון ממוצע השבוע: ${m.value} דק׳, לעומת ${m.from}`, en: `Average session this week: ${m.value} min, up from ${m.from}` };
    case 'weekGoal':
      return { he: 'יעד השבוע הושג', en: "This week's goal is reached" };
    case 'itemClosed':
      return { he: `נסגר בטמפו היעד: ${m.name?.he ?? ''}`.trim(), en: `Closed at target tempo: ${m.name?.en ?? ''}`.trim() };
    case 'keyFilled':
      return { he: `סולם מלא: ${m.name?.he ?? ''}`.trim(), en: `Key complete: ${m.name?.en ?? ''}`.trim() };
  }
}

/** "Practice done: technique, improv, review". */
export function headlineLine(parts: readonly T2[]): T2 {
  if (!parts.length) return { he: 'האימון הושלם', en: 'Practice done' };
  return { he: `האימון הושלם: ${parts.map((p) => p.he).join(', ')}`, en: `Practice done: ${parts.map((p) => p.en).join(', ')}` };
}

/** "18 of 32 minutes outside your comfort zone". */
export const stretchText = (s: { stretchMin: number; totalMin: number }): T2 => ({ he: `${s.stretchMin} מתוך ${s.totalMin} דק׳ מחוץ לאזור הנוחות`, en: `${s.stretchMin} of ${s.totalMin} minutes outside your comfort zone` });

/** "Tomorrow: 30 min · starts with the A♭ major scale". */
export function tomorrowText(t: { minutes: number; first?: T2 }): T2 {
  return { he: `מחר: ${t.minutes} דק׳${t.first ? ` · מתחילים ב${t.first.he}` : ''}`, en: `Tomorrow: ${t.minutes} min${t.first ? ` · starts with ${t.first.en}` : ''}` };
}

/** The graph's title. */
export function graphTitle(g: GraphChoice): T2 {
  if (g.kind === 'improvement') {
    const f = (v: number) => (g.unit === 'bpm' ? `♩${Math.round(v)}` : `${Math.round(v * 100)}%`);
    return { he: `${g.name.he}: ${f(g.from)} ← ${f(g.to)}`, en: `${g.name.en}: ${f(g.from)} → ${f(g.to)}` };
  }
  if (g.kind === 'minutes') return { he: 'דקות השבוע, מול הממוצע של שבוע שעבר', en: "This week's minutes, against last week's average" };
  if (g.kind === 'average') return { he: `האימון הממוצע עלה: ${g.from} ← ${g.to} דק׳`, en: `Your average session rose: ${g.from} → ${g.to} min` };
  return { he: 'ימי האימון בחמשת השבועות האחרונים', en: 'Practice days, last five weeks' };
}
