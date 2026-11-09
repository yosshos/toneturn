// 0.38 "Your instrument" topics (spec AE §4.1, §10.2, §10.3): play it back, notes and shapes on the neck, notes on
// the keys, the fingerboard of the bowed strings. Pure and seeded: every item rebuilds from (topic, level, seed).

import type { ChoiceQuestion, NoteEvent, PlaceQuestion, SingSeqQuestion, Stimulus } from './lesson';
import { placeInRange, placeKey } from './lesson';
import { pc, pcValue, type PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm, pcName, pcNameHe, chordStim, notesStim } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import {
  CAGED,
  FIRST_POSITION,
  OPEN_CHORDS,

  TUNINGS,
  arpeggioShape,
  boxPicture,
  cagedShape,
  defaultTuning,
  dropVoicing,
  midisAt,
  noteAt,
  parseShape,
  pcPositions,
  pentaBox,
  rootFiveOctave,
  threeNps,
  triadVoicings,
  type CagedId,
  type NeckPos,
  type OpenChordId,
  type SeventhKind,
  type Tuning,
} from './fretboard';

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };
type Inst = NonNullable<PlaceQuestion['instrument']>;

const STD = TUNINGS[0];
const BASS = defaultTuning('bass');
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11]);
const mod12 = (x: number) => ((x % 12) + 12) % 12;
const oct = (m: number) => Math.floor(m / 12) - 1;

const SHARP_EN: Record<number, string> = { 1: 'C♯', 3: 'D♯', 6: 'F♯', 8: 'G♯', 10: 'A♯' };
const SHARP_HE: Record<number, string> = { 1: 'דו דיאז', 3: 'רה דיאז', 6: 'פה דיאז', 8: 'סול דיאז', 10: 'לה דיאז' };
/** A note name (flats by default; sharps when asked and the note is black). */
const noteName = (p: number, sharp = false): Bi => (sharp && SHARP_EN[mod12(p)] ? { en: SHARP_EN[mod12(p)], he: SHARP_HE[mod12(p)] } : { en: pcName(p), he: pcNameHe(p) });
const withOct = (m: number): Bi => ({ en: `${pcName(m)}${oct(m)}`, he: `${pcNameHe(m)} ${oct(m)}` });

const IV: Record<number, Bi> = {
  1: { en: 'minor 2nd', he: 'סקונדה קטנה' },
  2: { en: 'major 2nd', he: 'סקונדה גדולה' },
  3: { en: 'minor 3rd', he: 'טרצה קטנה' },
  4: { en: 'major 3rd', he: 'טרצה גדולה' },
  5: { en: 'perfect 4th', he: 'קוורטה' },
  6: { en: 'tritone', he: 'טריטון' },
  7: { en: 'perfect 5th', he: 'קווינטה' },
  8: { en: 'minor 6th', he: 'סקסטה קטנה' },
  9: { en: 'major 6th', he: 'סקסטה גדולה' },
  10: { en: 'minor 7th', he: 'ספטימה קטנה' },
  11: { en: 'major 7th', he: 'ספטימה גדולה' },
  12: { en: 'octave', he: 'אוקטבה' },
};

/** "string 6" on a guitar / bass; "the D string" on a bowed instrument. */
const strName = (t: Tuning, s: number): Bi => (t.fretted ? { en: `string ${s}`, he: `מיתר ${s}` } : { en: `the ${pcName(t.open[s - 1])} string`, he: `מיתר ${pcNameHe(t.open[s - 1])}` });

const N = (midi: number, start: number, duration: number, velocity = 0.6): NoteEvent => ({ midi, start, duration, velocity });
/** Chords (each a list of MIDI notes) one after another. */
function chordsStim(chords: number[][], each = 1.0): Stimulus {
  const ev: NoteEvent[] = [];
  chords.forEach((c, i) => c.forEach((m) => ev.push(N(m, i * each, i === chords.length - 1 ? each * 1.5 : each * 0.92, 0.5))));
  return { kind: 'events', events: ev, length: (chords.length - 1) * each + each * 1.5 + 0.2 };
}
/** A triad (root pc, quality) voiced around middle C, with its root as a bass note at `bass`. */
const triadOver = (bass: number, rootPc: number, minor: boolean) => [bass, ...[0, minor ? 3 : 4, 7].map((x) => placeInRange(mod12(rootPc + x), 57, 68)).sort((a, b) => a - b)];

function placeQ(p: Omit<PlaceQuestion, 'kind' | 'answer' | 'choices' | 'stimulus'> & { stimulus?: Stimulus[] }): PlaceQuestion {
  const q = { kind: 'place', choices: [], ...p, stimulus: p.stimulus ?? [], answer: '' } as PlaceQuestion;
  q.answer = placeKey(q, q.target, q.durs);
  return q;
}
/** Every distinct key of other correct answers, minus the main one. */
const altKeys = (q: Pick<PlaceQuestion, 'as' | 'match' | 'answer'>, others: number[][]) => [...new Set(others.map((ms) => placeKey(q, ms)))].filter((k) => k !== q.answer);

// ======================================================================= play-back

const PB_KEYS: PitchClass[] = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'].map(pc);
const degMidi = (tonic: number, d: number) => tonic + 12 * Math.floor((d - 1) / 7) + MAJ[(((d - 1) % 7) + 7) % 7];
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });

