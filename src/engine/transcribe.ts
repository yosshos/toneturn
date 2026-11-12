// Transcription coach (docs/SPEC-LICKS-TRANSCRIPTION.md): hear a phrase, loop and slow it, play or sing it back and
// get a note-by-note comparison (pitch + rhythm, and where it went wrong), write it as degrees, then play it in 12
// keys. Levels run from 2-note motifs to 4-bar bebop phrases. Pure.
//
// Material: phrases generated here from rules, public-domain melodies (the songbook), and the app's own licks. No
// recording or published transcription is used.

import { SONGBOOK, songNotes } from '../content/songbook';
import { LICKS, lickPitches, type Lick, type LickChord } from './licks';
import type { RatingEvent } from './rating';

type T2 = { en: string; he: string };
export interface PNote {
  midi: number;
  /** Onset in beats from the phrase's first note's bar start. */
  beat: number;
  dur: number;
}
export interface Phrase {
  id: string;
  level: number;
  /** Tonic pitch class the degrees are named from. */
  key: number;
  minor: boolean;
  notes: PNote[];
  /** Chords under it (semitones above the key + quality + beats), when it has a harmony. */
  chords: LickChord[] | null;
  swing: boolean;
  bpm: number;
  source: 'generated' | 'public-domain' | 'lick' | 'own';
  title: T2;
}

export const TX_LEVELS: { level: number; name: T2; notes: T2 }[] = [
  { level: 1, name: { en: 'Two-note motifs', he: 'מוטיבים של שני צלילים' }, notes: { en: '2 notes', he: '2 צלילים' } },
  { level: 2, name: { en: 'Three-note motifs', he: 'מוטיבים של שלושה צלילים' }, notes: { en: '3 notes', he: '3 צלילים' } },
  { level: 3, name: { en: 'One bar in the scale', he: 'תיבה אחת בסולם' }, notes: { en: '4–5 notes', he: '4–5 צלילים' } },
  { level: 4, name: { en: 'Folk-tune openings', he: 'פתיחות של שירי עם' }, notes: { en: '2 bars', he: '2 תיבות' } },
  { level: 5, name: { en: 'Chord tones over a 7th chord', he: 'צלילי אקורד מעל ספטאקורד' }, notes: { en: '1 bar, swing', he: 'תיבה, סווינג' } },
  { level: 6, name: { en: 'Lines with approach notes', he: 'קווים עם צלילי גישה' }, notes: { en: '2 bars', he: '2 תיבות' } },
  { level: 7, name: { en: 'Blues phrases', he: 'משפטי בלוז' }, notes: { en: '2 bars', he: '2 תיבות' } },
  { level: 8, name: { en: 'Bebop phrases', he: 'משפטי ביבופ' }, notes: { en: '3–4 bars', he: '3–4 תיבות' } },
  // PIANO_AUDIT P3: learn a solo phrase by ear (on the keys path) — a short ii–V–I line, generated from rules.
  { level: 9, name: { en: 'A solo phrase over ii–V–I', he: 'משפט סולו על ii–V–I' }, notes: { en: '1½ bars, swing', he: 'תיבה וחצי, סווינג' } },
];

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const mod = (n: number, m = 12) => ((n % m) + m) % m;
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Diatonic degree index (0 = tonic, may be negative / above 6) → semitones. */
const deg = (i: number) => MAJ[mod(i, 7)] + 12 * Math.floor(i / 7);

