import { describe, expect, it } from 'vitest';
import { MidiInput } from '../src/speech/midi';
import { startComputerKeys, COMPUTER_KEYS_NAME } from '../src/speech/computerKeys';

// a window-like event target in Node
const target = new EventTarget();
const g = globalThis as unknown as Record<string, unknown>;
g.addEventListener = target.addEventListener.bind(target);
g.removeEventListener = target.removeEventListener.bind(target);
const key = (type: string, k: string) => {
  const e = new Event(type) as Event & { key: string; repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; target: null };
  Object.assign(e, { key: k, repeat: false, ctrlKey: false, metaKey: false, altKey: false });
  target.dispatchEvent(e);
};

describe('computer keyboard as a piano', () => {
  it('plays notes through the MIDI input, shifts octaves, and stops cleanly', () => {
    const m = new MidiInput();
    const got: [number, boolean][] = [];
    m.onNote((n, on) => got.push([n, on]));
    const stop = startComputerKeys(m);
    expect(m.devices).toContain(COMPUTER_KEYS_NAME);
    key('keydown', 'a');
    key('keyup', 'a');
    key('keydown', 'x');
    key('keydown', 'g');
    stop();
    expect(got).toEqual([[60, true], [60, false], [79, true], [79, false]]);
    expect(m.devices).not.toContain(COMPUTER_KEYS_NAME);
  });
});
