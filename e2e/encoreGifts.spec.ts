import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Reactions and gifts between friends (owner decisions 2026-11-16), on the dev mock server (localStorage
// tt.mockChallenges = 1; tt.mockChallenges.gifts = 1 seeds what friends already sent me): "הדרן!" + a compliment →
// the sharer sees per-kind counts, a viewer never does; one gift per practice day (practise first; a fermata, or a
// phrase dedication); a friend's fermata holds my missed day on the streak calendar; a dedicated phrase lands in my
// library marked with the sender; practise-together invites → five measured minutes each → the duet streak +1.
// Every screen fits 320×720, en and he; in Hebrew no Latin text outside <bdi>. E2E_BASE: another dev server.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const SHOTS = !!process.env.SHOTS;
if (SHOTS) mkdirSync('docs/encore-shots', { recursive: true });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};

const PHRASE = {
  id: 'enc-e2egift1',
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

/** Seed the app: settings + progress (practice days = offsets from today), the mock, today's measured minutes. */
const seed = async (page: Page, lang: Lang, o: { gifts?: boolean; measuredMin?: number; days?: number[] } = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, phrase, o }) => {
      const ld = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayAt = (off: number) => ld(new Date(Date.now() + off * 86_400_000));
      const now = new Date().toISOString();
      const days = (o.days ?? []).map(dayAt);
      const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], stats: { days, goodSessions: 0, xpByDay: {} } };
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
      localStorage.setItem('tt.mockChallenges', '1');
      localStorage.setItem('tt.mockChallenges.age', '1990');
      localStorage.setItem('tt.mockChallenges.name', 'Ronit');
      if (o.gifts) localStorage.setItem('tt.mockChallenges.gifts', '1');
      const today = dayAt(0);
      if (o.measuredMin) localStorage.setItem('toneturn.practice.v1', JSON.stringify({ v: 1, since: today, days: { [today]: { 'keys|technique|||edge': o.measuredMin * 60_000 } }, items: {}, notes: [], booked: [] }));
    },
    { lang, phrase: PHRASE, o },
  );
};
/** Add measured minutes to today (outside the app, then back in: the ledger is read on load). */
const addMinutes = async (page: Page, lang: Lang, min: number, hash: string) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate((min) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const l = JSON.parse(localStorage.getItem('toneturn.practice.v1') ?? 'null') ?? { v: 1, since: today, days: {}, items: {}, notes: [], booked: [] };
    const b = (l.days[today] ??= {});
    b['keys|technique|||edge'] = (b['keys|technique|||edge'] ?? 0) + min * 60_000;
    localStorage.setItem('toneturn.practice.v1', JSON.stringify(l));
  }, min);
  await page.goto(`/?lang=${lang}#${hash}`);
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
const check = async (page: Page, lang: Lang, what: string, fit = true) => {
  await page.waitForTimeout(250);
  await shot(page, `gift-${what}-${lang}`);
  if (fit) await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};
const mockDb = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockChallenges.db') ?? '{}'));

