import { expect, test, type Page } from '@playwright/test';

// Key mastery (owner 2026-11-14): a returning pianist whose scales are clean in most keys but slow and inaccurate in D♭
// and F♯. The family's 12-key map marks both as weak (fifths order, LTR, on a 320-wide phone with no sideways scroll),
// a tap starts the skill in that key, and the Insights "Keys" card lists them as the weakest keys on piano.
test.use({ viewport: { width: 320, height: 720 } });

const WEAK = [1, 6];
const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, weak }) => {
      const now = new Date();
      const iso = now.toISOString();
      const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
      const drillItems: Record<string, unknown> = {};
      for (let k = 0; k < 12; k++) {
        const w = weak.includes(k);
        const id = `scales:scale:${k}:R:major:o1`;
        drillItems[id] = {
          itemId: id, family: 'scales', key: k, hands: 'R', cleanBpm: w ? 40 : 96, goalBpm: w ? 50 : 96, streak: 0, fails: 0,
          ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: w ? 0.55 : 0.98 }, takes: 6, last: ago(1), history: [{ at: ago(1), bpm: w ? 40 : 96, cv: 0.03 }], targetBpm: 100,
        };
      }
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [], drillItems };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays: ['piano'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drillStart: { scales: 1 } };
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
    { lang, weak: WEAK },
  );
};
const noSideScroll = async (page: Page, what: string) => {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `${what}: no horizontal scroll`).toBeLessThanOrEqual(iw + 1);
};

for (const lang of ['en', 'he'] as const)
  test(`key mastery: weak keys marked on the key map and listed in Insights (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    // The family card's strip marks the weak keys too.
    const card = page.locator('[data-family="scales"]');
    await expect(card.locator('.km-cell[data-key="1"]')).toHaveAttribute('data-key-status', 'weak');
    await card.click();
    const map = page.locator('[data-key-map-skill="scales"]');
    await expect(map).toBeVisible();
    for (const k of WEAK) await expect(map.locator(`button[data-key="${k}"]`)).toHaveAttribute('data-key-status', 'weak');
    await expect(map.locator('button[data-key="0"]')).not.toHaveAttribute('data-key-status', 'weak');
    // Fifths order, left to right in both languages: C first, F last.
    const order = await map.locator('button[data-key]').evaluateAll((bs) => bs.map((b) => [Number(b.getAttribute('data-key')), Math.round(b.getBoundingClientRect().left)]));
    expect(order.map((x) => x[0])).toEqual([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
    expect(order[0][1]).toBeLessThan(order[11][1]);
    await expect(map).toContainText('D♭');
    await noSideScroll(page, 'family');
    // COURSE-FEEDBACK-UI §4.2: 22 × 32 cells; weak = paper with a pink ✕ corner tab; strong = purple with paper text.
    const geo = await map.evaluate((el) => {
      const cells = [...el.querySelectorAll('button[data-key]')] as HTMLElement[];
      const weak = cells.find((c) => c.dataset.keyStatus === 'weak')!;
      const strong = cells.find((c) => c.dataset.keyStatus === 'strong');
      return {
        w: Math.min(...cells.map((c) => c.getBoundingClientRect().width)),
        h: Math.min(...cells.map((c) => c.getBoundingClientRect().height)),
        right: Math.max(...cells.map((c) => c.getBoundingClientRect().right)),
        tab: getComputedStyle(weak, '::after').content,
        strong: strong ? getComputedStyle(strong).backgroundColor : null,
      };
    });
    expect(geo.w).toBeGreaterThanOrEqual(18);
    expect(geo.h).toBeGreaterThanOrEqual(30);
    expect(geo.right).toBeLessThanOrEqual(320);
    expect(geo.tab).toContain('✕');
    if (geo.strong) expect(geo.strong).toBe('rgb(109, 40, 217)');
    await map.screenshot({ path: `test-results/keymap-family-${lang}.png` });
    if (process.env.SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/s8-keymap-${lang}.png` });
    // A tap starts the skill in that key.
    await map.locator('button[data-key="6"]').click();
    await expect(page.locator('[data-drills="run"]')).toBeVisible();

    await page.goto(`/?unlock=all&lang=${lang}#/insights`);
    const keys = page.locator('[data-keys-card] [data-keys-inst="piano"]');
    await expect(keys).toBeVisible();
    const weak = (await keys.getAttribute('data-weak-keys'))!.split(',').map(Number).sort((a, b) => a - b);
    expect(weak).toEqual(WEAK);
    await expect(keys).toContainText('D♭');
    await expect(keys).toContainText('F♯');
    await expect(keys.locator('[data-keys-practice]')).toBeVisible();
    // The profile lists them as weak-key patterns.
    await expect(page.locator('[data-profile-pattern^="k:scales:"]').first()).toBeVisible();
    await noSideScroll(page, 'insights');
    await keys.screenshot({ path: `test-results/keymap-insights-${lang}.png` });
    const text = await page.locator('main').first().innerText();
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false);
  });
