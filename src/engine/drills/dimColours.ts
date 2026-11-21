// Colours of the diminished (docs/research/DIM-COLOURS.md, owner 2026-11-21): the k-dimcol piano family. One diminished
// chord, the dim of the key's V (on the C page B°7 = G7♭9 without its root), and every dominant colour one or two of its
// notes reach by a half step or a whole step, each resolving to its own tonic. All twelve keys; the item files under the
// key it is built on (tonic = the drill's key).
//
// Attribution (docs/BARRY-HARRIS-THEORY.md §1, §3, §10): only the half-step moves are Harris's — lower one note → a
// dominant 7th (the four brothers); raise one note → a minor 6th (the brother's 9th chord without its root). The
// whole-step and two-note moves are voicing arithmetic and are titled "colours", never Harris.
//
// Levels: 1 lower ½ (Harris) · 2 raise ½ (Harris) · 3 raise a whole step (7♭9) · 4–5 the two-note colours (the tritone
// pair's 7♭5 / 7♯5 / 13, then 13♭9 / 7sus4 / 7♯9; split so no piano family is under 7 levels) · 6 every move in drop 2 ·
// 7 the whole run on each brother. Each row has two takes: the moves (dim → colour, round the four), then the moves into
// the resolutions (dim → colour → its 6th chord). Close position first; drop 2 in level 6 and in the run.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import { isoLatin, itemIdOf, type FamilyDef, type LevelDef, type SpecTemplate } from './generate';
import { KEY_NAMES } from '../keyMoves';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const SIGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// ───────────────────────────── spelling ─────────────────────────────

const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
/** Names nobody writes for a chord root: they fall back to the plain key name (F♭7 → E7, C♭ → B). */
const ODD = new Set(['F♭', 'C♭', 'E♯', 'B♯']);

/** The note `steps` letters and `semis` semitones above a spelled note; a double accidental or an odd name → the plain name. */
export function spellUp(name: string, steps: number, semis: number): string {
  const li = LETTERS.indexOf(name[0]);
  const acc = name[1] === '♯' ? 1 : name[1] === '♭' ? -1 : 0;
  const pc = mod12(LETTER_PC[li] + acc + semis);
  const nl = (li + steps) % 7;
  const d = mod12(pc - LETTER_PC[nl] + 6) - 6;
  const out = d === 0 ? LETTERS[nl] : d === -1 ? `${LETTERS[nl]}♭` : d === 1 ? `${LETTERS[nl]}♯` : '';
  return !out || ODD.has(out) ? KEY_NAMES[pc] : out;
}
/** A degree of the key: `semis` above the tonic, `steps` letters up (in C, ♭II is (1, 1) → D♭). */
const deg = (key: number, semis: number, steps: number): string => spellUp(KEY_NAMES[mod12(key)], steps, semis);

// ───────────────────────────── the colours (DIM-COLOURS.md tables) ─────────────────────────────

export type ColourId = 'dom' | 'm6' | 'b9' | 'b5' | 's5' | 'c13' | 'c13b9' | 'sus4' | 's9';

interface ColourDef {
  id: ColourId;
  /** The moved notes of the diminished, relative to the colour's root: [semitones above the root, move]. */
  moves: [number, number][];
  /** The resulting chord (intervals above the root). */
  ints: number[];
  /** The chord symbol after the root's name. */
  label: string;
  /** Harris's move (a half step, one note): the only ones titled Barry Harris. */
  harris?: boolean;
  /** The root is a note of the diminished itself (7♯9), not one of the four brothers. */
  onDim?: boolean;
  en: string;
  he: string;
}

/**
 * Each colour on a brother root R (the diminished = R+1, R+4, R+7, R+10). The m6 is named on its own root (R+7): Dm6 is
 * G9 without its root (BARRY-HARRIS-THEORY §3), so it resolves where G7 does. The 7♯9 (F7♯9 from B°7) sits on a note of
 * the diminished: its root R is that note (the diminished = R, R+3, R+6, R+9).
 */
