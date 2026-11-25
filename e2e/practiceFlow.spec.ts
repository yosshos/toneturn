import { expect, test, type Page } from '@playwright/test';

// Owner 2026-11-25: practice IS continuous — no "Continuous practice" button or switch anywhere; opening a family or a
// key, its main action simply practises it, each take flowing into the next (a brief only when the kind of task
// changes). A player can stop in the middle (Back, a reload, the app closed) and the same day it continues exactly where
// it stopped: the same stage / step, tempo and note value, the takes so far — "Continue where you stopped".
test.describe.configure({ timeout: 300_000 });
// the "You seem above this unit" sheet may open over any screen: dismissed whenever it shows
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('[data-recal]'), async () => {
    await page.locator('[data-recal] .btn.ghost').click();
  });
});

/** The coach's saved runs for today (storage/coachRun.ts). */
const savedRuns = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('toneturn.coachRun.v1') ?? '[]') as { key: string; takes: number }[]);

/**
 * Drive the coach: skip demos, press Ready on a brief, until `lines` coach lines after takes were seen. Returns the
 * briefs (their text) and the lines; asserts the flow itself needs no other tap.
 */
async function drive(page: Page, lines: number, max = 200) {
  const demo = page.locator('[data-coach-skip-demo]');
  const seen: string[] = [];
  const briefs: string[] = [];
  let lastTakes = -1;
  for (let k = 0; k < max && seen.length < lines; k++) {
    if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
    const ready = page.locator('[data-brief-ready]');
    if (await ready.isVisible().catch(() => false)) {
      briefs.push(((await page.locator('[data-task-brief] .tb-what').textContent().catch(() => '')) ?? '').trim());
      await ready.click().catch(() => {});
    }
    const takes = Number((await page.locator('[data-coach-bar]').getAttribute('data-coach-takes').catch(() => null)) ?? -1);
    if ((await page.locator('[data-coach-line="1"]').count()) > 0 && takes !== lastTakes) {
      lastTakes = takes;
      seen.push(((await page.locator('.coach-line').textContent().catch(() => '')) ?? '').trim());
    }
    await page.waitForTimeout(250);
  }
  return { lines: seen, briefs };
}

/** Hold the session on a result (the coach's state has moved on to the next take) and read where it stands. */
async function holdOnResult(page: Page) {
  // a new kind of take may wait on its brief (Ready) or a demo first: keep it moving until a result is up, then pause
  await expect
    .poll(
      async () => {
        // the result shows ~2 s: click its Pause while it is there (a short try), else keep the flow moving
        if (await page.locator('[data-coach-pause="running"]').click({ timeout: 800 }).then(() => true, () => false)) return true;
        const ready = page.locator('[data-brief-ready]');
        if (await ready.isVisible().catch(() => false)) await ready.click().catch(() => {});
        const demo = page.locator('[data-coach-skip-demo]');
        if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
        return false;
      },
      { timeout: 60_000, intervals: [150] },
    )
    .toBe(true);
  await expect(page.locator('[data-coach-pause="paused"]')).toBeVisible();
  const bar = page.locator('[data-coach-bar]');
  return { at: await bar.getAttribute('data-coach-at'), takes: Number(await bar.getAttribute('data-coach-takes')) };
}

for (const lang of ['en', 'he'] as const)
test(`no "Continuous practice" button: the family and the key simply practise (${lang})`, async ({ page }) => {
  {
    await page.goto(`/?unlock=all&lang=${lang}#/drills`);
    await page.locator('[data-practice-view="topic"]').click().catch(() => {});
    await page.locator('[data-family="scales"]').click();
    const entry = page.locator('[data-coach-open="scales"]');
    await expect(entry).toBeVisible();
    await expect(entry).toContainText(lang === 'en' ? 'Practise' : 'לתרגל');
    await expect(page.locator('main')).not.toContainText(/Continuous practice|אימון רציף|תרגול רציף/);
    await page.locator('.screen-head .icon-btn').first().click();
    await page.locator('[data-practice-view="key"]').click();
    await expect(page.locator('[data-key-grid]')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/Continuous practice|אימון רציף|תרגול רציף/);
    await page.locator('[data-key-card="0"]').click();
    await expect(page.locator('[data-key-session="0"]')).toContainText(lang === 'en' ? 'Practise' : 'לתרגל');
    await expect(page.locator('main')).not.toContainText(/Continuous practice|אימון רציף|תרגול רציף/);
    await page.locator('[data-key-session="0"]').click();
    await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-coach-intro]')).not.toContainText(/Continuous practice|אימון רציף/);
  }
});

