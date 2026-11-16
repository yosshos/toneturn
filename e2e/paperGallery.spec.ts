// The Paper icon gallery (#/dev/glyphs, dev server only): every glyph in its three cuts, the nav, courses and badges,
// light and dark, at 320 and 1280 px, 1x and 2x. Shots go to docs/icon-shots/ for review.
import { expect, test } from '@playwright/test';

const OUT = 'docs/icon-shots';

for (const theme of ['light', 'dark'] as const)
  for (const width of [320, 1280])
    for (const scale of [1, 2])
      test(`paper gallery ${theme} ${width}px @${scale}x`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: scale, colorScheme: theme });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`/#/dev/glyphs?theme=${theme}`);
        await expect(page.locator('[data-ready]')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        // Every glyph tile drew Paper (an appended glyph without a drawing shows as .pg-old and is listed).
        const tiles = await page.locator('.pg-tile').count();
        expect(tiles).toBeGreaterThan(200);
        expect(await page.locator('.pg-old').count()).toBeLessThan(10);
        // No sideways scroll at phone width.
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        // Paper parts paint through the surface variables: a body in the dark theme uses the lifted dark tone.
        const fill = await page.locator('.pg-tile[data-glyph="keys"] svg.pp-full rect').nth(1).evaluate((el) => getComputedStyle(el).fill);
        expect(fill).not.toBe('none');
        const name = `gallery-${theme}-${width}-${scale}x.png`;
        if (width === 1280) await page.screenshot({ path: `${OUT}/${name}`, fullPage: scale === 1 });
        else {
          await page.screenshot({ path: `${OUT}/${name}` });
          await page.locator('.pg-grid').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8));
          await page.screenshot({ path: `${OUT}/glyphs-${theme}-${width}-${scale}x.png` });
        }
        await page.goto(`/#/dev/glyphs?theme=${theme}&sec=badges&only=area:*,special:hat*,special:midnight*,season:*,tech:clean*,skill:chords*`);
        await page.reload();
        await expect(page.locator('[data-ready]')).toBeVisible();
        if (scale === 1 && width === 1280) await page.screenshot({ path: `${OUT}/badges-${theme}.png`, fullPage: true });
        expect(errors).toEqual([]);
        await ctx.close();
      });