/** The phrase of a level for a seed (deterministic). Tonic pitch around C4. */
export function phraseFor(level: number, seed: number): Phrase {
  const r = rng(seed * 7919 + level * 104729);
  const lv = Math.max(1, Math.min(9, Math.round(level)));
  const key = pick(r, [0, 2, 5, 7, 10, 3, 9]);
  const tonic = 60 + key - (key > 6 ? 12 : 0);
  const id = `tx${lv}-${seed}`;
  const gen = (notes: PNote[], extra: Partial<Phrase> = {}): Phrase => ({ id, level: lv, key, minor: false, notes, chords: null, swing: false, bpm: 84, source: 'generated', title: TX_LEVELS[lv - 1].name, ...extra });
  if (lv === 1) {
    // Tonic and one more scale note (up or down, up to an octave), two quarters — or two halves.
    const to = pick(r, [1, 2, 3, 4, 5, 7, -1, -2, -3]);
    const dur = pick(r, [1, 2]);
    return gen([{ midi: tonic, beat: 0, dur }, { midi: tonic + deg(to), beat: dur, dur }]);
  }
  if (lv === 2) {
    // Three notes: steps and skips inside a 6th, starting on a tonic-chord tone; rhythm q q h or e e q.
    for (let t = 0; t < 20; t++) {
      const a = pick(r, [0, 2, 4]);
      const b = a + pick(r, [-2, -1, 1, 2]);
      const c = b + pick(r, [-2, -1, 1, 2]);
      if (c === a || Math.max(a, b, c) - Math.min(a, b, c) > 5) continue;
      const rh = pick(r, [[1, 1, 2], [0.5, 0.5, 1], [1, 0.5, 1.5]]);
      let beat = 0;
      return gen([a, b, c].map((d, i) => {
        const n = { midi: tonic + deg(d), beat, dur: rh[i] };
        beat += rh[i];
        return n;
      }));
    }
  }
  if (lv === 3) {
    // One bar: 4–5 scale notes, mostly steps, eighths and quarters filling 4 beats, ending on a tonic-chord tone.
    const rhythms = [[1, 1, 1, 1], [0.5, 0.5, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2], [1, 1, 0.5, 0.5, 1]];
    const rh = pick(r, rhythms);
    let d = pick(r, [0, 2, 4]);
    const ds = [d];
    for (let i = 1; i < rh.length; i++) {
      d += pick(r, [-1, -1, 1, 1, 2, -2]);
      ds.push(d);
    }
    ds[ds.length - 1] = [0, 2, 4, 7].reduce((a, b) => (Math.abs(b - ds[ds.length - 2]) < Math.abs(a - ds[ds.length - 2]) ? b : a));
    let beat = 0;
    return gen(ds.map((x, i) => {
      const n = { midi: tonic + deg(x), beat, dur: rh[i] };
      beat += rh[i];
      return n;
    }));
  }
  if (lv === 4) {
    // The first two bars of a public-domain song from the songbook, in its own key.
    const songs = SONGBOOK.filter((s) => songNotes(s).filter((n) => n.semi !== null).length >= 5);
    const s = songs[Math.floor(r() * songs.length)];
    const all = songNotes(s);
    const firstOn = all.find((n) => n.semi !== null)!.at;
    const bar0 = Math.floor(firstOn / s.meter) * s.meter;
    const notes = all.filter((n) => n.semi !== null && n.at >= firstOn && n.at < bar0 + 2 * s.meter + (firstOn - bar0)).slice(0, 10);
    const t0 = 60 + s.key - (s.key > 6 ? 12 : 0);
    return {
      id: `tx4-${s.id}`,
      level: 4,
      key: s.key,
      minor: !!s.minor,
      notes: notes.map((n) => ({ midi: t0 + n.semi!, beat: n.at - firstOn, dur: n.beats })),
      chords: null,
      swing: false,
      bpm: 84,
      source: 'public-domain',
      title: s.title,
    };
  }
  if (lv === 9) return soloPhrase(r, key, tonic, id);
  // Levels 5–8: jazz phrases from the app's own licks (over their chords), or chord-tone bars generated here.
  const lickLevel = (l: Lick) => (lv === 5 ? l.level <= 1 && l.notes.length <= 9 : lv === 6 ? (l.ctx === 'enclosure' || l.ctx === 'dominant' || l.ctx === 'major-251') && l.level <= 3 : lv === 7 ? l.ctx === 'blues' : l.level >= 3 && l.notes.length >= 12);
  if (lv === 5 && r() < 0.5) {
    // An arpeggio of a 7th chord through one bar (swung eighths), ending on a chord tone.
    const q = pick(r, ['maj7', 'm7', '7'] as const);
    const ct = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] }[q];
    const up = r() < 0.5;
    const start = Math.floor(r() * 4);
    const seq = Array.from({ length: 7 }, (_, i) => {
      const k = up ? start + i : start + 3 - i;
      return ct[mod(k, 4)] + 12 * Math.floor(k / 4);
    });
    const notes = seq.map((s, i) => ({ midi: tonic + s, beat: i * 0.5, dur: i === 6 ? 1 : 0.5 }));
    return gen(notes, { swing: true, chords: [[0, q, 4]], bpm: 96, minor: q === 'm7' });
  }
  const pool = LICKS.filter(lickLevel);
  const l = pool[Math.floor(r() * pool.length)];
  const ps = lickPitches(l, key, 'piano');
  return {
    id: `tx${lv}-${l.id}-${key}`,
    level: lv,
    key,
    minor: LicksMinor(l),
    notes: l.notes.map((n, i) => ({ midi: ps[i], beat: n[1], dur: n[2] })),
    chords: l.chords,
    swing: !l.straight,
    bpm: lv >= 8 ? 104 : 96,
    source: 'lick',
    title: l.name,
  };
}
/**
 * Level 9: a solo phrase over a one-bar ii–V into I (own material, generated from rules): the ii arpeggiated in four
 * swung eighths (from its root or its 3rd, up or down), the V as four eighths of the bebop dominant descending from the
 * chord tone nearest — chord tones on the beats, the passing half step between them — and the I's chord tone nearest
 * that, held. Semitones are above the key's tonic.
 */
