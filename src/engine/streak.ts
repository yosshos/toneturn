// Streak 2.0 (spec addendum N): practice days, weekly free freezes, bought freezes and repairs, milestones,
// and gems. Everything is derived from the practice history plus an append-only purchase list, so a
// cloud rebuild or a second device computes exactly the same streak and balance.

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
export const MILESTONE_GEMS: Record<number, number> = { 7: 50, 30: 150, 100: 500, 365: 1500 };
export const MAX_FREEZES = 2;
export const PRICES = { freeze: 200, repair: 400 } as const;
/** Cosmetic extras bought with gems (spec N: cosmetic only — never difficulty or scoring).
 *  0.61 (SPEC-REDESIGN, owner 2026-11-09): one design language, so colour themes are no longer sold. They are
 *  priced 0 from now on, which refunds every gem ever spent on one (the balance is derived from the purchase list).
 *  Avatar frames take their place. */
export const COSMETICS: Record<string, number> = { 'frame-gold': 300, 'frame-staff': 300, 'frame-notes': 500 };
export const FRAMES = ['gold', 'staff', 'notes'] as const;
export type FrameId = (typeof FRAMES)[number];
export const REPAIR_WINDOW_DAYS = 2;
/** Fermatas (a streak freeze a friend gave, owner 2026-11-16) waiting at once — far above anything one gift a practice day
 *  can build up; a sanity bound only. They cost no gems. */
export const MAX_FERMATAS = 7;

export interface Purchase {
  id: string;
  kind: 'freeze' | 'repair' | 'cosmetic' | 'fermata';
  /** For a cosmetic: which one (e.g. 'theme-ocean'). For a fermata: the friend who gave it (shown on the calendar). */
  item?: string;
  /** Local day the purchase was made (YYYY-MM-DD). */
  day: string;
}

const toUTC = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};
export const addDays = (d: string, n: number) => new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
/** Monday-based week key. */
const weekOf = (d: string) => {
  const dow = (new Date(toUTC(d)).getUTCDay() + 6) % 7;
  return addDays(d, -dow);
};

export interface StreakState {
  /** Streak as of today (today counts once practised; an unpractised today does not break it yet). */
  count: number;
  practicedToday: boolean;
  /** Freezes ready to protect a missed day. */
  freezes: number;
  /** Days covered by a freeze (❄) — fermata days included, so the server and the toast treat them alike. */
  freezeDays: string[];
  /** Gifted fermatas not used yet (counted apart from `freezes`, never capped by MAX_FREEZES). */
  fermatas?: number;
  /** The subset of freezeDays a friend's fermata held (the calendar draws a fermata there). */
  fermataDays?: string[];
  /** Days a repair restored. */
  repairedDays: string[];
  /** Milestones reached so far, with the day they were reached (one entry per streak run). */
  milestones: { days: number; day: string }[];
  /** The longest streak ever. */
  best: number;
  /** A streak that broke recently enough to repair (and no freeze covered it). */
  repairable: { lost: number; brokeOn: string } | null;
  /** Next milestone and how many days remain. */
  next: { days: number; left: number } | null;
  /** AUDIT-5 #4, weekly-target mode: days off that the week's target covers (they neither break nor add). */
  restDays?: string[];
}

/** Weekly-target mode (AUDIT-5 #4): N practice days a week; the other days are rest days while the week still makes
 * (or made) its target. 0 / absent = the daily streak. */
export const WEEKLY_TARGETS = [3, 4, 5, 6] as const;

/** Practice days in a Monday week, and whether a missed day in it is a rest day (the target met, or still in reach). */
export function weekCovers(days: Set<string>, day: string, today: string, target: number): boolean {
  const w = weekOf(day);
  let done = 0;
  let left = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(w, i);
    if (days.has(d) && d <= today) done++;
    else if (d >= today) left++;
  }
  return done >= target || (w === weekOf(today) && done + left >= target);
}

/**
 * Walk day by day from the first practice day to today.
 * - Each Monday (and on the first day) a free freeze is added if fewer than MAX_FREEZES are equipped.
 * - A bought freeze is added on its purchase day (up to MAX_FREEZES).
 * - A missed day uses a freeze if one is equipped; otherwise the streak breaks.
 * - A repair bought within REPAIR_WINDOW_DAYS after a break restores the lost streak (the missed days count as repaired).
 */
