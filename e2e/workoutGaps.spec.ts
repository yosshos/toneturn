import { expect, test, type Page } from '@playwright/test';

// Spec-audit gaps (2026-11-23): one today on the guitar (the workout's technique block runs the matrix coach), the
// technique screen's default view is "part of today's workout" with a link to Today, "continue where I stopped" on
// Today, and the run between blocks (summary, countdown, +2 min).
test.describe.configure({ timeout: 150_000 });

const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function seed(page: Page, o: { course: 'keys' | 'guitar'; lang?: 'en' | 'he'; blocks: unknown[]; local?: Record<string, string> }) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ([o, today]) => {
      const now = new Date().toISOString();
      // one finished lesson: past the first-run "find your level" screen
      const progress = { version: 1, xp: 40, applied: [], lessons: { 'bflat-two-homes': { best: 6, completions: 1, lastAt: now } }, history: [{ lessonId: 'bflat-two-homes', lessonVersion: 1, sessionId: 's1', completedAt: now, firstTry: 5, total: 6, xp: 40, missed: [] }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const lang = o.lang ?? 'en';
      const settings = {
        version: 2,
        uiLang: lang,
        inputLang: lang,
        outputLang: lang,
        mode: 'buttons',
        voiceConsent: true,
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [o.course], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', o.course],
        activeCourse: o.course,
        courseStart: { [o.course]: { legacy: true } },
        ...(o.course === 'guitar' ? { instrument: 'guitar' } : {}),
        seenVersion: '9.9.9',
        workoutToday: { day: today, blocks: o.blocks },
      };
      for (const [k, v] of Object.entries(o.local ?? {})) localStorage.setItem(k, v);
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
    [o, day()] as const,
  );
}

test('guitar: the workout’s technique block runs today’s matrix cells under the coach', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, { course: 'guitar', blocks: [{ id: 'keys-1', target: { kind: 'keys' }, minutes: 15 }, { id: 'improv-1', target: { kind: 'improv', mode: 'improv' }, minutes: 5 }] });
  await page.goto('/?unlock=all');
  await page.locator('.wk-start').click();
  // the run screen for the technique block, then Go: the coach over today's plan (not the opened-levels drills)
  await page.locator('.wk-run .btn.primary').click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 30_000 });
  // the plan was built for the guitar (its own ladder) and kept for the day
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('toneturn.todayKeys') ?? 'null'));
  expect(kept?.inst).toBe('guitar');
  expect(kept?.cells.length).toBeGreaterThan(0);
});

test('technique’s default view is part of today’s workout, linked to Today (no private list)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await seed(page, { course: 'keys', lang: 'he', blocks: [{ id: 'path-1', target: { kind: 'path' }, minutes: 6 }, { id: 'keys-1', target: { kind: 'keys' }, minutes: 17 }, { id: 'improv-1', target: { kind: 'improv', mode: 'improv' }, minutes: 7 }] });
  await page.goto('/?unlock=all#/drills');
  const part = page.locator('[data-today-part="1"].drill-today-part');
  await expect(part).toBeVisible({ timeout: 45_000 });
  await expect(part).toContainText('חלק מהאימון של היום');
  await expect(part.locator('[data-today-cell]').first()).toBeVisible({ timeout: 45_000 });
  await expect(part.locator('[data-through-keys]').first()).toBeVisible();
  await expect(page.locator('.drill-today .drill-level')).toHaveCount(0);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(376);
  // the same cells as the workout's block (one plan, kept for the day)
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('toneturn.todayKeys') ?? 'null'));
  expect(await part.getAttribute('data-today-plan')).toBe(String(kept.cells.length));
  await part.locator('[data-to-today]').click();
  await expect(page.locator('.wk-hero')).toBeVisible();
});

test('Today: continue where I stopped, and the run between blocks (summary, countdown, +2 min)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const today = day();
  const blocks = [{ id: 'practice-1', target: { kind: 'practice' }, minutes: 2 }, { id: 'practice-2', target: { kind: 'practice' }, minutes: 3 }];
  const run = { day: today, blocks, at: 1, used: { 'practice-1': 120000 }, steps: [], items: { 'practice-1': [0, 0] }, between: 'practice-1' };
  await seed(page, {
    course: 'keys',
    blocks,
    local: {
      'toneturn.lastPlace.v1': JSON.stringify({ place: 'improv', hash: '#/improv', title: 'Improvise', at: new Date().toISOString() }),
      'toneturn.slots.v1': JSON.stringify([{ key: `workout:${today}`, title: "Today's workout", route: 'home', done: 1, total: 2, data: run, savedAt: new Date().toISOString() }]),
    },
  });
  await page.goto('/?unlock=all');
  await expect(page.locator('.wk-hero')).toBeVisible({ timeout: 60_000 });
  const cont = page.locator('[data-today-continue]');
  await expect(cont).toBeVisible();
  await expect(cont).toContainText('Continue where I stopped');
  // Continue the workout: the finished block's summary and the countdown (touch pauses it)
  await page.locator('.wk-start').click();
  const between = page.locator('[data-between="practice-1"]');
  await expect(between).toBeVisible();
  await expect(between.locator('[data-block-summary]')).toContainText('2 min');
  await expect(between.locator('[data-run-left]')).toBeVisible();
  await between.locator('h1').click();
  await expect(between.locator('[data-countdown="paused"]')).toBeVisible();
  // +2 min: back to the block that ended, with two more minutes
  await between.locator('[data-more]').click();
  await expect(page.locator('.wk-run .wk-timer')).toHaveText(/^(2:00|1:5\d)$/);
  // reload keeps the run (never lose progress)
  await page.reload();
  await expect(page.locator('.wk-run .wk-timer')).toHaveText(/^(2:00|1:5\d)$/);
});

test('the countdown starts the next block on its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const today = day();
  const blocks = [{ id: 'practice-1', target: { kind: 'practice' }, minutes: 2 }, { id: 'practice-2', target: { kind: 'practice' }, minutes: 3 }];
  const run = { day: today, blocks, at: 1, used: { 'practice-1': 120000 }, steps: [], items: {}, between: 'practice-1' };
  await seed(page, { course: 'keys', blocks, local: { 'toneturn.slots.v1': JSON.stringify([{ key: `workout:${today}`, title: "Today's workout", route: 'home', done: 1, total: 2, data: run, savedAt: new Date().toISOString() }]) } });
  await page.goto('/?unlock=all');
  await page.locator('.wk-start').click({ timeout: 60_000 });
  await expect(page.locator('[data-between]')).toBeVisible();
  await expect(page.locator('[data-between]')).toHaveCount(0, { timeout: 8_000 });
  await expect(page.locator('.wk-run .wk-timer')).toHaveText(/^(3:00|2:5\d)$/);
});
