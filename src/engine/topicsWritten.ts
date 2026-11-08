// 0.38 (spec AE §4.2, §4.5, §10): written dictation (staff-dictation, rhythm-build, two-part, bass-dictation) and
// written theory (chromatic-theory, scale-spelling, figured-bass, counterpoint, ornaments), plus new levels for
// harmonic-dictation, time-signatures, roman-numerals and note-reading (wrapped, rule 2). Pure and seeded.

import type { ChoiceQuestion, NoteEvent, PlaceQuestion, RhythmDictQuestion, Stimulus } from './lesson';
import { placeKey, rhythmDictQuestion } from './lesson';
import type { PitchClass } from './pitch';
import type { RhythmLevel } from './rhythm';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import './topicsAD';
import './topicsTheory';

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };
type Clef = 'treble' | 'bass' | 'alto' | 'tenor';
const mod = (x: number, n: number) => ((x % n) + n) % n;

// ======================================================================= spelling

/** A spelled note: letter index (C = 0) and accidental (−2…2). */
interface Sp {
  l: number;
  a: number;
}
const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NAT = [0, 2, 4, 5, 7, 9, 11];
const SOL = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const ACC_EN: Record<number, string> = { [-2]: '♭♭', [-1]: '♭', 0: '', 1: '♯', 2: '♯♯' };
const ACC_HE: Record<number, string> = { [-2]: ' במול כפול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דיאז כפול' };
const ACC_SAY: Record<number, string> = { [-2]: ' double flat', [-1]: ' flat', 0: '', 1: ' sharp', 2: ' double sharp' };
const S = (l: number, a = 0): Sp => ({ l, a });
const spPc = (s: Sp) => mod(NAT[s.l] + s.a, 12);
const spEn = (s: Sp) => `${LET[s.l]}${ACC_EN[s.a]}`;
const spHe = (s: Sp) => `${SOL[s.l]}${ACC_HE[s.a]}`;
const spSay = (s: Sp) => `${LET[s.l]}${ACC_SAY[s.a]}`;
const pcOf = (s: Sp): PitchClass => ({ letter: LET[s.l], acc: s.a as PitchClass['acc'] });
/** The note `num` letters and `semis` semitones above (null when it would need a triple accidental). */
function above(root: Sp, num: number, semis: number): Sp | null {
  const l = (root.l + num - 1) % 7;
  let a = mod(spPc(root) + semis - NAT[l], 12);
  if (a > 6) a -= 12;
  return Math.abs(a) <= 2 ? { l, a } : null;
}
const above1 = (root: Sp, num: number, semis: number): Sp => above(root, num, semis) ?? { l: (root.l + num - 1) % 7, a: 0 };
const keyName = (t: Sp, minor: boolean): Bi => ({ en: `${spEn(t)} ${minor ? 'minor' : 'major'}`, he: `${spHe(t)} ${minor ? 'מינור' : 'מז׳ור'}` });
/** Spelled scale of a key (minor: harmonic, the 7th raised). */
const keyScale = (t: Sp, minor: boolean): Sp[] => (minor ? HMIN : MAJ).map((st, i) => above1(t, i + 1, st));
/** The spelling of a midi note in a key (diatonic when possible, flats otherwise). */
function spellIn(scale: Sp[], midi: number): Sp {
  const hit = scale.find((s) => spPc(s) === mod(midi, 12));
  if (hit) return hit;
  const FL: Sp[] = [S(0), S(1, -1), S(1), S(2, -1), S(2), S(3), S(3, 1), S(4), S(5, -1), S(5), S(6, -1), S(6)];
  return FL[mod(midi, 12)];
}
/** Octave number of a spelled midi note (B♯3 = C4 in pitch). */
const octOf = (s: Sp, midi: number) => Math.floor((midi - s.a) / 12) - 1;
const noteTxt = (scale: Sp[], midi: number): Bi => {
  const s = spellIn(scale, midi);
  return { en: `${spEn(s)}${octOf(s, midi)}`, he: `${spHe(s)}${octOf(s, midi)}` };
};
const joinSp = (xs: Sp[]): Bi => ({ en: xs.map(spEn).join(' – '), he: xs.map(spHe).join(' – ') });

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const NMIN = [0, 2, 3, 5, 7, 8, 10];
const HMIN = [0, 2, 3, 5, 7, 8, 11];
/** Major keys up to three accidentals; minor keys with their relative major (the key signature). */
const MAJ_KEYS: Sp[] = [S(0), S(4), S(1), S(5), S(3), S(6, -1), S(2, -1)];
const MIN_KEYS: Sp[] = [S(5), S(2), S(6), S(1), S(4), S(0), S(3, 1)];
const relMajor = (t: Sp) => above1(t, 3, 3);
/** The tonic as a midi note at or above `lo` (within an octave). */
const tonicAt = (pc: number, lo: number) => lo + mod(pc - lo, 12);
/** Diatonic index (0 = tonic, 7 = octave, negative = below) → midi. */
const idxMidi = (T: number, i: number, scale: number[]) => T + 12 * Math.floor(i / 7) + scale[mod(i, 7)];

// ======================================================================= sound

const N = (midi: number, start: number, duration: number, velocity = 0.62): NoteEvent => ({ midi, start, duration, velocity });
const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
/** The key, by ear: I–IV–V7–I (major: the engine's cadence; minor: i–iv–V7–i). */
function keyStim(t: Sp, minor: boolean): Stimulus {
  if (!minor) return { kind: 'cadence', key: pcOf(t) };
  const T = tonicAt(spPc(t), 55);
  const cs = [
    [T - 12, T + 3, T + 7, T + 12],
    [T - 7, T + 5, T + 8, T + 12],
    [T - 5, T + 2, T + 5, T + 11],
    [T - 12, T + 3, T + 7, T + 12],
  ];
  const out: NoteEvent[] = [];
  cs.forEach((c, i) => c.forEach((m) => out.push(N(m, i * 0.75, i === 3 ? 1.3 : 0.7, 0.45))));
  return ev(out, 3 * 0.75 + 1.3 + 0.45);
}
/** Voices with durations in beats, played together. */
function voicesStim(voices: { midis: number[]; durs: number[]; from?: number }[], bpm: number): Stimulus {
  const beat = 60 / bpm;
  const out: NoteEvent[] = [];
  let end = 0;
  for (const v of voices) {
    let t = v.from ?? 0;
    v.midis.forEach((m, i) => {
      out.push(N(m, t * beat, v.durs[i] * beat * 0.95, 0.6));
      t += v.durs[i];
    });
    end = Math.max(end, t);
  }
  return ev(out, end * beat + 0.3);
}
/** Block chords, `each` seconds apart (the last one longer). */
function chordsStim(chords: number[][], each = 0.9): Stimulus {
  const out: NoteEvent[] = [];
  chords.forEach((c, i) => c.forEach((m, j) => out.push(N(m, i * each, i === chords.length - 1 ? each * 1.6 : each * 0.95, j === 0 ? 0.55 : 0.45))));
  return ev(out, (chords.length - 1) * each + each * 1.6 + 0.2);
}

function placeQ(p: Omit<PlaceQuestion, 'kind' | 'answer' | 'choices'>): PlaceQuestion {
  const q: PlaceQuestion = { kind: 'place', ...p, choices: [], answer: '' };
  q.answer = placeKey(q, q.target, q.durs);
  return q;
}

// ======================================================================= melodic lines

interface PathOpts {
  lo: number;
  hi: number;
  maxLeap: number;
  ok?: (a: number, b: number) => boolean;
}
/** A seeded line of `len` diatonic indices from `from` (to `to` when given), no repeated notes, mostly steps. */
function path(rnd: () => number, from: number, to: number | null, len: number, o: PathOpts): number[] | null {
  const out = [from];
  let budget = 4000;
  const moves: number[] = [];
  for (let m = -o.maxLeap; m <= o.maxLeap; m++) if (m) moves.push(m);
  const rec = (pos: number): boolean => {
    if (out.length === len) return to === null || pos === to;
    if (--budget < 0) return false;
    const left = len - out.length; // moves still to make, this one included
    const order = moves.map((m) => ({ m, k: rnd() + (Math.abs(m) > 1 ? 0.7 : 0) + (Math.abs(m) > 2 ? 0.4 : 0) })).sort((x, y) => x.k - y.k);
    for (const { m } of order) {
      const n = pos + m;
      if (n < o.lo || n > o.hi) continue;
      if (o.ok && !o.ok(pos, n)) continue;
      if (to !== null && Math.abs(n - to) > (left - 1) * o.maxLeap) continue;
      if (to !== null && left === 1 && n !== to) continue;
      out.push(n);
      if (rec(n)) return true;
      out.pop();
    }
    return false;
  };
  return rec(from) ? out : null;
}
/** Retry a seeded construction until it works (deterministic: the same rnd stream). */
function tries<T>(f: () => T | null, n = 40): T | null {
  for (let i = 0; i < n; i++) {
    const r = f();
    if (r) return r;
  }
  return null;
}
const homeTone = (i: number) => [0, 2, 4].includes(mod(i, 7));
const noAug2 = (a: number, b: number) => !(Math.abs(a - b) === 1 && [5, 6].includes(mod(a, 7)) && [5, 6].includes(mod(b, 7)));
/** Diatonic indices whose midi is inside [lo, hi]. */
function idxRange(T: number, scale: number[], lo: number, hi: number): [number, number] {
  let a = -7;
  while (idxMidi(T, a, scale) < lo) a++;
  let b = 14;
  while (idxMidi(T, b, scale) > hi) b--;
  return [a, b];
}

// Rhythms, in quarter-note beats.
const BARS44 = [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2], [1.5, 0.5, 1, 1], [1, 0.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 1], [1.5, 0.5, 2], [0.5, 0.5, 1, 2], [1, 1, 1.5, 0.5], [1, 2, 1]];
const END44 = [[2, 2], [1, 1, 2], [1.5, 0.5, 2], [1, 3], [4]];
const SIMPLE44 = [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1], [1.5, 0.5, 2], [3, 1], [1, 2, 1]];
const BARS68 = [[1.5, 1.5], [1, 0.5, 1.5], [1.5, 1, 0.5], [1, 0.5, 1, 0.5], [0.5, 0.5, 0.5, 1.5], [1.5, 0.5, 0.5, 0.5]];
const END68 = [[1.5, 1.5], [1, 0.5, 1.5], [3]];
function twoBars(rnd: () => number, min: number): number[] {
  let d: number[] = [];
  for (let i = 0; i < 30 && d.length < min; i++) d = [...pickR(rnd, BARS44), ...pickR(rnd, END44)];
  return d.length >= min ? d : [1, 1, 1, 1, 1, 1, 2];
}

// ======================================================================= staff-dictation

interface Line {
  midis: number[];
  durs?: number[];
  key: Sp | null;
  minor: boolean;
  clef: Clef;
  bpm: number;
  meter?: string;
  atonal?: boolean;
}
const NOTE = { notes: { en: 'notes', he: 'צלילים' } };

