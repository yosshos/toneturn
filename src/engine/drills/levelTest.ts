// The playing level test (docs/SPEC-LEVEL-TEST.md, owner 2026-11-13): sections ("strands") of real levels in rising
// difficulty, one take per step at the level's own tempo. A clean step jumps ahead, a miss brackets the level and the
// section ends — the test never insists on one item, and a mistake simply moves it on. Pure.

import type { DrillSettings, FamilyId } from './types';
type T2 = { en: string; he: string };
import { families } from './plan';

export type StrandId = 'touch' | 'hands' | 'chords' | 'comp' | 'reading' | 'ear' | 'lines' | 'rhythm' | 'lead' | 'jazz' | 'time' | 'walk' | 'grooves' | 'fills' | 'indep' | 'meter' | 'fills-bass' | 'pick' | 'slap' | 'odd' | 'bow' | 'mideast' | 'latin' | 'form' | 'fingerstyle' | 'flamenco';
export type Verdict = 'clean' | 'almost' | 'not';

/** One step of a section: a level of the catalogue, in a chosen key, and the start levels it proves when passed. */
export interface Rung {
  level: string;
  key: number;
  /** Start level per family when this step is clean (the level after the one beaten). */
  places: Partial<Record<FamilyId, number>>;
  /** Which of the level's items is played (index into its specs; default the first). */
  spec?: number;
}

export interface Strand {
  id: StrandId;
  title: T2;
  rungs: Rung[];
}

export const STRAND_TITLE: Record<StrandId, T2> = {
  hands: { en: 'Hands', he: 'ידיים' },
  touch: { en: 'Touch and dynamics', he: 'מגע ודינמיקה' },
  chords: { en: 'Chords', he: 'אקורדים' },
  comp: { en: 'Comping', he: 'ליווי' },
  reading: { en: 'Reading', he: 'קריאה' },
  ear: { en: 'Ear at the keys', he: 'אוזן על הקלידים' },
  lines: { en: 'Jazz lines', he: 'קווי ג׳אז' },
  rhythm: { en: 'Rhythm playing', he: 'נגינה קצבית' },
  lead: { en: 'Lead', he: 'סולו' },
  jazz: { en: 'Jazz comping', he: 'ליווי ג׳אז' },
  time: { en: 'Time and pocket', he: 'זמן וכיס' },
  walk: { en: 'Walking bass', he: 'ליווי הליכה' },
  grooves: { en: 'Grooves', he: 'גרוב' },
  fills: { en: 'Fills', he: 'מעברים' },
  indep: { en: 'Independence', he: 'עצמאות גפיים' },
  // Owner 2026-11-19: "the level test must check everything the course covers" — the sections below measure the
  // families no earlier section reached (rhythm & meter at the keys; bass fills, pick, slap, odd meters, bowing; the
  // drums' Middle-Eastern and Latin grooves, odd meters and song form).
  meter: { en: 'Rhythm and meter', he: 'קצב ומשקל' },
  'fills-bass': { en: 'Fills and solos', he: 'מעברים וסולו' },
  pick: { en: 'Pick', he: 'מפרט' },
  slap: { en: 'Slap', he: 'סלאפ' },
  odd: { en: 'Odd meters', he: 'משקלים אי-זוגיים' },
  bow: { en: 'Bowing', he: 'קשת' },
  mideast: { en: 'Middle-Eastern grooves', he: 'מקצבים מזרחיים' },
  latin: { en: 'Latin grooves', he: 'מקצבים לטיניים' },
  form: { en: 'Song form', he: 'מבנה שיר' },
  fingerstyle: { en: 'Fingerstyle', he: 'פריטת אצבעות' },
  flamenco: { en: 'Flamenco', he: 'פלמנקו' },
};
const EAR_T: T2 = { en: 'Ear', he: 'אוזן' };

const r = (level: string, key: number, places: Rung['places'], spec?: number): Rung => ({ level, key, places, ...(spec !== undefined ? { spec } : {}) });

