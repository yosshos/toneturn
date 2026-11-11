// The voice course's families (docs/research/VOICE_CURRICULUM.md §5): 15 families + Barry Harris. Old levels keep
// their numbers and facts and are only re-homed by this display map (family → list of level numbers); new levels get
// new number bases (600 breath, 700 pitch, 800 range, 900 dynamics, 1000 vibrato, 1100 time, 1200 ear, 1300 songs,
// 1400 standards, 1500 scat, 1600 agility, 1700 harmony, 1800 inflections, 1900 sight). Pure data.

import { BARRY_LEVELS, HARMONY_LEVELS, LADDER, MODE_LEVELS, ORNAMENT_LEVELS, SIGHT_LEVELS, type VocalItem, type VocalLevel } from './vocal';
import { SONGBOOK, songNotes } from '../content/songbook';

type Bi = { en: string; he: string };
type Item = Omit<VocalItem, 'id' | 'level'>;

/** A new level: items get ids "<prefix><n>-<k>" (never reused). */
function lv(n: number, pass: number, items: Item[]): VocalLevel {
  return { level: n, pass, kind: [...new Set(items.map((i) => i.kind))], items: items.map((it, k) => ({ ...it, id: `vf${n}-${k + 1}`, level: n })) };
}

// ---------------------------------------------------------------- F7 time feel (1100)

const TIME = (bpm: number, bars: number, hits: number[], feel: NonNullable<VocalItem['time']>['feel'], difficulty: number, extra: Partial<NonNullable<VocalItem['time']>> = {}): Item => ({
  kind: 'time',
  seconds: ((bars + 1) * 4 * 60) / bpm,
  reference: 'before',
  at: 0.4,
  time: { bpm, meter: 4, bars, hits, feel, ...extra },
  difficulty,
});
/** A one-bar pattern repeated over `bars` bars (beats inside the bar). */
const rep = (pattern: number[], bars: number) => Array.from({ length: bars }, (_, b) => pattern.map((x) => b * 4 + x)).flat();
const swung = (beats: number) => Array.from({ length: beats }, (_, k) => [k, k + 2 / 3]).flat();

export const TIME_LEVELS: VocalLevel[] = [
  // L2: "dah" on the click, then on 2 and 4 only (the jazz backbeat)
  lv(1101, 0.6, [TIME(80, 4, rep([0, 1, 2, 3], 4), 'on', 1050), TIME(90, 4, rep([1, 3], 4), 'on', 1100, { clickOn: [1, 3] }), TIME(100, 4, rep([0, 1, 2, 3], 4), 'on', 1150)]),
  // L3: rests and pickups — entries on the "and"
  lv(1102, 0.6, [TIME(84, 4, rep([1.5, 3], 4), 'entry', 1150), TIME(88, 4, rep([0.5, 2, 3.5], 4), 'entry', 1200), TIME(92, 4, rep([0, 1, 3.5], 4), 'entry', 1250)]),
  // L4: anticipations — the next downbeat pushed an eighth early
  lv(1103, 0.58, [TIME(88, 4, rep([0, 1, 2, 3.5], 4), 'anticipate', 1250), TIME(96, 4, rep([0, 1.5, 3.5], 4), 'anticipate', 1300)]),
  // L5: swing eighths on "doo-bah", clicks on 2 and 4
  lv(1104, 0.58, [TIME(100, 2, swung(8), 'swing', 1300, { clickOn: [1, 3] }), TIME(120, 2, swung(8), 'swing', 1350, { clickOn: [1, 3] }), TIME(144, 2, swung(8), 'swing', 1400, { clickOn: [1, 3] })]),
  // L6: the same four bars on top of the beat, then laid back
  lv(1105, 0.58, [TIME(96, 4, rep([0, 1, 2, 3], 4), 'on', 1350), TIME(96, 4, rep([0, 1, 2, 3], 4), 'behind', 1400)]),
  // L7: back-phrasing — start late, catch up by the target note
  lv(1106, 0.56, [TIME(88, 2, [], 'back', 1400, { written: [0, 1, 2, 3, 4], target: 4 }), TIME(96, 2, [], 'back', 1450, { written: [0, 0.5, 1, 2, 3, 4], target: 4 })]),
  // L8: the inner clock — 4 bars with the click, 4 silent, the next downbeat with the click again
  lv(1107, 0.56, [TIME(84, 9, Array.from({ length: 36 }, (_, k) => k), 'clock', 1450, { silent: [16, 32] }), TIME(100, 9, Array.from({ length: 36 }, (_, k) => k), 'clock', 1500, { silent: [16, 32] })]),
];

// ---------------------------------------------------------------- F13 songs with the band (1300)

const SONG = (id: string, s: Omit<NonNullable<VocalItem['song']>, 'id'>, difficulty: number): Item => ({ kind: 'song', seconds: 30, reference: 'before', song: { id, ...s }, difficulty });

export const SONG_LEVELS: VocalLevel[] = [
  // L2: one phrase over a pop groove (the Song Singer road starts here)
  lv(1301, 0.7, [SONG('twinkle', { phrases: [0, 0], band: true, rhythm: false, need: 0.7 }, 950), SONG('morning-line', { phrases: [0, 0], band: true, rhythm: false, need: 0.7 }, 1000), SONG('jacques', { phrases: [0, 0], band: true, rhythm: false, need: 0.7 }, 1000)]),
  // L3: two phrases, rhythm graded
  lv(1302, 0.7, [SONG('ode', { phrases: [0, 1], band: true, rhythm: true, need: 0.7 }, 1050), SONG('morning-line', { phrases: [0, 1], band: true, rhythm: true, need: 0.7 }, 1050), SONG('london', { phrases: [0, 1], band: true, rhythm: true, need: 0.7 }, 1050)]),
  // L4 (milestone Song Singer): a whole song, every phrase ≥ 0.75, the weakest looped slower until it passes
  lv(1303, 0.75, [SONG('twinkle', { band: true, rhythm: true, need: 0.75 }, 1100), SONG('morning-line', { band: true, rhythm: true, need: 0.75 }, 1100), SONG('saints', { band: true, rhythm: true, need: 0.75 }, 1150)]),
  // L5: our own pop songs — and the chorus louder than the verse
  lv(1304, 0.75, [SONG('paper-boats', { band: true, rhythm: true, need: 0.75, chorus: true }, 1150), SONG('city-rain', { band: true, rhythm: true, need: 0.75, chorus: true }, 1200)]),
  // L6: unaccompanied, from memory (ABRSM-style): the key once, then no band
  lv(1305, 0.7, [SONG('new-world', { band: false, rhythm: true, need: 0.7, drift: { max: 25, median: 25 } }, 1200), SONG('auld', { band: false, rhythm: true, need: 0.7, drift: { max: 25, median: 25 } }, 1250)]),
  // L7: minor keys and longer songs
  lv(1306, 0.75, [SONG('northern-lights', { band: true, rhythm: true, need: 0.75 }, 1250), SONG('korobeiniki', { band: true, rhythm: true, need: 0.75 }, 1300), SONG('greensleeves', { band: true, rhythm: true, need: 0.75 }, 1300)]),
  // L9: the performance take — one pass, no loops, scored and kept
  lv(1307, 0.8, [SONG('city-rain', { band: true, rhythm: true, need: 0.8, recital: true, chorus: true }, 1350), SONG('northern-lights', { band: true, rhythm: true, need: 0.8, recital: true }, 1350)]),
];

