// Ear games on progressions (0.53, PLAN-ANALYSIS-AND-NEXT §9–10). All on generated music.
//   where-home   — a progression wanders; on which chord does it arrive home (I)? Then: did it really land, or was it a trick?
//   next-chord   — three chords of a familiar progression; which chord comes next?
//   reharm-swap  — the same progression twice; the second time one chord is replaced — which one, and by what?
//   figure-out   — one short tune with chords, figured out step by step: the key's home note, the bass line's moves,
//                  the chord in a bar, the melody's first notes (the four steps are the four levels).
import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, nm } from './topicKit';
import { pc } from './pitch';

const Q = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] } as const;
type Qual = keyof typeof Q;
type Ch = [number, Qual];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Root in the bass (C2–B2), the rest of the chord close above middle C's neighbourhood. */
function voice(key: number, [deg, q]: Ch): number[] {
  const root = key + deg;
  const bass = 36 + mod12(root - 36);
  const upper = Q[q].slice(1).map((x) => 57 + mod12(root + x - 57)).sort((a, b) => a - b);
  return [bass, ...upper];
}
const play = (key: number, chords: Ch[], each = 0.85): Stimulus[] => chords.map((c, i) => chordStim(voice(key, c), i === chords.length - 1 ? each * 1.7 : each));

/** Diatonic chords of a major key by Roman numeral. */
const RN: Record<string, Ch> = {
  I: [0, 'maj'], ii: [2, 'min'], iii: [4, 'min'], IV: [5, 'maj'], V: [7, 'maj'], vi: [9, 'min'], 'vii°': [11, 'dim'],
  V7: [7, 'dom7'], ii7: [2, 'm7'], Imaj7: [0, 'maj7'], 'bVII': [10, 'maj'], 'bVI': [8, 'maj'], iv: [5, 'min'],
  'V/vi': [4, 'maj'], 'V7/V': [2, 'dom7'], 'bII7': [1, 'dom7'], 'vi7': [9, 'm7'], 'iii7': [4, 'm7'], IVmaj7: [5, 'maj7'],
};
const rn = (s: string): Ch => RN[s];
const NAMES: Record<string, ReturnType<typeof nm>> = Object.fromEntries(Object.keys(RN).map((k) => [k, nm(k.replace('b', '♭'), k.replace('b', '♭'), k)]));

// ---------------------------------------------------------------- where is home?

TOPIC_GEN['where-home'] = {
  title: { en: 'Where is home?', he: 'איפה הבית?' },
  skill: 'cadences',
  levels: [
    { en: 'Four chords: which one is home?', he: 'ארבעה אקורדים: איזה מהם הבית?' },
    { en: 'Five chords: where does it arrive home?', he: 'חמישה אקורדים: איפה מגיעים הביתה?' },
    { en: 'Home, or a trick (deceptive)?', he: 'בית, או תרגיל (הטעיה)?' },
    { en: 'Minor keys', he: 'סולמות מינוריים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    if (level === 3) {
      // I … V → (I | vi): did it land home?
      const lead = shuffleR(rnd, ['ii', 'IV', 'vi', 'iii']).slice(0, 2);
      const home = rnd() < 0.5;
      const chords = [rn('I'), ...lead.map(rn), rn('V7'), rn(home ? 'I' : 'vi')];
      return choiceQ({
        id, topic: 'where-home', level, seed, skill: 'cadences', difficulty: 1175,
        ask: { en: 'After the dominant: did it land home, or was it a trick?', he: 'אחרי הדומיננטה: זה נחת בבית, או שזה היה תרגיל?' },
        names: { home: nm('Home (V–I)', 'בית (V–I)', 'home', 'authentic'), trick: nm('A trick (V–vi)', 'תרגיל (V–vi)', 'trick', 'deceptive', 'הטעיה') },
        answer: home ? 'home' : 'trick', choices: ['home', 'trick'], stimulus: play(key, chords),
      });
    }
    const minor = level === 4;
    const n = level === 1 ? 4 : 5;
    const pool = minor ? [[5, 'min'], [7, 'dom7'], [8, 'maj'], [10, 'maj'], [3, 'maj']] as Ch[] : (['ii', 'iii', 'IV', 'V', 'vi'] as const).map(rn);
    const at = 1 + Math.floor(rnd() * (n - 1)); // never the first chord: the tonic must be found, not given
    const homeCh: Ch = minor ? [0, 'min'] : rn('I');
    const chords: Ch[] = Array.from({ length: n }, (_, i) => (i === at ? homeCh : pickR(rnd, pool)));
    // make the arrival audible: a dominant just before home
    if (at > 0) chords[at - 1] = minor ? [7, 'dom7'] : rn(rnd() < 0.5 ? 'V' : 'V7');
    const names: ChoiceQuestion['names'] = {};
    const choices = Array.from({ length: n }, (_, i) => String(i + 1));
    for (const c of choices) names[c] = nm(c, c, c);
    return choiceQ({
      id, topic: 'where-home', level, seed, skill: 'cadences', difficulty: 980 + 90 * level,
      ask: { en: `${n} chords. Which one is home?`, he: `${n} אקורדים. איזה מהם הוא הבית?` },
      names, answer: String(at + 1), choices, stimulus: play(key, chords),
    });
  },
};