test('key session: takes flow with no tap between takes of one task; stopped and reloaded, it continues at the same stage and tempo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=en#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-coach-intro]')).not.toHaveAttribute('data-coach-resume', '1');
  await page.locator('[data-coach-start]').click();
  const { lines, briefs } = await drive(page, 5);
  expect(lines.length).toBeGreaterThanOrEqual(5);
  // a brief only when the kind of task changes: never the same brief twice in a row, and fewer briefs than takes
  for (let k = 1; k < briefs.length; k++) expect(briefs[k]).not.toBe(briefs[k - 1]);
  expect(briefs.length).toBeLessThan(lines.length);
  await expect(page.locator('.take-review')).toHaveCount(0);
  const before = await holdOnResult(page);
  expect(before.takes).toBeGreaterThan(0);
  expect((await savedRuns(page)).find((r) => r.key === 'key:piano:major:0')?.takes).toBe(before.takes);

  // a reload lands back on the run: "Continue where you stopped", the same place, the takes so far
  await page.reload();
  const intro = page.locator('[data-coach-intro]');
  await expect(intro).toBeVisible({ timeout: 20_000 });
  await expect(intro).toHaveAttribute('data-coach-resume', '1');
  await expect(intro).toContainText('Continue where you stopped');
  await expect(intro).toHaveAttribute('data-coach-at', before.at!);
  expect(Number(await page.locator('[data-coach-resume-takes]').getAttribute('data-coach-resume-takes'))).toBe(before.takes);
  await page.locator('[data-coach-start]').click();
  // it goes on from there: the takes count on from the saved ones
  await drive(page, 2);
  const after = await holdOnResult(page);
  expect(after.takes).toBeGreaterThan(before.takes);

  // Back: the key page offers to continue (the primary button), and opening it continues again
  await page.locator('.screen-head .icon-btn').first().click();
  const entry = page.locator('[data-key-session="0"]');
  await expect(entry).toHaveAttribute('data-coach-resume', '1');
  await expect(entry).toContainText('Continue where you stopped');
  await entry.click();
  await expect(page.locator('[data-coach-intro]')).toHaveAttribute('data-coach-at', after.at!);
});

test('family coach: stopped with Back, it continues from the family page; Start over begins a new session', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=he#/drills');
  await page.locator('[data-practice-view="topic"]').click().catch(() => {});
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  await drive(page, 3);
  const before = await holdOnResult(page);
  await page.locator('.screen-head .icon-btn').first().click();
  const entry = page.locator('[data-coach-open="scales"]');
  await expect(entry).toHaveAttribute('data-coach-resume', '1');
  await expect(entry).toContainText('להמשיך מאיפה שעצרתם');
  // closing the app and opening it again: still there
  await page.reload();
  await page.locator('[data-practice-view="topic"]').click().catch(() => {});
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  const intro = page.locator('[data-coach-intro]');
  await expect(intro).toHaveAttribute('data-coach-resume', '1');
  await expect(intro).toHaveAttribute('data-coach-at', before.at!);
  await expect(intro).toContainText('ממשיכים מאיפה שעצרתם');
  // Start over: a new session (no resume line), and the takes count from zero
  await page.locator('[data-coach-fresh]').click();
  await expect(intro).not.toHaveAttribute('data-coach-resume', '1');
  await expect(page.locator('[data-coach-resume-takes]')).toHaveCount(0);
});

