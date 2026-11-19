import { expect, test } from '@playwright/test';

// Owner 2026-11-19: the first screen offers the language prominently; a Hebrew phone opens in Hebrew.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('a Hebrew phone opens the welcome in Hebrew, and the language choice switches it', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('/?welcome');
  const pick = page.locator('[data-ob-lang]');
  await expect(pick).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-ob-lang-pick="he"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.waitForTimeout(800); // the welcome fades in
  if (process.env.SHOTS) await page.screenshot({ path: 'docs/fresh-shots/welcome-he.png' });
  await page.locator('[data-ob-lang-pick="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[data-ob-lang-pick="en"]')).toHaveAttribute('aria-checked', 'true');
  if (process.env.SHOTS) await page.screenshot({ path: 'docs/fresh-shots/welcome-en.png' });
  await ctx.close();
});
