import { describe, expect, it } from 'vitest';
import { noteChoice, phraseOrg, phrasingSummary, playRestCheck, type PNoteIn } from '../src/engine/phraseOrg';
import { addTake, emptyModel } from '../src/engine/analysis/model';
import { analyzeTake } from '../src/engine/drills/analyze';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const n = (beat: number, midi = 64, dur = 0.45): PNoteIn => ({ beat, dur, midi });
/** A run of notes from `start`, `count` notes `step` apart, pitches walking a C major scale. */
const run = (start: number, count: number, step: number | number[]): PNoteIn[] => {
  const scale = [60, 62, 64, 65, 67, 69, 71, 72];
  const steps = Array.isArray(step) ? step : [step];
  const out: PNoteIn[] = [];
  let b = start;
  for (let i = 0; i < count; i++) {
    out.push(n(b, scale[i % scale.length], 0.45));
    b += steps[i % steps.length];
  }
  return out;
};

describe('phraseOrg (MTNA rubric)', () => {
  it('a continuous 8th-note line for 8 bars is monotonous', () => {
    const r = phraseOrg(run(0, 64, 0.5), { totalBeats: 32, meter: 4 });
    expect(r.band).toBe('monotonous');
    expect(r.phrases).toBe(1);
    expect(r.tip.en.length).toBeGreaterThan(0);
  });
  it('one-bar phrases, each the same length and start, in constant 8ths, are monotonous', () => {
    const notes = [0, 8, 16, 24].flatMap((s) => run(s, 8, 0.5));
    expect(phraseOrg(notes, { totalBeats: 32, meter: 4 }).band).toBe('monotonous');
  });
  it('2-bar phrases with 2-beat rests, all starting on beat 1, are organized', () => {
    // each phrase: quarter, two 8ths, … over 6 beats, then a 2-beat rest
    const notes = [0, 8, 16, 24].flatMap((s) => run(s, 8, [1, 0.5, 0.5, 1]));
    const r = phraseOrg(notes, { totalBeats: 32, meter: 4 });
    expect(r.band).toBe('organized');
    expect(r.formFit).toBe(1);
    expect(r.restShare).toBeGreaterThan(0.12);
  });
  it('varied starts and lengths aligned to the form are varied', () => {
    const notes = [...run(0, 6, [1, 0.5, 0.5]), ...run(9, 8, [0.5, 0.5, 1]), ...run(16, 4, 1), ...run(26, 9, [0.5, 1])];
    const r = phraseOrg(notes, { totalBeats: 32, meter: 4 });
    expect(r.band).toBe('varied');
    expect(r.score).toBe(1);
  });
  it('scattered single notes at random offsets are random', () => {
    const notes = [0.75, 3.25, 6.5, 9.75, 12.25, 16.5, 19.75, 23.25, 27.5, 30.25].map((b, i) => n(b, 60 + ((i * 7) % 12)));
    const r = phraseOrg(notes, { totalBeats: 32, meter: 4 });
    expect(r.band).toBe('random');
    expect(r.score).toBeLessThan(0.5);
  });
  it('fewer than three notes is monotonous', () => {
    expect(phraseOrg([n(0)], { totalBeats: 16, meter: 4 }).band).toBe('monotonous');
  });
});

describe('note choice', () => {
  const C7 = [{ at: 0, beats: 16, root: 0, iv: [0, 4, 7, 10] }];
  it('chord tones only are bland', () => {
    const notes = [60, 64, 67, 70, 72, 70, 67, 64].map((m, i) => n(i * 0.5, m));
    expect(noteChoice(notes, C7)).toBe('bland');
    expect(phraseOrg(notes, { totalBeats: 16, meter: 4, spans: C7 }).noteBand).toBe('bland');
  });
  it('tensions and chromatic notes that resolve are colourful', () => {
    // D (9) → E, A (13) → G, D♯ (♯9) → E
    const notes = [62, 64, 69, 67, 63, 64, 70, 72].map((m, i) => n(i * 0.5, m));
    expect(noteChoice(notes, C7)).toBe('colourful');
  });
  it('chromatic non-scale notes left unresolved are arbitrary', () => {
    const notes = [61, 66, 71, 60, 68, 61, 66, 64].map((m, i) => n(i * 0.5, m));
    expect(noteChoice(notes, C7)).toBe('arbitrary');
  });
  it('no chords: no note band', () => {
    expect(phraseOrg(run(0, 8, 0.5), { totalBeats: 8, meter: 4 }).noteBand).toBeNull();
  });
});

describe('playRestCheck (play one, rest one)', () => {
  it('play one / rest one kept', () => {
    const notes = [...run(0, 6, 0.5), ...run(8, 6, 0.5), ...run(16, 6, 0.5), ...run(24, 6, 0.5)];
    expect(playRestCheck(notes, { play: 1, rest: 1, meter: 4, totalBeats: 32 })).toEqual({ ok: 8, total: 8 });
  });
  it('a pickup in the last 8th of a rest bar is fine; a note mid rest bar is not', () => {
    const notes = [...run(0, 4, 0.5), n(7.5), ...run(8, 4, 0.5), n(13)];
    expect(playRestCheck(notes, { play: 1, rest: 1, meter: 4, totalBeats: 16 })).toEqual({ ok: 3, total: 4 });
  });
  it('play two / rest two: an empty play bar fails', () => {
    const notes = [...run(0, 16, 0.5), ...run(16, 4, 0.5)];
    expect(playRestCheck(notes, { play: 2, rest: 2, meter: 4, totalBeats: 32 })).toEqual({ ok: 7, total: 8 });
  });
});

describe('profile and take hooks', () => {
  it('the model keeps the bands and the summary names the most common one', () => {
    expect(phrasingSummary(['organized', 'varied'])).toBeNull();
    expect(phrasingSummary(['organized', 'organized', 'random'])!.en).toContain('mostly organized (3 takes)');
  });
  const freeDrill = (extra: Partial<Drill['goal']> = {}): Drill => ({
    spec: { family: 'k-solo', kind: 'test', key: 0, hands: 'R' },
    itemId: 'test',
    title: { en: 't', he: 't' },
    notes: [],
    beats: 16,
    meter: 4,
    keySig: 'C',
    goal: { evenness: false, hands: false, free: { windows: [[0, 16]], scale: [{ from: 0, to: 16, pcs: [0, 2, 4, 5, 7, 9, 11] }], minPerBar: 1, model: [] }, ...extra },
    startBpm: 60,
  });
  const played = (notes: PNoteIn[], bpm = 60): PlayedNote[] => notes.map((x) => ({ pitch: x.midi, on: x.beat * (60000 / bpm), off: (x.beat + x.dur) * (60000 / bpm), vel: 70 }));
  it('an improvised take carries the report; goal.phrase caps a monotonous take', () => {
    const line = run(0, 32, 0.5);
    const m0 = analyzeTake(freeDrill(), 60, played(line));
    expect(m0.phraseOrg?.band).toBe('monotonous');
    const m1 = analyzeTake(freeDrill({ phrase: { pass: ['organized', 'varied'] } }), 60, played(line));
    expect(m1.verdict).not.toBe('clean');
    const model = addTake(emptyModel(), freeDrill(), m0, 60, '2026-11-15');
    expect(model.phrasing).toEqual(['monotonous']);
  });
  it('goal.playRest reports the bars kept', () => {
    const notes = [...run(0, 4, 0.5), ...run(8, 4, 0.5)];
    const m = analyzeTake(freeDrill({ playRest: { play: 1, rest: 1 } }), 60, played(notes));
    expect(m.playRest).toEqual({ ok: 4, total: 4 });
  });
});
