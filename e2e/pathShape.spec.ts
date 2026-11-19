import { expect, test, type Page } from '@playwright/test';

// AUDIT-6 Stage A: every course's path screen loads after the re-placement and fits a 320 × 720 phone (en + he); the
// Jazz path of a pianist opens with jazz (swing, the blues) and carries performed steps from the piano families.

// SPEC-JAZZ-FOLD: 'ear-jazz' = the Ear course of a student (the jazz pack open: its jazz top levels on the path).
const PLAYS: Record<string, string[]> = { ear: [], 'ear-jazz': ['keys'], voice: ['voice'], keys: ['keys'], guitar: ['guitar'], bass: ['bass'], drums: ['drums'] };

const seed = async (page: Page, lang: 'en' | 'he', course: string) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, track: course === 'ear-jazz' ? 'student' : 'explorer', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course.replace('-jazz', '')].filter((c, i, a) => a.indexOf(c) === i), activeCourse: course.replace('-jazz', ''), seenVersion: '9.9.9' };
      await new Promise((res, rej) => {
        const r = indexedDB.open('toneturn', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          const tx = r.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(progress, 'progress');
          tx.objectStore('kv').put(settings, 'settings');
          tx.oncomplete = res;
          tx.onerror = rej;
        };
        r.onerror = rej;
      });
    },
    { lang, course, plays: PLAYS[course] },
  );
};

test.describe('AUDIT-6: every course path loads and fits a small phone', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  for (const course of Object.keys(PLAYS))
    for (const lang of ['en', 'he'] as const)
      test(`${course} path (${lang})`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await seed(page, lang, course);
        await page.goto('/?unlock#/path');
        await expect(page.locator('[data-step]').first()).toBeAttached();
        if (course === 'ear-jazz') {
          // A student's Ear path holds the jazz pack (swing, the blues, guide tones …) among its steps.
          await expect(page.locator('[data-step^="topic:"]').first()).toBeAttached();
        }
        if (['keys', 'guitar', 'bass', 'drums', 'voice'].includes(course)) await expect(page.locator('[data-step^="tech:"], [data-step^="vocal:"]').first()).toBeAttached();
        expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
        expect(errors).toEqual([]);
      });
});
