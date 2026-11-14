import { expect, test } from '@playwright/test';

// AUDIT-GAPS-2 #1: the new ear level (jazz-phrase 5, "which enclosure?") fits one phone screen (320 px, English and
// Hebrew) — no sideways scrolling, no vertical scroll during the question, the controls above the fold.
// E2E_BASE: point at another dev server (a worktree's own vite when 5174 is taken by another checkout).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

for (const lang of ['en', 'he'] as const) {
  test(`which enclosure fits one screen (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/jazz-phrase/5`);
    await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 4000 }).catch(() => {});
    await page.locator('main.lesson').waitFor({ timeout: 15_000 });
    await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const p = await page.evaluate(() => {
      const out: string[] = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
      const c = document.querySelector('.lesson .stage .controls');
      if (c && c.getBoundingClientRect().height > 0 && c.getBoundingClientRect().bottom > innerHeight + 1) out.push('controls below the fold');
      if (document.querySelector('main.lesson .stage.question')) {
        const banner = document.querySelector('.sim-banner') as HTMLElement | null;
        if (banner) banner.style.display = 'none';
        const over = document.scrollingElement!.scrollHeight - innerHeight;
        if (over > 2) out.push(`taller by ${over}`);
      }
      return out;
    });
    if (p.length) await page.screenshot({ path: `test-results/vocab-${lang}.png`, fullPage: true });
    expect(p).toEqual([]);
  });
}