// ---------------------------------------------------------------- F2 drift: unaccompanied (701–705)

export const PITCH_LEVELS: VocalLevel[] = [
  // L4: fine tuning into a drone — within ±10 ¢ inside a second
  lv(701, 0.6, [
    { kind: 'fine-tune', seconds: 5, reference: 'during', at: 0.45, difficulty: 1050 },
    { kind: 'fine-tune', seconds: 5, reference: 'during', at: 0.3, difficulty: 1100 },
    { kind: 'fine-tune', seconds: 5, reference: 'during', at: 0.65, difficulty: 1100 },
  ]),
  // L5: the tonic again after a phrase, with nothing played between
  lv(702, 0.6, [
    { kind: 'drift-phrase', seconds: 8, reference: 'before', at: 0.3, steps: [0, 2, 4, 5, 7, 5, 4, 2, 0], difficulty: 1100 },
    { kind: 'drift-phrase', seconds: 9, reference: 'before', at: 0.3, steps: [0, 4, 7, 9, 7, 5, 4, 2, 0], difficulty: 1150 },
    { kind: 'drift-phrase', seconds: 9, reference: 'before', at: 0.35, steps: [0, -1, 2, 5, 4, 2, -1, 0], difficulty: 1200 },
  ]),
  // L6: eight bars of a folk song, unaccompanied
  lv(703, 0.62, [SONG('new-world', { band: false, rhythm: false, need: 0.6, drift: { max: 25, median: 25 } }, 1150), SONG('yonatan', { band: false, rhythm: false, need: 0.6, drift: { max: 25, median: 25 } }, 1150), SONG('michael-row', { band: false, rhythm: false, need: 0.6, drift: { max: 25, median: 25 } }, 1200)]),
  // L8: a minor song with chromatic notes, sixteen bars: the drift within 10 ¢
  lv(705, 0.6, [SONG('greensleeves', { band: false, rhythm: false, need: 0.6, tol: 40, drift: { max: 10, median: 15 } }, 1350), SONG('hevenu', { band: false, rhythm: false, need: 0.6, tol: 40, drift: { max: 10, median: 15 } }, 1400)]),
];

// ---------------------------------------------------------------- F14 standards (1400)

export const STANDARD_LEVELS: VocalLevel[] = [
  // L1: a blues head as written, swing 100
  lv(1401, 0.75, [SONG('blue-window', { band: true, rhythm: true, need: 0.75 }, 1300)]),
  // L2: a public-domain head, as written (the spirituals with our jazz chords)
  lv(1402, 0.75, [SONG('saints-jazz', { phrases: [0, 1], band: true, rhythm: true, need: 0.75 }, 1300), SONG('swing-low-jazz', { phrases: [0, 1], band: true, rhythm: true, need: 0.75 }, 1350)]),
  // L3: the same head interpreted — keep the long notes, move the rhythm
  lv(1403, 0.7, [SONG('saints-jazz', { phrases: [0, 1], band: true, rhythm: false, need: 0.65, interpret: true }, 1400), SONG('blue-window', { band: true, rhythm: false, need: 0.65, interpret: true }, 1450)]),
  // L4: a laid-back chorus — behind the beat, steadily
  lv(1404, 0.7, [SONG('corner-light', { band: true, rhythm: false, need: 0.65, feel: 'behind' }, 1450), SONG('saints-jazz', { phrases: [0, 1], band: true, rhythm: false, need: 0.65, feel: 'behind' }, 1450)]),
  // L5 (milestone Jazz Singer with scat L5): a ballad — long tones, one breath per phrase
  lv(1405, 0.75, [SONG('slow-harbor', { band: true, rhythm: false, need: 0.75, longNotes: 'steady' }, 1450), SONG('swing-low-jazz', { phrases: [0, 1], band: true, rhythm: false, need: 0.75, longNotes: 'steady', bpm: 66 }, 1500)]),
  // L7: a bossa — straight eighths, soft, no vibrato
  lv(1406, 0.75, [SONG('rio-gray', { band: true, rhythm: true, need: 0.75, longNotes: 'straight' }, 1500), SONG('city-rain', { band: true, rhythm: true, need: 0.75, longNotes: 'straight', phrases: [0, 1] }, 1450)]),
  // L8: a rhythm-changes head at 160, then 180
  lv(1407, 0.7, [SONG('fast-tracks', { band: true, rhythm: true, need: 0.7 }, 1550), SONG('fast-tracks', { band: true, rhythm: true, need: 0.7, bpm: 180 }, 1600), SONG('minor-street', { band: true, rhythm: true, need: 0.7 }, 1550)]),
];

// ---------------------------------------------------------------- F15 scat (1500)

const CALL = (bpm: number, call: number[], difficulty: number): Item => ({
  kind: 'time',
  seconds: (5 * 4 * 60) / bpm,
  reference: 'before',
  at: 0.4,
  time: { bpm, meter: 4, bars: 4, hits: call.map((x) => x + 8), feel: 'call', clickOn: [1, 3], call, answerAt: 8 },
  difficulty,
});
const SCAT = (mode: NonNullable<VocalItem['scat']>['mode'], chart: string, bpm: number, difficulty: number, loops = 1): Item => ({ kind: 'scat', seconds: 30, reference: 'before', scat: { mode, chart, style: 'swing', bpm, loops }, difficulty });
const BLUES = 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 A7 | Dm7 G7';
const TWO_FIVE = 'Dm7 | G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7';

export const SCAT_LEVELS: VocalLevel[] = [
  // L1: rhythmic scat on one note — copy the call (two bars), clicks on 2 and 4
  lv(1501, 0.6, [CALL(100, [0, 1, 1.67, 3], 1250), CALL(100, [0.67, 1.67, 2, 3, 4.67, 5], 1300), CALL(112, [0, 0.67, 1.67, 2.67, 4, 5.67, 6], 1350)]),
  // L4: guide tones — 3rds and 7ths through ii–V–I, half notes
  lv(1502, 0.6, [SCAT('guide', TWO_FIVE, 96, 1400), SCAT('guide', 'Dm7 | G7 | Em7 | A7 | Dm7 | G7 | Cmaj7 | Cmaj7', 104, 1450)]),
  // L5: chord-tone landing — free lines, a chord tone on beat 1 of every chord (milestone Jazz Singer)
  lv(1503, 0.58, [SCAT('landing', TWO_FIVE, 112, 1450), SCAT('landing', BLUES, 120, 1500)]),
  // L6: chromatic approach — land chord tones from a half step away
  lv(1504, 0.56, [SCAT('approach', TWO_FIVE, 112, 1550), SCAT('approach', BLUES, 126, 1600)]),
];

// ---------------------------------------------------------------- F6 agility: a bebop line (1600)

export const AGILITY_LEVELS: VocalLevel[] = [
  lv(1601, 0.7, [SONG('bop-line', { band: true, rhythm: true, need: 0.7, tol: 45 }, 1450), SONG('bop-line-2', { band: true, rhythm: true, need: 0.7, tol: 45 }, 1500)]),
  lv(1602, 0.7, [SONG('bop-line', { band: true, rhythm: true, need: 0.7, tol: 45, bpm: 160 }, 1550), SONG('bop-line-2', { band: true, rhythm: true, need: 0.7, tol: 45, bpm: 160 }, 1600)]),
];

// ---------------------------------------------------------------- F1 breath (600)

