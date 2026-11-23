// SPEC-JAZZ-NEIGHBOURS §4–§6: the soul-jazz / gospel / funk-jazz and New Orleans band styles (band.ts, styleBand.ts),
// the new families (soulStyles.ts, nolaStyles.ts, oddJazz.ts), the organ technique rows (colorDrills.ts) and the
// second line's bass drum (d-funk 9), built only from the verified patterns of docs/research/STYLE-SOUL.md,
// STYLE-NEW-ORLEANS.md and STYLE-MEDITERRANEAN-TOUCH.md. These pin the patterns to the research.
import { describe, expect, it } from 'vitest';
import { GROOVES } from '../src/engine/grooves';
import { allDrumFamilies, drumFamilies, generateDrums } from '../src/engine/drills/drums';
import { DRUM_STYLES, STYLE_POOL, LOOK_ALIKES } from '../src/engine/topicsDrumStyle';
import { isVerified } from '../src/engine/verifiedContent';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { techLevel } from '../src/engine/ladderFacts';
import { hasRubato } from '../src/engine/drills/rubato';
import { bandComping, funkBass, guideTones, twoFeelBass } from '../src/engine/band';
import { parseChart } from '../src/engine/charts';
import { bandBass, bandHits, bandStyleOf } from '../src/engine/drills/bassBand';
import { styledBacking } from '../src/engine/styleBand';
import { STYLE_BANDS, STYLE_CHART, styleOfLevel } from '../src/engine/styles';
import { CHART_SETS } from '../src/engine/drills/chartDrills';
import { COURSE_SECTIONS } from '../src/engine/courseSections';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { strandsFor } from '../src/engine/drills/levelTest';
import { stepCatalogue } from '../src/engine/path';
import { JAZZ_FAMILIES } from '../src/engine/courses';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNITS } from '../src/content/mini/pathWiring';
import type { Drill } from '../src/engine/drills/types';

const ALL = [...catalog(), ...guitarCatalog()];
const fam = (id: string) => ALL.find((f) => f.id === id)!;
const lvDrills = (id: string) => levelDrills(techLevel(id)!, 'fifths-up');
const pc = (k: number) => ((k % 12) + 12) % 12;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const at = (d: Drill, beat: number, hand?: 'R' | 'L') => d.notes.filter((n) => near(n.beat, beat) && (!hand || n.hand === hand)).map((n) => n.pitch).sort((a, b) => a - b);
const onsets = (d: Drill, bar: number, hand?: 'R' | 'L', meter = d.meter): number[] =>
  [...new Set(d.notes.filter((n) => (!hand || n.hand === hand) && n.beat >= bar * meter - 1e-6 && n.beat < (bar + 1) * meter - 1e-6).map((n) => +(n.beat - bar * meter).toFixed(4)))].sort((a, b) => a - b);

const FAMS: Record<string, [number, string]> = {
  'k-gospel': [14, 'soul'],
  'k-souljazz': [7, 'soul'],
  'k-nola': [9, 'neworleans'],
  'k-odd': [7, 'jazz'],
  'g-soul': [6, 'soul'],
  'b-soul': [6, 'soul'],
  'b-nola': [5, 'neworleans'],
};

