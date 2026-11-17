// Encore v3 (SPEC-PHRASE-STUDIO §11.5): the sharer's bonus. When a friend reaches the target on my shared phrase (every
// needed key at the target — "learned it", rank f), I earn +5 XP, once per friend per phrase, at most 50 a week. No XP
// for posting and none for reactions. The bonus is an ordinary result (lessonId "challenge-learned") so it reaches the
// weekly league and the day's ring like other XP; it is never a practice day and never a "good session" (progress.ts).
// Pure.

import type { BoardRow } from './community';

export const SHARER_BONUS_XP = 5;
export const SHARER_BONUS_WEEK_CAP = 50;
export const SHARER_RESULT_ID = 'challenge-learned';

/** FNV-1a (32-bit, hex) — a short stable id for the result's session. */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
/** The result's session id for (phrase, friend): the same on every device, so the bonus is paid once. */
export const sharerSessionId = (phraseId: string, userId: string) => `lrn-${fnv(`${phraseId}:${userId}`)}${fnv(`${userId}:${phraseId}`)}`;

export interface ShareLite {
  id: string;
  needed: number;
  mine: boolean;
  status?: string;
}
export interface SharerBonus {
  phraseId: string;
  userId: string;
  name: string;
  sessionId: string;
  xp: number;
}

/** Monday of the local week (yyyy-mm-dd) — the cap's week. */
export function localWeekStart(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/**
 * The bonuses still due: my live shared phrases × my friends' board rows at the target (not mine, not the creator's
 * row, not flagged), minus those already paid (`paid` = session ids in my history), up to the week's cap
 * (`weekPaid` = the bonus XP already earned this week).
 */
export function sharerBonuses(shares: readonly ShareLite[], boards: Readonly<Record<string, readonly BoardRow[]>>, paid: ReadonlySet<string>, weekPaid: number): SharerBonus[] {
  const out: SharerBonus[] = [];
  let left = Math.max(0, SHARER_BONUS_WEEK_CAP - weekPaid);
  for (const s of shares) {
    if (!s.mine || (s.status && s.status !== 'live')) continue;
    for (const r of boards[s.id] ?? []) {
      if (left < SHARER_BONUS_XP) return out;
      if (r.me || r.creator || r.flagged || !r.userId || r.keys < s.needed) continue;
      const sessionId = sharerSessionId(s.id, r.userId);
      if (paid.has(sessionId) || out.some((x) => x.sessionId === sessionId)) continue;
      out.push({ phraseId: s.id, userId: r.userId, name: r.name, sessionId, xp: SHARER_BONUS_XP });
      left -= SHARER_BONUS_XP;
    }
  }
  return out;
}

/** What my history says: the paid sessions and this week's bonus XP. */
export function paidSoFar(history: readonly { lessonId: string; sessionId: string; xp: number; completedAt: string }[], now = new Date()): { paid: Set<string>; weekPaid: number } {
  const wk = localWeekStart(now);
  const mine = history.filter((h) => h.lessonId === SHARER_RESULT_ID);
  return { paid: new Set(mine.map((h) => h.sessionId)), weekPaid: mine.filter((h) => localWeekStart(new Date(h.completedAt)) === wk).reduce((s, h) => s + h.xp, 0) };
}
