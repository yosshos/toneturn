import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Encore / הדרן (SPEC-PHRASE-STUDIO): record mode with a stub MIDI keyboard → caught → trim → context → plan → run (a
// measured take) → the 12-key map; "Keep this phrase" from a take review back into trim. Every screen fits 320×720 in
// English and Hebrew; Hebrew screens show no Latin outside <bdi> / dir=ltr. SHOTS=1 saves screens to docs/encore-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;
const SHOT_DIR = 'docs/encore-shots';
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
type Lang = 'en' | 'he';

const stubMidi = async (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });

const seed = async (page: Page, lang: Lang) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9' };
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
const open = async (page: Page, lang: Lang, hash: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${hash}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(500);
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
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/phrase-${what}-${lang}.png` });
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};
/** Play a phrase on the stub keyboard: ii–V–I-ish eighths in F at ♩120 (real time). */
const playPhrase = async (page: Page) =>
  page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    const line = [67, 70, 74, 77, 74, 70, 67, 65, 64, 67, 70, 72, 70, 67, 64, 60, 65, 69, 72, 76, 72, 69, 65, 64, 65];
    const P = 250; // eighths at ♩120
    for (let i = 0; i < line.length; i++) {
      inp.onmidimessage({ data: new Uint8Array([0x90, line[i], 70 + (i % 4 === 0 ? 30 : 0)]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, P * 0.85));
      inp.onmidimessage({ data: new Uint8Array([0x80, line[i], 0]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, P * 0.15));
    }
  });

for (const lang of ['en', 'he'] as Lang[]) {
  test(`Encore: record (stub MIDI) → caught → trim → context → plan → run → map (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    await stubMidi(page);
    await seed(page, lang);
    await open(page, lang, 'encore');
    await expect(page.locator('[data-encore="home"]')).toBeVisible();
    await check(page, lang, 'home');
    await page.locator('[data-enc-record]').click();
    await expect(page.locator('[data-encore="record"][data-rec-state="armed"]')).toBeVisible();
    await check(page, lang, 'record-armed');
    // starts on the first note
    const playing = playPhrase(page);
    await expect(page.locator('[data-rec-state="listening"]')).toBeVisible();
    await playing;
    await check(page, lang, 'record-listening');
    // stops by itself after 2.5 s of silence
    await expect(page.locator('[data-encore="caught"]')).toBeVisible({ timeout: 8000 });
    await check(page, lang, 'caught');
    await page.locator('[data-caught-next]').click();
    await expect(page.locator('[data-encore="trim"]')).toBeVisible();
    await expect(page.locator('[data-handle="from"]')).toBeVisible();
    await check(page, lang, 'trim');
    await page.locator('[data-seg="score"]').click();
    await check(page, lang, 'trim-score');
    await page.locator('[data-seg="roll"]').click();
    await page.locator('[data-trim-next]').click();
    await expect(page.locator('[data-encore="context"]')).toBeVisible();
    await check(page, lang, 'context');
    // one-tap wrong-note fix on a note
    await page.locator('.enc-ctx-roll [data-note]').nth(2).click();
    await expect(page.locator('[data-note-pop]')).toBeVisible();
    await check(page, lang, 'context-fix');
    await page.locator('[data-wrong-fix]').click();
    await page.locator('[data-ctx-save]').click();
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    await expect(page.locator('[data-ring-key]')).toHaveCount(12);
    await expect(page.locator('[data-why-line]')).toBeVisible();
    await check(page, lang, 'plan');
    await page.locator('[data-diff-why]').click();
    await expect(page.locator('[data-why-parts]')).toBeVisible();
    await check(page, lang, 'plan-why');
    await page.locator('[data-diff-why]').click();
    await page.locator('[data-plan-start]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await expect(page.locator('[data-run-stage="free"]')).toBeVisible();
    await check(page, lang, 'run-free');
    // straight to tempo, then a measured (synthesized) take through the real analysis
    await page.locator('[data-rubato-skip]').click();
    await expect(page.locator('[data-run-stage="tempo"]')).toBeVisible();
    await check(page, lang, 'run-tempo');
    await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
    await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
    await expect(page.locator('[data-review]')).toBeVisible();
    await expect(page.locator('[data-after-line]')).toBeVisible();
    await check(page, lang, 'after-take');
    // the map
    await page.locator('.enc-head .icon-btn').first().click();
    await expect(page.locator('[data-encore="phrase"]')).toBeVisible();
    await expect(page.locator('.enc-map thead th.k')).toHaveCount(12);
    await expect(page.locator('[data-cell$=":clean"], [data-cell$=":current"]').first()).toBeVisible();
    await check(page, lang, 'map');
    // the library
    await page.goto(`/?unlock=all&lang=${lang}#/encore/library`);
    await expect(page.locator('[data-lib-phrase]')).toHaveCount(1);
    await check(page, lang, 'library');
  });
}

