import { expect, test } from '@playwright/test';

test('first lesson of the day: streak screen, lit flame, streak sheet with calendar and shop', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  // Grey, breathing flame before practising today.
  await expect(page.locator('.streak-chip.todo .flame.cold')).toBeVisible();
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
  // Answer until the lesson ends (any answer; wrong ones are retried, then revealed).
  for (let i = 0; i < 240 && !(await page.locator('.streak-celebrate').isVisible()); i++) {
    const btn = page.locator('.answers .answer:not([disabled])').nth(i % 2);
    if (await btn.isVisible()) await btn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  const screen = page.locator('.streak-celebrate');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.getByRole('heading')).toHaveText('Streak extended!');
  await expect(screen.locator('.sc-count')).toHaveText('1');
  await page.screenshot({ path: 'test-results/streak-celebrate.png' });
  await screen.locator('.btn.mega').click();
  await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.streak-chip.done .flame.lit')).toBeVisible();
  await page.locator('.streak-chip').click();
  const sheet = page.getByRole('dialog', { name: 'Streak' });
  await expect(sheet).toContainText('1-day streak');
  await expect(sheet.locator('.streak-cal li.done.today')).toHaveCount(1);
  await expect(sheet.locator('.streak-facts')).toContainText('❄'); // the free weekly freeze
  await expect(sheet.getByRole('button', { name: /200/ })).toBeDisabled(); // not enough gems yet
  await page.waitForTimeout(400); // let the sheet finish sliding in
  await page.screenshot({ path: 'test-results/streak-sheet.png' });
});