function soloPhrase(r: () => number, key: number, tonic: number, id: string): Phrase {
  const iiArp = pick(r, [[2, 5, 9, 12], [5, 9, 12, 16], [12, 9, 5, 2], [16, 12, 9, 5]]);
  // the G bebop dominant descending (in C), over three octaves; even indices are the V7's chord tones
  const BEBOP = [24, 12, 0].flatMap((o) => [7, 6, 5, 4, 2, 0, -1, -3].map((x) => x + o)).filter((x) => x <= 19 && x >= -5);
  const last = iiArp[3];
  const starts = BEBOP.map((x, i) => ({ x, i })).filter(({ x, i }) => i % 2 === 0 && i + 4 < BEBOP.length && x !== last && Math.abs(x - last) <= 3);
  const s = starts.length ? pick(r, starts) : { x: BEBOP[0], i: 0 };
  const v = BEBOP.slice(s.i, s.i + 4);
  const after = BEBOP[s.i + 4];
  // the I's chord tone nearest the step after the line (a 3rd, 5th, 7th or root)
  const I = [-1, 0, 4, 7, 11, 12, 16, 19];
  const target = I.filter((x) => x !== v[3]).reduce((a, b) => (Math.abs(b - after) < Math.abs(a - after) || (Math.abs(b - after) === Math.abs(a - after) && b > a) ? b : a));
  const notes: PNote[] = [...iiArp, ...v].map((x, i) => ({ midi: tonic + x, beat: i * 0.5, dur: 0.5 }));
  notes.push({ midi: tonic + target, beat: 4, dur: 2 });
  return { id, level: 9, key, minor: false, notes, chords: [[2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]], swing: true, bpm: 112, source: 'generated', title: TX_LEVELS[8].name };
}
const LicksMinor = (l: Lick) => {
  const q = l.chords[l.chords.length - 1][1];
  return q === 'm6' || q === 'm7';
};

export const phraseBeats = (p: Phrase): number => Math.max(...p.notes.map((n) => n.beat + n.dur));

// ───────────────────────────── the comparison ─────────────────────────────

/** A note the player played or sang: fractional MIDI is fine (the mic), times in seconds. */
export interface HeardNote {
  midi: number;
  start: number;
  end: number | null;
}
export type NoteVerdict = 'ok' | 'pitch' | 'early' | 'late' | 'missing';
export interface NoteCompare {
  target: PNote;
  heard: HeardNote | null;
  verdict: NoteVerdict;
  /** Semitones off (after the take's octave shift), null when missing. */
  semis: number | null;
  /** Onset error in beats against the fitted grid (+ = late). */
  beatErr: number | null;
}
export interface PhraseResult {
  notes: NoteCompare[];
  /** Extra notes played that match nothing. */
  extra: number;
  /** The whole take sat this many octaves off (sung an octave down …); not a mistake. */
  octave: number;
  pitchAcc: number;
  rhythmAcc: number;
  score: number;
  verdict: 'clean' | 'almost' | 'not';
  /** Index of the first note that went wrong (−1 = none) and what went wrong there. */
  first: { i: number; what: NoteVerdict | 'extra' } | null;
  /** Played tempo relative to the phrase (1 = as given): rhythm is judged on the player's own pulse. */
  tempo: number;
  why: T2;
}

/**
 * Compare a phrase with what was heard. Alignment by dynamic programming (a note can be missing, an extra note can be
 * skipped); pitch octave-folded to the take's overall octave; rhythm on the player's own pulse — the onsets are fitted
 * to the phrase's beats by least squares (start + beat × beat length, the length kept within 0.6–1.7× the given
 * tempo), so a steady player who is a little slower is not wrong. A note is right within ±40 ¢ (±0.4 semitone) and
 * within a quarter of a beat (an eighth at level 1–2).
 */
