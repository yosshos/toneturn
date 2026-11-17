import { expect, type Locator, type Page } from '@playwright/test';

// The level picker on a game setup (src/ui/TierChips.tsx): one compact row "Level mp · …" that opens the pp … ff
// chooser in a sheet. These helpers open it, pick a tier and close it again.

/** The compact level row (the first one on the screen). */
export const tierRow = (page: Page): Locator => page.locator('[data-tier-row]').first();

/** Opens the level sheet; returns it (its six chips are `.tier-chip[data-tier]`). */
export async function openTiers(page: Page): Promise<Locator> {
  await tierRow(page).click();
  const sheet = page.locator('.gs-tier-sheet');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Closes the level sheet with its Done button. */
export async function closeTiers(page: Page): Promise<void> {
  const sheet = page.locator('.gs-tier-sheet');
  await sheet.locator(':scope > .btn.primary').click();
  await expect(sheet).toHaveCount(0);
}

/** Opens the sheet, picks a tier and closes it again. */
export async function pickTier(page: Page, tier: string): Promise<void> {
  const sheet = await openTiers(page);
  await sheet.locator(`.tier-chip[data-tier="${tier}"]`).click();
  await closeTiers(page);
  await expect(tierRow(page)).toHaveAttribute('data-tier-row', tier);
}
