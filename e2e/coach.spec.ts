import { expect, test } from '@playwright/test';

// The practice coach (owner 2026-11-21): one press starts a continuous session on a family; after each take the coach
// says one line and the next take starts by itself (another hand / key / step) — no button between takes; End shows
// the session's summary and XP. Every reading take has Listen beside Play.
test.describe.configure({ timeout: 120_000 });

test('coach: scales run hands-free from take to take, then end with XP', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible();
  await page.locator('[data-coach-start]').click();
  // A new step is played first (cursor running); skip it here.
  const demo = page.locator('[data-coach-skip-demo]');
  if (await demo.isVisible().catch(() => false)) await demo.click();
  // Takes follow one another with no click: collect the items seen.
  const seen = new Set<string>();
  for (let k = 0; k < 40 && seen.size < 3; k++) {
    const id = await page.locator('.coach-run').getAttribute('data-drill').catch(() => null);
    if (id) seen.add(id);
    await page.waitForTimeout(400);
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.take-review')).toHaveCount(0);
  await page.locator('[data-coach-stop]').click();
  await expect(page.locator('[data-coach-end]')).toBeVisible();
  const xp = Number(await page.locator('[data-coach-xp]').getAttribute('data-coach-xp'));
  expect(xp).toBeGreaterThan(0);
  await page.locator('[data-coach-back]').click();
  await expect(page.locator('[data-coach-open="scales"]')).toBeVisible();
});

test('coach: pause holds the session on the result; resume moves on', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  const demo = page.locator('[data-coach-skip-demo]');
  if (await demo.isVisible().catch(() => false)) await demo.click();
  await expect(page.locator('[data-coach="result"]')).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-coach-pause="running"]').click();
  const id = await page.locator('.coach-run').getAttribute('data-drill');
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-coach="result"]')).toBeVisible();
  expect(await page.locator('.coach-run').getAttribute('data-drill')).toBe(id);
  await page.locator('[data-coach-pause="paused"]').click();
  await expect(page.locator('[data-coach="result"]')).toBeHidden({ timeout: 10_000 });
});

test('listen: a reading take has Listen beside Play', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-hear="off"]')).toBeVisible();
  await expect(page.locator('[data-drill-play]')).toBeVisible();
  await page.locator('[data-hear="off"]').click();
  await expect(page.locator('[data-hear="on"]')).toBeVisible();
  await page.locator('[data-hear="on"]').click();
  await expect(page.locator('[data-hear="off"]')).toBeVisible();
});

test('hands-free: a level run moves on after a take with no button (again, slower, then the next item)', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'weak'));
  await page.goto('/?unlock=all&handsfree=1#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  const first = await page.locator('.drill-run').getAttribute('data-drill');
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('[data-hf-bar]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-hf-bar]')).toContainText(/again/i);
  // Misses: again, slower, then on to the next item — all by itself, no click.
  await expect.poll(async () => page.locator('.drill-run').getAttribute('data-drill'), { timeout: 60_000 }).not.toBe(first);
  await expect(page.locator('.take-review button:focus')).toHaveCount(0);
});
