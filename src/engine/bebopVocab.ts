// Bebop vocabulary (docs/AUDIT-GAPS-2.md High #1, #2, #3, #7, #8, #10; Medium #9): the music shared by the keys
// family k-vocab, the guitar family g-bebop and the bass family b-bebop. Pure and deterministic: every line is built
// from rules (chord tones, chord scales, the named approach or enclosure), never copied.
//
//   · approach notes into a chord tone: a half step below / above, two half steps from below / above, the dominant
//     approach (the 5th above the target, or the 4th below);
//   · enclosures: half step above + below (either order), scale step above + half step below, the 4-note bebop
//     enclosure, the delayed resolution; on a held chord (every chord tone in turn) and through ii–V–I with the
//     targets on beat 1;
//   · Barry Harris: "make it minor" (the m6 a 5th above the V, over the V), the 3–♭9 cell, the triplet rules;
//   · digital patterns and rule-based bebop lines over forms (minor ii–V, altered, blues, rhythm changes A and the
//     bridge, turnarounds), on the k-bebop line generator;
//   · time: swing 8ths with the click on 2 & 4, lines and comping with the gap click and the click on the "and".
//
// Pitches are MIDI in the register the caller gives (lo–hi); beats are quarter notes from beat 0.

import { bebopLine } from './drills/generate';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

// ───────────────────────────── chords ─────────────────────────────

export type VQ = 'maj7' | '6' | 'm7' | 'm6' | '7' | '7b9' | 'alt' | 'hd7' | 'dim7';
/** Chord tones (the targets) and the chord scale, above the root; the chart symbol. */
export const VQ_DEF: Record<VQ, { ct: number[]; sc: number[]; sym: string }> = {
  maj7: { ct: [0, 4, 7, 11], sc: [0, 2, 4, 5, 7, 9, 11], sym: 'maj7' },
  '6': { ct: [0, 4, 7, 9], sc: [0, 2, 4, 5, 7, 9, 11], sym: '6' },
  m7: { ct: [0, 3, 7, 10], sc: [0, 2, 3, 5, 7, 9, 10], sym: 'm7' },
  m6: { ct: [0, 3, 7, 9], sc: [0, 2, 3, 5, 7, 9, 11], sym: 'm6' },
  '7': { ct: [0, 4, 7, 10], sc: [0, 2, 4, 5, 7, 9, 10], sym: '7' },
  // The ♭9 is a target too (after the four chord tones, so ct[1] / ct[3] stay the guide tones).
  '7b9': { ct: [0, 4, 7, 10, 1], sc: [0, 1, 4, 5, 7, 8, 10], sym: '7♭9' },
  alt: { ct: [0, 4, 10, 1, 3, 8], sc: [0, 1, 3, 4, 6, 8, 10], sym: '7alt' },
  hd7: { ct: [0, 3, 6, 10], sc: [0, 2, 3, 5, 6, 8, 10], sym: 'm7♭5' },
  dim7: { ct: [0, 3, 6, 9], sc: [0, 2, 3, 5, 6, 8, 9, 11], sym: '°7' },
};
export interface VChord {
  /** Root pitch class. */
  r: number;
  q: VQ;
  beats: number;
}
/** One note of a line; `ct` = a chord tone or target the grader expects on its beat. */
export interface VN {
  p: number;
  beat: number;
  dur: number;
  ct: boolean;
}
export interface VLine {
  notes: VN[];
  /** Chord symbols, one entry per bar (two chords in a bar joined by a space). */
  chart: string[];
  minor?: boolean;
}
/** Sharp keys (major tonics G D A E B F♯) spell roots with sharps; the rest with flats. */
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const SHARP_HOMES = [7, 2, 9, 4, 11, 6];
const rootName = (pc: number, home: number): string => (SHARP_HOMES.includes(mod12(home)) ? SHARP_NAMES : NAMES)[mod12(pc)];
/** A chord symbol spelled for its key (`home` = the major tonic; a minor key passes its relative major). */
const chordName = (c: VChord, home: number): string => rootName(c.r, home) + VQ_DEF[c.q].sym;
/** The chart of a chord list: the chords of each bar (`home` = the major tonic the names are spelled in). */
export function chartOf(chords: VChord[], home: number, meter = 4): string[] {
  const bars: string[][] = [];
  let at = 0;
  for (const c of chords) {
    const bar = Math.floor(at / meter + 1e-9);
    (bars[bar] ??= []).push(chordName(c, home));
    at += c.beats;
  }
  return Array.from({ length: bars.length }, (_, i) => (bars[i] ? bars[i].join(' ') : '%'));
}
const ctPcs = (c: VChord): number[] => VQ_DEF[c.q].ct.map((x) => mod12(c.r + x));
const scPcs = (c: VChord): number[] => VQ_DEF[c.q].sc.map((x) => mod12(c.r + x));
/** The pitch of pitch class `pc` nearest `near` inside lo–hi. */
export function nearestPc(pc: number, near: number, lo: number, hi: number): number {
  let best = NaN;
  for (let q = lo; q <= hi; q++) if (mod12(q) === mod12(pc) && (Number.isNaN(best) || Math.abs(q - near) < Math.abs(best - near))) best = q;
  return best;
}
/** Every pitch of a pitch-class set inside lo–hi, rising. */
const pitchesOf = (pcs: number[], lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let q = lo; q <= hi; q++) if (pcs.includes(mod12(q))) out.push(q);
  return out;
};

