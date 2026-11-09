// BASS_AUDIT track A: what a bass take is judged on (A2, A3, A5–A10, A12, A13, cents). Drills are built here by hand so
// the tests don't depend on the content generators.
import { describe, expect, it } from 'vitest';
import { analyzeGuitarTake, UNPITCHED, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import {
  centsOff,
  chartPcs,
  crossingPenalty,
  ioiDrift,
  oddEvenAsym,
  overlapMs,
  pocketShare,
  releaseAccuracy,
  ringThrough,
  ruleCheck,
  shiftGap,
  slapClass,
  subBias,
  swingRatio,
  zoneShift,
  type RuleChart,
} from '../src/engine/drills/bassAnalyze';
import type { BassGoal, Drill, ExpNote, PlayedNote } from '../src/engine/drills/types';

const mk = (notes: ExpNote[], bass?: BassGoal, more: Partial<Drill> = {}): Drill => ({
  spec: { family: 'b-time', kind: 'test', key: 4, hands: 'R' },
  itemId: 'test',
  title: { en: 't', he: 't' },
  notes,
  beats: Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur))),
  meter: 4,
  keySig: 'C',
  goal: { evenness: true, hands: false, ...(bass ? { bass } : {}) },
  startBpm: 80,
  ...more,
});
const line = (ps: number[], step = 1, extra: (i: number) => Partial<ExpNote> = () => ({})): ExpNote[] => ps.map((p, i) => ({ pitch: p, beat: i * step, dur: step, hand: 'R', ...extra(i) }));
const perfect = (d: Drill, bpm: number, f: (n: ExpNote, i: number) => Partial<PlayedNote> = () => ({})): PlayedNote[] =>
  d.notes.map((n, i) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: null, vel: 80, ...f(n, i) }));
const ROOTS = [28, 33, 35, 28, 31, 36, 38, 28, 33, 35, 28, 31, 36, 38, 28, 28, 33, 35, 28, 31];

describe('A2: an onset without a pitch is timing only', () => {
  const d = mk(line(ROOTS));
  it('all unpitched → not; a real pitched take stays clean', () => {
    expect(analyzeGuitarTake(d, 80, perfect(d, 80)).verdict).toBe('clean');
    const thumps = analyzeGuitarTake(d, 80, perfect(d, 80, () => ({ pitch: UNPITCHED })));
    expect(thumps.verdict).toBe('not');
    expect(thumps.guitar.unclear).toBe(ROOTS.length);
    expect(thumps.accuracy).toBe(0);
    expect(thumps.perNote.every((r) => !r.ok && r.dev !== null)).toBe(true);
  });
  it('≤ 10 % unclear may stay clean, > 10 % almost, > 25 % not', () => {
    const k = (n: number) => analyzeGuitarTake(d, 80, perfect(d, 80, (_, i) => (i < n ? { pitch: UNPITCHED } : {}))).verdict;
    expect(k(2)).toBe('clean'); // 10 %
    expect(k(3)).toBe('almost'); // 15 %
    expect(k(6)).toBe('not'); // 30 %
  });
  it('expected dead / muted / harmonic notes are not "unclear"', () => {
    const g = mk(line(ROOTS.slice(0, 8), 1, (i) => (i % 2 ? { technique: 'dead' } : {})));
    const m = analyzeGuitarTake(g, 80, perfect(g, 80, (n) => (n.technique === 'dead' ? { pitch: UNPITCHED } : {})));
    expect(m.guitar.unclear).toBe(0);
    expect(m.verdict).toBe('clean');
  });
});

