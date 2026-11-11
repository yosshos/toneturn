// Songs and song forms on the kit (docs/research/DRUMS_NICHE_PLAN.md §2, owner-approved): the `d-song` family (8 levels)
// and the shared song builder that `d-form` (drumTheory.ts) and the prog song (`d-prog` 10, drumProg.ts) use.
//
// A song is a section plan (roadmap.ts FormPlan): each section has its groove, its chords (the band is generated from
// the chart — never a recording), a fill in the bar before it, its loudness and any ensemble hits. The drum part is
// written per section with the drums.ts helpers; the band (comping + a bass line on the kick) plays the chart behind
// the headphones gate. Songs are generated per item (section lengths, kick figures, fills and charts are seeded), so
// nothing can be memorised. L8 "Your song" is a chord-only chart the player types (chords are not protected).
//
// Measured per take (drumAnalyze `goal.song` + progAnalyze `goal.prog.form`):
//   * per section: the share of its notes on time (the groove of that section);
//   * section starts: crash + kick on 1 (`goal.drum.landing`, ±25 ms ⚙), the fill present in the bar before;
//   * form position: 0 lost bars (the take aligned bar by bar, a skipped or extra bar shows as a shift);
//   * tempo through the song: drift ≤ 2 % per section (no rushing into the chorus);
//   * L6 the dynamics arc (chorus ≥ verse × 1.15, the breakdown ≤ verse ÷ 1.15, MIDI velocity ⚙);
//   * L4 the band hits on time (landing on each hit) and a set-up before each.
// Pure and deterministic. drums.ts helpers are used only inside functions (drums.ts imports this module).

import type { Drill, DrillSpec, DrumGoal, DrumVoice } from './types';
import type { BandStyle } from '../band';
import { applyForm, expandForm, type FormPlan, type FormSection, type SectionKind } from './roadmap';
import { barBeats, parseMeter } from './timeline';
import { bar, finish, levelOfKind, rnd, type DH, type Lanes } from './drums';

const t = (en: string, he: string) => ({ en, he });
type T2 = { en: string; he: string };

/** Hebrew names of the section labels used on the road map and in the "Why?" lines. */
export const SECTION_HE: Record<string, string> = {
  Intro: 'פתיחה', Verse: 'בית', 'Pre-chorus': 'קדם־פזמון', Chorus: 'פזמון', Bridge: 'גשר', Breakdown: 'שבירה', Solo: 'סולו', Outro: 'סיום', Ending: 'סיום',
  Hits: 'מכות', Stop: 'סטופ', Head: 'נושא', Vamp: 'וואמפ', Coda: 'קודה', A: 'A', B: 'B', 'A′': 'A′', Blues: 'בלוז', Riff: 'ריף', Interlude: 'מעבר',
  '1st ending': 'סיום ראשון', '2nd ending': 'סיום שני', Fine: 'סוף',
};
export const sectionName = (name: string, lang: 'en' | 'he'): string => (lang === 'he' ? (SECTION_HE[name] ?? name) : name);

// ───────────────────────────── the song builder ─────────────────────────────

/** One section of a drum song: the written groove and what the band does. */
export interface SongSection {
  name: string;
  kind: SectionKind;
  bars: number;
  /** The groove bar (one character a step, `sub` steps a drill beat). Absent for 'end' / 'stop' / hits sections. */
  lanes?: Lanes;
  /** The groove of the odd bars when it is a two-bar pattern (chiftetelli). */
  lanes2?: Lanes;
  /** A groove that changes bar by bar (jazz comping): the lanes of bar `b` of the section (overrides lanes / lanes2). */
  laneFn?: (b: number) => Lanes;
  /** Swing: the set-up before each hit on the triplet partials (two triplet 8ths before), not straight 8ths. */
  tripSetup?: boolean;
  sub?: number;
  /** Chords, one per bar (cycled). */
  chart: string[];
  band?: BandStyle | 'tacet' | 'stop';
  /** A fill in the bar before this section (its kind; seeded when true). */
  fillBefore?: boolean | FillKind;
  dyn?: 'p' | 'mf' | 'f';
  /** Ensemble hits (beats from the section start): crash + kick on each, a set-up on the snare before it. */
  hits?: number[];
  /** Stop-time: crash + kick on each 1, nothing between. */
  stop?: boolean;
  /** The last bar: crash + kick on its 1 and let it ring. */
  end?: boolean;
  /** Meter of the section ("7/8 2+2+3"; default 4/4). */
  meter?: string;
  /** Tempo × this from the section on (metric modulation). */
  tempo?: number;
  /** The band (bass) lays out here although the comping style is set (a breakdown). */
  bassRest?: boolean;
  /** Hand for the snare lane when two hands share it (ghosts: L). */
  sHand?: (i: number, c: string) => 'R' | 'L';
}

