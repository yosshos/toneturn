import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 6, "Channels, visible" (SPEC-EAR-AND-READING §2–§4, §8, §8a; SPEC-PROGRESS-CHARTS §3, §4,
// §8): presentation by mastery in a technique run (the notation fades, "Show notes" always there), the week's channel
// mix and the daily sight dose on the technique hub, the two self-ratings at the course start, the level test's two
// channel checks, the skill map's ear / reading axes from take channels, and the teacher charts on the class page
// (mocked backend). One phone screen, Hebrew and English.
test.use({ viewport: { width: 390, height: 844 } });

const fits = async (page: Page, what: string) => {
  const over = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
  expect(over, `${what} fits one phone screen`).toBeLessThanOrEqual(4);
};
const noSideScroll = async (page: Page, what: string) => {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
};

/** A pianist whose C-position scale (right hand) is closed in G, D, A and E — the pattern is known (≥ 3 keys). */
async function seed(page: Page, lang: 'en' | 'he', extra: Record<string, unknown> = {}, settingsExtra: Record<string, unknown> = {}) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, extra, settingsExtra }) => {
      const now = new Date();
      const iso = now.toISOString();
      const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
      const drillItems: Record<string, unknown> = { ...extra };
      for (const k of [7, 2, 9, 4]) {
        const id = `scales:scale:${k}:R:o1`;
        drillItems[id] = {
          itemId: id, family: 'scales', key: k, hands: 'R', cleanBpm: 90, goalBpm: 90, streak: 0, fails: 0,
          ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.98 }, takes: 6, last: ago(1), history: [{ at: ago(1), bpm: 90, cv: 0.03 }], targetBpm: 83,
          passLog: [{ at: ago(3), bpm: 88 }, { at: ago(3), bpm: 88 }, { at: ago(1), bpm: 90 }],
        };
      }
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [], drillItems };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, headphones: true, intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays: ['piano'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drillStart: { scales: 1 }, ...settingsExtra };
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
    { lang, extra, settingsExtra },
  );
}

