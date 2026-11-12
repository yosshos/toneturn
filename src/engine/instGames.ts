// Instrument games (GAMES_TIERS_PLAN §3, P3 "thin shells", 0.76): Play It Back and Voicing Sprint (keys), Chord Change
// Race (guitar), Walk the Changes and Roots by Ear (bass). Pure: the items of each tier level (seeded), the grading of
// what was played (MIDI notes / microphone onsets / strum verdicts), and the take-based run every one of them but
// Voicing Sprint uses. The measuring itself (MIDI, pitch onsets, strum chroma) is the app's existing machinery, wired in
// the screens (src/ui/HearPlay.tsx, WalkChanges.tsx, ChangeRace.tsx, VoicingSprint.tsx).

import type { DynName } from './courseSocial';
import type { NoteEvent } from './lesson';
import { QUALITY_INTS, type ChordQuality } from './chordRecognize';
import { chordSymbol } from './chordFinder';
import { rng } from './topicKit';

const pc12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;
const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const clampLv = (lv: number) => Math.max(1, Math.min(6, Math.round(lv) || 1));
export type Bi = { en: string; he: string };

// ---------------------------------------------------------------- chords

export interface Chord {
  root: number;
  quality: ChordQuality;
  /** Beats it lasts. */
  beats: number;
}
export const chordName = (c: Pick<Chord, 'root' | 'quality'>) => chordSymbol({ root: pc12(c.root), quality: c.quality });
export const chordPcs = (c: Pick<Chord, 'root' | 'quality'>) => QUALITY_INTS[c.quality].map((i) => pc12(c.root + i));
/** A comping voicing in the middle register (no low bass): the root from C3–B3 (or from `low`), the rest stacked above. */
export function compVoicing(c: Pick<Chord, 'root' | 'quality'>, low = 48): number[] {
  const pcs = chordPcs(c);
  const out = [low + pc12(pcs[0] - low)];
  for (const p of pcs.slice(1)) {
    const prev = out[out.length - 1];
    out.push(prev + 1 + pc12(p - prev - 1));
  }
  return out;
}

/** A Roman numeral step in a key: semitones from the tonic and the quality. */
type Step = [number, ChordQuality];
const I: Step = [0, 'M'], IV: Step = [5, 'M'], V: Step = [7, 'M'], vi: Step = [9, 'm'], ii: Step = [2, 'm'], iii: Step = [4, 'm'];
const i_: Step = [0, 'm'], iv: Step = [5, 'm'], v: Step = [7, 'm'], bVI: Step = [8, 'M'], bVII: Step = [10, 'M'], bIII: Step = [3, 'M'];
const ii7: Step = [2, 'm7'], V7: Step = [7, '7'], Imaj7: Step = [0, 'maj7'], vi7: Step = [9, 'm7'], VI7: Step = [9, '7'], II7: Step = [2, '7'], iii7: Step = [4, 'm7'];
const I7: Step = [0, '7'], IV7: Step = [5, '7'], iiø: Step = [2, 'm7b5'], i7: Step = [0, 'm7'], III7: Step = [4, '7'], bII7: Step = [1, '7'], iv7: Step = [5, 'm7'], bVII7: Step = [10, '7'], bIIImaj7: Step = [3, 'maj7'], bIII7: Step = [3, '7'], bIIIm7: Step = [3, 'm7'];

/** Roots by Ear: progressions per level (4–5 chords). */
export const ROOT_PROGS: Step[][][] = [
  [[I, IV, V, I], [I, V, IV, I], [I, IV, I, V], [I, V, I, IV], [IV, V, I, I]],
  [[I, V, vi, IV], [vi, IV, I, V], [I, vi, IV, V], [I, IV, vi, V], [ii, V, I, vi], [I, iii, IV, V]],
  [[i_, iv, v, i_], [i_, bVI, bVII, i_], [i_, bVII, bVI, V], [i_, iv, bVII, bIII], [I, bVII, IV, I], [i_, bIII, bVII, iv]],
  [[ii7, V7, Imaj7, vi7], [Imaj7, VI7, ii7, V7], [Imaj7, II7, ii7, V7], [iii7, vi7, ii7, V7], [Imaj7, vi7, II7, V7]],
  [[I7, IV7, I7, V7], [Imaj7, III7, vi7, IV], [I, IV, iv, I], [I, bVI, bVII, I], [Imaj7, VI7, ii7, V7], [iiø, V7, i7, iv7]],
  [[ii7, bII7, Imaj7, Imaj7], [iv7, bVII7, Imaj7, Imaj7], [iii7, bIII7, ii7, bII7, Imaj7], [Imaj7, bIIImaj7, ii7, bII7], [iii7, VI7, ii7, V7, Imaj7], [bIIIm7, [8, '7'], ii7, bII7, Imaj7]],
];

const KEYS = [0, 5, 7, 2, 10, 3, 9, 4, 8];

