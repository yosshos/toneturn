// Lesson controller: owns turn-taking (prompt → playback → listen → evaluate → feedback → next),
// input-mode switching, pause/resume and permission recovery. Framework-agnostic; React subscribes.
//
// Invariants
//  - Exactly one async "run" is alive; restarting aborts the previous one (AbortController) and
//    bumps the session turn so any late callback is stale and cannot score.
//  - The microphone/recognizer is only active in the `listening` phase.
//  - Permission / recognition failures, silence and unclear speech never count as wrong answers.

import { gradeRun, runHopMs, runSummary } from '../engine/runs';
import {
  compareStimulus,
  explainStimulus,
  renderStimulus,
  type Answer,
  type LessonDef,
  type Question,
  type RhythmReadQuestion,
  type SingQuestion,
  type SingSeqQuestion,
  type SingRunQuestion,
  type Stimulus,
} from '../engine/lesson';
import { evaluateSung, type SungResult } from '../engine/sing';
import { gradeSungSequence } from '../engine/memory';
import { gradeReading, readTimeline } from '../engine/rhythm';
import { accuracyFor, type Modality } from '../engine/scoring';
import type { Naming } from '../engine/pitch';
import {
  advance,
  createSession,
  currentQuestion,
  grade,
  isResolved,
  newTurn,
  noteUnclear,
  noteReplay,
  skip as skipQuestion,
  summary,
  type InputMode,
  type Phase,
  type SessionState,
} from '../engine/session';
import { Cancelled, throwIfAborted, type AccessError, type Adapters } from './adapters';
import { narration, type Lang } from './narration';
import {
  ambiguousText,
  correctText,
  introGo,
  introText,
  parseAnswer,
  retryText,
  revealText,
  roundPrompt,
  silenceText,
  singFeedbackText,
  unclearText,
} from './content';

export type FeedbackKind = 'correct' | 'correct-retry' | 'retry' | 'reveal' | 'skipped' | 'silence' | 'unclear' | 'ambiguous';

export interface SingLive {
  /** Cents from target (octave-folded), null while unvoiced. */
  cents: number | null;
  level: number;
}

export interface LessonView {
  stage: 'starting' | 'intro' | 'question' | 'complete';
  phase: Phase;
  introStep: number;
  index: number;
  total: number;
  question: Question;
  session: SessionState;
  mode: InputMode;
  mic: 'off' | 'opening' | 'capturing' | 'speech';
  interim: string;
  heard: string | null;
  feedback: {
    kind: FeedbackKind;
    answer?: Answer;
    given?: Answer;
    sung?: SungResult;
    timeMs?: number | null;
    attempt?: number;
    xp?: number;
    accuracy?: number;
    /** Per-note result for sung sequences. */
    seqNotes?: string[];
    /** Rhythm reading: per-onset offset in ms (null = missed) and extra taps. */
    readHits?: (number | null)[];
    readExtra?: number;
  } | null;
  /** Metronome light while a rhythm is being performed. */
  beat: { i: number; accent: boolean; n: number } | null;
  /** Taps / "ta" onsets registered so far in the current performance. */
  readTaps: number;
  /** performance.now() when beat 1 of the current performance is heard (null outside a performance). */
  readStartPerf: number | null;
  /** Live tuner reading while a singing capture is open. */
  singLive: SingLive | null;
  caption: string | null;
  error: AccessError | null;
  /** Silence retries exhausted: waiting for a tap (Listen) or a button answer. */
  needsListenTap: boolean;
  simulated: boolean;
}

export interface ControllerSettings {
  inputLang: Lang;
  outputLang: Lang;
  naming: Naming;
  /** ms between end of playback and opening the recognizer. */
  settleMs?: number;
  /** Silent/unclear listens before falling back to a tap. */
  maxSilentRetries?: number;
  /** Response time affects scores (spec J.5). Default false (untimed). */
  timed?: boolean;
  /** Naming system for spoken note-name answers (input language). Default: same as `naming`. */
  inputNaming?: Naming;
  /** Calibrated tap delay (ms) subtracted from rhythm taps. */
  latencyMs?: number;
}

export interface ControllerHooks {
  onComplete?: (s: SessionState) => void;
  onModeChange?: (m: InputMode) => void;
  onEvent?: (e: { type: string; detail?: unknown }) => void;
  /** Called after each resolved question; may return regenerated questions (adaptive placement). */
  adapt?: (s: SessionState) => Question[] | null;
}

