// Verification pass 2026-11-23 (SPEC-LICKS-IN-IMPROV §1–4): the lick search runs at every improvisation take (the
// shared bookTake boundary, rule-card drills carry their line, Perform › Improv's line, Trade's turn length), and the
// approach cells are only tracked — no lick card, no lick XP, no variety bonus, no "new key"; their key is the chord's.
import { describe, expect, it } from 'vitest';
import { findCells, type ChartSpan } from '../src/engine/lickDetect';
import { LICKS, lickPitches } from '../src/engine/licks';
import { APPROACH_CELLS, bookTake, isNewKey, takeUses, tradeTurnBeats, usesXp, type LickUse } from '../src/engine/vocab';
import { checkCard, cardKept, spansOfChart } from '../src/engine/ruleCards';
import { parseChart } from '../src/engine/charts';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { soloModel } from '../src/engine/drills/soloDrills';
import { improvLine } from '../src/engine/perform';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const lick = LICKS.find((l) => l.id === 'maj-enclose')!; // Dm7 | G7 | Cmaj7
const iv = (q: string) => (q === 'm7' ? [0, 3, 7, 10] : q === '7' ? [0, 4, 7, 10] : [0, 4, 7, 11]);
const chart = [
  { root: 2, iv: iv('m7'), at: 0, beats: 4 },
  { root: 7, iv: iv('7'), at: 4, beats: 4 },
  { root: 0, iv: iv('maj7'), at: 8, beats: 12 },
];
const lickNotes = (at = 0) => lickPitches(lick, 0).map((p, i) => ({ midi: p, beat: at + lick.notes[i][1] }));
const ap1 = APPROACH_CELLS[0];

describe('approach cells are tracked, not scored as licks', () => {
  // over Cmaj7 at beat 16: F♯ → G (the 5th of C), an eighth apart
  const cell = [{ midi: 66, beat: 16 }, { midi: 67, beat: 16.5 }];
  it('a cell use earns no XP, no variety bonus and is never a new key', () => {
    const withCell = takeUses({ pool: [lick, ap1], closed: { [lick.id]: [0] }, notes: [...lickNotes(), ...cell], spans: chart, session: 's' });
    const without = takeUses({ pool: [lick], closed: { [lick.id]: [0] }, notes: [...lickNotes(), ...cell], spans: chart, session: 's' });
    const c = withCell.uses.find((u) => u.id === 'ap-1');
    expect(c).toBeDefined();
    expect(withCell.xp).toBe(without.xp);
    expect(c!.fresh).toBe(false);
    const u = (id: string): LickUse => ({ id, key: 3, kind: 'exact', at: '', session: 's' });
    expect(usesXp([u('ap-1'), u('ap-2'), u('ap-3')], {})).toBe(0);
    expect(isNewKey(u('ap-2'), {})).toBe(false);
  });
  it("a cell's key is the key of the chord it targets (its root), not the target note", () => {
    const r = takeUses({ pool: [ap1], notes: [{ midi: 60, beat: 0 }, ...cell], spans: chart, session: 's' });
    expect(r.uses.map((u) => u.key)).toEqual([0]);
  });
  it('lick 1 is clean only as the eighth before the target (its timing is measured)', () => {
    const g7: ChartSpan[] = [{ root: 7, q: '7', at: 0, beats: 8 }];
    expect(findCells(1, [{ beat: 0, midi: 61 }, { beat: 0.5, midi: 62 }], g7)[0].tight).toBe(true);
    expect(findCells(1, [{ beat: 0, midi: 61 }, { beat: 0.95, midi: 62 }], g7)[0].tight).toBe(false);
  });
  it('cells never keep a lick card ("use a lick", "three different licks")', () => {
    const notes = [{ beat: 3.5, dur: 0.4, midi: 61 }, { beat: 4, dur: 0.4, midi: 62 }, { beat: 7.5, dur: 0.4, midi: 70 }, { beat: 8, dur: 0.4, midi: 71 }, { beat: 9, dur: 0.4, midi: 72 }];
    const opt = { licks: [ap1, ...APPROACH_CELLS.slice(1)] };
    expect(cardKept('use-lick', checkCard('use-lick', { notes, spans: chart, meter: 4, bpm: 120, opt }))).toBe(false);
    const two = LICKS.filter((l) => ['maj-arp', 'maj-bebop'].includes(l.id));
    const ln = (l: (typeof two)[number], at: number) => lickPitches(l, 0).map((p, i) => ({ beat: at + l.notes[i][1], dur: 0.4, midi: p }));
    const sp = (at: number) => chart.map((s) => ({ ...s, at: s.at + at, beats: s.root === 0 ? 8 : 4 }));
    const all = [...ln(two[0], 0), ...ln(two[1], 16), { beat: 35.5, dur: 0.4, midi: 61 }, { beat: 36, dur: 0.4, midi: 62 }];
    const c3 = checkCard('lick-three', { notes: all, spans: [0, 16, 32].flatMap(sp), meter: 4, bpm: 120, opt: { licks: [...two, ...APPROACH_CELLS] } });
    expect(cardKept('lick-three', c3)).toBe(false);
  });
});

