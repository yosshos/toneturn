import { expect, test, type Page } from '@playwright/test';

// 0.97 leftovers at phone size (320×720, English and Hebrew): the Arcade's "Interval Sing" card title fits (it took
// three lines as "Sing the Interval Sprint"), and a Hebrew duration on the Stats Activity tiles reads right to left
// ("1 ש׳ 5 דק׳", isolated like the practice diary — it showed reversed as LTR text).

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const DAY = new Date().toISOString().slice(0, 10);
const seed = async (page: Page, lang: 'en' | 'he', course: string) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, day }) => {
      const now = new Date().toISOString();
      const progress = {
        version: 1,
        xp: 50,
        applied: [],
        lessons: {},
        history: [],
        streak: { count: 1, lastDay: day },
        review: [],
        statsDays: { [day]: { items: 10, correct: 8, ms: 65 * 60000, xp: 50, sessions: 1, byArea: {} } },
      };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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
    { lang, course, day: DAY },
  );
};

for (const lang of ['en', 'he'] as const) {
  test(`Interval Sing: a short title on its Arcade card at 320 px (${lang})`, async ({ page }) => {
    await seed(page, lang, 'voice');
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&lang=${lang}#/arcade`);
    // The voice course's Arcade: the voice games tile opens its list.
    // one category in the voice course: the Games tile (owner 2026-11-21, no duplicate category tile)
    await page.locator('[data-hub="games"]').first().click();
    const title = page.locator('.play-card.singinterval b').first();
    await expect(title).toBeVisible();
    await expect(title).toHaveText(lang === 'he' ? 'ספרינט שירה' : 'Interval Sing');
    // Lines the title wraps to: the distinct tops of its text's line boxes (it took three as "Sing the Interval Sprint").
    const lines = await title.evaluate((el) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      return new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size;
    });
    expect(lines).toBeLessThanOrEqual(2);
    const over = await page.evaluate(() => document.scrollingElement!.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}

test('Stats: a Hebrew duration reads right to left on the Activity tiles at 320 px', async ({ page }) => {
  await seed(page, 'he', 'ear');
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=he#/skills');
  await page.locator('#ps-tab-activity').click();
  const d = page.locator('[data-dur]').first();
  await expect(d).toBeVisible();
  await expect(d).toHaveText('1 ש׳ 5 דק׳');
  const r = await d.evaluate((el) => {
    const t = el.firstChild as Text;
    const at = (i: number) => {
      const rg = document.createRange();
      rg.setStart(t, i);
      rg.setEnd(t, i + 1);
      return rg.getBoundingClientRect().left;
    };
    // "1" is the first character, "׳" of "דק׳" the last: right to left, the "1" sits right of the last word.
    return { dir: getComputedStyle(el).direction, first: at(0), last: at(t.length - 1) };
  });
  expect(r.dir).toBe('rtl');
  expect(r.first).toBeGreaterThan(r.last);
});
