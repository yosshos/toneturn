// Personal pace goals (engine/fluency.ts), kept on this device.

import { updatePace, type FluencyRecord, type PaceProfile } from '../engine/fluency';
import type { Question } from '../engine/lesson';

const KEY = 'toneturn.pace';

export function loadPace(): PaceProfile {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? (v as PaceProfile) : {};
  } catch {
    return {};
  }
}

export function learnPace(qs: Question[], rs: FluencyRecord[], now = new Date()): PaceProfile {
  const next = updatePace(loadPace(), qs, rs, now);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: goals simply don't move */
  }
  return next;
}
