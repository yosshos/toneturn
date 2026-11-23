// The lead sheet of the scale rotation (BUILD-PLAN-2026-11 phase 5; docs/SPEC-RBI-ROTATION.md §3–§5, track A only):
// a chart → the harmony timeline → the T1–2 half-bar subs → the rotating scale per chord at the player's tier, laid out
// per bar for the screen, with the scale family (a colour AND a short tag, never colour alone), the "next" chip, and a
// take's grading (classifyNotes / rotationMetrics / updateModeStats) turned into one rated result. Pure.

import { parseChart, type ParsedChart } from './charts';
import { spansOfChart } from './ruleCards';
import { assignScales, classifyNotes, colourNotes, harmonyOf, insertSubs, qualityOf, rotationMetrics, spanColours, updateModeStats, type Fn, type HarmonySpan, type ModeStats, type PlayedNote, type RotationMetrics } from './rotation';
import { MODE_FAMILY, MODE_NAMES, MODE_STEPS, type ModeId } from './modes';
import type { RatingEvent } from './rating';

type L = { en: string; he: string };
const mod = (n: number) => ((n % 12) + 12) % 12;

// ---------------------------------------------------------------- the scale families (SPEC-RBI-ROTATION §4)

export type ScaleFam = 'major' | 'melodic' | 'harmonic' | 'sym' | 'penta';
export const SCALE_FAMS: ScaleFam[] = ['major', 'melodic', 'harmonic', 'sym', 'penta'];

/** The family a scale is shown in: its parent (the bebop scales are their parent plus one passing note). */
export function scaleFamily(m: ModeId): ScaleFam {
  if (m === 'major-pentatonic' || m === 'minor-pentatonic' || m === 'blues' || m === 'major-blues') return 'penta';
  if (m === 'diminished' || m === 'whole-half' || m === 'whole-tone' || m === 'augmented') return 'sym';
  // bebop dominant = Mixolydian + the major 7th; bebop major = Ionian + the ♯5; minor 6th-dim = melodic minor + the ♭6
  if (m === 'bebop-dominant' || m === 'bebop-major') return 'major';
  if (m === 'minor-sixth-dim') return 'melodic';
  const f = MODE_FAMILY[m];
  return f === 'other' ? 'major' : f;
}

/** The short tag beside the colour (the colour is never the only cue). */
export const FAM_TAG: Record<ScaleFam, L> = {
  major: { en: 'Maj', he: 'מז׳' },
  melodic: { en: 'Mel', he: 'מל׳' },
  harmonic: { en: 'Har', he: 'הר׳' },
  sym: { en: 'Sym', he: 'סימ׳' },
  penta: { en: 'Pen', he: 'פנ׳' },
};
export const FAM_NAME: Record<ScaleFam, L> = {
  major: { en: 'Major and its modes', he: 'מז׳ור ומודוסיו' },
  melodic: { en: 'Melodic minor family', he: 'משפחת המינור המלודי' },
  harmonic: { en: 'Harmonic minor family', he: 'משפחת המינור ההרמוני' },
  sym: { en: 'Symmetric', he: 'סימטריים' },
  penta: { en: 'Pentatonic and blues', he: 'פנטטוני ובלוז' },
};

/** A scale's short name on the sheet (no parenthesised alias; the two diminished scales by their step order). */
export function scaleShort(m: ModeId, lang: 'en' | 'he'): string {
  if (m === 'diminished') return lang === 'he' ? 'חצי–שלם' : 'Half-whole';
  if (m === 'whole-half') return lang === 'he' ? 'שלם–חצי' : 'Whole-half';
  if (m === 'ionian') return lang === 'he' ? 'יוני' : 'Ionian';
  return MODE_NAMES[m][lang].replace(/\s*\(.*\)\s*/, '');
}

// ---------------------------------------------------------------- the tier (T1–3 in the first version, BUILD-PLAN §3)

/** The rotation tier: the player's choice, else from the technique tier (≤1 → T1, 2 → T2, 3+ → T3). */
export function rbiTier(techTier: number | undefined, chosen?: number | null): 1 | 2 | 3 {
  if (chosen === 1 || chosen === 2 || chosen === 3) return chosen;
  const t = techTier ?? 1;
  return t <= 1 ? 1 : t === 2 ? 2 : 3;
}

// ---------------------------------------------------------------- spelling

