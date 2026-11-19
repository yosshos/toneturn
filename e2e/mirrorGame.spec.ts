import { expect, test, type Page } from '@playwright/test';

// Mirror (negative harmony game) at a 390 × 844 phone: setup and play fit one screen (no vertical or sideways scroll),
// Hebrew screens keep Latin inside <bdi> / dir=ltr, a run of notes (keyboard taps) reaches the result card, and a
// 7th-chord round (resumed from a saved run) shows the axis keyboard and four chord options.
// Screenshots: docs/fresh-shots/mirror-game-he.png (7th chords), mirror-game-notes-he.png (notes).
// E2E_BASE: point at another dev server (a worktree's own vite).

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const seed = async (page: Page, lang: Lang) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'jazz'], activeCourse: 'jazz', seenVersion: '9.9.9' };
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
const open = async (page: Page, lang: Lang) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/mirror`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(600);
};
const measure = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth };
  });
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, .visually-hidden, [aria-hidden="true"], .sim-banner, .dyn, .tier-chip, title')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, lang: Lang, label: string, bad: string[]) => {
  const s = await measure(page);
  if (s.over > 4 || s.side > 1) bad.push(`${label}: over ${s.over}, side ${s.side}`);
  if (lang === 'he') {
    const l = await latinOutsideBdi(page);
    if (l.length) bad.push(`${label} latin: ${l.join(' | ')}`);
  }
};
const tap = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find((x) => !(x as HTMLButtonElement).disabled) as HTMLButtonElement | undefined;
    if (!el) return false;
    el.click();
    return true;
  }, sel);
const resultShown = (page: Page) => page.locator('[data-result-card]').isVisible().catch(() => false);
const saveRun = (page: Page, data: unknown) =>
  page.evaluate(async (data) => {
    const path = '/src/storage/resume.ts';
    const m = await import(/* @vite-ignore */ path);
    m.saveSlot('game:mirror', { title: 'mirror', route: 'mirror', done: 0, total: 0, data });
  }, data);

for (const lang of ['he', 'en'] as const) {
  test(`mirror (${lang}): setup and play fit 390×844, a run of notes reaches the result card`, async ({ page }) => {
    test.setTimeout(180_000);
    const bad: string[] = [];
    await seed(page, lang);
    await open(page, lang);
    await expect(page.locator('main[data-game="mirror"]')).toBeVisible();
    await check(page, lang, 'setup', bad);
    await page.locator('[data-ng-start]').click();
    await expect(page.locator('main[data-game="mirror"][data-phase="play"]')).toBeVisible();
    await expect(page.locator('[data-mg-kbd] .mg-axis')).toHaveCount(2);
    await page.waitForTimeout(400);
    await check(page, lang, 'play', bad);
    if (lang === 'he') await page.screenshot({ path: 'docs/fresh-shots/mirror-game-notes-he.png' });
    for (let k = 0; k < 40 && !(await resultShown(page)); k++) {
      if (await tap(page, '[data-mg-next]')) {
        await page.waitForTimeout(300);
        continue;
      }
      if ((await page.locator('main[data-game="mirror"][data-phase="play"]').count()) && (await tap(page, '[data-mg-cell]'))) {
        await page.waitForTimeout(250);
        await check(page, lang, `answered ${k}`, bad);
      }
      await page.waitForTimeout(1500);
    }
    await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 5_000 });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test(`mirror 7th chords and cadences (${lang}): the chord rounds fit 390×844`, async ({ page }) => {
    test.setTimeout(120_000);
    const bad: string[] = [];
    await seed(page, lang);
    for (const level of [4, 5]) {
      await open(page, lang);
      await saveRun(page, { v: 1, game: 'mirror', seed: 11, level, i: 0, lives: 3, right: 0, wrong: 0, score: 0, streak: 0, bestStreak: 0 });
      await open(page, lang);
      await page.locator('main[data-game="mirror"] .btn.primary.mega').first().click();
      await expect(page.locator('main[data-game="mirror"][data-phase="play"]')).toBeVisible();
      await expect(page.locator('[data-mg-choice]')).toHaveCount(4);
      await page.waitForTimeout(400);
      await check(page, lang, `level ${level} play`, bad);
      if (lang === 'he' && level === 4) await page.screenshot({ path: 'docs/fresh-shots/mirror-game-he.png' });
      await tap(page, '[data-mg-choice]');
      await page.waitForTimeout(300);
      await check(page, lang, `level ${level} answered`, bad);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
}
