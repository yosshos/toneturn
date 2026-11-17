// Guitar input with a MIDI device connected (GUITAR-AUDIT B7): MIDI is used for guitar items unless the player chose the
// microphone — a keyboard left plugged in must not silently turn the guitar's microphone checks (chord ring check,
// bends by ear, legato, palm mute) off. The take says which input it listens to and offers the other one.

import type { Drill } from '../engine/drills/types';
import { isGuitarDrill } from '../engine/drills/events';
import { midi } from './midi';

const KEY = 'tt.guitar.input';

/** The player's choice for guitar items while MIDI is connected ('midi' unless they picked the mic). */
export function guitarInputPref(): 'midi' | 'mic' {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'mic' ? 'mic' : 'midi';
  } catch {
    return 'midi';
  }
}
export function setGuitarInputPref(v: 'midi' | 'mic'): void {
  try {
    if (v === 'mic') localStorage.setItem(KEY, 'mic');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the default (MIDI) stays */
  }
}

/** Does this take listen to MIDI? Any MIDI device for piano items; for guitar / bass, MIDI unless the mic was chosen. */
export function takeUsesMidi(drill: Drill): boolean {
  if (!midi.devices.length) return false;
  return isGuitarDrill(drill) ? guitarInputPref() === 'midi' : true;
}
