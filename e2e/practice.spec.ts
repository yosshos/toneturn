import { expect, test } from '@playwright/test';

// Practice tab (0.44): the hub (Songs, Technique, Games, Singing + tools) → the songbook, the games list and back;
// the menu in groups; a Progress area opens its sheet instead of playing.
test.describe('practice hub', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('hub cards, songbook, games list, tools back to Practice', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
    for (const k of ['songs', 'drills', 'games', 'lessons', 'tuner', 'metronome', 'drone']) await expect(page.locator(`[data-hub="${k}"]`)).toBeVisible();
    await page.locator('[data-hub="songs"]').click();
    await expect(page.locator('[data-drills="songs"]')).toBeVisible();
    expect(await page.locator('.song-drills li').count()).toBeGreaterThanOrEqual(16);
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('[data-hub="lessons"]').click();
    await expect(page.locator('[data-learned-card]').first()).toBeVisible();
    await page.locator('[data-lesson-topic="glossary"]').click();
    await expect(page.locator('[data-glossary]')).toBeVisible();
    await page.locator('[data-lesson-topic="all"]').click();
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('[data-hub="drills"]').click();
    await expect(page.locator('[data-inst="voice"]')).toBeVisible();
    await page.locator('[data-inst="voice"]').click();
    await expect(page).toHaveURL(/vocal/);
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-drills="hub"]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await page.locator('[data-hub="games"]').click();
    await expect(page.locator('.play-hero')).toBeVisible();
    await page.locator('.play-screen .screen-head .icon-btn').click();
    await page.locator('[data-hub="metronome"]').click();
    await expect(page.locator('[data-metro-play]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
  });

  test('0.48 tools: charts, practice log, slow down, my pieces', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    for (const k of ['charts', 'slowdown', 'log']) await expect(page.locator(`[data-hub="${k}"]`)).toBeVisible();
    // Charts: a template opens, plays and highlights a bar; transpose changes the text.
    await page.locator('[data-hub="charts"]').click();
    await page.locator('[data-chart-template="pop-four"]').click();
    await expect(page.locator('.ch-bar')).toHaveCount(4);
    await page.locator('[data-chart-up]').click();
    await expect(page.locator('[data-chart-text]')).toHaveValue('Db | Ab | Bbm | Gb');
    await page.locator('[data-chart-play]').click();
    await expect(page.locator('[data-chart-stop]')).toBeVisible();
    await page.locator('[data-chart-stop]').click();
    // Improvising under rules: pick rules, set a bar's scale; both are saved with the chart.
    await page.locator('[data-rule="interval"]').selectOption('thirds');
    await page.locator('[data-rule="rhythm"]').selectOption('eighths');
    await page.locator('[data-bar="0"]').click();
    await page.locator('[data-scale="lydian"]').click();
    await expect(page.locator('[data-bar="0"] .ch-scale.set')).toBeVisible();
    await expect(page.locator('[data-chart-improv]')).toBeVisible();
    await page.locator('[data-chart-save]').click();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-chart-open]')).toHaveCount(1);
    // Standards' changes → practise at the piano as a voicing drill (opens the drill run with the chart).
    await page.locator('[data-standard="autumn"]').click();
    await page.locator('[data-chart-practise] summary').click();
    await page.locator('[data-practise-voicing]').selectOption('drop2');
    await page.locator('[data-practise-go]').click();
    await expect(page.locator('.drill-run')).toBeVisible();
    await expect(page.locator('.song-chart li')).toHaveCount(32);
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-standards]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    // Practice log: kind + minutes → saved, shown in the week total.
    await page.locator('[data-hub="log"]').click();
    await page.locator('[data-log-kind="piece"]').click();
    await page.locator('[data-log-min="20"]').click();
    await page.locator('[data-log-save]').click();
    await expect(page.locator('[data-practice-log]')).toHaveCount(0);
    await page.locator('[data-hub="log"]').click();
    await expect(page.locator('.plog-week h3')).toContainText('20');
    await page.keyboard.press('Escape');
    // The mixer: from Charts, a channel per sound; a level change shows in dB; reset.
    await page.locator('[data-hub="charts"]').click();
    await page.locator('[data-charts-mixer]').click();
    await expect(page.locator('[data-mx-ch]')).toHaveCount(4);
    await page.locator('[data-mx="bass-vol"]').fill('0.5');
    await expect(page.locator('[data-mx-ch="bass"] .mx-knob b').first()).toHaveText('-6 dB');
    await page.locator('[data-mx-reset]').click();
    await expect(page.locator('[data-mx-ch="bass"] .mx-knob b').first()).toHaveText('0 dB');
    await page.locator('.screen-head .icon-btn').first().click();
    await page.locator('.screen-head .icon-btn').first().click();
    // Slow down opens with its file picker.
    await page.locator('[data-hub="slowdown"]').click();
    await expect(page.locator('[data-slowdown-file]')).toBeAttached();
    await page.locator('.screen-head .icon-btn').first().click();
    // My pieces from Songs: import a small MusicXML, set up, practise screen with the first chunk.
    await page.locator('[data-hub="songs"]').click();
    await page.locator('[data-pieces-open]').click();
    const bars = Array.from({ length: 8 }, (_, i) => `<measure number="${i + 1}">${i === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' : ''}${'<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>'.repeat(4)}</measure>`).join('');
    const xml = `<?xml version="1.0"?><score-partwise><work><work-title>E2E Study</work-title></work><part-list><score-part id="P1"/></part-list><part id="P1">${bars}</part></score-partwise>`;
    await page.locator('[data-piece-file]').setInputFiles({ name: 'e2e.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
    await page.locator('[data-piece-start]').click();
    await expect(page.locator('[data-piece-practice]')).toBeVisible();
    await expect(page.locator('.pc-heat span')).toHaveCount(8);
    await expect(page.locator('.pc-task')).toContainText('55');
  });

  test("0.50: insights from Progress, groove trainer from Insights and back", async ({ page }) => {
    await page.goto("/?sim=1#/skills");
    await page.locator("#ps-tab-overview").click();
    await page.locator("[data-open-insights]").click();
    for (const k of ["groove", "confusions"]) await expect(page.locator(`[data-${k}]`)).toBeVisible();
    await page.locator("[data-open-groove]").click();
    await expect(page.locator("[data-groove-trainer]")).toBeVisible();
    await page.locator("[data-groove-mode=pocket]").click();
    await expect(page.locator("[data-pocket]")).toHaveCount(5);
    await page.locator("[data-groove-mode=swing]").click();
    await expect(page.locator("[data-swing-dial]")).toBeVisible();
    await page.locator(".screen-head .icon-btn").first().click();
    await expect(page.locator("[data-groove]")).toBeVisible();
    await page.goto("/?sim=1#/arcade");
    await expect(page.locator("[data-hub=groove]")).toBeVisible();
  });

  test('menu groups and the Progress area sheet', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('.menu-group-h')).toHaveText(['Learn', 'Tools', 'Check yourself', 'You']);
    await page.locator('.menu-sheet .menu-head .icon-btn').click();
    await page.goto('/?sim=1#/skills');
    await page.locator('#ps-tab-overview').click();
    await page.locator('.domain-tile[data-domain="pitch"]').click();
    await expect(page.locator('[data-area-sheet="pitch"]')).toBeVisible();
    await expect(page.locator('[data-area-sheet] .as-skill').first()).toBeVisible();
  });

  test('0.53: a rules challenge from the studio opens the chart with its rules; a pasted lead sheet becomes a chart', async ({ page }) => {
    await page.goto('/?unlock=all#/improv');
    await page.locator('[data-is-chart-src]').selectOption('std:blue-bossa');
    await page.locator('[data-challenge="bebop-test"]').click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await expect(page.locator('[data-rule="note"]')).toHaveValue('guide-beats');
    await expect(page.locator('[data-rule="shape"]')).toHaveValue('end-chord-tone');
    await page.locator('[data-challenges-open]').click();
    await expect(page.locator('[data-challenge-library] [data-challenge]')).toHaveCount(51);
    await page.locator('[data-challenge-library] [data-challenge="one-note-swing"]').click();
    await expect(page.locator('[data-rule="note"]')).toHaveValue('one-note');
    await page.locator('.screen-head .icon-btn').first().click();
    await page.locator('[data-leadsheet-paste]').fill('[Am]words [F]more\n[C]and [G7]more');
    await page.locator('[data-leadsheet-add]').click();
    await expect(page.locator('[data-chart-text]')).toHaveValue('Am | F | C | G7');
  });
});
