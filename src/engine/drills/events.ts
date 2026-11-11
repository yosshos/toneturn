// Technique drills → the rest of the app (everything-connects): rated events for the Skill Map / path / stats,
// and XP for the weekly league. Pure.

import type { RatingEvent } from '../rating';
import type { Drill, TakeMetrics } from './types';
import { tempoBand } from './analyze';

/** Guitar / bass drills ('g-' families) rate the guitar technique sub-skill. */
export const isGuitarDrill = (drill: Drill): boolean => drill.spec.family.startsWith('g-') || drill.spec.family.startsWith('b-') || drill.spec.instrument === 'guitar' || drill.spec.instrument === 'bass';

/** Difficulty of a take: the tempo band (T1–T7) on the rating scale 600–1600, + a little for hands together. */
export function drillDifficulty(drill: Drill, m: TakeMetrics): number {
  const band = tempoBand(m.nps);
  return Math.round(Math.min(1600, 640 + band * 120 + (drill.spec.hands === 'RL' ? 60 : 0)));
}

/** Graded score 0..1: notes right × evenness (when it matters). */
export function drillScore(drill: Drill, m: TakeMetrics): number {
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  const cv = cvs.length ? Math.max(...cvs) : 0;
  const even = drill.goal.evenness ? Math.max(0, Math.min(1, 1 - Math.max(0, cv - 0.03) * 8)) : 1;
  return Math.round(Math.max(0, Math.min(1, m.accuracy * (0.6 + 0.4 * even))) * 1000) / 1000;
}

/** Bass drills (the bass course, the old g-bass starter, any drill for the bass) rate the bass technique sub-skill. */
export const isBassTechDrill = (drill: Drill): boolean => drill.spec.family.startsWith('b-') || drill.spec.family === 'g-bass' || drill.spec.instrument === 'bass';

/** Drum drills (the drums course, 'd-' families) rate the drum technique sub-skill. */
export const isDrumDrill = (drill: Drill): boolean => drill.spec.family.startsWith('d-') || drill.spec.instrument === 'drums';

type Tags = NonNullable<RatingEvent['tags']>;
/**
 * What a take rates besides the technique sub-skill (BASS_AUDIT A11): bass time / pocket drills feed timing (the click
 * on 2 & 4 or the off-beats → "when the click moves", a click on 1 or fading → "through the gaps", the kick → steady
 * beat), walking lines feed progressions, chord-tone lines feed harmony; other evenness drills a little subdividing.
 */
