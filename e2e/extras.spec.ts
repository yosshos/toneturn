import { expect, test, type Page } from '@playwright/test';

// The extra mark (COURSE-FEEDBACK-UI §4.1): a played note that is not in the score is drawn as a small ink ✕ above the
// staff / the tab's top string where it was played (drums: a pink ✕ in the drum's lane, or above the notation), while
// the take runs and in the review. 320×720, English and Hebrew; the dev-only synthesized take ('mixed' plays some
// wrong pitches and, on drums, an extra crash).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });
type Plays = 'keys' | 'guitar' | 'bass' | 'drums';
const SHOTS = !!process.env.SHOTS;
const seed = async (page: Page, lang: 'en' | 'he', plays: Plays, view: 'staff' | 'lanes' = 'staff') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays, view }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both', drumView: view };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, headphones: false, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', drills };
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
    { lang, plays, view },
  );
};
const openLevel = async (page: Page, lang: 'en' | 'he', family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};
const tall = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return document.scrollingElement!.scrollHeight - innerHeight;
  });
const EXTRA = '.mk-extra .mk-extra-x, .drum-score .dl-extra, .drum-score .mk-extra-x';

const RUNS: [Plays, string, string, 'staff' | 'lanes'][] = [
  ['keys', 'scales', 'scales-1', 'staff'],
  ['guitar', 'g-scales', 'g-scales-1', 'staff'],
  ['bass', 'b-pocket', 'b-pocket-1', 'staff'],
  ['drums', 'd-rock', 'd-rock-1', 'lanes'],
  ['drums', 'd-rock', 'd-rock-1', 'staff'],
];
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level, view] of RUNS)
    test(`extra notes: a ✕ where they were played, live and in the review (${plays} ${view}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed';
        (window as unknown as { __fakeLive?: number }).__fakeLive = 1.5;
      });
      await seed(page, lang, plays, view);
      await openLevel(page, lang, family, level);
      await expect(page.locator(EXTRA)).toHaveCount(0);
      const speaker = page.locator('[data-drums-choice="speaker"]');
      if (await speaker.isVisible().catch(() => false)) await speaker.click();
      await page.locator('[data-drill-play]').click();
      // live: the ✕ appears while the take runs
      await expect.poll(() => page.locator(EXTRA).count(), { timeout: 30_000 }).toBeGreaterThan(0);
      expect(await page.locator('.drill-result').count()).toBe(0);
      if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/extras-live-${plays}-${view}-${lang}.png` });
      // the review keeps them; inside the screen
      await expect(page.locator('.drill-result')).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(500);
      // (the review opens on the first line with a mistake: page until a ✕ shows)
      for (let k = 0; k < 6 && !(await page.locator(EXTRA).count()); k++) {
        const next = page.locator('.tab-pager button').last();
        if (!(await next.isVisible().catch(() => false)) || (await next.isDisabled())) break;
        await next.click();
        await page.waitForTimeout(300);
      }
      const n = await page.locator(EXTRA).count();
      expect(n).toBeGreaterThan(0);
      const box = await page.locator(EXTRA).first().boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
      // lanes: an extra hit on a drum with no lane (the crash in a rock groove) sits in the "other drum" strip, whole
      // inside the lanes' box (not clipped at the top)
      if (plays === 'drums' && view === 'lanes') {
        const other = page.locator('.drum-lanes [data-extra-other] .dl-extra-bg').first();
        expect(await other.count()).toBeGreaterThan(0);
        if (await other.count()) {
          const ob = (await other.boundingBox())!;
          const svg = (await page.locator('.drum-lanes:has([data-extra-other])').first().boundingBox())!;
          expect(ob.y).toBeGreaterThanOrEqual(svg.y - 0.5);
          expect(ob.y + ob.height).toBeLessThanOrEqual(svg.y + svg.height + 0.5);
          await expect(page.locator('.drum-lanes [data-other-lane]').first()).toBeVisible();
        }
      }
      expect(await tall(page)).toBeLessThanOrEqual(2);
      if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/extras-review-${plays}-${view}-${lang}.png` });
    });
