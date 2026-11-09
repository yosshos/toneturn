// The bass course (docs/research/BASS_CURRICULUM.md §5): 14 technique families F1–F14 (b-pluck … b-styles), their
// levels and the generators behind them. Pure and deterministic, like guitar.ts (which builds the drills and owns the
// catalogue). Every line is generated from rules — chord tones, kick lanes, scale steps, style devices — never copied
// from a method book. Pitches are SOUNDING MIDI (open low E = 28). Notes are first written as pitches on a beat grid,
// then placed on the neck by a small hand-position model, so the same exercise works on 4-, 5- and 6-string basses.
//
// NOTE: this module and guitar.ts import each other. Nothing here may use a guitar.ts export at module top level
// (only inside functions), and guitar.ts only calls into this module from inside functions.

import type { BassGoal, Drill, DrillGoal, DrillSpec, FamilyId, BassFamilyId } from './types';
import type { SpecTemplate } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import { finish, genFretting, rng, mod, clamp, NAMES, SIG, modeInts, SCALES, windowScale, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type GuitarStyle, type T2 } from './guitar';
import { parseChart } from '../charts';
import { walkingBass, hashOf, type BandStyle } from '../band';
import { bandStyleOf } from './bassBand';
import { GROOVES } from '../grooves';
import { STANDARD_CHANGES } from '../standards';
import { generateBassEar } from './bassEar';
import { generateUpright } from './upright';
import type { LevelExamTag } from './types';

export const tt = (en: string, he: string): T2 => ({ en, he });

// ───────────────────────────── lines on a beat grid ─────────────────────────────

type Tech = GN['tech'];
type Stroke = GN['stroke'];
/** A bass note before it is placed: beat, length, pitch (+ optional fixed string / fret, technique, accent …). */
export interface BN {
  b: number;
  d: number;
  p: number;
  tech?: Tech;
  acc?: boolean;
  st?: Stroke;
  ct?: boolean;
  /** Fixed place (open strings, one-string drills, octave shapes). */
  s?: number;
  f?: number;
  bend?: number;
  /** More notes sounding with this one (double stops), each placed on another string. */
  with?: { s: number; f: number }[];
}

/** Highest fret the generators use. */
export const MAXF = 21;
/** Root register: E1 and up on 4-string (drop D: D1), the same pitches on 5/6-string (the low B is optional range). */
const floorOf = (tu: Tuning): number => (tu.open.length >= 5 ? 28 : tu.open[tu.open.length - 1]);
/** The root of a pitch class in the bass register (E1 … D♯2). */
export const rootOf = (tu: Tuning, pc: number): number => floorOf(tu) + mod(pc - floorOf(tu), 12);
export const lowest = (tu: Tuning): number => tu.open[tu.open.length - 1];
/** Highest fret: 21 on electric basses; 24 on the upright (the fingerboard to the double octave, ABRSM 3-octave scales). */
const maxF = (tu: Tuning): number => (tu.id === 'upright' ? 24 : MAXF);
const highest = (tu: Tuning): number => tu.open[0] + maxF(tu);
/** Fold a pitch by octaves into the playable range. */
export const fold = (tu: Tuning, p: number): number => {
  let x = p;
  while (x < lowest(tu)) x += 12;
  while (x > highest(tu)) x -= 12;
  return x;
};

/**
 * Place a line on the neck. A greedy hand model: the index finger sits at `pos` and covers pos … pos+span; each
 * note goes to the string / fret that needs the least hand movement (open strings are cheap unless `open: false`).
 */
function placeLine(tu: Tuning, line: BN[], o: { pos?: number; open?: boolean; span?: number; meter?: number } = {}): Ev[] {
  // B8 (0.64): the whole line is planned at once (a shortest path over every string / fret choice), not note by note.
  // Shifts cost more inside a bar than at a bar line (one hand position per bar), and a leap of 7+ frets within half a
  // beat is all but forbidden. Fixed places (open-string drills, octave shapes) stay where they are.
  const n = tu.open.length;
  const span = o.span ?? 3;
  const meter = o.meter ?? 4;
  type C = { s: number; f: number };
  const candsOf = (x: BN): C[] => {
    if (x.s !== undefined) return [{ s: x.s, f: x.f ?? clamp(x.p - tu.open[x.s - 1], 0, maxF(tu)) }];
    const p = fold(tu, x.p);
    const out: C[] = [];
    for (let s = 1; s <= n; s++) {
      const f = p - tu.open[s - 1];
      if (f >= 0 && f <= maxF(tu)) out.push({ s, f });
    }
    return out.length ? out : [{ s: n, f: clamp(p - tu.open[n - 1], 0, maxF(tu)) }];
  };
  const own = (c: C) => (c.f === 0 ? (o.open === false ? 8 : 0.4) : 0) + (c.f > 12 ? 0.04 * (c.f - 12) : 0);
  const first = (c: C) => {
    if (o.pos !== undefined) return c.f === 0 ? 0 : c.f < o.pos ? (o.pos - c.f) * 1.5 : c.f > o.pos + span ? (c.f - o.pos - span) * 1.5 : 0;
    // No position given: start low on the neck, on a low string.
    return (c.f > 9 ? 3 + (c.f - 9) * 0.3 : 0) + (n - c.s) * 0.05;
  };
  const step = (a: C, b: C, dt: number, newBar: boolean): number => {
    let c = Math.abs(a.s - b.s) * 0.25;
    if (a.f > 0 && b.f > 0) {
      const d = Math.abs(a.f - b.f);
      if (d > span) c += (d - span) * (newBar ? 1.2 : 2);
      if (d >= 7 && dt <= 0.5 + 1e-9) c += 40;
      if (a.s === b.s && d >= 7 && dt <= 0.5 + 1e-9) c += 40;
    }
    return c;
  };
  const cands = line.map(candsOf);
  const cost: number[][] = [];
  const back: number[][] = [];
  cands.forEach((cs, i) => {
    cost[i] = [];
    back[i] = [];
    cs.forEach((c, j) => {
      if (i === 0) {
        cost[i][j] = own(c) + first(c);
        back[i][j] = -1;
        return;
      }
      const dt = line[i].b - line[i - 1].b;
      const newBar = Math.floor(line[i].b / meter + 1e-9) !== Math.floor(line[i - 1].b / meter + 1e-9);
      let best = Infinity;
      let bk = 0;
      cands[i - 1].forEach((p, k) => {
        const v = cost[i - 1][k] + step(p, c, dt, newBar);
        if (v < best) ((best = v), (bk = k));
      });
      cost[i][j] = best + own(c);
      back[i][j] = bk;
    });
  });
  const chosen: C[] = [];
  if (line.length) {
    let j = cost[line.length - 1].reduce((bi, v, k, a) => (v < a[bi] ? k : bi), 0);
    for (let i = line.length - 1; i >= 0; i--) {
      chosen[i] = cands[i][j];
      j = back[i][j];
    }
  }
  const evs: Ev[] = [];
  for (const [i, x] of line.entries()) {
    const at = chosen[i];
    const g: GN = { ...at };
    if (x.tech) g.tech = x.tech;
    if (x.acc) g.acc = true;
    if (x.st) g.stroke = x.st;
    if (x.ct !== undefined) g.ct = x.ct;
    if (x.bend) g.bend = x.bend;
    evs.push({ beat: x.b, dur: x.d, notes: [g, ...(x.with ?? []).map((w) => ({ ...w, tech: x.tech, stroke: x.st }))] });
  }
  return evs;
}

/** The string whose fret for pitch class pc is lowest-but-fretted (≤ maxF), lowest strings first. */
function rootPlace(tu: Tuning, pc: number, maxF = 7, strings?: number[]): { s: number; f: number } {
  const n = tu.open.length;
  const ss = strings ?? Array.from({ length: n }, (_, i) => n - i);
  for (const s of ss) {
    const f = mod(pc - tu.open[s - 1], 12);
    if (f <= maxF) return { s, f };
  }
  const s = ss[0];
  return { s, f: mod(pc - tu.open[s - 1], 12) };
}
/** The octave shape: two strings up, two frets up (needs a string two above). */
function octaveShape(tu: Tuning, pc: number, maxF = 7): { lo: { s: number; f: number }; hi: { s: number; f: number } } {
  const n = tu.open.length;
  const ss = Array.from({ length: n }, (_, i) => n - i).filter((s) => s - 2 >= 1 && noteAt(tu, s - 2, 0) - noteAt(tu, s, 0) === 10);
  const lo = rootPlace(tu, pc, maxF, ss.length ? ss : undefined);
  return { lo, hi: { s: lo.s - 2, f: lo.f + 2 } };
}

// ───────────────────────────── harmony ─────────────────────────────

export type Q = 'M' | 'm' | '7' | 'm7' | 'maj7' | 'm7b5' | 'dim7';
export const QI: Record<Q, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9] };
const QS: Record<Q, string> = { M: '', m: 'm', '7': '7', m7: 'm7', maj7: 'maj7', m7b5: 'm7♭5', dim7: '°7' };
export type Prog = [number, Q][];
export const PROGS: Record<string, Prog> = {
  pop: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
  p145: [[0, 'M'], [5, 'M'], [7, 'M'], [5, 'M']],
  rock: [[0, 'M'], [10, 'M'], [5, 'M'], [0, 'M']],
  p1451: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
  jazz: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']],
  iivi: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']],
  minor: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, '7']],
  vamp: [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']],
};
export const BLUES: Prog = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d): [number, Q] => [d, '7']);
export const chordName = (key: number, [d, q]: [number, Q]): string => NAMES[mod(key + d, 12)] + QS[q];
export const chartOf = (key: number, prog: Prog): string[] => prog.map((c) => chordName(key, c));
const dur = (xs: BN[]): number => Math.max(0, ...xs.map((x) => x.b + x.d));

// ───────────────────────────── a drill from a line ─────────────────────────────

interface Out {
  en: string;
  he: string;
  /** Per-bar chord names shown above the notes. */
  chart?: string[];
  goal?: Partial<DrillGoal>;
  bass?: BassGoal;
  meter?: number;
  click?: Drill['click'];
  evenness?: boolean;
  pos?: number;
  open?: boolean;
  span?: number;
  keySig?: string;
  /** The key named in the title (standards in their own key); default the spec key. */
  keyName?: string;
  /** B5: drums under the take (headphones / line-in); the kick lane is copied to goal.bass.kickLane. */
  drums?: Drill['drums'];
  /** B3 / B10: chart only (free choice / chart reading), or notation forced (reading). */
  show?: Drill['show'];
  freeFrom?: number;
  /** B7: eighth-note meter (7/8). */
  pulse?: 8;
  /** Ear drills: what the band plays. */
  listen?: Drill['listen'];
  untimed?: Drill['untimed'];
  bow?: Drill['bow'];
  /** The harmony band's style (default: from the drum groove), or false for drums only. */
  band?: BandStyle | false;
  /** Quick study: seconds to read before Play. */
  prep?: number;
  /** Ear transcription: write the line after playing it. */
  write?: Drill['write'];
}
export function drillOf(s: DrillSpec, tu: Tuning, line: BN[], o: Out): Drill {
  const key = mod(s.key, 12);
  const k = o.keyName ?? `${NAMES[key]}${s.minor ? 'm' : ''}`;
  const evs = placeLine(tu, line, { pos: o.pos, open: o.open, span: o.span, meter: o.meter });
  const bass: BassGoal | undefined = o.bass || o.drums ? { ...(o.bass ?? {}) } : undefined;
  const d0 = { beats: dur(line), meter: o.meter ?? 4 };
  if (o.drums && bass) bass.kickLane = drumHits(o.drums, d0.beats, d0.meter, o.pulse).filter((h) => h.d === 'k').map((h) => h.beat);
  const goal: Partial<DrillGoal> = { ...(o.goal ?? {}), ...(bass ? { bass } : {}) };
  const d = finish(s, tu, evs, { title: tt(`${o.en} · ${k}`, `${o.he} · ${k}`), bpm: s.tempo ?? 80, evenness: o.evenness ?? true, goal, meter: o.meter, keySig: o.keySig });
  if (o.chart) d.chart = o.chart;
  if (o.click && o.click !== 'all') d.click = o.click;
  if (o.drums) d.drums = o.drums;
  // The harmony band (bassBand.ts): every drill with drums and a chord chart gets the band's comping in the groove's style.
  if (o.drums && d.chart?.some((c) => /[A-G]/.test(c)) && o.band !== false) d.band = { style: o.band ?? bandStyleOf(o.drums.groove) };
  if (o.show) d.show = o.show;
  if (o.freeFrom !== undefined) d.freeFrom = o.freeFrom;
  if (o.pulse) d.pulse = o.pulse;
  if (o.listen) d.listen = o.listen;
  if (o.untimed) d.untimed = o.untimed;
  if (o.bow) d.bow = o.bow;
  if (o.prep) d.prep = o.prep;
  if (o.write) d.write = o.write;
  return d;
}

/**
 * The drum hits of a groove under a drill (B5): kick and snare (and hats) per bar from the GROOVES lanes, a fill in the
 * `fills` bars (snare 16ths into toms on beats 3–4, crash on the next 1). Beats from beat 0 of the drill.
 */
export function drumHits(dr: NonNullable<Drill['drums']>, beats: number, meter = 4, pulse?: 8): { beat: number; d: 'k' | 's' | 'h' | 'tom-hi' | 'tom-lo' | 'crash' }[] {
  const g0 = GROOVES.find((x) => x.id === dr.groove);
  if (!g0) return [];
  const out: { beat: number; d: 'k' | 's' | 'h' | 'tom-hi' | 'tom-lo' | 'crash' }[] = [];
  const bars = Math.ceil(beats / meter - 1e-9);
  const fills = new Set(dr.fills ?? []);
  // Feel changes (pocket L7): the groove of a bar is the last section starting at or before it.
  const grooveAt = (bar: number) => {
    const sec = [...(dr.sections ?? [])].filter((x) => x.bar <= bar).sort((a, b) => b.bar - a.bar)[0];
    return (sec && GROOVES.find((x) => x.id === sec.groove)) || g0;
  };
  for (let bar = 0; bar < bars; bar++) {
    const g = grooveAt(bar);
    // One step in drill beats: eighth-note grooves (den 8, sub 2) step one eighth = one drill beat when the drill counts eighths.
    const stepB = g.den === 8 && g.sub === 2 ? (pulse === 8 ? 1 : 0.5) : 1 / g.sub;
    const steps = Math.round(meter / stepB);
    const b0 = bar * meter;
    if (fills.has(bar)) {
      // A fill: groove on the first half, then 16th snare into the toms, crash on the next bar's 1.
      const half = meter / 2;
      for (let i = 0; i < steps && i * stepB < half; i++) {
        if (g.k[i % g.k.length] === 'x') out.push({ beat: b0 + i * stepB, d: 'k' });
        if (g.s[i % g.s.length] === 'x') out.push({ beat: b0 + i * stepB, d: 's' });
      }
      for (let q = 0; q < half * 4; q++) out.push({ beat: b0 + half + q / 4, d: q < half * 2 ? 's' : q < half * 3 ? 'tom-hi' : 'tom-lo' });
      if (b0 + meter < beats) out.push({ beat: b0 + meter, d: 'crash' });
      continue;
    }
    for (let i = 0; i < steps; i++) {
      const at = b0 + i * stepB;
      if (at >= beats - 1e-9) break;
      if (g.k[i % g.k.length] === 'x') out.push({ beat: at, d: 'k' });
      if (g.s[i % g.s.length] === 'x') out.push({ beat: at, d: 's' });
      if (g.h[i % g.h.length] === 'x') out.push({ beat: at, d: 'h' });
    }
  }
  return out;
}

/** Repeat a one-bar figure over a progression: fig(rootPitch, chord, bar) → notes relative to the bar. */
export function overProg(tu: Tuning, key: number, prog: Prog, fig: (R: number, c: [number, Q], bar: number, next: number) => BN[], beatsPerBar = 4): BN[] {
  const out: BN[] = [];
  prog.forEach((c, bar) => {
    const R = rootOf(tu, key + c[0]);
    // B4: the last bar leads to the closing tonic (every line ends on it), not back round to the first chord.
    const next = bar === prog.length - 1 ? rootOf(tu, key) : rootOf(tu, key + prog[bar + 1][0]);
    for (const x of fig(R, c, bar, next)) out.push({ ...x, b: bar * beatsPerBar + x.b });
  });
  return out;
}
/** A closing note (the tonic) after `beats`. */
export const endOn = (tu: Tuning, key: number, beats: number, len = 2): BN => ({ b: beats, d: len, p: rootOf(tu, key) });
/** Notes from a 16-step string per bar: each char → a note (or '.' rest); lengths run to the next note. */
function grid(cells: string, map: (c: string, i: number) => BN | null, steps = 16, beats = 4): BN[] {
  const out: BN[] = [];
  const idx = [...cells].map((c, i) => (c === '.' ? -1 : i)).filter((i) => i >= 0);
  idx.forEach((i, k) => {
    const n = map(cells[i], i);
    if (!n) return;
    const nextI = k + 1 < idx.length ? idx[k + 1] : steps;
    out.push({ ...n, b: (i * beats) / steps, d: n.d || ((nextI - i) * beats) / steps });
  });
  return out;
}

/** Kick-drum steps of a groove (den 4) as beats in one bar. */
function kickBeats(id: string): number[] {
  const g = GROOVES.find((x) => x.id === id)!;
  const out: number[] = [];
  [...g.k].forEach((c, i) => {
    if (c === 'x') out.push(i / g.sub);
  });
  return out;
}
/** A root line on every kick hit (one chord per bar). */
function kickLine(tu: Tuning, key: number, prog: Prog, kicks: number[], beatsPerBar = 4): BN[] {
  return overProg(
    tu,
    key,
    prog,
    (R) =>
      kicks.map((b, i) => ({ b, d: (i + 1 < kicks.length ? kicks[i + 1] : beatsPerBar) - b, p: R, st: 'i' as Stroke })),
    beatsPerBar,
  );
}

// ───────────────────────────── generators per family ─────────────────────────────

const STROKES: Stroke[] = ['i', 'm'];
/** Alternate the plucking fingers (or pick strokes) on every attacked note; hammer-ons, pull-offs and slides get none. */
export const alt = (xs: BN[], set: Stroke[] = STROKES): BN[] => {
  let k = 0;
  return xs.map((x) => (x.st || x.tech === 'hammer' || x.tech === 'pull' || x.tech === 'slide' ? x : { ...x, st: set[k++ % set.length] }));
};
/** Strings low → high. */
const lowToHigh = (tu: Tuning): number[] => Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);

