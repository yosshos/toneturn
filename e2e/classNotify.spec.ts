import { expect, test } from '@playwright/test';

// SPEC-CLASS-NOTIFICATIONS §4.7: the class notification switches and the teacher's digest hour live in Privacy
// settings, next to the shared quiet hours; they save into the synced privacy settings.
test('class notification settings: switches, digest hour, shared quiet hours', async ({ page }) => {
  await page.goto('/?unlock=all&lang=he#/settings/privacy');
  const box = page.locator('[data-class-notify="1"]');
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-quiet-hours="1"]')).toContainText('שעות שקט להתראות');
  await expect(box.locator('[data-class-notify-key]')).toHaveCount(4);
  await expect(box.locator('[data-class-digest-hour]')).toHaveValue('18');
  await box.locator('[data-class-digest-hour]').selectOption('20');
  await box.locator('[data-class-notify-key="classDue"]').uncheck();
  await expect(box.locator('[data-class-notify-key="classDue"]')).not.toBeChecked();
  // kept after a reload (the synced privacy settings)
  await page.waitForTimeout(800);
  await page.reload();
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(box.locator('[data-class-digest-hour]')).toHaveValue('20');
  await expect(box.locator('[data-class-notify-key="classDue"]')).not.toBeChecked();
  await box.locator('[data-class-notify-key="classDigest"]').uncheck();
  await expect(box.locator('[data-class-digest-hour]')).toHaveCount(0);
  await box.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/class-notify-settings-he.png', fullPage: false });
});
