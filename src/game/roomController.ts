// One player's view of an online room (spec I). The server is the source of truth for rounds and
// grading; this device plays the stimulus itself and times the answer from the end of its own playback.

import { renderStimulus, type Answer, type Question } from '../engine/lesson';
import { tournamentSet, WINDOW_MS, type SetKind } from '../engine/tournament';
import type { RoomBackend, RoomRoundResult, RoomSnapshot } from '../cloud/rooms';
import { Cancelled, throwIfAborted, type AudioEngine, type Clock, type PromptPlayer } from './adapters';

export type RoomPhase = 'connecting' | 'lobby' | 'countdown' | 'playing' | 'answering' | 'waiting' | 'reveal' | 'over';

export interface RoomStanding {
  userId: string;
  nickname: string;
  rating?: number | null;
  ratingProvisional?: boolean;
  points: number;
  correct: number;
  totalTimeMs: number;
  rank: number;
  /** Rank before the latest round (for movement arrows), null when there was none. */
  prevRank: number | null;
}

export interface RoomView {
  phase: RoomPhase;
  snap: RoomSnapshot | null;
  isHost: boolean;
  item: Question | null;
  round: number;
  countdown: number;
  myAnswer: Answer | null | undefined;
  windowEndsAt: number | null;
  last: RoomRoundResult | null;
  standings: RoomStanding[];
  /** Transient connection problem (the game keeps polling). */
  offline: boolean;
}

/** Host side: pick a seed, send only the answers to the server. */
export async function createRoom(backend: RoomBackend, kind: SetKind, rounds: number, nick: string, seed = (Math.random() * 2 ** 32) >>> 0, opts: { hostScreen?: boolean } = {}) {
  const keys = tournamentSet(kind, rounds, seed).map((q) => (kind === 'vocal-hold' ? 'v' : String(q.answer)));
  return backend.create(kind, rounds, seed, keys, nick, { windowMs: WINDOW_MS[kind], hostScreen: opts.hostScreen });
}

export function roomStandings(players: RoomSnapshot['players'], results: RoomRoundResult[]): RoomStanding[] {
  const table = (rs: RoomRoundResult[]) => {
    const rows = players.filter((p) => !p.spectator).map((p) => ({ userId: p.userId, nickname: p.nickname, rating: p.rating, ratingProvisional: p.ratingProvisional, points: 0, correct: 0, totalTimeMs: 0 }));
    for (const r of rs)
      for (const a of r.answers) {
        const row = rows.find((x) => x.userId === a.userId);
        if (!row) continue;
        row.points += a.points;
        if (a.correct) {
          row.correct++;
          row.totalTimeMs += a.timeMs ?? 0;
        }
      }
    return rows.sort((a, b) => b.points - a.points || a.totalTimeMs - b.totalTimeMs);
  };
  const before = results.length > 1 ? table(results.slice(0, -1)) : null;
  return table(results).map((r, i) => ({
    ...r,
    rank: i + 1,
    prevRank: before ? before.findIndex((b) => b.userId === r.userId) + 1 : null,
  }));
}

export interface RoomOptions {
  pollMs?: number;
  revealMs?: number;
  /** Host waits this long after its own window before forcing the round closed. */
  hostGraceMs?: number;
}

export class RoomController {
  private view: RoomView = {
    phase: 'connecting',
    snap: null,
    isHost: false,
    item: null,
    round: -1,
    countdown: 3,
    myAnswer: undefined,
    windowEndsAt: null,
    last: null,
    standings: [],
    offline: false,
  };
  private listeners = new Set<() => void>();
  private ctl = new AbortController();
  private roundCtl = new AbortController();
  private items: Question[] | null = null;
  private localRound = -1;
  private revealedRound = -1;
  private busy = false;
  private dirty = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsub: (() => void) | null = null;
  private stimEnd = 0;
  private resolveAnswer: ((a: { answer: Answer; t: number }) => void) | null = null;
  private now = () => this.ad.clock.now?.() ?? performance.now();
  private opts: Required<RoomOptions>;

