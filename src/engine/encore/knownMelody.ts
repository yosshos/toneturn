// The known-melody check (SPEC-PHRASE-STUDIO §11.6): before a phrase goes to the community, compare it with the
// melodies the app knows — the songbook, the voice songs, the heads, the Name-That-Tune openings, the public-domain
// pieces — plus a short curated list of famous riffs. A run of 6 consecutive notes with the same intervals AND the same
// rhythm (inter-onset ratios) as one of them is a match ("זה לחן מוכר?"). Riffs match on intervals alone.
//
// It cannot catch everything (the attestation and reports cover the rest), and short shared vocabulary is common
// property: runs that are only a scale in even notes, repeated notes, a trill, or an arpeggio in even notes are
// never matched. Pure; the index is built once, on first use.

import type { Lick } from '../licks';
import { SONGBOOK, songNotes } from '../../content/songbook';
import { VOICE_SONGS } from '../../content/voiceSongs';
import { HEADS } from '../../content/heads';
import { parseMelody } from '../heads';
import { SONGS, type SongOpening } from '../songs';
import { PD_TUNES } from '../pdTunes';
import { PD_PIECES, pdNotes } from '../../content/classicalPD';

type T2 = { en: string; he: string };
export interface MelNote {
  pitch: number;
  beat: number;
}
export interface KnownMatch {
  id: string;
  title: T2;
  kind: 'song' | 'head' | 'tune' | 'piece' | 'riff';
}

/** Consecutive notes that make a match. */
export const MATCH_NOTES = 6;
const MAJ = [0, 2, 4, 5, 7, 9, 11];

/** The top line: one note per onset (the highest), in time order. */
export function topLine(ns: readonly MelNote[]): MelNote[] {
  const by = new Map<number, MelNote>();
  for (const n of ns) {
    const k = Math.round(n.beat * 1000);
    const h = by.get(k);
    if (!h || n.pitch > h.pitch) by.set(k, n);
  }
  return [...by.values()].sort((a, b) => a.beat - b.beat);
}

const ratioClass = (a: number, b: number) => (a > 0 && b > 0 ? Math.max(-4, Math.min(4, Math.round(2 * Math.log2(b / a)))) : 9);

/** Every window of MATCH_NOTES notes as a key "intervals|rhythm ratios" (pitch- and tempo-free). */
export function windows(line: readonly MelNote[], withRhythm = true): string[] {
  const n = line.length;
  if (n < MATCH_NOTES) return [];
  const iv = line.slice(1).map((x, i) => Math.max(-24, Math.min(24, x.pitch - line[i].pitch)));
  const ioi = line.slice(1).map((x, i) => x.beat - line[i].beat);
  const ratio = ioi.slice(1).map((x, i) => ratioClass(ioi[i], x));
  const out: string[] = [];
  for (let i = 0; i + MATCH_NOTES <= n; i++) {
    const v = iv.slice(i, i + MATCH_NOTES - 1);
    const r = ratio.slice(i, i + MATCH_NOTES - 2);
    if (withRhythm && trivial(v, r)) continue;
    out.push(withRhythm ? `${v.join(',')}|${r.join(',')}` : v.join(','));
  }
  return out;
}

/** Common vocabulary that is never a match: repeated notes, an even scale run, a trill, an even arpeggio. */
export function trivial(v: readonly number[], r: readonly number[]): boolean {
  const even = r.every((x) => x === 0);
  if (v.every((x) => x === 0)) return true;
  const up = v.every((x) => x > 0);
  const down = v.every((x) => x < 0);
  if (even && (up || down) && v.every((x) => Math.abs(x) <= 2)) return true;
  if (even && (up || down) && v.every((x) => Math.abs(x) >= 3 && Math.abs(x) <= 5)) return true;
  if (even && v.every((x, i) => x !== 0 && Math.abs(x) <= 2 && (i === 0 || x === -v[i - 1]))) return true;
  return false;
}

// ───────────────────────────── the sources ─────────────────────────────

