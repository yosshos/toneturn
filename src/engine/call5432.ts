// 5-4-3-2 Call (AUDIT-GAMES §4.2 #2; docs/research/BARRY-HARRIS-METHOD.md A2.9, E12): the app calls a number and a
// chord, you play that Barry Harris phrase on the chord — in key, and from f on with the band, in time.
//
// The phrases are harrisLines.PHRASE_5432 (Workbook 1 ch.1, a workshop attendee's notes [54]; the minor versions are
// derived there — both "(verify)" in docs/BARRY-HARRIS-THEORY.md §11). Phrase 4's first note is the bracketed "(G)":
// optional, so a take with or without it is right.
//
// Tiers (rubato before tempo): pp major · p dominant · mp minor · mf mixed numbers and chords (all rubato) · f the band
// plays ii–V–I and the call lands on the V (dominant phrase — "ii is V") or the I (major phrase), start in the called
// bar · ff the same, every note on its 8th. Every item in all 12 keys (cycle of 4ths, random start). Pure.

import { PHRASE_5432, phrase5432, type PhraseN, type PhraseQ } from './harrisLines';
import { realize } from './progGrid';
import { cycleKey, itemSeed, pc, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

export type CallTime = 'free' | 'loose' | 'strict';
export interface CallItem {
  /** The tonic of the item (the key cell it feeds). */
  key: number;
  /** The called chord's root and the phrase's quality / number. */
  root: number;
  q: PhraseQ;
  n: PhraseN;
  /** The called chord as written (Cmaj7, C7, Cm6). */
  sym: string;
  time: CallTime;
  /** Timed items: the band's chart (one chord a bar) and the bar the call lands on (0-based). */
  chart?: string[];
  bar?: number;
}

export const CALL_TAKES = 6;
export const callLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
export const CALL_BPM: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 92, 6: 108 };
const Q_CHORD: Record<PhraseQ, 'maj7' | '7' | 'm6'> = { maj: 'maj7', dom: '7', min: 'm6' };
const NUMS: PhraseN[] = [5, 4, 3, 2];

/** Item i of a run (seeded, so a resumed run rebuilds it). */
export function callItem(seed: number, level: number, i: number): CallItem {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0x0c4115);
  const key = cycleKey(seed, i);
  const n = NUMS[(i + Math.floor(rnd() * 4)) % 4];
  if (lv <= 4) {
    const q: PhraseQ = lv === 1 ? 'maj' : lv === 2 ? 'dom' : lv === 3 ? 'min' : pickOf(rnd, ['maj', 'dom', 'min'] as PhraseQ[]);
    const c = realize(key, { deg: '1', q: Q_CHORD[q], x: 'none', beats: 4 });
    return { key, root: key, q, n, sym: c.sym, time: 'free' };
  }
  // f / ff: ii–V–I–I with the band; the call on the V (dominant phrase) or the I (major phrase).
  const chords = [realize(key, { deg: '2', q: 'm7', x: 'none', beats: 4 }), realize(key, { deg: '5', q: '7', x: 'none', beats: 4 }), realize(key, { deg: '1', q: 'maj7', x: 'none', beats: 4 })];
  const bar = rnd() < 0.5 ? 1 : 2;
  const on = chords[bar];
  return { key, root: on.root, q: bar === 1 ? 'dom' : 'maj', n, sym: on.sym, time: lv === 5 ? 'loose' : 'strict', chart: [chords[0].sym, chords[1].sym, chords[2].sym, chords[2].sym], bar };
}

/** The phrase's notes over the called chord, from a root pitch (absolute MIDI), on beats from 0 within the bar. */
export const callNotes = (it: Pick<CallItem, 'q' | 'n'>, rootMidi: number) => phrase5432(rootMidi, it.q, it.n, 0, 4);
/** The phrase as pitch classes over a root (and whether its first note is optional — phrase 4's "(G)"). */
export function callPcs(it: Pick<CallItem, 'q' | 'n' | 'root'>): { pcs: number[]; optionalFirst: boolean } {
  return { pcs: PHRASE_5432[it.q][it.n].map((x) => pc(it.root + x.s)), optionalFirst: it.n === 4 };
}

