// The scale rotation on the neck (SPEC-RBI-ROTATION §4, guitar and bass): every chord's scale in one playable 5-fret
// box, the box near the previous one (minimal movement), in all 12 keys, on every guitar and bass tuning; the chord
// tones marked; the next box ready for the "new scale" preview; the neck shown to guitar and bass players only.
import { describe, expect, it } from 'vitest';
import { IMPROV_LEVELS, transposeChart } from '../src/engine/charts';
import { noteAt, TUNINGS, tuningById } from '../src/engine/fretboard';
import { BOX_FRETS, boxPositions, cellBox, cellChord, homeLo, maxFretOf, neckPath, neckView, nextLo } from '../src/engine/rotationNeck';
import { buildRotationSheet, cellNotes, nextChange } from '../src/engine/rotationSheet';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { rotationNeckTuning } from '../src/ui/ScaleRotation';

const mod = (n: number) => ((n % 12) + 12) % 12;
const NECKS = TUNINGS.filter((t) => t.instrument === 'guitar' || t.instrument === 'bass');
const level = (n: number) => IMPROV_LEVELS.find((x) => x.n === n)!.text;
const charts = [level(4), level(5), level(6), ...['autumn', 'blues-f', 'attya', 'rhythm-a'].map((id) => STANDARD_CHANGES.find((s) => s.id === id)!.text)];

describe('a box: five frets that hold the whole scale', () => {
  it('every 5-fret box on every guitar and bass tuning holds all 12 notes (so any scale is complete in place)', () => {
    for (const t of NECKS)
      for (let lo = 0; lo <= maxFretOf(t) - (BOX_FRETS - 1); lo++) {
        const pcs = new Set(boxPositions(t, lo, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).map((p) => mod(p.midi)));
        expect(pcs.size, `${t.id} lo ${lo}`).toBe(12);
      }
  });
  it('positions stay inside the box, on real strings, and a repeated pitch is kept once', () => {
    const t = tuningById('standard');
    const ps = boxPositions(t, 7, [0, 2, 4, 5, 7, 9, 11]);
    for (const p of ps) {
      expect(p.fret).toBeGreaterThanOrEqual(7);
      expect(p.fret).toBeLessThanOrEqual(11);
      expect(p.str).toBeGreaterThanOrEqual(1);
      expect(p.str).toBeLessThanOrEqual(6);
      expect(noteAt(t, p.str, p.fret)).toBe(p.midi);
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(mod(p.midi));
    }
    expect(new Set(ps.map((p) => p.midi)).size).toBe(ps.length);
  });
  it('home: the tonic on the lowest string (C → the 8th fret, box from the 7th), past the 8th fret on the next string up', () => {
    const g = tuningById('standard');
    expect(homeLo(g, 0)).toBe(7);
    expect(homeLo(g, 7)).toBe(2);
    expect(homeLo(g, 4)).toBe(0);
    // D: the 10th fret on the low E → the 5th fret on A
    expect(homeLo(g, 2)).toBe(4);
    const b = tuningById('bass');
    expect(homeLo(b, 0)).toBe(7);
    expect(homeLo(b, 9)).toBe(4);
  });
});

describe('the path through a take: all 12 keys, every neck tuning, minimal movement', () => {
  for (const t of NECKS)
    it(`${t.id}: frets possible, scale complete, chord root present, the hand moves at most a fret`, () => {
      const top = maxFretOf(t);
      for (const text of charts)
        for (let k = 0; k < 12; k++)
          for (const tier of [1, 2, 3]) {
            const sheet = buildRotationSheet(transposeChart(text, k), { tier, seed: 1 + k })!;
            const path = neckPath(t, sheet);
            expect(path.length).toBe(sheet.cells.length);
            let moved = 0;
            path.forEach((box, i) => {
              const c = sheet.cells[i];
              const where = `${t.id} ${text.slice(0, 20)} +${k} T${tier} cell ${i} ${c.sym} ${c.mode}`;
              // no impossible frets: inside the neck, a 5-fret hand span
              expect(box.lo, where).toBeGreaterThanOrEqual(0);
              expect(box.hi, where).toBeLessThanOrEqual(top);
              for (const n of box.notes) {
                expect(n.fret, where).toBeGreaterThanOrEqual(box.lo);
                expect(n.fret, where).toBeLessThanOrEqual(box.hi);
                expect(n.str, where).toBeLessThanOrEqual(t.open.length);
              }
              const fretted = box.notes.filter((n) => n.fret > 0).map((n) => n.fret);
              expect(Math.max(...fretted) - Math.min(...fretted), where).toBeLessThanOrEqual(BOX_FRETS - 1);
              // the whole scale, in place; the chord's root and every chord tone in the scale are marked
              const want = cellNotes(c, sheet).pcs;
              expect(new Set(box.notes.map((n) => n.pc)), where).toEqual(new Set(want));
              const ch = cellChord(c, sheet);
              expect(box.notes.some((n) => n.role === 'root' && n.pc === ch.root), where).toBe(true);
              for (const n of box.notes) if (n.role === 'chord') expect(ch.pcs, where).toContain(n.pc);
              // minimal movement: at most a fret from the last chord's box
              if (i > 0) {
                const d = Math.abs(box.lo - path[i - 1].lo);
                expect(d, where).toBeLessThanOrEqual(1);
                moved += d;
              }
            });
            // and it never wanders: within 2 frets of home for the whole take
            const home = homeLo(t, sheet.tonic);
            for (const b of path) expect(Math.abs(b.lo - home)).toBeLessThanOrEqual(2);
            expect(moved).toBeLessThanOrEqual(path.length);
          }
    });
});

