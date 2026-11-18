import { expect, test, type Page } from '@playwright/test';

// The course and unit openers (src/ui/Opener.tsx, owner 2026-11-18). The course opener plays right after the
// self-report on the course-start screen, once; Skip continues the course start (setup or the taste); every scene fits
// one phone screen (390 × 844) and the wide layout (1280 × 800). The unit opener plays on the first entry into the
// current unit and Start opens the step. Automated runs skip openers unless asked for with ?openers.
// SHOTS=1 also saves each scene's resting frame to docs/openers-shots/ (phone and wide, Hebrew).
const SHOTS = !!process.env.SHOTS;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate, [data-streak-sheet]'), async () => {
    await page.locator('.streak-celebrate .btn.mega, [data-streak-continue]').first().click();
  });
});

async function toReport(page: Page, lang: 'he' | 'en', course = 'ear') {
  await page.goto(`/?sim=1&welcome=1&lang=${lang}&openers=1`);
  await page.locator('[data-ob="start"]').click();
  await page.locator('[data-ob="listen"]').click();
  await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
  await page.locator('[data-ob="taste-0"]').click();
  await page.locator('[data-ob="taste-next"]').click();
  await page.locator(`[data-ob="course-${course}"]`).click();
  await page.locator('[data-ob="courses-next"]').click();
  await expect(page.locator(`[data-course-start="welcome"][data-cs-course="${course}"]`)).toBeVisible();
}

/** Every visible piece of the scene sits inside the film, above the caption band (no scrolling, nothing cut). */
async function sceneFits(page: Page, what: string) {
  const r = await page.evaluate(() => {
    const film = document.querySelector('.o-film') as HTMLElement;
    const fr = film.getBoundingClientRect();
    const scale = fr.height / film.offsetHeight;
    let worst = { bottom: -1e9, top: 1e9, right: -1e9, left: 1e9, el: '' };
    for (const el of Array.from(document.querySelectorAll('.o-scene:not(.o-leave) .a, .o-scene:not(.o-leave) .o-vis > *, .o-scene:not(.o-leave) .o-txt > *')) as HTMLElement[]) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).opacity === '0') continue;
      if (b.bottom > worst.bottom) worst = { ...worst, bottom: b.bottom, el: el.className.toString() };
      worst.top = Math.min(worst.top, b.top);
      worst.right = Math.max(worst.right, b.right);
      worst.left = Math.min(worst.left, b.left);
    }
    return {
      // The film fills the screen exactly and the page behind it is locked.
      over: Math.max(fr.bottom - window.innerHeight, fr.right - window.innerWidth, getComputedStyle(document.documentElement).overflow === 'hidden' ? 0 : 1),
      bottomRoom: (fr.bottom - worst.bottom) / scale,
      top: (worst.top - fr.top) / scale,
      left: worst.left - fr.left,
      right: fr.right - worst.right,
      el: worst.el,
    };
  });
  expect(r.over, `${what}: the film does not scroll`).toBeLessThanOrEqual(0);
  // The caption band (about 80 design px) stays clear; the bar and the segments above stay clear.
  expect(r.bottomRoom, `${what}: content ends above the caption (${r.el})`).toBeGreaterThanOrEqual(76);
  expect(r.top, `${what}: content starts below the bar`).toBeGreaterThanOrEqual(60);
  expect(r.left, `${what}: nothing cut on the left`).toBeGreaterThanOrEqual(-1);
  expect(r.right, `${what}: nothing cut on the right`).toBeGreaterThanOrEqual(-1);
}

/** Jump to every scene, pause on its resting frame, check it fits (and save a shot). */
async function walkScenes(page: Page, kind: 'course' | 'unit', tag: string) {
  const op = page.locator(`[data-opener="${kind}"]`);
  const n = await page.locator('[data-opener-seg]').count();
  expect(n).toBe(kind === 'course' ? 6 : 3);
  if ((await op.getAttribute('data-opener-mode')) === 'playing') await page.locator('[data-opener-pause]').click();
  for (let k = 0; k < n; k++) {
    await page.locator(`[data-opener-seg="${k}"]`).click();
    await expect(op).toHaveAttribute('data-opener-scene', /./);
    await expect(op).toHaveAttribute('data-opener-mode', /paused|ended/);
    const id = await op.getAttribute('data-opener-scene');
    await page.waitForTimeout(700); // the crossfade and the reveal transitions settle
    await sceneFits(page, `${tag} scene ${k + 1} (${id})`);
    if (SHOTS) {
      // The resting frame without the "Resume" veil.
      await page.evaluate(() => document.querySelector('.o-endcard')?.setAttribute('style', 'display:none'));
      await page.screenshot({ path: `docs/openers-shots/${kind}-${tag}-${k + 1}-${id}.png` });
      await page.evaluate(() => document.querySelector('.o-endcard')?.removeAttribute('style'));
    }
  }
}

