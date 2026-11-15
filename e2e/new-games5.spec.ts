import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// AUDIT-GAMES §4.2 new games (2026-11-15): Border Control, Which Brother?, Run Catcher, Comp Caller, Elevator — at a
// 320 × 720 phone in English and Hebrew: the setup, the play screen and its reveal (verdict, "Why?", Next) fit one
// screen; Hebrew screens have no Latin outside <bdi> / dir=ltr; a full round reaches the shared result card.
// SHOTS=1 saves the screens to docs/new-games-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;
const SHOT_DIR = 'docs/new-games-shots';
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

type Lang = 'en' | 'he';
const seed = async (page: Page, lang: Lang, course: string) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys', 'guitar', 'bass', 'drums'].includes(course) ? [course] : [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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
const open = async (page: Page, lang: Lang, route: string, course: string) => {
  await page.goto('about:blank');
  await page.goto(`/?${course === 'ear' ? 'sim=1&' : ''}unlock=all&lang=${lang}#/${route}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(600);
};
const measure = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    const btns = [...document.querySelectorAll('main .btn.mega, main .btn.primary')].filter((b) => (b as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const bottom = btns.length ? Math.max(...btns.map((b) => b.getBoundingClientRect().bottom)) : 0;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth, bottom, h: innerHeight };
  });
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, .visually-hidden, [aria-hidden="true"], .sim-banner, .dyn, .tier-chip, title')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const words = (t.match(/[A-Za-z]+/g) ?? []).filter((x) => x !== 'BPM');
      if (words.length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const shot = async (page: Page, file: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/${file}.png` });
};
const result = (page: Page) => page.locator('[data-result-card]');

type Game = { route: string; course: string; step: (page: Page) => Promise<void>; play: string };
/** One case / take: answer it (any answer), then Next. */
const GAMES: Game[] = [
  {
    route: 'bordercontrol',
    course: 'ear',
    play: '[data-bc-first]',
    step: async (page) => {
      await page.locator('[data-bc-first]').first().click();
      await page.locator('[data-bc-second]').first().click();
    },
  },
  {
    route: 'whichbrother',
    course: 'jazz',
    play: '[data-wb-pick]',
    step: async (page) => {
      await page.locator('[data-wb-pick]').first().click();
    },
  },
  {
    route: 'elevator',
    course: 'keys',
    play: '.keys-pad',
    step: async (page) => {
      await page.locator('.keys-pad .wk').nth(1).click();
      await page.locator('[data-el-check]').click();
    },
  },
  {
    route: 'compcaller',
    course: 'keys',
    play: '[data-cc-play]',
    step: async (page) => {
      await page.locator('[data-cc-play]').click();
      await page.locator('[data-ng-next]').waitFor({ timeout: 60_000 });
    },
  },
  {
    route: 'runcatcher',
    course: 'voice',
    play: '[data-rc-go]',
    step: async (page) => {
      await page.locator('[data-rc-go]').click();
      await page.locator('[data-ng-next]').waitFor({ timeout: 60_000 });
    },
  },
];

for (const lang of ['en', 'he'] as const)
  for (const g of GAMES)
    test(`${g.route}: one screen at 320×720, Hebrew isolates Latin, a round reaches the result card (${lang})`, async ({ page }) => {
      test.setTimeout(360_000);
      const bad: string[] = [];
      const check = async (stage: string) => {
        const m = await measure(page);
        if (m.over > 4 || m.side > 1 || m.bottom > m.h + 1) bad.push(`${stage}: over ${m.over}, side ${m.side}, button bottom ${Math.round(m.bottom)}`);
        if (lang === 'he') {
          const l = await latinOutsideBdi(page);
          if (l.length) bad.push(`${stage} latin: ${l.join(' | ')}`);
        }
      };
      await seed(page, lang, g.course);
      await open(page, lang, g.route, g.course);
      await expect(page.locator(`main[data-game="${g.route}"]`)).toBeVisible();
      await check('setup');
      await shot(page, `${g.route}-${lang}-1setup`);
      await page.locator('[data-ng-start]').first().click();
      await page.locator(g.play).first().waitFor();
      await page.waitForTimeout(400);
      await check('play');
      await shot(page, `${g.route}-${lang}-2play`);
      // the first case, then its reveal
      await g.step(page);
      await page.locator('[data-ng-next]').waitFor();
      // open "Why?" when there is one (a wrong answer)
      const why = page.locator('.ng-whyd summary');
      if (await why.count()) await why.first().click();
      await check('reveal');
      await shot(page, `${g.route}-${lang}-3reveal`);
      // play on to the result card
      for (let k = 0; k < 12 && !(await result(page).count()); k++) {
        await page.locator('[data-ng-next]').click();
        if (await result(page).count()) break;
        await page.waitForTimeout(250);
        await g.step(page);
        await page.locator('[data-ng-next]').waitFor();
      }
      await expect(result(page)).toBeVisible();
      await check('result');
      await shot(page, `${g.route}-${lang}-4result`);
      expect(bad, bad.join('\n')).toEqual([]);
    });

