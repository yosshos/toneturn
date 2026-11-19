// Key changes and turnarounds, performed (docs/AUDIT-GAPS-2.md High #5/#6, Medium #11/#12): the k-keys piano family,
// the g-keys guitar family and the b-keys bass family. The music is src/engine/keyMoves.ts; every level runs in all 12
// keys, and a new item starts in free time (rubato.ts) like every technique item.
//
//  piano   voice-led chords chosen by the player (voiceLead.ts grades the voicing type + the smallest motion; the LH
//          plays the roots). The common diminished shares notes with both keys, so the right move is a half step.
//  guitar  drop-2 voicings on the 4-3-2-1 / 5-4-3-2 string sets (triads on 3-2-1 / 4-3-2 for the pop lift), voice-led.
//  bass    a written line that leads the move: root, chord tone, chromatic approach into the next root.
//  line    the melodic version on all three: key A's 6th-diminished scale, the diminished and V7, key B's scale.
//
// Imports guitar.ts / bass.ts only inside functions (they import this module).

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import { itemIdOf, type FamilyDef, type LevelDef, type SpecTemplate } from './generate';
import { finish, place, type Ev, type GuitarFamilyDef, type GuitarLevelDef, type GN } from './guitar';
import { alt, drillOf, fold, rootOf, lowest, type BN } from './bass';
import type { Tuning } from '../fretboard';
import { candidates, fitOnSet, flatsFor, gradeVoicings, measuredOf, motion, optimalPath, typePcs, type VLChord, type VLGoal, type VLType } from './voiceLead';
import { bridge, chordBeats, dimMove, directMove, iiVMove, keyName, moveName, pivotMove, PIVOTS, popMove, sixDimLine, totalBeats, tritoneMove, turnaround, TURN_NAME, KQ_INTS, type KChord, type TurnKind } from '../keyMoves';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const SIGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// ───────────────────────────── the items (shared by the three instruments) ─────────────────────────────

/** Targets (semitones above key A) per kind; the option picks one. */
export const KM_TARGETS: Record<string, number[]> = {
  'km-iiv': [1, 3, 4, 8, 9, 10],
  'km-dim': [3, 6, 9],
  'km-dim251': [3, 6, 9],
  'km-dimall': [1, 2, 4, 5, 7, 8, 10, 11],
  'km-dimb9': [3, 6, 9, 5, 10],
  'km-tritone': [3, 5, 8, 10],
  'km-line': [3, 6, 9, 5, 10],
};
const TURNS: TurnKind[] = ['vi7', 'dim', 'tritone', 'ladybird'];
/** km-direct options: direct up a minor 3rd, direct down a whole step, the pop lift up a half step, up a whole step through the new V. */
const DIRECT: { off: number; pop?: { up: 1 | 2; viaV: boolean } }[] = [{ off: 3 }, { off: 10 }, { off: 1, pop: { up: 1, viaV: false } }, { off: 2, pop: { up: 2, viaV: true } }];

/** How many options a kind has. */
export function kmOptions(kind: string): number {
  if (KM_TARGETS[kind]) return KM_TARGETS[kind].length;
  if (kind === 'km-turn') return TURNS.length;
  if (kind === 'km-bridge') return 2;
  if (kind === 'km-direct') return DIRECT.length;
  if (kind === 'km-pivot') return PIVOTS.length;
  throw new Error(`Unknown key-move kind: ${kind}`);
}

export interface KMItem {
  chords: KChord[];
  /** The key the item lands in (and whether it is minor). */
  to: number;
  toMinor?: boolean;
  /** Triads (the pop lift). */
  triad?: boolean;
  /** One part of the title (before the keys). */
  name: T2;
}

