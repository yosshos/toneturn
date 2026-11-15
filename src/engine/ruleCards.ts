// Rule cards (docs/AUDIT-DEPTH-3.md C5, owner 2026-11-14): measurable improvisation rules that ask for the drilled
// vocabulary — Barry Harris's half-step rules, the pivot, each enclosure type, approach notes, triad pairs, pentatonic
// superimposition, "use a lick you learned", guide-tone targeting — plus the owner's wider library (rhythm, motif,
// harmony, shape, touch, instrument). Each card is an analyzer over the played notes: pitch, beat, contour, density.
// Pure. The improv studio (improvRules.ts) and the graded improv drills (soloDrills.ts, analyze.ts) both use it.
//
// Conventions: beats are quarter beats from the chart's first beat; "on the beat" = within 0.15 of a whole beat; a
// phrase is a run of notes with rests shorter than 0.9 beat between them (as in checkRules). "Once every 4 bars" cards
// count the 4-bar windows that have notes in them (total) and the windows where the device was found (ok).

import { MODE_STEPS, type ModeId } from './modes';
import type { ParsedChart } from './charts';
import { LICKS, type Lick } from './licks';
import { findLick, qualityOfIntervals, type ChartSpan, type ImpNote } from './lickDetect';
import { TRIAD_PAIRS, pairTriads } from './theoryPlay';

type Bi = { en: string; he: string };

/** One played note: beat from the chart's first beat (quarter beats), length in beats, MIDI; velocity / string when known. */
export interface CNote {
  beat: number;
  dur: number;
  midi: number;
  vel?: number;
  string?: number;
}
/** One chord of the chart in beats: root pitch class, intervals above the root (as parseChart gives them). */
export interface CSpan {
  at: number;
  beats: number;
  root: number;
  iv: number[];
}
export interface CardOpt {
  /** Piano duo: notes below this pitch are the left hand. */
  split?: number;
  /** use-lick: the licks that count (default the whole library). */
  lickIds?: string[];
  /** quote-head: the tune's melody (beats, MIDI). */
  melody?: { beat: number; midi: number }[];
}
export interface CardCtx {
  notes: CNote[];
  spans: CSpan[];
  meter: number;
  bpm: number;
  opt?: CardOpt;
}
export interface CardCheck {
  ok: number;
  total: number;
  /** Beats where the card was broken (the studio's bar map). */
  miss?: number[];
}
export type CardFam = 'vocab' | 'note' | 'interval' | 'rhythm' | 'shape' | 'touch' | 'inst';
export interface CardDef {
  id: string;
  fam: CardFam;
  name: Bi;
  how: Bi;
  /** 1 easy … 5 hard (the studio's dots). */
  level: number;
  /** Path difficulty (700–1900) where the card is first asked for. */
  diff: number;
  /** Share of `ok / total` needed to keep the card (count cards: total = needed occurrences). */
  pass: number;
  /** What the analyzer needs beyond pitch and time: MIDI velocity, the string, the hand split, a melody. */
  needs?: 'velocity' | 'string' | 'split' | 'melody';
  check: (ctx: CardCtx) => CardCheck;
}

// ───────────────────────────── music helpers ─────────────────────────────

const mod12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;
const EPS = 1e-6;

/** The usual chord-scale for a chord (by its intervals) — the default when nobody set one. */
export function autoScale(iv: number[]): ModeId {
  const has = (x: number) => iv.includes(x);
  if (has(3) && has(6) && has(9)) return 'diminished';
  if (has(3) && has(6)) return 'locrian';
  if (has(3) && has(11)) return 'melodic-minor';
  if (has(3)) return 'dorian';
  if (has(11) && has(18)) return 'lydian';
  if (has(4) && has(8) && has(10)) return 'whole-tone';
  if (has(5) && has(10) && has(13)) return 'phrygian';
  if (has(4) && has(10) && (has(13) || has(15) || has(20))) return 'altered';
  if (has(4) && has(10) && has(18)) return 'lydian-dominant';
  if (has(4) && has(10)) return 'mixolydian';
  if (has(5) && has(10)) return 'mixolydian';
  if (has(4) && has(8)) return 'whole-tone';
  return 'ionian';
}

/** The basic chord tones (relative pitch classes): root, 3rd, 5th, 7th (each may be missing). */
export function tonesOf(iv: number[]): { root: number; third?: number; fifth?: number; seventh?: number } {
  const m = iv.map((x) => x % 12);
  const third = m.find((x) => x === 3 || x === 4) ?? (m.includes(5) ? 5 : m.includes(2) ? 2 : undefined);
  const fifth = m.find((x) => x === 7 || x === 6 || x === 8);
  const seventh = m.find((x) => x === 10 || x === 11) ?? (m.includes(9) && (m.includes(3) || m.includes(4)) ? 9 : undefined);
  return { root: 0, third, fifth, seventh };
}
const basicOf = (iv: number[]): number[] => {
  const t = tonesOf(iv);
  return [t.root, t.third, t.fifth, t.seventh].filter((x): x is number => x !== undefined);
};
const scaleOf = (iv: number[]): number[] => [...new Set(MODE_STEPS[autoScale(iv)].map((x) => x % 12))];
const isDom = (iv: number[]): boolean => {
  const t = tonesOf(iv);
  return t.third === 4 && t.seventh === 10;
};
const isMinor7 = (iv: number[]): boolean => {
  const t = tonesOf(iv);
  return t.third === 3 && t.fifth === 7;
};
const relOf = (n: CNote, s: CSpan): number => mod12(n.midi - s.root);
const sameChord = (a: CSpan, b: CSpan): boolean => a.root === b.root && a.iv.join() === b.iv.join();

function spanAt(ctx: CardCtx, beat: number): CSpan | null {
  for (const s of ctx.spans) if (beat >= s.at - EPS && beat < s.at + s.beats - EPS) return s;
  return null;
}
/** The span of a note (a note a hair early — under 0.15 beat — belongs to the chord it anticipates). */
const spanOfNote = (ctx: CardCtx, n: CNote): CSpan | null => spanAt(ctx, n.beat + 0.15) ?? spanAt(ctx, n.beat);
const frac = (b: number): number => b - Math.floor(b);
const onBeat = (b: number): boolean => frac(b) < 0.15 || frac(b) > 0.85;
const isChordTone = (ctx: CardCtx, n: CNote): boolean => {
  const s = spanOfNote(ctx, n);
  if (!s) return false;
  const r = relOf(n, s);
  return basicOf(s.iv).includes(r) || s.iv.map((x) => x % 12).includes(r);
};
const sorted = (ctx: CardCtx): CNote[] => ctx.notes.filter((n) => n.dur > 0).slice().sort((a, b) => a.beat - b.beat || a.midi - b.midi);
/** Single-line view: one note per onset (the highest of a chord), for line-shape cards. */
function line(ctx: CardCtx): CNote[] {
  const out: CNote[] = [];
  for (const n of sorted(ctx)) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.beat - n.beat) < 0.08) {
      if (n.midi > last.midi) out[out.length - 1] = n;
    } else out.push(n);
  }
  return out;
}
function phrases(ns: CNote[]): CNote[][] {
  const out: CNote[][] = [];
  for (const n of ns) {
    const last = out[out.length - 1];
    if (last) {
      const p = last[last.length - 1];
      if (n.beat - (p.beat + p.dur) <= 0.9) {
        last.push(n);
        continue;
      }
    }
    out.push([n]);
  }
  return out;
}
/** Consecutive (legato-ish) neighbours: the next note starts within a beat of the last one ending. */
const linked = (a: CNote, b: CNote): boolean => b.beat - (a.beat + a.dur) <= 1 + EPS && b.beat > a.beat;
const barsOf = (ctx: CardCtx, ns: CNote[]): number => {
  const end = Math.max(0, ...ctx.spans.map((s) => s.at + s.beats), ...ns.map((n) => n.beat + n.dur));
  return Math.max(1, Math.ceil(end / ctx.meter - EPS));
};
const barOf = (ctx: CardCtx, b: number): number => Math.floor(b / ctx.meter + 1e-6);
const ivs = (ns: CNote[]): number[] => ns.slice(1).map((n, i) => Math.round(n.midi) - Math.round(ns[i].midi));

