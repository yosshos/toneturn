import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Practice diary (docs/research/AUDIT-5-PRACTICE-PRODUCT.md §4 #1–#5) at a 320 × 720 phone in English and Hebrew:
// 1. the three tabs (time, quality, journal) fit the width (no horizontal scroll), and in Hebrew no visible Latin text
//    sits outside <bdi> / dir=ltr;
// 2. a journal note and an unsent draft survive a reload;
// 3. time measured on a practice screen survives a reload (the clock's pending time is booked on the next start).
// SHOTS=1 saves the screens to docs/practice-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;
const SHOT_DIR = 'docs/practice-shots';
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

type Lang = 'en' | 'he';
const seed = async (page: Page, lang: Lang, withLedger = true) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, withLedger }) => {
      const now = new Date();
      const iso = now.toISOString();
      const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
      const day = (d: number) => {
        const x = new Date(now.getTime() - d * 86400000);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      };
      // One item flat for weeks (a plateau), one rising.
      const flat = 'scales:scale:3:R:major:o1';
      const up = 'scales:scale:0:R:major:o1';
      const drillItems = {
        [flat]: { itemId: flat, family: 'scales', key: 3, hands: 'R', cleanBpm: 81, goalBpm: 84, streak: 0, fails: 1, ewma: { cv: 0.05, sd: 12, vsd: 5, hands: 0, acc: 0.8 }, takes: 40, last: ago(1), targetBpm: 120, history: [30, 25, 18, 12, 6, 2].map((d, i) => ({ at: ago(d), bpm: [70, 80, 80, 81, 80, 80][i], cv: 0.05 })) },
        [up]: { itemId: up, family: 'scales', key: 0, hands: 'R', cleanBpm: 96, goalBpm: 100, streak: 1, fails: 0, ewma: { cv: 0.03, sd: 8, vsd: 5, hands: 0, acc: 0.95 }, takes: 20, last: ago(0), targetBpm: 120, history: [9, 4, 0].map((d, i) => ({ at: ago(d), bpm: [84, 90, 96][i], cv: 0.03 })) },
      };
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [{ lessonId: 'log:piece', lessonVersion: 1, sessionId: 'log-seed', completedAt: ago(2), firstTry: 0, total: 30, xp: 0, missed: [], note: 'Autumn Leaves, head in E minor' }], streak: { count: 1, lastDay: iso.slice(0, 10) }, review: [], drillItems };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drillStart: { scales: 1 } };
      localStorage.clear();
      sessionStorage.clear();
      if (withLedger) {
        const days: Record<string, Record<string, number>> = {};
        for (let d = 0; d < 40; d += 2) {
          days[day(d)] = { [`keys|technique|scales|3|edge`]: 600000 + d * 10000, [`keys|technique|scales|0|consolidation`]: 300000, [`ear|lesson|intervals||review`]: 240000, [`ear|game|flight||run`]: 180000 };
        }
        days[day(2)][`keys|offapp|piece||offapp`] = 1800000;
        const items = {
          [`d:${flat}`]: [20, 12, 6, 2].map((d) => ({ d: day(d), n: 6, c: 2, of: 6, b: 80, ms: 300000 })),
          [`d:${up}`]: [9, 4, 0].map((d, i) => ({ d: day(d), n: 4, c: 3 + (i > 1 ? 1 : 0), of: 4, b: [84, 90, 96][i], ms: 200000 })),
          'l:review': [{ d: day(1), n: 1, c: 9, of: 10, ms: 240000 }],
          'g:flight': [{ d: day(1), n: 2, c: 1, of: 2, ms: 180000 }],
        };
        const notes = [
          { id: 'n1', at: ago(1), day: day(1), text: lang === 'he' ? 'יד שמאל לבד, תיבות 9–12, לאט' : 'Left hand alone, bars 9–12, slowly', src: 'diary' },
          { id: 'n2', at: ago(0), day: day(0), text: lang === 'he' ? 'הבא: II–V ב-D♭' : 'Next: ii–V in D♭', next: true, src: 'diary' },
        ];
        localStorage.setItem('toneturn.practice.v1', JSON.stringify({ v: 1, since: day(40), days, items, notes, booked: ['log-seed'] }));
      }
      await new Promise((res, rej) => {
        indexedDB.deleteDatabase('toneturn');
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
    { lang, withLedger },
  );
};

