import { expect, test, type Page } from '@playwright/test';

// COURSE-FEEDBACK-UI (docs/research/COURSE-FEEDBACK-UI.md): the exercise and feedback screens at 320×720, English and
// Hebrew — the reharm studio has no sideways overflow and its chips never break inside a word. SHOTS=1 saves the
// screens to docs/ui-shots-v3/. E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Plays = 'keys' | 'guitar' | 'bass' | 'drums';
const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/${process.env.SHOTS_PREFIX ?? ''}${name}.png` });
};

export const seed = async (page: Page, lang: 'en' | 'he', plays: Plays, extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both', drumView: 'staff' };
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

const openFamily = async (page: Page, lang: 'en' | 'he', family: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
};

for (const lang of ['en', 'he'] as const) {
  test(`reharm studio: no sideways overflow, chips and chords never break inside a word (${lang})`, async ({ page }) => {
    await seed(page, lang, 'keys');
    await openFamily(page, lang, 'k-tune');
    const open = page.locator('[data-reharm-studio="open"]');
    await open.scrollIntoViewIfNeeded();
    await open.click();
    const panel = page.locator('[data-reharm-studio="panel"]');
    await expect(panel).toBeVisible();
    await panel.scrollIntoViewIfNeeded();
    // Slice 8: the bars are on the shared chord chart, four a row; a tapped bar opens its devices in a sheet.
    const chart = panel.locator('[data-rh-chart]');
    await expect(chart).toBeVisible();
    await expect(chart.locator('.cc-row').first().locator('.cc-bar')).toHaveCount(4);
    const counts = async () => ((await chart.getAttribute('data-rh-devices')) ?? '').split(',').map(Number);
    for (let i = 0; i < 8 && !(await counts()).some((n) => n > 0); i++) await page.locator('[aria-label="Next bars"]').click();
    await panel.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await shot(page, `s8-reharm-chart-${lang}`);
    await chart.locator('.cc-bar').nth((await counts()).findIndex((n) => n > 0)).click();
    const sheet = page.locator('[data-rh-sheet]');
    await expect(sheet).toBeVisible();
    const r = await page.evaluate(() => {
      const el = document.querySelector('[data-reharm-studio="panel"]') as HTMLElement;
      const box = el.getBoundingClientRect();
      const inside = [...el.querySelectorAll('button, select, .cc-chord'), ...document.querySelectorAll('[data-rh-sheet] .chip')].every((b) => {
        const q = b.getBoundingClientRect();
        return q.left >= -1 && q.right <= innerWidth + 1;
      });
      // A chip on one line: its height is about one line of text (no letter-per-line wrap).
      const chips = [...document.querySelectorAll('[data-rh-sheet] .rh-devs .chip')].map((c) => (c as HTMLElement).getBoundingClientRect().height);
      const chords = [...el.querySelectorAll('.cc-chord')].map((c) => (c as HTMLElement).getBoundingClientRect().height);
      return { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, left: box.left, right: box.right, inside, chips, chords };
    });
    expect(r.wide).toBeLessThanOrEqual(1);
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(320);
    expect(r.inside).toBe(true);
    expect(r.chips.length).toBeGreaterThan(0);
    for (const h of r.chips) expect(h).toBeLessThan(44);
    for (const h of r.chords) expect(h).toBeLessThan(34);
    await page.waitForTimeout(500);
    await shot(page, `s8-reharm-sheet-${lang}`);
    await sheet.locator('[data-rh-device]').first().click();
    await expect(sheet).toHaveCount(0);
    await expect(chart.locator('.cc-tab.changed').first()).toBeVisible();
    await panel.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await shot(page, `jazz-reharm-panel-${lang}-after`);
  });
}

const openLevel = async (page: Page, lang: 'en' | 'he', family: string, level: string) => {
  await openFamily(page, lang, family);
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};
/** Play a take with the dev-only synthesized input (fakeTake.ts): the real analysis, no audio. */
const fakeTakeRun = async (page: Page, pattern: 'clean' | 'mixed' | 'weak') => {
  await page.evaluate((p) => ((window as unknown as { __fakeTake?: string }).__fakeTake = p), pattern);
  // the Play button reads the flag when it renders: re-render by toggling nothing — wait one frame
  await page.waitForTimeout(50);
  const speaker = page.locator('[data-drums-choice="speaker"]');
  if (await speaker.isVisible().catch(() => false)) await speaker.click();
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(700);
};
const RUNS: [Plays, string, string][] = [
  ['keys', 'scales', 'scales-1'],
  ['guitar', 'g-scales', 'g-scales-1'],
  ['drums', 'd-rock', 'd-rock-1'],
];
const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of RUNS)
    test(`marks after a take: two signals per note, v2 colours (${plays}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, plays);
      await openLevel(page, lang, family, level);
      // (VexFlow loads on first use: wait for the heads rather than a fixed time)
      await expect.poll(() => page.locator('.drill-staff .vf-notehead, .drill-staff .vf-tabnote, .dn-head, .dn-x, .dl-hit').count(), { timeout: 15_000 }).toBeGreaterThan(0);
      // the score is drawn (VexFlow staff / tab with heads, or the drum SVG), not an empty box
      const drawn = await page.evaluate(() => {
        const svg = document.querySelector('.drill-staff svg, .drum-score svg, svg.drum-lanes') as SVGSVGElement | null;
        const r = svg?.getBoundingClientRect();
        return { w: r?.width ?? 0, h: r?.height ?? 0, heads: document.querySelectorAll('.drill-staff .vf-notehead, .drill-staff .vf-tabnote, .dn-head, .dn-x, .dl-hit').length };
      });
      expect(drawn.heads).toBeGreaterThan(0);
      expect(drawn.w).toBeLessThanOrEqual(320);
      expect(drawn.h).toBeGreaterThan(30);
      await shot(page, `${plays}-run-before-${lang}`);
      await fakeTakeRun(page, 'mixed');
      // the marks are drawn (staff / tab layer or the drum SVG classes), never in green
      const r = await page.evaluate(() => {
        const marks = document.querySelectorAll('.mk-layer .mk, .dn.ok, .dn.early, .dn.late, .dn.wrong, .dn.missed, .dl-hit.ok, .dl-hit.wrong').length;
        const green = [...document.querySelectorAll('.drills-screen *')].some((e) => /rgb\((31, 143, 103|60, 207, 151|76, 208, 125)\)/.test(getComputedStyle(e).color + getComputedStyle(e).fill + getComputedStyle(e).backgroundColor));
        return { marks, green };
      });
      expect(r.marks).toBeGreaterThan(0);
      expect(r.green).toBe(false);
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, `${plays}-run-after-${lang}`);
      void overflow;
    });

