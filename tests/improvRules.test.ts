import { describe, expect, it } from 'vitest';
import { autoScale, checkRules, type PlayedNote } from '../src/engine/improvRules';
import { parseChart } from '../src/engine/charts';

const bpm = 120;
const b = 0.5; // seconds per beat
const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7', 4);
/** Notes at beat positions (quarter beats) with MIDI pitches, each lasting until the next. */
const line = (ps: [number, number][]): PlayedNote[] => ps.map(([beat, midi], i) => ({ start: beat * b, end: (ps[i + 1]?.[0] ?? beat + 1) * b - 0.02, midi }));

describe('improvising under rules', () => {
  it('chord-scales by chord', () => {
    expect(autoScale([0, 3, 7, 10])).toBe('dorian');
    expect(autoScale([0, 4, 7, 10])).toBe('mixolydian');
    expect(autoScale([0, 4, 7, 11])).toBe('ionian');
    expect(autoScale([0, 3, 6, 10])).toBe('locrian');
    expect(autoScale([0, 4, 10, 13, 15, 20])).toBe('altered');
    expect(autoScale([0, 3, 6, 9])).toBe('diminished');
  });

  it('chord tones only: an arpeggio line passes, a scale run does not', () => {
    // Dm7 D F A C · G7 B D F G · Cmaj7 E G B C
    const arps = line([[0, 62], [1, 65], [2, 69], [3, 72], [4, 71], [5, 74], [6, 77], [7, 79], [8, 76], [9, 79], [10, 83], [11, 84]]);
    const r = checkRules(arps, chart, 4, bpm, { note: 'chord-tones', interval: null, rhythm: 'quarters' });
    expect(r.checks.find((c) => c.rule === 'chord-tones')).toEqual({ rule: 'chord-tones', ok: 12, total: 12 });
    expect(r.score).toBe(1);
    const run = line([[0, 62], [1, 64], [2, 65], [3, 67]]);
    const r2 = checkRules(run, chart, 4, bpm, { note: 'chord-tones', interval: null, rhythm: null });
    expect(r2.checks[0].ok).toBe(2); // D and F yes, E and G no
    expect(r2.bars[0].breaks).toBe(2);
  });

  it('the bar scale can be set: C lydian over Cmaj7 allows F♯, ionian does not', () => {
    const fs = line([[8, 66], [9, 67], [10, 69], [11, 71]]);
    const auto = checkRules(fs, chart, 4, bpm, { note: 'scale', interval: null, rhythm: null });
    expect(auto.checks[0].ok).toBe(3);
    const lyd = checkRules(fs, chart, 4, bpm, { note: 'scale', interval: null, rhythm: null }, { 2: 'lydian' });
    expect(lyd.checks[0].ok).toBe(4);
  });

  it('guide tones on 1 and 3, and land on the 3rd of each chord', () => {
    const g = line([[0, 65], [1, 64], [2, 72], [3, 70], [4, 71], [5, 69], [6, 65], [7, 67], [8, 64]]);
    expect(checkRules(g, chart, 4, bpm, { note: 'guide-beats', interval: null, rhythm: null }).checks[0]).toEqual({ rule: 'guide-beats', ok: 5, total: 5 });
    const t = checkRules(g, chart, 4, bpm, { note: 'target-3', interval: null, rhythm: null }).checks[0];
    expect(t).toEqual({ rule: 'target-3', ok: 3, total: 3 }); // F over Dm7, B over G7, E over Cmaj7
  });

  it('intervals: thirds only and steps only', () => {
    const thirds = line([[0, 62], [1, 65], [2, 69], [3, 65], [4, 62]]);
    expect(checkRules(thirds, chart, 4, bpm, { note: null, interval: 'thirds', rhythm: null }).checks[0]).toEqual({ rule: 'thirds', ok: 4, total: 4 });
    expect(checkRules(thirds, chart, 4, bpm, { note: null, interval: 'steps', rhythm: null }).checks[0].ok).toBe(0);
  });

  it('rhythm: continuous swung eighths pass; a hole and a triplet break it', () => {
    const swung: [number, number][] = [];
    for (let k = 0; k < 8; k++) swung.push([k, 62 + (k % 3)], [k + 2 / 3, 65]);
    const ok = checkRules(line(swung), chart, 4, bpm, { note: null, interval: null, rhythm: 'eighths' });
    expect(ok.score).toBe(1);
    const holed = swung.filter(([x]) => x < 3 || x >= 4);
    const bad = checkRules(line(holed), chart, 4, bpm, { note: null, interval: null, rhythm: 'eighths' });
    expect(bad.score).toBeLessThan(1);
    const trip = checkRules(line([[0, 60], [1 / 3, 62], [2 / 3, 64], [1, 65], [4 / 3, 67], [5 / 3, 69]]), chart, 4, bpm, { note: null, interval: null, rhythm: 'triplets' });
    expect(trip.score).toBe(1);
    expect(checkRules(line([[0, 60], [1 / 3, 62], [2 / 3, 64], [1, 65]]), chart, 4, bpm, { note: null, interval: null, rhythm: 'quarters' }).score).toBe(0.5);
  });

  it('three notes only, and two bars on / two off', () => {
    const three = line([[0, 62], [1, 65], [2, 69], [3, 62], [4, 71]]);
    expect(checkRules(three, chart, 4, bpm, { note: 'three-notes', interval: null, rhythm: null }).checks[0].ok).toBe(4);
    const space = line([[0, 62], [4, 65], [8, 69], [12, 70]]);
    expect(checkRules(space, chart, 4, bpm, { note: null, interval: null, rhythm: 'space' }).checks[0]).toEqual({ rule: 'space', ok: 2, total: 4 });
  });
});
describe('auto scales for the extended chords', () => {
  it('maj7#11 lydian, 7#5 whole-tone, 7b9sus phrygian, 7#11 lydian dominant', () => {
    expect(autoScale([0, 4, 7, 11, 18])).toBe('lydian');
    expect(autoScale([0, 4, 8, 10])).toBe('whole-tone');
    expect(autoScale([0, 5, 7, 10, 13])).toBe('phrygian');
    expect(autoScale([0, 4, 7, 10, 18])).toBe('lydian-dominant');
  });
});
