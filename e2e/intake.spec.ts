import { expect, test } from '@playwright/test';

// The intake questionnaire: a non-musician who ranks rhythm first and singing last gets a rhythm-first path.
test.describe('intake questionnaire', () => {
  test.use({ viewport: { width: 375, height: 760 } });

  test('answers, ranking and range shape the path; Hebrew fits a phone', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?sim=1&intake=1&lang=he');
    await expect(page.locator('main.intake[data-step="hello"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/intake-1-hello.png' });
    await page.locator('.intake .btn.mega').click();
    // music · singing · theory · reading: the first answer of each (a curious listener)
    for (const step of ['music', 'singing', 'theory', 'reading']) {
      await expect(page.locator(`main.intake[data-step="${step}"]`)).toBeVisible();
      if (step === 'theory') await page.screenshot({ path: 'test-results/intake-2-question.png' });
      await page.locator('.intake-opt[data-v="0"]').click();
    }
    await expect(page.locator('main.intake[data-step="plays"]')).toBeVisible();
    await page.locator('[data-play="none"]').click();
    await page.locator('.intake .btn.mega').click();
    await page.locator('.intake-opt[data-v="solfege"]').click();
    // ranking: rhythm, hearing, memory, reading, singing
    await expect(page.locator('main.intake[data-step="rank"]')).toBeVisible();
    for (const a of ['time', 'pitch', 'memory', 'reading', 'voice']) await page.locator(`[data-area="${a}"]`).click();
    await expect(page.locator('[data-area="time"] .rank-n')).toHaveText('1');
    await expect(page.locator('[data-area="voice"] .rank-n')).toHaveText('5');
    await page.screenshot({ path: 'test-results/intake-3-rank.png' });
    await page.locator('.intake-row .btn.mega').click();
    await page.locator('.intake-opt[data-v="learn"]').click();
    await page.locator('.intake-opt[data-v="5"]').click();
    // range: a gentle siren (the simulator sings C3 → C5)
    await expect(page.locator('main.intake[data-step="range"]')).toBeVisible();
    await expect(page.locator('.safety')).toBeVisible();
    await page.locator('[data-range-start]').click();
    await expect(page.locator('[data-range]')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/intake-4-range.png' });
    await page.locator('[data-range-keep]').click();
    // the plan: a curious listener starts with the basics; the path starts with rhythm
    await expect(page.locator('main.intake[data-step="plan"]')).toBeVisible();
    await expect(page.locator('.plan-facts')).toContainText('קצב');
    await page.screenshot({ path: 'test-results/intake-5-plan.png' });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(375);
    await page.locator('[data-plan="home"]').click();
    // Home: the path follows the order (rhythm first); the hero offers the basics first.
    await expect(page.locator('.first-run-cta')).toContainText('להתחיל מהבסיס');
    await page.locator('.tab[data-tab="path"]').click();
    await expect(page.locator('.road .node').first()).toContainText(/קצב|פעמה/);
    // Settings: take it again
    await page.goto('/?sim=1&lang=he#/settings');
    await expect(page.locator('[data-intake-retake]')).toBeVisible();
  });

  test('skippable: "later" goes home and does not come back', async ({ page }) => {
    // Not the simulator: its settings live in memory only, and this checks they persist.
    await page.goto('/?intake=1');
    await page.locator('[data-intake-skip]').click();
    await expect(page.locator('main.intake')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('main.intake')).toHaveCount(0);
  });
});
