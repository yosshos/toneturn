// 0.38 topics (spec AE, docs/SPEC-0.38.md §4.3, §4.5, §10): inner hearing (audiation), triads, seventh chords,
// colour chords (chromatic harmony), song form and style — plus deeper levels for voice-count (texture),
// cadence-types (in texture; name the chords) and modulation (from minor; every closely related key).
// Pure and seeded: every item is rebuilt from (topic, level, seed).

import type { ChoiceQuestion, NoteEvent, SingQuestion, Stimulus } from './lesson';
import { marker, placeInRange, singQuestion } from './lesson';
import { pc, pcValue } from './pitch';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { arrange, bassNote, ch, styleClip, voiceLead, type Chord, type LeadNote, type Section, type StyleId } from './form';
import { SONGS } from './songs';
import './topicsAD'; // base topics deepened below (voice-count, cadence-types, modulation)

type Names = ChoiceQuestion['names'];
const N = (midi: number, start: number, duration: number, velocity = 0.6): NoteEvent => ({ midi, start, duration, velocity });
const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
const click = (start: number, accent = false): NoteEvent => ({ midi: 76, start, duration: 0.04, velocity: accent ? 0.5 : 0.3, perc: accent ? 'accent' : 'click' });
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Major-scale degree (1-based, may go below 1 or above 7) → semitones above the tonic. */
const dgM = (d: number) => 12 * Math.floor((d - 1) / 7) + MAJ[(((d - 1) % 7) + 7) % 7];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// ---------------------------------------------------------------- voiced chords (bass + three upper voices)

/** A chord as semitones above the tonic: the bass, and the upper voices' pitch classes (doublings allowed). */
interface V {
  bass: number;
  up: number[];
}
const v = (bass: number, ...up: number[]): V => ({ bass, up });
/** Voice-led chords at a tonic (midi): the upper voices move as little as possible, the bass takes the nearest note. */
function voiceV(list: V[], tonic: number): number[][] {
  let prev: number[] | null = null;
  let prevBass: number | null = null;
  return list.map((c) => {
    const up = voiceLead(c.up.map((x) => tonic + x), prev, 53, 77, 65);
    const b = bassNote(tonic + c.bass, prevBass, 38, 52);
    prev = up;
    prevBass = b;
    return [b, ...up];
  });
}
/** Block chords one after another (`each` seconds, the last one longer); null = a silent chord (time only). */
function chordEvents(chords: (number[] | null)[], each = 0.8, last = 1.6, vel = 0.5): { events: NoteEvent[]; length: number } {
  const out: NoteEvent[] = [];
  chords.forEach((c, i) => {
    if (!c) return;
    const d = i === chords.length - 1 ? last : each * 0.95;
    c.forEach((m, k) => out.push(N(m, i * each, d, k === 0 ? vel + 0.05 : vel)));
  });
  return { events: out, length: (chords.length - 1) * each + last + 0.2 };
}
const playChords = (chords: number[][], each = 0.8, last = 1.6): Stimulus => {
  const r = chordEvents(chords, each, last);
  return ev(r.events, r.length);
};
// Diatonic chords (major) and a few chromatic ones, as V.
const RV: Record<string, V> = {
  I: v(0, 0, 4, 7),
  ii: v(2, 2, 5, 9),
  iii: v(4, 4, 7, 11),
  IV: v(5, 5, 9, 0),
  V: v(7, 7, 11, 2),
  V7: v(7, 11, 2, 5),
  vi: v(9, 9, 0, 4),
  i: v(0, 0, 3, 7),
  iv: v(5, 5, 8, 0),
};
/** The key: I–IV–V7–I (or i–iv–V7–i). */
const cadenceV = (minor: boolean) => (minor ? [RV.i, RV.iv, RV.V7, RV.i] : [RV.I, RV.IV, RV.V7, RV.I]);

// ======================================================================= AUDIATION (inner hearing)

const AUD_LEVELS = [
  { en: 'A song goes silent and comes back: right place?', he: 'שיר נעלם וחוזר: במקום הנכון?' },
  { en: 'A scale goes silent: which degree comes back?', he: 'סולם נעלם: על איזו דרגה הוא חוזר?' },
  { en: 'A tune goes silent for a bar: which continuation fits?', he: 'מנגינה נעלמת לתיבה: איזה המשך מתאים?' },
  { en: 'Keep it going silently, then sing the note', he: 'ממשיכים בשקט, ואז שרים את הצליל' },
  { en: 'A progression goes silent: which chord comes back?', he: 'מהלך אקורדים נעלם: איזה אקורד חוזר?' },
];

/** Level 1: a known song, silent for two notes; it comes back in the right place or one note off. */
function audSong(seed: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const songs = SONGS.filter((s) => s.degrees.length >= 7);
  const song = pickR(rnd, songs);
  const tonic = pickR(rnd, [60, 62, 65, 67]);
  const len = song.degrees.length;
  const pairs: { s: number; off: number }[] = [];
  for (let s = 2; s + 2 <= len - 1; s++)
    for (const off of [-1, 1]) {
      const j = s + 2 + off;
      if (j >= 0 && j < len && song.degrees[j] !== song.degrees[s + 2]) pairs.push({ s, off });
    }
  const { s, off } = pickR(rnd, pairs);
  const right = rnd() < 0.5;
  const beat = 0.6;
  const out: NoteEvent[] = [];
  for (let k = 0; k < 4; k++) out.push(click(k * beat, k === 0));
  let at = 4;
  const total = song.beats.reduce((a, b) => a + b, 0);
  for (let k = 0; k < Math.ceil(total); k++) out.push(click((4 + k) * beat, k % 4 === 0));
  song.degrees.forEach((_, i) => {
    const dur = song.beats[i];
    if (i < s) out.push(N(tonic + dgM(song.degrees[i]), at * beat, dur * beat * 0.92, 0.72));
    else if (i >= s + 2) {
      const j = right ? i : i + off;
      if (j >= 0 && j < len) out.push(N(tonic + dgM(song.degrees[j]), at * beat, dur * beat * 0.92, 0.72));
    }
    at += dur;
  });
  const names: Names = { right: nm('Right place', 'במקום הנכון', 'right', 'yes'), wrong: nm('Wrong place', 'במקום הלא נכון', 'wrong', 'no') };
  return choiceQ({
    id, topic: 'audiation', level: 1, seed, skill: 'sequences', difficulty: 1050,
    ask: { en: `“${song.title.en}” goes quiet for two notes — keep singing it in your head. Does it come back in the right place?`, he: `״${song.title.he}״ נעלם לשני צלילים — המשיכו לשיר אותו בראש. האם הוא חוזר במקום הנכון?` },
    names, answer: right ? 'right' : 'wrong', choices: ['right', 'wrong'], stimulus: [ev(out, (4 + Math.ceil(total)) * beat + 0.3)],
  });
}

/** Level 2: a scale (up or down) with the clicks; silent for a few notes; name the degree it comes back on. */
function audScale(seed: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [57, 58, 60, 62, 64]);
  const up = rnd() < 0.6;
  const degs = up ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const k = 2 + Math.floor(rnd() * 2); // sounding notes
  const m = Math.min(7 - k, 1 + Math.floor(rnd() * 4)); // silent notes (it may come back on the last note)
  const r = k + m; // index of the note it comes back on
  const d = degs[r];
  const beat = 0.6;
  const cad = chordEvents(voiceV(cadenceV(false), tonic), 0.6, 1.0);
  const out: NoteEvent[] = [];
  const t0 = 0;
  for (let i = 0; i < Math.min(degs.length, r + 2); i++) {
    out.push(click(t0 + i * beat, i % 4 === 0));
    if (i < k || i >= r) out.push(N(tonic + dgM(degs[i]), t0 + i * beat, beat * 0.9, 0.72));
  }
  const len = Math.min(degs.length, r + 2) * beat + 0.4;
  let cands = [d - 1, d, d + 1].filter((x) => x >= 1 && x <= 8);
  if (cands.length < 3) cands = d <= 2 ? [1, 2, 3] : [6, 7, 8];
  const names: Names = {};
  for (const x of cands) names[String(x)] = nm(x === 8 ? 'Degree 8 (the high 1)' : `Degree ${x}`, x === 8 ? 'דרגה 8 (ה־1 הגבוה)' : `דרגה ${x}`, WORDS[x]);
  return choiceQ({
    id, topic: 'audiation', level: 2, seed, skill: 'sequences', difficulty: 1150,
    ask: { en: `A scale ${up ? 'rises' : 'falls'}, goes silent, returns. Which degree?`, he: `סולם ${up ? 'עולה' : 'יורד'}, נעלם וחוזר. איזו דרגה?` },
    names, answer: String(d), choices: cands.map(String), stimulus: [ev(cad.events, cad.length), rest(0.3), ev(out, len)],
  });
}

