// Every share that leaves the app carries a link back into it (owner 2026-11-18): shares go to WhatsApp and social
// networks, to people who are not in the app yet. The link shows the preview card (index.html og: tags, og-image.png);
// the text says who is inviting, what the app is, and what to do.

type Lang = 'he' | 'en';

/** The app's home address on this deployment (the live site in production). */
export function appHome(loc: { origin: string; pathname: string } = location): string {
  return `${loc.origin}${loc.pathname}`;
}

/** A friend code: 6 characters from the server's alphabet (no I, L, O, 0, 1). */
export const FRIEND_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
export const friendLink = (home: string, code: string) => `${home}#/f/${code}`;
/** The code in a "#/f/CODE" hash, or null. */
export function friendFromHash(hash: string): string | null {
  const c = /^#\/?f\/([A-Za-z0-9]{6})\/?$/.exec(hash.trim())?.[1].toUpperCase() ?? null;
  return c && FRIEND_CODE_RE.test(c) ? c : null;
}

/** "Add me" — the friend-code invite. The code is in the link and in the text (typed in by hand when the link is lost). */
export function friendInviteText(name: string, code: string, lang: Lang): string {
  const who = name.trim();
  return lang === 'he'
    ? `${who ? `הזמנה מ־${who}: ` : ''}בואו להתאמן איתי בחוש ה־7 — אימון שמיעה, שירה ונגינה, כמה דקות ביום.\nבקישור נשלחת אליי בקשת חברות, ונתחרה בליגה השבועית (קוד חבר: ${code}).`
    : `${who ? `${who} wants to practice with you on` : 'Practice with me on'} The 7th Sense — ear training, singing and playing, a few minutes a day.\nThe link sends me your friend request — see you in this week's league (friend code: ${code}).`;
}

/** The closing line of a result share (puzzle, daily, tempo best): an invitation, then the link on its own line. */
export function inviteTail(lang: Lang): string {
  return lang === 'he' ? 'גם אתם? החוש ה־7 — אימון שמיעה, שירה ונגינה:' : 'Your turn? The 7th Sense — ear training, singing and playing:';
}

/** Text with the link last, on its own line (WhatsApp turns it into the preview card). */
export const withLink = (text: string, url: string) => `${text}\n${url}`;

/**
 * Share through the device's sheet, or copy text + link when there is none. The link rides inside the text, not in the
 * separate `url` field: some share targets (WhatsApp among them) keep only one of the two fields.
 * Resolves 'shared' | 'copied' | 'cancelled'.
 */
export async function shareOut(text: string, url: string, files?: File[]): Promise<'shared' | 'copied' | 'cancelled'> {
  const full = withLink(text, url);
  try {
    if (typeof navigator.share === 'function') {
      if (files?.length && navigator.canShare?.({ files })) await navigator.share({ files, text: full });
      else await navigator.share({ text: full });
      return 'shared';
    }
    await navigator.clipboard.writeText(full);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

const PENDING = 'toneturn.friendInvite';
/** A friend link opened before sign-in (or before onboarding ends) waits here for a week. */
export function savePendingFriend(code: string): void {
  try {
    localStorage.setItem(PENDING, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* private mode */
  }
}
export function pendingFriend(): string | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) ?? 'null') as { code: string; at: number } | null;
    return p && Date.now() - p.at < 7 * 864e5 && FRIEND_CODE_RE.test(p.code) ? p.code : null;
  } catch {
    return null;
  }
}
export function clearPendingFriend(): void {
  try {
    localStorage.removeItem(PENDING);
  } catch {
    /* fine */
  }
}

const FLASH = 'toneturn.friendFlash';
/** The result of a friend link's request, shown once on the Community screen. */
export function setFriendFlash(result: string): void {
  try {
    sessionStorage.setItem(FLASH, result);
  } catch {
    /* fine */
  }
}
export function takeFriendFlash(): string | null {
  try {
    const r = sessionStorage.getItem(FLASH);
    sessionStorage.removeItem(FLASH);
    return r;
  } catch {
    return null;
  }
}
