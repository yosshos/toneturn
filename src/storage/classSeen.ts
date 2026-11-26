// Class notifications, phase 1 (docs/SPEC-CLASS-NOTIFICATIONS.he.md §4.5): what the student has not seen yet — new
// assignments and new teacher replies — marked "new" in the lists and counted on the app icon. Kept on this device
// per user (localStorage); a first visit counts the last three days as new.

export interface Seen {
  /** Assignments created before this were seen. */
  at: string;
  /** Teacher replies seen, as "<submission id>:<mark>:<comment length>". */
  fb: string[];
}
interface SeenAssign {
  id: string;
  createdAt: string;
  submissions?: { id: string; comment: string | null; mark: string | null }[];
}

const KEY = (uid: string) => `tt.classSeen.${uid}`;
const FIRST_DAYS = 3;
const replyKey = (s: { id: string; comment: string | null; mark: string | null }) => `${s.id}:${s.mark ?? ''}:${(s.comment ?? '').length}`;

export function loadSeen(uid: string): Seen | null {
  try {
    const o = JSON.parse(localStorage.getItem(KEY(uid)) ?? 'null') as Seen | null;
    return o && typeof o.at === 'string' && Array.isArray(o.fb) ? o : null;
  } catch {
    return null;
  }
}

/** The assignments that are new, and those with a teacher reply not seen yet. Pure. */
export function freshOf(items: readonly SeenAssign[], seen: Seen | null, now = Date.now()): { assigns: Set<string>; replies: Set<string> } {
  const since = seen ? Date.parse(seen.at) : now - FIRST_DAYS * 86400000;
  const fb = new Set(seen?.fb ?? []);
  const assigns = new Set<string>();
  const replies = new Set<string>();
  for (const a of items) {
    if (Date.parse(a.createdAt) > since) assigns.add(a.id);
    const r = (a.submissions ?? []).find((s) => s.comment || s.mark);
    if (r && !fb.has(replyKey(r)) && (seen || Date.parse(a.createdAt) > since)) replies.add(a.id);
  }
  return { assigns, replies };
}

export function freshCount(f: { assigns: Set<string>; replies: Set<string> }): number {
  return new Set([...f.assigns, ...f.replies]).size;
}

/** Everything listed now has been seen. */
export function markSeen(uid: string, items: readonly SeenAssign[], now = new Date()) {
  const fb = items.flatMap((a) => (a.submissions ?? []).filter((s) => s.comment || s.mark).map(replyKey));
  try {
    localStorage.setItem(KEY(uid), JSON.stringify({ at: now.toISOString(), fb: fb.slice(-400) } satisfies Seen));
  } catch {
    /* storage full or blocked: the marks come back next time */
  }
  setAppBadge(0);
}

/** The number on the app's icon (installed app; quietly nothing elsewhere). Always an explicit number. */
export function setAppBadge(n: number) {
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (n > 0) void nav.setAppBadge?.(n)?.catch(() => {});
    else void nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* not supported */
  }
}
