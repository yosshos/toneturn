// SPEC-INPUT-SOURCE (owner-approved 2026-11-28): which input a take listens to, the expected-MIDI guard, the mid-take
// loss, the migration of the old MIDI on/off, the not-comparable record, and no permission prompt without a tap.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decideInput, enableMidiIfGranted, inputStatusText, midiPrefOf, watchMidiLoss, type InputState } from '../src/speech/inputSource';
import { MidiInput } from '../src/speech/midi';
import { COMPUTER_KEYS_NAME } from '../src/speech/computerKeys';
import { migrateMidiExpectation, reconcileDevices, UNNAMED_MIDI } from '../src/storage/deviceProfiles';
import { DEFAULT_SETTINGS, DEVICE_SETTINGS, migrateSettings, type Settings } from '../src/storage/progress';
import { withSource } from '../src/ui/DrillTake';
import { unsent } from '../src/cloud/calibUpload';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { eligible, type TakeTrace } from '../src/engine/drills/tendency';
import type { TakeMetrics } from '../src/engine/drills/types';

const base: InputState = { supported: true, devices: [], pref: 'auto', expected: [], sessionMic: false, guitarPref: 'midi', chosen: null };
const st = (o: Partial<InputState>): InputState => ({ ...base, ...o });

describe('inputSource: the truth table (§3.7)', () => {
  it('auto: a connected keyboard is used, else the mic', () => {
    expect(decideInput(st({ devices: ['FP-30'] }), 'keys')).toMatchObject({ src: 'midi', device: 'FP-30', reason: 'connected', blocked: false, notComparable: false });
    expect(decideInput(st({}), 'keys')).toMatchObject({ src: 'mic', device: null, reason: 'no-keyboard', blocked: false, notComparable: false });
    expect(decideInput(st({ supported: false }), 'keys')).toMatchObject({ src: 'mic', reason: 'unsupported' });
  });
  it('the chosen input when it is connected, else the first one', () => {
    expect(decideInput(st({ devices: ['A', 'B'], chosen: 'B' }), 'keys').device).toBe('B');
    expect(decideInput(st({ devices: ['A'], chosen: 'B' }), 'keys').device).toBe('A');
  });
  it('mic only: the mic even with a keyboard connected, and never a guard', () => {
    expect(decideInput(st({ pref: 'mic', devices: ['FP-30'], expected: ['FP-30'] }), 'keys')).toMatchObject({ src: 'mic', reason: 'pref-mic', blocked: false, notComparable: false });
  });
  it('MIDI only: expects a keyboard even on a device that never had one', () => {
    expect(decideInput(st({ pref: 'midi' }), 'keys')).toMatchObject({ src: 'mic', expectMidi: true, blocked: true });
    expect(decideInput(st({ pref: 'midi', devices: ['X'] }), 'keys')).toMatchObject({ src: 'midi', blocked: false });
  });
  it('guitar / bass follow their own choice; sung items the mic; drums the kit rules', () => {
    expect(decideInput(st({ devices: ['G'], guitarPref: 'mic', expected: ['G'] }), 'guitar')).toMatchObject({ src: 'mic', reason: 'guitar-mic', blocked: false });
    expect(decideInput(st({ devices: ['G'] }), 'guitar')).toMatchObject({ src: 'midi' });
    expect(decideInput(st({ devices: ['FP-30'], expected: ['FP-30'] }), 'sung')).toMatchObject({ src: 'mic', reason: 'sung', blocked: false });
    expect(decideInput(st({ devices: ['TD-17'] }), 'drums', { kitMic: true })).toMatchObject({ src: 'mic', reason: 'kit-mic' });
    expect(decideInput(st({ devices: ['TD-17'] }), 'drums')).toMatchObject({ src: 'midi' });
  });
  it('the computer keyboard plays like a keyboard but never makes the device expect one', () => {
    expect(decideInput(st({ devices: [COMPUTER_KEYS_NAME] }), 'keys').src).toBe('midi');
    expect(decideInput(st({ expected: [COMPUTER_KEYS_NAME] }), 'keys').blocked).toBe(false);
  });
});

