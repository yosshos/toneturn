import { expect, test } from '@playwright/test';

// Timed takes always say WHEN: the notes sit in a row, the reference lights them as they sound,
// then a count-in and the beat light carry the take; the screen still fits one phone.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Page overflow on a phone, the simulator's own banner left out (it is not part of the app). */
const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (banner) banner.style.display = '';
    return over;
  });

for (const lv of [9, 7]) {
  test(`voice level ${lv}: notes light up in time, count-in, one screen`, async ({ page }) => {
    await page.goto(`/?sim=1&unlock=all&lang=he&vlevel=${lv}#/vocal`);
    const play = page.locator('.mini-gate .btn.mega, .gate-play, [data-gate-play]').first();
    if (await play.isVisible({ timeout: 15_000 }).catch(() => false)) await play.click();
    await expect(page.locator('.pulse-notes .pn-chip').first()).toBeVisible({ timeout: 60_000 });
    expect(await overflow(page)).toBeLessThanOrEqual(4);
    await page.screenshot({ path: `test-results/pulse-${lv}-ready.png` });
    await page.locator('.vocal-actions .btn.mega').first().click();
    // The reference lights its notes as they sound.
    await expect(page.locator('.pn-chip.now')).toBeVisible({ timeout: 10_000 });
    // Then the count-in shows numbers on the beat light.
    await expect(page.locator('.pn-beat.count')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `test-results/pulse-${lv}-count.png` });
    await expect(page.locator('.take-card')).toBeVisible({ timeout: 30_000 });
  });
}

test('sight-singing: the due note lights on the staff after the count-in', async ({ page }) => {
  await page.goto(`/?sim=1&unlock=all&lang=en&vlevel=401#/vocal`);
  const play = page.locator('.mini-gate .btn.mega, .gate-play, [data-gate-play]').first();
  if (await play.isVisible({ timeout: 15_000 }).catch(() => false)) await play.click();
  await expect(page.locator('.sight-score .note-staff svg').first()).toBeVisible({ timeout: 60_000 });
  expect(await overflow(page)).toBeLessThanOrEqual(4);
  await page.locator('.vocal-actions .btn.mega').first().click();
  await expect(page.locator('.pn-beat.count')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.sight-score .staff-now')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/pulse-sight.png' });
});

test('piano drill: a now-cue column moves over the staff during the take', async ({ page }) => {
  await page.goto('/?sim=1#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-drills="run"] .drill-staff svg').first()).toBeVisible();
  await page.locator('[data-drill-play]').click();
  const col = page.locator('[data-drills="run"] .drill-staff .staff-now');
  await expect(col).toBeVisible({ timeout: 20_000 });
  const a = await col.evaluate((e) => (e as HTMLElement).style.left);
  await page.screenshot({ path: 'test-results/pulse-drill.png' });
  await expect.poll(async () => col.evaluate((e) => (e as HTMLElement).style.left).catch(() => a), { timeout: 10_000 }).not.toBe(a);
});

test('guitar drill: the now-cue column runs over the tab', async ({ page }) => {
  await page.goto('/?sim=1#/drills');
  await page.locator('[data-inst="guitar"]').click();
  await page.locator('[data-family="g-lead"]').click();
  await page.locator('[data-level-start]').first().click();
  await expect(page.locator('[data-drills="run"] .drill-tab svg').first()).toBeVisible();
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('[data-drills="run"] .drill-tab .staff-now')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/pulse-tab.png' });
});
