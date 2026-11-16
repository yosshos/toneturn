// The owner's rule (all-12-keys): every key-relative family on keys, guitar and bass runs through all 12 keys, the
// listed keys first (saved item ids stay), and every item in every key fits its instrument (4-string bass frets 0–21,
// upright to the 24th place, guitar 0–22, the piano A0–C8). Kept keys are named on purpose (keys12.ts).
import { describe, expect, it } from 'vitest';
import { catalog, type FamilyDef, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills, levelOfDrill } from '../src/engine/drills/plan';
import { CONTINUES_LEVELS, FIXED_KEY_LEVELS, TWELVE_KEY_FAMILIES } from '../src/engine/drills/keys12';

const pc = (k: number) => ((k % 12) + 12) % 12;
/** Families that keep their keys as a whole: first steps, the classical pieces, flamenco and fingerstyle (open shapes),
 * the upright's positions (every level of b-up-pos is a fixed position, FIXED_KEY_LEVELS). */
const KEPT_FAMILIES = ['k-first', 'g-first', 'b-first', 'k-classic', 'g-flamenco', 'g-fingerstyle', 'b-up-pos'];

type Inst = 'keys' | 'guitar' | 'bass';
const FAMS: { f: FamilyDef; inst: Inst }[] = [
  ...catalog().map((f) => ({ f, inst: 'keys' as Inst })),
  ...guitarCatalog()
    .filter((f) => !f.retired && !f.instruments.includes('drums' as never))
    .map((f) => ({ f: f as unknown as FamilyDef, inst: (f.instruments.includes('bass') ? 'bass' : 'guitar') as Inst })),
];
const keysOf = (l: LevelDef): number[] => (Array.isArray(l.keys) ? l.keys.map(pc) : Array.from({ length: 12 }, (_, i) => i));

describe('all 12 keys on keys, guitar and bass', () => {
  it('every family is either on the 12-key list or kept on purpose', () => {
    const loose = FAMS.filter(({ f }) => !TWELVE_KEY_FAMILIES.includes(f.id) && !KEPT_FAMILIES.includes(f.id) && f.levels.some((l) => keysOf(l).length < 12)).map(({ f }) => f.id);
    expect(loose).toEqual([]);
  });

  it('every level of a 12-key family covers 12 keys (kept levels and split ladders named in keys12.ts)', () => {
    const short: string[] = [];
    for (const { f } of FAMS) {
      if (KEPT_FAMILIES.includes(f.id)) continue;
      for (const l of f.levels) {
        if (FIXED_KEY_LEVELS.includes(l.id)) continue;
        const ks = new Set(keysOf(l));
        const before = CONTINUES_LEVELS[l.id];
        if (before) for (const b of f.levels.filter((x) => before.includes(x.id))) for (const k of keysOf(b)) ks.add(k);
        if (ks.size < 12) short.push(`${l.id}: ${ks.size}`);
      }
    }
    expect(short).toEqual([]);
  });

  it('a split ladder runs each of its items through all 12 keys', () => {
    for (const [id, before] of Object.entries(CONTINUES_LEVELS)) {
      const f = FAMS.find(({ f }) => f.levels.some((l) => l.id === id))!.f;
      const ladder = f.levels.filter((l) => l.id === id || before.includes(l.id));
      const bySpec = new Map<string, Set<number>>();
      for (const l of ladder)
        for (const s of l.specs) {
          const sig = JSON.stringify({ ...s, tempo: undefined, target: undefined });
          const set = bySpec.get(sig) ?? new Set<number>();
          keysOf(l).forEach((k) => set.add(k));
          bySpec.set(sig, set);
        }
      for (const [sig, set] of bySpec) expect(set.size, `${id} ${sig}`).toBe(12);
    }
  });

  it('the listed keys stay first (saved item ids keep their keys)', () => {
    // Spot checks of levels widened here: their old lists lead.
    const lv = (id: string) => FAMS.flatMap(({ f }) => f.levels).find((l) => l.id === id)!;
    expect(keysOf(lv('b-pluck-4')).slice(0, 6)).toEqual([4, 9, 2, 7, 0, 5]);
    expect(keysOf(lv('b-styles-12')).slice(0, 2)).toEqual([2, 4]);
    expect(keysOf(lv('g-lead-7')).slice(0, 7)).toEqual([9, 4, 7, 2, 0, 5, 10]);
    expect(keysOf(lv('control-12')).slice(0, 8)).toEqual([0, 7, 5, 2, 10, 9, 4, 3]);
    expect(keysOf(lv('b-up-scales-3')).slice(0, 3)).toEqual([10, 3, 4]);
    expect(keysOf(lv('b-up-scales-1'))).toEqual([7, 2, 9, 5]);
  });

  it('every item in every key fits its instrument, and maps back to its own level', { timeout: 300_000 }, () => {
    const bad: string[] = [];
    for (const { f, inst } of FAMS) {
      if (KEPT_FAMILIES.includes(f.id) || !TWELVE_KEY_FAMILIES.includes(f.id)) continue;
      for (const l of f.levels) {
        for (const d of levelDrills(l, 'fifths-up')) {
          const upright = d.spec.tuning === 'upright';
          const maxF = inst === 'bass' ? (upright ? 24 : 21) : 22;
          for (const n of d.notes) {
            if (inst === 'keys') {
              if (n.pitch < 21 || n.pitch > 108) bad.push(`${d.itemId}: ${n.pitch} off the keyboard`);
            } else if (n.fret !== undefined && (n.fret < 0 || n.fret > maxF)) bad.push(`${d.itemId}: fret ${n.fret}`);
          }
          // (a level may borrow another family's items — fingers-7 plays arpeggios — those map to their own family)
          const back = d.spec.family === f.id ? levelOfDrill(d) : undefined;
          // A shared item (advanced-8 repeats advanced-5's leaps "in more keys") maps to the first level that has it.
          if (back && back.id !== l.id && !levelDrills(back, 'fifths-up').some((x) => x.itemId === d.itemId)) bad.push(`${d.itemId}: level ${back.id}, want ${l.id}`);
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });
});
