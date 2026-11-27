// Seeded randomness for the measurement simulation harness (SPEC-HOLISTIC-2 §9.1). Pure, no browser APIs.

export type Rng = () => number;

/** mulberry32 (same generator as src/engine/clicks.ts): a uniform [0, 1) stream from a 32-bit seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw (Box–Muller). */
export function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A uniform integer in [0, n). */
export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);

/** A child seed, so each learner / experiment has its own independent stream. */
export const childSeed = (seed: number, i: number): number => (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(i + 1, 0xc2b2ae35)) >>> 0;
