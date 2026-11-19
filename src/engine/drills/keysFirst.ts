// AUDIT-6 Stage B (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §1.5 priorities 2–3): the piano's way in and its graded
// sight-reading, as measured drill levels.
//
//   k-first  the first steps (levels 1–3 unchanged): 4 the black-key groups · 5 C, G and F five-finger positions ·
//            6 hands separately, then together · 7 reading the treble clef · 8 reading the bass clef · 9 a first piece ·
//            10 pop chord symbols as block chords · 11 LH root + RH triad over I–V–vi–IV
//   k-read   graded sight-reading, ~800–1400: five-finger reading (each hand) → with 8ths and rests → position shifts →
//            both hands (held LH, then a moving LH) → keys with sharps and flats, accidentals → minor keys → LH chords →
//            RH chords over a bass → a quick study in 3/4 or 6/8 with the 30-second look (prep)
//
// Every melody is our own: the pieces are written here; the reading items are generated from a seed that holds the
// family, kind, key, hand and variant, so each item is new in every key and every variant (4 a level × 12 keys) and
// there is nothing to learn by heart. Key-relative levels run in all 12 keys (C, G and F first). Like every piano
// item, a new one is played in free time first, then on the tempo ladder (rubato.ts). Pure and deterministic.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { all12 } from './keys12';
import { genRead2, READ2_KINDS } from './keysRead2'; // AUDIT-7 #4: k-read 11–15 (grades 7–8, the quick study)

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAMES_MIN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const HARM = [0, 2, 3, 5, 7, 8, 11];
/** The right hand's tonic: C4–F♯4, else G3–B3 (the five-finger position stays around middle C). */
const rhTonic = (key: number): number => (mod(key, 12) <= 6 ? 60 + mod(key, 12) : 48 + mod(key, 12));
/** Pitch of scale degree k (0 = tonic; negatives below, 7 = the octave). */
const deg = (tonic: number, k: number, ints = MAJ): number => tonic + 12 * Math.floor(k / 7) + ints[mod(k, 7)];
/** Five-finger fingering: degree 0–4 → finger (RH 1–5, LH 5–1). */
const fingerOf = (hand: 'R' | 'L', d: number): number | undefined => (d >= 0 && d <= 4 ? (hand === 'R' ? d + 1 : 5 - d) : undefined);

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  /** Notes sounding together share a chordId (both hands at once count as one chord, as in generate.ts). */
  add(beat: number, dur: number, ns: { p: number; hand: 'R' | 'L'; finger?: number }[]): void {
    const id = ns.length > 1 ? ++this.cid : undefined;
    for (const n of ns) this.list.push({ pitch: n.p, beat: r6(beat), dur: r6(dur), hand: n.hand, ...(n.finger ? { finger: n.finger } : {}), ...(id !== undefined ? { chordId: id } : {}) });
  }
}
function done(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal>, extra: Partial<Drill> = {}): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter: 4,
    keySig: SIG[mod(s.key + (s.minor ? 3 : 0), 12)],
    goal: { evenness: false, hands: s.hands === 'RL', ...goal },
    startBpm: s.tempo ?? startBpm,
    ...extra,
  };
}
const handTx = (h: DrillSpec['hands']): T2 => (h === 'R' ? t(' · RH', ' · יד ימין') : h === 'L' ? t(' · LH', ' · יד שמאל') : t(' · HT', ' · ידיים יחד'));
const kt = (en: string, he: string, s: DrillSpec): T2 => {
  const k = s.minor ? `${NAMES_MIN[mod(s.key, 12)]}m` : NAMES[mod(s.key, 12)];
  const h = handTx(s.hands);
  return t(`${en} · ${k}${h.en}`, `${he} · ${k}${h.he}`);
};

/** A seeded generator from a string (FNV-1a + mulberry32). */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let x = h;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

// ───────────────────────────── k-first 4–11 ─────────────────────────────

