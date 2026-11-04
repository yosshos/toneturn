import { expect, test } from '@playwright/test';

async function playRun(page: import('@playwright/test').Page) {
  for (let r = 0; r < 5; r++) {
    await expect(page.locator('main.tournament.stage-answering')).toBeVisible({ timeout: 30_000 });
    await page.locator('.duel-half.p0 .answer').first().dispatchEvent('pointerdown');
    await expect(page.locator('main.tournament.stage-reveal, main.recap')).toBeVisible({ timeout: 20_000 });
  }
  await expect(page.locator('main.recap.scoreboard')).toBeVisible({ timeout: 30_000 });
}

test('Ghost race: the first run sets the ghost, the next run races it', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Race your ghost/ }).click();
  await expect(page.getByText(/No ghost yet/)).toBeVisible();
  await page.getByRole('button', { name: /Set your ghost/ }).click();
  await playRun(page);
  await expect(page.locator('.ghost-note')).toContainText('now your ghost');
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByText(/Ghost to beat/)).toBeVisible();
  await page.getByRole('button', { name: /Race the ghost/ }).click();
  await expect(page.locator('.ghost-bar')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: 'test-results/ghost-race.png' });
  await playRun(page);
  await expect(page.locator('.board li')).toHaveCount(2);
  await expect(page.locator('.ghost-note')).toBeVisible();
});
