// Keep every sung exercise inside the player's comfortable range (spec P.0 / "Vocal range and per-note
// feedback"): move the sung notes — and the reference that goes with them — by whole octaves. Intervals
// never change. A question whose sung notes cannot fit is left out of the session.

import type { LessonDef, Question, Stimulus } from './lesson';
import type { VoiceRange } from './vocal';

/** Notes the player is asked to sing, or null when the question is not sung. */
export function sungNotes(q: Question): number[] | null {
  switch (q.kind) {
    case 'sing':
      return [q.targetMidi];
    case 'sing-seq':
    case 'sing-run':
      return q.midis;
    default:
      return null;
  }
}

/** The octave shift that puts all notes inside the range (closest to the centre), or null. */
export function octaveShiftInto(notes: number[], range: VoiceRange): number | null {
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  const centre = (range.low + range.high) / 2;
  let best: number | null = null;
  for (let k = -4; k <= 4; k++) {
    const s = k * 12;
    if (lo + s < range.low || hi + s > range.high) continue;
    if (best === null || Math.abs((lo + hi) / 2 + s - centre) < Math.abs((lo + hi) / 2 + best - centre)) best = s;
  }
  return best;
}

function shiftStim(st: Stimulus, s: number): Stimulus {
  switch (st.kind) {
    case 'note':
      return { ...st, midi: st.midi + s };
    case 'notes':
      return { ...st, midis: st.midis.map((m) => m + s) };
    case 'resolve':
      return { ...st, fromMidi: st.fromMidi + s, toMidi: st.toMidi + s };
    case 'chord':
      return { ...st, midis: st.midis.map((m) => m + s) };
    case 'melody':
      return { ...st, midis: st.midis.map((m) => m + s) };
    default:
      return st;
  }
}

/** A sung question moved into the range; the same question when not sung; null when it cannot fit. */
export function fitQuestion(q: Question, range: VoiceRange): Question | null {
  const notes = sungNotes(q);
  if (!notes || !notes.length) return q;
  const s = octaveShiftInto(notes, range);
  if (s === null) return null;
  if (s === 0) return q;
  const stimulus = q.stimulus.map((st) => shiftStim(st, s));
  switch (q.kind) {
    case 'sing':
      return { ...q, targetMidi: q.targetMidi + s, stimulus };
    case 'sing-seq':
    case 'sing-run':
      return { ...q, midis: q.midis.map((m) => m + s), stimulus };
    default:
      return q;
  }
}

export function fitQuestions(qs: Question[], range: VoiceRange): Question[] {
  return qs.map((q) => fitQuestion(q, range)).filter((q): q is Question => q !== null);
}

/** The lesson with its sung questions inside the range (unchanged when no range is set). */
export function fitLessonToRange(def: LessonDef, range: VoiceRange | null | undefined): LessonDef {
  if (!range) return def;
  const questions = fitQuestions(def.questions, range);
  return questions.length === def.questions.length && questions.every((q, i) => q === def.questions[i]) ? def : { ...def, questions: questions.length ? questions : def.questions };
}