// Keys move from step to step (owner: "it only tested me in C").
// Owner 2026-11-19 (the test checks everything the course covers): the first steps at the piano (k-first, ≤900) are
// placed by the steps that ask the same — a one-octave scale (five fingers, thumb under), one in D (black keys, hands
// together) — and up to the last one (11, the top a start can name) once any step harder than the whole family is clean.
const HANDS: Rung[] = [
  r('scales-1', 7, { 'k-first': 4, scales: 2, fingers: 1, arpeggios: 1, control: 1 }),
  // AUDIT-SCALES: the harmonization ladder (k-sharm) and hand independence (k-indep) are placed by the hands steps; the
  // 3-against-2 step is their own.
  r('scales-3', 2, { 'k-first': 7, scales: 4, fingers: 2, arpeggios: 2, control: 2, 'k-sharm': 2 }),
  r('arpeggios-3', 5, { 'k-first': 11, scales: 5, fingers: 3, arpeggios: 4, control: 3, 'k-sharm': 4, 'k-indep': 1 }),
  r('scales-5', 9, { 'k-first': 11, scales: 6, fingers: 5, arpeggios: 5, control: 5, advanced: 1, 'k-sharm': 6, 'k-indep': 2 }),
  r('k-indep-5', 3, { 'k-first': 11, scales: 6, fingers: 5, arpeggios: 5, control: 5, advanced: 1, 'k-sharm': 8, 'k-indep': 4 }),
  r('fingers-6', 10, { 'k-first': 11, scales: 8, fingers: 7, arpeggios: 7, control: 7, advanced: 3, 'k-sharm': 12, 'k-indep': 5 }),
  // AUDIT-7 #11: a graded piece (Bach's Prelude in C, G5) places the classical tier and the pedal's first steps.
  r('k-classic-6', 0, { 'k-first': 11, scales: 8, fingers: 7, arpeggios: 7, control: 7, advanced: 3, 'k-sharm': 12, 'k-indep': 5, 'k-classic': 6, 'k-pedal': 2 }),
];
// MEASUREMENT-AUDIT G8: touch is tested before it is placed (control used to be inferred from the hands steps): one
// level, a crescendo out and back, voicing, the pedal, dynamics in contrary motion, soft at speed. MIDI only — by
// microphone these steps are left out of the test (SectionLevelTest filters what a mic can't measure).
const TOUCH: Rung[] = [
  r('control-1', 0, { control: 2 }),
  r('control-3', 7, { control: 4 }),
  r('control-4', 5, { control: 5 }),
  r('control-6', 2, { control: 7 }),
  r('control-10', 9, { control: 11 }),
  r('control-14', 3, { control: 15 }),
  r('control-16', 10, { control: 16 }),
];
// MEASUREMENT-AUDIT (second round): the touch strand for a piano heard by the microphone — only what a phone hears
// reliably from the sound's energy (micTouch.ts), one hand: staccato against legato, a crescendo up / diminuendo down,
// the reverse shape, and written p / f steps. Levels in between that need MIDI (portato, one absolute level, accents,
// voicing, balance, pedal) are skipped by these places and shown as inferred (finishPlaces).
const TOUCH_MIC: Rung[] = [
  r('control-1', 0, { control: 2 }, 1),
  r('control-4', 7, { control: 5 }, 0),
  r('control-13', 5, { control: 14 }, 0),
  r('control-15', 2, { control: 16 }, 2),
];
/** By microphone the touch strand proves the control levels up to this one without skipping an unmeasured level. */
export const MIC_TOUCH_PROVES = 2;
const CHORDS_JAZZ: Rung[] = [
  r('cadences-1', 7, { cadences: 2, voicings: 1 }),
  // Voice leading (k-vl, AUDIT-CONTENT-THEORY §ה.2) starts from what the chord steps prove.
  r('voicings-2', 5, { 'k-first': 11, cadences: 2, voicings: 3, 'k-vl': 2 }),
  r('voicings-3', 10, { 'k-first': 11, cadences: 3, voicings: 4, 'k-sixdim': 1, 'k-vl': 3 }),
  r('voicings-4', 3, { 'k-first': 11, cadences: 4, voicings: 5, 'k-sixdim': 2, 'k-reharm': 1, 'k-vl': 4 }),
  r('voicings-9', 2, { 'k-first': 11, cadences: 5, voicings: 10, 'k-sixdim': 4, 'k-reharm': 3, 'k-vl': 7, 'k-theory': 1, 'k-keys': 4, 'k-cadlib': 4 }),
  // HARMONY-REHARM: drop 2 under a held note (one note, many chords) places the common-tone and mediant ladders.
  r('k-ctone-3', 7, { 'k-first': 11, cadences: 5, voicings: 10, 'k-sixdim': 4, 'k-reharm': 3, 'k-vl': 7, 'k-theory': 1, 'k-keys': 4, 'k-ctone': 4, 'k-mediant': 2, 'k-cadlib': 4 }),
  // AUDIT-GAPS-2: key changes — one diminished, four keys, voice-led (the top step: it proves the voice leading too).
  r('k-keys-7', 9, { 'k-first': 11, cadences: 5, voicings: 10, 'k-sixdim': 5, 'k-reharm': 3, 'k-vl': 7, 'k-theory': 1, 'k-keys': 8, 'k-cadlib': 9 }),
  // AUDIT-DEPTH-3: a phrase of a head in drop 2 with the melody on top (proves harmonising and drop-2 comping of a head).
  r('k-harm-4', 4, { 'k-first': 11, cadences: 5, voicings: 10, 'k-sixdim': 5, 'k-reharm': 3, 'k-vl': 7, 'k-theory': 1, 'k-keys': 8, 'k-harm': 5, 'k-tune': 5, 'k-cadlib': 12 }),
];
const CHORDS_CLASSICAL: Rung[] = [
  r('cadences-1', 7, { cadences: 2 }),
  r('cadences-2', 2, { cadences: 3, 'k-vl': 2 }),
  r('cadences-4', 5, { 'k-first': 11, cadences: 5, 'k-vl': 3 }),
  r('cadences-5', 9, { 'k-first': 11, cadences: 6, 'k-vl': 4 }),
];
// Solo jazz piano (Siskind, soloPianoDrills.ts): the left-hand ladder, the textures, the comping vocabulary and the
// improvisation habits are placed by the comping steps; shell stride (k-lh 8) and RH notes under the melody (k-tex 6)
// are steps of their own.
const COMP_JAZZ: Rung[] = [
  r('accomp-1', 0, { accomp: 2, 'k-lh': 1 }),
  r('voicings-6', 5, { 'k-first': 11, accomp: 3, voicings: 7, 'k-lh': 5, 'k-impro': 2 }),
  r('k-lh-8', 7, { 'k-first': 11, accomp: 3, voicings: 7, 'k-lh': 8, 'k-tex': 2, 'k-impro': 2 }),
  // HARMONY-REHARM: organ comping — the walking LH under a held pad.
  r('k-organ-1', 3, { 'k-first': 11, accomp: 3, voicings: 7, 'k-organ': 2, 'k-lh': 8, 'k-tex': 2, 'k-impro': 2 }),
  r('voicings-11', 10, { 'k-first': 11, accomp: 4, voicings: 12, 'k-lh': 9, 'k-tex': 4, 'k-comp': 2, 'k-impro': 5 }),
  r('accomp-3', 7, { 'k-first': 11, accomp: 5, 'k-lh': 8, 'k-tex': 2 }),
  r('k-tex-6', 3, { 'k-first': 11, accomp: 5, voicings: 12, 'k-lh': 12, 'k-tex': 6, 'k-comp': 3, 'k-impro': 5 }),
  // AUDIT-7 #10: pop accompaniment (the ballad) is a comping step of the jazz / both test too.
  r('k-pop-3', 7, { 'k-first': 11, accomp: 5, voicings: 12, 'k-lh': 12, 'k-tex': 6, 'k-comp': 3, 'k-impro': 5, 'k-pop': 4, 'k-pedal': 1 }),
  r('voicings-14', 7, { 'k-first': 11, accomp: 9, voicings: 15, 'k-lh': 14, 'k-tex': 8, 'k-comp': 5, 'k-impro': 5 }),
];
const COMP_CLASSICAL: Rung[] = [
  r('accomp-1', 0, { accomp: 2, control: 4 }),
  r('control-7', 7, { 'k-first': 11, accomp: 3, control: 8 }),
  r('accomp-3', 5, { 'k-first': 11, accomp: 5, control: 9 }),
  // AUDIT-7 #10: pop accompaniment from a lead sheet (broken patterns, then rock) and the pedal levels.
  r('k-pop-2', 7, { 'k-first': 11, accomp: 5, control: 9, 'k-pop': 3, 'k-pedal': 1 }),
  r('k-pop-4', 5, { 'k-first': 11, accomp: 7, control: 10, 'k-pop': 5, 'k-pedal': 2 }),
];
// Sight-reading below the playing level is normal (placement auditions read about two grades lower); the takes feed the
// reading skill, and a clean read opens the reading levels of Control.
// AUDIT-6 Stage B: graded sight-reading (k-read, ~800–1400) is the reading section — five fingers, position shifts,
// both hands over a moving bass, sharps and flats, left-hand chords, the quick study.
const READING: Rung[] = [
  r('k-read-1', 0, { 'k-read': 2 }),
  r('k-read-3', 7, { 'k-first': 11, 'k-read': 4 }),
  r('k-read-5', 5, { 'k-first': 11, 'k-read': 6 }),
  r('k-read-6', 2, { 'k-first': 11, 'k-read': 7 }),
  r('k-read-8', 10, { 'k-first': 11, 'k-read': 9 }),
  r('k-read-10', 7, { 'k-first': 11, 'k-read': 11 }),
  // AUDIT-7 #4: grade 8 reading (ornaments) and the lead sheet with hits.
  r('k-read-12', 7, { 'k-first': 11, 'k-read': 13 }),
  r('k-read-14', 5, { 'k-first': 11, 'k-read': 15 }),
];
const EAR: Rung[] = [
  r('k-ear-1', 0, { 'k-ear': 2 }),
  r('k-ear-2', 7, { 'k-ear': 3 }),
  r('k-ear-4', 5, { 'k-ear': 5 }),
  r('k-ear-5', 0, { 'k-ear': 6 }),
  r('k-ear-6', 7, { 'k-ear': 7 }),
  // Phrases by ear: approach notes (~1300) and the ii–V–I line (~1600) are steps of their own.
  r('k-phrase-2', 3, { 'k-ear': 7, 'k-phrase': 3 }),
  r('k-phrase-5', 8, { 'k-ear': 9, 'k-phrase': 6 }),
];
// AUDIT-GAPS-2: bebop vocabulary (k-vocab) is placed by the lines steps, and its enclosures are a step of their own.
const LINES: Rung[] = [
  r('harris-1', 0, { 'k-first': 11, harris: 2, jazz: 1, 'k-vocab': 2, 'k-harrisline': 3 }),
  r('harris-7', 5, { 'k-first': 11, harris: 8, jazz: 2, 'k-vocab': 4, 'k-harrisline': 6 }),
  r('k-vocab-5', 8, { 'k-first': 11, harris: 8, jazz: 2, 'k-vocab': 6, 'k-harrisline': 10 }),
  // Barry Harris lines (Part D): the 5-4-3-2 phrases on the dominant (~1420) are a step of their own.
  r('k-harrisline-17', 3, { 'k-first': 11, harris: 8, jazz: 2, 'k-vocab': 6, 'k-harrisline': 18 }),
  r('k-bebop-1', 10, { 'k-first': 11, harris: 10, jazz: 4, 'k-bebop': 2, 'k-vocab': 6, 'k-harrisline': 18 }),
  r('k-bebop-4', 0, { 'k-first': 11, harris: 12, jazz: 6, 'k-bebop': 5, 'k-theory': 2, 'k-vocab': 8, 'k-harrisline': 22 }),
  // AUDIT-DEPTH-3: a brother for the V (jazz in context), then improvising with enclosures under the rule cards.
  r('k-ctx-2', 5, { 'k-first': 11, harris: 14, jazz: 6, 'k-bebop': 5, 'k-theory': 2, 'k-vocab': 8, 'k-ctx': 3, 'k-harrisline': 22 }),
  r('k-solo-4', 10, { 'k-first': 11, harris: 15, jazz: 7, 'k-bebop': 6, 'k-theory': 3, 'k-vocab': 9, 'k-ctx': 4, 'k-solo': 5, 'k-harrisline': 22, 'k-gig': 1 }),
  // Triad pairs, deep: the hexatonic scale over two and three octaves (~1540) places the triad-pair family.
  r('k-tpair-6', 3, { 'k-first': 11, harris: 15, jazz: 7, 'k-bebop': 6, 'k-theory': 3, 'k-vocab': 9, 'k-ctx': 4, 'k-solo': 5, 'k-harrisline': 22, 'k-gig': 1, 'k-tpair': 7 }),
];

