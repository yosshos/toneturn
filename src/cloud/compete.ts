// Weekly leagues, asynchronous friend duels, weekly-puzzle and daily "players at your level" stats
// (spec S.7, S.8, challenge modes 2–4, L.5). All need sign-in; every call fails soft when the server
// does not have migration 18 yet (callers show nothing).

import { supabase } from './cloud';
import { tournamentSet, type SetKind } from '../engine/tournament';
import { tierIndex, tierKey, type DynName } from '../engine/gameTiers';

/** A game's best of the week at a tier (GAMES_TIERS_PLAN §5.1 game boards). Silent until migration
 *  20261128000000_toneturn_game_tiers.sql is applied (the RPC is missing → nothing happens). */
export async function submitGameBest(game: string, tier: DynName, score: number): Promise<void> {
  const sb = supabase();
  if (!sb || !(score > 0)) return;
  try {
    await sb.rpc('toneturn_game_best_submit', { p_game: tierKey(game), p_tier: tierIndex(tier), p_score: Math.round(score) });
  } catch {
    /* older server */
  }
}

/** Me and my friends at a game and tier this week (null when the server has no game boards yet). */
export async function gameBoard(game: string, tier: DynName): Promise<{ name: string; best: number; me: boolean }[] | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_game_board', { p_game: tierKey(game), p_tier: tierIndex(tier) });
  return error ? null : (data as { name: string; best: number; me: boolean }[]);
}

export interface LeagueMember {
  name: string;
  xp: number;
  me: boolean;
}
export interface League {
  week: string;
  endsAt: string;
  tier: number; // 1 Root … 5 Ninth … 7 13 (spec Y)
  cohort: number;
  /** Highest league ever reached (null on servers before migration 20). */
  bestTier: number | null;
  members: LeagueMember[];
}
export { leagueZone } from '../engine/league';

export async function myLeague(): Promise<League | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_league');
  if (error || !data) return null;
  const d = data as { week: string; ends_at: string; tier: number; cohort: number; best_tier?: number; members: LeagueMember[] };
  return { week: d.week, endsAt: d.ends_at, tier: d.tier, cohort: d.cohort, bestTier: d.best_tier ?? null, members: d.members ?? [] };
}


export type DuelKind = Extract<SetKind, 'mixed' | 'degrees' | 'chords' | 'intervals' | 'modes' | 'wrong-notes' | 'truefalse' | 'beat' | 'jazz'>;
export interface DuelRow {
  id: string;
  kind: DuelKind;
  seed: number;
  rounds: number;
  createdAt: string;
  iChallenged: boolean;
  other: string;
  myPoints: number | null;
  theirPoints: number | null;
}

export async function createDuel(opponent: string, kind: DuelKind, seed = (Math.random() * 2 ** 32) >>> 0, rounds = 3): Promise<{ id: string; seed: number } | null> {
  const sb = supabase();
  if (!sb) return null;
  const keys = tournamentSet(kind, rounds, seed).map((q) => String(q.answer));
  const { data, error } = await sb.rpc('toneturn_duel_create', { p_opponent: opponent, p_kind: kind, p_seed: seed, p_keys: keys });
  if (error) throw error;
  return { id: data as string, seed };
}

export async function submitDuel(id: string, answers: (string | null)[], times: (number | null)[]): Promise<number | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_duel_submit', { p_id: id, p_answers: answers, p_times: times });
  if (error) throw error;
  return data as number | null;
}

export async function myDuels(): Promise<DuelRow[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('toneturn_duels_mine');
  if (error || !data) return [];
  return (data as { id: string; kind: DuelKind; seed: number; rounds: number; created_at: string; i_challenged: boolean; other: string; my_points: number | null; their_points: number | null }[]).map((d) => ({
    id: d.id,
    kind: d.kind,
    seed: Number(d.seed),
    rounds: d.rounds,
    createdAt: d.created_at,
    iChallenged: d.i_challenged,
    other: d.other,
    myPoints: d.my_points,
    theirPoints: d.their_points,
  }));
}

export async function reportPuzzle(week: string, band: string, medal: 'gold' | 'silver' | 'none', timeMs: number | null): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.rpc('toneturn_puzzle_submit', { p_week: week, p_band: band, p_medal: medal, p_time_ms: timeMs });
}

export interface LevelStats {
  players: number;
  gold?: number;
  silver?: number;
  medianMs: number | null;
  medianPoints?: number | null;
}

export async function puzzleStats(week: string, band: string): Promise<LevelStats | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_puzzle_stats', { p_week: week, p_band: band });
  if (error || !data) return null;
  const d = data as { players: number; gold: number; silver: number; median_ms: number | null };
  return { players: d.players, gold: d.gold, silver: d.silver, medianMs: d.median_ms };
}

export async function dailyPeers(day: string): Promise<LevelStats | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_daily_peers', { p_day: day });
  if (error || !data) return null;
  const d = data as { players: number; median_points: number | null; median_ms: number | null };
  return { players: d.players, medianPoints: d.median_points, medianMs: d.median_ms };
}
