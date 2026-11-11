import { expect, test, type Page } from '@playwright/test';

// Playtest 0.68: Chord Rush "Name the chord" on the keys showed a bare keyboard. The v2 theme paints every .wk / .bk
// (`:root[data-theme] .wk`, loaded last) and that hid the marked keys of the keys picture (.keys-pad .mk) and of the
// note-view keyboard aid (.keyboard .aid). Marked keys must differ from plain keys in light and dark.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const seed = async (page: Page, theme: 'light' | 'dark') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (theme) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: 'en', inputLang: 'en', outputLang: 'en', mode: 'buttons', voiceConsent: true, theme, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'ear', seenVersion: '9.9.9' };
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
  }, theme);
};

for (const theme of ['light', 'dark'] as const) {
  test(`marked piano keys are visible (${theme})`, async ({ page }) => {
    await seed(page, theme);
    await page.goto('/?sim=1&unlock=all&lang=en#/rush-chord');
    await page.getByRole('radio', { name: 'Keys', exact: true }).first().click();
    await page.locator('main .btn.primary, main .btn.mega').first().click();
    const pad = page.locator('.rush-pic .keys-pad');
    await expect(pad).toBeVisible();
    // The chord sounds: keys pictures get the Play-again button (and are auto-played).
    await expect(page.locator('.rush-replay')).toBeVisible();
    const r = await page.evaluate(() => {
      const bg = (el: Element) => getComputedStyle(el).backgroundColor;
      const pad = document.querySelector('.rush-pic .keys-pad')!;
      const marked = [...pad.querySelectorAll('button.mk')];
      const plainW = bg(pad.querySelector('button.wk:not(.mk)')!);
      const plainB = bg(pad.querySelector('button.bk:not(.mk)')!);
      const marks = marked.map((k) => ({ bg: bg(k), plain: k.classList.contains('wk') ? plainW : plainB }));
      // Probe the other marked keyboards' classes under the same cascade.
      const probe = document.createElement('div');
      probe.innerHTML =
        '<div class="keyboard"><div class="wk"></div><div class="wk aid"></div><div class="bk"></div><div class="bk aid"></div><div class="wk aid-tonic"></div></div>' +
        '<div class="keys-pad"><button class="wk"></button><button class="wk mk ok"></button><button class="wk mk wrong"></button><button class="wk mk answer"></button><button class="bk"></button><button class="bk mk given"></button></div>';
      document.body.appendChild(probe);
      const k = [...probe.querySelectorAll('.keyboard > div')].map(bg);
      const p = [...probe.querySelectorAll('.keys-pad > button')].map(bg);
      probe.remove();
      return { marks, k, p };
    });
    expect(r.marks.length).toBeGreaterThanOrEqual(3);
    for (const m of r.marks) expect(m.bg).not.toBe(m.plain);
    expect(r.k[1]).not.toBe(r.k[0]);
    expect(r.k[3]).not.toBe(r.k[2]);
    expect(r.k[4]).not.toBe(r.k[0]);
    for (const i of [1, 2, 3]) expect(r.p[i], `keys-pad mark ${i}`).not.toBe(r.p[0]);
    expect(r.p[5]).not.toBe(r.p[4]);
  });
}
