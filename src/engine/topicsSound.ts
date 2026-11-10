// Sound & production ear (spec AE §4.4, review §10): EQ, filters, naming a frequency, room and echo, pan and
// width, compression and drive. Every sound is an `fx` stimulus (a synthesised source through an effect chain,
// rendered by audio/fx.ts). R1: everything is loudness-matched (`matchTo` = the reference chain) except the
// `dyn-ear` "which is louder" level. R2: L1 of eq-ear / filter-ear is speaker-safe (≥ 500 Hz, no stereo).
// "Match it" levels (eq-ear 7, filter-ear 3, dyn-ear 6) are choice items with graded settings until a slider
// answer type exists. Pure and seeded.

import { marker, type ChoiceQuestion, type Stimulus } from './lesson';
import { fxSpec, type FxChain, type FxFilter, type FxPart, type FxSource, type FxSpec } from './fx';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };

/** Source length (s) per source; the loop / drums are two bars at the item's tempo. */
const SRC: Record<FxSource, number> = { pink: 2.2, loop: 4, drums: 4, voice: 3, sine: 1.6 };
const fxs = (fx: FxSpec): Stimulus => ({ kind: 'fx', fx });

interface Base {
  source: FxSource;
  seed: number;
  bpm?: number;
  sineHz?: number;
  parts?: FxPart[];
  partPan?: Partial<Record<FxPart, number>>;
}
/** A spec of `base` through `chain`, loudness-matched to `match` (undefined = play as is). */
function S(base: Base, chain: FxChain, match: FxChain | null = {}): FxSpec {
  const src = base.bpm && (base.source === 'loop' || base.source === 'drums') ? (8 * 60) / base.bpm : SRC[base.source];
  return fxSpec({ ...base, src: Math.round(src * 100) / 100, chain, ...(match ? { matchTo: match } : {}) });
}
/** A then B with the option bells. */
const ab = (a: FxSpec, b: FxSpec): Stimulus[] => [marker(1), fxs(a), marker(2), fxs(b)];

