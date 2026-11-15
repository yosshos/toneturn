// The grid progression dictation (owner 2026-11-14, progGrid.ts): hear a progression, write every bar as root +
// quality + bass / colour on chip rows — from four diatonic triads (1100) to a 32-bar AABA (1850), in all 12 keys.

import { TOPIC_GEN, rng } from './topicKit';
import { GRID_LEVELS, gridItem } from './progGrid';

TOPIC_GEN['grid-dictation'] = {
  title: { en: 'Progressions on the grid', he: 'מהלכים על הגריד' },
  skill: 'cadences',
  levels: GRID_LEVELS.map((l) => ({ en: l.en, he: l.he })),
  gen(seed, level, id) {
    return gridItem(seed, level, id, rng(seed));
  },
};
