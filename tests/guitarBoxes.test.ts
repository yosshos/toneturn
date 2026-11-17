// GUITAR-AUDIT C1 / C2 (2026-11-17): chord boxes carry the fretting finger in each dot and draw a barre as one bar.
import { describe, expect, it } from 'vitest';
import { boxPicture, cagedShape, OPEN_CHORDS, parseShape, TUNINGS, type OpenChordId } from '../src/engine/fretboard';
import { strummedChords } from '../src/ui/DrillTake';
import { generate } from '../src/engine/drills/generate';
import { GT, ltr } from '../src/i18n/guitarText';

const STD = TUNINGS[0];
/** Fingers low string → high string, as guitarists write them ("x32010" → "x32x1x"; 0 / x → x). */
const fingers = (shape: string) => {
  const b = boxPicture(STD, parseShape(shape));
  return [6, 5, 4, 3, 2, 1].map((s) => b.dots.find((d) => d.str === s)?.label ?? 'x').join('');
};

describe('chord box fingers', () => {
  it('the open chords get the book fingerings', () => {
    const want: Record<OpenChordId, string> = { C: 'x32x1x', A: 'xx123x', G: '21xxx3', E: 'x231xx', D: 'xxx132', Am: 'xx231x', Em: 'x12xxx', Dm: 'xxx231' };
    for (const [id, f] of Object.entries(want)) expect(fingers(OPEN_CHORDS[id as OpenChordId].shape), id).toBe(f);
  });
  it('the E-shape barre: finger 1 across all six strings at the base fret, 3-4-2 above', () => {
    const b = boxPicture(STD, cagedShape('E', 9)); // A major at fret 5
    expect(b.baseFret).toBe(5);
    expect(b.barre).toEqual({ fret: 5, from: 6, to: 1 });
    expect([6, 5, 4, 3, 2, 1].map((s) => b.dots.find((d) => d.str === s)!.label).join('')).toBe('134211');
  });
  it('the A-shape barre packs 2-3-4 (one finger a fret would need five)', () => {
    const b = boxPicture(STD, cagedShape('A', 2)); // D major at fret 5
    expect(b.barre).toEqual({ fret: 5, from: 5, to: 1 });
    expect([4, 3, 2].map((s) => b.dots.find((d) => d.str === s)!.label).join('')).toBe('234');
  });
  it('F (small barre on the top strings) is a barre; A, Em and D are not', () => {
    expect(boxPicture(STD, parseShape('xx3211')).barre).toEqual({ fret: 1, from: 2, to: 1 });
    for (const s of ['x02220', '022000', 'xx0232']) expect(boxPicture(STD, parseShape(s)).barre).toBeUndefined();
  });
});

describe('drill chord boxes and words', () => {
  it('a chord drill yields its chords in order with names, fingers and open / muted strings', () => {
    const d = generate({ family: 'g-chords', kind: 'one-minute', key: 0, hands: 'R', option: 0, perBeat: 0.25 } as never);
    const cs = strummedChords(d.notes);
    expect(cs.slice(0, 2).map((c) => c.name)).toEqual(['A', 'D']);
    expect(cs[0].box.muted).toEqual([6]);
    expect(cs[0].box.open?.sort()).toEqual([1, 5]);
    expect(cs[0].box.dots?.map((x) => x.label)).toEqual(['1', '2', '3']);
  });
  it('Hebrew ranges stay left-to-right', () => {
    expect(GT.strings('5–6').he).toBe(`מיתרים ${ltr('5–6')}`);
    expect(GT.chordMiss(['G'], 1, 1, { str: 3, open: 'G' }).he).toBe('ה־G לא נשמע באקורד — מיתר 3 (G)');
  });
});
