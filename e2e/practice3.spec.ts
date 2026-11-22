import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 3 — Practice reorganised (SPEC-PRACTICE-IA-3, SPEC-PATH-TODAY-PRACTICE): the four places,
// games below, the tools strip, "continue where I stopped"; one Repertoire for every piece (tabs + Mine, search, Add a
// piece, the piece page by what it has); every old route lands; the menu Today · Practice · Path.

const seed = async (page: Page, lang: 'en' | 'he', course: 'keys' | 'ear' | 'drums' | 'voice' = 'keys', extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const plays = course === 'drums' ? ['drums'] : course === 'ear' || course === 'voice' ? [] : ['keys'];
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: course === 'keys', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', ...extra };
      localStorage.clear();
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
    { lang, course, extra },
  );
};
const open = (page: Page, lang: 'en' | 'he', hash: string) => page.goto(`/?unlock=all&lang=${lang}#${hash}`);
/** One phone screen: the page does not scroll vertically. */
const fitsOneScreen = async (page: Page) => expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(2);

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const lang of ['he', 'en'] as const) {
    test(`Practice page (${lang}): four places, games below, the tools strip without the log; old rows gone`, async ({ page }) => {
      await seed(page, lang);
      await open(page, lang, '/arcade');
      const hub = page.locator('[data-practice-hub]');
      await expect(hub).toBeVisible();
      await expect(hub.locator('.pt-places [data-hub]')).toHaveCount(4);
      for (const k of ['drills', 'licks', 'repertoire', 'improv']) await expect(hub.locator(`.pt-places [data-hub="${k}"]`)).toBeVisible();
      await expect(hub.locator('[data-hub="games"]')).toBeVisible();
      for (const k of ['charts', 'pieces', 'mysong', 'transcribe', 'standards', 'log']) await expect(page.locator(`[data-hub="${k}"]`)).toHaveCount(0);
      await expect(page.locator('details.pt-more')).toHaveCount(0);
      await expect(hub.locator('[data-hub-group="tools"] [data-hub="tuner"]')).toBeVisible();
      await expect(hub.locator('[data-hub-group="tools"] [data-hub="metronome"]')).toBeVisible();
      // the bottom tabs: Today · Practice · Path
      await expect(page.locator('.tabbar [data-tab]')).toHaveText(lang === 'he' ? [/היום/, /תרגול/, /מסלול/, /התקדמות/, /.+/] : [/Today/, /Practice/, /Path/, /Progress/, /.+/]);
      await page.screenshot({ path: `test-results/phase3-practice-phone-${lang}.png`, fullPage: true });
    });

    test(`Repertoire (${lang}): tabs + Mine, search, Add a piece with four sources, a piece page by what it has`, async ({ page }) => {
      await seed(page, lang);
      await open(page, lang, '/arcade');
      await page.locator('[data-hub="repertoire"]').click();
      const rep = page.locator('[data-repertoire="keys"]');
      await expect(rep).toBeVisible();
      await expect(page.locator('[data-rep-tier]')).toHaveCount(5);
      await expect(page.locator('[data-rep-goal]')).toBeVisible();
      await page.screenshot({ path: `test-results/phase3-repertoire-phone-${lang}.png` });
      // Mine: a first step instead of an empty list
      await page.locator('[data-rep-tier="mine"]').click();
      await expect(page.locator('[data-rep-empty]')).toBeVisible();
      expect(page.url()).toContain('#/repertoire/mine');
      // Add a piece: lead sheet / score / my recording / type the chords
      await page.locator('[data-rep-add]').click();
      const sheet = page.locator('[data-rep-add-sheet]');
      await expect(sheet.locator('[data-rep-src]')).toHaveCount(4);
      await page.screenshot({ path: `test-results/phase3-addpiece-phone-${lang}.png` });
      await sheet.locator('[data-rep-src="type"]').click();
      await expect(sheet.locator('[data-rep-template]').first()).toBeVisible();
      await page.keyboard.press('Escape');
      // search across the tiers
      await page.locator('[data-rep-search]').fill('blues');
      await expect(page.locator('[data-rep-key]').first()).toBeVisible();
      await page.locator('[data-rep-search]').fill('');
      // a piece page: status word, main button "Practise", only its own actions; Back returns to the list
      await page.locator('[data-rep-tier="2"]').click();
      await page.locator('[data-rep-item="blues-basic"]').click();
      const piece = page.locator('[data-rep-piece="rep:keys:blues-basic"]');
      await expect(piece).toBeVisible();
      await expect(piece.locator('[data-rep-status="new"]')).toHaveText(lang === 'he' ? 'חדש' : 'New');
      await expect(piece.locator('[data-rep-main="practice"]')).toBeVisible();
      await expect(piece.locator('[data-rep-action="band"]')).toBeVisible();
      await expect(piece.locator('[data-rep-action="improvise"]')).toBeVisible();
      await expect(piece.locator('[data-rep-action="score"]')).toHaveCount(0);
      await fitsOneScreen(page);
      await page.screenshot({ path: `test-results/phase3-piece-phone-${lang}.png` });
      await piece.locator('[data-rep-back]').click();
      await expect(page.locator('[data-repertoire="keys"]')).toBeVisible();
    });
  }

  test('Play with the band opens the chart player on the piece; its Back returns to the piece page', async ({ page }) => {
    await seed(page, 'en');
    await open(page, 'en', '/repertoire/t/2/p/rep%3Akeys%3Ablues-basic');
    await page.locator('[data-rep-action="band"]').click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    expect(page.url()).toContain('#/repertoire/chart/');
    await page.locator('[data-chart-player] .screen-head .icon-btn').first().click();
    await expect(page.locator('[data-rep-piece="rep:keys:blues-basic"]')).toBeVisible();
    // a reload on the chart player keeps the piece
    await page.locator('[data-rep-action="band"]').click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
  });

  test('Improvise on it opens Improvise with this chart', async ({ page }) => {
    await seed(page, 'en');
    await open(page, 'en', '/repertoire/t/2/p/rep%3Akeys%3Ablues-basic');
    await page.locator('[data-rep-action="improvise"]').click();
    await expect(page.locator('[data-improv-studio]')).toBeVisible();
    await expect(page.locator('[data-is-chart-src]')).toHaveValue('piece:');
    await expect(page.locator('[data-is-free]')).toBeVisible();
  });

  test('from the path: "Continue the step" and "The full practice of the step"; Back returns to the path', async ({ page }) => {
    await seed(page, 'he');
    await open(page, 'he', '/repertoire/p/rep%3Akeys%3Ablues-basic?from=path');
    const piece = page.locator('[data-rep-piece="rep:keys:blues-basic"]');
    await expect(piece.locator('[data-rep-main="path"]')).toContainText('להמשיך את הצעד');
    await expect(piece.locator('[data-rep-action]')).toHaveCount(0);
    await piece.locator('[data-rep-full]').click();
    await expect(piece.locator('[data-rep-action="band"]')).toBeVisible();
    await piece.locator('[data-rep-back]').click();
    await expect.poll(() => page.url()).toContain('#/path');
  });

  test('every old route lands in its new place', async ({ page }) => {
    test.setTimeout(400_000);
    await seed(page, 'en');
    const cases: [string, string, string][] = [
      ['/charts', '[data-rep-tier="mine"][aria-selected="true"]', '#/repertoire/mine/charts'],
      ['/pieces', '[data-rep-mine="scores"][aria-checked="true"]', '#/repertoire/mine/scores'],
      ['/mysong', '[data-rep-mine="recordings"][aria-checked="true"]', '#/repertoire/mine/recordings'],
      ['/songs', '[data-rep-tier="1"][aria-selected="true"]', '#/repertoire/t/1'],
      ['/transcribe-coach', '[data-licks-tab="transcribe"][aria-selected="true"]', '#/licks/transcribe'],
    ];
    for (const [from, sel, to] of cases) {
      await page.goto('about:blank');
      await open(page, 'en', from);
      await expect(page.locator(sel), from).toBeVisible();
      await expect.poll(() => page.url()).toContain(to);
    }
    // the game #/transcribe stays the race
    await page.goto('about:blank');
    await open(page, 'en', '/transcribe');
    await expect(page.locator('[data-game="transcribe"]')).toBeVisible();
  });

  test('Licks › Transcribe is the graded coach, a fourth tab', async ({ page }) => {
    await seed(page, 'he');
    await open(page, 'he', '/licks');
    await expect(page.locator('[data-licks-tab]')).toHaveCount(4);
    await page.locator('[data-licks-tab="transcribe"]').click();
    await expect(page.locator('[data-transcribe="levels"]')).toBeVisible();
    await expect(page.locator('[data-tx-open="1"]')).toBeVisible();
  });

  test('continue where I stopped: the last place, at the top of Practice', async ({ page }) => {
    await seed(page, 'en');
    await open(page, 'en', '/repertoire/t/2/p/rep%3Akeys%3Ablues-basic');
    await expect(page.locator('[data-rep-piece]')).toBeVisible();
    await page.goto('about:blank');
    await open(page, 'en', '/arcade');
    const c = page.locator('[data-continue-place="repertoire"]');
    await expect(c).toContainText('Repertoire');
    await c.locator('[data-continue-go]').click();
    await expect(page.locator('[data-rep-piece="rep:keys:blues-basic"]')).toBeVisible();
  });

  test('per course: drums improvise on the kit, no Licks; Ear has Lessons, Repertoire, Puzzle', async ({ page }) => {
    await seed(page, 'en', 'drums');
    await open(page, 'en', '/arcade');
    await expect(page.locator('.pt-places [data-hub]')).toHaveCount(3);
    await expect(page.locator('[data-hub="licks"]')).toHaveCount(0);
    await page.locator('[data-hub="improv"]').click();
    await expect(page.locator('[data-drum-improv]')).toBeVisible();
    await expect(page.locator('[data-di-level="d-trade-1"]')).toBeVisible();
    await seed(page, 'he', 'ear');
    await open(page, 'he', '/arcade');
    for (const k of ['lessons', 'repertoire', 'puzzle']) await expect(page.locator(`.pt-places [data-hub="${k}"]`)).toBeVisible();
  });

  test('Progress: the practice log sits beside the diary', async ({ page }) => {
    await seed(page, 'en');
    await open(page, 'en', '/skills');
    await expect(page.locator('[data-open-diary]')).toBeVisible();
    await page.locator('[data-open-log="progress"]').click();
    await expect(page.locator('.sheet').first()).toBeVisible();
  });
});

