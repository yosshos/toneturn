// Pure merge logic for cloud sync: local and remote lesson results are unioned by session id
// and progress is rebuilt deterministically, so syncing twice never double-counts XP.

import { applyResult, emptyProgress, type LessonResult, type Progress } from './progress';

export function mergeResults(local: LessonResult[], remote: LessonResult[]): LessonResult[] {
  const bySession = new Map<string, LessonResult>();
  for (const r of [...remote, ...local]) if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, r);
  return [...bySession.values()].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Rebuild progress from results; streaks follow each result's own completion time. */
export function rebuildProgress(results: LessonResult[]): Progress {
  return results.reduce((p, r) => applyResult(p, r, new Date(r.completedAt)), emptyProgress());
}

/** Local results the server does not have yet. */
export function pendingUploads(local: LessonResult[], remote: LessonResult[]): LessonResult[] {
  const have = new Set(remote.map((r) => r.sessionId));
  return local.filter((r) => !have.has(r.sessionId));
}
