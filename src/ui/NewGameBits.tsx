// Shared pieces of the five AUDIT-GAMES §4 games: a chord symbol isolate, the one-line feedback with a "Why?" expander
// (wrong answers only), the beat dots with the now-cue, the input picker, and the band (comping + click) for the timed
// games. Styles: src/newgames.css.

import '../newgames.css';
import { useState, type ReactNode } from 'react';
import type { NoteEvent } from '../engine/lesson';
import { voiceChords, type GChord } from '../engine/progGrid';
import { keyInstOf } from '../engine/newGamesKit';
import type { KeyInstrument } from '../engine/analysis/keyMastery';
import type { Settings } from '../storage/progress';
import type { MeasuredInput } from './instCapture';
import { IsoMix } from './Iso';

type Lang = 'he' | 'en';

/** A chord symbol, note name or numeral: always read left to right (inside Hebrew too). */
export const Sym = ({ text, className = '' }: { text: string; className?: string }) => (
  <bdi dir="ltr" className={`ng-sym ${className}`}>
    {text}
  </bdi>
);

/** One line of feedback; on a wrong answer a "Why?" button opens one more line. */
export function WhyLine({ lang, line, ok, why }: { lang: Lang; line: ReactNode; ok: boolean | null; why?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ng-feedback ${ok === null ? '' : ok ? 'ok' : 'bad'}`} aria-live="polite" data-ng-feedback={ok === null ? '' : ok ? 'ok' : 'bad'}>
      <p className="ng-line">
        <b>{line}</b>
        {ok === false && why ? (
          <button type="button" className="ng-why" aria-expanded={open} onClick={() => setOpen((x) => !x)} data-why="1">
            {lang === 'he' ? 'למה?' : 'Why?'}
          </button>
        ) : null}
      </p>
      {ok === false && why && open ? (
        <p className="ng-detail">
          <IsoMix text={why} />
        </p>
      ) : null}
    </div>
  );
}

/** The beat dots of a timed take: count-in dots first (hollow), then the bar's beats; the now-cue on the current one. */
export function BeatDots({ countIn, beats, now, marks, targets }: { countIn: number; beats: number; now: number; marks?: (string | undefined)[]; targets?: number[] }) {
  return (
    <div className="ng-beats" dir="ltr" aria-hidden="true">
      {Array.from({ length: countIn + beats }, (_, i) => {
        const b = i - countIn;
        const cls = [b < 0 ? 'count' : '', b >= 0 && b % 4 === 0 ? 'bar' : '', i === now ? 'now' : '', b >= 0 && targets?.includes(b) ? 'target' : '', b >= 0 ? (marks?.[b] ?? '') : ''].join(' ');
        return <i key={i} className={cls} />;
      })}
    </div>
  );
}

const TX = {
  input: { en: 'Play into', he: 'לנגן דרך' },
  mic: { en: 'Microphone', he: 'מיקרופון' },
  midi: { en: 'MIDI', he: 'MIDI' },
};
/** Microphone or MIDI (the take games' segmented control). */
export function InputPick({ lang, value, onChange }: { lang: Lang; value: MeasuredInput; onChange: (x: MeasuredInput) => void }) {
  return (
    <fieldset className="seg-field">
      <legend>{TX.input[lang]}</legend>
      <div className="seg g2-seg" role="radiogroup" aria-label={TX.input[lang]}>
        {(['mic', 'midi'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
            <IsoMix text={TX[k][lang]} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The player's instrument for key mastery and the register. */
export const instOf = (s: Settings): KeyInstrument => keyInstOf(s.activeCourse, s.intake?.plays ?? []);
/** MIDI when a keyboard is switched on, else the microphone. */
export const defaultInput = (s: Settings): MeasuredInput => (s.midiInput ? 'midi' : 'mic');

/** The band's comping from `t0` seconds: shell voicings (3rd and 7th) and the root in the bass, each chord on its first beat. */
export function bandEvents(chords: Pick<GChord, 'root' | 'q' | 'x' | 'beats'>[], bpm: number, t0: number, quiet = false): NoteEvent[] {
  const beat = 60 / bpm;
  const vs = voiceChords(chords, 'shell');
  const ev: NoteEvent[] = [];
  let t = t0;
  chords.forEach((c, i) => {
    const len = c.beats * beat;
    for (const m of vs[i].upper) ev.push({ midi: m, start: t, duration: Math.min(len, 2 * beat) * 0.85, velocity: quiet ? 0.28 : 0.38 });
    ev.push({ midi: vs[i].bass, start: t, duration: Math.min(len, 2 * beat) * 0.9, velocity: 0.55, inst: 'bass' });
    t += len;
  });
  return ev;
}

/** The click: a one-bar count-in (woodblock), then the soft click on 2 and 4 (jazz) for `beats` beats. */
export function clickTimeline(bpm: number, countIn: number, beats: number) {
  const beat = 60 / bpm;
  const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  for (let k = 0; k < countIn; k++) clicks.push({ t: k * beat, accent: k === 0, count: true });
  for (let b = 0; b < beats; b++) if (b % 2 === 1) clicks.push({ t: (countIn + b) * beat, accent: false, soft: true });
  return { clicks, wood: [] as number[], responseAt: countIn * beat, responseEnd: (countIn + beats) * beat + 0.3 };
}

/** Follow the clock: the beat index (count-in included, 0-based) every 40 ms, −1 outside. */
export function followBeats(signal: AbortSignal, origin: () => number, bpm: number, countIn: number, total: number, set: (i: number) => void): () => void {
  const beat = 60000 / bpm;
  const id = window.setInterval(() => {
    const ms = performance.now() - origin() + countIn * beat;
    const i = Math.floor(ms / beat);
    set(i < 0 || i >= countIn + total ? -1 : i);
  }, 40);
  const end = () => window.clearInterval(id);
  signal.addEventListener('abort', end, { once: true });
  return end;
}