describe('chord tones vs the rest of the scale', () => {
  it('Dm7 in D Dorian: D is the root, F A C chord tones named by degree, B and E the other scale notes', () => {
    const sheet = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 1, seed: 1 })!;
    const i = sheet.cells.findIndex((c) => c.sym === 'Dm7' && c.mode === 'dorian');
    // Dorian is the ii's plain scale: no colour notes
    expect(cellNotes(sheet.cells[i], sheet).colour).toEqual([]);
    expect(i).toBeGreaterThanOrEqual(0);
    const box = cellBox(tuningById('standard'), sheet.cells[i], sheet, 4);
    const by = (pc: number) => box.notes.filter((n) => n.pc === pc);
    expect(by(2).every((n) => n.role === 'root' && n.deg === '1')).toBe(true);
    expect(by(5).every((n) => n.role === 'chord' && n.deg === '♭3')).toBe(true);
    expect(by(9).every((n) => n.deg === '5')).toBe(true);
    expect(by(0).every((n) => n.deg === '♭7')).toBe(true);
    expect(by(11).every((n) => n.role === 'scale')).toBe(true);
    expect(by(4).every((n) => n.role === 'scale' && !n.deg)).toBe(true);
  });
  it('a colour note (what the rotated scale adds) is marked as colour wherever it is not a chord tone', () => {
    const t = tuningById('standard');
    let seen = 0;
    for (let k = 0; k < 12; k++)
      for (const text of charts) {
        const sheet = buildRotationSheet(transposeChart(text, k), { tier: 2, seed: 5 + k })!;
        const path = neckPath(t, sheet);
        sheet.cells.forEach((c, i) => {
          const col = cellNotes(c, sheet).colour;
          const ch = cellChord(c, sheet);
          for (const n of path[i].notes) {
            if (col.includes(n.pc) && !ch.pcs.includes(n.pc)) {
              expect(n.role).toBe('colour');
              seen++;
            } else expect(n.role).not.toBe('colour');
          }
        });
      }
    expect(seen).toBeGreaterThan(0);
  });
  it('the next scale’s box is ready when the new scale is announced, and the view holds both boxes', () => {
    const t = tuningById('standard');
    for (let k = 0; k < 12; k++) {
      const sheet = buildRotationSheet(transposeChart(level(4), k), { tier: 2, seed: 3 })!;
      const path = neckPath(t, sheet);
      for (let beat = 0; beat < sheet.bars * sheet.meter * sheet.choruses; beat += 1) {
        const ch = nextChange(sheet, beat);
        if (!ch) continue;
        const nx = path[sheet.cells.indexOf(ch.cell)];
        expect(nx).toBeDefined();
        const cur = path[sheet.cells.findIndex((c) => beat >= c.at && beat < c.at + c.beats)];
        const [lo, hi] = neckView(t, cur, nx);
        expect(lo).toBeLessThanOrEqual(Math.min(cur.lo, nx.lo));
        expect(hi).toBeGreaterThanOrEqual(Math.max(cur.hi, nx.hi));
        expect(hi - lo).toBeGreaterThanOrEqual(8);
        expect(lo).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('nextLo stays put on a tie and moves a fret to bring the root under the low strings', () => {
    const t = tuningById('standard');
    // box 7–11 holds C on the low E (8th fret): stays for C
    expect(nextLo(t, 7, 0, 7)).toBe(7);
    // F♯ is the 2nd fret on E and 9th on A: box 7–11 has it on A → stays
    expect(nextLo(t, 7, 6, 7)).toBe(7);
  });
});

describe('who sees the neck', () => {
  it('a guitar player: their guitar tuning; a bass player: their bass tuning; keys and voice: the keyboard', () => {
    expect(rotationNeckTuning({ activeCourse: 'guitar' })?.id).toBe('standard');
    expect(rotationNeckTuning({ activeCourse: 'guitar', tuning: 'drop-d' })?.id).toBe('drop-d');
    expect(rotationNeckTuning({ activeCourse: 'guitar', tuning: 'bass5' })?.instrument).toBe('guitar');
    expect(rotationNeckTuning({ activeCourse: 'bass' })?.id).toBe('bass');
    expect(rotationNeckTuning({ activeCourse: 'bass', bassTuning: 'bass5' })?.id).toBe('bass5');
    expect(rotationNeckTuning({ activeCourse: 'ear', instrument: 'guitar' })?.instrument).toBe('guitar');
    expect(rotationNeckTuning({ activeCourse: 'keys' })).toBeNull();
    expect(rotationNeckTuning({ activeCourse: 'ear', instrument: 'voice' })).toBeNull();
  });
});