describe('A3: ghost-note classification', () => {
  const notes = line([28, 28, 31, 28, 33, 28, 31, 28, 28, 28, 31, 28, 33, 28, 31, 28], 0.5, (i) => (i % 2 ? { technique: 'dead' } : {}));
  const d = mk(notes, { ghostClass: 0.9 }, { goal: { evenness: false, hands: false, bass: { ghostClass: 0.9 } } });
  it('all pitched (ghosts ringing with a pitch) → not', () => {
    const m = analyzeGuitarTake(d, 90, perfect(d, 90));
    expect(m.guitar.bass?.ghostClass).toBe(0.5);
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/ghost note/);
  });
  it('the right mix (dead = no pitch) → clean; MIDI soft + short dead notes → clean', () => {
    expect(analyzeGuitarTake(d, 90, perfect(d, 90, (n) => (n.technique === 'dead' ? { pitch: UNPITCHED } : {}))).verdict).toBe('clean');
    const midi = analyzeGuitarTake(d, 90, perfect(d, 90, (n, i) => (n.technique === 'dead' ? { vel: 30, off: expTimeMs(d, n.beat, 90) + 60 } : { vel: 95, off: expTimeMs(d, notes[i].beat + 0.5, 90) })));
    expect(midi.guitar.bass?.ghostClass).toBe(1);
    expect(midi.verdict).toBe('clean');
  });
  it('a muted string read as a random pitch at a dead note counts as dead, not wrong', () => {
    const m = analyzeGuitarTake(d, 90, perfect(d, 90, (n) => (n.technique === 'dead' ? { pitch: n.pitch + 5 } : {})));
    expect(m.wrong).toBe(0);
    expect(m.guitar.bass?.ghostClass).toBe(1);
  });
});

describe('A5: free-choice lines judged by rules', () => {
  // C7 | F7 | C7 | G7, one note a beat.
  const chart: RuleChart[] = [
    { chord: 'C7', root: 0, tones: [0, 4, 7, 10], beats: 4 },
    { chord: 'F7', root: 5, tones: [0, 4, 7, 10], beats: 4 },
    { chord: 'C7', root: 0, tones: [0, 4, 7, 10], beats: 4 },
    { chord: 'G7', root: 7, tones: [0, 4, 7, 10], beats: 4 },
  ];
  const model = [36, 40, 43, 42, 41, 45, 48, 37, 36, 40, 43, 44, 43, 47, 50, 41];
  const d = mk(line(model), { rules: { kind: 'walk', chart } });
  it('the model line is clean; a different valid line (5th on beat 3, other approaches) is clean too', () => {
    expect(analyzeGuitarTake(d, 120, perfect(d, 120)).verdict).toBe('clean');
    const alt = [36, 38, 40, 42, 41, 43, 45, 37, 36, 43, 40, 44, 43, 41, 38, 47];
    const m = analyzeGuitarTake(d, 120, perfect(d, 120, (_, i) => ({ pitch: alt[i] })));
    expect(m.verdict, m.why.en).toBe('clean');
    expect(m.rules?.validShare).toBe(1);
    expect(m.rules?.labels.slice(0, 4)).toEqual(['R', 'tension', '3', 'chromatic']);
  });
  it('a wrong note on a chord change → not, and the "Why?" points at it', () => {
    const bad = model.slice();
    bad[8] = 37; // bar 3, beat 1: C♯ over C7
    bad[12] = 44; // bar 4, beat 1: A♭ over G7
    bad[13] = 46;
    const m = analyzeGuitarTake(d, 120, perfect(d, 120, (_, i) => ({ pitch: bad[i] })));
    expect(m.verdict).not.toBe('clean');
    expect(m.rules?.worst?.bar).toBe(3);
    expect(m.rules?.worst?.beatInBar).toBe(0);
    expect(m.rules?.valid[12]).toBe(false);
    expect(m.perNote[12].ok).toBe(false);
    expect(m.why.en).toMatch(/bar 4, beat 1/);
  });
  it('chordTones and nearest rules; tones given as pitch classes are understood', () => {
    expect(chartPcs({ chord: 'G7', root: 7, tones: [7, 11, 2, 5], beats: 4 }).sort((a, b) => a - b)).toEqual([2, 5, 7, 11]);
    expect(chartPcs({ chord: 'F7', root: 5, tones: [0, 4, 7, 10], beats: 4 }).sort((a, b) => a - b)).toEqual([0, 3, 5, 9]);
    const ct = ruleCheck('chordTones', chart, [36, 40, 43, 46, 41, 45, 48, 51].map((p, i) => ({ pitch: p, beat: i })), 4);
    expect(ct.validShare).toBe(1);
    const nr = ruleCheck('nearest', chart, [36, 40, 43, 46, 41, 45, 48, 39].map((p, i) => ({ pitch: p, beat: i * 2 })), 4);
    expect(nr.moves).toBeLessThan(1);
  });
});

