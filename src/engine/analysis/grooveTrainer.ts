// Groove trainer (0.50): the pure parts — the fading-click plan, judging a stretch of taps against the grid, a pocket
// score against a chosen offset, and the swing ratio of tapped eighths.

/** Fading click: bars with the click (on) and without (off), growing until the player drifts. Round k: 2 on, k off. */
export function fadePlan(rounds: number): boolean[] {
  const out: boolean[] = [true, true];
  for (let k = 1; k <= rounds; k++) out.push(...Array(k).fill(false), true, true);
  return out;
}

/** Match taps (ms, heard-clock) to a grid of beats starting at t0; returns per-beat signed offsets (null = none). */
export function matchTaps(taps: number[], t0: number, beatMs: number, beats: number, window = 0.4): (number | null)[] {
  const used = new Set<number>();
  const out: (number | null)[] = [];
  for (let b = 0; b < beats; b++) {
    const at = t0 + b * beatMs;
    let best: { i: number; d: number } | null = null;
    taps.forEach((t, i) => {
      if (used.has(i)) return;
      const d = t - at;
      if (Math.abs(d) <= beatMs * window && (!best || Math.abs(d) < Math.abs(best.d))) best = { i, d };
    });
    if (best) {
      used.add((best as { i: number }).i);
      out.push(Math.round((best as { d: number }).d));
    } else out.push(null);
  }
  return out;
}

/** A silent stretch is held when most beats were tapped and the average error and the last error stay small. */
export function heldSilent(offs: (number | null)[], beatMs: number): { held: boolean; meanAbs: number; last: number | null } {
  const hit = offs.filter((o): o is number => o !== null);
  const meanAbs = hit.length ? hit.reduce((a, b) => a + Math.abs(b), 0) / hit.length : Infinity;
  const last = [...offs].reverse().find((o) => o !== null) ?? null;
  const tol = Math.max(45, Math.min(90, beatMs * 0.12));
  return { held: hit.length >= offs.length * 0.75 && meanAbs <= tol && last !== null && Math.abs(last) <= tol * 1.4, meanAbs: Math.round(meanAbs), last };
}

/** Pocket: share of taps within ±tol ms of the target offset (+ = behind the beat). */
export function pocketScore(offs: (number | null)[], target: number, tol = 12): { share: number; mean: number } {
  const hit = offs.filter((o): o is number => o !== null);
  if (!hit.length) return { share: 0, mean: 0 };
  return { share: hit.filter((o) => Math.abs(o - target) <= tol).length / hit.length, mean: Math.round(hit.reduce((a, b) => a + b, 0) / hit.length) };
}

/** Swing ratio of tapped eighths: the share of the beat taken by the long (first) eighth, from taps paired per beat. */
export function swingOf(taps: number[], t0: number, beatMs: number): number | null {
  const shares: number[] = [];
  for (const t of taps) {
    const pos = (t - t0) / beatMs;
    const f = pos - Math.floor(pos);
    // the off-beat tap lands in the middle part of the beat
    if (f > 0.35 && f < 0.85) shares.push(f);
  }
  if (shares.length < 3) return null;
  shares.sort((a, b) => a - b);
  return Math.round(shares[Math.floor(shares.length / 2)] * 100) / 100;
}