function genPluck(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const strs = lowToHigh(tu);
  const open = (str: number, b: number, d = 0.5): BN => ({ b, d, p: tu.open[str - 1], s: str, f: 0, tech: 'rest-stroke' });
  switch (s.kind) {
    case 'open': {
      // 8 notes on each open string, then a cycle low → high → low (op 1: pairs, to hear the two fingers side by side).
      const line: BN[] = [];
      let b = 0;
      for (const str of strs) for (let k = 0; k < 8; k++) (line.push(open(str, b)), (b += 0.5));
      const cyc = op === 1 ? strs.flatMap((x) => [x, x]) : [...strs, ...strs.slice(1, -1).reverse()];
      for (let r = 0; r < 2; r++) for (const str of cyc) (line.push(open(str, b)), (b += 0.5));
      line.push({ ...open(strs[0], b), d: 1 });
      return drillOf(s, tu, alt(line), op === 1 ? { en: 'Even fingers: open strings, i-m', he: 'אצבעות שוות: מיתרים פתוחים, i-m', bass: { asym: { ms: 8, db: 2.5 } } } : { en: 'Alternating rest strokes on open strings', he: 'מכות נשענות מתחלפות על מיתרים פתוחים', bass: { loudSd: 3 } });
    }
    case 'lowest': {
      // Placement task 0: the lowest open string, four whole notes — the pitch heard tells a 4- from a 5-string bass.
      const line: BN[] = [0, 4, 8, 12].map((b) => ({ ...open(strs[0], b, 4), tech: undefined }));
      return drillOf(s, tu, line, { en: 'Your lowest open string', he: 'המיתר הפתוח הנמוך ביותר', evenness: false });
    }
    case 'cross': {
      // Adjacent string crossing: one (op 0) or two (op 1) notes per string, up and down.
      const per = op === 1 ? 2 : 1;
      const cyc = [...strs, ...strs.slice(1, -1).reverse()];
      const line: BN[] = [];
      let b = 0;
      for (let r = 0; r < (per === 1 ? 4 : 2); r++) for (const str of cyc) for (let k = 0; k < per; k++) (line.push(open(str, b)), (b += 0.5));
      line.push({ ...open(strs[0], b), d: 1 });
      return drillOf(s, tu, alt(line), { en: `String crossing, ${per} per string`, he: `מעבר מיתרים, ${per} לכל מיתר`, bass: { crossing: 8 } });
    }
    case 'skip': {
      // String skipping: the octave shape (root ↔ two strings up) over I–IV–V–I.
      const line: BN[] = [];
      [0, 5, 7, 0].forEach((d, bar) => {
        const { lo, hi } = octaveShape(tu, key + d);
        for (let k = 0; k < 8; k++) line.push({ b: bar * 4 + k / 2, d: 0.5, p: 0, ...(k % 2 ? hi : lo) });
      });
      const { lo } = octaveShape(tu, key);
      line.push({ b: 16, d: 1, p: 0, ...lo });
      return drillOf(s, tu, alt(line.map((x) => ({ ...x, p: noteAt(tu, x.s!, x.f!) }))), { en: 'String skipping: octave shapes', he: 'דילוג מיתרים: צורות אוקטבה', bass: { crossing: 10 } });
    }
    case 'stamina': {
      // 16ths: two bars on the root, then one bar per chord of I–vi–IV–V, then the root again.
      const prog: Prog = [[0, 'M'], [0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M']];
      const line = overProg(tu, key, prog, (R) => Array.from({ length: 16 }, (_, k) => ({ b: k / 4, d: 0.25, p: R, acc: k % 4 === 0 })));
      line.push(endOn(tu, key, 24, 1));
      return drillOf(s, tu, alt(line), { en: '16th-note stamina', he: 'סיבולת בשש-עשריות', bass: { drift: 0.15 }, chart: ['', '', ...chartOf(key, prog.slice(2))] });
    }
    case 'accent16': {
      // 16ths with the accent on 1, e, and, a (op 0–3); op 4: a crescendo over two bars.
      const cresc = op >= 4;
      const line = overProg(tu, key, PROGS.p1451, (R) => Array.from({ length: 16 }, (_, k) => ({ b: k / 4, d: 0.25, p: R, acc: !cresc && k % 4 === op })));
      line.push(endOn(tu, key, 16, 1));
      const where = ['1', 'e', 'and', 'a'][op % 4];
      const whereHe = ['1', 'e', 'וְ', 'a'][op % 4];
      return drillOf(s, tu, alt(line), cresc ? { en: '16ths with a crescendo', he: 'שש-עשריות בקרשנדו', goal: { dynamics: 'cresc' } } : { en: `16ths, accent on "${where}"`, he: `שש-עשריות, הדגשה על "${whereHe}"` });
    }
    case 'rake': {
      // Descending triads across the strings (raking: one finger can fall to the next string).
      const line = overProg(tu, key, PROGS.p1451, (R, c) => {
        const ints = QI[c[1]];
        const down = [R + 12 + ints[1], R + 12, R + ints[2], R];
        return [...down, ...down].map((p, k) => ({ b: k / 2, d: 0.5, p }));
      });
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Raking: descending arpeggios', he: 'גריפה: ארפג׳יו יורד', bass: { crossing: 8 }, open: false });
    }
    case 'gallop': {
      // The gallop (8th + two 16ths): two bars on the tonic, then i–♭VI–♭VII–i.
      const prog: Prog = [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M'], [0, 'm']];
      const line = overProg(tu, key, prog, (R) => [0, 1, 2, 3].flatMap((b) => [{ b, d: 0.5, p: R, acc: true, st: 'i' as Stroke }, { b: b + 0.5, d: 0.25, p: R, st: 'm' as Stroke }, { b: b + 0.75, d: 0.25, p: R, st: 'a' as Stroke }]));
      line.push(endOn(tu, key, 20, 1));
      return drillOf(s, tu, line, { en: 'Three-finger gallop', he: 'גאלופ בשלוש אצבעות', chart: chartOf(key, prog) });
    }
    case 'zone': {
      // The same line twice: near the neck (warm), then near the bridge (tight).
      const fig = (R: number): BN[] => [0, 7, 12, 7, 0, 7, 12, 7].map((x, k) => ({ b: k / 2, d: 0.5, p: R + x }));
      const line = overProg(tu, key, [...PROGS.p1451, ...PROGS.p1451], fig);
      line.push(endOn(tu, key, 32, 1));
      // A12 / N7: the bridge half must be brighter than the neck half of the SAME take (the player's own neck tone is
      // the calibration, every take); mic only — a MIDI bass has no tone.
      return drillOf(s, tu, alt(line), { en: 'Plucking zones: 4 bars near the neck, 4 near the bridge', he: 'אזורי פריטה: 4 תיבות ליד הצוואר, 4 ליד הגשר', chart: chartOf(key, [...PROGS.p1451, ...PROGS.p1451]), bass: { zone: 1.15 } });
    }
  }
  throw new Error(`Unknown b-pluck kind ${s.kind}`);
}

function genFret(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = tu.open.length;
  switch (s.kind) {
    case 'spider':
      return genFretting(s, tu);
    case 'simandl': {
      // Simandl 1-2-4: a whole step under three fingers, on the two lowest strings, up and back.
      const p = Math.max(1, mod(key - tu.open[n - 1], 12) || 12);
      const up: BN[] = [];
      for (const str of [n, n - 1]) [0, 1, 2].forEach((k) => up.push({ b: 0, d: 0.5, p: 0, s: str, f: p + k }));
      const seq = [...up, ...up.slice(0, -1).reverse()];
      const line = [...seq, ...seq].map((x, i) => ({ ...x, b: i / 2, p: noteAt(tu, x.s!, x.f!) }));
      line[line.length - 1].d = 1;
      const d = drillOf(s, tu, alt(line), { en: 'Simandl fingering 1-2-4', he: 'אצבוע סימנדל 1-2-4' });
      for (const nt of d.notes) if (nt.fret && nt.fret > 0) ((nt.pos = p), (nt.finger = [1, 2, 4][nt.fret - p] ?? nt.finger));
      return d;
    }
    case 'one-string': {
      // A major scale on one string (A, op 1: D), shifting on a guide finger.
      // B8: each option has its own pair of strings (op 0: A, else E; op 1: D, else G), so the two never collapse.
      const [want, other] = op === 1 ? [n - 2, n - 3] : [n - 1, n];
      const str = mod(key - tu.open[want - 1], 12) <= 9 ? want : other;
      const f0 = mod(key - tu.open[str - 1], 12);
      const ints = [...modeInts(0), 12];
      const ps = [...ints, ...ints.slice(0, -1).reverse()];
      const line = [...ps, 0].map((x, i) => ({ b: i / 2, d: 0.5, p: noteAt(tu, str, f0 + x), s: str, f: f0 + x }));
      line[line.length - 1].d = 1;
      return drillOf(s, tu, alt(line), { en: 'Major scale on one string', he: 'סולם מז׳ור על מיתר אחד', bass: { shiftGap: 40 } });
    }
    case '2oct': {
      // Two-octave major scale with one or two shifts.
      const R = rootOf(tu, key);
      const ints = modeInts(0);
      const up = [...ints, ...ints.map((x) => x + 12), 24].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line = ps.map((p, i) => ({ b: i / 2, d: 0.5, p }));
      line[line.length - 1].d = 1;
      return drillOf(s, tu, alt(line), { en: 'Two-octave major scale with shifts', he: 'סולם מז׳ור בשתי אוקטבות עם מעברי מצב', open: false, bass: { shiftGap: 40 } });
    }
    case 'stretch': {
      // Whole-tone stretches p, p+2, p+4 per string (op 0 low register, op 1 an octave up).
      const p = Math.max(1, mod(key - tu.open[n - 1], 12) || 12) + (op === 1 ? 12 : 0);
      const pp = p + 4 > MAXF ? p - 12 : p;
      const up: BN[] = [];
      for (let str = Math.min(n, 4); str >= 1; str--) [0, 2, 4].forEach((k) => up.push({ b: 0, d: 0.5, p: noteAt(tu, str, pp + k), s: str, f: pp + k }));
      const seq = [...up, ...up.slice(0, -1).reverse()].map((x, i) => ({ ...x, b: i / 2 }));
      seq[seq.length - 1].d = 1;
      return drillOf(s, tu, alt(seq), { en: op === 1 ? 'Stretches, high register' : 'Pivot stretches, low register', he: op === 1 ? 'מתיחות, אזור גבוה' : 'מתיחות ופיבוט, אזור נמוך', span: 5 });
    }
    case 'oct10': {
      // op 0: octave shapes over I–IV–V–I; op 1: 10ths as broken pairs.
      const line = overProg(tu, key, PROGS.p1451, (R, c) => {
        const up = op === 1 ? R + 12 + QI[c[1]][1] : R + 12;
        return Array.from({ length: 8 }, (_, k) => ({ b: k / 2, d: 0.5, p: k % 2 ? up : R }));
      });
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: op === 1 ? 'Broken 10ths' : 'Octave shapes', he: op === 1 ? 'דצימות שבורות' : 'צורות אוקטבה', chart: chartOf(key, PROGS.p1451), open: false });
    }
    case 'upper': {
      // Above the 12th fret: a one-octave major scale in position, then the arpeggio.
      // The root at fret 12 or above on a low string with two strings above it: the lowest such fret.
      const cands = Array.from({ length: n }, (_, i) => n - i)
        .filter((x) => x >= 3)
        .map((x) => ({ s: x, f: mod(key - tu.open[x - 1], 12) + 12 }));
      const { s: str, f } = cands.reduce((a, b) => (b.f < a.f ? b : a));
      const R = noteAt(tu, str, f);
      const sc = windowScale(tu, key, modeInts(0), f - 1, f + 4).filter((x) => noteAt(tu, x.s, x.f) >= R && noteAt(tu, x.s, x.f) <= R + 12);
      const arp = [0, 4, 7, 12, 7, 4, 0].map((x) => R + x);
      const line: BN[] = [...sc, ...sc.slice(0, -1).reverse()].map((x, i) => ({ b: i / 2, d: 0.5, p: noteAt(tu, x.s, x.f), s: x.s, f: x.f }));
      const b0 = dur(line);
      arp.forEach((p, i) => line.push({ b: b0 + i / 2, d: i === arp.length - 1 ? 1 : 0.5, p }));
      return drillOf(s, tu, alt(line), { en: 'Upper register: above the 12th fret', he: 'אזור גבוה: מעל הסריג ה-12', pos: f - 1, open: false });
    }
  }
  throw new Error(`Unknown b-fret kind ${s.kind}`);
}

function genLength(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'rests': {
      // Real rests: play – rest – play – rest, then play – play – rest – rest (op 1: a fretted root, never open).
      const R = op === 1 ? rootOf(tu, key) + 12 : rootOf(tu, key);
      const pats = [[0, 2], [0, 1], [0, 2, 3], [0]];
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) for (const b of pats[bar]) line.push({ b: bar * 4 + b, d: 1, p: R + (b === 3 ? 7 : 0) });
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, line, { en: op === 1 ? 'Real rests, fretted' : 'Real rests, open string', he: op === 1 ? 'הפסקות אמיתיות, צליל לחוץ' : 'הפסקות אמיתיות, מיתר פתוח', bass: { lengths: true, ringThrough: 1 }, open: op !== 1, evenness: false });
    }
    case 'stacc': {
      // Two bars full value, then the same two bars short (staccato), R–5–8–5 over I–IV.
      const fig = (len: number) => (R: number): BN[] => [0, 7, 12, 7, 0, 7, 12, 7].map((x, k) => ({ b: k / 2, d: len, p: R + x }));
      const prog: Prog = [[0, 'M'], [5, 'M']];
      const line = [...overProg(tu, key, prog, fig(0.5)), ...overProg(tu, key, prog, fig(0.25)).map((x) => ({ ...x, b: x.b + 8 }))];
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Legato, then staccato', he: 'לגאטו, ואז סטקטו', bass: { lengths: true }, chart: [...chartOf(key, prog), ...chartOf(key, prog)] });
    }
    case 'idle': {
      // Notes on the high strings right after the open low strings: the low strings must stop.
      const line: BN[] = [];
      const n = tu.open.length;
      // B4: the high notes are pinned to the strings above the two lowest (≤ n−2), so the trap strings stay idle.
      const hiStrs = Array.from({ length: n - 2 }, (_, i) => n - 2 - i);
      const hiAt = (p0: number): { s: number; f: number; p: number } => {
        for (const p of [p0, p0 + 12, p0 - 12])
          for (const str of hiStrs) {
            const f = p - tu.open[str - 1];
            if (f >= 1 && f <= 14) return { s: str, f, p };
          }
        const str = hiStrs[hiStrs.length - 1];
        return { s: str, f: clamp(p0 - tu.open[str - 1], 0, MAXF), p: tu.open[str - 1] + clamp(p0 - tu.open[str - 1], 0, MAXF) };
      };
      const R2 = rootOf(tu, key) + 12;
      const hiNotes = [R2, R2 + 4, R2 + 7, R2 + 12].map(hiAt);
      for (let k = 0; k < 16; k++) {
        const b = k;
        const lowStr = k % 2 ? n - 1 : n;
        line.push({ b, d: 0.5, p: tu.open[lowStr - 1], s: lowStr, f: 0 });
        line.push({ b: b + 0.5, d: 0.5, ...hiNotes[k % 4] });
      }
      line.push({ b: 16, d: 1, ...hiNotes[3] });
      return drillOf(s, tu, alt(line), { en: 'Idle strings muted', he: 'השתקת מיתרים לא בשימוש', bass: { lengths: true, ringThrough: 0 } });
    }
    case 'release-and': {
      // Every note held exactly to the "and", then silence (Motown / pop feel).
      const line = overProg(tu, key, PROGS.pop, (R, c) => [0, 7, 12, QI[c[1]][1] + 12].map((x, k) => ({ b: k, d: 0.5, p: R + x })));
      line.push(endOn(tu, key, 16, 0.5));
      return drillOf(s, tu, alt(line), { en: 'Release on the "and"', he: 'לשחרר על ה"וְ"', bass: { lengths: true, release: { ms: 40 } }, chart: chartOf(key, PROGS.pop), evenness: false });
    }
    case 'oct-mute': {
      // Disco octaves: the low note must stop the moment the octave sounds.
      const line = overProg(tu, key, PROGS.pop, (R) => Array.from({ length: 8 }, (_, k) => ({ b: k / 2, d: 0.5, p: k % 2 ? R + 12 : R })));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Muted octaves', he: 'אוקטבות מושתקות', bass: { lengths: true, overlap: 30 }, chart: chartOf(key, PROGS.pop), open: false });
    }
    case 'thumb-mute': {
      // Thumb + palm mute (reggae / vintage Motown): short, round notes.
      const prog: Prog = [[0, 'm'], [5, 'm'], [0, 'm'], [7, 'M']];
      const line = overProg(tu, key, prog, (R, c) =>
        [
          [0, 1, 0],
          [1.5, 0.5, 7],
          [2, 1, 12],
          [3, 0.5, QI[c[1]][1] + 12],
          [3.5, 0.5, 7],
        ].map(([b, d, x]) => ({ b, d, p: R + x, tech: 'mute' as Tech, st: 'p' as Stroke })),
      );
      line.push({ ...endOn(tu, key, 16, 1), tech: 'mute', st: 'p' });
      return drillOf(s, tu, line, { en: 'Thumb and palm mute', he: 'אגודל והשתקת כף יד', chart: chartOf(key, prog), evenness: false });
    }
    case 'mixed-len': {
      // A 2-bar groove with written lengths: long, short, held, clipped.
      const fig: [number, number, number][] = [
        [0, 3, 0],
        [3, 1, 0],
        [6, 2, 7],
        [8, 4, 12],
        [12, 1, 10],
        [14, 2, 7],
      ];
      const line = overProg(tu, key, PROGS.vamp, (R) => fig.map(([i, l, x]) => ({ b: i / 4, d: l / 4, p: R + x })));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Note lengths in a groove', he: 'אורכי צלילים בתוך גרוב', bass: { lengths: true }, chart: chartOf(key, PROGS.vamp), evenness: false });
    }
  }
  throw new Error(`Unknown b-length kind ${s.kind}`);
}

function genTime(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const R = rootOf(tu, key);
  const eighths = (prog: Prog) => overProg(tu, key, prog, (r) => Array.from({ length: 8 }, (_, k) => ({ b: k / 2, d: 0.5, p: r, acc: k % 2 === 0 })));
  switch (s.kind) {
    case 'pulse': {
      const line = overProg(tu, key, PROGS.p1451, (r) => [0, 1, 2, 3].map((b) => ({ b, d: 1, p: r })));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Quarter-note pulse', he: 'דופק ברבעים', chart: chartOf(key, PROGS.p1451), drums: { groove: 'rock-8' } });
    }
    case 'trip': {
      // A bar of 8ths, a bar of 8th triplets, twice.
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        const per = bar % 2 ? 3 : 2;
        for (let k = 0; k < 4 * per; k++) line.push({ b: bar * 4 + k / per, d: 1 / per, p: R + (bar >= 2 ? 7 : 0), acc: k % per === 0 });
      }
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, alt(line), { en: '8ths and 8th triplets', he: 'שמיניות וטריולות שמיניות', bass: { subBias: 15 } });
    }
    case 'subs': {
      // Quarters → 8ths → triplets → 16ths, one bar each, without moving the pulse.
      const line: BN[] = [];
      [1, 2, 3, 4].forEach((per, bar) => {
        for (let k = 0; k < 4 * per; k++) line.push({ b: bar * 4 + k / per, d: 1 / per, p: R, acc: k % per === 0 });
      });
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, alt(line), { en: 'Switching subdivisions: ♩ → 8ths → triplets → 16ths', he: 'מעבר חלוקות: ♩ ← שמיניות ← טריולות ← שש-עשריות', bass: { subBias: 15 } });
    }
    case 'click': {
      // Root 8ths with the click only on 2 & 4 (op 0), only on the "and" (op 1), only on 1 (op 2), or fading out (op 3).
      const mode = (['24', 'and', 'one', 'fade'] as const)[op % 4];
      const prog = op === 3 ? [...PROGS.pop, ...PROGS.pop] : PROGS.p1451;
      const line = eighths(prog);
      line.push(endOn(tu, key, prog.length * 4, 1));
      const nm = [
        tt('Click on 2 and 4', 'קליק על 2 ו-4'),
        tt('Click on the "and"', 'קליק על ה"וְ"'),
        tt('One click per bar', 'קליק אחד לתיבה'),
        tt('The click drops out', 'הקליק נעלם'),
      ][op % 4];
      // A8: with one click a bar (op 2) the tempo must not drift between the clicks (≤ 20 ms a bar), nor the evenness.
      return drillOf(s, tu, alt(line), { ...nm, click: mode, chart: chartOf(key, prog), ...(op % 4 === 2 ? { bass: { barDrift: 20, drift: 0.2 } } : {}) });
    }
    case 'synco': {
      // Anticipations: the next chord's root arrives on the "and" of 4 and is tied over the bar line.
      const prog = PROGS.pop;
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        const nx = rootOf(tu, key + prog[(bar + 1) % prog.length][0]);
        const b0 = bar * 4;
        if (bar === 0) line.push({ b: 0, d: 1.5, p: r });
        line.push({ b: b0 + 1.5, d: 1, p: r }, { b: b0 + 2.5, d: 1, p: r + 7 });
        line.push({ b: b0 + 3.5, d: bar === prog.length - 1 ? 1.5 : 2, p: bar === prog.length - 1 ? rootOf(tu, key) : nx, acc: true });
      });
      return drillOf(s, tu, alt(line), { en: 'Syncopation and anticipations', he: 'סינקופות והקדמות', chart: chartOf(key, prog), evenness: false, drums: { groove: 'pop-1' } });
    }
    case 'synco16': {
      // 16th-note rhythm cards (funk): displaced figures, read off the grid.
      const rnd = rng(`b-time:synco16:${key}:${op}`);
      const CARDS = ['x..x..x...x..x..', 'x.x...xx..x.x...', 'x..x.x...x.x..x.', '..x.x..xx...x.x.', 'x...x.xx.x..x...', 'x.xx..x..x..x.x.'];
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        const card = CARDS[Math.floor(rnd() * CARDS.length)];
        const r = rootOf(tu, key + [0, 0, 5, 7][bar]);
        line.push(...grid(card, (_, i) => ({ b: 0, d: 0, p: r + (i % 8 === 6 ? 12 : i % 8 === 3 ? 7 : 0) })).map((x) => ({ ...x, b: x.b + bar * 4, d: Math.min(x.d, 0.5) })));
      }
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: '16th syncopation from rhythm cards', he: 'סינקופות בשש-עשריות מכרטיסי מקצב', evenness: false, bass: { subBias: 15 } });
    }
    case 'odd': {
      // Odd meters on roots: 5/4 (op 0), 7/4 (op 1), 7/8 as 2+2+3 (op 2: one beat = one 8th).
      const meter = op === 0 ? 5 : 7;
      const groups = op === 2 ? [0, 2, 4] : op === 0 ? [0, 3] : [0, 4];
      const prog: Prog = [[0, 'm'], [0, 'm'], [10, 'M'], [5, 'M']];
      const line: BN[] = [];
      const per = op === 2 ? 1 : 2;
      prog.forEach((c, bar) => {
        const r = rootOf(tu, key + c[0]);
        for (let k = 0; k < meter * per; k++) {
          const beat = k / per;
          line.push({ b: bar * meter + beat, d: 1 / per, p: r + (k === meter * per - 1 ? 7 : k % (2 * per) === per && op !== 2 ? 12 : 0), acc: groups.includes(beat) });
        }
      });
      line.push({ b: 4 * meter, d: 1, p: rootOf(tu, key) });
      const nm = ['5/4', '7/4', '7/8 (2+2+3)'][op % 3];
      return drillOf(s, tu, alt(line), { en: `Odd meter ${nm}`, he: `משקל אי-זוגי ${nm}`, meter, pulse: op === 2 ? 8 : undefined, chart: chartOf(key, prog), drums: { groove: ['five-4', 'seven-4', 'seven-8'][op % 3] } });
    }
  }
  throw new Error(`Unknown b-time kind ${s.kind}`);
}

const KICK_ROCK = ['rock-8', 'rock-8b', 'pop-1', 'pop-2'];
const KICK_FUNK = ['funk-1', 'funk-2', 'boombap', 'rnb'];
function genPocket(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'kick':
    case 'kick-chart':
    case 'kick16': {
      // The bass line IS the kick lane of a drum groove (rock, pop or 16th funk), roots on one chord or a chart.
      const id = (s.kind === 'kick16' ? KICK_FUNK : KICK_ROCK)[op % 4];
      const prog: Prog = s.kind === 'kick' ? [[0, 'M'], [0, 'M'], [0, 'M'], [0, 'M']] : s.kind === 'kick16' ? PROGS.vamp : op % 2 ? PROGS.p145 : PROGS.pop;
      const line = kickLine(tu, key, prog, kickBeats(id));
      line.push(endOn(tu, key, 16, 1));
      const g = GROOVES.find((x) => x.id === id)!;
      return drillOf(s, tu, alt(line), { en: `Lock with the kick: ${g.name.en}`, he: `נעילה עם הבס-דראם: ${g.name.he}`, bass: { kick: s.kind === 'kick16' ? 20 : 25 }, chart: s.kind === 'kick' ? undefined : chartOf(key, prog), evenness: false, drums: { groove: id } });
    }
    case 'shuffle': {
      // Triplet shuffle on roots: long–short on every beat.
      const line = overProg(tu, key, PROGS.p1451, (R) => [0, 1, 2, 3].flatMap((b) => [{ b, d: 2 / 3, p: R, acc: true }, { b: b + 2 / 3, d: 1 / 3, p: R }]));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Shuffle feel on roots', he: 'תחושת שאפל על יסודות', chart: chartOf(key, PROGS.p1451), evenness: false, bass: { swing: { ratio: 2, tol: 0.15, sub: 8 } }, drums: { groove: 'shuffle' } });
    }
    case 'swing16': {
      // B9: swung 16ths (neo-soul / hip-hop) that really swing: every "e" and "a" lands late (60 : 40), at least four
      // swung notes a bar, on the kick's downbeats plus 16th pickups (two cell sets).
      const SW = 0.3;
      const cells = op % 2 ? ['R.xR', 'x5.R', 'R.R7', '.RxO'] : ['RxRx', '.x5R', 'R.xO', 'x.R7'];
      const line = overProg(tu, key, PROGS.vamp, (R) =>
        cells.flatMap((cell, beat) =>
          [...cell].flatMap((ch, i): BN[] => {
            if (ch === '.') return [];
            const n = cellNote(R, ch);
            const at = beat + (i === 0 ? 0 : i === 1 ? SW : i === 2 ? 0.5 : 0.5 + SW);
            const d = i === 0 ? SW : i === 1 ? 0.5 - SW : i === 2 ? SW : 0.5 - SW;
            return [{ ...n, b: at, d }];
          }),
        ),
      );
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Swung 16ths', he: 'שש-עשריות בסווינג', chart: chartOf(key, PROGS.vamp), bass: { kick: 25, swing: { ratio: 1.5, tol: 0.1, sub: 16 } }, evenness: false, drums: { groove: op % 2 ? 'boombap' : 'rnb' } });
    }
    case 'pocket': {
      // The same groove three times — on the beat, laid back, on top (the ladder judges against the click for now).
      const prog: Prog = [...PROGS.pop.slice(0, 2), ...PROGS.pop.slice(0, 2), ...PROGS.pop.slice(0, 2)];
      const line = kickLine(tu, key, prog, kickBeats('rock-8b'));
      line.push(endOn(tu, key, prog.length * 4, 1));
      return drillOf(s, tu, alt(line), { en: 'Pocket on purpose: on, 15 ms behind, 10 ms ahead', he: 'כיס מכוון: על הפעמה, 15 מ״ש מאחור, 10 מ״ש מקדימה', chart: chartOf(key, prog), bass: { kick: 25, pocket: [0, 15, -10] }, evenness: false, drums: { groove: 'rock-8b' } });
    }
    case 'halftime': {
      // Eight bars in time, then the drums go half-time for eight: two groove sections, the bass follows each kick lane.
      const prog: Prog = [...PROGS.pop, ...PROGS.pop];
      const a = kickLine(tu, key, prog, kickBeats('rock-8b'));
      const b = kickLine(tu, key, prog, kickBeats('half-time')).map((x) => ({ ...x, b: x.b + 32 }));
      const line = [...a, ...b, endOn(tu, key, 64, 1)];
      return drillOf(s, tu, alt(line), { en: 'Half-time feel change: 8 bars in time, 8 half-time', he: 'מעבר לחצי זמן: 8 תיבות בזמן, 8 בחצי זמן', chart: [...chartOf(key, prog), ...chartOf(key, prog)], bass: { kick: 25 }, evenness: false, drums: { groove: 'rock-8b', sections: [{ bar: 8, groove: 'half-time' }] } });
    }
    case 'fills': {
      // Three bars of groove, a bar of space for the drummer's fill, land on 1. Twice.
      const prog: Prog = [...PROGS.pop.slice(0, 3), [7, 'M'], ...PROGS.pop.slice(0, 3), [7, 'M']];
      const kicks = kickBeats('rock-8b');
      const line = overProg(tu, key, prog, (R, _c, bar) => (bar % 4 === 3 ? [{ b: 0, d: 1, p: R }] : kicks.map((b, i) => ({ b, d: (kicks[i + 1] ?? 4) - b, p: R }))));
      line.push({ ...endOn(tu, key, 32, 1), acc: true });
      return drillOf(s, tu, alt(line), { en: 'Land on 1 after the fill', he: 'לנחות על 1 אחרי המילוי', chart: chartOf(key, prog), evenness: false, bass: { kick: 25, landing: 15 }, drums: { groove: 'rock-8b', fills: [3, 7] } });
    }
  }
  throw new Error(`Unknown b-pocket kind ${s.kind}`);
}