type MidiWin = Window & { __keys: { name: string; onmidimessage: null | ((e: { data: Uint8Array; timeStamp: number }) => void) } };
/** A stub MIDI keyboard on Web MIDI (Chrome). */
const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null };
    (window as unknown as MidiWin).__keys = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), outputs: new Map(), onstatechange: null }) });
  });
/** Latin letters in visible text outside <bdi> / SVG (allowed: MIDI, note and chord names, ♩, numbers). */
const latinLeft = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const root = document.querySelector('main') ?? document.body;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const allow = /\b(MIDI|BPM|USB|[A-G](?:[♭♯#b])?(?:maj|min|m|dim|aug|sus|ø|°|add)?\d*(?:[♭♯#b]\d+)*)\b/g;
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('bdi, svg, [aria-hidden="true"], .sim-banner, script, style')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      const t = (n.textContent ?? '').replace(allow, '');
      if (/[A-Za-z]/.test(t)) out.push((n.textContent ?? '').trim());
    }
    return out;
  });

test('Hebrew drill screen with MIDI: the staff has note heads, the device has a Hebrew label, no English left', async ({ page }) => {
  await stubMidi(page);
  await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
  await seed(page, 'he', 'keys');
  await page.goto('/?unlock#/settings');
  await page.evaluate(async () => {
    const path = '/src/speech/midi.ts';
    const { midi } = await import(/* @vite-ignore */ path);
    await midi.enable();
  });
  await page.evaluate(() => (location.hash = '#/drills'));
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="scales"]').click();
  const card = page.locator('[data-level="scales-1"]');
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator('[data-level-start="scales-1"]').click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await expect(page.locator('.drill-staff .vf-stavenote').first()).toBeVisible();
  const box = await page.locator('.drill-staff svg').first().boundingBox();
  expect(box!.height).toBeGreaterThan(30);
  expect(box!.width).toBeLessThanOrEqual(320);
  await expect(page.locator('.input-check .ic-dev')).toContainText('מקלדת:');
  await expect(page.locator('.input-check .ic-dev bdi')).toHaveText('Test Keys');
  expect(await latinLeft(page)).toEqual([]);
  await shot(page, 'keys-midi-ready-he');
});

