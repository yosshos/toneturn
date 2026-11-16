import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Encore's open items at 320×720 in English and Hebrew: a teacher assigns a phrase on the guitar (the instrument row,
// one line, no hands) → the student's page locks the instrument and Continue runs it on the guitar; the "record the
// whole session" switch on an exercise's gate page; a phrase's MusicXML export; a recordings folder as one .zip.
// E2E_BASE: another dev server (a worktree's own vite). SHOTS=1 saves the screens to docs/encore-shots/.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const SHOTS = !!process.env.SHOTS;
if (SHOTS) mkdirSync('docs/encore-shots', { recursive: true });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};
const NOW = '2026-11-16T10:00:00.000Z';

const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });

const seed = async (page: Page, lang: Lang, own: unknown[] = []) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, own }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [{ sessionId: 'seed-1', lessonId: 'bflat-two-homes', lessonVersion: 1, firstTry: 3, total: 3, xp: 10, missed: [], completedAt: new Date(Date.now() - 86_400_000).toISOString() }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, nickname: 'Ronit', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { keys: { legacy: true } }, seenVersion: '9.9.9', drills, lickBook: { own } };
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
      localStorage.setItem('tt.mockTeacher', '1');
    },
    { lang, own },
  );
};
const fits = async (page: Page, what: string) => {
  const m = await page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth };
  });
  expect(m.side, `${what}: no horizontal scroll`).toBeLessThanOrEqual(1);
  expect(m.over, `${what}: one screen`).toBeLessThanOrEqual(2);
};
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, [aria-hidden="true"], .sim-banner, title, option, .dyn')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      out.push(t.trim().slice(0, 60));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, lang: Lang, what: string) => {
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};

/** Eighths at ♩120 on the stub keyboard (real time). */
const playPhrase = (page: Page) =>
  page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    const line = [65, 69, 72, 76, 74, 72, 69, 67, 65, 64, 65, 67, 69, 72, 74, 77];
    for (let i = 0; i < line.length; i++) {
      inp.onmidimessage({ data: new Uint8Array([0x90, line[i], 90]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 212));
      inp.onmidimessage({ data: new Uint8Array([0x80, line[i], 0]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 38));
    }
  });

const PHRASE = { id: 'enc-x1', v: 3, ctx: 'free', level: 3, name: { en: 'Run in F', he: 'ריצה ב־F' }, chords: [[0, 'maj7', 4], [5, '7', 4]], notes: [[0, 0, 0.5], [2, 0.5, 0.5], [4, 1, 0.5], [5, 1.5, 0.5], [7, 2, 0.5], [9, 2.5, 0.5], [11, 3, 0.5], [12, 3.5, 0.5], [10, 4, 1], [9, 5, 1], [7, 6, 2]], meter: 4, swing: 0.5, straight: true, homeKey: 5, own: true, instrument: 'piano', playedBpm: 100, createdAt: NOW, plan: { startBpm: 60, goalBpm: 120, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true } };

