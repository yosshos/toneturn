// Microphone capture: permission request (released immediately) and a probe with level + pitch.

import type { AccessError, MicAccess } from '../game/adapters';
import { yin, type PitchFrame } from '../engine/yin';
import { classifyCaptureError, gatherEnv } from './errors';

let captureSucceeded = false;
/** The microphone chosen in Settings (deviceId); null = the system default. */
let preferredMic: string | null = null;
export const setPreferredMic = (id: string | null | undefined) => {
  preferredMic = id || null;
};
/** Audio inputs (labels appear once the microphone permission was given). */
export async function listMics(): Promise<{ id: string; label: string }[]> {
  try {
    const ds = await navigator.mediaDevices.enumerateDevices();
    return ds.filter((d) => d.kind === 'audioinput' && d.deviceId).map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
  } catch {
    return [];
  }
}
/** Whether capture has opened successfully on this page load (used to split recognizer errors). */
export const captureOk = () => captureSucceeded;

export async function openCapture(
  constraints: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
): Promise<{ ok: true; stream: MediaStream } | { ok: false; error: AccessError }> {
  const env = await gatherEnv();
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: { stage: 'capture', code: env.secure ? 'unsupported' : 'insecure-context', raw: 'navigator.mediaDevices.getUserMedia is unavailable' } };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: preferredMic ? { ...constraints, deviceId: { ideal: preferredMic } } : constraints,
    });
    captureSucceeded = true;
    return { ok: true, stream };
  } catch (e) {
    return { ok: false, error: classifyCaptureError(e, env) };
  }
}

export const stopStream = (s: MediaStream | null | undefined) => s?.getTracks().forEach((t) => t.stop());

export class BrowserMicAccess implements MicAccess {
  async request() {
    const r = await openCapture();
    if (!r.ok) return r;
    stopStream(r.stream); // release immediately; the recognizer owns capture while listening
    return { ok: true as const };
  }
}

export interface ProbeReading extends PitchFrame {
  peak: number;
}

/** Live capture probe for diagnostics: RMS level + YIN pitch. Call stop() to release the mic. */
export class MicProbe {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  trackLabel = '';
  sampleRate = 0;

  async start(onReading: (r: ProbeReading) => void): Promise<{ ok: true } | { ok: false; error: AccessError }> {
    const r = await openCapture();
    if (!r.ok) return r;
    this.stream = r.stream;
    this.trackLabel = r.stream.getAudioTracks()[0]?.label ?? '';
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;
    const src = this.ctx.createMediaStreamSource(r.stream);
    const an = this.ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
      onReading({ ...yin(buf, this.sampleRate), peak });
      this.raf = requestAnimationFrame(tick);
    };
    tick();
    return { ok: true };
  }

  stop() {
    cancelAnimationFrame(this.raf);
    stopStream(this.stream);
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
