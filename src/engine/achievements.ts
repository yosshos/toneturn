// Achievements with tiers (docs/SPEC-STATS.md §5, review pass S2, S7, S14, S21). Pure.
// Every rule has a source (a monotonic counter, a stored best or the based rating fold) and thresholds:
// four tiers bronze / silver / gold / diamond, three (bronze / silver / gold) or one (a single award).
// Earned tiers are kept in progress.awards (max tier, earliest date), so a source that later goes down
// (a level, a pruned list) never takes an award away.

import type { Progress } from '../storage/progress';
import { practiceDays } from '../storage/progress';
import { LESSON_ORDER } from './lesson';
import { DOMAINS, domainValue, overallRating, type Ratings } from './rating';
import { foldFromMemo, longestStreak, type AwardEntry, type Awards, type Counts, type CountKey, type PersonalRecords, type Peaks, type RatingBase, type StatsDays, type StatsHours } from './stats';

export type AwardCategory = 'practice' | 'path' | 'levels' | 'ear' | 'voice' | 'instrument' | 'games' | 'social' | 'memory' | 'learning';
export const AWARD_CATEGORIES: AwardCategory[] = ['practice', 'path', 'levels', 'ear', 'voice', 'instrument', 'games', 'social', 'memory', 'learning'];
export type TierName = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  icon: string;
  /** Done? (at least the first tier) */
  got: boolean;
  /** 0..1 towards the next tier (towards the first one while not got; 1 when every tier is reached). */
  progress: number;
  cat: AwardCategory;
  /** Tiers reached (0 = none). */
  tier: number;
  /** Thresholds, in order. */
  tiers: number[];
  /** The source value now (null = never measured, e.g. a "lower is better" best with no attempt). */
  value: number | null;
  /** The next threshold, or null when maxed. */
  next: number | null;
  lowerBetter: boolean;
  /** Earned date of the reached tier (from progress.awards), if stored. */
  at?: string;
  pre?: boolean;
}

/** Facts that live outside progress: the best league reached, the topics learned, friends, the best streak with freezes. */
export interface AchievementExtra {
  bestLeague?: number;
  learned?: number;
  lessonsTotal?: number;
  friends?: number;
  bestStreak?: number;
}

/** Progress with the 0.38 fields (optional until progress.ts declares them). */
export type ProgressStats = Progress & { counts?: Counts; statsDays?: StatsDays; awards?: Awards; ratingBase?: RatingBase; peaks?: Peaks; records?: PersonalRecords; statsHours?: StatsHours };

interface Ctx {
  p: ProgressStats;
  x: AchievementExtra;
  ratings: Ratings;
  c: Counts;
  days: Set<string>;
}
interface Rule {
  id: string;
  icon: string;
  cat: AwardCategory;
  tiers: number[];
  lowerBetter?: boolean;
  /** S14: the source field this rule reads (documentation / table). */
  source: string;
  value: (c: Ctx) => number | null;
}

const takes = (p: Progress) => p.vocal?.takes ?? [];
const cnt = (c: Ctx, k: CountKey) => c.c[k] ?? 0;
const bool = (b: boolean) => (b ? 1 : 0);
/** Level bands for level awards (S14). */
export const LEVEL_BANDS = [900, 1150, 1400, 1600];
const B4 = (a: number, b: number, c: number, d: number) => [a, b, c, d];

function areaBest(r: Ratings): number | null {
  let best: number | null = null;
  for (const d of DOMAINS) {
    const v = domainValue(r, d.id);
    if (v) best = Math.max(best ?? 0, Math.round(600 + v.v * 1000));
  }
  return best;
}
const historyPerfect = (p: Progress) => p.history.filter((h) => h.total >= 3 && h.firstTry === h.total).length;
const historyLessons = (p: Progress) => p.history.filter((h) => h.lessonId !== 'placement' && h.lessonId !== 'weekly-puzzle').length;

