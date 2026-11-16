// My recordings (SPEC-PHRASE-STUDIO §6.1): a listener on every microphone capture, so a screen's mic takes can keep
// their audio without a second getUserMedia (refused on iOS) and without each screen wiring a recorder. While a tap
// that wants audio is on, BrowserPitchCapture records its own stream (~48 kbps) and hands the tap one segment per
// capture: its start on the performance clock, its frames as they come, and its audio (so far, or whole once ended).
// Taps are added by recKeep.ts only (a DrillTake on screen, a game on screen); nothing is kept here.

import type { SungFrame } from '../engine/sing';

export interface CaptureSegment {
  /** performance.now() when the capture started (frame t = 0). */
  startPerf: number;
  /** The capture's frames, pushed as they come (t in seconds from startPerf). */
  frames: SungFrame[];
  ended: boolean;
  /** Whether a recorder runs on this capture. */
  recording: boolean;
  /** The audio so far (a running capture) or whole (ended); null when nothing was recorded. */
  audio(): Promise<Blob | null>;
  /** Resolves when the capture has ended (and its recorder flushed). */
  done: Promise<void>;
  /** v2: the capture's own microphone stream (the whole-session recording mixes it in — no second getUserMedia). */
  stream?: MediaStream;
}

export interface CaptureTap {
  /** Record the audio of the captures while this tap is on. */
  audio: boolean;
  onSegment(seg: CaptureSegment): void;
}

const taps = new Set<CaptureTap>();
/** Add a tap; returns its removal. */
export function addCaptureTap(t: CaptureTap): () => void {
  taps.add(t);
  return () => void taps.delete(t);
}
export const captureTapsOn = () => taps.size > 0;
export const captureTapsWantAudio = () => [...taps].some((t) => t.audio);
export function announceSegment(seg: CaptureSegment) {
  for (const t of taps) {
    try {
      t.onSegment(seg);
    } catch {
      /* a tap never breaks a capture */
    }
  }
}

/** A segment over a running MediaRecorder (or none). `finish()` is called by the capture when it ends. */
export function makeSegment(startPerf: number, rec: MediaRecorder | null, chunks: Blob[]): CaptureSegment & { finish: () => void } {
  let endIt: () => void = () => {};
  const done = new Promise<void>((r) => (endIt = r));
  const blob = () => (chunks.length ? new Blob(chunks, { type: chunks[0].type || rec?.mimeType || 'audio/webm' }) : null);
  const seg: CaptureSegment & { finish: () => void } = {
    startPerf,
    frames: [],
    ended: false,
    recording: !!rec,
    done,
    finish: () => {
      seg.ended = true;
      endIt();
    },
    audio: async () => {
      if (!rec) return null;
      if (seg.ended || rec.state === 'inactive') return blob();
      // Running: flush what the recorder holds, then the chunks so far make a playable file (the header is in the first).
      await new Promise<void>((res) => {
        const t = setTimeout(res, 600);
        const prev = rec.ondataavailable;
        rec.ondataavailable = (e) => {
          prev?.call(rec, e);
          rec.ondataavailable = prev;
          clearTimeout(t);
          res();
        };
        try {
          rec.requestData();
        } catch {
          clearTimeout(t);
          rec.ondataavailable = prev;
          res();
        }
      });
      return blob();
    },
  };
  return seg;
}