/** Funk cells (one beat of 16ths): R root, O octave, 5 fifth, 7 ♭7, x ghost, H hammer from 2 below, S slide from 2 below. */
const FUNK_CELLS = ['R.x.', 'R.xO', 'x.R.', 'R..x', 'x.O.', 'R.x5', '..xR', 'O.x7', 'R.7.', 'x.xR'];
function cellLine(tu: Tuning, key: number, prog: Prog, rnd: () => number, bars: number, cells = FUNK_CELLS, first = 'R...'): BN[] {
  const out: BN[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const c = prog[bar % prog.length];
    const R = rootOf(tu, key + c[0]);
    let pat = '';
    for (let beat = 0; beat < 4; beat++) pat += beat === 0 && bar % 2 === 0 ? first : cells[Math.floor(rnd() * cells.length)];
    for (const x of grid(pat, (ch) => cellNote(R, ch))) out.push(...expandCell(x, bar * 4, out[out.length - 1]));
  }
  return out;
}
function cellNote(R: number, ch: string): BN {
  const off: Record<string, number> = { R: 0, O: 12, '5': 7, '7': 10, x: 0, H: 2, S: 0, T: 0, P: 12, Q: 10 };
  const n: BN = { b: 0, d: 0, p: R + (off[ch] ?? 0) };
  if (ch === 'x') n.tech = 'dead';
  if (ch === 'H') n.tech = 'hammer';
  if (ch === 'S') n.tech = 'slide';
  if (ch === 'T') n.st = 'p';
  if (ch === 'P' || ch === 'Q') n.st = 'i';
  return n;
}
/**
 * Shift to the bar. A hammer-on / slide starts from the note 2 frets below: the note before when it is that note and
 * still sounding (thumb – hammer), else a picked start note is added a 32nd before.
 */
function expandCell(x: BN, b0: number, prev?: BN): BN[] {
  const d = Math.min(x.d, 0.5);
  if ((x.tech === 'hammer' || x.tech === 'slide') && prev && prev.p === x.p - 2 && !prev.tech && Math.abs(prev.b + prev.d - (b0 + x.b)) < 1e-6) return [{ ...x, b: b0 + x.b, d }];
  if (x.tech === 'hammer') return [{ b: b0 + x.b, d: 0.125, p: x.p - 2 }, { ...x, b: b0 + x.b + 0.125, d: Math.max(0.125, d - 0.125) }];
  if (x.tech === 'slide') return [{ b: b0 + x.b, d: 0.125, p: x.p - 2 }, { ...x, b: b0 + x.b + 0.125, d: Math.max(0.125, d - 0.125) }];
  return [{ ...x, b: b0 + x.b, d }];
}

function genGhost(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']];
  const fig = (cells: string) => overProg(tu, key, prog, (R) => grid(cells, (ch) => cellNote(R, ch)));
  switch (s.kind) {
    case 'ghost8': {
      const line = fig('R.x.R.x.R.x.R.x.').map((x) => ({ ...x, d: 0.5 }));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Dead notes: pitched and ghost 8ths', he: 'צלילים מתים: שמיניות עם צליל ובלי', chart: chartOf(key, prog), bass: { ghostClass: 0.9 } });
    }
    case 'ghost16':
    case 'ghost-dyn': {
      const line = fig('R.xx..xxR.xx..xx').map((x) => ({ ...x, d: 0.25 }));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), s.kind === 'ghost-dyn' ? { en: 'Ghost notes quieter than the notes', he: 'צלילי רפאים שקטים מהצלילים', chart: chartOf(key, prog), bass: { ghostDb: 8, ghostClass: 0.9 }, evenness: false } : { en: 'Ghost notes in 16ths', he: 'צלילי רפאים בשש-עשריות', chart: chartOf(key, prog), evenness: false, bass: { ghostClass: 0.9 } });
    }
    case 'ghost-oct': {
      const line = fig('R.xO..xOR.xO.xO.').map((x) => ({ ...x, d: Math.min(x.d, 0.5) }));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Ghost before the octave', he: 'צליל רפאים לפני האוקטבה', chart: chartOf(key, prog), evenness: false, open: false, bass: { ghostClass: 0.9 } });
    }
    case 'funk-line':
    case 'study': {
      // Generated funk lines: 2-bar cells with ghosts, rests, octave and ♭7 (study: 8 bars, plus hammer-ons and slides).
      const study = s.kind === 'study';
      const rnd = rng(`b-ghost:${s.kind}:${key}:${op}`);
      const cells = study ? [...FUNK_CELLS, 'H.x.', 'S...', 'R.H.', 'x.S.'] : FUNK_CELLS;
      const bars = study ? 8 : 4;
      const two = cellLine(tu, key, prog, rnd, 2, cells);
      // The two-bar line on i, then moved to IV (and, in the study, back to i and up to V).
      const shifts = [0, 5, 0, 7];
      const line: BN[] = [];
      for (let k = 0; k < bars / 2; k++) for (const x of two) line.push({ ...x, b: x.b + k * 8, p: x.p + shifts[k] });
      line.push(endOn(tu, key, bars * 4, 1));
      const ch = Array.from({ length: bars }, (_, i) => chordName(key, shifts[Math.floor(i / 2)] ? [shifts[Math.floor(i / 2)], '7'] : [0, 'm7']));
      return drillOf(s, tu, alt(line), study ? { en: '8-bar funk study: ghosts, slides, hammer-ons', he: 'אטיוד פאנק 8 תיבות: רפאים, החלקות, הקשות', chart: ch, evenness: false, ...(line.some((x) => x.tech === 'dead') ? { bass: { ghostClass: 0.9 } } : {}) } : { en: 'Two-bar funk line', he: 'קו פאנק בשתי תיבות', chart: ch, evenness: false, bass: { ghostClass: 0.9, kick: 25 }, drums: { groove: 'funk-1' } });
    }
  }
  throw new Error(`Unknown b-ghost kind ${s.kind}`);
}

function genChord(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const minor = !!s.minor;
  switch (s.kind) {
    case 'roots': {
      const prog = [PROGS.pop, PROGS.p145, PROGS.rock][op % 3];
      const full = [...prog, ...prog];
      const line = overProg(tu, key, full, (R) => Array.from({ length: 8 }, (_, k) => ({ b: k / 2, d: 0.5, p: R, ct: true })));
      line.push(endOn(tu, key, 32, 1));
      return drillOf(s, tu, alt(line), { en: 'Roots of a chord chart', he: 'יסודות של מהלך אקורדים', chart: chartOf(key, full), show: 'chart' });
    }
    case 'r5': {
      // Root – 5th above – root – 5th below (one octave up when the 5th below is out of range).
      const line = overProg(tu, key, PROGS.pop, (R0) => {
        const R = R0 - 5 < lowest(tu) ? R0 + 12 : R0;
        return [R, R + 7, R, R - 5].map((p, k) => ({ b: k, d: 1, p, ct: true }));
      });
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Root and 5th, above and below', he: 'יסוד וקווינטה, מעל ומתחת', chart: chartOf(key, PROGS.pop) });
    }
    case 'r58': {
      const line = overProg(tu, key, PROGS.p1451, (R) => [0, 7, 12, 7, 0, 7, 12, 7].map((x, k) => ({ b: k / 2, d: 0.5, p: R + x, ct: true })));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Root – 5th – octave', he: 'יסוד – קווינטה – אוקטבה', chart: chartOf(key, PROGS.p1451) });
    }
    case 'triad':
    case 'inv': {
      // Triads up and down one octave (inv: from the 1st inversion, op 2: the 2nd), over I–IV–V–I (minor: i–iv–v–i).
      const q: Q = minor ? 'm' : 'M';
      const prog: Prog = [[0, q], [5, q], [7, minor ? 'm' : 'M'], [0, q]];
      const inv = s.kind === 'inv' ? (op === 2 ? 2 : 1) : 0;
      const line = overProg(tu, key, prog, (R, c) => {
        const ints = QI[c[1]];
        const t4 = [0, 1, 2, 3].map((i) => ints[(i + inv) % 3] + 12 * Math.floor((i + inv) / 3));
        const ud = [t4[0], t4[1], t4[2], t4[3], t4[2], t4[1], t4[0], t4[1]];
        return ud.map((x, k) => ({ b: k / 2, d: 0.5, p: R + x, ct: true }));
      });
      line.push(endOn(tu, key, 16, 1));
      const nm = inv === 0 ? tt('Triad arpeggios', 'ארפג׳יו משולשים') : inv === 1 ? tt('Triads from the 1st inversion', 'משולשים מההיפוך הראשון') : tt('Triads from the 2nd inversion', 'משולשים מההיפוך השני');
      return drillOf(s, tu, alt(line), { ...nm, chart: chartOf(key, prog), open: false });
    }
    case 'sev': {
      // 7th-chord arpeggios up and down: maj7, m7, 7, m7♭5, °7 (op 0–4).
      const q = (['maj7', 'm7', '7', 'm7b5', 'dim7'] as Q[])[op % 5];
      const ints = QI[q];
      const up = [...ints, 12];
      const fig = [...up, ...up.slice(1, 4).reverse()];
      const R = rootOf(tu, key);
      const line: BN[] = [];
      for (let r = 0; r < 3; r++) fig.forEach((x, k) => line.push({ b: r * 4 + k / 2, d: 0.5, p: R + x, ct: true }));
      line.push({ b: 12, d: 1, p: R });
      const nm = [tt('maj7 arpeggio', 'ארפג׳יו maj7'), tt('m7 arpeggio', 'ארפג׳יו m7'), tt('Dominant 7 arpeggio', 'ארפג׳יו ספטאקורד דומיננטי'), tt('m7♭5 arpeggio', 'ארפג׳יו m7♭5'), tt('Diminished 7 arpeggio', 'ארפג׳יו מוקטן')][op % 5];
      return drillOf(s, tu, alt(line), { ...nm, open: false });
    }
    case 'arp2': {
      // Two-octave arpeggios with shifts: major (op 0), minor (1), dominant 7 (2).
      const ints = [QI.M, QI.m, QI['7']][op % 3];
      const R = rootOf(tu, key);
      const up = [...ints, ...ints.map((x) => x + 12), 24].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line = ps.map((p, i) => ({ b: i / 2, d: i === ps.length - 1 ? 1 : 0.5, p, ct: true }));
      return drillOf(s, tu, alt(line), { en: ['Two-octave major arpeggio', 'Two-octave minor arpeggio', 'Two-octave dominant 7 arpeggio'][op % 3], he: ['ארפג׳יו מז׳ור בשתי אוקטבות', 'ארפג׳יו מינור בשתי אוקטבות', 'ארפג׳יו ספטאקורד דומיננטי בשתי אוקטבות'][op % 3], open: false, bass: { shiftGap: 40 } });
    }
    case 'arp7x2':
    case 'arp9':
    case 'arpalt': {
      // B15: two-octave 7th arpeggios (RSL Gr 5), 9th arpeggios (Gr 7), altered-dominant arpeggios (Gr 8), up and down.
      const SETS: Record<string, { ints: number[]; en: string; he: string }[]> = {
        arp7x2: [
          { ints: [0, 4, 7, 11], en: 'maj7', he: 'maj7' },
          { ints: [0, 3, 7, 10], en: 'm7', he: 'm7' },
          { ints: [0, 4, 7, 10], en: '7', he: '7' },
        ],
        arp9: [
          { ints: [0, 4, 7, 11, 14], en: 'maj9', he: 'maj9' },
          { ints: [0, 3, 7, 10, 14], en: 'm9', he: 'm9' },
          { ints: [0, 4, 7, 10, 14], en: '9', he: '9' },
        ],
        arpalt: [
          { ints: [0, 4, 8, 10], en: '7♯5', he: '7♯5' },
          { ints: [0, 4, 6, 10], en: '7♭5', he: '7♭5' },
          { ints: [0, 4, 7, 10, 15], en: '7♯9', he: '7♯9' },
          { ints: [0, 4, 7, 10, 13], en: '7♭9', he: '7♭9' },
        ],
      };
      const set = SETS[s.kind][op % SETS[s.kind].length];
      const R = rootOf(tu, key);
      const ints = s.kind === 'arp7x2' ? [...set.ints, ...set.ints.map((x) => x + 12), 24] : [...set.ints, 12 + set.ints[1], 12 + set.ints[2]];
      const up = ints.map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line = ps.map((p, i) => ({ b: i / 2, d: i === ps.length - 1 ? 1 : 0.5, p, ct: true }));
      const what = s.kind === 'arp7x2' ? tt('Two-octave', 'בשתי אוקטבות') : s.kind === 'arp9' ? tt('9th', 'נונה') : tt('Altered', 'אלטרד');
      return drillOf(s, tu, alt(line), { en: `${what.en} arpeggio: ${set.en}`, he: `ארפג׳יו ${what.he}: ${set.he}`, open: false, bass: { shiftGap: 40 } });
    }
    case 'hichords': {
      // B15 (RSL Gr 7): high-register chords — op 0: 10ths (root low, the 10th three strings up), op 1: root and 7th
      // two strings up (ii–V–I) — both with the root at the 5th fret or higher, one hand position each.
      const n = tu.open.length;
      const prog = op === 1 ? PROGS.jazz : PROGS.p1451;
      const sLo = op === 1 ? Math.min(n, 3) : n;
      const sHi = sLo - (op === 1 ? 2 : 3);
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const ints = QI[c[1]];
        const fk = mod(key + c[0] - tu.open[sLo - 1], 12);
        const f = fk < 5 ? fk + 12 : fk;
        const lo = noteAt(tu, sLo, f);
        const top = lo + (op === 1 ? (ints[3] ?? 12) : 12 + ints[1]);
        const fHi = top - tu.open[sHi - 1];
        const ok = sHi >= 1 && fHi >= 1 && Math.abs(fHi - f) <= 3;
        for (let k = 0; k < 2; k++) line.push({ b: bar * 4 + k * 2, d: 2, p: lo, s: sLo, f, ct: true, ...(ok ? { with: [{ s: sHi, f: fHi }] } : {}) });
      });
      return drillOf(s, tu, line, { en: op === 1 ? 'High-register chords: root and 7th (I–vi–ii–V)' : 'High-register chords: 10ths', he: op === 1 ? 'אקורדים באזור הגבוה: יסוד וספטימה' : 'אקורדים באזור הגבוה: דצימות', chart: chartOf(key, prog), evenness: false, open: false });
    }
    case 'ctline':
    case 'nearest': {
      // Chord tones through I–vi–ii–V: beat 1 a chord tone (the root, or the nearest one), then chord tones by step.
      const nearest = s.kind === 'nearest';
      const prog = [...PROGS.jazz, ...PROGS.jazz];
      const rnd = rng(`b-chord:${s.kind}:${key}:${op}`);
      const line: BN[] = [];
      let prev = rootOf(tu, key);
      prog.forEach((c, bar) => {
        const pcs = QI[c[1]].map((x) => mod(key + c[0] + x, 12));
        const near = (target: number, avoid?: number) => {
          let best = -1;
          for (let p = lowest(tu); p <= Math.min(highest(tu), floorOf(tu) + 24); p++) if (pcs.includes(mod(p, 12)) && p !== avoid && (best < 0 || Math.abs(p - target) < Math.abs(best - target))) best = p;
          return best;
        };
        const first = nearest || bar === 0 ? near(prev) : rootOf(tu, key + c[0]);
        line.push({ b: bar * 4, d: 1, p: first, ct: true });
        prev = first;
        for (let k = 1; k < 4; k++) {
          const dir = rnd() < 0.5 ? -1 : 1;
          let p = near(prev + dir * 4, prev);
          // Nearest (A5 rule: moves ≤ 4 semitones): stay within a major 3rd of the last note.
          if (nearest && Math.abs(p - prev) > 4) {
            const close = [1, 2, 3, 4].flatMap((dd) => [prev + dir * dd, prev - dir * dd]).find((q) => pcs.includes(mod(q, 12)) && q >= lowest(tu) && q <= highest(tu));
            if (close !== undefined) p = close;
          }
          line.push({ b: bar * 4 + k, d: 1, p, ct: true });
          prev = p;
        }
      });
      {
        // The closing tonic: nearest mode lands on the tonic closest to the last note.
        const tonicPcs = QI.M.map((x) => mod(key + x, 12));
        let end = rootOf(tu, key);
        if (nearest) for (let p = lowest(tu); p <= highest(tu); p++) if (tonicPcs.includes(mod(p, 12)) && Math.abs(p - prev) < Math.abs(end - prev)) end = p;
        line.push({ b: 32, d: 1, p: end, ct: true });
      }
      // B3: free choice — the chart only, judged by the rules (any chord tone; nearest: moves ≤ 4 semitones at the changes).
      const free = { chart: chartOf(key, prog), show: 'chart' as const, goal: { chordTonesOnBeats: true }, bass: { rules: rulesOf(key, prog, nearest ? 'nearest' : 'chordTones') } };
      return drillOf(s, tu, alt(line), nearest ? { en: 'Nearest chord tone at each change', he: 'צליל האקורד הקרוב בכל החלפה', ...free } : { en: 'Chord tones through I–vi–ii–V', he: 'צלילי אקורד לאורך I–vi–ii–V', ...free });
    }
    case 'slash': {
      // op 0: slash chords (a descending bass: 1, 7, 6, 5, 4, 3, 2, 5); op 1: a tonic pedal under I – IV/I – V/I – I.
      const bassDeg = op === 1 ? [0, 0, 0, 0, 0, 0, 0, 0] : [0, 11, 9, 7, 5, 4, 2, 7];
      const chords: [number, Q][] = op === 1 ? [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M'], [0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']] : [[0, 'M'], [7, 'M'], [9, 'm'], [0, 'M'], [5, 'M'], [0, 'M'], [2, 'm'], [7, 'M']];
      const top = rootOf(tu, key) + 12;
      const line: BN[] = [];
      bassDeg.forEach((d, bar) => {
        // A descending line from the octave: 1, 7, 6, 5, 4, 3, 2 — and the last 5 below the 2 when it fits.
        let p = op === 1 ? rootOf(tu, key) : d === 0 ? top : top - (12 - d);
        if (op !== 1 && bar === 7) p = top - 17 >= lowest(tu) ? top - 17 : top - 5;
        for (let k = 0; k < 8; k++) line.push({ b: bar * 4 + k / 2, d: 0.5, p: fold(tu, p) });
      });
      line.push({ b: 32, d: 1, p: top });
      const chart = chords.map((c, i) => {
        const nm = chordName(key, c);
        const b = mod(key + bassDeg[i], 12);
        return b === mod(key + c[0], 12) ? nm : `${nm}/${NAMES[b]}`;
      });
      return drillOf(s, tu, alt(line), op === 1 ? { en: 'Pedal point under the changes', he: 'צליל עוגב מתחת להחלפות', chart } : { en: 'Slash chords: the bass note is not the root', he: 'אקורדים עם בס (סלאש): צליל הבס הוא לא היסוד', chart });
    }
  }
  throw new Error(`Unknown b-chord kind ${s.kind}`);
}

/** Scales of b-scale (option index): intervals and names. */
const BSCALES: { ints: number[]; en: string; he: string }[] = [
  { ints: [0, 2, 4, 5, 7, 9, 11], en: 'Major', he: 'מז׳ור' },
  { ints: [0, 2, 3, 5, 7, 9, 10], en: 'Dorian', he: 'דורי' },
  { ints: [0, 1, 3, 5, 7, 8, 10], en: 'Phrygian', he: 'פריגי' },
  { ints: [0, 2, 4, 6, 7, 9, 11], en: 'Lydian', he: 'לידי' },
  { ints: [0, 2, 4, 5, 7, 9, 10], en: 'Mixolydian', he: 'מיקסולידי' },
  { ints: [0, 2, 3, 5, 7, 8, 10], en: 'Natural minor', he: 'מינור טבעי' },
  { ints: [0, 2, 3, 5, 7, 8, 11], en: 'Harmonic minor', he: 'מינור הרמוני' },
  { ints: [0, 2, 3, 5, 7, 9, 11], en: 'Melodic minor', he: 'מינור מלודי' },
  { ints: [0, 3, 5, 7, 10], en: 'Minor pentatonic', he: 'פנטטוני מינור' },
  { ints: [0, 2, 4, 7, 9], en: 'Major pentatonic', he: 'פנטטוני מז׳ור' },
  { ints: [0, 3, 5, 6, 7, 10], en: 'Blues scale', he: 'סולם בלוז' },
  { ints: [0, 2, 4, 6, 8, 10], en: 'Whole-tone', he: 'טון שלם' },
  { ints: [0, 1, 3, 4, 6, 7, 9, 10], en: 'Diminished (half-whole)', he: 'מוקטן (חצי-שלם)' },
  { ints: [0, 1, 3, 4, 6, 8, 10], en: 'Altered', he: 'אלטרד' },
];
function genScale(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = tu.open.length;
  switch (s.kind) {
    case 'scale': {
      // One octave in position, up and down; position 1 = the root on the next string up (a second fingering).
      const sc = BSCALES[op % BSCALES.length];
      const str = (s.position ?? 0) === 1 ? n - 1 : n;
      const f = mod(key - tu.open[str - 1], 12);
      const R = noteAt(tu, str, f);
      const up = [...sc.ints, 12].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line: BN[] = ps.map((p, i) => ({ b: i / 2, d: i === ps.length - 1 ? 1 : 0.5, p }));
      line[0] = { ...line[0], s: str, f };
      return drillOf(s, tu, alt(line), { en: `${sc.en}${(s.position ?? 0) === 1 ? ', 2nd position' : ''}`, he: `${sc.he}${(s.position ?? 0) === 1 ? ', מצב שני' : ''}`, pos: Math.max(1, f - 1), open: f === 0 });
    }
    case 'penta5': {
      // The minor pentatonic over two octaves: up through the five positions, shifting, and back.
      const ints = SCALES.pentaMinor;
      const R = rootOf(tu, key);
      const up = [...ints, ...ints.map((x) => x + 12), 24].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line = ps.map((p, i) => ({ b: i / 2, d: i === ps.length - 1 ? 1 : 0.5, p }));
      return drillOf(s, tu, alt(line), { en: 'Five pentatonic positions linked', he: 'חמשת מצבי הפנטטוני ברצף', open: false, span: 3, bass: { shiftGap: 40 } });
    }
    case 'penta-pos': {
      // B15 (RSL Gr 6): the five minor-pentatonic positions, one item each — every scale note inside one 4-fret box.
      const ints = SCALES.pentaMinor;
      const pp = (s.position ?? 0) % 5;
      const f0 = mod(key + ints[pp] - tu.open[n - 1], 12) || 12;
      const lo = f0 > 12 ? f0 - 12 : f0;
      const box = windowScale(tu, key, ints, Math.max(0, lo - 1), lo + 3);
      const seq = [...box, ...box.slice(0, -1).reverse()];
      const line: BN[] = seq.map((x, i) => ({ b: i / 2, d: i === seq.length - 1 ? 1 : 0.5, p: noteAt(tu, x.s, x.f), s: x.s, f: x.f }));
      return drillOf(s, tu, alt(line), { en: `Minor pentatonic, position ${pp + 1}`, he: `פנטטוני מינור, מצב ${pp + 1}`, pos: Math.max(1, lo - 1) });
    }
    case 'seq': {
      // Diatonic 3rds (op 0) or 4ths (op 1) through one octave of the major scale, up and back.
      const step = op === 1 ? 3 : 2;
      const sc = modeInts(0);
      const deg = (i: number) => (i < 0 ? sc[mod(i, 7)] - 12 : sc[i % 7] + 12 * Math.floor(i / 7));
      const R = rootOf(tu, key);
      const pairs: number[] = [];
      for (let i = 0; i <= 7; i++) pairs.push(deg(i), deg(i + step));
      for (let i = 7; i >= 0; i--) pairs.push(deg(i + step), deg(i));
      const line = pairs.map((x, i) => ({ b: i / 2, d: 0.5, p: R + x }));
      line.push({ b: pairs.length / 2, d: 1, p: R });
      return drillOf(s, tu, alt(line), op === 1 ? { en: 'Major scale in 4ths', he: 'סולם מז׳ור בקוורטות', open: false } : { en: 'Major scale in 3rds', he: 'סולם מז׳ור בטרצות', open: false });
    }
  }
  throw new Error(`Unknown b-scale kind ${s.kind}`);
}

