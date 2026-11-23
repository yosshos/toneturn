// The player's inputs for active time (SPEC-WORKOUT W3, engine/activeTime.ts): taps, keys and MIDI notes, noted on
// this device once the app starts. The workout books active time from them — a block (Improvise, a game, a lesson)
// left open while the player walks away stops counting after 15 seconds.

import { InputLog } from '../engine/activeTime';
import { midi } from '../speech/midi';

const log = new InputLog();
let installed = false;

/** Note an input from elsewhere (a sung note, a take's end). */
export const noteActivity = (t = Date.now()) => log.note(t);

/** Start listening (idempotent). */
export function installActivity(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const on = () => log.note(Date.now());
  window.addEventListener('pointerdown', on, { passive: true, capture: true });
  window.addEventListener('keydown', on, { capture: true });
  window.addEventListener('wheel', on, { passive: true, capture: true });
  try {
    midi.onNote((_n, down) => {
      if (down) log.note(Date.now());
    });
  } catch {
    /* no MIDI */
  }
}

/** Active ms since `from` (W3: gaps over 15 s count as 15 s). */
export const activeSince = (from: number, now = Date.now()) => log.activeSince(from, now);
