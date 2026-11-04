import { expect, test } from '@playwright/test';

// Runs against the production build (vite preview), where the service worker is active.
test.use({ baseURL: 'http://localhost:4174' });

test('service worker installs, controls the page, and the app loads offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const version = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  expect(version).toBe(true);
  // Second load is controlled by the worker.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.hero')).toBeVisible();
  await context.setOffline(false);
});

test('menu offers "Check for updates" in the production build', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('button', { name: /^Menu/ }).click();
  const btn = page.getByRole('button', { name: 'Check for updates' });
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.getByText('You have the latest version')).toBeVisible({ timeout: 15_000 });
});
