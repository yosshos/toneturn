// Tournament rounds on one device: daily challenge (1 player) or a face-to-face duel (2 players).
// Every player gets the same stimulus at the same moment; time counts from the end of the sound.

import { explainStimulus, renderStimulus, type Answer, type Question } from '../engine/lesson';
import { currentStreaks, ROUND_WINDOW_MS, scoreRound, standings, type PlayerAnswer, type RoundResult, type Standing } from '../engine/tournament';
import { Cancelled, throwIfAborted, type AudioEngine, type Clock, type PromptPlayer } from './adapters';

export type TournamentStage = 'ready' | 'countdown' | 'playing' | 'answering' | 'reveal' | 'over';

export interface TournamentView {
  stage: TournamentStage;
  round: number; // 0-based
  rounds: number;
  item: Question;
  players: string[];
  countdown: number;
  /** Answers given this round (player → answer) — shown as "locked in", not as right/wrong until reveal. */
  locked: Record<number, Answer>;
  /** ms left in the answer window (approximate, for the bar). */
  windowEndsAt: number | null;
  last: RoundResult | null;
  results: RoundResult[];
  standings: Standing[];
}

export interface TournamentAdapters {
  audio: AudioEngine;
  tts: PromptPlayer;
  clock: Clock;
}

export class TournamentController {
  private view: TournamentView;
  private listeners = new Set<() => void>();
  private ctl = new AbortController();
  private stimEnd: number | null = null;
  private answers = new Map<number, PlayerAnswer>();
  private allIn: (() => void) | null = null;
  private now = () => this.ad.clock.now?.() ?? performance.now();

  constructor(
    private items: Question[],
    players: string[],
    private ad: TournamentAdapters,
    private hooks: { onOver?: (results: RoundResult[], st: Standing[]) => void } = {},
    private windowMs = ROUND_WINDOW_MS,
  ) {
    this.view = {
      stage: 'ready',
      round: 0,
      rounds: items.length,
      item: items[0],
      players,
      countdown: 3,
      locked: {},
      windowEndsAt: null,
      last: null,
      results: [],
      standings: standings(players.length, []),
    };
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  private patch(p: Partial<TournamentView>) {
    this.view = { ...this.view, ...p };
    this.listeners.forEach((l) => l());
  }

  async start() {
    await this.ad.audio.unlock();
    this.ad.tts.unlock();
    this.ctl = new AbortController();
    this.loop(this.ctl.signal).catch((e) => {
      if (!(e instanceof Cancelled)) console.error(e);
    });
  }

  dispose() {
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
  }

  /** A player's answer; only the first one per round counts. */
  answer(player: number, answer: Answer) {
    if (this.view.stage !== 'answering' || this.answers.has(player) || this.stimEnd === null) return;
    const t = Math.round(this.now() - this.stimEnd);
    this.answers.set(player, { player, answer, timeMs: t });
    this.patch({ locked: { ...this.view.locked, [player]: answer } });
    if (this.answers.size >= this.view.players.length) this.allIn?.();
  }

  private async play(stim: Parameters<typeof renderStimulus>[0], signal: AbortSignal) {
    const { events, length } = renderStimulus(stim);
    await this.ad.audio.play(events, length, signal);
    throwIfAborted(signal);
  }

  private async loop(signal: AbortSignal) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      this.answers.clear();
      this.patch({ round: i, item, locked: {}, last: null, windowEndsAt: null });
      for (let n = 3; n >= 1; n--) {
        this.patch({ stage: 'countdown', countdown: n });
        this.ad.audio.cue('ready');
        await this.ad.clock.sleep(650, signal);
      }
      this.patch({ stage: 'playing' });
      await this.play(item.stimulus, signal);
      // Clock starts when the sound has finished being heard on this device.
      this.stimEnd = this.now();
      this.patch({ stage: 'answering', windowEndsAt: this.stimEnd + this.windowMs });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(done, this.windowMs);
        const onAbort = () => {
          clearTimeout(t);
          reject(new Cancelled());
        };
        function done() {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }
        signal.addEventListener('abort', onAbort, { once: true });
        this.allIn = () => {
          clearTimeout(t);
          done();
        };
        if (this.answers.size >= this.view.players.length) this.allIn();
      });
      this.allIn = null;
      throwIfAborted(signal);
      const answers: PlayerAnswer[] = this.view.players.map((_, p) => this.answers.get(p) ?? { player: p, answer: null, timeMs: null });
      const res = scoreRound(item, answers, currentStreaks(this.view.players.length, this.view.results), this.windowMs);
      const results = [...this.view.results, res];
      this.patch({ stage: 'reveal', last: res, results, standings: standings(this.view.players.length, results) });
      this.ad.audio.cue(res.fastest !== null ? 'correct' : 'wrong');
      if (res.fastest === null) await this.play(explainStimulus(item), signal);
      await this.ad.clock.sleep(1400, signal);
    }
    this.patch({ stage: 'over' });
    this.ad.audio.cue('complete');
    this.hooks.onOver?.(this.view.results, this.view.standings);
  }
}
