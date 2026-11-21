import { expect, test } from '@playwright/test';

// Owner 2026-11-20 (Kawai ES920 over MIDI): the app's sound for MIDI keys can be turned off in one tap, and the first
// time a keyboard connects the app asks whether it makes its own sound.
test.use({ viewport: { width: 390, height: 844 } });

test('a digital piano connects: the app asks once, then the top-bar switch turns the keys sound on and off', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const input = { name: 'KAWAI ES920', onmidimessage: null };
    const access = { inputs: new Map([['in1', input]]), onstatechange: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: () => Promise.resolve(access), configurable: true });
  });
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, intake: null, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', midiInput: true, courseStart: { ear: { legacy: true }, keys: { legacy: true } } };
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
  });
  await page.goto('/?keysask');
  const ask = page.locator('[data-keys-sound-ask]');
  await expect(ask).toBeVisible({ timeout: 60_000 });
  await expect(ask).toContainText('ES920');
  // A digital piano: "only my keyboard's sound" is the suggested answer.
  await expect(ask.locator('[data-keys-sound-answer="own"]')).toHaveClass(/primary/);
  await page.screenshot({ path: 'docs/fresh-shots/keys-sound-ask-he.png' });
  await ask.locator('[data-keys-sound-answer="own"]').click();
  await expect(ask).toHaveCount(0);
  const btn = page.locator('[data-keys-sound]:visible').first();
  await expect(btn).toHaveAttribute('data-keys-sound', 'off');
  await btn.click();
  await expect(page.locator('[data-keys-sound]:visible').first()).toHaveAttribute('data-keys-sound', 'on');
  // Asked once only.
  await page.reload();
  await expect(page.locator('[data-keys-sound]:visible').first()).toHaveAttribute('data-keys-sound', 'on', { timeout: 60_000 });
  await expect(page.locator('[data-keys-sound-ask]')).toHaveCount(0);
});
