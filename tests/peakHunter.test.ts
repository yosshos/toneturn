import { describe, expect, it } from 'vitest';
import { needsHeadphones } from '../src/engine/fx';
import {
  answer,
  boostSpec,
  flatSpec,
  formatHz,
  hzAt,
  isBest,
  isPeakSave,
  makeRounds,
  meanOctavesOf,
  newSave,
  OCTAVE_BANDS,
  PEAK_ROUNDS,
  pointsFor,
  posOf,
  roundNeedsHeadphones,
  snapHz,
  stepHz,
  THIRD_BANDS,
  totalOf,
} from '../src/engine/peakHunter';

describe('peak hunter rounds', () => {
  it('is deterministic from the seed and has ten rounds', () => {
    expect(makeRounds(42, 2)).toEqual(makeRounds(42, 2));
    expect(makeRounds(42, 2)).not.toEqual(makeRounds(43, 2));
    expect(makeRounds(1, 1)).toHaveLength(PEAK_ROUNDS);
  });

  it('level 1 uses octave bands, +12 dB, pink or drums', () => {
    for (let s = 0; s < 30; s++)
      for (const r of makeRounds(s, 1)) {
        expect(OCTAVE_BANDS).toContain(r.freq);
        expect(r.gain).toBe(12);
        expect(['pink', 'drums']).toContain(r.source);
      }
  });

  it('level 2 uses third-octave bands, +9 or +12 dB, narrower Q', () => {
    for (let s = 0; s < 30; s++)
      for (const r of makeRounds(s, 2)) {
        expect(THIRD_BANDS).toContain(r.freq);
        expect([9, 12]).toContain(r.gain);
        expect(r.q).toBeGreaterThan(makeRounds(s, 1)[0].q);
      }
  });

  it('level 3 is free, +6 dB, on the music loop, inside 125 Hz – 8 kHz', () => {
    for (let s = 0; s < 30; s++)
      for (const r of makeRounds(s, 3)) {
        expect(r.gain).toBe(6);
        expect(r.source).toBe('loop');
        expect(r.bpm).toBeGreaterThan(0);
        expect(r.freq).toBeGreaterThanOrEqual(125);
        expect(r.freq).toBeLessThanOrEqual(8000);
      }
  });

  it('never repeats a band twice in a row', () => {
    for (let s = 0; s < 50; s++)
      for (const lvl of [1, 2] as const) {
        const rs = makeRounds(s, lvl);
        for (let i = 1; i < rs.length; i++) expect(rs[i].freq).not.toBe(rs[i - 1].freq);
      }
  });

  it('spreads across the range (log scale)', () => {
    const fs = Array.from({ length: 40 }, (_, s) => makeRounds(s, 3)).flat().map((r) => r.freq);
    expect(fs.filter((f) => f < 500).length).toBeGreaterThan(fs.length * 0.2);
    expect(fs.filter((f) => f > 2000).length).toBeGreaterThan(fs.length * 0.2);
  });
});

describe('peak hunter sounds', () => {
  it('A is flat, B carries one peaking boost and both are loudness-matched to the dry chain', () => {
    const [r] = makeRounds(7, 2);
    const a = flatSpec(r);
    const b = boostSpec(r);
    expect(a.chain).toEqual({});
    expect(b.chain.eq).toEqual([{ type: 'peaking', freq: r.freq, gain: r.gain, q: r.q }]);
    expect(b.matchTo).toEqual({});
    expect(a.matchTo).toEqual({});
    expect(a.source).toBe(b.source);
    expect(a.seed).toBe(b.seed);
    expect(a.seconds).toBe(b.seconds);
  });

  it('asks for headphones below 300 Hz', () => {
    const r = { ...makeRounds(1, 1)[0], freq: 250 };
    expect(roundNeedsHeadphones(r)).toBe(true);
    expect(needsHeadphones(boostSpec(r))).toBe(true);
    expect(roundNeedsHeadphones({ ...r, freq: 1000 })).toBe(false);
  });
});

describe('peak hunter slider and scoring', () => {
  it('maps 100 Hz – 10 kHz on a log scale', () => {
    expect(posOf(100)).toBe(0);
    expect(posOf(10_000)).toBe(1);
    expect(posOf(1000)).toBeCloseTo(0.5);
    expect(hzAt(0.5)).toBeCloseTo(1000);
    expect(hzAt(posOf(3150))).toBeCloseTo(3150);
  });

  it('snaps to the level grid', () => {
    expect(snapHz(1300, 1)).toBe(1000);
    expect(snapHz(1500, 1)).toBe(2000);
    expect(snapHz(100, 1)).toBe(125);
    expect(snapHz(1300, 2)).toBe(1250);
    expect(snapHz(1234, 3)).toBe(1230);
    expect(snapHz(50, 3)).toBe(125);
  });

  it('steps bands with the keyboard', () => {
    expect(stepHz(1000, 1, 1)).toBe(2000);
    expect(stepHz(125, 1, -1)).toBe(125);
    expect(stepHz(1000, 2, 1)).toBe(1250);
    expect(stepHz(1000, 2, -1, true)).toBe(500);
    expect(stepHz(1000, 3, 1)).toBeGreaterThan(1000);
  });

  it('gives full points within 1/6 octave, 0 at an octave', () => {
    expect(pointsFor(1000, 1000)).toBe(100);
    expect(pointsFor(1000 * 2 ** (1 / 6) - 0.01, 1000)).toBe(100);
    expect(pointsFor(2000, 1000)).toBe(0);
    expect(pointsFor(4000, 1000)).toBe(0);
    const mid = pointsFor(1000 * 2 ** 0.5833, 1000);
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(60);
    expect(pointsFor(800, 1000)).toBe(pointsFor(1250, 1000));
  });

  it('formats Hz', () => {
    expect(formatHz(125)).toBe('125 Hz');
    expect(formatHz(1000)).toBe('1 kHz');
    expect(formatHz(1250)).toBe('1.25 kHz');
    expect(formatHz(6300)).toBe('6.3 kHz');
    expect(formatHz(10_000)).toBe('10 kHz');
  });
});

describe('peak hunter game state', () => {
  it('records answers, totals and resumes', () => {
    let s = newSave(9, 1);
    const rounds = makeRounds(s.seed, s.level);
    expect(isPeakSave(s)).toBe(true);
    const r1 = answer(s, rounds, rounds[0].freq);
    expect(r1.result.points).toBe(100);
    s = r1.save;
    const r2 = answer(s, rounds, rounds[1].freq * 4);
    expect(r2.result.points).toBe(0);
    s = r2.save;
    expect(s.answers).toHaveLength(2);
    expect(isPeakSave(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(totalOf(s.answers)).toBe(100);
    expect(meanOctavesOf(s.answers)).toBeGreaterThanOrEqual(0.5);
  });

  it('rejects foreign or finished saves', () => {
    expect(isPeakSave(null)).toBe(false);
    expect(isPeakSave({ v: 1, seed: 1 })).toBe(false);
    const done = { ...newSave(1, 1), answers: Array.from({ length: PEAK_ROUNDS }, () => ({ guess: 1000, points: 0, octaves: 1 })) };
    expect(isPeakSave(done)).toBe(false);
  });

  it('knows a personal best', () => {
    expect(isBest(500, 400)).toBe(true);
    expect(isBest(400, 400)).toBe(false);
    expect(isBest(10, undefined)).toBe(true);
    expect(isBest(0, undefined)).toBe(false);
  });
});
