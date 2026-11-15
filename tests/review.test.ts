// The take review (COURSE-FEEDBACK-UI slice 2): verdict, chips and the one suggestion come from the take's own numbers.
import { describe, expect, it } from 'vitest';
import { evenGrade, reviewOf } from '../src/engine/drills/review';
import type { NoteResult, TakeMetrics } from '../src/engine/drills/types';

const exp = (beat: number) => ({ pitch: 60, beat, dur: 0.5, hand: 'R' as const });
const note = (i: number, ok: boolean, played = true, dev = 0): NoteResult => ({ exp: exp(i), played: played ? { pitch: ok ? 60 : 61, on: 0, off: null, vel: 64 } : null, dev: played ? dev : null, ok });
const take = (o: Partial<TakeMetrics> & { perNote: NoteResult[] }): TakeMetrics =>
  ({ bpm: 80, nps: 2, accuracy: o.perNote.filter((r) => r.ok).length / o.perNote.length, wrong: 0, missing: 0, timingMean: 0, timingSD: 20, cvR: 0.05, cvL: null, handsMean: null, handsAbs: null, chordSpread: null, velSD: null, velMean: null, bandHit: null, slope: null, r2: null, accentGap: null, kot: null, kdr: null, hesitations: 0, glitches: [], chordToneOnBeats: null, voiceLeading: null, verdict: 'clean', why: { en: '', he: '' }, ...o }) as TakeMetrics;

describe('reviewOf', () => {
  it('a clean take: counts from perNote, no suggestion, evenness graded', () => {
    const r = reviewOf(take({ perNote: Array.from({ length: 16 }, (_, i) => note(i, true)) }));
    expect(r.verdict).toBe('clean');
    expect(r.notes).toMatchObject({ ok: 16, total: 16 });
    expect(r.suggestion).toBeNull();
    expect(r.soft).toBe(false);
    expect(r.even).toBe(4);
    expect(r.time?.tendency).toBe('even');
  });
  it('rushing: the suggestion is to wait for the click, not a slower tempo', () => {
    const r = reviewOf(take({ verdict: 'not', timingMean: -45, perNote: Array.from({ length: 10 }, (_, i) => note(i, i < 5)) }));
    expect(r.time?.tendency).toBe('early');
    expect(r.suggestion).toBe('wait');
  });
  it('late, under 60 %: try slower', () => {
    const r = reviewOf(take({ verdict: 'not', timingMean: 25, perNote: Array.from({ length: 10 }, (_, i) => note(i, i < 5)) }));
    expect(r.time?.tendency).toBe('late');
    expect(r.suggestion).toBe('slower');
    expect(r.soft).toBe(false);
  });
  it('a weak take (< 40 %) is soft: total and one way forward (free time when offered)', () => {
    const t = take({ verdict: 'not', perNote: Array.from({ length: 10 }, (_, i) => note(i, i < 3, i < 6)) });
    const r = reviewOf(t, { canFree: true });
    expect(r.soft).toBe(true);
    expect(r.notes).toMatchObject({ ok: 3, total: 10 });
    expect(r.suggestion).toBe('free');
    expect(reviewOf(t).suggestion).toBe('slower');
  });
  it('almost at ≥ 60 %: no suggestion beyond Again; a free-time take shows no timing', () => {
    expect(reviewOf(take({ verdict: 'almost', perNote: Array.from({ length: 10 }, (_, i) => note(i, i < 8)) })).suggestion).toBeNull();
    const f = reviewOf(take({ verdict: 'almost', perNote: [note(0, true)] }), { free: true });
    expect(f.time).toBeNull();
    expect(f.even).toBeNull();
  });
  it('evenness grade', () => {
    expect([0.02, 0.05, 0.08, 0.12, 0.3, null].map(evenGrade)).toEqual([5, 4, 3, 2, 1, null]);
  });
});
