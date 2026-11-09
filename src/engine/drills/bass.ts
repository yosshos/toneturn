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
import { walkingBass, hashOf } from '../band';
import { GROOVES } from '../grooves';
import { STANDARD_CHANGES } from '../standards';

const tt = (en: string, he: string): T2 => ({ en, he });

// ───────────────────────────── lines on a beat grid ─────────────────────────────

type Tech = GN['tech'];
type Stroke = GN['stroke'];
/** A bass note before it is placed: beat, length, pitch (+ optional fixed string / fret, technique, accent …). */
interface BN {
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
const MAXF = 21;
/** Root register: E1 and up on 4-string (drop D: D1), the same pitches on 5/6-string (the low B is optional range). */
const floorOf = (tu: Tuning): number => (tu.open.length >= 5 ? 28 : tu.open[tu.open.length - 1]);
/** The root of a pitch class in the bass register (E1 … D♯2). */
const rootOf = (tu: Tuning, pc: number): number => floorOf(tu) + mod(pc - floorOf(tu), 12);
const lowest = (tu: Tuning): number => tu.open[tu.open.length - 1];
const highest = (tu: Tuning): number => tu.open[0] + MAXF;
/** Fold a pitch by octaves into the playable range. */
const fold = (tu: Tuning, p: number): number => {
  let x = p;
  while (x < lowest(tu)) x += 12;
  while (x > highest(tu)) x -= 12;
  return x;
};

/**
 * Place a line on the neck. A greedy hand model: the index finger sits at `pos` and covers pos … pos+span; each
 * note goes to the string / fret that needs the least hand movement (open strings are cheap unless `open: false`).
 */
function placeLine(tu: Tuning, line: BN[], o: { pos?: number; open?: boolean; span?: number } = {}): Ev[] {
  const n = tu.open.length;
  const span = o.span ?? 3;
  let pos = o.pos ?? -1;
  let prevS = -1;
  const evs: Ev[] = [];
  const pick = (p0: number, taken: number[] = []): { s: number; f: number } => {
    const p = fold(tu, p0);
    const cands: { s: number; f: number }[] = [];
    for (let s = 1; s <= n; s++) {
      const f = p - tu.open[s - 1];
      if (f >= 0 && f <= MAXF && !taken.includes(s)) cands.push({ s, f });
    }
    if (!cands.length) {
      const s = n;
      return { s, f: clamp(p - tu.open[s - 1], 0, MAXF) };
    }
    if (pos < 0) {
      const low = cands.filter((c) => c.f <= 9).sort((a, b) => b.s - a.s)[0] ?? cands.sort((a, b) => a.f - b.f)[0];
      pos = Math.max(1, low.f);
    }
    const cost = (c: { s: number; f: number }) =>
      (c.f === 0 ? (o.open === false ? 8 : 0.4) : c.f < pos ? (pos - c.f) * 1.5 : c.f > pos + span ? (c.f - pos - span) * 1.5 : 0) + (prevS > 0 ? Math.abs(c.s - prevS) * 0.25 : 0) + (c.f > 12 ? 0.04 * (c.f - 12) : 0);
    const best = cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
    if (best.f > 0) {
      if (best.f < pos) pos = best.f;
      else if (best.f > pos + span) pos = best.f - span;
    }
    prevS = best.s;
    return best;
  };
  for (const x of line) {
    let at: { s: number; f: number };
    if (x.s !== undefined) {
      at = { s: x.s, f: x.f ?? clamp(x.p - tu.open[x.s - 1], 0, MAXF) };
      prevS = at.s;
      if (at.f > 0 && (at.f < pos || at.f > pos + span)) pos = Math.max(1, at.f - 1);
    } else at = pick(x.p);
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

type Q = 'M' | 'm' | '7' | 'm7' | 'maj7' | 'm7b5' | 'dim7';
const QI: Record<Q, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9] };
const QS: Record<Q, string> = { M: '', m: 'm', '7': '7', m7: 'm7', maj7: 'maj7', m7b5: 'm7♭5', dim7: '°7' };
type Prog = [number, Q][];
const PROGS: Record<string, Prog> = {
  pop: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
  p145: [[0, 'M'], [5, 'M'], [7, 'M'], [5, 'M']],
  rock: [[0, 'M'], [10, 'M'], [5, 'M'], [0, 'M']],
  p1451: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
  jazz: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']],
  iivi: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']],
  minor: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, '7']],
  vamp: [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']],
};
const BLUES: Prog = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d): [number, Q] => [d, '7']);
const chordName = (key: number, [d, q]: [number, Q]): string => NAMES[mod(key + d, 12)] + QS[q];
const chartOf = (key: number, prog: Prog): string[] => prog.map((c) => chordName(key, c));
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
}
function drillOf(s: DrillSpec, tu: Tuning, line: BN[], o: Out): Drill {
  const key = mod(s.key, 12);
  const k = `${NAMES[key]}${s.minor ? 'm' : ''}`;
  const evs = placeLine(tu, line, { pos: o.pos, open: o.open, span: o.span });
  const goal: Partial<DrillGoal> = { ...(o.goal ?? {}), ...(o.bass ? { bass: o.bass } : {}) };
  const d = finish(s, tu, evs, { title: tt(`${o.en} · ${k}`, `${o.he} · ${k}`), bpm: s.tempo ?? 80, evenness: o.evenness ?? true, goal, meter: o.meter, keySig: o.keySig });
  if (o.chart) d.chart = o.chart;
  if (o.click && o.click !== 'all') d.click = o.click;
  return d;
}

