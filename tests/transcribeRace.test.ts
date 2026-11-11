import { describe, expect, it } from 'vitest';
import { isTranscribeSave, KEY_HI, KEY_LO, newTranscribe, noteAccuracy, phraseAt, phrasePoints, phraseStim, PHRASES, runAccuracy, runDone, submitPhrase, tierLevel, timeBonus, transcribeResult } from '../src/engine/transcribeRace';
import { clearsRun, tierDef, tierInfo } from '../src/engine/gameTiers';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const pc = (m: number, key: number) => (((m - key) % 12) + 12) % 12;

describe('Transcription Race', () => {
  it('phrases fit the keys, have the asked length and are seeded', () => {
    for (let lv = 1; lv <= 4; lv++)
      for (let i = 0; i < 60; i++) {
        const n = 4 + lv;
        const p = phraseAt(77 + lv, i, lv, n);
        expect(p.midis.length).toBe(n);
        expect(p.beats.length).toBe(n);
        for (const m of p.midis) {
          expect(m).toBeGreaterThanOrEqual(KEY_LO);
          expect(m).toBeLessThanOrEqual(KEY_HI);
        }
      }
    expect(phraseAt(1, 2, 3, 7)).toEqual(phraseAt(1, 2, 3, 7));
  });
  it('mp is diatonic major; mf is minor with exactly one chromatic note; f swings; ff has a ii–V–I', () => {
    for (let i = 0; i < 40; i++) {
      const a = phraseAt(5, i, 1, 5);
      expect(a.midis.every((m) => MAJOR.includes(pc(m, a.key)))).toBe(true);
      const b = phraseAt(5, i, 2, 6);
      expect(b.minor).toBe(true);
      expect(b.midis.filter((m) => !MINOR.includes(pc(m, b.key))).length).toBe(1);
      const c = phraseAt(5, i, 3, 7);
      expect(c.swing).toBe(true);
      const d = phraseAt(5, i, 4, 8);
      expect(d.chords?.map((x) => x[1])).toEqual(['m7', 'dom7', 'maj7']);
    }
  });
  it('ff lines put an altered tension over the V', () => {
    let alt = 0;
    for (let i = 0; i < 40; i++) {
      const d = phraseAt(9, i, 4, 8);
      if (d.midis.some((m) => [8, 10, 3].includes(pc(m, d.key)))) alt++;
    }
    expect(alt).toBeGreaterThan(30);
  });
  it('the phrase sounds (with chords at ff)', () => {
    const s = phraseStim(phraseAt(3, 0, 4, 8), 140);
    expect(s.kind).toBe('events');
    if (s.kind === 'events') expect(s.events.length).toBeGreaterThan(10);
  });
  it('scores note by note, in order, octave included; time bonus up to 0.5', () => {
    expect(noteAccuracy([60, 62, 64, 65], [60, 62, 64, 65])).toBe(1);
    expect(noteAccuracy([60, 62, 64, 65], [60, 62, 65, 64])).toBe(0.5);
    expect(noteAccuracy([60, 62, 64, 65], [72, 62, 64, 65])).toBe(0.75);
    expect(noteAccuracy([60, 62], [60, 62, 64, 65])).toBe(0.5);
    expect(timeBonus(4000, 4, 0)).toBe(0.5);
    expect(timeBonus(40000, 4, 0)).toBe(0);
    expect(timeBonus(4000, 4, 3)).toBeCloseTo(0.3);
    expect(phrasePoints(1, 0.5)).toBe(150);
    expect(phrasePoints(0, 0.5)).toBe(0);
  });
  it('a run: five phrases, saved after each, accuracy over the run', () => {
    let s = newTranscribe(11, 'mf', 6, 100);
    expect(s.level).toBe(2);
    for (let k = 0; k < PHRASES; k++) {
      expect(isTranscribeSave(s)).toBe(true);
      const p = phraseAt(s.seed, k, s.level, s.notes);
      s = submitPhrase(s, k % 2 ? p.midis : p.midis.map((m) => m + 1), 5000, 0).save;
    }
    expect(runDone(s)).toBe(true);
    expect(isTranscribeSave(s)).toBe(false);
    expect(runAccuracy(s)).toBe(40);
    const r = transcribeResult(s);
    expect(r.detail).toEqual({ tier: 'mf', accuracy: 40, phrases: 5 });
    expect(clearsRun('transcribe', 'mf', r.score, r.detail)).toBe(false);
    expect(clearsRun('transcribe', 'mf', 500, { accuracy: 90 })).toBe(true);
  });
  it('tiers open at mp and set notes / tempo', () => {
    expect(tierInfo('transcribe', {}, undefined, 'ear').open).toBe('mp');
    expect(tierLevel('f')).toBe(3);
    expect(Number(tierDef('transcribe', 'ff')?.params?.notes)).toBeGreaterThan(Number(tierDef('transcribe', 'mp')?.params?.notes));
  });
});
