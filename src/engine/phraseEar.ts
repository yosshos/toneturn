// Phrases by ear (owner 2026-11-14): the music of the phrase-playback ladder on piano, guitar and bass (k-phrase,
// g-phrase, b-phrase in src/engine/drills/phraseDrills.ts). Hear a phrase over its chords, play it back; graded note
// by note (pitch and rhythm, partial credit) by the transcription coach's comparer (transcribe.ts comparePhrase).
//
// The ladder (rating ≈ 1200 … 1900, one rung a level):
//   1 one bar of chord tones · 2 chromatic approach notes · 3 enclosures (every type in bebopVocab.ts) · 4 the bebop
//   scale's passing half step · 5 a two-bar line over ii–V–I · 6 altered tensions (♭9 / ♯9 / ♭13) on the V · 7 a
//   four-bar solo phrase · 8 eight bars over a form (the blues, rhythm changes A).
//
// Pure and deterministic (seeded per key and option): every phrase is built from rules — chord tones on the beats, the
// named approach or enclosure into a target on the beat, the bebop scales, the k-bebop line generator — never copied.
// Pitches are MIDI inside the register the caller gives (lo–hi); beats are quarter notes from beat 0.
//
// NOTE: bebopVocab.ts and drills/generate.ts sit in an import cycle with the drill modules: nothing here may call their
// exports at module top level (only inside functions).

import { VQ_DEF, chartOf, leadIn, mod12, type LeadId, type VChord, type VN, type VQ } from './bebopVocab';
import { bebopLine } from './drills/generate';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

/** A device the phrase contains (what the unit tests and the result screen point at). */
export interface PhraseDevice {
  kind: 'approach' | 'enclosure' | 'passing' | 'altered' | 'guide';
  /** The lead-in (LeadId), the passing tone ('bebop-dom' / 'bebop-maj') or the tension ('b9' / '#9' / 'b13'). */
  id: string;
  /** Index (into notes) of the note the device resolves to (the target), or of the passing / tension note itself. */
  at: number;
}
export interface EarPhrase {
  notes: VN[];
  chords: VChord[];
  /** The key the chord names are spelled in (a minor phrase: its relative major). */
  home: number;
  minor?: boolean;
  devices: PhraseDevice[];
  name: T2;
}