export function streakState(practiceDays: Iterable<string>, purchases: Purchase[], today: string, opts: { weeklyTarget?: number } = {}): StreakState {
  const target = opts.weeklyTarget && opts.weeklyTarget > 0 && opts.weeklyTarget < 7 ? opts.weeklyTarget : 0;
  const restDays: string[] = [];
  const days = new Set(practiceDays);
  const sorted = [...days].filter((d) => d <= today).sort();
  const empty: StreakState = { count: 0, practicedToday: false, freezes: 0, freezeDays: [], repairedDays: [], milestones: [], best: 0, repairable: null, next: { days: MILESTONES[0], left: MILESTONES[0] } };
  if (!sorted.length) return { ...empty, freezes: 1 };
  const byDay = new Map<string, Purchase[]>();
  for (const p of purchases) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);

  let count = 0;
  let best = 0;
  let freezes = 0;
  let fermatas = 0;
  let lastWeek = '';
  const freezeDays: string[] = [];
  const fermataDays: string[] = [];
  const repairedDays: string[] = [];
  const milestones: { days: number; day: string }[] = [];
  let broke: { lost: number; on: string; missed: string[] } | null = null;
  // a fermata that arrived before the first practice day waits for the first missed day
  fermatas = Math.min(MAX_FERMATAS, purchases.filter((p) => p.kind === 'fermata' && p.day < sorted[0]).length);

  for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
    const wk = weekOf(d);
    if (wk !== lastWeek) {
      lastWeek = wk;
      if (freezes < MAX_FREEZES) freezes++;
    }
    for (const p of byDay.get(d) ?? []) {
      if (p.kind === 'freeze' && freezes < MAX_FREEZES) freezes++;
      if (p.kind === 'fermata' && fermatas < MAX_FERMATAS) fermatas++;
      if (p.kind === 'repair' && broke && daysBetween(broke.on, d) <= REPAIR_WINDOW_DAYS) {
        count = broke.lost + count;
        repairedDays.push(...broke.missed);
        broke = null;
      }
    }
    if (days.has(d)) {
      count++;
      if (MILESTONES.includes(count)) milestones.push({ days: count, day: d });
    } else if (d !== today) {
      if (count > 0 && target && weekCovers(days, d, today, target)) restDays.push(d);
      else if (count > 0 && fermatas > 0) {
        // a friend's fermata holds the first missed day after it arrived (it is what the gift is for; the player's own
        // freezes stay for later)
        fermatas--;
        freezeDays.push(d);
        fermataDays.push(d);
      } else if (count > 0 && freezes > 0) {
        freezes--;
        freezeDays.push(d);
      } else if (count > 0 || broke) {
        if (count > 0) broke = { lost: count, on: d, missed: [d] };
        else if (broke) broke.missed.push(d);
        count = 0;
      }
    }
    best = Math.max(best, count);
  }
  const repairable = broke && count === 0 && daysBetween(broke.on, today) <= REPAIR_WINDOW_DAYS ? { lost: broke.lost, brokeOn: broke.on } : null;
  const nextDays = MILESTONES.find((m) => m > count) ?? null;
  return {
    count,
    practicedToday: days.has(today),
    freezes,
    freezeDays,
    ...(fermatas || fermataDays.length ? { fermatas, fermataDays } : {}),
    repairedDays,
    milestones,
    best,
    repairable,
    next: nextDays ? { days: nextDays, left: nextDays - count } : null,
    ...(target ? { restDays } : {}),
  };
}

/** What earned gems (spec N.4), from derived facts only. */
export interface GemSources {
  /** Sessions completed with ≥ 80 % first-try correct (lessons, review, workshop, placement). */
  goodSessions: number;
  /** Days the daily goal (30 XP) was reached. */
  goalDays: number;
  puzzleGold: number;
  puzzleSilver: number;
  /** Daily challenge first plays. */
  dailyPlays: number;
  /** Milestones reached (any run). */
  milestones: number[];
}

export function gemsEarned(s: GemSources): number {
  return s.goodSessions * 5 + s.goalDays * 10 + s.puzzleGold * 20 + s.puzzleSilver * 10 + s.dailyPlays * 5 + s.milestones.reduce((a, m) => a + (MILESTONE_GEMS[m] ?? 0), 0);
}

const priceOf = (p: Purchase) => (p.kind === 'cosmetic' ? (COSMETICS[p.item ?? ''] ?? 0) : p.kind === 'fermata' ? 0 : (PRICES[p.kind] ?? 0));
export const gemsSpent = (purchases: Purchase[]) => purchases.reduce((a, p) => a + priceOf(p), 0);

/** Owned cosmetics. Retired colour themes (theme-*) still count as bought, but cost nothing now (refunded). */
export const ownsCosmetic = (purchases: Purchase[], item: string) => purchases.some((p) => p.kind === 'cosmetic' && p.item === item);
export const canBuyCosmetic = (item: string, balance: number, purchases: Purchase[]) => item in COSMETICS && !ownsCosmetic(purchases, item) && balance >= COSMETICS[item];

/** Can this purchase be made now? */
export function canBuy(kind: 'freeze' | 'repair', balance: number, st: StreakState): boolean {
  if (balance < PRICES[kind]) return false;
  if (kind === 'freeze') return st.freezes < MAX_FREEZES;
  return st.repairable !== null;
}
