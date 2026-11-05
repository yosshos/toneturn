import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string };

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
    await expect(news).toContainText('0.25.0');
    await expect(news).toContainText('0.24.0');
    await expect(news).toContainText('0.23.0');
    await expect(news).toContainText('0.22.0');
    await expect(news).toContainText('0.21.0');
    await expect(news).toContainText('0.20.0');
    await expect(news).toContainText('0.19.0');
    await expect(news).toContainText('0.18.0');
    await expect(news).toContainText('0.17.0');
    await expect(news).toContainText('0.16.0');
    await expect(news).toContainText('0.15.0');
    await expect(news).toContainText('0.14.0');
    await expect(news).toContainText('0.13.0');
    await expect(news).toContainText('0.12.0');
    await expect(news).toContainText('0.11.0');
    await expect(news).toContainText('0.10.0');
    await expect(news).toContainText('0.9.0');
    await expect(news).toContainText('0.8.0');
    await expect(news).toContainText('0.7.1');
    await expect(news).toContainText('0.7.0');
    await expect(news).toContainText('0.6.0');
    await expect(news).toContainText('0.5.0');
    await expect(news).toContainText('0.4.0');
    await expect(news).not.toContainText('0.3.0');
    await news.getByRole('button').click();
    await expect(news).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.news-card')).toHaveCount(0);
  });
});
