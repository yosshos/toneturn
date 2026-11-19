import { expect, test, type Page } from '@playwright/test';

// Progressions by ear (progGrid.ts): every level of the grid dictation fits one phone screen (320×720, English and
// Hebrew) — no sideways scroll, no vertical scroll, the controls on screen; the grid answers, marks the wrong parts and
// opens one fix-it pass. One instrument level (k-ear 10, progressions played back on the keys) fits as well.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const problems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (over > 2) out.push(`taller by ${over}`);
    const el = document.querySelector('.lesson .stage .controls');
    if (el && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().bottom > innerHeight + 1) out.push('controls below the fold');
    const check = document.querySelector('[data-gd-check]');
    if (check && check.getBoundingClientRect().bottom > innerHeight + 1) out.push('check below the fold');
    return out;
  });

/** Fill every open slot: root, quality and (when asked) the third row — the first chip of each row. */
async function fillAll(page: Page) {
  const cells = page.locator('[data-gd-cell]');
  const n = await cells.count();
  for (let i = 0; i < n; i++) {
    const cell = cells.nth(i);
    if ((await cell.getAttribute('class'))?.includes('locked')) continue;
    await cell.click();
    await page.locator('[data-gd-root]').nth(i % 12).click();
    const xs = page.locator('[data-gd-x]');
    if (await xs.count()) {
      await page.locator('[data-gd-q]').first().click();
      await xs.first().click();
    } else await page.locator('[data-gd-q]').first().click();
  }
}

for (const lang of ['en', 'he'] as const) {
  test(`grid dictation: every level fits one screen (${lang})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (let l = 1; l <= 8; l++) {
      await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/grid-dictation/${l}`);
      await page.locator('main.lesson').waitFor({ timeout: 15_000 });
      await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
      await expect(page.locator('[data-grid-dictation]')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(600);
      const p = await problems(page);
      // The grid and the chips read left to right in both languages.
      const dir = await page.locator('.gd-grid').getAttribute('dir');
      if (dir !== 'ltr') p.push(`grid dir ${dir}`);
      if (p.length) {
        bad.push(`L${l}: ${p.join(', ')}`);
        await page.screenshot({ path: `test-results/grid-${lang}-${l}.png`, fullPage: true });
      }
    }
    expect(bad).toEqual([]);
  });

  test(`grid dictation: answer, the wrong parts marked, one fix-it pass (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/grid-dictation/4`);
    await page.locator('main.lesson').waitFor({ timeout: 15_000 });
    await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('[data-gd-root="0"]')).toBeEnabled({ timeout: 30_000 });
    await fillAll(page);
    await expect(page.locator('[data-gd-check]')).toBeEnabled();
    await page.locator('[data-gd-check]').click();
    // The first try (chips picked blindly) is wrong somewhere: the fix-it pass opens on the wrong slots only.
    await expect(page.locator('.feedback.retry')).toBeVisible({ timeout: 15_000 });
    const fb = (await page.locator('.feedback .fb-line b').textContent()) ?? '';
    expect(fb).toMatch(lang === 'he' ? /שורשים/ : /Roots/);
    await expect(page.locator('.gd-cell.fix').first()).toBeVisible();
    const fixP = await problems(page);
    if (fixP.length) await page.screenshot({ path: `test-results/grid-fix-${lang}.png`, fullPage: true });
    expect(fixP).toEqual([]);
    await expect(page.locator('[data-gd-root="0"]')).toBeEnabled({ timeout: 30_000 });
    await fillAll(page);
    await page.locator('[data-gd-check]').click();
    // Resolved: right or revealed — the grid shows the marks and the right chords under the wrong slots.
    await expect(page.locator('.gd-cell.right, .gd-cell.wrong').first()).toBeVisible({ timeout: 15_000 });
    expect(await problems(page)).toEqual([]);
  });
}

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills };
    await new Promise((res, rej) => {
      const r = indexedDB.open('toneturn', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        const tx = r.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(progress, 'progress');
        tx.objectStore('kv').put(settings, 'settings');
        tx.oncomplete = res;
        tx.onerror = rej;
      };
      r.onerror = rej;
    });
  }, lang);
};

for (const lang of ['en', 'he'] as const)
  test(`k-ear 10 (ii–V–I played back) run screen fits one screen (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page, lang);
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.waitForTimeout(800);
    await page.locator('[data-topic="all"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-family="k-ear"]').click();
    const card = page.locator('[data-level="k-ear-10"]');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
    await page.locator('[data-level-start="k-ear-10"]').click();
    await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
    await expect(page.locator('[data-drills="run"]')).toBeVisible();
    await page.waitForTimeout(600);
    const p = await problems(page);
    if (p.length) await page.screenshot({ path: `test-results/kear10-${lang}.png`, fullPage: true });
    expect(p).toEqual([]);
  });
