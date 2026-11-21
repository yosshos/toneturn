import { expect, test } from '@playwright/test';
test('piano: overview radar and skill map show the course sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: 'en', inputLang: 'en', outputLang: 'en', mode: 'buttons', voiceConsent: true, headphones: true, micLatencyMs: 60, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9' };
    await new Promise((res, rej) => {
      const r = indexedDB.open('toneturn', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(progress, 'progress'); tx.objectStore('kv').put(settings, 'settings'); tx.oncomplete = res; tx.onerror = rej; };
      r.onerror = rej;
    });
  });
  await page.goto('/#/skills');
  await expect(page.locator('.ov-dyn')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.ov-radar')).toHaveCount(0); // the map lives on Skills only (owner 2026-11-21)
  await page.screenshot({ path: 'test-results/overview-keys.png', fullPage: true });
  await page.getByRole('tab', { name: /Skills/ }).click();
  await expect(page.locator('[data-skillmap-course="keys"]')).toBeVisible();
  await expect(page.locator('[data-section="time"]')).toBeVisible();
  await page.locator('[data-axis="time"]').click();
  await expect(page.locator('[data-section="time"]')).toHaveAttribute('open', '');
  await page.screenshot({ path: 'test-results/skillmap-keys.png', fullPage: true });
  await page.locator('[data-axis="technique"]').click();
  await page.locator('[data-section="technique"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/skillmap-open.png' });
});
