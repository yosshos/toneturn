// Ranks per area, area leaderboards and the monthly area challenge (docs/SPEC-STATS.md §9, owner 2026-11-07). Pure.
//
// One weekly XP league stays (effort). Ranks are about level, like chess.com ratings per time control:
// each of the 7 areas of the Skill Map, plus piano technique, has its own rank.
//
// MAPPING (area level L = domainLevel(domainValue) = 600 + 1000·v, i.e. the 600–1600 rating band):
//   15 divisions, 60 rating points each, from 600:  division d (0..14) starts at 600 + 60·d
//     Bronze   III 600 · II 660 · I 720          Silver   III 780 · II 840 · I 900  (≈ Developing)
//     Gold     III 960 · II 1020 · I 1080        Platinum III 1140 · II 1200 · I 1260  (≈ Solid 1150)
//     Diamond  III 1320 · II 1380 · I 1440 (≈ Advanced 1400)
//     Master   ≥ 1550 (division 15), the top
//   Technique (drill engine, family levels 0–7): technique level T = mean of the 3 best family levels
//   (missing = 0); division = min(14, ⌊2·T⌋), Master at T = 7 (three families at the top level).
//
// EVIDENCE (a division is reached only with enough answers in the area; placement sets do not count):
//   any rank    ≥ 20 rated answers and ≥ min(3, ⌈skills/2⌉) measured skills (n ≥ 8) in the area
//   Gold+ ≥ 50 answers · Platinum+ ≥ 100 · Diamond+ ≥ 200 · Master ≥ 300
//               (below that the division is capped at the tier's I: Silver I, Gold I, Platinum I, Diamond I)
//   (technique: the same thresholds counted in takes, and ≥ 1 family at level ≥ 1)
//
// NO DEMOTION below a division held for 7 days: per area { div, since, best, floor } — `floor` is the
// highest division ever held for ≥ 7 days in a row; the rank may drop when the level drops, never below it.

import type { SkillId } from './lesson';
import type { FamilyId } from './drills/types';
import { DOMAINS, domainValue, PROVISIONAL_UNTIL, type DomainId, type RatingEvent, type Ratings } from './rating';
import { canSeeLevels, type NOk, type ShareStats, type StatsDays } from './stats';

type L = { en: string; he: string };

// ======================================================================= divisions

export type RankArea = DomainId | 'technique';
export const RANK_AREAS: RankArea[] = [...DOMAINS.map((d) => d.id), 'technique'];
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
export const RANK_TIERS: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];
export const DIVISIONS = 15;
export const MASTER_DIV = 15;
export const DIV_BASE = 600;
export const DIV_STEP = 60;
export const MASTER_AT = 1550;
export const HOLD_DAYS = 7;

export const TIER_NAME: Record<RankTier, L> = {
  bronze: { en: 'Bronze', he: 'ארד' },
  silver: { en: 'Silver', he: 'כסף' },
  gold: { en: 'Gold', he: 'זהב' },
  platinum: { en: 'Platinum', he: 'פלטינה' },
  diamond: { en: 'Diamond', he: 'יהלום' },
  master: { en: 'Master', he: 'מאסטר' },
};
export const AREA_NAME: Record<RankArea, L> = {
  pitch: { en: 'Pitch & harmony', he: 'גובה והרמוניה' },
  time: { en: 'Rhythm & time', he: 'קצב וזמן' },
  memory: { en: 'Memory & structure', he: 'זיכרון ומבנה' },
  voice: { en: 'Voice', he: 'קול' },
  reading: { en: 'Reading & theory', he: 'קריאה ותיאוריה' },
  creative: { en: 'Creative & applied', he: 'יצירה ויישום' },
  instrument: { en: 'Instrument & sound', he: 'כלי וסאונד' },
  technique: { en: 'Technique', he: 'טכניקה' },
};
export const AREA_ICON: Record<RankArea, string> = { pitch: '🎵', time: '🥁', memory: '🧠', voice: '🎤', reading: '📖', creative: '🎨', instrument: '🎸', technique: '🎹' };

