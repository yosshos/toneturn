import { expect, test } from '@playwright/test';

// The player profile (SPEC-AI §8): a recurring confusion pair shows with its week streak; an empty device says it is
// still building.
async function seed(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const put = (db: string, store: string, key: string, value: unknown) =>
      new Promise<void>((res, rej) => {
        const r = indexedDB.open(db, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(store);
        r.onsuccess = () => {
          const tx = r.result.transaction(store, 'readwrite');
          tx.objectStore(store).put(value, key);
          tx.oncomplete = () => (r.result.close(), res());
          tx.onerror = () => rej(tx.error);
        };
        r.onerror = () => rej(r.error);
      });
    const now = new Date().toISOString();
    await put('toneturn-confusion', 'confusion', 'map', {
      'iv-asc|M6|m7': { topic: 'iv-asc', gen: { id: 'basics-highlow', level: 1 }, right: { en: 'M6', he: 'סקסטה גדולה' }, given: { en: 'm7', he: 'ספטימה קטנה' }, n: 7, last: now },
    });
    const week = (d: Date) => {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = (t.getUTCDay() + 6) % 7;
      t.setUTCDate(t.getUTCDate() - day + 3);
      const y = t.getUTCFullYear();
      const first = new Date(Date.UTC(y, 0, 4));
      const wk = 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
      return `${y}-W${String(wk).padStart(2, '0')}`;
    };
    const ago = (days: number) => new Date(Date.now() - days * 86400000);
    const text = { en: 'You mix up M6 and m7', he: 'מתבלבלים' };
    await put('toneturn-profile', 'history', 'history', {
      v: 1,
      snaps: [14, 7].map((d) => ({ week: week(ago(d)), takes: 0, taps: 0, misses: 3, items: { 'c:iv-asc|M6|m7': text } })),
    });
  });
}

test('profile: building on a new device, a recurring pair with its streak', async ({ page }) => {
  await page.goto('/?sim=1#/insights');
  await expect(page.locator('[data-profile]')).toBeVisible();
  await expect(page.locator('[data-profile-pattern]')).toHaveCount(0);
  await seed(page);
  await page.reload();
  const row = page.locator('[data-profile-pattern="c:iv-asc|M6|m7"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-weeks', '3');
  await row.locator('button').click();
  // It opens that practice (the voice-answers gate comes first on a new device).
  await expect(page.getByRole('dialog')).toBeVisible();
});
