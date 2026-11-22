import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 2 ("one today"): the workout's technique block and the technique screen's button are one
// plan — the screen says "part of today's workout", its keys carry a mark, the block shows why it is there.
test.describe.configure({ timeout: 150_000 });

const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function seedKeys(page: Page, lang: 'en' | 'he' = 'en') {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ([lang, today]) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = {
        version: 2,
        uiLang: lang,
        inputLang: lang,
        outputLang: lang,
        mode: 'buttons',
        voiceConsent: true,
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', 'keys'],
        activeCourse: 'keys',
        seenVersion: '9.9.9',
        workoutToday: { day: today, blocks: [{ id: 'path-1', target: { kind: 'path' }, minutes: 6 }, { id: 'keys-1', target: { kind: 'keys' }, minutes: 17 }, { id: 'improv-1', target: { kind: 'improv', mode: 'improv' }, minutes: 7 }] },
      };
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
    [lang, day()] as const,
  );
}

test('the technique screen runs today’s plan: "part of today’s workout", marked keys, the coach', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedKeys(page);
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  const run = page.locator('[data-key-today-run]');
  await expect(run).toBeVisible({ timeout: 45_000 });
  await expect(run).toHaveAttribute('data-today-part', '1');
  await expect(run).toContainText("Part of today's workout");
  await expect(run).toContainText('in the key of the week');
  // the keys of today's cells carry a small mark; the key of the week is one of them
  await expect(page.locator('.key-card[data-today]').first()).toBeVisible();
  await expect(page.locator('.key-card.week[data-today]')).toHaveCount(1);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(391);
  await page.screenshot({ path: 'test-results/one-today-keys.png' });
  // the key of the week's page says so too
  await page.locator('.key-card.week').click();
  await expect(page.locator('[data-kp-today]')).toBeVisible();
  await page.locator('.screen-head .icon-btn').first().click();
  await run.click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
});

test('today’s workout lists the technique block with its reason and the key of the week (Hebrew, phone)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await seedKeys(page, 'he');
  // the technique screen once (it picks the key of the week), then Today
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await expect(page.locator('[data-key-today-run]')).toBeVisible({ timeout: 45_000 });
  await page.goto('/?unlock=all#/workout');
  const keys = page.locator('.wk-block[data-block="keys"]');
  await expect(keys).toBeVisible();
  await expect(keys.locator('[data-why="strengthen"]')).toHaveText('צריך חיזוק');
  await expect(keys).toContainText('סולם השבוע');
  await expect(page.locator('.wk-block[data-block="path"] [data-why="path"]')).toHaveText('חדש מהמסלול');
  await expect(page.locator('.wk-block[data-block="improv"] [data-why="week"]')).toBeVisible();
  // the window goes to 180 minutes
  await page.locator('.wk-chips .chip', { hasText: /^180′$/ }).click();
  await expect(page.locator('.wk-stepper b')).toContainText('180');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(376);
  await page.screenshot({ path: 'test-results/one-today-editor-he.png' });
});
