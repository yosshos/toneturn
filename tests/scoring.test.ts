import { describe, expect, it } from 'vitest';
import {
  accuracyFor,
  attemptCredit,
  isTimed,
  pitchAccuracy,
  ratingScore,
  referenceTime,
  speedFactor,
  tournamentPoints,
  xpFor,
  type ItemOutcome,
} from '../src/engine/scoring';
import { degreeQuestion, degreeSeqQuestion, singQuestion } from '../src/engine/lesson';
import { pc } from '../src/engine/pitch';
import { createSession, grade, newTurn, advance, type SessionState } from '../src/engine/session';
import { bflatTwoHomes } from '../src/engine/lesson';
import { resultFromSession } from '../src/storage/progress';

const q2 = degreeQuestion('q', pc('C'), 5, [1, 5]);
const q7 = degreeQuestion('q', pc('C'), 5, [1, 2, 3, 4, 5, 6, 7]);
const qs = singQuestion('s', pc('C'), 5);
const qq = degreeSeqQuestion('d', pc('C'), [1, 3, 5, 3, 1]);

const att = (correct: boolean, timeMs: number | null = null, accuracy = correct ? 1 : 0, modality: 'buttons' | 'voice' | 'sing' = 'buttons') => ({ correct, accuracy, timeMs, modality });
const outcome = (attempts: ReturnType<typeof att>[], timed = true, replays = 0): ItemOutcome => {
  const k = attempts.findIndex((a) => a.correct);
  return { correctOn: k >= 0 ? k + 1 : null, attempts, replays, timed };
};

describe('accuracy', () => {
  it('sung pitch: full within ±35 ¢, linear to 0 at ±100 ¢', () => {
    expect(pitchAccuracy(20)).toBe(1);
    expect(pitchAccuracy(-35)).toBe(1);
    expect(pitchAccuracy(67.5)).toBeCloseTo(0.5);
    expect(pitchAccuracy(120)).toBe(0);
    expect(accuracyFor(qs, 'flat', { status: 'flat', cents: -60, detectedMidi: 0, voicedSeconds: 1 })).toBeCloseTo(40 / 65);
    expect(accuracyFor(qs, 'wrong', { status: 'wrong', cents: 300, detectedMidi: 0, voicedSeconds: 1 })).toBe(0);
  });
  it('sequences: fraction of notes right, extras count against', () => {
    expect(accuracyFor(qq, '1-3-5-3-1')).toBe(1);
    expect(accuracyFor(qq, '1-3-4-3-1')).toBeCloseTo(0.8);
    expect(accuracyFor(qq, '1-3-5-5-3-1')).toBeCloseTo(5 / 6);
  });
});

describe('attempts with guessing correction', () => {
  it('2-choice retry is worth nothing, more choices more', () => {
    expect(attemptCredit(1, true, 2)).toBe(1);
    expect(attemptCredit(2, true, 2)).toBe(0);
    expect(attemptCredit(2, true, 3)).toBeCloseTo(0.25);
    expect(attemptCredit(2, true, 4)).toBeCloseTo(1 / 3);
    expect(attemptCredit(2, true, 7)).toBeCloseTo(5 / 12);
    expect(attemptCredit(2, false, 0)).toBe(0.5);
    expect(attemptCredit(3, false, 0)).toBe(0.25);
  });
});

describe('response time', () => {
  it('reference times depend on modality, choices and length', () => {
    expect(referenceTime(q2, 'buttons')).toBe(1500);
    expect(referenceTime(q7, 'buttons')).toBe(3000);
    expect(referenceTime(q2, 'voice')).toBe(2000);
    expect(referenceTime(qq, 'voice')).toBe(2000 + 4 * 600);
  });
  it('f(t): 1 at/below Tref, 0.75 at 2×, floor 0.5, unknown time = 1', () => {
    expect(speedFactor(800, 1500)).toBe(1);
    expect(speedFactor(3000, 1500)).toBeCloseTo(0.75);
    expect(speedFactor(60000, 1500)).toBe(0.5);
    expect(speedFactor(null, 1500)).toBe(1);
  });
});

