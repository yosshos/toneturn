import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string };

import { CHANGELOG } from '../src/version';
const APP_LATEST = CHANGELOG[0].version;
const RECENT = CHANGELOG.slice(0, 3).map((c) => c.version);

test.describe('menu, friends', () => {
  test('menu shows version, what’s new, notifications and links', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Menu/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.version-line')).toContainText(pkg.version);
    await expect(sheet.getByRole('heading', { name: /Notifications/ })).toBeVisible();
    // What's new in the latest version sits in the menu; install / update moved to the header.
    await expect(sheet.getByRole('heading', { name: /What’s new in/ })).toContainText(pkg.version);
    await expect(sheet.locator('.changelog.bare > li')).toHaveCount(1);
    await sheet.getByRole('button', { name: 'All versions' }).click();
    await expect(sheet.locator('.changelog:not(.bare) > li').first()).toBeVisible();
    await sheet.getByRole('button', { name: /Friends/ }).click();
    await expect(page.getByRole('heading', { name: 'Friends', level: 1 })).toBeVisible();
  });

  test('friends screen asks to sign in when signed out', async ({ page }) => {
    await page.goto('/#/friends');
    await expect(page.getByRole('heading', { name: 'Friends', level: 1 })).toBeVisible();
    await expect(page.getByText('Add friends with their code')).toBeVisible();
  });

  test("what's new appears once after an update and can be dismissed", async ({ page }) => {
    await page.goto('/');
    // A fresh install stores the current version as seen; wait for that write so it cannot land after ours.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<string | null>((resolve) => {
              const req = indexedDB.open('toneturn', 1);
              // Never create the database before the app does.
              req.onupgradeneeded = () => req.transaction?.abort();
              req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('kv')) return resolve(null);
                const g = db.transaction('kv').objectStore('kv').get('settings');
                g.onsuccess = () => resolve(g.result?.seenVersion ?? null);
                g.onerror = () => resolve(null);
              };
              req.onerror = () => resolve(null);
            }),
        ),
      )
      .not.toBeNull();
    // Pretend the player last saw 0.3.0.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('toneturn', 1);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('kv', 'readwrite');
            const st = tx.objectStore('kv');
            const g = st.get('settings');
            g.onsuccess = () => {
              st.put({ ...(g.result ?? { version: 2 }), version: 2, seenVersion: '0.3.0' }, 'settings');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
          req.onerror = () => reject(req.error);
        }),
    );
    await page.reload();
    const news = page.locator('.news-card');
    await expect(news).toBeVisible();
    // Compact (home polish): the latest headline; "More" opens the last three versions.
    await expect(news).toContainText(APP_LATEST);
    await news.getByRole('button', { name: /More of what's new/ }).click();
    for (const v of RECENT) await expect(news).toContainText(v);
    await expect(news).not.toContainText('0.3.0');
    await news.locator('.news-head .icon-btn').click();
    await expect(news).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.news-card')).toHaveCount(0);
  });
});
