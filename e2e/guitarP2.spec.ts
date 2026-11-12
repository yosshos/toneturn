import { expect, test, type Page } from '@playwright/test';

// GUITAR_DEEPENING P2: the chord finder (Tools), Chord Rush played (strum it), mixed-meter tab and a whole standard's
// chart — each on one phone screen (390×844), no emoji. Seeded as a returning guitar player with the jazz and prog
// add-ons. Chromium's fake microphone feeds the listening screens (nothing is named from its beep: never a guess).
// Listening uses Chromium's fake microphone; the suite denies the microphone unless a test grants it.
test.use({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });

const seed = async (page: Page, lang: 'en' | 'he' = 'en') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['guitar'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'guitar'], activeCourse: 'guitar', seenVersion: '9.9.9', drills: { guitarAddOns: ['jazz', 'prog'] } };
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
const fits = async (page: Page, what: string) => {
  const { sh, ih, sw, iw } = await page.evaluate(() => {
    // The test-only "simulated" banner is not part of the real screen.
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  });
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
  expect(sh, `${what}: one screen`).toBeLessThanOrEqual(ih + 2);
};
const noEmoji = async (page: Page) => {
  const text = await page.locator('main').first().innerText();
  expect(/[\u{1F300}-\u{1FAFF}]/u.test(text), text.slice(0, 200)).toBe(false);
};

for (const lang of ['en', 'he'] as const) {
  test(`chord finder: strum → name and name → shapes on one screen (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/chordfinder`);
    await expect(page.locator('[data-tool="chordfinder"]')).toBeVisible();
    await noEmoji(page);
    await fits(page, 'idle');
    await page.locator('.cf-go').click();
    await expect(page.locator('.cf-go[aria-pressed="true"]')).toBeVisible();
    await page.waitForTimeout(1500);
    await fits(page, 'listening');
    await page.screenshot({ path: `test-results/chordfinder-listen-${lang}.png` });
    await page.locator('.cf-tabs [role="tab"]').nth(1).click();
    await page.locator('.cf-pick [role="radio"]', { hasText: /^F$/ }).click();
    await page.locator('.cf-pick.q [role="radio"]', { hasText: /^maj7$/ }).click();
    await expect(page.locator('.cf-title b')).toHaveText('Fmaj7');
    expect(await page.locator('.cf-shape').count()).toBeGreaterThanOrEqual(2);
    await page.locator('.cf-pick.q [role="radio"]', { hasText: /^sus2$/ }).click();
    await fits(page, 'shapes');
    await page.screenshot({ path: `test-results/chordfinder-shapes-${lang}.png` });
  });
}

test('the Practice tools row offers the chord finder in the guitar course', async ({ page }) => {
  await seed(page);
  await page.goto('/?unlock=all#/arcade');
  await expect(page.locator('[data-hub="chordfinder"]')).toBeVisible();
});

test('Chord Rush played: strum it — its own levels, a chord name and the listening line on one screen', async ({ page }) => {
  await seed(page);
  await page.goto('/?unlock=all#/rush-chord');
  await page.getByRole('radio', { name: 'Strum it' }).click();
  await expect(page.locator('.rush-lvl')).toHaveCount(5);
  await expect(page.locator('.rush-lvl-name')).toBeVisible();
  await fits(page, 'setup');
  await page.locator('.rush-card .btn.primary').click();
  await expect(page.locator('.rush-target b')).toBeVisible();
  await expect(page.locator('.rush-listen')).toBeVisible();
  await noEmoji(page);
  await fits(page, 'play');
  await page.screenshot({ path: 'test-results/rush-played.png' });
  // Skip counts as a miss and shows the shape.
  await page.locator('.rush-strum-actions button').click();
  await expect(page.locator('.rush-pic .chord-box')).toBeVisible();
  await fits(page, 'miss');
});

test('mixed-meter tab: bar lines and signatures per bar (g-prog 3); a whole standard comped (g-jazz 13)', async ({ page }) => {
  await seed(page);
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="g-prog"]').click();
  await page.locator('[data-level="g-prog-3"]').click();
  await page.locator('[data-level-start="g-prog-3"], [data-level="g-prog-3"] ~ * [data-level-start]').first().click();
  const tab = page.locator('.drill-tab').first();
  await expect(tab).toBeVisible();
  const bars = await tab.getAttribute('data-tab-bars');
  expect(bars, 'the tab lines follow the time map').toBeTruthy();
  expect(new Set(bars!.split(/[ |]+/).filter(Boolean)).size, bars!).toBeGreaterThan(1);
  await fits(page, 'g-prog 3 drill');
  await page.screenshot({ path: 'test-results/tab-mixed.png' });
  await page.locator('.screen-head .icon-btn').first().click();
  await page.locator('.screen-head .icon-btn').first().click();
  await page.locator('[data-family="g-jazz"]').click();
  await page.locator('[data-level="g-jazz-13"]').click();
  await page.locator('[data-level-start="g-jazz-13"], [data-level="g-jazz-13"] ~ * [data-level-start]').first().click();
  await expect(page.locator('.drill-take')).toBeVisible();
  await fits(page, 'g-jazz 13 drill');
  await page.screenshot({ path: 'test-results/comp-chart.png' });
});
