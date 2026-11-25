import { expect, test, type Page } from '@playwright/test';

// The one status ladder (BUILD-PLAN-2026-11 D4) and the one item page (SPEC-PATH-TODAY-PRACTICE §2–§5): no stars on
// technique levels, licks or path nodes; the piece / lick / improvisation-level / technique-rung pages share the same
// top (ladder, where it sits, why today, the teacher's part, assign for a teacher); a technique step's "keep practising
// now" opens the key page with the rung lit. Hebrew and English on a phone, one screen, no emoji.

test.use({ viewport: { width: 390, height: 844 } });

const seed = async (page: Page, lang: 'en' | 'he', course: 'keys' | 'ear' = 'keys', extra: Record<string, unknown> = {}, teacher = false) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, extra, teacher }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], drillItems: {} };
      const plays = course === 'keys' ? ['piano'] : [];
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: course === 'keys', miniLessons: false, noSing: true, noMic: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: true, noMic: true }, courses: ['ear', course], activeCourse: course, drillStart: course === 'keys' ? { scales: 1 } : {}, seenVersion: '9.9.9', ...extra };
      localStorage.clear();
      if (teacher) localStorage.setItem('tt.mockTeacher', '1');
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
    { lang, course, extra, teacher },
  );
};
const open = (page: Page, lang: 'en' | 'he', hash: string) => page.goto(`/?unlock=all&lang=${lang}#${hash}`);
const fitsOneScreen = async (page: Page) => expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(2);
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
const noEmoji = async (page: Page) => expect(/[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('main').first().innerText())).toBe(false);

for (const lang of ['he', 'en'] as const) {
  test(`piece page (${lang}): the full ladder, the main button by way in, one screen`, async ({ page }) => {
    await seed(page, lang);
    await open(page, lang, '/repertoire/t/2/p/rep%3Akeys%3Ablues-basic');
    const piece = page.locator('[data-rep-piece="rep:keys:blues-basic"]');
    const head = piece.locator('[data-item-head="piece"]');
    await expect(head).toBeVisible();
    await expect(head.locator('.sl-full [data-rung]')).toHaveCount(5);
    await expect(head.locator('[data-rung="fingers"]')).toBeVisible();
    await expect(head.locator('.sl-word')).toHaveText(lang === 'he' ? 'חדש' : 'New');
    await expect(piece.locator('[data-rep-main="practice"]')).toBeVisible();
    await fitsOneScreen(page);
    await noSideScroll(page);
    await noEmoji(page);
    await page.screenshot({ path: `test-results/item-piece-${lang}.png` });
  });

  test(`licks (${lang}): the list shows the ladder (no stars); the lick page has the item top and "Practise"`, async ({ page }) => {
    await seed(page, lang);
    await open(page, lang, '/licks');
    const card = page.locator('[data-lick-card]').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.sl-compact')).toBeVisible();
    await expect(page.locator('.lk-stars')).toHaveCount(0);
    await page.screenshot({ path: `test-results/item-licks-list-${lang}.png` });
    await card.click();
    const head = page.locator('[data-item-head="lick"]');
    await expect(head).toBeVisible();
    // the lick page keeps the score and the 12-key grid on one screen: the compact ladder (every rung above "new")
    await expect(head.locator('.sl-compact[data-ladder="lick"] [data-rung]')).toHaveCount(6);
    await expect(head.locator('[data-rung="language"]')).toHaveCount(1);
    await expect(head.locator('[data-rung="keys12"]')).toHaveCount(1);
    await expect(head.locator('[data-rung="fingers"]')).toHaveCount(1);
    await expect(page.locator('[data-item-main="practice"]')).toBeVisible();
    await noSideScroll(page);
    await noEmoji(page);
    await page.screenshot({ path: `test-results/item-lick-${lang}.png` });
  });

  test(`technique levels (${lang}): the ladder in place of five stars`, async ({ page }) => {
    await seed(page, lang);
    await open(page, lang, '/drills');
    await page.locator('[data-practice-view="topic"]').click().catch(() => undefined);
    await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
    const row = page.locator('[data-level="scales-1"]');
    await expect(row).toBeVisible();
    await expect(row.locator('.lvl-ladder .sl-compact')).toBeVisible();
    await expect(page.locator('.lvl-stars')).toHaveCount(0);
    await noSideScroll(page);
    await page.screenshot({ path: `test-results/item-tech-levels-${lang}.png` });
  });
}

