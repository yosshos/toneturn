// "Refresh the concept" (owner, 2026-11-07): during any exercise the player can open the short mini-lesson behind
// the current question, then come back to the same question. Pure lookup: question → mini-lesson.

import type { Question } from '../engine/lesson';
import { questionTags, TOPIC_TAGS } from '../engine/taxonomy';
import type { SkillId } from '../engine/lesson';
import { MINI_LESSONS } from './minilessons';
import { UNIT_LESSON } from './units';
import type { MiniLesson } from './miniTypes';

/** The topic a question was generated from, when it carries one. */
export function topicOfQuestion(q: Question): string | null {
  const t = (q as { topic?: unknown }).topic;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && typeof (t as { id?: unknown }).id === 'string') return (t as { id: string }).id;
  return null;
}

let bySub: Map<string, string> | null = null;
let bySkill: Map<SkillId, string> | null = null;
/** sub-skill / skill → a mini-lesson, from the topics that have one (first topic wins). */
function indexes() {
  if (bySub && bySkill) return { bySub, bySkill };
  bySub = new Map();
  bySkill = new Map();
  for (const [unit, mini] of Object.entries(UNIT_LESSON)) {
    if (!unit.startsWith('topic:') || !MINI_LESSONS[mini]) continue;
    const t = TOPIC_TAGS[unit.slice(6)];
    if (!t) continue;
    const tags = typeof t === 'function' ? t(1) : t;
    const first = tags[0];
    if (!first) continue;
    if (first.sub && !bySub.has(first.sub)) bySub.set(first.sub, mini);
    if (!bySkill.has(first.skill)) bySkill.set(first.skill, mini);
  }
  return { bySub, bySkill };
}

/** The mini-lesson to refresh the concept of this question (topic → its lesson; the hand-made lesson; else by sub-skill / skill). */
export function refresherFor(q: Question, lessonId?: string | null): MiniLesson | null {
  const topic = topicOfQuestion(q);
  const direct = (topic && UNIT_LESSON[`topic:${topic}`]) || (lessonId && UNIT_LESSON[lessonId]) || null;
  if (direct && MINI_LESSONS[direct]) return MINI_LESSONS[direct];
  const { bySub, bySkill } = indexes();
  let tags: ReturnType<typeof questionTags> = [];
  try {
    tags = questionTags(q);
  } catch {
    tags = [];
  }
  for (const tg of tags) {
    const m = (tg.sub && bySub.get(tg.sub)) || null;
    if (m) return MINI_LESSONS[m];
  }
  for (const tg of tags) {
    const m = bySkill.get(tg.skill);
    if (m) return MINI_LESSONS[m];
  }
  return null;
}
