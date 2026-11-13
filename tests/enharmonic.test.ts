import { describe, expect, it } from 'vitest';
import { sameSounds } from '../src/engine/session';
import { TOPIC_GEN } from '../src/engine/topics';
import '../src/engine/topicsTheory';

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pc = (n: string) => (((PC[n[0]] + [...n.slice(1)].reduce((a, c) => a + (c === '♯' ? 1 : c === '♭' ? -1 : 0), 0)) % 12) + 12) % 12;

describe('the same sound is never a wrong answer (owner 2026-11-13)', () => {
  it('B♯ = C, C♭ = B, and lines of notes compare tone by tone', () => {
    expect(sameSounds('C', 'B♯')).toBe(true);
    expect(sameSounds('B', 'C♭')).toBe(true);
    expect(sameSounds('C – E – G♯', 'B♯ – F♭ – A♭')).toBe(true);
    expect(sameSounds('C', 'C♯')).toBe(false);
    expect(sameSounds('1-3-5', '1-3-5')).toBe(false); // not notes: plain equality decides
  });

  it('interval spelling never offers the answer’s enharmonic as a decoy', () => {
    for (let level = 1; level <= 3; level++)
      for (let seed = 1; seed < 200; seed++) {
        const q = TOPIC_GEN['interval-spelling'].gen(seed, level, 'x') as { answer: string; choices: string[] };
        const pcs = q.choices.map(pc);
        expect(new Set(pcs).size, q.choices.join(',')).toBe(q.choices.length);
      }
  });
});