/** Fills into the next section: 1 beat of 16ths, 2 beats down the toms, a bar around the kit, a triplet beat. */
export type FillKind = 'beat' | 'two' | 'bar' | 'trip';
const FILL_FROM: Record<FillKind, number> = { beat: 3, two: 2, bar: 0, trip: 3 };
function fillHits(kind: FillKind, b0: number, barLen: number, r: () => number): DH[] {
  const T3 = 1 / 3;
  const at = (vs: DrumVoice[], step: number, from: number) => vs.map((v, i) => ({ b: b0 + from + i * step, v, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: step }));
  // Fills are written in quarter-note bars; an eighth-pulse bar (prog songs) gets the last group's eighths instead.
  if (barLen !== 4) {
    const n = Math.min(4, Math.max(2, Math.round(barLen / 3)));
    const vs: DrumVoice[] = ['snare', 'tom1', 'tom2', 'tom3'].slice(0, n) as DrumVoice[];
    return at(vs, 1, barLen - n);
  }
  switch (kind) {
    case 'beat':
      return at(r() < 0.5 ? ['snare', 'snare', 'snare', 'snare'] : ['snare', 'snare', 'tom1', 'tom3'], 0.25, 3);
    case 'two':
      return at(r() < 0.5 ? ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'] : ['snare', 'snare', 'tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3'], 0.25, 2);
    case 'trip':
      return at(['snare', 'snare', 'tom3'], T3, 3);
    default:
      return at(['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom1', 'tom1', 'tom2', 'tom2', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3', 'tom3'], 0.25, 0);
  }
}
const FILL_KINDS: FillKind[] = ['beat', 'two', 'bar'];

export interface SongOpts {
  title: T2;
  bpm: number;
  mic?: boolean;
  /** Play order (repeats, D.S.); absent = list order. */
  order?: number[];
  pulse?: 8;
  /** Band style when a section names none. */
  style: BandStyle;
  /** Bass under the comping (roots on the kick); off for mixed-meter songs (the bass line reads a constant bar). */
  bass?: boolean;
  /** Road map mode and the written chart's signs. */
  roadmap?: 'live' | 'written';
  signs?: string[];
  /** Extra drum rules (ghost band, swing …) and the arc. */
  goal?: DrumGoal;
  /** Landing window (ms ⚙ 25). */
  landMs?: number;
  /** Section share on time (⚙ 0.85). */
  section?: number;
  /** Seed for the fills. */
  seed: string;
  /** Also measure the tempo changes (metric modulation inside the song). */
  tempoRatio?: boolean;
  /** Prep seconds before the first take (sight reading). */
  prep?: number;
}

/** Where the notes of a built song sit: section starts (landings), fill zones and section beat ranges. */
export interface SongLayout {
  landings: number[];
  fills: [number, number][];
  spans: ReturnType<typeof expandForm>;
}

const isTop = (v: DrumVoice) => v === 'hihat' || v === 'hhOpen' || v === 'ride';

/** Build a drum song from its sections: the notes per section, the form, the band, the goals. */
export function buildSong(spec: DrillSpec, secs: SongSection[], o: SongOpts): Drill & { layout: SongLayout } {
  const r = rnd(`song:${o.seed}`);
  const plan: FormPlan = {
    sections: secs.map((s): FormSection => ({
      name: s.name,
      kind: s.kind,
      bars: s.bars,
      chart: s.chart,
      ...(s.meter ? { meter: s.meter } : {}),
      ...(s.band ? { band: s.band } : {}),
      ...(s.fillBefore ? { fillBefore: true } : {}),
      ...(s.dyn ? { dynamic: s.dyn } : {}),
      ...(s.hits ? { hits: s.hits } : {}),
      ...(s.tempo ? { tempo: s.tempo } : {}),
      cue: { en: s.name, he: sectionName(s.name, 'he') },
    })),
    ...(o.order ? { order: o.order } : {}),
  };
  const spans = expandForm(plan, o.pulse);
  const hits: DH[] = [];
  const landings: number[] = [];
  const fills: [number, number][] = [];
  const rests: [number, number][] = [];
  spans.forEach((sp, k) => {
    const s = secs[sp.section];
    const barLen = sp.beats / sp.bars;
    const next = spans[k + 1];
    const nextSec = next ? secs[next.section] : null;
    if (s.bassRest) rests.push([sp.startBeat, sp.startBeat + sp.beats]);
    const out: DH[] = [];
    for (let b = 0; b < sp.bars; b++) {
      const b0 = sp.startBeat + b * barLen;
      if (s.end) {
        if (b === 0) out.push({ b: b0, v: 'crash', h: 'R', d: barLen }, { b: b0, v: 'kick', h: 'R', d: barLen });
        continue;
      }
      if (s.stop) {
        out.push({ b: b0, v: 'crash', h: 'R', d: 1 }, { b: b0, v: 'kick', h: 'R', d: 1 });
        continue;
      }
      if (s.hits) {
        // Ensemble hits inside this bar: crash + kick on each, a two-stroke snare set-up just before (8ths, or 16ths
        // when the gap is short). The section's own 1 is the landing below.
        for (const h of s.hits.filter((x) => x >= b * barLen - 1e-9 && x < (b + 1) * barLen - 1e-9)) {
          const at = sp.startBeat + h;
          out.push({ b: at, v: 'crash', h: 'R', d: 0.5, acc: true }, { b: at, v: 'kick', h: 'R', d: 0.5 });
          const prev = Math.max(sp.startBeat - 1, ...s.hits.filter((x) => x < h - 1e-9).map((x) => sp.startBeat + x + 0.5));
          const step = s.tripSetup ? 1 / 3 : at - prev >= 1 ? 0.5 : 0.25;
          if (at - 2 * step >= prev - 1e-9 && at - 2 * step >= sp.startBeat - 1e-9) {
            out.push({ b: at - 2 * step, v: 'snare', h: 'R', d: step }, { b: at - step, v: 'snare', h: 'L', d: step });
            fills.push([at - 2 * step, at]);
          }
        }
        continue;
      }
      const fillHere = b === sp.bars - 1 && nextSec?.fillBefore ? (nextSec.fillBefore === true ? FILL_KINDS[Math.floor(r() * FILL_KINDS.length)] : nextSec.fillBefore) : null;
      const lanes = s.laneFn?.(b) ?? ((b % 2 && s.lanes2) || s.lanes || {});
      const sub = s.sub ?? 2;
      if (fillHere) {
        const from = barLen === 4 ? FILL_FROM[fillHere] : barLen - Math.min(4, Math.max(2, Math.round(barLen / 3)));
        out.push(...bar(lanes, sub, b0, { to: from, ...(s.sHand ? { sHand: s.sHand } : {}) }), ...fillHits(fillHere, b0, barLen, r));
        fills.push([b0 + from, b0 + barLen]);
      } else out.push(...bar(lanes, sub, b0, s.sHand ? { sHand: s.sHand } : {}));
    }
    // Section start: crash + kick on its 1 (the groove's cymbal and kick there make way).
    if (k > 0 && !s.end && !s.stop) {
      const sb = sp.startBeat;
      const keep = out.filter((h) => !(Math.abs(h.b - sb) < 1e-6 && (isTop(h.v) || h.v === 'kick' || h.v === 'crash')));
      out.length = 0;
      out.push(...keep, { b: sb, v: 'crash', h: 'R', d: 1 }, { b: sb, v: 'kick', h: 'R', d: 1 });
    }
    if (k > 0) landings.push(sp.startBeat);
    if (s.hits) for (const h of s.hits) if (h > 1e-9) landings.push(sp.startBeat + h);
    if (s.dyn) for (const h of out) h.dyn = s.dyn;
    hits.push(...out);
  });
  const totalBars = spans.reduce((a, s) => a + s.bars, 0);
  const first = secs[spans[0].section];
  const firstLen = barBeats(parseMeter(first.meter ?? '4/4'), o.pulse);
  // De-duplicate (a landing over a groove kick) and keep one note per voice and beat.
  const seen = new Set<string>();
  const uniq = hits.filter((h) => {
    const key = `${h.v}:${Math.round(h.b * 1e4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const goal: DrumGoal = {
    ...(o.goal ?? {}),
    landing: { beats: landings, ms: o.landMs ?? 25 },
    song: { section: o.section ?? 0.85, fills, fill: 0.75, drift: 0.02, ...(o.goal?.song?.arc ? { arc: o.goal.song.arc } : {}) },
    ...(o.tempoRatio ? { modulation: { tol: 0.02 } } : {}),
  };
  const base = finish(spec, uniq, {
    title: o.title,
    bpm: o.bpm,
    bars: totalBars,
    meter: firstLen,
    ...(o.pulse ? { pulse: o.pulse } : {}),
    mic: !!o.mic,
    goal,
    band: { style: o.style, ...(o.bass === false ? {} : { bass: true }), ...(rests.length ? { rests } : {}) },
  });
  const formed = applyForm(base, plan);
  // Lost bars from the shared road-map alignment; the landings (crash + kick, ±25 ms), the drift per section and the
  // modulated tempo are the drum analysis' own (least-squares tempo, steadier under human jitter).
  formed.goal = { ...formed.goal, prog: { form: { lost: 0 } } };
  formed.drum = { ...formed.drum!, roadmap: o.roadmap ?? 'live', ...(o.signs ? { chartSigns: o.signs } : {}) };
  if (o.prep) formed.prep = o.prep;
  return { ...formed, layout: { landings, fills, spans } };
}

/** The beat ranges of the sections named (every pass), for the dynamics arc. */
export function rangesOf(d: Drill & { layout: SongLayout }, names: string[]): [number, number][] {
  return d.layout.spans.filter((s) => names.includes(s.name)).map((s) => [s.startBeat, s.startBeat + s.beats] as [number, number]);
}

// ───────────────────────────── grooves per section ─────────────────────────────

const KICKS8 = ['x...x...', 'x..xx...', 'x...xx..', 'xx..x...', 'x...x..x', 'x..x.x..'];
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
export const SONG_GROOVE = {
  intro: (): Lanes => ({ h: 'x.x.x.x.', s: '..x...x.', k: 'x...x...' }),
  verse: (r: () => number): Lanes => ({ h: 'xxxxxxxx', s: '..x...x.', k: pick(r, KICKS8) }),
  pre: (): Lanes => ({ t3: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' }),
  chorus: (r: () => number): Lanes => ({ r: 'xxxxxxxx', s: '..x...x.', k: pick(r, ['x..xx...', 'x...x...', 'x..x.x..']) }),
  half: (): Lanes => ({ h: 'xxxxxxxx', s: '....x...', k: 'x.....x.' }),
  breakdown: (): Lanes => ({ h: 'x.x.x.x.', k: 'x.......' }),
  hat16: (r: () => number): Lanes => ({ h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', k: pick(r, ['x.....x.x.......', 'x..x..x...x.....', 'x.....x...x..x..']) }),
};

/** Chord charts per song key (our own common progressions, chords only). */
const POP_CHARTS: { verse: string[]; chorus: string[]; pre: string[]; bridge: string[] }[] = [
  { verse: ['Am', 'F', 'C', 'G'], chorus: ['F', 'G', 'C', 'Am'], pre: ['Dm', 'F', 'G', 'G'], bridge: ['Dm', 'Am', 'F', 'G'] },
  { verse: ['C', 'G', 'Am', 'F'], chorus: ['F', 'C', 'G', 'G'], pre: ['Am', 'G', 'F', 'G'], bridge: ['Em', 'F', 'Dm', 'G'] },
  { verse: ['Em', 'C', 'G', 'D'], chorus: ['C', 'G', 'D', 'Em'], pre: ['Am', 'C', 'D', 'D'], bridge: ['C', 'D', 'Em', 'D'] },
  { verse: ['D', 'A', 'Bm', 'G'], chorus: ['G', 'D', 'A', 'A'], pre: ['Em', 'G', 'A', 'A'], bridge: ['Bm', 'G', 'D', 'A'] },
];
const BLUES = ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'];

// ───────────────────────────── d-song levels ─────────────────────────────

/** "Your song": the player's chord-only chart, one section a line ("Verse 8: Am F C G"), "= 96" for the tempo. */
export interface TypedSong {
  sections: { name: string; kind: SectionKind; bars: number; chords: string[] }[];
  bpm: number | null;
}
const KIND_WORDS: [RegExp, SectionKind, string][] = [
  [/^(intro|פתיחה)/i, 'intro', 'Intro'],
  [/^(pre|קדם)/i, 'pre', 'Pre-chorus'],
  [/^(chorus|פזמון)/i, 'chorus', 'Chorus'],
  [/^(bridge|גשר)/i, 'bridge', 'Bridge'],
  [/^(solo|סולו)/i, 'solo', 'Solo'],
  [/^(outro|ending|סיום)/i, 'outro', 'Outro'],
  [/^(break|שבירה)/i, 'interlude', 'Breakdown'],
  [/^(verse|בית)/i, 'verse', 'Verse'],
];
const CHORD_RE = /^[A-G][#b♯♭]?[a-zA-Z0-9#b♯♭+°ø()/-]*$/;
/** Parse a typed song (lines or ";"-separated; a section without a bar count gets one bar per chord). Null = nothing usable. */
export function parseTypedSong(text: string): TypedSong | null {
  const parts = text.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean);
  let bpm: number | null = null;
  const sections: TypedSong['sections'] = [];
  for (const p of parts) {
    const tm = /^(?:=|♩\s*=|bpm|tempo|טמפו)\s*:?\s*(\d{2,3})\s*$/i.exec(p);
    if (tm) {
      bpm = Math.max(50, Math.min(200, Number(tm[1])));
      continue;
    }
    const m = /^([^\d:]+?)\s*(\d{1,2})?\s*:\s*(.+)$/.exec(p);
    if (!m) continue;
    const label = m[1].trim();
    const kw = KIND_WORDS.find(([re]) => re.test(label));
    const chords = m[3].split(/[\s|,]+/).map((c) => c.replace(/♯/g, '#').replace(/♭/g, 'b')).filter((c) => c === '%' || CHORD_RE.test(c));
    if (!chords.length) continue;
    const resolved = chords.map((c, i, xs) => (c === '%' ? (xs.slice(0, i).reverse().find((x) => x !== '%') ?? 'C') : c));
    const bars = Math.max(1, Math.min(16, m[2] ? Number(m[2]) : resolved.length));
    sections.push({ name: kw?.[2] ?? 'Verse', kind: kw?.[1] ?? 'verse', bars, chords: resolved });
  }
  if (!sections.length) return null;
  // At most 48 bars a take.
  let left = 48;
  const capped: TypedSong['sections'] = [];
  for (const s of sections) {
    const bars = Math.min(s.bars, left);
    if (bars <= 0) break;
    capped.push({ ...s, bars });
    left -= bars;
  }
  return { sections: capped, bpm };
}
/** The demo charts of L8 (the player types their own; these are ours, chords only). */
export const DEMO_SONGS = [
  'Verse 8: Am F C G\nChorus 8: F G C Am\nBridge 4: Dm Am F G\n= 92',
  'Intro 2: C G\nVerse 8: C G Am F\nPre 4: Dm F G G\nChorus 8: F C G G\n= 100',
  'Verse 8: Em C G D\nChorus 8: C G D Em\nSolo 8: Em C G D\nChorus 8: C G D Em\n= 104',
];
/** The spec kind of a typed song (the text travels in the kind, like chart drills' "txt:"). */
export const ownSongKind = (text: string): string => `8:own~${encodeURIComponent(text)}`;

function songSections(r: () => number, typed: TypedSong): SongSection[] {
  const out: SongSection[] = typed.sections.map((s, i) => {
    const lanes = s.kind === 'chorus' ? SONG_GROOVE.chorus(r) : s.kind === 'bridge' ? SONG_GROOVE.half() : s.kind === 'pre' ? SONG_GROOVE.pre() : s.kind === 'intro' ? SONG_GROOVE.intro() : s.kind === 'solo' ? SONG_GROOVE.hat16(r) : s.kind === 'interlude' ? SONG_GROOVE.breakdown() : SONG_GROOVE.verse(r);
    return { name: s.name, kind: s.kind, bars: s.bars, lanes, sub: s.kind === 'solo' ? 4 : 2, chart: s.chords, ...(i > 0 ? { fillBefore: true } : {}) };
  });
  out.push({ name: 'Ending', kind: 'outro', bars: 1, chart: [typed.sections[0].chords[0]], end: true, fillBefore: 'beat' });
  return out;
}

export function generateSong(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const seed = `${s.kind}:${op}`;
  const r = rnd(`d-song:${seed}`);
  const ch = POP_CHARTS[(op + lv) % POP_CHARTS.length];
  const len = () => (r() < 0.5 ? 4 : 8);
  switch (lv) {
    case 1: {
      // Verse → chorus, switch on the cue: two grooves, the change landed with crash + kick (no fill yet).
      const v = len() + 4;
      const secs: SongSection[] = [
        { name: 'Verse', kind: 'verse', bars: v, lanes: SONG_GROOVE.verse(r), chart: ch.verse },
        { name: 'Chorus', kind: 'chorus', bars: 8, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true },
      ];
      return buildSong(s, secs, { title: t(`Verse → chorus · ${op + 1}`, `בית ← פזמון · ${op + 1}`), bpm: 80, style: 'pop', seed });
    }
    case 2: {
      // + a fill at every section end.
      const secs: SongSection[] = [
        { name: 'Verse', kind: 'verse', bars: len(), lanes: SONG_GROOVE.verse(r), chart: ch.verse },
        { name: 'Chorus', kind: 'chorus', bars: len(), lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: true },
        { name: 'Verse', kind: 'verse', bars: 4, lanes: SONG_GROOVE.verse(r), chart: ch.verse, fillBefore: true },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: true },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, { title: t(`Sections with fills · ${op + 1}`, `קטעים עם מעברים · ${op + 1}`), bpm: 80, style: 'pop', seed });
    }
    case 3: {
      // The full pop form: intro, verse, pre-chorus, chorus, a half-time bridge, chorus, ending.
      const secs: SongSection[] = [
        { name: 'Intro', kind: 'intro', bars: 2, lanes: SONG_GROOVE.intro(), chart: ch.verse.slice(0, 2) },
        { name: 'Verse', kind: 'verse', bars: len(), lanes: SONG_GROOVE.verse(r), chart: ch.verse, fillBefore: true },
        { name: 'Pre-chorus', kind: 'pre', bars: 2, lanes: SONG_GROOVE.pre(), chart: ch.pre, fillBefore: 'beat' },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: true },
        { name: 'Bridge', kind: 'bridge', bars: 4, lanes: SONG_GROOVE.half(), chart: ch.bridge, fillBefore: true },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: 'bar' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, { title: t(`Full pop form · ${op + 1}`, `צורת פופ מלאה · ${op + 1}`), bpm: 85, style: 'pop', seed });
    }
    case 4: {
      // Stops and band hits: the written hits (crash + kick, a snare set-up before each), stop-time, then the chorus.
      const HITS = [
        [0, 1.5, 3],
        [0, 2.5, 3.5, 4.5],
        [0, 0.5, 2, 3.5],
      ][op % 3];
      const secs: SongSection[] = [
        { name: 'Verse', kind: 'verse', bars: 4, lanes: SONG_GROOVE.verse(r), chart: ch.verse },
        { name: 'Hits', kind: 'interlude', bars: 2, chart: ch.pre.slice(0, 2), band: 'tacet', hits: HITS, fillBefore: 'beat' },
        { name: 'Stop', kind: 'interlude', bars: 2, chart: ch.pre.slice(2), band: 'stop', stop: true },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: 'two' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, { title: t(`Stops and band hits · ${op + 1}`, `סטופים ומכות להקה · ${op + 1}`), bpm: 90, style: 'rock', seed });
    }
    case 5: {
      // Road-map reading: the chart shows signs (repeats, 1st / 2nd endings, D.S. al Coda) — the road map does not light
      // the way; the player follows the symbols. The take is the expanded form.
      if (op === 1) {
        // ‖: Verse (4) [1. 2 bars] :‖ [2. 2 bars] | Chorus 4 | D.C. al Fine (the verse once more, then the 2nd ending = Fine).
        const secs: SongSection[] = [
          { name: 'Verse', kind: 'verse', bars: 4, lanes: SONG_GROOVE.verse(r), chart: ch.verse },
          { name: '1st ending', kind: 'verse', bars: 2, lanes: SONG_GROOVE.verse(r), chart: ch.pre.slice(0, 2) },
          { name: '2nd ending', kind: 'verse', bars: 2, lanes: SONG_GROOVE.chorus(r), chart: ch.pre.slice(2), fillBefore: 'beat' },
          { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: 'two' },
          { name: 'Fine', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
        ];
        return buildSong(s, secs, {
          title: t('Read the road map · repeat and endings', 'לקרוא את מפת הדרך · חזרה וסיומות'),
          bpm: 80,
          style: 'pop',
          seed,
          order: [0, 1, 0, 2, 3, 0, 2, 4],
          roadmap: 'written',
          signs: ['‖: Verse 4', '1. 2', ':‖ 2. 2', 'Chorus 4', 'D.C. al Fine', 'Fine'],
        });
      }
      // Intro | 𝄋 ‖: Verse :‖ (To Coda ⊕) | Chorus | D.S. al Coda | ⊕ Coda.
      const v = op === 2 ? 2 : 4;
      const secs: SongSection[] = [
        { name: 'Intro', kind: 'intro', bars: 2, lanes: SONG_GROOVE.intro(), chart: ch.verse.slice(0, 2) },
        { name: 'Verse', kind: 'verse', bars: v, lanes: SONG_GROOVE.verse(r), chart: ch.verse, fillBefore: 'beat' },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, fillBefore: 'two' },
        { name: 'Coda', kind: 'outro', bars: 2, lanes: SONG_GROOVE.half(), chart: ch.bridge.slice(0, 2), fillBefore: 'beat' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, {
        title: t(`Read the road map · D.S. al Coda · ${op === 2 ? 2 : 1}`, `לקרוא את מפת הדרך · D.S. al Coda · ${op === 2 ? 2 : 1}`),
        bpm: 80,
        style: 'pop',
        seed,
        order: [0, 1, 1, 2, 1, 3, 4],
        roadmap: 'written',
        signs: ['Intro 2', `𝄋 ‖: Verse ${v} :‖`, 'To Coda ⊕', 'Chorus 4', 'D.S. al Coda', '⊕ Coda 2'],
      });
    }
    case 6: {
      // Dynamics arc: the verse mf, the chorus f, a breakdown p (softer than the verse), the last chorus f.
      const secs: SongSection[] = [
        { name: 'Verse', kind: 'verse', bars: 4, lanes: SONG_GROOVE.verse(r), chart: ch.verse, dyn: 'mf' },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, dyn: 'f', fillBefore: 'two' },
        { name: 'Breakdown', kind: 'interlude', bars: 4, lanes: SONG_GROOVE.breakdown(), chart: ch.bridge, band: 'tacet', bassRest: true, dyn: 'p', fillBefore: 'beat' },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: SONG_GROOVE.chorus(r), chart: ch.chorus, dyn: 'f', fillBefore: 'bar' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: [ch.verse[0]], end: true, fillBefore: 'beat' },
      ];
      const pre = buildSong(s, secs, { title: t(`Dynamics arc · ${op + 1}`, `קשת דינמית · ${op + 1}`), bpm: 80, style: 'pop', seed });
      const arc = [
        { lo: rangesOf(pre, ['Verse']), hi: rangesOf(pre, ['Chorus']), ratio: 1.15 },
        { lo: rangesOf(pre, ['Breakdown']), hi: rangesOf(pre, ['Verse']), ratio: 1.15 },
      ];
      return buildSong(s, secs, { title: pre.title, bpm: 80, style: 'pop', seed, goal: { song: { section: 0.85, arc } } });
    }
    case 7: {
      if (op === 0) {
        // A 12-bar shuffle: the head with a turnaround fill, a chorus on the ride, the ending.
        const SH: Lanes = { h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' };
        const SHR: Lanes = { r: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' };
        const secs: SongSection[] = [
          { name: 'Blues', kind: 'head', bars: 12, lanes: SH, sub: 3, chart: BLUES },
          { name: 'Blues', kind: 'head', bars: 12, lanes: SHR, sub: 3, chart: BLUES, fillBefore: 'trip' },
          { name: 'Ending', kind: 'outro', bars: 1, chart: ['A7'], end: true, fillBefore: 'trip' },
        ];
        return buildSong(s, secs, { title: t('Style song · 12-bar shuffle', 'שיר בסגנון · שאפל 12 תיבות'), bpm: 90, style: 'shuffle', seed });
      }
      if (op === 1) {
        // A funk vamp, a breakdown (band out, kick and hat), the cue back.
        const F: Lanes = { h: 'x.x.x.x.x.x.x.x.', s: '...gX......gX..g', k: 'x.....x...x.....' };
        const gh = (_i: number, c: string): 'R' | 'L' => (c === 'g' ? 'L' : 'L');
        const secs: SongSection[] = [
          { name: 'Vamp', kind: 'vamp', bars: 4, lanes: F, sub: 4, chart: ['E7', 'E7', 'A7', 'E7'], band: 'funk', sHand: gh },
          { name: 'Breakdown', kind: 'interlude', bars: 4, lanes: { h: 'x.x.x.x.x.x.x.x.', k: 'x.....x...x.....' }, sub: 4, chart: ['E7'], band: 'tacet', bassRest: true, fillBefore: 'beat' },
          { name: 'Vamp', kind: 'vamp', bars: 4, lanes: F, sub: 4, chart: ['E7', 'E7', 'A7', 'E7'], band: 'funk', sHand: gh, fillBefore: 'two' },
          { name: 'Ending', kind: 'outro', bars: 1, chart: ['E7'], end: true, fillBefore: 'beat' },
        ];
        return buildSong(s, secs, { title: t('Style song · funk vamp and breakdown', 'שיר בסגנון · וואמפ פאנק ושבירה'), bpm: 85, style: 'funk', seed, goal: { ghost: 0.75 } });
      }
      // A Mizrahi song: maqsum verse, the Mizrahi pop groove in the chorus, a chiftetelli bridge (one cycle = two bars).
      const MAQ: Lanes = { h: 'xxxxxxxxxxxxxxxx', k: 'x.......x.......', s: '..x...x.....x...' };
      const BAL: Lanes = { h: 'xxxxxxxxxxxxxxxx', k: 'x.x.....x.......', s: '......x.....x...' };
      const ME = ['Am', 'Am', 'Dm', 'E7'];
      const secs: SongSection[] = [
        { name: 'Verse', kind: 'verse', bars: 4, lanes: MAQ, sub: 4, chart: ME },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: BAL, sub: 4, chart: ['Dm', 'E7', 'Am', 'Am'], fillBefore: 'beat' },
        { name: 'Bridge', kind: 'bridge', bars: 4, lanes: { h: 'xxxxxxxx', k: 'x....x..', s: '..xx..x.' }, lanes2: { h: 'xxxxxxxx', k: 'x.x.....', s: '....x...' }, sub: 2, chart: ['Am', 'Am', 'E7', 'E7'], fillBefore: 'beat' },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: BAL, sub: 4, chart: ['Dm', 'E7', 'Am', 'Am'], fillBefore: 'two' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['Am'], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, { title: t('Style song · Mizrahi (maqsum, baladi, chiftetelli)', 'שיר בסגנון · מזרחי (מקסום, בלדי, צ׳יפטטלי)'), bpm: 90, style: 'pop', seed });
    }
    default: {
      // Your song: a chord-only chart the player typed (or one of the demo charts).
      const own = s.kind.includes('~') ? decodeURIComponent(s.kind.slice(s.kind.indexOf('~') + 1)) : DEMO_SONGS[op % DEMO_SONGS.length];
      const typed = parseTypedSong(own) ?? parseTypedSong(DEMO_SONGS[0])!;
      const secs = songSections(r, typed);
      const name = typed.sections.map((x) => sectionName(x.name, 'en')).join(' · ');
      const nameHe = typed.sections.map((x) => sectionName(x.name, 'he')).join(' · ');
      const isOwn = s.kind.includes('~');
      return buildSong(s, secs, { title: t(`${isOwn ? 'Your song' : `Song chart ${op + 1}`} · ${name}`, `${isOwn ? 'השיר שלכם' : `תרשים שיר ${op + 1}`} · ${nameHe}`), bpm: typed.bpm ?? 90, style: 'pop', seed });
    }
  }
}