/** The black-key groups (MIDI): the two (C♯ D♯) and the three (F♯ G♯ A♯) around middle C. */
export const BLACK_TWO = [61, 63];
export const BLACK_THREE = [66, 68, 70];
/** Our own five-finger tunes (scale degrees, beats). */
export const FIVE_TUNES: [number, number][][] = [
  [[0, 1], [1, 1], [2, 1], [0, 1], [2, 1], [3, 1], [4, 2], [4, 1], [3, 1], [2, 1], [1, 1], [2, 1], [1, 1], [0, 2]],
  [[4, 1], [2, 1], [3, 1], [1, 1], [2, 1], [0, 1], [1, 2], [2, 1], [3, 1], [4, 1], [2, 1], [1, 1], [3, 1], [0, 2]],
];
/** A first piece: an 8-bar melody over the left hand's tonic and dominant (degrees; LH: 0 = I, 4 = V per bar). */
export const FIRST_PIECES: { en: string; he: string; rh: [number, number][]; lh: number[] }[] = [
  {
    en: 'Morning walk',
    he: 'הליכת בוקר',
    rh: [[0, 1], [2, 1], [4, 2], [3, 1], [2, 1], [1, 2], [2, 1], [3, 1], [4, 1], [2, 1], [1, 4], [0, 1], [2, 1], [4, 2], [3, 1], [1, 1], [2, 2], [4, 1], [3, 1], [1, 1], [2, 1], [0, 4]],
    lh: [0, 4, 0, 4, 0, 4, 4, 0],
  },
  {
    en: 'Quiet steps',
    he: 'צעדים שקטים',
    rh: [[4, 2], [3, 1], [2, 1], [1, 2], [2, 2], [3, 1], [2, 1], [1, 1], [0, 1], [1, 4], [2, 1], [3, 1], [4, 2], [4, 1], [3, 1], [2, 2], [1, 1], [2, 1], [3, 1], [1, 1], [0, 4]],
    lh: [0, 4, 4, 4, 0, 0, 4, 0],
  },
];
/** I–V–vi–IV: chord roots as scale degrees, minor on vi. */
const POP = [0, 4, 5, 3];
const triadPcs = (key: number, d: number): number[] => [0, 2, 4].map((x) => mod(key + MAJ[mod(d + x, 7)], 12));
const chordName = (key: number, d: number): string => `${NAMES[mod(key + MAJ[d], 12)]}${d === 1 || d === 2 || d === 5 ? 'm' : ''}`;
/** Close triads inside a window, each as near as possible to the one before (smooth block chords). */
export function popVoicings(key: number, lo = 55, hi = 74): number[][] {
  const out: number[][] = [];
  let prev: number[] | null = null;
  for (const d of POP) {
    const pcs = triadPcs(key, d);
    const cands: number[][] = [];
    for (let inv = 0; inv < 3; inv++)
      for (let oct = 36; oct <= 84; oct += 12) {
        const ord = [...pcs.slice(inv), ...pcs.slice(0, inv)];
        const v: number[] = [];
        let last = oct - 1;
        for (const pc of ord) {
          let p = oct + mod(pc - oct, 12);
          while (p <= last) p += 12;
          v.push(p);
          last = p;
        }
        if (v[0] >= lo && v[2] <= hi) cands.push(v);
      }
    const cost = (v: number[]) => (prev ? v.reduce((a, p, i) => a + Math.abs(p - prev![i]), 0) : Math.abs(v[0] - 60));
    cands.sort((a, b) => cost(a) - cost(b) || a[0] - b[0]);
    prev = cands[0];
    out.push(prev);
  }
  return out;
}

