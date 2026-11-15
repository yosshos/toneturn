// Enclosure Target (AUDIT-GAMES §4.2 #3): a chord tone is the target; approach it with the named enclosure and land it
// ON the beat. The approaches and enclosures are bebopVocab.leadIn (docs/research/BARRY-HARRIS-METHOD.md A2.10:
// "a scale note above, a chromatic note below, then the target"; the 4-note bebop enclosure; the delayed resolution).
//
// Tiers: pp a half step below into the root (rubato — the shape first) · p half step above + below (either order)
// into a chord tone, on the beat · mp scale step above + half step below · mf the 4-note bebop enclosure · f the
// delayed resolution · ff through ii–V–I: the 3rd of the V and of the I on beat 1 of their bars, any enclosure.
// All 12 keys (cycle of 4ths). Grading: the target's pitch class, its time against the beat, and the enclosure's shape
// (each lead-in note's signed interval to the target, any octave). Pure.

import { LEAD_NAME, VQ_DEF, leadIn, type LeadId, type VQ } from './bebopVocab';
import { realize, type GChord } from './progGrid';
import { cycleKey, itemSeed, pc, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

export const ENC_TAKES = 8;
export const encLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
export const ENC_BPM: Record<number, number> = { 1: 0, 2: 80, 3: 88, 4: 92, 5: 96, 6: 104 };
const LEVEL_LEADS: Record<number, LeadId[]> = { 1: ['chr-below'], 2: ['enc-ab', 'enc-ba'], 3: ['enc-step'], 4: ['enc-bebop'], 5: ['enc-delayed'], 6: ['enc-ab', 'enc-ba', 'enc-step', 'enc-bebop'] };
export const DEG_NAME = [
  { en: 'root', he: 'השורש' },
  { en: '3rd', he: 'הטרצה' },
  { en: '5th', he: 'הקווינטה' },
  { en: '7th', he: 'הספטימה' },
];
const VQ_OF: Record<string, VQ> = { maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'hd7', m6: 'm6', '6': '6' };

export interface EncTarget {
  /** Beat the target lands on (from beat 0 = the first beat after the count-in). */
  beat: number;
  /** The chord it belongs to (index into chords) and which chord tone (0 root … 3 7th). */
  chord: number;
  deg: number;
  pc: number;
  lead: LeadId;
  /** The lead-in notes as signed semitones from the target (enc-ab → [+1, −1]). */
  semis: number[];
}
export interface EncItem {
  key: number;
  chords: GChord[];
  targets: EncTarget[];
  time: 'free' | 'strict';
  /** Beats the band plays (after the count-in). */
  beats: number;
}

/** The chord scale of a chord (pitch classes) — bebopVocab's table. */
export const chordScale = (c: Pick<GChord, 'root' | 'q'>): number[] => VQ_DEF[VQ_OF[c.q] ?? 'maj7'].sc.map((x) => pc(c.root + x));
/** The lead-in of `id` into target pitch class `tpc` over chord `c`, as signed semitones from the target. */
export function leadSemis(id: LeadId, tpc: number, c: Pick<GChord, 'root' | 'q'>): number[] {
  const T = 60 + tpc;
  return leadIn(id, T, chordScale(c)).map((p) => p - T);
}

/** Item i of a run. */
export function encItem(seed: number, level: number, i: number): EncItem {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0x3e9c1a);
  const key = cycleKey(seed, i);
  const leads = LEVEL_LEADS[lv];
  if (lv < 6) {
    const c = realize(key, { deg: '1', q: 'maj7', x: 'none', beats: 8 });
    const deg = lv === 1 ? 0 : lv === 2 ? pickOf(rnd, [0, 1, 2]) : pickOf(rnd, [0, 1, 2, 3]);
    const iv = [0, 4, 7, 11][deg];
    const tpc = pc(key + iv);
    const lead = pickOf(rnd, leads);
    return { key, chords: [c], targets: [{ beat: 4, chord: 0, deg, pc: tpc, lead, semis: leadSemis(lead, tpc, c) }], time: lv === 1 ? 'free' : 'strict', beats: 8 };
  }
  const ii = realize(key, { deg: '2', q: 'm7', x: 'none', beats: 4 });
  const v = realize(key, { deg: '5', q: '7', x: 'none', beats: 4 });
  const one = realize(key, { deg: '1', q: 'maj7', x: 'none', beats: 8 });
  const t1 = pc(v.root + 4);
  const t2 = pc(one.root + 4);
  const l1 = pickOf(rnd, leads);
  const l2 = pickOf(rnd, leads);
  return {
    key,
    chords: [ii, v, one],
    targets: [
      { beat: 4, chord: 1, deg: 1, pc: t1, lead: l1, semis: leadSemis(l1, t1, v) },
      { beat: 8, chord: 2, deg: 1, pc: t2, lead: l2, semis: leadSemis(l2, t2, one) },
    ],
    time: 'strict',
    beats: 16,
  };
}
export const leadName = (id: LeadId) => LEAD_NAME[id];

