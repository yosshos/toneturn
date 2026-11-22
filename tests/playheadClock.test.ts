import { describe, expect, it } from 'vitest';
import { cursorBeatAt, cursorStop, frameLead, glidePos } from '../src/engine/playhead';
import type { Drill } from '../src/engine/drills/types';

// Owner 2026-11-22: the staff cursor ran on past the end of the line and off the tempo. The cursor's beat is now a pure
// function of the audio clock (ms since beat 0 is heard): each written onset is reached when it sounds, it stops on the
// last note.

const eighths = (n: number, extra: Partial<Drill> = {}): Drill =>
  ({
    itemId: 't',
    meter: 4,
    beats: n / 2 + 1,
    spec: {},
    notes: Array.from({ length: n }, (_, i) => ({ pitch: 60 + i, beat: i / 2, dur: i === n - 1 ? 1 : 0.5, hand: 'R' })),
    ...extra,
  }) as unknown as Drill;

describe('the cursor clock', () => {
  // two octaves up and down in 8ths: 29 notes, the last on beat 14
  const scale = eighths(29);
  it('stops on the last note (never runs on to the end of the line)', () => {
    expect(cursorStop(scale)).toBe(14);
    expect(cursorBeatAt(scale, 60, 14000)).toBe(14);
    expect(cursorBeatAt(scale, 60, 15500)).toBe(14);
    expect(cursorBeatAt(scale, 60, 60000)).toBe(14);
  });
  it('is the heard beat inside the music, at any tempo (no stale beat length)', () => {
    expect(cursorBeatAt(scale, 60, 0)).toBe(0);
    expect(cursorBeatAt(scale, 60, 7250)).toBeCloseTo(7.25, 6);
    expect(cursorBeatAt(scale, 100, 3000)).toBeCloseTo(5, 6);
    // the same drill again at 60 after 100: no beat length carried over
    expect(cursorBeatAt(scale, 60, 3000)).toBeCloseTo(3, 6);
    expect(cursorBeatAt(scale, 144, 2500)).toBeCloseTo(6, 6);
  });
  it('is negative in the count-in', () => {
    expect(cursorBeatAt(scale, 60, -2000)).toBeCloseTo(-2, 6);
  });
  it('swung 8ths: the off-beat is reached at 2/3 of the beat, when it sounds', () => {
    const sw = eighths(16, { spec: { swing: true } } as Partial<Drill>);
    const beat = 60000 / 90;
    expect(cursorBeatAt(sw, 90, (2 / 3) * beat)).toBeCloseTo(0.5, 6);
    expect(cursorBeatAt(sw, 90, (1 / 3) * beat)).toBeCloseTo(0.25, 6);
    expect(cursorBeatAt(sw, 90, (5 / 6) * beat)).toBeCloseTo(0.75, 6);
    expect(cursorBeatAt(sw, 90, (3 + 2 / 3) * beat)).toBeCloseTo(3.5, 6);
    expect(cursorBeatAt(sw, 90, 4 * beat)).toBeCloseTo(4, 6);
  });
  it('a pickup (first note after beat 0) runs at the heard beat up to it', () => {
    const d = { ...eighths(8), notes: eighths(8).notes.map((n) => ({ ...n, beat: n.beat + 3 })) } as Drill;
    expect(cursorBeatAt(d, 60, 1500)).toBeCloseTo(1.5, 6);
    expect(cursorBeatAt(d, 60, 3500)).toBeCloseTo(3.5, 6);
  });
  it('follows a tempo map (twice as fast from bar 2)', () => {
    const d = eighths(17, { tempoMap: [{ bar: 1, ratio: 2 }] } as Partial<Drill>);
    expect(cursorBeatAt(d, 60, 2000)).toBeCloseTo(2, 6);
    expect(cursorBeatAt(d, 60, 5000)).toBeCloseTo(6, 6);
    expect(cursorBeatAt(d, 60, 6000)).toBeCloseTo(8, 6);
  });
  it('never moves back as time goes on', () => {
    const sw = eighths(29, { spec: { swing: true } } as Partial<Drill>);
    let prev = -Infinity;
    for (let ms = 0; ms < 20000; ms += 7) {
      const b = cursorBeatAt(sw, 117, ms);
      expect(b).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = b;
    }
  });
});

describe('the frame lead (the beat is drawn a frame after it is computed)', () => {
  it('follows the real frame length, ignoring stalls', () => {
    const lead = frameLead();
    let t = 0;
    for (let i = 0; i < 60; i++) lead((t += 33.3));
    expect(lead((t += 33.3))).toBeCloseTo(33.3, 0);
    expect(lead((t += 2000))).toBeCloseTo(33.3, 0); // a hidden tab: not a frame
    for (let i = 0; i < 60; i++) lead((t += 8.3));
    expect(lead((t += 8.3))).toBeCloseTo(8.3, 0);
  });
});

describe('on the staff: the last line ends on the last note', () => {
  // the last line of the scale on a phone (one bar a line): beats 12–16, notes at 12, 12.5, 13, 13.5, 14, then a rest
  const ats = [12, 12.5, 13, 13.5, 14, 15];
  const lineEnd = 16;
  it('the clamped beat stands on the last notehead, not on the rest or the line end', () => {
    const scale = eighths(29);
    const at = (ms: number) => glidePos(ats, lineEnd, cursorBeatAt(scale, 60, ms));
    expect(at(14000)).toBe(4);
    expect(at(15900)).toBe(4);
    expect(at(13250)).toBeCloseTo(2.5, 6);
  });
});
