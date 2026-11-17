// "I use a different fingering" (owner 2026-11-17): the written fingering is a suggestion. A player can say, per item,
// that they use their own fingering, and enter their own numbers (one per note; 0 = not entered). Pure.
//  - the analysis never claims a finger hypothesis against the suggestion once any item is marked (model.ownFingering);
//  - an item's takes reach the player model with the player's numbers where entered and no suggested number elsewhere;
//  - the score and the keyboard show the player's numbers where entered.

import type { Drill } from './types';

/** itemId -> the player's finger per note index (0 = not entered). An empty list = own fingering, no numbers. */
export type OwnFingerings = Record<string, number[]>;

/** The item has written fingering to differ from (piano fingers, any hand). */
export const hasFingering = (d: Drill): boolean => d.notes.some((n) => !!n.finger);

/** The player marked this item. */
export const isOwn = (own: OwnFingerings | undefined, itemId: string): boolean => !!own && Array.isArray(own[itemId]);

/** Any item marked: the model's flag (no finger is ever named as a likely cause). */
export const anyOwn = (own: OwnFingerings | undefined): boolean => !!own && Object.values(own).some((x) => Array.isArray(x));

/** The drill the player model sees: the player's numbers where entered, no suggested number elsewhere. */
export function analysisDrill(d: Drill, own: OwnFingerings | undefined): Drill {
  if (!isOwn(own, d.itemId)) return d;
  const mine = own![d.itemId];
  return {
    ...d,
    notes: d.notes.map((n, i) => {
      const { finger: _suggested, ...rest } = n;
      return mine[i] ? { ...rest, finger: mine[i] } : rest;
    }),
  };
}

/** The drill shown: the player's numbers replace the suggestion where entered. */
export function shownDrill(d: Drill, own: OwnFingerings | undefined): Drill {
  const mine = own?.[d.itemId];
  if (!mine?.some(Boolean)) return d;
  return { ...d, notes: d.notes.map((n, i) => (mine[i] ? { ...n, finger: mine[i] } : n)) };
}

/** Tap a note: its finger moves on 1→2→3→4→5→1, starting from what is shown (the player's number or the suggestion). */
export function cycleFinger(own: OwnFingerings | undefined, d: Drill, i: number): OwnFingerings {
  const mine = (own?.[d.itemId] ?? []).slice();
  while (mine.length < d.notes.length) mine.push(0);
  const cur = mine[i] || d.notes[i]?.finger || 0;
  mine[i] = (cur % 5) + 1;
  return { ...(own ?? {}), [d.itemId]: mine };
}

/** Mark / unmark an item (unmarking forgets its numbers). */
export function setOwn(own: OwnFingerings | undefined, itemId: string, on: boolean): OwnFingerings {
  const next = { ...(own ?? {}) };
  if (on) next[itemId] = next[itemId] ?? [];
  else delete next[itemId];
  return next;
}

/** Clear the entered numbers, keep the mark. */
export const resetOwn = (own: OwnFingerings | undefined, itemId: string): OwnFingerings => ({ ...(own ?? {}), [itemId]: [] });

/**
 * The next notes to play and their finger, for the keyboard's small number: the notes at the first onset after `beat`
 * (the first onset before the take). Only notes with a finger; none once the last onset has passed.
 */
export function nextFingers(d: Drill, beat: number): { pitch: number; finger: number; hand: 'R' | 'L' }[] {
  const ons = d.notes.filter((n) => n.finger && n.beat > beat + 1e-6);
  if (!ons.length) return [];
  const at = Math.min(...ons.map((n) => n.beat));
  return ons.filter((n) => Math.abs(n.beat - at) < 1e-6).map((n) => ({ pitch: n.pitch, finger: n.finger!, hand: n.hand }));
}
