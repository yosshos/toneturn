import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// AUDIT-GAMES §4.2 new games (Guide-Tone Runner, 5-4-3-2 Call, Enclosure Target, Changes Crossword, Hold the Note), at a
// 320 × 720 phone in English and Hebrew:
// 1. the setup and the play screen fit one screen (no vertical or horizontal scroll), the main button in view;
// 2. on Hebrew screens no visible Latin text outside <bdi> / dir=ltr;
// 3. a full round reaches the shared result card (the played games with a stub MIDI keyboard that plays nothing:
//    a missed change / failed takes end the run).
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
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys', 'guitar', 'bass'].includes(course) ? [course] : ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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
    const ALLOW = /^(BPM)$/;
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
      const words = (t.match(/[A-Za-z]+/g) ?? []).filter((x) => !ALLOW.test(x));
      if (words.length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });

const shot = async (page: Page, file: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/${file}.png` });
};

/** A stub MIDI keyboard (plays nothing unless the test sends notes). */
const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });

/** Pick MIDI on a setup with an input picker (the radio whose text is MIDI). */
const pickMidi = async (page: Page) => {
  const r = page.locator('main [role="radiogroup"] [role="radio"]').filter({ hasText: 'MIDI' }).first();
  if (await r.count()) await r.click();
};

type Game = { route: string; course: string; play: (page: Page) => Promise<void>; midi?: boolean };

/** Click a DOM element by selector inside the page (disabled ones do nothing), true when one was there. */
const tap = (page: Page, sel: string) => page.evaluate((s) => {
  const el = document.querySelector(s) as HTMLButtonElement | null;
  if (!el || el.disabled) return false;
  el.click();
  return true;
}, sel);
const resultShown = (page: Page) => page.locator('[data-result-card]').isVisible().catch(() => false);

const GAMES: Game[] = [
  {
    route: 'guidetone',
    course: 'keys',
    midi: true,
    play: async (page) => {
      await page.locator('[data-ng-play]').click();
      await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 30_000 });
    },
  },
  ...(['call5432', 'enclosure'] as const).map((route) => ({
    route,
    course: 'keys',
    midi: true,
    play: async (page: Page) => {
      for (let k = 0; k < 12 && !(await resultShown(page)); k++) {
        if (await tap(page, '[data-take-play]')) {
          await page.locator('main[data-phase="review"], [data-result-card]').first().waitFor({ timeout: 40_000 });
          continue;
        }
        const next = page.locator('main[data-phase="review"] .btn.mega');
        if (await next.count()) await next.click();
        await page.waitForTimeout(300);
      }
      await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 5_000 });
    },
  })),
  {
    route: 'crossword',
    course: 'ear',
    play: async (page) => {
      for (let k = 0; k < 40 && !(await resultShown(page)); k++) {
        if (await tap(page, '[data-cw-next]')) {
          await page.waitForTimeout(250);
          continue;
        }
        // fill every open part of every bar with the first enabled chip, then check
        const n = await page.locator('[data-cw-bar]').count();
        for (let i = 0; i < n; i++) {
          await tap(page, `[data-cw-bar="${i}"]`);
          await page.waitForTimeout(40);
          for (const sel of ['[data-cw-root]', '[data-cw-q]', '[data-cw-x]']) {
            await page.evaluate((s) => {
              const c = [...document.querySelectorAll(s)].find((x) => !(x as HTMLButtonElement).disabled) as HTMLButtonElement | undefined;
              c?.click();
            }, sel);
            await page.waitForTimeout(40);
          }
        }
        await page.waitForTimeout(150);
        await tap(page, '[data-cw-check]');
        await page.waitForTimeout(250);
      }
      await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 5_000 });
    },
  },
  {
    route: 'holdnote',
    course: 'jazz',
    play: async (page) => {
      for (let k = 0; k < 60 && !(await resultShown(page)); k++) {
        if (await tap(page, '[data-hn-next]')) {
          await page.waitForTimeout(250);
          continue;
        }
        if (!(await tap(page, '[data-hn-choice]'))) await tap(page, '[data-hn-chip]');
        await page.waitForTimeout(1100);
      }
      await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 5_000 });
    },
  },
];

for (const lang of ['en', 'he'] as const)
  for (const g of GAMES)
    test(`${g.route} (${lang}): setup and play fit 320×720, Hebrew keeps Latin in bdi, a round reaches the result card`, async ({ page }) => {
      test.setTimeout(180_000);
      const bad: string[] = [];
      if (g.midi) await stubMidi(page);
      await seed(page, lang, g.course);
      await open(page, lang, g.route, g.course);
      await expect(page.locator(`main[data-game="${g.route}"]`)).toBeVisible();
      if (g.midi) await pickMidi(page);
      await page.waitForTimeout(200);
      const s1 = await measure(page);
      if (s1.over > 4 || s1.side > 1 || s1.bottom > s1.h + 1) bad.push(`setup: over ${s1.over}, side ${s1.side}, start bottom ${Math.round(s1.bottom)}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`setup latin: ${l.join(' | ')}`);
      }
      await shot(page, `${g.route}-${lang}-1setup`);
      await page.locator('main .btn.mega:visible').last().click();
      await page.waitForTimeout(1500);
      const s2 = await measure(page);
      if (s2.over > 4 || s2.side > 1) bad.push(`play: over ${s2.over}, side ${s2.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`play latin: ${l.join(' | ')}`);
      }
      await shot(page, `${g.route}-${lang}-2play`);
      await g.play(page);
      const s3 = await measure(page);
      if (s3.over > 4 || s3.side > 1) bad.push(`result: over ${s3.over}, side ${s3.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`result latin: ${l.join(' | ')}`);
      }
      await shot(page, `${g.route}-${lang}-3result`);
      expect(bad, bad.join('\n')).toEqual([]);
    });

