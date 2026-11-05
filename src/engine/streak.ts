// Streak 2.0 (spec addendum N): practice days, weekly free freezes, bought freezes and repairs, milestones,
// and gems. Everything is derived from the practice history plus an append-only purchase list, so a
// cloud rebuild or a second device computes exactly the same streak and balance.

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
export const MILESTONE_GEMS: Record<number, number> = { 7: 50, 30: 150, 100: 500, 365: 1500 };
export const MAX_FREEZES = 2;
export const PRICES = { freeze: 200, repair: 400 } as const;
/** Cosmetic extras bought with gems (spec N: cosmetic only — never difficulty or scoring). */
export const COSMETICS: Record<string, number> = { 'theme-ocean': 300, 'theme-forest': 300, 'theme-sunset': 300, 'theme-midnight': 500, 'theme-rose': 500 };
export const THEMES = ['violet', 'ocean', 'forest', 'sunset', 'midnight', 'rose'] as const;
export type ThemeId = (typeof THEMES)[number];
export const REPAIR_WINDOW_DAYS = 2;

export interface Purchase {
  id: string;
  kind: 'freeze' | 'repair' | 'cosmetic';
  /** For a cosmetic: which one (e.g. 'theme-ocean'). */
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
  /** Days covered by a freeze (❄). */
  freezeDays: string[];
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
}

/**
 * Walk day by day from the first practice day to today.
 * - Each Monday (and on the first day) a free freeze is added if fewer than MAX_FREEZES are equipped.
 * - A bought freeze is added on its purchase day (up to MAX_FREEZES).
 * - A missed day uses a freeze if one is equipped; otherwise the streak breaks.
 * - A repair bought within REPAIR_WINDOW_DAYS after a break restores the lost streak (the missed days count as repaired).
 */
export function streakState(practiceDays: Iterable<string>, purchases: Purchase[], today: string): StreakState {
  const days = new Set(practiceDays);
  const sorted = [...days].filter((d) => d <= today).sort();
  const empty: StreakState = { count: 0, practicedToday: false, freezes: 0, freezeDays: [], repairedDays: [], milestones: [], best: 0, repairable: null, next: { days: MILESTONES[0], left: MILESTONES[0] } };
  if (!sorted.length) return { ...empty, freezes: 1 };
  const byDay = new Map<string, Purchase[]>();
  for (const p of purchases) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);

  let count = 0;
  let best = 0;
  let freezes = 0;
  let lastWeek = '';
  const freezeDays: string[] = [];
  const repairedDays: string[] = [];
  const milestones: { days: number; day: string }[] = [];
  let broke: { lost: number; on: string; missed: string[] } | null = null;

  for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
    const wk = weekOf(d);
    if (wk !== lastWeek) {
      lastWeek = wk;
      if (freezes < MAX_FREEZES) freezes++;
    }
    for (const p of byDay.get(d) ?? []) {
      if (p.kind === 'freeze' && freezes < MAX_FREEZES) freezes++;
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
      if (count > 0 && freezes > 0) {
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
    repairedDays,
    milestones,
    best,
    repairable,
    next: nextDays ? { days: nextDays, left: nextDays - count } : null,
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

const priceOf = (p: Purchase) => (p.kind === 'cosmetic' ? (COSMETICS[p.item ?? ''] ?? 0) : PRICES[p.kind]);
export const gemsSpent = (purchases: Purchase[]) => purchases.reduce((a, p) => a + priceOf(p), 0);

/** Owned cosmetics (the default theme is always owned). */
export const ownsCosmetic = (purchases: Purchase[], item: string) => item === 'theme-violet' || purchases.some((p) => p.kind === 'cosmetic' && p.item === item);
export const canBuyCosmetic = (item: string, balance: number, purchases: Purchase[]) => item in COSMETICS && !ownsCosmetic(purchases, item) && balance >= COSMETICS[item];

/** Can this purchase be made now? */
export function canBuy(kind: 'freeze' | 'repair', balance: number, st: StreakState): boolean {
  if (balance < PRICES[kind]) return false;
  if (kind === 'freeze') return st.freezes < MAX_FREEZES;
  return st.repairable !== null;
}