// ───────────────────────────── walking ─────────────────────────────

/** A chart in a key from scale-step chords. */
export const textOf = (key: number, prog: Prog): string => chartOf(key, prog).map((x) => x.replace('°7', 'dim7').replace('♭', 'b').replace('♯', '#')).join(' | ');
/** The reference walking line (band.ts) for a chart text: one note a beat (skips kept when asked). */
export function refWalk(tu: Tuning, text: string, seed: string, skips: boolean): BN[] {
  const p = parseChart(text);
  const notes = walkingBass(p, 4, p.bars * 4, hashOf(seed));
  const out: BN[] = [];
  notes.forEach((nt, i) => {
    if (nt.ghost && !skips) return;
    const nextB = notes.slice(i + 1).find((x) => skips || !x.ghost)?.beat ?? nt.beat + 1;
    out.push({ b: nt.beat, d: Math.max(1 / 3, nextB - nt.beat), p: fold(tu, nt.midi), ct: !nt.ghost && Number.isInteger(nt.beat) && nt.beat % 4 === 0 });
  });
  return out;
}
/** B3: the chart the free-choice rules read (A5 contract): per chord its name, root pitch class, chord-tone pitch classes, beats. */
type RuleChart = NonNullable<BassGoal['rules']>['chart'];
/** Chord-scale pitch classes for a solo over a chord (the chord tones plus its mode). */
const SCALE_OF: Record<Q, number[]> = { M: [0, 2, 4, 5, 7, 9, 11], m: [0, 2, 3, 5, 7, 8, 10], '7': [0, 2, 3, 4, 7, 9, 10], m7: [0, 2, 3, 5, 7, 9, 10], maj7: [0, 2, 4, 5, 7, 9, 11], m7b5: [0, 1, 3, 5, 6, 8, 10], dim7: [0, 2, 3, 5, 6, 8, 9, 11] };
export function rulesOf(key: number, prog: Prog, kind: 'walk' | 'chordTones' | 'nearest', scaleTones = false, beatsPerBar = 4): NonNullable<BassGoal['rules']> {
  const chart: RuleChart = prog.map((c) => ({ chord: chordName(key, c), root: mod(key + c[0], 12), tones: Array.from(new Set([0, ...(scaleTones ? SCALE_OF[c[1]] : QI[c[1]]).map((x) => mod(x, 12))])), beats: beatsPerBar })); // intervals above the root (bassAnalyze.RuleChord)
  return { kind, chart, ...(kind === 'walk' ? { maxRepeat: 0.05 } : {}), ...(kind === 'nearest' ? { maxMove: 4 } : {}) };
}
/** The same from a chart text (standards): one entry per chord as written. */
function rulesFromText(text: string, kind: 'walk' | 'chordTones' | 'nearest'): NonNullable<BassGoal['rules']> {
  const p = parseChart(text);
  const chart: RuleChart = p.chords.map((c) => ({ chord: c.sym, root: mod(c.root, 12), tones: Array.from(new Set([0, mod(c.bass - c.root, 12), ...c.iv.map((x) => mod(x, 12))])), beats: c.beats })); // intervals above the root
  return { kind, chart, ...(kind === 'walk' ? { maxRepeat: 0.05 } : {}) };
}
/** B13: the root in the low register of a 5- / 6-string or drop-D bass (from its lowest string); null on a plain 4-string. */
const lowRoot = (tu: Tuning, pc: number): number | null => (lowest(tu) < 28 ? lowest(tu) + mod(pc - lowest(tu), 12) : null);

type Feel = 'walk' | 'two' | 'bossa' | 'ballad';
const FEEL_T: Record<Feel, T2> = { walk: tt('walking in 4', 'ווקינג בארבע'), two: tt('two-feel', 'בתחושה של שתיים'), bossa: tt('bossa pattern', 'תבנית בוסה'), ballad: tt('ballad in 2', 'בלדה בשתיים') };
/**
 * B13 / B18: standards for the walking levels — the changes from standards.ts (chord progressions only), each with the
 * tune's real key and the bass feel it calls for. The first four keep their option numbers (walk L11).
 */
const BASS_STD: { id: string; key: number; minor?: boolean; feel: Feel }[] = [
  { id: 'fly', key: 0, feel: 'walk' },
  { id: 'blue-bossa', key: 0, minor: true, feel: 'bossa' },
  { id: 'tune-up', key: 2, feel: 'walk' },
  { id: 'autumn', key: 7, minor: true, feel: 'walk' },
  { id: 'blues-f', key: 5, feel: 'walk' },
  { id: 'blues-bb', key: 10, feel: 'two' },
  { id: 'minor-blues', key: 0, minor: true, feel: 'walk' },
  { id: 'bird-blues', key: 5, feel: 'walk' },
  { id: 'rhythm-full', key: 10, feel: 'walk' },
  { id: 'a-train', key: 0, feel: 'two' },
  { id: 'satin', key: 0, feel: 'two' },
  { id: 'attya', key: 8, feel: 'walk' },
  { id: 'never-another', key: 3, feel: 'walk' },
  { id: 'stella', key: 10, feel: 'walk' },
  { id: 'ladybird', key: 0, feel: 'walk' },
  { id: 'solar', key: 0, minor: true, feel: 'walk' },
  { id: 'misty', key: 3, feel: 'ballad' },
  { id: 'valentine', key: 0, minor: true, feel: 'ballad' },
  { id: 'ipanema', key: 5, feel: 'bossa' },
  { id: 'song-father', key: 5, minor: true, feel: 'bossa' },
  { id: 'minor-bossa', key: 9, minor: true, feel: 'bossa' },
  { id: 'so-what', key: 2, minor: true, feel: 'walk' },
  { id: 'cantaloupe', key: 5, minor: true, feel: 'two' },
  // B18 (fix round): 13 more, to the doc's 36 — walk L18. Chord progressions only (standards.ts).
  { id: 'blues-basic', key: 7, feel: 'walk' },
  { id: 'rhythm-a', key: 10, feel: 'walk' },
  { id: 'sec-dominants-c', key: 0, feel: 'walk' },
  { id: 'miss-jones', key: 5, feel: 'walk' },
  { id: 'two-five-keys', key: 0, feel: 'walk' },
  { id: 'minor-two-five-keys', key: 0, minor: true, feel: 'walk' },
  { id: 'giant', key: 11, feel: 'walk' },
  { id: 'turnarounds-f', key: 5, feel: 'walk' },
  { id: 'backdoor-g', key: 7, feel: 'walk' },
  { id: 'ballad-ii-v', key: 3, feel: 'ballad' },
  { id: 'maiden', key: 2, feel: 'two' },
  { id: 'modal-a', key: 9, minor: true, feel: 'two' },
  { id: 'dorian-vamp', key: 2, minor: true, feel: 'bossa' },
];
/** The first standards (walk L11, L13, L14); the rest are walk L18. */
const STD_FIRST = 23;
/** Options of BASS_STD by feel (catalogue). */
const stdOps = (pred: (f: Feel, i: number) => boolean): number[] => BASS_STD.map((x, i) => (pred(x.feel, i) ? i : -1)).filter((i) => i >= 0);
/** A bass line for a chart in a feel: walking (the band's rules), two-feel / ballad halves, or the bossa figure. */
function feelLine(tu: Tuning, text: string, feel: Feel, seed: string): BN[] {
  if (feel === 'walk') return refWalk(tu, text, seed, false);
  const p = parseChart(text);
  const out: BN[] = [];
  for (const c of p.chords) {
    const b0 = c.bar * 4 + c.at;
    const R = rootOf(tu, c.bass);
    // The chord's 5th (♭5 / ♯5 when altered); a chord written without one (7alt) takes its 7th instead.
    const fiv = c.iv.includes(7) ? 7 : c.iv.includes(6) ? 6 : c.iv.includes(8) ? 8 : c.iv.includes(10) ? 10 : (c.iv[1] ?? 0);
    const up = rootOf(tu, c.root) + fiv;
    const five = up - R > 9 ? up - 12 : up < R - 9 ? up + 12 : up;
    const f5 = five < lowest(tu) ? five + 12 : five;
    if (feel === 'bossa') {
      if (c.beats >= 4) out.push({ b: b0, d: 1.5, p: R, ct: true }, { b: b0 + 1.5, d: 0.5, p: f5, ct: true }, { b: b0 + 2, d: 1.5, p: f5, ct: true }, { b: b0 + 3.5, d: 0.5, p: R, ct: true });
      else out.push({ b: b0, d: 1.5, p: R, ct: true }, { b: b0 + 1.5, d: Math.max(0.5, c.beats - 1.5), p: f5, ct: true });
    } else if (c.beats >= 4) out.push({ b: b0, d: 2, p: R, ct: true }, { b: b0 + 2, d: 2, p: f5, ct: true });
    else out.push({ b: b0, d: c.beats, p: R, ct: true });
  }
  return out;
}

export function genWalk(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const blues = BLUES;
  const iivi: Prog = [...PROGS.iivi, ...PROGS.iivi];
  /** Beat-4 approach rules: chromatic (±1), dominant (the next root's 5th), scale step (±2 / ±1 in the key). */
  // B4: the approach never repeats beat 3 (it takes the other side, or the other octave of the 5th).
  const approach = (kind: 'chrom' | 'dom' | 'scale', from: number, target: number, bar: number): number => {
    if (kind === 'chrom') {
      const a = target + (bar % 2 === 0 ? -1 : 1);
      return a === from ? 2 * target - a : a;
    }
    if (kind === 'dom') {
      const a = target + 7;
      const b = target - 5;
      const pick = Math.abs(a - from) <= Math.abs(b - from) && a <= highest(tu) ? a : b >= lowest(tu) ? b : a;
      const other = pick === a ? (b >= lowest(tu) ? b : a + 12) : a;
      return pick !== from ? pick : other;
    }
    const scale = modeInts(0).map((x) => mod(key + x, 12));
    const above = [1, 2].map((x) => target + x).find((p) => scale.includes(mod(p, 12))) ?? target + 2;
    const below = [1, 2].map((x) => target - x).find((p) => scale.includes(mod(p, 12))) ?? target - 2;
    const pick = from > target ? above : below >= lowest(tu) ? below : above;
    return pick !== from ? pick : pick === above ? (below >= lowest(tu) ? below : above + 12) : above;
  };
  // Beats 1–3 are chord tones; beat 4 (when it approaches the next chord) is marked as an approach note (ct false).
  const walk = (prog: Prog, fig: (R: number, c: [number, Q], next: number, bar: number) => number[], nonCt: number[] = []): BN[] =>
    overProg(tu, key, prog, (R, c, bar, next) => fig(R, c, next, bar).map((p, k) => ({ b: k, d: 1, p, ct: !nonCt.includes(k) })));
  switch (s.kind) {
    case 'two-feel': {
      const line = overProg(tu, key, blues, (R) => [{ b: 0, d: 2, p: R, ct: true }, { b: 2, d: 2, p: R + 7 > floorOf(tu) + 14 ? R - 5 : R + 7, ct: true }]);
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: 'Two-feel: roots and 5ths in half notes (blues)', he: 'תחושה בשתיים: יסודות וקווינטות בחצאים (בלוז)', chart: chartOf(key, blues), goal: { chordTonesOnBeats: true } });
    }
    case 'r5walk': {
      const line = walk(blues, (R) => (op === 1 ? [R, R + 7, R, R + 7] : [R, R, R + 7, R + 7]));
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: op === 1 ? 'Quarters: R–5–R–5 (blues)' : 'Quarters: R–R–5–5 (blues)', he: op === 1 ? 'רבעים: R–5–R–5 (בלוז)' : 'רבעים: R–R–5–5 (בלוז)', chart: chartOf(key, blues), goal: { chordTonesOnBeats: true } });
    }
    case 'arpwalk': {
      const line = walk(blues, (R) => (op === 1 ? [R, R + 4, R + 7, R + 9] : [R, R + 4, R + 7, R + 4]), op === 1 ? [3] : []);
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: op === 1 ? 'Arpeggio walk R–3–5–6 (blues)' : 'Arpeggio walk R–3–5–3 (blues)', he: op === 1 ? 'הליכת ארפג׳יו R–3–5–6 (בלוז)' : 'הליכת ארפג׳יו R–3–5–3 (בלוז)', chart: chartOf(key, blues), goal: { chordTonesOnBeats: true } });
    }
    case 'chrom':
    case 'dom':
    case 'scaleapp': {
      // Chord tones on 1–3, an approach to the next root on 4 (ii–V–I–I, twice; the last bar approaches the closing tonic).
      const kind = s.kind === 'chrom' ? 'chrom' : s.kind === 'dom' ? 'dom' : 'scale';
      const line = walk(
        iivi,
        (R, c, next, bar) => {
          const ints = QI[c[1]];
          const three = [R, R + ints[1], R + ints[2]];
          return [...three, approach(kind, three[2], next, bar)];
        },
        [3],
      );
      line.push(endOn(tu, key, 32, 2));
      const nm = { chrom: tt('Chromatic approach on beat 4 (ii–V–I)', 'גישה כרומטית בפעמה 4 (ii–V–I)'), dom: tt('Dominant approach on beat 4 (ii–V–I)', 'גישה דומיננטית בפעמה 4 (ii–V–I)'), scale: tt('Scale-step approach on beat 4 (ii–V–I)', 'גישה בצעד סולמי בפעמה 4 (ii–V–I)') }[kind];
      return drillOf(s, tu, alt(line), { ...nm, chart: chartOf(key, iivi), goal: { chordTonesOnBeats: true } });
    }
    case 'free': {
      // B3: free walking over the blues — only the chart is shown, the line is judged by the walking rules. The band's
      // own walking line stays as the opt-in model.
      const line = refWalk(tu, textOf(key, blues), `b-walk:free:${key}:${op}`, false);
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: 'Free walking, mixed approaches (blues)', he: 'ווקינג חופשי, גישות מעורבות (בלוז)', chart: chartOf(key, blues), show: 'chart', bass: { rules: rulesOf(key, blues, 'walk') }, drums: { groove: 'swing' } });
    }
    case 'skips': {
      // A walking line over the blues with ghosted triplet skips.
      const line = refWalk(tu, textOf(key, blues), `b-walk:skips:${key}:${op}`, true);
      // One skip in every other bar at least: a ghosted triplet before beat 2 on the note before.
      for (let bar = 0; bar < 12; bar += 2) {
        const at = bar * 4 + 1;
        if (line.some((x) => Math.abs(x.b - (at - 1 / 3)) < 1e-6)) continue;
        const prev = line.find((x) => x.b === at - 1);
        if (!prev) continue;
        prev.d = 2 / 3;
        line.push({ b: at - 1 / 3, d: 1 / 3, p: prev.p, ct: false });
      }
      line.sort((a, b) => a.b - b.b);
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: 'Walking with triplet skips (blues)', he: 'ווקינג עם קפיצות טריולה (בלוז)', chart: chartOf(key, blues), evenness: false });
    }
    case 'cycle': {
      // B4: ii–V–I up in 4ths through four keys, then home: the line ends on the tonic of its own key.
      const prog: Prog = [];
      for (const k of [0, 5, 10, 3, 0]) prog.push([mod(k + 2, 12), 'm7'], [mod(k + 7, 12), '7'], [k, 'maj7'], [k, 'maj7']);
      const line = refWalk(tu, textOf(key, prog), `b-walk:cycle:${key}`, false);
      line.push(endOn(tu, key, prog.length * 4, 2));
      return drillOf(s, tu, alt(line), { en: 'ii–V–I up in 4ths and home', he: 'ii–V–I בעליות של קוורטות, וחזרה הביתה', chart: chartOf(key, prog), goal: { chordTonesOnBeats: true }, drums: { groove: 'swing' } });
    }
    case 'rhythm': {
      // Rhythm changes, A section: two chords a bar.
      const bars: [number, Q][][] = [
        [[0, 'M'], [9, '7']],
        [[2, 'm7'], [7, '7']],
        [[4, 'm7'], [9, '7']],
        [[2, 'm7'], [7, '7']],
        [[7, 'm7'], [0, '7']],
        [[5, 'M'], [6, 'dim7']],
        [[4, 'm7'], [9, '7']],
        [[2, 'm7'], [7, '7']],
      ];
      const text = bars.map((b) => b.map((c) => chordName(key, c).replace('°7', 'dim7').replace('♭', 'b').replace('♯', '#')).join(' ')).join(' | ');
      const line = refWalk(tu, text, `b-walk:rhythm:${key}`, false);
      line.push(endOn(tu, key, 32, 2));
      return drillOf(s, tu, alt(line), { en: 'Rhythm changes: two chords a bar', he: 'ריתם צ׳יינג׳ס: שני אקורדים בתיבה', chart: bars.map((b) => b.map((c) => chordName(key, c)).join(' ')), goal: { chordTonesOnBeats: true }, drums: { groove: 'swing' } });
    }
    case 'standard': {
      // One chorus of a standard's changes in the tune's own key and feel (B13 / B18), chart only, judged by the rules.
      const std = BASS_STD[op % BASS_STD.length];
      const st = STANDARD_CHANGES.find((x) => x.id === std.id) ?? STANDARD_CHANGES[0];
      const line = feelLine(tu, st.text, std.feel, `b-walk:std:${st.id}`);
      const bars = st.text.split('|').map((x) => x.trim());
      const home = rootOf(tu, std.key);
      line.push({ b: bars.length * 4, d: 2, p: home, ct: true });
      const part = st.part.en === 'Whole form' || st.part.en.startsWith('Whole form') ? '' : ` (${st.part.en})`;
      const partHe = part ? ` (${st.part.he})` : '';
      const feel = FEEL_T[std.feel];
      const kn = `${NAMES[std.key]}${std.minor ? 'm' : ''}`;
      return drillOf(s, tu, alt(line), {
        en: `${st.name}${part}, ${feel.en}`,
        he: `${st.name}${partHe}, ${feel.he}`,
        keyName: kn,
        keySig: SIG[std.minor ? mod(std.key + 3, 12) : std.key],
        chart: bars,
        show: 'chart',
        evenness: std.feel === 'walk',
        bass: { rules: rulesFromText(st.text, std.feel === 'walk' ? 'walk' : 'chordTones') },
        drums: { groove: std.feel === 'bossa' ? 'bossa' : std.feel === 'ballad' ? 'ballad-brush' : 'swing' },
      });
    }
    case 'probe-walk': {
      // Placement task 4 (BASS_CURRICULUM §6): four bars of Dm7 – G7 – Cmaj7 at 100, chart only.
      const prog: Prog = [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']];
      const line = walk(prog, (R, c, next, bar) => [R, R + QI[c[1]][1], R + QI[c[1]][2], approach('chrom', R + QI[c[1]][2], next, bar)], [3]);
      line.push(endOn(tu, key, 16, 2));
      return drillOf(s, tu, alt(line), { en: 'Walk the chart: Dm7 – G7 – Cmaj7', he: 'ווקינג לפי הצ׳ארט: Dm7 – G7 – Cmaj7', chart: chartOf(key, prog), show: 'chart', bass: { rules: rulesOf(key, prog, 'walk') } });
    }
    case 'solo': {
      // Bagrut (5 units): a two-chorus solo over the blues — chord-scale notes, free rhythm; only the chart is shown.
      const prog = [...blues, ...blues];
      const rnd = rng(`b-walk:solo:${key}:${op}`);
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const R = rootOf(tu, key + c[0]) + 12;
        const sc = [0, 2, 4, 7, 9, 10];
        const rhythm = [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]].filter(() => rnd() < 0.85);
        rhythm.forEach(([b, d], k) => line.push({ b: bar * 4 + b, d, p: R + (k === 0 ? [0, 4, 7][Math.floor(rnd() * 3)] : sc[Math.floor(rnd() * sc.length)]), ct: k === 0 }));
      });
      line.push(endOn(tu, key, prog.length * 4, 2));
      return drillOf(s, tu, alt(line), { en: 'Two-chorus solo over the blues', he: 'סולו של שני סבבים על בלוז', chart: chartOf(key, prog), show: 'chart', evenness: false, bass: { rules: rulesOf(key, prog, 'chordTones', true) }, drums: { groove: 'swing' } });
    }
    case 'sight-impro': {
      // Bagrut: improvise a walking line over a progression read at sight — a new chart for every key and option.
      const rnd = rng(`b-walk:sight:${key}:${op}`);
      const pool: Prog[] = [PROGS.jazz, PROGS.iivi, PROGS.minor, [[0, 'maj7'], [4, 'm7'], [9, '7'], [2, 'm7']], [[5, 'maj7'], [7, '7'], [4, 'm7'], [9, '7']], [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']]];
      const prog: Prog = [0, 1, 2, 3].flatMap(() => pool[Math.floor(rnd() * pool.length)]);
      prog.splice(prog.length - 2, 2, [7, '7'], [0, 'maj7']);
      const line = refWalk(tu, textOf(key, prog), `b-walk:sight:${key}:${op}`, false);
      line.push(endOn(tu, key, prog.length * 4, 2));
      return drillOf(s, tu, alt(line), { en: 'Sight-read and improvise the walk', he: 'קריאה ממבט ראשון ואלתור ווקינג', chart: chartOf(key, prog), show: 'chart', bass: { rules: rulesOf(key, prog, 'walk') }, drums: { groove: 'swing' } });
    }
    case 'lowb': {
      // B13: walking in the low register of a 5- / 6-string (roots from B0); on a 4-string the low E is the floor.
      const line = walk(iivi, (R0, c, next, bar) => {
        const R = lowRoot(tu, key + c[0]) ?? R0;
        const ints = QI[c[1]];
        const three = [R, R + ints[1], R + ints[2]];
        const tgt = lowRoot(tu, mod(next, 12)) ?? next;
        return [...three, approach('chrom', three[2], tgt, bar)];
      }, [3]);
      line.push({ b: 32, d: 2, p: lowRoot(tu, key) ?? rootOf(tu, key) });
      return drillOf(s, tu, alt(line), { en: 'Low register walk (low B on 5-string)', he: 'ווקינג באזור הנמוך (B נמוך בבס 5 מיתרים)', chart: chartOf(key, iivi), goal: { chordTonesOnBeats: true }, drums: { groove: 'swing' } });
    }
    case 'two-four': {
      // A blues chorus in 2 (half notes), then a chorus in 4 (walking).
      const a = overProg(tu, key, blues, (R) => [{ b: 0, d: 2, p: R, ct: true }, { b: 2, d: 2, p: R + 7 > floorOf(tu) + 14 ? R - 5 : R + 7 }]);
      const b = refWalk(tu, textOf(key, blues), `b-walk:24:${key}`, false).map((x) => ({ ...x, b: x.b + 48 }));
      const line = [...a, ...b, endOn(tu, key, 96, 2)];
      return drillOf(s, tu, alt(line), { en: 'Blues in 2, then in 4', he: 'בלוז בשתיים, ואז בארבע', chart: [...chartOf(key, blues), ...chartOf(key, blues)], evenness: false, drums: { groove: 'swing' } });
    }
  }
  throw new Error(`Unknown b-walk kind ${s.kind}`);
}

