// HARRIS_2 (docs/AUDIT-CONTENT-THEORY.md §ז.2, "from the diminished to everything"): the Barry Harris unit 2 ear and
// theory topics. Jazz & improv course (pack 'jazz', path.ts PACK_TOPICS), after bh-scale / bh-convert / bh-family.
//   · bh-three-dim — the three diminished collections and one 6th chord (§ג.3): the scale's diminished is the one that
//                    shares no note with the 6 chord (C6 / Cm6 + B°7 = the scale; B°7 = G7♭9 without its root); a minor
//                    6th grows from the diminished on its root by raising one note; the scale's notes; partner by ear
//   · bh-dim-roles — the diminished in a progression: where it is, passing up or down (I6–♯I°7–ii7, I6/3–♭III°7–ii7),
//                    passing / auxiliary (C6–C°7–C6, = ♯IV°7 over the I bass) / dominant (vii°7 for V), which passage
//   · bh-m6-bass   — one shape, three basses: Cm6 = Am7♭5 = F9 without its root, by ear and on paper
// Pure, seeded generators like every topic. Every fact here is checked in tests/harris2.test.ts.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// ---------------------------------------------------------------- spelling (chord symbols in Latin letters, both languages)

/** Chord roots as jazz charts write them (flats, F♯). */
export const ROOT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** Diminished chord roots as usually written (C♯°7, G♯°7, not D♭°7, A♭°7). */
export const DIM_ROOT = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
export const dimName = (pc: number) => `${DIM_ROOT[mod12(pc)]}°7`;

// ---------------------------------------------------------------- the three diminished collections (§ג.3)

/** The four pitch classes of a diminished seventh chord on `pc`. */
export const dimPcs = (pc: number): number[] => [0, 3, 6, 9].map((x) => mod12(pc + x));
/** Which of the three diminished collections a pitch class belongs to (0, 1, 2). */
export const dimClass = (pc: number) => mod12(pc) % 3;
/** Pitch classes of a 6th chord (major or minor) on `key`. */
export const sixPcs = (key: number, minor: boolean): number[] => (minor ? [0, 3, 7, 9] : [0, 4, 7, 9]).map((x) => mod12(key + x));
/** The scale's diminished (Barry's partner): the one collection with no note of the 6th chord — always on the 7th degree. */
export const partnerClass = (key: number) => dimClass(key + 11);
/** How many notes of the 6th chord each collection holds (index = collection). */
export function touches(key: number, minor: boolean): number[] {
  const six = sixPcs(key, minor);
  return [0, 1, 2].map((c) => six.filter((p) => dimClass(p) === c).length);
}

// ---------------------------------------------------------------- voicing and progressions