// Owner 2026-11-19: rhythm & meter (k-rhythm) is a course family of every emphasis that no other step measured —
// subdivisions between the hands, odd meters (5/4, 7/8), then 5:4 / 5:3 / 7:4 cross-rhythms; each step both hands.
const METER: Rung[] = [
  r('k-rhythm-1', 0, { 'k-first': 11, 'k-rhythm': 2 }),
  r('k-rhythm-4', 2, { 'k-first': 11, 'k-rhythm': 5 }),
  r('k-rhythm-6', 5, { 'k-first': 11, 'k-rhythm': 7 }),
];

/** The piano test by emphasis: hands, chords, comping, reading, ear, rhythm & meter (all), and jazz lines (jazz / both). */
export function pianoStrands(emphasis: DrillSettings['emphasis'], o: { mic?: boolean } = {}): Strand[] {
  const jazz = emphasis !== 'classical';
  const out: Strand[] = [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: HANDS },
    { id: 'touch', title: STRAND_TITLE.touch, rungs: o.mic ? TOUCH_MIC : TOUCH },
    { id: 'chords', title: STRAND_TITLE.chords, rungs: jazz ? CHORDS_JAZZ : CHORDS_CLASSICAL },
    { id: 'comp', title: STRAND_TITLE.comp, rungs: jazz ? COMP_JAZZ : COMP_CLASSICAL },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: READING },
    // Progressions by ear (k-ear 10+): the jazz ear's top step — a ii–V–I played back as shells.
    { id: 'ear', title: STRAND_TITLE.ear, rungs: jazz ? [...EAR, r('k-ear-10', 2, { 'k-ear': 11 })] : EAR },
    { id: 'meter', title: STRAND_TITLE.meter, rungs: METER },
  ];
  if (jazz) out.push({ id: 'lines', title: STRAND_TITLE.lines, rungs: LINES });
  return out;
}

