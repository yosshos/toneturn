import { describe, expect, it } from 'vitest';
import { barryLine, chordPcs, moveDim, pcsOf, SIX_OVER } from '../src/engine/barry';

describe('Barry Harris', () => {
  it('diminished conversions (C dim = C E♭ G♭ A)', () => {
    const C = 60;
    // Lower C → B7; lower A → A♭7.
    expect(moveDim(C, { notes: [0], dir: 'down' })).toMatchObject({ kind: 'dom7', root: 59 });
    expect(pcsOf(moveDim(C, { notes: [0], dir: 'down' }).midis)).toEqual(chordPcs('dom7', 59));
    expect(pcsOf(moveDim(C, { notes: [3], dir: 'down' }).midis)).toEqual(chordPcs('dom7', 68));
    // Raise G♭ → G: C E♭ G A = Cm6.
    const r = moveDim(C, { notes: [2], dir: 'up' });
    expect(r.kind).toBe('m6');
    expect(pcsOf(r.midis)).toEqual(chordPcs('m6', r.root));
    expect(r.root % 12).toBe(0);
    // Raise C and E♭ → A6; lower C and E♭ → D6.
    const a6 = moveDim(C, { notes: [0, 1], dir: 'up' });
    expect(pcsOf(a6.midis)).toEqual(chordPcs('maj6', a6.root));
    expect(a6.root % 12).toBe(9);
    const d6 = moveDim(C, { notes: [0, 1], dir: 'down' });
    expect(pcsOf(d6.midis)).toEqual(chordPcs('maj6', d6.root));
    expect(d6.root % 12).toBe(2);
  });
  it('every one- and two-note move gives the named chord', () => {
    for (let i = 0; i < 4; i++)
      for (const dir of ['up', 'down'] as const) {
        const one = moveDim(62, { notes: [i], dir });
        expect(pcsOf(one.midis)).toEqual(chordPcs(one.kind, one.root));
        const two = moveDim(62, { notes: [i, (i + 1) % 4], dir });
        if (i < 3) expect(pcsOf(two.midis)).toEqual(chordPcs(two.kind, two.root));
      }
  });
  it('half-step rules match the worksheet (D7 lines, relative to D)', () => {
    // Rule 1 from the root: D C♯ C B A G F♯ E D
    expect(barryLine(1, 'one')).toEqual([12, 11, 10, 9, 7, 5, 4, 2, 0]);
    // Rule 1 from the 3rd: F♯ E D C♯ C B A G F♯ E D
    expect(barryLine(3, 'one')).toEqual([16, 14, 12, 11, 10, 9, 7, 5, 4, 2, 0]);
    // Rule 3 from the 3rd: F♯ F E D♯ D C♯ C B A G F♯ E D
    expect(barryLine(3, 'three')).toEqual([16, 15, 14, 13, 12, 11, 10, 9, 7, 5, 4, 2, 0]);
    // Rule 4 from the 2nd: E D♯ D C♯ C B A G F♯ E D
    expect(barryLine(2, 'two')).toEqual([14, 13, 12, 11, 10, 9, 7, 5, 4, 2, 0]);
    // Rule 2 from the 2nd: no half steps
    expect(barryLine(2, 'none')).toEqual([14, 12, 10, 9, 7, 5, 4, 2, 0]);
  });
  it('6 chords over chords', () => {
    expect(SIX_OVER.m7).toEqual({ kind: 'maj6', up: 3 });
    expect(SIX_OVER['7']).toEqual({ kind: 'm6', up: 7 });
  });
});

describe('Barry Harris singing track', () => {
  it('every item fits a two-octave voice and grades a clean take', async () => {
    const { BARRY_LEVELS, gradeTake, itemTargets, itemFits, synthHold, synthMelody } = await import('../src/engine/vocal');
    const range = { low: 48, high: 72 };
    for (const lv of BARRY_LEVELS)
      for (const it of lv.items) {
        expect(itemFits(it, range)).toBe(true);
        const tg = itemTargets(it, range);
        const frames = it.kind === 'harmony-hold' ? synthHold(tg[0], { seconds: 4.4 }) : synthMelody(tg, it.bpm ? 60 / it.bpm / (it.perBeat ?? 1) : 0.4);
        const g = gradeTake(it, frames, range);
        expect(g.score, it.id).toBeGreaterThan(0.6);
      }
  });
  it('free choice names the chord made', async () => {
    const { dimFreeResult, synthHold } = await import('../src/engine/vocal');
    // C dim = C E♭ G♭ A (60 63 66 69); sing B (59) → B7; sing G (67) → Cm6.
    expect(dimFreeResult(synthHold(59, { seconds: 2 }), [60, 63, 66, 69])).toMatchObject({ kind: 'dom7', root: 11 });
    expect(dimFreeResult(synthHold(67, { seconds: 2 }), [60, 63, 66, 69])).toMatchObject({ kind: 'm6', root: 0 });
    expect(dimFreeResult(synthHold(62, { seconds: 2 }), [60, 63, 66, 69])).toMatchObject({ kind: 'dom7', root: 2 }); // D = E♭ lowered → D7
    expect(dimFreeResult(synthHold(60, { seconds: 2 }), [60, 63, 66, 69])).toBeNull(); // a note of the dim itself
  });
});