for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of RUNS)
    test(`the review fits one screen with Next visible (${plays}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, plays);
      await openLevel(page, lang, family, level);
      await fakeTakeRun(page, 'mixed');
      await expect(page.locator('[data-review]')).toBeVisible();
      const o = await overflow(page);
      expect(o.tall, 'review taller than the screen').toBeLessThanOrEqual(2);
      expect(o.wide).toBeLessThanOrEqual(1);
      const next = await page.locator('.take-review [data-next]').boundingBox();
      expect(next).not.toBeNull();
      expect(next!.y + next!.height).toBeLessThanOrEqual(720);
      // no jargon
      await expect(page.locator('.take-review')).not.toContainText(/CV R|vel SD/);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `${plays}-review-${lang}`);
      await page.locator('[data-why]').click();
      await expect(page.locator('[data-why-sheet]')).toBeVisible();
      await shot(page, `${plays}-why-${lang}`);
    });

test('a weak take is soft: the total and one suggestion, no chips', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'weak'));
  await seed(page, 'en', 'keys');
  await openLevel(page, 'en', 'scales', 'scales-1');
  await fakeTakeRun(page, 'weak');
  await expect(page.locator('[data-review][data-soft="1"]')).toBeVisible();
  await expect(page.locator('.tr-chips')).toHaveCount(0);
  await expect(page.locator('.tr-suggest')).toBeVisible();
  await shot(page, 'keys-review-weak-en');
});

for (const lang of ['en', 'he'] as const)
  test(`loop the spot: tap a bar, loop it at −10 % until 2 clean passes, back to the whole item (${lang})`, async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
    await seed(page, lang, 'keys');
    await openLevel(page, lang, 'scales', 'scales-1');
    await fakeTakeRun(page, 'mixed');
    await expect(page.locator('[data-error-map]')).toBeVisible();
    expect(await overflow(page)).toMatchObject({ wide: 0 });
    expect((await overflow(page)).tall).toBeLessThanOrEqual(2);
    await shot(page, `keys-errormap-${lang}`);
    await page.locator('.em-cell[data-bar="1"]').click();
    await expect(page.locator('.em-cell[data-bar="1"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-loop-start]')).toContainText('2');
    // the loop takes are clean
    await page.evaluate(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'clean'));
    await page.locator('[data-loop-start]').click();
    await expect(page.locator('[data-loop="2"]')).toBeVisible();
    await expect(page.locator('[data-loop-bar]')).toContainText('♩ 59');
    await expect(page.locator('[data-loop-passes="1"]')).toBeVisible();
    await shot(page, `keys-loop-${lang}`);
    expect((await overflow(page)).tall).toBeLessThanOrEqual(2);
    await page.locator('.take-review [data-again]').click();
    await expect(page.locator('[data-loop-passes="2"]')).toBeVisible();
    await page.locator('.take-review [data-next]').click();
    await expect(page.locator('[data-loop]')).toHaveCount(0);
    await expect(page.locator('[data-drill-play]')).toBeVisible();
  });

for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of [...RUNS, ['bass', 'b-pocket', 'b-pocket-1'] as [Plays, string, string]])
    test(`the score as hero: big heads / digits, tempo steps, one screen (${plays}, ${lang})`, async ({ page }) => {
      await seed(page, lang, plays, { headphones: false });
      await openLevel(page, lang, family, level);
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const heads = [...document.querySelectorAll('.drill-staff .vf-notehead')].map((e) => e.getBoundingClientRect().height);
        const digits = [...document.querySelectorAll('.drill-tab .guitar-tab svg text')].map((e) => e.getBoundingClientRect().height).filter((h) => h > 0);
        const drum = [...document.querySelectorAll('.dn-head, .dn-x, .dl-hit')].map((e) => e.getBoundingClientRect().height);
        return { head: heads.length ? Math.max(...heads) : 0, digit: digits.length ? Math.max(...digits) : 0, drum: drum.length ? Math.max(...drum) : 0, kicks: document.querySelectorAll('.tab-kick').length, chips: document.querySelectorAll('.tl-chip').length };
      });
      if (plays === 'keys') expect(r.head, 'note head px').toBeGreaterThanOrEqual(8);
      if (plays === 'guitar' || plays === 'bass') expect(r.digit, 'tab digit px').toBeGreaterThanOrEqual(10);
      if (plays === 'drums') expect(r.drum).toBeGreaterThanOrEqual(7);
      if (plays === 'bass') expect(r.kicks, 'kick marks under the tab').toBeGreaterThan(0);
      expect(r.chips).toBeGreaterThan(0);
      const o = await overflow(page);
      expect(o.tall).toBeLessThanOrEqual(2);
      expect(o.wide).toBeLessThanOrEqual(1);
      await expect(page.locator('[data-drums-gate]')).toHaveCount(0);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `${plays}-ready-${lang}`);
    });

// Slice 5: live marks and the pocket meter — the take played out in time (dev-only synthesized input, no audio).
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of [...RUNS, ['bass', 'b-pocket', 'b-pocket-1'] as [Plays, string, string]])
    test(`live marks and the pocket meter during the take, one screen (${plays}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed';
        (window as unknown as { __fakeLive?: number }).__fakeLive = 1.5;
      });
      await seed(page, lang, plays, { headphones: false });
      await openLevel(page, lang, family, level);
      await expect(page.locator('[data-pocket="ready"]')).toBeVisible();
      await page.locator('[data-drill-play]').click();
      // the count-in fills the beat cells, then the take runs
      await expect(page.locator('[data-pocket="count"]')).toBeVisible();
      await expect(page.locator('[data-pocket="play"]')).toBeVisible({ timeout: 10_000 });
      const liveSel = '.mk-live .mk, .drum-score .dn.ok, .drum-score .dn.early, .drum-score .dn.late, .drum-score .dn.wrong, .drum-score .dn.missed, .drum-score .dl-hit.ok';
      await expect.poll(() => page.locator(liveSel).count(), { timeout: 15_000 }).toBeGreaterThan(1);
      await expect(page.locator('[data-pocket="play"][data-pocket-mean]')).toBeVisible();
      // still playing: no review yet, the playhead on the score, and the screen fits
      await expect(page.locator('.drill-result')).toHaveCount(0);
      const o = await overflow(page);
      expect(o.tall, 'take taller than the screen').toBeLessThanOrEqual(2);
      expect(o.wide).toBeLessThanOrEqual(1);
      if (plays !== 'drums') await expect(page.locator('.staff-now').first()).toBeVisible();
      if (plays === 'drums') expect(Number(await page.locator('[data-pocket="play"]').getAttribute('data-pocket-rows'))).toBeGreaterThan(1);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s5-${plays}-live-${lang}`);
      // the take ends in the review, whose marks are the take's
      await expect(page.locator('.drill-result')).toBeVisible({ timeout: 40_000 });
      await expect(page.locator('.mk-live')).toHaveCount(0);
    });

test('live marks: "Never" in the drill settings keeps the take calm (the meter only)', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed';
    (window as unknown as { __fakeLive?: number }).__fakeLive = 2;
  });
  await seed(page, 'en', 'keys', { drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano', liveMarks: 'never' } });
  await openLevel(page, 'en', 'scales', 'scales-1');
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('[data-pocket="play"][data-pocket-mean]')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page.locator('.mk-live .mk')).toHaveCount(0);
});

// Slice 8: the chord chart (דף אקורדים) — four bars a row, chords in <bdi>, a rule's target under each chord before the
// take; after it a corner tab per bar and "Rules kept n/m bars"; one screen at 320×720.
const CHARTS: [Plays, string, string][] = [
  ['keys', 'k-solo', 'k-solo-1'],
  ['guitar', 'g-solo', 'g-solo-1'],
  ['bass', 'b-solo', 'b-solo-2'],
  ['bass', 'b-walk', 'b-walk-7'],
];
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of CHARTS)
    test(`the chord chart: four a row, targets, corner tabs after the take, one screen (${plays} ${level}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, plays, { headphones: false, drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both' } });
      await openLevel(page, lang, family, level);
      const chart = page.locator('[data-chord-chart]').first();
      await expect(chart).toBeVisible();
      await expect(chart).toHaveAttribute('aria-label', lang === 'he' ? 'דף אקורדים' : 'Chord chart');
      const g = await chart.evaluate((el) => {
        const row = el.querySelector('.cc-row')!;
        const cells = [...row.querySelectorAll('.cc-bar')].map((c) => c.getBoundingClientRect());
        const chords = [...el.querySelectorAll('.cc-chord')];
        return { n: cells.length, w: cells.map((c) => c.width), inBdi: chords.every((c) => c.tagName === 'BDI'), chords: chords.length, targets: el.querySelectorAll('.cc-sub.target').length, right: el.getBoundingClientRect().right };
      });
      expect(g.n).toBe(4);
      for (const w of g.w) expect(w, 'bar cell width').toBeGreaterThanOrEqual(52);
      expect(g.inBdi).toBe(true);
      expect(g.chords).toBeGreaterThan(0);
      expect(g.right).toBeLessThanOrEqual(320);
      if (level !== 'b-walk-7') expect(g.targets + (await page.locator('[data-rule-n]').count())).toBeGreaterThan(0);
      if (family === 'k-solo' || family === 'g-solo') expect(g.targets, 'guide-tone targets under the chords').toBeGreaterThan(0);
      let o = await overflow(page);
      expect(o.tall).toBeLessThanOrEqual(2);
      expect(o.wide).toBeLessThanOrEqual(1);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s8-${plays}-${level}-before-${lang}`);
      await fakeTakeRun(page, 'mixed');
      if (level !== 'b-walk-7') {
        await expect(page.locator('[data-rule-chart] .cc-tab').first()).toBeVisible();
        await expect(page.locator('[data-rules-kept]')).toBeVisible();
      }
      o = await overflow(page);
      expect(o.tall, 'review taller than the screen').toBeLessThanOrEqual(2);
      const next = await page.locator('.take-review [data-next]').boundingBox();
      expect(next!.y + next!.height).toBeLessThanOrEqual(720);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s8-${plays}-${level}-after-${lang}`);
    });

