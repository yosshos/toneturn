// 0.98: the classical tier grades 2–8 (content/classicalPD.ts) and ornament signs in the notation (engine/ornaments.ts):
// every piece's bars fill their metre, the PD check (death year, our own engraving, a public-domain source), ties and
// ornaments parsed, the k-classic ladder in grade order, and the signs' written-out realisation (k-read 12, the Minuet).

import { describe, expect, it } from 'vitest';
import { isPdWorldwide, midiOf, parseVoice, parseVoiceFull, pdBarCount, pdFlats, pdNotes, pdOrnaments, pdSharps, pdToPiece, PD_PIECES } from '../src/content/classicalPD';
import { spellIn } from '../src/engine/aids';
import { ornamentLegend, realise, VF_ORNAMENT } from '../src/engine/ornaments';
import { layoutPiece } from '../src/engine/piece/layout';
import { levelDrills } from '../src/engine/drills/plan';
import { techLevel } from '../src/engine/ladderFacts';
import { catalog, type LevelDef } from '../src/engine/drills/generate';
import { stepCatalogue } from '../src/engine/path';
import { AUDIT7_PLACEMENT } from '../src/engine/audit7Placement';
import { BADGES } from '../src/engine/badges';
import { hasRubato } from '../src/engine/drills/rubato';

const lv = (id: string): LevelDef => techLevel(id)!;
const piece = (id: string) => PD_PIECES.find((p) => p.id === id)!;
const NEW = ['la-candeur', 'clementi-36-1', 'invention-8', 'invention-13', 'prelude-c-minor'];

describe('the PD check list', () => {
  it('every composer died 70+ years ago, our own engraving, a Public Domain source URL that names the edition', () => {
    for (const p of PD_PIECES) {
      expect(isPdWorldwide(p, 2026), p.id).toBe(true);
      expect(p.died + 70, p.id).toBeLessThan(2026);
      expect(p.edition, p.id).toBe('own');
      expect(p.source.url, p.id).toMatch(/^https:\/\/www\.mutopiaproject\.org\/ftp\/.+\.ly$/);
      expect(p.source.licence, p.id).toBe('Public Domain');
      expect(p.source.edition.length, p.id).toBeGreaterThan(5);
      expect(p.source.checked, p.id).toMatch(/bar/);
      expect(p.excerpt.en, p.id).toMatch(/bar|theme/);
    }
  });
  it('grades 1–8 are covered (2, 4, 6, 7, 8 new)', () => {
    const grades = new Set(PD_PIECES.map((p) => p.grade));
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8]) expect(grades.has(g), `grade ${g}`).toBe(true);
    for (const id of NEW) expect(piece(id), id).toBeTruthy();
  });
});

describe('every bar fills its metre; voices agree; ties and sections', () => {
  it('each voice parses (the parser throws on a short or long bar) and all voices have the same number of bars', () => {
    for (const p of PD_PIECES) {
      const n = pdBarCount(p);
      for (const v of [...p.rh, ...p.lh]) {
        expect(v.split('|').length, p.id).toBe(n);
        expect(() => parseVoice(v, p.meter, 'R', p.id, p.unit), p.id).not.toThrow();
      }
      for (const s of p.sections) expect(s.to, p.id).toBeLessThan(n);
      // the sections cover the excerpt, in order
      expect(p.sections[0].from).toBe(0);
      expect(p.sections[p.sections.length - 1].to).toBe(n - 1);
    }
  });
  it('no note rings past the end of its section (a tie never crosses a section boundary)', () => {
    for (const p of PD_PIECES)
      for (const n of pdNotes(p)) {
        const s = p.sections.find((x) => n.bar >= x.from && n.bar <= x.to)!;
        expect(n.start + n.dur, `${p.id} bar ${n.bar + 1}`).toBeLessThanOrEqual((s.to + 1) * p.meter + 1e-6);
      }
  });
  it('a tie merges into one note; a tie onto another pitch is refused', () => {
    const lh = pdNotes(piece('la-candeur')).filter((n) => n.hand === 'L' && n.bar === 2);
    expect(lh.map((n) => [n.midi, n.dur])).toEqual([[48, 8], [52, 8], [55, 8]]); // C3 E3 G3 held through bars 3–4
    expect(pdNotes(piece('la-candeur')).filter((n) => n.hand === 'L' && n.bar === 3)).toEqual([]);
    expect(() => parseVoice('C4/4~ | D4/4', 4, 'R')).toThrow(/tie/);
    expect(() => parseVoice('C4/2~ D4/2 | C4/4', 4, 'R')).toThrow(/tie/);
    const inv = pdNotes(piece('invention-13')).filter((n) => n.hand === 'R' && n.bar === 2);
    expect(inv[inv.length - 1]).toMatchObject({ midi: midiOf('F5'), dur: 0.75 }); // f8 ~ f16 over the bar line
  });
});

