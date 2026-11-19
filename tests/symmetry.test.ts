// Symmetry unit (owner 2026-11-19): the theory helper every answer is derived from (src/engine/symmetry.ts).
import { describe, expect, it } from 'vitest';
import { ALL_TRIADS, applyChain, applyOp, chainPath, cycleOf, distance, distances, divisionSet, intervalClass, intervalVector, IV_SETS, moveOf, partSize, shortestChains, transpositions, triadName, triadPcs, unionPcs, vectorText, type Triad } from '../src/engine/symmetry';

const T = (root: number, minor = false): Triad => ({ root, minor });
const C = T(0);

describe('dividing the octave', () => {
  it('2 → tritone, 3 → major 3rds, 4 → minor 3rds, 6 → whole tones, 12 → semitones', () => {
    expect([2, 3, 4, 6, 12].map(partSize)).toEqual([6, 4, 3, 2, 1]);
    expect(divisionSet(3)).toEqual([0, 4, 8]); // augmented triad
    expect(divisionSet(4)).toEqual([0, 3, 6, 9]); // diminished 7th
    expect(divisionSet(6)).toEqual([0, 2, 4, 6, 8, 10]); // whole-tone scale
  });
  it('distinct transpositions: tritone 6, augmented triad 4, dim7 3, whole-tone 2, chromatic 1; a major triad 12', () => {
    expect(transpositions(divisionSet(2))).toBe(6);
    expect(transpositions(divisionSet(3))).toBe(4);
    expect(transpositions(divisionSet(4))).toBe(3);
    expect(transpositions(divisionSet(6))).toBe(2);
    expect(transpositions(divisionSet(12))).toBe(1);
    expect(transpositions([0, 4, 7])).toBe(12);
    // the diminished (octatonic) scale: 3; the augmented (hexatonic) scale: 4
    expect(transpositions([0, 1, 3, 4, 6, 7, 9, 10])).toBe(3);
    expect(transpositions([0, 3, 4, 7, 8, 11])).toBe(4);
  });
});

describe('P, L, R', () => {
  it('P: C ↔ Cm, R: C ↔ Am, L: C ↔ Em; each is its own inverse', () => {
    expect(triadName(applyOp(C, 'P'))).toBe('Cm');
    expect(triadName(applyOp(C, 'R'))).toBe('Am');
    expect(triadName(applyOp(C, 'L'))).toBe('Em');
    for (const t of ALL_TRIADS) for (const op of ['P', 'L', 'R'] as const) expect(applyOp(applyOp(t, op), op)).toEqual({ root: t.root, minor: t.minor });
  });
  it('one note moves by step, two are kept', () => {
    expect(moveOf(C, 'P')).toMatchObject({ from: 4, to: 3, step: -1 }); // the 3rd down a semitone
    expect(moveOf(C, 'R')).toMatchObject({ from: 7, to: 9, step: 2 }); // the 5th up a whole tone
    expect(moveOf(C, 'L')).toMatchObject({ from: 0, to: 11, step: -1 }); // the root down a semitone
    expect(moveOf(T(9, true), 'R')).toMatchObject({ from: 9, to: 7, step: -2 }); // Am: the root down a whole tone
    expect(moveOf(T(4, true), 'L')).toMatchObject({ from: 11, to: 0, step: 1 }); // Em: the 5th up a semitone
    for (const t of ALL_TRIADS)
      for (const op of ['P', 'L', 'R'] as const) {
        const m = moveOf(t, op);
        expect(m.kept.length).toBe(2);
        expect(Math.abs(m.step)).toBe(op === 'R' ? 2 : 1);
      }
  });
  it('chains: P then L takes C to A♭; the chromatic mediants of C are two moves', () => {
    expect(triadName(applyChain(C, ['P', 'L']))).toBe('A♭');
    expect(chainPath(C, ['P', 'L']).map(triadName)).toEqual(['C', 'Cm', 'A♭']);
    expect(shortestChains(C, T(4))).toEqual([['L', 'P']]); // C → E
    expect(shortestChains(C, T(8))).toEqual([['P', 'L']]); // C → A♭
    expect(shortestChains(C, T(9))).toEqual([['R', 'P']]); // C → A
    expect(shortestChains(C, T(3))).toEqual([['P', 'R']]); // C → E♭
  });
  it('the hexatonic cycle (PL) has 6 triads inside one augmented scale; the octatonic (PR) 8 inside one diminished scale', () => {
    const hex = cycleOf(C, 'P', 'L');
    expect(hex.map(triadName)).toEqual(['C', 'Cm', 'A♭', 'G♯m', 'E', 'Em']);
    expect(unionPcs(hex)).toEqual([0, 3, 4, 7, 8, 11]);
    const oct = cycleOf(C, 'P', 'R');
    expect(oct.map(triadName)).toEqual(['C', 'Cm', 'E♭', 'E♭m', 'F♯', 'F♯m', 'A', 'Am']);
    expect(unionPcs(oct)).toEqual([0, 1, 3, 4, 6, 7, 9, 10]);
    // L and R alternate through all 24 triads
    expect(cycleOf(C, 'L', 'R').length).toBe(24);
  });
  it('every triad is reachable; the farthest is 5 moves away', () => {
    for (const t of ALL_TRIADS) expect(distances(t).size).toBe(24);
    expect(Math.max(...distances(C).values())).toBe(5);
    expect(distance(C, T(6))).toBe(4); // the tritone-related major triad: P R P R through the octatonic cycle
    expect(ALL_TRIADS.filter((t) => distance(C, t) === 5).map(triadName)).toEqual(['B♭m']);
  });
});

describe('interval vectors', () => {
  it('classes fold an interval and its inversion', () => {
    expect([1, 11, 5, 7, 6, 9, 8].map(intervalClass)).toEqual([1, 1, 5, 5, 6, 3, 4]);
  });
  it('the standard vectors', () => {
    const v = (k: string) => vectorText(intervalVector(IV_SETS[k].pcs));
    expect(v('major')).toBe('<001110>');
    expect(v('minor')).toBe('<001110>');
    expect(v('dim7')).toBe('<004002>');
    expect(v('aug')).toBe('<000300>');
    expect(v('wholetone')).toBe('<060603>');
    expect(v('majorScale')).toBe('<254361>');
    expect(v('dim')).toBe('<002001>');
    expect(v('dom7')).toBe('<012111>');
    expect(v('m7b5')).toBe('<012111>');
    expect(v('maj7')).toBe('<101220>');
    expect(v('m7')).toBe('<012120>');
    expect(triadPcs(C)).toEqual([0, 4, 7]);
  });
});
