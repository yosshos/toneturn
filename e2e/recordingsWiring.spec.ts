import { expect, test, type Page } from '@playwright/test';

// My recordings, part A's open items (SPEC-PHRASE-STUDIO §6): a microphone drill take keeps its audio (Chromium's fake
// microphone); a lesson's sung answer and a game run land in the library with their own kind; the library pages by 30
// ("Show more" loads the next page); the diary lists the day's recordings; the screens fit 320×720 in English and
// Hebrew. E2E_BASE: another dev server (a worktree's own vite). SHOTS=1 saves screens to docs/encore-shots/.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, permissions: ['microphone'], ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};

type Lang = 'en' | 'he';

/** A steady sung tone as the microphone (Chromium's fake device only beeps): an oscillator's stream for getUserMedia. */
const toneMic = (page: Page, hz = 392) =>
  page.addInitScript((hz) => {
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c?: MediaStreamConstraints) => {
      if (!c?.audio) return orig(c);
      const ctx = new AudioContext();
      void ctx.resume();
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      const d = ctx.createMediaStreamDestination();
      o.connect(g).connect(d);
      o.start();
      return d.stream;
    };
  }, hz);
const seed = async (page: Page, lang: Lang, course = 'keys') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, voiceRange: { low: 48, high: 72 }, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: course === 'voice' ? [] : [course], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', drills };
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
    { lang, course },
  );
};

const fits = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const scope = document.querySelector('main') ?? document.body;
    const outside = [...scope.querySelectorAll('button, a, input')].filter((b) => {
      const r = (b as HTMLElement).getBoundingClientRect();
      if (!r.width || (b as HTMLElement).closest('.rec-chips, .chips, .ps-seg')) return false; // chip rows scroll sideways by design
      return r.left < -1 || r.right > innerWidth + 1;
    }).length;
    return { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, outside };
  });

/** The takes kept so far (read through the app's own module on the dev server). */
const kept = (page: Page) =>
  page.evaluate(async () => {
    const path = '/src/storage/recordings.ts';
    const m = await import(/* @vite-ignore */ path);
    const ts = (await m.listTakes()) as { kind: string; source: string; audioId?: string; itemId?: string; notes?: Uint8Array }[];
    return ts.map((t) => ({ kind: t.kind, source: t.source, audio: !!t.audioId, item: t.itemId ?? '', notes: t.notes?.length ?? 0 }));
  });

for (const lang of ['en', 'he'] as const) {
  test(`a microphone drill take keeps its audio; the library and the diary show it (${lang})`, async ({ page }) => {
    await toneMic(page, 262);
    await seed(page, lang);
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.locator('[data-topic="all"]').click();
    await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
    const card = page.locator('[data-level="scales-1"]');
    await card.scrollIntoViewIfNeeded();
    if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
    await page.locator('[data-level-start="scales-1"]').click();
    await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
    await expect(page.locator('[data-drills="run"]')).toBeVisible();
    const before = await page.evaluate(() => ({ h: document.scrollingElement!.scrollHeight }));
    await page.locator('[data-drill-play]').click();
    await expect(page.locator('.drill-result')).toBeVisible({ timeout: 60_000 });
    // recording never changes the exercise layout: still one screen
    const after = await page.evaluate(() => ({ h: document.scrollingElement!.scrollHeight }));
    expect(after.h).toBeLessThanOrEqual(Math.max(before.h, 720) + 2);
    await expect.poll(async () => (await kept(page)).filter((t) => t.kind === 'drill' && t.source === 'mic' && t.audio).length, { timeout: 10_000 }).toBe(1);

    await page.goto(`/?lang=${lang}#/recordings`);
    const row = page.locator('[data-rec-take]');
    await expect(row).toHaveCount(1);
    await expect(row.first()).toHaveAttribute('data-rec-audio', '1');
    await shot(page, `wiring-library-mic-${lang}`);
    expect(await fits(page)).toEqual({ wide: 0, outside: 0 });
    // the player has the audio
    await row.first().locator('[data-rec-open]').click();
    await expect(page.locator('[data-recordings="player"]')).toBeVisible();
    expect(await fits(page)).toEqual({ wide: 0, outside: 0 });

    // the diary: Time and Journal list the day's recording, linking to the player
    await page.goto(`/?lang=${lang}#/diary`);
    await page.locator('[data-pd-tabbtn="time"]').click();
    await expect(page.locator('[data-rec-daycard] [data-rec-dayrec]')).toHaveCount(1);
    await shot(page, `wiring-diary-time-${lang}`);
    expect(await fits(page)).toEqual({ wide: 0, outside: 0 });
    await page.locator('[data-pd-tabbtn="journal"]').click();
    const link = page.locator('.pd-day [data-rec-dayrec]').first();
    await expect(link).toBeVisible();
    await shot(page, `wiring-diary-journal-${lang}`);
    expect(await fits(page)).toEqual({ wide: 0, outside: 0 });
    await link.click();
    await expect(page.locator('[data-recordings="player"]')).toBeVisible();
  });
}