export function comparePhrase(p: Phrase, heard0: HeardNote[], bpm = p.bpm, o: { pitchTol?: number; beatTol?: number } = {}): PhraseResult {
  const T = p.notes;
  const heard = heard0.filter((h) => Number.isFinite(h.midi)).sort((a, b) => a.start - b.start);
  const pitchTol = o.pitchTol ?? 0.4;
  const beatTol = o.beatTol ?? (p.level <= 2 ? 0.35 : 0.26);
  // The take's octave: the octave shift that makes most notes' pitch classes line up in order.
  let octave = 0;
  if (heard.length) {
    const votes = new Map<number, number>();
    const n = Math.min(heard.length, T.length);
    for (let i = 0; i < n; i++) {
      const d = Math.round((heard[i].midi - T[i].midi) / 12);
      votes.set(d, (votes.get(d) ?? 0) + 1);
    }
    octave = [...votes.entries()].sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]))[0][0];
  }
  const off = (h: HeardNote, t: PNote) => h.midi - 12 * octave - t.midi;
  // DP alignment on pitch: cost 0 for a match within tolerance, 0.6 for a wrong pitch, 1 for a skip.
  const n = T.length;
  const m = heard.length;
  const D: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  const B: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  D[0][0] = 0;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      if (i < n && D[i][j] + 1 < D[i + 1][j]) {
        D[i + 1][j] = D[i][j] + 1;
        B[i + 1][j] = 1; // target missing
      }
      if (j < m && D[i][j] + 0.9 < D[i][j + 1]) {
        D[i][j + 1] = D[i][j] + 0.9;
        B[i][j + 1] = 2; // extra heard
      }
      if (i < n && j < m) {
        const c = Math.abs(off(heard[j], T[i])) <= pitchTol ? 0 : 0.6 + Math.min(0.3, Math.abs(off(heard[j], T[i])) / 40);
        if (D[i][j] + c < D[i + 1][j + 1]) {
          D[i + 1][j + 1] = D[i][j] + c;
          B[i + 1][j + 1] = 3;
        }
      }
    }
  const pair: (number | null)[] = T.map(() => null);
  let extra = 0;
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const b = B[i][j];
    if (b === 3) {
      pair[i - 1] = j - 1;
      i--;
      j--;
    } else if (b === 1) i--;
    else {
      extra++;
      j--;
    }
  }
  // Fit start + beat × len to the matched onsets.
  const beatS = 60 / bpm;
  const xs: number[] = [];
  const ys: number[] = [];
  pair.forEach((j, i) => {
    if (j !== null) {
      xs.push(T[i].beat);
      ys.push(heard[j].start);
    }
  });
  let len = beatS;
  let t0 = ys.length ? ys[0] - xs[0] * beatS : 0;
  if (xs.length >= 3) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxx = 0;
    let sxy = 0;
    for (let k = 0; k < xs.length; k++) {
      sxx += (xs[k] - mx) ** 2;
      sxy += (xs[k] - mx) * (ys[k] - my);
    }
    if (sxx > 1e-9) len = Math.max(0.6 * beatS, Math.min(1.7 * beatS, sxy / sxx));
    t0 = my - len * mx;
  }
  const notes: NoteCompare[] = T.map((t, i) => {
    const j = pair[i];
    if (j === null) return { target: t, heard: null, verdict: 'missing', semis: null, beatErr: null };
    const h = heard[j];
    const semis = Math.round(off(h, t) * 100) / 100;
    const beatErr = Math.round(((h.start - t0) / len - t.beat) * 1000) / 1000;
    const verdict: NoteVerdict = Math.abs(semis) > pitchTol ? 'pitch' : beatErr > beatTol ? 'late' : beatErr < -beatTol ? 'early' : 'ok';
    return { target: t, heard: h, verdict, semis, beatErr };
  });
  const pitched = notes.filter((x) => x.verdict !== 'missing' && x.verdict !== 'pitch').length;
  const pitchAcc = n ? pitched / n : 0;
  const timed = notes.filter((x) => x.verdict === 'ok').length;
  const rhythmAcc = pitched ? timed / pitched : 0;
  const score = Math.round(Math.max(0, pitchAcc * (0.6 + 0.4 * rhythmAcc) - Math.min(0.2, extra * 0.05)) * 1000) / 1000;
  const allOk = timed === n && extra <= Math.floor(n / 6);
  const verdict = allOk ? 'clean' : score >= 0.7 ? 'almost' : 'not';
  const fi = notes.findIndex((x) => x.verdict !== 'ok');
  const first = fi >= 0 ? { i: fi, what: notes[fi].verdict } : extra > Math.floor(n / 6) ? { i: -1, what: 'extra' as const } : null;
  return { notes, extra, octave, pitchAcc, rhythmAcc, score, verdict, first, tempo: Math.round((beatS / len) * 100) / 100, why: whyOf(notes, first, extra) };
}

