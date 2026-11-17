import { expect, test } from '@playwright/test';

// The opening animation (studio look, src/ui/brand/Splash.tsx): first open of the day only; a tap skips it.
// Playwright sets navigator.webdriver, so the test opts in with ?splash=force (that overrides only the webdriver rule).
test('studio splash: shows once a day, a tap skips it, not again on reload', async ({ page }) => {
  await page.goto('/?nosplash');
  await page.evaluate(() => localStorage.removeItem('tt.splash.day'));

  await page.goto('/?look=studio&splash=force&lang=en');
  const splash = page.locator('[data-brand-splash]');
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute('role', 'img');
  await expect(splash).toHaveAttribute('aria-label', /The 7th Sense/);
  await expect(splash.locator('.bsp-sg')).toContainText('Hear. Understand. Perform.');
  // The old opening never shows with the studio look.
  await expect(page.locator('[data-splash]')).toHaveCount(0);
  await splash.click();
  await expect(splash).toHaveCount(0, { timeout: 1500 });
  // The app was there underneath all along.
  await expect(page.locator('.app').first()).toBeVisible();

  await page.reload();
  await page.waitForTimeout(400);
  await expect(splash).toHaveCount(0);
});

test('studio splash: ends by itself within 2.5 s; never for a deep link or without force', async ({ page }) => {
  await page.goto('/?nosplash');
  await page.evaluate(() => localStorage.removeItem('tt.splash.day'));
  await page.goto('/?look=studio&splash=force');
  const splash = page.locator('[data-brand-splash]');
  await expect(splash).toBeVisible();
  const t0 = Date.now();
  await expect(splash).toHaveCount(0, { timeout: 3000 });
  expect(Date.now() - t0).toBeLessThan(2700);

  await page.evaluate(() => localStorage.removeItem('tt.splash.day'));
  await page.goto('/?look=studio&splash=force#/path');
  await page.waitForTimeout(400);
  await expect(splash).toHaveCount(0);
  await page.goto('/?look=studio');
  await page.waitForTimeout(400);
  await expect(splash).toHaveCount(0);
});