const b72 = 60 / 72;
export const BREATH_LEVELS: VocalLevel[] = [
  // L2: 10 s without a reference; the last quarter graded double (steady to the end of the breath)
  lv(601, 0.6, [
    { kind: 'breath-hold', seconds: 10, reference: 'before', at: 0.45, more: { finalShare: 0.25 }, difficulty: 1000 },
    { kind: 'breath-hold', seconds: 12, reference: 'before', at: 0.55, more: { finalShare: 0.25 }, difficulty: 1050 },
  ]),
  // L3: a four-bar phrase on one breath, 72 bpm
  lv(602, 0.6, [
    { kind: 'breath-phrase', seconds: 10, reference: 'before', at: 0.3, steps: [0, 2, 4, 2, 0], noteSecs: [2, 2, 2, 2, 2].map((x) => x * b72), difficulty: 1050 },
    { kind: 'breath-phrase', seconds: 11, reference: 'before', at: 0.3, steps: [0, 4, 7, 4], noteSecs: [2, 2, 2, 4].map((x) => x * b72), difficulty: 1100 },
  ]),
  // L4: a breath plan — breathe at the marks, and only there
  lv(603, 0.58, [
    { kind: 'breath-plan', seconds: 16, reference: 'before', at: 0.3, steps: [0, 2, 4, 5, 7, 5, 4, 2, 4, 2, 0], noteSecs: Array(11).fill(1.2), more: { breathAfter: [3, 7] }, difficulty: 1150 },
    { kind: 'breath-plan', seconds: 16, reference: 'before', at: 0.3, steps: [0, 4, 7, 9, 7, 4, 5, 4, 2, 0], noteSecs: Array(10).fill(1.3), more: { breathAfter: [4] }, difficulty: 1200 },
  ]),
  // L5: a 12–16 s phrase at a ballad tempo; the last note in tune
  lv(604, 0.58, [{ kind: 'breath-phrase', seconds: 18, reference: 'before', at: 0.35, steps: [0, 2, 4, 7, 4, 2, 0], noteSecs: Array(7).fill(2), difficulty: 1250 }]),
  // L6: 20 s on one breath, fading to the end
  lv(605, 0.56, [{ kind: 'breath-phrase', seconds: 22, reference: 'before', at: 0.45, steps: [7, 5, 4, 2, 0], noteSecs: Array(5).fill(4), curve: 'decresc', difficulty: 1350 }]),
];

// ---------------------------------------------------------------- F3 range and registers (800)

export const RANGE_LEVELS: VocalLevel[] = [
  // L3: a siren across the break — smooth, no crack
  lv(801, 0.58, [
    { kind: 'siren', seconds: 5, reference: 'before', at: [0.15, 0.95], difficulty: 1150 },
    { kind: 'siren', seconds: 5, reference: 'before', at: [0.3, 1], difficulty: 1200 },
  ]),
  // L4: five notes through the break, three times: soft, medium, loud
  lv(802, 0.56, [{ kind: 'terraced-scale', seconds: 14, reference: 'before', at: 0.55, steps: [0, 2, 4, 5, 7, 0, 2, 4, 5, 7, 0, 2, 4, 5, 7], noteSecs: Array(15).fill(0.6), more: { reps: 3 }, difficulty: 1250 }]),
  // L5: the edge — a half step above the top of your range, held for two seconds (a soft goal; never strain)
  lv(803, 0.5, [{ kind: 'edge', seconds: 2.5, reference: 'before', at: 1, more: { above: 1 }, difficulty: 1300 }]),
  // L6: an octave and a fifth, legato, on one breath (an octave when the range is smaller)
  lv(804, 0.56, [
    { kind: 'breath-phrase', seconds: 10, reference: 'before', at: 0.05, steps: [0, 4, 7, 12, 16, 19, 16, 12, 7, 4, 0], noteSecs: Array(11).fill(0.7), difficulty: 1400 },
    { kind: 'breath-phrase', seconds: 8, reference: 'before', at: 0.1, steps: [0, 4, 7, 12, 7, 4, 0], noteSecs: Array(7).fill(0.7), difficulty: 1300 },
  ]),
];

// ---------------------------------------------------------------- F4 dynamics (900)

export const DYN_LEVELS: VocalLevel[] = [
  // L1: crescendo, decrescendo and the swell on one note (the ornament program's dynamics, as their own level)
  lv(901, 0.58, [
    { kind: 'dynamic', seconds: 5, reference: 'before', at: 0.4, curve: 'cresc', difficulty: 1100 },
    { kind: 'dynamic', seconds: 5, reference: 'before', at: 0.45, curve: 'decresc', difficulty: 1100 },
    { kind: 'dynamic', seconds: 6, reference: 'before', at: 0.5, curve: 'swell', difficulty: 1150 },
  ]),
  // L3: terraced — soft, medium, loud on three notes, the pitch staying put
  lv(902, 0.58, [
    { kind: 'terraced', seconds: 7, reference: 'before', at: 0.4, steps: [0, 2, 4], noteSecs: [1.6, 1.6, 1.6], more: { levels: [0, 1, 2] }, difficulty: 1200 },
    { kind: 'terraced', seconds: 7, reference: 'before', at: 0.5, steps: [4, 2, 0], noteSecs: [1.6, 1.6, 1.6], more: { levels: [0, 1, 2] }, difficulty: 1250 },
  ]),
  // L4: accents where they are marked, and nowhere else
  lv(903, 0.56, [
    { kind: 'accents', seconds: 7, reference: 'before', at: 0.35, steps: [0, 2, 4, 5, 7, 5, 4, 2], noteSecs: Array(8).fill(0.5), more: { accents: [true, false, false, true, false, false, true, false] }, difficulty: 1250 },
    { kind: 'accents', seconds: 7, reference: 'before', at: 0.35, steps: [0, 4, 7, 4, 2, 5, 9, 5], noteSecs: Array(8).fill(0.5), more: { accents: [false, true, false, false, false, true, false, true] }, difficulty: 1300 },
  ]),
  // L5: the arc of a phrase — louder to its peak note, softer after it
  lv(904, 0.56, [{ kind: 'arc', seconds: 10, reference: 'before', at: 0.3, steps: [0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0], noteSecs: Array(11).fill(0.7), more: { levels: [0, 0.4, 0.8, 1.2, 1.6, 2, 1.6, 1.2, 0.8, 0.4, 0] }, difficulty: 1350 }]),
];

// ---------------------------------------------------------------- F5 vibrato (1000)

export const VIB_LEVELS: VocalLevel[] = [
  // L4: jazz style — straight for two thirds of the note, then a narrow vibrato
  lv(1001, 0.58, [
    { kind: 'vibrato-jazz', seconds: 6, reference: 'before', at: 0.45, cueOn: 4, difficulty: 1300 },
    { kind: 'vibrato-jazz', seconds: 7.5, reference: 'before', at: 0.55, cueOn: 5, difficulty: 1350 },
  ]),
  // L5: vibrato only on the last note of each phrase
  lv(1002, 0.56, [
    { kind: 'vibrato-notes', seconds: 9, reference: 'before', at: 0.35, steps: [0, 2, 4, 2, 4, 5, 7, 4], noteSecs: [0.5, 0.5, 0.5, 1.8, 0.5, 0.5, 0.5, 1.8], vibNotes: [false, false, false, true, false, false, false, true], difficulty: 1350 },
    { kind: 'vibrato-notes', seconds: 9, reference: 'before', at: 0.4, steps: [7, 5, 4, 5, 4, 2, 0], noteSecs: [0.5, 0.5, 0.5, 1.8, 0.5, 0.5, 2.2], vibNotes: [false, false, false, true, false, false, true], difficulty: 1400 },
  ]),
  // L6: a terminal vibrato that widens a little to the end
  lv(1003, 0.56, [{ kind: 'vibrato-widen', seconds: 6, reference: 'before', at: 0.5, difficulty: 1400 }]),
  // L7: straight tone in close harmony — no vibrato while the chord sounds
  lv(1004, 0.58, [
    { kind: 'harmony-hold', seconds: 4, reference: 'during', at: 0.45, accompany: [-4, 3], more: { straight: true, tone: '3' }, difficulty: 1350 },
    { kind: 'harmony-hold', seconds: 4, reference: 'during', at: 0.5, accompany: [-7, -3, 2], more: { straight: true, tone: '5' }, difficulty: 1400 },
  ]),
  // L8: the same vibrato on five notes across the range
  lv(1005, 0.56, [{ kind: 'vibrato-register', seconds: 4, reference: 'before', at: [0.1, 0.3, 0.5, 0.7, 0.9], difficulty: 1450 }]),
];

