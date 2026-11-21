import { describe, expect, it } from 'vitest';
import { families, specDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { MODES, MODE_OPT, spellMode } from '../src/engine/drills/modeScales';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const fam = (id: string) => families('piano').find((f) => f.id === id)!;
const g = (o: Partial<DrillSpec>): Drill => generate({ family: 'k-mmhm', kind: 'mode', key: 0, hands: 'R', octaves: 1, ...o } as DrillSpec);
/** The first octave going up, as written (the per-note spelling). */
const upNames = (d: Drill, n = 7) => d.notes.filter((x) => x.hand === 'R').slice(0, n).map((x) => x.spell);

describe('modes as full scales (SPEC-PRACTICE-KEYS §6)', () => {
  it('both families exist with levels, all 12 keys, and every item generates', () => {
    for (const id of ['k-modes', 'k-mmhm']) {
      const f = fam(id);
      expect(f.levels.length).toBeGreaterThan(5);
      for (const l of f.levels)
        for (let i = 0; i < l.specs.length; i++) {
          const ds = specDrills(l, i, 'fifths-up');
          expect(new Set(ds.map((d) => d.spec.key % 12)).size, `${l.id} #${i}`).toBe(12);
          for (const d of ds) expect(d.notes.length).toBeGreaterThan(10);
        }
    }
  });

  it('every new item files in its tab: major modes under major, melodic / harmonic minor modes under mmhm, symmetric under symmetric', () => {
    const groups: Record<string, Set<string>> = {};
    for (const id of ['k-modes', 'k-mmhm'])
      for (const l of fam(id).levels)
        for (let i = 0; i < l.specs.length; i++)
          for (const d of specDrills(l, i, 'fifths-up')) {
            const f = keyFacet(d)!;
            expect(f.role).toBe('scale');
            expect(f.root).toBe(d.spec.key % 12);
            const m = d.spec.kind === 'mode' ? MODES[d.spec.option!].fam : d.spec.option === 0 ? 'major' : 'mm';
            const want = id === 'k-modes' ? 'major' : m === 'sym' ? 'symmetric' : 'mmhm';
            expect(f.group, d.title.en).toBe(want);
            (groups[want] ??= new Set()).add(d.title.en.split(' · ')[0].replace(/^\S+ /, ''));
          }
    expect(groups.major.has('dorian a 3rd apart') || [...groups.major].some((x) => /aeolian/.test(x))).toBe(true);
    for (const n of ['lydian dominant', 'phrygian dominant', 'altered', 'altered ♭♭7', 'dorian ♭2', 'lydian augmented', 'mixolydian ♭6', 'locrian ♮2', 'locrian ♮6', 'ionian ♯5', 'dorian ♯4', 'lydian ♯2'])
      expect([...groups.mmhm].some((x) => x === n), n).toBe(true);
    for (const n of ['whole-tone', 'diminished half-whole', 'diminished whole-half']) expect([...groups.symmetric].some((x) => x === n), n).toBe(true);
  });

  it('titles name the mode on its root, in English and Hebrew', () => {
    expect(g({ option: MODE_OPT.lydianDom }).title.en).toBe('C lydian dominant · 1 oct · RH');
    expect(g({ option: MODE_OPT.phrygianDom }).title.he).toContain('פריגי דומיננטי');
    expect(g({ family: 'k-modes', option: MODE_OPT.dorian, hands: 'RL', motion: 'third', octaves: 2 }).title.en).toBe('C dorian · a 3rd apart · 2 oct · HT');
    expect(g({ option: MODE_OPT.wholeTone, hands: 'RL', motion: 'contrary' }).title.en).toBe('C whole-tone · contrary motion · 1 oct · HT');
  });

  it('spells one letter per degree, in C and in F♯', () => {
    expect(spellMode(0, MODE_OPT.dorian).notes).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭']);
    expect(spellMode(0, MODE_OPT.altered).notes).toEqual(['C', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭']);
    expect(spellMode(0, MODE_OPT.phrygianDom).notes).toEqual(['C', 'D♭', 'E', 'F', 'G', 'A♭', 'B♭']);
    expect(spellMode(6, MODE_OPT.dorian)).toEqual({ root: 'F♯', notes: ['F♯', 'G♯', 'A', 'B', 'C♯', 'D♯', 'E'] });
    expect(spellMode(6, MODE_OPT.altered)).toEqual({ root: 'F♯', notes: ['F♯', 'G', 'A', 'B♭', 'C', 'D', 'E'] });
    expect(spellMode(6, MODE_OPT.phrygianDom)).toEqual({ root: 'F♯', notes: ['F♯', 'G', 'A♯', 'B', 'C♯', 'D', 'E'] });
    // E♭ dorian, not D♯ dorian; the bebop dominant adds its passing major 7th on the 7th's letter
    expect(spellMode(3, MODE_OPT.dorian).root).toBe('E♭');
    expect(spellMode(0, MODE_OPT.bebopDom).notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B♭', 'B']);
    // the drill carries the spelling note by note, and the major modes their parent's key signature
    const fd = g({ family: 'k-modes', key: 6, option: MODE_OPT.dorian });
    expect(upNames(fd)).toEqual(['F♯', 'G♯', 'A', 'B', 'C♯', 'D♯', 'E']);
    expect(fd.keySig).toBe('E');
    expect(fd.title.en).toBe('F♯ dorian · 1 oct · RH');
    expect(upNames(g({ option: MODE_OPT.altered }))).toEqual(['C', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭']);
  });

  it('the parallel exercise plays every mode on the root; the derived one the parent from each degree', () => {
    const segs = (d: Drill, len: number) => Array.from({ length: d.notes.length / len }, (_, i) => d.notes.slice(i * len, i * len + len));
    const par = generate({ family: 'k-modes', kind: 'mode-par', key: 0, hands: 'R', option: 0 });
    // seven segments of 15 notes (an octave up and back), each starting on C4
    expect(par.notes.length).toBe(7 * 15);
    const ps = segs(par, 15);
    expect(ps.map((s) => s[0].pitch)).toEqual(Array(7).fill(60));
    expect(ps.map((s) => s.slice(0, 8).map((n) => n.pitch - 60))).toEqual([0, 1, 2, 3, 4, 5, 6].map((d) => MODES[d].ints.concat(12)));
    expect(ps[1].slice(0, 7).map((n) => n.spell)).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭']);
    expect(keyFacet(par)!.group).toBe('major');

    const der = generate({ family: 'k-modes', kind: 'mode-der', key: 0, hands: 'R', option: 0 });
    const ds = segs(der, 15);
    expect(ds.map((s) => s[0].spell)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(ds.map((s) => s[0].pitch)).toEqual([60, 62, 64, 65, 67, 69, 71]);
    // every note of the derived run is in C major
    expect(der.notes.every((n) => [0, 2, 4, 5, 7, 9, 11].includes(n.pitch % 12))).toBe(true);
    expect(der.keySig).toBe('C');

    // melodic minor: C melodic minor, D dorian ♭2, E♭ lydian augmented … over the parent's degrees
    const mm = generate({ family: 'k-mmhm', kind: 'mode-der', key: 0, hands: 'R', option: 1 });
    expect(segs(mm, 15).map((s) => s[0].spell)).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A', 'B']);
    expect(mm.notes.every((n) => [0, 2, 3, 5, 7, 9, 11].includes(n.pitch % 12))).toBe(true);
    expect(keyFacet(mm)!.group).toBe('mmhm');
    const hmPar = generate({ family: 'k-mmhm', kind: 'mode-par', key: 0, hands: 'RL', option: 2 });
    expect(keyFacet(hmPar)!.group).toBe('mmhm');
    expect(hmPar.notes.filter((n) => n.hand === 'R').length).toBe(7 * 15);
    expect(hmPar.title.en).toMatch(/^All the harmonic-minor modes on C \(parallel\)/);
  });

  it('guitar and bass: the remaining modes, filed in their tabs', () => {
    const at = (inst: 'guitar' | 'bass', id: string) => {
      const l = families(inst).flatMap((f) => f.levels).find((x) => x.id === id)!;
      return l.specs.map((_, i) => specDrills(l, i, 'fifths-up').find((d) => d.spec.key % 12 === 0)!);
    };
    const gm = at('guitar', 'g-scales-19').concat(at('guitar', 'g-scales-20'));
    expect(gm.map((d) => d.title.en.split(' in position')[0])).toEqual(['C dorian ♭2', 'C lydian augmented', 'C lydian dominant', 'C mixolydian ♭6', 'C locrian ♮2', 'C locrian ♮6', 'C ionian ♯5', 'C dorian ♯4', 'C phrygian dominant', 'C lydian ♯2', 'C altered ♭♭7']);
    expect(gm.every((d) => keyFacet(d)!.group === 'mmhm')).toBe(true);
    const g18 = at('guitar', 'g-scales-21');
    expect(g18.map((d) => keyFacet(d)!.group)).toEqual(['symmetric', 'major']);
    // the phrygian dominant on the neck: C D♭ E F G A♭ B♭
    expect([...new Set(gm[8].notes.map((n) => n.pitch % 12))].sort((a, b) => a - b)).toEqual([0, 1, 4, 5, 7, 8, 10]);
    const bm = [...at('bass', 'b-scale-13'), ...at('bass', 'b-scale-14'), ...at('bass', 'b-scale-15')];
    expect(bm.map((d) => keyFacet(d)!.group)).toEqual(['major', 'symmetric', 'major', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm', 'mmhm']);
    expect([...new Set(bm[11].notes.map((n) => n.pitch % 12))].sort((a, b) => a - b)).toEqual([0, 1, 4, 5, 7, 8, 10]);
  });
});
