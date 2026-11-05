// Online tournament rooms (spec I): backend contract + Supabase implementation.
// The server holds the answer key and grades; clients regenerate the stimuli from (kind, rounds, seed).

import type { SetKind } from '../engine/tournament';
import { supabase } from './cloud';

export interface RoomPlayer {
  userId: string;
  nickname: string;
  /** Has answered the current round. */
  answered: boolean;
  /** Overall rating (spec L), when the server provides it. */
  rating?: number | null;
  ratingProvisional?: boolean;
  /** Big-screen host: shows the game, does not play. */
  spectator?: boolean;
}

export interface RoomRoundResult {
  round: number;
  key: string;
  answers: { userId: string; answer: string | null; timeMs: number | null; correct: boolean; points: number }[];
}

export interface RoomSnapshot {
  id: string;
  code: string;
  host: string;
  kind: SetKind;
  rounds: number;
  seed: number;
  windowMs: number;
  state: 'lobby' | 'playing' | 'over';
  round: number;
  roundOpen: boolean;
  answered: number;
  me: string;
  players: RoomPlayer[];
  /** Closed rounds only, oldest first. */
  results: RoomRoundResult[];
  /** Big-screen mode (spec R): the host device shows the game and plays the sound; phones answer. */
  hostScreen?: boolean;
}

export interface CreateOptions {
  windowMs?: number;
  hostScreen?: boolean;
}

export interface RoomBackend {
  create(kind: SetKind, rounds: number, seed: number, keys: string[], nick: string, opts?: CreateOptions): Promise<{ id: string; code: string }>;
  join(code: string, nick: string): Promise<string>;
  state(id: string): Promise<RoomSnapshot>;
  startRound(id: string, round: number): Promise<void>;
  close(id: string, round: number, force: boolean): Promise<void>;
  answer(id: string, round: number, answer: string | null, timeMs: number | null): Promise<void>;
  /** Called on any change of the room row (Realtime). Returns an unsubscribe function. */
  subscribe(id: string, onChange: () => void): () => void;
}

export type RoomErrorCode = 'not-found' | 'started' | 'full' | 'sign-in' | 'other';
export class RoomError extends Error {
  constructor(public code: RoomErrorCode, message: string) {
    super(message);
  }
}
export function roomErrorCode(msg: string): RoomErrorCode {
  if (/not found/i.test(msg)) return 'not-found';
  if (/already started/i.test(msg)) return 'started';
  if (/full/i.test(msg)) return 'full';
  if (/sign in/i.test(msg)) return 'sign-in';
  return 'other';
}

export const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const normaliseCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

interface RawState {
  id: string;
  code: string;
  host: string;
  kind: SetKind;
  rounds: number;
  seed: number;
  window_ms: number;
  state: RoomSnapshot['state'];
  round: number;
  round_open: boolean;
  answered: number;
  me: string;
  players: { user_id: string; nickname: string; answered: boolean; rating?: number | null; rating_provisional?: boolean | null; spectator?: boolean }[];
  host_screen?: boolean;
  results: { round: number; key: string; answers: { user_id: string; answer: string | null; time_ms: number | null; correct: boolean; points: number }[] }[];
}

export function fromRaw(r: RawState): RoomSnapshot {
  return {
    id: r.id,
    code: r.code,
    host: r.host,
    kind: r.kind,
    rounds: r.rounds,
    seed: Number(r.seed),
    windowMs: r.window_ms,
    state: r.state,
    round: r.round,
    roundOpen: r.round_open,
    answered: r.answered,
    me: r.me,
    players: r.players.map((p) => ({ userId: p.user_id, nickname: p.nickname, answered: p.answered, rating: p.rating ?? null, ratingProvisional: !!p.rating_provisional, spectator: !!p.spectator })),
    hostScreen: !!r.host_screen,
    results: r.results.map((x) => ({
      round: x.round,
      key: x.key,
      answers: x.answers.map((a) => ({ userId: a.user_id, answer: a.answer, timeMs: a.time_ms, correct: a.correct, points: a.points })),
    })),
  };
}

export function supabaseRooms(): RoomBackend | null {
  const sb = supabase();
  if (!sb) return null;
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new RoomError(roomErrorCode(error.message), error.message);
    return data as T;
  };
  return {
    async create(kind, rounds, seed, keys, nick, opts = {}) {
      const rows = await rpc<{ id: string; code: string }[]>('toneturn_room_create_v2', {
        p_kind: kind,
        p_rounds: rounds,
        p_seed: seed,
        p_keys: keys,
        p_nick: nick,
        p_window_ms: opts.windowMs ?? 10_000,
        p_host_screen: !!opts.hostScreen,
      });
      return rows[0];
    },
    join: (code, nick) => rpc<string>('toneturn_room_join', { p_code: code, p_nick: nick }),
    state: async (id) => fromRaw(await rpc<RawState>('toneturn_room_state', { p_room: id })),
    startRound: (id, round) => rpc<void>('toneturn_room_start_round', { p_room: id, p_round: round }),
    close: (id, round, force) => rpc<void>('toneturn_room_close', { p_room: id, p_round: round, p_force: force }),
    answer: (id, round, answer, timeMs) => rpc<void>('toneturn_room_answer', { p_room: id, p_round: round, p_answer: answer, p_time_ms: timeMs }),
    subscribe(id, onChange) {
      const ch = sb
        .channel(`toneturn-room-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'toneturn_rooms', filter: `id=eq.${id}` }, () => onChange())
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
