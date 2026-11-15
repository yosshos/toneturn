// Run Catcher (AUDIT-GAMES §4.2 #8, Voice): a vocal run is played, then sung back on one vowel in time — count-in,
// click and a now-cue on each note. Each clean catch (≥ 75 % of the notes within the 60 ¢ pass band) raises the
// tempo 10 %; a take under half costs a life (three). Eight takes. The runs are the voice course's agility shapes
// (voiceFamilies.ts RUN_LEVELS, AUDIT-5 V-11) plus two bebop lines from the 6th-diminished and bebop dominant scales
// (chord tones on the beats) and the semitone elevator (chromatic, AUDIT-GAMES "merged": a tier of Run Catcher).
//   Level 1 (pp)  3-note turns, from 60 %        · 2 (p)   5-note runs and turns, from 70 %
//   Level 3 (mp)  pentatonic and blues runs, 80 % · 4 (mf)  R&B melisma and gospel licks, 80 %
//   Level 5 (f)   bebop lines, 90 %               · 6 (ff)  everything plus the semitone elevator, from 100 % to 130 %
// Full tempo (100 %) = sixteenths at ♩80 (voiceFamilies RUN_FULL_BPM). Each take's tonic is seeded from all 12 and
// placed so the run sits in the singer's range. Pure: the runs, the timing, the pitch grader, the run state.

import { pickR, rng } from './topicKit';
import { caseSeed, mod12 } from './caseRun';
import type { DynName } from './courseSocial';

type Bi = { en: string; he: string };
export const RUN_FULL_BPM = 80;
export const RC_TAKES = 8;
export const RC_LIVES = 3;
/** A note is caught when its median pitch is within this many cents (octave-folded). */
export const RC_CENTS = 60;
export const RC_CLEAN = 75;
export const RC_MISS = 50;
export const RC_MAX_PCT = 130;

export interface RunShape {
  id: string;
  steps: number[];
  name: Bi;
}
const S = (id: string, steps: number[], en: string, he: string): RunShape => ({ id, steps, name: { en, he } });
export const RC_SHAPES: Record<number, RunShape[]> = {
  1: [S('turn-up', [0, 2, 0], 'Turn up', 'סיבוב למעלה'), S('turn-down', [0, -1, 0], 'Turn down', 'סיבוב למטה'), S('fall-3', [4, 2, 0], '3 to 1', '3 אל 1'), S('rise-3', [0, 2, 4], '1 to 3', '1 אל 3'), S('fall-5', [7, 5, 4], '5 to 3', '5 אל 3')],
  2: [S('up5', [0, 2, 4, 5, 7], '5-note run up', 'ראן של 5 למעלה'), S('down5', [7, 5, 4, 2, 0], '5-note run down', 'ראן של 5 למטה'), S('turn5', [0, 2, 0, -1, 0], 'Full turn', 'סיבוב מלא')],
  3: [S('minpenta', [12, 10, 7, 5, 3, 0], 'Minor pentatonic down', 'פנטטוני מינורי למטה'), S('majpenta', [0, 2, 4, 7, 9, 7, 4, 2, 0], 'Major pentatonic', 'פנטטוני מז׳ורי'), S('blues-down', [12, 10, 7, 6, 5, 3, 0], 'Blues run down', 'ראן בלוז למטה'), S('blues-up', [0, 3, 5, 6, 7, 10, 12], 'Blues run up', 'ראן בלוז למעלה')],
  4: [S('rnb', [12, 10, 7, 5, 3, 5, 3, 0], 'R&B lick', 'ליק R&B'), S('gospel', [10, 12, 10, 7, 6, 5, 3, 0], 'Gospel blues', 'בלוז גוספל'), S('turn-run', [7, 9, 7, 5, 7, 5, 4, 2, 0], 'Turn into a run', 'סיבוב אל ראן')],
  // 6th-dim (C B A A♭ G F E D, C6 tones on the beats) and the bebop dominant (C B B♭ A G F E D, C7 tones on the beats)
  5: [S('sixdim', [12, 11, 9, 8, 7, 5, 4, 2, 0], '6th-dim line', 'קו 6־דים'), S('bebopdom', [12, 11, 10, 9, 7, 5, 4, 2, 0], 'Bebop dominant line', 'קו ביבופ דומיננטי')],
  6: [S('semitone', [0, 1, 2, 3, 4, 3, 2, 1, 0], 'Semitone elevator', 'מעלית חצאי טונים')],
};
/** The shapes a level draws from (ff: everything from level 3 up). */
export const shapesFor = (level: number): RunShape[] => (level >= 6 ? [...RC_SHAPES[3], ...RC_SHAPES[4], ...RC_SHAPES[5], ...RC_SHAPES[6]] : RC_SHAPES[Math.max(1, level)]);
export const START_PCT = [0, 60, 70, 80, 80, 90, 100];
export const tierLevelRC = (t: DynName) => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

export interface RunItem {
  shape: RunShape;
  /** Absolute MIDI notes to sing. */
  notes: number[];
  tonic: number;
}

