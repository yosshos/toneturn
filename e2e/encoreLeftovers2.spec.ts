import { expect, test, type Page } from '@playwright/test';

// Encore leftovers, second round, at 320×720 in English and Hebrew: the plan's Fingering / LH shells chips and the
// fingering screen (§5.6, §7.5), the context screen's meter chip with 6/8 (§5.3), and the phrase card on Today from a
// friend (§12, on the challenges dev mock), dismissed for good. One screen each (Today scrolls by design); Hebrew shows
// no Latin outside <bdi>. E2E_BASE: another dev server (a worktree's own vite).

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });
type Lang = 'en' | 'he';

const NOW = '2026-11-16T10:00:00.000Z';
const plan = { startBpm: 80, goalBpm: 140, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true };
/** A one-hand line over ii–V–I in C (eighths). */
const LINE = {
  id: 'enc-lo2',
  v: 3,
  ctx: 'major-251',
  level: 3,
  name: { en: 'ii–V–I line', he: 'קו ii–V–I' },
  chords: [
    [2, 'm7', 4],
    [7, '7', 4],
    [0, 'maj7', 8],
  ],
  notes: [2, 5, 9, 12, 11, 9, 7, 5, 4, 5, 7, 11, 12, 7, 4, 0].map((s, i) => [s, i * 0.5, 0.5]),
  meter: 4,
  swing: 0.5,
  straight: true,
  homeKey: 0,
  own: true,
  instrument: 'piano',
  playedBpm: 100,
  createdAt: NOW,
  plan,
};

const seed = async (page: Page, lang: Lang, own: unknown[] = [], mock = false) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ([lang, own, mock]) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [{ sessionId: 'seed-1', lessonId: 'bflat-two-homes', lessonVersion: 1, firstTry: 3, total: 3, xp: 10, missed: [], completedAt: new Date(Date.now() - 86_400_000).toISOString() }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, nickname: 'Ronit', birthYear: 1990, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { keys: { legacy: true } }, seenVersion: '9.9.9', lickBook: { own } };
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
      localStorage.removeItem('tt.featuredHidden');
      if (mock) {
        localStorage.setItem('tt.mockChallenges', '1');
        localStorage.setItem('tt.mockChallenges.age', '1990');
        localStorage.setItem('tt.mockChallenges.name', 'Ronit');
      } else localStorage.removeItem('tt.mockChallenges');
    },
    [lang, own, mock] as const,
  );
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
const latinOutsideBdi = (page: Page, scope = 'body') =>
  page.evaluate((scope) => {
    const out: string[] = [];
    const root = document.querySelector(scope) ?? document.body;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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
      const words = (t.match(/[A-Za-z]+/g) ?? []).filter((x) => x !== 'BPM' && x !== 'XP');
      if (words.length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  }, scope);
const check = async (page: Page, lang: Lang, what: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `docs/encore-shots/leftover2-${what}-${lang}.png` });
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};
const savedLick = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      new Promise<Record<string, unknown> | null>((res) => {
        const r = indexedDB.open('toneturn', 1);
        r.onsuccess = () => {
          const q = r.result.transaction('kv').objectStore('kv').get('settings');
          q.onsuccess = () => res(((q.result?.lickBook?.own ?? []) as Record<string, unknown>[]).find((l) => l.id === id) ?? null);
        };
      }),
    id,
  );