// ---------------------------------------------------------------- F10 the singer's ear (1200)

const TONE = (accompany: number[], tone: string, at: number, difficulty: number): Item => ({ kind: 'harmony-hold', seconds: 4, reference: 'during', at, accompany, more: { tone }, difficulty });
export const EAR_LEVELS: VocalLevel[] = [
  // L4: a named chord tone of a sounding triad or seventh chord
  lv(1201, 0.6, [TONE([-4, 3], '3', 0.45, 1150), TONE([-7, -3], '5', 0.5, 1150), TONE([-10, -6, -3], '7', 0.5, 1200), TONE([-3, 4, 7], 'R', 0.35, 1200)]),
  // L6: tensions on demand over a voiced chord: 9, 11, 13, ♭9, ♯11
  lv(1202, 0.58, [TONE([-14, -10, -7, -3], '9', 0.55, 1350), TONE([-17, -14, -10, -7], '11', 0.55, 1400), TONE([-21, -11, -5, -2], '13', 0.6, 1400), TONE([-13, -9, -6, -3], '♭9', 0.55, 1450), TONE([-18, -14, -11, -7], '♯11', 0.6, 1500)]),
];

// ---------------------------------------------------------------- F11 harmony singing (1700)

const LINE = (extra: Partial<VocalItem>, difficulty: number): Item => ({ kind: 'harmony-line', seconds: 10, reference: 'during', at: 0.4, ...extra, difficulty });
export const HARMONY_MORE_LEVELS: VocalLevel[] = [
  // L6: backing vocals — an "oo" pad (two beats a note) under a lead the app plays
  lv(1701, 0.56, [LINE({ steps: [4, 5, 4, 2], melody: [7, 9, 9, 12, 7, 11, 7, 9], bpm: 76, perBeat: 0.5 }, 1350), LINE({ steps: [0, 2, 4, 2], melody: [4, 5, 5, 9, 7, 11, 5, 7], bpm: 76, perBeat: 0.5 }, 1400)]),
  // L7: the guide-tone line held while the bass moves (ii–V–I and on)
  lv(1702, 0.56, [
    LINE({ steps: [0, -1, 4, 7, 6, 5, 4], chords: [[-10, -3, 5], [-17, -10, -7], [-12, -5, -1], [-15, 0, 4], [-10, -3, 0], [-17, -1, 2], [-12, -5, -1]], bpm: 60, perBeat: 1, at: 0.45 }, 1450),
  ]),
  // L8: close harmony in three parts — you sing the middle part
  lv(1703, 0.55, [LINE({ steps: [4, 5, 2, 0, 5, 2, 4], chords: [[0, 7], [0, 9], [-1, 7], [-3, 4], [0, 9], [-1, 5], [0, 7]], bpm: 60, perBeat: 1, at: 0.4 }, 1500)]),
];

// ---------------------------------------------------------------- F12 inflections (1800)

const INF = (shape: 'scoop' | 'fall' | 'bend' | 'ghost', at: number, difficulty: number, steps?: number[]): Item => ({ kind: 'inflect', seconds: 3, reference: 'before', at, more: { shape }, ...(steps ? { steps, noteSecs: steps.map(() => 0.5) } : {}), difficulty });
export const INFLECT_LEVELS: VocalLevel[] = [
  // L4: an intentional scoop into the note, and a fall-off at its end
  lv(1801, 0.56, [INF('scoop', 0.45, 1350), INF('scoop', 0.6, 1350), INF('fall', 0.55, 1400), INF('fall', 0.4, 1400)]),
  // L5: the blue-note bend (♭3 toward 3), and a ghosted note
  lv(1802, 0.55, [INF('bend', 0.45, 1450), INF('bend', 0.55, 1450), INF('ghost', 0.4, 1450, [0, 2, 4]), INF('ghost', 0.4, 1500, [7, 5, 4])]),
];

// ---------------------------------------------------------------- F9 sight-singing (1900) and F8 arpeggios (2000)

const SIGHTX = (steps: number[], durs: number[], bpm: number, difficulty: number, clef?: 'bass'): Item => ({ kind: 'sight', seconds: 12, reference: 'before', at: 0.3, steps, durs, bpm, ...(clef ? { more: { clef } } : {}), difficulty });
export const SIGHT_MORE_LEVELS: VocalLevel[] = [
  // L6: bass clef for low voices (the same reading as L3–L5)
  lv(1901, 0.56, SIGHT_LEVELS.slice(2, 5).map((l, k) => ({ ...l.items[k], more: { clef: 'bass' as const } })).map(({ id: _id, level: _lv, ...it }) => it)),
  // L7: chromatic neighbours and passing notes
  lv(1902, 0.55, [
    SIGHTX([0, 2, 4, 5, 6, 7, 9, 7, 6, 7], [1, 1, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 2], 76, 1450),
    SIGHTX([7, 6, 7, 4, 3, 4, 0, 1, 2, 0], [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 2], 76, 1500),
    SIGHTX([0, 3, 2, 3, 5, 6, 7, 8, 7, 5, 3, 0], [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 2], 80, 1550),
  ]),
];
export const ARPEGGIO_LEVELS: VocalLevel[] = [
  // Arpeggios as a technical exercise (RSL lists them): triads, sevenths, ninths
  lv(2001, 0.6, [
    { kind: 'melody', seconds: 7, reference: 'before', at: 0.2, steps: [0, 4, 7, 12, 7, 4, 0], difficulty: 1150 },
    { kind: 'melody', seconds: 7, reference: 'before', at: 0.2, steps: [0, 3, 7, 12, 7, 3, 0], difficulty: 1150 },
    { kind: 'melody', seconds: 8, reference: 'before', at: 0.15, steps: [0, 4, 7, 10, 12, 10, 7, 4, 0], difficulty: 1250 },
    { kind: 'melody', seconds: 8, reference: 'before', at: 0.15, steps: [0, 3, 7, 10, 12, 10, 7, 3, 0], difficulty: 1250 },
    { kind: 'melody', seconds: 9, reference: 'before', at: 0.1, steps: [0, 4, 7, 11, 14, 11, 7, 4, 0], difficulty: 1350 },
  ]),
];

// ---------------------------------------------------------------- F15 scat, further (1505–1506)