export interface EncPlayed {
  /** ms after beat 0 (strict) or after the cue (free); latency removed. */
  ms: number;
  midi: number;
}
export interface EncMark {
  /** The target note was played (its pitch class, near its beat). */
  found: boolean;
  /** Timing of the target: 1 on the beat (±0.15 beat), 0.6 (±0.3), 0.3 (±0.5), 0 when not near it. Null when free. */
  timing: number | null;
  /** Lead-in notes right (signed interval to the target, in order from the end). */
  shape: number;
  /** ms off the beat (strict), when found. */
  offMs: number | null;
}
export interface EncGrade {
  score: number;
  marks: EncMark[];
}

const signed = (d: number): number => ((((d + 6) % 12) + 12) % 12) - 6;

/** Grade a take (see the header): strict 50 % shape + 25 % target + 25 % its timing; free 60 % shape + 40 % target. */
export function gradeEnc(it: EncItem, played: EncPlayed[], bpm: number): EncGrade {
  const ps = [...played].sort((a, b) => a.ms - b.ms);
  const beat = bpm > 0 ? 60000 / bpm : 0;
  const marks = it.targets.map((t): EncMark => {
    let ti = -1;
    let timing: number | null = null;
    let offMs: number | null = null;
    if (it.time === 'strict') {
      const at = t.beat * beat;
      let bestD = Infinity;
      ps.forEach((p, k) => {
        if (pc(p.midi) !== t.pc) return;
        const d = Math.abs(p.ms - at);
        if (d <= 1.5 * beat && d < bestD) {
          bestD = d;
          ti = k;
        }
      });
      if (ti >= 0) {
        const dev = bestD / beat;
        timing = dev <= 0.15 ? 1 : dev <= 0.3 ? 0.6 : dev <= 0.5 ? 0.3 : 0;
        offMs = Math.round(ps[ti].ms - at);
      } else timing = 0;
    } else {
      for (let k = ps.length - 1; k >= 0; k--)
        if (pc(ps[k].midi) === t.pc && k > 0) {
          ti = k;
          break;
        }
      if (ti < 0) ti = ps.findIndex((p) => pc(p.midi) === t.pc);
    }
    let shape = 0;
    if (ti >= 0) {
      const T = ps[ti].midi;
      const before = ps.slice(0, ti).filter((p) => it.time === 'free' || p.ms >= ps[ti].ms - (t.semis.length * 0.5 + 1) * beat);
      const tail = before.slice(-t.semis.length);
      let ok = 0;
      for (let k = 1; k <= t.semis.length; k++) {
        const p = tail[tail.length - k];
        if (p && signed(p.midi - T) === signed(t.semis[t.semis.length - k])) ok++;
      }
      shape = ok / t.semis.length;
    }
    return { found: ti >= 0, timing, shape, offMs };
  });
  const per = marks.map((m) => (it.time === 'strict' ? 0.5 * m.shape + 0.25 * (m.found ? 1 : 0) + 0.25 * (m.timing ?? 0) : 0.6 * m.shape + 0.4 * (m.found ? 1 : 0)));
  return { score: Math.round(100 * (per.reduce((a, b) => a + b, 0) / Math.max(1, per.length))), marks };
}

/** Free takes end once the target has been played after its lead-in, after a pause, or when nothing comes. */
export const ENC_FREE = { quietAfterMs: 2200, nothingMs: 9000, tailMs: 400 };
