// The bass course's jazz and prog families (docs/research/BASS_NICHE_PLAN.md, P1): swing time, Barry Harris lines,
// form and arrangement, Afro-Cuban and Brazilian bass (the jazz track); odd meters, riffs and unisons, polymeter and
// metric modulation (the prog track); and the solo levels 7–14 of b-impro (bebop lines, chord scales, trading 4s).
// Built on the prog engine (docs/research/PROG_ENGINE.md): meter per bar, tempo maps, band unison / polymeter, road-map
// forms and the downbeatCt / anticipate / swingWalk rules. Every line is generated from rules, never copied.
//
// NOTE: this module, bass.ts and guitar.ts import each other. Nothing here may call a bass.ts / guitar.ts export at
// module top level (only inside functions).

import type { BassGoal, Drill, DrillSpec } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle } from './guitar';
import { rng, mod, SIG } from './guitar';
import { alt, chordName, drillOf, keyNameOf, lowest, refWalk, rootOf, spell, BLUES, PROGS, QI, type BN, type Prog, type Q } from './bass';
import { parseChart } from '../charts';
import { STANDARD_CHANGES } from '../standards';
import { barryLine, pivot, ruleFor } from '../barry';
import { MODULATIONS, parseMeter, planBars, withBarPlan } from './timeline';
import { applyForm, type FormPlan, type FormSection } from './roadmap';
import type { BassFamilyId } from './types';

type T2 = { en: string; he: string };
const tt = (en: string, he: string): T2 => ({ en, he });
const pc = (x: number) => ((x % 12) + 12) % 12;
const uniq = (xs: number[]) => [...new Set(xs)];
type Rules = NonNullable<BassGoal['rules']>;

// ───────────────────────────── the two tracks and the summits ─────────────────────────────

/** Which track a new family belongs to (owner 2026-11-10: they open by the player's chosen track). Others: both. */
export const BASS_TRACK: Partial<Record<BassFamilyId, 'jazz' | 'prog'>> = {
  'b-swing': 'jazz',
  'b-barry': 'jazz',
  'b-jform': 'jazz',
  'b-latin': 'jazz',
  'b-odd': 'prog',
  'b-prog': 'prog',
  'b-poly': 'prog',
  // P2: the standards ladder is jazz; extended techniques (b-ext) stay on both tracks (fusion is both).
  'b-std': 'jazz',
};
/** Is a bass family shown for the player's track (absent / 'both' = every family)? */
export const inBassTrack = (family: string, track?: 'jazz' | 'prog' | 'both'): boolean => !track || track === 'both' || !BASS_TRACK[family as BassFamilyId] || BASS_TRACK[family as BassFamilyId] === track;

/**
 * The two summits of the bass path (BASS_NICHE_PLAN X1): the capstone levels that name the top. "Jazz standard":
 * up-tempo swing time at 280–320, three choruses without drift, a bebop chorus, a solo chorus on a standard and
 * trading 4s. "Prog standard": 11/8 and 13/15/8 riffs, a mixed-meter chart, a unison étude and a metric modulation.
 */
export const BASS_SUMMITS: Record<'jazz' | 'prog', { title: T2; levels: string[] }> = {
  jazz: { title: tt('Jazz standard', 'רמת ג׳אז מקצועית'), levels: ['b-swing-5', 'b-swing-6', 'b-swing-7', 'b-barry-6', 'b-impro-13', 'b-impro-14', 'b-jform-7'] },
  prog: { title: tt('Prog standard', 'רמת פרוג מקצועית'), levels: ['b-odd-4', 'b-odd-5', 'b-odd-7', 'b-prog-8', 'b-poly-5', 'b-poly-7'] },
};

/**
 * The constraint-improvisation screen (Charts / ImprovRules) on a bass: the low register capture (YIN down to 28 Hz,
 * 22 Hz with a low B, a 4096-sample frame) — the default 70 Hz floor misses E1 and A1. Null for other courses.
 */
export function improvCaptureOpts(s: { activeCourse?: string; instrument?: string; bassTuning?: string }): { minHz: number; fftSize: number } | null {
  if (s.activeCourse !== 'bass' && !(s.activeCourse === undefined && s.instrument === 'bass')) return null;
  const lowB = s.bassTuning === 'bass5' || s.bassTuning === 'bass6';
  return { minHz: lowB ? 22 : 28, fftSize: 4096 };
}

// ───────────────────────────── chords and lines ─────────────────────────────

/** A chord of a line: root pitch class, chord tones and scale (intervals above the root), length, name, landing set. */
export interface LC {
  root: number;
  ct: number[];
  sc: number[];
  beats: number;
  name: string;
  land?: number[];
}
export const SC: Record<string, number[]> = {
  ion: [0, 2, 4, 5, 7, 9, 11],
  lyd: [0, 2, 4, 6, 7, 9, 11],
  mix: [0, 2, 4, 5, 7, 9, 10],
  lydDom: [0, 2, 4, 6, 7, 9, 10],
  alt: [0, 1, 3, 4, 6, 8, 10],
  dor: [0, 2, 3, 5, 7, 9, 10],
  aeo: [0, 2, 3, 5, 7, 8, 10],
  mel: [0, 2, 3, 5, 7, 9, 11],
  loc: [0, 1, 3, 5, 6, 8, 10],
  dim: [0, 2, 3, 5, 6, 8, 9, 11],
  wt: [0, 2, 4, 6, 8, 10],
};
/** The chord scale a chord's tones imply (major 7 → Ionian, 7 → Mixolydian or altered, m7 → Dorian, …). */
export function scaleOf(ct: number[]): number[] {
  const h = (x: number) => ct.includes(x);
  let s: number[];
  if (h(3) && h(6) && h(9)) s = SC.dim;
  else if (h(3) && h(6)) s = SC.loc;
  else if (h(3) && h(11)) s = SC.mel;
  else if (h(3)) s = SC.dor;
  else if (h(4) && h(10)) s = h(1) || h(3) || h(8) ? SC.alt : h(6) ? SC.lydDom : SC.mix;
  else if (h(4) && h(8)) s = SC.wt;
  else if (h(4)) s = h(6) ? SC.lyd : SC.ion;
  else if (h(5)) s = SC.mix;
  else s = SC.ion;
  return uniq([...s, ...ct]).sort((a, b) => a - b);
}
const QSC: Partial<Record<Q, number[]>> = { M: SC.ion, m: SC.aeo, '7': SC.mix, m7: SC.dor, maj7: SC.ion, m7b5: SC.loc, dim7: SC.dim };
/** Chords from scale-step chords in a key (one chord per `beats`). */
export function lcOf(key: number, prog: Prog, beats = 4): LC[] {
  return prog.map((c) => ({ root: pc(key + c[0]), ct: QI[c[1]].map(pc), sc: QSC[c[1]] ?? scaleOf(QI[c[1]]), beats, name: chordName(key, c) }));
}
/** Chords from a chart text (standards, charts with slash chords and alterations). */
export function lcText(text: string): LC[] {
  return parseChart(text).chords.map((c) => {
    const ct = uniq([0, pc(c.bass - c.root), ...c.iv.map(pc)]);
    return { root: pc(c.root), ct, sc: scaleOf(ct), beats: c.beats, name: c.sym };
  });
}
export const textOfLc = (cs: LC[]): string => {
  // One bar per 4 beats (two 2-beat chords share a bar).
  const bars: string[] = [];
  let cur: string[] = [];
  let at = 0;
  for (const c of cs) {
    cur.push(c.name.replace('°7', 'dim7').replace(/♭/g, 'b').replace(/♯/g, '#'));
    at += c.beats;
    if (at % 4 === 0) {
      bars.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) bars.push(cur.join(' '));
  return bars.join(' | ');
};
/** The chart shown above the notes: one string per bar. */
export function chartLc(cs: LC[], beatsPerBar = 4): string[] {
  const bars: string[] = [];
  let at = 0;
  for (const c of cs) {
    const bar = Math.floor(at / beatsPerBar + 1e-9);
    bars[bar] = bars[bar] ? `${bars[bar]} ${c.name}` : c.name;
    for (let b = bar + 1; b < Math.floor((at + c.beats) / beatsPerBar - 1e-9) + 1; b++) bars[b] = bars[b] ?? '%';
    at += c.beats;
  }
  return bars.map((x) => x ?? '%');
}
/** The rule chart of a line: chord tones for walk / downbeatCt, the chord scale (+ landings) for target. */
export function rulesFor(cs: LC[], kind: Rules['kind'], extra: Partial<Rules> = {}): Rules {
  return {
    kind,
    chart: cs.map((c) => ({ chord: c.name, root: c.root, tones: kind === 'target' ? uniq([...c.sc, ...c.ct]) : c.ct, beats: c.beats, ...(c.land ? { land: c.land } : {}) })),
    ...(kind === 'walk' ? { maxRepeat: 0.05 } : {}),
    ...extra,
  };
}
/** Guide tones (3rd and 7th; a 6th chord's 6th) of a chord as intervals. */
export const guideOf = (c: LC): number[] => {
  const g = c.ct.filter((x) => x === 3 || x === 4 || x === 10 || x === 11 || (x === 9 && !c.ct.includes(10) && !c.ct.includes(11)));
  return g.length ? g : c.ct;
};
export const pitchesIn = (root: number, ints: number[], lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let p = lo; p <= hi; p++) if (ints.includes(pc(p - root))) out.push(p);
  return out;
};

/**
 * A chord-tone line (bebop / Barry Harris / chord-scale solos): a chord tone on every `every` beats (the downbeats),
 * moving to a neighbouring chord tone; between them a passing note — a scale tone or a chromatic step, always within
 * a whole step of the next note. `guide`: the first note of each chord is its 3rd or 7th. `enclose`: the last two
 * 8ths before a change enclose the next target (a scale tone above, the half step below). Ends on the first chord.
 */
export function ctLine(cs: LC[], rnd: () => number, o: { per: 1 | 2; every: number; lo: number; hi: number; from?: number; guide?: boolean; enclose?: boolean; b0?: number }): BN[] {
  const starts: number[] = [];
  let total = 0;
  for (const c of cs) {
    starts.push(total);
    total += c.beats;
  }
  const chordAt = (t: number) => {
    let i = cs.length - 1;
    while (i > 0 && starts[i] > t + 1e-9) i--;
    return i;
  };
  const isStart = (t: number) => starts.some((s) => Math.abs(s - t) < 1e-9);
  const anchorsT: number[] = [];
  for (let t = 0; t < total - 1e-9; t += o.every) anchorsT.push(t);
  let prev = o.from ?? o.lo + 7;
  let dir = 1;
  const anchors: number[] = [];
  const nonCt = new Set<number>();
  for (const t of anchorsT) {
    const c = cs[chordAt(t)];
    if (prev > o.hi - 4) dir = -1;
    else if (prev < o.lo + 4) dir = 1;
    else if (rnd() < 0.18) dir = -dir;
    const pool = pitchesIn(c.root, isStart(t) && o.guide ? guideOf(c) : c.ct, o.lo, o.hi).filter((p) => p !== prev && Math.abs(p - prev) <= 7);
    const all = pool.length ? pool : pitchesIn(c.root, c.ct, o.lo, o.hi).filter((p) => p !== prev);
    const ahead = all.filter((p) => (p - prev) * dir > 0).sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
    const p = ahead[0] ?? [...all].sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))[0];
    anchors.push(p);
    prev = p;
  }
  const c0 = cs[0];
  const closing = pitchesIn(c0.root, o.guide ? guideOf(c0) : c0.ct, o.lo, o.hi).sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))[0];
  const slots = Math.round(o.every * o.per) - 1;
  const step = 1 / o.per;
  // Enclosures: the 8th pair before each change (upper neighbour on the beat, the half step below on the "and").
  const forced = new Map<number, number>();
  if (o.enclose && o.per === 2 && o.every === 1)
    anchorsT.forEach((t, k) => {
      const next = k + 1 < anchors.length ? anchors[k + 1] : closing;
      const nt = t + 1;
      if (!isStart(nt) && nt < total - 1e-9) return;
      const c = cs[chordAt(t)];
      const up = [next + 1, next + 2].find((p) => c.sc.includes(pc(p - c.root))) ?? next + 1;
      anchors[k] = up;
      nonCt.add(k);
      forced.set(k, next - 1);
    });
  const out: BN[] = [];
  const b0 = o.b0 ?? 0;
  anchorsT.forEach((t, k) => {
    const a = anchors[k];
    const b = k + 1 < anchors.length ? anchors[k + 1] : closing;
    out.push({ b: b0 + t, d: step, p: a, ct: !nonCt.has(k) });
    for (let j = 1; j <= slots; j++) {
      const tt0 = t + j * step;
      const c = cs[chordAt(tt0)];
      let p: number;
      if (forced.has(k)) p = forced.get(k)!;
      else {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const between = [];
        for (let x = lo + 1; x < hi; x++) if (c.sc.includes(pc(x - c.root)) && Math.abs(b - x) <= 2) between.push(x);
        if (between.length) p = between.sort((x, y) => Math.abs(x - (a + b) / 2) - Math.abs(y - (a + b) / 2))[0];
        else if (Math.abs(b - a) >= 2) p = b - Math.sign(b - a);
        else p = b + (b === a ? 1 : Math.sign(b - a));
      }
      out.push({ b: b0 + tt0, d: step, p, ct: false });
    }
  });
  out.push({ b: b0 + total, d: 2, p: closing, ct: true });
  return out;
}

