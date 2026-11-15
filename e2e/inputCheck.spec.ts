import { expect, test, type Page } from '@playwright/test';

// Input check (owner 2026-11-15): before an exercise starts, a one-row strip shows the microphone or MIDI signal
// arriving — on a mic drill, a MIDI drill (stubbed Web MIDI), a lesson gate with a sung item and the Highway; never on
// tap or choice exercises. Every screen still fits a 320 × 720 phone with no scroll.
test.use({ viewport: { width: 320, height: 720 } });

type Win = { __midiIn: { name: string; onmidimessage: null | ((e: { data: Uint8Array; timeStamp: number }) => void) } };

const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null };
    (window as unknown as Win).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
const note = (page: Page, n: number, vel = 100) => page.evaluate(([n, v]) => (window as unknown as Win).__midiIn.onmidimessage?.({ data: new Uint8Array([0x90, n, v]), timeStamp: performance.now() }), [n, vel]);

/** A returning player in the keys course (onboarding done); `midiInput` turns MIDI on in Settings. */
const seed = async (page: Page, lang: 'en' | 'he', midiInput = false) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, midiInput }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' } };
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
    { lang, midiInput },
  );
};

const fits = async (page: Page) => {
  const { sh, ih, sw, iw } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, 'no horizontal scroll').toBeLessThanOrEqual(iw + 1);
  expect(sh, 'no vertical scroll').toBeLessThanOrEqual(ih + 1);
};
/** The strip is one row: about 44 px, and inside the screen's width. */
const oneRow = async (page: Page) => {
  const box = await page.locator('[data-input-check]').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(48);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
};

const openScales = async (page: Page, lang: 'en' | 'he') => {
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  // the hub first (the topic filter, when the course has one, renders with it)
  await expect(page.locator('[data-family], [data-topic]').first()).toBeVisible();
  const all = page.locator('[data-topic="all"]');
  if (await all.count()) await all.click();
  await page.locator('[data-family="scales"]').click();
  const card = page.locator('[data-level="scales-1"]');
  if ((await card.count()) && (await card.getAttribute('aria-expanded')) === 'false') await card.click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await expect(page.locator('[data-drill-play]')).toBeVisible();
};

const SHOTS = 'docs/input-check-shots';

for (const lang of ['en', 'he'] as const) {
  test(`mic drill: the strip shows above Play, hears the (simulated) signal, fits 320×720 (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await openScales(page, lang);
    const strip = page.locator('[data-input-check="mic"]');
    await expect(strip).toBeVisible();
    await expect(strip).toHaveAttribute('data-ic-state', 'got');
    await expect(strip.locator('.ic-note')).toHaveText('A4');
    await expect(strip.locator('[data-ic-link="input"]')).toHaveAttribute('href', '#/settings/input');
    await expect(strip.locator('[data-ic-link="midi"]')).toHaveAttribute('href', '#/settings/midi');
    // above the Play button
    const s = (await strip.boundingBox())!;
    const p = (await page.locator('[data-drill-play]').boundingBox())!;
    expect(s.y + s.height).toBeLessThanOrEqual(p.y + 1);
    await oneRow(page);
    await fits(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/drill-mic-${lang}.png` });
  });

  test(`MIDI drill: device name, the activity light and the last note react to a key (${lang})`, async ({ page }) => {
    await stubMidi(page);
    await seed(page, lang, true);
    await openScales(page, lang);
    const strip = page.locator('[data-input-check="midi"]');
    await expect(strip).toBeVisible();
    await expect(strip.locator('.ic-dev')).toHaveText('Test Keys');
    await expect(strip).toHaveAttribute('data-ic-state', 'listening');
    await expect(strip).toHaveAttribute('data-ic-notes', '0');
    await note(page, 60, 100);
    await expect(strip).toHaveAttribute('data-ic-notes', '1');
    await expect(strip).toHaveAttribute('data-ic-state', 'got');
    await expect(strip.locator('.ic-led')).toHaveClass(/blink/);
    await expect(strip.locator('[data-ic-last]')).toHaveText('C4');
    await note(page, 67, 50);
    await expect(strip).toHaveAttribute('data-ic-notes', '2');
    await expect(strip.locator('[data-ic-last]')).toHaveText('G4');
    // the velocity bar: 50 of 127 fills a part of it
    const vel = await strip.locator('.ic-vel i').evaluate((e) => e.getBoundingClientRect().width / (e.parentElement!.clientWidth || 1));
    expect(vel).toBeGreaterThan(0.3);
    expect(vel).toBeLessThan(0.5);
    await expect(strip.locator('[data-ic-link="midi"]')).toHaveAttribute('href', '#/settings/midi');
    await oneRow(page);
    await fits(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/drill-midi-${lang}.png` });
  });

  test(`lesson gate: a sung item shows the mic strip; a choice item shows none (${lang})`, async ({ page }) => {
    // A seeded player (the simulator keeps no settings, so it would open the course start instead).
    await seed(page, lang);
    await page.goto(`/?brief=1&unlock=all&lang=${lang}#/topic/sing-intervals/2`);
    await expect(page.locator('[data-brief]')).toBeVisible();
    await expect(page.locator('[data-brief] [data-input-check="mic"]')).toBeVisible();
    await oneRow(page);
    await fits(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/gate-${lang}.png` });
    await page.goto('about:blank');
    await page.goto(`/?brief=1&unlock=all&lang=${lang}#/topic/basics-highlow/1`);
    await expect(page.locator('[data-brief]')).toBeVisible();
    await expect(page.locator('[data-input-check]')).toHaveCount(0);
  });

  test(`highway: pitch mode shows the strip, tap mode none (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/highway`);
    await page.locator('[data-hw-mode="tap"]').click();
    await expect(page.locator('[data-start-highway]')).toBeVisible();
    await expect(page.locator('[data-input-check]')).toHaveCount(0);
    await page.locator('[data-hw-mode="pitch"]').click();
    await expect(page.locator('[data-input-check="mic"]')).toBeVisible();
    await oneRow(page);
    await expect(page.locator('[data-input-check="mic"]')).toHaveAttribute('data-ic-state', 'got');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/highway-${lang}.png` });
  });
}