// ───────────────────────────── approach notes and enclosures ─────────────────────────────

export type LeadId = 'chr-below' | 'chr-above' | 'dbl-below' | 'dbl-above' | 'dominant' | 'enc-ab' | 'enc-ba' | 'enc-step' | 'enc-bebop' | 'enc-delayed';
export const LEAD_NAME: Record<LeadId, T2> = {
  'chr-below': t('half step below', 'חצי טון מתחת'),
  'chr-above': t('half step above', 'חצי טון מעל'),
  'dbl-below': t('two half steps from below', 'שני חצאי טונים מלמטה'),
  'dbl-above': t('two half steps from above', 'שני חצאי טונים מלמעלה'),
  dominant: t('the dominant approach (a 5th above)', 'גישה דומיננטית (קווינטה מעל)'),
  'enc-ab': t('half step above, half step below', 'חצי טון מעל, חצי טון מתחת'),
  'enc-ba': t('half step below, half step above', 'חצי טון מתחת, חצי טון מעל'),
  'enc-step': t('scale step above, half step below', 'צעד בסולם מעל, חצי טון מתחת'),
  'enc-bebop': t('the 4-note bebop enclosure', 'כיתור ביבופ בארבעה צלילים'),
  'enc-delayed': t('delayed resolution', 'פתרון מושהה'),
};
/** The scale tone directly above `target` (pitch classes of the chord scale). */
export function scaleAbove(target: number, scale: number[]): number {
  let q = target + 1;
  while (!scale.includes(mod12(q))) q++;
  return q;
}
/**
 * The notes before a target, in order (the target itself follows on the beat). Approach notes: one or two half steps
 * from below / above, or the dominant approach (the 5th above, the 4th below when the 5th is out of range).
 * Enclosures: half step above + below (or below + above); scale step above + half step below; the 4-note bebop
 * enclosure (whole step above, half step above, half step below); the delayed resolution (half step above, half step
 * below, a step lower, back to the half step below).
 */
export function leadIn(id: LeadId, target: number, scale: number[], hi = 127): number[] {
  const T = target;
  switch (id) {
    case 'chr-below':
      return [T - 1];
    case 'chr-above':
      return [T + 1];
    case 'dbl-below':
      return [T - 2, T - 1];
    case 'dbl-above':
      return [T + 2, T + 1];
    case 'dominant':
      return [T + 7 <= hi ? T + 7 : T - 5];
    case 'enc-ab':
      return [T + 1, T - 1];
    case 'enc-ba':
      return [T - 1, T + 1];
    case 'enc-step':
      return [scaleAbove(T, scale), T - 1];
    case 'enc-bebop':
      return [T + 2, T + 1, T - 1];
    case 'enc-delayed':
      return [T + 1, T - 1, T - 2, T - 1];
  }
}

