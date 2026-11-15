import { expect, test, type Page } from '@playwright/test';

// COURSE-FEEDBACK-UI (docs/research/COURSE-FEEDBACK-UI.md): the exercise and feedback screens at 320×720, English and
// Hebrew — the reharm studio has no sideways overflow and its chips never break inside a word. SHOTS=1 saves the
// screens to docs/ui-shots-v3/. E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Plays = 'keys' | 'guitar' | 'bass' | 'drums';
const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/${name}.png` });
};

export const seed = async (page: Page, lang: 'en' | 'he', plays: Plays, extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both', drumView: 'staff' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', drills, ...extra };
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
    { lang, plays, extra },
  );
};

const openFamily = async (page: Page, lang: 'en' | 'he', family: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
};

for (const lang of ['en', 'he'] as const) {
  test(`reharm studio: no sideways overflow, chips and chords never break inside a word (${lang})`, async ({ page }) => {
    await seed(page, lang, 'keys');
    await openFamily(page, lang, 'k-tune');
    const open = page.locator('[data-reharm-studio="open"]');
    await open.scrollIntoViewIfNeeded();
    await open.click();
    const panel = page.locator('[data-reharm-studio="panel"]');
    await expect(panel).toBeVisible();
    await panel.scrollIntoViewIfNeeded();
    const r = await page.evaluate(() => {
      const el = document.querySelector('[data-reharm-studio="panel"]') as HTMLElement;
      const box = el.getBoundingClientRect();
      const inside = [...el.querySelectorAll('button, select, .rh-chords bdi')].every((b) => {
        const q = b.getBoundingClientRect();
        return q.left >= -1 && q.right <= innerWidth + 1;
      });
      // A chip on one line: its height is about one line of text (no letter-per-line wrap).
      const chips = [...el.querySelectorAll('.rh-devs .chip')].map((c) => (c as HTMLElement).getBoundingClientRect().height);
      const chords = [...el.querySelectorAll('.rh-chords bdi')].map((c) => (c as HTMLElement).getBoundingClientRect().height);
      return { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, left: box.left, right: box.right, inside, chips, chords };
    });
    expect(r.wide).toBeLessThanOrEqual(1);
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(320);
    expect(r.inside).toBe(true);
    expect(r.chips.length).toBeGreaterThan(0);
    for (const h of r.chips) expect(h).toBeLessThan(40);
    for (const h of r.chords) expect(h).toBeLessThan(34);
    await panel.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await shot(page, `jazz-reharm-panel-${lang}-after`);
  });
}
