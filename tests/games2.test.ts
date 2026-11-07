import { describe, expect, it } from 'vitest';
import {
  checkpointOf,
  ensureGates,
  flightRange,
  foldPitch,
  gateLabel,
  heightToMidi,
  initState,
  isCheckpoint,
  levelAt,
  makeCourse,
  scaleStep,
  scoreOf,
  START_LIVES,
  step,
  viewBand,
  type Course,
  type FlightState,
} from '../src/engine/flight';
import { centsToNote, dayKey, daysPlayed, doneOn, meanAbs, memoryScore, takePitch, trend } from '../src/engine/pitchMemory';
import { makeRounds as tuneRounds, roundPoints as tunePoints, songEvents, ROUNDS as TUNE_ROUNDS } from '../src/engine/nameTune';
import { SONGS } from '../src/engine/songs';
import { beatRate, centsLeft, makeRounds as upRounds, midiHz, OPEN, roundFor, roundPoints as upPoints, toneHz, ROUNDS as UP_ROUNDS } from '../src/engine/tuneUp';

const RANGE = { low: 55, high: 69 };

/** Fly the course singing each gate's centre (or `miss` semitones off). */
function fly(c: Course, s: FlightState, secs: number, miss = 0) {
  let st = s;
  const events: string[] = [];
  for (let k = 0; k < secs * 60 && !st.over; k++) {
    ensureGates(c, st.next + 1);
    const r = step(c, st, 1 / 60, c.gates[st.next].center + miss);
    st = r.s;
    events.push(...r.events);
  }
  return { s: st, events };
}

describe('Voice Flight', () => {
  it('generates the same course for the same seed, gates inside the range', () => {
    const a = makeCourse(42, 1, RANGE);
    const b = makeCourse(42, 1, RANGE);
    ensureGates(a, 100);
    ensureGates(b, 100);
    expect(a.gates).toEqual(b.gates);
    expect(makeCourse(43, 1, RANGE).gates.map((g) => g.center)).not.toEqual(a.gates.slice(0, 12).map((g) => g.center));
    for (const g of a.gates) {
      expect(g.center).toBeGreaterThanOrEqual(RANGE.low);
      expect(g.center).toBeLessThanOrEqual(RANGE.high);
    }
    expect(a.gates[0].center).toBe(a.tonic);
  });

  it('level 1 moves by step on scale degrees; level 3 is chromatic; levels rise every 30 gates', () => {
    const c = makeCourse(7, 1, RANGE);
    ensureGates(c, 90);
    const major = [0, 2, 4, 5, 7, 9, 11];
    for (let i = 1; i < 30; i++) {
      expect(major).toContain(c.gates[i].semis);
      expect(Math.abs(c.gates[i].center - c.gates[i - 1].center)).toBeLessThanOrEqual(2);
      expect(c.gates[i].half).toBe(1.5);
    }
    expect(levelAt(1, 29)).toBe(1);
    expect(levelAt(1, 30)).toBe(2);
    expect(levelAt(1, 60)).toBe(3);
    expect(levelAt(2, 200)).toBe(3);
    expect(c.gates[35].half).toBeLessThan(1.5);
    const chrom = makeCourse(9, 3, RANGE);
    ensureGates(chrom, 60);
    expect(chrom.gates.some((g) => ![0, 2, 4, 5, 7, 9, 11].includes(g.semis))).toBe(true);
    expect(gateLabel({ ...chrom.gates[0], semis: 3 })).toBe('♭3');
    expect(gateLabel({ ...chrom.gates[0], semis: 7 })).toBe('5');
  });

  it('passing gates scores 10 each plus distance; missing costs a life; three misses end the flight', () => {
    const c = makeCourse(5, 1, RANGE);
    const ok = fly(c, initState(c), 20);
    expect(ok.s.passed).toBeGreaterThan(3);
    expect(ok.s.lives).toBe(START_LIVES);
    expect(scoreOf(ok.s)).toBe(Math.floor(ok.s.x / 100) + ok.s.passed * 10);
    const bad = fly(makeCourse(5, 1, RANGE), initState(c), 60, 5);
    expect(bad.s.over).toBe(true);
    expect(bad.s.passed).toBe(0);
    expect(bad.events.filter((e) => e === 'hit')).toHaveLength(3);
    expect(bad.events.at(-1)).toBe('over');
  });

  it('a checkpoint every 10 gates; resuming from it restores the same course and position', () => {
    const c = makeCourse(11, 1, RANGE);
    const r = fly(c, initState(c), 40);
    expect(r.events.filter((e) => e === 'checkpoint').length).toBeGreaterThanOrEqual(1);
    const cp = checkpointOf(c, { ...r.s, next: 10, passed: 10 });
    const saved = JSON.parse(JSON.stringify(cp));
    expect(isCheckpoint(saved)).toBe(true);
    expect(isCheckpoint({ v: 1 })).toBe(false);
    const c2 = makeCourse(saved.seed, saved.startLevel, saved.range);
    const s2 = initState(c2, saved);
    expect(s2.next).toBe(10);
    expect(s2.passed).toBe(10);
    ensureGates(c, 20);
    expect(c2.gates.slice(0, 20)).toEqual(c.gates.slice(0, 20));
    expect(s2.x).toBeGreaterThan(c2.gates[9].x);
    expect(s2.x).toBeLessThan(c2.gates[10].x);
  });

  it('silence lets the bird sink; octave errors are folded into the band; calm mode is slower', () => {
    const c = makeCourse(3, 1, RANGE);
    const s = initState(c);
    const r = step(c, s, 0.5, null);
    expect(r.s.y).toBeLessThan(s.y);
    expect(foldPitch(RANGE.low - 12, RANGE)).toBe(RANGE.low);
    expect(foldPitch(RANGE.high + 12, RANGE)).toBe(RANGE.high);
    const b = viewBand(RANGE);
    expect(foldPitch(40, RANGE)).toBeGreaterThanOrEqual(b.low);
    expect(step(c, s, 1, 60, true).s.x).toBeLessThan(step(c, s, 1, 60, false).s.x);
    expect(flightRange(null, 'voice').high - flightRange(null, 'voice').low).toBeGreaterThanOrEqual(12);
    expect(flightRange({ low: 50, high: 70 }, 'voice')).toEqual({ low: 50, high: 70 });
  });
});