/** The rule table (S14): id, category, source, thresholds. */
export const RULES: Rule[] = [
  // Practice
  { id: 'first-lesson', icon: '🎵', cat: 'practice', tiers: [1], source: 'counts.lessons | history', value: (c) => Math.max(cnt(c, 'lessons'), c.p.history.length) },
  { id: 'ten-lessons', icon: '📚', cat: 'practice', tiers: B4(10, 50, 200, 1000), source: 'counts.lessons', value: (c) => Math.max(cnt(c, 'lessons'), historyLessons(c.p)) },
  { id: 'days', icon: '🔥', cat: 'practice', tiers: B4(7, 30, 100, 365), source: 'statsDays ∪ stats.days', value: (c) => c.days.size },
  { id: 'streak', icon: '⚡', cat: 'practice', tiers: B4(7, 30, 100, 365), source: 'best streak', value: (c) => Math.max(c.x.bestStreak ?? 0, longestStreak(c.days).n, c.p.streak.count) },
  { id: 'all-lessons', icon: '🗺️', cat: 'path', tiers: [LESSON_ORDER.length], source: 'lessons', value: (c) => LESSON_ORDER.filter((id) => (c.p.lessons[id]?.completions ?? 0) > 0).length },
  // Path
  { id: 'units', icon: '🧩', cat: 'path', tiers: B4(1, 10, 30, 60), source: 'counts.units', value: (c) => cnt(c, 'units') },
  { id: 'steps-test', icon: '✅', cat: 'path', tiers: B4(10, 50, 150, 300), source: 'counts.stepsByTest', value: (c) => cnt(c, 'stepsByTest') },
  { id: 'checkpoints', icon: '🏁', cat: 'path', tiers: B4(1, 10, 30, 60), source: 'counts.checkpoints3', value: (c) => cnt(c, 'checkpoints3') },
  // Levels
  { id: 'area-level', icon: '📈', cat: 'levels', tiers: LEVEL_BANDS, source: 'best area level', value: (c) => areaBest(c.ratings) },
  { id: 'all-areas', icon: '🧭', cat: 'levels', tiers: [DOMAINS.length], source: 'areas measured', value: (c) => DOMAINS.filter((d) => domainValue(c.ratings, d.id)).length },
  { id: 'overall', icon: '🎯', cat: 'levels', tiers: LEVEL_BANDS, source: 'overall level (peaks.overall)', value: (c) => Math.max(c.p.peaks?.overall?.r ?? 0, overallRating(c.ratings)?.r ?? 0) || null },
  // Ear
  { id: 'perfect-lesson', icon: '⭐', cat: 'ear', tiers: B4(1, 10, 50, 200), source: 'counts.perfect', value: (c) => Math.max(cnt(c, 'perfect'), historyPerfect(c.p)) },
  { id: 'fine-pitch', icon: '🎚️', cat: 'ear', tiers: [10], lowerBetter: true, source: 'counts.pitchCents', value: (c) => c.c.pitchCents ?? null },
  { id: 'mode-ear', icon: '👂', cat: 'ear', tiers: [1400], source: 'ratings.modes', value: (c) => Math.max(c.ratings.modes?.r ?? 0, c.p.peaks?.modes?.r ?? 0) || null },
  // Voice
  { id: 'vocal-ladder', icon: '🎤', cat: 'voice', tiers: [3, 6, 9, 11], source: 'vocal.passed', value: (c) => (c.p.vocal?.passed ?? []).filter((x) => x < 100).length },
  { id: 'mode-singer', icon: '🎼', cat: 'voice', tiers: [2, 4, 6, 8], source: 'vocal.passed', value: (c) => (c.p.vocal?.passed ?? []).filter((x) => x > 100).length },
  { id: 'octave-leap', icon: '🦘', cat: 'voice', tiers: [0.8], source: 'vocal.best', value: (c) => c.p.vocal?.best['v8-3'] ?? 0 },
  { id: 'steady-8', icon: '🧘', cat: 'voice', tiers: [8], source: 'vocal.takes | counts.steadySec', value: (c) => Math.max(cnt(c, 'steadySec'), 0, ...takes(c.p).filter((t) => (t.m.stability ?? 99) <= 12).map((t) => t.m.duration ?? 0)) },
  { id: 'even-vibrato', icon: '〰️', cat: 'voice', tiers: [1], source: 'vocal.takes', value: (c) => bool(takes(c.p).some((t) => t.m.vibratoRegularity !== undefined && t.m.vibratoRegularity <= 10 && (t.m.vibratoRate ?? 0) > 0)) },
  { id: 'range-map', icon: '📏', cat: 'voice', tiers: [5], source: 'vocal.rangeMap', value: (c) => Object.keys(c.p.vocal?.rangeMap ?? {}).length },
  // Instrument & sound
  { id: 'first-tuneup', icon: '🎸', cat: 'instrument', tiers: [1], source: 'counts.tuneUps', value: (c) => cnt(c, 'tuneUps') },
  { id: 'tuneup-5c', icon: '🎯', cat: 'instrument', tiers: [5], lowerBetter: true, source: 'counts.tuneUpCents', value: (c) => c.c.tuneUpCents ?? null },
  { id: 'fretboard-all', icon: '🎼', cat: 'instrument', tiers: [1], source: 'counts.fretboardAll', value: (c) => cnt(c, 'fretboardAll') },
  { id: 'eq-third', icon: '🎛️', cat: 'instrument', tiers: [1], source: 'counts.eqThird', value: (c) => cnt(c, 'eqThird') },
  { id: 'flight-100', icon: '✈️', cat: 'instrument', tiers: [100], source: 'counts.gates', value: (c) => cnt(c, 'gates') },
  // Games
  { id: 'echo-10', icon: '🔗', cat: 'games', tiers: B4(10, 15, 20, 25), source: 'games.melody', value: (c) => c.p.games?.melody ?? 0 },
  { id: 'beat-10', icon: '🥁', cat: 'games', tiers: B4(10, 15, 20, 25), source: 'games.rhythm', value: (c) => c.p.games?.rhythm ?? 0 },
  { id: 'highway-fc', icon: '🛣️', cat: 'games', tiers: [1], source: 'counts.highwayFC', value: (c) => cnt(c, 'highwayFC') },
  { id: 'name-tune-900', icon: '🎶', cat: 'games', tiers: [900], source: 'counts.nameTuneBest', value: (c) => cnt(c, 'nameTuneBest') },
  { id: 'tf-40', icon: '✓✗', cat: 'games', tiers: [40], source: 'tfBest', value: (c) => Math.max(0, ...Object.values(c.p.tfBest ?? {})) },
  { id: 'puzzle-gold', icon: '🥇', cat: 'games', tiers: [1], source: 'puzzles', value: (c) => bool(Object.values(c.p.puzzles ?? {}).some((x) => x.medal === 'gold')) },
  // Social
  { id: 'league-ninth', icon: '🎼', cat: 'social', tiers: [5], source: 'settings.bestLeague', value: (c) => c.x.bestLeague ?? 0 },
  { id: 'league-13', icon: '👑', cat: 'social', tiers: [7], source: 'settings.bestLeague', value: (c) => c.x.bestLeague ?? 0 },
  { id: 'duels-won', icon: '⚔️', cat: 'social', tiers: B4(1, 10, 50, 200), source: 'counts.duelsWon', value: (c) => cnt(c, 'duelsWon') },
  { id: 'friends', icon: '🤝', cat: 'social', tiers: B4(1, 5, 10, 25), source: 'counts.friends | friends list', value: (c) => Math.max(cnt(c, 'friends'), c.x.friends ?? 0) },
  // Memory
  { id: 'pitch-memory', icon: '🧠', cat: 'memory', tiers: [7, 30, 100], source: 'counts.pitchMemoryDays', value: (c) => cnt(c, 'pitchMemoryDays') },
  { id: 'pitch-memory-10c', icon: '🎯', cat: 'memory', tiers: [10], lowerBetter: true, source: 'counts.pitchMemoryCents', value: (c) => c.c.pitchMemoryCents ?? null },
  // Learning
  { id: 'learned-10', icon: '📚', cat: 'learning', tiers: [10], source: 'settings.learned', value: (c) => c.x.learned ?? 0 },
  { id: 'learned-all', icon: '🎓', cat: 'learning', tiers: [1], source: 'settings.learned', value: (c) => (c.x.lessonsTotal ? (c.x.learned ?? 0) / c.x.lessonsTotal : 0) },
];

