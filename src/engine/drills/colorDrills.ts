// Reharmonization and colour harmony, performed (docs/HARMONY-REHARM.md; build plan docs/research/REHARM-AND-COLOR.md
// Part C). The music comes from ../commonTone.ts.
//
//   keys   k-ctone    one note, many chords: triads → 7ths → drop 2 under a held note → tensions → a phrase → your own
//                     eight chords → the counter-line (the bass walks, the held note stays)              ~1050–1800
//          k-mediant  chromatic mediants: common tones, the augmented and minor-3rd cycles, mediant 7ths, the
//                     Coltrane link with the held note, the hexatonic cycle                                  ~1250–1800
//          k-organ    organ comping in the Goldings style: walking LH under a held pad, a moving inner voice,
//                     thin vs full, a ballad on the common-tone ladder (the tonewheel organ sound)           ~1300–1700
//          k-reharm 11–22  modal interchange complete, pedal point, planing under a melody, half-step approach
//                     chords, side-slip, the sus reharm, non-functional sequences, maj7♯5                    ~1100–1750
//   guitar g-ctone, g-color (the jazz add-on)
//   bass   b-counter  the bass reharmonizes: pedals, borrowed and mediant roots, the counter-line          ~1100–1650
//
// Every item runs in all 12 keys from C (the key is in the item id → key mastery). Voicing choices under a held note
// are graded by the voice-leading grader (voiceLead.ts: the held note on top, the smallest motion + a tolerance);
// written voicings by chord sets; the player's own eight chords by ctFreeAnalyze.ts. Items without drums start in free
// time, then quarters, then the tempo ladder (rubato.ts).
//
// NOTE: generate.ts, guitar.ts and bass.ts import this module and it imports theirs: nothing here calls their exports
// at module top level (only inside functions).

