// AUDIT-7 (docs/research/AUDIT-7-GAPS.md #2, #8, #9): the voice course's thin places, as measured levels.
//
//  v-first 4–7 (2104–2107)  #8  match a played note · sing back a two-bar rhythm on "da" (RSL ear test 2) · echo five
//                               notes · a four-bar song with the band
//  v-jazz1  (2301–2304)     #2  the singer's jazz entry below 1000: scat calls one bar long · the first phrase of a blues
//                               head · the whole head, in time · guide tones (3rds and 7ths) on a blues
//  v-impro  (2311–2314)     #8  improvising outside jazz from 900 (RSL Vocals improvisation, Trinity "Improvising"):
//                               call and response over I–IV–V · answer phrases on I–IV–V · the major pentatonic · the
//                               minor pentatonic over a rock groove
//  v-pop    (2321–2325)     #9  pop and theatre style at 1150–1400: mix-voice basics through the break · belt-safe range
//                               work · riffs-lite · pop phrasing · theatre phrasing
//
// Everything is measured by the existing graders (hold, melody with its pulse, time, song, scat, siren, arc): pitch inside
// the course's pass band (vocal.passCents), a loose timing grade on the pulse, never a self-report. What the
// microphone can't hear is not claimed: belt and mix are kinds of vocal registration, so v-pop measures what they are
// built on (a smooth passage through the break, phrases kept below the top of the range, the loudness arc, in-tune short
// riffs, the phrasing rules of the song grader) and the lessons give the standard safety advice. Key-relative melodies
// and riffs carry `more.key12` (every session another key, voiceTop.sessionKeyItem). Pure data.

import type { VocalItem, VocalLevel } from './vocal';

type Bi = { en: string; he: string };
type Item = Omit<VocalItem, 'id' | 'level'>;

function lv(n: number, pass: number, items: Item[]): VocalLevel {
  return { level: n, pass, kind: [...new Set(items.map((i) => i.kind))], items: items.map((it, k) => ({ ...it, id: `va${n}-${k + 1}`, level: n })) };
}
/** Hear a note, then sing it and hold it (the reference only before the voice). */
const MATCH = (at: number, difficulty: number): Item => ({ kind: 'hold', seconds: 2, reference: 'before', at, difficulty });
/** A rhythm call on one note, `bars` long, copied right after it (clicks on every beat, straight). */
const CALL = (bpm: number, call: number[], answerAt: number, difficulty: number, swing = false): Item => ({
  kind: 'time',
  seconds: (((answerAt * 2) / 4 + 1) * 4 * 60) / bpm,
  reference: 'before',
  at: 0.4,
  time: { bpm, meter: 4, bars: (answerAt * 2) / 4, hits: call.map((x) => x + answerAt), feel: 'call', call, answerAt, ...(swing ? { clickOn: [1, 3] } : {}) },
  difficulty,
});
/** An echo: the app plays the line in its rhythm, the singer sings it back (pitch and rhythm, on the pulse). */
const ECHO = (steps: number[], beats: number[], bpm: number, difficulty: number, at = 0.35): Item => ({
  kind: 'melody',
  seconds: Math.round((beats.reduce((a, b) => a + b, 0) * 60) / bpm + 3),
  reference: 'before',
  at,
  steps,
  noteSecs: beats.map((b) => (b * 60) / bpm),
  ear: { mode: 'echo' },
  more: { key12: true },
  difficulty,
});
const SONG = (id: string, s: Omit<NonNullable<VocalItem['song']>, 'id'>, difficulty: number, seconds = 30): Item => ({ kind: 'song', seconds, reference: 'before', song: { id, ...s }, difficulty });
const SCAT = (sc: NonNullable<VocalItem['scat']>, difficulty: number, seconds = 30): Item => ({ kind: 'scat', seconds, reference: 'before', scat: sc, difficulty });
/** A key-relative melody on a pulse (bpm, notes a beat), placed at `at` in the singer's range. */
const MEL = (steps: number[], bpm: number, perBeat: number, difficulty: number, at = 0.4): Item => ({
  kind: 'melody',
  seconds: Math.ceil((steps.length / perBeat) * (60 / bpm)) + 2,
  reference: 'before',
  at,
  steps,
  bpm,
  perBeat,
  more: { key12: true },
  difficulty,
});
/** Full tempo of a riff: sixteenths at ♩ 80 (as v-agility). */
const RIFF_FULL_BPM = 80;
const RIFF = (steps: number[], pct: number, shape: NonNullable<VocalItem['run']>['shape'], difficulty: number, at = 0.4): Item => {
  const bpm = Math.round((RIFF_FULL_BPM * pct) / 100);
  return { kind: 'melody', seconds: Math.ceil((steps.length * 60) / bpm / 4) + 3, reference: 'before', at, steps, bpm, perBeat: 4, run: { pct, shape }, more: { key12: true }, difficulty };
};

// ---------------------------------------------------------------- v-first 4–7 (#8)