// ───────────────────────────── slice 5, the rest ─────────────────────────────
const liveInit = (speed: number) => async (page: Page) =>
  page.addInitScript((s) => {
    (window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed';
    (window as unknown as { __fakeLive?: number }).__fakeLive = s;
  }, speed);
const fits = async (page: Page, what: string) => {
  const o = await overflow(page);
  expect(o.tall, `${what}: taller than the screen`).toBeLessThanOrEqual(2);
  expect(o.wide, `${what}: sideways`).toBeLessThanOrEqual(1);
};

// The count-in: the first note head (tab digit, drum head) pulses once; gone once the take runs.
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of [...RUNS, ['bass', 'b-pocket', 'b-pocket-1'] as [Plays, string, string]])
    test(`count-in: the first note head pulses (${plays}, ${lang})`, async ({ page }) => {
      await liveInit(0.5)(page);
      await seed(page, lang, plays, { headphones: false });
      await openLevel(page, lang, family, level);
      await expect(page.locator('.mk-cue')).toHaveCount(0);
      await page.locator('[data-drill-play]').click();
      await expect(page.locator('[data-pocket="count"]')).toBeVisible();
      await expect(page.locator('.mk-cue').first()).toBeVisible();
      const box = await page.locator('.mk-cue').first().boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
      await fits(page, 'count-in');
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s5-cue-${plays}-${lang}`);
      await expect(page.locator('[data-pocket="play"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.mk-cue')).toHaveCount(0);
    });

// Hands together: the ⇆ chip between the R and L rows of the meter, only when the hands are > 30 ms apart.
for (const lang of ['en', 'he'] as const)
  test(`hands together: the ⇆ chip in the pocket meter (keys scales-3, ${lang})`, async ({ page }) => {
    await liveInit(1.5)(page);
    await seed(page, lang, 'keys');
    await openLevel(page, lang, 'scales', 'scales-3');
    await page.locator('[data-drill-play]').click();
    await expect(page.locator('[data-pocket="play"][data-pocket-rows="2"]')).toBeVisible({ timeout: 15_000 });
    const chip = page.locator('.pocket [data-hands]');
    await expect(chip).toBeVisible({ timeout: 20_000 });
    expect(Number(await chip.getAttribute('data-hands'))).toBeGreaterThan(30);
    const b = await chip.boundingBox();
    expect(b!.x + b!.width).toBeLessThanOrEqual(320);
    await fits(page, 'hands chip');
    if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
    await shot(page, `s5-hands-keys-${lang}`);
  });

// Velocity bars: only on loudness / accent goals; hollow targets before the take, bars filling as it is played.
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of [
    ['keys', 'control', 'control-3'],
    ['drums', 'd-strokes', 'd-strokes-1'],
  ] as [Plays, string, string][])
    test(`velocity bars under the score (${plays} ${level}, ${lang})`, async ({ page }) => {
      await liveInit(1.5)(page);
      await seed(page, lang, plays, { headphones: false });
      await openLevel(page, lang, family, level);
      const vb = page.locator('[data-vel-bars]');
      await expect(vb).toBeVisible();
      expect(await vb.getAttribute('data-vel-played')).toBe('0');
      if (plays === 'keys') expect(await vb.locator('.vb-target').count()).toBeGreaterThan(0);
      await fits(page, 'velocity before');
      await page.locator('[data-drill-play]').click();
      await expect.poll(async () => Number(await vb.getAttribute('data-vel-played')), { timeout: 20_000 }).toBeGreaterThan(1);
      await fits(page, 'velocity during');
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s5-velocity-${plays}-${lang}`);
    });