/** Count cards: each 4-bar window with notes needs one hit (a hit is the beat where the device ends). */
function perWindow(ctx: CardCtx, ns: CNote[], hits: number[]): CardCheck {
  const win = 4 * ctx.meter;
  const used = new Set(ns.map((n) => Math.floor(n.beat / win + 1e-6)));
  const got = new Set(hits.map((b) => Math.floor(b / win + 1e-6)));
  let ok = 0;
  const miss: number[] = [];
  for (const w of used) {
    if (got.has(w)) ok++;
    else miss.push(w * win);
  }
  return { ok, total: used.size, miss };
}
/** Tally per-item results. */
function tally(items: { ok: boolean; beat: number }[]): CardCheck {
  return { ok: items.filter((x) => x.ok).length, total: items.length, miss: items.filter((x) => !x.ok).map((x) => x.beat) };
}
/** The chord changes (a new chord, not a repeat of the same one). */
function changes(ctx: CardCtx): CSpan[] {
  const out: CSpan[] = [];
  ctx.spans.forEach((s, i) => {
    if (i === 0 || !sameChord(s, ctx.spans[i - 1])) out.push(s);
  });
  return out;
}
/** The note heard at a chord change: one starting within a quarter beat of it, or one held across it. */
function atChange(ns: CNote[], at: number): CNote | null {
  const near = ns.filter((n) => Math.abs(n.beat - at) <= 0.25).sort((a, b) => Math.abs(a.beat - at) - Math.abs(b.beat - at));
  if (near.length) return near[0];
  return ns.find((n) => n.beat < at && n.beat + n.dur > at + 0.1) ?? null;
}
/**
 * Target cards (COURSE-FEEDBACK-UI §4.7): the chord tones a card asks for at each change — printed under the chord
 * before the take ("→ E"), and the note really landed on after it.
 */
export const TARGET_CARDS: Record<string, ('third' | 'seventh')[]> = { 'guide-target': ['third', 'seventh'], 'three-on-one': ['third'] };
/** The note heard at each chord change (null: a rest there), with the change's chord. */
export function changeLandings(ctx: CardCtx): { at: number; span: CSpan; landed: CNote | null }[] {
  const ns = line(ctx);
  return changes(ctx).map((s) => ({ at: s.at, span: s, landed: atChange(ns, s.at) }));
}
/** The target pitch classes of a chord for a target card (absolute, 0–11). */
export function targetPcs(span: Pick<CSpan, 'root' | 'iv'>, want: ('third' | 'seventh')[]): number[] {
  const t = tonesOf(span.iv);
  return want.map((w) => t[w]).filter((x): x is number => x !== undefined).map((x) => mod12(span.root + x));
}
/** Judge the note at every chord change (changes where nothing sounds are not judged: a rest). */
function eachChange(ctx: CardCtx, ok: (n: CNote, s: CSpan) => boolean, ns = line(ctx)): CardCheck {
  const items: { ok: boolean; beat: number }[] = [];
  for (const s of changes(ctx)) {
    const n = atChange(ns, s.at);
    if (n) items.push({ ok: ok(n, s), beat: s.at });
  }
  return tally(items);
}
/** Notes per span (by onset). */
function bySpan(ctx: CardCtx, ns: CNote[]): { s: CSpan; ns: CNote[] }[] {
  return ctx.spans.map((s) => ({ s, ns: ns.filter((n) => spanOfNote(ctx, n) === s) })).filter((x) => x.ns.length > 0);
}

// ───────────────────────────── enclosures (bebopVocab leadIn) ─────────────────────────────

type EncId = 'enc-ab' | 'enc-ba' | 'enc-step' | 'enc-bebop' | 'enc-delayed';
/** The notes before a target for each enclosure type (bebopVocab.ts leadIn); `scale` = pitch classes of the chord scale. */
function encLead(id: EncId, T: number, scale: number[]): number[][] {
  switch (id) {
    case 'enc-ab':
      return [[T + 1, T - 1]];
    case 'enc-ba':
      return [[T - 1, T + 1]];
    case 'enc-step':
      // the scale step above (a half or whole step), then the half step below
      return [T + 1, T + 2].filter((p) => scale.includes(mod12(p))).map((p) => [p, T - 1]);
    case 'enc-bebop':
      return [[T + 2, T + 1, T - 1]];
    case 'enc-delayed':
      return [[T + 1, T - 1, T - 2, T - 1]];
  }
}
function encHits(ctx: CardCtx, id: EncId): number[] {
  const ns = line(ctx);
  const hits: number[] = [];
  ns.forEach((T, i) => {
    if (!onBeat(T.beat) || !isChordTone(ctx, T)) return;
    const s = spanOfNote(ctx, T)!;
    const sc = [...new Set([...scaleOf(s.iv), ...s.iv.map((x) => x % 12)])].map((x) => mod12(x + s.root));
    for (const lead of encLead(id, Math.round(T.midi), sc)) {
      const k = lead.length;
      if (i < k) continue;
      const prev = ns.slice(i - k, i + 1);
      if (prev.slice(0, k).every((n, j) => Math.round(n.midi) === lead[j]) && prev.every((n, j) => j === 0 || linked(prev[j - 1], n))) {
        hits.push(T.beat);
        return;
      }
    }
  });
  return hits;
}

// ───────────────────────────── the cards ─────────────────────────────

const enc = (id: EncId, name: Bi, how: Bi, level: number, diff: number): CardDef => ({
  id,
  fam: 'vocab',
  name,
  how,
  level,
  diff,
  pass: 0.75,
  check: (ctx) => perWindow(ctx, line(ctx), encHits(ctx, id)),
});

const PENT_MAJ = [0, 2, 4, 7, 9];
const PENT_MIN = [0, 3, 5, 7, 10];
/** Superimposed pentatonics per chord family: [semitones above the root, major?]. */
function superPents(iv: number[]): number[][] {
  const q = qualityOfIntervals(iv);
  const pent = (on: number, maj: boolean) => (maj ? PENT_MAJ : PENT_MIN).map((x) => mod12(x + on));
  if (q === 'maj7' || q === '6') return [pent(7, true), pent(2, true)];
  if (q === 'm7' || q === 'm6') return [pent(7, false), pent(2, false)];
  if (q === '7') return [pent(2, true)];
  if (q === 'alt' || q === 'hd7') return [pent(3, false)];
  return [];
}

