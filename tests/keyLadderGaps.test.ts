// SPEC-KEY-SESSION / SPEC-DAILY-WORKOUT audit gaps (2026-11-23): B2 triad inversions, B4 1-2-3-5 cells, B5 9th
// arpeggios through the scale (piano, guitar, bass), Hanon 17–18 and two voices in one hand in the key, So What and
// Kenny Barron at T6+, triad pairs over the I and the bebop scale in block F, the known lick devices (3 to ♭9 left out
// while open), the week's two visits, the rung just passed, the key page's ceilings. Notes, spelling, 12 keys, wiring.

import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { families, specDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { H_SCALES, hTonic, ladderEvents, spellH } from '../src/engine/drills/harmLadder';
import { justPassed, keyCeilings, keyLadder, keyWeekCoverage, ladderRungs, openKeyRungs, rungIdOf, rungWeekVisits, WEEK_VISITS, type LadderInst } from '../src/engine/drills/keyIndex';
import { keyMatrix } from '../src/engine/drills/keyMatrix';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { drillEvents, drillXp } from '../src/engine/drills/events';
import { barronOffsets, soWhatOffsets } from '../src/engine/drills/chartDrills';
import { LICKS, lickProblems } from '../src/engine/licks';
import { isVerified } from '../src/engine/verifiedContent';
import { familyLevelCount } from '../src/engine/badges';
import { KEYS_LEVEL_DIFF } from '../src/engine/path';
import type { Drill, DrillSpec, ItemState, PlayedNote } from '../src/engine/drills/types';

const C = H_SCALES[0];
const perfect = (d: Drill, bpm = d.startBpm): PlayedNote[] => {
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const on = expTimeMs(d, n.beat, bpm);
    out.push({ pitch: n.pitch, on, off: on + (n.dur * 60000) / bpm - 5, vel: n.accent ? 96 : 72 });
  }
  return out.sort((a, b) => a.on - b.on);
};
const lvl = (inst: LadderInst, id: string) => families(inst).flatMap((f) => f.levels).find((l) => l.id === id)!;
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const pcOf = (name: string) => {
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[name[0]]!;
  const acc = name.slice(1) === '♯' ? 1 : name.slice(1) === '♭' ? -1 : name.slice(1) === '𝄪' ? 2 : name.slice(1) === '𝄫' ? -2 : 0;
  return (((base + acc) % 12) + 12) % 12;
};
void NAMES;

describe('B2, B4, B5: the new steps of the harmonised scale, note for note', () => {
  it('B2 triad inversions in C: CEG, EGC, GCE on every degree (3/4, a degree a bar), down the other way, home on C', () => {
    const evs = ladderEvents(0, C, 'ti', 48);
    expect(evs).toHaveLength(8 * 3 + 7 * 3);
    expect(evs.slice(0, 6).map((e) => e.ps)).toEqual([[48, 52, 55], [52, 55, 60], [55, 60, 64], [50, 53, 57], [53, 57, 62], [57, 62, 65]]);
    // down from the 7th degree: B° 2nd, 1st, root
    expect(evs[24].ps).toEqual([65, 71, 74]);
    expect(evs[evs.length - 1].ps).toEqual([48, 52, 55]);
    for (const e of evs) expect(e.pcs!.every((p) => C.ints.includes(p))).toBe(true);
  });
  it('B4 the 1-2-3-5 cells in C: C-D-E-G, D-E-F-A, E-F-G-B … then turned over (G-E-D-C) down to C', () => {
    const ps = ladderEvents(0, C, 'c4', 60).map((e) => e.ps[0]);
    expect(ps.slice(0, 12)).toEqual([60, 62, 64, 67, 62, 64, 65, 69, 64, 65, 67, 71]);
    // the last up cell lands on degree 14 (two octaves); the first down cell is the one under it, turned over
    expect(ps.slice(40, 48)).toEqual([77, 79, 81, 84, 83, 79, 77, 76]);
    expect(ps.slice(-4)).toEqual([67, 64, 62, 60]);
    expect(ps).toHaveLength(21 * 4);
  });
  it('B5 9th arpeggios in C: C-E-G-B-D, D-F-A-C-E … down from the 7th degree’s chord to C', () => {
    const ps = ladderEvents(0, C, '9a', 60).map((e) => e.ps[0]);
    expect(ps.slice(0, 10)).toEqual([60, 64, 67, 71, 74, 62, 65, 69, 72, 76]);
    expect(ps.slice(-5)).toEqual([74, 71, 67, 64, 60]);
    expect(ps).toHaveLength(7 * 5 + 6 * 5);
  });
  it('every note is spelled by the key (one letter per degree): G♭ major has C♭, F♯ major E♯, B♯ = C sounds the same', () => {
    for (const kind of ['hl-ti', 'hl-c4', 'hl-9a'])
      for (let key = 0; key < 12; key++)
        for (const option of [0, 1, 5, 7, 8]) {
          const sc = H_SCALES[option];
          const names = spellH(hTonic(key, sc), sc.ints);
          const d = generate({ family: 'k-sharm', kind, key, hands: 'R', option });
          for (const n of d.notes) {
            expect(n.spell, `${d.itemId} ${n.pitch}`).toBeDefined();
            expect(names).toContain(n.spell);
            expect(pcOf(n.spell!), `${d.itemId} ${n.spell}`).toBe(((n.pitch % 12) + 12) % 12);
          }
        }
    const gb = generate({ family: 'k-sharm', kind: 'hl-c4', key: 6, hands: 'R', option: 0 });
    expect(gb.notes.some((n) => n.spell === 'C♭')).toBe(true);
    expect(gb.notes.some((n) => n.spell === 'B')).toBe(false);
    const fs = spellH(hTonic(6, H_SCALES[3]), H_SCALES[3].ints); // G♭/F♯ lydian: spelled with the fewer accidentals
    expect(fs.length).toBe(7);
    expect(pcOf('B♯')).toBe(pcOf('C'));
  });
});

