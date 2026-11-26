import { expect, test } from '@playwright/test';

// Owner 2026-11-26: the Class tab of Community says which class you are in and who teaches it (the dev teacher mock:
// one demo class where this device is the teacher and a student). Owner, later the same day: the card is not repeated
// above the Community tabs.
test('community: the Class tab starts with my class and its teacher, shown once', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tt.mockTeacher', '1');
    sessionStorage.setItem('toneturn.friendsTab', 'friends');
  });
  await page.goto('/?unlock=all&lang=he&demoFriends=1#/friends');
  await expect(page.locator('[data-fr-tab="class"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-my-classes]')).toHaveCount(0);
  await page.locator('[data-fr-tab="class"]').click();
  const strip = page.locator('.classes [data-my-classes]');
  await expect(strip).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-my-classes]')).toHaveCount(1);
  await expect(strip.locator('[data-my-class="student"]')).toContainText('הכיתה שלי');
  await expect(strip.locator('[data-my-class="student"]')).toContainText('המורה');
  await page.screenshot({ path: 'test-results/my-classes-tab-he.png' });
});