const CARDS: CardDef[] = [
  // ---- vocabulary
  {
    id: 'harris',
    fam: 'vocab',
    name: { en: 'Barry Harris rules', he: 'החוקים של בארי האריס' },
    how: { en: 'Chord tones on the beats; between them scale tones, or a half step into the next note.', he: 'צלילי אקורד על הפעמות; ביניהם צלילי סולם, או חצי טון אל הצליל הבא.' },
    level: 3,
    diff: 1450,
    pass: 0.85,
    check: (ctx) => {
      const ns = line(ctx);
      return tally(
        ns.map((n, i) => {
          const s = spanOfNote(ctx, n);
          if (!s) return { ok: false, beat: n.beat };
          if (onBeat(n.beat)) return { ok: isChordTone(ctx, n), beat: n.beat };
          const nx = ns[i + 1];
          const half = !!nx && linked(n, nx) && Math.abs(Math.round(nx.midi) - Math.round(n.midi)) === 1;
          return { ok: scaleOf(s.iv).includes(relOf(n, s)) || half, beat: n.beat };
        }),
      );
    },
  },
  {
    id: 'pivot',
    fam: 'vocab',
    name: { en: 'Play a pivot', he: 'לנגן פיבוט' },
    how: { en: 'Once every 4 bars: a chord tone on top, drop a 6th to the next chord tone, climb.', he: 'פעם בכל 4 תיבות: צליל אקורד למעלה, ירידה של סקסטה לצליל האקורד הבא, וטיפוס.' },
    level: 4,
    diff: 1560,
    pass: 0.75,
    check: (ctx) => {
      const ns = line(ctx);
      const hits: number[] = [];
      for (let i = 0; i + 3 < ns.length; i++) {
        const q = ns.slice(i, i + 4);
        const s = spanOfNote(ctx, q[0]);
        if (!s || q.some((n) => spanOfNote(ctx, n) !== s || !isChordTone(ctx, n))) continue;
        if (!q.every((n, j) => j === 0 || linked(q[j - 1], n))) continue;
        const m = q.map((n) => Math.round(n.midi));
        const drop = m[0] - m[1];
        // a 6th (8 / 9) from the root, 3rd or 5th on top; a 7th (10 / 11) with the 7th on top (rotation 3)
        if (drop >= 8 && drop <= 11 && m[1] < m[2] && m[2] < m[3] && m[3] <= m[0] + 1 && m[3] - m[1] <= 9) hits.push(q[3].beat);
      }
      return perWindow(ctx, ns, hits);
    },
  },
  enc('enc-ab', { en: 'Enclose: above, below', he: 'כיתור: מעל, מתחת' }, { en: 'Once every 4 bars: half step above, half step below, the chord tone on the beat.', he: 'פעם בכל 4 תיבות: חצי טון מעל, חצי טון מתחת, צליל האקורד על הפעמה.' }, 3, 1380),
  enc('enc-ba', { en: 'Enclose: below, above', he: 'כיתור: מתחת, מעל' }, { en: 'Once every 4 bars: half step below, half step above, the chord tone on the beat.', he: 'פעם בכל 4 תיבות: חצי טון מתחת, חצי טון מעל, צליל האקורד על הפעמה.' }, 3, 1380),
  enc('enc-step', { en: 'Enclose: scale step above', he: 'כיתור: צעד סולם מעל' }, { en: 'Once every 4 bars: the scale step above, the half step below, the chord tone.', he: 'פעם בכל 4 תיבות: צעד הסולם מעל, חצי הטון מתחת, צליל האקורד.' }, 3, 1420),
  enc('enc-bebop', { en: 'The bebop enclosure', he: 'כיתור הביבופ' }, { en: 'Once every 4 bars: whole step above, half step above, half step below, the target.', he: 'פעם בכל 4 תיבות: טון מעל, חצי טון מעל, חצי טון מתחת, המטרה.' }, 4, 1500),
  enc('enc-delayed', { en: 'Delayed resolution', he: 'פתרון מושהה' }, { en: 'Once every 4 bars: above, below, a step lower, back up, the target.', he: 'פעם בכל 4 תיבות: מעל, מתחת, צעד נמוך יותר, חזרה, המטרה.' }, 4, 1540),
  {
    id: 'approach',
    fam: 'vocab',
    name: { en: 'Approach each chord', he: 'גישה לכל אקורד' },
    how: { en: 'The first chord tone of each new chord comes from a half step away.', he: 'צליל האקורד הראשון של כל אקורד חדש מגיע מחצי טון.' },
    level: 2,
    diff: 1250,
    pass: 0.75,
    check: (ctx) => {
      const ns = line(ctx);
      const items: { ok: boolean; beat: number }[] = [];
      for (const s of changes(ctx)) {
        if (s === ctx.spans[0]) continue;
        const i = ns.findIndex((n) => n.beat >= s.at - 0.25 && n.beat < s.at + s.beats - EPS && isChordTone(ctx, n) && spanOfNote(ctx, n) === s);
        if (i < 0) continue;
        const T = ns[i];
        const p = ns[i - 1];
        items.push({ ok: !!p && linked(p, T) && Math.abs(Math.round(T.midi) - Math.round(p.midi)) === 1, beat: T.beat });
      }
      return tally(items);
    },
  },
  {
    id: 'triad-pair',
    fam: 'vocab',
    name: { en: 'Triad pairs', he: 'זוגות משולשים' },
    how: { en: 'Over each chord, only the notes of a triad pair that fits it — and both triads.', he: 'מעל כל אקורד, רק הצלילים של זוג משולשים שמתאים לו — ושני המשולשים.' },
    level: 4,
    diff: 1560,
    pass: 0.85,
    check: (ctx) => {
      let ok = 0;
      let total = 0;
      const miss: number[] = [];
      for (const { s, ns } of bySpan(ctx, line(ctx))) {
        const q = qualityOfIntervals(s.iv);
        const fam = q === 'maj7' || q === '6' ? 'maj7' : q === 'm7' || q === 'm6' ? 'm7' : q === '7' || q === 'alt' ? '7' : null;
        if (!fam) continue;
        const pairs = TRIAD_PAIRS.filter((p) => p.q === fam && (q !== 'alt' || p.id === 'altered')).map((p) => pairTriads(p, s.root));
        let best = { in: -1, both: false };
        for (const [a, b] of pairs) {
          const inn = ns.filter((n) => a.includes(mod12(n.midi)) || b.includes(mod12(n.midi)));
          const both = inn.some((n) => a.includes(mod12(n.midi)) && !b.includes(mod12(n.midi))) && inn.some((n) => b.includes(mod12(n.midi)) && !a.includes(mod12(n.midi)));
          if (inn.length + (both ? 0.5 : 0) > best.in + (best.both ? 0.5 : 0)) best = { in: inn.length, both };
        }
        ok += best.in;
        total += ns.length + (best.both ? 0 : 1);
        if (best.in < ns.length || !best.both) miss.push(s.at);
      }
      return { ok, total, miss };
    },
  },
  {
    id: 'pent-super',
    fam: 'vocab',
    name: { en: 'Superimposed pentatonics', he: 'פנטטוניות מונחות' },
    how: { en: 'Over each chord, a pentatonic built on another degree (on the 5th or the 2nd; on ♭3 over altered).', he: 'מעל כל אקורד, פנטטוני על דרגה אחרת (על ה־5 או ה־2; על ♭3 מעל אלטרד).' },
    level: 4,
    diff: 1540,
    pass: 0.85,
    check: (ctx) => {
      let ok = 0;
      let total = 0;
      const miss: number[] = [];
      for (const { s, ns } of bySpan(ctx, line(ctx))) {
        const opts = superPents(s.iv);
        if (!opts.length) continue;
        const best = Math.max(...opts.map((p) => ns.filter((n) => p.includes(relOf(n, s))).length));
        ok += best;
        total += ns.length;
        if (best < ns.length) miss.push(s.at);
      }
      return { ok, total, miss };
    },
  },
  {
    id: 'use-lick',
    fam: 'vocab',
    name: { en: 'Use a lick you learned', he: 'להשתמש בליק שלמדתם' },
    how: { en: 'Play one of your licks, in any key, over the chord it belongs to.', he: 'נגנו אחד מהליקים שלכם, בכל סולם, מעל האקורד שלו.' },
    level: 3,
    diff: 1400,
    pass: 1,
    check: (ctx) => {
      const ns = line(ctx);
      const pool: Lick[] = ctx.opt?.lickIds?.length ? LICKS.filter((l) => ctx.opt!.lickIds!.includes(l.id)) : LICKS;
      const chart: ChartSpan[] = ctx.spans.map((s) => ({ root: s.root, q: qualityOfIntervals(s.iv), at: s.at, beats: s.beats }));
      const imp: ImpNote[] = ns.map((n) => ({ beat: n.beat, midi: Math.round(n.midi) }));
      const found = ns.length >= 3 && pool.some((l) => findLick(l, imp, chart, { shape: false }).some((h) => h.overChord));
      return { ok: found ? 1 : 0, total: 1, miss: found ? [] : [0] };
    },
  },
  {
    id: 'guide-target',
    fam: 'vocab',
    name: { en: 'Guide tone on each change', he: 'צליל מנחה בכל החלפה' },
    how: { en: 'On beat 1 of every new chord, its 3rd or 7th.', he: 'בפעמה הראשונה של כל אקורד חדש, הטרצה או הספטימה שלו.' },
    level: 2,
    diff: 1200,
    pass: 0.8,
    check: (ctx) =>
      eachChange(ctx, (n, s) => {
        const t = tonesOf(s.iv);
        const r = relOf(n, s);
        return r === t.third || r === t.seventh;
      }),
  },
  {
    id: 'quote-head',
    fam: 'vocab',
    name: { en: 'Quote the head', he: 'לצטט את הנושא' },
    how: { en: 'Bring four notes of the tune’s melody into your solo, in any key.', he: 'הכניסו לסולו ארבעה צלילים מהמנגינה של השיר, בכל סולם.' },
    level: 3,
    diff: 1480,
    pass: 1,
    needs: 'melody',
    check: (ctx) => {
      const mel = (ctx.opt?.melody ?? []).slice().sort((a, b) => a.beat - b.beat);
      if (mel.length < 4) return { ok: 0, total: 0 };
      const frags = new Set<string>();
      for (let i = 0; i + 3 < mel.length; i++) {
        const f = [1, 2, 3].map((k) => Math.round(mel[i + k].midi) - Math.round(mel[i + k - 1].midi));
        if (f.some((x) => x !== 0)) frags.add(f.join(','));
      }
      const ns = line(ctx);
      let found = false;
      for (let i = 0; i + 3 < ns.length && !found; i++) found = frags.has(ivs(ns.slice(i, i + 4)).join(','));
      return { ok: found ? 1 : 0, total: 1 };
    },
  },
  {
    id: 'target-ct',
    fam: 'vocab',
    name: { en: 'A chord tone on each change', he: 'צליל אקורד בכל החלפה' },
    how: { en: 'Whatever you play, a chord tone sounds where each chord begins.', he: 'מה שלא תנגנו, צליל אקורד נשמע במקום שבו כל אקורד מתחיל.' },
    level: 1,
    diff: 1050,
    pass: 0.8,
    check: (ctx) => eachChange(ctx, (n, s) => basicOf(s.iv).includes(relOf(n, s))),
  },
  {
    id: 'inside',
    fam: 'vocab',
    name: { en: 'Inside the changes', he: 'בתוך המהלך' },
    how: { en: 'Every note in the chord’s scale, or a half step into the next note.', he: 'כל צליל בסולם של האקורד, או חצי טון אל הצליל הבא.' },
    level: 1,
    diff: 1000,
    pass: 0.85,
    check: (ctx) => {
      const ns = line(ctx);
      return tally(
        ns.map((n, i) => {
          const s = spanOfNote(ctx, n);
          const nx = ns[i + 1];
          const ok = (!!s && (scaleOf(s.iv).includes(relOf(n, s)) || basicOf(s.iv).includes(relOf(n, s)))) || (!!nx && linked(n, nx) && Math.abs(Math.round(nx.midi) - Math.round(n.midi)) === 1);
          return { ok, beat: n.beat };
        }),
      );
    },
  },
  {
    id: 'active',
    fam: 'vocab',
    name: { en: 'Keep playing', he: 'להמשיך לנגן' },
    how: { en: 'Notes in at least three bars of every four.', he: 'צלילים לפחות בשלוש מכל ארבע תיבות.' },
    level: 1,
    diff: 900,
    pass: 0.75,
    check: (ctx) => {
      const ns = sorted(ctx);
      const n = barsOf(ctx, ns);
      const used = new Set(ns.map((x) => barOf(ctx, x.beat)));
      const miss = Array.from({ length: n }, (_, i) => i).filter((i) => !used.has(i)).map((i) => i * ctx.meter);
      return { ok: n - miss.length, total: n, miss };
    },
  },

  // ---- notes
  {
    id: 'tensions',
    fam: 'note',
    name: { en: 'Tensions only: 9 11 13', he: 'רק מתחים: 9 11 13' },
    how: { en: 'No 1, 3, 5 or 7 — only 9, 11 (♯11) and 13, and the alterations on altered chords.', he: 'בלי 1, 3, 5 או 7 — רק 9, 11 (♯11) ו־13, והאלטרציות באקורדים אלטרד.' },
    level: 4,
    diff: 1600,
    pass: 0.85,
    check: (ctx) =>
      tally(
        line(ctx).map((n) => {
          const s = spanOfNote(ctx, n);
          if (!s) return { ok: false, beat: n.beat };
          const t = tonesOf(s.iv);
          const q = qualityOfIntervals(s.iv);
          const allow = new Set([2, 9, t.third === 3 ? 5 : 6]);
          if (q === 'alt') [1, 3, 6, 8].forEach((x) => allow.add(x));
          if (q === 'hd7') allow.add(8);
          const r = relOf(n, s);
          return { ok: allow.has(r) && !basicOf(s.iv).includes(r), beat: n.beat };
        }),
      ),
  },
  {
    id: 'three-on-one',
    fam: 'note',
    name: { en: 'The 3rd on beat 1', he: 'הטרצה בפעמה 1' },
    how: { en: 'Each new chord: its 3rd sounds on the chord’s first beat.', he: 'בכל אקורד חדש: הטרצה שלו נשמעת בפעמה הראשונה של האקורד.' },
    level: 2,
    diff: 1150,
    pass: 0.8,
    check: (ctx) => eachChange(ctx, (n, s) => relOf(n, s) === tonesOf(s.iv).third),
  },
  {
    id: 'flat9',
    fam: 'note',
    name: { en: 'The ♭9 on dominants', he: 'ה־♭9 על דומיננטים' },
    how: { en: 'On every dominant chord, put its ♭9 on a beat.', he: 'בכל אקורד דומיננטי, שימו את ה־♭9 שלו על פעמה.' },
    level: 3,
    diff: 1400,
    pass: 0.75,
    check: (ctx) => {
      const ns = line(ctx);
      return tally(
        bySpan(ctx, ns)
          .filter((x) => isDom(x.s.iv))
          .map(({ s, ns: inn }) => ({ ok: inn.some((n) => onBeat(n.beat) && relOf(n, s) === 1), beat: s.at })),
      );
    },
  },
  {
    id: 'side-slip',
    fam: 'note',
    name: { en: 'Outside, then in', he: 'בחוץ, ואז פנימה' },
    how: { en: 'Once every 4 bars: three notes a half step away from the chord, then a chord tone.', he: 'פעם בכל 4 תיבות: שלושה צלילים בחצי טון מהאקורד, ואז צליל אקורד.' },
    level: 5,
    diff: 1700,
    pass: 0.75,
    check: (ctx) => {
      const ns = line(ctx);
      const hits: number[] = [];
      for (let i = 0; i + 3 < ns.length; i++) {
        const run = ns.slice(i, i + 3);
        const land = ns[i + 3];
        const s = spanOfNote(ctx, run[0]);
        if (!s || !run.every((n, j) => j === 0 || linked(run[j - 1], n)) || !linked(run[2], land)) continue;
        const inScale = [...scaleOf(s.iv), ...basicOf(s.iv)];
        if (run.some((n) => inScale.includes(relOf(n, s)))) continue;
        const fits = [1, -1].some((sh) => run.every((n) => inScale.includes(mod12(relOf(n, s) - sh))));
        if (fits && isChordTone(ctx, land)) hits.push(land.beat);
      }
      return perWindow(ctx, ns, hits);
    },
  },
  {
    id: 'tritone-sub',
    fam: 'note',
    name: { en: 'Superimpose the tritone sub', he: 'להניח את תחליף הטריטון' },
    how: { en: 'Over dominants, play the dominant a tritone away (its ♭5 and ♭9 are your colours).', he: 'מעל דומיננטים, נגנו את הדומיננט שבמרחק טריטון (ה־♭5 וה־♭9 הם הצבעים).' },
    level: 4,
    diff: 1640,
    pass: 0.6,
    check: (ctx) => {
      const SUB = [0, 2, 4, 5, 7, 9, 10].map((x) => mod12(x + 6));
      let ok = 0;
      let total = 0;
      const miss: number[] = [];
      for (const { s, ns } of bySpan(ctx, line(ctx))) {
        if (!isDom(s.iv)) continue;
        const inn = ns.filter((n) => SUB.includes(relOf(n, s)));
        const colour = ns.some((n) => relOf(n, s) === 6 || relOf(n, s) === 1);
        ok += inn.length;
        total += ns.length + (colour ? 0 : 1);
        if (!colour || inn.length < ns.length * 0.6) miss.push(s.at);
      }
      return { ok, total, miss };
    },
  },
  {
    id: 'bebop-scale',
    fam: 'note',
    name: { en: 'Bebop scale, chord tones on the beats', he: 'סולם ביבופ, צלילי אקורד על הפעמות' },
    how: { en: 'The bebop scale of each chord (the added half step), with a chord tone on every beat.', he: 'סולם הביבופ של כל אקורד (עם חצי הטון הנוסף), וצליל אקורד על כל פעמה.' },
    level: 3,
    diff: 1350,
    pass: 0.85,
    check: (ctx) =>
      tally(
        line(ctx).map((n) => {
          const s = spanOfNote(ctx, n);
          if (!s) return { ok: false, beat: n.beat };
          const q = qualityOfIntervals(s.iv);
          const sc = q === '7' ? [0, 2, 4, 5, 7, 9, 10, 11] : q === 'maj7' || q === '6' ? [0, 2, 4, 5, 7, 8, 9, 11] : q === 'm7' || q === 'm6' ? [0, 2, 3, 4, 5, 7, 9, 10] : scaleOf(s.iv);
          const r = relOf(n, s);
          return { ok: sc.includes(r) && (!onBeat(n.beat) || isChordTone(ctx, n)), beat: n.beat };
        }),
      ),
  },
  {
    id: 'pent-5th-up',
    fam: 'note',
    name: { en: 'Minor pentatonic a 5th up', he: 'פנטטוני מינורי קווינטה מעל' },
    how: { en: 'Over minor 7th chords, the minor pentatonic built on the 5th.', he: 'מעל אקורדי מינור 7, הפנטטוני המינורי שנבנה על הקווינטה.' },
    level: 3,
    diff: 1450,
    pass: 0.85,
    check: (ctx) => {
      const P = PENT_MIN.map((x) => mod12(x + 7));
      return tally(
        line(ctx)
          .map((n) => ({ n, s: spanOfNote(ctx, n) }))
          .filter((x) => x.s && isMinor7(x.s.iv))
          .map(({ n, s }) => ({ ok: P.includes(relOf(n, s!)), beat: n.beat })),
      );
    },
  },
  {
    id: 'mm-alt',
    fam: 'note',
    name: { en: 'Altered colours on dominants', he: 'צבעי אלטרד על דומיננטים' },
    how: { en: 'Over dominants, the altered scale (melodic minor a half step up): ♭9, ♯9, ♯11, ♭13.', he: 'מעל דומיננטים, הסולם האלטרד (מינור מלודי חצי טון מעל): ♭9, ♯9, ♯11, ♭13.' },
    level: 4,
    diff: 1600,
    pass: 0.85,
    check: (ctx) => {
      const ALT = [0, 1, 3, 4, 6, 8, 10];
      let ok = 0;
      let total = 0;
      const miss: number[] = [];
      for (const { s, ns } of bySpan(ctx, line(ctx))) {
        if (!isDom(s.iv)) continue;
        const inn = ns.filter((n) => ALT.includes(relOf(n, s))).length;
        const colour = ns.some((n) => [1, 3, 6, 8].includes(relOf(n, s)));
        ok += inn;
        total += ns.length + (colour ? 0 : 1);
        if (!colour || inn < ns.length) miss.push(s.at);
      }
      return { ok, total, miss };
    },
  },

  // ---- intervals
  {
    id: 'wide',
    fam: 'interval',
    name: { en: 'Wide intervals only', he: 'רק מרווחים רחבים' },
    how: { en: 'Every move a 4th or wider.', he: 'כל מעבר קוורטה או יותר.' },
    level: 4,
    diff: 1500,
    pass: 0.85,
    check: (ctx) => {
      const ns = line(ctx);
      const items: { ok: boolean; beat: number }[] = [];
      for (let i = 1; i < ns.length; i++) if (linked(ns[i - 1], ns[i])) items.push({ ok: Math.abs(Math.round(ns[i].midi) - Math.round(ns[i - 1].midi)) >= 5, beat: ns[i].beat });
      return tally(items);
    },
  },

  // ---- rhythm
  {
    id: 'start-two',
    fam: 'rhythm',
    name: { en: 'Start phrases on beat 2', he: 'להתחיל משפטים בפעמה 2' },
    how: { en: 'Every phrase begins on the second beat of a bar.', he: 'כל משפט מתחיל בפעמה השנייה של התיבה.' },
    level: 2,
    diff: 1200,
    pass: 0.8,
    check: (ctx) =>
      tally(
        phrases(line(ctx)).map((p) => {
          const pos = p[0].beat - barOf(ctx, p[0].beat + 0.15) * ctx.meter;
          return { ok: Math.abs(pos - 1) <= 0.15, beat: p[0].beat };
        }),
      ),
  },
  {
    id: 'bars-2',
    fam: 'rhythm',
    name: { en: 'Two-bar phrases', he: 'משפטים של שתי תיבות' },
    how: { en: 'Every phrase lasts about two bars, then breathe.', he: 'כל משפט נמשך כשתי תיבות, ואז נשימה.' },
    level: 2,
    diff: 1150,
    pass: 0.75,
    check: (ctx) =>
      tally(
        phrases(line(ctx)).map((p) => {
          const last = p[p.length - 1];
          const len = last.beat + last.dur - p[0].beat;
          return { ok: len >= 1.5 * ctx.meter - EPS && len <= 2.25 * ctx.meter + EPS, beat: p[0].beat };
        }),
      ),
  },
  {
    id: 'rest-bar',
    fam: 'rhythm',
    name: { en: 'A bar of rest between phrases', he: 'תיבה של שקט בין משפטים' },
    how: { en: 'Between two phrases, rest a whole bar.', he: 'בין שני משפטים, שותקים תיבה שלמה.' },
    level: 2,
    diff: 1100,
    pass: 0.8,
    check: (ctx) => {
      const ps = phrases(line(ctx));
      const items = ps.slice(1).map((p, i) => {
        const prev = ps[i][ps[i].length - 1];
        return { ok: p[0].beat - (prev.beat + prev.dur) >= ctx.meter - 0.25, beat: p[0].beat };
      });
      return tally(items);
    },
  },
  {
    id: 'double-bar',
    fam: 'rhythm',
    name: { en: 'Double-time a bar', he: 'תיבה בדאבל טיים' },
    how: { en: 'In every 4 bars, one bar of 16th notes.', he: 'בכל 4 תיבות, תיבה אחת של שש־עשריות.' },
    level: 4,
    diff: 1600,
    pass: 0.75,
    check: (ctx) => {
      const ns = line(ctx);
      const byBar = new Map<number, number>();
      for (const n of ns) {
        const q = n.beat * 4;
        if (Math.abs(q - Math.round(q)) < 0.3) byBar.set(barOf(ctx, n.beat), (byBar.get(barOf(ctx, n.beat)) ?? 0) + 1);
      }
      const hits = [...byBar.entries()].filter(([, k]) => k >= 10).map(([b]) => b * ctx.meter);
      return perWindow(ctx, ns, hits);
    },
  },
  {
    id: 'displace',
    fam: 'rhythm',
    name: { en: 'Displace the motif', he: 'להזיז את המוטיב' },
    how: { en: 'Repeat your phrase’s opening, starting on a different beat.', he: 'חזרו על פתיחת המשפט, כשהיא מתחילה בפעמה אחרת.' },
    level: 4,
    diff: 1580,
    pass: 0.75,
    check: (ctx) => {
      const ps = phrases(line(ctx)).filter((p) => p.length >= 4);
      const pos = (p: CNote[]) => ((p[0].beat % ctx.meter) + ctx.meter) % ctx.meter;
      return tally(
        ps.slice(1).map((p, i) => {
          const a = ivs(ps[i].slice(0, 4)).join();
          const b = ivs(p.slice(0, 4)).join();
          const d = Math.abs(pos(p) - pos(ps[i]));
          const shift = Math.min(d, ctx.meter - d);
          return { ok: a === b && shift >= 0.4, beat: p[0].beat };
        }),
      );
    },
  },
  {
    id: 'behind',
    fam: 'rhythm',
    name: { en: 'Behind the beat', he: 'מאחורי הפעמה' },
    how: { en: 'Lay back: the notes on the beat sit a little late, steadily.', he: 'להישען אחורה: הצלילים שעל הפעמה מאחרים מעט, ביציבות.' },
    level: 4,
    diff: 1650,
    pass: 0.75,
    check: (ctx) => placement(ctx, 1),
  },
  {
    id: 'ahead',
    fam: 'rhythm',
    name: { en: 'Ahead of the beat', he: 'לפני הפעמה' },
    how: { en: 'Push: the notes on the beat sit a little early, steadily.', he: 'לדחוף: הצלילים שעל הפעמה מקדימים מעט, ביציבות.' },
    level: 4,
    diff: 1650,
    pass: 0.75,
    check: (ctx) => placement(ctx, -1),
  },
  {
    id: 'sparse',
    fam: 'rhythm',
    name: { en: 'Four notes a bar at most', he: 'עד ארבעה צלילים בתיבה' },
    how: { en: 'Space: never more than four notes in a bar.', he: 'מרחב: אף פעם לא יותר מארבעה צלילים בתיבה.' },
    level: 1,
    diff: 1000,
    pass: 0.85,
    check: (ctx) => {
      const by = new Map<number, number>();
      for (const n of line(ctx)) by.set(barOf(ctx, n.beat), (by.get(barOf(ctx, n.beat)) ?? 0) + 1);
      return tally([...by.entries()].map(([b, k]) => ({ ok: k <= 4, beat: b * ctx.meter })));
    },
  },
  {
    id: 'call-response',
    fam: 'rhythm',
    name: { en: 'Call and response', he: 'קריאה ותשובה' },
    how: { en: 'Answer each phrase with its rhythm on new notes.', he: 'ענו לכל משפט בקצב שלו, על צלילים חדשים.' },
    level: 3,
    diff: 1350,
    pass: 0.75,
    check: (ctx) => {
      const ps = phrases(line(ctx)).filter((p) => p.length >= 3);
      const items: { ok: boolean; beat: number }[] = [];
      for (let i = 0; i + 1 < ps.length; i += 2) {
        const a = ps[i];
        const b = ps[i + 1];
        const ioi = (p: CNote[]) => [p[1].beat - p[0].beat, p[2].beat - p[1].beat];
        const same = ioi(a).every((x, k) => Math.abs(x - ioi(b)[k]) <= 0.26);
        const fresh = [0, 1, 2].some((k) => Math.round(a[k].midi) !== Math.round(b[k].midi));
        items.push({ ok: same && fresh, beat: b[0].beat });
      }
      return tally(items);
    },
  },

  // ---- shape
  {
    id: 'motif-dev',
    fam: 'shape',
    name: { en: 'Transform one motif', he: 'לשנות מוטיב אחד' },
    how: { en: 'Start every phrase with your first three notes moved, inverted, re-rhythmed or sequenced — at least two ways.', he: 'פתחו כל משפט בשלושת הצלילים הראשונים שלכם — מוזזים, הפוכים, בקצב אחר או בסקוונצה — לפחות בשתי דרכים.' },
    level: 4,
    diff: 1560,
    pass: 0.75,
    check: (ctx) => {
      const ps = phrases(line(ctx)).filter((p) => p.length >= 3);
      if (ps.length < 2) return { ok: 0, total: ps.length ? 1 : 0, miss: [] };
      const m = ps[0].slice(0, 3);
      const [a, b] = ivs(m);
      const r0 = [m[1].beat - m[0].beat, m[2].beat - m[1].beat];
      const kinds = new Set<string>();
      const items = ps.slice(1).map((p) => {
        const [x, y] = ivs(p.slice(0, 3));
        const r = [p[1].beat - p[0].beat, p[2].beat - p[1].beat];
        const reRhythm = r.some((v, k) => Math.abs(v - r0[k]) > 0.2);
        let kind = '';
        if (x === a && y === b) kind = reRhythm ? 'R' : Math.round(p[0].midi) !== Math.round(m[0].midi) ? 'T' : '';
        else if (x === -a && y === -b) kind = 'I';
        else if (Math.abs(x - a) <= 1 && Math.abs(y - b) <= 1 && Math.sign(x) === Math.sign(a) && Math.sign(y) === Math.sign(b)) kind = 'S';
        if (kind) kinds.add(kind);
        return { ok: !!kind, beat: p[0].beat };
      });
      const c = tally(items);
      // two different transformations at least
      return kinds.size >= 2 ? c : { ok: c.ok, total: c.total + 1, miss: [...(c.miss ?? []), ps[1][0].beat] };
    },
  },
  {
    id: 'repeat-vary',
    fam: 'shape',
    name: { en: 'Repeat, then vary', he: 'לחזור, ואז לגוון' },
    how: { en: 'Each phrase starts like the one before, then goes somewhere new.', he: 'כל משפט מתחיל כמו הקודם, ואז הולך למקום חדש.' },
    level: 3,
    diff: 1300,
    pass: 0.75,
    check: (ctx) => {
      const ps = phrases(line(ctx)).filter((p) => p.length >= 4);
      return tally(
        ps.slice(1).map((p, i) => {
          const q = ps[i];
          const head = ivs(q.slice(0, 4)).join() === ivs(p.slice(0, 4)).join();
          const restSame = ivs(q).join() === ivs(p).join() && q.every((n, k) => Math.abs(n.beat - q[0].beat - (p[k].beat - p[0].beat)) < 0.2);
          return { ok: head && !restSame, beat: p[0].beat };
        }),
      );
    },
  },
  {
    id: 'end-guide',
    fam: 'shape',
    name: { en: 'End on a guide tone', he: 'לסיים על צליל מנחה' },
    how: { en: 'Every phrase ends on the 3rd or the 7th of its chord.', he: 'כל משפט מסתיים על הטרצה או הספטימה של האקורד.' },
    level: 2,
    diff: 1150,
    pass: 0.8,
    check: (ctx) =>
      tally(
        phrases(line(ctx)).map((p) => {
          const end = p[p.length - 1];
          const s = spanOfNote(ctx, end);
          const t = s ? tonesOf(s.iv) : null;
          const r = s ? relOf(end, s) : -1;
          return { ok: !!t && (r === t.third || r === t.seventh), beat: end.beat };
        }),
      ),
  },
  {
    id: 'chrom-up',
    fam: 'shape',
    name: { en: 'Chromatic climb to a target', he: 'טיפוס כרומטי אל מטרה' },
    how: { en: 'Every phrase climbs three half steps into a chord tone on a beat.', he: 'כל משפט מטפס שלושה חצאי טונים אל צליל אקורד על פעמה.' },
    level: 3,
    diff: 1350,
    pass: 0.75,
    check: (ctx) =>
      tally(
        phrases(line(ctx)).map((p) => {
          let ok = false;
          for (let i = 0; i + 3 < p.length && !ok; i++) {
            const q = p.slice(i, i + 4);
            ok = ivs(q).every((d) => d === 1) && onBeat(q[3].beat) && isChordTone(ctx, q[3]);
          }
          return { ok, beat: p[0].beat };
        }),
      ),
  },
  {
    id: 'full-range',
    fam: 'shape',
    name: { en: 'Use the full range', he: 'להשתמש בכל המנעד' },
    how: { en: 'Across the chorus, cover two octaves or more.', he: 'לאורך הסבב, לכסות שתי אוקטבות או יותר.' },
    level: 2,
    diff: 1200,
    pass: 1,
    check: (ctx) => {
      const ms = line(ctx).map((n) => Math.round(n.midi));
      if (!ms.length) return { ok: 0, total: 0 };
      return { ok: Math.max(...ms) - Math.min(...ms) >= 24 ? 1 : 0, total: 1 };
    },
  },
  {
    id: 'fall-chord',
    fam: 'shape',
    name: { en: 'A falling line on every chord', he: 'קו יורד על כל אקורד' },
    how: { en: 'Over each chord, the line goes down.', he: 'מעל כל אקורד, הקו יורד.' },
    level: 2,
    diff: 1150,
    pass: 0.8,
    check: (ctx) =>
      tally(
        bySpan(ctx, line(ctx))
          .filter((x) => x.ns.length >= 3)
          .map(({ s, ns }) => {
            const d = ivs(ns);
            return { ok: Math.round(ns[ns.length - 1].midi) < Math.round(ns[0].midi) && d.filter((x) => x < 0).length / d.length >= 0.6 - EPS, beat: s.at };
          }),
      ),
  },

  // ---- touch (MIDI velocity)
  {
    id: 'ghost',
    fam: 'touch',
    name: { en: 'Ghost notes', he: 'צלילי רפאים' },
    how: { en: 'In every bar, swallow a note: much softer than the rest.', he: 'בכל תיבה, "לבלוע" צליל: רך הרבה יותר מהשאר.' },
    level: 3,
    diff: 1450,
    pass: 0.75,
    needs: 'velocity',
    check: (ctx) => {
      const ns = sorted(ctx);
      if (!ns.length || ns.some((n) => n.vel === undefined)) return { ok: 0, total: 0 };
      const vs = ns.map((n) => n.vel!).sort((a, b) => a - b);
      const med = vs[Math.floor(vs.length / 2)];
      const by = new Map<number, CNote[]>();
      for (const n of ns) by.set(barOf(ctx, n.beat), [...(by.get(barOf(ctx, n.beat)) ?? []), n]);
      return tally(
        [...by.entries()]
          .filter(([, b]) => b.length >= 2)
          .map(([bar, b]) => ({ ok: b.some((n) => n.vel! <= 0.6 * med) && b.some((n) => n.vel! > 0.6 * med), beat: bar * ctx.meter })),
      );
    },
  },
  {
    id: 'accent-off',
    fam: 'touch',
    name: { en: 'Accent the off-beats', he: 'להדגיש את האוף־ביט' },
    how: { en: 'The notes between the beats louder than the notes on them.', he: 'הצלילים שבין הפעמות חזקים יותר מאלה שעליהן.' },
    level: 3,
    diff: 1400,
    pass: 0.75,
    needs: 'velocity',
    check: (ctx) => {
      const ns = sorted(ctx);
      if (!ns.length || ns.some((n) => n.vel === undefined)) return { ok: 0, total: 0 };
      const by = new Map<number, CNote[]>();
      for (const n of ns) by.set(barOf(ctx, n.beat), [...(by.get(barOf(ctx, n.beat)) ?? []), n]);
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const items: { ok: boolean; beat: number }[] = [];
      for (const [bar, b] of by) {
        const on = b.filter((n) => onBeat(n.beat)).map((n) => n.vel!);
        const off = b.filter((n) => !onBeat(n.beat)).map((n) => n.vel!);
        if (on.length && off.length) items.push({ ok: mean(off) >= 1.1 * mean(on), beat: bar * ctx.meter });
      }
      return tally(items);
    },
  },

  // ---- instrument
  {
    id: 'one-string',
    fam: 'inst',
    name: { en: 'One string only', he: 'מיתר אחד בלבד' },
    how: { en: 'Guitar: the whole chorus on a single string — slides and shifts.', he: 'גיטרה: כל הסבב על מיתר אחד — החלקות ומעברים.' },
    level: 3,
    diff: 1300,
    pass: 0.95,
    needs: 'string',
    check: (ctx) => {
      const ns = sorted(ctx);
      if (!ns.length || ns.some((n) => n.string === undefined)) return { ok: 0, total: 0 };
      const counts = new Map<number, number>();
      for (const n of ns) counts.set(n.string!, (counts.get(n.string!) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return tally(ns.map((n) => ({ ok: n.string === top, beat: n.beat })));
    },
  },
  {
    id: 'double-stops',
    fam: 'inst',
    name: { en: 'Double stops', he: 'דאבל סטופים' },
    how: { en: 'Guitar: two notes at once, at least half the time.', he: 'גיטרה: שני צלילים בבת אחת, לפחות בחצי מהזמן.' },
    level: 3,
    diff: 1350,
    pass: 0.5,
    check: (ctx) => tally(onsets(ctx).map((g) => ({ ok: g.length === 2, beat: g[0].beat }))),
  },
  {
    id: 'octaves',
    fam: 'inst',
    name: { en: 'Octaves', he: 'אוקטבות' },
    how: { en: 'Guitar: the line in octaves, at least half the time.', he: 'גיטרה: הקו באוקטבות, לפחות בחצי מהזמן.' },
    level: 3,
    diff: 1400,
    pass: 0.5,
    check: (ctx) => tally(onsets(ctx).map((g) => ({ ok: g.length === 2 && Math.abs(Math.round(g[1].midi) - Math.round(g[0].midi)) === 12, beat: g[0].beat }))),
  },
  {
    id: 'imply-roots',
    fam: 'inst',
    name: { en: 'Imply the roots', he: 'לרמוז על השורשים' },
    how: { en: 'Bass: the solo still puts each chord’s root on its first beat.', he: 'בס: הסולו עדיין שם את השורש של כל אקורד בפעמה הראשונה שלו.' },
    level: 2,
    diff: 1250,
    pass: 0.8,
    check: (ctx) => eachChange(ctx, (n, s) => relOf(n, s) === 0, sorted(ctx).filter((n, i, a) => !a.some((o, j) => j !== i && Math.abs(o.beat - n.beat) < 0.08 && o.midi < n.midi))),
  },
  {
    id: 'lh-shells',
    fam: 'inst',
    name: { en: 'Left-hand shells', he: 'שלדים ביד שמאל' },
    how: { en: 'Piano: on each chord the left hand plays a shell — root with the 3rd or the 7th.', he: 'פסנתר: בכל אקורד יד שמאל מנגנת שלד — שורש עם הטרצה או הספטימה.' },
    level: 3,
    diff: 1400,
    pass: 0.8,
    needs: 'split',
    check: (ctx) => {
      const split = ctx.opt?.split;
      if (split === undefined) return { ok: 0, total: 0 };
      const lh = sorted(ctx).filter((n) => n.midi < split);
      const items: { ok: boolean; beat: number }[] = [];
      for (const s of changes(ctx)) {
        const g = lh.filter((n) => n.beat >= s.at - 0.25 && n.beat < s.at + 1);
        const t = tonesOf(s.iv);
        const rs = new Set(g.map((n) => relOf(n, s)));
        items.push({ ok: rs.has(0) && (rs.has(t.third ?? -1) || rs.has(t.seventh ?? -1)) && rs.size <= 3, beat: s.at });
      }
      return tally(items);
    },
  },
];

/** Onset groups (notes within 0.08 beat sound together). */
function onsets(ctx: CardCtx): CNote[][] {
  const out: CNote[][] = [];
  for (const n of sorted(ctx)) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0].beat - n.beat) <= 0.08) last.push(n);
    else out.push([n]);
  }
  return out.map((g) => g.sort((a, b) => a.midi - b.midi));
}
/** behind (+1) / ahead (−1): the notes near a beat sit 10–90 ms late / early. */
function placement(ctx: CardCtx, dir: 1 | -1): CardCheck {
  const beatMs = 60000 / ctx.bpm;
  return tally(
    line(ctx)
      .filter((n) => Math.abs(n.beat - Math.round(n.beat)) <= 0.25)
      .map((n) => {
        const ms = (n.beat - Math.round(n.beat)) * beatMs * dir;
        return { ok: ms >= 10 && ms <= 90, beat: n.beat };
      }),
  );
}