test('velocity bars stay hidden on an item without a loudness goal', async ({ page }) => {
  await seed(page, 'en', 'keys');
  await openLevel(page, 'en', 'scales', 'scales-1');
  await expect(page.locator('[data-pocket="ready"]')).toBeVisible();
  await expect(page.locator('[data-vel-bars]')).toHaveCount(0);
});

// The take overlay: after a second take of the same item, "Last take" draws the previous take's ticks faded.
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of [...RUNS, ['bass', 'b-pocket', 'b-pocket-1'] as [Plays, string, string]])
    test(`last take: the previous take's ticks under this one's (${plays}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, plays, { headphones: false });
      await openLevel(page, lang, family, level);
      await fakeTakeRun(page, 'mixed');
      await expect(page.locator('[data-last-take]')).toHaveCount(0);
      await page.locator('.take-review [data-again]').click();
      // (a drum item without a kit doesn't start by itself: the dev take needs one more press)
      await page.waitForTimeout(400);
      if (await page.locator('[data-drill-play]').isVisible().catch(() => false)) await page.locator('[data-drill-play]').click();
      await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
      const toggle = page.locator('[data-last-take]');
      await expect(toggle).toHaveAttribute('data-last-take', 'off');
      await expect(page.locator('.mk-prior, [data-prior]')).toHaveCount(0);
      await toggle.click();
      await expect(toggle).toHaveAttribute('data-last-take', 'on');
      await expect.poll(() => page.locator('.mk-prior .mk-tick, [data-prior]').count()).toBeGreaterThan(0);
      await fits(page, 'review with the last take');
      const next = await page.locator('.take-review [data-next]').boundingBox();
      expect(next!.y + next!.height).toBeLessThanOrEqual(720);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s5-lasttake-${plays}-${lang}`);
    });