// ---------------------------------------------------------------- what comes next?

const NEXT: { from: string[]; next: string; wrong: string[]; level: number }[] = [
  { from: ['I', 'V', 'vi'], next: 'IV', wrong: ['ii', 'vii°', 'V'], level: 1 },
  { from: ['I', 'vi', 'IV'], next: 'V', wrong: ['iii', 'vii°', 'vi'], level: 1 },
  { from: ['vi', 'IV', 'I'], next: 'V', wrong: ['ii', 'iii', 'vi'], level: 1 },
  { from: ['I', 'IV', 'V'], next: 'I', wrong: ['ii', 'iii', 'vii°'], level: 1 },
  { from: ['ii7', 'V7'], next: 'Imaj7', wrong: ['vi7', 'IVmaj7', 'iii7'], level: 2 },
  { from: ['Imaj7', 'vi7', 'ii7'], next: 'V7', wrong: ['IVmaj7', 'iii7', 'Imaj7'], level: 2 },
  { from: ['iii7', 'vi7', 'ii7'], next: 'V7', wrong: ['Imaj7', 'IVmaj7', 'iii7'], level: 2 },
  { from: ['I', 'bVI', 'bVII'], next: 'I', wrong: ['IV', 'V', 'vi'], level: 3 },
  { from: ['I', 'IV', 'iv'], next: 'I', wrong: ['V', 'vi', 'ii'], level: 3 },
  { from: ['I', 'V/vi'], next: 'vi', wrong: ['IV', 'ii', 'I'], level: 3 },
  { from: ['I', 'V7/V'], next: 'V7', wrong: ['IV', 'vi', 'ii'], level: 3 },
  { from: ['ii7', 'bII7'], next: 'Imaj7', wrong: ['vi7', 'IVmaj7', 'V7'], level: 3 },
];

TOPIC_GEN['next-chord'] = {
  title: { en: 'What comes next?', he: 'מה בא אחר כך?' },
  skill: 'cadences',
  levels: [
    { en: 'Pop progressions', he: 'מהלכי פופ' },
    { en: 'Jazz progressions', he: 'מהלכי ג׳אז' },
    { en: 'Borrowed and secondary chords', he: 'אקורדים שאולים ומשניים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const item = pickR(rnd, NEXT.filter((x) => x.level === Math.min(3, level)));
    const choices = shuffleR(rnd, [item.next, ...item.wrong]);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const c of choices) {
      names[c] = NAMES[c];
      choiceStim[c] = play(key, [...item.from, c].map(rn));
    }
    return choiceQ({
      id, topic: 'next-chord', level, seed, skill: 'cadences', difficulty: 1080 + 140 * level,
      ask: { en: `${item.from.map((x) => x.replace('b', '♭')).join(' – ')} – ?  Which chord comes next?`, he: `${item.from.map((x) => x.replace('b', '♭')).join(' – ')} – ?  איזה אקורד בא אחר כך?` },
      names, answer: item.next, choices, stimulus: play(key, item.from.map(rn)), choiceStim,
    });
  },
};