describe('spelling: the staff writes the piece’s own accidentals', () => {
  it('a pitch class is never both a sharp and a flat inside one piece; the drill and the coach carry the sharps', () => {
    for (const p of PD_PIECES) expect(pdSharps(p).filter((x) => pdFlats(p).includes(x)), p.id).toEqual([]);
    expect(pdSharps(piece('invention-13'))).toEqual([8]); // G♯
    expect(pdSharps(piece('fur-elise'))).toEqual([3, 8]); // D♯ G♯
    expect(levelDrills(lv('k-classic-8'), 'fifths-up')[0].sharps).toEqual([8]);
    expect(pdToPiece(piece('prelude-c-minor')).sharps).toEqual([6]); // F♯ (bar 6)
    expect(spellIn(68, null, [8])).toEqual({ letter: 'G', acc: 1, octave: 4 });
    expect(spellIn(68, null)).toEqual({ letter: 'A', acc: -1, octave: 4 });
    expect(spellIn(66, { letter: 'E', acc: -1 }, [6])).toEqual({ letter: 'F', acc: 1, octave: 4 });
  });
});

describe('the notes where the sources have them (spot checks of the verified bars)', () => {
  const first = (id: string, hand: 'R' | 'L', k: number) => pdNotes(piece(id)).filter((n) => n.hand === hand).slice(0, k).map((n) => n.midi);
  it('openings', () => {
    expect(first('la-candeur', 'R', 4)).toEqual(['G5', 'E5', 'D5', 'C5'].map(midiOf));
    expect(first('clementi-36-1', 'R', 5)).toEqual(['C5', 'E5', 'C5', 'G4', 'G4'].map(midiOf));
    expect(first('invention-8', 'R', 5)).toEqual(['F4', 'A4', 'F4', 'C5', 'F4'].map(midiOf));
    expect(first('invention-8', 'L', 2)).toEqual(['F3', 'A3'].map(midiOf)); // the canon enters in bar 2
    expect(pdNotes(piece('invention-8')).find((n) => n.hand === 'L')!.bar).toBe(1);
    expect(first('invention-13', 'R', 4)).toEqual(['E4', 'A4', 'C5', 'B4'].map(midiOf));
    expect(first('invention-13', 'L', 3)).toEqual(['A2', 'A3', 'G#3'].map(midiOf));
    expect(first('prelude-c-minor', 'R', 8)).toEqual(['C5', 'Eb4', 'D4', 'Eb4', 'C4', 'Eb4', 'D4', 'Eb4'].map(midiOf));
    expect(first('prelude-c-minor', 'L', 4)).toEqual(['C3', 'G3', 'F3', 'G3'].map(midiOf));
  });
  it('the counts per bar', () => {
    const per = (id: string, hand: 'R' | 'L') => Array.from({ length: pdBarCount(piece(id)) }, (_, b) => pdNotes(piece(id)).filter((n) => n.hand === hand && n.bar === b).length);
    expect(per('prelude-c-minor', 'R')).toEqual(Array(8).fill(16));
    expect(per('prelude-c-minor', 'L')).toEqual(Array(8).fill(16));
    expect(per('invention-8', 'R').slice(3, 6)).toEqual([12, 12, 12]);
    expect(per('clementi-36-1', 'R')[8]).toBe(4); // A4 A5 A5 A5
  });
});