// ───────────────────────────── slice 8, the rest ─────────────────────────────
// Note roles: while a rule-card take runs, a dot a note under the bar (chord tone / tension / outside).
for (const lang of ['en', 'he'] as const)
  for (const [plays, family, level] of CHARTS.filter(([, , l]) => l !== 'b-walk-7'))
    test(`note-role dots on the chart while the take runs (${plays} ${level}, ${lang})`, async ({ page }) => {
      await liveInit(1.5)(page);
      await seed(page, lang, plays, { jazzFocus: [plays], headphones: false, drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both' } });
      await openLevel(page, lang, family, level);
      await expect(page.locator('.cc-dot')).toHaveCount(0);
      const speaker = page.locator('[data-drums-choice="speaker"]');
      if (await speaker.isVisible().catch(() => false)) await speaker.click();
      await page.locator('[data-drill-play]').click();
      await expect.poll(() => page.locator('[data-chord-chart] .cc-dot').count(), { timeout: 20_000 }).toBeGreaterThan(0);
      const roles = await page.locator('[data-chord-chart] .cc-dots').first().getAttribute('data-dots');
      expect(roles!.split(' ').every((r) => ['chord', 'tension', 'outside'].includes(r))).toBe(true);
      await fits(page, 'note roles');
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `s8-roles-${plays}-${level}-${lang}`);
      await expect(page.locator('.drill-result')).toBeVisible({ timeout: 40_000 });
      await expect(page.locator('.cc-dot')).toHaveCount(0);
    });

// The chart player on the shared chart: four a row, the bar being played lit, no sideways scroll.
for (const lang of ['en', 'he'] as const)
  test(`the chart player uses the shared chord chart (${lang})`, async ({ page }) => {
    await seed(page, lang, 'keys');
    await page.goto(`/?unlock=all&sim=1&lang=${lang}#/charts`);
    await page.locator('[data-chart-template]').first().click();
    const chart = page.locator('[data-chart-player] [data-chord-chart]');
    await expect(chart).toBeVisible();
    expect(await chart.locator('.cc-row').first().locator('.cc-bar').count()).toBeLessThanOrEqual(4);
    expect(await chart.locator('.cc-chord').evaluateAll((els) => els.every((e) => e.tagName === 'BDI'))).toBe(true);
    await page.locator('[data-chart-play]').click();
    await expect(chart.locator('.cc-bar.now')).toBeVisible({ timeout: 15_000 });
    expect((await overflow(page)).wide).toBeLessThanOrEqual(1);
    await chart.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
    await shot(page, `s8-chart-player-${lang}`);
    await page.locator('[data-chart-stop]').click();
  });

// The improvisation studio: the modes as one segmented control (short labels on one line), challenge levels as waveform bars.
for (const lang of ['en', 'he'] as const)
  test(`the improv studio: a segmented control and waveform levels (${lang})`, async ({ page }) => {
    await seed(page, lang, 'keys');
    await page.goto(`/?unlock=all&lang=${lang}#/improv`);
    const seg = page.locator('.is-seg');
    await expect(seg).toBeVisible();
    const g = await seg.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const bs = [...el.querySelectorAll('button')].map((b) => ({ h: b.getBoundingClientRect().height, over: b.scrollWidth > b.clientWidth + 1 }));
      return { right: r.right, left: r.left, bs };
    });
    expect(g.bs.length).toBeGreaterThanOrEqual(4);
    expect(g.left).toBeGreaterThanOrEqual(0);
    expect(g.right).toBeLessThanOrEqual(320);
    for (const b of g.bs) {
      expect(b.h, 'one line').toBeLessThan(48);
      expect(b.over, 'label fits').toBe(false);
    }
    await expect(page.locator('.ir-wave').first()).toBeVisible();
    expect(await page.locator('.ir-level').count()).toBe(0);
    expect((await overflow(page)).wide).toBeLessThanOrEqual(1);
    if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
    await shot(page, `s8-improv-studio-${lang}`);
    await page.locator('[data-is-mode="trade"]').click();
    await expect(page.locator('[data-is-mode="trade"]')).toHaveAttribute('aria-selected', 'true');
  });

