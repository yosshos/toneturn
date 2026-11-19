// Curriculum audit 2026-11-19 (INSTRUMENTS R7.4, VOICE-DRUMS R2, EAR-JAZZ F25): every family's and every topic's
// first path level opens with a teaching screen — through the same lookup the path uses (App.tsx: ladderLessonKey for
// technique / vocal steps, "topic:<id>" for question steps). The lists below are the steps that still have NO lesson:
// each needs new content, which needs the owner's approval. A list entry that gets a lesson must leave the list.

import { describe, expect, it } from 'vitest';
import { ladderOrder, stepCatalogue, type PathStep } from '../src/engine/path';
import { ladderLessonKey, lessonForUnit } from '../src/content/minilessons';

/** Technique / vocal families whose first level has no lesson yet (missing content; owner approval needed). */
const FAMILIES_WITHOUT_LESSON = [
].sort();

/** Question topics whose level 1 has no mini-lesson yet. */
const TOPICS_WITHOUT_LESSON = ['sight-modulate'].sort();

const cat = stepCatalogue();

function firstLevels(): PathStep[] {
  const fams = new Map<string, PathStep[]>();
  for (const s of cat) if (s.ladder && (s.kind === 'tech' || s.kind === 'vocal')) fams.set(s.ladder.family, [...(fams.get(s.ladder.family) ?? []), s]);
  return [...fams.values()].map((ss) => [...ss].sort(ladderOrder)[0]);
}

describe('every first path level opens with its teaching screen', () => {
  it('technique and vocal families', () => {
    const missing = firstLevels().filter((s) => !ladderLessonKey(s.kind, s.ladder!)).map((s) => s.ladder!.family).sort();
    expect(missing).toEqual(FAMILIES_WITHOUT_LESSON);
  });
  it('question topics', () => {
    const tops = [...new Set(cat.filter((s) => s.kind === 'topic' && s.topic).map((s) => s.topic!))];
    const missing = tops.filter((t) => !lessonForUnit(`topic:${t}`)).sort();
    expect(missing).toEqual(TOPICS_WITHOUT_LESSON);
  });
  it('the audits\' wiring: 7th chords, numerals, Harris, guide tones, modes, voice leading, guitar families', () => {
    const key = (ref: string, family: string) => lessonForUnit(ladderLessonKey('tech', { family, ref }) ?? '')?.id;
    expect(key('voicings-2', 'voicings')).toBe('seventh-types');
    expect(key('b-chord-6', 'b-chord')).toBe('seventh-types');
    expect(key('g-chords-3', 'g-chords')).toBe('seventh-types');
    expect(key('cadences-1', 'cadences')).toBe('roman-numerals');
    expect(key('b-ear-3', 'b-ear')).toBe('roman-numerals');
    expect(key('g-ear-6', 'g-ear')).toBe('roman-numerals');
    expect(key('harris-1', 'harris')).toBe('bh-scale');
    expect(key('jazz-1', 'jazz')).toBe('guide-tones');
    expect(key('scales-19', 'scales')).toBe('modes');
    expect(key('b-pocket-3', 'b-pocket')).toBe('swing-ratio');
    expect(key('k-vl-1', 'k-vl')).toBe('vl-triads');
    expect(key('k-vl-3', 'k-vl')).toBe('vl-guide');
    expect(key('g-vl-2', 'g-vl')).toBe('vl-drop');
    expect(key('g-harris-1', 'g-harris')).toBe('g-harris-neck');
    expect(key('g-jazz-1', 'g-jazz')).toBe('g-jazz-comp');
    expect(key('d-rock-1', 'd-rock')).toBe('first-rock');
    expect(key('d-diddles-1', 'd-diddles')).toBe('drum-paradiddle');
    // VOICE-DRUMS B5–B11: the drums' own lessons
    expect(key('d-read-1', 'd-read')).toBe('drum-values');
    expect(key('d-strokes-4', 'd-strokes')).toBe('drum-accents');
    expect(key('d-funk-1', 'd-funk')).toBe('drum-accents');
    expect(key('d-diddles-5', 'd-diddles')).toBe('drum-flams');
    expect(key('d-shuffle-1', 'd-shuffle')).toBe('drum-shuffle');
    expect(key('d-jazz-1', 'd-jazz')).toBe('drum-swing-ride');
    expect(key('d-latin-3', 'd-latin')).toBe('drum-clave');
    expect(key('d-mideast-1', 'd-mideast')).toBe('drum-mideast');
    expect(lessonForUnit('topic:drum-values')?.id).toBe('drum-values');
    expect(lessonForUnit('topic:drum-style')?.id).toBe('drum-styles-ear');
    // the instrument lessons of 2026-11-19 (L5–L9)
    expect(key('b-walk-1', 'b-walk')).toBe('walk-approach');
    expect(key('b-up-walk-1', 'b-up-walk')).toBe('walk-approach');
    expect(key('accomp-2', 'accomp')).toBe('walk-approach');
    expect(key('accomp-1', 'accomp')).toBe('piano-lh-styles');
    expect(key('g-reading-1', 'g-reading')).toBe('g-staff-read');
    expect(key('b-read-1', 'b-read')).toBe('b-staff-read');
    expect(key('g-scales-1', 'g-scales')).toBe('g-pent-boxes');
    expect(key('b-time-1', 'b-time')).toBe('first-rhythms');
    expect(key('k-read-2', 'k-read')).toBe('first-rhythms');
    expect(key('b-walk-21', 'b-walk')).toBe('bass-blues-walk');
    expect(lessonForUnit('topic:song-strum')?.id).toBe('song-chords');
    // a level with its own lesson keeps it
    expect(key('k-lh-4', 'k-lh')).toBe('sp-shells');
    expect(lessonForUnit('topic:voice-leading')?.id).toBe('four-parts');
  });
  it('vocal families fall back to their track lesson', () => {
    const v = (ref: number, family: string) => lessonForUnit(ladderLessonKey('vocal', { family, ref: String(ref) }) ?? '')?.id;
    expect(v(1, 'v-breath')).toBe('voice-breath');
    expect(v(101, 'v-scale')).toBe('vocal-scales');
    expect(v(1501, 'v-scat')).toBe('voice-scat');
    expect(v(2101, 'v-first')).toBe('first-voice');
    // VOICE-DRUMS B3, B4: the blues entry split in two; the ear family's own lesson (no longer the drift lesson).
    expect(v(2301, 'v-jazz1')).toBe('voice-jazz-start');
    expect(v(2304, 'v-jazz1')).toBe('voice-guide-tones');
    expect(v(1203, 'v-ear')).toBe('voice-ear');
  });
});