/** Halves (two-feel): the root on 1, the 5th (or the bass note) on 3; a chord of 2 beats gets its root only. */
function twoFeel(tu: Tuning, cs: LC[], b0 = 0): BN[] {
  const out: BN[] = [];
  let at = b0;
  for (const c of cs) {
    const R = rootOf(tu, c.root);
    const fifth = c.ct.includes(7) ? 7 : c.ct.includes(6) ? 6 : c.ct.includes(8) ? 8 : c.ct[1] ?? 0;
    const f = R + fifth > rootOf(tu, 0) + 16 ? R + fifth - 12 : R + fifth;
    if (c.beats >= 4) out.push({ b: at, d: 2, p: R, ct: true }, { b: at + 2, d: c.beats - 2, p: f < lowest(tu) ? f + 12 : f, ct: true });
    else out.push({ b: at, d: c.beats, p: R, ct: true });
    at += c.beats;
  }
  return out;
}
/** The band's walking line for chords (refWalk), from beat b0. */
export const walkOf = (tu: Tuning, cs: LC[], seed: string, b0 = 0): BN[] => refWalk(tu, textOfLc(cs), seed, false).map((x) => ({ ...x, b: x.b + b0 }));
/**
 * A walking line from chord tones (for charts the band's walker doesn't voice by the rules, e.g. passing diminished
 * chords): each chord's root, two more of its chord tones moving up or down, and on the last beat a chromatic
 * approach to the next chord's root.
 */
function ctWalk(tu: Tuning, cs: LC[]): BN[] {
  const out: BN[] = [];
  let at = 0;
  cs.forEach((c, i) => {
    const R = rootOf(tu, c.root);
    const nx = rootOf(tu, (cs[i + 1] ?? cs[0]).root);
    const up = i % 2 === 0;
    const tones = c.ct.filter((x) => x !== 0 && x < 12).sort((a, b) => a - b);
    const [t1, t2] = up ? [tones[0], tones[1] ?? tones[0]] : [tones[tones.length - 1] - 12, (tones[tones.length - 2] ?? tones[0]) - 12];
    const pp = (x: number) => (R + x < lowest(tu) ? R + x + 12 : R + x);
    const n2 = pp(t1);
    const n3 = pp(t2);
    const ap = nx + (n3 > nx ? 1 : -1);
    out.push({ b: at, d: 1, p: R, ct: true }, { b: at + 1, d: 1, p: n2, ct: true }, { b: at + 2, d: 1, p: n3, ct: true }, { b: at + 3, d: 1, p: ap === n3 ? nx + (ap > nx ? -1 : 1) : ap, ct: false });
    at += c.beats;
  });
  return out;
}
export const repeatLc = (cs: LC[], n: number): LC[] => Array.from({ length: n }, () => cs).flat();
export const closeOn = (tu: Tuning, pcRoot: number, at: number, d = 2): BN => ({ b: at, d, p: rootOf(tu, pcRoot), ct: true });

// ───────────────────────────── J1: b-swing — swing time ─────────────────────────────

