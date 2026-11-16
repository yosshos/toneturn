import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// The Paper chrome cut (src/ui/paper/art-chrome*.ts, owner 2026-11-16: "everything should match"): the key screens at
// 320×720 in English and Hebrew draw their control symbols as Paper (svg.pp-chrome), every visible symbol's sheet reads
// on the surface it sits on (≥ 3:1, measured in the page), no line-icon <svg> with thin strokes is left in a button,
// back / forward chevrons mirror in Hebrew, nothing scrolls sideways, and the exercise screens stay one screen.
// The gallery (#/dev/glyphs?sec=chrome) is shot to docs/icon-shots/chrome-*.png. E2E_BASE: a worktree's own vite.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const OUT = 'docs/icon-shots';
mkdirSync(OUT, { recursive: true });
type Lang = 'en' | 'he';

const seed = async (page: Page, lang: Lang, course: 'keys' | 'guitar' = 'keys', lick?: unknown) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, course, lick }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: course === 'guitar' ? 'guitar' : 'piano' };
      const settings = {
        version: 2,
        uiLang: lang,
        inputLang: lang,
        outputLang: lang,
        mode: 'buttons',
        voiceConsent: true,
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [course], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', course],
        activeCourse: course,
        seenVersion: '9.9.9',
        drills,
        ...(lick ? { lickBook: { own: [lick] } } : {}),
      };
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
    { lang, course, lick },
  );
};
const open = async (page: Page, lang: Lang, hash: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${hash}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(500);
};

interface Audit {
  chrome: number;
  bad: string[];
  thin: string[];
  side: number;
  over: number;
  back: { flipped: boolean; ltrIsland: boolean }[];
}
/** Every visible chrome symbol: its sheet against the surface under it; old thin-stroke line icons left in buttons. */
const audit = (page: Page) =>
  page.evaluate((): Audit => {
    const parse = (c: string): [number, number, number, number] | null => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
      const s = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
      if (s) return [+s[1] * 255, +s[2] * 255, +s[3] * 255, s[4] === undefined ? 1 : +s[4]];
      return null;
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: number[], b: number[]) => {
      const A = lum(a);
      const B = lum(b);
      return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
    };
    const bgOf = (el: Element): number[] => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        for (const pseudo of [null, '::before'] as const) {
          const cs = getComputedStyle(e, pseudo);
          if (pseudo && (cs.content === 'none' || cs.position !== 'absolute')) continue;
          const c = parse(cs.backgroundColor);
          if (c && c[3] > 0.5) return c;
        }
      }
      return [255, 255, 255, 1];
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.6) return false;
        if ((e as HTMLButtonElement).disabled) return false;
      }
      return true;
    };
    const bad: string[] = [];
    let chrome = 0;
    document.querySelectorAll('svg.pp-chrome').forEach((svg) => {
      if (!visible(svg)) return;
      chrome++;
      const part = svg.querySelector(':scope > :not(.pe), :scope > g > :not(.pe)') as SVGElement | null;
      if (!part) return;
      const cs = getComputedStyle(part);
      const col = parse(cs.fill !== 'none' ? cs.fill : cs.stroke);
      if (!col) return;
      const bg = bgOf(svg);
      const r = ratio(col, bg);
      if (r < 3) bad.push(`${svg.getAttribute('class')} in ${(svg.closest('button, a, [role=button]') ?? svg.parentElement)?.className} ${r.toFixed(2)}`);
    });
    // Old line icons: an <svg> inside a control drawn with thin strokes (≤ 2.6 on a 24 grid), not Paper.
    const thin: string[] = [];
    document.querySelectorAll('button svg, a svg, [role=button] svg').forEach((svg) => {
      if (svg.classList.contains('pp') || svg.closest('svg.pp') || !visible(svg)) return;
      const sw = Number(svg.getAttribute('stroke-width') ?? svg.querySelector('[stroke-width]')?.getAttribute('stroke-width') ?? 0);
      const vb = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
      if (sw > 0 && sw <= 2.6 && vb[2] === 24 && svg.getAttribute('stroke') === 'currentColor') thin.push((svg.closest('button, a, [role=button]') as HTMLElement).className);
    });
    const back = [...document.querySelectorAll('svg.ico-back, svg.ico-fwd')].filter(visible).map((s) => ({ flipped: getComputedStyle(s).transform.startsWith('matrix(-1'), ltrIsland: !!s.parentElement?.closest('[dir="ltr"]') && s.parentElement!.closest('[dir]') !== document.documentElement }));
    const se = document.scrollingElement!;
    return { chrome, bad, thin, side: se.scrollWidth - innerWidth, over: se.scrollHeight - innerHeight, back };
  });

const check = async (page: Page, lang: Lang, name: string, o: { oneScreen?: boolean; minChrome?: number } = {}) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const a = await audit(page);
  expect(a.chrome, `${name}: Paper chrome symbols`).toBeGreaterThanOrEqual(o.minChrome ?? 1);
  expect(a.bad, `${name}: symbols that do not read on their surface`).toEqual([]);
  expect(a.thin, `${name}: old line icons in controls`).toEqual([]);
  expect(a.side, `${name}: no sideways scroll`).toBeLessThanOrEqual(1);
  if (o.oneScreen) expect(a.over, `${name}: one screen`).toBeLessThanOrEqual(2);
  for (const b of a.back) expect(b.flipped, `${name}: chevrons mirror in Hebrew only (ltr islands never)`).toBe(lang === 'he' && !b.ltrIsland);
  await page.screenshot({ path: `test-results/chrome-${name}-${lang}.png` });
};

