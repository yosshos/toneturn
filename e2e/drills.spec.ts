import { expect, test } from '@playwright/test';

// Technique drills (spec AI): hub → family → level heat map → a run; the drill creator saves a drill to "My drills";
// drill settings persist; the Badges tab renders.
test.describe('technique drills', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('hub, family levels, a run, settings and the creator', async ({ page }) => {
    await page.goto('/?sim=1#/drills');
    await expect(page.locator('[data-drills="hub"]')).toBeVisible();
    await expect(page.locator('.drill-today .drill-level')).toHaveCount(5);
    await page.locator('[data-family="scales"]').click();
    await expect(page.locator('[data-drills="family"]')).toBeVisible();
    await page.locator('[data-level-start="scales-1"]').click();
    await expect(page.locator('[data-drills="run"] .drill-staff svg').first()).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('.screen-head .icon-btn').click();
    // Settings: key order → chromatic.
    await page.locator('[data-drills-settings]').click();
    await page.getByRole('radio', { name: /Chromatic ↑/ }).click();
    await expect(page.getByRole('radio', { name: /Chromatic ↑/ })).toHaveAttribute('aria-checked', 'true');
    await page.locator('.screen-head .icon-btn').click();
    // Creator: degrees → save → listed under My drills.
    await page.locator('[data-drills-create]').click();
    await page.locator('[data-creator] input').first().fill('Thirds');
    await page.locator('[data-creator-degrees]').fill('1 3 2 4 3 5 4 6');
    await expect(page.locator('[data-creator] .drill-staff svg').first()).toBeVisible();
    await page.locator('[data-creator-save]').click();
    await expect(page.locator('[data-drills="hub"]')).toContainText('Thirds');
  });

  test('guitar: switch instrument, families by genre, a drill shows as tab', async ({ page }) => {
    await page.goto('/?sim=1#/drills');
    await page.locator('[data-inst="guitar"]').click();
    await expect(page.locator('[data-family="g-chords"]')).toBeVisible();
    await expect(page.locator('[data-family="scales"]')).toHaveCount(0);
    await page.locator('[data-family="g-lead"]').click();
    await page.locator('[data-level-start]').first().click();
    await expect(page.locator('[data-drills="run"] .drill-tab svg').first()).toBeVisible();
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('.screen-head .icon-btn').click();
    // GUITAR_DEEPENING §5: the genre filter became add-ons (the core is always on); Flamenco is off until picked.
    await expect(page.locator('[data-family="g-flamenco"]')).toHaveCount(0);
    await page.locator('[data-drills-settings]').click();
    const flamenco = page.getByRole('checkbox', { name: /^Flamenco/ });
    await expect(flamenco).not.toBeChecked();
    await flamenco.check();
    await page.locator('.screen-head .icon-btn').click();
    await expect(page.locator('[data-family="g-flamenco"]')).toBeVisible();
  });

  test('the Awards tab shows the earned badges', async ({ page }) => {
    await page.goto('/?sim=1#/skills');
    await page.locator('#ps-tab-awards').click();
    await expect(page.locator('#ps-panel-awards')).toBeVisible();
  });
});
