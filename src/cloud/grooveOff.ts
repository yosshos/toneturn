// Groove-off duels on the server (engine/grooveOff.ts). They ride the existing friend duels with kind 'groove': the
// keys are only round markers, the answers carry each round's measured points (the server sums them, clamped —
// supabase/migrations/20261129000000_toneturn_groove_duels.sql). Until that migration is applied, creating one fails
// (the kind check) and the screen falls back to the local challenge code — nothing is lost.
import { supabase } from './cloud';
import { myDuels } from './compete';
import { GROOVE_OFF_ROUNDS, ROUND_MAX } from '../engine/grooveOff';

export interface GrooveDuelRow {
  id: string;
  seed: number;
  createdAt: string;
  iChallenged: boolean;
  other: string;
  myPoints: number | null;
  theirPoints: number | null;
}

/** A groove duel with a friend; null when signed out or the server has no groove duels yet. */
export async function createGrooveDuel(opponent: string, seed: number): Promise<{ id: string; seed: number } | null> {
  const sb = supabase();
  if (!sb) return null;
  const keys = Array.from({ length: GROOVE_OFF_ROUNDS }, (_, i) => `r${i + 1}`);
  const { data, error } = await sb.rpc('toneturn_duel_create', { p_opponent: opponent, p_kind: 'groove', p_seed: seed, p_keys: keys });
  if (error || !data) return null;
  return { id: data as string, seed };
}

/** Send my measured round points; null when it did not reach the server. */
export async function submitGrooveDuel(id: string, points: number[]): Promise<number | null> {
  const sb = supabase();
  if (!sb) return null;
  const answers = points.map((p) => String(Math.max(0, Math.min(ROUND_MAX, Math.round(p)))));
  const { data, error } = await sb.rpc('toneturn_duel_submit', { p_id: id, p_answers: answers, p_times: points.map(() => 0) });
  if (error) return null;
  return data as number | null;
}

/** My groove duels (the other duel kinds stay on the Duels tab). */
export async function myGrooveDuels(): Promise<GrooveDuelRow[]> {
  const rows = await myDuels().catch(() => []);
  return rows.filter((d) => (d.kind as string) === 'groove').map(({ id, seed, createdAt, iChallenged, other, myPoints, theirPoints }) => ({ id, seed, createdAt, iChallenged, other, myPoints, theirPoints }));
}
