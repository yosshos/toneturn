// In-memory room server with the same rules as the SQL functions (supabase/migrations/*_toneturn_rooms.sql).
// Used by unit tests and by the dev-only "?fakeRooms" mode (with bot opponents) for end-to-end tests.

import { RoomError, roomErrorCode, type RoomBackend, type RoomSnapshot } from '../cloud/rooms';
import type { SetKind } from '../engine/tournament';
import { tournamentPoints } from '../engine/scoring';

interface Room {
  id: string;
  code: string;
  host: string;
  kind: SetKind;
  rounds: number;
  seed: number;
  windowMs: number;
  state: RoomSnapshot['state'];
  round: number;
  roundOpen: boolean;
  startedAt: number;
  closedAt: number | null;
  answered: number;
  keys: string[];
  players: { userId: string; nickname: string; spectator?: boolean }[];
  hostScreen: boolean;
  answers: { round: number; userId: string; answer: string | null; timeMs: number | null; correct: boolean; points: number }[];
}

const fail = (msg: string): never => {
  throw new RoomError(roomErrorCode(msg), msg);
};
const nick = (s: string) => s.trim().slice(0, 16) || 'Player';

export class FakeRoomServer {
  rooms = new Map<string, Room>();
  private listeners = new Map<string, Set<() => void>>();
  private n = 0;
  constructor(private now: () => number = () => Date.now()) {}

  private changed(id: string) {
    queueMicrotask(() => this.listeners.get(id)?.forEach((l) => l()));
  }
  private member(id: string, me: string): Room {
    const r = this.rooms.get(id);
    if (!r || !r.players.some((p) => p.userId === me)) fail('not in this room');
    return r!;
  }
  private closeRound(r: Room) {
    r.roundOpen = false;
    r.closedAt = this.now();
    r.state = r.round >= r.rounds - 1 ? 'over' : 'playing';
  }

  /** Answer key of a room (bots only). */
  keyOf(id: string, round: number) {
    return this.rooms.get(id)?.keys[round];
  }