/** The chords of an item in key A. */
export function kmItem(kind: string, option: number, A: number): KMItem {
  const key = mod12(A);
  const op = Math.max(0, option) % kmOptions(kind);
  if (kind === 'km-turn') {
    const k = TURNS[op];
    return { chords: turnaround(key, k), to: key, name: t(`Turnaround ${TURN_NAME[k].en}`, `טרנאראונד ${TURN_NAME[k].he}`) };
  }
  if (kind === 'km-bridge') return { chords: bridge(key), to: key, name: t('Rhythm-changes bridge: III7–VI7–II7–V7', 'הגשר של ריתם צ׳יינג׳ס: III7–VI7–II7–V7') };
  if (kind === 'km-direct') {
    const d = DIRECT[op];
    if (d.pop) {
      const m = popMove(key, d.pop.up, d.pop.viaV);
      return { chords: m.chords, to: m.to, triad: true, name: d.pop.viaV ? t(`Pop lift ${moveName(d.off).en}, through the new V`, `הרמה פופית ${moveName(d.off).he}, דרך ה־V החדש`) : t(`Pop lift ${moveName(d.off).en}`, `הרמה פופית ${moveName(d.off).he}`) };
    }
    const m = directMove(key, key + d.off);
    return { chords: m.chords, to: m.to, name: t(`Direct, ${moveName(d.off).en}`, `ישירות, ${moveName(d.off).he}`) };
  }
  if (kind === 'km-pivot') {
    const m = pivotMove(key, op);
    const p = PIVOTS[op];
    return { chords: m.chords, to: m.to, toMinor: m.toMinor, name: t(`Pivot chord ${p.en}`, `אקורד ציר ${p.he}`) };
  }
  const off = KM_TARGETS[kind][op];
  const B = key + off;
  const mv = moveName(off);
  switch (kind) {
    case 'km-iiv':
      return { chords: iiVMove(key, B).chords, to: mod12(B), name: t(`ii–V of the new key, ${mv.en}`, `ii–V של הסולם החדש, ${mv.he}`) };
    case 'km-tritone':
      return { chords: tritoneMove(key, B).chords, to: mod12(B), name: t(`Tritone sub into the new key, ${mv.en}`, `תחליף טריטון לסולם החדש, ${mv.he}`) };
    case 'km-dim':
      return { chords: dimMove(key, B).chords, to: mod12(B), name: t(`I6 → °7 → V7 → I6, ${mv.en}`, `I6 → °7 → V7 → I6, ${mv.he}`) };
    case 'km-dim251':
      return { chords: dimMove(key, B, { start: 'iiVI' }).chords, to: mod12(B), name: t(`ii–V–I, then the diminished, ${mv.en}`, `ii–V–I, ואז המוקטן, ${mv.he}`) };
    case 'km-dimall':
      return { chords: dimMove(key, B).chords, to: mod12(B), name: t(`Through the diminished, ${mv.en}`, `דרך המוקטן, ${mv.he}`) };
    case 'km-dimb9':
      return { chords: dimMove(key, B, { b9: true }).chords, to: mod12(B), name: t(`°7 raised to 7♭9, ${mv.en}`, `°7 מורם ל־7♭9, ${mv.he}`) };
    case 'km-line':
      return { chords: dimMove(key, B).chords, to: mod12(B), name: t(`6-dim line, ${mv.en}`, `קו שש-מוקטן, ${mv.he}`) };
  }
  throw new Error(`Unknown key-move kind: ${kind}`);
}

const keysTitle = (A: number, it: KMItem): string => (it.to === mod12(A) && !it.toMinor ? keyName(A) : `${keyName(A)} → ${keyName(it.to, it.toMinor)}`);
const titleOf = (A: number, it: KMItem): T2 => t(`${it.name.en} · ${keysTitle(A, it)}`, `${it.name.he} · ${keysTitle(A, it)}`);
const vlChords = (cs: KChord[]): VLChord[] => cs.map((c) => ({ root: c.root, q: c.q, name: c.name }));

/** The chord names per bar (two to a bar where a chord lasts two beats). */
export function kmChart(cs: KChord[]): string[] {
  const at = chordBeats(cs);
  const bars: string[] = [];
  cs.forEach((c, i) => {
    const b = Math.floor(at[i] / 4 + 1e-6);
    bars[b] = bars[b] ? `${bars[b]} ${c.name}` : c.name;
  });
  return Array.from({ length: Math.ceil(totalBeats(cs) / 4) }, (_, i) => bars[i] ?? '%');
}

