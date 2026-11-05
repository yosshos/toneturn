import { expect, test } from '@playwright/test';

test.describe('True or false?', () => {
  test('solo 60-second run: answer, score, best kept', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/');
    await page.getByRole('button', { name: /True or false\?/ }).click();
    await expect(page.getByText('No best score yet at this level.')).toBeVisible();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.tf-art')).toBeVisible();
    await expect(page.locator('.tf-art')).toContainText(/m2|M2|m3|M3|P4|♯4|♭5|P5|m6|M6|m7|M7/);
    await page.screenshot({ path: 'test-results/truefalse.png' });
    // Answer "true" every time until the run ends (wrong answers cost 2 s).
    for (let i = 0; i < 400 && !(await page.getByRole('heading', { name: 'Game over' }).isVisible()); i++) {
      const b = page.locator('.tf-true:not([disabled])');
      if (await b.isVisible()) await b.dispatchEvent('pointerdown');
      await page.waitForTimeout(250);
    }
    await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 70_000 });
    await expect(page.locator('.big-score b')).toHaveText(/^\d+(\.5)?$/);
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByText(/Best: \d/)).toBeVisible();
  });

  test('duel on one device: first right answer takes the round; 10 rounds', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.getByRole('button', { name: /True or false\?/ }).click();
    await page.getByRole('radio', { name: 'Duel on this device' }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.duel-half.p0.flip')).toBeVisible();
    for (let r = 0; r < 40 && !(await page.locator('main.recap').isVisible()); r++) {
      const t0 = page.locator('.duel-half.p0 [data-answer="true"]:not([disabled])');
      const f1 = page.locator('.duel-half.p1 [data-answer="false"]:not([disabled])');
      if (await t0.isVisible()) await t0.dispatchEvent('pointerdown');
      if (await f1.isVisible()) await f1.dispatchEvent('pointerdown');
      await page.waitForTimeout(1500);
    }
    await expect(page.locator('main.recap .board li')).toHaveCount(2, { timeout: 30_000 });
  });
});