/** Level 3: a pattern moving bar by bar (3/4), silent for a bar; which version comes back in time and in tune? */
function audSequence(seed: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [57, 59, 60, 62]);
  const motifs = [[0, 1, 2], [0, 2, 1], [2, 1, 0], [0, 2, 4], [0, -1, 1], [2, 0, 1]];
  const motif = pickR(rnd, motifs);
  const dir = rnd() < 0.5 ? 1 : -1;
  const start = dir > 0 ? 1 : 8;
  const beat = 0.4;
  const version = (kind: 'ok' | 'pitch' | 'time', wrongLevel: number) => {
    const out: NoteEvent[] = [];
    for (let b = 0; b < 12; b++) out.push(click(b * beat, b % 3 === 0));
    for (let bar = 0; bar < 2; bar++) motif.forEach((x, i) => out.push(N(tonic + dgM(start + bar * dir + x), (bar * 3 + i) * beat, beat * 0.9, 0.72)));
    const lv = kind === 'pitch' ? wrongLevel : 3;
    const shift = kind === 'time' ? 1 : 0;
    motif.forEach((x, i) => out.push(N(tonic + dgM(start + lv * dir + x), (9 + i + shift) * beat, beat * 0.9, 0.72)));
    return ev(out, (12 + shift) * beat + 0.4);
  };
  const wrongLevel = rnd() < 0.5 ? 2 : 4;
  const order = shuffleR(rnd, ['ok', 'pitch', 'time'] as const);
  const keys = ['1', '2', '3'];
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  const stimulus: Stimulus[] = [];
  order.forEach((kind, i) => {
    names[keys[i]] = nm(`Version ${i + 1}`, `גרסה ${i + 1}`, WORDS[i + 1], ['first', 'second', 'third'][i]);
    const s = version(kind, wrongLevel);
    choiceStim[keys[i]] = [s];
    stimulus.push(marker(i + 1), s);
  });
  return choiceQ({
    id, topic: 'audiation', level: 3, seed, skill: 'sequences', difficulty: 1300,
    ask: { en: `A pattern ${dir > 0 ? 'climbs' : 'falls'}, goes silent, returns. Which return is right?`, he: `תבנית ${dir > 0 ? 'עולה' : 'יורדת'}, נעלמת וחוזרת. איזו חזרה נכונה?` },
    names, answer: keys[order.indexOf('ok')], choices: keys, stimulus, choiceStim,
  });
}

/** Level 4 (sing): keep the line going through the silence and sing the note where it is now. */
function audSing(seed: number, id: string): SingQuestion {
  const rnd = rng(seed);
  const key = pc(pickR(rnd, ['C', 'D', 'E', 'F', 'G', 'A']));
  const tonic = placeInRange(pcValue(key), 55, 64);
  const patterns = [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1], [1, 3, 5, 8, 5, 3, 1, 3], [1, 3, 2, 4, 3, 5, 4, 6, 5], [5, 4, 3, 2, 1, 2, 3, 4, 5]];
  const pat = pickR(rnd, patterns);
  const k = 3 + Math.floor(rnd() * 2);
  const m = Math.min(2 + Math.floor(rnd() * 2), pat.length - k - 1);
  const degs = pat.slice(0, k + m + 1);
  const midis = degs.map((d) => tonic + dgM(d));
  const targetMidi = midis[midis.length - 1];
  const degree = ((degs[degs.length - 1] - 1) % 7) + 1;
  const beat = 0.65;
  const out: NoteEvent[] = [];
  for (let i = 0; i < 2; i++) out.push(click(i * beat, i === 0));
  // The line sounds, then only the clicks go on; the stimulus ends where the target note would sound.
  for (let i = 0; i < midis.length - 1; i++) {
    const t = (2 + i) * beat;
    out.push(click(t, i % 4 === 0));
    if (i < k) out.push(N(midis[i], t, beat * 0.9, 0.72));
  }
  const q = singQuestion(id, key, degree);
  return {
    ...q,
    promptBy: 'inner',
    inner: { midis, silentFrom: k },
    topic: { id: 'audiation', level: 4, seed },
    targetMidi,
    skillAs: 'sequences',
    difficulty: 1400,
    stimulus: [{ kind: 'cadence', key }, ev(out, (1 + midis.length) * beat)],
  };
}

/** Level 5: a four-chord loop, then again with two chords silent; which chord comes back? */
function audProgression(seed: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const loops = [['I', 'vi', 'IV', 'V'], ['I', 'IV', 'vi', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'V', 'vi', 'IV'], ['ii', 'V', 'I', 'vi'], ['I', 'iii', 'IV', 'V']];
  const loop = pickR(rnd, loops);
  const tonic = pickR(rnd, [60, 62, 65, 67]);
  const p = Math.floor(rnd() * 4); // the silence starts at chord p of the second time round
  const seq = Array.from({ length: 4 + p + 3 }, (_, i) => loop[i % 4]);
  const voiced = voiceV(seq.map((r) => RV[r]), tonic);
  const silent = new Set([4 + p, 5 + p]);
  const each = 1.2;
  const out: NoteEvent[] = [];
  seq.forEach((_, i) => {
    out.push(click(i * each, true), click(i * each + each / 2));
    if (silent.has(i)) return;
    const last = i === seq.length - 1;
    voiced[i].forEach((m, k) => out.push(N(m, i * each, last ? 2.2 : each * 0.95, k === 0 ? 0.55 : 0.5)));
  });
  const answer = loop[(p + 2) % 4];
  const RN_NAMES: Record<string, [string, string, string]> = { I: ['I', 'I', 'one'], ii: ['ii', 'ii', 'two'], iii: ['iii', 'iii', 'three'], IV: ['IV', 'IV', 'four'], V: ['V', 'V', 'five'], vi: ['vi', 'vi', 'six'] };
  const names: Names = {};
  for (const r of loop) names[r] = nm(RN_NAMES[r][0], RN_NAMES[r][1], RN_NAMES[r][2]);
  return choiceQ({
    id, topic: 'audiation', level: 5, seed, skill: 'sequences', difficulty: 1450,
    ask: { en: 'The loop goes silent for two chords. Which chord returns?', he: 'הלופ שותק לשני אקורדים. איזה אקורד חוזר?' },
    names, answer, choices: loop.slice(), stimulus: [ev(out, (seq.length - 1) * each + 2.4)],
  });
}

TOPIC_GEN['audiation'] = {
  title: { en: 'Hear it in your head', he: 'לשמוע את זה בראש' },
  skill: 'sequences',
  levels: AUD_LEVELS,
  gen(seed, level, id) {
    if (level === 1) return audSong(seed, id);
    if (level === 2) return audScale(seed, id);
    if (level === 3) return audSequence(seed, id);
    if (level === 4) return audSing(seed, id);
    return audProgression(seed, id);
  },
};
TOPIC_TAGS['audiation'] = (l) => (l === 5 ? tg(['sequences', 'inner', 0.7], ['cadences', 'progression', 0.3]) : tg(['sequences', 'inner', 0.7], ['degrees', 'diatonic', 0.3]));

// ======================================================================= TRIADS

const TRI: Record<string, { iv: number[]; en: string; he: string; say: string[] }> = {
  maj: { iv: [0, 4, 7], en: 'Major', he: 'מז׳ור', say: ['major'] },
  min: { iv: [0, 3, 7], en: 'Minor', he: 'מינור', say: ['minor'] },
  dim: { iv: [0, 3, 6], en: 'Diminished', he: 'מוקטן', say: ['diminished', 'dim'] },
  aug: { iv: [0, 4, 8], en: 'Augmented', he: 'מוגדל', say: ['augmented', 'aug'] },
  sus2: { iv: [0, 2, 7], en: 'Sus2', he: 'סאס 2', say: ['sus two', 'suspended second'] },
  sus4: { iv: [0, 5, 7], en: 'Sus4', he: 'סאס 4', say: ['sus four', 'suspended fourth'] },
};
const INV3: Record<string, [string, string, string[]]> = {
  root: ['Root position', 'מצב יסודי', ['root position', 'root']],
  first: ['First inversion (6)', 'היפוך ראשון (6)', ['first inversion', 'first']],
  second: ['Second inversion (6/4)', 'היפוך שני (6/4)', ['second inversion', 'second']],
};
/** A chord in close position on `root` (inversion n: the n-th tone in the bass), with the bass doubled below. */
function closeChord(root: number, iv: number[], inv = 0): number[] {
  const n = iv.length;
  const notes = Array.from({ length: n }, (_, k) => root + iv[(inv + k) % n] + (inv + k >= n ? 12 : 0));
  return [notes[0] - 12, ...notes];
}
const blockArp = (midis: number[]): Stimulus[] => [{ kind: 'chord', midis, duration: 1.3 }, rest(0.25), { kind: 'chord', midis, duration: 1.8, arpeggio: true }];