/** The written first voicing: the candidate nearest the middle of the register (guitar: nearest fret 5). */
function firstOf(c: VLChord, g: VLGoal, aim: number): number[] {
  const all = candidates(c, g);
  if (!all.length) throw new Error(`key moves: no ${g.type} voicing of ${c.name}`);
  const score = (x: number[]): number => {
    if (g.strings) {
      const f = fitOnSet(x, g.strings[0], g.tuning);
      return f ? Math.abs(Math.min(...f.map((p) => p.f)) - 5) : 99;
    }
    const m = measuredOf(x, g.type);
    return Math.abs((m[0] + m[m.length - 1]) / 2 - aim);
  };
  return all.slice().sort((a, b) => score(a) - score(b))[0];
}

/** The voice-leading goal and model path of an item (piano, or guitar on a string set). */
export function kmPlan(s: DrillSpec, strings?: number[], tuning?: string): { it: KMItem; goal: VLGoal; path: number[][] } {
  const A = mod12(s.key);
  const it = kmItem(s.kind, s.option ?? 0, A);
  const chords = vlChords(it.chords);
  const guitar = !!strings;
  const type: VLType = it.triad ? 'triad' : guitar ? 'drop2' : s.kind === 'km-bridge' && (s.option ?? 0) === 0 ? 'guide' : 'close';
  const base: VLGoal = {
    chords,
    at: chordBeats(it.chords),
    type,
    tol: type === 'triad' ? 1 : 2,
    lo: guitar ? 40 : type === 'guide' ? 52 : 53,
    hi: guitar ? 88 : type === 'guide' ? 76 : 79,
    flats: flatsFor(A),
    ...(guitar ? { strings: [strings!], tuning: tuning ?? 'standard' } : { bass: true }),
    ...(type !== 'triad' ? { sevenToThree: true } : {}),
  };
  const goal: VLGoal = { ...base, first: firstOf(chords[0], base, type === 'triad' ? 66 : type === 'guide' ? 62 : 65) };
  return { it, goal, path: ledPath(goal) };
}

/**
 * The model path a player can copy and pass: the smallest total motion through the chords, using only changes the
 * grader calls clean from the voicing before (optimalPath alone may take a locally bigger step to save later — on a
 * string set, around the bridge's dominants — which the grader would mark). Falls back to optimalPath.
 */
export function ledPath(g: VLGoal): number[][] {
  const full = (v: number[], k: number): number[] => {
    if (!g.bass) return v;
    let b = 36 + mod12(g.chords[k].root - 36);
    while (b >= Math.min(...v)) b -= 12;
    return [b, ...v];
  };
  const cands = g.chords.map((c, i) => (i === 0 && g.first ? [g.first] : candidates(c, g)));
  const clean = (u: number[], v: number[], k: number): boolean => gradeVoicings([full(u, k - 1), full(v, k)], { ...g, chords: [g.chords[k - 1], g.chords[k]], at: [0, 1], first: undefined })[1].verdict === 'clean';
  let cost = cands[0].map(() => 0);
  const back: number[][] = [cands[0].map(() => -1)];
  for (let k = 1; k < cands.length; k++) {
    const nc: number[] = [];
    const bk: number[] = [];
    for (const v of cands[k]) {
      let best = Infinity;
      let arg = -1;
      cands[k - 1].forEach((u, j) => {
        if (!Number.isFinite(cost[j])) return;
        const d = cost[j] + motion(measuredOf(u, g.type), measuredOf(v, g.type)).total;
        if (d < best && clean(u, v, k)) {
          best = d;
          arg = j;
        }
      });
      nc.push(best);
      bk.push(arg);
    }
    cost = nc;
    back.push(bk);
  }
  const end = cost.indexOf(Math.min(...cost));
  if (!Number.isFinite(cost[end])) return optimalPath(g);
  const path: number[][] = [];
  for (let k = cands.length - 1, j = end; k >= 0; k--) {
    path.unshift(cands[k][j]);
    j = back[k][j];
  }
  return path;
}