describe('every improvisation take books its licks (bookTake)', () => {
  it('hands the uses and their XP to the app; nothing without a pool', () => {
    const got: { n: number; xp: number }[] = [];
    const r = bookTake({ pool: [lick], onUses: (u, xp) => got.push({ n: u.length, xp }) }, { notes: lickNotes(), spans: chart, meter: 4 }, 's');
    expect(r?.uses).toHaveLength(1);
    expect(got).toEqual([{ n: 1, xp: r!.xp }]);
    expect(bookTake({ pool: [] }, { notes: lickNotes(), spans: chart, meter: 4 }, 's')).toBeNull();
    expect(bookTake(undefined, { notes: lickNotes(), spans: chart, meter: 4 }, 's')).toBeNull();
  });
  it('a rule-card improvisation drill carries its line and chart to the take boundary', () => {
    const d: Drill = generate({ family: 'k-solo', kind: 'sl-imp', key: 5, hands: 'R', swing: false, option: 0 });
    const played: PlayedNote[] = soloModel(0, 5, 'piano').map((n) => ({ pitch: n.p, on: expTimeMs(d, n.beat, 100), off: expTimeMs(d, n.beat + n.dur * 0.9, 100), vel: 80 }));
    const m = analyzeTake(d, 100, played);
    expect(m.improvLine?.notes.length).toBeGreaterThan(3);
    expect(m.improvLine?.spans).toEqual(d.goal.improv!.spans);
    expect(Math.abs(m.improvLine!.notes[0].beat - soloModel(0, 5, 'piano')[0].beat)).toBeLessThan(0.05);
  });
  it("Perform › Improv: the take's notes in beats and the chart's chords over the choruses", () => {
    const bpm = 120;
    const frames = lickNotes().flatMap((n) => Array.from({ length: 10 }, (_, k) => ({ t: n.beat * 0.5 + k * 0.02, hz: 440 * Math.pow(2, (n.midi - 69) / 12), confidence: 1, rms: 0.1 })));
    const line = improvLine(frames, 'ii-V-I', 0, bpm, 2);
    expect(line.spans).toHaveLength(6);
    expect(line.spans[1]).toMatchObject({ root: 7, at: 4, beats: 4 });
    expect(line.notes.map((n) => n.midi)).toEqual(lickNotes().map((n) => n.midi));
    expect(bookTake({ pool: [lick] }, line, 's')?.uses.map((u) => u.id)).toEqual([lick.id]);
  });
  it("Trade: a short chart's turns are laid end to end by the chart's length (not four bars)", () => {
    expect(tradeTurnBeats(4)).toBe(16);
    expect(tradeTurnBeats(8)).toBe(16);
    expect(tradeTurnBeats(3)).toBe(12);
    const p = parseChart('Dm7 | G7 | Cmaj7');
    const spans = spansOfChart(p, 4, p.bars * 3);
    // the lick in the second round, offset by one turn: found over its chords
    const r = takeUses({ pool: [lick], notes: lickNotes(tradeTurnBeats(p.bars)), spans, session: 's' });
    expect(r.uses).toHaveLength(1);
  });
});
