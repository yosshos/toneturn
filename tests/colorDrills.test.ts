// HARMONY-REHARM performed (colorDrills.ts): every new level in all 12 keys, playable ranges, the held note on top,
// rubato first, the VL / chord-set / free-choice graders, counts, path places.
import { describe, expect, it } from 'vitest';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { hasRubato } from '../src/engine/drills/rubato';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { gradeHeldChoices } from '../src/engine/drills/ctFreeAnalyze';
import { COLOR_LEVEL_DIFF, COLOR_LEVEL_IDS, CT_ROWS, GCOL_ROWS, GCT_ROWS, MD_ROWS, ORG_ROWS, RH_ROWS, BC_ROWS, heldOf } from '../src/engine/drills/colorDrills';
import { stepCatalogue, PATH_CAP } from '../src/engine/path';
import { FIXED_KEY_LEVELS } from '../src/engine/drills/keys12';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const CAT = catalog();
const GCAT = guitarCatalog();
const allLevels: LevelDef[] = [...CAT.flatMap((f) => f.levels), ...GCAT.flatMap((f) => f.levels)];
const lv = (id: string): LevelDef => allLevels.find((l) => l.id === id)!;
const pc = (n: number) => ((n % 12) + 12) % 12;

describe('colour harmony families: counts and wiring', () => {
  it('keys, guitar and bass families have the planned levels', () => {
    expect(CAT.find((f) => f.id === 'k-ctone')!.levels).toHaveLength(CT_ROWS.length);
    expect(CAT.find((f) => f.id === 'k-mediant')!.levels).toHaveLength(MD_ROWS.length);
    expect(CAT.find((f) => f.id === 'k-organ')!.levels).toHaveLength(ORG_ROWS.length);
    expect(CAT.find((f) => f.id === 'k-reharm')!.levels).toHaveLength(10 + RH_ROWS.length);
    expect(GCAT.find((f) => f.id === 'g-ctone')!.levels).toHaveLength(GCT_ROWS.length);
    expect(GCAT.find((f) => f.id === 'g-color')!.levels).toHaveLength(GCOL_ROWS.length);
    // 12 colour levels + the open-string pedal ladder (HARMONY-REHARM still open, 3 levels)
    expect(GCAT.find((f) => f.id === 'g-color')!.levels.length).toBeLessThanOrEqual(16); // 16: drop D (the low open D pedal)
    expect(GCAT.find((f) => f.id === 'b-counter')!.levels).toHaveLength(BC_ROWS.length);
    expect(CT_ROWS.length + MD_ROWS.length + ORG_ROWS.length + RH_ROWS.length).toBe(36); // + k-reharm 23–24 (AUDIT-DEPTH-3 #2: each device under the melody)
  });
  it('k-reharm 9 and 10 run in all 12 keys now', () => {
    for (const id of ['k-reharm-9', 'k-reharm-10']) expect((lv(id).keys as number[]).length, id).toBe(12);
  });
  it('every new level sits on the path at its rating, under PATH_CAP', () => {
    const steps = stepCatalogue();
    for (const [id, r] of Object.entries(COLOR_LEVEL_DIFF)) {
      const st = steps.find((s) => s.id === `tech:${id}`);
      expect(st, id).toBeDefined();
      expect(st!.difficulty, id).toBe(r);
      expect(r).toBeLessThanOrEqual(PATH_CAP);
      expect(r).toBeGreaterThanOrEqual(1050);
    }
    // the existing k-reharm levels keep their places
    expect(steps.find((s) => s.id === 'tech:k-reharm-1')!.difficulty).toBe(1120);
    expect(steps.find((s) => s.id === 'tech:k-reharm-10')!.difficulty).toBe(1750);
  });
});

describe('every new item in all 12 keys', () => {
  const ids = [...COLOR_LEVEL_IDS.keys, ...COLOR_LEVEL_IDS.guitar, ...COLOR_LEVEL_IDS.bass];
  for (const id of ids)
    it(id, () => {
      const l = lv(id);
      expect(l, id).toBeDefined();
      const ds = levelDrills(l, 'fifths-up');
      // the open-string pedal keeps the keys whose open strings carry it (keys12.ts FIXED_KEY_LEVELS)
      expect(new Set(ds.map((d) => pc(d.spec.key))).size, id).toBe(FIXED_KEY_LEVELS.includes(id) ? (l.keys as number[]).length : 12);
      expect(new Set(ds.map((d) => d.itemId)).size, id).toBe(ds.length);
      for (const d of ds) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(0);
        expect(d.title.en.length).toBeGreaterThan(0);
        expect(/[֐-׿]/.test(d.title.he), d.itemId).toBe(true);
        for (const n of d.notes) {
          if (n.fret !== undefined) {
            expect(n.fret >= 0 && n.fret <= 24, `${d.itemId} fret ${n.fret}`).toBe(true);
          } else expect(n.pitch >= 28 && n.pitch <= 96, `${d.itemId} ${n.pitch}`).toBe(true);
        }
        // the key is in the item id (key mastery)
        expect(d.itemId).toContain(`:${pc(d.spec.key)}:`);
      }
    });
});

