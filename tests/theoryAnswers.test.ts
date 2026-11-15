// The owner's theory answers of 2026-11-15 (docs/THEORY-QUESTIONS.md): the rebuilt content is exactly what was
// answered, in all 12 keys, and the comping rhythms nobody could source stay out of every list, Comp Caller included.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { generate } from '../src/engine/drills/generate';
import { RHYTHMS, poolOf, rhythmShown, compItem } from '../src/engine/compCaller';
import { TOPIC_GEN } from '../src/engine/topics';
import { isVerified } from '../src/engine/verifiedContent';
import { TUNE_CHARTS } from '../src/engine/harrisLines';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const chordsOf = (kind: string, option: number, key: number) => {
  const d = generate({ family: 'k-sharm', kind, key, hands: 'RL', option, tempo: 60 } as never);
  const byBeat = new Map<number, number[]>();
  for (const n of d.notes) byBeat.set(n.beat, [...(byBeat.get(n.beat) ?? []), n.pitch]);
  return [...byBeat.entries()].sort((a, b) => a[0] - b[0]).map(([, ps]) => ps.sort((a, b) => a - b));
};

describe('the shells on the 6th-diminished scale (Echols, owner 2026-11-15)', () => {
  it('upper shell = C G A, lower shell = C E A, the bottom note walking the scale from the tonic, in all 12 keys', () => {
    const SIX = [0, 2, 4, 5, 7, 8, 9, 11];
    const MIN = [0, 2, 3, 5, 7, 8, 9, 11];
    for (let k = 0; k < 12; k++)
      for (const [op, sc, mid] of [[2, SIX, 4], [8, SIX, 2], [6, MIN, 4], [9, MIN, 2]] as const) {
        const cs = chordsOf('vl-ladder', op, k);
        expect(cs.length).toBe(17);
        cs.slice(0, 9).forEach((c, x) => {
          // bottom = degree x, middle = x + 4 (upper) or x + 2 (lower), top = x + 6: a close 4-note chord without one note
          const deg = (i: number) => mod12(k + sc[i % 8]);
          expect(c.map(mod12), `${op} ${k} ${x}`).toEqual([deg(x), deg(x + mid), deg(x + 6)]);
          expect(c[0]).toBeLessThan(c[1]);
          expect(c[1]).toBeLessThan(c[2]);
        });
      }
    // in C: C G A / C E A first, then D A♭ B / D F B
    expect(chordsOf('vl-ladder', 2, 0)[0].map(mod12)).toEqual([0, 7, 9]);
    expect(chordsOf('vl-ladder', 8, 0)[0].map(mod12)).toEqual([0, 4, 9]);
    expect(chordsOf('vl-ladder', 2, 0)[1].map(mod12)).toEqual([2, 8, 11]);
    expect(chordsOf('vl-ladder', 8, 0)[1].map(mod12)).toEqual([2, 5, 11]);
  });
  it('the octave chord, thirds and triads stay hidden', () => {
    for (const op of [0, 1, 3, 4, 5, 7]) expect(isVerified(`item:vl-ladder:${op}`), String(op)).toBe(false);
    for (const op of [2, 6, 8, 9]) expect(isVerified(`item:vl-ladder:${op}`), String(op)).toBe(true);
  });
});

describe('the tune charts (Real Book / iReal standard changes)', () => {
  it('Cherokee: each chord its real length; How High the Moon: 16 bars with the ii–V into Gm7; Tunisia: the A section', () => {
    const bars = (t: string) => t.split('|').map((b) => b.trim());
    expect(bars(TUNE_CHARTS.cherokee.text)).toEqual(['Bbmaj7', 'Bbmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebmaj7', 'Ab7', 'Ab7', 'Bbmaj7', 'Bbmaj7', 'C7', 'C7', 'Cm7', 'F7', 'Bbmaj7', 'Bbmaj7']);
    const h = bars(TUNE_CHARTS.hhtm.text);
    expect(h).toHaveLength(16);
    expect(h.slice(8, 12)).toEqual(['Ebmaj7', 'Am7b5 D7', 'Gm7', 'Am7b5 D7']);
    expect(bars(TUNE_CHARTS.tunisia.text)).toEqual(['Eb7', 'Dm6', 'Eb7', 'Dm6', 'Eb7', 'Dm6', 'Em7b5 A7', 'Dm6']);
  });
});

describe('comping rhythms: only the sourced ones are called', () => {
  it('Comp Caller leaves out the Basie rhythm and the push-off; every level still has two rhythms or more', () => {
    expect(rhythmShown('basie')).toBe(false);
    expect(rhythmShown('pushoff')).toBe(false);
    for (const id of ['charleston', 'reverse', 'beat3', 'garland', 'twobar', 'anticip', 'leadin'] as const) expect(rhythmShown(id), id).toBe(true);
    for (let lv = 1; lv <= 6; lv++) {
      const p = poolOf(lv);
      expect(p.length, String(lv)).toBeGreaterThanOrEqual(2);
      for (const id of p) expect(rhythmShown(id)).toBe(true);
    }
    for (let lv = 1; lv <= 6; lv++)
      for (let i = 0; i < 6; i++) for (const c of compItem(lv * 31 + i, i, lv).calls) expect(['basie', 'pushoff']).not.toContain(c.id);
  });
  it('the placements are the standard ones', () => {
    expect(RHYTHMS.charleston[0].map((h) => h.at)).toEqual([0, 1.5]);
    expect(RHYTHMS.reverse[0].map((h) => h.at)).toEqual([0.5, 2]);
    expect(RHYTHMS.beat3[0].map((h) => h.at)).toEqual([2, 3.5]);
    expect(RHYTHMS.garland[0]).toEqual([{ at: 1.5 }, { at: 3.5, next: true }]);
    expect(RHYTHMS.anticip[0]).toEqual([{ at: 0 }, { at: 3.5, next: true }]);
  });
  it('the ear topic: level 1 (Charleston / reverse / on 3) and level 3 shown, level 2 (Basie / push-off / lead-in) hidden', () => {
    expect(isVerified('topic:comp-rhythm-ear:1')).toBe(true);
    expect(isVerified('topic:comp-rhythm-ear:2')).toBe(false);
    expect(isVerified('topic:comp-rhythm-ear:3')).toBe(true);
    const q = TOPIC_GEN['comp-rhythm-ear'].gen(7, 1, 'x') as { choices: string[] };
    expect(q.choices.sort()).toEqual(['beat3', 'charleston', 'reverse']);
  });
});
