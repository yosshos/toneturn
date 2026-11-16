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
  /** Which notes get a chord (`all`: the notes of the bars harmonised). Default: notes on beats 1 and 3, and every note where a chord starts. */
  pick?: (n: HarmNote, all: HNote[]) => boolean;
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
};

/** Plug in (or replace) a harmonisation style. The head drills list every non-todo style in HARM_ORDER. */
export function registerHarmStyle(s: HarmStyle, after?: string): void {
  HARM_STYLES[s.id] = s;
  if (!HARM_ORDER.includes(s.id)) HARM_ORDER.splice(after && HARM_ORDER.includes(after) ? HARM_ORDER.indexOf(after) + 1 : HARM_ORDER.length, 0, s.id);
}
/** The order of the styles on the ladder (todo styles are skipped by the catalogue). */
export const HARM_ORDER: string[] = ['shell', 'close', 'drop2', 'drop3'];
/** The styles levels are built from. */
export const builtStyles = (): HarmStyle[] => HARM_ORDER.map((id) => HARM_STYLES[id]).filter((s) => s && !s.todo);

/** The harmonised events of bars [from, to) in a style: each a melody note and the chord under it. */
export function harmEvents(hi: HeadIn, fromBar: number, toBar: number, style: HarmStyle): { note: HNote; chord: VLChord; chart: ChartChordEv }[] {
  const pick = style.pick ?? defaultPick;
  const chordFor = style.chordFor ?? defaultChordFor;
  const out: { note: HNote; chord: VLChord; chart: ChartChordEv }[] = [];
  const all = notesIn(hi, fromBar, toBar);
  for (const note of all) {
    const chart = chordAt(hi.chords, note.beat);
    const hn = { note, chord: chart };
    if (!pick(hn, all)) continue;
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

// ───────────────────────────── 6-dim blocks under a melody (Barry Harris; AUDIT-DEPTH-3 C1, #1) ─────────────────────────────
// docs/BARRY-HARRIS-THEORY.md (owner-confirmed sections only): §3 — Dm7 = F6, Dø = Fm6, and over a dominant the m6 on
// its 5th ("the important minor": G7 → Dm6); §5 — the four 6th-diminished scales: the 6th chord's tones on the beat, the
// dim a half step below the 6th chord's root between (C6 / Cm6 → B°7); §6.3 — harmonisation: the chord alternates with
// its dim, block, then drop 2; §6.4 — borrowing (oblique motion): one voice to the dim and back. So under each melody
// note: a tone of the bar's 6th chord gets that 6th chord, a tone of its dim gets the dim; a note in neither (a
// chromatic passing note) stays a single note. The bass keeps the chart's root (Dm7 voiced F6 over D).

/** The 6th chord a chart chord converts to (root pc + quality), or null (no 6-dim conversion). */
export function sixthOf(c: Pick<ChartChordEv, 'root' | 'iv'>): { root: number; q: '6' | 'm6' } | null {
  switch (chordKind(c.iv)) {
    case 'maj':
      return { root: pc(c.root), q: '6' };
    case 'min':
      // a written m6 stays m6; a m7 is the 6 chord a minor 3rd up (Dm7 = F6)
      return c.iv.some((i) => pc(i) === 9) && !c.iv.some((i) => pc(i) === 10) ? { root: pc(c.root), q: 'm6' } : { root: pc(c.root + 3), q: '6' };
    case 'mmaj':
      return { root: pc(c.root), q: 'm6' };
    case 'half':
      return { root: pc(c.root + 3), q: 'm6' }; // Dø = Fm6
    case 'dom':
      return { root: pc(c.root + 7), q: 'm6' }; // G7 → Dm6
    default:
      return null;
  }
}
const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
/** A note name `steps` letters and `semis` semitones from the chart chord's root, spelled from its letter (Dm7 → F, B♭7 → F). */
export function spellFrom(sym: string, steps: number, semis: number): string {
  const m = /^([A-G])([#b♯♭]?)/.exec(sym);
  const li = m ? LETTERS.indexOf(m[1]) : 0;
  const acc = m && (m[2] === '#' || m[2] === '♯') ? 1 : m && m[2] ? -1 : 0;
  const rootPc = LETTER_PC[li] + acc;
  const nl = (((li + steps) % 7) + 7) % 7;
  let d = pc(rootPc + semis - LETTER_PC[nl]);
  if (d > 6) d -= 12;
  return LETTERS[nl] + (d === 1 ? '♯' : d === 2 ? '𝄪' : d === -1 ? '♭' : d === -2 ? '𝄫' : '');
}
/** The chord under a melody note in 6-dim blocks: the 6th chord, its dim, or null. */
export function sixDimUnder(melodyPitch: number, c: ChartChordEv): VLChord | null {
  if (chordKind(c.iv) === 'dim') return [0, 3, 6, 9].includes(pc(melodyPitch - c.root)) ? { root: pc(c.root), q: 'dim7', melody: melodyPitch, name: symName(c.sym, 'dim7') } : null;
  const six = sixthOf(c);
  if (!six) return null;
  const r = pc(melodyPitch - six.root);
  const bassPc = pc(c.root);
  // letters from the chart root to the 6th chord's root: same (maj, m6), a 3rd up (m7, ø), a 5th up (dom)
  const up = pc(six.root - c.root);
  const steps = up === 0 ? 0 : up === 3 ? 2 : 4;
  const sixName = spellFrom(c.sym, steps, up);
  if ((six.q === '6' ? [0, 4, 7, 9] : [0, 3, 7, 9]).includes(r)) return { root: six.root, q: six.q, melody: melodyPitch, bassPc, name: sixName + QUAL[six.q].label };
  // the dim a half step under the 6th chord's root (C6 → B°7): one letter down
  if ([11, 2, 5, 8].includes(r)) return { root: pc(six.root - 1), q: 'dim7', melody: melodyPitch, bassPc, name: spellFrom(c.sym, steps - 1, up - 1) + QUAL.dim7.label };
  return null;
}
/** Every note of an 8th or longer gets a block (locked hands); shorter notes stay single. */
const everyNote = (n: HarmNote): boolean => n.note.dur >= 0.5 - 1e-6;
const sixChordFor = (n: HarmNote): VLChord | null => sixDimUnder(n.note.pitch, n.chord);

registerHarmStyle({ id: 'sixdim', name: { en: '6-dim blocks under the melody', he: 'בלוקים שש-מוקטן מתחת למנגינה' }, type: 'close', over: false, lo: 52, hi: 88, tol: 3, chordFor: sixChordFor, pick: everyNote }, 'shared');
registerHarmStyle({ id: 'sixdrop2', name: { en: '6-dim blocks in drop 2', he: 'בלוקים שש-מוקטן בדרופ 2' }, type: 'drop2', over: false, lo: 45, hi: 88, tol: 4, chordFor: sixChordFor, pick: everyNote }, 'sixdim');
// Borrowing: the blocks of the 6-dim style; on a long melody note one inner voice goes to the dim and back while the
// melody and the other voices hold (headDrills.ts writes the oblique motion out).
registerHarmStyle({ id: 'borrow', name: { en: 'Borrowing on long melody notes', he: 'השאלה על צלילים ארוכים של המנגינה' }, type: 'close', over: false, lo: 52, hi: 88, tol: 3, chordFor: sixChordFor, pick: everyNote }, 'sixdrop2');
// A single-note line that breaks into 6-dim blocks at its peaks: the highest note of each bar (an 8th or longer) is
// blocked, the rest stay single notes (AUDIT-DEPTH-3 #1 L6).
const peakPick = (n: HarmNote, all: HNote[]): boolean => {
  if (n.note.dur < 0.5 - 1e-6) return false;
  const bar = Math.floor(n.note.beat / 4 + 1e-9);
  const inBar = all.filter((x) => Math.floor(x.beat / 4 + 1e-9) === bar && x.dur >= 0.5 - 1e-6);
  const top = Math.max(...inBar.map((x) => x.pitch));
  return n.note.pitch === top && inBar.find((x) => x.pitch === top) === n.note;
};
registerHarmStyle({ id: 'peaks', name: { en: 'A line that breaks into blocks at its peaks', he: 'קו שנפתח לבלוקים בשיאים שלו' }, type: 'close', over: false, lo: 52, hi: 88, tol: 6, chordFor: sixChordFor, pick: peakPick }, 'borrow');
// Triads under the melody (AUDIT-DEPTH-3 #3 L1): the melody the top of a close triad of the chart chord (a 7th chord's
// triad: Dm7 → Dm, G7 → G, Bø → B°); a note outside the triad stays single.
const TRIAD_Q: Record<ChordKind, VLQuality | null> = { maj: 'M', min: 'm', mmaj: 'm', dom: 'M', half: 'dim', dim: 'dim' };
registerHarmStyle(
  {
    id: 'triad',
    name: { en: 'Triads under the melody', he: 'משולשים מתחת למנגינה' },
    type: 'triad',
    over: false,
    lo: 52,
    hi: 88,
    tol: 2,
    chordFor: (n) => {
      const q = TRIAD_Q[chordKind(n.chord.iv)];
      if (!q || !QUAL[q].ints.map((i) => pc(n.chord.root + i)).includes(pc(n.note.pitch))) return null;
      return { root: pc(n.chord.root), q, melody: n.note.pitch, name: symName(n.chord.sym, q) };
    },
  },
  'peaks',
);

/** Every head by id, for lookups from item options (option = index in HEADS). */
export const headAt = (i: number): Head => HEADS[((i % HEADS.length) + HEADS.length) % HEADS.length];
