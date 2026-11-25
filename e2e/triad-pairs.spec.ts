import { expect, test, type Page } from '@playwright/test';

// Triad pairs, deep (owner 2026-11-16), at a 320 × 720 phone in English and Hebrew:
// 1. Which Pair?: the setup and play screens fit one screen (no vertical or sideways scroll), the main button in view;
//    a run reaches the shared result card; the dense tiers (mf, f, ff with a stub MIDI keyboard) fit too;
// 2. on Hebrew screens no visible Latin text outside <bdi> / dir=ltr;
// 3. the new levels' run screens (keys, guitar, bass) fit one screen.
// E2E_BASE: point at another dev server (a worktree's own vite).

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const seed = async (page: Page, lang: Lang, course: string, plays = 'keys') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', drills };
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
    },
    { lang, course, plays },
  );
};
const open = async (page: Page, lang: Lang, route: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${route}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(600);
};
const measure = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    const btns = [...document.querySelectorAll('main .btn.mega, main .btn.primary')].filter((b) => (b as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const bottom = btns.length ? Math.max(...btns.map((b) => b.getBoundingClientRect().bottom)) : 0;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth, bottom, h: innerHeight };
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
      if ((t.match(/[A-Za-z]+/g) ?? []).length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
const tap = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLButtonElement | null;
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }, sel);
const resultShown = (page: Page) => page.locator('[data-result-card]').isVisible().catch(() => false);
const saveRun = (page: Page, route: string, data: unknown) =>
  page.evaluate(
    async ({ route, data }) => {
      const path = '/src/storage/resume.ts';
      const m = await import(/* @vite-ignore */ path);
      m.saveSlot(`game:${route}`, { title: route, route, done: 0, total: 0, data });
    },
    { route, data },
  );
const check = async (page: Page, lang: Lang, label: string, bad: string[]) => {
  const s = await measure(page);
  if (s.over > 4 || s.side > 1 || (s.bottom && s.bottom > s.h + 1)) bad.push(`${label}: over ${s.over}, side ${s.side}, bottom ${Math.round(s.bottom)}`);
  if (lang === 'he') {
    const l = await latinOutsideBdi(page);
    if (l.length) bad.push(`${label} latin: ${l.join(' | ')}`);
  }
};

for (const lang of ['en', 'he'] as const) {
  test(`whichpair (${lang}): setup and play fit 320×720, a run reaches the result card`, async ({ page }) => {
    test.setTimeout(180_000);
    const bad: string[] = [];
    await seed(page, lang, 'jazz');
    await open(page, lang, 'whichpair');
    await expect(page.locator('main[data-game="whichpair"]')).toBeVisible();
    await check(page, lang, 'setup', bad);
    await page.locator('[data-ng-start]').click();
    await page.waitForTimeout(500);
    await check(page, lang, 'play', bad);
    for (let k = 0; k < 40 && !(await resultShown(page)); k++) {
      if (await tap(page, '[data-wp-next]')) {
        await page.waitForTimeout(300);
        continue;
      }
      if (await tap(page, '[data-wp-choice]')) {
        await page.waitForTimeout(200);
        await check(page, lang, `answered ${k}`, bad);
        if (k === 0 || k === 1) {
          await tap(page, '[data-why]');
          await page.waitForTimeout(150);
          await check(page, lang, `why ${k}`, bad);
        }
      }
      await page.waitForTimeout(1800);
    }
    await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 5_000 });
    await check(page, lang, 'result', bad);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test(`whichpair mf, f and ff (${lang}): the dense tiers fit 320×720`, async ({ page }) => {
    test.setTimeout(240_000);
    await stubMidi(page);
    const bad: string[] = [];
    await seed(page, lang, 'jazz');
    for (const [lv, input] of [[4, 'touch'], [5, 'touch'], [6, 'midi'], [3, 'touch']] as const) {
      await open(page, lang, 'whichpair');
      await saveRun(page, 'whichpair', { v: 1, game: 'whichpair', seed: 7, level: lv, i: 0, lives: 3, right: 0, wrong: 0, score: 0, streak: 4, bestStreak: 4, input, takes: [] });
      await open(page, lang, 'whichpair');
      await page.locator('main .g2-col .btn.mega').first().click();
      await page.waitForTimeout(800);
      await check(page, lang, `level ${lv}`, bad);
      if (input === 'touch') {
        await tap(page, '[data-wp-choice]');
        await page.waitForTimeout(250);
        await tap(page, '[data-why]');
        await page.waitForTimeout(150);
        await check(page, lang, `level ${lv} answered`, bad);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  for (const [plays, family, level] of [
    ['keys', 'k-tpair', 'k-tpair-1'],
    ['keys', 'k-tpair', 'k-tpair-3'],
    ['keys', 'k-tpair', 'k-tpair-6'],
    ['keys', 'k-tpair', 'k-tpair-7'],
    ['keys', 'k-tpair', 'k-tpair-8'],
    ['keys', 'k-tpair', 'k-tpair-10'],
    ['keys', 'k-tpair', 'k-tpair-11'],
    ['keys', 'k-tpair', 'k-tpair-12'],
    ['keys', 'k-tpair', 'k-tpair-13'],
    ['keys', 'k-tpair', 'k-tpair-15'],
    ['keys', 'k-tpair', 'k-tpair-16'],
    ['guitar', 'g-tpair', 'g-tpair-1'],
    ['guitar', 'g-tpair', 'g-tpair-2'],
    ['guitar', 'g-tpair', 'g-tpair-5'],
    ['guitar', 'g-tpair', 'g-tpair-7'],
    ['bass', 'b-tpair', 'b-tpair-1'],
    ['bass', 'b-tpair', 'b-tpair-3'],
  ] as const)
    test(`${level} run screen fits one screen (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, lang, plays, plays);
      await page.goto('about:blank');
      await page.goto(`/?unlock=all&lang=${lang}#/drills`);
      await page.waitForTimeout(800);
      await page.locator('[data-topic="all"]').click();
      await page.waitForTimeout(400);
      await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
      const card = page.locator(`[data-level="${level}"]`);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
      await page.locator(`[data-level-start="${level}"]`).click();
      await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      await page.waitForTimeout(600);
      const bad: string[] = [];
      const s = await measure(page);
      if (s.over > 2 || s.side > 1) bad.push(`${level}: over ${s.over}, side ${s.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`${level} latin: ${l.join(' | ')}`);
      }
      if (bad.length) await page.screenshot({ path: `test-results/tpair-${lang}-${level}.png`, fullPage: true });
      expect(bad, bad.join('\n')).toEqual([]);
    });
}