type Waiter = { resolve: (v: WaitResult) => void; turn: number };
type WaitResult = { kind: 'answer'; answer: Answer } | { kind: 'listen' } | { kind: 'retry' } | { kind: 'record' };

const RECOGNIZER_LANG: Record<Lang, string> = { he: 'he-IL', en: 'en-US' };

export class LessonController {
  private s: SessionState;
  private view: LessonView;
  private ctl = new AbortController();
  private waiter: Waiter | null = null;
  private listeners = new Set<() => void>();
  private silentCount = 0;
  /** When the current answer clock started (end of the stimulus as heard, or the listen after an unclear answer). */
  private clockStart: number | null = null;
  private restartClockAtListen = false;
  private tapAt: number | null = null;
  /** Rhythm reading: perf time of beat 1 and the taps collected for the current performance. */
  private readStart: number | null = null;
  private readTaps: number[] = [];
  private readOpen = false;
  private now = () => this.ad.clock.now?.() ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

  constructor(
    lesson: LessonDef,
    private ad: Adapters,
    private cfg: ControllerSettings,
    mode: InputMode,
    private hooks: ControllerHooks = {},
  ) {
    this.s = { ...createSession(lesson), timed: cfg.timed ?? false };
    this.view = {
      stage: 'starting',
      phase: 'idle',
      introStep: 0,
      index: 0,
      total: lesson.questions.length,
      question: lesson.questions[0],
      session: this.s,
      mode,
      mic: 'off',
      interim: '',
      heard: null,
      feedback: null,
      caption: null,
      error: null,
      needsListenTap: false,
      singLive: null,
      beat: null,
      readTaps: 0,
      readStartPerf: null,
      simulated: ad.simulated,
    };
  }