function pbItem(id: string, level: number, seed: number, key: PitchClass, degrees: number[], midis: number[], stimulus: Stimulus[], difficulty: number, extra: Partial<SingSeqQuestion> = {}): SingSeqQuestion {
  return { id, kind: 'sing-seq', key, degrees, midis, choices: [], answer: 'accurate', stimulus, difficulty, skillAs: 'instrument', play: {}, topic: { id: 'play-back', level, seed }, ...extra };
}
/** A walk of n degrees in 1..7; `leap` forces the first move to be at least a third. */
function walk(rnd: () => number, n: number, moves: number[], leap = false): number[] {
  for (let tries = 0; ; tries++) {
    const ds = [1 + Math.floor(rnd() * 7)];
    let ok = true;
    for (let i = 1; i < n && ok; i++) {
      const pool = leap && i === 1 ? moves.filter((m) => Math.abs(m) >= 2) : moves;
      const opts = pool.map((m) => ds[i - 1] + m).filter((d) => d >= 1 && d <= 7);
      if (!opts.length) ok = false;
      else ds.push(pickR(rnd, opts));
    }
    if (ok || tries > 50) return ok ? ds : [1, 3, 5, 3, 1].slice(0, n);
  }
}

const PB_PROGS = [
  [1, 4, 5, 1],
  [1, 6, 4, 5],
  [1, 5, 6, 4],
  [1, 4, 1, 5],
  [6, 4, 1, 5],
  [1, 2, 5, 1],
];
const PB_RHYTHMS = [
  [1, 1, 2, 1, 1, 2],
  [1, 0.5, 0.5, 1, 1, 4],
  [1.5, 0.5, 1, 1, 2, 2],
  [0.5, 0.5, 1, 0.5, 0.5, 1, 2],
  [1, 1, 1.5, 0.5, 2],
  [2, 1, 1, 1, 1, 2],
];

TOPIC_GEN['play-back'] = {
  title: { en: 'Play it back', he: 'לנגן בחזרה' },
  skill: 'instrument',
  forPlays: ['guitar', 'bass', 'keys', 'strings', 'winds'],
  levels: [
    { en: 'One note', he: 'צליל אחד' },
    { en: 'Three notes, by step', he: 'שלושה צלילים בצעדים' },
    { en: 'Five notes with leaps', he: 'חמישה צלילים עם קפיצות' },
    { en: 'A phrase with a chromatic note', he: 'משפט עם צליל כרומטי' },
    { en: 'An interval up from a given note', he: 'מרווח למעלה מצליל נתון' },
    { en: 'The bass line of four chords', he: 'קו הבס של ארבעה אקורדים' },
    { en: 'With the rhythm', he: 'עם המקצב' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, PB_KEYS);
    const tonic = placeInRange(pcValue(key), 55, 66);
    const cad: Stimulus[] = [{ kind: 'cadence', key }, rest(0.5)];
    if (level === 1) {
      const d = 1 + Math.floor(rnd() * 7);
      const m = degMidi(tonic, d);
      return pbItem(id, level, seed, key, [d], [m], [...cad, { kind: 'note', midi: m, duration: 1.2 }], 900);
    }
    if (level === 2 || level === 3) {
      const ds = level === 2 ? walk(rnd, 3, [-1, 1]) : walk(rnd, 5, [-4, -3, -2, -1, 1, 2, 3, 4], true);
      const ms = ds.map((d) => degMidi(tonic, d));
      return pbItem(id, level, seed, key, ds, ms, [...cad, notesStim(ms, 0.6)], level === 2 ? 1050 : 1200);
    }
    if (level === 4) {
      // A diatonic line with a chromatic lower neighbour (♯1 ♯2 ♯4 ♯5 ♯6) before one of its notes.
      const base = walk(rnd, 5, [-2, -1, 1, 2]);
      const at = shuffleR(rnd, [1, 2, 3, 4]).find((i) => [2, 3, 5, 6, 7].includes(base[i])) ?? -1;
      const ds: number[] = [];
      const ms: number[] = [];
      base.forEach((d, i) => {
        if (i === at) {
          ds.push(d - 1); // shown as the raised degree below (♯4 → 4)
          ms.push(degMidi(tonic, d) - 1);
        }
        ds.push(d);
        ms.push(degMidi(tonic, d));
      });
      if (at < 0) {
        // No place for a neighbour in this line: end on ♯4 → 5.
        ds.push(4, 5);
        ms.push(degMidi(tonic, 5) - 1, degMidi(tonic, 5));
      }
      return pbItem(id, level, seed, key, ds, ms, [...cad, notesStim(ms, 0.55)], 1300);
    }
    if (level === 5) {
      // The first note is given (named and drawn); hear the interval, play both.
      const d = pickR(rnd, [2, 3, 4, 5, 6, 7]);
      const ms = [tonic, degMidi(tonic, d)];
      return pbItem(id, level, seed, key, [1, d], ms, [notesStim(ms, 0.9)], 1300, { show: { midis: [tonic], key: null } });
    }
    if (level === 6) {
      const prog = pickR(rnd, PB_PROGS);
      const low = placeInRange(pcValue(key), 40, 51);
      const bass = prog.map((d) => degMidi(low, d));
      const chords = prog.map((d, i) => triadOver(bass[i], pcValue(key) + MAJ[d - 1], [2, 3, 6].includes(d)));
      return pbItem(id, level, seed, key, prog, bass, [...cad, chordsStim(chords, 1.1)], 1400);
    }
    // 7: with the rhythm — pitches and onsets graded together.
    const beats = pickR(rnd, PB_RHYTHMS);
    const bpm = pickR(rnd, [72, 80, 88, 96]);
    const ds = walk(rnd, beats.length, [-2, -1, -1, 1, 1, 2, 3, -3]);
    const ms = ds.map((d) => degMidi(tonic, d));
    return pbItem(id, level, seed, key, ds, ms, [...cad, { kind: 'melody', midis: ms, beats, bpm }], 1450, { play: { beats, bpm } });
  },
};
TOPIC_TAGS['play-back'] = (l) =>
  l === 6
    ? tg(['instrument', 'echo', 0.6], ['sequences', 'melody', 0.2], ['cadences', 'progression', 0.2])
    : l === 7
      ? tg(['instrument', 'echo', 0.5], ['sequences', 'melody', 0.3], ['timing', 'precision', 0.2])
      : tg(['instrument', 'echo', 0.6], ['sequences', 'melody', 0.4]);