/** The phrase kinds, one per ladder level (append only: item ids). */
export const PHRASE_KINDS = ['ph-ct', 'ph-appr', 'ph-encl', 'ph-bebop', 'ph-251', 'ph-alt', 'ph-solo', 'ph-form'] as const;
export type PhraseKind = (typeof PHRASE_KINDS)[number];
/** The rating of each level (1-based level − 1). */
export const PHRASE_RATING = [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
/** Options of each kind (the variants a level practices in all 12 keys). */
export const PHRASE_OPTIONS: Record<PhraseKind, number> = { 'ph-ct': 3, 'ph-appr': 3, 'ph-encl': 5, 'ph-bebop': 3, 'ph-251': 2, 'ph-alt': 3, 'ph-solo': 2, 'ph-form': 2 };
/** Levels whose 8ths swing (the bebop rungs). */
export const PHRASE_SWING: Record<PhraseKind, boolean> = { 'ph-ct': false, 'ph-appr': false, 'ph-encl': true, 'ph-bebop': true, 'ph-251': true, 'ph-alt': true, 'ph-solo': true, 'ph-form': true };
/** Every enclosure type of the vocabulary (bebopVocab.ts LeadId 'enc-*'), in option order. */
export const ENCLOSURES: LeadId[] = ['enc-ab', 'enc-ba', 'enc-step', 'enc-bebop', 'enc-delayed'];
export const APPROACH_POOLS: LeadId[][] = [['chr-below', 'chr-above'], ['dbl-below', 'dbl-above'], ['chr-below', 'chr-above', 'dominant']];

export const levelOfKind = (kind: string): number => Math.max(1, PHRASE_KINDS.indexOf(kind as PhraseKind) + 1);

// ───────────────────────────── helpers ─────────────────────────────

function rngOf(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pickR = <X>(r: () => number, xs: readonly X[]): X => xs[Math.floor(r() * xs.length)];
const ctPcs = (c: VChord): number[] => VQ_DEF[c.q].ct.map((x) => mod12(c.r + x));
const scPcs = (c: VChord): number[] => VQ_DEF[c.q].sc.map((x) => mod12(c.r + x));
const ch = (r: number, q: VQ, beats: number): VChord => ({ r: mod12(r), q, beats });
function chordAt(chords: VChord[], beat: number): VChord {
  let at = 0;
  for (const c of chords) {
    if (beat < at + c.beats - 1e-9) return c;
    at += c.beats;
  }
  return chords[chords.length - 1];
}
const pitchesIn = (pcs: number[], lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let q = lo; q <= hi; q++) if (pcs.includes(mod12(q))) out.push(q);
  return out;
};
/** Shift a line by octaves so it sits inside lo–hi, centred. */
function fitLine(ps: number[], lo: number, hi: number): number[] {
  const mn = Math.min(...ps);
  const mx = Math.max(...ps);
  let shift = Math.round(((lo + hi) / 2 - (mn + mx) / 2) / 12) * 12;
  while (mx + shift > hi) shift -= 12;
  while (mn + shift < lo) shift += 12;
  return ps.map((p) => p + shift);
}
const flag = (chords: VChord[], p: number, beat: number): boolean => ctPcs(chordAt(chords, beat)).includes(mod12(p));
const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

// ───────────────────────────── targets reached by lead-ins ─────────────────────────────

/**
 * A line of targets on the beat, each reached by its lead-in (approach notes or an enclosure, `leads[i]` for target i)
 * in the 8ths right before it; between, chord tones of the sounding chord heading for the next lead-in. `beats` are the
 * targets' onsets (the first has no lead-in, the last is held `hold` beats). Targets are chord tones (`guide`: the 3rd or
 * the 7th) chosen so no two neighbouring notes repeat and every lead-in stays inside lo–hi.
 */
export function targetsLine(chords: VChord[], beats: number[], leads: LeadId[], lo: number, hi: number, r: () => number, o: { guide?: boolean; hold?: number; start?: number } = {}): { notes: VN[]; devices: PhraseDevice[] } {
  const notes: VN[] = [];
  const devices: PhraseDevice[] = [];
  const pcsFor = (c: VChord) => (o.guide ? [VQ_DEF[c.q].ct[1], VQ_DEF[c.q].ct[3]].map((x) => mod12(c.r + x)) : ctPcs(c));
  let prev = o.start ?? Math.round(lo + (hi - lo) * 0.55);
  let dir = r() < 0.5 ? -1 : 1;
  beats.forEach((b, i) => {
    const c = chordAt(chords, b);
    const lead = i === 0 ? null : leads[(i - 1) % leads.length];
    const L = lead ? leadIn(lead, 60, scPcs(c), 127).length : 0;
    // Room: the lead-in reaches ±2 (the 5th above for the dominant approach).
    const cands = pitchesIn(pcsFor(c), lo + 2, hi - (lead === 'dominant' ? 7 : 2)).filter((T) => {
      if (i === 0) return true;
      const li = leadIn(lead!, T, scPcs(c), hi);
      if (li.some((x) => x < lo || x > hi)) return false;
      const last = notes[notes.length - 1];
      if (T === li[li.length - 1] || li[0] === last.p) return false;
      // With no fill between, the lead-in follows the last target directly: no repeat, no leap past a 5th.
      return Math.abs(li[0] - last.p) <= 9;
    });
    if (!cands.length) throw new Error(`no target at beat ${b}`);
    // Move 2–7 semitones in the line's direction (turn at the edges); the first target sits near the start.
    if (prev <= lo + 5) dir = 1;
    else if (prev >= hi - 5) dir = -1;
    else if (r() < 0.3) dir = -dir;
    const goal = i === 0 ? prev : prev + dir * (3 + Math.floor(r() * 4));
    const T = cands.filter((x) => x !== prev).reduce((a, x) => (Math.abs(x - goal) < Math.abs(a - goal) ? x : a), cands.find((x) => x !== prev) ?? cands[0]);
    if (i > 0) {
      const li = leadIn(lead!, T, scPcs(c), hi);
      const from = beats[i - 1];
      const slots = Math.round((b - from) / 0.5) - 1 - L;
      // Fill: chord tones of the chord under each slot, stepping from the last target toward the lead-in.
      let cur = notes[notes.length - 1].p;
      let before = notes.length > 1 ? notes[notes.length - 2].p : NaN;
      for (let k = 0; k < slots; k++) {
        const beat = from + 0.5 * (k + 1);
        const pool = pitchesIn(ctPcs(chordAt(chords, beat)), lo, hi).filter((x) => x !== cur && x !== before && x !== li[0]);
        const aim = cur + ((li[0] - cur) * (k + 1)) / (slots + 1);
        const x = pool.reduce((a, y) => (Math.abs(y - aim) < Math.abs(a - aim) ? y : a), pool[0] ?? cur + 1);
        notes.push({ p: x, beat, dur: 0.5, ct: flag(chords, x, beat) });
        before = cur;
        cur = x;
      }
      li.forEach((x, k) => notes.push({ p: x, beat: b - 0.5 * (L - k), dur: 0.5, ct: false }));
      devices.push({ kind: lead!.startsWith('enc-') ? 'enclosure' : 'approach', id: lead!, at: notes.length });
    }
    const last = i === beats.length - 1;
    const next = last ? b + (o.hold ?? 2) : beats[i + 1];
    notes.push({ p: T, beat: b, dur: last ? (o.hold ?? 2) : Math.min(0.5, next - b), ct: true });
    if (o.guide && i > 0) devices.push({ kind: 'guide', id: 'guide', at: notes.length - 1 });
    prev = T;
  });
  return { notes, devices };
}

// ───────────────────────────── the rungs ─────────────────────────────

/** Rung 1: one bar of chord tones (maj7, m7, dominant 7), an arpeggio with at most one turn, the last note held. */
function chordTonesBar(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const q: VQ = (['maj7', 'm7', '7'] as const)[op % 3];
  const c = ch(key, q, 4);
  const RH = [[0, 1, 2, 2.5], [0, 0.5, 1, 2], [0, 1, 1.5, 2], [0, 0.5, 1, 1.5, 2], [0, 1, 1.5, 2, 2.5]];
  const rh = pickR(r, RH);
  const pool = pitchesIn(ctPcs(c), lo, hi);
  let i = Math.floor(pool.length * (0.3 + r() * 0.4));
  let dir = r() < 0.5 ? -1 : 1;
  const turnAt = 1 + Math.floor(r() * (rh.length - 1));
  const ps: number[] = [];
  for (let k = 0; k < rh.length; k++) {
    ps.push(pool[i]);
    if (k === turnAt && r() < 0.6) dir = -dir;
    if (i + dir < 0 || i + dir >= pool.length) dir = -dir;
    i += dir * (r() < 0.25 ? 2 : 1);
    i = Math.max(0, Math.min(pool.length - 1, i));
    if (pool[i] === ps[ps.length - 1]) i = Math.max(0, Math.min(pool.length - 1, i + dir));
  }
  const notes = rh.map((b, k) => ({ p: ps[k], beat: b, dur: k === rh.length - 1 ? 4 - b - 0.5 : (rh[k + 1] - b), ct: true }));
  const name = { maj7: t('Chord tones: major 7th', 'צלילי אקורד: מז׳ור 7'), m7: t('Chord tones: minor 7th', 'צלילי אקורד: מינור 7'), '7': t('Chord tones: dominant 7th', 'צלילי אקורד: דומיננט 7') }[q as 'maj7' | 'm7' | '7'];
  return { notes, chords: [c], home: q === 'm7' ? key + 3 : key, minor: q === 'm7', devices: [], name };
}

/** Rung 2: chromatic approach notes into chord tones on the beat (op 0 a half step, 1 two half steps, 2 with the dominant approach over ii–V–I). */
function approachLine(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const pool = APPROACH_POOLS[op % 3];
  const chords = op % 3 === 2 ? [ch(key + 2, 'm7', 2), ch(key + 7, '7', 2), ch(key, 'maj7', 4)] : [ch(key, 'maj7', 4), ch(key, 'maj7', 4)];
  const beats = op % 3 === 2 ? [0, 2, 4] : [0, 2, 4, 6];
  const leads = beats.slice(1).map(() => pickR(r, pool));
  const { notes, devices } = targetsLine(chords, beats, leads, lo, hi, r, { hold: 2 });
  const name = [t('Approach notes: a half step', 'צלילי גישה: חצי טון'), t('Approach notes: two half steps', 'צלילי גישה: שני חצאי טונים'), t('Approach notes over ii–V–I', 'צלילי גישה על ii–V–I')][op % 3];
  return { notes, chords, home: key, devices, name };
}

const ENC_NAME: Record<string, T2> = {
  'enc-ab': t('Enclosure: half step above, then below', 'כיתור: חצי טון מעל, ואז מתחת'),
  'enc-ba': t('Enclosure: half step below, then above', 'כיתור: חצי טון מתחת, ואז מעל'),
  'enc-step': t('Enclosure: scale step above, half step below', 'כיתור: צעד בסולם מעל, חצי טון מתחת'),
  'enc-bebop': t('The 4-note bebop enclosure', 'כיתור ביבופ בארבעה צלילים'),
  'enc-delayed': t('Enclosure: the delayed resolution', 'כיתור: הפתרון המושהה'),
};
/** Rung 3: one enclosure type (op) into the chord tones of V7 → Imaj7, the last target on beat 1 of the I. */
function enclosureLine(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const enc = ENCLOSURES[op % ENCLOSURES.length];
  const chords = [ch(key + 7, '7', 4), ch(key, 'maj7', 4)];
  const beats = enc === 'enc-delayed' ? [0, 4] : [0, 2, 4];
  const { notes, devices } = targetsLine(chords, beats, beats.slice(1).map(() => enc), lo, hi, r, { hold: 2 });
  return { notes, chords, home: key, devices, name: ENC_NAME[enc] };
}

/**
 * Rung 4: the bebop scale's passing half step — chord tones on the beats. Op 0: V7 down the dominant bebop scale from a
 * chord tone (the major 7th passing between root and ♭7), into a chord tone of I; op 1: the ii arpeggiated up, the V's
 * bebop scale down; op 2: the major bebop scale (♯5 passing between 5 and 6) down over I6.
 */
function bebopScaleLine(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const devices: PhraseDevice[] = [];
  let rel: number[];
  let chords: VChord[];
  let passPc: number;
  const DOM = [24, 12, 0].flatMap((o) => [12, 11, 10, 9, 7, 5, 4, 2].map((x) => x + o - 12)).filter((x) => x >= -12);
  if (op % 3 === 2) {
    // I6: 12 11 9 8 7 5 4 2 0 (chord tones 0 4 7 9 on the beats), relative to the tonic.
    const MAJ = [12, 11, 9, 8, 7, 5, 4, 2, 0, -1, -3, -4, -5];
    const start = pickR(r, [0, 2, 4]);
    rel = [...MAJ.slice(start, start + 8), MAJ[start + 8]];
    chords = [ch(key, '6', 8)];
    passPc = mod12(key + 8);
  } else if (op % 3 === 1) {
    // ii arpeggio (relative to the tonic), then the V's bebop scale down from the chord tone nearest, then I.
    const ii = pickR(r, [[2, 5, 9, 12], [5, 9, 12, 16], [14, 12, 9, 5]]);
    const v = DOM.map((x) => x + 7);
    const last = ii[3];
    const starts = v.map((x, i) => ({ x, i })).filter(({ x, i }) => i % 2 === 0 && i + 4 < v.length && x !== last && Math.abs(x - last) <= 3 && v.slice(i, i + 4).some((y) => mod12(y) === 6));
    const any = v.map((x, i) => ({ x, i })).filter(({ x, i }) => i % 2 === 0 && i + 4 < v.length && x !== last && v.slice(i, i + 4).some((y) => mod12(y) === 6));
    const s = starts.length ? pickR(r, starts) : any.reduce((a, b) => (Math.abs(b.x - last) < Math.abs(a.x - last) ? b : a));
    const run = v.slice(s.i, s.i + 4);
    rel = [...ii, ...run];
    chords = [ch(key + 2, 'm7', 2), ch(key + 7, '7', 2), ch(key, 'maj7', 4)];
    passPc = mod12(key + 6);
    const after = v[s.i + 4];
    const I = [-1, 0, 4, 7, 11, 12, 16, 19];
    rel.push(I.filter((x) => x !== run[3]).reduce((a, b) => (Math.abs(b - after) < Math.abs(a - after) ? b : a)));
  } else {
    // V7 (relative to the tonic: the V's root is +7): 8 notes down from a chord tone, then a chord tone of I.
    const v = DOM.map((x) => x + 7);
    const startIx = pickR(r, [8, 10, 12, 14].filter((i) => i + 8 < v.length));
    const run = v.slice(startIx, startIx + 8);
    const after = v[startIx + 8];
    const I = [-12, -8, -5, -1, 0, 4, 7, 11, 12, 16, 19];
    rel = [...run, I.filter((x) => x !== run[7]).reduce((a, b) => (Math.abs(b - after) < Math.abs(a - after) ? b : a))];
    chords = [ch(key + 7, '7', 4), ch(key, 'maj7', 4)];
    passPc = mod12(key + 6);
  }
  const ps = fitLine(rel.map((x) => x + key + 60), lo, hi);
  const notes: VN[] = ps.map((p, i) => ({ p, beat: i * 0.5, dur: i === ps.length - 1 ? 2 : 0.5, ct: false }));
  // The last note sits on a beat (a chord tone of I).
  const lastBeat = Math.ceil(notes[notes.length - 2].beat + 0.5);
  notes[notes.length - 1].beat = lastBeat;
  for (const n of notes) n.ct = flag(chords, n.p, n.beat);
  notes.forEach((n, i) => {
    if (mod12(n.p) === passPc && i > 0 && i < notes.length - 1) devices.push({ kind: 'passing', id: op % 3 === 2 ? 'bebop-maj' : 'bebop-dom', at: i });
  });
  const name = [t('The bebop scale down the V', 'סולם הביבופ במורד ה־V'), t('ii up, the V’s bebop scale down', 'ii למעלה, סולם הביבופ של ה־V למטה'), t('The major bebop scale', 'סולם הביבופ המז׳ורי')][op % 3];
  return { notes, chords, home: key, devices, name };
}

/** Rung 5: a two-bar line over ii–V–I (op 1 minor ii–V–i): guide tones on each change, approach notes and enclosures into them. */
function twoFiveLine(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const minor = op % 2 === 1;
  const chords = minor ? [ch(key + 2, 'hd7', 4), ch(key + 7, '7b9', 4), ch(key, 'm6', 4)] : [ch(key + 2, 'm7', 4), ch(key + 7, '7', 4), ch(key, 'maj7', 4)];
  const pool: LeadId[] = ['chr-below', 'chr-above', 'enc-ab', 'enc-ba', 'enc-step', 'dbl-above'];
  const beats = [0, 2, 4, 6, 8];
  const leads = beats.slice(1).map(() => pickR(r, pool));
  const res = targetsLine(chords, beats, leads, lo, hi, r, { hold: 2, guide: true });
  const name = minor ? t('A line over minor ii–V–i', 'קו על ii–V–i מינורי') : t('A line over ii–V–I', 'קו על ii–V–I');
  return { notes: res.notes, chords, home: minor ? key + 3 : key, minor, devices: res.devices, name };
}

/** The V bar of rung 6 (semitones above the V's root, 8 eighths) and the I target (above the V's root) it resolves to by a half step. */
const ALT_FIGURES: { q: VQ; v: number[]; to: number; tension: string; pc: number }[] = [
  { q: '7b9', v: [4, 7, 10, 13, 10, 7, 4, 1], to: 0, tension: 'b9', pc: 1 },
  { q: 'alt', v: [16, 15, 13, 12, 10, 8, 6, 4], to: 5, tension: '#9', pc: 3 },
  { q: 'alt', v: [4, 8, 10, 13, 15, 13, 10, 8], to: 9, tension: 'b13', pc: 8 },
];
/** ii bars (semitones above the ii's root, 8 eighths). */
const II_BARS = [
  [0, 3, 7, 10, 14, 12, 10, 7],
  [3, 7, 10, 14, 12, 10, 7, 5],
  [10, 7, 3, 0, 2, 3, 5, 7],
];
/** Rung 6: ii–V–I with an altered tension on the V (op 0 ♭9, 1 ♯9, 2 ♭13), resolving by a half step to I on beat 1. */
function alteredLine(key: number, op: number, lo: number, hi: number, r: () => number): EarPhrase {
  const f = ALT_FIGURES[op % 3];
  const ii = pickR(r, II_BARS).map((x) => x + 2);
  const lastIi = ii[7];
  // The V figure (relative to the tonic: V root = +7) by octaves, its first note nearest the ii's last (never the same).
  const vAt = (o: number) => f.v.map((x) => x + 7 + o);
  const o = [-24, -12, 0, 12].filter((oo) => vAt(oo)[0] !== lastIi).reduce((a, b) => (Math.abs(vAt(b)[0] - lastIi) < Math.abs(vAt(a)[0] - lastIi) ? b : a));
  const v = vAt(o);
  // The tension (or the 3rd) resolves by a half step to the I's chord tone.
  const target = mod12(v[7] - 1) === mod12(7 + f.to) ? v[7] - 1 : v[7] + 1;
  const rel = [...ii, ...v, target];
  const ps = fitLine(rel.map((x) => x + key + 60), lo, hi);
  const chords = [ch(key + 2, 'm7', 4), ch(key + 7, f.q, 4), ch(key, 'maj7', 4)];
  const notes: VN[] = ps.map((p, i) => ({ p, beat: i * 0.5, dur: i === ps.length - 1 ? 2 : 0.5, ct: false }));
  for (const n of notes) n.ct = flag(chords, n.p, n.beat);
  const devices: PhraseDevice[] = [];
  notes.forEach((n, i) => {
    if (n.beat >= 4 && n.beat < 8 && mod12(n.p - (key + 7)) === f.pc) devices.push({ kind: 'altered', id: f.tension, at: i });
  });
  const name = [t('Altered: the ♭9 on the V', 'אלטרד: ה־♭9 על ה־V'), t('Altered: the ♯9 on the V', 'אלטרד: ה־♯9 על ה־V'), t('Altered: the ♭13 on the V', 'אלטרד: ה־♭13 על ה־V')][op % 3];
  return { notes, chords, home: key, devices, name };
}

/** Rungs 7–8: a bebop line (the k-bebop generator) over 4 bars (ii–V–I–VI7, op 1 minor) or 8 bars of a form. */
function formPhrase(key: number, kind: 'ph-solo' | 'ph-form', op: number, lo: number, hi: number, seed: string): EarPhrase {
  type FB = [number, VQ][];
  let bars: FB[];
  let minor = false;
  let name: T2;
  if (kind === 'ph-solo') {
    minor = op % 2 === 1;
    bars = minor ? [[[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']]] : [[[2, 'm7']], [[7, '7']], [[0, 'maj7']], [[9, '7']]];
    name = minor ? t('A 4-bar solo phrase, minor ii–V–i', 'משפט סולו של 4 תיבות, ii–V–i מינורי') : t('A 4-bar solo phrase over ii–V–I', 'משפט סולו של 4 תיבות על ii–V–I');
  } else if (op % 2 === 0) {
    // The jazz blues, bars 5–12.
    bars = [[[5, '7']], [[6, 'dim7']], [[0, '7']], [[9, '7']], [[2, 'm7']], [[7, '7']], [[0, '7'], [9, '7']], [[2, 'm7'], [7, '7']]];
    name = t('8 bars of the blues (bars 5–12)', '8 תיבות של בלוז (תיבות 5–12)');
  } else {
    bars = [[[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, '7'], [0, '7']], [[5, 'maj7'], [6, 'dim7']], [[0, 'maj7'], [7, '7']], [[0, '6']]];
    name = t('8 bars of rhythm changes, A section', '8 תיבות של ריתם צ׳יינג׳ס, חלק A');
  }
  const chords: VChord[] = bars.flatMap((bar) => bar.map(([d, q]) => ch(key + d, q, 4 / bar.length)));
  // Merge repeated chords (two halves of the same chord) so the generator does not approach a chord into itself.
  const merged: VChord[] = [];
  for (const c of chords) {
    const l = merged[merged.length - 1];
    if (l && l.r === c.r && l.q === c.q) l.beats += c.beats;
    else merged.push({ ...c });
  }
  const raw = bebopLine(merged, seed, { lo: lo + 1, hi: hi - 3, start: Math.round(lo + (hi - lo) * 0.65), triplets: kind === 'ph-solo' });
  const notes: VN[] = raw.map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct }));
  const devices: PhraseDevice[] = [];
  // The approach into each change's guide tone (the generator's rule): the guide tone on the change's first beat.
  let at = 0;
  for (const c of merged) {
    const i = notes.findIndex((n) => Math.abs(n.beat - at) < 1e-6);
    if (i > 0 && at > 0) devices.push({ kind: 'guide', id: 'guide', at: i });
    at += c.beats;
  }
  return { notes, chords: merged, home: minor ? key + 3 : key, minor, devices, name };
}

/**
 * The phrase of a level in a key: `kind` one of PHRASE_KINDS, `op` its variant, lo–hi the instrument's register. The
 * seed (family, kind, key, option) makes every item the same each time and different in every key.
 */
export function earPhrase(kind: string, key: number, op: number, lo: number, hi: number, seed: string): EarPhrase {
  const k = mod12(key);
  const r = rngOf(seed);
  switch (kind as PhraseKind) {
    case 'ph-ct':
      return chordTonesBar(k, op, lo, hi, r);
    case 'ph-appr':
      return approachLine(k, op, lo, hi, r);
    case 'ph-encl':
      return enclosureLine(k, op, lo, hi, r);
    case 'ph-bebop':
      return bebopScaleLine(k, op, lo, hi, r);
    case 'ph-251':
      return twoFiveLine(k, op, lo, hi, r);
    case 'ph-alt':
      return alteredLine(k, op, lo, hi, r);
    case 'ph-solo':
    case 'ph-form':
      return formPhrase(k, kind as 'ph-solo' | 'ph-form', op, lo, hi, seed);
  }
  throw new Error(`Unknown phrase kind ${kind}`);
}

/** Bars of the call: the last onset falls a full beat before the answer begins (the take drops onsets just after a call window). */
export const callBars = (p: Pick<EarPhrase, 'notes'>): number => Math.max(1, Math.ceil((Math.max(...p.notes.map((n) => n.beat)) + 1.0001) / 4));

/** The chart of the call bars (chords spelled in the phrase's key), padded to `bars`. */
export function phraseChart(p: EarPhrase, bars: number): string[] {
  const c = chartOf(p.chords, p.home);
  return Array.from({ length: bars }, (_, i) => c[i] ?? '%');
}

/**
 * The comp under the call: a shell on each chord (root low, 3rd and 7th — the colour tone on an altered or ♭9 V — in
 * the middle), on the chord's first beat and, on a chord of a bar or more, the "and" of 2 (Charleston). Onsets stop
 * before `until` (the call window's end). `bassLo`: the root's register.
 */
export function phraseComp(p: EarPhrase, until: number, bassLo = 36): { beat: number; dur: number; root: number; shell: number[] }[] {
  const out: { beat: number; dur: number; root: number; shell: number[] }[] = [];
  let at = 0;
  for (const c of p.chords) {
    const ct = VQ_DEF[c.q].ct;
    const root = bassLo + mod12(c.r - bassLo);
    const third = 52 + mod12(c.r + ct[1] - 52);
    const sev = third + 1 + mod12(c.r + (ct[3] ?? ct[2]) - third - 1);
    const colour = c.q === '7b9' ? 1 : c.q === 'alt' ? 3 : null;
    const shell = colour === null ? [third, sev] : [third, sev, sev + 1 + mod12(c.r + colour - sev - 1)];
    const hits = c.beats >= 4 ? [0, 1.5] : [0];
    hits.forEach((h, i) => {
      const b = at + h;
      if (b >= until - 1e-9) return;
      const end = Math.min(i + 1 < hits.length ? at + hits[i + 1] : at + c.beats, until);
      out.push({ beat: b, dur: Math.max(0.25, end - b - 0.1), root, shell });
    });
    at += c.beats;
  }
  return out;
}

/** Swung 8ths for the call's sound: an off-beat 8th at ⅔ of the beat. */
export const swingBeat = (b: number, swing: boolean): number => {
  if (!swing) return b;
  const f = b - Math.floor(b);
  return Math.abs(f - 0.5) < 1e-6 ? Math.floor(b) + 2 / 3 : b;
};

/** The key label of a phrase (its tonic; a minor phrase "Cm"). */
export const phraseKeyLabel = (key: number, minor?: boolean): string => `${KEY_NAMES[mod12(key)]}${minor ? 'm' : ''}`;

/** The short name of each level (path titles, the result screen). */
export const PHRASE_LEVEL_NAME: T2[] = [
  t('One bar of chord tones', 'תיבה אחת של צלילי אקורד'),
  t('Approach notes', 'צלילי גישה'),
  t('Enclosures, every type', 'כיתורים, כל הסוגים'),
  t('The bebop scale’s passing half step', 'חצי הטון המעביר של סולם הביבופ'),
  t('A 2-bar line over ii–V–I', 'קו של 2 תיבות על ii–V–I'),
  t('Altered tensions on the V', 'מתחים אלטרד על ה־V'),
  t('A 4-bar solo phrase', 'משפט סולו של 4 תיבות'),
  t('8 bars over a form: blues, rhythm changes A', '8 תיבות על צורה: בלוז, ריתם צ׳יינג׳ס A'),
];
