// The staff playhead (owner 2026-11-13): it glides through each note in the note's own time and stands on the notehead
// when the note is due. Pure.

/**
 * The now-cue on a staff / tab line (owner 2026-11-13: "it moves at a varying pace and spacing, like other programs").
 * `now` is fractional: i + f = a share f of the way from item i to the next one (the last item heads for the line's
 * end), so the line glides through each note in the note's own time and stands on the notehead when the note is due.
 * `xs`: each drawn item's notehead centre as a share of the width, then the line's end.
 */
export function nowX(xs: number[], now: number): number | null {
  if (!(now >= 0) || xs.length < 2) return null;
  const i = Math.min(Math.floor(now), xs.length - 2);
  const f = Math.min(1, Math.max(0, now - i));
  const a = xs[i];
  const b = xs[i + 1] ?? a;
  return a + (b - a) * f;
}

/**
 * The fractional now-cue position from real start times: `ats` = each drawn item's start, `end` = the line's end (same
 * unit as `cur`). −1 before the first item. A note lights a hair early (20 ms-ish) so it is on the head as it sounds.
 */
export function glidePos(ats: number[], end: number, cur: number): number {
  let k = -1;
  for (let i = 0; i < ats.length; i++) if (ats[i] <= cur + 0.02) k = i;
  if (k < 0) return -1;
  const a = ats[k];
  const b = ats[k + 1] ?? end;
  return b - a > 1e-6 ? k + Math.min(1, Math.max(0, (cur - a) / (b - a))) : k;
}