for (const lang of ['en', 'he'] as Lang[]) {
  test(`Encore plan: fingering and LH shells, the fingering screen (${lang})`, async ({ page }) => {
    await seed(page, lang, [LINE]);
    await open(page, lang, `encore/plan/${LINE.id}`);
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    await expect(page.locator('[data-plan-fingering="off"]')).toBeVisible();
    await expect(page.locator('[data-plan-band]')).toBeVisible();
    // LH shells: the phrase becomes two-hand (the hands choice appears)
    await page.locator('[data-plan-shells="off"]').click();
    await expect(page.locator('[data-plan-shells="on"]')).toBeVisible();
    await expect(page.locator('.enc-seg[role="radiogroup"]').first()).toBeVisible();
    await expect.poll(async () => ((await savedLick(page, LINE.id))?.lh as unknown[] | undefined)?.length ?? 0).toBe(9);
    await check(page, lang, 'plan-opts');
    // Fingering opens its screen; its switch turns the numbers on for practice
    await page.locator('[data-plan-fingering="off"]').click();
    await expect(page.locator('[data-encore="fingers"]')).toBeVisible();
    await page.locator('[data-fing-on="off"]').check();
    await expect(page.locator('[data-fing-on="on"]')).toBeChecked();
    const first = page.locator('[data-fing="0"]');
    await expect(first).toHaveAttribute('data-finger', /^[1-5]$/);
    const f0 = Number(await first.getAttribute('data-finger'));
    await check(page, lang, 'fingers');
    await first.click();
    await expect(first).toHaveAttribute('data-finger', String((f0 % 5) + 1));
    await expect(first).toHaveClass(/own/);
    await expect(page.locator('[data-fing-reset]')).toBeEnabled();
    // the next bar, then the left hand (the shells)
    await page.locator('[data-fing-next]').click();
    await expect(page.locator('[data-fing-bar="2"]')).toBeVisible();
    await page.locator('.enc-seg [data-seg="L"]').click();
    await expect(page.locator('.enc-fing').first()).toBeVisible();
    await check(page, lang, 'fingers-lh');
    await page.locator('.enc-seg [data-seg="R"]').click();
    await page.locator('[data-fing-prev]').click();
    await page.locator('[data-fing-reset]').click();
    await expect(first).toHaveAttribute('data-finger', String(f0));
    await expect(first).not.toHaveClass(/own/);
    // back on the plan the chip shows it is on
    await page.locator('.enc-head .icon-btn').first().click();
    await expect(page.locator('[data-plan-fingering="on"]')).toBeVisible();
  });

  test(`Encore context: the meter chip offers 4/4 · 3/4 · 5/4 · 6/8 (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await open(page, lang, 'encore');
    const id = await page.evaluate((lang) => {
      const P = 250;
      const line = [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72];
      const notes = line.map((p, i) => ({ pitch: p, on: 300 + i * P, off: 300 + i * P + P * 0.8, vel: 80 }));
      const t = { id: `mem:e2emeter-${lang}`, at: new Date().toISOString(), kind: 'improv', instrument: 'piano', title: 'x', source: 'midi', notes, bpm: 120, meter: 4, t0: 300 };
      localStorage.setItem('tt.encore.takes.v1', JSON.stringify([t]));
      return t.id;
    }, lang);
    await open(page, lang, `encore/context?take=${encodeURIComponent(id)}`);
    await expect(page.locator('[data-encore="context"]')).toBeVisible();
    const pick = page.locator('[data-ctx-meter-pick]');
    await expect(pick.locator('option')).toHaveText(['4/4', '3/4', '5/4', '6/8']);
    await pick.selectOption('6');
    await expect(page.locator('[data-ctx-meter="6"]')).toBeVisible();
    await check(page, lang, 'context-68');
    await page.locator('[data-ctx-save]').click();
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    const pid = await page.locator('[data-encore="plan"]').getAttribute('data-phrase');
    const l = await savedLick(page, pid!);
    expect(l?.meter).toBe(6);
    // 6/8 counts eighths: the tempo it was played at doubles (♩120 → ♪240)
    expect(l?.playedBpm).toBe(240);
    await expect(page.locator('[data-goal]')).toContainText('♪');
    await check(page, lang, 'plan-68');
  });

  test(`Today: a friend's phrase, small and dismissible (${lang})`, async ({ page }) => {
    await seed(page, lang, [LINE], true);
    await open(page, lang, '');
    const card = page.locator('[data-today-featured]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveAttribute('data-today-featured-why', 'friend');
    const box = await card.boundingBox();
    expect(box!.height).toBeLessThan(110);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    if (lang === 'he') expect(await latinOutsideBdi(page, '[data-today-featured]')).toEqual([]);
    if (process.env.SHOTS) await card.screenshot({ path: `docs/encore-shots/leftover2-today-featured-${lang}.png` });
    const code = await card.getAttribute('data-today-featured');
    // dismissed: gone, and still gone after a reload
    await card.locator('[data-today-featured-hide]').click();
    await expect(page.locator(`[data-today-featured="${code}"]`)).toHaveCount(0);
    await open(page, lang, '');
    await page.waitForTimeout(1000);
    await expect(page.locator(`[data-today-featured="${code}"]`)).toHaveCount(0);
  });
}