describe('the new levels: 12 keys, rubato first then the tempo ladder, a perfect take clean, XP and a skill', () => {
  const PIANO = ['k-sharm-43', 'k-sharm-44', 'k-sharm-45', 'k-sharm-46', 'k-sharm-47', 'k-sharm-48'];
  it('piano k-sharm 43–48', () => {
    for (const id of PIANO) {
      const l = lvl('piano', id);
      expect(l.keys, id).toBe('major');
      expect(KEYS_LEVEL_DIFF[id], id).toBeGreaterThan(1100);
      for (const sp of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(hasRubato(d), d.itemId).toBe(true);
          // timed: the run gives a count-in, the click on every beat and the now-cue (no click override, not untimed)
          expect(d.untimed, d.itemId).toBeFalsy();
          expect(d.click === undefined || d.click === 'all', d.itemId).toBe(true);
          const m = analyzeTake(d, d.startBpm, perfect(d));
          expect(m.verdict, d.itemId).toBe('clean');
        }
      const d = generate({ ...l.specs[0], key: 3 } as DrillSpec);
      const m = analyzeTake(d, d.startBpm, perfect(d));
      expect(drillXp(m)).toBeGreaterThan(0);
      expect(drillEvents(d, m, '2026-11-23T10:00:00.000Z', 's', 0).flatMap((e) => e.tags ?? []).length, id).toBeGreaterThan(0);
    }
    expect(familyLevelCount('k-sharm')).toBe(48);
  }, 180000);
  it('guitar g-harm 14–16 inside the neck, bass b-chord 17–18 on the bass, every key', () => {
    for (const id of ['g-harm-14', 'g-harm-15', 'g-harm-16', 'b-chord-17', 'b-chord-18']) {
      const l = lvl(id.startsWith('g-') ? 'guitar' : 'bass', id);
      expect(l, id).toBeTruthy();
      for (const sp of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(d.notes.length, d.itemId).toBeGreaterThan(20);
          expect(hasRubato(d), d.itemId).toBe(true);
          for (const n of d.notes) expect(n.fret! >= 0 && n.fret! <= 22, `${d.itemId} ${n.fret}`).toBe(true);
        }
    }
    expect(familyLevelCount('g-harm')).toBe(16);
    // the guitar's inversions are block triads on 3-string sets in 3/4; the cells and 9ths single notes in position
    const ti = generate({ family: 'g-harm', kind: 'hl-ti', key: 2, hands: 'R', instrument: 'guitar', option: 0 });
    expect(ti.meter).toBe(3);
    expect(ti.goal.chordSets!.length).toBe(45);
  }, 180000);
});

