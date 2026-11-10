// 0.38 topics (spec AE §4.7 and §10.3): pitch and voice — deeper levels for maqam, scale-types, degrees-ext,
// chord-scale, transpose-adv, mood and the Barry Harris trio (bh-keys, bh-tone, bh-pivot), and the new topic
// sing-intervals (sing an interval, an arpeggio, the roots of a progression).
// Deeper levels WRAP the base topics (never edit their files); the base modules are imported first.

import './topicsEar'; // maqam
import './topicsAD'; // scale-types, mood
import './topicsSkills'; // degrees-ext
import './topicsTheory'; // chord-scale
import './basics'; // transpose-adv
import type { ChoiceQuestion, NoteEvent, SingQuestion, SingSeqQuestion, Stimulus } from './lesson';
import { marker, placeInRange } from './lesson';
import { majorScale, pc, pcValue, type PitchClass } from './pitch';
import { barryLine, pivot } from './barry';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm, pcName, pcNameHe, type TopicDef, type TopicItem } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Names = ChoiceQuestion['names'];
type Lv = { en: string; he: string };

const N = (midi: number, start: number, duration: number, velocity: number): NoteEvent => ({ midi, start, duration, velocity });
const ev = (events: NoteEvent[], length: number): Stimulus => eventsStim(events, length);
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });

/** Add levels to a registered topic: levels past the base's go to `more` (level counted from 1 again). */
function deepen(id: string, levels: Lv[], more: (seed: number, level: number, id: string) => TopicItem): void {
  const wrap = (base: TopicDef): TopicDef => {
    const baseN = base.levels.length;
    return { ...base, levels: [...base.levels, ...levels], gen: (seed, level, qid) => (level <= baseN ? base.gen(seed, level, qid) : more(seed, level - baseN, qid)) };
  };
  if (TOPIC_GEN[id]) {
    TOPIC_GEN[id] = wrap(TOPIC_GEN[id]);
    return;
  }
  // The Barry Harris topics are registered in topics.ts itself, which imports this file first: wrap them the
  // moment they are registered (the property turns back into a plain value).
  Object.defineProperty(TOPIC_GEN, id, {
    configurable: true,
    enumerable: true,
    get: () => undefined,
    set(base: TopicDef) {
      Object.defineProperty(TOPIC_GEN, id, { value: wrap(base), writable: true, enumerable: true, configurable: true });
    },
  });
}

// ======================================================================= maqam 4–6

const MQ: Record<string, { steps: number[]; name: ReturnType<typeof nm> }> = {
  rast: { steps: [0, 2, 3.5, 5, 7, 9, 10.5, 12], name: nm('Rast', 'ראסט', 'rast', 'ראסט') },
  bayati: { steps: [0, 1.5, 3, 5, 7, 8, 10, 12], name: nm('Bayati', 'ביאתי', 'bayati', 'bayat', 'ביאת') },
  saba: { steps: [0, 1.5, 3, 4, 7, 8, 10, 12], name: nm('Saba', 'סבא', 'saba', 'סאבא') },
  sikah: { steps: [0, 1.5, 3.5, 5.5, 7, 8.5, 10.5, 12], name: nm('Sikah', 'סיקה', 'sikah', 'segah', 'סיגה') },
  hijaz: { steps: [0, 1, 4, 5, 7, 8, 10, 12], name: nm('Hijaz', 'חיג׳אז', 'hijaz', 'hejaz', 'חג׳אז') },
  nahawand: { steps: [0, 2, 3, 5, 7, 8, 11, 12], name: nm('Nahawand', 'נהוונד', 'nahawand', 'nahawand minor', 'נאהוונד') },
  kurd: { steps: [0, 1, 3, 5, 7, 8, 10, 12], name: nm('Kurd', 'כורד', 'kurd', 'kurdi', 'כורדי') },
  ajam: { steps: [0, 2, 4, 5, 7, 9, 11, 12], name: nm('Ajam', 'עג׳ם', 'ajam', 'אג׳ם') },
  // Level 4: Sikah family and the double-Hijaz maqamat.
  huzam: { steps: [0, 1.5, 3.5, 4.5, 7.5, 8.5, 10.5, 12], name: nm('Huzam', 'הוזאם', 'huzam', 'huzzam', 'הוזם') },
  nawaathar: { steps: [0, 2, 3, 6, 7, 8, 11, 12], name: nm('Nawa Athar', 'נווא אתר', 'nawa athar', 'nawathar', 'נוואתר') },
  shahnaz: { steps: [0, 1, 4, 5, 7, 8, 11, 12], name: nm('Shahnaz', 'שהנאז', 'shahnaz', 'שהנז') },
};
const MQ_TONIC: Record<string, number> = { huzam: 63.5, nawaathar: 60, shahnaz: 62, kurd: 62 };
/** Sayr (level 6): where a maqam on its usual tonic commonly moves, with the new tonic. */
const SAYR: Record<string, { tonic: number; to: [string, number][] }> = {
  rast: { tonic: 60, to: [['bayati', 62], ['hijaz', 62], ['saba', 62], ['nahawand', 67], ['ajam', 65], ['sikah', 63.5]] },
  bayati: { tonic: 62, to: [['rast', 60], ['hijaz', 62], ['saba', 62], ['nahawand', 67], ['ajam', 65], ['kurd', 62]] },
};
const THIRDS: Record<string, { s: number; name: ReturnType<typeof nm> }> = {
  neutral: { s: 3.5, name: nm('Neutral third (a quarter tone between)', 'טרצה נייטרלית (רבע טון באמצע)', 'neutral', 'quarter tone', 'נייטרלית', 'רבע טון') },
  major: { s: 4, name: nm('Major third', 'טרצה גדולה', 'major', 'גדולה') },
  minor: { s: 3, name: nm('Minor third', 'טרצה קטנה', 'minor', 'קטנה') },
};

