// Browser PitchCapture: raw mic (no echo cancellation / AGC, which smear sung pitch) → YIN frames.

import type { PitchCapture, SingCaptureResult, SingOptions } from '../game/adapters';
import type { SungFrame } from '../engine/sing';
import { rms, spectralCentroid, yin } from '../engine/yin';
import { openCapture, stopStream } from './mic';
import { chromaFromSpectrum } from '../engine/chroma';

export class BrowserPitchCapture implements PitchCapture {
  async sing({ signal, maxMs = 4500, silenceMs = 4000, endSilenceMs, hopMs, onCapturing, onFrame, record, ignoreFirstMs = 0, chroma, minHz, fftSize, centroid }: SingOptions): Promise<SingCaptureResult> {
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
    // Voice / guitar: 2048 samples. Bass (BASS_AUDIT A1): 4096, so a 31–41 Hz period fits the YIN lag range.
    an.fftSize = fftSize === 4096 || fftSize === 8192 ? fftSize : 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    // Loudness (onsets) stays on the newest 2048 samples, so a longer pitch window does not smear the attack.
    const recent = an.fftSize > 2048 ? buf.subarray(an.fftSize - 2048) : buf;
    // A second, long analyser for chroma: 8192 points ≈ 6 Hz bins, enough to part the low guitar notes.
    const anC = chroma || centroid ? ctx.createAnalyser() : null;
    if (anC) {
      anC.fftSize = 8192;
      anC.smoothingTimeConstant = 0;
      src.connect(anC);
    }
    const spec = anC ? new Float32Array(anC.frequencyBinCount) : null;
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
        const y = yin(buf, ctx.sampleRate, { minRms: 0.008, ...(minHz ? { minHz } : {}) });
        const quiet = t * 1000 < ignoreFirstMs;
        const f: SungFrame = { t, hz: quiet ? null : y.hz, confidence: quiet ? 0 : y.confidence, rms: recent === buf ? y.rms : rms(recent) };
        if (anC && spec && !quiet) {
          anC.getFloatFrequencyData(spec);
          if (chroma) f.chroma = chromaFromSpectrum(spec, ctx.sampleRate, anC.fftSize);
          if (centroid) f.centroid = spectralCentroid(spec, ctx.sampleRate, anC.fftSize) ?? undefined;
        }
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
