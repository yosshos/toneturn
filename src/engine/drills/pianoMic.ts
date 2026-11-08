// Piano by microphone, guided by the score (0.49, PLAN §2.1.4). Polyphonic transcription of an acoustic piano is hard;
// but in a drill or a piece we KNOW which notes should sound when. So for each expected chord / note we look for an
// attack near its time, then ask which of its pitch classes are present (chroma, as the guitar ring-check), and for a
// single note we read the pitch (YIN). The result is the list of played notes the usual take analysis expects.
// Limits: pitch classes, not octaves, inside a chord; very fast passages may merge attacks. Pure.

import type { Drill, PlayedNote } from './types';
import { expTimeMs } from './analyze';
import type { GFrame } from './guitarAnalyze';
import { meanChroma, ringCheck } from '../chroma';

const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;

interface Group {
  t: number;
  pitches: number[];
}

function groupsOf(drill: Drill, bpm: number): Group[] {
  const map = new Map<string, Group>();
  for (const n of drill.notes) {
    const key = n.chordId !== undefined ? `c${n.chordId}` : `n${n.beat}:${n.pitch}`;
    const g = map.get(key) ?? { t: expTimeMs(drill, n.beat, bpm), pitches: [] };
    g.pitches.push(n.pitch);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

/** The attack nearest to `t` inside [t − before, t + after]: the frame with the largest loudness rise. */
function attackNear(frames: GFrame[], t: number, before = 160, after = 260): number | null {
  let best: { t: number; rise: number } | null = null;
  for (let i = 2; i < frames.length; i++) {
    const f = frames[i];
    if (f.t < t - before || f.t > t + after) continue;
    const prev = Math.min(frames[i - 1].rms, frames[i - 2].rms);
    const rise = f.rms - prev;
    if (rise > 0.004 && f.rms > 0.012 && (!best || rise > best.rise)) best = { t: f.t, rise };
  }
  return best ? best.t : null;
}

export function scoreInformedNotes(drill: Drill, bpm: number, frames: GFrame[]): PlayedNote[] {
  const out: PlayedNote[] = [];
  const groups = groupsOf(drill, bpm);
  const beatMs = 60000 / bpm;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const nextT = groups[gi + 1]?.t ?? g.t + 2 * beatMs;
    const on = attackNear(frames, g.t, Math.min(160, beatMs * 0.4), Math.min(260, Math.max(80, (nextT - g.t) * 0.6)));
    if (on === null) continue; // nothing played → every note of the group is missed
    const end = Math.min(on + 260, on + Math.max(80, (nextT - g.t) * 0.8));
    const win = frames.filter((f) => f.t >= on + 30 && f.t <= end);
    if (g.pitches.length === 1) {
      // a single note: its pitch from YIN (median of the confident frames)
      const hz = win.filter((f) => f.hz && (f.conf ?? 0) > 0.8).map((f) => 69 + 12 * Math.log2(f.hz! / 440)).sort((a, b) => a - b);
      if (hz.length) out.push({ pitch: Math.round(hz[Math.floor(hz.length / 2)]), on, off: end, vel: 64 });
      else if (win.some((f) => f.chroma)) {
        const r = ringCheck(meanChroma(win.filter((f) => f.chroma).map((f) => f.chroma!)), [pc(g.pitches[0])]);
        if (!r.missing.length) out.push({ pitch: g.pitches[0], on, off: end, vel: 64 });
      }
      continue;
    }
    const chromas = win.filter((f) => f.chroma).map((f) => f.chroma!);
    if (!chromas.length) continue;
    const r = ringCheck(meanChroma(chromas), g.pitches.map(pc));
    // present pitch classes → the expected notes of that class; a strong foreign class → one wrong note
    for (const p of g.pitches) if (r.present.includes(pc(p))) out.push({ pitch: p, on, off: end, vel: 64 });
    for (const x of r.extra.slice(0, 1)) {
      const near = g.pitches[0];
      out.push({ pitch: near - pc(near) + x + (x < pc(near) ? 12 : 0), on, off: end, vel: 64 });
    }
  }
  return out.sort((a, b) => a.on - b.on || a.pitch - b.pitch);
}
