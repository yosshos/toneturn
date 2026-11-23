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

// SPEC-RBI-ROTATION §4: guitar and bass players see the rotating scale on the neck in the current position (a 5-fret
// box, chord tones named, colour notes in the family colour), the next scale previewed as rings when it is announced;
// the lead sheet and the neck fit one phone screen before and during the take, a left-handed neck mirrored.
for (const [inst, lang, extra] of [
  ['guitar', 'he', { tuning: 'standard' }],
  ['bass', 'en', { bassTuning: 'bass' }],
  ['guitar', 'en', { leftHanded: true, tuning: 'drop-d' }],
] as const) {
  test(`the scale on the neck for a ${inst} player${'leftHanded' in extra ? ' (left-handed, drop D)' : ''}, one screen (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    const done = { n: 2, cov: 1, last: '2026-11-20' };
    await seed(page, lang, { rotationTier: 2, courses: ['ear', inst], activeCourse: inst, instrument: inst, rotationStats: { 'ii|dorian': done, 'V-maj|mixolydian': done, 'I|ionian': done }, ...extra });
    await page.goto(`/?unlock=all&lang=${lang}#/improv`);
    // a guitar / bass player's first load also warms the audio pitch input (busy for a while on a cold dev server)
    await expect(page.locator('[data-rs-sheet]')).toBeVisible({ timeout: 60_000 });
    const neck = page.locator(`[data-rs-neck="${inst}"]`);
    await expect(neck).toBeVisible();
    await expect(page.locator('.rs-keys')).toHaveCount(0);
    await expect(neck.locator('svg.neck')).toHaveAttribute('aria-label', /.+/);
    expect(await neck.locator('.neck-dot.rn-root').count()).toBeGreaterThan(0);
    expect(await neck.locator('.neck-dot.rn-chord').count()).toBeGreaterThan(0);
    expect(await neck.locator('.neck-dot').count()).toBeGreaterThanOrEqual(7);
    // the strings: 6 on guitar, 4 on bass; the neck itself left to right inside the Hebrew screen
    await expect(neck.locator('.str')).toHaveCount(inst === 'bass' ? 4 : 6);
    await expect(neck.locator('.neck-wrap')).toHaveAttribute('dir', 'ltr');
    if ('leftHanded' in extra) {
      // mirrored: the low string names sit at the right edge
      const x = Number(await neck.locator('.str-name').first().getAttribute('x'));
      expect(x).toBeGreaterThan(100);
    }
    await fits(page, true);
    if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
    await page.screenshot({ path: `test-results/improv-neck-${inst}${'leftHanded' in extra ? '-lefty' : ''}-${lang}.png` });
    // the take: the neck follows the now-cue; a new scale shows as rings ahead of time; still one screen
    for (let i = 0; i < 8; i++) await page.locator('.rs-controls .ch-step .icon-btn').nth(1).click();
    await page.locator('[data-rs-start]').click();
    await expect(page.locator('[data-rs-cell][data-now="1"]')).toBeVisible({ timeout: 10_000 });
    await fits(page, true);
    let previewed = false;
    for (let k = 0; k < 120 && !previewed; k++) {
      if (await neck.getAttribute('data-rs-neck-next')) previewed = true;
      else await page.waitForTimeout(150);
    }
    expect(previewed).toBe(true);
    expect(await neck.locator('.neck-dot.rn-next, .neck-dot.rn-leaving').count()).toBeGreaterThan(0);
    await fits(page, true);
    await page.screenshot({ path: `test-results/improv-neck-${inst}${'leftHanded' in extra ? '-lefty' : ''}-take-${lang}.png` });
    // a tap on the neck plays into the take
    await neck.locator('.neck-hit').first().click();
    await page.locator('.rs-controls .btn.primary').click();
    // the toggle hides and shows the neck
    await page.locator('[data-rs-keys]').click();
    await expect(neck).toHaveCount(0);
    await page.locator('[data-rs-keys]').click();
    await expect(page.locator(`[data-rs-neck="${inst}"]`)).toBeVisible();
    // the layout (owner 2026-11-24): a narrow screen opens on the position; the choice offers the usual layouts
    // (3 per string on guitar only), keeps one screen, and stays picked after a reload
    await expect(neck).toHaveAttribute('data-rs-neck-shape', 'box');
    const pick = neck.locator('[data-rs-neck-pick]');
    await expect(pick).toHaveAttribute('aria-label', /.+/);
    await expect(pick.locator('option')).toHaveCount(inst === 'bass' ? 2 : 3);
    for (const shape of inst === 'bass' ? ['full'] : ['3nps', 'full']) {
      await pick.selectOption(shape);
      await expect(neck).toHaveAttribute('data-rs-neck-shape', shape);
      expect(await neck.locator('.neck-dot').count()).toBeGreaterThanOrEqual(7);
      await fits(page, true);
      await page.screenshot({ path: `test-results/improv-neck-${inst}-${shape}-${lang}.png` });
    }
    await page.reload();
    await expect(page.locator(`[data-rs-neck="${inst}"]`)).toHaveAttribute('data-rs-neck-shape', 'full', { timeout: 60_000 });
  });
}

test('a wide screen opens the neck on the whole neck, the position lit', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page, 'he', { rotationTier: 2, courses: ['ear', 'guitar'], activeCourse: 'guitar', instrument: 'guitar', tuning: 'standard' });
  await page.goto('/?unlock=all&lang=he#/improv');
  const neck = page.locator('[data-rs-neck="guitar"]');
  await expect(neck).toBeVisible({ timeout: 60_000 });
  await expect(neck).toHaveAttribute('data-rs-neck-shape', 'full');
  expect(await neck.locator('.neck-dot.rn-out').count()).toBeGreaterThan(0);
  expect(await neck.locator('.neck-dot:not(.rn-out)').count()).toBeGreaterThanOrEqual(7);
  await fits(page, true);
  await page.screenshot({ path: 'test-results/improv-neck-wide-he.png' });
});
