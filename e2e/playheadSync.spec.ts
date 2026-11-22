import { expect, test, type Page } from '@playwright/test';

// Owner 2026-11-22: the staff cursor ran on past the end of the line and drifted off the tempo of the notes. A real
// take (the simulator: real audio clock, no input) is sampled every frame: the cursor's beat (data-now-beat) against the
// beat heard at that moment (from the take's own zero, captured from the audio engine), its x against the noteheads.

// one test at a time in this file (a real-time take each; timing is measured)
test.describe.configure({ mode: 'default', timeout: 120_000 });

type Shot = { t: number; beat: number; x: number; line: number; lastLine: number; lastHead: number; heads: number[] };

async function sampleTake(page: Page, level: string, family: string, bpm: number, mode: 'take' | 'listen' = 'take') {
  await page.addInitScript((b) => ((window as unknown as { __bpm: number }).__bpm = b), bpm);
  await page.goto('/?sim=1&unlock=all#/drills');
  await page.locator(`[data-family="${family}"]`).click();
  const row = page.locator(`[data-level="${level}"]`);
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('.drill-staff svg').first()).toBeVisible();
  // the take's zero (the moment beat 0 is heard, performance.now ms), straight from the audio engine
  // (Listen: the moment the first note is heard)
  await page.evaluate(() => {
    const w = window as unknown as { __sound: { playTimeline: (...a: unknown[]) => Promise<number>; play: (...a: unknown[]) => Promise<void> }; __zero?: number };
    const orig = w.__sound.playTimeline.bind(w.__sound);
    w.__sound.playTimeline = (tl, sig, onBeat, onResp) =>
      orig(tl, sig, onBeat, (p: number) => {
        w.__zero = p;
        (onResp as ((p: number) => void) | undefined)?.(p);
      });
    const play = w.__sound.play.bind(w.__sound);
    w.__sound.play = (ev, len, sig, onStart) =>
      play(ev, len, sig, (p: number) => {
        w.__zero = p;
        (onStart as ((p: number) => void) | undefined)?.(p);
      });
  });
  await page.locator(mode === 'take' ? '[data-drill-play]' : '[data-hear]').click();
  const r = await page.evaluate(async () => {
    const shots: Shot[] = [];
    const t0 = performance.now();
    let seen = false;
    while (performance.now() - t0 < 40000) {
      await new Promise((res) => requestAnimationFrame(() => res(null)));
      const box = document.querySelector<HTMLElement>('.drill-staff');
      const b = box?.getAttribute('data-now-beat');
      if (!box || b === null || b === undefined) {
        if (seen) break;
        continue;
      }
      seen = true;
      const lines = [...box.querySelectorAll<HTMLElement>('[data-staff-line]')];
      const c = box.querySelector('.staff-now');
      const line = c ? lines.findIndex((l) => l.contains(c)) : -1;
      const last = lines[lines.length - 1];
      const headsOf = (l: Element) => [...l.querySelectorAll('.vf-stavenote')].filter((n) => !n.classList.contains('vf-rest') && !n.querySelector('.vf-rest')).map((n) => { const h = n.querySelector('.vf-notehead') ?? n; const q = h.getBoundingClientRect(); return q.left + q.width / 2; });
      const lh = headsOf(last);
      const cr = c?.getBoundingClientRect();
      shots.push({ t: performance.now(), beat: Number(b), x: cr ? cr.left + cr.width / 2 : NaN, line, lastLine: lines.length - 1, lastHead: lh.length ? Math.max(...lh) : NaN, heads: line >= 0 ? headsOf(lines[line]) : [] });
    }
    const zero = (window as unknown as { __zero?: number }).__zero ?? NaN;
    const lastOnset = Number(document.querySelector('.drill-staff')?.getAttribute('data-last-onset') ?? NaN);
    return { shots, zero, lastOnset };
  });
  return r;
}

/** The written beat due at a heard beat (swung 8ths: the off-beat sounds at 2/3 of the beat). */
const written = (heard: number, swing: boolean) => {
  if (!swing) return heard;
  const k = Math.floor(heard);
  const u = heard - k;
  return k + (u < 2 / 3 ? u * 0.75 : 0.5 + (u - 2 / 3) * 1.5);
};