function genSwing(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const turn = (n: number) => repeatLc(lcOf(key, PROGS.jazz), n);
  const blues = (n: number) => repeatLc(lcOf(key, BLUES), n);
  const out = (cs: LC[], line: BN[], name: T2, sw: NonNullable<BassGoal['swingWalk']>, groove = 'swing', sections?: { bar: number; groove: string }[]) =>
    drillOf(s, tu, alt(line), { ...name, chart: chartLc(cs), show: 'chart', bass: { rules: rulesFor(cs, 'walk'), swingWalk: sw }, drums: { groove, ...(sections ? { sections } : {}) } });
  switch (s.kind) {
    case 'long': {
      // Long quarters: each note rings ≥ 85 % of its beat (mic release / MIDI note-off), a walking line over the blues.
      const cs = blues(1);
      const line = [...walkOf(tu, cs, `b-swing:long:${key}:${op}`), closeOn(tu, key, 48)];
      return out(cs, line, tt('Long quarters: each note rings into the next (blues)', 'רבעים ארוכים: כל צליל מצלצל עד הבא (בלוז)'), { long: 0.85 });
    }
    case 'place': {
      // Placement against the ride, on purpose: on top (−20…−10 ms), centred (±6) or laid back (+6…+16).
      const P: [number, number][] = [[-20, -10], [-6, 6], [6, 16]];
      const N: T2[] = [tt('On top of the beat: 10–20 ms ahead of the ride', 'על הקצה של הפעמה: 10–20 מ״ש לפני הרייד'), tt('Centred on the ride', 'במרכז הפעמה עם הרייד'), tt('Laid back: 6–16 ms behind the ride', 'מאחורי הפעמה: 6–16 מ״ש אחרי הרייד')];
      const cs = turn(4);
      const line = [...walkOf(tu, cs, `b-swing:place:${key}:${op}`), closeOn(tu, key, 64)];
      return out(cs, line, N[op % 3], { long: 0.85, ride: P[op % 3] });
    }
    case 'dropout': {
      // The drums lay out for 4 of every 8 bars: keep the tempo alone (first block with the ride vs the last without).
      const cs = turn(4);
      const line = [...walkOf(tu, cs, `b-swing:drop:${key}:${op}`), closeOn(tu, key, 64)];
      return out(cs, line, tt('The drums drop out: 4 bars with, 4 bars alone', 'התופים יוצאים: 4 תיבות איתם, 4 לבד'), { long: 0.85, drift: 0.02, chorusBeats: 16 }, 'swing', [{ bar: 4, groove: '-' }, { bar: 8, groove: 'swing' }, { bar: 12, groove: '-' }]);
    }
    case 'choruses': {
      // Three choruses of the blues, the first and the last the same tempo (±2 %), with the ride.
      const cs = blues(3);
      const line = [...walkOf(tu, cs, `b-swing:ch:${key}:${op}`), closeOn(tu, key, 144)];
      return out(cs, line, tt('Three choruses of the blues, no drift', 'שלושה סבבים של בלוז, בלי לזוז בטמפו'), { long: 0.85, ride: [-20, 10], drift: 0.02, chorusBeats: 48 });
    }
    case 'uptempo': {
      // Up-tempo walking (220 → 280): two choruses; op 1 the rhythm-changes A section twice.
      const cs = op % 2 ? repeatLc(lcText(STANDARD_CHANGES.find((x) => x.id === 'rhythm-a')!.text).map((c) => transposeLc(c, key - 10)), 2) : blues(2);
      const total = cs.reduce((a, c) => a + c.beats, 0);
      const line = [...walkOf(tu, cs, `b-swing:up:${key}:${op}`), closeOn(tu, key, total)];
      return out(cs, line, op % 2 ? tt('Up-tempo walk: rhythm changes', 'ווקינג בטמפו מהיר: ריתם צ׳יינג׳ס') : tt('Up-tempo walk: the blues', 'ווקינג בטמפו מהיר: בלוז'), { long: 0.85, ride: [-20, 10], drift: 0.02, chorusBeats: total / 2 }, 'swing-fast');
    }
    case 'two-four': {
      // Very fast (260 → 320): a chorus in 2, then a chorus in 4, long notes and with the ride.
      const cs = blues(1);
      const line = [...twoFeel(tu, cs), ...walkOf(tu, cs, `b-swing:24:${key}:${op}`, 48), closeOn(tu, key, 96)];
      return out(repeatLc(cs, 2), line, tt('Very fast: a chorus in 2, a chorus in 4', 'מהיר מאוד: סבב בשתיים, סבב בארבע'), { long: 0.85, ride: [-20, 10] }, 'swing-fast');
    }
  }
  throw new Error(`Unknown b-swing kind ${s.kind}`);
}
export const transposeLc = (c: LC, by: number): LC => ({ ...c, root: pc(c.root + by), name: transposeName(c.name, by) });
export const transposeName = (sym: string, by: number): string => {
  const m = /^([A-G][b#♭♯]?)(.*)$/.exec(sym);
  if (!m) return sym;
  const L: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const r = L[m[1][0]] + (m[1][1] === 'b' || m[1][1] === '♭' ? -1 : m[1][1] === '#' || m[1][1] === '♯' ? 1 : 0);
  const [q, slash] = m[2].split('/');
  const sl = slash ? `/${transposeName(slash, by)}` : '';
  return `${spell(r + by, r + by)}${q}${sl}`;
};

// ───────────────────────────── P1: b-odd — odd meters and groupings ─────────────────────────────

/** An odd-meter riff bar: on each group start an accented note (root, octave, 5th, ♭7 in turn), roots between. */
function riffBar(R: number, b0: number, len: number, groups: number[], per: number, gi0 = 0): BN[] {
  const out: BN[] = [];
  const ACC = [0, 12, 7, 10, 12, 3, 7];
  const step = 1 / per;
  for (let t = 0; t < len - 1e-9; t += step) {
    const g = groups.findIndex((x) => Math.abs(x - t) < 1e-9);
    const inG = t - Math.max(...groups.filter((x) => x <= t + 1e-9));
    const p = g >= 0 ? R + ACC[(g + gi0) % ACC.length] : Math.abs(inG - 2 * step) < 1e-9 ? R + 7 : R;
    out.push({ b: b0 + t, d: step, p, acc: g >= 0 });
  }
  return out;
}
const ODD_PROG: Prog = [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M']];
const GROOVE_OF: Record<string, string> = { '7/8 2+2+3': 'seven-8', '7/8 3+2+2': 'seven-8-322', '7/8 2+3+2': 'seven-8-232', '9/8 2+2+2+3': 'nine-8', '9/8 3+3+3': 'nine-8-333', '11/8 3+3+3+2': 'eleven-8', '11/8 2+2+3+2+2': 'eleven-8-22322', '13/8 3+3+3+2+2': 'thirteen-8', '15/8 2+2+3+2+2+2+2': 'fifteen-8', '5/4 3+2': 'five-4', '4/4': 'rock-8', '3/4': 'waltz', '2/4': 'rock-8' };
/** A riff drill on a bar plan (one meter per bar): notes bar by bar, the groove per bar, then the time line. */
function planDrill(s: DrillSpec, tu: Tuning, plan: string[], name: T2, o: { pulse?: 8; per?: number; prog?: Prog; goal?: Drill['goal']['prog']; drums?: boolean; unison?: Drill['unison']; bandMeter?: string; pick?: boolean } = {}): Drill {
  const key = mod(s.key, 12);
  const specs = plan.map(parseMeter);
  const bars = planBars(specs, o.pulse);
  const prog = o.prog ?? ODD_PROG;
  const line: BN[] = [];
  bars.forEach((b, i) => line.push(...riffBar(rootOf(tu, key + prog[i % prog.length][0]), b.start, b.beats, b.groups, o.per ?? 1, i)));
  const total = bars.reduce((a, b) => a + b.beats, 0);
  line.push({ b: total, d: 1, p: rootOf(tu, key) });
  const chart = bars.map((_, i) => chordName(key, prog[i % prog.length], key + 3));
  const sections = plan.map((m, i) => ({ bar: i, groove: GROOVE_OF[m] ?? GROOVE_OF[m.split(' ')[0]] ?? 'rock-8' })).filter((x, i, a) => i === 0 || x.groove !== a[i - 1].groove);
  const grooveOn = o.drums !== false && !o.bandMeter;
  const d = drillOf(s, tu, o.pick ? alt(line, ['D', 'U']) : alt(line), { ...name, meter: bars[0].beats, pulse: o.pulse, chart, evenness: false, keyName: `${keyNameOf(key, true)}m`, ...(grooveOn ? { drums: { groove: sections[0].groove, ...(sections.length > 1 ? { sections } : {}) } } : o.bandMeter ? { drums: { groove: 'rock-8' } } : {}) });
  let out = withBarPlan(d, plan);
  if (o.bandMeter) out = { ...out, bandMeter: parseMeter(o.bandMeter) };
  if (o.unison) out = { ...out, unison: o.unison };
  out.goal = { ...out.goal, prog: { ...(out.goal.prog ?? {}), ...(o.goal ?? { groupAccent: 0.3 }) } };
  return out;
}

function genOdd(s: DrillSpec, tu: Tuning): Drill {
  const op = s.option ?? 0;
  const rep = (m: string, n: number) => Array.from({ length: n }, () => m);
  switch (s.kind) {
    case 'five': {
      const m = op % 2 ? '5/4 2+3' : '5/4 3+2';
      return planDrill(s, tu, rep(m, 4), tt(`5/4 grouped ${op % 2 ? '2+3' : '3+2'}`, `5/4 בקבוצות ${op % 2 ? '2+3' : '3+2'}`), { per: 2, drums: op % 2 ? false : undefined });
    }
    case 'seven': {
      const g = ['2+2+3', '3+2+2', '2+3+2'][op % 3];
      return planDrill(s, tu, rep(`7/8 ${g}`, 8), tt(`7/8 rotations: ${g}`, `סיבובי 7/8: ${g}`), { pulse: 8 });
    }
    case 'nine': {
      const g = op % 2 ? '3+3+3' : '2+2+2+3';
      return planDrill(s, tu, rep(`9/8 ${g}`, 8), tt(`9/8: ${g}`, `9/8: ${g}`), { pulse: 8 });
    }
    case 'eleven': {
      const g = op % 2 ? '2+2+3+2+2' : '3+3+3+2';
      return planDrill(s, tu, rep(`11/8 ${g}`, 8), tt(`11/8: ${g}`, `11/8: ${g}`), { pulse: 8 });
    }
    case 'long-odd': {
      const m = op % 2 ? '15/8 2+2+3+2+2+2+2' : '13/8 3+3+3+2+2';
      return planDrill(s, tu, rep(m, 4), op % 2 ? tt('15/8 (7 + 8)', '15/8 (7 + 8)') : tt('13/8: 3+3+3+2+2', '13/8: 3+3+3+2+2'), { pulse: 8 });
    }
    case 'over4': {
      // Odd groupings over a 4/4 groove: 3+3+2 in 8ths, or 3+3+3+3+4 in 16ths.
      const m = op % 2 ? '4/4 3+3+3+3+4/16' : '4/4 3+3+2/8';
      return planDrill(s, tu, rep(m, 8), op % 2 ? tt('3+3+3+3+4 in 16ths over 4/4', '3+3+3+3+4 בשש-עשריות מעל 4/4') : tt('3+3+2 in 8ths over 4/4', '3+3+2 בשמיניות מעל 4/4'), { per: op % 2 ? 4 : 2 });
    }
    case 'mixed': {
      const plan = op % 2 ? ['4/4', '3/4', '2/4', '4/4', '4/4', '3/4', '2/4', '4/4'] : ['7/8 2+2+3', '4/4', '7/8 2+2+3', '4/4', '7/8 2+2+3', '4/4', '7/8 2+2+3', '4/4'];
      return planDrill(s, tu, plan, op % 2 ? tt('Mixed meters: 4/4 – 3/4 – 2/4', 'משקלים מתחלפים: 4/4 – 3/4 – 2/4') : tt('Mixed meters: 7/8 – 4/4', 'משקלים מתחלפים: 7/8 – 4/4'), { pulse: 8, goal: { groupAccent: 0.25 } });
    }
    case 'displace': {
      // Displacement: a two-bar riff, then the same riff moved an 8th (op 0) or a 16th (op 1) later.
      const key = mod(s.key, 12);
      const R = rootOf(tu, key);
      const shift = op % 2 ? 0.25 : 0.5;
      const cell: [number, number, number][] = op % 2
        ? [[0, 0.5, 0], [0.75, 0.25, 12], [1.5, 0.5, 10], [2.5, 0.25, 7], [3, 0.75, 0], [4, 0.5, 3], [4.75, 0.25, 5], [5.5, 0.5, 7], [6.5, 0.5, 10], [7.25, 0.5, 12]]
        : [[0, 1, 0], [1.5, 0.5, 12], [2, 1, 10], [3.5, 0.5, 7], [4, 1, 0], [5, 0.5, 3], [5.5, 1, 5], [7, 0.5, 7]];
      const line: BN[] = [];
      for (let r = 0; r < 4; r++) for (const [b, d, iv] of cell) line.push({ b: r * 8 + b + (r % 2 ? shift : 0), d, p: R + iv, acc: b === 0 });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Displacement: the riff a 16th later', 'הזזה: הריף שש-עשרית מאוחר יותר') : tt('Displacement: the riff an 8th later', 'הזזה: הריף שמינית מאוחר יותר')), keyName: `${keyNameOf(key, true)}m`, chart: Array.from({ length: 8 }, () => `${spell(key, key + 3)}m`), evenness: false, drums: { groove: op % 2 ? 'rock-16' : 'rock-8' } });
    }
  }
  throw new Error(`Unknown b-odd kind ${s.kind}`);
}

// ───────────────────────────── P2: b-poly — polymeter, polyrhythm, metric modulation ─────────────────────────────

function genPoly(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const R = rootOf(tu, key);
  const km = `${keyNameOf(key, true)}m`;
  switch (s.kind) {
    case 'cycle5':
    case 'cycle7': {
      // An n-note riff over the band's 4/4: the riff's own bars (n/8) against the band's; they meet every n bars of 4/4.
      const n = s.kind === 'cycle5' ? 5 : 7;
      return planDrill(s, tu, Array.from({ length: 8 }, () => `${n}/8 ${n}`), tt(`A ${n}-note riff over 4/4 (meets again after ${n} bars)`, `ריף של ${n} צלילים מעל 4/4 (נפגשים שוב אחרי ${n} תיבות)`), { pulse: 8, bandMeter: '4/4', prog: [[0, 'm']] });
    }
    case 'dotted': {
      // 3 against 2: dotted quarters (3/8 cells) over the band's 4/4 — 16 cells, 6 bars of 4/4.
      const line: BN[] = [];
      const IV = [0, 7, 12, 10, 7, 3, 5, 7];
      for (let i = 0; i < 16; i++) line.push({ b: i * 3, d: 3, p: R + IV[i % IV.length] });
      line.push({ b: 48, d: 2, p: R });
      const d = drillOf(s, tu, alt(line), { ...tt('Dotted quarters over 4/4 (3 against 2)', 'רבעים מנוקדים מעל 4/4 (3 נגד 2)'), meter: 3, pulse: 8, chart: [km], keyName: km, evenness: true, drums: { groove: 'rock-8' } });
      return { ...withBarPlan(d, Array.from({ length: 16 }, () => '3/8 3')), bandMeter: parseMeter('4/4') };
    }
    case 'four3': {
      // 4 against 3: four dotted 8ths in every bar of a 3/4 groove.
      const line: BN[] = [];
      const IV = [0, 7, 10, 12, 0, 3, 5, 7];
      for (let bar = 0; bar < 8; bar++) for (let k = 0; k < 4; k++) line.push({ b: bar * 3 + k * 0.75, d: 0.75, p: R + IV[(bar + k) % IV.length], acc: k === 0 });
      line.push({ b: 24, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...tt('4 against 3: dotted 8ths over 3/4', '4 נגד 3: שמיניות מנוקדות מעל 3/4'), meter: 3, chart: Array.from({ length: 8 }, () => km), keyName: km, evenness: false, drums: { groove: 'waltz' } });
    }
    case 'modtrip':
    case 'moddot': {
      // Metric modulation: 4 bars, the pivot rhythm in bar 4, and its note value becomes the new quarter.
      const trip = s.kind === 'modtrip';
      const ratio = trip ? MODULATIONS.tripletQuarterToQuarter : MODULATIONS.dottedEighthToQuarter;
      const cs = repeatLc(lcOf(key, op % 2 ? PROGS.minor : PROGS.iivi), 2);
      const line: BN[] = [];
      const walk = walkOf(tu, cs, `b-poly:${s.kind}:${key}:${op}`);
      for (const x of walk) if (x.b < 12 || x.b >= 16) line.push(x);
      const pivotBeats = trip ? [0, 2 / 3, 4 / 3, 2, 8 / 3, 10 / 3] : [0, 0.75, 1.5, 2.25, 3, 3.75];
      const c3 = cs[3];
      const pv = pitchesIn(c3.root, c3.ct, R, R + 19);
      pivotBeats.forEach((b, i) => line.push({ b: 12 + b, d: (pivotBeats[i + 1] ?? 4) - b, p: pv[(i * 2) % pv.length], ct: true }));
      line.sort((a, b) => a.b - b.b);
      line.push(closeOn(tu, key, 32));
      const nm = trip ? tt('Metric modulation: the triplet quarter becomes the new beat', 'מודולציה מטרית: רבע הטריולה נעשה הפעמה החדשה') : tt('Metric modulation: the dotted 8th becomes the new beat', 'מודולציה מטרית: השמינית המנוקדת נעשית הפעמה החדשה');
      const d = drillOf(s, tu, alt(line), { ...nm, chart: chartLc(cs), evenness: false, drums: { groove: 'rock-8' } });
      const out = withBarPlan(d, [['4/4', 8]], [{ bar: 4, ratio }]);
      out.goal = { ...out.goal, prog: { tempoRatio: { tol: 0.02, landMs: 30 } } };
      return out;
    }
    case 'riff78': {
      // A 7/8 riff (2+2+3) against drums in 4/4: 8 bars of 7 = 7 bars of 4.
      return planDrill(s, tu, Array.from({ length: 8 }, () => '7/8 2+2+3'), tt('7/8 riff against 4/4 drums', 'ריף ב-7/8 מול תופים ב-4/4'), { pulse: 8, bandMeter: '4/4', prog: [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M']] });
    }
  }
  throw new Error(`Unknown b-poly kind ${s.kind}`);
}

// ───────────────────────────── P3: b-prog — riffs and unisons ─────────────────────────────

const UNISON = { mean: 12, sd: 18 };
function genProgB(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const R = rootOf(tu, key);
  const km = `${keyNameOf(key, true)}m`;
  const pick = (xs: BN[]) => alt(xs, ['D', 'U']);
  const bars = (n: number, name = km) => Array.from({ length: n }, () => name);
  switch (s.kind) {
    case 'pedal16': {
      // 16ths with a pedal: the open root between moving notes (octave, ♭7, 5th, ♭3), picked down-up.
      const MOVE = [12, 10, 7, 3, 12, 10, 7, 5];
      const line: BN[] = [];
      for (let beat = 0; beat < 16; beat++) {
        const x = MOVE[beat % MOVE.length];
        [0, x, 0, beat % 2 ? 7 : 12].forEach((iv, k) => line.push({ b: beat + k / 4, d: 0.25, p: R + iv, acc: k === 0 }));
      }
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, pick(line), { ...tt('Pick riff in 16ths over a pedal', 'ריף במפרט בשש-עשריות מעל צליל עוגב'), chart: bars(4), keyName: km, evenness: false, drums: { groove: 'rock-16' } });
    }
    case 'unison':
    case 'unison-oct': {
      // A two-bar riff with the band doubling it: the guitar at its unison (an octave up), the keys two octaves up, or
      // the guitar a 5th over the octave (the bass a 5th below). The lock is measured: |mean| ≤ 12 ms, SD ≤ 18 ms.
      const CELL: [number, number, number][] = [[0, 0.5, 0], [0.5, 0.5, 0], [1, 0.5, 12], [1.5, 0.5, 10], [2, 1, 7], [3, 0.5, 5], [3.5, 0.5, 3], [4, 0.5, 0], [4.5, 0.5, 3], [5, 0.5, 5], [5.5, 0.5, 7], [6, 1, 10], [7, 1, 12]];
      // The 5th unison (op 1) plays its own riff: 16th pick-ups into each group.
      const CELL5: [number, number, number][] = [[0, 0.75, 0], [0.75, 0.25, 0], [1, 0.5, 7], [1.5, 0.5, 5], [2, 0.75, 3], [2.75, 0.25, 3], [3, 1, 5], [4, 0.75, 0], [4.75, 0.25, 0], [5, 0.5, 10], [5.5, 0.5, 7], [6, 0.75, 5], [6.75, 0.25, 3], [7, 1, 0]];
      const line: BN[] = [];
      const cell = s.kind === 'unison-oct' && op % 2 ? CELL5 : CELL;
      for (let r = 0; r < 2; r++) for (const [b, d, iv] of cell) line.push({ b: r * 8 + b, d, p: R + iv, acc: b === 0 || b === 4 });
      line.push({ b: 16, d: 1, p: R });
      const which = s.kind === 'unison' ? 0 : 1 + (op % 2);
      const U: Drill['unison'][] = [{ inst: 'guitar', transpose: 12 }, { inst: 'keys', transpose: 24 }, { inst: 'guitar', transpose: 19 }];
      const N: T2[] = [tt('Unison riff with the guitar', 'ריף באוניסון עם הגיטרה'), tt('Octave unison with the keys', 'אוניסון באוקטבות עם הקלידים'), tt('Unison a 5th below the guitar', 'אוניסון קווינטה מתחת לגיטרה')];
      const d = drillOf(s, tu, pick(line), { ...N[which], chart: bars(4), keyName: km, evenness: false, drums: { groove: 'rock-8' } });
      return { ...d, unison: U[which], goal: { ...d.goal, prog: { unison: UNISON } } };
    }
    case 'runs': {
      // Fast 16th unison runs: chromatic, whole-tone or diminished (half-whole), up a bar and down a bar, twice.
      const SCs = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [0, 2, 4, 6, 8, 10], [0, 1, 3, 4, 6, 7, 9, 10]];
      const sc = SCs[op % 3];
      const up: number[] = [];
      for (let p = R; up.length < 8; p++) if (sc.includes(pc(p - R))) up.push(p);
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        up.forEach((p, k) => line.push({ b: bar * 4 + k / 4, d: 0.25, p, acc: k % 4 === 0 }));
        [...up].reverse().forEach((p, k) => line.push({ b: bar * 4 + 2 + k / 4, d: 0.25, p: k === 7 && bar < 3 ? p : p, acc: k % 4 === 0 }));
      }
      line.push({ b: 16, d: 1, p: R });
      const N: T2[] = [tt('16th unison run: chromatic', 'ריצת אוניסון בשש-עשריות: כרומטית'), tt('16th unison run: whole-tone', 'ריצת אוניסון בשש-עשריות: טון שלם'), tt('16th unison run: diminished', 'ריצת אוניסון בשש-עשריות: מוקטן')];
      const d = drillOf(s, tu, alt(line), { ...N[op % 3], chart: bars(4, spell(key, key)), evenness: false, drums: { groove: 'rock-16' } });
      return { ...d, unison: { inst: 'keys', transpose: 24 }, goal: { ...d.goal, prog: { unison: UNISON } } };
    }
    case 'oddunison': {
      const m = op % 2 ? '11/8 3+3+3+2' : '7/8 2+2+3';
      return planDrill(s, tu, Array.from({ length: 4 }, () => m), op % 2 ? tt('Unison riff in 11/8', 'ריף אוניסון ב-11/8') : tt('Unison riff in 7/8', 'ריף אוניסון ב-7/8'), { pulse: 8, unison: { inst: 'guitar', transpose: 12 }, goal: { groupAccent: 0.3, unison: UNISON }, pick: true });
    }
    case 'sequence': {
      // One riff shape moved to each chord's root (i – ♭VI – ♭III – ♭VII), twice.
      const prog: Prog = [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']];
      const SHAPE = [0, 0, 12, 10, 7, 7, 5, 7];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        SHAPE.forEach((iv, k) => line.push({ b: bar * 4 + k / 2, d: 0.5, p: r + iv - (c[1] === 'M' && iv === 10 ? 1 : 0), acc: k === 0 }));
      });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, pick(line), { ...tt('Sequenced riff through the changes', 'ריף בסקוונצה לאורך המהלך'), chart: prog.map((c) => chordName(key, c, key + 3)), keyName: km, evenness: false, drums: { groove: 'rock-8' } });
    }
    case 'ostinato': {
      // A pedal riff under changing harmony: the bass keeps its riff on the tonic while the chords move over it.
      const RIFF = [0, 0, 12, 0, 10, 0, 7, 5];
      const line: BN[] = [];
      for (let bar = 0; bar < 8; bar++) RIFF.forEach((iv, k) => line.push({ b: bar * 4 + k / 2, d: 0.5, p: R + iv, acc: k === 0 }));
      line.push({ b: 32, d: 1, p: R });
      const over = [`${spell(key, key + 3)}m`, `${spell(key + 8, key + 3)}/${spell(key, key + 3)}`, `${spell(key + 10, key + 3)}/${spell(key, key + 3)}`, `${spell(key + 5, key + 3)}/${spell(key, key + 3)}`];
      return drillOf(s, tu, pick(line), { ...tt('Ostinato under moving chords', 'אוסטינטו מתחת לאקורדים זזים'), chart: [...over, ...over], keyName: km, evenness: false, drums: { groove: 'rock-8' } });
    }
    case 'etude': {
      // A 16-bar prog study: 7/8 riff (4) – 4/4 unison line (4) – pedal ostinato in 4/4 (4) – the 7/8 riff (4).
      const plan = [...Array(4).fill('7/8 2+2+3'), ...Array(8).fill('4/4'), ...Array(4).fill('7/8 2+2+3')] as string[];
      const bs = planBars(plan.map(parseMeter), 8);
      const line: BN[] = [];
      const uni: { beat: number; dur: number; midi: number }[] = [];
      const SCL = [0, 2, 3, 5, 7, 8, 10, 12];
      bs.forEach((b, i) => {
        if (i < 4 || i >= 12) line.push(...riffBar(rootOf(tu, key + [0, 0, 8, 10][i % 4]), b.start, b.beats, b.groups, 1, i));
        else if (i < 8) {
          const up = i % 2 === 0;
          for (let k = 0; k < 8; k++) {
            const p = R + SCL[up ? k : 7 - k];
            line.push({ b: b.start + k, d: 1, p, acc: k % 2 === 0 });
            uni.push({ beat: b.start + k, dur: 1, midi: p + 12 });
          }
        } else [0, 0, 12, 0, 10, 0, 7, 5].forEach((iv, k) => line.push({ b: b.start + k, d: 1, p: R + iv, acc: k === 0 }));
      });
      const total = bs.reduce((a, b) => a + b.beats, 0);
      line.push({ b: total, d: 1, p: R });
      const chart = bs.map((_, i) => (i >= 8 && i < 12 ? [`${spell(key, key + 3)}m`, `${spell(key + 8, key + 3)}/${spell(key, key + 3)}`, `${spell(key + 10, key + 3)}/${spell(key, key + 3)}`, `${spell(key, key + 3)}m`][i - 8] : chordName(key, ODD_PROG[i % 4], key + 3)));
      const d = drillOf(s, tu, pick(line), { ...tt('Prog étude: 16 bars, mixed meter, unison and pedal', 'אטיוד פרוג: 16 תיבות, משקלים מתחלפים, אוניסון ועוגב'), meter: 7, pulse: 8, chart, keyName: km, evenness: false, drums: { groove: 'seven-8', sections: [{ bar: 4, groove: 'rock-8' }, { bar: 12, groove: 'seven-8' }] } });
      const out = withBarPlan(d, plan);
      return { ...out, unison: { inst: 'guitar', line: uni }, goal: { ...out.goal, prog: { unison: UNISON } } };
    }
  }
  throw new Error(`Unknown b-prog kind ${s.kind}`);
}

// ───────────────────────────── J2: b-barry — Barry Harris concepts on the bass ─────────────────────────────

function genBarry(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-barry:${s.kind}:${key}:${op}`);
  const R = rootOf(tu, key);
  const lo = Math.max(lowest(tu), 31);
  const hi = 57;
  switch (s.kind) {
    case 'sixdim': {
      // The 6th-diminished scale (major op 0, minor op 1) in 8ths: up and down from the root, then from the 3rd.
      const sc = op % 2 ? [0, 2, 3, 5, 7, 8, 9, 11] : [0, 2, 4, 5, 7, 8, 9, 11];
      const run = (from: number) => {
        const ps: number[] = [];
        for (let p = R + from; ps.length < 9; p++) if (sc.includes(pc(p - R))) ps.push(p);
        return [...ps.slice(0, 8), ...[...ps].reverse().slice(0, 8)];
      };
      const notes = [...run(0), ...run(op % 2 ? 3 : 4)];
      const line: BN[] = notes.map((p, i) => ({ b: i / 2, d: 0.5, p, ct: i % 2 === 0 }));
      line.push({ b: notes.length / 2, d: 2, p: R, ct: true });
      const nm = op % 2 ? tt('The minor 6th-diminished scale', 'סולם המינור שש-מוקטן') : tt('The major 6th-diminished scale', 'סולם המז׳ור שש-מוקטן');
      return drillOf(s, tu, alt(line), { ...nm, chart: [`${spell(key, key)}${op % 2 ? 'm6' : '6'}`, '%', '%', '%'], evenness: true, ...(op % 2 ? { keyName: `${keyNameOf(key, true)}m` } : {}) });
    }
    case 'dimpass': {
      // A diminished chord as a passing chord in a walk: I – ♯I° – ii – V (op 0) or IV – ♯IV° – I/5 – V (op 1).
      const N = (d: number) => spell(key + d, key);
      const text = op % 2 ? `${N(5)}maj7 | ${N(6)}dim7 | ${N(0)}/${N(7)} | ${N(7)}7 | ${N(5)}maj7 | ${N(6)}dim7 | ${N(0)}/${N(7)} | ${N(7)}7` : `${N(0)}maj7 | ${N(1)}dim7 | ${N(2)}m7 | ${N(7)}7 | ${N(0)}maj7 | ${N(1)}dim7 | ${N(2)}m7 | ${N(7)}7`;
      const ascii = text.replace(/♭/g, 'b').replace(/♯/g, '#');
      const cs = lcText(ascii);
      const line = [...ctWalk(tu, cs), closeOn(tu, key, 32)];
      return drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Passing diminished: IV – ♯IV° – I/5', 'מוקטן עובר: IV – ♯IV° – I/5') : tt('Passing diminished: I – ♯I° – ii', 'מוקטן עובר: I – ♯I° – ii')), chart: text.split('|').map((x) => x.trim()), show: 'chart', bass: { rules: rulesFor(cs, 'walk') }, drums: { groove: 'swing' } });
    }
    case 'halfstep':
    case 'pivot': {
      // The dominant scale descending with Barry's extra half steps: chord tones on every downbeat (8ths), resolving to
      // the tonic. op 0 from the root and the 3rd; op 1 the extended rules from the 5th and the 7th. Pivot: the line
      // breaks up an octave when it runs low (the note an octave up, the line goes on down).
      // Only lines whose every downbeat is a chord tone of the dominant (the rule's point) are used: the extended rule
      // where it keeps that, else the basic one-half-step rule.
      const okLine = (xs: number[]) => xs.every((x, i) => i % 2 === 1 || [0, 4, 7, 10].includes(pc(x)));
      const lineFrom = (deg: number): number[] => [ruleFor(deg, true), ruleFor(deg), 'one' as const].map((r) => barryLine(deg, r)).find(okLine) ?? barryLine(deg, 'one');
      const degs = s.kind === 'pivot' ? [3, 7] : op % 2 ? [5, 7] : [1, 3];
      const line: BN[] = [];
      const cs: LC[] = [];
      let at = 0;
      const V = rootOf(tu, key + 7);
      for (const deg of degs) {
        let semis = lineFrom(deg);
        if (s.kind === 'pivot') {
          const k = semis.findIndex((x, i) => i % 2 === 0 && i >= 6 && x <= 7);
          if (k > 0) semis = pivot(semis, k, 1);
        }
        // Fill the dominant bars to a bar line with the chord's arpeggio (chord tones on the beats).
        const arp = [0, 4, 7, 10, 12, 10, 7, 4];
        let last = semis[semis.length - 1];
        let i = 0;
        while (semis.length % 8 !== 0) {
          const nx = last + (arp[(i + 1) % arp.length] - arp[i % arp.length]);
          semis = [...semis, nx];
          last = nx;
          i++;
        }
        semis.forEach((x, k) => line.push({ b: at + k / 2, d: 0.5, p: V + x, ct: k % 2 === 0 }));
        const barsV = semis.length / 8;
        for (let b = 0; b < barsV; b++) cs.push({ root: pc(key + 7), ct: [0, 4, 7, 10], sc: SC.mix, beats: 4, name: chordName(key, [7, '7']) });
        at += semis.length / 2;
        // The tonic bar: its 3rd, then the 5th and the root.
        const T3 = pitchesIn(key, [4], lo, hi).sort((a, b) => Math.abs(a - (line[line.length - 1].p - 1)) - Math.abs(b - (line[line.length - 1].p - 1)))[0];
        line.push({ b: at, d: 2, p: T3, ct: true }, { b: at + 2, d: 1, p: T3 + 3, ct: true }, { b: at + 3, d: 1, p: T3 - 4, ct: true });
        cs.push({ root: key, ct: [0, 4, 7, 11], sc: SC.ion, beats: 4, name: chordName(key, [0, 'maj7']) });
        at += 4;
      }
      line.push({ b: at, d: 2, p: R + 12 > hi ? R : R + 12, ct: true });
      cs.push({ root: key, ct: [0, 4, 7, 11], sc: SC.ion, beats: 4, name: chordName(key, [0, 'maj7']) });
      const nm = s.kind === 'pivot' ? tt('Pivot: break the line up an octave', 'פיבוט: לשבור את הקו אוקטבה למעלה') : op % 2 ? tt('Half-step rules from the 5th and the 7th', 'חוקי חצי הטון מהקווינטה ומהספטימה') : tt('Half-step rules: chord tones on the beats', 'חוקי חצי הטון: צלילי אקורד על הפעמות');
      return drillOf(s, tu, alt(line), { ...nm, chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: rulesFor(cs, 'downbeatCt', { every: 1 }) }, drums: { groove: 'swing' } });
    }
    case 'walk13': {
      // The same idea in a quarter-note walk: chord tones on 1 and 3, passing notes (scale or chromatic) on 2 and 4.
      const cs = repeatLc(lcOf(key, op % 2 ? PROGS.jazz : PROGS.iivi), 3);
      const line = ctLine(cs, rnd, { per: 1, every: 2, lo: Math.max(lowest(tu), 28), hi: 50, from: R + 7 });
      return drillOf(s, tu, alt(line), { ...tt('Walking: chord tones on 1 and 3, passing notes between', 'ווקינג: צלילי אקורד על 1 ו-3, צלילים עוברים ביניהם'), chart: chartLc(cs), show: 'chart', bass: { rules: rulesFor(cs, 'downbeatCt', { every: 2 }) }, drums: { groove: 'swing' } });
    }
    case 'bebop': {
      // A chorus of bebop lines: ii–V–I (op 0) or the rhythm-changes A section (op 1), chord tones on every beat.
      const cs = op % 2 ? lcText(STANDARD_CHANGES.find((x) => x.id === 'rhythm-a')!.text).map((c) => transposeLc(c, key - 10)) : repeatLc(lcOf(key, PROGS.iivi), 2);
      const line = ctLine(cs, rnd, { per: 2, every: 1, lo, hi, guide: true });
      return drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Bebop lines: rhythm changes', 'קווי ביבופ: ריתם צ׳יינג׳ס') : tt('Bebop lines: ii–V–I', 'קווי ביבופ: ii–V–I')), chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: rulesFor(cs, 'downbeatCt', { every: 1 }) }, drums: { groove: 'swing' } });
    }
  }
  throw new Error(`Unknown b-barry kind ${s.kind}`);
}

// ───────────────────────────── J3: b-impro 7–14 — bebop and chord-scale solos, trading 4s ─────────────────────────────

/** The b-impro kinds built here (levels 7–14). */
export const IMPRO_NICHE = ['enclose', 'bebop-scale', 'iivi-keys', 'altered', 'modal', 'rhythm-solo', 'std-solo', 'trade4'];
export const STD_SOLO: { id: string; key: number; minor?: boolean }[] = [
  { id: 'fly', key: 0 },
  { id: 'autumn', key: 7, minor: true },
  { id: 'tune-up', key: 2 },
  { id: 'solar', key: 0, minor: true },
  { id: 'attya', key: 8 },
];
export function genImproNiche(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-impro:${s.kind}:${key}:${op}`);
  const lo = Math.max(lowest(tu), 31);
  const hi = 57;
  const solo = (cs: LC[], o: Partial<Parameters<typeof ctLine>[2]> = {}) => ctLine(cs, rnd, { per: 2, every: 1, lo, hi, guide: true, ...o });
  const withGuide = (cs: LC[]) => cs.map((c) => ({ ...c, land: guideOf(c) }));
  const target = (cs: LC[]) => rulesFor(cs.map((c) => ({ ...c, land: c.land ?? c.ct })), 'target', { passing: 2 });
  const fin = (cs: LC[], line: BN[], name: T2, extra: Partial<Parameters<typeof drillOf>[3]> = {}) => drillOf(s, tu, alt(line), { ...name, chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: target(cs), swing: { ratio: 1.8, tol: 0.3, sub: 8 } }, drums: { groove: 'swing' }, ...extra });
  switch (s.kind) {
    case 'enclose': {
      // Enclosures: a scale tone above and the half step below, into the 3rd or 7th of every chord (ii–V–I ×2).
      const cs = withGuide(repeatLc(lcOf(key, op % 2 ? [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']] : PROGS.iivi), 2));
      return fin(cs, solo(cs, { enclose: true }), op % 2 ? tt('Enclosures into the guide tones (minor ii–V–i)', 'כליאה של הצלילים המנחים (ii–V–i מינורי)') : tt('Enclosures into the guide tones (ii–V–I)', 'כליאה של הצלילים המנחים (ii–V–I)'), op % 2 ? { keyName: `${keyNameOf(key, true)}m` } : {});
    }
    case 'bebop-scale': {
      // Bebop-scale lines: chord tones on every beat, chromatic passing notes between (I – vi – ii – V ×2).
      const cs = repeatLc(lcOf(key, PROGS.jazz), 2).map((c) => ({ ...c, sc: uniq([...c.sc, c.ct.includes(10) ? 11 : 8]) }));
      return fin(cs, solo(cs, { guide: false }), tt('Bebop scales: chord tones on the beats', 'סולמות ביבופ: צלילי אקורד על הפעמות'), { bass: { rules: rulesFor(cs, 'downbeatCt', { every: 1 }), swing: { ratio: 1.8, tol: 0.3, sub: 8 } } });
    }
    case 'iivi-keys': {
      // ii–V–I solo lines, guide tones on the changes, in every key (the level lists all twelve).
      const cs = withGuide(repeatLc(lcOf(key, PROGS.iivi), 2));
      return fin(cs, solo(cs), tt('ii–V–I lines in every key', 'קווי ii–V–I בכל הסולמות'));
    }
    case 'altered': {
      // Minor ii–V–i with an altered dominant: Locrian, the altered scale, then Dorian on the i.
      const cs: LC[] = withGuide(
        repeatLc(
          [
            { root: pc(key + 2), ct: [0, 3, 6, 10], sc: SC.loc, beats: 4, name: `${spell(key + 2, key + 3)}m7♭5` },
            { root: pc(key + 7), ct: [0, 4, 10], sc: SC.alt, beats: 4, name: `${spell(key + 7, key + 3)}7alt` },
            { root: key, ct: [0, 3, 7, 10], sc: SC.dor, beats: 4, name: `${spell(key, key + 3)}m7` },
            { root: key, ct: [0, 3, 7, 10], sc: SC.dor, beats: 4, name: `${spell(key, key + 3)}m7` },
          ],
          2,
        ),
      );
      return fin(cs, solo(cs), tt('Minor ii–V–i with an altered dominant', 'ii–V–i מינורי עם דומיננטה אלטרד'), { keyName: `${keyNameOf(key, true)}m` });
    }
    case 'modal': {
      // Modal vamps, 8 bars on one chord: Dorian (op 0), Lydian (op 1), sus (op 2); a chord tone on every bar's 1.
      const V: LC[] = [
        { root: key, ct: [0, 3, 7, 10], sc: SC.dor, beats: 4, name: `${spell(key, key + 3)}m7` },
        { root: key, ct: [0, 4, 7, 11], sc: SC.lyd, beats: 4, name: `${spell(key, key)}maj7♯11` },
        { root: key, ct: [0, 5, 7, 10], sc: SC.mix, beats: 4, name: `${spell(key, key + 5)}7sus4` },
      ];
      const cs = repeatLc([V[op % 3]], 8);
      const N: T2[] = [tt('Modal vamp: Dorian', 'וואמפ מודאלי: דורי'), tt('Modal vamp: Lydian', 'וואמפ מודאלי: לידי'), tt('Modal vamp: sus', 'וואמפ מודאלי: sus')];
      return fin(cs, solo(cs, { guide: false }), N[op % 3], op % 3 === 0 ? { keyName: `${keyNameOf(key, true)}m` } : {});
    }
    case 'rhythm-solo': {
      // A solo chorus on the rhythm-changes A section (two chords a bar), landing on a chord tone of each.
      const cs = lcText(STANDARD_CHANGES.find((x) => x.id === 'rhythm-a')!.text).map((c) => transposeLc(c, key - 10));
      return fin(cs, solo(cs, { guide: false }), tt('Solo chorus: rhythm changes', 'סבב סולו: ריתם צ׳יינג׳ס'));
    }
    case 'std-solo': {
      // A solo chorus on a standard, in its own key: a chord tone on every change.
      const st = STD_SOLO[op % STD_SOLO.length];
      const ch = STANDARD_CHANGES.find((x) => x.id === st.id)!;
      const cs = lcText(ch.text);
      const kn = `${keyNameOf(st.key, !!st.minor)}${st.minor ? 'm' : ''}`;
      return fin(cs, solo(cs, { guide: false }), tt(`Solo chorus: ${ch.name}`, `סבב סולו: ${ch.name}`), { keyName: kn, keySig: SIG[st.minor ? mod(st.key + 3, 12) : st.key] });
    }
    case 'trade4': {
      // Trading 4s with the drums: 4 bars of solo, 4 bars of the drummer's solo (the band lays out), back in on the 1.
      const cs = withGuide(repeatLc(lcOf(key, op % 2 ? BLUES.slice(0, 4) : PROGS.iivi), 4));
      const line: BN[] = [];
      for (const b0 of [0, 32]) line.push(...solo(cs.slice(b0 / 4, b0 / 4 + 4), { b0 }).map((x) => (x.b === b0 + 16 ? { ...x, d: 1 } : x)));
      line.push({ b: 64, d: 2, p: pitchesIn(cs[0].root, guideOf(cs[0]), lo, hi).sort((a, b) => Math.abs(a - line[line.length - 1].p) - Math.abs(b - line[line.length - 1].p))[0], ct: true });
      const d = fin(cs, line, tt('Trading 4s with the drums', 'חילופי ארבע עם התופים'), { bass: { rules: target(cs), swing: { ratio: 1.8, tol: 0.3, sub: 8 }, landing: 40 }, drums: { groove: 'swing', fills: [7, 15] } });
      return { ...d, band: d.band ? { ...d.band, rests: [[16, 32], [48, 64]] } : d.band };
    }
  }
  throw new Error(`Unknown b-impro kind ${s.kind}`);
}

// ───────────────────────────── J4: b-jform — form and arrangement ─────────────────────────────

const FORM_GOAL = { lost: 0, landMs: 40, drift: 0.02 };
/** A form drill: the written part per span, the road map on the drill (sections drive drums and band). */
function formDrill(s: DrillSpec, tu: Tuning, plan: FormPlan, part: (span: { section: number; pass: number; startBar: number; bars: number; startBeat: number }, cs: LC[]) => BN[], csOf: (section: number) => LC[], name: T2, close = true): Drill {
  const key = mod(s.key, 12);
  const order = plan.order ?? plan.sections.map((_, i) => i);
  const line: BN[] = [];
  let bar = 0;
  const passes = new Map<number, number>();
  for (const i of order) {
    const sec = plan.sections[i];
    const pass = passes.get(i) ?? 0;
    passes.set(i, pass + 1);
    line.push(...part({ section: i, pass, startBar: bar, bars: sec.bars, startBeat: bar * 4 }, csOf(i)));
    bar += sec.bars;
  }
  if (close) line.push(closeOn(tu, key, bar * 4));
  const d0 = drillOf(s, tu, alt(line), { ...name, evenness: false, drums: { groove: 'swing' }, chart: ['C'] });
  const d = applyForm(d0, plan);
  return { ...d, beats: Math.max(d0.beats, d.beats), goal: { ...d.goal, prog: { form: FORM_GOAL } } };
}
const sec = (name: string, kind: FormSection['kind'], cs: LC[], o: Partial<FormSection> = {}): FormSection => ({ name, kind, bars: Math.round(cs.reduce((a, c) => a + c.beats, 0) / 4), chart: chartLc(cs), ...o });

function genJForm(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const seed = (x: string) => `b-jform:${s.kind}:${key}:${op}:${x}`;
  const blues = lcOf(key, BLUES);
  const A = repeatLc(lcOf(key, PROGS.jazz), 2);
  const B: LC[] = lcOf(key, [[4, '7'], [4, '7'], [9, '7'], [9, '7'], [2, '7'], [2, '7'], [7, '7'], [7, '7']]);
  switch (s.kind) {
    case 'skips': {
      // Two-feel with skips and pushes: halves, a skip note before beat 3, and in every fourth bar the next root pushed
      // onto the "and" of 4 (tied over the bar line).
      const plan: FormPlan = { sections: [sec('Blues', 'head', blues, { feel: '2', groove: 'swing', band: 'swing' })] };
      return formDrill(
        s, tu, plan,
        (sp, cs) => {
          const out: BN[] = [];
          cs.forEach((c, i) => {
            const b0 = sp.startBeat + i * 4;
            const R = rootOf(tu, c.root);
            const nx = rootOf(tu, (cs[i + 1] ?? cs[0]).root);
            const push = i % 4 === 3;
            const pushedIn = i % 4 === 0 && i > 0;
            if (!pushedIn) out.push({ b: b0, d: 1 + 2 / 3, p: R, ct: true });
            out.push({ b: b0 + 1 + 2 / 3, d: 1 / 3, p: R + 12 > 50 ? R : R + 12, ct: true });
            out.push({ b: b0 + 2, d: push ? 1 + 2 / 3 : 2, p: R + 7 > 50 ? R - 5 : R + 7, ct: true });
            // The push sits on the swung "and" of 4 (the last triplet 8th).
            if (push) out.push({ b: b0 + 3 + 2 / 3, d: 1 + 1 / 3, p: nx, ct: true });
          });
          return out;
        },
        () => blues,
        tt('Two-feel with skips and pushes (blues)', 'בשתיים עם קפיצות ודחיפות (בלוז)'),
      );
    }
    case 'aaba': {
      // AABA: the A sections in 2, the bridge walking in 4.
      const plan: FormPlan = { sections: [sec('A', 'head', A, { feel: '2', band: 'swing' }), sec('B', 'bridge', B, { feel: '4', band: 'swing', fillBefore: true })], order: [0, 0, 1, 0] };
      return formDrill(s, tu, plan, (sp, cs) => (sp.section === 1 ? walkOf(tu, cs, seed(`b${sp.pass}`), sp.startBeat) : twoFeel(tu, cs, sp.startBeat)), (i) => (i === 1 ? B : A), tt('AABA: in 2, the bridge in 4', 'AABA: בשתיים, הגשר בארבע'));
    }
    case 'pedal': {
      // A dominant-pedal intro (the V in quarters under the chords), the head walking, a pedal interlude, the last A.
      const ped = lcOf(key, [[2, 'm7'], [7, '7'], [2, 'm7'], [7, '7']]).map((c) => ({ ...c, name: c.root === pc(key + 2) ? `${c.name}/${spell(key + 7, key)}` : c.name }));
      const head = repeatLc(lcOf(key, PROGS.iivi), 2);
      const plan: FormPlan = { sections: [sec('Intro', 'intro', ped, { band: 'swing' }), sec('A', 'head', head, { band: 'swing' }), sec('Interlude', 'interlude', ped, { band: 'swing' }), sec('A', 'head', lcOf(key, PROGS.iivi), { band: 'swing' })] };
      const V = rootOf(tu, key + 7);
      return formDrill(
        s, tu, plan,
        (sp, cs) => (sp.section === 0 || sp.section === 2 ? Array.from({ length: sp.bars * 4 }, (_, k) => ({ b: sp.startBeat + k, d: 1, p: k % 4 === 3 ? V + 12 : V, ct: true })) : walkOf(tu, cs, seed(`h${sp.section}`), sp.startBeat)),
        (i) => (i === 0 || i === 2 ? ped : i === 1 ? head : lcOf(key, PROGS.iivi)),
        tt('Dominant-pedal intro and interlude', 'פתיחה ומעבר על עוגב דומיננטי'),
      );
    }
    case 'stops': {
      // Stop-time: the band hits each 1 for 4 bars (one short note with it), then 8 bars of walking. Two choruses.
      const first = blues.slice(0, 4);
      const rest = blues.slice(4);
      const plan: FormPlan = { sections: [sec('Stops', 'head', first, { groove: 'stop', band: 'stop', hits: [0, 4, 8, 12] }), sec('Swing', 'solo', rest, { groove: 'swing', band: 'swing' })], order: [0, 1, 0, 1] };
      return formDrill(s, tu, plan, (sp, cs) => (sp.section === 0 ? cs.map((c, i) => ({ b: sp.startBeat + i * 4, d: 1, p: rootOf(tu, c.root), ct: true })) : walkOf(tu, cs, seed(`w${sp.pass}`), sp.startBeat)), (i) => (i === 0 ? first : rest), tt('Stop-time hits, then walking (blues)', 'עצירות עם הלהקה, ואז ווקינג (בלוז)'));
    }
    case 'tag': {
      // The last A, a tag (iii–VI–ii–V turned around three times), and the final hit.
      const lastA = repeatLc(lcOf(key, PROGS.jazz), 2);
      const tag: LC[] = lcOf(key, [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']], 2);
      const end: LC[] = lcOf(key, [[0, 'maj7']]);
      const plan: FormPlan = { sections: [sec('Last A', 'head', lastA, { band: 'swing' }), sec('Tag', 'tag', tag, { band: 'swing' }), sec('End', 'outro', end, { groove: 'stop', band: 'stop', hits: [0] })], order: [0, 1, 1, 1, 2] };
      return formDrill(s, tu, plan, (sp, cs) => (sp.section === 2 ? [{ b: sp.startBeat, d: 1, p: rootOf(tu, key), ct: true }] : walkOf(tu, cs, seed(`t${sp.section}:${sp.pass}`), sp.startBeat)), (i) => (i === 0 ? lastA : i === 1 ? tag : end), tt('Tag ending: three times round, then the hit', 'סיום בטאג: שלוש פעמים, ואז המכה'), false);
    }
    case 'latin-swing': {
      // Latin A, swing B: the A sections in the bossa figure, the bridge walking in swing.
      const minor = repeatLc(lcOf(key, [[0, 'm7'], [5, 'm7'], [2, 'm7b5'], [7, '7']]), 2);
      const plan: FormPlan = { sections: [sec('A', 'head', minor, { groove: 'bossa', band: 'bossa' }), sec('B', 'bridge', A, { groove: 'swing', band: 'swing', fillBefore: true })], order: [0, 0, 1, 0] };
      return formDrill(
        s, tu, plan,
        (sp, cs) => {
          if (sp.section === 1) return walkOf(tu, cs, seed(`b${sp.pass}`), sp.startBeat);
          return cs.flatMap((c, i) => {
            const R = rootOf(tu, c.root);
            const f = R + 7 > 50 ? R - 5 : R + 7;
            const b0 = sp.startBeat + i * 4;
            return [{ b: b0, d: 1.5, p: R, ct: true }, { b: b0 + 1.5, d: 0.5, p: f, ct: true }, { b: b0 + 2, d: 1.5, p: f, ct: true }, { b: b0 + 3.5, d: 0.5, p: R, ct: true }];
          });
        },
        (i) => (i === 1 ? A : minor),
        tt('Latin A sections, swing bridge', 'קטעי A לטיניים, גשר בסווינג'),
      );
    }
    case 'tune': {
      // A whole tune: the head in 2, two choruses walking, the out-head in 2 (blues).
      const plan: FormPlan = { sections: [sec('Head', 'head', blues, { feel: '2', band: 'swing' }), sec('Walk', 'solo', blues, { feel: '4', band: 'swing', fillBefore: true })], order: [0, 1, 1, 0] };
      return formDrill(s, tu, plan, (sp, cs) => (sp.section === 0 ? twoFeel(tu, cs, sp.startBeat) : walkOf(tu, cs, seed(`w${sp.pass}`), sp.startBeat)), () => blues, tt('A whole tune: head in 2, two choruses, out-head', 'שיר שלם: נושא בשתיים, שני סבבים, נושא סוגר'));
    }
  }
  throw new Error(`Unknown b-jform kind ${s.kind}`);
}

// ───────────────────────────── L1: b-latin — Afro-Cuban and Brazilian bass ─────────────────────────────

function genLatin(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const R = rootOf(tu, key);
  const km = `${keyNameOf(key, true)}m`;
  const five = (r: number) => (r + 7 > 50 ? r - 5 : r + 7);
  switch (s.kind) {
    case 'tumbao':
    case 'tumbao23': {
      // The tumbao: the "and" of 2 and beat 4, nothing on 1 (the note on 4 rings over the bar line). 3-2 clave on one
      // chord; 2-3 clave over i – V7 (two bars each), the note on 4 the coming chord's root.
      const two = s.kind === 'tumbao23';
      const prog: Prog = two ? [[0, 'm'], [0, 'm'], [7, '7'], [7, '7'], [0, 'm'], [0, 'm'], [7, '7'], [0, 'm']] : Array.from({ length: 8 }, (): [number, Q] => [0, 'm']);
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        const nx = rootOf(tu, key + (prog[bar + 1] ?? prog[0])[0]);
        line.push({ b: bar * 4 + 1.5, d: 1.5, p: five(r), ct: true }, { b: bar * 4 + 3, d: bar === prog.length - 1 ? 1 : 2.5, p: bar === prog.length - 1 ? R : nx, ct: true });
      });
      return drillOf(s, tu, alt(line), { ...(two ? tt('Tumbao with 2-3 clave: i – V7', 'טומבאו עם קלאבה 2-3: i – V7') : tt('Tumbao on one chord, 3-2 clave', 'טומבאו על אקורד אחד, קלאבה 3-2')), chart: prog.map((c) => chordName(key, c, key + 3)), keyName: km, evenness: false, drums: { groove: two ? 'clave-23' : 'clave-32' }, band: 'latin' });
    }
    case 'montuno': {
      // Tumbao over montuno changes (I–IV–V–IV, op 0; ii–V–I–I, op 1): free choice by the rules — the note on 4 is the
      // NEXT chord's root (or 5th), anticipated by a beat; the "and" of 2 a tone of the chord.
      const prog: Prog = op % 2 ? [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7'], [2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']] : [[0, 'M'], [5, 'M'], [7, 'M'], [5, 'M'], [0, 'M'], [5, 'M'], [7, 'M'], [5, 'M']];
      const cs = lcOf(key, prog).map((c) => ({ ...c, land: [0, 7] }));
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        const nx = rootOf(tu, key + (prog[bar + 1] ?? prog[0])[0]);
        line.push({ b: bar * 4 + 1.5, d: 1.5, p: five(r), ct: true }, { b: bar * 4 + 3, d: bar === prog.length - 1 ? 1 : 2.5, p: nx, ct: true });
      });
      return drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Tumbao over ii–V–I: anticipate each change', 'טומבאו על ii–V–I: להקדים כל חילוף') : tt('Tumbao over I–IV–V–IV: anticipate each change', 'טומבאו על I–IV–V–IV: להקדים כל חילוף')), chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: rulesFor(cs, 'target', { anticipate: 1 }) }, drums: { groove: 'clave-32' }, band: 'latin' });
    }
    case 'chacha': {
      // Cha-cha: the root on 1, the 5th on the "and" of 2, and the "cha-cha" on 4 and its "and" leading to the next.
      const prog: Prog = [[0, 'M'], [7, '7'], [0, 'M'], [7, '7'], [5, 'M'], [7, '7'], [0, 'M'], [0, 'M']];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        const nx = rootOf(tu, key + (prog[bar + 1] ?? prog[0])[0]);
        line.push({ b: bar * 4, d: 1.5, p: r, ct: true }, { b: bar * 4 + 1.5, d: 1.5, p: five(r), ct: true }, { b: bar * 4 + 3, d: 0.5, p: r + 12 > 50 ? r : r + 12, ct: true }, { b: bar * 4 + 3.5, d: 0.5, p: nx + (nx > r ? -1 : 1), ct: false });
      });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...tt('Cha-cha', 'צ׳ה-צ׳ה'), chart: prog.map((c) => chordName(key, c)), evenness: false, drums: { groove: 'cha-cha' }, band: 'latin' });
    }
    case 'songo':
    case 'mozambique': {
      // Songo (16th syncopation around the kick) or Mozambique (the bass with the bell's push), two-bar cells on i – IV7.
      const moz = s.kind === 'mozambique';
      const CELLS = moz ? ['x..x..x...x.x...', '..x..x..x..x..x.'] : ['x..x..x....x..x.', '...x..x...x..x..'];
      const IV = moz ? [0, 7, 12, 7, 10, 0] : [0, 12, 7, 10, 7, 0];
      const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7'], [0, 'm7'], [0, 'm7'], [5, '7'], [7, '7']];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        const cell = CELLS[bar % 2];
        let k = 0;
        [...cell].forEach((ch, i) => {
          if (ch !== 'x') return;
          line.push({ b: bar * 4 + i / 4, d: 0.5, p: r + IV[k++ % IV.length] - (IV[(k - 1) % IV.length] === 12 && r + 12 > 52 ? 12 : 0), ct: true, acc: i === 0 });
        });
      });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...(moz ? tt('Mozambique', 'מוזמביק') : tt('Songo', 'סונגו')), chart: prog.map((c) => chordName(key, c, key + 3)), keyName: km, evenness: false, drums: { groove: 'songo' }, band: 'latin' });
    }
    case 'afro68': {
      // Afro-Cuban 6/8 (the bembé bell): one beat = a dotted quarter, triplet 8ths; root – 5th – ♭7 cell per beat pair.
      const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, 'm7'], [7, '7'], [0, 'm7'], [0, 'm7'], [5, 'm7'], [0, 'm7']];
      const CELL: [number, number, number][] = [[0, 1, 0], [5 / 3, 1 / 3, 7], [2, 2 / 3, 12], [8 / 3, 2 / 3, 10], [10 / 3, 2 / 3, 7]];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        for (const [b, d, iv] of CELL) line.push({ b: bar * 4 + b, d, p: r + (r + iv > 52 ? iv - 12 : iv), ct: true, acc: b === 0 });
      });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...tt('Afro-Cuban 6/8 (bembé)', 'אפרו-קובני 6/8 (במבה)'), chart: prog.map((c) => chordName(key, c, key + 3)), keyName: km, evenness: false, drums: { groove: '6-8-afro' }, band: 'latin' });
    }
    case 'brazil': {
      // Brazilian 16ths: partido alto (op 0) or baião (op 1), on I – V7.
      const prog: Prog = [[0, 'M'], [0, 'M'], [7, '7'], [7, '7'], [0, 'M'], [0, 'M'], [7, '7'], [0, 'M']];
      const CELL: [number, number, number][] = op % 2 ? [[0, 0.75, 0], [0.75, 0.25, 7], [1, 1, 12], [2, 0.75, 0], [2.75, 0.25, 7], [3, 1, 10]] : [[0, 0.5, 0], [0.75, 0.25, 12], [1.5, 0.5, 7], [2.25, 0.5, 0], [3, 0.5, 7], [3.5, 0.5, 10]];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        for (const [b, d, iv] of CELL) line.push({ b: bar * 4 + b, d, p: r + (r + iv > 52 ? iv - 12 : iv) - (c[1] === 'M' && iv === 10 ? 1 : 0), ct: true, acc: b === 0 });
      });
      line.push({ b: 32, d: 1, p: R });
      return drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Baião', 'באיון') : tt('Partido alto', 'פרטידו אלטו')), chart: prog.map((c) => chordName(key, c)), evenness: false, drums: { groove: 'samba' }, band: 'latin' });
    }
    case 'latin-jazz': {
      // Latin jazz on a minor standard: free choice, the root of every new chord anticipated on the "and" before it.
      const id = op % 2 ? 'song-father' : 'blue-bossa';
      const st = STANDARD_CHANGES.find((x) => x.id === id)!;
      const cs = lcText(st.text).map((c) => ({ ...c, land: [0] }));
      const line: BN[] = [];
      let at = 0;
      cs.forEach((c) => {
        const r = rootOf(tu, c.root);
        // The chord's own 5th (♭5 on m7♭5); an altered dominant written without one: its ♭7.
        const f = [7, 6, 8, 10].find((x) => c.ct.includes(x)) ?? 0;
        line.push({ b: Math.max(0, at - 0.5), d: 2, p: r, ct: true });
        if (c.beats >= 4) line.push({ b: at + 1.5, d: 2, p: r + f > 50 ? r + f - 12 : r + f, ct: true });
        at += c.beats;
      });
      line.push({ b: at - 0.5, d: 1.5, p: rootOf(tu, cs[0].root), ct: true });
      for (let i = 0; i < line.length - 1; i++) line[i].d = Math.min(line[i].d, line[i + 1].b - line[i].b);
      const home = id === 'song-father' ? 5 : 0;
      return drillOf(s, tu, alt(line), { ...tt(`Latin jazz: ${st.name}, anticipate the changes`, `ג׳אז לטיני: ${st.name}, להקדים את החילופים`), keyName: `${keyNameOf(home, true)}m`, keySig: SIG[mod(home + 3, 12)], chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: rulesFor(cs, 'target', { anticipate: 0.5 }) }, drums: { groove: 'tumbao' }, band: 'latin' });
    }
  }
  throw new Error(`Unknown b-latin kind ${s.kind}`);
}