// ======================================================================= finding notes (neck and fingerboard)

type FindMode = 'low2' | 'all' | 'acc' | 'every' | 'position';
/** One note-finding item on a neck or fingerboard. */
function findNote(topic: string, t: Tuning, inst: Inst, mode: FindMode, range: [number, number], seed: number, level: number, id: string, difficulty: number): PlaceQuestion {
  const rnd = rng(seed);
  const nStr = t.open.length;
  const [lo, hi] = range;
  const base = { id, topic, level, seed, skill: 'instrument' as const, difficulty, surface: 'neck' as const, instrument: inst, match: 'exact' as const };
  if (mode === 'every' || mode === 'position') {
    let a = lo;
    let b = hi;
    if (mode === 'position') {
      a = pickR(rnd, [2, 3, 5, 7, 9]);
      b = a + 3;
    }
    const pcs = shuffleR(rnd, Array.from({ length: 12 }, (_, i) => i));
    const p = pcs.find((x) => pcPositions(t, x, a, b).length >= 3) ?? pcs[0];
    const pos = pcPositions(t, p, a, b);
    const n = noteName(p, rnd() < 0.3);
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][a];
    const ask: Bi =
      mode === 'every' && !t.fretted
        ? { en: `Tap every ${n.en} in first position.`, he: `הקישו על כל ${n.he} בפוזיציה הראשונה.` }
        : mode === 'every'
        ? { en: `Tap every ${n.en} on the neck, frets ${a}–${b}.`, he: `הקישו על כל ${n.he} בצוואר, סריגים ${a}–${b}.` }
        : { en: `Position ${roman}: find every ${n.en} between frets ${a} and ${b}.`, he: `פוזיציה ${roman}: מצאו כל ${n.he} בין סריג ${a} לסריג ${b}.` };
    return placeQ({ ...base, ask, target: midisAt(t, pos), as: 'set', neck: { frets: [a, b] } });
  }
  const strs = mode === 'low2' ? [nStr, nStr - 1] : Array.from({ length: nStr }, (_, i) => i + 1);
  const s = pickR(rnd, strs);
  const frets: number[] = [];
  for (let f = lo; f <= hi; f++) if (NATURAL.has(mod12(noteAt(t, s, f))) === (mode !== 'acc')) frets.push(f);
  const pre = frets.filter((f) => f > 0);
  const f = pickR(rnd, pre.length ? pre : frets);
  const m = noteAt(t, s, f);
  const n = noteName(m, mode === 'acc' && rnd() < 0.5);
  const sn = strName(t, s);
  return placeQ({ ...base, ask: { en: `Find ${n.en} on ${sn.en}.`, he: `מצאו ${n.he} על ${sn.he}.` }, target: [m], as: 'seq', neck: { strings: [s], frets: [lo, hi], onString: s } });
}

TOPIC_GEN['fret-notes'] = {
  title: { en: 'Notes on the neck', he: 'תווים על הצוואר' },
  skill: 'instrument',
  forPlays: ['guitar'],
  levels: [
    { en: 'Natural notes on strings 6 and 5', he: 'תווים טבעיים על מיתרים 6 ו־5' },
    { en: 'Natural notes, all strings', he: 'תווים טבעיים, כל המיתרים' },
    { en: 'With sharps and flats', he: 'עם דיאזים ובמולים' },
    { en: 'Every place of one note (frets 0–12)', he: 'כל המקומות של צליל אחד (סריגים 0–12)' },
    { en: 'The same note inside a position', he: 'אותו צליל בתוך פוזיציה' },
  ],
  gen(seed, level, id) {
    const mode = (['low2', 'all', 'acc', 'every', 'position'] as const)[level - 1];
    return findNote('fret-notes', STD, 'guitar', mode, mode === 'every' ? [0, 12] : [0, 11], seed, level, id, [850, 950, 1100, 1200, 1300][level - 1]);
  },
};
TOPIC_TAGS['fret-notes'] = tg(['instrument', 'fretboard', 0.7], ['notes', 'names', 0.3]);

const BOWED = ['violin', 'viola', 'cello'] as const;
TOPIC_GEN['string-notes'] = {
  title: { en: 'Notes on the fingerboard', he: 'תווים על הגריף' },
  skill: 'instrument',
  forPlays: ['strings'],
  levels: [
    { en: 'Natural notes on the two lowest strings', he: 'תווים טבעיים על שני המיתרים הנמוכים' },
    { en: 'Natural notes, all strings', he: 'תווים טבעיים, כל המיתרים' },
    { en: 'With sharps and flats', he: 'עם דיאזים ובמולים' },
    { en: 'Every place of one note (first position)', he: 'כל המקומות של צליל אחד (פוזיציה ראשונה)' },
  ],
  gen(seed, level, id) {
    const inst = BOWED[(seed >>> 0) % 3];
    const t = defaultTuning(inst);
    const mode = (['low2', 'all', 'acc', 'every'] as const)[level - 1];
    return findNote('string-notes', t, inst, mode, FIRST_POSITION[inst], seed, level, id, [850, 950, 1100, 1200][level - 1]);
  },
};
TOPIC_TAGS['string-notes'] = tg(['instrument', 'fretboard', 0.7], ['notes', 'names', 0.3]);

