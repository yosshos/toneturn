import { expect, test, type Page } from '@playwright/test';

// AUDIT-DEPTH-3 C5–C7: an improvising-under-rule-cards step (piano, guitar, bass), the comp-and-solo duo and the
// solo-chorus builder fit one 320 × 720 phone screen, in English and Hebrew. E2E_BASE: a worktree's own vite.
test.use({ viewport: { width: 320, height: 720 }, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Inst = 'piano' | 'guitar' | 'bass';
const PLAYS: Record<Inst, string> = { piano: 'keys', guitar: 'guitar', bass: 'bass' };

const seed = async (page: Page, inst: Inst, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ inst, lang, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = {
        version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true,
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', instrument: inst,
        drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: inst, guitarAddOns: ['jazz'], bassTrack: 'jazz' },
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
    },
    { inst, lang, plays: PLAYS[inst] },
  );
};
const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - window.innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
const openLevel = async (page: Page, family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto('/?unlock#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const CASES: [Inst, string, string[]][] = [
  ['piano', 'k-solo', ['k-solo-1', 'k-solo-4', 'k-solo-11']],
  ['guitar', 'g-solo', ['g-solo-1', 'g-solo-9']],
  ['bass', 'b-solo', ['b-solo-1', 'b-solo-7']],
];
for (const [inst, family, levels] of CASES)
  for (const lang of ['en', 'he'] as const)
    test(`${family}: improvising under rule cards fits one phone screen (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, inst, lang);
      for (const level of levels) {
        await openLevel(page, family, level);
        const o = await overflow(page);
        if (o.tall > 4 || o.wide > 1) await page.screenshot({ path: `test-results/depth3-${level}-${lang}.png`, fullPage: true });
        expect(o.tall, `${level} ${lang} taller`).toBeLessThanOrEqual(4);
        expect(o.wide, `${level} ${lang} wider`).toBeLessThanOrEqual(1);
      }
    });

for (const lang of ['en', 'he'] as const)
  test(`the solo-chorus builder fits one phone screen and saves (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page, 'piano', lang);
    await openLevel(page, 'k-solo', 'k-solo-13');
    expect((await overflow(page)).tall, 'run screen').toBeLessThanOrEqual(4);
    await page.locator('[data-chorus-open]').click();
    const ed = page.locator('[data-chorus-editor]');
    await expect(ed).toBeVisible();
    // The blues: 12 bars; pick bar 2, a rest, then a lick on bar 1.
    await expect(page.locator('[data-chorus-bar]')).toHaveCount(12);
    await page.locator('[data-chorus-bar="1"]').click();
    await page.locator('[data-chorus-cell="rest"]').click();
    await page.locator('[data-chorus-bar="0"]').click();
    await page.locator('[data-chorus-cell^="lick:"]').first().click();
    await expect(page.locator('[data-chorus-check]')).toBeVisible();
    const box = await ed.boundingBox();
    expect(box && box.y >= -1 && box.y + box.height <= 721, `editor inside the screen ${JSON.stringify(box)}`).toBe(true);
    expect((await overflow(page)).wide).toBeLessThanOrEqual(1);
    await page.locator('[data-chorus-save]').click();
    await expect(ed).toHaveCount(0);
    const saved = await page.evaluate(() => localStorage.getItem('tt.chorus.piano.0'));
    expect(JSON.parse(saved!)[1]).toBe('rest');
    expect((await overflow(page)).tall).toBeLessThanOrEqual(4);
  });
