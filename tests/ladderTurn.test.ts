// SPEC-KEY-SESSION-2 §7 (2026-11-25): the harmonised ladder turns around without repeating its top. Broken 3rds and
// the arpeggiated triads / 7th chords come down from the pair (chord) one degree below the top, on piano, guitar and
// bass, in every key, at one and two octaves; the 1-octave forms (B-1, B-2) are built by `octaves: 1`.

import { describe, expect, it } from 'vitest';
import { generate, itemIdOf } from '../src/engine/drills/generate';
import { generateGuitar } from '../src/engine/drills/guitar';
import { H_SCALES, ladderEvents, type HStep } from '../src/engine/drills/harmLadder';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (p: number) => `${NAMES[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`;
const STEPS: HStep[] = ['line', '3b', '3t', 'ta', 'tb', '7a', '7b', 'd2', 'd3', 'd24', 'ti', 'c4', '9a'];
const SEVEN = H_SCALES.map((_, i) => i).filter((i) => H_SCALES[i].ints.length === 7);
const scalesFor = (step: HStep) => (step === 'ti' || step === 'c4' || step === '9a' ? SEVEN : H_SCALES.map((_, i) => i));

/** Onsets in order: the pitches starting together at each beat. */
function onsets(d: Drill): number[][] {
  const by = new Map<number, number[]>();
  for (const n of d.notes) by.set(n.beat, [...(by.get(n.beat) ?? []), n.pitch]);
  return [...by.keys()].sort((a, b) => a - b).map((b) => by.get(b)!.sort((x, y) => x - y));
}
function repeats(seq: number[][]): string[] {
  const out: string[] = [];
  for (let i = 1; i < seq.length; i++) if (seq[i].join(',') === seq[i - 1].join(',')) out.push(`${i}: ${seq[i].map(nm).join(' ')}`);
  return out;
}