TOPIC_GEN['triads'] = {
  title: { en: 'Triad types', he: 'סוגי משולשים' },
  skill: 'chords',
  levels: [
    { en: 'Major, minor, diminished', he: 'מז׳ור, מינור, מוקטן' },
    { en: '… and augmented', he: '… ומוגדל' },
    { en: '… and sus2, sus4', he: '… וסאס 2, סאס 4' },
    { en: 'Inversions of any triad', he: 'היפוכים של כל משולש' },
    { en: 'Close or open position?', he: 'מצב צפוף או פתוח?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 52 + Math.floor(rnd() * 8);
    if (level === 4) {
      const qual = pickR(rnd, ['maj', 'min', 'dim']);
      const inv = Math.floor(rnd() * 3);
      const keys = ['root', 'first', 'second'];
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      keys.forEach((k, i) => {
        names[k] = nm(INV3[k][0], INV3[k][1], ...INV3[k][2]);
        choiceStim[k] = blockArp(closeChord(root, TRI[qual].iv, i));
      });
      return choiceQ({ id, topic: 'triads', level, seed, skill: 'chords', difficulty: 1250, ask: { en: `A ${TRI[qual].en.toLowerCase()} triad — which position?`, he: `משולש ${TRI[qual].he} — באיזה מצב?` }, names, answer: keys[inv], choices: keys, stimulus: choiceStim[keys[inv]], choiceStim });
    }
    if (level === 5) {
      const qual = pickR(rnd, ['maj', 'min']);
      const third = TRI[qual].iv[1];
      const r = root - 6;
      const shapes: Record<string, number[]> = { close: [r, r + third, r + 7, r + 12], open: [r, r + 7, r + 12 + third, r + 19] };
      const answer = rnd() < 0.5 ? 'close' : 'open';
      const names: Names = { close: nm('Close position', 'מצב צפוף', 'close'), open: nm('Open position', 'מצב פתוח', 'open', 'spread') };
      const choiceStim = { close: blockArp(shapes.close), open: blockArp(shapes.open) };
      return choiceQ({ id, topic: 'triads', level, seed, skill: 'chords', difficulty: 1300, ask: { en: 'Are the chord notes packed together (close) or spread out (open)?', he: 'צלילי האקורד צפופים (מצב צפוף) או פרושים (מצב פתוח)?' }, names, answer, choices: ['close', 'open'], stimulus: choiceStim[answer], choiceStim });
    }
    const pool = [['maj', 'min', 'dim'], ['maj', 'min', 'dim', 'aug'], ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4']][level - 1];
    const answer = level === 3 && rnd() < 0.5 ? pickR(rnd, ['sus2', 'sus4']) : pickR(rnd, pool);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(TRI[k].en, TRI[k].he, ...TRI[k].say);
      choiceStim[k] = blockArp(closeChord(root, TRI[k].iv));
    }
    return choiceQ({ id, topic: 'triads', level, seed, skill: 'chords', difficulty: [950, 1050, 1150][level - 1], ask: { en: 'Which kind of triad?', he: 'איזה סוג של משולש?' }, names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim });
  },
};
TOPIC_TAGS['triads'] = (l) => (l === 4 ? tg(['chords', 'inversion', 1]) : tg(['chords', 'quality', 1]));

// ======================================================================= SEVENTH CHORDS

const SEV: Record<string, { iv: number[]; en: string; he: string; say: string[] }> = {
  maj7: { iv: [0, 4, 7, 11], en: 'Major 7th (maj7)', he: 'ספט מז׳ור (maj7)', say: ['major seven'] },
  dom7: { iv: [0, 4, 7, 10], en: 'Dominant 7th (7)', he: 'ספט דומיננטי (7)', say: ['dominant', 'dominant seven'] },
  m7: { iv: [0, 3, 7, 10], en: 'Minor 7th (m7)', he: 'ספט מינור (m7)', say: ['minor seven'] },
  m7b5: { iv: [0, 3, 6, 10], en: 'Half-diminished (m7♭5)', he: 'חצי מוקטן (m7♭5)', say: ['half diminished', 'minor seven flat five'] },
  dim7: { iv: [0, 3, 6, 9], en: 'Diminished 7th (dim7)', he: 'ספט מוקטן (dim7)', say: ['diminished seven', 'fully diminished'] },
  mmaj7: { iv: [0, 3, 7, 11], en: 'Minor-major 7th (m(maj7))', he: 'מינור עם ספט גדולה (m(maj7))', say: ['minor major seven'] },
  maj7s5: { iv: [0, 4, 8, 11], en: 'Augmented major 7th (maj7♯5)', he: 'ספט מז׳ור מוגדל (maj7♯5)', say: ['augmented major seven'] },
  '7sus4': { iv: [0, 5, 7, 10], en: 'Dominant 7 sus4 (7sus4)', he: 'ספט דומיננטי סאס 4 (7sus4)', say: ['seven sus four'] },
};
const INV4: Record<string, [string, string, string[]]> = {
  root: ['Root position (7)', 'מצב יסודי (7)', ['root position', 'root']],
  '65': ['First inversion (6/5)', 'היפוך ראשון (6/5)', ['first inversion', 'six five']],
  '43': ['Second inversion (4/3)', 'היפוך שני (4/3)', ['second inversion', 'four three']],
  '42': ['Third inversion (4/2)', 'היפוך שלישי (4/2)', ['third inversion', 'four two']],
};

TOPIC_GEN['seventh-chords'] = {
  title: { en: 'Seventh chords', he: 'ספטאקורדים' },
  skill: 'chords',
  levels: [
    { en: 'maj7, 7, m7', he: 'maj7, 7, m7' },
    { en: '… and m7♭5, dim7', he: '… ו־m7♭5, dim7' },
    { en: '… and m(maj7), maj7♯5, 7sus4', he: '… ו־m(maj7), maj7♯5, 7sus4' },
    { en: 'Inversions of a dominant 7th', he: 'היפוכים של ספט דומיננטי' },
    { en: 'Inversions of any seventh chord', he: 'היפוכים של כל ספטאקורד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 50 + Math.floor(rnd() * 8);
    if (level >= 4) {
      const qual = level === 4 ? 'dom7' : pickR(rnd, ['maj7', 'dom7', 'm7', 'm7b5']);
      const keys = ['root', '65', '43', '42'];
      const inv = Math.floor(rnd() * 4);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      keys.forEach((k, i) => {
        names[k] = nm(INV4[k][0], INV4[k][1], ...INV4[k][2]);
        choiceStim[k] = blockArp(closeChord(root, SEV[qual].iv, i));
      });
      const shortName = SEV[qual].en.replace(/ \(.*\)$/, '');
      return choiceQ({ id, topic: 'seventh-chords', level, seed, skill: 'chords', difficulty: level === 4 ? 1350 : 1450, ask: { en: `${level === 4 ? 'A dominant 7th' : `A ${shortName.toLowerCase()} chord`}. Which chord tone is in the bass?`, he: `${level === 4 ? 'ספט דומיננטי' : SEV[qual].he.replace(/ \(.*\)$/, '')}. איזה צליל של האקורד בבס?` }, names, answer: keys[inv], choices: keys, stimulus: choiceStim[keys[inv]], choiceStim });
    }
    const pools = [['maj7', 'dom7', 'm7'], ['maj7', 'dom7', 'm7', 'm7b5', 'dim7'], ['maj7', 'dom7', 'm7', 'm7b5', 'dim7', 'mmaj7', 'maj7s5', '7sus4']];
    const pool = pools[level - 1];
    const answer = level === 3 && rnd() < 0.5 ? pickR(rnd, ['mmaj7', 'maj7s5', '7sus4']) : pickR(rnd, pool);
    // Level 3: six of the eight, always including the answer.
    const offered = level === 3 ? pool.filter((k) => k === answer || shuffleR(rnd, pool.filter((x) => x !== answer)).slice(0, 5).includes(k)) : pool;
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of offered) {
      names[k] = nm(SEV[k].en, SEV[k].he, ...SEV[k].say);
      choiceStim[k] = blockArp(closeChord(root, SEV[k].iv));
    }
    return choiceQ({ id, topic: 'seventh-chords', level, seed, skill: 'chords', difficulty: [1150, 1250, 1400][level - 1], ask: { en: 'Which seventh chord?', he: 'איזה ספטאקורד?' }, names, answer, choices: offered, stimulus: choiceStim[answer], choiceStim });
  },
};
// The spec asks for chords/inversion .6 + chords/seventh .4 at L4–5; a tag vector holds one sub-skill per skill.
TOPIC_TAGS['seventh-chords'] = (l) => (l >= 4 ? tg(['chords', 'inversion', 1]) : tg(['chords', 'seventh', 1]));

// ======================================================================= CHROMATIC HARMONY (colour chords)

interface ChromOpt {
  en: string;
  he: string;
  say: string[];
  chords: V[];
}
function chromLevel(level: number, rnd: () => number): { minor: boolean; opts: Record<string, ChromOpt>; ask: { en: string; he: string } } {
  const { I, IV, V, V7, ii, vi, i, iv } = RV;
  const I64 = v(7, 0, 4, 7);
  switch (level) {
    case 1:
      return {
        minor: false,
        ask: { en: 'Just before the final V: a cadential 6/4, or a plain V?', he: 'רגע לפני ה־V האחרון: קוורטסקסט קדנציאלי, או V רגיל?' },
        opts: {
          cad64: { en: 'Cadential 6/4 before V', he: 'קוורטסקסט קדנציאלי לפני V', say: ['cadential six four', 'six four'], chords: [I, IV, I64, V7, I] },
          plain: { en: 'Plain V', he: 'V רגיל', say: ['plain', 'plain five'], chords: [I, IV, V, V7, I] },
        },
      };
    case 2:
      return {
        minor: true,
        ask: { en: 'In minor: which chord comes before V?', he: 'במינור: איזה אקורד בא לפני V?' },
        opts: {
          n6: { en: 'Neapolitan (♭II6)', he: 'נפוליטני (♭II6)', say: ['neapolitan'], chords: [i, v(5, 1, 5, 8), V7, i] },
          iv: { en: 'iv (minor four)', he: 'iv (דרגה רביעית במינור)', say: ['minor four', 'four'], chords: [i, iv, V7, i] },
          iio: { en: 'ii° (diminished two)', he: 'ii° (דרגה שנייה מוקטנת)', say: ['diminished two', 'two'], chords: [i, v(5, 2, 5, 8), V7, i] },
        },
      };
    case 3: {
      // R6: the +6 has ♭6 in the bass falling to 5; V/V is in root position; both resolve to V, then I.
      const aug6 = rnd() < 0.5 ? v(8, 0, 3, 6) : v(8, 0, 2, 6); // German or French
      return {
        minor: false,
        ask: { en: 'Which chord leads into V: an augmented sixth, or V/V?', he: 'איזה אקורד מוביל ל־V: סקסטה מוגדלת, או V/V?' },
        opts: {
          aug6: { en: 'Augmented sixth (+6)', he: 'סקסטה מוגדלת (+6)', say: ['augmented sixth'], chords: [I, IV, aug6, V, I] },
          vofv: { en: 'V/V (dominant of V)', he: 'V/V (הדומיננטה של V)', say: ['five of five', 'secondary dominant'], chords: [I, IV, v(2, 6, 9, 0), V, I] },
        },
      };
    }
    case 4: {
      const Imaj7 = v(0, 4, 7, 11);
      const frame = (x: V) => [Imaj7, v(9, 7, 0, 4), v(2, 5, 9, 0), x, Imaj7];
      return {
        minor: false,
        ask: { en: 'Which dominant resolves to I: the tritone substitute, or V7?', he: 'איזו דומיננטה נפתרת ל־I: תחליף טריטון, או V7?' },
        opts: {
          tt: { en: 'Tritone substitute (♭II7)', he: 'תחליף טריטון (♭II7)', say: ['tritone substitute', 'tritone sub'], chords: frame(v(1, 5, 11, 8)) },
          v7: { en: 'V7 (the dominant)', he: 'V7 (הדומיננטה)', say: ['dominant', 'five seven'], chords: frame(v(7, 5, 11, 2)) },
        },
      };
    }
    case 5: {
      // Same bass for both: ♯i°7 vs V7/ii over ♯1, or ♯iv°7 vs V7/V over ♯4.
      const low = rnd() < 0.5;
      const frame = (x: V) => (low ? [I, x, ii, V7, I] : [I, IV, x, I64, V7, I]);
      return {
        minor: false,
        ask: { en: 'The chord on the rising bass: a diminished passing chord, or a secondary dominant?', he: 'האקורד על הבס העולה: אקורד מעבר מוקטן, או דומיננטה משנית?' },
        opts: {
          dim: { en: 'Diminished passing chord (°7)', he: 'אקורד מעבר מוקטן (°7)', say: ['diminished', 'passing'], chords: frame(low ? v(1, 4, 7, 10) : v(6, 9, 0, 3)) },
          dom: { en: 'Secondary dominant (V7 of the next chord)', he: 'דומיננטה משנית (V7 של האקורד הבא)', say: ['secondary dominant', 'dominant'], chords: frame(low ? v(1, 4, 7, 9) : v(6, 2, 9, 0)) },
        },
      };
    }
    default:
      return {
        minor: false,
        ask: { en: 'A chord borrowed from the minor key. Which one?', he: 'אקורד שאול מהמינור. איזה?' },
        opts: {
          iv: { en: 'iv (minor four)', he: 'iv (רביעית מינורית)', say: ['minor four'], chords: [I, vi, iv, I] },
          bVI: { en: '♭VI (flat six)', he: '♭VI (שש מונמכת)', say: ['flat six'], chords: [I, vi, v(8, 8, 0, 3), I] },
          bVII: { en: '♭VII (flat seven)', he: '♭VII (שבע מונמכת)', say: ['flat seven'], chords: [I, vi, v(10, 10, 2, 5), I] },
        },
      };
  }
}

TOPIC_GEN['chromatic-harmony'] = {
  title: { en: 'Color chords', he: 'אקורדי צבע' },
  skill: 'cadences',
  levels: [
    { en: 'Cadential 6/4 or plain V', he: 'קוורטסקסט קדנציאלי או V רגיל' },
    { en: 'Neapolitan, iv or ii° in minor', he: 'נפוליטני, iv או ii° במינור' },
    { en: 'Augmented sixth or V/V', he: 'סקסטה מוגדלת או V/V' },
    { en: 'Tritone substitute or V7', he: 'תחליף טריטון או V7' },
    { en: 'Diminished passing chord or secondary dominant', he: 'אקורד מעבר מוקטן או דומיננטה משנית' },
    { en: 'Borrowed: iv, ♭VI or ♭VII', he: 'שאולים: iv, ♭VI או ♭VII' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [60, 62, 63, 65, 67]);
    const L = chromLevel(level, rnd);
    const keys = Object.keys(L.opts);
    const answer = pickR(rnd, keys);
    // The key first (cadence), then the phrase with its resolution.
    const ctx = playChords(voiceV(cadenceV(L.minor), tonic), 0.55, 0.9);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of keys) {
      const o = L.opts[k];
      names[k] = nm(o.en, o.he, ...o.say);
      choiceStim[k] = [ctx, rest(0.45), playChords(voiceV(o.chords, tonic), 0.85, 1.8)];
    }
    return choiceQ({ id, topic: 'chromatic-harmony', level, seed, skill: 'cadences', difficulty: [1200, 1300, 1400, 1450, 1500, 1550][level - 1], ask: L.ask, names, answer, choices: keys, stimulus: choiceStim[answer], choiceStim });
  },
};
TOPIC_TAGS['chromatic-harmony'] = tg(['cadences', 'chromatic', 0.7], ['chords', 'quality', 0.3]);

