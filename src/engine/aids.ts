// Visual aids (spec addendum M): what a question may show while it is being answered, what it shows
// afterwards, and what an aid costs. Pure: notes as MIDI numbers + the key; the views draw them.

import { majorScale, pcValue, type PitchClass } from './pitch';
import type { LessonDef, Question, SkillId } from './lesson';
import { questionSkill } from './lesson';
import type { Ratings } from './rating';

export type AidKind = 'keymap' | 'target' | 'lookup';
export type AidMode = 'auto' | 'always' | 'never';
export type NoteView = 'keyboard' | 'staff' | 'tab';

/** Difficulty lowered when an aid is on (rating points), and the XP factor (spec M.3). */
export const AID_DISCOUNT: Record<AidKind, number> = { keymap: 120, target: 150, lookup: 150 };
export const AID_XP_FACTOR = 0.8;
/** Auto: aids while the skill is below Solid. */
export const AID_AUTO_BELOW = 1100;

const keyOf = (q: Question): PitchClass | null => ('key' in q ? (q.key as PitchClass) : null);

/** The key's scale (one octave from the tonic near middle C) — for key maps and lookups. */
export function scaleMidis(key: PitchClass): number[] {
  const tonic = 60 + ((pcValue(key) % 12) + 12) % 12 - (pcValue(key) > 5 ? 12 : 0);
  return [0, 2, 4, 5, 7, 9, 11].map((s) => tonic + s);
}

/** A lookup marks only the tonic as "1": the player still counts to the answer (it must not be read off). */
const TONIC_ONLY = ['1', '', '', '', '', '', ''];

export interface Aid {
  kind: AidKind;
  /** Notes to mark while answering. */
  notes: number[];
  /** Degree numbers for a lookup (same order as notes). */
  labels?: string[];
  key: PitchClass | null;
}

/** The aid a question can get without giving the answer away, or null. */
export function aidFor(q: Question): Aid | null {
  const key = keyOf(q);
  switch (q.kind) {
    case 'degree':
      if (!key) return null;
      return q.direction === 'name→degree' ? { kind: 'lookup', notes: scaleMidis(key), labels: TONIC_ONLY, key } : { kind: 'keymap', notes: scaleMidis(key), key };
    case 'note-name':
      return q.direction === 'degree→name' ? { kind: 'lookup', notes: scaleMidis(q.key), labels: TONIC_ONLY, key: q.key } : { kind: 'keymap', notes: scaleMidis(q.key), key: q.key };
    case 'degree-seq':
      return q.given === 'names' ? { kind: 'lookup', notes: scaleMidis(q.key), labels: TONIC_ONLY, key: q.key } : { kind: 'keymap', notes: scaleMidis(q.key), key: q.key };
    case 'name-seq':
      return q.given === 'degrees' ? { kind: 'lookup', notes: scaleMidis(q.key), labels: TONIC_ONLY, key: q.key } : { kind: 'keymap', notes: scaleMidis(q.key), key: q.key };
    case 'sing':
      return q.promptBy === 'echo' ? null : { kind: 'target', notes: [q.targetMidi], key: q.key };
    case 'sing-seq':
      return { kind: 'target', notes: q.midis, key: q.key };
    case 'sing-run':
      return q.prompt === 'told' ? { kind: 'target', notes: q.midis, key: q.key } : null;
    default:
      return null;
  }
}

/** Should aids be on for this skill? */
export function aidsOn(mode: AidMode, skill: SkillId, ratings: Ratings): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  const r = ratings[skill];
  return !r || r.n === 0 || r.r < AID_AUTO_BELOW;
}

/** Lessons that never get aids: placement (it measures) and the daily / tournament items. */
const NO_AIDS = new Set(['placement', 'weekly-puzzle']);

/** Mark questions that will show an aid and lower their difficulty accordingly. */
export function withAids(lesson: LessonDef, mode: AidMode, ratings: Ratings): LessonDef {
  if (NO_AIDS.has(lesson.id)) return lesson;
  return {
    ...lesson,
    questions: lesson.questions.map((q) => {
      const aid = aidFor(q);
      if (!aid || !aidsOn(mode, questionSkill(q), ratings)) return q;
      return { ...q, aid: aid.kind, difficulty: q.difficulty - AID_DISCOUNT[aid.kind] };
    }),
  };
}

