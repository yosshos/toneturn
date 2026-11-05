// Pure merge logic for cloud sync: local and remote lesson results are unioned by session id
// and progress is rebuilt deterministically, so syncing twice never double-counts XP.

import { applyResult, emptyProgress, type LessonResult, type Progress } from './progress';

export function mergeResults(local: LessonResult[], remote: LessonResult[]): LessonResult[] {
  const bySession = new Map<string, LessonResult>();
  for (const r of [...remote, ...local]) if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, r);
  return [...bySession.values()].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Rebuild progress from results; streaks follow each result's own completion time. */
export function rebuildProgress(results: LessonResult[], local?: Progress): Progress {
  const rebuilt = results.reduce((p, r) => applyResult(p, r, new Date(r.completedAt)), emptyProgress());
  if (!local) return rebuilt;
  // Local-only data survives a rebuild: game bests, game-round ratings, puzzle medals, older snapshots.
  const gameEvents = (local.ratingEvents ?? []).filter((e) => e.id.startsWith('g:'));
  const have = new Set((rebuilt.ratingEvents ?? []).map((e) => e.id));
  // Lesson events that only exist locally (results synced before the server stored items).
  const localLesson = (local.ratingEvents ?? []).filter((e) => !e.id.startsWith('g:') && !have.has(e.id));
  return {
    ...rebuilt,
    games: local.games,
    daily: local.daily,
    ghosts: local.ghosts,
    tfBest: local.tfBest,
    stats: local.stats && (local.stats.days.length >= (rebuilt.stats?.days.length ?? 0)) ? local.stats : rebuilt.stats,
    ratingEvents: [...(rebuilt.ratingEvents ?? []), ...localLesson, ...gameEvents],
    puzzles: { ...(local.puzzles ?? {}), ...(rebuilt.puzzles ?? {}) },
    snapshots: local.snapshots && (local.snapshots.length > (rebuilt.snapshots?.length ?? 0)) ? local.snapshots : rebuilt.snapshots,
  };
}

/** Local results the server does not have yet. */
export function pendingUploads(local: LessonResult[], remote: LessonResult[]): LessonResult[] {
  const have = new Set(remote.map((r) => r.sessionId));
  return local.filter((r) => !have.has(r.sessionId));
}
