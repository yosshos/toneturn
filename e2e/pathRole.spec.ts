import { expect, test, type Page } from '@playwright/test';

// SPEC-PATH-ROLE (owner 2026-11-14): the path's three node states (open / opened with a ring of stars / mastered with a
// full gold ring), the unit's "mastered n/m", the what's-missing sheet with one Practice button, the workout's three
// blocks (new / strengthen / review), the "Path: guide me / I choose" setting, and the checkpoint's technique part —
// all on a 320×720 phone with no sideways scroll, in English and Hebrew.
test.use({ viewport: { width: 320, height: 720 } });

type Seed = { lang: 'en' | 'he'; course: 'ear' | 'keys'; facts?: unknown; pathMode?: 'guide' | 'choose' };
const put = async (page: Page, seed: Seed) => {
  await page.evaluate(async ({ lang, course, facts, pathMode }) => {
    const iso = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [], drillItems: {} };
    const settings = {
      version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', miniLessons: false,
      intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays: course === 'keys' ? ['piano'] : [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: true, noMic: true },
      noSing: true, noMic: true, courses: course === 'keys' ? ['ear', 'keys'] : ['ear'], activeCourse: course, drillStart: course === 'keys' ? { scales: 1 } : {},
      ...(facts ? { pathFacts: facts } : {}), ...(pathMode ? { pathMode } : {}),
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
  }, seed);
};
const noSideScroll = async (page: Page, what: string) => {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
};
const noEmoji = async (page: Page) => {
  const text = await page.locator('main').first().innerText();
  expect(/[\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false);
};
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/** Seed the course, read unit 1's steps from the road, then freeze unit 1 with a mastered and an opened step. */
async function seedUnit(page: Page, lang: 'en' | 'he', course: 'ear' | 'keys', pathMode?: 'guide' | 'choose') {
  await page.goto('/manifest.webmanifest');
  await put(page, { lang, course });
  await page.goto(`/?unlock&lang=${lang}#/path`);
  await expect(page.locator('.road [data-step]').first()).toBeVisible();
  // Wait for unit 1 to be frozen as a fact, then read its steps.
  await page.waitForTimeout(400);
  const ids = await page.locator('.road [data-step]').evaluateAll((els) => els.map((e) => e.getAttribute('data-step')!));
  const firstUnit = ids.filter((id) => !/^check:u[2-9]/.test(id));
  const cut = firstUnit.findIndex((id) => id.startsWith('check:u1'));
  const u1 = cut >= 0 ? firstUnit.slice(0, cut + 1) : firstUnit.slice(0, 8);
  const topics = u1.filter((id) => id.startsWith('topic:') || id.startsWith('lesson:'));
  const tech = u1.find((id) => id.startsWith('tech:'));
  const steps: Record<string, unknown> = {};
  const mastered = course === 'keys' ? topics[0] : topics[0];
  const opened = course === 'keys' ? tech! : topics[1];
  steps[mastered] = { stars: 3, at: ago(1), times: 2, firstAt: ago(9) };
  steps[opened] = { stars: 1, at: ago(1), times: 1, firstAt: ago(1) };
  const facts = { units: [{ id: 'u1', n: 1, steps: u1, checked: [], at: ago(10) }], steps };
  // Leave the app first, so it can't save its own settings over the seed.
  await page.goto('/manifest.webmanifest');
  await put(page, { lang, course, facts, pathMode });
  return { u1, mastered, opened };
}

for (const lang of ['en', 'he'] as const) {
  test(`path: open / opened / mastered nodes, unit mastery and the what's-missing sheet (${lang})`, async ({ page }) => {
    const { mastered, opened } = await seedUnit(page, lang, 'ear');
    await page.goto(`/?unlock&lang=${lang}#/path`);
    const m = page.locator(`.road [data-step="${mastered}"]`);
    const o = page.locator(`.road [data-step="${opened}"]`);
    await expect(m).toHaveAttribute('data-node-state', 'mastered');
    await expect(m).toHaveAttribute('data-mstars', '5');
    await expect(o).toHaveAttribute('data-node-state', 'opened');
    await expect(o.locator('.node-disc.has-ring')).toBeVisible();
    await expect(page.locator('.road [data-node-state="open"]').first()).toBeVisible();
    // The unit header: "mastered 1/n" with a ring (never a seal before every step is at 5★ and the checkpoint passed).
    const banner = page.locator('.unit-banner').first();
    await expect(banner.locator('[data-unit-mastered="1"]')).toBeVisible();
    await expect(banner.locator('.unit-ring')).toBeVisible();
    await expect(banner.locator('[data-unit-sealed]')).toHaveCount(0);
    await noSideScroll(page, 'path');
    await page.screenshot({ path: `test-results/path-role-nodes-${lang}.png` });
    // Tapping an opened step shows what is missing, with one Practice button.
    await o.locator('.node-btn').click();
    const sheet = page.locator(`[data-missing-sheet="${opened}"]`);
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-missing-kind', 'ear');
    await expect(sheet.locator('[data-missing-text]')).not.toBeEmpty();
    await expect(sheet.locator('[data-missing-practice]')).toHaveCount(1);
    await noSideScroll(page, 'sheet');
    const box = await sheet.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    await sheet.screenshot({ path: `test-results/path-role-sheet-${lang}.png` });
    await noEmoji(page);
    await sheet.locator('[data-missing-practice]').click();
    await expect(sheet).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).hash).not.toBe('#/path');
  });

  test(`workout: review, new and strengthen blocks; the setting "I choose" drops New (${lang})`, async ({ page }) => {
    await seedUnit(page, lang, 'ear');
    await page.goto(`/?unlock&lang=${lang}#/workout`);
    const kinds = await page.locator('.wk-block').evaluateAll((els) => els.map((e) => e.getAttribute('data-block')));
    expect(kinds).toContain('path');
    expect(kinds).toContain('strengthen');
    expect(kinds).toContain('warmup');
    await noSideScroll(page, 'workout editor');
    await page.screenshot({ path: `test-results/path-role-workout-${lang}.png` });
    // Settings → My path: Path — guide me / I choose (default guide me).
    await page.goto(`/?unlock&lang=${lang}#/settings/learning`);
    const mode = page.locator('[data-path-mode]');
    await expect(mode).toHaveAttribute('data-path-mode', 'guide');
    await page.locator('[data-path-mode-opt="choose"]').click();
    await expect(mode).toHaveAttribute('data-path-mode', 'choose');
    await expect(page.locator('[data-path-mode-opt="choose"]')).toHaveAttribute('aria-checked', 'true');
    await noSideScroll(page, 'settings');
    await page.goto(`/?unlock&lang=${lang}#/workout`);
    await expect(page.locator('.wk-block').first()).toBeVisible();
    const kinds2 = await page.locator('.wk-block').evaluateAll((els) => els.map((e) => e.getAttribute('data-block')));
    expect(kinds2).not.toContain('path');
    expect(kinds2).toContain('strengthen');
  });
}

