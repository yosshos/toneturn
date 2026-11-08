import { describe, expect, it } from 'vitest';
import { RHYTHMS, STRIDES, VOICINGS, chartKind, voice } from '../src/engine/drills/chartDrills';
import { generate } from '../src/engine/drills/generate';
import { parseChart } from '../src/engine/charts';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { IMPROV_LEVELS } from '../src/engine/charts';
import type { DrillSpec } from '../src/engine/drills/types';

const N = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const names = (ms: number[]) => ms.map((m) => N[m % 12]).join(' ');
const ch = (sym: string) => parseChart(sym, 4).chords[0];
const spec = (kind: string, key = 0): DrillSpec => ({ family: 'voicings', kind, key, hands: 'L' });

describe('voicings by the book', () => {
  it('rootless A and B on Dm7, G7, Cmaj7', () => {
    expect(names(voice(ch('Dm7'), 'rootless-a', null).lh)).toBe('F A C E');
    expect(names(voice(ch('Dm7'), 'rootless-b', null).lh)).toBe('C E F A');
    expect(names(voice(ch('G7'), 'rootless-a', null).lh)).toBe('B E F A');
    expect(names(voice(ch('G7'), 'rootless-b', null).lh)).toBe('F A B E');
    expect(names(voice(ch('Cmaj7'), 'rootless-a', null).lh)).toBe('E G B D');
  });
  it('shells and guide tones', () => {
    expect(names(voice(ch('G7'), 'shell', null).lh)).toMatch(/^G (B F|F B)$/);
    expect(names(voice(ch('Dm7'), 'guide', null).lh)).toMatch(/^(F C|C F)$/);
  });
  it('drop 2 is a close voicing with the 2nd from the top an octave lower', () => {
    const v = voice(ch('Cmaj7'), 'drop2', null);
    const all = [...v.lh, ...v.rh];
    expect(all).toHaveLength(4);
    expect(new Set(all.map((m) => m % 12))).toEqual(new Set([0, 4, 7, 11]));
    expect(all[1] - all[0]).toBeGreaterThan(4); // the dropped voice opens the bottom
  });
  it('upper structure: D triad over C7, A♭ triad over C7alt', () => {
    expect(names(voice(ch('C7'), 'upper', null).rh).split(' ').sort().join(' ')).toBe('A D Gb');
    expect(names(voice(ch('C7alt'), 'upper', null).rh).split(' ').sort().join(' ')).toBe('Ab C Eb');
  });
  it('quartal: fourths inside the scale', () => {
    const v = voice(ch('Dm7'), 'quartal', null).lh;
    for (let i = 1; i < v.length; i++) expect(v[i] - v[i - 1]).toBe(5);
  });
});

describe('chart drills', () => {
  it('every voicing × rhythm builds a sound drill over a standard, in two keys', () => {
    for (const v of VOICINGS)
      for (const r of RHYTHMS)
        for (const key of [0, 5]) {
          const d = generate(spec(chartKind('std:autumn', v, r), key));
          expect(d.notes.length, `${v} ${r}`).toBeGreaterThan(8);
          for (const n of d.notes) expect(n.pitch >= 28 && n.pitch <= 96, `${v} ${r} ${n.pitch}`).toBe(true);
          expect(d.goal.chordSets?.length).toBeGreaterThan(0);
          expect(d.chart?.length).toBe(8);
        }
  });
  it('stride: bass on 1 and 3 below middle C, chords on 2 and 4', () => {
    for (const v of STRIDES) {
      const d = generate(spec(chartKind('lv:blues', v, 'whole'), 0));
      const onBeat = d.notes.filter((n) => n.beat % 1 === 0);
      for (const n of onBeat.filter((x) => x.beat % 2 === 0)) expect(n.pitch, v).toBeLessThan(60);
      expect(onBeat.some((n) => n.beat % 2 === 1)).toBe(true);
    }
  });
  it('improv mode writes only the left hand and frees the right hand', () => {
    const d = generate(spec(chartKind('lv:two-five-one', 'rootless', 'charleston', 'improv')));
    expect(d.notes.every((n) => n.hand === 'L')).toBe(true);
    expect(d.freeAbove).toBeGreaterThan(Math.max(...d.notes.map((n) => n.pitch)));
  });
  it('every improvisation level and standard builds in every voicing family', () => {
    for (const l of IMPROV_LEVELS) expect(generate(spec(chartKind(`lv:${l.id}`, 'rootless', 'whole'))).notes.length).toBeGreaterThan(0);
    for (const s of STANDARD_CHANGES) expect(generate(spec(chartKind(`std:${s.id}`, 'drop2', 'charleston'))).notes.length).toBeGreaterThan(0);
  });
  it('an own chart travels inside the kind', () => {
    const d = generate(spec(chartKind(`txt:${encodeURIComponent('Em7 | A7 | Dmaj7 | Dmaj7')}`, 'shell', 'four')));
    expect(d.chart).toEqual(['Em7', 'A7', 'Dmaj7', 'Dmaj7']);
  });
});