// ------------------------------------------------------------------ guitar (0.81)
const G_HANDS: Rung[] = [
  r('g-fretting-1', 9, { 'g-fretting': 2, 'g-picking': 1, 'g-scales': 1 }),
  r('g-scales-1', 9, { 'g-fretting': 2, 'g-picking': 2, 'g-scales': 2, 'g-arps': 1, 'g-legato': 1 }),
  r('g-picking-3', 7, { 'g-fretting': 4, 'g-picking': 4, 'g-scales': 4, 'g-arps': 2, 'g-legato': 2 }),
  r('g-scales-5', 2, { 'g-fretting': 5, 'g-picking': 5, 'g-scales': 6, 'g-arps': 4, 'g-legato': 3, 'g-harm': 2 }),
  // 0.97 leftovers: the modes in position at grade 7 (g-scales 15; 13–14 at grades 5–6 sit below it), as hard as
  // g-scales 6 — so it proves g-scales 1–6 and, by difficulty, 8, 9, 12–15 (testedLevelIds).
  r('g-scales-15', 7, { 'g-fretting': 5, 'g-picking': 6, 'g-scales': 7, 'g-arps': 5, 'g-legato': 4, 'g-harm': 3 }),
  r('g-picking-6', 9, { 'g-fretting': 6, 'g-picking': 7, 'g-scales': 8, 'g-arps': 6, 'g-legato': 5, 'g-harm': 5 }),
  // STAGE C (AUDIT-6 GA-4): 3nps in 16ths at speed places the speed and fusion families above grade 8.
  r('g-speed-1', 7, { 'g-fretting': 6, 'g-picking': 9, 'g-scales': 10, 'g-arps': 7, 'g-legato': 7, 'g-harm': 8, 'g-speed': 2, 'g-fusion': 1 }),
];
const G_CHORDS: Rung[] = [
  // AUDIT-6 Stage B: the first chord change (g-first 5) before the open-chord check.
  r('g-first-5', 0, { 'g-first': 6 }),
  r('g-chords-1', 7, { 'g-chords': 2 }),
  r('g-chords-3', 7, { 'g-chords': 4 }),
  r('g-chords-5', 9, { 'g-chords': 6 }),
  r('g-chords-6', 2, { 'g-chords': 7 }),
  // Owner 2026-11-19: voice leading on the neck (g-vl) is measured here — triads on string sets, then drop 2 by step.
  r('g-vl-1', 7, { 'g-chords': 7, 'g-vl': 2 }),
  r('g-vl-2', 5, { 'g-chords': 7, 'g-vl': 3 }),
];
// Meter & cross-rhythm (g-meter, AUDIT-CONTENT-THEORY R-4) sits in the rhythm section by grade: its odd-meter riffs
// (grade 3) are a step of their own, and the strumming steps around it place it too.
const G_RHYTHM: Rung[] = [
  r('g-rhythm-1', 7, { 'g-rhythm': 2 }),
  r('g-rhythm-2', 0, { 'g-rhythm': 3, 'g-meter': 2 }),
  // AUDIT-6 Stage B: riffs by grade (g-riff) sit in the rhythm section — the grade 2 and grade 4 riffs are steps.
  r('g-riff-2', 9, { 'g-rhythm': 3, 'g-meter': 2, 'g-riff': 3 }),
  r('g-rhythm-3', 9, { 'g-rhythm': 4, 'g-meter': 3, 'g-riff': 3 }),
  r('g-meter-3', 4, { 'g-rhythm': 4, 'g-meter': 4, 'g-riff': 4 }),
  r('g-riff-4', 2, { 'g-rhythm': 4, 'g-meter': 4, 'g-riff': 5 }),
  r('g-rhythm-5', 4, { 'g-rhythm': 6, 'g-meter': 4 }),
  r('g-rhythm-6', 0, { 'g-rhythm': 7, 'g-meter': 5 }),
  // Owner 2026-11-19: the prog add-on's odd-meter riffs (g-prog, shown only with the add-on) top the rhythm section.
  r('g-prog-1', 4, { 'g-rhythm': 7, 'g-meter': 5, 'g-riff': 5, 'g-prog': 2 }),
  r('g-prog-2', 9, { 'g-rhythm': 7, 'g-meter': 5, 'g-riff': 5, 'g-prog': 3 }),
];
const G_LEAD: Rung[] = [
  r('g-lead-1', 9, { 'g-lead': 2, 'g-impro': 1 }),
  r('g-lead-3', 4, { 'g-lead': 4, 'g-impro': 1 }),
  r('g-lead-5', 2, { 'g-lead': 6, 'g-impro': 2 }),
  r('g-lead-8', 7, { 'g-lead': 9, 'g-impro': 3 }),
];
const G_READING: Rung[] = [
  // AUDIT-6 Stage B: TAB and rhythm reading (g-first 7–8) before reading notation in position.
  r('g-first-7', 0, { 'g-first': 8 }),
  r('g-reading-1', 0, { 'g-reading': 2 }),
  r('g-reading-2', 7, { 'g-reading': 3 }),
  r('g-reading-4', 2, { 'g-reading': 5 }),
  r('g-reading-6', 7, { 'g-reading': 7 }),
];
const G_EAR: Rung[] = [
  r('g-ear-2', 9, { 'g-ear': 3 }),
  r('g-ear-3', 4, { 'g-ear': 4 }),
  r('g-ear-5', 7, { 'g-ear': 6 }),
  r('g-ear-6', 2, { 'g-ear': 7 }),
  r('g-ear-8', 0, { 'g-ear': 9 }),
  // Phrases by ear on the neck (jazz add-on levels open only when shown).
  r('g-phrase-2', 3, { 'g-ear': 9, 'g-phrase': 3 }),
  r('g-phrase-5', 8, { 'g-ear': 10, 'g-phrase': 6 }),
];
const G_JAZZ: Rung[] = [
  // AUDIT-7 #2: the jazz entry over the blues opens the section; shells on ii–V–I prove it all.
  r('g-jblues-2', 7, { 'g-jblues': 3 }),
  r('g-jazz-1', 0, { 'g-jazz': 2, 'g-harris': 1, 'g-jblues': 5 }),
  r('g-jazz-2', 5, { 'g-jazz': 3, 'g-harris': 2, 'g-bebop': 2 }),
  r('g-jazz-4', 10, { 'g-jazz': 5, 'g-harris': 3, 'g-bebop': 3 }),
  r('g-jazz-8', 3, { 'g-jazz': 9, 'g-harris': 5, 'g-theory': 1, 'g-keys': 2, 'g-bebop': 5, 'g-cadlib': 1 }),
  // HARMONY-REHARM: drop 2 under a held note on the neck places the common-tone and colour-harmony families.
  r('g-ctone-2', 4, { 'g-jazz': 9, 'g-harris': 5, 'g-theory': 1, 'g-keys': 2, 'g-bebop': 5, 'g-ctone': 3, 'g-color': 5, 'g-cadlib': 1 }),
  // AUDIT-GAPS-2: bebop lines on the neck (grade 7).
  r('g-bebop-7', 2, { 'g-jazz': 9, 'g-harris': 6, 'g-theory': 2, 'g-keys': 4, 'g-bebop': 8, 'g-harrisline': 5, 'g-cadlib': 3 }),
  // AUDIT-GAPS-2: key changes in drop 2 (one diminished, four keys).
  r('g-keys-7', 2, { 'g-jazz': 9, 'g-harris': 6, 'g-theory': 2, 'g-keys': 8, 'g-bebop': 8, 'g-cadlib': 4 }),
  // AUDIT-DEPTH-3: chord-melody, drop 2 under a head's melody.
  r('g-cmel-4', 7, { 'g-jazz': 9, 'g-harris': 6, 'g-theory': 2, 'g-keys': 8, 'g-bebop': 8, 'g-cmel': 5, 'g-tune': 5, 'g-cadlib': 6 }),
  // AUDIT-DEPTH-3: a brother for the V on the neck, then improvising by the rules.
  r('g-ctx-1', 7, { 'g-jazz': 9, 'g-harris': 6, 'g-theory': 2, 'g-keys': 8, 'g-bebop': 8, 'g-cmel': 5, 'g-tune': 5, 'g-ctx': 2, 'g-cadlib': 6 }),
  r('g-solo-3', 0, { 'g-jazz': 10, 'g-harris': 7, 'g-theory': 3, 'g-keys': 9, 'g-bebop': 9, 'g-cmel': 6, 'g-tune': 6, 'g-ctx': 3, 'g-solo': 4, 'g-gig': 1, 'g-cadlib': 7 }),
  // Triad pairs, deep: the hexatonic scale in position (grade 8) places the triad pairs on the neck.
  r('g-tpair-4', 5, { 'g-jazz': 10, 'g-harris': 7, 'g-theory': 3, 'g-keys': 9, 'g-bebop': 9, 'g-cmel': 6, 'g-tune': 6, 'g-ctx': 3, 'g-solo': 4, 'g-gig': 1, 'g-tpair': 5, 'g-cadlib': 7 }),
  // STAGE C: Harris lines at bebop tempo places the diploma jazz families (lines at tempo, solo guitar, arranging).
  r('g-hlfast-1', 0, { 'g-jazz': 12, 'g-harris': 10, 'g-theory': 5, 'g-keys': 12, 'g-bebop': 12, 'g-cmel': 6, 'g-tune': 8, 'g-ctx': 8, 'g-solo': 8, 'g-harrisline': 9, 'g-hlfast': 2, 'g-solojazz': 2, 'g-cmarr': 1, 'g-tpair': 5, 'g-cadlib': 10 }),
];

