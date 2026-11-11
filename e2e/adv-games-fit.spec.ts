import { expect, test, type Page } from '@playwright/test';

// 0.70 advanced games (GAMES_TIERS_PLAN §4) and the game board fit one phone screen (390×844), English and Hebrew:
// the setup shows six tier buttons (pp and p locked: "opens at mp") and Start without vertical scrolling, and after
// Start the play screen does not scroll either. Seeded as a returning player in the game's course.

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
  ['rush-voicing', 'jazz'],
  ['rush-scale', 'jazz'],
  ['rush-standard', 'jazz'],
  ['reharm', 'jazz'],
  ['transcribe', 'jazz'],
  ['bhtime', 'keys'],
  ['riffecho', 'guitar'],
  ['polylock', 'drums'],
];

const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return document.scrollingElement!.scrollHeight - innerHeight;
  });

for (const lang of ['en', 'he'] as const) {
  test(`advanced games: setup and play on one screen (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
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
      await expect(row.locator('.tier-chip[data-tier="pp"]')).toBeDisabled();
      await expect(row.locator('.tier-chip[data-tier="mp"]')).toBeEnabled();
      await page.waitForTimeout(250);
      const setup = await page.evaluate(() => {
        const banner = document.querySelector('.sim-banner') as HTMLElement | null;
        if (banner) banner.style.display = 'none';
        const btns = [...document.querySelectorAll('main .btn.primary, main .btn.mega')] as HTMLElement[];
        const start = btns.find((b) => b.getBoundingClientRect().height > 0);
        return { over: document.scrollingElement!.scrollHeight - innerHeight, bottom: start ? start.getBoundingClientRect().bottom : 9999, h: innerHeight };
      });
      if (setup.over > 4 || setup.bottom > setup.h + 1) bad.push(`${route} setup: over ${setup.over}, start bottom ${Math.round(setup.bottom)}`);
      // Start and look at the play screen
      const start = page.locator('main .btn.primary, main .btn.mega').filter({ visible: true }).first();
      await start.click();
      await page.waitForTimeout(900);
      const play = await overflow(page);
      if (play > 4) bad.push(`${route} play: over ${play}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test(`game board fits one screen (${lang})`, async ({ page }) => {
    await seed(page, lang, 'jazz');
    await page.goto('about:blank');
    await page.goto(`/?sim=1&unlock=all&lang=${lang}#/gameboard`);
    await expect(page.locator('[data-screen="gameboard"]')).toBeVisible();
    await expect(page.locator('[data-board-game]')).toBeVisible();
    await expect(page.locator('.tier-row .tier-chip')).toHaveCount(6);
    expect(await overflow(page)).toBeLessThanOrEqual(4);
  });
}
