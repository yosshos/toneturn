// Groove-off (DRUMS_NICHE_PLAN §3, P2): an asynchronous drum duel. Two friends play the same seeded three grooves, each
// at their own time, and compare measured scores (the verdict, the per-limb timing, the tempo reached).
//
// First, the per-course DRUM LEVEL it needs: from the drum ladder (the technique facts — levels done by measured takes,
// plan.levelStars ≥ 3 stars), never from self-report or game XP. Done groove levels across the style families
// (rock, funk, shuffle, Latin, jazz, Middle East, independence) give a tier pp … ff; the challenger's tier rides in the
// duel's seed (gameTiers.tierSeed), so both players get the same grooves.
//
// Without the server (no sign-in, or the 'groove' duel kind not yet in the database) the duel stays local: a short
// challenge code carries the seed and the challenger's points; the friend plays the code and gets a reply code.
// Pure.

import type { Drill, DrillSettings, ItemState, Limb, TakeMetrics } from './drills/types';
import { drumFamilies, type DrumLevelDef } from './drills/drums';
import { DRUM_TIERS } from './drills/drumAnalyze';
import { levelDrills, levelStars, LEVEL_DONE_STARS } from './drills/plan';
import { DYN_NAMES, seedTier, tierSeed, type DynName } from './gameTiers';
import { rnd } from './drills/drums';

type Bi = { en: string; he: string };
const t = (en: string, he: string): Bi => ({ en, he });

// ───────────────────────────── the drum level (from the ladder) ─────────────────────────────

/** The style families whose done levels make the drum level. */
export const GROOVE_FAMILIES = ['d-rock', 'd-funk', 'd-shuffle', 'd-latin', 'd-jazz', 'd-mideast', 'd-indep'];
/** Done groove levels needed for each tier (pp … ff). */
export const LEVEL_FROM = [0, 2, 5, 9, 14, 20];

export interface DrumLevel {
  tier: DynName;
  /** Groove levels done (≥ 3 stars by measured takes). */
  done: number;
  /** Highest done level per style family (0 = none yet). */
  top: Record<string, number>;
  /** Done levels still needed for the next tier (0 at ff). */
  toNext: number;
}

/** The player's drum level from the ladder's facts (measured takes only). */
export function drumLevel(items: Record<string, ItemState>, order: DrillSettings['keyOrder'] = 'fifths-up', fams = drumFamilies()): DrumLevel {
  const top: Record<string, number> = {};
  let done = 0;
  for (const f of fams) {
    if (!GROOVE_FAMILIES.includes(f.id)) continue;
    top[f.id] = 0;
    for (const lv of f.levels) {
      if (levelStars(lv, items, order) < LEVEL_DONE_STARS) continue;
      done++;
      top[f.id] = Math.max(top[f.id], lv.level);
    }
  }
  let i = 0;
  LEVEL_FROM.forEach((from, k) => {
    if (done >= from) i = k;
  });
  return { tier: DYN_NAMES[i], done, top, toNext: i < LEVEL_FROM.length - 1 ? LEVEL_FROM[i + 1] - done : 0 };
}

// ───────────────────────────── the challenge ─────────────────────────────

/** Groove levels a tier draws from (not the teacher-check Latin levels, nothing with a call to listen to). */
export const GROOVE_POOL: Record<DynName, string[]> = {
  pp: ['d-rock-1', 'd-rock-2'],
  p: ['d-rock-3', 'd-rock-5', 'd-funk-2', 'd-shuffle-1'],
  mp: ['d-funk-3', 'd-shuffle-2', 'd-rock-7', 'd-mideast-1', 'd-latin-1'],
  mf: ['d-funk-4', 'd-shuffle-4', 'd-latin-2', 'd-latin-3', 'd-mideast-4', 'd-jazz-2'],
  f: ['d-funk-5', 'd-latin-4', 'd-latin-5', 'd-jazz-3', 'd-mideast-5', 'd-shuffle-6'],
  ff: ['d-funk-8', 'd-funk-6', 'd-latin-6', 'd-latin-7', 'd-jazz-5', 'd-mideast-7'],
};
export const GROOVE_OFF_ROUNDS = 3;
/** Most points one round can give (a clean take with tight time). */
export const ROUND_MAX = 130;

let BY_ID: Map<string, DrumLevelDef> | null = null;
function levelById(id: string): DrumLevelDef | undefined {
  if (!BY_ID) BY_ID = new Map(drumFamilies().flatMap((f) => f.levels.map((l) => [l.id, l] as [string, DrumLevelDef])));
  return BY_ID.get(id);
}

export interface GrooveRound {
  round: number;
  levelId: string;
  drill: Drill;
  /** The round's tempo: the level's start tempo, its middle, then its target (the tempo reached is the last passed). */
  bpm: number;
}