// Hands together, one screen: the first hands-together level of every keys family, and the two-voice pieces. One
// system at a time (RH + LH of the same bar on a phone, paged), no staff card scrolled away inside the score box or
// covered by the pocket meter, heads at 9 px or more, at 320×720. In groups of five, each walk with its own time budget.
const HT_LEVELS: [string, string][] = [
  ['k-first', 'k-first-2'], ['scales', 'scales-3'], ['arpeggios', 'arpeggios-3'], ['cadences', 'cadences-1'], ['fingers', 'fingers-2'],
  ['control', 'control-7'], ['advanced', 'advanced-2'], ['k-sixdim', 'k-sixdim-3'], ['voicings', 'voicings-9'], ['k-reharm', 'k-reharm-1'],
  ['k-theory', 'k-theory-2'], ['jazz', 'jazz-4'], ['k-bebop', 'k-bebop-7'], ['accomp', 'accomp-6'], ['k-rhythm', 'k-rhythm-1'],
  ['k-indep', 'k-indep-4'], ['k-sharm', 'k-sharm-13'], ['k-tune', 'k-tune-5'], ['k-ctx', 'k-ctx-12'], ['k-harrisline', 'k-harrisline-8'],
  ['k-ctone', 'k-ctone-4'], ['k-mediant', 'k-mediant-6'], ['k-organ', 'k-organ-1'], ['k-tex', 'k-tex-1'], ['k-read', 'k-read-4'],
  ['k-classic', 'k-classic-2'], ['k-classic', 'k-classic-6'], ['k-read', 'k-read-11'],
];
/** The drawn head size (px) of each staff on screen: one staff space (10 units) at the SVG's real scale (it meets its box). */
const staffHeads = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.drill-staff .note-staff svg')].map((svg) => {
      const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
      const r = svg.getBoundingClientRect();
      return Math.min(r.width / vb[2], r.height / vb[3]) * 10;
    }),
  );
