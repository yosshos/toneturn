import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { newItem } from '../src/engine/drills/ladder';
import { notesPerBeat } from '../src/engine/drills/analyze';
import { analyzeFree, freeProgress, hasRubato, quartersDrill, rubatoStage, skipRubato, withStageTake } from '../src/engine/drills/rubato';
import type { DrillSpec, PlayedNote } from '../src/engine/drills/types';

// Rubato first (owner 2026-11-14): a new item is played in free time (notes only), then in quarters at ♩60, then at tempo.
const scale = generate({ family: 'scales', kind: 'scale', key: 7, scale: 'major', hands: 'R', octaves: 1 } as DrillSpec);
const play = (pitches: number[], gap = 700): PlayedNote[] => pitches.map((p, i) => ({ pitch: p, on: i * gap, off: i * gap + 300, vel: 70 }));
const written = () => scale.notes.map((n) => n.pitch);

describe('rubato first', () => {
  it('a new scale item starts in free time, then quarters, then its own tempo', () => {
    expect(hasRubato(scale)).toBe(true);
    let st = newItem(scale);
    expect(rubatoStage(st, scale)).toBe('free');
    const clean = analyzeFree(scale, play(written()));
    st = withStageTake(st, 'free', clean);
    expect(rubatoStage(st, scale)).toBe('free');
    st = withStageTake(st, 'free', clean);
    expect(rubatoStage(st, scale)).toBe(notesPerBeat(scale) > 1.2 ? 'quarters' : null);
    st = withStageTake(st, 'quarters', { ...clean, verdict: 'clean' });
    expect(rubatoStage(st, scale)).toBeNull();
  });

  it('items played before keep their ladder; skipping goes straight to tempo', () => {
    expect(rubatoStage({ ...newItem(scale), takes: 5 }, scale)).toBeNull();
    expect(rubatoStage(skipRubato(newItem(scale)), scale)).toBeNull();
  });

  it('free-time grading ignores timing, counts wrong and missed notes', () => {
    const uneven = written().map((p, i) => ({ pitch: p, on: i * i * 97, off: null, vel: 64 }));
    expect(analyzeFree(scale, uneven).verdict).toBe('clean');
    const w = written();
    const oneWrong = [...w.slice(0, 3), w[3] + 1, ...w.slice(3)];
    const m1 = analyzeFree(scale, play(oneWrong));
    expect(m1.accuracy).toBe(1);
    expect(m1.wrong).toBe(1);
    const missing = analyzeFree(scale, play(w.slice(0, Math.floor(w.length / 2))));
    expect(missing.verdict).toBe('not');
    expect(missing.missing).toBe(w.length - Math.floor(w.length / 2));
    expect(missing.timingSD).toBeNull();
  });

  it('a restart in the middle costs only the repeated notes', () => {
    const w = written();
    const m = analyzeFree(scale, play([...w.slice(0, 4), ...w]));
    expect(m.accuracy).toBe(1);
    expect(m.wrong).toBe(4);
  });

  it('hands together: notes struck together are one onset', () => {
    const rl = generate({ family: 'scales', kind: 'scale', key: 0, scale: 'major', hands: 'RL', octaves: 1 } as DrillSpec);
    const byBeat = new Map<number, number[]>();
    rl.notes.forEach((n) => byBeat.set(n.beat, [...(byBeat.get(n.beat) ?? []), n.pitch]));
    const played: PlayedNote[] = [];
    [...byBeat.values()].forEach((ps, i) => ps.forEach((p, k) => played.push({ pitch: p, on: i * 800 + k * 30, off: null, vel: 64 })));
    expect(analyzeFree(rl, played).verdict).toBe('clean');
    // Hands 110 ms apart (two strikes): still one onset each.
    const loose: PlayedNote[] = [];
    [...byBeat.values()].forEach((ps, i) => ps.forEach((p, k) => loose.push({ pitch: p, on: i * 800 + k * 110, off: null, vel: 64 })));
    expect(analyzeFree(rl, loose).verdict).toBe('clean');
  });

  it('quarters: the same notes one per beat; the now-cue waits for the player', () => {
    const q = quartersDrill(scale);
    expect(q.notes.map((n) => n.pitch)).toEqual(written());
    expect(notesPerBeat(q)).toBeCloseTo(1, 5);
    expect(freeProgress(scale, play(written().slice(0, 3)))).toBe(scale.notes[3].beat);
    expect(freeProgress(scale, play(written()))).toBe(scale.beats);
  });
});
