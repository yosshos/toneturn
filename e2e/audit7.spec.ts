import { expect, test, type Page } from '@playwright/test';

// AUDIT-7: the new screens fit one phone screen (320×720, English and Hebrew) — every level of the two new theory topics,
// chord-spelling levels 1–2, a level of every new voice family (and the scale take's degree cue), the guitar
// jazz entry and the bass's first walking line. No sideways scroll, no vertical scroll. E2E_BASE: another dev server.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he', instrument: 'guitar' | 'bass') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, instrument }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument, guitarAddOns: ['jazz'] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [instrument], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', instrument], activeCourse: instrument, seenVersion: '9.9.9', drills };
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
    { lang, instrument },
  );
};
const problems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (over > 2) out.push(`taller by ${over}`);
    return out;
  });

for (const lang of ['en', 'he'] as const) {
  test(`AUDIT-7: note values, interval numbers, chord spelling 1 and 2 fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (const [topic, levels] of [['note-values', [1, 2, 3]], ['interval-number', [1, 2, 3]], ['chord-spelling', [1, 2]], ['intervals-all', [1, 4]]] as const)
      for (const l of levels) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${l}`);
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${topic} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/a7-${lang}-${topic}-${l}.png`, fullPage: true });
        }
      }
    expect(bad).toEqual([]);
  });

  test(`AUDIT-7: one level of every new voice family fits one screen; the scale take shows its degrees (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    const bad: string[] = [];
    for (const lv of [2104, 2105, 2107, 2301, 2303, 2304, 2311, 2313, 2321, 2323, 2324]) {
      await page.goto('about:blank');
      await page.goto(`/?sim=1&unlock=all&lang=${lang}&vlevel=${lv}#/vocal`);
      const play = page.locator('.mini-gate .btn.mega, .gate-play, [data-gate-play]').first();
      if (await play.isVisible({ timeout: 8000 }).catch(() => false)) await play.click();
      await page.waitForTimeout(2500);
      if (lv === 2313) await expect(page.locator('[data-scale="1"]').first()).toBeVisible({ timeout: 15_000 });
      const p = await problems(page);
      if (p.length) {
        bad.push(`${lv}: ${p.join(', ')}`);
        await page.screenshot({ path: `test-results/a7-${lang}-v${lv}.png`, fullPage: true });
      }
    }
    expect(bad).toEqual([]);
  });

  for (const [instrument, family, levels] of [
    ['guitar', 'g-jblues', ['g-jblues-1', 'g-jblues-2', 'g-jblues-3', 'g-jblues-4']],
    ['bass', 'b-walk', ['b-walk-21']],
  ] as const)
    test(`AUDIT-7: ${family} jazz entry run screens fit one screen (${lang})`, async ({ page }) => {
      test.setTimeout(300_000);
      await seed(page, lang, instrument);
      const bad: string[] = [];
      for (const level of levels) {
        await page.goto('about:blank');
        await page.goto(`/?unlock=all&lang=${lang}#/drills`);
        await page.waitForTimeout(800);
        await page.locator('[data-topic="all"]').click();
        await page.waitForTimeout(400);
        await page.locator(`[data-family="${family}"]`).click();
        const card = page.locator(`[data-level="${level}"]`);
        await card.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
        await page.locator(`[data-level-start="${level}"]`).click();
        await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
        await expect(page.locator('[data-drills="run"]')).toBeVisible();
        await page.waitForTimeout(600);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${level}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/a7-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