// Owner 2026-11-19: the fingerstyle and flamenco add-ons (shown only when ticked) get a short section each — the
// right hand's own technique, which no pick or strumming step measures.
const G_FINGER: Rung[] = [
  r('g-fingerstyle-1', 0, { 'g-fingerstyle': 2 }),
  r('g-fingerstyle-4', 7, { 'g-fingerstyle': 5 }),
];
const G_FLAMENCO: Rung[] = [
  r('g-flamenco-1', 4, { 'g-flamenco': 2 }),
  r('g-flamenco-3', 9, { 'g-flamenco': 4 }),
];

/**
 * The guitar test: chords, rhythm, hands, lead, reading, ear; jazz comping only with the jazz add-on (shown levels);
 * fingerstyle and flamenco with their add-ons.
 * AUDIT-CONTENT-THEORY §ב.3: in the course path's order — the first chord and strumming before the picking hand.
 */
export function guitarStrands(): Strand[] {
  return [
    { id: 'chords', title: STRAND_TITLE.chords, rungs: G_CHORDS },
    { id: 'rhythm', title: STRAND_TITLE.rhythm, rungs: G_RHYTHM },
    { id: 'hands', title: STRAND_TITLE.hands, rungs: G_HANDS },
    { id: 'lead', title: STRAND_TITLE.lead, rungs: G_LEAD },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: G_READING },
    { id: 'ear', title: EAR_T, rungs: G_EAR },
    { id: 'jazz', title: STRAND_TITLE.jazz, rungs: G_JAZZ },
    { id: 'fingerstyle', title: STRAND_TITLE.fingerstyle, rungs: G_FINGER },
    { id: 'flamenco', title: STRAND_TITLE.flamenco, rungs: G_FLAMENCO },
  ];
}