import type { BassFamilyId, Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { Buf, chordDrill, itemIdOf, pianoFinish } from './generate';
import type { Tuning } from '../fretboard';
import type { Ev, GuitarFamilyDef, GuitarLevelDef, GuitarStyle } from './guitar';
import { finish as gFinish } from './guitar';
import { alt, drillOf, rootOf, type BN } from './bass';
import { candidates, closeShapes, fitOnSet, optimalPath, QUAL, typePcs, type VLChord, type VLGoal, type VLQuality, type VLType } from './voiceLead';
import { COUNTER_LINE, CT_Q, LADDER, counterLineNames, hexatonicCycle, octatonicCycle, mod12, rootName, sharpKey, spellHeld, type CtQ, type Triad } from '../commonTone';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** All 12 keys round the cycle of 4ths, C first (the lessons teach in C). */
export const CL_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const flatsOf = (key: number): boolean => !sharpKey(key);
const nm = (key: number, pc: number, q: CtQ): string => rootName(pc, flatsOf(key)) + CT_Q[q].sym;
const kName = (key: number, minor = false): string => rootName(minor ? key : key, flatsOf(minor ? key + 3 : key)) + (minor ? 'm' : '');
/** A pitch of pitch class pc inside [lo, lo + 11]. */
const pin = (pc: number, lo: number): number => lo + mod12(pc - lo);
const VLQ: Partial<Record<CtQ, VLQuality>> = { M: 'M', m: 'm', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7b5', '6': '6', m6: 'm6', dim7: 'dim7', '7b9': '7b9' };

// ───────────────────────────── voice leading under a held note (VL grader) ─────────────────────────────

interface VLItem {
  chords: VLChord[];
  type: VLType;
  /** Beats per chord. */
  per: number;
  lo: number;
  hi: number;
  tol: number;
  bass?: boolean;
  title: T2;
  keySig: string;
  /** Guitar: the string set (low → high string numbers). */
  strings?: number[];
  /** Middle of the first voicing (piano). */
  aim?: number;
}
function vlGoal(it: VLItem, tuning?: string): VLGoal {
  const base: VLGoal = {
    chords: it.chords,
    at: it.chords.map((_, i) => i * it.per),
    type: it.type,
    tol: it.tol,
    lo: it.lo,
    hi: it.hi,
    flats: true,
    ...(it.bass ? { bass: true } : {}),
    ...(it.strings ? { strings: [it.strings], tuning: tuning ?? 'standard' } : {}),
  };
  const all = candidates(it.chords[0], base);
  if (!all.length) throw new Error(`colour drill: no first voicing for ${it.title.en}`);
  const aim = it.aim ?? (it.lo + it.hi) / 2;
  const score = (v: number[]): number => {
    if (it.strings) {
      const f = fitOnSet(v, it.strings, tuning);
      return f ? Math.abs(Math.min(...f.map((x) => x.f)) - 5) : 99;
    }
    return Math.abs((Math.min(...v) + Math.max(...v)) / 2 - aim);
  };
  return { ...base, first: all.slice().sort((a, b) => score(a) - score(b))[0] };
}
function chartOfAt(names: string[], at: number[], meter = 4): string[] {
  const bars: string[] = [];
  names.forEach((n, i) => {
    const b = Math.floor(at[i] / meter + 1e-6);
    bars[b] = bars[b] ? `${bars[b]} ${n}` : n;
  });
  return Array.from({ length: bars.length }, (_, i) => bars[i] ?? '%');
}
const nameOfVL = (c: VLChord): string => c.name ?? rootName(c.root) + QUAL[c.q].label;

/** A piano item graded by the voice-leading grader: the model path is the written notes; any good voicing passes. */
function vlPiano(s: DrillSpec, it: VLItem): Drill {
  const goal = vlGoal(it);
  const path = optimalPath(goal);
  const notes: ExpNote[] = [];
  let bassPrev = 48;
  path.forEach((full, k) => {
    const beat = goal.at[k];
    const sorted = full.slice().sort((a, b) => a - b);
    sorted.forEach((p, j) => {
      const lh = it.type === 'drop2' || it.type === 'drop3' ? j === 0 : false;
      notes.push({ pitch: p, beat, dur: it.per, hand: lh ? 'L' : 'R', chordId: k + 1, ...(goal.chords[k].melody === p ? { accent: true } : {}) });
    });
    if (it.bass) {
      const r = goal.chords[k].root;
      const opts = [36, 48].map((o) => o + mod12(r - o)).filter((p) => p >= 38 && p <= 55 && p < sorted[0]);
      const b = (opts.length ? opts : [36 + mod12(r - 36)]).sort((a, c) => Math.abs(a - bassPrev) - Math.abs(c - bassPrev))[0];
      bassPrev = b;
      notes.push({ pitch: b, beat, dur: it.per, hand: 'L', chordId: k + 1 });
    }
  });
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const chordSets: NonNullable<DrillGoal['chordSets']> = goal.chords.map((c, k) => {
    const req = [...new Set([...typePcs(c, it.type), ...(it.bass ? [c.root] : [])])].sort((a, b) => a - b);
    return { chordId: k + 1, required: req, allowed: req };
  });
  const key = mod12(s.key);
  const spec = { ...s, key, hands: notes.some((n) => n.hand === 'L') ? ('RL' as const) : ('R' as const) };
  return {
    spec,
    itemId: itemIdOf(spec),
    title: it.title,
    notes,
    beats: goal.at[goal.at.length - 1] + it.per,
    meter: 4,
    keySig: it.keySig,
    goal: { evenness: false, hands: spec.hands === 'RL', chordSets, vl: goal },
    startBpm: Math.round(s.tempo ?? 60),
    chart: chartOfAt(goal.chords.map(nameOfVL), goal.at),
  };
}

/** The same on the guitar: one string set, the model path as tab, the chart shown (free choice). */
function vlGuitar(s: DrillSpec, tu: Tuning, it: VLItem): Drill {
  const goal = vlGoal(it, tu.id);
  const path = optimalPath(goal);
  const evs: Ev[] = path.map((full, k) => {
    const fit = fitOnSet(full, it.strings!, tu.id)!;
    return { beat: goal.at[k], dur: it.per, notes: fit.map((x) => ({ s: x.s, f: x.f, tech: 'strum-down' as const, stroke: 'D' as const })) };
  });
  const d = gFinish({ ...s, key: mod12(s.key) }, tu, evs, { title: it.title, bpm: 60, evenness: false, goal: { vl: goal }, keySig: it.keySig });
  return { ...d, chart: chartOfAt(goal.chords.map(nameOfVL), goal.at), show: 'chart', freeFrom: it.per };
}

// ───────────────────────────── written voicings (chord sets) ─────────────────────────────

/** Rootless right-hand colours by quality (intervals above the root). */
const RHQ: Record<CtQ, number[]> = {
  M: [0, 4, 7], m: [0, 3, 7], aug: [0, 4, 8],
  maj7: [4, 7, 11, 2], '6': [4, 7, 9, 2], m7: [3, 7, 10, 2], '7': [4, 9, 10, 2], m7b5: [3, 6, 10, 0], m6: [3, 7, 9, 2], dim7: [0, 3, 6, 9],
  '9': [4, 7, 10, 2], '7sus4': [5, 7, 10, 2], '13': [4, 9, 10, 2], '7b9': [4, 7, 10, 1], '7#9': [4, 7, 10, 3], '7#11': [4, 6, 10, 2], '7b13': [4, 8, 10, 2], 'maj7#11': [4, 6, 11, 2], 'maj7#5': [4, 8, 11, 2],
};
/** The 7th (or 6th) the LH shell adds over the root. */
const SHELL7 = (q: CtQ): number | null => (['maj7', 'maj7#11', 'maj7#5'].includes(q) ? 11 : ['6', 'm6', 'dim7'].includes(q) ? 9 : ['M', 'm', 'aug'].includes(q) ? null : 10);
/** A held-note voicing per tension chord (C.1 L4): intervals above the root, low → high, the held note last. */
export const TENSION_RH: Partial<Record<CtQ, number[]>> = {
  '9': [4, 7, 10, 14],
  '7sus4': [7, 10, 14, 17],
  '13': [4, 10, 14, 21],
  '7b9': [4, 7, 10, 13],
  '7#11': [4, 9, 10, 18],
  '7b13': [4, 10, 14, 20],
  '7#9': [4, 7, 10, 15],
};

interface CC {
  /** Root pitch class (absolute). */
  root: number;
  q: CtQ;
  beats: number;
  name: string;
  /** The RH's top pitch (a held note). */
  top?: number;
  /** RH intervals above the root (low → high) to hang under `top`. */
  shape?: number[];
  /** Absolute RH pitches. */
  rh?: number[];
  /** LH: root, root + 7th (shell), nothing, or a bass pitch class (a slash chord or a pedal). */
  lh?: 'root' | 'shell' | 'none';
  bass?: number;
  /** Start beat (default: after the chord before). */
  at?: number;
}
interface CompOpts {
  title: T2;
  keySig: string;
  rh?: [number, number];
  aim?: number;
  bpm?: number;
}
function motionOf(a: number[], b: number[]): number {
  if (a.length === b.length) return a.reduce((s, p, i) => s + Math.abs(p - b[i]), 0);
  return b.reduce((s, p) => s + Math.min(...a.map((q) => Math.abs(p - q))), 0);
}
/** The written two-hand drill of a progression (each chord a chord set: its notes required, its tensions allowed). */
function comp(s: DrillSpec, ccs: CC[], o: CompOpts): Drill {
  const [lo, hi] = o.rh ?? [57, 81];
  let prev: number[] | null = null;
  let bassPrev = 43;
  let at = 0;
  const evs = ccs.map((c) => {
    let rh: number[];
    if (c.rh) rh = c.rh.slice();
    else if (c.top !== undefined && c.shape) rh = c.shape.map((x) => c.top! - (c.shape![c.shape!.length - 1] - x));
    else {
      const pcs = RHQ[c.q].map((x) => mod12(c.root + x));
      let cands = closeShapes(pcs, lo, hi);
      if (c.top !== undefined) {
        const withTop = closeShapes([...new Set([...pcs, mod12(c.top)])], lo - 6, c.top).filter((v) => v[v.length - 1] === c.top);
        cands = withTop.length ? withTop : cands;
      }
      const p0 = prev;
      rh = cands.slice().sort((a, b) => (p0 ? motionOf(p0, a) - motionOf(p0, b) : Math.abs((a[0] + a[a.length - 1]) / 2 - (o.aim ?? 68)) - Math.abs((b[0] + b[b.length - 1]) / 2 - (o.aim ?? 68))))[0];
    }
    rh.sort((a, b) => a - b);
    prev = rh;
    const lhMode = c.lh ?? 'root';
    const lh: number[] = [];
    if (lhMode !== 'none') {
      const bpc = c.bass ?? c.root;
      const opts = [33, 45].map((x) => pin(bpc, x)).filter((p) => p < rh[0] - 2);
      const b = (opts.length ? opts : [pin(bpc, 33)]).sort((x, y) => Math.abs(x - bassPrev) - Math.abs(y - bassPrev))[0];
      bassPrev = b;
      lh.push(b);
      const s7 = SHELL7(c.q);
      if (lhMode === 'shell' && s7 !== null && c.bass === undefined && b + s7 < rh[0]) lh.push(b + s7);
    }
    const beat = c.at ?? at;
    at = beat + c.beats;
    const tones = CT_Q[c.q].ints.map((x) => mod12(c.root + x));
    const played = [...rh, ...lh].map(mod12);
    return {
      beat,
      dur: c.beats,
      notes: [...rh.map((p) => ({ pitch: p, hand: 'R' as const })), ...lh.map((p) => ({ pitch: p, hand: 'L' as const }))],
      required: played,
      allowed: [...played, ...tones, ...RHQ[c.q].map((x) => mod12(c.root + x))],
    };
  });
  const sp: DrillSpec = { ...s, key: mod12(s.key), hands: 'RL' };
  const d = chordDrill(sp, evs, o.title, o.bpm ?? 60, {}, o.keySig);
  const at2: number[] = [];
  let a = 0;
  for (const c of ccs) {
    at2.push(c.at ?? a);
    a = (c.at ?? a) + c.beats;
  }
  return { ...d, chart: chartOfAt(ccs.map((c) => c.name), at2) };
}

// ───────────────────────────── k-ctone: one note, many chords ─────────────────────────────

/** The orders the ladder chords come in (voice-led: each chord near the one before), as indices into the stage. */
const CT_ORDER: Record<'triads' | 'sevenths', number[][]> = {
  triads: [
    [0, 2, 4, 5, 3, 1, 0],
    [0, 3, 5, 1, 2, 4, 0],
  ],
  sevenths: [
    [0, 1, 3, 6, 4, 2, 5, 0],
    [0, 2, 5, 4, 1, 6, 3, 0],
  ],
};
/** The 4-bar common-tone phrases (C.1 L5): [interval of the held note above the root, quality]. Held F in C. */
export const CT_PHRASES: [number, CtQ][][] = [
  [[0, 'maj7'], [4, 'maj7'], [7, 'm6'], [10, '7sus4']],
  [[3, 'm7'], [2, '9'], [4, 'maj7'], [5, '7sus4']],
  [[10, 'm7'], [1, '7b9'], [9, '13'], [7, 'maj7']],
];
/** The model answer of "harmonize the note eight ways" (C.1 L6). */
export const CT_FREE_MODEL: [number, CtQ][] = [[0, 'maj7'], [3, 'm7'], [4, 'maj7'], [7, 'maj7'], [10, '7'], [2, '9'], [5, '7sus4'], [11, 'maj7']];
/** The held note of a key's items: the 4th degree (F in C), as in the research. */
export const heldOf = (key: number): number => mod12(key + 5);

const heldVL = (key: number, lo: number, stage: 'triads' | 'sevenths', order: number[], H: number): VLChord[] =>
  order.map((i) => {
    const [iv, q] = LADDER[stage][i];
    const c = spellHeld(heldOf(key) - iv, q, heldOf(key), flatsOf(key))!;
    void lo;
    return { root: c.root, q: VLQ[q]!, melody: H, name: c.sym };
  });

function heldName(key: number): string {
  return rootName(heldOf(key), flatsOf(key));
}

function genCtone(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const hn = heldName(key);
  const fl = flatsOf(key);
  switch (s.kind) {
    case 'ct-tri': {
      const H = pin(heldOf(key), 67);
      return vlPiano(s, { chords: heldVL(key, 55, 'triads', CT_ORDER.triads[op % 2], H), type: 'triad', per: 4, lo: 52, hi: 79, tol: 2, title: t(`Hold ${hn} on top: six triads under it`, `${hn} למעלה: שישה משולשים מתחתיו`), keySig: SIG[key], aim: 66 });
    }
    case 'ct-sev': {
      const H = pin(heldOf(key), 67);
      return vlPiano(s, { chords: heldVL(key, 55, 'sevenths', CT_ORDER.sevenths[op % 2], H), type: 'close', per: 4, lo: 52, hi: 79, tol: 2, title: t(`Hold ${hn} on top: seven 7th chords under it`, `${hn} למעלה: שבעה ספטאקורדים מתחתיו`), keySig: SIG[key], aim: 66 });
    }
    case 'ct-drop2': {
      const H = pin(heldOf(key), 70);
      return vlPiano(s, { chords: heldVL(key, 48, 'sevenths', CT_ORDER.sevenths[op % 2], H), type: 'drop2', per: 4, lo: 46, hi: 82, tol: 3, title: t(`Drop 2 with ${hn} on top, each chord to the nearest`, `דרופ 2 עם ${hn} למעלה, כל אקורד אל הקרוב`), keySig: SIG[key], aim: 66 });
    }
    case 'ct-tens': {
      // LH root, RH four notes with the held note on top as a tension (9, 11, 13, ♭9 / ♯11, ♭13, ♯9).
      const H = pin(heldOf(key), 72);
      const list = LADDER.tensions.slice(op === 1 ? 4 : 0, op === 1 ? 7 : 4);
      const ccs: CC[] = list.map(([iv, q]) => {
        const c = spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!;
        return { root: c.root, q, beats: 4, name: c.sym, top: H, shape: TENSION_RH[q] };
      });
      const degs = list.map(([iv, q]) => spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!).map((c) => `${c.held} = ${c.degree} of ${c.sym}`).join(', ');
      const degsHe = list.map(([iv, q]) => spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!).map((c) => `${c.held} = ${c.degree} של ${c.sym}`).join(', ');
      return comp(s, ccs, { title: t(`${hn} as a tension: ${degs}`, `${hn} כטנשן: ${degsHe}`), keySig: SIG[key] });
    }
    case 'ct-phrase': {
      const H = pin(heldOf(key), 72);
      const ph = CT_PHRASES[op % CT_PHRASES.length];
      const ccs: CC[] = ph.map(([iv, q]) => {
        const c = spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!;
        return { root: c.root, q, beats: 4, name: c.sym, top: H, ...(TENSION_RH[q] ? { shape: TENSION_RH[q] } : {}) };
      });
      return comp(s, ccs, { title: t(`A common-tone phrase: ${ccs.map((c) => c.name).join(' – ')}, ${hn} held`, `משפט בצליל משותף: ${ccs.map((c) => c.name).join(' – ')}, ${hn} נשאר`), keySig: SIG[key] });
    }
    case 'ct-free': {
      // Your own eight chords: the model is one answer; any eight that hold the note pass (ctFreeAnalyze.ts).
      const H = pin(heldOf(key), 72);
      const ccs: CC[] = CT_FREE_MODEL.map(([iv, q]) => {
        const c = spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!;
        return { root: c.root, q, beats: 4, name: c.sym, top: H, ...(TENSION_RH[q] ? { shape: TENSION_RH[q] } : {}) };
      });
      const d = comp(s, ccs, { title: t(`Harmonize ${hn} eight ways: ${hn} on top, no chord twice`, `${hn} בשמונה דרכים: ${hn} למעלה, אף אקורד לא פעמיים`), keySig: SIG[key] });
      return { ...d, goal: { ...d.goal, chordSets: undefined, ct: { held: H, count: 8, at: ccs.map((_, i) => i * 4), tol: 4 } }, chart: Array.from({ length: 8 }, () => '?'), show: 'chart' };
    }
    case 'ct-counter': {
      // The counter-line (C.8): the held note stays on top (the key's tonic), the bass walks down by half steps,
      // every bass note renames the chord (C, Cmaj7/B, C7/B♭, Am7, A♭maj7, G7sus4 → C).
      const H = pin(key, 67);
      const names = counterLineNames(key, fl);
      let prev: number[] = [H - 8, H - 5];
      const ccs: CC[] = [...COUNTER_LINE, COUNTER_LINE[0]].map((c, i) => {
        const root = mod12(key + c.root);
        const bassPc = mod12(key + c.bass);
        const tones = CT_Q[c.q].ints.map((x) => mod12(root + x)).filter((p) => p !== mod12(H) && p !== bassPc);
        const inner = closeShapes(tones.slice(0, 2), H - 11, H - 1).sort((a, b) => motionOf(prev, a) - motionOf(prev, b))[0] ?? prev;
        prev = inner;
        return { root, q: c.q, beats: i === COUNTER_LINE.length ? 4 : 2, name: names[i % names.length], rh: [...inner, H], bass: bassPc };
      });
      // The bass falls by step: place it from the top of the LH register downwards.
      const d = comp(s, ccs, { title: t(`The counter-line: ${kName(key)} held, the bass walks down — ${names.join(' – ')}`, `קו נגדי: ${kName(key)} נשאר, הבס יורד — ${names.join(' – ')}`), keySig: SIG[key] });
      return d;
    }
  }
  throw new Error(`Unknown k-ctone kind ${s.kind}`);
}

// ───────────────────────────── k-mediant: chromatic mediants ─────────────────────────────

const tri = (key: number, d: number, minor = false): VLChord => ({ root: mod12(key + d), q: minor ? 'm' : 'M', name: rootName(key + d, flatsOf(key)) + (minor ? 'm' : '') });
/** Mediant progressions (semitones above the key, minor?): major-3rd, minor-3rd mediants; the two cycles. */
export const MEDIANT_PROGS: Record<string, [number, boolean][][]> = {
  'md-tri': [
    [[0, false], [8, false], [0, false], [4, false], [0, false]],
    [[0, false], [9, false], [0, false], [3, false], [0, false]],
  ],
  'md-cycle': [
    [[0, false], [4, false], [8, false], [0, false], [4, false], [8, false], [0, false]],
    [[0, false], [3, false], [6, false], [9, false], [0, false]],
  ],
};
function genMediant(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const kn = kName(key);
  switch (s.kind) {
    case 'md-tri':
    case 'md-cycle': {
      const prog = MEDIANT_PROGS[s.kind][op % 2];
      const chords = prog.map(([d, m]) => tri(key, d, m));
      const ttl =
        s.kind === 'md-tri'
          ? op === 0
            ? t(`Major-3rd mediants: ${chords.map((c) => c.name).join(' – ')}, the common tone held`, `מדיאנטות בטרצה גדולה: ${chords.map((c) => c.name).join(' – ')}, הצליל המשותף נשאר`)
            : t(`Minor-3rd mediants: ${chords.map((c) => c.name).join(' – ')}, the common tone held`, `מדיאנטות בטרצה קטנה: ${chords.map((c) => c.name).join(' – ')}, הצליל המשותף נשאר`)
          : op === 0
            ? t(`The augmented cycle: ${chords.map((c) => c.name).join(' – ')} (the Coltrane seed)`, `המעגל המוגדל: ${chords.map((c) => c.name).join(' – ')} (הזרע של קולטריין)`)
            : t(`The minor-3rd cycle: ${chords.map((c) => c.name).join(' – ')}`, `מעגל הטרצות הקטנות: ${chords.map((c) => c.name).join(' – ')}`);
      return vlPiano(s, { chords, type: 'triad', per: 2, lo: 55, hi: 79, tol: 1, title: ttl, keySig: SIG[key], aim: 67 });
    }
    case 'md-sev': {
      const prog: [number, VLQuality][] = [[0, 'maj7'], [8, 'maj7'], [0, 'maj7'], [4, 'maj7'], [0, 'maj7'], [9, 'maj7'], [0, 'maj7'], [3, 'maj7'], [0, 'maj7']];
      const chords: VLChord[] = prog.map(([d, q]) => ({ root: mod12(key + d), q, name: rootName(key + d, flatsOf(key)) + 'maj7' }));
      return vlPiano(s, { chords, type: 'drop2', per: 2, lo: 46, hi: 80, tol: 3, bass: true, title: t(`Mediant 7ths in drop 2: ${kn}maj7 to ♭VI, III, VI, ♭III and back`, `ספטאקורדי מדיאנטה בדרופ 2: ${kn}maj7 אל ♭VI, III, VI, ♭III וחזרה`), keySig: SIG[key], aim: 63 });
    }
    case 'md-coltrane': {
      // The 3rd of I held on top: Imaj7 (3) → ♭VImaj7♯5 (♯5) → IIImaj7 (root) → ♭VImaj7♯5 → Imaj7.
      const H = pin(key + 4, 69);
      const fl = flatsOf(key);
      const steps: [number, CtQ][] = [[0, 'maj7'], [8, 'maj7#5'], [4, 'maj7'], [8, 'maj7#5'], [0, 'maj7']];
      const ccs: CC[] = steps.map(([d, q]) => ({ root: mod12(key + d), q, beats: 4, name: spellHeld(key + d, q, key + 4, fl)!.sym, top: H }));
      const held = rootName(key + 4, fl);
      return comp(s, ccs, { title: t(`The Coltrane link: ${held} held — the 3rd of ${ccs[0].name}, the ♯5 of ${ccs[1].name}, the root of ${ccs[2].name}`, `החיבור לקולטריין: ${held} נשאר — הטרצה של ${ccs[0].name}, ה־♯5 של ${ccs[1].name}, היסוד של ${ccs[2].name}`), keySig: SIG[key] });
    }
    case 'md-dbl': {
      // Doubly chromatic pairs: C – A♭m – C – E♭m – C, no tone in common (every voice moves).
      const chords = [tri(key, 0), tri(key, 8, true), tri(key, 0), tri(key, 3, true), tri(key, 0)];
      return vlPiano(s, { chords, type: 'triad', per: 2, lo: 55, hi: 79, tol: 1, title: t(`Doubly chromatic: ${chords.map((c) => c.name).join(' – ')}, no common tone`, `כרומטי כפול: ${chords.map((c) => c.name).join(' – ')}, בלי צליל משותף`), keySig: SIG[key], aim: 67 });
    }
    case 'md-oct': {
      const cyc: Triad[] = [...octatonicCycle(key), { root: key, minor: false }];
      const chords = cyc.map((x) => ({ root: x.root, q: (x.minor ? 'm' : 'M') as VLQuality, name: rootName(x.root, flatsOf(key)) + (x.minor ? 'm' : '') }));
      return vlPiano(s, { chords, type: 'triad', per: 2, lo: 55, hi: 79, tol: 1, title: t(`The octatonic cycle (R, P): ${chords.map((c) => c.name).join(' – ')}`, `המעגל האוקטטוני (R, ‏P): ${chords.map((c) => c.name).join(' – ')}`), keySig: SIG[key], aim: 67 });
    }
    case 'md-hex': {
      const cyc: Triad[] = [...hexatonicCycle(key), { root: key, minor: false }];
      const chords = cyc.map((x) => ({ root: x.root, q: (x.minor ? 'm' : 'M') as VLQuality, name: rootName(x.root, flatsOf(key)) + (x.minor ? 'm' : '') }));
      return vlPiano(s, { chords, type: 'triad', per: 2, lo: 55, hi: 79, tol: 1, title: t(`The hexatonic cycle (P, L): ${chords.map((c) => c.name).join(' – ')}, one voice a half step each time`, `המעגל ההקסטוני (P, L): ${chords.map((c) => c.name).join(' – ')}, קול אחד בחצי טון כל פעם`), keySig: SIG[key], aim: 67 });
    }
  }
  throw new Error(`Unknown k-mediant kind ${s.kind}`);
}

// ───────────────────────────── k-reharm 11–22: colour reharm devices ─────────────────────────────

export const COLOR_RH_KINDS = new Set(['rh-mi', 'rh-pedalpt', 'rh-planemel', 'rh-approach', 'rh-slip', 'rh-sus', 'rh-modern', 'rh-maj7s5']);
type Bar = [number, CtQ, number] | [number, CtQ, number, number];
const progCC = (key: number, bars: Bar[], lh: CC['lh'] = 'shell'): CC[] => bars.map(([d, q, beats, bass]) => ({ root: mod12(key + d), q, beats, name: nm(key, key + d, q) + (bass !== undefined ? `/${rootName(key + bass, flatsOf(key))}` : ''), lh, ...(bass !== undefined ? { bass: mod12(key + bass) } : {}) }));
/** The modal-interchange progressions (C.3), by option. */
export const MI_PROGS: { bars: Bar[]; en: string; he: string; minor?: boolean; top?: number }[] = [
  // 0: I – IV – iv(m6) – I with the tonic held on top (C is the 5th of F and of Fm6)
  { bars: [[0, 'M', 4], [5, 'M', 4], [5, 'm6', 4], [0, 'M', 4]], en: 'I – IV – iv – I, the tonic held on top', he: 'I – IV – iv – I, הטוניקה נשארת למעלה', top: 0 },
  // 1: the pop on-ramp ♭VI – ♭VII – I, twice
  { bars: [[8, 'M', 2], [10, 'M', 2], [0, 'M', 4], [8, 'M', 2], [10, 'M', 2], [0, 'M', 4]], en: '♭VI – ♭VII – I', he: '♭VI – ♭VII – I' },
  // 2: minor plagal endings: ivm6, ♭VImaj7, ♭VII7 straight to Imaj7
  { bars: [[0, 'maj7', 4], [5, 'm6', 4], [0, 'maj7', 4], [8, 'maj7', 4], [0, 'maj7', 4], [10, '7', 4], [0, 'maj7', 4]], en: 'minor plagal: ivm6, ♭VImaj7, ♭VII7 → Imaj7', he: 'פלגלית מינורית: ivm6, ♭VImaj7, ♭VII7 → Imaj7' },
  // 3: the Phrygian ♭IImaj7 and the backdoor ivm7 – ♭VII7
  { bars: [[0, 'maj7', 4], [1, 'maj7', 4], [0, 'maj7', 4], [5, 'm7', 2], [10, '7', 2], [0, 'maj7', 4]], en: '♭IImaj7 → I, and ivm7 – ♭VII7 → I', he: '♭IImaj7 → I, ו־ivm7 – ♭VII7 → I' },
  // 4: ii–V–I, then iiø7 – V7♭9 – Imaj7 (the ♭13 of the V is the 3rd of the minor tonic)
  { bars: [[2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4], [2, 'm7b5', 2], [7, '7b9', 2], [0, 'maj7', 4]], en: 'ii – V – I, then iiø7 – V7♭9 – Imaj7', he: 'ii – V – I, ואז iiø7 – V7♭9 – Imaj7' },
  // 5: Tadd Dameron's turnaround: Imaj7 – ♭IIImaj7 – ♭VImaj7 – ♭IImaj7
  { bars: [[0, 'maj7', 4], [3, 'maj7', 4], [8, 'maj7', 4], [1, 'maj7', 4], [0, 'maj7', 4]], en: "Tadd Dameron's turnaround: I – ♭III – ♭VI – ♭II (all maj7)", he: 'הטרנאראונד של טאד דמרון: I – ♭III – ♭VI – ♭II (כולם maj7)' },
  // 6: v m7 – I7 as a borrowed ii–V of IV, then iv
  { bars: [[7, 'm7', 2], [0, '7', 2], [5, 'maj7', 4], [5, 'm6', 4], [0, 'maj7', 4]], en: 'v m7 – I7 → IVmaj7 (Mixolydian), then ivm6 → I', he: 'v m7 – I7 → IVmaj7 (מיקסולידי), ואז ivm6 → I' },
  // 7: borrowing in minor: the Dorian IV7, ii m7, and the Picardy third
  { bars: [[0, 'm6', 4], [5, '7', 4], [0, 'm6', 4], [5, '7', 4], [2, 'm7', 2], [7, '7', 2], [0, '6', 4]], en: 'borrowing in minor: im6 – IV7 (Dorian), ii m7 – V7 – I6 (Picardy)', he: 'השאלה במינור: im6 – IV7 (דורי), ii m7 – V7 – I6 (פיקרדי)', minor: true },
];

function genColorReharm(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const kn = kName(key);
  const fl = flatsOf(key);
  const N = (d: number) => rootName(key + d, fl);
  switch (s.kind) {
    case 'rh-mi': {
      const p = MI_PROGS[op % MI_PROGS.length];
      let ccs = progCC(key, p.bars, p.top !== undefined || p.bars.every((b) => b[1] === 'M') ? 'root' : 'shell');
      if (p.top !== undefined) {
        const H = pin(key + p.top, 67);
        ccs = ccs.map((c) => ({ ...c, top: H }));
      }
      const kk = p.minor ? kName(key, true) : kn;
      return comp(s, ccs, { title: t(`Modal interchange in ${kk}: ${p.en}`, `השאלה מודאלית ב־${kk}: ${p.he}`), keySig: SIG[mod12(key + (p.minor ? 3 : 0))] });
    }
    case 'rh-pedalpt': {
      // Op 0: the dominant pedal (an intro tag): Dm7/G – F/G – A♭/G – G7 → Imaj7. Op 1: the tonic pedal: I – IV/I – V/I – I.
      const bars: Bar[] = op === 1 ? [[0, 'M', 4], [5, 'M', 4, 0], [7, 'M', 4, 0], [0, 'M', 4]] : [[2, 'm7', 4, 7], [5, 'M', 4, 7], [8, 'M', 4, 7], [7, '7', 4], [0, 'maj7', 4]];
      const ccs = progCC(key, bars, 'root');
      const ttl = op === 1 ? t(`Tonic pedal in ${kn}: ${ccs.map((c) => c.name).join(' – ')}`, `פדל טוניקה ב־${kn}: ${ccs.map((c) => c.name).join(' – ')}`) : t(`Dominant pedal into ${kn}: ${ccs.map((c) => c.name).join(' – ')}`, `פדל דומיננטה אל ${kn}: ${ccs.map((c) => c.name).join(' – ')}`);
      return comp(s, ccs, { title: ttl, keySig: SIG[key] });
    }
    case 'rh-planemel': {
      // Exact planing under a given melody (C.5): one shape under every note, the melody on top — maj7 drop 2 (root on
      // top), m7 drop 2, or a four-note quartal stack.
      const SHAPES: [number[], string, T2][] = [
        [[-13, -8, -5, 0], 'maj7', t('a maj7 drop-2 shape', 'צורת maj7 בדרופ 2')],
        [[-14, -9, -5, 0], 'm7', t('an m7 drop-2 shape', 'צורת m7 בדרופ 2')],
        [[-15, -10, -5, 0], '(4ths)', t('a four-note stack of 4ths', 'ערימה של ארבע קוורטות')],
      ];
      const [shape, suf, nmT] = SHAPES[op % 3];
      const mel = [4, 2, 0, 9, 7, 9, 0, 4].map((d) => pin(key + d, 69));
      const ccs: CC[] = mel.map((m) => ({ root: mod12(m), q: suf === 'm7' ? 'm7' : suf === 'maj7' ? 'maj7' : '7sus4', beats: 2, name: rootName(m, fl) + suf, rh: shape.slice(1).map((x) => m + x), lh: 'none' }));
      // The lowest note of each shape goes to the LH (drop 2 is a two-hand shape on the piano).
      const d = comp(s, ccs, { title: t(`Planing under a melody in ${kn}: ${nmT.en} under every note`, `פליינינג מתחת למנגינה ב־${kn}: ${nmT.he} מתחת לכל צליל`), keySig: SIG[key] });
      const notes = d.notes.slice();
      mel.forEach((m, i) => notes.push({ pitch: m + shape[0], beat: i * 2, dur: 2, hand: 'L', chordId: d.notes.find((n) => Math.abs(n.beat - i * 2) < 1e-6)?.chordId }));
      notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
      const sets = d.goal.chordSets!.map((cs, i) => ({ ...cs, required: [...new Set([...cs.required, mod12(mel[i] + shape[0])])].sort((a, b) => a - b), allowed: [...new Set([...cs.allowed, mod12(mel[i] + shape[0])])].sort((a, b) => a - b) }));
      return { ...d, notes, goal: { ...d.goal, chordSets: sets } };
    }
    case 'rh-approach': {
      // Every target voicing is approached from a half step above with the same voicing (planed approach, C.6 L2).
      const targets: [number, CtQ, number][] = [[0, 'maj7', 4], [9, 'm7', 9], [2, 'm7', 5], [7, '7', 5], [0, 'maj7', 4]];
      const ccs: CC[] = [];
      let prev: number[] | null = null;
      targets.forEach(([d, q, top], i) => {
        const root = mod12(key + d);
        const H = pin(key + top, 67);
        const pcs = [...new Set([...RHQ[q].map((x) => mod12(root + x)), mod12(H)])];
        const cands = closeShapes(pcs, H - 11, H).filter((v) => v[v.length - 1] === H && v.length === 4);
        const p0 = prev;
        const v = (cands.length ? cands : closeShapes(pcs.slice(0, 4), H - 11, H)).sort((a, b) => (p0 ? motionOf(p0, a) - motionOf(p0, b) : 0))[0];
        prev = v;
        if (i > 0) {
          // the approach: the target voicing a half step up, on beat 4 of the bar before
          const last = ccs[ccs.length - 1];
          last.beats = 3;
          ccs.push({ root: mod12(root + 1), q, beats: 1, name: nm(key, root + 1, q), rh: v.map((p) => p + 1), at: i * 4 - 1 });
        }
        ccs.push({ root, q, beats: 4, name: nm(key, root, q), rh: v, at: i * 4 });
      });
      return comp(s, ccs, { title: t(`Half-step approach chords in ${kn}: each chord's voicing a half step above, just before it`, `אקורדי גישה בחצי טון ב־${kn}: הקול של כל אקורד חצי טון מעליו, ממש לפניו`), keySig: SIG[key] });
    }
    case 'rh-slip': {
      // Side-slip comping on a dorian vamp (C.6 L4): the So What voicing on ii, up a half step and back.
      const r = mod12(key + 2);
      const so = [0, 5, 10, 15, 19];
      const v = (root: number) => so.slice(1).map((x) => pin(root, 50) + x);
      const hits: [number, number, number][] = [];
      [0, 0, 1, 0].forEach((up, bar) => {
        hits.push([bar * 4, 1.5, up], [bar * 4 + 1.5, 2.5, up]);
      });
      const ccs: CC[] = hits.map(([at, beats, up]) => ({ root: mod12(r + up), q: 'm7', beats, at, name: nm(key, r + up, 'm7'), rh: v(mod12(r + up)), lh: 'root' }));
      return comp(s, ccs, { title: t(`Side-slip in ${N(2)} dorian: the So What voicing up a half step to ${N(3)}m7 and back`, `החלקה הצידה ב־${N(2)} דורי: קול So What חצי טון למעלה אל ${N(3)}m7 וחזרה`), keySig: SIG[key] });
    }
    case 'rh-sus': {
      // The sus reharm of ii–V (C.9 L1): ii – V – I, then V9sus4 (IV/V) – V7♭9 – I.
      const bars: Bar[] = [[2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4], [5, 'M', 4, 7], [7, '7b9', 4], [0, 'maj7', 4]];
      const ccs = progCC(key, bars, 'root');
      return comp(s, ccs, { title: t(`The sus reharm in ${kn}: ii–V–I, then ${N(5)}/${N(7)} (= ${N(7)}9sus4) – ${N(7)}7♭9 – I`, `הרמון סאס ב־${kn}: ii–V–I, ואז ${N(5)}/${N(7)} (= ${N(7)}9sus4) – ${N(7)}7♭9 – I`), keySig: SIG[key] });
    }
    case 'rh-modern': {
      // Non-functional sequences (C.9 L2), original material: sus chords on a moving bass, then a maj7 chain.
      const bars: Bar[] = op === 1 ? [[0, 'maj7', 4], [9, 'maj7', 4], [8, 'maj7', 4], [3, 'maj7', 4], [0, 'maj7', 4]] : [[0, '7sus4', 4], [8, '7sus4', 4], [10, '7sus4', 4], [7, '7sus4', 4], [0, '7sus4', 4]];
      const ccs = progCC(key, bars, 'root');
      return comp(s, ccs, { title: op === 1 ? t(`A non-functional maj7 chain: ${ccs.map((c) => c.name).join(' – ')}`, `שרשרת maj7 לא פונקציונלית: ${ccs.map((c) => c.name).join(' – ')}`) : t(`A sus sequence on a moving bass: ${ccs.map((c) => c.name).join(' – ')}`, `רצף סאס על בס נע: ${ccs.map((c) => c.name).join(' – ')}`), keySig: SIG[key] });
    }
    case 'rh-maj7s5': {
      // maj7♯5 as a tonic colour (C.9 L3): Cmaj7 – Cmaj7♯5 (E/C: E G♯ B over C) – C6 – Cmaj7♯5; op 1 ii–V into it.
      const bars: Bar[] = op === 1 ? [[2, 'm7', 2], [7, '7', 2], [0, 'maj7#5', 4], [0, 'maj7', 4]] : [[0, 'maj7', 4], [0, 'maj7#5', 4], [0, '6', 4], [0, 'maj7#5', 4], [0, 'maj7', 4]];
      const ccs = progCC(key, bars, 'root').map((c) => (c.q === 'maj7#5' ? { ...c, name: spellHeld(c.root, 'maj7#5', c.root + 8, fl)!.sym } : c));
      return comp(s, ccs, { title: t(`maj7♯5 as a tonic colour in ${kn}: ${ccs.map((c) => c.name).join(' – ')}`, `maj7♯5 כצבע טוניקה ב־${kn}: ${ccs.map((c) => c.name).join(' – ')}`), keySig: SIG[key] });
    }
  }
  throw new Error(`Unknown colour reharm kind ${s.kind}`);
}

// ───────────────────────────── k-organ: organ comping (Goldings) ─────────────────────────────

const BLUES: number[] = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
function genOrgan(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const kn = kName(key);
  const fl = flatsOf(key);
  const buf = new Buf();
  const chart: string[] = [];
  let ttl: T2;
  let pads: number[] | null = null;
  const pad = (pcs: number[], lo: number, hi: number): number[] => {
    const cands = closeShapes(pcs, lo, hi);
    const p0 = pads;
    const v = cands.sort((a, b) => (p0 ? motionOf(p0, a) - motionOf(p0, b) : Math.abs(a[0] - 60) - Math.abs(b[0] - 60)))[0];
    pads = v;
    return v;
  };
  const walk = (root: number, next: number, bar: number, quarters: boolean, tones: number[]) => {
    const r = pin(root, 36);
    if (!quarters) {
      buf.add(bar * 4, 2, [{ pitch: r, hand: 'L' }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: r + 7, hand: 'L' }]);
      return;
    }
    const nr = pin(next, 36);
    const appr = nr > r + 4 ? nr - 1 : nr + 1;
    [r, r + tones[1], r + tones[2], appr].forEach((p, k) => buf.add(bar * 4 + k, 1, [{ pitch: p, hand: 'L' }]));
  };
  if (s.kind === 'org-walk' || s.kind === 'org-texture') {
    // Op 2: the minor blues (i m7, iv m7, ♭VI7 – V7); otherwise the dominant blues.
    const minor = s.kind === 'org-walk' && op === 2;
    const prog: [number, CtQ][] = minor
      ? [[0, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'], [8, '7'], [7, '7'], [0, 'm7'], [7, '7']]
      : BLUES.map((d) => [d, '7']);
    prog.forEach(([d, q], bar) => {
      const root = mod12(key + d);
      const next = mod12(key + prog[(bar + 1) % 12][0]);
      const m = q === 'm7';
      walk(root, next, bar, s.kind === 'org-walk' ? op >= 1 : true, m ? [0, 3, 7] : [0, 4, 7]);
      const full = s.kind === 'org-walk' || bar >= 8;
      const third = m ? 3 : 4;
      const pcs = full ? [third, 10, 2].map((x) => mod12(root + x)) : [third, 10].map((x) => mod12(root + x));
      const v = pad(s.kind === 'org-texture' && full ? [4, 9, 10, 2].map((x) => mod12(root + x)) : pcs, 58, 76);
      buf.add(bar * 4, 4, v.map((p) => ({ pitch: p, hand: 'R' as const })));
      chart.push(nm(key, root, q));
    });
    const kk = minor ? kName(key, true) : kn;
    ttl = s.kind === 'org-walk'
      ? t(`Organ ${minor ? 'minor ' : ''}blues in ${kk}: the LH walks ${op >= 1 ? 'in quarters' : 'in half notes'}, the RH holds a three-note pad`, `בלוז ${minor ? 'מינורי ' : ''}באורגן ב־${kk}: יד שמאל מהלכת ${op >= 1 ? 'ברבעים' : 'בחצאים'}, יד ימין מחזיקה משטח של שלושה צלילים`)
      : t(`Texture in ${kn}: a thin pad (3 and 7) under the soloist, full from bar 9`, `מרקם ב־${kn}: משטח דק (3 ו־7) מתחת לסולן, מלא מתיבה 9`);
  } else if (s.kind === 'org-inner') {
    // A held pad with one moving inner voice (the line cliché in the middle): i, then iv, each over two bars.
    const ROWS: [number, number[]][] = [[0, [0, 11, 10, 9]], [5, [0, 11, 10, 9]]];
    let bar = 0;
    for (const [d, line] of ROWS) {
      const root = mod12(key + d);
      for (let k = 0; k < 4; k++) {
        const half = k % 2;
        if (half === 0) walk(root, k === 2 ? mod12(key + (d === 0 ? 5 : 0)) : root, bar, true, [0, 3, 7]);
        const top = pin(root + 7, 67);
        const mid = pin(root + line[k], top - 11);
        const low = pin(root + 3, mid - 11 > 52 ? mid - 11 : 52);
        buf.add(bar * 4 + half * 2, 2, [{ pitch: Math.min(low, mid - 1), hand: 'R' }, { pitch: mid, hand: 'R' }, { pitch: top, hand: 'R' }]);
        if (half === 1) bar++;
      }
      chart.push(`${rootName(root, fl)}m ${rootName(root, fl)}m(maj7)`, `${rootName(root, fl)}m7 ${rootName(root, fl)}m6`);
    }
    ttl = t(`A pad with a moving inner voice: ${rootName(key, fl)}m and ${rootName(key + 5, fl)}m, the middle voice falls by half steps`, `משטח עם קול פנימי נע: ${rootName(key, fl)}m ו־${rootName(key + 5, fl)}m, הקול האמצעי יורד בחצאי טון`);
  } else {
    // org-ballad: the common-tone ladder on the top voice (C.1) — the 5th of I held over five chords.
    // Op 1: the 3rd of I held instead — Imaj7 (3), vi m7 (5), IVmaj7 (maj7), ♯i m7 (♭3), ♯IV7 (♭7), Imaj7.
    const hd = op === 1 ? 4 : 7;
    const H = pin(key + hd, 67);
    const steps: [number, CtQ][] = op === 1 ? [[0, 'maj7'], [9, 'm7'], [5, 'maj7'], [1, 'm7'], [6, '7'], [0, 'maj7']] : [[0, 'maj7'], [8, 'maj7'], [3, '6'], [4, 'm7'], [9, '7sus4'], [0, 'maj7']];
    steps.forEach(([d, q], bar) => {
      const c = spellHeld(key + d, q, key + hd, fl)!;
      const r = pin(c.root, 36);
      buf.add(bar * 4, 4, [{ pitch: r, hand: 'L' }]);
      const pcs = [...new Set([...RHQ[q].map((x) => mod12(c.root + x)), mod12(H)])];
      const cands = closeShapes(pcs.slice(0, 4), H - 11, H).filter((v) => v[v.length - 1] === H);
      const v = (cands.length ? cands : [[H - 7, H - 3, H]]).sort((a, b) => (pads ? motionOf(pads, a) - motionOf(pads, b) : 0))[0];
      pads = v;
      buf.add(bar * 4, 4, v.map((p) => ({ pitch: p, hand: 'R' as const })));
      chart.push(c.sym);
    });
    ttl = t(`Organ ballad in ${kn}: ${rootName(key + hd, fl)} held on top — ${chart.join(' – ')}`, `בלדה באורגן ב־${kn}: ${rootName(key + hd, fl)} נשאר למעלה — ${chart.join(' – ')}`);
  }
  const sp: DrillSpec = { ...s, key, hands: 'RL' };
  const d = pianoFinish(sp, buf, ttl, { evenness: false, hands: true }, s.kind === 'org-ballad' ? 56 : 80, 4, SIG[key]);
  return { ...d, chart, sound: 'tonewheel' };
}

/** The keys entry (generate.ts). */
export function genColor(s: DrillSpec): Drill {
  if (s.family === 'k-ctone') return genCtone(s);
  if (s.family === 'k-mediant') return genMediant(s);
  if (s.family === 'k-organ') return genOrgan(s);
  return genColorReharm(s);
}

// ───────────────────────────── keys catalogue ─────────────────────────────

type Row = { kind: string; ops: number[]; rating: number; en: string; he: string; tempo?: [number, number]; hands?: 'R' | 'RL' };
const T60: [number, number] = [60, 100];
export const CT_ROWS: Row[] = [
  { kind: 'ct-tri', ops: [0, 1], rating: 1050, en: 'One note, six triads: root, 3rd, 5th', he: 'צליל אחד, שישה משולשים: יסוד, טרצה, קווינטה' },
  { kind: 'ct-sev', ops: [0, 1], rating: 1200, en: 'One note, seven 7th chords', he: 'צליל אחד, שבעה ספטאקורדים' },
  { kind: 'ct-drop2', ops: [0, 1], rating: 1350, en: 'Drop 2 with the note on top, voice-led', he: 'דרופ 2 עם הצליל למעלה, בהובלת קולות' },
  { kind: 'ct-tens', ops: [0, 1], rating: 1500, en: 'The note as a tension: 9, 11, 13, ♭9, ♯11, ♭13, ♯9', he: 'הצליל כטנשן: 9, 11, 13, ♭9, ♯11, ♭13, ♯9' },
  { kind: 'ct-phrase', ops: [0, 1, 2], rating: 1650, en: 'A common-tone phrase in tempo', he: 'משפט בצליל משותף בטמפו' },
  { kind: 'ct-counter', ops: [0], rating: 1660, en: 'The counter-line: the bass walks, the note stays', he: 'הקו הנגדי: הבס הולך, הצליל נשאר' },
  { kind: 'ct-free', ops: [0], rating: 1800, en: 'Your choice: harmonize the note eight ways', he: 'הבחירה שלכם: שמונה הרמוניות לצליל אחד' },
];
export const MD_ROWS: Row[] = [
  { kind: 'md-tri', ops: [0], rating: 1250, en: 'Major-3rd mediants: the common tone held', he: 'מדיאנטות בטרצה גדולה: הצליל המשותף נשאר' },
  { kind: 'md-tri', ops: [1], rating: 1300, en: 'Minor-3rd mediants: the common tone held', he: 'מדיאנטות בטרצה קטנה: הצליל המשותף נשאר' },
  { kind: 'md-cycle', ops: [0, 1], rating: 1400, en: 'The augmented and minor-3rd cycles', he: 'המעגל המוגדל ומעגל הטרצות הקטנות' },
  { kind: 'md-dbl', ops: [0], rating: 1450, en: 'Doubly chromatic: no common tone', he: 'כרומטי כפול: בלי צליל משותף' },
  { kind: 'md-sev', ops: [0], rating: 1550, en: 'Mediant 7ths in drop 2', he: 'ספטאקורדי מדיאנטה בדרופ 2' },
  { kind: 'md-coltrane', ops: [0], rating: 1650, en: 'The Coltrane link: one note held through the cycle', he: 'החיבור לקולטריין: צליל אחד לאורך המעגל' },
  { kind: 'md-oct', ops: [0], rating: 1750, en: 'The octatonic cycle (P, R)', he: 'המעגל האוקטטוני (P, ‏R)' },
  { kind: 'md-hex', ops: [0], rating: 1800, en: 'The hexatonic cycle, voice-led', he: 'המעגל ההקסטוני, בהובלת קולות' },
];
export const ORG_ROWS: Row[] = [
  { kind: 'org-walk', ops: [0], rating: 1300, en: 'Organ blues: LH in half notes, a held RH pad', he: 'בלוז באורגן: יד שמאל בחצאים, משטח ביד ימין', tempo: [70, 130] },
  { kind: 'org-walk', ops: [1], rating: 1380, en: 'Organ blues: the LH walks in quarters', he: 'בלוז באורגן: יד שמאל מהלכת ברבעים', tempo: [80, 140] },
  { kind: 'org-inner', ops: [0], rating: 1450, en: 'A pad with a moving inner voice', he: 'משטח עם קול פנימי נע', tempo: [70, 120] },
  { kind: 'org-walk', ops: [2], rating: 1520, en: 'Organ minor blues: walk and pad', he: 'בלוז מינורי באורגן: ווקינג ומשטח', tempo: [80, 140] },
  { kind: 'org-texture', ops: [0], rating: 1600, en: 'Thin and full: texture under a soloist', he: 'דק ומלא: מרקם מתחת לסולן', tempo: [80, 140] },
  { kind: 'org-ballad', ops: [0], rating: 1700, en: 'Organ ballad on the common-tone ladder', he: 'בלדה באורגן על סולם הצליל המשותף', tempo: [50, 72] },
  { kind: 'org-ballad', ops: [1], rating: 1720, en: 'Organ ballad: the 3rd held on top', he: 'בלדה באורגן: הטרצה נשארת למעלה', tempo: [50, 72] },
];
/** k-reharm 11–22: [kind, options, rating, en, he] (levels numbered on from the existing ten). */
export const RH_ROWS: Row[] = [
  { kind: 'rh-mi', ops: [0, 1], rating: 1100, en: 'Borrowed from minor: iv under the held tonic, ♭VI – ♭VII – I', he: 'שאולים מהמינור: iv מתחת לטוניקה, ♭VI – ♭VII – I' },
  { kind: 'rh-pedalpt', ops: [0, 1], rating: 1350, en: 'Pedal point: the dominant pedal, the tonic pedal', he: 'פדל: פדל דומיננטה, פדל טוניקה' },
  { kind: 'rh-mi', ops: [2, 3], rating: 1450, en: 'Minor plagal: ivm6, ♭VI, ♭VII7, ♭IImaj7 → I', he: 'פלגלית מינורית: iv, ♭VI, ♭VII ו־♭II אל I' },
  { kind: 'rh-approach', ops: [0], rating: 1500, en: 'Half-step approach chords', he: 'אקורדי גישה בחצי טון' },
  { kind: 'rh-mi', ops: [4], rating: 1550, en: 'iiø7 – V7♭9 – Imaj7 in major', he: 'iiø7 – V7♭9 – I במז׳ור' },
  { kind: 'rh-sus', ops: [0], rating: 1560, en: 'The sus reharm of ii–V', he: 'הרמון הסאס של ii–V' },
  { kind: 'rh-mi', ops: [5, 6], rating: 1600, en: "Tadd Dameron's chords and the borrowed v m7", he: 'האקורדים של טאד דמרון וה־v m7 השאול' },
  { kind: 'rh-planemel', ops: [0, 1, 2], rating: 1650, en: 'Planing under a given melody', he: 'פליינינג מתחת למנגינה נתונה' },
  { kind: 'rh-modern', ops: [0, 1], rating: 1660, en: 'Non-functional sus and maj7 sequences', he: 'רצפי סאס ו־maj7 לא פונקציונליים' },
  { kind: 'rh-mi', ops: [7], rating: 1700, en: 'Borrowing in minor: Dorian IV7, the Picardy third', he: 'השאלה במינור: IV7 דורי, הטרצה הפיקרדית' },
  { kind: 'rh-slip', ops: [0], rating: 1710, en: 'Side-slip comping on a dorian vamp', he: 'ליווי בהחלקה הצידה על וואמפ דורי', tempo: [80, 140] },
  { kind: 'rh-maj7s5', ops: [0, 1], rating: 1750, en: 'maj7♯5: the lydian-augmented tonic colour', he: 'maj7♯5: צבע הטוניקה הלידי־מוגדל' },
];
/** The first new k-reharm level number. */
export const RH_FIRST = 11;

const famOf = (id: FamilyId, rows: Row[], from = 1): LevelDef[] =>
  rows.map((r, i): LevelDef => {
    const tempo = r.tempo ?? T60;
    return { id: `${id}-${from + i}`, level: from + i, title: t(r.en, r.he), specs: r.ops.map((o) => ({ family: id, kind: r.kind, hands: r.hands ?? 'RL', option: o, tempo: tempo[0] })), keys: CL_KEYS, tempo };
  });
export function ctoneFamily(): FamilyDef {
  return { id: 'k-ctone', title: t('One note, many chords', 'צליל אחד, הרבה אקורדים'), style: 'jazz', levels: famOf('k-ctone', CT_ROWS) };
}
export function mediantFamily(): FamilyDef {
  return { id: 'k-mediant', title: t('Chromatic mediants', 'מדיאנטות כרומטיות'), style: 'jazz', levels: famOf('k-mediant', MD_ROWS) };
}
export function organFamily(): FamilyDef {
  return { id: 'k-organ', title: t('Organ comping', 'ליווי באורגן'), style: 'jazz', levels: famOf('k-organ', ORG_ROWS) };
}
/** The new k-reharm levels (appended to the family in generate.ts). */
export const colorReharmLevels = (): LevelDef[] => famOf('k-reharm', RH_ROWS, RH_FIRST);

// ───────────────────────────── guitar: g-ctone, g-color ─────────────────────────────

/** A pitch of pc on string `str` between frets lo and lo + 11. */
const onString = (tu: Tuning, str: number, pc: number, lo = 0): number => tu.open[str - 1] + lo + mod12(pc - tu.open[str - 1] - lo);
/** A held-note item on the neck: the held note low on the string first, the octave above when nothing fits there. */
function heldTry(tu: Tuning, str: number, pc: number, lo: number, make: (H: number) => Drill): Drill {
  const H = onString(tu, str, pc, lo);
  let err: unknown;
  for (const h of [H, H + 12, H - 12]) {
    if (h - tu.open[str - 1] < 0 || h - tu.open[str - 1] > 15) continue;
    try {
      return make(h);
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

function genGCtone(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const hn = heldName(key);
  const fl = flatsOf(key);
  switch (s.kind) {
    case 'gct-tri':
      return heldTry(tu, 1, heldOf(key), 1, (H) => vlGuitar(s, tu, { chords: heldVL(key, 0, 'triads', CT_ORDER.triads[op % 2], H), type: 'triad', per: 4, lo: 40, hi: 88, tol: 3, strings: [3, 2, 1], title: t(`Hold ${hn} on string 1: six triads under it`, `${hn} על מיתר 1: שישה משולשים מתחתיו`), keySig: SIG[key] }));
    case 'gct-sev':
      return heldTry(tu, 1, heldOf(key), 2, (H) => vlGuitar(s, tu, { chords: heldVL(key, 0, 'sevenths', CT_ORDER.sevenths[op % 2], H), type: 'drop2', per: 4, lo: 40, hi: 88, tol: 4, strings: [4, 3, 2, 1], title: t(`Drop 2 on strings 4-3-2-1, ${hn} on top`, `דרופ 2 על מיתרים 4-3-2-1, ${hn} למעלה`), keySig: SIG[key] }));
    case 'gct-drop2b':
      return heldTry(tu, 2, heldOf(key), 2, (H) => vlGuitar(s, tu, { chords: heldVL(key, 0, 'sevenths', CT_ORDER.sevenths[op % 2], H), type: 'drop2', per: 4, lo: 40, hi: 88, tol: 4, strings: [5, 4, 3, 2], title: t(`Drop 2 on strings 5-4-3-2, ${hn} on top`, `דרופ 2 על מיתרים 5-4-3-2, ${hn} למעלה`), keySig: SIG[key] }));
    case 'gct-tens':
    case 'gct-phrase': {
      const list: [number, CtQ][] = s.kind === 'gct-tens' ? LADDER.tensions.slice(op === 1 ? 4 : 0, op === 1 ? 7 : 4) : CT_PHRASES[op % CT_PHRASES.length];
      const names: string[] = list.map(([iv, q]) => spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!.sym);
      /** Four notes (or three) under and including the held pitch, on one string set, one hand position. */
      const fitChord = (H: number, iv: number, q: CtQ): { s: number; f: number }[] | null => {
        const shape = TENSION_RH[q] ?? RHQ[q].slice().sort((a, b) => a - b);
        const top = shape[shape.length - 1];
        const close = shape.map((x) => H - (top - x));
        const pcs = [...new Set([...close.map(mod12), mod12(H)])];
        const four = [close, ...closeShapes(pcs, H - 24, H).filter((v) => v[v.length - 1] === H && v.length === 4)].map((v) => v.slice().sort((a, b) => a - b));
        const drops = four.map((v) => [v[2] - 12, v[0], v[1], v[3]].sort((a, b) => a - b));
        for (const v of [...four, ...drops]) {
          const f = fitOnSet(v, [4, 3, 2, 1], tu.id) ?? fitOnSet(v, [5, 4, 3, 2], tu.id);
          if (f) return f;
        }
        // three voices: the held note and the two most telling below it (3rd / 7th / the colour)
        const root = mod12(heldOf(key) - iv);
        const want = shape.slice(0, -1).map((x) => mod12(root + x)).filter((p) => p !== mod12(root)).slice(-2);
        for (const v of closeShapes([...want, mod12(H)], H - 12, H).filter((x) => x[x.length - 1] === H && x.length === 3)) {
          const f = fitOnSet(v, [3, 2, 1], tu.id) ?? fitOnSet(v, [4, 3, 2], tu.id);
          if (f) return f;
        }
        return null;
      };
      const H0 = onString(tu, 1, heldOf(key), 3);
      const Hs = [H0, H0 + 12, H0 - 12].filter((h) => h - tu.open[0] >= 0 && h - tu.open[0] <= 15);
      let fits: ({ s: number; f: number }[] | null)[] = [];
      for (const h of Hs) {
        fits = list.map(([iv, q]) => fitChord(h, iv, q));
        if (fits.every(Boolean)) break;
      }
      if (!fits.every(Boolean)) throw new Error(`g-ctone: no voicing for ${names.join(' ')}`);
      const evs: Ev[] = fits.map((fit, i) => ({ beat: i * 4, dur: 4, notes: fit!.map((x) => ({ s: x.s, f: x.f, tech: 'strum-down' as const, stroke: 'D' as const })) }));
      const ttl = s.kind === 'gct-tens' ? t(`${hn} as a tension on the neck: ${names.join(', ')}`, `${hn} כטנשן על הצוואר: ${names.join(', ')}`) : t(`A common-tone phrase on the neck: ${names.join(' – ')}`, `משפט בצליל משותף על הצוואר: ${names.join(' – ')}`);
      const d = gFinish({ ...s, key }, tu, evs, { title: ttl, bpm: 60, evenness: false, keySig: SIG[key] });
      return { ...d, chart: names };
    }
  }
  throw new Error(`Unknown g-ctone kind ${s.kind}`);
}

/** g-color progressions for the voice-leading grader: [semitones above the key, quality]. */
const GC_PROGS: Record<string, { chords: [number, VLQuality][]; type: VLType; strings: number[]; en: string; he: string; topTonic?: boolean; minor?: boolean }[]> = {
  'gmd-tri': [
    { chords: [[0, 'M'], [8, 'M'], [0, 'M'], [4, 'M'], [0, 'M']], type: 'triad', strings: [3, 2, 1], en: 'Major-3rd mediants on strings 3-2-1', he: 'מדיאנטות בטרצה גדולה על מיתרים 3-2-1' },
    { chords: [[0, 'M'], [9, 'M'], [0, 'M'], [3, 'M'], [0, 'M']], type: 'triad', strings: [3, 2, 1], en: 'Minor-3rd mediants on strings 3-2-1', he: 'מדיאנטות בטרצה קטנה על מיתרים 3-2-1' },
  ],
  'gmd-cycle': [
    { chords: [[0, 'M'], [4, 'M'], [8, 'M'], [0, 'M']], type: 'triad', strings: [3, 2, 1], en: 'The augmented cycle on strings 3-2-1', he: 'המעגל המוגדל על מיתרים 3-2-1' },
    { chords: [[0, 'M'], [3, 'M'], [6, 'M'], [9, 'M'], [0, 'M']], type: 'triad', strings: [4, 3, 2], en: 'The minor-3rd cycle on strings 4-3-2', he: 'מעגל הטרצות הקטנות על מיתרים 4-3-2' },
  ],
  'gmd-sev': [{ chords: [[0, 'maj7'], [8, 'maj7'], [0, 'maj7'], [4, 'maj7'], [0, 'maj7']], type: 'drop2', strings: [4, 3, 2, 1], en: 'Mediant maj7 chords in drop 2', he: 'אקורדי maj7 מדיאנטיים בדרופ 2' }],
  'gmi-tri': [{ chords: [[0, 'M'], [5, 'M'], [5, 'm'], [0, 'M']], type: 'triad', strings: [3, 2, 1], en: 'I – IV – iv – I, the tonic on top', he: 'I – IV – iv – I, הטוניקה למעלה', topTonic: true }],
  'gmi-pop': [{ chords: [[8, 'M'], [10, 'M'], [0, 'M'], [8, 'M'], [10, 'M'], [0, 'M']], type: 'triad', strings: [4, 3, 2], en: '♭VI – ♭VII – I on strings 4-3-2', he: '♭VI – ♭VII – I על מיתרים 4-3-2' }],
  'gmi-plagal': [{ chords: [[0, 'maj7'], [5, 'm6'], [0, 'maj7'], [8, 'maj7'], [0, 'maj7'], [10, '7'], [0, 'maj7']], type: 'drop2', strings: [4, 3, 2, 1], en: 'Minor plagal in drop 2: ivm6, ♭VImaj7, ♭VII7 → Imaj7', he: 'פלגלית מינורית בדרופ 2: ivm6, ♭VImaj7, ♭VII7 → Imaj7' }],
  'gmi-iio': [{ chords: [[2, 'm7'], [7, '7'], [0, 'maj7'], [2, 'm7b5'], [7, '7b9'], [0, 'maj7']], type: 'drop2', strings: [5, 4, 3, 2], en: 'ii–V–I, then iiø7 – V7♭9 – Imaj7, strings 5-4-3-2', he: 'ii–V–I, ואז iiø7 – V7♭9 – Imaj7, מיתרים 5-4-3-2' }],
  'gmi-tadd': [{ chords: [[0, 'maj7'], [3, 'maj7'], [8, 'maj7'], [1, 'maj7'], [0, 'maj7']], type: 'drop2', strings: [4, 3, 2, 1], en: "Tadd Dameron's turnaround in drop 2", he: 'הטרנאראונד של טאד דמרון בדרופ 2' }],
  'gmi-minor': [{ chords: [[0, 'm6'], [5, '7'], [0, 'm6'], [5, '7'], [2, 'm7'], [7, '7'], [0, '6']], type: 'drop2', strings: [4, 3, 2, 1], en: 'Borrowing in minor: im6 – IV7, ii m7 – V7 – I6 (Picardy)', he: 'השאלה במינור: im6 – IV7, ii m7 – V7 – I6 (פיקרדי)', minor: true }],
};

function genGColor(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const fl = flatsOf(key);
  const kn = kName(key);
  const list = GC_PROGS[s.kind];
  if (list) {
    const p = list[op % list.length];
    const kk = p.minor ? kName(key, true) : kn;
    const make = (top?: number) => {
      const chords: VLChord[] = p.chords.map(([d, q]) => ({ root: mod12(key + d), q, name: rootName(key + d, fl) + QUAL[q].label, ...(top !== undefined ? { melody: top } : {}) }));
      return vlGuitar(s, tu, { chords, type: p.type, per: p.type === 'triad' ? 2 : 4, lo: 40, hi: 88, tol: p.type === 'triad' ? 2 : 4, strings: p.strings, title: t(`${p.en} · ${kk}`, `${p.he} · ${kk}`), keySig: SIG[mod12(key + (p.minor ? 3 : 0))] });
    };
    return p.topTonic ? heldTry(tu, 1, key, 1, make) : make();
  }
  // Fixed shapes on strings 4-3-2-1 (planing, side-slip, sus): one drop-2 voicing moved or chosen per chord.
  const evs: Ev[] = [];
  const names: string[] = [];
  const shapeAt = (pitches: number[], beat: number, dur: number) => {
    const v = pitches.slice().sort((a, b) => a - b);
    const fit = fitOnSet(v, [4, 3, 2, 1], tu.id) ?? fitOnSet(v.map((p) => p - 12), [4, 3, 2, 1], tu.id) ?? fitOnSet(v.map((p) => p + 12), [4, 3, 2, 1], tu.id);
    if (!fit) throw new Error(`g-color: no fit for ${v.join(',')}`);
    evs.push({ beat, dur, notes: fit.map((x) => ({ s: x.s, f: x.f, tech: 'strum-down' as const, stroke: 'D' as const })) });
  };
  let ttl: T2;
  if (s.kind === 'gpl-melody') {
    // drop-2 maj7 shape (root on top) slid under a melody on string 1
    const mel = [4, 2, 0, 9, 7, 9, 0, 4].map((d) => onString(tu, 1, key + d, 3));
    mel.forEach((m, i) => {
      shapeAt([-13, -8, -5, 0].map((x) => m + x), i * 2, 2);
      names.push(rootName(m, fl) + 'maj7');
    });
    ttl = t(`Planing under a melody in ${kn}: one drop-2 maj7 shape under every note`, `פליינינג מתחת למנגינה ב־${kn}: צורת maj7 אחת בדרופ 2 מתחת לכל צליל`);
  } else if (s.kind === 'gss-slip') {
    const r = mod12(key + 2);
    const base = onString(tu, 1, r + 10, 3); // the 7th of the m7 on top
    [0, 0, 1, 0].forEach((up, bar) => {
      shapeAt([-17, -10, -7, 0].map((x) => base + up + x), bar * 4, 4);
      names.push(rootName(r + up, fl) + 'm7');
    });
    ttl = t(`Side-slip in ${rootName(r, fl)} dorian: the m7 shape up a half step and back`, `החלקה הצידה ב־${rootName(r, fl)} דורי: צורת ה־m7 חצי טון למעלה וחזרה`);
  } else {
    // gsus: ii–V–I, then IV/V – V7♭9 – I (drop 2, the 3rd / 9th voice-led on top)
    const steps: [number, number[], string][] = [
      [2, [3, 7, 10, 0], 'm7'],
      [7, [4, 7, 10, 0], '7'],
      [0, [4, 7, 11, 0], 'maj7'],
      [7, [5, 9, 0, 2], 'sus'],
      [7, [4, 7, 10, 1], '7♭9'],
      [0, [4, 7, 11, 0], 'maj7'],
    ];
    let prev: number[] | null = null;
    steps.forEach(([d, ints, q], i) => {
      const root = mod12(key + d);
      const pcs = ints.map((x) => mod12(root + x));
      const cands = closeShapes(pcs, 50, 79)
        .map((v) => [v[2] - 12, v[0], v[1], v[3]].sort((a, b) => a - b))
        .filter((v) => fitOnSet(v, [4, 3, 2, 1], tu.id));
      const p0 = prev;
      const v = cands.sort((a, b) => (p0 ? motionOf(p0, a) - motionOf(p0, b) : Math.abs(a[0] - 55) - Math.abs(b[0] - 55)))[0];
      prev = v;
      shapeAt(v, i * 4, 4);
      names.push(q === 'sus' ? `${rootName(key + 5, fl)}/${rootName(root, fl)}` : rootName(root, fl) + q);
    });
    ttl = t(`The sus reharm on the neck in ${kn}: ii–V–I, then ${names[3]} – ${names[4]} – I`, `הרמון הסאס על הצוואר ב־${kn}: ii–V–I, ואז ${names[3]} – ${names[4]} – I`);
  }
  const d = gFinish({ ...s, key }, tu, evs, { title: ttl, bpm: 60, evenness: false, keySig: SIG[key] });
  return { ...d, chart: chartOfAt(names, evs.map((e) => e.beat)) };
}

/** The guitar entry (guitar.ts). */
export function genGuitarColor(s: DrillSpec, tu: Tuning): Drill {
  return s.family === 'g-ctone' ? genGCtone(s, tu) : genGColor(s, tu);
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** Guitar rows: [kind, options, grade, en, he, sub]. */
export const GCT_ROWS: { kind: string; ops: number[]; grade: number; en: string; he: string; sub: string }[] = [
  { kind: 'gct-tri', ops: [0, 1], grade: 6, en: 'One note on string 1, six triads under it', he: 'צליל אחד על מיתר 1, שישה משולשים מתחתיו', sub: 'one chord a bar' },
  { kind: 'gct-sev', ops: [0, 1], grade: 6, en: 'Drop 2 under the note, strings 4-3-2-1', he: 'דרופ 2 מתחת לצליל, מיתרים 4-3-2-1', sub: 'one chord a bar' },
  { kind: 'gct-drop2b', ops: [0, 1], grade: 7, en: 'Drop 2 under the note, strings 5-4-3-2', he: 'דרופ 2 מתחת לצליל, מיתרים 5-4-3-2', sub: 'one chord a bar' },
  { kind: 'gct-tens', ops: [0, 1], grade: 8, en: 'The note as a tension on top', he: 'הצליל כטנשן למעלה', sub: 'one chord a bar' },
  { kind: 'gct-phrase', ops: [0, 1, 2], grade: 8, en: 'A common-tone phrase in tempo', he: 'משפט בצליל משותף בטמפו', sub: 'one chord a bar' },
];
export const GCOL_ROWS: { kind: string; ops: number[]; grade: number; en: string; he: string; sub: string }[] = [
  { kind: 'gmi-tri', ops: [0], grade: 5, en: 'Borrowed iv under the held tonic', he: 'iv שאול מתחת לטוניקה', sub: 'triads' },
  { kind: 'gmi-pop', ops: [0], grade: 5, en: '♭VI – ♭VII – I triads', he: 'משולשי ♭VI – ♭VII – I', sub: 'triads' },
  { kind: 'gmd-tri', ops: [0, 1], grade: 6, en: 'Chromatic mediants: the common tone held', he: 'מדיאנטות כרומטיות: הצליל המשותף נשאר', sub: 'triads' },
  { kind: 'gmd-cycle', ops: [0, 1], grade: 7, en: 'The augmented and minor-3rd cycles', he: 'המעגל המוגדל ומעגל הטרצות הקטנות', sub: 'triads' },
  { kind: 'gmd-sev', ops: [0], grade: 7, en: 'Mediant 7ths in drop 2', he: 'ספטאקורדי מדיאנטה בדרופ 2', sub: 'drop 2' },
  { kind: 'gmi-plagal', ops: [0], grade: 7, en: 'Minor plagal in drop 2', he: 'פלגלית מינורית בדרופ 2', sub: 'drop 2' },
  { kind: 'gmi-iio', ops: [0], grade: 7, en: 'iiø7 – V7♭9 – I in major', he: 'iiø7 – V7♭9 – I במז׳ור', sub: 'drop 2' },
  { kind: 'gmi-tadd', ops: [0], grade: 8, en: "Tadd Dameron's turnaround", he: 'הטרנאראונד של טאד דמרון', sub: 'drop 2' },
  { kind: 'gmi-minor', ops: [0], grade: 8, en: 'Borrowing in minor: Dorian IV7, Picardy', he: 'השאלה במינור: IV7 דורי, פיקרדי', sub: 'drop 2' },
  { kind: 'gpl-melody', ops: [0], grade: 8, en: 'Drop-2 planing under a melody', he: 'פליינינג בדרופ 2 מתחת למנגינה', sub: 'drop 2' },
  { kind: 'gss-slip', ops: [0], grade: 8, en: 'Side-slip comping', he: 'ליווי בהחלקה הצידה', sub: 'drop 2' },
  { kind: 'gsus', ops: [0], grade: 9, en: 'The sus reharm of ii–V', he: 'הרמון הסאס של ii–V', sub: 'drop 2' },
];
const gFam = (id: FamilyId, rows: typeof GCT_ROWS, LT: LTFn) => rows.map((r, i) => LT(id, i + 1, r.en, r.he, r.ops.map((o) => ({ family: id, kind: r.kind, hands: 'R' as const, instrument: 'guitar' as const, option: o, tempo: 60 })), CL_KEYS, [60, 100], r.sub, r.grade));
export function guitarCtoneFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  return fam('g-ctone', 'One note, many chords on guitar', 'צליל אחד, הרבה אקורדים בגיטרה', 'jazz', ['jazz'], gFam('g-ctone', GCT_ROWS, LT));
}
export function guitarColorFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  return fam('g-color', 'Colour harmony on guitar', 'הרמוניית צבע בגיטרה', 'jazz', ['jazz'], gFam('g-color', GCOL_ROWS, LT));
}

// ───────────────────────────── bass: b-counter ─────────────────────────────

/** The bass rows (b-counter 1–10). */
export const BC_ROWS: { kind: string; ops: number[]; rating: number; en: string; he: string; tempo: [number, number]; sub: string }[] = [
  { kind: 'bc-ctroots', ops: [0], rating: 1100, en: 'Roots under one held note', he: 'יסודות מתחת לצליל אחד שנשאר', tempo: [60, 100], sub: 'halves' },
  { kind: 'bc-mi', ops: [0, 1], rating: 1120, en: 'Roots of borrowed chords: iv, ♭VI, ♭VII', he: 'יסודות של אקורדים שאולים: iv, ♭VI, ♭VII', tempo: [60, 100], sub: 'halves' },
  { kind: 'bc-pedal', ops: [0, 1], rating: 1150, en: 'Hold the pedal: the tonic under moving chords', he: 'להחזיק את הפדל: הטוניקה מתחת לאקורדים שזזים', tempo: [60, 100], sub: 'whole and half notes' },
  { kind: 'bc-thirds', ops: [0, 1], rating: 1250, en: 'Roots by thirds: chromatic mediants', he: 'יסודות בטרצות: מדיאנטות כרומטיות', tempo: [60, 100], sub: 'halves' },
  { kind: 'bc-dompedal', ops: [0], rating: 1350, en: 'The dominant pedal into the tonic', he: 'פדל הדומיננטה אל הטוניקה', tempo: [60, 110], sub: 'quarters' },
  { kind: 'bc-plagal', ops: [0], rating: 1450, en: 'Walk the minor plagal endings', he: 'ווקינג על הסיומים הפלגליים המינוריים', tempo: [70, 140], sub: 'quarters' },
  { kind: 'bc-counter', ops: [0, 1], rating: 1500, en: 'The counter-line: your note renames the chord', he: 'הקו הנגדי: הצליל שלכם נותן לאקורד שם חדש', tempo: [60, 100], sub: 'halves' },
  { kind: 'bc-iio', ops: [0], rating: 1550, en: 'Walk iiø7 – V7♭9 – I in major', he: 'ווקינג על iiø7 – V7♭9 – I במז׳ור', tempo: [70, 140], sub: 'quarters' },
  { kind: 'bc-push', ops: [0], rating: 1560, en: 'The pedal with the "and" of 4 pushed', he: 'הפדל עם ה"וְ" של 4 דחוף', tempo: [70, 130], sub: 'quarters and pushes' },
  { kind: 'bc-ctwalk', ops: [0, 1], rating: 1650, en: 'Walk a common-tone phrase', he: 'ווקינג על משפט בצליל משותף', tempo: [70, 140], sub: 'quarters' },
];
/** A walking bar: root, two chord tones, a half step into the next root. */
function walkBar(R: (pc: number) => number, root: number, ints: number[], next: number, b0: number, beats = 4): BN[] {
  const r = R(root);
  const nr = R(next);
  const out: BN[] = [{ b: b0, d: 1, p: r, ct: true }];
  if (beats === 2) {
    out.push({ b: b0 + 1, d: 1, p: nr > r ? nr - 1 : nr + 1, ct: false });
    return out;
  }
  out.push({ b: b0 + 1, d: 1, p: r + ints[1], ct: true }, { b: b0 + 2, d: 1, p: r + ints[2], ct: true });
  out.push({ b: b0 + 3, d: 1, p: nr > r + ints[2] ? nr - 1 : nr + 1, ct: false });
  return out;
}
export function genBassCounter(s0: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const op = s.option ?? 0;
  const fl = flatsOf(key);
  const lo = Math.max(28, tu.open[tu.open.length - 1]);
  const R = (pc: number) => rootOf(tu, pc) < lo ? rootOf(tu, pc) + 12 : rootOf(tu, pc);
  const N = (d: number) => rootName(key + d, fl);
  const kn = kName(key);
  const halves = (ds: number[], chart: string[], en: string, he: string): Drill =>
    drillOf(s, tu, alt(ds.map((d, i) => ({ b: i * 2, d: 2, p: R(key + d), ct: true }))), { en, he, chart, evenness: false, keySig: SIG[key] });
  switch (s.kind) {
    case 'bc-ctroots': {
      const ch = LADDER.triads.map(([iv, q]) => spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!);
      const ds = ch.map((c) => mod12(c.root - key));
      return halves([...ds, ds[0]], [`${ch[0].sym} ${ch[1].sym}`, `${ch[2].sym} ${ch[3].sym}`, `${ch[4].sym} ${ch[5].sym}`, ch[0].sym], `Roots under a held ${heldName(key)}: ${ch.map((c) => c.sym).join(', ')}`, `יסודות מתחת ל־${heldName(key)}: ${ch.map((c) => c.sym).join(', ')}`);
    }
    case 'bc-mi': {
      if (op === 1) return halves([8, 10, 0, 0, 8, 10, 0, 0], [`${N(8)} ${N(10)}`, N(0), `${N(8)} ${N(10)}`, N(0)], `♭VI – ♭VII – I roots in ${kn}`, `יסודות ♭VI – ♭VII – I ב־${kn}`);
      return halves([0, 0, 5, 5, 5, 5, 0, 0], [N(0), N(5), `${N(5)}m6`, N(0)], `I – IV – iv – I roots in ${kn}: the bass stays, the chord darkens`, `יסודות I – IV – iv – I ב־${kn}: הבס נשאר, האקורד מחשיך`);
    }
    case 'bc-pedal': {
      const r = R(key);
      const per = op === 1 ? 2 : 4;
      const line: BN[] = Array.from({ length: 16 / per }, (_, i) => ({ b: i * per, d: per, p: r, ct: true }));
      return drillOf(s, tu, alt(line), { en: `Tonic pedal in ${kn}: hold ${N(0)} under ${N(0)} – ${N(5)}/${N(0)} – ${N(7)}/${N(0)} – ${N(0)}`, he: `פדל טוניקה ב־${kn}: להחזיק ${N(0)} מתחת ל־${N(0)} – ${N(5)}/${N(0)} – ${N(7)}/${N(0)} – ${N(0)}`, chart: [N(0), `${N(5)}/${N(0)}`, `${N(7)}/${N(0)}`, N(0)], evenness: false, keySig: SIG[key] });
    }
    case 'bc-thirds': {
      const ds = op === 1 ? [0, 3, 6, 9, 0] : [0, 4, 8, 0, 8, 4, 0];
      const line: BN[] = [];
      let prev = R(key);
      ds.forEach((d, i) => {
        const pc = mod12(key + d);
        const cands = [R(pc), R(pc) + 12].filter((p) => p <= tu.open[0] + 7);
        const p = cands.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))[0];
        prev = p;
        line.push({ b: i * 2, d: 2, p, ct: true });
      });
      const names = ds.map((d) => N(d));
      return drillOf(s, tu, alt(line), { en: `Roots by ${op === 1 ? 'minor' : 'major'} 3rds: ${names.join(' – ')}`, he: `יסודות ב${op === 1 ? 'טרצות קטנות' : 'טרצות גדולות'}: ${names.join(' – ')}`, chart: chartOfAt(names, ds.map((_, i) => i * 2)), evenness: false, keySig: SIG[key] });
    }
    case 'bc-dompedal': {
      const g = R(key + 7);
      const line: BN[] = [];
      for (let b = 0; b < 16; b++) line.push({ b, d: 1, p: g, ct: true });
      line.push({ b: 16, d: 4, p: R(key), ct: true });
      return drillOf(s, tu, alt(line), { en: `Dominant pedal into ${kn}: ${N(7)} under ${N(2)}m7/${N(7)} – ${N(5)}/${N(7)} – ${N(8)}/${N(7)} – ${N(7)}7`, he: `פדל דומיננטה אל ${kn}: ${N(7)} מתחת ל־${N(2)}m7/${N(7)} – ${N(5)}/${N(7)} – ${N(8)}/${N(7)} – ${N(7)}7`, chart: [`${N(2)}m7/${N(7)}`, `${N(5)}/${N(7)}`, `${N(8)}/${N(7)}`, `${N(7)}7`, `${N(0)}maj7`], evenness: true, keySig: SIG[key] });
    }
    case 'bc-plagal': {
      const prog: [number, number[], string][] = [[0, [0, 4, 7], 'maj7'], [5, [0, 3, 7], 'm6'], [0, [0, 4, 7], 'maj7'], [8, [0, 4, 7], 'maj7'], [0, [0, 4, 7], 'maj7'], [10, [0, 4, 7], '7'], [0, [0, 4, 7], 'maj7']];
      const line: BN[] = [];
      prog.forEach(([d, ints], i) => line.push(...walkBar(R, mod12(key + d), ints, mod12(key + prog[(i + 1) % prog.length][0]), i * 4)));
      return drillOf(s, tu, alt(line), { en: `Minor plagal walk in ${kn}: ivm6, ♭VImaj7, ♭VII7 → I`, he: `ווקינג פלגלי מינורי ב־${kn}: ivm6, ♭VImaj7, ♭VII7 → I`, chart: prog.map(([d, , q]) => N(d) + q), keySig: SIG[key] });
    }
    case 'bc-counter': {
      // C.8: the held note (the band's top voice) stays; the bass walks down by half steps and renames the chord.
      const names = counterLineNames(key, fl);
      const top = R(key) + 12;
      const ps = COUNTER_LINE.map((c) => top + c.bass);
      const line: BN[] = [...ps, R(key)].map((p, i) => ({ b: i * 2, d: i === ps.length ? 4 : 2, p, ct: true }));
      if (op === 1) {
        // quarters: each bass note twice, the last beat a half step into the next
        const q: BN[] = [];
        ps.forEach((p, i) => q.push({ b: i * 2, d: 1, p, ct: true }, { b: i * 2 + 1, d: 1, p: i === ps.length - 1 ? p + 2 : p, ct: i !== ps.length - 1 }));
        q.push({ b: ps.length * 2, d: 2, p: R(key), ct: true });
        return drillOf(s, tu, alt(q), { en: `The counter-line in quarters: ${names.join(' – ')}`, he: `הקו הנגדי ברבעים: ${names.join(' – ')}`, chart: chartOfAt([...names, names[0]], [...ps, 0].map((_, i) => i * 2)), evenness: true, keySig: SIG[key] });
      }
      return drillOf(s, tu, alt(line), { en: `The counter-line under a held ${N(0)}: ${names.join(' – ')} — your note renames the chord`, he: `הקו הנגדי מתחת ל־${N(0)} שנשאר: ${names.join(' – ')} — הצליל שלכם נותן לאקורד שם חדש`, chart: chartOfAt([...names, names[0]], line.map((n) => n.b)), evenness: false, keySig: SIG[key] });
    }
    case 'bc-iio': {
      const prog: [number, number[], string, number][] = [[2, [0, 3, 6], 'm7♭5', 2], [7, [0, 4, 7], '7♭9', 2], [0, [0, 4, 7], 'maj7', 4], [2, [0, 3, 7], 'm7', 2], [7, [0, 4, 7], '7', 2], [0, [0, 4, 7], 'maj7', 4]];
      const line: BN[] = [];
      let b = 0;
      prog.forEach(([d, ints, , beats], i) => {
        line.push(...walkBar(R, mod12(key + d), ints, mod12(key + prog[(i + 1) % prog.length][0]), b, beats));
        b += beats;
      });
      const names = prog.map(([d, , q]) => N(d) + q);
      return drillOf(s, tu, alt(line), { en: `Walk iiø7 – V7♭9 – I, then ii – V – I in ${kn}`, he: `ווקינג על iiø7 – V7♭9 – I, ואז ii – V – I ב־${kn}`, chart: [`${names[0]} ${names[1]}`, names[2], `${names[3]} ${names[4]}`, names[5]], keySig: SIG[key] });
    }
    case 'bc-push': {
      const g = R(key + 7);
      const line: BN[] = [];
      for (let bar = 0; bar < 4; bar++) {
        const b0 = bar * 4;
        if (bar === 0) line.push({ b: 0, d: 1, p: g, ct: true });
        line.push({ b: b0 + 1, d: 1, p: g, ct: true }, { b: b0 + 2, d: 1, p: g, ct: true }, { b: b0 + 3, d: 0.5, p: g + 1 > g + 7 ? g : g - 1, ct: false });
        line.push({ b: b0 + 3.5, d: bar === 3 ? 2.5 : 1.5, p: bar === 3 ? R(key) : g, ct: true });
      }
      return drillOf(s, tu, alt(line), { en: `The dominant pedal with a push: ${N(7)} on the beats, the next bar anticipated on the "and" of 4`, he: `פדל הדומיננטה עם דחיפה: ${N(7)} על הפעמות, התיבה הבאה מוקדמת ב"וְ" של 4`, chart: [`${N(2)}m7/${N(7)}`, `${N(5)}/${N(7)}`, `${N(8)}/${N(7)}`, `${N(7)}7`, N(0)], evenness: false, keySig: SIG[key] });
    }
    case 'bc-ctwalk': {
      const ph = CT_PHRASES[op % 2];
      const ch = ph.map(([iv, q]) => spellHeld(heldOf(key) - iv, q, heldOf(key), fl)!);
      const line: BN[] = [];
      ch.forEach((c, i) => {
        const ints = CT_Q[c.q].ints;
        line.push(...walkBar(R, c.root, [0, ints[1] % 12, ints[2] % 12], ch[(i + 1) % ch.length].root, i * 4));
      });
      return drillOf(s, tu, alt(line), { en: `Walk the common-tone phrase: ${ch.map((c) => c.sym).join(' – ')} (${heldName(key)} on top)`, he: `ווקינג על משפט הצליל המשותף: ${ch.map((c) => c.sym).join(' – ')} (${heldName(key)} למעלה)`, chart: ch.map((c) => c.sym), keySig: SIG[key] });
    }
  }
  throw new Error(`Unknown b-counter kind ${s.kind}`);
}
type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
export function bassCounterFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  return fam('b-counter', 'The bass reharmonizes', 'הבס מהרמן מחדש', BC_ROWS.map((r, i) => L('b-counter', i + 1, r.en, r.he, r.ops.map((o) => ({ family: 'b-counter' as BassFamilyId, kind: r.kind, hands: 'R' as const, instrument: 'bass' as const, option: o, tempo: r.tempo[0] })), CL_KEYS, r.tempo, r.sub)));
}

// ───────────────────────────── path ─────────────────────────────

/** Path difficulty of every new keys and bass level (path.ts KEYS_LEVEL_DIFF). Guitar levels sit by grade. */
export const COLOR_LEVEL_DIFF: Record<string, number> = {
  ...Object.fromEntries(CT_ROWS.map((r, i) => [`k-ctone-${i + 1}`, r.rating])),
  ...Object.fromEntries(MD_ROWS.map((r, i) => [`k-mediant-${i + 1}`, r.rating])),
  ...Object.fromEntries(ORG_ROWS.map((r, i) => [`k-organ-${i + 1}`, r.rating])),
  ...Object.fromEntries(RH_ROWS.map((r, i) => [`k-reharm-${RH_FIRST + i}`, r.rating])),
  ...Object.fromEntries(BC_ROWS.map((r, i) => [`b-counter-${i + 1}`, r.rating])),
};
/** Every new level id by instrument (lessons, tests, e2e). */
export const COLOR_LEVEL_IDS = {
  keys: [...CT_ROWS.map((_, i) => `k-ctone-${i + 1}`), ...MD_ROWS.map((_, i) => `k-mediant-${i + 1}`), ...ORG_ROWS.map((_, i) => `k-organ-${i + 1}`), ...RH_ROWS.map((_, i) => `k-reharm-${RH_FIRST + i}`)],
  guitar: [...GCT_ROWS.map((_, i) => `g-ctone-${i + 1}`), ...GCOL_ROWS.map((_, i) => `g-color-${i + 1}`)],
  bass: BC_ROWS.map((_, i) => `b-counter-${i + 1}`),
};
