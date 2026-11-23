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

/** A take's own time is capped here (a take left running counts no further). */
export const TAKE_CAP_MS = 10 * 60_000;
/** The setup in the item between two takes is capped here (W3 already stops the clock after 15 s with no input). */
export const SETUP_CAP_MS = 2 * 60_000;
/**
 * SPEC-DAILY-WORKOUT §2: a take's measured active time — the take itself from the first expected note to the stop
 * (the count-in excluded), plus the setup time in the item since the previous take (active time only, the count-in
 * taken out). Without a measured start (an untimed take, the synthesized e2e take) the model's length stands in.
 */
export function takeActiveMs(o: { model: number; firstNoteAt: number | null; stopAt: number; setupMs?: number; countInMs?: number }): number {
  const play = o.firstNoteAt !== null && o.stopAt > o.firstNoteAt ? Math.min(TAKE_CAP_MS, o.stopAt - o.firstNoteAt) : o.model;
  const setup = Math.min(SETUP_CAP_MS, Math.max(0, (o.setupMs ?? 0) - (o.countInMs ?? 0)));
  return Math.max(1, Math.round(play + setup));
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
