// Local same-device challenge: turn order, rounds, eliminations, ties. Pure reducer.

export interface Player {
  name: string;
  color: string;
  alive: boolean;
  /** Longest sequence completed. */
  best: number;
  /** One point per completed round. */
  points: number;
}

export interface Match {
  players: Player[];
  /** Current sequence length. */
  length: number;
  /** Index into players of whose turn it is. */
  turn: number;
  /** Players who failed in the current round (eliminated when the round ends). */
  failedThisRound: number[];
  over: boolean;
  /** Winner indices when over (several = tie). Empty while playing. */
  winners: number[];
  /** Per-turn history for the scoreboard. */
  log: { player: number; length: number; pass: boolean }[];
  /** Turn counter, used for seeding so every player gets a different sequence. */
  turnNo: number;
}

export const PLAYER_COLORS = ['#4BE3B5', '#FFC94D', '#A98BFF', '#FF6A4D'];

export function newMatch(names: string[], startLength: number): Match {
  if (names.length < 1 || names.length > 4) throw new Error('1–4 players');
  return {
    players: names.map((name, i) => ({ name, color: PLAYER_COLORS[i], alive: true, best: 0, points: 0 })),
    length: startLength,
    turn: 0,
    failedThisRound: [],
    over: false,
    winners: [],
    log: [],
    turnNo: 0,
  };
}

const alive = (m: Match) => m.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);

/** Record the current player's result and move to the next turn / round / end. */
export function recordTurn(m: Match, pass: boolean): Match {
  if (m.over) return m;
  const players = m.players.map((p) => ({ ...p }));
  const me = players[m.turn];
  if (pass) {
    me.best = Math.max(me.best, m.length);
    me.points += 1;
  }
  const failed = pass ? m.failedThisRound : [...m.failedThisRound, m.turn];
  const log = [...m.log, { player: m.turn, length: m.length, pass }];
  const order = alive(m);
  const pos = order.indexOf(m.turn);
  const next: Match = { ...m, players, failedThisRound: failed, log, turnNo: m.turnNo + 1 };

  if (pos < order.length - 1) return { ...next, turn: order[pos + 1] };

  // ---- round complete ----
  const solo = m.players.length === 1;
  failed.forEach((i) => (players[i].alive = false));
  const survivors = order.filter((i) => !failed.includes(i));
  if (solo) {
    if (survivors.length === 0) return { ...next, over: true, winners: [0], failedThisRound: [] };
    return { ...next, length: m.length + 1, turn: 0, failedThisRound: [] };
  }
  if (survivors.length === 0) {
    // Everyone failed this round: tie among them at the previous length.
    return { ...next, over: true, winners: order, failedThisRound: [] };
  }
  if (survivors.length === 1) return { ...next, over: true, winners: survivors, failedThisRound: [] };
  return { ...next, length: m.length + 1, turn: survivors[0], failedThisRound: [] };
}

/** Seed for this turn's sequence: same game seed, different per turn → equal length, different content. */
export const turnSeed = (gameSeed: number, m: Match) => (gameSeed * 7919 + m.turnNo * 104729 + m.length * 31) >>> 0;
