import { describe, expect, it } from 'vitest';
import { droneMidis, HoldTracker, readDegree } from '../src/engine/drone';
import { pc } from '../src/engine/pitch';

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

describe('drone practice', () => {
  it('reads the degree and cents of a sung pitch in the key, octave-free', () => {
    expect(readDegree(hz(67), pc('C'))).toMatchObject({ degree: 5, cents: 0 });
    expect(readDegree(hz(55.1), pc('C'))).toMatchObject({ degree: 5, cents: 10 });
    expect(readDegree(hz(70), pc('Eb'))).toMatchObject({ degree: 5 }); // B♭ in E♭
    expect(readDegree(hz(61), pc('C')).degree).toBeNull(); // C♯ is chromatic in C
  });
  it('a degree counts once held in tune for 0.8 s; a just-intonation third (−14 ¢) counts too', () => {
    const tr = new HoldTracker(pc('C'));
    const frames = (midi: number, from: number, secs: number) => Array.from({ length: Math.round(secs * 30) }, (_, i) => ({ t: from + i / 30, hz: hz(midi), confidence: 0.95, rms: 0.1 }));
    const found: number[] = [];
    for (const f of [...frames(60, 0, 1), ...frames(64 - 0.14, 1, 1), ...frames(67.4, 2, 1)]) {
      const d = tr.push(f);
      if (d) found.push(d);
    }
    expect(found).toEqual([1, 3]); // 40 ¢ sharp fifth is not in tune
    expect(tr.complete).toBe(false);
  });
  it('drone notes sit low: tonic two octaves down (+ fifth)', () => {
    expect(droneMidis(pc('C'), true)).toEqual([36, 43, 48]);
    expect(droneMidis(pc('Bb'), false)).toEqual([46, 58]);
  });
});