export const COLOURS: Record<ColourId, ColourDef> = {
  dom: { id: 'dom', moves: [[1, -1]], ints: [0, 4, 7, 10], label: '7', harris: true, en: 'lower one note a half step', he: 'מורידים צליל אחד בחצי טון' },
  m6: { id: 'm6', moves: [[1, 1]], ints: [2, 4, 7, 10], label: 'm6', harris: true, en: 'raise one note a half step', he: 'מעלים צליל אחד בחצי טון' },
  b9: { id: 'b9', moves: [[10, 2]], ints: [0, 1, 4, 7], label: '7♭9', en: 'raise one note a whole step — the 7♭9', he: 'מעלים צליל אחד בטון — ה־7♭9' },
  b5: { id: 'b5', moves: [[1, -1], [7, -1]], ints: [0, 4, 6, 10], label: '7♭5', en: 'the 7♭5 (tritone pair) — two notes a tritone apart, both down a half step', he: 'ה־7♭5 (זוג הטריטון) — שני צלילים במרחק טריטון, שניהם יורדים בחצי טון' },
  s5: { id: 's5', moves: [[1, -1], [7, 1]], ints: [0, 4, 8, 10], label: '7♯5', en: 'the 7♯5 — one note down a half step, the note a tritone away up a half step', he: 'ה־7♯5 — צליל אחד יורד בחצי טון, הצליל שבמרחק טריטון עולה בחצי טון' },
  c13: { id: 'c13', moves: [[1, -1], [7, 2]], ints: [0, 4, 9, 10], label: '13', en: 'the 13 — one note down a half step, the note a tritone away up a whole step', he: 'ה־13 — צליל אחד יורד בחצי טון, הצליל שבמרחק טריטון עולה בטון' },
  c13b9: { id: 'c13b9', moves: [[7, 2], [10, 2]], ints: [0, 1, 4, 9], label: '13♭9', en: 'the 13♭9 — two notes a minor 3rd apart, both up a whole step', he: 'ה־13♭9 — שני צלילים במרחק טרצה קטנה, שניהם עולים בטון' },
  sus4: { id: 'sus4', moves: [[1, -1], [4, 1]], ints: [0, 5, 7, 10], label: '7sus4', en: 'the 7sus4 — one note down a half step, the next note up a half step', he: 'ה־7sus4 — צליל אחד יורד בחצי טון, הצליל שמעליו עולה בחצי טון' },
  s9: { id: 's9', moves: [[6, -2], [9, 1]], ints: [0, 3, 4, 10], label: '7♯9', onDim: true, en: 'the 7♯9 — one note down a whole step, the next note up a half step', he: 'ה־7♯9 — צליל אחד יורד בטון, הצליל שמעליו עולה בחצי טון' },
};
/** The two-note rows of level 4, in the doc's order. */
export const TWO_NOTE: ColourId[] = ['b5', 's5', 'c13', 'c13b9', 'sus4', 's9'];
/** The whole run on one brother (level 6): every colour on that root (the 7♯9 is on the diminished's notes, so not here). */
export const RUN: ColourId[] = ['dom', 'm6', 'b9', 'b5', 's5', 'c13', 'c13b9', 'sus4'];

/** The four brothers of a key (V, ♭VII, ♭II, III: G7, B♭7, D♭7, E7 in C), spelled. */
export function brothers(key: number): { root: number; name: string }[] {
  return ([[7, 4], [10, 6], [1, 1], [4, 2]] as const).map(([s, st]) => ({ root: mod12(key + s), name: deg(key, s, st) }));
}
/** The diminished of the key's V (B°7 in C), its pitch classes and name. */
export function dimOf(key: number): { pcs: number[]; name: string } {
  const d = mod12(key + 11);
  return { pcs: [0, 3, 6, 9].map((x) => mod12(d + x)), name: `${deg(key, 11, 6)}°7` };
}

export interface ColourChord {
  colour: ColourId;
  /** The chord's root (pitch class; the m6 on its own root) and spelled name. */
  root: number;
  name: string;
  /** The chord's pitch classes (sorted). */
  pcs: number[];
  /** The notes of the diminished that move, and by how much. */
  moves: [number, number][];
  /** The 6th chord it resolves to (its own tonic, or the key's when `toKey`). */
  res: { root: number; name: string; pcs: number[] };
}

