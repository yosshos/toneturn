// Shared kit for topic generators (spec T–V): the registry, seeded randomness, names, stimuli.

import { surfaceVary } from './surface';
import type { ChoiceQuestion, LessonDef, SkillId, Stimulus } from './lesson';

export interface TopicDef {
  title: { en: string; he: string };
  skill: SkillId;
  levels: { en: string; he: string }[];
  gen: (seed: number, level: number, id: string) => ChoiceQuestion;
}

export const TOPIC_GEN: Record<string, TopicDef> = {};

// ---------------------------------------------------------------- helpers

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pickR = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
export function shuffleR<T>(rnd: () => number, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const PC_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const PC_HE = ['דו', 'רה במול', 'רה', 'מי במול', 'מי', 'פה', 'סול במול', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];
export const pcName = (pc: number) => PC_FLAT[((pc % 12) + 12) % 12];
export const pcNameHe = (pc: number) => PC_HE[((pc % 12) + 12) % 12];
export const chordStim = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
export const notesStim = (midis: number[], each = 0.38): Stimulus => ({ kind: 'notes', midis, each });

export const eventsStim = (events: { midi: number; start: number; duration: number; velocity: number }[], length: number): Stimulus => ({ kind: 'events', events, length });
/** A name for a choice: English, Hebrew and spoken aliases. */
export const nm = (en: string, he: string, ...say: string[]) => ({ en, he, ...(say.length ? { say } : {}) });

export function choiceQ(p: Omit<ChoiceQuestion, 'kind' | 'id' | 'difficulty'> & { id: string; difficulty: number }): ChoiceQuestion {
  return { kind: 'choice', ...p };
}

/** One generated item, with its seed's surface variation (transposition and tempo, when they don't change the answer). */
export function genTopic(topic: string, seed: number, level: number, id: string): ChoiceQuestion {
  return surfaceVary(TOPIC_GEN[topic].gen(seed, level, id), topic, seed);
}

/** A lesson of n items of a topic at a level. */
export function topicLesson(topic: string, level: number, seed = Date.now(), n = 6): LessonDef {
  const T = TOPIC_GEN[topic];
  const rnd = rng(seed);
  const questions = Array.from({ length: n }, (_, i) => genTopic(topic, Math.floor(rnd() * 2 ** 31), level, `${topic}-${i + 1}`));
  return { id: 'topic', version: 1, skill: T.skill, scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions };
}

