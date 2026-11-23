// SPEC-JAZZ-NEIGHBOURS §2, §3, §7.2–7.3: the Brazilian and Afro-Cuban band styles (band.ts) and the new piano / guitar
// families (latinStyles.ts), built only from the verified patterns of docs/research/STYLE-BRAZIL.md and
// STYLE-AFROCUBAN.md. These pin the rhythms to the research's grids.
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { techLevel } from '../src/engine/ladderFacts';
import { hasRubato } from '../src/engine/drills/rubato';
import { bandComping, claveOfGroove, tumbaoBass, type BandStyle } from '../src/engine/band';
import { parseChart } from '../src/engine/charts';
import { bandBass, bandHits, bandStyleOf } from '../src/engine/drills/bassBand';
import { drillDrumHits } from '../src/engine/drills/bandTimeline';
import { generateBass } from '../src/engine/drills/bass';
import { tuningById } from '../src/engine/fretboard';
import { COURSE_SECTIONS } from '../src/engine/courseSections';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { strandsFor } from '../src/engine/drills/levelTest';
import { stepCatalogue } from '../src/engine/path';
import { JAZZ_FAMILIES } from '../src/engine/courses';
import type { Drill } from '../src/engine/drills/types';

const FAMS = ['k-brazil', 'k-montuno', 'g-brazil', 'g-guajeo'] as const;
const ALL = [...catalog(), ...guitarCatalog()];
const fam = (id: string) => ALL.find((f) => f.id === id)!;
const lvDrills = (id: string) => levelDrills(techLevel(id)!, 'fifths-up');
const pc = (k: number) => ((k % 12) + 12) % 12;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** Distinct onsets of a hand inside bar `bar` (beats from the bar's start). */
const onsets = (d: Drill, bar: number, hand?: 'R' | 'L', meter = d.meter): number[] =>
  [...new Set(d.notes.filter((n) => (!hand || n.hand === hand) && n.beat >= bar * meter - 1e-6 && n.beat < (bar + 1) * meter - 1e-6).map((n) => +(n.beat - bar * meter).toFixed(4)))].sort((a, b) => a - b);

describe('the families', () => {
  it('four families, every level tagged with its style, all 12 keys, none jazz-gated', { timeout: 120_000 }, () => {
    const want = { 'k-brazil': [14, 'brazil'], 'k-montuno': [11, 'afrocuban'], 'g-brazil': [11, 'brazil'], 'g-guajeo': [9, 'afrocuban'] } as const;
    for (const f of FAMS) {
      const F = fam(f);
      expect(F.levels.length, f).toBe(want[f][0]);
      expect(F.styleId, f).toBe(want[f][1]);
      expect(F.style, f).toBe('both');
      expect(JAZZ_FAMILIES, f).not.toContain(f);
      for (const lv of F.levels) {
        expect(lv.style, lv.id).toBe(want[f][1]);
        const ds = levelDrills(lv, 'fifths-up');
        expect(new Set(ds.map((d) => pc(d.spec.key))).size, lv.id).toBe(12);
        for (const d of ds) {
          expect(d.notes.length, d.itemId).toBeGreaterThan(8);
          expect(d.spec.swing, d.itemId).toBeFalsy();
          expect(d.chart?.length, d.itemId).toBeGreaterThanOrEqual(8);
          for (const n of d.notes) {
            expect(Number.isFinite(n.beat) && n.dur > 0, d.itemId).toBe(true);
            // nothing held across a bar line
            const m = d.meter;
            expect(n.beat + n.dur <= (Math.floor(n.beat / m + 1e-9) + 1) * m + 1e-6, `${d.itemId} @${n.beat}`).toBe(true);
            if (f.startsWith('g-')) expect(n.fret! >= 0 && n.fret! <= 17, d.itemId).toBe(true);
            else expect(n.pitch >= 36 && n.pitch <= 84, d.itemId).toBe(true);
          }
        }
      }
    }
  });

  it('rubato first, then the tempo ladder; the "with the band" levels are groove drills (drums, count-in, click)', () => {
    for (const f of FAMS)
      for (const lv of fam(f).levels)
        for (const d of levelDrills(lv, 'fifths-up').slice(0, 1)) {
          const band = /band/.test(d.spec.kind);
          expect(!!d.drums, d.itemId).toBe(band);
          expect(hasRubato(d), d.itemId).toBe(!band);
          expect(lv.tempo![1], lv.id).toBeGreaterThan(lv.tempo![0]);
        }
  });

  it('wired: sections (skill map), step glyphs, badges per level, path steps, level test', () => {
    for (const f of FAMS) {
      const course = f.startsWith('k-') ? 'keys' : 'guitar';
      expect(COURSE_SECTIONS[course]!.filter((s) => s.families.includes(f)).length, f).toBe(1);
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeTruthy();
      expect(BADGES.filter((b) => b.id.startsWith(`tech:${f}:`)).length, f).toBe(fam(f).levels.length);
      for (const lv of fam(f).levels) expect(stepCatalogue().some((s) => s.id === `tech:${lv.id}`), lv.id).toBe(true);
    }
    const levels = [...strandsFor('piano', 'both'), ...strandsFor('piano', 'classical'), ...strandsFor('guitar', 'both')].flatMap((s) => s.rungs.map((r) => r.level));
    for (const id of ['k-brazil-3', 'k-montuno-6', 'g-brazil-5', 'g-guajeo-4']) expect(levels, id).toContain(id);
  });
});

describe('piano bossa and samba (STYLE-BRAZIL §1(b), §2.3)', () => {
  it('the left hand: root on 1, 5th on 3; the surdo pickups x..xx..x', () => {
    const d = lvDrills('k-brazil-1')[0];
    expect(d.notes.every((n) => n.hand === 'L')).toBe(true);
    expect(onsets(d, 0, 'L')).toEqual([0, 2]);
    expect(onsets(lvDrills('k-brazil-5')[0], 0, 'L')).toEqual([0, 1.5, 2, 3.5]);
  });
  it('F1 = 1, 2, the "and" of 3; the bossa-clave comp 3-2 and 2-3 (bars swapped)', () => {
    expect(onsets(lvDrills('k-brazil-2')[0], 1, 'R')).toEqual([0, 1, 2.5]);
    const a = lvDrills('k-brazil-3')[0];
    expect(onsets(a, 0, 'R')).toEqual([0, 1.5, 3]);
    expect(onsets(a, 1, 'R')).toEqual([1, 2.5]);
    const b = lvDrills('k-brazil-4')[0];
    expect(onsets(b, 0, 'R')).toEqual([1, 2.5]);
    expect(onsets(b, 1, 'R')).toEqual([0, 1.5, 3]);
  });
  it('anticipated changes: the new chord on the "and" before the bar line, nothing on its downbeat', () => {
    for (const d of lvDrills('k-brazil-6').slice(0, 12)) {
      const rh = d.notes.filter((n) => n.hand === 'R');
      for (let bar = 1; bar < 8; bar++) {
        if (d.chart![bar] === d.chart![bar - 1]) continue;
        expect(rh.some((n) => near(n.beat, bar * 4 - 0.5)), `${d.itemId} bar ${bar}`).toBe(true);
        expect(rh.some((n) => near(n.beat, bar * 4)), `${d.itemId} bar ${bar}`).toBe(false);
      }
    }
  });
  it('6/9 and 4ths: the stacks the research gives (3–6–9 on I; E A D G over D m7; F B E A over G7)', () => {
    const d = generate({ family: 'k-brazil', kind: 'bz-color', key: 0, hands: 'RL', option: 0 });
    const chordAt = (b: number) => d.notes.filter((n) => n.hand === 'R' && near(n.beat, b)).map((n) => pc(n.pitch)).sort((x, y) => x - y);
    expect(chordAt(0)).toEqual([2, 4, 7, 9].sort((x, y) => x - y)); // Dm7: E A D G
    expect(chordAt(4)).toEqual([4, 5, 9, 11].sort((x, y) => x - y)); // G7: F B E A
    expect(chordAt(8)).toEqual([2, 4, 9]); // Cmaj7: E A D
  });
  it('samba in 2/4: the surdo accent on 2, F1 on the 16th grid, chords a 16th early', () => {
    const s = lvDrills('k-brazil-10')[0];
    expect(s.meter).toBe(2);
    expect(s.notes.filter((n) => n.accent).every((n) => near(n.beat % 2, 1))).toBe(true);
    expect(onsets(lvDrills('k-brazil-10')[1], 0, 'L')).toEqual([0, 0.75, 1, 1.75]);
    expect(onsets(lvDrills('k-brazil-11')[0], 1, 'R')).toEqual([0, 0.5, 1.25]);
    const a = lvDrills('k-brazil-12')[0];
    expect(a.notes.some((n) => n.hand === 'R' && near(n.beat % 2, 1.75))).toBe(true);
  });
  it('the band levels play the groove in the comp\'s clave direction', () => {
    const [b32, b23] = lvDrills('k-brazil-13').filter((d, i, a) => a.findIndex((x) => x.spec.option === d.spec.option) === i);
    expect(b32.drums!.groove).toBe('bossa');
    expect(b23.drums!.groove).toBe('bossa-23');
    expect(lvDrills('k-brazil-14')[0].drums!.groove).toBe('samba');
  });
});

describe('the montuno (STYLE-AFROCUBAN §2.1): the three-side bar on the offbeats', () => {
  it('2-3 starts on the onbeat bar, 3-2 on the offbeat bar', () => {
    const d23 = generate({ family: 'k-montuno', kind: 'mt-ponch', key: 0, hands: 'R', option: 0 });
    expect(onsets(d23, 0)).toEqual([0, 1, 2, 3]);
    expect(onsets(d23, 1)).toEqual([0.5, 1.5, 2.5, 3.5]);
    const d32 = generate({ family: 'k-montuno', kind: 'mt-ponch', key: 0, hands: 'R', option: 10 });
    expect(onsets(d32, 0)).toEqual([0.5, 1.5, 2.5, 3.5]);
    expect(onsets(d32, 1)).toEqual([0, 1, 2, 3]);
  });
  it('the broken figure: octaves on the line, inner tones between; I–IV–V–IV a chord a half bar; the LH doubles the line', () => {
    const d = generate({ family: 'k-montuno', kind: 'mt-hands', key: 0, hands: 'RL', option: 2 });
    const rh = (b: number) => d.notes.filter((n) => n.hand === 'R' && near(n.beat, b)).map((n) => n.pitch).sort((x, y) => x - y);
    const oct = rh(0);
    expect(oct.length).toBe(2);
    expect(oct[1] - oct[0]).toBe(12);
    expect(pc(oct[1])).toBe(7); // starts on the 5th of I
    expect(rh(1).every((p) => p > oct[0] && p < oct[1])).toBe(true);
    expect(rh(1).map(pc).sort()).toEqual([0, 4]);
    expect([5, 9, 0]).toContain(pc(rh(2)[1])); // IV on beat 3
    const lh = d.notes.filter((n) => n.hand === 'L' && near(n.beat, 0));
    expect(lh.length).toBe(1);
    expect(pc(lh[0].pitch)).toBe(7);
  });
  it('with the band: the clave groove matches the direction, the band\'s piano lays out, a tumbao plays', () => {
    for (const d of lvDrills('k-montuno-11').slice(0, 6)) {
      const dir = Math.floor(d.spec.option! / 10) % 2 ? '32' : '23';
      expect(claveOfGroove(d.drums!.groove)).toBe(dir);
      // the offbeat bar of the montuno is the bar where the clave plays three strokes
      const rim = drillDrumHits(d).filter((h) => h.d === 'r');
      for (const bar of [0, 1]) {
        const strokes = rim.filter((h) => h.beat >= bar * 4 && h.beat < bar * 4 + 4).length;
        const off = onsets(d, bar, 'R').every((b) => b % 1 !== 0);
        expect(off, `${d.itemId} bar ${bar}`).toBe(strokes === 3);
      }
      expect(bandHits(d)).toEqual([]);
      const bass = bandBass(d);
      expect(bass.length).toBeGreaterThan(8);
      expect(bass.every((n) => near(n.beat % 4, 1.5) || near(n.beat % 4, 3))).toBe(true);
    }
  });
  it('songo: the right hand on the four beats', () => {
    const d = lvDrills('k-montuno-10')[0];
    for (const bar of [0, 1, 2, 3]) expect(onsets(d, bar, 'R')).toEqual([0, 1, 2, 3]);
  });
});

describe('guitar: the batida and the guajeo', () => {
  it('the thumb on 1 and 3 (root, then root–5th), the fingers F1 over it', () => {
    const t1 = lvDrills('g-brazil-1')[0];
    expect(t1.notes.filter((n) => n.beat < 32).every((n) => n.stroke === 'p')).toBe(true);
    expect(onsets(t1, 0)).toEqual([0, 2]);
    const t2 = generate({ family: 'g-brazil', kind: 'gb-thumb', key: 0, hands: 'R', option: 10, instrument: 'guitar' });
    const th = t2.notes.filter((n) => n.stroke === 'p' && n.beat < 4).map((n) => n.pitch);
    expect(pc(th[1] - th[0])).toBe(7);
    const f1 = generate({ family: 'g-brazil', kind: 'gb-f1', key: 0, hands: 'R', option: 0, instrument: 'guitar' });
    const fingers = (bar: number) => [...new Set(f1.notes.filter((n) => n.stroke !== 'p' && n.beat >= bar * 4 && n.beat < bar * 4 + 4).map((n) => n.beat - bar * 4))].sort((a, b) => a - b);
    expect(fingers(1)).toEqual([0, 1, 2.5]);
    // the grip of the first chord (D m7, root on 5: R–♭3–♭7–9 or on 6: R–♭7–♭3–5)
    const g0 = f1.notes.filter((n) => near(n.beat, 0)).map((n) => pc(n.pitch - 2)).sort((a, b) => a - b);
    expect([[0, 2, 3, 10], [0, 3, 7, 10]].map((x) => x.join())).toContain([...new Set(g0)].join());
  });
  it('samba: the thumb on one repeated note, the accent on 2', () => {
    const d = lvDrills('g-brazil-9')[0];
    expect(d.meter).toBe(2);
    const th = d.notes.filter((n) => n.stroke === 'p' && n.beat < 2);
    expect(th.map((n) => n.beat)).toEqual([0, 1]);
    expect(th[0].pitch).toBe(th[1].pitch);
    expect(th[1].accent).toBe(true);
  });
  it('the guajeo: single notes on strings 3-2-1, the three-side bar on the offbeats', () => {
    const d = generate({ family: 'g-guajeo', kind: 'gg-one', key: 0, hands: 'R', option: 0, instrument: 'guitar' });
    expect(onsets(d, 0)).toEqual([0, 1, 2, 3]);
    expect(onsets(d, 1)).toEqual([0.5, 1.5, 2.5, 3.5]);
    expect(d.notes.filter((n) => n.beat < 32).every((n) => [1, 2, 3].includes(n.string!))).toBe(true);
    expect(new Set(d.notes.filter((n) => n.beat < 32).map((n) => pc(n.pitch)))).toEqual(new Set([0, 4, 7]));
  });
});

describe('the band (band.ts): real styles, clave-aware', () => {
  const p = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7');
  const bar = (hits: { beat: number }[], b: number) => [...new Set(hits.filter((h) => h.beat >= b * 4 - 1e-6 && h.beat < b * 4 + 4 - 1e-6).map((h) => +(h.beat - b * 4).toFixed(3)))];
  it('the clave direction comes from the groove\'s two-bar rim lane', () => {
    expect(claveOfGroove('clave-32')).toBe('32');
    expect(claveOfGroove('clave-23')).toBe('23');
    expect(claveOfGroove('bossa')).toBe('32');
    expect(claveOfGroove('bossa-23')).toBe('23');
    expect(claveOfGroove('swing')).toBeNull();
    expect(claveOfGroove('tumbao')).toBeNull();
  });
  it('mambo: the three-side bar on the offbeats, chosen per two-bar cycle; barOffset keeps it on the drums\' cycle', () => {
    const h32 = bandComping(p, 4, 32, 'mambo', 7, { clave: '32' });
    expect(bar(h32, 0).every((b) => b % 1 !== 0)).toBe(true);
    expect(bar(h32, 1).every((b) => b % 1 === 0)).toBe(true);
    const h23 = bandComping(p, 4, 32, 'mambo', 7, { clave: '23' });
    expect(bar(h23, 0).every((b) => b % 1 === 0)).toBe(true);
    expect(bar(h23, 1).every((b) => b % 1 !== 0)).toBe(true);
    const shifted = bandComping(p, 4, 32, 'mambo', 7, { clave: '32', barOffset: 1 });
    expect(bar(shifted, 0).every((b) => b % 1 === 0)).toBe(true);
    // 'latin' stays a valid id: the same clave-aware montuno
    expect(bar(bandComping(p, 4, 32, 'latin', 7, { clave: '32' }), 0).every((b) => b % 1 !== 0)).toBe(true);
  });
  it('bossa: the figures rotate per two bars (F2 in the clave direction, F1, F4) and the changes are anticipated', () => {
    const h = bandComping(p, 4, 32, 'bossa', 11);
    const cells = new Set([0, 2, 4, 6].map((b) => bar(h, b).join()));
    expect(cells.size).toBeGreaterThan(1);
    expect(h.some((x) => near(x.beat % 4, 3.5))).toBe(true);
    // every hit is an F1 / F2 / F4 point, or the anticipation
    const ok = new Set([0, 1, 1.5, 2.5, 3, 0.5, 3.5]);
    expect(h.every((x) => ok.has(+(x.beat % 4).toFixed(3)))).toBe(true);
  });
  it('samba in 2/4 halves, chords a 16th early; songo on the beats; bolero 8ths; 6/8 on the dotted quarters', () => {
    const s = bandComping(p, 4, 32, 'samba', 3);
    expect(s.every((x) => [0, 0.5, 0.75, 1.25, 1.5, 1.75].includes(+(x.beat % 2).toFixed(3)))).toBe(true);
    expect(s.some((x) => near(x.beat % 2, 1.75))).toBe(true);
    expect(bar(bandComping(p, 4, 32, 'songo', 3), 2)).toEqual([0, 1, 2, 3]);
    expect(bar(bandComping(p, 4, 32, 'bolero', 3), 1).length).toBe(8);
    expect(bandComping(p, 4, 32, 'bolero', 3).every((x) => x.notes.length === 1)).toBe(true);
    expect(bar(bandComping(p, 4, 32, 'afro68', 3), 1)).toEqual([0, 1, 2, 3]);
    const all: BandStyle[] = ['samba', 'baiao', 'chacha', 'mambo', 'bolero', 'songo', 'afro68', 'latin', 'bossa'];
    for (const st of all) expect(bandComping(p, 4, 32, st, 1).length, st).toBeGreaterThan(8);
  });
  it('the tumbao: the "and" of 2 and 4, the 4 already the next chord', () => {
    const t = tumbaoBass(p, 4, 32);
    expect(t.filter((n) => near(n.beat % 4, 3)).map((n) => pc(n.midi)).slice(0, 2)).toEqual([7, 0]); // G under Dm7's 4, C under G7's
    expect(t.every((n) => near(n.beat % 4, 1.5) || near(n.beat % 4, 3))).toBe(true);
  });
  it('the Latin grooves call for their own styles; b-latin drills play them in the drums\' clave', () => {
    expect(bandStyleOf('cha-cha')).toBe('chacha');
    expect(bandStyleOf('songo')).toBe('songo');
    expect(bandStyleOf('samba')).toBe('samba');
    expect(bandStyleOf('6-8-afro')).toBe('afro68');
    const tu = tuningById('bass');
    const t32 = generateBass({ family: 'b-latin', kind: 'tumbao', key: 9, hands: 'R', minor: true }, tu);
    expect(t32.band!.style).toBe('mambo');
    const hits = bandHits(t32);
    expect(bar(hits, 0).every((b) => b % 1 !== 0)).toBe(true);
    const t23 = generateBass({ family: 'b-latin', kind: 'tumbao23', key: 9, hands: 'R', minor: true }, tu);
    expect(bar(bandHits(t23), 0).every((b) => b % 1 === 0)).toBe(true);
    expect(generateBass({ family: 'b-latin', kind: 'chacha', key: 0, hands: 'R' }, tu).band!.style).toBe('chacha');
    expect(generateBass({ family: 'b-latin', kind: 'brazil', key: 0, hands: 'R', option: 1, perBeat: 4 }, tu).band!.style).toBe('baiao');
  });
});
