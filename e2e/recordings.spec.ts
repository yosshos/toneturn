import { expect, test, type Page } from '@playwright/test';

// My recordings (SPEC-PHRASE-STUDIO §6): a drill take lands in the library and survives a reload; rename, star,
// folder, delete (to the bin) and restore work; the player loops an A–B span; the library and the player fit 320×720
// in English and Hebrew with no sideways scroll. SHOTS=1 saves the screens to docs/encore-shots/. E2E_BASE: another
// dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};

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

/** One drill take with the dev-only synthesized input (fakeTake.ts): the real analysis, no audio. */
const playOneTake = async (page: Page, lang: 'en' | 'he') => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'clean'));
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  const card = page.locator('[data-level="scales-1"]');
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator('[data-level-start="scales-1"]').click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await page.waitForTimeout(100);
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
};

const fits = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const outside = [...document.querySelectorAll('.recordings button, .recordings a, .recordings input')].filter((b) => {
      const r = (b as HTMLElement).getBoundingClientRect();
      if (!r.width || (b as HTMLElement).closest('.rec-chips')) return false; // the chips row scrolls sideways by design
      return r.left < -1 || r.right > innerWidth + 1;
    }).length;
    return { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, tall: document.scrollingElement!.scrollHeight - innerHeight, outside };
  });

for (const lang of ['en', 'he'] as const) {
  test(`a drill take is kept, survives a reload; rename, star, folder, delete, restore; the player loops A–B (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await playOneTake(page, lang);
    // the review links to the library (inside "Why?")
    await page.locator('[data-why]').first().click();
    await expect(page.locator('[data-why-sheet] [data-open-recordings]')).toBeVisible();

    // a reload, straight into the library
    await page.goto(`/?lang=${lang}#/recordings`);
    await page.reload();
    const rows = page.locator('[data-rec-take]');
    await expect(rows).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('.rec-session')).toHaveCount(1);
    await expect(rows.first()).toContainText(/MIDI|mic|מיק׳/); // no MIDI device in the test: the take is a microphone take
    expect((await fits(page)).wide).toBeLessThanOrEqual(1);
    expect((await fits(page)).outside).toBe(0);
    await shot(page, `library-${lang}`);

    // rename
    const id = (await rows.first().getAttribute('data-rec-take'))!;
    await page.locator(`[data-rec-menu="${id}"]`).click();
    await page.locator('[data-rec-rename-input]').fill('  My   C scale  ');
    await shot(page, `take-menu-${lang}`);
    await page.locator('[data-rec-rename-save]').click();
    await expect(rows.first().locator('.rec-take-title')).toHaveText('My C scale');

    // star, and the starred filter
    await page.locator(`[data-rec-starbtn="${id}"]`).click();
    await expect(rows.first()).toHaveAttribute('data-rec-star', '1');
    await page.locator('[data-rec-chip="star"]').click();
    await expect(rows).toHaveCount(1);
    await page.locator('[data-rec-chip="all"]').click();

    // into a new folder
    await page.locator(`[data-rec-menu="${id}"]`).click();
    await page.locator('[data-rec-menu-folder]').click();
    await page.locator('[data-rec-newfolder]').fill(lang === 'he' ? 'הסולואים הטובים' : 'Best solos');
    await page.locator('[data-rec-newfolder-save]').click();
    await expect(rows.first().locator('.rec-folder-tag')).toBeVisible();

    // search
    await page.locator('[data-rec-search]').fill('scale');
    await expect(rows).toHaveCount(1);
    await page.locator('[data-rec-search]').fill('nothing like this');
    await expect(rows).toHaveCount(0);
    await page.locator('[data-rec-search]').fill('');

    // the player: a MIDI roll with notes; A–B over one bar, looped at 125 %
    await page.locator(`[data-rec-open="${id}"]`).click();
    const player = page.locator('[data-recordings="player"]');
    await expect(player).toBeVisible();
    await expect(page.locator('.rec-roll')).toHaveAttribute('data-rec-notes', /[1-9]/);
    const f = await fits(page);
    expect(f.wide).toBeLessThanOrEqual(1);
    expect(f.outside).toBe(0);
    expect(f.tall).toBeLessThanOrEqual(2); // the player is one screen
    await shot(page, `player-${lang}`);
    await page.locator('[data-rec-seta]').click();
    await expect(player).toHaveAttribute('data-rec-loop', '1');
    const ab = (await player.getAttribute('data-rec-ab'))!.split(':').map(Number);
    expect(ab[1]).toBeGreaterThan(ab[0]);
    await page.locator('[data-rec-speed]').fill('125');
    await page.locator('[data-rec-play]').click();
    await expect(player).toHaveAttribute('data-rec-playing', '1');
    // the playhead moves inside the span and comes back to A (it loops)
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(Number(await player.getAttribute('data-rec-pos')));
      await page.waitForTimeout(150);
    }
    expect(Math.max(...seen)).toBeLessThanOrEqual(ab[1] + 0.05);
    expect(seen.some((x, i) => i > 0 && x < seen[i - 1] - 0.2)).toBe(true);
    await shot(page, `player-loop-${lang}`);
    await page.locator('[data-rec-play]').click();
    await expect(player).toHaveAttribute('data-rec-playing', '0');

    // "Practise this span" opens Encore with the take and the span
    await page.locator('[data-rec-practice]').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(new RegExp(`^#/encore/new\\?take=${encodeURIComponent(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}&from=-?[\\d.]+&to=[\\d.]+`));

    // delete → the bin → restore
    await page.goto(`/?lang=${lang}#/recordings`);
    await expect(rows).toHaveCount(1);
    await page.locator(`[data-rec-menu="${id}"]`).click();
    await page.locator('[data-rec-delete]').click();
    await expect(rows).toHaveCount(0);
    await expect(page.locator('[data-rec-binbtn]')).toHaveAttribute('data-rec-binbtn', '1');
    await page.locator('[data-rec-binbtn]').click();
    await expect(page.locator('[data-recordings="library"]')).toHaveAttribute('data-rec-bin', '1');
    await shot(page, `bin-${lang}`);
    await page.locator(`[data-rec-restore="${id}"]`).click();
    await expect(page.locator('[data-rec-take]')).toHaveCount(0);
    await page.locator('.rec-head .icon-btn').first().click();
    await expect(rows).toHaveCount(1);
  });

  test(`settings: the recordings switches and the corrected privacy line (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?lang=${lang}#/settings/privacy`);
    const card = page.locator('[data-rec-settings]');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card.locator('[data-rec-keepaudio]')).toBeChecked();
    await expect(card.locator('[data-rec-keepnotes]')).toBeChecked();
    await shot(page, `settings-${lang}`);
    expect((await fits(page)).wide).toBeLessThanOrEqual(1);
  });
}