/** One item of the approach / enclosure levels (options index this list; append only — item ids). */
export interface LeadItem {
  leads: LeadId[];
  /** A held chord (every chord tone in turn), or ii–V–I / minor ii–V–i with the target on beat 1 of each bar. */
  ctx: 'held' | '251' | 'm251';
  /** Through ii–V–I: the chord tone targeted (0 root, 1 3rd, 2 5th, 3 7th) or 'guide' (the nearer of 3rd and 7th). */
  tgt?: number | 'guide';
}
export const LEAD_ITEMS: LeadItem[] = [
  /* 0 */ { leads: ['chr-below'], ctx: 'held' },
  /* 1 */ { leads: ['chr-above'], ctx: 'held' },
  /* 2 */ { leads: ['chr-below'], ctx: '251', tgt: 1 },
  /* 3 */ { leads: ['chr-above'], ctx: '251', tgt: 3 },
  /* 4 */ { leads: ['dbl-below'], ctx: 'held' },
  /* 5 */ { leads: ['dbl-above'], ctx: 'held' },
  /* 6 */ { leads: ['dominant'], ctx: 'held' },
  /* 7 */ { leads: ['dbl-below', 'dbl-above', 'dominant'], ctx: '251', tgt: 'guide' },
  /* 8 */ { leads: ['enc-ab'], ctx: 'held' },
  /* 9 */ { leads: ['enc-ba'], ctx: 'held' },
  /* 10 */ { leads: ['enc-ab', 'enc-ba'], ctx: '251', tgt: 1 },
  /* 11 */ { leads: ['enc-step'], ctx: 'held' },
  /* 12 */ { leads: ['enc-step'], ctx: '251', tgt: 'guide' },
  /* 13 */ { leads: ['enc-step'], ctx: 'm251', tgt: 1 },
  /* 14 */ { leads: ['dbl-above'], ctx: '251', tgt: 1 },
  /* 15 */ { leads: ['dbl-below'], ctx: '251', tgt: 3 },
  /* 16 */ { leads: ['enc-bebop'], ctx: 'held' },
  /* 17 */ { leads: ['enc-delayed'], ctx: 'held' },
  /* 18 */ { leads: ['enc-bebop', 'enc-delayed'], ctx: '251', tgt: 'guide' },
  /* 19 */ { leads: ['enc-ab'], ctx: '251', tgt: 0 },
  /* 20 */ { leads: ['enc-step'], ctx: '251', tgt: 1 },
  /* 21 */ { leads: ['enc-ba'], ctx: '251', tgt: 2 },
  /* 22 */ { leads: ['enc-step', 'enc-ab'], ctx: '251', tgt: 3 },
  /* 23 */ { leads: ['enc-step', 'enc-ba', 'enc-bebop'], ctx: 'm251', tgt: 'guide' },
];
const TGT_NAME: T2[] = [t('roots', 'שורשים'), t('3rds', 'טרצות'), t('5ths', 'קווינטות'), t('7ths', 'ספטימות'), t('3rds and 7ths', 'טרצות וספטימות')];
const joinT = (xs: T2[], en: string, he: string): T2 => t(xs.map((x) => x.en).join(en), xs.map((x) => x.he).join(he));
/** The item's name (no key). */
export function leadItemName(it: LeadItem): T2 {
  const how = joinT(it.leads.map((l) => LEAD_NAME[l]), ' / ', ' / ');
  if (it.ctx === 'held') return t(`Into each chord tone: ${how.en}`, `אל כל צליל באקורד: ${how.he}`);
  const tg = TGT_NAME[it.tgt === 'guide' ? 4 : (it.tgt ?? 1)];
  const prog = it.ctx === 'm251' ? t('Minor ii–V–i', 'ii–V–i מינורי') : t('ii–V–I', 'ii–V–I');
  return t(`${prog.en} into the ${tg.en}: ${how.en}`, `${prog.he} אל ה${tg.he}: ${how.he}`);
}

