// 0.38 topics (spec AE §4.6 and §10, docs/SPEC-0.38.md): time with the click and the drums.
// New: click-subdivide, click-backbeat, gap-click, tempo-memory, poly-tap, rhythm-errors, drum-read, tempo-react,
// sight-tap. Deeper levels: polyrhythm, swing-ratio, syncopation, downbeat, displacement-3, eastern-rhythm, odd-meter.
// Pure and seeded. Tapping items are rhythm-read items with `topic` set (rebuilt from their tag); the controller
// plays their clicks through `applyClicks` / `tempoTimeline` and grades with `gradeTempo` / `gradeLanes` /
// `steadyBeat` (src/engine/clicks.ts).

import './topicsEar';
import './topicsAD';
import type { ChoiceQuestion, ClickPattern, NoteEvent, RhythmReadQuestion, SingSeqQuestion, SkillId, Stimulus } from './lesson';
import { marker } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg, type Tag } from './taxonomy';
import { describe as describeRhythm, type CellId, type Rhythm, type RhythmLevel } from './rhythm';
import { pc, pcValue } from './pitch';

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };
type Lane = NonNullable<RhythmReadQuestion['lanes']>[number];

const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
const N = (midi: number, start: number, duration: number, velocity = 0.7): NoteEvent => ({ midi, start, duration, velocity });
const click = (start: number, accent: boolean, soft = 1): NoteEvent => ({ midi: 96, start, duration: 0.04, velocity: (accent ? 0.5 : 0.3) * soft, perc: accent ? 'accent' : 'click' });

/** Bars of 4/4 from per-bar cell lists. */
const bars44 = (...bars: CellId[][]): Rhythm => ({ beatsPerBar: 4, bars: bars.length, cells: bars.flat() });
const rep = <T,>(x: T, n: number): T[] => Array.from({ length: n }, () => x);

/** Wrap a deepened topic: levels after the base's go to `more` (level counted from 1 after the base). */
function deepen(topic: string, levels: Bi[], more: (seed: number, level: number, id: string, full: number) => ReturnType<(typeof TOPIC_GEN)[string]['gen']>, tags?: (l: number) => Tag[]) {
  const base = TOPIC_GEN[topic];
  const baseN = base.levels.length;
  TOPIC_GEN[topic] = { ...base, levels: [...base.levels, ...levels], gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : more(seed, level - baseN, id, level)) };
  if (tags) {
    const bt = TOPIC_TAGS[topic];
    TOPIC_TAGS[topic] = (l) => (l <= baseN ? (typeof bt === 'function' ? bt(l) : bt) : tags(l - baseN));
  }
}

// ================================================================ tapping items

interface TapSpec {
  id: string;
  topic: string;
  level: number;
  seed: number;
  rlevel: RhythmLevel;
  rhythm: Rhythm;
  bpm: number;
  skillAs: SkillId;
  difficulty: number;
  prompt: Bi;
  show?: 'notation' | 'words';
  clicks?: ClickPattern;
  tempoGoal?: RhythmReadQuestion['tempoGoal'];
  lanes?: Lane[];
}
function tapQ(p: TapSpec): RhythmReadQuestion {
  return {
    id: p.id,
    kind: 'rhythm-read',
    level: p.rlevel,
    rhythm: p.rhythm,
    bpm: p.bpm,
    show: p.show ?? 'notation',
    choices: [],
    answer: 'accurate',
    stimulus: [], // count-in and clicks come from the performance timeline
    difficulty: p.difficulty,
    prompt: p.prompt,
    skillAs: p.skillAs,
    topic: { id: p.topic, level: p.level, seed: p.seed },
    ...(p.clicks ? { clicks: p.clicks } : {}),
    ...(p.tempoGoal ? { tempoGoal: p.tempoGoal } : {}),
    ...(p.lanes ? { lanes: p.lanes } : {}),
  };
}
const QQ: CellId[] = ['q', 'q', 'q', 'q'];

// ---------------------------------------------------------------- click-subdivide

