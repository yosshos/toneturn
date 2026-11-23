// The student's open assignments and the teacher's classes, read once per session for the item pages and the places'
// marks (SPEC-PATH-TODAY-PRACTICE §5.1–§5.2). Signed out or offline: empty lists, quietly (no notices).
import { useEffect, useState } from 'react';
import { myAssignments, type AssignItem } from '../cloud/teacher';
import { myClasses, type TeachingClass } from '../cloud/classes';
import { assignmentFor, itemOfAssign, type ItemRef } from '../engine/itemAssign';
import { localDay } from '../storage/progress';

let mine: Promise<AssignItem[]> | null = null;
let teaching: Promise<TeachingClass[]> | null = null;
const subs = new Set<() => void>();

const loadMine = () => (mine ??= myAssignments().catch(() => []));
const loadTeaching = () => (teaching ??= myClasses().then((c) => c.teaching).catch(() => []));

/** Read again (after the teacher assigns from an item page, or the user signs in). */
export function refreshAssigns() {
  mine = null;
  teaching = null;
  subs.forEach((f) => f());
}

function useLoaded<T>(load: () => Promise<T>, empty: T, on: boolean): T {
  const [v, setV] = useState<T>(empty);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((x) => x + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    void load().then((x) => alive && setV(x));
    return () => {
      alive = false;
    };
  }, [on, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** The signed-in student's assignments (every class). */
export const useMyAssigns = (on = true): AssignItem[] => useLoaded(loadMine, [] as AssignItem[], on);
/** The classes this user teaches (empty for a student): the item pages' "assign" button shows only for a teacher. */
export const useTeaching = (on = true): TeachingClass[] => useLoaded(loadTeaching, [] as TeachingClass[], on);

/** The open assignment for one item page, or null. */
export function useAssignFor(r: ItemRef | null, on = true): AssignItem | null {
  const as = useMyAssigns(on && !!r);
  return r ? assignmentFor(as, r, localDay(new Date())) : null;
}

/** Every item named by an open assignment, as keys "level:<id>", "lick:<id>", "piece:<key>", "improv:<n>" (the marks). */
export function assignedKeys(as: AssignItem[]): Set<string> {
  const out = new Set<string>();
  for (const a of as) {
    const it = itemOfAssign(a);
    if (it) out.add(itemKey(it));
  }
  return out;
}
export const itemKey = (r: ItemRef): string => (r.k === 'piece' ? `piece:${r.key}` : r.k === 'improv' ? `improv:${r.n}` : `${r.k}:${r.id}`);