/** Repeat a one-bar figure over a progression: fig(rootPitch, chord, bar) → notes relative to the bar. */
function overProg(tu: Tuning, key: number, prog: Prog, fig: (R: number, c: [number, Q], bar: number, next: number) => BN[], beatsPerBar = 4): BN[] {
  const out: BN[] = [];
  prog.forEach((c, bar) => {
    const R = rootOf(tu, key + c[0]);
    const next = rootOf(tu, key + prog[(bar + 1) % prog.length][0]);
    for (const x of fig(R, c, bar, next)) out.push({ ...x, b: bar * beatsPerBar + x.b });
  });
  return out;
}
/** A closing note (the tonic) after `beats`. */
const endOn = (tu: Tuning, key: number, beats: number, len = 2): BN => ({ b: beats, d: len, p: rootOf(tu, key) });
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
const alt = (xs: BN[], set: Stroke[] = STROKES): BN[] => {
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
      return drillOf(s, tu, alt(line), { en: '16th-note stamina', he: 'סיבולת בשש-עשריות', chart: ['', '', ...chartOf(key, prog.slice(2))] });
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
      return drillOf(s, tu, alt(line), { en: 'Plucking zones: 4 bars near the neck, 4 near the bridge', he: 'אזורי פריטה: 4 תיבות ליד הצוואר, 4 ליד הגשר', chart: chartOf(key, [...PROGS.p1451, ...PROGS.p1451]) });
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
      const want = n - 1 - (op === 1 ? 1 : 0);
      const str = mod(key - tu.open[want - 1], 12) <= 9 ? want : want === n - 1 ? n - 2 : n - 1;
      const f0 = mod(key - tu.open[str - 1], 12);
      const ints = [...modeInts(0), 12];
      const ps = [...ints, ...ints.slice(0, -1).reverse()];
      const line = [...ps, 0].map((x, i) => ({ b: i / 2, d: 0.5, p: noteAt(tu, str, f0 + x), s: str, f: f0 + x }));
      line[line.length - 1].d = 1;
      return drillOf(s, tu, alt(line), { en: 'Major scale on one string', he: 'סולם מז׳ור על מיתר אחד' });
    }
    case '2oct': {
      // Two-octave major scale with one or two shifts.
      const R = rootOf(tu, key);
      const ints = modeInts(0);
      const up = [...ints, ...ints.map((x) => x + 12), 24].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line = ps.map((p, i) => ({ b: i / 2, d: 0.5, p }));
      line[line.length - 1].d = 1;
      return drillOf(s, tu, alt(line), { en: 'Two-octave major scale with shifts', he: 'סולם מז׳ור בשתי אוקטבות עם מעברי מצב', open: false });
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
      return drillOf(s, tu, line, { en: op === 1 ? 'Real rests, fretted' : 'Real rests, open string', he: op === 1 ? 'הפסקות אמיתיות, צליל לחוץ' : 'הפסקות אמיתיות, מיתר פתוח', bass: { lengths: true }, open: op !== 1, evenness: false });
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
      const hiNotes = [rootOf(tu, key) + 12, rootOf(tu, key) + 16, rootOf(tu, key) + 19, rootOf(tu, key) + 24];
      for (let k = 0; k < 16; k++) {
        const b = k;
        const lowStr = k % 2 ? n - 1 : n;
        line.push({ b, d: 0.5, p: tu.open[lowStr - 1], s: lowStr, f: 0 });
        line.push({ b: b + 0.5, d: 0.5, p: hiNotes[k % 4] });
      }
      line.push({ b: 16, d: 1, p: rootOf(tu, key) + 12 });
      return drillOf(s, tu, alt(line), { en: 'Idle strings muted', he: 'השתקת מיתרים לא בשימוש', bass: { lengths: true } });
    }
    case 'release-and': {
      // Every note held exactly to the "and", then silence (Motown / pop feel).
      const line = overProg(tu, key, PROGS.pop, (R, c) => [0, 7, 12, QI[c[1]][1] + 12].map((x, k) => ({ b: k, d: 0.5, p: R + x })));
      line.push(endOn(tu, key, 16, 0.5));
      return drillOf(s, tu, alt(line), { en: 'Release on the "and"', he: 'לשחרר על ה"וְ"', bass: { lengths: true }, chart: chartOf(key, PROGS.pop), evenness: false });
    }
    case 'oct-mute': {
      // Disco octaves: the low note must stop the moment the octave sounds.
      const line = overProg(tu, key, PROGS.pop, (R) => Array.from({ length: 8 }, (_, k) => ({ b: k / 2, d: 0.5, p: k % 2 ? R + 12 : R })));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Muted octaves', he: 'אוקטבות מושתקות', bass: { lengths: true }, chart: chartOf(key, PROGS.pop), open: false });
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
      return drillOf(s, tu, alt(line), { en: 'Quarter-note pulse', he: 'דופק ברבעים', chart: chartOf(key, PROGS.p1451) });
    }
    case 'trip': {
      // A bar of 8ths, a bar of 8th triplets, twice.
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        const per = bar % 2 ? 3 : 2;
        for (let k = 0; k < 4 * per; k++) line.push({ b: bar * 4 + k / per, d: 1 / per, p: R + (bar >= 2 ? 7 : 0), acc: k % per === 0 });
      }
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, alt(line), { en: '8ths and 8th triplets', he: 'שמיניות וטריולות שמיניות' });
    }
    case 'subs': {
      // Quarters → 8ths → triplets → 16ths, one bar each, without moving the pulse.
      const line: BN[] = [];
      [1, 2, 3, 4].forEach((per, bar) => {
        for (let k = 0; k < 4 * per; k++) line.push({ b: bar * 4 + k / per, d: 1 / per, p: R, acc: k % per === 0 });
      });
      line.push({ b: 16, d: 1, p: R });
      return drillOf(s, tu, alt(line), { en: 'Switching subdivisions: ♩ → 8ths → triplets → 16ths', he: 'מעבר חלוקות: ♩ ← שמיניות ← טריולות ← שש-עשריות' });
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
      return drillOf(s, tu, alt(line), { ...nm, click: mode, chart: chartOf(key, prog) });
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
      return drillOf(s, tu, alt(line), { en: 'Syncopation and anticipations', he: 'סינקופות והקדמות', chart: chartOf(key, prog), evenness: false });
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
      return drillOf(s, tu, alt(line), { en: '16th syncopation from rhythm cards', he: 'סינקופות בשש-עשריות מכרטיסי מקצב', evenness: false });
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
      return drillOf(s, tu, alt(line), { en: `Odd meter ${nm}`, he: `משקל אי-זוגי ${nm}`, meter, chart: chartOf(key, prog) });
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
      return drillOf(s, tu, alt(line), { en: `Lock with the kick: ${g.name.en}`, he: `נעילה עם הבס-דראם: ${g.name.he}`, bass: { kick: s.kind === 'kick16' ? 20 : 25 }, chart: s.kind === 'kick' ? undefined : chartOf(key, prog), evenness: false });
    }
    case 'shuffle': {
      // Triplet shuffle on roots: long–short on every beat.
      const line = overProg(tu, key, PROGS.p1451, (R) => [0, 1, 2, 3].flatMap((b) => [{ b, d: 2 / 3, p: R, acc: true }, { b: b + 2 / 3, d: 1 / 3, p: R }]));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Shuffle feel on roots', he: 'תחושת שאפל על יסודות', chart: chartOf(key, PROGS.p1451), evenness: false });
    }
    case 'swing16': {
      // Swung 16ths (neo-soul / hip-hop): every second 16th late (≈ 58 : 42), following an R&B kick.
      const kicks = kickBeats(op % 2 ? 'boombap' : 'rnb').map((b) => {
        const st = Math.round(b * 4);
        return Math.floor(st / 2) / 2 + (st % 2 ? 0.29 : 0);
      });
      const line = kickLine(tu, key, PROGS.vamp, kicks);
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Swung 16ths', he: 'שש-עשריות בסווינג', chart: chartOf(key, PROGS.vamp), bass: { kick: 25 }, evenness: false });
    }
    case 'pocket': {
      // The same groove three times — on the beat, laid back, on top (the ladder judges against the click for now).
      const prog: Prog = [...PROGS.pop.slice(0, 2), ...PROGS.pop.slice(0, 2), ...PROGS.pop.slice(0, 2)];
      const line = kickLine(tu, key, prog, kickBeats('rock-8b'));
      line.push(endOn(tu, key, prog.length * 4, 1));
      return drillOf(s, tu, alt(line), { en: 'Pocket on purpose: on, behind, ahead', he: 'כיס מכוון: על הקליק, מאחור, מקדימה', chart: chartOf(key, prog), bass: { kick: 25 }, evenness: false });
    }
    case 'halftime': {
      // Four bars in time, four bars half-time.
      const a = kickLine(tu, key, PROGS.pop, kickBeats('rock-8b'));
      const b = kickLine(tu, key, PROGS.pop, kickBeats('half-time')).map((x) => ({ ...x, b: x.b + 16 }));
      const line = [...a, ...b, endOn(tu, key, 32, 1)];
      return drillOf(s, tu, alt(line), { en: 'Half-time feel change', he: 'מעבר לחצי זמן', chart: [...chartOf(key, PROGS.pop), ...chartOf(key, PROGS.pop)], bass: { kick: 25 }, evenness: false });
    }
    case 'fills': {
      // Three bars of groove, a bar of space for the drummer's fill, land on 1. Twice.
      const prog: Prog = [...PROGS.pop.slice(0, 3), [7, 'M'], ...PROGS.pop.slice(0, 3), [7, 'M']];
      const kicks = kickBeats('rock-8b');
      const line = overProg(tu, key, prog, (R, _c, bar) => (bar % 4 === 3 ? [{ b: 0, d: 1, p: R }] : kicks.map((b, i) => ({ b, d: (kicks[i + 1] ?? 4) - b, p: R }))));
      line.push({ ...endOn(tu, key, 32, 1), acc: true });
      return drillOf(s, tu, alt(line), { en: 'Land on 1 after the fill', he: 'לנחות על 1 אחרי המילוי', chart: chartOf(key, prog), evenness: false });
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
      return drillOf(s, tu, alt(line), { en: 'Dead notes: pitched and ghost 8ths', he: 'צלילים מתים: שמיניות עם צליל ובלי', chart: chartOf(key, prog) });
    }
    case 'ghost16':
    case 'ghost-dyn': {
      const line = fig('R.xx..xxR.xx..xx').map((x) => ({ ...x, d: 0.25 }));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), s.kind === 'ghost-dyn' ? { en: 'Ghost notes quieter than the notes', he: 'צלילי רפאים שקטים מהצלילים', chart: chartOf(key, prog), bass: { ghostDb: 8 }, evenness: false } : { en: 'Ghost notes in 16ths', he: 'צלילי רפאים בשש-עשריות', chart: chartOf(key, prog), evenness: false });
    }
    case 'ghost-oct': {
      const line = fig('R.xO..xOR.xO.xO.').map((x) => ({ ...x, d: Math.min(x.d, 0.5) }));
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: 'Ghost before the octave', he: 'צליל רפאים לפני האוקטבה', chart: chartOf(key, prog), evenness: false, open: false });
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
      return drillOf(s, tu, alt(line), study ? { en: '8-bar funk study: ghosts, slides, hammer-ons', he: 'אטיוד פאנק 8 תיבות: רפאים, החלקות, הקשות', chart: ch, evenness: false } : { en: 'Two-bar funk line', he: 'קו פאנק בשתי תיבות', chart: ch, evenness: false });
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
      return drillOf(s, tu, alt(line), { en: 'Roots of a chord chart', he: 'יסודות של מהלך אקורדים', chart: chartOf(key, full) });
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
      return drillOf(s, tu, alt(line), { en: ['Two-octave major arpeggio', 'Two-octave minor arpeggio', 'Two-octave dominant 7 arpeggio'][op % 3], he: ['ארפג׳יו מז׳ור בשתי אוקטבות', 'ארפג׳יו מינור בשתי אוקטבות', 'ארפג׳יו ספטאקורד דומיננטי בשתי אוקטבות'][op % 3], open: false });
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
          const p = near(prev + dir * 4, prev);
          line.push({ b: bar * 4 + k, d: 1, p, ct: true });
          prev = p;
        }
      });
      line.push({ b: 32, d: 1, p: rootOf(tu, key), ct: true });
      return drillOf(s, tu, alt(line), nearest ? { en: 'Nearest chord tone at each change', he: 'צליל האקורד הקרוב בכל החלפה', chart: chartOf(key, prog), goal: { chordTonesOnBeats: true } } : { en: 'Chord tones through I–vi–ii–V', he: 'צלילי אקורד לאורך I–vi–ii–V', chart: chartOf(key, prog), goal: { chordTonesOnBeats: true } });
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
      return drillOf(s, tu, alt(line), { en: 'Five pentatonic positions linked', he: 'חמשת מצבי הפנטטוני ברצף', open: false, span: 3 });
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
const textOf = (key: number, prog: Prog): string => chartOf(key, prog).map((x) => x.replace('°7', 'dim7').replace('♭', 'b').replace('♯', '#')).join(' | ');
/** The reference walking line (band.ts) for a chart text: one note a beat (skips kept when asked). */
function refWalk(tu: Tuning, text: string, seed: string, skips: boolean): BN[] {
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
function genWalk(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const blues = BLUES;
  const iivi: Prog = [...PROGS.iivi, ...PROGS.iivi];
  /** Beat-4 approach rules: chromatic (±1), dominant (the next root's 5th), scale step (±2 / ±1 in the key). */
  const approach = (kind: 'chrom' | 'dom' | 'scale', from: number, target: number, bar: number): number => {
    if (kind === 'chrom') {
      const a = target + (bar % 2 === 0 ? -1 : 1);
      return a === from ? 2 * target - a : a;
    }
    if (kind === 'dom') {
      const a = target + 7;
      const b = target - 5;
      return Math.abs(a - from) <= Math.abs(b - from) && a <= highest(tu) ? a : b >= lowest(tu) ? b : a;
    }
    const scale = modeInts(0).map((x) => mod(key + x, 12));
    const above = [1, 2].map((x) => target + x).find((p) => scale.includes(mod(p, 12))) ?? target + 2;
    const below = [1, 2].map((x) => target - x).find((p) => scale.includes(mod(p, 12))) ?? target - 2;
    return from > target ? above : below >= lowest(tu) ? below : above;
  };
  const walk = (prog: Prog, fig: (R: number, c: [number, Q], next: number, bar: number) => number[]): BN[] =>
    overProg(tu, key, prog, (R, c, bar, next) => fig(R, c, next, bar).map((p, k) => ({ b: k, d: 1, p, ct: k === 0 })));
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
      const line = walk(blues, (R) => (op === 1 ? [R, R + 4, R + 7, R + 9] : [R, R + 4, R + 7, R + 4]));
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), { en: op === 1 ? 'Arpeggio walk R–3–5–6 (blues)' : 'Arpeggio walk R–3–5–3 (blues)', he: op === 1 ? 'הליכת ארפג׳יו R–3–5–6 (בלוז)' : 'הליכת ארפג׳יו R–3–5–3 (בלוז)', chart: chartOf(key, blues), goal: { chordTonesOnBeats: true } });
    }
    case 'chrom':
    case 'dom':
    case 'scaleapp': {
      // Chord tones on 1–3, an approach to the next root on 4 (ii–V–I–I, twice).
      const kind = s.kind === 'chrom' ? 'chrom' : s.kind === 'dom' ? 'dom' : 'scale';
      const line = walk(iivi, (R, c, next, bar) => {
        const ints = QI[c[1]];
        const tgt = next;
        const three = [R, R + ints[1], R + ints[2]];
        return [...three, approach(kind, three[2], tgt, bar)];
      });
      line.push(endOn(tu, key, 32, 2));
      const nm = { chrom: tt('Chromatic approach on beat 4 (ii–V–I)', 'גישה כרומטית בפעמה 4 (ii–V–I)'), dom: tt('Dominant approach on beat 4 (ii–V–I)', 'גישה דומיננטית בפעמה 4 (ii–V–I)'), scale: tt('Scale-step approach on beat 4 (ii–V–I)', 'גישה בצעד סולמי בפעמה 4 (ii–V–I)') }[kind];
      return drillOf(s, tu, alt(line), { ...nm, chart: chartOf(key, iivi), goal: { chordTonesOnBeats: true } });
    }
    case 'free':
    case 'skips': {
      // A full walking line over the blues (the band's own walking rules), with triplet skips for 'skips'.
      const text = textOf(key, blues);
      const line = refWalk(tu, text, `b-walk:${s.kind}:${key}:${op}`, s.kind === 'skips');
      if (s.kind === 'skips') {
        // One skip in every other bar at least: a ghosted triplet before beat 2 on the note before.
        for (let bar = 0; bar < 12; bar += 2) {
          const at = bar * 4 + 1;
          if (line.some((x) => Math.abs(x.b - (at - 1 / 3)) < 1e-6)) continue;
          const prev = line.find((x) => x.b === at - 1);
          if (!prev) continue;
          prev.d = 2 / 3;
          line.push({ b: at - 1 / 3, d: 1 / 3, p: prev.p });
        }
        line.sort((a, b) => a.b - b.b);
      }
      line.push(endOn(tu, key, 48, 2));
      return drillOf(s, tu, alt(line), s.kind === 'skips' ? { en: 'Walking with triplet skips (blues)', he: 'ווקינג עם קפיצות טריולה (בלוז)', chart: chartOf(key, blues), evenness: false } : { en: 'Walking line, mixed approaches (blues)', he: 'קו ווקינג, גישות מעורבות (בלוז)', chart: chartOf(key, blues), goal: { chordTonesOnBeats: true } });
    }
    case 'cycle': {
      // ii–V–I through four keys a whole step apart.
      const prog: Prog = [];
      for (let k = 0; k < 4; k++) prog.push([mod(2 - 2 * k, 12), 'm7'], [mod(7 - 2 * k, 12), '7'], [mod(-2 * k, 12), 'maj7'], [mod(-2 * k, 12), 'maj7']);
      const line = refWalk(tu, textOf(key, prog), `b-walk:cycle:${key}`, false);
      line.push(endOn(tu, key - 6, 64, 2));
      return drillOf(s, tu, alt(line), { en: 'ii–V–I through the keys', he: 'ii–V–I דרך הסולמות', chart: chartOf(key, prog), goal: { chordTonesOnBeats: true } });
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
      return drillOf(s, tu, alt(line), { en: 'Rhythm changes: two chords a bar', he: 'ריתם צ׳יינג׳ס: שני אקורדים בתיבה', chart: bars.map((b) => b.map((c) => chordName(key, c)).join(' ')), goal: { chordTonesOnBeats: true } });
    }
    case 'standard': {
      // One chorus of a standard's changes in its own key (chord progressions only).
      const ids = ['fly', 'blue-bossa', 'tune-up', 'autumn'];
      const st = STANDARD_CHANGES.find((x) => x.id === ids[op % ids.length]) ?? STANDARD_CHANGES[0];
      const line = refWalk(tu, st.text, `b-walk:std:${st.id}`, false);
      const bars = st.text.split('|').map((x) => x.trim());
      line.push({ b: bars.length * 4, d: 2, p: line[0].p });
      return drillOf(s, tu, alt(line), { en: `One chorus: ${st.name}`, he: `כורוס אחד: ${st.name}`, chart: bars, goal: { chordTonesOnBeats: true } });
    }
    case 'two-four': {
      // A blues chorus in 2 (half notes), then a chorus in 4 (walking).
      const a = overProg(tu, key, blues, (R) => [{ b: 0, d: 2, p: R, ct: true }, { b: 2, d: 2, p: R + 7 > floorOf(tu) + 14 ? R - 5 : R + 7 }]);
      const b = refWalk(tu, textOf(key, blues), `b-walk:24:${key}`, false).map((x) => ({ ...x, b: x.b + 48 }));
      const line = [...a, ...b, endOn(tu, key, 96, 2)];
      return drillOf(s, tu, alt(line), { en: 'Blues in 2, then in 4', he: 'בלוז בשתיים, ואז בארבע', chart: [...chartOf(key, blues), ...chartOf(key, blues)], evenness: false });
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
      return drillOf(s, tu, line, { en: 'Natural harmonics: 12th, 7th, 5th fret', he: 'הרמוניות טבעיות: סריג 12, 7, 5', evenness: false });
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

function genRead(s: DrillSpec, tu: Tuning): Drill {
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
      return drillOf(s, tu, line, { en: 'Bass clef: first position', he: 'מפתח פה: מצב ראשון', evenness: false, keySig: SIG[key] });
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
      return drillOf(s, tu, alt(line), { en: 'Rhythm reading on one string', he: 'קריאת מקצב על מיתר אחד', evenness: false });
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
      return drillOf(s, tu, line, { ...nm, evenness: false, keySig: SIG[s.minor ? mod(key + 3, 12) : key], pos: Math.max(1, P) });
    }
    case 'chartroots':
    case 'nashville': {
      // A chord chart (names, or Nashville numbers): roots (op 0) or root–5th (op 1) in quarters.
      const prog: Prog = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']];
      const line = overProg(tu, key, prog, (R) => [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: op === 1 && k % 2 ? R + 7 : R, ct: true })));
      line.push(endOn(tu, key, 32, 1));
      const NUM: Record<number, string> = { 0: '1', 2: '2m', 4: '3m', 5: '4', 7: '5', 9: '6m' };
      const chart = s.kind === 'nashville' ? prog.map((c) => NUM[c[0]] ?? '1') : chartOf(key, prog);
      return drillOf(s, tu, alt(line), s.kind === 'nashville' ? { en: 'Nashville numbers chart', he: 'צ׳ארט במספרי נאשוויל', chart } : { en: op === 1 ? 'Chord chart: root and 5th' : 'Chord chart: roots', he: op === 1 ? 'צ׳ארט אקורדים: יסוד וקווינטה' : 'צ׳ארט אקורדים: יסודות', chart });
    }
    case 'written': {
      // Two written bars, then six bars of chord tones (for now written out too).
      const prog = [...PROGS.jazz, ...PROGS.jazz];
      const line = overProg(tu, key, prog, (R, c, bar) => {
        const ints = QI[c[1]];
        return bar < 2 ? [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: R + [0, 7, 12, 7][k] })) : [0, 1, 2, 3].map((k) => ({ b: k, d: 1, p: R + [0, ints[1], ints[2], ints[3] ?? 12][(k + bar) % 4], ct: true }));
      });
      line.push(endOn(tu, key, 32, 1));
      return drillOf(s, tu, alt(line), { en: 'Written groove + chord-tone continuation', he: 'גרוב כתוב + המשך בצלילי אקורד', chart: chartOf(key, prog) });
    }
    case 'funkread': {
      const prog: Prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']];
      const line = cellLine(tu, key, prog, rnd, 4);
      line.push(endOn(tu, key, 16, 1));
      return drillOf(s, tu, alt(line), { en: '16th funk reading', he: 'קריאת פאנק בשש-עשריות', chart: chartOf(key, prog), evenness: false });
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
];
function genStyle(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = (s.option ?? 0) % STYLE_T.length;
  const nm = STYLE_T[op];
  const rnd = rng(`b-styles:${key}:${op}`);
  let prog: Prog = PROGS.pop;
  let line: BN[] = [];
  let meter = 4;
  let evenness = false;
  switch (op) {
    case 0: {
      prog = PROGS.rock;
      line = overProg(tu, key, prog, (R) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, k) => ({ b, d: 0.5, p: k === 6 ? R + 12 : R, acc: b === 0 || b === 2 || b === 1.5 })));
      evenness = true;
      break;
    }
    case 1: {
      // I – V/7 – vi – IV: whole and half notes, the next bass anticipated on the "and" of 4.
      const bass = [0, 11, 9, 5].map((d) => rootOf(tu, key + d));
      prog = [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']];
      line = [{ b: 0, d: 2, p: bass[0] }];
      bass.forEach((p, bar) => {
        line.push({ b: bar * 4 + 2, d: 1.5, p: p + 7 > floorOf(tu) + 14 ? p - 5 : p + 7 });
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
          { b: 1.5, d: 0.5, p: R + six },
          { b: 2, d: 1, p: R + 12 },
          { b: 3, d: 0.5, p: R + 7 },
          { b: 3.5, d: 0.5, p: appr },
        ];
      });
      break;
    }
    case 3: {
      prog = BLUES;
      const tr = 2 / 3;
      line = overProg(tu, key, prog, (R) => [0, 4, 7, 9, 10, 9, 7, 4].map((x, k) => ({ b: Math.floor(k / 2) + (k % 2 ? tr : 0), d: k % 2 ? 1 / 3 : tr, p: R + x })));
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
        ].map(([b, d, x]) => ({ b, d, p: R + x, tech: 'mute' as Tech, st: 'p' as Stroke })),
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
      line = overProg(tu, key, prog, (R, _c, bar, next) => [...(bar === 0 ? [{ b: 0, d: 1.5, p: R }] : []), { b: 1.5, d: 1.5, p: R + 7 }, { b: 3, d: 1, p: bar === 3 ? rootOf(tu, key) : next, acc: true }]);
      break;
    }
    case 9: {
      prog = [[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']];
      line = cellLine(tu, key, prog, rnd, 4);
      break;
    }
    case 10: {
      prog = PROGS.jazz;
      line = overProg(tu, key, prog, (R, c, _bar, next) => [
        { b: 0, d: 1.5, p: R },
        { b: 1.5, d: 0.5, p: R + QI[c[1]][1] },
        { b: 2, d: 1, p: R + 7 },
        { b: 3, d: 0.25, p: next - 3 >= lowest(tu) ? next - 3 : next + 3 },
        { b: 3.25, d: 0.25, p: next - 3 >= lowest(tu) ? next - 2 : next + 2 },
        { b: 3.5, d: 0.5, p: next - 3 >= lowest(tu) ? next - 1 : next + 1 },
      ]);
      break;
    }
    case 11: {
      prog = [[0, 'm'], [0, 'm'], [3, 'M'], [1, 'M']];
      line = overProg(tu, key, prog, (R) => [0, 1, 2, 3].flatMap((b) => [{ b, d: 0.5, p: R, acc: true, st: 'D' as Stroke }, { b: b + 0.5, d: 0.25, p: R, st: 'D' as Stroke }, { b: b + 0.75, d: 0.25, p: R, st: 'U' as Stroke }]));
      break;
    }
    case 12: {
      meter = 7;
      prog = [[0, 'm'], [0, 'm'], [1, 'M'], [0, 'm']];
      // 7/8 as 2+2+3 (one beat = one 8th): root, root, ♭2 / 5, ♭7 lick in the 3-group.
      line = overProg(
        tu,
        key,
        prog,
        (R, _c, bar) => [0, 1, 2, 3, 4, 5, 6].map((b) => ({ b, d: 1, p: R + [0, 0, 12, 0, bar % 2 ? 1 : 7, 10, 7][b], acc: b === 0 || b === 2 || b === 4 })),
        7,
      );
      evenness = true;
      break;
    }
  }
  const beats = prog.length * meter;
  line.push(endOn(tu, key, beats, 1));
  return drillOf(s, tu, line.some((x) => x.st) ? line : alt(line), { ...nm, chart: chartOf(key, prog), meter, evenness, bass: op === 0 ? { kick: 25 } : undefined });
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
    case 'b-slap':
      return genSlap(s, tu);
    case 'b-legato':
      return genLegatoB(s, tu);
    case 'b-pick':
      return genPick(s, tu);
    case 'b-read':
      return genRead(s, tu);
    case 'b-styles':
      return genStyle(s, tu);
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
  const E8 = '8ths';
  const S16 = '16ths';
  const Qn = 'quarters';
  return [
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
      L('b-read', 1, 'Bass clef: open strings and first position', 'מפתח פה: מיתרים פתוחים ומצב ראשון', [RD('clef', { perBeat: 1 })], [0, 7, 5], [40, 60], Qn),
      L('b-read', 2, 'Rhythm reading on one string', 'קריאת מקצב על מיתר אחד', [RD('rhythm'), RD('rhythm', { option: 1 })], [4], [60, 90], 'quarters / 8ths'),
      L('b-read', 3, 'Four-bar melodies', 'מנגינות בארבע תיבות', [RD('melody'), RD('melody', { minor: true })], [0, 7, 5, 9], [60, 90], E8),
      L('b-read', 4, 'Key signatures up to 3 sharps / 3 flats', 'סימני היתק עד 3 דיאזים / 3 במולים', [RD('keysig')], [0, 7, 2, 9, 5, 10, 3], [70, 90], E8),
      L('b-read', 5, 'Reading in a given position', 'קריאה במצב נתון', [RD('pos', { option: 0 }), RD('pos', { option: 1 }), RD('pos', { option: 2 })], ANY, [70, 90], E8),
      L('b-read', 6, 'Chord-symbol charts', 'צ׳ארטים של סימני אקורדים', [RD('chartroots', { perBeat: 1 }), RD('chartroots', { perBeat: 1, option: 1 })], ANY, [80, 110], Qn),
      L('b-read', 7, 'Nashville numbers', 'מספרי נאשוויל', [RD('nashville', { perBeat: 1 })], 'major', [80, 110], Qn),
      L('b-read', 8, 'Written groove and continuation', 'גרוב כתוב והמשך', [RD('written', { perBeat: 1 })], K6, [80, 100], E8),
      L('b-read', 9, '16th funk reading', 'קריאת פאנק בשש-עשריות', [RD('funkread', { perBeat: 4 }), RD('funkread', { perBeat: 4, option: 1 })], K4, [70, 95], S16),
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
      L('b-styles', 10, 'Funk', 'פאנק', [ST('style', { option: 9, perBeat: 4 }), ST('style', { option: 9, perBeat: 4, position: 1 })], K6, [90, 110], S16, ['funk']),
      L('b-styles', 11, 'Gospel / neo-soul', 'גוספל / ניאו-סול', [ST('style', { option: 10, perBeat: 4 })], K6, [70, 90], S16, ['funk', 'pop', 'jazz']),
      L('b-styles', 12, 'Metal and odd meter', 'מטאל ומשקל אי-זוגי', [ST('style', { option: 11, tuning: 'bass-dropd' }), ST('style', { option: 12, tempo: 180 })], [2, 4], [120, 180], 'gallop / 7/8', ['metal', 'rock']),
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
      L('b-walk', 11, 'Standards: one chorus', 'סטנדרטים: כורוס אחד', [0, 1, 2, 3].map((o) => WK('standard', { perBeat: 1, option: o })), [0], [100, 180], Qn),
      L('b-walk', 12, 'Up-tempo, in 2 and in 4', 'טמפו מהיר, בשתיים ובארבע', [WK('two-four', { perBeat: 1 })], [5, 10], [160, 240], 'halves / quarters'),
    ]),
    fam('b-legato', 'Slides, legato, harmonics', 'החלקות, לגאטו והרמוניות', [
      L('b-legato', 1, 'Slides into notes', 'החלקות אל הצלילים', [LG('slide')], K6, [70, 110], E8),
      L('b-legato', 2, 'Hammer-on and pull-off pairs', 'זוגות הקשה ומשיכה', [LG('hp')], K6, [60, 100], E8),
      L('b-legato', 3, 'Legato lines', 'קווי לגאטו', [LG('legline', { perBeat: 4 })], K4, [70, 110], S16),
      L('b-legato', 4, 'Sliding octave double stops', 'אוקטבות כפולות בהחלקה', [LG('octslide')], K6, [70, 100], E8),
      L('b-legato', 5, 'Natural harmonics 12, 7, 5', 'הרמוניות טבעיות 12, 7, 5', [LG('harm', { perBeat: 1 })], OPEN, [60, 90], Qn),
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
  ];
}
