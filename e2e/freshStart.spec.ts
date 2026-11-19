import { expect, test } from '@playwright/test';

// Testing round 2026-11-19: a used device opens the new version → its progress is cleared once, and a notice says why.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

for (const lang of ['he', 'en'] as const)
  test(`fresh start clears progress once and explains it (${lang})`, async ({ page }) => {
    await page.goto('/manifest.webmanifest');
    await page.evaluate(async (lang) => {
      localStorage.setItem('toneturn.e2e.fresh', '1');
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 120, applied: [], lessons: {}, history: [{ lessonId: 'x', lessonVersion: 1, sessionId: 's1', completedAt: '2026-11-10T10:00:00Z', firstTry: 3, total: 4, xp: 20, missed: [] }], streak: { count: 3, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, nickname: 'Tester', firstUseAt: '2026-11-01T10:00:00Z', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'jazz'], activeCourse: 'jazz', seenVersion: '9.9.9' };
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
    await page.goto('/?welcome');
    const sheet = page.locator('[data-fresh-notice]');
    await expect(sheet).toBeVisible({ timeout: 15000 });
    if (process.env.SHOTS) await page.screenshot({ path: `docs/fresh-shots/notice-${lang}.png` });
    await sheet.getByRole('button').click();
    await expect(sheet).toBeHidden();
    if (process.env.SHOTS) await page.screenshot({ path: `docs/fresh-shots/after-${lang}.png` });
    const kept = await page.evaluate(async () => {
      return await new Promise<{ nick: unknown; hist: number; course: unknown }>((res) => {
        const r = indexedDB.open('toneturn', 1);
        r.onsuccess = () => {
          const st = r.result.transaction('kv').objectStore('kv');
          const a = st.get('settings');
          const b = st.get('progress');
          b.onsuccess = () => res({ nick: a.result?.nickname, hist: b.result?.history?.length ?? 0, course: a.result?.activeCourse });
        };
      });
    });
    expect(kept.nick).toBe('Tester');
    expect(kept.hist).toBe(0);
    expect(kept.course).not.toBe('jazz');
    // once only
    await page.reload();
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-fresh-notice]')).toHaveCount(0);
  });
