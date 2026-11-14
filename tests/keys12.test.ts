// The owner's rule (2026-11-14): every technique and jazz exercise in all 12 keys, on piano, guitar and bass; a tune
// in all 12 keys (AUDIT-GAPS-2 High #4). Standards take the key as an offset from the lead sheet (stdKey.ts).
import { describe, expect, it } from 'vitest';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills, specDrills } from '../src/engine/drills/plan';
import { all12 } from '../src/engine/drills/keys12';
import { chartDrillData } from '../src/engine/drills/chartDrills';
import { keyLabel, moved, nameInKey, restateKey, standardHome, transposeTextIn } from '../src/engine/stdKey';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { repDrills } from '../src/engine/repertoireDrills';
import { newItem } from '../src/engine/drills/ladder';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

/** Jazz, harmony, bebop, voicing / comping, theory-you-play and played-ear families: key-relative material. */
const SCOPE: Record<'piano' | 'guitar' | 'bass', string[]> = {
  piano: ['k-first', 'harris', 'jazz', 'voicings', 'accomp', 'k-sixdim', 'k-bebop', 'k-reharm', 'k-theory', 'k-vl', 'k-rhythm', 'k-ear'],
  guitar: ['g-arps', 'g-jazz', 'g-theory', 'g-impro', 'g-harris', 'g-vl'],
  bass: ['b-barry', 'b-impro', 'b-walk', 'b-swing', 'b-jform', 'b-latin', 'b-std'],
};
/** Single levels of other families with jazz material. */
const SCOPE_LEVELS = ['g-rhythm-6'];
/** Fixed keys on purpose: the first steps at the piano are in C (C position, the thumb under). */
const FIXED: Record<string, string> = {
  'k-first-1': 'first steps: five fingers in C',
  'k-first-2': 'first steps: C position, hands together',
  'k-first-3': 'first steps: the thumb passes under, in C',
};

const GCAT = guitarCatalog();
const levels = (inst: 'piano' | 'guitar' | 'bass'): { fam: string; l: LevelDef }[] => {
  const fams = inst === 'piano' ? catalog() : GCAT.filter((f) => f.instruments.includes(inst));
  return fams.flatMap((f) => f.levels.filter((l) => SCOPE[inst].includes(f.id) || SCOPE_LEVELS.includes(l.id)).map((l) => ({ fam: f.id, l })));
};
const pcOf = (k: number) => ((k % 12) + 12) % 12;

describe('every jazz / theory level runs in all 12 keys (piano, guitar, bass)', () => {
  for (const inst of ['piano', 'guitar', 'bass'] as const)
    it(`${inst}: all 12 keys, real transpositions, playable ranges`, () => {
      const ls = levels(inst);
      expect(ls.length).toBeGreaterThan(inst === 'piano' ? 80 : 30);
      for (const { l } of ls) {
        const ds = levelDrills(l, 'fifths-up');
        const keys = new Set(ds.map((d) => pcOf(d.spec.key)));
        if (FIXED[l.id]) {
          expect(keys.size, l.id).toBeLessThan(12);
          continue;
        }
        expect(keys.size, `${l.id} keys ${[...keys].join(',')}`).toBe(12);
        // Each item of the level in every key, with its own id.
        expect(new Set(ds.map((d) => d.itemId)).size, l.id).toBe(ds.length);
        for (let si = 0; si < l.specs.length; si++) {
          const row = specDrills(l, si, 'fifths-up');
          // A real transposition: the notes move with the key (guide tones a tritone apart, diminished moves a minor
          // 3rd apart may coincide: at least 3 different lines across the 12 keys).
          const seqs = new Set(row.map((d) => d.notes.map((n) => n.pitch).join(',')));
          if (row.length >= 12) expect(seqs.size, `${l.id} spec ${si}`).toBeGreaterThanOrEqual(3);
        }
        for (const d of ds) {
          expect(d.notes.length, d.itemId).toBeGreaterThan(0);
          if (inst === 'piano') for (const n of d.notes) expect(n.pitch >= 21 && n.pitch <= 108, `${d.itemId} ${n.pitch}`).toBe(true);
          else
            for (const n of d.notes) {
              if (n.fret === undefined) continue;
              expect(n.fret >= 0 && n.fret <= 24, `${d.itemId} fret ${n.fret}`).toBe(true);
              expect((n.string ?? 1) >= 1 && (n.string ?? 1) <= 7, `${d.itemId} string ${n.string}`).toBe(true);
            }
        }
      }
    });
  it('the listed keys stay first, in their order (the first take and the saved ids do not change)', () => {
    expect(all12([5, 10, 0, 7, 3])).toEqual([5, 10, 0, 7, 3, 8, 1, 6, 11, 4, 9, 2]);
    expect(all12([0])).toEqual([0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7]);
    expect(new Set(all12([2, 9])).size).toBe(12);
    // A lead-sheet item keeps its id (key offset 0), the other keys are new ids.
    const v14 = levelDrills(catalog().flatMap((f) => f.levels).find((l) => l.id === 'voicings-14')!, 'fifths-up');
    expect(v14[0].itemId).toBe('voicings:chart~std:autumn~rootless~charleston~comp:0:L:sw');
    const bstd = levelDrills(GCAT.flatMap((f) => f.levels).find((l) => l.id === 'b-std-1')!, 'fifths-up');
    expect(bstd[0].spec.key).toBe(0);
  });
});

