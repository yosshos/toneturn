import { describe, expect, it } from 'vitest';
import { CADENCES, cadenceText, romanChord } from '../src/engine/cadences';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { parseChart } from '../src/engine/charts';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { chartDrillData } from '../src/engine/drills/chartDrills';
import type { Drill } from '../src/engine/drills/types';

const fam = (id: string) => [...catalog(), ...guitarCatalog()].find((f) => f.id === id)!;
const specsOf = (id: string) => fam(id).levels.flatMap((l) => l.specs.map((s) => ({ s, keys: l.keys as number[] })));
const cadId = (kind: string) => (kind.startsWith('chart~') ? kind.split('~')[1].slice(4) : kind.split('~')[1]);
const roots = (text: string) => parseChart(text).chords.map((c) => c.root);

describe('the cadence chart library (JAZZ-CADENCE-INVENTORY gap list 1–7)', () => {
  it('every chart reads: each Roman numeral is a chord, the chart parses without errors', () => {
    for (const c of CADENCES) {
      const p = parseChart(cadenceText(c));
      expect(p.errors, c.id).toEqual([]);
      expect(p.chords.length, c.id).toBeGreaterThan(1);
    }
    // the inventory's master list C1–C29 (C30, the classical cadences, are the cadences family)
    const rows = new Set(CADENCES.map((c) => c.row));
    for (let i = 1; i <= 29; i++) expect(rows.has(`C${i}`), `C${i}`).toBe(true);
  });

  it('the chord roots follow the Roman numerals, in C and in E♭', () => {
    expect(romanChord('bVImaj7').sym).toBe('Abmaj7');
    expect(romanChord('#i°7').sym).toBe('C#dim7');
    expect(romanChord('iiø7').sym).toBe('Dm7b5');
    expect(romanChord('IV/V').sym).toBe('F/G');
    const at = (id: string, key: number) => chartDrillData(`chart~cad:${id}~shell~whole~comp`, key)!;
    // major ii–V–I: ii 2, V 7, I 0 above the tonic
    expect(roots(at('ii-v-i', 0).text)).toEqual([2, 7, 0, 2, 7, 0]); // a 3-chord cadence is played twice
    expect(at('ii-v-i', 3).text).toBe('Fm7 Bb7 | Ebmaj7 | Fm7 Bb7 | Ebmaj7');
    // minor ii–V–i
    expect(at('m-ii-v-i', 0).text).toBe('Dm7b5 G7b9 | Cm6 | Dm7b5 G7b9 | Cm6');
    expect(at('m-ii-v-i', 5).text).toBe('Gm7b5 C7b9 | Fm6 | Gm7b5 C7b9 | Fm6');
    expect(roots(at('m-ii-v-i', 3).text).slice(0, 3)).toEqual([5, 10, 3]);
    // Coltrane into I: ii7 ♭III7 ♭VImaj7 VII7 IIImaj7 V7 Imaj7
    expect(roots(at('coltrane', 0).text)).toEqual([2, 3, 8, 11, 4, 7, 0]);
    expect(roots(at('coltrane', 3).text)).toEqual([5, 6, 11, 2, 7, 10, 3]);
    // the chromatic ii–V chain
    expect(at('chain-half', 0).text).toBe('Em7 A7 | Ebm7 Ab7 | Dm7 G7 | Cmaj7');
    expect(roots(at('chain-half', 3).text)).toEqual([7, 0, 6, 11, 5, 10, 3]);
  });

  const check = (id: string, inst: string) => {
    const seen = new Set<string>();
    for (const { s, keys } of specsOf(id)) {
      expect([...keys].sort((a, b) => a - b), s.kind).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      // a built-in practice chart that is not a cadence (the Barron's m7 cycle, from C minor)
      const set = s.kind.startsWith('chart~set:');
      const c = set ? ({ id: s.kind, minor: true } as (typeof CADENCES)[number]) : CADENCES.find((x) => x.id === cadId(s.kind))!;
      expect(c, s.kind).toBeDefined();
      if (!set) seen.add(c.id);
      for (const key of keys) {
        const d: Drill = generate({ ...s, key });
        expect(d.notes.length, `${s.kind} ${key}`).toBeGreaterThan(0);
        expect(d.tonic, `${s.kind} ${key}`).toEqual({ key, ...(c.minor ? { minor: true } : {}) });
        const f = keyFacet(d)!;
        expect(f.root, `${inst} ${s.kind} ${key}`).toBe(key);
        expect(f.group, `${inst} ${d.title.en}`).toBe(c.minor ? 'minor' : 'major');
        expect(f.role).toBe('cadence');
        expect(d.title.he.length).toBeGreaterThan(0);
        expect(/[\u{1F300}-\u{1FAFF}]/u.test(d.title.en + d.title.he)).toBe(false);
      }
    }
    return seen;
  };

  it('piano: every cadence (but the pedal) in all 12 keys; minor cadences file under minor', () => {
    const seen = check('k-cadlib', 'piano');
    expect([...seen].sort()).toEqual(CADENCES.filter((c) => !c.slash).map((c) => c.id).sort());
    const kinds = specsOf('k-cadlib').map((x) => x.s.kind.split('~')[2]);
    for (const v of ['shell', 'guide', 'rootless', 'drop2', 'drop3', 'close4', 'two-hand', 'stride-tenth', 'walk-lh', 'sowhat1', 'sowhat2', 'barron']) expect(kinds, v).toContain(v);
    expect(fam('k-cadlib').levels).toHaveLength(26);
  });

  it('guitar: shells, drop 2, drop 3, rootless over every cadence, in all 12 keys', () => {
    const seen = check('g-cadlib', 'guitar');
    // shells take every chart, the m7♭5 and 9sus4 ones too (owner 2026-11-21)
    const shellIds = fam('g-cadlib').levels.filter((l) => l.specs[0].kind.endsWith('~shell')).flatMap((l) => l.specs.map((x) => cadId(x.kind)));
    expect(shellIds.sort()).toEqual(CADENCES.filter((c) => !c.slash).map((c) => c.id).sort());
    expect(specsOf('g-cadlib')).toHaveLength(4 * CADENCES.filter((c) => !c.slash).length);
    expect([...seen].sort()).toEqual(CADENCES.filter((c) => !c.slash).map((c) => c.id).sort());
    for (const { s } of specsOf('g-cadlib')) {
      const d = generate({ ...s, key: 7 });
      const chords = new Set(d.notes.map((n) => n.beat));
      // one voicing a chord: a shell's three notes, four otherwise (no fallback), never two notes on a string
      for (const b of chords) {
        const ns = d.notes.filter((n) => n.beat === b);
        expect(ns.length, s.kind).toBe(s.kind.endsWith('~shell') ? 3 : 4);
        expect(new Set(ns.map((n) => n.string)).size, s.kind).toBe(ns.length);
      }
    }
  });

  it('bass: walking lines over every cadence (the pedal too), in all 12 keys, on the chart’s chord tones and approaches', () => {
    const seen = check('b-cadlib', 'bass');
    expect([...seen].sort()).toEqual(CADENCES.map((c) => c.id).sort());
    // the approach line lands on each chord's root
    const d = generate({ family: 'b-cadlib', kind: 'cad~m-ii-v-i~approach', key: 0, hands: 'R', instrument: 'bass', perBeat: 1 });
    expect(d.notes.filter((n) => n.beat % 2 === 0 && n.beat <= 4).map((n) => n.pitch % 12)).toEqual([2, 7, 0]);
  });
});

