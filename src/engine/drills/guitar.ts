// Guitar technique drills (docs/SPEC-GUITAR-TECHNIQUE.md): the guitar / bass catalogue and DrillSpec → Drill.
// Pure and deterministic. Reuses the piano drill engine (types, ladder, analysis); only the note content differs.
// Pitches are SOUNDING MIDI (what the microphone hears: open low E = 40). Strings: 1 = highest-sounding.
// Every note carries string / fret; `pos` = index-finger fret of the hand position; `finger` = fretting-hand finger
// 1–4 (help only, never graded); `stroke` = picking hand (help only: pick direction cannot be heard).

import type { Drill, DrillGoal, DrillSettings, DrillSpec, ExpNote, FamilyId, LevelExamTag } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { noteAt, tuningById, type Tuning } from '../fretboard';
import { SONGBOOK, songChords, songNotes } from '../../content/songbook';
import { bassFamilies, generateBass } from './bass';
import { BASS_PROBES } from './bassProbes';

export type GuitarStyle = NonNullable<DrillSettings['guitarStyle']>;
export type GuitarTechnique = NonNullable<ExpNote['technique']>;
export type Stroke = NonNullable<ExpNote['stroke']>;

/** A guitar family: the piano FamilyDef plus the genres it serves and the instruments it is shown for. */
export interface GuitarFamilyDef extends FamilyDef {
  instruments: ('guitar' | 'bass')[];
  /** Genres this family belongs to ('all' families are always shown). */
  genres: GuitarStyle[];
  levels: GuitarLevelDef[];
  /** Kept only so old progress / path ids stay valid; not shown in the hub or new course paths. */
  retired?: boolean;
  /** Bass: the upright / double-bass track (BASS_CURRICULUM §5.1), a secondary track grouped on its own. */
  upright?: boolean;
}
export interface GuitarLevelDef extends LevelDef {
  /** Genres of this level (rhythm guitar levels are per genre); absent = the family's genres. */
  genres?: GuitarStyle[];
  /** Bass levels: start → target tempo (♩) and the subdivision, from BASS_CURRICULUM §5. */
  tempo?: [number, number];
  sub?: string;
  /** Bass: exam / bagrut mapping of the level (BASS_AUDIT §3), shown on the level card and used by badges. */
  exam?: LevelExamTag[];
}

