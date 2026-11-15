import { describe, expect, it } from 'vitest';
// Owner 2026-11-15: one pass band for every sung note — ±65 ¢ below 1300, ±60 ¢ from 1300 — and the display agrees.
import { gradeMelody, gradeSight, gradeVibratoNotes, melodyMetrics, passCents, synthMelody, LENIENT_BELOW, type VocalItem } from '../src/engine/vocal';
import { songTol } from '../src/engine/voiceGrade';
import { gradeSingAlong } from '../src/engine/singalong';
import { chipLook, zonePasses, zoneState } from '../src/engine/pitchDisplay';
import { zonePass, zoneTolerance } from '../src/engine/vocalLive';

const item = (kind: VocalItem['kind'], difficulty: number, extra: Partial<VocalItem> = {}): VocalItem => ({ id: 'x', kind, level: 1, seconds: 6, reference: 'before', at: 0.5, difficulty, ...extra });
const T = [60, 62, 64, 62, 60];

describe('the pass band', () => {
  it('is 65 ¢ below 1300 and 60 ¢ from 1300', () => {
    expect(LENIENT_BELOW).toBe(1300);
    expect(passCents(1299)).toBe(65);
    expect(passCents(1300)).toBe(60);
    expect(passCents(1900)).toBe(60);
    expect(passCents(undefined)).toBe(65);
  });

  it('melodyMetrics: the default band is 60 ¢; a given band is used', () => {
    expect(melodyMetrics(synthMelody(T, 0.5, { cents: 58 }), T).hit).toBe(1);
    expect(melodyMetrics(synthMelody(T, 0.5, { cents: 62 }), T).hit).toBe(0);
    expect(melodyMetrics(synthMelody(T, 0.5, { cents: 62 }), T, undefined, undefined, passCents(1299)).hit).toBe(1);
    expect(melodyMetrics(synthMelody(T, 0.5, { cents: -62 }), T, undefined, undefined, passCents(1300)).hit).toBe(0);
  });

  const graders: [string, (d: number, cents: number) => number][] = [
    ['gradeMelody', (d, c) => gradeMelody(item('melody', d, { steps: [0, 2, 4, 2, 0] }), synthMelody(T, 0.55, { cents: c }), T).melody!.hit],
    ['gradeSight', (d, c) => gradeSight(item('sight', d, { steps: [0, 2, 4, 2, 0], durs: [1, 1, 1, 1, 1], bpm: 72 }), synthMelody(T, 60 / 72, { cents: c }), T).melody!.hit],
    ['gradeVibratoNotes', (d, c) => gradeVibratoNotes(item('vibrato-notes', d, { steps: [0, 2, 4, 2, 0], vibNotes: [false, false, false, false, false] }), synthMelody(T, 0.6, { cents: c }), T).melody!.hit],
  ];
  for (const [name, hit] of graders) {
    it(`${name}: 62 ¢ passes at 1299, fails at 1300; 58 ¢ passes at both; 67 ¢ fails at both`, () => {
      expect(hit(1299, 62)).toBe(1);
      expect(hit(1299, -62)).toBe(1);
      expect(hit(1300, 62)).toBe(0);
      expect(hit(1300, -62)).toBe(0);
      expect(hit(1299, 58)).toBe(1);
      expect(hit(1300, -58)).toBe(1);
      expect(hit(1299, 67)).toBe(0);
      expect(hit(1300, -67)).toBe(0);
    });
  }

  it('songs: their own rule, else the pass band', () => {
    const song = (d: number, tol?: number) => item('melody', d, { song: { id: 's', band: true, rhythm: true, need: 0.6, ...(tol ? { tol } : {}) } });
    expect(songTol(song(1299))).toBe(65);
    expect(songTol(song(1300))).toBe(60);
    expect(songTol(song(1450, 45))).toBe(45);
  });

  it('sing-along (unrated): the lenient band', () => {
    const notes = T.map((midi, i) => ({ midi, start: 0.3 + i * 0.5, dur: 0.5, degree: 0 }));
    const g = (c: number) => gradeSingAlong(synthMelody(T, 0.5, { cents: c }), notes).notes.filter((n) => n !== null && n >= 0.8).length;
    expect(g(62)).toBe(5);
    expect(g(70)).toBe(0);
  });
});

describe('the display matches the pass band', () => {
  it('zone: the pass band per item; the dead centre stays the level tier', () => {
    expect(zonePass({ kind: 'melody', difficulty: 1299 })).toBe(65);
    expect(zonePass({ kind: 'melody', difficulty: 1300 })).toBe(60);
    expect(zonePass({ kind: 'fine-tune', difficulty: 900 })).toBe(35);
    expect(zoneTolerance({ kind: 'melody', difficulty: 1299 })).toBe(35);
    expect(zoneTolerance({ kind: 'melody', difficulty: 1300 })).toBe(20);
  });

  it('a note inside the pass band is never shown as failing', () => {
    for (const d of [1299, 1300, 1800]) {
      const centre = zoneTolerance({ kind: 'melody', difficulty: d });
      const pass = zonePass({ kind: 'melody', difficulty: d });
      for (let c = -pass; c <= pass; c += 1) {
        expect(zonePasses(zoneState(c, centre, pass)), `${d} ${c}`).toBe(true);
        expect(chipLook(c, centre, pass).tier, `${d} ${c}`).not.toBe('fail');
      }
      expect(chipLook(pass + 1, centre, pass).tier).toBe('fail');
      expect(chipLook(-(pass + 1), centre, pass).tier).toBe('fail');
    }
  });

  it('chip tiers: a tick at dead centre, the number outside it coloured pass / fail', () => {
    expect(chipLook(8, 10, 60)).toEqual({ tier: 'centre', text: null, side: 0 });
    expect(chipLook(null, 10, 60)).toEqual({ tier: 'none', text: null, side: 0 });
    expect(chipLook(15, 10, 60)).toEqual({ tier: 'pass', text: '+15', side: 1 });
    expect(chipLook(-62, 20, 65)).toEqual({ tier: 'pass', text: '−60', side: -1 });
    expect(chipLook(-62, 20, 60)).toEqual({ tier: 'fail', text: '−65', side: -1 });
    // a failing note never reads as a number inside the band (61 would round to 60)
    expect(chipLook(61, 20, 60).text).toBe('+65');
    expect(chipLook(120, 20, 60)).toEqual({ tier: 'fail', text: '+120', side: 1 });
  });

  it('a −48 ¢ note on a 100 % clean take shows a passing chip, not a fail chip', () => {
    for (const d of [1250, 1400]) {
      const it = item('melody', d, { steps: [0, 2, 4, 2, 0] });
      const g = gradeMelody(it, synthMelody(T, 0.55, { cents: -48 }), T);
      expect(g.melody!.hit).toBe(1);
      const lk = chipLook(g.melody!.notes[2].cents, zoneTolerance(it), zonePass(it));
      expect(lk.tier).toBe('pass');
      expect(lk.text).toBe('−50');
    }
  });
});