describe('wired into the ladder of every key (piano, guitar, bass)', () => {
  const ids = (inst: LadderInst, g: 'major' | 'minor', tier: number, jazz = false) => openKeyRungs(families(inst), 5, g, tier, { jazz, instrument: inst }).built.map((b) => rungIdOf(b.rung));
  it('piano major: B4 at T3, B2 at T4, B5 at T5; Hanon 17 / 18 at T5 / T6; two voices in one hand from T2', () => {
    expect(ids('piano', 'major', 2)).toEqual(expect.arrayContaining(['k-indep-3']));
    expect(ids('piano', 'major', 2)).not.toContain('k-sharm-45');
    expect(ids('piano', 'major', 3)).toContain('k-sharm-45');
    expect(ids('piano', 'major', 3)).not.toContain('k-sharm-43');
    expect(ids('piano', 'major', 4)).toEqual(expect.arrayContaining(['k-sharm-43', 'k-sharm-45']));
    expect(ids('piano', 'major', 5)).toEqual(expect.arrayContaining(['k-sharm-47', 'fingers-17']));
    expect(ids('piano', 'major', 5)).not.toContain('fingers-18');
    expect(ids('piano', 'major', 6)).toContain('fingers-18');
    expect(ids('piano', 'minor', 5)).toEqual(expect.arrayContaining(['k-sharm-44', 'k-sharm-46', 'k-sharm-48']));
  });
  it('E at T6+: So What (both variations) and Kenny Barron on the key’s ii–V–I; major rows only', () => {
    expect(ids('piano', 'major', 5)).not.toContain('k-cadlib-23');
    expect(ids('piano', 'major', 6)).toEqual(expect.arrayContaining(['k-cadlib-23', 'k-cadlib-24', 'k-cadlib-26']));
    expect(ids('piano', 'minor', 7)).not.toContain('k-cadlib-23');
    const b = openKeyRungs(families('piano'), 5, 'major', 6, {}).built.find((x) => x.rung.id === 'k-cadlib-26')!;
    expect(b.lvl.keys).toEqual([5]);
    expect(b.lvl.specs.every((s) => /cad:ii-v-i~/.test(s.kind))).toBe(true);
    // the canonical stacks: So What = three perfect 4ths and a major 3rd (D-G-C-F-A on Dm7); Barron = LH 1-5-9, RH ♭3-♭7-11
    expect(soWhatOffsets({ iv: [0, 3, 7, 10] }, 1)).toEqual([0, 5, 10, 15, 19]);
    expect(barronOffsets({ iv: [0, 3, 7, 10] })).toEqual([0, 7, 14, 15, 22, 29]);
    const d = specDrills(b.lvl, 0, 'fifths-up')[0];
    expect(d.notes.length).toBeGreaterThan(0);
  });
  it('F: triad pairs over the I and the bebop dominant on the V (a jazz focus from T3, everyone from T5)', () => {
    expect(ids('piano', 'major', 4)).not.toContain('k-tpair-1');
    expect(ids('piano', 'major', 3, true)).toEqual(expect.arrayContaining(['k-tpair-1', 'k-modes-3']));
    expect(ids('piano', 'major', 5)).toEqual(expect.arrayContaining(['k-tpair-1', 'k-modes-3']));
    expect(ids('piano', 'major', 6)).toContain('k-tpair-2');
    const { built } = openKeyRungs(families('piano'), 5, 'major', 6, {});
    const bebop = built.find((x) => x.rung.id === 'k-modes-3')!;
    expect(bebop.lvl.keys).toEqual([0]); // F major: the bebop dominant on C
    const tp = built.find((x) => x.rung.id === 'k-tpair-1')!;
    expect(tp.lvl.keys).toEqual([5]);
    expect(tp.lvl.specs.length).toBeGreaterThan(0);
    expect(ids('guitar', 'major', 5)).toEqual(expect.arrayContaining(['g-tpair-1', 'g-scales-21']));
    expect(ids('bass', 'major', 5)).toEqual(expect.arrayContaining(['b-tpair-1']));
  });
  it('guitar and bass get the same B rungs', () => {
    expect(ids('guitar', 'major', 5)).toEqual(expect.arrayContaining(['g-harm-14', 'g-harm-15', 'g-harm-16']));
    expect(ids('guitar', 'minor', 5)).toEqual(expect.arrayContaining(['g-harm-14', 'g-harm-15', 'g-harm-16']));
    expect(ids('bass', 'major', 5)).toEqual(expect.arrayContaining(['b-chord-17', 'b-chord-18']));
    expect(ids('bass', 'minor', 5)).toEqual(expect.arrayContaining(['b-chord-17', 'b-chord-18']));
    // the minor rows pick the harmonic-minor option
    const m = openKeyRungs(families('guitar'), 9, 'minor', 5, { instrument: 'guitar' }).built.find((x) => x.rung.id === 'g-harm-15')!;
    expect(m.lvl.specs.map((s) => (s as { option?: number }).option)).toEqual([7]);
  });
  it('every rung of the ladders builds in every key (no empty pick), and the matrix holds the new cells', () => {
    for (const inst of ['piano', 'guitar', 'bass'] as const)
      for (const g of ['major', 'minor'] as const) {
        const want = ladderRungs(g, inst).filter((r) => r.min <= 7);
        for (let root = 0; root < 12; root++) {
          const got = new Set(openKeyRungs(families(inst), root, g, 7, { jazz: true, instrument: inst }).built.map((b) => rungIdOf(b.rung)));
          for (const r of want) if (r.max === undefined) expect(got.has(rungIdOf(r)), `${inst} ${g} ${root} ${rungIdOf(r)}`).toBe(true);
        }
      }
    const cells = keyMatrix(families('piano'), 6, {}, { jazz: true });
    for (const r of ['k-sharm-43', 'k-sharm-45', 'k-sharm-47', 'k-cadlib-23', 'k-tpair-1', 'k-modes-3']) expect(cells.filter((c) => c.group === 'major' && c.rung === r)).toHaveLength(12);
  }, 180000);
});

