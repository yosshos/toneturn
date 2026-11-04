import { describe, expect, it } from 'vitest';
import { centsOff, degreeInMajor, displayNote, majorCadence, majorScale, midiToHz, pc, pcValue, spokenNote } from '../src/engine/pitch';
import { yin } from '../src/engine/yin';
import { bflatTwoHomes, renderStimulus } from '../src/engine/lesson';

describe('pitch', () => {
  it('spells E♭ major correctly', () => {
    expect(majorScale(pc('Eb')).map((p) => displayNote(p, 'letter'))).toEqual(['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D']);
  });
  it('B♭ is 1 in B♭ and 5 in E♭', () => {
    expect(degreeInMajor(pc('Bb'), pc('Bb'))).toBe(1);
    expect(degreeInMajor(pc('Eb'), pc('Bb'))).toBe(5);
    expect(degreeInMajor(pc('Eb'), pc('B'))).toBe(null);
  });
  it('naming in four combinations', () => {
    const bb = pc('Bb');
    expect(spokenNote(bb, 'letter', 'en')).toBe('B flat');
    expect(spokenNote(bb, 'solfege', 'en')).toBe('Si flat');
    expect(spokenNote(bb, 'letter', 'he')).toBe('בי במול');
    expect(spokenNote(pc('F#'), 'letter', 'he')).toBe('אף דיאז');
    expect(spokenNote(pc('F#'), 'solfege', 'he')).toBe('פה דיאז');
    expect(spokenNote(bb, 'solfege', 'he')).toBe('סי במול');
  });
  it('A4 = 440, cents', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(centsOff(440 * Math.pow(2, 35 / 1200), 440)).toBeCloseTo(35);
    expect(centsOff(440, 440)).toBe(0);
  });
  it('cadence chords contain the right pitch classes and stay in range', () => {
    const [I, IV, V, I2] = majorCadence(pc('Eb'));
    const pcs = (c: number[]) => new Set(c.map((m) => m % 12));
    expect(pcs(I)).toEqual(new Set([3, 7, 10]));
    expect(pcs(IV)).toEqual(new Set([8, 0, 3]));
    expect(pcs(V)).toEqual(new Set([10, 2, 8])); // B♭7 without its fifth
    expect(pcs(I2)).toEqual(new Set([3, 7, 10]));
    for (const c of [I, IV, V, I2]) {
      for (const m of c.slice(1)) {
        expect(m).toBeGreaterThanOrEqual(55);
        expect(m).toBeLessThanOrEqual(72);
      }
    }
    expect(pcValue(pc('Eb'))).toBe(3);
  });
});

describe('lesson', () => {
  it('seeded generation is deterministic and covers both keys', () => {
    const a = bflatTwoHomes(42).questions.map((q) => q.answer);
    const b = bflatTwoHomes(42).questions.map((q) => q.answer);
    expect(a).toEqual(b);
    for (let seed = 0; seed < 50; seed++) {
      const ans = bflatTwoHomes(seed).questions.map((q) => q.answer);
      expect(ans).toHaveLength(3);
      expect(ans).toContain(1);
      expect(ans).toContain(5);
    }
  });
  it('the target is always the same B♭ pitch', () => {
    const l = bflatTwoHomes(7);
    expect(new Set(l.questions.map((q) => q.targetMidi))).toEqual(new Set([70]));
    const { events } = renderStimulus(l.questions[0].stimulus);
    expect(events.at(-1)!.midi).toBe(70);
  });
});

describe('YIN', () => {
  const sine = (hz: number, sr = 48000, n = 2048, amp = 0.3) => {
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) b[i] = amp * Math.sin((2 * Math.PI * hz * i) / sr) + 0.1 * amp * Math.sin((4 * Math.PI * hz * i) / sr);
    return b;
  };
  it.each([110, 196, 233.08, 440, 587.33])('detects %s Hz within 5 cents', (hz) => {
    const r = yin(sine(hz), 48000);
    expect(r.hz).not.toBeNull();
    expect(Math.abs(centsOff(r.hz!, hz))).toBeLessThan(5);
  });
  it('gates silence', () => {
    expect(yin(new Float32Array(2048), 48000).hz).toBeNull();
  });
  it('rejects noise (low confidence)', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const b = new Float32Array(2048).map(() => 0.3 * rnd());
    expect(yin(b, 48000).hz).toBeNull();
  });
});