/** What the views show once the question is answered (the notes that sounded, as content). */
export function contentNotes(q: Question): { notes: number[]; chord: boolean } | null {
  switch (q.kind) {
    case 'mode-id':
    case 'wrong-note':
      return { notes: q.midis, chord: false };
    case 'abs-note':
      return { notes: [q.midi], chord: false };
    case 'choice':
      return q.show ? { notes: q.show.midis, chord: !!q.show.chord } : null;
    case 'degree':
    case 'note-name':
    case 'sing':
      return { notes: [q.targetMidi], chord: false };
    case 'degree-seq':
    case 'name-seq':
    case 'sing-seq':
    case 'sing-run':
    case 'run-id':
      return { notes: q.midis, chord: false };
    case 'quality':
    case 'seventh':
    case 'inversion':
    case 'interval': {
      const ch = q.stimulus.find((s) => s.kind === 'chord');
      if (ch && ch.kind === 'chord') return { notes: [...ch.midis].sort((a, b) => a - b), chord: q.kind !== 'interval' || !ch.arpeggio };
      const ns = q.stimulus.find((s) => s.kind === 'notes');
      if (ns && ns.kind === 'notes') return { notes: ns.midis, chord: false };
      return null;
    }
    default:
      return null;
  }
}

/** Spell a MIDI note in a key (diatonic notes by the key's letters; others with flats, or sharps in sharp keys). */
export function spellMidi(midi: number, key: PitchClass | null): { letter: string; acc: -1 | 0 | 1; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const scale = key ? majorScale(key) : null;
  const hit = scale?.find((p) => pcValue(p) === pc);
  const sharpKey = key ? ['G', 'D', 'A', 'E', 'B'].includes(key.letter) && key.acc === 0 : false;
  const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  let letter: string;
  let acc: -1 | 0 | 1;
  if (hit) {
    letter = hit.letter;
    acc = hit.acc as -1 | 0 | 1;
  } else {
    const n = (sharpKey ? SHARPS : FLATS)[pc];
    letter = n[0];
    acc = n.length > 1 ? (n[1] === '♯' ? 1 : -1) : 0;
  }
  // Octave from the letter's natural pitch (B♯ / C♭ edge cases shift the octave).
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter as 'C']!;
  const octave = Math.round((midi - acc - natural) / 12) - 1;
  return { letter, acc, octave };
}

/**
 * Positions for a passage played in one hand position (frets p … p+4, open strings allowed at p ≤ 1),
 * the lowest position that holds every note; notes that fit nowhere fall back to guitarPosition.
 */
export function guitarPositions(midis: number[]): { str: number; fret: number }[] {
  const ms = midis.map((m) => {
    let x = m;
    while (x < 40) x += 12;
    while (x > 64 + 15) x -= 12;
    return x;
  });
  for (let p = 0; p <= 12; p++) {
    const lo = p <= 1 ? 0 : p;
    const out: { str: number; fret: number }[] = [];
    for (const m of ms) {
      let best: { str: number; fret: number } | null = null;
      STRINGS.forEach((open, i) => {
        const fret = m - open;
        if (fret >= lo && fret <= p + 4 && (!best || i < best.str - 1)) best = { str: i + 1, fret };
      });
      if (!best) break;
      out.push(best);
    }
    if (out.length === ms.length) return out;
  }
  return ms.map(guitarPosition);
}

/** Guitar position for a note: standard tuning, first position when it fits (spec M.4). */
const STRINGS = [64, 59, 55, 50, 45, 40]; // string 1 (high E) … 6 (low E)
export function guitarPosition(midi: number): { str: number; fret: number } {
  let m = midi;
  while (m < 40) m += 12;
  while (m > 64 + 15) m -= 12;
  // Prefer the lowest fret within 0–4; among equal frets, the higher string.
  let best: { str: number; fret: number } | null = null;
  STRINGS.forEach((open, i) => {
    const fret = m - open;
    if (fret < 0 || fret > 4) return;
    if (!best || fret < best.fret) best = { str: i + 1, fret };
  });
  if (best) return best;
  // Above first position: on the high E string (or the highest string that reaches it).
  for (let i = 0; i < STRINGS.length; i++) if (m - STRINGS[i] >= 0) return { str: i + 1, fret: m - STRINGS[i] };
  return { str: 6, fret: 0 };
}