describe('the lick library: the known devices (SPEC-DAILY-WORKOUT §6.4)', () => {
  it('the 1-2-3-5 cell, the pentatonic a 5th above V, the half step up into the altered — valid lines', () => {
    for (const id of ['dev-1235', 'dev-penta5', 'dev-alt-up']) {
      const l = LICKS.find((x) => x.id === id)!;
      expect(l, id).toBeTruthy();
      expect(lickProblems(l), id).toEqual([]);
    }
    // the 1-2-3-5 cell from each chord's root
    expect(LICKS.find((x) => x.id === 'dev-1235')!.notes.map((n) => n[0])).toEqual([2, 4, 5, 9, 7, 9, 11, 14, 12, 14, 16, 19]);
    // over G7alt: A♭ melodic minor (a half step above G)
    expect(new Set(LICKS.find((x) => x.id === 'dev-alt-up')!.notes.slice(0, 7).map((n) => n[0] % 12))).toEqual(new Set([8, 10, 11, 1, 3, 5, 7]));
    // over G7: D minor pentatonic (a 5th above G)
    expect(LICKS.find((x) => x.id === 'dev-penta5')!.notes.slice(0, 8).every((n) => [2, 5, 7, 9, 0].includes(n[0] % 12))).toBe(true);
  });
  it('3 to ♭9 stays out while docs/BARRY-HARRIS-THEORY.md lists it open', () => {
    expect(isVerified('item:hl-3b9')).toBe(false);
    expect(LICKS.some((l) => /3b9|3-b9|3-to-b9/.test(l.id))).toBe(false);
  });
});