test('a lesson sung answer is kept as a lesson take', async ({ page }) => {
  await toneMic(page);
  await seed(page, 'en', 'voice');
  await page.goto('about:blank');
  await page.goto('/?brief=1&unlock=all&lang=en#/topic/sing-intervals/2');
  await page.locator('[data-brief-play]').click({ timeout: 10_000 });
  const rec = page.locator('.btn.record:not([disabled])');
  await rec.first().click({ timeout: 30_000 });
  await expect.poll(async () => (await kept(page)).filter((t) => t.kind === 'lesson').length, { timeout: 60_000 }).toBeGreaterThan(0);
  const t = (await kept(page)).find((x) => x.kind === 'lesson')!;
  expect(t.notes).toBeGreaterThan(0);
  await page.goto('/?lang=en#/recordings');
  await expect(page.locator('[data-rec-take][data-rec-kind="lesson"]').first()).toBeVisible();
});

test('a game run (MIDI) is kept as a game take', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
  await seed(page, 'en', 'keys');
  await page.clock.install();
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=en#/voicingsprint');
  // the game's own run: Start, keys played on the (stub) MIDI keyboard, the run's clock runs out → its result
  await page.locator('main .btn.mega:visible').last().click();
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: ((e: { data: Uint8Array; timeStamp: number }) => void) | null } }).__midiIn;
    const send = (d: number[]) => inp.onmidimessage?.({ data: new Uint8Array(d), timeStamp: performance.now() });
    for (const chord of [[60, 64, 67, 71], [62, 65, 69, 72]]) {
      for (const m of chord) send([0x90, m, 90]);
      await new Promise((r) => setTimeout(r, 400));
      for (const m of chord) send([0x80, m, 0]);
      await new Promise((r) => setTimeout(r, 1500));
    }
  });
  await page.clock.fastForward(180_000);
  await page.clock.runFor(1000);
  await expect.poll(async () => (await kept(page)).filter((t) => t.kind === 'game' && t.item === 'game:voicingsprint').length, { timeout: 10_000 }).toBe(1);
  await page.goto('/?lang=en#/recordings');
  await expect(page.locator('[data-rec-take][data-rec-kind="game"]')).toHaveCount(1);
});

for (const lang of ['en', 'he'] as const) {
  test(`the library pages by 30: Show more loads the next page; search still finds an old take (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?lang=${lang}#/recordings`);
    await page.evaluate(async () => {
      const path = '/src/storage/recordings.ts';
      const m = await import(/* @vite-ignore */ path);
      const T = Date.now() - 70 * 3 * 3_600_000;
      for (let i = 0; i < 70; i++) {
        const at = T + i * 3 * 3_600_000; // three hours apart: one session each
        await m.saveTake(
          { at: new Date(at).toISOString(), durationMs: 3000, course: 'keys', instrument: 'piano', kind: 'drill', itemId: `scales:${i}`, title: { en: `Scale ${i}`, he: `סולם ${i}` }, sung: false, source: 'midi', played: [0, 1, 2, 3].map((k) => ({ pitch: 60 + k, on: k * 300, off: k * 300 + 250, vel: 80 })), bpm: 90, meter: 4, t0: 0 },
          null,
          { now: at },
        );
      }
    });
    await page.reload();
    const rows = page.locator('[data-rec-take]');
    await expect(rows).toHaveCount(30, { timeout: 10_000 });
    await expect(page.locator('.rec-timeline')).toHaveAttribute('data-rec-more', '1');
    await page.locator('[data-rec-loadmore]').click();
    await expect(rows).toHaveCount(60);
    await page.locator('[data-rec-loadmore]').click();
    await expect(rows).toHaveCount(70);
    await expect(page.locator('[data-rec-loadmore]')).toHaveCount(0);
    expect(await fits(page)).toEqual({ wide: 0, outside: 0 });
    await shot(page, `wiring-paged-${lang}`);
    // search reaches a take far past the first page
    await page.locator('[data-rec-search]').fill(lang === 'he' ? 'סולם 37' : 'scale 37');
    await expect(page.locator('[data-rec-take]')).toHaveCount(1);
  });
}