export const ACHIEVEMENT_IDS = RULES.map((r) => r.id);

export function tierNames(n: number): TierName[] {
  return n >= 4 ? ['bronze', 'silver', 'gold', 'diamond'] : n === 3 ? ['bronze', 'silver', 'gold'] : n === 2 ? ['silver', 'gold'] : ['gold'];
}
/** The reached tier's name (null = none). */
export const tierName = (a: Pick<Achievement, 'tier' | 'tiers'>): TierName | null => (a.tier ? tierNames(a.tiers.length)[a.tier - 1] : null);

/** Tiers reached by a value. */
export function tierOf(value: number | null, tiers: number[], lowerBetter = false): number {
  if (value === null) return 0;
  let t = 0;
  tiers.forEach((th, i) => {
    if (lowerBetter ? value <= th : value >= th) t = i + 1;
  });
  return t;
}
function progressTo(value: number | null, target: number, lowerBetter: boolean): number {
  if (value === null) return 0;
  if (lowerBetter) return value <= target ? 1 : Math.max(0, Math.min(1, target / value));
  return Math.max(0, Math.min(1, value / target));
}

function ctxOf(p: ProgressStats, x: AchievementExtra): Ctx {
  const days = new Set<string>(practiceDays(p));
  for (const [d, s] of Object.entries(p.statsDays ?? {})) if (s.items > 0 || s.sessions > 0) days.add(d);
  return { p, x, ratings: foldFromMemo(p.ratingBase, p.ratingEvents ?? []), c: p.counts ?? {}, days };
}

