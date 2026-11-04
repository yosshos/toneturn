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
    version: '0.8.0',
    date: '2026-11-04',
    en: ['New scoring: accuracy, attempts and response time all count', 'Answer chips show your time, attempts and XP', 'Timed scoring is off during your first week (change it in Settings)'],
    he: ['ניקוד חדש: דיוק, מספר ניסיונות וזמן תגובה', 'אחרי כל תשובה רואים זמן, ניסיונות ו-XP', 'בשבוע הראשון הניקוד בלי זמן (אפשר לשנות בהגדרות)'],
  },
  {
    version: '0.7.1',
    date: '2026-11-04',
    en: ['Skill Map: rhythmic memory and rhythmic precision are now separate, like singing in tune and melodic memory'],
    he: ['מפת המיומנויות: זיכרון קצבי ודיוק קצבי נפרדים עכשיו, כמו שירה מדויקת וזיכרון מלודי'],
  },
  {
    version: '0.7.0',
    date: '2026-11-04',
    en: ['New lesson: thirds, fifths and octaves', 'New lesson: which note is in the bass? (C, C/E, C/G)', 'Intervals now appear on your Skill Map'],
    he: ['שיעור חדש: טרצות, קווינטות ואוקטבות', 'שיעור חדש: איזה צליל בבס? (C,‏ C/E,‏ C/G)', 'המרווחים מופיעים עכשיו במפת המיומנויות'],
  },
  {
    version: '0.6.0',
    date: '2026-11-04',
    en: [
      'Find my level: 9 questions that adapt to you',
      'Skill Map: your ear, skill by skill, with a recommended next step',
      'Review your mistakes and hear your answer next to the right one',
      'Weekly puzzle with gold and silver medals',
      'Beat Echo: calibrate tap timing for your device',
    ],
    he: [
      'מציאת הרמה: 9 שאלות שמתאימות את עצמן אליכם',
      'מפת מיומנויות: האוזן שלכם לפי מיומנות, עם הצעד הבא המומלץ',
      'חזרה על טעויות — שומעים את התשובה שלכם ליד הנכונה',
      'חידה שבועית עם מדליות זהב וכסף',
      'הד קצב: כיול תזמון ההקשה למכשיר שלכם',
    ],
  },
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
