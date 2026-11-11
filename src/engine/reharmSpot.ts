// Reharm Spotter (GAMES_TIERS_PLAN §4, 0.70): a progression, then the same progression with ONE bar (a 2-bar span at
// ff) reharmonised. Tap the bar that changed, then name the substitution. Streak with 3 lives. Own material: the
// progressions and the substitutions are built from rules. Pure and seeded: the same seed and case index give the
// same case, so a saved run resumes exactly.
//   Level 1 (mp) diatonic swaps · 2 (mf) secondary dominants, backdoor, a related ii · 3 (f) tritone subs, borrowed
//   chords · 4 (ff) inserted ii–V chains, chromatic planing, Coltrane substitution, chromatic dominants (2-bar spans).

import type { JQId } from './topicsJazzEar';
import { rng } from './topicKit';
import type { DynName } from './courseSocial';

/** A chord: degree above the key (semitones), quality, beats. */
export type RChord = [number, JQId, number];
export type RBar = RChord[];
type Bi = { en: string; he: string };
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const one = (d: number, q: JQId): RBar => [[mod12(d), q, 4]];
const two = (a: number, qa: JQId, b: number, qb: JQId): RBar => [
  [mod12(a), qa, 2],
  [mod12(b), qb, 2],
];

/** 4-bar originals; 8-bar originals are two of them. */
export const BASES: RBar[][] = [
  [one(0, 'maj7'), one(9, 'm7'), one(2, 'm7'), one(7, 'dom7')], // I vi ii V
  [one(0, 'maj7'), one(5, 'maj7'), two(2, 'm7', 7, 'dom7'), one(0, 'maj7')], // I IV ii–V I
  [one(0, 'maj7'), one(4, 'm7'), one(5, 'maj7'), one(7, 'dom7')], // I iii IV V
  [one(2, 'm7'), one(7, 'dom7'), one(0, 'maj7'), one(0, 'maj7')], // ii V I I
  [one(0, 'maj7'), one(9, 'm7'), one(5, 'maj7'), one(7, 'dom7')], // I vi IV V
];

export type SubKind =
  | 'iii-for-I'
  | 'vi-for-I'
  | 'ii-for-IV'
  | 'IV-for-ii'
  | 'secdom'
  | 'backdoor'
  | 'related-ii'
  | 'tritone'
  | 'borrowed-iv'
  | 'borrowed-bVI'
  | 'borrowed-bVII'
  | 'iiv-chain'
  | 'planing'
  | 'coltrane'
  | 'chromatic-doms';

export const SUB_NAMES: Record<SubKind, Bi> = {
  'iii-for-I': { en: 'iii for I', he: 'iii במקום I' },
  'vi-for-I': { en: 'vi for I', he: 'vi במקום I' },
  'ii-for-IV': { en: 'ii for IV', he: 'ii במקום IV' },
  'IV-for-ii': { en: 'IV for ii', he: 'IV במקום ii' },
  secdom: { en: 'Secondary dominant', he: 'דומיננטה משנית' },
  backdoor: { en: 'Backdoor (iv–♭VII7)', he: 'דלת אחורית (iv–♭VII7)' },
  'related-ii': { en: 'Related ii added', he: 'נוסף ii קשור' },
  tritone: { en: 'Tritone sub', he: 'תחליף טריטון' },
  'borrowed-iv': { en: 'Borrowed iv (minor)', he: 'iv שאול (מינורי)' },
  'borrowed-bVI': { en: 'Borrowed ♭VI', he: '♭VI שאול' },
  'borrowed-bVII': { en: 'Borrowed ♭VII7', he: '♭VII7 שאול' },
  'iiv-chain': { en: 'Inserted ii–V chain', he: 'שרשרת ii–V שנוספה' },
  planing: { en: 'Chromatic planing', he: 'הקבלה כרומטית' },
  coltrane: { en: 'Coltrane substitution', he: 'תחליף קולטריין' },
  'chromatic-doms': { en: 'Chromatic dominants', he: 'דומיננטות כרומטיות' },
};

/** The four names each level asks about (every level's pool is exactly the four options). */
export const LEVEL_SUBS: SubKind[][] = [
  ['iii-for-I', 'vi-for-I', 'ii-for-IV', 'IV-for-ii'],
  ['secdom', 'backdoor', 'related-ii', 'vi-for-I'],
  ['tritone', 'borrowed-iv', 'borrowed-bVI', 'borrowed-bVII'],
  ['iiv-chain', 'planing', 'coltrane', 'chromatic-doms'],
];
/** Level 4 replaces a 2-bar span; the others one bar. */
export const spanOf = (level: number) => (level >= 4 ? 2 : 1);

