import { expect, test, type Page } from '@playwright/test';

// Drums course v1 (DRUMS_CURRICULUM): the course in onboarding, its Technique (kit card, families, notation / lanes,
// one screen per drill), the kit wizard with a stub e-kit, a measured MIDI take, practice-pad (mic) mode, the path,
// Practice and the Highway kit lanes.

type Win = Window & { __kit: { onmidimessage: null | ((e: { data: Uint8Array; timeStamp: number }) => void) } };

/** A stub e-kit on Web MIDI (Chrome). */
const stubKit = async (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Kit', onmidimessage: null };
    (window as unknown as Win).__kit = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
const hit = (page: Page, note: number, vel = 90, status = 0x99) =>
  page.evaluate(([n, v, st]) => (window as unknown as Win).__kit.onmidimessage?.({ data: new Uint8Array([st, n, v]), timeStamp: performance.now() }), [note, vel, status]);

/** A returning player in the drums course (onboarding done), optionally with a kit set up. */
const seed = async (page: Page, o: { kit?: object; view?: 'staff' | 'lanes'; lang?: 'en' | 'he' } = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async ({ kit, view, lang }) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'drums'], activeCourse: 'drums', seenVersion: '9.9.9', drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'drums', drumView: view }, ...(kit ? { drumKit: kit } : {}) };
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
  }, { kit: o.kit ?? null, view: o.view ?? 'staff', lang: o.lang ?? 'en' });
};
const fitsScreen = async (page: Page) => {
  const h = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
  expect(h).toBeLessThanOrEqual(4);
};
const openLevel = async (page: Page, family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto('/?unlock#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

test.describe('drums course', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('onboarding offers the drums course in the course grid (one screen)', async ({ page }) => {
    await page.goto('/?sim=1&welcome=1&lang=en');
    await page.locator('[data-ob="start"]').click();
    await page.locator('[data-ob="listen"]').click();
    await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
    await page.locator('[data-ob="taste-0"]').click();
    await page.locator('[data-ob="taste-next"]').click();
    await expect(page.locator('[data-ob="course-drums"]')).toBeVisible();
    await page.locator('[data-ob="course-drums"]').click();
    await expect(page.locator('[data-ob="course-drums"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ob="course-bass"]')).toHaveCount(0);
    await page.locator('[data-ob="courses-next"]').click();
    // SPEC-COURSE-START: the drums course opens with its welcome card (no placement).
    await expect(page.locator('[data-course-start="welcome"][data-cs-course="drums"]')).toBeVisible();
  });

  test('Technique: kit card, drum topics and families, no songs or keys; a groove drill on one screen in notation and lanes', async ({ page }) => {
    await seed(page);
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-kit-card="none"]')).toBeVisible();
    for (const t of ['hands', 'time', 'grooves', 'reading']) await expect(page.locator(`[data-topic="${t}"]`)).toBeVisible();
    await expect(page.locator('[data-topic="songs"]')).toHaveCount(0);
    await expect(page.locator('[data-inst]')).toHaveCount(0);
    for (const f of ['d-strokes', 'd-rolls', 'd-diddles', 'd-time', 'd-rock', 'd-fills', 'd-read']) await expect(page.locator(`[data-family="${f}"]`)).toBeVisible();
    await openLevel(page, 'd-rock', 'd-rock-3');
    await expect(page.locator('.drum-score[data-drum-view="staff"] svg.drum-staff').first()).toBeVisible();
    // No e-kit here: a groove is MIDI-only (measured practice), the play button waits for a kit.
    await expect(page.locator('[data-drum-needs-kit]')).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toBeDisabled();
    await fitsScreen(page);
    await seed(page, { view: 'lanes' });
    await openLevel(page, 'd-fills', 'd-fills-3');
    await expect(page.locator('.drum-score[data-drum-view="lanes"] svg.drum-lanes').first()).toBeVisible();
    await fitsScreen(page);
  });

  test('a single-surface drill plays by microphone (practice pad); reading is always notation', async ({ page }) => {
    await seed(page, { view: 'lanes', kit: { preset: 'gm', map: {}, mic: true, done: true } });
    await openLevel(page, 'd-read', 'd-read-1');
    await expect(page.locator('.drum-score[data-drum-view="staff"]')).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toBeEnabled();
    await fitsScreen(page);
    // Pad mode: the kit-only topics are not offered.
    await page.goto('about:blank');
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-kit-card="ready"]')).toBeVisible();
    await expect(page.locator('[data-topic="grooves"]')).toHaveCount(0);
    await expect(page.locator('[data-family="d-strokes"]')).toBeVisible();
  });

  test('kit wizard with a stub e-kit: connect, learn the pads, skip the optional ones', async ({ page }) => {
    await stubKit(page);
    await seed(page);
    await page.goto('/?unlock#/drills');
    await page.locator('[data-kit-setup]').click();
    await expect(page.locator('[data-kit-phones]')).toBeVisible();
    await page.locator('[data-kit-connect]').click();
    await expect(page.locator('[data-kit-step="map"]')).toBeVisible();
    await expect(page.locator('[data-kit-pad-now="snare"]')).toBeVisible();
    await fitsScreen(page);
    for (const n of [38, 38, 36, 36, 42, 42]) await hit(page, n);
    await expect(page.locator('[data-kit-pad-now="hhOpen"]')).toBeVisible();
    await hit(page, 42);
    await expect(page.locator('[data-kit-pad-now="hhPedal"]')).toBeVisible();
    await page.locator('[data-kit-skip]').click();
    await page.locator('[data-kit-skip]').click();
    for (const n of [49, 49, 48, 48]) await hit(page, n);
    await page.locator('[data-kit-skip]').click();
    for (const n of [43, 43]) await hit(page, n);
    await expect(page.locator('[data-kit-step="pedal"]')).toBeVisible();
    await page.locator('[data-kit-next="pedal"]').click();
    await expect(page.locator('[data-kit-step="vel"]')).toBeVisible();
    for (let i = 0; i < 8; i++) await hit(page, 38, 30 + i);
    for (let i = 0; i < 8; i++) await hit(page, 38, 100 + i);
    await expect(page.locator('[data-kit-step="latency"]')).toBeVisible();
    await page.locator('[data-kit-next="latency"]').click();
    await expect(page.locator('[data-kit-step="done"]')).toBeVisible();
    await page.locator('[data-kit-done]').click();
    await expect(page.locator('[data-kit-card="ready"]')).toBeVisible();
    await expect(page.locator('[data-kit-card="ready"]')).toContainText('Test Kit');
  });

  test('a measured MIDI take: snare hits on the click give a verdict with the per-limb line', async ({ page }) => {
    await stubKit(page);
    await seed(page, { kit: { preset: 'gm', map: {}, device: 'Test Kit', done: true } });
    await page.goto('/?unlock#/settings');
    await page.evaluate(async () => {
      const path = '/src/speech/midi.ts';
      const { midi } = await import(/* @vite-ignore */ path);
      await midi.enable();
    });
    await page.evaluate(() => (location.hash = '#/drills'));
    await page.locator('[data-topic="all"]').click();
    await page.locator('[data-family="d-time"]').click();
    const card = page.locator('[data-level="d-time-1"]');
    if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
    await page.locator('[data-level-start="d-time-1"]').click();
    await expect(page.locator('[data-drill-play]')).toBeEnabled();
    await page.locator('[data-drill-play]').click();
    // Hit the snare on each beat of the take: a new beat dot after the count-in = one hit (♩ = 60, 16 quarters).
    await page.evaluate(() => {
      const k = (window as unknown as Win).__kit;
      const box = document.querySelector('.drill-beat')!;
      new MutationObserver(() => {
        if (box.classList.contains('play')) k.onmidimessage?.({ data: new Uint8Array([0x99, 38, 90]), timeStamp: performance.now() });
      }).observe(box, { childList: true });
    });
    await expect(page.locator('.drill-result')).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('[data-drum-limbs]')).toContainText('Snare');
  });

  test('the drums path, Practice and the Highway kit lanes', async ({ page }) => {
    await seed(page, { lang: 'en' });
    await page.goto('/?unlock#/path');
    await expect(page.locator('[data-course-chip="drums"]:visible').first()).toBeVisible();
    await expect(page.getByText('Strokes & dynamics 1').or(page.getByText(/Strokes & dynamics/)).first()).toBeVisible();
    await page.goto('about:blank');
    await page.goto('/?unlock#/arcade');
    await expect(page.locator('[data-hub="drills"]')).toBeVisible();
    await expect(page.locator('[data-hub="songs"]')).toHaveCount(0);
    await page.locator('[data-hub="games"]').click();
    await page.locator('[data-cat="all"]').click();
    await expect(page.locator('.game-card.groove')).toBeVisible();
    await expect(page.locator('.game-card.highway')).toBeVisible();
    await expect(page.locator('.game-card.rush-chord')).toHaveCount(0);
    await page.goto('about:blank');
    await page.goto('/?unlock#/highway');
    await expect(page.locator('[data-hw-mode="kit"]')).toHaveAttribute('aria-checked', 'true');
    await fitsScreen(page);
  });

  // 0.66 (DRUMS_AUDIT §5): the e-kit notice, the kit card's setups, an acoustic kit by microphone, dense rudiments.
  test('the e-kit notice: on the path top and the kit card until an e-kit is set up; the setups on the kit card', async ({ page }) => {
    await seed(page);
    await page.goto('/?unlock#/path');
    await expect(page.locator('[data-kit-notice="none"]')).toContainText('MIDI');
    await page.goto('about:blank');
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-kit-card] [data-kit-notice]')).toBeVisible();
    for (const k of ['midi', 'acoustic', 'pad']) await expect(page.locator(`[data-kit-kind-pick="${k}"]`)).toBeVisible();
    // Picking the acoustic kit goes straight to its setup (latency, then the drums' calibration).
    await page.locator('[data-kit-kind-pick="acoustic"]').click();
    await expect(page.locator('[data-kit-step="latency"]')).toBeVisible();
    // A ready e-kit: no notice, the app-sounds option instead.
    await seed(page, { kit: { preset: 'gm', map: { 38: 'snare' }, done: true, device: 'Test Kit' } });
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-kit-card="ready"][data-kit-kind="midi"]')).toBeVisible();
    await expect(page.locator('[data-kit-notice]')).toHaveCount(0);
    await expect(page.locator('[data-kit-sounds="off"]')).toBeVisible();
    await page.locator('[data-kit-sounds] input').check();
    await expect(page.locator('[data-kit-sounds="on"]')).toBeVisible();
    await page.goto('about:blank');
    await page.goto('/?unlock#/path');
    await expect(page.locator('[data-kit-notice]')).toHaveCount(0);
  });

  test('an acoustic kit by microphone: the basic grooves are offered and playable, open-hat levels are not', async ({ page }) => {
    const tpl = { kick: [9, 9, 3, 1, 0.3, 0.1, 0.05, 0.02], snare: [0.2, 1, 3, 3, 2, 2, 1, 0.5], hat: [0.01, 0.01, 0.02, 0.05, 0.2, 1, 3, 4] };
    await seed(page, { kit: { preset: 'gm', map: {}, mic: true, kind: 'acoustic', acoustic: { tpl }, done: true } });
    await page.goto('/?unlock#/drills');
    await expect(page.locator('[data-kit-card="ready"][data-kit-kind="acoustic"]')).toBeVisible();
    await expect(page.locator('[data-kit-notice="acoustic"]')).toBeVisible();
    await expect(page.locator('[data-topic="grooves"]')).toBeVisible();
    await openLevel(page, 'd-rock', 'd-rock-1');
    await expect(page.locator('[data-drum-needs-kit]')).toHaveCount(0);
    await expect(page.locator('[data-drill-play]')).toBeEnabled();
    await fitsScreen(page);
    await page.goto('about:blank');
    await page.goto('/?unlock#/drills');
    await page.locator('[data-topic="all"]').click();
    await page.locator('[data-family="d-rock"]').click();
    await expect(page.locator('[data-level="d-rock-1"]')).toBeVisible();
    await expect(page.locator('[data-level="d-rock-3"]')).toHaveCount(0);
  });

  test('dense rudiments (16th triplets) are one bar a line, still one screen', async ({ page }) => {
    await seed(page, { kit: { preset: 'gm', map: {}, mic: true, done: true } });
    await openLevel(page, 'd-rolls', 'd-rolls-5');
    await expect(page.locator('.drum-score[data-drum-bars="1"]')).toBeVisible();
    await fitsScreen(page);
  });

  // DRUMS_NICHE_PLAN P1: songs with the road map, prog meters, notation signs, the drum games — one phone screen each.
  test.describe('niche families at 390 × 844', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    const eKit = { preset: 'gm', map: {}, device: 'Test Kit', done: true };
    test('a song: the road map above the score, the take on one screen', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await openLevel(page, 'd-song', 'd-song-3');
      await expect(page.locator('[data-roadmap="live"]')).toBeVisible();
      await expect(page.locator('.drum-road .road-block')).toHaveCount(7);
      await fitsScreen(page);
    });
    test('road-map reading shows the written signs only', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await openLevel(page, 'd-song', 'd-song-5');
      await expect(page.locator('[data-roadmap="written"]')).toContainText('D.S. al Coda');
      await fitsScreen(page);
    });
    test('the prog song writes each meter change on the staff', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await openLevel(page, 'd-prog', 'd-prog-10');
      await expect(page.locator('[data-time-sig="7/8"]').first()).toBeVisible();
      await fitsScreen(page);
    });
    test('notation: tremolo slashes and repeat signs', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await openLevel(page, 'd-notation', 'd-notation-4');
      await expect(page.locator('[data-trem]').first()).toBeVisible();
      await fitsScreen(page);
      await openLevel(page, 'd-notation', 'd-notation-5');
      await expect(page.locator('[data-repeat-bar]').first()).toBeVisible();
      await fitsScreen(page);
    });
    test('your song: a typed chord chart opens as a take', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await page.goto('/?unlock#/drills');
      await page.locator('[data-drum-song="open"]').click();
      await page.locator('#drum-song-text').fill('Verse 4: Am F C G\nChorus 4: F G C C\n= 96');
      await expect(page.locator('[data-drum-song-parse="ok"]')).toBeVisible();
      await page.locator('[data-drum-song-play]').click();
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      await expect(page.locator('[data-roadmap="live"]')).toBeVisible();
      await fitsScreen(page);
    });
    for (const g of ['land', 'groove-echo', 'odd-echo'])
      test(`drum game ${g} fits one screen`, async ({ page }) => {
        await stubKit(page);
        await seed(page, { kit: eKit });
        await page.goto(`/?unlock#/${g}`);
        await expect(page.locator('main')).toBeVisible();
        await fitsScreen(page);
      });
  });

  // DRUMS_NICHE_PLAN P2: the rest of the curriculum (drumMore.ts) and the short kit setup at the course start.
  test.describe('the rest of the curriculum at 390 × 844', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    const eKit = { preset: 'gm', map: {}, device: 'Test Kit', done: true };
    for (const [fam, lv, lang] of [
      ['d-rolls', 'd-rolls-9', 'en'],
      ['d-funk', 'd-funk-8', 'he'],
      ['d-shuffle', 'd-shuffle-5', 'en'],
      ['d-fills', 'd-fills-8', 'he'],
      ['d-read', 'd-read-11', 'en'],
      ['d-feet', 'd-feet-7', 'en'],
      ['d-time', 'd-time-8', 'he'],
      ['d-indep', 'd-indep-6', 'en'],
    ] as const)
      test(`${lv} (${lang}) fits one screen`, async ({ page }) => {
        await stubKit(page);
        await seed(page, { kit: eKit, lang });
        await openLevel(page, fam, lv);
        await expect(page.locator('.drum-score').first()).toBeVisible();
        await fitsScreen(page);
      });
    // DRUMS P2 rest: mambo / songo / Mozambique (with the teacher-check note), Rudiment Rush, Groove-off.
    for (const [lv, lang] of [
      ['d-latin-8', 'en'],
      ['d-latin-9', 'he'],
      ['d-latin-10', 'en'],
    ] as const)
      test(`${lv} (${lang}) fits one screen and says the pattern is not teacher-checked yet`, async ({ page }) => {
        await stubKit(page);
        await seed(page, { kit: eKit, lang });
        await openLevel(page, 'd-latin', lv);
        await expect(page.locator('[data-teacher-check]').first()).toBeVisible();
        await fitsScreen(page);
      });
    test('Rudiment Rush: the sticking zones on the setup, then the first round fits one screen', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit });
      await page.goto('/?unlock#/rudiment-rush');
      await expect(page.locator('[data-dg-zones="hat-snare"]')).toBeVisible();
      await page.locator('[data-zone="head-rim"]').click();
      await expect(page.locator('[data-dg-zones="head-rim"]')).toBeVisible();
      await fitsScreen(page);
      await page.locator('[data-dg-start]').click();
      await expect(page.locator('[data-dg-round="1"]')).toBeVisible();
      await fitsScreen(page);
    });
    test('Groove-off: the drum level, a local challenge code, the first round fits one screen', async ({ page }) => {
      await stubKit(page);
      await seed(page, { kit: eKit, lang: 'he' });
      await page.goto('/?unlock#/groove-off');
      await expect(page.locator('[data-groove-off="home"] [data-go-level="pp"]')).toBeVisible();
      await fitsScreen(page);
      await page.locator('#go-code').fill('nonsense');
      await page.locator('.go-enter button[type="submit"]').click();
      await expect(page.locator('.go-enter .form-error')).toBeVisible();
      await page.locator('[data-go-new]').click();
      await expect(page.locator('[data-groove-off="play"][data-dg-round="1"]')).toBeVisible();
      await fitsScreen(page);
    });
    for (const g of ['time-lock', 'ghost-control'])
      test(`drum game ${g} fits one screen, setup and the first round`, async ({ page }) => {
        await stubKit(page);
        await seed(page, { kit: eKit });
        await page.goto(`/?unlock#/${g}`);
        await expect(page.locator(`[data-drum-game="${g}"]`)).toBeVisible();
        await fitsScreen(page);
        await page.locator('[data-dg-start]').click();
        await expect(page.locator('[data-dg-round="1"]')).toBeVisible();
        await fitsScreen(page);
      });
    test('course start: the short kit setup learns three pads and skips the pedal and velocity steps', async ({ page }) => {
      await stubKit(page);
      await page.goto('/?sim=1&welcome=1&lang=en');
      await page.locator('[data-ob="start"]').click();
      await page.locator('[data-ob="listen"]').click();
      await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
      await page.locator('[data-ob="taste-0"]').click();
      await page.locator('[data-ob="taste-next"]').click();
      await page.locator('[data-ob="course-drums"]').click();
      await page.locator('[data-ob="courses-next"]').click();
      await page.locator('[data-report="new"]').click();
      await expect(page.locator('[data-course-start="setup"] [data-kit-quick="1"]')).toBeVisible();
      await page.locator('[data-kit-connect]').click();
      await expect(page.locator('[data-kit-step="map"]')).toBeVisible();
      // The "fine-tune later on the kit card" note.
      await expect(page.locator('[data-kit-quick-rest]')).toBeVisible();
      await fitsScreen(page);
      for (const n of [38, 38, 36, 36, 42, 42]) await hit(page, n);
      // No pedal or velocity step: straight to the latency.
      await expect(page.locator('[data-kit-step="latency"]')).toBeVisible();
      await fitsScreen(page);
      await page.locator('[data-kit-next="latency"]').click();
      // The kit is saved: the course moves on to its first taste.
      await expect(page.locator('[data-course-start="setup"]')).toHaveCount(0);
    });
  });

  test('onboarding: picking drums shows the e-kit recommendation', async ({ page }) => {
    await page.goto('/?sim=1&welcome=1&lang=en');
    await page.locator('[data-ob="start"]').click();
    await page.locator('[data-ob="listen"]').click();
    await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
    await page.locator('[data-ob="taste-0"]').click();
    await page.locator('[data-ob="taste-next"]').click();
    await expect(page.locator('[data-course-note="drums"]')).toHaveCount(0);
    await page.locator('[data-ob="course-drums"]').click();
    await expect(page.locator('[data-course-note="drums"]')).toContainText('MIDI');
  });
});