/** Longest common subsequence of two pitch-class lists: the matched indices of `want`, and of `got`. */
export function lcsMatch(want: number[], got: number[]): { wi: number[]; gi: number[] } {
  const m = want.length;
  const n = got.length;
  const L = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = want[i] === got[j] ? 1 + L[i + 1][j + 1] : Math.max(L[i + 1][j], L[i][j + 1]);
  const wi: number[] = [];
  const gi: number[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (want[i] === got[j]) {
      wi.push(i);
      gi.push(j);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return { wi, gi };
}

export interface CallPlayed {
  /** ms after beat 1 of the band's first bar (timed items) or after the cue (free items); latency removed. */
  ms: number;
  midi: number;
}
export interface CallGrade {
  score: number;
  /** Phrase notes played in order / phrase length. */
  matched: number;
  of: number;
  /** Timed items: share of notes on their 8th (strict) / the start in the called bar (loose); null when free. */
  timing: number | null;
  /** One mark per phrase note: hit, late (strict, off its 8th) or miss. */
  marks: ('hit' | 'late' | 'miss')[];
}

/**
 * Grade a take. Pitch: the phrase's notes in order (pitch classes, any octave; extra notes cost a little past the
 * first). Free items score the pitch; loose 80 % pitch + 20 % a start inside the called bar; strict 60 % pitch + 40 %
 * the matched notes on their 8ths (±0.2 beat full, ±0.4 beat 60 %).
 */
export function gradeCall(it: CallItem, played: CallPlayed[], bpm: number): CallGrade {
  const { pcs, optionalFirst } = callPcs(it);
  const beat = bpm > 0 ? 60000 / bpm : 0;
  const barMs = (it.bar ?? 0) * 4 * beat;
  // Timed items: only what was played around the called bar counts.
  const ps = it.time === 'free' ? played : played.filter((p) => p.ms >= barMs - beat && p.ms <= barMs + 5 * beat);
  const got = ps.map((p) => pc(p.midi));
  const tryFrom = (from: number) => {
    const want = pcs.slice(from);
    const m = lcsMatch(want, got);
    const extras = Math.max(0, got.length - m.wi.length - 1);
    const pitch = Math.max(0, m.wi.length / want.length - 0.08 * extras);
    return { from, m, pitch };
  };
  const a = tryFrom(0);
  const b = optionalFirst ? tryFrom(1) : null;
  const best = b && b.pitch > a.pitch ? b : a;
  const notes = PHRASE_5432[it.q][it.n];
  const marks: CallGrade['marks'] = pcs.map((_, k) => (optionalFirst && k === 0 && best.from === 1 ? 'hit' : 'miss'));
  let timing: number | null = null;
  const tScores: number[] = [];
  best.m.wi.forEach((w, k) => {
    const idx = w + best.from;
    let mark: 'hit' | 'late' = 'hit';
    if (it.time === 'strict') {
      const exp = barMs + notes[idx].b * beat;
      const dev = Math.abs(ps[best.m.gi[k]].ms - exp) / beat;
      const t = dev <= 0.2 ? 1 : dev <= 0.4 ? 0.6 : 0.2;
      tScores.push(t);
      if (t < 1) mark = 'late';
    }
    marks[idx] = mark;
  });
  let score: number;
  if (it.time === 'strict') {
    const want = pcs.length - best.from;
    timing = tScores.reduce((x, y) => x + y, 0) / Math.max(1, want);
    score = 100 * (0.6 * best.pitch + 0.4 * timing);
  } else if (it.time === 'loose') {
    const first = best.m.gi.length ? ps[best.m.gi[0]].ms : null;
    timing = first !== null && first >= barMs - 0.5 * beat && first <= barMs + 2 * beat ? 1 : 0.3;
    score = 100 * (0.8 * best.pitch + 0.2 * (best.m.wi.length ? timing : 0));
  } else score = 100 * best.pitch;
  return { score: Math.round(Math.max(0, Math.min(100, score))), matched: best.m.wi.length + (best.from === 1 ? 1 : 0), of: pcs.length, timing, marks };
}

/** Free takes end when the phrase is played (its length heard), after a pause, or when nothing comes. */
export const CALL_FREE = { quietAfterMs: 2600, nothingMs: 9000, tailMs: 500 };