// ───────────────────────────── dispatch and catalogue ─────────────────────────────

/** Build a drill of one of the families here (called from bass.ts generateBass). */
export function generateBassNiche(s: DrillSpec, tu: Tuning): Drill {
  switch (s.family as BassFamilyId) {
    case 'b-swing':
      return genSwing(s, tu);
    case 'b-odd':
      return genOdd(s, tu);
    case 'b-poly':
      return genPoly(s, tu);
    case 'b-prog':
      return genProgB(s, tu);
    case 'b-barry':
      return genBarry(s, tu);
    case 'b-jform':
      return genJForm(s, tu);
    case 'b-latin':
      return genLatin(s, tu);
    case 'b-impro':
      return genImproNiche(s, tu);
  }
  throw new Error(`Not a niche bass family: ${s.family}`);
}

type LFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type FamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
const spOf =
  (family: BassFamilyId) =>
  (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'bass', ...o });

/** The jazz-track families (after b-walk / b-impro in teaching order). */
export function jazzFamilies(L: LFn, fam: FamFn): GuitarFamilyDef[] {
  const SW = spOf('b-swing');
  const BH = spOf('b-barry');
  const JF = spOf('b-jform');
  const LA = spOf('b-latin');
  const Qn = 'quarters';
  const K = [5, 10, 7, 0, 3];
  return [
    fam('b-swing', 'Swing time', 'זמן סווינג', [
      L('b-swing', 1, 'Long quarters', 'רבעים ארוכים', [SW('long', { perBeat: 1 })], K, [100, 160], Qn),
      L('b-swing', 2, 'On top of the beat', 'על הקצה של הפעמה', [SW('place', { perBeat: 1, option: 0 })], K, [120, 180], Qn),
      L('b-swing', 3, 'Centred and laid back, on request', 'במרכז ומאחורי הפעמה, לפי בקשה', [SW('place', { perBeat: 1, option: 1 }), SW('place', { perBeat: 1, option: 2 })], K, [120, 180], Qn),
      L('b-swing', 4, 'The drums drop out', 'התופים יוצאים', [SW('dropout', { perBeat: 1 })], K, [140, 200], Qn),
      L('b-swing', 5, 'Three choruses without drift', 'שלושה סבבים בלי לזוז בטמפו', [SW('choruses', { perBeat: 1 })], K, [160, 220], Qn),
      L('b-swing', 6, 'Up-tempo walking', 'ווקינג בטמפו מהיר', [SW('uptempo', { perBeat: 1 }), SW('uptempo', { perBeat: 1, option: 1 })], [10, 5, 3], [220, 280], Qn),
      L('b-swing', 7, 'Very fast: in 2 and in 4', 'מהיר מאוד: בשתיים ובארבע', [SW('two-four', { perBeat: 1 })], [10, 5], [240, 320], 'halves / quarters'),
    ]),
    fam('b-barry', 'Barry Harris on the bass', 'בארי האריס על הבס', [
      L('b-barry', 1, 'The 6th-diminished scale', 'סולם השש-מוקטן', [BH('sixdim', { swing: true }), BH('sixdim', { swing: true, option: 1 })], [0, 5, 7, 10], [80, 140], 'swung 8ths'),
      L('b-barry', 2, 'Diminished as a passing chord', 'מוקטן כאקורד עובר', [BH('dimpass', { perBeat: 1 }), BH('dimpass', { perBeat: 1, option: 1 })], [0, 5, 7, 10], [100, 160], Qn),
      L('b-barry', 3, 'Half-step rules: chord tones on the beats', 'חוקי חצי הטון: צלילי אקורד על הפעמות', [BH('halfstep', { swing: true }), BH('halfstep', { swing: true, option: 1 })], [0, 5, 7, 10, 3], [90, 160], 'swung 8ths'),
      L('b-barry', 4, 'The rule in a walk: 1 and 3', 'החוק בווקינג: 1 ו-3', [BH('walk13', { perBeat: 1 }), BH('walk13', { perBeat: 1, option: 1 })], [0, 5, 7, 10, 3], [110, 180], Qn),
      L('b-barry', 5, 'Pivots: break the line', 'פיבוט: לשבור את הקו', [BH('pivot', { swing: true })], [0, 5, 7, 10, 3], [100, 160], 'swung 8ths'),
      L('b-barry', 6, 'A chorus of bebop lines', 'סבב של קווי ביבופ', [BH('bebop', { swing: true }), BH('bebop', { swing: true, option: 1 })], [0, 5, 10, 3], [120, 200], 'swung 8ths'),
    ]),
    fam('b-jform', 'Form and arrangement', 'צורה ועיבוד', [
      L('b-jform', 1, 'Two-feel with skips and pushes', 'בשתיים עם קפיצות ודחיפות', [JF('skips', { perBeat: 0.5 })], [5, 10, 7], [100, 160], 'halves'),
      L('b-jform', 2, 'AABA: 2 to 4 on the bridge', 'AABA: משתיים לארבע בגשר', [JF('aaba', { perBeat: 1 })], [0, 5, 10, 3], [120, 180], 'halves / quarters'),
      L('b-jform', 3, 'Pedal intros and interludes', 'פתיחות ומעברים על עוגב', [JF('pedal', { perBeat: 1 })], [0, 5, 10, 7], [100, 160], Qn),
      L('b-jform', 4, 'Stop-time and ensemble hits', 'עצירות ומכות עם הלהקה', [JF('stops', { perBeat: 1 })], [5, 10, 7], [120, 200], Qn),
      L('b-jform', 5, 'Tags and endings', 'טאגים וסיומים', [JF('tag', { perBeat: 1 })], [0, 5, 10, 3], [120, 180], Qn),
      L('b-jform', 6, 'Latin A, swing B', 'A לטיני, B בסווינג', [JF('latin-swing', { perBeat: 1 })], [0, 5, 7, 2], [120, 180], 'bossa / quarters'),
      L('b-jform', 7, 'A whole tune: head, choruses, out-head', 'שיר שלם: נושא, סבבים, נושא סוגר', [JF('tune', { perBeat: 1 })], [5, 10, 7], [120, 200], 'halves / quarters'),
    ]),
    fam('b-latin', 'Afro-Cuban and Brazilian bass', 'בס אפרו-קובני וברזילאי', [
      L('b-latin', 1, 'Tumbao on one chord, 3-2 clave', 'טומבאו על אקורד אחד, קלאבה 3-2', [LA('tumbao', { minor: true })], [9, 2, 7, 0], [80, 120], E8),
      L('b-latin', 2, 'Tumbao with 2-3 clave', 'טומבאו עם קלאבה 2-3', [LA('tumbao23', { minor: true })], [9, 2, 7, 0], [80, 120], E8),
      L('b-latin', 3, 'Tumbao over montuno changes', 'טומבאו על מהלכי מונטונו', [LA('montuno'), LA('montuno', { option: 1 })], [0, 5, 7, 10], [90, 140], E8),
      L('b-latin', 4, 'Cha-cha', 'צ׳ה-צ׳ה', [LA('chacha')], [0, 5, 7, 10], [100, 130], E8),
      L('b-latin', 5, 'Songo', 'סונגו', [LA('songo', { minor: true, perBeat: 4 })], [9, 2, 4, 7], [100, 130], S16),
      L('b-latin', 6, 'Mozambique', 'מוזמביק', [LA('mozambique', { minor: true, perBeat: 4 })], [9, 2, 4, 7], [100, 130], S16),
      L('b-latin', 7, 'Afro-Cuban 6/8', 'אפרו-קובני 6/8', [LA('afro68', { minor: true, perBeat: 3 })], [9, 2, 4, 7], [56, 84], 'triplets (♩. = beat)'),
      L('b-latin', 8, 'Partido alto and baião', 'פרטידו אלטו ובאיון', [LA('brazil', { perBeat: 4 }), LA('brazil', { perBeat: 4, option: 1 })], [0, 5, 7, 2], [80, 110], S16),
      L('b-latin', 9, 'Latin jazz: anticipate the changes', 'ג׳אז לטיני: להקדים את החילופים', [LA('latin-jazz'), LA('latin-jazz', { option: 1 })], [0], [100, 160], E8),
    ]),
  ];
}
const E8 = '8ths';
const S16 = '16ths';

