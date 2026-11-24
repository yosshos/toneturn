// Momentum: persistence and the pace of progress, per week (docs/SPEC-PRACTICE-SESSION.md §11.4, owner-approved
// 2026-11-24). Pure.
//
// A weekly score 0–100 in two halves:
//   persistence (50)  practice days against the goal (25) and minutes against the weekly goal (25);
//   progress    (50)  this week's real gains (tempo records, cells closed, keys filled, items up the status ladder,
//                     rating gained, promotions) against the player's OWN trailing average — so a beginner and a pro can
//                     both fill it.
// Momentum also pays fixed XP bonuses (counted in the league): each is paid once (an idempotency key) and each kind has
// a fixed weekly limit (§11.7).

export interface WeekGains {
  /** New clean tempo records. */
  records: number;
  /** Cells closed (an exercise passed in a key). */
  cells: number;
  /** Keys filled (every exercise open at the player's level closed). */
  keys: number;
  /** Items up the status ladder (new → learning → almost → closed: one per step). */
  statusUps: number;
  /** Rating points gained (sum over areas, never negative). */
  rating: number;
  /** Rank promotions. */
  promotions: number;
}

export const NO_GAINS: WeekGains = { records: 0, cells: 0, keys: 0, statusUps: 0, rating: 0, promotions: 0 };

/** What each gain is worth in progress points (the pace is a weighted count). */
export const GAIN_WEIGHT: Record<keyof WeekGains, number> = { records: 1, cells: 3, keys: 6, statusUps: 1, rating: 0.1, promotions: 8 };
/** The pace a player without history is measured against (≈ a beginner's ordinary week). */
export const DEFAULT_PACE = 6;
/** The pace never drops under this (a slow few weeks must not let one record fill the half). */
export const MIN_PACE = 3;
/** Trailing weeks the player's own pace is averaged over. */
export const PACE_WEEKS = 8;

export const gainPoints = (g: Partial<WeekGains>): number => (Object.keys(GAIN_WEIGHT) as (keyof WeekGains)[]).reduce((a, k) => a + Math.max(0, g[k] ?? 0) * GAIN_WEIGHT[k], 0);

/**
 * The player's usual pace: the average gain points of the trailing weeks they practised in (weeks without practice are
 * not "slow weeks", they are absent), the last PACE_WEEKS of them. DEFAULT_PACE without history; never under MIN_PACE.
 */
export function ownPace(trailing: readonly { gains: Partial<WeekGains>; practised: boolean }[]): number {
  const ws = trailing.filter((w) => w.practised).slice(-PACE_WEEKS);
  if (!ws.length) return DEFAULT_PACE;
  return Math.max(MIN_PACE, ws.reduce((a, w) => a + gainPoints(w.gains), 0) / ws.length);
}

export interface MomentumInput {
  /** Practice days this week. */
  days: number;
  /** Practice days a week (the setting, default 5). */
  daysGoal: number;
  /** Minutes this week. */
  minutes: number;
  /** The weekly minutes goal (daily length × practice days). */
  minutesGoal: number;
  /** This week's gains. */
  gains: Partial<WeekGains>;
  /** The trailing weeks (oldest first), this week excluded. */
  trailing: readonly { gains: Partial<WeekGains>; practised: boolean }[];
}

export interface Momentum {
  /** 0–100, an integer. */
  score: number;
  /** 0–50. */
  persistence: number;
  /** 0–50. */
  progress: number;
  /** The pace the progress half is measured against (gain points a week). */
  pace: number;
}

const share = (n: number, of: number) => (of > 0 ? Math.max(0, Math.min(1, n / of)) : 1);

/** The week's Momentum (§11.4). */
export function momentum(x: MomentumInput): Momentum {
  const persistence = 25 * share(x.days, Math.max(1, x.daysGoal)) + 25 * share(x.minutes, Math.max(1, x.minutesGoal));
  const pace = ownPace(x.trailing);
  const progress = 50 * share(gainPoints(x.gains), pace);
  const p = Math.round(persistence * 10) / 10;
  const q = Math.round(progress * 10) / 10;
  return { score: Math.round(persistence + progress), persistence: p, progress: q, pace };
}

/** Momentum at or above this ends the week with the boost. */
export const BOOST_AT = 80;
export const BOOST = 0.1;
/** The stretch-XP boost for this week: +10 % when LAST week's Momentum was ≥ 80. Read from last week only — never
 *  compounding (a boosted week does not raise the next boost). */
export const boostFor = (lastWeekScore: number | null | undefined): number => ((lastWeekScore ?? 0) >= BOOST_AT ? BOOST : 0);

// ---------------------------------------------------------------- the bonuses (§11.4)

export type BonusKind = 'session' | 'weekGoal' | 'fourWeeks' | 'record' | 'cell' | 'key' | 'promotion';

