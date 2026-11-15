import { describe, expect, it } from 'vitest';
import {
  GOT_HOLD_MS,
  HINT_AFTER_MS,
  hintFor,
  isPulseFrame,
  lastInputAt,
  METER_BARS,
  meterBars,
  meterLevel,
  noteLabel,
  notifyInput,
  onInput,
  resetInputBus,
  SignalDetector,
  WATCHDOG_MS,
  watchdogDue,
} from '../src/engine/inputCheck';
import { MidiInput } from '../src/speech/midi';

const db = (d: number) => 10 ** (d / 20);

describe('input check: level meter mapping', () => {
  it('is empty below the floor and full at the ceiling', () => {
    expect(meterLevel(0)).toBe(0);
    expect(meterLevel(db(-70))).toBe(0);
    expect(meterLevel(db(-12))).toBe(1);
    expect(meterLevel(1)).toBe(1);
    expect(meterBars(0)).toBe(0);
    expect(meterBars(db(-70))).toBe(0);
    expect(meterBars(db(-12))).toBe(METER_BARS);
  });
  it('is linear in dB and monotonic', () => {
    expect(meterLevel(db(-36))).toBeCloseTo(0.5, 5);
    let prev = -1;
    for (let d = -80; d <= 0; d += 2) {
      const b = meterBars(db(d));
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
  it('lights at least one bar for any audible sound', () => {
    expect(meterBars(db(-59))).toBe(1);
  });
});

describe('input check: "got it" detection threshold', () => {
  const frames = (n: number, f: { hz: number | null; confidence: number; rms: number }, hop = 40, t0 = 0) => Array.from({ length: n }, (_, i) => ({ t: t0 + i * hop, ...f }));

  it('needs a confident, loud enough pitch held for the hold time', () => {
    const d = new SignalDetector();
    // one semitone held: not yet at the first frames, got it once GOT_HOLD_MS have passed
    const fs = frames(6, { hz: 440, confidence: 0.95, rms: 0.05 });
    const got = fs.map((f) => (d.feed(f), d.gotIt));
    const firstGot = fs[got.indexOf(true)].t;
    expect(firstGot).toBeGreaterThanOrEqual(GOT_HOLD_MS);
    expect(firstGot).toBeLessThan(GOT_HOLD_MS + 40);
    expect(d.note).toBe(69);
    expect(noteLabel(d.note!)).toBe('A4');
  });
  it('ignores low confidence, very quiet frames and a pitch that keeps moving', () => {
    const low = new SignalDetector();
    frames(20, { hz: 440, confidence: 0.6, rms: 0.05 }).forEach((f) => low.feed(f));
    expect(low.gotIt).toBe(false);
    const quiet = new SignalDetector();
    frames(20, { hz: 440, confidence: 0.95, rms: 0.002 }).forEach((f) => quiet.feed(f));
    expect(quiet.gotIt).toBe(false);
    const wobble = new SignalDetector();
    for (let i = 0; i < 20; i++) wobble.feed({ t: i * 40, hz: i % 2 ? 440 : 494, confidence: 0.95, rms: 0.05 });
    expect(wobble.gotIt).toBe(false);
  });
  it('drums: a hit over the quiet floor counts, steady noise does not', () => {
    const d = new SignalDetector(true);
    frames(10, { hz: null, confidence: 0, rms: 0.004 }).forEach((f) => d.feed(f));
    expect(d.gotIt).toBe(false);
    expect(d.feed({ t: 400, hz: null, confidence: 0, rms: 0.2 })).toBe('hit');
    expect(d.gotIt).toBe(true);
    // a constant loud room: only the very first frame can look like an onset (no floor yet)
    const steady = new SignalDetector(true);
    steady.feed({ t: 0, hz: null, confidence: 0, rms: 0.05 });
    const hits = frames(30, { hz: null, confidence: 0, rms: 0.05 }, 40, 40).filter((f) => steady.feed(f) === 'hit').length;
    expect(hits).toBe(0);
  });
});

describe('input check: hints after a quiet wait', () => {
  it('says nothing before the wait, then device (silence) or volume (some sound)', () => {
    expect(hintFor({ mode: 'mic', gotIt: false, elapsed: HINT_AFTER_MS - 1, peak: 0 })).toBeNull();
    expect(hintFor({ mode: 'mic', gotIt: false, elapsed: HINT_AFTER_MS, peak: 0 })).toBe('device');
    expect(hintFor({ mode: 'mic', gotIt: false, elapsed: HINT_AFTER_MS, peak: 0.01 })).toBe('volume');
    expect(hintFor({ mode: 'mic', gotIt: true, elapsed: 99999, peak: 0 })).toBeNull();
  });
  it('maps a microphone error to permission / device at once', () => {
    expect(hintFor({ mode: 'mic', gotIt: false, elapsed: 0, error: 'permission-denied' })).toBe('permission');
    expect(hintFor({ mode: 'drum-mic', gotIt: false, elapsed: 0, error: 'no-device' })).toBe('device');
  });
  it('MIDI: plug in when no device, check the device after the wait', () => {
    expect(hintFor({ mode: 'midi', gotIt: false, elapsed: 1000, devices: 0 })).toBe('plug');
    expect(hintFor({ mode: 'midi', gotIt: false, elapsed: 1000, devices: 1 })).toBeNull();
    expect(hintFor({ mode: 'drum-midi', gotIt: false, elapsed: HINT_AFTER_MS, devices: 1 })).toBe('midi-device');
    expect(hintFor({ mode: 'midi', gotIt: false, elapsed: 0, midiSupported: false })).toBe('unsupported');
  });
});

describe('input check: the in-take watchdog', () => {
  it('waits for the first expected note, then WATCHDOG_MS of nothing', () => {
    const start = 1000;
    const due = 3000;
    expect(watchdogDue(2500, null, -Infinity, start)).toBe(false); // count-in: not armed yet
    expect(watchdogDue(due + WATCHDOG_MS - 1, due, -Infinity, start)).toBe(false);
    expect(watchdogDue(due + WATCHDOG_MS, due, -Infinity, start)).toBe(true);
  });
  it('stays quiet once any input arrived during the take, but not for input from before it', () => {
    expect(watchdogDue(9000, 3000, 3500, 1000)).toBe(false);
    expect(watchdogDue(9000, 3000, 1500, 1000)).toBe(false); // during the count-in still counts
    expect(watchdogDue(9000, 3000, 500, 1000)).toBe(true); // the check strip's sound before the take does not
  });
  it('the bus: MIDI note-ons and clear mic frames pulse it', () => {
    resetInputBus();
    const seen: string[] = [];
    const off = onInput((_at, src) => seen.push(src));
    const m = new MidiInput();
    m.message([0x90, 60, 100], 1234);
    m.message([0x80, 60, 0], 1300); // note-off: no pulse
    expect(seen).toEqual(['midi']);
    expect(lastInputAt()).toBe(1234);
    notifyInput('mic', 2000);
    expect(seen).toEqual(['midi', 'mic']);
    off();
    expect(isPulseFrame({ hz: 220, confidence: 0.95, rms: 0.02 })).toBe(true);
    expect(isPulseFrame({ hz: null, confidence: 0, rms: 0.003 })).toBe(false);
    expect(isPulseFrame({ hz: null, confidence: 0, rms: 0.05 })).toBe(true);
  });
});
