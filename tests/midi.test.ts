import { describe, expect, it } from 'vitest';
import { MidiInput, MidiPitchCapture } from '../src/speech/midi';
import { gradeRun } from '../src/engine/runs';
import { evaluateSung } from '../src/engine/sing';
import { answerFromMidi as midiAnswer, degreeQuestion, noteNameQuestion } from '../src/engine/lesson';
import { pc } from '../src/engine/pitch';

describe('MIDI keyboard input', () => {
  it('note on / off (and velocity-0 note on) from raw bytes; the latest held key sounds', () => {
    const m = new MidiInput();
    const seen: string[] = [];
    m.onNote((n, on) => seen.push(`${n}${on ? '+' : '-'}`));
    m.message([0x90, 60, 100], 0);
    m.message([0x91, 64, 90], 1); // channel 2
    expect(m.current()).toBe(64);
    m.message([0x90, 64, 0], 2); // note on with velocity 0 = off
    expect(m.current()).toBe(60);
    m.message([0x80, 60, 0], 3);
    expect(m.current()).toBeNull();
    expect(seen).toEqual(['60+', '64+', '64-', '60-']);
  });

  it('a held key is a perfectly in-tune "sung" note', async () => {
    const m = new MidiInput();
    let now = 0;
    const cap = new MidiPitchCapture(m, () => now);
    const ctl = new AbortController();
    const p = cap.sing({ signal: ctl.signal, hopMs: 5 });
    m.message([0x90, 67, 100], 0);
    for (let i = 0; i < 40; i++) {
      now += 25;
      await new Promise((r) => setTimeout(r, 6));
    }
    m.message([0x80, 67, 0], 0);
    for (let i = 0; i < 10; i++) {
      now += 25;
      await new Promise((r) => setTimeout(r, 6));
    }
    const r = await p;
    expect(r.kind).toBe('frames');
    if (r.kind === 'frames') expect(evaluateSung(r.frames, 67).status).toBe('accurate');
  });

  it('a played run is graded like a sung one', async () => {
    const m = new MidiInput();
    let now = 0;
    const cap = new MidiPitchCapture(m, () => now);
    const p = cap.sing({ signal: new AbortController().signal, endSilenceMs: 300, hopMs: 5 });
    const run = [60, 62, 64, 65, 67];
    for (const n of run) {
      m.message([0x90, n, 90], 0);
      for (let i = 0; i < 8; i++) {
        now += 25;
        await new Promise((r) => setTimeout(r, 6));
      }
      m.message([0x80, n, 0], 0);
      now += 20;
      await new Promise((r) => setTimeout(r, 6));
    }
    for (let i = 0; i < 20; i++) {
      now += 25;
      await new Promise((r) => setTimeout(r, 6));
    }
    const r = await p;
    if (r.kind !== 'frames') throw new Error(r.kind);
    expect(gradeRun(r.frames, run, 5).pass).toBe(true);
  });

  it('a key press answers degree and note-name questions in the key', () => {
    const dq = degreeQuestion('d', pc('Eb'), 5, [1, 3, 5]);
    expect(midiAnswer(dq, 70)).toBe(5); // B♭
    expect(midiAnswer(dq, 65)).toBeNull(); // F = degree 2, not a choice here
    const nq = noteNameQuestion('n', pc('Eb'), 5, true);
    expect(midiAnswer(nq, 58)).toBe('B-1');
    expect(midiAnswer(nq, 59)).toBeNull(); // B natural is not in E♭ major
  });
});