/** The four chords of a colour from the key's diminished (one per brother; the 7♯9 on the diminished's notes), checked. */
export function colourChords(key: number, colour: ColourId, toKey = false): ColourChord[] {
  const c = COLOURS[colour];
  const dim = dimOf(key);
  // the 7♯9's roots: the diminished's notes from the key's 4th degree (F, A♭, B, D in C)
  const roots = c.onDim ? ([[5, 3], [8, 5], [11, 6], [2, 1]] as const).map(([s, st]) => ({ root: mod12(key + s), name: deg(key, s, st) })) : brothers(key);
  return roots.map(({ root: R, name: rn }) => {
    const moves: [number, number][] = c.moves.map(([x, m]) => [mod12(R + x), m]);
    const moved = dim.pcs.map((p) => {
      const mv = moves.find(([q]) => q === p);
      return mod12(p + (mv ? mv[1] : 0));
    });
    const pcs = c.ints.map((x) => mod12(R + x)).sort((a, b) => a - b);
    const got = [...new Set(moved)].sort((a, b) => a - b);
    if (got.join() !== pcs.join()) throw new Error(`dimColours: ${colour} on ${rn} from ${dim.name} does not add up`);
    // the dominant this chord stands for (the m6 = its brother's 9th without the root) and its tonic, spelled from it
    const name = colour === 'm6' ? `${spellUp(rn, 4, 7)}m6` : `${rn}${c.label}`;
    const resRoot = toKey ? mod12(key) : mod12(R + 5);
    const resName = toKey ? KEY_NAMES[mod12(key)] : spellUp(rn, 3, 5);
    return { colour, root: colour === 'm6' ? mod12(R + 7) : R, name, pcs, moves, res: { root: resRoot, name: `${resName}6`, pcs: [0, 4, 7, 9].map((x) => mod12(resRoot + x)).sort((a, b) => a - b) } };
  });
}

// ───────────────────────────── voicings ─────────────────────────────

/** Close position: the chord's notes upward from `lo`. */
const closeFrom = (pcs: number[], lo: number): number[] => {
  const out: number[] = [];
  for (let p = lo; out.length < pcs.length; p++) if (pcs.includes(mod12(p))) out.push(p);
  return out;
};
/** Drop 2: the second voice from the top down an octave. */
const drop2 = (v: number[]): number[] => {
  const s = v.slice().sort((a, b) => a - b);
  const n = s.length;
  return [s[n - 2] - 12, ...s.slice(0, n - 2), s[n - 1]].sort((a, b) => a - b);
};
/** The diminished as the take starts: close B3–A♭4 (in C), or its drop 2 (B3 F4 A♭4 D5). */
const dimVoicing = (pcs: number[], d2: boolean): number[] => (d2 ? drop2(closeFrom(pcs, 62)) : closeFrom(pcs, 57));
/** Move the diminished's voices (by pitch class): the colour in the same voicing. */
const applyMoves = (v: number[], moves: [number, number][]): number[] =>
  v.map((p) => p + (moves.find(([q]) => q === mod12(p))?.[1] ?? 0)).sort((a, b) => a - b);
/** The resolution: the voicing of `pcs` (close or drop 2) with the least total motion from `prev`. */
function nearest(pcs: number[], prev: number[], d2: boolean): number[] {
  let best: number[] = [];
  let cost = Infinity;
  for (let lo = 50; lo <= 66; lo++) {
    if (!pcs.includes(mod12(lo))) continue;
    const c = closeFrom(pcs, lo);
    const v = d2 ? drop2(c) : c;
    const m = v.reduce((a, p, i) => a + Math.abs(p - prev[i]), 0) + Math.abs((v[0] + v[v.length - 1]) / 2 - 64) * 0.01;
    if (m < cost) {
      cost = m;
      best = v;
    }
  }
  return best;
}

// ───────────────────────────── items ─────────────────────────────

export const DC_KINDS = ['dc-lower', 'dc-raise', 'dc-whole', 'dc-two', 'dc-run'] as const;
/** Harris's half-step rows: the only kinds titled Barry Harris (keyFacet: role 'harris'). */
export const DC_HARRIS_KINDS = ['dc-lower', 'dc-raise'];

/** What an item plays: [chord name, voicing pitch classes, beats][] grouped into bars, plus its title. */
interface Plan {
  chords: { name: string; pcs: number[]; v: number[]; beats: number }[];
  title: T2;
}