describe('the families', () => {
  it('every level tagged with its style, all 12 keys, none jazz-gated, playable', { timeout: 180_000 }, () => {
    for (const [f, [n, st]] of Object.entries(FAMS)) {
      const F = fam(f);
      expect(F.levels.length, f).toBe(n);
      expect(F.styleId, f).toBe(st);
      expect(JAZZ_FAMILIES, f).not.toContain(f);
      for (const lv of F.levels) {
        expect(lv.style, lv.id).toBe(st);
        expect(styleOfLevel(lv, F), lv.id).toBe(st);
        const ds = levelDrills(lv, 'fifths-up');
        expect(new Set(ds.map((d) => pc(d.spec.key))).size, lv.id).toBe(12);
        for (const d of ds) {
          expect(d.notes.length, d.itemId).toBeGreaterThan(8);
          expect(d.chart?.length, d.itemId).toBeGreaterThanOrEqual(8);
          for (const n of d.notes) {
            expect(Number.isFinite(n.beat) && n.dur > 0, d.itemId).toBe(true);
            if (f.startsWith('g-')) expect(n.fret! >= 0 && n.fret! <= 17, d.itemId).toBe(true);
            else if (f.startsWith('b-')) expect(n.pitch >= 28 && n.pitch <= 60, `${d.itemId} ${n.pitch}`).toBe(true);
            // (the stride left hand of chartDrills.ts and the gospel octaves reach down to G1)
            else expect(n.pitch >= 28 && n.pitch <= 84, `${d.itemId} ${n.pitch}`).toBe(true);
          }
        }
      }
    }
  });

  it('rubato first, then the tempo ladder; the "with the band" levels are groove drills (drums, count-in, click)', () => {
    for (const f of Object.keys(FAMS))
      for (const lv of fam(f).levels)
        for (const d of levelDrills(lv, 'fifths-up').slice(0, 1)) {
          const band = /band/.test(d.spec.kind);
          expect(!!d.drums, d.itemId).toBe(band);
          if (!f.startsWith('b-')) expect(hasRubato(d), d.itemId).toBe(!band);
          expect(lv.tempo![1], lv.id).toBeGreaterThan(lv.tempo![0]);
        }
  });

  it('wired: sections (skill map), step glyphs, badges per level, path steps, level test, a teaching screen', () => {
    const courseOf = (f: string) => (f.startsWith('k-') ? 'keys' : f.startsWith('g-') ? 'guitar' : 'bass');
    for (const f of Object.keys(FAMS)) {
      expect(COURSE_SECTIONS[courseOf(f)]!.filter((s) => s.families.includes(f)).length, f).toBe(1);
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeTruthy();
      if (!f.startsWith('b-')) expect(BADGES.filter((b) => b.id.startsWith(`tech:${f}:`)).length, f).toBe(fam(f).levels.length);
      for (const lv of fam(f).levels) expect(stepCatalogue().some((s) => s.id === `tech:${lv.id}`), lv.id).toBe(true);
      expect(MINI_LESSONS[UNITS[`tech:${f}`]], f).toBeTruthy();
    }
    const levels = [...strandsFor('piano', 'both'), ...strandsFor('piano', 'classical'), ...strandsFor('guitar', 'both'), ...strandsFor('bass', 'both')].flatMap((s) => s.rungs.map((r) => r.level));
    for (const id of ['k-gospel-5', 'k-souljazz-2', 'k-nola-2', 'k-odd-3', 'g-soul-2', 'b-soul-1', 'b-nola-1']) expect(levels, id).toContain(id);
    expect(BADGES.filter((b) => b.id.startsWith('tech:k-organ:')).length).toBe(fam('k-organ').levels.length);
  });
});

