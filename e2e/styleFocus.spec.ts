import { expect, test, type Page } from '@playwright/test';

// SPEC-STYLE-FOCUS (owner 2026-11-22): the style chips beside the two self-ratings at the course start (jazz
// pre-selected first, up to three, the first is the main style), the same chips per course in Settings, and the style
// taster card on Today (one groove, one lick, 8 bars over the band, then "add it?"). Hebrew, one phone screen.
test.use({ viewport: { width: 390, height: 844 } });

const SHOTS = 'test-results/style-focus-shots';
const fits = async (page: Page, what: string) => {
  const over = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
  expect(over, `${what} fits one phone screen`).toBeLessThanOrEqual(4);
};
const noSideScroll = async (page: Page, what: string) => {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
};

/** A keys player in Hebrew, past the course start, with the exposure service running for a while. */
async function seed(page: Page, settingsExtra: Record<string, unknown> = {}) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (settingsExtra) => {
    const now = new Date();
    const iso = now.toISOString();
    const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().slice(0, 10);
    const progress = { version: 1, xp: 300, applied: [], lessons: {}, history: [{ lessonId: 'practice-log', lessonVersion: 1, sessionId: 's1', completedAt: iso, firstTry: 1, total: 1, xp: 20, missed: [], course: 'keys' }], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [] };
    const settings = {
      version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', track: 'hobby',
      intake: { v: 1, at: iso, music: 2, singing: 1, theory: 2, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
      courses: ['ear', 'keys'], activeCourse: 'keys',
      courseStart: { ear: { legacy: true }, keys: { legacy: true } },
      openers: { course: { ear: iso, keys: iso } },
      styleFocus: { keys: { main: 'jazz', also: [] } },
      styleTaste: { since: ago(40) },
      ...settingsExtra,
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
  }, settingsExtra);
}

test.describe('style focus (SPEC-STYLE-FOCUS)', () => {
  test('the chips at the instrument choice: jazz first, up to three, beside the self-ratings (he)', async ({ page }) => {
    await page.goto('/?sim=1&welcome=1&lang=he');
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
    const chips = r.locator('[data-style-focus="keys"]');
    await expect(chips).toBeVisible();
    // jazz pre-selected as the main style
    await expect(chips.locator('[data-style-chip="jazz"]')).toHaveAttribute('data-style-rank', '1');
    await expect(chips.locator('[data-style-chip="jazz"]')).toContainText('ראשי');
    await r.locator('[data-cs-rate="ear"] [data-rate="4"]').click();
    await r.locator('[data-cs-rate="reading"] [data-rate="3"]').click();
    await chips.locator('[data-style-chip="brazil"]').click();
    await chips.locator('[data-style-chip="afrocuban"]').click();
    await expect(chips.locator('[data-style-chip="brazil"]')).toHaveAttribute('data-style-rank', '2');
    // three picked: the others wait (disabled)
    await expect(chips.locator('[data-style-chip="soul"]')).toBeDisabled();
    await fits(page, 'ratings + chips');
    await noSideScroll(page, 'ratings + chips');
    await page.screenshot({ path: `${SHOTS}/chips-course-start-he.png` });
    // the first tap on the main style hands "main" to the next pick
    await chips.locator('[data-style-chip="jazz"]').click();
    await expect(chips).toHaveAttribute('data-style-main', 'brazil');
    await r.locator('[data-cs-ratings-done]').click();
    await expect(page.locator('[data-course-start="setup"], [data-opener]').first()).toBeVisible();
  });

  test('the same chips per course in Settings (he)', async ({ page }) => {
    await seed(page, { styleFocus: { keys: { main: 'brazil', also: ['jazz'] } } });
    await page.goto('/?unlock#/settings/learning');
    const row = page.locator('[data-style-focus-course="keys"]').first();
    await row.scrollIntoViewIfNeeded();
    await expect(row.locator('[data-style-chip="brazil"]')).toHaveAttribute('data-style-rank', '1');
    await expect(row.locator('[data-style-chip="jazz"]')).toHaveAttribute('data-style-rank', '2');
    await noSideScroll(page, 'settings');
    await row.screenshot({ path: `${SHOTS}/chips-settings-he.png` });
  });

  test('the style taster card on Today: three parts, a sentence, then add / not now / never (he)', async ({ page }) => {
    await seed(page);
    await page.goto('/?unlock#/');
    const card = page.locator('[data-style-taster]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-taster-step', 'offer');
    // jazz main → gospel / soul first, with its one sentence (§9.3)
    await expect(card).toHaveAttribute('data-style-taster', 'soul');
    await expect(card.locator('.tc-gain')).toContainText('IV');
    await card.scrollIntoViewIfNeeded();
    await noSideScroll(page, 'taster');
    await card.screenshot({ path: `${SHOTS}/taster-offer-he.png` });
    // each part opens its place and is marked done; back on Today the card resumes (never lose progress)
    for (const part of ['groove', 'lick', 'band']) {
      const link = page.locator(`[data-style-taster] [data-taster-part="${part}"]`);
      if (!(await link.count())) continue;
      await link.click();
      await page.goto('/?unlock#/');
      await expect(page.locator(`[data-style-taster] [data-taster-part="${part}"]`).locator('xpath=..')).toHaveClass(/done/);
    }
    await expect(page.locator('[data-style-taster]')).toHaveAttribute('data-taster-step', 'ask');
    await page.locator('[data-style-taster]').scrollIntoViewIfNeeded();
    await page.locator('[data-style-taster]').screenshot({ path: `${SHOTS}/taster-ask-he.png` });
    await page.locator('[data-taster-add]').click();
    await expect(page.locator('[data-style-taster]')).toHaveCount(0);
    // added as an "also" style
    await page.goto('/?unlock#/settings/learning');
    await expect(page.locator('[data-style-focus-course="keys"] [data-style-chip="soul"]').first()).toHaveAttribute('data-style-rank', '2');
  });
});
