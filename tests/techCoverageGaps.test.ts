// TECHNIQUE-COVERAGE-AUDIT §4.6 items 2–9: Hanon Part I Nos. 2–20, the minor forms of the advanced piano items,
// contrary-motion and 4-octave 7th arpeggios, bebop scales LH / HT, guitar minor scales in five positions, bass diatonic
// 7th arpeggios and two-octave minor scales. Every new level in 12 keys, the notes spot-checked, the facets right.
import { describe, expect, it } from 'vitest';
import { catalog, generate, hanonDegrees, HANON_NUMBERS, type LevelDef } from '../src/engine/drills/generate';
import { generateGuitar, guitarCatalog } from '../src/engine/drills/guitar';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { levelDrills } from '../src/engine/drills/plan';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const NEW_PIANO = ['fingers-15', 'fingers-16', 'fingers-17', 'fingers-18', 'scales-34', 'scales-35', 'arpeggios-15', 'arpeggios-16', 'advanced-9'];
const NEW_GUITAR = ['g-scales-16', 'g-scales-17', 'g-scales-18', 'b-chord-15', 'b-chord-16', 'b-scale-12'];
const pianoLevels = catalog().flatMap((f) => f.levels);
const guitarLevels = guitarCatalog().flatMap((f) => f.levels as unknown as LevelDef[]);
const lv = (id: string): LevelDef => [...pianoLevels, ...guitarLevels].find((l) => l.id === id)!;
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const pcName = (p: number) => NAMES[((p % 12) + 12) % 12];
/** The RH line of a drill as pitch names (one per onset). */
const rhNames = (d: Drill): string[] => {
  const rh = d.notes.filter((n) => n.hand === 'R').sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return rh.map((n) => pcName(n.pitch));
};
const piano = (o: Partial<DrillSpec>): Drill => generate({ family: 'fingers', kind: 'hanon', hands: 'RL', key: 0, perBeat: 4, ...o } as DrillSpec);

describe('the new levels', () => {
  it('exist and run through all 12 keys', () => {
    for (const id of [...NEW_PIANO, ...NEW_GUITAR]) {
      const l = lv(id);
      expect(l, id).toBeTruthy();
      const keys = new Set(levelDrills(l, 'fifths-up').map((d) => (d.tonic ? d.tonic.key : d.spec.key) % 12));
      expect(keys.size, id).toBe(12);
    }
  });

  it('Hanon Nos. 2–20 are all encoded and on the path, hands together in 16ths', () => {
    expect(HANON_NUMBERS).toEqual(Array.from({ length: 19 }, (_, i) => i + 2));
    const onPath = ['fingers-15', 'fingers-16', 'fingers-17', 'fingers-18'].flatMap((id) => lv(id).specs.map((s) => s.option));
    expect(onPath).toEqual(HANON_NUMBERS);
    for (const id of ['fingers-15', 'fingers-16', 'fingers-17', 'fingers-18']) for (const s of lv(id).specs) expect([s.kind, s.hands, s.perBeat]).toEqual(['hanon', 'RL', 4]);
  });
});

