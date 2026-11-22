// A student's class median (docs/SPEC-PROGRESS-CHARTS.md §6, §8.1): only when the summaries sync and the teacher turned
// the switch on (the server refuses otherwise, which reads as "none"). The first class the player is a member of.

import { useEffect, useState } from 'react';
import { classMedian, snapshotsOn } from '../cloud/snapshots';
import { myClasses } from '../cloud/classes';

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

export function useClassMedian(enabled: boolean, today: string): { day: string; tempo: number; minutes: number }[] | null {
  const [m, setM] = useState<{ day: string; tempo: number; minutes: number }[] | null>(null);
  useEffect(() => {
    if (!enabled || !snapshotsOn()) return;
    let live = true;
    void myClasses()
      .then((c) => (c.memberOf[0] ? classMedian(c.memberOf[0].id, addDays(today, -400)) : []))
      .then((r) => live && setM(r.length ? r : null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled, today]);
  return m;
}
