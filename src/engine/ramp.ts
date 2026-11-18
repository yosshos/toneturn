// A gentle ramp inside one session (owner + tester 2026-11-18: "the basics run a bit too fast"; people need success
// before the next step). A topic climbs ONE level at a time, and only after a short run at its current level: 3 items
// at a beginner level (rated below mp, < 950), 2 items higher up. An item asked higher than that is generated at the
// topic's current level instead — a fresh seed is a new item (other notes, key, order, tempo), so the repeat costs no
// new content and the session never gets longer; the jump to the top level is simply dropped when there is no room.
//
// Applied where a session is hand-built from several topic levels (the course tastes, the basics lessons). Path steps
// and topic practice are one level per session (6 items); level tests are deliberately one take per step: untouched.

import { TOPIC_GEN } from './topicKit';

/** Below this rating a level counts as beginner material (the pp and p bands, gameTiers DYN_FROM). */
export const BEGINNER_BELOW = 950;

/** Items a session asks at a level (of this difficulty) before it moves the topic up a level. */
export const rampNeed = (difficulty: number): number => (difficulty < BEGINNER_BELOW ? 3 : 2);

const DIFF = new Map<string, number>();
/** A topic level's difficulty (its generator is pure; cached). Unknown topics: level 1 is beginner, above is not. */
export function levelDifficulty(topic: string, level: number): number {
  const key = `${topic}:${level}`;
  let d = DIFF.get(key);
  if (d === undefined) {
    try {
      d = TOPIC_GEN[topic] ? TOPIC_GEN[topic].gen(1, level, 'ramp').difficulty : level <= 1 ? BEGINNER_BELOW - 1 : BEGINNER_BELOW;
    } catch {
      d = level <= 1 ? BEGINNER_BELOW - 1 : BEGINNER_BELOW;
    }
    DIFF.set(key, d);
  }
  return d;
}

/**
 * The levels to generate a sequence of topic items at (same order, same length). A topic's first item sets where it
 * starts; after that it rises by one level at most, and only once `rampNeed` items were asked at its current level.
 * Asking lower than the current level is kept as asked (a step back is always fine).
 */
export function rampLevels(items: readonly { topic: string; level: number }[], difficultyOf: (topic: string, level: number) => number = levelDifficulty): number[] {
  const at = new Map<string, { level: number; n: number }>();
  return items.map(({ topic, level }) => {
    const cur = at.get(topic);
    if (!cur) {
      at.set(topic, { level, n: 1 });
      return level;
    }
    if (level < cur.level) return level;
    if (level > cur.level && cur.n >= rampNeed(difficultyOf(topic, cur.level))) {
      cur.level += 1;
      cur.n = 1;
      return cur.level;
    }
    cur.n += 1;
    return cur.level;
  });
}

/** True when a sequence already follows the ramp (rampLevels changes nothing): for content tests. */
export const isGentle = (items: readonly { topic: string; level: number }[], difficultyOf?: (topic: string, level: number) => number): boolean =>
  rampLevels(items, difficultyOf).every((l, i) => l === items[i].level);