const II_V_I: [number, VQ][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7'], [2, 'm7'], [7, '7'], [0, 'maj7']];
const II_V_I_MINOR: [number, VQ][] = [[2, 'hd7'], [7, '7b9'], [0, 'm6'], [0, 'm6'], [2, 'hd7'], [7, '7b9'], [0, 'm6']];
const barChords = (key: number, bars: [number, VQ][]): VChord[] => bars.map(([d, q]) => ({ r: mod12(key + d), q, beats: 4 }));

/**
 * On a held chord (the key's maj7, m6 in minor): every chord tone in turn, up an octave and back (1 3 5 7 8 7 5 3 1),
 * each reached by the lead-in on the beat. One or two lead-in notes: a target every 2 beats; three or four: every 3.
 * The first target has no lead-in; the line has no rests.
 */
export function heldLine(key: number, leads: LeadId[], lo: number, hi: number, minor = false): VLine {
  const c: VChord = { r: mod12(key), q: minor ? 'm6' : 'maj7', beats: 4 };
  const ct = VQ_DEF[c.q].ct;
  const sc = scPcs(c);
  let root = lo + 2 + mod12(c.r - (lo + 2));
  if (root + 12 > hi - 4) root -= 12;
  const degs = [0, 1, 2, 3, 4, 3, 2, 1, 0];
  const targets = degs.map((d) => root + (d < 4 ? ct[d] : 12 + ct[d - 4]));
  const notes: VN[] = [];
  let at = 0;
  targets.forEach((T, i) => {
    const next = targets[i + 1];
    if (next === undefined) {
      notes.push({ p: T, beat: at, dur: 2, ct: true });
      at += 2;
      return;
    }
    const lead = leadIn(leads[i % leads.length], next, sc, hi);
    const cell = lead.length <= 2 ? 2 : 3;
    notes.push({ p: T, beat: at, dur: cell - lead.length / 2, ct: true });
    lead.forEach((p, k) => notes.push({ p, beat: at + cell - (lead.length - k) / 2, dur: 0.5, ct: false }));
    at += cell;
  });
  const bars = Math.ceil(at / 4);
  return { notes, chart: Array.from({ length: bars }, () => chordName(c, minor ? key + 3 : key)), minor };
}

/**
 * Through ii–V–I (or minor ii–V–i), one chord a bar, twice: the target chord tone on beat 1 of every bar, reached by
 * the lead-in at the end of the bar before; between, the chord's arpeggio in 8ths heading for the lead-in. The last
 * target is held a bar.
 */
export function targetLine(key: number, it: LeadItem, lo: number, hi: number): VLine {
  const minor = it.ctx === 'm251';
  const chords = barChords(key, minor ? II_V_I_MINOR : II_V_I);
  const tlo = lo + 3;
  const thi = hi - 3;
  // Targets first (each near the one before), then the lead-ins, then the arpeggios between.
  const targets: number[] = [];
  let prev = Math.round((lo + hi) / 2);
  chords.forEach((c) => {
    const ct = VQ_DEF[c.q].ct;
    let pcs: number[];
    if (it.tgt === 'guide') pcs = [ct[1], ct[3]].map((x) => mod12(c.r + x));
    else pcs = [mod12(c.r + ct[it.tgt ?? 1])];
    const cands = pcs.map((pc) => nearestPc(pc, prev, tlo, thi));
    // Guide tones: the nearer one (a 7th falls to the next 3rd), but never the same pitch again.
    const T = cands.filter((x) => x !== prev).reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a), cands[0]);
    targets.push(T);
    prev = T;
  });
  const notes: VN[] = [];
  chords.forEach((c, i) => {
    const T = targets[i];
    const bar = i * 4;
    if (i === chords.length - 1) {
      notes.push({ p: T, beat: bar, dur: 4, ct: true });
      return;
    }
    const next = targets[i + 1];
    const lead = leadIn(it.leads[i % it.leads.length], next, scPcs(chords[i + 1]), hi);
    const fill = 7 - lead.length;
    const line = arpPath(pitchesOf(ctPcs(c), lo, hi), T, fill, lead[0]);
    line.forEach((p, k) => notes.push({ p, beat: bar + k / 2, dur: 0.5, ct: true }));
    lead.forEach((p, k) => notes.push({ p, beat: bar + (8 - lead.length + k) / 2, dur: 0.5, ct: false }));
  });
  return { notes, chart: chartOf(chords, minor ? key + 3 : key), minor };
}

/**
 * The arpeggio between a target and the next lead-in: `fill` chord tones after the target, one run with at most one
 * turn, chosen to end a step or a 3rd from the lead-in's first note (never on it), without see-sawing (A B A B).
 */
export function arpPath(arp: number[], T: number, fill: number, to: number): number[] {
  const i0 = arp.indexOf(T);
  let best: number[] = [T];
  let cost = Infinity;
  for (const d0 of [1, -1])
    for (let turn = 0; turn <= fill; turn++) {
      const idx = [i0];
      for (let k = 1; k <= fill; k++) idx.push(idx[k - 1] + (k <= turn ? d0 : -d0));
      if (idx.some((i) => i < 0 || i >= arp.length)) continue;
      const ps = idx.map((i) => arp[i]);
      const last = ps[ps.length - 1];
      if (fill > 0 && last === to) continue;
      const gap = Math.abs(last - to);
      const seesaw = ps.filter((p, k) => k >= 2 && p === ps[k - 2]).length;
      const c = (gap <= 4 ? 0 : gap - 4) + 3 * seesaw + (turn > 0 && turn < fill ? 0.5 : 0);
      if (c < cost) {
        cost = c;
        best = ps;
      }
    }
  return best;
}

/** An approach / enclosure item's line. */
export function leadItemLine(key: number, op: number, lo: number, hi: number): VLine {
  const it = LEAD_ITEMS[op % LEAD_ITEMS.length];
  return it.ctx === 'held' ? heldLine(key, it.leads, lo, hi) : targetLine(key, it, lo, hi);
}

// ───────────────────────────── Barry Harris: 3–♭9, make it minor, triplets ─────────────────────────────

