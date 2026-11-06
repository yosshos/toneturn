import { expect, test } from '@playwright/test';

// Avatar studio (phase 1 showcase): two modular 3D avatars, outfits by part, items, emotes.
test.describe('avatar studio', () => {
  test('loads two avatars; mix outfits, try items, play emotes, save', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/');
    await page.locator('.studio-card').click();
    await expect(page.getByRole('heading', { name: 'Avatar studio', level: 1 })).toBeVisible();
    await expect(page.locator('.avatar-stage canvas')).toBeVisible();
    // Loaded: the loading line disappears and emote buttons enable.
    await expect(page.locator('.stage-msg')).toHaveCount(0, { timeout: 30_000 });

    // Look: change the top of avatar 1, then switch to avatar 2.
    await page.locator('[data-slot="body"][data-outfit="Suit"]').click();
    await expect(page.locator('[data-slot="body"][data-outfit="Suit"]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('radio', { name: 'Coda' }).click();
    await expect(page.locator('[data-slot="body"][data-outfit="Casual_Hoodie"]')).toHaveCount(0); // her outfits differ

    // Items: try on the guitar (legendary, priced in XP).
    await page.getByRole('tab', { name: 'Items' }).click();
    const guitar = page.locator('[data-item="guitar"]');
    await expect(guitar).toContainText('8,000 XP');
    await guitar.click();
    await expect(guitar).toHaveAttribute('aria-pressed', 'true');

    // Emotes: play one, and jam together.
    await page.getByRole('tab', { name: 'Emotes' }).click();
    await page.locator('[data-emote="dance"]').click();
    await page.locator('[data-emote="jam"]').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/studio.png' });

    await page.getByRole('button', { name: 'Save my looks' }).click();
    await expect(page.locator('.studio-card')).toBeVisible();
    // Saved looks come back.
    await page.locator('.studio-card').click();
    await expect(page.locator('[data-slot="body"][data-outfit="Suit"]')).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
});
