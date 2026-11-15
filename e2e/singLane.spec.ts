import { expect, test, type Page } from '@playwright/test';

// The live singing view (docs/research/VOICE-FEEDBACK-UI.md): in the simulator fed in real time (?simrt=1), a take
// shows the pitch lane, the note readout and the zone meter on one 320 × 720 phone screen, then the review.
// SHOTS=1 also writes the screenshots for the owner to docs/voice-ui-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (banner) banner.style.display = '';
    return over;
  });
}

async function openLevel(page: Page, lang: string, lv: number, item = 0) {
  await page.goto(`/?sim=1&simrt=1&unlock=all&lang=${lang}&vlevel=${lv}#/vocal`);
  const sing = page.locator('.vocal .vocal-actions .btn.mega').first();
  await expect(sing).toBeVisible({ timeout: 60_000 });
  for (let k = 0; k < item; k++) {
    // move on without singing: sing once, then Next
    await sing.click();
    await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
    await page.locator('.vocal .vocal-actions .btn.mega').first().click();
  }
  return sing;
}

const CASES = [
  { lv: 1, name: 'hold', item: 1 },
  { lv: 3, name: 'vibrato', item: 1 },
  { lv: 7, name: 'melody', item: 1 },
];

for (const lang of ['en', 'he'] as const) {
  for (const c of CASES) {
    test(`sing lane: ${c.name} live + review fit 320×720 (${lang})`, async ({ page }) => {
      const sing = await openLevel(page, lang, c.lv, c.item);
      // the mic check answers before the take (a synthetic voice in the simulator)
      await expect(page.locator('[data-voice-check="got"]')).toBeVisible({ timeout: 10_000 });
      expect(await overflow(page), 'ready screen').toBeLessThanOrEqual(2);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-ready-${lang}.png` });
      await sing.click();
      // live: the lane, the readout and the meter, with a note name once the voice is heard
      await expect(page.locator('.sing-lane.is-live')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.sing-readout')).toBeVisible();
      await expect(page.locator('.zone-meter')).toBeVisible();
      await expect(page.locator('.sing-readout .sr-note > bdi')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(c.name === 'melody' ? 900 : 1600);
      expect(await overflow(page), 'live screen').toBeLessThanOrEqual(2);
      await expect(page.locator('.sl-trail').first()).toHaveAttribute('d', /L/);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-live-${lang}.png` });
      // review
      await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('.sing-lane.is-review')).toBeVisible();
      await expect(page.locator('.take-score b')).toContainText('%');
      expect(await overflow(page), 'review screen').toBeLessThanOrEqual(2);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-review-${lang}.png` });
    });
  }
}