/** A melody for a staff-dictation level (1–10). */
function dictLine(rnd: () => number, level: number): Line {
  const treble: [number, number] = [57, 81];
  const bassW: [number, number] = [40, 62];
  if (level === 10) {
    // Chromatic / atonal: free intervals, no key, no repeated pitch class among the last four.
    const out = [pickR(rnd, [62, 64, 65, 67, 69])];
    while (out.length < 7) {
      const prev = out[out.length - 1];
      const n = prev + pickR(rnd, [-1, 1]) * pickR(rnd, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
      if (n < 57 || n > 79) continue;
      if (out.slice(-3).some((m) => mod(m - n, 12) === 0)) continue;
      out.push(n);
    }
    return { midis: out, key: null, minor: false, clef: 'treble', bpm: 0, atonal: true };
  }
  const minor = level === 5 || level === 8 || (level === 6 && rnd() < 0.5);
  const t = level === 1 ? S(0) : minor ? pickR(rnd, MIN_KEYS) : level === 2 ? pickR(rnd, [S(0), S(4), S(3)]) : pickR(rnd, MAJ_KEYS);
  const clef: Clef = level === 6 ? 'bass' : 'treble';
  const [wlo, whi] = clef === 'bass' ? bassW : treble;
  const T = tonicAt(spPc(t), clef === 'bass' ? 43 : 60);
  const scale = minor ? NMIN : MAJ;
  let [lo, hi] = idxRange(T, scale, wlo, whi);
  lo = Math.max(lo, -3);
  hi = Math.min(hi, level === 9 ? 9 : 8);
  const ends = [0, 7].filter((e) => e >= lo && e <= hi);
  const end = () => pickR(rnd, ends);
  const start = () => pickR(rnd, [0, 2, 4].filter((s) => s >= lo && s <= hi));
  const okMinor = (a: number, b: number) => noAug2(a, b);
  // alterations per note (semitones), the harmonic-minor leading note raised
  const finish = (idx: number[], alt: number[], durs?: number[], extra: Partial<Line> = {}): Line => ({
    midis: idx.map((i, k) => idxMidi(T, i, scale) + (alt[k] ?? 0) + (minor && mod(i, 7) === 6 && (alt[k] ?? 0) === 0 && !extra.meter?.startsWith('mm') ? 1 : 0)),
    ...(durs ? { durs } : {}),
    key: t,
    minor,
    clef,
    bpm: 84,
    ...extra,
  });
  if (level === 1) {
    const p = tries(() => path(rnd, pickR(rnd, [0, 2, 4, 7]), null, 3, { lo: 0, hi: 8, maxLeap: 1 }))!;
    return finish(p, []);
  }
  if (level === 2) {
    const p = tries(() => path(rnd, start(), end(), 5, { lo, hi, maxLeap: 4, ok: (a, b) => Math.abs(a - b) === 1 || (homeTone(a) && homeTone(b)) }))!;
    return finish(p, []);
  }
  if (level === 3) {
    const n = 6 + Math.floor(rnd() * 3);
    const p = tries(() => path(rnd, start(), end(), n, { lo, hi, maxLeap: 4 }))!;
    return finish(p, []);
  }
  if (level === 4 || level === 6) {
    const durs = twoBars(rnd, 5);
    const p = tries(() => path(rnd, start(), end(), durs.length, { lo, hi, maxLeap: 4, ok: minor ? okMinor : undefined }))!;
    return finish(p, [], durs, { meter: '4/4' });
  }
  if (level === 5) {
    // Minor with one chromatic passing note: 4 – ♯4 – 5.
    const durs = twoBars(rnd, 6);
    const n = durs.length;
    const r = tries(() => {
      const a = 2 + Math.floor(rnd() * (n - 4)); // notes before the ♯4
      const p1 = path(rnd, start(), 3, a, { lo, hi, maxLeap: 3, ok: okMinor });
      const p2 = path(rnd, 4, end(), n - a - 1, { lo, hi, maxLeap: 3, ok: okMinor });
      return p1 && p2 && p1[0] !== 3 ? { idx: [...p1, 3, ...p2], alt: [...p1.map(() => 0), 1, ...p2.map(() => 0)] } : null;
    }) ?? { idx: [1, 2, 3, 3, 4, ...[3, 2, 1, 0].slice(-(n - 5))], alt: [0, 0, 0, 1, 0, 0, 0, 0, 0].slice(0, n) };
    return finish(r.idx, r.alt, durs, { meter: '4/4' });
  }
  if (level === 7) {
    // 6/8 with an eighth-note pick-up into the tonic.
    const durs = [0.5, ...pickR(rnd, BARS68), ...pickR(rnd, END68)];
    const pick = pickR(rnd, [-3, -1].filter((x) => x >= lo));
    const p = tries(() => path(rnd, 0, end(), durs.length - 1, { lo, hi, maxLeap: 4 }))!;
    return { ...finish([pick, ...p], [], durs, { meter: '6/8' }), bpm: 96 };
  }
  if (level === 8) {
    // Melodic minor: up 5 – ♯6 – ♯7 – 8, down with the natural 7 and 6.
    const durs = twoBars(rnd, 7);
    const n = durs.length;
    const r = tries(() => {
      const rest2 = 1 + Math.floor(rnd() * Math.min(5, n - 4)); // notes after the top
      const a = n - 3 - rest2;
      const p1 = path(rnd, start(), 4, a, { lo, hi: 6, maxLeap: 3, ok: okMinor });
      const p2 = rest2 > 0 ? path(rnd, 7, null, rest2 + 1, { lo: 0, hi: 7, maxLeap: 2, ok: (x, y) => y < x }) : [7];
      if (!p1 || !p2 || (p1.length > 1 && p1[p1.length - 2] === 4)) return null;
      const down = p2.slice(1);
      if (down.length && down[down.length - 1] !== 0 && down[down.length - 1] !== 7 && down[down.length - 1] !== 4 && down[down.length - 1] !== 2) return null;
      return { idx: [...p1, 5, 6, 7, ...down], alt: [...p1.map(() => 0), 1, 1, 0, ...down.map(() => 0)] };
    }, 80) ?? { idx: [4, 5, 6, 7, ...[6, 5, 4, 3, 2, 1, 0].slice(0, n - 4)], alt: [0, 1, 1, ...Array(n).fill(0)].slice(0, n) };
    // natural minor below the raised pair: mark the descending 7 / 6 as natural (meter tag 'mm' keeps them natural)
    return finish(r.idx, r.alt, durs, { meter: 'mm4/4' });
  }
  // level 9: eight bars, the second phrase modulates to V (♯4 = the new leading note).
  const ph = () => [...pickR(rnd, SIMPLE44), ...pickR(rnd, SIMPLE44), ...pickR(rnd, SIMPLE44)];
  const d1 = [...ph(), ...pickR(rnd, [[4], [2, 2]])];
  const d2 = [...ph(), ...pickR(rnd, [[4], [2, 2], [1, 3]])];
  const r = tries(() => {
    const p1 = path(rnd, start(), pickR(rnd, [4, 1]), d1.length, { lo, hi, maxLeap: 3 });
    const p2 = path(rnd, pickR(rnd, [4, 6, 2]), 3, d2.length - 1, { lo, hi, maxLeap: 3 });
    return p1 && p2 ? { idx: [...p1, ...p2, 4], alt: [...p1.map(() => 0), ...p2.map((i) => (mod(i, 7) === 3 ? 1 : 0)), 0] } : null;
  }, 80) ?? {
    idx: [...Array.from({ length: d1.length }, (_, i) => [0, 1, 2, 1][i % 4]), ...Array.from({ length: d2.length - 2 }, (_, i) => [4, 5, 4, 2][i % 4]), 3, 4],
    alt: [...Array(d1.length + d2.length - 2).fill(0), 1, 0],
  };
  return { ...finish(r.idx, r.alt, [...d1, ...d2], { meter: '4/4' }), bpm: 104 };
}

const SD_DIFF = [1000, 1120, 1250, 1350, 1450, 1500, 1550, 1600, 1680, 1750];
TOPIC_GEN['staff-dictation'] = {
  title: { en: 'Write the melody', he: 'לכתוב את המנגינה' },
  skill: 'dictation',
  levels: [
    { en: 'Three notes by step in C', he: 'שלושה צלילים בצעדים בדו' },
    { en: 'Five notes, leaps in the home chord', he: 'חמישה צלילים, קפיצות באקורד הבית' },
    { en: 'Six to eight notes, any major key', he: 'שישה עד שמונה צלילים, כל סולם מז׳ורי' },
    { en: 'With rhythm', he: 'עם קצב' },
    { en: 'Minor, and one chromatic note', he: 'מינור, וצליל כרומטי אחד' },
    { en: 'Bass clef', he: 'מפתח פה' },
    { en: '6/8 with a pick-up', he: '6/8 עם אנקרוזה' },
    { en: 'Minor with raised 6 and 7', he: 'מינור עם 6 ו־7 מוגבהים' },
    { en: 'Eight bars, modulating to V', he: 'שמונה תיבות, מודולציה ל־V' },
    { en: 'Chromatic, no key', he: 'כרומטי, בלי טונאליות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = dictLine(rnd, level);
    const each = pickR(rnd, [0.5, 0.55, 0.6, 0.65, 0.7]); // tempo of unmeasured lines (surface variety)
    const meter = L.meter?.replace('mm', '');
    const keyPc = L.key ? pcOf(L.minor ? relMajor(L.key) : L.key) : null;
    const stimulus: Stimulus[] = L.atonal
      ? [{ kind: 'note', midi: L.midis[0], duration: 1 }, rest(0.6), { kind: 'notes', midis: L.midis, each }]
      : [keyStim(L.key!, L.minor), rest(0.4), L.durs ? { kind: 'melody', midis: L.midis, beats: L.durs, bpm: L.bpm } : { kind: 'notes', midis: L.midis, each }];
    const kn = L.key ? keyName(L.key, L.minor) : { en: 'No key', he: 'בלי טונאליות' };
    const n = L.midis.length;
    return placeQ({
      id, topic: 'staff-dictation', level, seed, skill: 'dictation', difficulty: SD_DIFF[level - 1],
      ask: L.durs
        ? { en: `Write the melody (${n} ${NOTE.notes.en}) with its rhythm. The first note is given.`, he: `כתבו את המנגינה (${n} ${NOTE.notes.he}) עם הקצב. הצליל הראשון נתון.` }
        : { en: `Write the melody (${n} ${NOTE.notes.en}). The first note is given.`, he: `כתבו את המנגינה (${n} ${NOTE.notes.he}). הצליל הראשון נתון.` },
      text: { en: meter ? `${kn.en} · ${meter}` : kn.en, he: meter ? `${kn.he} · ${meter}` : kn.he },
      target: L.midis,
      ...(L.durs ? { durs: L.durs } : {}),
      as: 'seq', match: 'exact', surface: 'staff',
      staff: { key: keyPc, clef: L.clef },
      given: { midis: [L.midis[0]], clef: L.clef, key: keyPc, ...(L.durs ? { durs: [L.durs[0]] } : {}) },
      stimulus,
    });
  },
};
TOPIC_TAGS['staff-dictation'] = tg(['dictation', 'melodic', 0.6], ['sequences', 'melody', 0.25], ['notes', 'staff', 0.15]);

// ======================================================================= rhythm-build

TOPIC_GEN['rhythm-build'] = {
  title: { en: 'Build the rhythm', he: 'לבנות את המקצב' },
  skill: 'dictation',
  levels: [1, 2, 3, 4, 5, 6, 7].map((r) => ({ en: `Rhythm level R${r}`, he: `מקצבים ברמה R${r}` })),
  gen(seed, level, id) {
    const q = rhythmDictQuestion(id, level as RhythmLevel, 2, seed, 'build');
    // `topic` lets the review queue rebuild it once RhythmDictQuestion carries it (see the 0.38 build report).
    return { ...q, skillAs: 'dictation', topic: { id: 'rhythm-build', level, seed } } as RhythmDictQuestion;
  },
};
TOPIC_TAGS['rhythm-build'] = tg(['dictation', 'rhythm', 0.7], ['rhythm-dictation', 'dictate', 0.3]);

// ======================================================================= two-part

const CONS = [0, 3, 4, 7, 8, 9];
const consonant = (d: number) => d > 0 && CONS.includes(d % 12);
const perfect = (d: number) => d % 12 === 0 || d % 12 === 7;
const sgn = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
/** Parallel fifths / octaves between two successive simultaneities (both voices moving the same way). */
const parallel = (u1: number, l1: number, u2: number, l2: number) => perfect(u1 - l1) && perfect(u2 - l2) && (u1 - l1) % 12 === (u2 - l2) % 12 && sgn(u2 - u1) !== 0 && sgn(u2 - u1) === sgn(l2 - l1);

/** A voice (diatonic indices) note against note with a fixed voice: consonant, no parallels, ending on the tonic octave. */
function counterVoice(rnd: () => number, fixed: number[], fixedIsUpper: boolean, T: number, o: { lo: number; hi: number; maxLeap: number; first: number[]; last: number[]; contrary: boolean; noRepeat?: boolean }): number[] | null {
  const m = (i: number) => idxMidi(T, i, MAJ);
  const out: number[] = [];
  let budget = 6000;
  const iv = (k: number, c: number) => (fixedIsUpper ? m(fixed[k]) - m(c) : m(c) - m(fixed[k]));
  const rec = (k: number): boolean => {
    if (k === fixed.length) return !o.contrary || out.some((c, i) => i > 0 && sgn(c - out[i - 1]) === -sgn(fixed[i] - fixed[i - 1]) && sgn(c - out[i - 1]) !== 0);
    if (--budget < 0) return false;
    const cands: number[] = [];
    for (let c = o.lo; c <= o.hi; c++) cands.push(c);
    const order = cands.map((c) => ({ c, key: rnd() + (k && Math.abs(c - out[k - 1]) > 1 ? 0.6 : 0) + (perfect(Math.abs(iv(k, c))) && k && k < fixed.length - 1 ? 0.8 : 0) })).sort((a, b) => a.key - b.key);
    for (const { c } of order) {
      const d = iv(k, c);
      if (!consonant(d) || d > 24) continue;
      if (k === 0 && !o.first.includes(c)) continue;
      if (k === fixed.length - 1 && (!o.last.includes(c) || d % 12 !== 0)) continue;
      if (k > 0) {
        const mv = c - out[k - 1];
        if (Math.abs(mv) > o.maxLeap) continue;
        if (mv === 0 && (o.noRepeat || fixed[k] === fixed[k - 1])) continue;
        const [u1, l1, u2, l2] = fixedIsUpper ? [m(fixed[k - 1]), m(out[k - 1]), m(fixed[k]), m(c)] : [m(out[k - 1]), m(fixed[k - 1]), m(c), m(fixed[k])];
        if (parallel(u1, l1, u2, l2)) continue;
        if (o.contrary && mv !== 0 && sgn(mv) === sgn(fixed[k] - fixed[k - 1])) continue;
        if (Math.abs(m(c) - m(out[k - 1])) === 6) continue;
      }
      out.push(c);
      if (rec(k + 1)) return true;
      out.pop();
    }
    return false;
  };
  return rec(0) ? out : null;
}

/** Upper and lower voice (diatonic indices) for two-part levels 1–4. */
function twoVoices(rnd: () => number, T: number, n: number, steps: boolean, upRange: [number, number], lowRange: [number, number]) {
  return tries(() => {
    const up = path(rnd, pickR(rnd, [7, 9, 11].filter((x) => x >= upRange[0] && x <= upRange[1])), 7, n, { lo: upRange[0], hi: upRange[1], maxLeap: steps ? 1 : 2 });
    if (!up) return null;
    const low = counterVoice(rnd, up, true, T, { lo: lowRange[0], hi: lowRange[1], maxLeap: steps ? 1 : 2, first: [0, 7].filter((x) => x >= lowRange[0] && x <= lowRange[1]), last: [0, 7].filter((x) => x >= lowRange[0] && x <= lowRange[1]), contrary: steps });
    return low ? { up, low } : null;
  }, 60);
}

/** Canon at the octave: one rhythm per bar, the lower voice plays the upper's bars 1–3 from bar 2. */
function canon(rnd: () => number, T: number, P: number[]): number[] | null {
  const m = (i: number) => idxMidi(T, i, MAJ);
  const k = P.length;
  const total = 4 * k;
  const out: number[] = [];
  let budget = 20000;
  const rec = (g: number): boolean => {
    if (g === total) return true;
    if (--budget < 0) return false;
    const cands = [];
    for (let c = 2; c <= 10; c++) cands.push(c);
    for (const { c } of cands.map((c) => ({ c, key: rnd() + (g && Math.abs(c - out[g - 1]) > 1 ? 0.5 : 0) })).sort((a, b) => a.key - b.key)) {
      if (g === 0 && ![7, 9, 4].includes(c)) continue;
      if (g > 0 && (c === out[g - 1] || Math.abs(c - out[g - 1]) > 3 || Math.abs(m(c) - m(out[g - 1])) === 6)) continue;
      if ((g === 3 * k - 1 || g === total - 1) && c !== 7) continue;
      if (g >= k) {
        const low = m(out[g - k]) - 12;
        const d = m(c) - low;
        if (!consonant(d) || d > 24) continue;
        if (g === total - 1 && d % 12 !== 0) continue;
        if (g - 1 >= k && parallel(m(out[g - 1]), m(out[g - 1 - k]) - 12, m(c), low)) continue;
      }
      out.push(c);
      if (rec(g + 1)) return true;
      out.pop();
    }
    return false;
  };
  return rec(0) ? out : null;
}

const TP_DIFF = [1250, 1300, 1400, 1500, 1600, 1700];
TOPIC_GEN['two-part'] = {
  title: { en: 'Two voices', he: 'שני קולות' },
  skill: 'dictation',
  levels: [
    { en: 'The upper voice is given: write the lower', he: 'הקול העליון נתון: כתבו את התחתון' },
    { en: 'The lower voice is given: write the upper', he: 'הקול התחתון נתון: כתבו את העליון' },
    { en: 'Both voices, four notes each', he: 'שני הקולות, ארבעה צלילים בכל אחד' },
    { en: 'Two bars with rhythm', he: 'שתי תיבות עם קצב' },
    { en: 'Four bars, imitation', he: 'ארבע תיבות, חיקוי' },
    { en: 'Minor, with suspensions', he: 'מינור, עם השהיות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const minor = level === 6;
    const t = minor ? pickR(rnd, MIN_KEYS) : pickR(rnd, MAJ_KEYS.slice(0, 6));
    const keyPc = pcOf(minor ? relMajor(t) : t);
    const kn = keyName(t, minor);
    const base = { id, topic: 'two-part', level, seed, skill: 'dictation' as const, difficulty: TP_DIFF[level - 1], as: 'seq' as const, match: 'exact' as const, surface: 'staff' as const };
    const intro = [keyStim(t, minor), rest(0.4)];
    if (level <= 2 || level === 4) {
      const T = tonicAt(spPc(t), 48);
      let durs: number[] | undefined;
      for (let g = 0; level === 4 && g < 30 && (!durs || durs.length < 5); g++) durs = [...pickR(rnd, SIMPLE44), ...pickR(rnd, [[2, 2], [1, 1, 2], [1, 3], [3, 1]])];
      if (durs && durs.length < 5) durs = [1, 1, 1, 1, 2, 2];
      const n = durs ? durs.length : 5;
      const v = twoVoices(rnd, T, n, level === 1, [5, 12], [-3, 6]) ?? { up: [9, 8, 7, 8, 7].slice(0, n), low: [0, -1, 0, -1, 0].slice(0, n) };
      const up = v.up.map((i) => idxMidi(T, i, MAJ));
      const low = v.low.map((i) => idxMidi(T, i, MAJ));
      const ds = durs;
      const writeLower = level !== 2;
      const play = voicesStim([{ midis: up, durs: ds ?? up.map(() => 1) }, { midis: low, durs: ds ?? low.map(() => 1) }], ds ? 84 : 70);
      return placeQ({
        ...base,
        ask: writeLower ? { en: 'Two voices: the upper one is given. Write the lower voice.', he: 'שני קולות: העליון נתון. כתבו את הקול התחתון.' } : { en: 'Two voices: the lower one is given. Write the upper voice.', he: 'שני קולות: התחתון נתון. כתבו את הקול העליון.' },
        text: { en: ds ? `${kn.en} · 4/4` : kn.en, he: ds ? `${kn.he} · 4/4` : kn.he },
        target: writeLower ? low : up,
        ...(ds ? { durs: ds } : {}),
        staff: { key: keyPc, clef: writeLower ? 'bass' : 'treble' },
        given: { midis: writeLower ? up : low, clef: writeLower ? 'treble' : 'bass', key: keyPc, ...(ds ? { durs: ds } : {}) },
        stimulus: [...intro, play],
      });
    }
    if (level === 3) {
      const T = tonicAt(spPc(t), 60);
      const v = twoVoices(rnd, T, 4, false, [2, 9], [-2, 5]) ?? { up: [9, 8, 8, 7], low: [0, -1, 1, 0] };
      const up = v.up.map((i) => idxMidi(T, i, MAJ));
      const low = v.low.map((i) => idxMidi(T, i, MAJ));
      return placeQ({
        ...base,
        ask: { en: 'Write both voices: first the upper voice (4 notes), then the lower voice (4 notes). The first note of each is given.', he: 'כתבו את שני הקולות: קודם העליון (4 צלילים), אחר כך התחתון (4 צלילים). הצליל הראשון של כל קול נתון.' },
        text: kn,
        target: [...up, ...low],
        staff: { key: keyPc, clef: 'treble' },
        given: { midis: [low[0], up[0]], clef: 'treble', key: keyPc, chord: true },
        stimulus: [...intro, voicesStim([{ midis: up, durs: [1, 1, 1, 1] }, { midis: low, durs: [1, 1, 1, 1] }], 66)],
      });
    }
    if (level === 5) {
      const T = tonicAt(spPc(t), 55);
      const r = tries(() => {
        const P = pickR(rnd, [[2, 1, 1], [1, 1, 2], [2, 2], [1.5, 0.5, 2], [1, 1, 1, 1]]);
        const c = canon(rnd, T, P);
        return c ? { P, c } : null;
      }, 12) ?? { P: [2, 2], c: [7, 9, 4, 5, 9, 7, 7, 7] };
      const k = r.P.length;
      const upper = r.c.map((i) => idxMidi(T, i, MAJ));
      const lower = upper.slice(0, 3 * k).map((x) => x - 12);
      const ud = [...r.P, ...r.P, ...r.P, ...r.P];
      const ld = ud.slice(0, 3 * k);
      return placeQ({
        ...base,
        ask: { en: 'The lower voice imitates the upper one, a bar later. Write the lower voice (it starts in bar 2).', he: 'הקול התחתון מחקה את העליון, תיבה אחת אחריו. כתבו את הקול התחתון (הוא נכנס בתיבה 2).' },
        text: { en: `${kn.en} · 4/4 · 4 bars`, he: `${kn.he} · 4/4 · 4 תיבות` },
        target: lower, durs: ld,
        staff: { key: keyPc, clef: 'bass' },
        given: { midis: upper, clef: 'treble', key: keyPc, durs: ud },
        stimulus: [...intro, voicesStim([{ midis: upper, durs: ud }, { midis: lower, durs: ld, from: 4 }], 92)],
      });
    }
    // level 6: a chain of 7–6 suspensions over a bass falling by step, the leading note raised at the cadence.
    const T = tonicAt(spPc(t), 40);
    const s = pickR(rnd, [3, 4, 5]);
    const bassIdx = Array.from({ length: s + 1 }, (_, i) => s - i);
    const w = bassIdx.slice(0, s).map((b) => b + 12);
    const upIdx = [w[0]];
    const upDur = [2];
    for (let k = 1; k < s; k++) {
      upIdx.push(w[k - 1], w[k]);
      upDur.push(1, 1);
    }
    upIdx.push(14);
    upDur.push(2);
    const mm = (i: number) => idxMidi(T, i, NMIN) + (mod(i, 7) === 6 ? 1 : 0);
    const upper = upIdx.map(mm);
    const bass = bassIdx.map(mm);
    const bd = bass.map(() => 2);
    return placeQ({
      ...base,
      ask: { en: 'The bass is given. Write the upper voice — it holds notes over the bar (suspensions). A tied note is written twice.', he: 'הבס נתון. כתבו את הקול העליון — הוא מחזיק צלילים מעבר לפעמה (השהיות). צליל מוארך בקשת נכתב פעמיים.' },
      text: { en: `${kn.en} · 2/2`, he: `${kn.he} · 2/2` },
      target: upper, durs: upDur,
      staff: { key: keyPc, clef: 'treble' },
      given: { midis: bass, clef: 'bass', key: keyPc, durs: bd },
      stimulus: [...intro, voicesStim([{ midis: upper, durs: upDur }, { midis: bass, durs: bd }], 84)],
    });
  },
};
TOPIC_TAGS['two-part'] = tg(['dictation', 'two-part', 0.6], ['form', 'voices', 0.4]);

// ======================================================================= chords (shared by the harmony topics)

/** Chord symbols: root in semitones above the tonic, intervals, inversion. */
const CH: Record<string, [number, number[], number?]> = {
  I: [0, [0, 4, 7]], I6: [0, [0, 4, 7], 1], ii: [2, [0, 3, 7]], ii6: [2, [0, 3, 7], 1], iii: [4, [0, 3, 7]], IV: [5, [0, 4, 7]], V: [7, [0, 4, 7]], V6: [7, [0, 4, 7], 1], V7: [7, [0, 4, 7, 10]], vi: [9, [0, 3, 7]],
  i: [0, [0, 3, 7]], i6: [0, [0, 3, 7], 1], 'ii°': [2, [0, 3, 6]], III: [3, [0, 4, 7]], iv: [5, [0, 3, 7]], VI: [8, [0, 4, 7]], VII: [10, [0, 4, 7]],
  Imaj7: [0, [0, 4, 7, 11]], ii7: [2, [0, 3, 7, 10]], iii7: [4, [0, 3, 7, 10]], IVmaj7: [5, [0, 4, 7, 11]], vi7: [9, [0, 3, 7, 10]],
  'V/V': [2, [0, 4, 7, 10]], 'V/vi': [4, [0, 4, 7, 10]], 'V/IV': [0, [0, 4, 7, 10]], 'V/ii': [9, [0, 4, 7, 10]], '♭VI': [8, [0, 4, 7]], '♭VII': [10, [0, 4, 7]],
};
/** Bass midi of a chord in [40, 57], nearest to the previous bass. */
function chordBass(T: number, c: string, prev: number | null): number {
  const [r, ivs, inv = 0] = CH[c];
  const pc = mod(T + r + ivs[inv], 12);
  const opts = [36, 48, 60].map((o) => o + pc).filter((x) => x >= 40 && x <= 57);
  if (prev === null) return opts.find((x) => x >= 43) ?? opts[0];
  return opts.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
}
/** Upper voices: close position near the previous upper chord. */
function chordUpper(T: number, c: string, prev: number[] | null): number[] {
  const [r, ivs] = CH[c];
  const pcs = ivs.map((x) => mod(T + r + x, 12));
  let best: number[] = [];
  let score = Infinity;
  for (let lo = 55; lo <= 67; lo++) {
    if (!pcs.includes(mod(lo, 12))) continue;
    const v = [lo];
    while (v.length < pcs.length) {
      let n = v[v.length - 1] + 1;
      while (!pcs.includes(mod(n, 12)) || v.some((x) => mod(x, 12) === mod(n, 12))) n++;
      v.push(n);
    }
    const s = prev ? v.reduce((a, x, i) => a + Math.abs(x - (prev[i] ?? prev[prev.length - 1])), 0) : Math.abs(v[0] - 60);
    if (s < score) {
      score = s;
      best = v;
    }
  }
  return best;
}
function voiceProg(T: number, prog: string[]): { bass: number[]; upper: number[][] } {
  const bass: number[] = [];
  const upper: number[][] = [];
  prog.forEach((c, i) => {
    bass.push(chordBass(T, c, i ? bass[i - 1] : null));
    upper.push(chordUpper(T, c, i ? upper[i - 1] : null));
  });
  return { bass, upper };
}
/** Four options: the right progression and versions changed in one or two places. */
function progOptions(rnd: () => number, right: string[], swap: (i: number, w: string[]) => string | null): string[][] {
  const key = (p: string[]) => p.join(' – ');
  const opts = new Map<string, string[]>([[key(right), right]]);
  for (let g = 0; opts.size < 4 && g < 80; g++) {
    const w = right.slice();
    const i = 1 + Math.floor(rnd() * (right.length - 1));
    const s = swap(i, w);
    if (!s || !CH[s]) continue;
    w[i] = s;
    opts.set(key(w), w);
  }
  return shuffleR(rnd, [...opts.values()]);
}
const LETTERS = ['A', 'B', 'C', 'D'];
function progChoice(list: string[][], right: string[], play: (p: string[]) => Stimulus) {
  const key = (p: string[]) => p.join(' – ');
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  list.forEach((p, i) => {
    names[`o${i + 1}`] = nm(`${LETTERS[i]}: ${key(p)}`, `${LETTERS[i]}: ${key(p)}`, `option ${LETTERS[i]}`);
    choiceStim[`o${i + 1}`] = [play(p)];
  });
  return { names, choiceStim, answer: `o${list.findIndex((p) => key(p) === key(right)) + 1}`, choices: list.map((_, i) => `o${i + 1}`) };
}

// ======================================================================= bass-dictation

const BD_DIFF = [1150, 1300, 1400, 1500];
/** What may follow what (common-practice motion); the progression ends with a cadence on I. */
const NEXT: Record<string, string[]> = {
  I: ['IV', 'V', 'vi', 'ii', 'I6', 'ii6'], I6: ['IV', 'ii', 'ii6', 'V'], ii: ['V', 'V7'], ii6: ['V', 'V7'], IV: ['V', 'V7', 'I', 'ii', 'ii6', 'I6'],
  V: ['I', 'vi', 'i', 'VI'], V7: ['I', 'vi', 'i', 'VI'], V6: ['I'], vi: ['IV', 'ii', 'ii6', 'V'],
  i: ['iv', 'VI', 'III', 'ii°', 'V'], III: ['VI', 'iv'], VI: ['iv', 'ii°', 'V'], iv: ['V', 'V7', 'i', 'ii°'], 'ii°': ['V', 'V7'],
};
/** A seeded progression of `n` chords from the pool, starting on `home` and ending on `home` after one of `pre`. */
function walkProg(rnd: () => number, n: number, pool: string[], home: string, pre: string[]): string[] | null {
  for (let g = 0; g < 80; g++) {
    const p = [home];
    while (p.length < n - 1) {
      const nx = (NEXT[p[p.length - 1]] ?? []).filter((x) => pool.includes(x) && (x !== home || p.length > 1));
      if (!nx.length) break;
      p.push(pickR(rnd, nx));
    }
    if (p.length === n - 1 && pre.includes(p[n - 2]) && (NEXT[p[n - 2]] ?? []).includes(home)) return [...p, home];
  }
  return null;
}
function bassProg(rnd: () => number, level: number, T: number): string[] {
  const n = level === 1 ? pickR(rnd, [4, 5]) : 5;
  const pool = level === 1 ? ['I', 'IV', 'V'] : level === 4 ? ['I', 'I6', 'ii6', 'IV', 'V', 'V7', 'vi'] : ['I', 'I6', 'ii', 'IV', 'V', 'V6', 'vi'];
  for (let g = 0; g < 40; g++) {
    const p = walkProg(rnd, n, pool, 'I', ['V', 'V7', 'IV', 'V6']);
    if (!p) continue;
    if (level >= 2 && !p.some((c) => c.endsWith('6'))) continue;
    if (level === 3 && !hasPassing(T, p)) continue;
    return p;
  }
  return level === 3 ? ['I', 'I6', 'IV', 'V', 'I'] : ['I', 'IV', 'V', 'I'];
}
const hasPassing = (T: number, p: string[]) => {
  const { bass } = voiceProg(T, p);
  return bass.some((b, i) => i > 0 && [3, 4].includes(Math.abs(b - bass[i - 1])));
};
/** Bass with diatonic passing notes filling the thirds (each chord two beats). */
function withPassing(T: number, bass: number[]): { notes: number[]; durs: number[] } {
  const notes: number[] = [];
  const durs: number[] = [];
  bass.forEach((b, i) => {
    const nx = bass[i + 1];
    if (nx !== undefined && [3, 4].includes(Math.abs(nx - b))) {
      const dir = sgn(nx - b);
      let p = b + dir;
      while (!MAJ.includes(mod(p - T, 12))) p += dir;
      notes.push(b, p);
      durs.push(1, 1);
    } else {
      notes.push(b);
      durs.push(i === bass.length - 1 ? 3 : 2);
    }
  });
  return { notes, durs };
}

TOPIC_GEN['bass-dictation'] = {
  title: { en: 'Write the bass', he: 'לכתוב את הבס' },
  skill: 'dictation',
  levels: [
    { en: 'Roots of I, IV and V', he: 'יסודות של I, IV ו־V' },
    { en: 'With inversions (I6, V6)', he: 'עם היפוכים (I6, V6)' },
    { en: 'With passing notes', he: 'עם צלילי מעבר' },
    { en: 'Soprano, bass and numerals', he: 'סופרן, בס וספרות רומיות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = pickR(rnd, MAJ_KEYS.slice(0, level === 1 ? 5 : 7));
    const keyPc = pcOf(t);
    const kn = keyName(t, false);
    const T = tonicAt(spPc(t), 43);
    const prog = bassProg(rnd, level, T);
    const { bass, upper } = voiceProg(T, prog);
    const beat = 60 / 76;
    const playProg = (p: string[], passing: boolean) => {
      const v = voiceProg(T, p);
      const out: NoteEvent[] = [];
      v.upper.forEach((u, i) => u.forEach((m) => out.push(N(m, i * 2 * beat, (i === p.length - 1 ? 3 : 2) * beat * 0.95, 0.42))));
      const b = passing ? withPassing(T, v.bass) : { notes: v.bass, durs: v.bass.map((_, i) => (i === v.bass.length - 1 ? 3 : 2)) };
      let tt = 0;
      b.notes.forEach((m, i) => {
        out.push(N(m, tt * beat, b.durs[i] * beat * 0.95, 0.62));
        tt += b.durs[i];
      });
      return ev(out, (p.length * 2 + 1) * beat + 0.3);
    };
    const intro = [keyStim(t, false), rest(0.4)];
    if (level === 4 && rnd() < 0.5) {
      const list = progOptions(rnd, prog, (i, w) => {
        if (i === prog.length - 1) return null;
        const alt: Record<string, string[]> = { I6: ['I', 'vi'], I: ['I6', 'vi'], ii6: ['IV', 'ii6'].filter((x) => x !== w[i]), IV: ['ii6', 'vi'], V: ['V7', 'vi'], V7: ['V'], vi: ['IV', 'I6'] };
        const c = (alt[w[i]] ?? ['IV']).filter((x) => x !== w[i - 1]);
        return c.length ? pickR(rnd, c) : null;
      });
      const c = progChoice(list, prog, (p) => playProg(p, false));
      const sop = upper.map((u) => u[u.length - 1]);
      return choiceQ({ id, topic: 'bass-dictation', level, seed, skill: 'dictation', difficulty: BD_DIFF[3], ask: { en: `In ${kn.en}: listen to the soprano and the bass — which numerals?`, he: `ב${kn.he}: הקשיבו לסופרן ולבס — אילו ספרות?` }, show: { midis: sop, clef: 'treble', key: keyPc }, ...c, stimulus: [...intro, playProg(prog, false)] });
    }
    const passing = level === 3;
    const line = passing ? withPassing(T, bass).notes : bass;
    const sop = upper.map((u) => u[u.length - 1]);
    return placeQ({
      id, topic: 'bass-dictation', level, seed, skill: 'dictation', difficulty: BD_DIFF[level - 1],
      ask: level === 4 ? { en: 'The soprano is given. Write the bass line.', he: 'הסופרן נתון. כתבו את קו הבס.' } : { en: `Write the bass line (${line.length} notes). The first note is given.`, he: `כתבו את קו הבס (${line.length} צלילים). הצליל הראשון נתון.` },
      text: kn,
      target: line,
      as: 'seq', match: 'exact', surface: 'staff',
      staff: { key: keyPc, clef: 'bass' },
      given: level === 4 ? { midis: sop, clef: 'treble', key: keyPc } : { midis: [line[0]], clef: 'bass', key: keyPc },
      stimulus: [...intro, playProg(prog, passing)],
    });
  },
};
TOPIC_TAGS['bass-dictation'] = tg(['dictation', 'bass', 0.6], ['cadences', 'progression', 0.4]);

// ======================================================================= harmonic-dictation 4–6 (wraps spec AD)

{
  const base = TOPIC_GEN['harmonic-dictation'];
  const baseN = base.levels.length;
  const pools: string[][] = [['i', 'ii°', 'III', 'iv', 'V', 'V7', 'VI'], ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7'], ['I', 'ii', 'IV', 'V', 'vi', 'iv', 'V/V', 'V/vi', 'V/IV', '♭VI', '♭VII']];
  const L6: string[][] = [['I', 'V/V', 'V', 'I'], ['I', 'V/vi', 'vi', 'IV'], ['I', 'V/IV', 'IV', 'I'], ['I', 'vi', 'V/V', 'V'], ['I', 'IV', 'iv', 'I'], ['I', '♭VI', '♭VII', 'I'], ['I', '♭VII', 'IV', 'I'], ['I', 'iv', 'V', 'I']];
  const SWAP: Record<string, string[]> = { 'V/V': ['ii', 'IV'], 'V/vi': ['V/V', 'I', 'iv'], 'V/IV': ['I', 'V/V'], iv: ['IV', 'ii'], '♭VI': ['vi', 'IV', 'iv'], '♭VII': ['V', 'IV', '♭VI'], IV: ['iv', 'ii'], vi: ['♭VI', 'IV'], V: ['V/V', 'vi'], I: ['vi', 'IV'] };
  const gen = (seed: number, l: number, id: string): ChoiceQuestion => {
    const rnd = rng(seed);
    const minor = l === 1;
    const pool = pools[l - 1];
    let right: string[];
    if (l === 1) right = walkProg(rnd, 4, pool.concat('i'), 'i', ['V', 'V7', 'iv']) ?? ['i', 'iv', 'V', 'i']; else if (l === 2) {
      right = rnd() < 0.5 ? [pickR(rnd, ['Imaj7', 'vi7', 'iii7', 'IVmaj7']), 'ii7', 'V7', 'Imaj7'] : ['ii7', 'V7', 'Imaj7', pickR(rnd, ['vi7', 'IVmaj7'])];
    } else right = pickR(rnd, L6).slice();
    const list = progOptions(rnd, right, (i, w) => {
      const cands = (l === 3 ? (SWAP[w[i]] ?? pool) : pool).filter((x) => x !== w[i] && x !== w[i - 1] && x !== w[i + 1]);
      return cands.length ? pickR(rnd, cands) : null;
    });
    const t = minor ? pickR(rnd, [S(5), S(1), S(2), S(4), S(0)]) : pickR(rnd, [S(0), S(1), S(3), S(4), S(6, -1)]);
    const T = tonicAt(spPc(t), 43);
    const play = (p: string[]) => {
      const v = voiceProg(T, p);
      return chordsStim(v.bass.map((b, i) => [b, ...v.upper[i]]), 0.9);
    };
    const kn = keyName(t, minor);
    const c = progChoice(list, right, play);
    return choiceQ({ id, topic: 'harmonic-dictation', level: baseN + l, seed, skill: 'cadences', difficulty: [1700, 1760, 1820][l - 1], ask: { en: `In ${kn.en}: write down the four chords.`, he: `ב${kn.he}: רשמו את ארבעת האקורדים.` }, ...c, stimulus: [play([minor ? 'i' : 'I']), rest(0.4), play(right)] });
  };
  TOPIC_GEN['harmonic-dictation'] = {
    ...base,
    levels: [...base.levels, { en: 'Minor keys', he: 'סולמות מינוריים' }, { en: 'Seventh chords, ii–V–I', he: 'אקורדי ספטים, ii–V–I' }, { en: 'Secondary dominants and borrowed chords', he: 'דומיננטות משניות ואקורדים שאולים' }],
    gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : gen(seed, level - baseN, id)),
  };
}

// ======================================================================= scale-spelling

const MODES: { en: string; he: string; st: number[] }[] = [
  { en: 'Dorian', he: 'דורי', st: [0, 2, 3, 5, 7, 9, 10] },
  { en: 'Phrygian', he: 'פריגי', st: [0, 1, 3, 5, 7, 8, 10] },
  { en: 'Lydian', he: 'לידי', st: [0, 2, 4, 6, 7, 9, 11] },
  { en: 'Mixolydian', he: 'מיקסולידי', st: [0, 2, 4, 5, 7, 9, 10] },
  { en: 'Locrian', he: 'לוקרי', st: [0, 1, 3, 5, 6, 8, 10] },
];
TOPIC_GEN['scale-spelling'] = {
  title: { en: 'Write the scale', he: 'לכתוב את הסולם' },
  skill: 'theory',
  levels: [
    { en: 'Major', he: 'מז׳ור' },
    { en: 'Natural minor', he: 'מינור טבעי' },
    { en: 'Harmonic and melodic minor', he: 'מינור הרמוני ומלודי' },
    { en: 'Chromatic', he: 'כרומטי' },
    { en: 'Modes', he: 'מודוסים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const TONICS = [S(0), S(1), S(2), S(3), S(4), S(5), S(6), S(6, -1), S(2, -1), S(5, -1), S(3, 1), S(0, 1)];
    const MINS = [...MIN_KEYS, S(0, 1), S(3), S(6, -1)];
    const t = level === 2 || level === 3 ? pickR(rnd, MINS) : level === 1 ? pickR(rnd, [...MAJ_KEYS, S(2), S(5, -1), S(6), S(1, -1), S(4, -1)]) : pickR(rnd, TONICS);
    const T = tonicAt(spPc(t), pickR(rnd, [55, 60]));
    let st: number[];
    let name: Bi;
    let updown = false;
    if (level === 1) [st, name] = [MAJ, keyName(t, false)];
    else if (level === 2) [st, name] = [NMIN, { en: `${spEn(t)} natural minor`, he: `${spHe(t)} מינור טבעי` }];
    else if (level === 3) {
      if (rnd() < 0.5) [st, name] = [HMIN, { en: `${spEn(t)} harmonic minor`, he: `${spHe(t)} מינור הרמוני` }];
      else {
        [st, name] = [[0, 2, 3, 5, 7, 9, 11], { en: `${spEn(t)} melodic minor`, he: `${spHe(t)} מינור מלודי` }];
        updown = true;
      }
    } else if (level === 4) [st, name] = [[...Array(12).keys()], { en: `chromatic from ${spEn(t)}`, he: `כרומטי מ${spHe(t)}` }];
    else {
      const md = pickR(rnd, MODES);
      [st, name] = [md.st, { en: `${spEn(t)} ${md.en}`, he: `${spHe(t)} ${md.he}` }];
    }
    let target = [...st.map((x) => T + x), T + 12];
    const down = !updown && level !== 3 && rnd() < 0.5;
    if (updown) target = [...target, ...NMIN.slice().reverse().map((x) => T + x)];
    if (down) target = target.reverse();
    const dir = updown ? { en: 'up and back down', he: 'בעלייה ובירידה' } : down ? { en: 'going down', he: 'בירידה' } : { en: 'going up', he: 'בעלייה' };
    return placeQ({
      id, topic: 'scale-spelling', level, seed, skill: 'theory', difficulty: [1050, 1150, 1280, 1300, 1400][level - 1],
      ask: { en: `Write the ${level === 4 ? `chromatic scale from ${spEn(t)}` : `${name.en} scale`} ${dir.en}, with accidentals (no key signature). The first note is given.`, he: `כתבו את סולם ${name.he} ${dir.he}, עם סימני היתק (בלי ארמטורה). הצליל הראשון נתון.` },
      text: { en: `${name.en} · ${dir.en}`, he: `${name.he} · ${dir.he}` },
      target, as: 'seq', match: 'exact', surface: 'staff',
      staff: { key: null, clef: 'treble' },
      given: { midis: [target[0]], clef: 'treble', key: null },
      stimulus: [{ kind: 'note', midi: target[0], duration: 1 }],
    });
  },
};
TOPIC_TAGS['scale-spelling'] = tg(['theory', 'spelling', 0.7], ['notes', 'staff', 0.3]);

// ======================================================================= four-part writing (figured-bass)

interface Chord4 {
  /** pitch classes: root, third, fifth (, seventh) */
  pcs: number[];
  inv: number;
  /** pitch class of the leading note (never doubled) */
  lt: number;
}
const chordOf = (T: number, deg: number, minor: boolean, seventh = false, inv = 0): Chord4 => {
  const sc = minor ? HMIN : MAJ;
  const pcs = [0, 2, 4, ...(seventh ? [6] : [])].map((k) => mod(T + sc[(deg + k) % 7], 12));
  return { pcs, inv, lt: mod(T + 11, 12) };
};
type V4 = [number, number, number, number]; // B T A S
const RANGES: [number, number][] = [[40, 60], [48, 67], [55, 74], [60, 81]];
/** Errors of one chord: spacing (S–A or A–T over an octave), doubling (wrong note doubled, missing third / root). */
function chordErrors(v: V4, c: Chord4, finalI = false): Set<string> {
  const e = new Set<string>();
  const pcs = v.map((m) => mod(m, 12));
  if (v[3] - v[2] > 12 || v[2] - v[1] > 12) e.add('spacing');
  const count = (pc: number) => pcs.filter((p) => p === pc).length;
  const [r, third, fifth, sev] = c.pcs;
  if (!count(r) || !count(third) || (sev !== undefined && !count(sev))) e.add('doubling');
  if (count(c.lt) > 1) e.add('doubling');
  if (sev !== undefined && count(sev) > 1) e.add('doubling');
  if (!count(fifth) && !(finalI && count(r) === 3) && !(sev !== undefined && count(r) === 2)) e.add('doubling');
  if (sev === undefined && c.inv === 0 && count(third) > 1) e.add('doubling');
  return e;
}
/** Errors between two chords: parallels, an unresolved seventh, a leading note that doesn't resolve, big leaps. */
function moveErrors(a: V4, b: V4, ca: Chord4, cb: Chord4): Set<string> {
  const e = new Set<string>();
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) if (parallel(a[j], a[i], b[j], b[i])) e.add('parallel');
  const sev = ca.pcs[3];
  for (let i = 0; i < 4; i++) {
    const mv = b[i] - a[i];
    if (sev !== undefined && mod(a[i], 12) === sev && !(mv === -1 || mv === -2)) e.add('seventh');
    if (mod(a[i], 12) === ca.lt && mod(cb.pcs[0], 12) === mod(ca.lt + 1, 12)) {
      const up = mv === 1;
      const frustrated = (i === 1 || i === 2) && (mv === -3 || mv === -4);
      if (!up && !frustrated) e.add('lt');
    }
    if (i > 0 && Math.abs(mv) > 7) e.add('leap');
    if (i === 0 && Math.abs(mv) > 12) e.add('leap');
  }
  for (let i = 0; i < 3; i++) if (b[i] >= a[i + 1] + 0 && b[i] > a[i + 1]) e.add('overlap');
  return e;
}
/** Every voicing of a chord with bass in the given inversion (voices strictly ordered). */
function voicings(c: Chord4): V4[] {
  const out: V4[] = [];
  const tones = (lo: number, hi: number) => {
    const xs: number[] = [];
    for (let m = lo; m <= hi; m++) if (c.pcs.includes(mod(m, 12))) xs.push(m);
    return xs;
  };
  const bassPc = c.pcs[c.inv];
  for (const B of tones(...RANGES[0]).filter((m) => mod(m, 12) === bassPc))
    for (const Tn of tones(...RANGES[1]).filter((m) => m > B))
      for (const A of tones(...RANGES[2]).filter((m) => m > Tn))
        for (const Sn of tones(...RANGES[3]).filter((m) => m > A)) out.push([B, Tn, A, Sn]);
  return out;
}
const FIG = ['5/3', '6', '6/4'];
const FIG7 = ['7', '6/5', '4/3', '4/2'];
const RN_MAJ = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const QUAL_EN: Record<string, string> = { M: 'major', m: 'minor', d: 'diminished' };
const QUAL_HE: Record<string, string> = { M: 'מז׳ור', m: 'מינור', d: 'מוקטן' };
const voiceTxt = (scale: Sp[], v: number[], lang: 'en' | 'he') => v.map((m) => noteTxt(scale, m)[lang]).join(lang === 'en' ? ' · ' : ' · ');

TOPIC_GEN['figured-bass'] = {
  title: { en: 'Four-part harmony', he: 'הרמוניה בארבעה קולות' },
  skill: 'theory',
  levels: [
    { en: 'Figures → which chord?', he: 'ספרות ← איזה אקורד?' },
    { en: 'Fill in alto and tenor', he: 'להשלים אלט וטנור' },
    { en: 'Find the error', he: 'למצוא את הטעות' },
    { en: 'Complete a cadence in four parts', he: 'להשלים קדנצה בארבעה קולות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = pickR(rnd, MAJ_KEYS.slice(0, 6));
    const keyPc = pcOf(t);
    const kn = keyName(t, false);
    const sc = keyScale(t, false);
    const T = spPc(t);
    if (level === 1) {
      const seventh = rnd() < 0.5;
      const inv = Math.floor(rnd() * (seventh ? 4 : 3));
      const rootDeg = Math.floor(rnd() * 7);
      const bassDeg = (rootDeg + 2 * inv) % 7;
      const fig = seventh ? FIG7[inv] : FIG[inv];
      const nameOf = (deg: number): Bi => {
        const s = sc[deg];
        const tri = [0, 2, 4].map((k) => mod(spPc(sc[(deg + k) % 7]) - spPc(s), 12));
        const q = tri[1] === 4 ? 'M' : tri[2] === 6 ? 'd' : 'm';
        if (!seventh) return { en: `${spEn(s)} ${QUAL_EN[q]}`, he: `${spHe(s)} ${QUAL_HE[q]}` };
        const sv = mod(spPc(sc[(deg + 6) % 7]) - spPc(s), 12);
        const sym = q === 'M' ? (sv === 11 ? 'maj7' : '7') : q === 'm' ? 'm7' : 'm7♭5';
        return { en: `${spEn(s)}${sym}`, he: `${spHe(s)} ${sym}` };
      };
      // the other readings of the same bass note: as root, third, fifth (seventh)
      const roots = [0, 1, 2, 3].map((k) => mod(bassDeg - 2 * k, 7));
      const opts = shuffleR(rnd, [...new Set(roots)]).slice(0, 4);
      if (!opts.includes(rootDeg)) opts[0] = rootDeg;
      const order = shuffleR(rnd, opts);
      const names: Names = {};
      for (const d of order) {
        const n = nameOf(d);
        names[`r${d}`] = nm(n.en, n.he, spSay(sc[d]) + (n.en.includes('7') ? ' seven' : ''));
      }
      const B = tonicAt(spPc(sc[bassDeg]), 43);
      return choiceQ({ id, topic: 'figured-bass', level, seed, skill: 'theory', difficulty: 1200, ask: { en: `In ${kn.en}: this bass note with the figures ${fig} — which chord is it?`, he: `ב${kn.he}: תו הבס הזה עם הספרות ${fig} — איזה אקורד זה?` }, text: { en: `${spEn(sc[bassDeg])} · ${fig}`, he: `${spHe(sc[bassDeg])} · ${fig}` }, show: { midis: [B], clef: 'bass', key: keyPc }, names, answer: `r${rootDeg}`, choices: order.map((d) => `r${d}`), stimulus: [] });
    }
    const Tb = tonicAt(T, 48);
    if (level === 2) {
      const [deg, inv] = pickR(rnd, [[0, 0], [0, 1], [1, 0], [1, 1], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0]] as [number, number][]);
      const c = chordOf(Tb, deg, false, false, inv);
      const good = voicings(c).filter((v) => chordErrors(v, c).size === 0);
      const pickV = pickR(rnd, good);
      const same = good.filter((v) => v[0] === pickV[0] && v[3] === pickV[3]);
      const key4 = (v: V4) => placeKey({ as: 'set', match: 'exact' }, [v[1], v[2]]);
      const fig = FIG[inv];
      return placeQ({
        id, topic: 'figured-bass', level, seed, skill: 'theory', difficulty: 1400,
        ask: { en: `Fill in the alto and the tenor (a ${RN_MAJ[deg]}${inv ? '6' : ''} chord: correct doubling, each voice within an octave of the next).`, he: `השלימו את האלט והטנור (אקורד ${RN_MAJ[deg]}${inv ? '6' : ''}: הכפלה נכונה, לא יותר מאוקטבה בין קולות סמוכים).` },
        text: { en: `${kn.en} · bass ${noteTxt(sc, pickV[0]).en}, figure ${fig} · soprano ${noteTxt(sc, pickV[3]).en}`, he: `${kn.he} · בס ${noteTxt(sc, pickV[0]).he}, ספרה ${fig} · סופרן ${noteTxt(sc, pickV[3]).he}` },
        target: [pickV[1], pickV[2]], as: 'set', match: 'exact', surface: 'keys',
        given: { midis: [pickV[0], pickV[3]], key: keyPc, chord: true },
        alts: [...new Set(same.map(key4))].filter((k) => k !== key4(pickV)),
        stimulus: [],
      });
    }
    if (level === 3) {
      const ERR = ['parallel', 'doubling', 'spacing', 'seventh'];
      const err = pickR(rnd, ERR);
      const pairs: [number, boolean, number, number][] = err === 'seventh' ? [[4, true, 0, 0]] : [[3, false, 4, 0], [0, false, 4, 0], [1, false, 4, 0], [4, false, 5, 0], [4, true, 0, 0]];
      const found = tries(() => {
        const [d1, s1, d2] = pickR(rnd, pairs);
        const c1 = chordOf(Tb, d1, false, s1);
        const c2 = chordOf(Tb, d2, false, false);
        const v1s = voicings(c1).filter((v) => chordErrors(v, c1).size === 0);
        const v1 = pickR(rnd, v1s);
        const bad = voicings(c2).filter((v2) => {
          const es = new Set([...chordErrors(v2, c2, d2 === 0 && s1), ...moveErrors(v1, v2, c1, c2)]);
          return es.size === 1 && es.has(err);
        });
        return bad.length ? { v1, v2: pickR(rnd, bad), d1, s1, d2 } : null;
      }, 30);
      // fallback: IV → V with parallel fifths and octaves
      const f = found ?? { v1: [Tb - 7, Tb, Tb + 5, Tb + 9] as V4, v2: [Tb - 5, Tb + 2, Tb + 7, Tb + 11] as V4, d1: 3, s1: false, d2: 4 };
      const answer = found ? err : 'parallel';
      const lbl = (d: number, s: boolean) => (d === 4 && s ? 'V7' : RN_MAJ[d]);
      const VO = { en: ['B', 'T', 'A', 'S'], he: ['בס', 'טנור', 'אלט', 'סופרן'] };
      const lines = (lang: 'en' | 'he') => [3, 2, 1, 0].map((i) => `${VO[lang][i]}: ${noteTxt(sc, f.v1[i])[lang]} → ${noteTxt(sc, f.v2[i])[lang]}`).join('\n');
      const names: Names = {
        parallel: nm('Parallel fifths or octaves', 'קווינטות או אוקטבות מקבילות', 'parallels'),
        doubling: nm('Wrong doubling', 'הכפלה שגויה', 'doubling'),
        spacing: nm('Spacing: voices too far apart', 'מרווח גדול מדי בין הקולות', 'spacing'),
        seventh: nm('The seventh does not resolve down', 'הספטימה לא נפתרת למטה', 'seventh'),
      };
      const choices = ERR;
      const sub: Names = {};
      for (const c of choices) sub[c] = names[c];
      return choiceQ({ id, topic: 'figured-bass', level, seed, skill: 'theory', difficulty: 1450, ask: { en: `In ${kn.en}, ${lbl(f.d1, f.s1)} → ${lbl(f.d2, false)}: what is wrong?`, he: `ב${kn.he}, ${lbl(f.d1, f.s1)} ← ${lbl(f.d2, false)}: מה לא בסדר?` }, text: { en: lines('en'), he: lines('he') }, names: sub, answer, choices, stimulus: [chordsStim([f.v1, f.v2], 1.1)] });
    }
    // level 4: V or V7 given in four parts; I has its soprano and bass — write alto and tenor.
    const s1 = rnd() < 0.5;
    const c1 = chordOf(Tb, 4, false, s1);
    const c2 = chordOf(Tb, 0, false);
    const r = tries(() => {
      const v1s = voicings(c1).filter((v) => chordErrors(v, c1).size === 0);
      const v1 = pickR(rnd, v1s);
      const ok = voicings(c2).filter((v2) => chordErrors(v2, c2, s1).size === 0 && moveErrors(v1, v2, c1, c2).size === 0);
      return ok.length ? { v1, ok } : null;
    }, 30)!;
    const v2 = pickR(rnd, r.ok);
    const same = r.ok.filter((v) => v[0] === v2[0] && v[3] === v2[3]);
    const key4 = (v: V4) => placeKey({ as: 'set', match: 'exact' }, [v[1], v[2]]);
    const vName = s1 ? 'V7' : 'V';
    return placeQ({
      id, topic: 'figured-bass', level, seed, skill: 'theory', difficulty: 1500,
      ask: { en: `Complete the cadence ${vName}–I: write the alto and tenor of I (no parallels; the leading note rises${s1 ? ', the seventh falls' : ''}).`, he: `השלימו את הקדנצה ${vName}–I: כתבו את האלט והטנור של I (בלי מקבילות; הצליל המוביל עולה${s1 ? ', הספטימה יורדת' : ''}).` },
      text: { en: `${kn.en} · ${vName}: ${voiceTxt(sc, r.v1, 'en')} → I: bass ${noteTxt(sc, v2[0]).en}, soprano ${noteTxt(sc, v2[3]).en}`, he: `${kn.he} · ${vName}: ${voiceTxt(sc, r.v1, 'he')} ← I: בס ${noteTxt(sc, v2[0]).he}, סופרן ${noteTxt(sc, v2[3]).he}` },
      target: [v2[1], v2[2]], as: 'set', match: 'exact', surface: 'keys',
      given: { midis: [...r.v1], key: keyPc, chord: true },
      alts: [...new Set(same.map(key4))].filter((k) => k !== key4(v2)),
      stimulus: [],
    });
  },
};
// One tag per skill (the taxonomy rule): spec's theory/voice-leading .6 + theory/harmony .4 becomes a per-level choice.
TOPIC_TAGS['figured-bass'] = (l) => (l === 1 ? tg(['theory', 'harmony', 1]) : tg(['theory', 'voice-leading', 1]));

// ======================================================================= chromatic-theory

TOPIC_GEN['chromatic-theory'] = {
  title: { en: 'Colour chords on paper', he: 'אקורדי צבע בכתב' },
  skill: 'theory',
  levels: [
    { en: 'The cadential 6/4', he: 'הקוורטסקסט הקדנציאלי' },
    { en: 'Spell the Neapolitan', he: 'לאיית את הנפוליטני' },
    { en: 'Italian, French or German sixth?', he: 'סקסטה איטלקית, צרפתית או גרמנית?' },
    { en: 'Secondary leading-note chords', he: 'אקורדי צליל מוביל משניים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level === 1) {
      const t = pickR(rnd, MAJ_KEYS);
      const sc = keyScale(t, false);
      const T = tonicAt(spPc(t), 55);
      const m = (d: number) => idxMidi(T, d, MAJ);
      const C: Record<string, { v: number[]; n: Bi; say: string }> = {
        cad: { v: [m(-3), m(0), m(2), m(4)], n: { en: 'Cadential 6/4 (I 6/4)', he: 'קוורטסקסט קדנציאלי (I 6/4)' }, say: 'cadential' },
        i6: { v: [m(-5), m(-3), m(0), m(4)], n: { en: 'Tonic, first inversion (I6)', he: 'טוניקה בהיפוך ראשון (I6)' }, say: 'first inversion' },
        iv: { v: [m(-4), m(0), m(3), m(5)], n: { en: 'Subdominant (IV)', he: 'סובדומיננטה (IV)' }, say: 'subdominant' },
        ii6: { v: [m(-4), m(-2), m(1), m(5)], n: { en: 'Supertonic 6 (ii6)', he: 'דרגה שנייה בהיפוך (ii6)' }, say: 'supertonic' },
      };
      const answer = pickR(rnd, ['cad', 'cad', 'i6', 'iv', 'ii6']);
      const choices = shuffleR(rnd, [answer, ...shuffleR(rnd, Object.keys(C).filter((k) => k !== answer)).slice(0, 3)]);
      const names: Names = {};
      for (const k of choices) names[k] = nm(C[k].n.en, C[k].n.he, C[k].say);
      const sp = C[answer].v.map((x) => spellIn(sc, x));
      return choiceQ({ id, topic: 'chromatic-theory', level, seed, skill: 'theory', difficulty: 1350, ask: { en: `In ${keyName(t, false).en}, the chord just before V at the cadence — what is it?`, he: `ב${keyName(t, false).he}, האקורד שלפני V בקדנצה — מה הוא?` }, text: joinSp(sp), show: { midis: C[answer].v, chord: true, key: pcOf(t) }, names, answer, choices, stimulus: [] });
    }
    if (level === 2) {
      const minor = rnd() < 0.7;
      const t = minor ? pickR(rnd, MIN_KEYS.slice(0, 6)) : pickR(rnd, MAJ_KEYS.slice(0, 5));
      const triad = (r: Sp | null, third: number): Sp[] | null => {
        if (!r) return null;
        const a = above(r, 3, third);
        const b = above(r, 5, 7);
        return a && b ? [r, a, b] : null;
      };
      const dim = (r: Sp): Sp[] | null => {
        const a = above(r, 3, 3);
        const b = above(r, 5, 6);
        return a && b ? [r, a, b] : null;
      };
      const nRoot = above1(t, 2, 1);
      const right = triad(nRoot, 4)!;
      // the same pitches on the wrong letters (D♭ spelled as C♯)
      const el = mod(nRoot.l - 1, 7);
      let ea = mod(spPc(nRoot) - NAT[el], 12);
      if (ea > 6) ea -= 12;
      const enhRoot: Sp | null = Math.abs(ea) <= 2 ? { l: el, a: ea } : null;
      const cands = [triad(enhRoot, 4), triad(above(t, 2, 2), 4), minor ? dim(above1(t, 2, 2)) : triad(above(t, 2, 2), 3), triad(nRoot, 3)].filter((x): x is Sp[] => !!x);
      const pool: Sp[][] = [right];
      for (const c of cands) if (pool.length < 4 && !pool.some((p) => joinSp(p).en === joinSp(c).en)) pool.push(c);
      const order = shuffleR(rnd, pool);
      const names: Names = {};
      order.forEach((p) => {
        const j = joinSp(p);
        names[j.en] = nm(j.en, j.he, p.map(spSay).join(' '));
      });
      const kn = keyName(t, minor);
      return choiceQ({ id, topic: 'chromatic-theory', level, seed, skill: 'theory', difficulty: 1450, ask: { en: `Spell the Neapolitan chord (♭II) in ${kn.en}, from its root.`, he: `אייתו את האקורד הנפוליטני (♭II) ב${kn.he}, מהיסוד.` }, text: { en: `${kn.en}: ♭II = ?`, he: `${kn.he}: ♭II = ?` }, names, answer: joinSp(right).en, choices: order.map((p) => joinSp(p).en), stimulus: [] });
    }
    if (level === 3) {
      const minor = rnd() < 0.5;
      const t = minor ? pickR(rnd, MIN_KEYS.slice(0, 6)) : pickR(rnd, MAJ_KEYS.slice(0, 6));
      const kind = pickR(rnd, ['it', 'fr', 'ger']);
      const b6 = above1(t, 6, 8);
      const s4 = above1(t, 4, 6);
      const mid = kind === 'it' ? [t] : kind === 'fr' ? [t, above1(t, 2, 2)] : [t, above1(t, 3, 3)];
      const sp = [b6, ...mid, s4];
      const T = tonicAt(spPc(t), 60);
      const midis = [T + 8 - 12, T, ...(kind === 'fr' ? [T + 2] : kind === 'ger' ? [T + 3] : []), T + 6];
      const names: Names = { it: nm('Italian sixth (It+6)', 'סקסטה איטלקית (It+6)', 'italian'), fr: nm('French sixth (Fr+6)', 'סקסטה צרפתית (Fr+6)', 'french'), ger: nm('German sixth (Ger+6)', 'סקסטה גרמנית (Ger+6)', 'german') };
      const kn = keyName(t, minor);
      return choiceQ({ id, topic: 'chromatic-theory', level, seed, skill: 'theory', difficulty: 1550, ask: { en: `In ${kn.en}: which augmented sixth chord is this?`, he: `ב${kn.he}: איזה אקורד סקסטה מוגדלת זה?` }, text: joinSp(sp), show: { midis, chord: true, key: null }, names, answer: kind, choices: ['it', 'fr', 'ger'], stimulus: [] });
    }
    // level 4: vii°7 of a scale degree (leading-note seventh chords)
    const t = pickR(rnd, MAJ_KEYS.slice(0, 6));
    const sc = keyScale(t, false);
    const TG = [{ k: 'I', d: 0 }, { k: 'ii', d: 1 }, { k: 'iii', d: 2 }, { k: 'IV', d: 3 }, { k: 'V', d: 4 }, { k: 'vi', d: 5 }];
    const target = pickR(rnd, TG.slice(1));
    const r = above1(sc[target.d], 7, 11);
    const sp = [r, above1(r, 3, 3), above1(r, 5, 6), above1(r, 7, 9)];
    const lab = (k: string) => (k === 'I' ? 'vii°7' : `vii°7/${k}`);
    const opts = shuffleR(rnd, [target, ...shuffleR(rnd, TG.filter((x) => x.k !== target.k)).slice(0, 3)]);
    const names: Names = {};
    for (const o of opts) names[lab(o.k)] = nm(lab(o.k), lab(o.k), o.k === 'I' ? 'leading note seventh' : `leading note seventh of ${o.k}`);
    const kn = keyName(t, false);
    const T = tonicAt(spPc(r), 55);
    return choiceQ({ id, topic: 'chromatic-theory', level, seed, skill: 'theory', difficulty: 1650, ask: { en: `In ${kn.en}: which chord is this?`, he: `ב${kn.he}: איזה אקורד זה?` }, text: joinSp(sp), show: { midis: [T, T + 3, T + 6, T + 9], chord: true, key: pcOf(t) }, names, answer: lab(target.k), choices: opts.map((o) => lab(o.k)), stimulus: [] });
  },
};
// One tag per skill (the taxonomy rule): spec's theory/spelling .2 is folded in; L2 (spelling the Neapolitan) is rated as spelling.
TOPIC_TAGS['chromatic-theory'] = (l) => (l === 2 ? tg(['theory', 'spelling', 1]) : tg(['theory', 'chromatic', 1]));

// ======================================================================= counterpoint (species error spotting)

const CFS = [
  [0, 2, 3, 1, 2, 1, 0],
  [0, 3, 2, 4, 3, 1, 0],
  [0, 1, 2, 0, 3, 2, 1, 0],
  [0, 4, 3, 2, 3, 1, 0],
  [0, 2, 1, 3, 2, 1, 0],
];
/** First-species faults of a counterpoint above a cantus (midis). */
function species1Errors(cf: number[], cp: number[]): Set<string> {
  const e = new Set<string>();
  cp.forEach((c, i) => {
    if (!consonant(c - cf[i])) e.add('diss');
    if (i > 0) {
      if (parallel(c, cf[i], cp[i - 1], cf[i - 1]) || parallel(cp[i - 1], cf[i - 1], c, cf[i])) e.add((c - cf[i]) % 12 === 7 ? 'p5' : 'p8');
      const lp = Math.abs(c - cp[i - 1]);
      if (lp === 6 || lp === 10 || lp === 11 || lp > 12) e.add('leap');
    }
  });
  return e;
}
function species2Errors(cf: number[], down: number[], weak: number[]): Set<string> {
  const e = new Set<string>();
  down.forEach((d, i) => {
    if (!consonant(d - cf[i])) e.add('diss-down');
    if (i > 0 && (parallel(down[i - 1], cf[i - 1], d, cf[i]) || parallel(weak[i - 1], cf[i - 1], d, cf[i]))) e.add('par');
  });
  weak.forEach((w, i) => {
    const nx = down[i + 1];
    const passing = Math.abs(w - down[i]) <= 2 && Math.abs(nx - w) <= 2 && sgn(w - down[i]) === sgn(nx - w) && w !== down[i];
    if (!consonant(w - cf[i]) && !passing) e.add('diss-weak');
    for (const lp of [Math.abs(w - down[i]), Math.abs(nx - w)]) if (lp === 6 || lp >= 10 || lp === 0) e.add('leap');
  });
  return e;
}

TOPIC_GEN['counterpoint'] = {
  title: { en: 'Species counterpoint', he: 'קונטרפונקט לפי סוגים' },
  skill: 'theory',
  levels: [
    { en: 'First species: note against note', he: 'סוג ראשון: תו מול תו' },
    { en: 'Second species: two against one', he: 'סוג שני: שניים מול אחד' },
    { en: 'Fourth species: suspensions', he: 'סוג רביעי: השהיות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = pickR(rnd, MAJ_KEYS.slice(0, 6));
    const sc = keyScale(t, false);
    const T = tonicAt(spPc(t), 48);
    const m = (i: number) => idxMidi(T, i, MAJ);
    const kn = keyName(t, false);
    const nameLine = (xs: number[], lang: 'en' | 'he') => xs.map((x) => spellIn(sc, x)).map(lang === 'en' ? spEn : spHe).join(' ');
    const NONE = nm('No mistake', 'אין טעות', 'no mistake', 'correct');
    if (level === 3) {
      // A chain of 7–6 suspensions over a cantus falling by step.
      const s = pickR(rnd, [4, 5, 7]);
      const cfI = Array.from({ length: s + 1 }, (_, i) => s - i);
      const cf = cfI.map(m);
      const w = cfI.slice(0, s).map((c) => m(c + 5));
      const down: (number | null)[] = [null, ...w.slice(0, s - 1)];
      const weak = [...w];
      const fin = m(7);
      const err = pickR(rnd, ['up', 'unprep', 'none']);
      if (err === 'up') weak[s - 1] = m(cfI[s - 1] + 7);
      if (err === 'unprep') weak[0] = m(cfI[0] + pickR(rnd, [2, 7]));
      const bars = (lang: 'en' | 'he') => {
        const nmz = (x: number) => (lang === 'en' ? spEn : spHe)(spellIn(sc, x));
        const out = [`— ${nmz(weak[0])}`];
        for (let k = 1; k < s; k++) out.push(`${down[k] === weak[k - 1] ? '‿' : ''}${nmz(down[k]!)} ${nmz(weak[k])}`);
        out.push(nmz(fin));
        return out.join(' | ');
      };
      const line = [weak[0], ...Array.from({ length: s - 1 }, (_, k) => [down[k + 1]!, weak[k + 1]]).flat(), fin];
      const names: Names = { up: nm('Resolves up instead of down', 'נפתר למעלה במקום למטה', 'resolves up'), unprep: nm('The dissonance is not prepared', 'הדיסוננס לא הוכן', 'not prepared'), none: NONE };
      const evs: NoteEvent[] = [];
      const b = 0.5;
      cf.forEach((c, i) => evs.push(N(c, i * 2 * b, 2 * b * 0.95, 0.5)));
      line.forEach((x, i) => evs.push(N(x, (i + 1) * b, (i === line.length - 1 ? 2 : 1) * b * 0.95, 0.62)));
      return choiceQ({ id, topic: 'counterpoint', level, seed, skill: 'theory', difficulty: 1550, ask: { en: `Fourth species in ${kn.en} (‿ = tied over the bar). What is wrong?`, he: `סוג רביעי ב${kn.he} (‿ = מוארך מעבר לקו התיבה). מה לא בסדר?` }, text: { en: `Cantus: ${nameLine(cf, 'en')}\nCounterpoint: ${bars('en')}`, he: `קנטוס פירמוס: ${nameLine(cf, 'he')}\nקונטרפונקט: ${bars('he')}` }, show: { midis: line, key: pcOf(t) }, names, answer: err, choices: ['up', 'unprep', 'none'], stimulus: [ev(evs, cf.length * 2 * b + 0.3)] });
    }
    const r = tries(() => {
      const cfI = pickR(rnd, CFS);
      const cpI = counterVoice(rnd, cfI, false, T, { lo: 2, hi: 11, maxLeap: 4, first: [4, 7], last: [7], contrary: false, noRepeat: true });
      if (!cpI || cpI[cpI.length - 2] !== 6) return null;
      const cf = cfI.map(m);
      const cp = cpI.map(m);
      if (level === 1) return species1Errors(cf, cp).size === 0 ? { cf, cp, weak: [] as number[] } : null;
      // second species: weak beats fill in (passing notes or consonant skips)
      const weak: number[] = [];
      for (let i = 0; i < cp.length - 1; i++) {
        const a = cpI[i];
        const b = cpI[i + 1];
        if (Math.abs(b - a) === 2) {
          weak.push(m((a + b) / 2));
          continue;
        }
        const opts: number[] = [];
        for (let x = 2; x <= 12; x++)
          if (x !== a && x !== b && Math.abs(x - a) <= 4 && Math.abs(b - x) <= 4 && species2Errors(cf.slice(0, i + 2), cp.slice(0, i + 2), weak.concat(m(x))).size === 0) opts.push(m(x));
        if (!opts.length) return null;
        weak.push(pickR(rnd, opts));
      }
      return species2Errors(cf, cp, weak).size === 0 ? { cf, cp, weak } : null;
    }, 80)!;
    const { cf, cp } = r;
    if (level === 1) {
      const errs = ['p5', 'p8', 'diss', 'leap'];
      let err = pickR(rnd, [...errs, 'none']);
      let line = cp;
      if (err !== 'none') {
        const cands: number[][] = [];
        for (let i = 1; i < cp.length - 1; i++)
          for (let x = 0; x <= 13; x++) {
            const v = cp.slice();
            v[i] = m(x);
            const es = species1Errors(cf, v);
            if (es.size === 1 && es.has(err) && v[i] > cf[i]) cands.push(v);
          }
        if (cands.length) line = pickR(rnd, cands);
        else err = 'none';
      }
      const names: Names = { p5: nm('Parallel fifths', 'קווינטות מקבילות', 'fifths'), p8: nm('Parallel octaves', 'אוקטבות מקבילות', 'octaves'), diss: nm('A dissonance', 'דיסוננס', 'dissonance'), leap: nm('A forbidden leap (7th or tritone)', 'קפיצה אסורה (ספטימה או טריטון)', 'leap'), none: NONE };
      const choices = shuffleR(rnd, [err, ...shuffleR(rnd, [...errs, 'none'].filter((x) => x !== err)).slice(0, 3)]);
      const sub: Names = {};
      for (const c of choices) sub[c] = names[c];
      const evs: NoteEvent[] = [];
      cf.forEach((c, i) => evs.push(N(c, i * 0.7, 0.66, 0.5), N(line[i], i * 0.7, 0.66, 0.62)));
      return choiceQ({ id, topic: 'counterpoint', level, seed, skill: 'theory', difficulty: 1350, ask: { en: `First species in ${kn.en}. What is wrong?`, he: `סוג ראשון ב${kn.he}. מה לא בסדר?` }, text: { en: `Counterpoint: ${nameLine(line, 'en')}\nCantus: ${nameLine(cf, 'en')}`, he: `קונטרפונקט: ${nameLine(line, 'he')}\nקנטוס פירמוס: ${nameLine(cf, 'he')}` }, show: { midis: line, key: pcOf(t) }, names: sub, answer: err, choices, stimulus: [ev(evs, cf.length * 0.7 + 0.3)] });
    }
    // level 2: second species
    const down = cp;
    const weak = r.weak;
    const errs = ['diss-down', 'diss-weak', 'par'];
    let err = pickR(rnd, [...errs, 'none']);
    let D = down;
    let W = weak;
    if (err !== 'none') {
      const cands: [number[], number[]][] = [];
      for (let i = 1; i < down.length - 1; i++)
        for (let x = 1; x <= 13; x++) {
          const d2 = down.slice();
          d2[i] = m(x);
          const es = species2Errors(cf, d2, weak);
          if (es.size === 1 && es.has(err) && d2[i] > cf[i]) cands.push([d2, weak]);
          const w2 = weak.slice();
          w2[i] = m(x);
          const es2 = species2Errors(cf, down, w2);
          if (es2.size === 1 && es2.has(err) && w2[i] > cf[i]) cands.push([down, w2]);
        }
      if (cands.length) [D, W] = pickR(rnd, cands);
      else err = 'none';
    }
    const line = D.flatMap((d, i) => (i < W.length ? [d, W[i]] : [d]));
    const names: Names = { 'diss-down': nm('A dissonance on the strong beat', 'דיסוננס בפעמה חזקה', 'strong beat'), 'diss-weak': nm('A dissonance that is not a passing note', 'דיסוננס שאינו צליל מעבר', 'not a passing note'), par: nm('Parallel fifths or octaves', 'קווינטות או אוקטבות מקבילות', 'parallels'), none: NONE };
    const evs: NoteEvent[] = [];
    const b = 0.45;
    cf.forEach((c, i) => evs.push(N(c, i * 2 * b, 2 * b * 0.95, 0.5)));
    line.forEach((x, i) => evs.push(N(x, i * b, (i === line.length - 1 ? 2 : 1) * b * 0.95, 0.62)));
    const bars = (lang: 'en' | 'he') => D.map((d, i) => (i < W.length ? `${nameLine([d], lang)} ${nameLine([W[i]], lang)}` : nameLine([d], lang))).join(' | ');
    const answer = err;
    return choiceQ({ id, topic: 'counterpoint', level, seed, skill: 'theory', difficulty: 1450, ask: { en: `Second species in ${kn.en}. What is wrong?`, he: `סוג שני ב${kn.he}. מה לא בסדר?` }, text: { en: `Counterpoint: ${bars('en')}\nCantus: ${nameLine(cf, 'en')}`, he: `קונטרפונקט: ${bars('he')}\nקנטוס פירמוס: ${nameLine(cf, 'he')}` }, show: { midis: line, key: pcOf(t) }, names, answer, choices: [...errs, 'none'], stimulus: [ev(evs, cf.length * 2 * b + 0.3)] });
  },
};
TOPIC_TAGS['counterpoint'] = tg(['theory', 'voice-leading', 1]);

// ======================================================================= ornaments

const ORN: Record<string, { n: Bi; say: string; shape: (M: number, U: number, L: number) => { m: number[]; d: number[] } }> = {
  trill: { n: { en: 'Trill', he: 'טריל' }, say: 'trill', shape: (M, U) => ({ m: [U, M, U, M, U, M, U, M], d: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25] }) },
  mordent: { n: { en: 'Mordent (lower)', he: 'מורדנט (תחתון)' }, say: 'lower mordent', shape: (M, _U, L) => ({ m: [M, L, M], d: [0.25, 0.25, 1.5] }) },
  upper: { n: { en: 'Upper mordent', he: 'מורדנט עליון' }, say: 'upper mordent', shape: (M, U) => ({ m: [M, U, M], d: [0.25, 0.25, 1.5] }) },
  turn: { n: { en: 'Turn', he: 'גרופטו' }, say: 'turn', shape: (M, U, L) => ({ m: [U, M, L, M], d: [0.5, 0.5, 0.5, 0.5] }) },
  appog: { n: { en: 'Appoggiatura', he: 'אפוג׳יאטורה' }, say: 'appoggiatura', shape: (M, U) => ({ m: [U, M], d: [1, 1] }) },
};
TOPIC_GEN['ornaments'] = {
  title: { en: 'Ornaments', he: 'קישוטים' },
  skill: 'theory',
  levels: [
    { en: 'Which ornament is written out?', he: 'איזה קישוט כתוב כאן במלואו?' },
    { en: 'How is it played?', he: 'איך מנגנים אותו?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = pickR(rnd, MAJ_KEYS.slice(0, 5));
    const sc = keyScale(t, false);
    const T = tonicAt(spPc(t), 60);
    const d = 1 + Math.floor(rnd() * 5);
    const M = idxMidi(T, d, MAJ);
    const U = idxMidi(T, d + 1, MAJ);
    const L = idxMidi(T, d - 1, MAJ);
    const kind = pickR(rnd, Object.keys(ORN));
    const kn = keyName(t, false);
    if (level === 1) {
      const { m, d: ds } = ORN[kind].shape(M, U, L);
      const choices = shuffleR(rnd, [kind, ...shuffleR(rnd, Object.keys(ORN).filter((k) => k !== kind)).slice(0, 3)]);
      const names: Names = {};
      for (const c of choices) names[c] = nm(ORN[c].n.en, ORN[c].n.he, ORN[c].say);
      return choiceQ({ id, topic: 'ornaments', level, seed, skill: 'theory', difficulty: 1150, ask: { en: `In ${kn.en}: the main note is ${spEn(sc[d % 7])}. Which ornament is written out here?`, he: `ב${kn.he}: הצליל הראשי הוא ${spHe(sc[d % 7])}. איזה קישוט כתוב כאן במלואו?` }, show: { midis: m, key: pcOf(t) }, names, answer: kind, choices, stimulus: [{ kind: 'melody', midis: m, beats: ds, bpm: 72 }] });
    }
    const real = (k: string) => ORN[k].shape(M, U, L).m.map((x) => spellIn(sc, x));
    const lbl = (k: string): Bi => {
      const xs = real(k);
      const j = joinSp(k === 'trill' ? xs.slice(0, 6) : xs);
      return k === 'trill' ? { en: `${j.en} …`, he: `${j.he} …` } : j;
    };
    const choices = shuffleR(rnd, [kind, ...shuffleR(rnd, Object.keys(ORN).filter((k) => k !== kind)).slice(0, 3)]);
    const names: Names = {};
    for (const c of choices) names[c] = nm(lbl(c).en, lbl(c).he);
    return choiceQ({ id, topic: 'ornaments', level, seed, skill: 'theory', difficulty: 1300, ask: { en: `In ${kn.en}: how is ${/^[aeiou]/i.test(ORN[kind].n.en) ? 'an' : 'a'} ${ORN[kind].n.en.toLowerCase()} on ${spEn(sc[d % 7])} played?`, he: `ב${kn.he}: איך מנגנים ${ORN[kind].n.he} על ${spHe(sc[d % 7])}?` }, text: { en: `${ORN[kind].n.en} · ${spEn(sc[d % 7])}`, he: `${ORN[kind].n.he} · ${spHe(sc[d % 7])}` }, names, answer: kind, choices, stimulus: [] });
  },
};
TOPIC_TAGS['ornaments'] = tg(['theory', 'terms', 1]);
// SPEC-0.48 §D: ornaments by ear inside a phrase, then count them.
{
  const base = TOPIC_GEN['ornaments'];
  const baseN = base.levels.length;
  const phrase = (rnd: () => number, orn: (string | null)[]) => {
    const t = pickR(rnd, MAJ_KEYS.slice(0, 5));
    const T = tonicAt(spPc(t), 60);
    let d = 2 + Math.floor(rnd() * 3);
    const m: number[] = [];
    const ds: number[] = [];
    orn.forEach((k, i) => {
      const M = idxMidi(T, d, MAJ);
      if (k) {
        const s = ORN[k].shape(M, idxMidi(T, d + 1, MAJ), idxMidi(T, d - 1, MAJ));
        const scale = 2 / s.d.reduce((a, b) => a + b, 0);
        m.push(...s.m);
        ds.push(...s.d.map((x) => x * scale));
      } else {
        m.push(M);
        ds.push(i === orn.length - 1 ? 2 : 1);
      }
      d = Math.max(1, Math.min(6, d + pickR(rnd, [-1, 1, 2, -2])));
    });
    return { kind: 'melody' as const, midis: m, beats: ds, bpm: 84 };
  };
  TOPIC_GEN['ornaments'] = {
    ...base,
    levels: [...base.levels, { en: 'Which ornament is in the phrase?', he: 'איזה קישוט יש במשפט?' }, { en: 'How many ornaments?', he: 'כמה קישוטים?' }],
    gen(seed, level, id) {
      if (level <= baseN) return base.gen(seed, level, id);
      const rnd = rng(seed);
      const kinds = Object.keys(ORN);
      if (level === baseN + 1) {
        const kind = pickR(rnd, kinds);
        const at = 1 + Math.floor(rnd() * 2);
        const orn = [null, null, null, null].map((_, i) => (i === at ? kind : null));
        const choices = shuffleR(rnd, [kind, ...shuffleR(rnd, kinds.filter((k) => k !== kind)).slice(0, 3)]);
        const names: Names = {};
        for (const c of choices) names[c] = nm(ORN[c].n.en, ORN[c].n.he, ORN[c].say);
        return choiceQ({ id, topic: 'ornaments', level, seed, skill: 'theory', difficulty: 1400, ask: { en: 'A short phrase with one ornament. Which one?', he: 'משפט קצר עם קישוט אחד. איזה?' }, names, answer: kind, choices, stimulus: [phrase(rnd, orn)] });
      }
      const n = 1 + Math.floor(rnd() * 3);
      const slots = shuffleR(rnd, [0, 1, 2, 3, 4]).slice(0, n);
      const orn = [0, 1, 2, 3, 4, 5].map((i) => (slots.includes(i) ? pickR(rnd, kinds) : null));
      return choiceQ({
        id, topic: 'ornaments', level, seed, skill: 'theory', difficulty: 1500,
        ask: { en: 'How many notes in this phrase are ornamented?', he: 'כמה צלילים במשפט הזה מקושטים?' },
        names: { n1: nm('One', 'אחד', 'one', '1'), n2: nm('Two', 'שניים', 'two', '2'), n3: nm('Three', 'שלושה', 'three', '3') },
        answer: `n${n}`, choices: ['n1', 'n2', 'n3'], stimulus: [phrase(rnd, orn)],
      });
    },
  };
}

// ======================================================================= time-signatures 4–5 (wraps spec AD)

{
  const base = TOPIC_GEN['time-signatures'];
  const baseN = base.levels.length;
  const SYM: Record<number, string> = { 0.5: '♪', 1: '♩', 1.5: '♩.', 2: '𝅗𝅥', 3: '𝅗𝅥.', 4: '𝅝' };
  const BEAM: { sig: string; right: string; wrong: string[] }[] = [
    { sig: '6/8', right: '♪♪♪ ♪♪♪', wrong: ['♪♪ ♪♪ ♪♪', '♪♪♪♪ ♪♪'] },
    { sig: '3/4', right: '♪♪ ♪♪ ♪♪', wrong: ['♪♪♪ ♪♪♪', '♪ ♪♪♪ ♪♪'] },
    { sig: '4/4', right: '♪♪♪♪ ♪♪♪♪', wrong: ['♪♪♪ ♪♪ ♪♪♪', '♪♪ ♪♪♪♪ ♪♪'] },
    { sig: '9/8', right: '♪♪♪ ♪♪♪ ♪♪♪', wrong: ['♪♪ ♪♪ ♪♪ ♪♪ ♪', '♪♪♪♪ ♪♪♪♪♪'] },
    { sig: '4/4', right: '♩ 𝄽 𝄽 ♩', wrong: ['♩ 𝄼 ♩', '♩ 𝄽. 𝄾 ♩'] },
    { sig: '3/4', right: '♩ 𝄽 𝄽', wrong: ['♩ 𝄼', '♩ 𝄽 𝄾 𝄾'] },
    { sig: '2/4', right: '♪♪ ♪♪', wrong: ['♪ ♪♪ ♪', '♪♪♪ ♪'] },
    { sig: '12/8', right: '♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪', wrong: ['♪♪ ♪♪ ♪♪ ♪♪ ♪♪ ♪♪', '♪♪♪♪ ♪♪♪♪ ♪♪♪♪'] },
  ];
  const METERS: { sig: string; beats: number; bars: number[][] }[] = [
    { sig: '3/4', beats: 3, bars: [[1, 1, 1], [2, 1], [1, 2], [3], [0.5, 0.5, 1, 1], [1.5, 0.5, 1]] },
    { sig: '4/4', beats: 4, bars: [[1, 1, 1, 1], [2, 2], [2, 1, 1], [1, 1, 2], [3, 1], [1.5, 0.5, 2]] },
    { sig: '2/4', beats: 2, bars: [[1, 1], [2], [0.5, 0.5, 1], [1.5, 0.5]] },
    { sig: '6/8', beats: 3, bars: [[1.5, 1.5], [1, 0.5, 1.5], [3], [1.5, 1, 0.5]] },
  ];
  const opt = (i: number, s: string) => nm(`${LETTERS[i]}: ${s}`, `${LETTERS[i]}: ${s}`, `option ${LETTERS[i]}`);
  const gen = (seed: number, l: number, id: string): ChoiceQuestion => {
    const rnd = rng(seed);
    const level = baseN + l;
    if (l === 1) {
      const b = pickR(rnd, BEAM);
      const list = shuffleR(rnd, [b.right, ...b.wrong]);
      const names: Names = {};
      list.forEach((s, i) => (names[`o${i + 1}`] = opt(i, s)));
      const rests = b.right.includes('𝄽');
      return choiceQ({ id, topic: 'time-signatures', level, seed, skill: 'theory', difficulty: 1380, ask: rests ? { en: `In ${b.sig}, which bar groups its rests correctly?`, he: `ב־${b.sig}, באיזו תיבה ההפסקות מקובצות נכון?` } : { en: `In ${b.sig}, which beaming shows the beats correctly?`, he: `ב־${b.sig}, איזה חיבור (קורות) מראה נכון את הפעמות?` }, text: { en: b.sig, he: b.sig }, names, answer: `o${list.indexOf(b.right) + 1}`, choices: list.map((_, i) => `o${i + 1}`), stimulus: [] });
    }
    // where do the bar lines go?
    const me = pickR(rnd, METERS);
    let bars: number[][] = [];
    for (let g = 0; g < 30 && bars.flat().length < 6; g++) bars = [pickR(rnd, me.bars), pickR(rnd, me.bars), pickR(rnd, me.bars)];
    if (bars.flat().length < 6) bars = [me.bars[0], me.bars[0], me.bars[0]];
    const flat = bars.flat();
    const render = (cuts: number[]) => flat.map((d, i) => SYM[d] + (cuts.includes(i + 1) ? ' |' : '')).join(' ');
    const rightCuts = [bars[0].length, bars[0].length + bars[1].length];
    const variants = new Map<string, number[]>([[render(rightCuts), rightCuts]]);
    for (let g = 0; g < 40 && variants.size < 3; g++) {
      const c = rightCuts.map((x) => x + pickR(rnd, [-1, 0, 1])).filter((x) => x > 0 && x < flat.length);
      if (c.length === 2 && c[0] < c[1]) variants.set(render(c), c);
    }
    const list = shuffleR(rnd, [...variants.keys()]);
    const names: Names = {};
    list.forEach((s, i) => (names[`o${i + 1}`] = opt(i, s)));
    return choiceQ({ id, topic: 'time-signatures', level, seed, skill: 'theory', difficulty: 1450, ask: { en: `Three bars of ${me.sig}: where do the bar lines go?`, he: `שלוש תיבות של ${me.sig}: איפה עוברים קווי התיבה?` }, text: { en: `${me.sig} · ${flat.map((d) => SYM[d]).join(' ')}`, he: `${me.sig} · ${flat.map((d) => SYM[d]).join(' ')}` }, names, answer: `o${list.indexOf(render(rightCuts)) + 1}`, choices: list.map((_, i) => `o${i + 1}`), stimulus: [] });
  };
  TOPIC_GEN['time-signatures'] = {
    ...base,
    levels: [...base.levels, { en: 'Beaming and rest grouping', he: 'חיבור תווים וקיבוץ הפסקות' }, { en: 'Where do the bar lines go?', he: 'איפה עוברים קווי התיבה?' }],
    gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : gen(seed, level - baseN, id)),
  };
}

// ======================================================================= roman-numerals 4 (wraps spec U.11)

{
  const base = TOPIC_GEN['roman-numerals'];
  const baseN = base.levels.length;
  const CAD: Record<string, { pair: [number, number][]; n: Bi; say: string[] }> = {
    perfect: { pair: [[4, 0]], n: { en: 'Perfect (authentic)', he: 'קדנצה מלאה (אותנטית)' }, say: ['authentic', 'perfect cadence'] },
    plagal: { pair: [[3, 0]], n: { en: 'Plagal', he: 'קדנצה פלגאלית' }, say: ['plagal'] },
    half: { pair: [[0, 4], [1, 4], [3, 4]], n: { en: 'Half', he: 'חצי קדנצה' }, say: ['half cadence'] },
    deceptive: { pair: [[4, 5]], n: { en: 'Deceptive (interrupted)', he: 'קדנצה מטעה' }, say: ['deceptive', 'interrupted'] },
  };
  const gen = (seed: number, id: string): ChoiceQuestion => {
    const rnd = rng(seed);
    const minor = rnd() < 0.35;
    const t = minor ? pickR(rnd, MIN_KEYS.slice(0, 5)) : pickR(rnd, MAJ_KEYS);
    const sc = keyScale(t, minor);
    const kind = pickR(rnd, Object.keys(CAD));
    const [a, b] = pickR(rnd, CAD[kind].pair);
    const tri = (d: number) => [0, 2, 4].map((k) => sc[(d + k) % 7]);
    const T = tonicAt(spPc(t), 55);
    const st = minor ? HMIN : MAJ;
    const last = [idxMidi(T, b, st), idxMidi(T, b + 2, st), idxMidi(T, b + 4, st)];
    const ja = joinSp(tri(a));
    const jb = joinSp(tri(b));
    const kn = keyName(t, minor);
    const names: Names = {};
    for (const k of Object.keys(CAD)) names[k] = nm(CAD[k].n.en, CAD[k].n.he, ...CAD[k].say);
    return choiceQ({ id, topic: 'roman-numerals', level: baseN + 1, seed, skill: 'theory', difficulty: 1720, ask: { en: `In ${kn.en}, the phrase ends with these two chords. Which cadence is it?`, he: `ב${kn.he}, המשפט נגמר בשני האקורדים האלה. איזו קדנצה זו?` }, text: { en: `${ja.en}  →  ${jb.en}`, he: `${ja.he}  ←  ${jb.he}` }, show: { midis: last, chord: true, key: pcOf(minor ? relMajor(t) : t) }, names, answer: kind, choices: Object.keys(CAD), stimulus: [] });
  };
  TOPIC_GEN['roman-numerals'] = {
    ...base,
    levels: [...base.levels, { en: 'Name the cadence in the score', he: 'לזהות את הקדנצה בתווים' }],
    gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : gen(seed, id)),
  };
}

// ======================================================================= note-reading 6: grand staff (wraps spec U.11)

{
  const base = TOPIC_GEN['note-reading'];
  const baseN = base.levels.length;
  const gen = (seed: number, id: string): ChoiceQuestion => {
    const rnd = rng(seed);
    const right = rnd() < 0.5;
    const [lo, hi] = right ? [57, 84] : [36, 64];
    const nat: number[] = [];
    for (let m = lo; m <= hi; m++) if (MAJ.includes(m % 12)) nat.push(m);
    const m = pickR(rnd, nat);
    const l = MAJ.indexOf(m % 12);
    const opts = shuffleR(rnd, [l, (l + 1) % 7, (l + 6) % 7, (l + 2) % 7]);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const o of opts) {
      names[LET[o]] = nm(LET[o], SOL[o], LET[o]);
      choiceStim[LET[o]] = [{ kind: 'note', midi: m + mod(NAT[o] - (m % 12) + 6, 12) - 6, duration: 0.9 }];
    }
    // The staff view draws one clef: the hand's clef stands in for the grand staff (see the 0.38 build report).
    return choiceQ({ id, topic: 'note-reading', level: baseN + 1, seed, skill: 'notes', difficulty: 1620, ask: { en: 'Grand staff: which note is this?', he: 'חמשה כפולה: איזה תו זה?' }, text: right ? { en: 'Right hand (upper staff, treble clef)', he: 'יד ימין (חמשה עליונה, מפתח סול)' } : { en: 'Left hand (lower staff, bass clef)', he: 'יד שמאל (חמשה תחתונה, מפתח פה)' }, names, answer: LET[l], choices: opts.map((o) => LET[o]), stimulus: [], choiceStim, show: { midis: [m], clef: right ? 'treble' : 'bass', key: null } });
  };
  TOPIC_GEN['note-reading'] = {
    ...base,
    levels: [...base.levels, { en: 'Grand staff (both hands)', he: 'חמשה כפולה (שתי ידיים)' }],
    gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : gen(seed, id)),
  };
}
