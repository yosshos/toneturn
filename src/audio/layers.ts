// Multi-sampled instruments other than the grand (0.55): the jazz drum kit (4 dynamics × alternating strikes per
// sound), the pizzicato double bass (3 dynamics × 4 strikes) and the Wurlitzer (4 dynamics). Pure helpers: which
// layer a velocity plays, how loud, and which alternate strike (never the same one twice in a row).

/** Layer index for a velocity (0–1) among `n` layers whose upper edges are evenly spread. */
export function layerOf(v: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.floor(Math.max(0, Math.min(0.9999, v)) * n)));
}

/**
 * Gain that makes a velocity sound at the right level, given each layer's measured loudness (dB): a line between
 * the layers' centres; below the softest centre it keeps falling. Returns the linear gain for layer `i`.
 */
export function layerGain(v: number, dbs: number[], i: number, floorSlope = 24): number {
  const n = dbs.length;
  const centre = (k: number) => (k + 0.5) / n;
  const x = Math.max(0, Math.min(1, v));
  let target: number;
  if (x <= centre(0)) target = dbs[0] - (centre(0) - x) * floorSlope;
  else if (x >= centre(n - 1)) target = dbs[n - 1] + (x - centre(n - 1)) * 6;
  else {
    const k = Math.floor(x * n - 0.5);
    const t = (x - centre(k)) / (centre(k + 1) - centre(k));
    target = dbs[k] + t * (dbs[k + 1] - dbs[k]);
  }
  return Math.pow(10, (target - dbs[i]) / 20);
}

/** A round-robin picker per key: random, but never the strike just played. */
export class RoundRobin {
  private last = new Map<string, number>();
  constructor(private rnd: () => number = Math.random) {}
  pick(key: string, n: number): number {
    if (n <= 1) return 0;
    const prev = this.last.get(key);
    let i = Math.floor(this.rnd() * (prev === undefined ? n : n - 1));
    if (prev !== undefined && i >= prev) i++;
    this.last.set(key, i);
    return i;
  }
}

/** The Wurlitzer's dynamics (its SFZ: velocity 1–37 pp, 38–65 mp, 66–89 f, 90–127 ff). */
export const WURLI_LAYERS = [
  { id: 'wurli-pp', lovel: 1 },
  { id: 'wurli-mp', lovel: 38 },
  { id: 'wurli-f', lovel: 66 },
  { id: 'wurli-ff', lovel: 90 },
];
/** The Wurlitzer's samples are each level-matched, so the touch curve is ours: about 24 dB from softest to loudest. */
export const wurliGain = (v127: number) => Math.pow(10, (-24 * (1 - Math.pow(v127 / 127, 0.8))) / 20);