/** Fit relative pitches (semitones above an anchor) into lo–hi by octaves, centred. */
function fit(rel: number[], lo: number, hi: number): number[] {
  const mn = Math.min(...rel);
  const mx = Math.max(...rel);
  const centre = (lo + hi) / 2 - (mn + mx) / 2;
  const shift = Math.round(centre / 12) * 12;
  let out = rel.map((x) => x + shift);
  while (Math.max(...out) > hi) out = out.map((x) => x - 12);
  while (Math.min(...out) < lo) out = out.map((x) => x + 12);
  return out;
}
/** 8ths from beat `b0`, chord tones flagged by the chord at each note's bar. */
function eighthsOver(ps: number[], chords: VChord[], b0 = 0, lastDur = 0.5): VN[] {
  return ps.map((p, i) => {
    const beat = b0 + i / 2;
    return { p, beat, dur: i === ps.length - 1 ? lastDur : 0.5, ct: ctPcs(chordAt(chords, beat)).includes(mod12(p)) };
  });
}
function chordAt(chords: VChord[], beat: number): VChord {
  let at = 0;
  for (const c of chords) {
    if (beat < at + c.beats - 1e-9) return c;
    at += c.beats;
  }
  return chords[chords.length - 1];
}

/**
 * The 3–♭9 cell (Medium #9): over V7, 3–5–7–♭9 (the diminished 7th a 3rd above the root), the ♭9 falling to the 5th of
 * I. Op 0 major ii–V–I (the ii with "3 to 9"); op 1 minor ii–V–i (the ii with "3 to ♭9"). The I gets 5, 3, 1.
 */
export function cell3b9(key: number, op: number, lo: number, hi: number): VLine {
  const minor = op % 2 === 1;
  const chords: VChord[] = [
    { r: mod12(key + 2), q: minor ? 'hd7' : 'm7', beats: 4 },
    { r: mod12(key + 7), q: minor ? '7b9' : '7', beats: 4 },
    { r: mod12(key), q: minor ? 'm6' : 'maj7', beats: 4 },
  ];
  // Semitones above the key's tonic (ii = +2, V = +7, I = +12).
  const ii = minor ? [3, 6, 10, 13, 12, 10, 6, 5] : [3, 7, 10, 14, 12, 10, 7, 5];
  const V = [10, 7, 4, 0, 4, 7, 10, 13];
  const I = [7, minor ? 3 : 4, 0];
  const rel = [...ii.map((x) => key + 2 + x), ...V.map((x) => key + 7 + x - 12), ...I.map((x) => key + x)];
  const ps = fit(rel, lo, hi);
  const notes = eighthsOver(ps.slice(0, 16), chords);
  notes.push({ p: ps[16], beat: 8, dur: 2, ct: true }, { p: ps[17], beat: 10, dur: 1, ct: true }, { p: ps[18], beat: 11, dur: 1, ct: true });
  return { notes, chart: chartOf(chords, minor ? key + 3 : key), minor };
}

/**
 * "Make it minor" (High #7): over the V7, play the minor 6th chord a 5th above it (over G7, D minor: D F A B = 5, ♭7,
 * 9, 3 of G — a G9 without the root). Op 0: the ii in its scale, then the m6 arpeggio over the V; op 1: the ii down
 * its scale, then the same notes as the m7♭5 on the V's 3rd (B D F A over G7). The I lands on its 3rd.
 */
export function makeItMinor(key: number, op: number, lo: number, hi: number): VLine {
  const chords: VChord[] = [
    { r: mod12(key + 2), q: 'm7', beats: 4 },
    { r: mod12(key + 7), q: '7', beats: 4 },
    { r: mod12(key), q: 'maj7', beats: 4 },
  ];
  // Semitones above the ii root (D in C): the m6 a 5th above the V is the ii's own minor.
  const ii = op % 2 ? [10, 9, 7, 5, 3, 2, 0, -2] : [0, 2, 3, 5, 7, 9, 10, 12];
  const V = op % 2 ? [-3, 0, 3, 7, 9, 7, 3, 0] : [9, 7, 3, 0, 3, 7, 9, 12];
  // The I's 3rd: E in C = the ii root + 2.
  const land = (op % 2 ? 0 : 12) + 2;
  const rel = [...ii, ...V, land].map((x) => x + key + 2);
  const ps = fit(rel, lo, hi);
  const notes = eighthsOver(ps.slice(0, 16), chords);
  notes.push({ p: ps[16], beat: 8, dur: 4, ct: true });
  return { notes, chart: chartOf(chords, key), minor: false };
}

