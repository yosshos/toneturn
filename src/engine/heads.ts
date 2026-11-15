// Heads in any key, and how a melody is harmonised (docs/AUDIT-DEPTH-3.md §1 #3, C1). Pure.
//
//  - parseMelody: the melody text of src/content/heads.ts → notes on a beat grid (bar sums checked).
//  - headIn: a head moved to a tonic (stdKey.ts spells the chart for the key), the melody in a register.
//  - Harmonisation styles: a registry. A style says what voicing sits under a melody note (a VLType of voiceLead.ts),
//    whether the melody is a voice of it or an extra voice above it, its register, and which chord goes under a note.
//    New styles (6-dim blocks, borrowing — the Barry Harris build) plug in with registerHarmStyle; the drills read the
//    registry, so a style registered here becomes a level kind `hm-<id>` without touching the drill code.

import { HEADS, type Head } from '../content/heads';
import { parseChart, type ChartChordEv } from './charts';
import { moved, transposeTextIn, type Home } from './stdKey';
import { QUAL, type VLChord, type VLQuality, type VLType } from './drills/voiceLead';

type T2 = { en: string; he: string };
const pc = (n: number): number => ((n % 12) + 12) % 12;

// ───────────────────────────── melody text ─────────────────────────────

export interface HNote {
  pitch: number;
  beat: number;
  dur: number;
}

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Parse a melody text (see src/content/heads.ts). `barBeats` = the beats written in each bar (tests: all 4). */
export function parseMelody(text: string): { notes: HNote[]; barBeats: number[]; errors: string[] } {
  const notes: HNote[] = [];
  const barBeats: number[] = [];
  const errors: string[] = [];
  let beat = 0;
  text.split('|').forEach((bar) => {
    let inBar = 0;
    for (const tok of bar.trim().split(/\s+/).filter(Boolean)) {
      const n = /^([A-G])([#♯b♭]?)(-?\d)(?::([\d.]+))?$/.exec(tok);
      const r = /^r(?::([\d.]+))?$/.exec(tok);
      const h = /^-(?::([\d.]+))?$/.exec(tok);
      const d = Number((n ? n[4] : r ? r[1] : h ? h[1] : undefined) ?? 1);
      if (n) {
        const acc = n[2] === '#' || n[2] === '♯' ? 1 : n[2] ? -1 : 0;
        notes.push({ pitch: (Number(n[3]) + 1) * 12 + LETTER[n[1]] + acc, beat, dur: d });
      } else if (h && notes.length) notes[notes.length - 1].dur += d;
      else if (!r) {
        errors.push(tok);
        continue;
      }
      beat += d;
      inBar += d;
    }
    barBeats.push(inBar);
  });
  return { notes, barBeats, errors };
}

/** Bars of a head (its chord chart). */
export const headBars = (h: Head): number => h.chords.split('|').length;

// ───────────────────────────── a head in a key ─────────────────────────────

export type HeadInstrument = 'piano' | 'guitar';

export interface HeadIn {
  head: Head;
  tonic: Home;
  /** The melody (MIDI, sounding pitch) on the beat grid. */
  notes: HNote[];
  /** The chart text moved and spelled for the key (ASCII b / #, as charts are written). */
  text: string;
  /** One chord string per bar. */
  bars: string[];
  chords: ChartChordEv[];
}

/**
 * A head moved to `tonicKey` (its own mode). The melody moves by the smallest interval (a tritone up at most) and then
 * by octaves into the instrument's register: piano around C4–A5; guitar (sounding) inside D4–G5, so a drop-2 voicing
 * fits under it on the top four strings.
 */
export function headIn(h: Head, tonicKey: number, inst: HeadInstrument = 'piano'): HeadIn {
  const ck = `${h.id}|${pc(tonicKey)}|${inst}`;
  const hit = HEAD_IN.get(ck);
  if (hit && hit.head === h) return hit;
  const out = headIn0(h, tonicKey, inst);
  HEAD_IN.set(ck, out);
  return out;
}
const HEAD_IN = new Map<string, HeadIn>();
function headIn0(h: Head, tonicKey: number, inst: HeadInstrument): HeadIn {
  const n0 = pc(tonicKey - h.home.key);
  const n = n0 > 6 ? n0 - 12 : n0;
  const tonic = moved(h.home, n);
  const text = transposeTextIn(h.chords, n, tonic);
  const base = h.melody ? parseMelody(h.melody).notes.map((x) => ({ ...x, pitch: x.pitch + n })) : [];
  let notes = base;
  if (base.length) {
    const [lo, hi] = inst === 'guitar' ? [62, 79] : [62, 86];
    const over = (k: number) => base.reduce((a, x) => a + Math.max(0, lo - (x.pitch + k)) + Math.max(0, x.pitch + k - hi), 0);
    const k = [0, -12, 12].reduce((a, b) => (over(b) < over(a) ? b : a));
    notes = base.map((x) => ({ ...x, pitch: x.pitch + k }));
  }
  const bars = text.split('|').map((b) => b.trim());
  return { head: h, tonic, notes, text, bars, chords: parseChart(text).chords };
}

/** The chord sounding at a beat. */
export function chordAt(chords: ChartChordEv[], beat: number): ChartChordEv {
  let cur = chords[0];
  for (const c of chords) if (c.bar * 4 + c.at <= beat + 1e-6) cur = c;
  return cur;
}

/** Phrases: the head in 4-bar pieces (the harmonising and chord-melody items). */
export const phraseCount = (h: Head): number => Math.ceil(headBars(h) / 4);
/** The notes of bars [from, to) (beats kept absolute). */
export const notesIn = (hi: HeadIn, fromBar: number, toBar: number): HNote[] => hi.notes.filter((x) => x.beat >= fromBar * 4 - 1e-6 && x.beat < toBar * 4 - 1e-6);

// ───────────────────────────── chord qualities ─────────────────────────────

/** What a chart chord is, for voicings and tensions. */
export type ChordKind = 'maj' | 'min' | 'dom' | 'half' | 'dim' | 'mmaj';
export function chordKind(iv: number[]): ChordKind {
  const has = (x: number) => iv.some((i) => pc(i) === x);
  if (has(3) && has(6) && has(9) && !has(10)) return 'dim';
  if (has(3) && has(6) && !has(7)) return has(10) ? 'half' : 'dim';
  if (has(3) && !has(4)) return has(11) ? 'mmaj' : 'min';
  if (has(10)) return 'dom';
  return 'maj';
}

/**
 * The 4-note chord to put under a melody note (pitch class above the root): the chart chord as a VL quality that
 * contains the note — a major chord as a 6 under its root or 6th and as a maj7 under its 3rd, 5th or 7th; a minor
 * chord as m6 under its 6th, else m7. Null when the note is not a tone of the chord (it stays a single note).
 */
export function chordUnder(melodyPc: number, c: Pick<ChartChordEv, 'root' | 'iv'>): VLQuality | null {
  const r = pc(melodyPc - c.root);
  const has = (x: number) => c.iv.some((i) => pc(i) === x);
  switch (chordKind(c.iv)) {
    case 'maj':
      if ([0, 9].includes(r)) return '6';
      if ([4, 7, 11].includes(r)) return has(9) && !has(11) && r !== 11 ? '6' : 'maj7';
      return null;
    case 'min':
      if (r === 9) return 'm6';
      if ([0, 3, 7, 10].includes(r)) return has(9) && !has(10) && r !== 10 ? 'm6' : 'm7';
      return null;
    case 'dom':
      return [0, 4, 7, 10].includes(r) ? '7' : null;
    case 'half':
      return [0, 3, 6, 10].includes(r) ? 'm7b5' : null;
    case 'dim':
      return [0, 3, 6, 9].includes(r) ? 'dim7' : null;
    default:
      return null;
  }
}

// ───────────────────────────── harmonisation styles (pluggable) ─────────────────────────────

/** One melody note to harmonise, with the chart chord under it. */
export interface HarmNote {
  note: HNote;
  chord: ChartChordEv;
}

export interface HarmStyle {
  id: string;
  name: T2;
  /** The voicing under (or with) the melody, as voiceLead.ts grades it. */
  type: VLType;
  /** The melody is an extra top voice above the voicing (shells under a melody), not one of its voices. */
  over: boolean;
  /** Register of the graded voices (MIDI), and the motion tolerance (semitones above the smallest move). */
  lo: number;
  hi: number;
  tol: number;
  /** The chord under one note, or null to leave the note out. Default: the chart chord containing the note (chordUnder). */
  chordFor?: (n: HarmNote) => VLChord | null;
  /** Which notes get a chord. Default: notes on beats 1 and 3, and every note where a chord starts. */
  pick?: (n: HarmNote) => boolean;
  /** A planned style not built yet: no level uses it (a hook for another build). */
  todo?: boolean;
}

const defaultPick = (n: HarmNote): boolean => {
  const inBar = n.note.beat - Math.floor(n.note.beat / 4 + 1e-9) * 4;
  const onStrong = Math.abs(inBar) < 1e-6 || Math.abs(inBar - 2) < 1e-6;
  const onChange = Math.abs(n.chord.bar * 4 + n.chord.at - n.note.beat) < 1e-6;
  return onStrong || onChange;
};
const defaultChordFor = (n: HarmNote): VLChord | null => {
  const q = chordUnder(n.note.pitch, n.chord);
  return q ? { root: n.chord.root, q, melody: n.note.pitch, name: symName(n.chord.sym, q) } : null;
};
/** A chord's name for the quality it is voiced as (the chart's root spelling: Fmaj7 under its root → F6). */
export const symName = (sym: string, q: VLQuality): string => (/^[A-G][#b]?/.exec(sym)?.[0] ?? 'C').replace('#', '♯').replace('b', '♭') + QUAL[q].label;

/** The harmonisation styles by id (level kinds `hm-<id>`). */
export const HARM_STYLES: Record<string, HarmStyle> = {
  // Shell under the melody: the LH root, the 3rd and 7th below the melody note (the melody an extra voice on top).
  shell: { id: 'shell', name: { en: 'Shells under the melody', he: 'שלדים מתחת למנגינה' }, type: 'guide', over: true, lo: 50, hi: 84, tol: 2 },
  // Four-way close: the melody the top of a close 4-note chord (LH root below).
  close: { id: 'close', name: { en: 'Four-way close', he: 'ארבעה קולות צמודים' }, type: 'close', over: false, lo: 52, hi: 88, tol: 2 },
  drop2: { id: 'drop2', name: { en: 'Drop 2 under the melody', he: 'דרופ 2 מתחת למנגינה' }, type: 'drop2', over: false, lo: 47, hi: 88, tol: 3 },
  drop3: { id: 'drop3', name: { en: 'Drop 3 under the melody', he: 'דרופ 3 מתחת למנגינה' }, type: 'drop3', over: false, lo: 47, hi: 88, tol: 3 },
  // TODO (Barry Harris build, after its merge; docs/BARRY-HARRIS-THEORY.md §3, §5): 6-dim blocks — chord tones on the
  // 6th chord Barry converts the chord to (Dm7 = F6, Dø = Fm6, G7 → Dm6), passing tones on the scale’s dim.
  // Register with chordFor (6th chord / dim7) and a pick that takes every note.
  sixdim: { id: 'sixdim', name: { en: '6-dim blocks', he: 'בלוקים שש-מוקטן' }, type: 'close', over: false, lo: 52, hi: 86, tol: 2, todo: true },
  // TODO (Barry Harris build): borrowing on long melody notes — the melody holds, one inner voice to the dim and back.
  borrow: { id: 'borrow', name: { en: 'Borrowing on melody notes', he: 'השאלה על צלילי המנגינה' }, type: 'drop2', over: false, lo: 45, hi: 86, tol: 3, todo: true },
};

/** Plug in (or replace) a harmonisation style. The head drills list every non-todo style in HARM_ORDER. */
export function registerHarmStyle(s: HarmStyle, after?: string): void {
  HARM_STYLES[s.id] = s;
  if (!HARM_ORDER.includes(s.id)) HARM_ORDER.splice(after && HARM_ORDER.includes(after) ? HARM_ORDER.indexOf(after) + 1 : HARM_ORDER.length, 0, s.id);
}
/** The order of the styles on the ladder (todo styles are skipped by the catalogue). */
export const HARM_ORDER: string[] = ['shell', 'close', 'drop2', 'drop3', 'sixdim', 'borrow'];
/** The styles levels are built from. */
export const builtStyles = (): HarmStyle[] => HARM_ORDER.map((id) => HARM_STYLES[id]).filter((s) => s && !s.todo);

/** The harmonised events of bars [from, to) in a style: each a melody note and the chord under it. */
export function harmEvents(hi: HeadIn, fromBar: number, toBar: number, style: HarmStyle): { note: HNote; chord: VLChord; chart: ChartChordEv }[] {
  const pick = style.pick ?? defaultPick;
  const chordFor = style.chordFor ?? defaultChordFor;
  const out: { note: HNote; chord: VLChord; chart: ChartChordEv }[] = [];
  for (const note of notesIn(hi, fromBar, toBar)) {
    const chart = chordAt(hi.chords, note.beat);
    const hn = { note, chord: chart };
    if (!pick(hn)) continue;
    const c = chordFor(hn);
    if (c) out.push({ note, chord: c, chart });
  }
  return out;
}

// Shared-hands melody harmonisation (Siskind, docs/research/SISKIND-SOLO-PIANO.md A5 and C7 #3; "Pro-Level Voicings for
// Solo Piano Jazz Ballads", ExcZLksoxoA): the melody on top in the RH, the root (+ 5th) at the bottom in the LH, the
// thumbs and index fingers sharing the chord between — graded by his four rules (soloPiano.ts sharedRules) through
// voiceLead.ts's 'shared' type. Registered after drop 3, so it becomes k-harm level 8 (`hm-shared`).
registerHarmStyle({ id: 'shared', name: { en: 'Shared hands under the melody', he: 'שתי ידיים מתחת למנגינה' }, type: 'shared', over: true, lo: 36, hi: 84, tol: 4 }, 'drop3');

/** Every head by id, for lookups from item options (option = index in HEADS). */
export const headAt = (i: number): Head => HEADS[((i % HEADS.length) + HEADS.length) % HEADS.length];
