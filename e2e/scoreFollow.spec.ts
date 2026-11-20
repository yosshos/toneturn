import { expect, test } from '@playwright/test';

// Owner 2026-11-20: reading-play must be perfect — while a take runs the score box shows the line being played near the
// top with the next line below it, and scrolls smoothly into the next line (no jumps, no line never seen).
for (const size of [{ width: 1400, height: 900 }, { width: 390, height: 844 }])
  test(`the score follows the take smoothly, the next line in view (${size.width}px)`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(size);
    await page.goto('/?sim=1#/drills');
    await page.locator('[data-drills-test]').click();
    await page.locator('[data-test-start]').click();
    await page.getByRole('button', { name: /Play/ }).first().click();
    const shots = await page.evaluate(async () => {
      const out: { t: number; top: number; lines: number; nowLine: number; nextVisible: boolean; scrollable: boolean }[] = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 20000) {
        const box = document.querySelector('.drill-staff.following') as HTMLElement | null;
        if (box) {
          const lines = [...box.querySelectorAll<HTMLElement>('[data-staff-line], [data-ht-system]')];
          const now = box.querySelector('.staff-now');
          const nowLine = now ? lines.findIndex((l) => l.contains(now)) : -1;
          const br = box.getBoundingClientRect();
          const nx = nowLine >= 0 ? lines[nowLine + 1] : undefined;
          const nr = nx?.getBoundingClientRect();
          out.push({ t: performance.now() - t0, top: box.scrollTop, lines: lines.length, nowLine, nextVisible: !nx || (!!nr && nr.top < br.bottom - 20), scrollable: box.scrollHeight > box.clientHeight + 4 });
        } else if (out.length > 10) break;
        await new Promise((r) => setTimeout(r, 40));
      }
      return out;
    });
    const live = shots.filter((s) => s.nowLine >= 0);
    expect(live.length).toBeGreaterThan(30);
    // The next line is in view whenever there is one (score-following).
    expect(live.filter((s) => !s.nextVisible).length).toBe(0);
    // Smooth: the box never jumps by more than ~a third of a line between two samples 40 ms apart.
    let maxStep = 0;
    for (let i = 1; i < live.length; i++) maxStep = Math.max(maxStep, Math.abs(live[i].top - live[i - 1].top));
    if (live.some((s) => s.scrollable && s.lines > 2)) expect(maxStep).toBeLessThan(60);
    await page.screenshot({ path: `test-results/score-follow-${size.width}.png` });
  });