/** Lowest area level of a division (division 15 = Master). */
export const divFloor = (d: number) => (d >= MASTER_DIV ? MASTER_AT : DIV_BASE + DIV_STEP * Math.max(0, d));
/** Division of an area level 600..1600 (before the evidence cap). Monotonic non-decreasing. */
export function divisionFor(level: number): number {
  if (level >= MASTER_AT) return MASTER_DIV;
  return Math.max(0, Math.min(DIVISIONS - 1, Math.floor((level - DIV_BASE) / DIV_STEP)));
}
export const tierOfDiv = (d: number): RankTier => (d >= MASTER_DIV ? 'master' : RANK_TIERS[Math.max(0, Math.floor(d / 3))]);
/** "III" | "II" | "I" ("" for Master). */
export const romanOfDiv = (d: number) => (d >= MASTER_DIV ? '' : ['III', 'II', 'I'][Math.max(0, d) % 3]);
/** First division of a tier (Bronze III = 0 … Diamond III = 12, Master = 15). */
export const tierStart = (t: RankTier) => (t === 'master' ? MASTER_DIV : RANK_TIERS.indexOf(t) * 3);
export const rankLabel = (d: number | null | undefined, lang: 'en' | 'he') =>
  d === null || d === undefined || d < 0 ? (lang === 'he' ? 'ללא דירוג' : 'Unranked') : `${TIER_NAME[tierOfDiv(d)][lang]}${romanOfDiv(d) ? ` ${romanOfDiv(d)}` : ''}`;

// ======================================================================= evidence

export const EVIDENCE = { answers: 20, maxSkills: 3, gold: 50, platinum: 100, diamond: 200, master: 300 };

/** The highest division the evidence allows (−1 = not ranked yet). */
export function evidenceCap(answers: number, measured: number, needMeasured: number): number {
  if (answers < EVIDENCE.answers || measured < needMeasured) return -1;
  if (answers >= EVIDENCE.master) return MASTER_DIV;
  if (answers >= EVIDENCE.diamond) return 14;
  if (answers >= EVIDENCE.platinum) return 11;
  if (answers >= EVIDENCE.gold) return 8;
  return 5;
}

export interface AreaEvidence {
  answers: number;
  measured: number;
  needAnswers: number;
  needMeasured: number;
  /** Area level 600..1600 (null = nothing measured). */
  level: number | null;
}

const areaSkills = (a: DomainId): SkillId[] => DOMAINS.find((d) => d.id === a)!.skills.filter((k) => k !== 'absolute');

/** Evidence behind an area's rank: rated answers (placement credit removed) and measured skills. */
export function areaEvidence(ratings: Ratings, events: RatingEvent[], area: DomainId): AreaEvidence {
  const skills = areaSkills(area);
  const placed = new Set(events.filter((e) => e.set !== undefined).map((e) => e.skill));
  let answers = 0;
  let measured = 0;
  for (const k of skills) {
    const s = ratings[k];
    if (!s) continue;
    answers += Math.max(0, s.n - (placed.has(k) ? PROVISIONAL_UNTIL - 2 : 0));
    if (s.n >= PROVISIONAL_UNTIL) measured++;
  }
  const v = domainValue(ratings, area);
  return { answers, measured, needAnswers: EVIDENCE.answers, needMeasured: Math.min(EVIDENCE.maxSkills, Math.ceil(skills.length / 2)), level: v ? Math.round(DIV_BASE + v.v * 1000) : null };
}

/** The division an area deserves now (null = not ranked: no level or not enough evidence). */
export function areaTarget(ratings: Ratings, events: RatingEvent[], area: DomainId): number | null {
  const ev = areaEvidence(ratings, events, area);
  if (ev.level === null) return null;
  const cap = evidenceCap(ev.answers, ev.measured, ev.needMeasured);
  return cap < 0 ? null : Math.min(cap, divisionFor(ev.level));
}

// ======================================================================= technique

