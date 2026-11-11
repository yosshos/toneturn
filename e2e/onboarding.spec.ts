import { expect, test } from '@playwright/test';

// 0.52: the first minute — the logo draws itself, a welcome with one promise, a first taste (which note was higher),
// the courses, then the first course starts with its welcome card (SPEC-COURSE-START). The full questionnaire stays in
// Settings (?intake for its own test).
test('splash → welcome → taste → courses → the first course: welcome card and setup', async ({ page }) => {
  await page.goto('/?sim=1&welcome=1&splash=1&lang=en');
  await expect(page.locator('[data-splash]')).toBeVisible();
  await expect(page.locator('[data-splash]')).toBeHidden({ timeout: 9000 });
  await expect(page.locator('[data-onboarding="welcome"]')).toBeVisible();
  await expect(page.locator('[data-side-nav]')).toBeHidden();
  await page.locator('[data-ob="start"]').click();
  await expect(page.locator('[data-onboarding="taste"]')).toBeVisible();
  await expect(page.locator('[data-ob="taste-next"]')).toBeDisabled();
  await page.locator('[data-ob="listen"]').click();
  await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
  await page.locator('[data-ob="taste-0"]').click();
  await expect(page.locator('.ob-said')).not.toBeEmpty();
  await page.locator('[data-ob="taste-next"]').click();
  await page.locator('[data-ob="course-ear"]').click();
  await page.locator('[data-ob="course-guitar"]').click();
  await page.locator('[data-ob="courses-next"]').click();
  // SPEC-COURSE-START: no placement after choosing — the first course's welcome card, then its setup (a sound check).
  await expect(page.locator('[data-course-start="welcome"][data-cs-course="ear"]')).toBeVisible();
  await page.locator('[data-report="new"]').click();
  await expect(page.locator('[data-course-start="setup"]')).toBeVisible();
  await page.locator('[data-setup-skip]').click();
  await expect(page.locator('main.lesson, .mini-player, .gate, [aria-labelledby="consent2-title"]').first()).toBeVisible({ timeout: 15_000 });
});

test('the parent digest page: an unknown link says so, without menus', async ({ page }) => {
  await page.goto('/?sim=1#/digest/abcdefghijklmnopqrstuvwxyz');
  await expect(page.locator('[data-digest]')).toBeVisible();
  await expect(page.locator('[data-digest]')).toContainText(/not active|לא פעיל/, { timeout: 15_000 });
  await expect(page.locator('.tabbar')).toHaveCount(0);
});
