import { expect, test, type Page } from '@playwright/test';

// 0.85 (owner): the staff playhead sat off the notes. It must pass over every notehead (it stands on the head when the
// note is due) and stay inside the drawn staff — on a wide screen, where the staff is narrower than its row, and on a phone.
async function sample(page: Page) {
  await page.goto('/?sim=1#/drills');
  await page.locator('[data-drills-test]').click();
  await page.locator('[data-test-start]').click();
  await page.getByRole('button', { name: /Play/ }).first().click();
  return page.evaluate(async () => {
    const shots: { cx: number; heads: number[]; s0: number; s1: number }[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 16000) {
      const c = document.querySelector('.staff-now');
      if (c) {
        const w = c.parentElement!;
        const svg = w.querySelector('svg')!.getBoundingClientRect();
        const r = c.getBoundingClientRect();
        const heads = [...w.querySelectorAll('.vf-notehead')].map((h) => {
          const b = h.getBoundingClientRect();
          return b.left + b.width / 2;
        });
        shots.push({ cx: r.left + r.width / 2, heads, s0: svg.left, s1: svg.right });
      } else if (shots.length > 10) break;
      await new Promise((res) => setTimeout(res, 16));
    }
    return shots;
  });
}

for (const size of [{ width: 1400, height: 900 }, { width: 390, height: 844 }])
  test(`playhead passes over each notehead and stays on the staff (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize(size);
    const shots = await sample(page);
    expect(shots.length).toBeGreaterThan(30);
    for (const s of shots) {
      expect(s.cx).toBeGreaterThanOrEqual(s.s0 - 1);
      expect(s.cx).toBeLessThanOrEqual(s.s1 + 1);
    }
    // The first line: every notehead is passed within a few pixels (the head is ~10 px wide).
    const line = shots[0].heads.join();
    const on = shots.filter((s) => s.heads.join() === line);
    const miss = shots[0].heads.map((h) => Math.min(...on.map((s) => Math.abs(s.cx - h))));
    const tol = size.width < 500 ? 3 : 5;
    expect(Math.max(...miss)).toBeLessThan(tol);
  });
