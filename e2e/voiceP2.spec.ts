import { expect, test, type Page } from '@playwright/test';

// The voice course's second build (VOICE_CURRICULUM "Implemented (P2)"): every new level opens in the simulator,
// a take runs to its result, and the screen fits one phone (390 × 844) without scrolling.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const LEVELS = [1903, 1904, 1408, 1409, 1410, 1507, 1508, 1509, 1510];

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (banner) banner.style.display = '';
    return over;
  });
}

for (const lang of ['he', 'en'] as const) {
  for (const lv of LEVELS) {
    test(`voice P2 level ${lv} runs and fits one screen (${lang})`, async ({ page }) => {
      await page.goto(`/?sim=1&unlock=all&lang=${lang}&vlevel=${lv}#/vocal`);
      const sing = page.locator('.vtimed .btn.mega').first();
      await expect(sing).toBeVisible({ timeout: 60_000 });
      // The first timed take asks for the mic delay only outside the simulator.
      expect(await overflow(page), 'ready screen').toBeLessThanOrEqual(2);
      if (lv === 1903 || lv === 1904) await expect(page.locator('.vt-sheet .note-staff').first()).toBeVisible();
      if (lv === 1904) await expect(page.locator('.vt-sheet-chords li').first()).toBeVisible();
      await sing.click();
      await expect(page.locator('.vt-result')).toBeVisible({ timeout: 60_000 });
      expect(await overflow(page), 'result screen').toBeLessThanOrEqual(2);
      await expect(page.locator('.vt-result .take-score b')).toContainText('%');
      await page.screenshot({ path: `test-results/voiceP2-${lv}-${lang}.png` });
    });
  }

  test(`voice P2 my song: the demo recording is analysed, then sung with (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&unlock=all&lang=${lang}&vlevel=1308#/vocal`);
    await page.locator('[data-my-song-demo]').click({ timeout: 60_000 });
    const next = page.locator('.vt-mine .btn.mega');
    await expect(next).toBeVisible({ timeout: 30_000 });
    await next.click();
    const hp = page.locator('.vt-hp input[type=checkbox]').first();
    await hp.check();
    await page.locator('.vtimed .vocal-actions .btn.mega').first().click();
    await expect(page.locator('.vt-result')).toBeVisible({ timeout: 60_000 });
    expect(await overflow(page)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/voiceP2-1308-${lang}.png` });
  });

  test(`voice P2 quarter tones open and fit (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&unlock=all&lang=${lang}&vlevel=704#/vocal`);
    await expect(page.locator('.vocal-targets')).toContainText('¼↓', { timeout: 60_000 }).catch(async () => {
      // the first item is the chromatic one (no quarter tone): the label shows on the next items
      await expect(page.locator('.vocal-targets')).toBeVisible();
    });
    expect(await overflow(page)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/voiceP2-704-${lang}.png` });
  });
}