/** Technique input from the drill engine: family level 0–7 per family (e.g. familyLevel(states, f)) and clean/total takes. */
export interface TechniqueInput {
  levels: Partial<Record<FamilyId, number>>;
  takes: number;
}
/** Mean of the 3 best family levels (missing = 0), 0..7. */
export function techniqueLevel(levels: Partial<Record<FamilyId, number>>): number {
  const xs = Object.values(levels)
    .map((x) => Math.max(0, Math.min(7, x ?? 0)))
    .sort((a, b) => b - a);
  return ((xs[0] ?? 0) + (xs[1] ?? 0) + (xs[2] ?? 0)) / 3;
}
export function techniqueTarget(t: TechniqueInput | null | undefined): number | null {
  if (!t) return null;
  const families = Object.values(t.levels).filter((x) => (x ?? 0) >= 1).length;
  const cap = evidenceCap(t.takes, families, 1);
  if (cap < 0) return null;
  const lv = techniqueLevel(t.levels);
  return Math.min(cap, lv >= 7 ? MASTER_DIV : Math.min(DIVISIONS - 1, Math.floor(lv * 2)));
}

// ======================================================================= progress inside a rank (the promotion bar)

/**
 * Where an area stands inside its rank, game-style (owner 2026-11-07): the current division, a bar to the next one,
 * and what locks the next one. Never "full" below Master, so a good area never reads as finished.
 *   unranked → bar = answers toward the first rank (or 0 with no level)
 *   ranked   → bar = level progress from this division's floor to the next division's floor
 *   lock     → the level already reaches the next division but the evidence gate holds it (N more answers / takes)
 */
export interface RankProgress {
  /** Division shown (stored state wins: it may be held by the 7-day floor). null = not ranked yet. */
  div: number | null;
  /** 0..1 toward the next division (1 only at Master). */
  frac: number;
  /** Next division (null at Master). */
  next: number | null;
  /** Answers (or drill takes) still needed before the next division can be reached. */
  needAnswers?: number;
  /** Unranked: answers so far / needed for the first rank. */
  toFirst?: { answers: number; need: number };
}

const NEXT_GATE = (d: number): number | null => (d >= MASTER_DIV ? null : d + 1 >= MASTER_DIV ? EVIDENCE.master : d + 1 >= 12 ? EVIDENCE.diamond : d + 1 >= 9 ? EVIDENCE.platinum : d + 1 >= 6 ? EVIDENCE.gold : EVIDENCE.answers);

function progressOf(div: number | null, level: number | null, answers: number, need: number): RankProgress {
  if (div === null) return { div: null, frac: level === null ? 0 : Math.min(0.99, answers / need), next: 0, toFirst: { answers: Math.min(answers, need), need } };
  if (div >= MASTER_DIV) return { div, frac: 1, next: null };
  const lo = divFloor(div);
  const hi = divFloor(div + 1);
  const frac = level === null ? 0 : Math.max(0, Math.min(0.99, (level - lo) / (hi - lo)));
  const gate = NEXT_GATE(div) ?? 0;
  return { div, frac, next: div + 1, ...(answers < gate ? { needAnswers: gate - answers } : {}) };
}

/** Rank progress of a Skill Map area. `held` = the stored rank state (progress.ranks[area]). */
export function areaProgress(ratings: Ratings, events: RatingEvent[], area: DomainId, held?: RankState): RankProgress {
  const ev = areaEvidence(ratings, events, area);
  const div = held?.div ?? areaTarget(ratings, events, area);
  return progressOf(div, ev.level, ev.answers, ev.needAnswers);
}

/** Rank progress of technique: technique level T (0..7) maps to 2 divisions per level, i.e. "level" = 600 + 120·T. */
export function techniqueProgress(t: TechniqueInput | null | undefined, held?: RankState): RankProgress {
  const div = held?.div ?? techniqueTarget(t);
  const lv = t ? techniqueLevel(t.levels) : null;
  const level = lv === null ? null : lv >= 7 ? MASTER_AT : DIV_BASE + DIV_STEP * 2 * lv;
  return progressOf(div, level, t?.takes ?? 0, EVIDENCE.answers);
}

// ======================================================================= state + update (no demotion below a division held 7 days)

export interface RankState {
  /** Current division 0..15. */
  div: number;
  /** ISO time the current division was reached. */
  since: string;
  /** Best division ever. */
  best: number;
  /** Highest division held for ≥ 7 days: the rank never drops below it (−1 = none yet). */
  floor?: number;
}
export type Ranks = Partial<Record<RankArea, RankState>>;
export interface RankChange {
  area: RankArea;
  from: number | null;
  to: number;
  kind: 'new' | 'up' | 'down';
  /** A tier never reached before (Gold for the first time …) — the toast-worthy moments. */
  newTier: boolean;
}

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