// ───────────────────────────── piano ─────────────────────────────

/** A piano item: voice-led chords, or (km-line) the 6th-diminished line in the right hand. */
export function genKeyMovePiano(s: DrillSpec): Drill {
  const A = mod12(s.key);
  if (s.kind === 'km-line') return pianoLine(s);
  const { it, goal, path } = kmPlan(s);
  const notes: ExpNote[] = [];
  let bassPrev = 46;
  path.forEach((full, k) => {
    const beat = goal.at[k];
    const dur = it.chords[k].beats;
    const id = k + 1;
    const sorted = full.slice().sort((a, b) => a - b);
    sorted.forEach((p) => notes.push({ pitch: p, beat, dur, hand: 'R', chordId: id }));
    const r = goal.chords[k].root;
    const opts = [36, 48].map((o) => o + mod12(r - o)).filter((p) => p >= 38 && p <= 55 && p < sorted[0]);
    const b = (opts.length ? opts : [36 + mod12(r - 36)]).sort((a, c) => Math.abs(a - bassPrev) - Math.abs(c - bassPrev))[0];
    bassPrev = b;
    notes.push({ pitch: b, beat, dur, hand: 'L', chordId: id });
  });
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const chordSets: NonNullable<DrillGoal['chordSets']> = goal.chords.map((c, k) => {
    const req = [...new Set([...typePcs(c, goal.type), c.root])].sort((a, b) => a - b);
    return { chordId: k + 1, required: req, allowed: req };
  });
  return {
    spec: { ...s, key: A, hands: 'RL' },
    itemId: itemIdOf({ ...s, key: A }),
    title: titleOf(A, it),
    notes,
    beats: totalBeats(it.chords),
    meter: 4,
    keySig: SIGS[A],
    goal: { evenness: false, hands: true, chordSets, vl: goal },
    startBpm: Math.round(s.tempo ?? 60),
    chart: kmChart(it.chords),
  };
}

function pianoLine(s: DrillSpec): Drill {
  const A = mod12(s.key);
  const it = kmItem(s.kind, s.option ?? 0, A);
  const line = sixDimLine(A, it.to, 55);
  const notes: ExpNote[] = line.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R', chordTone: n.ct }));
  return {
    spec: { ...s, key: A },
    itemId: itemIdOf({ ...s, key: A }),
    title: titleOf(A, it),
    notes,
    beats: 16,
    meter: 4,
    keySig: SIGS[A],
    goal: { evenness: true, hands: false },
    startBpm: Math.round(s.tempo ?? 72),
    chart: lineChart(it),
  };
}
/** The line's chart: key A's 6 chord, the diminished and the V7, key B's 6 chord (twice). */
const lineChart = (it: KMItem): string[] => {
  const [I, dim, V, J] = it.chords;
  return [I.name, `${dim.name} ${V.name}`, J.name, J.name];
};

// ───────────────────────────── guitar ─────────────────────────────

/** The string set of a guitar item: 4-3-2-1 or 5-4-3-2 (triads: 3-2-1 or 4-3-2), by `position`. */
export const kmStrings = (s: DrillSpec, triad: boolean): number[] => (triad ? ((s.position ?? 0) === 1 ? [4, 3, 2] : [3, 2, 1]) : (s.position ?? 0) === 1 ? [5, 4, 3, 2] : [4, 3, 2, 1]);

