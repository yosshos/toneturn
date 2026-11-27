// The coach session's closing line (owner 2026-11-27: "I don't remember what it said at the end"): kept for a few
// minutes so a teacher's assignment sends it with its result, and the teacher (and calibration) can read it later.

type Line = { he: string; en: string };
let last: { line: Line; at: number } | null = null;
const KEEP_MS = 15 * 60_000;

export function setLastCoachLine(line: Line, now = Date.now()): void {
  last = { line, at: now };
}

/** The closing line of a session that ended in the last few minutes, once (it is cleared on read). */
export function takeLastCoachLine(now = Date.now()): Line | null {
  const l = last && now - last.at <= KEEP_MS ? last.line : null;
  last = null;
  return l;
}