export const RULE_CARDS: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const CARD_IDS: string[] = CARDS.map((c) => c.id);

export function checkCard(id: string, ctx: CardCtx): CardCheck {
  const c = RULE_CARDS[id];
  return c ? c.check(ctx) : { ok: 0, total: 0 };
}
export const cardKept = (id: string, c: CardCheck): boolean => c.total > 0 && c.ok / c.total >= (RULE_CARDS[id]?.pass ?? 0.8) - 1e-9;

// ───────────────────────────── adapters ─────────────────────────────

/** A parsed chart's chords as spans, repeated over `bars` bars. */
export function spansOfChart(chart: ParsedChart, meter: number, bars: number): CSpan[] {
  const out: CSpan[] = [];
  const len = Math.max(1, chart.bars);
  if (!chart.chords.length) return out;
  for (let rep = 0; rep * len < bars; rep++)
    chart.chords.forEach((c, i) => {
      const at = (rep * len + c.bar) * meter + c.at;
      if (at >= bars * meter - EPS) return;
      const nx = chart.chords[i + 1];
      const end = nx ? (rep * len + nx.bar) * meter + nx.at : (rep + 1) * len * meter;
      out.push({ at, beats: Math.min(end, bars * meter) - at, root: c.root, iv: c.iv });
    });
  return out;
}
/** Intervals of the bebopVocab chord qualities (VQ). */
export const VQ_IV: Record<string, number[]> = {
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  '7b9': [0, 4, 7, 10, 13],
  alt: [0, 4, 10, 13, 15, 20],
  hd7: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
};
/** Chords {root, quality, beats} (bebopVocab VQ / LINE_Q qualities) as spans from beat 0. */
export function spansOfVChords(chords: { r: number; q: string; beats: number }[]): CSpan[] {
  let at = 0;
  return chords.map((c) => {
    const s = { at, beats: c.beats, root: mod12(c.r), iv: VQ_IV[c.q] ?? VQ_IV.maj7 };
    at += c.beats;
    return s;
  });
}
/** Played notes in seconds (the studio's take) as card notes. */
export function notesOfSeconds(played: { start: number; end: number; midi: number; vel?: number }[], bpm: number): CNote[] {
  const b = bpm / 60;
  return played.map((n) => ({ beat: n.start * b, dur: Math.max(0, n.end - n.start) * b, midi: n.midi, ...(n.vel !== undefined ? { vel: n.vel } : {}) }));
}
export function ctxOfSeconds(played: { start: number; end: number; midi: number; vel?: number }[], bpm: number, spans: CSpan[], meter = 4, opt?: CardOpt): CardCtx {
  return { notes: notesOfSeconds(played, bpm), spans, meter, bpm, opt };
}
