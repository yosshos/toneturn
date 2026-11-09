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
    // Friends live in the Community tab since 0.45 (no longer in the menu).
    await sheet.locator('.menu-head .menu-close').click();
    await page.locator('.tab[data-tab="friends"]').click();
    await expect(page.getByRole('heading', { name: 'Community', level: 1 })).toBeVisible();
  });

  test('community screen asks to sign in when signed out', async ({ page }) => {
    await page.goto('/#/friends');
    await expect(page.getByRole('heading', { name: 'Community', level: 1 })).toBeVisible();
    await expect(page.getByText('Add friends with their code')).toBeVisible();
  });

  test("what's new: a gift with a dot after an update, seen once opened", async ({ page }) => {
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
    // 0.37: no card on Home — a gift with a dot; opening it marks the version seen. 0.61: on a phone the gift sits
    // in the menu, and the menu button carries the dot.
    await expect(page.locator('.news-card')).toHaveCount(0);
    await expect(page.locator('.menu-btn.has-dot')).toBeVisible();
    await page.getByRole('button', { name: 'Menu' }).click();
    const gift = page.locator('.menu-sheet .gift-btn');
    await expect(gift).toHaveClass(/unseen/);
    await expect(page.locator('.menu-sheet .gift-dot')).toBeVisible();
    await gift.click();
    const pop = page.locator('.gift-pop');
    await expect(pop).toContainText(APP_LATEST);
    await pop.getByRole('button', { name: /All changes/ }).click();
    for (const v of RECENT) await expect(pop).toContainText(v);
    await expect(page.locator('.gift-dot')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.menu-btn')).not.toHaveClass(/has-dot/);
    await expect(page.locator('.gift-dot')).toHaveCount(0);
  });
});