  client(me: string): RoomBackend {
    return {
      create: async (kind, rounds, seed, keys, name, opts = {}) => {
        if (keys.length !== rounds) fail('answer key does not match rounds');
        const id = `room-${++this.n}`;
        const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = `TEST${A[Math.floor(this.n / 32) % 32]}${A[this.n % 32]}`;
        this.rooms.set(id, {
          id, code, host: me, kind, rounds, seed, windowMs: Math.max(3000, Math.min(60_000, opts.windowMs ?? 10_000)), state: 'lobby', round: -1, roundOpen: false,
          startedAt: 0, closedAt: null, answered: 0, keys, players: [{ userId: me, nickname: nick(name), spectator: !!opts.hostScreen }], answers: [],
          hostScreen: !!opts.hostScreen,
        });
        return { id, code };
      },
      join: async (code, name) => {
        const r = [...this.rooms.values()].find((x) => x.code === code.trim().toUpperCase());
        if (!r) return fail('room not found');
        const p = r.players.find((x) => x.userId === me);
        if (p) {
          p.nickname = nick(name);
          return r.id;
        }
        if (r.state !== 'lobby') fail('game already started');
        if (r.players.length >= 20) fail('room is full');
        r.players.push({ userId: me, nickname: nick(name) });
        this.changed(r.id);
        return r.id;
      },
      state: async (id) => {
        const r = this.member(id, me);
        const closedUpto = r.roundOpen ? r.round - 1 : r.round;
        return structuredClone({
          id: r.id, code: r.code, host: r.host, kind: r.kind, rounds: r.rounds, seed: r.seed, windowMs: r.windowMs,
          state: r.state, round: r.round, roundOpen: r.roundOpen, answered: r.answered, me, hostScreen: r.hostScreen,
          players: r.players.map((p) => ({ ...p, answered: r.answers.some((a) => a.round === r.round && a.userId === p.userId) })),
          results: r.keys.slice(0, closedUpto + 1).map((key, round) => ({
            round, key,
            answers: r.answers.filter((a) => a.round === round).map(({ userId, answer, timeMs, correct, points }) => ({ userId, answer, timeMs, correct, points })),
          })),
        });
      },
      startRound: async (id, round) => {
        const r = this.member(id, me);
        if (r.roundOpen || round !== r.round + 1 || round >= r.rounds || r.state === 'over') return;
        if (me !== r.host && (r.closedAt === null || this.now() - r.closedAt < 20_000)) fail('only the host can start');
        Object.assign(r, { state: 'playing', round, roundOpen: true, startedAt: this.now(), closedAt: null, answered: 0 });
        this.changed(id);
      },
      close: async (id, round, force) => {
        const r = this.member(id, me);
        if (!r.roundOpen || r.round !== round) return;
        if (r.answered < r.players.filter((p) => !p.spectator).length) {
          if (!force) return;
          const age = this.now() - r.startedAt;
          if (me !== r.host && age < r.windowMs + 25_000) return;
          if (me === r.host && age < r.windowMs) return;
        }
        this.closeRound(r);
        this.changed(id);
      },
      answer: async (id, round, answer, timeMs) => {
        const r = this.member(id, me);
        if (!r.roundOpen || r.round !== round) return;
        if (r.answers.some((a) => a.round === round && a.userId === me)) return;
        if (r.players.find((p) => p.userId === me)?.spectator) return;
        const inTime = timeMs !== null && timeMs >= 150 && timeMs <= r.windowMs && this.now() <= r.startedAt + r.windowMs + 18_000;
        let ok: boolean;
        let points: number;
        if (r.kind === 'vocal-hold') {
          // "v:<0..100>" measured on the singer's device (same rule as the SQL function).
          const m = /^v:(\d{1,3})$/.exec(answer ?? '');
          const vs = m ? Math.min(100, Number(m[1])) : null;
          ok = vs !== null && vs >= 60 && inTime;
          points = vs !== null && inTime ? vs * 10 : 0;
        } else {
          ok = answer !== null && answer === r.keys[round] && inTime;
          let streak = 0;
          while (streak < round && r.answers.some((a) => a.userId === me && a.round === round - streak - 1 && a.correct)) streak++;
          points = ok ? tournamentPoints(1, timeMs!, r.windowMs, streak) : 0;
        }
        r.answers.push({ round, userId: me, answer, timeMs, correct: ok, points });
        r.answered++;
        if (r.answered >= r.players.filter((p) => !p.spectator).length) this.closeRound(r);
        this.changed(id);
      },
      subscribe: (id, onChange) => {
        const set = this.listeners.get(id) ?? new Set();
        set.add(onChange);
        this.listeners.set(id, set);
        return () => set.delete(onChange);
      },
    };
  }

  /**
   * Bot opponents for dev/E2E: join the room, then answer each round after a delay
   * (right with probability `skill`).
   */
  addBots(code: string, names: string[], opts: { skill?: number; delayMs?: [number, number]; choices?: (round: number) => string[] } = {}) {
    const skill = opts.skill ?? 0.6;
    const [lo, hi] = opts.delayMs ?? [1500, 4500];
    for (const [i, name] of names.entries()) {
      const id = `bot-${i + 1}`;
      const c = this.client(id);
      void c.join(code, name).then((roomId) => {
        let answeredRound = -1;
        c.subscribe(roomId, () => {
          const r = this.rooms.get(roomId);
          if (!r || !r.roundOpen || r.round === answeredRound) return;
          const round = r.round;
          answeredRound = round;
          // Stimulus (~3 s countdown + sound) before a reaction.
          const t = lo + Math.random() * (hi - lo);
          setTimeout(() => {
            const right = Math.random() < skill;
            const wrong = opts.choices?.(round).find((x) => x !== r.keys[round]) ?? '__';
            const sung = r.kind === 'vocal-hold' ? (opts.choices?.(round) ?? ['v:70'])[Math.floor(Math.random() * 2)] : null;
            void c.answer(roomId, round, sung ?? (right ? r.keys[round] : wrong), Math.max(200, Math.round(t)));
          }, 3000 + t);
        });
      });
    }
  }
}