// ---------------------------------------------------------------- reharmonisation: which chord changed?

/** `what` names the change (for the lesson text and the recap). */
export const SWAPS: { base: string[]; at: number; sub: string; level: number; what: ReturnType<typeof nm> }[] = [
  { base: ['I', 'IV', 'V', 'I'], at: 1, sub: 'ii', level: 1, what: nm('IV → ii', 'IV → ii', 'two for four') },
  { base: ['I', 'V', 'vi', 'IV'], at: 2, sub: 'iii', level: 1, what: nm('vi → iii', 'vi → iii', 'three for six') },
  { base: ['I', 'vi', 'IV', 'V'], at: 1, sub: 'iii', level: 1, what: nm('vi → iii', 'vi → iii', 'three for six') },
  { base: ['I', 'IV', 'V', 'I'], at: 3, sub: 'vi', level: 1, what: nm('I → vi (deceptive)', 'I → vi (הטעיה)', 'deceptive') },
  { base: ['ii7', 'V7', 'Imaj7', 'Imaj7'], at: 1, sub: 'bII7', level: 2, what: nm('V7 → ♭II7 (tritone sub)', 'V7 → ♭II7 (תחליף טריטון)', 'tritone sub') },
  { base: ['Imaj7', 'vi7', 'ii7', 'V7'], at: 1, sub: 'V/vi', level: 2, what: nm('vi7 → VI7 (secondary dominant)', 'vi7 → VI7 (דומיננטה משנית)', 'secondary dominant') },
  // EAR_THEORY_AUDIT: level 2 always changed chord 2 (both swaps at index 1) — now every position occurs.
  { base: ['Imaj7', 'vi7', 'ii7', 'V7'], at: 3, sub: 'bII7', level: 2, what: nm('V7 → ♭II7 (tritone sub)', 'V7 → ♭II7 (תחליף טריטון)', 'tritone sub') },
  { base: ['Imaj7', 'vi7', 'ii7', 'V7'], at: 0, sub: 'iii7', level: 2, what: nm('Imaj7 → iii7', 'Imaj7 → iii7', 'three for one') },
  { base: ['Imaj7', 'vi7', 'ii7', 'V7'], at: 2, sub: 'IVmaj7', level: 2, what: nm('ii7 → IVmaj7', 'ii7 → IVmaj7', 'four for two') },
  { base: ['Imaj7', 'IVmaj7', 'ii7', 'V7'], at: 1, sub: 'iv', level: 3, what: nm('IV → iv (borrowed)', 'IV → iv (שאול)', 'minor four', 'borrowed') },
  { base: ['I', 'IV', 'V', 'I'], at: 2, sub: 'bVII', level: 3, what: nm('V → ♭VII', 'V → ♭VII', 'flat seven') },
  { base: ['I', 'vi', 'IV', 'V'], at: 2, sub: 'iv', level: 3, what: nm('IV → iv (borrowed)', 'IV → iv (שאול)', 'minor four', 'borrowed') },
  { base: ['I', 'V', 'vi', 'IV'], at: 3, sub: 'bVI', level: 3, what: nm('IV → ♭VI (borrowed)', 'IV → ♭VI (שאול)', 'flat six', 'borrowed') },
  { base: ['I', 'IV', 'I', 'V'], at: 0, sub: 'vi', level: 3, what: nm('I → vi', 'I → vi', 'six for one') },
];

