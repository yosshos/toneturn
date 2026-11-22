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
  // SPEC-DAILY-WORKOUT: the matrix line (every exercise in every key, closed, time left, the projection)
  await expect(page.locator('[data-key-matrix]')).toBeVisible();
  await page.screenshot({ path: 'test-results/keys-grid.png', fullPage: true });
  await page.locator('[data-key-group="minor"]').click();
  await expect(page.locator('[data-key-card="9"]')).toContainText('Am');
  await page.locator('[data-key-group="major"]').click();
  await page.locator('[data-key-card="0"]').click();
  await expect(page.locator('[data-key-page="0"]')).toBeVisible();
  await expect(page.locator('[data-key-session="0"]')).toBeVisible();
  await expect(page.locator('[data-key-matrix-key]')).toBeVisible();
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
  // owner 2026-11-22: the key's continuous session is the coach over the key's ladder (scale → 3rds → triads → 7ths)
  await expect(page.locator('[data-key-session="0"]')).toHaveAttribute('data-key-ladder', /[3-9]/);
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/key-ladder-intro.png' });
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

test('a key page: know the key (facts, related keys, warm-up), the dynamics lens, and the key of the week', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await expect(page.locator('[data-week-key]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.key-card.week')).toHaveCount(1);
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-know-key="0"]').click();
  await expect(page.locator('.kk-facts')).toContainText('Dm7 – G7 – Cmaj7');
  await page.locator('[data-kk-q="0"] .chip').first().click();
  await expect(page.locator('[data-kk-q="0"] .chip.right')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/keys-know.png' });
  await page.locator('[data-kk-relative="9"]').click();
  await expect(page.locator('[data-key-page="9"][data-key-group-shown="minor"]')).toBeVisible();
  await page.locator('[data-lens="cresc"]').click();
  await expect(page.locator('[data-lens="cresc"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-key-session="9"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
});

test('wide screens: the keys on the circle of fifths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await expect(page.locator('[data-key-layout="circle"]')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: 'test-results/keys-circle.png' });
});
