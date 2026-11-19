// Curriculum audit 2026-11-19 (INSTRUMENTS R7.4, VOICE-DRUMS R2, EAR-JAZZ F25): every family's and every topic's
// first path level opens with a teaching screen — through the same lookup the path uses (App.tsx: ladderLessonKey for
// technique / vocal steps, "topic:<id>" for question steps). The lists below are the steps that still have NO lesson:
// each needs new content, which needs the owner's approval. A list entry that gets a lesson must leave the list.

import { describe, expect, it } from 'vitest';
import { ladderOrder, stepCatalogue, type PathStep } from '../src/engine/path';
import { ladderLessonKey, lessonForUnit } from '../src/content/minilessons';

/** Technique / vocal families whose first level has no lesson yet (missing content; owner approval needed). */
const FAMILIES_WITHOUT_LESSON = [
  // keys
  'fingers', 'control', 'k-classic', 'accomp', 'k-pedal', 'advanced',
  // guitar
  'g-fingerstyle', 'g-picking', 'g-fretting', 'g-legato', 'g-lead', 'g-flamenco',
  // bass (the bass-guitar family under the guitar catalogue, the upright families too)
  'g-bass', 'b-pluck', 'b-pocket', 'b-fret', 'b-length', 'b-styles', 'b-ghost', 'b-pick', 'b-impro', 'b-legato', 'b-slap', 'b-feel',
  'b-up-arco', 'b-up-pizz', 'b-up-pos', 'b-up-scales',
  // drums
  'd-strokes', 'd-ear', 'd-indep', 'd-rolls', 'd-fills', 'd-funk', 'd-latin',
].sort();

/** Question topics whose level 1 has no mini-lesson yet. */
const TOPICS_WITHOUT_LESSON = ['drum-style', 'song-strum', 'sight-modulate'].sort();

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
    // 2026-11-19: the new shared-theory lessons (mini/theoryCore.ts) open the levels that first use them.
    expect(key('voicings-2', 'voicings')).toBe('sevenths');
    expect(key('b-chord-6', 'b-chord')).toBe('sevenths');
    expect(key('g-chords-3', 'g-chords')).toBe('sevenths');
    expect(key('arpeggios-4', 'arpeggios')).toBe('sevenths');
    expect(key('cadences-1', 'cadences')).toBe('chord-numbers');
    expect(key('b-ear-3', 'b-ear')).toBe('chord-numbers');
    expect(key('g-ear-6', 'g-ear')).toBe('chord-numbers');
    expect(key('harris-1', 'harris')).toBe('bh-scale');
    expect(key('jazz-1', 'jazz')).toBe('guide-tones');
    expect(key('scales-19', 'scales')).toBe('mode-colours');
    expect(key('b-scale-4', 'b-scale')).toBe('mode-colours');
    expect(key('b-pocket-3', 'b-pocket')).toBe('swing-ratio');
    expect(key('k-vl-1', 'k-vl')).toBe('vl-triads');
    expect(key('k-vl-3', 'k-vl')).toBe('vl-guide');
    expect(key('g-vl-2', 'g-vl')).toBe('vl-drop');
    expect(key('g-harris-1', 'g-harris')).toBe('g-harris-neck');
    expect(key('g-jazz-1', 'g-jazz')).toBe('g-jazz-comp');
    expect(key('d-rock-1', 'd-rock')).toBe('first-rock');
    expect(key('d-diddles-1', 'd-diddles')).toBe('drum-paradiddle');
    // a level with its own lesson keeps it
    expect(key('k-lh-4', 'k-lh')).toBe('sp-shells');
    expect(lessonForUnit('topic:voice-leading')?.id).toBe('four-parts');
    // EAR-JAZZ M3 / M5: the topics that borrowed another topic's lesson now have their own.
    for (const t of ['blues-ear', 'voicing-type', 'chart-analysis', 'jazz-chains', 'chorale-rn']) expect(lessonForUnit(`topic:${t}`)?.id).toBe(t);
    expect(lessonForUnit('topic:compound-intervals')?.id).toBe('beyond-octave');
  });
  it('vocal families fall back to their track lesson', () => {
    const v = (ref: number, family: string) => lessonForUnit(ladderLessonKey('vocal', { family, ref: String(ref) }) ?? '')?.id;
    expect(v(1, 'v-breath')).toBe('voice-breath');
    expect(v(101, 'v-scale')).toBe('vocal-scales');
    expect(v(1501, 'v-scat')).toBe('voice-scat');
    expect(v(2101, 'v-first')).toBe('first-voice');
  });
});
