// Barry Harris lines as drills (harrisLineDrills.ts): k-harrisline (keys), g-harrisline (guitar), b-harrisline (bass) —
// counts, every item in all 12 keys, rubato first, chord tones on the beats, compose items as free bars.
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { generateGuitar, guitarCatalog } from '../src/engine/drills/guitar';
import { hasRubato } from '../src/engine/drills/rubato';
import { harrisLineFamily, HL_LEVEL_IDS, HL_ROWS } from '../src/engine/drills/harrisLineDrills';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const TIMED = ['hl-upbeat', 'hl-ands', 'hl-compose', 'hl-feel6', 'hl-walkties'];

describe('k-harrisline, g-harrisline, b-harrisline drills', () => {
  const keysFam = catalog().find((f) => f.id === 'k-harrisline')!;
  // keys 23 since 3 to ♭9 (k-harrisline-20) was switched on, owner 2026-11-23
  const KEYS_SHOWN = 23, G_SHOWN = 8, B_SHOWN = 8;
  const gFam = guitarCatalog().find((f) => f.id === 'g-harrisline')!;
  const bFam = guitarCatalog().find((f) => f.id === 'b-harrisline')!;
  it('counts: 34 keys levels (the first 32 rated ~1100–1750 in rating order, 2 appended 2026-11-15), 10 guitar, 10 bass', () => {
    // 34 built; the rest hidden until verified (src/engine/verifiedContent.ts)
    expect(harrisLineFamily().levels.length).toBe(34);
    expect(keysFam.levels.length).toBe(KEYS_SHOWN);
    expect(HL_ROWS.length).toBe(34);
    const r = HL_ROWS.slice(0, 32).map((x) => x.rating);
    expect(r).toEqual([...r].sort((a, b) => a - b));
    expect(r[0]).toBe(1100);
    expect(r[r.length - 1]).toBe(1750);
    expect(gFam.levels.length).toBe(G_SHOWN);
    expect(bFam.levels.length).toBe(B_SHOWN);
    expect(HL_LEVEL_IDS.keys[0]).toBe('k-harrisline-1');
    expect(HL_LEVEL_IDS.guitar[9]).toBe('g-harrisline-10');
  });
  const fams: [string, (s: DrillSpec) => Drill, number, number][] = [
    ['k-harrisline', generate, 36, 96],
    ['g-harrisline', generateGuitar, 40, 90],
    ['b-harrisline', generateGuitar, 23, 67],
  ];
  for (const [fid, gen, lo, hi] of fams)
    it(`${fid}: every item in all 12 keys — notes in range, the key in the item id, line items start in free time`, { timeout: 120000 }, () => {
      // keys: every built level (hidden ones too: their content stays correct for when they are switched on)
      const fam = fid === 'k-harrisline' ? harrisLineFamily() : fid === 'g-harrisline' ? gFam : bFam;
      for (const lv of fam.levels) {
        expect(Array.isArray(lv.keys) && new Set(lv.keys).size, lv.id).toBe(12);
        for (const sp of lv.specs)
          for (let key = 0; key < 12; key++) {
            const d = gen({ ...sp, key } as DrillSpec);
            const id = `${lv.id} ${sp.kind}:${sp.option} k${key}`;
            expect(d.notes.length, id).toBeGreaterThan(3);
            expect(d.itemId, id).toContain(`:${key}:`);
            for (const n of d.notes) {
              expect(n.pitch, id).toBeGreaterThanOrEqual(lo);
              expect(n.pitch, id).toBeLessThanOrEqual(hi);
            }
            if (!TIMED.includes(sp.kind)) expect(hasRubato(d), id).toBe(true);
            if (!TIMED.includes(sp.kind) && d.goal.chordTonesOnBeats) expect(d.notes.filter((n) => n.chordTone && Number.isInteger(n.beat)).length, id).toBeGreaterThan(0);
          }
      }
    });
  it('the chromatic scale item in C: the scale degrees on every beat', () => {
    const d = generate({ family: 'k-harrisline', kind: 'hl-chrom', key: 0, hands: 'R', option: 0 });
    for (const n of d.notes) if (Number.isInteger(n.beat)) expect([0, 2, 4, 5, 7, 9, 11]).toContain(mod12(n.pitch));
    expect(d.goal.chordTonesOnBeats).toBe(true);
  });
  it('compose items are free bars with a landing on every beat and the rules line as the model', () => {
    const d = generate({ family: 'k-harrisline', kind: 'hl-compose', key: 0, hands: 'R', option: 1 });
    expect(d.goal.free?.windows).toEqual([[0, 16]]);
    expect(d.notes.length).toBe(16);
    expect(d.notes.every((n) => n.land && n.land.includes(mod12(n.pitch)))).toBe(true);
    expect(d.goal.free?.model.length).toBe(32);
  });
});