for (const lang of ['en', 'he'] as Lang[]) {
  test(`a phrase assigned on the guitar: the instrument row, a locked instrument, the run on the guitar (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await stubMidi(page);
    await seed(page, lang);
    await page.goto(`/?lang=${lang}#/teach/new/demo-class`);
    await expect(page.locator('[data-teach="new"] [data-teach-armed]')).toBeVisible();
    await page.waitForTimeout(400);
    await playPhrase(page);
    await expect(page.locator('[data-teach-caught]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-teach-inst="piano"]')).toBeVisible();
    await page.locator('[data-teach-inst]').selectOption('guitar');
    await expect(page.locator('[data-teach-inst="guitar"]')).toBeVisible();
    await page.locator('[data-teach-keys="home"]').click();
    await shot(page, `teach-sheet-guitar-${lang}`);
    await check(page, lang, 'teacher sheet, guitar');
    await page.locator('[data-teach-assign]').click();
    await expect(page.locator('[data-teach-msg]')).toBeVisible();
    const db = await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockTeacher.db') ?? '{}'));
    expect(db.assignments[0].ref).toContain('"i":"g"');

    await page.goto(`/?lang=${lang}#/`);
    const card = page.locator('[data-today-teacher]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page.locator('[data-teach="student"]')).toBeVisible();
    await expect(page.locator('[data-locked="inst"]')).toBeVisible();
    await expect(page.locator('[data-locked="hands"]')).toHaveCount(0);
    await shot(page, `teach-student-guitar-${lang}`);
    await check(page, lang, 'student assignment, guitar');
    await page.locator('[data-teach-continue]').click();
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await expect(page.locator('[data-encore="run"] [data-drill*=":guitar:"]')).toBeVisible();
    await expect(page.locator('[data-run-pos]')).toBeVisible();
    await shot(page, `teach-run-guitar-${lang}`);
    await check(page, lang, 'the run on the guitar');
  });

  test(`the whole-session switch on an exercise's gate page (${lang})`, async ({ page }) => {
    await seed(page, lang);
    await page.goto(`/?brief=1&unlock=all&lang=${lang}#/topic/sing-intervals/2`);
    await expect(page.locator('[data-brief]')).toBeVisible();
    const tog = page.locator('[data-brief] [data-rec-session-toggle]');
    await expect(tog).toBeVisible();
    await expect(tog).toHaveAttribute('data-rec-session-toggle', 'off');
    await shot(page, `gate-session-rec-${lang}`);
    await check(page, lang, 'gate page with the session switch');
    await tog.locator('input').click();
    await expect(tog).toHaveAttribute('data-rec-session-toggle', 'on', { timeout: 10_000 });
    await check(page, lang, 'gate page, recording');
    await tog.locator('input').click();
    await expect(tog).toHaveAttribute('data-rec-session-toggle', 'off', { timeout: 10_000 });
    // an exercise that does not listen shows no switch
    await page.goto('about:blank');
    await page.goto(`/?brief=1&unlock=all&lang=${lang}#/topic/basics-highlow/1`);
    await expect(page.locator('[data-brief]')).toBeVisible();
    await expect(page.locator('[data-rec-session-toggle]')).toHaveCount(0);
  });

  test(`a phrase as MusicXML; a recordings folder as one .zip (${lang})`, async ({ page }) => {
    await seed(page, lang, [PHRASE]);
    await page.goto('about:blank');
    await page.goto(`/?unlock=all&lang=${lang}#/encore/phrase/${PHRASE.id}`);
    await expect(page.locator('[data-encore="phrase"]')).toBeVisible();
    await page.locator('[data-phrase-more]').click();
    await expect(page.locator('[data-phrase-xml]')).toBeVisible();
    await check(page, lang, 'phrase with its export');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-phrase-xml]').click()]);
    expect(dl.suggestedFilename()).toMatch(/\.musicxml$/);
    const xml = await (await dl.createReadStream())!.toArray().then((cs) => Buffer.concat(cs).toString('utf8'));
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('<fifths>-1</fifths>');

    // two takes in a folder (saved through the app's own store, as a take review would)
    await page.evaluate(async () => {
      const url = '/src/storage/recordings.ts'; // the dev server's own module (the app's store)
      const m = (await import(/* @vite-ignore */ url)) as typeof import('../src/storage/recordings');
      const played = [60, 62, 64, 65, 67].map((p, i) => ({ pitch: p, on: i * 500, off: i * 500 + 400, vel: 80 }));
      const ids: string[] = [];
      for (const k of [0, 1]) {
        const r = await m.saveTake({ kind: 'drill', course: 'keys', instrument: 'piano', title: { en: `Scale ${k}`, he: `סולם ${k}` }, sung: false, source: 'midi', durationMs: 3000, played, bpm: 120, meter: 4 });
        if (r.ok) ids.push(r.take.id);
      }
      await m.updateTakes(ids, { folder: 'Gig' });
    });
    await page.goto(`/?lang=${lang}#/recordings`);
    await page.locator('[data-rec-folders]').click();
    const zip = page.locator('[data-rec-folder-zip="Gig"]');
    await expect(zip).toBeVisible();
    await shot(page, `rec-folders-zip-${lang}`);
    await check(page, lang, 'folders with the zip export');
    const [z] = await Promise.all([page.waitForEvent('download'), zip.click()]);
    expect(z.suggestedFilename()).toBe('Gig.zip');
    const bytes = await (await z.createReadStream())!.toArray().then((cs) => Buffer.concat(cs));
    expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
    expect(bytes.readUInt16LE(bytes.length - 22 + 10)).toBe(2);
  });
}
