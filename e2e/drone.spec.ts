import { expect, test } from '@playwright/test';

test('Drone practice (simulator): the ladder fills as each degree is held in tune', async ({ page }) => {
  test.setTimeout(60_000);
  // 0.41: practice rooms live on the Path tab.
  await page.goto('/?sim=1#/path');
  await page.locator('[data-px="rooms"] > summary').click();
  await page.getByRole('button', { name: /Drone practice/ }).click();
  await page.getByRole('button', { name: /Start the drone/ }).click();
  await expect(page.locator('.drone-live.on')).toBeVisible();
  await expect(page.locator('.drone-ladder li.hit')).toHaveCount(7, { timeout: 30_000 });
  await expect(page.locator('.drone-done')).toBeVisible();
  await page.screenshot({ path: 'test-results/drone.png' });
  await page.getByRole('button', { name: /Stop/ }).click();
  await expect(page.locator('.drone-live.on')).toHaveCount(0);
});