TOPIC_GEN['click-subdivide'] = {
  title: { en: 'Subdivide the click', he: 'לחלק את הקליק' },
  skill: 'timing',
  levels: [
    { en: 'Eighths on a quarter click', he: 'שמיניות על קליק של רבעים' },
    { en: 'Triplets', he: 'טריולות' },
    { en: 'Sixteenths', he: 'שש־עשריות' },
    { en: 'Switch every bar: 2 → 3 → 4', he: 'מחליפים בכל תיבה: 2 ← 3 ← 4' },
    { en: 'Swung eighths', he: 'שמיניות בסווינג' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(5, Math.max(1, level));
    const spec: Record<number, { cells: CellId[][]; rlevel: RhythmLevel; bpm: number[]; prompt: Bi; swing?: boolean }> = {
      1: { cells: rep(rep<CellId>('ee', 4), 2), rlevel: 2, bpm: [72, 76, 80, 84, 88], prompt: { en: 'The click plays quarter notes. Tap eighths — two even taps per click.', he: 'הקליק מנגן רבעים. הקישו שמיניות — שתי הקשות שוות לכל קליק.' } },
      2: { cells: rep(rep<CellId>('trip', 4), 2), rlevel: 6, bpm: [60, 66, 72, 76], prompt: { en: 'Tap triplets — three even taps per click.', he: 'הקישו טריולות — שלוש הקשות שוות לכל קליק.' } },
      3: { cells: rep(rep<CellId>('ssss', 4), 2), rlevel: 4, bpm: [56, 60, 66, 70], prompt: { en: 'Tap sixteenths — four even taps per click.', he: 'הקישו שש־עשריות — ארבע הקשות שוות לכל קליק.' } },
      4: { cells: [rep<CellId>('ee', 4), rep<CellId>('trip', 4), rep<CellId>('ssss', 4)], rlevel: 6, bpm: [56, 60, 66], prompt: { en: 'Two taps per click, then three, then four — switch every bar.', he: 'שתי הקשות לכל קליק, אחר כך שלוש, ואז ארבע — מחליפים בכל תיבה.' } },
      5: { cells: rep(rep<CellId>('ee', 4), 2), rlevel: 8, bpm: [96, 108, 120, 132], swing: true, prompt: { en: 'Tap swung eighths — long-short, long-short, with the click on the long one.', he: 'הקישו שמיניות בסווינג — ארוך־קצר, ארוך־קצר, והקליק על הארוך.' } },
    };
    const s = spec[L];
    const rhythm: Rhythm = { ...bars44(...s.cells), ...(s.swing ? { swing: true } : {}) };
    return tapQ({ id, topic: 'click-subdivide', level, seed, rlevel: s.rlevel, rhythm, bpm: pickR(rnd, s.bpm), skillAs: 'timing', difficulty: 900 + 100 * L, prompt: s.prompt, clicks: { kind: 'beats' } });
  },
};
TOPIC_TAGS['click-subdivide'] = tg(['timing', 'subdivide', 0.8], ['rhythm-reading', 'read', 0.2]);

// ---------------------------------------------------------------- click-backbeat

TOPIC_GEN['click-backbeat'] = {
  title: { en: 'The click moves', he: 'הקליק זז' },
  skill: 'timing',
  levels: [
    { en: 'The click on 2 and 4', he: 'הקליק על 2 ו־4' },
    { en: 'The click on beat 1 only', he: 'הקליק רק על 1' },
    { en: 'The click on the "and"s', he: 'הקליק על ה״וְ״' },
    { en: 'One click every two bars', he: 'קליק אחד כל שתי תיבות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(4, Math.max(1, level));
    const clicks: ClickPattern = [{ kind: 'backbeat' }, { kind: 'one' }, { kind: 'offbeat' }, { kind: 'every2' }][L - 1] as ClickPattern;
    const bars = [2, 3, 2, 4][L - 1];
    const prompt: Bi = [
      { en: 'Tap every beat. After the count-in the click plays only on 2 and 4.', he: 'הקישו כל פעמה. אחרי הספירה הקליק מנגן רק על 2 ו־4.' },
      { en: 'Tap every beat. After the count-in the click plays only on beat 1.', he: 'הקישו כל פעמה. אחרי הספירה הקליק מנגן רק על פעמה 1.' },
      { en: 'Tap every beat. After the count-in the click moves between the beats — onto the "and"s. Don\'t follow it.', he: 'הקישו כל פעמה. אחרי הספירה הקליק עובר אל בין הפעמות — אל ה״וְ״. אל תיגררו אחריו.' },
      { en: 'Tap every beat. After the count-in the click plays once every two bars, on beat 1.', he: 'הקישו כל פעמה. אחרי הספירה הקליק מנגן פעם אחת בכל שתי תיבות, על פעמה 1.' },
    ][L - 1];
    return tapQ({ id, topic: 'click-backbeat', level, seed, rlevel: 1, rhythm: bars44(...rep(QQ, bars)), bpm: pickR(rnd, [80, 88, 96, 104]), skillAs: 'timing', difficulty: 950 + 100 * L, prompt, clicks });
  },
};
TOPIC_TAGS['click-backbeat'] = tg(['timing', 'backbeat', 1]);

// ---------------------------------------------------------------- gap-click

TOPIC_GEN['gap-click'] = {
  title: { en: 'Gap click', he: 'קליק עם חורים' },
  skill: 'timing',
  levels: [
    { en: 'Two bars on, one off', he: 'שתי תיבות כן, אחת לא' },
    { en: 'Two on, two off', he: 'שתיים כן, שתיים לא' },
    { en: 'One on, three off', he: 'אחת כן, שלוש לא' },
    { en: 'Random gaps', he: 'חורים אקראיים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(4, Math.max(1, level));
    const clicks: ClickPattern = L === 1 ? { kind: 'gaps', on: 2, off: 1 } : L === 2 ? { kind: 'gaps', on: 2, off: 2 } : L === 3 ? { kind: 'gaps', on: 1, off: 3 } : { kind: 'random-gaps', seed: Math.floor(rnd() * 1e9) };
    const bars = L === 1 ? 6 : 8;
    const bpm = pickR(rnd, L === 1 ? [88, 92, 96, 100] : [96, 100, 104, 108, 112]);
    const how: Bi = [
      { en: 'two bars, then it stops for one', he: 'שתי תיבות, ואז נעלם לתיבה אחת' },
      { en: 'two bars, then it stops for two', he: 'שתי תיבות, ואז נעלם לשתיים' },
      { en: 'one bar, then it stops for three', he: 'תיבה אחת, ואז נעלם לשלוש' },
      { en: 'and drops out at random moments', he: 'ונעלם ברגעים אקראיים' },
    ][L - 1];
    const prompt = { en: `Tap every beat. The click plays ${how.en} — keep the beat going through the silence.`, he: `הקישו כל פעמה. הקליק מנגן ${how.he} — המשיכו את הפעמה גם בשקט.` };
    return tapQ({ id, topic: 'gap-click', level, seed, rlevel: 1, rhythm: bars44(...rep(QQ, bars)), bpm, skillAs: 'timing', difficulty: 1000 + 100 * L, prompt, clicks });
  },
};
TOPIC_TAGS['gap-click'] = tg(['timing', 'gap', 0.7], ['tempo', 'compare', 0.3]);

// ---------------------------------------------------------------- tempo-memory

TOPIC_GEN['tempo-memory'] = {
  title: { en: 'Tap a tempo from memory', he: 'להקיש טמפו מהזיכרון' },
  skill: 'tempo',
  levels: [
    { en: '60 BPM', he: '60 BPM' },
    { en: '120 BPM', he: '120 BPM' },
    { en: 'Any tempo, 70–160', he: 'כל טמפו, 70–160' },
    { en: 'Hear it, then hold it alone', he: 'שומעים, ואז מחזיקים לבד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(4, Math.max(1, level));
    const bpm = L === 1 ? 60 : L === 2 ? 120 : 70 + 5 * Math.floor(rnd() * 19);
    const beats = L === 1 ? 8 : L === 4 ? 16 : 12;
    const goal = L === 4 ? { bpm, beats, withClicks: 8 } : { bpm, beats };
    const prompt: Bi =
      L === 1
        ? { en: 'No click. Tap 60 BPM — one tap a second. Start when you are ready: 8 taps.', he: 'בלי קליק. הקישו 60 BPM — הקשה אחת בשנייה. מתחילים כשמוכנים: 8 הקשות.' }
        : L === 2
          ? { en: 'No click. Tap 120 BPM — two taps a second. Start when you are ready: 12 taps.', he: 'בלי קליק. הקישו 120 BPM — שתי הקשות בשנייה. מתחילים כשמוכנים: 12 הקשות.' }
          : L === 3
            ? { en: `No click. Tap ${bpm} BPM from memory. Start when you are ready: 12 taps.`, he: `בלי קליק. הקישו ${bpm} BPM מהזיכרון. מתחילים כשמוכנים: 12 הקשות.` }
            : { en: `Listen to ${bpm} BPM for two bars. Then the click stops — keep tapping it for 16 beats.`, he: `הקשיבו ל־${bpm} BPM במשך שתי תיבות. אז הקליק נעצר — המשיכו להקיש אותו 16 פעמות.` };
    return tapQ({ id, topic: 'tempo-memory', level, seed, rlevel: 1, rhythm: bars44(...rep(QQ, beats / 4)), bpm, skillAs: 'tempo', difficulty: [1050, 1150, 1300, 1350][L - 1], prompt, show: 'words', tempoGoal: goal });
  },
};
TOPIC_TAGS['tempo-memory'] = tg(['tempo', 'produce', 1]);

// ---------------------------------------------------------------- poly-tap (two hands)

const HAND = { left: { en: 'Left hand', he: 'יד שמאל' }, right: { en: 'Right hand', he: 'יד ימין' } };
TOPIC_GEN['poly-tap'] = {
  title: { en: 'Two hands', he: 'שתי ידיים' },
  skill: 'timing',
  levels: [
    { en: '2 against 1', he: '2 נגד 1' },
    { en: '3 against 2', he: '3 נגד 2' },
    { en: '4 against 3', he: '4 נגד 3' },
    { en: '3 against 2, then swap hands', he: '3 נגד 2, ואז מחליפים ידיים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(4, Math.max(1, level));
    const pair: [CellId, CellId] = L === 1 ? ['q', 'ee'] : L === 2 ? ['ee', 'trip'] : L === 3 ? ['trip', 'ssss'] : ['ee', 'trip'];
    const bar = (c: CellId) => rep(c, 4);
    const left = L === 4 ? bars44(bar(pair[0]), bar(pair[0]), bar(pair[1]), bar(pair[1])) : bars44(bar(pair[0]), bar(pair[0]));
    const right = L === 4 ? bars44(bar(pair[1]), bar(pair[1]), bar(pair[0]), bar(pair[0])) : bars44(bar(pair[1]), bar(pair[1]));
    const lanes: Lane[] = [
      { rhythm: left, name: HAND.left, perc: 'kick' },
      { rhythm: right, name: HAND.right, perc: 'clave' },
    ];
    const prompt: Bi = [
      { en: 'Two pads. Left hand taps the beat; right hand taps twice per beat.', he: 'שני פדים. יד שמאל מקישה את הפעמה; יד ימין פעמיים בכל פעמה.' },
      { en: 'Two pads. Left hand two per beat, right hand three per beat — 3 against 2.', he: 'שני פדים. יד שמאל שתיים בכל פעמה, יד ימין שלוש — 3 נגד 2.' },
      { en: 'Two pads. Left hand three per beat, right hand four per beat — 4 against 3.', he: 'שני פדים. יד שמאל שלוש בכל פעמה, יד ימין ארבע — 4 נגד 3.' },
      { en: 'Two pads, 3 against 2: left two per beat, right three. After two bars, swap hands.', he: 'שני פדים, 3 נגד 2: שמאל שתיים בכל פעמה, ימין שלוש. אחרי שתי תיבות מחליפים ידיים.' },
    ][L - 1];
    const bpm = pickR(rnd, L === 1 ? [72, 80, 88] : L === 2 ? [60, 66, 72] : L === 3 ? [52, 56, 60] : [56, 60, 66]);
    // `rhythm` = the first lane (it sets the count-in and the clicks); grading uses every lane (gradeLanes).
    return tapQ({ id, topic: 'poly-tap', level, seed, rlevel: L === 1 ? 2 : 6, rhythm: left, bpm, skillAs: 'timing', difficulty: [1150, 1300, 1450, 1500][L - 1], prompt, clicks: { kind: 'beats' }, lanes });
  },
};
TOPIC_TAGS['poly-tap'] = tg(['timing', 'poly', 0.7], ['rhythm-dictation', 'poly', 0.3]);

// ---------------------------------------------------------------- drum-read

const KIT = { kick: { en: 'Kick', he: 'בס־דראם' }, snare: { en: 'Snare', he: 'סנר' }, hat: { en: 'Hi-hat', he: 'הַיי־הֶט' } };
const HAT8: CellId[] = ['ee', 'ee', 'ee', 'ee'];
const HAT16: CellId[] = ['ssss', 'ssss', 'ssss', 'ssss'];
const BACK: CellId[] = ['qr', 'q', 'qr', 'q'];
const ROCK: CellId[] = ['q', 'qr', 'q', 'qr'];
/** Kick variations (onsets): 1 3 3& · 1 2& 3 · 1 1& 3 · 1 3 4& · 1 4&. */
const KICKS: CellId[][] = [
  ['q', 'qr', 'ee', 'qr'],
  ['q', 'ere', 'q', 'qr'],
  ['ee', 'qr', 'q', 'qr'],
  ['q', 'qr', 'q', 'ere'],
  ['q', 'qr', 'qr', 'ere'],
];
/** Snare fills on beats 3–4. */
const FILLS: CellId[][] = [
  ['ssss', 'ssss'],
  ['ee', 'ssss'],
  ['ssss', 'ee'],
  ['es', 'ssss'],
  ['se', 'ssss'],
];
/** Backbeat with ghost notes (soft snare hits between 2 and 4). */
const GHOSTS: CellId[][] = [
  ['qr', 'q', 'ere', 'q'],
  ['ere', 'q', 'qr', 'q'],
  ['qr', 'q', 'qr', 'se'],
  ['qr', 'es', 'ere', 'q'],
];

TOPIC_GEN['drum-read'] = {
  title: { en: 'Read the drum kit', he: 'לקרוא תופים' },
  skill: 'rhythm-reading',
  // DRUMS_AUDIT I4: kit reading is the drums course's (courses are disjoint — it left the ear path for it).
  forPlays: ['drums'],
  levels: [
    { en: 'Rock beat', he: 'ביט רוק' },
    { en: 'Kick variations', he: 'וריאציות בבס־דראם' },
    { en: 'Fills', he: 'מילויים (פילים)' },
    { en: 'Sixteenth hi-hats', he: 'היי־הט בשש־עשריות' },
    { en: 'Open hi-hat and ghost notes', he: 'היי־הט פתוח ותווי רפאים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(5, Math.max(1, level));
    let kick: CellId[][], snare: CellId[][], hat: CellId[][];
    if (L === 1) {
      kick = [ROCK, ROCK];
      snare = [BACK, BACK];
      hat = [HAT8, HAT8];
    } else if (L === 2 || L === 4) {
      const [a, b] = shuffleR(rnd, KICKS);
      kick = [a, b];
      snare = [BACK, BACK];
      hat = L === 2 ? [HAT8, HAT8] : [HAT16, HAT16];
    } else if (L === 3) {
      kick = [pickR(rnd, [ROCK, ...KICKS]), ['q', 'qr', 'qr', 'qr']];
      snare = [BACK, ['qr', 'q', ...pickR(rnd, FILLS)]];
      hat = [HAT8, ['ee', 'ee', 'qr', 'qr']];
    } else {
      const [g1, g2] = shuffleR(rnd, GHOSTS);
      kick = [pickR(rnd, [ROCK, ...KICKS]), pickR(rnd, KICKS)];
      snare = [g1, g2];
      hat = [HAT8, HAT8];
    }
    const lanes: Lane[] = [
      { rhythm: bars44(...kick), name: KIT.kick, perc: 'kick' },
      { rhythm: bars44(...snare), name: KIT.snare, perc: 'snare' },
      { rhythm: bars44(...hat), name: KIT.hat, perc: 'hat' },
    ];
    const prompt: Bi = [
      { en: 'Read the kit and play it on three pads: kick, snare, hi-hat.', he: 'קראו את התופים ונגנו על שלושה פדים: בס־דראם, סנר, היי־הט.' },
      { en: 'Read the kit: the kick moves around the beat. Play it on three pads.', he: 'קראו את התופים: הבס־דראם זז סביב הפעמה. נגנו על שלושה פדים.' },
      { en: 'Read the kit: a groove bar, then a snare fill. Play it on three pads.', he: 'קראו את התופים: תיבת גרוב ואחריה פיל בסנר. נגנו על שלושה פדים.' },
      { en: 'Read the kit with sixteenth notes on the hi-hat. Play it on three pads.', he: 'קראו את התופים עם שש־עשריות בהיי־הט. נגנו על שלושה פדים.' },
      { en: 'Read the kit: soft ghost notes on the snare between the backbeats; open the hi-hat on the last "and". Three pads.', he: 'קראו את התופים: תווי רפאים שקטים בסנר בין הבקביטים; פותחים את ההיי־הט על ה״וְ״ האחרון. שלושה פדים.' },
    ][L - 1];
    const bpm = pickR(rnd, L === 4 ? [60, 66, 72] : L === 3 ? [72, 80, 88] : [76, 84, 92]);
    // `rhythm` = the first lane (count-in and clicks); grading uses every lane (gradeLanes).
    return tapQ({ id, topic: 'drum-read', level, seed, rlevel: L <= 2 ? 5 : 4, rhythm: lanes[0].rhythm, bpm, skillAs: 'rhythm-reading', difficulty: [1050, 1150, 1300, 1400, 1500][L - 1], prompt, clicks: { kind: 'beats' }, lanes });
  },
};
TOPIC_TAGS['drum-read'] = tg(['rhythm-reading', 'drums', 0.7], ['timing', 'precision', 0.3]);

// ================================================================ rhythm-errors (choice)

/** Onsets (in beats) of the one-beat cells used here. */
const ONSETS: Partial<Record<CellId, number[]>> = { q: [0], ee: [0, 0.5], qr: [], es: [0, 0.5, 0.75], se: [0, 0.25, 0.5] };

/** A count-in bar, soft clicks under the passage and a snare + tone on each onset. */
function playOnsets(onsets: number[], beats: number, bpm: number): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  for (let i = 0; i < 4; i++) out.push(click(i * b, i === 0));
  const t0 = 4 * b;
  for (let i = 0; i < beats; i++) out.push(click(t0 + i * b, i % 4 === 0, 0.55));
  for (const o of onsets) out.push({ midi: 38, start: t0 + o * b, duration: 0.05, velocity: 0.85, perc: 'snare' }, N(67, t0 + o * b, Math.min(0.3, b * 0.45), 0.3));
  return ev(out, t0 + beats * b + 0.4);
}

TOPIC_GEN['rhythm-errors'] = {
  title: { en: 'Spot the rhythm slip', he: 'למצוא את הטעות בקצב' },
  skill: 'rhythm-reading',
  levels: [
    { en: 'Which beat? (one bar)', he: 'באיזו פעמה? (תיבה אחת)' },
    { en: 'Which beat? (two bars)', he: 'באיזו פעמה? (שתי תיבות)' },
    { en: 'Subtle: dotted or even, a little early', he: 'עדין: מנוקד או שווה, קצת מוקדם' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(3, Math.max(1, level));
    const bars = L === 2 ? 2 : 1;
    const n = 4 * bars;
    const pool: CellId[] = L === 1 ? ['q', 'ee', 'qr'] : L === 2 ? ['q', 'ee', 'qr', 'es', 'se'] : ['q', 'ee'];
    const cells: CellId[] = Array.from({ length: n }, (_, i) => pickR(rnd, i === 0 ? pool.filter((c) => c !== 'qr') : pool));
    // Each beat's slip, fixed per beat so every choice can be played back.
    const slip: number[][] = cells.map((c) => {
      if (L === 3) return c === 'ee' ? [0, 0.75] : [-0.25]; // even eighths played dotted / a quarter pushed a sixteenth early
      const alt = pickR(rnd, pool.filter((x) => x !== c && ONSETS[x]!.join() !== ONSETS[c]!.join()));
      return ONSETS[alt]!;
    });
    const version = (k: number) => cells.flatMap((c, i) => (i === k ? slip[i] : ONSETS[c]!).map((o) => i + o));
    const bpm = pickR(rnd, L === 3 ? [72, 76, 80] : [84, 88, 92, 96]);
    const keys = Array.from({ length: n }, (_, i) => (bars === 1 ? String(i + 1) : `b${Math.floor(i / 4) + 1}-${(i % 4) + 1}`));
    const ONE = ['one', 'two', 'three', 'four'];
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    keys.forEach((k, i) => {
      const beat = (i % 4) + 1;
      const bar = Math.floor(i / 4) + 1;
      names[k] = bars === 1 ? nm(`Beat ${beat}`, `פעמה ${beat}`, `beat ${ONE[beat - 1]}`) : nm(`Bar ${bar}, beat ${beat}`, `תיבה ${bar}, פעמה ${beat}`, `bar ${ONE[bar - 1]} beat ${ONE[beat - 1]}`);
      choiceStim[k] = [playOnsets(version(i), n, bpm)];
    });
    const k = Math.floor(rnd() * n);
    const written: Rhythm = { beatsPerBar: 4, bars, cells };
    const ask: Bi =
      L === 3
        ? { en: 'Read, then listen: one beat is slightly off. Which?', he: 'קראו ואז הקשיבו: פעמה אחת קצת לא מדויקת. איזו?' }
        : { en: 'Read the rhythm, then listen: one beat is played differently. Which beat?', he: 'קראו את המקצב ואז הקשיבו: פעמה אחת מנוגנת אחרת. איזו פעמה?' };
    return choiceQ({
      id, topic: 'rhythm-errors', level, seed, skill: 'rhythm-reading', difficulty: [1050, 1200, 1400][L - 1],
      ask, names, answer: keys[k], choices: keys, stimulus: [playOnsets(version(k), n, bpm)], choiceStim,
      text: { en: describeRhythm(written, 'names', 'en'), he: describeRhythm(written, 'names', 'he') },
    });
  },
};
TOPIC_TAGS['rhythm-errors'] = tg(['rhythm-reading', 'errors', 0.7], ['rhythm-dictation', 'dictate', 0.3]);

// ================================================================ tempo-react (choice)

/** A kit groove: kick on 1, hat on every beat, snare on the middle beat; per-bar tempo and beats. */
function groove(bars: { bpm: number; beats: number }[]): Stimulus {
  const out: NoteEvent[] = [];
  let t = 0;
  for (const bar of bars) {
    const b = 60 / bar.bpm;
    for (let i = 0; i < bar.beats; i++) {
      out.push({ midi: 84, start: t, duration: 0.04, velocity: i === 0 ? 0.6 : 0.4, perc: 'hat' });
      if (i === 0) out.push({ midi: 45, start: t, duration: 0.12, velocity: 0.9, perc: 'kick' });
      if (bar.beats === 4 && i === 2) out.push({ midi: 38, start: t, duration: 0.08, velocity: 0.6, perc: 'snare' });
      t += b;
    }
  }
  return ev(out, t + 0.3);
}

TOPIC_GEN['tempo-react'] = {
  title: { en: 'Quick reaction', he: 'תגובה מהירה' },
  skill: 'tempo',
  levels: [
    { en: 'In which bar did the tempo change?', he: 'באיזו תיבה השתנה הטמפו?' },
    { en: 'Faster, slower or a new meter?', he: 'מהר יותר, לאט יותר או משקל חדש?' },
    { en: 'A small tempo change — which bar?', he: 'שינוי טמפו קטן — באיזו תיבה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(3, Math.max(1, level));
    const bpm = pickR(rnd, [88, 96, 104]);
    const BARS = 6;
    if (L === 2) {
      const pool = ['faster', 'slower', 'meter'];
      const answer = pickR(rnd, pool);
      const at = 2 + Math.floor(rnd() * 3); // bar 3, 4 or 5 (0-based 2..4)
      const meter34 = rnd() < 0.5; // the meter change goes 4 → 3 or 3 → 4
      const make = (a: string) =>
        groove(
          Array.from({ length: BARS }, (_, i) => {
            const after = i >= at;
            if (a === 'meter') return { bpm, beats: after ? (meter34 ? 3 : 4) : meter34 ? 4 : 3 };
            return { bpm: after ? Math.round(bpm * (a === 'faster' ? 1.15 : 0.87)) : bpm, beats: 4 };
          }),
        );
      const names: Names = {
        faster: nm('It got faster', 'זה הואץ', 'faster', 'speeds up', 'מהר יותר', 'הואץ'),
        slower: nm('It got slower', 'זה הואט', 'slower', 'slows down', 'לאט יותר', 'הואט'),
        meter: nm('The meter changed', 'המשקל השתנה', 'meter', 'the meter', 'משקל'),
      };
      return choiceQ({
        id, topic: 'tempo-react', level, seed, skill: 'tempo', difficulty: 1250,
        ask: { en: 'Something changes partway through. What changed?', he: 'משהו משתנה באמצע. מה השתנה?' },
        names, answer, choices: pool, stimulus: [make(answer)], choiceStim: Object.fromEntries(pool.map((p) => [p, [make(p)]])),
      });
    }
    const factor = L === 1 ? pickR(rnd, [1.18, 0.84]) : pickR(rnd, [1.07, 0.93]);
    const keys = ['b2', 'b3', 'b4', 'b5'];
    const ONE = ['two', 'three', 'four', 'five'];
    const make = (k: string) => {
      const at = Number(k.slice(1)) - 1;
      return groove(Array.from({ length: BARS }, (_, i) => ({ bpm: i >= at ? Math.round(bpm * factor) : bpm, beats: 4 })));
    };
    const names: Names = {};
    keys.forEach((k, i) => (names[k] = nm(`Bar ${i + 2}`, `תיבה ${i + 2}`, `bar ${ONE[i]}`)));
    const answer = pickR(rnd, keys);
    return choiceQ({
      id, topic: 'tempo-react', level, seed, skill: 'tempo', difficulty: L === 1 ? 1100 : 1400,
      ask: L === 1 ? { en: 'In which bar does the tempo change?', he: 'באיזו תיבה הטמפו משתנה?' } : { en: 'Count the bars. The tempo changes only a little — in which bar?', he: 'ספרו תיבות. הטמפו משתנה רק קצת — באיזו תיבה?' },
      names, answer, choices: keys, stimulus: [make(answer)], choiceStim: Object.fromEntries(keys.map((k) => [k, [make(k)]])),
    });
  },
};
TOPIC_TAGS['tempo-react'] = tg(['tempo', 'compare', 0.6], ['meter', 'count', 0.4]);

// ================================================================ sight-tap (sing a written line, tap the beat)

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const SIGHT_KEYS = ['C', 'G', 'F', 'D', 'Bb'];
const SIGHT_DURS: number[][][] = [
  [[1, 1, 1, 1]],
  [
    [1, 1, 2, 1, 1, 2],
    [2, 1, 1, 1, 1, 2],
    [1, 1, 1, 1, 2, 2],
  ],
  [
    [1, 0.5, 0.5, 1, 1, 1, 1, 2],
    [0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 2],
    [1, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 2],
  ],
];

TOPIC_GEN['sight-tap'] = {
  title: { en: 'Sing and tap', he: 'לשיר ולהקיש' },
  skill: 'sight',
  levels: [
    { en: 'Four quarter notes, by step', he: 'ארבעה רבעים, בצעדים' },
    { en: 'Two bars with half notes', he: 'שתי תיבות עם חצאים' },
    { en: 'Eighths and small leaps', he: 'שמיניות וקפיצות קטנות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(3, Math.max(1, level));
    const keyName = pickR(rnd, SIGHT_KEYS);
    const key = pc(keyName);
    const tonic = 55 + ((pcValue(key) - 55 + 120) % 12);
    const durs = pickR(rnd, SIGHT_DURS[L - 1]);
    // Walk backwards from the tonic so the line ends at home; steps (and thirds at L3), inside degrees 1–6.
    const degrees = [1];
    while (degrees.length < durs.length) {
      const steps = L === 3 ? [-2, -1, 1, 2] : [-1, 1];
      const cur = degrees[0];
      const opts = steps.map((s) => cur + s).filter((d) => d >= 1 && d <= 6);
      degrees.unshift(pickR(rnd, opts));
    }
    const midis = degrees.map((d) => tonic + MAJ[d - 1]);
    const bpm = pickR(rnd, L === 1 ? [66, 72] : [72, 80]);
    const q: SingSeqQuestion = {
      id,
      kind: 'sing-seq',
      key,
      degrees,
      midis,
      choices: [],
      answer: 'accurate',
      stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: tonic, duration: 1.2 }],
      difficulty: [1250, 1400, 1550][L - 1],
      skillAs: 'sight',
      tapBeat: { bpm },
      show: { midis, durs, key },
      topic: { id: 'sight-tap', level, seed },
    };
    return q;
  },
};
TOPIC_TAGS['sight-tap'] = tg(['sight', 'sing', 0.6], ['timing', 'steady', 0.4]);

// ================================================================ deepened topics

// ---------------------------------------------------------------- polyrhythm 3–4

function poly(a: number, b: number, cycle: number, times: number): Stimulus {
  const out: NoteEvent[] = [];
  for (let r = 0; r < times; r++) {
    for (let i = 0; i < a; i++) out.push({ midi: 84, start: r * cycle + (i * cycle) / a, duration: 0.05, velocity: i ? 0.55 : 0.8, perc: 'snare-soft' });
    for (let i = 0; i < b; i++) out.push({ midi: 45, start: r * cycle + (i * cycle) / b, duration: 0.12, velocity: i ? 0.7 : 0.9, perc: 'kick' });
  }
  return ev(out, cycle * times + 0.2);
}
const POLY2: Record<string, [number, number, ReturnType<typeof nm>]> = {
  '4:3': [4, 3, nm('4 against 3', '4 נגד 3', 'four against three', 'four three')],
  '5:4': [5, 4, nm('5 against 4', '5 נגד 4', 'five against four', 'five four')],
  '7:4': [7, 4, nm('7 against 4', '7 נגד 4', 'seven against four', 'seven four')],
};
deepen('polyrhythm', [
  { en: '7:4 and 5:4', he: '7:4 ו־5:4' },
  { en: 'Which part is faster?', he: 'איזה חלק מהיר יותר?' },
], (seed, l, id, level) => {
  const rnd = rng(seed);
  if (l === 1) {
    const pool = ['4:3', '5:4', '7:4'];
    const answer = pickR(rnd, pool);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = POLY2[k][2];
      choiceStim[k] = [poly(POLY2[k][0], POLY2[k][1], 1.6, 2)];
    }
    return choiceQ({ id, topic: 'polyrhythm', level, seed, skill: 'rhythm-dictation', difficulty: 1800, ask: { en: 'High against low — which polyrhythm?', he: 'גבוה נגד נמוך — איזה פולי־ריתם?' }, names, answer, choices: pool, stimulus: [poly(POLY2[answer][0], POLY2[answer][1], 1.6, 3)], choiceStim });
  }
  const [many, few] = pickR(rnd, [[5, 4], [4, 3], [6, 5], [7, 6]] as [number, number][]);
  const answer = rnd() < 0.5 ? 'high' : 'low';
  const make = (a: string) => (a === 'high' ? poly(many, few, 1.5, 3) : poly(few, many, 1.5, 3));
  const names: Names = { high: nm('The high part', 'החלק הגבוה', 'high', 'higher', 'גבוה'), low: nm('The low part', 'החלק הנמוך', 'low', 'lower', 'נמוך') };
  return choiceQ({ id, topic: 'polyrhythm', level, seed, skill: 'rhythm-dictation', difficulty: 1850, ask: { en: 'Two parts, close in speed. Which one plays more notes per cycle?', he: 'שני חלקים במהירות קרובה. איזה מהם מנגן יותר צלילים בכל מחזור?' }, names, answer, choices: ['high', 'low'], stimulus: [make(answer)], choiceStim: { high: [make('high')], low: [make('low')] } });
});

// ---------------------------------------------------------------- swing-ratio 3–4

function swing(ratio: number, beat: number, beats: number): Stimulus {
  const out: NoteEvent[] = [];
  const long = (beat * ratio) / (ratio + 1);
  for (let b = 0; b < beats; b++) {
    const t = b * beat;
    out.push(N(41 + (b % 4 === 0 ? 0 : 5), t, beat * 0.8, 0.6));
    out.push(N(82, t, 0.05, 0.55), N(82, t + long, 0.05, 0.4));
  }
  return ev(out, beats * beat + 0.2);
}
/** A walking bass and hi-hat keep time; a piano line sits ahead (on top), behind (laid back) or drifts earlier (rushing). */
function feel(kind: string, beat: number, beats: number): Stimulus {
  const out: NoteEvent[] = [];
  const line = [72, 74, 76, 77, 79, 77, 76, 74];
  for (let b = 0; b < beats; b++) {
    const t = b * beat;
    out.push(N(36 + [0, 4, 7, 9][b % 4], t, beat * 0.85, 0.65));
    if (b % 2 === 1) out.push({ midi: 84, start: t, duration: 0.04, velocity: 0.5, perc: 'hat' });
    const off = kind === 'top' ? -0.028 : kind === 'back' ? 0.05 : -0.013 * b;
    out.push(N(line[b % line.length], Math.max(0, t + off), beat * 0.55, 0.6));
  }
  return ev(out, beats * beat + 0.3);
}
deepen('swing-ratio', [
  { en: 'Swing at fast tempos', he: 'סווינג בטמפו מהיר' },
  { en: 'On top, laid back or rushing?', he: 'על הביט, מאחור או ממהר?' },
], (seed, l, id, level) => {
  const rnd = rng(seed);
  if (l === 1) {
    const S: Record<string, [number, ReturnType<typeof nm>]> = {
      straight: [1, nm('Straight', 'ישר', 'straight eighths', 'even', 'ישר')],
      light: [1.5, nm('Light swing (3:2)', 'סווינג קל (3:2)', 'light swing', 'light', 'קל')],
      triplet: [2, nm('Triplet swing (2:1)', 'סווינג טריולי (2:1)', 'triplet swing', 'triplet', 'טריולה')],
    };
    const pool = ['straight', 'light', 'triplet'];
    const answer = pickR(rnd, pool);
    const beat = 60 / pickR(rnd, [200, 215, 230]);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = S[k][1];
      choiceStim[k] = [swing(S[k][0], beat, 8)];
    }
    return choiceQ({ id, topic: 'swing-ratio', level, seed, skill: 'rhythm-dictation', difficulty: 1750, ask: { en: 'A fast tempo — how are the eighth notes played?', he: 'טמפו מהיר — איך מנוגנות השמיניות?' }, names, answer, choices: pool, stimulus: [swing(S[answer][0], beat, 16)], choiceStim });
  }
  const pool = ['top', 'back', 'rush'];
  const answer = pickR(rnd, pool);
  const beat = 60 / pickR(rnd, [120, 132, 144]);
  const names: Names = {
    top: nm('On top (a little ahead)', 'על הביט (קצת לפני)', 'on top', 'ahead', 'לפני'),
    back: nm('Laid back (a little behind)', 'לייד־בק (קצת מאחור)', 'laid back', 'behind', 'מאחור'),
    rush: nm('Rushing (getting earlier)', 'ממהר (מקדים יותר ויותר)', 'rushing', 'rush', 'ממהר'),
  };
  return choiceQ({ id, topic: 'swing-ratio', level, seed, skill: 'rhythm-dictation', difficulty: 1850, ask: { en: 'Bass and hi-hat keep time. Where does the piano sit?', he: 'הבס וההיי־הט שומרים על הזמן. איפה יושב הפסנתר?' }, names, answer, choices: pool, stimulus: [feel(answer, beat, 12)], choiceStim: Object.fromEntries(pool.map((p) => [p, [feel(p, beat, 12)]])) });
});

// ---------------------------------------------------------------- syncopation 3–4

deepen('syncopation', [
  { en: 'Sixteenth pushes', he: 'דחיפות של שש־עשרית' },
  { en: 'Anticipations across the bar line', he: 'הקדמות מעבר לקו התיבה' },
], (seed, l, id, level) => {
  const rnd = rng(seed);
  const q = 0.5;
  if (l === 1) {
    const make = (pushed: number) => {
      const out: NoteEvent[] = [];
      for (let bar = 0; bar < 2; bar++)
        for (let b = 1; b <= 4; b++) {
          const t = bar * 4 * q + (b - 1) * q;
          out.push(click(t, b === 1));
          for (let s = 0; s < 4; s++) out.push({ midi: 84, start: t + (s * q) / 4, duration: 0.03, velocity: s ? 0.18 : 0.28, perc: 'hat' });
          out.push(N(64, b === pushed ? t - q / 4 : t, q * 0.8, 0.85));
        }
      return ev(out, 8 * q + 0.3);
    };
    const pushed = 2 + Math.floor(rnd() * 3);
    const names: Names = { '2': nm('Beat 2', 'פעמה 2', 'two'), '3': nm('Beat 3', 'פעמה 3', 'three'), '4': nm('Beat 4', 'פעמה 4', 'four') };
    return choiceQ({ id, topic: 'syncopation', level, seed, skill: 'rhythm-dictation', difficulty: 1450, ask: { en: 'One note is a sixteenth early. Which beat?', he: 'צליל אחד מוקדם בשש־עשרית. איזו פעמה?' }, names, answer: String(pushed), choices: ['2', '3', '4'], stimulus: [make(pushed)], choiceStim: { '2': [make(2)], '3': [make(3)], '4': [make(4)] } });
  }
  const make = (bar: number) => {
    const out: NoteEvent[] = [];
    for (let i = 0; i < 16; i++) {
      const t = i * q;
      out.push(click(t, i % 4 === 0));
      if (i === bar * 4 - 1) continue; // beat 4 before the anticipated downbeat is left out (tied over)
      out.push(N(i % 4 === 0 ? 60 : 64, i === bar * 4 ? t - q / 2 : t, q * (i === bar * 4 ? 1.4 : 0.85), 0.85));
    }
    return ev(out, 16 * q + 0.3);
  };
  const keys = ['b2', 'b3', 'b4'];
  const answer = pickR(rnd, keys);
  const names: Names = { b2: nm('Bar 2', 'תיבה 2', 'bar two'), b3: nm('Bar 3', 'תיבה 3', 'bar three'), b4: nm('Bar 4', 'תיבה 4', 'bar four') };
  return choiceQ({ id, topic: 'syncopation', level, seed, skill: 'rhythm-dictation', difficulty: 1550, ask: { en: 'Four bars. One bar\'s beat 1 arrives early — on the "and" of 4 before it. Which bar?', he: 'פעמה 1 אחת מוקדמת. באיזו תיבה?' }, names, answer, choices: keys, stimulus: [make(Number(answer.slice(1)) - 1)], choiceStim: Object.fromEntries(keys.map((k) => [k, [make(Number(k.slice(1)) - 1)]])) });
});

// ---------------------------------------------------------------- downbeat 3–4

const ORD_EN = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const ORD_HE = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי'];
const ORD_SAY = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
deepen('downbeat', [
  { en: 'With a pick-up', he: 'עם אנקרוזה (הקדמה)' },
  { en: 'In 3/4 and 6/8', he: 'ב־3/4 וב־6/8' },
], (seed, l, id, level) => {
  const rnd = rng(seed);
  const tonic = pickR(rnd, [60, 62, 65]);
  if (l === 1) {
    const q = 0.45;
    const make = (p: number) => {
      const out: NoteEvent[] = [];
      const pick = [-1, -3, -5].slice(0, p).reverse(); // steps leading up to the tonic
      pick.forEach((s, i) => out.push(N(tonic + s, i * q, q * 0.45, 0.45)));
      const t0 = p * q;
      const body = [0, 4, 2, 4, 7, 5, 4, 2, 0];
      body.forEach((s, i) => out.push(N(tonic + s, t0 + i * q, i % 4 === 0 ? q * 0.98 : q * 0.45, i % 4 === 0 ? 0.85 : 0.45)));
      return ev(out, t0 + body.length * q + 0.4);
    };
    const pool = ['1', '2', '3'];
    const answer = pickR(rnd, pool);
    const names: Names = {
      '1': nm('One pick-up note', 'צליל הקדמה אחד', 'one', 'one note'),
      '2': nm('Two pick-up notes', 'שני צלילי הקדמה', 'two', 'two notes'),
      '3': nm('Three pick-up notes', 'שלושה צלילי הקדמה', 'three', 'three notes'),
    };
    return choiceQ({ id, topic: 'downbeat', level, seed, skill: 'meter', difficulty: 1300, ask: { en: 'How many pick-up notes before beat 1?', he: 'כמה צלילי הקדמה לפני פעמה 1?' }, names, answer, choices: pool, stimulus: [make(Number(answer))], choiceStim: Object.fromEntries(pool.map((k) => [k, [make(Number(k))]])) });
  }
  const six = rnd() < 0.5;
  const per = six ? 6 : 3;
  const step = six ? 0.22 : 0.45;
  const k = Math.floor(rnd() * per); // the passage starts on pulse k+1 of the bar
  const out: NoteEvent[] = [];
  const n = per * 3;
  for (let i = 0; i < n; i++) {
    const pos = (k + i) % per;
    const t = i * step;
    if (six) {
      out.push(N(tonic + 12 + [0, 2, 4, 7, 4, 2][pos], t, step * 0.8, pos === 0 || pos === 3 ? 0.6 : 0.35));
      if (pos === 0) out.push(N(tonic - 12, t, step * 2.9, 0.75));
    } else out.push(N(tonic + 12 + [0, 4, 7][pos] + (pos === 0 ? 0 : 2), t, pos === 0 ? step * 0.98 : step * 0.45, pos === 0 ? 0.85 : 0.5));
  }
  const answer = String(((per - k) % per) + 1);
  const keys = Array.from({ length: per }, (_, i) => String(i + 1));
  const names: Names = {};
  keys.forEach((c, i) => (names[c] = nm(`The ${ORD_EN[i]} note`, `הצליל ${ORD_HE[i]}`, ORD_SAY[i])));
  return choiceQ({
    id, topic: 'downbeat', level, seed, skill: 'meter', difficulty: 1400,
    ask: six ? { en: 'In 6/8 (two groups of three), starting anywhere. Which of the first six notes is beat 1?', he: 'ב־6/8 (שתי קבוצות של שלוש), מתחילים באמצע. איזה מששת הצלילים הראשונים הוא פעמה 1?' } : { en: 'In 3/4, starting anywhere. Which of the first three notes is beat 1?', he: 'ב־3/4, מתחילים באמצע. איזה משלושת הצלילים הראשונים הוא פעמה 1?' },
    names, answer, choices: keys, stimulus: [ev(out, n * step + 0.3)],
  });
});

// ---------------------------------------------------------------- displacement-3 2–3

/** One bar of 12 sixteenths: clicks on the beats, a note on each onset. */
function grid12(on: number[], bars: number, compound: boolean, step = 0.15): Stimulus {
  const out: NoteEvent[] = [];
  const beats = compound ? [0, 6] : [0, 4, 8];
  for (let b = 0; b < bars; b++) {
    beats.forEach((k, i) => out.push(click((b * 12 + k) * step, i === 0)));
    for (const o of on) out.push(N(64, (b * 12 + o) * step, step * 1.6, 0.8));
  }
  return ev(out, bars * 12 * step + 0.2);
}
const sorted = (xs: number[]) => xs.slice().sort((a, b) => a - b);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const rot = (on: number[], by: number) => sorted(on.map((o) => (((o + by) % 12) + 12) % 12));
const isRotation = (a: number[], b: number[]) => Array.from({ length: 12 }, (_, s) => s).some((s) => same(rot(a, s), b));

const P68 = [
  [0, 4, 6, 10],
  [0, 6, 8],
  [0, 2, 4, 6],
  [0, 4, 6, 8, 10],
  [0, 6, 10],
];
const P34S = [
  [0, 3, 4, 8],
  [0, 2, 3, 6, 8],
  [0, 1, 2, 4, 8],
  [0, 3, 6, 7],
];
deepen('displacement-3', [
  { en: 'Find the shifted version (6/8)', he: 'מצאו את הגרסה המוסטת (6/8)' },
  { en: '3/4 with sixteenths', he: '3/4 עם שש־עשריות' },
], (seed, l, id, level) => {
  const rnd = rng(seed);
  if (l === 1) {
    for (let tries = 0; ; tries++) {
      const p = pickR(rnd, P68);
      const moved = rot(p, pickR(rnd, [2, 4, 6]));
      if (same(moved, p)) continue;
      // Two near-misses: the shifted pattern with one note moved by an eighth — not a shift of the original.
      const near: number[][] = [];
      for (let t = 0; t < 40 && near.length < 2; t++) {
        const i = Math.floor(rnd() * moved.length);
        const x = sorted(moved.map((o, j) => (j === i ? (((o + pickR(rnd, [2, -2])) % 12) + 12) % 12 : o)));
        if (new Set(x).size !== x.length || isRotation(p, x) || near.some((y) => same(x, y))) continue;
        near.push(x);
      }
      if (near.length < 2 && tries < 20) continue;
      const versions = shuffleR(rnd, [{ k: 'r', on: moved }, ...near.map((on, i) => ({ k: `n${i}`, on }))]);
      const answer = `v${versions.findIndex((v) => v.k === 'r') + 1}`;
      const stim: Stimulus[] = [grid12(p, 2, true), rest(0.6), ...versions.flatMap((v, i) => [marker(i + 1), rest(0.25), grid12(v.on, 2, true), rest(0.5)])];
      const names: Names = {
        v1: nm('First', 'הראשונה', 'one', 'first', 'אחת', 'ראשונה'),
        v2: nm('Second', 'השנייה', 'two', 'second', 'שתיים', 'שנייה'),
        v3: nm('Third', 'השלישית', 'three', 'third', 'שלוש', 'שלישית'),
      };
      const keys = versions.map((_, i) => `v${i + 1}`);
      return choiceQ({ id, topic: 'displacement-3', level, seed, skill: 'transpose', difficulty: 1500, ask: { en: 'A 6/8 pattern, then three versions. Which one is the same pattern, only shifted?', he: 'תבנית ב־6/8, ואז שלוש גרסאות. איזו מהן היא אותה תבנית, רק מוסטת?' }, names: Object.fromEntries(keys.map((k) => [k, names[k]])), answer, choices: keys, stimulus: stim });
    }
  }
  const pool = ['s', 'e', 'q'];
  const by: Record<string, number> = { s: 1, e: 2, q: 4 };
  let p: number[], answer: string, moved: number[];
  do {
    p = pickR(rnd, P34S);
    answer = pickR(rnd, pool);
    moved = rot(p, by[answer]);
  } while (same(moved, p) || pool.some((k) => k !== answer && same(rot(p, by[k]), moved)));
  const lab: Record<string, [string, string, string[]]> = {
    s: ['A sixteenth later', 'שש־עשרית מאוחר יותר', ['sixteenth']],
    e: ['An eighth later', 'שמינית מאוחר יותר', ['eighth']],
    q: ['A quarter later', 'רבע מאוחר יותר', ['quarter']],
  };
  const names: Names = {};
  for (const k of pool) names[k] = nm(lab[k][0], lab[k][1], ...lab[k][2]);
  return choiceQ({ id, topic: 'displacement-3', level, seed, skill: 'transpose', difficulty: 1600, ask: { en: 'A 3/4 figure with sixteenths — then moved. How far?', he: 'דמות ב־3/4 עם שש־עשריות — ואז מוסטת. כמה?' }, names, answer, choices: pool, stimulus: [grid12(p, 2, false), rest(0.4), grid12(moved, 2, false)] });
});

// ---------------------------------------------------------------- eastern-rhythm 3–5

const DUM = 43;
const TEK = 79;
function drum(pattern: string, step: number, times: number): Stimulus {
  const out: NoteEvent[] = [];
  for (let r = 0; r < times; r++)
    pattern.split('').forEach((ch, i) => {
      const t = (r * pattern.length + i) * step;
      if (ch === 'D') out.push({ midi: DUM, start: t, duration: 0.18, velocity: 0.9, perc: 'kick' });
      if (ch === 'T') out.push({ midi: TEK, start: t, duration: 0.06, velocity: 0.7, perc: 'snare-soft' });
      if (ch === 't') out.push({ midi: TEK, start: t, duration: 0.05, velocity: 0.4, perc: 'snare-soft' });
    });
  return ev(out, pattern.length * times * step + 0.2);
}
const IQA2: Record<string, { p: string; step: number; name: ReturnType<typeof nm> }> = {
  wahda: { p: 'D--T-T--', step: 0.22, name: nm('Wahda', 'וואחדה', 'wahda', 'wahda sayira', 'ואחדה') },
  ayyub: { p: 'D-tDT-t-', step: 0.13, name: nm('Ayyub', 'איוב', 'ayyub', 'ayoub', 'איוב') },
  chiftetelli: { p: 'D--TT-D-D-T-T---', step: 0.16, name: nm('Chiftetelli', 'צ׳יפטטלי', 'chiftetelli', 'ciftetelli', 'צ׳יפטה טלי') },
  zaffa: { p: 'D-tT-tT-D---T---', step: 0.12, name: nm('Zaffa', 'זפה', 'zaffa', 'zeffa', 'זאפה') },
  samai: { p: 'D--T-DDT--', step: 0.17, name: nm('Samai Thaqil (10/8)', 'סמאעי ת׳קיל (10/8)', 'samai', 'samai thaqil', 'ten eight', 'סמאעי') },
  aksak: { p: 'D-T-D-T--', step: 0.17, name: nm('Aksak (9/8)', 'אקסאק (9/8)', 'aksak', 'nine eight', 'אקסק') },
};
/** 4/4 rhythms tapped at L5 (8 eighths, dum / tek). */
const TAP_IQA: Record<string, { p: string; name: Bi }> = {
  maqsum: { p: 'DT-TD-T-', name: { en: 'Maqsum', he: 'מקסום' } },
  baladi: { p: 'DD-TD-T-', name: { en: 'Baladi', he: 'בלדי' } },
  saidi: { p: 'DT-DD-T-', name: { en: 'Saidi', he: 'סעידי' } },
  malfuf: { p: 'D--T--T-', name: { en: 'Malfuf', he: 'מלפוף' } },
};
/** 8 eighth slots → one-beat cells. */
function slotsToCells(on: boolean[]): CellId[] {
  const out: CellId[] = [];
  for (let b = 0; b < on.length / 2; b++) {
    const [x, y] = [on[2 * b], on[2 * b + 1]];
    out.push(x && y ? 'ee' : x ? 'q' : y ? 'ere' : 'qr');
  }
  return out;
}
deepen(
  'eastern-rhythm',
  [
    { en: 'Wahda, Ayyub, Chiftetelli, Zaffa', he: 'וואחדה, איוב, צ׳יפטטלי, זפה' },
    { en: 'Samai Thaqil 10/8 or Aksak 9/8?', he: 'סמאעי ת׳קיל 10/8 או אקסאק 9/8?' },
    { en: 'Tap it: dum and tek', he: 'הקישו אותו: דום ותק' },
  ],
  (seed, l, id, level) => {
    const rnd = rng(seed);
    if (l <= 2) {
      const pool = l === 1 ? ['wahda', 'ayyub', 'chiftetelli', 'zaffa'] : ['samai', 'aksak'];
      const answer = pickR(rnd, pool);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      const times = (k: string) => Math.max(2, Math.round(3.2 / (IQA2[k].p.length * IQA2[k].step)));
      for (const k of pool) {
        names[k] = IQA2[k].name;
        choiceStim[k] = [drum(IQA2[k].p, IQA2[k].step, times(k))];
      }
      return choiceQ({ id, topic: 'eastern-rhythm', level, seed, skill: 'rhythm-dictation', difficulty: l === 1 ? 1700 : 1800, ask: { en: 'Which rhythm? (low = dum, high = tek)', he: 'איזה מקצב? (נמוך = דום, גבוה = תק)' }, names, answer: answer, choices: shuffleR(rnd, pool), stimulus: [drum(IQA2[answer].p, IQA2[answer].step, times(answer) + 1)], choiceStim });
    }
    const k = pickR(rnd, Object.keys(TAP_IQA));
    const { p, name } = TAP_IQA[k];
    const slots = (c: string) => [...p, ...p].map((x) => x === c);
    const all = [...p, ...p].map((x) => x !== '-');
    const lanes: Lane[] = [
      { rhythm: bars44(...[0, 1].map((b) => slotsToCells(slots('D').slice(8 * b, 8 * b + 8)))), name: { en: 'Dum', he: 'דום' }, perc: 'kick' },
      { rhythm: bars44(...[0, 1].map((b) => slotsToCells(slots('T').slice(8 * b, 8 * b + 8)))), name: { en: 'Tek', he: 'תק' }, perc: 'snare' },
    ];
    const rhythm = bars44(...[0, 1].map((b) => slotsToCells(all.slice(8 * b, 8 * b + 8))));
    const say = (lang: 'en' | 'he') =>
      Array.from({ length: 4 }, (_, b) =>
        p
          .slice(2 * b, 2 * b + 2)
          .split('')
          .map((c) => (c === 'D' ? (lang === 'en' ? 'dum' : 'דום') : c === 'T' ? (lang === 'en' ? 'tek' : 'תק') : '–'))
          .join(' '),
      ).join(' | ');
    return tapQ({
      id, topic: 'eastern-rhythm', level, seed, rlevel: 5, rhythm, bpm: pickR(rnd, [84, 92, 100]), skillAs: 'rhythm-reading', difficulty: 1350,
      prompt: { en: `Tap ${name.en}, twice: dum on the left pad, tek on the right. ${say('en')}`, he: `הקישו ${name.he}, פעמיים: דום בפד השמאלי, תק בימני. ${say('he')}` },
      clicks: { kind: 'beats' }, lanes,
    });
  },
  (l) => (l === 3 ? tg(['rhythm-reading', 'read', 0.6], ['rhythm-dictation', 'world', 0.4]) : tg(['rhythm-dictation', 'world', 1])),
);

// ---------------------------------------------------------------- odd-meter 5 (mixed meter)

function mixed(groupsA: number[], groupsB: number[], step: number, pairs: number): Stimulus {
  const out: NoteEvent[] = [];
  let i = 0;
  for (let r = 0; r < pairs; r++)
    for (const groups of [groupsA, groupsB])
      groups.forEach((g, gi) => {
        for (let k = 0; k < g; k++, i++) {
          const t = i * step;
          if (k === 0) out.push({ midi: gi === 0 ? 45 : 50, start: t, duration: 0.12, velocity: gi === 0 ? 0.9 : 0.65, perc: gi === 0 ? 'kick' : 'snare-soft' });
          out.push({ midi: 84, start: t, duration: 0.04, velocity: k === 0 ? 0.75 : 0.45, perc: 'hat' });
        }
      });
  return ev(out, i * step + 0.2);
}
const MIX: Record<string, [number[], number[], ReturnType<typeof nm>]> = {
  m78_34: [[2, 2, 3], [2, 2, 2], nm('7/8 + 3/4', '7/8 + 3/4', 'seven eight three four', 'seven three')],
  m58_34: [[3, 2], [2, 2, 2], nm('5/8 + 3/4', '5/8 + 3/4', 'five eight three four', 'five three')],
  m78_68: [[2, 2, 3], [3, 3], nm('7/8 + 6/8', '7/8 + 6/8', 'seven eight six eight', 'seven six')],
  m58_68: [[3, 2], [3, 3], nm('5/8 + 6/8', '5/8 + 6/8', 'five eight six eight', 'five six')],
};
deepen('odd-meter', [{ en: 'Mixed meter: which two bars alternate?', he: 'משקל מעורב: אילו שתי תיבות מתחלפות?' }], (seed, _l, id, level) => {
  const rnd = rng(seed);
  const pool = Object.keys(MIX);
  const answer = pickR(rnd, pool);
  const step = 0.17;
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  for (const k of pool) {
    names[k] = MIX[k][2];
    choiceStim[k] = [mixed(MIX[k][0], MIX[k][1], step, 1)];
  }
  return choiceQ({ id, topic: 'odd-meter', level, seed, skill: 'meter', difficulty: 1900, ask: { en: 'Two different bars keep alternating (the kick marks each bar). Which two?', he: 'שתי תיבות שונות מתחלפות (הבס־דראם מסמן כל תיבה). אילו שתיים?' }, names, answer, choices: pool, stimulus: [mixed(MIX[answer][0], MIX[answer][1], step, 3)], choiceStim });
}, () => tg(['meter', 'odd', 1]));
