import { expect, test, type Page } from '@playwright/test';

// Game setups fit one phone screen (GAMES_TIERS_PLAN P1, owner rule "exercise fits one screen"): every game's setup
// at 390×844, English and Hebrew, shows the six level-tier buttons (pp … ff) and its Start button without vertical
// scrolling. Seeded as a returning player (onboarding done) in the game's course.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const seed = async (page: Page, lang: 'en' | 'he', course: string) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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
    { lang, course },
  );
};

const GAMES: [string, string][] = [
  ['rush-chord', 'ear'],
  ['rush-note', 'ear'],
  ['rush-interval', 'ear'],
  ['rush-keysig', 'ear'],
  ['rush-progression', 'ear'],
  ['rush-fretboard', 'guitar'],
  ['highway', 'ear'],
  ['highway', 'drums'],
  ['melodypuzzle', 'ear'],
  ['flight', 'voice'],
  ['nametune', 'ear'],
  ['tuneup', 'guitar'],
  ['pitchmemory', 'ear'],
  ['peakhunter', 'ear'],
  ['truefalse', 'ear'],
  ['games', 'ear'],
  ['ghost', 'ear'],
  ['duel', 'ear'],
];

for (const lang of ['en', 'he'] as const) {
  test(`game setups: six tiers and Start on one screen (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    const bad: string[] = [];
    let lastCourse = '';
    for (const [route, course] of GAMES) {
      if (course !== lastCourse) {
        await seed(page, lang, course);
        lastCourse = course;
      }
      await page.goto('about:blank');
      await page.goto(`/?sim=1&unlock=all&lang=${lang}#/${route}`);
      const row = page.locator('.tier-row').first();
      await expect(row, `${route}: tier row`).toBeVisible();
      await expect(row.locator('.tier-chip')).toHaveCount(6);
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        // The test-only "simulated" banner is not part of the real screen.
        const banner = document.querySelector('.sim-banner') as HTMLElement | null;
        if (banner) banner.style.display = 'none';
        const over = document.scrollingElement!.scrollHeight - innerHeight;
        const btns = [...document.querySelectorAll('main .btn.primary, main .btn.mega')] as HTMLElement[];
        const start = btns.find((b) => b.getBoundingClientRect().height > 0);
        const bottom = start ? start.getBoundingClientRect().bottom : 0;
        return { over, bottom, h: innerHeight };
      });
      if (r.over > 4 || r.bottom > r.h + 1) {
        bad.push(`${route}/${course}: taller by ${Math.round(r.over)}px, start bottom ${Math.round(r.bottom)} / ${r.h}`);
        await page.screenshot({ path: `test-results/fit-${lang}-${route}-${course}.png`, fullPage: true }).catch(() => {});
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
}
