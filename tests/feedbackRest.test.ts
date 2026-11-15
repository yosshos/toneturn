// COURSE-FEEDBACK-UI slices 5 and 8, the rest: the hands-together gap (the ⇆ chip), velocity bars, note roles on the
// chord chart, and the "changed" tab not counting as a kept / broken bar.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs, improvNotes } from '../src/engine/drills/analyze';
import { HANDS_CHIP_MS, handsGap, liveGrade } from '../src/engine/drills/liveGrade';
import { velBars, velBarsShown, velStep, velTarget } from '../src/engine/drills/velBars';
import { noteRole, noteRoles, ROLE_DOTS, rulesKept } from '../src/engine/drills/chartCells';
import type { DrillCalibration, NoteResult, PlayedNote } from '../src/engine/drills/types';

const CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };

describe('handsGap (the ⇆ chip)', () => {
  const r = (hand: 'R' | 'L', beat: number, on: number): { r: NoteResult; t: number } => ({ r: { exp: { pitch: 60, beat, dur: 1, hand }, played: { pitch: 60, on, off: null, vel: 64 }, dev: on - beat * 500, ok: true }, t: beat * 500 });
  it('RH − LH on the beats both hands played: size and sign (+ = left hand first)', () => {
    const g = handsGap([r('R', 0, 40), r('L', 0, 0), r('R', 1, 540), r('L', 1, 500), r('R', 2, 1000)]);
    expect(g).not.toBeNull();
    expect(g!.abs).toBeCloseTo(40);
    expect(g!.mean).toBeGreaterThan(0);
  });
  it('one hand only: no gap', () => {
    expect(handsGap([r('R', 0, 0), r('R', 1, 500)])).toBeNull();
  });
  it('a hands-together take played with the left hand 45 ms ahead shows the chip; together does not', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'RL', scale: 'major', octaves: 1 } as never);
    const bpm = 80;
    const play = (lhAhead: number): PlayedNote[] => d.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) - (n.hand === 'L' ? lhAhead : 0), off: null, vel: 70 }));
    const end = expTimeMs(d, d.beats, bpm) + 1500;
    const apart = liveGrade(d, analyzeTake(d, bpm, play(45), CAL), bpm, end);
    expect(apart.hands!.abs).toBeGreaterThan(HANDS_CHIP_MS);
    expect(apart.hands!.mean).toBeGreaterThan(0);
    const together = liveGrade(d, analyzeTake(d, bpm, play(0), CAL), bpm, end);
    expect(together.hands!.abs).toBeLessThanOrEqual(HANDS_CHIP_MS);
  });
});

describe('velocity bars', () => {
  it('four steps across the calibrated range', () => {
    expect(velStep(22, CAL)).toBe(1);
    expect(velStep(50, CAL)).toBe(2);
    expect(velStep(80, CAL)).toBe(3);
    expect(velStep(118, CAL)).toBe(4);
    // a narrow calibration falls back to a default range
    expect(velStep(118, { latencyMs: 0, velMin: 60, velMax: 62 })).toBe(4);
  });
  it('only items with a loudness / accent goal: an even-mf scale yes, a plain scale no', () => {
    const plain = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 1 } as never);
    const mf = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 1, dynamics: 'even-mf' } as never);
    const acc = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 1, dynamics: 'accent3', perBeat: 3 } as never);
    expect(plain.goal.evenness).toBe(true);
    expect(velBarsShown(plain)).toBe(false);
    expect(velBarsShown(mf)).toBe(true);
    expect(velBarsShown(acc)).toBe(true);
    // mf: the hollow outline at the mf step on every note; accents: a thick top on the accented ones
    expect(velTarget(mf, mf.notes[0], CAL)).toBe(3);
    const bars = velBars(acc, null, CAL);
    expect(bars.length).toBe(acc.notes.length);
    expect(bars.some((b) => b.accent)).toBe(true);
    expect(bars.every((b) => b.step === null)).toBe(true);
  });
  it('a played note fills its bar (a chord is one bar, its loudest note)', () => {
    const mf = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 1, dynamics: 'even-mf' } as never);
    const bpm = 80;
    const played: PlayedNote[] = mf.notes.slice(0, 3).map((n, i) => ({ pitch: n.pitch, on: expTimeMs(mf, n.beat, bpm), off: null, vel: [25, 80, 118][i] }));
    const m = analyzeTake(mf, bpm, played, CAL);
    const bars = velBars(mf, m.perNote, CAL);
    expect(bars.slice(0, 3).map((b) => b.step)).toEqual([1, 3, 4]);
    expect(bars[3].step).toBeNull();
  });
});

describe('note roles (§4.7)', () => {
  it('chord tone, tension (in the chord-scale), outside', () => {
    const dm7 = { root: 2, iv: [0, 3, 7, 10] };
    expect(noteRole(62, dm7)).toBe('chord'); // D
    expect(noteRole(65, dm7)).toBe('chord'); // F
    expect(noteRole(64, dm7)).toBe('tension'); // E: the 9th (dorian)
    expect(noteRole(71, dm7)).toBe('tension'); // B: the 13th (dorian)
    expect(noteRole(63, dm7)).toBe('outside'); // E♭
    const g7 = { root: 7, iv: [0, 4, 7, 10] };
    expect(noteRole(69, g7)).toBe('tension'); // A: the 9th (mixolydian)
    expect(noteRole(68, g7)).toBe('outside'); // A♭ over a plain G7
  });
  it('per bar from the improvised notes heard, at most ROLE_DOTS a bar', () => {
    const d = generate({ family: 'k-solo', kind: 'sl-imp', key: 0, hands: 'R', swing: true, option: 0 } as never);
    expect(d.goal.improv?.spans.length).toBeGreaterThan(0);
    const bpm = 100;
    // bar 1 (Dm7): D, E, E♭; bar 2 (G7): eight Bs
    const ps: PlayedNote[] = [
      ...[62, 64, 63].map((p, i) => ({ pitch: p + 12, on: expTimeMs(d, i, bpm), off: null, vel: 70 })),
      ...Array.from({ length: 8 }, (_, i) => ({ pitch: 83, on: expTimeMs(d, 4 + i * 0.5, bpm), off: null, vel: 70 })),
    ];
    const roles = noteRoles(d, improvNotes(d, bpm, ps));
    expect(roles.length).toBe(d.chart!.length);
    expect(roles[0]).toEqual(['chord', 'tension', 'outside']);
    expect(roles[1].length).toBe(ROLE_DOTS);
    expect(roles[1].every((r) => r === 'chord')).toBe(true);
    expect(roles[2]).toEqual([]);
  });
  it('a drill without rule cards: no dots', () => {
    const plain = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 1 } as never);
    expect(noteRoles(plain, [{ beat: 0, midi: 60 }]).flat()).toEqual([]);
  });
  it('a reharm "changed" tab is not a kept or broken bar', () => {
    expect(rulesKept([{ chord: 'C', tab: { kind: 'changed', rules: [] } }])).toBeNull();
  });
});
