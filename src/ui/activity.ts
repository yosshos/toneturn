// The player's inputs for active time (SPEC-WORKOUT W3, engine/activeTime.ts): taps, keys and MIDI notes, noted on
// this device once the app starts. The workout books active time from them — a block (Improvise, a game, a lesson)
// left open while the player walks away stops counting after 15 seconds.

import { InputLog } from '../engine/activeTime';
import { midi } from '../speech/midi';
import { onInput } from '../engine/inputCheck';

const log = new InputLog();
let installed = false;

/** Note an input from elsewhere (a sung note, a take's end). */
export const noteActivity = (t = Date.now()) => log.note(t);

/**
 * W3 with the microphone: a note heard by the pitch / onset detection (a sung note, an acoustic guitar or bass, the
 * mic while improvising, a knock) is an input too — mic-only practice counts as active time. The capture plumbing
 * reports clear frames on the input bus (engine/inputCheck.notifyInput); this books them (idempotent).
 */
let micWired = false;
export function wireMicActivity(): void {
  if (micWired) return;
  micWired = true;
  onInput((_at, src) => {
    if (src === 'mic') log.note(Date.now());
  });
}

/** Start listening (idempotent). */
export function installActivity(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  wireMicActivity();
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

/** The latest input (a tap, a key, a MIDI note, a note heard by the microphone); null: none yet. */
export const lastInputAt = (): number | null => log.lastAt();

/**
 * A take in progress (a recorded take, the band playing a chorus): the workout's "time is up" waits for it to end
 * (SPEC-WORKOUT §5 — never cut a take). `holdTake()` marks one; the returned function releases it.
 */
let holds = 0;
export function holdTake(): () => void {
  holds++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holds = Math.max(0, holds - 1);
    noteActivity();
  };
}
export const takeBusy = (): boolean => holds > 0;
