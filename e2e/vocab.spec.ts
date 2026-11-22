import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 4 (Vocabulary): the Licks library with "in my language" and the line families, a lick page
// with its two modes (from the page / by ear) and "use it in improvisation", Improvise with today's lick marked on the
// chart, and the key page's "language in the key" row (block G). One phone screen, Hebrew and English.

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate, [data-streak-sheet]'), async () => {
    await page.locator('.streak-celebrate .btn.mega, [data-streak-continue]').first().click();
  });
});

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const item = (itemId: string, family: string, key: number) => ({ itemId, family, key, hands: 'R', cleanBpm: 90, goalBpm: 90, streak: 0, fails: 0, ewma: { cv: 0.05, sd: 0, vsd: 0, hands: 0, acc: 0.9 }, takes: 2, last: now, history: [], passLog: [] });
    const drillItems = {
      'lick:maj-arp:piano:0': item('lick:maj-arp:piano:0', 'licks', 0),
      'k-bebop:bb-251:0:R:sw:op0': item('k-bebop:bb-251:0:R:sw:op0', 'k-bebop', 0),
    };
    const u = (key: number, session: string) => ({ id: 'maj-arp', key, kind: 'exact', at: now, session });
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], drillItems };
    const settings = {
      version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true,
      intake: { v: 1, at: now, music: 3, singing: 1, theory: 3, reading: 3, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
      courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9',
      lickBook: { uses: [u(0, 'a'), u(5, 'b'), u(5, 'c')] },
    };
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

/** No horizontal page scroll; with `oneScreen`, no vertical scroll either (an exercise fits one phone screen). */
const fits = async (page: Page, oneScreen = false) => {
  const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, ih: innerHeight }));
  expect(m.w).toBeLessThanOrEqual(m.iw + 1);
  if (oneScreen) expect(m.h).toBeLessThanOrEqual(m.ih + 2);
};

for (const lang of ['he', 'en'] as const) {
  test(`Licks: in my language, the lines, a lick page with two modes and "use it in improvisation" (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/licks`);
    await expect(page.locator('[data-licks="lib"]')).toBeVisible();
    await expect(page.locator('[data-licks-tab="transcribe"]')).toHaveText(lang === 'he' ? 'צעדים לאוזן' : 'Ear steps');
    await expect(page.locator('[data-lick-card="maj-arp"] [data-lick-lang]')).toBeVisible();
    await expect(page.locator('[data-lick-card="tx9-1"]')).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `test-results/vocab-library-${lang}.png` });
    // the technique families' lines are licks too (their own chip)
    await page.locator('[data-lick-tab="lines"]').click();
    await expect(page.locator('[data-lick-card="ln-k-bebop-1-0"]')).toBeVisible();
    await page.locator('[data-lick-tab="all"]').click();
    // the lick page
    await page.locator('[data-lick-card="maj-arp"]').click();
    await expect(page.locator('[data-licks="lick"][data-lick="maj-arp"]')).toBeVisible();
    await expect(page.locator('[data-lick-uses="3"][data-lick-use-keys="2"]')).toBeVisible();
    await expect(page.locator('[data-lick-lang]')).toBeVisible();
    await expect(page.locator('[data-lick-practice]')).toBeVisible();
    await expect(page.locator('[data-lick-byear]')).toBeVisible();
    await expect(page.locator('[data-lick-improvise]')).toBeVisible();
    await expect(page.locator('[data-lick-fits]')).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `test-results/vocab-lick-page-${lang}.png` });
    // by ear: the notes hidden until played back right; one phone screen
    await page.locator('[data-lick-byear]').click();
    await expect(page.locator('[data-lick-run="ear"]')).toBeVisible();
    await expect(page.locator('[data-lick-ear="hidden"]')).toBeVisible();
    await fits(page, true);
    await page.screenshot({ path: `test-results/vocab-lick-ear-${lang}.png` });
    await page.locator('.screen-head .icon-btn').first().click();
    // from the page: the notes show
    await page.locator('[data-lick-practice]').click();
    await expect(page.locator('[data-lick-run="practice"]')).toBeVisible();
    await expect(page.locator('[data-lick-ear]')).toHaveCount(0);
    await fits(page, true);
    await page.screenshot({ path: `test-results/vocab-lick-page-mode-${lang}.png` });
    await page.locator('.screen-head .icon-btn').first().click();
    // use it in improvisation: the chart player with today's lick, marked where it fits
    await page.locator('[data-lick-improvise]').click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await expect(page.locator('[data-today-lick="maj-arp"]')).toBeVisible();
    expect(Number(await page.locator('[data-today-lick]').getAttribute('data-lick-fits'))).toBeGreaterThan(0);
    await expect(page.locator('[data-lick-mark="fits"]').first()).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `test-results/vocab-improvise-lick-${lang}.png` });
  });
}

test("Improvise: the Lick mode is today's lick — over a chart, or over the band", async ({ page }) => {
  await seed(page, 'he');
  await page.goto('/?unlock=all&lang=he#/improv');
  await page.locator('[data-is-mode="useit"]').click();
  await expect(page.locator('[data-is-lick]')).toBeVisible();
  await expect(page.locator('[data-is-lick-chart]')).toBeVisible();
  await expect(page.locator('[data-useit]')).toBeVisible();
  await fits(page);
  await page.screenshot({ path: 'test-results/vocab-improv-today-he.png' });
  await page.locator('[data-is-lick-chart]').click();
  await expect(page.locator('[data-chart-player]')).toBeVisible();
  await expect(page.locator('[data-today-lick]')).not.toHaveAttribute('data-today-lick', '');
});

for (const lang of ['he', 'en'] as const) {
  test(`Key page: "language in the key" — the pool's licks in this key (block G) (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.locator('[data-practice-view="key"]').click();
    await page.locator('[data-key-card="3"]').click();
    await expect(page.locator('[data-key-page="3"]')).toBeVisible();
    const row = page.locator('[data-kp-row="lang"]');
    await expect(row).toBeVisible();
    expect(Number(await row.getAttribute('data-kp-licks'))).toBeGreaterThanOrEqual(2);
    await row.locator('.kp-row-head').click();
    await expect(row.locator('[data-kp-lick="maj-arp"]')).toBeVisible();
    await expect(row.locator('[data-kp-lick="ln-k-bebop-1-0"]')).toBeVisible();
    await row.locator('[data-kp-lick="maj-arp"]').scrollIntoViewIfNeeded();
    await fits(page);
    await page.screenshot({ path: `test-results/vocab-key-page-lang-${lang}.png` });
    await row.locator('[data-kp-lick="maj-arp"]').click();
    await expect(page.locator('[data-drill="lick:maj-arp:piano:3"]')).toBeVisible();
    await fits(page, true);
    await page.screenshot({ path: `test-results/vocab-key-lick-run-${lang}.png` });
  });
}