// ------------------------------------------------------------------ bass (0.81)
const B_HANDS: Rung[] = [
  // AUDIT-6 Stage B: i–m alternation (b-first 3) before the plucking hand's rest strokes.
  r('b-first-3', 0, { 'b-first': 4 }),
  r('b-pluck-1', 4, { 'b-pluck': 2, 'b-fret': 1, 'b-scale': 1, 'b-length': 1 }),
  r('b-fret-1', 4, { 'b-pluck': 2, 'b-fret': 2, 'b-scale': 1, 'b-length': 1, 'b-up-pos': 3 }),
  r('b-pluck-3', 9, { 'b-pluck': 4, 'b-fret': 3, 'b-scale': 2, 'b-length': 2, 'b-up-pos': 3 }),
  r('b-fret-5', 7, { 'b-pluck': 5, 'b-fret': 6, 'b-scale': 4, 'b-length': 3, 'b-up-pos': 6, 'b-up-scales': 2 }),
  r('b-pluck-5', 2, { 'b-pluck': 7, 'b-fret': 7, 'b-scale': 6, 'b-length': 4, 'b-up-pos': 6, 'b-up-scales': 2 }),
  // Owner 2026-11-19: the fretting hand's slides and legato lines (b-legato), then natural harmonics — the first of the
  // extended techniques (b-ext) — top the hands section.
  r('b-legato-3', 7, { 'b-pluck': 7, 'b-fret': 7, 'b-scale': 6, 'b-length': 4, 'b-up-pos': 6, 'b-up-scales': 2, 'b-legato': 4 }),
  r('b-ext-1', 4, { 'b-pluck': 7, 'b-fret': 7, 'b-scale': 6, 'b-length': 4, 'b-up-pos': 6, 'b-up-scales': 2, 'b-legato': 4, 'b-ext': 2 }),
];
const B_TIME: Rung[] = [
  r('b-time-1', 4, { 'b-time': 2, 'b-pocket': 1 }),
  r('b-pocket-1', 9, { 'b-time': 3, 'b-pocket': 2, 'b-styles': 1 }),
  r('b-time-4', 7, { 'b-time': 5, 'b-pocket': 3, 'b-styles': 3 }),
  r('b-pocket-4', 4, { 'b-time': 6, 'b-pocket': 5, 'b-styles': 5, 'b-ghost': 2 }),
  r('b-time-7', 9, { 'b-time': 8, 'b-pocket': 7, 'b-styles': 7, 'b-ghost': 3 }),
  // AUDIT-7 #15: riffs by grade, then the half-time feel.
  r('b-riff-4', 4, { 'b-time': 8, 'b-pocket': 7, 'b-styles': 7, 'b-ghost': 3, 'b-riff': 5 }),
  r('b-feel-2', 9, { 'b-time': 8, 'b-pocket': 7, 'b-styles': 7, 'b-ghost': 3, 'b-riff': 5, 'b-feel': 3 }),
  // Owner 2026-11-19: the tumbao against the clave (b-latin, jazz track) tops the time section.
  r('b-latin-1', 9, { 'b-time': 8, 'b-pocket': 7, 'b-styles': 7, 'b-ghost': 3, 'b-riff': 5, 'b-feel': 3, 'b-latin': 2 }),
];
const B_CHORDS: Rung[] = [
  // AUDIT-6 Stage B: roots on the E and A strings (b-first 5).
  r('b-first-5', 9, { 'b-first': 6 }),
  r('b-chord-1', 4, { 'b-chord': 2 }),
  r('b-chord-3', 9, { 'b-chord': 4, 'b-scale': 2 }),
  r('b-chord-6', 7, { 'b-chord': 7, 'b-scale': 3 }),
  r('b-chord-8', 2, { 'b-chord': 9, 'b-scale': 5 }),
  r('b-chord-11', 5, { 'b-chord': 12, 'b-scale': 7 }),
];
const B_WALK: Rung[] = [
  r('b-walk-1', 5, { 'b-walk': 2, 'b-swing': 1, 'b-up-walk': 2, 'b-up-pizz': 2 }),
  r('b-walk-3', 10, { 'b-walk': 4, 'b-swing': 2, 'b-up-walk': 4, 'b-up-pizz': 4 }),
  r('b-walk-5', 3, { 'b-walk': 6, 'b-swing': 2, 'b-barry': 1, 'b-up-walk': 6, 'b-up-pizz': 4 }),
  r('b-walk-7', 7, { 'b-walk': 8, 'b-swing': 3, 'b-barry': 2, 'b-up-walk': 6, 'b-up-pizz': 4 }),
  // HARMONY-REHARM: the counter-line — the bass reharmonizes under a held note.
  r('b-counter-7', 3, { 'b-walk': 8, 'b-swing': 3, 'b-barry': 2, 'b-counter': 8, 'b-up-walk': 6, 'b-up-pizz': 4 }),
  r('b-walk-9', 0, { 'b-walk': 10, 'b-swing': 4, 'b-barry': 3, 'b-keys': 2, 'b-bebop': 2, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 1 }),
  // AUDIT-GAPS-2: bebop lines on the bass (rhythm changes, the bridge).
  r('b-bebop-6', 5, { 'b-walk': 10, 'b-swing': 4, 'b-barry': 4, 'b-keys': 4, 'b-bebop': 7, 'b-harrisline': 5, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 2 }),
  // AUDIT-GAPS-2: the line through a key change (one diminished, four keys).
  r('b-keys-7', 5, { 'b-walk': 10, 'b-swing': 4, 'b-barry': 4, 'b-keys': 8, 'b-bebop': 7, 'b-tune': 3, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 3 }),
  // AUDIT-DEPTH-3: walking through the brothers, then a solo that implies the roots.
  r('b-ctx-1', 7, { 'b-walk': 11, 'b-swing': 4, 'b-barry': 4, 'b-keys': 8, 'b-bebop': 7, 'b-tune': 3, 'b-ctx': 2, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 4 }),
  r('b-solo-1', 0, { 'b-walk': 12, 'b-swing': 5, 'b-barry': 5, 'b-keys': 9, 'b-bebop': 7, 'b-tune': 4, 'b-ctx': 3, 'b-solo': 2, 'b-gig': 1, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 5 }),
  // Triad pairs, deep: alternating inversions over two octaves places the triad pairs on the bass.
  r('b-tpair-2', 3, { 'b-walk': 12, 'b-swing': 5, 'b-barry': 5, 'b-keys': 9, 'b-bebop': 7, 'b-tune': 4, 'b-ctx': 3, 'b-solo': 2, 'b-gig': 1, 'b-tpair': 3, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-cadlib': 5 }),
  // Owner 2026-11-19: a standard's AABA form, two-feel to four on the bridge, places the form and standards ladders.
  r('b-jform-2', 0, { 'b-walk': 12, 'b-swing': 5, 'b-barry': 5, 'b-keys': 9, 'b-bebop': 7, 'b-tune': 4, 'b-ctx': 3, 'b-solo': 2, 'b-gig': 1, 'b-tpair': 3, 'b-up-walk': 6, 'b-up-pizz': 4, 'b-jform': 3, 'b-std': 2, 'b-cadlib': 6 }),
];
const B_READING: Rung[] = [
  // AUDIT-6 Stage B: bass TAB (b-first 7) before the bass clef.
  r('b-first-7', 0, { 'b-first': 8 }),
  r('b-read-2', 4, { 'b-read': 3, 'b-posread': 1 }),
  r('b-read-3', 0, { 'b-read': 4, 'b-posread': 1, 'b-up-read': 3 }),
  r('b-read-6', 7, { 'b-read': 7, 'b-posread': 2, 'b-up-read': 3 }),
  r('b-read-8', 9, { 'b-read': 9, 'b-posread': 3, 'b-up-read': 3 }),
];
const B_EAR: Rung[] = [
  r('b-ear-2', 4, { 'b-ear': 3 }),
  r('b-ear-3', 9, { 'b-ear': 4 }),
  r('b-ear-5', 7, { 'b-ear': 6 }),
  r('b-ear-6', 2, { 'b-ear': 7 }),
  r('b-ear-9', 5, { 'b-ear': 10 }),
  // Phrases by ear on the bass (jazz track).
  r('b-phrase-2', 3, { 'b-ear': 10, 'b-phrase': 3 }),
  r('b-phrase-5', 8, { 'b-ear': 12, 'b-phrase': 6 }),
];

// Owner 2026-11-19 ("the level test must check everything the course covers"): sections of their own for the bass
// families no step reached — fills and solos over changes (b-impro), the pick (and the prog track's pick riffs), slap,
// odd meters and polymeter (prog track), and bowing on the upright.
const B_FILLS: Rung[] = [
  r('b-impro-1', 7, { 'b-impro': 2 }),
  r('b-impro-4', 2, { 'b-impro': 5 }),
  r('b-impro-7', 5, { 'b-impro': 8 }),
  r('b-impro-10', 9, { 'b-impro': 11 }),
];
const B_PICK: Rung[] = [
  r('b-pick-1', 4, { 'b-pick': 2 }),
  r('b-pick-5', 9, { 'b-pick': 6 }),
  r('b-pick-8', 2, { 'b-pick': 9 }),
  r('b-prog-1', 7, { 'b-pick': 9, 'b-prog': 2 }),
];
const B_SLAP: Rung[] = [
  r('b-slap-1', 4, { 'b-slap': 2 }),
  r('b-slap-3', 9, { 'b-slap': 4 }),
  r('b-slap-6', 2, { 'b-slap': 7 }),
];
const B_ODD: Rung[] = [
  r('b-odd-1', 4, { 'b-odd': 2 }),
  r('b-odd-3', 9, { 'b-odd': 4 }),
  r('b-poly-1', 2, { 'b-odd': 4, 'b-poly': 2 }),
];
// The upright track (an upright / fretless bass only — strandsFor's `upright`): its positions, scales, pizzicato,
// walking and reading are placed by the hands, walking and reading steps played on it; the bow is its own section.
const B_BOW: Rung[] = [
  r('b-up-arco-1', 4, { 'b-up-arco': 2 }),
  r('b-up-arco-4', 7, { 'b-up-arco': 5 }),
  r('b-up-arco-7', 2, { 'b-up-arco': 8 }),
];

/** The bass test: hands, time and pocket, chord tones, walking, fills and solos, reading, ear, slap, pick, odd meters, bowing. */
export function bassStrands(): Strand[] {
  return [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: B_HANDS },
    { id: 'time', title: STRAND_TITLE.time, rungs: B_TIME },
    { id: 'chords', title: STRAND_TITLE.chords, rungs: B_CHORDS },
    { id: 'walk', title: STRAND_TITLE.walk, rungs: B_WALK },
    { id: 'fills-bass', title: STRAND_TITLE['fills-bass'], rungs: B_FILLS },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: B_READING },
    { id: 'ear', title: EAR_T, rungs: B_EAR },
    { id: 'slap', title: STRAND_TITLE.slap, rungs: B_SLAP },
    { id: 'pick', title: STRAND_TITLE.pick, rungs: B_PICK },
    { id: 'odd', title: STRAND_TITLE.odd, rungs: B_ODD },
    { id: 'bow', title: STRAND_TITLE.bow, rungs: B_BOW },
  ];
}

