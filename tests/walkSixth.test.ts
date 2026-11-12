// The walker on 6th and diminished 7th chords (2026-11-12): no 7th the chord does not have (an F on Gm6 was the bug).
import { describe, expect, it } from 'vitest';
import { walkScale, walkingBass } from '../src/engine/band';
import { chordAtBeat, parseChart } from '../src/engine/charts';
import { ruleCheck } from '../src/engine/drills/bassAnalyze';

const pc = (m: number) => ((m % 12) + 12) % 12;

describe('walkScale', () => {
  it('drops the 7ths from 6th chords and the foreign tones from dim7', () => {
    expect(walkScale([0, 3, 7, 9])).toEqual([0, 2, 3, 5, 7, 9, 12]); // m6
    expect(walkScale([0, 4, 7, 9])).not.toContain(11); // 6
    expect(walkScale([0, 4, 7, 9, 14])).not.toContain(10); // 6/9
    expect(walkScale([0, 3, 7, 9, 14])).not.toContain(10); // m6/9
    const d = walkScale([0, 3, 6, 9]);
    expect(d).not.toContain(8);
    expect(d).not.toContain(11);
    // 7th chords keep their mode
    expect(walkScale([0, 4, 7, 10])).toContain(10);
    expect(walkScale([0, 3, 7, 10])).toContain(10);
  });
});

describe('walking bass on 6th chords', () => {
  it('never plays the ♭7 on a minor 6th inside the chord (no F on Gm6)', () => {
    const p = parseChart('Gm6 | Gm6 | Cm6 | Cm6');
    for (let seed = 0; seed < 40; seed++) {
      const line = walkingBass(p, 4, p.bars * 4, seed).filter((n) => !n.ghost);
      for (const n of line) {
        const c = chordAtBeat(p, 4, n.beat)!;
        const next = chordAtBeat(p, 4, n.beat + 1);
        if (next !== c || (n.beat + 1) % (p.bars * 4) === 0) continue; // an approach note before a change
        expect(pc(n.midi - c.root), `seed ${seed} beat ${n.beat}`).not.toBe(10);
      }
    }
  });
  it('lines over 6th / dim7 changes keep the walk rules in every seed (the ruleSafe repair is only a net)', () => {
    const p = parseChart('C6 | Am7 | Dm7 | G7 | Cm6 | C#dim7 | Dm7 | G7');
    const chart = p.chords.map((c) => ({ chord: c.sym, root: c.root, tones: [...new Set(c.iv.map((x) => x % 12))], beats: c.beats }));
    let good = 0;
    for (let seed = 0; seed < 40; seed++) {
      const line = walkingBass(p, 4, p.bars * 4 * 2, seed).filter((n) => !n.ghost);
      const rep = ruleCheck('walk', chart, line.map((n) => ({ pitch: n.midi, beat: n.beat })), 4, 4);
      if (rep.valid.slice(0, -1).every(Boolean)) good++; // the very last note has no next chord to approach
    }
    expect(good).toBe(40);
  });
});