for (const lang of ['en', 'he'] as const) {
  test(`chrome: home, path, practice, tuner, metronome, recordings library (${lang})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await seed(page, lang);
    await open(page, lang, '');
    await check(page, lang, 'home');
    await open(page, lang, 'path');
    await check(page, lang, 'path', { minChrome: 0 });
    await open(page, lang, 'arcade');
    await check(page, lang, 'practice');
    await open(page, lang, 'tuner');
    await check(page, lang, 'tuner', { oneScreen: true });
    await open(page, lang, 'metronome');
    await check(page, lang, 'metronome');
    await open(page, lang, 'recordings');
    await check(page, lang, 'recordings');
    expect(errors).toEqual([]);
  });

  test(`chrome: an exercise — ready (the Play button), run, review; the recordings player (${lang})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'clean'));
    await seed(page, lang);
    // the gate page of a lesson: the Play button is the lemon note head with the Paper play sheet, 76 px as before
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&brief=1&lang=${lang}#/topic/basics-highlow/1`);
    const play = page.locator('[data-brief-play]');
    await expect(play).toBeVisible();
    const box = await play.boundingBox();
    expect(Math.round(box!.width)).toBe(76);
    expect(Math.round(box!.height)).toBe(76);
    await expect(play.locator('svg.pp-chrome.ico-play')).toHaveCount(1);
    await expect(play).toHaveAttribute('aria-label', lang === 'he' ? 'התחלה' : 'Start');
    await check(page, lang, 'ready', { oneScreen: true });
    await page.locator('.ex-actions').screenshot({ path: `${OUT}/chrome-play-${lang}.png` });
    await play.click();
    await expect(page.locator('main.lesson .controls')).toBeVisible({ timeout: 15_000 });
    await check(page, lang, 'lesson', { oneScreen: true });
    await open(page, lang, 'drills');
    await page.locator('[data-topic="all"]').click();
    await page.locator('[data-family="scales"]').click();
    const card = page.locator('[data-level="scales-1"]');
    await card.scrollIntoViewIfNeeded();
    if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
    await page.locator('[data-level-start="scales-1"]').click();
    await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
    await expect(page.locator('[data-drills="run"]')).toBeVisible();
    await check(page, lang, 'run', { oneScreen: true });
    await page.locator('[data-drill-play]').click();
    await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    await check(page, lang, 'review', { oneScreen: true });
    // the recordings player
    await open(page, lang, 'recordings');
    const row = page.locator('[data-rec-take]').first();
    await expect(row).toBeVisible({ timeout: 10_000 });
    const id = (await row.getAttribute('data-rec-take'))!;
    await page.locator(`[data-rec-open="${id}"]`).click();
    await expect(page.locator('[data-recordings="player"]')).toBeVisible();
    await check(page, lang, 'player', { oneScreen: true, minChrome: 4 });
  });

  test(`chrome: an Encore run (${lang})`, async ({ page }) => {
    test.setTimeout(150_000);
    const now = new Date().toISOString();
    const lick = {
      id: 'enc-ctest', v: 3, ctx: 'free', level: 3, name: { en: 'Pentatonic run', he: 'ריצה פנטטונית' }, chords: [],
      notes: [[0, 0, 0.5], [3, 0.5, 0.5], [5, 1, 0.5], [7, 1.5, 0.5], [10, 2, 1]], meter: 4, swing: 0.5, straight: true, homeKey: 0, minor: true, own: true,
      instrument: 'piano', playedBpm: 100, createdAt: now,
      plan: { startBpm: 60, goalBpm: 125, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true },
    };
    await seed(page, lang, 'keys', lick);
    await open(page, lang, 'encore/plan/enc-ctest');
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    await check(page, lang, 'encore-plan');
    await page.locator('[data-plan-start]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await check(page, lang, 'encore-run', { oneScreen: true });
  });
}

for (const theme of ['light', 'dark'] as const)
  test(`chrome gallery: every symbol at 16/20/24 px on every button background (${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(`/#/dev/glyphs?sec=chrome&theme=${theme}`);
    await expect(page.locator('[data-ready]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const rows = await page.locator('.pg-chrome tr[data-chrome]').count();
    expect(rows).toBeGreaterThan(80);
    expect(await page.locator('.pg-chrome svg.pp-chrome').count()).toBe(rows * 7 * 3);
    // contrast on every surface, measured
    const a = await audit(page);
    expect(a.bad).toEqual([]);
    await page.locator('.pg-chrome-sec').screenshot({ path: `${OUT}/chrome-${theme}.png` });
    // a close-up of the media controls
    await page.goto(`/#/dev/glyphs?sec=chrome&theme=${theme}&only=play,pause,stop,record,back,fwd,close,more,again,check`);
    await page.reload();
    await expect(page.locator('[data-ready]')).toBeVisible();
    await page.locator('.pg-chrome').screenshot({ path: `${OUT}/chrome-core-${theme}.png` });
    await ctx.close();
  });