test('Encore: "Keep this phrase" on a take review opens the trim screen on that take', async ({ page }) => {
  test.setTimeout(180_000);
  await stubMidi(page);
  await seed(page, 'en');
  // a phrase to practise, made through record mode quickly
  await open(page, 'en', 'encore/record');
  const playing = playPhrase(page);
  await expect(page.locator('[data-rec-state="listening"]')).toBeVisible();
  await playing;
  await expect(page.locator('[data-encore="caught"]')).toBeVisible({ timeout: 10_000 });
  await page.locator('[data-caught-next]').click();
  await page.locator('[data-trim-next]').click();
  await page.locator('[data-ctx-save]').click();
  await page.locator('[data-plan-start]').click();
  await page.locator('[data-rubato-skip]').click();
  await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'mixed'));
  await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
  await expect(page.locator('[data-review]')).toBeVisible();
  await expect(page.locator('[data-keep-phrase]')).toBeVisible();
  await fits(page, 'review with keep');
  await page.locator('[data-keep-phrase]').click();
  await expect(page.locator('[data-encore="trim"]')).toBeVisible();
  expect(page.url()).toMatch(/encore\/new\?take=mem/);
  // never lose progress: a reload returns to the same handles
  const sel = await page.locator('[data-encore="trim"]').getAttribute('data-sel');
  await page.reload();
  await expect(page.locator('[data-encore="trim"]')).toHaveAttribute('data-sel', sel!);
});

test('Encore: "Practise this span" in the recordings player opens trim on that take, the A–B span selected', async ({ page }) => {
  test.setTimeout(180_000);
  await stubMidi(page);
  await seed(page, 'en');
  // a free recording (record mode keeps it in My recordings)
  await open(page, 'en', 'encore/record');
  const playing = playPhrase(page);
  await expect(page.locator('[data-rec-state="listening"]')).toBeVisible();
  await playing;
  await expect(page.locator('[data-encore="caught"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-encore="caught"]')).toBeVisible();
  // the shelf on Encore's home lists it
  await page.goto('/?unlock=all&lang=en#/encore');
  await expect(page.locator('[data-shelf-take]').first()).toBeVisible();
  // My recordings → the player → A–B → Practise this span
  await page.goto('/?lang=en#/recordings');
  const rows = page.locator('[data-rec-take]');
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  const id = (await rows.first().getAttribute('data-rec-take'))!;
  await page.locator(`[data-rec-open="${id}"]`).click();
  const player = page.locator('[data-recordings="player"]');
  await expect(player).toBeVisible();
  await page.locator('[data-rec-seta]').click();
  const ab = (await player.getAttribute('data-rec-ab'))!.split(':').map(Number);
  await page.locator('[data-rec-practice]').click();
  await expect(page.locator('[data-encore="trim"]')).toBeVisible();
  expect(page.url()).toContain(`take=${encodeURIComponent(id)}`);
  const sel = (await page.locator('[data-encore="trim"]').getAttribute('data-sel'))!.split('-').map(Number);
  expect(sel[1]).toBeGreaterThan(sel[0]);
  expect(ab[1]).toBeGreaterThan(ab[0]);
  await fits(page, 'trim from the player');
  // and on through context to a saved phrase
  await page.locator('[data-trim-next]').click();
  await page.locator('[data-ctx-save]').click();
  await expect(page.locator('[data-encore="plan"]')).toBeVisible();
});

test('Encore lives inside the Licks tile: no Encore tile on Practice, no Encore item in the sidebar', async ({ page }) => {
  await seed(page, 'he');
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, 'he', 'arcade');
  await expect(page.locator('[data-hub="licks"]')).toBeVisible();
  await expect(page.locator('[data-hub="encore"]')).toHaveCount(0);
  await page.locator('[data-nav="arcade"]').first().click();
  await expect(page.locator('[data-nav="encore"]')).toHaveCount(0);
});
