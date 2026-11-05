// All mini-lessons (spec X), by id.

import type { MiniLesson } from './miniTypes';
import { EXAMPLE } from './mini/example';
import { LESSONS as PATH } from './mini/path';
import { LESSONS as RHYTHM } from './mini/rhythm';
import { LESSONS as JAZZ } from './mini/jazz';
import { LESSONS as THEORY_EAR } from './mini/theoryEar';
import { LESSONS as VOICE } from './mini/voice';
import { UNIT_LESSON } from './units';

export const MINI_LESSONS: Record<string, MiniLesson> = Object.fromEntries([...EXAMPLE, ...PATH, ...RHYTHM, ...JAZZ, ...THEORY_EAR, ...VOICE].map((l) => [l.id, l]));

/** The mini-lesson that opens a unit, if there is one. */
export const lessonForUnit = (unit: string): MiniLesson | null => MINI_LESSONS[UNIT_LESSON[unit] ?? ''] ?? null;
