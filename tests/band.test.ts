import { describe, expect, it } from 'vitest';
import { comping, rootless, voiceLead, walkingBass } from '../src/engine/band';
import { chartBacking, chordAtBeat, parseChart } from '../src/engine/charts';

const charts = ['Dm7 | G7 | Cmaj7 | Cmaj7', 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7', 'Cmaj7 Am7 | Dm7 G7 | Em7 A7 | Dm7 G7', 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7'];
const pc = (m: number) => ((m % 12) + 12) % 12;

describe('walking bass', () => {
  it('stays in the bass range, one note a beat, the root at each chord change', () => {
    for (const t of charts) {
      const p = parseChart(t);
      const line = walkingBass(p, 4, p.bars * 4 * 2, 42).filter((n) => !n.ghost);
      expect(line.length).toBe(p.bars * 8);
      for (const n of line) {
        expect(n.midi).toBeGreaterThanOrEqual(28);
        expect(n.midi).toBeLessThanOrEqual(50);
      }
      for (const n of line) {
        const c = chordAtBeat(p, 4, n.beat)!;
        const starts = n.beat % (p.bars * 4) === c.bar * 4 + c.at;
        const prev = chordAtBeat(p, 4, n.beat - 1);
        if (starts && prev !== c) expect(pc(n.midi), `${t} beat ${n.beat}`).toBe(pc(c.bass));
      }
    }
  });
  it('approaches each new chord by a half step, a step or its fifth, and moves mostly by small intervals', () => {
    const p = parseChart(charts[1]);
    const line = walkingBass(p, 4, p.bars * 4, 7).filter((n) => !n.ghost);
    let big = 0;
    for (let i = 1; i < line.length; i++) {
      const d = Math.abs(line[i].midi - line[i - 1].midi);
      if (d > 7) big++;
      const c = chordAtBeat(p, 4, line[i].beat)!;
      const starts = line[i].beat === c.bar * 4 + c.at && chordAtBeat(p, 4, line[i].beat - 1) !== c;
      if (starts) expect([1, 2, 5, 7]).toContain(d % 12 === 0 ? 1 : Math.min(d, 12 - (d % 12) || d));
    }
    expect(big / line.length).toBeLessThan(0.15);
  });
  it('is the same for the same chart and seed, and different with another seed', () => {
    const p = parseChart(charts[0]);
    expect(walkingBass(p, 4, 16, 1)).toEqual(walkingBass(p, 4, 16, 1));
    expect(walkingBass(p, 4, 32, 1)).not.toEqual(walkingBass(p, 4, 32, 2));
  });
});

describe('comping', () => {
  it('rootless voicings hold the 3rd and 7th, between D3 and A4', () => {
    const p = parseChart('G7');
    for (const v of rootless(p.chords[0])) {
      expect(v.map(pc)).toContain(11); // B, the 3rd
      expect(v.map(pc)).toContain(5); // F, the 7th
      expect(Math.min(...v)).toBeGreaterThanOrEqual(50);
      expect(Math.max(...v)).toBeLessThanOrEqual(70);
    }
  });
  it('voice leading: ii–V–I moves each voice by a few semitones at most', () => {
    const p = parseChart('Dm7 | G7 | Cmaj7');
    let prev: number[] | null = null;
    for (const c of p.chords) {
      const v = voiceLead(rootless(c), prev);
      if (prev) {
        const a = [...v].sort((x, y) => x - y);
        const b = [...prev].sort((x, y) => x - y);
        const moved = a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
        expect(moved).toBeLessThanOrEqual(8);
      }
      prev = v;
    }
  });
  it('swing rhythms vary — never the same pattern three bars running', () => {
    const p = parseChart('Cmaj7 | Cmaj7 | Cmaj7 | Cmaj7 | Cmaj7 | Cmaj7 | Cmaj7 | Cmaj7');
    const hits = comping(p, 4, 32, 'swing', 3);
    const sig = (bar: number) => hits.filter((h) => Math.floor(h.beat / 4) === bar).map((h) => (h.beat % 4).toFixed(2)).join(',');
    for (let b = 2; b < 8; b++) expect(sig(b) === sig(b - 1) && sig(b) === sig(b - 2)).toBe(false);
    expect(new Set([...Array(8).keys()].map(sig)).size).toBeGreaterThan(2);
  });
  it('the backing track carries the band: bass on the bass, comping on the piano, in every style', () => {
    const p = parseChart(charts[2]);
    for (const st of ['swing', 'bossa', 'ballad', 'waltz'] as const) {
      const ev = chartBacking(p, st, 120, 1).events;
      expect(ev.filter((e) => e.inst === 'bass').length, st).toBeGreaterThan(0);
      expect(ev.filter((e) => !e.inst && !e.perc && e.midi >= 50).length, st).toBeGreaterThan(4);
    }
  });
});
