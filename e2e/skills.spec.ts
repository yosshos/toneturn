import { expect, test } from '@playwright/test';

// Voice flows run in the labelled simulator (scripted answers: right, wrong, then right…).
test.describe('placement, Skill Map, review, weekly puzzle', () => {
  test.setTimeout(300_000);

  test('placement adapts, then the Skill Map shows measured skills and a recommendation; review appears', async ({ page }) => {
    await page.goto('/?sim=1');
    await expect(page.getByRole('button', { name: /Find my level/ })).toBeVisible();
    await page.getByRole('button', { name: /Find my level/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.intro-card')).toHaveCount(0); // no intro for placement
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 240_000 });
    await expect(page.locator('.recap-row')).toHaveCount(9);
    await page.getByRole('button', { name: /See my Skill Map/ }).click();

    await expect(page.getByRole('heading', { name: 'Skill Map', level: 1 })).toBeVisible();
    await expect(page.locator('.radar .dot.ev-provisional')).toHaveCount(3); // degrees, chords, cadences
    await expect(page.locator('.radar .dot.ev-unmeasured')).toHaveCount(9); // note naming, intervals, rhythm dictation, singing, rhythm reading, melodic memory, vocal agility, rhythmic memory, rhythmic precision
    await expect(page.locator('.radar .area')).toHaveCount(1);
    await expect(page.locator('.skill-list')).toContainText('provisional');
    await expect(page.locator('.skill-list')).toContainText('not measured yet');
    await expect(page.locator('.diag-panel')).toContainText('Recommended next');
    await page.screenshot({ path: 'test-results/skill-map.png', fullPage: true });

    // Selecting an axis from the accessible list opens its diagnosis.
    await page.getByRole('button', { name: /Cadences/ }).first().click();
    await expect(page.locator('.diag-panel h2')).toHaveText('Cadences');

    // The scripted miss went into the review queue.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('.tool-card').nth(1)).toContainText('1');
  });

  test('weekly puzzle: solve on the first try → gold, shown on the home screen', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('button', { name: /Weekly puzzle/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.ask')).toHaveText('Which degrees, in order?');
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: /Weekly puzzle/ })).toContainText('Gold this week');
  });

  test('weekly puzzle with the keypad (Buttons mode)', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: /Weekly puzzle/ }).click();
    await expect(page.locator('.seq-keys .seq-key')).toHaveCount(7, { timeout: 60_000 });
    const slots = await page.locator('.seq-slots .slot').count();
    expect(slots).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < slots; i++) await page.locator('.seq-key[data-degree="1"]').click();
    await expect(page.locator('.slot.filled')).toHaveCount(slots);
    await page.getByRole('button', { name: /Delete/ }).click();
    await expect(page.locator('.slot.filled')).toHaveCount(slots - 1);
    await page.locator('.seq-key[data-degree="1"]').click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    // All-ones is never the puzzle (no repeated neighbours) → a retry, not a medal yet.
    await expect(page.locator('.feedback')).toContainText(/Not quite/, { timeout: 30_000 });
  });

  test('Beat Echo setup offers tap-latency calibration', async ({ page }) => {
    await page.goto('/#/games');
    await page.getByRole('radio', { name: /Beat Echo/ }).click();
    await expect(page.getByRole('button', { name: /Calibrate tap timing/ })).toBeVisible();
    await expect(page.locator('.calibrate')).toContainText('Tap delay: 0 ms');
  });
});
