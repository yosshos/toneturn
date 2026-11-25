import { expect, test } from '@playwright/test';

// Owner 2026-11-25: a family card whose page holds nothing beyond its levels starts practice at once — the coach's
// intro (the brief), then the takes. A small button beside the card still opens the levels. A family with its own
// extra content (a quick lesson, a reharm studio, a tune ladder) keeps opening its page.
test.describe.configure({ timeout: 90_000 });

for (const lang of ['en', 'he'] as const) {
  test(`family card starts practice; the small button opens the levels (${lang})`, async ({ page }) => {
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    const card = page.locator('[data-family="scales"]');
    await expect(card).toHaveAttribute('data-family-direct', '1');
    await card.click();
    await expect(page.locator('[data-coach-intro]')).toBeVisible();
    await expect(page.locator('[data-drills="family"]')).toHaveCount(0);
    // Back returns to the technique hub, where the levels button opens the family page
    await page.goBack().catch(() => {});
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.locator('[data-family-levels="scales"]').click();
    await expect(page.locator('[data-drills="family"]')).toBeVisible();
    await expect(page.locator('[data-coach-open="scales"]')).toBeVisible();
  });
}

test('a family with its own extra content still opens its page', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-topic="all"]').click().catch(() => {});
  const tune = page.locator('[data-family="k-tune"]');
  if (await tune.count()) {
    await expect(tune).not.toHaveAttribute('data-family-direct', '1');
    await tune.click();
    await expect(page.locator('[data-drills="family"]')).toBeVisible();
  }
});
