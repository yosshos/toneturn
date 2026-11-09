// YIN monophonic pitch detector over a PCM frame. Pure; runs in tests on synthetic fixtures.

export interface PitchFrame {
  hz: number | null; // null when unvoiced / low confidence
  confidence: number; // 1 - aperiodicity, 0..1
  rms: number;
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/** Low-pass (box average) and keep every `factor`-th sample: a cheap decimator for low (bass) pitch tracking. */
export function downsample(buf: Float32Array, factor: number): Float32Array {
  const f = Math.max(1, Math.floor(factor));
  if (f === 1) return buf;
  const n = Math.floor(buf.length / f);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < f; k++) s += buf[i * f + k];
    out[i] = s / f;
  }
  return out;
}

/**
 * Spectral centroid (Hz) of an analyser spectrum in dB (getFloatFrequencyData), 40 Hz–8 kHz, magnitude-weighted.
 * Null when the frame is silent. Brighter (bridge, slap) → higher.
 */
export function spectralCentroid(specDb: Float32Array, sampleRate: number, fftSize: number): number | null {
  const bin = sampleRate / fftSize;
  let num = 0;
  let den = 0;
  const lo = Math.max(1, Math.floor(40 / bin));
  const hi = Math.min(specDb.length - 1, Math.ceil(8000 / bin));
  for (let k = lo; k <= hi; k++) {
    const v = specDb[k];
    if (!Number.isFinite(v)) continue;
    const mag = 10 ** (v / 20);
    num += mag * k * bin;
    den += mag;
  }
  return den > 1e-9 ? num / den : null;
}

/** Bass capture settings (BASS_AUDIT A1): floor 28 Hz (22 Hz on a 5- / 6-string), a 4096-sample window. */
export function bassPitchOpts(lowB = false): { minHz: number; fftSize: number } {
  return { minHz: lowB ? 22 : 28, fftSize: 4096 };
}

/**
 * @param threshold absolute YIN threshold (0.1–0.2 typical)
 * @param minRms silence gate
 * @param minHz lowest pitch searched (default 70 Hz: voice / guitar). Below 70 Hz (bass) the frame is decimated
 *   first (`downsample`, default 4 at 44.1 / 48 kHz) so the long lags stay cheap enough for a phone.
 */
export function yin(
  buf: Float32Array,
  sampleRate: number,
  { threshold = 0.15, minHz = 70, maxHz = 1100, minRms = 0.01, downsample: ds }: { threshold?: number; minHz?: number; maxHz?: number; minRms?: number; downsample?: number } = {},
): PitchFrame {
  const level = rms(buf);
  if (level < minRms) return { hz: null, confidence: 0, rms: level };
  const factor = ds ?? (minHz < 70 && sampleRate >= 32000 ? 4 : 1);
  if (factor > 1) {
    const r = yin(downsample(buf, factor), sampleRate / factor, { threshold, minHz, maxHz: Math.min(maxHz, sampleRate / factor / 4), minRms: 0, downsample: 1 });
    return { ...r, rms: level };
  }
  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(buf.length / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const W = buf.length - maxTau;
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  // Cumulative mean normalized difference
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }
  let tauEst = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst < 0) return { hz: null, confidence: 0, rms: level };
  // Parabolic interpolation
  let better = tauEst;
  if (tauEst > 1 && tauEst < maxTau) {
    const a = cmnd[tauEst - 1], b = cmnd[tauEst], c = cmnd[tauEst + 1];
    const denom = 2 * (2 * b - a - c);
    if (denom !== 0) better = tauEst + (c - a) / denom;
  }
  return { hz: sampleRate / better, confidence: Math.max(0, 1 - cmnd[tauEst]), rms: level };
}
