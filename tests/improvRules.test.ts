import { describe, expect, it } from 'vitest';
import { CHALLENGES, INTERVAL_RULES, NOTE_RULES, RHYTHM_RULES, RULE_NAME, SHAPE_RULES, autoScale, challengeOf, checkRules, randomChallenge, type PlayedNote, type RuleSet } from '../src/engine/improvRules';
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

describe('the rule library (2026-11-09)', () => {
  const R = (r: Partial<RuleSet>): RuleSet => ({ note: null, interval: null, rhythm: null, shape: null, ...r });
  const one = (rs: RuleSet, ps: [number, number][]) => checkRules(line(ps), chart, 4, bpm, rs).checks[0];

  it('every challenge uses known rules from the right families, ids are unique, and every rule has words', () => {
    const ids = new Set(CHALLENGES.map((c) => c.id));
    expect(ids.size).toBe(CHALLENGES.length);
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(45);
    for (const c of CHALLENGES) {
      if (c.rules.note) expect(NOTE_RULES).toContain(c.rules.note);
      if (c.rules.interval) expect(INTERVAL_RULES).toContain(c.rules.interval);
      if (c.rules.rhythm) expect(RHYTHM_RULES).toContain(c.rules.rhythm);
      if (c.rules.shape) expect(SHAPE_RULES).toContain(c.rules.shape);
      expect(challengeOf(c.rules)?.id).toBe(c.id);
    }
    for (const r of [...NOTE_RULES, ...INTERVAL_RULES, ...RHYTHM_RULES, ...SHAPE_RULES]) expect(RULE_NAME[r].how.he.length).toBeGreaterThan(5);
  });

  it('every rule can be checked on a take without crashing, and a random challenge exists', () => {
    const take: [number, number][] = Array.from({ length: 24 }, (_, i) => [i * 0.5 + (i > 12 ? 2 : 0), 60 + ((i * 5) % 14)]);
    for (const n of NOTE_RULES) expect(Number.isFinite(checkRules(line(take), chart, 4, bpm, R({ note: n })).score)).toBe(true);
    for (const n of INTERVAL_RULES) expect(Number.isFinite(checkRules(line(take), chart, 4, bpm, R({ interval: n })).score)).toBe(true);
    for (const n of RHYTHM_RULES) expect(Number.isFinite(checkRules(line(take), chart, 4, bpm, R({ rhythm: n })).score)).toBe(true);
    for (const n of SHAPE_RULES) expect(Number.isFinite(checkRules(line(take), chart, 4, bpm, R({ shape: n })).score)).toBe(true);
    expect(randomChallenge(1, () => 0.99).level).toBe(1);
  });

  it('notes: one note, guide tones, no roots, land on the 7th, pentatonic', () => {
    expect(one(R({ note: 'one-note' }), [[0, 62], [1, 62], [2, 62], [3, 64]])).toEqual({ rule: 'one-note', ok: 3, total: 4 });
    // Dm7: F C guide tones; G7: B F
    expect(one(R({ note: 'guide-tones' }), [[0, 65], [1, 72], [2, 62], [4, 71], [5, 77]])).toEqual({ rule: 'guide-tones', ok: 4, total: 5 });
    expect(one(R({ note: 'no-roots' }), [[0, 62], [1, 65], [4, 67], [5, 71]])).toEqual({ rule: 'no-roots', ok: 2, total: 4 });
    expect(one(R({ note: 'target-7' }), [[0, 72], [1, 69], [4, 77], [8, 71]])).toEqual({ rule: 'target-7', ok: 3, total: 3 });
    // D minor pentatonic over Dm7: D F G A C — E is out
    expect(one(R({ note: 'pentatonic' }), [[0, 62], [1, 64], [2, 67], [3, 72]])).toEqual({ rule: 'pentatonic', ok: 3, total: 4 });
  });

  it('notes: enclosures on strong beats, connecting chords by step', () => {
    // E♭ → D on beat 2 (0-based beat 2 = "3"), C# → D on beat 0 of bar 2 is G7's ... use F (3rd of Dm7) approached from E
    expect(one(R({ note: 'enclose' }), [[1.5, 64], [2, 65]])).toEqual({ rule: 'enclose', ok: 1, total: 1 });
    expect(one(R({ note: 'enclose' }), [[1.5, 60], [2, 65]])).toEqual({ rule: 'enclose', ok: 0, total: 1 });
    // Dm7 → G7 at beat 4: C → B is a step; then G7 → Cmaj7 at beat 8: F → C is a leap
    expect(one(R({ note: 'connect' }), [[3, 72], [4, 71], [7, 65], [8, 72]])).toEqual({ rule: 'connect', ok: 1, total: 2 });
  });

  it('intervals: fourths, zigzag, leap then step back', () => {
    expect(one(R({ interval: 'fourths' }), [[0, 60], [1, 65], [2, 70], [3, 65]])).toEqual({ rule: 'fourths', ok: 3, total: 3 });
    expect(one(R({ interval: 'zigzag' }), [[0, 60], [1, 64], [2, 62], [3, 65], [4, 67]])).toEqual({ rule: 'zigzag', ok: 2, total: 3 });
    expect(one(R({ interval: 'recover' }), [[0, 60], [1, 67], [2, 65], [3, 72], [4, 74]])).toEqual({ rule: 'recover', ok: 1, total: 2 });
  });

  it('rhythm: off the beat, rest on 1, three over four, one rhythm every bar', () => {
    expect(one(R({ rhythm: 'offbeats' }), [[0.5, 60], [1.5, 62], [2, 64]])).toEqual({ rule: 'offbeats', ok: 2, total: 3 });
    expect(one(R({ rhythm: 'no-one' }), [[0, 60], [1, 62], [4.5, 64], [8, 65]])).toEqual({ rule: 'no-one', ok: 2, total: 4 });
    expect(one(R({ rhythm: 'dotted' }), [[0, 60], [1.5, 62], [3, 64], [4.5, 65], [5, 67]])).toEqual({ rule: 'dotted', ok: 4, total: 5 });
    expect(one(R({ rhythm: 'same-rhythm' }), [[0, 60], [1.5, 62], [4, 64], [5.5, 65], [8, 67], [10, 69]])).toEqual({ rule: 'same-rhythm', ok: 1, total: 2 });
  });

  it('shape: phrases rise / fall / arch, end on a chord tone, one high point, within an octave', () => {
    // two phrases separated by a rest: 60 62 64 (rises), then 72 69 65 (falls; F is a chord tone of Dm7? it starts in bar 2 — G7, F is its 7th)
    const ps: [number, number][] = [[0, 60], [0.5, 62], [1, 64], [4, 72], [4.5, 69], [5, 65]];
    const shortLine = (p: [number, number][]) => p.map(([b, m], i) => ({ start: b * 0.5, end: b * 0.5 + 0.2, midi: m, i }));
    const take = (s: RuleSet) => checkRules(shortLine(ps), chart, 4, bpm, s).checks[0];
    expect(take(R({ shape: 'rise' }))).toEqual({ rule: 'rise', ok: 1, total: 2 });
    expect(take(R({ shape: 'fall' }))).toEqual({ rule: 'fall', ok: 1, total: 2 });
    expect(take(R({ shape: 'end-chord-tone' }))).toEqual({ rule: 'end-chord-tone', ok: 1, total: 2 });
    expect(take(R({ shape: 'peak-once' }))).toEqual({ rule: 'peak-once', ok: 1, total: 1 });
    expect(take(R({ shape: 'octave' }))).toEqual({ rule: 'octave', ok: 6, total: 6 });
    expect(take(R({ shape: 'fifth' })).ok).toBeLessThan(6);
    expect(take(R({ shape: 'arch' }))).toEqual({ rule: 'arch', ok: 0, total: 2 });
  });
});