const isOne = (b: RBar, d: number, q: JQId) => b.length === 1 && b[0][0] === mod12(d) && b[0][1] === q;
const root = (b: RBar) => b[0][0];

/** Apply a one-bar substitution to bar `b` (null when it does not apply there). */
function subBar(kind: SubKind, b: RBar): RBar | null {
  switch (kind) {
    case 'iii-for-I':
      return isOne(b, 0, 'maj7') ? one(4, 'm7') : null;
    case 'vi-for-I':
      return isOne(b, 0, 'maj7') ? one(9, 'm7') : null;
    case 'ii-for-IV':
      return isOne(b, 5, 'maj7') ? one(2, 'm7') : null;
    case 'IV-for-ii':
      return isOne(b, 2, 'm7') ? one(5, 'maj7') : null;
    case 'secdom':
      return b.length === 1 && b[0][1] === 'm7' ? one(root(b), 'dom7') : null;
    case 'backdoor':
      return isOne(b, 7, 'dom7') || (b.length === 2 && b[0][0] === 2 && b[1][0] === 7) ? two(5, 'm7', 10, 'dom7') : null;
    case 'related-ii':
      return isOne(b, 7, 'dom7') ? two(2, 'm7', 7, 'dom7') : null;
    case 'tritone':
      if (isOne(b, 7, 'dom7')) return one(1, 'dom7');
      if (b.length === 2 && b[1][1] === 'dom7') return [b[0], [mod12(b[1][0] + 6), 'dom7', 2]];
      return null;
    case 'borrowed-iv':
      return isOne(b, 5, 'maj7') ? one(5, 'm6') : null;
    case 'borrowed-bVI':
      return isOne(b, 9, 'm7') || isOne(b, 4, 'm7') ? one(8, 'maj7') : null;
    case 'borrowed-bVII':
      return isOne(b, 7, 'dom7') || isOne(b, 5, 'maj7') ? one(10, 'dom7') : null;
    default:
      return null;
  }
}

/** Apply a 2-bar substitution leading into the chord whose root is `t` (the bar after the span). */
function subSpan(kind: SubKind, a: RBar, b: RBar, t: number): [RBar, RBar] | null {
  switch (kind) {
    case 'iiv-chain':
      // two ii–Vs falling by whole steps into t
      return [two(t + 4, 'm7', t + 9, 'dom7'), two(t + 2, 'm7', t + 7, 'dom7')];
    case 'planing': {
      // each chord approached from a half step above, same quality
      const pa = a[0];
      const pb = b[0];
      return [two(pa[0] + 1, pa[1], pa[0], pa[1]), two(pb[0] + 1, pb[1], pb[0], pb[1])];
    }
    case 'coltrane':
      // the Giant Steps cycle into t: ♭III7–♭VI, VII7–III, V7 (of t)
      return [
        two(t + 3, 'dom7', t + 8, 'maj7'),
        [
          [mod12(t + 11), 'dom7', 1],
          [mod12(t + 4), 'maj7', 1],
          [mod12(t + 7), 'dom7', 2],
        ],
      ];
    case 'chromatic-doms':
      return [two(t + 3, 'dom7', t + 2, 'dom7'), one(t + 1, 'dom7')];
    default:
      return null;
  }
}

const sameBar = (x: RBar, y: RBar) => x.length === y.length && x.every((c, i) => c[0] === y[i][0] && c[1] === y[i][1] && c[2] === y[i][2]);

export interface ReharmCase {
  /** Key (pitch class of I). */
  key: number;
  bars: RBar[];
  reharm: RBar[];
  /** The bar indices that changed (1 bar, or a 2-bar span at level 4). */
  changed: number[];
  kind: SubKind;
  /** The four names offered, shuffled. */
  options: SubKind[];
}

