import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 5 (Improvise + RBI v1): Improvise opens on the scale rotation — the lead sheet in colour
// with the scale over every chord (a colour AND a tag per family), the T1–2 subs, the "next" chip; a take with the
// count-in, the click and the now-cue on the sheet, then the colour coverage per chord. One phone screen, Hebrew and
// English; the piece page's "Improvise on it" brings its chart to the rotation.

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate, [data-streak-sheet]'), async () => {
    await page.locator('.streak-celebrate .btn.mega, [data-streak-continue]').first().click();
  });
});

const seed = async (page: Page, lang: 'en' | 'he', extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], drillItems: {} };
      const settings = {
        version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true,
        intake: { v: 1, at: now, music: 3, singing: 1, theory: 3, reading: 3, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9',
        ...extra,
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
    },
    { lang, extra },
  );
};

/** No horizontal page scroll; with `oneScreen`, no vertical scroll either (an exercise fits one phone screen). */
const fits = async (page: Page, oneScreen = false) => {
  const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, ih: innerHeight }));
  expect(m.w).toBeLessThanOrEqual(m.iw + 1);
  if (oneScreen) expect(m.h).toBeLessThanOrEqual(m.ih + 2);
};

/** Latin letters outside an LTR isolate on a Hebrew screen (note and chord names must sit in <bdi dir="ltr">). */
const latinLeft = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const root = document.querySelector('[data-rs]') ?? document.body;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('bdi, svg, select, [aria-hidden="true"], script, style')) continue;
      if (/[A-Za-z]/.test(n.textContent ?? '')) out.push((n.textContent ?? '').trim());
    }
    return out;
  });

for (const lang of ['he', 'en'] as const) {
  test(`Improvise opens on the scale rotation: the lead sheet in colour, tags, the next chip, one screen (${lang})`, async ({ page }) => {
    await seed(page, lang, { rotationTier: 2 });
    await page.goto(`/?unlock=all&lang=${lang}#/improv`);
    await expect(page.locator('[data-improv-studio]')).toBeVisible();
    await expect(page.locator('[data-is-mode="scales"]')).toHaveAttribute('aria-selected', 'true');
    const sheet = page.locator('[data-rs-sheet]');
    await expect(sheet).toBeVisible();
    // every chord shows its scale with a family tag (colour is never the only cue)
    const cells = page.locator('[data-rs-cell]');
    expect(await cells.count()).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < (await cells.count()); i++) {
      await expect(cells.nth(i).locator('.rs-sym bdi')).toHaveAttribute('dir', 'ltr');
      await expect(cells.nth(i).locator('.rs-tag')).not.toHaveText('');
    }
    await expect(page.locator('[data-rs-next]')).toBeVisible();
    await expect(page.locator('[data-rs-tier-pick="2"]')).toHaveAttribute('aria-checked', 'true');
    // the turnaround at T1: the VI7 sub shown above Am7, with the harmonic-minor family (HM5)
    await page.locator('[data-rs-tier-pick="1"]').click();
    await page.locator('[data-rs-src]').selectOption('lv:6');
    const sub = page.locator('.rs-cell .rs-sub bdi').first();
    await expect(sub).toHaveText('A7');
    await expect(page.locator('.rs-cell.fam-harmonic').first()).toBeVisible();
    await page.locator('[data-rs-src]').selectOption('lv:4');
    // the chord-scale tag's contrast: dark ink on the family tint
    const ink = await page.locator('.rs-tag').first().evaluate((el) => getComputedStyle(el).color);
    expect(ink).toBe('rgb(16, 19, 28)');
    await fits(page, true);
    if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
    await page.screenshot({ path: `test-results/improv-leadsheet-${lang}.png` });
  });
}

test('a take: count-in, the click, the now-cue on the sheet, then the colour coverage per chord (he)', async ({ page }) => {
  test.setTimeout(120_000);
  // the plain scales already played: this take rotates in coloured ones (altered / half-whole over G7, Lydian…)
  const done = { n: 2, cov: 1, last: '2026-11-20' };
  await seed(page, 'he', { rotationTier: 2, rotationStats: { 'ii|dorian': done, 'V-maj|mixolydian': done, 'I|ionian': done } });
  await page.goto('/?unlock=all&lang=he#/improv');
  await expect(page.locator('[data-rs-sheet]')).toBeVisible();
  // a quicker take: up the tempo
  for (let i = 0; i < 6; i++) await page.locator('.rs-controls .ch-step .icon-btn').nth(1).click();
  if (!(await page.locator('.rs-keys').isVisible())) await page.locator('[data-rs-keys]').click();
  await page.locator('[data-rs-start]').click();
  // the count-in (dashed dots), then the now-cue walks the sheet
  await expect(page.locator('.rot .ng-beats')).toBeVisible();
  await expect(page.locator('[data-rs-cell][data-now="1"]')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: 'test-results/improv-take-now-he.png' });
  const keys = page.locator('.rs-keys .is-key');
  // play through the take: notes of the scale and a few around it
  for (let k = 0; k < 40; k++) {
    if (!(await page.locator('[data-rs-cell][data-now="1"]').count())) break;
    await keys.nth([0, 4, 7, 11, 1, 3, 8, 10, 2, 5][k % 10] + 12).dispatchEvent('pointerdown');
    await page.waitForTimeout(260);
  }
  await expect(page.locator('[data-rs-result]')).toBeVisible({ timeout: 40_000 });
  const cov = Number(await page.locator('[data-rs-colour]').getAttribute('data-rs-colour'));
  expect(cov).toBeGreaterThanOrEqual(0);
  expect(await page.locator('.rs-cell.hit, .rs-cell.miss').count()).toBeGreaterThan(0);
  await fits(page);
  await page.screenshot({ path: 'test-results/improv-take-result-he.png' });
});

test('Phrase shows the scales it grades against; the piece page brings its chart to the rotation', async ({ page }) => {
  await seed(page, 'en');
  await page.goto('/?unlock=all&lang=en#/improv');
  await page.locator('[data-is-mode="phrasing"]').click();
  await expect(page.locator('[data-rs-strip]')).toBeVisible();
  await page.goto('/?unlock=all&lang=en#/repertoire/t/2/p/rep%3Akeys%3Ablues-basic');
  await page.locator('[data-rep-action="improvise"]').click();
  await expect(page.locator('[data-improv-studio]')).toBeVisible();
  await page.locator('[data-is-mode="scales"]').click();
  await expect(page.locator('[data-rs-src]')).toHaveValue('piece:');
  await expect(page.locator('[data-rs-sheet]')).toBeVisible();
});