/** pcs placed in ascending order from the first one at or above `lo`. */
function close(pcs: number[], lo: number): number[] {
  const out: number[] = [];
  let p = lo;
  for (const x of pcs) {
    while (mod12(p) !== mod12(x)) p++;
    out.push(p);
    p++;
  }
  return out;
}
/** A close four-voice voicing of `pcs` nearest `prev` (each voice moves as little as it can), inside lo…hi. */
export function nearVoicing(pcs: number[], prev: number[] | null, lo = 55, hi = 79, aimTop = 72): number[] {
  const sorted = [...new Set(pcs.map(mod12))];
  let best: number[] = [];
  let cost = Infinity;
  for (let r = 0; r < sorted.length; r++) {
    const rot = [...sorted.slice(r), ...sorted.slice(0, r)];
    for (let start = lo; start < lo + 12; start++) {
      if (mod12(start) !== rot[0]) continue;
      for (let oct = 0; oct <= 2; oct++) {
        const v = close(rot, start + 12 * oct);
        if (v[0] < lo || v[v.length - 1] > hi) continue;
        const c = prev ? v.reduce((a, m, i) => a + Math.abs(m - (prev[i] ?? prev[prev.length - 1])), 0) : Math.abs(v[v.length - 1] - aimTop);
        if (c < cost) {
          cost = c;
          best = v;
        }
      }
    }
  }
  return best;
}
/** One chord of a Barry Harris progression: bass pitch class, upper pitch classes (all relative to the key). */
export interface BhChord {
  sym: string;
  bass: number;
  pcs: number[];
}
const C = (sym: string, bass: number, pcs: number[]): BhChord => ({ sym, bass, pcs });
/** The chords of the passing-diminished passages (§ג.2, k-sixdim 5), relative to the key. */
export const BH: Record<string, BhChord> = {
  I6: C('I6', 0, [0, 4, 7, 9]),
  I6_3: C('I6/3', 4, [0, 4, 7, 9]),
  I6_5: C('I6/5', 7, [0, 4, 7, 9]),
  sI: C('♯I°7', 1, [1, 4, 7, 10]),
  ii7: C('ii7', 2, [2, 5, 9, 0]),
  sii: C('♯ii°7', 3, [3, 6, 9, 0]),
  bIII: C('♭III°7', 3, [3, 6, 9, 0]),
  iii7: C('iii7', 4, [4, 7, 11, 2]),
  IV6: C('IV6', 5, [5, 9, 0, 2]),
  sIV: C('♯IV°7', 6, [6, 9, 0, 3]),
  V7: C('V7', 7, [7, 11, 2, 5]),
  vi7: C('vi7', 9, [9, 0, 4, 7]),
  vii: C('vii°7', 11, [11, 2, 5, 8]),
  Idim: C('I°7', 0, [0, 3, 6, 9]),
  IVdim: C('IV°7', 5, [5, 8, 11, 2]),
};
/** Is this chord a diminished seventh (four notes a minor 3rd apart)? */
export const isDim = (c: BhChord) => {
  const s = [...c.pcs].map(mod12).sort((a, b) => a - b);
  return s.length === 4 && s.every((p, i) => i === 0 || p - s[i - 1] === 3);
};
/** A progression as piano events: the bass in the left hand, four close voices led smoothly in the right. */
export function bhProg(chords: BhChord[], key: number, bpm = 92, beats = 2): Stimulus {
  const q = 60 / bpm;
  const ev: NoteEvent[] = [];
  let prev: number[] | null = null;
  chords.forEach((c, i) => {
    const t = i * beats * q;
    const len = beats * q * (i === chords.length - 1 ? 1.6 : 0.95);
    const v = nearVoicing(c.pcs.map((p) => p + key), prev);
    prev = v;
    ev.push({ midi: 36 + mod12(c.bass + key - 36) + (mod12(c.bass + key) < 4 ? 12 : 0), start: t, duration: len, velocity: 0.62 });
    for (const m of v) ev.push({ midi: m, start: t + 0.01, duration: len, velocity: 0.46 });
  });
  return eventsStim(ev, chords.length * beats * q * 1.15 + 0.3);
}

// ================================================================ bh-three-dim (BH-A)

/** The scales offered when building the 6th-diminished scale (as degrees above the tonic). */
export const SCALES_6DIM: Record<string, { iv: number[]; n: ReturnType<typeof nm> }> = {
  six: { iv: [0, 2, 4, 5, 7, 8, 9, 11], n: nm('1 2 3 4 5 ♭6 6 7', '1 2 3 4 5 ♭6 6 7', 'major six diminished') },
  msix: { iv: [0, 2, 3, 5, 7, 8, 9, 11], n: nm('1 2 ♭3 4 5 ♭6 6 7', '1 2 ♭3 4 5 ♭6 6 7', 'minor six diminished') },
  octa: { iv: [0, 1, 3, 4, 6, 7, 9, 10], n: nm('1 ♭2 ♭3 3 ♯4 5 6 ♭7', '1 ♭2 ♭3 3 ♯4 5 6 ♭7', 'half whole', 'octatonic') },
  bebop: { iv: [0, 2, 4, 5, 7, 9, 10, 11], n: nm('1 2 3 4 5 6 ♭7 7', '1 2 3 4 5 6 ♭7 7', 'dominant bebop') },
  dorbebop: { iv: [0, 2, 3, 4, 5, 7, 9, 10], n: nm('1 2 ♭3 3 4 5 6 ♭7', '1 2 ♭3 3 4 5 6 ♭7', 'dorian bebop') },
};