  constructor(
    private backend: RoomBackend,
    private roomId: string,
    private ad: { audio: AudioEngine; tts: PromptPlayer; clock: Clock },
    opts: RoomOptions = {},
  ) {
    this.opts = { pollMs: 1500, revealMs: 3500, hostGraceMs: 1500, ...opts };
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  private patch(p: Partial<RoomView>) {
    this.view = { ...this.view, ...p };
    this.listeners.forEach((l) => l());
  }

  start() {
    this.unsub = this.backend.subscribe(this.roomId, () => void this.refresh());
    this.timer = setInterval(() => void this.refresh(), this.opts.pollMs);
    void this.refresh();
  }

  dispose() {
    this.ctl.abort();
    this.roundCtl.abort();
    this.unsub?.();
    if (this.timer) clearInterval(this.timer);
    this.ad.audio.stopAll();
  }

  /** Host: start round 1 from the lobby. */
  async startGame() {
    await this.ad.audio.unlock();
    await this.backend.startRound(this.roomId, 0);
    await this.refresh();
  }

  answer(a: Answer) {
    if (this.view.phase !== 'answering' || !this.resolveAnswer) return;
    const r = this.resolveAnswer;
    this.resolveAnswer = null;
    this.patch({ myAnswer: a });
    r({ answer: a, t: Math.round(this.now() - this.stimEnd) });
  }

  async refresh(): Promise<void> {
    if (this.ctl.signal.aborted) return;
    if (this.busy) {
      this.dirty = true;
      return;
    }
    this.busy = true;
    try {
      const s = await this.backend.state(this.roomId);
      if (this.ctl.signal.aborted) return;
      this.onSnap(s);
      if (this.view.offline) this.patch({ offline: false });
    } catch {
      if (!this.ctl.signal.aborted) this.patch({ offline: true });
    } finally {
      this.busy = false;
    }
    if (this.dirty) {
      this.dirty = false;
      await this.refresh();
    }
  }

  private onSnap(s: RoomSnapshot) {
    this.items ??= tournamentSet(s.kind, s.rounds, s.seed);
    this.patch({ snap: s, isHost: s.host === s.me, standings: roomStandings(s.players, s.results) });
    if (s.state === 'lobby') {
      if (this.view.phase === 'connecting') this.patch({ phase: 'lobby' });
      return;
    }
    if (s.round > this.localRound) {
      this.localRound = s.round;
      if (s.roundOpen) void this.playRound(s.round, s.windowMs);
      else this.reveal(s);
      return;
    }
    if (s.round === this.localRound && !s.roundOpen && this.revealedRound !== s.round && s.results.some((r) => r.round === s.round)) this.reveal(s);
  }

  private async playRound(round: number, windowMs: number) {
    this.roundCtl.abort();
    this.roundCtl = new AbortController();
    const signal = this.roundCtl.signal;
    const parent = this.ctl.signal;
    parent.addEventListener('abort', () => this.roundCtl.abort(), { once: true });
    const item = this.items![round];
    try {
      this.patch({ phase: 'countdown', item, round, myAnswer: undefined, last: null, windowEndsAt: null });
      for (let n = 3; n >= 1; n--) {
        this.patch({ countdown: n });
        this.ad.audio.cue('ready');
        await this.ad.clock.sleep(650, signal);
      }
      this.patch({ phase: 'playing' });
      const { events, length } = renderStimulus(item.stimulus);
      const snap = this.view.snap;
      const bigScreen = !!snap?.hostScreen;
      if (!bigScreen || this.view.isHost) await this.ad.audio.play(events, length, signal);
      else await this.ad.clock.sleep(length * 1000 + 60, signal); // the sound plays on the big screen
      if (bigScreen && this.view.isHost) {
        // Big screen: show the answer window, then close the round (the host does not answer).
        this.stimEnd = this.now();
        this.patch({ phase: 'answering', windowEndsAt: this.stimEnd + windowMs });
        await this.ad.clock.sleep(windowMs + this.opts.hostGraceMs, signal);
        this.patch({ phase: 'waiting', windowEndsAt: null });
        await this.backend.close(this.roomId, round, true).catch(() => {});
        await this.refresh();
        return;
      }
      throwIfAborted(signal);
      this.stimEnd = this.now();
      this.patch({ phase: 'answering', windowEndsAt: this.stimEnd + windowMs });
      const got = await new Promise<{ answer: Answer; t: number } | null>((resolve, reject) => {
        this.resolveAnswer = resolve;
        this.ad.clock.sleep(windowMs, signal).then(
          () => resolve(null),
          (e) => reject(e),
        );
      });
      this.resolveAnswer = null;
      throwIfAborted(signal);
      this.patch({ phase: 'waiting', windowEndsAt: null });
      await this.backend.answer(this.roomId, round, got ? String(got.answer) : null, got ? got.t : null).catch(() => {});
      await this.refresh();
      // If someone never answers: the host closes after its window, anyone else much later.
      const isHost = this.view.isHost;
      await this.ad.clock.sleep(isHost ? this.opts.hostGraceMs : windowMs + 26_000, signal);
      await this.backend.close(this.roomId, round, true).catch(() => {});
      await this.refresh();
    } catch (e) {
      this.resolveAnswer = null;
      if (!(e instanceof Cancelled)) console.error(e);
    }
  }

  private reveal(s: RoomSnapshot) {
    const round = s.round;
    this.revealedRound = round;
    this.roundCtl.abort();
    this.resolveAnswer = null;
    const last = s.results.find((r) => r.round === round) ?? null;
    const mine = last?.answers.find((a) => a.userId === s.me);
    this.patch({ phase: 'reveal', item: this.items![round], round, last, windowEndsAt: null });
    this.ad.audio.cue(mine?.correct ? 'correct' : 'wrong');
    const signal = this.ctl.signal;
    void (async () => {
      try {
        await this.ad.clock.sleep(this.opts.revealMs, signal);
        if (this.localRound !== round) return; // the next round already started
        if (this.view.snap?.state === 'over') {
          this.patch({ phase: 'over' });
          this.ad.audio.cue('complete');
          return;
        }
        if (this.view.isHost) {
          await this.backend.startRound(this.roomId, round + 1).catch(() => {});
          await this.refresh();
          return;
        }
        // Host gone? After 20 s anyone may start the next round.
        await this.ad.clock.sleep(22_000, signal);
        if (this.localRound !== round) return;
        await this.backend.startRound(this.roomId, round + 1).catch(() => {});
        await this.refresh();
      } catch (e) {
        if (!(e instanceof Cancelled)) console.error(e);
      }
    })();
  }
}
