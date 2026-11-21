import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Encore v3 — community challenges (SPEC-PHRASE-STUDIO §12), on the dev mock server (localStorage tt.mockChallenges = 1;
// "anon" = a visitor without an account): share a phrase → its challenge page → the gallery → take the featured
// challenge → one measured (synthesized) take in Encore → my row appears on the board; report hides a row and a phrase;
// the public link page for visitors (hear, see, try in free time). Every screen fits 320×720, en and he, and in Hebrew
// no Latin text stands outside <bdi>. E2E_BASE: another dev server (a worktree's own vite). SHOTS=1 saves the screens.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const SHOTS = !!process.env.SHOTS;
if (SHOTS) mkdirSync('docs/encore-shots', { recursive: true });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};

const PHRASE = {
  id: 'enc-e2echl1',
  v: 3,
  ctx: 'major-251',
  level: 3,
  name: { en: 'ii–V in F, two enclosures', he: 'ii–V ב־F, שתי הקפות' },
  own: true,
  chords: [
    [2, 'm7', 4],
    [7, '7', 4],
  ],
  notes: [0, 4, 7, 11, 14, 11, 7, 6, 5, 2, 10, 9, 7, 3, 2, 0].map((s, i) => [s, i * 0.5, 0.5]),
  meter: 4,
  swing: 0.6,
  homeKey: 5,
  instrument: 'piano',
  playedBpm: 120,
  createdAt: '2026-11-10T10:00:00Z',
  plan: { startBpm: 90, goalBpm: 160, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true },
};

const seed = async (page: Page, lang: Lang, mock: '1' | 'anon' = '1') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, mock, phrase }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [{ sessionId: 'seed-1', lessonId: 'bflat-two-homes', lessonVersion: 1, firstTry: 3, total: 3, xp: 10, missed: [], completedAt: new Date(Date.now() - 86_400_000).toISOString() }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, nickname: 'Ronit', birthYear: 1990, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { keys: { legacy: true } }, seenVersion: '9.9.9', drills, lickBook: { own: [phrase] } };
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
      localStorage.setItem('tt.mockChallenges', mock);
      localStorage.setItem('tt.mockChallenges.age', '1990');
      localStorage.setItem('tt.mockChallenges.name', 'Ronit');
    },
    { lang, mock, phrase: PHRASE },
  );
};
const fits = async (page: Page, what: string) => {
  const m = await page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
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
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, [aria-hidden="true"], .sim-banner, title, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      out.push(t.trim().slice(0, 60));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, lang: Lang, what: string) => {
  await page.waitForTimeout(250);
  await shot(page, `chl-${what}-${lang}`);
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};