TOPIC_GEN['bh-three-dim'] = {
  title: { en: 'Barry Harris: three diminished chords, one 6th chord', he: 'בארי האריס: שלושה דימינישים, אקורד 6 אחד' },
  skill: 'chords',
  levels: [
    { en: 'Which diminished joins the 6th chord?', he: 'איזה דימיניש מצטרף לאקורד ה־6?' },
    { en: 'The minor 6th grows from which diminished?', he: 'המינור 6 נוצר מאיזה דימיניש?' },
    { en: 'The 6th chord + its diminished = which scale?', he: 'אקורד ה־6 + הדימיניש שלו = איזה סולם?' },
    { en: 'By ear: the scale’s diminished or another?', he: 'בשמיעה: הדימיניש של הסולם או אחר?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const minor = level === 2 ? true : level === 1 || level === 4 ? rnd() < 0.35 : rnd() < 0.5;
    const six = sixPcs(key, minor);
    const sixName = `${ROOT[key]}${minor ? 'm6' : '6'}`;
    const sixV = close(six, 57);
    // The three collections named from the key: on the root (X), a half step up (Y), on the 7th degree (Z, the partner).
    const reps = [key, key + 1, key + 11];
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const r of reps) {
      names[`d${dimClass(r)}`] = nm(dimName(r), dimName(r), `${DIM_ROOT[mod12(r)].replace('♭', ' flat').replace('♯', ' sharp')} diminished`);
      choiceStim[`d${dimClass(r)}`] = [chordStim(sixV, 1), chordStim(nearVoicing(dimPcs(r), sixV), 1.3)];
    }
    const choices = shuffleR(rnd, reps.map((r) => `d${dimClass(r)}`));
    const base = { id, topic: 'bh-three-dim', level, seed, skill: 'chords' as const };
    if (level === 1) {
      return choiceQ({
        ...base, difficulty: 1300,
        ask: { en: `Which diminished makes the scale with ${sixName}?`, he: `איזה דימיניש בונה את הסולם עם ${sixName}?` },
        text: { en: `${sixName} + ?°7`, he: `${sixName} + ?°7` },
        names, answer: `d${partnerClass(key)}`, choices, stimulus: [chordStim(sixV, 1.4)], choiceStim,
      });
    }
    if (level === 2) {
      // Cm6 = C°7 with G♭ raised to G: the diminished on the root (§ג.3, Barry's m6 rule — the root is a 4th above the raised note).
      return choiceQ({
        ...base, difficulty: 1320,
        ask: { en: `Raise one note of which diminished to get ${sixName}?`, he: `מאיזה דימיניש, בהרמת צליל אחד, מקבלים ${sixName}?` },
        text: { en: `?°7 → ${sixName}`, he: `?°7 → ${sixName}` },
        names, answer: `d${dimClass(key)}`, choices, stimulus: [chordStim(sixV, 1.4)],
        choiceStim: Object.fromEntries(reps.map((r) => [`d${dimClass(r)}`, [chordStim(nearVoicing(dimPcs(r), sixV), 1)]])),
      });
    }
    if (level === 3) {
      const answer = minor ? 'msix' : 'six';
      const pool = minor ? ['msix', 'six', 'octa', 'dorbebop'] : ['six', 'msix', 'octa', 'bebop'];
      const opts = shuffleR(rnd, pool);
      const sc: Names = {};
      for (const o of opts) sc[o] = SCALES_6DIM[o].n;
      const t0 = 60 + key > 66 ? 48 + key : 60 + key;
      return choiceQ({
        ...base, difficulty: 1350,
        ask: { en: `${sixName} and ${dimName(key + 11)} together: which scale?`, he: `${sixName} ו־${dimName(key + 11)} יחד: איזה סולם?` },
        text: { en: `${sixName} + ${dimName(key + 11)}`, he: `${sixName} + ${dimName(key + 11)}` },
        names: sc, answer, choices: opts, stimulus: [chordStim(sixV, 1), chordStim(nearVoicing(dimPcs(key + 11), sixV), 1)],
        choiceStim: Object.fromEntries(opts.map((o) => [o, [{ kind: 'notes', midis: [...SCALES_6DIM[o].iv, 12].map((x) => t0 + x), each: 0.26 } as Stimulus]])),
      });
    }
    // Level 4 — by ear: a 6th chord, then a diminished. The partner shares no note (every voice moves a step).
    const partner = rnd() < 0.5;
    const r = partner ? key + 11 : pickR(rnd, [key, key + 1]);
    const dimV = nearVoicing(dimPcs(r), sixV);
    const n4: Names = {
      yes: nm('The scale’s diminished', 'הדימיניש של הסולם', 'partner', 'yes', 'the scale'),
      no: nm('Another diminished', 'דימיניש אחר', 'another', 'no', 'other'),
    };
    const other = partner ? nearVoicing(dimPcs(key), sixV) : nearVoicing(dimPcs(key + 11), sixV);
    return choiceQ({
      ...base, difficulty: 1400,
      ask: { en: 'A 6th chord, then a diminished. Is it the scale’s own?', he: 'אקורד 6 ואז דימיניש. זה הדימיניש של הסולם?' },
      names: n4, answer: partner ? 'yes' : 'no', choices: ['yes', 'no'],
      stimulus: [chordStim(sixV, 1.2), rest(0.15), chordStim(dimV, 1.5)],
      choiceStim: { [partner ? 'yes' : 'no']: [chordStim(sixV, 0.9), chordStim(dimV, 1.2)], [partner ? 'no' : 'yes']: [chordStim(sixV, 0.9), chordStim(other, 1.2)] },
    });
  },
};
TOPIC_TAGS['bh-three-dim'] = tg(['chords', 'barry', 1]);