/** One area's next state from its target division (null = not ranked now). Pure. */
export function stepRank(p: RankState | undefined, target: number | null, now: string): RankState | undefined {
  if (target === null) {
    if (!p) return undefined;
    const held = daysBetween(p.since, now) >= HOLD_DAYS;
    return held && (p.floor ?? -1) < p.div ? { ...p, floor: p.div } : p;
  }
  if (!p) return { div: target, since: now, best: target, floor: -1 };
  const held = daysBetween(p.since, now) >= HOLD_DAYS;
  const floor = Math.max(p.floor ?? -1, held ? p.div : -1);
  const div = Math.max(target, floor);
  return { div, since: div === p.div ? p.since : now, best: Math.max(p.best, div), floor };
}

/**
 * Update every area's rank after ratings changed (call after a session / drill set, and on app open).
 * `events` = the rating events kept in progress (placement sets are discounted from the evidence).
 */
export function updateRanks(prev: Ranks | undefined, ratings: Ratings, events: RatingEvent[], now: string, technique?: TechniqueInput | null): { ranks: Ranks; changes: RankChange[] } {
  const out: Ranks = {};
  const changes: RankChange[] = [];
  for (const a of RANK_AREAS) {
    const p = prev?.[a];
    const target = a === 'technique' ? (technique === undefined ? null : techniqueTarget(technique)) : areaTarget(ratings, events, a);
    const n = stepRank(p, target, now);
    if (!n) continue;
    out[a] = n;
    if (!p) changes.push({ area: a, from: null, to: n.div, kind: 'new', newTier: true });
    else if (n.div !== p.div) changes.push({ area: a, from: p.div, to: n.div, kind: n.div > p.div ? 'up' : 'down', newTier: n.div > p.div && tierOfDiv(n.div) !== tierOfDiv(p.best) && n.div > p.best });
  }
  return { ranks: out, changes };
}

/** Sync merge: per area the higher division (its since), the max best and floor. */
export function mergeRanks(a: Ranks | undefined, b: Ranks | undefined): Ranks {
  const out: Ranks = { ...(a ?? {}) };
  for (const [k, y] of Object.entries(b ?? {}) as [RankArea, RankState][]) {
    const x = out[k];
    if (!x) out[k] = y;
    else {
      const top = y.div > x.div || (y.div === x.div && y.since < x.since) ? y : x;
      out[k] = { div: top.div, since: top.since, best: Math.max(x.best, y.best), floor: Math.max(x.floor ?? -1, y.floor ?? -1) };
    }
  }
  return out;
}

/** Share-safe summary for the friend profile: division per area (only with `levels` sharing). */
export const shareableRanks = (r: Ranks | undefined, share: ShareStats | null | undefined): Partial<Record<RankArea, number>> | null =>
  canSeeLevels(share) ? (Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, v!.div])) as Partial<Record<RankArea, number>>) : null;

// ======================================================================= leaderboards per area (privacy S9)

export interface BoardPlayer {
  id: string;
  name: string;
  /** The player's own sharing setting (S9). `nothing` → hidden from the board. Absent = pre-0.38 (levels shared). */
  share?: ShareStats | null;
  /** Area levels 600..1600 (technique: level 0..7) as shared by the player's app. */
  levels?: Partial<Record<RankArea, number>> | null;
  /** Divisions as shared. */
  divs?: Partial<Record<RankArea, number>> | null;
}
export interface BoardRow {
  id: string;
  name: string;
  level: number | null;
  div: number | null;
  /** Competition ranking: ties share a place (1, 2, 2, 4). */
  place: number;
  me: boolean;
}
export interface Board {
  area: RankArea;
  rows: BoardRow[];
  /** Friends who do not share levels. */
  hidden: number;
  /** Friends sharing levels but not ranked in this area yet. */
  unranked: number;
  myPlace: number | null;
}

const scoreOf = (level: number | null, div: number | null, area: RankArea) =>
  level !== null ? (area === 'technique' ? level * 1000 : level) : div !== null ? (area === 'technique' ? (div / 2) * 1000 : divFloor(div)) : null;