describe('labels and filing the inventory flagged (§3.4 items 2 and 3)', () => {
  it('minor classical cadences print minor numerals, matching the chords written', () => {
    const d = generate({ family: 'cadences', kind: 'cadence-64', key: 0, hands: 'RL', minor: true });
    expect(d.title.en).toContain('i–iv–i6/4–V7–i');
    // i, iv, i6/4, V7, i: C minor, F minor, C minor over G, G7 (B natural), C minor
    const pcs = (b: number) => [...new Set(d.notes.filter((n) => n.beat === b).map((n) => n.pitch % 12))].sort((x, y) => x - y);
    expect(pcs(0)).toEqual([0, 3, 7]);
    expect(pcs(2)).toEqual([0, 5, 8]);
    expect(pcs(6)).toEqual(expect.arrayContaining([11, 5, 7]));
    const circle = generate({ family: 'cadences', kind: 'cadence-circle', key: 0, hands: 'RL', minor: true });
    expect(circle.title.en).toContain('i–VI–ii°–V7–i');
    expect(generate({ family: 'cadences', kind: 'cadence-64', key: 0, hands: 'RL' }).title.en).toContain('I–IV–I6/4–V7–I');
  });

  it('the Harris brothers file under the key they resolve to (C7 brothers → F), like the brothers in context', () => {
    const d = generate({ family: 'harris', kind: 'h8-brothers', key: 0, hands: 'R', swing: true });
    expect(keyFacet(d)!.root).toBe(5);
  });
});