// ======================================================================= intervals as shapes

TOPIC_GEN['fret-intervals'] = {
  title: { en: 'Intervals as shapes', he: 'מרווחים כצורות' },
  skill: 'instrument',
  forPlays: ['guitar'],
  levels: [
    { en: 'Octave shapes', he: 'צורות של אוקטבה' },
    { en: '3rds, 4ths and 5ths across two strings', he: 'טרצות, קוורטות וקווינטות על שני מיתרים' },
    { en: 'Every interval, with the G–B shift', he: 'כל המרווחים, כולל ההזזה בין G ל־B' },
    { en: 'Hear it, find it from a given fret', he: 'לשמוע ולמצוא מסריג נתון' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'fret-intervals', level, seed, skill: 'instrument' as const, surface: 'neck' as const, instrument: 'guitar' as const, match: 'exact' as const, as: 'seq' as const, difficulty: [950, 1100, 1250, 1400][level - 1] };
    for (let tries = 0; ; tries++) {
      const s = level === 1 ? pickR(rnd, [6, 5, 4, 3]) : level === 2 ? pickR(rnd, [6, 5, 4]) : level === 3 ? (rnd() < 0.5 ? 3 : pickR(rnd, [6, 5, 4, 2])) : pickR(rnd, [6, 5, 4, 3, 2]);
      const f = 1 + Math.floor(rnd() * (level === 4 ? 10 : 9));
      const semis = level === 1 ? 12 : level === 2 ? pickR(rnd, [3, 4, 5, 7]) : 1 + Math.floor(rnd() * 12);
      const m = noteAt(STD, s, f);
      const to = level === 1 ? s - 2 : s - 1;
      const f2 = m + semis - STD.open[to - 1];
      if ((f2 < 0 || f2 > 15) && tries < 40) continue;
      const given = { str: s, fret: f };
      const n = noteName(m);
      const sn = strName(STD, to);
      if (level === 4) {
        return placeQ({
          ...base,
          ask: { en: `The first note is here (string ${s}, fret ${f}). Listen, then find the second note.`, he: `הצליל הראשון כאן (מיתר ${s}, סריג ${f}). הקשיבו, ומצאו את הצליל השני.` },
          target: [m + semis],
          neck: { dots: [given] },
          stimulus: [notesStim([m, m + semis], 0.8)],
        });
      }
      const iv = IV[semis];
      return placeQ({
        ...base,
        ask:
          level === 1
            ? { en: `This is ${n.en} (string ${s}, fret ${f}). Find the same note an octave up, on ${sn.en}.`, he: `זה ${n.he} (מיתר ${s}, סריג ${f}). מצאו את אותו צליל אוקטבה למעלה, על ${sn.he}.` }
            : { en: `From the dot, find the ${iv.en} above on ${sn.en}.`, he: `מהנקודה, מצאו את ה${iv.he} שמעליה על ${sn.he}.` },
        target: [m + semis],
        neck: { dots: [given], onString: to },
        stimulus: [{ kind: 'note', midi: m, duration: 1 }],
      });
    }
  },
};
TOPIC_TAGS['fret-intervals'] = tg(['instrument', 'shapes', 0.6], ['intervals', 'melodic', 0.4]);

// ======================================================================= chord shapes

/** A root as musicians spell it: C♯ F♯ G♯ minor, otherwise flats (E♭ minor, A♭ major). */
const rootName = (rootPc: number, minor: boolean): Bi => noteName(rootPc, minor && [1, 6, 8].includes(mod12(rootPc)));
const chordName = (rootPc: number, minor: boolean): Bi => {
  const r = rootName(rootPc, minor);
  return { en: `${r.en} ${minor ? 'minor' : 'major'}`, he: `${r.he} ${minor ? 'מינור' : "מז'ור"}` };
};
const SEV_SYM: Record<SeventhKind, Bi> = { maj7: { en: 'maj7', he: "מז'ור 7" }, '7': { en: '7', he: '7' }, m7: { en: 'm7', he: 'מינור 7' }, m7b5: { en: 'm7♭5', he: 'חצי מוקטן' } };
const sevName = (rootPc: number, k: SeventhKind): Bi => ({ en: `${pcName(rootPc)}${SEV_SYM[k].en}`, he: `${pcNameHe(rootPc)} ${SEV_SYM[k].he}` });
const INV: Bi[] = [
  { en: 'root position', he: 'מצב יסודי' },
  { en: 'first inversion (3rd in the bass)', he: 'היפוך ראשון (הטרצה בבס)' },
  { en: 'second inversion (5th in the bass)', he: 'היפוך שני (הקווינטה בבס)' },
];
const shapeMidis = (t: Tuning, dots: NeckPos[]) => midisAt(t, [...dots].sort((a, b) => b.str - a.str));

