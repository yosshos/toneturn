import { expect, test, type Page } from '@playwright/test';

// "My song" in every course (SPEC-MY-SONG): a recording of your own is added, analysed once and kept on the device
// (IndexedDB), then practised with the course's measuring; every screen fits one phone (390 × 844).

// Takes use Chromium's fake microphone; the suite denies the microphone unless a test grants it.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['microphone'] });

/** A 20 s song as a 16-bit WAV: a kick on every beat at 100 BPM and a sine melody, one note a beat. */
function songWav(): Buffer {
  const sr = 22050;
  const n = sr * 20;
  const x = new Float32Array(n);
  const tune = [72, 74, 76, 77, 79, 77, 76, 74];
  for (let k = 0; k < 32; k++) {
    const s = Math.round((0.5 + k * 0.6) * sr);
    for (let i = 0; i < sr * 0.15 && s + i < n; i++) x[s + i] += 0.5 * Math.exp(-i / (0.03 * sr)) * Math.sin(2 * Math.PI * 60 * (i / sr));
    const f = 440 * 2 ** ((tune[k % 8] - 69) / 12);
    for (let i = 0; i < sr * 0.48 && s + i < n; i++) x[s + i] += 0.3 * Math.min(1, i / 80) * Math.sin((2 * Math.PI * f * i) / sr);
  }
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 0x7fff), 44 + i * 2);
  return b;
}

/** A returning player in `course` (onboarding done). */
const seed = async (page: Page, course: string, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ course, lang }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, headphones: true, micLatencyMs: 60, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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
    { course, lang },
  );
};
const overflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight);

for (const [course, lang] of [
  ['keys', 'he'],
  ['drums', 'en'],
] as const) {
  test(`my song (${course}, ${lang}): add, analyse, keep, play along, resume`, async ({ page }) => {
    await seed(page, course, lang);
    await page.goto('/#/mysong');
    await expect(page.locator('[data-my-song]')).toBeVisible({ timeout: 60_000 });
    await page.locator('[data-ms-file]').setInputFiles({ name: 'band_take.wav', mimeType: 'audio/wav', buffer: songWav() });
    const practice = page.locator(`[data-my-song-practice="${course}"]`);
    await expect(practice).toBeVisible({ timeout: 90_000 });
    // The beat of the synthetic song is found: timing is measured.
    await expect(page.locator('[data-ms-plan]')).toHaveAttribute('data-ms-plan', /timing/);
    expect(await overflow(page), 'practice screen').toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/mysong-${course}-${lang}.png` });
    // A take with the fake microphone runs to a result (measured or "not counted").
    await page.locator('[data-ms-take]').click();
    await expect(page.locator('[data-ms-verdict]')).toBeVisible({ timeout: 60_000 });
    expect(await overflow(page), 'result').toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/mysong-${course}-${lang}-result.png` });
    // Kept on the device: after a reload the session resumes, or the library lists the song.
    await page.reload();
    await expect(page.locator(`[data-my-song-practice="${course}"], [data-my-songs="1"]`).first()).toBeVisible({ timeout: 60_000 });
  });
}

test('my song: the Practice tile opens it (guitar, he)', async ({ page }) => {
  await seed(page, 'guitar', 'he');
  await page.goto('/#/arcade');
  const tile = page.locator('[data-hub="mysong"]');
  await expect(tile).toBeVisible({ timeout: 60_000 });
  await tile.click();
  await expect(page.locator('[data-my-song="guitar"]')).toBeVisible();
  expect(await overflow(page), 'library').toBeLessThanOrEqual(2);
  await page.screenshot({ path: 'test-results/mysong-guitar-library-he.png' });
});

test('my song library: rename and delete (en)', async ({ page }) => {
  await seed(page, 'bass', 'en');
  await page.goto('/#/mysong');
  await page.locator('[data-ms-file]').setInputFiles({ name: 'groove.wav', mimeType: 'audio/wav', buffer: songWav() });
  await expect(page.locator('[data-my-song-practice="bass"]')).toBeVisible({ timeout: 90_000 });
  await page.locator('.ms-screen .screen-head .icon-btn').click();
  await expect(page.locator('[data-my-songs="1"]')).toBeVisible();
  expect(await overflow(page), 'library').toBeLessThanOrEqual(2);
  await page.locator('[data-ms-rename]').click();
  await page.locator('.ms-name-input').fill('Sunday groove');
  await page.locator('[data-ms-save-name]').click();
  await expect(page.locator('.ms-open b')).toHaveText('Sunday groove');
  await page.locator('[data-ms-del]').click();
  await page.locator('[data-ms-confirm-del]').click();
  await expect(page.locator('[data-my-songs="0"]')).toBeVisible();
});

test('my song (ear, simulator): the demo recording opens a phrase to transcribe and fits', async ({ page }) => {
  await page.goto('/?sim=1&unlock=all&lang=en#/mysong');
  await page.locator('[data-my-song-demo]').click({ timeout: 60_000 });
  await expect(page.locator('[data-my-song-practice="ear"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-ms-plan]')).toHaveAttribute('data-ms-plan', 'transcribe');
  expect(await overflow(page)).toBeLessThanOrEqual(2);
  await page.locator('[data-ms-take]').click();
  await expect(page.locator('[data-ms-step="back"]')).toBeVisible();
  expect(await overflow(page), 'play-back step').toBeLessThanOrEqual(2);
  await page.screenshot({ path: 'test-results/mysong-ear-en.png' });
});
