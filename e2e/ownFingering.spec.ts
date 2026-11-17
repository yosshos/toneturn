import { expect, test, type Page } from '@playwright/test';

// Studio look, stage 3: the next key's finger on a slim keyboard while a fingered piano item is played; "Other
// fingering?" on the review opens a sheet that marks the item and takes the player's own numbers; both at 320×720.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/screens-shots/${name}.png` });
};

// a pianist (fingering shown); a copy of feedbackUi.spec's seed (importing it would run that whole suite)
const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills };
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

const openScales =async (page: Page, lang: 'en' | 'he') => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="scales"]').click();
  const card = page.locator('[data-level="scales-1"]');
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator('[data-level-start="scales-1"]').click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const fits = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

for (const lang of ['he', 'en'] as const)
  test(`own fingering and the next-key finger fit one screen (${lang})`, async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
    await seed(page, lang);
    await openScales(page, lang);
    // the slim keyboard: the first key and its finger, before the take
    const keys = page.locator('.finger-keys');
    await expect(keys).toBeVisible();
    await expect(keys).toHaveAttribute('data-next-fingers', /^\d+:[1-5]/);
    await expect(keys.locator('.key-finger')).not.toHaveCount(0);
    let o = await fits(page);
    expect(o.tall).toBeLessThanOrEqual(2);
    expect(o.wide).toBeLessThanOrEqual(1);
    await shot(page, `drill-finger-keys-${lang}-320`);
    // a take, then the review's small text action
    const speaker = page.locator('[data-drums-choice="speaker"]');
    if (await speaker.isVisible().catch(() => false)) await speaker.click();
    await page.locator('[data-drill-play]').click();
    await expect(page.locator('[data-review]')).toBeVisible({ timeout: 20_000 });
    const link = page.locator('[data-own-fing]');
    await expect(link).toHaveAttribute('data-own-fing', 'off');
    o = await fits(page);
    expect(o.tall).toBeLessThanOrEqual(2);
    expect(o.wide).toBeLessThanOrEqual(1);
    const next = await page.locator('.take-review [data-next]').boundingBox();
    expect(next!.y + next!.height).toBeLessThanOrEqual(720);
    await link.click();
    const sheet = page.locator('[data-own-fing-sheet]');
    await expect(sheet).toBeVisible();
    await sheet.locator('[data-own-fing-toggle]').check();
    const cell = sheet.locator('[data-own-note]').first();
    const f0 = Number(await cell.getAttribute('data-finger'));
    await cell.click();
    await expect(cell).toHaveAttribute('data-finger', String((f0 % 5) + 1));
    await expect(cell).toHaveClass(/mine/);
    await shot(page, `drill-own-fingering-${lang}-320`);
    await sheet.locator('[data-own-fing-done]').click();
    await expect(link).toHaveAttribute('data-own-fing', 'on');
    // stored per player (settings): still marked after a reload of the item
    await openScales(page, lang);
    await page.locator('[data-drill-play]').click();
    await expect(page.locator('[data-own-fing]')).toHaveAttribute('data-own-fing', 'on', { timeout: 20_000 });
  });
