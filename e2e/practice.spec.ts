import { expect, test } from '@playwright/test';

// Practice tab (0.44): the hub (Songs, Technique, Games, Singing + tools) → the songbook, the games list and back;
// the menu in groups; a Progress area opens its sheet instead of playing.
test.describe('practice hub', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('hub cards, songbook, games list, tools back to Practice', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
    for (const k of ['songs', 'drills', 'games', 'tuner', 'metronome', 'drone']) await expect(page.locator(`[data-hub="${k}"]`)).toBeVisible();
    await page.locator('[data-hub="songs"]').click();
    await expect(page.locator('[data-drills="songs"]')).toBeVisible();
    await expect(page.locator('.song-drills li')).toHaveCount(16);
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('[data-hub="games"]').click();
    await expect(page.locator('.play-hero')).toBeVisible();
    await page.locator('.play-screen .screen-head .icon-btn').click();
    await page.locator('[data-hub="metronome"]').click();
    await expect(page.locator('[data-metro-play]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
  });

  test('menu groups and the Progress area sheet', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('.menu-group-h')).toHaveText(['Tools', 'Check yourself', 'You']);
    await page.locator('.menu-sheet .menu-head .icon-btn').click();
    await page.goto('/?sim=1#/skills');
    await page.locator('#ps-tab-overview').click();
    await page.locator('.domain-tile[data-domain="pitch"]').click();
    await expect(page.locator('[data-area-sheet="pitch"]')).toBeVisible();
    await expect(page.locator('[data-area-sheet] .as-skill').first()).toBeVisible();
  });
});
