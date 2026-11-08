import type { Page } from '@playwright/test';

/** Practice tab (0.44): open the games list from the hub (no-op when it is already showing). */
export async function openGames(page: Page) {
  const hubCard = page.locator('[data-hub="games"]');
  const list = page.locator('.play-hero');
  await hubCard.or(list).first().waitFor();
  if (await hubCard.isVisible()) await hubCard.click();
  await list.waitFor();
}
