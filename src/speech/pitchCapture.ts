// Browser PitchCapture: raw mic (no echo cancellation / AGC, which smear sung pitch) → YIN frames.

import type { PitchCapture, SingCaptureResult, SingOptions } from '../game/adapters';
import type { SungFrame } from '../engine/sing';
import { yin } from '../engine/yin';
import { openCapture, stopStream } from './mic';

export class BrowserPitchCapture implements PitchCapture {
  async sing({ signal, maxMs = 4500, silenceMs = 4000, onCapturing, onFrame }: SingOptions): Promise<SingCaptureResult> {
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
    const t0 = performance.now();
    onCapturing?.();

    return new Promise<SingCaptureResult>((resolve) => {
      let firstVoiced = -1;
      let lastVoiced = -1;
      const finish = (res: SingCaptureResult) => {
        clearInterval(timer);
        signal.removeEventListener('abort', onAbort);
        stopStream(r.stream);
        void ctx.close();
        resolve(res);
      };
      const onAbort = () => finish({ kind: 'aborted' });
      signal.addEventListener('abort', onAbort, { once: true });
      const timer = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        const t = (performance.now() - t0) / 1000;
        const y = yin(buf, ctx.sampleRate, { minRms: 0.008 });
        const f: SungFrame = { t, hz: y.hz, confidence: y.confidence, rms: y.rms };
        frames.push(f);
        onFrame?.(f);
        const voiced = !!y.hz && y.confidence > 0.8;
        if (voiced) {
          if (firstVoiced < 0) firstVoiced = t;
          lastVoiced = t;
        }
        // Done: ~1.6 s of singing, then a short pause (or the hard cap).
        if (firstVoiced >= 0 && lastVoiced - firstVoiced > 1.6 && t - lastVoiced > 0.25) return finish({ kind: 'frames', frames });
        if (firstVoiced >= 0 && t - firstVoiced > 2.6) return finish({ kind: 'frames', frames });
        if (firstVoiced < 0 && t * 1000 > silenceMs) return finish({ kind: 'silence' });
        if (t * 1000 > maxMs) return finish(firstVoiced >= 0 ? { kind: 'frames', frames } : { kind: 'silence' });
      }, 33);
    });
  }
}
