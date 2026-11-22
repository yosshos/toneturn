// Hear it first (owner 2026-11-21: "there is no point reading an exercise without hearing it"): the written item played
// by the app at a tempo, the score cursor running with it. A Listen button beside Play on every reading take; the
// practice coach plays a new step once by itself before asking for it.
import { useEffect, useRef, useState } from 'react';
import type { Drill } from '../engine/drills/types';
import type { NoteEvent } from '../engine/lesson';
import { isDrumDrill } from '../engine/drills/events';
import { piano } from './services';
import { expTimeMs } from '../engine/drills/analyze';
import { cursorBeatAt, frameLead } from '../engine/playhead';
import { Icon } from './icons';

/** Items with written pitches to hear (not drums, singing, untimed note finding, or empty). */
export const hearable = (d: Drill): boolean => d.notes.length > 0 && !isDrumDrill(d) && !d.sung && !d.untimed && !d.listen;

/**
 * Play the item at `bpm`; `onBeat` gets the running written beat (fractional) and −1 at the end. Rejects when aborted.
 * Owner 2026-11-22: the notes sound where a take expects them (expTimeMs: swung 8ths at 2/3 of the beat, the tempo map)
 * and the cursor reads the same clock from the moment the first note is heard (the audio engine says when), stopping
 * on the last note — it no longer guessed the start (60 ms ahead, output latency ignored) or ran on to the line's end.
 */
export async function playDrill(d: Drill, bpm: number, signal: AbortSignal, onBeat?: (b: number) => void): Promise<void> {
  await piano.unlock();
  const b = Math.max(30, bpm);
  const at = (beat: number) => expTimeMs(d, beat, b) / 1000;
  const ev: NoteEvent[] = d.notes.map((n) => ({ midi: n.pitch, start: at(n.beat), duration: Math.max(0.08, (at(n.beat + n.dur) - at(n.beat)) * 0.95), velocity: n.accent ? 0.78 : 0.6 }));
  const length = Math.max(at(d.beats), ...d.notes.map((n) => at(n.beat + n.dur))) + 0.25;
  let t0 = 0;
  let raf = 0;
  const lead = frameLead();
  const tick = () => {
    const now = performance.now();
    const ahead = lead(now);
    if (t0) onBeat?.(Math.max(0, cursorBeatAt(d, b, now + ahead - t0)));
    raf = requestAnimationFrame(tick);
  };
  if (onBeat) raf = requestAnimationFrame(tick);
  try {
    await piano.play(ev, length, signal, (heard) => (t0 = heard));
  } finally {
    cancelAnimationFrame(raf);
    onBeat?.(-1);
  }
}

/** The Listen button (a toggle: a second tap stops it). */
export function HearButton({ drill, bpm, lang, onBeat }: { drill: Drill; bpm: number; lang: 'he' | 'en'; onBeat?: (b: number) => void }) {
  const [on, setOn] = useState(false);
  const ac = useRef<AbortController | null>(null);
  useEffect(() => () => ac.current?.abort(), []);
  if (!hearable(drill)) return null;
  const toggle = () => {
    if (on) return ac.current?.abort();
    const a = new AbortController();
    ac.current = a;
    setOn(true);
    void playDrill(drill, bpm, a.signal, onBeat)
      .catch(() => {})
      .finally(() => {
        if (ac.current === a) ac.current = null;
        setOn(false);
      });
  };
  const label = lang === 'he' ? (on ? 'לעצור' : 'להקשיב') : on ? 'Stop' : 'Listen';
  return (
    <button type="button" className="btn ghost hear-btn" onClick={toggle} aria-pressed={on} data-hear={on ? 'on' : 'off'}>
      <Icon k={on ? 'stop' : 'speaker'} size={18} /> {label}
    </button>
  );
}