/** Bass items shared by fret-chords (root–5–octave, arpeggio shapes). */
const BASS_ARP: { iv: number[]; sym: Bi; minor: boolean }[] = [
  { iv: [0, 4, 7, 12], sym: { en: '', he: "מז'ור" }, minor: false },
  { iv: [0, 3, 7, 12], sym: { en: 'm', he: 'מינור' }, minor: true },
  { iv: [0, 4, 7, 11], sym: { en: 'maj7', he: "מז'ור 7" }, minor: false },
  { iv: [0, 4, 7, 10], sym: { en: '7', he: '7' }, minor: false },
  { iv: [0, 3, 7, 10], sym: { en: 'm7', he: 'מינור 7' }, minor: true },
];

TOPIC_GEN['fret-chords'] = {
  title: { en: 'Chord shapes', he: 'צורות של אקורדים' },
  skill: 'instrument',
  // Final bass check: guitar only — its bass levels (6, 7) are the bass course's 'bass-shapes', so no guitar chord
  // diagrams reach the bass path.
  forPlays: ['guitar'],
  levels: [
    { en: 'Open chords by diagram (C A G E D, minor)', he: 'אקורדים פתוחים לפי דיאגרמה (C A G E D, מינור)' },
    { en: 'Build a triad on the top three strings', he: 'לבנות טריאדה על שלושת המיתרים העליונים' },
    { en: 'CAGED: which shape?', he: 'CAGED: איזו צורה?' },
    { en: 'Seventh chords (drop 2 / drop 3)', he: 'אקורדי ספטים (דרופ 2 / דרופ 3)' },
    { en: 'Triad inversions on a string set', he: 'היפוכי טריאדות על קבוצת מיתרים' },
    { en: 'Bass: root, fifth, octave', he: 'בס: שורש, קווינטה, אוקטבה' },
    { en: 'Bass: arpeggio shapes', he: 'בס: צורות ארפג׳ו' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const diff = [900, 1050, 1200, 1350, 1400, 1000, 1150][level - 1];
    const base = { id, topic: 'fret-chords', level, seed, skill: 'instrument' as const, surface: 'neck' as const, match: 'exact' as const, difficulty: diff };
    if (level === 1) {
      const all = Object.keys(OPEN_CHORDS) as OpenChordId[];
      const answer = pickR(rnd, all);
      const choices = shuffleR(rnd, [answer, ...shuffleR(rnd, all.filter((c) => c !== answer)).slice(0, 3)]);
      const names: Names = {};
      for (const c of choices) {
        const o = OPEN_CHORDS[c];
        const n = chordName(o.root, o.minor);
        names[c] = nm(n.en, n.he, `${pcName(o.root)}${o.minor ? 'm' : ''} chord`);
      }
      const o = OPEN_CHORDS[answer];
      const shape = parseShape(o.shape);
      const pic = boxPicture(STD, shape, o.root);
      return choiceQ({
        id, topic: 'fret-chords', level, seed, skill: 'instrument', difficulty: diff,
        ask: { en: 'Which open chord is this?', he: 'איזה אקורד פתוח זה?' },
        names, answer, choices,
        stimulus: [{ kind: 'chord', midis: shapeMidis(STD, shape.dots), duration: 1.8, arpeggio: true }],
        diagram: { kind: 'box', instrument: 'guitar', ...pic, frets: 4 },
      });
    }
    if (level === 3) {
      const answer = pickR(rnd, CAGED);
      const root = Math.floor(rnd() * 12);
      const shape = cagedShape(answer, root);
      const pic = boxPicture(STD, shape, root);
      const names: Names = {};
      for (const c of CAGED) names[c] = nm(`${c} shape`, `צורת ${c}`, `${c} form`);
      const cn = chordName(root, false);
      return choiceQ({
        id, topic: 'fret-chords', level, seed, skill: 'instrument', difficulty: diff,
        ask: { en: `This is ${cn.en}. Which CAGED shape is it?`, he: `זה ${cn.he}. איזו צורת CAGED זו?` },
        names, answer, choices: CAGED.slice() as CagedId[],
        stimulus: [{ kind: 'chord', midis: shapeMidis(STD, shape.dots), duration: 1.8, arpeggio: true }],
        diagram: { kind: 'box', instrument: 'guitar', ...pic, frets: 5 },
      });
    }
    if (level === 2 || level === 5) {
      for (let tries = 0; ; tries++) {
        const root = Math.floor(rnd() * 12);
        const minor = rnd() < 0.5;
        const pcs = [root, root + (minor ? 3 : 4), root + 7].map(mod12);
        const set = level === 2 ? [3, 2, 1] : pickR(rnd, [[3, 2, 1], [4, 3, 2], [5, 4, 3], [6, 5, 4]]);
        const inv = level === 5 ? Math.floor(rnd() * 3) : -1;
        const vs = triadVoicings(STD, pcs, set).filter((v) => inv < 0 || mod12(noteAt(STD, v[0].str, v[0].fret)) === pcs[inv]);
        if (!vs.length && tries < 40) continue;
        const pick = vs[Math.floor(rnd() * vs.length)];
        const target = midisAt(STD, pick);
        const cn = chordName(root, minor);
        const strList = set.join('–');
        const ask: Bi =
          level === 2
            ? { en: `Build ${cn.en} on the top three strings — one note per string, any inversion.`, he: `בנו ${cn.he} על שלושת המיתרים העליונים — צליל אחד בכל מיתר, כל היפוך.` }
            : { en: `Build ${cn.en}, ${INV[inv].en}, on strings ${strList}.`, he: `בנו ${cn.he}, ${INV[inv].he}, על מיתרים ${strList}.` };
        const q = placeQ({ ...base, instrument: 'guitar', ask, target, as: 'set', neck: { strings: set }, stimulus: [chordStim(target, 1.5)] });
        const alts = altKeys(q, vs.map((v) => midisAt(STD, v)));
        return alts.length ? { ...q, alts } : q;
      }
    }
    if (level === 4) {
      for (let tries = 0; ; tries++) {
        const drop = rnd() < 0.5 ? 2 : 3;
        const kind = pickR(rnd, ['maj7', '7', 'm7', 'm7b5'] as SeventhKind[]);
        const rootStr = drop === 2 ? pickR(rnd, [5, 4]) : pickR(rnd, [6, 5]);
        const rootFret = 1 + Math.floor(rnd() * 10);
        const v = dropVoicing(STD, drop, kind, rootStr, rootFret);
        if ((!v || v.some((p) => p.fret === 0)) && tries < 60) continue;
        const ps = v ?? dropVoicing(STD, 2, 'maj7', 5, 3)!;
        const target = midisAt(STD, ps);
        const strs = ps.map((p) => p.str);
        const name = sevName(target[0], kind);
        return placeQ({
          ...base, instrument: 'guitar',
          ask: { en: `Build ${name.en} as a drop-${drop} voicing: root on string ${rootStr}, strings ${strs.join('–')}.`, he: `בנו ${name.he} בקול דרופ ${drop}: השורש על מיתר ${rootStr}, מיתרים ${strs.join('–')}.` },
          target, as: 'set', neck: { strings: strs },
          stimulus: [chordStim(target, 1.6)],
        });
      }
    }
    // 6, 7: bass.
    for (let tries = 0; ; tries++) {
      const rootStr = pickR(rnd, [4, 3]);
      const rootFret = 1 + Math.floor(rnd() * 7);
      const arp = level === 6 ? null : pickR(rnd, BASS_ARP);
      const ps = level === 6 ? rootFiveOctave(BASS, rootStr, rootFret) : arpeggioShape(BASS, rootStr, rootFret, arp!.iv);
      if (!ps && tries < 40) continue;
      const shape = ps ?? rootFiveOctave(BASS, 4, 3)!;
      const target = midisAt(BASS, shape);
      const r = target[0];
      const n = noteName(r);
      const ask: Bi =
        level === 6
          ? { en: `Play ${n.en}, its fifth and its octave — root on string ${rootStr}.`, he: `נגנו ${n.he}, את הקווינטה ואת האוקטבה שלו — השורש על מיתר ${rootStr}.` }
          : { en: `Play the ${n.en}${arp!.sym.en} arpeggio up from the root on string ${rootStr}.`, he: `נגנו ארפג׳ו של ${n.he} ${arp!.sym.he} למעלה, מהשורש על מיתר ${rootStr}.` };
      const minor = arp?.minor ?? false;
      return placeQ({ ...base, instrument: 'bass', ask, target, as: 'seq', neck: { frets: [0, 12] }, stimulus: [chordStim(triadOver(r + 12, mod12(r), minor), 1.4)] });
    }
  },
};
TOPIC_TAGS['fret-chords'] = (l) => (l >= 6 ? tg(['instrument', 'fretboard', 0.6], ['chords', 'quality', 0.4]) : tg(['instrument', 'shapes', 0.6], ['chords', 'quality', 0.4]));

// ======================================================================= scales on the neck

TOPIC_GEN['fret-scales'] = {
  title: { en: 'Scales on the neck', he: 'סולמות על הצוואר' },
  skill: 'instrument',
  // Guitar only (its bass level 5 is 'bass-shapes' level 3 in the bass course).
  forPlays: ['guitar'],
  levels: [
    { en: 'Major scale from a root on string 6', he: "סולם מז'ור משורש על מיתר 6" },
    { en: 'Minor pentatonic, box 1', he: 'פנטטונית מינורית, בוקס 1' },
    { en: 'Which pentatonic box (1–5)?', he: 'איזה בוקס פנטטוני (1–5)?' },
    { en: 'Three notes per string', he: 'שלושה צלילים למיתר' },
    { en: 'Bass: walking approach notes', he: 'בס: צלילי גישה בווקינג' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const diff = [1000, 1100, 1250, 1400, 1400][level - 1];
    const base = { id, topic: 'fret-scales', level, seed, skill: 'instrument' as const, surface: 'neck' as const, match: 'exact' as const, difficulty: diff };
    if (level === 1) {
      const f = 1 + Math.floor(rnd() * 8);
      const r = noteAt(STD, 6, f);
      const target = [...MAJ, 12].map((x) => r + x);
      const n = noteName(r);
      return placeQ({ ...base, instrument: 'guitar', ask: { en: `Play the ${n.en} major scale, one octave up, from ${n.en} on string 6.`, he: `נגנו סולם ${n.he} מז'ור, אוקטבה אחת למעלה, מ־${n.he} על מיתר 6.` }, target, as: 'seq', neck: { strings: [6, 5, 4], frets: [Math.max(0, f - 1), f + 4], dots: [{ str: 6, fret: f }] } });
    }
    if (level === 2) {
      const root = Math.floor(rnd() * 12);
      const ps = pentaBox(1, root);
      const target = midisAt(STD, ps);
      const fs = ps.map((p) => p.fret);
      const n = rootName(root, true);
      return placeQ({ ...base, instrument: 'guitar', ask: { en: `Play ${n.en} minor pentatonic, box 1, from the lowest note to the highest.`, he: `נגנו ${n.he} פנטטונית מינורית, בוקס 1, מהצליל הנמוך ביותר עד הגבוה ביותר.` }, target, as: 'seq', neck: { frets: [Math.min(...fs), Math.max(...fs)], dots: [ps[0]] } });
    }
    if (level === 3) {
      const box = 1 + Math.floor(rnd() * 5);
      const root = Math.floor(rnd() * 12);
      const ps = pentaBox(box, root);
      const fs = ps.map((p) => p.fret);
      const lo = Math.min(...fs);
      const names: Names = {};
      const choices = ['1', '2', '3', '4', '5'];
      const words = ['one', 'two', 'three', 'four', 'five'];
      choices.forEach((c, i) => (names[c] = nm(`Box ${c}`, `בוקס ${c}`, `box ${words[i]}`)));
      const n = rootName(root, true);
      return choiceQ({
        id, topic: 'fret-scales', level, seed, skill: 'instrument', difficulty: diff,
        ask: { en: `This is ${n.en} minor pentatonic. Which box is it?`, he: `זו ${n.he} פנטטונית מינורית. איזה בוקס זה?` },
        names, answer: String(box), choices,
        stimulus: [notesStim(midisAt(STD, ps), 0.2)],
        diagram: { kind: 'neck', instrument: 'guitar', dots: ps.map((p) => ({ ...p, ...(mod12(noteAt(STD, p.str, p.fret)) === root ? { root: true } : {}) })), baseFret: Math.max(1, lo), frets: 6 },
      });
    }
    if (level === 4) {
      const minor = rnd() < 0.5;
      const f = 1 + Math.floor(rnd() * 9);
      const r = noteAt(STD, 6, f);
      const ps = threeNps(STD, r, minor ? MIN : MAJ, [6, 5, 4]);
      const n = chordName(r, minor);
      return placeQ({ ...base, instrument: 'guitar', ask: { en: `Play ${n.en}, three notes per string on strings 6–5–4, from ${rootName(r, minor).en} on string 6 (nine notes up).`, he: `נגנו ${n.he}, שלושה צלילים בכל מיתר על מיתרים 6–5–4, מ־${rootName(r, minor).he} על מיתר 6 (תשעה צלילים למעלה).` }, target: midisAt(STD, ps), as: 'seq', neck: { strings: [6, 5, 4], frets: [Math.max(0, f - 1), f + 5], dots: [{ str: 6, fret: f }] } });
    }
    // 5: bass — walking approach notes into the next chord's root.
    for (let tries = 0; ; tries++) {
      const xStr = pickR(rnd, [4, 3]);
      const x = noteAt(BASS, xStr, Math.floor(rnd() * 8));
      const y = x + pickR(rnd, [5, 7, -5, 2, -2]);
      if ((y < 29 || y > 45) && tries < 40) continue;
      const kind = pickR(rnd, ['below', 'above', 'fifth'] as const);
      const fifths = [y + 7, y - 5].filter((m) => m >= 28 && m <= 55);
      const approach = kind === 'below' ? y - 1 : kind === 'above' ? y + 1 : fifths.sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
      const X = noteName(x);
      const Y = noteName(y);
      const how: Bi =
        kind === 'below'
          ? { en: `the note a half step below ${Y.en}`, he: `הצליל שחצי טון מתחת ל־${Y.he}` }
          : kind === 'above'
            ? { en: `the note a half step above ${Y.en}`, he: `הצליל שחצי טון מעל ${Y.he}` }
            : { en: `the fifth of ${Y.en} (a dominant approach)`, he: `הקווינטה של ${Y.he} (גישה דומיננטית)` };
      const target = [x, approach, y];
      const q = placeQ({
        ...base, instrument: 'bass',
        ask: { en: `${X.en} to ${Y.en}: play ${X.en}, then ${how.en}, then ${Y.en}.`, he: `מ־${X.he} ל־${Y.he}: נגנו ${X.he}, אחר כך ${how.he}, ואז ${Y.he}.` },
        target, as: 'seq', neck: { frets: [0, 12] },
        stimulus: [chordsStim([triadOver(x + 12, mod12(x), false), triadOver(y + 12, mod12(y), false)], 1.1)],
      });
      const alts = kind === 'fifth' ? altKeys(q, fifths.map((a) => [x, a, y])) : [];
      return alts.length ? { ...q, alts } : q;
    }
  },
};
TOPIC_TAGS['fret-scales'] = (l) => (l === 5 ? tg(['instrument', 'fretboard', 0.6], ['cadences', 'progression', 0.4]) : tg(['instrument', 'fretboard', 0.6], ['modes', 'scales', 0.4]));

// ======================================================================= the bass neck (bass course)

TOPIC_GEN['bass-notes'] = {
  title: { en: 'Notes on the bass neck', he: 'תווים על צוואר הבס' },
  skill: 'instrument',
  forPlays: ['bass'],
  levels: [
    { en: 'Natural notes on the E and A strings', he: 'תווים טבעיים על מיתרי E ו־A' },
    { en: 'Natural notes, all four strings', he: 'תווים טבעיים, כל ארבעת המיתרים' },
    { en: 'With sharps and flats', he: 'עם דיאזים ובמולים' },
    { en: 'Every place of one note (frets 0–12)', he: 'כל המקומות של צליל אחד (סריגים 0–12)' },
  ],
  gen(seed, level, id) {
    const mode = (['low2', 'all', 'acc', 'every'] as const)[level - 1];
    return findNote('bass-notes', BASS, 'bass', mode, mode === 'every' ? [0, 12] : [0, 11], seed, level, id, [850, 950, 1100, 1200][level - 1]);
  },
};
TOPIC_TAGS['bass-notes'] = tg(['instrument', 'fretboard', 0.7], ['notes', 'names', 0.3]);

/** The bass course's shapes: root–5–octave, arpeggio shapes, approach notes (the bass levels of fret-chords / fret-scales). */
const BASS_SHAPE_SRC: [topic: string, level: number][] = [['fret-chords', 6], ['fret-chords', 7], ['fret-scales', 5]];
TOPIC_GEN['bass-shapes'] = {
  title: { en: 'Bass shapes', he: 'צורות בבס' },
  skill: 'instrument',
  forPlays: ['bass'],
  levels: [
    { en: 'Root, fifth, octave', he: 'שורש, קווינטה, אוקטבה' },
    { en: 'Arpeggio shapes', he: 'צורות ארפג׳ו' },
    { en: 'Walking approach notes', he: 'צלילי גישה בווקינג' },
  ],
  gen(seed, level, id) {
    const [topic, lv] = BASS_SHAPE_SRC[level - 1];
    const q = TOPIC_GEN[topic].gen(seed, lv, id) as PlaceQuestion;
    return { ...q, topic: 'bass-shapes', level };
  },
};
TOPIC_TAGS['bass-shapes'] = (l) => (l === 3 ? tg(['instrument', 'fretboard', 0.6], ['cadences', 'progression', 0.4]) : tg(['instrument', 'fretboard', 0.6], ['chords', 'quality', 0.4]));

// ======================================================================= notes on the keys

const KEY_CHORDS: { iv: number[]; en: string; he: string }[] = [
  { iv: [0, 4, 7], en: 'major', he: "מז'ור" },
  { iv: [0, 3, 7], en: 'minor', he: 'מינור' },
  { iv: [0, 3, 6], en: 'diminished', he: 'מוקטן' },
  { iv: [0, 4, 8], en: 'augmented', he: 'מוגדל' },
  { iv: [0, 4, 7, 11], en: 'maj7', he: "מז'ור 7" },
  { iv: [0, 4, 7, 10], en: '7', he: '7' },
  { iv: [0, 3, 7, 10], en: 'm7', he: 'מינור 7' },
  { iv: [0, 3, 6, 10], en: 'm7♭5', he: 'חצי מוקטן' },
  { iv: [0, 3, 6, 9], en: 'dim7', he: 'מוקטן 7' },
];

TOPIC_GEN['key-notes'] = {
  title: { en: 'Notes on the keys', he: 'תווים על הקלידים' },
  skill: 'instrument',
  forPlays: ['keys'],
  levels: [
    { en: 'White keys', he: 'קלידים לבנים' },
    { en: 'Black keys (both names)', he: 'קלידים שחורים (שני השמות)' },
    { en: 'A note in a named octave (middle C = C4)', he: 'צליל באוקטבה מסוימת (דו האמצעי = C4)' },
    { en: 'Build an interval', he: 'לבנות מרווח' },
    { en: 'Build a triad or a seventh chord', he: 'לבנות טריאדה או אקורד ספטים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'key-notes', level, seed, skill: 'instrument' as const, surface: 'keys' as const, instrument: 'keys' as const, difficulty: [800, 900, 1000, 1150, 1300][level - 1] };
    if (level <= 2) {
      const pool = Array.from({ length: 12 }, (_, i) => i).filter((p) => NATURAL.has(p) === (level === 1));
      const p = pickR(rnd, pool);
      const n = noteName(p, level === 2 && rnd() < 0.5);
      return placeQ({ ...base, ask: { en: `Find ${n.en} on the keys.`, he: `מצאו ${n.he} על הקלידים.` }, target: [60 + p], as: 'seq', match: 'pc' });
    }
    if (level === 3) {
      const m = 48 + Math.floor(rnd() * 36);
      const n = withOct(m);
      return placeQ({ ...base, ask: { en: `Find ${n.en} (middle C is C4).`, he: `מצאו ${n.he} (דו האמצעי הוא דו 4).` }, target: [m], as: 'seq', match: 'exact' });
    }
    const lo = 55 + Math.floor(rnd() * 13);
    const n = withOct(lo);
    if (level === 4) {
      const semis = 1 + Math.floor(rnd() * 12);
      const iv = IV[semis];
      return placeQ({ ...base, ask: { en: `Build a ${iv.en} up from ${n.en}.`, he: `בנו ${iv.he} למעלה מ־${n.he}.` }, target: [lo, lo + semis], as: 'set', match: 'exact', given: { midis: [lo], key: null } });
    }
    const c = pickR(rnd, KEY_CHORDS);
    const name: Bi = { en: `${pcName(lo)}${c.iv.length === 3 ? ` ${c.en}` : c.en}`, he: `${pcNameHe(lo)} ${c.he}` };
    return placeQ({ ...base, ask: { en: `Build ${name.en} in root position from ${n.en}.`, he: `בנו ${name.he} במצב יסודי מ־${n.he}.` }, target: c.iv.map((x) => lo + x), as: 'set', match: 'exact', given: { midis: [lo], key: null } });
  },
};
TOPIC_TAGS['key-notes'] = (l) => (l >= 4 ? tg(['instrument', 'keyboard', 0.7], ['theory', 'spelling', 0.3]) : tg(['instrument', 'keyboard', 0.7], ['notes', 'names', 0.3]));