// ------------------------------------------------------------------ drums (0.81; drum items have no key)
const D_HANDS: Rung[] = [
  // AUDIT-6 Stage B: the rebound (d-first 2) first; the 8th-note paradiddle (d-first 6) between singles and doubles.
  r('d-first-2', 0, { 'd-first': 3 }),
  r('d-strokes-1', 0, { 'd-strokes': 2, 'd-rolls': 1, 'd-time': 1 }),
  r('d-rolls-1', 0, { 'd-strokes': 2, 'd-rolls': 2, 'd-time': 2 }),
  r('d-first-6', 0, { 'd-strokes': 2, 'd-rolls': 2, 'd-time': 2, 'd-first': 7 }),
  r('d-rolls-3', 0, { 'd-strokes': 4, 'd-rolls': 4, 'd-diddles': 2, 'd-time': 3 }),
  r('d-rolls-4', 0, { 'd-strokes': 5, 'd-rolls': 5, 'd-diddles': 3, 'd-time': 4 }),
  r('d-rolls-7', 0, { 'd-strokes': 6, 'd-rolls': 8, 'd-diddles': 5, 'd-time': 6 }),
  // STAGE C (AUDIT-6 DA-10): the buzz roll places the PAS rudiments and the stickings at tempo.
  r('d-pas-1', 0, { 'd-strokes': 8, 'd-rolls': 10, 'd-diddles': 8, 'd-time': 8, 'd-pas': 2, 'd-stick': 2 }),
];
const D_GROOVES: Rung[] = [
  r('d-rock-1', 0, { 'd-rock': 2, 'd-feet': 1, 'd-time': 2 }),
  r('d-rock-3', 0, { 'd-rock': 4, 'd-feet': 2, 'd-shuffle': 1 }),
  r('d-rock-5', 0, { 'd-rock': 6, 'd-feet': 3, 'd-shuffle': 2, 'd-funk': 1 }),
  r('d-funk-2', 0, { 'd-rock': 7, 'd-feet': 4, 'd-shuffle': 3, 'd-funk': 3 }),
  r('d-funk-4', 0, { 'd-rock': 8, 'd-feet': 5, 'd-shuffle': 4, 'd-funk': 5, 'd-jazz': 1 }),
  // STAGE C: a linear groove places linear funk, the syncopation interpretations and the odd meters at tempo.
  r('d-linear-1', 0, { 'd-rock': 9, 'd-feet': 6, 'd-shuffle': 6, 'd-funk': 8, 'd-jazz': 4, 'd-linear': 2, 'd-synco': 2, 'd-oddtempo': 1 }),
];
const D_FILLS: Rung[] = [
  r('d-fills-1', 0, { 'd-fills': 2 }),
  r('d-fills-2', 0, { 'd-fills': 3 }),
  r('d-fills-3', 0, { 'd-fills': 4 }),
  r('d-fills-5', 0, { 'd-fills': 6 }),
  // AUDIT-7 #12: develop the groove, a solo break, back to the groove (RSL I&I, G4–G5).
  r('d-fills-9', 0, { 'd-fills': 6 }),
];
const D_READING: Rung[] = [
  r('d-read-1', 0, { 'd-read': 2, 'd-notation': 1 }),
  // AUDIT-6 Stage B: snare reading in 2/4, 3/4 and 6/8 (d-first 7).
  r('d-first-7', 0, { 'd-read': 2, 'd-notation': 1, 'd-first': 8 }),
  // Owner 2026-11-19: reading dotted rhythms and 16th groupings counts simple and compound meters (d-count 1–2).
  r('d-read-2', 0, { 'd-read': 3, 'd-notation': 2, 'd-count': 2 }),
  r('d-read-3', 0, { 'd-read': 4, 'd-notation': 3, 'd-count': 3 }),
  r('d-read-5', 0, { 'd-read': 6, 'd-notation': 4, 'd-count': 3 }),
  r('d-read-7', 0, { 'd-read': 8, 'd-notation': 5, 'd-count': 3 }),
];
const D_INDEP: Rung[] = [
  r('d-indep-1', 0, { 'd-indep': 2 }),
  r('d-indep-2', 0, { 'd-indep': 3 }),
  r('d-indep-3', 0, { 'd-indep': 4 }),
  r('d-indep-5', 0, { 'd-indep': 6 }),
  // STAGE C: the jazz snare ladder places the independence ladders, brushes and trading.
  r('d-chapin-1', 0, { 'd-indep': 8, 'd-chapin': 2, 'd-brush': 1, 'd-trade': 1 }),
];
const D_EAR: Rung[] = [
  r('d-ear-1', 0, { 'd-ear': 2 }),
  r('d-ear-2', 0, { 'd-ear': 3 }),
  r('d-ear-4', 0, { 'd-ear': 5 }),
  r('d-ear-5', 0, { 'd-ear': 6 }),
];

// Owner 2026-11-19 ("the level test must check everything the course covers"): the style grooves, odd meters and song
// form are sections of their own (e-kit levels; a practice pad or an acoustic kit by microphone shows only what it can).
const D_MIDEAST: Rung[] = [
  r('d-mideast-1', 0, { 'd-mideast': 2 }),
  r('d-mideast-4', 0, { 'd-mideast': 5 }),
  r('d-mideast-7', 0, { 'd-mideast': 8 }),
];
const D_LATIN: Rung[] = [
  r('d-latin-1', 0, { 'd-latin': 2 }),
  r('d-latin-3', 0, { 'd-latin': 4 }),
  r('d-latin-6', 0, { 'd-latin': 7 }),
];
// Counting a 7/8 (2+2+3 or 3+2+2) proves the meter-counting ladder (d-count 1–3; 4–5 sit below it by difficulty).
const D_ODD: Rung[] = [
  r('d-count-3', 0, { 'd-count': 4 }),
  r('d-prog-3', 0, { 'd-count': 4, 'd-prog': 4 }),
  r('d-prog-6', 0, { 'd-count': 4, 'd-prog': 7 }),
];
// Form with the band: section lengths, a fill at every section end through the pop form, then the road map.
const D_FORM: Rung[] = [
  r('d-form-2', 0, { 'd-form': 3 }),
  r('d-song-3', 0, { 'd-form': 3, 'd-song': 4 }),
  r('d-song-5', 0, { 'd-form': 3, 'd-song': 6 }),
];

/**
 * The drums test: grooves, hands, fills, reading, independence, ear, then the style grooves (Middle-Eastern, Latin),
 * odd meters and song form (by microphone only the steps it can measure).
 * AUDIT-CONTENT-THEORY §ב.6: in the course path's order — the rock beat before the rudiments.
 */
export function drumStrands(): Strand[] {
  return [
    { id: 'grooves', title: STRAND_TITLE.grooves, rungs: D_GROOVES },
    { id: 'hands', title: STRAND_TITLE.hands, rungs: D_HANDS },
    { id: 'fills', title: STRAND_TITLE.fills, rungs: D_FILLS },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: D_READING },
    { id: 'indep', title: STRAND_TITLE.indep, rungs: D_INDEP },
    { id: 'ear', title: EAR_T, rungs: D_EAR },
    { id: 'mideast', title: STRAND_TITLE.mideast, rungs: D_MIDEAST },
    { id: 'latin', title: STRAND_TITLE.latin, rungs: D_LATIN },
    { id: 'odd', title: STRAND_TITLE.odd, rungs: D_ODD },
    { id: 'form', title: STRAND_TITLE.form, rungs: D_FORM },
  ];
}

/** The sections of an instrument's test. */
export function strandsFor(instrument: NonNullable<DrillSettings['instrument']>, emphasis: DrillSettings['emphasis'], o: { mic?: boolean; upright?: boolean } = {}): Strand[] {
  const all = instrument === 'guitar' ? guitarStrands() : instrument === 'bass' ? bassStrands() : instrument === 'drums' ? drumStrands() : pianoStrands(emphasis, o);
  // Hidden until verified (verifiedContent.ts): a rung whose level is not in the catalogue any more is left out; the
  // upright track's steps only for an upright / fretless bass (as its families in the course path, ladderFamiliesFor).
  const shown = new Set(families(instrument).filter((f) => o.upright || !(f as { upright?: boolean }).upright).flatMap((f) => f.levels.map((l) => l.id)));
  return all.map((st) => (st.rungs.every((x) => shown.has(x.level)) ? st : { ...st, rungs: st.rungs.filter((x) => shown.has(x.level)) })).filter((st) => st.rungs.length > 0);
}

