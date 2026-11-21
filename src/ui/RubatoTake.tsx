// A free-time take (rubato first, owner 2026-11-14): no count-in, no click — play the notes at your own pace. The staff's
// now-cue waits on the next note to play; the take ends by itself when every note is in (or on "Done"). Graded on the
// notes only (rubato.ts analyzeFree).

import { useEffect, useRef, useState } from 'react';
import { useKeptTakes } from './recKeep';
import { analyzeFree, freeProgress } from '../engine/drills/rubato';
import { captureOptsFor, detectOnsets, onsetOptsFor, type GFrame } from '../engine/drills/guitarAnalyze';
import { isGuitarDrill } from '../engine/drills/events';
import type { Drill, DrillCalibration, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { midi } from '../speech/midi';
import { takeUsesMidi } from '../speech/guitarInput';
import { analyzeGuitarFree, guitarFreeProgress } from '../engine/drills/guitarFree';
import { logGuitarTake } from '../engine/drills/guitarCalib';
import { bendTrace, placeMidiGuitar, type BendEvent, type ChannelNote } from '../engine/midiGuitar';
import { tuningById } from '../engine/fretboard';
import { isBassDrill } from '../engine/drills/guitarAnalyze';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { piano } from './services';
import { InputCheck, InputWatchdog } from './InputCheck';
import { Icon } from './icons';
import { HearButton } from './HearDrill';

type Lang = 'en' | 'he';
const TX = {
  en: { play: 'Start', done: 'Done', hint: 'No click: play the notes at your own pace. The marker waits for you.', listening: 'Listening — at your own pace' },
  he: { play: 'להתחיל', done: 'סיימתי', hint: 'בלי קליק: מנגנים את הצלילים בקצב שלכם. הסמן מחכה לכם.', listening: 'מקשיב — בקצב שלכם' },
};
/** Silence after the last note that ends a take once at least half the notes are in. */
const QUIET_MS = 5000;

export function RubatoTake({ drill, lang, cal, onDone, onBeat, autoStart = false, hear = true }: { drill: Drill; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void; onBeat?: (beat: number) => void; autoStart?: boolean; /** The Listen button beside Play (off in a level test). */ hear?: boolean }) {
  onDone = useKeptTakes(drill, 0, onDone); // My recordings: free-time takes are kept too (no tempo)
  const tx = TX[lang];
  const [on, setOn] = useState(false);
  // Input check: free time has no first-note time, so the watchdog gives the player 2 s to begin, then its usual wait.
  const [armAt, setArmAt] = useState(0);
  // B7: a guitar item listens to MIDI unless the player chose the microphone (DrillTake says which, and switches).
  const byMidi = takeUsesMidi(drill);
  const checkMode = byMidi ? 'midi' : 'mic';
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  const start = async () => {
    await piano.unlock();
    setOn(true);
    onBeat?.(0);
    const zero = performance.now();
    setArmAt(zero);
    const notes: PlayedNote[] = [];
    const open = new Map<number, PlayedNote>();
    const frames: GFrame[] = [];
    const guitar = isGuitarDrill(drill);
    const abort = new AbortController();
    let lastAt = zero;
    let finished = false;
    const chNotes: ChannelNote[] = [];
    const bends: BendEvent[] = [];
    const tuningOpen = () => tuningById(drill.spec.tuning ?? (isBassDrill(drill) ? 'bass' : 'standard')).open;
    const current = (): PlayedNote[] => (guitar && !byMidi && frames.length ? detectOnsets(frames, onsetOptsFor(drill)) : guitar && byMidi ? placeMidiGuitar(chNotes, midi.opts.guitarChannels, tuningOpen()).played : notes);
    const finish = () => {
      if (finished) return;
      finished = true;
      abort.abort();
      offMidi();
      offBend?.();
      window.clearInterval(tick);
      setOn(false);
      onBeat?.(-1);
      const played = current();
      // (voice leading and own-chord items keep their own graders: any good voicing counts)
      if (!guitar || drill.goal.vl || drill.goal.ct) return onDone(analyzeFree(drill, played), played);
      // B5: a guitar take in free time keeps the guitar checks (strums, unclear onsets, bends) — guitarFree.ts.
      const gm = analyzeGuitarFree(drill, played, byMidi ? [] : frames, byMidi && bends.length ? { pitchTrace: bendTrace(chNotes, bends) } : {});
      logGuitarTake(drill, 0, gm, { input: byMidi ? 'midi' : 'mic', free: true });
      onDone(gm, played);
    };
    stop.current = () => {
      finished = true;
      abort.abort();
      offMidi();
      offBend?.();
      window.clearInterval(tick);
    };
    const offMidi = midi.onNote((m, isOn, at, vel, ch = 0) => {
      const t = at - zero - cal.latencyMs;
      if (isOn) {
        const n: PlayedNote = { pitch: m, on: t, off: null, vel };
        notes.push(n);
        const c: ChannelNote = { ...n, ch };
        chNotes.push(c);
        open.set(ch * 128 + m, n);
        openCh.set(ch * 128 + m, c);
        lastAt = performance.now();
      } else {
        const k = open.has(ch * 128 + m) ? ch * 128 + m : [...open.keys()].find((x) => x % 128 === m);
        if (k === undefined) return;
        const n = open.get(k);
        if (n) n.off = t;
        const c = openCh.get(k);
        if (c) c.off = t;
        open.delete(k);
        openCh.delete(k);
      }
    });
    const openCh = new Map<number, ChannelNote>();
    const offBend = guitar && byMidi ? midi.onBend((ch, cents, at) => void bends.push({ ch, cents, at: at - zero - cal.latencyMs })) : null;
    if (!byMidi) {
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
      const at = guitar && !drill.goal.vl && !drill.goal.ct ? guitarFreeProgress(drill, played) : freeProgress(drill, played);
      onBeat?.(Math.min(at, drill.beats - 0.001));
      if (at >= drill.beats) return void window.setTimeout(finish, 600);
      if (played.length >= drill.notes.length / 2 && performance.now() - lastAt > QUIET_MS) finish();
    }, 120);
    stop.current = () => {
      finished = true;
      abort.abort();
      offMidi();
      offBend?.();
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
      {on && <InputWatchdog lang={lang} mode={checkMode} arm={armAt ? { start: armAt, due: armAt + 2000 } : null} />}
      {!on && <InputCheck mode={checkMode} lang={lang} alsoMidi={checkMode === 'mic' && !isGuitarDrill(drill)} />}
      {on ? (
        <button className="btn primary" onClick={() => doneRef.current?.()} data-rubato-done="1">
          {tx.done}
        </button>
      ) : (
        <div className="take-start">
          {hear && <HearButton drill={drill} bpm={drill.startBpm} lang={lang === 'he' ? 'he' : 'en'} onBeat={onBeat} />}
          <button className="btn mega" onClick={() => void start()} data-rubato-start="1">
            <Icon k="play" /> {tx.play}
          </button>
        </div>
      )}
    </div>
  );
}