describe('Voice Flight touch steering', () => {
  it('arrow steps move one scale step (a semitone when chromatic) and stay inside the band', () => {
    const c = makeCourse(21, 1, RANGE);
    const t = c.tonic;
    expect(scaleStep(c, t, 1)).toBe(t + 2);
    expect(scaleStep(c, t, -1)).toBe(t - 1); // degree 7 below the tonic
    expect(scaleStep(c, t + 4, 1)).toBe(t + 5); // 3 → 4
    expect(scaleStep(c, t, 1, true)).toBe(t + 1);
    const b = viewBand(RANGE);
    let m = t;
    for (let k = 0; k < 40; k++) m = scaleStep(c, m, 1);
    expect(m).toBeLessThanOrEqual(b.high);
    expect(scaleStep(c, m, 1)).toBe(m);
  });
  it('a touch height maps onto the band (top = high)', () => {
    const c = makeCourse(21, 1, RANGE);
    const b = viewBand(RANGE);
    expect(heightToMidi(c, 0)).toBe(b.high);
    expect(heightToMidi(c, 1)).toBe(b.low);
    expect(heightToMidi(c, 0.5)).toBe((b.high + b.low) / 2);
    expect(heightToMidi(c, -3)).toBe(b.high);
  });
});

describe('Pitch Memory', () => {
  const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
  it('cents to the nearest octave of the chosen note', () => {
    expect(centsToNote(69, 9)).toBe(0);
    expect(centsToNote(57.12, 9)).toBe(12);
    expect(centsToNote(68.7, 9)).toBe(-30);
    expect(centsToNote(75, 9)).toBe(-600);
    expect(centsToNote(62, 0)).toBe(200);
  });
  it('the take is the median of the held, confident frames', () => {
    const frames = [
      { t: 0, hz: hz(60), confidence: 0.9, rms: 0.1 }, // attack (skipped)
      ...Array.from({ length: 30 }, (_, i) => ({ t: 0.2 + i / 30, hz: hz(69.1), confidence: 0.95, rms: 0.1 })),
      { t: 1.5, hz: hz(80), confidence: 0.3, rms: 0.1 },
    ];
    expect(takePitch(frames)).toBeCloseTo(69.1, 5);
    expect(takePitch(frames.slice(0, 3))).toBeNull();
  });
  it('30-day trend, once a day, mean error and days played', () => {
    const today = new Date(2026, 10, 7);
    const log = [
      { day: '2026-11-07', cents: 12, note: 9 },
      { day: '2026-11-05', cents: -20, note: 9 },
      { day: '2026-09-01', cents: 90, note: 9 },
    ];
    expect(dayKey(today)).toBe('2026-11-07');
    expect(doneOn(log, '2026-11-07')?.cents).toBe(12);
    expect(doneOn(log, '2026-11-06')).toBeNull();
    const t = trend(log, today);
    expect(t).toHaveLength(30);
    expect(t[29]).toEqual({ day: '2026-11-07', cents: 12 });
    expect(t[27].cents).toBe(-20);
    expect(t[0].day).toBe('2026-10-09');
    expect(meanAbs(t)).toBe(16);
    expect(daysPlayed(log)).toBe(3);
    expect(memoryScore(0)).toBe(100);
    expect(memoryScore(-30)).toBe(70);
    expect(memoryScore(250)).toBe(0);
  });
});