describe('the ladder turns around without repeating its top (§7)', () => {
  it('C major broken 3rds, 2 octaves: 50 notes, …A5 C6 · B5 G5 … E4 C4', () => {
    const ps = ladderEvents(0, H_SCALES[0], '3b', 60).map((e) => nm(e.ps[0]));
    expect(ps).toHaveLength(50);
    expect(ps.slice(24, 28).join(' ')).toBe('A5 C6 B5 G5');
    expect(ps.slice(-2).join(' ')).toBe('E4 C4');
    expect(ps.slice(0, 4).join(' ')).toBe('C4 E4 D4 F4');
    // the piano item builds the same line
    const d = generate({ family: 'k-sharm', kind: 'hl-3b', key: 0, hands: 'R', option: 0 });
    expect(d.notes).toHaveLength(50);
  });

  it('C major arpeggios, 2 octaves: the way down starts on the degree under the top C6', () => {
    // 7ths: 9 chords up (the last Dm7 reaches C6), 8 down from B5 (Cmaj7 from its top) — 68 notes
    const s7 = ladderEvents(0, H_SCALES[0], '7a', 60).map((e) => nm(e.ps[0]));
    expect(s7).toHaveLength(68);
    expect(s7.slice(32, 40).join(' ')).toBe('D5 F5 A5 C6 B5 G5 E5 C5');
    expect(s7.slice(-4).join(' ')).toBe('B4 G4 E4 C4');
    // triads: 11 up (the last F reaches C6), 10 down from B5 — 63 notes
    const tri = ladderEvents(0, H_SCALES[0], 'ta', 60).map((e) => nm(e.ps[0]));
    expect(tri).toHaveLength(63);
    expect(tri.slice(30, 36).join(' ')).toBe('F5 A5 C6 B5 G5 E5');
    expect(tri.slice(-3).join(' ')).toBe('G4 E4 C4');
  });

  it('1-octave forms (U5): one octave of roots — a 3rd / chord on every degree I…I, then down from below the top', () => {
    const b3 = ladderEvents(0, H_SCALES[0], '3b', 60, 1).map((e) => nm(e.ps[0]));
    expect(b3.join(' ')).toBe('C4 E4 D4 F4 E4 G4 F4 A4 G4 B4 A4 C5 B4 D5 C5 E5 D5 B4 C5 A4 B4 G4 A4 F4 G4 E4 F4 D4 E4 C4');
    const ta = ladderEvents(0, H_SCALES[0], 'ta', 60, 1).map((e) => nm(e.ps[0]));
    // 8 triads up (C … C), 7 down from F5 (the degree under the top G5)
    expect(ta).toHaveLength(45);
    expect(ta.slice(18, 27).join(' ')).toBe('B4 D5 F5 C5 E5 G5 F5 D5 B4');
    expect(ta.slice(-3).join(' ')).toBe('G4 E4 C4');
    const s7 = ladderEvents(0, H_SCALES[0], '7a', 60, 1).map((e) => nm(e.ps[0]));
    // 8 sevenths up (Cmaj7 … Cmaj7), 7 down from A5 (the degree under the top B5)
    expect(s7).toHaveLength(60);
    expect(s7.slice(28, 36).join(' ')).toBe('C5 E5 G5 B5 A5 F5 D5 B4');
    expect(s7.slice(-4).join(' ')).toBe('B4 G4 E4 C4');
    const t3 = ladderEvents(0, H_SCALES[0], '3t', 60, 1);
    expect(t3).toHaveLength(15);
    // a 9th chord does not fit in one octave: '9a' keeps its two
    expect(ladderEvents(0, H_SCALES[0], '9a', 48, 1)).toEqual(ladderEvents(0, H_SCALES[0], '9a', 48, 2));
  });

  it('every step, every scale, every key, 1 and 2 octaves: no onset repeats the one before (the ladder itself)', () => {
    const bad: string[] = [];
    for (const step of STEPS)
      for (const i of scalesFor(step))
        for (let key = 0; key < 12; key++)
          for (const octs of [1, 2]) {
            const evs = ladderEvents(key, H_SCALES[i], step, 60 + key, octs);
            expect(evs.length, `${step} ${H_SCALES[i].id} ${key} ${octs}`).toBeGreaterThan(0);
            for (const r of repeats(evs.map((e) => e.ps))) bad.push(`${step} ${H_SCALES[i].id} key ${key} ${octs} oct @${r}`);
            // home on the tonic (the line kinds start and end on it)
            if (step === 'line' || step === '3b' || step === 'ta' || step === '7a' || step === 'c4' || step === '9a') expect(evs[evs.length - 1].ps[0]).toBe(60 + key);
          }
    expect(bad).toEqual([]);
  });

  it('piano, guitar and bass items: no adjacent repeated onset, in every key, 1 and 2 octaves', () => {
    const bad: string[] = [];
    const check = (d: Drill, tag: string) => {
      for (const r of repeats(onsets(d))) bad.push(`${tag} @${r}`);
    };
    for (const step of ['3b', 'ta', '7a', 'line', '3t', 'c4', '9a'] as HStep[])
      for (const i of scalesFor(step))
        for (let key = 0; key < 12; key++)
          for (const octaves of [undefined, 1] as const) {
            const o = octaves ? { octaves } : {};
            check(generate({ family: 'k-sharm', kind: `hl-${step}`, key, hands: 'R', option: i, ...o }), `piano ${step} ${i} ${key} ${octaves ?? 2}`);
            check(generateGuitar({ family: 'g-harm', kind: `hl-${step}`, key, hands: 'R', instrument: 'guitar', option: i, ...o } as DrillSpec), `guitar ${step} ${i} ${key} ${octaves ?? 2}`);
          }
    for (const op of [0, 5, 7])
      for (let key = 0; key < 12; key++) check(generateGuitar({ family: 'b-chord', kind: 'dia7', hands: 'R', instrument: 'bass', key, option: op } as DrillSpec), `bass dia7 ${op} ${key}`);
    expect(bad).toEqual([]);
  });

  it('item ids do not change (no note count in them); the 1-octave form is its own item', () => {
    const s: DrillSpec = { family: 'k-sharm', kind: 'hl-3b', key: 2, hands: 'R', option: 0 };
    expect(itemIdOf(s)).toBe('k-sharm:hl-3b:2:R:op0');
    expect(generate(s).itemId).toBe('k-sharm:hl-3b:2:R:op0');
    expect(itemIdOf({ ...s, octaves: 1 })).toBe('k-sharm:hl-3b:2:R:o1:op0');
  });
});
