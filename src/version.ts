// Build identity + player-facing changelog.

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const APP_COMMIT = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'dev';
export const APP_BUILT = typeof __APP_BUILT__ !== 'undefined' ? __APP_BUILT__ : '';

export interface ChangeEntry {
  version: string;
  date: string;
  en: string[];
  he: string[];
}

/** Newest first. Keep entries short and player-facing. */
export const CHANGELOG: ChangeEntry[] = [
  {
    version: '0.5.0',
    date: '2026-11-04',
    en: ['Menu with version, install and update', 'Daily streak reminders (push)', 'Friends: add by code and compare weekly XP'],
    he: ['תפריט עם גרסה, התקנה ועדכון', 'תזכורת יומית לשמירה על הרצף (פוש)', 'חברים: הוספה בקוד והשוואת XP שבועי'],
  },
  {
    version: '0.4.0',
    date: '2026-11-04',
    en: ['Echo Chain and Beat Echo memory games', 'Play together on one device (up to 4 players)'],
    he: ['משחקי הזיכרון שרשרת הד והד קצב', 'משחק משותף על מכשיר אחד (עד 4 שחקנים)'],
  },
  {
    version: '0.3.0',
    date: '2026-11-04',
    en: ['4 new lessons incl. singing with a live tuner', 'Cloud save with Google sign-in'],
    he: ['4 שיעורים חדשים כולל שירה עם מד כיוון', 'שמירה בענן עם התחברות Google'],
  },
  {
    version: '0.2.0',
    date: '2026-11-04',
    en: ['English by default, full Hebrew', 'Choose the narration voice'],
    he: ['אנגלית כברירת מחדל, עברית מלאה', 'בחירת קול הקריין'],
  },
  {
    version: '0.1.0',
    date: '2026-11-04',
    en: ['First lesson: Same B♭, two homes', 'Hands-free voice answers'],
    he: ['השיעור הראשון: אותו B♭, שני בתים', 'תשובות בקול בלי ידיים'],
  },
];

/** -1 / 0 / 1 semantic version compare (numeric parts only). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Changelog entries newer than the version the player last saw. */
export function unseenChanges(lastSeen: string | null): ChangeEntry[] {
  if (!lastSeen) return [];
  return CHANGELOG.filter((c) => compareVersions(c.version, lastSeen) > 0);
}
