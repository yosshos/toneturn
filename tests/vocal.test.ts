import { describe, expect, it } from 'vitest';
import {
  bandScore,
  fitToRange,
  gradeGlide,
  gradeHold,
  gradeMelody,
  gradeTake,
  holdMetrics,
  itemTargets,
  melodyMetrics,
  rangeFromGlide,
  spreadOverRange,
  synthGlide,
  synthHold,
  synthMelody,
  tipFor,
  VOCAL_LEVELS,
  MODE_LEVELS,
  VIBRATO_LEVELS,
  synthVibratoPhrase,
  vibratoConsistency,
  scaleSteps,
  scaleTonic,
  itemFits,
  type VocalItem,
} from '../src/engine/vocal';
import { midiToHz } from '../src/engine/pitch';

const item = (kind: VocalItem['kind'], extra: Partial<VocalItem> = {}): VocalItem => ({ id: 'x', kind, level: 1, seconds: 4, reference: 'before', at: 0.5, difficulty: 1000, ...extra });

describe('range', () => {
  it('reads a comfortable range from a glide and rejects short takes', () => {
    const frames = Array.from({ length: 200 }, (_, i) => ({ t: i / 50, hz: midiToHz(48 + (24 * i) / 199), confidence: 0.95, rms: 0.1 }));
    const r = rangeFromGlide(frames)!;
    expect(r.low).toBeGreaterThanOrEqual(49);
    expect(r.high).toBeLessThanOrEqual(70);
    expect(r.high - r.low).toBeGreaterThanOrEqual(15);
    expect(rangeFromGlide(frames.slice(0, 10))).toBeNull();
  });
  it('fits by octaves only and spreads notes', () => {
    expect(fitToRange([72, 76, 79], { low: 48, high: 64 })).toEqual([60, 64, 67].map((m) => m - 12));
    expect(spreadOverRange({ low: 50, high: 70 }, 5)).toEqual([51, 56, 60, 65, 69]);
  });
  it('every level resolves its targets inside a typical range', () => {
    const range = { low: 52, high: 72 };
    for (const lv of VOCAL_LEVELS)
      for (const it of lv.items) for (const m of itemTargets(it, range)) {
        expect(m).toBeGreaterThanOrEqual(range.low - 1);
        expect(m).toBeLessThanOrEqual(range.high + 1);
      }
  });
});

describe('hold metrics', () => {
  it('a steady in-tune note scores high, settles fast, no vibrato', () => {
    const h = holdMetrics(synthHold(60, { seconds: 5, jitter: 2 }), 60);
    expect(h.unclear).toBe(false);
    expect(Math.abs(h.intonation)).toBeLessThan(3);
    expect(h.stability).toBeLessThan(4);
    expect(h.settleMs!).toBeLessThan(150);
    expect(h.vibrato.present).toBe(false);
    expect(h.bestStretchSec).toBeGreaterThan(4.5);
  });
  it('octave-insensitive: an octave below is in tune', () => {
    expect(Math.abs(holdMetrics(synthHold(48, { seconds: 3 }), 60).intonation)).toBeLessThan(1);
  });
  it('measures a flat offset and a drift', () => {
    const h = holdMetrics(synthHold(60, { seconds: 5, cents: -20, driftPerSec: -6 }), 60);
    expect(h.intonation).toBeLessThan(-25);
    expect(h.drift).toBeLessThan(-4);
    expect(tipFor(gradeHold(item('hold'), synthHold(60, { seconds: 5, driftPerSec: -12 }), 60))).toMatch(/tipDriftFlat|tipFlat|tipBreath/);
  });
  it('measures a scoop at the onset', () => {
    const h = holdMetrics(synthHold(60, { seconds: 3, scoop: -120 }), 60);
    expect(h.scoop).toBeLessThan(-40);
  });
  it('detects vibrato rate, extent and regularity', () => {
    const h = holdMetrics(synthHold(60, { seconds: 5, vibRate: 5.5, vibExtent: 35 }), 60);
    expect(h.vibrato.present).toBe(true);
    expect(h.vibrato.rate).toBeGreaterThan(5);
    expect(h.vibrato.rate).toBeLessThan(6);
    expect(h.vibrato.extent).toBeGreaterThan(25);
    expect(h.vibrato.extent).toBeLessThan(40);
    expect(h.vibrato.regularity).toBeLessThan(0.12);
    expect(Math.abs(h.intonation)).toBeLessThan(6); // centre of the vibrato
  });
  it('finds the vibrato onset and stop', () => {
    const h = holdMetrics(synthHold(60, { seconds: 8, vibRate: 5.5, vibExtent: 35, vibFrom: 2, vibTo: 5 }), 60);
    expect(h.vibratoOnSec!).toBeGreaterThan(1.5);
    expect(h.vibratoOnSec!).toBeLessThan(2.6);
    expect(h.vibratoOffSec!).toBeGreaterThan(4.6);
    expect(h.vibratoOffSec!).toBeLessThan(5.8);
  });
  it('messa di voce: loudness range with steady pitch', () => {
    const h = holdMetrics(synthHold(60, { seconds: 6, rmsFrom: 0.02, rmsPeak: 0.2 }), 60);
    expect(h.loudnessRangeDb).toBeGreaterThan(12);
    expect(h.maxTrendDev).toBeLessThan(5);
  });
  it('too little voice is unclear (never penalised)', () => {
    expect(holdMetrics(synthHold(60, { seconds: 0.3 }), 60).unclear).toBe(true);
    expect(gradeHold(item('hold'), [], 60).unclear).toBe(true);
  });
});