export const FIRST_MORE_LEVELS: VocalLevel[] = [
  // 4: match a played note — it sounds, then stops; sing it and hold it two seconds (three places in the range)
  lv(2104, 0.55, [MATCH(0.35, 740), MATCH(0.5, 760), MATCH(0.25, 770)]),
  // 5: sing back a two-bar rhythm on "da" (RSL ear test 2): quarters and rests, then 8th pairs
  lv(2105, 0.58, [CALL(80, [0, 1, 2, 4, 5, 6], 8, 780), CALL(80, [0, 1, 1.5, 2, 4, 5, 6], 8, 800), CALL(84, [0, 0.5, 1, 2, 4, 4.5, 5, 6], 8, 820)]),
  // 6: echo five notes (steps of the major scale, a leap of a third last)
  lv(2106, 0.58, [ECHO([0, 2, 4, 2, 0], [1, 1, 1, 1, 2], 84, 820), ECHO([4, 2, 0, 2, 4], [1, 1, 1, 1, 2], 84, 830), ECHO([0, 2, 4, 5, 4], [1, 1, 1, 1, 2], 88, 850), ECHO([0, 4, 2, 4, 0], [1, 1, 1, 1, 2], 88, 860)]),
  // 7: a four-bar song with the band (the first phrase of a level-1 public-domain song), pitch and time graded
  lv(2107, 0.62, [SONG('mary', { phrases: [0, 0], band: true, rhythm: true, need: 0.62, bpm: 84 }, 870, 16), SONG('ode', { phrases: [0, 0], band: true, rhythm: true, need: 0.62, bpm: 84 }, 880, 16)]),
];

// ---------------------------------------------------------------- v-jazz1 (#2)

const BLUES_C = 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | C7';
export const JAZZ_START_LEVELS: VocalLevel[] = [
  // 1: scat calls one bar long — copy the rhythm on one note, swung, clicks on 2 and 4
  lv(2301, 0.58, [CALL(92, [0, 1, 2], 4, 870, true), CALL(92, [0, 0.67, 1, 2], 4, 890, true), CALL(96, [1, 1.67, 3], 4, 910, true)]),
  // 2: the first phrase of a blues head with the band (pitch graded; the rhythm only shown)
  lv(2302, 0.62, [SONG('riff-blues', { phrases: [0, 0], band: true, rhythm: false, need: 0.62, bpm: 88 }, 920, 16), SONG('blue-window', { phrases: [0, 0], band: true, rhythm: false, need: 0.62, bpm: 88 }, 950, 16)]),
  // 3: the whole blues head, in time
  lv(2303, 0.65, [SONG('riff-blues', { band: true, rhythm: true, need: 0.65 }, 960, 40)]),
  // 4: guide tones on a blues — a 3rd or a 7th of each chord, a half note each, slow swing
  lv(2304, 0.58, [SCAT({ mode: 'guide', chart: BLUES_C, style: 'swing', bpm: 76 }, 990, 45)]),
];

// ---------------------------------------------------------------- v-impro (#8)

const I_IV_V = 'C | F | G | C | C | F | G | C';
const I_IV_V_2 = 'C | F | C | G | C | F | G | C';
export const MAJOR_PENTA = [0, 2, 4, 7, 9];
export const MINOR_PENTA = [0, 3, 5, 7, 10];
export const IMPRO_LEVELS: VocalLevel[] = [
  // 1: call and response — the band plays two bars, you answer two, over I–IV–V (chord tones on the strong beats)
  lv(2311, 0.55, [SCAT({ mode: 'trade', chart: I_IV_V, style: 'pop', bpm: 84, turn: 2 }, 900), SCAT({ mode: 'trade', chart: I_IV_V_2, style: 'pop', bpm: 88, turn: 2 }, 930)]),
  // 2: answer phrases on I–IV–V — free notes, a chord tone on beat 1 of every chord, the last one too
  lv(2312, 0.56, [SCAT({ mode: 'landing', chart: I_IV_V, style: 'pop', bpm: 88 }, 1000), SCAT({ mode: 'landing', chart: I_IV_V_2, style: 'pop', bpm: 92 }, 1040)]),
  // 3: the major pentatonic over I–vi–IV–V: only its five notes, in time, ending on a chord tone
  lv(2313, 0.56, [SCAT({ mode: 'scale', scale: MAJOR_PENTA, chart: 'C | Am | F | G | C | Am | F G | C', style: 'pop', bpm: 92 }, 1100), SCAT({ mode: 'scale', scale: MAJOR_PENTA, chart: I_IV_V, style: 'pop', bpm: 96 }, 1140)]),
  // 4: the minor pentatonic over a rock groove, then a pentatonic motif developed over I–IV–V
  lv(2314, 0.56, [
    SCAT({ mode: 'scale', scale: MINOR_PENTA, chart: 'Cm | Bb | Ab | Bb | Cm | Bb | Ab | G', style: 'rock', bpm: 96 }, 1250),
    SCAT({ mode: 'motif', chart: I_IV_V, style: 'pop', bpm: 92, cell: [[0, 4, 1], [1, 2, 1], [2, 0, 2]] }, 1280),
  ]),
];

// ---------------------------------------------------------------- v-pop (#9)