  // ---------- subscription ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  private patch(p: Partial<LessonView>) {
    this.view = {
      ...this.view,
      ...p,
      session: this.s,
      phase: this.s.phase,
      index: this.s.index,
      question: currentQuestion(this.s),
    };
    this.listeners.forEach((l) => l());
  }
  private setSession(s: SessionState, p: Partial<LessonView> = {}) {
    this.s = s;
    this.patch(p);
  }
  private emit(type: string, detail?: unknown) {
    this.hooks.onEvent?.({ type, detail });
  }
  updateSettings(cfg: Partial<ControllerSettings>) {
    this.cfg = { ...this.cfg, ...cfg };
    if (cfg.timed !== undefined) this.s = { ...this.s, timed: cfg.timed };
  }

  // ---------- run management ----------
  private restart(task: (signal: AbortSignal) => Promise<void>) {
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
    this.ad.stt.abort();
    this.waiter = null;
    this.ctl = new AbortController();
    const signal = this.ctl.signal;
    this.s = { ...this.s, turn: this.s.turn + 1 };
    this.patch({ mic: 'off', interim: '' });
    task(signal).catch((e) => {
      if (!(e instanceof Cancelled)) {
        console.error(e);
        this.emit('error', String(e));
      }
    });
  }

  private cancelAll() {
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ad.tts.cancel();
    this.ad.stt.abort();
    this.waiter = null;
    this.s = { ...this.s, turn: this.s.turn + 1 };
  }

  dispose() {
    this.cancelAll();
  }

  // ---------- public actions (call from user gestures) ----------

  /** The single Start gesture: unlock audio + speech, request mic in Voice mode, then run hands-free. */
  async start() {
    await this.ad.audio.unlock();
    this.ad.tts.unlock();
    if (this.view.mode === 'voice' && !(await this.ensureMic())) return;
    this.patch({ stage: this.s.lesson.intro.length ? 'intro' : 'question', introStep: 0 });
    this.restart((sig) => this.runAll(sig));
  }

  setMode(mode: InputMode) {
    if (mode === this.view.mode) return;
    this.patch({ mode, error: null, needsListenTap: false });
    this.hooks.onModeChange?.(mode);
    this.emit('mode', mode);
    const stage = this.view.stage;
    if (stage === 'starting' || stage === 'complete') return;
    if (this.s.phase === 'paused') {
      this.cancelAll();
      this.patch({ mic: 'off' });
      return;
    }
    if (mode === 'buttons') {
      // Stop capture immediately and show controls for the current exercise without replaying.
      if (stage === 'intro') return this.restart((sig) => this.runAll(sig, { resumeIntro: true }));
      return this.restart((sig) => this.runAll(sig, { skipPrompt: true }));
    }
    // Back to Voice: check access from this gesture, then replay the current prompt.
    void (async () => {
      this.cancelAll();
      if (!(await this.ensureMic())) return;
      this.restart((sig) => this.runAll(sig, { resumeIntro: stage === 'intro' }));
    })();
  }

  /** Button answer. Ignored unless a question is awaiting an answer in this turn. */
  answer(answer: Answer) {
    const w = this.waiter;
    if (!w || w.turn !== this.s.turn) return;
    this.waiter = null;
    this.tapAt = this.now();
    w.resolve({ kind: 'answer', answer });
  }

  /** Rhythm reading tap (screen / keyboard); `perfMs` is the event timestamp. */
  tapBeat(perfMs: number) {
    this.registerOnset(perfMs);
  }

  private registerOnset(perfMs: number) {
    if (!this.readOpen || this.readStart === null) return;
    const rel = perfMs - this.readStart - (this.cfg.latencyMs ?? 0);
    if (rel < -400) return; // during the count-in
    this.readTaps.push(Math.round(rel));
    this.patch({ readTaps: this.readTaps.length });
  }

  /** Singing in Buttons mode: explicit recording action. */
  record() {
    const w = this.waiter;
    if (!w || w.turn !== this.s.turn) return;
    this.waiter = null;
    w.resolve({ kind: 'record' });
  }

  /** Re-open listening after silence retries were exhausted. */
  listenNow() {
    const w = this.waiter;
    if (!w) return;
    this.waiter = null;
    w.resolve({ kind: 'listen' });
  }

  repeat() {
    if (this.view.stage !== 'question' || this.s.phase === 'paused') return;
    if (isResolved(this.s.records[this.s.index])) return;
    this.s = noteReplay(this.s);
    this.restart((sig) => this.runAll(sig, { replayOnly: true }));
  }

  skip() {
    if (this.view.stage === 'intro') return this.skipIntro();
    if (this.view.stage !== 'question') return;
    this.cancelAll();
    if (!isResolved(this.s.records[this.s.index])) {
      this.setSession(skipQuestion(this.s), { feedback: { kind: 'skipped', answer: currentQuestion(this.s).answer } });
    }
    this.restart((sig) => this.runAll(sig, { afterResolved: true }));
  }

  skipIntro() {
    if (this.view.stage !== 'intro') return;
    this.patch({ stage: 'question', caption: null });
    this.restart((sig) => this.runAll(sig));
  }

  pause() {
    if (this.view.stage === 'complete' || this.view.stage === 'starting') return;
    this.cancelAll();
    this.setSession({ ...this.s, phase: 'paused' }, { mic: 'off', caption: null, needsListenTap: false });
    this.emit('paused');
  }

  /** Resume is an explicit user action; the mic was released while paused. */
  async resume() {
    if (this.s.phase !== 'paused') return;
    if (this.view.mode === 'voice' && !(await this.ensureMic())) return;
    this.s = { ...this.s, phase: 'prompting' };
    this.restart((sig) => this.runAll(sig, { resumeIntro: this.view.stage === 'intro' }));
  }

  /** Retry after a permission/recognition failure, preserving the exercise. */
  async retryAccess() {
    if (this.view.mode === 'buttons') return this.patch({ error: null });
    this.cancelAll();
    if (!(await this.ensureMic())) return;
    if (this.view.stage === 'starting') {
      this.patch({ stage: this.s.lesson.intro.length ? 'intro' : 'question', introStep: 0 });
      return this.restart((sig) => this.runAll(sig));
    }
    this.restart((sig) => this.runAll(sig, { resumeIntro: this.view.stage === 'intro' }));
  }

  /** Replay a question's stimulus from the recap. */
  replayQuestion(i: number) {
    const q = this.s.lesson.questions[i];
    if (!q) return;
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ctl = new AbortController();
    const { events, length } = renderStimulus(q.stimulus);
    this.ad.audio.play(events, length, this.ctl.signal).catch(() => {});
  }

  /** Recap / review: your (first wrong) answer, then the right one — when the item can be compared. */
  compareQuestion(i: number) {
    const q = this.s.lesson.questions[i];
    const wrong = this.s.records[i]?.attempts.find((a) => !a.correct);
    if (!q || !wrong) return;
    const stim = compareStimulus(q, wrong.answer);
    if (!stim) return;
    this.ctl.abort();
    this.ad.audio.stopAll();
    this.ctl = new AbortController();
    const { events, length } = renderStimulus(stim);
    this.ad.audio.play(events, length, this.ctl.signal).catch(() => {});
  }

  // ---------- internals ----------

  private async ensureMic(): Promise<boolean> {
    this.patch({ mic: 'opening', error: null });
    const r = await this.ad.mic.request();
    if (!r.ok) {
      this.patch({ mic: 'off', error: r.error });
      this.emit('access-error', r.error);
      return false;
    }
    const needsSpeech = this.s.lesson.questions.some((q) => q.kind !== 'sing' && q.kind !== 'sing-seq' && q.kind !== 'sing-run' && q.kind !== 'rhythm-read');
    if (needsSpeech && !this.ad.stt.isSupported()) {
      const error: AccessError = { stage: 'recognition', code: 'unsupported', raw: 'SpeechRecognition is not available' };
      this.patch({ mic: 'off', error });
      this.emit('access-error', error);
      return false;
    }
    this.patch({ mic: 'off', error: null });
    return true;
  }

  private async say(text: string, signal: AbortSignal) {
    this.patch({ caption: text });
    await this.ad.tts.speak(text, this.cfg.outputLang, signal);
    throwIfAborted(signal);
  }

  private async playStim(stim: Stimulus[], signal: AbortSignal) {
    const { events, length } = renderStimulus(stim);
    await this.ad.audio.play(events, length, signal);
    throwIfAborted(signal);
    // The answer clock starts when the stimulus has finished being heard (spec J.4).
    this.clockStart = this.now();
    this.restartClockAtListen = false;
  }

  /** Response time for an answer given at `at`, or null when the clock isn't reliable. */
  private elapsed(at: number | null): number | null {
    if (at === null || this.clockStart === null) return null;
    const t = at - this.clockStart;
    return t >= 0 ? Math.round(t) : null;
  }

  private async runAll(
    signal: AbortSignal,
    opts: { skipPrompt?: boolean; replayOnly?: boolean; resumeIntro?: boolean; afterResolved?: boolean } = {},
  ) {
    if (this.view.stage === 'intro') {
      await this.runIntro(signal, opts.resumeIntro ? this.view.introStep : 0);
      this.patch({ stage: 'question', caption: null });
    }
    let first = true;
    while (this.view.stage === 'question') {
      if (!(first && opts.afterResolved)) {
        if (!isResolved(this.s.records[this.s.index])) {
          await this.runQuestion(signal, first ? opts : {});
        }
      } else {
        // feedback for a skip was already shown; give it a beat
        await this.ad.clock.sleep(700, signal);
      }
      first = false;
      throwIfAborted(signal);
      const adapted = this.hooks.adapt?.(this.s);
      if (adapted && adapted.length === this.s.lesson.questions.length) {
        this.s = { ...this.s, lesson: { ...this.s.lesson, questions: adapted } };
      }
      this.setSession(advance(this.s), { feedback: null, heard: null, interim: '' });
      this.silentCount = 0;
      if (this.s.phase === 'complete') {
        this.patch({ stage: 'complete', caption: null });
        this.ad.audio.cue('complete');
        this.emit('complete', summary(this.s));
        this.hooks.onComplete?.(this.s);
        const sm = summary(this.s);
        await this.say(narration.complete(this.cfg.outputLang, sm.firstTry, sm.total, sm.xp), signal).catch(() => {});
        this.patch({ caption: null });
        return;
      }
    }
  }

  private async runIntro(signal: AbortSignal, from: number) {
    const lesson = this.s.lesson;
    const l = this.cfg.outputLang;
    const nm = this.cfg.naming;
    for (let i = from; i < lesson.intro.length; i++) {
      const step = lesson.intro[i];
      this.s = newTurn(this.s, 'intro');
      this.patch({ introStep: i, caption: null });
      // Establishing material first (cadence / first chord), then the point of the step.
      await this.playStim(step.stimulus.slice(0, 1), signal);
      if (step.stimulus.length > 1) await this.playStim(step.stimulus.slice(1), signal);
      await this.say(introText(lesson, step, l, nm), signal);
      await this.ad.clock.sleep(300, signal);
    }
    await this.say(introGo(lesson, l), signal);
  }

  private async runQuestion(signal: AbortSignal, opts: { skipPrompt?: boolean; replayOnly?: boolean }) {
    const q = currentQuestion(this.s);
    const l = this.cfg.outputLang;
    if (!opts.skipPrompt) {
      this.setSession(newTurn(this.s, 'prompting'), { feedback: null, needsListenTap: false, singLive: null });
      if (!opts.replayOnly) await this.say(roundPrompt(q, l, this.cfg.naming, this.s.index + 1), signal);
      this.setSession(newTurn(this.s, 'playback'), { caption: null });
      await this.playStim(q.stimulus, signal);
    }
    if (q.kind === 'sing') return this.singLoop(q, signal);
    if (q.kind === 'sing-seq' || q.kind === 'sing-run') return this.singSeqLoop(q, signal);
    if (q.kind === 'rhythm-read') return this.readLoop(q, signal);
    await this.answerLoop(signal);
  }

  private waitFor(signal: AbortSignal): Promise<WaitResult> {
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new Cancelled());
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
      this.waiter = {
        turn: this.s.turn,
        resolve: (v) => {
          signal.removeEventListener('abort', onAbort);
          resolve(v);
        },
      };
    });
  }

  /** Grade a musical answer and give feedback. Returns true when the question is resolved. */
  private async evaluate(
    answer: Answer,
    signal: AbortSignal,
    sung?: SungResult,
    ev: {
      timeMs: number | null;
      modality: Modality;
      accuracy?: number;
      seqNotes?: string[];
      precision?: number;
      readHits?: (number | null)[];
      readExtra?: number;
    } = { timeMs: null, modality: 'buttons' },
  ): Promise<boolean> {
    const l = this.cfg.outputLang;
    this.silentCount = 0;
    const q = currentQuestion(this.s);
    const accuracy = ev.accuracy ?? accuracyFor(q, answer, sung);
    const [next, g] = grade(this.s, this.s.turn, this.s.index, answer, this.view.mode, { accuracy, timeMs: ev.timeMs, modality: ev.modality, precision: ev.precision });
    if (g.kind === 'stale') return false;
    const rec = next.records[next.index];
    const chips = { timeMs: ev.timeMs, attempt: rec.attempts.length, xp: rec.xp, accuracy, seqNotes: ev.seqNotes, readHits: ev.readHits, readExtra: ev.readExtra };
    this.setSession(next, { needsListenTap: false });
    this.emit('graded', { answer, result: g, ...chips });
    if (g.kind === 'correct') {
      this.ad.audio.cue('correct');
      this.patch({ feedback: { kind: g.firstTry ? 'correct' : 'correct-retry', answer: q.answer, given: answer, sung, ...chips } });
      await this.say(sung ? singFeedbackText(sung, l) : correctText(q, l, g.firstTry, this.cfg.naming), signal);
      await this.ad.clock.sleep(500, signal);
      return true;
    }
    this.ad.audio.cue('wrong');
    if (g.kind === 'retry') {
      this.patch({ feedback: { kind: 'retry', given: answer, sung, ...chips } });
      await this.say(sung ? singFeedbackText(sung, l) : retryText(q, l), signal);
      this.setSession(newTurn(this.s, 'playback'));
      await this.playStim(q.kind === 'sing' ? q.stimulus.slice(-1) : q.stimulus, signal);
      return false;
    }
    this.patch({ feedback: { kind: 'reveal', answer: q.answer, given: answer, sung, ...chips } });
    await this.say(revealText(q, l, this.cfg.naming), signal);
    // Hear your answer next to the right one (when it can be played), else the teaching gesture.
    await this.playStim(compareStimulus(q, answer) ?? explainStimulus(q), signal);
    await this.ad.clock.sleep(400, signal);
    return true;
  }

  /** Singing: capture pitch only during the window, score octave-insensitively, speak the direction. */
  private async singLoop(q: SingQuestion, signal: AbortSignal) {
    const l = this.cfg.outputLang;
    const maxSilent = this.cfg.maxSilentRetries ?? 2;
    for (;;) {
      throwIfAborted(signal);
      if (this.view.mode === 'buttons' || this.view.needsListenTap) {
        this.setSession(newTurn(this.s, 'listening'), { mic: 'off', singLive: null });
        const r = await this.waitFor(signal);
        if (r.kind !== 'record' && r.kind !== 'listen') continue;
        this.silentCount = 0;
        this.patch({ needsListenTap: false });
      } else {
        await this.ad.clock.sleep(this.cfg.settleMs ?? 250, signal);
      }
      this.setSession(newTurn(this.s, 'listening'), { mic: 'opening', caption: null, singLive: null });
      const turn = this.s.turn;
      if (this.restartClockAtListen || this.view.mode === 'buttons') {
        this.clockStart = this.now();
        this.restartClockAtListen = false;
      }
      let voicedAt: number | null = null;
      const targetHz = 440 * Math.pow(2, (q.targetMidi - 69) / 12);
      const res = await this.ad.pitch.sing({
        signal,
        onCapturing: () => {
          if (this.s.turn !== turn) return;
          this.ad.audio.cue('ready');
          this.patch({ mic: 'capturing' });
        },
        onFrame: (f) => {
          if (this.s.turn !== turn) return;
          let cents: number | null = null;
          if (f.hz && f.confidence > 0.8) {
            voicedAt ??= this.now();
            const c = 1200 * Math.log2(f.hz / targetHz);
            cents = ((((c + 600) % 1200) + 1200) % 1200) - 600;
          }
          this.patch({ mic: cents === null ? 'capturing' : 'speech', singLive: { cents, level: f.rms } });
        },
      });
      throwIfAborted(signal);
      if (this.s.turn !== turn) return;
      this.patch({ mic: 'off' });
      if (res.kind === 'aborted') throw new Cancelled();
      if (res.kind === 'error') {
        this.s = noteUnclear(this.s, turn);
        this.emit('access-error', res.error);
        this.patch({ error: res.error, singLive: null });
        await this.waitFor(signal);
        continue;
      }
      const sung = res.kind === 'frames' ? evaluateSung(res.frames, q.targetMidi) : null;
      if (!sung || sung.status === 'unclear') {
        // Unusable capture is never a musical mistake.
        this.s = noteUnclear(this.s, turn);
        this.silentCount++;
        this.restartClockAtListen = true;
        this.patch({ feedback: { kind: sung ? 'unclear' : 'silence', sung: sung ?? undefined } });
        if (this.silentCount > maxSilent && this.view.mode === 'voice') {
          this.patch({ needsListenTap: true });
          continue;
        }
        await this.say(sung ? unclearText(q, l) : silenceText(q, l), signal);
        if (this.view.mode === 'voice') {
          this.setSession(newTurn(this.s, 'playback'));
          await this.playStim(q.stimulus.slice(-1), signal);
        }
        continue;
      }
      this.emit('sung', sung);
      if (await this.evaluate(sung.status, signal, sung, { timeMs: this.elapsed(voicedAt), modality: 'sing' })) return;
    }
  }

  /** Sing a sequence of degrees: capture until the singer stops, segment, align, partial credit. */
  private async singSeqLoop(q: SingSeqQuestion | SingRunQuestion, signal: AbortSignal) {
    const l = this.cfg.outputLang;
    const maxSilent = this.cfg.maxSilentRetries ?? 2;
    for (;;) {
      throwIfAborted(signal);
      if (this.view.mode === 'buttons' || this.view.needsListenTap) {
        this.setSession(newTurn(this.s, 'listening'), { mic: 'off', singLive: null });
        const r = await this.waitFor(signal);
        if (r.kind !== 'record' && r.kind !== 'listen') continue;
        this.silentCount = 0;
        this.patch({ needsListenTap: false });
      } else {
        await this.ad.clock.sleep(this.cfg.settleMs ?? 250, signal);
      }
      this.setSession(newTurn(this.s, 'listening'), { mic: 'opening', caption: null, singLive: null });
      const turn = this.s.turn;
      if (this.restartClockAtListen || this.view.mode === 'buttons') {
        this.clockStart = this.now();
        this.restartClockAtListen = false;
      }
      let voicedAt: number | null = null;
      const res = await this.ad.pitch.sing({
        signal,
        maxMs: q.kind === 'sing-run' ? (q.midis.length / q.run.nps) * 1000 * 2 + 4000 : q.degrees.length * 1200 + 3500,
        silenceMs: 4500,
        endSilenceMs: q.kind === 'sing-run' ? 900 : 1100,
        hopMs: q.kind === 'sing-run' ? runHopMs(q.run.nps) : undefined,
        onCapturing: () => {
          if (this.s.turn !== turn) return;
          this.ad.audio.cue('ready');
          this.patch({ mic: 'capturing' });
        },
        onFrame: (f) => {
          if (this.s.turn !== turn) return;
          if (f.hz && f.confidence > 0.8) {
            voicedAt ??= this.now();
            this.patch({ mic: 'speech' });
          }
        },
      });
      throwIfAborted(signal);
      if (this.s.turn !== turn) return;
      this.patch({ mic: 'off' });
      if (res.kind === 'aborted') throw new Cancelled();
      if (res.kind === 'error') {
        this.s = noteUnclear(this.s, turn);
        this.patch({ error: res.error });
        await this.waitFor(signal);
        continue;
      }
      const g = res.kind !== 'frames' ? null : q.kind === 'sing-run' ? gradeRun(res.frames, q.midis, q.run.nps) : gradeSungSequence(res.frames, q.midis);
      if (!g || g.unclear) {
        this.s = noteUnclear(this.s, turn);
        this.silentCount++;
        this.restartClockAtListen = true;
        this.patch({ feedback: { kind: g ? 'unclear' : 'silence' } });
        if (this.silentCount > maxSilent && this.view.mode === 'voice') {
          this.patch({ needsListenTap: true });
          continue;
        }
        await this.say(silenceText(q, l), signal);
        continue;
      }
      const statuses = g.notes.map((n) => n.status);
      if (q.kind === 'sing-run' && !g.pass && 'clarity' in g) {
        const summary = runSummary(g, l);
        if (summary) this.patch({ caption: summary });
      }
      if (await this.evaluate(g.pass ? 'accurate' : 'wrong', signal, undefined, { timeMs: this.elapsed(voicedAt), modality: 'sing', accuracy: g.accuracy, seqNotes: statuses })) return;
    }
  }

  /** Rhythm reading: count-in + metronome on the audio clock; taps or "ta" onsets graded per onset. */
  private async readLoop(q: RhythmReadQuestion, signal: AbortSignal) {
    const l = this.cfg.outputLang;
    const maxSilent = this.cfg.maxSilentRetries ?? 2;
    for (;;) {
      throwIfAborted(signal);
      if (this.view.needsListenTap) {
        this.setSession(newTurn(this.s, 'listening'), { mic: 'off' });
        const r = await this.waitFor(signal);
        if (r.kind !== 'listen' && r.kind !== 'record') continue;
        this.silentCount = 0;
        this.patch({ needsListenTap: false });
      }
      this.setSession(newTurn(this.s, 'listening'), { feedback: null, readTaps: 0, beat: null });
      this.readTaps = [];
      this.readStart = null;
      // Voice mode: listen for "ta" syllables / knocks as onsets (never speech recognition — spec G.5).
      let mic: AbortController | null = null;
      let modality: Modality = 'tap';
      if (this.view.mode === 'voice' && this.ad.knock) {
        mic = new AbortController();
        const micSignal = mic.signal;
        signal.addEventListener('abort', () => mic?.abort(), { once: true });
        const opened = await new Promise<boolean>((resolve) => {
          void this.ad.knock!.listen({ signal: micSignal, onReady: () => resolve(true), onKnock: (perf) => this.registerOnset(perf) }).then((r) => {
            if (!r.ok) {
              this.patch({ error: r.error });
              resolve(false);
            }
          });
        });
        if (!opened) {
          await this.waitFor(signal);
          continue;
        }
        modality = 'knock';
        this.patch({ mic: 'capturing' });
      }
      let n = 0;
      this.readOpen = true;
      try {
        await this.ad.audio.playTimeline(
          readTimeline(q.rhythm, q.bpm),
          signal,
          (i, accent) => this.patch({ beat: { i, accent, n: n++ } }),
          (perf) => {
            this.readStart = perf;
            this.patch({ readStartPerf: perf });
          },
        );
      } finally {
        this.readOpen = false;
        mic?.abort();
        this.patch({ mic: 'off', beat: null, readStartPerf: null });
      }
      throwIfAborted(signal);
      if (this.readTaps.length === 0) {
        // Nothing registered: unusable input, never a musical mistake.
        this.s = noteUnclear(this.s, this.s.turn);
        this.silentCount++;
        this.patch({ feedback: { kind: 'silence' } });
        if (this.silentCount > maxSilent) {
          this.patch({ needsListenTap: true });
          continue;
        }
        await this.say(l === 'en' ? "I didn't catch any taps. Again, after the count-in." : 'לא קלטתי הקשות. שוב, אחרי הספירה.', signal);
        continue;
      }
      const g = gradeReading(q.rhythm, q.bpm, this.readTaps, q.level);
      const hits = g.grade.hits.map((h) => h.offsetMs);
      if (
        await this.evaluate(g.pass ? 'accurate' : 'wrong', signal, undefined, {
          timeMs: null,
          modality,
          accuracy: g.accuracy,
          precision: g.precision,
          readHits: hits,
          readExtra: g.grade.extra,
        })
      )
        return;
    }
  }

  /** Spoken / button answers. Loops until the current question is resolved. */
  private async answerLoop(signal: AbortSignal) {
    const l = this.cfg.outputLang;
    const settle = this.cfg.settleMs ?? 250;
    const maxSilent = this.cfg.maxSilentRetries ?? 2;
    for (;;) {
      throwIfAborted(signal);
      const q = currentQuestion(this.s);
      let answer: Answer | null = null;
      let ev: { timeMs: number | null; modality: Modality } = { timeMs: null, modality: 'buttons' };

      if (this.view.mode === 'buttons' || this.view.needsListenTap) {
        this.setSession(newTurn(this.s, 'listening'), { mic: 'off' });
        const r = await this.waitFor(signal);
        if (r.kind === 'listen') {
          this.silentCount = 0;
          this.patch({ needsListenTap: false });
          continue;
        }
        if (r.kind !== 'answer') continue;
        answer = r.answer;
        ev = { timeMs: this.elapsed(this.tapAt), modality: 'buttons' };
      } else {
        await this.ad.clock.sleep(settle, signal);
        this.setSession(newTurn(this.s, 'listening'), { mic: 'opening', interim: '', caption: null });
        const turn = this.s.turn;
        if (this.restartClockAtListen) {
          this.clockStart = this.now();
          this.restartClockAtListen = false;
        }
        let speechAt: number | null = null;
        const res = await this.ad.stt.listen({
          lang: RECOGNIZER_LANG[this.cfg.inputLang],
          signal,
          onCapturing: () => {
            if (this.s.turn !== turn) return;
            this.ad.audio.cue('ready');
            this.patch({ mic: 'capturing' });
          },
          onSpeech: () => {
            if (this.s.turn !== turn) return;
            speechAt ??= this.now();
            this.patch({ mic: 'speech' });
          },
          onInterim: (t) => this.s.turn === turn && this.patch({ interim: t }),
        });
        throwIfAborted(signal);
        if (this.s.turn !== turn) return; // stale
        this.patch({ mic: 'off' });

        if (res.kind === 'aborted') throw new Cancelled();
        if (res.kind === 'error') {
          this.s = noteUnclear(this.s, turn);
          this.emit('access-error', res.error);
          this.patch({ error: res.error });
          await this.waitFor(signal); // resolved by retryAccess (which restarts) or mode switch
          continue;
        }
        if (res.kind === 'silence') {
          this.s = noteUnclear(this.s, turn);
          this.silentCount++;
          this.emit('silence');
          this.restartClockAtListen = true;
          this.patch({ feedback: { kind: 'silence' }, heard: null });
          if (this.silentCount > maxSilent) {
            this.patch({ needsListenTap: true });
            continue;
          }
          await this.say(silenceText(q, l), signal);
          continue;
        }
        const parsed = parseAnswer(q, res.alternatives, this.cfg.inputNaming ?? this.cfg.naming);
        this.patch({ heard: parsed.heard || res.alternatives[0] || '', interim: '' });
        this.emit('heard', { alternatives: res.alternatives, parsed });
        if (parsed.kind === 'command') {
          if (parsed.command === 'repeat') {
            this.s = noteReplay(this.s);
            this.setSession(newTurn(this.s, 'playback'), { feedback: null });
            await this.playStim(q.stimulus, signal);
            continue;
          }
          if (parsed.command === 'skip') {
            this.setSession(skipQuestion(this.s), { feedback: { kind: 'skipped', answer: q.answer } });
            await this.say(narration.skipped(l), signal);
            return;
          }
          if (parsed.command === 'stop') {
            this.pause();
            throw new Cancelled();
          }
          if (parsed.command === 'explain') {
            this.patch({ stage: 'intro' });
            await this.runIntro(signal, 0);
            this.patch({ stage: 'question', caption: null });
            await this.runQuestion(signal, {});
            return;
          }
        }
        if (parsed.kind === 'ambiguous' || parsed.kind === 'unrecognized') {
          this.s = noteUnclear(this.s, turn);
          this.silentCount++;
          this.restartClockAtListen = true;
          this.patch({ feedback: { kind: parsed.kind === 'ambiguous' ? 'ambiguous' : 'unclear' } });
          if (this.silentCount > maxSilent) {
            this.patch({ needsListenTap: true });
            continue;
          }
          await this.say(parsed.kind === 'ambiguous' ? ambiguousText(q, parsed.candidates, l, this.cfg.naming) : unclearText(q, l), signal);
          continue;
        }
        if (parsed.kind !== 'answer') continue;
        answer = parsed.value;
        // Voice time = speech start (the recognizer's own delay is not the player's); unreliable without it.
        ev = { timeMs: this.elapsed(speechAt), modality: 'voice' };
      }

      if (await this.evaluate(answer, signal, undefined, ev)) return;
    }
  }
}