/** The prog-track families (after b-pick in teaching order). */
export function progFamilies(L: LFn, fam: FamFn): GuitarFamilyDef[] {
  const OD = spOf('b-odd');
  const PG = spOf('b-prog');
  const PY = spOf('b-poly');
  const K = [4, 9, 2, 7];
  return [
    fam('b-odd', 'Odd meters and groupings', 'משקלים אי-זוגיים וקבוצות', [
      L('b-odd', 1, '5/4 as 3+2 and 2+3', '5/4 כ-3+2 וכ-2+3', [OD('five', { minor: true }), OD('five', { minor: true, option: 1 })], K, [70, 140], E8),
      L('b-odd', 2, '7/8 rotations', 'סיבובי 7/8', [0, 1, 2].map((o) => OD('seven', { minor: true, option: o })), K, [140, 240], '8ths (♪ = beat)'),
      L('b-odd', 3, '9/8: 2+2+2+3 and 3+3+3', '9/8: 2+2+2+3 ו-3+3+3', [OD('nine', { minor: true }), OD('nine', { minor: true, option: 1 })], K, [160, 260], '8ths (♪ = beat)'),
      L('b-odd', 4, '11/8 in two groupings', '11/8 בשתי חלוקות', [OD('eleven', { minor: true }), OD('eleven', { minor: true, option: 1 })], K, [160, 260], '8ths (♪ = beat)'),
      L('b-odd', 5, '13/8 and 15/8', '13/8 ו-15/8', [OD('long-odd', { minor: true }), OD('long-odd', { minor: true, option: 1 })], K, [160, 240], '8ths (♪ = beat)'),
      L('b-odd', 6, 'Odd groupings over 4/4', 'קבוצות אי-זוגיות מעל 4/4', [OD('over4', { minor: true, perBeat: 2 }), OD('over4', { minor: true, perBeat: 4, option: 1 })], K, [70, 110], '8ths / 16ths'),
      L('b-odd', 7, 'Mixed meters from a chart', 'משקלים מתחלפים מצ׳ארט', [OD('mixed', { minor: true }), OD('mixed', { minor: true, option: 1 })], K, [160, 260], '8ths (♪ = beat)'),
      L('b-odd', 8, 'Displacement: the riff moved', 'הזזה: הריף זז', [OD('displace', { minor: true }), OD('displace', { minor: true, option: 1 })], K, [70, 110], '8ths / 16ths'),
    ]),
    fam('b-prog', 'Prog riffs and unisons', 'ריפים ואוניסונים של פרוג', [
      L('b-prog', 1, 'Pick riffs over a pedal, 16ths', 'ריפים במפרט מעל עוגב, שש-עשריות', [PG('pedal16', { minor: true, perBeat: 4 })], K, [70, 120], S16),
      L('b-prog', 2, 'Unison riff with the guitar', 'ריף באוניסון עם הגיטרה', [PG('unison', { minor: true })], K, [80, 130], E8),
      L('b-prog', 3, 'Octave and 5th unisons', 'אוניסונים באוקטבה ובקווינטה', [PG('unison-oct', { minor: true }), PG('unison-oct', { minor: true, option: 1 })], K, [80, 130], E8),
      L('b-prog', 4, 'Fast 16th unison runs', 'ריצות אוניסון מהירות בשש-עשריות', [0, 1, 2].map((o) => PG('runs', { perBeat: 4, option: o })), K, [80, 140], S16),
      L('b-prog', 5, 'Odd-meter unison riffs', 'ריפי אוניסון במשקל אי-זוגי', [PG('oddunison', { minor: true }), PG('oddunison', { minor: true, option: 1 })], K, [160, 240], '8ths (♪ = beat)'),
      L('b-prog', 6, 'Sequenced riff through the changes', 'ריף בסקוונצה לאורך המהלך', [PG('sequence', { minor: true })], K, [80, 130], E8),
      L('b-prog', 7, 'Ostinato under moving chords', 'אוסטינטו מתחת לאקורדים זזים', [PG('ostinato', { minor: true })], K, [80, 130], E8),
      L('b-prog', 8, 'A 16-bar prog étude', 'אטיוד פרוג של 16 תיבות', [PG('etude', { minor: true })], K, [140, 240], '8ths (♪ = beat)'),
    ]),
    fam('b-poly', 'Polymeter and metric modulation', 'פולימטר ומודולציה מטרית', [
      L('b-poly', 1, 'A 5-note riff over 4/4', 'ריף של 5 צלילים מעל 4/4', [PY('cycle5', { minor: true })], K, [140, 220], '8ths (♪ = beat)'),
      L('b-poly', 2, 'A 7-note riff over 4/4', 'ריף של 7 צלילים מעל 4/4', [PY('cycle7', { minor: true })], K, [140, 220], '8ths (♪ = beat)'),
      L('b-poly', 3, '3 against 2: dotted quarters', '3 נגד 2: רבעים מנוקדים', [PY('dotted', { minor: true })], K, [140, 220], 'dotted quarters (♪ = beat)'),
      L('b-poly', 4, '4 against 3 over a 3/4 groove', '4 נגד 3 מעל גרוב ב-3/4', [PY('four3', { minor: true })], K, [70, 100], 'dotted 8ths'),
      L('b-poly', 5, 'Metric modulation: triplet quarter = new beat', 'מודולציה מטרית: רבע טריולה = פעמה חדשה', [PY('modtrip', { perBeat: 1 }), PY('modtrip', { perBeat: 1, option: 1 })], [0, 5, 7, 10], [70, 120], Qn0),
      L('b-poly', 6, 'Metric modulation: dotted 8th = new beat', 'מודולציה מטרית: שמינית מנוקדת = פעמה חדשה', [PY('moddot', { perBeat: 1 }), PY('moddot', { perBeat: 1, option: 1 })], [0, 5, 7, 10], [80, 120], Qn0),
      L('b-poly', 7, '7/8 riff against 4/4 drums', 'ריף ב-7/8 מול תופים ב-4/4', [PY('riff78', { minor: true })], K, [140, 220], '8ths (♪ = beat)'),
    ]),
  ];
}
const Qn0 = 'quarters';

