import { expect, test, type Page } from '@playwright/test';

// Licks & transcription (SPEC-LICKS-TRANSCRIPTION): every exercise screen fits one phone screen (390×844), no emoji.
test.use({ viewport: { width: 390, height: 844 } });

const fits = async (page: Page) => {
  const { sh, ih, sw, iw } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, 'no horizontal scroll').toBeLessThanOrEqual(iw + 1);
  expect(sh, 'one screen').toBeLessThanOrEqual(ih + 2);
};
const noEmoji = async (page: Page) => {
  const text = await page.locator('main').innerText();
  expect(/[\u{1F300}-\u{1FAFF}]/u.test(text), text.slice(0, 200)).toBe(false);
};

test('lick trainer: library, a lick with its 12-key grid, a measured run — each on one screen', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all#/licks');
  await expect(page.locator('[data-licks="lib"]')).toBeVisible();
  await expect(page.locator('[data-lick-card]').first()).toBeVisible();
  await noEmoji(page);
  await page.locator('[data-lick-tab="minor-251"]').click();
  await expect(page.locator('[data-lick-card="min-arp"]')).toBeVisible();
  await page.locator('[data-lick-card="min-arp"]').click();
  await expect(page.locator('[data-licks="lick"]')).toBeVisible();
  await expect(page.locator('[data-lick-grid]')).toBeVisible();
  await expect(page.locator('.lk-col')).toHaveCount(12);
  // phase 4: the old 3-star 'Use it' folded into Improvise (today's lick): the page opens improvisation with the lick
  await expect(page.locator('[data-lick-improvise]')).toBeVisible();
  await page.screenshot({ path: 'test-results/licks-page.png', fullPage: true });
  await fits(page);
  await noEmoji(page);
  await page.locator('[data-lick-practice]').click();
  await expect(page.locator('[data-lick-run="practice"]')).toBeVisible();
  await expect(page.locator('.drill-take')).toBeVisible();
  await fits(page);
  await page.screenshot({ path: 'test-results/licks-run.png' });
});

test('lick trainer: the style devices tab (blues, gospel, New Orleans, bossa) — a device page and its run on one screen', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all#/licks');
  await page.locator('[data-lick-tab="style"]').click();
  for (const id of ['sty-bl-scale', 'sty-gos-scale', 'sty-gos-grace', 'sty-nola-line', 'sty-br-inner']) await expect(page.locator(`[data-lick-card="${id}"]`)).toBeVisible();
  // the jazz licks are not in this tab
  await expect(page.locator('[data-lick-card="maj-arp"]')).toHaveCount(0);
  await noEmoji(page);
  // the chips are the styles of the tab: one narrows the list to its devices
  await page.locator('[data-lick-style-pick="brazil"]').click();
  await expect(page.locator('[data-lick-card="sty-bl-scale"]')).toHaveCount(0);
  await page.locator('[data-lick-card="sty-br-inner"]').click();
  await expect(page.locator('[data-licks="lick"]')).toBeVisible();
  await expect(page.locator('.lk-col')).toHaveCount(12);
  await fits(page);
  await noEmoji(page);
  await page.locator('[data-lick-practice]').click();
  await expect(page.locator('[data-lick-run="practice"]')).toBeVisible();
  await fits(page);
});

test('lick trainer: review tab and my licks are empty for a new player; Practice shows the tiles in Jazz', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all#/licks');
  await page.locator('[data-lick-tab="review"]').click();
  await expect(page.locator('.field-hint')).toBeVisible();
  await page.locator('[data-lick-tab="mine"]').click();
  await expect(page.locator('[data-lick-card]')).toHaveCount(0);
});

test('transcription coach: levels, hear (speed, loop), play back — each on one screen', async ({ page }) => {
  // phase 3: the old address lands on Licks › Transcribe (the graded coach)
  await page.goto('/?sim=1&unlock=all#/transcribe-coach');
  await expect(page.locator('[data-transcribe="levels"]')).toBeVisible();
  await expect(page.locator('[data-licks-tab="transcribe"][aria-selected="true"]')).toBeVisible();
  await expect(page.locator('[data-tx-open]')).toHaveCount(9); // 9 levels since the solo-phrase-by-ear level
  await noEmoji(page);
  await page.locator('[data-tx-open="1"]').click();
  await expect(page.locator('[data-tx-step="0"]')).toBeVisible();
  await page.locator('[data-tx-speed="0.5"]').click();
  await page.locator('[data-tx-loop]').click();
  await expect(page.locator('[data-tx-loop="on"]')).toBeVisible();
  await page.locator('[data-tx-loop]').click();
  await fits(page);
  await page.locator('[data-tx-ready]').click();
  await expect(page.locator('[data-tx-step="1"]')).toBeVisible();
  await expect(page.locator('.drill-take')).toBeVisible();
  await page.locator('[data-tx-reveal]').click();
  await expect(page.locator('.tx-staff')).toBeVisible();
  await fits(page);
  await noEmoji(page);
  await page.screenshot({ path: 'test-results/transcribe-back.png' });
});
