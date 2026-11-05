// Daily challenge leaderboard (server-graded first play per day; friends board).

import { DAILY_VERSION } from '../engine/tournament';
import { supabase } from './cloud';

export interface DailyBoard {
  day: string;
  players: number;
  me: { points: number; correct: number; squares: string; rank: number; topPercent: number } | null;
  friends: { name: string; points: number; squares: string; me: boolean; rating?: number | null; rating_provisional?: boolean | null }[];
}

interface RawBoard {
  day: string;
  players: number;
  me: { points: number; correct: number; squares: string; rank: number; top_percent: number } | null;
  friends: { name: string; points: number; squares: string; me: boolean; rating?: number | null; rating_provisional?: boolean | null }[];
}

export const boardFromRaw = (r: RawBoard): DailyBoard => ({
  day: r.day,
  players: r.players,
  me: r.me && { points: r.me.points, correct: r.me.correct, squares: r.me.squares, rank: r.me.rank, topPercent: r.me.top_percent },
  friends: r.friends,
});

export async function submitDaily(day: string, answers: (string | null)[], times: (number | null)[]): Promise<DailyBoard | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_daily_submit', { p_day: day, p_version: DAILY_VERSION, p_answers: answers, p_times: times });
  if (error) throw error;
  return boardFromRaw(data as RawBoard);
}

export async function dailyBoard(day: string): Promise<DailyBoard | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_daily_board', { p_day: day });
  if (error) throw error;
  return boardFromRaw(data as RawBoard);
}
