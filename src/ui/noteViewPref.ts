// The note views of the active course (0.66, guitar audit): the guitar course shows notes on the neck / tab where the
// player's general preference says "keyboard" — a piano keyboard under a guitar question is the wrong instrument.
import type { NoteView } from '../engine/aids';
import type { Settings } from '../storage/progress';

export function noteViewsOf(s: Pick<Settings, 'noteViews' | 'activeCourse'>): NoteView[] {
  const v = s.noteViews ?? ['keyboard', 'staff'];
  if (s.activeCourse !== 'guitar') return v;
  return [...new Set(v.map((x): NoteView => (x === 'keyboard' ? 'tab' : x)))];
}

/** The instrument a player plays right now: the guitar / bass course's own, else the profile's. */
export function courseInstrument(s: Pick<Settings, 'instrument' | 'activeCourse'>): Settings['instrument'] {
  return s.activeCourse === 'guitar' || s.activeCourse === 'bass' ? s.activeCourse : s.instrument;
}

/**
 * Semitones added to a played (heard) note before it is placed. Guitar and bass sound an octave below written: a staff
 * or keys target is written pitch, so the heard note moves up an octave. A neck target is the neck's own pitch
 * (fretboard.noteAt: low E = 40, what the microphone hears) and is never shifted.
 */
export function playedShift(inst: Settings['instrument'], surface: 'keys' | 'neck' | 'staff'): number {
  return (inst === 'guitar' || inst === 'bass') && surface !== 'neck' ? 12 : 0;
}
