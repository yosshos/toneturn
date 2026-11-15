// DEV ONLY (e2e and screenshots): a take without playing — when `window.__fakeTake` is set in a dev build, Play skips
// the audio and the real analysis runs on synthesized input built from the drill's own notes. Patterns: 'clean' (all
// on time), 'mixed' (some early, late, wrong and missed), 'weak' (most missed). Never active in production builds.

import type { Drill, DrillCalibration, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { analyzeTake, expTimeMs } from '../engine/drills/analyze';
import { analyzeGuitarTake } from '../engine/drills/guitarAnalyze';
import { analyzeDrumTake, type DrumTakeHit } from '../engine/drills/drumAnalyze';
import { isDrumDrill, isGuitarDrill } from '../engine/drills/events';

type Pattern = 'clean' | 'mixed' | 'weak';
export const fakeTakeOn = (): Pattern | null => (import.meta.env.DEV && typeof window !== 'undefined' ? ((window as unknown as { __fakeTake?: Pattern }).__fakeTake ?? null) : null);

export function fakeTake(drill: Drill, bpm: number, cal: DrillCalibration, pattern: Pattern): { m: TakeMetrics; played: PlayedNote[] } {
  const off = (i: number): { skip?: boolean; dPitch?: number; dt?: number } => {
    if (pattern === 'clean') return { dt: ((i * 7) % 5) - 2 };
    if (pattern === 'weak') return i % 5 === 0 ? { dt: 10 } : i % 5 === 1 ? { dPitch: 2 } : { skip: true };
    if (i % 9 === 5) return { skip: true };
    if (i % 7 === 3) return { dPitch: 2 };
    if (i % 5 === 1) return { dt: -95 };
    if (i % 6 === 2) return { dt: 110 };
    return { dt: ((i * 7) % 9) - 4 };
  };
  if (isDrumDrill(drill)) {
    const hits: DrumTakeHit[] = [];
    drill.notes.forEach((n, i) => {
      const o = off(i);
      if (o.skip || !n.voice) return;
      hits.push({ voice: o.dPitch ? (n.voice === 'snare' ? 'kick' : 'snare') : n.voice, on: expTimeMs(drill, n.beat, bpm) + (o.dt ?? 0), vel: n.accent ? 110 : n.ghost ? 30 : 80 });
    });
    return { m: analyzeDrumTake(drill, bpm, hits), played: hits.map((h) => ({ pitch: 38, on: h.on, off: null, vel: h.vel })) };
  }
  const played: PlayedNote[] = [];
  drill.notes.forEach((n, i) => {
    const o = off(i);
    if (o.skip) return;
    const on = expTimeMs(drill, n.beat, bpm) + (o.dt ?? 0);
    played.push({ pitch: n.pitch + (o.dPitch ?? 0), on, off: on + Math.max(80, (n.dur * 60000) / bpm - 40), vel: 70 + ((i * 13) % 30) });
  });
  return { m: isGuitarDrill(drill) ? analyzeGuitarTake(drill, bpm, played, cal) : analyzeTake(drill, bpm, played, cal), played };
}