// ======================================================================= SONG FORM

const I_ = ch(0), ii_ = ch(2, 'm'), iii_ = ch(4, 'm'), IV_ = ch(5), V_ = ch(7), V7_ = ch(7, '7'), vi_ = ch(9, 'm');
const SCALE_SEMIS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
/** A pitch class (semitones above the tonic) placed in the lead register (10…21 above the tonic). */
const high = (semi: number) => 10 + ((((semi - 10) % 12) + 12) % 12);
/** A sparse lead on the chords: the third, then the fifth, of each bar's first chord (half notes). */
function chordLead(bars: Chord[][], third = true): LeadNote[] {
  return bars.flatMap((bar, b) => {
    const c = bar[0];
    const iv = c.q === 'm' || c.q === 'm7' || c.q === 'ø7' || c.q === 'o7' || c.q === 'd' ? 3 : c.q === 'sus4' ? 5 : 4;
    return [[b * 4, high(c.root + (third ? iv : 7)), 2], [b * 4 + 2, high(c.root + (third ? 7 : iv)), 2]] as LeadNote[];
  });
}
/** A wandering verse line: a different rhythm and stepwise notes in every bar, low register. */
function verseLead(rnd: () => number, bars: number): LeadNote[] {
  const rhythms = [[[0, 1], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]], [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]], [[0.5, 0.5], [1, 1], [2, 1], [3, 1]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]]];
  const out: LeadNote[] = [];
  let idx = 2 + Math.floor(rnd() * 2);
  for (let b = 0; b < bars; b++) {
    for (const [x, l] of pickR(rnd, rhythms)) {
      idx = Math.max(0, Math.min(6, idx + pickR(rnd, [-1, -1, 1, 1, 0, 2, -2])));
      out.push([b * 4 + x, SCALE_SEMIS[idx], l]);
    }
  }
  return out;
}
const HOOKS: LeadNote[][] = [
  [[0, 12, 0.5], [0.5, 12, 0.5], [1, 14, 1], [2.5, 12, 0.5], [3, 9, 1]],
  [[0, 7, 1], [1, 9, 0.5], [1.5, 12, 1.5], [3, 9, 1]],
  [[0.5, 16, 0.5], [1, 14, 0.5], [1.5, 12, 1], [2.5, 14, 0.5], [3, 12, 1]],
];
/** The chorus hook: one bar, said three times, then a landing on the tonic. */
const hookLead = (hook: LeadNote[]): LeadNote[] => [0, 1, 2].flatMap((b) => hook.map(([x, s, l]) => [b * 4 + x, s, l] as LeadNote)).concat([[12, 14, 1], [13, 12, 3]]);

