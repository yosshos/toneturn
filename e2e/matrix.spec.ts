import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

test('Note sequences (lesson 20, simulator): names ↔ degrees ↔ sound in sequences', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?sim=1&unlock=all');
  await page.getByRole('button', { name: /20\. Note sequences/ }).click();
  await page.getByRole('button', { name: 'Use my voice & start' }).click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.ask')).toContainText(/Which notes|which degrees/i, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 200_000 });
  await page.screenshot({ path: 'test-results/note-sequences-recap.png' });
  await expect(page.locator('.recap-row')).toHaveCount(5);
});

test('Note sequences in Buttons mode: note-name keypad', async ({ page }) => {
  await page.goto('/?unlock=all');
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.getByRole('button', { name: /20\. Note sequences/ }).click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.seq-key[data-note]')).toHaveCount(7, { timeout: 60_000 });
  await page.screenshot({ path: 'test-results/note-keypad.png' });
});