/** Take `i`'s run: a seeded shape and tonic (all 12), placed inside the singer's range (low–high MIDI). */
export function runItem(seed: number, i: number, level: number, low = 55, high = 67): RunItem {
  const r = rng(caseSeed(seed, i));
  r();
  const shape = pickR(r, shapesFor(level));
  const lo = Math.min(...shape.steps);
  const hi = Math.max(...shape.steps);
  const pc = mod12(Math.floor(r() * 12) + 7 * i);
  // the lowest tonic of that pitch class whose run fits; else the one nearest the middle of the range
  let t = low - lo + mod12(pc - (low - lo));
  if (t + hi > high) {
    const mid = Math.round((low + high) / 2 - (lo + hi) / 2);
    t = mid + ((mod12(pc - mid) + 6) % 12) - 6;
  }
  return { shape, notes: shape.steps.map((s) => t + s), tonic: t };
}

/** Quarter-note bpm at `pct` % of full tempo (sixteenths: four notes a beat). */
export const rcBpm = (pct: number) => Math.round((RUN_FULL_BPM * pct) / 100);
/** Seconds per note at `pct`. */
export const rcNoteSec = (pct: number) => 60 / rcBpm(pct) / 4;
/** Beats the run takes (rounded up to whole beats, at least one). */
export const rcBeats = (n: number) => Math.max(1, Math.ceil(n / 4));

/** One pitch frame of the take: ms after the run's first beat (latency removed), MIDI pitch or null (unvoiced). */
export interface RcFrame {
  ms: number;
  midi: number | null;
}
/** Octave-folded cents of a sung pitch from a target (a run may sit an octave from the piano). */
export const foldCents = (midi: number, target: number) => {
  const d = midi - target;
  return Math.round((d - 12 * Math.round(d / 12)) * 100);
};
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : NaN;
};

/**
 * Grade a take: for each note, the voiced frames in the middle of its slot (shifted by the best common offset in
 * −80…+220 ms — singers come in a little late), the median pitch against the target. Returns per-note marks and the %.
 */
export function gradeRun(notes: number[], frames: RcFrame[], noteMs: number, cents = RC_CENTS): { marks: ('ok' | 'off' | 'miss')[]; pct: number; offset: number } {
  let best: { marks: ('ok' | 'off' | 'miss')[]; got: number; offset: number } = { marks: notes.map(() => 'miss'), got: -1, offset: 0 };
  for (let off = -80; off <= 220; off += 20) {
    const marks = notes.map((t, k) => {
      const a = k * noteMs + off + noteMs * 0.15;
      const b = (k + 1) * noteMs + off - noteMs * 0.1;
      const v = frames.filter((f) => f.ms >= a && f.ms <= b && f.midi !== null).map((f) => f.midi as number);
      if (!v.length) return 'miss' as const;
      return Math.abs(foldCents(median(v), t)) <= cents ? ('ok' as const) : ('off' as const);
    });
    const got = marks.filter((m) => m === 'ok').length;
    if (got > best.got) best = { marks, got, offset: off };
  }
  return { marks: best.marks, pct: Math.round((100 * Math.max(0, best.got)) / Math.max(1, notes.length)), offset: best.offset };
}

export interface RcSave {
  v: 1;
  game: 'runcatcher';
  seed: number;
  tier: DynName;
  level: number;
  /** Tempo now (% of full). */
  pct: number;
  /** Highest tempo caught clean (0 = none yet). */
  topPct: number;
  takes: number[];
  lives: number;
  /** Notes caught and asked over the run. */
  caught: number;
  asked: number;
  score: number;
}
export const newRc = (seed: number, tier: DynName, level: number): RcSave => ({ v: 1, game: 'runcatcher', seed: seed >>> 0, tier, level, pct: START_PCT[level] ?? 60, topPct: 0, takes: [], lives: RC_LIVES, caught: 0, asked: 0, score: 0 });
export const rcOver = (s: RcSave) => s.lives <= 0 || s.takes.length >= RC_TAKES;
export function isRcSave(x: unknown): x is RcSave {
  const s = x as RcSave | null;
  return !!s && s.v === 1 && s.game === 'runcatcher' && typeof s.seed === 'number' && Array.isArray(s.takes) && !rcOver(s);
}
/** After a take: the ladder (clean +10 %, at most 130 %), a life for a take under half, the score (notes × tempo). */
export function rcAfterTake(s: RcSave, pct: number, caught: number, asked: number): RcSave {
  const clean = pct >= RC_CLEAN;
  return {
    ...s,
    takes: [...s.takes, pct],
    lives: pct < RC_MISS ? s.lives - 1 : s.lives,
    pct: clean ? Math.min(RC_MAX_PCT, s.pct + 10) : s.pct,
    topPct: clean ? Math.max(s.topPct, s.pct) : s.topPct,
    caught: s.caught + caught,
    asked: s.asked + asked,
    score: s.score + Math.round((caught * 10 * s.pct) / 100),
  };
}
export function rcResult(s: RcSave) {
  const accuracy = s.asked ? Math.round((100 * s.caught) / s.asked) : 0;
  return { game: 'runcatcher' as const, score: s.score, detail: { tier: s.tier, level: s.level, accuracy, topPct: s.topPct, takes: s.takes.length, clean: s.takes.filter((x) => x >= RC_CLEAN).length, input: 'mic' } };
}