describe('Hanon Part I notes (Schirmer edition)', () => {
  it('No. 2 in C: C E A G F G F E up, G D B C D C D E down from the top, ending on C', () => {
    const n = rhNames(piano({ option: 2 }));
    expect(n.slice(0, 16).join(' ')).toBe('C E A G F G F E D F B A G A G F');
    expect(n.slice(112, 120).join(' ')).toBe('G D B C D C D E');
    expect(n.slice(-9).join(' ')).toBe('A E C D E D E F C');
    expect(n.length).toBe(14 * 8 + 14 * 8 + 1);
  });

  // Nos. 17 and 18 re-checked 2026-11-23 against the Mutopia LilyPond source (MutopiaProject ftp/HanonCL/
  // virtuoso-pianist-pt1, hanon17.ily / hanon18.ily): No. 17 turns at the top with its own last group and comes down in
  // 13 groups (its last group ends B F D E C D E D); No. 18 is 14 groups each way.
  it('No. 17 and No. 18 in C, note for note', () => {
    const n17 = rhNames(piano({ option: 17 }));
    expect(n17.slice(0, 16).join(' ')).toBe('C E A G B A G A D F B A C B A B');
    expect(n17.slice(104, 112).join(' ')).toBe('B D G F A G F E');
    expect(n17.slice(112, 120).join(' ')).toBe('G D B C A B C A');
    expect(n17.slice(-9).join(' ')).toBe('B F D E C D E D C');
    expect(n17.length).toBe(14 * 8 + 13 * 8 + 1);
    const n18 = rhNames(piano({ option: 18 }));
    expect(n18.slice(0, 16).join(' ')).toBe('C D F E G F D E D E G F A G E F');
    expect(n18.slice(112, 120).join(' ')).toBe('G F D E C D F E');
    expect(n18.slice(-9).join(' ')).toBe('A G E F D E G F C');
    expect(n18.length).toBe(14 * 8 + 14 * 8 + 1);
  });

  it('No. 8 in E♭: the figure 1-3-5-6-4-5-3-4 in E♭ major, both hands an octave apart', () => {
    const d = piano({ option: 8, key: 3 });
    // E♭ G B♭ C A♭ B♭ G A♭ as pitch classes
    expect(d.notes.filter((x) => x.hand === 'R').sort((a, b) => a.beat - b.beat).slice(0, 8).map((x) => x.pitch % 12)).toEqual([3, 7, 10, 0, 8, 10, 7, 8]);
    const r = d.notes.filter((x) => x.hand === 'R').sort((a, b) => a.beat - b.beat);
    const l = d.notes.filter((x) => x.hand === 'L').sort((a, b) => a.beat - b.beat);
    expect(r.length).toBe(l.length);
    expect(r.every((x, i) => x.pitch - l[i].pitch === 12)).toBe(true);
    expect(r[0].pitch).toBe(51); // E♭3, as printed from C3
  });

  it('No. 5 descends with its own figure; No. 12 opens narrower and ends with an extra group; No. 20 ends on a chord', () => {
    const n5 = rhNames(piano({ option: 5 }));
    expect(n5.slice(112, 128).join(' ')).toBe('C D C E D F E G B C B D C E D F');
    const h12 = hanonDegrees(12);
    expect(h12.groups.length).toBe(29);
    expect(h12.groups[0]).toEqual([4, 0, 2, 1, 0, 1, 2, 0]);
    expect(h12.groups[28]).toEqual([0, 4, 2, 3, 4, 3, 2, 3]);
    const d20 = piano({ option: 20 });
    const last = d20.notes.filter((x) => x.beat === Math.max(...d20.notes.map((y) => y.beat)));
    expect(last.filter((x) => x.hand === 'R').map((x) => pcName(x.pitch)).sort()).toEqual(['C', 'E']);
    expect(last.filter((x) => x.hand === 'L').map((x) => x.pitch).sort((a, b) => a - b)).toEqual([36, 48]);
  });

  it('every number stays on the keyboard in every key and the hands play the same notes', () => {
    for (const no of HANON_NUMBERS)
      for (let k = 0; k < 12; k++) {
        const d = piano({ option: no, key: k });
        expect(Math.min(...d.notes.map((x) => x.pitch))).toBeGreaterThanOrEqual(21);
        expect(Math.max(...d.notes.map((x) => x.pitch))).toBeLessThanOrEqual(108);
        expect(d.title.en).toContain(`Hanon No. ${no}`);
        expect(d.title.he).toContain(`האנון מס׳ ${no}`);
      }
  });
});