for (const lang of ['en', 'he'] as Lang[]) {
  test(`share → challenge page → gallery → take the featured challenge → a measured take on the board; report hides (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await seed(page, lang);

    // the share sheet
    await page.goto(`/?lang=${lang}#/challenges/share/${PHRASE.id}`);
    await expect(page.locator('[data-chl="share"]')).toBeVisible();
    await expect(page.locator('[data-share-send]')).toBeDisabled(); // attestation first
    await check(page, lang, 'share');
    await page.locator('[data-share-attest]').check();
    await page.locator('[data-seg="public"]').click();
    await expect(page.locator('[data-share-send]')).toBeEnabled();
    await page.locator('[data-share-send]').click();
    const shared = page.locator('[data-chl="shared"]');
    await expect(shared).toBeVisible();
    const code = (await shared.getAttribute('data-share-code'))!;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    await expect(page.locator(`[data-share-link$="#/p/${code}"]`)).toBeVisible();
    await expect(page.locator('[data-share-card]')).toBeVisible();
    await check(page, lang, 'shared');
    // my lick remembers its share
    await page.locator('[data-share-open]').click();
    await expect(page.locator(`[data-chl="page"][data-chl-code="${code}"]`)).toBeVisible();
    await expect(page.locator('[data-chl-practice]')).toBeVisible();
    await check(page, lang, 'page-mine');

    // the gallery: featured, friends, rising — a finite page
    await page.goto(`/?lang=${lang}#/challenges`);
    await expect(page.locator('[data-gallery="ready"]')).toBeVisible();
    await expect(page.locator('[data-gallery-featured]')).toBeVisible();
    await expect(page.locator('[data-gallery-friends="2"]')).toBeVisible();
    await expect(page.locator('[data-gallery-end]')).toBeVisible();
    await check(page, lang, 'gallery');
    await page.locator('[data-gfilter="inst-guitar"]').click();
    await expect(page.locator('[data-gallery-friends="0"]')).toBeVisible();
    await page.locator('[data-gfilter="inst-guitar"]').click();
    const featured = (await page.locator('[data-gallery-featured]').getAttribute('data-gallery-featured'))!;

    // the challenge page → take it
    await page.locator(`[data-gallery-featured] [data-gallery-phrase="${featured}"]`).click();
    await expect(page.locator(`[data-chl="page"][data-chl-code="${featured}"]`)).toBeVisible();
    await expect(page.locator('[data-board-row]').first()).toBeVisible();
    await expect(page.locator('[data-board-me]')).toHaveCount(0);
    await check(page, lang, 'page');
    await page.locator('[data-chl-take]').click();
    await expect(page.locator('[data-encore="phrase"]')).toBeVisible();
    const phraseId = `enc-sh-${featured}`;
    await expect(page.locator(`[data-encore="phrase"][data-phrase="${phraseId}"]`)).toBeVisible();

    // one measured take (the drill engine's analysis on synthesized input)
    await page.locator('[data-phrase-continue]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await page.locator('[data-rubato-skip]').click();
    await expect(page.locator('[data-run-stage="tempo"]')).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
    await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
    await expect(page.locator('[data-review]')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);

    // back on the challenge page: my measured result is on the board
    await page.goto(`/?lang=${lang}#/challenges/p/${featured}`);
    await expect(page.locator('[data-board-me="1"]')).toBeVisible({ timeout: 15_000 });
    const db = await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockChallenges.db') ?? '{}'));
    const mine = db.results.find((r: { user: string; phrase: string }) => r.user === 'me' && r.phrase === 'p-coda');
    expect(mine).toBeTruthy();
    expect(mine.best_bpm).toBeGreaterThan(0);
    expect(mine.flagged).toBe(false);
    await expect(page.locator('[data-chl-practice]')).toBeVisible();
    await check(page, lang, 'page-taken');

    // "הדרן!" (a reaction), then "beat my tempo" makes a link
    await page.locator('[data-react="encore"][data-react-on="0"]').click();
    await expect(page.locator('[data-react="encore"][data-react-on="1"]')).toBeVisible();
    await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }));
    await page.locator('[data-beat-link]').click();
    await expect(page.locator('[data-chl-msg]')).toBeVisible();
    await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockChallenges.db') ?? '{}').beats?.length ?? 0))).toBe(1);

    // report a board row: it disappears for me at once
    const other = page.locator('[data-row-report]').first();
    const who = (await other.getAttribute('data-row-report'))!;
    await other.click();
    await expect(page.locator('[data-chl-report]')).toBeVisible();
    await check(page, lang, 'report');
    await page.locator('[data-report-send]').click();
    await expect(page.locator(`[data-board-row="${who}"]`)).toHaveCount(0);

    // report the phrase itself: back to the gallery, and it is gone from it
    await page.locator('[data-phrase-report]').click();
    await page.locator('[data-report-kind="copied"]').check();
    await page.locator('[data-report-send]').click();
    await expect(page.locator('[data-chl="gallery"]')).toBeVisible();
    await expect(page.locator('[data-gallery="ready"]')).toBeVisible();
    await expect(page.locator(`[data-gallery-phrase="${featured}"]`)).toHaveCount(0);

    // the review list (the mock device is an admin)
    await page.goto(`/?lang=${lang}#/challenges/review`);
    await expect(page.locator('[data-review-item="row"]').first()).toBeVisible();
    await check(page, lang, 'review');
  });

  test(`the public link opens without an account: hear, see, try in free time (${lang})`, async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page, lang, 'anon');
    await page.goto(`/?lang=${lang}#/p/CQDAFXC5`);
    await expect(page.locator('[data-chl="public"]')).toBeVisible();
    await expect(page.locator('.chl-staff')).toBeVisible();
    await expect(page.locator('[data-public-play]')).toBeVisible();
    await expect(page.locator('[data-public-signin]')).toBeVisible();
    await check(page, lang, 'public');
    // free time on the on-screen keys: the marked key moves on
    for (let i = 0; i < 3; i++) {
      await page.locator('.chl-keys .next').first().dispatchEvent('pointerdown');
      await expect(page.locator(`[data-try-i="${i + 1}"]`)).toBeVisible();
    }
    // a friends-only or unknown code says so
    await page.goto(`/?lang=${lang}#/p/NQAKBLS3`);
    await page.reload();
    await expect(page.locator('[data-public-none]')).toBeVisible();
  });
}

test('signed in, the public link goes straight to the challenge page', async ({ page }) => {
  await seed(page, 'en');
  await page.goto('/?lang=en#/p/TAMDDLD4');
  await expect(page.locator('[data-chl="page"][data-chl-code="TAMDDLD4"]')).toBeVisible({ timeout: 15_000 });
});