/** Verse, chorus and bridge of a pop song (different chords; chorus fuller and louder with a repeated hook). */
function popSong(rnd: () => number) {
  const verses = [[I_, IV_, I_, V_], [vi_, V_, IV_, V_], [I_, iii_, IV_, V_]];
  const choruses = [[I_, V_, vi_, IV_], [IV_, V_, I_, vi_], [I_, vi_, IV_, V_]];
  const bridges = [[ch(8), ch(10), IV_, V7_], [ch(4, '7'), vi_, ch(2, '7'), V7_], [ch(5, 'm'), ch(10), ch(3), V7_]];
  const vi = Math.floor(rnd() * verses.length);
  let ci = Math.floor(rnd() * choruses.length);
  if (vi === 0 && ci === 2) ci = 0;
  const vb = verses[vi].map((c) => [c]);
  const cb = choruses[ci].map((c) => [c]);
  const bb = pickR(rnd, bridges).map((c) => [c]);
  const verse: Section = { bars: vb, energy: 1, lead: verseLead(rnd, 4) };
  const chorus: Section = { bars: cb, energy: 3, lead: hookLead(pickR(rnd, HOOKS)) };
  const bridge: Section = { bars: bb, energy: 2, lead: chordLead(bb) };
  return { verse, chorus, bridge };
}

const BLUES: Chord[][] = [[ch(0, '7')], [ch(5, '7')], [ch(0, '7')], [ch(0, '7')], [ch(5, '7')], [ch(5, '7')], [ch(0, '7')], [ch(0, '7')], [ch(7, '7')], [ch(5, '7')], [ch(0, '7'), ch(9, '7')], [ch(2, 'm7'), ch(7, '7')]];
/** A blues riff on each odd bar's chord, a held note on the even bars, a falling line in the turnaround. */
function bluesLead(bars: Chord[][]): LeadNote[] {
  const riff: [number, number, number][] = [[0, 0, 0.5], [0.5, 3, 0.5], [1, 4, 1], [2, 7, 0.5], [2.5, 9, 0.5], [3, 7, 1]];
  const out: LeadNote[] = [];
  bars.forEach((bar, b) => {
    const r = bar[0].root;
    if (b === 10) out.push([40, 16, 1], [41, 15, 1], [42, 14, 1], [43, 12, 1]);
    else if (b === 11) out.push([44, 9, 1], [45, 10, 1], [46, 11, 2]);
    else if (b % 2 === 0) for (const [x, s, l] of riff) out.push([b * 4 + x, 12 + r + s - (r > 5 ? 12 : 0), l]);
    else out.push([b * 4, 12 + r + 10 - (r > 5 ? 12 : 0), 2]);
  });
  return out;
}

const AABA_A: Chord[][] = [[ch(0, 'maj7'), ch(9, 'm7')], [ch(2, 'm7'), ch(7, '7')], [ch(0, 'maj7'), ch(9, 'm7')], [ch(2, 'm7'), ch(7, '7')]];
const AABA_B: Chord[][] = [[ch(5, 'maj7')], [ch(5, 'm7')], [ch(4, 'm7'), ch(9, '7')], [ch(2, 'm7'), ch(7, '7')]];
const A_TUNE: LeadNote[] = [[0, 4, 1], [1, 7, 1], [2, 9, 1.5], [3.5, 7, 0.5], [4, 5, 1], [5, 4, 1], [6, 2, 2], [8, 4, 1], [9, 7, 1], [10, 12, 1.5], [11.5, 11, 0.5], [12, 9, 2], [14, 7, 2]];

/** Classical sections (A, B, C) for binary / ternary / rondo. */
function classicalForm(kind: 'binary' | 'ternary' | 'rondo', theme: number): Section[] {
  const themes: LeadNote[][] = [
    [[0, 4, 1], [1, 7, 1], [2, 12, 1.5], [3.5, 11, 0.5], [4, 9, 1], [5, 7, 1], [6, 4, 1], [7, 2, 1]],
    [[0, 12, 1.5], [1.5, 11, 0.5], [2, 9, 1], [3, 7, 1], [4, 5, 1], [5, 4, 1], [6, 2, 1], [7, 0, 1]],
  ];
  const t = themes[theme % themes.length];
  const closeTheme: LeadNote[] = [...t.slice(0, -2), [6, 2, 1], [7, 0, 1]];
  const openTheme: LeadNote[] = [...t.slice(0, -2), [6, 2, 1], [7, 7, 1]];
  // a running line on the chord tones (a contrasting episode)
  const run = (bars: Chord[][]): LeadNote[] => bars.flatMap((bar, b) => bar.flatMap((c, h) => {
    const third = c.q === 'm' || c.q === 'm7' ? 3 : 4;
    const span = 4 / bar.length;
    const tones = [0, third, 7, 12].map((x) => high(c.root + x) - (high(c.root + x) > 17 ? 12 : 0));
    return Array.from({ length: span * 2 }, (_, k) => [b * 4 + h * span + k * 0.5, tones[k % 4], 0.5] as LeadNote);
  }));
  const Aclosed: Section = { bars: [[I_], [V7_, I_]], energy: 2, lead: closeTheme };
  const Aopen: Section = { bars: [[I_], [ii_, V_]], energy: 2, lead: openTheme };
  if (kind === 'binary') {
    const Bb: Chord[][] = [[V_], [V7_, I_]];
    const B: Section = { bars: Bb, energy: 2, lead: run(Bb) };
    return [Aopen, Aopen, B, B];
  }
  if (kind === 'ternary') {
    const Bb: Chord[][] = [[vi_], [ch(4, '7')], [vi_], [V7_]];
    return [Aclosed, { bars: Bb, energy: 2, lead: run(Bb) }, Aclosed];
  }
  const Bb: Chord[][] = [[V_], [ch(2, '7'), V7_]];
  const Cb: Chord[][] = [[ch(0, 'm')], [ch(5, 'm'), V7_]];
  return [Aclosed, { bars: Bb, energy: 2, lead: run(Bb) }, Aclosed, { bars: Cb, energy: 2, lead: run(Cb) }, Aclosed];
}

