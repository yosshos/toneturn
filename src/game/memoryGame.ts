// Echo Chain (melody) and Beat Echo (rhythm): growing-sequence memory games for 1–4 players
// on one device. Framework-agnostic; the UI subscribes like the lesson controller.

import {
  gradeMelody,
  gradeRhythm,
  melodyEvents,
  melodyGame,
  melodySequence,
  rhythmPattern,
  rhythmTimeline,
  sungToPads,
  type MelodyGame,
  type MelodyGrade,
  type RhythmGrade,
  type RhythmPattern,
} from '../engine/memory';
import { newMatch, recordTurn, turnSeed, type Match } from '../engine/match';
import { spokenMajorKey, type Naming } from '../engine/pitch';
import {
  Cancelled,
  throwIfAborted,
  type AccessError,
  type AudioEngine,
  type Clock,
  type KnockInput,
  type PitchCapture,
  type PromptPlayer,
  type RhythmAudio,
} from './adapters';

export type GameKind = 'melody' | 'rhythm';
export type GameInput = 'pads' | 'sing' | 'tap' | 'knock';

export interface GameConfig {
  kind: GameKind;
  input: GameInput;
  players: string[];
  seed: number;
  lang: 'he' | 'en';
  naming: Naming;
  bpm?: number;
  /** Extra latency correction for tap timing, ms (positive = player hears late). */
  latencyMs?: number;
}

export interface GameAdapters {
  audio: AudioEngine & RhythmAudio;
  tts: PromptPlayer;
  pitch: PitchCapture;
  knock: KnockInput;
  clock: Clock;
  simulated: boolean;
}

export type GameStage = 'ready' | 'turn' | 'demo' | 'respond' | 'result' | 'paused' | 'over';

export interface TurnResult {
  pass: boolean;
  unclear: boolean;
  melody?: MelodyGrade;
  rhythm?: RhythmGrade;
}

export interface GameView {
  stage: GameStage;
  match: Match;
  kind: GameKind;
  input: GameInput;
  melody: MelodyGame | null;
  seq: number[];
  pattern: RhythmPattern | null;
  /** Pads tapped / notes sung so far this turn. */
  entered: (number | null)[];
  /** Tap times (ms from response beat 1) so far this turn. */
  taps: number[];
  litPad: number | null;
  beat: { i: number; accent: boolean; n: number } | null;
  result: TurnResult | null;
  caption: string | null;
  error: AccessError | null;
  simulated: boolean;
}

const T = {
  en: {
    turn: (name: string, n: number, kind: GameKind) => `${name}, your turn. ${n} ${kind === 'melody' ? 'notes' : 'beats'}.`,
    soloTurn: (n: number, kind: GameKind) => `${n} ${kind === 'melody' ? 'notes' : 'beats'}.`,
    key: (k: string) => `Key of ${k}.`,
    listen: 'Listen.',
    yourTurnSing: 'Now sing it.',
    yourTurnTap: 'Now you.',
    pass: ['Yes!', 'Nice!', 'Perfect!', 'Got it!'],
    fail: 'Not this time.',
    unclear: "I couldn't hear that. Same turn again.",
    winner: (n: string) => `${n} wins!`,
    tie: (ns: string[]) => `It's a tie: ${ns.join(' and ')}.`,
    solo: (b: number, kind: GameKind) => `Game over. Longest chain: ${b} ${kind === 'melody' ? 'notes' : 'beats'}.`,
  },
  he: {
    turn: (name: string, n: number, kind: GameKind) => `${name}, תורך. ${n} ${kind === 'melody' ? 'צלילים' : 'פעמות'}.`,
    soloTurn: (n: number, kind: GameKind) => `${n} ${kind === 'melody' ? 'צלילים' : 'פעמות'}.`,
    key: (k: string) => `סולם ${k}.`,
    listen: 'הקשיבו.',
    yourTurnSing: 'עכשיו שירו.',
    yourTurnTap: 'עכשיו אתם.',
    pass: ['כן!', 'יפה!', 'מושלם!', 'בדיוק!'],
    fail: 'לא הפעם.',
    unclear: 'לא הצלחתי לשמוע. אותו תור שוב.',
    winner: (n: string) => `${n} ניצח!`,
    tie: (ns: string[]) => `תיקו: ${ns.join(' ו')}.`,
    solo: (b: number, kind: GameKind) => `המשחק נגמר. השרשרת הארוכה: ${b} ${kind === 'melody' ? 'צלילים' : 'פעמות'}.`,
  },
};

const START_LENGTH: Record<GameKind, number> = { melody: 2, rhythm: 2 };

type Waiter = (v: 'done' | 'retry') => void;

export class MemoryGameController {
  private view: GameView;
  private ctl = new AbortController();
  private listeners = new Set<() => void>();
  private waiter: Waiter | null = null;
  private responseStart: number | null = null;
  private passIdx = 0;
  private offNotes: () => void = () => {};

