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

/**
 * @param threshold absolute YIN threshold (0.1–0.2 typical)
 * @param minRms silence gate
 */
export function yin(
  buf: Float32Array,
  sampleRate: number,
  { threshold = 0.15, minHz = 70, maxHz = 1100, minRms = 0.01 } = {},
): PitchFrame {
  const level = rms(buf);
  if (level < minRms) return { hz: null, confidence: 0, rms: level };
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
