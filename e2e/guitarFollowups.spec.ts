import { expect, test, type Page } from '@playwright/test';

// GUITAR-AUDIT follow-ups (2026-11-17): rhythm under the tab (T2) on one phone screen, the drill's chord boxes mirrored
// for a left-handed player, the take saying which input a guitar item listens to when MIDI is connected (B7), the
// Chord Rush neck's hollow open strings (N3) and the opt-in calibration log on #/diagnostics (B10). 320 and 390 wide,
// English and Hebrew. Shots go to docs/guitar-shots/. E2E_BASE: another dev server (a worktree's own vite).
test.use({ hasTouch: true, permissions: ['microphone'], ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const SHOTS = 'docs/guitar-shots';

const seed = async (page: Page, lang: 'en' | 'he', extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'guitar' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['guitar'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'guitar'], activeCourse: 'guitar', seenVersion: '9.9.9', drills, ...extra };
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
    { lang, extra },
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
const openLevel = async (page: Page, lang: 'en' | 'he', family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.waitForTimeout(800);
  await page.locator('[data-topic="all"]').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await page.waitForTimeout(700);
};

for (const lang of ['en', 'he'] as const)
  for (const w of [320, 390] as const)
    test(`T2: rhythm under the tab, one screen (${lang}, ${w})`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: w === 320 ? 720 : 844 });
      await seed(page, lang);
      const bad: string[] = [];
      for (const [family, level, shot] of [
        ['g-chords', 'g-chords-1', 'rhythm-chords'],
        ['g-first', 'g-first-6', 'rhythm-first'],
        ['g-lead', 'g-lead-1', 'rhythm-lead'],
      ] as const) {
        await openLevel(page, lang, family, level);
        const tab = page.locator('[data-drills="run"] .guitar-tab').first();
        await expect(tab).toBeVisible();
        const mode = await tab.getAttribute('data-rhythm');
        expect(['stems', 'dense']).toContain(mode);
        if (mode === 'stems') expect(await page.locator('[data-drills="run"] .tab-rhythm .tab-stem, [data-drills="run"] .tab-rhythm .tab-beam').count()).toBeGreaterThan(0);
        // the tab never mirrors in Hebrew
        expect(await tab.evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
        const p = await problems(page);
        if (p.length) bad.push(`${level}: ${p.join(', ')}`);
        await page.screenshot({ path: `${SHOTS}/${shot}-${lang}-${w}.png` });
      }
      expect(bad).toEqual([]);
    });

test('left-handed: the drill chord boxes mirror, the tab does not', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const spread = async () =>
    page.locator('[data-drills="run"] .chord-pair figure.is-now svg').first().evaluate((svg) => {
      const w = (svg as SVGSVGElement).viewBox.baseVal.width;
      const xs = [...svg.querySelectorAll('.box-dot circle')].map((c) => Number(c.getAttribute('cx')) / w);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    });
  const tabFirst = async () => page.locator('[data-drills="run"] .guitar-tab').first().getAttribute('aria-label');
  await seed(page, 'en');
  await openLevel(page, 'en', 'g-chords', 'g-chords-1');
  const right = await spread();
  const tabR = await tabFirst();
  await seed(page, 'en', { leftHanded: true });
  await openLevel(page, 'en', 'g-chords', 'g-chords-1');
  const left = await spread();
  expect(left).toBeCloseTo(1 - right, 1);
  expect(await tabFirst()).toBe(tabR);
  expect(await problems(page)).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/lefty-chords-en-390.png` });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/lefty-chords-en-320.png` });
});

for (const lang of ['en', 'he'] as const)
  test(`B7: with MIDI connected a guitar take says which input it uses, and switches (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    // A stand-in Web MIDI device (no real hardware in the test browser).
    await page.addInitScript(() => {
      const input = { name: 'MIDI Guitar', onmidimessage: null };
      (window as unknown as { __fakeMidi: unknown }).__fakeMidi = input;
      Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['g', input]]), onstatechange: null }), configurable: true });
    });
    await seed(page, lang, { midiInput: true });
    await page.evaluate(() => localStorage.removeItem('tt.guitar.input'));
    await openLevel(page, lang, 'g-chords', 'g-chords-1');
    const line = page.locator('[data-guitar-input]');
    await expect(line).toHaveAttribute('data-guitar-input', 'midi');
    expect(await problems(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/midi-input-${lang}-320.png` });
    await page.locator('[data-guitar-input-switch]').click();
    await expect(line).toHaveAttribute('data-guitar-input', 'mic');
    expect(await page.evaluate(() => localStorage.getItem('tt.guitar.input'))).toBe('mic');
    expect(await problems(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/midi-input-mic-${lang}-320.png` });
    await page.locator('[data-guitar-input-switch]').click();
    await expect(line).toHaveAttribute('data-guitar-input', 'midi');
  });

test('N3: Chord Rush draws open strings as hollow rings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, 'en');
  await page.goto('/?unlock=all#/rush-chord');
  await page.locator('[data-picture="neck"]').click().catch(() => {});
  await page.locator('.rush-card .btn.primary').click();
  // a few rounds until a picture with an open string comes up (most open-position triads have one)
  let open = 0;
  for (let i = 0; i < 12 && !open; i++) {
    await page.waitForTimeout(400);
    open = await page.locator('.neck-dot.open-str').count();
    if (!open) await page.locator('.rush-ans:not([disabled])').first().click().catch(() => {});
  }
  if (open) {
    const fill = await page.locator('.neck-dot.open-str circle').first().evaluate((c) => getComputedStyle(c).fill);
    expect(fill).toBe('none');
    await page.screenshot({ path: `${SHOTS}/rush-open-en-390.png` });
  }
  expect(await problems(page)).toEqual([]);
});

for (const lang of ['en', 'he'] as const)
  test(`B10: the calibration log on #/diagnostics is off until turned on (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, lang);
    await page.goto(`/?lang=${lang}#/diagnostics`);
    const card = page.locator('[data-guitar-calib]');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-guitar-calib', 'off');
    await page.locator('[data-guitar-calib-toggle]').check();
    await expect(card).toHaveAttribute('data-guitar-calib', 'on');
    expect(await page.evaluate(() => localStorage.getItem('tt.guitar.calib.on'))).toBe('1');
    await expect(page.locator('[data-guitar-calib-export]')).toBeDisabled();
    await card.screenshot({ path: `${SHOTS}/calib-log-${lang}.png` });
  });