export const POP_LEVELS: VocalLevel[] = [
  // 1: mix-voice basics — a siren through the break, then a bright five-note scale across it (sung on "nay"), kept even
  lv(2321, 0.58, [
    { kind: 'siren', seconds: 5, reference: 'before', at: [0.3, 0.85], difficulty: 1150 },
    MEL([0, 2, 4, 5, 7, 5, 4, 2, 0], 76, 1, 1160, 0.5),
    MEL([0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0], 76, 1, 1180, 0.45),
  ]),
  // 2: belt-safe range work — strong pop phrases in the upper middle of the range (never the top), then a phrase that
  // grows to its peak note and comes back down (the loudness arc measured)
  lv(2322, 0.58, [
    MEL([0, 2, 4, 4, 2, 4, 5, 4], 88, 1, 1210, 0.4),
    MEL([4, 5, 7, 7, 5, 4, 2, 0], 88, 1, 1230, 0.4),
    { kind: 'arc', seconds: 9, reference: 'before', at: 0.45, steps: [0, 2, 4, 5, 7, 5, 4, 2, 0], noteSecs: Array(9).fill(0.7), more: { levels: [0, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0] }, difficulty: 1240 },
  ]),
  // 3: riffs-lite — short pentatonic riffs and a turn, sung back at 60 % then 80 % of full tempo
  lv(2323, 0.56, [RIFF([7, 9, 7, 4, 2, 0], 60, 'penta', 1290), RIFF([4, 2, 0, -3, 0], 60, 'penta', 1300), RIFF([2, 4, 2, 0, -1, 0], 70, 'turn', 1310), RIFF([9, 7, 4, 2, 4, 0], 80, 'penta', 1330)]),
  // 4: pop phrasing — make the melody yours (keep the long notes, move the rhythm), then lift the chorus
  lv(2324, 0.62, [SONG('morning-line', { phrases: [0, 1], band: true, rhythm: false, need: 0.62, interpret: true }, 1340), SONG('paper-boats', { band: true, rhythm: true, need: 0.66, chorus: true }, 1360)]),
  // 5: theatre phrasing — long notes held steady to the end of the phrase, the chorus lifted
  lv(2325, 0.66, [SONG('northern-lights', { phrases: [0, 1], band: true, rhythm: true, need: 0.66, longNotes: 'steady' }, 1390), SONG('paper-boats', { band: true, rhythm: true, need: 0.66, chorus: true, longNotes: 'steady' }, 1410)]),
];

/** Every new level of this stage. */
export const AUDIT7_VOICE_LEVELS: VocalLevel[] = [...FIRST_MORE_LEVELS, ...JAZZ_START_LEVELS, ...IMPRO_LEVELS, ...POP_LEVELS];

/** The three new families (v-first grows in voiceFamilies.ts). */
export const AUDIT7_VOICE_FAMILIES: { id: string; title: Bi; refs: number[]; stage: 'A' | 'B' | 'C' }[] = [
  { id: 'v-jazz1', title: { en: 'Blues and scat start', he: 'התחלה בבלוז וסקאט' }, refs: JAZZ_START_LEVELS.map((l) => l.level), stage: 'B' },
  { id: 'v-impro', title: { en: 'Improvising in pop', he: 'אלתור בפופ' }, refs: IMPRO_LEVELS.map((l) => l.level), stage: 'B' },
  { id: 'v-pop', title: { en: 'Pop and theatre style', he: 'סגנון פופ ותיאטרון' }, refs: POP_LEVELS.map((l) => l.level), stage: 'B' },
];

/** Level names (he + en). */
export const AUDIT7_VOICE_NAMES: Record<number, Bi> = {
  2104: { en: 'Match the note', he: 'להתאים לצליל' },
  2105: { en: 'Sing back a rhythm', he: 'לשיר קצב בחזרה' },
  2106: { en: 'Echo five notes', he: 'הד של חמישה צלילים' },
  2107: { en: 'A four-bar song', he: 'שיר של ארבע תיבות' },
  2301: { en: 'Scat calls, one bar', he: 'קריאות סקאט, תיבה אחת' },
  2302: { en: 'A blues head: the first phrase', he: 'נושא בלוז: המשפט הראשון' },
  2303: { en: 'The whole blues head', he: 'נושא הבלוז כולו' },
  2304: { en: 'Guide tones on a blues', he: 'צלילים מנחים על בלוז' },
  2311: { en: 'Call and response', he: 'שאלה ותשובה' },
  2312: { en: 'Answers on I–IV–V', he: 'תשובות על שלושה אקורדים' },
  2313: { en: 'The major pentatonic', he: 'הפנטטוני המז׳ורי' },
  2314: { en: 'Minor pentatonic, rock', he: 'פנטטוני מינורי, רוק' },
  2321: { en: 'Mix voice: through the break', he: 'קול מעורב: דרך המעבר' },
  2322: { en: 'Strong, not pushed', he: 'חזק, בלי לדחוף' },
  2323: { en: 'Short riffs', he: 'ריפים קצרים' },
  2324: { en: 'Pop phrasing', he: 'פרייזינג בפופ' },
  2325: { en: 'Theatre phrasing', he: 'פרייזינג בתיאטרון' },
};
