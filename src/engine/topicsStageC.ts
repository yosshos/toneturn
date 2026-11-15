// STAGE C (docs/research/AUDIT-6-LEVELS-EAR-JAZZ-VOICE.md §1.2–1.4, ear build #8): the advanced ear gaps.
//
//  three-voice  the lowest part of a three-part phrase (ABRSM G8 aural A): hear three voices, the upper one written,
//               write the bass — root position, then inversions, then with rhythm, then in minor
//  one-hearing  single-hearing playback (RCM L10): the phrase plays ONCE (no replay); write it — a melody, a melody with
//               rhythm, the bass of a progression, a minor phrase of four bars
//  features     describe the piece (ABRSM G8 D): one excerpt, several features at once (dynamics, articulation, tempo,
//               tonality, the cadence); choose the description that fits — credit for every feature it gets right
//
// (Singing one part from the score while the app plays the other is a sung item: the voice course's v-part family.)
// Every item runs in all twelve keys (the key from the seed). Pure and deterministic from (topic, level, seed).

import type { ChoiceQuestion, NoteEvent, PlaceQuestion, Stimulus } from './lesson';
import { placeKey } from './lesson';
import type { PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Bi = { en: string; he: string };
const mod = (x: number, n: number) => ((x % n) + n) % n;
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const HMIN = [0, 2, 3, 5, 7, 8, 11];
/** Major keys by tonic pitch class, spelled as the key signature writes them. */
const KEY_PC: PitchClass[] = [
  { letter: 'C', acc: 0 }, { letter: 'D', acc: -1 }, { letter: 'D', acc: 0 }, { letter: 'E', acc: -1 }, { letter: 'E', acc: 0 }, { letter: 'F', acc: 0 },
  { letter: 'F', acc: 1 }, { letter: 'G', acc: 0 }, { letter: 'A', acc: -1 }, { letter: 'A', acc: 0 }, { letter: 'B', acc: -1 }, { letter: 'B', acc: 0 },
];
const NAME_EN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAME_HE = ['דו', 'רה במול', 'רה', 'מי במול', 'מי', 'פה', 'פה דיאז', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];
/** A minor key's tonic (C♯ and F♯ minor, not D♭ / G♭) → its relative major's signature. */
const keyName = (pc: number, minor: boolean): Bi => {
  const sharpMinor: Record<number, [string, string]> = { 1: ['C♯', 'דו דיאז'], 6: ['F♯', 'פה דיאז'], 8: ['G♯', 'סול דיאז'], 3: ['E♭', 'מי במול'] };
  const [en, he] = minor && sharpMinor[pc] ? sharpMinor[pc] : [NAME_EN[pc], NAME_HE[pc]];
  return { en: `${en} ${minor ? 'minor' : 'major'}`, he: `${he} ${minor ? 'מינור' : 'מז׳ור'}` };
};
const sigOf = (pc: number, minor: boolean): PitchClass => KEY_PC[minor ? mod(pc + 3, 12) : pc];
const N = (midi: number, start: number, duration: number, velocity = 0.6): NoteEvent => ({ midi, start, duration, velocity });
const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
/** The key stated first: a major cadence, or i–iv–V–i in harmonic minor. */
function keyStim(pc: number, minor: boolean): Stimulus {
  if (!minor) return { kind: 'cadence', key: KEY_PC[pc] };
  const T = 55 + mod(pc - 55, 12);
  const cs = [[T - 12, T + 3, T + 7, T + 12], [T - 7, T + 5, T + 8, T + 12], [T - 5, T + 2, T + 5, T + 11], [T - 12, T + 3, T + 7, T + 12]];
  const out: NoteEvent[] = [];
  cs.forEach((c, i) => c.forEach((m) => out.push(N(m, i * 0.75, i === 3 ? 1.3 : 0.7, 0.45))));
  return ev(out, 3 * 0.75 + 1.3 + 0.45);
}
function voicesStim(voices: { midis: number[]; durs: number[] }[], bpm: number, vel = 0.6): Stimulus {
  const beat = 60 / bpm;
  const out: NoteEvent[] = [];
  let end = 0;
  for (const v of voices) {
    let t = 0;
    v.midis.forEach((m, i) => {
      out.push(N(m, t * beat, v.durs[i] * beat * 0.95, vel));
      t += v.durs[i];
    });
    end = Math.max(end, t);
  }
  return ev(out, end * beat + 0.3);
}
function placeQ(p: Omit<PlaceQuestion, 'kind' | 'answer' | 'choices'>): PlaceQuestion {
  const q: PlaceQuestion = { kind: 'place', ...p, choices: [], answer: '' };
  q.answer = placeKey(q, q.target, q.durs);
  return q;
}
/** The diatonic note `i` steps above the tonic T (scale degrees, octaves by 7). */
const idx = (T: number, i: number, scale: number[]) => T + 12 * Math.floor(i / 7) + scale[mod(i, 7)];

// ======================================================================= three-voice: the lowest part

/** Progressions as [root degree (0 = I), inversion (0 root, 1 first)] per level. */
const PROGS: [number, number][][][] = [
  [[[0, 0], [3, 0], [4, 0], [0, 0]], [[0, 0], [5, 0], [3, 0], [4, 0]], [[0, 0], [3, 0], [1, 0], [4, 0]], [[0, 0], [4, 0], [5, 0], [3, 0]]],
  [[[0, 0], [5, 0], [1, 1], [4, 0], [0, 0]], [[0, 0], [0, 1], [3, 0], [4, 0], [0, 0]], [[0, 0], [4, 1], [0, 0], [3, 0], [4, 0]], [[0, 0], [3, 0], [4, 1], [5, 0], [4, 0]]],
  [[[0, 0], [5, 0], [3, 0], [1, 1], [4, 0], [0, 0]], [[0, 0], [4, 1], [0, 0], [3, 0], [4, 0], [0, 0]], [[0, 0], [3, 0], [0, 1], [1, 0], [4, 0], [0, 0]]],
  [[[0, 0], [3, 0], [4, 0], [0, 0], [4, 0]], [[0, 0], [5, 0], [3, 0], [4, 0], [0, 0]], [[0, 0], [4, 1], [0, 0], [3, 1], [4, 0]]],
];
const TV_DIFF = [1650, 1720, 1800, 1880];
const TV_DURS = [[2, 1, 1, 1, 1, 2], [1, 1, 2, 1, 1, 2], [1.5, 0.5, 1, 1, 2, 2]];

/** Three voices over a progression: the bass (root / third), the soprano by the nearest chord tone, the middle between. */
export function threeVoices(T: number, prog: [number, number][], scale: number[], rnd: () => number): { up: number[]; mid: number[]; low: number[] } {
  const tri = (r: number) => [r, r + 2, r + 4];
  const up: number[] = [];
  const mid: number[] = [];
  const low: number[] = [];
  let pb = T - 12;
  let ps = idx(T, pickR(rnd, [2, 4, 7]), scale);
  let pm = T + 4;
  for (const [r, inv] of prog) {
    const tones = tri(r);
    const bassDeg = tones[inv];
    const bc = [-14, -7, 0].map((o) => idx(T - 12, bassDeg + o, scale)).filter((m) => m >= T - 22 && m <= T - 3);
    const b = bc.reduce((a, c) => (Math.abs(c - pb) < Math.abs(a - pb) ? c : a), bc[0] ?? idx(T - 12, bassDeg, scale));
    const scands: number[] = [];
    for (const d of tones) for (const o of [0, 7, 14]) scands.push(idx(T, d + o, scale));
    const sc = scands.filter((m) => m >= T + 4 && m <= T + 19);
    const s = sc.reduce((a, c) => (Math.abs(c - ps) < Math.abs(a - ps) ? c : a), sc[0]);
    const mc: number[] = [];
    for (const d of tones) for (const o of [-7, 0, 7]) mc.push(idx(T, d + o, scale));
    const free = mc.filter((m) => m > b + 2 && m < s - 1 && mod(m - s, 12) !== 0);
    const prefer = free.filter((m) => !(mod(m - b, 12) === 0 && tones.length > 2 && free.some((x) => mod(x - b, 12) !== 0)));
    const pool = prefer.length ? prefer : free.length ? free : [s - 5];
    const m = pool.reduce((a, c) => (Math.abs(c - pm) < Math.abs(a - pm) ? c : a), pool[0]);
    up.push(s);
    mid.push(m);
    low.push(b);
    pb = b;
    ps = s;
    pm = m;
  }
  return { up, mid, low };
}

TOPIC_GEN['three-voice'] = {
  title: { en: 'Three voices: the lowest', he: 'שלושה קולות: התחתון' },
  skill: 'dictation',
  levels: [
    { en: 'Root position, four chords', he: 'מצב יסודי, ארבעה אקורדים' },
    { en: 'With a first inversion', he: 'עם היפוך ראשון' },
    { en: 'Six chords with rhythm', he: 'שישה אקורדים עם קצב' },
    { en: 'In minor', he: 'במינור' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const minor = level === 4;
    const pc = mod(seed, 12);
    const T = 60 + mod(pc - 60, 12) - (mod(pc - 60, 12) > 6 ? 12 : 0);
    const scale = minor ? HMIN : MAJ;
    const prog = pickR(rnd, PROGS[level - 1]);
    const v = threeVoices(T, prog, scale, rnd);
    const durs = level === 3 ? pickR(rnd, TV_DURS) : undefined;
    const ds = durs ?? v.low.map(() => 1);
    const kn = keyName(pc, minor);
    const sig = sigOf(pc, minor);
    return placeQ({
      id,
      topic: 'three-voice',
      level,
      seed,
      skill: 'dictation',
      difficulty: TV_DIFF[level - 1],
      as: 'seq',
      match: 'exact',
      surface: 'staff',
      ask: { en: 'Three voices: the top one is written. Write the lowest voice.', he: 'שלושה קולות: העליון כתוב. כתבו את הקול התחתון.' },
      text: { en: durs ? `${kn.en} · 4/4` : kn.en, he: durs ? `${kn.he} · 4/4` : kn.he },
      target: v.low,
      ...(durs ? { durs } : {}),
      staff: { key: sig, clef: 'bass' },
      given: { midis: v.up, clef: 'treble', key: sig, ...(durs ? { durs } : {}) },
      stimulus: [keyStim(pc, minor), rest(0.4), voicesStim([{ midis: v.up, durs: ds }, { midis: v.mid, durs: ds }, { midis: v.low, durs: ds }], durs ? 80 : 66)],
    });
  },
};
TOPIC_TAGS['three-voice'] = tg(['dictation', 'two-part', 0.4], ['dictation', 'bass', 0.3], ['form', 'voices', 0.3]);

// ======================================================================= one-hearing: playback after one hearing

/** One-bar rhythms (beats) of 4/4: our own cells; the last bar of a phrase ends long. */
const CELLS = [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [1.5, 0.5, 2], [1, 0.5, 0.5, 2], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 1, 1]];
const ENDS = [[2, 2], [3, 1], [1, 1, 2], [4]];
/** A seeded diatonic line of `n` notes: mostly steps, a leap or two, ending on the tonic (or the 3rd). */
export function hearLine(rnd: () => number, n: number, lo: number, hi: number): number[] {
  const out = [pickR(rnd, [0, 2, 4])];
  while (out.length < n - 1) {
    const r = rnd();
    const mv = r < 0.62 ? (rnd() < 0.5 ? 1 : -1) : r < 0.85 ? (rnd() < 0.5 ? 2 : -2) : rnd() < 0.5 ? 3 : -4;
    const nx = out[out.length - 1] + mv;
    if (nx < lo || nx > hi || nx === out[out.length - 1]) continue;
    out.push(nx);
  }
  const last = out[out.length - 1];
  const ends = [0, 7, 2].filter((x) => x >= lo && x <= hi && x !== last);
  out.push(ends.reduce((a, c) => (Math.abs(c - last) < Math.abs(a - last) ? c : a), ends[0]));
  return out;
}
const OH_DIFF = [1600, 1700, 1780, 1860];

TOPIC_GEN['one-hearing'] = {
  title: { en: 'One hearing', he: 'השמעה אחת' },
  skill: 'dictation',
  levels: [
    { en: 'A short melody, heard once', he: 'מנגינה קצרה, בהשמעה אחת' },
    { en: 'Two bars with rhythm, heard once', he: 'שתי תיבות עם קצב, בהשמעה אחת' },
    { en: 'The bass of four chords, heard once', he: 'הבס של ארבעה אקורדים, בהשמעה אחת' },
    { en: 'Four bars in minor, heard once', he: 'ארבע תיבות במינור, בהשמעה אחת' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pc = mod(seed * 7, 12);
    const minor = level === 4;
    const scale = minor ? HMIN : MAJ;
    const kn = keyName(pc, minor);
    const sig = sigOf(pc, minor);
    const base = { id, topic: 'one-hearing', level, seed, skill: 'dictation' as const, difficulty: OH_DIFF[level - 1], as: 'seq' as const, match: 'exact' as const, surface: 'staff' as const, once: true };
    const once = { en: 'It plays once only — listen to the end, then write it.', he: 'זה מתנגן פעם אחת בלבד — הקשיבו עד הסוף, ואז כתבו.' };
    if (level === 3) {
      const T = 60 + mod(pc - 60, 12) - (mod(pc - 60, 12) > 6 ? 12 : 0);
      const prog = pickR(rnd, PROGS[1]);
      const v = threeVoices(T, prog.slice(0, 4), scale, rnd);
      return placeQ({
        ...base,
        ask: { en: `Four chords: write the bass. ${once.en}`, he: `ארבעה אקורדים: כתבו את הבס. ${once.he}` },
        text: kn,
        target: v.low,
        staff: { key: sig, clef: 'bass' },
        stimulus: [keyStim(pc, minor), rest(0.4), voicesStim([{ midis: v.up, durs: [1, 1, 1, 2] }, { midis: v.mid, durs: [1, 1, 1, 2] }, { midis: v.low, durs: [1, 1, 1, 2] }], 72)],
      });
    }
    const T = 60 + mod(pc - 60, 12);
    const durs = level === 1 ? undefined : level === 2 ? [...pickR(rnd, CELLS), ...pickR(rnd, ENDS)] : [...pickR(rnd, CELLS), ...pickR(rnd, CELLS), ...pickR(rnd, CELLS), ...pickR(rnd, ENDS)];
    const n = durs ? durs.length : 5;
    const line = hearLine(rnd, n, -2, 9).map((i) => idx(T, i, scale));
    const ds = durs ?? line.map(() => 1);
    return placeQ({
      ...base,
      ask: { en: `Write the melody. ${once.en}`, he: `כתבו את המנגינה. ${once.he}` },
      text: { en: durs ? `${kn.en} · 4/4` : kn.en, he: durs ? `${kn.he} · 4/4` : kn.he },
      target: line,
      ...(durs ? { durs } : {}),
      staff: { key: sig, clef: 'treble' },
      given: { midis: [line[0]], clef: 'treble', key: sig },
      stimulus: [keyStim(pc, minor), rest(0.4), voicesStim([{ midis: line, durs: ds }], durs ? 84 : 72)],
    });
  },
};
TOPIC_TAGS['one-hearing'] = tg(['dictation', 'melodic', 0.5], ['sequences', 'melody', 0.3], ['dictation', 'bass', 0.2]);

// ======================================================================= features: describe the piece

type Feat = 'dyn' | 'art' | 'tempo' | 'tonal' | 'cad';
const FEAT_VALUES: Record<Feat, { id: string; en: string; he: string }[]> = {
  dyn: [
    { id: 'loud', en: 'loud', he: 'חזק' },
    { id: 'soft', en: 'soft', he: 'חלש' },
    { id: 'cresc', en: 'louder', he: 'מתחזק' },
    { id: 'dim', en: 'softer', he: 'נחלש' },
  ],
  art: [
    { id: 'leg', en: 'legato', he: 'לגאטו' },
    { id: 'stac', en: 'staccato', he: 'סטקטו' },
  ],
  tempo: [
    { id: 'steady', en: 'steady', he: 'יציב' },
    { id: 'acc', en: 'faster', he: 'מאיץ' },
    { id: 'rit', en: 'slower', he: 'מאט' },
  ],
  tonal: [
    { id: 'maj', en: 'major', he: 'מז׳ור' },
    { id: 'min', en: 'minor', he: 'מינור' },
  ],
  cad: [
    { id: 'perf', en: 'perfect cadence', he: 'קדנצה מושלמת' },
    { id: 'imp', en: 'imperfect cadence', he: 'קדנצה חצויה' },
  ],
};
const LEVEL_FEATS: Feat[][] = [['dyn', 'art'], ['dyn', 'art', 'tempo'], ['tonal', 'dyn', 'art', 'tempo'], ['tonal', 'dyn', 'art', 'tempo', 'cad']];
const FT_DIFF = [1500, 1600, 1700, 1800];

/**
 * The excerpt: an 8-note melody over a bass and inner chord tones (I IV V I, or ending on V), played with the chosen
 * dynamics (a level or a hairpin), articulation and tempo shape, in major or minor.
 */
export function featureExcerpt(pc: number, v: Record<Feat, string>, rnd: () => number): Stimulus {
  const minor = v.tonal === 'min';
  const scale = minor ? HMIN : MAJ;
  const T = 60 + mod(pc - 60, 12);
  const mel = hearLine(rnd, 8, 0, 9).map((i) => idx(T, i, scale));
  if (v.cad === 'imp') mel[7] = idx(T, pickR(rnd, [1, 4, 6]), scale);
  const roots = v.cad === 'imp' ? [0, 3, 0, 4] : [0, 3, 4, 0];
  const n = mel.length;
  // Onsets: steady, accelerating (each gap ×0.9) or slowing (×1.12), from a beat of 0.55 s.
  const k = v.tempo === 'acc' ? 0.9 : v.tempo === 'rit' ? 1.12 : 1;
  const onsets: number[] = [];
  let t = 0;
  let g = 0.55;
  for (let i = 0; i < n; i++) {
    onsets.push(t);
    t += g;
    g *= k;
  }
  const vel = (i: number) => (v.dyn === 'loud' ? 0.85 : v.dyn === 'soft' ? 0.28 : v.dyn === 'cresc' ? 0.25 + (0.65 * i) / (n - 1) : 0.9 - (0.65 * i) / (n - 1));
  const len = (i: number) => (v.art === 'stac' ? 0.16 : (onsets[i + 1] ?? t) - onsets[i]) * (v.art === 'stac' ? 1 : 0.98);
  const out: NoteEvent[] = mel.map((m, i) => N(m, onsets[i], i === n - 1 ? 1.1 : len(i), vel(i)));
  // The harmony: one chord every two melody notes (bass + a chord tone), same dynamics and articulation.
  roots.forEach((r, c) => {
    const at = onsets[c * 2];
    const dur = c === 3 ? 1.1 : v.art === 'stac' ? 0.18 : (onsets[c * 2 + 2] ?? t) - at;
    out.push(N(idx(T - 24, r, scale), at, dur, vel(c * 2) * 0.8), N(idx(T - 12, r + 2, scale), at, dur, vel(c * 2) * 0.7));
  });
  return ev(out, t + 1.3);
}

TOPIC_GEN['features'] = {
  title: { en: 'Describe the piece', he: 'תארו את הקטע' },
  skill: 'form',
  levels: [
    { en: 'Dynamics and articulation', he: 'דינמיקה וארטיקולציה' },
    { en: 'Plus the tempo', he: 'ועוד הטמפו' },
    { en: 'Plus major or minor, with hairpins', he: 'ועוד מז׳ור או מינור, עם שינויי עוצמה' },
    { en: 'Plus the cadence', he: 'ועוד הקדנצה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const feats = LEVEL_FEATS[level - 1];
    const pick = (f: Feat): string => {
      const vs = FEAT_VALUES[f].filter((x) => !(f === 'dyn' && level < 3 && (x.id === 'cresc' || x.id === 'dim')) && !(f === 'dyn' && level >= 3 && (x.id === 'loud' || x.id === 'soft')));
      return pickR(rnd, vs).id;
    };
    const right = Object.fromEntries(feats.map((f) => [f, pick(f)])) as Record<Feat, string>;
    const DEFAULTS: Record<Feat, string> = { dyn: 'loud', art: 'leg', tempo: 'steady', tonal: 'maj', cad: 'perf' };
    const all: Record<Feat, string> = { ...DEFAULTS, ...right };
    const pc = mod(seed * 5 + level, 12);
    const keyOf = (c: Record<Feat, string>) => feats.map((f) => c[f]).join('|');
    const values = (f: Feat) => FEAT_VALUES[f].filter((x) => !(f === 'dyn' && level < 3 && (x.id === 'cresc' || x.id === 'dim')) && !(f === 'dyn' && level >= 3 && (x.id === 'loud' || x.id === 'soft'))).map((x) => x.id);
    // Distractors: change one feature (most of them) or two, never the same description twice.
    const opts = new Map<string, Record<Feat, string>>([[keyOf(right), right]]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 200) {
      const c = { ...right };
      const nChange = feats.length >= 3 && rnd() < 0.3 ? 2 : 1;
      for (const f of shuffleR(rnd, feats).slice(0, nChange)) c[f] = pickR(rnd, values(f).filter((x) => x !== right[f]));
      opts.set(keyOf(c), c);
    }
    const name = (c: Record<Feat, string>) => {
      const parts = feats.map((f) => FEAT_VALUES[f].find((x) => x.id === c[f])!);
      return nm(parts.map((p) => p.en).join(' · '), parts.map((p) => p.he).join(' · '));
    };
    const choices = shuffleR(rnd, [...opts.keys()]);
    const partial = Object.fromEntries([...opts.entries()].filter(([k]) => k !== keyOf(right)).map(([k, c]) => [k, Math.round((feats.filter((f) => c[f] === right[f]).length / feats.length) * 100) / 100]));
    const q: ChoiceQuestion = choiceQ({
      id,
      topic: 'features',
      level,
      seed,
      skill: 'form',
      difficulty: FT_DIFF[level - 1],
      ask: { en: 'Listen to the whole excerpt. Which description fits it?', he: 'הקשיבו לכל הקטע. איזה תיאור מתאים לו?' },
      names: Object.fromEntries([...opts.entries()].map(([k, c]) => [k, name(c)])),
      answer: keyOf(right),
      choices,
      partial,
      stimulus: [featureExcerpt(pc, all, rnd)],
    });
    return q;
  },
};
TOPIC_TAGS['features'] = tg(['expression', 'dynamics', 0.3], ['expression', 'articulation', 0.25], ['form', 'style', 0.25], ['tempo', 'compare', 0.2]);
