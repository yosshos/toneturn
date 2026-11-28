import { expect, test, type Page } from '@playwright/test';
import { pdPiece } from '../src/content/classicalPD';
import { pdSectionDrill } from '../src/engine/drills/keysClassic';

// Notation 0.99 (owner: critical): grace notes and two voices on one staff. The Minuet's grace B before bar 8 is drawn
// small (svg g[id^="vf-grace-"]) on the run screen and in the piece coach's score; the Prelude in C's left hand and the
// four-voice reading item draw a second voice stems down (g[id^="vf-v2-"]); the staff carrying them keeps its heads at
// 9 px or more; every page fits one phone screen (320×720, English and Hebrew); and a MIDI take of the Minuet's first section with the grace played is clean, nothing wrong.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async ({ lang }) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills };
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
  }, { lang });
};
const problems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (over > 2) out.push(`taller by ${over}`);
    return out;
  });
/** SVG groups matching `sel` inside `root` that are drawn on the screen now; and the smallest main notehead's height. */
const onScreen = (page: Page, sel: string, root = '.drill-staff') =>
  page.evaluate(
    ({ sel, root }) =>
      [...document.querySelectorAll(`${root} ${sel}`)].filter((g) => {
        const r = g.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight;
      }).length,
    { sel, root },
  );
/** Voice-2 stems point down: each voice-2 note's stem bottom lies below its head. */
const stemsDown = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.drill-staff g[id^="vf-v2-"]')].every((g) => {
      const head = g.querySelector('.vf-notehead');
      const stem = g.querySelector('.vf-stem');
      if (!head || !stem) return true; // a rest or a whole note
      return stem.getBoundingClientRect().bottom > head.getBoundingClientRect().bottom + 2;
    }),
  );
/**
 * Per staff holding `sel` (the new notation) on the screen: a notehead's height in px — one staff space (10 SVG units)
 * at the staff's drawn scale (measuring glyph boxes was unreliable: grace heads, chords).
 */
const headPx = (page: Page, sel: string) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll('.drill-staff .note-staff svg')]
        .filter((svg) => svg.querySelector(sel))
        .map((svg) => (svg.getBoundingClientRect().width / Number(svg.getAttribute('viewBox')!.split(' ')[2])) * 10),
    sel,
  );
/** The largest head the run screen's CSS lets a staff draw (its max-height over the SVG's height, in staff spaces). */
const headCap = (page: Page) =>
  page.evaluate(() => {
    const svg = document.querySelector('.drill-staff .note-staff svg');
    if (!svg) return 99;
    const mh = parseFloat(getComputedStyle(svg).maxHeight);
    return Number.isFinite(mh) ? (mh / Number(svg.getAttribute('viewBox')!.split(' ')[3])) * 10 : 99;
  });

/** Head sizes seen, written next to the screenshots (the report). */
const heads: string[] = [];
test.afterAll(() => console.log(`HEADS ${heads.join(' | ')}`));

const open = async (page: Page, lang: 'en' | 'he', family: string, level: string, query = '', cell?: RegExp) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}${query}#/drills`);
  await page.waitForTimeout(800);
  await page.locator('[data-topic="all"]').click();
  await page.waitForTimeout(400);
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  if (cell) await page.locator('.heat-cell').and(page.getByRole('button', { name: cell })).first().click();
  else await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(700);
};
/** Page through the score until `sel` is drawn on the screen; every page checked for fit. */
const pageUntil = async (page: Page, sel: string, bad: string[]) => {
  let seen = await onScreen(page, sel);
  bad.push(...(await problems(page)));
  for (let k = 0; k < 14 && !seen; k++) {
    const next = page.getByRole('button', { name: 'Next lines' });
    if (!(await next.count()) || (await next.first().isDisabled())) break;
    await next.first().click();
    await page.waitForTimeout(300);
    bad.push(...(await problems(page)));
    seen = await onScreen(page, sel);
  }
  return seen;
};

