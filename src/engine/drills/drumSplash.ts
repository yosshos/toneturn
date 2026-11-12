// The foot splash against the chick (DRUMS_NICHE_PLAN F13 L5, d-feet 5). Both are the hi-hat pedal; the kit sends one
// note for both, so timing alone can't tell them apart. What does:
//   1. a kit with its own splash note (Alesis 21, Yamaha DTX 83 / 85 — the preset's SPLASH_NOTES): that note is a
//      splash, any other pedal note a chick;
//   2. the pedal's CC4 stream: a splash is the pedal pressed and lifted at once, so the hats ring open — the openness
//      rises to ≥ 0.5 within 30–300 ms after the stroke; a chick keeps the pedal down (openness stays low).
// A kit that sends neither (no splash note, no CC4 during the take) is not measured: the take is judged on the pedal's
// timing only and the result says so. The microphone can't hear the pedal's openness reliably: d-feet 5 is MIDI only
// (mic: false), and the level page says so.
// Pure: the take's pedal hits (with their raw note) and CC4 samples (ms from beat 0, latency removed) against the goal.

import type { Drill, TakeMetrics } from './types';
import type { KitPreset, KitProfile } from '../drumKit';
import { expTimeMs } from './analyze';

/** Notes some kits send for the foot splash only (verify per model; the wizard's map wins for the voice). */
export const SPLASH_NOTES: Record<KitPreset, number[]> = { gm: [], roland: [], alesis: [21], yamaha: [83, 85] };
/** The window after the stroke in which a splash opens the hats (ms). */
export const SPLASH_FROM_MS = 30;
export const SPLASH_TO_MS = 300;
/** Openness that counts as the hats ringing open. */
export const SPLASH_OPEN = 0.5;
/** A played pedal hit belongs to a written one within this (ms). */
const MATCH_MS = 90;

export type PedalKind = 'splash' | 'chick';
export interface PedalHit {
  on: number;
  /** Raw MIDI note (DrumHitEvent.note). */
  note?: number;
}
export interface CcSample {
  at: number;
  /** Openness 0 (closed) … 1 (open), from the kit's CC4 range. */
  open: number;
}

/** Splash, chick, or null when the kit gives nothing to tell them apart. */
export function pedalKind(hit: PedalHit, cc: CcSample[], kit?: KitProfile | null): PedalKind | null {
  const notes = kit ? SPLASH_NOTES[kit.preset] ?? [] : [];
  if (notes.length && hit.note !== undefined) return notes.includes(hit.note) ? 'splash' : 'chick';
  if (!cc.length) return null;
  const win = cc.filter((c) => c.at >= hit.on + SPLASH_FROM_MS && c.at <= hit.on + SPLASH_TO_MS);
  // The kit sends CC4, but nothing moved after this stroke: the pedal stayed down — a chick.
  if (!win.length) return 'chick';
  return Math.max(...win.map((c) => c.open)) >= SPLASH_OPEN ? 'splash' : 'chick';
}

export interface SplashCheck {
  /** Written splashes played as a splash. */
  ok: number;
  of: number;
  /** False = the kit sent no splash note and no CC4: not measured. */
  measured: boolean;
}

/** Each written splash (goal.drum.splash.beats, else every hi-hat pedal note) against the nearest played pedal hit. */
export function splashCheck(drill: Drill, bpm: number, pedal: PedalHit[], cc: CcSample[], kit?: KitProfile | null): SplashCheck | null {
  const goal = drill.goal.drum?.splash;
  if (!goal) return null;
  const beats = goal.beats ?? drill.notes.filter((n) => n.voice === 'hhPedal').map((n) => n.beat);
  const of = beats.length;
  const kinds = pedal.map((h) => ({ h, k: pedalKind(h, cc, kit) }));
  if (!kinds.some((x) => x.k !== null)) return { ok: 0, of, measured: false };
  const used = new Set<number>();
  let ok = 0;
  for (const b of beats) {
    const t = expTimeMs(drill, b, bpm);
    let best = -1;
    kinds.forEach((x, i) => {
      if (used.has(i) || Math.abs(x.h.on - t) > MATCH_MS) return;
      if (best < 0 || Math.abs(x.h.on - t) < Math.abs(kinds[best].h.on - t)) best = i;
    });
    if (best < 0) continue;
    used.add(best);
    if (kinds[best].k === 'splash') ok++;
  }
  return { ok, of, measured: true };
}

/** The take with the splash measured: below the goal's share a clean take is "almost" (a little) or "not". */
export function withSplash(m: TakeMetrics, drill: Drill, bpm: number, pedal: PedalHit[], cc: CcSample[], kit?: KitProfile | null): TakeMetrics {
  const c = splashCheck(drill, bpm, pedal, cc, kit);
  if (!c || !m.drum) return m;
  const out: TakeMetrics = { ...m, drum: { ...m.drum, splash: c } };
  const share = drill.goal.drum?.splash?.share ?? 0.8;
  if (c.measured && c.of && c.ok / c.of < share && m.verdict !== 'not') {
    out.verdict = c.ok / c.of >= share - 0.2 && m.verdict === 'clean' ? 'almost' : 'not';
    out.why = { en: `Splash, not chick: lift the foot right after the stroke so the hats ring (${c.ok}/${c.of}).`, he: `ספלאש, לא צ׳יק: להרים את הרגל מיד אחרי המכה כדי שהמצילות יצלצלו (${c.ok}/${c.of}).` };
  }
  return out;
}