describe('A6–A7: mean offset, pocket, mic thresholds', () => {
  const d = mk(line(ROOTS));
  it('a take 30 ms late on every note is not clean (MIDI ≤ 15 ms), 20 ms is almost', () => {
    expect(analyzeGuitarTake(d, 80, perfect(d, 80, (n) => ({ on: expTimeMs(d, n.beat, 80) + 30 }))).verdict).toBe('not');
    const m = analyzeGuitarTake(d, 80, perfect(d, 80, (n) => ({ on: expTimeMs(d, n.beat, 80) + 20 })));
    expect(m.verdict).toBe('almost');
    expect(m.why.en).toMatch(/Dragging/);
    // the mic allows 25 ms
    const fr: GFrame[] = [{ t: -100, hz: null, rms: 0.001 }];
    expect(analyzeGuitarTake(d, 80, perfect(d, 80, (n) => ({ on: expTimeMs(d, n.beat, 80) + 20 })), undefined, fr).guitar.bass?.meanMs?.lim).toBe(25);
  });
  it('pocket on purpose: the chosen offsets per part pass, playing on the beat does not', () => {
    const p = mk(line(ROOTS.slice(0, 18)), { pocket: [0, 20, -20] });
    const target = (b: number) => [0, 20, -20][Math.min(2, Math.floor((b / p.beats) * 3))];
    expect(analyzeGuitarTake(p, 80, perfect(p, 80, (n) => ({ on: expTimeMs(p, n.beat, 80) + target(n.beat) }))).verdict).toBe('clean');
    const flat = analyzeGuitarTake(p, 80, perfect(p, 80));
    expect(flat.guitar.bass?.pocket?.share).toBeCloseTo(1 / 3, 1);
    expect(flat.verdict).toBe('not');
    expect(pocketShare([{ beat: 0, dev: 3 }], [0], 4)?.share).toBe(1);
  });
  it('mic: SD ≤ 28 ms at any tempo; MIDI at fast 16ths keeps SD ≤ 20', () => {
    const fast = mk(line(Array.from({ length: 32 }, (_, i) => 28 + (i % 4)), 0.25), undefined, { goal: { evenness: false, hands: false } });
    const jit = (n: ExpNote, i: number) => ({ on: expTimeMs(fast, n.beat, 100) + (i % 2 ? 24 : -24) });
    const fr: GFrame[] = [{ t: -100, hz: null, rms: 0.001 }];
    expect(analyzeGuitarTake(fast, 100, perfect(fast, 100, jit), undefined, fr).verdict).toBe('clean');
    expect(analyzeGuitarTake(fast, 100, perfect(fast, 100, jit)).verdict).not.toBe('clean');
  });
});

