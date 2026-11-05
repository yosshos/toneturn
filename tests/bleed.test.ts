import { describe, expect, it } from 'vitest';
import { BleedGate } from '../src/engine/bleed';
import { midiToHz } from '../src/engine/pitch';
import { HoldTracker, droneMidis } from '../src/engine/drone';
import { pc } from '../src/engine/pitch';

const fr = (t: number, midi: number | null, rms: number) => ({ t, hz: midi === null ? null : midiToHz(midi), confidence: midi === null ? 0 : 0.95, rms });

describe('bleed gate', () => {
  const drone = droneMidis(pc('C'), true); // C2, G2, C3
  it('learns the leak and drops the drone, keeps the voice', () => {
    const g = new BleedGate(drone);
    for (let i = 0; i < 30; i++) g.calibrate(fr(i / 50, 36, 0.02 + (i % 3) * 0.002));
    g.finishCalibration();
    expect(g.isBleed(fr(1, 36, 0.022))).toBe(true); // the drone itself
    expect(g.isBleed(fr(1, 43, 0.021))).toBe(true); // its fifth
    expect(g.isBleed(fr(1, 64, 0.09))).toBe(false); // a sung E4
    expect(g.isBleed(fr(1, 48, 0.12))).toBe(false); // the singer on the drone's own C3, clearly louder
    expect(g.isBleed(fr(1, 52, 0.02))).toBe(true); // no louder than the room: not a voice
  });
  it('without the gate the drone alone would "sing" degree 1; with it, nothing is found', () => {
    const raw = new HoldTracker(pc('C'));
    const gated = new HoldTracker(pc('C'));
    const g = new BleedGate(drone);
    for (let i = 0; i < 30; i++) g.calibrate(fr(i / 50, 36, 0.02));
    g.finishCalibration();
    for (let i = 0; i < 100; i++) {
      const f = fr(0.6 + i / 30, 36, 0.02);
      raw.push(f);
      gated.push(g.pass(f));
    }
    expect(raw.found.has(1)).toBe(true);
    expect(gated.found.size).toBe(0);
  });
});