describe('one note, many chords (k-ctone)', () => {
  it('the held note is the top note of every voicing (VL levels) in every key', () => {
    for (const id of ['k-ctone-1', 'k-ctone-2', 'k-ctone-3', 'k-ctone-4', 'k-ctone-5'])
      for (const d of levelDrills(lv(id), 'fifths-up')) {
        const H = heldOf(d.spec.key);
        const beats = [...new Set(d.notes.map((n) => n.beat))];
        for (const b of beats) {
          const at = d.notes.filter((n) => Math.abs(n.beat - b) < 1e-6);
          expect(pc(Math.max(...at.map((n) => n.pitch))), `${d.itemId} @${b}`).toBe(H);
        }
      }
  });
  it('the triad / 7th / drop-2 levels are graded by the voice-leading grader; the free level by the held-choice grader', () => {
    for (const id of ['k-ctone-1', 'k-ctone-2', 'k-ctone-3']) expect(generate({ ...lv(id).specs[0], key: 0 }).goal.vl, id).toBeDefined();
    const free = generate({ ...lv('k-ctone-7').specs[0], key: 0 });
    expect(free.goal.ct).toBeDefined();
    expect(free.goal.ct!.count).toBe(8);
  });
  it('the triads in C under F: F, Fm, Dm, D♭, B♭, B♭m', () => {
    const d = generate({ family: 'k-ctone', kind: 'ct-tri', key: 0, hands: 'R', option: 0 });
    expect(d.chart!.join(' ')).toMatch(/F/);
    expect(new Set(d.goal.vl!.chords.map((c) => c.name))).toEqual(new Set(['F', 'Fm', 'Dm', 'D♭', 'B♭', 'B♭m']));
  });
  it('the tension level spells E♯ where F is a ♯11 or ♯9', () => {
    const d = generate({ family: 'k-ctone', kind: 'ct-tens', key: 0, hands: 'RL', option: 1 });
    expect(d.title.en).toContain('E♯ = ♯11 of B7♯11');
    expect(d.title.en).toContain('E♯ = ♯9 of D7♯9');
  });
  it('the model of the free level passes its own grader, and a repeat / clash / wrong top fails', () => {
    const d = generate({ family: 'k-ctone', kind: 'ct-free', key: 0, hands: 'RL', option: 0 });
    const H = d.goal.ct!.held;
    const by = new Map<number, number[]>();
    for (const n of d.notes) by.set(n.beat, [...(by.get(n.beat) ?? []), n.pitch]);
    const voicings = [...by.values()];
    expect(gradeHeldChoices(voicings, H).map((s) => s.kind)).toEqual(Array(8).fill('ok'));
    // played as a rubato take: clean
    const played: PlayedNote[] = voicings.flatMap((v, k) => v.map((p) => ({ pitch: p, on: 1000 + k * 1500, off: 1000 + k * 1500 + 1200, vel: 80 })));
    expect(analyzeTake(d, 60, played, undefined, { rubato: true }).verdict).toBe('clean');
    // the same chord twice
    expect(gradeHeldChoices([voicings[0], voicings[0]], H)[1].kind).toBe('repeat');
    // Cmaj7 under F: F is the 11th of a major chord (an avoid note)
    expect(gradeHeldChoices([[48, 64, 67, 71, 77]], H)[0].kind).toBe('clash');
    // F not on top
    expect(gradeHeldChoices([[53, 69, 72, 76]], H)[0].kind).toBe('top');
  });
  it('the counter-line keeps the tonic on top while the bass walks down by half steps', () => {
    const d = generate({ family: 'k-ctone', kind: 'ct-counter', key: 0, hands: 'RL', option: 0 });
    expect(d.chart!.join(' ')).toBe('C Cmaj7/B C7/B♭ Am7 A♭maj7 G7sus4 C');
    const beats = [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b);
    const tops = beats.map((b) => Math.max(...d.notes.filter((n) => n.beat === b).map((n) => n.pitch)));
    const lows = beats.map((b) => Math.min(...d.notes.filter((n) => n.beat === b).map((n) => n.pitch)));
    expect(new Set(tops.map(pc))).toEqual(new Set([0]));
    expect(lows.slice(0, 6).map(pc)).toEqual([0, 11, 10, 9, 8, 7]);
  });
});

