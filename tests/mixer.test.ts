import { describe, expect, it } from 'vitest';
import { DEFAULT_MIXER, REVERB_SEND, effectiveVol, mixerOf } from '../src/audio/mixer';

describe('mixer (owner 2026-11-08)', () => {
  it('the default mix keeps the old reverb levels', () => {
    const m = mixerOf(null);
    expect(REVERB_SEND * m.channels.piano.reverb).toBeCloseTo(0.15); // the old piano / bass room
    expect(REVERB_SEND * m.channels.drums.reverb * 0.73).toBeCloseTo(0.3 * 0.22, 2); // the old drum hall send
    expect(REVERB_SEND * m.channels.cues.reverb * 0.73).toBeCloseTo(0.22, 2); // the old cue hall
    for (const id of ['piano', 'bass', 'drums', 'cues'] as const) expect(effectiveVol(m, id)).toBe(1);
  });
  it('mute and solo', () => {
    const m = mixerOf({ channels: { ...DEFAULT_MIXER.channels, bass: { ...DEFAULT_MIXER.channels.bass, solo: true }, drums: { ...DEFAULT_MIXER.channels.drums, mute: true } } });
    expect(effectiveVol(m, 'bass')).toBe(1);
    expect(effectiveVol(m, 'piano')).toBe(0);
    expect(effectiveVol(m, 'drums')).toBe(0);
  });
  it('stored settings merge over the defaults', () => {
    const m = mixerOf({ channels: { piano: { vol: 0.5 } } } as never);
    expect(m.channels.piano.vol).toBe(0.5);
    expect(m.channels.piano.reverb).toBe(0.5);
    expect(m.channels.bass.vol).toBe(1);
    expect(m.delayMs).toBe(375);
  });
});
