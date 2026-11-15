// Comp Caller (AUDIT-GAMES §4.2 #9, Keys + Guitar + Jazz): a chord chart loops with a walking bass and a click; each
// bar's comping rhythm is called one bar ahead. Comp the chords on the called rhythm — switched on the bar. Call and
// response: first hear the band comp it, then play. MIDI checks the rhythm and the chord (its 3rd and 7th sound); the
// microphone hears the rhythm (each attack's onset).
// The rhythms are Siskind's comping vocabulary (soloPiano.ts COMP_RHYTHMS, topicsSoloPiano RHY; doc C3):
//   Charleston 1 · 2+ | reverse 1+ · 3 | Beat-3 3 · 4+ | Basie 2 · 4 | push-off 2 · 4 · 4+ | lead-in 1 · 4→ |
//   Red Garland 2+ · 4+→ | two-bar (Charleston, then reverse) | anticipation 1 · 4+→     (→ = sounds the next chord)
//   Level 1 (pp) Charleston ↔ reverse, ♩100 · 2 (p) + Beat-3, ♩110 · 3 (mp) Basie / push-off / lead-in, ♩120
//   Level 4 (mf) + Red Garland, ♩130 · 5 (f) two-bar patterns and anticipations, 8 bars, ♩140 · 6 (ff) all, ♩160
// Charts are ii–V–I material in a seeded key from all 12. Pure: the chart, the expected hits, the grader.

import { pickR, rng } from './topicKit';
import { caseSeed, mod12 } from './caseRun';
import type { DynName } from './courseSocial';

type Bi = { en: string; he: string };
export type CompQ = 'maj7' | 'm7' | '7' | 'm7b5' | '6';
export interface CompChord {
  root: number;
  q: CompQ;
  /** Bar index (one chord a bar). */
  bar: number;
}
export type RhythmId = 'charleston' | 'reverse' | 'beat3' | 'basie' | 'pushoff' | 'leadin' | 'garland' | 'twobar' | 'anticip';
/** Hit positions (beats in the bar); `next` = sounds the next bar's chord. Two-bar patterns list both bars. */
export const RHYTHMS: Record<RhythmId, { at: number; next?: boolean }[][]> = {
  charleston: [[{ at: 0 }, { at: 1.5 }]],
  reverse: [[{ at: 0.5 }, { at: 2 }]],
  beat3: [[{ at: 2 }, { at: 3.5 }]],
  basie: [[{ at: 1 }, { at: 3 }]],
  pushoff: [[{ at: 1 }, { at: 3 }, { at: 3.5 }]],
  leadin: [[{ at: 0 }, { at: 3, next: true }]],
  garland: [[{ at: 1.5 }, { at: 3.5, next: true }]],
  twobar: [[{ at: 0 }, { at: 1.5 }], [{ at: 0.5 }, { at: 2 }]],
  anticip: [[{ at: 0 }, { at: 3.5, next: true }]],
};
export const RHYTHM_NAME: Record<RhythmId, Bi> = {
  charleston: { en: 'Charleston', he: 'צ׳רלסטון' },
  reverse: { en: 'Reverse', he: 'הפוך' },
  beat3: { en: 'Beat 3', he: 'מ־3' },
  basie: { en: 'Basie', he: 'בייסי' },
  pushoff: { en: 'Push-off', he: 'פוש־אוף' },
  leadin: { en: 'Lead-in', he: 'כניסה' },
  garland: { en: 'Garland', he: 'גרלנד' },
  twobar: { en: 'Two-bar', he: 'דו־תיבתי' },
  anticip: { en: 'Anticipation', he: 'הקדמה' },
};
/** Counting syllables of the hits ("1 · 2+"), shown under the name. */
export const rhythmCount = (id: RhythmId, barInPattern = 0) =>
  RHYTHMS[id][barInPattern % RHYTHMS[id].length].map((h) => `${Math.floor(h.at) + 1}${h.at % 1 ? '+' : ''}`).join(' · ');