function genSlap(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [7, '7']];
  const T = (p: number, b: number, d: number, acc = false): BN => ({ b, d, p, st: 'p', acc });
  switch (s.kind) {
    case 'thumb': {
      // Thumb on the open low strings: quarters, then 8ths.
      const E = fold(tu, 28);
      const A = fold(tu, 33);
      const line: BN[] = [];
      [E, E, A, A].forEach((p, bar) => {
        const per = bar % 2 ? 2 : 1;
        for (let k = 0; k < 4 * per; k++) line.push(T(p, bar * 4 + k / per, 1 / per, k % per === 0));
      });
      line.push(T(E, 16, 1));
      return drillOf(s, tu, line, { en: 'Slap: thumb on the open strings', he: 'סלאפ: אגודל על מיתרים פתוחים' });
    }
    case 'octpop': {
      const line = overProg(tu, key, PROGS.p1451, (R) => Array.from({ length: 8 }, (_, k) => (k % 2 ? { b: k / 2, d: 0.5, p: R + 12, st: 'i' as Stroke } : T(R, k / 2, 0.5))));
      line.push(T(rootOf(tu, key), 16, 1));
      return drillOf(s, tu, line, { en: 'Slap and pop: octaves', he: 'סלאפ ופופ: אוקטבות', chart: chartOf(key, PROGS.p1451), open: false });
    }
    case 'ghostslap':
    case 'hammerslap':
    case 'cross':
    case 'double':
    case 'trip':
    case 'slap16': {
      const pats: Record<string, string> = { ghostslap: 'T.xPT.xPT.xPT.xP', hammerslap: 'T.HPT.x.T.HPx.P.', cross: 'T.P.Q.P.T.P5QP..', double: 'TTTTTTTTTTTTTTTT' };
      const line: BN[] = [];
      if (s.kind === 'trip') {
        prog.forEach((c, bar) => {
          const R = rootOf(tu, key + c[0]);
          for (let beat = 0; beat < 4; beat++) line.push(T(R, bar * 4 + beat, 1 / 3, true), { b: bar * 4 + beat + 1 / 3, d: 1 / 3, p: R + 2, tech: 'hammer' }, { b: bar * 4 + beat + 2 / 3, d: 1 / 3, p: R + 12, st: 'i' });
        });
      } else if (s.kind === 'slap16') {
        const rnd = rng(`b-slap:16:${key}:${op}`);
        const cells = ['T.xP', 'T.HP', 'x.TP', 'T.T.', 'P.xT', 'T.xQ', 'x.P.', 'TxP.'];
        const two = cellLine(tu, key, prog, rnd, 2, cells, 'T.xP');
        for (let k = 0; k < 2; k++) for (const x of two) line.push({ ...x, b: x.b + k * 8, p: x.p + (k === 1 ? 5 : 0) });
      } else {
        prog.forEach((c, bar) => {
          const R = rootOf(tu, key + c[0]);
          for (const x of grid(pats[s.kind], (ch) => cellNote(R, ch))) line.push(...expandCell(s.kind === 'double' ? { ...x, st: 'p', acc: Math.round(x.b * 4) % 2 === 0 } : x, bar * 4, line[line.length - 1]));
        });
      }
      line.push(T(rootOf(tu, key), 16, 1));
      const chart = s.kind === 'slap16' ? chartOf(key, [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']]) : chartOf(key, prog);
      const nm: Record<string, T2> = {
        ghostslap: tt('Slap with fretting-hand ghost hits', 'סלאפ עם מכות רפאים ביד שמאל'),
        hammerslap: tt('Slap, hammer-on, pop', 'סלאפ, הקשה, פופ'),
        cross: tt('Slap with string crossing', 'סלאפ עם מעברי מיתרים'),
        double: tt('Double thumbing: down and up', 'אגודל כפול: למטה ולמעלה'),
        trip: tt('Triplet slap: thumb – hammer – pop', 'סלאפ בטריולות: אגודל – הקשה – פופ'),
        slap16: tt('16th slap groove', 'גרוב סלאפ בשש-עשריות'),
      };
      return drillOf(s, tu, line, { ...nm[s.kind], chart, evenness: s.kind === 'double', open: false });
    }
  }
  throw new Error(`Unknown b-slap kind ${s.kind}`);
}

function genLegatoB(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const n = tu.open.length;
  switch (s.kind) {
    case 'slide': {
      // Slide into the root on 1 from two frets below, then 5 and octave.
      const line: BN[] = [];
      PROGS.p1451.forEach((c, bar) => {
        const rp = rootPlace(tu, key + c[0], 9);
        const at = rp.f >= 2 ? rp : { s: rp.s, f: rp.f + 12 };
        const R = noteAt(tu, at.s, at.f);
        const b0 = bar * 4;
        line.push({ b: b0, d: 0.25, p: R - 2, s: at.s, f: at.f - 2 }, { b: b0 + 0.25, d: 1.75, p: R, s: at.s, f: at.f, tech: 'slide' }, { b: b0 + 2, d: 1, p: R + 7 }, { b: b0 + 3, d: 1, p: R + 12 });
      });
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Slides into the root', he: 'החלקות אל היסוד', chart: chartOf(key, PROGS.p1451), evenness: false, open: false });
    }
    case 'hp':
    case 'legline': {
      // hp: hammer-on then pull-off pairs, a whole step, on every string; legline: minor-pentatonic legato in 16ths.
      const p0 = Math.max(1, mod(key - tu.open[n - 1], 12) || 12);
      const line: BN[] = [];
      const strs = lowToHigh(tu).slice(0, 4);
      if (s.kind === 'hp') {
        let b = 0;
        for (let r = 0; r < 2; r++)
          for (const str of r ? strs.slice().reverse() : strs) {
            line.push({ b, d: 0.5, p: noteAt(tu, str, p0), s: str, f: p0 }, { b: b + 0.5, d: 0.5, p: noteAt(tu, str, p0 + 2), s: str, f: p0 + 2, tech: 'hammer' });
            line.push({ b: b + 1, d: 0.5, p: noteAt(tu, str, p0 + 2), s: str, f: p0 + 2 }, { b: b + 1.5, d: 0.5, p: noteAt(tu, str, p0), s: str, f: p0, tech: 'pull' });
            b += 2;
          }
        line.push({ b, d: 1, p: noteAt(tu, strs[0], p0), s: strs[0], f: p0 });
      } else {
        const box = windowScale(tu, key, SCALES.pentaMinor, p0, p0 + 3).filter((x) => strs.includes(x.s));
        const per = new Map<number, number[]>();
        for (const x of box) per.set(x.s, [...(per.get(x.s) ?? []), x.f]);
        const seq: BN[] = [];
        for (const str of strs) {
          const fs = per.get(str) ?? [];
          if (fs.length < 2) continue;
          seq.push({ b: 0, d: 0.25, p: noteAt(tu, str, fs[0]), s: str, f: fs[0] }, { b: 0, d: 0.25, p: noteAt(tu, str, fs[1]), s: str, f: fs[1], tech: 'hammer' }, { b: 0, d: 0.25, p: noteAt(tu, str, fs[0]), s: str, f: fs[0], tech: 'pull' });
        }
        const all = [...seq, ...seq, ...seq, ...seq].slice(0, 48);
        all.forEach((x, i) => line.push({ ...x, b: i / 4 }));
        line.push({ b: all.length / 4, d: 1, p: noteAt(tu, strs[0], p0), s: strs[0], f: p0 });
      }
      return drillOf(s, tu, alt(line), s.kind === 'hp' ? { en: 'Hammer-ons and pull-offs', he: 'הקשות ומשיכות', evenness: false } : { en: 'Legato line (pentatonic, 16ths)', he: 'קו לגאטו (פנטטוני, שש-עשריות)', evenness: false });
    }
    case 'octslide': {
      // Octave double stops that slide up two frets and back.
      const line: BN[] = [];
      [0, 5, 7, 0].forEach((d, bar) => {
        const { lo, hi } = octaveShape(tu, key + d, 7);
        const b0 = bar * 4;
        const at = (df: number, b: number, len: number, tech?: Tech): BN => ({ b, d: len, p: noteAt(tu, lo.s, lo.f + df), s: lo.s, f: lo.f + df, tech, with: [{ s: hi.s, f: hi.f + df }] });
        line.push(at(0, b0, 2), at(2, b0 + 2, 1, 'slide'), at(0, b0 + 3, 1, 'slide'));
      });
      return drillOf(s, tu, line, { en: 'Sliding octave double stops', he: 'אוקטבות כפולות בהחלקה', chart: chartOf(key, PROGS.p1451), evenness: false });
    }
    case 'harm': {
      // Natural harmonics at frets 12, 7 and 5 on every string.
      const line: BN[] = [];
      let b = 0;
      for (const fr of [12, 7, 5]) for (const str of lowToHigh(tu).slice(-4)) (line.push({ b, d: 1, p: 0, s: str, f: fr, tech: 'harmonic' }), (b += 1));
      return drillOf(s, tu, line, { en: 'Natural harmonics: 12th, 7th, 5th fret', he: 'הרמוניקים טבעיים: סריג 12, 7, 5', evenness: false });
    }
    case 'vib': {
      // Long notes with vibrato (fretted, never open).
      const R = rootOf(tu, key) + 12;
      const line = [0, 7, 3, 10, 12, 7, 5, 0].map((x, k) => ({ b: k * 2, d: 2, p: R + x, tech: 'vibrato' as Tech, bend: 40 }));
      return drillOf(s, tu, line, { en: 'Vibrato on long notes', he: 'ויברטו על צלילים ארוכים', evenness: false, open: false, pos: 5 });
    }
    case 'pedal': {
      // A pedal note against a moving line, in 16ths.
      const P = rootOf(tu, key);
      const sc = modeInts(5).map((x) => P + 12 + x);
      const moving = [...sc, P + 24, ...sc.slice(1).reverse()];
      const line: BN[] = [];
      moving.forEach((m, i) => line.push({ b: i / 2, d: 0.25, p: P }, { b: i / 2 + 0.25, d: 0.25, p: m }));
      line.push({ b: moving.length / 2, d: 1, p: P });
      return drillOf(s, tu, alt(line), { en: 'Pedal tone against a moving line', he: 'צליל עוגב מול קו נע', evenness: true });
    }
  }
  throw new Error(`Unknown b-legato kind ${s.kind}`);
}

function genPick(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const D = (x: BN): BN => ({ ...x, st: 'D' });
  switch (s.kind) {
    case 'down8': {
      const line = overProg(tu, key, PROGS.rock, (R) => Array.from({ length: 8 }, (_, k) => D({ b: k / 2, d: 0.5, p: R, acc: k % 2 === 0 })));
      line.push(D(endOn(tu, key, 16, 1)));
      return drillOf(s, tu, line, { en: 'Pick: down-stroke 8ths', he: 'מפרט: שמיניות במכות למטה', chart: chartOf(key, PROGS.rock) });
    }
    case 'alt16': {
      const prog: Prog = [[0, 'M'], [0, 'M'], [5, 'M'], [7, 'M']];
      const line = overProg(tu, key, prog, (R) => Array.from({ length: 16 }, (_, k) => ({ b: k / 4, d: 0.25, p: R, st: (k % 2 ? 'U' : 'D') as Stroke })));
      line.push(D(endOn(tu, key, 16, 1)));
      return drillOf(s, tu, line, { en: 'Pick: alternate 16ths', he: 'מפרט: שש-עשריות מתחלפות', chart: chartOf(key, prog), bass: { asym: { ms: 8, db: 3 } } });
    }
    case 'pickcross': {
      const line = overProg(tu, key, PROGS.p1451, (R, c) => [0, 7, 12, QI[c[1]][1] + 12, 12, 7, 0, 7].map((x, k) => ({ b: k / 2, d: 0.5, p: R + x, st: (k % 2 ? 'U' : 'D') as Stroke })));
      line.push(D(endOn(tu, key, 16, 1)));
      return drillOf(s, tu, line, { en: 'Pick: string crossing', he: 'מפרט: מעבר מיתרים', chart: chartOf(key, PROGS.p1451), bass: { crossing: 10 } });
    }
    case 'chug': {
      const prog: Prog = [[0, 'm'], [8, 'M'], [10, 'M'], [0, 'm']];
      const line = overProg(tu, key, prog, (R) => Array.from({ length: 8 }, (_, k) => D({ b: k / 2, d: 0.5, p: R, tech: 'mute', acc: k === 0 || k === 3 || k === 6 })));
      line.push(D({ ...endOn(tu, key, 16, 1), tech: 'mute' }));
      return drillOf(s, tu, line, { en: 'Pick: palm-muted chug', he: 'מפרט: צ׳אג מושתק', chart: chartOf(key, prog) });
    }
    case 'pgallop': {
      const prog: Prog = [[0, 'm'], [0, 'm'], [10, 'M'], [8, 'M']];
      const line = overProg(tu, key, prog, (R) => [0, 1, 2, 3].flatMap((b) => [D({ b, d: 0.5, p: R, acc: true }), D({ b: b + 0.5, d: 0.25, p: R }), { b: b + 0.75, d: 0.25, p: R, st: 'U' as Stroke }]));
      line.push(D(endOn(tu, key, 16, 1)));
      return drillOf(s, tu, line, { en: op === 1 ? 'Pick gallop, drop D' : 'Pick gallop', he: op === 1 ? 'גאלופ במפרט, Drop D' : 'גאלופ במפרט', chart: chartOf(key, prog) });
    }
  }
  throw new Error(`Unknown b-pick kind ${s.kind}`);
}

export function genRead(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = tu.open.length;
  const rnd = rng(`b-read:${s.kind}:${key}:${op}:${s.minor ? 'm' : ''}`);
  const walkIn = (set: { s: number; f: number }[], bars: number, durs: number[], rests: boolean, start?: number): BN[] => {
    const out: BN[] = [];
    let i = start ?? Math.max(0, set.findIndex((x) => mod(noteAt(tu, x.s, x.f) - key, 12) === 0));
    let b = 0;
    while (b < bars * 4 - 1e-9) {
      // Off the beat (after an 8th) only an 8th, so every note starts on the 8th grid and bars stay whole.
      const pickD = Number.isInteger(b) ? durs[Math.floor(rnd() * durs.length)] : 0.5;
      const barEnd = (Math.floor(b / 4 + 1e-9) + 1) * 4;
      const d = Math.min(pickD, barEnd - b);
      const x = set[i];
      if (rests && b % 4 !== 0 && rnd() < 0.15) {
        b += d;
        continue;
      }
      out.push({ b, d, p: noteAt(tu, x.s, x.f), s: x.s, f: x.f });
      b += d;
      i = clamp(i + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)], 0, set.length - 1);
    }
    return out;
  };
  switch (s.kind) {
    case 'clef': {
      const set = windowScale(tu, key, modeInts(0), 0, 4);
      const line = walkIn(set, 4, [1], false);
      return drillOf(s, tu, line, { en: 'Bass clef: first position', he: 'מפתח פה: מצב ראשון', evenness: false, keySig: SIG[key], show: 'staff' });
    }
    case 'clef-name': {
      // B10: untimed — one note at a time on the bass clef, find it on the bass within 2 s (open strings, then position I).
      const set = windowScale(tu, key, modeInts(0), 0, 4).filter((x) => x.s >= n - 3);
      const line: BN[] = [];
      let i = Math.max(0, set.findIndex((x) => mod(noteAt(tu, x.s, x.f) - key, 12) === 0));
      for (let k = 0; k < 10; k++) {
        const x = set[i];
        line.push({ b: k * 2, d: 2, p: noteAt(tu, x.s, x.f), s: x.s, f: x.f });
        const j = Math.floor(rnd() * set.length);
        i = j === i ? (j + 3) % set.length : j;
      }
      return drillOf(s, tu, line, { en: 'Name it on the neck: bass clef, untimed', he: 'למצוא על הצוואר: מפתח פה, בלי קצב', evenness: false, keySig: SIG[key], show: 'staff', untimed: { maxMs: 2000 } });
    }
    case 'rhythm': {
      const R = rootOf(tu, key);
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        let b = 0;
        while (b < 4) {
          const d = [2, 1, 1, 0.5][Math.floor(rnd() * 4)];
          const dd = d === 0.5 ? 1 : Math.min(d, 4 - b);
          if (d === 0.5) line.push({ b: bar * 4 + b, d: 0.5, p: R }, { b: bar * 4 + b + 0.5, d: 0.5, p: R });
          else line.push({ b: bar * 4 + b, d: dd, p: R });
          b += dd;
        }
      }
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, alt(line), { en: 'Rhythm reading on one string', he: 'קריאת מקצב על מיתר אחד', evenness: false, show: 'staff', drums: { groove: 'rock-8' } });
    }
    case 'melody':
    case 'keysig':
    case 'pos': {
      const P = s.kind === 'pos' ? [2, 5, 7][op % 3] : s.kind === 'keysig' ? Math.max(1, mod(key - tu.open[n - 1], 12) - 1) : 0;
      const ints = s.minor ? modeInts(5) : modeInts(0);
      const set = windowScale(tu, key, ints, P, P + (P === 0 ? 4 : 3));
      const bars = s.kind === 'melody' ? 4 : 8;
      const line = walkIn(set, bars, s.kind === 'melody' ? [2, 1, 1, 0.5, 0.5] : [1, 1, 0.5, 0.5], true);
      line.push({ ...line[0], b: bars * 4, d: 1 });
      const nm = s.kind === 'melody' ? tt('Four-bar melody', 'מנגינה בארבע תיבות') : s.kind === 'keysig' ? tt('Eight bars with a key signature', 'שמונה תיבות עם סימני היתק') : tt(`Reading in position ${['II', 'V', 'VII'][op % 3]}`, `קריאה במצב ${['II', 'V', 'VII'][op % 3]}`);
      return drillOf(s, tu, line, { ...nm, evenness: false, keySig: SIG[s.minor ? mod(key + 3, 12) : key], pos: Math.max(1, P), show: 'staff' });
    }
    case 'chartroots':
    case 'nashville': {
      // A chord chart (names, or Nashville numbers): roots (op 0) or root–5th (op 1) in quarters.
      const prog: Prog = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']];
      const line = overProg(tu, key, prog, (R) => [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: op === 1 && k % 2 ? R + 7 : R, ct: true })));
      line.push(endOn(tu, key, 32, 1));
      const NUM: Record<number, string> = { 0: '1', 2: '2m', 4: '3m', 5: '4', 7: '5', 9: '6m' };
      const chart = s.kind === 'nashville' ? prog.map((c) => NUM[c[0]] ?? '1') : chartOf(key, prog);
      return drillOf(s, tu, alt(line), s.kind === 'nashville' ? { en: 'Nashville numbers chart', he: 'צ׳ארט במספרי נאשוויל', chart, show: 'chart' } : { en: op === 1 ? 'Chord chart: root and 5th' : 'Chord chart: roots', he: op === 1 ? 'צ׳ארט אקורדים: יסוד וקווינטה' : 'צ׳ארט אקורדים: יסודות', chart, show: 'chart' });
    }
    case 'nash-switch': {
      // B15: a Nashville chart played twice — the key is announced, and on the repeat it switches up a 4th.
      const prog: Prog = [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M']];
      const NUM: Record<number, string> = { 0: '1', 5: '4', 7: '5', 9: '6m' };
      const k2 = mod(key + 5, 12);
      const a = overProg(tu, key, prog, (R) => [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: op === 1 && k % 2 ? R + 7 : R, ct: true })));
      const b = overProg(tu, k2, prog, (R) => [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: op === 1 && k % 2 ? R + 7 : R, ct: true }))).map((x) => ({ ...x, b: x.b + 16 }));
      const line = [...a, ...b, endOn(tu, k2, 32, 1)];
      const chart = [...prog.map((c, i) => (i === 0 ? `${NAMES[key]}: ${NUM[c[0]]}` : NUM[c[0]])), ...prog.map((c, i) => (i === 0 ? `${NAMES[k2]}: ${NUM[c[0]]}` : NUM[c[0]]))];
      return drillOf(s, tu, alt(line), { en: `Nashville: ${NAMES[key]}, then ${NAMES[k2]} on the repeat`, he: `נאשוויל: ${NAMES[key]}, ובחזרה ${NAMES[k2]}`, chart, show: 'chart' });
    }
    case 'roadmap': {
      // B15: a chart with a roadmap — repeat signs, 1st / 2nd endings (op 0) or D.S. al Coda (op 1). The line is the
      // unfolded form; the chart shows the symbols the player has to follow.
      const A: Prog = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']];
      const end2: Prog = [[5, 'M'], [0, 'M']];
      const B: Prog = [[5, 'M'], [7, 'M'], [0, 'M'], [9, 'm']];
      const coda: Prog = [[5, 'M'], [7, 'M'], [0, 'M']];
      const nm = (c: [number, Q]) => chordName(key, c);
      let form: Prog;
      let chart: string[];
      if (op === 1) {
        // A (𝄋 at bar 1) – B – D.S. al Coda: A again, then jump to the coda after bar 2.
        form = [...A, ...B, ...A.slice(0, 2), ...coda];
        chart = [`𝄋 ${nm(A[0])}`, nm(A[1]), `${nm(A[2])} ⊕`, nm(A[3]), ...B.map(nm).map((x, i) => (i === 3 ? `${x} D.S. al ⊕` : x)), `⊕ ${nm(coda[0])}`, nm(coda[1]), nm(coda[2])];
      } else {
        // ‖: A (first ending: V) :‖ second ending: IV – I.
        form = [...A, ...A.slice(0, 2), ...end2];
        chart = [`‖: ${nm(A[0])}`, nm(A[1]), `1. ${nm(A[2])}`, `${nm(A[3])} :‖`, `2. ${nm(end2[0])}`, `${nm(end2[1])} ‖`];
      }
      const line = overProg(tu, key, form, (R) => [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: k === 2 ? R + 7 : R, ct: true })));
      line.push(endOn(tu, key, form.length * 4, 1));
      return drillOf(s, tu, alt(line), { en: op === 1 ? 'Chart roadmap: D.S. al Coda' : 'Chart roadmap: repeats and endings', he: op === 1 ? 'מפת צ׳ארט: D.S. אל הקודה' : 'מפת צ׳ארט: חזרות וסיומות', chart, show: 'chart' });
    }
    case 'quick': {
      // B15 (RSL Gr 6–8 Quick Study Piece): a lead sheet — 4 written bars, then 8 bars of your own line from the chords,
      // judged by the chord-tone rules.
      const prog: Prog = [...PROGS.pop, ...PROGS.jazz, ...PROGS.pop];
      const line = overProg(tu, key, prog, (R, c, bar) =>
        bar >= 4 ? [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: R + [0, QI[c[1]][1], QI[c[1]][2], 12][k], ct: true })) : [0, 1, 1.5, 2, 3].map((b, k) => ({ b, d: k === 1 ? 0.5 : k === 2 ? 0.5 : 1, p: R + [0, 7, 12, 7, 0][k], ct: true })),
      );
      line.push(endOn(tu, key, 48, 1));
      return drillOf(s, tu, alt(line), { en: 'Quick study: 4 written bars, then 8 of your own', he: 'לימוד מהיר: 4 תיבות כתובות, ואז 8 משלך', chart: chartOf(key, prog), show: 'chart', freeFrom: 16, evenness: false, bass: { rules: rulesOf(key, prog, 'chordTones') }, drums: { groove: 'pop-1' }, prep: 30 });
    }
    case 'written': {
      // Two written bars, then six bars of chord tones (for now written out too).
      const prog = [...PROGS.jazz, ...PROGS.jazz];
      const line = overProg(tu, key, prog, (R, c, bar) => {
        const ints = QI[c[1]];
        return bar < 2 ? [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: R + [0, 7, 12, 7][k] })) : [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: R + [0, ints[1], ints[2], ints[3] ?? 12][(k + bar) % 4], ct: true }));
      });
      line.push(endOn(tu, key, 32, 1));
      // B3 (RSL Gr 4–5 Improvisation & Interpretation): two written bars, then six free bars from the chords (rules).
      return drillOf(s, tu, alt(line), { en: 'Written groove + your own continuation', he: 'גרוב כתוב + המשך משלך', chart: chartOf(key, prog), show: 'chart', freeFrom: 8, bass: { rules: rulesOf(key, prog, 'chordTones') }, drums: { groove: 'pop-1' } });
    }
    case 'funkread': {
      const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']];
      const line = cellLine(tu, key, prog, rnd, 4);
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: '16th funk reading', he: 'קריאת פאנק בשש-עשריות', chart: chartOf(key, prog), evenness: false, show: 'staff', ...(line.some((x) => x.tech === 'dead') ? { bass: { ghostClass: 0.9 } } : {}) });
    }
  }
  throw new Error(`Unknown b-read kind ${s.kind}`);
}

