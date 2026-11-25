import { expect, test, type Page } from '@playwright/test';

const seed = async (page: Page, lang: 'en' | 'he', plays: 'drums', extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays, drumView: 'staff' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', drills, ...extra };
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
    { lang, plays, extra },
  );
};

// COURSE-FEEDBACK-UI slice 6 (§4.5): the drum lanes (22 px lanes, drum icons, ✕ / ● heads, the kick as a bar), the
// notation one bar a line on a phone, the per-drum split chips in the review, and the Highway's gems (kick bar, cymbal
// ✕, per-gem marks, no text flash) — 320×720, English and Hebrew. SHOTS=1 saves to docs/ui-shots-v3/.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });
const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/s6-${name}.png` });
};
const DRILLS = (view: 'staff' | 'lanes') => ({ showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'drums', drumView: view });
const fits = async (page: Page, what: string) => {
  const o = await page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(o.tall, `${what}: taller than the screen`).toBeLessThanOrEqual(2);
  expect(o.wide, `${what}: sideways`).toBeLessThanOrEqual(1);
};
const openLevel = async (page: Page, lang: 'en' | 'he', family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};
const fakeTake = async (page: Page) => {
  const speaker = page.locator('[data-drums-choice="speaker"]');
  if (await speaker.isVisible().catch(() => false)) await speaker.click();
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('.drill-result')).toBeVisible({ timeout: 25_000 });
  await page.waitForTimeout(600);
};

for (const lang of ['en', 'he'] as const) {
  test(`drum lanes: 22 px lanes, icons, ✕ and ● heads, the kick bar, a key behind "?" (${lang})`, async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
    await seed(page, lang, 'drums', { headphones: false, drills: DRILLS('lanes') });
    await openLevel(page, lang, 'd-rock', 'd-rock-1');
    const svg = page.locator('svg.drum-lanes').first();
    await expect(svg).toBeVisible();
    const g = await svg.evaluate((el) => {
      const lane = el.querySelector('.dl-lane') as SVGGraphicsElement;
      const x = el.querySelector('.dl-x') as SVGGraphicsElement | null;
      const d = el.querySelector('.dl-hit') as SVGGraphicsElement | null;
      return {
        lane: lane.getBoundingClientRect().height,
        icons: el.querySelectorAll('[data-lane-icon]').length,
        kick: el.getAttribute('data-kick-bar'),
        kicks: el.querySelectorAll('.dl-kick').length,
        x: x ? x.getBoundingClientRect().width : 0,
        d: d ? d.getBoundingClientRect().width : 0,
        words: el.querySelectorAll('.dl-name').length,
      };
    });
    expect(g.lane, 'lane height px').toBeGreaterThanOrEqual(19);
    expect(g.icons).toBeGreaterThan(1);
    expect(g.kick).toBe('1');
    expect(g.kicks).toBeGreaterThan(0);
    expect(g.x, 'cymbal ✕ px').toBeGreaterThanOrEqual(8);
    expect(g.d, 'drum head px').toBeGreaterThanOrEqual(8);
    expect(g.words).toBe(0);
    await expect(page.locator('.drum-key')).toHaveCount(0);
    await fits(page, 'lanes before');
    await shot(page, `lanes-before-${lang}`);
    await page.locator('[data-lane-key]').click();
    await expect(page.locator('[data-lane-key-sheet]')).toBeVisible();
    await shot(page, `lanes-key-${lang}`);
    await page.locator('[data-lane-key-sheet] .icon-btn').click();
    await fakeTake(page);
    expect(await page.locator('svg.drum-lanes :is(.dl-hit, .dl-kick, .dl-xbg):is(.ok, .early, .late, .wrong, .missed)').count()).toBeGreaterThan(0);
    await fits(page, 'lanes review');
    await shot(page, `lanes-after-${lang}`);
  });

  test(`drum notation: one bar a line on a phone, heads ≥ 9 px; the review splits by drum (${lang})`, async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
    await seed(page, lang, 'drums', { headphones: false, drills: DRILLS('staff') });
    await openLevel(page, lang, 'd-rock', 'd-rock-1');
    await expect(page.locator('.drum-score[data-drum-bars="1"]')).toBeVisible();
    const head = await page.locator('.drum-staff .dn-head').first().evaluate((e) => e.getBoundingClientRect().width);
    expect(head, 'drum head px').toBeGreaterThanOrEqual(9);
    await fits(page, 'staff before');
    await shot(page, `staff-before-${lang}`);
    await fakeTake(page);
    const chips = page.locator('[data-limb-chips]');
    await expect(chips).toBeVisible();
    const states = ((await chips.getAttribute('data-limb-chips')) ?? '').split(' ');
    expect(states.length).toBeGreaterThan(1);
    for (const s of states) expect(s).toMatch(/^[a-zA-Z0-9]+:(ok|early|late|miss)$/);
    const box = await chips.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await fits(page, 'review with drum chips');
    const next = await page.locator('.take-review [data-next]').boundingBox();
    expect(next!.y + next!.height).toBeLessThanOrEqual(720);
    await shot(page, `review-chips-${lang}`);
  });

  test(`Highway kit lanes: setup on one screen; kick bar, cymbal gems, lemon hit line, marks on the gems (${lang})`, async ({ page }) => {
    await seed(page, lang, 'drums');
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&lang=${lang}#/highway`);
    await expect(page.locator('[data-hw-mode="kit"]')).toHaveAttribute('aria-checked', 'true');
    await fits(page, 'highway setup');
    await shot(page, `highway-setup-${lang}`);
    await page.locator('[data-start-highway]').click();
    const road = page.locator('.hw-road');
    await expect(road).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.hw-note.kit-kick').first()).toBeAttached();
    const g = await page.evaluate(() => {
      const road = document.querySelector('.hw-road')!.getBoundingClientRect();
      const kick = document.querySelector('.hw-note.kit-kick') as HTMLElement;
      const hat = document.querySelector('.hw-note.kit-hihat, .hw-note.kit-cymbal') as HTMLElement | null;
      const line = getComputedStyle(document.querySelector('.hw-hitline')!);
      return { road: road.width, kick: kick.getBoundingClientRect().width, hatR: hat ? getComputedStyle(hat).borderRadius : '', line: line.backgroundColor };
    });
    expect(g.kick, 'the kick spans the lanes').toBeGreaterThan(g.road * 0.8);
    if (g.hatR) expect(g.hatR).toBe('10px');
    expect(g.line).toBe('rgb(255, 212, 59)');
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.hw-note')].some((n) => { const b = n.getBoundingClientRect(); return b.top > 150 && b.bottom < 600; })), { timeout: 15_000 }).toBe(true);
    await shot(page, `highway-gems-${lang}`);
    // Tap every drum column quickly for a few seconds: hits get marks on the gems; nothing is said in visible text.
    const r = (await road.boundingBox())!;
    for (let k = 0; k < 70; k++) {
      await page.mouse.click(r.x + ((k % 5) + 0.5) * (r.width / 5), r.y + r.height * 0.5);
      await page.waitForTimeout(45);
    }
    await expect.poll(() => page.locator('.hw-note:is(.is-perfect, .is-good, .is-miss)').count(), { timeout: 20_000 }).toBeGreaterThan(0);
    const marks = await page.evaluate(() => ({
      flashVisible: [...document.querySelectorAll('.hw-flash')].some((e) => !e.classList.contains('sr-only')),
      missBorder: (() => {
        const m = document.querySelector('.hw-note.is-miss') as HTMLElement | null;
        return m ? getComputedStyle(m).borderTopStyle : 'dashed';
      })(),
      hitBg: (() => {
        const m = document.querySelector('.hw-note.is-good, .hw-note.is-perfect') as HTMLElement | null;
        return m ? getComputedStyle(m).backgroundColor : 'rgb(18, 201, 180)';
      })(),
      ticks: document.querySelectorAll('.hw-tick').length,
      ticksOk: [...document.querySelectorAll('.hw-tick')].every((t) => t.parentElement!.classList.contains('is-good')),
    }));
    expect(marks.flashVisible).toBe(false);
    expect(marks.missBorder).toBe('dashed');
    expect(marks.hitBg).toBe('rgb(18, 201, 180)');
    expect(marks.ticksOk).toBe(true);
    await fits(page, 'highway play');
    await shot(page, `highway-play-${lang}`);
  });
}
