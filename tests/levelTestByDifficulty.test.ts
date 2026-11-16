// The level test marks levels done by placement / difficulty, not by number (0.97 leftovers): levels put in front of
// their family later (b-walk 19–21, g-scales 13–15) are ✓ when a harder rung is passed.
import { describe, expect, it } from 'vitest';
import { guitarStrands, bassStrands, pianoStrands, testedLevelIds, strandsFor } from '../src/engine/drills/levelTest';
import { techDifficulty, techLevel, withLadderFacts } from '../src/engine/ladderFacts';
import type { PathFacts } from '../src/engine/path';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { catalog } from '../src/engine/drills/generate';
import type { FamilyId } from '../src/engine/drills/types';

const AT = '2026-11-16T10:00:00.000Z';
const testedBy = (start: Partial<Record<FamilyId, number>>, families: string[]) =>
  withLadderFacts({} as PathFacts, { families, items: {}, order: 'fifths-up', start, vocalPassed: [], at: AT }).tests ?? {};
const fam = (id: string) => [...catalog(), ...guitarCatalog()].find((f) => f.id === id)!;

describe('testedLevelIds (pure)', () => {
  const lv = [
    { id: 'a-1', level: 1 },
    { id: 'a-2', level: 2 },
    { id: 'a-3', level: 3 },
    { id: 'a-4', level: 4 }, // put in front later: easier than a-2
    { id: 'a-5', level: 5 }, // harder than everything
  ];
  const d: Record<string, number> = { 'a-1': 800, 'a-2': 900, 'a-3': 1000, 'a-4': 850, 'a-5': 1200 };
  const diff = (id: string) => d[id];
  it('no start, or start 1: nothing', () => {
    expect([...testedLevelIds(lv, undefined, diff)]).toEqual([]);
    expect([...testedLevelIds(lv, 1, diff)]).toEqual([]);
  });
  it('below the start by number, and every level at or below the hardest of those', () => {
    expect([...testedLevelIds(lv, 3, diff)].sort()).toEqual(['a-1', 'a-2', 'a-4']);
    expect([...testedLevelIds(lv, 2, diff)].sort()).toEqual(['a-1']);
    expect([...testedLevelIds(lv, 4, diff)].sort()).toEqual(['a-1', 'a-2', 'a-3', 'a-4']);
  });
  it('never fewer than the number rule (a ✓ given before stays)', () => {
    const odd: Record<string, number> = { ...d, 'a-2': 700 }; // a level moved later in difficulty than its number
    const s = testedLevelIds(lv, 3, (id) => odd[id]);
    expect(s.has('a-1') && s.has('a-2')).toBe(true);
  });
  it('a level without a rating is only marked by number', () => {
    expect([...testedLevelIds(lv, 3, (id) => (id === 'a-4' ? undefined : d[id]))].sort()).toEqual(['a-1', 'a-2']);
  });
});

describe('the path marks the levels put in front', () => {
  it('b-walk 19–21 (placed early) are ✓ once a harder walking rung is passed', () => {
    expect(techDifficulty('b-walk-19')!).toBeLessThan(techDifficulty('b-walk-11')!);
    const t = testedBy({ 'b-walk': 12 }, ['b-walk']);
    for (const n of [1, 11, 19, 21]) expect(t[`tech:b-walk-${n}`], `b-walk-${n}`).toBe(AT);
    expect(t['tech:b-walk-12']).toBeUndefined();
    expect(t['tech:b-walk-20']).toBeUndefined(); // ~1480: above b-walk 11
    expect(testedBy({ 'b-walk': 15 }, ['b-walk'])['tech:b-walk-20']).toBe(AT);
    // b-walk 21 (the first blues line, ~985) after the 5th rung; 19 (~1350) not yet.
    const lo = testedBy({ 'b-walk': 6 }, ['b-walk']);
    expect(lo['tech:b-walk-21']).toBe(AT);
    expect(lo['tech:b-walk-19']).toBeUndefined();
  });
  it('g-scales 13–15 (grades 5–7) are ✓ by the grade-7 picking rung; only 13 by the grade-5 scale rung', () => {
    const hi = testedBy({ 'g-scales': 8 }, ['g-scales']);
    for (const n of [13, 14, 15]) expect(hi[`tech:g-scales-${n}`], `g-scales-${n}`).toBe(AT);
    const lo = testedBy({ 'g-scales': 6 }, ['g-scales']);
    expect(lo['tech:g-scales-13']).toBe(AT);
    expect(lo['tech:g-scales-14']).toBeUndefined();
    expect(lo['tech:g-scales-15']).toBeUndefined();
  });
  it('the old number rule still holds (levels below the start)', () => {
    const t = testedBy({ scales: 8 }, ['scales']);
    for (let n = 1; n < 8; n++) expect(t[`tech:scales-${n}`], `scales-${n}`).toBe(AT);
  });
});

describe('the guitar test has the modes in position', () => {
  it('g-scales 15 is a hands rung, between the grade-5 scales and the grade-7 picking, and proves itself and 13–14', () => {
    const hands = guitarStrands().find((s) => s.id === 'hands')!;
    const i = hands.rungs.findIndex((r) => r.level === 'g-scales-15');
    expect(i).toBeGreaterThan(hands.rungs.findIndex((r) => r.level === 'g-scales-5'));
    expect(i).toBeLessThan(hands.rungs.findIndex((r) => r.level === 'g-picking-6'));
    const t = testedLevelIds(fam('g-scales').levels, hands.rungs[i].places['g-scales'], techDifficulty);
    for (const n of [13, 14, 15]) expect(t.has(`g-scales-${n}`), `g-scales-${n}`).toBe(true);
    expect(t.has('g-scales-7')).toBe(false); // grade 8
    expect(strandsFor('guitar', 'both').find((s) => s.id === 'hands')!.rungs.some((r) => r.level === 'g-scales-15')).toBe(true);
  });
  it('every rung of guitar and bass proves its own level when it names its family', () => {
    const bad: string[] = [];
    for (const st of [...guitarStrands(), ...bassStrands()])
      for (const r of st.rungs) {
        const lv = techLevel(r.level);
        if (!lv) continue;
        const famId = r.level.replace(/-\d+$/, '') as FamilyId;
        const start = r.places[famId];
        if (start === undefined) continue;
        if (!testedLevelIds(fam(famId).levels, start, techDifficulty).has(r.level)) bad.push(`${r.level} (start ${start})`);
      }
    expect(bad).toEqual([]);
  });
  it('the keys reading rung k-read 10 proves k-read 10 (k-read runs to 15 since 0.97)', () => {
    const rd = pianoStrands('both').find((s) => s.id === 'reading')!.rungs.find((r) => r.level === 'k-read-10')!;
    expect(rd.places['k-read']).toBe(11);
  });
});