describe('mediants, colour reharm, organ', () => {
  it('mediant triads keep the common tone in the same voice (the model path)', () => {
    const d = generate({ family: 'k-mediant', kind: 'md-tri', key: 0, hands: 'R', option: 0 });
    const beats = [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b);
    const v = beats.map((b) => d.notes.filter((n) => n.beat === b).map((n) => n.pitch));
    // C → A♭: C stays; A♭ → C: C stays; C → E: E stays
    expect(v[0].filter((p) => v[1].includes(p)).map(pc)).toContain(0);
    expect(v[2].filter((p) => v[3].includes(p)).map(pc)).toContain(4);
  });
  it('the Coltrane link holds the 3rd of I through I, ♭VImaj7♯5 and III', () => {
    const d = generate({ family: 'k-mediant', kind: 'md-coltrane', key: 0, hands: 'RL', option: 0 });
    expect(d.chart).toEqual(['Cmaj7', 'A♭maj7♯5', 'Emaj7', 'A♭maj7♯5', 'Cmaj7']);
    for (const b of [0, 4, 8]) expect(pc(Math.max(...d.notes.filter((n) => n.beat === b).map((n) => n.pitch)))).toBe(4);
  });
  it('modal interchange: iv under the held tonic, iiø7 – V7♭9, borrowing in minor', () => {
    const a = generate({ family: 'k-reharm', kind: 'rh-mi', key: 0, hands: 'RL', option: 0 });
    expect(a.chart).toEqual(['C', 'F', 'Fm6', 'C']);
    for (const b of [0, 4, 8, 12]) expect(pc(Math.max(...a.notes.filter((n) => n.beat === b).map((n) => n.pitch)))).toBe(0);
    const ii = generate({ family: 'k-reharm', kind: 'rh-mi', key: 0, hands: 'RL', option: 4 });
    expect(ii.chart!.join(' | ')).toContain('Dm7♭5 G7♭9');
    const m = generate({ family: 'k-reharm', kind: 'rh-mi', key: 0, hands: 'RL', option: 7 });
    expect(m.chart).toContain('F7');
    expect(m.keySig).toBe('Eb');
  });
  it('the new k-reharm items, mediants and the counter-line start in free time; organ items play on the tonewheel organ', () => {
    for (const id of COLOR_LEVEL_IDS.keys) {
      const d = generate({ ...lv(id).specs[0], key: 0 });
      expect(hasRubato(d), id).toBe(true);
      if (id.startsWith('k-organ')) expect(d.sound).toBe('tonewheel');
    }
  });
  it('planing under a melody: the same shape under every melody note', () => {
    const d = generate({ family: 'k-reharm', kind: 'rh-planemel', key: 0, hands: 'RL', option: 0 });
    const beats = [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b);
    const shapes = beats.map((b) => {
      const ps = d.notes.filter((n) => n.beat === b).map((n) => n.pitch).sort((x, y) => x - y);
      return ps.map((p) => p - ps[ps.length - 1]).join(',');
    });
    expect(new Set(shapes).size).toBe(1);
  });
  it('the bass counter-line walks C B B♭ A A♭ G and renames each chord', () => {
    const d = generate({ family: 'b-counter', kind: 'bc-counter', key: 0, hands: 'R', instrument: 'bass', option: 0 });
    expect(d.notes.slice(0, 6).map((n) => pc(n.pitch))).toEqual([0, 11, 10, 9, 8, 7]);
    expect(d.chart!.join(' ')).toContain('Cmaj7/B');
  });
});

/** Play the written notes back exactly (a clean MIDI take at the drill's start tempo). */
export function perfectTake(d: Drill, bpm = d.startBpm): PlayedNote[] {
  return d.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: expTimeMs(d, n.beat + n.dur, bpm) - 20, vel: 80 }));
}
describe('the written model passes', () => {
  it('a clean take of each keys item (first spec, C) is clean', () => {
    for (const id of COLOR_LEVEL_IDS.keys) {
      const d = generate({ ...lv(id).specs[0], key: 0 });
      if (d.goal.ct) continue;
      const m = analyzeTake(d, d.startBpm, perfectTake(d));
      expect(m.verdict, `${id}: ${m.why.en}`).not.toBe('not');
    }
  });
});