/**
 * Barry Harris's triplet rules (High #8): a dominant (or ii–V) line down the chord scale in 8ths with a chord tone on
 * every beat; where two scale steps down would put a non-chord tone on the next beat, a triplet down the scale (three
 * notes in the beat) reaches the next chord tone instead — from the root (G F E → D over G7), and on op 1 from the
 * 3rd too (B A G → F). The line breaks up an octave at the bottom of the range (a pivot) and lands on a chord tone of I.
 * Op 0: two bars of V7; op 1: ii–V, a bar each.
 */
export function tripletLine(key: number, op: number, lo: number, hi: number): VLine {
  const V: VChord = { r: mod12(key + 7), q: '7', beats: 4 };
  const ii: VChord = { r: mod12(key + 2), q: 'm7', beats: 4 };
  const I: VChord = { r: mod12(key), q: 'maj7', beats: 4 };
  const chords = op % 2 ? [ii, V, I] : [{ ...V, beats: 8 }, I];
  const notes: VN[] = [];
  // Start on the V's (or ii's) root, high in the range.
  let p = nearestPc(chords[0].r, hi - 3, lo, hi - 2);
  const lineBeats = chords[0].beats + (op % 2 ? 4 : 0);
  for (let b = 0; b < lineBeats; b++) {
    const c = chordAt(chords, b);
    const nextC = chordAt(chords, b + 1);
    const sc = pitchesOf(scPcs(c), lo - 12, hi);
    const below = (q: number, k: number) => sc.filter((x) => x < q).slice(-k)[0];
    const s1 = below(p, 1);
    const s2 = below(p, 2);
    const s3 = below(p, 3);
    // The last beat lands on the root, 3rd or 5th of I (not its 7th).
    const nct = b === lineBeats - 1 ? [0, 4, 7].map((x) => mod12(nextC.r + x)) : ctPcs(nextC);
    const isRoot = mod12(p - c.r) === 0;
    const is3 = VQ_DEF[c.q].ct[1] === mod12(p - c.r);
    let next: number;
    if ((isRoot || (is3 && op % 2 === 1)) && nct.includes(mod12(s3))) {
      notes.push({ p, beat: b, dur: 1 / 3, ct: true }, { p: s1, beat: b + 1 / 3, dur: 1 / 3, ct: false }, { p: s2, beat: b + 2 / 3, dur: 1 / 3, ct: false });
      next = s3;
    } else if (nct.includes(mod12(s2))) {
      notes.push({ p, beat: b, dur: 0.5, ct: true }, { p: s1, beat: b + 0.5, dur: 0.5, ct: false });
      next = s2;
    } else if (nct.includes(mod12(s3))) {
      notes.push({ p, beat: b, dur: 1 / 3, ct: true }, { p: s1, beat: b + 1 / 3, dur: 1 / 3, ct: false }, { p: s2, beat: b + 2 / 3, dur: 1 / 3, ct: false });
      next = s3;
    } else {
      // Barry's half step: a chromatic passing note into the chord tone below.
      const tgt = pitchesOf(nct, lo - 12, p - 2).slice(-1)[0];
      notes.push({ p, beat: b, dur: 0.5, ct: true }, { p: tgt + 1, beat: b + 0.5, dur: 0.5, ct: false });
      next = tgt;
    }
    // Pivot: the next chord tone an octave up when the line runs low.
    if (next < lo + 2) next += 12;
    p = next;
  }
  // The landing: the chord tone of I the line arrived at, held.
  notes.push({ p, beat: lineBeats, dur: 4, ct: true });
  return { notes, chart: chartOf(chords, key) };
}

// ───────────────────────────── digital patterns, bebop lines over forms ─────────────────────────────

