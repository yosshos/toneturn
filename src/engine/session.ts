// Pure lesson-session state. All scoring happens here, guarded by turn tokens
// so a late recognizer callback or a double click can never score twice.

import type { LessonDef } from './lesson';

export type Phase =
  | 'idle'
  | 'intro'
  | 'prompting'
  | 'playback'
  | 'listening'
  | 'evaluating'
  | 'feedback'
  | 'paused'
  | 'complete';

export type InputMode = 'voice' | 'buttons';

export type Outcome = 'pending' | 'correct' | 'correct-retry' | 'revealed' | 'skipped';

export interface Attempt {
  answer: number;
  correct: boolean;
  via: InputMode;
}

export interface QuestionRecord {
  attempts: Attempt[];
  outcome: Outcome;
  xp: number;
  /** Non-musical misses (silence, unclear speech, permission errors). Never penalized. */
  unclear: number;
}

export interface SessionState {
  lesson: LessonDef;
  phase: Phase;
  index: number;
  /** Monotonic token; every async step is tagged with the turn it belongs to. */
  turn: number;
  records: QuestionRecord[];
  xp: number;
}

export type GradeResult =
  | { kind: 'stale' }
  | { kind: 'correct'; firstTry: boolean; xp: number }
  | { kind: 'retry'; attemptsLeft: number }
  | { kind: 'reveal' };

export function createSession(lesson: LessonDef): SessionState {
  return {
    lesson,
    phase: 'idle',
    index: 0,
    turn: 0,
    records: lesson.questions.map(() => ({ attempts: [], outcome: 'pending', xp: 0, unclear: 0 })),
    xp: 0,
  };
}

/** Start a new async turn (prompt, listen, …). Older turns become stale. */
export function newTurn(s: SessionState, phase: Phase): SessionState {
  return { ...s, phase, turn: s.turn + 1 };
}

export function setPhase(s: SessionState, phase: Phase, turn: number): SessionState | null {
  if (turn !== s.turn) return null;
  return { ...s, phase };
}

export const currentQuestion = (s: SessionState) => s.lesson.questions[s.index];
export const currentRecord = (s: SessionState) => s.records[s.index];
export const isResolved = (r: QuestionRecord) => r.outcome !== 'pending';

function patchRecord(s: SessionState, i: number, r: QuestionRecord): QuestionRecord[] {
  const records = s.records.slice();
  records[i] = r;
  return records;
}

/** Grade a musical answer for the current question. Idempotent per turn + question. */
export function grade(
  s: SessionState,
  turn: number,
  questionIndex: number,
  answer: number,
  via: InputMode,
): [SessionState, GradeResult] {
  if (turn !== s.turn || questionIndex !== s.index || s.phase === 'complete' || s.phase === 'paused') {
    return [s, { kind: 'stale' }];
  }
  const rec = s.records[questionIndex];
  if (isResolved(rec)) return [s, { kind: 'stale' }];
  const q = s.lesson.questions[questionIndex];
  const correct = answer === q.answer;
  const attempts = [...rec.attempts, { answer, correct, via }];
  const { xpPerCorrect, attemptLimit } = s.lesson.scoring;
  // The turn advances on every grade so a duplicate delivery of the same answer is stale.
  const base: SessionState = { ...s, turn: s.turn + 1, phase: 'feedback' };
  if (correct) {
    const firstTry = attempts.length === 1;
    const xp = firstTry ? xpPerCorrect : 0;
    const next = { attempts, outcome: (firstTry ? 'correct' : 'correct-retry') as Outcome, xp, unclear: rec.unclear };
    return [{ ...base, records: patchRecord(s, questionIndex, next), xp: s.xp + xp }, { kind: 'correct', firstTry, xp }];
  }
  if (attempts.length >= attemptLimit) {
    const next = { attempts, outcome: 'revealed' as Outcome, xp: 0, unclear: rec.unclear };
    return [{ ...base, records: patchRecord(s, questionIndex, next) }, { kind: 'reveal' }];
  }
  const next = { ...rec, attempts };
  return [{ ...base, records: patchRecord(s, questionIndex, next) }, { kind: 'retry', attemptsLeft: attemptLimit - attempts.length }];
}

/** Record silence / unclear speech / access errors. No attempt is consumed. */
export function noteUnclear(s: SessionState, turn: number): SessionState {
  if (turn !== s.turn) return s;
  const rec = s.records[s.index];
  return { ...s, records: patchRecord(s, s.index, { ...rec, unclear: rec.unclear + 1 }) };
}

export function skip(s: SessionState): SessionState {
  const rec = s.records[s.index];
  if (isResolved(rec) || s.phase === 'complete') return s;
  return { ...s, turn: s.turn + 1, phase: 'feedback', records: patchRecord(s, s.index, { ...rec, outcome: 'skipped' }) };
}

/** Move to the next question, or complete. Only valid once the current one is resolved. */
export function advance(s: SessionState): SessionState {
  if (!isResolved(s.records[s.index])) return s;
  if (s.index + 1 >= s.lesson.questions.length) return { ...s, phase: 'complete', turn: s.turn + 1 };
  return { ...s, index: s.index + 1, phase: 'prompting', turn: s.turn + 1 };
}

export function summary(s: SessionState) {
  const firstTry = s.records.filter((r) => r.outcome === 'correct').length;
  return { firstTry, total: s.records.length, xp: s.xp };
}
