import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

test.describe('riffs & runs', () => {
  test('Riffs & runs (simulator): name runs by voice, sing three back with a per-note contour', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/?sim=1&unlock=all#/path');
    await page.getByRole('button', { name: /15. Riffs & runs/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.run-contour')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.run-dot.ok').first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: 'test-results/runs-contour.png' });
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 150_000 });
    await expect(page.locator('.score-line')).toContainText('4/5');
  });

  test('Runs workshop card opens a slow → fast session', async ({ page }) => {
    await page.goto('/?sim=1');
    const card = page.getByRole('button', { name: /Runs workshop/ });
    await expect(card).toContainText('Level 1');
    await card.click();
    await page.getByRole('button', { name: /Use my voice & start|Buttons instead/ }).first().click();
    await expect(page.locator('.run-contour')).toBeVisible({ timeout: 60_000 });
  });
});