function stats(r: Awaited<ReturnType<typeof sampleTake>>, bpm: number, swing: boolean) {
  const beatMs = 60000 / bpm;
  const live = r.shots.filter((s) => s.beat >= 0);
  // timing: the cursor's beat vs the written beat due now (inside the music: before the last onset)
  const errs = live
    .map((s) => ({ s, exp: written((s.t - r.zero) / beatMs, swing) }))
    .filter((e) => e.exp >= 0.1 && e.exp <= r.lastOnset - 0.1)
    .map((e) => (e.s.beat - e.exp) * beatMs);
  const absErr = errs.map(Math.abs).sort((a, b) => a - b);
  const p95 = absErr[Math.floor(absErr.length * 0.95)] ?? NaN;
  const meanErr = errs.reduce((a, b) => a + b, 0) / Math.max(1, errs.length);
  // the end: never past the last onset, never past the last notehead on the last line
  const overBeat = Math.max(...live.map((s) => s.beat)) - r.lastOnset;
  const onLast = live.filter((s) => s.line === s.lastLine && s.line >= 0 && Number.isFinite(s.x));
  const overPx = onLast.length ? Math.max(...onLast.map((s) => s.x - s.lastHead)) : 0;
  // monotonic within a line
  let back = 0;
  for (let i = 1; i < live.length; i++) if (live[i].line === live[i - 1].line && live[i].line >= 0) back = Math.max(back, live[i - 1].x - live[i].x);
  return { n: live.length, p95: Math.round(p95), meanErr: Math.round(meanErr), overBeat: +overBeat.toFixed(3), overPx: Math.round(overPx), back: Math.round(back), lines: (live[0]?.lastLine ?? 0) + 1 };
}

const cases = [
  { name: 'scales 2 octaves in 8ths @ 60', family: 'scales', level: 'scales-2', bpm: 60, swing: false },
  { name: 'scales 2 octaves in 8ths @ 100', family: 'scales', level: 'scales-2', bpm: 100, swing: false },
  { name: 'swung 8ths line @ 90', family: 'harris', level: 'harris-18', bpm: 90, swing: true },
];

for (const size of [{ width: 390, height: 844 }, { width: 1400, height: 900 }])
  for (const c of cases)
    test(`playhead in sync and stops at the end: ${c.name} (${size.width}px)`, async ({ page }) => {
      await page.setViewportSize(size);
      const r = await sampleTake(page, c.level, c.family, c.bpm);
      const s = stats(r, c.bpm, c.swing);
      console.log(`[playhead] take ${c.name} ${size.width}px`, JSON.stringify(s));
      expect(s.n).toBeGreaterThan(40);
      // in time: within ~three frames of the heard beat (95% of samples), no constant lag
      expect(s.p95).toBeLessThan(50);
      expect(Math.abs(s.meanErr)).toBeLessThan(15);
      // never past the last note
      expect(s.overBeat).toBeLessThanOrEqual(0.001);
      expect(s.overPx).toBeLessThanOrEqual(2);
      // never backwards within a line
      expect(s.back).toBeLessThanOrEqual(1);
    });

// The Listen playback (and the coach's demo, the same playDrill): the cursor runs with the sound, stops on the last note.
for (const c of [cases[1], cases[2]])
  test(`Listen: the cursor runs with the sound and stops on the last note: ${c.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const r = await sampleTake(page, c.level, c.family, c.bpm, 'listen');
    const s = stats(r, c.bpm, c.swing);
    console.log(`[playhead] listen ${c.name}`, JSON.stringify(s));
    expect(s.n).toBeGreaterThan(40);
    expect(s.p95).toBeLessThan(50);
    expect(Math.abs(s.meanErr)).toBeLessThan(15);
    expect(s.overBeat).toBeLessThanOrEqual(0.001);
    expect(s.overPx).toBeLessThanOrEqual(2);
    expect(s.back).toBeLessThanOrEqual(1);
  });

// The hands-free coach: the demo, then takes back to back at changing tempos (fake takes played out in time). Each run
// of the cursor starts from the top (nothing stale from the take before) and never passes the last note.
test('coach: every take and the demo start the cursor afresh and stop it on the last note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as { __fakeTake: string; __fakeLive: number };
    w.__fakeTake = 'clean';
    w.__fakeLive = 2;
  });
  await page.goto('/?sim=1&unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  const runs = await page.evaluate(async () => {
    const out: { first: number; max: number; last: number; n: number; back: number }[] = [];
    let cur: (typeof out)[number] | null = null;
    let prev = -1;
    const t0 = performance.now();
    while (performance.now() - t0 < 30000 && out.length < 4) {
      await new Promise((res) => requestAnimationFrame(() => res(null)));
      const box = document.querySelector<HTMLElement>('.coach-run .drill-staff');
      const b = box?.getAttribute('data-now-beat');
      if (!box || b === null || b === undefined) {
        if (cur) out.push(cur);
        cur = null;
        continue;
      }
      const v = Number(b);
      const last = Number(box.getAttribute('data-last-onset'));
      if (!cur) cur = { first: v, max: v, last, n: 0, back: 0 };
      else cur.back = Math.max(cur.back, prev - v);
      cur.max = Math.max(cur.max, v);
      cur.n++;
      prev = v;
    }
    if (cur) out.push(cur);
    return out;
  });
  console.log('[playhead] coach runs', JSON.stringify(runs));
  const real = runs.filter((r) => r.n > 10);
  expect(real.length).toBeGreaterThanOrEqual(2);
  for (const r of real) {
    expect(r.first).toBeLessThan(0.6);
    expect(r.max).toBeLessThanOrEqual(r.last + 0.001);
    expect(r.back).toBeLessThanOrEqual(0.001);
  }
});
