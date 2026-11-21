import { describe, expect, it } from 'vitest';
import { barronOffsets, chartDrillData, chartKind, definingTones, fourTones, soWhatOffsets, voice, type ChartVoicing } from '../src/engine/drills/chartDrills';
import { parseChart } from '../src/engine/charts';
import { catalog, generate } from '../src/engine/drills/generate';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { KEYS_LEVEL_DIFF as PATH_POS } from '../src/engine/path';
import type { DrillSpec } from '../src/engine/drills/types';

const N = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ch = (sym: string) => parseChart(sym, 4).chords[0];
const pcs = (sym: string, v: ChartVoicing) => {
  const x = voice(ch(sym), v, null);
  return new Set([...x.lh, ...x.rh].map((m) => m % 12));
};
const names = (ms: number[]) => ms.map((m) => N[m % 12]).join(' ');

describe('never drop the ♭9 (or any defining tension)', () => {
  it('a G7♭9 keeps its A♭ in rootless, drop 2, drop 3, four-way close and every other voicing type', () => {
    for (const v of ['rootless', 'rootless-a', 'rootless-b', 'close4', 'drop2', 'drop3', 'block', 'open', 'two-hand', 'upper', 'quartal'] as ChartVoicing[])
      expect(pcs('G7b9', v).has(8), v).toBe(true);
  });

  it('the 4-note form of a 7♭9 is 3-5-♭7-♭9 (the diminished 7th on its 3rd), dropped as usual', () => {
    expect(fourTones(ch('G7b9'))).toEqual([1, 4, 7, 10]);
    expect([...pcs('G7b9', 'close4')].sort((a, b) => a - b)).toEqual([2, 5, 8, 11]); // B D F A♭
    for (const v of ['drop2', 'drop3'] as ChartVoicing[]) {
      const x = voice(ch('G7b9'), v, null);
      const all = [...x.lh, ...x.rh];
      expect(all, v).toHaveLength(4);
      expect(new Set(all.map((m) => m % 12)), v).toEqual(new Set([11, 2, 5, 8]));
      // the dropped voice sits an octave under its close position: the lowest gap opens wider than a minor 3rd
      expect(all[1] - all[0], v).toBeGreaterThan(3);
    }
  });

  it('every altered quality keeps its defining tones in every voicing type', () => {
    // each entry: alternatives (a 7alt's altered 9th may be the ♭9 or the ♯9)
    const want: Record<string, number[][]> = {
      C7b9: [[1]], 'C7#9': [[3]], C7b13: [[8]], C7alt: [[8], [1, 3]], 'C7#11': [[6]], Cm7b5: [[6]], Cdim7: [[6], [9]], C13b9: [[1], [9]], 'Cmaj7#11': [[6]], C13: [[9]],
    };
    const key = (gs: number[][]) => gs.map((g) => g.join(',')).sort();
    for (const [sym, need] of Object.entries(want)) {
      expect(key(definingTones(ch(sym))), sym).toEqual(key(need));
      for (const v of ['rootless', 'rootless-a', 'rootless-b', 'close4', 'drop2', 'drop3', 'block', 'open', 'two-hand', 'upper', 'quartal'] as ChartVoicing[]) {
        const got = pcs(sym, v);
        for (const g of need) expect(g.some((d) => got.has(d)), `${sym} ${v} lacks ${g.map((d) => N[d]).join('/')}`).toBe(true);
      }
    }
  });

  it('the stride chord and a cadence drill keep the ♭9 too', () => {
    const d = chartDrillData(chartKind('cad:m-ii-v-i', 'stride-tenth', 'whole'), 0)!;
    // beat 2 of bar 1 (the G7♭9's chord on 2 and 4) has the A♭
    const onG = d.evs.filter((e) => e.beat >= 2 && e.beat < 4 && e.notes.length > 1);
    expect(onG.some((e) => e.notes.some((n) => n.pitch % 12 === 8))).toBe(true);
    for (const v of ['drop2', 'drop3', 'close4'] as ChartVoicing[]) {
      const x = chartDrillData(chartKind('cad:m-ii-v-i', v, 'whole'), 0)!;
      const g = x.evs.find((e) => e.beat === 2)!;
      expect(g.notes.map((n) => n.pitch % 12), v).toContain(8);
    }
  });

  it('guitar drop 2 / drop 3 over the minor ii–V–i keep the ♭9 of the V', () => {
    for (const v of ['drop2', 'drop3']) {
      const d = generate({ family: 'g-cadlib', kind: `cad~m-ii-v-i~${v}`, key: 0, hands: 'R', instrument: 'guitar' });
      const g = d.notes.filter((n) => n.beat === 2);
      expect(g, v).toHaveLength(4);
      expect(g.map((n) => n.pitch % 12), v).toContain(8);
    }
  });
});