describe('A8: shift gap, drift, swing, per-subdivision bias', () => {
  it('shiftGap from frames and from MIDI note-offs', () => {
    const frames: GFrame[] = Array.from({ length: 60 }, (_, i) => ({ t: i * 10, hz: 41, rms: i * 10 < 400 ? 1 : 0.02 }));
    expect(shiftGap([{ prevOn: 0, on: 500 }], frames)).toBe(100);
    expect(shiftGap([{ prevOn: 0, on: 500, prevOff: 470 }])).toBe(30);
    expect(shiftGap([])).toBeNull();
  });
  it('ioiDrift: less even at the end shows', () => {
    const even = Array.from({ length: 40 }, (_, i) => ({ beat: i * 0.5, on: i * 300 }));
    expect(ioiDrift(even, 4)).toBeCloseTo(0, 5);
    const tired = even.map((p, i) => ({ ...p, on: p.on + (i >= 16 && i % 2 ? 25 : 0) }));
    expect(ioiDrift(tired, 4)!).toBeGreaterThan(0.15);
  });
  it('swingRatio: triplet swing ≈ 2, straight = 1', () => {
    const pts = (r: number) => Array.from({ length: 8 }, (_, b) => [{ beat: b, on: b * 600 }, { beat: b + 0.5, on: b * 600 + (600 * r) / (r + 1) }]).flat();
    expect(swingRatio(pts(2), 8)).toBeCloseTo(2, 5);
    expect(swingRatio(pts(1), 8)).toBeCloseTo(1, 5);
  });
  it('subBias: late off-beats', () => {
    const b = subBias([0, 0.5, 1, 1.5, 2, 2.5].map((beat) => ({ beat, dev: beat % 1 ? 20 : 0 })));
    expect(b['8']).toBe(20);
    expect(b.beat).toBe(0);
  });
  it('wired: a swing goal judges the ratio', () => {
    const notes = line(Array.from({ length: 16 }, () => 28), 0.5);
    const d = mk(notes, { swing: { ratio: 2, tol: 0.15, sub: 8 } }, { goal: { evenness: false, hands: false, bass: { swing: { ratio: 2, tol: 0.15, sub: 8 } } } });
    const straight = analyzeGuitarTake(d, 100, perfect(d, 100));
    expect(straight.guitar.bass?.swing).toBeCloseTo(1, 5);
    expect(straight.verdict).toBe('not');
  });
});

describe('A9: note lengths', () => {
  it('ring-through: MIDI note-off past the middle of the rest; mic energy in the rest', () => {
    expect(ringThrough([{ from: 500, to: 1000, prevOn: 0, prevPitch: 28, prevOff: 520 }])).toEqual({ rests: 1, rang: 0 });
    expect(ringThrough([{ from: 500, to: 1000, prevOn: 0, prevPitch: 28, prevOff: 900 }])).toEqual({ rests: 1, rang: 1 });
    const ringing: GFrame[] = Array.from({ length: 100 }, (_, i) => ({ t: i * 10, hz: 41.2, conf: 0.9, rms: 0.5 }));
    expect(ringThrough([{ from: 500, to: 1000, prevOn: 0, prevPitch: 28 }], ringing).rang).toBe(1);
    const stopped = ringing.map((f) => (f.t >= 480 ? { ...f, hz: null, rms: 0.01 } : f));
    expect(ringThrough([{ from: 500, to: 1000, prevOn: 0, prevPitch: 28 }], stopped).rang).toBe(0);
  });
  it('release accuracy and overlap', () => {
    expect(releaseAccuracy([{ release: 330, target: 300 }, { release: 400, target: 300 }], 40)).toBe(0.5);
    expect(overlapMs([{ prevPitch: 28, prevOff: 540, nextPitch: 40, nextOn: 500 }])).toEqual([40]);
  });
  it('MIDI note-offs feed the lengths rule (B19) and release on the "and"', () => {
    const notes = line([28, 33, 35, 28, 31, 36, 38, 28], 1, () => ({ dur: 0.5 }));
    const d = mk(notes, { lengths: true, release: { ms: 40 } });
    const bpm = 80;
    const ok = analyzeGuitarTake(d, bpm, perfect(d, bpm, (n) => ({ off: expTimeMs(d, n.beat + 0.5, bpm) + 10 })));
    expect(ok.guitar.bass?.lengths).toBe(1);
    expect(ok.guitar.bass?.release).toBe(1);
    expect(ok.verdict).toBe('clean');
    const stac = analyzeGuitarTake(d, bpm, perfect(d, bpm, (n) => ({ off: expTimeMs(d, n.beat, bpm) + 100 })));
    expect(stac.guitar.bass?.release).toBe(0);
    expect(stac.verdict).toBe('not');
  });
});