test('keys: an opened technique step names its missing keys and tempo; Practice plays exactly those', async ({ page }) => {
  const { opened } = await seedUnit(page, 'en', 'keys');
  await page.goto('/?unlock&lang=en#/path');
  const o = page.locator(`.road [data-step="${opened}"]`);
  await expect(o).toHaveAttribute('data-node-state', 'opened');
  await o.locator('.node-btn').click();
  const sheet = page.locator(`[data-missing-sheet="${opened}"]`);
  await expect(sheet).toHaveAttribute('data-missing-kind', 'tech');
  await expect(sheet.locator('[data-missing-text]')).toContainText(/Missing: .+ at ♩\d+/);
  await noSideScroll(page, 'tech sheet');
  await sheet.locator('[data-missing-practice]').click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
});

test('keys: a unit waiting for its checkpoint — the checkpoint opens with its technique part and the next unit is open', async ({ page }) => {
  await page.goto('/manifest.webmanifest');
  await put(page, { lang: 'en', course: 'keys' });
  await page.goto('/?unlock&lang=en#/path');
  await expect(page.locator('.road [data-step]').first()).toBeVisible();
  await page.waitForTimeout(400);
  const ids = await page.locator('.road [data-step]').evaluateAll((els) => els.map((e) => e.getAttribute('data-step')!));
  // A technique-only unit: its checkpoint is the technique part alone (the unit's levels in random keys at the target).
  const tech = ids.filter((id) => id.startsWith('tech:')).slice(0, 3);
  expect(tech.length).toBeGreaterThan(0);
  const u1 = [...tech, 'check:u1'];
  const steps = Object.fromEntries(tech.map((id) => [id, { stars: 1, at: ago(1), times: 1, firstAt: ago(1) }]));
  await page.goto('/manifest.webmanifest');
  await put(page, { lang: 'en', course: 'keys', facts: { units: [{ id: 'u1', n: 1, steps: u1, checked: [], at: ago(3) }], steps } });
  await page.goto('/?unlock&lang=en#/path');
  // Not a gate: unit 1 is past, its checkpoint stays open with a "Rank up" tag, and the next unit is current.
  const chk = page.locator('.road [data-step="check:u1"]');
  await expect(chk.locator('[data-promo]')).toBeVisible();
  await expect(page.locator('.road .node.current')).toBeVisible();
  await noSideScroll(page, 'pending checkpoint');
  // The checkpoint of a technique-only unit opens straight on its technique part.
  await page.goto('/?unlock&lang=en#/path');
  await chk.locator('.node-btn').click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await noSideScroll(page, 'checkpoint technique part');
  await page.screenshot({ path: 'test-results/path-role-checkpoint-tech.png' });
});
