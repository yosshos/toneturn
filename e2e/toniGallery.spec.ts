// The Paper Toni gallery (#/dev/toni, dev server only): every state at 120 and 48 px on a light and a dark panel.
// Shots go to docs/toni-shots/ for review: the whole gallery (pose after the one-shots) and each state close up.
import { expect, test } from '@playwright/test';

const OUT = 'docs/toni-shots';
const STATES = ['idle', 'listen', 'think', 'hint', 'correct', 'streak', 'wrong', 'close', 'wow', 'sleepy', 'draw', 'bye', 'proud', 'focused', 'encouraging', 'celebrating', 'curious'];

test('toni gallery: every state, light and dark, shots', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/dev/toni');
  await expect(page.locator('[data-ready]')).toBeVisible();
  // 17 states x 2 sizes x 2 panels, all Paper (+ the one in the header, as call sites use it).
  await expect(page.locator('.tg-panel .toni-p')).toHaveCount(STATES.length * 4);
  await expect(page.locator('.tg-live .toni-p')).toHaveCount(1);
  // The wrong flag is the raspberry red.
  const wrong = await page.locator('.tg-light [data-state="wrong"] .toni-p').first().innerHTML();
  expect(wrong.toLowerCase()).toContain('#e23a5a');
  // The motion runs (not reduced here): idle breathes.
  const anim = await page.locator('.tg-light [data-state="idle"] .tp-body').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toContain('tp-breathe');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300); // let the one-shot gestures finish
  await page.screenshot({ path: `${OUT}/gallery.png`, fullPage: true });
  for (const theme of ['light', 'dark'])
    for (const s of STATES) await page.locator(`.tg-${theme} [data-state="${s}"]`).screenshot({ path: `${OUT}/${theme}-${s}.png` });
  expect(errors).toEqual([]);
  await ctx.close();
});

test('toni gallery: reduced motion keeps the pose only', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/#/dev/toni?only=correct,think');
  await expect(page.locator('[data-ready]')).toBeVisible();
  const names = await page.locator('.tg-panel .toni-p :is(.tp-body, .tp-flag, .tp-fx)').evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.length).toBeGreaterThan(4);
  for (const n of names) expect(n).toBe('none');
  await ctx.close();
});