export const SCAT_MORE_LEVELS: VocalLevel[] = [
  // L8: tensions in the line — the 9 and the 13 on dominants, ♯11 on major sevenths, on strong beats
  lv(1505, 0.56, [SCAT('tensions', 'Dm7 | G7 | Cmaj7 | Cmaj7 | Em7 | A7 | Dm7 | G7', 112, 1600), SCAT('tensions', BLUES, 120, 1650)]),
  // L9: style — a bossa (straight) and a minor blues (swing), landing on chord tones in each
  lv(1506, 0.56, [{ ...SCAT('landing', 'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7b9 | Dm7 | G7', 120, 1600), scat: { mode: 'landing', chart: 'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7b9 | Dm7 | G7', style: 'bossa', bpm: 120 } }, SCAT('landing', 'Cm7 | Fm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7', 120, 1650)]),
];

// ---------------------------------------------------------------- P2: the levels left out of the first build

const P2SCAT = (sc: NonNullable<VocalItem['scat']>, difficulty: number): Item => ({ kind: 'scat', seconds: 30, reference: 'before', scat: sc, difficulty });
const MICRO = (steps: number[], difficulty: number, at = 0.4): Item => ({ kind: 'micro', seconds: steps.length * 0.85 + 1, reference: 'before', at, steps, noteSecs: steps.map(() => 0.85), difficulty });

/** F2 L7: chromatic neighbours, then the quarter tones of the maqam (Rast, Bayati, Sikah) — each note on its own syllable. */
export const MICRO_LEVELS: VocalLevel[] = [lv(704, 0.55, [MICRO([0, 1, 0, -1, 0], 1250), MICRO([0, 2, 3.5, 5, 3.5, 2, 0], 1350), MICRO([0, 1.5, 3, 5, 3, 1.5, 0], 1400), MICRO([0, 1.5, 3.5, 1.5, 0], 1450)])];

/** F9 L8–L9: reading over the band (the melody is never played), then jazz lead sheets with chord symbols. */
export const READ_LEVELS: VocalLevel[] = [
  lv(1903, 0.55, [SONG('read-first-light', { band: true, rhythm: true, need: 0.55, read: 'band' }, 1300), SONG('read-quiet-road', { band: true, rhythm: true, need: 0.55, read: 'band' }, 1300), SONG('read-grey-morning', { band: true, rhythm: true, need: 0.55, read: 'band' }, 1350), SONG('read-three-steps', { band: true, rhythm: true, need: 0.55, read: 'band' }, 1350)]),
  lv(1904, 0.55, [SONG('lead-night-walk', { band: true, rhythm: true, need: 0.55, read: 'lead' }, 1450), SONG('lead-corner-swing', { band: true, rhythm: true, need: 0.55, read: 'lead' }, 1500), SONG('lead-late-train', { band: true, rhythm: true, need: 0.55, read: 'lead' }, 1500)]),
];

/** F13 L8: my song — the singer's own recording, its melody taken from the audio on the device. */
export const MY_SONG_LEVELS: VocalLevel[] = [lv(1308, 0.7, [{ kind: 'song', seconds: 60, reference: 'before', song: { id: 'mine', band: true, rhythm: true, need: 0.7, mine: true }, difficulty: 1300 }])];

/** F14 L6 colla voce, L9 a full AABA (the last A interpreted), L10 a blues in call and response with falls. */
export const STANDARD_MORE_LEVELS: VocalLevel[] = [
  // P3: the first phrase colla voce (the band's groove stretched to the singer), then a count-in and back on the bar.
  lv(1408, 0.7, [{ ...SONG('slow-harbor', { band: true, rhythm: true, need: 0.7, freeUntil: 1 }, 1500), seconds: 40 }, { ...SONG('corner-light', { band: true, rhythm: true, need: 0.7, freeUntil: 1 }, 1550), seconds: 30 }]),
  // P3: the rubato verse (colla voce) → a count-in → the AABA chorus in time; then the last A interpreted.
  lv(1409, 0.72, [{ ...SONG('lantern-street-verse', { band: true, rhythm: true, need: 0.72, freeUntil: 2 }, 1600), seconds: 85 }, SONG('lantern-street', { band: true, rhythm: true, need: 0.72, interpretFrom: 3 }, 1650)]),
  lv(1410, 0.7, [SONG('call-and-answer', { band: true, rhythm: true, need: 0.7, falls: true }, 1600), SONG('call-and-answer', { band: true, rhythm: true, need: 0.7, falls: true, bpm: 120 }, 1650)]),
];