const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A chart symbol as shown: ♭ and ♯ for b and #. */
export const prettySym = (sym: string): string => sym.replace(/^([A-G])b/, '$1♭').replace(/^([A-G])#/, '$1♯').replace(/\/([A-G])b/, '/$1♭').replace(/\/([A-G])#/, '/$1♯');
const rootOfSym = (sym: string): string | null => prettySym(sym).match(/^[A-G][♭♯]?/)?.[0] ?? null;

/** The tonic of a chart: its last major or minor-tonic chord, else its first chord's root. */
export function tonicOfChart(p: ParsedChart): number {
  for (let i = p.chords.length - 1; i >= 0; i--) {
    const q = qualityOf(p.chords[i].iv);
    if (q === 'maj' || q === 'mtonic') return p.chords[i].root;
  }
  return p.chords[0]?.root ?? 0;
}

// ---------------------------------------------------------------- the sheet

export interface SheetCell {
  /** Beat from the start of the take (over all choruses). */
  at: number;
  beats: number;
  chorus: number;
  /** Bar inside the chorus. */
  bar: number;
  /** The chart's chord as written. */
  sym: string;
  /** A substitution shown above the original (a smaller line). */
  sub?: { sym: string; label: L };
  fn: Fn;
  mode: ModeId;
  /** The scale's root (the substitution's when there is one) and its spelling. */
  root: number;
  rootName: string;
  fam: ScaleFam;
  /** The rotation window this scale belongs to. */
  window: number;
}

export interface RotationSheet {
  tonic: number;
  tier: number;
  meter: number;
  /** Bars per chorus. */
  bars: number;
  choruses: number;
  plan: { span: HarmonySpan; mode: ModeId; window: number }[];
  cells: SheetCell[];
}

/**
 * The sheet for a chart at a tier: one window of rotation per chorus at T1–2, every 4 bars at T3 (assignScales); the
 * subs a tier opens (insertSubs). `choruses` defaults to enough for 8 bars (at least 2, so the rotation is heard) and
 * 1 for a long form.
 */
export function buildRotationSheet(chart: string | ParsedChart, o: { tier: number; stats?: ModeStats; seed?: number; tonic?: number; choruses?: number; meter?: number }): RotationSheet | null {
  const meter = o.meter ?? 4;
  const p = typeof chart === 'string' ? parseChart(chart, meter) : chart;
  if (!p.chords.length || p.bars < 1) return null;
  const tonic = o.tonic ?? tonicOfChart(p);
  const bars = p.bars;
  const choruses = o.choruses ?? (bars >= 16 ? 1 : Math.max(2, Math.ceil(8 / bars)));
  const spans = spansOfChart(p, meter, bars);
  const h = insertSubs(harmonyOf(spans, tonic), o.tier, tonic, meter);
  const plan = assignScales(h, o.tier, meter, bars, choruses, o.stats ?? {}, o.seed ?? 1);
  const symAt = (beat: number): string => {
    const b = beat % (bars * meter);
    let cur = p.chords[0];
    for (const c of p.chords) if (c.bar * meter + c.at <= b + 1e-6) cur = c;
    return cur.sym;
  };
  const cells: SheetCell[] = plan.map((x) => {
    const s = x.span;
    const inChorus = s.at % (bars * meter);
    const sym = symAt(inChorus);
    let sub: SheetCell['sub'];
    let rootName = rootOfSym(sym) ?? FLAT[mod(s.root)];
    if (s.sub) {
      // the passing diminished is spelled as a raised root; the tritone sub and the rest with flats
      const name = s.sub.iv.includes(9) && s.sub.iv.includes(6) ? SHARP[mod(s.sub.root)] : mod(s.sub.root) === mod(s.root) ? rootName : FLAT[mod(s.sub.root)];
      sub = { sym: `${name}${s.q === 'dim7' ? '°7' : '7'}`, label: s.sub.label };
      rootName = name;
    }
    return { at: s.at, beats: s.beats, chorus: Math.floor(s.at / (bars * meter) + 1e-6), bar: Math.floor(inChorus / meter + 1e-6), sym: prettySym(sym), sub, fn: s.fn, mode: x.mode, root: s.sub ? s.sub.root : s.root, rootName, fam: scaleFamily(x.mode), window: x.window };
  });
  return { tonic, tier: o.tier, meter, bars, choruses, plan, cells };
}

/** The cell sounding at a beat (null before the first beat / after the end). */
export function cellAt(sheet: RotationSheet, beat: number): number {
  if (beat < 0) return -1;
  for (let i = sheet.cells.length - 1; i >= 0; i--) if (beat >= sheet.cells[i].at - 1e-6) return beat < sheet.cells[i].at + sheet.cells[i].beats ? i : -1;
  return -1;
}

/**
 * The "next" chip: the upcoming chord and its scale. `changed` when the rotation gives that function a new scale there
 * (announced ahead, SPEC-RBI-ROTATION §3 — never a change mid-phrase without a warning).
 */
export function nextCell(sheet: RotationSheet, beat: number): { cell: SheetCell; changed: boolean; inBeats: number } | null {
  const i = sheet.cells.findIndex((c) => c.at > beat + 1e-6);
  if (i < 0) return null;
  const cell = sheet.cells[i];
  const prev = [...sheet.cells.slice(0, i)].reverse().find((c) => c.fn === cell.fn);
  return { cell, changed: !!prev && prev.mode !== cell.mode, inBeats: cell.at - beat };
}

/** The scale notes of a cell for the keyboard: in the scale, and the colour notes (what the rotation tests). */
export function cellNotes(c: SheetCell, sheet: RotationSheet): { pcs: number[]; colour: number[] } {
  const p = sheet.plan.find((x) => Math.abs(x.span.at - c.at) < 1e-6);
  const span = p?.span;
  const pcs = [...new Set(scaleOf(c.mode, c.root))];
  return { pcs, colour: span ? colourNotes(span.fn, c.mode, c.root) : [] };
}
const scaleOf = (m: ModeId, root: number) => MODE_STEPS[m].map((x) => mod(root + x));

// ---------------------------------------------------------------- a take

export interface RotationGrade {
  m: RotationMetrics;
  /** Per cell: a colour note was played (true), not (false), or nothing to judge (no notes, under 2 beats, or the
   *  function's default scale, which adds no colour notes) (null). */
  hits: (boolean | null)[];
  stats: ModeStats;
  /** 0..1: in the set, colour coverage, chord tones on strong beats. */
  score: number;
}

/** Grade a take against the sheet and fold its colour coverage into the player's mode × function stats. */
export function gradeRotation(sheet: RotationSheet, notes: PlayedNote[], stats: ModeStats, at: string): RotationGrade {
  const end = sheet.bars * sheet.meter * sheet.choruses;
  const inTake = notes.filter((n) => n.beat >= -0.5 && n.beat < end);
  const m = rotationMetrics(inTake, sheet.plan, sheet.meter);
  const cls = classifyNotes(inTake, sheet.plan);
  const hits = sheet.cells.map((c, i) => {
    if (c.beats < 2 || !spanColours(sheet.plan[i]).length) return null;
    const idx = inTake.map((n, i) => (n.beat >= c.at - 1e-6 && n.beat < c.at + c.beats - 1e-6 ? i : -1)).filter((i) => i >= 0);
    return idx.length ? idx.some((i) => cls[i] === 'colour') : null;
  });
  const score = inTake.length ? Math.max(0, Math.min(1, 0.4 * m.inSet + 0.4 * m.colour + 0.2 * m.strongCt)) : 0;
  return { m, hits, stats: updateModeStats(stats, sheet.plan, inTake, at), score };
}

// ---------------------------------------------------------------- one rated result per take (everything connects)

export type ImprovTakeKind = 'rotation' | 'phrasing' | 'vary' | 'trade' | 'harris';
export interface ImprovTake {
  kind: ImprovTakeKind;
  lessonId: string;
  event: RatingEvent;
  xp: number;
  /** The mode × function stats after the take (absent when the take had no harmony: Vary). */
  stats?: ModeStats;
}

const SUB: Record<ImprovTakeKind, string> = { rotation: 'improv/play', phrasing: 'improv/play', vary: 'improv/answer', trade: 'improv/answer', harris: 'improv/play' };
/**
 * A take of Improvise as one rated result: a rating event in improv (its sub-skill by mode), XP by the score (a take
 * with almost no notes earns 1), and the lesson id the XP, league and course share are booked under.
 */
export function improvTake(kind: ImprovTakeKind, o: { score: number; notes: number; tier?: number; bpm?: number; stats?: ModeStats; at?: string }): ImprovTake {
  const at = o.at ?? new Date().toISOString();
  const score = Math.max(0, Math.min(1, o.score));
  const difficulty = Math.round(950 + (o.tier ?? 1) * 80 + Math.max(0, (o.bpm ?? 96) - 90) * 2);
  const event: RatingEvent = { id: `improv:${kind}:${Date.parse(at).toString(36)}`, skill: 'improv', difficulty, correct: score >= 0.6, score, tags: [{ skill: 'improv', sub: SUB[kind], w: 1 }], at };
  const xp = o.notes < 4 ? 1 : Math.max(2, Math.round(2 + score * 10));
  return { kind, lessonId: `improv-${kind}`, event, xp, ...(o.stats ? { stats: o.stats } : {}) };
}

/** The weakest scales from the stats (the profile's mode × function map, "Lydian dominant on V-free: 62 %"). */
export function weakModes(stats: ModeStats, n = 3): { fn: Fn; mode: ModeId; cov: number; takes: number }[] {
  return Object.entries(stats)
    .map(([k, v]) => ({ fn: k.split('|')[0] as Fn, mode: k.split('|')[1] as ModeId, cov: v.cov, takes: v.n }))
    .sort((a, b) => a.cov - b.cov || b.takes - a.takes)
    .slice(0, n);
}