/** Jazz forms, one chorus each. */
function jazzForm(kind: 'blues' | 'sixteen' | 'aaba' | 'rhythm'): Section[] {
  const S = (bars: Chord[][], lead?: LeadNote[]): Section => ({ bars, energy: 2, lead: lead ?? chordLead(bars) });
  if (kind === 'blues') {
    const b: Chord[][] = [[ch(0, '7')], [ch(5, '7')], [ch(0, '7')], [ch(0, '7')], [ch(5, '7')], [ch(5, '7')], [ch(0, '7')], [ch(9, '7')], [ch(2, 'm7')], [ch(7, '7')], [ch(0, '7'), ch(9, '7')], [ch(2, 'm7'), ch(7, '7')]];
    return [S(b, bluesLead(b))];
  }
  if (kind === 'sixteen') {
    const b: Chord[][] = [[ch(0, 'maj7')], [ch(0, 'maj7')], [ch(5, '7')], [ch(5, '7')], [ch(0, 'maj7')], [ch(9, '7')], [ch(2, 'm7')], [ch(7, '7')], [ch(4, 'm7')], [ch(9, '7')], [ch(2, 'm7')], [ch(5, 'm7')], [ch(0, 'maj7')], [ch(9, '7')], [ch(2, 'm7')], [ch(7, '7')]];
    return [S(b)];
  }
  if (kind === 'aaba') {
    const A: Chord[][] = [[ch(0, 'maj7')], [ch(9, 'm7')], [ch(2, 'm7')], [ch(7, '7')], [ch(4, 'm7')], [ch(9, '7')], [ch(2, 'm7')], [ch(7, '7')]];
    const B: Chord[][] = [[ch(5, 'maj7')], [ch(5, 'maj7')], [ch(5, 'm7')], [ch(10, '7')], [ch(4, 'm7')], [ch(9, '7')], [ch(2, '7')], [ch(7, '7')]];
    const a = S(A, [...A_TUNE, ...A_TUNE.map(([x, s, l]) => [x + 16, s, l] as LeadNote)]);
    return [a, a, S(B), a];
  }
  const A: Chord[][] = [[I_, vi_], [ii_, V7_], [I_, vi_], [ii_, V7_], [I_, ch(0, '7')], [IV_, ch(5, 'm')], [I_, vi_], [ii_, V7_]];
  const B: Chord[][] = [[ch(4, '7')], [ch(4, '7')], [ch(9, '7')], [ch(9, '7')], [ch(2, '7')], [ch(2, '7')], [ch(7, '7')], [ch(7, '7')]];
  const riff: LeadNote[] = [0, 2, 4, 6].flatMap((b) => [[b * 4, 7, 0.5], [b * 4 + 0.5, 4, 0.5], [b * 4 + 1, 0, 1], [b * 4 + 2.5, 2, 0.5], [b * 4 + 3, 4, 1]] as LeadNote[]);
  const a = S(A, riff);
  return [a, a, S(B), a];
}

const sf = (a: { events: NoteEvent[]; length: number }): Stimulus => ev(a.events, a.length);

