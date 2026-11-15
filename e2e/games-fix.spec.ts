import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Games catalogue fixes (docs/research/AUDIT-GAMES.md §3), at a 320 × 720 phone in English and Hebrew:
// 1. every fixed game's setup and its play screen fit one screen (no vertical or horizontal scroll), Start in view;
// 2. on Hebrew game screens no visible text outside <bdi> / dir=ltr contains Latin letters (allow-list: BPM, ♩,
//    numbers, dynamics letters);
// 3. the games that hear a microphone or read MIDI show the input-check strip on their setup.
// SHOTS=1 saves the screens to docs/games-fix-shots/ (the "after" pictures of the fix).

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;
const SHOT_DIR = 'docs/games-fix-shots';
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

// ?sim=1 (the labelled simulator) keeps the Ear course, so the other courses open without it (automation still gets
// the simulated input-check signal through navigator.webdriver).
const open = async (page: Page, lang: Lang, route: string, course = 'ear') => {
  await page.goto('about:blank');
  await page.goto(`/?${course === 'ear' ? 'sim=1&' : ''}unlock=all&lang=${lang}#/${route}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(700);
};

/** Page overflow (the test-only simulator banner hidden) and whether the main button is in view. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    const btns = [...document.querySelectorAll('main .btn.mega, main .btn.primary')].filter((b) => (b as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const bottom = btns.length ? Math.max(...btns.map((b) => b.getBoundingClientRect().bottom)) : 0;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth, bottom, h: innerHeight };
  });

/** Visible text in Hebrew outside <bdi>, dir=ltr, notation and dynamics that still has Latin letters. */
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

type Game = { route: string; course: string; name?: string; pre?: string[]; start?: string; noPlay?: boolean };
// The games this fix touches (setup and play screens).
const GAMES: Game[] = [
  { route: 'games', course: 'ear', name: 'echo' },
  { route: 'games', course: 'ear', name: 'beat-echo', pre: ['.game-card.rhythm'] },
  { route: 'truefalse', course: 'ear' },
  { route: 'duel', course: 'ear' },
  { route: 'ghost', course: 'ear' },
  { route: 'daily', course: 'ear' },
  { route: 'highway', course: 'ear' },
  { route: 'highway', course: 'drums', name: 'highway-drums' },
  { route: 'pitchmemory', course: 'ear', noPlay: true },
  { route: 'rush-progression', course: 'ear' },
  { route: 'rush-standard', course: 'jazz' },
  { route: 'reharm', course: 'jazz' },
  { route: 'peakhunter', course: 'ear' },
  { route: 'melodypuzzle', course: 'ear' },
  { route: 'transcribe', course: 'ear' },
  { route: 'polylock', course: 'ear' },
  { route: 'flight', course: 'voice' },
  { route: 'singinterval', course: 'voice' },
  { route: 'harmonyhold', course: 'voice' },
  { route: 'bhtime', course: 'jazz' },
  { route: 'voicingsprint', course: 'keys' },
  { route: 'tuneup', course: 'guitar' },
  { route: 'walkchanges', course: 'bass' },
  { route: 'rootsear', course: 'bass' },
  { route: 'groove-echo', course: 'drums' },
  { route: 'land', course: 'drums' },
  { route: 'time-lock', course: 'drums' },
  { route: 'rudiment-rush', course: 'drums' },
  { route: 'kitread', course: 'drums' },
  { route: 'namegroove', course: 'drums' },
  { route: 'groove', course: 'drums', noPlay: true },
];

const shot = async (page: Page, file: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/${file}.png` });
};

for (const lang of ['en', 'he'] as const) {
  test(`fixed games: setup and play fit 320×720, Hebrew has no stray Latin (${lang})`, async ({ context }) => {
    test.setTimeout(900_000);
    const bad: string[] = [];
    let last = '';
    let page: Page | null = null;
    for (const g of GAMES) {
      // a fresh tab per game (a long run of audio games in one tab can crash the renderer)
      await page?.close();
      page = await context.newPage();
      const id = g.name ?? (g.course === 'ear' ? g.route : `${g.route}-${g.course}`);
      if (g.course !== last) {
        await seed(page, lang, g.course);
        last = g.course;
      }
      await open(page, lang, g.route, g.course);
      for (const s of g.pre ?? []) await page.locator(s).first().click();
      await page.waitForTimeout(300);
      const s1 = await measure(page);
      if (s1.over > 4 || s1.side > 1 || s1.bottom > s1.h + 1) bad.push(`${id} setup: over ${s1.over}, side ${s1.side}, start bottom ${Math.round(s1.bottom)}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`${id} setup latin: ${l.join(' | ')}`);
      }
      await shot(page, `${id}-${lang}-1setup`);
      if (g.noPlay) continue;
      const start = page.locator(g.start ?? 'main .btn.mega:visible, main [data-start-highway]:visible').last();
      if (!(await start.count())) {
        bad.push(`${id}: no start button`);
        continue;
      }
      await start.click();
      await page.waitForTimeout(2500);
      const s2 = await measure(page);
      if (s2.over > 4 || s2.side > 1) bad.push(`${id} play: over ${s2.over}, side ${s2.side}`);
      if (lang === 'he') {
        const l = await latinOutsideBdi(page);
        if (l.length) bad.push(`${id} play latin: ${l.join(' | ')}`);
      }
      await shot(page, `${id}-${lang}-2play`);
    }
    await page?.close();
    expect(bad, bad.join('\n')).toEqual([]);
  });
}

// The 12 games that hear a microphone or read MIDI and had no input check (AUDIT-GAMES fix #3).
const CHECKS: { route: string; course: string; pre?: string[] }[] = [
  { route: 'flight', course: 'voice' },
  { route: 'games', course: 'ear', pre: ['.seg [role="radio"]:nth-child(2)'] }, // Echo Chain, sing
  { route: 'games', course: 'ear', pre: ['.game-card.rhythm', '.seg [role="radio"]:nth-child(2)'] }, // Beat Echo, knock
  { route: 'transcribe', course: 'ear' },
  { route: 'bhtime', course: 'jazz' },
  { route: 'polylock', course: 'ear' },
  { route: 'voicingsprint', course: 'keys' },
  { route: 'harmonyhold', course: 'voice' },
  { route: 'singinterval', course: 'voice' },
  { route: 'pitchmemory', course: 'ear' },
  { route: 'groove', course: 'drums' },
];

for (const lang of ['en', 'he'] as const) {
  test(`mic and MIDI games show the input check on their setup (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    const missing: string[] = [];
    let last = '';
    for (const g of CHECKS) {
      if (g.course !== last) {
        await seed(page, lang, g.course);
        last = g.course;
      }
      await open(page, lang, g.route, g.course);
      for (const s of g.pre ?? []) await page.locator(s).first().click();
      const strip = page.locator('.input-check').first();
      if (!(await strip.isVisible().catch(() => false))) {
        await page.waitForTimeout(800);
        if (!(await strip.isVisible())) missing.push(`${g.route}${g.pre ? ' ' + g.pre.join(' ') : ''}`);
      }
      const m = await measure(page);
      if (m.over > 4) missing.push(`${g.route}: setup with the strip taller by ${m.over}px`);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  test(`Chord Rush strum mode shows the input check (guitar, ${lang})`, async ({ page }) => {
    await seed(page, lang, 'guitar');
    await open(page, lang, 'rush-chord', 'guitar');
    await expect(page.locator('.input-check')).toHaveCount(0);
    await page.locator('[data-picture="play"]').first().click();
    await expect(page.locator('.input-check').first()).toBeVisible();
  });
}