// ---------------------------------------------------------------- Play It Back / Roots by Ear (hear, then play)

export interface PhraseNote {
  midi: number;
  /** Beats from the start (rhythm levels) or the note's index. */
  at: number;
  len: number;
}
export interface HearItem {
  game: 'playback' | 'rootsear';
  level: number;
  key: number;
  /** The context the ear needs first: the tonic chord (Play It Back) — none for Roots by Ear (its chords are the context). */
  cue: number[];
  /** What to play back, in order. */
  notes: PhraseNote[];
  /** Roots by Ear: the comped chords (the notes are their roots). */
  chords?: Chord[];
  /** Grade the rhythm too (Play It Back f / ff). */
  rhythm: boolean;
  /** Swung 8ths (ff). */
  swing?: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
/** Play It Back phrase of a level (1 one note … 6 a jazz line with approach notes and rhythm). */
export function playbackItem(seed: number, level: number): HearItem {
  const rnd = rng(seed ^ 0x2545f491);
  const lv = clampLv(level);
  const key = pick(rnd, KEYS.slice(0, 6));
  const tonic = 60 + (key > 6 ? key - 12 : key);
  const cue = compVoicing({ root: key, quality: 'M' }, tonic - 12);
  const deg = (d: number) => tonic + (d >= 0 ? MAJOR[d] : MAJOR[d + 7] - 12);
  let degs: number[] = [];
  let notes: PhraseNote[];
  if (lv === 1) degs = [pick(rnd, [0, 1, 2, 3, 4, 5, 6])];
  else if (lv === 2) {
    const n = rnd() < 0.5 ? 2 : 3;
    degs = [pick(rnd, [0, 2, 4])];
    while (degs.length < n) degs.push(Math.max(-1, Math.min(7, degs[degs.length - 1] + pick(rnd, [-1, 1]))));
  } else if (lv === 3) {
    const chord = pick(rnd, [[0, 2, 4, 7], [4, 6, 8, 1], [3, 5, 0, 7]]);
    degs = [pick(rnd, chord)];
    while (degs.length < 4) {
      const nx = rnd() < 0.5 ? pick(rnd, chord) : degs[degs.length - 1] + pick(rnd, [-1, 1]);
      if (nx !== degs[degs.length - 1] && nx >= -1 && nx <= 8) degs.push(nx);
    }
  }
  if (lv <= 3) {
    notes = degs.map((d, i) => ({ midi: deg(d), at: i, len: 1 }));
    return { game: 'playback', level: lv, key, cue, notes, rhythm: false };
  }
  if (lv === 4) {
    // the bass line of four chords (roots, sometimes the 3rd in the bass on the third chord)
    const prog = pick(rnd, ROOT_PROGS[1]);
    const bass = tonic - 24;
    notes = prog.map(([s], i) => ({ midi: bass + s + (s > 7 ? -12 : 0) + (i === 2 && rnd() < 0.3 ? 4 : 0), at: i, len: 1 }));
    const chords = prog.map(([s, q]) => ({ root: pc12(key + s), quality: q, beats: 2 }));
    return { game: 'playback', level: lv, key, cue, notes, chords, rhythm: false };
  }
  // 5 / 6: a phrase with rhythm (beats), 6 = swung jazz line with a chromatic approach / enclosure into a chord tone
  const cells = lv === 5 ? [[1], [0.5, 0.5], [1.5, 0.5], [0.5, 1, 0.5], [2]] : [[0.5, 0.5], [0.5, 0.5], [1], [1.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
  const n = lv === 5 ? 5 + Math.floor(rnd() * 2) : 6 + Math.floor(rnd() * 3);
  const lens: number[] = [];
  while (lens.length < n) lens.push(...pick(rnd, cells));
  lens.length = n;
  let at = 0;
  let d = pick(rnd, [0, 2, 4]);
  const midis: number[] = [];
  for (let k = 0; k < n; k++) {
    if (lv === 6 && k > 0 && k < n - 2 && rnd() < 0.3) {
      // a half-step approach into the next diatonic note
      const target = d + pick(rnd, [-1, 1]);
      midis.push(deg(target) + (rnd() < 0.5 ? -1 : 1));
      d = target;
      continue;
    }
    midis.push(deg(d));
    d = Math.max(-1, Math.min(8, d + pick(rnd, [-2, -1, 1, 1, 2])));
  }
  notes = midis.map((m, k) => {
    const nn = { midi: m, at, len: lens[k] };
    at += lens[k];
    return nn;
  });
  // no two equal neighbours (the microphone hears each note)
  for (let k = 1; k < notes.length; k++) if (notes[k].midi === notes[k - 1].midi) notes[k].midi += 2;
  return { game: 'playback', level: lv, key, cue, notes, rhythm: true, swing: lv === 6 };
}

/** Roots by Ear item: a progression comped without bass; the answer is its roots in order. */
export function rootsItem(seed: number, level: number): HearItem {
  const rnd = rng(seed ^ 0x68e31da4);
  const lv = clampLv(level);
  const key = pick(rnd, KEYS);
  const prog = pick(rnd, ROOT_PROGS[lv - 1]);
  const chords = prog.map(([s, q]) => ({ root: pc12(key + s), quality: q, beats: 2 }));
  // E1…D♯2: the roots where a bass plays them
  const notes = chords.map((c, i) => ({ midi: 28 + pc12(c.root - 4), at: i, len: 1 }));
  return { game: 'rootsear', level: lv, key, cue: [], notes, chords, rhythm: false };
}

/** The sound of a hear-and-play item (seconds from t0): the cue chord, then the phrase (or the comped chords). */
export function hearEvents(it: HearItem, bpm: number, t0 = 0, bass = false): { events: NoteEvent[]; end: number } {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  let t = t0;
  if (it.cue.length) {
    for (const m of it.cue) ev.push({ midi: m, start: t, duration: beat * 1.6, velocity: 0.5 });
    t += beat * 2.5;
  }
  if (it.game === 'rootsear' && it.chords) {
    for (const c of it.chords) {
      for (const m of compVoicing(c)) ev.push({ midi: m, start: t, duration: c.beats * beat * 0.92, velocity: 0.55 });
      t += c.beats * beat;
    }
    return { events: ev, end: t };
  }
  if (it.chords && it.game === 'playback') {
    // the bass line under its chords
    it.chords.forEach((c, i) => {
      for (const m of compVoicing(c)) ev.push({ midi: m, start: t + i * c.beats * beat, duration: c.beats * beat * 0.9, velocity: 0.38 });
      ev.push({ midi: it.notes[i].midi, start: t + i * c.beats * beat, duration: c.beats * beat * 0.9, velocity: 0.75, ...(bass ? { inst: 'bass' as const } : {}) });
    });
    return { events: ev, end: t + it.chords.reduce((a, c) => a + c.beats * beat, 0) };
  }
  for (const n of it.notes) {
    const start = t + swungBeat(n.at, !!it.swing) * beat;
    ev.push({ midi: n.midi, start, duration: Math.max(0.15, n.len * beat * 0.9), velocity: 0.7 });
  }
  const last = it.notes[it.notes.length - 1];
  return { events: ev, end: t + (last ? (last.at + last.len) * beat : 0) };
}
/** Swung 8ths: the off-beat 8th sits at ⅔ of the beat. */
export const swungBeat = (at: number, swing: boolean): number => {
  if (!swing) return at;
  const b = Math.floor(at + 1e-9);
  const f = at - b;
  return Math.abs(f - 0.5) < 1e-6 ? b + 2 / 3 : at;
};

export interface Played {
  /** ms from the response's first beat (latency removed). */
  ms: number;
  midi: number;
}
export interface SeqGrade {
  /** Per target note: right pitch (class), in time (rhythm items), or missed. */
  marks: ('hit' | 'pitch' | 'miss')[];
  extra: number;
  /** Share of matched notes in time (rhythm items), else null. */
  rhythm: number | null;
  score: number;
}

/** Align played pitch classes to the target's in order (edit distance with substitutions = wrong notes). */
export function alignPcs(target: number[], played: number[]): { pairs: (number | null)[]; extra: number } {
  const n = target.length;
  const m = played.length;
  const D: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const same = pc12(target[i - 1]) === pc12(played[j - 1]) ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j - 1] + same, D[i - 1][j] + 1, D[i][j - 1] + 1);
    }
  const pairs: (number | null)[] = Array(n).fill(null);
  let i = n;
  let j = m;
  let used = 0;
  while (i > 0 && j > 0) {
    const same = pc12(target[i - 1]) === pc12(played[j - 1]) ? 0 : 1;
    if (D[i][j] === D[i - 1][j - 1] + same) {
      pairs[i - 1] = j - 1;
      used++;
      i--;
      j--;
    } else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  return { pairs, extra: m - used };
}

/** In time: within an 8th-ish window of the written onset (ms). */
export const timeWindow = (bpm: number) => Math.round(Math.max(80, Math.min(160, (60000 / bpm) * 0.3)));

/** Grade a take of a hear-and-play item: notes in order (pitch class, any octave), × rhythm on rhythm items. */
export function gradeSequence(it: HearItem, played: Played[], bpm: number): SeqGrade {
  const target = it.notes.map((n) => n.midi);
  const { pairs, extra } = alignPcs(target, played.map((p) => p.midi));
  const marks = pairs.map((j, k) => (j === null ? 'miss' : pc12(played[j].midi) === pc12(target[k]) ? 'hit' : 'pitch') as 'hit' | 'pitch' | 'miss');
  const hits = marks.filter((x) => x === 'hit').length;
  let rhythm: number | null = null;
  if (it.rhythm) {
    const beat = 60000 / bpm;
    const w = timeWindow(bpm);
    let inTime = 0;
    let matched = 0;
    pairs.forEach((j, k) => {
      if (j === null) return;
      matched++;
      const want = swungBeat(it.notes[k].at, !!it.swing) * beat;
      if (Math.abs(played[j].ms - want) <= w) inTime++;
    });
    rhythm = matched ? inTime / matched : 0;
  }
  const notesPart = Math.max(0, (hits + 0.25 * marks.filter((x) => x === 'pitch').length - 0.25 * extra) / Math.max(1, target.length));
  const score = Math.round(100 * Math.min(1, notesPart) * (rhythm === null ? 1 : 0.6 + 0.4 * rhythm));
  return { marks, extra, rhythm, score };
}

// ---------------------------------------------------------------- Walk the Changes

export interface WalkChart {
  level: number;
  key: number;
  name: Bi;
  /** Chords in order (beats each); bars are 4 beats. */
  chords: Chord[];
}
/** Walking rule per level: what beat 1 / 3 must be and whether beat 4 must approach the next chord. */
export interface WalkRule {
  /** The first beat of a chord: 'root' (pp), or any chord tone. */
  first: 'root' | 'tone';
  /** Beat 3 of a 4-beat chord: 'fifth' (pp) or a chord tone. */
  third: 'fifth' | 'tone';
  /** The beat before a chord change approaches the next root (a half / whole step away, or its 5th). */
  approach: boolean;
}
export const walkRule = (level: number): WalkRule => {
  const lv = clampLv(level);
  return { first: lv === 1 ? 'root' : 'tone', third: lv === 1 ? 'fifth' : 'tone', approach: lv === 3 || lv === 5 };
};

const BLUES_SEGS: Step[][] = [
  [I7, IV7, I7, I7],
  [IV7, IV7, I7, I7],
  [V7, IV7, I7, V7],
  [I7, IV7, I7, [0, '7']],
];
/** The chart a take walks over (4 bars, 8 at f / ff). */
export function walkChart(seed: number, level: number): WalkChart {
  const rnd = rng(seed ^ 0x1b873593);
  const lv = clampLv(level);
  const bar = (s: Step, key: number, beats = 4): Chord => ({ root: pc12(key + s[0]), quality: s[1], beats });
  if (lv <= 2) {
    const key = pick(rnd, [5, 10, 7, 0]);
    const seg = pick(rnd, BLUES_SEGS);
    return { level: lv, key, name: { en: 'Blues', he: 'בלוז' }, chords: seg.map((s) => bar(s, key)) };
  }
  if (lv === 3) {
    const key = pick(rnd, KEYS);
    const form = pick(rnd, [[ii7, V7, Imaj7, Imaj7], [ii7, V7, Imaj7, VI7], [iiø, V7, i7, i7]]);
    return { level: lv, key, name: { en: 'ii–V–I', he: 'ii–V–I' }, chords: form.map((s) => bar(s, key)) };
  }
  if (lv === 4) {
    const key = 10;
    const a = pick(rnd, [[Imaj7, VI7, ii7, V7, iii7, VI7, ii7, V7], [Imaj7, VI7, ii7, V7, I7, IV7, Imaj7, V7]]);
    return { level: lv, key, name: { en: 'Rhythm changes, A', he: 'ריתם צ׳יינג׳ס, A' }, chords: a.map((s) => bar(s, key, 2)) };
  }
  if (lv === 5) {
    const key = 10;
    // the bridge: III7 VI7 II7 V7, two bars each
    return { level: lv, key, name: { en: 'Rhythm changes, bridge', he: 'ריתם צ׳יינג׳ס, גשר' }, chords: [III7, VI7, II7, V7].flatMap((s) => [bar(s, key), bar(s, key)]) };
  }
  // Giant Steps, bars 1–8 (B major … ): | B D7 | G B♭7 | E♭ | Am7 D7 | G B♭7 | E♭ F♯7 | B | Fm7 B♭7 |
  const gs: [number, ChordQuality, number][] = [[11, 'maj7', 2], [2, '7', 2], [7, 'maj7', 2], [10, '7', 2], [3, 'maj7', 4], [9, 'm7', 2], [2, '7', 2], [7, 'maj7', 2], [10, '7', 2], [3, 'maj7', 2], [6, '7', 2], [11, 'maj7', 4], [5, 'm7', 2], [10, '7', 2]];
  return { level: lv, key: 11, name: { en: 'Giant Steps, bars 1–8', he: 'ג׳איינט סטפס, תיבות 1–8' }, chords: gs.map(([root, quality, beats]) => ({ root, quality, beats })) };
}
export const chartBeats = (c: WalkChart) => c.chords.reduce((a, x) => a + x.beats, 0);

export interface BeatTarget {
  beat: number;
  chord: number;
  /** What the note on this beat must be (null = any note, only time counts). */
  rule: 'root' | 'fifth' | 'tone' | 'approach' | null;
}
/** Every beat of a chart with its rule. */
export function walkTargets(c: WalkChart): BeatTarget[] {
  const r = walkRule(c.level);
  const out: BeatTarget[] = [];
  let b = 0;
  c.chords.forEach((ch, ci) => {
    for (let k = 0; k < ch.beats; k++) {
      const next = c.chords[ci + 1];
      let rule: BeatTarget['rule'] = null;
      if (k === 0) rule = r.first;
      else if (k === 2) rule = r.third;
      if (k === ch.beats - 1 && r.approach && next && (next.root !== ch.root || next.quality !== ch.quality) && k !== 0) rule = 'approach';
      out.push({ beat: b + k, chord: ci, rule });
    }
    b += ch.beats;
  });
  return out;
}
/** Does a played pitch keep a beat's rule? */
export function keepsRule(t: BeatTarget, c: WalkChart, midi: number): boolean {
  const ch = c.chords[t.chord];
  const p = pc12(midi);
  switch (t.rule) {
    case null:
      return true;
    case 'root':
      return p === pc12(ch.root);
    case 'fifth':
      return p === pc12(ch.root + 7) || p === pc12(ch.root + (ch.quality === 'm7b5' || ch.quality === 'dim7' ? 6 : 7));
    case 'tone':
      return chordPcs(ch).includes(p);
    case 'approach': {
      const nx = c.chords[t.chord + 1];
      if (!nx) return true;
      const d = Math.min(pc12(p - nx.root), pc12(nx.root - p));
      return d === 1 || d === 2 || p === pc12(nx.root + 7);
    }
  }
}

export interface WalkGrade {
  /** Per beat: 'hit' (time + rule), 'note' (in time, rule broken), 'miss' (no note in time). */
  marks: ('hit' | 'note' | 'miss')[];
  inTime: number;
  ruleKept: number;
  score: number;
  meanOffsetMs: number | null;
}
/** Grade a walking take: one note per beat in the window; on a rule beat the note must keep the rule. */
export function gradeWalk(c: WalkChart, played: Played[], bpm: number, windowMs = timeWindow(bpm)): WalkGrade {
  const beat = 60000 / bpm;
  const used = new Set<number>();
  const offs: number[] = [];
  let pts = 0;
  let inTime = 0;
  let kept = 0;
  let rules = 0;
  const targets = walkTargets(c);
  const marks = targets.map((t) => {
    const want = t.beat * beat;
    let best = -1;
    let bd = Infinity;
    played.forEach((p, i) => {
      const d = Math.abs(p.ms - want);
      if (!used.has(i) && d <= windowMs && d < bd) {
        best = i;
        bd = d;
      }
    });
    if (t.rule) rules++;
    if (best < 0) return 'miss' as const;
    used.add(best);
    inTime++;
    offs.push(played[best].ms - want);
    const ok = keepsRule(t, c, played[best].midi);
    if (t.rule && ok) kept++;
    pts += t.rule ? (ok ? 1 : 0.5) : 1;
    return (ok ? 'hit' : 'note') as 'hit' | 'note';
  });
  return {
    marks,
    inTime,
    ruleKept: rules ? kept / rules : 1,
    score: Math.round((100 * pts) / Math.max(1, targets.length)),
    meanOffsetMs: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null,
  };
}

// ---------------------------------------------------------------- Chord Change Race

const OPEN: [number, ChordQuality][] = [[0, 'M'], [9, 'M'], [7, 'M'], [4, 'M'], [2, 'M'], [9, 'm'], [4, 'm'], [2, 'm']];
const OPEN7: [number, ChordQuality][] = [[9, '7'], [2, '7'], [4, '7'], [7, '7'], [0, '7'], [11, '7'], [9, 'm7'], [4, 'm7'], [2, 'm7']];
/** The four (ff: four, two beats each, played twice) chords of a take. */
export function changeChords(seed: number, level: number, beats = 4): Chord[] {
  const rnd = rng(seed ^ 0x27d4eb2f);
  const lv = clampLv(level);
  const fromPool = (pool: [number, ChordQuality][]) => {
    const out: Chord[] = [];
    while (out.length < 4) {
      const [root, quality] = pick(rnd, pool);
      const prev = out[out.length - 1];
      if (prev && prev.root === root && prev.quality === quality) continue;
      out.push({ root, quality, beats });
    }
    return out;
  };
  if (lv === 1) return fromPool(OPEN);
  if (lv === 2) return fromPool([...OPEN, ...OPEN7]);
  if (lv === 3) return fromPool([1, 3, 5, 6, 8, 10, 11, 0, 2, 4, 7, 9].flatMap((r) => [[r, 'M'], [r, 'm']] as [number, ChordQuality][]));
  const key = pick(rnd, KEYS);
  const prog: Step[] = lv === 4 ? pick(rnd, [[Imaj7, vi7, ii7, V7], [Imaj7, IV7, iii7, VI7], [ii7, V7, Imaj7, IV7]]) : lv === 5 ? pick(rnd, [[ii7, V7, Imaj7, VI7], [iiø, V7, i7, iv7], [iii7, VI7, ii7, V7]]) : pick(rnd, [[Imaj7, VI7, ii7, [7, '9']], [iii7, [3, 'dim7'], ii7, V7], [ii7, [7, '9'], Imaj7, [2, 'dim7']]]);
  return prog.map(([s, q]) => ({ root: pc12(key + s), quality: q, beats }));
}

export interface StrumHit {
  /** ms from the first chord's downbeat (latency removed). */
  ms: number;
  verdict: 'right' | 'wrong' | 'again';
  /** The chord this strum was judged against (index). */
  chord: number;
}
export interface ChangeGrade {
  marks: ('hit' | 'late' | 'unclear' | 'wrong' | 'miss')[];
  offsets: (number | null)[];
  score: number;
}
/** Strum window (± ms) for "on the beat": a strum onset is less sharp than a key press. */
export const STRUM_WINDOW_MS = 130;
/** Which chord slot a strum at `ms` belongs to (the slot whose downbeat it is nearest, from 300 ms before it). */
export function slotOf(chords: Chord[], ms: number, bpm: number): number {
  const beat = 60000 / bpm;
  let t = 0;
  let best = -1;
  for (let i = 0; i < chords.length; i++) {
    if (ms >= t - 300) best = i;
    t += chords[i].beats * beat;
  }
  return ms > t ? -1 : best;
}
/** Grade a take: each chord's first strum, its verdict and how close to the downbeat. */
export function gradeChanges(chords: Chord[], strums: StrumHit[], bpm: number): ChangeGrade {
  const beat = 60000 / bpm;
  let t = 0;
  const marks: ChangeGrade['marks'] = [];
  const offsets: (number | null)[] = [];
  let pts = 0;
  chords.forEach((c, i) => {
    const s = strums.filter((x) => x.chord === i).sort((a, b) => a.ms - b.ms)[0];
    if (!s) {
      marks.push('miss');
      offsets.push(null);
    } else {
      const off = s.ms - t;
      offsets.push(Math.round(off));
      const onTime = Math.abs(off) <= STRUM_WINDOW_MS;
      const close = Math.abs(off) <= 2.5 * STRUM_WINDOW_MS;
      if (s.verdict === 'right') {
        marks.push(onTime ? 'hit' : close ? 'late' : 'late');
        pts += onTime ? 1 : close ? 0.6 : 0.3;
      } else if (s.verdict === 'again') {
        marks.push('unclear');
        pts += onTime ? 0.3 : 0;
      } else marks.push('wrong');
    }
    t += c.beats * beat;
  });
  return { marks, offsets, score: Math.round((100 * pts) / Math.max(1, chords.length)) };
}

// ---------------------------------------------------------------- the take-based run (Play It Back, Roots by Ear, Walk, Changes)

export type TakeGame = 'playback' | 'rootsear' | 'walkchanges' | 'changerace';
export const TAKES_PER_RUN: Record<TakeGame, number> = { playback: 6, rootsear: 8, walkchanges: 4, changerace: 4 };
export const TAKE_LIVES = 3;
/** A take under this costs a life. */
export const TAKE_PASS = 70;

export interface TakeSave {
  v: 1;
  game: TakeGame;
  seed: number;
  level: number;
  bpm: number;
  tier?: DynName;
  takes: number[];
  lives: number;
}
export const newTakeSave = (game: TakeGame, seed: number, level: number, bpm: number, tier?: DynName): TakeSave => ({ v: 1, game, seed: seed >>> 0, level: clampLv(level), bpm, ...(tier ? { tier } : {}), takes: [], lives: TAKE_LIVES });
export function isTakeSave(x: unknown, game: TakeGame): x is TakeSave {
  const s = x as TakeSave | null;
  return !!s && s.v === 1 && s.game === game && typeof s.seed === 'number' && Array.isArray(s.takes) && s.lives > 0 && s.takes.length < TAKES_PER_RUN[game];
}
/** The seed of take i (each take its own item). */
export const takeSeed = (s: TakeSave, i = s.takes.length) => (s.seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;
export function addTakeScore(s: TakeSave, score: number): TakeSave {
  return { ...s, takes: [...s.takes, Math.round(score)], lives: score < TAKE_PASS ? s.lives - 1 : s.lives };
}
export const takeRunOver = (s: TakeSave) => s.lives <= 0 || s.takes.length >= TAKES_PER_RUN[s.game];
export function takeRunResult(s: TakeSave, input: string) {
  const accuracy = s.takes.length ? Math.round(s.takes.reduce((a, b) => a + b, 0) / s.takes.length) : 0;
  return { game: s.game, score: s.takes.reduce((a, b) => a + b, 0) * s.level, detail: { accuracy, takes: s.takes.length, rounds: s.takes.length, input, level: s.level, ...(s.tier ? { tier: s.tier } : {}) } };
}

// ---------------------------------------------------------------- Voicing Sprint

export type VoicingKind = 'triad' | 'inversion' | 'shell' | 'rootless' | 'drop2' | 'upper';
export interface VoicingItem {
  level: number;
  kind: VoicingKind;
  chord: Chord;
  /** The symbol to show ("C/E", "D♭7", "D/C7"). */
  symbol: string;
  /** What to play, in words. */
  how: Bi;
  /** Pitch classes from the lowest note up (exact order) — or, for 'upper', the shell's two then the triad's three. */
  order: number[];
  /** Upper structures: the triad's root (its three tones in any inversion above the shell). */
  triad?: number;
}
const NM = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const DEG = (q: ChordQuality) => QUALITY_INTS[q];
const UPPER: { iv: number; en: string; he: string }[] = [
  { iv: 2, en: 'II triad: 9, ♯11, 13', he: 'משולש II: 9, ♯11, 13' },
  { iv: 8, en: '♭VI triad: ♭13, 1, ♯9', he: 'משולש ♭VI: ♭13, 1, ♯9' },
  { iv: 9, en: 'VI triad: 13, ♭9, 3', he: 'משולש VI: 13, ♭9, 3' },
  { iv: 6, en: '♭V triad: ♭5, ♭7, ♭9', he: 'משולש ♭V: ♭5, ♭7, ♭9' },
];
/** The voicing to play at a level (1 triads … 6 upper structures). */
export function voicingItem(seed: number, level: number): VoicingItem {
  const rnd = rng(seed ^ 0x165667b1);
  const lv = clampLv(level);
  const root = Math.floor(rnd() * 12);
  if (lv <= 2) {
    const quality: ChordQuality = rnd() < 0.5 ? 'M' : 'm';
    const ints = DEG(quality);
    const inv = lv === 1 ? 0 : 1 + Math.floor(rnd() * 2);
    const order = [...ints.slice(inv), ...ints.slice(0, inv)].map((i) => pc12(root + i));
    const bass = order[0];
    const sym = chordSymbol({ root, quality, ...(inv ? { bass } : {}) });
    const how: Bi = lv === 1 ? { en: 'Root position (any spacing)', he: 'מצב יסודי (בכל פריסה)' } : { en: inv === 1 ? '3rd in the bass' : '5th in the bass', he: inv === 1 ? 'הטרצה בבס' : 'הקווינטה בבס' };
    return { level: lv, kind: lv === 1 ? 'triad' : 'inversion', chord: { root, quality, beats: 4 }, symbol: sym, how, order };
  }
  const quality: ChordQuality = pick(rnd, ['maj7', '7', 'm7'] as ChordQuality[]);
  const [r, t3, t5, t7] = DEG(quality).map((i) => pc12(root + i));
  const sym = chordSymbol({ root, quality });
  if (lv === 3) {
    const up = rnd() < 0.5;
    return { level: lv, kind: 'shell', chord: { root, quality, beats: 4 }, symbol: sym, how: up ? { en: 'Shell 1-3-7', he: 'שֶׁל 1-3-7' } : { en: 'Shell 1-7-3', he: 'שֶׁל 1-7-3' }, order: up ? [r, t3, t7] : [r, t7, t3] };
  }
  if (lv === 4) {
    const nine = pc12(root + 2);
    const a = rnd() < 0.5;
    return { level: lv, kind: 'rootless', chord: { root, quality, beats: 4 }, symbol: sym, how: a ? { en: 'Rootless A: 3-5-7-9', he: 'בלי שורש A: 3-5-7-9' } : { en: 'Rootless B: 7-9-3-5', he: 'בלי שורש B: 7-9-3-5' }, order: a ? [t3, t5, t7, nine] : [t7, nine, t3, t5] };
  }
  if (lv === 5) {
    // drop 2: close position with a named top voice, the second voice from the top an octave down
    const close = [r, t3, t5, t7];
    const top = Math.floor(rnd() * 4);
    // close voicing low→high whose top is close[top]: the four tones rotated so close[top] is last
    const rot = [...close.slice(top + 1), ...close.slice(0, top + 1)];
    const order = [rot[2], rot[0], rot[1], rot[3]];
    const names = ['root', '3rd', '5th', '7th'];
    const he = ['השורש', 'הטרצה', 'הקווינטה', 'הספטימה'];
    return { level: lv, kind: 'drop2', chord: { root, quality, beats: 4 }, symbol: sym, how: { en: `Drop 2, the ${names[top]} on top`, he: `דרופ 2, ${he[top]} למעלה` }, order };
  }
  const u = pick(rnd, UPPER);
  const dom: ChordQuality = '7';
  const [, d3, , d7] = DEG(dom).map((i) => pc12(root + i));
  const triad = pc12(root + u.iv);
  const tq: ChordQuality = 'M';
  const tri = DEG(tq).map((i) => pc12(triad + i));
  return { level: lv, kind: 'upper', chord: { root, quality: dom, beats: 4 }, symbol: `${NM[triad]}/${NM[root]}7`, how: { en: `3 and ♭7 below, ${u.en}`, he: `3 ו־♭7 למטה, ${u.he}` }, order: [d3, d7, ...tri], triad };
}

/** Is a held chord (MIDI notes) the asked voicing? */
export function judgeVoicing(it: VoicingItem, notes: number[]): boolean {
  const ns = [...new Set(notes.map((n) => Math.round(n)))].sort((a, b) => a - b);
  const pcs = ns.map(pc12);
  const want = new Set(it.order);
  switch (it.kind) {
    case 'triad':
      // root position: the lowest note is the root, every tone present, nothing else (doublings allowed)
      return ns.length >= 3 && pcs[0] === it.order[0] && pcs.every((p) => want.has(p)) && it.order.every((p) => pcs.includes(p));
    case 'inversion':
      return ns.length >= 3 && pcs[0] === it.order[0] && pcs.every((p) => want.has(p)) && it.order.every((p) => pcs.includes(p));
    case 'shell':
    case 'rootless':
    case 'drop2':
      return ns.length === it.order.length && pcs.every((p, i) => p === it.order[i]) && (it.kind !== 'rootless' || ns[ns.length - 1] - ns[0] < 12) && (it.kind !== 'drop2' || ns[ns.length - 1] - ns[0] >= 12);
    case 'upper': {
      if (ns.length !== 5) return false;
      const shell = new Set(pcs.slice(0, 2));
      const top = pcs.slice(2);
      return shell.has(it.order[0]) && shell.has(it.order[1]) && it.order.slice(2).every((p) => top.includes(p)) && top.every((p) => it.order.slice(2).includes(p));
    }
  }
}
/** Notes the voicing needs (to know when a held chord is complete). */
export const voicingSize = (it: VoicingItem) => (it.kind === 'upper' ? 5 : it.kind === 'triad' || it.kind === 'inversion' ? 3 : it.order.length);
/** One playable spelling of the voicing (to show after a miss): the order stacked up from around C3/C4. */
export function voicingExample(it: VoicingItem): number[] {
  const out: number[] = [];
  let at = it.kind === 'shell' || it.kind === 'upper' ? 48 : 55;
  it.order.forEach((p, i) => {
    let m = at + ((p - at) % 12 + 12) % 12;
    if (out.length && m <= out[out.length - 1]) m += 12;
    if (it.kind === 'drop2' && i === 1 && m - out[0] < 5) m += 12;
    out.push(m);
    at = m + 1;
  });
  return out;
}

export const VOICING_MS = 60_000;
export const VOICING_WRONG_MS = 2_000;
export interface VoicingRun {
  v: 1;
  game: 'voicingsprint';
  seed: number;
  level: number;
  tier?: DynName;
  i: number;
  right: number;
  wrong: number;
  timeLeftMs: number;
}
export const newVoicingRun = (seed: number, level: number, tier?: DynName): VoicingRun => ({ v: 1, game: 'voicingsprint', seed: seed >>> 0, level: clampLv(level), ...(tier ? { tier } : {}), i: 0, right: 0, wrong: 0, timeLeftMs: VOICING_MS });
export const isVoicingRun = (x: unknown): x is VoicingRun => {
  const s = x as VoicingRun | null;
  return !!s && s.v === 1 && s.game === 'voicingsprint' && typeof s.seed === 'number' && s.timeLeftMs > 0;
};
export const voicingAt = (s: VoicingRun) => voicingItem((s.seed + Math.imul(s.i + 1, 0x9e3779b1)) >>> 0, s.level);
export function voicingAnswer(s: VoicingRun, right: boolean): VoicingRun {
  return { ...s, i: s.i + 1, right: s.right + (right ? 1 : 0), wrong: s.wrong + (right ? 0 : 1), timeLeftMs: right ? s.timeLeftMs : Math.max(0, s.timeLeftMs - VOICING_WRONG_MS) };
}
export const voicingTick = (s: VoicingRun, ms: number): VoicingRun => ({ ...s, timeLeftMs: Math.max(0, s.timeLeftMs - Math.max(0, ms)) });
export function voicingResult(s: VoicingRun, input: string) {
  return { game: 'voicingsprint' as const, score: s.right * 10 * s.level, detail: { right: s.right, wrong: s.wrong, level: s.level, input, ...(s.tier ? { tier: s.tier } : {}) } };
}
