// Rhythm gaps R-1 and R-5 (docs/AUDIT-CONTENT-THEORY.md §ז.2, §ד.3): the tapped side of cross-rhythm and meter.
//   poly-tap 5–7   two pads: 5 against 4, 5 against 3, 7 against 4 — over a whole bar (the slow hand keeps the beat)
//   metric-tap     metric modulation tapped: the new beat, then "the hands stay, the click moves" (× 3/2, × 2/3, × 4/3)
//   hemiola-tap    the hemiola performed: 3/4 felt in big twos, two hands 3 against 2 across two bars, 6/8 ↔ 3/4,
//                  3+3+2 across the bar line
// The poly-tap ladder now runs 2:1 → 3:2 → 4:3 → swap → 5:4 → 5:3 → 7:4 (the gap: it stopped at 4:3), and the
// metric-modulation ear step (prog-meter L5) gets a tapping stage. Every item is a rhythm-read tap item: count-in,
// click, the written rhythm with its playhead (LiveRhythmStaff per lane), graded by onsets (gradeReading / gradeLanes).
// Pure and seeded.

import './topicsTime2';
import type { ClickPattern, RhythmReadQuestion, SkillId } from './lesson';
import { TOPIC_GEN, rng, pickR } from './topicKit';
import { TOPIC_TAGS, tg, type Tag } from './taxonomy';
import type { CellId, Meter, Rhythm, RhythmLevel } from './rhythm';

type Bi = { en: string; he: string };
type Lane = NonNullable<RhythmReadQuestion['lanes']>[number];

const rep = <T,>(x: T, n: number): T[] => Array.from({ length: n }, () => x);
/** A rhythm from per-bar cell lists. */
export const barsOf = (meter: Meter, ...bars: CellId[][]): Rhythm => ({ beatsPerBar: meter === '3/4' ? 3 : 4, bars: bars.length, cells: bars.flat(), ...(meter !== '4/4' ? { meter } : {}) });

interface Tap {
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
  clicks?: ClickPattern;
  lanes?: Lane[];
}
function tapQ(p: Tap): RhythmReadQuestion {
  return {
    id: p.id,
    kind: 'rhythm-read',
    level: p.rlevel,
    rhythm: p.rhythm,
    bpm: p.bpm,
    show: 'notation',
    choices: [],
    answer: 'accurate',
    stimulus: [], // count-in and clicks come from the performance timeline
    difficulty: p.difficulty,
    prompt: p.prompt,
    skillAs: p.skillAs,
    topic: { id: p.topic, level: p.level, seed: p.seed },
    ...(p.clicks ? { clicks: p.clicks } : {}),
    ...(p.lanes ? { lanes: p.lanes } : {}),
  };
}
const HAND = { left: { en: 'Left hand', he: 'יד שמאל' }, right: { en: 'Right hand', he: 'יד ימין' } };
const BEAT = { en: 'Beat', he: 'פעמה' };

// ---------------------------------------------------------------- poly-tap 5–7 (over the bar)

/** The cross-rhythms over a whole bar: the slow hand keeps the beat, the other spreads n evenly over the bar. */
export const CROSS: { n: number; over: number; meter: Meter; cell: CellId; bpm: number[]; difficulty: number }[] = [
  { n: 5, over: 4, meter: '4/4', cell: 'q5', bpm: [56, 60, 66], difficulty: 1600 },
  { n: 5, over: 3, meter: '3/4', cell: 'q5in3', bpm: [60, 66, 72], difficulty: 1650 },
  { n: 7, over: 4, meter: '4/4', cell: 'q7', bpm: [50, 54, 58], difficulty: 1750 },
];
{
  const base = TOPIC_GEN['poly-tap'];
  const baseN = base.levels.length;
  TOPIC_GEN['poly-tap'] = {
    ...base,
    levels: [...base.levels, { en: '5 against 4, over the bar', he: '5 נגד 4, על פני התיבה' }, { en: '5 against 3, in 3/4', he: '5 נגד 3, ב־3/4' }, { en: '7 against 4', he: '7 נגד 4' }],
    gen(seed, level, id) {
      if (level <= baseN) return base.gen(seed, level, id);
      const L = Math.min(CROSS.length, level - baseN);
      const c = CROSS[L - 1];
      const rnd = rng(seed);
      const bars = 3;
      const beat = barsOf(c.meter, ...rep(rep<CellId>('q', c.over), bars));
      const cross = barsOf(c.meter, ...rep([c.cell], bars));
      const lanes: Lane[] = [
        { rhythm: beat, name: HAND.left, perc: 'kick' },
        { rhythm: cross, name: HAND.right, perc: 'clave' },
      ];
      const prompt: Bi = {
        en: `Two pads. Left hand on the beat (${c.over} a bar); right hand ${c.n} even taps over the same bar — ${c.n} against ${c.over}.`,
        he: `שני פדים. יד שמאל על הפעמה (${c.over} בתיבה); יד ימין ${c.n} הקשות שוות על פני אותה תיבה — ${c.n} נגד ${c.over}.`,
      };
      return tapQ({ id, topic: 'poly-tap', level, seed, rlevel: 8, rhythm: beat, bpm: pickR(rnd, c.bpm), skillAs: 'timing', difficulty: c.difficulty, prompt, clicks: { kind: 'beats' }, lanes });
    },
  };
}

