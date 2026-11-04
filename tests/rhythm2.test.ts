import { describe, expect, it } from 'vitest';
import {
  buildPalette,
  CELLS,
  describe as describeRhythm,
  distractors,
  events,
  gradeReading,
  meterOf,
  onsetBeats,
  parseRhythmWords,
  readTimeline,
  readTolerance,
  rhythmAt,
  rhythmFromKey,
  rhythmKey,
  sameRhythm,
  signature,
  totalBeats,
  type RhythmLevel,
} from '../src/engine/rhythm';
import { makeLesson } from '../src/engine/lesson';

const LEVELS: RhythmLevel[] = [4, 5, 6, 7, 8];

describe('R4–R8 generation (spec G.7)', () => {
  it('every bar is full, cells fit the meter, and the new material appears', () => {
    const newMat: Record<number, string[]> = { 4: ['ssss', 'es', 'se'], 5: ['syn', 'ere'], 6: ['trip'], 7: ['dh', 'h', 'dq', 'qe', 'eq', 'eee'], 8: ['ee', 'syn', 'qtrip'] };
    for (const lv of LEVELS)
      for (let seed = 0; seed < 40; seed++) {
        const r = rhythmAt(lv, 2, seed);
        expect(totalBeats(r)).toBeCloseTo(2 * r.beatsPerBar);
        expect(r.cells.some((c) => newMat[lv].includes(c))).toBe(true);
        if (meterOf(r) === '6/8') expect(r.cells.every((c) => CELLS[c].compound)).toBe(true);
        else expect(r.cells.some((c) => CELLS[c].compound)).toBe(false);
      }
  });
  it('R7 uses both 3/4 and 6/8; R8 is swung', () => {
    const meters = new Set(Array.from({ length: 30 }, (_, s) => meterOf(rhythmAt(7, 1, s))));
    expect(meters).toEqual(new Set(['3/4', '6/8']));
    expect(rhythmAt(8, 1, 3).swing).toBe(true);
  });
  it('swing plays the off-beat eighth a third of a beat late (2:1)', () => {
    const r = { beatsPerBar: 4, bars: 1, cells: ['ee', 'ee', 'q', 'q'], swing: true } as const;
    expect(onsetBeats({ ...r, cells: [...r.cells] }).slice(0, 4).map((x) => Math.round(x * 1000) / 1000)).toEqual([0, 0.667, 1, 1.667]);
    expect(events({ ...r, cells: [...r.cells] })[0].dur).toBe(8);
  });
  it('6/8: clicks on the dotted-quarter pulse; count-in is one bar (2 pulses)', () => {
    const r = rhythmFromKey('m6:dq.eee', 1);
    const tl = readTimeline(r, 90);
    const pulse = (60 / 90) * 1.5;
    expect(tl.responseAt).toBeCloseTo(2 * pulse);
    expect(tl.clicks).toHaveLength(4);
    expect(tl.clicks.map((c) => c.accent)).toEqual([true, false, true, false]);
  });
  it('triplets vs straight eighths are told apart: tolerance below half their distance', () => {
    const bpm = 72;
    const beatMs = 60000 / bpm;
    expect(readTolerance(6, bpm)).toBeLessThan((beatMs / 6) / 2);
    const trip = rhythmFromKey('trip.q.q.q');
    const straightTaps = [0, beatMs / 2, beatMs, 2 * beatMs, 3 * beatMs];
    expect(gradeReading(trip, bpm, straightTaps, 6).pass).toBe(false);
    const tripTaps = [0, beatMs / 3, (2 * beatMs) / 3, beatMs, 2 * beatMs, 3 * beatMs];
    expect(gradeReading(trip, bpm, tripTaps, 6).pass).toBe(true);
  });
  it('keys round-trip with meter and swing', () => {
    for (const lv of LEVELS) {
      const r = rhythmAt(lv, 2, 9);
      const back = rhythmFromKey(rhythmKey(r), 2);
      expect(sameRhythm(back, r)).toBe(true);
      expect(back.swing).toBe(r.swing);
    }
  });
  it('distractors never sound identical and keep the meter', () => {
    for (const lv of LEVELS)
      for (let seed = 0; seed < 15; seed++) {
        const r = rhythmAt(lv, 1, seed);
        for (const d of distractors(r, lv, 3, seed)) {
          expect(signature(d)).not.toBe(signature(r));
          expect(totalBeats(d)).toBeCloseTo(totalBeats(r));
          expect(meterOf(d)).toBe(meterOf(r));
        }
      }
  });
  it('spoken names and syllables parse back to the same rhythm (en, he)', () => {
    for (const lv of LEVELS)
      for (let seed = 0; seed < 12; seed++) {
        const r = rhythmAt(lv, 1, seed);
        for (const lang of ['en', 'he'] as const)
          for (const w of ['names', 'syllables'] as const) {
            const said = describeRhythm(r, w, lang);
            const cells = parseRhythmWords(said, meterOf(r));
            expect(cells, `${lv}/${seed} ${lang} ${w}: ${said}`).not.toBeNull();
            expect(sameRhythm({ ...r, cells: cells! }, r), `${lv}/${seed} ${lang} ${w}: "${said}" → ${cells}`).toBe(true);
          }
      }
  });
  it('build palette fits the meter', () => {
    expect(buildPalette(7, '6/8').every((c) => CELLS[c].compound)).toBe(true);
    expect(buildPalette(4, '4/4')).toEqual(expect.arrayContaining(['ssss', 'es', 'se']));
  });
  it('lessons R4–R8: the last dictation is built from blocks', () => {
    for (const lv of LEVELS) {
      const l = makeLesson(`rhythm-r${lv}` as Parameters<typeof makeLesson>[0], 5);
      const q5 = l.questions[4];
      expect(q5.kind === 'rhythm-dict' && q5.mode).toBe('build');
    }
  });
});