for (const lang of ['en', 'he'] as const) {
  test(`technique run: the notation fades by mastery, Show notes brings it back (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    // the hub: the week's channel mix and today's sight dose
    await expect(page.locator('[data-channel-mix]')).toBeVisible();
    await expect(page.locator('[data-sight-dose="open"]')).toBeVisible();
    await page.screenshot({ path: `test-results/channels-hub-${lang}.png` });
    await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
    // level 1 is passed (3 keys at the target), so the family opens on level 2: open level 1
    if (!(await page.locator('[data-level-start="scales-1"]').isVisible())) await page.locator('[data-level="scales-1"]').click();
    await page.locator('[data-level-start="scales-1"]').click();
    // C, right hand: new here, but the pattern is closed in 4 other keys → the name only (or the week's ear / memory)
    const faded = page.locator('[data-fade]');
    await expect(faded).toBeVisible();
    expect(['name', 'none', 'full']).toContain(await faded.getAttribute('data-fade'));
    await expect(page.locator('[data-show-notes]')).toBeVisible();
    await fits(page, `faded take (${lang})`);
    await noSideScroll(page, 'faded take');
    await page.screenshot({ path: `test-results/channels-faded-${lang}.png` });
    await page.locator('[data-show-notes]').click();
    await expect(page.locator('[data-fade]')).toHaveCount(0);
    await expect(page.locator('.drill-run svg').first()).toBeVisible();
    await fits(page, `notes shown (${lang})`);
    await page.screenshot({ path: `test-results/channels-shown-${lang}.png` });
  });

  test(`daily sight dose: one new reading exercise, at sight (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.locator('[data-sight-dose="open"]').click();
    const run = page.locator('[data-drills="run"] [data-drill^="k-read:"]');
    await expect(run).toBeVisible();
    // no listening before a sight take: the Listen button is not offered
    await expect(page.locator('.drill-run [data-hear], .drill-run .hear-btn')).toHaveCount(0);
    await fits(page, `sight dose (${lang})`);
    await page.screenshot({ path: `test-results/channels-sight-${lang}.png` });
  });

  test(`course start: two self-ratings when choosing an instrument (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&welcome=1&lang=${lang}`);
    await page.locator('[data-ob="start"]').click();
    await page.locator('[data-ob="listen"]').click();
    await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
    await page.locator('[data-ob="taste-0"]').click();
    await page.locator('[data-ob="taste-next"]').click();
    await page.locator('[data-ob="course-keys"]').click();
    await page.locator('[data-ob="courses-next"]').click();
    await page.locator('[data-report="bit"]').click();
    const r = page.locator('[data-course-start="ratings"][data-cs-course="keys"]');
    await expect(r).toBeVisible();
    await r.locator('[data-cs-rate="ear"] [data-rate="5"]').click();
    await r.locator('[data-cs-rate="reading"] [data-rate="2"]').click();
    await expect(r.locator('[data-cs-rate="ear"]')).toHaveAttribute('data-cs-rate-value', '5');
    await fits(page, `ratings (${lang})`);
    await noSideScroll(page, 'ratings');
    await page.screenshot({ path: `test-results/channels-ratings-${lang}.png` });
    await r.locator('[data-cs-ratings-done]').click();
    await expect(page.locator('[data-course-start="setup"], [data-opener]').first()).toBeVisible();
  });

  test(`level test: the two channel checks after the sections (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&lang=${lang}#/drills`);
    await page.locator('[data-drills-test]').click();
    await expect(page.locator('[data-lt-checks]')).toBeVisible();
    await page.locator('[data-test-start]').click();
    for (let k = 0; k < 30; k++) {
      if (await page.locator('[data-test-check]').isVisible()) break;
      await page.locator('[data-test-too-hard]').click();
    }
    const ear = page.locator('[data-test-check="ear"]');
    await expect(ear).toBeVisible();
    await expect(ear.locator('[data-ear-card]')).toBeVisible();
    await fits(page, `ear check (${lang})`);
    await page.screenshot({ path: `test-results/channels-check-ear-${lang}.png` });
    await page.locator('[data-test-too-hard]').click();
    const sight = page.locator('[data-test-check="sight"]');
    await expect(sight).toBeVisible();
    await fits(page, `sight check (${lang})`);
    await page.screenshot({ path: `test-results/channels-check-sight-${lang}.png` });
    await page.locator('[data-test-too-hard]').click();
    await expect(page.locator('[data-level-test-done]')).toBeVisible();
  });

  test(`skill map: reading measured from sight takes, by ear empty without fresh ear takes (${lang})`, async ({ page }) => {
    const id = 'k-read:kr-five:0:R:op200';
    await seed(page, lang, { [id]: { itemId: id, family: 'k-read', key: 0, hands: 'R', cleanBpm: 60, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.9 }, takes: 12, last: new Date().toISOString(), history: [], channels: { 'page-sight': { n: 12, clean: 9, best: 60 } } } });
    await page.goto(`/?unlock=all&lang=${lang}#/skills`);
    await page.locator('#ps-tab-skills').click();
    await expect(page.locator('[data-skillmap-course="keys"]')).toBeVisible();
    await expect(page.locator('[data-axis="reading"]')).toHaveAttribute('data-axis-v', '75');
    await expect(page.locator('[data-axis="byear"]')).toHaveAttribute('data-axis-v', '');
    await page.locator('[data-axis="reading"]').click();
    await expect(page.locator('[data-section-measured="reading"]')).toBeVisible();
    await noSideScroll(page, 'skill map');
    await page.screenshot({ path: `test-results/channels-skillmap-${lang}.png`, fullPage: true });
  });

  test(`class page: teacher charts and the median switch with a mocked backend (${lang})`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tt.mockTeacher', '1');
      localStorage.setItem('tt.mockSnapshots', '1');
      // the student's own daily snapshots (for the Over time tab)
      const days: Record<string, unknown> = {};
      const today = new Date();
      for (let i = 27; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const k = 27 - i;
        days[day] = { day, status: { 'keys:technique': { closed: Math.floor(k / 2), learning: 6 } }, tempo: { 'keys:technique': 0.5 + k * 0.012 }, minutes: { technique: 20, improv: 8 }, channels: { ear: 0.8, reading: 0.35 }, keys: { 0: k / 30 }, vocab: { played: 2, closed: 1 }, practised: true };
      }
      const req = indexedDB.open('toneturn-snapshots', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => req.result.transaction('kv', 'readwrite').objectStore('kv').put({ v: 1, backfilled: true, days }, 'all');
    });
    await page.goto(`/?lang=${lang}#/classes`);
    const charts = page.locator('[data-class-charts="demo-class"]');
    await expect(charts).toBeVisible({ timeout: 20_000 });
    await expect(charts.locator('[data-class-progress="4"]')).toBeVisible();
    await expect(charts.locator('.tp-card')).toHaveCount(4);
    const sw = page.locator('[data-median-switch]');
    await expect(sw).toHaveAttribute('data-median-switch', 'off');
    await sw.locator('input').check();
    await expect(sw).toHaveAttribute('data-median-switch', 'on');
    // a student's card opens "since the last lesson" for that student
    await charts.locator('[data-student="s2"]').click();
    await expect(charts.locator('.since-card')).toBeVisible();
    await expect(charts.locator('[data-since-area="keys:technique"]')).toBeVisible();
    await noSideScroll(page, 'class page');
    await charts.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/channels-class-${lang}.png`, fullPage: true });
    // the student's Over time tab: a grey class-median line once the teacher turned it on
    await page.goto(`/?unlock=all&lang=${lang}#/skills`);
    await page.locator('#ps-tab-time').click();
    await expect(page.locator('[data-progress-time="30d"], [data-progress-time="7d"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-median-line]').first()).toBeVisible();
    await expect(page.locator('[data-median-mark]').first()).toBeAttached();
    await expect(page.locator('.since-card')).toBeAttached();
    await page.screenshot({ path: `test-results/channels-median-${lang}.png`, fullPage: true });
  });
}