function secondTag(drill: Drill): Tags[number] | null {
  const f = drill.spec.family;
  // Drums (DRUMS_CURRICULUM §4): time drills feed timing by their click, grooves and fills the steady beat, reading
  // the drum-kit reading sub-skill; every drum take is also a timing take (it is all time).
  if (f === 'd-time') return { skill: 'timing', sub: drill.click === '24' || drill.click === 'and' ? 'timing/backbeat' : drill.click === 'gap' || drill.click === 'one' ? 'timing/gap' : 'timing/subdivide', w: 0.4 };
  // Independence lines to read (DRUMS_AUDIT N1) feed kit reading; every other groove family the steady beat.
  if (f === 'd-indep' && drill.show === 'staff') return { skill: 'rhythm-reading', sub: 'rhythm-reading/drums', w: 0.3 };
  // The drummer's ear (hear it, play it back, write it): the course's ear share, through the instrument.
  if (f === 'd-ear') return { skill: 'rhythm-dictation', sub: 'rhythm-dictation/dictate', w: 0.5 };
  // Odd and compound meters (9/8, 7/8, 10/8, 6/8 bembé) feed meter.
  if ((f === 'd-mideast' || f === 'd-latin') && drill.pulse === 8) return { skill: 'meter', sub: drill.meter % 3 === 0 && drill.groups?.every((g) => g === 3) ? 'meter/compound' : 'meter/odd', w: 0.3 };
  // DRUMS_NICHE_PLAN P1: songs and song forms feed song form (and the steady beat as every groove); prog feeds odd
  // meters (eighth pulse or changing meters), polyrhythm, else the steady beat; counting feeds meter; notation and
  // reading feed kit reading.
  if (f === 'd-form') return { skill: 'form', sub: 'form/song', w: 0.3 };
  if (f === 'd-song') return { skill: 'timing', sub: 'timing/steady', w: 0.3 };
  if (f === 'd-prog') return drill.pulse === 8 || drill.meters?.some((m) => m.meter.den === 8) ? { skill: 'meter', sub: 'meter/odd', w: 0.3 } : drill.goal.drum?.poly ? { skill: 'rhythm-dictation', sub: 'rhythm-dictation/poly', w: 0.3 } : { skill: 'timing', sub: 'timing/steady', w: 0.3 };
  if (f === 'd-count') return { skill: 'meter', sub: drill.notes.length && drill.meters?.some((m) => m.meter.den === 8 && m.meter.num % 3 !== 0) ? 'meter/odd' : drill.pulse === 8 ? 'meter/compound' : 'meter/count', w: 0.4 };
  if (f === 'd-notation') return { skill: 'rhythm-reading', sub: drill.notes.some((n) => n.voice && n.voice !== 'snare') ? 'rhythm-reading/drums' : 'rhythm-reading/read', w: 0.4 };
  if (f === 'd-rock' || f === 'd-fills' || f === 'd-funk' || f === 'd-shuffle' || f === 'd-indep' || f === 'd-mideast' || f === 'd-feet' || f === 'd-jazz' || f === 'd-latin') return { skill: 'timing', sub: 'timing/steady', w: 0.3 };
  if (f === 'd-read') return { skill: 'rhythm-reading', sub: drill.notes.some((n) => n.voice && n.voice !== 'snare') ? 'rhythm-reading/drums' : 'rhythm-reading/read', w: 0.4 };
  if (f.startsWith('d-')) return { skill: 'timing', sub: 'timing/subdivide', w: 0.3 };
  if (f === 'b-time') return { skill: 'timing', sub: drill.click === '24' || drill.click === 'and' ? 'timing/backbeat' : drill.click === 'one' || drill.click === 'fade' ? 'timing/gap' : 'timing/subdivide', w: 0.4 };
  if (f === 'b-pocket') return { skill: 'timing', sub: 'timing/steady', w: 0.4 };
  if (f === 'b-walk') return { skill: 'cadences', sub: 'cadences/progression', w: 0.3 };
  if (f === 'b-chord') return { skill: 'theory', sub: 'theory/harmony', w: 0.3 };
  // BASS_NICHE_PLAN P1: swing time and Latin feel the steady beat; odd meters, polymeter and odd-meter riffs meter;
  // metric modulation and displacement subdividing; Barry Harris lines the Barry sub; form the progression; solos
  // improvisation (trading 4s: call and response); the new ear levels their ear skill through the bass.
  if (f === 'b-swing') return { skill: 'timing', sub: 'timing/steady', w: 0.4 };
  if (f === 'b-latin') return drill.meter % 3 === 0 && drill.pulse === 8 ? { skill: 'meter', sub: 'meter/compound', w: 0.3 } : { skill: 'timing', sub: 'timing/steady', w: 0.3 };
  if (f === 'b-odd') return drill.spec.kind === 'displace' ? { skill: 'timing', sub: 'timing/subdivide', w: 0.4 } : { skill: 'meter', sub: 'meter/odd', w: 0.4 };
  if (f === 'b-poly') return drill.tempoMap?.length || drill.spec.kind === 'four3' ? { skill: 'timing', sub: 'timing/subdivide', w: 0.4 } : { skill: 'meter', sub: 'meter/odd', w: 0.4 };
  if (f === 'b-prog') return drill.pulse === 8 ? { skill: 'meter', sub: 'meter/odd', w: 0.3 } : { skill: 'timing', sub: 'timing/steady', w: 0.3 };
  if (f === 'b-barry') return { skill: 'chords', sub: 'chords/barry', w: 0.3 };
  if (f === 'b-jform') return { skill: 'cadences', sub: 'cadences/progression', w: 0.3 };
  if (f === 'b-impro' && (drill.spec.kind === 'trade4' || drill.spec.kind === 'answer')) return { skill: 'improv', sub: 'improv/answer', w: 0.3 };
  if (f === 'b-impro') return { skill: 'improv', sub: 'improv/play', w: 0.3 };
  if (f === 'b-ear') {
    const k = drill.spec.kind;
    if (k === 'quality2' || k === 'quality3') return { skill: 'chords', sub: 'chords/extension', w: 0.5 };
    if (k === 'motion' || k === 'secdom' || k === 'where' || k === 'dropin' || k === 'bridge') return { skill: 'cadences', sub: 'cadences/progression', w: 0.5 };
    if (k === 'transcribe-long') return { skill: 'dictation', sub: 'dictation/bass', w: 0.5 };
    if (k === 'riff-ear') return { skill: 'rhythm-dictation', sub: 'rhythm-dictation/dictate', w: 0.5 };
  }
  // The pianist's ear (PIANO_AUDIT §3): the ear share through the keys, by what the level asks to hear.
  if (f === 'k-ear') {
    const k = drill.spec.kind;
    if (k === 'intervals') return { skill: 'intervals', sub: drill.spec.option === 2 ? 'intervals/harmonic' : 'intervals/melodic', w: 0.5 };
    if (k === 'bass-line') return { skill: 'dictation', sub: 'dictation/bass', w: 0.5 };
    if (k === 'chords') return { skill: 'cadences', sub: 'cadences/progression', w: 0.5 };
    if (k === 'harmonise') return { skill: 'cadences', sub: 'cadences/harmonize', w: 0.5 };
    if (k === 'transpose') return { skill: 'transpose', sub: 'transpose/pitch', w: 0.5 };
    return { skill: 'sequences', sub: 'sequences/melody', w: 0.5 };
  }
  // Piano harmony and reading families (PIANO_AUDIT I3): cadences, voicings, Barry Harris, sight-reading.
  // GUITAR_DEEPENING §3: the guitarist's ear is the guitar course's ear share, by what the level asks to hear.
  if (f === 'g-ear') {
    const k = drill.spec.kind;
    if (k === 'tonic' || k === 'key') return { skill: 'degrees', sub: 'degrees/find-tonic', w: 0.5 };
    if (k === 'rhythm') return { skill: 'rhythm-dictation', sub: 'rhythm-dictation/dictate', w: 0.5 };
    if (k === 'roots') return { skill: 'cadences', sub: 'cadences/progression', w: 0.5 };
    if (k === 'quality') return { skill: 'chords', sub: 'chords/quality', w: 0.5 };
    return { skill: 'dictation', sub: 'dictation/melodic', w: 0.5 };
  }
  // Jazz guitar, Barry Harris on the neck, prog / fusion (§4.2–4.3).
  if (f === 'g-harris') return { skill: 'chords', sub: 'chords/barry', w: 0.3 };
  if (f === 'g-jazz') return drill.listen ? { skill: 'cadences', sub: 'cadences/progression', w: 0.4 } : { skill: 'chords', sub: 'chords/voicing', w: 0.3 };
  if (f === 'g-prog') return drill.tempoMap ? { skill: 'tempo', sub: 'tempo/compare', w: 0.3 } : drill.spec.kind === 'poly' ? { skill: 'timing', sub: 'timing/poly', w: 0.3 } : drill.pulse === 8 || drill.meters ? { skill: 'meter', sub: 'meter/odd', w: 0.3 } : { skill: 'timing', sub: 'timing/subdivide', w: 0.2 };
  if (f === 'cadences') return { skill: 'cadences', sub: 'cadences/cadence', w: 0.3 };
  if (f === 'voicings') return { skill: 'chords', sub: 'chords/voicing', w: 0.3 };
  if (f === 'harris') return { skill: 'chords', sub: 'chords/barry', w: 0.2 };
  // PIANO_JAZZ: Barry Harris harmony, jazz-piano harmony (voicings; reharmonising rates progressions), bebop lines
  // (playing along; trading fours is call and response).
  if (f === 'k-sixdim') return { skill: 'chords', sub: 'chords/barry', w: 0.3 };
  if (f === 'k-reharm') {
    const k = drill.spec.kind;
    if (k === 'rh-reharm') return { skill: 'cadences', sub: 'cadences/progression', w: 0.3 };
    if (k === 'rh-altered' || k === 'rh-minor') return { skill: 'chords', sub: 'chords/extension', w: 0.3 };
    return { skill: 'chords', sub: 'chords/voicing', w: 0.3 };
  }
  if (f === 'k-bebop') return { skill: 'improv', sub: drill.spec.kind === 'bb-trade' ? 'improv/answer' : 'improv/play', w: 0.3 };
  if (f === 'control' && drill.spec.kind === 'reading') return { skill: 'sight', sub: 'sight/read', w: 0.4 };
  if (drill.goal.evenness) return { skill: 'timing', sub: 'timing/subdivide', w: 0.2 };
  return null;
}