for (const lang of ['en', 'he'] as Lang[]) {
  test(`reactions: "Encore!" + a compliment; the sharer sees per-kind counts, the viewer does not (${lang})`, async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page, lang);
    // as a viewer of BluesOwl's public phrase
    await page.goto(`/?lang=${lang}#/challenges/p/BLUESWL2`);
    await expect(page.locator('[data-chl="page"][data-chl-code="BLUESWL2"]')).toBeVisible();
    await expect(page.locator('[data-react]')).toHaveCount(4);
    await page.locator('[data-react="encore"]').click();
    await page.locator('[data-react="groove"]').click();
    await expect(page.locator('[data-chl-reactions="encore,groove"]')).toBeVisible();
    await expect(page.locator('[data-chl-reaction-counts]')).toHaveCount(0);
    await check(page, lang, 'reactions-viewer');
    await expect.poll(async () => (await mockDb(page)).reactions.filter((x: { user: string; phrase: string }) => x.user === 'me' && x.phrase === 'p-owl').length).toBe(2);
    // once each: tapping again takes it back
    await page.locator('[data-react="groove"]').click();
    await expect(page.locator('[data-chl-reactions="encore"]')).toBeVisible();

    // as the sharer: a phrase of mine that friends reacted to
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('tt.mockChallenges.db')!);
      const src = db.phrases.find((p: { id: string }) => p.id === 'p-noa');
      db.phrases.push({ ...src, id: 'p-mine', code: 'MYPHRSE2', owner: 'me', title: 'My blues opener', visibility: 'friends' });
      const at = new Date().toISOString();
      db.reactions.push({ phrase: 'p-mine', user: 'u-noa', kind: 'encore', at }, { phrase: 'p-mine', user: 'u-itai', kind: 'encore', at }, { phrase: 'p-mine', user: 'u-noa', kind: 'tone', at });
      localStorage.setItem('tt.mockChallenges.db', JSON.stringify(db));
    });
    await page.goto(`/?lang=${lang}#/challenges/p/MYPHRSE2`);
    await expect(page.locator('[data-chl="page"][data-chl-code="MYPHRSE2"]')).toBeVisible();
    await expect(page.locator('[data-chl-reaction-counts="encore:2,groove:0,tone:1,idea:0"]')).toBeVisible();
    await expect(page.locator('[data-react]')).toHaveCount(0);
    await check(page, lang, 'reactions-sharer');
    await page.goto(`/?lang=${lang}#/challenges/mine`);
    await expect(page.locator('[data-mine-phrase="MYPHRSE2"] [data-chl-reaction-counts="encore:2,groove:0,tone:1,idea:0"]')).toBeVisible();
    await check(page, lang, 'reactions-mine');
  });

  test(`one gift per practice day: practise first, then a fermata; the allowance is used (${lang})`, async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page, lang);
    await page.goto(`/?lang=${lang}#/challenges/gifts`);
    await expect(page.locator('[data-chl="gifts"][data-gift-allowance="practise-first"]')).toBeVisible();
    await expect(page.locator('[data-gift-fermata="u-noa"]')).toBeDisabled();
    await expect(page.locator('[data-gift-together="u-noa"]')).toBeEnabled(); // invites are separate
    await check(page, lang, 'practise-first');
    // five measured minutes today
    await addMinutes(page, lang, 6, '/challenges/gifts');
    await expect(page.locator('[data-chl="gifts"][data-gift-allowance="ready"]')).toBeVisible();
    await check(page, lang, 'ready');
    await page.locator('[data-gift-fermata="u-noa"]').click();
    await check(page, lang, 'fermata-confirm');
    await page.locator('[data-gift-fermata-send="u-noa"]').click();
    await expect(page.locator('[data-gift-msg]')).toBeVisible();
    await expect(page.locator('[data-chl="gifts"][data-gift-allowance="used"]')).toBeVisible();
    await expect(page.locator('[data-gift-dedicate="u-itai"]')).toBeDisabled();
    await check(page, lang, 'used');
    const db = await mockDb(page);
    expect(db.gifts.filter((g: { from: string }) => g.from === 'me')).toHaveLength(1);
    expect(db.gifts[0]).toMatchObject({ to: 'u-noa', kind: 'fermata' });
  });

  test(`dedicate a phrase: pick, a short note, send; it counts as today's gift (${lang})`, async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page, lang, { measuredMin: 7 });
    await page.goto(`/?lang=${lang}#/challenges/gifts/u-itai`);
    await expect(page.locator('[data-gift-friend="u-itai"]')).toBeVisible();
    await page.locator('[data-gift-dedicate="u-itai"]').click();
    await expect(page.locator('[data-chl="dedicate"]')).toBeVisible();
    await expect(page.locator(`[data-gift-pick="${PHRASE.id}"]`)).toBeVisible();
    await page.locator('[data-gift-note]').fill(lang === 'he' ? 'לגיג ביום חמישי' : 'For the gig on Thursday');
    await check(page, lang, 'dedicate');
    await page.locator('[data-gift-dedicate-send]').click();
    await expect(page.locator('[data-chl="gifts"][data-gift-allowance="used"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-gift-sent="1"]')).toBeVisible();
    const db = await mockDb(page);
    const g = db.gifts.find((x: { from: string }) => x.from === 'me');
    expect(g).toMatchObject({ to: 'u-itai', kind: 'dedication' });
    expect(g.ref).toMatch(/^phrase1:/);
    expect(g.note).toBeTruthy();
  });

  test(`received: a friend's fermata holds my missed day; a dedication lands in my library marked (${lang})`, async ({ page }) => {
    test.setTimeout(90_000);
    // practised −6…−4, missed −3 (the fermata arrived that day), practised −2…0
    await seed(page, lang, { gifts: true, days: [-6, -5, -4, -2, -1, 0] });
    await page.goto(`/?lang=${lang}#/challenges/gifts`);
    await expect(page.locator('[data-gift-received="fermata"]')).toBeVisible();
    await expect(page.locator('[data-gift-received="dedication"]')).toBeVisible();
    await expect(page.locator('[data-gift-invite="t-itai"]')).toBeVisible();
    await check(page, lang, 'inbox');
    // the app's sync took both in
    await expect.poll(async () => (await mockDb(page)).gifts.filter((g: { claimed_at: string | null }) => g.claimed_at).length, { timeout: 10_000 }).toBe(2);
    // the streak calendar: the day the fermata held
    await page.goto(`/?lang=${lang}`);
    await page.locator('.streak-chip').first().click();
    await expect(page.locator('.streak-cal [data-held="fermata"]')).toHaveCount(1);
    const held = await page.locator('.streak-cal [data-held="fermata"]').getAttribute('data-day');
    const want = await page.evaluate(() => {
      const d = new Date(Date.now() - 3 * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    expect(held).toBe(want);
    await check(page, lang, 'streak-fermata', false);
    // the library: the dedicated phrase, marked with who sent it
    await page.goto(`/?lang=${lang}#/encore/library`);
    await expect(page.locator('[data-lib-phrase="ded-g-itai-ded"] [data-lib-dedication="Itai"]')).toBeVisible();
    await check(page, lang, 'library-dedication', false);
  });

  test(`practise together: accept an invite (live mark), five measured minutes each → duet streak +1; my own invite too (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page, lang, { gifts: true, measuredMin: 2 });
    await page.goto(`/?lang=${lang}#/challenges/gifts`);
    await expect(page.locator('[data-gift-friend="u-itai"]')).toBeVisible();
    await expect(page.locator('[data-gift-friend="u-itai"] [data-gift-duet]')).toHaveCount(0);
    await page.locator('[data-gift-invite-accept="t-itai"]').click();
    await expect(page.locator('[data-together]')).toBeVisible();
    // a minute of measured practice: both active in the same window → the live mark
    await addMinutes(page, lang, 1, '/challenges/gifts');
    await expect(page.locator('[data-together="live"]')).toBeVisible({ timeout: 10_000 });
    await check(page, lang, 'together-live');
    // five measured minutes: done, the duet streak counts today
    await addMinutes(page, lang, 5, '/challenges/gifts');
    await expect(page.locator('[data-together="note"]')).toBeVisible({ timeout: 10_000 });
    await page.goto(`/?lang=${lang}#/challenges/gifts/u-itai`);
    await expect(page.locator('[data-gift-friend="u-itai"] [data-gift-duet="1"]')).toBeVisible();
    await check(page, lang, 'together-done');

    // my own invite to Noa (duet streak 3): the mock friend answers at once, already five minutes in
    await page.goto(`/?lang=${lang}#/challenges/gifts/u-noa`);
    await expect(page.locator('[data-gift-friend="u-noa"] [data-gift-duet="3"]')).toBeVisible();
    await page.locator('[data-gift-together="u-noa"]').click();
    await expect(page.locator('[data-gift-msg]')).toBeVisible();
    await expect(page.locator('[data-together="active"], [data-together="live"]')).toBeVisible({ timeout: 25_000 });
    await addMinutes(page, lang, 6, '/challenges/gifts/u-noa');
    await expect(page.locator('[data-together="note"]')).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.locator('[data-gift-friend="u-noa"] [data-gift-duet="4"]')).toBeVisible();
  });
}