/** The colour (and take) of an item. dc-two: option = row × 10 + take; the others: option = take (dc-run: the brother). */
export function dcColour(kind: string, option: number): { colour: ColourId; take: number } {
  if (kind === 'dc-lower') return { colour: 'dom', take: option };
  if (kind === 'dc-raise') return { colour: 'm6', take: option };
  if (kind === 'dc-whole') return { colour: 'b9', take: option };
  if (kind === 'dc-two') return { colour: TWO_NOTE[Math.floor(option / 10) % TWO_NOTE.length], take: option % 10 };
  throw new Error(`Unknown k-dimcol kind: ${kind}`);
}

function plan(s: DrillSpec): Plan {
  const key = mod12(s.key);
  const d2 = s.hands === 'RL';
  const op = s.option ?? 0;
  const dim = dimOf(key);
  const dv = dimVoicing(dim.pcs, d2);
  const chords: Plan['chords'] = [];
  const push = (name: string, pcs: number[], v: number[], beats: number) => chords.push({ name, pcs, v, beats });
  const voicing = d2 ? t('drop 2', 'דרופ 2') : t('close position', 'מצב צמוד');
  const tonic = KEY_NAMES[key];
  if (s.kind === 'dc-run') {
    // the whole run on one brother: the diminished → each colour → its tonic
    const j = op % 4;
    const run = RUN.map((c) => colourChords(key, c)[j]);
    for (const c of run) {
      push(dim.name, dim.pcs, dv, 1);
      const v = applyMoves(dv, c.moves);
      push(c.name, c.pcs, v, 1);
      push(c.res.name, c.res.pcs, nearest(c.res.pcs, v, d2), 2);
    }
    const b = brothers(key)[j];
    const res = run[0].res.name.replace(/6$/, '');
    return {
      chords,
      title: t(`Colours of ${dim.name}: the whole run on ${b.name} — every colour into ${res} · ${voicing.en}`, `הצבעים של ${dim.name}: הסבב המלא על ${b.name} — כל הצבעים אל ${res} · ${voicing.he}`),
    };
  }
  const { colour, take } = dcColour(s.kind, op);
  const def = COLOURS[colour];
  const cs = colourChords(key, colour, take === 2);
  for (const c of cs) {
    push(dim.name, dim.pcs, dv, 1);
    const v = applyMoves(dv, c.moves);
    push(c.name, c.pcs, v, 1);
    if (take >= 1) push(c.res.name, c.res.pcs, nearest(c.res.pcs, v, d2), 2);
  }
  if (take === 0) push(dim.name, dim.pcs, dv, 4);
  const names = cs.map((c) => c.name).join(', ');
  const takeT = take === 0 ? t('the moves', 'התנועות') : take === 2 ? t(`all into ${tonic}`, `כולם אל ${tonic}`) : t('each into its key', 'כל אחד אל הסולם שלו');
  const head = def.harris
    ? t(`Barry Harris: ${dim.name}, ${def.en} — ${names}`, `בארי האריס: ${dim.name}, ${def.he} — ${names}`)
    : t(`Colours of ${dim.name}: ${def.en} — ${names}`, `הצבעים של ${dim.name}: ${def.he} — ${names}`);
  return { chords, title: t(`${head.en} · ${takeT.en} · ${voicing.en}`, `${head.he} · ${takeT.he} · ${voicing.he}`) };
}

/** The chord names per 4-beat bar (the chart above the staff). */
function chartOf(chords: Plan['chords']): string[] {
  const bars: string[] = [];
  let beat = 0;
  for (const c of chords) {
    const b = Math.floor(beat / 4);
    bars[b] = bars[b] ? `${bars[b]} ${c.name}` : c.name;
    beat += c.beats;
  }
  return Array.from({ length: Math.ceil(beat / 4) }, (_, i) => bars[i] ?? '%');
}