function shuffle<T>(rnd: () => number, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Case `i` of a run (seeded). `bars` = 4 or 8. */
export function reharmCase(seed: number, i: number, level: number, bars = 4): ReharmCase {
  const lv = Math.max(1, Math.min(4, Math.round(level)));
  const rnd = rng((Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ lv) >>> 0);
  const pool = LEVEL_SUBS[lv - 1];
  const n = bars >= 8 ? 8 : 4;
  for (let attempt = 0; attempt < 80; attempt++) {
    const b1 = BASES[Math.floor(rnd() * BASES.length)];
    const base = n === 8 ? [...b1, ...BASES[Math.floor(rnd() * BASES.length)]] : b1;
    const kind = pool[Math.floor(rnd() * pool.length)];
    const key = Math.floor(rnd() * 12);
    if (spanOf(lv) === 2) {
      const starts = Array.from({ length: n - 2 }, (_, k) => k);
      const s = starts[Math.floor(rnd() * starts.length)];
      const r = subSpan(kind, base[s], base[s + 1], root(base[s + 2]));
      if (!r || sameBar(r[0], base[s]) || sameBar(r[1], base[s + 1])) continue;
      const reharm = base.slice();
      reharm[s] = r[0];
      reharm[s + 1] = r[1];
      return { key, bars: base, reharm, changed: [s, s + 1], kind, options: shuffle(rnd, pool) };
    }
    const spots = base.map((b, k) => ({ k, r: subBar(kind, b) })).filter((x) => x.r && !sameBar(x.r, base[x.k]));
    if (!spots.length) continue;
    const pick = spots[Math.floor(rnd() * spots.length)];
    const reharm = base.slice();
    reharm[pick.k] = pick.r!;
    return { key, bars: base, reharm, changed: [pick.k], kind, options: shuffle(rnd, pool) };
  }
  // unreachable in practice (every kind applies to some base); a safe fallback
  const base = BASES[0].slice(0, 4);
  const reharm = base.slice();
  reharm[3] = one(1, 'dom7');
  return { key: 0, bars: base, reharm, changed: [3], kind: 'tritone', options: LEVEL_SUBS[2] };
}

/** The chords of a progression as [degree, quality, beats] for jazzProgStim. */
export const flatBars = (bars: RBar[]): RChord[] => bars.flat();

/** Bars of a tier (4 at mp / mf, 8 at f / ff). */
export const tierBars = (t: DynName): number => (t === 'f' || t === 'ff' ? 8 : 4);
export const tierLevel = (t: DynName): number => (t === 'ff' ? 4 : t === 'f' ? 3 : t === 'mf' ? 2 : 1);

// ---------------------------------------------------------------- scoring and state

export const START_LIVES = 3;
/** Speed factor: 1.5 when answered within 4 s of the end of the playback, falling to 1 at 24 s. */
export const speedFactor = (ms: number) => 1 + 0.5 * Math.max(0, Math.min(1, 1 - (ms - 4000) / 20000));
/** Points of a case: the bar +5, the name +10, × speed. */
export function casePoints(barRight: boolean, nameRight: boolean, ms: number): number {
  return Math.round(((barRight ? 5 : 0) + (nameRight ? 10 : 0)) * speedFactor(ms));
}

export interface ReharmSave {
  v: 1;
  game: 'reharm';
  seed: number;
  tier: DynName;
  level: number;
  bars: number;
  /** Cases answered (= index of the current case). */
  i: number;
  lives: number;
  right: number;
  wrong: number;
  score: number;
  over: boolean;
}

export function newReharm(seed: number, tier: DynName, bars = tierBars(tier)): ReharmSave {
  return { v: 1, game: 'reharm', seed: seed >>> 0, tier, level: tierLevel(tier), bars, i: 0, lives: START_LIVES, right: 0, wrong: 0, score: 0, over: false };
}

/** Answer the current case: `bar` = the tapped bar index, `name` = the chosen kind, `ms` = time since playback ended. */
export function answerCase(s: ReharmSave, bar: number, name: SubKind, ms: number): { save: ReharmSave; barRight: boolean; nameRight: boolean; gained: number; c: ReharmCase } {
  const c = reharmCase(s.seed, s.i, s.level, s.bars);
  const barRight = c.changed.includes(bar);
  const nameRight = name === c.kind;
  const gained = casePoints(barRight, nameRight, ms);
  const ok = barRight && nameRight;
  const lives = ok ? s.lives : Math.max(0, s.lives - 1);
  const save: ReharmSave = { ...s, i: s.i + 1, score: s.score + gained, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), lives, over: lives === 0 };
  return { save, barRight, nameRight, gained, c };
}

export const reharmResult = (s: ReharmSave) => ({ game: 'reharm' as const, score: s.score, detail: { tier: s.tier, right: s.right, wrong: s.wrong, level: s.level } });

export function isReharmSave(x: unknown): x is ReharmSave {
  const s = x as ReharmSave | null;
  return !!s && s.v === 1 && s.game === 'reharm' && typeof s.seed === 'number' && typeof s.i === 'number' && !s.over && s.lives > 0;
}

/** A chord symbol in a key (for the reveal line): "D♭7". */
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const QSYM: Partial<Record<JQId, string>> = { maj7: 'maj7', dom7: '7', m7: 'm7', m7b5: 'm7♭5', m6: 'm6', dim7: '°7' };
export const chordSym = (key: number, c: RChord) => `${FLAT[mod12(key + c[0])]}${QSYM[c[1]] ?? c[1]}`;
export const barSym = (key: number, b: RBar) => b.map((c) => chordSym(key, c)).join(' ');