TOPIC_GEN['song-form'] = {
  title: { en: 'Song form', he: 'מבנה שיר' },
  skill: 'form',
  levels: [
    { en: 'Verse or chorus?', he: 'בית או פזמון?' },
    { en: 'Which plan: VCVC, VCVCBC or AABA?', he: 'איזה מבנה: VCVC, VCVCBC או AABA?' },
    { en: '12-bar blues: which bar did it reach?', he: 'בלוז 12 תיבות: לאיזו תיבה הגיע?' },
    { en: 'AABA: which section now?', he: 'AABA: איזה חלק עכשיו?' },
    { en: 'Binary, ternary or rondo?', he: 'בינארית, משולשת או רונדו?' },
    { en: 'Which jazz form?', he: 'איזו צורת ג׳אז?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [57, 58, 60, 62, 63]);
    const base = { id, topic: 'song-form', level, seed, skill: 'form' as const };
    if (level === 1) {
      const { verse, chorus } = popSong(rnd);
      const answer = rnd() < 0.5 ? 'verse' : 'chorus';
      const play = (s: Section) => [sf(arrange([s], { tonic, bpm: 116, groove: 'rock' }))];
      const choiceStim = { verse: play(verse), chorus: play(chorus) };
      const names: Names = { verse: nm('Verse', 'בית', 'verse'), chorus: nm('Chorus', 'פזמון', 'chorus', 'refrain') };
      return choiceQ({ ...base, difficulty: 1050, ask: { en: 'A part of a song. Is it a verse or the chorus?', he: 'קטע משיר. זה בית או הפזמון?' }, names, answer, choices: ['verse', 'chorus'], stimulus: choiceStim[answer], choiceStim });
    }
    if (level === 2) {
      // R5: up to ~45 s — the whole plan.
      const { verse, chorus, bridge } = popSong(rnd);
      const A: Section = { ...verse, energy: 2 };
      const plans: Record<string, Section[]> = { vcvc: [verse, chorus, verse, chorus], vcvcbc: [verse, chorus, verse, chorus, bridge, chorus], aaba: [A, A, bridge, A] };
      const answer = pickR(rnd, ['vcvc', 'vcvcbc', 'aaba']);
      const names: Names = {
        vcvc: nm('Verse–chorus ×2 (VCVC)', 'בית–פזמון פעמיים (VCVC)', 'verse chorus verse chorus'),
        vcvcbc: nm('With a bridge (VCVCBC)', 'עם גשר (VCVCBC)', 'with a bridge', 'bridge'),
        aaba: nm('AABA (one tune, a bridge, the tune again)', 'AABA (מנגינה, גשר, שוב המנגינה)', 'a a b a'),
      };
      return choiceQ({ ...base, difficulty: 1250, ask: { en: 'Follow the whole song. Which plan is it?', he: 'עקבו אחרי כל השיר. מה המבנה שלו?' }, names, answer, choices: ['vcvc', 'vcvcbc', 'aaba'], stimulus: [sf(arrange(plans[answer], { tonic, bpm: 156, groove: 'rock' }))] });
    }
    if (level === 3) {
      const keys = ['b1', 'b5', 'b9', 'turn'];
      const bars: Record<string, number> = { b1: 13, b5: 5, b9: 9, turn: 12 };
      const answer = pickR(rnd, keys);
      const sec: Section = { bars: BLUES, energy: 2, lead: bluesLead(BLUES) };
      const names: Names = {
        b1: nm('Bar 1 (back at the top)', 'תיבה 1 (שוב בהתחלה)', 'bar one', 'top'),
        b5: nm('Bar 5', 'תיבה 5', 'bar five', 'five'),
        b9: nm('Bar 9', 'תיבה 9', 'bar nine', 'nine'),
        turn: nm('The turnaround (bars 11–12)', 'הטרנאראונד (תיבות 11–12)', 'turnaround'),
      };
      return choiceQ({ ...base, difficulty: 1300, ask: { en: 'A 12-bar blues stops. Which bar?', he: 'בלוז של 12 תיבות נעצר. באיזו תיבה?' }, names, answer, choices: keys, stimulus: [sf(arrange([sec, sec], { tonic: tonic - 5, bpm: 168, groove: 'shuffle', countIn: true, stopAfterBars: bars[answer] }))] });
    }
    if (level === 4) {
      const keys = ['a1', 'a2', 'b', 'a3'];
      const stop: Record<string, number> = { a2: 6, b: 10, a3: 14, a1: 18 };
      const answer = pickR(rnd, keys);
      const A: Section = { bars: AABA_A, energy: 2, lead: A_TUNE };
      const B: Section = { bars: AABA_B, energy: 2, lead: chordLead(AABA_B) };
      const names: Names = {
        a1: nm('First A (the top again)', 'A ראשון (שוב ההתחלה)', 'first a', 'top'),
        a2: nm('Second A', 'A שני', 'second a'),
        b: nm('The bridge (B)', 'הגשר (B)', 'bridge'),
        a3: nm('Last A (after the bridge)', 'A אחרון (אחרי הגשר)', 'last a'),
      };
      return choiceQ({ ...base, difficulty: 1350, ask: { en: 'An AABA tune plays from the top and stops. Which section was playing?', he: 'שיר במבנה AABA מתנגן מההתחלה ונעצר. איזה חלק התנגן?' }, names, answer, choices: keys, stimulus: [sf(arrange([A, A, B, A, A], { tonic, bpm: 208, groove: 'swing', stopAfterBars: stop[answer] }))] });
    }
    if (level === 5) {
      const keys = ['binary', 'ternary', 'rondo'] as const;
      const answer = pickR(rnd, keys);
      const names: Names = {
        binary: nm('Binary (AABB)', 'צורה בינארית (AABB)', 'binary'),
        ternary: nm('Ternary (ABA)', 'צורה משולשת (ABA)', 'ternary'),
        rondo: nm('Rondo (ABACA)', 'רונדו (ABACA)', 'rondo'),
      };
      return choiceQ({ ...base, difficulty: 1400, ask: { en: 'Follow the themes. Which form is it?', he: 'עקבו אחרי הנושאים. איזו צורה זו?' }, names, answer, choices: keys.slice(), stimulus: [sf(arrange(classicalForm(answer, Math.floor(rnd() * 2)), { tonic: tonic + 2, bpm: 132, groove: 'classical' }))] });
    }
    // Level 6 (R5: up to ~45 s): one chorus of a jazz form.
    const keys = ['blues', 'sixteen', 'aaba', 'rhythm'] as const;
    const answer = pickR(rnd, keys);
    const names: Names = {
      blues: nm('12-bar blues', 'בלוז 12 תיבות', 'blues', 'twelve bar'),
      sixteen: nm('16-bar form', 'צורה של 16 תיבות', 'sixteen bar', 'sixteen'),
      aaba: nm('32-bar AABA', 'AABA של 32 תיבות', 'thirty two bar'),
      rhythm: nm('Rhythm changes', 'ריתם צ׳יינג׳ס', 'rhythm changes', 'rhythm'),
    };
    return choiceQ({ ...base, difficulty: 1550, ask: { en: 'One chorus of a jazz tune. Which form is it?', he: 'סבב אחד של מנגינת ג׳אז. איזו צורה זו?' }, names, answer, choices: keys.slice(), stimulus: [sf(arrange(jazzForm(answer), { tonic: tonic - 4, bpm: 216, groove: 'swing' }))] });
  },
};
TOPIC_TAGS['song-form'] = tg(['form', 'song', 0.8], ['cadences', 'progression', 0.2]);

// ======================================================================= STYLE

const STYLE_NAMES: Record<StyleId, [string, string, string[]]> = {
  baroque: ['Baroque (Bach, Handel)', 'בארוק (באך, הנדל)', ['baroque', 'bach']],
  classical: ['Classical (Mozart, Haydn)', 'קלאסי (מוצרט, היידן)', ['classical', 'mozart']],
  romantic: ['Romantic (Chopin, Schumann)', 'רומנטי (שופן, שומאן)', ['romantic', 'chopin']],
  modern: ['20th century (Debussy, Bartók)', 'המאה ה־20 (דביסי, ברטוק)', ['twentieth century', 'modern', 'debussy']],
  jazz: ['Jazz (swing)', 'ג׳אז (סווינג)', ['jazz', 'swing']],
  pop: ['Pop', 'פופ', ['pop']],
};
TOPIC_GEN['style'] = {
  title: { en: 'Which period?', he: 'איזו תקופה?' },
  skill: 'form',
  levels: [
    { en: 'Baroque or Classical?', he: 'בארוק או קלאסי?' },
    { en: '… or Romantic', he: '… או רומנטי' },
    { en: '… or 20th century', he: '… או המאה ה־20' },
    { en: '… or jazz, or pop', he: '… או ג׳אז, או פופ' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const all: StyleId[] = ['baroque', 'classical', 'romantic', 'modern', 'jazz', 'pop'];
    const pool = all.slice(0, [2, 3, 4, 6][level - 1]);
    const answer = pickR(rnd, pool);
    const tonic = pickR(rnd, [57, 58, 60, 62, 63]);
    const variant = Math.floor(rnd() * 2);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(STYLE_NAMES[k][0], STYLE_NAMES[k][1], ...STYLE_NAMES[k][2]);
      choiceStim[k] = [sf(styleClip(k, tonic, variant))];
    }
    return choiceQ({ id, topic: 'style', level, seed, skill: 'form', difficulty: [1100, 1250, 1350, 1400][level - 1], ask: { en: 'Which style or period does this sound like?', he: 'לאיזה סגנון או תקופה זה נשמע שייך?' }, names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim });
  },
};
TOPIC_TAGS['style'] = tg(['form', 'style', 1]);

// ======================================================================= DEEPENED: voice-count L4 (texture)

function textureItem(seed: number, level: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [60, 62, 65, 67]);
  const tunes = [[5, 4, 3, 2, 1, 2, 3, 1], [1, 3, 5, 4, 3, 2, 2, 1], [3, 4, 5, 3, 2, 3, 1, 1], [1, 2, 3, 5, 4, 3, 2, 1]];
  const tune = pickR(rnd, tunes);
  const each = 0.42;
  const top = tune.map((d) => tonic + dgM(d));
  const mono = (): Stimulus => ev(top.map((m, i) => N(m, i * each, each * 0.92, 0.72)), tune.length * each + 0.3);
  const homo = (): Stimulus => {
    const out: NoteEvent[] = [];
    let prevBass: number | null = null;
    top.forEach((m, i) => {
      const d = tune[i];
      const r = [1, 3].includes(d) ? 0 : d === 5 ? (i === tune.length - 2 ? 7 : 0) : [4, 6].includes(d) ? 5 : 7;
      const tones = (r === 0 ? [0, 4, 7] : r === 5 ? [5, 9, 0] : [7, 11, 2]).map((x) => (x + tonic) % 12);
      const below = [m - 1, m - 2, m - 3, m - 4, m - 5, m - 6, m - 7, m - 8, m - 9].filter((x) => tones.includes(((x % 12) + 12) % 12)).slice(0, 2);
      const b = bassNote(tonic + r, prevBass, 40, 52);
      prevBass = b;
      for (const x of [m, ...below, b]) out.push(N(x, i * each, each * 0.95, x === m ? 0.7 : 0.45));
    });
    return ev(out, tune.length * each + 0.3);
  };
  const poly = (): Stimulus => {
    // a canon: the tune, and the same tune an octave lower two notes later, plus a slow free bass line
    const out: NoteEvent[] = [];
    top.forEach((m, i) => out.push(N(m, i * each, each * 0.92, 0.66), N(m - 12, (i + 2) * each, each * 0.92, 0.58)));
    [0, 7, 5, 0].forEach((x, k) => out.push(N(tonic - 24 + x, k * 2.5 * each, 2.4 * each, 0.42)));
    return ev(out, (tune.length + 2) * each + 0.3);
  };
  const choiceStim: Record<string, Stimulus[]> = { mono: [mono()], homo: [homo()], poly: [poly()] };
  const answer = pickR(rnd, ['mono', 'homo', 'poly']);
  const names: Names = {
    mono: nm('Monophonic (one line)', 'מונופוני (קו אחד)', 'monophonic', 'one line'),
    homo: nm('Homophonic (a tune with chords)', 'הומופוני (מנגינה עם אקורדים)', 'homophonic', 'chords'),
    poly: nm('Polyphonic (independent lines)', 'פוליפוני (קווים עצמאיים)', 'polyphonic', 'independent'),
  };
  return choiceQ({ id, topic: 'voice-count', level, seed, skill: 'form', difficulty: 1350, ask: { en: 'What is the texture?', he: 'איזה מרקם זה?' }, names, answer, choices: ['mono', 'homo', 'poly'], stimulus: choiceStim[answer], choiceStim });
}

// ======================================================================= DEEPENED: cadence-types L4–5

