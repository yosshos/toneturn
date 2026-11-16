import { expect, test } from '@playwright/test';

test('first lesson of the day: streak screen, lit flame, streak sheet with calendar and shop', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  // Grey, breathing flame before practising today.
  await expect(page.locator('.streak-chip.todo .flame.cold')).toBeVisible();
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
  // Answer until the lesson ends (any answer; wrong ones are retried, then revealed).
  for (let i = 0; i < 240 && !(await page.locator('main.recap').isVisible()); i++) {
    // 0.50.2: a wrong final answer waits for Continue
    if (await page.locator('[data-continue]').isVisible()) await page.locator('[data-continue]').click().catch(() => {});
    const btn = page.locator('.answers .answer:not([disabled])').nth(i % 2);
    if (await btn.isVisible()) await btn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  // Slice 7 (COURSE-FEEDBACK-UI §4.6): the recap comes first; the day's streak is a sheet once the recap is left.
  await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-streak-sheet]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home' }).click();
  const screen = page.locator('[data-streak-sheet]');
  await expect(screen).toBeVisible({ timeout: 10_000 });
  await expect(screen.getByRole('heading')).toHaveText('Streak extended');
  await expect(screen.locator('.sa-count')).toHaveText('1');
  await page.screenshot({ path: 'test-results/streak-celebrate.png' });
  await screen.locator('[data-streak-continue]').click();
  await expect(page.locator('.streak-chip.done .flame.lit')).toBeVisible();
  await page.locator('.streak-chip').click();
  const sheet = page.getByRole('dialog', { name: 'Streak' });
  await expect(sheet).toContainText('1-day streak');
  await expect(sheet.locator('.streak-cal li.done.today')).toHaveCount(1);
  await expect(sheet.locator('.streak-facts .ico-snow').first()).toBeVisible(); // the free weekly freeze
  await expect(sheet.getByRole('button', { name: /200/ })).toBeDisabled(); // not enough gems yet
  await page.waitForTimeout(400); // let the sheet finish sliding in
  await page.screenshot({ path: 'test-results/streak-sheet.png' });
});