describe('R3: the expected-MIDI guard', () => {
  it('a device that has had a keyboard, none detected: the keys take does not start', () => {
    const d = decideInput(st({ expected: ['FP-30'] }), 'keys');
    expect(d).toMatchObject({ src: 'mic', expectMidi: true, blocked: true, notComparable: true });
  });
  it('"use the microphone this session" lets it start — and the take is not comparable (R5)', () => {
    const d = decideInput(st({ expected: ['FP-30'], sessionMic: true }), 'keys');
    expect(d).toMatchObject({ src: 'mic', blocked: false, notComparable: true });
  });
  it('a keyboard that reappears takes over at once, even after the mic was chosen', () => {
    expect(decideInput(st({ expected: ['FP-30'], sessionMic: true, devices: ['FP-30'] }), 'keys')).toMatchObject({ src: 'midi', blocked: false, notComparable: false });
  });
  it('another keyboard than the one expected is a keyboard: no guard', () => {
    expect(decideInput(st({ expected: ['FP-30'], devices: ['Keystation'] }), 'keys')).toMatchObject({ src: 'midi', blocked: false });
  });
  it('the expectation is kept per MIDI input name in the device profile (never the computer keyboard)', () => {
    let s = reconcileDevices({ ...DEFAULT_SETTINGS }, 'FP-30');
    s = reconcileDevices(s, 'Keystation 49');
    s = reconcileDevices(s, 'FP-30');
    expect(s.perDevice?.midiExpected).toEqual(['FP-30', 'Keystation 49']);
    expect(reconcileDevices({ ...DEFAULT_SETTINGS }, COMPUTER_KEYS_NAME).perDevice?.midiExpected).toBeUndefined();
    // device-only: never synced
    expect(DEVICE_SETTINGS).toContain('perDevice');
    expect(DEVICE_SETTINGS).toContain('midiPref');
  });
});

describe('R4: a keyboard lost mid-take', () => {
  const g = globalThis as unknown as { navigator?: unknown };
  let saved: unknown;
  beforeEach(() => {
    saved = g.navigator;
  });
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: saved, configurable: true, writable: true });
  });
  it('the input in use disconnecting ends the take once; another device going away does not', async () => {
    const inputs = new Map<string, { name: string; onmidimessage: unknown }>([
      ['1', { name: 'FP-30', onmidimessage: null }],
      ['2', { name: 'Pads', onmidimessage: null }],
    ]);
    const access = { inputs, onstatechange: null as null | (() => void) };
    Object.defineProperty(globalThis, 'navigator', { value: { requestMIDIAccess: async () => access }, configurable: true, writable: true });
    const m = new MidiInput();
    await m.enable();
    const lost = vi.fn();
    const off = watchMidiLoss(m, 'FP-30', lost);
    inputs.delete('2');
    access.onstatechange!();
    expect(lost).not.toHaveBeenCalled();
    inputs.delete('1');
    access.onstatechange!();
    access.onstatechange!();
    expect(lost).toHaveBeenCalledTimes(1);
    off();
  });
});

describe('§3.1 migration of the old MIDI on/off', () => {
  it('true → auto, false → mic only, never set → auto', () => {
    expect(midiPrefOf({ midiInput: true })).toBe('auto');
    expect(midiPrefOf({ midiInput: false })).toBe('mic');
    expect(midiPrefOf({})).toBe('auto');
    expect(migrateSettings({ ...DEFAULT_SETTINGS, midiInput: false }).midiPref).toBe('mic');
    expect(migrateSettings({ ...DEFAULT_SETTINGS, midiInput: true }).midiPref).toBe('auto');
    expect(migrateSettings({ ...DEFAULT_SETTINGS }).midiPref).toBe('auto');
    expect(migrateSettings({ ...DEFAULT_SETTINGS, midiInput: false, midiPref: 'midi' }).midiPref).toBe('midi');
  });
  it('the global "keyboard seen" flag becomes the per-name expectation once', () => {
    const withBook = { perDevice: { midi: { 'FP-30': {}, [COMPUTER_KEYS_NAME]: {} } } } as Pick<Settings, 'perDevice'>;
    expect(migrateMidiExpectation(withBook, false)).toEqual({ midiPref: 'auto', perDevice: { ...withBook.perDevice, midiExpected: ['FP-30'] } });
    expect(migrateMidiExpectation({}, true)?.perDevice?.midiExpected).toEqual([UNNAMED_MIDI]);
    expect(migrateMidiExpectation({ midiInput: false }, false)).toEqual({ midiPref: 'mic', perDevice: { midiExpected: [] } });
    // done once: nothing moves the second time
    expect(migrateMidiExpectation({ midiPref: 'auto', perDevice: { midiExpected: [] } }, true)).toBeNull();
  });
});