describe('grading', () => {
  it('straight tone: vibrato fails it, steady passes', () => {
    const good = gradeHold(item('straight', { seconds: 4 }), synthHold(60, { seconds: 4.5, jitter: 2 }), 60);
    const vib = gradeHold(item('straight', { seconds: 4 }), synthHold(60, { seconds: 4.5, vibRate: 5.5, vibExtent: 35 }), 60);
    expect(good.score).toBeGreaterThan(0.85);
    expect(vib.score).toBeLessThan(good.score - 0.2);
  });
  it('vibrato-steady: classical extent fits classical, not pop', () => {
    const f = synthHold(60, { seconds: 6, vibRate: 5.8, vibExtent: 80 });
    expect(gradeHold(item('vibrato-steady', { seconds: 6 }), f, 60, 'classical').score).toBeGreaterThan(gradeHold(item('vibrato-steady', { seconds: 6 }), f, 60, 'pop').score);
  });
  it('vibrato on cue', () => {
    const it = item('vibrato-delayed', { seconds: 6, cueOn: 2 });
    const onTime = gradeHold(it, synthHold(60, { seconds: 6, vibRate: 5.5, vibExtent: 35, vibFrom: 2 }), 60);
    const late = gradeHold(it, synthHold(60, { seconds: 6, vibRate: 5.5, vibExtent: 35, vibFrom: 4 }), 60);
    expect(onTime.score).toBeGreaterThan(late.score);
  });
  it('glides: smooth and landed beats steps and a missed landing', () => {
    const smooth = gradeGlide(synthGlide(55, 62), 55, 62);
    const stepped = gradeGlide(synthGlide(55, 62, 2, { steps: true, landing: 45 }), 55, 62);
    expect(smooth.score).toBeGreaterThan(0.85);
    expect(stepped.score).toBeLessThan(smooth.score - 0.25);
  });
  it('melodies: hits, intonation, legato, overshoot and timing', () => {
    const t = [60, 62, 64, 65, 64];
    const m = melodyMetrics(synthMelody(t, 0.5), t);
    expect(m.hit).toBe(1);
    expect(m.legato).toBe(1);
    const gaps = melodyMetrics(synthMelody(t, 0.5, { gap: 0.2 }), t);
    expect(gaps.legato).toBe(0);
    const leap = [55, 62, 59, 55];
    const over = melodyMetrics(synthMelody(leap, 0.6, { overshoot: 60 }), leap);
    expect(over.overshoot).toBeGreaterThan(30);
    const even = melodyMetrics(synthMelody(t, 0.375), t, 0.375);
    expect(even.timingMs!).toBeLessThan(40);
    const g = gradeMelody(item('melody', { steps: [0, 2, 4, 5, 4] }), synthMelody(t, 0.5), t);
    expect(g.score).toBeGreaterThan(0.8);
  });
  it('a missing note lowers the hit share', () => {
    const t = [60, 62, 64, 65];
    expect(melodyMetrics(synthMelody([60, 62, 65], 0.5), t).hit).toBe(0.75);
  });
  it('gradeTake routes every level kind', () => {
    const range = { low: 52, high: 72 };
    for (const lv of VOCAL_LEVELS)
      for (const it of lv.items) {
        const tg = itemTargets(it, range);
        const frames = it.kind === 'glide' ? synthGlide(tg[0], tg[1]) : tg.length > 1 && it.kind !== 'range' ? synthMelody(tg, 0.4) : synthHold(tg[0], { seconds: it.seconds + 0.5 });
        const g = gradeTake(it, frames, range);
        expect(g.unclear).toBe(false);
        expect(g.score).toBeGreaterThanOrEqual(0);
        expect(g.score).toBeLessThanOrEqual(1);
      }
  });
  it('band scores are monotonic', () => {
    expect(bandScore(5, [10, 20, 35])).toBe(1);
    expect(bandScore(15, [10, 20, 35])).toBeGreaterThan(bandScore(30, [10, 20, 35]));
    expect(bandScore(100, [10, 20, 35])).toBe(0);
  });
});