function genFirst(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = new Notes();
  const T = rhTonic(key);
  const hands: ('R' | 'L')[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const at = (hand: 'R' | 'L', d: number) => ({ p: deg(hand === 'R' ? T : T - 12, d), hand, finger: fingerOf(hand, d) });
  switch (s.kind) {
    case 'kf-black': {
      // The two- and the three-black-key group, fingers 2–3 and 2–3–4, up an octave and back.
      const line: number[] =
        op === 0
          ? [...BLACK_TWO, ...BLACK_TWO, ...BLACK_THREE, BLACK_THREE[1], ...BLACK_TWO.map((p) => p + 12), ...BLACK_TWO.map((p) => p + 12), ...BLACK_THREE.map((p) => p + 12), BLACK_THREE[1] + 12]
          : [...BLACK_THREE, BLACK_THREE[1], ...BLACK_TWO, ...BLACK_TWO, ...BLACK_THREE.map((p) => p + 12), BLACK_THREE[1] + 12, ...BLACK_TWO.map((p) => p + 12), ...BLACK_TWO.map((p) => p + 12)];
      const fingers = (p: number, h: 'R' | 'L') => {
        const pc = mod(p, 12);
        const i = pc === 1 ? 0 : pc === 3 ? 1 : pc === 6 ? 0 : pc === 8 ? 1 : 2;
        return h === 'R' ? i + 2 : 4 - i;
      };
      line.forEach((p, i) => n.add(i, 1, hands.map((h) => ({ p: h === 'R' ? p : p - 12, hand: h, finger: fingers(p, h) }))));
      n.add(line.length, 2, hands.map((h) => ({ p: h === 'R' ? BLACK_TWO[0] : BLACK_TWO[0] - 12, hand: h, finger: fingers(BLACK_TWO[0], h) })));
      const nm = op === 0 ? t('two black keys, then three', 'שני שחורים, ואז שלושה') : t('three black keys, then two', 'שלושה שחורים, ואז שניים');
      return done(s, n, t(`The black-key groups: ${nm.en}${handTx(s.hands).en}`, `קבוצות הקלידים השחורים: ${nm.he}${handTx(s.hands).he}`), 60, { evenness: true });
    }
    case 'kf-pos': {
      // A five-finger tune in the key's position (C, G, F first).
      let b = 0;
      for (const [d, len] of FIVE_TUNES[op % FIVE_TUNES.length]) {
        n.add(b, len, hands.map((h) => at(h, d)));
        b += len;
      }
      return done(s, n, kt(`Five-finger position: tune ${(op % 2) + 1}`, `עמדת חמש אצבעות: מנגינה ${(op % 2) + 1}`, s), 60, { evenness: true });
    }
    case 'kf-tog': {
      // Hands together: in octaves (parallel) or mirrored (contrary: the thumbs share the tonic's neighbours).
      const tune = FIVE_TUNES[0];
      let b = 0;
      for (const [d, len] of tune) {
        if (op === 0) n.add(b, len, [at('R', d), at('L', d)]);
        else n.add(b, len, [at('R', d), { p: deg(T - 12, -d), hand: 'L', finger: d + 1 }]);
        b += len;
      }
      const nm = op === 0 ? t('in octaves', 'באוקטבות') : t('in mirror (contrary motion)', 'במראה (תנועה נגדית)');
      return done(s, n, kt(`Hands together ${nm.en}`, `ידיים יחד ${nm.he}`, { ...s, hands: 'RL' }), 56, { evenness: true, hands: true });
    }
    case 'kf-read': {
      // Reading one clef in the five-finger position: steps only, quarters and halves (8 bars).
      const r = seeded(`${itemIdOf(s)}:first`);
      const h = s.hands === 'L' ? 'L' : 'R';
      let d = 0;
      let b = 0;
      while (b < 28) {
        const len = b % 4 === 3 ? 1 : pick(r, [1, 1, 1, 2]);
        n.add(b, len, [at(h, d)]);
        b += len;
        const mv = d === 0 ? 1 : d === 4 ? -1 : pick(r, [-1, 1, 1, -1, 0]);
        d = Math.max(0, Math.min(4, d + (mv === 0 ? -1 : mv)));
      }
      n.add(b, 32 - b, [at(h, 0)]);
      const nm = h === 'R' ? t('treble clef', 'מפתח סול') : t('bass clef', 'מפתח פה');
      return done(s, n, kt(`Reading the ${nm.en}: steps · ${op + 1}`, `קריאה ב${nm.he}: צעדים · ${op + 1}`, s), 60, {});
    }
    case 'kf-piece': {
      const pc = FIRST_PIECES[op % FIRST_PIECES.length];
      let b = 0;
      for (const [d, len] of pc.rh) {
        n.add(b, len, [at('R', d)]);
        b += len;
      }
      pc.lh.forEach((d, bar) => n.add(bar * 4, 4, [at('L', d)]));
      return done(s, n, kt(`A first piece: "${pc.en}"`, `יצירה ראשונה: "${pc.he}"`, { ...s, hands: 'RL' }), 60, { hands: true });
    }
    case 'kf-block': {
      // Chord symbols as block chords in the right hand: I–V–vi–IV twice, each chord near the one before.
      const vs = popVoicings(key);
      const per = op === 1 ? 2 : 4;
      for (let bar = 0; bar < 8; bar++) for (let k = 0; k < 4 / per; k++) n.add(bar * 4 + k * per, per, vs[bar % 4].map((p) => ({ p, hand: 'R' as const })));
      n.add(32, 4, vs[0].map((p) => ({ p, hand: 'R' as const })));
      const chart = [...Array.from({ length: 8 }, (_, bar) => chordName(key, POP[bar % 4])), chordName(key, 0)];
      const nm = op === 1 ? t('two a bar', 'שניים בתיבה') : t('one a bar', 'אחד בתיבה');
      return done(s, n, kt(`Chord symbols: block chords I–V–vi–IV, ${nm.en}`, `סימני אקורדים: אקורדים חסומים I–V–vi–IV, ${nm.he}`, s), 60, { evenness: true }, { chart });
    }
    case 'kf-pop': {
      // Pop accompaniment: the left hand's root, the right hand's triad (halves, then quarters) over I–V–vi–IV.
      const vs = popVoicings(key, 57, 76);
      const per = op === 1 ? 1 : 2;
      for (let bar = 0; bar < 8; bar++) {
        const d = POP[bar % 4];
        const root = 40 + mod(key + MAJ[d] - 40, 12);
        n.add(bar * 4, per, [...vs[bar % 4].map((p) => ({ p, hand: 'R' as const })), { p: root, hand: 'L' as const }]);
        for (let k = 1; k < 4 / per; k++) n.add(bar * 4 + k * per, per, vs[bar % 4].map((p) => ({ p, hand: 'R' as const })));
      }
      n.add(32, 4, [...vs[0].map((p) => ({ p, hand: 'R' as const })), { p: 40 + mod(key - 40, 12), hand: 'L' as const }]);
      const chart = [...Array.from({ length: 8 }, (_, bar) => chordName(key, POP[bar % 4])), chordName(key, 0)];
      const nm = op === 1 ? t('triads in quarters', 'משולשים ברבעים') : t('triads in halves', 'משולשים בחצאים');
      return done(s, n, kt(`Pop from chord symbols: LH root, RH ${nm.en}`, `פופ מסימני אקורדים: שורש ביד שמאל, ${nm.he} ביד ימין`, { ...s, hands: 'RL' }), 60, { evenness: true, hands: true }, { chart });
    }
  }
  throw new Error(`Unknown k-first kind ${s.kind}`);
}

// ───────────────────────────── k-read: graded sight-reading ─────────────────────────────

/** One reading level's recipe. */
export interface ReadRecipe {
  /** Lowest and highest degree of the melody (0–4 = the five-finger position). */
  range: [number, number];
  moves: number[];
  durs: number[];
  rests?: boolean;
  /** Chromatic neighbours / passing notes (♯4 up to 5, ♭7 down to 6). */
  acc?: boolean;
  /** What the left hand does under a right-hand melody. */
  lh?: 'held' | 'bass' | 'chords';
  /** A third below the melody on the strong beats (right-hand double notes). */
  rhThirds?: boolean;
  meter?: 3 | 4 | 6;
  bars: number;
  prep?: number;
}
export const READ_RECIPES: Record<string, ReadRecipe> = {
  'kr-five': { range: [0, 4], moves: [-2, -1, -1, 1, 1, 2], durs: [1, 1, 1, 2], bars: 4 },
  'kr-five8': { range: [0, 4], moves: [-2, -1, -1, 1, 1, 2], durs: [0.5, 0.5, 1, 1, 2], rests: true, bars: 4 },
  'kr-shift': { range: [-2, 7], moves: [-3, -2, -1, -1, 1, 1, 2, 3], durs: [0.5, 0.5, 1, 1, 2], bars: 4 },
  'kr-held': { range: [0, 5], moves: [-2, -1, -1, 1, 1, 2], durs: [0.5, 1, 1, 2], lh: 'held', bars: 4 },
  'kr-bass': { range: [0, 7], moves: [-3, -2, -1, -1, 1, 1, 2, 3], durs: [0.5, 0.5, 1, 1, 2], lh: 'bass', bars: 4 },
  'kr-acc': { range: [-1, 7], moves: [-2, -1, -1, 1, 1, 2], durs: [0.5, 0.5, 1, 1, 2], acc: true, rests: true, bars: 4 },
  'kr-minor': { range: [-1, 5], moves: [-2, -1, -1, 1, 1, 2], durs: [0.5, 1, 1, 2], lh: 'held', bars: 4 },
  'kr-lhchords': { range: [0, 7], moves: [-2, -1, -1, 1, 1, 2, 3], durs: [0.5, 0.5, 1, 1, 1.5, 2], lh: 'chords', bars: 4 },
  'kr-rhchords': { range: [2, 9], moves: [-2, -1, -1, 1, 1, 2], durs: [1, 1, 1.5, 2], rhThirds: true, lh: 'bass', bars: 4 },
  'kr-quick': { range: [-1, 8], moves: [-3, -2, -1, -1, 1, 1, 2, 3], durs: [0.5, 0.5, 1, 1, 1.5, 2], acc: true, lh: 'bass', meter: 3, bars: 8, prep: 30 },
};
const READ_NAME: Record<string, T2> = {
  'kr-five': t('five-finger melody', 'מנגינת חמש אצבעות'),
  'kr-five8': t('five fingers, 8ths and rests', 'חמש אצבעות, שמיניות והפסקות'),
  'kr-shift': t('the hand moves', 'היד זזה'),
  'kr-held': t('melody over held notes', 'מנגינה מעל צלילים מוחזקים'),
  'kr-bass': t('melody over a moving bass', 'מנגינה מעל בס נע'),
  'kr-acc': t('sharps, flats and accidentals', 'דיאזים, במולים וסימני שינוי'),
  'kr-minor': t('a minor key', 'סולם מינורי'),
  'kr-lhchords': t('melody over left-hand chords', 'מנגינה מעל אקורדים ביד שמאל'),
  'kr-rhchords': t('right-hand double notes over a bass', 'צלילים כפולים ביד ימין מעל בס'),
  'kr-quick': t('quick study in 3/4', 'לימוד מהיר ב־3/4'),
};

/** A generated reading melody: degrees with beats; the last note is the tonic, held to the bar line. */
export function readMelody(r: () => number, rc: ReadRecipe, meter: number, group?: number): { d: number; beat: number; dur: number; acc?: 1 | -1 }[] {
  const total = rc.bars * meter;
  const out: { d: number; beat: number; dur: number; acc?: 1 | -1 }[] = [];
  const [lo, hi] = rc.range;
  let d = pick(r, [0, 2, 4].filter((x) => x >= lo && x <= hi));
  let b = 0;
  const endAt = total - meter;
  while (b < endAt - 1e-9) {
    const inBar = group ? group - (b % group) : meter - (b % meter);
    const fit = rc.durs.filter((x) => x <= inBar + 1e-9 && b + x <= endAt + 1e-9);
    let len = fit.length ? pick(r, fit) : inBar;
    // After an 8th off the beat, an 8th completes the beat, so the beams stay simple to read.
    if (!Number.isInteger(b) && len > 0.5) len = 0.5;
    if (rc.rests && b > 0 && Number.isInteger(b) && len === 1 && r() < 0.15) {
      b += 1; // a quarter rest
      continue;
    }
    let acc: 1 | -1 | undefined;
    let mv = pick(r, rc.moves);
    if (rc.acc && mod(d, 7) === 3 && r() < 0.5) {
      acc = 1; // ♯4 …
      mv = 1; // … up to 5
    } else if (rc.acc && mod(d, 7) === 6 && r() < 0.4) {
      acc = -1; // ♭7 …
      mv = -1; // … down to 6
    }
    out.push({ d, beat: b, dur: len, ...(acc ? { acc } : {}) });
    b += len;
    let nd = d + mv;
    if (nd < lo || nd > hi) nd = d - mv;
    if (nd === d) nd = d + (d < hi ? 1 : -1);
    d = Math.max(lo, Math.min(hi, nd));
  }
  out.push({ d: 0, beat: endAt, dur: meter });
  return out;
}
/** The bar's harmony from its melody: I, IV or V (degrees 0, 3, 4), whichever holds the most melody notes. */
const harmonyOf = (ds: number[]): number => {
  const score = (root: number) => ds.filter((d) => [0, 2, 4].map((x) => mod(root + x, 7)).includes(mod(d, 7))).length;
  return [0, 4, 3].reduce((best, c) => (score(c) > score(best) ? c : best), 0);
};

function genRead(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const rc = READ_RECIPES[s.kind];
  if (!rc) throw new Error(`Unknown k-read kind ${s.kind}`);
  // The quick study's odd variants are in 6/8, written in 8ths (one drill beat = an 8th, pulse 8).
  const six = s.kind === 'kr-quick' && (s.option ?? 0) % 2 === 1;
  const meter = six ? 6 : rc.meter ?? 4;
  const r = seeded(itemIdOf(s));
  const ints = s.minor ? HARM : MAJ;
  const rh = s.hands === 'L' ? 'L' : 'R';
  const T = rh === 'L' ? rhTonic(key) - 12 : rhTonic(key);
  const mel = readMelody(r, six ? { ...rc, durs: [1, 1, 2, 3] } : rc, meter, six ? 3 : undefined);
  const n = new Notes();
  const pitchOf = (x: { d: number; acc?: 1 | -1 }) => deg(T, x.d, ints) + (x.acc ?? 0);
  const k = 1;
  for (const x of mel) {
    const ns: { p: number; hand: 'R' | 'L'; finger?: number }[] = [{ p: pitchOf(x), hand: rh, finger: rc.range[1] <= 4 ? fingerOf(rh, x.d) : undefined }];
    if (rc.rhThirds && Number.isInteger(x.beat)) ns.push({ p: deg(T, x.d - 2, ints), hand: 'R' });
    n.add(x.beat * k, x.dur * k, ns);
  }
  if (rc.lh && s.hands === 'RL') {
    const L = T - 12;
    for (let bar = 0; bar < rc.bars; bar++) {
      const inBar = mel.filter((x) => x.beat >= bar * meter && x.beat < (bar + 1) * meter).map((x) => x.d);
      const last = bar === rc.bars - 1;
      const c = last ? 0 : harmonyOf(inBar);
      const b0 = bar * meter * k;
      if (rc.lh === 'held') n.add(b0, meter * k, [{ p: deg(L, c === 3 ? -4 : c, ints), hand: 'L' }]);
      else if (rc.lh === 'chords') {
        const root = c === 3 ? -4 : c === 4 ? -3 : 0;
        const tri = [root, root + 2, root + 4];
        const half = meter === 4 ? 2 : meter;
        for (let q = 0; q < meter; q += half) n.add(b0 + q * k, Math.min(half, meter - q) * k, tri.map((x) => ({ p: deg(L, x, ints), hand: 'L' as const })));
      } else {
        // A moving bass: root, fifth (and back) on the beats of the bar, the tonic at the end.
        const root = c === 3 ? -4 : c === 4 ? -3 : 0;
        const fig = last ? [0] : six ? [root, root + 4] : meter === 3 ? [root, root + 4, root + 2] : [root, root + 4, root + 2, root + 4];
        const step = last ? meter : six ? 3 : 1;
        fig.forEach((x, q) => n.add(b0 + q * step * k, step * k, [{ p: deg(L, x, ints), hand: 'L' }]));
      }
    }
  }
  const nm = READ_NAME[s.kind];
  const sp: DrillSpec = rc.lh ? { ...s, hands: 'RL' } : s;
  const extra: Partial<Drill> = six ? { meter: 6, pulse: 8, groups: [3, 3] } : meter === 3 ? { meter: 3 } : {};
  if (rc.prep) extra.prep = rc.prep;
  const title = kt(`Sight-reading: ${six ? nm.en.replace('3/4', '6/8') : nm.en} · ${(s.option ?? 0) + 1}`, `קריאה מהדף: ${six ? nm.he.replace('3/4', '6/8') : nm.he} · ${(s.option ?? 0) + 1}`, sp);
  return done(s, n, title, 60, { hands: s.hands === 'RL' }, extra);
}

/** Build a k-first (levels 4–11) or k-read item. */
export function genKeysFirst(s: DrillSpec): Drill {
  if (s.family === 'k-read' && READ2_KINDS.has(s.kind)) return genRead2(s);
  return s.family === 'k-read' ? genRead(s) : genFirst(s);
}
/** k-first kinds made here (levels 1–3 are generate.ts's five-finger and thumb-under kinds). */
export const KEYS_FIRST_KINDS = new Set(['kf-black', 'kf-pos', 'kf-tog', 'kf-read', 'kf-piece', 'kf-block', 'kf-pop']);

// ───────────────────────────── the families ─────────────────────────────

/** C, G and F first (the beginner's three positions), then the rest up the cycle of 4ths. */
export const CGF = all12([0, 7, 5]);

/** The first steps at the piano: the three original levels (unchanged ids and items) and eight more. */
export function keysFirstFamily(): FamilyDef {
  const fam: FamilyId = 'k-first';
  const fs = (kind: string, hands: SpecTemplate['hands'], o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands, perBeat: 1, ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys, tempo });
  return {
    id: fam,
    title: t('First steps at the piano', 'צעדים ראשונים בפסנתר'),
    style: 'both',
    levels: [
      L(1, 'Posture and finger numbers: five fingers in C', 'ישיבה ומספרי אצבעות: חמש אצבעות בדו', [fs('five', 'R'), fs('five', 'L')], [0], [50, 72]),
      L(2, 'C position, hands together', 'עמדת דו, ידיים יחד', [fs('five', 'RL'), fs('five', 'RL', { option: 1 })], [0], [50, 72]),
      L(3, 'The thumb passes under', 'האגודל עובר מתחת', [fs('thumb-under', 'R'), fs('thumb-under', 'L')], [0], [48, 66]),
      L(4, 'The black keys: groups of two and three', 'הקלידים השחורים: קבוצות של שניים ושלושה', [fs('kf-black', 'R'), fs('kf-black', 'L', { option: 1 }), fs('kf-black', 'R', { option: 1 })], [0], [50, 80]),
      L(5, 'Five-finger positions: C, G and F', 'עמדות חמש אצבעות: דו, סול ופה', [fs('kf-pos', 'R'), fs('kf-pos', 'L'), fs('kf-pos', 'R', { option: 1 })], CGF, [50, 84]),
      L(6, 'Hands separately, then together', 'כל יד לחוד, ואז יחד', [fs('kf-pos', 'L', { option: 1 }), fs('kf-tog', 'RL'), fs('kf-tog', 'RL', { option: 1 })], CGF, [50, 80]),
      L(7, 'Reading the treble clef', 'קריאה במפתח סול', [0, 1, 2].map((o) => fs('kf-read', 'R', { option: o })), CGF, [50, 84]),
      L(8, 'Reading the bass clef', 'קריאה במפתח פה', [0, 1, 2].map((o) => fs('kf-read', 'L', { option: o })), CGF, [50, 84]),
      L(9, 'A first piece, both hands', 'יצירה ראשונה בשתי ידיים', [fs('kf-piece', 'RL'), fs('kf-piece', 'RL', { option: 1 })], CGF, [56, 88]),
      L(10, 'Chord symbols: block chords', 'סימני אקורדים: אקורדים חסומים', [fs('kf-block', 'R', { perBeat: 0.25 }), fs('kf-block', 'R', { option: 1, perBeat: 0.5 })], CGF, [50, 80]),
      L(11, 'Pop accompaniment: LH root, RH triad', 'ליווי פופ: שורש ביד שמאל, משולש ביד ימין', [fs('kf-pop', 'RL', { perBeat: 0.5 }), fs('kf-pop', 'RL', { option: 1 })], CGF, [56, 92]),
    ],
  };
}

