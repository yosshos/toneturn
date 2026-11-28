import { expect, test, type Page } from '@playwright/test';

// Owner 2026-11-28 (D major, 2 octaves, hands together, ♩118: "the cursor moved faster than the notes"). The staff SVG is
// width 100 % with a CSS max-height; when the cap bit (hands together on a wide screen: 104 px; some phone lines: 120 px)
// the browser centred the music inside the SVG's box and the cursor, placed at a share of the box, ran from ~50–90 px
// before the first head to ~55–70 px past the last. Every frame of a take is sampled here: the cursor's x against the
// x of the heads it should stand on / glide between (from the drawn heads on screen), on every staff of the system.

test.describe.configure({ mode: 'default', timeout: 120_000 });

type Shot = { beat: number; x: number; sys: number; items: number[] };

async function sample(page: Page, level: string, bpm: number): Promise<Shot[]> {
  await page.addInitScript((b) => {
    const w = window as unknown as { __bpm: number; __fakeTake: string; __fakeLive: number };
    w.__bpm = b;
    w.__fakeTake = 'clean';
    w.__fakeLive = 1;
  }, bpm);
  await page.goto('/?sim=1&unlock=all#/drills');
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  const row = page.locator(`[data-level="${level}"]`);
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('.drill-staff svg').first()).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator('[data-drill-play]').click();
  return page.evaluate(async () => {
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
      for (const c of box.querySelectorAll<HTMLElement>('.staff-now')) {
        const ns = c.closest('.note-staff')!;
        const sys = c.closest('[data-ht-system],[data-staff-line]');
        const items = [...ns.querySelectorAll('.vf-stavenote')].map((n) => {
          const q = (n.querySelector('.vf-notehead') ?? n).getBoundingClientRect();
          return q.left + q.width / 2;
        });
        const r = c.getBoundingClientRect();
        shots.push({ beat: Number(b), x: r.left + r.width / 2, sys: Number(sys?.getAttribute('data-ht-system') ?? sys?.getAttribute('data-staff-line') ?? 0), items });
      }
    }
    return shots;
  });
}

for (const size of [{ width: 390, height: 844 }, { width: 1000, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }])
  test(`hands together, 2 octaves @ ♩118: the cursor stands on the due head and glides head to head (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize(size);
    const shots = await sample(page, 'scales-3', 118);
    // the scale in 8ths: each line's items are its 8ths in order (a line = the first system's length)
    const per = (shots.find((s) => s.sys === 0)?.items.length ?? 16) * 0.5;
    const errs: number[] = [];
    for (const s of shots) {
      const f = (s.beat - s.sys * per) / 0.5;
      const i = Math.floor(f);
      if (i < 0 || i + 1 >= s.items.length) continue;
      errs.push(s.x - (s.items[i] + (s.items[i + 1] - s.items[i]) * (f - i)));
    }
    const worst = Math.max(...errs.map(Math.abs));
    const mean = errs.reduce((a, b) => a + b, 0) / Math.max(1, errs.length);
    console.log(`[playhead heads] ${size.width}px n=${errs.length} mean=${mean.toFixed(2)} worst=${worst.toFixed(2)}`);
    expect(errs.length).toBeGreaterThan(200);
    expect(worst).toBeLessThan(3);
    expect(Math.abs(mean)).toBeLessThan(1);
  });
