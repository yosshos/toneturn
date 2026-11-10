// Synthetic human piano takes for the PIANO_AUDIT tests (shared by pianoAudit.test.ts and pianoEar.test.ts).
import { expTimeMs, npsOf } from '../src/engine/drills/analyze';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

/** Seeded normal noise. */
export function noise(seed: number): () => number {
  let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0; // spread nearby seeds (an LCG from 5, 6, 7 starts almost alike)
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
const BAND: Record<string, number> = { pp: 32, p: 49, mf: 80, f: 98, ff: 113 };

/**
 * A human take on MIDI: every key pressed once (a unison shared by the hands is one press), timing jitter `sd` ms per
 * onset (chord notes ~1.5 ms apart), the RH 6 ms ahead of the LH, velocities in the goal's band with a little spread,
 * releases as the articulation asks. `shift` plays every note that many semitones away (an octave up: 12).
 */
export function humanTake(d: Drill, bpm: number, sd: number, seed = 7, shift = 0): PlayedNote[] {
  const g = noise(seed);
  const beatMs = 60000 / bpm;
  const dyn = d.goal.dynamics;
  const base = dyn?.startsWith('even-') ? BAND[dyn.slice(5)] : 72;
  const seen = new Set<string>();
  const onAt = new Map<string, number>();
  const out: PlayedNote[] = [];
  const top = Math.max(...d.notes.map((n) => n.pitch));
  const ordered = d.notes.slice().sort((a, b) => a.beat - b.beat);
  ordered.forEach((n) => {
    const k = `${n.pitch}:${n.beat}`;
    if (seen.has(k)) return;
    seen.add(k);
    const slot = `${n.hand}:${n.beat}`;
    if (!onAt.has(slot)) onAt.set(slot, expTimeMs(d, n.beat, bpm) + g() * sd + (n.hand === 'L' ? 6 : 0));
    const on = onAt.get(slot)! + (n.chordId !== undefined ? g() * 1.5 : 0);
    let vel = base + g() * 3;
    if (n.accent) vel += dyn === 'voicing' ? 20 : 26;
    if (dyn === 'cresc') vel = 45 + 55 * ((n.pitch - (top - 24)) / 24) + g() * 2;
    const next = ordered.find((o) => o.hand === n.hand && o.beat > n.beat + 1e-6);
    const gap = next ? (next.beat - n.beat) * beatMs : n.dur * beatMs;
    const art = d.goal.articulation;
    const off = art === 'legato' ? on + gap + 15 : art === 'staccato' ? on + 0.3 * gap : art === 'portato' ? on + 0.7 * gap : on + 0.9 * n.dur * beatMs;
    out.push({ pitch: n.pitch + shift, on, off, vel: Math.max(1, Math.min(127, Math.round(vel))) });
  });
  return out.sort((a, b) => a.on - b.on);
}

/**
 * A steady pianist: onset jitter ≈ 1.8 % of the note gap (IOI CV ≈ 2.5 %, "very even" in the research table), at least
 * 5 ms (fast passages: ≈ 7 ms of IOI spread, near the just-noticeable shift) and at most 9 ms.
 */
export const steadySd = (d: Drill, bpm: number): number => Math.max(5, Math.min(9, 0.018 * (1000 / npsOf(d, bpm))));