/** b-impro levels 7–14 (appended to the family in bass.ts). */
export function improNicheLevels(L: LFn): GuitarLevelDef[] {
  const IM = spOf('b-impro');
  const sw = (kind: string, o: Partial<SpecTemplate> = {}) => IM(kind, { swing: true, ...o });
  const SW8 = 'swung 8ths';
  return [
    L('b-impro', 7, 'Enclosures into 3rds and 7ths', 'כליאה אל טרצות וספטימות', [sw('enclose'), sw('enclose', { option: 1 })], [0, 5, 10, 3], [80, 140], SW8),
    L('b-impro', 8, 'Bebop scales: chord tones on the beats', 'סולמות ביבופ: צלילי אקורד על הפעמות', [sw('bebop-scale')], [0, 5, 10, 3, 7], [90, 160], SW8),
    L('b-impro', 9, 'ii–V–I lines in all 12 keys', 'קווי ii–V–I בכל 12 הסולמות', [sw('iivi-keys')], [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7], [100, 160], SW8),
    L('b-impro', 10, 'Minor ii–V–i and altered dominants', 'ii–V–i מינורי ודומיננטות אלטרד', [sw('altered')], [9, 2, 7, 0, 5], [90, 150], SW8),
    L('b-impro', 11, 'Modal vamps: Dorian, Lydian, sus', 'וואמפים מודאליים: דורי, לידי, sus', [0, 1, 2].map((o) => sw('modal', { option: o })), [2, 7, 9, 4], [90, 140], SW8),
    L('b-impro', 12, 'A solo chorus on rhythm changes', 'סבב סולו על ריתם צ׳יינג׳ס', [sw('rhythm-solo')], [10, 3, 5], [120, 180], SW8),
    L('b-impro', 13, 'A solo chorus on a standard', 'סבב סולו על סטנדרט', [0, 1, 2, 3, 4].map((o) => sw('std-solo', { option: o })), [0], [100, 180], SW8),
    L('b-impro', 14, 'Trading 4s with the drums', 'חילופי ארבע עם התופים', [sw('trade4'), sw('trade4', { option: 1 })], [0, 5, 10, 7], [120, 200], SW8),
  ];
}

// Exam / board tags for the new levels (shown on the level card; the badge counts read them).
export const NICHE_EXAM: Record<string, [string, string][]> = {
  'b-swing-5': [['Berklee', 'jazz time']],
  'b-swing-6': [['Berklee', 'up-tempo walking']],
  'b-impro-14': [['Bagrut', 'trading with the drums']],
  'b-impro-13': [['Bagrut', 'solo on a standard']],
  'b-jform-7': [['Bagrut', 'pieces with a band']],
  'b-odd-2': [['RSL', '8']],
  'b-latin-1': [['Berklee', 'Afro-Cuban bass']],
};