export type T2 = { en: string; he: string };
export const t = (en: string, he: string): T2 => ({ en, he });
export const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
export const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const SCALES: Record<string, number[]> = {
  major: MAJOR,
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
  pentaMinor: [0, 3, 5, 7, 10],
  pentaMajor: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
/** Mode n (0 ionian … 6 locrian) of the major scale, as intervals from its own tonic. */
export const modeInts = (n: number): number[] => MAJOR.map((_, i) => mod(MAJOR[(i + n) % 7] - MAJOR[n], 12));
const MODE_T = [
  t('Ionian', 'יוני'),
  t('Dorian', 'דורי'),
  t('Phrygian', 'פריגי'),
  t('Lydian', 'לידי'),
  t('Mixolydian', 'מיקסולידי'),
  t('Aeolian', 'איאולי'),
  t('Locrian', 'לוקרי'),
];

// ───────────────────────────── neck helpers ─────────────────────────────

export interface GN {
  s: number;
  f: number;
  tech?: GuitarTechnique;
  bend?: number;
  stroke?: Stroke;
  acc?: boolean;
  ct?: boolean;
  pos?: number;
  finger?: number;
}
export interface Ev {
  beat: number;
  dur: number;
  notes: GN[];
}

const isBassFamily = (f: string): boolean => f === 'g-bass' || f.startsWith('b-');
const tuningOf = (s: DrillSpec): Tuning => tuningById(s.tuning ?? (isBassFamily(s.family) || s.instrument === 'bass' ? 'bass' : 'standard'));
/** Fret (0–11) of pitch class pc on a string. */
const lowFret = (tu: Tuning, pc: number, str: number): number => mod(pc - tu.open[str - 1], 12);
/** Same, but never the open string (1–12). */
const lowFret1 = (tu: Tuning, pc: number, str: number): number => lowFret(tu, pc, str) || 12;

/** Every note of a scale inside a fret window, strings low → high, strictly rising (a "position" / "box"). */
export function windowScale(tu: Tuning, tonic: number, ints: number[], lo: number, hi: number, strings?: number[]): { s: number; f: number }[] {
  const pcs = new Set(ints.map((i) => mod(tonic + i, 12)));
  const out: { s: number; f: number }[] = [];
  let last = -Infinity;
  for (let s = tu.open.length; s >= 1; s--) {
    if (strings && !strings.includes(s)) continue;
    for (let f = Math.max(0, lo); f <= hi; f++) {
      const p = noteAt(tu, s, f);
      if (pcs.has(mod(p, 12)) && p > last) {
        out.push({ s, f });
        last = p;
      }
    }
  }
  return out;
}

/** Three notes per string from scale degree `deg` on the lowest string (6 strings, 18 notes), starting fret 1–12. */
export function threeNpsPattern(tu: Tuning, tonic: number, ints: number[], deg: number, strings = 6): { s: number; f: number }[] {
  const low = tu.open.length;
  const f0 = lowFret1(tu, tonic + ints[deg], low);
  let p = noteAt(tu, low, f0);
  const pcs = ints.map((i) => mod(tonic + i, 12));
  const notes: number[] = [p];
  while (notes.length < strings * 3) {
    p++;
    if (pcs.includes(mod(p, 12))) notes.push(p);
  }
  return notes.map((m, i) => {
    const s = low - Math.floor(i / 3);
    return { s, f: m - tu.open[s - 1] };
  });
}

/** 3NPS fingering on one string: first 1, last 4, middle 2 or 3. */
function npsFingers(fs: number[]): number[] {
  if (fs.length !== 3) return fs.map((f) => clamp(f - fs[0] + 1, 1, 4));
  const [a, b, c] = fs;
  return [1, b - a === 1 ? 2 : c - b === 1 ? 3 : 2, 4];
}

const upDown = <T>(xs: T[]): T[] => [...xs, ...xs.slice(0, -1).reverse()];

/** Find a place for a pitch on the given strings with the fret inside [lo, hi]. */
function place(tu: Tuning, pitch: number, strings: number[], lo: number, hi: number): { s: number; f: number } | null {
  for (const s of strings) {
    const f = pitch - tu.open[s - 1];
    if (f >= lo && f <= hi) return { s, f };
  }
  return null;
}

// ───────────────────────────── chord shapes ─────────────────────────────

type Q = 'M' | 'm' | '7' | 'm7' | 'maj7' | '5' | '9' | 'sus2' | 'sus4' | 'add9';
interface Shape {
  dots: { s: number; f: number; finger?: number }[];
  root: number;
  name: string;
}
const Q_NAME: Record<Q, string> = { M: '', m: 'm', '7': '7', m7: 'm7', maj7: 'maj7', '5': '5', '9': '9', sus2: 'sus2', sus4: 'sus4', add9: 'add9' };

/** Open chords: shape (low → high, x = muted) and fingers. */
const OPEN: Record<string, [string, string]> = {
  '0M': ['x32010', 'x32010'],
  '9M': ['x02220', 'x01230'],
  '7M': ['320003', '210003'],
  '4M': ['022100', '023100'],
  '2M': ['xx0232', 'xx0132'],
  '9m': ['x02210', 'x02310'],
  '4m': ['022000', '023000'],
  '2m': ['xx0231', 'xx0231'],
  '47': ['020100', '020100'],
  '97': ['x02020', 'x02030'],
  '27': ['xx0212', 'xx0213'],
  '77': ['320001', '320001'],
  '07': ['x32310', 'x32410'],
  '117': ['x21202', 'x21304'],
  '9m7': ['x02010', 'x02010'],
  '4m7': ['022030', '012030'],
  '2m7': ['xx0211', 'xx0211'],
  '0maj7': ['x32000', 'x32000'],
  '5maj7': ['xx3210', 'xx3210'],
  '9maj7': ['x02120', 'x02130'],
  '45': ['022xxx', '012xxx'],
  '95': ['x022xx', 'x012xx'],
  '25': ['xx023x', 'xx013x'],
  '2sus4': ['xx0233', 'xx0134'],
  '2sus2': ['xx0230', 'xx0130'],
  '9sus4': ['x02230', 'x01230'],
  '9sus2': ['x02200', 'x01200'],
  '4sus4': ['022200', '023400'],
  '0add9': ['x32030', 'x21030'],
};
type Off = (number | null)[];
const E_SHAPE: Partial<Record<Q, [Off, Off | null]>> = {
  M: [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],
  m: [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
  '7': [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],
  m7: [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
  maj7: [[0, null, 1, 1, 0, null], null],
  '5': [[0, 2, 2, null, null, null], [1, 3, 4, null, null, null]],
};
const A_SHAPE: Record<Q, [Off, Off | null]> = {
  M: [[null, 0, 2, 2, 2, 0], [null, 1, 3, 3, 3, 1]],
  m: [[null, 0, 2, 2, 1, 0], [null, 1, 3, 4, 2, 1]],
  '7': [[null, 0, 2, 0, 2, 0], [null, 1, 3, 1, 4, 1]],
  m7: [[null, 0, 2, 0, 1, 0], [null, 1, 3, 1, 2, 1]],
  maj7: [[null, 0, 2, 1, 2, 0], [null, 1, 3, 2, 4, 1]],
  '5': [[null, 0, 2, 2, null, null], [null, 1, 3, 4, null, null]],
  '9': [[null, 0, -1, 0, 0, 0], [null, 2, 1, 3, 3, 3]],
  sus2: [[null, 0, 2, 2, 0, 0], [null, 1, 3, 4, 1, 1]],
  sus4: [[null, 0, 2, 2, 3, 0], [null, 1, 2, 3, 4, 1]],
  add9: [[null, 0, 2, 4, 2, 0], [null, 1, 2, 4, 3, 1]],
};
function parseOpen(shape: string, fing: string): Shape['dots'] {
  const out: Shape['dots'] = [];
  for (let i = 0; i < 6; i++) {
    if (shape[i] === 'x') continue;
    const f = Number(shape[i]);
    const fg = fing[i] === 'x' || fing[i] === '0' ? undefined : Number(fing[i]);
    out.push(fg ? { s: 6 - i, f, finger: fg } : { s: 6 - i, f });
  }
  return out;
}
function fromOffsets(n: number, offs: Off, fing: Off | null): Shape['dots'] {
  const out: Shape['dots'] = [];
  offs.forEach((o, i) => {
    if (o === null) return;
    const fg = fing?.[i];
    out.push(fg && n > 0 ? { s: 6 - i, f: n + o, finger: fg } : { s: 6 - i, f: n + o });
  });
  return out;
}
/** A playable chord shape (standard tuning): the open chord when there is one, else an E- or A-shape barre. */
export function chordShape(root: number, q: Q, preferOpen = true): Shape {
  const r = mod(root, 12);
  const name = NAMES[r] + Q_NAME[q];
  const open = OPEN[`${r}${q}`];
  if (preferOpen && open) return { dots: parseOpen(open[0], open[1]), root: r, name };
  const n6 = lowFret(tuningById('standard'), r, 6);
  const n5 = lowFret(tuningById('standard'), r, 5);
  const e = E_SHAPE[q];
  if (q === '9' || !e || (n5 < n6 && n5 > 0) || (n6 === 0 && n5 > 0 && !preferOpen)) {
    const n = q === '9' ? n5 || 12 : n5;
    return { dots: fromOffsets(n, A_SHAPE[q][0], A_SHAPE[q][1]), root: r, name };
  }
  return { dots: fromOffsets(n6, e[0], e[1]), root: r, name };
}

/** Drop-2 voicings of a 4-note chord on 4 adjacent strings (low → high), sorted by fret. */
export function drop2Voicings(tu: Tuning, pcs: number[], strings: number[], hi = 15): { s: number; f: number }[][] {
  const want = pcs.map((p) => mod(p, 12));
  const per = strings.map((s) => {
    const fs: number[] = [];
    for (let f = 0; f <= hi; f++) if (want.includes(mod(noteAt(tu, s, f), 12))) fs.push(f);
    return fs;
  });
  const out: { s: number; f: number }[][] = [];
  const rec = (i: number, acc: { s: number; f: number }[]) => {
    if (i === strings.length) {
      const ms = acc.map((p) => noteAt(tu, p.s, p.f));
      if (!ms.every((m, k) => k === 0 || m > ms[k - 1])) return;
      if (new Set(ms.map((m) => mod(m, 12))).size !== 4) return;
      const fr = acc.map((p) => p.f);
      if (Math.max(...fr) - Math.min(...fr) > 4) return;
      // Drop 2: raising the lowest note an octave gives close position with it second from the top.
      if (!(ms[0] + 12 > ms[2] && ms[0] + 12 < ms[3] && ms[3] - ms[1] < 12)) return;
      out.push(acc.slice());
      return;
    }
    for (const f of per[i]) rec(i + 1, [...acc, { s: strings[i], f }]);
  };
  rec(0, []);
  return out.sort((a, b) => Math.min(...a.map((p) => p.f)) - Math.min(...b.map((p) => p.f)));
}

/** Shell voicing (root on string 6: R-7-3 on 6-4-3; root on string 5: R-3-7 on 5-4-3), Freddie Green style. */
function shell(tu: Tuning, root: number, q: Q, rootStr: 5 | 6, near: number): { s: number; f: number }[] {
  let rf = lowFret(tu, root, rootStr);
  while (rf + 12 <= 13 && Math.abs(rf + 12 - near) < Math.abs(rf - near)) rf += 12;
  if (rf < 2) rf += 12; // the 3rd / 7th sit up to 2 frets below the root
  const R = noteAt(tu, rootStr, rf);
  const third = q === 'm' || q === 'm7' ? 3 : 4;
  const sev = q === 'maj7' ? 11 : q === 'M' ? 9 : 10;
  const top = rootStr === 6 ? [R + sev, R + 12 + third] : [R + third, R + sev];
  return [{ s: rootStr, f: rf }, { s: 4, f: top[0] - tu.open[3] }, { s: 3, f: top[1] - tu.open[2] }];
}

// ───────────────────────────── building a drill ─────────────────────────────

const seqEv = (gns: GN[], unit: number, start = 0, lastDur?: number): Ev[] =>
  gns.map((g, i) => ({ beat: start + i * unit, dur: i === gns.length - 1 ? (lastDur ?? Math.max(unit, 1)) : unit, notes: [g] }));

/** Alternate pick strokes D U D U … */
const alt = (gns: GN[], first: Stroke = 'D'): GN[] => gns.map((g, i) => ({ ...g, stroke: g.stroke ?? (i % 2 === 0 ? first : first === 'D' ? 'U' : 'D') }));

/** Hand positions for single notes without one: greedy chunks whose fret span ≤ limit; fingers spread 1–4. */
function autoPos(evs: Ev[], limit: number): void {
  const single = evs.filter((e) => e.notes.length === 1).map((e) => e.notes[0]);
  let chunk: GN[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  const flush = () => {
    if (!chunk.length) return;
    const pos = Math.max(1, lo);
    const span = Math.max(3, hi - pos);
    for (const g of chunk) {
      g.pos = pos;
      g.finger = g.finger ?? clamp(1 + Math.round(((g.f - pos) * 3) / span), 1, 4);
    }
    chunk = [];
    lo = Infinity;
    hi = -Infinity;
  };
  for (const g of single) {
    if (g.f === 0 || g.pos !== undefined || g.tech === 'tap' || g.tech === 'harmonic') continue;
    const nlo = Math.min(lo, g.f);
    const nhi = Math.max(hi, g.f);
    if (chunk.length && nhi - Math.max(1, nlo) > limit) flush();
    chunk.push(g);
    lo = Math.min(lo, g.f);
    hi = Math.max(hi, g.f);
  }
  flush();
  // Chords: position = the lowest fretted fret (the barre / the index finger).
  for (const e of evs) {
    if (e.notes.length < 2) continue;
    const fr = e.notes.filter((g) => g.f > 0 && g.tech !== 'harmonic').map((g) => g.f);
    if (!fr.length) continue;
    const p = Math.min(...fr);
    for (const g of e.notes) if (g.f > 0 && g.pos === undefined) g.pos = p;
  }
}

/** Stable id of a guitar item: every spec field that changes the notes. */
export function guitarItemId(s: DrillSpec): string {
  const p: string[] = [s.family, s.kind, String(mod(s.key, 12)), s.hands];
  const extra: [string, unknown][] = [
    ['m', s.minor],
    ['sc', s.scale],
    ['op', s.option],
    ['ps', s.position],
    ['pb', s.perBeat],
    ['sw', s.swing],
    // Bass course families: the tuning only moves notes between strings, so 4- and 5-string progress is one item.
    ['tu', s.family.startsWith('b-') ? undefined : s.tuning],
    ['st', s.stretch],
    ['in', s.instrument],
  ];
  for (const [k, v] of extra) if (v !== undefined && v !== false) p.push(v === true ? k : `${k}${v}`);
  return p.join(':');
}

export interface Fin {
  title: T2;
  bpm: number;
  goal?: Partial<DrillGoal>;
  evenness?: boolean;
  meter?: number;
  keySig?: string;
}
export function finish(spec: DrillSpec, tu: Tuning, evs: Ev[], o: Fin): Drill {
  autoPos(evs, spec.stretch ? 6 : 4);
  const notes: ExpNote[] = [];
  let cid = 0;
  for (const e of evs) {
    const id = e.notes.length > 1 ? ++cid : undefined;
    for (const g of e.notes) {
      const base = g.tech === 'harmonic' ? tu.open[g.s - 1] + (g.f === 12 ? 12 : g.f === 7 ? 19 : g.f === 5 ? 24 : g.f === 4 || g.f === 9 ? 28 : g.f) : noteAt(tu, g.s, g.f);
      const n: ExpNote = {
        pitch: base + (g.tech === 'prebend' ? Math.round((g.bend ?? 0) / 100) : 0),
        beat: r6(e.beat),
        dur: r6(e.dur),
        hand: 'R',
        string: g.s,
        fret: g.f,
      };
      if (g.pos !== undefined && g.f > 0) n.pos = g.pos;
      if (g.finger !== undefined && g.f > 0 && g.tech !== 'tap' && g.tech !== 'harmonic') n.finger = g.finger;
      if (id !== undefined) n.chordId = id;
      if (g.acc) n.accent = true;
      if (g.ct !== undefined) n.chordTone = g.ct;
      if (g.tech) n.technique = g.tech;
      if (g.bend) n.bendCents = g.bend;
      if (g.stroke) n.stroke = g.stroke;
      notes.push(n);
    }
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const beats = r6(Math.max(...notes.map((n) => n.beat + n.dur)));
  const spec2: DrillSpec = { ...spec, instrument: spec.instrument ?? (isBassFamily(spec.family) ? 'bass' : 'guitar') };
  return {
    spec: spec2,
    itemId: guitarItemId(spec),
    title: o.title,
    notes,
    beats,
    meter: o.meter ?? 4,
    keySig: o.keySig ?? SIG[mod(spec.key + (spec.minor ? 3 : 0), 12)],
    goal: { evenness: o.evenness ?? true, hands: false, ...(o.goal ?? {}) },
    startBpm: clamp(Math.round(spec.tempo ?? o.bpm), 40, 240),
  };
}

/** ♩ for a target notes/s at notes-per-beat. */
const bpmAt = (nps: number, perBeat: number): number => (nps * 60) / perBeat;

const kn = (s: DrillSpec): string => NAMES[mod(s.key, 12)] + (s.minor ? 'm' : '');
const ttl = (en: string, he: string, s?: DrillSpec | null, extra?: string): T2 => {
  const k = s ? ` · ${kn(s)}` : '';
  const x = extra ? ` · ${extra}` : '';
  return t(en + k + x, he + k + x);
};
const pbName = (pb: number): string => (pb === 4 ? '16ths' : pb === 3 ? 'triplets' : pb === 1 ? '♩' : '8ths');
const pbNameHe = (pb: number): string => (pb === 4 ? 'שש-עשריות' : pb === 3 ? 'טריולות' : pb === 1 ? '♩' : 'שמיניות');

// ───────────────────────────── F: fretting hand ─────────────────────────────

/** The 24 orders of fingers 1-2-3-4 (1234 first). */
export const PERMS: number[][] = (() => {
  const out: number[][] = [];
  const rec = (acc: number[]) => {
    if (acc.length === 4) {
      out.push(acc);
      return;
    }
    for (const x of [1, 2, 3, 4]) if (!acc.includes(x)) rec([...acc, x]);
  };
  rec([]);
  return out;
})();

export function genFretting(s: DrillSpec, tu: Tuning): Drill {
  const nStr = tu.open.length;
  const pb = s.perBeat ?? 2;
  const pos = lowFret1(tu, s.key, nStr);
  const posName = `fret ${pos}`;
  let gns: GN[] = [];
  let title: T2;
  switch (s.kind) {
    case 'spider': {
      const perm = PERMS[(s.option ?? 0) % 24];
      const up: GN[] = [];
      for (let str = nStr; str >= 1; str--) for (const fg of perm) up.push({ s: str, f: pos + fg - 1, pos, finger: fg });
      const down: GN[] = [];
      for (let str = 1; str <= nStr; str++) for (const fg of perm.slice().reverse()) down.push({ s: str, f: pos + fg - 1, pos, finger: fg });
      gns = [...up, ...down];
      title = t(`Chromatic ${perm.join('')} · ${posName}`, `כרומטי ${perm.join('')} · ${posName.replace('fret', 'סריג')}`);
      break;
    }
    case 'walk': {
      // Diagonal: one fret higher on every string.
      for (let i = 0; i < nStr; i++) {
        const str = nStr - i;
        const p = pos + i;
        for (const fg of [1, 2, 3, 4]) gns.push({ s: str, f: p + fg - 1, pos: p, finger: fg });
      }
      gns = upDown(gns);
      title = t(`Chromatic walk up the neck · from fret ${pos}`, `הליכה כרומטית במעלה הצוואר · מסריג ${pos}`);
      break;
    }
    case 'cross': {
      // "Spider": fingers 1 & 3 on one string, 2 & 4 on the next, across all pairs.
      for (let str = nStr; str >= 2; str--)
        for (const [fg, ss] of [
          [1, str],
          [2, str - 1],
          [3, str],
          [4, str - 1],
        ] as [number, number][])
          gns.push({ s: ss, f: pos + fg - 1, pos, finger: fg });
      gns = upDown(gns);
      title = t(`Spider (two-string crossing) · ${posName}`, `עכביש (מעבר בין שני מיתרים) · סריג ${pos}`);
      break;
    }
    case 'stretch': {
      // 1-2-3-4 on frets p, p+2, p+4, p+5 (Petrucci-style stretch); start high on the neck.
      const p = Math.max(5, pos);
      const off = [0, 2, 4, 5];
      const up: GN[] = [];
      for (let str = nStr; str >= 1; str--) off.forEach((o, i) => up.push({ s: str, f: p + o, pos: p, finger: i + 1 }));
      gns = upDown(up);
      title = t(`Finger stretch 1-3-5-6 · fret ${p}`, `מתיחת אצבעות 1-3-5-6 · סריג ${p}`);
      break;
    }
    default:
      throw new Error(`Unknown fretting kind ${s.kind}`);
  }
  return finish(s, tu, seqEv(alt(gns), 1 / pb), { title: t(`${title.en} · ${pbName(pb)}`, `${title.he} · ${pbNameHe(pb)}`), bpm: bpmAt(2, pb) });
}

// ───────────────────────────── P: picking ─────────────────────────────

function genPicking(s: DrillSpec, tu: Tuning): Drill {
  const pb = s.perBeat ?? 2;
  const key = mod(s.key, 12);
  let gns: GN[] = [];
  let title: T2;
  let bpm = bpmAt(2, pb);
  switch (s.kind) {
    case 'single-string': {
      const p = lowFret1(tu, key, 1);
      const frets = upDown([0, 1, 2, 3].map((x) => p + x));
      for (const f of frets) for (let r = 0; r < 2; r++) gns.push({ s: s.option ?? 1, f, pos: p, finger: f - p + 1 });
      gns = alt(gns);
      title = t(`Alternate picking, one string · fret ${p}`, `פריטה מתחלפת, מיתר אחד · סריג ${p}`);
      break;
    }
    case 'cross': {
      // Two-string crossings: outside (option 0) or inside (option 1) picking.
      const p = lowFret1(tu, key, 2);
      const out = (s.option ?? 0) === 0;
      for (let rep = 0; rep < 4; rep++)
        for (const [ss, o] of [
          [2, 2],
          [1, 0],
          [2, 0],
          [1, 2],
        ] as [number, number][])
          gns.push({ s: ss, f: p + o, pos: p });
      gns = alt(gns, out ? 'D' : 'U');
      title = out ? t(`String crossing (outside picking) · fret ${p}`, `מעבר מיתרים (פריטה חיצונית) · סריג ${p}`) : t(`String crossing (inside picking) · fret ${p}`, `מעבר מיתרים (פריטה פנימית) · סריג ${p}`);
      break;
    }
    case '3nps':
    case '3nps-economy': {
      const pat = threeNpsPattern(tu, key, MAJOR, (s.option ?? 0) % 7);
      const up: GN[] = [];
      for (let i = 0; i < pat.length; i += 3) {
        const fs = pat.slice(i, i + 3).map((x) => x.f);
        const fg = npsFingers(fs);
        pat.slice(i, i + 3).forEach((x, k) => up.push({ ...x, pos: fs[0], finger: fg[k] }));
      }
      gns = upDown(up);
      if (s.kind === '3nps') gns = alt(gns);
      else {
        // Economy: alternate inside a string, sweep (same direction) across a string change.
        let dir: Stroke = 'D';
        gns = gns.map((g, i) => {
          if (i > 0 && g.s !== gns[i - 1].s) dir = g.s < gns[i - 1].s ? 'D' : 'U';
          else if (i > 0) dir = dir === 'D' ? 'U' : 'D';
          return { ...g, stroke: dir };
        });
      }
      title = t(
        `${s.kind === '3nps' ? 'Alternate' : 'Economy'} picking, 3 notes per string · pattern ${(s.option ?? 0) + 1}`,
        `${s.kind === '3nps' ? 'פריטה מתחלפת' : 'פריטה חסכונית'}, 3 צלילים במיתר · תבנית ${(s.option ?? 0) + 1}`,
      );
      title = t(`${title.en} · ${NAMES[key]}`, `${title.he} · ${NAMES[key]}`);
      bpm = bpmAt(2.5, pb);
      break;
    }
    case 'skip': {
      if (s.option === 1) {
        // Octaves on skipped strings (6&4, 5&3): each major-scale note, then its octave two strings up.
        const r0 = lowFret1(tu, key, 6);
        const low = windowScale(tu, key, MAJOR, r0, r0 + 3, [6, 5]);
        const up: GN[] = low.flatMap((x) => {
          const o = place(tu, noteAt(tu, x.s, x.f) + 12, [x.s - 2], 0, 17);
          return o ? [{ ...x }, { ...o }] : [];
        });
        gns = alt(upDown(up));
        title = t(`String skipping in octaves (6&4, 5&3) · ${NAMES[key]}`, `דילוג מיתרים באוקטבות (6 ו-4, 5 ו-3) · ${NAMES[key]}`);
        break;
      }
      // String skipping through the minor-pentatonic box 1: strings 6&4, 5&3, 4&2, 3&1.
      const r = lowFret1(tu, key, 6);
      const box = windowScale(tu, key, SCALES.pentaMinor, r, r + 3);
      const by = (str: number) => box.filter((x) => x.s === str);
      const order = [6, 4, 5, 3, 4, 2, 3, 1];
      const up: GN[] = order.flatMap((str) => by(str).map((x) => ({ ...x })));
      gns = alt(upDown(up));
      title = t(`String skipping, pentatonic box 1 · ${NAMES[key]}m`, `דילוג מיתרים, פנטטוני תיבה 1 · ${NAMES[key]}m`);
      break;
    }
    case 'pedal': {
      // Pedal-point picking (Petrucci / Gilbert, Bach-style): the tonic on the 1st string alternates with a major-scale
      // line on the 2nd string climbing and falling inside one position — alternate picking across two strings.
      const p = lowFret1(tu, key, 1);
      const lo = Math.max(1, p - 1);
      const pedal: GN = { s: 1, f: p };
      const top = noteAt(tu, 1, p);
      const mel = windowScale(tu, key, MAJOR, lo, lo + 4, [3, 2])
        .filter((x) => noteAt(tu, x.s, x.f) < top)
        .slice(-5);
      for (const m of [...upDown(mel), ...upDown(mel)]) gns.push({ ...m }, { ...pedal });
      gns = alt(gns);
      title = t(`Pedal-point picking (tonic on the 1st string over a line on strings 3–2) · ${NAMES[key]}`, `פריטת צליל עוגב (הטוניקה על מיתר 1 מעל קו במיתרים 3–2) · ${NAMES[key]}`);
      break;
    }
    case 'tremolo': {
      // Tremolo picking: each melody note ×4 on the 2nd string (16ths).
      const r = lowFret1(tu, key, 2);
      const op = s.option ?? 0;
      if (op === 1 || op === 2) {
        // 1: across strings 3-2-1 (major scale, ×4 in 16ths); 2: phrygian dominant on strings 2-1, ×3 in triplets (surf style).
        const reps = op === 2 ? 3 : 4;
        const r3 = lowFret1(tu, key, 3);
        const PD = [0, 1, 4, 5, 7, 8, 10];
        const mel = op === 1 ? windowScale(tu, key, MAJOR, r3, r3 + 3, [3, 2, 1]).slice(0, 8) : windowScale(tu, key, PD, r, r + 3, [2]).concat(windowScale(tu, key, PD, r, r + 3, [1])).slice(0, 7);
        for (const m of upDown(mel)) for (let i = 0; i < reps; i++) gns.push({ ...m, stroke: i % 2 ? 'U' : 'D' });
        title = op === 1 ? t(`Tremolo picking across strings 3-2-1 · ${NAMES[key]}`, `פריטת טרמולו על מיתרים 3-2-1 · ${NAMES[key]}`) : t(`Tremolo picking in triplets, phrygian dominant · ${NAMES[key]}`, `פריטת טרמולו בטריולות, פריגי דומיננטי · ${NAMES[key]}`);
        return finish(s, tu, seqEv(gns, 1 / reps), { title, bpm: bpmAt(4, reps) });
      }
      const mel = windowScale(tu, key, MAJOR, r, r + 4, [2]).slice(0, 3).concat(windowScale(tu, key, MAJOR, r, r + 4, [1]).slice(0, 2));
      for (const m of upDown(mel)) for (let i = 0; i < 4; i++) gns.push({ ...m, stroke: i % 2 ? 'U' : 'D' });
      title = t(`Tremolo picking (each note ×4) · ${NAMES[key]}`, `פריטת טרמולו (כל צליל ×4) · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / 4), { title, bpm: bpmAt(4, 4) });
    }
    case 'sweep3': {
      // 3-string sweep of the I, IV, V triads on strings 3-2-1 (D D D U).
      const chords = [0, 5, 7, 0].map((d) => mod(key + d, 12));
      let prev = 5;
      for (const [ci, root] of chords.entries()) {
        const pcs = [root, root + (s.minor && ci !== 2 ? 3 : 4), root + 7];
        const vs = top3Triads(tu, pcs, prev);
        prev = vs[0].f;
        for (let k = 0; k < 2; k++) gns.push({ ...vs[0], stroke: 'D' }, { ...vs[1], stroke: 'D' }, { ...vs[2], stroke: 'D' }, { ...vs[1], stroke: 'U' });
      }
      title = s.minor ? t(`Sweep picking, 3-string triads i–iv–V · ${NAMES[key]}m`, `סוויפ, משולשים על 3 מיתרים i–iv–V · ${NAMES[key]}m`) : t(`Sweep picking, 3-string triads I–IV–V · ${NAMES[key]}`, `סוויפ, משולשים על 3 מיתרים I–IV–V · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / 4), { title, bpm: bpmAt(2.5, 4) });
    }
    case 'sweep5': {
      // 5-string A-shape major arpeggio, up and down (sextuplet feel → triplets here).
      const rf = lowFret1(tu, key, 5);
      const ints = s.minor ? [0, 7, 12, 15, 19] : [0, 7, 12, 16, 19];
      const notes = ints.map((iv) => place(tu, noteAt(tu, 5, rf) + iv, [5, 4, 3, 2, 1], Math.max(0, rf - 1), rf + 4)!);
      const up = notes.map((x) => ({ ...x, stroke: 'D' as Stroke }));
      const down = notes
        .slice(0, -1)
        .reverse()
        .map((x) => ({ ...x, stroke: 'U' as Stroke }));
      for (let k = 0; k < 2; k++) gns.push(...up, ...down);
      title = t(`Sweep picking, 5-string arpeggio · ${kn(s)}`, `סוויפ, ארפג׳יו על 5 מיתרים · ${kn(s)}`);
      const pb3 = 3;
      return finish(s, tu, seqEv(gns, 1 / pb3), { title, bpm: bpmAt(2.5, pb3) });
    }
    case 'hybrid': {
      // Hybrid picking: pick on the bass, middle / ring fingers on the treble (country roll) over I–IV–V–I.
      for (const d of [0, 5, 7, 0]) {
        const sh = chordShape(key + d, 'M', false);
        const bass = sh.dots.reduce((a, b) => (b.s > a.s ? b : a));
        const top = (str: number) => sh.dots.find((x) => x.s === str) ?? sh.dots[sh.dots.length - 1];
        for (let k = 0; k < 2; k++) gns.push({ ...bass, stroke: 'D' }, { ...top(2), stroke: 'm' }, { ...top(3), stroke: 'D' }, { ...top(1), stroke: 'a' });
      }
      title = t(`Hybrid picking roll (pick + m + a) · ${NAMES[key]}`, `פריטה היברידית (מפרט + m + a) · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / pb), { title, bpm: bpmAt(2, pb) });
    }
    case 'banjo': {
      // Forward roll (banjo style) with hybrid picking: pick on string 3, m on 2, a on 1, over I–IV–V–I.
      for (const d of [0, 5, 7, 0]) {
        const sh = chordShape(key + d, 'M', false);
        const on = (str: number) => sh.dots.find((x) => x.s === str) ?? sh.dots[sh.dots.length - 1];
        const roll: [number, Stroke][] = [
          [3, 'D'],
          [2, 'm'],
          [1, 'a'],
          [3, 'D'],
          [2, 'm'],
          [1, 'a'],
          [3, 'D'],
          [1, 'a'],
        ];
        for (const [str, st] of roll) gns.push({ ...on(str), stroke: st });
      }
      title = t(`Forward roll, banjo style (pick + m + a) · ${NAMES[key]}`, `רול קדימה בסגנון בנג׳ו (מפרט + m + a) · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / pb), { title, bpm: bpmAt(2.5, pb) });
    }
    case 'chicken': {
      // Chicken picking: picked note + snapped (muted) middle-finger note on the next string, a major-pentatonic climb.
      const r = lowFret1(tu, key, 3);
      const mel = windowScale(tu, key, SCALES.pentaMajor, r, r + 3, [3, 2]);
      for (const m of mel) gns.push({ ...m, stroke: 'D' }, { s: m.s - 1 >= 1 ? m.s - 1 : 1, f: m.f, tech: 'mute', stroke: 'm' });
      title = t(`Chicken picking (pick + snapped muted note) · ${NAMES[key]}`, `צ׳יקן פיקינג (מפרט + צליל מושתק) · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / 4), { title, bpm: bpmAt(2, 4) });
    }
    default:
      throw new Error(`Unknown picking kind ${s.kind}`);
  }
  return finish(s, tu, seqEv(gns, 1 / pb), { title: t(`${title.en} · ${pbName(pb)}`, `${title.he} · ${pbNameHe(pb)}`), bpm });
}

/** Three close triads on strings 3-2-1 (string 3 first), the one nearest `near`. */
function top3Triads(tu: Tuning, pcs: number[], near: number): { s: number; f: number }[] {
  const want = new Set(pcs.map((p) => mod(p, 12)));
  let best: { s: number; f: number }[] | null = null;
  let bestD = Infinity;
  for (let a = 0; a <= 14; a++)
    for (let b = 0; b <= 14; b++)
      for (let c = 0; c <= 14; c++) {
        const ms = [noteAt(tu, 3, a), noteAt(tu, 2, b), noteAt(tu, 1, c)];
        if (new Set(ms.map((m) => mod(m, 12))).size !== 3 || !ms.every((m) => want.has(mod(m, 12)))) continue;
        if (Math.max(a, b, c) - Math.min(a, b, c) > 3 || Math.min(a, b, c) < 1) continue;
        const d = Math.abs(a - near);
        if (d < bestD) {
          bestD = d;
          best = [
            { s: 3, f: a },
            { s: 2, f: b },
            { s: 1, f: c },
          ];
        }
      }
  return best!;
}

// ───────────────────────────── L: legato ─────────────────────────────

const PAIRS: [number, number][] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
];

function genLegato(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const nStr = tu.open.length;
  const pos = lowFret1(tu, key, nStr);
  const pb = s.perBeat ?? 2;
  let gns: GN[] = [];
  let title: T2;
  let bpm = bpmAt(2, pb);
  switch (s.kind) {
    case 'hammer':
    case 'pull': {
      const [a, b] = PAIRS[(s.option ?? 0) % 6];
      const ham = s.kind === 'hammer';
      const pair = (str: number): GN[] => {
        const lo: GN = { s: str, f: pos + a - 1, pos, finger: a };
        const hi: GN = { s: str, f: pos + b - 1, pos, finger: b };
        return ham ? [{ ...lo, tech: 'pick', stroke: 'D' }, { ...hi, tech: 'hammer' }] : [{ ...hi, tech: 'pick', stroke: 'D' }, { ...lo, tech: 'pull' }];
      };
      // Up the strings and back; each pair keeps its direction.
      for (let str = nStr; str >= 1; str--) gns.push(...pair(str));
      for (let str = 2; str <= nStr; str++) gns.push(...pair(str));
      title = ham ? t(`Hammer-ons, fingers ${a}-${b} · fret ${pos}`, `הקשות (האמר-און), אצבעות ${a}-${b} · סריג ${pos}`) : t(`Pull-offs, fingers ${b}-${a} · fret ${pos}`, `משיכות (פול-אוף), אצבעות ${b}-${a} · סריג ${pos}`);
      break;
    }
    case 'trill': {
      const [a, b] = PAIRS[(s.option ?? 0) % 6];
      const str = 3;
      const p = lowFret1(tu, key, str);
      for (let i = 0; i < 16; i++) {
        const up = i % 2 === 1;
        gns.push({ s: str, f: p + (up ? b : a) - 1, pos: p, finger: up ? b : a, tech: i === 0 ? 'pick' : up ? 'hammer' : 'pull' });
      }
      title = t(`Trill, fingers ${a}-${b} (hammer / pull) · 3rd string`, `טריל, אצבעות ${a}-${b} (הקשה / משיכה) · מיתר 3`);
      return finish(s, tu, seqEv(gns, 1 / 4), { title, bpm: bpmAt(3, 4) });
    }
    case 'penta-legato': {
      const r = lowFret1(tu, key, nStr);
      const box = windowScale(tu, key, SCALES.pentaMinor, r, r + 3);
      const up = box.map((x, i) => ({ ...x, tech: (i > 0 && box[i - 1].s === x.s ? 'hammer' : 'pick') as GuitarTechnique }));
      const rev = box.slice(0, -1).reverse();
      const down = rev.map((x, i) => {
        const prev = i === 0 ? box[box.length - 1] : rev[i - 1];
        return { ...x, tech: (prev.s === x.s ? 'pull' : 'pick') as GuitarTechnique };
      });
      gns = [...up, ...down];
      title = t(`Legato pentatonic box 1 (pick once per string) · ${NAMES[key]}m`, `לגאטו פנטטוני תיבה 1 (פריטה אחת במיתר) · ${NAMES[key]}m`);
      bpm = bpmAt(2.5, pb);
      break;
    }
    case '3nps-legato': {
      const pat = threeNpsPattern(tu, key, MAJOR, (s.option ?? 0) % 7);
      const up: GN[] = [];
      for (let i = 0; i < pat.length; i += 3) {
        const fs = pat.slice(i, i + 3).map((x) => x.f);
        const fg = npsFingers(fs);
        pat.slice(i, i + 3).forEach((x, k) => up.push({ ...x, pos: fs[0], finger: fg[k], tech: k === 0 ? 'pick' : 'hammer' }));
      }
      const down: GN[] = [];
      for (let i = pat.length - 3; i >= 0; i -= 3) {
        const grp = up.slice(i, i + 3).reverse();
        grp.forEach((g, k) => down.push({ ...g, tech: k === 0 ? 'pick' : 'pull' }));
      }
      gns = [...up, ...down.slice(1)];
      title = t(`Legato 3 notes per string · pattern ${(s.option ?? 0) + 1} · ${NAMES[key]}`, `לגאטו 3 צלילים במיתר · תבנית ${(s.option ?? 0) + 1} · ${NAMES[key]}`);
      bpm = bpmAt(3, 3);
      return finish(s, tu, seqEv(gns, 1 / 3), { title, bpm });
    }
    case 'tap': {
      // Two-hand tapping triplets on the 1st string: tap the 5th, pull to the root, hammer the 3rd.
      const r = lowFret1(tu, key, 1);
      const third = s.minor ? 3 : 4;
      for (let k = 0; k < 8; k++)
        gns.push({ s: 1, f: r + 7, tech: 'tap' }, { s: 1, f: r, pos: r, finger: 1, tech: 'pull' }, { s: 1, f: r + third, pos: r, finger: third === 3 ? 4 : 4, tech: 'hammer' });
      title = t(`Two-hand tapping triplets · ${kn(s)}`, `טאפינג בשתי ידיים, טריולות · ${kn(s)}`);
      return finish(s, tu, seqEv(gns, 1 / 3), { title, bpm: bpmAt(3, 3) });
    }
    case 'tap-arp': {
      // Tapped arpeggios through I–vi–IV–V on the 1st string: tap (5th, then octave), pull to the root, hammer the 3rd.
      const prog: [number, boolean][] = [
        [0, false],
        [9, true],
        [5, false],
        [7, false],
      ];
      for (const [d, minor] of prog) {
        const r = lowFret1(tu, key + d, 1);
        const third = minor ? 3 : 4;
        for (let k = 0; k < 4; k++)
          gns.push({ s: 1, f: r + (k % 2 === 0 ? 7 : 12), tech: 'tap' }, { s: 1, f: r, pos: r, finger: 1, tech: 'pull' }, { s: 1, f: r + third, pos: r, finger: third === 3 ? 3 : 4, tech: 'hammer' });
      }
      title = t(`Tapped arpeggios I–vi–IV–V · ${NAMES[key]}`, `ארפג׳יו בטאפינג I–vi–IV–V · ${NAMES[key]}`);
      return finish(s, tu, seqEv(gns, 1 / 3), { title, bpm: bpmAt(3, 3) });
    }
    default:
      throw new Error(`Unknown legato kind ${s.kind}`);
  }
  return finish(s, tu, seqEv(gns, 1 / pb), { title: t(`${title.en} · ${pbName(pb)}`, `${title.he} · ${pbNameHe(pb)}`), bpm });
}

// ───────────────────────────── S: scales ─────────────────────────────

/** CAGED major-scale windows: fret offsets from the tonic on string 6 (E, D, C, A, G shapes). */
const CAGED_OFF = [-1, 1, 4, 6, 9];
const CAGED_NAMES = ['E', 'D', 'C', 'A', 'G'];

function cagedWindow(tu: Tuning, key: number, shape: number): [number, number] {
  const lo = mod(lowFret(tu, key, tu.open.length) + CAGED_OFF[shape % 5], 12);
  return [lo, lo + 4];
}

function genScales(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const pb = s.perBeat ?? 2;
  let line: GN[] = [];
  let title: T2;
  let bpm = bpmAt(2, pb);
  let stretch = false;
  let modeSig: string | undefined;
  switch (s.kind) {
    case 'penta': {
      const box = (s.position ?? 1) - 1;
      const tonic = s.minor === false ? mod(key + 9, 12) : key; // major pentatonic = the relative minor's boxes
      const r = lowFret(tu, tonic, 6);
      const offs: [number, number][][] = [
        [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
        [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
        [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]],
        [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]],
        [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]],
      ];
      let ps = offs[box].flatMap((fs, i) => fs.map((f) => ({ s: 6 - i, f: r + f })));
      if (Math.max(...ps.map((p) => p.f)) > 15) ps = ps.map((p) => ({ s: p.s, f: p.f - 12 }));
      line = upDown(ps);
      const nm = s.minor === false ? `${NAMES[key]} major` : `${NAMES[key]}m`;
      title = t(`Pentatonic box ${box + 1} · ${nm}`, `פנטטוני תיבה ${box + 1} · ${nm}`);
      break;
    }
    case 'blues': {
      const r = lowFret(tu, key, 6);
      line = upDown(windowScale(tu, key, SCALES.blues, r, r + 3));
      title = t(`Blues scale, box 1 · ${NAMES[key]}`, `סולם בלוז, תיבה 1 · ${NAMES[key]}`);
      break;
    }
    case 'caged': {
      const [lo, hi] = cagedWindow(tu, key, s.position ?? 0);
      line = upDown(windowScale(tu, key, MAJOR, lo, hi));
      title = t(`Major scale, ${CAGED_NAMES[(s.position ?? 0) % 5]}-shape position · ${NAMES[key]}`, `סולם מז׳ור, מצב צורת ${CAGED_NAMES[(s.position ?? 0) % 5]} · ${NAMES[key]}`);
      break;
    }
    case '3nps': {
      const pat = threeNpsPattern(tu, key, MAJOR, (s.position ?? 0) % 7);
      const up: GN[] = [];
      for (let i = 0; i < pat.length; i += 3) {
        const fs = pat.slice(i, i + 3).map((x) => x.f);
        const fg = npsFingers(fs);
        pat.slice(i, i + 3).forEach((x, k) => up.push({ ...x, pos: fs[0], finger: fg[k] }));
      }
      line = upDown(up);
      stretch = true;
      title = t(`3 notes per string, pattern ${(s.position ?? 0) + 1} · ${NAMES[key]}`, `3 צלילים במיתר, תבנית ${(s.position ?? 0) + 1} · ${NAMES[key]}`);
      bpm = bpmAt(2.5, pb);
      break;
    }
    case 'mode': {
      // 0–6 the modes of the major scale, 7 harmonic minor, 8 melodic minor, 9 whole-tone, 10 diminished (half–whole),
      // 11 altered (the 7th mode of melodic minor) — the Rockschool grade 6–8 scales.
      const m = (s.option ?? 1) % 12;
      const ints = m < 7 ? modeInts(m) : [SCALES.harmonic, SCALES.melodic, [0, 2, 4, 6, 8, 10], [0, 1, 3, 4, 6, 7, 9, 10], [0, 1, 3, 4, 6, 8, 10]][m - 7];
      const lo = mod(lowFret(tu, key, 6) - 1, 12);
      line = upDown(windowScale(tu, key, ints, lo, lo + 4));
      const nm =
        m < 7
          ? MODE_T[m]
          : [t('harmonic minor', 'מינור הרמוני'), t('melodic minor', 'מינור מלודי'), t('whole-tone scale', 'סולם טונים שלמים'), t('diminished scale (half–whole)', 'סולם מוקטן (חצי–שלם)'), t('altered scale', 'סולם אלטרד')][m - 7];
      title = t(`${NAMES[key]} ${nm.en} in position`, `${NAMES[key]} ${nm.he} במצב`);
      // Key signature of the parent major scale (D Dorian → C: none; C Dorian → B♭: two flats); minors: the relative major.
      modeSig = m < 7 ? SIG[mod(key - MAJOR[m], 12)] : m < 9 ? SIG[mod(key + 3, 12)] : SIG[key];
      break;
    }
    case 'one-string': {
      // Goodrick "unitar": one octave of the major scale on one string, up and down (shifting).
      const str = s.position ?? 3;
      const r = lowFret1(tu, key, str);
      const fs = MAJOR.concat(12).map((i) => r + i);
      line = upDown(fs.map((f, i) => ({ s: str, f, pos: i % 2 === 0 ? f : fs[i - 1] })));
      line = line.map((g) => ({ ...g, finger: g.f - g.pos! + 1 }));
      title = t(`One-string major scale (string ${str}) · ${NAMES[key]}`, `סולם מז׳ור על מיתר אחד (מיתר ${str}) · ${NAMES[key]}`);
      break;
    }
    case 'seq3':
    case 'seq-g3':
    case 'seq4': {
      const [lo, hi] = cagedWindow(tu, key, s.position ?? 0);
      const L = windowScale(tu, key, MAJOR, lo, hi);
      const out: { s: number; f: number }[] = [];
      if (s.kind === 'seq3') {
        for (let i = 0; i + 2 < L.length; i++) out.push(L[i], L[i + 2]);
        for (let i = L.length - 1; i - 2 >= 0; i--) out.push(L[i], L[i - 2]);
      } else if (s.kind === 'seq-g3') {
        for (let i = 0; i + 2 < L.length; i++) out.push(L[i], L[i + 1], L[i + 2]);
        for (let i = L.length - 1; i - 2 >= 0; i--) out.push(L[i], L[i - 1], L[i - 2]);
      } else {
        for (let i = 0; i + 3 < L.length; i++) out.push(L[i], L[i + 1], L[i + 2], L[i + 3]);
        for (let i = L.length - 1; i - 3 >= 0; i--) out.push(L[i], L[i - 1], L[i - 2], L[i - 3]);
      }
      line = out;
      const sq = s.kind === 'seq3' ? t('In 3rds', 'בטרצות') : s.kind === 'seq-g3' ? t('Groups of 3', 'קבוצות של 3') : t('Groups of 4', 'קבוצות של 4');
      title = t(`${sq.en}, ${CAGED_NAMES[(s.position ?? 0) % 5]}-shape · ${NAMES[key]}`, `${sq.he}, צורת ${CAGED_NAMES[(s.position ?? 0) % 5]} · ${NAMES[key]}`);
      break;
    }
    default:
      throw new Error(`Unknown scale kind ${s.kind}`);
  }
  const sp = stretch && !s.stretch ? { ...s, stretch: true } : s;
  return finish(sp, tu, seqEv(alt(line), 1 / pb), { title: t(`${title.en} · ${pbName(pb)}`, `${title.he} · ${pbNameHe(pb)}`), bpm, keySig: modeSig ?? SIG[s.minor ? mod(key + 3, 12) : key] });
}

// ───────────────────────────── A: arpeggios ─────────────────────────────

const SEV_KINDS: { q: Q | 'm7b5' | 'dim7' | 'alt'; ints: number[]; name: string }[] = [
  { q: 'maj7', ints: [0, 4, 7, 11], name: 'maj7' },
  { q: '7', ints: [0, 4, 7, 10], name: '7' },
  { q: 'm7', ints: [0, 3, 7, 10], name: 'm7' },
  { q: 'm7b5', ints: [0, 3, 6, 10], name: 'm7♭5' },
  { q: 'dim7', ints: [0, 3, 6, 9], name: '°7' },
  // Altered dominants (Rockschool grade 8): 7♯5, 7♭5, 7♭9, 7♯9 — the 9th chords are one octave R-3-5-♭7-9 and back.
  { q: 'alt', ints: [0, 4, 8, 10], name: '7♯5' },
  { q: 'alt', ints: [0, 4, 6, 10], name: '7♭5' },
  { q: 'alt', ints: [0, 4, 7, 10, 13], name: '7♭9' },
  { q: 'alt', ints: [0, 4, 7, 10, 15], name: '7♯9' },
];

/** A two-octave (or as far as it fits) arpeggio under the hand: root on rootStr, frets root−1 … root+4. */
function arpUnderHand(tu: Tuning, root: number, ints: number[], rootStr: number): { s: number; f: number }[] {
  const rf = lowFret1(tu, root, rootStr);
  const R = noteAt(tu, rootStr, rf);
  const out: { s: number; f: number }[] = [];
  let cur = rootStr;
  for (let oct = 0; oct < 3; oct++)
    for (const iv of ints) {
      const m = R + 12 * oct + iv;
      let placed: { s: number; f: number } | null = null;
      for (let st = cur; st >= 1 && !placed; st--) {
        const f = m - tu.open[st - 1];
        if (f >= Math.max(0, rf - 1) && f <= rf + 3) placed = { s: st, f };
      }
      if (!placed) return out;
      out.push(placed);
      cur = placed.s;
    }
  return out;
}

function genArps(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const pb = s.perBeat ?? 2;
  let line: { s: number; f: number; ct?: boolean }[] = [];
  let title: T2;
  let unit = 1 / pb;
  switch (s.kind) {
    case 'triad': {
      const rs = s.position === 5 ? 5 : 6;
      line = upDown(arpUnderHand(tu, key, s.minor ? [0, 3, 7] : [0, 4, 7], rs));
      title = t(`Triad arpeggio, root on string ${rs} · ${kn(s)}`, `ארפג׳יו משולש, יסוד על מיתר ${rs} · ${kn(s)}`);
      break;
    }
    case 'caged-arp': {
      const [lo, hi] = cagedWindow(tu, key, s.position ?? 0);
      line = upDown(windowScale(tu, key, s.minor ? [0, 3, 7] : [0, 4, 7], lo, hi));
      title = t(`Triad arpeggio, ${CAGED_NAMES[(s.position ?? 0) % 5]} shape · ${kn(s)}`, `ארפג׳יו משולש, צורת ${CAGED_NAMES[(s.position ?? 0) % 5]} · ${kn(s)}`);
      break;
    }
    case 'inversions': {
      // Close triads on one string set climbing through the inversions (8th-note triplets).
      const sets = [
        [3, 2, 1],
        [4, 3, 2],
        [5, 4, 3],
        [6, 5, 4],
      ];
      const strs = sets[(s.position ?? 0) % 4];
      const pcs = s.minor ? [key, key + 3, key + 7] : [key, key + 4, key + 7];
      const vs = triadsOnSet(tu, pcs, strs).slice(0, 4);
      for (const v of vs) line.push(...v);
      line = upDown(line);
      unit = 1 / 3;
      title = t(`Triad inversions on strings ${strs.join('-')} · ${kn(s)}`, `היפוכי משולש על מיתרים ${strs.join('-')} · ${kn(s)}`);
      break;
    }
    case 'seventh': {
      const k = SEV_KINDS[(s.option ?? 0) % SEV_KINDS.length];
      const rs = s.position === 5 ? 5 : 6;
      const under = arpUnderHand(tu, key, k.ints, rs);
      line = upDown(k.ints.length > 4 ? under.slice(0, k.ints.length) : under);
      title = t(`${NAMES[key]}${k.name} arpeggio, root on string ${rs}`, `ארפג׳יו ${NAMES[key]}${k.name}, יסוד על מיתר ${rs}`);
      break;
    }
    case 'iivi-arp': {
      // ii–V–I arpeggios inside one position (Jens Larsen-style): 8 chord tones per chord, climbing from the lowest.
      const [lo, hi] = cagedWindow(tu, key, 0);
      const chords: [number, number[]][] = [
        [key + 2, [0, 3, 7, 10]],
        [key + 7, [0, 4, 7, 10]],
        [key, [0, 4, 7, 11]],
      ];
      for (const [root, ints] of chords) {
        const tones = windowScale(tu, mod(root, 12), ints, lo, hi).slice(0, 8);
        line.push(...tones.map((x) => ({ ...x, ct: true })));
      }
      title = t(`ii–V–I arpeggios in one position · ${NAMES[key]}`, `ארפג׳יו ii–V–I במצב אחד · ${NAMES[key]}`);
      break;
    }
    default:
      throw new Error(`Unknown arpeggio kind ${s.kind}`);
  }
  const gns = alt(line.map((x) => ({ ...x })));
  const per = Math.round(1 / unit);
  return finish(s, tu, seqEv(gns, unit), {
    title: t(`${title.en} · ${pbName(per)}`, `${title.he} · ${pbNameHe(per)}`),
    bpm: bpmAt(per === 3 ? 2.5 : 2, per),
  });
}

/** Close triads (one note per string, every tone once) on a string set given low → high, by fret. */
function triadsOnSet(tu: Tuning, pcs: number[], strsHighFirst: number[]): { s: number; f: number }[][] {
  const strs = strsHighFirst.slice().sort((a, b) => b - a);
  const want = new Set(pcs.map((p) => mod(p, 12)));
  const out: { s: number; f: number }[][] = [];
  for (let a = 1; a <= 15; a++)
    for (let b = 1; b <= 15; b++)
      for (let c = 1; c <= 15; c++) {
        const fr = [a, b, c];
        const ms = strs.map((st, i) => noteAt(tu, st, fr[i]));
        if (!ms.every((m, i) => i === 0 || m > ms[i - 1]) || ms[2] - ms[0] >= 12) continue;
        if (new Set(ms.map((m) => mod(m, 12))).size !== 3 || !ms.every((m) => want.has(mod(m, 12)))) continue;
        if (Math.max(...fr) - Math.min(...fr) > 3) continue;
        out.push(strs.map((st, i) => ({ s: st, f: fr[i] })));
      }
  return out.sort((x, y) => Math.min(...x.map((p) => p.f)) - Math.min(...y.map((p) => p.f)));
}

// ───────────────────────────── C: chords ─────────────────────────────

/** Open-chord checks (index = option). */
export const OPEN_LIST: [number, Q][] = [
  [4, 'M'],
  [9, 'M'],
  [2, 'M'],
  [4, 'm'],
  [9, 'm'],
  [2, 'm'],
  [0, 'M'],
  [7, 'M'],
];
export const SEVENTH_LIST: [number, Q][] = [
  [4, '7'],
  [9, '7'],
  [2, '7'],
  [7, '7'],
  [0, '7'],
  [11, '7'],
  [9, 'm7'],
  [4, 'm7'],
  [2, 'm7'],
  [0, 'maj7'],
  [5, 'maj7'],
];
/** Suspended and add9 open chords (Dsus4, Dsus2, Asus4, Asus2, Esus4, Cadd9): chord-check position 4. */
export const SUS_LIST: [number, Q][] = [
  [2, 'sus4'],
  [2, 'sus2'],
  [9, 'sus4'],
  [9, 'sus2'],
  [4, 'sus4'],
  [0, 'add9'],
];
/** One-minute-change pairs (JustinGuitar order: A–D first). Indexes into OPEN_LIST. */
export const CHANGE_PAIRS: [number, number][] = [
  [1, 2],
  [2, 0],
  [1, 0],
  [4, 3],
  [6, 7],
  [7, 2],
  [6, 4],
  [4, 5],
  [0, 4],
  [7, 3],
];

const strumNotes = (sh: Shape, tech: GuitarTechnique, stroke: Stroke, top = false): GN[] =>
  sh.dots.filter((d) => !top || d.s <= 3).map((d) => ({ s: d.s, f: d.f, finger: d.finger, tech, stroke }));

function chordCheck(sh: Shape): Ev[] {
  const evs: Ev[] = [{ beat: 0, dur: 4, notes: strumNotes(sh, 'strum-down', 'D') }];
  const strs = sh.dots.slice().sort((a, b) => b.s - a.s);
  strs.forEach((d, i) => evs.push({ beat: 4 + i, dur: 1, notes: [{ s: d.s, f: d.f, finger: d.finger, pos: Math.min(...sh.dots.filter((x) => x.f > 0).map((x) => x.f)), stroke: 'D' }] }));
  return evs;
}

function genChords(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  let evs: Ev[] = [];
  let title: T2;
  let bpm = 60;
  let evenness = false;
  switch (s.kind) {
    case 'chord-check': {
      const list = s.position === 7 ? SEVENTH_LIST : s.position === 4 ? SUS_LIST : OPEN_LIST;
      const [r, q] = list[(s.option ?? 0) % list.length];
      const sh = chordShape(r, q);
      evs = chordCheck(sh);
      title = t(`${sh.name}: strum, then every string rings`, `${sh.name}: פריטה, ואז כל מיתר מצלצל`);
      break;
    }
    case 'barre-check': {
      const shape = s.position === 5 ? 'A' : 'E';
      const QS: Q[] = ['7', 'm7', 'maj7'];
      const q: Q = s.option !== undefined ? QS[s.option % 3] : s.minor ? 'm' : 'M';
      const [offs, fing] = shape === 'E' ? E_SHAPE[q]! : A_SHAPE[q];
      const n = lowFret1(tu, key, shape === 'E' ? 6 : 5);
      const sh: Shape = { dots: fromOffsets(n, offs, fing), root: key, name: NAMES[key] + Q_NAME[q] };
      evs = chordCheck(sh);
      title = t(`Barre ${sh.name} (${shape} shape, fret ${n}): every string rings`, `ברה ${sh.name} (צורת ${shape}, סריג ${n}): כל מיתר מצלצל`);
      break;
    }
    case 'song': {
      // A public-domain song's chords (songbook): its real shapes, one down-strum per beat, in the song's key.
      const song = SONGBOOK[(s.option ?? 0) % SONGBOOK.length];
      const QM: Record<string, Q> = { maj: 'M', min: 'm', dim: 'm', dom7: '7', min7: 'm7', maj7: 'maj7' };
      const first = songNotes(song).find((n) => n.semi !== null);
      const pickup = first ? first.at : 0;
      for (const c of songChords(song)) {
        if (c.at + c.beats <= pickup) continue;
        const sh = chordShape(mod(key + c.root, 12), QM[c.quality] ?? 'M');
        const from = Math.max(c.at, pickup);
        for (let b = from; b < c.at + c.beats - 1e-6; b += 1) evs.push({ beat: b - pickup, dur: 1, notes: strumNotes(sh, 'strum-down', 'D', b === from) });
      }
      evenness = true;
      bpm = song.level <= 2 ? 72 : 80;
      title = t(`${song.title.en} · chords`, `${song.title.he} · אקורדים`);
      break;
    }
    case 'one-minute': {
      const [a, b] = CHANGE_PAIRS[(s.option ?? 0) % CHANGE_PAIRS.length];
      const sa = chordShape(...OPEN_LIST[a]);
      const sb = chordShape(...OPEN_LIST[b]);
      const per = s.perBeat ?? 0.25;
      const step = 1 / per;
      const bars = 8;
      for (let bar = 0; bar < bars; bar++) {
        const sh = bar % 2 === 0 ? sa : sb;
        for (let k = 0; k < 4 / step; k++) evs.push({ beat: bar * 4 + k * step, dur: step, notes: strumNotes(sh, 'strum-down', 'D') });
      }
      evenness = true;
      bpm = 60;
      const dens = per === 0.25 ? t('1 strum per bar', 'פריטה אחת לתיבה') : per === 0.5 ? t('2 strums per bar', '2 פריטות לתיבה') : t('4 strums per bar', '4 פריטות לתיבה');
      title = t(`Chord changes ${sa.name} ↔ ${sb.name} · ${dens.en}`, `החלפות ${sa.name} ↔ ${sb.name} · ${dens.he}`);
      break;
    }
    case 'power': {
      // Palm-muted 8th-note power chords, I–♭VII–IV–I (rock).
      const prog = [0, 10, 5, 0];
      for (let bar = 0; bar < 4; bar++) {
        const sh = powerShape(tu, key + prog[bar]);
        for (let k = 0; k < 8; k++) evs.push({ beat: bar * 4 + k / 2, dur: 0.5, notes: sh.map((d) => ({ ...d, tech: 'mute' as GuitarTechnique, stroke: 'D' as Stroke, acc: k === 0 })) });
      }
      evenness = true;
      bpm = bpmAt(2.5, 2);
      title = t(`Palm-muted power chords I–♭VII–IV · ${NAMES[key]}`, `אקורדי פאוור מושתקים I–♭VII–IV · ${NAMES[key]}`);
      break;
    }
    case 'barre-changes': {
      // I (E shape) – IV (A shape) – V (A shape) – I, four strums per bar.
      const n6 = lowFret1(tu, key, 6);
      const mk = (shape: 'E' | 'A', root: number): Shape => {
        const [o, f] = shape === 'E' ? E_SHAPE.M! : A_SHAPE.M;
        return { dots: fromOffsets(lowFret1(tu, root, shape === 'E' ? 6 : 5), o, f), root, name: NAMES[mod(root, 12)] };
      };
      const prog = [mk('E', key), mk('A', key + 5), mk('A', key + 7), mk('E', key)];
      prog.forEach((sh, bar) => {
        for (let k = 0; k < 4; k++) evs.push({ beat: bar * 4 + k, dur: 1, notes: strumNotes(sh, 'strum-down', 'D') });
      });
      evenness = true;
      title = t(`Barre changes I–IV–V–I (E / A shapes, fret ${n6}) · ${NAMES[key]}`, `החלפות ברה I–IV–V–I (צורות E / A, סריג ${n6}) · ${NAMES[key]}`);
      break;
    }
    case 'triad-inv': {
      // Block triads on the top 3 strings through the inversions and back (Rockschool grade 5 style).
      const pcs = s.minor ? [key, key + 3, key + 7] : [key, key + 4, key + 7];
      const vs = triadsOnSet(tu, pcs, [3, 2, 1]).slice(0, 4);
      const seq = upDown(vs);
      seq.forEach((v, i) => evs.push({ beat: i * 2, dur: 2, notes: v.map((x) => ({ ...x, stroke: 'D' as Stroke, tech: 'strum-down' as GuitarTechnique })) }));
      evenness = true;
      title = t(`Triad inversions, top 3 strings · ${kn(s)}`, `היפוכי משולש, 3 המיתרים העליונים · ${kn(s)}`);
      break;
    }
    case 'caged-chords': {
      const shapes: [string, string][] = [
        ['C', 'x32010'],
        ['A', 'x02220'],
        ['G', '320003'],
        ['E', '022100'],
        ['D', 'xx0232'],
      ];
      const roots = [0, 9, 7, 4, 2];
      const list = shapes.map(([nm, sh], i) => {
        let n = mod(key - roots[i], 12);
        if (n === 0 && nm !== 'E') n = 12;
        const dots = parseOpen(sh, 'xxxxxx').map((d) => ({ s: d.s, f: d.f + n }));
        return { nm, dots, low: Math.min(...dots.map((d) => d.f)) };
      });
      list.sort((a, b) => a.low - b.low);
      list.forEach((c, bar) => evs.push({ beat: bar * 4, dur: 4, notes: c.dots.map((d) => ({ ...d, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) }));
      title = t(`CAGED: ${NAMES[key]} major in 5 shapes up the neck`, `CAGED: ${NAMES[key]} מז׳ור ב-5 צורות במעלה הצוואר`);
      break;
    }
    default:
      throw new Error(`Unknown chord kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm, evenness });
}

/** Power chord R-5-8 on the lowest string where it sits at fret 0–9 (drop D: one finger on strings 6-5-4). */
function powerShape(tu: Tuning, root: number): GN[] {
  const r = mod(root, 12);
  if (tu.id === 'drop-d') {
    const f = lowFret(tu, r, 6);
    return [6, 5, 4].map((s) => ({ s, f }));
  }
  const f6 = lowFret(tu, r, 6);
  const f5 = lowFret(tu, r, 5);
  if (f6 <= f5)
    return [
      { s: 6, f: f6 },
      { s: 5, f: f6 + 2 },
      { s: 4, f: f6 + 2 },
    ];
  return [
    { s: 5, f: f5 },
    { s: 4, f: f5 + 2 },
    { s: 3, f: f5 + 2 },
  ];
}

// ───────────────────────────── R: rhythm guitar by genre ─────────────────────────────

type Hit = [number, string, number?]; // [16th position in the pattern, what, duration in 16ths]
interface Groove {
  genre: GuitarStyle;
  en: string;
  he: string;
  /** Pattern over `bars16` sixteenths. D/U chord down/up, d/u dead (muted) strum, M palm-muted chord, B root bass, b alternate bass, C chord without bass, S short shell, 1–6 one picked chord string (1 = the bass, counting up). */
  hits: Hit[];
  len16: number;
  prog: [number, Q][];
  swing?: boolean;
  shells?: boolean;
  tuning?: string;
  /** Beats per bar (default 4; the waltz is 3). */
  meter?: number;
}
const fromString = (pat: string): Hit[] => [...pat].map((c, i) => [i, c] as Hit).filter((h) => h[1] !== '.');
export const GROOVES: Record<string, Groove> = {
  quarters: { genre: 'pop', en: 'Quarter-note downstrokes', he: 'רבעים בפריטה למטה', hits: fromString('D...D...D...D...'), len16: 16, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']] },
  eighths: { genre: 'pop', en: 'Down-up 8ths', he: 'שמיניות למטה-למעלה', hits: fromString('D.U.D.U.D.U.D.U.'), len16: 16, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']] },
  'old-faithful': { genre: 'pop', en: 'D, DU, UDU strum', he: 'פריטה D, DU, UDU', hits: fromString('D...D.U...U.D.U.'), len16: 16, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']] },
  rock8: { genre: 'rock', en: 'Palm-muted downstroke 8ths (punk / rock)', he: 'שמיניות למטה מושתקות (פאנק / רוק)', hits: fromString('M.M.M.M.M.M.M.M.'), len16: 16, prog: [[0, '5'], [10, '5'], [5, '5'], [0, '5']] },
  funk16: { genre: 'funk', en: '16th funk strum with muted ghosts (Nile Rodgers style)', he: 'פאנק בשש-עשריות עם פריטות מושתקות', hits: fromString('DudUduDudUdUduDu'), len16: 16, prog: [[0, '9'], [0, '9'], [5, '9'], [5, '9']] },
  reggae: { genre: 'reggae', en: 'Reggae skank on 2 and 4', he: 'סקאנק רגאיי על 2 ו-4', hits: [[4, 'D', 1], [12, 'D', 1]], len16: 16, prog: [[0, 'M'], [5, 'M'], [0, 'M'], [5, 'M']] },
  ska: { genre: 'reggae', en: 'Ska upstrokes on the off-beats', he: 'סקא: פריטות למעלה על ה"וְ"', hits: [[2, 'U', 1], [6, 'U', 1], [10, 'U', 1], [14, 'U', 1]], len16: 16, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']] },
  'boom-chick': { genre: 'country', en: 'Country boom-chick (bass – strum – alt bass – strum)', he: 'קאנטרי בּוּם-צִ׳יק (בס – פריטה – בס מתחלף – פריטה)', hits: fromString('B...D...b...D...'), len16: 16, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']] },
  bossa: { genre: 'latin', en: 'Bossa nova (thumb bass + chord plucks)', he: 'בוסה נובה (בס באגודל + צביטות אקורד)', hits: [[0, 'B'], [0, 'C'], [6, 'C'], [8, 'b'], [12, 'C'], [16, 'B'], [20, 'C'], [24, 'b'], [26, 'C']], len16: 32, prog: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']], shells: true },
  freddie: { genre: 'jazz', en: 'Four to the bar (Freddie Green), short shells', he: 'ארבע לתיבה (פרדי גרין), קונכיות קצרות', hits: [[0, 'S', 2], [4, 'S', 2], [8, 'S', 2], [12, 'S', 2]], len16: 16, prog: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']], shells: true },
  gallop: { genre: 'metal', en: 'Metal gallop (8th + two 16ths), palm-muted, drop D', he: 'גאלופ מטאל (שמינית + שתי שש-עשריות), מושתק, Drop D', hits: fromString('M.MMM.MMM.MMM.MM'), len16: 16, prog: [[0, '5'], [8, '5'], [10, '5'], [0, '5']], tuning: 'drop-d' },
  shuffle: { genre: 'blues', en: 'Blues shuffle 5–6 (12 bars, swung)', he: 'שאפל בלוז 5–6 (12 תיבות, סווינג)', hits: [], len16: 16, prog: [], swing: true },
  waltz: { genre: 'pop', en: 'Waltz strum in 3/4 (D, DU, DU)', he: 'פריטת ואלס ב-3/4 (D, DU, DU)', hits: fromString('D...D.U.D.U.'), len16: 12, meter: 3, prog: [[0, 'M'], [7, 'M'], [5, 'M'], [0, 'M']] },
  clave: { genre: 'latin', en: 'Son clave 3-2, strummed on the clave hits', he: 'קלאווה 3-2, פריטה על פעמות הקלאווה', hits: [[0, 'D', 2], [6, 'D', 2], [12, 'D', 2], [20, 'D', 2], [24, 'D', 2]], len16: 32, prog: [[0, 'M'], [7, '7'], [7, '7'], [0, 'M']] },
  'arp-pick': { genre: 'pop', en: 'Picked chord arpeggios (ballad, let ring)', he: 'ארפג׳יו אקורדים בפריטה (בלדה, לתת לצלצל)', hits: fromString('1.2.3.4.5.4.3.2.'), len16: 16, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']] },
  'funk-stabs': { genre: 'funk', en: 'Funk 16th chord stabs with ghost strums', he: 'דקירות אקורד פאנק בשש-עשריות עם פריטות רפאים', hits: fromString('d.DU.uD.d.DU.u.U'), len16: 16, prog: [[0, 'm7'], [0, 'm7'], [5, '9'], [5, '9']] },
  chug: { genre: 'metal', en: 'Palm-muted 16th chugs with accented chords (drop D)', he: 'צ׳אגים מושתקים בשש-עשריות עם אקורדים מוטעמים (Drop D)', hits: fromString('DMMMDMMMDMDMDMMM'), len16: 16, prog: [[0, '5'], [0, '5'], [3, '5'], [1, '5']], tuning: 'drop-d' },
};

function genRhythm(s: DrillSpec, tu0: Tuning): Drill {
  const key = mod(s.key, 12);
  const g = GROOVES[s.kind];
  if (!g) throw new Error(`Unknown rhythm kind ${s.kind}`);
  const tu = g.tuning ? tuningById(g.tuning) : tu0;
  const spec: DrillSpec = g.tuning && !s.tuning ? { ...s, tuning: g.tuning } : s;
  const evs: Ev[] = [];
  if (s.kind === 'shuffle') {
    // 12-bar blues, root + 5th / 6th on two strings, swung 8ths.
    const f6 = lowFret(tu, key, 6);
    const f5 = lowFret(tu, key, 5);
    const rs = f6 <= f5 ? 6 : 5;
    const rf = rs === 6 ? f6 : f5;
    const bars = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
    bars.forEach((d, bar) => {
      const str = d === 0 ? rs : rs - 1;
      const f = d === 7 ? rf + 2 : rf;
      for (let k = 0; k < 8; k++) {
        const six = Math.floor(k / 2) % 2 === 1;
        evs.push({ beat: bar * 4 + k / 2, dur: 0.5, notes: [{ s: str, f, stroke: 'D' }, { s: str - 1, f: f + (six ? 4 : 2), stroke: 'D' }] });
      }
    });
    return finish({ ...spec, swing: true }, tu, evs, { title: ttl(g.en, g.he, s), bpm: 80, evenness: true });
  }
  const meter = g.meter ?? 4;
  const bar16 = meter * 4;
  let near = 5;
  for (let rep = 0; rep < g.prog.length; rep += g.len16 / bar16) {
    for (const [p16, what, d16] of g.hits) {
      const bar = rep + Math.floor(p16 / bar16);
      if (bar >= g.prog.length) continue;
      const [deg, q] = g.prog[bar];
      const root = mod(key + deg, 12);
      const beat = rep * meter + p16 / 4;
      const next = g.hits.map((h) => h[0]).filter((x) => x > p16);
      const dur = (d16 ?? (next.length ? Math.min(...next) - p16 : g.len16 - p16)) / 4;
      let notes: GN[] = [];
      if (g.shells) {
        const sh = shell(tu, root, q, bar % 2 === 0 ? 6 : 5, near);
        near = sh[0].f;
        if (what === 'B') notes = [{ ...sh[0], stroke: 'p' }];
        else if (what === 'b') {
          const fifth = place(tu, noteAt(tu, sh[0].s, sh[0].f) + 7, [sh[0].s - 1, sh[0].s], 0, 15) ?? sh[0];
          notes = [{ ...fifth, stroke: 'p' }];
        } else if (what === 'C') notes = sh.slice(1).map((x, i) => ({ ...x, stroke: (['i', 'm'] as Stroke[])[i] }));
        else notes = sh.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke }));
      } else if (q === '5') {
        const sh = powerShape(tu, root);
        notes = sh.map((x) => ({ ...x, tech: (what === 'M' ? 'mute' : 'strum-down') as GuitarTechnique, stroke: 'D' as Stroke }));
      } else {
        const sh = chordShape(root, q);
        const bass = sh.dots.reduce((a, b) => (b.s > a.s ? b : a));
        if (what === 'B') notes = [{ s: bass.s, f: bass.f, finger: bass.finger, stroke: 'p' }];
        else if (what === 'b') {
          const fifth = place(tu, noteAt(tu, bass.s, bass.f) + 7, [bass.s - 1], 0, 5) ?? place(tu, noteAt(tu, bass.s, bass.f) - 5, [bass.s + 1, bass.s], 0, 5) ?? bass;
          notes = [{ s: fifth.s, f: fifth.f, stroke: 'p' }];
        } else if (what === 'D' || what === 'M') notes = strumNotes(sh, what === 'M' ? 'mute' : 'strum-down', 'D', s.kind === 'boom-chick');
        else if (what === 'U') notes = strumNotes(sh, 'strum-up', 'U', true);
        else if (what === 'd') notes = strumNotes(sh, 'dead', 'D');
        else if (what === 'u') notes = strumNotes(sh, 'dead', 'U', true);
        else if (/[1-6]/.test(what)) {
          const low = sh.dots.slice().sort((a, b) => b.s - a.s);
          const d = low[Math.min(low.length - 1, Number(what) - 1)];
          notes = [{ s: d.s, f: d.f, finger: d.finger, stroke: 'D' }];
        }
      }
      evs.push({ beat, dur, notes });
    }
  }
  const name = g.prog.map(([d, q]) => NAMES[mod(key + d, 12)] + Q_NAME[q]).join(' ');
  return finish(spec, tu, evs, { title: t(`${g.en} · ${name}`, `${g.he} · ${name}`), bpm: s.kind === 'funk16' ? 80 : s.kind === 'gallop' || s.kind === 'chug' ? 90 : s.kind === 'freddie' || s.kind === 'bossa' || s.kind === 'clave' ? 100 : 70, evenness: true, keySig: SIG[key], meter });
}

// ───────────────────────────── E: lead techniques ─────────────────────────────

function genLead(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const r = lowFret1(tu, key, 6); // minor-pentatonic box 1 root fret
  const box = windowScale(tu, key, SCALES.pentaMinor, r, r + 3);
  const evs: Ev[] = [];
  let title: T2;
  let beat = 0;
  const push = (dur: number, ...notes: GN[]) => {
    evs.push({ beat, dur, notes });
    beat += dur;
  };
  switch (s.kind) {
    case 'slides': {
      const op = s.option ?? 0;
      if (op === 2) {
        // Slide into each note from one fret below (a grace-note slide), up the pentatonic box and back.
        const tg = upDown(box.filter((x) => x.f - 1 >= 1));
        for (const x of tg) {
          push(0.25, { s: x.s, f: x.f - 1, stroke: 'D' });
          push(1.75, { ...x, tech: 'slide' });
        }
        title = t(`Slide into each note from a fret below · ${NAMES[key]}m box 1`, `החלקה לכל צליל מסריג מתחת · ${NAMES[key]}m תיבה 1`);
        break;
      }
      // Pentatonic notes along one string (3rd, or 2nd for option 1), each reached by a slide with the 3rd finger.
      const str = op === 1 ? 2 : 3;
      const fs = windowScale(tu, key, SCALES.pentaMinor, lowFret1(tu, key, str), lowFret1(tu, key, str) + 12, [str]).map((x) => x.f);
      const line = upDown(fs);
      line.forEach((f, i) => push(1, { s: str, f, pos: Math.max(1, f - 2), finger: clamp(f - Math.max(1, f - 2) + 1, 1, 4), tech: i === 0 ? 'pick' : 'slide' }));
      title = str === 3 ? t(`Slides along the 3rd string (pentatonic) · ${NAMES[key]}m`, `החלקות לאורך מיתר 3 (פנטטוני) · ${NAMES[key]}m`) : t(`Slides along the 2nd string (pentatonic) · ${NAMES[key]}m`, `החלקות לאורך מיתר 2 (פנטטוני) · ${NAMES[key]}m`);
      break;
    }
    case 'harmonics': {
      const op = s.option ?? 0;
      if (op === 2) {
        // Harmonic chords: strings 4-3-2 and 3-2-1 together at frets 12, 7, 5.
        for (const fr of [12, 7, 5])
          for (const set of [
            [4, 3, 2],
            [3, 2, 1],
          ])
            push(2, ...set.map((st) => ({ s: st, f: fr, tech: 'harmonic' as GuitarTechnique, stroke: 'D' as Stroke })));
        title = t('Harmonic chords at frets 12, 7, 5', 'אקורדי הרמוניות בסריגים 12, 7, 5');
      } else {
        const frets = op === 1 ? [4, 9, 7] : [12, 7, 5];
        for (const fr of frets) for (let st = 6; st >= 1; st--) push(1, { s: st, f: fr, tech: 'harmonic' });
        title = op === 1 ? t('Natural harmonics at frets 4, 9, 7', 'הרמוניות טבעיות בסריגים 4, 9, 7') : t('Natural harmonics at frets 12, 7, 5', 'הרמוניות טבעיות בסריגים 12, 7, 5');
      }
      return finish(s, tu, evs, { title, bpm: 60, evenness: true });
    }
    case 'bend': {
      // Fret the target, then bend up to it (½, 1 or 1½ steps), then (option) release.
      const cents = s.option === 1 ? 100 : s.option === 3 ? 300 : 200;
      const steps = cents / 100;
      const release = s.position === 1;
      const targets = box.filter((x) => x.s <= 3 && x.f - steps >= Math.max(1, r - 1));
      for (const tg of targets.slice(0, 4)) {
        push(1, { ...tg, stroke: 'D' });
        const src = { s: tg.s, f: tg.f - steps };
        push(release ? 1 : 2, { ...src, tech: 'bend', bend: cents, finger: 3, pos: Math.max(1, src.f - 2), stroke: 'D' });
        if (release) push(1, { ...src, tech: 'release', bend: cents, finger: 3, pos: Math.max(1, src.f - 2) });
        beat += release ? 1 : 1;
      }
      const nm = cents === 100 ? t('Half-step', 'חצי טון') : cents === 200 ? t('Whole-step', 'טון שלם') : t('1½-step', 'טון וחצי');
      title = t(`${nm.en} bends to pitch${release ? ' and release' : ''} · ${NAMES[key]}m box 1`, `כיפופים של ${nm.he} לגובה${release ? ' ושחרור' : ''} · ${NAMES[key]}m תיבה 1`);
      break;
    }
    case 'prebend': {
      const targets = box.filter((x) => x.s <= 3 && x.f - 2 >= Math.max(1, r - 1)).slice(0, 4);
      for (const tg of targets) {
        const src = { s: tg.s, f: tg.f - 2, finger: 3, pos: Math.max(1, tg.f - 4) };
        push(1, { ...tg, stroke: 'D' });
        push(1, { ...src, tech: 'prebend', bend: 200, stroke: 'D' });
        push(2, { ...src, tech: 'release', bend: 200 });
      }
      title = t(`Pre-bend and release (whole step) · ${NAMES[key]}m box 1`, `כיפוף מוקדם ושחרור (טון) · ${NAMES[key]}m תיבה 1`);
      break;
    }
    case 'unison': {
      // Unison bends (Hendrix / Page): fret a box note on the higher string and bend the lower string a whole step up
      // to the same pitch, both sounding together. Option 0: strings 3 & 2; option 1: strings 2 & 1.
      const hiStr = s.option === 1 ? 1 : 2;
      const gap = tu.open[hiStr - 1] - tu.open[hiStr]; // 4 (G→B) or 5 (B→E)
      const targets = box.filter((x) => x.s === hiStr);
      for (const tg of [...targets, ...targets.slice().reverse()]) {
        const src = { s: hiStr + 1, f: tg.f + gap - 2 };
        const pos = tg.f;
        push(2, { ...tg, pos, finger: 1, stroke: 'D' }, { ...src, pos, finger: 3, tech: 'bend', bend: 200, stroke: 'D' });
        beat += 1;
      }
      title = t(`Unison bends (strings ${hiStr + 1} & ${hiStr}) · ${NAMES[key]}m box 1`, `כיפופי יוניסון (מיתרים ${hiStr + 1} ו-${hiStr}) · ${NAMES[key]}m תיבה 1`);
      break;
    }
    case 'vibrato': {
      const wide = (s.option ?? 0) >= 1;
      const targets = box.filter((x) => x.s <= 3).slice(0, 6);
      for (const tg of targets) push(2, { ...tg, tech: 'vibrato', bend: wide ? 100 : 40, stroke: 'D' });
      title = wide ? t(`Wide vibrato (rock, ~½ step) · ${NAMES[key]}m box 1`, `ויברטו רחב (רוק, ~חצי טון) · ${NAMES[key]}m תיבה 1`) : t(`Narrow vibrato (finger) · ${NAMES[key]}m box 1`, `ויברטו צר (אצבע) · ${NAMES[key]}m תיבה 1`);
      break;
    }
    case 'double-stops': {
      // Diatonic 3rds on strings 3-2 (option 0) or 6ths on strings 3-1 (option 1), up an octave and back.
      const sixths = s.option === 1;
      const hiStr = sixths ? 1 : 2;
      const rf = lowFret1(tu, key, 3);
      const lowP = noteAt(tu, 3, rf);
      const sc = (k: number) => lowP + 12 * Math.floor(k / 7) + MAJOR[mod(k, 7)];
      const pairs: GN[][] = [];
      for (let k = 0; k <= 7; k++) {
        const a = sc(k);
        const b = sc(k + (sixths ? 5 : 2));
        const fa = a - tu.open[2];
        const fb = b - tu.open[hiStr - 1];
        pairs.push([
          { s: 3, f: fa },
          { s: hiStr, f: fb },
        ]);
      }
      for (const p of upDown(pairs)) push(1, ...p.map((x) => ({ ...x, stroke: 'D' as Stroke })));
      title = sixths ? t(`Double stops in 6ths (strings 3 & 1) · ${NAMES[key]}`, `צלילים כפולים בסקסטות (מיתרים 3 ו-1) · ${NAMES[key]}`) : t(`Double stops in 3rds (strings 3 & 2) · ${NAMES[key]}`, `צלילים כפולים בטרצות (מיתרים 3 ו-2) · ${NAMES[key]}`);
      return finish(s, tu, evs, { title, bpm: 60, evenness: true });
    }
    case 'bb-box': {
      // The B.B. King box: root on the 2nd string under the index finger.
      const b = lowFret1(tu, key, 2);
      const P = (st: number, f: number, extra: Partial<GN> = {}): GN => ({ s: st, f, pos: b, ...extra });
      const lick: [number, GN][] = [
        [0.5, P(3, b + 1)],
        [0.5, P(2, b)],
        [0.5, P(2, b + 2)],
        [1, P(2, b + 3, { tech: 'bend', bend: 100 })],
        [0.5, P(2, b + 2)],
        [2, P(2, b, { tech: 'vibrato', bend: 40 })],
        [0.5, P(1, b)],
        [0.5, P(1, b + 2)],
        [1, P(1, b + 2, { tech: 'bend', bend: 200, pos: b })],
        [0.5, P(1, b)],
        [0.5, P(2, b + 2)],
        [2, P(2, b, { tech: 'vibrato', bend: 40 })],
      ];
      for (const [d, g] of lick) push(d, g);
      title = t(`B.B. King box lick (bends + vibrato) · ${NAMES[key]}`, `ליק "הקופסה" של בי.בי. קינג (כיפופים + ויברטו) · ${NAMES[key]}`);
      break;
    }
    default:
      throw new Error(`Unknown lead kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm: 70, evenness: false });
}

// ───────────────────────────── FS: fingerstyle ─────────────────────────────

/** Open-chord progressions for fingerstyle, by key (C, G, Am, Em, D). */
export const FS_PROGS: Record<number, [number, Q][]> = {
  0: [[0, 'M'], [9, 'm'], [2, 'm'], [7, '7']],
  7: [[7, 'M'], [4, 'm'], [9, 'm'], [2, '7']],
  9: [[9, 'm'], [2, 'm'], [4, '7'], [9, 'm']],
  4: [[4, 'm'], [9, 'm'], [11, '7'], [4, 'm']],
  2: [[2, 'M'], [7, 'M'], [9, '7'], [2, 'M']],
};
type Role = 'p' | 'p2' | 'i' | 'm' | 'a';
/** Right-hand arpeggio patterns: steps of roles (a pinch = several roles at once). 0–3 basic PIMA, 4–9 Giuliani-style. */
export const PIMA: { steps: Role[][]; per: number; name: string }[] = [
  { steps: [['p'], ['i'], ['m'], ['a']], per: 2, name: 'p-i-m-a' },
  { steps: [['p'], ['a'], ['m'], ['i']], per: 2, name: 'p-a-m-i' },
  { steps: [['p'], ['i'], ['m'], ['i']], per: 2, name: 'p-i-m-i' },
  { steps: [['p'], ['i'], ['m'], ['a'], ['m'], ['i']], per: 3, name: 'p-i-m-a-m-i' },
  { steps: [['p', 'a'], ['i'], ['m'], ['i']], per: 2, name: '(p+a)-i-m-i' },
  { steps: [['p'], ['i'], ['m'], ['i'], ['a'], ['i'], ['m'], ['i']], per: 4, name: 'p-i-m-i-a-i-m-i' },
  { steps: [['p'], ['m', 'i'], ['a'], ['m', 'i']], per: 2, name: 'p-(i+m)-a-(i+m)' },
  { steps: [['p'], ['i', 'm', 'a']], per: 1, name: 'p-(i+m+a)' },
  { steps: [['p'], ['a'], ['i'], ['m'], ['i'], ['a']], per: 3, name: 'p-a-i-m-i-a' },
  { steps: [['p'], ['i'], ['p2'], ['m']], per: 2, name: 'p-i-p-m (alternating bass)' },
];

function fsVoices(tu: Tuning, sh: Shape): Record<Role, GN> {
  const bass = sh.dots.filter((d) => mod(noteAt(tu, d.s, d.f) - sh.root, 12) === 0).reduce((a, b) => (b.s > a.s ? b : a));
  const on = (st: number): GN => {
    const d = sh.dots.find((x) => x.s === st) ?? sh.dots[sh.dots.length - 1];
    return { s: d.s, f: d.f, finger: d.finger };
  };
  const altStr = bass.s === 6 ? 4 : bass.s === 5 ? 4 : 5;
  const alt2 = sh.dots.find((x) => x.s === altStr) ?? { s: altStr, f: 0 };
  return { p: { s: bass.s, f: bass.f, finger: bass.finger }, p2: { s: alt2.s, f: alt2.f, finger: (alt2 as { finger?: number }).finger }, i: on(3), m: on(2), a: on(1) };
}

function genFingerstyle(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const prog = FS_PROGS[key] ?? FS_PROGS[0];
  const evs: Ev[] = [];
  let title: T2;
  let bpm = 60;
  const progName = prog.map(([r, q]) => NAMES[r] + Q_NAME[q]).join(' ');
  switch (s.kind) {
    case 'thumb':
    case 'pima':
    case 'travis': {
      prog.forEach(([r, q], bar) => {
        const sh = chordShape(r, q);
        const v = fsVoices(tu, sh);
        const add = (beat: number, dur: number, roles: Role[]) => evs.push({ beat: bar * 4 + beat, dur, notes: roles.map((ro) => ({ ...v[ro], stroke: (ro === 'p2' ? 'p' : ro) as Stroke, tech: 'free-stroke' as GuitarTechnique })) });
        if (s.kind === 'thumb') for (let b = 0; b < 4; b++) add(b, 1, [b % 2 === 0 ? 'p' : 'p2']);
        else if (s.kind === 'travis') {
          add(0, 0.5, ['p', 'a']);
          add(0.5, 0.5, ['i']);
          add(1, 0.5, ['p2']);
          add(1.5, 0.5, ['m']);
          add(2, 0.5, ['p']);
          add(2.5, 0.5, ['i']);
          add(3, 0.5, ['p2']);
          add(3.5, 0.5, ['m']);
        } else {
          const pat = PIMA[(s.option ?? 0) % PIMA.length];
          const unit = 1 / pat.per;
          const n = Math.round(4 / unit);
          for (let k = 0; k < n; k++) add(k * unit, unit, pat.steps[k % pat.steps.length]);
        }
      });
      if (s.kind === 'thumb') title = t(`Alternating thumb bass · ${progName}`, `בס אגודל מתחלף · ${progName}`);
      else if (s.kind === 'travis') title = t(`Travis picking · ${progName}`, `פריטת טראוויס · ${progName}`);
      else title = t(`Arpeggio pattern ${PIMA[(s.option ?? 0) % PIMA.length].name} · ${progName}`, `תבנית ארפג׳יו ${PIMA[(s.option ?? 0) % PIMA.length].name} · ${progName}`);
      bpm = s.kind === 'pima' ? bpmAt(2, PIMA[(s.option ?? 0) % PIMA.length].per) : 60;
      break;
    }
    case 'scale-stroke': {
      // Classical scale with alternating fingers: i-m rest stroke (0), i-m free stroke (1), m-a (2), thumb (3).
      const o = (s.option ?? 0) % 4;
      const [lo, hi] = cagedWindow(tu, s.key, 3); // A-shape position: two octaves from string 5
      const all = windowScale(tu, s.key, MAJOR, lo, hi);
      const first = all.findIndex((x) => mod(noteAt(tu, x.s, x.f) - s.key, 12) === 0);
      let lastI = all.length - 1;
      while (lastI > first && mod(noteAt(tu, all[lastI].s, all[lastI].f) - s.key, 12) !== 0) lastI--;
      const line = upDown(all.slice(first, lastI + 1));
      const fingers: Stroke[] = o === 2 ? ['m', 'a'] : o === 3 ? ['p'] : ['i', 'm'];
      line.forEach((x, i) =>
        evs.push({ beat: i / 2, dur: i === line.length - 1 ? 1 : 0.5, notes: [{ ...x, stroke: fingers[i % fingers.length], tech: o === 0 || o === 3 ? 'rest-stroke' : 'free-stroke' }] }),
      );
      const nm = [t('i-m rest stroke (apoyando)', 'i-m במכה נשענת (אפויאנדו)'), t('i-m free stroke (tirando)', 'i-m במכה חופשית (טיראנדו)'), t('m-a alternation', 'החלפת m-a'), t('thumb only', 'אגודל בלבד')][o];
      title = t(`Scale ${nm.en} · ${NAMES[mod(s.key, 12)]}`, `סולם ${nm.he} · ${NAMES[mod(s.key, 12)]}`);
      bpm = bpmAt(2, 2);
      break;
    }
    case 'ligado': {
      // Classical slurs (Tárrega / Pujol ligados) in first position: each pair of scale notes on a string, struck once
      // (rest stroke) and slurred — ascending hammer-ons (option 0) or descending pull-offs (option 1), often from the open string.
      const down = s.option === 1;
      let beat = 0;
      for (const str of [3, 2, 1, 2, 3]) {
        const ns = windowScale(tu, s.key, MAJOR, 0, 4, [str]);
        for (let i = 0; i + 1 < ns.length; i++) {
          const [a, b] = down ? [ns[i + 1], ns[i]] : [ns[i], ns[i + 1]];
          evs.push({ beat, dur: 0.5, notes: [{ ...a, stroke: i % 2 ? 'm' : 'i', tech: 'rest-stroke' }] });
          evs.push({ beat: beat + 0.5, dur: 0.5, notes: [{ ...b, tech: down ? 'pull' : 'hammer' }] });
          beat += 1;
        }
      }
      title = t(`Slurs (ligados) ${down ? 'descending: pull-offs' : 'ascending: hammer-ons'}, first position · ${NAMES[mod(s.key, 12)]}`, `לגאדו ${down ? 'יורד: משיכות' : 'עולה: הקשות'}, מצב ראשון · ${NAMES[mod(s.key, 12)]}`);
      bpm = 60;
      break;
    }
    case 'campanella': {
      // Campanella (Baroque / Tárrega): a one-octave scale where each note sits on a different string from the one
      // before (open strings included), so the notes overlap like bells. Every position 0–9 is tried; greedy per note
      // (a string not used for the last two notes, else any other string); the position with the most string changes wins.
      const k0 = mod(s.key, 12);
      const tonic = 50 + mod(k0 - 50, 12); // D3 … C#4
      const pitches = Array.from({ length: 8 }, (_, i) => tonic + 12 * Math.floor(i / 7) + MAJOR[i % 7]);
      let best: GN[] = [];
      let bestScore = -1;
      for (let lo = 0; lo <= 9; lo++) {
        const used: number[] = [];
        const cand: GN[] = [];
        let score = 0;
        for (const pch of pitches) {
          const cs: GN[] = [];
          for (let st = 6; st >= 1; st--) {
            const f = pch - tu.open[st - 1];
            if (f === 0 || (f >= Math.max(1, lo) && f <= lo + 4)) cs.push({ s: st, f });
          }
          const pick = cs.find((c) => !used.slice(-2).includes(c.s)) ?? cs.find((c) => c.s !== used[used.length - 1]) ?? cs[0];
          if (!pick) break;
          if (used.length && pick.s !== used[used.length - 1]) score++;
          cand.push(pick);
          used.push(pick.s);
        }
        if (cand.length === pitches.length && score > bestScore) {
          best = cand;
          bestScore = score;
        }
      }
      const line = best;
      const fingers: Stroke[] = ['p', 'i', 'm', 'a'];
      upDown(line).forEach((x, i) => evs.push({ beat: i / 2, dur: 0.5, notes: [{ ...x, stroke: x.s >= 4 ? 'p' : fingers[1 + (i % 3)], tech: 'free-stroke' }] }));
      title = t(`Campanella scale (cross-string, let ring) · ${NAMES[k0]}`, `סולם קמפנלה (בין מיתרים, לתת לצלצל) · ${NAMES[k0]}`);
      bpm = 60;
      break;
    }
    case 'tremolo': {
      // p-a-m-i tremolo: bass with p, the melody note repeated by a-m-i (Recuerdos-style), 16ths.
      prog.forEach(([r, q], bar) => {
        const sh = chordShape(r, q);
        const v = fsVoices(tu, sh);
        for (let b = 0; b < 4; b++) {
          const bassRole: Role = b % 2 === 0 ? 'p' : 'p2';
          (['bass', 'a', 'm', 'i'] as const).forEach((ro, k) =>
            evs.push({ beat: bar * 4 + b + k / 4, dur: 0.25, notes: [{ ...(ro === 'bass' ? v[bassRole] : v.a), stroke: ro === 'bass' ? 'p' : ro, tech: 'free-stroke' }] }),
          );
        }
      });
      title = t(`Tremolo p-a-m-i · ${progName}`, `טרמולו p-a-m-i · ${progName}`);
      bpm = bpmAt(3, 4);
      break;
    }
    default:
      throw new Error(`Unknown fingerstyle kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm, evenness: true });
}

// ───────────────────────────── FL: flamenco ─────────────────────────────

function genFlamenco(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12); // phrygian tonic (E by default)
  const evs: Ev[] = [];
  let title: T2;
  let bpm = 60;
  let meter = 4;
  const cadence: [number, Q][] = [
    [key + 5, 'm'],
    [key + 3, 'M'],
    [key + 1, 'M'],
    [key, 'M'],
  ]; // Andalusian cadence iv–III–II–I (Am–G–F–E for E)
  switch (s.kind) {
    case 'rasgueado': {
      // Four-stroke rasgueado c-a-m-i (down) on each beat, + i up on the last 16th (option 1).
      const withUp = s.option === 1;
      cadence.forEach(([r, q], bar) => {
        const sh = chordShape(r, q, true);
        const fingers: Stroke[] = withUp ? ['a', 'm', 'i', 'i'] : ['c', 'a', 'm', 'i'];
        for (let b = 0; b < 4; b++)
          fingers.forEach((fg, k) => {
            const up = withUp && k === 3;
            evs.push({ beat: bar * 4 + b + k / 4, dur: 0.25, notes: strumNotes(sh, up ? 'strum-up' : 'rasgueado', fg, up).map((n) => ({ ...n, stroke: fg, acc: k === 0 })) });
          });
      });
      title = t(`Rasgueado ${withUp ? 'a-m-i-i(up)' : 'c-a-m-i'} · Andalusian cadence on ${NAMES[key]}`, `ראסגאדו ${withUp ? 'a-m-i-i(למעלה)' : 'c-a-m-i'} · קדנצה אנדלוסית על ${NAMES[key]}`);
      bpm = bpmAt(2.5, 4);
      break;
    }
    case 'rasg-triplet': {
      cadence.forEach(([r, q], bar) => {
        const sh = chordShape(r, q, true);
        for (let k = 0; k < 12; k++) {
          const st: Stroke = (['p', 'a', 'i'] as Stroke[])[k % 3];
          const up = st === 'i';
          evs.push({ beat: bar * 4 + k / 3, dur: 1 / 3, notes: strumNotes(sh, up ? 'strum-up' : 'rasgueado', st, up).map((n) => ({ ...n, acc: k % 3 === 0 })) });
        }
      });
      title = t(`Continuous triplet rasgueado (p-a-i) · ${NAMES[key]}`, `ראסגאדו רציף בטריולות (p-a-i) · ${NAMES[key]}`);
      bpm = bpmAt(2.5, 3);
      break;
    }
    case 'picado': {
      const three = s.option === 1;
      const lo = lowFret(tu, key, 6);
      const line = upDown(windowScale(tu, key, SCALES.phrygian, lo, lo + 4).slice(0, 15));
      const per = three ? 3 : 4;
      const fingers: Stroke[] = three ? ['a', 'm', 'i'] : ['i', 'm'];
      line.forEach((x, i) => evs.push({ beat: i / per, dur: i === line.length - 1 ? 1 : 1 / per, notes: [{ ...x, stroke: fingers[i % fingers.length], tech: 'rest-stroke' }] }));
      title = three ? t(`Picado a-m-i in triplets, ${NAMES[key]} Phrygian`, `פיקאדו a-m-i בטריולות, ${NAMES[key]} פריגי`) : t(`Picado (i-m rest stroke), ${NAMES[key]} Phrygian`, `פיקאדו (i-m במכה נשענת), ${NAMES[key]} פריגי`);
      bpm = bpmAt(3, per);
      break;
    }
    case 'alzapua': {
      // Thumb: bass note (rest stroke), then down and up through the top strings — triplets.
      const sh = chordShape(key, 'M', true);
      const bassLine = [0, 1, 3, 1, 0, 1, 3, 1].map((d) => ({ s: 6, f: lowFret(tu, key, 6) + d }));
      bassLine.forEach((b, i) => {
        const beat = i;
        evs.push({ beat, dur: 1 / 3, notes: [{ ...b, stroke: 'p', tech: 'rest-stroke', acc: true }] });
        evs.push({ beat: beat + 1 / 3, dur: 1 / 3, notes: strumNotes(sh, 'strum-down', 'p', true) });
        evs.push({ beat: beat + 2 / 3, dur: 1 / 3, notes: strumNotes(sh, 'strum-up', 'p', true) });
      });
      title = t(`Alzapúa (thumb down–down–up) · ${NAMES[key]}`, `אלסאפואה (אגודל למטה–למטה–למעלה) · ${NAMES[key]}`);
      bpm = bpmAt(2, 3);
      break;
    }
    case 'compas': {
      // 12-beat compás on the tonic chord. 0 soleá (accents 3, 6, 8, 10, 12); 1 bulería (counted from 12: 12, 3, 6, 8, 10);
      // 2 seguiriya (12 pulses grouped 2+2+3+3+2).
      const op = s.option ?? 0;
      if (op === 3) {
        // Rumba flamenca (4/4): down-up 8ths over the Andalusian cadence, accents 3+3+2 (8ths 1, 4, 7 of each bar).
        cadence.forEach(([r, q], bar) => {
          const sh = chordShape(r, q, true);
          for (let k = 0; k < 8; k++) {
            const up = k % 2 === 1;
            evs.push({ beat: bar * 4 + k / 2, dur: 0.5, notes: strumNotes(sh, up ? 'strum-up' : 'strum-down', up ? 'U' : 'D', up).map((n) => ({ ...n, acc: k === 0 || k === 3 || k === 6 })) });
          }
        });
        title = t(`Rumba strum (accents 3+3+2) · Andalusian cadence on ${NAMES[key]}`, `פריטת רומבה (הטעמות 3+3+2) · קדנצה אנדלוסית על ${NAMES[key]}`);
        bpm = 90;
        break;
      }
      const sh = chordShape(key, 'M', true);
      const acc = new Set(op === 1 ? [0, 3, 6, 8, 10] : op === 2 ? [0, 2, 4, 7, 10] : [2, 5, 7, 9, 11]);
      for (let b = 0; b < 24; b++) evs.push({ beat: b, dur: 1, notes: strumNotes(sh, 'strum-down', 'i').map((n) => ({ ...n, acc: acc.has(b % 12) })) });
      meter = 12;
      title = [
        t(`Soleá compás (accents 3, 6, 8, 10, 12) · ${NAMES[key]}`, `קומפאס סולאה (הטעמות 3, 6, 8, 10, 12) · ${NAMES[key]}`),
        t(`Bulería compás (from 12: accents 12, 3, 6, 8, 10) · ${NAMES[key]}`, `קומפאס בולריאה (מ-12: הטעמות 12, 3, 6, 8, 10) · ${NAMES[key]}`),
        t(`Seguiriya compás (2+2+3+3+2) · ${NAMES[key]}`, `קומפאס סגיריה (2+2+3+3+2) · ${NAMES[key]}`),
      ][Math.min(2, op)];
      bpm = op === 2 ? 120 : 100;
      break;
    }
    default:
      throw new Error(`Unknown flamenco kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm, evenness: true, meter, keySig: SIG[mod(key - 4, 12)] });
}

// ───────────────────────────── J: jazz guitar ─────────────────────────────

const IIVI: [number, Q, number[]][] = [
  [2, 'm7', [0, 3, 7, 10]],
  [7, '7', [0, 4, 7, 10]],
  [0, 'maj7', [0, 4, 7, 11]],
];

function nearestVoicing(cands: { s: number; f: number }[][], near: number): { s: number; f: number }[] {
  return cands.reduce((a, b) => (Math.abs(Math.min(...b.map((p) => p.f)) - near) < Math.abs(Math.min(...a.map((p) => p.f)) - near) ? b : a));
}

function genJazz(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const evs: Ev[] = [];
  let title: T2;
  const chordBars = (vs: { s: number; f: number }[][], perBar: number) =>
    vs.forEach((v, i) => {
      const bars = i === vs.length - 1 ? 2 : 1;
      for (let k = 0; k < perBar * bars; k++) evs.push({ beat: i * 4 + (k * 4) / perBar, dur: 4 / perBar, notes: v.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) });
    });
  switch (s.kind) {
    case 'shells': {
      const first: 5 | 6 = s.option === 1 ? 5 : 6;
      let near = 7;
      const vs = IIVI.map(([d, q], i) => {
        const v = shell(tu, mod(key + d, 12), q, (i % 2 === 0 ? first : first === 6 ? 5 : 6) as 5 | 6, near);
        near = v[0].f;
        return v;
      });
      chordBars(vs, 4);
      title = t(`Shell voicings ii–V–I, root on ${first}, four to the bar · ${NAMES[key]}`, `קונכיות ii–V–I, יסוד על ${first}, ארבע לתיבה · ${NAMES[key]}`);
      break;
    }
    case 'drop2': {
      const k = SEV_KINDS[(s.option ?? 0) % 4];
      const sets = [
        [4, 3, 2, 1],
        [5, 4, 3, 2],
        [6, 5, 4, 3],
      ];
      const strs = sets[(s.position ?? 0) % 3];
      const vs = drop2Voicings(
        tu,
        k.ints.map((i) => key + i),
        strs,
      );
      const climb: { s: number; f: number }[][] = [];
      for (const v of vs) if (!climb.length || Math.min(...v.map((p) => p.f)) > Math.min(...climb[climb.length - 1].map((p) => p.f))) climb.push(v);
      const four = climb.slice(0, 4);
      upDown(four).forEach((v, i) => evs.push({ beat: i * 2, dur: 2, notes: v.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) }));
      title = t(`Drop-2 ${NAMES[key]}${k.name} through the inversions, strings ${strs.join('-')}`, `דרופ 2 ${NAMES[key]}${k.name} דרך ההיפוכים, מיתרים ${strs.join('-')}`);
      break;
    }
    case 'iivi-drop2': {
      const strs = [4, 3, 2, 1];
      let near = 5;
      const vs = IIVI.map(([d, , ints]) => {
        const v = nearestVoicing(
          drop2Voicings(
            tu,
            ints.map((i) => key + d + i),
            strs,
          ),
          near,
        );
        near = Math.min(...v.map((p) => p.f));
        return v;
      });
      chordBars(vs, 2);
      title = t(`ii–V–I in drop-2 voicings, smooth voice leading · ${NAMES[key]}`, `ii–V–I בקולות דרופ 2, הובלת קולות חלקה · ${NAMES[key]}`);
      break;
    }
    case 'drop3': {
      let near = 6;
      const vs = IIVI.map(([d, , ints], i) => {
        const root = mod(key + d, 12);
        const rs = i % 2 === 0 ? 6 : 5;
        const R0 = lowFret1(tu, root, rs);
        const rf = Math.abs(R0 + 12 - near) < Math.abs(R0 - near) && R0 + 12 <= 13 ? R0 + 12 : R0;
        near = rf;
        const R = noteAt(tu, rs, rf);
        const ms = [R, R + ints[3], R + 12 + ints[1], R + 12 + ints[2]];
        const ss = rs === 6 ? [6, 4, 3, 2] : [5, 3, 2, 1];
        return ms.map((m, j) => ({ s: ss[j], f: m - tu.open[ss[j] - 1] }));
      });
      chordBars(vs, 2);
      title = t(`ii–V–I in drop-3 voicings (root on 6 and 5) · ${NAMES[key]}`, `ii–V–I בקולות דרופ 3 (יסוד על 6 ו-5) · ${NAMES[key]}`);
      break;
    }
    case 'guide-tones': {
      // 3rds and 7ths, half notes: line A starts on the 3rd of ii, line B on the 7th.
      const start7 = s.option === 1;
      const pcs = [
        [key + 2 + (start7 ? 10 : 3), key + 2 + (start7 ? 3 : 10)],
        [key + 7 + (start7 ? 4 : 10), key + 7 + (start7 ? 10 : 4)],
        [key + (start7 ? 11 : 4), key + (start7 ? 4 : 11)],
      ];
      let prev = 62;
      let beat = 0;
      pcs.forEach((pair, ci) =>
        pair.forEach((pc) => {
          const cands = [0, 1].map((k) => 55 + mod(pc - 55, 12) + 12 * k).filter((x) => x <= 74);
          const p = cands.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
          prev = p;
          const pl = place(tu, p, [3, 2, 4, 1], 1, 12) ?? place(tu, p, [3, 2, 4, 1, 5], 0, 15)!;
          const dur = ci === 2 ? 2 : 2;
          evs.push({ beat, dur, notes: [{ ...pl, ct: true, stroke: 'D' }] });
          beat += dur;
        }),
      );
      title = t(`Guide-tone line (${start7 ? '7th' : '3rd'} first) over ii–V–I · ${NAMES[key]}`, `קו צלילים מנחים (${start7 ? 'ספטימה' : 'טרצה'} תחילה) על ii–V–I · ${NAMES[key]}`);
      return finish(s, tu, evs, { title, bpm: 80, evenness: true, goal: { chordTonesOnBeats: true } });
    }
    case 'walking': {
      bassWalk(tu, key, evs, [6, 5, 4], 40);
      title = t(`Walking bass on guitar, ii–V–I · ${NAMES[key]}`, `בס מהלך על גיטרה, ii–V–I · ${NAMES[key]}`);
      return finish(s, tu, evs, { title, bpm: 90, evenness: true, goal: { chordTonesOnBeats: true } });
    }
    case 'comp': {
      // Comping rhythms with shells over ii–V–I–I: Charleston (option 0) or anticipations on the "and" of 4 (option 1).
      const antic = s.option === 1;
      let near = 7;
      const vs = [...IIVI, IIVI[2]].map(([d, q], i) => {
        const v = shell(tu, mod(key + d, 12), q, (i % 2 === 0 ? 6 : 5) as 5 | 6, near);
        near = v[0].f;
        return v;
      });
      const hit = (beat: number, dur: number, v: { s: number; f: number }[]) => evs.push({ beat, dur, notes: v.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) });
      vs.forEach((v, bar) => {
        if (antic) hit(bar === 0 ? 0 : bar * 4 - 0.5, bar === 0 ? 3.5 : bar === vs.length - 1 ? 4.5 : 4, v);
        else {
          hit(bar * 4, 1.5, v);
          hit(bar * 4 + 1.5, 2.5, v);
        }
      });
      title = antic ? t(`Comping with anticipations (the "and" of 4), shells ii–V–I · ${NAMES[key]}`, `ליווי עם הקדמות (ה"וְ" של 4), קונכיות ii–V–I · ${NAMES[key]}`) : t(`Charleston comping, shells ii–V–I · ${NAMES[key]}`, `ליווי צ׳רלסטון, קונכיות ii–V–I · ${NAMES[key]}`);
      return finish(s, tu, evs, { title, bpm: 100, evenness: true });
    }
    case 'octaves': {
      // Octaves (Wes Montgomery): the major scale on strings 5 / 4 with the octave two strings up, played together.
      const r5 = lowFret1(tu, key, 5);
      const low = windowScale(tu, key, MAJOR, r5, r5 + 3, [5, 4]);
      const pairs = low.flatMap((x) => {
        const o = place(tu, noteAt(tu, x.s, x.f) + 12, [x.s - 2], 0, 17);
        return o && Math.abs(o.f - x.f) <= 4 ? [[{ ...x }, { ...o }]] : [];
      });
      upDown(pairs).forEach((pr, i) => evs.push({ beat: i, dur: 1, notes: pr.map((x) => ({ ...x, stroke: 'D' as Stroke })) }));
      title = t(`Octaves, Wes Montgomery style (strings 5-3, 4-2) · ${NAMES[key]}`, `אוקטבות בסגנון ווס מונטגומרי (מיתרים 5-3, 4-2) · ${NAMES[key]}`);
      return finish(s, tu, evs, { title, bpm: 80, evenness: true });
    }
    case 'harmonized': {
      // Major scale harmonised in drop-2 on strings 5-4-3-2, the scale on top (chord-melody preparation).
      const strs = [5, 4, 3, 2];
      let near = lowFret1(tu, key, 2);
      for (let d = 0; d < 8; d++) {
        const deg = d % 7;
        const root = key + MAJOR[deg];
        const ints = [0, 2, 4, 6].map((k) => mod(MAJOR[(deg + k) % 7] - MAJOR[deg], 12));
        const vs = drop2Voicings(
          tu,
          ints.map((i) => root + i),
          strs,
        ).filter((v) => mod(noteAt(tu, v[3].s, v[3].f) - root, 12) === 0);
        const v = vs.length ? nearestVoicing(vs, near) : null;
        if (!v) continue;
        near = Math.min(...v.map((p) => p.f));
        evs.push({ beat: d * 2, dur: 2, notes: v.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) });
      }
      title = t(`Harmonized major scale in drop-2 (melody on top) · ${NAMES[key]}`, `סולם מז׳ור מהורמן בדרופ 2 (מנגינה למעלה) · ${NAMES[key]}`);
      break;
    }
    default:
      throw new Error(`Unknown jazz kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm: 80, evenness: true });
}

/** Walking bass over ii–V–I (2 bars I): R – 3 – 5 – chromatic approach to the next root (nearest octave), low strings. */
function bassWalk(tu: Tuning, key: number, evs: Ev[], strings: number[], lowest: number): void {
  const chords: [number, number][] = [
    [key + 2, 3],
    [key + 7, 4],
    [key, 4],
    [key, 4],
  ];
  const nStr = tu.open.length;
  const strs = strings.filter((x) => x <= nStr);
  const nearestRoot = (pc: number, to: number): number => {
    const a = lowest + mod(pc - lowest, 12);
    const b = a + 12;
    return b <= lowest + 14 && Math.abs(b - to) < Math.abs(a - to) ? b : a;
  };
  let R = lowest + mod(chords[0][0] - lowest, 12);
  let beat = 0;
  chords.forEach(([, third], i) => {
    const nextPc = chords[(i + 1) % chords.length][0];
    const last = i === 3 ? R + 2 : R + 7;
    const nextR = nearestRoot(nextPc, last);
    const approach = nextR + (nextR > last ? -1 : 1);
    const line = i === 3 ? [R + 7, R + 4, R + 2, approach] : [R, R + third, R + 7, approach];
    line.forEach((p, k) => {
      const pl = place(tu, p, strs, 0, 7) ?? place(tu, p, strs, 0, 12) ?? place(tu, p, [...strs, ...strings], 0, 15)!;
      evs.push({ beat, dur: 1, notes: [{ ...pl, ct: k === 0 || (k < 3 && i !== 3), stroke: 'p' }] });
      beat += 1;
    });
    R = nextR;
  });
}

// ───────────────────────────── RD: reading by position ─────────────────────────────

/** Small deterministic PRNG (mulberry32) seeded from a string. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function genReading(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const P = s.position ?? 1; // index-finger fret; 1 = first position (with open strings)
  const lo = P === 1 ? 0 : P;
  const strs = s.option === 1 ? [3, 2, 1] : undefined;
  const set = windowScale(tu, key, MAJOR, lo, P + 3, strs);
  const rnd = rng(guitarItemId(s));
  let i = set.findIndex((x) => mod(noteAt(tu, x.s, x.f) - key, 12) === 0);
  if (i < 0) i = 0;
  const rhythmic = (s.perBeat ?? 1) > 1;
  const evs: Ev[] = [];
  let beat = 0;
  while (beat < 16) {
    const x = set[i];
    const dur = rhythmic ? ([0.5, 0.5, 1, 1, 2][Math.floor(rnd() * 5)] as number) : 1;
    const d = Math.min(dur, 16 - beat);
    evs.push({ beat, dur: d, notes: [{ ...x, pos: x.f > 0 ? Math.max(1, P) : undefined, stroke: 'D' }] });
    beat += d;
    const step = [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)];
    i = clamp(i + step, 0, set.length - 1);
  }
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][P] ?? String(P);
  const title = t(`Reading in position ${roman}${strs ? ' (strings 1–3)' : ''}${rhythmic ? ', mixed rhythms' : ''} · ${NAMES[key]}`, `קריאה במצב ${roman}${strs ? ' (מיתרים 1–3)' : ''}${rhythmic ? ', מקצבים מעורבים' : ''} · ${NAMES[key]}`);
  return finish(s, tu, evs, { title, bpm: 60, evenness: false });
}

// ───────────────────────────── I: target notes over forms ─────────────────────────────

const BLUES12 = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
const DOM7 = [0, 4, 7, 10];
const MIN7 = [0, 3, 7, 10];
const MAJ7 = [0, 4, 7, 11];
/** Forms for target-note drills (one chord a bar): option index; undefined / 0 = the 12-bar blues. */
export const IMPRO_FORMS: { en: string; he: string; bars: [number, number[]][] }[] = [
  { en: '12-bar blues', he: 'בלוז 12 תיבות', bars: BLUES12.map((d): [number, number[]] => [d, DOM7]) },
  {
    en: 'minor blues',
    he: 'בלוז מינורי',
    bars: [
      [0, MIN7],
      [0, MIN7],
      [0, MIN7],
      [0, MIN7],
      [5, MIN7],
      [5, MIN7],
      [0, MIN7],
      [0, MIN7],
      [8, DOM7],
      [7, DOM7],
      [0, MIN7],
      [7, DOM7],
    ],
  },
  {
    en: 'ii–V–I (×3)',
    he: 'ii–V–I (×3)',
    bars: [0, 1, 2].flatMap((): [number, number[]][] => [
      [2, MIN7],
      [7, DOM7],
      [0, MAJ7],
      [0, MAJ7],
    ]),
  },
  {
    en: 'the ii–V–I cycle of a standard (Autumn Leaves type)',
    he: 'מעגל ii–V–I של סטנדרט (בסגנון Autumn Leaves)',
    bars: [
      [2, MIN7],
      [7, DOM7],
      [0, MAJ7],
      [5, MAJ7],
      [11, [0, 3, 6, 10]],
      [4, DOM7],
      [9, MIN7],
      [9, MIN7],
    ],
  },
];

function genImpro(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const [lo, hi] = cagedWindow(tu, key, 0);
  const evs: Ev[] = [];
  const kind = s.kind;
  const form = IMPRO_FORMS[(s.option ?? 0) % IMPRO_FORMS.length];
  let prevP = 0;
  form.bars.forEach(([d, ints], bar) => {
    const root = mod(key + d, 12);
    const tones = windowScale(tu, root, ints, Math.max(0, lo - 1), hi + 1);
    const pick = (iv: number): { s: number; f: number } => {
      const c = tones.filter((x) => mod(noteAt(tu, x.s, x.f) - root - iv, 12) === 0);
      const best = c.reduce((a, b) => (Math.abs(noteAt(tu, b.s, b.f) - prevP) < Math.abs(noteAt(tu, a.s, a.f) - prevP) ? b : a), c[0]);
      prevP = noteAt(tu, best.s, best.f);
      return best;
    };
    if (bar === 0) prevP = noteAt(tu, tones[Math.floor(tones.length / 2)].s, tones[Math.floor(tones.length / 2)].f);
    if (kind === 'targets-root' || kind === 'targets-third') {
      const x = pick(kind === 'targets-root' ? 0 : ints[1]);
      evs.push({ beat: bar * 4, dur: 4, notes: [{ ...x, ct: true, stroke: 'D', tech: 'vibrato', bend: 30 }] });
    } else if (kind === 'targets-arp') {
      ints.forEach((iv, k) => evs.push({ beat: bar * 4 + k, dur: 1, notes: [{ ...pick(iv), ct: true, stroke: 'D' }] }));
    } else {
      // Guide tones: 3rd then 7th, half notes, nearest each time.
      [ints[1], ints[3]].forEach((iv, k) => evs.push({ beat: bar * 4 + k * 2, dur: 2, notes: [{ ...pick(iv), ct: true, stroke: 'D' }] }));
    }
  });
  const nm: Record<string, T2> = {
    'targets-root': t('roots on beat 1', 'יסודות על פעמה 1'),
    'targets-third': s.option ? t('3rds on beat 1 (the 3rd of each chord)', 'טרצות על פעמה 1 (הטרצה של כל אקורד)') : t('3rds on beat 1 (major 3rd over each 7th chord)', 'טרצות על פעמה 1 (טרצה גדולה של כל אקורד)'),
    'targets-arp': t('chord-tone arpeggio every bar', 'ארפג׳יו צלילי אקורד בכל תיבה'),
    'targets-guide': t('guide tones (3rd → 7th)', 'צלילים מנחים (טרצה ← ספטימה)'),
  };
  const n = nm[kind];
  if (!n) throw new Error(`Unknown impro kind ${kind}`);
  return finish(s, tu, evs, { title: t(`${form.en}: ${n.en} · ${NAMES[key]}${form.en === 'minor blues' ? 'm' : ''}`, `${form.he}: ${n.he} · ${NAMES[key]}${form.en === 'minor blues' ? 'm' : ''}`), bpm: 80, evenness: false, goal: { chordTonesOnBeats: true } });
}

// ───────────────────────────── B: bass guitar ─────────────────────────────

/** Strings low → high: [n, n−1, …, 1]. */
const range4 = (n: number): number[] => Array.from({ length: n }, (_, i) => n - i);

export function genBass(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const nStr = tu.open.length;
  const pb = s.perBeat ?? 2;
  let gns: GN[] = [];
  let title: T2;
  switch (s.kind) {
    case 'spider':
      return genFretting({ ...s, kind: 'spider' }, tu);
    case 'major':
    case 'mode': {
      // 'mode': option = mode of the major scale (1 Dorian, 4 Mixolydian, 5 Aeolian / natural minor), one octave in position.
      const m = s.kind === 'mode' ? mod(s.option ?? 5, 7) : 0;
      const r = lowFret1(tu, key, nStr);
      const all = windowScale(tu, key, modeInts(m), r - 1, r + 3);
      const R = noteAt(tu, nStr, r);
      gns = upDown(all.filter((x) => noteAt(tu, x.s, x.f) >= R && noteAt(tu, x.s, x.f) <= R + 12));
      title =
        s.kind === 'major'
          ? t(`Major scale, one finger per fret · ${NAMES[key]}`, `סולם מז׳ור, אצבע לכל סריג · ${NAMES[key]}`)
          : t(`${NAMES[key]} ${MODE_T[m].en}${m === 5 ? ' (natural minor)' : ''}, one finger per fret`, `${NAMES[key]} ${MODE_T[m].he}${m === 5 ? ' (מינור טבעי)' : ''}, אצבע לכל סריג`);
      break;
    }
    case 'groove': {
      // Genre grooves over 4 bars. 0 rock root 8ths I–♭VII–IV–I; 1 Motown R-5-6-8-5 + chromatic approach, I–vi–IV–V;
      // 2 Latin tumbao: the 5th on the "and" of 2, the next chord's root anticipated on 4, I–IV–V–IV.
      const op = mod(s.option ?? 0, 3);
      const lowest = tu.open[nStr - 1];
      const rootP = (pc: number) => lowest + mod(pc - lowest, 12);
      const at = (p: number): GN => ({ ...(place(tu, p, range4(nStr), 0, 7) ?? place(tu, p, range4(nStr), 0, 12)!), stroke: 'i' });
      const evs: Ev[] = [];
      const prog = op === 0 ? [0, 10, 5, 0] : op === 1 ? [0, 9, 5, 7] : [0, 5, 7, 5];
      prog.forEach((d, bar) => {
        const R = rootP(key + d);
        const nextR = rootP(key + (bar === 3 ? prog[0] : prog[bar + 1]));
        const b0 = bar * 4;
        if (op === 0) for (let k = 0; k < 8; k++) evs.push({ beat: b0 + k / 2, dur: 0.5, notes: [{ ...at(R), acc: k % 2 === 0 }] });
        else if (op === 1) {
          const six = d === 9 ? 8 : 9; // the diatonic 6th above the chord root (minor 6th over vi)
          const appr = nextR === R ? R - 1 : nextR > R ? nextR - 1 : nextR + 1;
          (
            [
              [0, 1, R],
              [1, 0.5, R + 7],
              [1.5, 0.5, R + six],
              [2, 1, R + 12],
              [3, 0.5, R + 7],
              [3.5, 0.5, appr],
            ] as [number, number, number][]
          ).forEach(([b, du, p]) => evs.push({ beat: b0 + b, dur: du, notes: [at(p)] }));
        } else {
          evs.push({ beat: b0 + 1.5, dur: 1.5, notes: [at(R + 7)] });
          evs.push({ beat: b0 + 3, dur: 1, notes: [{ ...at(nextR), acc: true }] });
        }
      });
      evs.push({ beat: 16, dur: 1, notes: [at(rootP(key))] });
      const nm = [
        t('Rock root 8ths (I–♭VII–IV–I)', 'שמיניות יסוד ברוק (I–♭VII–IV–I)'),
        t('Motown groove: R-5-6-8 and a chromatic approach (I–vi–IV–V)', 'גרוב מוטאון: R-5-6-8 וגישה כרומטית (I–vi–IV–V)'),
        t('Latin tumbao: the 5th on 2-and, the next root anticipated on 4', 'טומבאו לטיני: הקווינטה על 2-וְ, היסוד הבא מוקדם על 4'),
      ][op];
      return finish(s, tu, evs, { title: t(`${nm.en} · ${NAMES[key]}`, `${nm.he} · ${NAMES[key]}`), bpm: op === 2 ? 90 : 80, evenness: true });
    }
    case 'r58': {
      for (const d of [0, 5, 7, 0]) {
        const root = mod(key + d, 12);
        const rs = lowFret(tu, root, nStr) <= 7 ? nStr : nStr - 1;
        const rf = lowFret(tu, root, rs);
        const pat = [
          { s: rs, f: rf },
          { s: rs - 1, f: rf + 2 },
          { s: rs - 2, f: rf + 2 },
          { s: rs - 1, f: rf + 2 },
        ];
        gns.push(...pat, ...pat);
      }
      title = t(`Root–5th–octave groove, I–IV–V–I · ${NAMES[key]}`, `גרוב יסוד–קווינטה–אוקטבה, I–IV–V–I · ${NAMES[key]}`);
      break;
    }
    case 'arp': {
      const k = SEV_KINDS[(s.option ?? 0) % 3];
      gns = upDown(arpUnderHand(tu, key, s.option === undefined ? [0, 4, 7] : k.ints, nStr).filter((_, i) => i < 8));
      title = s.option === undefined ? t(`Triad arpeggio · ${NAMES[key]}`, `ארפג׳יו משולש · ${NAMES[key]}`) : t(`${NAMES[key]}${k.name} arpeggio`, `ארפג׳יו ${NAMES[key]}${k.name}`);
      break;
    }
    case 'octaves': {
      for (const d of [0, 0, 5, 7]) {
        const root = mod(key + d, 12);
        const rf = lowFret(tu, root, nStr);
        for (let k = 0; k < 4; k++) gns.push({ s: nStr, f: rf, stroke: 'p' }, { s: nStr - 2, f: rf + 2, stroke: 'i' });
      }
      title = t(`Disco / funk octaves (thumb–pop) · ${NAMES[key]}`, `אוקטבות דיסקו / פאנק (אגודל–פופ) · ${NAMES[key]}`);
      break;
    }
    case 'penta': {
      // Minor pentatonic (option 0) or blues scale (option 1), box 1 under the hand.
      const r = lowFret1(tu, key, nStr);
      const blues = s.option === 1;
      gns = upDown(windowScale(tu, key, blues ? SCALES.blues : SCALES.pentaMinor, r, r + 3));
      title = blues ? t(`Blues scale, box 1 · ${NAMES[key]}`, `סולם בלוז, תיבה 1 · ${NAMES[key]}`) : t(`Minor pentatonic, box 1 · ${NAMES[key]}m`, `פנטטוני מינור, תיבה 1 · ${NAMES[key]}m`);
      break;
    }
    case 'ghost':
    case 'slap': {
      // 16th grooves over I–I–IV–V. ghost: fingerstyle with dead notes (x); slap: thumb (p) on the root, pop (i) on the octave.
      // Slap option 1: thumb, hammer-on (the 9th, no attack), pop the octave and the ♭7 — the funk "thumb–hammer–pop" figure.
      const slap = s.kind === 'slap';
      const pat = slap ? (s.option === 1 ? 'T.HxP.QxT.Hx.PxQ' : 'T.xPT.xPTxT.xP5.') : 'R.xR..xO.xR..x5.';
      const evs: Ev[] = [];
      [0, 0, 5, 7].forEach((d, bar) => {
        const root = mod(key + d, 12);
        const rs = lowFret(tu, root, nStr) <= 7 ? nStr : nStr - 1;
        const rf = lowFret(tu, root, rs);
        [...pat].forEach((c, i) => {
          if (c === '.') return;
          const b = bar * 4 + i / 4;
          let g: GN;
          if (c === 'x') g = { s: rs, f: rf, tech: 'dead', stroke: slap ? 'p' : 'i' };
          else if (c === 'O' || c === 'P') g = { s: rs - 2, f: rf + 2, stroke: slap ? 'i' : 'm' };
          else if (c === 'H') g = { s: rs, f: rf + 2, tech: 'hammer' };
          else if (c === 'Q') g = { s: rs - 2, f: rf, stroke: 'i' };
          else if (c === '5') g = { s: rs - 1, f: rf + 2, stroke: slap ? 'p' : 'i' };
          else g = { s: rs, f: rf, stroke: slap ? 'p' : 'i' };
          evs.push({ beat: b, dur: 0.25, notes: [g] });
        });
      });
      evs.push({ beat: 16, dur: 1, notes: [{ s: nStr, f: lowFret(tu, key, nStr), stroke: slap ? 'p' : 'i' }] });
      return finish(s, tu, evs, {
        title: slap && s.option === 1 ? t(`Slap: thumb, hammer-on, pop octave and ♭7 · ${NAMES[key]}`, `סלאפ: אגודל, הקשה, פופ באוקטבה וב-♭7 · ${NAMES[key]}`) : slap ? t(`Slap groove: thumb root, pop octave, ghost notes · ${NAMES[key]}`, `גרוב סלאפ: אגודל ביסוד, פופ באוקטבה, צלילי רפאים · ${NAMES[key]}`) : t(`16th groove with ghost (dead) notes · ${NAMES[key]}`, `גרוב בשש-עשריות עם צלילי רפאים · ${NAMES[key]}`),
        bpm: 80,
        evenness: true,
      });
    }
    case 'walk-blues': {
      // Walking bass through a 12-bar blues: R – 3 – 5 – chromatic approach to the next root.
      const evs: Ev[] = [];
      const lowest = tu.open[nStr - 1];
      const rootP = (pc: number) => lowest + mod(pc - lowest, 12);
      let beat = 0;
      BLUES12.forEach((d, bar) => {
        const R = rootP(key + d);
        const next = rootP(key + (bar === 11 ? 0 : BLUES12[bar + 1]));
        const appr = next === R ? next + 1 : next > R ? next - 1 : next + 1;
        [R, R + 4, R + 7, appr].forEach((p, k) => {
          const pl = place(tu, p, [nStr, nStr - 1, nStr - 2], 0, 7) ?? place(tu, p, [nStr, nStr - 1, nStr - 2, nStr - 3], 0, 12)!;
          evs.push({ beat, dur: 1, notes: [{ ...pl, ct: k < 3, stroke: 'i' }] });
          beat++;
        });
      });
      const end = place(tu, rootP(key), [nStr, nStr - 1], 0, 7)!;
      evs.push({ beat, dur: 2, notes: [{ ...end, ct: true, stroke: 'i' }] });
      return finish(s, tu, evs, { title: t(`Walking bass, 12-bar blues · ${NAMES[key]}`, `בס מהלך, בלוז 12 תיבות · ${NAMES[key]}`), bpm: 90, evenness: true, goal: { chordTonesOnBeats: true } });
    }
    case 'walking': {
      const evs: Ev[] = [];
      bassWalk(tu, key, evs, [4, 3, 2], 28);
      return finish(s, tu, evs, { title: t(`Walking bass ii–V–I · ${NAMES[key]}`, `בס מהלך ii–V–I · ${NAMES[key]}`), bpm: 90, evenness: true, goal: { chordTonesOnBeats: true } });
    }
    default:
      throw new Error(`Unknown bass kind ${s.kind}`);
  }
  return finish(s, tu, seqEv(gns, 1 / pb), { title: t(`${title.en} · ${pbName(pb)}`, `${title.he} · ${pbNameHe(pb)}`), bpm: bpmAt(2, pb) });
}

// ───────────────────────────── dispatch ─────────────────────────────

/** Build a guitar / bass drill (any 'g-' family). */
export function generateGuitar(spec: DrillSpec): Drill {
  const s: DrillSpec = { ...spec, key: mod(spec.key, 12) };
  const tu = tuningOf(s);
  switch (s.family) {
    case 'g-fretting':
      return genFretting(s, tu);
    case 'g-picking':
      return genPicking(s, tu);
    case 'g-legato':
      return genLegato(s, tu);
    case 'g-scales':
      return genScales(s, tu);
    case 'g-arps':
      return genArps(s, tu);
    case 'g-chords':
      return genChords(s, tu);
    case 'g-rhythm':
      return genRhythm(s, tu);
    case 'g-lead':
      return genLead(s, tu);
    case 'g-fingerstyle':
      return genFingerstyle(s, tu);
    case 'g-flamenco':
      return genFlamenco(s, tu);
    case 'g-jazz':
      return genJazz(s, tu);
    case 'g-reading':
      return genReading(s, tu);
    case 'g-impro':
      return genImpro(s, tu);
    case 'g-bass':
      return genBass(s, tu);
    default:
      if (s.family.startsWith('b-')) return generateBass(s, tu);
      throw new Error(`Not a guitar family: ${s.family}`);
  }
}

// ───────────────────────────── catalogue ─────────────────────────────

/** Positions as keys: the note under the index finger on the low string (A = fret 5, G = 3, F = 1, C = 8, B = 7, D = 10). */
const POS_5_TO_1 = [9, 7, 5];
/** Guitar-friendly tonics (E, A, G, D, C first). */
const GKEYS_MAJOR = [7, 2, 9, 4, 0, 5, 10, 3, 11, 8, 1, 6];
const GKEYS_MINOR = [9, 4, 2, 7, 11, 0, 5, 6, 1, 8, 10, 3];
const BLUES_KEYS = [9, 4, 7, 2, 0, 5, 10];
const CYC4 = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

/** Families → ordered levels → spec templates (spec §4). */
export function guitarCatalog(): GuitarFamilyDef[] {
  const L = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], genres?: GuitarStyle[]): GuitarLevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    specs,
    keys,
    ...(genres ? { genres } : {}),
  });
  const sp =
    (family: FamilyId) =>
    (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: family === 'g-bass' ? 'bass' : 'guitar', ...o });
  const F = sp('g-fretting');
  const P = sp('g-picking');
  const LG = sp('g-legato');
  const S = sp('g-scales');
  const A = sp('g-arps');
  const C = sp('g-chords');
  const R = sp('g-rhythm');
  const E = sp('g-lead');
  const FS = sp('g-fingerstyle');
  const FL = sp('g-flamenco');
  const J = sp('g-jazz');
  const RD = sp('g-reading');
  const I = sp('g-impro');
  const B = sp('g-bass');
  const fam = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[], instruments: ('guitar' | 'bass')[] = ['guitar']): GuitarFamilyDef => ({
    id,
    title: t(en, he),
    style,
    genres,
    instruments,
    levels,
  });
  const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from);
  return [
    fam('g-fretting', 'Fretting hand', 'יד שמאל (לוחצת)', 'classical', ['all'], [
      L('g-fretting', 1, 'Chromatic 1-2-3-4, fret 5 → 1', 'כרומטי 1-2-3-4, סריג 5 ← 1', [F('spider', { option: 0 })], POS_5_TO_1),
      L('g-fretting', 2, 'Finger permutations (1243, 1324, 1342 …)', 'תמורות אצבעות (1243, 1324, 1342 …)', range(5, 1).map((o) => F('spider', { option: o })), [9]),
      L('g-fretting', 3, 'Spider (two-string crossing)', 'עכביש (מעבר בין שני מיתרים)', [F('cross')], POS_5_TO_1),
      L('g-fretting', 4, 'Chromatic walk up the neck', 'הליכה כרומטית במעלה הצוואר', [F('walk')], [5, 9]),
      L('g-fretting', 5, 'All 24 permutations in 16ths', 'כל 24 התמורות בשש-עשריות', range(24).map((o) => F('spider', { option: o, perBeat: 4 })), [9]),
      L('g-fretting', 6, 'Stretches', 'מתיחות', [F('stretch', { stretch: true })], [0, 9, 5]),
    ]),
    fam('g-picking', 'Picking', 'פריטה (יד ימין)', 'classical', ['all'], [
      L('g-picking', 1, 'Alternate picking on one string', 'פריטה מתחלפת על מיתר אחד', [P('single-string'), P('single-string', { option: 2 })], POS_5_TO_1),
      L('g-picking', 2, 'String crossing: outside, inside and pedal point', 'מעבר מיתרים: חיצוני, פנימי וצליל עוגב', [P('cross', { option: 0 }), P('cross', { option: 1 }), P('pedal'), P('pedal', { perBeat: 4 })], POS_5_TO_1),
      L('g-picking', 3, 'Scales 3 notes per string, alternate / economy', 'סולמות 3 צלילים במיתר, מתחלפת / חסכונית', [P('3nps', { option: 0, perBeat: 3, stretch: true }), P('3nps-economy', { option: 0, perBeat: 3, stretch: true }), P('3nps', { option: 4, perBeat: 3, stretch: true }), P('3nps-economy', { option: 1, perBeat: 3, stretch: true })], GKEYS_MAJOR),
      L('g-picking', 4, 'String skipping: pentatonic and octaves', 'דילוג מיתרים: פנטטוני ואוקטבות', [P('skip'), P('skip', { option: 1 })], GKEYS_MINOR),
      L('g-picking', 5, 'Tremolo picking', 'פריטת טרמולו', [P('tremolo'), P('tremolo', { option: 1 }), P('tremolo', { option: 2 })], GKEYS_MAJOR, ['rock', 'metal']),
      L('g-picking', 6, 'Sweep picking: 3-string and 5-string', 'סוויפ: 3 ו-5 מיתרים', [P('sweep3'), P('sweep5'), P('sweep5', { minor: true }), P('sweep3', { minor: true })], GKEYS_MAJOR, ['rock', 'metal']),
      L('g-picking', 7, 'Hybrid and chicken picking, banjo roll', 'פריטה היברידית, צ׳יקן פיקינג, רול בנג׳ו', [P('hybrid'), P('chicken'), P('banjo')], [7, 9, 4, 2, 0], ['country']),
    ]),
    fam('g-legato', 'Legato', 'לגאטו', 'classical', ['all'], [
      L('g-legato', 1, 'Hammer-ons, every finger pair', 'הקשות, כל זוג אצבעות', range(6).map((o) => LG('hammer', { option: o })), POS_5_TO_1),
      L('g-legato', 2, 'Pull-offs, every finger pair', 'משיכות, כל זוג אצבעות', range(6).map((o) => LG('pull', { option: o })), POS_5_TO_1),
      L('g-legato', 3, 'Trills', 'טרילים', range(6).map((o) => LG('trill', { option: o })), [9, 2]),
      L('g-legato', 4, 'Legato pentatonic', 'לגאטו פנטטוני', [LG('penta-legato')], GKEYS_MINOR),
      L('g-legato', 5, 'Legato 3 notes per string', 'לגאטו 3 צלילים במיתר', [0, 1, 4].map((o) => LG('3nps-legato', { option: o, stretch: true })), GKEYS_MAJOR),
      L('g-legato', 6, 'Two-hand tapping', 'טאפינג בשתי ידיים', [LG('tap', { minor: true }), LG('tap'), LG('tap-arp')], [9, 4, 2, 7], ['rock', 'metal']),
    ]),
    fam('g-scales', 'Scales', 'סולמות', 'classical', ['all'], [
      L('g-scales', 1, 'Minor pentatonic, box 1', 'פנטטוני מינור, תיבה 1', [S('penta', { position: 1, minor: true })], 'minor'),
      L('g-scales', 2, 'Pentatonic boxes 2–5', 'תיבות פנטטוני 2–5', [2, 3, 4, 5].map((b) => S('penta', { position: b, minor: true })), 'minor'),
      L('g-scales', 3, 'Blues scale and major pentatonic', 'סולם בלוז ופנטטוני מז׳ור', [S('blues'), S('penta', { position: 1, minor: false })], 'major'),
      L('g-scales', 4, 'Major scale: E and A shape positions', 'סולם מז׳ור: מצבי צורות E ו-A', [S('caged', { position: 0 }), S('caged', { position: 3 })], 'major'),
      L('g-scales', 5, 'Major scale in all 5 CAGED positions', 'סולם מז׳ור בכל 5 מצבי CAGED', [1, 2, 4].map((p) => S('caged', { position: p })), 'major'),
      L('g-scales', 6, '3 notes per string (7 patterns) and one-string scales', '3 צלילים במיתר (7 תבניות) וסולם על מיתר אחד', [...range(7).map((p) => S('3nps', { position: p, stretch: true })), S('one-string', { position: 3 }), S('one-string', { position: 5 })], 'major'),
      L('g-scales', 7, 'Modes, minor, symmetric and altered scales; sequences in position', 'מודוסים, סולמות מינור, סימטריים ואלטרד; רצפים במצב', [...[1, 4, 3, 2, 6, 7, 8].map((m) => S('mode', { option: m })), S('seq3', { position: 0 }), S('seq4', { position: 3 }), ...[5, 9, 10, 11].map((m) => S('mode', { option: m })), S('seq-g3', { position: 0, perBeat: 3 }), S('seq-g3', { position: 3, perBeat: 3 }), S('seq3', { position: 3 }), S('seq4', { position: 0 })], 'major'),
    ]),
    fam('g-arps', 'Arpeggios', 'ארפג׳יו', 'classical', ['all'], [
      L('g-arps', 1, 'Major and minor triads, root on 6 and 5', 'משולשים מז׳ור ומינור, יסוד על 6 ו-5', [A('triad', { position: 6 }), A('triad', { position: 5 }), A('triad', { position: 6, minor: true }), A('triad', { position: 5, minor: true })], 'major'),
      L('g-arps', 2, 'Triads in the 5 CAGED shapes', 'משולשים ב-5 צורות CAGED', range(5).map((p) => A('caged-arp', { position: p })), 'major'),
      L('g-arps', 3, 'Triad inversions on string sets', 'היפוכי משולש על קבוצות מיתרים', range(4).map((p) => A('inversions', { position: p })), 'major'),
      L('g-arps', 4, '7th arpeggios, root on 6 and 5', 'ארפג׳יו ספטאקורד, יסוד על 6 ו-5', [0, 1, 2, 3].flatMap((o) => [A('seventh', { option: o, position: 6 }), A('seventh', { option: o, position: 5 })]), CYC4),
      L('g-arps', 5, 'Diminished 7th, altered-dominant and ii–V–I arpeggios', 'ארפג׳יו מוקטן, דומיננטה אלטרד ו-ii–V–I', [A('seventh', { option: 4, position: 6 }), A('iivi-arp'), A('seventh', { option: 4, position: 5 }), ...[5, 6, 7, 8].map((o) => A('seventh', { option: o, position: 6 })), A('seventh', { option: 7, position: 5 }), A('seventh', { option: 8, position: 5 })], CYC4, ['jazz', 'rock', 'blues']),
    ]),
    fam('g-chords', 'Chords and changes', 'אקורדים והחלפות', 'classical', ['all'], [
      L('g-chords', 1, 'Open chords: every string rings', 'אקורדים פתוחים: כל מיתר מצלצל', range(8).map((o) => C('chord-check', { option: o })), [0]),
      L('g-chords', 2, 'One-minute changes (1 strum per bar)', 'החלפות בדקה (פריטה אחת לתיבה)', range(10).map((o) => C('one-minute', { option: o, perBeat: 0.25 })), [0]),
      L('g-chords', 3, 'Faster changes; 7th, sus and add9 chords', 'החלפות מהירות; אקורדי ספטימה, sus ו-add9', [...range(5).map((o) => C('one-minute', { option: o, perBeat: 0.5 })), ...range(11).map((o) => C('chord-check', { option: o, position: 7 })), ...range(6).map((o) => C('chord-check', { option: o, position: 4 }))], [0]),
      L('g-chords', 4, 'Power chords, palm-muted', 'אקורדי פאוור, מושתקים', [C('power')], [4, 9, 7, 2, 0, 5], ['rock', 'metal', 'blues', 'pop']),
      L('g-chords', 5, 'Barre chords (E and A shapes, major and minor)', 'אקורדי ברה (צורות E ו-A, מז׳ור ומינור)', [C('barre-check', { position: 6 }), C('barre-check', { position: 5 }), C('barre-check', { position: 6, minor: true }), C('barre-check', { position: 5, minor: true }), ...[0, 1, 2].flatMap((o) => [C('barre-check', { position: 6, option: o }), C('barre-check', { position: 5, option: o })])], [5, 7, 9, 10, 0, 2]),
      L('g-chords', 6, 'Barre changes and triad inversions', 'החלפות ברה והיפוכי משולש', [C('barre-changes'), C('triad-inv'), C('triad-inv', { minor: true })], GKEYS_MAJOR),
      L('g-chords', 7, 'CAGED chords up the neck', 'אקורדי CAGED במעלה הצוואר', [C('caged-chords')], GKEYS_MAJOR),
    ]),
    fam('g-rhythm', 'Rhythm guitar', 'גיטרה קצבית', 'classical', ['pop', 'rock', 'funk', 'reggae', 'country', 'latin', 'jazz', 'metal', 'blues'], [
      L('g-rhythm', 1, 'Quarters, down-up 8ths and the waltz', 'רבעים, שמיניות למטה-למעלה וואלס', [R('quarters'), R('eighths'), R('waltz')], [7, 0, 2], ['pop', 'rock', 'country']),
      L('g-rhythm', 2, 'D, DU, UDU, palm-muted 8ths and picked arpeggios', 'D, DU, UDU, שמיניות מושתקות וארפג׳יו בפריטה', [R('old-faithful'), R('rock8'), R('arp-pick')], [7, 0, 2, 9, 4], ['pop', 'rock']),
      L('g-rhythm', 3, 'Blues shuffle and country boom-chick', 'שאפל בלוז וקאנטרי בום-צ׳יק', [R('shuffle'), R('boom-chick')], [9, 4, 7, 2, 0], ['blues', 'country', 'rock']),
      L('g-rhythm', 4, 'Reggae and ska off-beats', 'רגאיי וסקא על ה"וְ"', [R('reggae'), R('ska')], [7, 0, 2, 9], ['reggae', 'pop']),
      L('g-rhythm', 5, '16th funk with muted ghosts and chord stabs', 'פאנק בשש-עשריות עם פריטות מושתקות ודקירות אקורד', [R('funk16'), R('funk-stabs')], [4, 9, 2, 7], ['funk']),
      L('g-rhythm', 6, 'Bossa nova, clave and four to the bar', 'בוסה נובה, קלאווה וארבע לתיבה', [R('bossa'), R('freddie'), R('clave')], CYC4.slice(0, 6), ['latin', 'jazz']),
      L('g-rhythm', 7, 'Metal gallop and chugs (drop D)', 'גאלופ וצ׳אגים במטאל (Drop D)', [R('gallop'), R('chug')], [2, 4, 7, 9], ['metal']),
    ]),
    fam('g-lead', 'Lead techniques', 'טכניקות סולו', 'classical', ['rock', 'blues', 'metal', 'pop', 'country', 'funk'], [
      L('g-lead', 1, 'Slides and natural harmonics', 'החלקות והרמוניות טבעיות', [E('slides'), E('harmonics'), E('slides', { option: 1 }), E('slides', { option: 2 }), E('harmonics', { option: 1 }), E('harmonics', { option: 2 })], GKEYS_MINOR.slice(0, 5)),
      L('g-lead', 2, 'Half-step bends to pitch', 'כיפופי חצי טון לגובה', [E('bend', { option: 1 })], GKEYS_MINOR.slice(0, 6)),
      L('g-lead', 3, 'Whole-step bends to pitch', 'כיפופי טון שלם לגובה', [E('bend', { option: 2 })], GKEYS_MINOR.slice(0, 6)),
      L('g-lead', 4, 'Bend and release, pre-bend, unison bends', 'כיפוף ושחרור, כיפוף מוקדם, כיפופי יוניסון', [E('bend', { option: 2, position: 1 }), E('prebend'), E('unison', { option: 0 }), E('unison', { option: 1 })], GKEYS_MINOR.slice(0, 6)),
      L('g-lead', 5, 'Vibrato: narrow and wide', 'ויברטו: צר ורחב', [E('vibrato', { option: 0 }), E('vibrato', { option: 1 })], GKEYS_MINOR.slice(0, 6)),
      L('g-lead', 6, 'Double stops in 3rds and 6ths', 'צלילים כפולים בטרצות ובסקסטות', [E('double-stops', { option: 0 }), E('double-stops', { option: 1 })], GKEYS_MAJOR.slice(0, 6)),
      L('g-lead', 7, 'B.B. King box and 1½-step bends', 'הקופסה של בי.בי. קינג וכיפופי טון וחצי', [E('bb-box'), E('bend', { option: 3 })], BLUES_KEYS),
    ]),
    fam('g-fingerstyle', 'Fingerstyle', 'פריטת אצבעות', 'classical', ['fingerstyle', 'classical', 'country', 'pop'], [
      L('g-fingerstyle', 1, 'Thumb bass and p-i-m-a', 'בס אגודל ו-p-i-m-a', [FS('thumb'), FS('pima', { option: 0 })], [0, 7, 9]),
      L('g-fingerstyle', 2, 'Basic arpeggio patterns', 'תבניות ארפג׳יו בסיסיות', [1, 2, 3].map((o) => FS('pima', { option: o })), [0, 7, 9, 4, 2]),
      L('g-fingerstyle', 3, 'Giuliani-style right-hand patterns', 'תבניות יד ימין בסגנון ג׳וליאני', range(6, 4).map((o) => FS('pima', { option: o })), [0, 9, 4]),
      L('g-fingerstyle', 4, 'Travis picking', 'פריטת טראוויס', [FS('travis'), FS('pima', { option: 9 })], [0, 7, 2, 9, 4], ['fingerstyle', 'country', 'pop']),
      L('g-fingerstyle', 5, 'Rest stroke and free stroke scales; slurs (ligados); campanella', 'סולמות במכה נשענת וחופשית; לגאדו; קמפנלה', [...range(4).map((o) => FS('scale-stroke', { option: o })), FS('ligado', { option: 0 }), FS('ligado', { option: 1 }), FS('campanella')], GKEYS_MAJOR, ['classical', 'fingerstyle']),
      L('g-fingerstyle', 6, 'Tremolo p-a-m-i', 'טרמולו p-a-m-i', [FS('tremolo')], [9, 4, 0], ['classical']),
    ]),
    fam('g-flamenco', 'Flamenco', 'פלמנקו', 'classical', ['flamenco'], [
      L('g-flamenco', 1, 'Four-stroke rasgueado', 'ראסגאדו בארבע מכות', [FL('rasgueado'), FL('rasgueado', { option: 1 })], [4, 9]),
      L('g-flamenco', 2, 'Triplet rasgueado', 'ראסגאדו בטריולות', [FL('rasg-triplet')], [4, 9]),
      L('g-flamenco', 3, 'Picado', 'פיקאדו', [FL('picado'), FL('picado', { option: 1 })], [4, 9, 11]),
      L('g-flamenco', 4, 'Alzapúa', 'אלסאפואה', [FL('alzapua')], [4, 9]),
      L('g-flamenco', 5, 'Compás: soleá, bulería, seguiriya, rumba', 'קומפאס: סולאה, בולריאה, סגיריה, רומבה', [FL('compas'), FL('compas', { option: 1 }), FL('compas', { option: 2 }), FL('compas', { option: 3 })], [4, 9]),
    ]),
    fam('g-jazz', 'Jazz guitar', 'גיטרת ג׳אז', 'jazz', ['jazz', 'latin'], [
      L('g-jazz', 1, 'Shell voicings ii–V–I, four to the bar and comping rhythms', 'קונכיות ii–V–I, ארבע לתיבה ומקצבי ליווי', [J('shells', { option: 0 }), J('shells', { option: 1 }), J('comp', { option: 0, swing: true }), J('comp', { option: 1, swing: true })], CYC4),
      L('g-jazz', 2, 'Drop-2 inversions (maj7, 7, m7, m7♭5) on three string sets', 'היפוכי דרופ 2 (maj7, 7, m7, m7♭5) על שלוש קבוצות מיתרים', [...range(4).map((o) => J('drop2', { option: o })), ...range(4).flatMap((o) => [J('drop2', { option: o, position: 1 }), J('drop2', { option: o, position: 2 })])], CYC4),
      L('g-jazz', 3, 'Drop-3 ii–V–I', 'ii–V–I בדרופ 3', [J('drop3')], CYC4),
      L('g-jazz', 4, 'Drop-2 ii–V–I, voice-led', 'ii–V–I בדרופ 2, הובלת קולות', [J('iivi-drop2')], CYC4),
      L('g-jazz', 5, 'Guide-tone lines', 'קווי צלילים מנחים', [J('guide-tones', { option: 0 }), J('guide-tones', { option: 1 })], CYC4),
      L('g-jazz', 6, 'Walking bass on guitar', 'בס מהלך על גיטרה', [J('walking')], CYC4),
      L('g-jazz', 7, 'Harmonized scale in drop-2 (chord melody) and octaves', 'סולם מהורמן בדרופ 2 (אקורד-מלודיה) ואוקטבות', [J('harmonized'), J('octaves')], CYC4.slice(0, 6)),
    ]),
    fam('g-reading', 'Reading by position', 'קריאה לפי מצבים', 'classical', ['all'], [
      L('g-reading', 1, 'Position I, strings 1–3', 'מצב I, מיתרים 1–3', [RD('position', { position: 1, option: 1 })], [0]),
      L('g-reading', 2, 'Position I, all strings', 'מצב I, כל המיתרים', [RD('position', { position: 1 })], [0, 7, 5]),
      L('g-reading', 3, 'Positions II and V', 'מצבים II ו-V', [RD('position', { position: 2 }), RD('position', { position: 5 })], [0, 7, 2, 5]),
      L('g-reading', 4, 'Position VII and mixed rhythms', 'מצב VII ומקצבים מעורבים', [RD('position', { position: 7 }), RD('position', { position: 5, perBeat: 2 })], [0, 7, 2, 9, 5, 10]),
      L('g-reading', 5, 'Positions IX and XII', 'מצבים IX ו-XII', [RD('position', { position: 9 }), RD('position', { position: 12, perBeat: 2 })], GKEYS_MAJOR),
    ]),
    fam('g-impro', 'Improvising: target notes', 'אלתור: צלילי מטרה', 'jazz', ['blues', 'rock', 'jazz', 'all'], [
      L('g-impro', 1, 'Roots on beat 1: blues, minor blues, ii–V–I, a standard', 'יסודות על 1: בלוז, בלוז מינורי, ii–V–I, סטנדרט', [I('targets-root'), I('targets-root', { option: 1 }), I('targets-root', { option: 2 }), I('targets-root', { option: 3 })], BLUES_KEYS),
      L('g-impro', 2, '3rds on beat 1 through the forms', 'טרצות על 1 לאורך הצורות', [I('targets-third'), I('targets-third', { option: 1 }), I('targets-third', { option: 2 }), I('targets-third', { option: 3 })], BLUES_KEYS),
      L('g-impro', 3, 'Chord-tone arpeggios through the form', 'ארפג׳יו צלילי אקורד לאורך הצורה', [I('targets-arp'), I('targets-arp', { option: 1 }), I('targets-arp', { option: 2 }), I('targets-arp', { option: 3 })], BLUES_KEYS),
      L('g-impro', 4, 'Guide tones through the form', 'צלילים מנחים לאורך הצורה', [I('targets-guide'), I('targets-guide', { option: 1 }), I('targets-guide', { option: 2 }), I('targets-guide', { option: 3 })], BLUES_KEYS),
    ]),
    // The 0.4x starter bass family: superseded by the b-* course families below (BASS_CURRICULUM §10.1). Kept, retired,
    // so old item ids, badges and frozen path units (tech:g-bass-*) stay valid.
    {
      ...fam(
      'g-bass',
      'Bass guitar',
      'גיטרה בס',
      'classical',
      ['all'],
      [
        L('g-bass', 1, 'Chromatic 1-2-3-4 and finger permutations', 'כרומטי 1-2-3-4 ותמורות אצבעות', [B('spider', { option: 0 }), B('spider', { option: 1 }), B('spider', { option: 3 })], POS_5_TO_1),
        L('g-bass', 2, 'Major, natural minor, Dorian, Mixolydian, minor pentatonic and blues', 'מז׳ור, מינור טבעי, דורי, מיקסולידי, פנטטוני מינור ובלוז', [B('major'), B('penta'), B('penta', { option: 1 }), B('mode', { option: 5 }), B('mode', { option: 1 }), B('mode', { option: 4 })], GKEYS_MAJOR),
        L('g-bass', 3, 'Grooves: root–5th–octave, ghost notes, rock 8ths, Motown, tumbao', 'גרובים: יסוד–קווינטה–אוקטבה, צלילי רפאים, שמיניות רוק, מוטאון, טומבאו', [B('r58'), B('ghost'), B('groove', { option: 0 }), B('groove', { option: 1 }), B('groove', { option: 2 })], GKEYS_MAJOR),
        L('g-bass', 4, 'Arpeggios: triads and 7ths', 'ארפג׳יו: משולשים וספטאקורדים', [B('arp'), B('arp', { option: 0 }), B('arp', { option: 1 }), B('arp', { option: 2 })], GKEYS_MAJOR),
        L('g-bass', 5, 'Octaves and slap (disco / funk)', 'אוקטבות וסלאפ (דיסקו / פאנק)', [B('octaves'), B('slap'), B('slap', { option: 1 })], [4, 9, 2, 7, 0, 5]),
        L('g-bass', 6, 'Walking bass: ii–V–I and the blues', 'בס מהלך: ii–V–I והבלוז', [B('walking'), B('walk-blues')], CYC4),
      ],
      ['bass'],
    ),
      retired: true,
    },
    // The bass course (BASS_CURRICULUM §5), in teaching order.
    ...bassFamilies(),
  ];
}

/** Is this family / level shown for a guitar style filter? */
export function guitarStyleMatch(genres: GuitarStyle[] | undefined, style: GuitarStyle | undefined): boolean {
  if (!style || style === 'all' || !genres) return true;
  return genres.includes('all') || genres.includes(style);
}

/**
 * Level-test probes for guitar (spec §9): one tempo staircase per main family. Each probe is a spec (key included);
 * the UI raises the tempo 15–20 % after each clean take, the last clean tempo seeds the family.
 */
export interface TechProbe {
  family: FamilyId;
  spec: DrillSpec;
  title: T2;
  instruments: ('guitar' | 'bass')[];
  /** Other families this probe also places (same level as the probed family, capped by their length). */
  seeds?: FamilyId[];
}
export const GUITAR_PROBES: TechProbe[] = [
  { family: 'g-fretting', spec: { family: 'g-fretting', kind: 'spider', key: 9, hands: 'R', option: 0, instrument: 'guitar' }, title: t('Chromatic 1-2-3-4', 'כרומטי 1-2-3-4'), instruments: ['guitar'] },
  { family: 'g-scales', spec: { family: 'g-scales', kind: 'penta', key: 9, hands: 'R', position: 1, minor: true, instrument: 'guitar' }, title: t('A minor pentatonic box 1', 'פנטטוני לה מינור תיבה 1'), instruments: ['guitar'] },
  { family: 'g-chords', spec: { family: 'g-chords', kind: 'one-minute', key: 0, hands: 'R', option: 0, perBeat: 0.5, instrument: 'guitar' }, title: t('A ↔ D changes', 'החלפות A ↔ D'), instruments: ['guitar'] },
  { family: 'g-rhythm', spec: { family: 'g-rhythm', kind: 'eighths', key: 7, hands: 'R', instrument: 'guitar' }, title: t('Down-up 8ths', 'שמיניות למטה-למעלה'), instruments: ['guitar'] },
  { family: 'g-legato', spec: { family: 'g-legato', kind: 'trill', key: 9, hands: 'R', option: 0, instrument: 'guitar' }, title: t('Trill 1-2', 'טריל 1-2'), instruments: ['guitar'] },
  // Bass (BASS_CURRICULUM §6): the course probes replace the old single g-bass probe.
  ...BASS_PROBES,
];