describe('gospel piano (STYLE-SOUL §1, owner additions)', () => {
  it('IV/I over the tonic: RH 3–5–1 ↔ 4–6–1, the tonic on top, the bass held on 1', () => {
    for (const key of [0, 3, 8]) {
      const d = generate({ family: 'k-gospel', kind: 'gs-plagal', key, hands: 'RL', option: 0 });
      expect(at(d, 0, 'R').map((p) => pc(p - key))).toEqual([4, 7, 0]);
      expect(at(d, 4, 'R').map((p) => pc(p - key))).toEqual([5, 9, 0]);
      expect(Math.max(...at(d, 0, 'R'))).toBe(Math.max(...at(d, 4, 'R')));
      expect(new Set(d.notes.filter((n) => n.hand === 'L').map((n) => pc(n.pitch - key)))).toEqual(new Set([0]));
    }
  });
  it('rocking through the inversions: every voice moves by step at most, the top voice by step, the bass the lowest note', () => {
    for (const option of [0, 1, 2])
      for (const key of [0, 6]) {
        const d = generate({ family: 'k-gospel', kind: 'gs-rock', key, hands: 'RL', option });
        const tops: number[] = [];
        for (let b = 0; b < 28; b += 2) {
          const a = at(d, b, 'R');
          const nx = at(d, b + 2, 'R');
          expect(a.length).toBe(3);
          if (b % 4 === 0) for (let i = 0; i < 3; i++) expect(Math.abs(nx[i] - a[i]), `${d.itemId} @${b}`).toBeLessThanOrEqual(2);
          expect(pc(at(d, b, 'L')[0])).toBe(pc(a[0]));
          tops.push(a[2]);
        }
        // the positions climb, then come back down
        expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThanOrEqual(7);
      }
    // I–ii pairs: C(C E G) → Dm(D F A); I–IV: C → F/C (C F A)
    const ii = generate({ family: 'k-gospel', kind: 'gs-rock', key: 0, hands: 'RL', option: 1 });
    expect(at(ii, 0, 'R').map(pc)).toEqual([0, 4, 7]);
    expect(at(ii, 2, 'R').map(pc)).toEqual([2, 5, 9]);
    const iv = generate({ family: 'k-gospel', kind: 'gs-rock', key: 0, hands: 'RL', option: 0 });
    expect(at(iv, 2, 'R').map(pc)).toEqual([0, 5, 9]);
    expect(iv.chart!.slice(0, 3)).toEqual(['C F/C', 'C/E F', 'C/G F/A']);
  });
  it('the minor plagal: the 6 falls to ♭6 and then 5 in an inner voice', () => {
    const d = generate({ family: 'k-gospel', kind: 'gs-minor', key: 0, hands: 'RL', option: 0 });
    expect(at(d, 8, 'R').map(pc)).toContain(9); // IV: A
    expect(at(d, 12, 'R').map(pc)).toContain(8); // iv: A♭
    expect(at(d, 16, 'R').map(pc)).toContain(7); // I: G
    expect(at(d, 16, 'R').map(pc)).not.toContain(8);
  });
  it('the walk-ups: the bass 1–2–3–4 and 2–3–♯4–5', () => {
    const w1 = generate({ family: 'k-gospel', kind: 'gs-walk', key: 0, hands: 'RL', option: 0 });
    expect([0, 2, 3, 4].map((b) => pc(at(w1, b, 'L')[0]))).toEqual([0, 2, 4, 5]);
    expect(w1.chart![0]).toBe('C B♭/D C/E');
    const w2 = generate({ family: 'k-gospel', kind: 'gs-walk', key: 0, hands: 'RL', option: 1 });
    expect([0, 2, 3, 4].map((b) => pc(at(w2, b, 'L')[0]))).toEqual([2, 4, 6, 7]);
  });
  it('IV/V = V9sus4; the sus falls to the 3rd with the other voices held; ♭III7–III7–IV; ♯iv°7 between IV and I/5', () => {
    const s = generate({ family: 'k-gospel', kind: 'gs-sus', key: 0, hands: 'RL', option: 1 });
    const sus = at(s, 0, 'R');
    const nine = at(s, 2, 'R');
    expect(sus.map(pc).sort()).toEqual([0, 5, 9]);
    expect(nine.filter((p) => !sus.includes(p)).map(pc)).toEqual([11]);
    expect(sus.filter((p) => !nine.includes(p)).map(pc)).toEqual([0]);
    expect(pc(at(s, 0, 'L')[0])).toBe(7);
    const c = generate({ family: 'k-gospel', kind: 'gs-chrom', key: 0, hands: 'RL', option: 0 });
    expect([4, 6, 8].map((b) => pc(at(c, b, 'L')[0]))).toEqual([3, 4, 5]);
    const dim = generate({ family: 'k-gospel', kind: 'gs-dim', key: 0, hands: 'RL', option: 0 });
    expect([0, 4, 8].map((b) => pc(at(dim, b, 'L')[0]))).toEqual([5, 6, 7]);
    // octave approaches from two half steps away into each new bass note
    const oct = generate({ family: 'k-gospel', kind: 'gs-dim', key: 0, hands: 'RL', option: 1 });
    const lh = oct.notes.filter((n) => n.hand === 'L');
    expect(lh.filter((n) => near(n.beat, 0)).length).toBe(2);
  });
  it('1–6–2–5 with an altered VI7 (and VII7 → VI7); VI7sus–♭VI7–II7–V7', () => {
    const a = generate({ family: 'k-gospel', kind: 'gs-1625', key: 0, hands: 'RL', option: 1 });
    expect(a.chart!.slice(0, 4)).toEqual(['C', 'B7 A7♭9', 'Dm7', 'G7']);
    expect(at(a, 6, 'R').map(pc)).toContain(10); // A7♭9: the B♭
    const tr = generate({ family: 'k-gospel', kind: 'gs-trit', key: 0, hands: 'RL', option: 0 });
    expect(tr.chart!.slice(1, 3)).toEqual(['A7sus4 A♭7', 'D7 G7']);
  });
  it('grace notes a half step below the 3rds; the gospel scales without the 7th; the 12/8 triplets', () => {
    const g = generate({ family: 'k-gospel', kind: 'gs-grace', key: 0, hands: 'RL', option: 0 });
    const graced = g.notes.filter((n) => n.graces?.length);
    expect(graced.length).toBeGreaterThan(6);
    for (const n of graced) {
      expect(n.graces![0].pitch).toBe(n.pitch - 1);
      expect([4, 9]).toContain(pc(n.pitch));
    }
    for (const key of [0, 5, 11]) {
      const s0 = generate({ family: 'k-gospel', kind: 'gs-scale', key, hands: 'RL', option: 0 });
      const s1 = generate({ family: 'k-gospel', kind: 'gs-scale', key, hands: 'RL', option: 1 });
      const r0 = new Set(s0.notes.filter((n) => n.hand === 'R').map((n) => pc(n.pitch - key)));
      const r1 = new Set(s1.notes.filter((n) => n.hand === 'R').map((n) => pc(n.pitch - key)));
      expect([...r0].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9]);
      expect([...r1].sort((a, b) => a - b)).toEqual([0, 2, 3, 4, 7, 9]);
    }
    const t = lvDrills('k-gospel-13')[0];
    expect(onsets(t, 1, 'R').length).toBe(12);
    expect(onsets(t, 1, 'L')).toEqual([0, 1, 2, 3]);
    expect(lvDrills('k-gospel-14')[0].drums!.groove).toBe('slow-blues');
  });
});