// The densest screens: Changes Crossword with the bass row (mp) and 8 bars (ff), Hold the Note's 8 ways (ff),
// Guide-Tone Runner's rhythm-changes strip (f) — forced through the tier a path step asks for.
for (const lang of ['en', 'he'] as const)
  for (const [route, tier] of [['crossword', 'mp'], ['crossword', 'ff'], ['holdnote', 'ff'], ['holdnote', 'f'], ['guidetone', 'f']] as const)
    test(`dense tier fits 320×720: ${route} ${tier} (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await stubMidi(page);
      const bad: string[] = [];
      await seed(page, lang, 'jazz');
      await open(page, lang, route, 'jazz');
      // a saved run at that tier resumes there (never-lose-progress), which is how the dense screens are reached
      await page.evaluate(
        async ({ route, tier }) => {
          const lv = { pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 }[tier];
          const data =
            route === 'crossword'
              ? { v: 1, game: 'crossword', seed: 7, level: lv, credits: [], score: 0 }
              : route === 'holdnote'
                ? { v: 1, game: 'holdnote', seed: 7, level: lv, i: 0, lives: 3, right: 0, wrong: 0, score: 0, found: [], input: 'touch' }
                : { v: 1, game: 'guidetone', seed: 7, level: lv, lap: 0, caught: 0, input: 'midi', keys: [] };
          const path = '/src/storage/resume.ts';
          const m = await import(/* @vite-ignore */ path);
          m.saveSlot(`game:${route}`, { title: route, route, done: 0, total: 0, data });
        },
        { route, tier },
      );
      await open(page, lang, route, 'jazz');
      const cont = page.locator('main .g2-col .btn.mega');
      expect(await cont.count(), 'resume button').toBeGreaterThan(0);
      await cont.first().click();
      await page.waitForTimeout(1200);
      const s = await measure(page);
      if (s.over > 4 || s.side > 1) bad.push(`${route} ${tier} ${lang}: over ${s.over}, side ${s.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`${route} ${tier} latin: ${l.join(' | ')}`);
      }
      await shot(page, `${route}-${tier}-${lang}-dense`);
      expect(bad, bad.join('\n')).toEqual([]);
    });