/** The search through one section. lo = the hardest clean step (−1: none), hi = the easiest missed one (n: none). */
export interface StrandState {
  at: number;
  lo: number;
  hi: number;
  /** A step played "almost" twice: the level sits there. */
  edge: number | null;
  takes: number;
  retried: number[];
  last: Verdict | null;
}

/** At most this many takes per section (a section is usually 2–3). */
export const STRAND_TAKES = 4;

/** Where a section starts: its second step when it has four or more (one take saved for most players), else the first. */
export function startState(n: number, prior?: number): StrandState {
  const at = Math.max(0, Math.min(n - 1, prior ?? (n >= 4 ? 1 : 0)));
  return { at, lo: -1, hi: n, edge: null, takes: 0, retried: [], last: null };
}

/** Record one take of the current step. */
export function recordTake(s: StrandState, v: Verdict): StrandState {
  const takes = s.takes + 1;
  if (v === 'clean') return { ...s, takes, lo: Math.max(s.lo, s.at), last: v };
  // "Almost": one more take of the same step, never more; a second "almost" sets the level at that step.
  if (v === 'almost' && !s.retried.includes(s.at)) return { ...s, takes, retried: [...s.retried, s.at], last: v };
  if (v === 'almost') return { ...s, takes, hi: Math.min(s.hi, s.at), edge: s.at, last: v };
  return { ...s, takes, hi: Math.min(s.hi, s.at), last: v };
}

/** The next step of the section, or null when its level is known (bracketed, an edge, or out of takes). */
export function nextStep(s: StrandState, n: number): number | null {
  if (s.edge !== null || s.takes >= STRAND_TAKES) return null;
  if (s.last === 'almost' && s.retried.includes(s.at) && s.hi > s.at) return s.at;
  if (s.hi - s.lo <= 1) return null;
  // Clean and nothing missed yet: jump two steps (adaptive tests climb fast); else bisect the bracket. A long section
  // jumps further, so its top step stays within the four takes (owner 2026-11-19: every step of a section can be reached).
  if (s.last === 'clean' && s.hi === n) return Math.min(n - 1, s.lo + jumpOf(n));
  return Math.floor((s.lo + s.hi) / 2);
}

/** How far a clean take climbs: two steps, more in a section too long to reach its top in STRAND_TAKES takes. */
export const jumpOf = (n: number): number => Math.max(2, Math.ceil((n - 2) / (STRAND_TAKES - 1)));

/** Move a state to its next step (or mark it finished with at = −1). */
export function advance(s: StrandState, n: number): StrandState {
  const at = nextStep(s, n);
  return { ...s, at: at ?? -1 };
}

/** The start levels a finished section proves: the hardest clean step's, or one lower at an "almost" edge. */
export function strandPlaces(strand: Strand, s: StrandState): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  const put = (p: Rung['places'], minus: number) => {
    for (const [k, v] of Object.entries(p) as [FamilyId, number][]) out[k] = Math.max(out[k] ?? 1, v - minus);
  };
  if (s.lo >= 0) put(strand.rungs[s.lo].places, 0);
  if (s.edge !== null && s.edge > s.lo) put(strand.rungs[s.edge].places, 1);
  return out;
}

/** Every family of the instrument gets a start level: what the sections proved, else level 1 (capped to the family). */
export function testStart(instrument: NonNullable<DrillSettings['instrument']>, placed: Partial<Record<FamilyId, number>>): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  // capped to the family's top level number (levels hidden until verified leave gaps in the numbers)
  for (const f of families(instrument)) out[f.id] = Math.max(1, Math.min(Math.max(...f.levels.map((l) => l.level)), Math.round(placed[f.id] ?? 1)));
  return out;
}

/**
 * The levels of a family a saved start marks done by test. A start N proves the levels numbered below N; and since
 * levels are placed by difficulty, not by number (b-walk 19–21 and g-scales 13–15 were put in front later), every level
 * at or below the hardest of those proven levels' difficulty is done too. Numbers alone would leave an easier level
 * added later "to do" for a player who passed a harder rung. Pure: `diffOf` is the level's path rating.
 */
export function testedLevelIds(levels: readonly { id: string; level: number }[], start: number | undefined, diffOf: (id: string) => number | undefined): Set<string> {
  const out = new Set<string>();
  if (!start || start <= 1) return out;
  let top = -Infinity;
  for (const l of levels)
    if (l.level < start) {
      out.add(l.id);
      const d = diffOf(l.id);
      if (d !== undefined) top = Math.max(top, d);
    }
  for (const l of levels) {
    const d = diffOf(l.id);
    if (d !== undefined && d <= top) out.add(l.id);
  }
  return out;
}

/** Touch families: placed by the touch strand when it ran (other sections only infer them). */
export const TOUCH_FAMILIES: FamilyId[] = ['control'];
/** Families a microphone can never measure on the piano (the pedal). */
export const MIC_BLIND_FAMILIES: FamilyId[] = ['k-pedal'];

/**
 * MEASUREMENT-AUDIT (second round, owner's item 4): the test's places, honest about what was measured. The touch
 * families come from the touch section when it ran — a hands step no longer lifts control above what touch proved;
 * without a touch section they are inferred from the hands steps and flagged. By microphone the pedal families are
 * always inferred, and a control place above what the microphone's touch steps prove (MIC_TOUCH_PROVES) is flagged too.
 */
export function finishPlaces(runs: { strand: StrandId; places: Partial<Record<FamilyId, number>> }[], byMic = false): { places: Partial<Record<FamilyId, number>>; inferred: FamilyId[] } {
  const touch = runs.filter((x) => x.strand === 'touch');
  const places = mergePlaces(...runs.filter((x) => x.strand !== 'touch').map((x) => x.places));
  const inferred = new Set<FamilyId>();
  const fromTouch = mergePlaces(...touch.map((x) => x.places));
  for (const f of TOUCH_FAMILIES) {
    if (touch.length) {
      if (fromTouch[f] !== undefined) places[f] = fromTouch[f];
      else delete places[f];
      if (byMic && (places[f] ?? 1) > MIC_TOUCH_PROVES) inferred.add(f);
    } else if ((places[f] ?? 1) > 1) inferred.add(f);
  }
  for (const [k, v] of Object.entries(fromTouch) as [FamilyId, number][]) if (!TOUCH_FAMILIES.includes(k)) places[k] = Math.max(places[k] ?? 0, v);
  if (byMic) for (const f of MIC_BLIND_FAMILIES) if ((places[f] ?? 1) > 1) inferred.add(f);
  return { places, inferred: [...inferred] };
}

/** Merge the places of several sections (the higher start wins). */
export function mergePlaces(...ps: Partial<Record<FamilyId, number>>[]): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  for (const p of ps) for (const [k, v] of Object.entries(p) as [FamilyId, number][]) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}