// ================================================================ bh-dim-roles (BH-B, BH-C)

/** Progressions with one diminished chord, by its position (1-based). */
const WHERE: { at: number; ch: (keyof typeof BH)[] }[] = [
  { at: 2, ch: ['I6', 'sI', 'ii7', 'V7', 'I6'] },
  { at: 3, ch: ['I6', 'ii7', 'sii', 'I6_3', 'V7', 'I6'] },
  { at: 3, ch: ['I6', 'IV6', 'sIV', 'I6_5', 'V7', 'I6'] },
  { at: 3, ch: ['I6', 'iii7', 'bIII', 'ii7', 'V7', 'I6'] },
  { at: 4, ch: ['I6', 'IV6', 'ii7', 'sii', 'I6_3', 'V7', 'I6'] },
  { at: 4, ch: ['I6', 'vi7', 'IV6', 'sIV', 'I6_5', 'V7', 'I6'] },
  { at: 4, ch: ['I6', 'IV6', 'iii7', 'bIII', 'ii7', 'V7', 'I6'] },
];
/** Passing diminished chords, the bass moving up or down by half steps (with the tonic first for the key). */
export const PASSING: { dir: 'up' | 'down'; via: string; ch: (keyof typeof BH)[] }[] = [
  { dir: 'up', via: 'i-ii', ch: ['I6', 'sI', 'ii7'] },
  { dir: 'up', via: 'ii-iii', ch: ['I6', 'ii7', 'sii', 'I6_3'] },
  { dir: 'up', via: 'iv-v', ch: ['I6', 'IV6', 'sIV', 'I6_5'] },
  { dir: 'down', via: 'iii-ii', ch: ['I6', 'I6_3', 'bIII', 'ii7'] },
  { dir: 'down', via: 'iii-ii', ch: ['I6', 'iii7', 'bIII', 'ii7'] },
  // G → G♭ → F: the same diminished as ♯IV°7, reached from above (k-sixdim 5, the bass down).
  { dir: 'down', via: 'v-iv', ch: ['I6', 'I6_5', 'sIV', 'IV6'] },
];
/** Passing / auxiliary (common-tone: the bass holds and the chord comes back) / dominant (vii°7 standing in for V). */
export const ROLE: { role: 'passing' | 'aux' | 'dom'; ch: (keyof typeof BH)[] }[] = [
  { role: 'passing', ch: ['I6', 'sI', 'ii7'] },
  { role: 'passing', ch: ['I6', 'ii7', 'sii', 'I6_3'] },
  { role: 'passing', ch: ['I6', 'IV6', 'sIV', 'I6_5'] },
  { role: 'aux', ch: ['I6', 'Idim', 'I6'] },
  { role: 'aux', ch: ['I6', 'IV6', 'IVdim', 'IV6'] },
  { role: 'dom', ch: ['I6', 'ii7', 'vii', 'I6'] },
  { role: 'dom', ch: ['I6', 'IV6', 'vii', 'I6'] },
];
/** Which passage (k-sixdim 5): named by the chords around the diminished, as Roman numerals. */
const VIA: Record<string, { ch: (keyof typeof BH)[]; n: ReturnType<typeof nm> }> = {
  'i-ii': { ch: ['I6', 'sI', 'ii7', 'V7', 'I6'], n: nm('I6 → ♯I°7 → ii7', 'I6 → ♯I°7 → ii7', 'sharp one') },
  'ii-iii': { ch: ['I6', 'ii7', 'sii', 'I6_3', 'V7', 'I6'], n: nm('ii7 → ♯ii°7 → I6/3', 'ii7 → ♯ii°7 → I6/3', 'sharp two') },
  'iv-v': { ch: ['I6', 'IV6', 'sIV', 'I6_5', 'V7', 'I6'], n: nm('IV6 → ♯IV°7 → I6/5', 'IV6 → ♯IV°7 → I6/5', 'sharp four') },
  'iii-ii': { ch: ['I6', 'I6_3', 'bIII', 'ii7', 'V7', 'I6'], n: nm('I6/3 → ♭III°7 → ii7', 'I6/3 → ♭III°7 → ii7', 'flat three') },
};

