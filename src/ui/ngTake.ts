// The measured take of 5-4-3-2 Call and Enclosure Target (inside TakeShell): open the input, then either a rubato
// take (the chord sounds, then the player plays at their own pace; it ends when enough notes came and a short pause
// follows, after a longer pause, or when nothing comes) or a timed take (count-in, the band and the click; the beat
// cells follow the clock). Returns the played notes on the take's clock (latency removed).

import type { GChord } from '../engine/progGrid';
import type { NoteEvent } from '../engine/lesson';
import type { Settings } from '../storage/progress';
import { listenNotes, type Heard, type MeasuredInput } from './instCapture';
import { piano } from './services';
import { bandEvents, clickTimeline, followBeats } from './NewGameBits';
import type { TakePhase } from './TakeShell';

export interface Played {
  ms: number;
  midi: number;
}
interface Base {
  signal: AbortSignal;
  input: MeasuredInput;
  settings: Settings;
  bass?: boolean;
  setPhase: (p: TakePhase) => void;
}

/** A held chord (shell voicing + bass) for `sec` seconds. */
export const chordEvents = (c: Pick<GChord, 'root' | 'q' | 'x'>, sec: number): NoteEvent[] => bandEvents([{ ...c, beats: 4 }], 240 / sec, 0.05, true);

/** Rubato: the chord, then listen until `need` notes and a pause (or a longer pause, or nothing). */
export async function freeTake(o: Base & { chord: Pick<GChord, 'root' | 'q' | 'x'>; need: number; quietAfterMs: number; nothingMs: number; tailMs: number }): Promise<Played[] | 'mic-error' | null> {
  const heard: Heard[] = [];
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  if (o.input === 'mic') o.setPhase('open');
  const ok = await listenNotes(o.signal, o.input, o.settings, heard, { bass: o.bass, maxMs: 120_000 });
  if (o.signal.aborted) return null;
  if (!ok) return 'mic-error';
  o.setPhase('play');
  // The chord sounds first (a mic would hear it, so listening starts as it fades).
  const sec = 1.4;
  void piano.play(chordEvents(o.chord, sec), sec + 0.2, o.signal).catch(() => {});
  const t0 = performance.now() + (o.input === 'mic' ? sec * 1000 + 250 : 0);
  await new Promise<void>((res) => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const notes = heard.filter((h) => h.perf >= t0);
      const last = notes.length ? notes[notes.length - 1].perf : 0;
      if (o.signal.aborted || (notes.length >= o.need && now - last > o.tailMs) || (notes.length && now - last > o.quietAfterMs) || (!notes.length && now - t0 > o.nothingMs)) {
        window.clearInterval(id);
        res();
      }
    }, 80);
  });
  if (o.signal.aborted) return null;
  return heard.filter((h) => h.perf >= t0).map((h) => ({ ms: h.perf - t0 - h.lat, midi: h.midi }));
}

/** Timed: a one-bar count-in, then the band over `chords` with the click; the cells follow the clock. */
export async function timedTake(o: Base & { chords: Pick<GChord, 'root' | 'q' | 'x' | 'beats'>[]; bpm: number; countIn: number; setCell: (i: number) => void }): Promise<Played[] | 'mic-error' | null> {
  const heard: Heard[] = [];
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  if (o.input === 'mic') o.setPhase('open');
  const ok = await listenNotes(o.signal, o.input, o.settings, heard, { bass: o.bass, maxMs: 120_000 });
  if (o.signal.aborted) return null;
  if (!ok) return 'mic-error';
  o.setPhase('play');
  const beats = o.chords.reduce((a, c) => a + c.beats, 0);
  const tl = clickTimeline(o.bpm, o.countIn, beats);
  let origin = performance.now() + 120 + tl.responseAt * 1000;
  const end = followBeats(o.signal, () => origin, o.bpm, o.countIn, beats, o.setCell);
  void piano.play(bandEvents(o.chords, o.bpm, tl.responseAt + 0.06), tl.responseEnd + 0.6, o.signal).catch(() => {});
  try {
    await piano.playTimeline(tl, o.signal, undefined, (perf) => {
      origin = perf;
    });
  } catch {
    return null;
  } finally {
    end();
  }
  o.setCell(-1);
  return heard.map((h) => ({ ms: h.perf - origin - h.lat, midi: h.midi })).filter((p) => p.ms > -2000);
}