deepen(
  'maqam',
  [
    { en: 'Huzam, Nawa Athar, Shahnaz, Kurd', he: 'הוזאם, נווא אתר, שהנאז, כורד' },
    { en: 'Neutral, major or minor third? (quarter tones)', he: 'טרצה נייטרלית, גדולה או קטנה? (רבעי טונים)' },
    { en: 'Sayr: which maqam did it move to?', he: 'סייר: לאיזה מקאם המנגינה עברה?' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const level = l + 3;
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    if (l === 1) {
      const pool = ['huzam', 'nawaathar', 'shahnaz', 'kurd'];
      const answer = pickR(rnd, pool);
      const play = (k: string): Stimulus[] => {
        const m = MQ[k].steps.map((s) => MQ_TONIC[k] + s);
        return [notesStim(m, 0.32), notesStim(m.slice().reverse().slice(1), 0.32)];
      };
      for (const k of pool) {
        names[k] = MQ[k].name;
        choiceStim[k] = play(k);
      }
      return choiceQ({ id, topic: 'maqam', level, seed, skill: 'modes', difficulty: 1820, ask: { en: 'Which maqam?', he: 'איזה מקאם?' }, names, answer, choices: shuffleR(rnd, pool), stimulus: play(answer), choiceStim });
    }
    if (l === 2) {
      const pool = ['neutral', 'major', 'minor'];
      const answer = pickR(rnd, pool);
      const t = 58 + Math.floor(rnd() * 6);
      // The jins around the third (tonic, second, third, second, tonic), then the third alone and together.
      const play = (k: string): Stimulus[] => {
        const x = THIRDS[k].s;
        return [notesStim([t, t + 2, t + x, t + 2, t], 0.36), rest(0.25), notesStim([t, t + x], 0.6), chordStim([t, t + x], 1.4)];
      };
      for (const k of pool) {
        names[k] = THIRDS[k].name;
        choiceStim[k] = play(k);
      }
      return choiceQ({ id, topic: 'maqam', level, seed, skill: 'modes', difficulty: 1850, ask: { en: 'Which third: neutral, major or minor?', he: 'איזו טרצה: נייטרלית, גדולה או קטנה?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
    }
    // Level 6: sayr — a phrase in one maqam that moves to another.
    const from = pickR(rnd, Object.keys(SAYR));
    const S = SAYR[from];
    const [answer] = pickR(rnd, S.to);
    const pool = shuffleR(rnd, [answer, ...shuffleR(rnd, S.to.map(([k]) => k).filter((k) => k !== answer)).slice(0, 3)]);
    const shape = [0, 1, 2, 3, 4, 3, 2, 1, 0];
    const each = 0.3;
    const play = (k: string): Stimulus[] => {
      const to = S.to.find(([x]) => x === k)![1];
      const out: NoteEvent[] = [];
      let t = 0;
      shape.forEach((i, n) => {
        const last = n === shape.length - 1;
        out.push(N(S.tonic + MQ[from].steps[i], t, last ? 0.6 : each * 0.95, 0.75));
        t += last ? 0.75 : each;
      });
      shape.forEach((i, n) => {
        const last = n === shape.length - 1;
        out.push(N(to + MQ[k].steps[i], t, last ? 0.9 : each * 0.95, 0.75));
        t += last ? 1 : each;
      });
      return [ev(out, t + 0.1)];
    };
    for (const k of pool) {
      names[k] = MQ[k].name;
      choiceStim[k] = play(k);
    }
    return choiceQ({
      id, topic: 'maqam', level, seed, skill: 'modes', difficulty: 1900,
      ask: { en: `It starts in ${MQ[from].name.en}. Which maqam does it move to?`, he: `זה מתחיל ב${MQ[from].name.he}. לאיזה מקאם זה עובר?` },
      names, answer, choices: pool, stimulus: play(answer), choiceStim,
    });
  },
);

// ======================================================================= scale-types 4–5

const SC2: Record<string, { steps: number[]; name: ReturnType<typeof nm> }> = {
  melMin: { steps: [0, 2, 3, 5, 7, 9, 11, 12], name: nm('Melodic minor', 'מינור מלודי', 'melodic minor', 'jazz minor', 'מלודי') },
  wholeTone: { steps: [0, 2, 4, 6, 8, 10, 12], name: nm('Whole tone', 'טון שלם', 'whole tone', 'טונים שלמים') },
  dimWH: { steps: [0, 2, 3, 5, 6, 8, 9, 11, 12], name: nm('Diminished (whole–half)', 'דימיניש (שלם–חצי)', 'diminished', 'octatonic', 'דימיניש') },
  bebopMaj: { steps: [0, 2, 4, 5, 7, 8, 9, 11, 12], name: nm('Bebop major', 'ביבופ מז׳ורי', 'bebop major', 'ביבופ מז׳ור') },
  bebopDom: { steps: [0, 2, 4, 5, 7, 9, 10, 11, 12], name: nm('Bebop dominant', 'ביבופ דומיננטי', 'bebop dominant', 'ביבופ דומיננט') },
};

deepen(
  'scale-types',
  [
    { en: 'Melodic minor, whole tone or diminished?', he: 'מינור מלודי, טון שלם או דימיניש?' },
    { en: 'Bebop major or bebop dominant?', he: 'ביבופ מז׳ורי או ביבופ דומיננטי?' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const pool = l === 1 ? ['melMin', 'wholeTone', 'dimWH'] : ['bebopMaj', 'bebopDom'];
    const answer = pickR(rnd, pool);
    const t = pickR(rnd, [57, 60, 62, 64]);
    // Up, then down: the bebop scales are made for coming down.
    const play = (k: string): Stimulus[] => {
      const m = SC2[k].steps.map((s) => t + s);
      return l === 1 ? [notesStim(m, 0.3)] : [notesStim(m, 0.26), notesStim(m.slice().reverse().slice(1), 0.26)];
    };
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = SC2[k].name;
      choiceStim[k] = play(k);
    }
    return choiceQ({ id, topic: 'scale-types', level: l + 3, seed, skill: 'modes', difficulty: l === 1 ? 1450 : 1550, ask: { en: 'Which scale?', he: 'איזה סולם?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
  },
);

// ======================================================================= degrees-ext 3–4

const MODE_DEG: Record<'dorian' | 'mixolydian', { steps: number[]; labels: string[] }> = {
  dorian: { steps: [0, 2, 3, 5, 7, 9, 10], labels: ['1', '2', '♭3', '4', '5', '6', '♭7'] },
  mixolydian: { steps: [0, 2, 4, 5, 7, 9, 10], labels: ['1', '2', '3', '4', '5', '6', '♭7'] },
};
const DEG_SAY: Record<string, string[]> = {
  '1': ['one'], '2': ['two'], '3': ['three'], '4': ['four'], '5': ['five'], '6': ['six'], '7': ['seven'],
  '♭2': ['flat two'], '♭3': ['flat three', 'minor three'], '♮3': ['natural three', 'major three'], '♯4': ['sharp four', 'flat five'],
  '♭6': ['flat six'], '♮6': ['natural six', 'major six'], '♭7': ['flat seven'],
};
/** A triad on `root` (folded into t…t+11), bass an octave below. */
const triad = (t: number, rootOff: number, minor: boolean): number[] => {
  const r = t + (((rootOff % 12) + 12) % 12);
  return [r - 12, ...[r + (minor ? 3 : 4), r + 7].map((m) => (m > t + 14 ? m - 12 : m))];
};
const MINOR_CHROM = [
  { d: '♭2', s: 1, chrom: true },
  { d: '♮3', s: 4, chrom: true },
  { d: '♯4', s: 6, chrom: true },
  { d: '♮6', s: 9, chrom: true },
  { d: '2', s: 2, chrom: false },
  { d: '♭3', s: 3, chrom: false },
  { d: '4', s: 5, chrom: false },
  { d: '5', s: 7, chrom: false },
  { d: '♭6', s: 8, chrom: false },
  { d: '♭7', s: 10, chrom: false },
];

deepen(
  'degrees-ext',
  [
    { en: 'Degrees in Dorian and Mixolydian', he: 'דרגות בדורי ובמיקסולידי' },
    { en: 'Chromatic degrees in minor (♭2, ♮3, ♯4, ♮6)', he: 'דרגות כרומטיות במינור (♭2, ♮3, ♯4, ♮6)' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const t = 55 + Math.floor(rnd() * 7);
    const names: Names = {};
    if (l === 1) {
      const mode = rnd() < 0.5 ? 'dorian' : 'mixolydian';
      const M = MODE_DEG[mode];
      // The vamp that makes the mode: i–IV (Dorian) or I–♭VII (Mixolydian).
      const one = triad(t, 0, mode === 'dorian');
      const other = mode === 'dorian' ? triad(t, 5, false) : triad(t, 10, false);
      const vamp: Stimulus[] = [one, other, one, other, one].map((c, i) => chordStim(c, i === 4 ? 1.1 : 0.6));
      const d = Math.floor(rnd() * 7);
      const others = shuffleR(rnd, [0, 1, 2, 3, 4, 5, 6].filter((x) => x !== d)).slice(0, 3);
      const pool = [d, ...others].sort((a, b) => a - b);
      for (const k of pool) names[`d${k + 1}`] = nm(M.labels[k], M.labels[k], ...DEG_SAY[M.labels[k]]);
      const modeName = mode === 'dorian' ? { en: 'Dorian', he: 'דורי' } : { en: 'Mixolydian', he: 'מיקסולידי' };
      return choiceQ({
        id, topic: 'degrees-ext', level: 3, seed, skill: 'degrees', difficulty: 1520,
        ask: { en: `A ${modeName.en} vamp, then a note — which degree?`, he: `וואמפ ב${modeName.he}, ואז צליל — איזו דרגה?` },
        names, answer: `d${d + 1}`, choices: pool.map((k) => `d${k + 1}`),
        stimulus: [...vamp, rest(0.3), { kind: 'note', midi: t + M.steps[d], duration: 1.4 }],
      });
    }
    // Level 4: a minor cadence (i iv V i), then a note that may be chromatic.
    const cad: Stimulus[] = [chordStim([t - 12, t + 3, t + 7], 0.7), chordStim([t - 7, t + 5, t + 8], 0.7), chordStim([t - 5, t + 4, t + 7, t + 10], 0.7), chordStim([t - 12, t + 3, t + 7], 1.1), rest(0.3)];
    const chrom = MINOR_CHROM.filter((c) => c.chrom);
    const dia = MINOR_CHROM.filter((c) => !c.chrom);
    const ans = rnd() < 0.65 ? pickR(rnd, chrom) : pickR(rnd, dia);
    const rest3 = shuffleR(rnd, [...shuffleR(rnd, chrom.filter((c) => c !== ans)).slice(0, 2), ...shuffleR(rnd, dia.filter((c) => c !== ans)).slice(0, 1)]);
    const pool = [ans, ...rest3].sort((a, b) => a.s - b.s);
    for (const c of pool) names[`s${c.s}`] = nm(c.d, c.d, ...DEG_SAY[c.d]);
    return choiceQ({
      id, topic: 'degrees-ext', level: 4, seed, skill: 'degrees', difficulty: 1580,
      ask: { en: 'In this minor key — which degree? It may be chromatic.', he: 'בסולם המינורי הזה — איזו דרגה? היא יכולה להיות כרומטית.' },
      names, answer: `s${ans.s}`, choices: pool.map((c) => `s${c.s}`),
      stimulus: [...cad, { kind: 'note', midi: t + ans.s, duration: 1.4 }],
    });
  },
);

// ======================================================================= chord-scale 3

/** The modes of melodic minor and the chord each one goes with (symbols keep the root in the prompt). */
const MM: Record<string, { sym: string; tones: number[]; name: ReturnType<typeof nm> }> = {
  melmin: { sym: 'm(maj7)', tones: [0, 3, 7, 11, 14], name: nm('Melodic minor', 'מינור מלודי', 'melodic minor', 'jazz minor') },
  lydaug: { sym: 'maj7♯5', tones: [0, 4, 8, 11, 18], name: nm('Lydian augmented', 'לידי מוגדל', 'lydian augmented', 'lydian sharp five') },
  lydom: { sym: '7♯11', tones: [0, 4, 10, 14, 18], name: nm('Lydian dominant', 'לידי דומיננטי', 'lydian dominant', 'lydian flat seven', 'overtone') },
  mixb6: { sym: '7♭13', tones: [0, 4, 10, 14, 20], name: nm('Mixolydian ♭6', 'מיקסולידי ♭6', 'mixolydian flat six', 'aeolian dominant') },
  locnat2: { sym: 'm7♭5 (9)', tones: [0, 3, 6, 10, 14], name: nm('Locrian ♮2', 'לוקרי ♮2', 'locrian natural two', 'locrian natural nine') },
  altered: { sym: '7alt', tones: [0, 4, 10, 15, 20], name: nm('Altered (super-Locrian)', 'אלטרד (סופר־לוקרי)', 'altered', 'super locrian', 'alt') },
};

deepen('chord-scale', [{ en: 'Melodic-minor chord-scales', he: 'אקורד־סולם ממינור מלודי' }], (seed, _l, id) => {
  const rnd = rng(seed);
  const answer = pickR(rnd, Object.keys(MM));
  const pool = shuffleR(rnd, [answer, ...shuffleR(rnd, Object.keys(MM).filter((k) => k !== answer)).slice(0, 3)]);
  const rootPc = pickR(rnd, [0, 2, 3, 5, 7, 9, 10]);
  const sym = `${pcName(rootPc)}${MM[answer].sym}`;
  const names: Names = {};
  for (const k of pool) names[k] = MM[k].name;
  const base = 48 + rootPc;
  return choiceQ({
    id, topic: 'chord-scale', level: 3, seed, skill: 'theory', difficulty: 1600,
    ask: { en: `${sym} — which mode of melodic minor?`, he: `${sym} — איזה מודוס של המינור המלודי?` },
    text: { en: sym, he: sym },
    names, answer, choices: pool, stimulus: [chordStim(MM[answer].tones.map((s) => base + s), 1.6)],
  });
});

// ======================================================================= transpose-adv 3 (clef transposition)

const LET_EN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LET_HE = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const NAT_STEPS = [0, 2, 4, 5, 7, 9, 11];
/** Same line on the staff, another clef: how many letters the name moves (treble E4 line = alto F, tenor D, bass G). */
const CLEF_SHIFT = { treble: 0, alto: 1, tenor: 6, bass: 2 } as const;
const CLEF_NAME = { alto: { en: 'alto', he: 'דו אלט' }, tenor: { en: 'tenor', he: 'דו טנור' } } as const;

deepen('transpose-adv', [{ en: 'Clef transposition: read treble as alto or tenor', he: 'טרנספוזיציה במפתחות: לקרוא מפתח סול כאילו הוא אלט או טנור' }], (seed, _l, id) => {
  const rnd = rng(seed);
  const target = rnd() < 0.5 ? 'alto' : 'tenor';
  // Four natural notes on the treble staff (D4 … G5), mostly steps.
  const idx: number[] = [1 + Math.floor(rnd() * 8)]; // diatonic index from C4 = 0
  while (idx.length < 4) {
    const n = idx[idx.length - 1] + pickR(rnd, [-2, -1, 1, 1, 2]);
    if (n >= 1 && n <= 11 && n !== idx[idx.length - 1]) idx.push(n);
  }
  const midis = idx.map((i) => 60 + 12 * Math.floor(i / 7) + NAT_STEPS[i % 7]);
  const read = (shift: number) => idx.map((i) => (i + shift) % 7);
  const opts = shuffleR(rnd, (['treble', 'alto', 'tenor', 'bass'] as const).map((c) => ({ c, ls: read(CLEF_SHIFT[c]) })));
  const names: Names = {};
  opts.forEach((o, i) => (names[`o${i + 1}`] = nm(o.ls.map((x) => LET_EN[x]).join(' '), o.ls.map((x) => LET_HE[x]).join(' '), ['one', 'two', 'three', 'four'][i], ['first', 'second', 'third', 'fourth'][i])));
  return choiceQ({
    id, topic: 'transpose-adv', level: 3, seed, skill: 'transpose', difficulty: 1550,
    ask: { en: `Written in treble clef. Read it as if the clef were ${CLEF_NAME[target].en} — which notes?`, he: `כתוב במפתח סול. קראו כאילו זה מפתח ${CLEF_NAME[target].he} — אילו צלילים?` },
    names, answer: `o${opts.findIndex((o) => o.c === target) + 1}`, choices: opts.map((_, i) => `o${i + 1}`),
    stimulus: [], show: { midis, clef: 'treble' },
  });
});
const btTr = TOPIC_TAGS['transpose-adv'];
TOPIC_TAGS['transpose-adv'] = (l) => (l <= 2 ? (typeof btTr === 'function' ? btTr(l) : btTr) : tg(['transpose', 'pitch', 0.6], ['notes', 'staff', 0.4]));

// ======================================================================= mood 3–4

const SCALE = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 11], wt: [0, 2, 4, 6, 8, 10] };
type ScaleId = keyof typeof SCALE;
const degOf = (sc: number[], d: number) => 12 * Math.floor((d - 1) / sc.length) + sc[(((d - 1) % sc.length) + sc.length) % sc.length];

interface MoodSpec {
  sc: ScaleId;
  each: number;
  vel: number;
  /** Note length as a share of the step (0.3 = staccato, > 1 = legato). */
  leg: number;
  oct: number;
  mel: number[];
  /** Chord roots (degrees), one per `per` melody notes; `minorAt` = indexes of chords played minor. */
  chords: number[];
  per: number;
  minorAt?: number[];
  name: ReturnType<typeof nm>;
}
const MOOD8: Record<string, MoodSpec> = {
  joyful: { sc: 'maj', each: 0.18, vel: 0.9, leg: 0.6, oct: 0, mel: [1, 3, 5, 3, 4, 2, 7, 1, 3, 5, 8, 5], chords: [1, 5, 1], per: 4, name: nm('Joyful', 'שמח', 'joyful', 'happy') },
  calm: { sc: 'maj', each: 0.55, vel: 0.28, leg: 1.05, oct: 0, mel: [3, 2, 1, 2, 3, 5, 3, 2], chords: [1, 4], per: 4, name: nm('Calm', 'רגוע', 'calm', 'peaceful') },
  sad: { sc: 'min', each: 0.6, vel: 0.3, leg: 1.05, oct: 0, mel: [5, 3, 2, 1, 2, 3, 2, 7], chords: [1, 5], per: 4, name: nm('Sad', 'עצוב', 'sad') },
  tense: { sc: 'min', each: 0.15, vel: 0.95, leg: 0.6, oct: 0, mel: [1, 2, 3, 2, 1, 7, 1, 2, 3, 4, 3, 2, 1, 7, 1, 7], chords: [1, 5, 1, 5], per: 4, name: nm('Tense', 'מתוח', 'tense', 'angry') },
  majestic: { sc: 'maj', each: 0.42, vel: 0.95, leg: 0.9, oct: -1, mel: [1, 5, 5, 6, 5, 4, 3, 2, 1], chords: [1, 1, 4, 5, 5, 4, 1, 5, 1], per: 1, name: nm('Majestic', 'מלכותי', 'majestic', 'grand', 'royal', 'מפואר') },
  mysterious: { sc: 'wt', each: 0.5, vel: 0.24, leg: 1.1, oct: -1, mel: [1, 2, 3, 4, 3, 2, 5, 4, 3, 2], chords: [1, 2, 1], per: 4, name: nm('Mysterious', 'מסתורי', 'mysterious', 'mystery') },
  playful: { sc: 'maj', each: 0.22, vel: 0.6, leg: 0.3, oct: 1, mel: [1, 5, 3, 8, 5, 3, 6, 4, 2, 5, 7, 8], chords: [1, 4, 5], per: 4, name: nm('Playful', 'שובב', 'playful', 'cheeky', 'משחקי') },
  nostalgic: { sc: 'maj', each: 0.45, vel: 0.45, leg: 1, oct: 0, mel: [5, 3, 2, 1, 6, 5, 6, 4, 2, 6, 5, 3], chords: [1, 6, 4, 4], per: 3, minorAt: [1, 3], name: nm('Nostalgic', 'נוסטלגי', 'nostalgic', 'longing', 'געגוע') },
};

function moodSound(M: MoodSpec, tonic: number): Stimulus {
  const sc = SCALE[M.sc];
  const t = tonic + 12 * M.oct;
  const out: NoteEvent[] = [];
  M.mel.forEach((d, i) => {
    // Nostalgic: the borrowed minor iv colours its melody (♭6).
    const minorChord = M.minorAt?.includes(Math.floor(i / M.per)) && M.chords[Math.floor(i / M.per)] === 4;
    const m = t + degOf(sc, d) - (minorChord && d === 6 ? 1 : 0);
    out.push(N(m, i * M.each, M.each * M.leg, M.vel));
  });
  M.chords.forEach((r, ci) => {
    const start = ci * M.per * M.each;
    const len = Math.min(M.per, M.mel.length - ci * M.per) * M.each;
    if (len <= 0) return;
    const root = t - 12 + degOf(sc, r);
    let tones = [degOf(sc, r), degOf(sc, r + 2), degOf(sc, r + 4)].map((s) => t - 12 + s);
    if (M.minorAt?.includes(ci)) tones = [root, root + 3, root + 7];
    out.push(N(root - 12, start, len * 0.98, M.vel * 0.55));
    for (const m of tones.slice(1)) out.push(N(m, start, len * 0.98, M.vel * 0.45));
  });
  return ev(out, M.mel.length * M.each + 0.5);
}

const SADDER: Record<string, ReturnType<typeof nm>> = {
  mode: nm('Mode (major became minor)', 'סולם (ממז׳ור למינור)', 'mode', 'minor', 'מינור'),
  tempo: nm('Tempo (slower)', 'טמפו (איטי יותר)', 'tempo', 'slower', 'speed', 'איטי'),
  loudness: nm('Loudness (softer)', 'עוצמה (חלש יותר)', 'loudness', 'softer', 'volume', 'dynamics', 'חלש'),
  register: nm('Register (lower)', 'מנעד (נמוך יותר)', 'register', 'lower', 'pitch', 'נמוך'),
};

deepen(
  'mood',
  [
    { en: 'Eight moods (majestic, mysterious, playful, nostalgic …)', he: 'שמונה מצבי רוח (מלכותי, מסתורי, שובב, נוסטלגי…)' },
    { en: 'What made it sadder: mode, tempo, loudness or register?', he: 'מה הפך את זה לעצוב יותר: סולם, טמפו, עוצמה או מנעד?' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [57, 60, 62]);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    if (l === 1) {
      const all = Object.keys(MOOD8);
      const answer = pickR(rnd, all);
      const pool = shuffleR(rnd, [answer, ...shuffleR(rnd, all.filter((k) => k !== answer)).slice(0, 3)]);
      for (const k of pool) {
        names[k] = MOOD8[k].name;
        choiceStim[k] = [moodSound(MOOD8[k], tonic)];
      }
      return choiceQ({ id, topic: 'mood', level: 3, seed, skill: 'expression', difficulty: 900, ask: { en: 'How does this music feel?', he: 'איך המוזיקה הזאת מרגישה?' }, names, answer, choices: pool, stimulus: [moodSound(MOOD8[answer], tonic)], choiceStim });
    }
    // Level 4: one bright phrase, then the same phrase with ONE thing changed.
    const bright: MoodSpec = { sc: 'maj', each: 0.3, vel: 0.75, leg: 0.85, oct: 0, mel: [1, 3, 5, 6, 5, 3, 4, 2, 1], chords: [1, 4, 5], per: 3, name: nm('', '') };
    const change = (k: string): MoodSpec =>
      k === 'mode' ? { ...bright, sc: 'min' } : k === 'tempo' ? { ...bright, each: 0.56 } : k === 'loudness' ? { ...bright, vel: 0.22 } : { ...bright, oct: -1 };
    const pool = ['mode', 'tempo', 'loudness', 'register'];
    const answer = pickR(rnd, pool);
    const pair = (k: string): Stimulus[] => [marker(1), moodSound(bright, tonic), marker(2), moodSound(change(k), tonic)];
    for (const k of pool) {
      names[k] = SADDER[k];
      choiceStim[k] = pair(k);
    }
    return choiceQ({ id, topic: 'mood', level: 4, seed, skill: 'expression', difficulty: 1000, ask: { en: 'The second version sounds sadder. What changed?', he: 'הגרסה השנייה נשמעת עצובה יותר. מה השתנה?' }, names, answer, choices: pool, stimulus: pair(answer), choiceStim });
  },
);

// ======================================================================= Barry Harris: a second level each

const DIM = (r: number) => [r, r + 3, r + 6, r + 9];
const KEY_REL: Names = {
  same: nm('The same key', 'אותו סולם', 'same'),
  up3: nm('A minor third up', 'טרצה קטנה למעלה', 'minor third up', 'up'),
  tritone: nm('A tritone away', 'טריטון', 'tritone'),
  down3: nm('A minor third down', 'טרצה קטנה למטה', 'minor third down', 'down'),
};

// bh-keys 2: any of the three diminished chords, any reference, resolving to major or minor.
deepen('bh-keys', [{ en: 'More keys: any diminished chord, major or minor', he: 'עוד סולמות: כל דימיניש, מז׳ור או מינור' }], (seed, _l, id) => {
  const rnd = rng(seed);
  const root = 58 + Math.floor(rnd() * 3);
  const minor = rnd() < 0.5;
  const resolve = (k: number): Stimulus[] => {
    const dom = DIM(root);
    dom[k] -= 1; // the lowered note is the root of a dominant 7
    const tonic = dom[k] + 5;
    const tonicChord = [tonic - 12, tonic, tonic + (minor ? 3 : 4), tonic + 7].map((m) => (m < 52 ? m + 12 : m > 76 ? m - 12 : m));
    return [chordStim(DIM(root), 0.9), chordStim(dom, 0.9), chordStim(tonicChord, 1.4)];
  };
  const ref = Math.floor(rnd() * 4);
  const k = Math.floor(rnd() * 4);
  const keys = ['same', 'up3', 'tritone', 'down3'];
  const rel = (((k - ref) % 4) + 4) % 4;
  const choiceStim: Record<string, Stimulus[]> = {};
  keys.forEach((kk, i) => (choiceStim[kk] = [...resolve(ref), rest(0.8), ...resolve((ref + i) % 4)]));
  return choiceQ({
    id, topic: 'bh-keys', level: 2, seed, skill: 'cadences', difficulty: 1450,
    ask: { en: `First a resolution to ${minor ? 'minor' : 'major'}, then another from the same diminished chord: where did it go?`, he: `קודם פתרון ל${minor ? 'מינור' : 'מז׳ור'}, ואחר כך עוד אחד מאותו דימיניש: לאן הוא הלך?` },
    names: KEY_REL, answer: keys[rel], choices: keys,
    stimulus: [...resolve(ref), rest(0.8), ...resolve(k)], choiceStim,
  });
});

// bh-tone 2: the 6th-diminished scale runs down and stops — on a note of the 6 chord or of the diminished chord?
deepen('bh-tone', [{ en: 'Descending: where did the run stop?', he: 'בירידה: איפה הריצה נעצרה?' }], (seed, _l, id) => {
  const rnd = rng(seed);
  const t = 55 + Math.floor(rnd() * 8);
  const six = [t, t + 4, t + 7, t + 9];
  const dim = [t - 1, t + 2, t + 5, t + 8];
  const run = [12, 11, 9, 8, 7, 5, 4, 2, 0].map((s) => t + s);
  const n = 3 + Math.floor(rnd() * 6); // 3…8 notes
  const line = run.slice(0, n);
  const last = line[line.length - 1];
  const fromSix = [0, 4, 7, 9].includes((((last - t) % 12) + 12) % 12);
  const out: NoteEvent[] = line.map((m, i) => N(m, i * 0.28, i === line.length - 1 ? 1.2 : 0.26, 0.78));
  return choiceQ({
    id, topic: 'bh-tone', level: 2, seed, skill: 'chords', difficulty: 1300,
    ask: { en: 'The scale runs down and stops. Whose note?', he: 'הסולם יורד ונעצר. צליל של איזה אקורד?' },
    names: { six: nm('The 6 chord', 'אקורד ה־6', 'six', 'sixth', 'major six', 'שש'), dim: nm('The diminished chord', 'הדימיניש', 'diminished', 'dim', 'דימיניש', 'מוקטן') },
    answer: fromSix ? 'six' : 'dim', choices: ['six', 'dim'],
    stimulus: [chordStim(six, 1), chordStim(dim, 1), rest(0.4), ev(out, line.length * 0.28 + 1.1)],
    choiceStim: { six: [chordStim([...six, last])], dim: [chordStim([...dim, last])] },
  });
});

// bh-pivot 2: name the note the line jumped to.
deepen('bh-pivot', [{ en: 'Name the note it jumped to', he: 'מה שם הצליל שאליו הקו קפץ?' }], (seed, _l, id) => {
  const rnd = rng(seed);
  const root = 55 + Math.floor(rnd() * 6);
  const line = barryLine(1, 'one'); // 9 notes: 12 11 10 9 7 5 4 2 0
  const at = 2 + Math.floor(rnd() * 5);
  const p = pivot(line, at, 1);
  const pcAt = (i: number) => (root + line[i]) % 12;
  const names: Names = {};
  for (const i of [2, 3, 4, 5, 6]) names[`n${pcAt(i)}`] = nm(pcName(pcAt(i)), pcNameHe(pcAt(i)), pcName(pcAt(i)).replace('♭', ' flat'));
  const r = pcName(root % 12);
  const rh = pcNameHe(root % 12);
  return choiceQ({
    id, topic: 'bh-pivot', level: 2, seed, skill: 'sequences', difficulty: 1400,
    ask: { en: `A ${r}7 line runs down from ${r} and jumps up an octave once — on which note does it land?`, he: `קו של ${rh} 7 יורד מ${rh} וקופץ פעם אחת אוקטבה למעלה — על איזה צליל הוא נוחת?` },
    names, answer: `n${pcAt(at)}`, choices: [2, 3, 4, 5, 6].map((i) => `n${pcAt(i)}`),
    stimulus: [{ kind: 'melody', midis: p.map((s) => root + s), beats: p.map((_, i) => (i === p.length - 1 ? 2 : 0.5)), bpm: 112 }],
  });
});

// ======================================================================= sing-intervals (new)

/** Comfortable singing range before the app fits it to the player's (C3–G5). */
export const SING_LO = 48;
export const SING_HI = 79;
const IV_EN = ['unison', 'minor second', 'major second', 'minor third', 'major third', 'perfect fourth', 'tritone', 'perfect fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh', 'octave'];
const IV_HE = ['יוניסון', 'סקונדה קטנה', 'סקונדה גדולה', 'טרצה קטנה', 'טרצה גדולה', 'קוורטה', 'טריטון', 'קווינטה', 'סקסטה קטנה', 'סקסטה גדולה', 'ספטימה קטנה', 'ספטימה גדולה', 'אוקטבה'];
export const intervalName = (semis: number) => ({
  en: `${semis === 12 || semis === -12 ? 'an' : 'a'} ${IV_EN[Math.abs(semis)]} ${semis > 0 ? 'up' : 'down'}`,
  he: `${IV_HE[Math.abs(semis)]} ${semis > 0 ? 'למעלה' : 'למטה'}`,
});
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const pcOfMidi = (m: number): PitchClass => pc(FLAT_NAMES[((m % 12) + 12) % 12]);
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const SING_KEYS = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'];

const SING_CHORDS: { q: string; tones: number[]; degs: number[]; en: string; he: string }[] = [
  { q: 'maj', tones: [0, 4, 7, 12], degs: [1, 3, 5, 8], en: 'major', he: 'מז׳ור' },
  { q: 'min', tones: [0, 3, 7, 12], degs: [1, 3, 5, 8], en: 'minor', he: 'מינור' },
  { q: 'dim', tones: [0, 3, 6, 12], degs: [1, 3, 5, 8], en: 'diminished', he: 'מוקטן' },
  { q: 'aug', tones: [0, 4, 8, 12], degs: [1, 3, 5, 8], en: 'augmented', he: 'מוגדל' },
  { q: '7', tones: [0, 4, 7, 10], degs: [1, 3, 5, 7], en: '7', he: '7' },
  { q: 'maj7', tones: [0, 4, 7, 11], degs: [1, 3, 5, 7], en: 'maj7', he: 'מז׳ור 7' },
  { q: 'm7', tones: [0, 3, 7, 10], degs: [1, 3, 5, 7], en: 'm7', he: 'מינור 7' },
];
const PROGS = [[1, 4, 5, 1], [1, 5, 4, 1], [1, 4, 1, 5], [1, 5, 1, 4]];
const ROOT_OFF: Record<number, number> = { 1: 0, 4: 5, 5: 7 };

function singIntervalQ(id: string, seed: number, level: number): SingQuestion {
  const rnd = rng(seed);
  const topic = { id: 'sing-intervals', level, seed };
  if (level <= 3) {
    const semis = level === 1 ? pickR(rnd, [4, 7, 12]) : level === 2 ? 1 + Math.floor(rnd() * 12) : -(1 + Math.floor(rnd() * 12));
    const lo = Math.max(SING_LO, SING_LO - semis);
    const hi = Math.min(SING_HI, SING_HI - semis, level === 3 ? SING_HI : 67);
    const fromMidi = lo + Math.floor(rnd() * (hi - lo + 1));
    const targetMidi = fromMidi + semis;
    const key = pcOfMidi(fromMidi);
    const di = MAJ.indexOf((((semis % 12) + 12) % 12));
    return {
      id, kind: 'sing', promptBy: 'interval', topic,
      interval: { fromMidi, semis, name: intervalName(semis) },
      key, degree: di >= 0 ? di + 1 : 1, target: pcOfMidi(targetMidi), targetMidi,
      choices: [], answer: 'accurate',
      stimulus: [{ kind: 'note', midi: fromMidi, duration: 1.4 }],
      difficulty: [1000, 1150, 1250][level - 1],
    };
  }
  // Level 4: inside a key — the cadence first, then a non-tonic note; sing a diatonic interval from it.
  const key = pc(pickR(rnd, SING_KEYS));
  const t = placeInRange(pcValue(key), 55, 66);
  const at = (i: number) => t + 12 * Math.floor(i / 7) + MAJ[((i % 7) + 7) % 7];
  let d = 0;
  let to = 0;
  let guard = 0;
  do {
    d = 1 + Math.floor(rnd() * 6); // degree 2…7 (index 1…6)
    const steps = pickR(rnd, [1, 2, 3, 4, 5, 6, 7]) * (rnd() < 0.5 ? 1 : -1);
    to = d + steps;
  } while ((at(to) < SING_LO || at(to) > SING_HI) && guard++ < 50);
  const fromMidi = at(d);
  const targetMidi = at(to);
  const semis = targetMidi - fromMidi;
  const deg = (((to % 7) + 7) % 7) + 1;
  return {
    id, kind: 'sing', promptBy: 'interval', topic,
    interval: { fromMidi, semis, name: intervalName(semis) },
    key, degree: deg, target: majorScale(key)[deg - 1], targetMidi,
    choices: [], answer: 'accurate',
    stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: fromMidi, duration: 1.4 }],
    difficulty: 1350,
  };
}

/** The prompt a sing-seq topic item shows (needs `prompt?: { en; he }` on SingSeqQuestion — see the 0.38 report). */
type SingSeqWithPrompt = SingSeqQuestion & { prompt: { en: string; he: string } };

function singSeqQ(id: string, seed: number, level: number): SingSeqWithPrompt {
  const rnd = rng(seed);
  const topic = { id: 'sing-intervals', level, seed };
  if (level === 5) {
    const c = pickR(rnd, SING_CHORDS);
    const rootPc = pickR(rnd, [0, 2, 3, 4, 5, 7, 9, 10]);
    const root = placeInRange(rootPc, 50, 61);
    const midis = c.tones.map((s) => root + s);
    const chordEn = c.q === 'maj' || c.q === 'min' || c.q === 'dim' || c.q === 'aug' ? `${pcName(rootPc)} ${c.en}` : `${pcName(rootPc)}${c.en}`;
    const chordHe = `${pcNameHe(rootPc)} ${c.he}`;
    return {
      id, kind: 'sing-seq', topic, key: pcOfMidi(root), degrees: c.degs, midis,
      prompt: { en: `Sing ${chordEn} as an arpeggio, up from the root you hear.`, he: `שירו ${chordHe} בארפג׳יו, מהשורש שאתם שומעים כלפי מעלה.` },
      choices: [], answer: 'accurate',
      stimulus: [{ kind: 'note', midi: root, duration: 1.4 }],
      difficulty: 1400,
    };
  }
  // Level 6: hear a progression of I, IV and V; sing the root of each chord.
  const keyName = pickR(rnd, SING_KEYS);
  const key = pc(keyName);
  const t = placeInRange(pcValue(key), 50, 60);
  const prog = pickR(rnd, PROGS);
  const out: NoteEvent[] = [];
  prog.forEach((dg, i) => {
    const r = t + ROOT_OFF[dg];
    const start = i * 0.95;
    out.push(N(r - 12, start, 0.9, 0.6));
    for (const s of [0, 4, 7]) {
      let m = r + s;
      while (m < 60) m += 12;
      while (m > 72) m -= 12;
      out.push(N(m, start, 0.9, 0.42));
    }
  });
  return {
    id, kind: 'sing-seq', topic, key, degrees: prog, midis: prog.map((dg) => t + ROOT_OFF[dg]),
    prompt: { en: 'Sing the root of each chord you heard, in order.', he: 'שירו את השורש של כל אקורד ששמעתם, לפי הסדר.' },
    choices: [], answer: 'accurate',
    stimulus: [ev(out, prog.length * 0.95 + 0.4)],
    difficulty: 1500,
  };
}

TOPIC_GEN['sing-intervals'] = {
  title: { en: 'Sing an interval', he: 'לשיר מרווח' },
  skill: 'singing',
  levels: [
    { en: 'Up a third, a fifth or an octave', he: 'טרצה, קווינטה או אוקטבה למעלה' },
    { en: 'Any interval up', he: 'כל מרווח למעלה' },
    { en: 'Any interval down', he: 'כל מרווח למטה' },
    { en: 'Inside a key, from a note that is not home', he: 'בתוך סולם, מצליל שאינו הבית' },
    { en: 'Sing the arpeggio of a named chord', he: 'לשיר ארפג׳יו של אקורד בשמו' },
    { en: 'Sing the roots of I, IV and V you hear', he: 'לשיר את השורשים של I, IV ו־V ששומעים' },
  ],
  gen: (seed, level, id) => (level <= 4 ? singIntervalQ(id, seed, level) : singSeqQ(id, seed, level)),
};
TOPIC_TAGS['sing-intervals'] = tg(['singing', 'intervals', 0.7], ['intervals', 'melodic', 0.3]);
