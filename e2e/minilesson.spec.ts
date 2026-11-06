import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

test('a unit opens with its mini-lesson; skip goes straight to practice; the collection lists every topic', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all&mini=1');
  await page.getByRole('button', { name: /Home, third, fifth/ }).click();
  await page.getByRole('button', { name: 'Use buttons instead' }).click();
  await expect(page.locator('[data-mini="degrees-135"]')).toBeVisible();
  await expect(page.locator('.mini-caption')).toContainText('home note');
  await page.screenshot({ path: 'test-results/mini-lesson.png' });
  await page.locator('[data-mini-skip]').click();
  await expect(page.locator('[data-mini]')).toHaveCount(0);
  await page.goto('/?sim=1&unlock=all&mini=1#/learned');
  await expect(page.getByRole('heading', { name: /Topics I learned/ })).toBeVisible();
  expect(await page.locator('[data-learned-card]').count()).toBeGreaterThan(60);
  await expect(page.locator('.learned-card.got')).toHaveCount(0); // skipped ≠ learned
});

test('hearing every step celebrates and adds the topic to the collection', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?sim=1&unlock=all&mini=1#/learned');
  await page.locator('[data-learned-card="degrees-135"]').click();
  await expect(page.locator('[data-mini-learned="degrees-135"]')).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: 'test-results/mini-learned.png' });
  await page.locator('[data-mini-go]').click();
  await expect(page.locator('.learned-card.got[data-learned-card="degrees-135"]')).toBeVisible();
});

test('music words are tappable chips; a skipped quick lesson does not come back', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all&mini=1');
  await page.getByRole('button', { name: /Home, third, fifth/ }).click();
  await page.getByRole('button', { name: 'Use buttons instead' }).click();
  await expect(page.locator('[data-mini="degrees-135"]')).toBeVisible();
  await page.locator('[data-mini-skip]').click(); // (pausing for chips is covered below)
  await expect(page.locator('[data-mini]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.locator('.paused-card').getByRole('button', { name: 'Exit' }).click();
  await page.getByRole('button', { name: /Home, third, fifth/ }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('[data-mini]')).toHaveCount(0);
  // The glossary in "Topics I learned": tap a word, read it in plain language.
  await page.goto('/?sim=1&unlock=all&mini=1#/learned');
  await page.locator('[data-glossary] [data-term="interval"]').click();
  await expect(page.locator('[data-term-card="interval"]')).toContainText('distance between two notes');
  // Inside a quick lesson, the step's words show as chips.
  await page.locator('[data-learned-card="degrees-135"]').click();
  await expect(page.locator('.mini-player .term-chip').first()).toBeVisible();
  await page.locator('.mini-player .term-chip').first().click();
  await expect(page.locator('.mini-player [data-term-card]')).toBeVisible();
});