/** The style levels (F14): name, progression and the one-bar device. All lines are generated from the style's rules. */
const STYLE_T: T2[] = [
  { en: 'Rock: kick-following 8ths and octave pumps', he: 'רוק: שמיניות עם הבס-דראם ופמפום אוקטבות' },
  { en: 'Pop ballad: long notes, slash bass, anticipations', he: 'בלדת פופ: צלילים ארוכים, בס סלאש והקדמות' },
  { en: 'Motown: R–5–6–8, chromatic approach, pickups', he: 'מוטאון: R–5–6–8, גישה כרומטית והקדמות' },
  { en: 'Blues shuffle: boogie shapes', he: 'שאפל בלוז: צורות בוגי' },
  { en: 'Disco: octaves with a ghost between', he: 'דיסקו: אוקטבות עם צליל רפאים ביניהן' },
  { en: 'Reggae one-drop: space on 1, short low notes', he: 'רגאיי וואן-דרופ: מקום ריק על 1, צלילים קצרים ונמוכים' },
  { en: 'Bossa nova: root–5th dotted figure', he: 'בוסה נובה: יסוד–קווינטה בתבנית מנוקדת' },
  { en: 'Samba: surdo root–5th with pickups', he: 'סמבה: יסוד–קווינטה של הסורדו עם הקדמות' },
  { en: 'Tumbao: the anticipated bass', he: 'טומבאו: הבס המקדים' },
  { en: 'Funk: 16ths with ghosts', he: 'פאנק: שש-עשריות עם צלילי רפאים' },
  { en: 'Gospel / neo-soul: chromatic runs into the changes', he: 'גוספל / ניאו-סול: ריצות כרומטיות אל ההחלפות' },
  { en: 'Metal: gallops (drop D)', he: 'מטאל: גאלופים (Drop D)' },
  { en: 'Odd meter riff in 7/8', he: 'ריף במשקל 7/8' },
  // 0.64 (B15 / B13): the Middle-Eastern option of F14, and the low register of a 5-string.
  { en: 'Middle Eastern: Hijaz ostinato over maqsum', he: 'מזרחי: אוסטינטו בחיג׳אז על מקסום' },
  { en: 'Middle Eastern: Hijaz in 10/8', he: 'מזרחי: חיג׳אז ב-10/8' },
  { en: 'Gospel in the low register (low B)', he: 'גוספל באזור הנמוך (B נמוך)' },
  { en: 'Funk: the second cell set (octave and ♭7 pickups)', he: 'פאנק: סט התאים השני (אוקטבה והקדמות ♭7)' },
];
/** Drum groove under each style (B5), from the metronome's groove bank. */
const STYLE_GROOVE = ['rock-8b', 'ballad', 'motown', 'shuffle', 'disco', 'reggae', 'bossa', 'samba', 'tumbao', 'funk-1', 'rnb', 'rock-16', 'seven-8', 'maqsum', '', 'rnb', 'funk-2'];
function genStyle(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = (s.option ?? 0) % STYLE_T.length;
  const nm = STYLE_T[op];
  const rnd = rng(`b-styles:${key}:${op}`);
  let prog: Prog = PROGS.pop;
  let chart: string[] | null = null;
  let line: BN[] = [];
  let meter = 4;
  let pulse: 8 | undefined;
  let evenness = false;
  let tail = 1;
  switch (op) {
    case 0: {
      prog = PROGS.rock;
      line = overProg(tu, key, prog, (R) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, k) => ({ b, d: 0.5, p: k === 6 ? R + 12 : R, acc: b === 0 || b === 2 || b === 1.5 })));
      evenness = true;
      break;
    }
    case 1: {
      // B4: the 5th is the CHORD's 5th (D under G/B, never F♯), and the chart names the slash bass (G/B).
      const bass = [0, 11, 9, 5].map((d) => rootOf(tu, key + d));
      prog = [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']];
      chart = chartOf(key, prog).map((c, i) => (i === 1 ? `${c}/${NAMES[mod(key + 11, 12)]}` : c));
      line = [{ b: 0, d: 2, p: bass[0] }];
      bass.forEach((p, bar) => {
        const five = rootOf(tu, key + prog[bar][0] + 7);
        const near = [five - 12, five, five + 12].filter((x) => x >= lowest(tu)).sort((a, b) => Math.abs(a - p - 4) - Math.abs(b - p - 4))[0];
        line.push({ b: bar * 4 + 2, d: 1.5, p: near });
        if (bar < 3) line.push({ b: bar * 4 + 3.5, d: 2.5, p: bass[bar + 1], acc: true });
      });
      break;
    }
    case 2: {
      prog = PROGS.pop;
      line = overProg(tu, key, prog, (R, c, _bar, next) => {
        const six = c[1] === 'm' ? 8 : 9;
        const appr = next === R ? R - 1 : next > R ? next - 1 : next + 1;
        return [
          { b: 0, d: 1, p: R },
          { b: 1, d: 0.5, p: R + 7 },
          { b: 1.5, d: 0.5, p: R + six, ct: false },
          { b: 2, d: 1, p: R + 12 },
          { b: 3, d: 0.5, p: R + 7 },
          { b: 3.5, d: 0.5, p: appr, ct: false },
        ];
      });
      break;
    }
    case 3: {
      prog = BLUES;
      const tr = 2 / 3;
      line = overProg(tu, key, prog, (R) => [0, 4, 7, 9, 10, 9, 7, 4].map((x, k) => ({ b: Math.floor(k / 2) + (k % 2 ? tr : 0), d: k % 2 ? 1 / 3 : tr, p: R + x, ct: x !== 9 })));
      break;
    }
    case 4: {
      prog = [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, 'm7']];
      line = overProg(tu, key, prog, (R) => grid('R.xOR.xOR.xOR.xO', (ch) => cellNote(R, ch)).map((x) => ({ ...x, d: Math.min(x.d, 0.5) })));
      evenness = true;
      break;
    }
    case 5: {
      prog = [[0, 'm'], [0, 'm'], [5, 'm'], [5, 'm']];
      line = overProg(tu, key, prog, (R) =>
        [
          [1, 0.5, 0],
          [1.5, 0.5, 0],
          [2.5, 0.5, 7],
          [3, 0.5, 10],
          [3.5, 0.5, 7],
        ].map(([b, d, x]) => ({ b, d, p: R + x, tech: 'mute' as Tech, st: 'p' as Stroke, ct: x !== 10 })),
      );
      break;
    }
    case 6: {
      prog = [[0, 'maj7'], [2, 'm7'], [7, '7'], [0, 'maj7']];
      line = overProg(tu, key, prog, (R) => {
        const five = R - 5 >= lowest(tu) ? R - 5 : R + 7;
        return [
          { b: 0, d: 1.5, p: R },
          { b: 1.5, d: 0.5, p: five },
          { b: 2, d: 1.5, p: five },
          { b: 3.5, d: 0.5, p: R },
        ];
      });
      break;
    }
    case 7: {
      prog = [[0, 'M'], [7, '7'], [7, '7'], [0, 'M']];
      line = overProg(tu, key, prog, (R) => {
        const five = R - 5 >= lowest(tu) ? R - 5 : R + 7;
        return [0, 2].flatMap((h) => [
          { b: h, d: 0.75, p: R },
          { b: h + 0.75, d: 0.25, p: R },
          { b: h + 1, d: 0.75, p: five, acc: true },
          { b: h + 1.75, d: 0.25, p: five },
        ]);
      });
      break;
    }
    case 8: {
      prog = PROGS.p145;
      // The tumbao anticipates the next chord's root on beat 4 (marked: it belongs to the next bar's chord).
      line = overProg(tu, key, prog, (R, _c, bar, next) => [...(bar === 0 ? [{ b: 0, d: 1.5, p: R }] : []), { b: 1.5, d: 1.5, p: R + 7 }, { b: 3, d: 1, p: next, acc: true, ct: false }]);
      break;
    }
    case 9:
    case 16: {
      prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']];
      // B8: the second funk item is a different cell set (octave and ♭7 pickups), not a duplicate of the first.
      line = cellLine(tu, key, prog, rnd, 4, op === 16 ? ['O.x7', 'R.xO', '..7O', 'x.O.', 'R..7', 'x.xO'] : FUNK_CELLS, op === 16 ? 'R.xO' : 'R...');
      break;
    }
    case 10:
    case 15: {
      // Gospel / neo-soul: chromatic runs into the changes, in swung 16ths (B9: the "e" and the "a" land late).
      prog = PROGS.jazz;
      const low = op === 15;
      const S = 0.3;
      line = overProg(tu, key, prog, (R0, c, _bar, next0) => {
        const R = low ? (lowRoot(tu, key + c[0]) ?? R0) : R0;
        const next = low ? (lowRoot(tu, mod(next0, 12)) ?? next0) : next0;
        const dn = next - 3 >= lowest(tu);
        return [
          { b: 0, d: 1, p: R },
          { b: 1 + S, d: 0.5, p: R + QI[c[1]][1] },
          { b: 1.5 + S, d: 0.2, p: R + 7 },
          { b: 2, d: 1, p: R + 7 },
          { b: 3, d: S, p: dn ? next - 3 : next + 3, ct: false },
          { b: 3 + S, d: 0.5 - S, p: dn ? next - 2 : next + 2, ct: false },
          { b: 3.5, d: S, p: dn ? next - 1 : next + 1, ct: false },
          { b: 3.5 + S, d: 0.5 - S, p: dn ? next - 1 : next + 1, ct: false },
        ];
      });
      if (low) line.push({ b: 16, d: 1, p: lowRoot(tu, key) ?? rootOf(tu, key) });
      tail = low ? 0 : 1;
      break;
    }
    case 11: {
      prog = [[0, 'm'], [0, 'm'], [3, 'M'], [1, 'M']];
      // B13: on a 5-string the gallop sits on the low B register.
      line = overProg(tu, key, prog, (R0, c) => {
        const R = lowRoot(tu, key + c[0]) ?? R0;
        return [0, 1, 2, 3].flatMap((b) => [{ b, d: 0.5, p: R, acc: true, st: 'D' as Stroke }, { b: b + 0.5, d: 0.25, p: R, st: 'D' as Stroke }, { b: b + 0.75, d: 0.25, p: R, st: 'U' as Stroke }]);
      });
      line.push({ b: 16, d: 1, p: lowRoot(tu, key) ?? rootOf(tu, key) });
      tail = 0;
      break;
    }
    case 12: {
      meter = 7;
      pulse = 8;
      prog = [[0, 'm'], [0, 'm'], [1, 'M'], [0, 'm']];
      // 7/8 as 2+2+3 (one beat = one 8th): root, root, ♭2 / 5, ♭7 lick in the 3-group.
      line = overProg(
        tu,
        key,
        prog,
        (R, _c, bar) => {
          const lick = [0, 0, 12, 0, bar % 2 ? 1 : 7, 10, 7];
          return [0, 1, 2, 3, 4, 5, 6].map((b) => ({ b, d: 1, p: R + lick[b], acc: b === 0 || b === 2 || b === 4, ct: ![1, 10].includes(lick[b]) }));
        },
        7,
      );
      evenness = true;
      break;
    }
    case 13: {
      // Hijaz (Phrygian dominant) ostinato over maqsum: 1 – ♭2 – 3 – 1 with the dum on 1 and the "and" of 2.
      prog = [[0, 'M'], [0, 'M'], [10, 'm'], [0, 'M']];
      chart = [`${NAMES[key]}`, `${NAMES[key]}`, `${NAMES[mod(key + 10, 12)]}m`, `${NAMES[key]}`];
      line = overProg(tu, key, prog, (R, c) => {
        return [
          { b: 0, d: 1, p: R, acc: true },
          { b: 1.5, d: 0.5, p: R, acc: true },
          { b: 2, d: 0.5, p: R + 1, ct: false },
          { b: 2.5, d: 0.5, p: R + (c[0] === 10 ? 3 : 4) },
          { b: 3, d: 0.5, p: R + 1, ct: false },
          { b: 3.5, d: 0.5, p: R - 1 >= lowest(tu) ? R - 1 : R + 11, ct: false },
        ];
      });
      break;
    }
    case 14: {
      // Hijaz in 10/8 (3+3+2+2, one beat = one 8th): the ostinato on 1, 4, 7 and 9.
      meter = 10;
      pulse = 8;
      prog = [[0, 'M'], [0, 'M'], [0, 'M'], [0, 'M']];
      line = overProg(
        tu,
        key,
        prog,
        (R, _c, bar) =>
          [
            [0, 2, 0],
            [2, 1, 1],
            [3, 2, 4],
            [5, 1, 1],
            [6, 2, bar % 2 ? 7 : 0],
            [8, 2, bar % 2 ? 1 : -1],
          ].map(([b, d, x]) => ({ b, d, p: x < 0 && R - 1 < lowest(tu) ? R + 11 : R + x, acc: b === 0 || b === 3 || b === 6 || b === 8, ct: ![1, -1].includes(x) })),
        10,
      );
      evenness = true;
      break;
    }
  }
  const beats = prog.length * meter;
  if (tail) line.push(endOn(tu, key, beats, 1));
  const groove = STYLE_GROOVE[op];
  const ghosts = line.some((x) => x.tech === 'dead');
  return drillOf(s, tu, line.some((x) => x.st) ? line : alt(line), {
    ...nm,
    chart: chart ?? chartOf(key, prog),
    meter,
    pulse,
    evenness,
    // B5: every style level locks with the drum kick (the F5 rule), when a groove plays under it.
    // N8: every style line with written dead notes asks for them dead (0.85 for the styles, 0.9 for the funk-ghost op 4).
    bass:
      groove || ghosts
        ? { ...(groove ? { kick: 25 } : {}), ...(op === 10 || op === 15 ? { swing: { ratio: 1.5, tol: 0.1, sub: 16 as const } } : {}), ...(op === 4 ? { ghostClass: 0.9 } : ghosts ? { ghostClass: 0.85 } : {}) }
        : undefined,
    drums: groove ? { groove } : undefined,
  });
}

/**
 * RSL / Trinity stylistic studies (BASS_VALIDATION §3, Gr 1–8): 8-bar studies that combine the grade's techniques in
 * one style, played with the band. op 0 rock (Gr 1–3: 8ths, octave pumps, a slide into the change, real rests,
 * accents); op 1 funk / slap (Gr 4–6: thumb, pops, ghosts, hammer-ons in 16ths); op 2 jazz (Gr 6–8: two bars walking,
 * two bars of an upper-register fill in swung 8ths, repeated through the second half). Every note is written and judged
 * note for note; dead notes must be dead.
 */
function genStudy(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = (s.option ?? 0) % 3;
  const rnd = rng(`b-styles:study:${key}:${op}`);
  let line: BN[] = [];
  let prog: Prog;
  if (op === 0) {
    prog = [...PROGS.rock, ...PROGS.rock];
    line = overProg(tu, key, prog, (R, _c, bar, next) => {
      if (bar % 4 === 1) return [...[0, 0.5, 1, 1.5].map((b, k): BN => ({ b, d: 0.5, p: k % 2 ? R + 12 : R, acc: k === 0 })), { b: 2, d: 0.5, p: R, acc: true }, { b: 3, d: 0.5, p: R + 7 }];
      if (bar % 4 === 3) return [{ b: 0, d: 1, p: R, acc: true }, { b: 1, d: 0.5, p: R + 7 }, { b: 2, d: 0.5, p: R + 10 }, { b: 3, d: 0.5, p: next - 2 }, { b: 3.5, d: 0.5, p: next, tech: 'slide' as Tech, ct: false }];
      return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, k) => ({ b, d: 0.5, p: R, acc: k === 0 || k === 4 }));
    });
  } else if (op === 1) {
    prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [0, 'm7'], [0, 'm7'], [0, 'm7'], [5, '7'], [7, '7']];
    line = cellLine(tu, key, prog, rnd, 8, ['T.xP', 'T.HP', 'x.TP', 'T.T.', 'P.xT', 'T.xQ', 'TxP.'], 'T.xP');
  } else {
    prog = [...PROGS.iivi, ...PROGS.iivi];
    const walk = refWalk(tu, textOf(key, PROGS.iivi), `b-styles:study:walk:${key}`, false).filter((x) => x.b < 8);
    const fill = (b0: number, R: number, ints: number[]): BN[] => [0, 1, 2, 3].flatMap((beat) => [{ b: b0 + beat, d: 2 / 3, p: R + 12 + ints[(beat * 2) % ints.length] }, { b: b0 + beat + 2 / 3, d: 1 / 3, p: R + 12 + ints[(beat * 2 + 1) % ints.length] }]);
    for (const half of [0, 16]) {
      for (const x of walk) line.push({ ...x, b: x.b + half });
      [2, 3].forEach((bar) => {
        const c = prog[bar];
        const R = rootOf(tu, key + c[0]);
        line.push(...fill(half + bar * 4, R, [...QI[c[1]], 12, QI[c[1]][2]]));
      });
    }
  }
  line.push(endOn(tu, key, prog.length * 4, 1));
  const T: T2[] = [tt('Stylistic study: rock (8 bars)', 'אטיוד סגנוני: רוק (8 תיבות)'), tt('Stylistic study: funk and slap (8 bars)', 'אטיוד סגנוני: פאנק וסלאפ (8 תיבות)'), tt('Stylistic study: jazz, upper register (8 bars)', 'אטיוד סגנוני: ג׳אז, אזור גבוה (8 תיבות)')];
  const groove = ['rock-8b', 'funk-1', 'swing'][op];
  const dead = line.some((x) => x.tech === 'dead');
  return drillOf(s, tu, op === 0 ? alt(line) : line, {
    ...T[op],
    chart: chartOf(key, prog),
    evenness: false,
    open: op === 2 ? false : undefined,
    bass: { ...(op === 0 ? { kick: 25 } : {}), ...(dead ? { ghostClass: 0.85 } : {}), ...(op === 1 ? { slapAdvice: true } : {}) },
    drums: { groove },
  });
}

/**
 * Trinity session skills / RSL improvisation: improvise a bass part over a rock or pop chart read at sight (a new chart
 * for every key and option), only the chart shown, judged by the chord-tone rules, with the band.
 */
