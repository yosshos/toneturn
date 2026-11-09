// The concert grand (0.54, owner 2026-11-09: "the highest level"): Salamander Grand V3's 16 velocity layers, its
// key-release noises, its release string resonances and pedal noises — mapped as the library's own SFZ maps them.
// Pure helpers here (layer choice, loudness between layers, damper times, the loading order); the engine in piano.ts
// plays them.

export interface GrandLayer {
  id: string;
  /** Lowest MIDI velocity (1–127) of this layer. */
  lovel: number;
  /** The layer's measured loudness (dB, RMS of its first 250 ms, averaged over its notes). */
  db: number;
}

/** MIDI velocity (1–127) of an engine velocity (0–1). */
export const vel127 = (v: number) => Math.max(1, Math.min(127, Math.round(v * 127)));

/** The layer a velocity asks for (index into the layers sorted by lovel). */
export function layerFor(layers: GrandLayer[], v: number): number {
  let i = 0;
  for (let k = 0; k < layers.length; k++) if (layers[k].lovel <= v) i = k;
  return i;
}

/** The nearest loaded layer to `want` (ties go to the softer one); -1 when none is loaded. */
export function nearestLoaded(n: number, want: number, loaded: (i: number) => boolean): number {
  for (let d = 0; d < n; d++) {
    if (want - d >= 0 && loaded(want - d)) return want - d;
    if (want + d < n && loaded(want + d)) return want + d;
  }
  return -1;
}

/**
 * Loudness (dB) a velocity should have: a line through the layers' centres, so loudness rises smoothly inside a
 * layer and stays right when a neighbouring layer stands in for one still loading.
 */
export function targetDb(layers: GrandLayer[], v: number): number {
  const pts = layers.map((l, i) => [(l.lovel + (i + 1 < layers.length ? layers[i + 1].lovel - 1 : 127)) / 2, l.db] as const);
  if (v <= pts[0][0]) {
    // below the softest centre: keep falling (≈ 0.25 dB per velocity step)
    return pts[0][1] - (pts[0][0] - v) * 0.25;
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (v <= x1) return y0 + ((v - x0) * (y1 - y0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/** Keys from F♯6 up have no dampers on a grand: they ring on after the key is let go. */
export const NO_DAMPER_FROM = 90;

/** How fast the damper stops a string (time constant, s): the long low strings take longer. */
export function damperTau(midi: number): number {
  if (midi >= NO_DAMPER_FROM) return Infinity;
  if (midi < 36) return 0.2;
  if (midi < 52) return 0.15;
  if (midi < 70) return 0.11;
  return 0.085;
}

/**
 * The release resonance level (gain) after a key is let go: SFZ "harmL" (vel ≥ 45) / "harmS" at their volume,
 * velocity-tracked, falling `rtDecay` dB for every second the key was held (the string has already given its energy).
 */
export function releaseResGain(db: number, rtDecay: number, held: number, v: number, veltrack = 0.92): number {
  const vt = 1 - veltrack + (veltrack * v) / 127;
  return Math.pow(10, (db - rtDecay * Math.max(0, held)) / 20) * vt;
}

/** The key-release (damper) noise level: SFZ group "rel", volume −37 dB, amp_veltrack 82 %. */
export function releaseNoiseGain(v: number): number {
  return Math.pow(10, -37 / 20) * (0.18 + (0.82 * v) / 127);
}

/** The order the layers load in: the everyday ones first; a light device stops after eight. */
export function loadOrder(n: number, light: boolean): number[] {
  // indices of a 16-layer set
  const pref = [10, 7, 12, 4, 14, 8, 5, 2, 11, 9, 13, 15, 6, 3, 1, 0];
  const all = pref.filter((i) => i < n);
  return light ? all.slice(0, 8) : all;
}

/** A light device: data saver, a slow connection or little memory. */
export function lightDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return !!c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType ?? '') || (mem !== undefined && mem <= 2);
}
