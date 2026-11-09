// "Players at your level" lines (spec L.5) for the daily challenge and the weekly puzzle.

import { useEffect, useState } from 'react';
import { dailyPeers, puzzleStats, type LevelStats } from '../cloud/compete';
import type { Strings } from '../i18n/strings';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** "Players at your level" (L.5): daily challenge peers or weekly-puzzle band stats. */
export function LevelStatsLine({ t, kind, day, week, band }: { t: Strings; kind: 'daily' | 'puzzle'; day?: string; week?: string; band?: string }) {
  const [s, setS] = useState<LevelStats | null>(null);
  useEffect(() => {
    if (kind === 'daily' && day) void dailyPeers(day).then(setS, () => {});
    if (kind === 'puzzle' && week && band) void puzzleStats(week, band).then(setS, () => {});
  }, [kind, day, week, band]);
  if (!s || !s.players) return null;
  const secs = s.medianMs ? (s.medianMs / 1000).toFixed(1) : '–';
  return (
    <p className="field-hint level-stats">
      {' '}
      {kind === 'daily'
        ? fill(t.peersDaily, { n: s.players, p: Math.round(s.medianPoints ?? 0), s: secs })
        : fill(t.peersPuzzle, { n: s.players, g: Math.round((100 * (s.gold ?? 0)) / s.players), s: secs })}
    </p>
  );
}