test.describe('wide', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const lang of ['he', 'en'] as const) {
    test(`wide (${lang}): the menu Today · Practice · Path with Practice's children; Repertoire list + piece side by side`, async ({ page }) => {
      await seed(page, lang);
      await open(page, lang, '/arcade');
      const nav = page.locator('[data-side-nav]');
      await expect(nav).toBeVisible();
      const order = await nav.locator('.sn-list > .sn-sec > .sn-row > .sn-item').evaluateAll((els) => els.map((e) => e.getAttribute('data-nav')));
      expect(order.slice(0, 4)).toEqual(['home', 'arcade', 'path', 'skills']);
      for (const k of ['drills', 'licks', 'repertoire', 'improv', 'gamelist']) await expect(nav.locator(`.sn-sub [data-nav="${k}"]`)).toBeVisible();
      await expect(nav.locator('[data-nav="log"]')).toHaveCount(0);
      await page.screenshot({ path: `test-results/phase3-practice-wide-${lang}.png` });
      await nav.locator('.sn-sub [data-nav="repertoire"]').click();
      await expect(page.locator('[data-rep-split]')).toBeVisible();
      await page.locator('[data-rep-tier="2"]').click();
      await page.locator('[data-rep-item="blues-basic"]').click();
      await expect(page.locator('.rep-pane [data-rep-piece="rep:keys:blues-basic"]')).toBeVisible();
      await expect(page.locator('[data-repertoire="keys"]')).toBeVisible();
      await page.screenshot({ path: `test-results/phase3-repertoire-wide-${lang}.png` });
    });
  }
});