function genSession(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-read:session:${key}:${op}`);
  // op 0 rock charts (I–♭VII–IV, I–IV–V), op 1 pop charts (I–vi–IV–V, vi–IV–I–V, I–iii–IV–V); a new chart per key.
  const pool: Prog[] = op === 1 ? [PROGS.pop, [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']], [[0, 'M'], [4, 'm'], [5, 'M'], [7, 'M']]] : [PROGS.rock, PROGS.p145, PROGS.p1451, [[0, 'M'], [10, 'M'], [5, 'M'], [5, 'M']]];
  const prog: Prog = [pool[Math.floor(rnd() * pool.length)], pool[Math.floor(rnd() * pool.length)]].flat();
  prog.splice(prog.length - 2, 2, [7, 'M'], [0, 'M']);
  // The model line (opt-in): rock 8ths on the root with an octave; pop root–5th–3rd with a push into the change.
  const line = overProg(tu, key, prog, (R, c) =>
    op === 1 ? [0, 1.5, 2, 3, 3.5].map((b, k) => ({ b, d: k === 0 ? 1.5 : 0.5 + (k === 2 ? 0.5 : 0), p: R + [0, 7, QI[c[1]][1], 7, 0][k], ct: true })) : [0, 1, 1.5, 2, 3].map((b, k) => ({ b, d: k === 1 || k === 2 ? 0.5 : 1, p: R + [0, 0, 12, QI[c[1]][2], QI[c[1]][1]][k], ct: true })),
  );
  line.push(endOn(tu, key, prog.length * 4, 1));
  const groove = op === 1 ? 'pop-1' : 'rock-8';
  return drillOf(s, tu, alt(line), {
    en: op === 1 ? 'Session: improvise over a pop chart' : 'Session: improvise over a rock chart',
    he: op === 1 ? 'סשן: אלתור על צ׳ארט פופ' : 'סשן: אלתור על צ׳ארט רוק',
    chart: chartOf(key, prog),
    show: 'chart',
    evenness: false,
    bass: { rules: rulesOf(key, prog, 'chordTones') },
    drums: { groove },
  });
}

/** Build a b-* drill (called from generateGuitar). */
export function generateBass(s: DrillSpec, tu: Tuning): Drill {
  switch (s.family as BassFamilyId) {
    case 'b-pluck':
      return genPluck(s, tu);
    case 'b-fret':
      return genFret(s, tu);
    case 'b-length':
      return genLength(s, tu);
    case 'b-time':
      return genTime(s, tu);
    case 'b-pocket':
      return genPocket(s, tu);
    case 'b-ghost':
      return genGhost(s, tu);
    case 'b-chord':
      return genChord(s, tu);
    case 'b-scale':
      return genScale(s, tu);
    case 'b-walk':
      return genWalk(s, tu);
    case 'b-slap': {
      // Slap / pop class is advice only (A13); the ghost hits of the ghost-slap pattern are classified (A3).
      const d = genSlap(s, tu);
      return { ...d, goal: { ...d.goal, bass: { ...(d.goal.bass ?? {}), slapAdvice: true, ...(s.kind === 'ghostslap' ? { ghostClass: 0.85 } : {}) } } };
    }
    case 'b-ear':
      return generateBassEar(s, tu);
    case 'b-up-pos':
    case 'b-up-arco':
    case 'b-up-scales':
    case 'b-up-pizz':
    case 'b-up-walk':
    case 'b-up-read':
      return generateUpright(s, tu);
    case 'b-legato':
      return genLegatoB(s, tu);
    case 'b-pick':
      return genPick(s, tu);
    case 'b-read':
      return s.kind === 'session' ? genSession(s, tu) : genRead(s, tu);
    case 'b-styles':
      return s.kind === 'study' ? genStudy(s, tu) : genStyle(s, tu);
  }
  throw new Error(`Not a bass family: ${s.family}`);
}

// ───────────────────────────── catalogue ─────────────────────────────

/** Bass-friendly key lists: open-string keys first. */
const K6 = [4, 9, 2, 7, 0, 5];
const K4 = [4, 9, 2, 7];
const ANY = [4, 9];
const OPEN = [4];

/** The 14 bass families in teaching order (BASS_CURRICULUM §5; the path opens them in this order). */
export function bassFamilies(): GuitarFamilyDef[] {
  const L = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]): GuitarLevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: tt(en, he),
    specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })),
    keys,
    tempo,
    sub,
    ...(genres ? { genres } : {}),
  });
  const sp =
    (family: FamilyId) =>
    (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'bass', ...o });
  const fam = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]): GuitarFamilyDef => ({ id, title: tt(en, he), style: id === 'b-walk' ? 'jazz' : 'classical', genres: ['all'], instruments: ['bass'], levels });
  const PL = sp('b-pluck');
  const FR = sp('b-fret');
  const LN = sp('b-length');
  const TM = sp('b-time');
  const PK = sp('b-pocket');
  const GH = sp('b-ghost');
  const CH = sp('b-chord');
  const SC = sp('b-scale');
  const WK = sp('b-walk');
  const SL = sp('b-slap');
  const LG = sp('b-legato');
  const PI = sp('b-pick');
  const RD = sp('b-read');
  const ST = sp('b-styles');
  const EA = sp('b-ear');
  const E8 = '8ths';
  const S16 = '16ths';
  const Qn = 'quarters';
  const fams: GuitarFamilyDef[] = [
    fam('b-pluck', 'Plucking hand', 'יד ימין (פריטה)', [
      L('b-pluck', 1, 'Alternating rest strokes on open strings', 'מכות נשענות מתחלפות על מיתרים פתוחים', [PL('open')], OPEN, [60, 100], E8),
      L('b-pluck', 2, 'Even fingers (i and m sound the same)', 'אצבעות שוות (i ו-m נשמעות אותו דבר)', [PL('open', { option: 1 })], OPEN, [70, 110], E8),
      L('b-pluck', 3, 'Adjacent string crossing', 'מעבר בין מיתרים סמוכים', [PL('cross'), PL('cross', { option: 1 })], OPEN, [70, 120], E8),
      L('b-pluck', 4, 'String skipping', 'דילוג מיתרים', [PL('skip')], K6, [60, 100], E8),
      L('b-pluck', 5, '16th-note stamina', 'סיבולת בשש-עשריות', [PL('stamina', { perBeat: 4 })], K4, [60, 100], S16),
      L('b-pluck', 6, 'Accents and crescendo in 16ths', 'הדגשות וקרשנדו בשש-עשריות', [0, 1, 2, 3, 4].map((o) => (o === 4 ? PL('accent16', { option: 4, perBeat: 4, dynamics: 'cresc' }) : PL('accent16', { option: o, perBeat: 4 }))), ANY, [60, 90], S16),
      L('b-pluck', 7, 'Raking: economical descents', 'גריפה: ירידות חסכוניות', [PL('rake')], K6, [80, 140], E8),
      L('b-pluck', 8, 'Three-finger gallop', 'גאלופ בשלוש אצבעות', [PL('gallop', { minor: true })], [4, 9, 2], [80, 140], 'gallop'),
      L('b-pluck', 9, 'Plucking zones: neck and bridge tone', 'אזורי פריטה: צליל ליד הצוואר וליד הגשר', [PL('zone')], ANY, [80, 80], E8),
    ]),
    fam('b-time', 'Time and subdivision', 'זמן וחלוקות', [
      L('b-time', 1, 'Quarter-note pulse with the click', 'דופק ברבעים עם הקליק', [TM('pulse', { perBeat: 1 })], ANY, [60, 120], Qn),
      L('b-time', 2, '8ths and 8th triplets', 'שמיניות וטריולות', [TM('trip')], ANY, [60, 100], '8ths / triplets'),
      L('b-time', 3, 'Switching subdivisions', 'מעבר בין חלוקות', [TM('subs')], ANY, [60, 90], 'mixed'),
      L('b-time', 4, 'Click on 2 and 4', 'קליק על 2 ו-4', [TM('click', { option: 0 })], ANY, [70, 120], E8),
      L('b-time', 5, 'Click on the "and"', 'קליק על ה"וְ"', [TM('click', { option: 1 })], ANY, [70, 110], E8),
      L('b-time', 6, 'One click per bar', 'קליק אחד לתיבה', [TM('click', { option: 2 })], ANY, [70, 110], E8),
      L('b-time', 7, 'The click drops out', 'הקליק נעלם', [TM('click', { option: 3 })], ANY, [70, 120], E8),
      L('b-time', 8, 'Syncopation and anticipations', 'סינקופות והקדמות', [TM('synco')], K6, [70, 110], E8),
      L('b-time', 9, '16th syncopation', 'סינקופות בשש-עשריות', [TM('synco16', { perBeat: 4 }), TM('synco16', { perBeat: 4, option: 1 })], ANY, [60, 95], S16),
      L('b-time', 10, 'Odd meters: 5/4, 7/4, 7/8', 'משקלים אי-זוגיים: 5/4, 7/4, 7/8', [TM('odd', { option: 0 }), TM('odd', { option: 1 }), TM('odd', { option: 2, tempo: 140 })], K4, [70, 120], E8),
    ]),
    fam('b-fret', 'Fretting hand', 'יד שמאל (לחיצה)', [
      L('b-fret', 1, 'One finger per fret, chromatic', 'אצבע לכל סריג, כרומטי', [FR('spider', { option: 0 })], [9, 7, 5], [60, 100], E8),
      L('b-fret', 2, 'Finger permutations', 'תמורות אצבעות', [1, 2, 3, 4, 5].map((o) => FR('spider', { option: o })), [9, 7, 5], [60, 100], E8),
      L('b-fret', 3, 'Simandl 1-2-4 in low positions', 'סימנדל 1-2-4 במצבים נמוכים', [FR('simandl')], [5, 7, 10], [60, 90], E8),
      L('b-fret', 4, 'Shifts on one string', 'מעברי מצב על מיתר אחד', [FR('one-string'), FR('one-string', { option: 1 })], K6, [50, 90], E8),
      L('b-fret', 5, 'Two-octave scales with position changes', 'סולמות בשתי אוקטבות עם החלפות מצב', [FR('2oct')], 'major', [60, 100], E8),
      L('b-fret', 6, 'Pivots and stretches', 'פיבוט ומתיחות', [FR('stretch', { stretch: true }), FR('stretch', { option: 1, stretch: true })], [5, 7, 8, 9], [60, 90], E8),
      L('b-fret', 7, 'Octaves and 10ths', 'אוקטבות ודצימות', [FR('oct10'), FR('oct10', { option: 1 })], 'major', [80, 120], E8),
      L('b-fret', 8, 'Upper-register fluency', 'שטף באזור הגבוה', [FR('upper')], K6, [60, 100], E8),
    ]),
    fam('b-chord', 'Roots, 5ths and chord tones', 'יסודות, קווינטות וצלילי אקורד', [
      L('b-chord', 1, 'Roots of a chord chart', 'יסודות של מהלך אקורדים', [CH('roots'), CH('roots', { option: 1 }), CH('roots', { option: 2 })], K6, [70, 120], E8),
      L('b-chord', 2, 'Root and 5th', 'יסוד וקווינטה', [CH('r5', { perBeat: 1 })], 'major', [70, 120], Qn),
      L('b-chord', 3, 'Root – 5th – octave', 'יסוד – קווינטה – אוקטבה', [CH('r58')], 'major', [70, 120], E8),
      L('b-chord', 4, 'Triad arpeggios in position', 'ארפג׳יו משולשים במצב', [CH('triad'), CH('triad', { minor: true })], 'major', [70, 120], E8),
      L('b-chord', 5, 'Triad inversions', 'היפוכי משולשים', [CH('inv', { option: 1 }), CH('inv', { option: 2 })], 'major', [60, 100], E8),
      L('b-chord', 6, '7th-chord arpeggios', 'ארפג׳יו ספטאקורדים', [0, 1, 2, 3, 4].map((o) => CH('sev', { option: o })), 'major', [60, 110], E8),
      L('b-chord', 7, 'Two-octave arpeggios', 'ארפג׳יו בשתי אוקטבות', [0, 1, 2].map((o) => CH('arp2', { option: o })), K6, [60, 100], E8),
      L('b-chord', 8, 'Chord tones through a progression', 'צלילי אקורד לאורך מהלך', [CH('ctline', { perBeat: 1 })], 'major', [70, 110], Qn),
      L('b-chord', 9, 'Nearest chord tone (voice leading)', 'צליל האקורד הקרוב (הובלת קולות)', [CH('nearest', { perBeat: 1 })], 'major', [70, 110], Qn),
      L('b-chord', 10, 'Slash chords and pedal points', 'אקורדי סלאש וצלילי עוגב', [CH('slash'), CH('slash', { option: 1 })], K6, [70, 110], E8),
      // 0.64 (B15): the arpeggios and chords RSL grades 5–8 ask for.
      L('b-chord', 11, 'Two-octave 7th arpeggios', 'ארפג׳יו ספטאקורדים בשתי אוקטבות', [0, 1, 2].map((o) => CH('arp7x2', { option: o })), K6, [60, 100], E8),
      L('b-chord', 12, '9th arpeggios', 'ארפג׳יו נונות', [0, 1, 2].map((o) => CH('arp9', { option: o })), K6, [60, 100], E8),
      L('b-chord', 13, 'Altered-dominant arpeggios', 'ארפג׳יו דומיננטיים אלטרד', [0, 1, 2, 3].map((o) => CH('arpalt', { option: o })), K4, [60, 100], E8),
      L('b-chord', 14, 'High-register chords', 'אקורדים באזור הגבוה', [CH('hichords', { perBeat: 0.5 }), CH('hichords', { perBeat: 0.5, option: 1 })], K6, [60, 90], 'halves'),
    ]),
    fam('b-ear', 'Bass ear', 'שמיעה לבסיסטים', [
      L('b-ear', 1, 'Higher or lower, in the bass register', 'גבוה או נמוך, באזור הבס', [EA('hilo'), EA('hilo', { option: 1 })], ANY, [60, 80], 'whole notes'),
      L('b-ear', 2, 'Find the tonic on your bass', 'למצוא את הטוניקה על הבס', [EA('tonic')], K6, [70, 90], 'whole notes'),
      L('b-ear', 3, 'Root finder: I, IV, V', 'מוצא היסודות: I, IV, V', [EA('roots')], K6, [70, 100], 'halves'),
      L('b-ear', 4, 'Root finder: ii, iii, vi, V7', 'מוצא היסודות: ii, iii, vi, V7', [EA('roots', { option: 1 })], K6, [70, 100], 'halves'),
      L('b-ear', 5, 'Rhythm recall on the E string', 'זיכרון מקצב על מיתר E', [EA('rhythm', { option: 0 }), EA('rhythm', { option: 1 })], OPEN, [70, 100], E8),
      L('b-ear', 6, 'Melodic recall: play it back', 'זיכרון מלודי: לנגן בחזרה', [EA('melodic')], K6, [60, 90], E8),
      L('b-ear', 7, 'Transcribe a walking line', 'לתמלל קו ווקינג', [EA('transcribe', { perBeat: 1 }), EA('transcribe', { perBeat: 1, option: 1 })], K6, [70, 110], Qn),
      L('b-ear', 8, 'Inversions and slash bass by ear', 'היפוכים ובס סלאש בשמיעה', [EA('slash', { perBeat: 0.5 }), EA('slash', { perBeat: 0.5, option: 1 })], K6, [60, 90], 'halves'),
      // RSL ear tests Gr 6–8: chord quality, answered on the bass (its arpeggio), so it is measured.
      L('b-ear', 9, 'Chord quality by ear: play its arpeggio', 'סוג האקורד בשמיעה: לנגן את הארפג׳יו שלו', [EA('quality', { perBeat: 1 }), EA('quality', { perBeat: 1, option: 1 })], K6, [60, 90], Qn),
    ]),
    fam('b-scale', 'Scales and modes', 'סולמות ומודוסים', [
      L('b-scale', 1, 'Minor and major pentatonic', 'פנטטוני מינור ומז׳ור', [SC('scale', { option: 8 }), SC('scale', { option: 9 })], K6, [70, 110], E8),
      L('b-scale', 2, 'Major scale in position', 'סולם מז׳ור במצב', [SC('scale', { option: 0 })], 'major', [70, 110], E8),
      L('b-scale', 3, 'Natural minor and the blues scale', 'מינור טבעי וסולם בלוז', [SC('scale', { option: 5 }), SC('scale', { option: 10 })], 'major', [70, 110], E8),
      L('b-scale', 4, 'Dorian and Mixolydian, two positions', 'דורי ומיקסולידי, שני מצבים', [SC('scale', { option: 1 }), SC('scale', { option: 4 }), SC('scale', { option: 1, position: 1 }), SC('scale', { option: 4, position: 1 })], 'major', [80, 110], E8),
      L('b-scale', 5, 'Pentatonic positions linked', 'מצבי הפנטטוני ברצף', [SC('penta5')], K4, [70, 100], E8),
      L('b-scale', 6, 'Scales in 3rds and 4ths', 'סולמות בטרצות ובקוורטות', [SC('seq'), SC('seq', { option: 1 })], 'major', [60, 100], E8),
      L('b-scale', 7, 'Harmonic and melodic minor', 'מינור הרמוני ומלודי', [SC('scale', { option: 6 }), SC('scale', { option: 7 })], 'major', [60, 100], E8),
      L('b-scale', 8, 'Lydian and Phrygian', 'לידי ופריגי', [SC('scale', { option: 3 }), SC('scale', { option: 2 })], 'major', [70, 100], E8),
      L('b-scale', 9, 'Whole-tone, diminished and altered', 'טון שלם, מוקטן ואלטרד', [SC('scale', { option: 11 }), SC('scale', { option: 12 }), SC('scale', { option: 13 })], 'major', [70, 100], E8),
      L('b-scale', 10, 'The five pentatonic positions, one by one', 'חמשת מצבי הפנטטוני, אחד אחד', [0, 1, 2, 3, 4].map((ps) => SC('penta-pos', { position: ps, minor: true })), K4, [70, 100], E8),
    ]),
    fam('b-length', 'Muting and note length', 'השתקה ואורך צליל', [
      L('b-length', 1, 'Real rests', 'הפסקות אמיתיות', [LN('rests', { perBeat: 1 }), LN('rests', { perBeat: 1, option: 1 })], ANY, [70, 110], Qn),
      L('b-length', 2, 'Staccato and legato', 'סטקטו ולגאטו', [LN('stacc')], K4, [80, 110], E8),
      L('b-length', 3, 'Idle strings muted', 'השתקת מיתרים לא בשימוש', [LN('idle')], ANY, [80, 120], E8),
      L('b-length', 4, 'Release on the "and"', 'לשחרר על ה"וְ"', [LN('release-and')], K6, [80, 110], E8),
      L('b-length', 5, 'Muted octaves', 'אוקטבות מושתקות', [LN('oct-mute')], 'major', [90, 120], E8),
      L('b-length', 6, 'Thumb and palm mute', 'אגודל והשתקת כף יד', [LN('thumb-mute', { minor: true })], K4, [70, 100], E8),
      L('b-length', 7, 'Note lengths in a groove', 'אורכי צלילים בתוך גרוב', [LN('mixed-len', { perBeat: 4 })], K6, [80, 110], S16),
    ]),
    fam('b-pocket', 'Pocket: lock with the drums', 'כיס: נעילה עם התופים', [
      L('b-pocket', 1, 'Play the kick', 'לנגן עם הבס-דראם', [0, 1, 2, 3].map((o) => PK('kick', { option: o })), ANY, [70, 110], E8),
      L('b-pocket', 2, 'Kick and chord changes', 'בס-דראם והחלפות אקורדים', [PK('kick-chart', { option: 1 }), PK('kick-chart', { option: 2 })], K6, [80, 120], E8),
      L('b-pocket', 3, 'Shuffle feel', 'תחושת שאפל', [PK('shuffle', { perBeat: 3 })], ANY, [80, 140], 'swung 8ths'),
      L('b-pocket', 4, '16th funk lock', 'נעילת פאנק בשש-עשריות', [0, 1, 2].map((o) => PK('kick16', { option: o, perBeat: 4 })), K4, [80, 105], S16),
      L('b-pocket', 5, 'Swung 16ths', 'שש-עשריות בסווינג', [PK('swing16', { perBeat: 4 }), PK('swing16', { perBeat: 4, option: 1 })], ANY, [75, 95], 'swung 16ths'),
      L('b-pocket', 6, 'Pocket on purpose', 'כיס מכוון', [PK('pocket')], ANY, [80, 100], E8),
      L('b-pocket', 7, 'Half-time and feel changes', 'חצי זמן ומעברי תחושה', [PK('halftime')], K4, [80, 120], 'mixed'),
      L('b-pocket', 8, "Following the drummer's fills", 'לעקוב אחרי המילויים של המתופף', [PK('fills')], ANY, [80, 120], E8),
    ]),
    fam('b-read', 'Reading and charts', 'קריאה וצ׳ארטים', [
      L('b-read', 1, 'Bass clef: open strings and first position', 'מפתח פה: מיתרים פתוחים ומצב ראשון', [RD('clef-name', { perBeat: 0.5 }), RD('clef', { perBeat: 1 })], [0, 7, 5], [40, 60], Qn),
      L('b-read', 2, 'Rhythm reading on one string', 'קריאת מקצב על מיתר אחד', [RD('rhythm'), RD('rhythm', { option: 1 })], [4], [60, 90], 'quarters / 8ths'),
      L('b-read', 3, 'Four-bar melodies', 'מנגינות בארבע תיבות', [RD('melody'), RD('melody', { minor: true })], [0, 7, 5, 9], [60, 90], E8),
      L('b-read', 4, 'Key signatures up to 3 sharps / 3 flats', 'סימני היתק עד 3 דיאזים / 3 במולים', [RD('keysig')], [0, 7, 2, 9, 5, 10, 3], [70, 90], E8),
      L('b-read', 5, 'Reading in a given position', 'קריאה במצב נתון', [RD('pos', { option: 0 }), RD('pos', { option: 1 }), RD('pos', { option: 2 })], ANY, [70, 90], E8),
      L('b-read', 6, 'Chord-symbol charts', 'צ׳ארטים של סימני אקורדים', [RD('chartroots', { perBeat: 1 }), RD('chartroots', { perBeat: 1, option: 1 })], ANY, [80, 110], Qn),
      L('b-read', 7, 'Nashville numbers', 'מספרי נאשוויל', [RD('nashville', { perBeat: 1 })], 'major', [80, 110], Qn),
      L('b-read', 8, 'Written groove and continuation', 'גרוב כתוב והמשך', [RD('written', { perBeat: 1 })], K6, [80, 100], E8),
      L('b-read', 9, '16th funk reading', 'קריאת פאנק בשש-עשריות', [RD('funkread', { perBeat: 4 }), RD('funkread', { perBeat: 4, option: 1 })], K4, [70, 95], S16),
      L('b-read', 10, 'Nashville: the key switches on the repeat', 'נאשוויל: הסולם מתחלף בחזרה', [RD('nash-switch', { perBeat: 1 }), RD('nash-switch', { perBeat: 1, option: 1 })], 'major', [80, 110], Qn),
      L('b-read', 11, 'Chart roadmaps: repeats, endings, D.S.', 'מפות צ׳ארט: חזרות, סיומות, D.S.', [RD('roadmap', { perBeat: 1 }), RD('roadmap', { perBeat: 1, option: 1 })], K6, [80, 110], Qn),
      L('b-read', 12, 'Quick study: lead sheet with free bars', 'לימוד מהיר: לידשיט עם תיבות חופשיות', [RD('quick')], K6, [70, 100], E8),
      // Trinity session skills / RSL improvisation over a rock or pop chart, with the band.
      L('b-read', 13, 'Session skills: improvise over a rock / pop chart', 'מיומנויות סשן: אלתור על צ׳ארט רוק / פופ', [RD('session', { perBeat: 1 }), RD('session', { perBeat: 1, option: 1 })], K6, [80, 110], Qn),
    ]),
    fam('b-styles', 'Style vocabulary', 'אוצר מילים סגנוני', [
      L('b-styles', 1, 'Rock', 'רוק', [ST('style', { option: 0 })], K6, [90, 140], E8, ['rock', 'metal', 'pop']),
      L('b-styles', 2, 'Pop ballad', 'בלדת פופ', [ST('style', { option: 1 })], K6, [65, 85], E8, ['pop']),
      L('b-styles', 3, 'Motown', 'מוטאון', [ST('style', { option: 2 })], K6, [90, 125], E8, ['funk', 'pop']),
      L('b-styles', 4, 'Blues shuffle', 'שאפל בלוז', [ST('style', { option: 3 })], K6, [80, 140], 'swung 8ths', ['blues', 'rock']),
      L('b-styles', 5, 'Disco', 'דיסקו', [ST('style', { option: 4, perBeat: 4 })], K6, [110, 125], S16, ['funk', 'pop']),
      L('b-styles', 6, 'Reggae one-drop', 'רגאיי וואן-דרופ', [ST('style', { option: 5, minor: true })], K6, [70, 90], E8, ['reggae']),
      L('b-styles', 7, 'Bossa nova', 'בוסה נובה', [ST('style', { option: 6 })], K6, [120, 150], E8, ['latin', 'jazz']),
      L('b-styles', 8, 'Samba', 'סמבה', [ST('style', { option: 7, perBeat: 4 })], K6, [90, 110], S16, ['latin']),
      L('b-styles', 9, 'Tumbao / son', 'טומבאו / סון', [ST('style', { option: 8 })], K6, [90, 120], E8, ['latin']),
      L('b-styles', 10, 'Funk', 'פאנק', [ST('style', { option: 9, perBeat: 4 }), ST('style', { option: 16, perBeat: 4 })], K6, [90, 110], S16, ['funk']),
      L('b-styles', 11, 'Gospel / neo-soul', 'גוספל / ניאו-סול', [ST('style', { option: 10, perBeat: 4 })], K6, [70, 90], S16, ['funk', 'pop', 'jazz']),
      L('b-styles', 12, 'Metal and odd meter', 'מטאל ומשקל אי-זוגי', [ST('style', { option: 11, tuning: 'bass-dropd' }), ST('style', { option: 12, tempo: 180 })], [2, 4], [120, 180], 'gallop / 7/8', ['metal', 'rock']),
      L('b-styles', 13, 'Middle Eastern: Hijaz ostinati', 'מזרחי: אוסטינטי בחיג׳אז', [ST('style', { option: 13 }), ST('style', { option: 14, tempo: 180 })], K4, [90, 120], E8, ['all']),
      L('b-styles', 14, 'Gospel in the low register (5-string)', 'גוספל באזור הנמוך (5 מיתרים)', [ST('style', { option: 15, perBeat: 4 })], K6, [70, 90], S16, ['funk', 'pop', 'jazz']),
      // RSL / Trinity stylistic studies: 8 bars combining the grade's techniques, with the band.
      L('b-styles', 15, 'Stylistic study: rock (Grades 1–3)', 'אטיוד סגנוני: רוק (שלבים 1–3)', [ST('study', { option: 0 })], K6, [80, 120], E8, ['rock', 'pop']),
      L('b-styles', 16, 'Stylistic study: funk and slap (Grades 4–6)', 'אטיוד סגנוני: פאנק וסלאפ (שלבים 4–6)', [ST('study', { option: 1, perBeat: 4 })], K4, [70, 100], S16, ['funk']),
      L('b-styles', 17, 'Stylistic study: jazz, upper register (Grades 6–8)', 'אטיוד סגנוני: ג׳אז, אזור גבוה (שלבים 6–8)', [ST('study', { option: 2, perBeat: 1 })], 'major', [90, 140], 'quarters / swung 8ths', ['jazz']),
    ]),
    fam('b-ghost', 'Ghost notes and 16th funk', 'צלילי רפאים ופאנק בשש-עשריות', [
      L('b-ghost', 1, 'Make a dead note', 'ליצור צליל מת', [GH('ghost8')], ANY, [70, 100], E8),
      L('b-ghost', 2, 'Ghost notes in 16ths', 'צלילי רפאים בשש-עשריות', [GH('ghost16', { perBeat: 4 })], K4, [60, 95], S16),
      L('b-ghost', 3, 'Ghost before the octave', 'צליל רפאים לפני האוקטבה', [GH('ghost-oct', { perBeat: 4 })], K6, [70, 105], S16),
      L('b-ghost', 4, 'Ghosts quieter than the notes', 'רפאים שקטים מהצלילים', [GH('ghost-dyn', { perBeat: 4 })], ANY, [70, 100], S16),
      L('b-ghost', 5, 'Two-bar funk lines', 'קווי פאנק בשתי תיבות', [GH('funk-line', { perBeat: 4 }), GH('funk-line', { perBeat: 4, option: 1 })], 'major', [70, 100], S16),
      L('b-ghost', 6, 'Stylistic study: 8 bars', 'אטיוד סגנוני: 8 תיבות', [GH('study', { perBeat: 4 })], K4, [80, 105], S16),
    ]),
    fam('b-walk', 'Walking bass, step by step', 'ווקינג בס, צעד אחר צעד', [
      L('b-walk', 1, 'Two-feel: roots and 5ths', 'בשתיים: יסודות וקווינטות', [WK('two-feel', { perBeat: 0.5 })], [5, 10], [80, 140], 'halves'),
      L('b-walk', 2, 'Quarter-note roots and 5ths', 'יסודות וקווינטות ברבעים', [WK('r5walk', { perBeat: 1 }), WK('r5walk', { perBeat: 1, option: 1 })], K6, [80, 140], Qn),
      L('b-walk', 3, 'Arpeggio walk', 'הליכת ארפג׳יו', [WK('arpwalk', { perBeat: 1 }), WK('arpwalk', { perBeat: 1, option: 1 })], 'major', [90, 150], Qn),
      L('b-walk', 4, 'Chromatic approach on beat 4', 'גישה כרומטית בפעמה 4', [WK('chrom', { perBeat: 1 })], 'major', [90, 150], Qn),
      L('b-walk', 5, 'Dominant approach', 'גישה דומיננטית', [WK('dom', { perBeat: 1 })], 'major', [90, 150], Qn),
      L('b-walk', 6, 'Scale-step approach', 'גישה בצעד סולמי', [WK('scaleapp', { perBeat: 1 })], 'major', [90, 150], Qn),
      L('b-walk', 7, 'Walking with mixed approaches', 'ווקינג עם גישות מעורבות', [WK('free', { perBeat: 1 }), WK('free', { perBeat: 1, option: 1 })], 'major', [100, 160], Qn),
      L('b-walk', 8, 'Ghosted skips and triplet drops', 'קפיצות רפאים וטריולות', [WK('skips', { perBeat: 1 })], [5, 10, 7, 0], [100, 160], 'quarters + triplets'),
      L('b-walk', 9, 'ii–V–I through all keys', 'ii–V–I בכל הסולמות', [WK('cycle', { perBeat: 1 })], 'major', [100, 180], Qn),
      L('b-walk', 10, 'Rhythm changes: two chords a bar', 'ריתם צ׳יינג׳ס: שני אקורדים בתיבה', [WK('rhythm', { perBeat: 1 })], [10, 3, 5], [100, 200], Qn),
      L('b-walk', 11, 'Standards: one chorus', 'סטנדרטים: סבב אחד', [0, 1, 2, 3].map((o) => WK('standard', { perBeat: 1, option: o })), [0], [100, 180], Qn),
      L('b-walk', 12, 'Up-tempo, in 2 and in 4', 'טמפו מהיר, בשתיים ובארבע', [WK('two-four', { perBeat: 1 })], [5, 10], [160, 240], 'halves / quarters'),
      // 0.64 (B18): more standards, each in its own key and feel; the bagrut solo and sight-read improvisation; low B.
      L('b-walk', 13, 'More standards: walking in 4', 'עוד סטנדרטים: ווקינג בארבע', stdOps((f, i) => i >= 4 && i < STD_FIRST && f === 'walk').map((o) => WK('standard', { perBeat: 1, option: o })), [0], [100, 180], Qn),
      L('b-walk', 14, 'Standards in 2, ballads and bossa', 'סטנדרטים בשתיים, בלדות ובוסה', stdOps((f, i) => i >= 4 && i < STD_FIRST && f !== 'walk').map((o) => WK('standard', { perBeat: 0.5, option: o })), [0], [70, 150], 'halves / bossa'),
      L('b-walk', 15, 'A two-chorus solo over the blues', 'סולו של שני סבבים על בלוז', [WK('solo')], [5, 10, 7], [80, 140], E8),
      L('b-walk', 16, 'Sight-read and improvise the walk', 'קריאה ממבט ראשון ואלתור ווקינג', [WK('sight-impro', { perBeat: 1 }), WK('sight-impro', { perBeat: 1, option: 1 })], 'major', [90, 160], Qn),
      L('b-walk', 17, 'Walking in the low register (low B)', 'ווקינג באזור הנמוך (B נמוך)', [WK('lowb', { perBeat: 1 })], 'major', [90, 150], Qn),
      L('b-walk', 18, 'Standards III: forms, cycles and Coltrane changes', 'סטנדרטים 3: צורות, מעגלים ושינויי קולטריין', BASS_STD.map((x, i) => (i >= STD_FIRST ? WK('standard', { perBeat: x.feel === 'walk' ? 1 : 0.5, option: i }) : null)).filter((x): x is NonNullable<typeof x> => x !== null), [0], [90, 180], 'quarters / halves'),
    ]),
    fam('b-legato', 'Slides, legato, harmonics', 'החלקות, לגאטו והרמוניקים', [
      L('b-legato', 1, 'Slides into notes', 'החלקות אל הצלילים', [LG('slide')], K6, [70, 110], E8),
      L('b-legato', 2, 'Hammer-on and pull-off pairs', 'זוגות הקשה ומשיכה', [LG('hp')], K6, [60, 100], E8),
      L('b-legato', 3, 'Legato lines', 'קווי לגאטו', [LG('legline', { perBeat: 4 })], K4, [70, 110], S16),
      L('b-legato', 4, 'Sliding octave double stops', 'אוקטבות כפולות בהחלקה', [LG('octslide')], K6, [70, 100], E8),
      L('b-legato', 5, 'Natural harmonics 12, 7, 5', 'הרמוניקים טבעיים 12, 7, 5', [LG('harm', { perBeat: 1 })], OPEN, [60, 90], Qn),
      L('b-legato', 6, 'Vibrato on long notes', 'ויברטו על צלילים ארוכים', [LG('vib', { perBeat: 0.5 })], K4, [60, 60], 'halves'),
      L('b-legato', 7, 'Pedal tones', 'צלילי עוגב', [LG('pedal', { perBeat: 4 })], K4, [80, 120], S16),
    ]),
    fam('b-pick', 'Pick technique', 'נגינה במפרט', [
      L('b-pick', 1, 'Down-stroke 8ths', 'שמיניות במכות למטה', [PI('down8')], ANY, [80, 150], E8),
      L('b-pick', 2, 'Alternate picking in 16ths', 'פריטה מתחלפת בשש-עשריות', [PI('alt16', { perBeat: 4 })], ANY, [70, 120], S16),
      L('b-pick', 3, 'Picked string crossing', 'מעבר מיתרים במפרט', [PI('pickcross')], K6, [70, 120], E8),
      L('b-pick', 4, 'Palm-muted chug', 'צ׳אג מושתק בכף היד', [PI('chug', { minor: true })], ANY, [80, 140], E8),
      L('b-pick', 5, 'Fast picking and gallops', 'פריטה מהירה וגאלופים', [PI('pgallop', { minor: true }), PI('pgallop', { minor: true, option: 1, tuning: 'bass-dropd' })], [4, 2], [100, 170], 'gallop'),
    ]),
    fam('b-slap', 'Slap and pop', 'סלאפ ופופ', [
      L('b-slap', 1, 'Thumb on open strings', 'אגודל על מיתרים פתוחים', [SL('thumb')], OPEN, [60, 100], E8),
      L('b-slap', 2, 'Octave slap and pop', 'סלאפ ופופ באוקטבות', [SL('octpop')], 'major', [60, 100], E8),
      L('b-slap', 3, 'Fretting-hand ghost slaps', 'מכות רפאים ביד שמאל', [SL('ghostslap', { perBeat: 4 })], ANY, [60, 95], S16),
      L('b-slap', 4, 'Hammer after the slap', 'הקשה אחרי הסלאפ', [SL('hammerslap', { perBeat: 4 })], K6, [60, 95], S16),
      L('b-slap', 5, '16th slap grooves', 'גרובי סלאפ בשש-עשריות', [SL('slap16', { perBeat: 4 }), SL('slap16', { perBeat: 4, option: 1 })], K6, [70, 100], S16),
      L('b-slap', 6, 'Slap with string crossing', 'סלאפ עם מעברי מיתרים', [SL('cross', { perBeat: 4 })], K6, [70, 100], S16),
      L('b-slap', 7, 'Double thumbing', 'אגודל כפול', [SL('double', { perBeat: 4 })], ANY, [60, 100], S16),
      L('b-slap', 8, 'Triplet slap combinations', 'צירופי סלאפ בטריולות', [SL('trip', { perBeat: 3 })], ANY, [60, 100], 'triplets'),
    ]),
    // The upright / double-bass track (BASS_CURRICULUM §5.1, B16): its own tuning (fretless), intonation in cents.
    ...uprightFamilies(L, fam),
  ];
  // B14: exam / bagrut mapping per level (BASS_AUDIT §3), shown on the level card and used by the badges.
  for (const f of fams) for (const l of f.levels) if (EXAM[l.id]) l.exam = EXAM[l.id].map(([board, grade]) => ({ board, grade }));
  return fams;
}

/** Level → exam tags (BASS_AUDIT §3: RSL grades, Trinity Rock & Pop grades, ABRSM double bass, the Israeli bagrut, Berklee/MI core). */
const EXAM: Record<string, [LevelExamTag['board'], string][]> = {
  'b-scale-1': [['RSL', 'Debut']],
  'b-read-2': [['RSL', 'Debut']],
  'b-ear-1': [['RSL', 'Debut']],
  'b-ear-5': [['RSL', 'Debut–3']],
  'b-scale-2': [['RSL', '1–3']],
  'b-scale-3': [['RSL', '1–3']],
  'b-chord-4': [['RSL', '1–3']],
  'b-chord-6': [['RSL', '3–6']],
  'b-read-3': [['RSL', '1–3']],
  'b-ear-6': [['RSL', '3–6'], ['Trinity', 'session: playback']],
  'b-scale-7': [['RSL', '5–7']],
  'b-chord-11': [['RSL', '5']],
  'b-ear-3': [['RSL', '4']],
  'b-ear-4': [['RSL', '5–6']],
  'b-read-8': [['RSL', '1–8: Improvisation & Interpretation'], ['Bagrut', 'improvisation']],
  'b-scale-4': [['RSL', '6']],
  'b-scale-10': [['RSL', '6']],
  'b-ghost-6': [['RSL', '6–8']],
  'b-slap-5': [['RSL', '6–8'], ['Trinity', '7']],
  'b-slap-6': [['RSL', '7']],
  'b-legato-3': [['RSL', '6–7']],
  'b-fret-8': [['RSL', '6']],
  'b-scale-8': [['RSL', '7']],
  'b-chord-12': [['RSL', '7']],
  'b-chord-14': [['RSL', '7']],
  'b-legato-5': [['RSL', '7–8']],
  'b-legato-7': [['RSL', '7']],
  'b-scale-9': [['RSL', '8']],
  'b-chord-13': [['RSL', '8']],
  'b-time-10': [['RSL', '8']],
  'b-styles-12': [['RSL', '8']],
  'b-read-12': [['RSL', '6–8: Quick Study Piece']],
  'b-legato-1': [['Trinity', '2']],
  'b-length-1': [['Trinity', '2']],
  'b-pluck-6': [['Trinity', '2–4']],
  'b-pluck-5': [['Trinity', '4']],
  'b-length-2': [['Trinity', '4']],
  'b-length-7': [['Trinity', '4']],
  'b-pocket-7': [['Trinity', '7']],
  'b-legato-4': [['Trinity', '7']],
  'b-pick-5': [['Trinity', '7']],
  'b-walk-7': [['Trinity', 'session: improvising'], ['Berklee', 'walking core']],
  'b-walk-4': [['Berklee', 'walking core']],
  'b-walk-18': [['Berklee', 'standards repertoire']],
  'b-walk-5': [['Berklee', 'walking core']],
  'b-walk-6': [['Berklee', 'walking core']],
  'b-read-9': [['Berklee', 'reading']],
  'b-pocket-1': [['Berklee', 'time & groove']],
  'b-ear-7': [['Bagrut', 'transcription']],
  'b-walk-11': [['Bagrut', 'pieces with a band']],
  'b-walk-15': [['Bagrut', '2-chorus solo']],
  'b-walk-16': [['Bagrut', 'sight-read improvisation']],
  'b-styles-2': [['Bagrut', 'ballad']],
  'b-styles-4': [['RSL', '1–3'], ['Bagrut', 'blues']],
  'b-styles-1': [['RSL', '1–3']],
  'b-styles-3': [['RSL', '1–3']],
  'b-styles-15': [['RSL', '1–3'], ['Trinity', '1–3']],
  'b-styles-16': [['RSL', '4–6'], ['Trinity', '4–6']],
  'b-styles-17': [['RSL', '6–8'], ['Trinity', '6–8']],
  'b-read-13': [['Trinity', 'session: improvising'], ['RSL', 'improvisation']],
  'b-ear-9': [['RSL', '6–8']],
  'b-walk-12': [['RSL', '8'], ['Bagrut', 'fast piece with a band']],
  'b-walk-13': [['Bagrut', 'pieces with a band']],
  'b-walk-14': [['Bagrut', 'ballad / medium with a band']],
  'b-up-scales-1': [['ABRSM', '1']],
  'b-up-scales-2': [['ABRSM', '2']],
  'b-up-scales-3': [['ABRSM', '3']],
  'b-up-scales-4': [['ABRSM', '4']],
  'b-up-scales-5': [['ABRSM', '5']],
  'b-up-scales-6': [['ABRSM', '5–6']],
  'b-up-scales-7': [['ABRSM', '6']],
  'b-up-scales-8': [['ABRSM', '8']],
  'b-up-scales-9': [['ABRSM', '7–8']],
  'b-up-pos-1': [['ABRSM', '1']],
  'b-up-pos-6': [['ABRSM', '7–8']],
  'b-up-read-4': [['ABRSM', '7–8']],
  'b-up-read-5': [['ABRSM', '8']],
  'b-up-read-6': [['ABRSM', '8']],
  'b-up-arco-7': [['ABRSM', '1–3']],
  'b-up-arco-8': [['ABRSM', '4–5']],
  'b-up-arco-9': [['ABRSM', '6–8']],
  'b-up-pizz-4': [['ABRSM', '4–5']],
  'b-up-scales-10': [['ABRSM', '7–8']],
};

type LFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type FamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** B16: the six upright families (fixed `upright` tuning, so a 5-string setting never moves them). */
function uprightFamilies(L: LFn, fam: FamFn): GuitarFamilyDef[] {
  const up = (family: BassFamilyId) => (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'bass', tuning: 'upright', ...o });
  const PO = up('b-up-pos');
  const AR = up('b-up-arco');
  const SS = up('b-up-scales');
  const PZ = up('b-up-pizz');
  const WU = up('b-up-walk');
  const RU = up('b-up-read');
  const G = [7, 2, 9, 5, 10, 4];
  const Qn = 'quarters';
  const E8 = '8ths';
  const out = [
    fam('b-up-pos', 'Upright: Simandl positions', 'קונטרבס: מצבי סימנדל', [
      L('b-up-pos', 1, 'Half position, 1-2-4', 'חצי מצב, 1-2-4', [PO('pos', { option: 0, perBeat: 1 })], [0], [50, 72], Qn),
      L('b-up-pos', 2, 'First position', 'מצב ראשון', [PO('pos', { option: 1, perBeat: 1 })], [0], [50, 72], Qn),
      L('b-up-pos', 3, 'Second position', 'מצב שני', [PO('pos', { option: 2, perBeat: 1 })], [0], [50, 72], Qn),
      L('b-up-pos', 4, 'Third position', 'מצב שלישי', [PO('pos', { option: 3, perBeat: 1 })], [0], [50, 72], Qn),
      L('b-up-pos', 5, 'Fourth position (to the octave harmonic)', 'מצב רביעי (עד ההרמוניק של האוקטבה)', [PO('pos', { option: 4, perBeat: 1 })], [0], [50, 72], Qn),
      L('b-up-pos', 6, 'Thumb position: an introduction', 'מצב אגודל: היכרות', [PO('pos', { option: 5, perBeat: 1 })], [0], [40, 66], Qn),
    ]),
    fam('b-up-arco', 'Upright: bowing', 'קונטרבס: קשת', [
      L('b-up-arco', 1, 'Long tones on open strings', 'צלילים ארוכים על מיתרים פתוחים', [AR('arco', { option: 0, perBeat: 0.25 })], [4], [50, 70], 'whole notes'),
      L('b-up-arco', 2, 'Separate bows', 'קשתות נפרדות', [AR('arco', { option: 1, perBeat: 1 })], G.slice(0, 3), [40, 72], Qn),
      L('b-up-arco', 3, 'Slurs', 'לגאטו בקשת', [AR('arco', { option: 2, perBeat: 1 })], G.slice(0, 3), [40, 72], Qn),
      L('b-up-arco', 4, 'Hooked bowing', 'קשת מחוברת', [AR('arco', { option: 3, perBeat: 1 })], G.slice(0, 3), [40, 66], 'dotted'),
      L('b-up-arco', 5, 'String crossing under one bow', 'מעבר מיתרים בקשת אחת', [AR('arco', { option: 4 })], [4], [50, 80], E8),
      L('b-up-arco', 6, 'Scales in rhythm', 'סולמות במקצב', [AR('arco', { option: 5 })], G, [50, 80], E8),
      // ABRSM lists A–C are pieces: original studies in each grade band's style, bowed, read from the staff, measured.
      L('b-up-arco', 7, 'Bowed study: Grades 1–3 style', 'אטיוד בקשת: סגנון שלבים 1–3', [AR('etude', { option: 0 })], [7, 2, 9], [50, 80], 'quarters / halves'),
      L('b-up-arco', 8, 'Bowed study: Grades 4–5 style (3/4, slurs)', 'אטיוד בקשת: סגנון שלבים 4–5 (3/4, לגאטו)', [AR('etude', { option: 1 }), AR('etude', { option: 1, minor: true })], [5, 10, 7], [56, 88], E8),
      L('b-up-arco', 9, 'Bowed study: Grades 6–8 style (shifts, 16ths)', 'אטיוד בקשת: סגנון שלבים 6–8 (מעברים, שש-עשריות)', [AR('etude', { option: 2 }), AR('etude', { option: 2, minor: true })], [7, 2, 4, 5], [60, 96], '16ths'),
    ]),
    fam('b-up-scales', 'Upright: scales and arpeggios', 'קונטרבס: סולמות וארפג׳יו', [
      L('b-up-scales', 1, 'One-octave scales', 'סולמות באוקטבה אחת', [SS('scales', { option: 0, perBeat: 1 })], [7, 2, 9], [40, 52], Qn),
      L('b-up-scales', 2, 'One-octave arpeggios', 'ארפג׳יו באוקטבה אחת', [SS('scales', { option: 1, perBeat: 1 })], [7, 2, 9, 5], [40, 56], Qn),
      L('b-up-scales', 3, 'More keys: B♭, E♭, E', 'עוד סולמות: B♭, E♭, E', [SS('scales', { option: 0, perBeat: 1 }), SS('scales', { option: 1, perBeat: 1 })], [10, 3, 4], [44, 60], Qn),
      L('b-up-scales', 4, 'Two-octave scales', 'סולמות בשתי אוקטבות', [SS('scales', { option: 2, perBeat: 1 })], [7, 9, 4], [48, 63], Qn),
      L('b-up-scales', 5, 'Two-octave arpeggios and dominant 7ths', 'ארפג׳יו בשתי אוקטבות וספטאקורד דומיננטי', [SS('scales', { option: 3, perBeat: 1 }), SS('scales', { option: 4, perBeat: 1 })], [7, 9, 4, 5], [48, 66], Qn),
      L('b-up-scales', 6, 'Diminished 7ths', 'ספטאקורד מוקטן', [SS('scales', { option: 5, perBeat: 1 })], [7, 9, 4, 2], [50, 69], Qn),
      L('b-up-scales', 7, 'Broken 3rds', 'טרצות שבורות', [SS('scales', { option: 6, perBeat: 1 })], [7, 2, 9, 5], [50, 69], Qn),
      L('b-up-scales', 8, 'Running 3rds', 'טרצות רצות', [SS('scales', { option: 7, perBeat: 1 })], [7, 2, 9, 5], [56, 76], Qn),
      L('b-up-scales', 9, 'Three-octave E', 'סולם E בשלוש אוקטבות', [SS('scales', { option: 8, perBeat: 1 })], [4], [56, 76], Qn),
      // Three octaves wherever the fingerboard allows (the top note at most the G string's 24th place): F, F♯ and G too.
      L('b-up-scales', 10, 'Three-octave scales and arpeggios: F, F♯, G', 'סולמות וארפג׳יו בשלוש אוקטבות: F, F♯, G', [SS('scales', { option: 8, perBeat: 1 }), SS('scales', { option: 9, perBeat: 1 })], [5, 6, 7], [56, 76], Qn),
    ]),
    fam('b-up-pizz', 'Upright: jazz pizzicato', 'קונטרבס: פיציקטו ג׳אזי', [
      L('b-up-pizz', 1, 'Long, even pizz quarters', 'רבעים ארוכים ושווים בפיציקטו', [PZ('pizz', { perBeat: 1 })], [7, 2, 9, 5], [80, 140], Qn),
      L('b-up-pizz', 2, 'Pizz over ii–V–I', 'פיציקטו על ii–V–I', [PZ('pizz', { perBeat: 1, option: 1 })], [0, 5, 10, 7], [90, 160], Qn),
      L('b-up-pizz', 3, 'Sustain at tempo', 'צליל מתמשך בטמפו', [PZ('pizz', { perBeat: 1, option: 2 })], [5, 10, 7, 0], [140, 200], Qn),
      L('b-up-pizz', 4, 'Pizz study: Grades 4–5 style', 'אטיוד בפיציקטו: סגנון שלבים 4–5', [PZ('etude', { option: 1 })], [7, 2, 9, 5], [70, 110], E8),
    ]),
    fam('b-up-walk', 'Upright: walking', 'קונטרבס: ווקינג', [
      L('b-up-walk', 1, 'Two-feel roots and 5ths', 'בשתיים: יסודות וקווינטות', [WU('two-feel', { perBeat: 0.5 })], [5, 10], [80, 140], 'halves'),
      L('b-up-walk', 2, 'Quarter-note roots and 5ths', 'יסודות וקווינטות ברבעים', [WU('r5walk', { perBeat: 1 })], [5, 10, 7], [80, 140], Qn),
      L('b-up-walk', 3, 'Arpeggio walk', 'הליכת ארפג׳יו', [WU('arpwalk', { perBeat: 1 })], [5, 10, 7, 0], [90, 150], Qn),
      L('b-up-walk', 4, 'Chromatic approach', 'גישה כרומטית', [WU('chrom', { perBeat: 1 })], 'major', [90, 150], Qn),
      L('b-up-walk', 5, 'Free walking (blues)', 'ווקינג חופשי (בלוז)', [WU('free', { perBeat: 1 })], [5, 10, 7, 0], [100, 160], Qn),
    ]),
    fam('b-up-read', 'Upright: reading by position', 'קונטרבס: קריאה לפי מצבים', [
      L('b-up-read', 1, 'First position melodies', 'מנגינות במצב ראשון', [RU('melody'), RU('melody', { minor: true })], [0, 7, 5], [50, 72], E8),
      L('b-up-read', 2, 'Half and first position', 'חצי מצב ומצב ראשון', [RU('keysig')], [5, 10, 3], [50, 72], E8),
      L('b-up-read', 3, 'Positions with shifts', 'מצבים עם מעברים', [RU('pos', { option: 0 }), RU('pos', { option: 1 })], [7, 2], [50, 72], E8),
      L('b-up-read', 4, 'Tenor clef: the upper register', 'מפתח טנור: האזור הגבוה', [RU('tenor')], [7, 2], [44, 66], E8),
      // ABRSM Gr 8: the treble clef for thumb position (written an octave above the sound, like the bass clef).
      L('b-up-read', 5, 'Treble clef: thumb position', 'מפתח סול: מצב אגודל', [RU('treble')], [7, 2], [40, 63], E8),
      L('b-up-read', 6, 'Treble clef with shifts', 'מפתח סול עם מעברים', [RU('treble', { option: 1 }), RU('treble', { option: 1, minor: true })], [7, 2, 9], [40, 63], E8),
    ]),
  ];
  for (const f of out) f.upright = true;
  return out;
}
