// "When do I sing / play this?" — a shared now-cue for every response that is measured in time:
// a count-in, the click through the take, and the notes lighting up one by one on the grid.
import { useEffect, useRef, useState } from 'react';
import type { NoteEvent } from '../engine/lesson';

/** The grid of one timed response: when each note is due (s from the first beat) and the click spacing. */
export interface Pulse {
  beat: number;
  onsets: number[];
  /** Beats of count-in before the first note. */
  countIn: number;
  /** The whole response, s from the first beat (the click runs a beat past it). */
  length: number;
}

/** The running clock of a pulse: performance.now() of the first beat. */
export interface PulseClock {
  pulse: Pulse;
  zero: number;
}

const CLICK_KEY = 'toneturn.click.v1';
export const loadClick = (): boolean => {
  try {
    return localStorage.getItem(CLICK_KEY) !== '0';
  } catch {
    return true;
  }
};
export const saveClick = (on: boolean) => {
  try {
    localStorage.setItem(CLICK_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
};

/** Count-in clicks (accent on the first) and, when `through`, the click under the whole response. */
export function pulseClicks(p: Pulse, through: boolean, meter = 4): { events: NoteEvent[]; length: number } {
  const events: NoteEvent[] = [];
  const lead = p.countIn * p.beat;
  for (let k = 0; k < p.countIn; k++) events.push({ midi: 0, start: k * p.beat, duration: 0.05, velocity: 0.8, perc: k === 0 ? 'accent' : 'click' });
  if (through) {
    const beats = Math.ceil(p.length / p.beat) + 1;
    for (let b = 0; b < beats; b++) events.push({ midi: 0, start: lead + b * p.beat, duration: 0.05, velocity: b % meter === 0 ? 0.6 : 0.42, perc: b % meter === 0 ? 'accent' : 'click' });
  }
  return { events, length: lead + (through ? (Math.ceil(p.length / p.beat) + 1) * p.beat : 0) + 0.1 };
}

/** Which note is due at `t` (s from the first beat): -1 before the first, onsets.length after the last. */
export function dueIndex(onsets: number[], t: number, lastLen: number): number {
  if (t < -0.04) return -1;
  let k = -1;
  for (let i = 0; i < onsets.length; i++) if (onsets[i] <= t + 0.04) k = i;
  return k === onsets.length - 1 && t > onsets[k] + lastLen ? onsets.length : k;
}

/** Live position on a running pulse: count-in beats left, the due note, and whether a beat just fell. */
export function usePulseNow(clock: PulseClock | null): { countLeft: number; now: number; beatOn: boolean } {
  const [s, setS] = useState({ countLeft: 0, now: -1, beatOn: false });
  const raf = useRef(0);
  useEffect(() => {
    if (!clock) {
      setS({ countLeft: 0, now: -1, beatOn: false });
      return;
    }
    const { pulse: p, zero } = clock;
    const lastLen = p.onsets.length > 1 ? p.onsets[p.onsets.length - 1] - p.onsets[p.onsets.length - 2] : p.beat;
    const loop = () => {
      const t = (performance.now() - zero) / 1000;
      const countLeft = t < 0 ? Math.min(p.countIn, Math.ceil(-t / p.beat - 0.001)) : 0;
      const ph = (((t / p.beat) % 1) + 1) % 1;
      const next = { countLeft, now: dueIndex(p.onsets, t, lastLen), beatOn: t > -p.countIn * p.beat && t < p.length + p.beat && ph < 0.18 };
      setS((o) => (o.countLeft === next.countLeft && o.now === next.now && o.beatOn === next.beatOn ? o : next));
      if (t < p.length + 2 * p.beat) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [clock]);
  return s;
}

/**
 * The notes of a timed response in a row; the due one lights up, the next one is outlined.
 * `labels` null = the notes are part of the task (sung from memory or by ear): dots instead of names.
 */
export function PulseNotes({ clock, labels, count, beatOnly = false }: { clock: PulseClock | null; labels: string[] | null; count: number; beatOnly?: boolean }) {
  const { countLeft, now, beatOn } = usePulseNow(clock);
  return (
    <div className="pulse-notes" dir="ltr" data-running={clock ? '1' : undefined}>
      <span className={`pn-beat${beatOn ? ' on' : ''}${countLeft ? ' count' : ''}`} aria-hidden="true">
        {countLeft || ''}
      </span>
      {!beatOnly && (
        <span className="pn-row">
          {Array.from({ length: count }, (_, k) => (
            <span key={k} className={`pn-chip${labels ? '' : ' dot'}${k === now ? ' now' : k < now ? ' done' : clock && k === now + 1 ? ' next' : ''}`}>
              {labels ? labels[k] : ''}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
