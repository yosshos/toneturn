// Measured input for the beginner games (src/engine/beginnerRun.ts): notes (MIDI / microphone pitch onsets, as
// instCapture.listenNotes), strums (the microphone's strum recogniser, or the notes of one strum on a MIDI guitar)
// and drum strokes with their loudness (a MIDI kit's velocity, or the microphone's peak). Nothing is recorded;
// capture stops with the signal.

import { notifyInput } from '../engine/inputCheck';
import { peakToVel } from '../engine/reboundBall';
import { midi as midiInput } from '../speech/midi';
import { openCapture, stopStream } from '../speech/mic';
import type { Settings } from '../storage/progress';
import type { StrumFrame } from '../engine/chordFinder';
import { listenStrumsTimed, type MeasuredInput } from './instCapture';

/** One strum: its onset (performance.now(), latency not removed), the latency, and what to judge it by. */
export interface StrumIn {
  perf: number;
  lat: number;
  frames?: StrumFrame[];
  pcs?: number[];
}
/** A MIDI guitar's strum: the notes that start within this many ms of the first. */
export const MIDI_STRUM_MS = 90;

/** Listen for strums; resolves true once they can arrive (false: the microphone did not open). */
export async function listenStrums(signal: AbortSignal, input: MeasuredInput, settings: Settings, on: (s: StrumIn) => void): Promise<boolean> {
  if (input === 'mic') return listenStrumsTimed(signal, settings, (perf, lat, frames) => on({ perf, lat, frames }), 600_000);
  try {
    await midiInput.enable();
  } catch {
    /* no MIDI device: nothing will arrive */
  }
  const lat = settings.midiLatencyMs ?? 0;
  let group: { perf: number; pcs: number[] } | null = null;
  let timer = 0;
  const unsub = midiInput.onNote((note, onOff, at) => {
    if (!onOff) return;
    const t = at || performance.now();
    if (!group) {
      group = { perf: t, pcs: [note] };
      timer = window.setTimeout(() => {
        const g = group;
        group = null;
        if (g && !signal.aborted) on({ perf: g.perf, lat, pcs: g.pcs });
      }, MIDI_STRUM_MS);
    } else group.pcs.push(note);
  });
  signal.addEventListener(
    'abort',
    () => {
      unsub();
      window.clearTimeout(timer);
    },
    { once: true },
  );
  return true;
}

/** One drum stroke: onset (performance.now()), latency, velocity 1..127. */
export interface HitIn {
  perf: number;
  lat: number;
  vel: number;
}

/** Listen for strokes on the kit (MIDI; the bass drum and the hi-hat pedal are left out) or a pad by the microphone. */
export async function listenHits(signal: AbortSignal, input: MeasuredInput, settings: Settings, on: (h: HitIn) => void): Promise<boolean> {
  if (input === 'midi') {
    try {
      await midiInput.enable();
    } catch {
      /* no MIDI device */
    }
    const lat = settings.midiLatencyMs ?? 0;
    const unsub = midiInput.opts.drums
      ? midiInput.onHit((h) => {
          if (h.voice === 'kick' || h.voice === 'hhPedal') return;
          on({ perf: h.at || performance.now(), lat, vel: h.vel });
        })
      : midiInput.onNote((_n, onOff, at, vel) => {
          if (onOff) on({ perf: at || performance.now(), lat, vel: vel || 64 });
        });
    signal.addEventListener('abort', unsub, { once: true });
    return true;
  }
  // The microphone: energy onsets with an adaptive floor (as speech/knock.ts), the peak kept as the loudness.
  const r = await openCapture({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  if (!r.ok || signal.aborted) {
    if (r.ok) stopStream(r.stream);
    return false;
  }
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  const src = ctx.createMediaStreamSource(r.stream);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 150;
  const an = ctx.createAnalyser();
  an.fftSize = 256;
  src.connect(hp).connect(an);
  const buf = new Float32Array(an.fftSize);
  const frameMs = (an.fftSize / ctx.sampleRate) * 1000;
  const lat = settings.micLatencyMs ?? 70;
  let floor = 0.01;
  let last = -1e9;
  // a stroke's peak is the loudest frame in the 30 ms after its onset
  let open: { at: number; peak: number } | null = null;
  let timer = 0;
  const tick = () => {
    if (signal.aborted) return;
    an.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    const now = performance.now();
    if (open) {
      open.peak = Math.max(open.peak, peak);
      if (now - open.at > 30) {
        notifyInput('mic', open.at);
        on({ perf: open.at, lat, vel: peakToVel(open.peak) });
        open = null;
      }
    } else if (peak > Math.max(0.06, floor * 5) && now - last > 70) {
      last = now;
      open = { at: now - frameMs / 2, peak };
    }
    floor = floor * 0.98 + Math.min(peak, 0.05) * 0.02;
    timer = window.setTimeout(tick, 4);
  };
  timer = window.setTimeout(tick, 4);
  signal.addEventListener(
    'abort',
    () => {
      window.clearTimeout(timer);
      stopStream(r.stream);
      void ctx.close();
    },
    { once: true },
  );
  return true;
}