describe('R2: the live status line', () => {
  it('names the device, or why it is the microphone', () => {
    expect(inputStatusText({ src: 'midi', device: 'FP-30', reason: 'connected' }, 'en')).toBe('MIDI: FP-30');
    expect(inputStatusText({ src: 'mic', device: null, reason: 'no-keyboard' }, 'en')).toBe('Microphone (no keyboard connected)');
    expect(inputStatusText({ src: 'mic', device: null, reason: 'unsupported' }, 'en')).toBe('Microphone (this browser has no MIDI)');
    expect(inputStatusText({ src: 'mic', device: null, reason: 'no-keyboard' }, 'he')).toBe('מיקרופון (אין מקלדת מחוברת)');
  });
});

describe('R1: never a permission prompt without a tap', () => {
  const perms = (state: string) => {
    const status = { state, onchange: null as null | (() => void) };
    return { status, perms: { query: vi.fn(async () => status) } };
  };
  it('granted: enabled at start-up', async () => {
    const enable = vi.fn(async () => []);
    const p = perms('granted');
    await enableMidiIfGranted({ supported: true, enable }, p.perms);
    expect(p.perms.query).toHaveBeenCalledWith({ name: 'midi' });
    expect(enable).toHaveBeenCalledTimes(1);
  });
  it('prompt / denied: nothing is asked; a grant that appears later enables it', async () => {
    const enable = vi.fn(async () => []);
    const p = perms('prompt');
    const stop = await enableMidiIfGranted({ supported: true, enable }, p.perms);
    expect(enable).not.toHaveBeenCalled();
    p.status.state = 'granted';
    p.status.onchange!();
    expect(enable).toHaveBeenCalledTimes(1);
    stop();
    expect(p.status.onchange).toBeNull();
    const d = perms('denied');
    await enableMidiIfGranted({ supported: true, enable }, d.perms);
    expect(enable).toHaveBeenCalledTimes(1);
  });
  it('no Permissions API or no Web MIDI: nothing happens', async () => {
    const enable = vi.fn(async () => []);
    await enableMidiIfGranted({ supported: true, enable }, undefined);
    await enableMidiIfGranted({ supported: false, enable }, perms('granted').perms);
    expect(enable).not.toHaveBeenCalled();
  });
});

describe('R5 / R6: the source on the record; a not-comparable take', () => {
  const m0 = { bpm: 80, accuracy: 0.9, verdict: 'clean', why: { en: 'ok', he: 'ok' } } as unknown as TakeMetrics;
  it('every take carries its source; a mic take where MIDI is expected is flagged', () => {
    expect(withSource(m0, 'midi', false)).toMatchObject({ src: 'midi', verdict: 'clean' });
    expect(withSource(m0, 'midi', false).nc).toBeUndefined();
    expect(withSource(m0, 'mic', true)).toMatchObject({ src: 'mic', nc: true, verdict: 'clean' });
  });
  it('R6: under 40 % of the notes by mic where MIDI is expected: a failed take that says "listened by microphone"', () => {
    const r = withSource({ ...m0, accuracy: 0.28 }, 'mic', true);
    expect(r.verdict).toBe('not');
    expect(r.why.en).toMatch(/^Listened by microphone/);
    // the same take without the expectation keeps its own grade
    expect(withSource({ ...m0, accuracy: 0.28 }, 'mic', false).verdict).toBe('clean');
  });
  it('never a counting take on the ladder', () => {
    const s0 = newItem({ itemId: 'scales:scale:2:RL:o2', spec: { family: 'scales', key: 2, hands: 'RL' }, startBpm: 80 } as never);
    const clean = { ...m0, timingMean: 0, timingSD: 10, cvR: 0.02, cvL: null, handsAbs: null, perNote: [] } as unknown as TakeMetrics;
    expect(applyTake(s0, clean, 80, '2026-11-28T10:00:00Z').state.passLog?.length).toBe(1);
    expect(applyTake(s0, { ...clean, nc: true }, 80, '2026-11-28T10:00:00Z').state.passLog?.length ?? 0).toBe(0);
  });
  it('never pooled for tendencies, never uploaded for calibration', () => {
    const t = { v: 1, id: 'scales:scale:2:RL:o2', fam: 'scales', at: '2026-11-28T07:00:00Z', bpm: 80, ioi: 375, src: 'mic', kind: 'normal', verdict: 'clean', lead: 0, drift: null } as TakeTrace;
    const ok = { ...t, src: 'midi' as const, at: '2026-11-28T07:01:00Z' };
    expect(eligible({ ...t, src: 'midi', nc: true })).toBe(false);
    expect(eligible(ok)).toBe(true);
    expect(unsent([{ ...t, nc: true }, ok], '').map((x) => x.at)).toEqual([ok.at]);
  });
});
