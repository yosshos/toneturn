import { expect, test, type Page } from '@playwright/test';

// A tune in all 12 keys (AUDIT-GAPS-2 High #4): a standard moved to another key opens from the family's key map, the
// drill header names the key, and the run fits a 320 × 720 phone with no scroll (piano voicings on a standard, the
// bass standards ladder, the guitar's whole chart).
test.use({ viewport: { width: 320, height: 720 } });

const seed = async (page: Page, lang: 'en' | 'he', course: 'keys' | 'bass' | 'guitar', start: Record<string, number>) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, start }) => {
      const iso = new Date().toISOString();
      const plays = course === 'keys' ? ['piano'] : [course];
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [], drillItems: {} };
      const instrument = course === 'keys' ? 'piano' : course;
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', drillStart: start, drills: { emphasis: 'both', keyOrder: 'fifths-up', instrument, bassTrack: 'both', guitarAddOns: ['jazz'] } };
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
    { lang, course, start },
  );
};

const CASES = [
  { course: 'keys' as const, family: 'voicings', level: 16, key: 3, label: /· E♭|in E♭|ב־E♭|· Cm/ },
  { course: 'bass' as const, family: 'b-std', level: 3, key: 10, label: /· [A-G][♭♯]?m?/ },
  { course: 'guitar' as const, family: 'g-jazz', level: 13, key: 6, label: /· [A-G][♭♯]?m?|in [A-G]|ב־[A-G]/ },
];

for (const lang of ['en', 'he'] as const)
  for (const c of CASES)
    test(`a standard in another key fits one phone screen: ${c.family} ${c.level} (${lang})`, async ({ page }) => {
      await seed(page, lang, c.course, { [c.family]: c.level });
      await page.goto(`/?unlock=all&lang=${lang}#/drills`);
      await page.locator(`[data-family-levels="${c.family}"], [data-family="${c.family}"]:not([data-family-direct])`).click();
      const map = page.locator(`[data-key-map-skill="${c.family}"]`);
      await expect(map).toBeVisible();
      await map.locator(`button[data-key="${c.key}"]`).click();
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      const h1 = page.locator('.screen-head h1');
      // the run title is the name over a small subline with the key; the h1's title keeps the whole "name · key"
      await expect(h1).toHaveAttribute('title', c.label);
      const { sh, ih, sw, iw } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      await page.screenshot({ path: `test-results/keys12-${c.family}-${lang}.png` });
      expect(sw, 'no horizontal scroll').toBeLessThanOrEqual(iw + 1);
      expect(sh, 'no vertical scroll').toBeLessThanOrEqual(ih + 1);
    });