// ---------------------------------------------------------------- metric-tap

/**
 * The metric modulations tapped: what is tapped (cells, before → after the pivot) and the new click (`every` old beats
 * per new beat). New tempo = old × 1 / every: 2/3 → × 3/2, 3/2 → × 2/3, 3/4 → × 4/3.
 */
export const METRIC: { before: CellId; after: CellId; every: number; name: Bi; prompt: Bi; bpm: number[]; difficulty: number; rlevel: RhythmLevel }[] = [
  {
    before: 'q', after: 'qtrip', every: 2 / 3, rlevel: 8, bpm: [60, 66, 72], difficulty: 1500,
    name: { en: 'The triplet quarter becomes the beat (× 3/2)', he: 'רבע הטריולה הופך לפעמה (× 3/2)' },
    prompt: { en: 'Tap the beat for two bars, then quarter triplets. The click moves with you: your triplet is the new beat.', he: 'הקישו את הפעמה שתי תיבות, ואז טריולות רבעים. הקליק עובר איתכם: הטריולה היא הפעמה החדשה.' },
  },
  {
    before: 'trip', after: 'trip', every: 2 / 3, rlevel: 6, bpm: [56, 60, 66], difficulty: 1600,
    name: { en: 'Hands stay, the click moves: the triplet 8th becomes the 8th (× 3/2)', he: 'הידיים נשארות, הקליק זז: שמינית הטריולה הופכת לשמינית (× 3/2)' },
    prompt: { en: 'Keep even triplets all the way. After two bars the click speeds up: two of your taps are one new beat.', he: 'הקישו טריולות שוות כל הזמן. אחרי שתי תיבות הקליק מאיץ: שתי הקשות שלכם הן פעמה חדשה אחת.' },
  },
  {
    before: 'ee', after: 'ee', every: 3 / 2, rlevel: 2, bpm: [72, 80, 88], difficulty: 1650,
    name: { en: 'Hands stay, the click moves: the 8th becomes the triplet 8th (× 2/3)', he: 'הידיים נשארות, הקליק זז: השמינית הופכת לשמינית טריולה (× 2/3)' },
    prompt: { en: 'Keep even 8ths all the way. After two bars the click slows down: three of your taps are one new beat.', he: 'הקישו שמיניות שוות כל הזמן. אחרי שתי תיבות הקליק מאט: שלוש הקשות שלכם הן פעמה חדשה אחת.' },
  },
  {
    before: 'ssss', after: 'ssss', every: 3 / 4, rlevel: 4, bpm: [56, 60, 64], difficulty: 1700,
    name: { en: 'Hands stay, the click moves: the dotted 8th becomes the beat (× 4/3)', he: 'הידיים נשארות, הקליק זז: השמינית המנוקדת הופכת לפעמה (× 4/3)' },
    prompt: { en: 'Keep even 16ths all the way. After two bars the click speeds up: three of your taps are one new beat.', he: 'הקישו שש־עשריות שוות כל הזמן. אחרי שתי תיבות הקליק מאיץ: שלוש הקשות שלכם הן פעמה חדשה אחת.' },
  },
];
/** The tempo ratio a metric-tap level asks for (new ÷ old). */
export const metricRatio = (level: number): number => 1 / METRIC[Math.min(METRIC.length, Math.max(1, level)) - 1].every;

TOPIC_GEN['metric-tap'] = {
  title: { en: 'Metric modulation, tapped', he: 'מודולציה מטרית בהקשה' },
  skill: 'timing',
  levels: METRIC.map((m) => m.name),
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(METRIC.length, Math.max(1, level));
    const m = METRIC[L - 1];
    // Two bars before the pivot, two after; the click follows the new pulse from beat 8.
    const per = m.before === 'qtrip' ? 2 : 1;
    const perAfter = m.after === 'qtrip' ? 2 : 1;
    const rhythm = barsOf('4/4', rep(m.before, 4 / per), rep(m.before, 4 / per), rep(m.after, 4 / perAfter), rep(m.after, 4 / perAfter));
    return tapQ({ id, topic: 'metric-tap', level, seed, rlevel: m.rlevel, rhythm, bpm: pickR(rnd, m.bpm), skillAs: 'timing', difficulty: m.difficulty, prompt: m.prompt, clicks: { kind: 'modulate', atBeat: 8, every: m.every } });
  },
};
TOPIC_TAGS['metric-tap'] = tg(['timing', 'poly', 0.5], ['tempo', 'compare', 0.25], ['meter', 'count', 0.25]);

// ---------------------------------------------------------------- hemiola-tap

