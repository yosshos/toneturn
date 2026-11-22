import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Encore v2 part 1 (SPEC-PHRASE-STUDIO §4.3 v2, §7.4): record mode by microphone for the voice (a fake microphone that
// sings a steady tone sequence) → caught → trim → context → plan (the singer's range) → run (free time, then a measured
// take); a guitar phrase's plan (positions per key, same shape / by key) and its run (tab) with the stub input; Encore
// first in Train in the guitar course. Every screen fits 320×720 in English and Hebrew; Hebrew screens show no Latin
// outside <bdi> / dir=ltr. SHOTS=1 saves screens to docs/encore-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;
const SHOT_DIR = 'docs/encore-shots';
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
type Lang = 'en' | 'he';

/**
 * A fake microphone singing a tone sequence (Chromium's fake device only beeps): each getUserMedia call gets an
 * oscillator stream that waits `lead` s in silence (the noise floor), then sings each note for `on` s with a short
 * silence after it.
 */
const singingMic = (page: Page, notes: number[], o: { lead?: number; on?: number; off?: number } = {}) =>
  page.addInitScript(
    ({ notes, lead, on, off }) => {
      const md = navigator.mediaDevices;
      if (!md?.getUserMedia) return;
      const orig = md.getUserMedia.bind(md);
      md.getUserMedia = async (c?: MediaStreamConstraints) => {
        if (!c?.audio) return orig(c);
        const ctx = new AudioContext();
        void ctx.resume();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0;
        const d = ctx.createMediaStreamDestination();
        osc.connect(g).connect(d);
        let t = ctx.currentTime + lead;
        for (const m of notes) {
          osc.frequency.setValueAtTime(440 * 2 ** ((m - 69) / 12), t);
          g.gain.setValueAtTime(0.5, t);
          g.gain.setValueAtTime(0, t + on);
          t += on + off;
        }
        osc.start();
        return d.stream;
      };
    },
    { notes, lead: o.lead ?? 1.2, on: o.on ?? 0.4, off: o.off ?? 0.1 },
  );

const G_LICK = (now: string) => ({
  id: 'enc-gtest',
  v: 3,
  ctx: 'free',
  level: 3,
  name: { en: 'Pentatonic run', he: 'ריצה פנטטונית' },
  chords: [],
  notes: [[0, 0, 0.5], [3, 0.5, 0.5], [5, 1, 0.5], [7, 1.5, 0.5], [10, 2, 0.5], [7, 2.5, 0.5], [5, 3, 0.5], [3, 3.5, 0.5], [0, 4, 2]],
  meter: 4,
  swing: 0.5,
  straight: true,
  homeKey: 0,
  minor: true,
  own: true,
  instrument: 'guitar',
  playedBpm: 100,
  createdAt: now,
  plan: { startBpm: 60, goalBpm: 125, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true },
});

const seed = async (page: Page, lang: Lang, course: 'voice' | 'guitar') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, lick }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = {
        version: 2,
        uiLang: lang,
        inputLang: lang,
        outputLang: lang,
        mode: 'buttons',
        voiceConsent: true,
        voiceRange: { low: 48, high: 72 },
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: course === 'voice' ? [] : [course], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', course],
        activeCourse: course,
        seenVersion: '9.9.9',
        ...(course === 'guitar' ? { lickBook: { own: [lick] } } : {}),
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
    { lang, course, lick: G_LICK(new Date().toISOString()) },
  );
};
const open = async (page: Page, lang: Lang, hash: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${hash}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(400);
};
const fits = async (page: Page, what: string) => {
  const m = await page.evaluate(() => {
    const se = document.scrollingElement!;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth };
  });
  expect(m.side, `${what}: no horizontal scroll`).toBeLessThanOrEqual(1);
  expect(m.over, `${what}: one screen`).toBeLessThanOrEqual(2);
};
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, .visually-hidden, [aria-hidden="true"], .sim-banner, .dyn, .tier-chip, title, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const words = (t.match(/[A-Za-z]+/g) ?? []).filter((x) => x !== 'BPM');
      if (words.length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, lang: Lang, what: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/v2-${what}-${lang}.png` });
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};

for (const lang of ['en', 'he'] as Lang[]) {
  test(`Encore v2: voice by microphone → caught → trim → context → plan (range) → run (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    // a sung line in C: C D E F G E D C · E F G A G F E D (eighths-ish, 0.5 s apart)
    await singingMic(page, [60, 62, 64, 65, 67, 64, 62, 60, 64, 65, 67, 69, 67, 65, 64, 62]);
    await seed(page, lang, 'voice');
    await open(page, lang, 'encore');
    await expect(page.locator('[data-encore="home"]')).toBeVisible();
    await page.locator('[data-enc-record]').click();
    await expect(page.locator('[data-encore="record"][data-rec-source="mic"][data-rec-state="armed"]')).toBeVisible();
    await check(page, lang, 'voice-record-armed');
    // the first sung note starts the take; the trace and the notes follow
    await expect(page.locator('[data-rec-state="listening"]')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => Number(await page.locator('[data-encore="record"]').getAttribute('data-rec-notes')), { timeout: 15_000 }).toBeGreaterThanOrEqual(6);
    await check(page, lang, 'voice-record-listening');
    // stops by itself after 2.5 s of silence
    await expect(page.locator('[data-encore="caught"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-caught-audio]')).toBeVisible();
    await check(page, lang, 'voice-caught');
    await page.locator('[data-caught-next]').click();
    await expect(page.locator('[data-encore="trim"]')).toBeVisible();
    await check(page, lang, 'voice-trim');
    await page.locator('[data-trim-next]').click();
    await expect(page.locator('[data-encore="context"]')).toBeVisible();
    await check(page, lang, 'voice-context');
    await page.locator('[data-ctx-save]').click();
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    await expect(page.locator('[data-range-keys]')).toBeVisible();
    await check(page, lang, 'voice-plan');
    await page.locator('[data-plan-start]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await expect(page.locator('[data-run-stage="free"]')).toBeVisible();
    await check(page, lang, 'voice-run-free');
    await page.locator('[data-rubato-skip]').click();
    await expect(page.locator('[data-run-stage="tempo"]')).toBeVisible();
    await check(page, lang, 'voice-run-tempo');
    await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
    await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
    await expect(page.locator('[data-review]')).toBeVisible({ timeout: 30_000 });
    await check(page, lang, 'voice-after-take');
    // the take was saved with the voice's item id (its own 12-key map)
    await page.locator('.enc-head .icon-btn').first().click();
    await expect(page.locator('[data-encore="phrase"]')).toBeVisible();
    await check(page, lang, 'voice-map');
  });

  test(`Encore v2: guitar phrase plan (positions) → run (tab) with stub input (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await seed(page, lang, 'guitar');
    await open(page, lang, 'encore/plan/enc-gtest');
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    await expect(page.locator('[data-neck-mode="same"]')).toBeVisible();
    await check(page, lang, 'guitar-plan');
    // "by key" chooses each key's fingering on its own; back to "same shape"
    await page.locator('[data-neck-toggle]').click();
    await expect(page.locator('[data-neck-mode="per-key"]')).toBeVisible();
    await page.locator('[data-neck-toggle]').click();
    await expect(page.locator('[data-neck-mode="same"]')).toBeVisible();
    await page.locator('[data-plan-start]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await expect(page.locator('[data-run-pos]')).toBeVisible();
    await expect(page.locator('.drill-tab').first()).toBeVisible();
    await check(page, lang, 'guitar-run-free');
    await page.locator('[data-rubato-skip]').click();
    await expect(page.locator('[data-run-stage="tempo"]')).toBeVisible();
    await check(page, lang, 'guitar-run-tempo');
    await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
    await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
    await expect(page.locator('[data-review]')).toBeVisible({ timeout: 30_000 });
    await check(page, lang, 'guitar-after-take');
    await page.locator('.enc-head .icon-btn').first().click();
    await expect(page.locator('[data-encore="phrase"]')).toBeVisible();
    await expect(page.locator('.enc-map thead th.k')).toHaveCount(12);
    await check(page, lang, 'guitar-map');
  });
}

test('Encore v2: the guitar course shows the Licks tile (Encore inside it)', async ({ page }) => {
  await seed(page, 'he', 'guitar');
  await open(page, 'he', 'arcade');
  await expect(page.locator('[data-hub="licks"]')).toBeVisible();
  await expect(page.locator('[data-hub="encore"]')).toHaveCount(0);
});
