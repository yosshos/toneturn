// Strums from the microphone (GUITAR_DEEPENING §6): one open capture with chroma frames; each strum (a jump in loudness)
// is handed over as ~0.5 s of frames from just before its onset, for the chord finder / a strum question to judge.
// The microphone stays open only while the caller's signal is live; nothing is recorded.

import { useEffect, useRef } from 'react';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { STRUM_MIN_RMS, STRUM_RISE, type StrumFrame } from '../engine/chordFinder';
import type { AccessError } from '../game/adapters';

/** Frames kept after an onset before the strum is judged (ms), and the quiet time before a new strum may start. */
const AFTER_MS = 520;
const REFRACTORY_MS = 650;

/** Listen until `signal` aborts; `onStrum` gets each strum's frames (t in ms). Resolves with an access error, if any. */
export async function listenStrums(signal: AbortSignal, onStrum: (frames: StrumFrame[]) => void, onLevel?: (rms: number) => void): Promise<AccessError | null> {
  const cap = new BrowserPitchCapture();
  const buf: StrumFrame[] = [];
  let onset: number | null = null;
  let lastOnset = -1e9;
  while (!signal.aborted) {
    const res = await cap.sing({
      signal,
      chroma: true,
      maxMs: 60_000,
      silenceMs: 60_000,
      // Sequence mode with a long tail: a held chord never ends the capture.
      endSilenceMs: 60_000,
      hopMs: 25,
      onFrame: (f) => {
        const t = f.t * 1000;
        const fr: StrumFrame = { t, hz: f.hz, conf: f.confidence, rms: f.rms, chroma: f.chroma };
        buf.push(fr);
        while (buf.length && buf[0].t < t - 1500) buf.shift();
        onLevel?.(f.rms);
        if (onset === null) {
          const prev = buf.slice(-7, -1).map((x) => x.rms);
          const floor = prev.length ? Math.min(...prev) : 0;
          if (t - lastOnset > REFRACTORY_MS && f.rms >= STRUM_MIN_RMS && f.rms >= STRUM_RISE * Math.max(floor, 0.002)) onset = t;
        } else if (t >= onset + AFTER_MS) {
          const o = onset;
          onset = null;
          lastOnset = o;
          onStrum(buf.filter((x) => x.t >= o - 150));
        }
      },
    });
    if (res.kind === 'error') return res.error;
    if (res.kind === 'aborted') break;
  }
  return null;
}

/** Hook: listen while `on`; the latest `onStrum` is always called (no restart when it changes). */
export function useStrums(on: boolean, onStrum: (frames: StrumFrame[]) => void, onError?: (e: AccessError) => void, onLevel?: (rms: number) => void): void {
  const cb = useRef(onStrum);
  cb.current = onStrum;
  const lv = useRef(onLevel);
  lv.current = onLevel;
  const er = useRef(onError);
  er.current = onError;
  useEffect(() => {
    if (!on) return;
    const ac = new AbortController();
    void listenStrums(ac.signal, (f) => cb.current(f), (r) => lv.current?.(r)).then((e) => e && er.current?.(e));
    return () => ac.abort();
  }, [on]);
}
