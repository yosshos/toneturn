// Hear it first (owner 2026-11-21: "there is no point reading an exercise without hearing it"): the written item played
// by the app at a tempo, the score cursor running with it. A Listen button beside Play on every reading take; the
// practice coach plays a new step once by itself before asking for it.
import { useEffect, useRef, useState } from 'react';
import type { Drill } from '../engine/drills/types';
import type { NoteEvent } from '../engine/lesson';
import { isDrumDrill } from '../engine/drills/events';
import { piano } from './services';
import { express } from '../audio/expression';
import { Icon } from './icons';

/** Items with written pitches to hear (not drums, singing, untimed note finding, or empty). */
export const hearable = (d: Drill): boolean => d.notes.length > 0 && !isDrumDrill(d) && !d.sung && !d.untimed && !d.listen;

/** piano.play schedules its notes this far ahead. */
const AHEAD_MS = 60;

/** Play the item at `bpm`; `onBeat` gets the running beat (fractional) and −1 at the end. Rejects when aborted. */
export async function playDrill(d: Drill, bpm: number, signal: AbortSignal, onBeat?: (b: number) => void): Promise<void> {
  await piano.unlock();
  const spb = 60 / Math.max(30, bpm);
  const raw: NoteEvent[] = d.notes.map((n) => ({ midi: n.pitch, start: n.beat * spb, duration: Math.max(0.08, n.dur * spb * 0.95), velocity: n.accent ? 0.78 : 0.6 }));
  // owner 2026-11-21: the model is played musically (phrasing, metre, articulation), on the grid; an item whose goal
  // is a dynamics or touch shows that goal, lightly shaped
  const ev = express(raw, { bpm, feel: d.spec.swing ? 'swing' : 'straight', amount: d.goal.dynamics || d.goal.articulation ? 0.25 : 0.6, seed: d.notes.length + Math.round(bpm) });
  const length = Math.max(d.beats, ...d.notes.map((n) => n.beat + n.dur)) * spb + 0.25;
  const t0 = performance.now() + AHEAD_MS;
  let raf = 0;
  const tick = () => {
    const b = (performance.now() - t0) / 1000 / spb;
    onBeat?.(Math.min(Math.max(0, b), d.beats - 0.001));
    raf = requestAnimationFrame(tick);
  };
  if (onBeat) raf = requestAnimationFrame(tick);
  try {
    await piano.play(ev, length, signal);
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