/** A guitar item: the voice-led model path as tab (the chart above it; free choice from the second chord). */
export function generateGuitarKeyMove(s: DrillSpec, tu: Tuning): Drill {
  const A = mod12(s.key);
  if (s.kind === 'km-line') return guitarLine(s, tu);
  const it0 = kmItem(s.kind, s.option ?? 0, A);
  const set = kmStrings(s, !!it0.triad);
  const { it, goal, path } = kmPlan(s, set, tu.id);
  const evs: Ev[] = path.map((full, k) => {
    const fit = fitOnSet(full, set, tu.id)!;
    return { beat: goal.at[k], dur: it.chords[k].beats, notes: fit.map((x) => ({ s: x.s, f: x.f, tech: 'strum-down' as const, stroke: 'D' as const })) };
  });
  const d = finish(s, tu, evs, { title: titleOf(A, it), bpm: 60, evenness: false, goal: { vl: goal }, keySig: SIGS[A] });
  return { ...d, chart: kmChart(it.chords), show: 'chart', freeFrom: it.chords[0].beats };
}

/** Place a line inside a hand position around `center`, shifting only when a note is out of reach. */
function linePlaces(tu: Tuning, ms: number[], center: number): { s: number; f: number }[] {
  const S = [6, 5, 4, 3, 2, 1];
  let c = center;
  return ms.map((m) => {
    const p = place(tu, m, S, Math.max(0, c - 1), Math.min(17, c + 4)) ?? place(tu, m, S, Math.max(0, c - 3), Math.min(17, c + 6)) ?? place(tu, m, S, 0, 17) ?? place(tu, m, S, 0, 22)!;
    if (p.f > 0 && (p.f < c - 1 || p.f > c + 4)) c = Math.min(13, Math.max(1, p.f - 1));
    return p;
  });
}
function guitarLine(s: DrillSpec, tu: Tuning): Drill {
  const A = mod12(s.key);
  const it = kmItem(s.kind, s.option ?? 0, A);
  const line = sixDimLine(A, it.to, 45);
  // Start in the position of key A's tonic on string 6 (or 5 when that is high up the neck).
  const f6 = line[0].pitch - tu.open[tu.open.length - 1];
  const f5 = line[0].pitch - tu.open[tu.open.length - 2];
  const ps = linePlaces(tu, line.map((n) => n.pitch), Math.max(1, (f6 >= 1 && f6 <= 8 ? f6 : f5 >= 1 ? f5 : 12) - 1));
  const evs: Ev[] = line.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...ps[i], stroke: i % 2 === 0 ? 'D' : 'U', ct: n.ct } as GN] }));
  const d = finish(s, tu, evs, { title: titleOf(A, it), bpm: 72, evenness: true, keySig: SIGS[A] });
  return { ...d, chart: lineChart(it) };
}

// ───────────────────────────── bass ─────────────────────────────

/**
 * A bass line that leads the move: a 4-beat chord walks root – 3rd – 5th – approach, a 2-beat chord plays its root
 * then an approach a half step from the next root (from above or below, never repeating the note before); the last
 * chord is held. km-bridge option 1: the two-feel (root and 5th in halves).
 */
export function bassLineOf(tu: Tuning, cs: KChord[], twoFeel = false, sevenths = false): BN[] {
  const at = chordBeats(cs);
  const out: BN[] = [];
  const lo = lowest(tu);
  cs.forEach((c, i) => {
    const R = rootOf(tu, c.root);
    const ints = KQ_INTS[c.q];
    const b0 = at[i];
    if (i === cs.length - 1) {
      out.push({ b: b0, d: c.beats, p: R, ct: true });
      return;
    }
    const next = rootOf(tu, cs[i + 1].root);
    const approach = (prev: number): number => {
      const cands = [next - 1, next + 1].filter((p) => p >= lo && p !== prev);
      return cands.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))[0] ?? next + 1;
    };
    if (twoFeel) {
      out.push({ b: b0, d: 2, p: R, ct: true }, { b: b0 + 2, d: 2, p: fold(tu, R + 7), ct: true });
      return;
    }
    if (c.beats >= 4) {
      const third = R + (ints[1] === 1 ? ints[2] : ints[1]);
      const fifth = R + ints[ints[1] === 1 ? 3 : 2];
      out.push({ b: b0, d: 1, p: R, ct: true }, { b: b0 + 1, d: 1, p: third, ct: false }, { b: b0 + 2, d: 1, p: fifth, ct: false }, { b: b0 + 3, d: 1, p: approach(fifth), ct: false });
    } else if (sevenths && c.q !== 'M') {
      // The Ladybird's line: root and 7th, so ♭VImaj7 (the major 7th) and ♭II7 (the flat 7th) sound as written.
      out.push({ b: b0, d: 1, p: R, ct: true }, { b: b0 + 1, d: 1, p: R + ints[3], ct: true });
    } else {
      out.push({ b: b0, d: 1, p: R, ct: true }, { b: b0 + 1, d: 1, p: approach(R), ct: false });
    }
  });
  return out;
}

