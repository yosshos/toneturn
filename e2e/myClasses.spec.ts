import { expect, test } from '@playwright/test';

// Owner 2026-11-26: the Community screen says which class you are in and who teaches it (the dev teacher mock: one
// demo class where this device is the teacher and a student); a tap opens the Class tab, which starts with the same.
test('community: my class and its teacher at the top; the Class tab starts with it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tt.mockTeacher', '1');
    sessionStorage.setItem('toneturn.friendsTab', 'friends');
  });
  await page.goto('/?unlock=all&lang=he&demoFriends=1#/friends');
  const strip = page.locator('[data-my-classes]').first();
  await expect(strip).toBeVisible({ timeout: 20_000 });
  await expect(strip.locator('[data-my-class="student"]')).toContainText('הכיתה שלי');
  await expect(strip.locator('[data-my-class="student"]')).toContainText('המורה');
  await page.screenshot({ path: 'test-results/my-classes-community-he.png' });
  await strip.locator('[data-my-class="student"]').click();
  await expect(page.locator('[data-fr-tab="class"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.classes [data-my-classes]')).toBeVisible();
  await page.screenshot({ path: 'test-results/my-classes-tab-he.png' });
});