export const BONUS_XP: Record<BonusKind, number> = { session: 10, weekGoal: 100, fourWeeks: 200, record: 5, cell: 20, key: 50, promotion: 100 };
/** The fixed weekly limit per kind (§11.7). */
export const WEEKLY_LIMIT: Record<BonusKind, number> = { session: 7, weekGoal: 1, fourWeeks: 1, record: 20, cell: 10, key: 4, promotion: 2 };

export interface Bonus {
  /** The idempotency key: a bonus with a key already paid is never paid again. */
  key: string;
  kind: BonusKind;
  /** The Monday of the week it belongs to (for the weekly limits). */
  week: string;
  xp: number;
}

/** What has been paid (kept in progress; the last KEEP_PAID). */
export type PaidBonus = Bonus;
export const KEEP_PAID = 800;

const mk = (kind: BonusKind, key: string, week: string): Bonus => ({ key: `${kind}:${key}`, kind, week, xp: BONUS_XP[kind] });

/** A session finished at its planned length or more: +10 (once per day and course). */
export function sessionBonus(rec: { day: string; course: string; plannedMin: number; activeMs: number; finished: boolean }, week: string): Bonus | null {
  if (!rec.finished || !(rec.plannedMin > 0) || rec.activeMs < rec.plannedMin * 60_000) return null;
  return mk('session', `${rec.day}:${rec.course}`, week);
}

/** The weekly goal reached, days AND minutes: +100 (once a week). */
export function weekGoalBonus(week: string, x: { days: number; daysGoal: number; minutes: number; minutesGoal: number }): Bonus | null {
  return x.days >= x.daysGoal && x.minutes >= x.minutesGoal ? mk('weekGoal', week, week) : null;
}

/**
 * Four full weeks in a row (practice days ≥ goal each): +200, once per 4 weeks. `weeks` is consecutive, oldest first,
 * ending with the current week. Paid when the run of full weeks ending now is a multiple of 4 (4, 8, 12 …).
 */
export function fourWeeksBonus(weeks: readonly { week: string; days: number; daysGoal: number }[]): Bonus | null {
  let run = 0;
  for (let i = weeks.length - 1; i >= 0 && weeks[i].days >= weeks[i].daysGoal; i--) run++;
  const now = weeks[weeks.length - 1];
  return now && run > 0 && run % 4 === 0 ? mk('fourWeeks', now.week, now.week) : null;
}

/** A new tempo record on an item (one per item and tempo). */
export const recordBonus = (itemId: string, bpm: number, week: string): Bonus => mk('record', `${itemId}@${Math.round(bpm)}`, week);
/** A cell closed (keyMatrix cellKey). */
export const cellBonus = (cellKey: string, week: string): Bonus => mk('cell', cellKey, week);
/** A key filled (e.g. "major:3"). */
export const keyBonus = (key: string, week: string): Bonus => mk('key', key, week);
/** A rank promotion (course and rank). */
export const promotionBonus = (course: string, rank: string, week: string): Bonus => mk('promotion', `${course}:${rank}`, week);

/**
 * Pay bonuses: each key once ever, each kind up to its weekly limit. Returns the new paid list, the XP paid now and
 * the bonuses paid now (in the order given).
 */
export function payBonuses(paid: readonly PaidBonus[] | undefined, offered: readonly (Bonus | null | undefined)[]): { paid: PaidBonus[]; xp: number; now: Bonus[] } {
  const list = [...(paid ?? [])];
  const keys = new Set(list.map((p) => p.key));
  const now: Bonus[] = [];
  for (const b of offered) {
    if (!b || keys.has(b.key)) continue;
    const used = list.filter((p) => p.kind === b.kind && p.week === b.week).length;
    if (used >= WEEKLY_LIMIT[b.kind]) continue;
    list.push(b);
    keys.add(b.key);
    now.push(b);
  }
  return { paid: list.slice(-KEEP_PAID), xp: now.reduce((a, b) => a + b.xp, 0), now };
}

/** Two devices' paid lists: union by key (a bonus paid on either is paid). */
export function mergePaid(a: readonly PaidBonus[] | undefined, b: readonly PaidBonus[] | undefined): PaidBonus[] {
  const m = new Map<string, PaidBonus>();
  for (const p of [...(a ?? []), ...(b ?? [])]) if (!m.has(p.key)) m.set(p.key, p);
  return [...m.values()].sort((x, y) => x.week.localeCompare(y.week)).slice(-KEEP_PAID);
}

/** Momentum's short line (he + en), e.g. on the end screen under the ring. */
export function momentumLine(m: Momentum): { he: string; en: string } {
  if (m.score >= BOOST_AT) return { he: 'מומנטום גבוה: בשבוע הבא +10% על נקודות מתיחה', en: 'High momentum: +10% on stretch XP next week' };
  if (m.persistence < 25) return { he: 'התמדה: עוד ימי אימון ימלאו את הטבעת', en: 'Persistence: more practice days fill the ring' };
  return { he: 'קצב ההתקדמות נמדד מול השבועות שלך', en: 'Progress is measured against your own weeks' };
}
