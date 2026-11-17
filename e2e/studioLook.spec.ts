import { expect, test, type Page } from '@playwright/test';

// The studio look (redesign, src/studio*.css) is the only look (owner 2026-11-17: the classic look is gone). Home and
// an exercise's gate page render in it with nothing sticking out sideways at 320 px; the main action keeps its hard
// shadow while the cards go flat. The old switch (?look=classic, the Settings row "Previous look") no longer exists.

test.use({ viewport: { width: 320, height: 720 } });

const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const tabbarBg = (page: Page) => page.locator('.tabbar').evaluate((el) => getComputedStyle(el).backgroundColor);

test('one look: ?look=classic and an old stored tt.look change nothing', async ({ page }) => {
  await page.goto('/?sim=1');
  await expect(page.locator('.tabbar')).toBeVisible();
  const studioBar = await tabbarBg(page);
  expect(studioBar).toBe('rgb(255, 255, 255)');
  await page.evaluate(() => localStorage.setItem('tt.look', 'classic'));
  await page.goto('/?sim=1&look=classic');
  await expect(page.locator('.tabbar')).toBeVisible();
  expect(await tabbarBg(page)).toBe(studioBar);
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-look'))).toBe(false);
});

/** A returning player (onboarding done), so a topic link opens its gate page. */
const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [{ sessionId: 'seed-1', lessonId: 'bflat-two-homes', lessonVersion: 1, firstTry: 3, total: 3, xp: 10, missed: [], completedAt: new Date(Date.now() - 86_400_000).toISOString() }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear'], activeCourse: 'ear', seenVersion: '9.9.9' };
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
  }, lang);
};

for (const lang of ['en', 'he'] as const) {
  test(`home and a lesson gate render in the studio look at 320 px (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?lang=${lang}&brief=1&unlock=all#/topic/basics-highlow/1`);
    await expect(page.locator('[data-brief]')).toBeVisible();
    const play = page.locator('.ex-play');
    await expect(play).toBeVisible();
    // the Play button is the main action: it keeps the one hard shadow
    expect(await play.evaluate((el) => getComputedStyle(el).filter)).toMatch(/drop-shadow/);
    expect(await overflowX(page)).toBeLessThanOrEqual(1);

    // home
    await page.goto(`/?lang=${lang}`);
    await expect(page.locator('.tabbar')).toBeVisible();
    // the bottom bar is a white surface, not the old ink pill
    expect(await tabbarBg(page)).toBe('rgb(255, 255, 255)');
    expect(await overflowX(page)).toBeLessThanOrEqual(1);
  });
}

test('Settings has no "Previous look" row', async ({ page }) => {
  await page.goto('/?sim=1&lang=en#/settings');
  const display = page.locator('.set-sec', { hasText: 'Display' }).first();
  if (await display.isVisible()) await display.click();
  await expect(page.getByText('Reduce motion', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Previous look')).toHaveCount(0);
});
