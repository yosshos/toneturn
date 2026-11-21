import { expect, test } from '@playwright/test';

// Practice by key (owner 2026-11-21, SPEC-PRACTICE-KEYS): Topic | Key, 12 key cards per scale-family tab, General
// technique under them; a key page opens with the key's continuous session, then a row per kind of exercise.
test.describe.configure({ timeout: 120_000 });

test('practice by key: cards, tabs, a key page with its continuous session and rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await expect(page.locator('[data-key-card]')).toHaveCount(12, { timeout: 30_000 });
  await expect(page.locator('[data-key-general]')).toBeVisible();
  await page.screenshot({ path: 'test-results/keys-grid.png', fullPage: true });
  await page.locator('[data-key-group="minor"]').click();
  await expect(page.locator('[data-key-card="9"]')).toContainText('Am');
  await page.locator('[data-key-group="major"]').click();
  await page.locator('[data-key-card="0"]').click();
  await expect(page.locator('[data-key-page="0"]')).toBeVisible();
  await expect(page.locator('[data-key-session="0"]')).toBeVisible();
  await expect(page.locator('[data-kp-row="scale"]')).toBeVisible();
  await expect(page.locator('[data-kp-row="control"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/keys-page.png' });
  await page.locator('[data-kp-row="cadence"] .kp-row-head').click();
  await expect(page.locator('[data-kp-row="cadence"] [data-kp-entry]').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/keys-page-row.png' });
  // the remembered view: back on Practice (after a reload) it opens by key
  await page.reload();
  await expect(page.locator('[data-practice-view="key"]')).toHaveAttribute('aria-checked', 'true');
});

test('practice by key: the continuous session starts a run', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('.drill-run')).toBeVisible({ timeout: 20_000 });
});

test('practice by topic: a family splits by scale family (major, minor, modes, symmetric)', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="topic"]').click();
  await page.locator('[data-family="scales"]').click();
  await expect(page.locator('[data-family-group="minor"]')).toBeVisible();
  const all = await page.locator('[data-level]').count();
  await page.locator('[data-family-group="minor"]').click();
  const minor = await page.locator('[data-level]').count();
  expect(minor).toBeGreaterThan(0);
  expect(minor).toBeLessThan(all);
  await expect(page.locator('[data-coach-open="scales"]')).toBeVisible();
});
