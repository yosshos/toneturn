import type { Page } from '@playwright/test';

/** Practice tab (0.44): open the games list from the hub (no-op when it is already showing). */
export async function openGames(page: Page) {
  const hubCard = page.locator('[data-hub="games"]');
  const list = page.locator('.play-hero');
  await hubCard.or(list).first().waitFor();
  if (await hubCard.isVisible()) await hubCard.click();
  await list.waitFor();
  // 0.61: the list opens on the course's own category — show them all.
  await page.locator('[data-cat="all"]').click();
}

/** Courses (0.61): switch the active course from the top-bar chip, adding it when it is not yet one of yours. */
export async function switchCourse(page: Page, id: string) {
  await page.locator('[data-course-chip]:visible').first().click();
  const row = page.locator(`[data-course="${id}"]`);
  if (!(await row.isVisible())) await page.locator('[data-course-add]').click();
  await row.click();
}
