// More open-string pedals (g-color 16–18): only in the keys whose open strings carry them.
import { describe, expect, it } from 'vitest';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { MORE_PEDAL_KEYS } from '../src/engine/drills/colorDrills';
import { FIXED_KEY_LEVELS } from '../src/engine/drills/keys12';
import { tuningById } from '../src/engine/fretboard';
import { UNITS } from '../src/content/mini/reharmColor';
import { BADGES } from '../src/engine/badges';

const pc = (n: number) => ((n % 12) + 12) % 12;
const g = (kind: string, key: number, option = 0) => generate({ family: 'g-color', kind, key, hands: 'R', instrument: 'guitar', option });

describe('more open-string pedals', () => {
  it('minor joins level 13, the high E level 15, drop D is level 16; each in its idiomatic keys (FIXED_KEY_LEVELS)', () => {
    const fam = guitarCatalog().find((f) => f.id === 'g-color')!;
    for (const [n, kind] of [[13, 'gop-minor'], [15, 'gop-high'], [16, 'gop-dropd']] as const) {
      const lv = fam.levels.find((l) => l.id === `g-color-${n}`)!;
      expect(lv, kind).toBeDefined();
      expect(lv.specs.some((x) => x.kind === kind)).toBe(true);
      expect(FIXED_KEY_LEVELS).toContain(lv.id);
      expect([...(lv.keys as number[])].sort()).toEqual([...MORE_PEDAL_KEYS[kind]].sort());
      expect(UNITS[`tech:${lv.id}`]).toBe('pedal-point');
      expect(levelDrills(lv, 'fifths-up').length).toBeGreaterThan(0);
    }
    expect(BADGES.some((b) => /Drop-D Pedal/.test(b.name.en))).toBe(true);
  });
  it('a non-idiomatic key throws (never a fretted "open" pedal)', () => {
    expect(() => g('gop-high', 0)).toThrow();
    expect(() => g('gop-high', 5)).toThrow();
    expect(() => g('gop-dropd', 9)).toThrow();
    expect(() => g('gop-minor', 7)).toThrow();
  });
  it('minor: i – iv – V – i over the open tonic string, every chord sounds its triad', () => {
    const want: Record<number, string> = { 4: 'Em Am/E B/E Em', 9: 'Am Dm/A E/A Am', 2: 'Dm Gm/D A/D Dm' };
    const str: Record<number, number> = { 4: 6, 9: 5, 2: 4 };
    for (const k of MORE_PEDAL_KEYS['gop-minor']) {
      const d = g('gop-minor', k);
      expect(d.chart!.join(' ')).toBe(want[k]);
      const tri = [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]];
      [0, 4, 8, 12].forEach((b, i) => {
        const at = d.notes.filter((x) => x.beat === b);
        expect(at.some((x) => x.string === str[k] && x.fret === 0)).toBe(true);
        expect(new Set(at.filter((x) => x.fret !== 0 || x.string !== str[k]).map((x) => pc(x.pitch)))).toEqual(new Set(tri[i].map((x) => pc(k + x))));
      });
    }
  });
  it('the high E rings on top of every chord (E, A, D, G: I – IV – ♭VII – I), and the names hold it', () => {
    const want: Record<number, string> = { 4: 'E A Dadd9 E', 9: 'A Dadd9 G6 A', 2: 'Dadd9 G6 Cadd9 Dadd9', 7: 'G6 C Fmaj7 G6' };
    // E's interval above each chord root is consonant: root/3rd/5th, 6th, 9th or maj7
    const ok = [0, 4, 7, 9, 2, 11];
    for (const k of [4, 9, 2, 7]) {
      for (const d of [0, 5, 10]) expect(ok).toContain(pc(4 - (k + d)));
      const d = g('gop-high', k);
      expect(d.chart!.join(' ')).toBe(want[k]);
      for (const b of [0, 4, 8, 12]) {
        const at = d.notes.filter((x) => x.beat === b);
        const top = at.reduce((a, x) => (x.pitch > a.pitch ? x : a));
        expect(top.string).toBe(1);
        expect(top.fret).toBe(0);
        expect(top.pitch).toBe(64);
      }
    }
  });
  it('drop D: the spec asks for drop-D tuning; the low D rings under the shapes; G resolves home', () => {
    const lowD = tuningById('drop-d').open[5];
    expect(lowD).toBe(38);
    const d = g('gop-dropd', 2);
    expect(d.spec.tuning).toBe('drop-d');
    expect(d.chart!.join(' ')).toBe('D G/D A/D D');
    for (const b of [0, 4, 8, 12]) expect(d.notes.some((x) => x.beat === b && x.string === 6 && x.fret === 0 && x.pitch === 38)).toBe(true);
    const gd = g('gop-dropd', 7);
    expect(gd.chart!.join(' ')).toBe('Am/D C/D E♭/D D7 G');
    const home = gd.notes.filter((x) => x.beat === 16);
    expect(home.find((x) => x.string === 6)!.pitch).toBe(43);
  });
});
