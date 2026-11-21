// "Play a note to continue" (owner 2026-11-21): hands stay on the instrument between steps too. Where the app waits for a
// press to go on (an exercise's brief page, the step's result, the next card), a note on the MIDI keyboard or any key of
// the computer keyboard does the same. Armed after a moment, so the last note of a take never skips a page.
import { useEffect, useRef } from 'react';
import { midi } from '../speech/midi';

/** Keys that never count (focus moves, modifiers, closing). */
const IGNORED = new Set(['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'ContextMenu', 'F5', 'F12']);
/** Wait this long before a note counts. */
export const ANY_NOTE_ARM_MS = 700;

/** While `on`, the first played note (or key) calls `fire` once. */
export function useAnyNote(on: boolean, fire: () => void, armMs = ANY_NOTE_ARM_MS, opts: { keys?: boolean } = {}): void {
  const keys = opts.keys !== false;
  const ref = useRef(fire);
  ref.current = fire;
  useEffect(() => {
    if (!on) return;
    let armed = false;
    let done = false;
    const t = window.setTimeout(() => (armed = true), armMs);
    const go = () => {
      if (!armed || done) return;
      done = true;
      ref.current();
    };
    const offMidi = midi.onNote((_m, isOn) => void (isOn && go()));
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || IGNORED.has(e.key)) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      // Enter / Space on a focused button activate that button — leave them to it.
      if ((e.key === 'Enter' || e.key === ' ') && el?.closest?.('button, a, [role="button"]')) return;
      if (!armed || done) return;
      e.preventDefault();
      go();
    };
    if (keys) window.addEventListener('keydown', key);
    return () => {
      window.clearTimeout(t);
      offMidi();
      window.removeEventListener('keydown', key);
    };
  }, [on, armMs, keys]);
}

/** The small hint under the button. */
export function AnyNoteHint({ lang, className = '' }: { lang: 'he' | 'en'; className?: string }) {
  return (
    <p className={`any-note-hint ${className}`} data-any-note="1">
      {lang === 'he' ? 'או נגנו צליל כלשהו / הקישו על מקש' : 'or play any note / press any key'}
    </p>
  );
}
