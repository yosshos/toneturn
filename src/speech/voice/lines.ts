// Every English line the narrator speaks that can be known ahead of time (0.66, owner: phones without WebGPU are
// too slow for on-device Kokoro, so these lines ship as pre-rendered audio files). Used by the build script
// (scripts/voice/render.mjs via scripts/voice/inventory.ts) and the coverage test; the app never imports it.
//
// static   — fixed text: mini-lessons (core + in depth), fixed intro cards, the memory game, the Settings preview.
// harvest  — lines built per question by the lesson generators: every lesson is built with many seeds and its
//            intro / prompts / feedback collected; where a family saturates (no new lines with more seeds) the
//            whole family is covered.

import { MINI_LESSONS } from '../../content/minilessons';
import { personal } from '../../content/personal';
import { makeLesson, type LessonId } from '../../engine/lesson';
import { correctText, introGo, introText, retryText, revealText, roundPrompt, silenceText, unclearText } from '../../game/content';
import { T as MEMORY } from '../../game/memoryGame';
import { narration } from '../../game/narration';
import { pc, spokenMajorKey, type Naming } from '../../engine/pitch';
import { previewText } from './preview';
export { previewText };

export type LineSource = 'mini' | 'mini-name' | 'intro' | 'go' | 'prompt' | 'feedback' | 'memory' | 'preview' | 'other';
export interface VoiceLine {
  /** The raw English text as the app passes it to tts.speak (before speakable()). */
  text: string;
  src: LineSource;
}

/** Fixed lessons (adaptive ones are built per player and use the same question kinds). */
export const FIXED_LESSONS: LessonId[] = [
  'bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five', 'intervals', 'inversions', 'notes-degrees',
  'sing-names', 'sing-degrees', 'rhythm-r1', 'rhythm-r2', 'rhythm-r3', 'rhythm-r4', 'rhythm-r5', 'rhythm-r6', 'rhythm-r7',
  'rhythm-r8', 'note-sequences', 'songs', 'jazz-1', 'runs', 'runs-workshop', 'modes', 'wrong-notes', 'dictation', 'jazz-2',
  'basics-pitch', 'basics-shape', 'basics-beat', 'basics-voice', 'transpose', 'rhythm-shift', 'chord-tones', 'slash-chords',
];

const NAMINGS: Naming[] = ['letter', 'solfege'];
const KEY_NAMES = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];


/** Mini-lesson lines; a line with `{name}` is rendered without the name (the screen still shows it). */
export function miniLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  for (const l of Object.values(MINI_LESSONS))
    for (const s of [...l.steps, ...(l.more ?? [])]) out.push({ text: personal(s.say.en, null), src: /\{name\}/.test(s.say.en) ? 'mini-name' : 'mini' });
  return out;
}

export function memoryLines(): VoiceLine[] {
  const t = MEMORY.en;
  const out: string[] = [t.listen, t.yourTurnSing, t.yourTurnTap, ...t.pass, t.fail, t.unclear];
  for (let n = 1; n <= 30; n++) out.push(t.soloTurn(n, 'melody'), t.soloTurn(n, 'rhythm'));
  for (const nm of NAMINGS) for (const k of KEY_NAMES) out.push(t.key(spokenMajorKey(pc(k), nm, 'en')));
  return out.map((text) => ({ text, src: 'memory' }));
}

export function previewLines(): VoiceLine[] {
  return NAMINGS.map((nm) => ({ text: previewText(nm), src: 'preview' as const }));
}

/** Build every fixed lesson with `seeds` seeds and collect what the controller would say (intro, go, prompts, feedback). */
export function harvestLessons(seeds: number, feedback = true): VoiceLine[] {
  const out: VoiceLine[] = [];
  for (const id of FIXED_LESSONS)
    for (let seed = 1; seed <= seeds; seed++) {
      let lesson;
      try {
        lesson = makeLesson(id, seed * 7919);
      } catch {
        continue;
      }
      for (const nm of NAMINGS) {
        for (const step of lesson.intro) out.push({ text: introText(lesson, step, 'en', nm), src: 'intro' });
        if (nm === 'letter') out.push({ text: introGo(lesson, 'en'), src: 'go' });
        if (!feedback) continue;
        lesson.questions.forEach((q, i) => {
          out.push({ text: roundPrompt(q, 'en', nm, i + 1), src: 'prompt' });
          out.push({ text: correctText(q, 'en', true, nm), src: 'feedback' }, { text: correctText(q, 'en', false, nm), src: 'feedback' });
          out.push({ text: revealText(q, 'en', nm), src: 'feedback' });
          if (nm === 'letter') out.push({ text: retryText(q, 'en'), src: 'feedback' }, { text: silenceText(q, 'en'), src: 'feedback' }, { text: unclearText(q, 'en'), src: 'feedback' });
        });
      }
    }
  out.push({ text: narration.skipped('en'), src: 'other' });
  out.push({ text: "I didn't catch any taps. Again, after the count-in.", src: 'other' });
  return out;
}

/** Distinct lines by text, first source wins; empty lines dropped. */
export function distinct(lines: VoiceLine[]): VoiceLine[] {
  const seen = new Map<string, VoiceLine>();
  for (const l of lines) if (l.text?.trim() && !seen.has(l.text)) seen.set(l.text, l);
  return [...seen.values()];
}