/** A bass item: the move as a line (or the 6th-diminished line in the bass register). */
export function generateBassKeyMove(s: DrillSpec, tu: Tuning): Drill {
  const A = mod12(s.key);
  const it = kmItem(s.kind, s.option ?? 0, A);
  if (s.kind === 'km-line') {
    const line: BN[] = sixDimLine(A, it.to, 28).map((n) => ({ b: n.beat, d: n.dur, p: fold(tu, n.pitch), ct: n.ct }));
    return drillOf(s, tu, alt(line), { en: it.name.en, he: it.name.he, keyName: keysTitle(A, it), chart: lineChart(it), keySig: SIGS[A] });
  }
  const two = s.kind === 'km-bridge' && (s.option ?? 0) === 1;
  const sevenths = s.kind === 'km-turn' && (s.option ?? 0) === 3;
  const line = bassLineOf(tu, it.chords, two, sevenths);
  const en = two ? `${it.name.en}, in two` : sevenths ? `${it.name.en}, roots and 7ths` : it.name.en;
  const he = two ? `${it.name.he}, בשתיים` : sevenths ? `${it.name.he}, שורשים וספטימות` : it.name.he;
  return drillOf(s, tu, alt(line), { en, he, keyName: keysTitle(A, it), chart: kmChart(it.chords), keySig: SIGS[A], evenness: !two });
}

// ───────────────────────────── catalogue ─────────────────────────────

/** All twelve keys, round the cycle of 4ths. */
export const KM_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** The levels, shared: [kind, options, en, he]. Order = path order (turnarounds and the bridge first, the 6-dim line last). */
const LEVELS: { kinds: [string, number[]][]; en: string; he: string }[] = [
  { kinds: [['km-turn', [0, 1]]], en: 'Turnarounds: I–VI7–ii–V and the passing diminished', he: 'טרנאראונדים: I–VI7–ii–V והמוקטן העובר' },
  { kinds: [['km-turn', [2, 3]]], en: 'The tritone turnaround and the Ladybird', he: 'טרנאראונד הטריטון והלידיבירד' },
  { kinds: [['km-bridge', [0, 1]]], en: 'Rhythm-changes bridge: III7–VI7–II7–V7', he: 'הגשר של ריתם צ׳יינג׳ס: III7–VI7–II7–V7' },
  { kinds: [['km-direct', range(4)]], en: 'Direct key changes and the pop lift', he: 'מעבר סולם ישיר וההרמה הפופית' },
  { kinds: [['km-iiv', range(6)]], en: 'A ii–V into the new key', he: 'ii–V אל הסולם החדש' },
  { kinds: [['km-pivot', range(4)]], en: 'Pivot chords: a chord both keys share', he: 'אקורד ציר: אקורד ששני הסולמות חולקים' },
  { kinds: [['km-dim', range(3)]], en: 'One diminished, four keys: I6, °7, V7, I6', he: 'מוקטן אחד, ארבעה סולמות: I6, ‏°7, ‏V7, ‏I6' },
  { kinds: [['km-dim251', range(3)]], en: 'From a ii–V–I through the common diminished', he: 'מ־ii–V–I דרך המוקטן המשותף' },
  { kinds: [['km-dimall', range(8)]], en: 'The other two diminished chords: every key', he: 'שני המוקטנים האחרים: כל הסולמות' },
  { kinds: [['km-dimb9', range(5)]], en: 'Raise one note a whole step: the 7♭9', he: 'מעלים צליל אחד בטון: ה־7♭9' },
  { kinds: [['km-tritone', range(4)]], en: 'A tritone sub into the new key', he: 'תחליף טריטון אל הסולם החדש' },
  { kinds: [['km-line', range(5)]], en: '6th-diminished lines from key to key', he: 'קווי שש-מוקטן מסולם לסולם' },
];