describe('a standard in any key spells correctly', () => {
  const fly = STANDARD_CHANGES.find((s) => s.id === 'fly')!;
  const at = (n: number) => transposeTextIn(fly.text, n, moved(standardHome('fly'), n));
  it('Fly Me to the Moon (C) in B♭, D♭ and F♯', () => {
    expect(at(10)).toBe('Gm7 | Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm7 G7');
    expect(at(1)).toBe('Bbm7 | Ebm7 | Ab7 | Dbmaj7 | Gbmaj7 | Cm7b5 | F7b9 | Bbm7 Bb7');
    expect(at(6)).toBe('D#m7 | G#m7 | C#7 | F#maj7 | Bmaj7 | Fm7b5 | A#7b9 | D#m7 D#7');
    // The lead sheet is left as written.
    expect(at(0)).toBe(fly.text);
  });
  it('Autumn Leaves (G minor) in B♭ minor: flats, never a double flat', () => {
    const t = transposeTextIn(STANDARD_CHANGES.find((s) => s.id === 'autumn')!.text, 3, moved(standardHome('autumn'), 3));
    expect(t.startsWith('Ebm7 | Ab7 | Dbmaj7 | Gbmaj7 | Cm7b5 | F7b9 | Bbm6 | Bbm6')).toBe(true);
    expect(t).not.toMatch(/bb|##|#/);
    expect(t).toContain('Bbm7 A7'); // the G♭7 tritone step lands on A, not B♭♭
  });
  it('the chart drill shows the key and spells its chart (piano voicings on ATTYA in E)', () => {
    const d = chartDrillData('chart~std:attya~drop2~charleston~comp', 8)!;
    expect(keyLabel(d.tonic)).toBe('E');
    expect(d.title.en).toContain('· E');
    expect(d.text.split(' | ').slice(0, 4)).toEqual(['C#m7', 'F#m7', 'B7', 'Emaj7']);
    expect(d.text).not.toMatch(/[A-G]b/);
  });
  it('names restate the key they state, others get the key appended', () => {
    expect(restateKey({ en: 'Jazz blues in F', he: 'בלוז בפה' }, { key: 8 })).toEqual({ en: 'Jazz blues in A♭', he: 'בלוז ב־A♭' });
    expect(nameInKey({ en: 'Autumn Leaves', he: 'Autumn Leaves' }, { key: 10, minor: true })).toEqual({ en: 'Autumn Leaves · B♭m', he: 'Autumn Leaves · B♭m' });
  });
});

describe('tunes through the keys: drills, the key in the header, key mastery', () => {
  const tonics = (ds: Drill[]) => new Set(ds.map((d) => d.tonic!.key));
  it('piano, guitar and bass standards build 12 keys with their real tonic', () => {
    const p = levelDrills(catalog().flatMap((f) => f.levels).find((l) => l.id === 'voicings-15')!, 'fifths-up');
    expect(tonics(p).size).toBe(12);
    const g = levelDrills(GCAT.flatMap((f) => f.levels).find((l) => l.id === 'g-jazz-13')!, 'fifths-up');
    expect(tonics(g).size).toBe(12);
    for (const id of ['b-std-3', 'b-walk-11', 'b-impro-13', 'b-latin-9']) {
      const b = levelDrills(GCAT.flatMap((f) => f.levels).find((l) => l.id === id)!, 'fifths-up');
      expect(tonics(b).size, id).toBe(12);
      // The bass title names the key it is in (its header).
      for (const d of b) expect(d.title.en, d.itemId).toMatch(/· [A-G][♭♯]?m?$/);
    }
    // Every header names its key.
    for (const d of [...p, ...g]) expect(d.title.en, d.itemId).toMatch(/(· |in )[A-G][♭♯]?m?\b/);
  });
  it('key mastery files a moved tune under the key it is in', () => {
    const d = generate({ family: 'b-std', kind: 'tier', key: 3, hands: 'R', instrument: 'bass', option: 18, perBeat: 1 } as DrillSpec);
    // Autumn Leaves (G minor) up a minor 3rd: B♭ minor.
    expect(d.tonic).toEqual({ key: 10, minor: true });
    expect(newItem(d).key).toBe(10);
    expect(d.chart![0]).toBe('Ebm7');
  });
  it('a repertoire standard opens in its own key first, then the other 11', () => {
    const q = repDrills({ k: 'chartDrill', std: 'autumn', voicing: 'rootless', rhythm: 'charleston' } as never, 'keys');
    expect(q.length).toBe(12);
    expect(q[0].spec.key).toBe(0);
    expect(q[0].tonic).toEqual({ key: 7, minor: true });
    expect(tonics(q).size).toBe(12);
  });
});
