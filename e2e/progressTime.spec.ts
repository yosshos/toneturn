import { expect, test } from '@playwright/test';

// SPEC-PROGRESS-CHARTS §2: the "Over time" tab on the Progress page, from seeded daily snapshots.
async function seed(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const days: Record<string, unknown> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const k = 29 - i;
      days[day] = {
        day,
        status: { 'keys:technique': { closed: Math.floor(k / 2), learning: 6, almost: 3 }, 'keys:harmony': { closed: Math.floor(k / 4), learning: 4 }, 'keys:improv': { closed: Math.floor(k / 6), learning: 3 } },
        tempo: { 'keys:technique': 0.55 + k * 0.012, 'keys:harmony': 0.5 + k * 0.006 },
        minutes: k % 7 === 6 ? {} : { technique: 22, improv: 9, repertoire: 6, ear: 4 },
        channels: { ear: 0.82, reading: 0.3 + k * 0.008 },
        keys: { 0: Math.min(1, k / 20), 7: Math.min(1, k / 30), 2: k / 60, 9: 0.1 },
        vocab: { played: 3, closed: 1 },
        practised: k % 7 !== 6,
      };
    }
    const req = indexedDB.open('toneturn-snapshots', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => req.result.transaction('kv', 'readwrite').objectStore('kv').put({ v: 1, backfilled: true, days }, 'all');
  });
}

for (const [w, h, name] of [[390, 844, 'phone'], [1280, 900, 'wide']] as const)
  test(`progress over time (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await seed(page);
    await page.goto('/?unlock=all&lang=he#/skills');
    await page.locator('#ps-tab-time').click();
    await expect(page.locator('[data-progress-time="30d"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-tile="minutes"]')).toBeVisible();
    await expect(page.locator('.pt-multiple').first()).toBeVisible();
    await page.screenshot({ path: `test-results/progress-time-${name}.png`, fullPage: true });
    await page.locator('[data-table-toggle]').first().click();
    await expect(page.locator('.pt-table').first()).toBeVisible();
  });