TOPIC_GEN['bh-dim-roles'] = {
  title: { en: 'Barry Harris: the diminished in the progression', he: 'בארי האריס: הדימיניש בתוך המהלך' },
  skill: 'chords',
  levels: [
    { en: 'Where is the diminished?', he: 'איפה הדימיניש?' },
    { en: 'Passing up or down?', he: 'עובר בעלייה או בירידה?' },
    { en: 'Passing, auxiliary or dominant?', he: 'עובר, עזר או דומיננטי?' },
    { en: 'Which passing diminished?', he: 'איזה דימיניש עובר?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'bh-dim-roles', level, seed, skill: 'chords' as const };
    const P = (ks: (keyof typeof BH)[], bpm?: number) => bhProg(ks.map((k) => BH[k]), key, bpm);
    if (level === 1) {
      const t = pickR(rnd, WHERE);
      const names: Names = {
        p2: nm('2nd chord', 'האקורד השני', 'second', 'two'),
        p3: nm('3rd chord', 'האקורד השלישי', 'third', 'three'),
        p4: nm('4th chord', 'האקורד הרביעי', 'fourth', 'four'),
      };
      return choiceQ({
        ...base, difficulty: 1330,
        ask: { en: 'Which chord is the diminished?', he: 'איזה אקורד הוא הדימיניש?' },
        names, answer: `p${t.at}`, choices: ['p2', 'p3', 'p4'], stimulus: [P(t.ch)],
        choiceStim: Object.fromEntries([2, 3, 4].map((k) => [`p${k}`, [P(WHERE.find((w) => w.at === k)!.ch)]])),
      });
    }
    if (level === 2) {
      const t = pickR(rnd, PASSING);
      const names: Names = { up: nm('Passing up', 'עובר בעלייה', 'up', 'rising'), down: nm('Passing down', 'עובר בירידה', 'down', 'falling') };
      const other = PASSING.find((p) => p.dir !== t.dir)!;
      return choiceQ({
        ...base, difficulty: 1360,
        ask: { en: 'The bass passes through a diminished. Up or down?', he: 'הבס עובר דרך דימיניש. בעלייה או בירידה?' },
        names, answer: t.dir, choices: ['up', 'down'], stimulus: [P(t.ch)],
        choiceStim: { [t.dir]: [P(t.ch)], [other.dir]: [P(other.ch)] },
      });
    }
    if (level === 3) {
      const t = pickR(rnd, ROLE);
      const names: Names = {
        passing: nm('Passing', 'עובר', 'passing'),
        aux: nm('Auxiliary', 'עזר', 'auxiliary', 'neighbour', 'common tone'),
        dom: nm('Dominant', 'דומיננטי', 'dominant', 'leading tone'),
      };
      const pick = (r: string) => ROLE.find((x) => x.role === r)!.ch;
      return choiceQ({
        ...base, difficulty: 1400,
        ask: { en: 'What does the diminished do here?', he: 'מה הדימיניש עושה כאן?' },
        names, answer: t.role, choices: ['passing', 'aux', 'dom'], stimulus: [P(t.ch)],
        choiceStim: { passing: [P(pick('passing'))], aux: [P(pick('aux'))], dom: [P(pick('dom'))] },
      });
    }
    const via = pickR(rnd, Object.keys(VIA));
    const opts = shuffleR(rnd, Object.keys(VIA));
    const names: Names = {};
    for (const o of opts) names[o] = VIA[o].n;
    return choiceQ({
      ...base, difficulty: 1450,
      ask: { en: 'Where does the diminished pass?', he: 'איפה עובר הדימיניש?' },
      names, answer: via, choices: opts, stimulus: [P(VIA[via].ch)],
      choiceStim: Object.fromEntries(opts.map((o) => [o, [P(VIA[o].ch)]])),
    });
  },
};
TOPIC_TAGS['bh-dim-roles'] = tg(['chords', 'barry', 1]);

// ================================================================ bh-m6-bass (BH-E)

/** The three names of one minor-6th shape by its bass (§ג.2 item 4): Cm6 = Am7♭5 = F9 without the root. */
export const M6_BASS: { k: 'm6' | 'hd' | 'nine'; off: number; q: string; say: string }[] = [
  { k: 'm6', off: 0, q: 'm6', say: 'minor six' },
  { k: 'hd', off: 9, q: 'm7♭5', say: 'half diminished' },
  { k: 'nine', off: 5, q: '9', say: 'nine' },
];
const sayRoot = (pc: number) => ROOT[mod12(pc)].replace('♭', ' flat').replace('♯', ' sharp');

TOPIC_GEN['bh-m6-bass'] = {
  title: { en: 'Barry Harris: minor 6 = m7♭5 = 9 without the root', he: 'בארי האריס: מינור 6 = m7♭5 = 9 בלי יסוד' },
  skill: 'chords',
  levels: [
    { en: 'By ear: one shape over three basses', he: 'בשמיעה: צורה אחת מעל שלושה בסים' },
    { en: 'On paper: which minor 6th is it?', he: 'בכתב: איזה מינור 6 זה?' },
    { en: 'By ear, no reference: which chord?', he: 'בשמיעה, בלי נקודת ייחוס: איזה אקורד?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'bh-m6-bass', level, seed, skill: 'chords' as const };
    const m6 = sixPcs(key, true);
    if (level === 3) {
      // The shape and its bass at once, no m6 first: the bass's place under the shape names the chord.
      const v = nearVoicing(m6, null, 57, 77, pickR(rnd, [68, 70, 72, 74, 76]));
      const low = (pc: number) => 36 + mod12(pc - 36) + (mod12(pc) < 4 ? 12 : 0);
      const pick = pickR(rnd, M6_BASS);
      const names: Names = {
        m6: nm('Minor 6 (bass on the root)', 'מינור 6 (הבס על היסוד)', 'minor six'),
        hd: nm('m7♭5 (bass a minor 3rd below)', 'm7♭5 (הבס טרצה קטנה מתחת)', 'half diminished'),
        nine: nm('9 (bass a 5th below)', '9 (הבס קווינטה מתחת)', 'nine'),
      };
      return choiceQ({
        ...base, difficulty: 1450,
        ask: { en: 'A minor-6th shape over a bass. Which chord?', he: 'צורת מינור 6 מעל בס. איזה אקורד?' },
        names, answer: pick.k, choices: ['m6', 'hd', 'nine'],
        stimulus: [chordStim([low(key + pick.off), ...v], 2)],
        choiceStim: Object.fromEntries(M6_BASS.map((b) => [b.k, [chordStim([low(key + b.off), ...v], 1.5)]])),
      });
    }
    if (level === 1) {
      const v = nearVoicing(m6, null, 57, 77, pickR(rnd, [70, 72, 74]));
      const low = (pc: number) => 36 + mod12(pc - 36) + (mod12(pc) < 4 ? 12 : 0);
      const pick = pickR(rnd, M6_BASS);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const b of M6_BASS) {
        const r = key + b.off;
        names[b.k] = nm(`${ROOT[mod12(r)]}${b.q}`, `${ROOT[mod12(r)]}${b.q}`, `${sayRoot(r)} ${b.say}`);
        choiceStim[b.k] = [chordStim([low(r), ...v], 1.4)];
      }
      return choiceQ({
        ...base, difficulty: 1400,
        ask: { en: `${ROOT[key]}m6 over a new bass. Which chord is it?`, he: `${ROOT[key]}m6 מעל בס חדש. איזה אקורד זה?` },
        names, answer: pick.k, choices: shuffleR(rnd, M6_BASS.map((b) => b.k)),
        stimulus: [chordStim(v, 1.1), rest(0.2), chordStim([low(key + pick.off), ...v], 1.8)], choiceStim,
      });
    }
    // Level 2 — on paper, both ways: a 9 chord without its root is the m6 on its 5th; m7♭5 is the m6 a minor 3rd up;
    // an m6 is the m7♭5 a minor 3rd down and the 9 chord a 5th down.
    const form = pickR(rnd, ['nine', 'hd', 'toHd', 'toNine'] as const);
    const r = key;
    let ask: { en: string; he: string };
    let answer: number;
    let offs: number[];
    let q: string;
    let say: string;
    let shown: string;
    if (form === 'nine') {
      ask = { en: `${ROOT[r]}9 without its root = which minor 6th?`, he: `${ROOT[r]}9 בלי היסוד = איזה מינור 6?` };
      shown = `${ROOT[r]}9 − ${ROOT[r]}`;
      answer = r + 7;
      offs = [7, 0, 2, 9];
      q = 'm6';
      say = 'minor six';
    } else if (form === 'hd') {
      ask = { en: `${ROOT[r]}m7♭5 has the notes of which minor 6th?`, he: `ל־${ROOT[r]}m7♭5 יש את הצלילים של איזה מינור 6?` };
      shown = `${ROOT[r]}m7♭5 = ?m6`;
      answer = r + 3;
      offs = [3, 0, 9, 7];
      q = 'm6';
      say = 'minor six';
    } else if (form === 'toHd') {
      ask = { en: `${ROOT[r]}m6 has the notes of which m7♭5?`, he: `ל־${ROOT[r]}m6 יש את הצלילים של איזה m7♭5?` };
      shown = `${ROOT[r]}m6 = ?m7♭5`;
      answer = r + 9;
      offs = [9, 0, 3, 5];
      q = 'm7♭5';
      say = 'half diminished';
    } else {
      ask = { en: `${ROOT[r]}m6 is which 9 chord without its root?`, he: `${ROOT[r]}m6 הוא איזה אקורד 9 בלי היסוד?` };
      shown = `${ROOT[r]}m6 = ?9`;
      answer = r + 5;
      offs = [5, 0, 7, 10];
      q = '9';
      say = 'nine';
    }
    const opts = shuffleR(rnd, offs.map((o) => mod12(r + o)));
    const names: Names = {};
    for (const o of opts) names[`r${o}`] = nm(`${ROOT[o]}${q}`, `${ROOT[o]}${q}`, `${sayRoot(o)} ${say}`);
    return choiceQ({
      ...base, difficulty: 1420, ask,
      text: { en: shown, he: shown },
      names, answer: `r${mod12(answer)}`, choices: opts.map((o) => `r${o}`), stimulus: [],
    });
  },
};
TOPIC_TAGS['bh-m6-bass'] = tg(['chords', 'barry', 1]);