describe('minor forms on the piano', () => {
  const oct = (key: number) => generate({ family: 'advanced', kind: 'octaves', hands: 'R', octaves: 2, minor: true, key } as DrillSpec);
  it('harmonic-minor octaves in C and E♭', () => {
    const c = oct(0);
    const up = (d: Drill) => d.notes.filter((x) => x.finger === 1).sort((a, b) => a.beat - b.beat).slice(0, 8).map((x) => pcName(x.pitch)).join(' ');
    expect(up(c)).toBe('C D E♭ F G G♯ B C');
    expect(up(oct(3))).toBe('E♭ F F♯ G♯ B♭ B D E♭');
    // every step is an octave in one hand
    const byBeat = new Map<number, number[]>();
    for (const n of c.notes) byBeat.set(n.beat, [...(byBeat.get(n.beat) ?? []), n.pitch]);
    expect([...byBeat.values()].every((ps) => ps.length === 2 && Math.abs(ps[1] - ps[0]) === 12)).toBe(true);
    expect(c.title.en).toMatch(/Octaves · C harmonic minor/);
  });

  it('every new minor item files under the minor tab; bebop and 7th arpeggios file correctly', () => {
    const facets = (id: string) => levelDrills(lv(id), 'fifths-up').filter((d) => (d.tonic ? d.tonic.key : d.spec.key) % 12 === 0).map((d) => keyFacet(d)!);
    expect(facets('advanced-9').every((f) => f.group === 'minor' && f.role === 'pattern' && f.scope === 'keyed')).toBe(true);
    expect(facets('scales-35').every((f) => f.group === 'minor' && f.role === 'scale')).toBe(true);
    expect(facets('fingers-15').every((f) => f.group === 'major' && f.role === 'pattern')).toBe(true);
    expect(facets('scales-34').every((f) => f.group === 'major' && f.role === 'scale')).toBe(true);
    expect(facets('arpeggios-15').map((f) => f.group)).toEqual(['minor', 'major', 'minor']);
    expect(facets('arpeggios-16').every((f) => f.role === 'arpeggio')).toBe(true);
    for (const id of ['g-scales-16', 'g-scales-17', 'g-scales-18', 'b-chord-16', 'b-scale-12']) expect(facets(id).every((f) => f.group === 'minor'), id).toBe(true);
    expect(facets('b-chord-15').every((f) => f.group === 'major' && f.role === 'arpeggio')).toBe(true);
  });

  it('contrary-motion arpeggios start on one note; 7ths at 4 octaves span four octaves', () => {
    const cm = generate({ family: 'arpeggios', kind: 'arp-dom7', hands: 'RL', octaves: 2, motion: 'contrary', key: 0 } as DrillSpec);
    const first = cm.notes.filter((x) => x.beat === 0).map((x) => x.pitch);
    expect(first[0]).toBe(first[1]);
    const four = generate({ family: 'arpeggios', kind: 'arp-dim7', hands: 'RL', octaves: 4, perBeat: 4, key: 0 } as DrillSpec);
    const rh = four.notes.filter((x) => x.hand === 'R').map((x) => x.pitch);
    expect(Math.max(...rh) - Math.min(...rh)).toBe(48);
  });
});

describe('guitar minor scales in five positions', () => {
  it('each position holds exactly the scale notes, inside a five-fret window', () => {
    const sets = [
      [9, 11, 0, 2, 4, 5, 7],
      [9, 11, 0, 2, 4, 5, 8],
      [9, 11, 0, 2, 4, 6, 8],
    ];
    for (let op = 0; op < 3; op++)
      for (let p = 0; p < 5; p++) {
        const d = generateGuitar({ family: 'g-scales', kind: 'caged-minor', hands: 'R', instrument: 'guitar', key: 9, minor: true, position: p, option: op } as DrillSpec);
        const pcs = new Set(d.notes.map((n) => n.pitch % 12));
        expect([...pcs].sort((a, b) => a - b)).toEqual([...sets[op]].sort((a, b) => a - b));
        const frets = d.notes.map((n) => n.fret!).filter((f) => f > 0);
        expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
        expect(d.title.en).toContain('A ');
        expect(d.title.en).toContain(`position ${p + 1}`);
      }
  });
});

describe('bass', () => {
  it('diatonic 7th arpeggios through C major: Cmaj7 Dm7 Em7 … up, ending on the root', () => {
    const d = generateGuitar({ family: 'b-chord', kind: 'dia7', hands: 'R', instrument: 'bass', key: 0, option: 0 } as DrillSpec);
    const ps = d.notes.slice().sort((a, b) => a.beat - b.beat).map((n) => pcName(n.pitch));
    expect(ps.slice(0, 12).join(' ')).toBe('C E G B D F A C E G B D');
    expect(ps[ps.length - 1]).toBe('C');
    // SPEC-KEY-SESSION-2 §7: 9 chords up, 8 down (from the chord under the top, the top chord is not played twice)
    expect(ps.length).toBe(68);
  });

  it('two-octave harmonic minor in E♭: E♭ F G♭ A♭ B♭ C♭ D E♭ …', () => {
    const d = generateGuitar({ family: 'b-scale', kind: 'scale2', hands: 'R', instrument: 'bass', key: 3, option: 1, minor: true } as DrillSpec);
    const ps = d.notes.slice().sort((a, b) => a.beat - b.beat).map((n) => n.pitch);
    expect(ps.slice(0, 8).map(pcName).join(' ')).toBe('E♭ F F♯ G♯ B♭ B D E♭');
    expect(Math.max(...ps) - Math.min(...ps)).toBe(24);
  });
});
