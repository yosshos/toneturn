import { describe, expect, it } from 'vitest';
import { autoTier, fadeGain, grandLayerSet, grandLoadOrder, iosVersion, isIOS, latencyHintOf, liveStart, MemoryLedger, qualityOf, tailCut, TIERS, tierOf, wirelessName } from '../src/audio/quality';
import { loadOrder } from '../src/audio/grand';
import { MidiInput } from '../src/speech/midi';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const OLD_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

describe('sound quality tiers (0.69, SOUND_LIVE_SESSION Phase 0)', () => {
  it('detects iOS without deviceMemory / saveData (Safari exposes neither)', () => {
    expect(isIOS({ ua: IPHONE })).toBe(true);
    expect(isIOS({ ua: IPAD_DESKTOP, maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ ua: IPAD_DESKTOP, maxTouchPoints: 0 })).toBe(false); // a Mac
    expect(iosVersion({ ua: IPHONE })).toBe(17);
  });
  it('Automatic: Standard on every iPhone/iPad, Lite on old iOS and low-memory or Data Saver, Studio on computers', () => {
    expect(autoTier({ ua: IPHONE })).toBe('standard');
    expect(autoTier({ ua: IPAD_DESKTOP, maxTouchPoints: 5 })).toBe('standard');
    expect(autoTier({ ua: OLD_IPHONE })).toBe('lite');
    expect(autoTier({ ua: ANDROID, deviceMemory: 8 })).toBe('standard');
    expect(autoTier({ ua: ANDROID, deviceMemory: 2 })).toBe('lite');
    expect(autoTier({ ua: ANDROID, saveData: true, deviceMemory: 8 })).toBe('lite');
    expect(autoTier({ ua: WIN, deviceMemory: 8 })).toBe('studio');
    expect(autoTier({ ua: IPAD_DESKTOP, maxTouchPoints: 0 })).toBe('studio'); // Mac Safari: no deviceMemory
    expect(autoTier({ ua: WIN, deviceMemory: 4 })).toBe('standard');
  });
  it('a chosen tier wins; the 0.54 grand detail maps onto the new setting', () => {
    expect(tierOf('lite', { ua: WIN, deviceMemory: 8 })).toBe('lite');
    expect(qualityOf({ pianoDetail: 'full' })).toBe('studio');
    expect(qualityOf({ pianoDetail: 'light' })).toBe('standard');
    expect(qualityOf({ pianoDetail: 'full', soundQuality: 'lite' })).toBe('lite');
    expect(qualityOf({})).toBe('auto');
  });
  it('Studio keeps the grand exactly as before: all 16 layers in the old order, full tails, the playing rate', () => {
    expect(grandLayerSet(16, 'studio')).toEqual(Array.from({ length: 16 }, (_, i) => i));
    expect(grandLoadOrder(16, 'studio')).toEqual(loadOrder(16, false));
    expect(TIERS.studio.grandTail).toBe(Infinity);
    expect(TIERS.studio.rate).toBeNull();
    expect(TIERS.studio.monoGrand || TIERS.studio.monoBand || TIERS.studio.monoRelease).toBe(false);
  });
  it('Lite and Standard keep fewer layers, spread over the range, the everyday one first', () => {
    expect(grandLayerSet(16, 'lite')).toHaveLength(4);
    expect(grandLayerSet(16, 'standard')).toHaveLength(5);
    expect(grandLoadOrder(16, 'standard')[0]).toBe(11); // velocity 0.75 = 95 → layer v12 (89)
    expect(grandLoadOrder(16, 'lite')[0]).toBe(10);
    expect(TIERS.lite.budgetMB).toBe(150);
    expect(TIERS.standard.budgetMB).toBe(300);
  });
  it('tail cap: frames to keep and an equal-power fade', () => {
    expect(tailCut(48000 * 10, 48000, Infinity)).toEqual({ keep: 480000, fade: 0 });
    expect(tailCut(32000 * 3, 32000, 4)).toEqual({ keep: 96000, fade: 0 });
    expect(tailCut(32000 * 10, 32000, 4)).toEqual({ keep: 128000, fade: 19200 });
    expect(fadeGain(0, 100)).toBeCloseTo(1);
    expect(fadeGain(100, 100)).toBeCloseTo(0);
    expect(fadeGain(50, 100)).toBeCloseTo(Math.SQRT1_2);
  });
  it('the memory ledger: totals, idle sets oldest first, and what to let go to fit a budget (never pinned ones)', () => {
    const l = new MemoryLedger();
    l.add('a', 100, 0);
    l.add('b', 50, 10);
    l.add('c', 30, 20);
    expect(l.total).toBe(180);
    l.touch('a', 100);
    expect(l.idle(120, 100, () => false)).toEqual(['b', 'c']);
    expect(l.idle(120, 100, (id) => id === 'b')).toEqual(['c']);
    expect(l.toFit(0, 200, () => false)).toEqual([]);
    expect(l.toFit(40, 200, () => false)).toEqual(['b']);
    expect(l.toFit(40, 200, (id) => id === 'b')).toEqual(['c']);
    l.remove('a');
    expect(l.total).toBe(80);
    expect(l.peak).toBe(180);
  });
});

describe('live play (0.69, Phase 1)', () => {
  it('a live note starts a constant lead after its MIDI timestamp, never in the past', () => {
    expect(liveStart(10, 0, 0.004)).toBeCloseTo(10.004);
    expect(liveStart(10, 0.003, 0.004)).toBeCloseTo(10.001);
    expect(liveStart(10, 0.012, 0.004)).toBeCloseTo(10); // late: at once
    expect(liveStart(10, null, 0.004)).toBeCloseTo(10.003);
    expect(liveStart(10, 5, 0.004)).toBeCloseTo(10.003); // a stale / foreign clock: as before
    expect(liveStart(10, -1, 0.004)).toBeCloseTo(10.003);
  });
  it('the latency setting maps to the AudioContext hint', () => {
    expect(latencyHintOf('low')).toBe(0);
    expect(latencyHintOf('auto')).toBe('interactive');
    expect(latencyHintOf(undefined)).toBe('interactive');
  });
  it('Bluetooth output names are recognised', () => {
    expect(wirelessName('Default - AirPods Pro (Bluetooth)')).toBe(true);
    expect(wirelessName('Headphones (WH-1000XM4 Stereo)')).toBe(true);
    expect(wirelessName('Speakers (Realtek(R) Audio)')).toBe(false);
    expect(wirelessName('Focusrite USB Audio')).toBe(false);
  });
  it('the sound listener runs before every other MIDI listener', () => {
    const m = new MidiInput();
    const order: string[] = [];
    m.onNote(() => order.push('screen'));
    const off = m.onNote(() => order.push('sound'), { first: true });
    m.message([0x90, 60, 100], 0);
    expect(order).toEqual(['sound', 'screen']);
    off();
    m.message([0x90, 62, 100], 1);
    expect(order).toEqual(['sound', 'screen', 'screen']);
  });
});
