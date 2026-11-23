// Active time (SPEC-WORKOUT W3): the clock runs while the player is doing something — from a prompt to the answer,
// playing, tapping — and stops after 15 seconds with no input ("paused"). The workout books this time, not the wall
// clock: a block left open on a screen while the player walks away does not fill up. Pure.

/** The clock stops after this long with no input (W3). */
export const IDLE_MS = 15_000;

/**
 * Active milliseconds between `from` and `to`, given the times of the player's inputs: every gap between two
 * consecutive moments (the start, each input, the end) counts up to `idle`. With no input at all only the first
 * `idle` ms count (the player looked at the screen and left).
 */
export function activeSpan(inputs: readonly number[], from: number, to: number, idle = IDLE_MS): number {
  if (to <= from) return 0;
  const pts = inputs.filter((t) => t > from && t < to).sort((a, b) => a - b);
  let last = from;
  let sum = 0;
  for (const t of [...pts, to]) {
    sum += Math.min(idle, t - last);
    last = t;
  }
  return sum;
}

/** A small store of input times (newest last), at most one per `minGap` ms and at most `max` kept. */
export class InputLog {
  private ts: number[] = [];
  constructor(
    private readonly max = 4000,
    private readonly minGap = 200,
  ) {}
  note(t: number): void {
    const last = this.ts[this.ts.length - 1];
    if (last !== undefined && t - last < this.minGap) return;
    this.ts.push(t);
    if (this.ts.length > this.max) this.ts.splice(0, this.ts.length - this.max);
  }
  /** Active ms since `from` (to `now`) by the W3 rule. */
  activeSince(from: number, now: number, idle = IDLE_MS): number {
    return activeSpan(this.ts, from, now, idle);
  }
  /** The latest input time (null: none yet). */
  lastAt(): number | null {
    return this.ts.length ? this.ts[this.ts.length - 1] : null;
  }
}