const OCT = [125, 250, 500, 1000, 2000, 4000, 8000];
const THIRD = [200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000];
const hz = (f: number) => (f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`);
const hzHe = (f: number) => (f >= 1000 ? `${f / 1000} קילו-הרץ` : `${f} הרץ`);
const hzSay = (f: number) => [`${f} hertz`, ...(f >= 1000 ? [`${f / 1000} kilohertz`] : [])];
const fid = (f: number) => `f${f}`;
const hzName = (f: number) => nm(hz(f), hzHe(f), ...hzSay(f));
/** `n` consecutive entries of `list` that contain index `i` (window start seeded). */
function windowAround(rnd: () => number, list: number[], i: number, n: number): number[] {
  const lo = Math.max(0, i - n + 1);
  const hi = Math.min(i, list.length - n);
  const start = lo + Math.floor(rnd() * (hi - lo + 1));
  return list.slice(start, start + n);
}
const peak = (freq: number, gain: number, q = 1.4): FxFilter => ({ type: 'peaking', freq, gain, q });
const bpmOf = (rnd: () => number) => 96 + Math.floor(rnd() * 5) * 6; // 96–120
const seedOf = (rnd: () => number) => Math.floor(rnd() * 2 ** 31);

interface Item {
  ask: Bi;
  names: Names;
  answer: string;
  choices: string[];
  stimulus: Stimulus[];
  choiceStim?: Record<string, Stimulus[]>;
  text?: Bi;
}
function make(topic: string, id: string, seed: number, level: number, difficulty: number, it: Item): ChoiceQuestion {
  return choiceQ({ id, topic, level, seed, skill: 'timbre', difficulty, ...it });
}
/** Choice sounds: one spec per option. */
const perChoice = (ids: string[], f: (id: string) => FxSpec) => Object.fromEntries(ids.map((c) => [c, [fxs(f(c))]]));

/** A/B item: A = reference, B = one option's version; every option can be heard. */
function abItem(ask: Bi, names: Names, choices: string[], answer: string, ref: FxSpec, version: (c: string) => FxSpec, text?: Bi): Item {
  return { ask, names, choices, answer, stimulus: ab(ref, version(answer)), choiceStim: perChoice(choices, version), ...(text ? { text } : {}) };
}
/** One-sound item: hear it, name it. */
function oneItem(ask: Bi, names: Names, choices: string[], answer: string, version: (c: string) => FxSpec, text?: Bi): Item {
  return { ask, names, choices, answer, stimulus: [fxs(version(answer))], choiceStim: perChoice(choices, version), ...(text ? { text } : {}) };
}

// ======================================================================= EQ

const EQ_LEVELS: Bi[] = [
  { en: 'A boost: low, middle or high?', he: 'הגברה: נמוכים, אמצע או גבוהים?' },
  { en: 'Octave bands, 125 Hz – 8 kHz', he: 'פסי אוקטבה, 125 הרץ – 8 קילו-הרץ' },
  { en: 'On a band loop', he: 'על לופ של להקה' },
  { en: 'Boost or cut, and where', he: 'הגברה או הנמכה, ואיפה' },
  { en: 'Third-octave neighbors', he: 'שכנים בשליש אוקטבה' },
  { en: 'How much? (+3 to +12 dB)', he: 'כמה? (‎+3 עד ‎+12 dB)' },
  { en: 'Match it', he: 'להתאים את הסאונד' },
];
const BAND3: Record<string, { f: number; en: string; he: string; say: string[] }> = {
  low: { f: 500, en: 'Low', he: 'נמוכים', say: ['low', 'lows', 'bass'] },
  mid: { f: 2000, en: 'Middle', he: 'אמצע', say: ['middle', 'mid', 'mids'] },
  high: { f: 8000, en: 'High', he: 'גבוהים', say: ['high', 'highs', 'treble'] },
};

function eqGen(seed: number, level: number, id: string): ChoiceQuestion {
  const rnd = rng(seed);
  const T = 'eq-ear';
  const pinkB: Base = { source: 'pink', seed: seedOf(rnd) };
  const loopB = (): Base => ({ source: 'loop', seed: seedOf(rnd), bpm: bpmOf(rnd) });
  const askAB: Bi = { en: 'A is the plain sound, B has an EQ boost. Where is the boost?', he: 'A הוא הסאונד הנקי, ב-B יש הגברה באקולייזר. איפה ההגברה?' };
  if (level === 1) {
    const choices = ['low', 'mid', 'high'];
    const answer = pickR(rnd, choices);
    const names: Names = Object.fromEntries(choices.map((c) => [c, nm(BAND3[c].en, BAND3[c].he, ...BAND3[c].say)]));
    return make(T, id, seed, level, 900, abItem(askAB, names, choices, answer, S(pinkB, {}), (c) => S(pinkB, { eq: [peak(BAND3[c].f, 12, 1)] })));
  }
  if (level === 2 || level === 3) {
    const i = Math.floor(rnd() * OCT.length);
    const opts = windowAround(rnd, OCT, i, 4);
    const base = level === 2 ? pinkB : loopB();
    const names: Names = Object.fromEntries(opts.map((f) => [fid(f), hzName(f)]));
    return make(T, id, seed, level, level === 2 ? 1100 : 1200, abItem(askAB, names, opts.map(fid), fid(OCT[i]), S(base, {}), (c) => S(base, { eq: [peak(+c.slice(1), 9)] })));
  }
  if (level === 4) {
    const base = loopB();
    const bands: [string, number, string, string][] = [['low', 250, 'low', 'נמוכים'], ['mid', 1000, 'middle', 'אמצע'], ['high', 4000, 'high', 'גבוהים']];
    const choices: string[] = [];
    const names: Names = {};
    for (const [k, , en, he] of bands)
      for (const dir of ['boost', 'cut']) {
        choices.push(`${dir}-${k}`);
        names[`${dir}-${k}`] = nm(`${dir === 'boost' ? 'Boost' : 'Cut'} the ${en}`, `${dir === 'boost' ? 'הגברה ב' : 'הנמכה ב'}${he}`, `${dir} ${en}`);
      }
    const answer = pickR(rnd, choices);
    const freq = (c: string) => bands.find((b) => b[0] === c.split('-')[1])![1];
    return make(T, id, seed, level, 1300, abItem({ en: 'B went through an EQ. Boost or cut, where?', he: 'B עבר EQ. הגברה או הנמכה, ואיפה?' }, names, choices, answer, S(base, {}), (c) => S(base, { eq: [peak(freq(c), c.startsWith('boost') ? 9 : -12, 1.2)] })));
  }
  if (level === 5) {
    const i = Math.floor(rnd() * THIRD.length);
    const opts = windowAround(rnd, THIRD, i, 3);
    const names: Names = Object.fromEntries(opts.map((f) => [fid(f), hzName(f)]));
    return make(T, id, seed, level, 1500, abItem(askAB, names, opts.map(fid), fid(THIRD[i]), S(pinkB, {}), (c) => S(pinkB, { eq: [peak(+c.slice(1), 10, 4.3)] })));
  }
  const f = pickR(rnd, [500, 1000, 2000, 4000]);
  const text: Bi = { en: `EQ boost at ${hz(f)}`, he: `הגברה ב-${hzHe(f)}` };
  if (level === 6) {
    const gains = [3, 6, 9, 12];
    const g = pickR(rnd, gains);
    const names: Names = Object.fromEntries(gains.map((x) => [`g${x}`, nm(`+${x} dB`, `‎+${x} דציבל`, `${x} db`, `${x} decibels`)]));
    const base = pickR(rnd, [pinkB, loopB()]);
    return make(T, id, seed, level, 1550, abItem({ en: `A is plain, B has a boost at ${hz(f)}. How big is the boost?`, he: `A נקי, ב-B יש הגברה ב-${hzHe(f)}. כמה גדולה ההגברה?` }, names, gains.map((x) => `g${x}`), `g${g}`, S(base, {}), (c) => S(base, { eq: [peak(f, +c.slice(1), 1.4)] }), text));
  }
  // L7 — match it: a target sound; the settings are the options (a slider later).
  const gains = [2, 4, 6, 8, 10];
  const g = pickR(rnd, gains);
  const base = loopB();
  const names: Names = Object.fromEntries(gains.map((x) => [`g${x}`, nm(`+${x} dB`, `‎+${x} דציבל`, `${x} db`, `${x} decibels`)]));
  return make(T, id, seed, level, 1650, oneItem({ en: `This mix has a boost at ${hz(f)}. Try the settings: which one matches it?`, he: `במיקס הזה יש הגברה ב-${hzHe(f)}. נסו את ההגדרות: איזו מתאימה?` }, names, gains.map((x) => `g${x}`), `g${g}`, (c) => S(base, { eq: [peak(f, +c.slice(1), 1.4)] }), text));
}

TOPIC_GEN['eq-ear'] = { title: { en: 'Which frequencies?', he: 'אילו תדרים?' }, skill: 'timbre', levels: EQ_LEVELS, gen: eqGen };

// ======================================================================= FILTERS

const FILTER_STEPS = [315, 500, 800, 1250, 2000, 3150, 5000]; // 2/3-octave steps
TOPIC_GEN['filter-ear'] = {
  title: { en: 'Cut-off', he: 'תדר חיתוך' },
  skill: 'timbre',
  levels: [
    { en: 'High-pass or low-pass?', he: 'היי-פאס או לואו-פאס?' },
    { en: 'Where is the cut-off?', he: 'איפה תדר החיתוך?' },
    { en: 'Match it', he: 'להתאים את הסאונד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const T = 'filter-ear';
    const type: 'highpass' | 'lowpass' = rnd() < 0.5 ? 'highpass' : 'lowpass';
    const tEn = type === 'highpass' ? 'high-pass' : 'low-pass';
    const tHe = type === 'highpass' ? 'היי-פאס' : 'לואו-פאס';
    const filt = (freq: number, t = type): FxFilter => ({ type: t, freq, q: 0.9 });
    if (level === 1) {
      const base: Base = { source: 'pink', seed: seedOf(rnd) };
      const f = pickR(rnd, [1000, 1600, 2000]);
      const names: Names = { highpass: nm('High-pass (thinner)', 'היי-פאס (דק יותר)', 'high pass', 'high-pass', 'thinner'), lowpass: nm('Low-pass (darker)', 'לואו-פאס (כהה יותר)', 'low pass', 'low-pass', 'darker') };
      return make(T, id, seed, level, 900, abItem({ en: 'B is filtered. High-pass or low-pass?', he: 'B מסונן. היי-פאס או לואו-פאס?' }, names, ['highpass', 'lowpass'], type, S(base, {}), (c) => S(base, { eq: [filt(f, c as 'highpass' | 'lowpass')] })));
    }
    const base: Base = level === 2 ? { source: 'pink', seed: seedOf(rnd) } : { source: 'loop', seed: seedOf(rnd), bpm: bpmOf(rnd) };
    const text: Bi = { en: `A ${tEn} filter`, he: `פילטר ${tHe}` };
    if (level === 2) {
      const list = [250, 500, 1000, 2000, 4000];
      const i = Math.floor(rnd() * list.length);
      const opts = windowAround(rnd, list, i, 4);
      const names: Names = Object.fromEntries(opts.map((f) => [fid(f), hzName(f)]));
      return make(T, id, seed, level, 1200, abItem({ en: `A is plain, B went through a ${tEn} filter. Where is the cut-off?`, he: `A נקי, B עבר פילטר ${tHe}. איפה תדר החיתוך?` }, names, opts.map(fid), fid(list[i]), S(base, {}), (c) => S(base, { eq: [filt(+c.slice(1))] }), text));
    }
    const i = Math.floor(rnd() * FILTER_STEPS.length);
    const opts = windowAround(rnd, FILTER_STEPS, i, 5);
    const names: Names = Object.fromEntries(opts.map((f) => [fid(f), hzName(f)]));
    return make(T, id, seed, level, 1450, oneItem({ en: `This mix has a ${tEn} filter. Try the cut-offs: which one matches it?`, he: `במיקס הזה יש פילטר ${tHe}. נסו את תדרי החיתוך: איזה מתאים?` }, names, opts.map(fid), fid(FILTER_STEPS[i]), (c) => S(base, { eq: [filt(+c.slice(1))] }), text));
  },
};

// ======================================================================= NAME THE FREQUENCY

TOPIC_GEN['tone-hz'] = {
  title: { en: 'Name the frequency', he: 'לזהות את התדר' },
  skill: 'timbre',
  levels: [
    { en: '250 Hz, 1 kHz or 4 kHz?', he: '250 הרץ, 1 קילו-הרץ או 4 קילו-הרץ?' },
    { en: 'Octave bands', he: 'פסי אוקטבה' },
    { en: 'Third-octave', he: 'שליש אוקטבה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    let opts: number[];
    let ans: number;
    if (level === 1) {
      opts = [250, 1000, 4000];
      ans = pickR(rnd, opts);
    } else if (level === 2) {
      const i = Math.floor(rnd() * OCT.length);
      ans = OCT[i];
      opts = windowAround(rnd, OCT, i, 4);
    } else {
      const i = Math.floor(rnd() * THIRD.length);
      ans = THIRD[i];
      opts = windowAround(rnd, THIRD, i, 3);
    }
    const names: Names = Object.fromEntries(opts.map((f) => [fid(f), hzName(f)]));
    const tone = (c: string): FxSpec => S({ source: 'sine', seed: 0, sineHz: +c.slice(1) }, {}, null);
    return make('tone-hz', id, seed, level, [1000, 1300, 1600][level - 1], oneItem({ en: 'A pure tone. What is its frequency?', he: 'צליל טהור. מה התדר שלו?' }, names, opts.map(fid), fid(ans), tone));
  },
};

// ======================================================================= ROOM AND ECHO

const ROOMS: Record<string, { decay: number; mix: number; en: string; he: string; say: string[] }> = {
  room: { decay: 0.6, mix: 0.35, en: 'Small room', he: 'חדר קטן', say: ['room', 'small room'] },
  hall: { decay: 2.2, mix: 0.4, en: 'Concert hall', he: 'אולם קונצרטים', say: ['hall', 'concert hall'] },
  cathedral: { decay: 5, mix: 0.45, en: 'Cathedral', he: 'קתדרלה', say: ['cathedral', 'church'] },
};
TOPIC_GEN['space-ear'] = {
  title: { en: 'Room and echo', he: 'חלל והד' },
  skill: 'timbre',
  levels: [
    { en: 'Dry or with reverb?', he: 'יבש או עם ריוורב?' },
    { en: 'Small room, hall or cathedral?', he: 'חדר קטן, אולם או קתדרלה?' },
    { en: 'Delay: quarter, eighth or dotted eighth?', he: 'דיליי: רבע, שמינית או שמינית מנוקדת?' },
    { en: 'More or less reverb than before?', he: 'יותר או פחות ריוורב מקודם?' },
    { en: 'Shorter or longer decay?', he: 'זנב קצר יותר או ארוך יותר?' },
    { en: 'Pre-delay', he: 'פרי-דיליי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const T = 'space-ear';
    const drums: Base = { source: 'drums', seed: seedOf(rnd), bpm: bpmOf(rnd) };
    const voice: Base = { source: 'voice', seed: seedOf(rnd), bpm: bpmOf(rnd) };
    if (level === 1) {
      const names: Names = { dry: nm('Dry', 'יבש', 'dry', 'no reverb'), wet: nm('With reverb', 'עם ריוורב', 'reverb', 'wet') };
      const answer = rnd() < 0.5 ? 'dry' : 'wet';
      const base = pickR(rnd, [drums, voice]);
      return make(T, id, seed, level, 850, oneItem({ en: 'Is this sound dry, or does it ring in a room (reverb)?', he: 'הסאונד הזה יבש, או שהוא מהדהד בחלל (ריוורב)?' }, names, ['dry', 'wet'], answer, (c) => S(base, c === 'wet' ? { reverb: { decay: 1.8, mix: 0.45 } } : {})));
    }
    if (level === 2) {
      const choices = Object.keys(ROOMS);
      const names: Names = Object.fromEntries(choices.map((c) => [c, nm(ROOMS[c].en, ROOMS[c].he, ...ROOMS[c].say)]));
      return make(T, id, seed, level, 1100, oneItem({ en: 'Where was this played: a small room, a hall or a cathedral?', he: 'איפה ניגנו את זה: בחדר קטן, באולם או בקתדרלה?' }, names, choices, pickR(rnd, choices), (c) => S(drums, { reverb: { decay: ROOMS[c].decay, mix: ROOMS[c].mix } })));
    }
    if (level === 3) {
      const beat = 60 / voice.bpm!;
      const times: Record<string, number> = { quarter: beat, eighth: beat / 2, dotted: beat * 0.75 };
      const names: Names = { quarter: nm('Quarter note', 'רבע', 'quarter', 'quarter note'), eighth: nm('Eighth note', 'שמינית', 'eighth', 'eighth note'), dotted: nm('Dotted eighth', 'שמינית מנוקדת', 'dotted eighth', 'dotted') };
      const choices = ['quarter', 'eighth', 'dotted'];
      return make(T, id, seed, level, 1250, oneItem({ en: 'A note every two beats, then its echoes. How long is the delay?', he: 'צליל כל שתי פעמות, ואחריו ההדים שלו. מה אורך הדיליי?' }, names, choices, pickR(rnd, choices), (c) => S(voice, { delay: { time: Math.round(times[c] * 1000) / 1000, feedback: 0.35, mix: 0.5 } }), { en: `${voice.bpm} BPM`, he: `${voice.bpm} BPM` }));
    }
    if (level === 4) {
      const m = pickR(rnd, [0.25, 0.3]);
      const decay = pickR(rnd, [1.6, 2.2]);
      const A: FxChain = { reverb: { decay, mix: m } };
      const ver: Record<string, FxChain> = { more: { reverb: { decay, mix: Math.round(m * 2 * 100) / 100 } }, less: { reverb: { decay, mix: Math.round((m / 2.2) * 100) / 100 } } };
      const names: Names = { more: nm('More reverb', 'יותר ריוורב', 'more'), less: nm('Less reverb', 'פחות ריוורב', 'less') };
      return make(T, id, seed, level, 1300, abItem({ en: 'Does B have more or less reverb than A?', he: 'ב-B יש יותר או פחות ריוורב מאשר ב-A?' }, names, ['more', 'less'], rnd() < 0.5 ? 'more' : 'less', S(voice, A), (c) => S(voice, ver[c], A)));
    }
    if (level === 5) {
      const d = pickR(rnd, [1, 1.3, 1.6]);
      const A: FxChain = { reverb: { decay: d, mix: 0.45 } };
      const ver: Record<string, FxChain> = { longer: { reverb: { decay: Math.round(d * 2 * 10) / 10, mix: 0.45 } }, shorter: { reverb: { decay: Math.round((d / 2) * 10) / 10, mix: 0.45 } } };
      const names: Names = { longer: nm('Longer decay', 'זנב ארוך יותר', 'longer', 'long'), shorter: nm('Shorter decay', 'זנב קצר יותר', 'shorter', 'short') };
      const base = pickR(rnd, [drums, voice]);
      return make(T, id, seed, level, 1400, abItem({ en: 'Listen to the tail after the sound stops. Is B\'s reverb shorter or longer than A\'s?', he: 'הזנב של B: קצר או ארוך מזה של A?' }, names, ['longer', 'shorter'], rnd() < 0.5 ? 'longer' : 'shorter', S(base, A), (c) => S(base, ver[c], A)));
    }
    const pd: Record<string, number> = { none: 0, short: 0.06, long: 0.15 };
    const names: Names = { none: nm('No pre-delay', 'בלי פרי-דיליי', 'none', 'no pre delay'), short: nm('Short pre-delay (60 ms)', 'פרי-דיליי קצר (60 מ״ש)', 'short'), long: nm('Long pre-delay (150 ms)', 'פרי-דיליי ארוך (150 מ״ש)', 'long') };
    const choices = ['none', 'short', 'long'];
    return make(T, id, seed, level, 1500, oneItem({ en: 'How long is the pre-delay?', he: 'כמה ארוך הפרי-דיליי?' }, names, choices, pickR(rnd, choices), (c) => S(drums, { reverb: { decay: 1.6, mix: 0.5, predelay: pd[c] } })));
  },
};

// ======================================================================= PAN AND WIDTH

TOPIC_GEN['pan-ear'] = {
  title: { en: 'Left or right', he: 'שמאל או ימין' },
  skill: 'timbre',
  levels: [
    { en: 'Left, center or right?', he: 'שמאל, מרכז או ימין?' },
    { en: 'Five positions', he: 'חמישה מקומות' },
    { en: 'Which instrument is on the left?', he: 'איזה כלי נמצא משמאל?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const T = 'pan-ear';
    const askPan: Bi = { en: 'Headphones on. Where is the sound: left, center or right?', he: 'שימו אוזניות. איפה הסאונד: שמאל, מרכז או ימין?' };
    if (level <= 2) {
      const base: Base = { source: pickR(rnd, ['voice', 'pink'] as FxSource[]), seed: seedOf(rnd), bpm: bpmOf(rnd) };
      const pos: Record<string, [number, string, string, string[]]> =
        level === 1
          ? { left: [-0.8, 'Left', 'שמאל', ['left']], centre: [0, 'Center', 'מרכז', ['centre', 'center', 'middle']], right: [0.8, 'Right', 'ימין', ['right']] }
          : {
              hl: [-1, 'Hard left', 'שמאל לגמרי', ['hard left', 'far left']],
              l: [-0.5, 'Half left', 'חצי שמאלה', ['half left', 'slightly left']],
              c: [0, 'Center', 'מרכז', ['centre', 'center', 'middle']],
              r: [0.5, 'Half right', 'חצי ימינה', ['half right', 'slightly right']],
              hr: [1, 'Hard right', 'ימין לגמרי', ['hard right', 'far right']],
            };
      const choices = Object.keys(pos);
      const names: Names = Object.fromEntries(choices.map((c) => [c, nm(pos[c][1], pos[c][2], ...pos[c][3])]));
      return make(T, id, seed, level, level === 1 ? 850 : 1100, oneItem(askPan, names, choices, pickR(rnd, choices), (c) => S(base, { pan: pos[c][0] }, { pan: 0 })));
    }
    const parts: FxPart[] = ['drums', 'bass', 'keys'];
    const names: Names = { drums: nm('Drums', 'תופים', 'drums'), bass: nm('Bass', 'בס', 'bass'), keys: nm('Keys', 'קלידים', 'keys', 'piano', 'keyboard') };
    const right = shuffleR(rnd, [0, 0.5]);
    const base = { source: 'loop' as const, seed: seedOf(rnd), bpm: bpmOf(rnd) };
    const mix = (c: string): FxSpec => {
      const others = parts.filter((p) => p !== c);
      return S({ ...base, partPan: { [c]: -0.85, [others[0]]: right[0], [others[1]]: right[1] } }, {});
    };
    return make(T, id, seed, level, 1250, oneItem({ en: 'Headphones on. Which instrument of the band is panned to the left?', he: 'שימו אוזניות. איזה כלי בלהקה נמצא בפאן שמאלה?' }, names, parts, pickR(rnd, parts), mix));
  },
};

TOPIC_GEN['width-ear'] = {
  title: { en: 'Wide or narrow', he: 'רחב או צר' },
  skill: 'timbre',
  levels: [
    { en: 'Mono or stereo?', he: 'מונו או סטריאו?' },
    { en: 'Narrow, medium or wide?', he: 'צר, בינוני או רחב?' },
    { en: 'Which one is wider?', he: 'איזה מהם רחב יותר?' },
    { en: 'Match it', he: 'להתאים את הרוחב' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base: Base = { source: 'loop', seed: seedOf(rnd), bpm: bpmOf(rnd) };
    if (level === 3) {
      const pair = pickR(rnd, [[0.5, 1], [1, 1.6], [0.7, 1.3]]);
      const wider = rnd() < 0.5 ? 'a' : 'b';
      const [wa, wb] = wider === 'a' ? [pair[1], pair[0]] : pair;
      const names: Names = { a: nm('A (first)', 'א (הראשון)', 'a', 'first'), b: nm('B (second)', 'ב (השני)', 'b', 'second') };
      return make('width-ear', id, seed, level, 1400, { ask: { en: 'Headphones on. The same mix twice: which one is wider?', he: 'שימו אוזניות. אותו מיקס פעמיים: איזה רחב יותר?' }, names, choices: ['a', 'b'], answer: wider, stimulus: ab(S(base, { width: wa }, { width: 1 }), S(base, { width: wb }, { width: 1 })) });
    }
    if (level === 4) {
      const ws = [0, 0.6, 1.2, 1.8];
      const names: Names = Object.fromEntries(ws.map((x) => [`w${x * 10}`, nm(`Width ${Math.round(x * 100)}%`, `רוחב ${Math.round(x * 100)}%`, `${Math.round(x * 100)} percent`)]));
      const choices = ws.map((x) => `w${x * 10}`);
      return make('width-ear', id, seed, level, 1550, oneItem({ en: 'Headphones on. Try the widths: which one matches this mix?', he: 'שימו אוזניות. נסו את הרוחבים: איזה מתאים למיקס הזה?' }, names, choices, pickR(rnd, choices), (c) => S(base, { width: +c.slice(1) / 10 }, { width: 1 })));
    }
    const w: Record<string, [number, string, string, string[]]> =
      level === 1
        ? { mono: [0, 'Mono', 'מונו', ['mono']], stereo: [1.3, 'Stereo', 'סטריאו', ['stereo']] }
        : { narrow: [0.35, 'Narrow', 'צר', ['narrow']], medium: [1, 'Medium', 'בינוני', ['medium', 'normal']], wide: [1.8, 'Wide', 'רחב', ['wide']] };
    const choices = Object.keys(w);
    const names: Names = Object.fromEntries(choices.map((c) => [c, nm(w[c][1], w[c][2], ...w[c][3])]));
    return make('width-ear', id, seed, level, level === 1 ? 1000 : 1250, oneItem({ en: 'Headphones on. How wide is this mix?', he: 'שימו אוזניות. כמה רחב המיקס הזה?' }, names, choices, pickR(rnd, choices), (c) => S(base, { width: w[c][0] }, { width: 1 })));
  },
};

// ======================================================================= COMPRESSION AND DRIVE

const HEAVY = { threshold: -32, ratio: 10, attack: 0.002, release: 0.08 };
TOPIC_GEN['dyn-ear'] = {
  title: { en: 'Squash and grit', he: 'דחיסה ולכלוך' },
  skill: 'timbre',
  levels: [
    { en: 'Compressed or not? (drums)', he: 'דחוס או לא? (תופים)' },
    { en: 'None, light or heavy?', he: 'בלי, קל או כבד?' },
    { en: 'Clean, drive or fuzz?', he: 'נקי, דרייב או פאז?' },
    { en: 'Which is louder? (1–3 dB)', he: 'מה חזק יותר? (1–3 dB)' },
    { en: 'Fast or slow attack? (drums)', he: 'אטאק מהיר או איטי? (תופים)' },
    { en: 'Match it', he: 'להתאים את הסאונד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const T = 'dyn-ear';
    const drums: Base = { source: 'drums', seed: seedOf(rnd), bpm: bpmOf(rnd) };
    if (level === 1) {
      const names: Names = { comp: nm('Compressed', 'דחוס', 'compressed', 'compression'), none: nm('Not compressed', 'לא דחוס', 'not compressed', 'same', 'no') };
      return make(T, id, seed, level, 950, abItem({ en: 'Is B compressed, or the same?', he: 'B דחוס, או זהה?' }, names, ['comp', 'none'], rnd() < 0.5 ? 'comp' : 'none', S(drums, {}), (c) => S(drums, c === 'comp' ? { comp: HEAVY } : {})));
    }
    if (level === 2) {
      const ch: Record<string, FxChain> = { none: {}, light: { comp: { threshold: -18, ratio: 3, attack: 0.01, release: 0.15 } }, heavy: { comp: HEAVY } };
      const names: Names = { none: nm('No compression', 'בלי קומפרסיה', 'none', 'no compression'), light: nm('Light compression', 'קומפרסיה קלה', 'light'), heavy: nm('Heavy compression', 'קומפרסיה כבדה', 'heavy') };
      const choices = ['none', 'light', 'heavy'];
      return make(T, id, seed, level, 1100, abItem({ en: 'A is the raw drums. How much is B compressed?', he: 'A הם התופים הגולמיים. כמה B דחוס?' }, names, choices, pickR(rnd, choices), S(drums, {}), (c) => S(drums, ch[c])));
    }
    if (level === 3) {
      const base: Base = pickR(rnd, [{ source: 'voice', seed: seedOf(rnd), bpm: bpmOf(rnd) }, { source: 'loop', seed: seedOf(rnd), bpm: bpmOf(rnd) }] as Base[]);
      const d: Record<string, number> = { clean: 0, drive: 0.35, fuzz: 1 };
      const names: Names = { clean: nm('Clean', 'נקי', 'clean'), drive: nm('Drive (a little grit)', 'דרייב (קצת לכלוך)', 'drive', 'overdrive'), fuzz: nm('Fuzz (heavy)', 'פאז (כבד)', 'fuzz', 'distortion') };
      const choices = ['clean', 'drive', 'fuzz'];
      return make(T, id, seed, level, 1150, oneItem({ en: 'Clean, a little drive, or heavy fuzz?', he: 'נקי, קצת דרייב, או פאז כבד?' }, names, choices, pickR(rnd, choices), (c) => S(base, d[c] ? { drive: d[c] } : {})));
    }
    if (level === 4) {
      // Level item: deliberately NOT loudness-matched (R1 exception).
      const base: Base = { source: pickR(rnd, ['loop', 'pink'] as FxSource[]), seed: seedOf(rnd), bpm: bpmOf(rnd) };
      const db = pickR(rnd, [1, 2, 3]);
      const louder = rnd() < 0.5 ? 'a' : 'b';
      const A = S(base, { gainDb: louder === 'a' ? db : 0 }, null);
      const B = S(base, { gainDb: louder === 'b' ? db : 0 }, null);
      const names: Names = { a: nm('A (first)', 'א (הראשון)', 'a', 'first'), b: nm('B (second)', 'ב (השני)', 'b', 'second') };
      return make(T, id, seed, level, 1300, { ask: { en: 'The same sound twice. Which one is louder?', he: 'אותו סאונד פעמיים. איזה מהם חזק יותר?' }, names, choices: ['a', 'b'], answer: louder, stimulus: ab(A, B) });
    }
    if (level === 5) {
      const ch: Record<string, FxChain> = { fast: { comp: { threshold: -30, ratio: 8, attack: 0.001, release: 0.1 } }, slow: { comp: { threshold: -30, ratio: 8, attack: 0.04, release: 0.1 } } };
      const names: Names = { fast: nm('Fast attack (hits squashed)', 'אטאק מהיר (המכות נמעכות)', 'fast'), slow: nm('Slow attack (hits punch through)', 'אטאק איטי (המכות בולטות)', 'slow') };
      return make(T, id, seed, level, 1450, abItem({ en: 'B is compressed. Fast attack or slow?', he: 'B דחוס. אטאק מהיר או איטי?' }, names, ['fast', 'slow'], rnd() < 0.5 ? 'fast' : 'slow', S(drums, {}), (c) => S(drums, ch[c])));
    }
    // L6 — match it: the compressor threshold (ratio 6:1) is the setting.
    const ths = [-12, -20, -28, -36];
    const names: Names = Object.fromEntries(ths.map((t) => [`t${-t}`, nm(`Threshold −${-t} dB`, `ת׳רשולד ‎−${-t} דציבל`, `minus ${-t}`, `${-t} db`)]));
    const choices = ths.map((t) => `t${-t}`);
    return make(T, id, seed, level, 1600, oneItem({ en: 'These drums go through a compressor (6:1). Try the thresholds: which one matches?', he: 'התופים האלה עוברים בקומפרסור (6:1). נסו את ספי הת׳רשולד: איזה מתאים?' }, names, choices, pickR(rnd, choices), (c) => S(drums, { comp: { threshold: -+c.slice(1), ratio: 6, attack: 0.005, release: 0.12 } }), { en: 'Ratio 6:1', he: 'יחס 6:1' }));
  },
};

// ======================================================================= TAGS

TOPIC_TAGS['eq-ear'] = tg(['timbre', 'eq', 1]);
TOPIC_TAGS['filter-ear'] = tg(['timbre', 'eq', 1]);
TOPIC_TAGS['tone-hz'] = tg(['timbre', 'eq', 1]);
TOPIC_TAGS['space-ear'] = tg(['timbre', 'space', 1]);
TOPIC_TAGS['pan-ear'] = tg(['timbre', 'pan', 1]);
TOPIC_TAGS['width-ear'] = tg(['timbre', 'pan', 1]);
TOPIC_TAGS['dyn-ear'] = tg(['timbre', 'dynamics', 1]);
