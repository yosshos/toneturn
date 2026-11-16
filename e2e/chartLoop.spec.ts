import { expect, test, type Page } from '@playwright/test';

// COURSE-FEEDBACK-UI slice 3: the chart player's loop — pick a bar range (lilac hatching, not the lemon "now"), Play
// plays only those bars, Stop keeps the loop, the ✕ or a long press clears it. 320×720, English and Hebrew.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });
const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/s3-${name}.png` });
};
const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9' };
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

for (const lang of ['en', 'he'] as const)
  test(`chart player: loop bars 2–3, play inside the loop, Stop keeps it, ✕ / long press clear it (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&sim=1&lang=${lang}#/charts`);
    await page.locator('[data-chart-template]').first().click();
    const chart = page.locator('[data-chart-player] [data-chord-chart]');
    await expect(chart).toBeVisible();
    await page.locator('[data-chart-loop-pick]').click();
    await expect(page.locator('[data-chart-loop-state="pick"]')).toBeVisible();
    await chart.locator('.cc-bar[data-bar="1"]').click();
    await chart.locator('.cc-bar[data-bar="2"]').click();
    await expect(chart).toHaveAttribute('data-chart-loop', '2-3');
    await expect(chart.locator('.cc-bar.loop')).toHaveCount(2);
    // hatching, not lemon
    const bg = await chart.locator('.cc-bar.loop').first().evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgb(255, 212, 59)');
    if (lang === 'he') await expect(page.locator('.ch-loop-on bdi')).toHaveText('2–3');
    await chart.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await shot(page, `chart-loop-${lang}`);
    await page.locator('[data-chart-play]').click();
    const nowBar = chart.locator('.cc-bar.now');
    await expect(nowBar).toBeVisible({ timeout: 15_000 });
    for (let k = 0; k < 6; k++) {
      const b = Number(await nowBar.getAttribute('data-bar'));
      expect([1, 2]).toContain(b);
      await page.waitForTimeout(400);
    }
    await shot(page, `chart-loop-playing-${lang}`);
    await page.locator('[data-chart-stop]').click();
    await expect(chart.locator('.cc-bar.loop')).toHaveCount(2);
    await expect(page.locator('[data-chart-loop-state="on"]')).toBeVisible();
    await page.locator('[data-chart-loop-clear]').click();
    await expect(chart.locator('.cc-bar.loop')).toHaveCount(0);
    // a long press on the chart clears a loop too
    await page.locator('[data-chart-loop-pick]').click();
    await chart.locator('.cc-bar[data-bar="0"]').click();
    await chart.locator('.cc-bar[data-bar="0"]').click();
    await expect(chart.locator('.cc-bar.loop')).toHaveCount(1);
    const box = (await chart.locator('.cc-bar[data-bar="1"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await expect(chart.locator('.cc-bar.loop')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