describe('ornaments: the sign drawn, the realisation graded', () => {
  it('realise(): upper mordent, mordent, turn, trill', () => {
    expect(realise('prall', 0, 1, 72, 74, 71).map((n) => [n.pitch, n.dur])).toEqual([[72, 0.25], [74, 0.25], [72, 0.5]]);
    expect(realise('mordent', 0, 1, 72, 74, 71).map((n) => [n.pitch, n.dur])).toEqual([[72, 0.25], [71, 0.25], [72, 0.5]]);
    expect(realise('turn', 0, 1, 72, 74, 71).map((n) => n.pitch)).toEqual([74, 72, 71, 72]);
    const tr = realise('trill', 0, 2, 72, 74, 71);
    expect(tr[0].pitch).toBe(74);
    expect(tr[tr.length - 1].pitch).toBe(72);
    expect(tr.reduce((a, n) => a + n.dur, 0)).toBeCloseTo(2);
    // on an eighth: quick notes of a 32nd
    expect(realise('mordent', 1, 0.5, 72, 74, 71).map((n) => [n.beat, n.dur])).toEqual([[1, 0.125], [1.125, 0.125], [1.25, 0.25]]);
    expect(VF_ORNAMENT).toEqual({ prall: 'mordent', mordent: 'mordent_inverted', turn: 'turn', trill: 'tr' });
  });
  it("the Minuet's four mordents (bars 3, 5, 11, 13 of the source) as signs, written out as C–B–C", () => {
    const m = piece('minuet-g');
    const os = pdOrnaments(m);
    expect(os.map((o) => [Math.floor(o.beat / 3) + 1, o.kind, o.pitch])).toEqual([
      [3, 'mordent', 72],
      [5, 'mordent', 72],
      [11, 'mordent', 72],
      [13, 'mordent', 72],
    ]);
    const bar3 = pdNotes(m).filter((n) => n.hand === 'R' && n.bar === 2);
    expect(bar3.map((n) => n.midi)).toEqual([76, 72, 71, 72, 74, 76, 78]); // E5, C5 B4 C5, D5 E5 F♯5
    expect(bar3.reduce((a, n) => a + n.dur, 0)).toBeCloseTo(3);
    expect(() => parseVoiceFull('C5/1@mordent(B4) D5/2', 3, 'R')).not.toThrow();
    expect(() => parseVoiceFull('C5/1@mordent() D5/2', 3, 'R')).toThrow(/neighbour/);
  });
  it('the k-classic drill carries the signs; the coach lays each one out as one head with its sign', () => {
    const d = levelDrills(lv('k-classic-2'), 'fifths-up')[0];
    expect(d.ornaments!.map((o) => o.kind)).toEqual(['mordent', 'mordent']);
    for (const o of d.ornaments!) expect(d.notes.filter((n) => n.hand === 'R' && n.beat >= o.beat && n.beat < o.beat + o.dur).map((n) => n.pitch)).toEqual([72, 71, 72]);
    const lay = layoutPiece(pdToPiece(piece('minuet-g')));
    const b3 = lay[2].hands.R.filter((e) => e.midis.length);
    expect(b3.map((e) => e.midis[0])).toEqual([76, 72, 74, 76, 78]);
    expect(b3[1].orn).toBe('mordent');
    expect(b3[1].refs.length).toBe(3);
    expect(ornamentLegend(d.ornaments!, d.notes, 'en')).toEqual([{ kind: 'mordent', name: 'Mordent', how: 'C–B–C' }]);
    expect(ornamentLegend(d.ornaments!, d.notes, 'he')[0].name).toBe('מורדנט');
  });
  it('k-read 12: every item draws its signs; each sign stands for exactly its realisation', () => {
    const orn = levelDrills(lv('k-read-12'), 'fifths-up');
    const kinds = new Set<string>();
    for (const d of orn) {
      expect(d.ornaments?.length, d.itemId).toBeGreaterThan(0);
      for (const o of d.ornaments!) {
        kinds.add(o.kind);
        const ns = d.notes.filter((n) => n.hand === o.hand && n.beat >= o.beat - 1e-6 && n.beat < o.beat + o.dur - 1e-6).sort((a, b) => a.beat - b.beat);
        expect(ns.reduce((a, n) => a + n.dur, 0), d.itemId).toBeCloseTo(o.dur);
        const ps = ns.map((n) => n.pitch);
        const main = o.pitch;
        if (o.kind === 'prall') expect(ps[0] === main && ps[1] > main && ps[2] === main, d.itemId).toBe(true);
        if (o.kind === 'mordent') expect(ps[0] === main && ps[1] < main && ps[2] === main, d.itemId).toBe(true);
        if (o.kind === 'turn') expect(ps[0] > main && ps[1] === main && ps[2] < main && ps[3] === main, d.itemId).toBe(true);
        if (o.kind === 'trill') expect(ps[0] > main && ps[ps.length - 1] === main, d.itemId).toBe(true);
      }
    }
    expect([...kinds].sort()).toEqual(['mordent', 'prall', 'trill', 'turn']);
    expect(hasRubato(orn[0])).toBe(true);
  });
});

describe('the ladder and the wiring', () => {
  it('one level a piece in grade order, placed by grade, a badge title each, rubato first', () => {
    const f = catalog().find((x) => x.id === 'k-classic')!;
    expect(f.levels.length).toBe(PD_PIECES.length);
    const sorted = [...PD_PIECES].sort((a, b) => a.grade - b.grade);
    f.levels.forEach((l, i) => expect(l.title.en, l.id).toContain(sorted[i].title.en));
    const cat = stepCatalogue();
    const ds = f.levels.map((l) => cat.find((s) => s.id === `tech:${l.id}`)!.difficulty);
    expect([...ds].sort((a, b) => a - b)).toEqual(ds);
    for (const l of f.levels) expect(AUDIT7_PLACEMENT[l.id], l.id).toBeDefined();
    expect(BADGES.filter((b) => b.id.startsWith('tech:k-classic:')).length).toBe(PD_PIECES.length);
    for (const id of ['k-classic-3', 'k-classic-5', 'k-classic-7', 'k-classic-8', 'k-classic-9']) expect(hasRubato(levelDrills(lv(id), 'fifths-up')[0]), id).toBe(true);
    // the alla breve sonatina prints 2/2
    expect(levelDrills(lv('k-classic-5'), 'fifths-up')[0].sigText).toBe('2/2');
  });
  it('the coach model: same notes, ornaments carried, bars of the printed metre', () => {
    for (const p of PD_PIECES) {
      const pc = pdToPiece(p, 'he');
      expect(pc.notes.length, p.id).toBe(pdNotes(p).length);
      expect(pc.bars.length, p.id).toBe(pdBarCount(p));
      expect(layoutPiece(pc).length).toBe(pdBarCount(p));
    }
    expect(pdToPiece(piece('clementi-36-1')).bars[0].sig).toEqual([2, 2]);
    expect(pdToPiece(piece('minuet-g')).ornaments!.length).toBe(4);
  });
});
