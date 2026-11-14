// Voice-leading drills (AUDIT-CONTENT-THEORY §ה.2, VL-1…VL-8): the k-vl piano family and the g-vl guitar family.
// Each item shows chord symbols and the first voicing; the learner chooses every next voicing (voiceLead.ts grades it).
// The written notes are the model path (the smallest total motion), shown on request and used by the microphone
// fallback on guitar. A timed take: one voicing per bar (per half bar around the cycle) on the click.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import { itemIdOf, type FamilyDef, type LevelDef, type SpecTemplate } from './generate';
import { finish, type Ev, type GuitarFamilyDef, type GuitarLevelDef } from './guitar';
import { type Tuning } from '../fretboard';
import { candidates, chordSymbol, fitOnSet, flatsFor, measuredOf, optimalPath, QUAL, typePcs, type VLChord, type VLGoal, type VLQuality, type VLType } from './voiceLead';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A progression: [semitones above the key, quality] per chord. */
type Prog = { name: string; chords: [number, VLQuality][] };
const P: Record<string, Prog> = {
  i_iv_v: { name: 'I–IV–V–I', chords: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']] },
  i_vi_iv_v: { name: 'I–vi–IV–V–I', chords: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M']] },
  pop: { name: 'I–V–vi–IV–I', chords: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M'], [0, 'M']] },
  ii_v_i: { name: 'ii–V–I', chords: [[2, 'm7'], [7, '7'], [0, 'maj7']] },
  turn: { name: 'I–vi–ii–V–I', chords: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [0, 'maj7']] },
  minor: { name: 'ii–V–i', chords: [[2, 'm7b5'], [7, '7'], [0, 'm6']] },
  minorSpread: { name: 'ii–V–i', chords: [[2, 'm7b5'], [7, '7b9'], [0, 'm6']] },
  cycle: { name: 'I–IV–vii–iii–vi–ii–V–I', chords: [[0, 'maj7'], [5, 'maj7'], [11, 'm7b5'], [4, 'm7'], [9, 'm7'], [2, 'm7'], [7, '7'], [0, 'maj7']] },
  chain: { name: 'ii–V ×3 → I', chords: [[2, 'm7'], [7, '7'], [0, 'm7'], [5, '7'], [10, 'm7'], [3, '7'], [8, 'maj7']] },
};

/** One item's recipe: progression, voicing type, how the first voicing starts, register and rules. */
interface Variant {
  prog: Prog;
  type: VLType;
  /** First voicing: the chord tone (index into the chord's tones, root = 0) at the bottom (`bottom`) or on top (`top`). */
  start: { bottom?: number; top?: number };
  bass?: boolean;
  lo: number;
  hi: number;
  /** Semitones above the smallest move accepted at each change. */
  tol: number;
  /** Beats per chord (4 = a bar, 2 = half a bar). */
  per: number;
  sevenToThree?: boolean;
  /** Melody (VL-7): semitones above the key, one per chord, sung on top. */
  melody?: number[];
  /** Guitar: the string set (low → high). */
  strings?: number[];
  /** Middle of the first voicing (MIDI); default by type. */
  aim?: number;
  en: string;
  he: string;
}

const V = (o: Partial<Variant> & Pick<Variant, 'prog' | 'type' | 'en' | 'he'>): Variant => ({ start: { bottom: 0 }, lo: 53, hi: 79, tol: 1, per: 4, ...o });
const INV_EN = ['root position', '1st inversion', '2nd inversion', '3rd inversion'];
const INV_HE = ['מצב יסודי', 'היפוך ראשון', 'היפוך שני', 'היפוך שלישי'];
const TOP_EN = ['root', '3rd', '5th', '7th'];
const TOP_HE = ['יסוד', 'טרצה', 'קווינטה', 'ספטימה'];

/** The piano items, per kind (option = index). */
export const VL_VARIANTS: Record<string, Variant[]> = {
  'vl-triads': [P.i_iv_v, P.i_vi_iv_v].flatMap((prog) =>
    [0, 1, 2].map((inv) => V({ prog, type: 'triad', start: { bottom: inv }, lo: 55, hi: 79, en: `${prog.name}, from ${INV_EN[inv]}`, he: `${prog.name}, מ${INV_HE[inv]}` })),
  ),
  'vl-bass': [
    ...[0, 1, 2].map((inv) => V({ prog: P.i_iv_v, type: 'triad', bass: true, start: { bottom: inv }, lo: 55, hi: 79, en: `I–IV–V–I over the bass, from ${INV_EN[inv]}`, he: `I–IV–V–I מעל הבס, מ${INV_HE[inv]}` })),
    V({ prog: P.i_vi_iv_v, type: 'triad', bass: true, start: { bottom: 1 }, lo: 55, hi: 79, en: 'I–vi–IV–V–I over the bass', he: 'I–vi–IV–V–I מעל הבס' }),
    V({ prog: P.pop, type: 'triad', bass: true, start: { bottom: 2 }, lo: 55, hi: 79, en: 'I–V–vi–IV–I over the bass', he: 'I–V–vi–IV–I מעל הבס' }),
  ],
  'vl-guide': [
    V({ prog: P.ii_v_i, type: 'guide', bass: true, start: { bottom: 1 }, lo: 52, hi: 76, sevenToThree: true, en: 'ii–V–I guide tones, 3rd below', he: 'צלילים מנחים ii–V–I, הטרצה למטה' }),
    V({ prog: P.ii_v_i, type: 'guide', bass: true, start: { bottom: 3 }, lo: 52, hi: 76, sevenToThree: true, en: 'ii–V–I guide tones, 7th below', he: 'צלילים מנחים ii–V–I, הספטימה למטה' }),
    V({ prog: P.turn, type: 'guide', bass: true, start: { bottom: 1 }, lo: 52, hi: 76, sevenToThree: true, en: 'I–vi–ii–V–I guide tones', he: 'צלילים מנחים I–vi–ii–V–I' }),
    V({ prog: P.minor, type: 'guide', bass: true, start: { bottom: 3 }, lo: 52, hi: 76, sevenToThree: true, en: 'Minor ii–V–i guide tones', he: 'צלילים מנחים ii–V–i מינורי' }),
  ],
  'vl-close7': [
    V({ prog: P.ii_v_i, type: 'close', start: { bottom: 0 }, tol: 2, sevenToThree: true, en: 'ii–V–I, from root position', he: 'ii–V–I, ממצב יסודי' }),
    V({ prog: P.ii_v_i, type: 'close', start: { bottom: 2 }, tol: 2, sevenToThree: true, en: 'ii–V–I, from 2nd inversion', he: 'ii–V–I, מהיפוך שני' }),
    V({ prog: P.turn, type: 'close', start: { bottom: 0 }, tol: 2, sevenToThree: true, en: 'I–vi–ii–V–I, from root position', he: 'I–vi–ii–V–I, ממצב יסודי' }),
    V({ prog: P.minor, type: 'close', start: { bottom: 0 }, tol: 2, sevenToThree: true, en: 'Minor ii–V–i, from root position', he: 'ii–V–i מינורי, ממצב יסודי' }),
  ],
  'vl-cycle': [
    V({ prog: P.cycle, type: 'close', start: { bottom: 0 }, lo: 46, aim: 68, tol: 2, per: 2, sevenToThree: true, en: 'The diatonic cycle, from root position', he: 'המעגל הדיאטוני, ממצב יסודי' }),
    V({ prog: P.cycle, type: 'close', start: { bottom: 2 }, lo: 46, aim: 68, tol: 2, per: 2, sevenToThree: true, en: 'The diatonic cycle, from 2nd inversion', he: 'המעגל הדיאטוני, מהיפוך שני' }),
    V({ prog: P.chain, type: 'close', start: { bottom: 0 }, lo: 46, aim: 68, tol: 2, per: 2, sevenToThree: true, en: 'ii–Vs down by whole steps', he: 'ii–V יורדים בטונים' }),
  ],
  'vl-drop2': [
    ...[0, 1, 2, 3].map((top) => V({ prog: P.ii_v_i, type: 'drop2', start: { top }, lo: 43, hi: 79, tol: 2, sevenToThree: true, en: `ii–V–I drop 2, ${TOP_EN[top]} on top`, he: `ii–V–I דרופ 2, ${TOP_HE[top]} למעלה` })),
    V({ prog: P.minor, type: 'drop2', start: { top: 0 }, lo: 43, hi: 79, tol: 2, sevenToThree: true, en: 'Minor ii–V–i drop 2', he: 'ii–V–i מינורי בדרופ 2' }),
  ],
  'vl-spread': [
    V({ prog: P.ii_v_i, type: 'spread', start: { top: 2 }, lo: 52, hi: 84, tol: 2, sevenToThree: true, en: 'ii–V–I spread: LH 1–7, RH 3–5–9', he: 'ii–V–I פרוס: שמאל 1–7, ימין 3–5–9' }),
    V({ prog: P.minorSpread, type: 'spread', start: { top: 2 }, lo: 52, hi: 84, tol: 2, sevenToThree: true, en: 'Minor ii–V–i spread', he: 'ii–V–i מינורי פרוס' }),
    V({ prog: P.turn, type: 'spread', start: { top: 2 }, lo: 52, hi: 84, tol: 2, sevenToThree: true, en: 'I–vi–ii–V–I spread', he: 'I–vi–ii–V–I פרוס' }),
  ],
  'vl-melody': [
    V({ prog: P.ii_v_i, type: 'close', bass: true, start: {}, lo: 53, hi: 81, tol: 2, melody: [5, 5, 4], en: 'ii–V–I under a melody (F F E)', he: 'ii–V–I מתחת למנגינה (פה פה מי)' }),
    V({ prog: P.ii_v_i, type: 'close', bass: true, start: {}, lo: 53, hi: 81, tol: 2, melody: [9, 11, 12], en: 'ii–V–I under a rising melody', he: 'ii–V–I מתחת למנגינה עולה' }),
    V({ prog: P.turn, type: 'close', bass: true, start: {}, lo: 53, hi: 81, tol: 2, melody: [4, 4, 5, 5, 4], en: 'I–vi–ii–V–I under a melody', he: 'I–vi–ii–V–I מתחת למנגינה' }),
    V({ prog: P.turn, type: 'close', bass: true, start: {}, lo: 53, hi: 81, tol: 2, melody: [7, 7, 9, 11, 12], en: 'I–vi–ii–V–I under a rising melody', he: 'I–vi–ii–V–I מתחת למנגינה עולה' }),
  ],
};

/** The guitar items: one string set each (MIDI grading checks the voicing fits it). */
export const GVL_VARIANTS: Record<string, Variant[]> = {
  'gvl-triads': [
    [3, 2, 1],
    [4, 3, 2],
  ].flatMap((strings) =>
    [P.i_iv_v, P.i_vi_iv_v].map((prog) => V({ prog, type: 'triad', strings, start: {}, lo: 40, hi: 88, en: `${prog.name} on strings ${strings.join('-')}`, he: `${prog.name} על מיתרים ${strings.join('-')}` })),
  ),
  'gvl-drop2': [
    V({ prog: P.ii_v_i, type: 'drop2', strings: [4, 3, 2, 1], start: {}, lo: 40, hi: 88, tol: 2, sevenToThree: true, en: 'ii–V–I drop 2 on strings 4-3-2-1', he: 'ii–V–I דרופ 2 על מיתרים 4-3-2-1' }),
    V({ prog: P.ii_v_i, type: 'drop2', strings: [5, 4, 3, 2], start: {}, lo: 40, hi: 88, tol: 2, sevenToThree: true, en: 'ii–V–I drop 2 on strings 5-4-3-2', he: 'ii–V–I דרופ 2 על מיתרים 5-4-3-2' }),
    V({ prog: P.turn, type: 'drop2', strings: [4, 3, 2, 1], start: {}, lo: 40, hi: 88, tol: 2, sevenToThree: true, en: 'I–vi–ii–V–I drop 2 on strings 4-3-2-1', he: 'I–vi–ii–V–I דרופ 2 על מיתרים 4-3-2-1' }),
  ],
  'gvl-drop3': [
    V({ prog: P.ii_v_i, type: 'drop3', strings: [6, 4, 3, 2], start: {}, lo: 40, hi: 88, tol: 2, sevenToThree: true, en: 'ii–V–I drop 3 on strings 6-4-3-2', he: 'ii–V–I דרופ 3 על מיתרים 6-4-3-2' }),
    V({ prog: P.ii_v_i, type: 'drop3', strings: [5, 3, 2, 1], start: {}, lo: 40, hi: 88, tol: 2, sevenToThree: true, en: 'ii–V–I drop 3 on strings 5-3-2-1', he: 'ii–V–I דרופ 3 על מיתרים 5-3-2-1' }),
  ],
};

const variantOf = (s: DrillSpec): Variant => {
  const list = (s.family === 'g-vl' ? GVL_VARIANTS : VL_VARIANTS)[s.kind];
  if (!list) throw new Error(`Unknown voice-leading drill: ${s.kind}`);
  return list[(s.option ?? 0) % list.length];
};

/** The chords of an item in its key (melody notes placed near the middle of the register, by step). */
function chordsOf(v: Variant, key: number): VLChord[] {
  let mel = 72;
  return v.prog.chords.map(([d, q], i) => {
    const c: VLChord = { root: mod12(key + d), q };
    if (v.melody) {
      const pc = mod12(key + v.melody[i]);
      const cands = [-12, 0, 12].map((o) => mel - 6 + mod12(pc - (mel - 6)) + o).filter((p) => p >= 67 && p <= 79);
      mel = cands.sort((a, b) => Math.abs(a - mel) - Math.abs(b - mel))[0] ?? mel;
      c.melody = mel;
    }
    return c;
  });
}

/** The written first voicing: the candidate with the asked chord tone at the bottom / on top, nearest the middle (guitar: nearest fret 5). */
function firstVoicing(v: Variant, c: VLChord, g: VLGoal, tuning?: string): number[] {
  const all = candidates(c, g);
  const tones = (v.type === 'triad' ? QUAL[c.q].ints.slice(0, 3) : QUAL[c.q].ints).map((i) => mod12(c.root + i));
  const want = all.filter((x) => {
    const m = measuredOf(x, v.type);
    if (v.start.bottom !== undefined) return mod12(m[0]) === tones[v.start.bottom % tones.length];
    if (v.start.top !== undefined) return mod12(m[m.length - 1]) === tones[v.start.top % tones.length];
    return true;
  });
  const pool = want.length ? want : all;
  const mid = (v.lo + v.hi) / 2;
  const score = (x: number[]): number => {
    if (v.strings) {
      const f = fitOnSet(x, v.strings, tuning);
      return f ? Math.abs(Math.min(...f.map((p) => p.f)) - 5) : 99;
    }
    const m = measuredOf(x, v.type);
    return Math.abs((m[0] + m[m.length - 1]) / 2 - (v.aim ?? (v.type === 'triad' ? 66 : v.type === 'guide' ? 62 : v.type === 'drop2' ? 60 : mid)));
  };
  return pool.slice().sort((a, b) => score(a) - score(b))[0];
}

/** The goal and the model path of an item. */
export function vlPlan(s: DrillSpec, tuning?: string): { v: Variant; goal: VLGoal; path: number[][]; chords: VLChord[] } {
  const v = variantOf(s);
  const key = mod12(s.key);
  const minor = v.prog === P.minor || v.prog === P.minorSpread;
  const chords = chordsOf(v, key);
  const base: VLGoal = {
    chords,
    at: chords.map((_, i) => i * v.per),
    type: v.type,
    tol: v.tol,
    lo: v.lo,
    hi: v.hi,
    flats: flatsFor(key, minor),
    ...(v.bass ? { bass: true } : {}),
    ...(v.sevenToThree ? { sevenToThree: true } : {}),
    ...(v.strings ? { strings: [v.strings], tuning: tuning ?? 'standard' } : {}),
  };
  const goal: VLGoal = { ...base, first: firstVoicing(v, chords[0], base, tuning) };
  return { v, goal, path: optimalPath(goal), chords };
}

/** The chord symbols per bar (two to a bar around the cycle). */
function chartOf(goal: VLGoal, meter = 4): string[] {
  const bars: string[] = [];
  goal.chords.forEach((c, i) => {
    const b = Math.floor(goal.at[i] / meter + 1e-6);
    bars[b] = bars[b] ? `${bars[b]} ${chordSymbol(c, goal.flats)}` : chordSymbol(c, goal.flats);
  });
  return bars.map((x) => x ?? '%');
}

const keyTitle = (key: number, minor: boolean, flats: boolean): string => (flats ? ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] : ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'])[mod12(key)] + (minor ? 'm' : '');

/** A piano voice-leading item. */
export function genVoiceLead(s: DrillSpec): Drill {
  const { v, goal, path } = vlPlan(s);
  const key = mod12(s.key);
  const minor = v.prog === P.minor || v.prog === P.minorSpread;
  const notes: ExpNote[] = [];
  let bassPrev = 48;
  path.forEach((full, k) => {
    const beat = goal.at[k];
    const id = k + 1;
    const sorted = full.slice().sort((a, b) => a - b);
    sorted.forEach((p, j) => {
      const lh = (v.type === 'drop2' || v.type === 'drop3') ? j === 0 : v.type === 'spread' ? j < 2 : false;
      notes.push({ pitch: p, beat, dur: v.per, hand: lh ? 'L' : 'R', chordId: id, ...(goal.chords[k].melody === p ? { accent: true } : {}) });
    });
    if (v.bass) {
      const r = goal.chords[k].root;
      const opts = [36, 48].map((o) => o + mod12(r - o)).filter((p) => p >= 40 && p <= 55 && p < sorted[0]);
      const b = (opts.length ? opts : [36 + mod12(r - 36)]).sort((a, c) => Math.abs(a - bassPrev) - Math.abs(c - bassPrev))[0];
      bassPrev = b;
      notes.push({ pitch: b, beat, dur: v.per, hand: 'L', chordId: id });
    }
  });
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const chordSets: NonNullable<DrillGoal['chordSets']> = goal.chords.map((c, k) => {
    const pcs = v.type === 'spread' ? [0, QUAL[c.q].spread!.low, ...QUAL[c.q].spread!.upper[0]].map((i) => mod12(c.root + i)) : typePcs(c, v.type);
    const req = [...new Set([...pcs, ...(v.bass ? [c.root] : [])])].sort((a, b) => a - b);
    const all = v.type === 'spread' ? [...new Set([...req, ...QUAL[c.q].spread!.upper.flat().map((i) => mod12(c.root + i))])].sort((a, b) => a - b) : req;
    return { chordId: k + 1, required: req, allowed: all };
  });
  const kn = keyTitle(key, minor, goal.flats ?? true);
  return {
    spec: { ...s, key },
    itemId: itemIdOf({ ...s, key }),
    title: t(`${v.en} · ${kn}`, `${v.he} · ${kn}`),
    notes,
    beats: goal.at[goal.at.length - 1] + v.per,
    meter: 4,
    keySig: SIG[mod12(key + (minor ? 3 : 0))],
    goal: { evenness: false, hands: s.hands === 'RL', chordSets, vl: goal },
    startBpm: Math.round(s.tempo ?? 60),
    chart: chartOf(goal),
  };
}

/** A guitar voice-leading item: the model path as tab; the first chord written, then the chart (free choice). */
export function generateGuitarVL(s: DrillSpec, tu: Tuning): Drill {
  const { v, goal, path } = vlPlan(s, tu.id);
  const key = mod12(s.key);
  const evs: Ev[] = path.map((full, k) => {
    const fit = fitOnSet(full, v.strings!, tu.id)!;
    return { beat: goal.at[k], dur: v.per, notes: fit.map((x) => ({ s: x.s, f: x.f, tech: 'strum-down' as const, stroke: 'D' as const })) };
  });
  const kn = keyTitle(key, false, goal.flats ?? true);
  const d = finish(s, tu, evs, { title: t(`${v.en} · ${kn}`, `${v.he} · ${kn}`), bpm: 60, evenness: false, goal: { vl: goal } });
  return { ...d, chart: chartOf(goal), show: 'chart', freeFrom: v.per };
}

// ───────────────────────────── catalogue ─────────────────────────────

const CYC4 = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** k-vl: voice leading at the piano, VL-1 … VL-7 (path difficulty ~900 → 1400: KEYS_LATER 'k-vl'). */
export function pianoVoiceLeadFamily(): FamilyDef {
  const fam: FamilyId = 'k-vl';
  const S = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys, tempo });
  const opts = (kind: string, n: number, o: Partial<SpecTemplate> = {}) => range(n).map((i) => S(kind, { option: i, ...o }));
  return {
    id: fam,
    title: t('Voice leading', 'הובלת קולות'),
    style: 'both',
    levels: [
      L(1, 'Triads to the nearest inversion', 'משולשים להיפוך הקרוב', opts('vl-triads', 6), [0, 7, 5, 2, 10, 9], [60, 100]),
      L(2, 'Triads over a bass, every key', 'משולשים מעל בס, בכל הסולמות', opts('vl-bass', 5, { hands: 'RL' }), FIFTHS, [60, 100]),
      L(3, 'Guide tones: the 7th falls to the 3rd', 'צלילים מנחים: הספטימה יורדת לטרצה', opts('vl-guide', 4, { hands: 'RL' }), CYC4, [60, 100]),
      L(4, 'Close-position 7th chords', 'ספטאקורדים במצב צמוד', opts('vl-close7', 4), CYC4, [60, 96]),
      L(5, 'Around the cycle of 5ths', 'במעגל הקווינטות', opts('vl-cycle', 3), CYC4, [50, 84]),
      L(6, 'Drop 2 through ii–V–I', 'דרופ 2 לאורך ii–V–I', opts('vl-drop2', 5, { hands: 'RL' }), CYC4, [60, 96]),
      L(7, 'Spread voicings in two hands', 'קולות פרוסים בשתי ידיים', opts('vl-spread', 3, { hands: 'RL' }), CYC4, [60, 96]),
      L(8, 'Harmonise a melody: it stays on top', 'הרמוניזציה למנגינה: היא נשארת למעלה', opts('vl-melody', 4, { hands: 'RL' }), [0, 5, 7, 10, 3, 2], [56, 90]),
    ],
  };
}

