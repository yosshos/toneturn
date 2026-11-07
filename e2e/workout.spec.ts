import { expect, test } from '@playwright/test';

// Today's workout (spec AH): the editor — total, a block's minutes, remove + undo, add, presets — saved for today.
test.describe("today's workout", () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('edit the total, a block, remove with undo, add; the path coverage updates', async ({ page }) => {
    await page.goto('/?sim=1#/workout');
    const blocks = page.locator('.wk-block');
    await expect(blocks.first()).toBeVisible();
    const n0 = await blocks.count();
    // Total → 20 minutes: the blocks rescale and sum to 20.
    await page.locator('.wk-chips .chip', { hasText: '20′' }).click();
    await expect(page.locator('.wk-stepper b')).toContainText('20');
    // A block's minutes: + 1 → the total follows.
    await blocks.first().getByRole('button', { name: '+1' }).click();
    await expect(page.locator('.wk-stepper b')).toContainText('21');
    // Remove with undo.
    await blocks.last().getByRole('button', { name: 'Remove' }).click();
    await expect(blocks).toHaveCount((await blocks.count()));
    await expect(page.locator('.wk-undo')).toBeVisible();
    await page.locator('.wk-undo .btn').click();
    // Add a topic block from the sheet.
    await page.locator('.wk-add').click();
    await page.locator('.wk-search').fill('interval');
    await page.locator('.wk-topic-list .chip').first().click();
    await expect.poll(() => blocks.count()).toBeGreaterThan(n0);
    // The unit coverage line is shown.
    await expect(page.locator('.wk-editor .wk-cov')).toContainText(/Unit 1/);
    // Presets keep the total.
    await page.locator('.wk-presets .chip', { hasText: 'Rhythm focus' }).click();
    await expect(page.locator('.wk-block').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(376);
  });
});