const HT_GROUPS = Array.from({ length: Math.ceil(HT_LEVELS.length / 5) }, (_, g) => HT_LEVELS.slice(g * 5, g * 5 + 5));
for (const lang of ['en', 'he'] as const)
  HT_GROUPS.forEach((group, gi) =>
    test(`hands together: one system, heads ≥ 9 px, nothing covered or scrolled away (group ${gi + 1}: ${group.map((x) => x[1]).join(' ')}, ${lang})`, async ({ page }) => {
      test.setTimeout(360_000);
      await seed(page, lang, 'keys');
      const checked: string[] = [];
      for (const [family, level] of group) {
        await page.goto('about:blank');
        await page.goto(`/?unlock=all&lang=${lang}#/drills`);
        await page.locator('[data-topic="all"]').click();
        const fam = page.locator(`[data-family="${family}"]`);
        // (a family hidden in this build, e.g. by the verified-content gate, is skipped)
        if (!(await fam.isVisible({ timeout: 3000 }).catch(() => false))) continue;
        await fam.click();
        const card = page.locator(`[data-level="${level}"]`);
        if (!(await card.count())) continue;
        await card.scrollIntoViewIfNeeded();
        if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
        const start = page.locator(`[data-level-start="${level}"]`);
        if (!(await start.isVisible({ timeout: 3000 }).catch(() => false))) continue;
        await start.click();
        await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
        if (!(await page.locator('[data-drills="run"]').isVisible({ timeout: 8000 }).catch(() => false))) continue;
        await page.waitForTimeout(700);
        const g = await page.evaluate(() => {
          const banner = document.querySelector('.sim-banner') as HTMLElement | null;
          if (banner) banner.style.display = 'none';
          const box = document.querySelector('.drill-staff') as HTMLElement | null;
          const pocket = document.querySelector('.pocket') as HTMLElement | null;
          const cards = [...document.querySelectorAll('.drill-staff .note-staff')].map((e) => e.getBoundingClientRect());
          return {
            ht: !!document.querySelector('.drill-staff.ht'),
            cards: cards.length,
            inner: box ? box.scrollHeight - box.clientHeight : 0,
            boxBottom: box ? box.getBoundingClientRect().bottom : 0,
            lowest: cards.length ? Math.max(...cards.map((c) => c.bottom)) : 0,
            pocketTop: pocket ? pocket.getBoundingClientRect().top : 9999,
            tall: document.scrollingElement!.scrollHeight - innerHeight,
          };
        });
        if (!g.cards) continue;
        checked.push(level);
        expect(g.inner, `${level}: staff cards scroll inside the score box`).toBeLessThanOrEqual(2);
        expect(g.lowest, `${level}: a staff card is cut off by the score box`).toBeLessThanOrEqual(g.boxBottom + 1);
        expect(g.lowest, `${level}: a staff card is covered by the meter`).toBeLessThanOrEqual(g.pocketTop + 1);
        expect(g.tall, `${level}: taller than the screen`).toBeLessThanOrEqual(2);
        if (g.ht) {
          const heads = await staffHeads(page);
          expect(Math.min(...heads), `${level}: heads ${heads.map((x) => x.toFixed(1)).join('/')} px`).toBeGreaterThanOrEqual(8.95);
        }
        if (level === 'scales-3') await shot(page, `s5-hands-together-${lang}`);
        if (level === 'k-classic-6') await shot(page, `ht-prelude-${lang}`);
      }
      expect(checked.length, `checked ${checked.join(', ')}`).toBeGreaterThanOrEqual(Math.min(2, group.length));
    }),
  );

// The two-voice pieces after a take: heads still ≥ 9 px, the review on the same screen with Next visible.
for (const lang of ['en', 'he'] as const)
  for (const [family, level] of [['k-classic', 'k-classic-2'], ['k-classic', 'k-classic-6'], ['k-read', 'k-read-11']] as const)
    test(`hands together review: heads ≥ 9 px, one screen, Next visible (${level}, ${lang})`, async ({ page }) => {
      await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'mixed'));
      await seed(page, lang, 'keys');
      await openLevel(page, lang, family, level);
      await page.waitForTimeout(600);
      for (const h of await staffHeads(page)) expect(h, 'before').toBeGreaterThanOrEqual(8.95);
      await fakeTakeRun(page, 'mixed');
      for (const h of await staffHeads(page)) expect(h, 'review').toBeGreaterThanOrEqual(8.95);
      const o = await overflow(page);
      expect(o.tall, 'review taller than the screen').toBeLessThanOrEqual(2);
      const next = await page.locator('.take-review [data-next]').boundingBox();
      expect(next!.y + next!.height).toBeLessThanOrEqual(720);
      if (lang === 'he') expect(await latinLeft(page)).toEqual([]);
      await shot(page, `ht-review-${level}-${lang}`);
    });

// The piece coach's grand staff: one bar a system on a phone, heads ≥ 9 px (Minuet in G, Prelude in C).
for (const lang of ['en', 'he'] as const)
  test(`piece coach: the grand staff's heads ≥ 9 px on a phone (${lang})`, async ({ page }) => {
    await seed(page, lang, 'keys');
    for (const id of ['minuet-g', 'prelude-c']) {
      await page.goto('about:blank');
      await page.goto(`/?unlock=all&lang=${lang}#/pieces`);
      await page.locator(`[data-pd-piece="${id}"]`).click();
      // the setup page: start practising
      await page.getByRole('button', { name: /start|begin|להתחיל/i }).last().click({ timeout: 5000 }).catch(() => {});
      const svg = page.locator('[data-score] svg').first();
      await expect(svg).toBeVisible();
      await page.waitForTimeout(400);
      const h = await svg.evaluate((s) => {
        const vb = s.getAttribute('viewBox')!.split(' ').map(Number);
        const r = s.getBoundingClientRect();
        return Math.min(r.width / vb[2], r.height / vb[3]) * 10;
      });
      expect(h, `${id} heads px`).toBeGreaterThanOrEqual(8.95);
      expect((await overflow(page)).wide).toBeLessThanOrEqual(1);
      await shot(page, `coach-${id}-${lang}`);
    }
  });
