import { describe, expect, it } from 'vitest';
import { layoutPiece, splitDur } from '../src/engine/piece/layout';
import { parseMusicXml, type Piece } from '../src/engine/piece/score';

const bar = (i: number, beats = 4) => ({ number: String(i + 1), start: i * beats, beats, sig: [beats, 4] as [number, number] });

describe('score layout', () => {
  it('splits lengths into standard values', () => {
    expect(splitDur(0, 4)).toEqual([4]);
    expect(splitDur(0, 3)).toEqual([3]);
    expect(splitDur(1, 3)).toEqual([3]); // a dotted half from beat 2 is fine notation
    expect(splitDur(0, 2.5)).toEqual([2, 0.5]);
    expect(splitDur(0.5, 1)).toEqual([0.5, 0.5]);
  });
  it('every bar of every hand adds up to the bar, with rests filling gaps and ties across the bar line', () => {
    const p: Piece = {
      title: 't', fifths: 0, source: 'musicxml', bars: [bar(0), bar(1)],
      notes: [
        { midi: 60, start: 0, dur: 1, bar: 0, hand: 'R' },
        { midi: 64, start: 0, dur: 1, bar: 0, hand: 'R' },
        { midi: 67, start: 2, dur: 4, bar: 0, hand: 'R' }, // over the bar line
        { midi: 48, start: 0, dur: 8, bar: 0, hand: 'L' },
      ],
    };
    const L = layoutPiece(p);
    for (const b of L) for (const h of ['R', 'L'] as const) expect(b.hands[h].reduce((a, e) => a + e.dur, 0), `${b.index} ${h}`).toBe(4);
    const r0 = L[0].hands.R;
    expect(r0[0]).toMatchObject({ at: 0, dur: 1, midis: [60, 64], refs: [0, 1] });
    expect(r0[1]).toMatchObject({ at: 1, dur: 1, midis: [] });
    expect(r0[2]).toMatchObject({ at: 2, dur: 2, midis: [67], tie: true });
    expect(L[1].hands.R[0]).toMatchObject({ at: 0, dur: 2, midis: [67], cont: true });
    expect(L[0].hands.L[0]).toMatchObject({ dur: 4, tie: true });
    expect(L[1].hands.L[0]).toMatchObject({ dur: 4, cont: true });
  });
  it('lays out an imported MusicXML piece completely', () => {
    const N = (s: string, o: number, d: number, st: number) => `<note><pitch><step>${s}</step><octave>${o}</octave></pitch><duration>${d}</duration><staff>${st}</staff></note>`;
    const xml = `<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>${N('C', 5, 6, 1)}${N('D', 5, 2, 1)}${N('E', 5, 4, 1)}<backup><duration>12</duration></backup>${N('C', 3, 12, 2)}</measure></part></score-partwise>`;
    const L = layoutPiece(parseMusicXml(xml));
    expect(L[0].hands.R.map((e) => e.dur)).toEqual([1.5, 0.5, 1]);
    expect(L[0].hands.L.map((e) => e.dur)).toEqual([3]);
  });
});
