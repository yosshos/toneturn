import { expect, test } from '@playwright/test';

// HARRIS_2 + HARMONY_3: every level of the new topics fits one phone screen (320 px, English and Hebrew) — no sideways
// scrolling, no vertical scroll during the question, the controls above the fold.
// E2E_BASE: point at another dev server (a worktree's own vite when 5174 is taken by another checkout).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const LEVELS: [string, number][] = [
  ['bh-three-dim', 4], ['bh-dim-roles', 4], ['bh-m6-bass', 2], ['function-ear', 3], ['modal-cadence', 3], ['borrowed-ext', 2],
  ['jazz-dictation', 5], ['planing', 3], ['form-ear', 3], ['negative-harmony', 2], ['counterpoint', 5],
];

for (const lang of ['en', 'he'] as const) {
  test(`new harmony and Barry Harris topics fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (const [id, n] of LEVELS)
      for (let l = id === 'counterpoint' ? 4 : 1; l <= n; l++) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${id}/${l}`);
        await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 4000 }).catch(() => {});
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        // past the brief page to the question
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
        if (p.length) {
          bad.push(`${id} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/h2-${lang}-${id}-${l}.png`, fullPage: true });
        }
      }
    expect(bad).toEqual([]);
  });
}
