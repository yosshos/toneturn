// The chord chart's cells (COURSE-FEEDBACK-UI slice 8): targets before the take, corner tabs and landed notes after it,
// and the per-bar rule breaks carried from the rule cards into the take.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs, improvLandings } from '../src/engine/drills/analyze';
import { barTargets, chartCells, pcName, prettyChord, rulesKept } from '../src/engine/drills/chartCells';
import type { DrillCalibration, PlayedNote } from '../src/engine/drills/types';

const CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };
// k-solo option 0: a guide tone on every change over ii–V–I (C major).
const d = generate({ family: 'k-solo', kind: 'sl-imp', key: 0, hands: 'R', swing: true, option: 0 } as never);
const bpm = 100;
/** Play the item's own landings (its notes), with some changed to a wrong pitch class. */
const take = (wrongAt: number[]): PlayedNote[] =>
  d.notes.map((n, i) => {
    const on = expTimeMs(d, n.beat, bpm);
    return { pitch: n.pitch + (wrongAt.includes(i) ? 1 : 0), on, off: on + 400, vel: 70 };
  });

describe('chartCells', () => {
  it('names and symbols: real accidentals, pitch-class names', () => {
    expect(prettyChord('Bbmaj7')).toBe('B♭maj7');
    expect(prettyChord('F#m7b5')).toBe('F♯m7♭5');
    expect(prettyChord('G7b9')).toBe('G7♭9');
    expect(pcName(10)).toBe('B♭');
    expect(pcName(-1)).toBe('B');
  });

  it('before the take: the target (the 3rd) of each change, one cell a bar', () => {
    expect(d.chart?.length).toBeGreaterThan(0);
    const t = barTargets(d);
    expect(t.length).toBe(d.chart!.length);
    // ii–V–I in C, the 3rd / the 7th: Dm7 → F/C, G7 → B/F, Cmaj7 → E/B
    expect(t.slice(0, 3)).toEqual(['F/C', 'B/F', 'E/B']);
    const cells = chartCells(d);
    expect(cells[0]).toMatchObject({ chord: d.chart![0], target: 'F/C' });
    expect(cells.some((c) => c.tab)).toBe(false);
  });

  it('after a clean take: every judged bar kept, the landed note is a target', () => {
    const m = analyzeTake(d, bpm, take([]), CAL);
    const cells = chartCells(d, m);
    const rk = rulesKept(cells);
    expect(rk).not.toBeNull();
    expect(rk!.kept).toBe(rk!.of);
    expect(cells[0].landed).toMatchObject({ hit: true });
  });

  it('a wrong landing: that bar gets a pink tab with the guide-tone rule (1) and the note landed on', () => {
    const lands = improvLandings(d, bpm, take([1]));
    const missBar = lands.find((l) => !l.hit)!.bar;
    const m = analyzeTake(d, bpm, take([1]), CAL);
    expect(m.improv?.find((c) => c.card === 'guide-target')?.bars).toContain(missBar);
    const cells = chartCells(d, m);
    expect(cells[missBar].tab?.kind).toBe('bad');
    expect(cells[missBar].tab?.rules).toContain(1);
    expect(cells[missBar].landed).toMatchObject({ hit: false });
    const rk = rulesKept(cells)!;
    expect(rk.kept).toBe(rk.of - 1);
  });

  it('ear / trading items: the band bars carry no target and no result', () => {
    const tr = { ...d, listen: { ask: { en: '', he: '' }, notes: [], windows: [[0, 4]] as [number, number][] } };
    const cells = chartCells(tr as never);
    expect(cells[0].role).toBe('band');
    expect(cells[0].target).toBeUndefined();
    expect(cells[1].role).toBe('you');
  });
});