describe('quartal So What ii–V–I', () => {
  it('the D So What: D-G / C-F-A (three perfect 4ths and a major 3rd), Dm11', () => {
    const x = voice(ch('Dm7'), 'sowhat1', null);
    expect(names(x.lh)).toBe('D G');
    expect(names(x.rh)).toBe('C F A');
    const all = [...x.lh, ...x.rh];
    expect(all.slice(1).map((m, i) => m - all[i])).toEqual([5, 5, 5, 4]);
  });

  it('moves to E♭ with the shape intact', () => {
    const d = chartDrillData(chartKind('cad:ii-v-i', 'sowhat1', 'whole'), 3)!;
    const first = d.evs[0].notes.map((n) => n.pitch);
    expect(names(first)).toBe('F Bb Eb Ab C'); // Fm7, the ii of E♭
    expect(first.slice(1).map((m, i) => m - first[i])).toEqual([5, 5, 5, 4]);
  });

  it('variation 1 in C: Dm7 D-G/C-F-A, G7 the same shape, Cmaj7 the E So What (both hands up a step)', () => {
    const d = chartDrillData(chartKind('cad:ii-v-i', 'sowhat1', 'whole'), 0)!;
    const [dm, g7, c] = d.evs.slice(0, 3).map((e) => e.notes.map((n) => n.pitch));
    expect(names(dm)).toBe('D G C F A');
    expect(g7).toEqual(dm);
    expect(names(c)).toBe('E A D G B');
    expect(c.map((m, i) => m - dm[i])).toEqual([2, 2, 2, 2, 2]);
    expect(d.evs[0].notes.filter((n) => n.hand === 'L')).toHaveLength(2);
  });

  it('variation 2 in C: Dm7 D-G/C-F-A, G7 the open G9 D-G/B-F-A, Cmaj7 the B So What B-E/A-D-F♯', () => {
    const d = chartDrillData(chartKind('cad:ii-v-i', 'sowhat2', 'whole'), 0)!;
    const [dm, g7, c] = d.evs.slice(0, 3).map((e) => e.notes.map((n) => n.pitch));
    expect(names(dm)).toBe('D G C F A');
    expect(names(g7)).toBe('D G B F A');
    expect(names(c)).toBe('B E A D Gb');
    expect(c.slice(1).map((m, i) => m - c[i])).toEqual([5, 5, 5, 4]);
  });

  it('no So What is invented for chords the sources leave out', () => {
    for (const s of ['Dm7b5', 'G7b9', 'G7alt', 'Cm6']) expect(soWhatOffsets(ch(s), 1), s).toBeNull();
  });
});

