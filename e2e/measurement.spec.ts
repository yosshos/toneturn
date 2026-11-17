import { expect, test, type Page } from '@playwright/test';

const seed = async (page: Page, lang: 'en' | 'he', plays: 'keys') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', drills };
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
    { lang, plays },
  );
};

// MEASUREMENT-AUDIT §7: the new control levels (dynamics as shapes, soft at speed) fit one phone screen at 320×720 in
// Hebrew and English, and a synthesized take (the real analysis on velocities and releases) shows the touch lines in
// the review's "Why?" sheet with a "Why?" on the misses. E2E_BASE: a worktree's own vite.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const openLevel = async (page: Page, lang: 'en' | 'he', level: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="control"]').click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};
const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

for (const lang of ['en', 'he'] as const) {
  for (const level of ['control-4', 'control-13', 'control-14', 'control-15', 'control-16'])
    test(`${level} fits one screen (${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, 'keys');
      await openLevel(page, lang, level);
      await expect.poll(() => page.locator('.drill-staff .vf-notehead').count(), { timeout: 15_000 }).toBeGreaterThan(0);
      const o = await overflow(page);
      expect(o.wide).toBeLessThanOrEqual(1);
      expect(o.tall, 'run screen taller than the phone').toBeLessThanOrEqual(2);
    });

  test(`a take on a shaped scale shows the touch lines, a Why? on misses, one screen (${lang})`, async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
    await seed(page, lang, 'keys');
    await openLevel(page, lang, 'control-14');
    await expect.poll(() => page.locator('.drill-staff .vf-notehead').count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const speaker = page.locator('[data-drums-choice="speaker"]');
    if (await speaker.isVisible().catch(() => false)) await speaker.click();
    await page.locator('[data-drill-play], [data-rubato-play]').first().click();
    await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
    expect((await overflow(page)).tall, 'review taller than the screen').toBeLessThanOrEqual(2);
    await page.locator('[data-why]').first().click();
    const lines = page.locator('[data-touch-lines]');
    await expect(lines).toBeVisible();
    const miss = lines.locator('[data-touch-ok="0"]').first();
    await expect(miss).toBeVisible();
    await miss.locator('[data-touch-why]').click();
    await expect(miss.locator('.tl-why-text')).toBeVisible();
    // no Why? on a line that passed
    expect(await lines.locator('[data-touch-ok="1"] [data-touch-why]').count()).toBe(0);
  });
}
