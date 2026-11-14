import { expect, test, type Page } from '@playwright/test';

// Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2, k-vl): the run screen shows the chord symbols and the
// first voicing on one phone screen; a MIDI take is graded by the voicings chosen — the smooth path keeps the smallest
// motion, block chords in root position show the voice that jumped.

type Win = { __midiIn: { name: string; onmidimessage: null | ((e: { data: Uint8Array; timeStamp: number }) => void) } };

const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null };
    (window as unknown as Win).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });

/** A returning player in the keys course (onboarding done). */
const seed = async (page: Page, lang: 'en' | 'he' = 'en') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' } };
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
  }, lang);
};
const overflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
const openLevel = async (page: Page, level: string) => {
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="k-vl"]').click();
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

/** The voicings to play for the item on screen: its model path (smooth), or every chord in root position (blocks). */
const voicingsFor = (page: Page, kind: 'smooth' | 'blocks') =>
  page.evaluate(async (kind) => {
    const id = document.querySelector('[data-drill]')!.getAttribute('data-drill')!;
    const [family, k, key, hands, op] = id.split(':');
    const gen = '/src/engine/drills/generate.ts';
    const { generate } = await import(/* @vite-ignore */ gen);
    const d = generate({ family, kind: k, key: Number(key), hands, option: Number(op.replace('op', '')), tempo: 60 });
    const g = d.goal.vl;
    if (kind === 'smooth') return g.at.map((b: number) => d.notes.filter((n: { beat: number }) => Math.abs(n.beat - b) < 1e-6).map((n: { pitch: number }) => n.pitch));
    const third = (q: string) => (q === 'm' ? 3 : 4);
    return g.chords.map((c: { root: number; q: string }) => [60 + c.root, 60 + c.root + third(c.q), 60 + c.root + 7]);
  }, kind);

/** Play the take: on beat 1 of each bar (♩ = 60, a chord a bar) release what changes and strike what is new; common tones stay held. */
const playTake = async (page: Page, chords: number[][]) => {
  await page.locator('[data-drill-play]').click();
  await page.evaluate((chords) => {
    const inp = (window as unknown as Win).__midiIn;
    const send = (d: number[]) => inp.onmidimessage?.({ data: new Uint8Array(d), timeStamp: performance.now() });
    const box = document.querySelector('.drill-beat')!;
    let n = 0;
    let down: number[] = [];
    new MutationObserver(() => {
      if (!box.classList.contains('play')) return;
      if (n % 4 === 0 && n / 4 < chords.length) {
        const next = chords[n / 4];
        for (const p of down) if (!next.includes(p)) send([0x80, p, 0]);
        for (const p of next) if (!down.includes(p)) send([0x90, p, 80]);
        down = next;
      }
      if (n / 4 === chords.length - 0.25) for (const p of down) send([0x80, p, 0]);
      n++;
    }).observe(box, { childList: true });
  }, chords);
  await expect(page.locator('.drill-result')).toBeVisible({ timeout: 45_000 });
};

test.describe('voice leading (k-vl)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const lang of ['en', 'he'] as const)
    test(`run screens fit one phone screen (${lang}): symbols, first voicing or melody; the mic waits for MIDI`, async ({ page }) => {
      await seed(page, lang);
      await page.goto('/?unlock#/drills');
      await page.locator('[data-topic="all"]').click();
      await page.locator('[data-family="k-vl"]').click();
      // The stage lessons sit on the family page.
      await expect(page.locator('[data-vl-lessons="k-vl"] [data-family-lesson]').first()).toBeVisible();
      for (const level of ['k-vl-1', 'k-vl-5', 'k-vl-6', 'k-vl-7', 'k-vl-8']) {
        await page.goto('about:blank');
        await page.goto('/?unlock#/drills');
        await openLevel(page, level);
        await expect(page.locator('[data-vl-score]')).toBeVisible();
        expect(await page.locator('.vl-chords li').count()).toBeGreaterThanOrEqual(3);
        await expect(page.locator('.vl-start svg').first()).toBeVisible();
        await expect(page.locator('[data-piano-needs-midi]')).toBeVisible();
        expect(await overflow(page), level).toBeLessThanOrEqual(4);
      }
    });

  test('a MIDI take: the smooth path (common tones held) is the smallest motion; block chords show the jump', async ({ page }) => {
    test.setTimeout(150_000);
    await stubMidi(page);
    await seed(page);
    await page.goto('/?unlock#/settings');
    await page.evaluate(async () => {
      const path = '/src/speech/midi.ts';
      const { midi } = await import(/* @vite-ignore */ path);
      await midi.enable();
    });
    await page.evaluate(() => (location.hash = '#/drills'));
    await openLevel(page, 'k-vl-1');
    await expect(page.locator('[data-piano-needs-midi]')).toHaveCount(0);
    await playTake(page, await voicingsFor(page, 'smooth'));
    const lanes = page.locator('.vl-lanes');
    await expect(lanes).toBeVisible();
    expect(await lanes.getAttribute('data-vl-total')).toBe(await lanes.getAttribute('data-vl-best'));
    await expect(page.locator('.vl-chords li.v-not')).toHaveCount(0);
    expect(await overflow(page)).toBeLessThanOrEqual(4);

    // Again, in blocks: every chord in root position.
    await page.goto('about:blank');
    await page.goto('/?unlock#/drills');
    await page.evaluate(async () => {
      const path = '/src/speech/midi.ts';
      const { midi } = await import(/* @vite-ignore */ path);
      await midi.enable();
    });
    await openLevel(page, 'k-vl-1');
    await playTake(page, await voicingsFor(page, 'blocks'));
    await expect(page.locator('.vl-lanes .vl-line.jump').first()).toBeVisible();
    await expect(page.locator('.vl-chords li.v-not').first()).toBeVisible();
    await expect(page.locator('.drill-result')).toContainText(/voice jumped|keep/);
  });
});