  constructor(
    private cfg: GameConfig,
    private ad: GameAdapters,
    private hooks: { onOver?: (m: Match, kind: GameKind) => void } = {},
  ) {
    const melody = cfg.kind === 'melody' ? melodyGame(cfg.seed) : null;
    this.view = {
      stage: 'ready',
      match: newMatch(cfg.players, START_LENGTH[cfg.kind]),
      kind: cfg.kind,
      input: cfg.input,
      melody,
      seq: [],
      pattern: null,
      entered: [],
      taps: [],
      litPad: null,
      beat: null,
      result: null,
      caption: null,
      error: null,
      simulated: ad.simulated,
    };
    this.offNotes = this.ad.audio.onNotes((active) => {
      const g = this.view.melody;
      if (!g) return;
      const i = g.pads.findIndex((p) => active.includes(p.midi));
      if (i !== this.view.litPad) this.patch({ litPad: i >= 0 ? i : null });
    });
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  private patch(p: Partial<GameView>) {
    this.view = { ...this.view, ...p };
    this.listeners.forEach((l) => l());
  }
  private get t() {
    return T[this.cfg.lang];
  }

  // ---------------- lifecycle ----------------

  async start() {
    await this.ad.audio.unlock();
    this.ad.tts.unlock();
    this.run();
  }

  private run() {
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
    this.waiter = null;
    this.ctl = new AbortController();
    const sig = this.ctl.signal;
    this.loop(sig).catch((e) => {
      if (!(e instanceof Cancelled)) console.error(e);
    });
  }

  pause() {
    if (this.view.stage === 'over') return;
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
    this.waiter = null;
    this.patch({ stage: 'paused', caption: null, beat: null });
  }

  /** Resume replays the current player's turn from the start (no penalty). */
  resume() {
    if (this.view.stage !== 'paused') return;
    this.run();
  }

  dispose() {
    this.offNotes();
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
  }

  rematch() {
    this.cfg = { ...this.cfg, seed: (this.cfg.seed * 16807 + 11) >>> 0 };
    this.patch({
      match: newMatch(this.cfg.players, START_LENGTH[this.cfg.kind]),
      melody: this.cfg.kind === 'melody' ? melodyGame(this.cfg.seed) : null,
      result: null,
      stage: 'ready',
    });
    this.run();
  }

  // ---------------- input ----------------

  /** Pad tap (melody pads mode). Plays the pad and grades as soon as the answer is decided. */
  tapPad(i: number) {
    if (this.view.stage !== 'respond' || this.cfg.input !== 'pads' || !this.view.melody) return;
    const pad = this.view.melody.pads[i];
    const ac = new AbortController();
    void this.ad.audio.play([{ midi: pad.midi, start: 0, duration: 0.35, velocity: 0.7 }], 0.4, ac.signal).catch(() => {});
    const entered = [...this.view.entered, i];
    this.patch({ entered });
    const k = entered.length - 1;
    if (entered[k] !== this.view.seq[k] || entered.length === this.view.seq.length) this.resolveWaiter('done');
  }

  /** Rhythm tap; `perfMs` is the event timestamp (performance.now clock). */
  tapBeat(perfMs: number) {
    if (this.cfg.input !== 'tap' || this.responseStart === null) return;
    if (this.view.stage !== 'respond' && this.view.stage !== 'demo') return;
    const rel = perfMs - this.responseStart - (this.cfg.latencyMs ?? 0);
    if (rel < -400) return; // ignore taps during the count-in
    this.patch({ taps: [...this.view.taps, Math.round(rel)] });
  }

  private resolveWaiter(v: 'done' | 'retry') {
    const w = this.waiter;
    this.waiter = null;
    w?.(v);
  }

  private wait(signal: AbortSignal): Promise<'done' | 'retry'> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Cancelled());
      signal.addEventListener('abort', () => reject(new Cancelled()), { once: true });
      this.waiter = resolve;
    });
  }

  private async say(text: string, signal: AbortSignal) {
    this.patch({ caption: text });
    await this.ad.tts.speak(text, this.cfg.lang, signal);
    throwIfAborted(signal);
  }

  // ---------------- main loop ----------------

  private async loop(signal: AbortSignal) {
    while (!this.view.match.over) {
      const m = this.view.match;
      const seed = turnSeed(this.cfg.seed, m);
      const player = m.players[m.turn];
      const solo = m.players.length === 1;
      const seq = this.cfg.kind === 'melody' ? melodySequence(seed, m.length, this.view.melody!.pads.length) : [];
      const pattern = this.cfg.kind === 'rhythm' ? rhythmPattern(seed, m.length, this.cfg.bpm ?? 90) : null;
      this.responseStart = null;
      this.patch({ stage: 'turn', seq, pattern, entered: [], taps: [], result: null, beat: null, error: null });
      await this.say(solo ? this.t.soloTurn(m.length, this.cfg.kind) : this.t.turn(player.name, m.length, this.cfg.kind), signal);
      if (this.cfg.kind === 'melody' && m.log.length === 0) {
        await this.say(this.t.key(spokenMajorKey(this.view.melody!.key, this.cfg.naming, this.cfg.lang)), signal);
      }
      await this.ad.clock.sleep(500, signal);

      const result = this.cfg.kind === 'melody' ? await this.melodyTurn(seq, signal) : await this.rhythmTurn(pattern!, signal);
      if (result === null) continue; // access error handled → same turn again

      if (result.unclear) {
        this.patch({ stage: 'result', result });
        await this.say(this.t.unclear, signal);
        continue; // same player, same length, new sequence (turnNo unchanged → same seed, fine)
      }
      this.ad.audio.cue(result.pass ? 'correct' : 'wrong');
      this.patch({ stage: 'result', result });
      await this.say(result.pass ? this.t.pass[this.passIdx++ % this.t.pass.length] : this.t.fail, signal);
      if (!result.pass && this.cfg.kind === 'melody') {
        // Let them hear the right answer.
        const { events, length } = melodyEvents(this.view.melody!, seq);
        await this.ad.audio.play(events, length, signal);
      }
      await this.ad.clock.sleep(900, signal);
      this.patch({ match: recordTurn(this.view.match, result.pass) });
    }
    const m = this.view.match;
    this.patch({ stage: 'over', caption: null });
    this.ad.audio.cue('complete');
    this.hooks.onOver?.(m, this.cfg.kind);
    const text =
      m.players.length === 1
        ? this.t.solo(m.players[0].best, this.cfg.kind)
        : m.winners.length === 1
          ? this.t.winner(m.players[m.winners[0]].name)
          : this.t.tie(m.winners.map((i) => m.players[i].name));
    await this.say(text, signal).catch(() => {});
  }

  private async melodyTurn(seq: number[], signal: AbortSignal): Promise<TurnResult | null> {
    const g = this.view.melody!;
    this.patch({ stage: 'demo' });
    await this.say(this.t.listen, signal);
    await this.ad.clock.sleep(350, signal);
    const { events, length } = melodyEvents(g, seq);
    await this.ad.audio.play(events, length, signal);
    throwIfAborted(signal);
    this.patch({ litPad: null });

    if (this.cfg.input === 'pads') {
      this.patch({ stage: 'respond', entered: [] });
      await this.wait(signal);
      const grade = gradeMelody(seq, this.view.entered);
      return { pass: grade.pass, unclear: false, melody: grade };
    }

    // Singing
    await this.say(this.t.yourTurnSing, signal);
    this.patch({ stage: 'respond', entered: [] });
    const res = await this.ad.pitch.sing({
      signal,
      maxMs: seq.length * 1100 + 3500,
      silenceMs: 4500,
      endSilenceMs: 1100,
      onCapturing: () => this.ad.audio.cue('ready'),
    });
    throwIfAborted(signal);
    if (res.kind === 'aborted') throw new Cancelled();
    if (res.kind === 'error') {
      this.patch({ error: res.error, stage: 'paused' });
      await this.wait(signal);
      return null;
    }
    if (res.kind === 'silence') return { pass: false, unclear: true };
    const given = sungToPads(g, res.frames);
    this.patch({ entered: given });
    const grade = gradeMelody(seq, given);
    return { pass: grade.pass, unclear: grade.unclear, melody: grade };
  }

  private async rhythmTurn(p: RhythmPattern, signal: AbortSignal): Promise<TurnResult | null> {
    const tl = rhythmTimeline(p);
    let knockCtl: AbortController | null = null;
    if (this.cfg.input === 'knock') {
      knockCtl = new AbortController();
      signal.addEventListener('abort', () => knockCtl?.abort(), { once: true });
      const opened = await new Promise<{ ok: true } | { ok: false; error: AccessError }>((resolve) => {
        void this.ad.knock
          .listen({
            signal: knockCtl!.signal,
            onReady: () => resolve({ ok: true }),
            onKnock: (perf) => {
              if (this.responseStart === null) return;
              const rel = perf - this.responseStart - (this.cfg.latencyMs ?? 0);
              if (rel < -150) return; // the app's own count-in or the demo
              this.patch({ taps: [...this.view.taps, Math.round(rel)] });
            },
          })
          .then((r) => {
            if (!r.ok) resolve(r);
          });
      });
      if (!opened.ok) {
        this.patch({ error: opened.error, stage: 'paused' });
        await this.wait(signal);
        return null;
      }
    }
    this.patch({ stage: 'demo', taps: [] });
    let n = 0;
    try {
      await this.ad.audio.playTimeline(
        tl,
        signal,
        (i, accent) => this.patch({ beat: { i, accent, n: n++ } }),
        (perf) => {
          this.responseStart = perf;
          this.patch({ stage: 'respond', taps: [] });
        },
      );
    } finally {
      knockCtl?.abort();
    }
    throwIfAborted(signal);
    this.patch({ beat: null });
    const grade = gradeRhythm(p, this.view.taps);
    return { pass: grade.pass, unclear: false, rhythm: grade };
  }

  /** After an access error: retry the same turn. */
  retry() {
    this.patch({ error: null });
    this.run();
  }

  /** Switch the input (e.g. sing → pads after a denied mic) and replay the turn. */
  setInput(input: GameInput) {
    this.cfg = { ...this.cfg, input };
    this.patch({ input, error: null });
    this.run();
  }
}