test("today's session: the technique block stopped by a reload continues where it stopped", async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: today }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: 'en', inputLang: 'en', outputLang: 'en', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', miniLessons: false, dailyMinutes: 30, intake: { v: 1, at: now.toISOString(), music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 30, goal: 'general', leaveOut: [], packs: [], noSing: true, noMic: true }, courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { keys: { legacy: true } }, drills };
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
    const blocks = [{ id: 'f1', target: { kind: 'family', family: 'scales' }, minutes: 20 }, { id: 'p2', target: { kind: 'practice' }, minutes: 10 }];
    const run = { day: today, blocks, at: 0, used: {}, steps: [], items: {}, id: `${today}:keys:e2e`, course: 'keys', focus: 'plan', planned: 30 };
    localStorage.setItem('toneturn.slots.v1', JSON.stringify([{ key: `workout:${today}:keys`, title: 'x', route: 'home', done: 0, total: 2, data: run, savedAt: now.toISOString() }]));
  });
  await page.goto('/?unlock=all#/workoutrun');
  await expect(page.locator('[data-wk-go="go"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-wk-go]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-coach-start]').click();
  await drive(page, 3);
  const before = await holdOnResult(page);
  // a family block shares the family's own run (stopping here continues on the family page too)
  expect((await savedRuns(page)).some((r) => r.key === 'fam:piano:scales' && r.takes === before.takes)).toBe(true);
  // the reload comes back to the session (not the technique hub): its block continues where it stopped
  await page.reload();
  const go = page.locator('[data-wk-go="resume"]');
  await expect(go).toBeVisible({ timeout: 20_000 });
  await expect(go).toContainText('Continue where you stopped');
  await go.click();
  const intro = page.locator('[data-coach-intro]');
  await expect(intro).toHaveAttribute('data-coach-resume', '1');
  await expect(intro).toHaveAttribute('data-coach-at', before.at!);
  await page.locator('[data-coach-start]').click();
  await drive(page, 1);
  expect(Number(await page.locator('[data-coach-bar]').getAttribute('data-coach-takes'))).toBeGreaterThan(before.takes);
});

test('a saved run the app can no longer play (content changed) is dropped: a fresh session, never a blank screen', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('/?unlock=all&lang=en#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await page.locator('[data-coach-start]').click();
  await drive(page, 2);
  await holdOnResult(page);
  // reload on the run (it reopens from the save), after the save's ladder was broken
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('toneturn.coachRun.v1') ?? '[]');
    for (const r of l) for (const lv of r.fam.levels) for (const sp of lv.specs) sp.kind = 'no-such-kind-xyz';
    localStorage.setItem('toneturn.coachRun.v1', JSON.stringify(l));
  });
  await page.reload();
  const intro = page.locator('[data-coach-intro]');
  await expect(intro).toBeVisible({ timeout: 20_000 });
  await expect(intro).not.toHaveAttribute('data-coach-resume', '1');
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('toneturn.coachRun.v1') ?? '[]') as unknown[])).length).toBe(0);
  await page.locator('[data-coach-start]').click();
  await drive(page, 1);
  expect(errs).toEqual([]);
});

test('licks: the next take follows by itself (hands-free), no button between takes', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?sim=1&unlock=all&handsfree=1&lang=en#/licks');
  await page.locator('[data-lick-tab="minor-251"]').click();
  await page.locator('[data-lick-card="min-arp"]').click();
  await page.locator('[data-lick-practice]').click();
  await expect(page.locator('[data-lick-run="practice"]')).toBeVisible();
  await page.locator('[data-drill-play]').click();
  // takes follow one another with no click: the list moves on by itself (the counter "n / N" climbs)
  await expect
    .poll(async () => Number(((await page.locator('.lk-run .drill-goal').textContent().catch(() => '')) ?? '').trim().split('/')[0]), { timeout: 90_000, intervals: [300] })
    .toBeGreaterThanOrEqual(3);
});
