import { expect, test, type Page } from '@playwright/test';

// BUILD-PLAN-2026-11 phase 8 (Extras) + SPEC-PROGRESS-CHARTS: measured time and the projection on the Progress page;
// the coach's tilt and taster on Insights; the Barry Harris way in Improvise; the ear challenges in Licks (the combined
// sentence, find the lick, transpose by ear); the burn-up and the alerts on the class page. Hebrew phone screenshots
// go to test-results/ (not committed).

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate, [data-streak-sheet]'), async () => {
    await page.locator('.streak-celebrate .btn.mega, [data-streak-continue]').first().click();
  });
});

const item = (id: string, key: number, closed: boolean, extra: Record<string, unknown> = {}) => ({
  itemId: id, family: id.startsWith('lick:') ? 'licks' : id.split(':')[0], key, hands: 'R', cleanBpm: closed ? 120 : 80, goalBpm: 120, streak: 0, fails: 0,
  ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.95 }, takes: 8, last: '2026-11-20T10:00:00.000Z', history: [{ at: '2026-11-20T10:00:00.000Z', bpm: closed ? 120 : 80, cv: 0.03 }],
  targetBpm: 120, passLog: closed ? [{ at: '2026-11-18T10:00:00.000Z', bpm: 120 }, { at: '2026-11-18T10:05:00.000Z', bpm: 120 }, { at: '2026-11-19T10:00:00.000Z', bpm: 120 }] : [],
  ...extra,
});

const seed = async (page: Page, lang: 'en' | 'he', o: { items?: Record<string, unknown>; settings?: Record<string, unknown>; snaps?: (k: number) => Record<string, unknown> | null } = {}) => {
  await page.addInitScript(
    ({ lang, items, settings, snapsSrc }) => {
      if (sessionStorage.getItem('tt.seeded')) return;
      sessionStorage.setItem('tt.seeded', '1');
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], drillItems: items };
      const s = {
        version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true,
        intake: { v: 1, at: now, music: 3, singing: 1, theory: 3, reading: 3, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9',
        ...settings,
      };
      const r = indexedDB.open('toneturn', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        const tx = r.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(progress, 'progress');
        tx.objectStore('kv').put(s, 'settings');
      };
      if (snapsSrc) {
        const days: Record<string, unknown> = {};
        const today = new Date();
        for (let i = 27; i >= 0; i--) {
          const d = new Date(today.getTime() - i * 86400000);
          const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const x = snapsSrc[27 - i];
          if (x) days[day] = { day, tempo: {}, channels: { ear: null, reading: null }, keys: {}, vocab: { played: 0, closed: 0 }, ...x };
        }
        const q = indexedDB.open('toneturn-snapshots', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('kv');
        q.onsuccess = () => q.result.transaction('kv', 'readwrite').objectStore('kv').put({ v: 1, backfilled: true, days }, 'all');
      }
    },
    { lang, items: o.items ?? {}, settings: o.settings ?? {}, snapsSrc: o.snaps ? Array.from({ length: 28 }, (_, k) => o.snaps!(k)) : null },
  );
};

const fits = async (page: Page, oneScreen = false) => {
  const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, ih: innerHeight }));
  expect(m.w).toBeLessThanOrEqual(m.iw + 1);
  if (oneScreen) expect(m.h).toBeLessThanOrEqual(m.ih + 2);
};

/** Latin letters outside an LTR isolate (note and chord names must sit in <bdi dir="ltr">). */
const latinLeft = (page: Page, sel: string) =>
  page.evaluate((sel) => {
    const out: string[] = [];
    const root = document.querySelector(sel) ?? document.body;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('bdi, svg, select, [aria-hidden="true"], [dir="ltr"], script, style')) continue;
      if (/[A-Za-z]/.test(n.textContent ?? '')) out.push((n.textContent ?? '').trim());
    }
    return out;
  }, sel);

const practised = (k: number) => (k % 7 === 6 ? { status: { 'keys:technique': { closed: 20 + k, learning: 6 }, 'keys:improv': { closed: 2, learning: 3 } }, minutes: {}, practised: false } : { status: { 'keys:technique': { closed: 20 + k, learning: 6 }, 'keys:improv': { closed: 2, learning: 3 } }, minutes: { technique: 24, improv: 8 }, practised: true });

test('Progress › Over time: measured time and the projection, the share of the week (he)', async ({ page }) => {
  await seed(page, 'he', { snaps: practised });
  await page.goto('/?unlock=all&lang=he#/skills');
  await page.locator('#ps-tab-time').click();
  const card = page.locator('[data-projection]');
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).not.toHaveAttribute('data-projection', 'none');
  await expect(page.locator('.pj-row').first()).toBeVisible();
  await expect(page.locator('[data-progress-share]')).toBeVisible();
  await fits(page);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/phase8-projection-he.png' });
  // the key screen keeps exercises / closed / time left, without the projection (D5)
  await page.goto('/?unlock=all&lang=he#/drills');
});

test('Insights: the coach proposes a tilt with its measured reason; accept (he)', async ({ page }) => {
  await seed(page, 'he', { snaps: practised });
  await page.goto('/?unlock=all&lang=he#/insights');
  const c = page.locator('[data-coach-tilt]');
  await expect(c).toBeVisible({ timeout: 30_000 });
  await expect(c.locator('.ct-reasons li').first()).toContainText('הטכניקה סגרה');
  await page.screenshot({ path: 'test-results/phase8-coach-tilt-he.png' });
  await c.locator('[data-tilt-accept]').click();
  await expect(page.locator('[data-tilt-answer="yes"]')).toBeVisible();
  await fits(page);
});

