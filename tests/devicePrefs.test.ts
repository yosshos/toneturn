// Owner 2026-11-24: "play through the app or the keyboard's own sound" and the timing calibration kept coming back
// wrong between sessions. Device preferences stay on the device (never pushed, never taken from a cloud copy, kept by
// every fresh start), saves never write a stale copy back, and each connected device keeps its own values.
import { beforeEach, describe, expect, it } from 'vitest';
import { portableSettings } from '../src/cloud/cloud';
import { activeMidiDevice, reconcileDevices, settingsDiff } from '../src/storage/deviceProfiles';
import { freshStartIfNeeded, KEEP_SETTINGS, PROGRESS_EPOCH, remoteSettingsForEpoch } from '../src/storage/freshStart';
import { memoryKV } from '../src/storage/kv';
import { DEFAULT_SETTINGS, DEVICE_SETTINGS, emptyProgress, mergeCloudSettings, ProgressStore, type Settings } from '../src/storage/progress';

class MemLS {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
beforeEach(() => {
  (globalThis as unknown as { localStorage: MemLS }).localStorage = new MemLS();
});

const here: Settings = { ...DEFAULT_SETTINGS, uiLang: 'he', midiInput: true, midiSound: false, midiSoundAsked: true, tapLatencyMs: 35, midiLatencyMs: 28, midiBiasMs: -6, micLatencyMs: 110, audioLatency: 'low', midiCurve: 'heavy' };
/** A cloud copy pushed earlier (or by another device): app sound on, no calibration. */
const cloudOld: Partial<Settings> = { ...DEFAULT_SETTINGS, nickname: 'Yos', midiSound: true, midiSoundAsked: true, tapLatencyMs: 0, midiLatencyMs: 0, micLatencyMs: undefined, audioLatency: 'auto', midiCurve: 'normal', voiceConsent: true, progressEpoch: PROGRESS_EPOCH };

describe('device preferences never travel through the cloud', () => {
  it('the pushed settings leave out every device key, the person\'s keys go', () => {
    const out = portableSettings({ ...here, nickname: 'Yos' });
    for (const k of DEVICE_SETTINGS) expect(out).not.toHaveProperty(k);
    expect(out.nickname).toBe('Yos');
    expect(out.uiLang).toBe('he');
  });
  it('a cloud copy (current or from before the fresh start) brings back no device key', () => {
    for (const raw of [cloudOld, { ...cloudOld, progressEpoch: '2026-11-19' }]) {
      const r = remoteSettingsForEpoch(raw);
      expect(r).not.toHaveProperty('midiSound');
      expect(r).not.toHaveProperty('tapLatencyMs');
      expect(r).not.toHaveProperty('midiLatencyMs');
      expect(r).not.toHaveProperty('audioLatency');
      expect(r.nickname).toBe('Yos');
    }
  });
  it('the merge on sign-in keeps this device\'s MIDI sound choice and calibration', () => {
    const next = mergeCloudSettings(here, cloudOld, [], PROGRESS_EPOCH);
    expect(next.midiSound).toBe(false);
    expect(next.tapLatencyMs).toBe(35);
    expect(next.midiLatencyMs).toBe(28);
    expect(next.midiBiasMs).toBe(-6);
    expect(next.micLatencyMs).toBe(110);
    expect(next.audioLatency).toBe('low');
    expect(next.midiCurve).toBe('heavy');
    expect(next.voiceConsent).toBe(false);
    expect(next.nickname).toBe('Yos');
  });
});

describe('a fresh start keeps every device key', () => {
  it('KEEP_SETTINGS holds the whole device list, the language locale and the tuner calibration', () => {
    for (const k of DEVICE_SETTINGS) expect(KEEP_SETTINGS).toContain(k);
    for (const k of ['locale', 'a4', 'midiSoundAsked', 'drillCal', 'perDevice'] as const) expect(KEEP_SETTINGS).toContain(k);
  });
  it('a used device keeps the MIDI sound choice, the question answered, drill calibration and per-device copies', async () => {
    const st = { settings: { ...here, locale: 'es', drillCal: { latencyMs: 12 }, perDevice: { midi: { 'Roland FP-30': { midiSound: false } } }, firstUseAt: '2026-11-01T00:00:00Z', progressEpoch: '2026-11-19' } as unknown as Settings, progress: emptyProgress() };
    const store = { loadSettings: async () => st.settings, saveSettings: async (s: Settings) => void (st.settings = s), loadProgress: async () => st.progress, saveProgress: async () => {} };
    expect(await freshStartIfNeeded(store)).toBe(true);
    expect(st.settings.midiSound).toBe(false);
    expect(st.settings.midiSoundAsked).toBe(true);
    expect(st.settings.tapLatencyMs).toBe(35);
    expect(st.settings.audioLatency).toBe('low');
    expect(st.settings.drillCal).toEqual({ latencyMs: 12 });
    expect(st.settings.locale).toBe('es');
    expect(st.settings.perDevice?.midi?.['Roland FP-30']?.midiSound).toBe(false);
  });
});

describe('saves write only what changed, onto the stored copy', () => {
  it('a change made from a stale or default copy does not revert a newer stored value', async () => {
    const store = new ProgressStore(memoryKV());
    await store.saveSettings({ ...here });
    // the screen still holds the defaults (still loading, or the read failed) and changes the language
    await store.patchSettings({ uiLang: 'en' });
    const s = await store.loadSettings();
    expect(s.uiLang).toBe('en');
    expect(s.midiSound).toBe(false);
    expect(s.tapLatencyMs).toBe(35);
  });
  it('patches in flight never lose each other, and a load waits for them', async () => {
    const store = new ProgressStore(memoryKV());
    await store.saveSettings({ ...DEFAULT_SETTINGS });
    const loaded = (void store.patchSettings({ midiSound: false }), void store.patchSettings({ midiLatencyMs: 40 }), store.loadSettings());
    const s = await loaded;
    expect(s.midiSound).toBe(false);
    expect(s.midiLatencyMs).toBe(40);
  });
  it('settingsDiff lists the changed keys only', () => {
    expect(settingsDiff(here, { ...here, midiSound: true })).toEqual({ midiSound: true });
    expect(settingsDiff(here, here)).toEqual({});
  });
});

describe('each connected device keeps its own values', () => {
  const A = 'Roland FP-30';
  const B = 'Arturia KeyLab';
  it('keyboard A and keyboard B each bring back their own sound choice, latency and touch', () => {
    let s = reconcileDevices({ ...here }, A); // A seeded from the values in use
    expect(s.perDevice?.midi?.[A]?.midiSound).toBe(false);
    expect(s.midiSound).toBe(false);
    // B plugged in: starts from the values in use, but is asked about its own sound
    s = reconcileDevices(s, B);
    expect(s.midiLatencyMs).toBe(28);
    expect(s.midiSoundAsked).toBeUndefined();
    s = reconcileDevices({ ...s, midiSound: true, midiSoundAsked: true, midiLatencyMs: 9, midiCurve: 'light' }, B);
    // back to A
    s = reconcileDevices(s, A);
    expect([s.midiSound, s.midiLatencyMs, s.midiCurve, s.midiSoundAsked]).toEqual([false, 28, 'heavy', true]);
    s = reconcileDevices(s, B);
    expect([s.midiSound, s.midiLatencyMs, s.midiCurve]).toEqual([true, 9, 'light']);
    // unplugged: the values in use stay
    expect(reconcileDevices(s, null).midiSound).toBe(true);
  });
  it('nothing moves when nothing changed (no endless saves)', () => {
    const s = reconcileDevices({ ...here }, A);
    expect(reconcileDevices(s, A)).toBe(s);
  });
  it('each microphone keeps its latency, each output its tap latency and latency mode', () => {
    let s = reconcileDevices({ ...here }, null);
    s = reconcileDevices({ ...s, micDeviceId: 'usb-mic' }, null);
    expect(s.micLatencyMs).toBe(110); // a new mic starts from the value in use
    s = reconcileDevices({ ...s, micLatencyMs: 60 }, null);
    s = reconcileDevices({ ...s, micDeviceId: null }, null);
    expect(s.micLatencyMs).toBe(110);
    s = reconcileDevices({ ...s, micDeviceId: 'usb-mic' }, null);
    expect(s.micLatencyMs).toBe(60);
    s = reconcileDevices({ ...s, audioOutput: 'bt-headphones' }, null);
    s = reconcileDevices({ ...s, tapLatencyMs: 180, audioLatency: 'auto' }, null);
    s = reconcileDevices({ ...s, audioOutput: null }, null);
    expect([s.tapLatencyMs, s.audioLatency]).toEqual([35, 'low']);
  });
  it('the MIDI input in use: the chosen one when connected, else the first', () => {
    expect(activeMidiDevice(B, [A, B])).toBe(B);
    expect(activeMidiDevice(B, [A])).toBe(A);
    expect(activeMidiDevice(null, [])).toBeNull();
  });
});
