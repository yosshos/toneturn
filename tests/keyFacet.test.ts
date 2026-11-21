import { describe, expect, it } from 'vitest';
import { families, specDrills } from '../src/engine/drills/plan';
import { drillKeyOf } from '../src/engine/drills/ladder';
import { FAMILY_FACETS, keyFacet, type FacetGroup } from '../src/engine/drills/keyFacet';
import type { Drill } from '../src/engine/drills/types';

/** Every drill of piano, guitar and bass in one key (C, or the level's first key). */
function allAt(key = 0): Drill[] {
  const out: Drill[] = [];
  for (const inst of ['piano', 'guitar', 'bass'] as const)
    for (const f of families(inst))
      for (const l of f.levels)
        for (let k = 0; k < l.specs.length; k++) {
          const ds = specDrills(l, k, 'fifths-up');
          const d = ds.find((x) => drillKeyOf(x) === key) ?? ds[0];
          if (d) out.push(d);
        }
  return out;
}
const ALL = allAt(0);
const g = (re: RegExp): FacetGroup[] => ALL.filter((d) => re.test(d.title.en)).map((d) => keyFacet(d)!.group);

describe('key facet (SPEC-PRACTICE-KEYS §5)', () => {
  it('every piano, guitar and bass family has a facet', () => {
    const missing = new Set<string>();
    for (const inst of ['piano', 'guitar', 'bass'] as const) for (const f of families(inst)) if (!FAMILY_FACETS[f.id]) missing.add(f.id);
    expect([...missing]).toEqual([]);
    expect(ALL.every((d) => keyFacet(d) !== null)).toBe(true);
  });

  it('minor material files under minor (the 178 levels the audit found tagged major)', () => {
    const wrong = ALL.filter((d) => /\b(harmonic|melodic|natural) minor\b|minor 6th-diminished|minor ii–V–i|vii°7 of C minor|\bCm6\b/.test(d.title.en) && !/altered|lydian dominant|phrygian dominant|over C7|dorian/.test(d.title.en) && keyFacet(d)!.group === 'major');
    expect(wrong.map((d) => `${d.spec.family} ${d.title.en}`)).toEqual([]);
  });

  it('the major modes on the root sit with major; melodic / harmonic minor modes and symmetric scales get their own tabs', () => {
    expect(g(/^C dorian scale/)).toEqual(['major']);
    expect(g(/^C lydian dominant scale/)).toEqual(['mmhm']);
    expect(g(/^C altered \(super-locrian\) scale/)).toEqual(['mmhm']);
    expect(g(/^C whole-tone scale · 2 oct/)).toEqual(['symmetric']);
    expect(new Set(g(/^C chromatic · 2 oct · RH$/))).toEqual(new Set(['symmetric']));
    expect(new Set(g(/^C harmonic minor · 2 oct/))).toEqual(new Set(['minor']));
  });

  it('a cadence keeps its key: an altered V inside a ii–V–I in C is on the C major page', () => {
    expect(new Set(g(/^Bebop line, ii–V7alt–I in C/))).toEqual(new Set(['major']));
    expect(new Set(g(/Barry Harris H1: the C 6th-diminished scale/))).toEqual(new Set(['major']));
    expect(new Set(g(/Barry Harris H1: the C minor 6th-diminished scale/))).toEqual(new Set(['minor']));
  });

  it('dynamics and touch work is marked as control in every family that measures it', () => {
    const ctl = ALL.filter((d) => keyFacet(d)!.control);
    expect(ctl.length).toBeGreaterThan(50);
    expect(ctl.some((d) => /cresc/.test(d.title.en))).toBe(true);
    expect(ctl.some((d) => d.spec.family === 'k-pedal')).toBe(true);
  });

  it('rhythm, independence and guitar / bass mechanics are general technique (no key page)', () => {
    for (const fam of ['k-rhythm', 'k-indep', 'g-picking', 'g-fretting', 'b-pluck', 'b-slap']) expect(ALL.filter((d) => d.spec.family === fam).every((d) => keyFacet(d)!.scope === 'neutral')).toBe(true);
  });
});

describe('key facet: the dump for review', () => {
  it('counts per group and the minor items the old tag missed', () => {
    const c: Record<string, number> = {};
    let fixed = 0;
    for (const d of ALL) {
      const f = keyFacet(d)!;
      c[`${f.scope}:${f.group}`] = (c[`${f.scope}:${f.group}`] ?? 0) + 1;
      if (f.group === 'minor' && !(d.tonic ? d.tonic.minor : d.spec.minor)) fixed++;
    }
    console.log('FACET', JSON.stringify(c), 'fixed-minor', fixed);
  });
});