for (const lang of ['he', 'en'] as const)
  test(`Improvise › the Barry Harris way: think chords, the starting degree, one screen (${lang})`, async ({ page }) => {
    await seed(page, lang, { settings: { harrisTier: 3 } });
    await page.goto(`/?unlock=all&lang=${lang}#/improv`);
    await expect(page.locator('[data-improv-studio]')).toBeVisible();
    await page.locator('[data-rs-track="B"]').click();
    const hw = page.locator('[data-hw]');
    await expect(hw).toHaveAttribute('data-hw-tier', '3');
    await expect(page.locator('[data-hw-cell]').first()).toBeVisible();
    // H-3 chorus 2: the important minor over the V
    await page.locator('.rs-chorus button').nth(1).click();
    await expect(page.locator('[data-think="Dm6"]').first()).toBeVisible();
    await page.locator('[data-hw-tier-pick="1"]').click();
    await expect(page.locator('small[data-hw-start="1"]').first()).toBeVisible();
    await fits(page, true);
    if (lang === 'he') expect(await latinLeft(page, '[data-hw]')).toEqual([]);
    await page.screenshot({ path: `test-results/phase8-harris-${lang}.png` });
    // a take: the count-in, then the now-cue walks the sheet
    await page.locator('[data-hw-go]').click();
    await expect(page.locator('[data-hw] .ng-beats')).toBeVisible();
    await expect(page.locator('[data-hw-cell][data-now="1"]')).toBeVisible({ timeout: 10_000 });
    if (lang === 'he') await page.screenshot({ path: 'test-results/phase8-harris-take-he.png' });
  });

const LICK_ITEMS = {
  'lick:maj-arp:piano:0': item('lick:maj-arp:piano:0', 0, true, { channels: { 'page-known': { n: 8, clean: 6, best: 120 } } }),
  'lick:dom-arp9:piano:0': item('lick:dom-arp9:piano:0', 0, true, { channels: { 'page-known': { n: 8, clean: 6, best: 120 } } }),
};

test('Licks › Ear challenges: the combined sentence by ear, find the lick, transpose by ear (he)', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, 'he', { items: LICK_ITEMS });
  await page.goto('/?unlock=all&lang=he#/licks');
  await page.locator('[data-lick-tab="ear"]').click();
  const s = page.locator('[data-ev-sentence]');
  await expect(s).toBeVisible({ timeout: 20_000 });
  // both learned from the page → the sentence comes by ear
  await expect(s).toHaveAttribute('data-ev-channel', 'ear');
  await fits(page);
  await page.screenshot({ path: 'test-results/phase8-ear-sentence-he.png' });
  await page.locator('[data-ev-start="sentence"]').click();
  await expect(page.locator('[data-ear-run="sentence"]')).toBeVisible();
  await expect(page.locator('[data-lick-ear="hidden"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/phase8-ear-sentence-run-he.png' });
  await page.locator('.screen-head .icon-btn').first().click();
  // find the lick: count-in, the click and the moving now-cue, a big "There"
  await page.locator('[data-ev-tab="find"]').click();
  await expect(page.locator('[data-ev-find]')).toBeVisible();
  await page.locator('[data-ev-start="find"]').click();
  await expect(page.locator('[data-ev-there]')).toBeVisible();
  await expect(page.locator('.ev .ng-beats')).toBeVisible();
  await page.screenshot({ path: 'test-results/phase8-ear-find-he.png' });
  await fits(page, true);
  // transpose by ear: heard in a closed key, played in the next one
  await page.goto('/?unlock=all&lang=he#/licks');
  await page.locator('[data-lick-tab="ear"]').click();
  await page.locator('[data-ev-tab="transpose"]').click();
  await expect(page.locator('[data-ev-transpose]')).toHaveAttribute('data-ev-from', '0');
  await page.screenshot({ path: 'test-results/phase8-ear-transpose-he.png' });
  await page.locator('[data-ev-start="transpose"]').click();
  await expect(page.locator('[data-ev-note="transpose"]')).toBeVisible();
  await fits(page);
});

test('the class page: alerts with their charts, a burn-up per assignment; the student sees their burn-up (he)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tt.mockTeacher', '1');
    localStorage.setItem('tt.mockSnapshots', '1');
    if (localStorage.getItem('tt.mockTeacher.db')) return;
    const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
    localStorage.setItem(
      'tt.mockTeacher.db',
      JSON.stringify({
        assignments: [{ id: 'a1', class: 'Demo', kind: 'drill', lesson_id: 'drill', ref: 'drill:scales-1', due_on: day(4).slice(0, 10), strictness: 'moderate', target_bpm: null, note: null, created_at: day(-6) }],
        submissions: [
          { id: 'x1', assignment_id: 'a1', user_id: 's4', name: 'Tom', created_at: day(-2), score: 0.82, minutes: 6, metrics: {}, comment: null, mark: null },
          { id: 'x2', assignment_id: 'a1', user_id: 'me', name: 'Student', created_at: day(-1), score: 0.9, minutes: 5, metrics: {}, comment: null, mark: null },
        ],
      }),
    );
  });
  await page.goto('/?lang=he#/classes');
  const charts = page.locator('[data-class-charts="demo-class"]');
  await expect(charts).toBeVisible({ timeout: 20_000 });
  await charts.locator('[data-student="s4"]').click();
  await expect(charts.locator('[data-alert="stuck"]')).toBeVisible();
  await expect(charts.locator('[data-burnups="s4"] [data-burnup="1/1"]')).toBeVisible();
  await expect(charts.locator('[data-burnup-due]').first()).toBeAttached();
  await fits(page);
  await charts.locator('[data-alerts]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/phase8-class-alerts-he.png' });
  await expect(page.locator('[data-my-assignments] [data-burnup-row]').first()).toBeVisible();
  await page.locator('[data-my-assignments]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/phase8-student-burnup-he.png' });
});
