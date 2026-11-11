// Content for the advanced games and the top tiers (GAMES_TIERS_PLAN §2.4 / §4, 0.70). Game-only topics: they feed
// Rush rungs (Voicing Spy, Scale & Mode Rush, Name That Standard, Chord Rush ff, Progression Detective ff) and are
// registered by engine/rush.ts, not the lesson catalogue. Own material only: voicings, progressions and scales are
// built from rules; Name That Standard plays our own comping of the chord-only charts in standards.ts (no melody,
// no riff — STANDARDS_LEGAL.md tier 2). Pure, seeded.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, nm, pcName, pcNameHe } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { jazzProgStim, type JQId } from './topicsJazzEar';
import { STANDARD_CHANGES, type StandardChanges } from './standards';
import { chartBacking, parseChart, transposeChart } from './charts';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.5): Stimulus => ({ kind: 'rest', duration: d });
function fromPool(rnd: () => number, pool: readonly string[], answer: string, n = 4): string[] {
  return shuffleR(rnd, [answer, ...shuffleR(rnd, pool.filter((k) => k !== answer)).slice(0, n - 1)]);
}

// ================================================================ voicing-type (Voicing Spy)

export type VoicingKind = 'closed' | 'drop2' | 'drop3' | 'spread' | 'shell' | 'rootless' | 'quartal' | 'upper';
export const VOICING_NAMES: Record<VoicingKind, ReturnType<typeof nm>> = {
  closed: nm('Close', 'צפוף', 'close', 'closed'),
  drop2: nm('Drop 2', 'דרופ 2', 'drop two'),
  drop3: nm('Drop 3', 'דרופ 3', 'drop three'),
  spread: nm('Spread', 'פרוש', 'spread'),
  shell: nm('Shell (1–3–7)', 'שֶׁל (1–3–7)', 'shell'),
  rootless: nm('Rootless', 'בלי שורש', 'rootless'),
  quartal: nm('Quartal (4ths)', 'קוורטלי (קוורטות)', 'quartal', 'fourths'),
  upper: nm('Upper structure', 'מבנה עליון', 'upper structure'),
};
const SEVENTH_Q: Record<string, number[]> = { maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10] };
/** One 7th chord (root pitch class `r`, quality q) voiced as `kind`. Bass notes sit low (C2–B2), hands from G3. */
export function voiceAs(kind: VoicingKind, r: number, q: keyof typeof SEVENTH_Q): number[] {
  const iv = SEVENTH_Q[q];
  const top = 55 + mod12(r - 55 + 12); // the root at or above G3
  const close = iv.map((x) => top + x);
  const bass = 36 + mod12(r);
  switch (kind) {
    case 'closed':
      return close;
    case 'drop2':
      return [close[2] - 12, close[0], close[1], close[3]].sort((a, b) => a - b);
    case 'drop3':
      return [close[1] - 12, close[0], close[2], close[3]].sort((a, b) => a - b);
    case 'spread':
      return [bass, bass + iv[3], bass + 12 + iv[1], bass + 12 + iv[2]];
    case 'shell':
      return [bass, bass + 12 + iv[1], bass + 12 + iv[3]];
    case 'rootless': {
      // A form: 3–5–7–9 (dominant: 3–13–7–9), around middle C, no root anywhere
      const th = 52 + mod12(r + iv[1] - 52);
      const up = q === 'dom7' ? [0, iv[3] - iv[1], 14 - iv[1], 21 - iv[1]] : [0, iv[2] - iv[1], iv[3] - iv[1], 14 - iv[1]];
      return up.map((x) => th + x).sort((a, b) => a - b);
    }
    case 'quartal': {
      // stacked perfect 4ths from the chord's 3rd (the "So What" sound without the top 3rd)
      const lo = 52 + mod12(r + iv[1] - 52);
      return [lo, lo + 5, lo + 10, lo + 15];
    }
    case 'upper': {
      // a shell in the left hand, a major triad a whole step up (II) on top: 9, ♯11, 13
      const tri = 64 + mod12(r + 2 - 64);
      return [bass, bass + 12 + 4, bass + 12 + 10, tri, tri + 4, tri + 7];
    }
  }
}
const VT_LEVELS: VoicingKind[][] = [
  ['closed', 'drop2'],
  ['closed', 'drop2', 'drop3'],
  ['shell', 'rootless', 'closed'],
  ['closed', 'drop2', 'rootless', 'quartal'],
  ['closed', 'drop2', 'rootless', 'quartal', 'upper'],
];
const voicingStim = (midis: number[]): Stimulus[] => [
  { kind: 'chord', midis, duration: 1.6 },
  rest(0.25),
  { kind: 'notes', midis: [...midis].sort((a, b) => a - b), each: 0.22 },
];
TOPIC_GEN['voicing-type'] = {
  title: { en: 'Voicing type by ear', he: 'סוג הוויסינג בשמיעה' },
  skill: 'chords',
  levels: [
    { en: 'Close or drop 2?', he: 'צפוף או דרופ 2?' },
    { en: 'Close, drop 2 or drop 3?', he: 'צפוף, דרופ 2 או דרופ 3?' },
    { en: 'Shell, rootless or close?', he: 'שֶׁל, בלי שורש או צפוף?' },
    { en: 'Close, drop 2, rootless or quartal?', he: 'צפוף, דרופ 2, בלי שורש או קוורטלי?' },
    { en: '… or an upper structure', he: '… או מבנה עליון' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(5, level));
    const pool = VT_LEVELS[lv - 1];
    const ans = pickR(rnd, pool);
    const choices = pool.length > 4 ? fromPool(rnd, pool, ans) : shuffleR(rnd, pool.slice());
    // upper structures only sound right on a dominant; the rest on any 7th
    const q = ans === 'upper' || (lv >= 4 && rnd() < 0.5) ? 'dom7' : pickR(rnd, ['maj7', 'dom7', 'm7'] as const);
    const r = Math.floor(rnd() * 12);
    const names: Names = {};
    for (const k of choices) names[k] = VOICING_NAMES[k as VoicingKind];
    return choiceQ({
      id, topic: 'voicing-type', level: lv, seed, skill: 'chords', difficulty: [1050, 1150, 1250, 1380, 1480][lv - 1],
      ask: { en: 'Which voicing?', he: 'איזה ויסינג?' }, names, answer: ans, choices,
      stimulus: voicingStim(voiceAs(ans as VoicingKind, r, q)),
      choiceStim: Object.fromEntries(choices.map((k) => [k, voicingStim(voiceAs(k as VoicingKind, r, k === 'upper' ? 'dom7' : q))])),
    });
  },
};
TOPIC_TAGS['voicing-type'] = tg(['chords', 'voicing', 1]);

