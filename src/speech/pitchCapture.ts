// Browser PitchCapture: raw mic (no echo cancellation / AGC, which smear sung pitch) → YIN frames.

import type { PitchCapture, SingCaptureResult, SingOptions } from '../game/adapters';
import type { SungFrame } from '../engine/sing';
import { yin } from '../engine/yin';
import { openCapture, stopStream } from './mic';

export class BrowserPitchCapture implements PitchCapture {
  async sing({ signal, maxMs = 4500, silenceMs = 4000, endSilenceMs, hopMs, onCapturing, onFrame, record, ignoreFirstMs = 0 }: SingOptions): Promise<SingCaptureResult> {
    if (signal.aborted) return { kind: 'aborted' };
    const r = await openCapture({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
    if (!r.ok) return { kind: 'error', error: r.error };
    if (signal.aborted) {
      stopStream(r.stream);
      return { kind: 'aborted' };
    }
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(r.stream);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const frames: SungFrame[] = [];
    const chunks: Blob[] = [];
    let rec: MediaRecorder | null = null;
    if (record && typeof MediaRecorder !== 'undefined') {
      try {
        rec = new MediaRecorder(r.stream);
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.start();
      } catch {
        rec = null;
      }
    }
    const t0 = performance.now();
    onCapturing?.();

    return new Promise<SingCaptureResult>((resolve) => {
      let firstVoiced = -1;
      let lastVoiced = -1;
      const finish = (res: SingCaptureResult) => {
        clearInterval(timer);
        signal.removeEventListener('abort', onAbort);
        const done = () => {
          stopStream(r.stream);
          void ctx.close();
          resolve(res.kind === 'frames' && chunks.length ? { ...res, audio: new Blob(chunks, { type: chunks[0].type }) } : res);
        };
        if (rec && rec.state !== 'inactive') {
          rec.onstop = done;
          rec.stop();
        } else done();
      };
      const onAbort = () => finish({ kind: 'aborted' });
      signal.addEventListener('abort', onAbort, { once: true });
      const timer = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        const t = (performance.now() - t0) / 1000;
        const y = yin(buf, ctx.sampleRate, { minRms: 0.008 });
        const quiet = t * 1000 < ignoreFirstMs;
        const f: SungFrame = { t, hz: quiet ? null : y.hz, confidence: quiet ? 0 : y.confidence, rms: y.rms };
        frames.push(f);
        onFrame?.(f);
        const voiced = !!f.hz && f.confidence > 0.8;
        if (voiced) {
          if (firstVoiced < 0) firstVoiced = t;
          lastVoiced = t;
        }
        if (endSilenceMs !== undefined) {
          // Sequence: keep listening until the singer stops.
          if (firstVoiced >= 0 && (t - lastVoiced) * 1000 > endSilenceMs) return finish({ kind: 'frames', frames });
        } else {
          // Single note: ~1.6 s of singing, then a short pause (or 2.6 s total).
          if (firstVoiced >= 0 && lastVoiced - firstVoiced > 1.6 && t - lastVoiced > 0.25) return finish({ kind: 'frames', frames });
          if (firstVoiced >= 0 && t - firstVoiced > 2.6) return finish({ kind: 'frames', frames });
        }
        if (firstVoiced < 0 && t * 1000 > silenceMs) return finish({ kind: 'silence' });
        if (t * 1000 > maxMs) return finish(firstVoiced >= 0 ? { kind: 'frames', frames } : { kind: 'silence' });
      }, hopMs ?? 33);
    });
  }
}
