import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { colourChords, DC_HARRIS_KINDS, dimOf, TWO_NOTE, type ColourId } from '../src/engine/drills/dimColours';
import type { Drill } from '../src/engine/drills/types';

// docs/research/DIM-COLOURS.md: the chords each move of B°7 (B D F A♭) reaches, by name and notes.
const PC: Record<string, number> = { C: 0, 'D♭': 1, D: 2, 'E♭': 3, E: 4, F: 5, 'G♭': 6, 'F♯': 6, G: 7, 'A♭': 8, A: 9, 'B♭': 10, B: 11 };
const pcs = (names: string[], up = 0): number[] => names.map((n) => (PC[n] + up) % 12).sort((a, b) => a - b);

/** Per colour on the C page: the four chord names, one example's notes from the doc's table, and the resolutions. */
const DOC_C: Record<ColourId, { names: string[]; example: [number, string[]]; res: string[] }> = {
  dom: { names: ['G7', 'B♭7', 'D♭7', 'E7'], example: [0, ['B', 'D', 'F', 'G']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  m6: { names: ['Dm6', 'Fm6', 'A♭m6', 'Bm6'], example: [0, ['B', 'D', 'F', 'A']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  b9: { names: ['G7♭9', 'B♭7♭9', 'D♭7♭9', 'E7♭9'], example: [1, ['B♭', 'B', 'D', 'F']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  b5: { names: ['G7♭5', 'B♭7♭5', 'D♭7♭5', 'E7♭5'], example: [1, ['B♭', 'D', 'E', 'A♭']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  s5: { names: ['G7♯5', 'B♭7♯5', 'D♭7♯5', 'E7♯5'], example: [1, ['B♭', 'D', 'G♭', 'A♭']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  c13: { names: ['G13', 'B♭13', 'D♭13', 'E13'], example: [1, ['B♭', 'D', 'G', 'A♭']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  c13b9: { names: ['G13♭9', 'B♭13♭9', 'D♭13♭9', 'E13♭9'], example: [3, ['D♭', 'E', 'F', 'A♭']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  sus4: { names: ['G7sus4', 'B♭7sus4', 'D♭7sus4', 'E7sus4'], example: [1, ['B♭', 'E♭', 'F', 'A♭']], res: ['C6', 'E♭6', 'G♭6', 'A6'] },
  s9: { names: ['F7♯9', 'A♭7♯9', 'B7♯9', 'D7♯9'], example: [0, ['A', 'E♭', 'F', 'A♭']], res: ['B♭6', 'D♭6', 'E6', 'G6'] },
};
/** The same on the E♭ page (a minor 3rd up; D°7), spelled for E♭. */
const NAMES_EB: Record<ColourId, string[]> = {
  dom: ['B♭7', 'D♭7', 'E7', 'G7'],
  m6: ['Fm6', 'A♭m6', 'Bm6', 'Dm6'],
  b9: ['B♭7♭9', 'D♭7♭9', 'E7♭9', 'G7♭9'],
  b5: ['B♭7♭5', 'D♭7♭5', 'E7♭5', 'G7♭5'],
  s5: ['B♭7♯5', 'D♭7♯5', 'E7♯5', 'G7♯5'],
  c13: ['B♭13', 'D♭13', 'E13', 'G13'],
  c13b9: ['B♭13♭9', 'D♭13♭9', 'E13♭9', 'G13♭9'],
  sus4: ['B♭7sus4', 'D♭7sus4', 'E7sus4', 'G7sus4'],
  s9: ['A♭7♯9', 'B7♯9', 'D7♯9', 'F7♯9'],
};
const KIND: Record<ColourId, [string, number]> = {
  dom: ['dc-lower', 0], m6: ['dc-raise', 0], b9: ['dc-whole', 0],
  ...(Object.fromEntries(TWO_NOTE.map((c, r) => [c, ['dc-two', r * 10]])) as Record<string, [string, number]>),
} as Record<ColourId, [string, number]>;

/** The chord names an item plays, in order (from its chart). */
const played = (d: Drill): string[] => d.chart!.flatMap((b) => b.split(' '));

describe('colours of the diminished (k-dimcol)', () => {
  const fam = catalog().find((f) => f.id === 'k-dimcol')!;

  it('is a jazz family of seven levels, every level in all 12 keys', () => {
    expect(fam.style).toBe('jazz');
    expect(fam.levels.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const l of fam.levels) expect([...(l.keys as number[])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('every item builds in every key, tonic = the key, every chord graded on its notes', () => {
    for (const l of fam.levels)
      for (const s of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...s, key });
          expect(d.tonic).toEqual({ key });
          expect(d.notes.length).toBeGreaterThan(0);
          const sets = d.goal.chordSets!;
          for (const cs of sets) {
            const got = [...new Set(d.notes.filter((n) => n.chordId === cs.chordId).map((n) => n.pitch % 12))].sort((a, b) => a - b);
            expect(got).toEqual(cs.required);
          }
          expect(played(d).length).toBe(sets.length);
          expect(keyFacet(d)!.root).toBe(key);
          expect(keyFacet(d)!.group).toBe('major');
          if (s.hands === 'RL') expect(d.notes.some((n) => n.hand === 'L')).toBe(true);
        }
  });

  it("C: each colour's chords and resolutions match the doc's table", () => {
    for (const [c, doc] of Object.entries(DOC_C) as [ColourId, (typeof DOC_C)[ColourId]][]) {
      const cs = colourChords(0, c);
      expect(cs.map((x) => x.name), c).toEqual(doc.names);
      expect(cs[doc.example[0]].pcs, c).toEqual(pcs(doc.example[1]));
      expect(cs.map((x) => x.res.name), c).toEqual(doc.res);
      // the item plays the diminished, then the colour, then its 6th chord, round the four
      const [kind, op] = KIND[c];
      const d = generate({ family: 'k-dimcol', kind, key: 0, hands: 'R', option: op + 1 });
      expect(played(d)).toEqual(doc.names.flatMap((n, i) => ['B°7', n, doc.res[i]]));
      d.goal.chordSets!.forEach((set, i) => {
        if (i % 3 === 0) expect(set.required).toEqual(pcs(['B', 'D', 'F', 'A♭']));
        if (i % 3 === 1) expect(set.required).toEqual(cs[(i - 1) / 3].pcs);
      });
    }
  });

  it('E♭: the same table a minor 3rd up, spelled for E♭ (D°7)', () => {
    expect(dimOf(3).name).toBe('D°7');
    for (const [c, names] of Object.entries(NAMES_EB) as [ColourId, string[]][]) {
      const cs = colourChords(3, c);
      expect(cs.map((x) => x.name), c).toEqual(names);
      // the C table transposed up a minor 3rd (the same diminished: B°7 = D°7, so also the C chords one brother on)
      const inC = colourChords(0, c);
      cs.forEach((x, i) => {
        expect(x.pcs).toEqual(inC[i].pcs.map((p) => (p + 3) % 12).sort((a, b) => a - b));
        expect(x.pcs).toEqual(inC[(i + 1) % 4].pcs);
      });
    }
  });

  it('every chord is the doc arithmetic transposed, in all 12 keys', () => {
    for (let key = 0; key < 12; key++)
      for (const c of Object.keys(DOC_C) as ColourId[]) {
        const here = colourChords(key, c).map((x) => x.pcs.join());
        const fromC = colourChords(0, c).map((x) => x.pcs.map((p) => (p + key) % 12).sort((a, b) => a - b).join());
        expect(here).toEqual(fromC);
        expect(colourChords(key, c).every((x) => !/F♭|C♭|E♯|B♯|𝄫|𝄪/.test(x.name + x.res.name))).toBe(true);
      }
  });

  it('level 1 resolves the brothers to their own keys, then all to the key', () => {
    const d = generate({ family: 'k-dimcol', kind: 'dc-lower', key: 0, hands: 'R', option: 2 });
    expect(played(d)).toEqual(['B°7', 'G7', 'C6', 'B°7', 'B♭7', 'C6', 'B°7', 'D♭7', 'C6', 'B°7', 'E7', 'C6']);
    const moves = generate({ family: 'k-dimcol', kind: 'dc-lower', key: 0, hands: 'R', option: 0 });
    expect(played(moves)).toEqual(['B°7', 'G7', 'B°7', 'B♭7', 'B°7', 'D♭7', 'B°7', 'E7', 'B°7']);
  });

  it('the moves keep the voicing: only the moved voices change, by the doc step', () => {
    for (const hands of ['R', 'RL'] as const) {
      const d = generate({ family: 'k-dimcol', kind: 'dc-two', key: 0, hands, option: 0 });
      const at = (id: number) => d.notes.filter((n) => n.chordId === id).map((n) => n.pitch).sort((a, b) => a - b);
      const diff = at(1).map((p, i) => at(2)[i] - p).filter((x) => x !== 0);
      expect(diff).toEqual([-1, -1]);
    }
  });

  it('only the half-step items and levels name Barry Harris', () => {
    for (const l of fam.levels) {
      const half = l.specs.every((s) => DC_HARRIS_KINDS.includes(s.kind));
      expect(/Barry Harris/.test(l.title.en), l.id).toBe(half);
      expect(/בארי האריס/.test(l.title.he), l.id).toBe(half);
      for (const s of l.specs)
        for (const key of [0, 3, 6]) {
          const d = generate({ ...s, key });
          const harris = DC_HARRIS_KINDS.includes(s.kind);
          expect(/Barry Harris/.test(d.title.en), d.title.en).toBe(harris);
          expect(/בארי האריס/.test(d.title.he), d.title.he).toBe(harris);
          if (!harris) expect(d.title.en).toMatch(/^Colours of /);
          expect(keyFacet(d)!.role).toBe(harris ? 'harris' : 'colour');
        }
    }
    expect(generate({ family: 'k-dimcol', kind: 'dc-whole', key: 0, hands: 'R', option: 0 }).title.en).toMatch(/^Colours of B°7: raise one note a whole step — the 7♭9/);
  });

  it('levels: close position first, drop 2 in level 6, the run in both', () => {
    expect(fam.levels.slice(0, 5).every((l) => l.specs.every((s) => s.hands === 'R'))).toBe(true);
    expect(fam.levels[5].specs.every((s) => s.hands === 'RL')).toBe(true);
    expect(new Set(fam.levels[6].specs.map((s) => s.hands))).toEqual(new Set(['R', 'RL']));
    // every two-note row in both takes across levels 4 and 5
    expect(fam.levels.slice(3, 5).flatMap((l) => l.specs.map((s) => s.option)).sort((a, b) => a! - b!)).toEqual(TWO_NOTE.flatMap((_, r) => [r * 10, r * 10 + 1]));
    const run = generate({ family: 'k-dimcol', kind: 'dc-run', key: 0, hands: 'R', option: 0 });
    expect(played(run)).toEqual(['G7', 'Dm6', 'G7♭9', 'G7♭5', 'G7♯5', 'G13', 'G13♭9', 'G7sus4'].flatMap((n) => ['B°7', n, 'C6']));
  });
});