/** Graded sight-reading at the piano: fifteen levels (AUDIT-7: 11–15 added), new melodies every level in every key. */
export function keysReadFamily(): FamilyDef {
  const fam: FamilyId = 'k-read';
  const sp = (kind: string, hands: SpecTemplate['hands'], option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands, option, ...o });
  const four = (kind: string, hs: SpecTemplate['hands'][], o: Partial<SpecTemplate> = {}): SpecTemplate[] => hs.map((h, i) => sp(kind, h, i, o));
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })), keys, tempo });
  const MINOR = all12([9, 4, 2]);
  return {
    id: fam,
    title: t('Sight-reading', 'קריאה מהדף'),
    style: 'both',
    levels: [
      L(1, 'Five-finger reading, each hand', 'קריאה בחמש אצבעות, כל יד', four('kr-five', ['R', 'L', 'R', 'L']), CGF, [56, 84]),
      L(2, 'Five fingers with 8ths and rests', 'חמש אצבעות עם שמיניות והפסקות', four('kr-five8', ['R', 'L', 'R', 'L']), CGF, [56, 84]),
      L(3, 'Position shifts', 'מעברי עמדה', four('kr-shift', ['R', 'R', 'L', 'R']), CGF, [56, 88]),
      L(4, 'Both hands: melody over held notes', 'שתי ידיים: מנגינה מעל צלילים מוחזקים', four('kr-held', ['RL', 'RL', 'RL', 'RL']), CGF, [56, 84]),
      L(5, 'Both hands: melody over a moving bass', 'שתי ידיים: מנגינה מעל בס נע', four('kr-bass', ['RL', 'RL', 'RL', 'RL']), CGF, [56, 88]),
      L(6, 'Keys with sharps and flats, accidentals', 'סולמות עם דיאזים ובמולים, סימני שינוי', four('kr-acc', ['R', 'L', 'R', 'R']), all12([2, 10, 9, 3]), [56, 88]),
      L(7, 'Minor keys, both hands', 'סולמות מינוריים, שתי ידיים', four('kr-minor', ['RL', 'RL', 'RL', 'RL'], { minor: true }), MINOR, [56, 84]),
      L(8, 'Left-hand chords under the melody', 'אקורדים ביד שמאל מתחת למנגינה', four('kr-lhchords', ['RL', 'RL', 'RL', 'RL']), CGF, [56, 88]),
      L(9, 'Right-hand double notes over a bass', 'צלילים כפולים ביד ימין מעל בס', four('kr-rhchords', ['RL', 'RL', 'RL', 'RL']), CGF, [56, 84]),
      L(10, 'Quick study: 3/4 and 6/8, a 30-second look', 'לימוד מהיר: 3/4 ו־6/8, הצצה של 30 שניות', four('kr-quick', ['RL', 'RL', 'RL', 'RL']).map((x) => ((x.option ?? 0) % 2 ? { ...x, tempo: 120 } : x)), all12([0, 7, 5, 2, 10]), [56, 92]),
      // AUDIT-7 #4: grades 7–8 and the RSL quick study (keysRead2.ts), 1450–1800 on the path.
      L(11, 'Four voices: a chorale texture', 'ארבעה קולות: מרקם של כוראל', four('kr-four', ['RL', 'RL', 'RL', 'RL']), all12([0, 7, 5]), [50, 76]),
      L(12, 'Written-out ornaments: mordents, turns, a trill', 'קישוטים כתובים: מורדנטים, גרופטו, טריל', four('kr-orn', ['RL', 'RL', 'RL', 'RL']), all12([7, 2, 0]), [44, 72]),
      L(13, 'Changing metres: 4/4, 3/4 and 2/4', 'משקלים מתחלפים: 4/4, 3/4 ו־2/4', four('kr-meter', ['RL', 'RL', 'RL', 'RL']), all12([0, 5, 7]), [56, 92]),
      L(14, 'A lead sheet with band hits', 'דף אקורדים עם מכות להקה', [0, 1, 2].map((o) => sp('kr-lead', 'RL', o)), all12([5, 10, 0]), [60, 100]),
      L(15, 'Quick study: any key, a 30-second look', 'לימוד מהיר: כל סולם, הצצה של 30 שניות', [sp('kr-quick2', 'RL', 0), sp('kr-quick2', 'RL', 1), sp('kr-quick2', 'RL', 2, { minor: true }), sp('kr-quick2', 'RL', 3, { minor: true })], all12([2, 10, 4, 8]), [56, 96]),
    ],
  };
}