for (const lang of ['en', 'he'] as const) {
  test(`grace notes drawn: the Minuet's grace B, the acciaccatura item, the blues crush (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    await seed(page, lang);
    for (const [family, level, shot] of [
      ['k-classic', 'k-classic-2', 'minuet'],
      ['fingers', 'fingers-9', 'ornaments'],
      ['jazz', 'jazz-10', 'blues'],
    ] as const) {
      // the level's grace-note item: the acciaccatura (ornaments level), the crush lick (blues level)
      await open(page, lang, family, level, '', family === 'fingers' ? /acciaccatura|אקצ׳קטורה/ : family === 'jazz' ? /crush|הריסוק/ : undefined);
      await expect(page.locator('.drill-staff svg').first()).toBeVisible();
      const bad: string[] = [];
      const seen = await pageUntil(page, 'g[id^="vf-grace-"]', bad);
      expect(seen, level).toBeGreaterThan(0);
      expect([...new Set(bad)], level).toEqual([]);
      await page.screenshot({ path: `docs/ui-shots-v3/notation-grace-${shot}-${lang}.png` });
      {
        // the staff with the new notation draws its heads at 9 px, or as large as the run screen's CSS lets any staff draw
        // (hands together at 720 px: two staves share the height)
        const mine = await headPx(page, 'g[id^="vf-grace-"]');
        const cap = await headCap(page);
        expect(Math.min(...mine), `${level} heads ${JSON.stringify(mine)}, CSS cap ${cap}`).toBeGreaterThanOrEqual(Math.min(9, cap) - 0.05);
        heads.push(`${level}: ${mine.map((x) => x.toFixed(1)).join('/')} px (cap ${cap.toFixed(1)})`);
      }
    }
  });

  test(`two voices drawn: the Prelude in C's left hand, four-voice reading (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    await seed(page, lang);
    for (const [family, level, shot] of [
      ['k-classic', 'k-classic-6', 'prelude'],
      ['k-read', 'k-read-11', 'fourvoice'],
    ] as const) {
      await open(page, lang, family, level);
      await expect(page.locator('.drill-staff svg').first()).toBeVisible();
      const bad: string[] = [];
      const seen = await pageUntil(page, 'g[id^="vf-v2-"]', bad);
      expect(seen, level).toBeGreaterThan(0);
      expect(await stemsDown(page), level).toBe(true);
      await page.screenshot({ path: `docs/ui-shots-v3/notation-voices-${shot}-${lang}.png` });
      {
        // the staff with the new notation draws its heads at 9 px, or as large as the run screen's CSS lets any staff draw
        // (hands together at 720 px: two staves share the height)
        const mine = await headPx(page, 'g[id^="vf-v2-"]');
        const cap = await headCap(page);
        expect(Math.min(...mine), `${level} heads ${JSON.stringify(mine)}, CSS cap ${cap}`).toBeGreaterThanOrEqual(Math.min(9, cap) - 0.05);
        heads.push(`${level}: ${mine.map((x) => x.toFixed(1)).join('/')} px (cap ${cap.toFixed(1)})`);
      }
      // every later page fits too
      for (let k = 0; k < 14; k++) {
        const next = page.getByRole('button', { name: 'Next lines' });
        if (!(await next.count()) || (await next.first().isDisabled())) break;
        await next.first().click();
        await page.waitForTimeout(250);
        bad.push(...(await problems(page)));
      }
      expect([...new Set(bad)], level).toEqual([]);
    }
  });
}

test('the piece coach\'s score draws the Minuet\'s grace note and the Prelude\'s two voices', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, 'en');
  for (const [id, sel] of [
    ['minuet-g', 'g[id^="vf-grace-"]'],
    ['prelude-c', 'g[id^="vf-v2-"]'],
  ] as const) {
    await page.goto('about:blank');
    await page.goto('/?unlock=all#/repertoire/score');
    await page.locator(`[data-pd-piece="${id}"]`).click();
    // the setup sheet: start
    await page.getByRole('button', { name: /start|begin|go/i }).first().click({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('[data-score] svg').first()).toBeVisible();
    await page.waitForTimeout(500);
    const n = await page.evaluate((sel) => document.querySelectorAll(`[data-score] ${sel}`).length, sel);
    expect(n, id).toBeGreaterThan(0);
    await page.screenshot({ path: `docs/ui-shots-v3/notation-coach-${id}.png` });
  }
});

test('a MIDI take of the Minuet (bars 1–8) with the grace note played: clean, nothing wrong', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
  await seed(page, 'en');
  await page.goto('/?unlock=all#/settings/midi');
  await page.getByRole('radiogroup', { name: 'MIDI keyboard' }).getByRole('radio', { name: 'Auto' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Connected: Test Keys' })).toBeVisible();
  await open(page, 'en', 'k-classic', 'k-classic-2', '&rubato=1');
  await expect(page.locator('[data-rubato-stage="free"]')).toBeVisible();
  await page.locator('[data-rubato-start]').click();
  await expect(page.locator('[data-rubato-take="on"]')).toBeVisible();
  // the section's notes in order, onsets together, the grace B pressed just before bar 8's A
  const d = pdSectionDrill({ family: 'k-classic', kind: 'pd~minuet-g', key: 7, hands: 'RL', option: 0 }, pdPiece('minuet-g')!, 0);
  const groups = new Map<number, { pitch: number; graces: number[] }[]>();
  for (const n of d.notes) groups.set(n.beat, [...(groups.get(n.beat) ?? []), { pitch: n.pitch, graces: (n.graces ?? []).map((g) => g.pitch) }]);
  const seq = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, ns]) => ns);
  expect(seq.some((ns) => ns.some((x) => x.graces.length))).toBe(true);
  await page.evaluate(async (seq) => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    const send = (b: number[]) => inp.onmidimessage({ data: new Uint8Array(b), timeStamp: performance.now() });
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (const ns of seq) {
      for (const x of ns) for (const g of x.graces) {
        send([0x90, g, 60]);
        await wait(60);
        send([0x80, g, 0]);
      }
      for (const x of ns) send([0x90, x.pitch, 80]);
      await wait(220);
      for (const x of ns) send([0x80, x.pitch, 0]);
      await wait(60);
    }
  }, seq);
  await page.locator('[data-rubato-done]').click();
  const res = page.locator('[data-rubato-result="free"]');
  await expect(res).toBeVisible();
  await expect(res.locator('[data-review]')).toHaveAttribute('data-review', 'clean');
  await page.screenshot({ path: 'docs/ui-shots-v3/notation-minuet-take-clean.png' });
});