/** g-vl: voice leading on the neck (VL-8): triads on string sets, then drop 2 and drop 3, by semitones not frets. */
export function guitarVoiceLeadFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-vl';
  const S = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[], tempo: [number, number], grade: number): GuitarLevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys, tempo, sub: 'one voicing a bar', grade });
  const opts = (kind: string, n: number) => range(n).map((i) => S(kind, { option: i }));
  return {
    id: fam,
    title: t('Voice leading on the neck', 'הובלת קולות על הצוואר'),
    style: 'classical',
    genres: ['all'],
    instruments: ['guitar'],
    levels: [
      L(1, 'Triads on string sets 3-2-1 and 4-3-2', 'משולשים על סטי מיתרים 3-2-1 ו-4-3-2', opts('gvl-triads', 4), [7, 2, 9, 4, 0, 5], [60, 100], 4),
      L(2, 'Drop 2 by step: strings 4-3-2-1 and 5-4-3-2', 'דרופ 2 בצעדים: מיתרים 4-3-2-1 ו-5-4-3-2', opts('gvl-drop2', 3), CYC4, [60, 96], 6),
      L(3, 'Drop 3 by step: strings 6-4-3-2 and 5-3-2-1', 'דרופ 3 בצעדים: מיתרים 6-4-3-2 ו-5-3-2-1', opts('gvl-drop3', 2), CYC4, [60, 96], 7),
    ],
  };
}
