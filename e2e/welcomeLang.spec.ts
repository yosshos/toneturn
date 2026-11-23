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

// docs/SPEC-I18N.md: a translated locale runs on English and translates at the screen from its catalog (here a
// stand-in catalog, so the check does not depend on the real one's progress); the welcome lists it; it stays after a
// reload; Hebrew and English never load a catalog.
test('a translated language: the screen text from the catalog, left to right; then back to the saved language', async ({ page }) => {
  let fetched = 0;
  await page.route('**/i18n/es.json', (r) => {
    fetched++;
    return r.fulfill({ json: { 'Hear.': 'Escucha.', 'Get started': 'Empezar', 'I already have an account': 'Ya tengo una cuenta' } });
  });
  await page.goto('/?welcome&lang=es');
  await expect(page.locator('[data-ob="start"]')).toHaveText('Empezar', { timeout: 15000 });
  await expect(page.locator('[data-ob="account"]')).toHaveText('Ya tengo una cuenta');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  // the language names are never translated; the third cell shows the locale
  await expect(page.locator('[data-ob-lang-pick="en"]')).toHaveText('English');
  await expect(page.locator('[data-ob-lang-more]')).toHaveValue('es');
  // a text the catalog lacks stays English and is listed for QA
  expect(await page.evaluate(() => (window as unknown as { __i18nMisses: () => string[] }).__i18nMisses().length)).toBeGreaterThan(0);
  // ?lang= is for one visit: without it the saved language (here English) is back
  await page.goto('/?welcome');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 15000 });
  await expect(page.locator('[data-ob="start"]')).toHaveText('Get started');
  // back to Hebrew: no translation, right to left
  await page.locator('[data-ob-lang-pick="he"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-ob="start"]')).not.toHaveText('Empezar');
  expect(fetched).toBeGreaterThan(0);
});