describe('Name That Tune', () => {
  it('10 rounds, every song once, 4 distinct options with the answer, deterministic', () => {
    const r = tuneRounds(99, SONGS);
    expect(r).toHaveLength(TUNE_ROUNDS);
    expect(tuneRounds(99, SONGS)).toEqual(r);
    expect(new Set(r.map((x) => x.songId)).size).toBe(Math.min(TUNE_ROUNDS, SONGS.length));
    for (const x of r) {
      expect(x.options).toHaveLength(4);
      expect(new Set(x.options).size).toBe(4);
      expect(x.options).toContain(x.songId);
    }
    // The answer is not always in the same slot.
    expect(new Set(r.map((x) => x.options.indexOf(x.songId))).size).toBeGreaterThan(1);
  });
  it('faster = more points; wrong = 0', () => {
    expect(tunePoints(true, 1000)).toBe(100);
    expect(tunePoints(true, 5750)).toBe(75);
    expect(tunePoints(true, 20000)).toBe(50);
    expect(tunePoints(false, 500)).toBe(0);
    expect(tunePoints(true, 3000)).toBeGreaterThan(tunePoints(true, 6000));
  });
  it('the opening plays in the round key with the song rhythm', () => {
    const ode = SONGS.find((s) => s.id === 'ode')!;
    const { events, length } = songEvents(ode, 60, 120);
    expect(events.map((e) => e.midi)).toEqual([64, 64, 65, 67, 67, 65, 64, 62]);
    expect(events[1].start).toBeCloseTo(0.5);
    expect(length).toBeCloseTo(4.4);
  });
});

describe('Tune-up', () => {
  it('8 rounds, detune 5–50 ¢, deterministic, strings vary', () => {
    const r = upRounds(1234);
    expect(r).toHaveLength(UP_ROUNDS);
    expect(upRounds(1234)).toEqual(r);
    for (const x of r) {
      expect(Math.abs(x.detune)).toBeGreaterThanOrEqual(5);
      expect(Math.abs(x.detune)).toBeLessThanOrEqual(50);
    }
    expect(new Set(r.slice(0, 6).map((x) => x.string)).size).toBe(6);
  });
  it('the reference and the string meet in unison (fretted) or on the harmonic pair', () => {
    for (let s = 1; s <= 6; s++) {
      const f = roundFor(s, 20, 'fret');
      expect(f.toneMidi).toBe(f.refMidi);
      const h = roundFor(s, 20, 'harmonic');
      expect(h.toneMidi).toBe(h.refMidi);
    }
    expect(roundFor(2, 10, 'fret')).toMatchObject({ refFret: 4, refMidi: OPEN[1] });
    expect(roundFor(2, 10, 'harmonic').kind).toBe('fret'); // G–B is a third: no harmonic pair
    expect(roundFor(4, 10, 'harmonic')).toMatchObject({ kind: 'harmonic', refMidi: OPEN[4] + 24 });
  });
  it('beats vanish when the peg undoes the detune; points by cents left', () => {
    const r = roundFor(3, 30, 'fret');
    expect(beatRate(r, 0)).toBeGreaterThan(1);
    expect(beatRate(r, -30)).toBeCloseTo(0, 6);
    expect(toneHz(r, -30)).toBeCloseTo(midiHz(r.refMidi), 6);
    expect(centsLeft(r, -27.5)).toBe(2.5);
    expect(upPoints(0)).toBe(100);
    expect(upPoints(1)).toBe(100);
    expect(upPoints(-6)).toBe(80);
    expect(upPoints(40)).toBe(0);
  });
});
