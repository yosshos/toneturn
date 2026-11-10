import { expect, test, type Page } from '@playwright/test';

// Piano / keys course (PIANO_AUDIT): Technique with the pianist's ear topic, every level's run screen on one phone
// screen (390 × 844, Hebrew and English), the ear card before a take, the MIDI notice for loudness goals by
// microphone, and the new keys topics on the path.

/** A returning player in the keys course (onboarding done). */
const seed = async (page: Page, lang: 'en' | 'he' = 'en') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' } };
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
const overflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
const openLevel = async (page: Page, family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto('/?unlock#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const FAMS: [string, number][] = [
  ['scales', 15], ['arpeggios', 14], ['cadences', 7], ['fingers', 14], ['control', 12], ['advanced', 8], ['harris', 15], ['voicings', 17], ['jazz', 10], ['accomp', 17], ['k-ear', 8],
  // PIANO_JAZZ: Barry Harris harmony, bebop lines and trading, jazz-piano harmony.
  ['k-sixdim', 9], ['k-bebop', 8], ['k-reharm', 7],
];

test.describe('keys course', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Technique: the pianist's ear topic and family; an ear level shows what to do, not the answer", async ({ page }) => {
    await seed(page);
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-topic="ear"]')).toContainText('Pianist');
    await expect(page.locator('[data-family="k-ear"]')).toBeVisible();
    await openLevel(page, 'k-ear', 'k-ear-4');
    await expect(page.locator('[data-ear-card]')).toBeVisible();
    await expect(page.locator('.drill-staff, svg.staff')).toHaveCount(0);
    expect(await overflow(page)).toBeLessThanOrEqual(4);
  });

  test('trading fours: the card shows Listen / You bars with their chords, not the notes', async ({ page }) => {
    await seed(page);
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-topic="styles"]')).toContainText('Jazz piano');
    await openLevel(page, 'k-bebop', 'k-bebop-8');
    await expect(page.locator('[data-ear-card]')).toBeVisible();
    await expect(page.locator('.ear-bars .ear-chord').first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(4);
  });

  test('a loudness goal by microphone: the take waits for a MIDI keyboard', async ({ page }) => {
    await seed(page);
    await openLevel(page, 'control', 'control-3');
    await expect(page.locator('[data-piano-needs-midi]')).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toBeDisabled();
    await openLevel(page, 'scales', 'scales-1');
    await expect(page.locator('[data-piano-needs-midi]')).toHaveCount(0);
    await expect(page.locator('[data-drill-play]')).toBeEnabled();
  });

  for (const lang of ['he', 'en'] as const)
    for (const [f, n] of FAMS)
      test(`every ${f} level's run screen fits 390 × 844 (${lang})`, async ({ page }) => {
        test.setTimeout(300_000);
        await seed(page, lang);
        const bad: string[] = [];
        for (let i = 1; i <= n; i++) {
          await openLevel(page, f, `${f}-${i}`);
          const o = await overflow(page);
          if (o > 4) bad.push(`${f}-${i}: ${o}px`);
        }
        expect(bad).toEqual([]);
      });
});
