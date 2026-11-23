// A take's real time (SPEC-DAILY-WORKOUT §2, phase 8 D5): the drill take marks the moment its first expected note is
// due (after the count-in); the screen that books the take reads the measured length — from that moment to the stop,
// plus the active setup time in the item since the previous take (activeTime.takeActiveMs). The take event's activeMs
// and the item's measured minutes (projection.ts) come from here instead of beats × 60000 / bpm.

import { takeActiveMs } from '../engine/activeTime';
import { activeSince } from './activity';
import { clickPlan } from '../engine/drills/timeline';
import type { Drill } from '../engine/drills/types';

let first: number | null = null;
let lastEnd: number | null = null;
/** Setup is counted only from a take this recent (a new sitting starts fresh). */
const SITTING_MS = 5 * 60_000;

/** The count-in started: a new take (forget an aborted one's start). */
export const takeCounting = () => {
  first = null;
};
/** The take's first expected note is due now. */
export const takePlaying = (t = Date.now()) => {
  if (first === null) first = t;
};
/**
 * The take ended: its measured active ms (`model`: beats × 60000 / bpm, used when no start was marked; `countInMs`:
 * the count-in, taken out of the setup).
 */
export function takeEnded(model: number, countInMs = 0, now = Date.now()): number {
  const from = lastEnd !== null && now - lastEnd < SITTING_MS ? lastEnd : null;
  const setupMs = from !== null && first !== null && first > from ? activeSince(from, first) : 0;
  const ms = takeActiveMs({ model, firstNoteAt: first, stopAt: now, setupMs, countInMs });
  first = null;
  lastEnd = now;
  return ms;
}
/** A drill take's measured active ms (the model and the count-in from the drill at its tempo). */
export function drillTakeMs(drill: Pick<Drill, 'meter' | 'click' | 'gap' | 'groups' | 'pulse' | 'meters' | 'tempoMap' | 'beats' | 'spec'>, bpm: number): number {
  const b = Math.max(30, bpm);
  let countIn = 0;
  try {
    countIn = clickPlan(drill, b).countIn;
  } catch {
    countIn = 0;
  }
  return takeEnded((drill.beats * 60000) / b, (countIn * 60000) / b);
}
