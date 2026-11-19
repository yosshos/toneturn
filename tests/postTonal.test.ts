// Owner 2026-11-19: Messiaen's modes of limited transposition, twelve-tone rows, Toussaint's Euclidean rhythms — the
// theory helpers pinned to the standard numbers, and the three topics' generators checked against them.
import { describe, expect, it } from 'vitest';
import { MESSIAEN_MODES, MODE_IDS, inversion, isValidRow, noteCount, patternPcs, retroInversion, retrograde, rowMatrix, selfMapAt, transposeRow, transpositionCount } from '../src/engine/postTonal';
import { TOUSSAINT, bjorklund, countOnsets, gapsOf, isRotation, necklaceKey, rotate } from '../src/engine/euclid';
import { TOPIC_GEN, asChoice } from '../src/engine/topicKit';
import '../src/engine/topics';
import { modeBlocks } from '../src/engine/topicsPostTonal';

const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);

describe("Messiaen's modes of limited transposition", () => {
  it('the seven interval patterns span one octave', () => {
    for (const m of MODE_IDS) expect(MESSIAEN_MODES[m].reduce((a, b) => a + b, 0), `mode ${m}`).toBe(12);
  });
  it('notes per mode: 6, 8, 9, 8, 6, 8, 10', () => {
    expect(MODE_IDS.map((m) => noteCount(MESSIAEN_MODES[m]))).toEqual([6, 8, 9, 8, 6, 8, 10]);
  });
  it('transpositions per mode: 2, 3, 4, 6, 6, 6, 6', () => {
    expect(MODE_IDS.map((m) => transpositionCount(MESSIAEN_MODES[m]))).toEqual([2, 3, 4, 6, 6, 6, 6]);
  });
  it('the count of transpositions is the size of the repeating block (the move that lands back on itself)', () => {
    for (const m of MODE_IDS) expect(selfMapAt(MESSIAEN_MODES[m])).toBe(transpositionCount(MESSIAEN_MODES[m]));
    // an ordinary scale has 12
    expect(transpositionCount([2, 2, 1, 2, 2, 2, 1])).toBe(12);
  });
  it('mode 1 is the whole-tone scale, mode 2 the half–whole octatonic scale', () => {
    expect(patternPcs(MESSIAEN_MODES[1])).toEqual([0, 2, 4, 6, 8, 10]);
    expect(patternPcs(MESSIAEN_MODES[2])).toEqual([0, 1, 3, 4, 6, 7, 9, 10]);
    expect(patternPcs(MESSIAEN_MODES[3])).toEqual([0, 2, 3, 4, 6, 7, 8, 10, 11]);
    expect(modeBlocks(3)).toBe('2 1 1 · 2 1 1 · 2 1 1');
    expect(modeBlocks(4)).toBe('1 1 3 1 · 1 1 3 1');
  });
  it('the generator answers with the helper numbers', () => {
    for (const s of SEEDS)
      for (let l = 1; l <= 4; l++) {
        const q = asChoice(TOPIC_GEN['messiaen-modes'].gen(s, l, 'm'));
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        if (l === 3) {
          const m = Number(/Mode (\d)/.exec(q.ask.en)![1]) as 3;
          const want = /notes/.test(q.ask.en) ? noteCount(MESSIAEN_MODES[m]) : transpositionCount(MESSIAEN_MODES[m]);
          expect(q.answer).toBe(String(want));
        }
      }
  });
});