/** A k-dimcol item: the voicings to play, each chord graded on its pitch classes (drop 2: the lowest voice in the LH). */
export function genDimColours(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const d2 = s.hands === 'RL';
  const p = plan({ ...s, key });
  const notes: ExpNote[] = [];
  const chordSets: NonNullable<DrillGoal['chordSets']> = [];
  let beat = 0;
  p.chords.forEach((c, k) => {
    const id = k + 1;
    c.v.forEach((pitch, i) => notes.push({ pitch, beat, dur: c.beats, hand: d2 && i === 0 ? 'L' : 'R', chordId: id, ...(i === c.v.length - 1 ? { accent: true } : {}) }));
    const req = [...new Set(c.pcs)].sort((a, b) => a - b);
    chordSets.push({ chordId: id, required: req, allowed: req.slice() });
    beat += c.beats;
  });
  return {
    spec: { ...s, key },
    itemId: itemIdOf({ ...s, key }),
    title: { en: p.title.en, he: isoLatin(p.title.he) },
    notes,
    beats: beat,
    meter: 4,
    keySig: SIGS[key],
    goal: { evenness: false, hands: d2, chordSets },
    startBpm: Math.round(s.tempo ?? 60),
    tonic: { key },
    chart: chartOf(p.chords),
  };
}

// ───────────────────────────── catalogue ─────────────────────────────

/** All twelve keys, round the cycle of 4ths. */
export const DC_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const TEMPO: [number, number] = [56, 92];

/** Level 4 / 5 items: both takes of the given two-note rows (close position). */
const twoNote = (rows: number[]): [string, number, boolean][] => rows.flatMap((r) => [['dc-two', r * 10, false], ['dc-two', r * 10 + 1, false]] as [string, number, boolean][]);

/** The levels: [en, he, items as [kind, option, drop 2?]]. */
const LEVELS: { en: string; he: string; items: [string, number, boolean][] }[] = [
  { en: 'Barry Harris: lower one note of the diminished a half step — the four dominants', he: 'בארי האריס: מורידים צליל אחד של המוקטן בחצי טון — ארבעת הדומיננטים', items: [['dc-lower', 0, false], ['dc-lower', 1, false], ['dc-lower', 2, false]] },
  { en: 'Barry Harris: raise one note of the diminished a half step — the four m6 chords', he: 'בארי האריס: מעלים צליל אחד של המוקטן בחצי טון — ארבעת אקורדי ה־m6', items: [['dc-raise', 0, false], ['dc-raise', 1, false]] },
  { en: 'Colours: raise one note of the diminished a whole step — the 7♭9', he: 'צבעים: מעלים צליל אחד של המוקטן בטון — ה־7♭9', items: [['dc-whole', 0, false], ['dc-whole', 1, false]] },
  { en: 'Colours: one note down a half step, the note a tritone away moves — 7♭5, 7♯5, 13', he: 'צבעים: צליל אחד יורד בחצי טון, הצליל שבמרחק טריטון זז — 7♭5, ‏7♯5, ‏13', items: twoNote([0, 1, 2]) },
  { en: 'Colours: two neighbouring notes move — 13♭9, the suspended 4th, 7♯9', he: 'צבעים: שני צלילים שכנים זזים — 13♭9, הקוורטה המושהית, ‏7♯9', items: twoNote([3, 4, 5]) },
  {
    en: 'Colours in drop 2: every move into its resolution',
    he: 'צבעים בדרופ 2: כל התנועות אל הפתרון',
    items: [['dc-lower', 1, true], ['dc-raise', 1, true], ['dc-whole', 1, true], ...TWO_NOTE.map((_, r) => ['dc-two', r * 10 + 1, true] as [string, number, boolean])],
  },
  { en: 'Colours: the whole run through the four brothers', he: 'צבעים: הסבב המלא דרך ארבעת האחים', items: [0, 1, 2, 3].flatMap((j) => [['dc-run', j, false], ['dc-run', j, true]] as [string, number, boolean][]) },
];

/** Every level's kinds (tests). */
export const DC_LEVEL_KINDS: string[][] = LEVELS.map((l) => [...new Set(l.items.map(([k]) => k))]);

/** k-dimcol: colours of the diminished at the piano (jazz; after the Barry Harris harmony levels). */
export function dimColourFamily(): FamilyDef {
  const fam: FamilyId = 'k-dimcol';
  const levels: LevelDef[] = LEVELS.map((lv, i) => ({
    id: `${fam}-${i + 1}`,
    level: i + 1,
    title: t(lv.en, lv.he),
    specs: lv.items.map(([kind, option, d2]): SpecTemplate => ({ family: fam, kind, hands: d2 ? 'RL' : 'R', option, tempo: TEMPO[0] })),
    keys: DC_KEYS,
    tempo: TEMPO,
  }));
  return { id: fam, title: t('Colours of the diminished', 'הצבעים של המוקטן'), style: 'jazz', levels };
}
