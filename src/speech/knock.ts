// Knock detection on the microphone: energy onsets with an adaptive noise floor.
import { latencyHintOf } from '../audio/quality';

import type { KnockInput } from '../game/adapters';
import { openCapture, stopStream } from './mic';

export class BrowserKnockInput implements KnockInput {
  async listen({ signal, onKnock, onReady }: Parameters<KnockInput['listen']>[0]) {
    // No echo cancellation / AGC: they suppress short transients.
    const r = await openCapture({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
    if (!r.ok) return r;
    const ctx = new AudioContext({ latencyHint: latencyHintOf('auto') });
    const src = ctx.createMediaStreamSource(r.stream);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 150; // ignore rumble / voice fundamentals
    const an = ctx.createAnalyser();
    an.fftSize = 256; // ~5 ms at 48 kHz
    src.connect(hp).connect(an);
    const buf = new Float32Array(an.fftSize);
    const frameMs = (an.fftSize / ctx.sampleRate) * 1000;
    let floor = 0.01;
    let last = -1e9;
    // A spoken syllable ("dum") holds its level for a while: one onset per rise, re-armed only once the level falls
    // back (the closure of the next consonant), so a long vowel never counts twice. Knocks decay at once.
    let armed = true;
    let runMax = 0;
    onReady?.();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (signal.aborted) return;
      an.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
      const now = performance.now();
      const thr = Math.max(0.08, floor * 5);
      if (!armed) {
        runMax = Math.max(runMax, peak);
        if (peak < Math.max(thr * 0.5, runMax * 0.35)) armed = true;
      }
      if (armed && peak > thr && now - last > 110) {
        last = now;
        armed = false;
        runMax = peak;
        onKnock(now - frameMs / 2, peak);
      }
      floor = floor * 0.98 + Math.min(peak, 0.05) * 0.02;
      timer = setTimeout(tick, 4);
    };
    timer = setTimeout(tick, 4);
    await new Promise<void>((res) => (signal.aborted ? res() : signal.addEventListener('abort', () => res(), { once: true })));
    clearTimeout(timer);
    stopStream(r.stream);
    void ctx.close();
    return { ok: true as const };
  }
}