TOPIC_GEN['reharm-swap'] = {
  title: { en: 'Which chord changed?', he: 'איזה אקורד השתנה?' },
  skill: 'cadences',
  levels: [
    { en: 'Diatonic swaps', he: 'החלפות בתוך הסולם' },
    { en: 'Jazz substitutions', he: 'תחליפים בג׳אז' },
    { en: 'Borrowed chords', he: 'אקורדים שאולים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const s = pickR(rnd, SWAPS.filter((x) => x.level === Math.min(3, level)));
    const changed = s.base.map((c, i) => (i === s.at ? s.sub : c));
    const gap: Stimulus = { kind: 'events', events: [], length: 0.7 };
    const names: ChoiceQuestion['names'] = {};
    const choices = s.base.map((_, i) => String(i + 1));
    for (const c of choices) names[c] = nm(c, c, c);
    return choiceQ({
      id, topic: 'reharm-swap', level, seed, skill: 'cadences', difficulty: 1150 + 150 * level,
      ask: { en: 'The progression, then the same with one chord replaced. Which chord changed?', he: 'המהלך, ואז אותו מהלך עם אקורד אחד שהוחלף. איזה אקורד השתנה?' },
      names, answer: String(s.at + 1), choices, stimulus: [...play(key, s.base.map(rn), 0.75), gap, ...play(key, changed.map(rn), 0.75)],
    });
  },
};

// ---------------------------------------------------------------- figure it out

const TUNE_CHORDS: string[][] = [
  ['I', 'IV', 'V', 'I'],
  ['I', 'vi', 'IV', 'V'],
  ['I', 'V', 'vi', 'IV'],
  ['vi', 'IV', 'I', 'V'],
  ['I', 'ii', 'V', 'I'],
];
/** A 4-bar tune: one chord a bar, a melody of chord tones and steps (scale degrees 1–8 → semitones). */
function tune(rnd: () => number) {
  const chords = pickR(rnd, TUNE_CHORDS);
  const SC = [0, 2, 4, 5, 7, 9, 11, 12];
  const tonesOf = (r: string) => Q[RN[r][1]].map((x) => mod12(RN[r][0] + x));
  const mel: number[] = [];
  for (const c of chords) {
    const t = tonesOf(c);
    for (let k = 0; k < 2; k++) {
      const cand = SC.map((s, d) => ({ s, d })).filter((x) => (k === 0 ? t.includes(mod12(x.s)) : true));
      mel.push(pickR(rnd, cand).d + 1);
    }
  }
  mel[mel.length - 1] = 1;
  return { chords, mel, SC };
}
function tuneStim(key: number, t: ReturnType<typeof tune>): Stimulus[] {
  const beat = 0.5;
  const events: { midi: number; start: number; duration: number; velocity: number }[] = [];
  t.chords.forEach((c, bar) => {
    const v = voice(key, rn(c));
    for (const m of v) events.push({ midi: m, start: bar * 4 * beat, duration: 4 * beat * 0.95, velocity: m < 48 ? 0.5 : 0.32 });
  });
  t.mel.forEach((d, i) => events.push({ midi: 60 + mod12(key) + t.SC[d - 1] + (mod12(key) > 6 ? -12 : 0), start: i * 2 * beat, duration: 2 * beat * 0.9, velocity: 0.7 }));
  return [{ kind: 'events', events, length: t.chords.length * 4 * beat + 0.4 }];
}
const KEYS_HE = ['דו', 'דו♯', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const KEYS_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

TOPIC_GEN['figure-out'] = {
  title: { en: 'Figure it out', he: 'לפענח לבד' },
  skill: 'dictation',
  levels: [
    { en: 'Step 1: the home note (with the tonic played first)', he: 'שלב 1: צליל הבית (אחרי שהטוניקה נוגנה)' },
    { en: 'Step 2: the bass line', he: 'שלב 2: קו הבס' },
    { en: 'Step 3: a chord in the tune', he: 'שלב 3: אקורד בשיר' },
    { en: 'Step 4: the melody’s first notes', he: 'שלב 4: הצלילים הראשונים של המנגינה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const t = tune(rnd);
    const stim = tuneStim(key, t);
    if (level === 1) {
      // Which degree does the tune end on? EAR_THEORY_AUDIT: the tune always ended on 1, so "1" was always right —
      // now it ends on a tone of its last chord (1, 2, 3 or 5), after the home chord sets the key.
      const lastTones: Record<string, number[]> = { I: [1, 3, 5], IV: [1], V: [2, 5], vi: [1, 3] };
      const end = pickR(rnd, lastTones[t.chords[t.chords.length - 1]] ?? [1]);
      const t1 = { ...t, mel: [...t.mel.slice(0, -1), end] };
      const choices = ['1', '3', '5', '2'];
      const names: ChoiceQuestion['names'] = { 1: nm('1 (home)', '1 (בית)', 'one', 'home'), 3: nm('3', '3', 'three'), 5: nm('5', '5', 'five'), 2: nm('2', '2', 'two') };
      return choiceQ({
        id, topic: 'figure-out', level, seed, skill: 'dictation', difficulty: 1000,
        ask: { en: 'Which degree does the tune end on?', he: 'על איזו דרגה המנגינה נגמרת?' },
        names, answer: String(end), choices: shuffleR(rnd, choices), stimulus: [{ kind: 'cadence', key: pc(KEYS_EN[mod12(key)]) }, { kind: 'rest', duration: 0.5 }, ...tuneStim(key, t1)],
      });
    }
    if (level === 2) {
      // The bass roots of the four bars, as Roman numerals — choose the right progression among four.
      const right = t.chords.join('–');
      const others = shuffleR(rnd, TUNE_CHORDS.map((c) => c.join('–')).filter((c) => c !== right)).slice(0, 3);
      const choices = shuffleR(rnd, [right, ...others]);
      const names: ChoiceQuestion['names'] = {};
      for (const c of choices) names[c] = nm(c, c, c);
      return choiceQ({
        id, topic: 'figure-out', level, seed, skill: 'dictation', difficulty: 1180,
        ask: { en: 'Follow the bass: which progression is under the tune?', he: 'עקבו אחרי הבס: איזה מהלך יש מתחת לשיר?' },
        names, answer: right, choices, stimulus: stim,
      });
    }
    if (level === 3) {
      const bar = 1 + Math.floor(rnd() * 3);
      const right = t.chords[bar];
      const choices = shuffleR(rnd, [right, ...shuffleR(rnd, ['I', 'ii', 'IV', 'V', 'vi'].filter((x) => x !== right)).slice(0, 3)]);
      const names: ChoiceQuestion['names'] = {};
      for (const c of choices) names[c] = NAMES[c];
      return choiceQ({
        id, topic: 'figure-out', level, seed, skill: 'dictation', difficulty: 1260,
        ask: { en: `Which chord is in bar ${bar + 1}?`, he: `איזה אקורד בתיבה ${bar + 1}?` },
        names, answer: right, choices, stimulus: stim,
      });
    }
    // level 4: the first three melody notes as degrees
    const right = t.mel.slice(0, 3).join('-');
    const alts = new Set<string>([right]);
    while (alts.size < 4) {
      const m = t.mel.slice(0, 3).map((d) => Math.max(1, Math.min(8, d + pickR(rnd, [-2, -1, 0, 0, 1, 2]))));
      alts.add(m.join('-'));
    }
    const choices = shuffleR(rnd, [...alts]);
    const names: ChoiceQuestion['names'] = {};
    for (const c of choices) names[c] = nm(c.replace(/-/g, ' '), c.replace(/-/g, ' '), c);
    return choiceQ({
      id, topic: 'figure-out', level, seed, skill: 'dictation', difficulty: 1350,
      ask: { en: `The tune is in ${KEYS_EN[key]} major. Its first three notes, as degrees?`, he: `השיר ב${KEYS_HE[key]} מז׳ור. שלושת הצלילים הראשונים שלו, כדרגות?` },
      names, answer: right, choices, stimulus: stim,
    });
  },
};