describe('soul-jazz comping and funk (STYLE-SOUL §2–§4)', () => {
  it('the chart sets: the I7–IV7 vamp, the blues with ii–V in bars 4, 8, 10, 12, the altered dominants, the minor blues', () => {
    const b = parseChart(CHART_SETS['sj-blues'].text);
    expect(b.bars).toBe(12);
    for (const bar of [3, 7, 11]) expect(b.chords.filter((c) => c.bar === bar).length).toBe(2);
    expect(b.chords.find((c) => c.bar === 8)!.iv).toEqual([0, 3, 7, 10]);
    expect(parseChart(CHART_SETS['sj-blues-alt'].text).chords.filter((c) => c.iv.some((x) => [13, 15, 20].includes(x))).length).toBe(4);
    expect(parseChart(CHART_SETS['nola-p2'].text).chords.find((c) => c.bar === 4)!.bass).toBe(7);
  });
  it('k-souljazz: the Charleston (1 and the swung "and" of 2) in two-note guide tones; the band level plays the shuffle under a walking bass', () => {
    const d = lvDrills('k-souljazz-1')[0];
    expect(onsets(d, 0)).toEqual([0, 1.5]);
    expect(d.spec.swing).toBe(true);
    const b = lvDrills('k-souljazz-7')[0];
    expect(b.drums!.groove).toBe('shuffle');
    expect(b.band!.style).toBe('souljazz');
    expect(bandHits(b)).toEqual([]);
    expect(bandBass(b).length).toBeGreaterThan(30);
  });
  it('g-soul: guide tones in the Charleston; funk — the chord on every downbeat, dead strokes on the other 16ths, the 9 grip R–3–♭7–9–5', () => {
    const c = generate({ family: 'g-soul', kind: 'gsj-guide', key: 0, hands: 'R', option: 0, instrument: 'guitar' });
    const first = c.notes.filter((n) => near(n.beat, 0));
    expect(first.length).toBe(2);
    expect(first.map((n) => pc(n.pitch)).sort((a, b) => a - b)).toEqual([4, 10]);
    expect(onsets(c, 1)).toEqual([0, 1.5]);
    const f = generate({ family: 'g-soul', kind: 'gsj-funk', key: 0, hands: 'R', option: 0, instrument: 'guitar' });
    expect(onsets(f, 0).length).toBe(16);
    const down = f.notes.filter((n) => near(n.beat, 1));
    expect(down.some((n) => n.technique === 'dead')).toBe(false);
    expect(new Set(down.map((n) => pc(n.pitch)))).toEqual(new Set([0, 4, 10, 2, 7]));
    expect(f.notes.filter((n) => near(n.beat, 1.25)).every((n) => n.technique === 'dead')).toBe(true);
    const m = generate({ family: 'g-soul', kind: 'gsj-funk', key: 0, hands: 'R', option: 1, instrument: 'guitar' });
    expect(new Set(m.notes.filter((n) => near(n.beat, 0)).map((n) => pc(n.pitch)))).toEqual(new Set([0, 7, 10, 3]));
    expect(generate({ family: 'g-soul', kind: 'gsj-band', key: 0, hands: 'R', option: 1, instrument: 'guitar' }).drums!.groove).toBe('funk-1');
  });
  it('b-soul: the boogie figure R–3–5–6–♭7–6–5–3; the walk-ups; funk with the one and dead notes', () => {
    const b = generate({ family: 'b-soul', kind: 'bs-boogie', key: 0, hands: 'R', instrument: 'bass', swing: true });
    const bar0 = b.notes.filter((n) => n.beat < 4).map((n) => pc(n.pitch));
    expect(bar0).toEqual([0, 4, 7, 9, 10, 9, 7, 4]);
    const w = generate({ family: 'b-soul', kind: 'bs-walkup', key: 0, hands: 'R', instrument: 'bass', option: 1, perBeat: 1 });
    expect(w.notes.filter((n) => n.beat < 8).map((n) => pc(n.pitch))).toEqual([2, 4, 6, 7]);
    const f = generate({ family: 'b-soul', kind: 'bs-funk', key: 0, hands: 'R', instrument: 'bass', option: 0, perBeat: 4, minor: true });
    expect(f.notes.filter((n) => n.technique === 'dead').length).toBe(32);
    expect(f.notes.find((n) => near(n.beat, 0))!.accent).toBe(true);
  });
  it('k-organ technique: detached stabs over the walk, a held root, slides into the 3rds, a legato pad', () => {
    const s = lvDrills('k-organ-8')[0];
    expect(s.sound).toBe('tonewheel');
    expect(s.goal.handArt).toEqual({ R: 'staccato' });
    expect(onsets(s, 0, 'R')).toEqual([0, 1.5]);
    expect(onsets(s, 0, 'L')).toEqual([0, 1, 2, 3]);
    const h = lvDrills('k-organ-10')[0];
    const held = h.notes.filter((n) => n.hold);
    expect(held.length).toBe(1);
    expect(held[0].dur).toBe(32);
    expect(h.goal.holds).toBe(0.8);
    const sl = lvDrills('k-organ-11')[0];
    expect(sl.notes.filter((n) => n.graces?.length).length).toBeGreaterThanOrEqual(8);
    expect(lvDrills('k-organ-9')[0].goal.lengths).toBe(true);
  });
});