/** A leaderboard of one area among friends (me always included; ties share a place, ordered by name). */
export function areaBoard(me: BoardPlayer, friends: BoardPlayer[], area: RankArea): Board {
  let hidden = 0;
  let unranked = 0;
  const seen = new Set<string>([me.id]);
  const raw: (Omit<BoardRow, 'place'> & { score: number })[] = [];
  const push = (p: BoardPlayer, isMe: boolean) => {
    const level = p.levels?.[area] ?? null;
    const div = p.divs?.[area] ?? (level !== null && area !== 'technique' ? divisionFor(level) : null);
    const score = scoreOf(level, div, area);
    if (score === null) {
      if (!isMe) unranked++;
      return;
    }
    raw.push({ id: p.id, name: p.name, level, div, me: isMe, score });
  };
  push(me, true);
  for (const f of friends) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    if (!canSeeLevels(f.share)) {
      hidden++;
      continue;
    }
    push(f, false);
  }
  raw.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const rows = raw.map(({ score, ...r }) => ({ ...r, place: 1 + raw.filter((x) => x.score > score).length }));
  return { area, rows, hidden, unranked, myPlace: rows.find((r) => r.me)?.place ?? null };
}

/** Players at your level (fallback without friends, S4): those within ±width of my level in this area. */
export function atYourLevel(me: BoardPlayer, pool: BoardPlayer[], area: RankArea, width = area === 'technique' ? 1 : 100): Board {
  const mine = me.levels?.[area];
  const near = mine === undefined ? [] : pool.filter((p) => p.levels?.[area] !== undefined && Math.abs(p.levels[area]! - mine) <= width);
  return areaBoard(me, near, area);
}

// ======================================================================= monthly area challenge

/** Rotation order (one area per month, deterministic; every area comes back every 7 months). */
export const CHALLENGE_ORDER: DomainId[] = ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'];
/** Right answers in the area this month for bronze / silver / gold (areas with less content: half). */
export const CHALLENGE_TIERS: [number, number, number] = [150, 400, 800];
const LIGHT_AREAS: DomainId[] = ['voice', 'creative', 'instrument'];

export interface AreaChallenge {
  /** "YYYY-MM" */
  month: string;
  area: DomainId;
  tiers: [number, number, number];
}
export interface ChallengeProgress {
  ch: AreaChallenge;
  /** Right answers in the area this month. */
  value: number;
  items: number;
  /** 0 = none, 1 bronze, 2 silver, 3 gold. */
  tier: number;
  next: number | null;
  /** 0..1 towards the next tier (1 when gold). */
  p: number;
}

const monthIndex = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
};
export function challengeFor(month: string): AreaChallenge {
  const area = CHALLENGE_ORDER[((monthIndex(month) % 7) + 7) % 7];
  const f = LIGHT_AREAS.includes(area) ? 0.5 : 1;
  return { month, area, tiers: CHALLENGE_TIERS.map((x) => Math.round((x * f) / 10) * 10) as [number, number, number] };
}
export function challengeProgress(ch: AreaChallenge, days: StatsDays | undefined): ChallengeProgress {
  let value = 0;
  let items = 0;
  for (const [day, d] of Object.entries(days ?? {})) {
    if (day.slice(0, 7) !== ch.month) continue;
    const x: NOk | undefined = d.byArea?.[ch.area];
    if (x) {
      items += x[0];
      value += x[1];
    }
  }
  const tier = ch.tiers.filter((t) => value >= t).length;
  const next = tier < 3 ? ch.tiers[tier] : null;
  return { ch, value, items, tier, next, p: next === null ? 1 : Math.min(1, value / next) };
}
/** Every month in the stats with a challenge tier reached (oldest first) — derived, nothing to store. */
export function completedChallenges(days: StatsDays | undefined): { month: string; area: DomainId; tier: number }[] {
  const months = [...new Set(Object.keys(days ?? {}).map((d) => d.slice(0, 7)))].sort();
  return months
    .map((m) => {
      const pr = challengeProgress(challengeFor(m), days);
      return { month: m, area: pr.ch.area, tier: pr.tier };
    })
    .filter((x) => x.tier > 0);
}