describe('the Kenny Barron voicing', () => {
  const barron = (sym: string) => {
    const x = voice(ch(sym), 'barron', null);
    return { lh: names(x.lh), rh: names(x.rh), all: [...x.lh, ...x.rh] };
  };
  it('Cm11: C-G-D / E♭-B♭-F, stacked fifths, the RH a half step above the LH', () => {
    const b = barron('Cm7');
    expect(b.lh).toBe('C G D');
    expect(b.rh).toBe('Eb Bb F');
    expect(b.all.slice(1).map((m, i) => m - b.all[i])).toEqual([7, 7, 1, 7, 7]);
  });
  it('Fm11: F-C-G / A♭-E♭-B♭', () => {
    const b = barron('Fm7');
    expect(b.lh).toBe('F C G');
    expect(b.rh).toBe('Ab Eb Bb');
  });
  it('moves to E♭m11 intact', () => {
    const d = chartDrillData(chartKind('set:m7-cycle', 'barron', 'whole'), 3)!;
    const first = d.evs[0].notes.map((n) => n.pitch);
    expect(names(first)).toBe('Eb Bb F Gb Db Ab');
    expect(first.slice(1).map((m, i) => m - first[i])).toEqual([7, 7, 1, 7, 7]);
    expect(d.evs).toHaveLength(12); // every m7, round the circle of fifths
    expect(d.tonic).toEqual({ key: 3, minor: true });
  });
  it('the major variant on C: C-G-D / E-B-F♯ (maj7♯11)', () => {
    const b = barron('Cmaj7');
    expect(b.lh).toBe('C G D');
    expect(b.rh).toBe('E B Gb');
  });
  it('the ii–V–I: the Barron on the ii, the V two-handed, the major variant on the I; nothing for other chords', () => {
    const d = chartDrillData(chartKind('cad:ii-v-i', 'barron', 'whole'), 0)!;
    expect(names(d.evs[0].notes.map((n) => n.pitch))).toBe('D A E F C G');
    expect(d.evs[1].notes.some((n) => n.hand === 'R')).toBe(true);
    expect(names(d.evs[2].notes.map((n) => n.pitch))).toBe('C G D E B Gb');
    for (const s of ['Dm7b5', 'G7', 'Cm6', 'Cdim7']) expect(barronOffsets(ch(s)), s).toBeNull();
  });
});

describe('the harmonic minor formula pattern, 4 octaves (RCM Levels 9–10)', () => {
  const lvl = catalog().find((f) => f.id === 'scales')!.levels.find((l) => l.id === 'scales-36')!;
  const line = (key: number, h: 'R' | 'L') =>
    generate({ ...lvl.specs[0], key } as DrillSpec)
      .notes.filter((n) => n.hand === h)
      .sort((a, b) => a.beat - b.beat)
      .map((n) => n.pitch);
  it('C: both hands on the tonic, out two octaves in contrary motion, then two more up in parallel (bars 1–2)', () => {
    const r = line(0, 'R');
    const l = line(0, 'L');
    // bars 1–2 in 16ths: 32 notes a hand (C harmonic minor: C D E♭ F G A♭ B)
    expect(r.slice(0, 32)).toEqual([48, 50, 51, 53, 55, 56, 59, 60, 62, 63, 65, 67, 68, 71, 72, 74, 75, 77, 79, 80, 83, 84, 86, 87, 89, 91, 92, 95, 96, 95, 92, 91]);
    expect(l.slice(0, 32)).toEqual([48, 47, 44, 43, 41, 39, 38, 36, 35, 32, 31, 29, 27, 26, 24, 26, 27, 29, 31, 32, 35, 36, 38, 39, 41, 43, 44, 47, 48, 47, 44, 43]);
    expect(r).toHaveLength(4 * 14 + 1);
    expect(r[r.length - 1]).toBe(48);
    expect(l[l.length - 1]).toBe(48);
  });
  it('files under minor, harmonic, in all 12 keys, at or after scales-10 on the path', () => {
    const s = lvl.specs[0];
    expect([s.minor, s.scale, s.motion, s.octaves, s.hands]).toEqual([true, 'harmonic', 'formula', 4, 'RL']);
    const keys = new Set<number>();
    for (let k = 0; k < 12; k++) {
      const d = generate({ ...s, key: k } as DrillSpec);
      const f = keyFacet(d)!;
      expect([f.root, f.group, f.role]).toEqual([k, 'minor', 'scale']);
      for (const n of d.notes) expect(n.pitch >= 21 && n.pitch <= 108).toBe(true);
      keys.add(f.root);
      expect(d.title.he.length).toBeGreaterThan(0);
    }
    expect(keys.size).toBe(12);
    expect(PATH_POS['scales-36']).toBeGreaterThanOrEqual(PATH_POS['scales-10']);
  });
});
