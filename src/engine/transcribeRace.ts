// Transcription Race (GAMES_TIERS_PLAN §4, 0.70): hear a short phrase, write it on the keys — 5 phrases, note-by-note
// accuracy × a time bonus. Phrases are generated from rules (own material).
//   Level 1 (mp) diatonic major, quarters and eighths · 2 (mf) minor with one chromatic note · 3 (f) a bebop line with
//   enclosures, swing 8ths · 4 (ff) a line over ii–V–I with altered tensions on the V, with the chords underneath.
// Every note sits on the answer keyboard (C4–F5). Pure and seeded.

import type { NoteEvent, Stimulus } from './lesson';
import { rng } from './topicKit';
import { jazzProgStim } from './topicsJazzEar';
import type { DynName } from './courseSocial';

/** The answer keyboard's range (one and a half octaves). */
export const KEY_LO = 60;
export const KEY_HI = 77;
export const PHRASES = 5;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

export interface Phrase {
  /** Pitch class of the key (I). */
  key: number;
  minor: boolean;
  midis: number[];
  /** Note lengths in beats. */
  beats: number[];
  swing: boolean;
  /** ff: the chords under the line ([degree, quality, beats]). */
  chords?: [number, 'm7' | 'dom7' | 'maj7', number][];
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** The scale notes of a key inside the keyboard. */
function scaleIn(key: number, steps: number[]): number[] {
  const out: number[] = [];
  for (let m = KEY_LO; m <= KEY_HI; m++) if (steps.includes(mod12(m - key))) out.push(m);
  return out;
}

/** A stepwise / small-leap walk on a scale (indices), starting near the middle. */
function walk(rnd: () => number, scale: number[], n: number, start?: number): number[] {
  let i = start ?? Math.max(0, Math.min(scale.length - 1, Math.floor(scale.length / 2) + Math.floor(rnd() * 3) - 1));
  const out = [scale[i]];
  const moves = [-1, 1, -1, 1, -2, 2, 0, 3, -3];
  while (out.length < n) {
    for (let t = 0; t < 10; t++) {
      const j = i + moves[Math.floor(rnd() * moves.length)];
      if (j >= 0 && j < scale.length && !(scale[j] === out[out.length - 1] && rnd() < 0.7)) {
        i = j;
        break;
      }
    }
    out.push(scale[i]);
  }
  return out;
}

function shuffleIdx(rnd: () => number, n: number): number[] {
  const a = Array.from({ length: n }, (_, k) => k);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rhythm = (rnd: () => number, n: number, eighths: boolean): number[] => {
  if (eighths) return Array.from({ length: n }, (_, k) => (k === n - 1 ? 1 : 0.5));
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(k === n - 1 ? 2 : rnd() < 0.35 ? 0.5 : 1);
  return out;
};

/** Phrase `i` of a run. */
export function phraseAt(seed: number, i: number, level: number, notes: number): Phrase {
  const lv = Math.max(1, Math.min(4, Math.round(level)));
  const n = Math.max(3, Math.min(10, Math.round(notes)));
  const rnd = rng((Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ (lv << 3)) >>> 0);
  const key = [0, 2, 3, 5, 7, 9, 10][Math.floor(rnd() * 7)];
  if (lv === 1) {
    const sc = scaleIn(key, MAJOR);
    return { key, minor: false, midis: walk(rnd, sc, n), beats: rhythm(rnd, n, false), swing: false };
  }
  if (lv === 2) {
    const sc = scaleIn(key, MINOR);
    const midis = walk(rnd, sc, n);
    // exactly one chromatic note: an inner note moved a half step off the scale
    const spots = shuffleIdx(rnd, midis.length).filter((k) => k > 0 && k < midis.length - 1);
    for (const k of spots) {
      const cs = [midis[k] - 1, midis[k] + 1].filter((c) => c >= KEY_LO && c <= KEY_HI && !sc.includes(c));
      if (cs.length) {
        midis[k] = cs[Math.floor(rnd() * cs.length)];
        break;
      }
    }
    return { key, minor: true, midis, beats: rhythm(rnd, n, false), swing: false };
  }
  if (lv === 3) {
    // bebop: scale fragments with an enclosure (upper scale note, lower half step, target chord tone)
    const sc = scaleIn(key, MAJOR);
    const tones = sc.filter((m) => [0, 4, 7, 11].includes(mod12(m - key)) && m > KEY_LO + 1 && m < KEY_HI - 1);
    const out: number[] = [];
    while (out.length < n) {
      const t = tones[Math.floor(rnd() * tones.length)];
      const upper = sc.find((m) => m > t)!;
      const enc = [upper, t - 1, t];
      if (out.length + 3 <= n) out.push(...enc);
      else {
        // fill with scale steps down from the last note (the last enclosure ends on a scale tone)
        const last = out.length ? out[out.length - 1] : t;
        const idx = Math.max(0, sc.indexOf(sc.includes(last) ? last : t));
        out.push(sc[idx > 0 ? idx - 1 : idx + 1]);
      }
    }
    return { key, minor: false, midis: out.slice(0, n), beats: rhythm(rnd, n, true), swing: true };
  }
  // ff: ii–V–I; the line uses the chord tones, and ♭9 / ♯9 / ♭13 over the V
  const chords: Phrase['chords'] = [
    [2, 'm7', 2],
    [7, 'dom7', 2],
    [0, 'maj7', 4],
  ];
  const pcsOf: number[][] = [
    [2, 5, 9, 0],
    [7, 11, 8, 10, 3, 5], // V: 1 3 ♭9 ♯9 ♭13 7  (as pitch classes above the key: 7, 11, 8, 10, 3, 5)
    [0, 4, 7, 11, 2],
  ];
  const per = [Math.round(n * 0.3), Math.round(n * 0.4)];
  const counts = [Math.max(1, per[0]), Math.max(2, per[1]), 0];
  counts[2] = Math.max(1, n - counts[0] - counts[1]);
  const out: number[] = [];
  let prev = 67 + key > KEY_HI ? 60 + key : 67 + key;
  counts.forEach((cnt, ci) => {
    const cands: number[] = [];
    for (let m = KEY_LO; m <= KEY_HI; m++) if (pcsOf[ci].includes(mod12(m - key))) cands.push(m);
    for (let k = 0; k < cnt; k++) {
      const near = cands.filter((m) => m !== prev && Math.abs(m - prev) <= 5);
      const pickFrom = near.length ? near : cands;
      // over the V make sure an altered tension is heard
      const alt = ci === 1 && k === 1 ? pickFrom.filter((m) => [8, 10, 3].includes(mod12(m - key))) : [];
      const from = alt.length ? alt : pickFrom;
      prev = from[Math.floor(rnd() * from.length)];
      out.push(prev);
    }
  });
  return { key, minor: false, midis: out.slice(0, n), beats: rhythm(rnd, n, true), swing: true, chords };
}

/** The phrase as sound: the line (swung 8ths at f / ff), with the ii–V–I underneath at ff, after a short count-in. */
export function phraseStim(p: Phrase, bpm: number): Stimulus {
  const q = 60 / bpm;
  const ev: NoteEvent[] = [];
  const lead = 2 * q;
  // two clicks of count-in
  ev.push({ midi: 96, start: 0, duration: 0.05, velocity: 0.5, perc: 'accent' }, { midi: 91, start: q, duration: 0.05, velocity: 0.45, perc: 'click' });
  let t = 0;
  p.midis.forEach((m, k) => {
    const b = p.beats[k] ?? 1;
    // swing: an off-beat eighth starts at 2/3 of the beat
    const off = p.swing && Math.abs((t % 1) - 0.5) < 1e-6 ? 1 / 6 : 0;
    ev.push({ midi: m, start: lead + (t + off) * q, duration: Math.max(0.12, (b - off) * q * 0.92), velocity: 0.78 });
    t += b;
  });
  let length = lead + t * q + 0.4;
  if (p.chords) {
    const st = jazzProgStim(p.key, p.chords, bpm);
    if (st.kind === 'events') {
      for (const e of st.events) ev.push({ ...e, start: e.start + lead, velocity: e.velocity * 0.7 });
      length = Math.max(length, lead + st.length);
    }
  }
  return { kind: 'events', events: ev, length };
}

// ---------------------------------------------------------------- scoring and state

/** Note-by-note accuracy 0..1: notes right in place (pitch and octave), over the longer of the two lines. */
export function noteAccuracy(target: number[], entered: number[]): number {
  if (!target.length) return 0;
  let ok = 0;
  target.forEach((m, k) => {
    if (entered[k] === m) ok++;
  });
  return ok / Math.max(target.length, entered.length);
}
/** Time bonus 0..0.5: full within 2 s per note, none at 6 s per note; each replay after the first costs 0.1. */
export function timeBonus(ms: number, notes: number, replays: number): number {
  const per = ms / Math.max(1, notes);
  const b = 0.5 * Math.max(0, Math.min(1, 1 - (per - 2000) / 4000));
  return Math.max(0, b - 0.1 * Math.max(0, replays - 1));
}
/** Points of a phrase: 100 × accuracy × (1 + bonus). A phrase with no right note scores nothing. */
export const phrasePoints = (acc: number, bonus: number) => Math.round(100 * acc * (1 + (acc > 0 ? bonus : 0)));

export interface TranscribeSave {
  v: 1;
  game: 'transcribe';
  seed: number;
  tier: DynName;
  level: number;
  notes: number;
  bpm: number;
  /** One per finished phrase. */
  results: { acc: number; points: number }[];
}
export const tierLevel = (t: DynName): number => (t === 'ff' ? 4 : t === 'f' ? 3 : t === 'mf' ? 2 : 1);

export function newTranscribe(seed: number, tier: DynName, notes: number, bpm: number): TranscribeSave {
  return { v: 1, game: 'transcribe', seed: seed >>> 0, tier, level: tierLevel(tier), notes, bpm, results: [] };
}
export function submitPhrase(s: TranscribeSave, entered: number[], ms: number, replays: number): { save: TranscribeSave; acc: number; points: number; phrase: Phrase } {
  const phrase = phraseAt(s.seed, s.results.length, s.level, s.notes);
  const acc = noteAccuracy(phrase.midis, entered);
  const points = phrasePoints(acc, timeBonus(ms, phrase.midis.length, replays));
  return { save: { ...s, results: [...s.results, { acc, points }] }, acc, points, phrase };
}
export const runDone = (s: TranscribeSave) => s.results.length >= PHRASES;
export const runScore = (s: TranscribeSave) => s.results.reduce((a, r) => a + r.points, 0);
/** Mean note accuracy of the run, 0..100. */
export const runAccuracy = (s: TranscribeSave) => (s.results.length ? Math.round((100 * s.results.reduce((a, r) => a + r.acc, 0)) / s.results.length) : 0);
export const transcribeResult = (s: TranscribeSave) => ({ game: 'transcribe' as const, score: runScore(s), detail: { tier: s.tier, accuracy: runAccuracy(s), phrases: s.results.length } });

export function isTranscribeSave(x: unknown): x is TranscribeSave {
  const s = x as TranscribeSave | null;
  return !!s && s.v === 1 && s.game === 'transcribe' && typeof s.seed === 'number' && Array.isArray(s.results) && s.results.length < PHRASES;
}
