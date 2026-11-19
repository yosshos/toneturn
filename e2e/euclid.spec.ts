import { expect, test, type Page } from '@playwright/test';

// Owner 2026-11-19: the Euclid game (a round set by ear on the circle, through to the result card) and the new topics'
// question screens (Messiaen's modes, twelve-tone rows, Euclidean rhythms) on a 390-wide phone in Hebrew: one screen,
// no scroll. Saves docs/fresh-shots/euclid-he.png and docs/fresh-shots/posttonal-he.png. E2E_BASE: another dev server.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear'], activeCourse: 'ear', seenVersion: '9.9.9' };
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
  });
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
/** A saved run resumes there (never-lose-progress): the last items of a run at a level. */
const saveRun = (page: Page, data: unknown) =>
  page.evaluate(async (data) => {
    const path = '/src/storage/resume.ts';
    const m = await import(/* @vite-ignore */ path);
    m.saveSlot('game:euclid', { title: 'euclid', route: 'euclid', done: 0, total: 0, data });
  }, data);
/** The right slots of the current item (the engine, in the page). */
const target = (page: Page, s: { seed: number; level: number; i: number }) =>
  page.evaluate(async (s) => {
    const path = '/src/engine/euclid.ts';
    const m = await import(/* @vite-ignore */ path);
    const it = m.euclidItem(s.seed, s.level, s.i);
    return m.onsetsOf(it.pattern) as number[];
  }, s);

test('Euclid (he): a round set by ear on the circle reaches the result card; one screen', async ({ page }) => {
  test.setTimeout(240_000);
  await seed(page);
  await page.goto('/?unlock=all&lang=he#/euclid');
  await expect(page.locator('main[data-game="euclid"][data-phase="setup"]')).toBeVisible();
  expect(await problems(page)).toEqual([]);
  const run = { v: 1, game: 'euclid', seed: 11, level: 2, i: 5, right: 4, wrong: 1, score: 96 };
  await saveRun(page, run);
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=he#/euclid');
  await page.locator('main .g2-col .btn.mega').first().click();
  const bad: string[] = [];
  let shot = false;
  for (let i = run.i; i < 8; i++) {
    await expect(page.locator('main[data-game="euclid"][data-phase="build"]')).toBeVisible({ timeout: 30_000 });
    for (const s of await target(page, { ...run, i })) await page.locator(`[data-rc-slot="${s}"]`).click();
    bad.push(...(await problems(page)).map((p) => `build ${i}: ${p}`));
    if (!shot) {
      await page.screenshot({ path: 'docs/fresh-shots/euclid-he.png' });
      shot = true;
    }
    await page.locator('[data-eu-check]').click();
    await expect(page.locator('main[data-game="euclid"]')).toHaveAttribute('data-phase', /answered|listen|build|over/);
    await expect(page.locator('[data-ng-feedback="ok"]').first()).toBeVisible();
  }
  await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 10_000 });
  expect(bad).toEqual([]);
});

test('Euclid (he): the tap tier shows the pad with the count-in and the now-cue', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page);
  await page.goto('/?unlock=all&lang=he#/euclid');
  await saveRun(page, { v: 1, game: 'euclid', seed: 3, level: 6, i: 0, right: 0, wrong: 0, score: 0 });
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=he#/euclid');
  await page.locator('main .g2-col .btn.mega').first().click();
  await expect(page.locator('main[data-game="euclid"][data-phase="listen"]')).toBeVisible();
  await expect(page.locator('.rc-now')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('main[data-game="euclid"][data-phase="tap"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-eu-pad]').dispatchEvent('pointerdown');
  expect(await problems(page)).toEqual([]);
  await expect(page.locator('main[data-game="euclid"][data-phase="answered"]')).toBeVisible({ timeout: 20_000 });
});

test('the new topics (he): every level fits one screen; a twelve-tone question shot', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
    await page.locator('.sheet-backdrop .btn.ghost').first().click();
  });
  const bad: string[] = [];
  for (const topic of ['twelve-tone', 'messiaen-modes', 'euclid-rhythms'])
    for (const l of [1, 2, 3, 4]) {
      await page.goto('about:blank');
      await page.goto(`/?sim=1&brief=1&lang=he#/topic/${topic}/${l}`);
      await page.locator('main.lesson').waitFor({ timeout: 15_000 });
      await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (topic === 'twelve-tone' && l === 1) await page.screenshot({ path: 'docs/fresh-shots/posttonal-he.png' });
      if (topic === 'euclid-rhythms' && l === 3) await expect(page.locator('[data-cycle-build]')).toBeVisible();
      if (topic === 'euclid-rhythms') await page.screenshot({ path: `test-results/eu-he-euclid-${l}.png` });
      const p = await problems(page);
      if (p.length) {
        bad.push(`${topic} L${l}: ${p.join(', ')}`);
        await page.screenshot({ path: `test-results/eu-he-${topic}-${l}.png`, fullPage: true });
      }
    }
  expect(bad).toEqual([]);
});