/** k-keys: key changes and turnarounds at the piano (path ~1330 → 1640, KEYS_LATER / LADDER_SPREAD in path.ts). */
export function pianoKeyMoveFamily(): FamilyDef {
  const fam: FamilyId = 'k-keys';
  const levels: LevelDef[] = LEVELS.map((lv, i) => {
    const line = lv.kinds[0][0] === 'km-line';
    const tempo: [number, number] = line ? [72, 120] : [60, 96];
    return {
      id: `${fam}-${i + 1}`,
      level: i + 1,
      title: t(lv.en, lv.he),
      specs: lv.kinds.flatMap(([kind, ops]) => ops.map((o): SpecTemplate => ({ family: fam, kind, hands: line ? 'R' : 'RL', option: o, tempo: tempo[0] }))),
      keys: KM_KEYS,
      tempo,
    };
  });
  return { id: fam, title: t('Key changes', 'מעברי סולם'), style: 'jazz', levels };
}

/** The RSL-style grade of each guitar level (path order: grade, then level). */
const G_GRADE = [6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8];
/** g-keys: the same levels on the neck (jazz add-on). Turnarounds and the bridge run on both string sets. */
export function guitarKeyMoveFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-keys';
  const levels: GuitarLevelDef[] = LEVELS.map((lv, i) => {
    const line = lv.kinds[0][0] === 'km-line';
    const tempo: [number, number] = line ? [72, 120] : [60, 96];
    const both = i < 3;
    // The bridge's two options differ only at the piano (guide tones / close): on the neck it is drop 2 on both sets.
    const specs = lv.kinds.flatMap(([kind, ops]) =>
      (kind === 'km-bridge' ? [0] : ops).flatMap((o): SpecTemplate[] => {
        const S = (position: number): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', option: o, position, tempo: tempo[0] });
        if (line) return [S(0)];
        return both ? [S(0), S(1)] : [S(o % 2)];
      }),
    );
    return { id: `${fam}-${i + 1}`, level: i + 1, title: t(lv.en, lv.he), specs, keys: KM_KEYS, tempo, sub: line ? 'swung 8ths' : 'one voicing a chord', grade: G_GRADE[i] };
  });
  return { id: fam, title: t('Key changes on the neck', 'מעברי סולם על הצוואר'), style: 'jazz', genres: ['jazz'], instruments: ['guitar'], levels };
}

/** b-keys: the line under each move, the turnarounds and the bridge (jazz track). */
export function bassKeyMoveFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-keys';
  const levels: GuitarLevelDef[] = LEVELS.map((lv, i) => {
    const line = lv.kinds[0][0] === 'km-line';
    const tempo: [number, number] = line ? [72, 120] : [80, 140];
    return {
      id: `${fam}-${i + 1}`,
      level: i + 1,
      title: t(lv.en, lv.he),
      specs: lv.kinds.flatMap(([kind, ops]) => ops.map((o): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'bass', option: o, ...(line ? {} : { perBeat: 1 }), tempo: tempo[0] }))),
      keys: KM_KEYS,
      tempo,
      sub: line ? '8ths' : 'quarters',
    };
  });
  return { id: fam, title: t('Key changes on the bass', 'מעברי סולם בבס'), style: 'jazz', genres: ['all'], instruments: ['bass'], levels };
}

/** Every key-move level id → the kinds it runs (tests, lessons). */
export const KM_LEVEL_KINDS: string[][] = LEVELS.map((l) => l.kinds.map(([k]) => k));
