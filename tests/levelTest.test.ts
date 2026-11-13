import { describe, expect, it } from 'vitest';
import { advance, nextStep, pianoStrands, strandsFor, recordTake, startState, strandPlaces, testStart, type Verdict } from '../src/engine/drills/levelTest';
import { families } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';

const run = (n: number, answer: (i: number) => Verdict) => {
  let s = startState(n);
  const seen: number[] = [];
  while (s.at >= 0) {
    seen.push(s.at);
    s = advance(recordTake(s, answer(s.at)), n);
  }
  return { s, seen };
};

describe('level test sections', () => {
  for (const emph of ['classical', 'jazz', 'both'] as const)
    it(`every step of the ${emph} piano test is a real level that generates in its key`, () => {
      const cat = families('piano');
      for (const st of pianoStrands(emph))
        for (const r of st.rungs) {
          const lv = cat.flatMap((f) => f.levels).find((l) => l.id === r.level);
          expect(lv, r.level).toBeTruthy();
          const d = generate({ ...lv!.specs[0], key: Array.isArray(lv!.keys) && !lv!.keys.includes(r.key) ? lv!.keys[0] : r.key });
          expect(d.notes?.length ?? 1, r.level).toBeGreaterThan(0);
          for (const [fam, v] of Object.entries(r.places)) {
            const f = cat.find((x) => x.id === fam);
            expect(f, fam).toBeTruthy();
            expect(v).toBeLessThanOrEqual(f!.levels.length);
          }
        }
    });

  for (const inst of ['guitar', 'bass', 'drums'] as const)
    it(`every step of the ${inst} test is a real level that generates`, () => {
      const cat = families(inst);
      for (const st of strandsFor(inst, 'both'))
        for (const r of st.rungs) {
          const lv = cat.flatMap((f) => f.levels).find((l) => l.id === r.level);
          expect(lv, r.level).toBeTruthy();
          const d = generate({ ...lv!.specs[0], key: Array.isArray(lv!.keys) && !lv!.keys.includes(r.key) ? lv!.keys[0] : r.key });
          expect(d, r.level).toBeTruthy();
          for (const [fam, v] of Object.entries(r.places)) {
            const f = cat.find((x) => x.id === fam);
            expect(f, `${r.level} → ${fam}`).toBeTruthy();
            expect(v, `${r.level} → ${fam}`).toBeLessThanOrEqual(f!.levels.length);
          }
        }
    });

  it('never stays on one step: a miss moves on, at most one retry after "almost"', () => {
    const { seen } = run(5, () => 'not');
    expect(seen).toEqual([1, 0]);
    const a = run(5, () => 'almost');
    expect(a.seen).toEqual([1, 1]);
    expect(a.s.edge).toBe(1);
  });

  it('climbs fast when clean and bisects after a miss', () => {
    const { s, seen } = run(5, (i) => (i <= 2 ? 'clean' : 'not'));
    expect(seen).toEqual([1, 3, 2]);
    expect(s.lo).toBe(2);
    const top = run(5, () => 'clean');
    expect(top.seen).toEqual([1, 3, 4]);
    expect(top.s.lo).toBe(4);
  });

  it('a section takes at most four takes', () => {
    for (const pat of [['clean', 'almost', 'almost', 'not', 'clean'], ['almost', 'clean', 'almost', 'clean', 'not']] as Verdict[][]) {
      let k = 0;
      const { seen } = run(5, () => pat[k++ % pat.length]);
      expect(seen.length).toBeLessThanOrEqual(4);
    }
  });

  it('places families from the hardest clean step; an almost edge one below', () => {
    const hands = pianoStrands('both')[0];
    const { s } = run(5, (i) => (i <= 2 ? 'clean' : 'not'));
    expect(strandPlaces(hands, s).scales).toBe(5);
    const e = run(5, (i) => (i === 1 ? 'almost' : 'not'));
    expect(strandPlaces(hands, e.s).scales).toBe(3);
    const start = testStart('piano', strandPlaces(hands, s));
    expect(start.scales).toBe(5);
    expect(start.voicings).toBe(1);
  });

  it('nextStep is null once bracketed', () => {
    expect(nextStep({ at: 1, lo: 1, hi: 2, edge: null, takes: 2, retried: [], last: 'not' }, 5)).toBeNull();
  });
});

describe('a course measures its own areas', () => {
  it('the ear course placement has no voice, instrument or creative sections', async () => {
    const { placementSkills } = await import('../src/engine/placement');
    const { COURSE_AREAS } = await import('../src/engine/courses');
    const { domainOf } = await import('../src/engine/rating');
    const ks = placementSkills({ singing: true, areas: COURSE_AREAS.ear });
    expect(ks.length).toBeGreaterThan(5);
    for (const k of ks) expect(['pitch', 'time', 'memory', 'reading']).toContain(k === 'rhythm-reading' ? 'time' : domainOf(k));
    expect(placementSkills({ singing: true }).length).toBeGreaterThan(ks.length);
  });
});