/** F15 L2 motif, L3 embellishing a head, L7 bebop syllable accents, L10 trading twos and fours. */
export const SCAT_P2_LEVELS: VocalLevel[] = [
  lv(1507, 0.56, [
    P2SCAT({ mode: 'motif', chart: 'Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7', style: 'swing', bpm: 100, cell: [[0, 0, 1], [1, 2, 1], [2, 4, 2]] }, 1300),
    P2SCAT({ mode: 'motif', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7', style: 'swing', bpm: 112, cell: [[0.5, 7, 0.5], [1, 9, 1], [2, 4, 2]] }, 1350),
  ]),
  lv(1508, 0.6, [SONG('saints-jazz', { phrases: [0, 1], band: true, rhythm: false, need: 0.55, embellish: true }, 1400), SONG('blue-window', { band: true, rhythm: false, need: 0.55, embellish: true }, 1450)]),
  lv(1509, 0.65, [SONG('bop-line', { band: true, rhythm: true, need: 0.65, tol: 45, bop: true }, 1550), SONG('bop-line-2', { band: true, rhythm: true, need: 0.65, tol: 45, bop: true }, 1600)]),
  lv(1510, 0.56, [P2SCAT({ mode: 'trade', chart: BLUES, style: 'swing', bpm: 140, turn: 2 }, 1600), P2SCAT({ mode: 'trade', chart: BLUES, style: 'swing', bpm: 160, turn: 4, loops: 2 }, 1700)]),
];

// ---------------------------------------------------------------- P3: the ear and first-song topics as sung levels

/** An echo: the app plays the line (its own rhythm), the singer sings it back. */
const ECHO = (steps: number[], beats: number[], bpm: number, difficulty: number, at = 0.35, song?: string): Item => ({
  kind: 'melody',
  seconds: Math.round((beats.reduce((a, b) => a + b, 0) * 60) / bpm + 3),
  reference: 'before',
  at,
  steps,
  noteSecs: beats.map((b) => (b * 60) / bpm),
  ear: { mode: 'echo', ...(song ? { song } : {}) },
  difficulty,
});
/** An interval from a given note: only the first note is played; the singer sings it, then the named interval. */
const IVL = (semis: number, at: number, difficulty: number): Item => ({ kind: 'leap', seconds: 5, reference: 'before', at, steps: [0, semis], ear: { mode: 'interval' }, difficulty });
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const deg = (i: number) => 12 * Math.floor(i / 7) + MAJOR[((i % 7) + 7) % 7];
/** Audiation: a motif moves by step bar by bar; two bars are played, the third (never played) is sung. */
const AUD = (motif: number[], start: number, dir: 1 | -1, bpm: number, difficulty: number): Item => {
  const bar = (j: number) => motif.map((x) => deg(start + j * dir + x));
  const sec = 60 / bpm;
  const lead = [...bar(0), ...bar(1)];
  return { kind: 'melody', seconds: Math.round(motif.length * sec + 3), reference: 'before', at: 0.4, steps: bar(2), noteSecs: motif.map(() => sec), ear: { mode: 'audiate', lead, leadSecs: lead.map(() => sec) }, difficulty };
};
/** F13 L1: the first phrase of a level-1 songbook song (public domain), repeated notes joined into one (the echo is pitch-graded). */
function songEcho(id: string, difficulty: number): Item {
  const s = SONGBOOK.find((x) => x.id === id)!;
  const end = s.phrases[0] ?? s.melody.split('|').length;
  const steps: number[] = [];
  const beats: number[] = [];
  let rest = true;
  for (const n of songNotes(s)) {
    if (n.bar >= end) break;
    if (n.semi === null) {
      rest = true;
      continue;
    }
    if (!rest && steps.length && steps[steps.length - 1] === n.semi) beats[beats.length - 1] += n.beats;
    else {
      steps.push(n.semi);
      beats.push(n.beats);
    }
    rest = false;
  }
  return ECHO(steps, beats, 96, difficulty, 0.3, id);
}

export const EAR_P3_LEVELS: VocalLevel[] = [
  // F10 L1: echo short melodies, two bars with their rhythm, growing
  lv(1203, 0.6, [ECHO([0, 2, 4, 2, 0], [1, 1, 1, 1, 2], 100, 1000), ECHO([0, 4, 7, 4, 5, 2, 0], [1, 1, 1, 0.5, 0.5, 1, 2], 100, 1050), ECHO([0, -1, 0, 2, 4, 2, 4, 7], [0.5, 0.5, 1, 1, 0.5, 0.5, 1, 2], 96, 1100), ECHO([7, 5, 4, 2, 4, 0, -3, 0], [1, 0.5, 0.5, 1, 1, 1, 1, 2], 96, 1150)]),
  // F10 L3: intervals up and down from a given note (sing-intervals L1–4)
  lv(1204, 0.6, [IVL(4, 0.3, 1000), IVL(7, 0.25, 1050), IVL(-3, 0.6, 1100), IVL(-5, 0.65, 1150), IVL(9, 0.2, 1200), IVL(-8, 0.7, 1250)]),
  // F10 L5: audiation — hear two bars of a sequence, sing the third that is not played
  lv(1205, 0.6, [AUD([0, 1, 2, 0], 0, 1, 88, 1350), AUD([0, 2, 1], 0, 1, 88, 1400), AUD([2, 1, 0], 4, -1, 88, 1400), AUD([0, 2, 4, 2], 4, -1, 84, 1450)]),
];
/** F13 L1: echo one phrase of a level-1 public-domain song. */
export const SONG_ECHO_LEVELS: VocalLevel[] = [lv(1309, 0.6, [songEcho('jacques', 950), songEcho('mary', 1000), songEcho('yonatan', 1000), songEcho('london', 1050)])];

/** Every new level of the families. */
export const NEW_LEVELS: VocalLevel[] = [...EAR_P3_LEVELS, ...SONG_ECHO_LEVELS, ...MICRO_LEVELS, ...READ_LEVELS, ...MY_SONG_LEVELS, ...STANDARD_MORE_LEVELS, ...SCAT_P2_LEVELS, ...SIGHT_MORE_LEVELS, ...ARPEGGIO_LEVELS, ...SCAT_MORE_LEVELS, ...BREATH_LEVELS, ...PITCH_LEVELS, ...RANGE_LEVELS, ...DYN_LEVELS, ...VIB_LEVELS, ...TIME_LEVELS, ...EAR_LEVELS, ...SONG_LEVELS, ...STANDARD_LEVELS, ...SCAT_LEVELS, ...AGILITY_LEVELS, ...HARMONY_MORE_LEVELS, ...INFLECT_LEVELS];

// ---------------------------------------------------------------- the families

export interface VoiceFamily {
  id: string;
  title: Bi;
  /** Level numbers in teaching order (old ones re-homed, new ones). */
  refs: number[];
  /** The stage the family's first levels belong to (VOICE_CURRICULUM §8). */
  stage: 'A' | 'B' | 'C' | 'D';
  /** P3: levels put in front of the family after placement starts were saved — a saved start counts that many more. */
  before?: number;
}

const nums = (base: number, levels: VocalLevel[]) => levels.map((_, i) => base + i + 1);

/** The 15 families + Barry Harris, in teaching order (= path order: the first ones open first). */
export const VOICE_FAMILIES: VoiceFamily[] = [
  // The on-ramp first (owner: "every great jazz singer can sing a simple song perfectly — start here"), with the breath.
  // P2 levels sit where they teach (my song before the performance take); old levels keep opening by number.
  // P3: F13 L1 (echo one phrase of a simple song) opens the family.
  { id: 'v-songs', title: { en: 'Songs with the band', he: 'שירים עם להקה' }, refs: [1309, ...SONG_LEVELS.slice(0, -1).map((l) => l.level), 1308, ...SONG_LEVELS.slice(-1).map((l) => l.level)], stage: 'A', before: 1 },
  { id: 'v-breath', title: { en: 'Breath & sustain', he: 'נשימה והחזקה' }, refs: [1, ...BREATH_LEVELS.map((l) => l.level)], stage: 'A' },
  { id: 'v-pitch', title: { en: 'Pitch & intonation', he: 'גובה ואינטונציה' }, refs: [2, 7, ...PITCH_LEVELS.map((l) => l.level), 704], stage: 'A' },
  { id: 'v-range', title: { en: 'Range & registers', he: 'מנעד ורגיסטרים' }, refs: [4, 6, ...RANGE_LEVELS.map((l) => l.level)], stage: 'A' },
  { id: 'v-time', title: { en: 'Time feel', he: 'תחושת זמן' }, refs: [9, ...TIME_LEVELS.map((l) => l.level)], stage: 'A' },
  // P3: F10 L1 echo, L3 intervals and L5 audiation as sung levels, where the plan puts them (L2 = ladder 8).
  { id: 'v-ear', title: { en: "The singer's ear", he: 'האוזן של הזמר' }, refs: [1203, 8, 1204, 1201, 1205, 1202], stage: 'A', before: 1 },
  { id: 'v-dyn', title: { en: 'Dynamics', he: 'דינמיקה' }, refs: [901, 5, ...DYN_LEVELS.slice(1).map((l) => l.level)], stage: 'B' },
  { id: 'v-scale', title: { en: 'Scales & modes', he: 'סולמות ומודוסים בשירה' }, refs: [...nums(100, MODE_LEVELS), ...ARPEGGIO_LEVELS.map((l) => l.level)], stage: 'B' },
  { id: 'v-sight', title: { en: 'Sight-singing', he: 'שירה מתווים' }, refs: [...nums(400, SIGHT_LEVELS), ...SIGHT_MORE_LEVELS.map((l) => l.level), ...READ_LEVELS.map((l) => l.level)], stage: 'B' },
  { id: 'v-vib', title: { en: 'Vibrato control', he: 'שליטה בוויברטו' }, refs: [3, 10, 11, ...VIB_LEVELS.map((l) => l.level)], stage: 'B' },
  { id: 'v-agility', title: { en: 'Agility & bebop lines', he: 'גמישות וקווי ביבופ' }, refs: AGILITY_LEVELS.map((l) => l.level), stage: 'C' },
  { id: 'v-harmony', title: { en: 'Harmony singing', he: 'שירה בהרמוניה' }, refs: [...nums(200, HARMONY_LEVELS), ...HARMONY_MORE_LEVELS.map((l) => l.level)], stage: 'B' },
  { id: 'v-inflect', title: { en: 'Ornaments & inflections', he: 'קישוטים וגוונים' }, refs: [...nums(500, ORNAMENT_LEVELS), ...INFLECT_LEVELS.map((l) => l.level)], stage: 'C' },
  { id: 'v-standards', title: { en: 'Standards & ballads', he: 'סטנדרטים ובלדות' }, refs: [1401, 1402, 1403, 1404, 1405, 1408, 1406, 1407, 1409, 1410], stage: 'C' },
  { id: 'v-scat', title: { en: 'Scat & improvisation', he: 'סקאט ואלתור' }, refs: [1501, 1507, 1508, 1502, 1503, 1504, 1509, 1505, 1506, 1510], stage: 'C' },
  { id: 'v-barry', title: { en: 'Barry Harris lines', he: 'קווים של בארי האריס' }, refs: nums(300, BARRY_LEVELS), stage: 'D' },
];

/** The families' level order before P3 put new levels in (a level that was open then stays open). */
const FORMER_REFS: Record<string, number[]> = { 'v-songs': [1301, 1302, 1303, 1304, 1305, 1306, 1308, 1307], 'v-ear': [8, 1201, 1202] };

/**
 * Whether a level of a family is open: the family's first, or the one before it (in the family, or by the old
 * number) passed — or it was open in the family's order before new levels were put in front of it.
 */
export function voiceLevelUnlocked(f: Pick<VoiceFamily, 'id' | 'refs'>, n: number, passed: number[]): boolean {
  const i = f.refs.indexOf(n);
  if (i <= 0 || passed.includes(f.refs[i - 1]) || passed.includes(n - 1)) return true;
  const old = FORMER_REFS[f.id];
  const j = old ? old.indexOf(n) : -1;
  return j === 0 || (j > 0 && passed.includes(old![j - 1]));
}

/** A saved placement start (drillStart) in the family's current order: levels put in front since then count too. */
export const voiceStartNow = (familyId: string, start: number | undefined): number => (start === undefined || start <= 1 ? start ?? 1 : start + (VOICE_FAMILIES.find((f) => f.id === familyId)?.before ?? 0));

/** Every vocal level by its number: the old programs and the new families. */
const BY_REF = new Map<number, VocalLevel>();
LADDER.forEach((l, i) => BY_REF.set(i + 1, l));
MODE_LEVELS.forEach((l, i) => BY_REF.set(101 + i, l));
HARMONY_LEVELS.forEach((l, i) => BY_REF.set(201 + i, l));
BARRY_LEVELS.forEach((l, i) => BY_REF.set(301 + i, l));
SIGHT_LEVELS.forEach((l, i) => BY_REF.set(401 + i, l));
ORNAMENT_LEVELS.forEach((l, i) => BY_REF.set(501 + i, l));
for (const l of NEW_LEVELS) BY_REF.set(l.level, l);

export const vocalLevelByRef = (n: number): VocalLevel | undefined => BY_REF.get(n);
export const familyOfRef = (n: number): VoiceFamily | undefined => VOICE_FAMILIES.find((f) => f.refs.includes(n));
/** A new level (a family level built for the voice course), not one of the old programs. */
export const isNewLevel = (n: number) => n >= 600;

/** Level names of the new levels (he + en). */
export const NEW_LEVEL_NAMES: Record<number, Bi> = {
  601: { en: 'Ten seconds, steady to the end', he: 'עשר שניות, יציב עד הסוף' },
  602: { en: 'A phrase on one breath', he: 'משפט בנשימה אחת' },
  603: { en: 'A breath plan', he: 'תוכנית נשימה' },
  604: { en: 'A long ballad phrase', he: 'משפט בלדה ארוך' },
  605: { en: 'Twenty seconds, fading', he: 'עשרים שניות, בדעיכה' },
  801: { en: 'A siren across the break', he: 'סירנה דרך המעבר' },
  802: { en: 'Through the break, soft to loud', he: 'דרך המעבר, מחלש לחזק' },
  803: { en: 'The edge of the range', he: 'קצה המנעד' },
  804: { en: 'An octave and a fifth, one breath', he: 'אוקטבה וקווינטה, בנשימה אחת' },
  901: { en: 'Louder and softer', he: 'חזק יותר וחלש יותר' },
  902: { en: 'Soft, medium, loud', he: 'חלש, בינוני, חזק' },
  903: { en: 'Accents', he: 'הדגשות' },
  904: { en: 'The arc of a phrase', he: 'הקשת של המשפט' },
  1001: { en: 'Late, narrow vibrato', he: 'ויברטו מאוחר וצר' },
  1002: { en: 'Vibrato at the phrase ends', he: 'ויברטו בסופי משפטים' },
  1003: { en: 'A vibrato that opens', he: 'ויברטו שנפתח' },
  1004: { en: 'Straight tone in harmony', he: 'צליל ישר בהרמוניה' },
  1005: { en: 'One vibrato, five notes', he: 'ויברטו אחד, חמישה צלילים' },
  1201: { en: 'A named chord tone', he: 'צליל אקורד לפי שם' },
  1202: { en: 'Tensions on demand', he: 'מתחים לפי בקשה' },
  1701: { en: 'Backing vocals', he: 'קולות רקע' },
  1702: { en: 'A guide-tone line', he: 'קו של צלילים מנחים' },
  1703: { en: 'Close harmony, the middle part', he: 'הרמוניה צפופה, הקול האמצעי' },
  1801: { en: 'Scoops and falls', he: 'החלקות פנימה ונפילות' },
  1802: { en: 'Blue-note bends and ghost notes', he: 'כיפופי בלוז וצלילי רפאים' },
  1101: { en: 'On the click', he: 'על הקליק' },
  1102: { en: 'Rests & pickups', he: 'הפסקות וכניסות' },
  1103: { en: 'Anticipations', he: 'הקדמות' },
  1104: { en: 'Swing eighths', he: 'שמיניות בסווינג' },
  1105: { en: 'On top, then laid back', he: 'על הפעמה, ואז מאחוריה' },
  1106: { en: 'Back-phrasing', he: 'פרייזינג מאוחר' },
  1107: { en: 'The inner clock', he: 'השעון הפנימי' },
  1301: { en: 'One phrase with the band', he: 'משפט אחד עם הלהקה' },
  1302: { en: 'Two phrases, in time', he: 'שני משפטים, בזמן' },
  1303: { en: 'A whole song', he: 'שיר שלם' },
  1304: { en: 'Our songs: verse and chorus', he: 'השירים שלנו: בית ופזמון' },
  1305: { en: 'Unaccompanied, from memory', he: 'בלי ליווי, מהזיכרון' },
  1306: { en: 'Minor keys', he: 'סולמות מינוריים' },
  1307: { en: 'The performance take', he: 'טייק ההופעה' },
  701: { en: 'Fine tuning into a drone', he: 'כוונון עדין מול צליל מתמשך' },
  702: { en: 'Back to the tonic', he: 'חזרה לטוניקה' },
  703: { en: 'Eight bars unaccompanied', he: 'שמונה תיבות בלי ליווי' },
  705: { en: 'A minor song, no drift', he: 'שיר במינור, בלי זחילה' },
  1401: { en: 'A blues head', he: 'נושא בלוז' },
  1402: { en: 'A head as written', he: 'נושא כפי שנכתב' },
  1403: { en: 'Interpreting the head', he: 'לפרש את הנושא' },
  1404: { en: 'A laid-back chorus', he: 'כורוס מאחורי הפעמה' },
  1405: { en: 'A ballad', he: 'בלדה' },
  1406: { en: 'A bossa nova', he: 'בוסה נובה' },
  1407: { en: 'Rhythm changes at tempo', he: 'ריתם צ׳יינג׳ס בטמפו' },
  1501: { en: 'Call and response', he: 'קריאה ותשובה' },
  1502: { en: 'Guide tones', he: 'צלילים מנחים' },
  1503: { en: 'Landing on chord tones', he: 'נחיתה על צלילי אקורד' },
  1504: { en: 'Chromatic approach', he: 'גישה כרומטית' },
  1601: { en: 'A bebop line', he: 'קו ביבופ' },
  1505: { en: 'Tensions in the line', he: 'מתחים בקו' },
  1506: { en: 'Two styles: bossa and blues', he: 'שני סגנונות: בוסה ובלוז' },
  1901: { en: 'Reading in the bass clef', he: 'קריאה במפתח פה' },
  1902: { en: 'Chromatic notes', he: 'צלילים כרומטיים' },
  2001: { en: 'Arpeggios', he: 'ארפג׳יו' },
  1602: { en: 'Bebop at 160', he: 'ביבופ ב־160' },
  704: { en: 'Quarter tones', he: 'רבעי טונים' },
  1903: { en: 'Reading with the band', he: 'קריאה עם הלהקה' },
  1904: { en: 'A jazz lead sheet', he: 'דף אקורדים בג׳אז' },
  1308: { en: 'My song', he: 'השיר שלי' },
  1408: { en: 'Colla voce: the band follows you', he: 'קולה ווצ׳ה: הלהקה הולכת אחריכם' },
  1409: { en: 'A whole AABA chorus', he: 'כורוס שלם בשלושה חלקי A וגשר' },
  1410: { en: 'Blues call and response', he: 'בלוז בקריאה ותשובה' },
  1507: { en: 'Develop a motif', he: 'לפתח מוטיב' },
  1508: { en: 'Embellish the head', he: 'לקשט את הנושא' },
  1509: { en: 'Bebop accents', he: 'הדגשות ביבופ' },
  1510: { en: 'Trading twos and fours', he: 'חילופי שתיים וארבע' },
  1203: { en: 'Sing it back', he: 'לשיר בחזרה' },
  1204: { en: 'Intervals from a note', he: 'מרווחים מצליל נתון' },
  1205: { en: 'The bar not played', he: 'התיבה שלא נוגנה' },
  1309: { en: 'One phrase of a song', he: 'משפט אחד משיר' },
};

// ---------------------------------------------------------------- rating tags of the new families

type TagT = { skill: import('./lesson').SkillId; sub: string; w: number };
const T3 = (...xs: [import('./lesson').SkillId, string, number][]): TagT[] => xs.map(([skill, sub, w]) => ({ skill, sub: `${skill}/${sub}`, w }));

/** The skill and rating tags of a new family's item (feeds ratings, the skill map, leagues — "everything connects"). */
export function voiceItemTags(level: number, item: Pick<VocalItem, 'kind' | 'scat' | 'time'> & Partial<Pick<VocalItem, 'ear'>>): { skill: import('./lesson').SkillId; tags: TagT[] } {
  const fam = familyOfRef(level)?.id;
  // P3 ear items: intervals rate interval singing; echoes and audiation rate the inner ear (sequences).
  if (item.ear?.mode === 'interval') return { skill: 'singing', tags: T3(['singing', 'intervals', 0.7], ['intervals', 'melodic', 0.3]) };
  if (item.ear && fam === 'v-songs') return { skill: 'singing', tags: T3(['singing', 'songs', 0.5], ['singing', 'sequence', 0.3], ['sequences', 'inner', 0.2]) };
  if (item.ear) return { skill: 'singing', tags: T3(['singing', 'sequence', 0.6], ['sequences', 'inner', 0.4]) };
  switch (fam) {
    case 'v-time':
      return { skill: 'technique', tags: T3(['technique', 'control', 0.4], ['timing', 'precision', 0.4], ['rhythm-dictation', 'feel', 0.2]) };
    case 'v-songs':
      return { skill: 'singing', tags: T3(['singing', 'songs', 0.6], ['timing', 'precision', 0.2], ['technique', 'control', 0.2]) };
    case 'v-standards':
      return { skill: 'singing', tags: T3(['singing', 'songs', 0.5], ['rhythm-dictation', 'feel', 0.2], ['timing', 'precision', 0.15], ['expression', 'articulation', 0.15]) };
    case 'v-scat':
      if (item.scat?.mode === 'trade') return { skill: 'improv', tags: T3(['improv', 'answer', 0.5], ['improv', 'play', 0.3], ['timing', 'precision', 0.2]) };
      if (item.scat?.mode === 'motif') return { skill: 'improv', tags: T3(['improv', 'play', 0.7], ['improv', 'answer', 0.3]) };
      if (item.kind === 'time') return { skill: 'improv', tags: T3(['improv', 'answer', 0.6], ['timing', 'precision', 0.4]) };
      return { skill: 'improv', tags: T3(['improv', 'play', 0.6], ['singing', 'harmony', 0.25], ['chords', 'quality', 0.15]) };
    case 'v-pitch':
      return { skill: 'singing', tags: T3(['singing', 'sequence', 0.6], ['technique', 'control', 0.4]) };
    case 'v-agility':
      return { skill: 'agility', tags: T3(['agility', 'runs', 0.6], ['timing', 'precision', 0.4]) };
    case 'v-breath':
    case 'v-range':
      return { skill: 'technique', tags: T3(['technique', 'control', 1]) };
    case 'v-dyn':
      return { skill: 'technique', tags: T3(['technique', 'control', 0.6], ['expression', 'dynamics', 0.4]) };
    case 'v-vib':
      return { skill: 'technique', tags: T3(['technique', 'vibrato', 1]) };
    case 'v-inflect':
      return { skill: 'agility', tags: T3(['agility', 'ornaments', 0.7], ['expression', 'articulation', 0.3]) };
    case 'v-ear':
    case 'v-harmony':
      return { skill: 'singing', tags: T3(['singing', 'harmony', 1]) };
    case 'v-sight':
      return { skill: 'sight', tags: T3(['sight', 'sing', 0.6], ['singing', 'sequence', 0.4]) };
    default:
      return { skill: 'technique', tags: T3(['technique', 'control', 1]) };
  }
}

// ---------------------------------------------------------------- the placement probe (§8, about 2½ minutes)

export interface ProbeScores {
  hold: number;
  echo: number;
  time: number;
  song: number;
  /** Only sung when the earlier items passed. */
  guide?: number;
}
/**
 * Where each family starts after the probe: the levels before `start` are ✓ by test (they stay open to practise).
 * Cautious (the path's ✓ rule): one or two levels per family at most, from a clear pass (≥ 0.85); jazz-experienced
 * singers (the guide-tone line passed too) skip the first stage's opening levels.
 */
export function probeStarts(s: ProbeScores): Record<string, number> {
  const out: Record<string, number> = {};
  const ok = (x: number | undefined) => (x ?? 0) >= 0.85;
  const jazz = ok(s.guide) && ok(s.echo) && ok(s.time) && ok(s.song);
  if (ok(s.hold)) out['v-breath'] = jazz ? 3 : 2;
  if (ok(s.echo)) {
    out['v-pitch'] = jazz ? 4 : 3;
    out['v-ear'] = 2;
  }
  if (ok(s.time)) out['v-time'] = jazz ? 4 : 3;
  if (ok(s.song)) out['v-songs'] = jazz ? 4 : 2;
  if (jazz) {
    out['v-scat'] = 3;
    out['v-range'] = 2;
  }
  return out;
}