/** 3/4: two bars on the beat, two in big twos (1, 3, 2), landing on the next downbeat. */
const HEMI_ONE: CellId[][] = [['q', 'q', 'q'], ['q', 'q', 'q'], ['h', 'q'], ['qr', 'h'], ['dh']];
/** The hemiola itself over two 3/4 bars: half notes on 1, 3 and 2 (onsets 0, 2, 4). */
const HEMI: CellId[][] = [['h', 'q'], ['qr', 'h']];
/** 6/8 then 3/4, written in 3/4: dotted quarters (0, 1.5), then three quarters. */
const SIX_THREE: CellId[][] = [['dqe', 'qr'], ['q', 'q', 'q']];
/** 3+3+2 across two 4/4 bars: dotted quarters, then two quarters (0, 1.5, 3 | 4.5, 6, 7). */
const TRESILLO2: CellId[][] = [['dqe', 'qr', 'q'], ['ere', 'qr', 'q', 'q']];

TOPIC_GEN['hemiola-tap'] = {
  title: { en: 'Hemiola, tapped', he: 'המיולה בהקשה' },
  skill: 'timing',
  levels: [
    { en: '3/4 in big twos', he: '3/4 בשתיים גדולות' },
    { en: 'Two hands: 3 against 2 over two bars', he: 'שתי ידיים: 3 נגד 2 על פני שתי תיבות' },
    { en: '6/8 and 3/4 in turn', he: '6/8 ו־3/4 לסירוגין' },
    { en: '3+3+2 across the bar line', he: '3+3+2 מעבר לקו התיבה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(4, Math.max(1, level));
    const T = 'hemiola-tap';
    if (L === 1) {
      const rhythm = barsOf('3/4', ...HEMI_ONE);
      const prompt = { en: '3/4. Tap the beat for two bars, then the hemiola — every second beat, across the bar line — and land on 1.', he: '3/4. הקישו את הפעמה שתי תיבות, ואז המיולה — כל פעמה שנייה, מעבר לקו התיבה — ונחתו על 1.' };
      return tapQ({ id, topic: T, level, seed, rlevel: 7, rhythm, bpm: pickR(rnd, [88, 96, 104]), skillAs: 'timing', difficulty: 1200, prompt, clicks: { kind: 'beats' } });
    }
    if (L === 2) {
      const beat = barsOf('3/4', ...rep(['q', 'q', 'q'] as CellId[], 4));
      const hemi = barsOf('3/4', ...HEMI, ...HEMI);
      const lanes: Lane[] = [
        { rhythm: beat, name: BEAT, perc: 'kick' },
        { rhythm: hemi, name: { en: 'Hemiola', he: 'המיולה' }, perc: 'clave' },
      ];
      const prompt = { en: 'Two pads in 3/4. Left: every beat. Right: every second beat — three across two bars.', he: 'שני פדים ב־3/4. שמאל: כל פעמה. ימין: כל פעמה שנייה — שלוש על פני שתי תיבות.' };
      return tapQ({ id, topic: T, level, seed, rlevel: 7, rhythm: beat, bpm: pickR(rnd, [80, 88, 96]), skillAs: 'timing', difficulty: 1300, prompt, clicks: { kind: 'beats' }, lanes });
    }
    if (L === 3) {
      const rhythm = barsOf('3/4', ...SIX_THREE, ...SIX_THREE);
      const prompt = { en: 'One bar in two (6/8), one bar in three (3/4), in turn. The click marks only beat 1.', he: 'תיבה בשתיים (6/8), תיבה בשלוש (3/4), לסירוגין. הקליק מסמן רק את 1.' };
      return tapQ({ id, topic: T, level, seed, rlevel: 7, rhythm, bpm: pickR(rnd, [96, 104, 112]), skillAs: 'timing', difficulty: 1350, prompt, clicks: { kind: 'one' } });
    }
    const beat = barsOf('4/4', ...rep(['q', 'q', 'q', 'q'] as CellId[], 4));
    const grp = barsOf('4/4', ...TRESILLO2, ...TRESILLO2);
    const lanes: Lane[] = [
      { rhythm: beat, name: BEAT, perc: 'kick' },
      { rhythm: grp, name: { en: '3+3+2', he: '3+3+2' }, perc: 'clave' },
    ];
    const prompt = { en: 'Two pads. Left on the beat. Right in eighth groups 3+3+3+3+2+2 — across the bar line, home every two bars.', he: 'שני פדים. שמאל על הפעמה. ימין בקבוצות שמיניות 3+3+3+3+2+2 — מעבר לקו התיבה, חוזרים הביתה כל שתי תיבות.' };
    return tapQ({ id, topic: T, level, seed, rlevel: 5, rhythm: beat, bpm: pickR(rnd, [76, 84, 92]), skillAs: 'timing', difficulty: 1450, prompt, clicks: { kind: 'beats' }, lanes });
  },
};
TOPIC_TAGS['hemiola-tap'] = (l: number): Tag[] => (l === 4 ? tg(['timing', 'poly', 0.6], ['meter', 'odd', 0.4]) : tg(['timing', 'poly', 0.5], ['meter', 'hemiola', 0.5]));
