// Measured input for the 0.76 instrument games: MIDI notes, microphone pitch onsets (the Highway / Riff Echo onset
// tracker) and microphone strums (chroma frames around each loudness jump, as src/ui/strumListen.ts, but on the
// performance clock so a strum can be placed on the beat). Nothing is recorded; capture stops with the signal.

import { MIC_PITCH_LAG_MS, OnsetTracker } from '../engine/highway';
import { STRUM_MIN_RMS, STRUM_RISE, type StrumFrame } from '../engine/chordFinder';
import { midi as midiInput } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Settings } from '../storage/progress';

export type MeasuredInput = 'mic' | 'midi';
export interface Heard {
  /** performance.now() of the onset (latency NOT yet removed). */
  perf: number;
  midi: number;
  /** The input's latency (ms) to subtract. */
  lat: number;
}

/**
 * Start listening; resolves true once notes can arrive (MIDI at once, the mic when it captures), false when the
 * microphone did not open. Notes are pushed into `out` until `signal` aborts. `held` (MIDI) keeps the keys down now.
 */
export async function listenNotes(signal: AbortSignal, input: MeasuredInput, settings: Settings, out: Heard[], o: { bass?: boolean; maxMs?: number; held?: Set<number>; onNote?: (h: Heard) => void } = {}): Promise<boolean> {
  if (input === 'midi') {
    try {
      await midiInput.enable();
    } catch {
      /* no MIDI device: nothing will arrive */
    }
    const lat = settings.midiLatencyMs ?? 0;
    const unsub = midiInput.onNote((note, on, at) => {
      if (on) {
        const h = { perf: at || performance.now(), midi: note, lat };
        out.push(h);
        o.held?.add(note);
        o.onNote?.(h);
      } else o.held?.delete(note);
    });
    signal.addEventListener('abort', unsub, { once: true });
    return true;
  }
  const tracker = new OnsetTracker({ minMidi: o.bass ? 26 : 38 });
  const lat = settings.micLatencyMs ?? MIC_PITCH_LAG_MS;
  let capStart = 0;
  const maxMs = o.maxMs ?? 60_000;
  return new Promise<boolean>((resolve) => {
    void new BrowserPitchCapture()
      .sing({
        signal,
        maxMs,
        silenceMs: maxMs,
        endSilenceMs: 1e9,
        hopMs: 20,
        minHz: o.bass ? 35 : undefined,
        onCapturing: () => {
          capStart = performance.now();
          resolve(true);
        },
        onFrame: (f) => {
          const on = tracker.feed({ ms: capStart + f.t * 1000, hz: f.hz, confidence: f.confidence, rms: f.rms });
          if (on) {
            const h = { perf: on.ms, midi: on.midi, lat };
            out.push(h);
            o.onNote?.(h);
          }
        },
      })
      .then((r) => {
        if (r.kind === 'error' || (r.kind === 'silence' && !capStart)) resolve(false);
      });
  });
}

/** Frames kept after a strum's onset before it is judged, and the quiet time before the next strum. */
const AFTER_MS = 420;
const REFRACTORY_MS = 480;

/** Listen for strums; `onStrum(perfOnset, frames)` per strum (frames' t in ms on the capture clock). */
export async function listenStrumsTimed(signal: AbortSignal, settings: Settings, onStrum: (perf: number, lat: number, frames: StrumFrame[]) => void, maxMs = 60_000): Promise<boolean> {
  const buf: StrumFrame[] = [];
  let onset: number | null = null;
  let last = -1e9;
  let capStart = 0;
  const lat = settings.micLatencyMs ?? MIC_PITCH_LAG_MS;
  return new Promise<boolean>((resolve) => {
    void new BrowserPitchCapture()
      .sing({
        signal,
        chroma: true,
        maxMs,
        silenceMs: maxMs,
        endSilenceMs: 1e9,
        hopMs: 25,
        onCapturing: () => {
          capStart = performance.now();
          resolve(true);
        },
        onFrame: (f) => {
          const t = f.t * 1000;
          buf.push({ t, hz: f.hz, conf: f.confidence, rms: f.rms, chroma: f.chroma });
          while (buf.length && buf[0].t < t - 1500) buf.shift();
          if (onset === null) {
            const prev = buf.slice(-7, -1).map((x) => x.rms);
            const floor = prev.length ? Math.min(...prev) : 0;
            if (t - last > REFRACTORY_MS && f.rms >= STRUM_MIN_RMS && f.rms >= STRUM_RISE * Math.max(floor, 0.002)) onset = t;
          } else if (t >= onset + AFTER_MS) {
            const o = onset;
            onset = null;
            last = o;
            onStrum(capStart + o, lat, buf.filter((x) => x.t >= o - 150));
          }
        },
      })
      .then((r) => {
        if (r.kind === 'error' || (r.kind === 'silence' && !capStart)) resolve(false);
      });
  });
}