/** The three rounds of a challenge: the same for both players (seed → tier → grooves and tempos). */
export function grooveOffRounds(seed: number): GrooveRound[] {
  const tier = seedTier(seed);
  const pool = GROOVE_POOL[tier];
  const r = rnd(`grooveoff:${seed >>> 0}`);
  const ids = pool.map((id) => ({ id, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.id);
  return Array.from({ length: GROOVE_OFF_ROUNDS }, (_, k) => {
    const id = ids[k % ids.length];
    const lv = levelById(id)!;
    const ds = levelDrills(lv, 'fifths-up');
    const drill = ds[Math.floor(r() * ds.length)];
    const [lo, hi] = lv.tempo ?? [drill.startBpm, drill.startBpm];
    const bpm = Math.round(lo + ((hi - lo) * k) / (GROOVE_OFF_ROUNDS - 1));
    return { round: k, levelId: id, drill, bpm };
  });
}

/** A new challenge's seed at the challenger's tier. */
export const newGrooveSeed = (tier: DynName, base = (Math.random() * 2 ** 32) >>> 0): number => tierSeed(base, tier);

export type LimbMark = 'ok' | 'loose' | 'none';
export interface GrooveScore {
  points: number;
  ok: boolean;
  limbs: { limb: Limb; mark: LimbMark; sd: number | null }[];
  line: Bi;
}

/** One round: clean 100 / almost 60 / not 0, plus up to 30 for tight time (the worst limb's SD under 30 ms). */
export function scoreGrooveRound(g: GrooveRound, m: TakeMetrics): GrooveScore {
  const T = DRUM_TIERS[g.drill.drum?.tier ?? 1];
  const limbs = (m.drum?.limbs ?? []).map((l) => ({ limb: l.limb, sd: l.sd, mark: (l.of === 0 ? 'none' : l.n / l.of >= T.hit - 0.05 && (l.sd === null || l.sd <= T.sd) ? 'ok' : 'loose') as LimbMark }));
  const base = m.verdict === 'clean' ? 100 : m.verdict === 'almost' ? 60 : 0;
  const sds = limbs.filter((l) => l.mark !== 'none' && l.sd !== null).map((l) => l.sd!);
  const worst = sds.length ? Math.max(...sds) : 30;
  const points = base ? Math.min(ROUND_MAX, base + Math.max(0, Math.round(30 - worst))) : 0;
  const ok = m.verdict !== 'not';
  return { points, ok, limbs, line: ok ? t(`♩${g.bpm} · ${points} points.`, `♩${g.bpm} · ${points} נקודות.`) : m.why };
}

/** The tempo reached: the fastest round passed (null: none). */
export const tempoReached = (rounds: GrooveRound[], scores: { ok: boolean }[]): number | null => {
  const ok = rounds.filter((_, i) => scores[i]?.ok).map((r) => r.bpm);
  return ok.length ? Math.max(...ok) : null;
};

/** Who won: 1 me, -1 them, 0 a tie (equal totals: the higher tempo reached wins, then a tie). */
export function grooveWinner(mine: number[], theirs: number[], rounds?: GrooveRound[]): 1 | -1 | 0 {
  const a = mine.reduce((x, y) => x + y, 0);
  const b = theirs.reduce((x, y) => x + y, 0);
  if (a !== b) return a > b ? 1 : -1;
  if (rounds) {
    const ta = tempoReached(rounds, mine.map((p) => ({ ok: p > 0 }))) ?? 0;
    const tb = tempoReached(rounds, theirs.map((p) => ({ ok: p > 0 }))) ?? 0;
    if (ta !== tb) return ta > tb ? 1 : -1;
  }
  return 0;
}

/** The run's detail for the game tiers / XP (as the drum games: right / wrong rounds, accuracy). */
export function grooveRunDetail(seed: number, scores: GrooveScore[]): { score: number; detail: Record<string, unknown> } {
  const right = scores.filter((s) => s.ok).length;
  return { score: scores.reduce((a, s) => a + s.points, 0), detail: { right, wrong: scores.length - right, accuracy: scores.length ? Math.round((right / scores.length) * 100) : 0, tier: seedTier(seed), rounds: scores.length } };
}

// ───────────────────────────── the local challenge code ─────────────────────────────

/** A local duel: the seed and the points of whoever played it (a challenge, or a reply). */
export interface GrooveCode {
  seed: number;
  points: number[];
}
const PREFIX = 'GO1';
/** "GO1-<seed base36>-<p1>.<p2>.<p3>" — short enough to read out or paste in a chat. */
export function encodeGrooveCode(c: GrooveCode): string {
  return `${PREFIX}-${(c.seed >>> 0).toString(36).toUpperCase()}-${c.points.map((p) => Math.max(0, Math.min(ROUND_MAX, Math.round(p))).toString(36).toUpperCase()).join('.')}`;
}
export function decodeGrooveCode(raw: string): GrooveCode | null {
  const m = /^GO1-([0-9A-Z]{1,7})-([0-9A-Z]{1,2}(?:\.[0-9A-Z]{1,2}){0,2})$/i.exec(raw.trim());
  if (!m) return null;
  const seed = parseInt(m[1], 36);
  if (!(seed >= 0 && seed < 2 ** 32)) return null;
  const points = m[2].split('.').map((x) => parseInt(x, 36));
  if (points.length !== GROOVE_OFF_ROUNDS || points.some((p) => !(p >= 0 && p <= ROUND_MAX))) return null;
  return { seed, points };
}

