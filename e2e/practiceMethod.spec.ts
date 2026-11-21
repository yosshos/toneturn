import { expect, test, type Page } from '@playwright/test';

// Practice method after Siskind (src/engine/practiceMethod.ts; SISKIND-SOLO-PIANO A11, C6): the four-slot workout
// preset, the 7-step lick flow and the tune-memorising lists each fit one phone screen (320×720, English and Hebrew).
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills };
    localStorage.removeItem('tt.lickFlow.v1');
    localStorage.removeItem('tt.tuneMemo.v1');
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
const problems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (over > 2) out.push(`taller by ${over}`);
    return out;
  });

for (const lang of ['en', 'he'] as const) {
  test(`four-slot workout preset (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock&lang=${lang}#/workout`);
    await page.locator('[data-preset="four-slot"]').click();
    const blocks = page.locator('.wk-block');
    await expect(blocks).toHaveCount(4);
    await expect(blocks.nth(2)).toContainText(lang === 'he' ? 'שירים' : 'Tunes');
    await expect(blocks.nth(3)).toContainText(lang === 'he' ? 'הקלטות' : 'Recordings');
  });

  test(`lick flow: seven steps on one screen (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?sim=1&unlock=all&lang=${lang}#/licks`);
    await page.locator('[data-lick-card]').first().click();
    await page.locator('[data-lick-absorb]').click();
    await expect(page.locator('[data-licks="absorb"]')).toBeVisible();
    await expect(page.locator('[data-flow-step]')).toHaveCount(7);
    await page.locator('[data-flow-done="1"]').click();
    await expect(page.locator('[data-lick-flow="2"]')).toBeVisible();
    await expect(page.locator('[data-flow-practice]')).toBeVisible();
    expect(await problems(page)).toEqual([]);
  });

  test(`tune memorising: steps and the three lists (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?sim=1&unlock=all&lang=${lang}#/repertoire`);
    await page.locator('[data-rep-item]').first().click();
    await page.locator('[data-rep-memo]').click();
    await expect(page.locator('[data-memo-step]')).toHaveCount(6);
    await page.locator('[data-memo-step="chunk"] input').check();
    await expect(page.locator('[data-memo-list="learning"]')).toHaveAttribute('aria-checked', 'true');
    expect(await problems(page)).toEqual([]);
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('[data-rep-lists]').click();
    await expect(page.locator('[data-rep-list="learning"] .chip')).toHaveCount(1);
    expect(await problems(page)).toEqual([]);
  });
}
