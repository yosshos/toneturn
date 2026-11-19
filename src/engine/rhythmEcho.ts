// Owner 2026-11-19: a rhythm question is never answered by saying "ta ti-ti" — those syllables only confuse. Rhythm
// is answered by performing it: tap it back on the pad, or say it in time on any syllable ("dum", "pa"), which the
// microphone takes as onsets (never speech recognition). Every "which rhythm did you hear?" item, in every course
// (the Ear course first of all), becomes that echo.
import type { LessonDef, Question, RhythmReadQuestion } from './lesson';

export function asRhythmEcho(q: Question): Question {
  if (q.kind !== 'rhythm-dict' || q.mode === 'build') return q;
  const echo: RhythmReadQuestion = {
    id: q.id,
    kind: 'rhythm-read',
    level: q.level,
    rhythm: q.rhythm,
    bpm: q.bpm,
    show: 'notation',
    byEar: true,
    choices: [],
    answer: 'accurate',
    stimulus: [],
    difficulty: q.difficulty,
    prompt: { en: 'Hear the rhythm, then play it back', he: 'שמעו את הקצב, ואז החזירו אותו' },
    skillAs: q.skillAs ?? 'rhythm-dictation',
    ...(q.aid ? { aid: q.aid } : {}),
  };
  return echo;
}

/** Heard-rhythm items answered by performing, when `on` (owner 2026-11-19, both asked for): in a lesson with two or more
 *  "which bar did you hear" items, the first stays a pick-the-written-bar choice (tapped, never said) and the rest are
 *  played back; a lone item is played back. Build-from-blocks items stay (they are tapped). */
export function rhythmByPerformance(lesson: LessonDef, on: boolean): LessonDef {
  const heard = lesson.questions.filter((q) => q.kind === 'rhythm-dict' && q.mode !== 'build');
  if (!on || !heard.length) return lesson;
  const keep = heard.length >= 2 ? heard[0] : null;
  return { ...lesson, questions: lesson.questions.map((q) => (q === keep ? q : asRhythmEcho(q))) };
}
