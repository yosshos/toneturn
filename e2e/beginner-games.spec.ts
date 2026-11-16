import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// AUDIT-7 hole #14: the beginner game per instrument (Staff Runner, Root Catcher, Strum Changes, Rebound Ball, Sing It
// Back), at a 320 × 720 phone in English and Hebrew:
// 1. setup, play, lap review and result fit one screen (no vertical or horizontal scroll), the main button in view;
// 2. on Hebrew screens no visible Latin text outside <bdi> / dir=ltr;
// 3. a run reaches the shared result card (a stub MIDI keyboard / kit that plays nothing, or the fake microphone for
//    the singer: missed laps cost the lives);
// 4. the densest tiers fit, and a saved run resumes at its lap.
// SHOTS=1 saves the screens to docs/new-games-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, permissions: ['microphone'] });

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
      const plays = ['keys', 'guitar', 'bass', 'drums'].includes(course) ? [course] : [];
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays, priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9' };
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

const open = async (page: Page, lang: Lang, route: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${route}`);
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

/** A stub MIDI keyboard / kit (plays nothing). */
const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
const pickMidi = async (page: Page) => {
  const r = page.locator('main [role="radiogroup"] [role="radio"]').filter({ hasText: 'MIDI' }).first();
  if (await r.count()) await r.click();
};
const resultShown = (page: Page) => page.locator('[data-result-card]').isVisible().catch(() => false);

type Game = { route: string; course: string; midi: boolean };
const GAMES: Game[] = [
  { route: 'staffrunner', course: 'keys', midi: true },
  { route: 'rootcatch', course: 'bass', midi: true },
  { route: 'strumchange', course: 'guitar', midi: true },
  { route: 'rebound', course: 'drums', midi: true },
  { route: 'singback', course: 'voice', midi: false },
];

for (const lang of ['en', 'he'] as const)
  for (const g of GAMES)
    test(`${g.route} (${lang}): setup, lap, review and result fit 320×720, Hebrew keeps Latin in bdi, a run reaches the result card`, async ({ page }) => {
      test.setTimeout(300_000);
      const bad: string[] = [];
      const check = async (stage: string) => {
        const s = await measure(page);
        if (s.over > 4 || s.side > 1 || s.bottom > s.h + 1) bad.push(`${stage}: over ${s.over}, side ${s.side}, button bottom ${Math.round(s.bottom)}`);
        if (lang === 'he') {
          const l = await latinOutsideBdi(page);
          if (l.length) bad.push(`${stage} latin: ${l.join(' | ')}`);
        }
      };
      if (g.midi) await stubMidi(page);
      await seed(page, lang, g.course);
      await open(page, lang, g.route);
      await expect(page.locator(`main[data-game="${g.route}"][data-phase="setup"]`)).toBeVisible();
      if (g.midi) await pickMidi(page);
      await page.waitForTimeout(200);
      await check('setup');
      await shot(page, `${g.route}-${lang}-1setup`);
      await page.locator('[data-bg-start]').click();
      await page.locator('[data-bg-play]').click();
      await page.locator(`main[data-game="${g.route}"][data-phase="play"]`).waitFor({ timeout: 20_000 });
      // into the lap (after the count-in)
      await page.waitForTimeout(5200);
      await check('play');
      await shot(page, `${g.route}-${lang}-2play`);
      let reviewed = false;
      for (let k = 0; k < 12 && !(await resultShown(page)); k++) {
        await page.locator(`main[data-phase="review"], [data-result-card]`).first().waitFor({ timeout: 60_000 });
        if (await resultShown(page)) break;
        if (!reviewed) {
          const why = page.locator('[data-why]');
          if (await why.count()) await why.first().click();
          await page.waitForTimeout(150);
          await check('review');
          await shot(page, `${g.route}-${lang}-3review`);
          reviewed = true;
        }
        const next = page.locator('[data-bg-next]');
        if (await next.count()) await next.click();
        await page.locator(`main[data-phase="play"], [data-result-card]`).first().waitFor({ timeout: 20_000 });
      }
      await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 60_000 });
      const why = page.locator('[data-why]');
      if (await why.count()) await why.first().click();
      await check('result');
      await shot(page, `${g.route}-${lang}-4result`);
      expect(bad, bad.join('\n')).toEqual([]);
    });

// The densest screens (eighth notes on the staff, 32 strokes, numerals, a five-note phrase) through a saved run at
// that tier — which is also the resume after Back / reload (never lose progress).
const DENSE: [string, string, string, number][] = [
  ['staffrunner', 'keys', 'ff', 6],
  ['staffrunner', 'keys', 'mp', 3],
  ['rootcatch', 'bass', 'ff', 6],
  ['strumchange', 'guitar', 'ff', 6],
  ['rebound', 'drums', 'f', 5],
  ['rebound', 'drums', 'mp', 3],
  ['singback', 'voice', 'ff', 6],
];
for (const lang of ['en', 'he'] as const)
  for (const [route, course, tier, lv] of DENSE)
    test(`dense tier fits 320×720 and resumes at its lap: ${route} ${tier} (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await stubMidi(page);
      const bad: string[] = [];
      await seed(page, lang, course);
      await open(page, lang, route);
      await page.evaluate(
        async ({ route, lv }) => {
          const data = { v: 1, game: route, seed: 7, level: lv, lap: 2, lives: 2, hits: 10, total: 12, boost: 1, input: route === 'singback' ? 'mic' : 'midi', keys: [], passed: 2 };
          const path = '/src/storage/resume.ts';
          const m = await import(/* @vite-ignore */ path);
          m.saveSlot(`game:${route}`, { title: route, route, done: 0, total: 0, data });
        },
        { route, lv },
      );
      await open(page, lang, route);
      const cont = page.locator('main .g2-col .btn.mega');
      expect(await cont.count(), 'resume button').toBeGreaterThan(0);
      await expect(cont.first()).toContainText('3');
      await cont.first().click();
      // the run resumes at lap 3 of 6 with two lives
      await expect(page.locator('.adv-hud b').first()).toContainText('3/6');
      await expect(page.locator('.bg-lives i.on')).toHaveCount(2);
      // the staff is engraved once VexFlow has loaded
      if (route === 'staffrunner') await page.locator('.bg-staff svg').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(400);
      const s = await measure(page);
      if (s.over > 4 || s.side > 1) bad.push(`${route} ${tier} ${lang}: over ${s.over}, side ${s.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`${route} ${tier} latin: ${l.join(' | ')}`);
      }
      await shot(page, `${route}-${tier}-${lang}-dense`);
      expect(bad, bad.join('\n')).toEqual([]);
    });
