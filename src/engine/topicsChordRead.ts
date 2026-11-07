// Read the chord (0.38): a chord drawn on the keys, the staff or a guitar picture — name it fast. Pure and seeded:
// every item rebuilds from (topic, level, seed). The four options are plausible confusions: the same root with
// another quality, a chord sharing most notes, a neighbour root, another inversion.

import type { ChoiceQuestion, Diagram, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { TUNINGS, OPEN_CHORDS, boxPicture, cagedShape, dropVoicing, midisAt, parseShape, shiftShape, triadVoicings, CAGED, type FretShape, type NeckPos, type SeventhKind } from './fretboard';

const STD = TUNINGS[0];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

// ---------------------------------------------------------------- spelled names

interface Sp {
  l: number; // letter index C=0 … B=6
  a: number; // accidental −2 … +2
}
const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT = [0, 2, 4, 5, 7, 9, 11];
const HE_LET = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const ACC_EN: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
const ACC_HE: Record<number, string> = { [-2]: ' במול כפול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דיאז כפול' };
const ACC_SAY: Record<number, string> = { [-2]: ' double flat', [-1]: ' flat', 0: '', 1: ' sharp', 2: ' double sharp' };
const spEn = (s: Sp) => LET[s.l] + ACC_EN[s.a];
const spHe = (s: Sp) => HE_LET[s.l] + ACC_HE[s.a];
const spSay = (s: Sp) => LET[s.l] + ACC_SAY[s.a];
const spPc = (s: Sp) => mod12(NAT[s.l] + s.a);
const S = (l: number, a = 0): Sp => ({ l, a });
/** The root name for each pitch class (as chord symbols are usually written). */
const ROOTS: Sp[] = [S(0), S(1, -1), S(1), S(2, -1), S(2), S(3), S(3, 1), S(4), S(5, -1), S(5), S(6, -1), S(6)];
/** How the staff (no key signature) spells a pitch class: flats. */
const FLAT_SP: Sp[] = [S(0), S(1, -1), S(1), S(2, -1), S(2), S(3), S(4, -1), S(4), S(5, -1), S(5), S(6, -1), S(6)];

// ---------------------------------------------------------------- chord qualities

export type QId = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'dom7' | 'm7' | 'm7b5' | 'dim7' | 'dom9' | 'add9' | 'maj9' | 'm9' | 'sus4' | 'sus2' | 'six' | 'dom11' | 'dom13';
interface QDef {
  /** Semitones above the root, in root-position order (bottom → top). */
  ivs: number[];
  /** Letter steps above the root letter (a third = 2) — for spelling. */
  steps: number[];
  en: string;
  he: string;
  say: string[];
}
const Q: Record<QId, QDef> = {
  maj: { ivs: [0, 4, 7], steps: [0, 2, 4], en: '', he: 'מז׳ור', say: ['major'] },
  min: { ivs: [0, 3, 7], steps: [0, 2, 4], en: 'm', he: 'מינור', say: ['minor'] },
  dim: { ivs: [0, 3, 6], steps: [0, 2, 4], en: '°', he: 'מוקטן', say: ['diminished', 'dim'] },
  aug: { ivs: [0, 4, 8], steps: [0, 2, 4], en: '+', he: 'מוגדל', say: ['augmented', 'aug'] },
  maj7: { ivs: [0, 4, 7, 11], steps: [0, 2, 4, 6], en: 'maj7', he: 'מז׳ור 7', say: ['major seven'] },
  dom7: { ivs: [0, 4, 7, 10], steps: [0, 2, 4, 6], en: '7', he: '7', say: ['seven', 'dominant seven'] },
  m7: { ivs: [0, 3, 7, 10], steps: [0, 2, 4, 6], en: 'm7', he: 'מינור 7', say: ['minor seven'] },
  m7b5: { ivs: [0, 3, 6, 10], steps: [0, 2, 4, 6], en: 'm7♭5', he: 'חצי מוקטן', say: ['half diminished', 'minor seven flat five'] },
  dim7: { ivs: [0, 3, 6, 9], steps: [0, 2, 4, 6], en: '°7', he: 'מוקטן 7', say: ['diminished seven'] },
  dom9: { ivs: [0, 4, 7, 10, 14], steps: [0, 2, 4, 6, 1], en: '9', he: '9', say: ['nine', 'dominant nine'] },
  add9: { ivs: [0, 4, 7, 14], steps: [0, 2, 4, 1], en: 'add9', he: 'אד 9', say: ['add nine'] },
  maj9: { ivs: [0, 4, 7, 11, 14], steps: [0, 2, 4, 6, 1], en: 'maj9', he: 'מז׳ור 9', say: ['major nine'] },
  m9: { ivs: [0, 3, 7, 10, 14], steps: [0, 2, 4, 6, 1], en: 'm9', he: 'מינור 9', say: ['minor nine'] },
  sus4: { ivs: [0, 5, 7], steps: [0, 3, 4], en: 'sus4', he: 'סאס 4', say: ['sus four', 'suspended four'] },
  sus2: { ivs: [0, 2, 7], steps: [0, 1, 4], en: 'sus2', he: 'סאס 2', say: ['sus two', 'suspended two'] },
  six: { ivs: [0, 4, 7, 9], steps: [0, 2, 4, 5], en: '6', he: '6', say: ['six', 'major six'] },
  dom11: { ivs: [0, 7, 10, 14, 17], steps: [0, 4, 6, 1, 3], en: '11', he: '11', say: ['eleven'] },
  dom13: { ivs: [0, 4, 10, 14, 21], steps: [0, 2, 6, 1, 5], en: '13', he: '13', say: ['thirteen'] },
};

/** A chord: root pitch class, quality, inversion (which chord tone is in the bass; named as a slash chord). */
export interface Chord {
  root: number;
  q: QId;
  inv: number;
}

const tone = (c: Chord, j: number): Sp => {
  const r = ROOTS[c.root];
  const l = (r.l + Q[c.q].steps[j]) % 7;
  const a = mod12(c.root + Q[c.q].ivs[j] - NAT[l] + 6) - 6;
  return { l, a };
};
export function chordName(c: Chord): { en: string; he: string; say?: string[] } {
  const r = ROOTS[c.root];
  const d = Q[c.q];
  const b = c.inv ? tone(c, c.inv) : null;
  const en = `${spEn(r)}${d.en}${b ? `/${spEn(b)}` : ''}`;
  const he = `${spHe(r)} ${d.he}${b ? ` / ${spHe(b)} בבס` : ''}`;
  const say = d.say.map((w) => `${spSay(r)} ${w}${b ? ` over ${spSay(b)}` : ''}`);
  if (b && c.q === 'maj') say.push(`${spSay(r)} over ${spSay(b)}`, `${spSay(r)} slash ${spSay(b)}`);
  return nm(en, he, ...say);
}
/** Pitch classes of the chord, bass first. */
const pcsOf = (c: Chord) => {
  const p = Q[c.q].ivs.map((iv) => mod12(c.root + iv));
  return [...p.slice(c.inv), ...p.slice(0, c.inv)];
};
/** Identity of the picture: same set of notes and same bass = indistinguishable. */
const looks = (c: Chord) => `${pcsOf(c)[0]}:${[...new Set(pcsOf(c))].sort((x, y) => x - y).join(',')}`;

/** Close voicing on the keys / staff: the bass in [lo, lo+11], every next tone the first above the previous one. */
function stack(c: Chord, lo: number): number[] {
  const order = pcsOf(c);
  const out = [lo + mod12(order[0] - lo)];
  // keep wide chords' upper tones above the third (the 9th / 11th / 13th sit above the octave)
  const ivs = Q[c.q].ivs;
  const rot = [...ivs.slice(c.inv), ...ivs.slice(0, c.inv).map((x) => x + 12)];
  for (let i = 1; i < rot.length; i++) out.push(out[0] + rot[i] - rot[0]);
  return out;
}
/** Does the staff's flat spelling (no key signature) show the chord with its right letters? */
function staffSpellsRight(c: Chord): boolean {
  return Q[c.q].ivs.every((_, j) => {
    const t = tone(c, j);
    const f = FLAT_SP[spPc(t)];
    return f.l === t.l && f.a === t.a;
  });
}

// ---------------------------------------------------------------- vocabularies and pictures

export type Vocab = 'triad-mm' | 'triad-all' | 'seventh' | 'inversion' | 'guitar' | 'extension';
export type Surface = 'keys' | 'staff' | 'neck' | 'box';
const VOCAB_Q: Record<Vocab, QId[]> = {
  'triad-mm': ['maj', 'min'],
  'triad-all': ['maj', 'min', 'dim', 'aug'],
  seventh: ['maj7', 'dom7', 'm7', 'm7b5', 'dim7'],
  inversion: ['maj', 'min'],
  guitar: ['maj', 'min'],
  extension: ['dom9', 'add9', 'maj9', 'm9', 'sus4', 'sus2', 'six', 'dom11', 'dom13'],
};
/** Which pictures can draw a vocabulary. */
const DRAWS: Record<Vocab, Surface[]> = {
  'triad-mm': ['keys', 'staff', 'neck', 'box'],
  'triad-all': ['keys', 'staff', 'neck'],
  seventh: ['keys', 'staff', 'neck'],
  inversion: ['staff', 'keys', 'neck'],
  guitar: ['box', 'neck'],
  extension: ['keys', 'staff'],
};

interface Picture {
  show?: ChoiceQuestion['show'];
  diagram?: Diagram;
  midis: number[];
  /** The inversion the picture really shows (string-set triads decide it themselves). */
  inv: number;
}

const neckDiagram = (ps: NeckPos[]): Diagram => {
  const fs = ps.map((p) => p.fret);
  const lo = Math.min(...fs);
  return { kind: 'neck', instrument: 'guitar', dots: ps.map((p) => ({ str: p.str, fret: p.fret })), baseFret: lo <= 2 ? 0 : lo - 1, frets: 5 };
};
const sorted = (xs: number[]) => xs.slice().sort((a, b) => a - b);

const MINOR_SHAPES: { shape: string; root: number }[] = [OPEN_CHORDS.Em, OPEN_CHORDS.Am, OPEN_CHORDS.Dm];
const OPEN_IDS = Object.keys(OPEN_CHORDS) as (keyof typeof OPEN_CHORDS)[];

function drawBox(rnd: () => number, c: Chord): Picture {
  const minor = c.q === 'min';
  const open = OPEN_IDS.find((k) => OPEN_CHORDS[k].root === c.root && OPEN_CHORDS[k].minor === minor);
  let shape: FretShape;
  if (open && rnd() < 0.45) shape = parseShape(OPEN_CHORDS[open].shape);
  else if (!minor) shape = cagedShape(pickR(rnd, CAGED), c.root);
  else {
    const m = pickR(rnd, MINOR_SHAPES);
    shape = shiftShape(parseShape(m.shape), mod12(c.root - m.root) || 12);
  }
  const pic = boxPicture(STD, shape);
  return { diagram: { kind: 'box', instrument: 'guitar', ...pic, frets: 5 }, midis: sorted(midisAt(STD, shape.dots)), inv: 0 };
}

const SET_STRINGS = [[3, 2, 1], [4, 3, 2], [5, 4, 3], [6, 5, 4]];
const DROP_KIND: Partial<Record<QId, SeventhKind>> = { maj7: 'maj7', dom7: '7', m7: 'm7', m7b5: 'm7b5' };

function drawNeck(rnd: () => number, c: Chord, slash: boolean): Picture | null {
  const d = Q[c.q];
  if (d.ivs.length === 3) {
    for (const strs of shuffleR(rnd, SET_STRINGS)) {
      let vs = triadVoicings(STD, d.ivs.map((iv) => c.root + iv), strs, 0, 12, 4);
      if (slash) {
        const want = pcsOf(c)[0];
        const m = vs.filter((v) => mod12(midisAt(STD, v)[0]) === want);
        if (m.length) vs = m;
      }
      if (!vs.length) continue;
      const v = pickR(rnd, vs);
      const ms = midisAt(STD, v);
      const inv = Math.max(0, d.ivs.findIndex((iv) => mod12(c.root + iv) === mod12(ms[0])));
      return { diagram: neckDiagram(v), midis: ms, inv: slash ? inv : 0 };
    }
    return null;
  }
  if (d.ivs.length === 4) {
    const opts = shuffleR(rnd, [
      [2, 6],
      [2, 5],
      [2, 4],
      [3, 6],
      [3, 5],
    ] as [2 | 3, number][]);
    for (const [drop, rs] of opts) {
      const rf = mod12(c.root - STD.open[rs - 1]) || 12;
      let ps: NeckPos[] | null;
      const k = DROP_KIND[c.q];
      if (k) ps = dropVoicing(STD, drop, k, rs, rf);
      else if (c.q === 'dim7' && drop === 2) {
        const r = STD.open[rs - 1] + rf;
        const ms = [r, r + 6, r + 9, r + 15];
        const strs = [rs, rs - 1, rs - 2, rs - 3];
        ps = ms.map((m, i) => ({ str: strs[i], fret: m - STD.open[strs[i] - 1] }));
        if (ps.some((p) => p.fret < 0 || p.fret > 15)) ps = null;
      } else ps = null;
      if (!ps) continue;
      const fr = ps.map((p) => p.fret);
      if (Math.max(...fr) - Math.min(...fr) > 5 || Math.max(...fr) > 15) continue;
      return { diagram: neckDiagram(ps), midis: sorted(midisAt(STD, ps)), inv: 0 };
    }
    return null;
  }
  return null;
}

function draw(rnd: () => number, c: Chord, surface: Surface, slash: boolean): Picture | null {
  const wide = Q[c.q].ivs.length >= 5 || Math.max(...Q[c.q].ivs) > 12;
  if (surface === 'keys') {
    const midis = stack(c, wide ? 48 + Math.floor(rnd() * 5) : 53 + Math.floor(rnd() * 6));
    return { diagram: { kind: 'keys', midis }, midis, inv: c.inv };
  }
  if (surface === 'staff') {
    if (!staffSpellsRight(c)) return null;
    const midis = stack(c, wide ? 55 + Math.floor(rnd() * 4) : 59 + Math.floor(rnd() * 6));
    return { show: { midis, chord: true, clef: 'treble', key: null }, midis, inv: c.inv };
  }
  if (surface === 'box') return c.q === 'maj' || c.q === 'min' ? drawBox(rnd, c) : null;
  return drawNeck(rnd, c, slash);
}

// ---------------------------------------------------------------- options

const RELATIVE: Partial<Record<QId, [number, QId]>> = {
  maj: [9, 'min'],
  min: [3, 'maj'],
  dim: [3, 'min'],
  aug: [4, 'aug'],
  maj7: [4, 'm7'],
  m7: [3, 'maj7'],
  dom7: [4, 'm7b5'],
  m7b5: [3, 'm7'],
  dim7: [3, 'dim7'],
  dom9: [7, 'm7'],
  add9: [0, 'maj'],
  maj9: [4, 'm7'],
  m9: [3, 'maj7'],
  sus4: [5, 'sus2'],
  sus2: [7, 'sus4'],
  six: [9, 'm7'],
  dom11: [10, 'add9'],
  dom13: [0, 'dom9'],
};

function options(rnd: () => number, a: Chord, vocab: Vocab): Chord[] {
  const pool = VOCAB_Q[vocab];
  const sameRoot = shuffleR(rnd, pool.filter((q) => q !== a.q).map((q) => ({ root: a.root, q, inv: 0 })));
  const near = shuffleR(
    rnd,
    [1, 11, 2, 10, 5, 7].map((k) => ({ root: mod12(a.root + k), q: a.q, inv: 0 })),
  );
  const rel = RELATIVE[a.q];
  const relC: Chord[] = rel ? [{ root: mod12(a.root + rel[0]), q: rel[1], inv: 0 }] : [];
  let order: Chord[];
  if (vocab === 'inversion') {
    const invs = shuffleR(rnd, [0, 1, 2].filter((k) => k !== a.inv)).map((k) => ({ ...a, inv: k }));
    const other: QId = a.q === 'maj' ? 'min' : 'maj';
    const bass = pcsOf(a)[0];
    const onBass: Chord = { root: bass, q: a.inv === 1 ? other : a.inv === 2 ? a.q : a.q === 'maj' ? 'min' : 'maj', inv: 0 };
    order = [...invs, ...shuffleR(rnd, [onBass, { root: a.root, q: other, inv: a.inv }, ...relC]), ...near];
  } else {
    order = [...sameRoot.slice(0, vocab === 'triad-mm' || vocab === 'guitar' ? 1 : 2), ...shuffleR(rnd, [...relC, ...near.slice(0, 2)]), ...sameRoot.slice(2), ...near.slice(2)];
  }
  const seen = new Set([chordName(a).en]);
  const seenLook = new Set([looks(a)]);
  const out: Chord[] = [];
  for (const c of order) {
    const n = chordName(c).en;
    if (seen.has(n) || seenLook.has(looks(c))) continue;
    seen.add(n);
    seenLook.add(looks(c));
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

// ---------------------------------------------------------------- the generator

const DIFF = [900, 1000, 1100, 1200, 1250, 1400, 1550];
const LEVEL_PLAN: { vocab: Vocab; surfaces: Surface[] }[] = [
  { vocab: 'triad-mm', surfaces: ['keys'] },
  { vocab: 'triad-all', surfaces: ['staff'] },
  { vocab: 'seventh', surfaces: ['keys', 'staff'] },
  { vocab: 'inversion', surfaces: ['staff'] },
  { vocab: 'guitar', surfaces: ['box', 'neck'] },
  { vocab: 'extension', surfaces: ['keys'] },
];
const ALL_VOCAB: Vocab[] = ['triad-mm', 'triad-all', 'seventh', 'inversion', 'guitar', 'extension'];

/** A picture filter for speed games: draw only on the keys, the staff or a guitar picture (box or neck). */
export type ChordPictureFilter = 'keys' | 'staff' | 'neck';

/**
 * A "read the chord" item. `picture` forces the kind of drawing (speed games); the level still sets the chords.
 * Pure: the same (seed, level, picture) gives the same item.
 */
export function chordReadItem(seed: number, level: number, id: string, picture?: ChordPictureFilter): ChoiceQuestion {
  const rnd = rng(seed);
  const lv = Math.max(1, Math.min(7, level));
  let vocab: Vocab;
  let surfaces: Surface[];
  if (lv === 7) {
    const vs = picture ? ALL_VOCAB.filter((v) => DRAWS[v].some((s) => surfaceOk(s, picture))) : ALL_VOCAB;
    vocab = pickR(rnd, vs);
    surfaces = DRAWS[vocab];
  } else ({ vocab, surfaces } = LEVEL_PLAN[lv - 1]);
  if (picture) {
    if (!DRAWS[vocab].some((s) => surfaceOk(s, picture))) vocab = picture === 'neck' ? 'seventh' : 'triad-mm';
    surfaces = DRAWS[vocab].filter((s) => surfaceOk(s, picture));
  }
  if (vocab === 'guitar' && picture && picture !== 'neck') vocab = 'triad-mm';
  const surface = pickR(rnd, surfaces);
  const slash = vocab === 'inversion';
  // the chord and its picture (a few tries: the staff draws only chords it spells right)
  let a: Chord = { root: 0, q: VOCAB_Q[vocab][0], inv: 0 };
  let pic: Picture | null = null;
  for (let t = 0; t < 40 && !pic; t++) {
    const q = pickR(rnd, VOCAB_Q[vocab]);
    const inv = slash ? pickR(rnd, [1, 2, 1, 2, 0]) : 0;
    a = { root: Math.floor(rnd() * 12), q, inv };
    pic = draw(rnd, a, surface, slash);
  }
  if (!pic) {
    a = { root: 0, q: VOCAB_Q[vocab][0], inv: slash ? 1 : 0 };
    pic = draw(rnd, a, surface === 'box' || surface === 'neck' ? 'keys' : surface, slash)!;
  }
  a = { ...a, inv: pic.inv };
  const others = options(rnd, a, vocab);
  const all = shuffleR(rnd, [a, ...others]);
  const names: ChoiceQuestion['names'] = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  for (const c of all) {
    const n = chordName(c);
    names[n.en] = n;
    choiceStim[n.en] = [{ kind: 'chord', midis: c === a ? pic.midis : stack(c, 53), duration: 1.4 }];
  }
  const answer = chordName(a).en;
  const ask = slash ? { en: 'Name the chord — watch the bass', he: 'מה שם האקורד? שימו לב לבס' } : { en: 'Name the chord', he: 'מה שם האקורד?' };
  return choiceQ({
    id,
    topic: 'chord-read',
    level,
    seed,
    skill: 'chords',
    difficulty: DIFF[lv - 1],
    ask,
    names,
    answer,
    choices: all.map((c) => chordName(c).en),
    // drawn pictures also sound when played (the staff is reading only)
    stimulus: pic.diagram ? [{ kind: 'chord', midis: pic.midis, duration: 1.6, arpeggio: true }] : [],
    choiceStim,
    ...(pic.show ? { show: pic.show } : {}),
    ...(pic.diagram ? { diagram: pic.diagram } : {}),
  });
}
function surfaceOk(s: Surface, p: ChordPictureFilter): boolean {
  return p === 'neck' ? s === 'neck' || s === 'box' : s === p;
}

TOPIC_GEN['chord-read'] = {
  title: { en: 'Read the chord', he: 'לקרוא את האקורד' },
  skill: 'chords',
  levels: [
    { en: 'Major and minor on the keys', he: 'מז׳ור ומינור על הקלידים' },
    { en: '+ diminished and augmented, on the staff', he: '+ מוקטן ומוגדל, על החמשה' },
    { en: 'Seventh chords', he: 'אקורדי ספט' },
    { en: 'Inversions as slash chords (C/E)', he: 'היפוכים כאקורדי סלאש (C/E)' },
    { en: 'Guitar shapes: open, CAGED, string sets', he: 'צורות בגיטרה: פתוחים, CAGED, קבוצות מיתרים' },
    { en: 'Extensions: 9, 11, 13, add9, sus', he: 'הרחבות: 9, 11, 13, add9, sus' },
    { en: 'Everything, every picture', he: 'הכול, בכל תמונה' },
  ],
  gen: (seed, level, id) => chordReadItem(seed, level, id),
};

TOPIC_TAGS['chord-read'] = (l) =>
  l === 3
    ? tg(['chords', 'seventh', 0.7], ['theory', 'spelling', 0.3])
    : l === 4
      ? tg(['chords', 'inversion', 0.7], ['theory', 'spelling', 0.3])
      : l === 5
        ? tg(['chords', 'quality', 0.6], ['instrument', 'shapes', 0.4])
        : l === 6
          ? tg(['chords', 'extension', 0.7], ['theory', 'spelling', 0.3])
          : l === 1
            ? tg(['chords', 'quality', 0.7], ['instrument', 'keyboard', 0.3])
            : tg(['chords', 'quality', 0.7], ['theory', 'spelling', 0.3]);
