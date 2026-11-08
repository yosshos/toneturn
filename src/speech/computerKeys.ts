// The computer keyboard as a piano (SPEC-DESKTOP §5, 0.53): opt-in in Settings → MIDI. The home row plays an octave
// like a DAW's "musical typing" — A W S E D F T G Y H U J K = C … C, Z / X shift the octave — and the notes go through
// the same MIDI input as a real keyboard, so every exercise that takes MIDI takes these keys (and the app sounds them).
import type { MidiInput } from './midi';

const MAP: Record<string, number> = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14 };
export const COMPUTER_KEYS_NAME = 'Computer keyboard';

/** Start musical typing; returns a stop function. `base` is the MIDI note of A (C4 = 60 by default). */
export function startComputerKeys(midi: MidiInput, base = 60): () => void {
  let octave = 0;
  const down = new Map<string, number>();
  if (!midi.devices.includes(COMPUTER_KEYS_NAME)) midi.devices = [...midi.devices, COMPUTER_KEYS_NAME];
  const typing = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };
  const onDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'x') {
      octave = Math.max(-3, Math.min(3, octave + (k === 'z' ? -1 : 1)));
      e.preventDefault();
      return;
    }
    if (!(k in MAP)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat || down.has(k)) return;
    const note = base + 12 * octave + MAP[k];
    down.set(k, note);
    midi.message([0x90, note, 96], performance.now());
  };
  const onUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const note = down.get(k);
    if (note === undefined) return;
    down.delete(k);
    midi.message([0x80, note, 0], performance.now());
  };
  const onBlur = () => {
    for (const note of down.values()) midi.message([0x80, note, 0], performance.now());
    down.clear();
  };
  // capture: before the exercise shortcuts (H, S … are notes while musical typing is on)
  addEventListener('keydown', onDown, true);
  addEventListener('keyup', onUp, true);
  addEventListener('blur', onBlur);
  return () => {
    removeEventListener('keydown', onDown, true);
    removeEventListener('keyup', onUp, true);
    removeEventListener('blur', onBlur);
    onBlur();
    midi.devices = midi.devices.filter((d) => d !== COMPUTER_KEYS_NAME);
  };
}