/**
 * One take = one graded rated event (instrument / piano technique — guitar technique for 'g-' families, bass technique
 * for bass drills — plus a timing / harmony share, see secondTag).
 * Ids use the 'g:drill:<session>:<i>' shape so the path groups a drill session like a game session.
 */
export function drillEvents(drill: Drill, m: TakeMetrics, at: string, sessionId: string, index: number): RatingEvent[] {
  const sub = isDrumDrill(drill) ? 'instrument/drum-tech' : isBassTechDrill(drill) ? 'instrument/bass-tech' : isGuitarDrill(drill) ? 'instrument/guitar-tech' : 'instrument/piano-tech';
  const two = secondTag(drill);
  const tags: Tags = two ? [{ skill: 'instrument', sub, w: Math.round((1 - two.w) * 10) / 10 }, two] : [{ skill: 'instrument', sub, w: 1 }];
  return [{ id: `g:drill:${sessionId}:${index}`, skill: 'instrument', difficulty: drillDifficulty(drill, m), correct: m.verdict === 'clean', score: drillScore(drill, m), tags, at }];
}

/** XP of a take (league effort): clean 4, almost 2, not yet 1. */
export const drillXp = (m: TakeMetrics): number => (m.verdict === 'clean' ? 4 : m.verdict === 'almost' ? 2 : 1);