describe('the key session: the week, the rung just passed, the ceilings (SPEC-KEY-SESSION §1c, §2, §3)', () => {
  const fams = families('piano');
  const st = (itemId: string, o: Partial<ItemState>): ItemState => ({ itemId, family: 'k-sharm', key: 0, hands: 'R', cleanBpm: 0, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '', history: [], ...o }) as ItemState;
  const rung = (id: string) => openKeyRungs(fams, 0, 'major', 3, {}).built.find((b) => b.rung.id === id)!.lvl;
  const ids = (l: ReturnType<typeof rung>) => l.specs.flatMap((_, k) => specDrills(l, k, 'fifths-up'));
  it('visits: distinct days this week; the coverage lists the rungs short of two', () => {
    const l = rung('k-sharm-7');
    const items: Record<string, ItemState> = {};
    for (const d of ids(l)) items[d.itemId] = st(d.itemId, { last: '2026-11-25T09:00:00.000Z', history: [{ at: '2026-11-23T09:00:00.000Z', bpm: 60, cv: 0 }, { at: '2026-11-16T09:00:00.000Z', bpm: 55, cv: 0 }] });
    expect(rungWeekVisits(l, items, '2026-11-26T12:00:00.000Z')).toBe(2);
    expect(rungWeekVisits(l, items, '2026-12-02T12:00:00.000Z')).toBe(0);
    const cov = keyWeekCoverage(fams, 0, 'major', 3, items, {}, '2026-11-26T12:00:00.000Z');
    expect(cov.done).toBe(1);
    expect(cov.open).toBe(cov.short.length + 1);
    expect(cov.short.some((r) => r.rung.id === 'k-sharm-7' && !r.rung.tag)).toBe(false);
    expect(WEEK_VISITS).toBe(2);
  });
  it('a rung played below target and visited twice this week yields to one visited less', () => {
    const a = rung('k-sharm-3');
    const b = rung('k-sharm-7');
    const items: Record<string, ItemState> = {};
    // both played below target; a was visited twice this week and is further below its target
    for (const d of ids(a)) items[d.itemId] = st(d.itemId, { cleanBpm: 40, last: '2026-11-25T09:00:00.000Z', history: [{ at: '2026-11-24T09:00:00.000Z', bpm: 40, cv: 0 }] });
    for (const d of ids(b)) items[d.itemId] = st(d.itemId, { cleanBpm: 70, last: '2026-11-20T09:00:00.000Z', history: [{ at: '2026-11-20T09:00:00.000Z', bpm: 70, cv: 0 }] });
    // every other open rung was just passed today (so out of the pick): only a and b compete for one place
    for (const x of openKeyRungs(fams, 0, 'major', 3, {}).built)
      if (x.lvl.id !== a.id && x.lvl.id !== b.id) for (const d of ids(x.lvl)) items[d.itemId] = st(d.itemId, { cleanBpm: 999, last: '2026-11-26T09:00:00' });
    const lad = keyLadder(fams, 0, 'major', 3, items, { rungs: 1, now: '2026-11-26T12:00:00' })!;
    // a is further below its target, but it was visited twice this week: b (once, last week) comes first
    expect(lad.levels.map((l) => l.id)).toContain(b.id);
    expect(lad.levels.map((l) => l.id)).not.toContain(a.id);
    // next week a is short again and, further below its target, comes first
    for (const d of ids(b)) items[d.itemId] = { ...items[d.itemId], history: [{ at: '2026-11-30T09:00:00', bpm: 70, cv: 0 }, { at: '2026-12-01T09:00:00', bpm: 70, cv: 0 }], last: '2026-12-01T09:00:00' };
    const next = keyLadder(fams, 0, 'major', 3, items, { rungs: 1, now: '2026-12-02T12:00:00' })!;
    expect(next.levels.map((l) => l.id)).toContain(a.id);
  });
  it('the rung just passed (at its target today) is not picked again; tomorrow it may be', () => {
    const l = rung('k-sharm-3');
    const items: Record<string, ItemState> = {};
    for (const d of ids(l)) items[d.itemId] = st(d.itemId, { cleanBpm: 400, last: '2026-11-23T09:00:00', history: [{ at: '2026-11-23T09:00:00', bpm: 400, cv: 0 }] });
    expect(justPassed(l, items, '2026-11-23')).toBe(true);
    expect(justPassed(l, items, '2026-11-24')).toBe(false);
    const today = keyLadder(fams, 0, 'major', 3, items, { now: '2026-11-23T12:00:00' })!;
    expect(today.levels.some((x) => x.id === l.id || x.id === `${l.id}-again`)).toBe(false);
    // a rung at its ceiling for now (the limit rule, today) counts as passed for today too
    const l2 = rung('k-sharm-7');
    const items2: Record<string, ItemState> = {};
    for (const d of ids(l2)) items2[d.itemId] = st(d.itemId, { cleanBpm: 70, last: '2026-11-23T09:00:00', ceiling: { bpm: 70, until: '2026-11-26' } });
    expect(justPassed(l2, items2, '2026-11-23')).toBe(true);
  });
  it('the key page’s ceilings: each rung at its limit, its ceiling and target, in teaching order', () => {
    const l = rung('k-sharm-7');
    const items: Record<string, ItemState> = {};
    for (const d of ids(l)) items[d.itemId] = st(d.itemId, { cleanBpm: 72, last: '2026-11-23T09:00:00', ceiling: { bpm: 72, until: '2026-11-26' } });
    const cs = keyCeilings(fams, 0, 'major', 3, items);
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ rung: 'k-sharm-7', bpm: 72 });
    expect(cs[0].target).toBeGreaterThan(72);
    // beaten since (a faster clean take): no longer a ceiling
    for (const d of ids(l)) items[d.itemId] = { ...items[d.itemId], cleanBpm: 80 };
    expect(keyCeilings(fams, 0, 'major', 3, items)).toHaveLength(0);
  });
});
