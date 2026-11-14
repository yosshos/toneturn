import { expect, test, type Page } from '@playwright/test';

// Rhythm gaps R-1 / R-5 (docs/AUDIT-CONTENT-THEORY.md §ז.2): 5 against 4 over the bar on two pads, and metric
// modulation tapped — each with its written rhythm, a count-in, the click and the playhead, on one phone screen.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (banner) banner.style.display = '';
    return over;
  });

async function open(page: Page, hash: string) {
  await page.goto(`/?sim=1&unlock=all&lang=en${hash}`);
  // Voice mode asks for the microphone first: answer with buttons.
  await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 6000 }).catch(() => {});
  const play = page.locator('[data-brief-play]');
  if (await play.isVisible({ timeout: 10_000 }).catch(() => false)) await play.click();
}

test('poly-tap 5: 5 against 4 — two written lanes, two pads, count-in and the playhead, one screen', async ({ page }) => {
  await open(page, '#/topic/poly-tap/5');
  const lanes = page.locator('.read-prompt.lanes .lane-row');
  await expect(lanes).toHaveCount(2, { timeout: 30_000 });
  await expect(lanes.nth(1).locator('.rhythm-staff svg')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.lane-pads .lane-pad')).toHaveCount(2);
  expect(await overflow(page)).toBeLessThanOrEqual(4);
  await expect(page.locator('.lane-countdown')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.read-prompt.lanes .staff-now').first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/rhythm-gaps-poly54.png' });
});

test('metric-tap 1: the written rhythm with its playhead after the count-in, one screen', async ({ page }) => {
  await open(page, '#/topic/metric-tap/1');
  await expect(page.locator('.read-prompt .rhythm-staff svg')).toBeVisible({ timeout: 30_000 });
  expect(await overflow(page)).toBeLessThanOrEqual(4);
  await expect(page.locator('.read-prompt[data-start]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.read-prompt .staff-now')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/rhythm-gaps-metric.png' });
});
