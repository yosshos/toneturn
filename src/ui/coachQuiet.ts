// B3 (review 2026-11-25): while a coach run is on screen, the app's pop-ups (new badge, rank up) wait — the run's own end
// page shows what was gained. A tiny shared flag the coach sets and App reads (useSyncExternalStore).
import { useSyncExternalStore } from 'react';

let quiet = false;
const subs = new Set<() => void>();

export function setCoachQuiet(on: boolean): void {
  if (quiet === on) return;
  quiet = on;
  for (const f of subs) f();
}

export function useCoachQuiet(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => quiet,
    () => false,
  );
}
