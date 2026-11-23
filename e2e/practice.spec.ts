import { expect, test } from '@playwright/test';
import { switchCourse } from './practice';

// Practice tab (0.44): the hub (Songs, Technique, Games, Singing + tools) → the songbook, the games list and back;
// the menu in groups; a Progress area opens its sheet instead of playing.
test.describe('practice hub', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('hub cards, songbook, games list, tools back to Practice', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
    // 0.61: the hub shows the active course's rows (ear & theory: lessons, puzzle, games) plus the tools.
    for (const k of ['games', 'lessons', 'tuner', 'metronome', 'drone']) await expect(page.locator(`[data-hub="${k}"]`)).toBeVisible();
    await page.locator('[data-hub="lessons"]').click();
    await expect(page.locator('[data-learned-card]').first()).toBeVisible();
    await page.locator('[data-lesson-topic="glossary"]').click();
    await expect(page.locator('[data-glossary]')).toBeVisible();
    await page.locator('[data-lesson-topic="all"]').click();
    await page.locator('.screen-head .icon-btn').click();
    await page.locator('[data-hub="games"]').click();
    await expect(page.locator('.play-hero')).toBeVisible();
    await page.locator('.play-screen .screen-head .icon-btn').first().click();
    await page.locator('[data-hub="metronome"]').click();
    await expect(page.locator('[data-metro-play]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
    // The guitar course brings songs and technique.
    await switchCourse(page, 'guitar');
    await page.goto('/?sim=1#/arcade');
    for (const k of ['repertoire', 'drills']) await expect(page.locator(`[data-hub="${k}"]`)).toBeVisible();
    // 0.70: Songs became Repertoire (four tiers); the full songbook is a link on it.
    await page.locator('[data-hub="repertoire"]').click();
    await expect(page.locator('[data-repertoire="guitar"]')).toBeVisible();
    // phase 3: the four tiers and Mine
    await expect(page.locator('[data-rep-tier]')).toHaveCount(5);
    await page.locator('[data-rep-songbook]').click();
    await expect(page.locator('[data-drills="songs"]')).toBeVisible();
    expect(await page.locator('.song-drills li').count()).toBeGreaterThanOrEqual(16);
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-repertoire="guitar"]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    // 0.64: technique in the guitar course is the guitar's only (no instrument switch there).
    await page.locator('[data-hub="drills"]').click();
    await expect(page.locator('[data-drills="hub"]')).toBeVisible();
    await expect(page.locator('[data-inst]')).toHaveCount(0);
  });

  test('0.48 tools: charts (in Repertoire), practice log (in Progress), slow down, my pieces (in Repertoire)', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/?sim=1#/arcade');
    // Phase 3 (SPEC-PRACTICE-IA-3): Charts & lead sheets live in Repertoire for every player; the log moved to Progress.
    await switchCourse(page, 'ear');
    await page.goto('/?sim=1#/arcade');
    if ((await page.locator('[data-jazz-focus]').first().getAttribute('aria-checked')) !== 'true') await page.locator('[data-jazz-focus]').first().click();
    await expect(page.locator('[data-hub="slowdown"]')).toBeVisible();
    for (const k of ['charts', 'log']) await expect(page.locator(`[data-hub="${k}"]`)).toHaveCount(0);
    // Charts: Add a piece → type the chords → a progression opens, plays and highlights a bar; transpose changes the text.
    await page.locator('[data-hub="repertoire"]').click();
    await page.locator('[data-rep-add]').click();
    await page.locator('[data-rep-src="type"]').click();
    await page.locator('[data-rep-template="pop-four"]').click();
    await expect(page.locator('.ch-grid .cc-bar')).toHaveCount(4);
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
    await expect(page.locator('[data-bar="0"] .cc-sub.set')).toBeVisible();
    await expect(page.locator('[data-chart-improv]')).toBeVisible();
    await page.locator('[data-chart-save]').click();
    // Back from the chart returns to Repertoire, where the saved chart is in Mine
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-repertoire="ear"]')).toBeVisible();
    await page.locator('[data-rep-tier="mine"]').click();
    await expect(page.locator('[data-rep-key^="chart:"]')).toHaveCount(1);
    // A standard's changes → play with the band → practise at the piano as a voicing drill, and back to the chart.
    await page.locator('[data-rep-search]').fill('Autumn');
    await page.locator('[data-rep-key]').first().click();
    await page.locator('[data-rep-way="chart"], [data-rep-action="band"]').first().click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await page.locator('[data-chart-practice] summary').click();
    await page.locator('[data-practice-voicing]').selectOption('drop2');
    await page.locator('[data-practice-go]').click();
    await expect(page.locator('.drill-run')).toBeVisible();
    await expect(page.locator('[data-song-chart="32"]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-rep-piece]')).toBeVisible();
    // Practice log (Progress, beside the diary): kind + minutes → saved, shown in the week total.
    await page.goto('/?sim=1#/skills');
    await page.locator('[data-open-log="progress"]').click();
    await page.locator('[data-log-kind="piece"]').click();
    await page.locator('[data-log-min="20"]').click();
    await page.locator('[data-log-save]').click();
    await expect(page.locator('[data-practice-log]')).toHaveCount(0);
    await page.locator('[data-open-log="progress"]').click();
    await expect(page.locator('.plog-week h3')).toContainText('20');
    await page.keyboard.press('Escape');
    // The mixer from the tools strip: a channel per sound; a level change shows in dB; reset.
    await page.goto('/?sim=1#/arcade');
    await page.locator('[data-hub="mixer"]').click();
    await expect(page.locator('[data-mx-ch]')).toHaveCount(4);
    await page.locator('[data-mx="bass-vol"]').fill('0.5');
    await expect(page.locator('[data-mx-ch="bass"] .mx-knob b').first()).toHaveText('-6 dB');
    await page.locator('[data-mx-reset]').click();
    await expect(page.locator('[data-mx-ch="bass"] .mx-knob b').first()).toHaveText('0 dB');
    await page.locator('.screen-head .icon-btn').first().click();
    // Slow down opens with its file picker.
    await page.locator('[data-hub="slowdown"]').click();
    await expect(page.locator('[data-slowdown-file]')).toBeAttached();
    await page.locator('.screen-head .icon-btn').first().click();
    // My pieces (keys course): Repertoire → Add a piece → Score: import a small MusicXML, set up, the first chunk.
    await switchCourse(page, 'keys');
    await page.goto('/?sim=1#/repertoire/mine');
    await page.locator('[data-rep-add]').click();
    await page.locator('[data-rep-src="score"]').click();
    const bars = Array.from({ length: 8 }, (_, i) => `<measure number="${i + 1}">${i === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' : ''}${'<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>'.repeat(4)}</measure>`).join('');
    const xml = `<?xml version="1.0"?><score-partwise><work><work-title>E2E Study</work-title></work><part-list><score-part id="P1"/></part-list><part id="P1">${bars}</part></score-partwise>`;
    await page.locator('[data-piece-file]').setInputFiles({ name: 'e2e.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
    await page.locator('[data-piece-start]').click();
    await expect(page.locator('[data-piece-practice]')).toBeVisible();
    await expect(page.locator('.pc-heat span')).toHaveCount(8);
    await expect(page.locator('.pc-task')).toContainText('55');
    // the score is a piece in Repertoire › Mine, its page opens the piece coach
    await page.goto('/?sim=1#/repertoire/mine/scores');
    await expect(page.locator('[data-rep-key^="score:"]')).toHaveCount(1);
    await page.locator('[data-rep-key^="score:"]').click();
    await page.locator('[data-rep-way="score"]').click();
    await expect(page.locator('[data-piece-practice]')).toBeVisible();
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-rep-piece^="score:"]')).toBeVisible();
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
    await expect(page.locator('.menu-group-h')).toHaveText(['Tools', 'Check yourself', 'You']);
    await page.locator('.menu-sheet .menu-head .menu-close').click();
    await page.goto('/?sim=1#/skills');
    await page.locator('#ps-tab-overview').click();
    await page.locator('.domain-tile[data-domain="pitch"]').click();
    await expect(page.locator('[data-area-sheet="pitch"]')).toBeVisible();
    await expect(page.locator('[data-area-sheet] .as-skill').first()).toBeVisible();
  });

  test('0.53: a rules challenge from the studio opens the chart with its rules; a pasted lead sheet becomes a chart', async ({ page }) => {
    await page.goto('/?unlock=all#/improv');
    await page.locator('[data-is-mode="rules"]').click(); // phase 5: Improvise opens on the scale rotation
    await page.locator('[data-is-chart-src]').selectOption('std:blue-bossa');
    await page.locator('[data-challenge="bebop-test"]').click();
    await expect(page.locator('[data-chart-player]')).toBeVisible();
    await expect(page.locator('[data-rule="note"]')).toHaveValue('guide-beats');
    await expect(page.locator('[data-rule="shape"]')).toHaveValue('end-chord-tone');
    await page.locator('[data-challenges-open]').click();
    await expect(page.locator('[data-challenge-library] [data-challenge]')).toHaveCount(90); // phase 4 added the lick challenges
    await page.locator('[data-challenge-library] [data-challenge="one-note-swing"]').click();
    await expect(page.locator('[data-rule="note"]')).toHaveValue('one-note');
    // improvise (simulator): the debrief follows with a next step
    await page.locator('[data-chart-improv]').click();
    await expect(page.locator('[data-debrief]')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-debrief-next]')).toBeVisible();
    // phase 3: the chart's Back returns to Improvise (where it was opened from)
    await page.locator('.screen-head .icon-btn').first().click();
    await expect(page.locator('[data-improv-studio]')).toBeVisible();
    // a pasted lead sheet (Repertoire › Add a piece › Lead sheet) becomes my chart, a piece with the band
    await page.goto('/?unlock=all#/repertoire/mine');
    await page.locator('[data-rep-add]').click();
    await page.locator('[data-rep-src="leadsheet"]').click();
    await page.locator('[data-leadsheet-paste]').fill('[Am]words [F]more\n[C]and [G7]more');
    await page.locator('[data-leadsheet-add]').click();
    await expect(page.locator('[data-rep-piece^="chart:"]')).toBeVisible();
    await page.locator('[data-rep-piece^="chart:"] [data-rep-main]').click();
    await expect(page.locator('[data-chart-text]')).toHaveValue('Am | F | C | G7');
  });
});