test.describe('course opener', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('plays after the self-report, every scene fits the phone, Skip continues the course start', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await toReport(page, 'he');
    await page.locator('[data-report="new"]').click();
    const op = page.locator('[data-opener="course"]');
    await expect(op).toBeVisible();
    await expect(op).toHaveAttribute('data-opener-wide', '0');
    // It plays as one film: the first scene moves on to the next by itself.
    await expect(op).not.toHaveAttribute('data-opener-scene', 'hook', { timeout: 20_000 });
    await expect(page.locator('.o-film')).toHaveAttribute('dir', 'rtl');
    await walkScenes(page, 'course', 'phone-he');
    // Where you start: the self-report's rung is marked.
    // Paused, a segment shows that scene's resting frame.
    await page.locator('[data-opener-seg="4"]').click();
    await expect(op).toHaveAttribute('data-opener-scene', 'start');
    await expect(op).toHaveAttribute('data-opener-mode', 'paused');
    await expect(page.locator('.o-rung.here')).toHaveCount(1);
    await page.locator('[data-opener-skip]').click();
    await expect(op).toHaveCount(0);
    // The course start goes on: the Ear course checks headphones first.
    await expect(page.locator('[data-course-start="setup"][data-cs-course="ear"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Start on the last scene opens the course start too; the film never plays twice', async ({ page }) => {
    await toReport(page, 'en');
    await page.locator('[data-report="bit"]').click();
    await page.locator('[data-opener-seg="5"]').click();
    await page.locator('[data-opener-start]').dispatchEvent('click');
    await expect(page.locator('[data-opener]')).toHaveCount(0);
    await expect(page.locator('[data-course-start="setup"]')).toBeVisible();
    // Back to the welcome card and report again: no second film.
    await page.getByRole('button', { name: 'Back' }).first().click();
    await page.locator('[data-report="bit"]').click();
    await expect(page.locator('[data-course-start="setup"]')).toBeVisible();
    await expect(page.locator('[data-opener]')).toHaveCount(0);
  });
});

test.describe('course opener, wide', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('every scene fits the wide layout', async ({ page }) => {
    await toReport(page, 'he');
    await page.locator('[data-report="new"]').click();
    await expect(page.locator('[data-opener="course"]')).toHaveAttribute('data-opener-wide', '1');
    await walkScenes(page, 'course', 'wide-he');
  });
});

/** A fresh player of a course straight on the path (seeded), with openers on. */
async function seedPath(page: Page, lang: 'he' | 'en', course: string, plays: string[]) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, track: 'explorer', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: [course], activeCourse: course, seenVersion: '9.9.9', courseStart: { [course]: { legacy: true } }, openers: { course: { [course]: now } } };
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
}

for (const [vw, vh, tag] of [[390, 844, 'phone-he'], [1280, 800, 'wide-he']] as const)
  test.describe(`unit opener (${tag})`, () => {
    test.use({ viewport: { width: vw, height: vh } });
    test('plays on the first entry into the unit, fits, and Start opens the step; then only from "About this unit"', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await seedPath(page, 'he', 'ear', []);
      await page.goto('/?openers=1#/path');
      await expect(page.locator('[data-course-intro]')).toBeVisible();
      const first = page.locator('.unit-banner.current').first();
      await expect(first).toBeVisible();
      await page.locator('li.node.current .node-btn').first().click();
      const op = page.locator('[data-opener="unit"]');
      await expect(op).toBeVisible();
      await walkScenes(page, 'unit', tag);
      // The steps scene lists the unit's real steps.
      await expect(page.locator('.o-stp').first()).toBeVisible();
      await page.locator('[data-opener-start]').dispatchEvent('click');
      await expect(op).toHaveCount(0);
      // Start replaced the first screen: the step opens (the lesson, or its mini-lesson), not the path again.
      await expect(page.locator('main.lesson, .mini-lesson, [data-mini]').first()).toBeVisible({ timeout: 15_000 });
      // Back on the path: the unit opener does not play again on its own, but "About this unit" replays it.
      await page.goto('/?openers=1#/path');
      await page.locator('li.node.current .node-btn').first().click();
      await expect(op).toHaveCount(0);
      await page.goto('/?openers=1#/path');
      await page.locator('[data-unit-about]').first().click();
      await expect(op).toBeVisible();
      await page.locator('[data-opener-skip]').click();
      await expect(op).toHaveCount(0);
      // And the course page replays the course opener.
      await page.locator('[data-course-intro]').click();
      await expect(page.locator('[data-opener="course"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