function whyOf(ns: NoteCompare[], first: PhraseResult['first'], extra: number): T2 {
  if (!first) return { en: 'Every note, in time.', he: 'כל הצלילים, בזמן.' };
  if (first.what === 'extra') return { en: `${extra} extra notes — play only the phrase.`, he: `${extra} צלילים מיותרים — רק את המשפט.` };
  const k = first.i + 1;
  const x = ns[first.i];
  if (x.verdict === 'missing') return { en: `Note ${k} is missing.`, he: `צליל ${k} חסר.` };
  if (x.verdict === 'pitch') {
    const s = Math.round(x.semis ?? 0);
    const dir = s > 0 ? { en: 'too high', he: 'גבוה מדי' } : { en: 'too low', he: 'נמוך מדי' };
    return { en: `Note ${k}: ${Math.abs(s) || 'a little'}${Math.abs(s) ? ' half step' + (Math.abs(s) > 1 ? 's' : '') : ''} ${dir.en}.`, he: `צליל ${k}: ${dir.he}${Math.abs(s) ? ` ב-${Math.abs(s)} חצאי טון` : ''}.` };
  }
  return x.verdict === 'late' ? { en: `Note ${k} came late.`, he: `צליל ${k} הגיע מאוחר.` } : { en: `Note ${k} came early.`, he: `צליל ${k} הגיע מוקדם.` };
}

/** Played notes from the drills engine (ms from beat 0) → heard notes in seconds. */
export const heardOfPlayed = (ps: { pitch: number; on: number; off: number | null }[]): HeardNote[] => ps.map((p) => ({ midi: p.pitch, start: p.on / 1000, end: p.off === null ? null : p.off / 1000 }));

// ───────────────────────────── writing it down (degrees) ─────────────────────────────

export const DEGREE_NAMES = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
/** The phrase as degree names from its key (what the player writes). */
export const phraseDegrees = (p: Phrase): string[] => p.notes.map((n) => DEGREE_NAMES[mod(n.midi - p.key)]);
/** Grade written degrees (semitones above the key, 0–11) note for note. */
export function gradeDegrees(p: Phrase, written: number[]): { marks: boolean[]; ok: number; total: number } {
  const marks = p.notes.map((n, i) => written[i] !== undefined && mod(written[i]) === mod(n.midi - p.key));
  return { marks, ok: marks.filter(Boolean).length, total: p.notes.length };
}

// ───────────────────────────── results → the rest of the app ─────────────────────────────

/** Stars of one phrase: 3 = played back clean and written right, 2 = one of them clean, 1 = tried with ≥ 70 %. */
export function phraseStars(play: PhraseResult | null, written: { ok: number; total: number } | null): number {
  const p = play?.verdict === 'clean';
  const w = !!written && written.total > 0 && written.ok === written.total;
  if (p && w) return 3;
  if (p || w) return 2;
  return (play?.score ?? 0) >= 0.7 ? 1 : 0;
}

/** Difficulty on the rating scale by level and length. */
export const phraseDifficulty = (p: Phrase) => Math.round(820 + p.level * 95 + Math.min(80, p.notes.length * 4));

/** One rated event per phrase: transcription (dictation by ear) — playback and writing together. */
export function phraseEvents(p: Phrase, play: PhraseResult | null, written: { ok: number; total: number } | null, at: string, sessionId: string, index: number, revealed: boolean): RatingEvent[] {
  if (!play && !written) return [];
  const w = written && written.total ? written.ok / written.total : null;
  const s0 = play ? play.score : (w ?? 0);
  const score = Math.max(0, Math.min(1, (w === null ? s0 : 0.6 * s0 + 0.4 * w) * (revealed ? 0.6 : 1)));
  return [
    {
      id: `g:tx:${sessionId}:${index}`,
      skill: 'dictation',
      difficulty: phraseDifficulty(p),
      correct: score >= 0.85,
      score: Math.round(score * 1000) / 1000,
      tags: [
        { skill: 'dictation', sub: 'dictation/transcribe', w: 0.6 },
        { skill: 'sequences', sub: 'sequences/melody', w: 0.4 },
      ],
      at,
    },
  ];
}
export const phraseXp = (stars: number) => [1, 3, 5, 8][Math.max(0, Math.min(3, stars))];