test('path (he): an opened technique node shows the ladder beside the check; Keep practising now opens the rung lit on its key page', async ({ page }) => {
  await seed(page, 'he');
  await open(page, 'he', '/path');
  await expect(page.locator('.road [data-step]').first()).toBeVisible();
  await page.waitForTimeout(400);
  const ids = await page.locator('.road [data-step]').evaluateAll((els) => els.map((e) => e.getAttribute('data-step')!));
  const tech = ids.find((id) => id.startsWith('tech:'));
  expect(tech, 'a technique step on the road').toBeTruthy();
  const at = new Date().toISOString();
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async ({ id, at }) => {
    await new Promise((res, rej) => {
      const r = indexedDB.open('toneturn', 1);
      r.onsuccess = () => {
        const tx = r.result.transaction('kv', 'readwrite');
        const st = tx.objectStore('kv');
        const g = st.get('settings');
        g.onsuccess = () => {
          const s = g.result;
          s.pathFacts = { ...(s.pathFacts ?? {}), steps: { ...(s.pathFacts?.steps ?? {}), [id]: { stars: 1, at, times: 1, firstAt: at } } };
          st.put(s, 'settings');
        };
        tx.oncomplete = res;
        tx.onerror = rej;
      };
      r.onerror = rej;
    });
  }, { id: tech!, at });
  await open(page, 'he', '/path');
  const node = page.locator(`.road [data-step="${tech}"]`);
  await expect(node).toHaveAttribute('data-node-state', 'opened');
  await expect(node.locator('[data-node-ladder]')).toBeVisible();
  await expect(node.locator('.mini-stars')).toHaveCount(0);
  await node.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/item-path-node-he.png' });
  await node.locator('.node-btn').click();
  const sheet = page.locator(`[data-missing-sheet="${tech}"]`);
  await expect(sheet.locator('[data-missing-ladder]')).toBeVisible();
  await expect(sheet.locator('[data-step-open-note]')).toBeVisible();
  await page.screenshot({ path: 'test-results/item-path-sheet-he.png' });
  await sheet.locator('[data-step-full]').click();
  const card = page.locator(`[data-rung-card="${tech!.slice(5)}"]`);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-way-in', 'path');
  await expect(card.locator('[data-item-main="path"]')).toBeVisible();
  await expect(card.locator('[data-item-where]')).toBeVisible();
  await expect(page.locator(`[data-kp-lit="1"][data-kp-entry="${tech!.slice(5)}"]`)).toBeVisible();
  await noSideScroll(page);
  await noEmoji(page);
  await page.screenshot({ path: 'test-results/item-rung-he.png' });
});

test('improvisation level (he): its item page from Improvise; a teacher assigns from it and the student sees the teacher part', async ({ page }) => {
  await seed(page, 'he', 'keys', {}, true);
  await open(page, 'he', '/improv');
  await page.locator('[data-is-mode="phrasing"]').click();
  await page.locator('.field-row select').last().selectOption('2');
  await page.locator('[data-improv-open="2"]').click();
  const pg = page.locator('[data-improv-page="2"]');
  await expect(pg).toBeVisible();
  await expect(pg.locator('[data-item-head="improv"] .sl-full [data-rung]')).toHaveCount(4);
  await expect(pg.locator('[data-item-main="practice"]')).toBeVisible();
  await page.locator('[data-item-assign]').click();
  const sheet = page.locator('[data-item-assign-sheet]');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-assign-kind]')).toHaveCount(0);
  await expect(sheet.locator('[data-assign-channel]')).toBeVisible();
  await page.screenshot({ path: 'test-results/item-assign-sheet-he.png' });
  await sheet.locator('input[type="date"]').fill('2099-01-01');
  await sheet.locator('input[maxlength="300"]').fill('שתי דקות ביום, לאט');
  await sheet.locator('[data-assign-go]').click();
  await expect(sheet.locator('[data-item-assigned]')).toBeVisible();
  await sheet.locator('.menu-head .icon-btn').click();
  await expect(pg.locator('[data-item-teacher]')).toBeVisible();
  await expect(pg.locator('[data-item-teacher]')).toContainText('שתי דקות ביום');
  await fitsOneScreen(page);
  await noEmoji(page);
  await page.screenshot({ path: 'test-results/item-improv-teacher-he.png' });
  await pg.locator('[data-improv-play]').click();
  await expect(pg).toHaveCount(0);
  await expect(page.locator('[data-improv-open="2"]')).toBeVisible();
});