describe('score properties (spec J.8)', () => {
  const times = [300, 1500, 2500, 5000, 12000, 60000];
  it('more time never increases any score', () => {
    for (let i = 1; i < times.length; i++) {
      const a = outcome([att(true, times[i - 1])]);
      const b = outcome([att(true, times[i])]);
      expect(ratingScore(q7, b)).toBeLessThanOrEqual(ratingScore(q7, a));
      expect(xpFor(q7, b, 10)).toBeLessThanOrEqual(xpFor(q7, a, 10));
      expect(tournamentPoints(1, times[i], 10000, 0)).toBeLessThanOrEqual(tournamentPoints(1, times[i - 1], 10000, 0));
    }
  });
  it('more attempts never increase a score', () => {
    const first = outcome([att(true, 1000)]);
    const second = outcome([att(false, 1000), att(true, 1000)]);
    const never = outcome([att(false, 1000), att(false, 1000)]);
    for (const q of [q2, q7]) {
      expect(ratingScore(q, second)).toBeLessThanOrEqual(ratingScore(q, first));
      expect(ratingScore(q, never)).toBeLessThanOrEqual(ratingScore(q, second));
      expect(xpFor(q, second, 10)).toBeLessThanOrEqual(xpFor(q, first, 10));
    }
  });
  it('higher accuracy never decreases a score', () => {
    let prevR = -1;
    let prevX = -1;
    for (const a of [0.2, 0.5, 0.8, 1]) {
      const o = outcome([{ correct: a === 1, accuracy: a, timeMs: 1000, modality: 'sing' }]);
      expect(ratingScore(qs, o)).toBeGreaterThanOrEqual(prevR);
      expect(xpFor(qs, o, 15)).toBeGreaterThanOrEqual(prevX);
      prevR = ratingScore(qs, o);
      prevX = xpFor(qs, o, 15);
    }
  });
  it('untimed: scores are independent of time', () => {
    for (const t of times) {
      expect(ratingScore(q7, outcome([att(true, t)], false))).toBe(1);
      expect(xpFor(q7, outcome([att(true, t)], false), 10)).toBe(10);
    }
  });
  it('time moves the rating by at most 20%', () => {
    expect(ratingScore(q7, outcome([att(true, 999999)]))).toBeCloseTo(0.9); // f floor 0.5 → 0.8 + 0.2·0.5
    expect(ratingScore(q7, outcome([att(true, 100)]))).toBe(1);
  });
  it('replays lower the rating slightly, floored', () => {
    expect(ratingScore(q2, outcome([att(true)], false, 1))).toBeCloseTo(0.95);
    expect(ratingScore(q2, outcome([att(true)], false, 20))).toBeCloseTo(0.8);
  });
  it('XP: 10 for a first-try answer, +0–3 speed bonus when timed, minimum 1 for effort', () => {
    expect(xpFor(q7, outcome([att(true, 500)]), 10)).toBe(13);
    expect(xpFor(q7, outcome([att(true, 6000)]), 10)).toBe(12); // 2× Tref (3 s for 7 choices) → f 0.75 → bonus round(3 × 0.5) = 2
    expect(xpFor(q2, outcome([att(false), att(true)]), 10)).toBe(1);
    expect(xpFor(q2, outcome([att(false), att(false)]), 10)).toBe(1);
    expect(xpFor(q2, outcome([att(true)]), 0)).toBe(0); // placement / puzzle: no XP
  });
  it('tournament points bounded 0–1500, 0 for wrong or late', () => {
    expect(tournamentPoints(1, 0, 10000, 99)).toBe(1500);
    expect(tournamentPoints(1, 10000, 10000, 0)).toBe(500);
    expect(tournamentPoints(0, 100, 10000, 5)).toBe(0);
    expect(tournamentPoints(1, 10001, 10000, 5)).toBe(0);
  });
  it('untimed during the first week unless the player chooses', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(isTimed(null, '2026-11-05T12:00:00Z', now)).toBe(false);
    expect(isTimed(null, '2026-11-01T12:00:00Z', now)).toBe(true);
    expect(isTimed(true, '2026-11-09T12:00:00Z', now)).toBe(true);
    expect(isTimed(false, '2026-01-01T00:00:00Z', now)).toBe(false);
  });
});

describe('evidence flows into results', () => {
  it('session XP and rating items carry accuracy, time and graded score', () => {
    let s: SessionState = { ...newTurn(createSession(bflatTwoHomes(3)), 'listening'), timed: true };
    const q0 = s.lesson.questions[0];
    [s] = grade(s, s.turn, 0, q0.answer, 'buttons', { timeMs: 700 });
    s = advance(s);
    const q1 = s.lesson.questions[1];
    [s] = grade(s, s.turn, 1, q1.answer, 'voice', { timeMs: 8000 });
    s = advance(s);
    const q2b = s.lesson.questions[2];
    [s] = grade(s, s.turn, 2, q2b.choices.find((c) => c !== q2b.answer)!, 'buttons', { timeMs: 900 });
    [s] = grade(s, s.turn, 2, q2b.answer, 'buttons', { timeMs: 900 });
    s = advance(s);
    expect(s.records.map((r) => r.xp)).toEqual([13, 10, 1]);
    const r = resultFromSession(s, 'S', new Date());
    expect(r.items!.map((i) => i.score)).toEqual([1, 0.9, 0]); // fast; 4× voice Tref → 0.8 + 0.2·0.5; 2-choice retry → 0
    expect(r.items![0].timeMs).toBe(700);
  });
});
