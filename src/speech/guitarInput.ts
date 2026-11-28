// Guitar input with a MIDI device connected (GUITAR-AUDIT B7): MIDI is used for guitar items unless the player chose the
// microphone — a keyboard left plugged in must not silently turn the guitar's microphone checks (chord ring check,
// bends by ear, legato, palm mute) off. The take says which input it listens to and offers the other one. The decision
// itself is made in one place: inputSource.ts (SPEC-INPUT-SOURCE).

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