describe('New Orleans (STYLE-NEW-ORLEANS §1–§2)', () => {
  it('k-nola: stride over P1 / P2 and the three boogie figures in all 12 keys; the band level is timed with the drums', () => {
    const s = lvDrills('k-nola-1')[0];
    expect(s.chart!.slice(0, 4).join(' ')).toMatch(/^[A-G][♭♯b#]? [A-G][♭♯b#]?7 [A-G][♭♯b#]?7 [A-G][♭♯b#]?7$/);
    for (const id of ['k-nola-6', 'k-nola-7', 'k-nola-8']) expect(new Set(lvDrills(id).map((d) => pc(d.spec.key))).size).toBe(12);
    const b = lvDrills('k-nola-9');
    expect(new Set(b.map((d) => d.drums!.groove))).toEqual(new Set(['swing', 'shuffle']));
  });
  it('b-nola: the root on 1 and the 5th on 3 (the I/5 bar stays on the 5th); the trad band and the second line', () => {
    const d = generate({ family: 'b-nola', kind: 'bn-two', key: 0, hands: 'R', instrument: 'bass', option: 0, perBeat: 0.5 });
    expect(d.notes.filter((n) => n.beat < 8).map((n) => pc(n.pitch))).toEqual([0, 7, 9, 4]);
    const p2 = generate({ family: 'b-nola', kind: 'bn-two', key: 0, hands: 'R', instrument: 'bass', option: 1, perBeat: 0.5 });
    expect(p2.notes.filter((n) => n.beat >= 16 && n.beat < 20).map((n) => pc(n.pitch))).toEqual([7, 7]);
    const sl = generate({ family: 'b-nola', kind: 'bn-band', key: 0, hands: 'R', instrument: 'bass', option: 1, perBeat: 0.5 });
    expect(sl.drums!.groove).toBe('second-line-3');
    expect(sl.band!.style).toBe('secondline');
    expect(bandHits(sl)).toEqual([]);
  });
  it('the second line on drums: the bass drum only — the march pulse on 1 and 3, the tresillo 3+3+2; tagged New Orleans', () => {
    const lv = techLevel('d-funk-9')!;
    expect(styleOfLevel(lv, fam('d-funk'))).toBe('neworleans');
    const [p, t3] = levelDrills(lv, 'fifths-up');
    expect(p.notes.every((n) => n.voice === 'kick')).toBe(true);
    expect(onsets(p, 0)).toEqual([0, 2]);
    expect(onsets(t3, 0)).toEqual([0, 1.5, 3]);
    expect(p.band!.style).toBe('secondline');
  });
});

describe('odd meters in jazz (STYLE-MEDITERRANEAN-TOUCH §1)', () => {
  it('7/8 as 2+2+3 and 9/8 as 2+2+2+3, an 8th pulse, shells (3 and 7) on every group start', () => {
    const d7 = lvDrills('k-odd-1')[0];
    expect(d7.pulse).toBe(8);
    expect(d7.meters![0].meter.groups).toEqual([2, 2, 3]);
    expect(onsets(d7, 0, 'R', 7)).toEqual([0, 2, 4]);
    const d9 = lvDrills('k-odd-3')[0];
    expect(d9.meters![0].meter.groups).toEqual([2, 2, 2, 3]);
    expect(onsets(d9, 0, 'R', 9)).toEqual([0, 2, 4, 6]);
    for (const b of [0, 2, 4]) expect(at(d7, b, 'R').length).toBe(2);
    const key = d7.spec.key;
    expect(at(d7, 0, 'R').map((p) => pc(p - key)).sort((a, b) => a - b)).toEqual([0, 5]); // D m7: F and C
  });
  it('the first and last group; the change on a group boundary; the next chord an 8th early; the 9/8 cycle closes with 3+3+3', () => {
    expect(onsets(lvDrills('k-odd-2')[0], 1, 'R', 7)).toEqual([0, 4]);
    const sp = generate({ family: 'k-odd', kind: 'od-split', key: 0, hands: 'RL', option: 1 });
    expect(sp.chart![0]).toBe('Dm7 G7');
    expect(onsets(sp, 0, 'R', 9)).toEqual([0, 4]);
    const an = generate({ family: 'k-odd', kind: 'od-ant', key: 0, hands: 'RL', option: 0 });
    expect(onsets(an, 1, 'R', 7)).toEqual([4, 6]);
    const cy = lvDrills('k-odd-7')[0];
    expect(cy.meters!.map((m) => m.meter.groups?.join('+'))).toEqual(['2+2+2+3', '3+3+3', '2+2+2+3', '3+3+3', undefined]);
  });
});

describe('the band (band.ts): soul-jazz, gospel 12/8, funk-jazz, trad, the second line', () => {
  const p = parseChart('C7 | F7 | C7 | C7 | F7 | F7 | C7 | Dm7 G7');
  const bar = (hits: { beat: number }[], b: number) => [...new Set(hits.filter((h) => h.beat >= b * 4 - 1e-6 && h.beat < b * 4 + 4 - 1e-6).map((h) => +(h.beat - b * 4).toFixed(3)))];
  it('souljazz: the Charleston in two-note guide tones; a two-chord bar a hit each', () => {
    const h = bandComping(p, 4, 32, 'souljazz', 5);
    expect(bar(h, 0)).toEqual([0, 1.667]);
    expect(bar(h, 7)).toEqual([0, 2]);
    for (const x of h) expect(x.notes.length).toBe(2);
    expect(h.filter((x) => x.beat < 4).every((x) => new Set(x.notes.map(pc)).size === 2 && x.notes.every((m) => [4, 10].includes(pc(m))))).toBe(true);
    expect(guideTones(p.chords[0]).length).toBeGreaterThan(1);
  });
  it('gospel68: a triad on every triplet 8th, the beats accented; funkjazz: every beat, the one accented; trad: 2 and 4; secondline: no piano', () => {
    const g = bandComping(p, 4, 32, 'gospel68', 5);
    expect(bar(g, 2).length).toBe(12);
    expect(g.every((x) => x.notes.length === 3)).toBe(true);
    const f = bandComping(p, 4, 32, 'funkjazz', 5);
    expect(bar(f, 1)).toEqual([0, 1, 2, 3]);
    expect(f[0].vel).toBeGreaterThan(f[1].vel);
    expect(bar(bandComping(p, 4, 32, 'trad', 5), 3)).toEqual([1, 3]);
    expect(bandComping(p, 4, 32, 'secondline', 5)).toEqual([]);
  });
  it('the funk bass cell and the 2-feel', () => {
    const fb = funkBass(parseChart('Cm7 | Cm7'), 4, 8);
    expect(fb.filter((n) => n.beat < 4).map((n) => +(n.beat * 4).toFixed(0))).toEqual([0, 2, 3, 6, 7, 9, 11, 12, 14, 15]);
    expect(fb.filter((n) => n.ghost).length).toBe(8);
    expect(pc(fb.find((n) => near(n.beat, 1.75))!.midi)).toBe(10);
    const tf = twoFeelBass(parseChart('C | A7 | Dm7 G7'), 4, 12);
    expect(tf.map((n) => pc(n.midi))).toEqual([0, 7, 9, 4, 2, 7]);
  });
  it('the styles play over any chart (Improvise, the taster): soul and New Orleans no longer borrow rock and swing', () => {
    expect(STYLE_CHART.soul).toBe('souljazz');
    expect(STYLE_CHART.neworleans).toBe('trad');
    expect(STYLE_BANDS.soul).toContain('gospel68');
    expect(STYLE_BANDS.neworleans).toContain('secondline');
    expect(STYLE_BANDS.soul).not.toContain('boogaloo');
    const q = parseChart('C | A7 | D7 | G7');
    for (const st of ['souljazz', 'gospel68', 'funkjazz', 'trad', 'secondline'] as const) {
      const b = styledBacking(q, st, 100, 2);
      expect(b.events.some((e) => e.inst === 'bass'), st).toBe(true);
      expect(b.events.some((e) => e.perc && e.perc !== 'click' && e.perc !== 'accent'), st).toBe(true);
      expect(b.events.some((e) => e.inst === 'piano'), st).toBe(st !== 'secondline');
    }
    expect(bandStyleOf('second-line')).toBe('secondline');
  });
});

describe('the soul-jazz boogaloo (STYLE-SOUL §2.2, 2026-11-23): built, hidden until its grid is verified', () => {
  it('the claim hides the groove, the drum level and the ear-game style', () => {
    expect(isVerified('groove:boogaloo')).toBe(false);
    expect(isVerified('level:d-funk-10')).toBe(false);
    expect(GROOVES.some((g) => g.id === 'boogaloo')).toBe(false);
    expect(drumFamilies().find((f) => f.id === 'd-funk')!.levels.some((l) => l.id === 'd-funk-10')).toBe(false);
    expect(DRUM_STYLES.some((s) => s.id === 'boogaloo')).toBe(false);
    expect(STYLE_POOL.flat().includes('boogaloo')).toBe(false);
    expect(LOOK_ALIKES.flat().includes('boogaloo')).toBe(false);
  });
  it('the level is built: the sourced tempo, three variations over the boogaloo band', () => {
    const lv = allDrumFamilies().find((f) => f.id === 'd-funk')!.levels.find((l) => l.id === 'd-funk-10')!;
    expect(lv.tempo).toEqual([117, 133]);
    for (let op = 0; op < 3; op++) {
      const d = generateDrums({ ...lv.specs[op], key: 0 } as never);
      expect(d.band?.style).toBe('boogaloo');
      expect(d.notes.length).toBeGreaterThan(0);
    }
  });
  it('the band comps the Charleston in straight 8ths', () => {
    const h = bandComping(parseChart('F7 | Bb7 | F7 | F7'), 4, 16, 'boogaloo', 3);
    expect(h.filter((x) => x.beat < 4).map((x) => x.beat)).toEqual([0, 1.5]);
  });
});