describe('A10: parity from the expected index; crossings with open strings', () => {
  it('a missed note does not swap the fingers for the rest of the take', () => {
    const on = Array.from({ length: 16 }, (_, i) => i * 250 + (i % 2 ? 20 : 0));
    const idx = on.map((_, i) => i);
    const drop = (xs: number[]) => xs.filter((_, i) => i !== 7);
    const byIdx = oddEvenAsym(drop(on), undefined, drop(idx))!;
    expect(byIdx.ms).toBeCloseTo(40, 5);
    expect(oddEvenAsym(drop(on))!.ms).toBeLessThan(byIdx.ms);
  });
  it('every note crossing a string (open strings, one per string) still gives a penalty', () => {
    expect(crossingPenalty([0, 2, 30, 2, 3, 2, 28, 2], [4, 3, 2, 1, 2, 3, 4, 3])).toBeGreaterThan(5);
    expect(crossingPenalty([0, 5, 5], [4, 4, 4])).toBeNull();
  });
});

describe('A12, A13, cents', () => {
  it('zoneShift: a brighter second half', () => {
    const frames: GFrame[] = Array.from({ length: 200 }, (_, i) => ({ t: i * 10, hz: 41, rms: 0.3, centroid: i * 10 < 1000 ? 600 : 900 }));
    const ons = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800];
    expect(zoneShift(frames, ons, 1000)).toBeCloseTo(1.5, 5);
    expect(zoneShift(frames.map((f) => ({ ...f, centroid: undefined })), ons, 1000)).toBeNull();
  });
  it('slapClass: pop / thumb / finger guesses', () => {
    const at = (c: number, pk: number): GFrame[] => [{ t: 0, hz: null, rms: pk, centroid: c }, { t: 25, hz: null, rms: pk * 0.6, centroid: c }];
    expect(slapClass(at(3000, 1), 0, 0.5)).toBe('pop');
    expect(slapClass(at(1500, 0.5), 0, 0.5)).toBe('thumb');
    expect(slapClass(at(500, 0.5), 0, 0.5)).toBe('finger');
    expect(slapClass([{ t: 0, hz: null, rms: 1 }], 0, 1)).toBeNull();
  });
  it('slap advice never changes the verdict', () => {
    const d = mk(line([28, 40, 28, 40, 28, 40, 28, 40], 0.5, (i) => ({ stroke: i % 2 ? 'i' : 'p' })), { slapAdvice: true }, { goal: { evenness: false, hands: false, bass: { slapAdvice: true } } });
    const frames: GFrame[] = Array.from({ length: 400 }, (_, i) => ({ t: i * 10 - 100, hz: null, rms: 0.3, centroid: 500 }));
    const m = analyzeGuitarTake(d, 90, perfect(d, 90), undefined, frames);
    expect(m.guitar.bass?.slap).toEqual({ thumb: 0, pop: 0 });
    expect(m.guitar.advice?.length).toBe(2);
    expect(m.verdict).toBe('clean');
  });
  it('cents: in tune passes, 30 cents flat fails on a fretless goal', () => {
    const d = mk(line([33, 35, 36, 38, 40, 41, 43, 45]), { cents: 15 });
    const bpm = 60;
    const framesAt = (c: number): GFrame[] => {
      const out: GFrame[] = [];
      for (let t = -100; t < 9000; t += 20) {
        const n = [...d.notes].reverse().find((x) => expTimeMs(d, x.beat, bpm) <= t) ?? d.notes[0];
        out.push({ t, hz: 440 * 2 ** ((n.pitch - 69 + c / 100) / 12), conf: 0.95, rms: 0.3 });
      }
      return out;
    };
    expect(centsOff(framesAt(-30), [{ pitch: 33, from: 0, to: 900 }])[0]).toBeCloseTo(-30, 0);
    expect(analyzeGuitarTake(d, bpm, perfect(d, bpm), undefined, framesAt(5)).verdict).toBe('clean');
    const flat = analyzeGuitarTake(d, bpm, perfect(d, bpm), undefined, framesAt(-30));
    expect(flat.verdict).toBe('not');
    expect(flat.why.en).toMatch(/flat/);
  });
});