const CADS: Record<string, { r: string[]; en: string; he: string; say: string[] }> = {
  authentic: { r: ['I', 'IV', 'V7', 'I'], en: 'Authentic (V → I)', he: 'אותנטית (V → I)', say: ['authentic', 'perfect'] },
  plagal: { r: ['I', 'V', 'IV', 'I'], en: 'Plagal (IV → I, "Amen")', he: 'פלגלית (IV → I, "אמן")', say: ['plagal', 'amen'] },
  half: { r: ['I', 'IV', 'ii', 'V'], en: 'Half (ends on V)', he: 'חצי קדנצה (נגמרת על V)', say: ['half'] },
  deceptive: { r: ['I', 'IV', 'V7', 'vi'], en: 'Deceptive (V → vi)', he: 'מטעה (V → vi)', say: ['deceptive', 'interrupted'] },
};
/** A phrase with a tune on top and a broken-chord accompaniment (spec AE §10.3: cadences in texture). */
function inTexture(romans: string[], tonic: number): Stimulus {
  const voiced = voiceV(romans.map((r) => RV[r]), tonic);
  const beat = 0.45;
  const scale = (m: number, dir: number) => {
    for (let x = m + dir; ; x += dir) if (MAJ.includes((((x - tonic) % 12) + 12) % 12)) return x;
  };
  const out: NoteEvent[] = [];
  voiced.forEach((c, i) => {
    const t = i * 4 * beat;
    const last = i === voiced.length - 1;
    const [b, u0, u1, u2] = c;
    const mel = u2 + 12;
    out.push(N(b, t, (last ? 4 : 2) * beat * 0.95, 0.5));
    if (last) {
      out.push(N(mel, t, 4 * beat, 0.72));
      for (const m of [u0, u1]) out.push(N(m, t, 4 * beat, 0.32));
      return;
    }
    const nextMel = voiced[i + 1][3] + 12;
    const dir = nextMel > mel ? 1 : nextMel < mel ? -1 : 1;
    out.push(N(mel, t, 2 * beat * 0.95, 0.72), N(scale(mel, dir), t + 2 * beat, beat * 0.95, 0.62), N(mel, t + 3 * beat, beat * 0.95, 0.66));
    for (let k = 0; k < 8; k++) out.push(N(k % 2 ? u1 : u0, t + (k * beat) / 2, (beat / 2) * 0.9, 0.3));
  });
  return ev(out, voiced.length * 4 * beat + 0.4);
}
const CAD_PAIRS: Record<string, { pair: [string, string]; en: string; he: string; say: string[] }> = {
  'V-I': { pair: ['V7', 'I'], en: 'V → I', he: 'V → I', say: ['five one'] },
  'IV-I': { pair: ['IV', 'I'], en: 'IV → I', he: 'IV → I', say: ['four one'] },
  'ii-V': { pair: ['ii', 'V'], en: 'ii → V', he: 'ii → V', say: ['two five'] },
  'IV-V': { pair: ['IV', 'V'], en: 'IV → V', he: 'IV → V', say: ['four five'] },
  'I-V': { pair: ['I', 'V'], en: 'I → V', he: 'I → V', say: ['one five'] },
  'V-vi': { pair: ['V7', 'vi'], en: 'V → vi', he: 'V → vi', say: ['five six'] },
};
function cadenceDeep(seed: number, level: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [57, 58, 60, 62, 64]);
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  if (level === 1) {
    const pool = Object.keys(CADS);
    const answer = pickR(rnd, pool);
    for (const k of pool) {
      names[k] = nm(CADS[k].en, CADS[k].he, ...CADS[k].say);
      choiceStim[k] = [inTexture(CADS[k].r, tonic)];
    }
    return choiceQ({ id, topic: 'cadence-types', level: 4, seed, skill: 'cadences', difficulty: 1420, ask: { en: 'A tune with its accompaniment. How does the phrase end?', he: 'מנגינה עם ליווי. איך המשפט נגמר?' }, names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim });
  }
  const all = Object.keys(CAD_PAIRS);
  const answer = pickR(rnd, all);
  const offered = all.filter((k) => k === answer || shuffleR(rnd, all.filter((x) => x !== answer)).slice(0, 3).includes(k));
  const phrase = (k: string) => {
    const [x, y] = CAD_PAIRS[k].pair;
    const pre = ['vi', 'iii', 'IV', 'ii'].find((r) => r !== x && r !== y && !(r === 'IV' && x === 'ii'))!;
    return playChords(voiceV(['I', pre, x, y].map((r) => RV[r]), tonic), 0.85, 1.8);
  };
  for (const k of offered) {
    names[k] = nm(CAD_PAIRS[k].en, CAD_PAIRS[k].he, ...CAD_PAIRS[k].say);
    choiceStim[k] = [phrase(k)];
  }
  return choiceQ({ id, topic: 'cadence-types', level: 5, seed, skill: 'cadences', difficulty: 1500, ask: { en: 'Name the two chords at the cadence.', he: 'מה שני האקורדים בקדנצה?' }, names, answer, choices: offered, stimulus: choiceStim[answer], choiceStim });
}

// ======================================================================= DEEPENED: modulation L4–5

const MOD2: Record<string, { off: number; minor: boolean; en: string; he: string; say: string[] }> = {
  relmaj: { off: 3, minor: false, en: 'To the relative major (III)', he: 'למז׳ור המקביל (III)', say: ['relative major', 'major'] },
  mdom: { off: 7, minor: true, en: 'To the minor dominant (v)', he: 'לדומיננטה המינורית (v)', say: ['minor dominant'] },
  msub: { off: 5, minor: true, en: 'To the minor subdominant (iv)', he: 'לסובדומיננטה המינורית (iv)', say: ['minor subdominant'] },
  dom: { off: 7, minor: false, en: 'To the dominant (V)', he: 'לדומיננטה (V)', say: ['dominant'] },
  sub: { off: 5, minor: false, en: 'To the subdominant (IV)', he: 'לסובדומיננטה (IV)', say: ['subdominant'] },
  relmin: { off: 9, minor: true, en: 'To the relative minor (vi)', he: 'למינור המקביל (vi)', say: ['relative minor'] },
  sup: { off: 2, minor: true, en: 'To the supertonic minor (ii)', he: 'לדרגה השנייה, מינור (ii)', say: ['supertonic', 'two minor'] },
  med: { off: 4, minor: true, en: 'To the mediant minor (iii)', he: 'לדרגה השלישית, מינור (iii)', say: ['mediant', 'three minor'] },
};
function modulationDeep(seed: number, level: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [57, 59, 60, 62, 64]);
  const fromMinor = level === 1;
  const all = fromMinor ? ['relmaj', 'mdom', 'msub'] : ['dom', 'sub', 'relmin', 'sup', 'med'];
  const answer = pickR(rnd, all);
  const offered = fromMinor ? all : all.filter((k) => k === answer || shuffleR(rnd, all.filter((x) => x !== answer)).slice(0, 3).includes(k));
  const phrase = (k: string) => {
    const m = MOD2[k];
    const home = cadenceV(fromMinor);
    // the new key as semitones above the old tonic (its own cadence, transposed)
    const away = cadenceV(m.minor).map((c) => ({ bass: c.bass + m.off, up: c.up.map((x) => x + m.off) }));
    return playChords(voiceV([...home, ...away], tonic), 0.62, 1.4);
  };
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  for (const k of offered) {
    names[k] = nm(MOD2[k].en, MOD2[k].he, ...MOD2[k].say);
    choiceStim[k] = [phrase(k)];
  }
  return choiceQ({
    id, topic: 'modulation', level: level + 3, seed, skill: 'cadences', difficulty: fromMinor ? 1520 : 1580,
    ask: fromMinor ? { en: 'The first phrase is in a minor key. Where does the second one go?', he: 'המשפט הראשון בסולם מינורי. לאן הולך השני?' } : { en: 'Which related key does phrase 2 go to?', he: 'לאיזה סולם קרוב הולך משפט 2?' },
    names, answer, choices: offered, stimulus: choiceStim[answer], choiceStim,
  });
}

// ---------------------------------------------------------------- wrapping the base topics (new levels after theirs)

function deepen(topic: string, more: { en: string; he: string }[], gen: (seed: number, level: number, id: string) => ChoiceQuestion) {
  const base = TOPIC_GEN[topic];
  const baseN = base.levels.length;
  TOPIC_GEN[topic] = { ...base, levels: [...base.levels, ...more], gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : gen(seed, level - baseN, id)) };
}
deepen('voice-count', [{ en: 'Texture: monophonic, homophonic or polyphonic?', he: 'מרקם: מונופוני, הומופוני או פוליפוני?' }], (seed, _l, id) => textureItem(seed, 4, id));
deepen('cadence-types', [{ en: 'In texture: a tune with accompaniment', he: 'במרקם: מנגינה עם ליווי' }, { en: 'Name the chords at the cadence', he: 'לזהות את האקורדים בקדנצה' }], cadenceDeep);
deepen('modulation', [{ en: 'From a minor key', he: 'מסולם מינורי' }, { en: 'Every closely related key', he: 'כל הסולמות הקרובים' }], modulationDeep);
// Tags of the deepened topics stay as they are (form/voices, cadences/cadence, cadences/modulation).