describe('twelve-tone rows', () => {
  const P = [0, 11, 7, 8, 3, 1, 2, 10, 6, 5, 4, 9]; // any valid row
  it('P, I, R, RI and Pn', () => {
    expect(retrograde([0, 1, 4])).toEqual([4, 1, 0]);
    expect(inversion([60, 61, 64])).toEqual([60, 59, 56]);
    expect(retroInversion([60, 61, 64])).toEqual([56, 59, 60]);
    expect(transposeRow([0, 1, 4], 2)).toEqual([2, 3, 6]);
  });
  it('a valid row has every pitch class once', () => {
    expect(isValidRow(P)).toBe(true);
    expect(isValidRow([...P.slice(0, 11), 0])).toBe(false);
    expect(isValidRow(P.slice(0, 11))).toBe(false);
  });
  it('the matrix: first row P0, first column I0, every row a transposition of P', () => {
    const M = rowMatrix(P);
    expect(M[0]).toEqual(P);
    expect(M.map((r) => r[0])).toEqual(inversion(P).map((x) => ((x % 12) + 12) % 12));
    for (const r of M) expect(isValidRow(r)).toBe(true);
    for (let i = 0; i < 12; i++) expect(M[i][i]).toBe(P[0]);
  });
  it('the generator: four distinct forms, the right one among the choices', () => {
    for (const s of SEEDS)
      for (let l = 1; l <= 4; l++) {
        const q = asChoice(TOPIC_GEN['twelve-tone'].gen(s, l, 't'));
        expect(q.choices).toContain(q.answer);
        if (l === 1) expect(q.show!.midis.length).toBe(8);
        if (l === 3) expect(q.answer).toBe(isValidRow(q.show!.midis) ? 'valid' : 'invalid');
      }
  });
});

describe('Euclidean rhythms (Toussaint 2005)', () => {
  it('Bjorklund gives exactly the encoded examples', () => {
    for (const t of TOUSSAINT) expect(bjorklund(t.k, t.n), `E(${t.k},${t.n})`).toBe(t.pattern);
    expect(bjorklund(3, 8)).toBe('x..x..x.');
    expect(bjorklund(5, 8)).toBe('x.xx.xx.');
    expect(bjorklund(2, 5)).toBe('x.x..');
    expect(bjorklund(3, 4)).toBe('x.xx');
    expect(bjorklund(4, 9)).toBe('x.x.x.x..');
    expect(bjorklund(5, 12)).toBe('x..x.x..x.x.');
    expect(bjorklund(7, 12)).toBe('x.xx.x.xx.x.');
    expect(bjorklund(5, 16)).toBe('x..x..x..x..x...');
    expect(bjorklund(5, 13)).toBe('x..x.x..x.x..'); // Toussaint's worked example
  });
  it('k onsets over n pulses, gaps differ by at most one', () => {
    for (let n = 2; n <= 16; n++)
      for (let k = 1; k <= n; k++) {
        const p = bjorklund(k, n);
        expect(p.length).toBe(n);
        expect(countOnsets(p)).toBe(k);
        const g = gapsOf(p);
        expect(Math.max(...g) - Math.min(...g)).toBeLessThanOrEqual(1);
      }
  });
  it('the bossa nova is a rotation of E(5,16), not E(5,16) itself', () => {
    const b = TOUSSAINT.find((t) => t.n === 16)!;
    expect(b.rotation!.pattern).toBe('x..x..x...x..x..');
    expect(isRotation(b.pattern, b.rotation!.pattern)).toBe(true);
    expect(b.rotation!.pattern).not.toBe(b.pattern);
    expect(rotate(b.pattern, 6)).toBe(b.rotation!.pattern);
  });
  it('only the labels the paper gives', () => {
    expect(TOUSSAINT.filter((t) => t.label).map((t) => `${t.k},${t.n}`)).toEqual(['3,8', '5,8', '4,9', '7,12']);
  });
  it('the generator: answers right, rotations real, builds by necklace', () => {
    for (const s of SEEDS)
      for (let l = 1; l <= 4; l++) {
        const q = asChoice(TOPIC_GEN['euclid-rhythms'].gen(s, l, 'e'));
        expect(q.choices).toContain(q.answer);
        expect(q.cycle?.n).toBeGreaterThan(1);
        if (l === 3) expect(q.answer).toBe(necklaceKey(q.answer));
        if (l === 4) {
          const ref = q.cycle!.show!;
          expect(isRotation(ref, q.answer)).toBe(true);
          expect(q.answer).not.toBe(ref);
          for (const c of q.choices) if (c !== q.answer) expect(isRotation(ref, c)).toBe(false);
        }
      }
  });
});