const POOLS: Record<number, RhythmId[]> = {
  1: ['charleston', 'reverse'],
  2: ['charleston', 'reverse', 'beat3'],
  3: ['basie', 'pushoff', 'leadin'],
  4: ['charleston', 'reverse', 'garland', 'basie'],
  5: ['twobar', 'anticip', 'garland', 'charleston'],
  6: ['charleston', 'reverse', 'beat3', 'basie', 'pushoff', 'leadin', 'garland', 'twobar', 'anticip'],
};
export const COMP_BPM = [0, 100, 110, 120, 130, 140, 160];
export const COMP_TAKES = 4;
export const tierLevelCC = (t: DynName) => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
export const barsFor = (level: number) => (level >= 5 ? 8 : 4);

/** Chart templates (degree above the key, quality), one chord a bar; 8-bar charts are two of them. */
const CHARTS: [number, CompQ][][] = [
  [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']],
  [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7']],
  [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']],
  [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']],
  [[0, '6'], [5, '7'], [0, '6'], [7, '7']],
];

export interface CompItem {
  key: number;
  bpm: number;
  chords: CompChord[];
  /** The called rhythm of each bar (a two-bar pattern spans two bars). */
  calls: { id: RhythmId; part: number }[];
}

/** Take `i`: a chart in a seeded key (cycle of 4ths through the run: all 12) and the called rhythms. */
export function compItem(seed: number, i: number, level: number): CompItem {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const r = rng(caseSeed(seed, i));
  r();
  const key = mod12(Math.floor(r() * 12) + 5 * i);
  const bars = barsFor(lv);
  const tpl = [...pickR(r, CHARTS), ...(bars > 4 ? pickR(r, CHARTS) : [])];
  const chords = tpl.slice(0, bars).map(([d, q], bar) => ({ root: mod12(key + d), q, bar }));
  const pool = POOLS[lv];
  const calls: CompItem['calls'] = [];
  let prev: RhythmId | null = null;
  while (calls.length < bars) {
    let id = pickR(r, pool);
    // level 1–2: switch every bar (the point is the switch); never two-bar on the last bar
    if (lv <= 2 && id === prev) id = pool[(pool.indexOf(id) + 1) % pool.length];
    if (id === 'twobar' && calls.length === bars - 1) id = 'charleston';
    if (id === 'twobar') {
      calls.push({ id, part: 0 }, { id, part: 1 });
    } else calls.push({ id, part: 0 });
    prev = id;
  }
  return { key, bpm: COMP_BPM[lv], chords, calls };
}

export interface CompHit {
  /** Beat from the start of bar 1. */
  beat: number;
  /** The chord this hit should sound. */
  chord: CompChord;
  bar: number;
}
/** The expected hits of an item (a `next` hit on the last bar is dropped: nothing follows). */
export function compHitsOf(it: CompItem): CompHit[] {
  const out: CompHit[] = [];
  it.calls.forEach((c, bar) => {
    for (const h of RHYTHMS[c.id][c.part]) {
      if (h.next && bar === it.chords.length - 1) continue;
      out.push({ beat: bar * 4 + h.at, chord: it.chords[h.next ? bar + 1 : bar], bar });
    }
  });
  return out;
}

const INTS: Record<CompQ, number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], m7b5: [0, 3, 6, 10], '6': [0, 4, 7, 9] };
export const compPcs = (c: Pick<CompChord, 'root' | 'q'>) => INTS[c.q].map((x) => mod12(c.root + x));
/** The guide tones (3rd and 7th; the 6 chord's 3rd and 6th). */
export const guideTones = (c: Pick<CompChord, 'root' | 'q'>) => [INTS[c.q][1], INTS[c.q][3]].map((x) => mod12(c.root + x));
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const QS: Record<CompQ, string> = { maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5', '6': '6' };
export const compName = (c: Pick<CompChord, 'root' | 'q'>) => `${FLAT[mod12(c.root)]}${QS[c.q]}`;

/** One attack heard: beat from the start of bar 1 (latency removed), and its pitch classes (MIDI; none = mic). */
export interface CompAttack {
  beat: number;
  pcs?: number[];
}
/** Group MIDI note-ons into attacks (notes within `gapMs` are one chord). */
export function groupAttacks(notes: { ms: number; midi: number }[], bpm: number, gapMs = 70): CompAttack[] {
  const s = [...notes].sort((a, b) => a.ms - b.ms);
  const out: { ms: number; pcs: Set<number> }[] = [];
  for (const n of s) {
    const last = out[out.length - 1];
    if (last && n.ms - last.ms <= gapMs) last.pcs.add(mod12(n.midi));
    else out.push({ ms: n.ms, pcs: new Set([mod12(n.midi)]) });
  }
  return out.map((a) => ({ beat: a.ms / (60_000 / bpm), pcs: [...a.pcs] }));
}

/** A hit counts inside this many beats of its place (an 8th-note grid: a little under half an 8th). */
export const COMP_WIN = 0.2;

/**
 * Grade a take: each expected hit takes the nearest unused attack within the window; a hit is 'ok' when on time and
 * (MIDI) the guide tones of its chord sound, 'chord' when on time with the wrong chord, 'miss' when no attack came.
 * Attacks that match no hit are extras. Score = (ok − ½ × extras) / hits, 0–100.
 */
export function gradeComp(it: CompItem, attacks: CompAttack[], win = COMP_WIN): { marks: ('ok' | 'chord' | 'miss')[]; barMarks: ('ok' | 'bad')[]; extras: number; score: number; offsets: (number | null)[] } {
  const hits = compHitsOf(it);
  const used = new Set<number>();
  const offsets: (number | null)[] = [];
  const marks = hits.map((h) => {
    let bi = -1;
    let bd = Infinity;
    attacks.forEach((a, k) => {
      if (used.has(k)) return;
      const d = Math.abs(a.beat - h.beat);
      if (d <= win && d < bd) {
        bd = d;
        bi = k;
      }
    });
    if (bi < 0) {
      offsets.push(null);
      return 'miss' as const;
    }
    used.add(bi);
    const a = attacks[bi];
    offsets.push(a.beat - h.beat);
    if (a.pcs && a.pcs.length) {
      const g = guideTones(h.chord);
      if (!g.every((p) => a.pcs!.includes(p))) return 'chord' as const;
    }
    return 'ok' as const;
  });
  // attacks before the count-in ends or after the chart are ignored (not extras)
  const span = it.chords.length * 4;
  const extras = attacks.filter((a, k) => !used.has(k) && a.beat > -win && a.beat < span).length;
  const ok = marks.filter((m) => m === 'ok').length;
  const score = Math.max(0, Math.min(100, Math.round((100 * (ok - 0.5 * extras)) / Math.max(1, hits.length))));
  const barMarks = it.chords.map((_, bar) => (hits.every((h, k) => h.bar !== bar || marks[k] === 'ok') ? ('ok' as const) : ('bad' as const)));
  return { marks, barMarks, extras, score, offsets };
}

export const COMP_PASS = 70;
export interface CompSave {
  v: 1;
  game: 'compcaller';
  seed: number;
  tier: DynName;
  level: number;
  takes: number[];
  lives: number;
  /** Hits ok / asked over the run (right / wrong for XP and ratings). */
  ok: number;
  asked: number;
}
export const newComp = (seed: number, tier: DynName, level: number): CompSave => ({ v: 1, game: 'compcaller', seed: seed >>> 0, tier, level, takes: [], lives: 3, ok: 0, asked: 0 });
export const compOver = (s: CompSave) => s.lives <= 0 || s.takes.length >= COMP_TAKES;
export function isCompSave(x: unknown): x is CompSave {
  const s = x as CompSave | null;
  return !!s && s.v === 1 && s.game === 'compcaller' && typeof s.seed === 'number' && Array.isArray(s.takes) && !compOver(s);
}
export function compAfterTake(s: CompSave, score: number, ok: number, asked: number): CompSave {
  return { ...s, takes: [...s.takes, score], lives: score < COMP_PASS ? s.lives - 1 : s.lives, ok: s.ok + ok, asked: s.asked + asked };
}
export function compResult(s: CompSave, input: string) {
  const accuracy = s.takes.length ? Math.round(s.takes.reduce((a, b) => a + b, 0) / s.takes.length) : 0;
  return { game: 'compcaller' as const, score: Math.round(accuracy * (1 + 0.1 * (s.level - 1)) * s.takes.length), detail: { tier: s.tier, level: s.level, accuracy, takes: s.takes.length, hits: s.ok, asked: s.asked, input } };
}