/** Famous riffs (intervals only — the rhythm varies between versions). Detection facts, not the music. */
export const FAMOUS_RIFFS: { id: string; title: T2; semis: number[] }[] = [
  { id: 'riff-smoke', title: { en: 'Smoke on the Water (riff)', he: 'Smoke on the Water (ריף)' }, semis: [0, 3, 5, 0, 3, 6, 5, 0, 3, 5, 3, 0] },
  { id: 'riff-seven-nation', title: { en: 'Seven Nation Army (riff)', he: 'Seven Nation Army (ריף)' }, semis: [0, 0, 3, 0, -2, -4, -5] },
  { id: 'riff-fur-elise', title: { en: 'Für Elise (opening)', he: 'לאליזה (הפתיחה)' }, semis: [0, -1, 0, -1, 0, -5, -2, -4, -7] },
  { id: 'riff-beethoven-5', title: { en: 'Beethoven 5 (motif)', he: 'בטהובן 5 (המוטיב)' }, semis: [0, 0, 0, -4, -2, -2, -2, -5] },
];

function openingLine(s: SongOpening): MelNote[] {
  const semis = s.semis ?? s.degrees.map((d) => MAJ[(((d - 1) % 7) + 7) % 7] + 12 * Math.floor((d - 1) / 7));
  let b = 0;
  return semis.map((p, i) => {
    const n = { pitch: 60 + p, beat: b };
    b += s.beats[i] ?? 1;
    return n;
  });
}
function songLine(melody: string, meter: number, minor: boolean | undefined, id: string): MelNote[] {
  try {
    return songNotes({ id, melody: melody.replace(/~/g, ''), meter, minor })
      .filter((n) => n.semi !== null)
      .map((n) => ({ pitch: 60 + (n.semi as number), beat: n.at }));
  } catch {
    return [];
  }
}

interface Index {
  rhythm: Map<string, KnownMatch>;
  riffs: Map<string, KnownMatch>;
}
let INDEX: Index | null = null;
function add(m: Map<string, KnownMatch>, keys: string[], v: KnownMatch) {
  for (const k of keys) if (!m.has(k)) m.set(k, v);
}
/** Build (once) the n-gram index of every melody the app knows. */
export function knownIndex(): Index {
  if (INDEX) return INDEX;
  const rhythm = new Map<string, KnownMatch>();
  const riffs = new Map<string, KnownMatch>();
  for (const s of SONGBOOK) add(rhythm, windows(songLine(s.melody, s.meter, s.minor, s.id)), { id: s.id, title: s.title, kind: 'song' });
  for (const s of VOICE_SONGS) add(rhythm, windows(songLine(s.melody, s.meter, s.minor, s.id)), { id: s.id, title: s.title, kind: 'song' });
  for (const h of HEADS) {
    if (!h.melody) continue;
    const { notes } = parseMelody(h.melody);
    add(rhythm, windows(topLine(notes.map((n) => ({ pitch: n.pitch, beat: n.beat })))), { id: h.id, title: h.title, kind: 'head' });
  }
  for (const s of [...SONGS, ...PD_TUNES]) add(rhythm, windows(openingLine(s)), { id: s.id, title: s.title, kind: 'tune' });
  for (const p of PD_PIECES) {
    try {
      const rh = pdNotes(p).filter((n) => n.hand === 'R' && n.voice !== 2);
      add(rhythm, windows(topLine(rh.map((n) => ({ pitch: n.midi, beat: n.start })))), { id: p.id, title: p.title, kind: 'piece' });
    } catch {
      /* a piece that does not parse is simply not indexed */
    }
  }
  for (const r of FAMOUS_RIFFS) add(riffs, windows(r.semis.map((p, i) => ({ pitch: 60 + p, beat: i })), false), { id: r.id, title: r.title, kind: 'riff' });
  INDEX = { rhythm, riffs };
  return INDEX;
}

/** The first known melody a line contains (null = none found). */
export function matchLine(line: readonly MelNote[]): KnownMatch | null {
  const ix = knownIndex();
  const top = topLine(line);
  for (const k of windows(top)) {
    const m = ix.rhythm.get(k);
    if (m) return m;
  }
  for (const k of windows(top, false)) {
    const m = ix.riffs.get(k);
    if (m) return m;
  }
  return null;
}
/** A phrase (its right hand / line, as stored relative to the tonic) against the known melodies. */
export const knownMelody = (l: Pick<Lick, 'notes'>): KnownMatch | null => matchLine(l.notes.map(([s, b]) => ({ pitch: 60 + s, beat: b })));