export function achievements(p: Progress, x: AchievementExtra = {}): Achievement[] {
  const ps = p as ProgressStats;
  const c = ctxOf(ps, x);
  return RULES.map((r) => {
    const value = r.value(c);
    const stored = ps.awards?.[r.id];
    const tier = Math.max(tierOf(value, r.tiers, r.lowerBetter), Math.min(stored?.tier ?? 0, r.tiers.length));
    const next = tier < r.tiers.length ? r.tiers[tier] : null;
    const progress = next === null ? 1 : progressTo(value, next, !!r.lowerBetter);
    return { id: r.id, icon: r.icon, cat: r.cat, got: tier > 0, progress, tier, tiers: r.tiers, value, next, lowerBetter: !!r.lowerBetter, ...(stored && stored.tier >= tier ? { at: stored.at, ...(stored.pre ? { pre: true } : {}) } : {}) };
  });
}

/** S21: the awards closest to their next tier (started, not finished), best first. */
export function closestToUnlock(list: Achievement[], n = 3): Achievement[] {
  return list
    .filter((a) => a.next !== null && a.progress > 0 && a.progress < 1)
    .sort((a, b) => b.progress - a.progress || a.tier - b.tier || a.id.localeCompare(b.id))
    .slice(0, n);
}

/**
 * Store newly reached tiers. Returns the new awards map and what was newly earned (for the toast; the caller
 * shows it after the question / session, never during one, and not at all with cleanView).
 */
export function earnAwards(awards: Awards | undefined, list: Achievement[], at: string, opts: { pre?: boolean } = {}): { awards: Awards; newly: { id: string; tier: number }[] } {
  const out: Awards = { ...(awards ?? {}) };
  const newly: { id: string; tier: number }[] = [];
  for (const a of list) {
    if (a.tier > (out[a.id]?.tier ?? 0)) {
      out[a.id] = { tier: a.tier, at, ...(opts.pre ? { pre: true } : {}) };
      newly.push({ id: a.id, tier: a.tier });
    }
  }
  return { awards: out, newly };
}

/**
 * S7, first launch of 0.38: award everything already earned silently, dated "before 0.38".
 * Returns the awards and the count for the single summary toast (0 = no toast).
 */
export function firstLaunchAwards(p: Progress, x: AchievementExtra, at: string): { awards: Awards; count: number } {
  const ps = p as ProgressStats;
  const { awards, newly } = earnAwards(ps.awards, achievements(p, x), at, { pre: true });
  return { awards, count: newly.length };
}

/** Sync merge (S2/S3): per id the highest tier; for equal tiers the earliest date; "before 0.38" sticks. */
export function mergeAwards(a: Awards | undefined, b: Awards | undefined): Awards {
  const out: Awards = { ...(a ?? {}) };
  for (const [id, y] of Object.entries(b ?? {})) {
    const x: AwardEntry | undefined = out[id];
    if (!x || y.tier > x.tier) out[id] = y;
    else if (y.tier === x.tier) out[id] = { tier: x.tier, at: y.at < x.at ? y.at : x.at, ...(x.pre || y.pre ? { pre: true } : {}) };
  }
  return out;
}

