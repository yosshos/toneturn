// A free-time take (rubato first, owner 2026-11-14): no count-in, no click — play the notes at your own pace. The staff's
// now-cue waits on the next note to play; the take ends by itself when every note is in (or on "Done"). Graded on the
// notes only (rubato.ts analyzeFree).

import { useEffect, useRef, useState } from 'react';
import { analyzeFree, freeProgress } from '../engine/drills/rubato';
import { captureOptsFor, detectOnsets, onsetOptsFor, type GFrame } from '../engine/drills/guitarAnalyze';
import { isGuitarDrill } from '../engine/drills/events';
import type { Drill, DrillCalibration, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { piano } from './services';

type Lang = 'en' | 'he';
const TX = {
  en: { play: 'Start', done: 'Done', hint: 'No click: play the notes at your own pace. The marker waits for you.', listening: 'Listening — at your own pace' },
  he: { play: 'להתחיל', done: 'סיימתי', hint: 'בלי קליק: מנגנים את הצלילים בקצב שלכם. הסמן מחכה לכם.', listening: 'מקשיב — בקצב שלכם' },
};
/** Silence after the last note that ends a take once at least half the notes are in. */
const QUIET_MS = 5000;

export function RubatoTake({ drill, lang, cal, onDone, onBeat, autoStart = false }: { drill: Drill; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void; onBeat?: (beat: number) => void; autoStart?: boolean }) {
  const tx = TX[lang];
  const [on, setOn] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  const start = async () => {
    await piano.unlock();
    setOn(true);
    onBeat?.(0);
    const zero = performance.now();
    const notes: PlayedNote[] = [];
    const open = new Map<number, PlayedNote>();
    const frames: GFrame[] = [];
    const guitar = isGuitarDrill(drill);
    const abort = new AbortController();
    let lastAt = zero;
    let finished = false;
    const current = (): PlayedNote[] => (guitar && !midi.devices.length && frames.length ? detectOnsets(frames, onsetOptsFor(drill)) : notes);
    const finish = () => {
      if (finished) return;
      finished = true;
      abort.abort();
      offMidi();
      window.clearInterval(tick);
      setOn(false);
      onBeat?.(-1);
      const played = current();
      onDone(analyzeFree(drill, played), played);
    };
    stop.current = () => {
      finished = true;
      abort.abort();
      offMidi();
      window.clearInterval(tick);
    };
    const offMidi = midi.onNote((m, isOn, at, vel) => {
      const t = at - zero - cal.latencyMs;
      if (isOn) {
        const n: PlayedNote = { pitch: m, on: t, off: null, vel };
        notes.push(n);
        open.set(m, n);
        lastAt = performance.now();
      } else {
        const n = open.get(m);
        if (n) n.off = t;
        open.delete(m);
      }
    });
    if (!midi.devices.length) {
      if (guitar)
        void listenLoop(
          new BrowserPitchCapture(),
          abort.signal,
          (f) => {
            frames.push({ t: performance.now() - zero - cal.latencyMs, hz: f.hz, conf: f.confidence, rms: f.rms, chroma: f.chroma, centroid: f.centroid, bands: f.bands });
            if (f.hz && f.confidence > 0.85) lastAt = performance.now();
          },
          undefined,
          { ...(captureOptsFor(drill) ?? {}) },
        );
      else {
        // Piano by microphone: one pitch at a time, held 60 ms (the timed take's simple capture).
        let cand: number | null = null;
        let since = 0;
        let last: number | null = null;
        void listenLoop(new BrowserPitchCapture(), abort.signal, (f) => {
          const now = performance.now();
          if (!f.hz || f.confidence < 0.85) {
            last = null;
            cand = null;
            return;
          }
          const m = Math.round(69 + 12 * Math.log2(f.hz / 440));
          if (m !== cand) {
            cand = m;
            since = now;
            return;
          }
          if (now - since > 60 && m !== last) {
            last = m;
            notes.push({ pitch: m, on: since - zero - cal.latencyMs, off: null, vel: 64 });
            lastAt = now;
          }
        });
      }
    }
    // The now-cue follows the player; the take ends when every note is in, or after a long silence past half-way.
    const tick = window.setInterval(() => {
      const played = current();
      const at = freeProgress(drill, played);
      onBeat?.(Math.min(at, drill.beats - 0.001));
      if (at >= drill.beats) return void window.setTimeout(finish, 600);
      if (played.length >= drill.notes.length / 2 && performance.now() - lastAt > QUIET_MS) finish();
    }, 120);
    stop.current = () => {
      finished = true;
      abort.abort();
      offMidi();
      window.clearInterval(tick);
    };
    doneRef.current = finish;
  };
  const doneRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (autoStart) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="drill-take rubato" data-rubato-take={on ? 'on' : 'ready'}>
      <p className="field-hint">{on ? tx.listening : tx.hint}</p>
      {on ? (
        <button className="btn primary" onClick={() => doneRef.current?.()} data-rubato-done="1">
          {tx.done}
        </button>
      ) : (
        <button className="btn mega" onClick={() => void start()} data-rubato-start="1">
          ▶ {tx.play}
        </button>
      )}
    </div>
  );
}
