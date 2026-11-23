import { expect, test, type Page } from '@playwright/test';

// SPEC-PROGRESS-CHARTS audit (2026-11-23): the Ear course's own areas, charts 4 and 6–9 on the Over time tab, the
// weekly ring and summary in Today, the teacher's class charts (mock snapshot backend) — Hebrew, phone width.

const noSideScroll = async (page: Page, what: string) => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
};

async function seedSnaps(page: Page, ear = false) {
  await page.addInitScript((ear) => {
    const days: Record<string, unknown> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const k = 29 - i;
      days[day] = {
        day,
        status: ear
          ? { 'ear:pitch': { closed: Math.floor(k / 2), learning: 4, almost: 2 }, 'ear:harmony': { closed: Math.floor(k / 4), learning: 3 }, 'ear:rhythm': { closed: Math.floor(k / 5), learning: 2 } }
          : { 'keys:technique': { closed: 4 + Math.floor(k / 2), learning: 6, almost: 3 }, 'keys:harmony': { closed: Math.floor(k / 4), learning: 4 }, 'keys:improv': { closed: Math.floor(k / 6), learning: 3 }, lick: { closed: 2, learning: 2 } },
        ladder: ear ? undefined : { 'keys:technique': { keys12: 2, fingers: k > 20 ? 1 : 0 }, lick: { language: 1 } },
        level: ear ? { 'ear:pitch': 0.3 + k * 0.01, 'ear:harmony': 0.25 + k * 0.005, 'ear:rhythm': 0.4 } : undefined,
        tempo: ear ? {} : { 'keys:technique': 0.55 + k * 0.012, 'keys:harmony': 0.5 + k * 0.006, 'keys:improv': 0.6, lick: 0.45 },
        minutes: k % 7 === 6 ? {} : ear ? { ear: 18, games: 6 } : { technique: 22 + (k > 22 ? 10 : 0), improv: 9, repertoire: 6, ear: 4 },
        channels: { ear: 0.82, reading: 0.3 + k * 0.008 },
        keys: ear ? {} : { 0: Math.min(1, k / 20), 7: Math.min(1, k / 30), 2: k / 60, 9: 0.1 },
        vocab: { played: 3, closed: 2, learned: 1 + Math.floor(k / 10), practice: 1, language: Math.floor(k / 15), encore: 1 },
        practised: k % 7 !== 6,
        ...(ear ? {} : { mix: { ear: 0.18, page: 0.72, memory: 0.1 }, mixTarget: { ear: 0.26, page: 0.62, memory: 0.12 }, improv: { cov: 0.3 + k * 0.01, inScale: k % 2 ? 0.78 : null, map: { 'I|lydian': 0.7, 'V-free|altered': 0.2, 'ii|dorian': 0.55, 'V-free|lydian-dom': 0.4 } } }),
      };
    }
    const req = indexedDB.open('toneturn-snapshots', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => req.result.transaction('kv', 'readwrite').objectStore('kv').put({ v: 1, backfilled: true, earFilled: true, days }, 'all');
  }, ear);
}


/** A keys player past the course start (Today shows its cards), as e2e/styleFocus.spec.ts seeds one. */
async function seedPlayer(page: Page) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const iso = new Date().toISOString();
    const progress = { version: 1, xp: 300, applied: [], lessons: {}, history: [{ lessonId: 'practice-log', lessonVersion: 1, sessionId: 's1', completedAt: iso, firstTry: 1, total: 1, xp: 20, missed: [], course: 'keys' }], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [] };
    const settings = {
      version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', track: 'hobby',
      intake: { v: 1, at: iso, music: 2, singing: 1, theory: 2, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
      courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { ear: { legacy: true }, keys: { legacy: true } }, openers: { course: { ear: iso, keys: iso } }, styleFocus: { keys: { main: 'jazz', also: [] } },
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
  });
}

test('Over time: charts 4, 6–9 (Hebrew phone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSnaps(page);
  await page.goto('/?unlock=all&lang=he#/skills');
  await page.locator('#ps-tab-time').click();
  await expect(page.locator('[data-progress-time="30d"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-tempo-area]').first()).toBeVisible();
  await expect(page.locator('[data-mix-bar]')).toBeVisible();
  await expect(page.locator('[data-planned-split]')).toBeVisible();
  await expect(page.locator('[data-language-chart]')).toBeVisible();
  await expect(page.locator('[data-mode-grid]')).toBeVisible();
  await noSideScroll(page, 'over time');
  await page.screenshot({ path: 'test-results/audit-overtime-he-phone.png', fullPage: true });
  // the area filter: at most 4
  const chips = page.locator('[data-tempo-area]');
  expect(await chips.count()).toBeGreaterThanOrEqual(4);
  // the frame is remembered on this device
  await page.locator('[data-frame="7d"]').click();
  await page.reload();
  await page.locator('#ps-tab-time').click();
  await expect(page.locator('[data-progress-time="7d"]')).toBeVisible({ timeout: 20_000 });
});

test('Over time: the Ear course shows its own areas (Hebrew phone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSnaps(page, true);
  await page.goto('/?unlock=all&lang=he#/skills');
  await page.locator('#ps-tab-time').click();
  await expect(page.locator('[data-course="ear"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-area="ear:pitch"]')).toBeVisible();
  await expect(page.locator('[data-ear-levels]')).toBeVisible();
  await expect(page.locator('[data-area^="keys:"]')).toHaveCount(0);
  await noSideScroll(page, 'ear over time');
  await page.screenshot({ path: 'test-results/audit-overtime-ear-he-phone.png', fullPage: true });
});

test('Today: the weekly ring and the weekly summary (Hebrew phone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSnaps(page);
  await seedPlayer(page);
  await page.goto('/?unlock&lang=he#/');
  await expect(page.locator('[data-today-week]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-weekly-ring]')).toBeVisible();
  await expect(page.locator('[data-weekly-summary]')).toBeVisible();
  await noSideScroll(page, 'today');
  await page.locator('[data-weekly-summary]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/audit-today-weekly-he-phone.png', fullPage: true });
  await page.locator('[data-weekly-close]').click();
  await expect(page.locator('[data-weekly-summary]')).toHaveCount(0);
});

test("teacher: the student's charts, the class median, one assignment across the class, the class radar (Hebrew phone)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('tt.mockTeacher', '1');
    localStorage.setItem('tt.mockSnapshots', '1');
  });
  await page.goto('/?lang=he#/classes');
  const charts = page.locator('[data-class-charts="demo-class"]');
  await expect(charts).toBeVisible({ timeout: 20_000 });
  await charts.locator('[data-student="s4"]').click();
  await expect(charts.locator('[data-minutes-asked]')).toBeVisible();
  await expect(charts.locator('[data-student-over-time="s4"]')).toBeVisible();
  await expect(charts.locator('[data-student-over-time="s4"] [data-median-line]').first()).toBeAttached();
  await noSideScroll(page, 'class page');
  await charts.locator('[data-student-over-time="s4"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/audit-teacher-student-he-phone.png', fullPage: true });
});