const open = async (page: Page, lang: Lang, route: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${route}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(600);
};

const sideOverflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollWidth - innerWidth);

const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], [dir="auto"], script, style, svg, .sr-only, [aria-hidden="true"], textarea, input, title')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      out.push(t.trim().slice(0, 70));
    }
    return out;
  });

for (const lang of ['en', 'he'] as Lang[]) {
  test(`practice diary tabs fit 320 px (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await open(page, lang, 'diary');
    await expect(page.locator('[data-practice-diary]')).toBeVisible();
    for (const tab of ['time', 'quality', 'journal'] as const) {
      await page.locator(`[data-pd-tabbtn="${tab}"]`).click();
      await expect(page.locator(`[data-pd-tab="${tab}"]`)).toBeVisible();
      await page.waitForTimeout(250);
      expect(await sideOverflow(page), `${tab} side scroll`).toBeLessThanOrEqual(0);
      if (lang === 'he') expect(await latinOutsideBdi(page), `${tab} Latin outside bdi`).toEqual([]);
      if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/diary-${tab}-${lang}.png`, fullPage: true });
    }
    // Time: the week's total and the per-skill rows show measured minutes.
    await page.locator('[data-pd-tabbtn="time"]').click();
    expect(Number(await page.locator('[data-pd-total]').getAttribute('data-pd-total'))).toBeGreaterThan(0);
    // Quality: the plateau detector found the flat item and offers a change of approach.
    await page.locator('[data-pd-tabbtn="quality"]').click();
    await expect(page.locator('[data-plateau="plateau"]').first()).toBeVisible();
    await expect(page.locator('[data-plateau-go]').first()).toBeVisible();
    // Journal: search finds the off-app note.
    await page.locator('[data-pd-tabbtn="journal"]').click();
    await page.locator('[data-pd-search]').fill('Autumn');
    await expect(page.locator('[data-pd-day]')).toHaveCount(1);
  });
}

test('journal notes and the draft survive a reload', async ({ page }) => {
  await seed(page, 'he');
  await open(page, 'he', 'diary');
  await page.locator('[data-pd-tabbtn="journal"]').click();
  await page.locator('[data-pd-input]').fill('ארפג׳ים בכל 12 הסולמות');
  await page.locator('[data-pd-save]').click();
  await expect(page.locator('.pd-note', { hasText: 'ארפג׳ים בכל 12 הסולמות' })).toBeVisible();
  await page.locator('[data-pd-input]').fill('טיוטה שלא נשלחה');
  await page.reload();
  await page.locator('main').first().waitFor();
  await expect(page.locator('[data-pd-tab="journal"]')).toBeVisible(); // the tab is remembered
  await expect(page.locator('.pd-note', { hasText: 'ארפג׳ים בכל 12 הסולמות' })).toBeVisible();
  await expect(page.locator('[data-pd-input]')).toHaveValue('טיוטה שלא נשלחה');
});

test('time measured on a practice screen survives a reload', async ({ page }) => {
  await seed(page, 'en', false);
  await open(page, 'en', 'metronome');
  // Active for ~7 s (a tap now and then), then reload before leaving the screen.
  for (let i = 0; i < 7; i++) {
    await page.mouse.click(5, 300);
    await page.waitForTimeout(1000);
  }
  await page.reload();
  await page.locator('main').first().waitFor();
  await page.goto('/?unlock=all&lang=en#/diary');
  await page.locator('[data-practice-diary]').waitFor();
  await page.locator('[data-pd-tabbtn="time"]').click();
  const secs = Number(await page.locator('[data-pd-total]').getAttribute('data-pd-total'));
  expect(secs).toBeGreaterThanOrEqual(4);
  expect(secs).toBeLessThanOrEqual(15);
  await expect(page.locator('[data-pd-row="tool"]')).toBeVisible();
});

test('the Progress screen opens the diary', async ({ page }) => {
  await seed(page, 'en');
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=en#/skills');
  await page.locator('[data-open-diary]').click();
  await expect(page.locator('[data-practice-diary]')).toBeVisible();
});
