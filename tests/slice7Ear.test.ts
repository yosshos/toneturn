// Slice 7 (COURSE-FEEDBACK-UI §4.6): the Yours / Right replay pair with the why as a sound, and partial mastery credit
// for chords / dictations (the streak stays whole items only).
import { describe, expect, it } from 'vitest';
import { degreeQuestion, intervalQuestion, nameSeqQuestion, qualityQuestion, seventhQuestion, inversionQuestion, renderStimulus, type PlaceQuestion, type Stimulus } from '../src/engine/lesson';
import { replayPair, stepwiseToTonic } from '../src/engine/replayPair';
import { accuracyFor, isCategorical, ratingScore, seqCredit, type ItemOutcome } from '../src/engine/scoring';
import { createSession, grade } from '../src/engine/session';
import { pc } from '../src/engine/pitch';
import { jazzVoicing } from '../src/engine/jazz';

const midisOf = (st: Stimulus[] | null) => (st ? renderStimulus(st).events.map((e) => e.midi) : []);

describe('replay pair: the real answers', () => {
  it('degree: yours and right each walk stepwise to the tonic', () => {
    const q = degreeQuestion('d', pc('C'), 5, [1, 2, 3, 4, 5, 6, 7]);
    const tonic = q.targetMidi - 7;
    expect(stepwiseToTonic(60, 3)).toEqual([64, 62, 60]);
    expect(stepwiseToTonic(60, 7)).toEqual([71, 72]);
    expect(stepwiseToTonic(60, 1)).toEqual([60]);
    const p = replayPair(q, 3)!;
    expect(midisOf(p.yours)).toEqual([tonic + 4, tonic + 2, tonic]);
    expect(midisOf(p.right)).toEqual([tonic + 7, tonic + 5, tonic + 4, tonic + 2, tonic]);
  });
  it('quality: the chord, then its arpeggio — yours is the quality picked', () => {
    const q = qualityQuestion('q', pc('C'), 'maj');
    const p = replayPair(q, 'min')!;
    const r = q.rootMidi;
    expect(p.yours![0]).toEqual({ kind: 'chord', midis: [r, r + 3, r + 7], duration: 1.2 });
    expect(p.yours![2]).toMatchObject({ kind: 'chord', midis: [r, r + 3, r + 7], arpeggio: true });
    expect(p.right[0]).toMatchObject({ midis: [r, r + 4, r + 7] });
    expect(p.right[2]).toMatchObject({ arpeggio: true });
  });
  it('seventh chords: the picked voicing, chord then arpeggio', () => {
    const q = seventhQuestion('s', pc('D'), 'm7');
    const p = replayPair(q, '7')!;
    expect(p.yours![0]).toMatchObject({ kind: 'chord', midis: jazzVoicing(2, '7') });
    expect(p.right[2]).toMatchObject({ kind: 'chord', midis: jazzVoicing(2, 'm7'), arpeggio: true });
  });
  it('interval: melodic, then harmonic', () => {
    const q = intervalQuestion('i', 60, 'P5', 'harmonic');
    const p = replayPair(q, 'M3')!;
    expect(p.yours).toEqual([
      { kind: 'notes', midis: [60, 64], each: 0.6 },
      { kind: 'rest', duration: 0.25 },
      { kind: 'chord', midis: [60, 64], duration: 1.2 },
    ]);
    expect(p.right[0]).toEqual({ kind: 'notes', midis: [60, 67], each: 0.6 });
  });
  it('other kinds split their compare sound: yours first, the target second', () => {
    const q = inversionQuestion('v', pc('C'), 'third');
    const p = replayPair(q, 'fifth')!;
    expect(p.yours).toEqual(inversionQuestion('x', pc('C'), 'fifth').stimulus);
    expect(p.right).toEqual(q.stimulus);
    const n = nameSeqQuestion('n', pc('C'), [1, 3, 5], 'sound');
    const pn = replayPair(n, 'C0.F0.G0')!;
    expect(midisOf(pn.yours)).toHaveLength(3);
    expect(midisOf(pn.right)).toEqual(n.midis);
  });
  it('no pair for a right answer; no "yours" when the answer is not a sound', () => {
    const q = degreeQuestion('d', pc('C'), 5, [1, 5]);
    expect(replayPair(q, 5)).toBeNull();
    expect(replayPair(q, undefined)).toBeNull();
    const bad = replayPair(q, 'x' as never)!;
    expect(bad.yours).toBeNull();
    expect(bad.right.length).toBeGreaterThan(0);
  });
});

describe('partial mastery credit', () => {
  it('note-by-note: 3 of 4 = 0.75, extra notes cost, enharmonics count', () => {
    expect(seqCredit(['C', 'E', 'G', 'B'], ['C', 'E', 'G', 'A'])).toBe(0.75);
    expect(seqCredit(['C', 'E'], ['C', 'E', 'G'])).toBeCloseTo(2 / 3);
    expect(seqCredit(['C', 'E'], [])).toBe(0);
    const n = nameSeqQuestion('n', pc('C'), [1, 3, 5, 7], 'sound');
    expect(n.answer).toBe('C0.E0.G0.B0');
    expect(accuracyFor(n, 'C0.E0.G0.A0')).toBe(0.75);
    expect(accuracyFor(n, 'B1.E0.G0.B0')).toBe(1);
    expect(accuracyFor(n, n.answer)).toBe(1);
  });
  it('a chord on the keys keeps its share in the rating even when revealed (not categorical)', () => {
    const q: PlaceQuestion = { id: 'p', kind: 'place', topic: 't', level: 1, seed: 1, skill: 'chords' as never, ask: { en: '', he: '' }, target: [60, 64, 67, 71], as: 'set', match: 'exact', answer: '60.64.67.71', choices: [], stimulus: [], difficulty: 1000 } as PlaceQuestion;
    expect(isCategorical(q)).toBe(false);
    expect(accuracyFor(q, '60.64.67.69')).toBe(0.75);
    const o: ItemOutcome = { correctOn: null, attempts: [{ correct: false, accuracy: 0.75, timeMs: null, modality: 'buttons' }], replays: 0, timed: false };
    expect(ratingScore(q, o)).toBeCloseTo(0.75);
  });
  it('the streak counts whole items only: 3 of 4 is not a right answer', () => {
    const n = nameSeqQuestion('n', pc('C'), [1, 3, 5, 7], 'sound');
    const s = createSession({ id: 'review', version: 1, skill: 'sequences' as never, scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions: [n] });
    const [next, g] = grade(s, s.turn, 0, 'C0.E0.G0.A0', 'buttons', { accuracy: accuracyFor(n, 'C0.E0.G0.A0') });
    expect(g.kind).toBe('reveal');
    expect(next.records[0].outcome).toBe('revealed');
    expect(next.records[0].attempts[0]).toMatchObject({ correct: false, accuracy: 0.75 });
  });
});