const DIGITS: { name: T2; up: (q: VQ) => number[] }[] = [
  { name: t('1-2-3-5', '1-2-3-5'), up: (q) => [0, 2, VQ_DEF[q].ct[1], 7] },
  { name: t('1-3-5-7', '1-3-5-7'), up: (q) => VQ_DEF[q].ct.slice(0, 4) },
  { name: t('5-3-2-1', '5-3-2-1'), up: (q) => [7, VQ_DEF[q].ct[1], 2, 0] },
  { name: t('7-5-3-1', '7-5-3-1'), up: (q) => VQ_DEF[q].ct.slice(0, 4).reverse() },
];
export const DIGIT_NAMES = DIGITS.map((d) => d.name);
/** Digital patterns through ii–V–I–VI7, two chords a bar, twice (op = the pattern): each cell from the root nearest the last note. */
export function digitalLine(key: number, op: number, lo: number, hi: number): VLine {
  const dg = DIGITS[op % DIGITS.length];
  const prog: [number, VQ][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, '7']];
  const chords: VChord[] = [...prog, ...prog].map(([d, q]) => ({ r: mod12(key + d), q, beats: 2 }));
  const notes: VN[] = [];
  let prev = Math.round(lo + (hi - lo) * 0.4);
  chords.forEach((c, i) => {
    const cell = dg.up(c.q);
    // The cell's root so that its first note sits nearest the last one, the whole cell in range.
    let root = nearestPc(c.r, prev - cell[0], lo, hi);
    while (root + Math.max(...cell) > hi) root -= 12;
    while (root + Math.min(...cell) < lo) root += 12;
    cell.forEach((x, k) => notes.push({ p: root + x, beat: i * 2 + k / 2, dur: 0.5, ct: VQ_DEF[c.q].ct.includes(x) }));
    prev = root + cell[cell.length - 1];
  });
  const end = nearestPc(mod12(key), prev, lo, hi);
  notes.push({ p: end, beat: chords.length * 2, dur: 2, ct: true });
  return { notes, chart: [...chartOf(chords, key), rootName(key, key) + 'maj7'] };
}

