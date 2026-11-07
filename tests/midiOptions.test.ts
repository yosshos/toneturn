import { describe, expect, it } from 'vitest';
import { MidiInput } from '../src/speech/midi';

describe('MIDI options (Settings audit 0.41)', () => {
  it('octave shift moves notes, not controllers', () => {
    const m = new MidiInput();
    m.setOptions({ octave: 1 });
    const notes: number[] = [];
    const ccs: number[] = [];
    m.onNote((n, on) => on && notes.push(n));
    m.onCC((cc) => ccs.push(cc));
    m.message([0x90, 60, 100], 0);
    m.message([0xb0, 64, 127], 1);
    expect(notes).toEqual([72]);
    expect(ccs).toEqual([64]);
  });
  it('clamps shifted notes to 0..127', () => {
    const m = new MidiInput();
    m.setOptions({ octave: -2 });
    const notes: number[] = [];
    m.onNote((n, on) => on && notes.push(n));
    m.message([0x90, 10, 100], 0);
    expect(notes).toEqual([0]);
  });
  it('an inverted sustain pedal reports down when the pedal sends 0', () => {
    const m = new MidiInput();
    m.setOptions({ pedalInvert: true });
    const vals: number[] = [];
    m.onCC((cc, v) => cc === 64 && vals.push(v));
    m.message([0xb0, 64, 0], 0);
    m.message([0xb0, 64, 127], 1);
    expect(vals).toEqual([127, 0]);
  });
});