describe('scales and modes', () => {
  it('up in G mixolydian, down in G altered', () => {
    expect(scaleSteps({ tonic: 'G', up: 'mixolydian', down: 'altered', hear: 'tonic' })).toEqual([0, 2, 4, 5, 7, 9, 10, 12, 10, 8, 6, 4, 3, 1, 0]);
    expect(scaleSteps({ tonic: 'C', up: 'ionian', down: 'ionian', notes: 5, hear: 'figure' })).toEqual([0, 2, 4, 5, 7, 5, 4, 2, 0]);
  });
  it('keeps the named tonic when it fits, otherwise the nearest that does', () => {
    const r = { low: 55, high: 72 };
    const g = scaleTonic({ tonic: 'G', up: 'mixolydian', down: 'altered', hear: 'tonic' }, r)!;
    expect(g.midi % 12).toBe(7);
    expect(g.midi).toBeGreaterThanOrEqual(55);
    expect(g.midi + 12).toBeLessThanOrEqual(72);
    const tight = scaleTonic({ tonic: 'C', up: 'ionian', hear: 'tonic' }, { low: 55, high: 67 })!;
    expect(tight.midi).toBe(55);
    expect(tight.name).toBe('G');
    expect(scaleTonic({ tonic: 'C', up: 'ionian', hear: 'tonic' }, { low: 55, high: 65 })).toBeNull();
  });
  it('every mode level fits an octave range and grades a clean take', () => {
    const range = { low: 55, high: 67 };
    for (const lv of MODE_LEVELS)
      for (const it of lv.items) {
        expect(itemFits(it, range)).toBe(true);
        const tg = itemTargets(it, range);
        const g = gradeTake(it, synthMelody(tg, 0.4), range);
        expect(g.score).toBeGreaterThan(0.8);
      }
  });
  it('a wrong mode loses notes', () => {
    const range = { low: 55, high: 72 };
    const it = MODE_LEVELS[7].items[0];
    const sungIonian = itemTargets({ ...it, scale: { ...it.scale!, up: 'ionian', down: 'ionian' } }, range);
    expect(gradeTake(it, synthMelody(sungIonian, 0.4), range).score).toBeLessThan(0.8);
  });
});

describe('advanced vibrato', () => {
  const base = (kind: VocalItem['kind'], extra: Partial<VocalItem> = {}): VocalItem => ({ id: 'z', kind, level: 10, seconds: 6, reference: 'before', at: 0.5, difficulty: 1300, ...extra });
  it('jitter and shimmer are low for an even vibrato', () => {
    const h = holdMetrics(synthHold(60, { seconds: 6, vibRate: 5.5, vibExtent: 35 }), 60);
    expect(h.vibrato.jitter).toBeLessThan(0.06);
    expect(h.vibrato.shimmer).toBeLessThan(0.1);
  });
  it('rate on demand: slow and fast targets', () => {
    const slow = synthHold(60, { seconds: 6.5, vibRate: 5, vibExtent: 35 });
    const fast = synthHold(60, { seconds: 6.5, vibRate: 6.3, vibExtent: 35 });
    const it5 = base('vibrato-rate', { vibRate: 5 });
    expect(gradeHold(it5, slow, 60).score).toBeGreaterThan(gradeHold(it5, fast, 60).score + 0.2);
  });
  it('width on demand: narrow vs wide', () => {
    const narrow = synthHold(60, { seconds: 6.5, vibRate: 5.5, vibExtent: 25 });
    const wide = synthHold(60, { seconds: 6.5, vibRate: 5.5, vibExtent: 75 });
    expect(gradeHold(base('vibrato-width', { vibWidth: 'wide' }), wide, 60).score).toBeGreaterThan(gradeHold(base('vibrato-width', { vibWidth: 'wide' }), narrow, 60).score + 0.2);
  });
  it('alternating on cue', () => {
    const cues = [1.5, 3, 4.5, 6, 7.5];
    const it = base('vibrato-alternate', { seconds: 9, cues });
    const good = synthHold(60, { seconds: 9.3, vibRate: 5.5, vibExtent: 35, vibWindows: [[1.5, 3], [4.5, 6], [7.5, 9.3]] });
    const never = synthHold(60, { seconds: 9.3 });
    expect(gradeHold(it, good, 60).score).toBeGreaterThan(gradeHold(it, never, 60).score + 0.2);
  });
  it('vibrato only on the chosen notes', () => {
    const it = VIBRATO_LEVELS[1].items[0];
    const tg = itemTargets(it, { low: 50, high: 70 });
    const right = gradeTake(it, synthVibratoPhrase(tg, it.noteSecs!, it.vibNotes!), { low: 50, high: 70 });
    const nowhere = gradeTake(it, synthVibratoPhrase(tg, it.noteSecs!, tg.map(() => false)), { low: 50, high: 70 });
    expect(right.metrics.find((m) => m.key === 'vibratoPlacement')!.score).toBe(1);
    expect(right.score).toBeGreaterThan(nowhere.score);
  });
  it('consistency across notes', () => {
    expect(vibratoConsistency([{ rate: 5.5, extent: 35 }, { rate: 5.6, extent: 33 }, { rate: 5.4, extent: 36 }])).toBe(1);
    expect(vibratoConsistency([{ rate: 4.5, extent: 20 }, { rate: 6.5, extent: 60 }])).toBeLessThan(0.5);
  });
});