type FBar = [number, VQ][];
/** Forms for the bebop lines on guitar and bass (roots relative to the key), one or two chords a bar. Append only. */
export const LINE_FORMS: { name: T2; bars: FBar[]; minor?: boolean }[] = [
  { name: t('minor ii–V–i', 'ii–V–i מינורי'), bars: [[[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']], [[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']]], minor: true },
  { name: t('ii–V7alt–I', 'ii–V7alt–I'), bars: [[[2, 'm7']], [[7, 'alt']], [[0, 'maj7']], [[0, '6']], [[2, 'm7']], [[7, 'alt']], [[0, 'maj7']], [[0, '6']]] },
  {
    name: t('jazz blues', 'בלוז ג׳אז'),
    bars: [[[0, '7']], [[5, '7']], [[0, '7']], [[7, 'm7'], [0, '7']], [[5, '7']], [[6, 'dim7']], [[0, '7']], [[9, '7']], [[2, 'm7']], [[7, '7']], [[0, '7'], [9, '7']], [[2, 'm7'], [7, '7']]],
  },
  {
    name: t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A'),
    bars: [[[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, '7'], [0, '7']], [[5, 'maj7'], [6, 'dim7']], [[0, 'maj7'], [7, '7']], [[0, '6']]],
  },
  { name: t('rhythm changes, the bridge (III7–VI7–II7–V7)', 'ריתם צ׳יינג׳ס, הגשר (III7–VI7–II7–V7)'), bars: [[[4, '7']], [[4, '7']], [[9, '7']], [[9, '7']], [[2, '7']], [[2, '7']], [[7, '7']], [[7, '7']], [[0, '6']]] },
  { name: t('turnaround I–vi–ii–V', 'טרנאראונד I–vi–ii–V'), bars: [[[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']], [[0, '6']]] },
  { name: t('turnaround I–VI7–II7–V7', 'טרנאראונד I–VI7–II7–V7'), bars: [[[0, 'maj7'], [9, '7']], [[2, '7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, '7'], [7, '7']], [[0, '6']]] },
  { name: t('the tritone turnaround I–♭III7–♭VI7–♭II7', 'טרנאראונד הטריטון I–♭III7–♭VI7–♭II7'), bars: [[[0, 'maj7'], [3, '7']], [[8, '7'], [1, '7']], [[0, 'maj7'], [3, '7']], [[8, '7'], [1, '7']], [[0, '6']]] },
];
/** A bebop line over a form (the k-bebop generator: chord tones on the beats, approach notes into each change). */
export function formLine(key: number, op: number, lo: number, hi: number, seed: string): VLine & { name: T2 } {
  const f = LINE_FORMS[op % LINE_FORMS.length];
  const chords: VChord[] = f.bars.flatMap((bar) => bar.map(([d, q]) => ({ r: mod12(key + d), q, beats: 4 / bar.length })));
  const raw = bebopLine(chords, seed, { lo: lo + 1, hi: hi - 1, start: Math.round(lo + (hi - lo) * 0.7), triplets: false });
  const notes = raw.map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct }));
  return { notes, chart: chartOf(chords, f.minor ? key + 3 : key), minor: f.minor, name: f.name };
}

// ───────────────────────────── time: swing on 2 & 4, the gap click, the click on the "and" ─────────────────────────────

/** The on-ramp: a major scale (op 0) or the maj7 arpeggio (op 1) in swung 8ths, an octave up and back. */
export function swingOnRamp(key: number, op: number, lo: number, hi: number): VLine {
  let root = lo + 2 + mod12(key - (lo + 2));
  if (root + 12 > hi) root -= 12;
  const up = op % 2 ? [0, 4, 7, 11, 12, 16, 19, 23, 24] : [0, 2, 4, 5, 7, 9, 11, 12];
  const span = op % 2 ? up.filter((x) => root + x <= hi) : up;
  const seq = [...span, ...span.slice(0, -1).reverse()];
  const c: VChord = { r: mod12(key), q: 'maj7', beats: 4 };
  const notes: VN[] = seq.map((x, i) => ({ p: root + x, beat: i / 2, dur: i === seq.length - 1 ? 2 : 0.5, ct: VQ_DEF.maj7.ct.includes(mod12(x)) }));
  const bars = Math.ceil((seq.length / 2 + 1.5) / 4);
  return { notes, chart: Array.from({ length: bars }, () => chordName(c, key)) };
}

/** The time levels' items (options): which line or comp, which click. Append only. */
export const TIME_ITEMS: { what: 'scale' | 'arp' | 'line' | 'comp'; click: '24' | 'gap' | 'and'; name: T2 }[] = [
  { what: 'scale', click: '24', name: t('Swing 8ths, click on 2 and 4: the scale', 'שמיניות סווינג, קליק על 2 ו-4: הסולם') },
  { what: 'arp', click: '24', name: t('Swing 8ths, click on 2 and 4: the arpeggio', 'שמיניות סווינג, קליק על 2 ו-4: הארפג׳יו') },
  { what: 'line', click: '24', name: t('ii–V–I line, click on 2 and 4', 'קו ii–V–I, קליק על 2 ו-4') },
  { what: 'line', click: 'gap', name: t('ii–V–I line, the click drops out every 4th bar', 'קו ii–V–I, הקליק נעלם כל תיבה רביעית') },
  { what: 'line', click: 'and', name: t('ii–V–I line, click on the "and"', 'קו ii–V–I, קליק על ה"וְ"') },
  { what: 'comp', click: '24', name: t('Shells in the Charleston rhythm, click on 2 and 4', 'שלדים במקצב צ׳רלסטון, קליק על 2 ו-4') },
  { what: 'comp', click: 'gap', name: t('Shells four to the bar, the click drops out every 4th bar', 'שלדים ארבע לתיבה, הקליק נעלם כל תיבה רביעית') },
  { what: 'comp', click: 'and', name: t('Shells in half notes, click on the "and"', 'שלדים בחצאים, קליק על ה"וְ"') },
];
/** The gap click of the time levels: three bars with the click, one bar silent. */
export const TIME_GAP: [number, number] = [3, 1];
/** ii–V–I ×2 (8 bars) for the time lines and comps. */
export const TIME_CHORDS = (key: number): VChord[] => barChords(key, [...II_V_I, [0, 'maj7']]);
/** A ii–V–I bebop line over 8 bars (for the time items). */
export function timeLine(key: number, lo: number, hi: number, seed: string): VLine {
  const chords = TIME_CHORDS(key);
  const raw = bebopLine(chords, seed, { lo: lo + 1, hi: hi - 1, start: Math.round(lo + (hi - lo) * 0.7) });
  return { notes: raw.map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct })), chart: chartOf(chords, key) };
}
/** The comping rhythms of the time items (onset, length in beats, within a bar). */
const COMP_RHYTHMS: [number, number][][] = [
  // Charleston: beat 1 and the "and" of 2.
  [[0, 1.5], [1.5, 2.5]],
  // Four to the bar.
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  // Half notes on 1 and 3.
  [[0, 2], [2, 2]],
];
/**
 * Comping shells over 8 bars of ii–V–I: root, 7th, 3rd an octave up (each root within lo–(lo + 11)), in a rhythm:
 * 0 Charleston, 1 four to the bar, 2 half notes.
 */
export function compShells(key: number, lo: number, rhythm = 0): { beat: number; dur: number; v: number[] }[] {
  const out: { beat: number; dur: number; v: number[] }[] = [];
  TIME_CHORDS(key).forEach((c, i) => {
    const ct = VQ_DEF[c.q].ct;
    const root = lo + mod12(c.r - lo);
    const v = [root, root + ct[3], root + 12 + ct[1]];
    for (const [b, d] of COMP_RHYTHMS[rhythm % COMP_RHYTHMS.length]) out.push({ beat: i * 4 + b, dur: d, v });
  });
  return out;
}