// ================================================================ mm-modes (Scale & Mode Rush ff)

const MM: Record<string, { steps: number[]; chord: number[]; n: ReturnType<typeof nm> }> = {
  melmin: { steps: [0, 2, 3, 5, 7, 9, 11], chord: [0, 3, 7, 11], n: nm('Melodic minor', 'מינור מלודי', 'melodic minor') },
  dorb2: { steps: [0, 1, 3, 5, 7, 9, 10], chord: [0, 3, 7, 10], n: nm('Dorian ♭2', 'דורי ♭2', 'dorian flat two', 'phrygian natural six') },
  lydaug: { steps: [0, 2, 4, 6, 8, 9, 11], chord: [0, 4, 8, 11], n: nm('Lydian augmented', 'לידי מוגדל', 'lydian augmented') },
  lyddom: { steps: [0, 2, 4, 6, 7, 9, 10], chord: [0, 4, 7, 10], n: nm('Lydian dominant', 'לידי דומיננטי', 'lydian dominant') },
  mixb6: { steps: [0, 2, 4, 5, 7, 8, 10], chord: [0, 4, 7, 10], n: nm('Mixolydian ♭6', 'מיקסולידי ♭6', 'mixolydian flat six') },
  loc2: { steps: [0, 2, 3, 5, 6, 8, 10], chord: [0, 3, 6, 10], n: nm('Locrian ♮2', 'לוקרי ♮2', 'locrian natural two') },
  altered: { steps: [0, 1, 3, 4, 6, 8, 10], chord: [0, 4, 10], n: nm('Altered', 'אלטרד', 'altered', 'super locrian') },
};
/** The chord the mode sits on (bass + upper notes), then the scale up an octave and back down. */
export function modeOverChord(tonic: number, mode: string, each = 0.2): Stimulus {
  const m = MM[mode];
  const ev: NoteEvent[] = [{ midi: tonic - 24, start: 0, duration: 1.0, velocity: 0.6, inst: 'bass' }, ...m.chord.slice(1).map((x) => ({ midi: tonic - 12 + x, start: 0.02, duration: 1.0, velocity: 0.42 }))];
  const line = [...m.steps, 12, ...[...m.steps].reverse()].map((x) => tonic + x);
  let t = 1.1;
  ev.push({ midi: tonic - 24, start: t, duration: line.length * each, velocity: 0.45, inst: 'bass' });
  for (const n of line) {
    ev.push({ midi: n, start: t, duration: each * 0.92, velocity: 0.62 });
    t += each;
  }
  return eventsStim(ev, t + 0.3);
}
const MM_LEVELS = [['lyddom', 'altered', 'loc2'], Object.keys(MM)];
TOPIC_GEN['mm-modes'] = {
  title: { en: 'Melodic-minor modes over a chord', he: 'מודוסים של מינור מלודי מעל אקורד' },
  skill: 'modes',
  levels: [
    { en: 'Lydian dominant, altered or locrian ♮2?', he: 'לידי דומיננטי, אלטרד או לוקרי ♮2?' },
    { en: 'All seven modes of melodic minor', he: 'כל שבעת המודוסים של המינור המלודי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(2, level));
    const pool = MM_LEVELS[lv - 1];
    const ans = pickR(rnd, pool);
    const choices = pool.length > 4 ? fromPool(rnd, pool, ans) : shuffleR(rnd, pool.slice());
    const tonic = 60 + pickR(rnd, [-3, -2, 0, 2, 3, 5]);
    const names: Names = {};
    for (const k of choices) names[k] = MM[k].n;
    return choiceQ({
      id, topic: 'mm-modes', level: lv, seed, skill: 'modes', difficulty: [1500, 1620][lv - 1],
      ask: { en: 'Which mode?', he: 'איזה מודוס?' }, names, answer: ans, choices,
      stimulus: [modeOverChord(tonic, ans)], choiceStim: Object.fromEntries(choices.map((k) => [k, [modeOverChord(tonic, k)]])),
    });
  },
};
TOPIC_TAGS['mm-modes'] = tg(['modes', 'melodic-minor', 1]);

// ================================================================ chord-read-alt (Chord Rush ff: reading)

type AltKind = 'b9' | 's9' | 's11' | 'alt' | 't13b9';
const ALT: Record<AltKind, { iv: number[]; en: string }> = {
  b9: { iv: [0, 4, 10, 13], en: '7♭9' },
  s9: { iv: [0, 4, 10, 15], en: '7♯9' },
  s11: { iv: [0, 4, 10, 14, 18], en: '7♯11' },
  alt: { iv: [0, 4, 10, 15, 20], en: '7alt' },
  t13b9: { iv: [0, 4, 10, 13, 21], en: '13♭9' },
};
/** Upper-structure triads over a dominant: the triad's root above the dominant's root, and what it adds. */
const US: { up: number; en: string }[] = [
  { up: 2, en: 'II' }, // 9 ♯11 13
  { up: 3, en: '♭III' }, // ♯9 5 ♭7… (♭III = ♯9, 5, ♭7)
  { up: 6, en: '♭V' }, // ♭5 ♭7 ♭9
  { up: 8, en: '♭VI' }, // ♭13 1 ♯9
  { up: 9, en: 'VI' }, // 13 ♭9 3
];
const spell = (pc: number) => pcName(pc);
TOPIC_GEN['chord-read-alt'] = {
  title: { en: 'Read altered and upper-structure chords', he: 'קריאת אקורדים אלטרד ומבנים עליונים' },
  skill: 'chords',
  levels: [
    { en: 'Altered dominants: 7♭9, 7♯9, 7♯11, 7alt, 13♭9', he: 'דומיננטות אלטרד: 7♭9, 7♯9, 7♯11, 7alt, 13♭9' },
    { en: 'Upper-structure triads over a dominant (D/C7)', he: 'משולשים עליונים מעל דומיננטה (D/C7)' },
    { en: 'Quartal stacks and everything at speed', he: 'ערימות קוורטות והכול במהירות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(3, level));
    const kind = lv === 3 ? pickR(rnd, ['alt', 'us', 'quartal', 'quartal'] as const) : lv === 2 ? 'us' : 'alt';
    const r = Math.floor(rnd() * 12);
    const base = 48 + r; // C3…B3
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    let answer = '';
    let choices: string[] = [];
    let midis: number[] = [];
    const add = (key: string, he: string, m: number[]) => {
      names[key] = { en: key, he };
      choiceStim[key] = [{ kind: 'chord', midis: m, duration: 1.4 }];
    };
    if (kind === 'alt') {
      const pool = Object.keys(ALT) as AltKind[];
      const a = pickR(rnd, pool);
      choices = fromPool(rnd, pool, a).map((k) => `${spell(r)}${ALT[k as AltKind].en}`);
      for (const k of pool) add(`${spell(r)}${ALT[k].en}`, `${pcNameHe(r)} ${ALT[k].en}`, ALT[k].iv.map((x) => base + x));
      answer = `${spell(r)}${ALT[a].en}`;
      midis = ALT[a].iv.map((x) => base + x);
    } else if (kind === 'us') {
      const a = pickR(rnd, US);
      const sym = (u: (typeof US)[number]) => `${spell(r + u.up)}/${spell(r)}7`;
      const vo = (u: (typeof US)[number]) => {
        const t = 60 + mod12(r + u.up);
        return [base - 12, base - 12 + 10, base + 4, t, t + 4, t + 7];
      };
      const picks = fromPool(rnd, US.map((u) => u.en), a.en);
      choices = picks.map((e) => sym(US.find((u) => u.en === e)!));
      for (const u of US) add(sym(u), `${pcNameHe(r + u.up)} מעל ${pcNameHe(r)}7`, vo(u));
      answer = sym(a);
      midis = vo(a);
    } else {
      // quartal: four stacked 4ths named by the bottom note; decoys a step away or stacked in 5ths / 3rds
      const qs = (lo: number) => [lo, lo + 5, lo + 10, lo + 15];
      const fifths = (lo: number) => [lo, lo + 7, lo + 14, lo + 21];
      answer = `${spell(r)} 4ths`;
      const decoys: [string, string, number[]][] = [
        [`${spell(r + 2)} 4ths`, `קוורטות מ${pcNameHe(r + 2)}`, qs(base + 2)],
        [`${spell(r - 2)} 4ths`, `קוורטות מ${pcNameHe(r - 2)}`, qs(base - 2)],
        [`${spell(r)} 5ths`, `קווינטות מ${pcNameHe(r)}`, fifths(base)],
      ];
      add(answer, `קוורטות מ${pcNameHe(r)}`, qs(base));
      for (const [k, he, m] of decoys) add(k, he, m);
      choices = shuffleR(rnd, [answer, ...decoys.map((d) => d[0])]);
      midis = qs(base);
    }
    return choiceQ({
      id, topic: 'chord-read-alt', level: lv, seed, skill: 'chords', difficulty: [1420, 1500, 1560][lv - 1],
      ask: { en: 'Which chord?', he: 'איזה אקורד?' }, names, answer, choices, choiceStim,
      stimulus: [{ kind: 'chord', midis, duration: 1.4, arpeggio: true }],
      diagram: { kind: 'keys', midis },
    });
  },
};
TOPIC_TAGS['chord-read-alt'] = tg(['chords', 'altered', 1]);

// ================================================================ jazz-chains (Progression Detective ff)

type Ch = [number, JQId, number];
const iiV = (to: number, beats = 2): Ch[] => [[to + 2, 'm7', beats], [to + 7, 'dom7', beats]];
const CHAINS: Record<string, { ch: Ch[]; n: ReturnType<typeof nm> }>[] = [
  {
    plain: { ch: [...iiV(0, 4), [0, 'maj7', 8]], n: nm('ii–V–I', 'ii–V–I', 'two five one') },
    backdoor: { ch: [[5, 'm7', 4], [10, 'dom7', 4], [0, 'maj7', 8]], n: nm('Backdoor ii–V (iv–♭VII–I)', 'דלת אחורית (iv–♭VII–I)', 'backdoor') },
    tritone: { ch: [[2, 'm7', 4], [1, 'dom7', 4], [0, 'maj7', 8]], n: nm('Tritone sub (ii–♭II7–I)', 'תחליף טריטון (ii–♭II7–I)', 'tritone') },
    minor: { ch: [[2, 'm7b5', 4], [7, 'dom7', 4], [0, 'm7', 8]], n: nm('Minor ii–V–i', 'ii–V–i מינורי', 'minor two five') },
  },
  {
    whole: { ch: [...iiV(2), ...iiV(0), [0, 'maj7', 4]], n: nm('ii–Vs down by whole steps', 'ii–V יורדים בטונים', 'whole steps') },
    half: { ch: [...iiV(1), ...iiV(0), [0, 'maj7', 4]], n: nm('ii–Vs down by half steps', 'ii–V יורדים בחצאי טון', 'half steps', 'chromatic') },
    minor3: { ch: [...iiV(3), ...iiV(0), [0, 'maj7', 4]], n: nm('ii–Vs down by minor 3rds', 'ii–V יורדים בטרצות קטנות', 'minor thirds') },
    cycle: { ch: [[4, 'dom7', 2], [9, 'dom7', 2], [2, 'dom7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Dominant cycle (III7–VI7–II7–V7)', 'מעגל דומיננטות (III7–VI7–II7–V7)', 'cycle', 'dominants') },
  },
  {
    // Coltrane cycles: the answer is the key centres; each centre is reached by its own V7
    down: { ch: [[0, 'maj7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Centres down in major 3rds (I–♭VI–III)', 'מרכזים יורדים בטרצות גדולות (I–♭VI–III)', 'down major thirds', 'giant steps') },
    up: { ch: [[0, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Centres up in major 3rds (I–III–♭VI)', 'מרכזים עולים בטרצות גדולות (I–III–♭VI)', 'up major thirds', 'countdown') },
    min3: { ch: [[0, 'maj7', 2], [4, 'dom7', 2], [9, 'maj7', 2], [1, 'dom7', 2], [6, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Centres down in minor 3rds (I–VI–♯IV)', 'מרכזים יורדים בטרצות קטנות (I–VI–♯IV)', 'minor thirds') },
    whole: { ch: [[0, 'maj7', 2], [3, 'dom7', 2], [10, 'maj7', 2], [1, 'dom7', 2], [8, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Centres down in whole steps (I–♭VII–♭VI)', 'מרכזים יורדים בטונים (I–♭VII–♭VI)', 'whole steps') },
  },
];
TOPIC_GEN['jazz-chains'] = {
  title: { en: 'Backdoor, ii–V chains, Coltrane cycles', he: 'דלת אחורית, שרשראות ii–V, מעגלי קולטריין' },
  skill: 'cadences',
  levels: [
    { en: 'ii–V, backdoor, tritone sub or minor?', he: 'ii–V, דלת אחורית, תחליף טריטון או מינורי?' },
    { en: 'ii–V chains: which way do they move?', he: 'שרשראות ii–V: לאן הן זזות?' },
    { en: 'Coltrane cycles: name the key centres', he: 'מעגלי קולטריין: מה המרכזים הטונליים?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(3, level));
    const set = CHAINS[lv - 1];
    const keys = Object.keys(set);
    const ans = pickR(rnd, keys);
    const choices = shuffleR(rnd, keys.slice());
    const key = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    const bpm = lv === 3 ? 160 : 132;
    const names: Names = {};
    for (const k of choices) names[k] = set[k].n;
    return choiceQ({
      id, topic: 'jazz-chains', level: lv, seed, skill: 'cadences', difficulty: [1440, 1540, 1660][lv - 1],
      ask: lv === 3 ? { en: 'Which key centres?', he: 'אילו מרכזים טונליים?' } : { en: 'What are the changes?', he: 'מה המהלך?' },
      names, answer: ans, choices, stimulus: [jazzProgStim(key, set[ans].ch, bpm)], choiceStim: Object.fromEntries(choices.map((k) => [k, [jazzProgStim(key, set[k].ch, bpm)]])),
    });
  },
};
TOPIC_TAGS['jazz-chains'] = tg(['cadences', 'progression', 0.7], ['chords', 'seventh', 0.3]);

// ================================================================ name-standard (Name That Standard)

/** The tunes of the game (forms, studies and vamps in standards.ts are left out) and their short names. */
export const NTS_TUNES: { id: string; name?: string; level: number; like?: string[] }[] = [
  { id: 'blues-f', name: 'Jazz blues', level: 1, like: ['bird-blues', 'minor-blues'] },
  { id: 'minor-blues', name: 'Minor blues', level: 1, like: ['blues-f'] },
  { id: 'bird-blues', name: 'Bird blues (Blues for Alice changes)', level: 1, like: ['blues-f'] },
  { id: 'rhythm-full', name: 'Rhythm changes', level: 1, like: ['a-train'] },
  { id: 'autumn', level: 1, like: ['blue-bossa', 'never-another'] },
  { id: 'satin', level: 2, like: ['tune-up', 'misty'] },
  { id: 'blue-bossa', level: 2, like: ['autumn', 'song-father'] },
  { id: 'misty', level: 2, like: ['satin', 'never-another'] },
  { id: 'a-train', level: 2, like: ['rhythm-full'] },
  { id: 'ipanema', level: 2, like: ['blue-bossa'] },
  { id: 'so-what', name: 'So What', level: 2, like: ['maiden', 'cantaloupe'] },
  { id: 'attya', level: 3, like: ['stella', 'never-another'] },
  { id: 'tune-up', level: 3, like: ['solar', 'satin'] },
  { id: 'never-another', level: 3, like: ['attya', 'misty'] },
  { id: 'stella', level: 3, like: ['attya', 'solar'] },
  { id: 'valentine', level: 3, like: ['minor-blues', 'autumn'] },
  { id: 'song-father', level: 3, like: ['blue-bossa'] },
  { id: 'cantaloupe', level: 3, like: ['so-what', 'maiden'] },
  { id: 'maiden', level: 3, like: ['so-what', 'cantaloupe'] },
  { id: 'solar', level: 3, like: ['tune-up', 'stella'] },
  { id: 'ladybird', level: 3, like: ['tune-up', 'satin'] },
  { id: 'giant', level: 3, like: ['ladybird', 'tune-up'] },
];
const tuneOf = (id: string): StandardChanges | undefined => STANDARD_CHANGES.find((s) => s.id === id);
export const ntsName = (t: (typeof NTS_TUNES)[number]) => t.name ?? tuneOf(t.id)?.name ?? t.id;
/** The bars of a chart text, "%" written out. */
export function chartBars(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.replace(/\n/g, '|').split('|')) {
    const b = raw.trim();
    if (!b) continue;
    out.push(b === '%' && out.length ? out[out.length - 1] : b);
  }
  return out;
}
/** Where an excerpt starts (bar index): level 1–2 bar 1; level 3 the bridge of a 32-bar form or bar 9; level 4 anywhere in the middle. */
export function ntsStart(bars: number, level: number, rnd: () => number): number {
  if (level <= 2 || bars <= 8) return 0;
  if (level === 3) return bars >= 32 ? 16 : 8;
  return Math.min(bars - 4, 4 + Math.floor(rnd() * Math.max(1, bars - 8)));
}
/** The excerpt (4 bars) as our comping: walking bass, piano, light drums — no melody. */
export function ntsStim(t: StandardChanges, from: number, transpose: number): Stimulus {
  const bars = chartBars(t.text);
  const ex = bars.slice(from, from + 4);
  const text = transpose ? transposeChart(ex.join(' | '), transpose) : ex.join(' | ');
  const style = t.style === 'waltz' ? 'waltz' : t.style === 'bossa' ? 'bossa' : t.style === 'ballad' ? 'ballad' : 'swing';
  const bpm = Math.max(100, Math.min(180, t.bpm));
  const b = chartBacking(parseChart(text, style === 'waltz' ? 3 : 4), style, bpm, 1, style === 'waltz' ? 3 : 4, { countIn: false });
  return eventsStim(b.events, b.length + 0.3);
}
TOPIC_GEN['name-standard'] = {
  title: { en: 'Name the standard by its changes', he: 'לזהות סטנדרט לפי המהלך' },
  skill: 'cadences',
  levels: [
    { en: 'Blues forms, rhythm changes, Autumn Leaves', he: 'צורות בלוז, ריתם צ׳יינג׳ס, עלי שלכת' },
    { en: '+ Satin Doll, Blue Bossa, Misty and more', he: '+ סאטן דול, בלו בוסה, מיסטי ועוד' },
    { en: 'Any tune, from the bridge or bar 9', he: 'כל שיר, מהגשר או מתיבה 9' },
    { en: 'Another key, mid-form, look-alike tunes', he: 'סולם אחר, מאמצע הצורה, שירים דומים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(4, level));
    const pool = NTS_TUNES.filter((t) => t.level <= Math.min(3, lv) && tuneOf(t.id));
    const ans = pickR(rnd, pool);
    // decoys: look-alike tunes first at level 4, else any from the pool
    const like = lv >= 4 ? (ans.like ?? []).filter((x) => pool.some((p) => p.id === x)) : [];
    const rest3 = shuffleR(rnd, pool.filter((p) => p.id !== ans.id && !like.includes(p.id)).map((p) => p.id));
    const choices = shuffleR(rnd, [ans.id, ...[...like, ...rest3].slice(0, 3)]);
    const t = tuneOf(ans.id)!;
    const from = ntsStart(chartBars(t.text).length, lv, rnd);
    const transpose = lv >= 4 ? pickR(rnd, [-5, -3, -2, 2, 3, 5]) : 0;
    const names: Names = {};
    for (const k of choices) {
      const n = ntsName(NTS_TUNES.find((x) => x.id === k)!);
      names[k] = { en: n, he: n };
    }
    return choiceQ({
      id, topic: 'name-standard', level: lv, seed, skill: 'cadences', difficulty: [1150, 1250, 1380, 1520][lv - 1],
      ask: { en: 'Which tune are these changes from?', he: 'מאיזה שיר המהלך הזה?' }, names, answer: ans.id, choices,
      stimulus: [ntsStim(t, from, transpose)],
    });
  },
};
TOPIC_TAGS['name-standard'] = tg(['cadences', 'standards', 0.7], ['form', 'standards', 0.3]);
