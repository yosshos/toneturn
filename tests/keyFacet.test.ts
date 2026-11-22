import { describe, expect, it } from 'vitest';
import { families, specDrills } from '../src/engine/drills/plan';
import { drillKeyOf, newItem as blank } from '../src/engine/drills/ladder';
import { FAMILY_FACETS, keyFacet, type FacetGroup } from '../src/engine/drills/keyFacet';
import type { Drill, ItemState } from '../src/engine/drills/types';

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

describe('key of the week', () => {
  it('the first unplayed key in order, then the weakest tried one', async () => {
    const { buildKeyIndex, pickWeekKey, tabDrills, weekOf } = await import('../src/engine/drills/keyIndex');
    const idx = buildKeyIndex(families('piano').filter((f) => f.id === 'scales'), 'fifths-up');
    const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    expect(pickWeekKey(idx, 'major', {}, order)).toBe(0);
    // C played well → the next unplayed key (G)
    const items: Record<string, import('../src/engine/drills/types').ItemState> = {};
    for (const d of tabDrills(idx, 0, 'major')) items[d.itemId] = { itemId: d.itemId, family: d.spec.family, key: 0, hands: d.spec.hands, cleanBpm: d.startBpm * 1.3, goalBpm: d.startBpm, streak: 0, fails: 0, takes: 5, last: new Date().toISOString(), history: [], ewma: { acc: 1 } } as never;
    expect(pickWeekKey(idx, 'major', items, order)).toBe(7);
    expect(weekOf('2026-11-21T10:00:00Z')).toBe('2026-11-16');
  });
});

describe('dynamics as a lens', () => {
  it('a scale through each lens is its own item with the goal the take measures; chords stay as they are', async () => {
    const { withLens } = await import('../src/engine/drills/keyIndex');
    const scale = ALL.find((d) => d.title.en === 'C major · 2 oct · RH')!;
    const c = withLens(scale, 'cresc');
    expect(c.itemId).toBe(`${scale.itemId}:lens-cresc`);
    expect(c.goal.dynamics).toBe('cresc');
    const a = withLens(scale, 'accent4');
    expect(a.notes.filter((n) => n.accent).length).toBeGreaterThan(3);
    expect(withLens(scale, 'staccato').goal.articulation).toBe('staccato');
    expect(withLens(scale, 'none')).toBe(scale);
    const cad = ALL.find((d) => d.spec.family === 'cadences')!;
    expect(withLens(cad, 'cresc')).toBe(cad);
  });
});

describe('the key session ladder (owner 2026-11-22)', () => {
  it('D major past the basics: the scale hands together, then 3rds, triads and 7ths along the whole scale, then a cadence — all in D', async () => {
    const { keyLadder } = await import('../src/engine/drills/keyIndex');
    const { specDrills } = await import('../src/engine/drills/plan');
    const fam = keyLadder(families('piano'), 2, 'major', 3)!;
    const ids = fam.levels.map((l) => l.id.replace(/^key-2-/, ''));
    expect(ids[0]).toBe('scales-3');
    // the spine every session, in order: 3rds, triads, 7ths along the whole scale; a cadence; a closing visit to the 3rds
    expect(ids.filter((i) => ['k-sharm-3', 'k-sharm-7', 'k-sharm-11'].includes(i))).toEqual(['k-sharm-3', 'k-sharm-7', 'k-sharm-11']);
    expect(ids).toContain('cadences-2');
    expect(ids.at(-1)).toBe('k-sharm-3-again');
    // beyond the spine: contrary motion or balance, and Hanon / hand independence in the key
    expect(ids.some((i) => /^(scales-4|scales-11|control-8)$/.test(i))).toBe(true);
    expect(ids.filter((i) => /^(fingers|k-indep|k-keyx|advanced)-/.test(i)).length).toBe(2);
    // the owner's approach licks come after the shapes they lead into
    expect(ids.filter((i) => i.startsWith('k-keylick-')).length).toBe(2);
    expect(ids.findIndex((i) => i.startsWith('k-keylick-'))).toBeGreaterThan(ids.indexOf('k-sharm-11'));
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of fam.levels) for (let k = 0; k < l.specs.length; k++) expect(specDrills(l, k, 'fifths-up').every((d) => (d.tonic ? d.tonic.key : d.spec.key) % 12 === 2)).toBe(true);
    // the harmonised scale is the major one (option 0), not the modes
    expect(fam.levels.find((l) => l.id === 'key-2-k-sharm-3')!.specs.every((s) => (s as { option?: number }).option === 0)).toBe(true);
  });
  it('an advanced player gets block 7ths and drop 2 too; a beginner the one-octave scale', async () => {
    const { keyLadder } = await import('../src/engine/drills/keyIndex');
    const adv = keyLadder(families('piano'), 0, 'major', 5)!.levels.map((l) => l.id);
    expect(adv).toEqual(expect.arrayContaining(['key-0-scales-8', 'key-0-k-cadlib-6']));
    expect(adv.some((i) => /k-sharm-(5|9|13|15)$/.test(i))).toBe(true);
    expect(keyLadder(families('piano'), 0, 'major', 0)!.levels[0].id).toBe('key-0-scales-1');
  });
  it('priority by need: a form played up to its target gives way to one never played; the slowest comes before the faster', async () => {
    const { keyLadder } = await import('../src/engine/drills/keyIndex');
    const { itemTargetBpm } = await import('../src/engine/drills/plan');
    const base = keyLadder(families('piano'), 2, 'major', 4)!;
    const first = base.levels.find((l) => /k-sharm-(5|9|13)$/.test(l.id))!;
    // the first harmonised form is played clean at its target in D: the next session picks another form
    const items: Record<string, ItemState> = {};
    for (let k = 0; k < first.specs.length; k++) for (const d of specDrills(first, k, 'fifths-up')) items[d.itemId] = { ...blank(d), takes: 4, cleanBpm: itemTargetBpm(d), last: '2026-11-20' };
    const next = keyLadder(families('piano'), 2, 'major', 4, items)!.levels.map((l) => l.id);
    expect(next).not.toContain(first.id);
    expect(next.some((i) => /k-sharm-(5|9|13)$/.test(i))).toBe(true);
    // a minor key ladder stays in harmonic minor and has its own spine
    const am = keyLadder(families('piano'), 9, 'minor', 2)!.levels.map((l) => l.id);
    expect(am).toEqual(expect.arrayContaining(['key-9-k-sharm-4', 'key-9-k-sharm-8', 'key-9-k-sharm-12']));
  });
});
