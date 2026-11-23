// BUILD-PLAN-2026-11 phase 5 (Improvise + RBI v1): the lead sheet with the rotating scale per chord at T1–3, the T1–2
// subs, colour + tag per family, the "next" chip, a take graded into colour coverage and the mode × function stats,
// Phrase / Vary / Trade recording results, today's lick in the workout's improvisation block, the improvisation share
// in the daily workout (D2), and Improvise as a place and a button on every piece.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IMPROV_LEVELS, parseChart, transposeChart } from '../src/engine/charts';
import { MENUS, type ModeStats } from '../src/engine/rotation';
import { buildRotationSheet, cellAt, FAM_NAME, FAM_TAG, gradeRotation, improvTake, nextCell, rbiTier, SCALE_FAMS, scaleFamily, scaleShort, tonicOfChart, weakModes } from '../src/engine/rotationSheet';
import { suggestWorkout, whyOf } from '../src/engine/workout2';
import { pieceActions } from '../src/engine/repLibrary';
import { lickImprovChart } from '../src/engine/lickImprov';
import { LICKS } from '../src/engine/licks';
import { ROTATION_LEVELS, rotationCharts } from '../src/ui/ScaleRotation';

const lvl = (n: number) => IMPROV_LEVELS.find((x) => x.n === n)!.text;
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('the lead sheet: the scale per chord from the spec menus only', () => {
  it('every cell carries a scale its function opens at the tier, a family and a tag in both languages', () => {
    for (const tier of [1, 2, 3])
      for (const n of ROTATION_LEVELS)
        for (const key of [0, 3, 7])
          for (const seed of [1, 7, 42]) {
            const sh = buildRotationSheet(transposeChart(lvl(n), key), { tier, seed })!;
            expect(sh.tonic).toBe(key);
            for (const c of sh.cells) {
              const open = MENUS[c.fn].filter((e) => tier >= e.min).map((e) => e.mode);
              expect(open, `${n} T${tier} ${c.sym} ${c.fn}`).toContain(c.mode);
              expect(SCALE_FAMS).toContain(c.fam);
              expect(FAM_TAG[c.fam].en && FAM_TAG[c.fam].he).toBeTruthy();
              expect(scaleShort(c.mode, 'he')).not.toMatch(/[A-Za-z]/);
            }
          }
  });
  it('owner answers: no altered over V→major at T1; altered opens at T2; no half-whole over V→minor below T4', () => {
    const mixDone: ModeStats = { 'V-maj|mixolydian': { n: 4, cov: 0.9, last: '2026-11-20' }, 'V-maj|bebop-dominant': { n: 4, cov: 0.9, last: '2026-11-21' } };
    const t1 = buildRotationSheet(lvl(4), { tier: 1, stats: mixDone, seed: 3 })!;
    expect(t1.cells.filter((c) => c.fn === 'V-maj').every((c) => c.mode !== 'altered' && c.mode !== 'diminished')).toBe(true);
    const t2 = buildRotationSheet(lvl(4), { tier: 2, stats: mixDone, seed: 3 })!;
    expect(t2.cells.filter((c) => c.fn === 'V-maj').map((c) => c.mode)).toEqual(expect.arrayContaining([expect.stringMatching(/altered|diminished/)]));
    for (const tier of [1, 2, 3])
      for (const seed of [1, 2, 3, 4, 5]) {
        const sh = buildRotationSheet(lvl(5), { tier, seed, stats: { 'V-min|phrygian-dominant': { n: 3, cov: 1, last: 'x' }, 'V-min|altered': { n: 3, cov: 1, last: 'x' }, 'V-min|mixolydian-b6': { n: 3, cov: 1, last: 'x' } } })!;
        expect(sh.cells.filter((c) => c.fn === 'V-min').some((c) => c.mode === 'diminished')).toBe(false);
      }
  });
  it('the scale families: melodic-minor modes, HM5, symmetric and pentatonic are told apart (colour AND tag)', () => {
    expect(scaleFamily('altered')).toBe('melodic');
    expect(scaleFamily('lydian-dominant')).toBe('melodic');
    expect(scaleFamily('phrygian-dominant')).toBe('harmonic');
    expect(scaleFamily('diminished')).toBe('sym');
    expect(scaleFamily('whole-half')).toBe('sym');
    expect(scaleFamily('major-pentatonic')).toBe('penta');
    expect(scaleFamily('dorian')).toBe('major');
    expect(new Set(SCALE_FAMS.map((f) => FAM_TAG[f].en)).size).toBe(5);
    expect(new Set(SCALE_FAMS.map((f) => FAM_TAG[f].he)).size).toBe(5);
    for (const f of SCALE_FAMS) expect(FAM_NAME[f].he).not.toMatch(/[A-Za-z]/);
    const css = src('rotation.css');
    for (const f of SCALE_FAMS) expect(css).toContain(`.fam-${f} { --fam:`);
    // the tag is dark ink on the tint (no yellow, no white on pale)
    expect(css).toMatch(/\.rs-tag \{[^}]*color: #10131c/);
  });
});

describe('the T1–2 subs (and their scales)', () => {
  it('T1: VI7 for vi going to ii, shown above the original, with the scale of a V going to minor (HM5)', () => {
    const sh = buildRotationSheet(lvl(6), { tier: 1 })!;
    const sub = sh.cells.find((c) => c.sub)!;
    expect(sub.sym).toBe('Am7');
    expect(sub.sub!.sym).toBe('A7');
    expect(sub.fn).toBe('V-min');
    expect(sub.mode).toBe('phrygian-dominant');
    expect(sub.fam).toBe('harmonic');
  });
  it('T2: a passing diminished on the second half of a I going up to ii, whole-half from its root', () => {
    const sh = buildRotationSheet('Cmaj7 | Dm7 | G7 | Cmaj7', { tier: 2 })!;
    const dim = sh.cells.find((c) => c.sub?.sym === 'C♯°7')!;
    expect(dim).toBeTruthy();
    expect(dim.beats).toBe(2);
    expect(dim.mode).toBe('whole-half');
    expect(dim.rootName).toBe('C♯');
  });
  it('T3: the tritone sub of a whole-bar V (D♭7 → C), with its own scale (Lydian dominant by default)', () => {
    const sh = buildRotationSheet(lvl(4), { tier: 3 })!;
    const tt = sh.cells.find((c) => c.sub?.sym === 'D♭7')!;
    expect(tt.fn).toBe('V-sub');
    expect(tt.mode).toBe('lydian-dominant');
    expect(tt.rootName).toBe('D♭');
  });
  it('no subs at T1 on a plain ii–V–I (none fits); the tonic is guessed from the last tonic chord', () => {
    expect(buildRotationSheet(lvl(4), { tier: 1 })!.cells.some((c) => c.sub)).toBe(false);
    expect(tonicOfChart(parseChart('Dm7b5 | G7alt | Cm6 | Cm6'))).toBe(0);
    expect(tonicOfChart(parseChart('Ebmaj7 | Cm7 | Fm7 | Bb7'))).toBe(3);
  });
});

describe('the rotation over the take: the window, the next chip, the now-cue', () => {
  it('T1–2: the scale changes only between choruses; T3: every 4 bars', () => {
    const sh = buildRotationSheet(lvl(4), { tier: 2 })!;
    expect(sh.choruses).toBe(2);
    expect(new Set(sh.cells.filter((c) => c.chorus === 0).map((c) => c.window)).size).toBe(1);
    const t3 = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 3 })!;
    expect(new Set(t3.cells.map((c) => c.window)).size).toBeGreaterThanOrEqual(2);
  });
  it('the next chip names the upcoming chord and scale, flags a new scale for the same function', () => {
    const stats: ModeStats = {};
    const sh = buildRotationSheet(lvl(4), { tier: 2, stats, seed: 5 })!;
    const n0 = nextCell(sh, -1)!;
    expect(n0.cell).toBe(sh.cells[0]);
    const n = nextCell(sh, 0.5)!;
    expect(n.cell.sym).toBe('G7');
    expect(n.inBeats).toBeCloseTo(3.5);
    // a chorus boundary: where a function's scale differs from the chorus before, `changed` says so
    for (let i = 1; i < sh.cells.length; i++) {
      const c = sh.cells[i];
      const prev = sh.cells.slice(0, i).reverse().find((x) => x.fn === c.fn);
      expect(nextCell(sh, c.at - 0.5)!.changed).toBe(!!prev && prev.mode !== c.mode);
    }
    expect(cellAt(sh, -0.5)).toBe(-1);
    expect(cellAt(sh, 4.2)).toBe(1);
  });
  it('the screen: count-in + click + now-cue on the sheet (timing-cue rule), note names isolated LTR', () => {
    const ui = src('ui/ScaleRotation.tsx');
    expect(ui).toContain('chartBacking(');
    expect(ui).toMatch(/perc: \(k % sheet\.meter \? 'click' : 'accent'\)/);
    expect(ui).toContain('<BeatDots countIn={4}');
    expect(ui).toContain("i === now ? ' now' : ''");
    expect(ui).toContain('<bdi dir="ltr">{c.sym}</bdi>');
    expect(ui).toContain('<bdi dir="ltr">{c.rootName}</bdi>');
    expect(ui).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('a take: colour coverage and the stats (classifyNotes + rotationMetrics + updateModeStats)', () => {
  const sh = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 2, choruses: 1, seed: 1, stats: { 'V-maj|mixolydian': { n: 9, cov: 0.95, last: 'a' }, 'V-maj|bebop-dominant': { n: 9, cov: 0.95, last: 'a' }, 'V-maj|diminished': { n: 9, cov: 0.95, last: 'a' } } })!;
  // (T2 puts a sus before the whole-bar V: G7sus4 on beats 4–5, G7 itself on 6–7)
  const g7 = sh.cells.find((c) => c.sym === 'G7' && !c.sub)!;
  it('the setup: G7 over the altered scale at T2 when the milder ones are strong', () => {
    expect(g7.mode).toBe('altered');
    expect(g7.at).toBe(6);
  });
  it('a colour note in the span counts; chord tones alone do not', () => {
    // G7 altered: A♭ (♭9) is a colour note over G Mixolydian
    const colourTake = [{ beat: 6, dur: 0.5, midi: 71 }, { beat: 6.5, dur: 0.5, midi: 68 }, { beat: 7, dur: 1, midi: 65 }];
    const g = gradeRotation(sh, colourTake, {}, '2026-11-22');
    expect(g.hits[sh.cells.indexOf(g7)]).toBe(true);
    expect(g.m.colour).toBe(1);
    expect(g.stats['V-maj|altered']).toEqual({ n: 1, cov: 1, last: '2026-11-22' });
    const plain = gradeRotation(sh, [{ beat: 6, dur: 1, midi: 71 }, { beat: 7, dur: 1, midi: 67 }], {}, 'd');
    expect(plain.hits[sh.cells.indexOf(g7)]).toBe(false);
    expect(plain.m.colour).toBe(0);
    expect(plain.stats['V-maj|altered'].cov).toBe(0);
    // empty spans stay unmarked
    expect(plain.hits[0]).toBeNull();
  });
  it('after a take on the default scales, the next sheet moves on (a default never reads as weak)', () => {
    const first = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 2, choruses: 1 })!;
    expect(first.cells.find((c) => c.sym === 'G7' && !c.sub)!.mode).toBe('mixolydian');
    const g = gradeRotation(first, [[0, 62], [6, 71], [8, 64], [12, 67]].map(([b, m]) => ({ beat: b, dur: 1, midi: m })), {}, 'd1');
    expect(g.hits.every((h) => h === null)).toBe(true);
    const next = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 2, choruses: 1, stats: g.stats })!;
    expect(next.cells.find((c) => c.sym === 'G7' && !c.sub)!.mode).not.toBe('mixolydian');
  });
  it('the weakest scales for the profile', () => {
    expect(weakModes({ 'I|lydian': { n: 3, cov: 0.2, last: '' }, 'V-maj|altered': { n: 2, cov: 0.8, last: '' } })[0]).toMatchObject({ fn: 'I', mode: 'lydian' });
  });
});

describe('Phrase / Vary / Trade record results (one rated result each)', () => {
  it('improvTake: a rating in improv, XP by the score, a lesson id per mode', () => {
    const t = improvTake('rotation', { score: 0.8, notes: 20, tier: 2, bpm: 110, stats: { a: { n: 1, cov: 1, last: '' } }, at: '2026-11-22T10:00:00.000Z' });
    expect(t.lessonId).toBe('improv-rotation');
    expect(t.event.skill).toBe('improv');
    expect(t.event.correct).toBe(true);
    expect(t.xp).toBe(10);
    expect(t.stats).toBeTruthy();
    expect(improvTake('vary', { score: 1, notes: 2 }).xp).toBe(1);
    expect(improvTake('vary', { score: 0, notes: 6 }).event.correct).toBe(false);
    for (const k of ['phrasing', 'vary', 'trade'] as const) expect(improvTake(k, { score: 0.5, notes: 8 }).lessonId).toBe(`improv-${k}`);
  });
  it('the studio calls onTake from Phrase, Vary and Trade (and grades Phrase / Trade against the rotation)', () => {
    const ui = src('ui/ImprovStudio.tsx');
    expect(ui).toContain("onTake?.(improvTake('phrasing'");
    expect(ui).toContain("onTake?.(improvTake('vary'");
    expect(ui).toContain("onTake?.(improvTake('trade'");
    expect(ui.match(/gradeRotation\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(ui).toContain('<CovLine g={g} />');
    expect(ui).toContain("['scales', ...(onOpenChart");
  });
  it('the app books every take: the stats into settings, one completion (XP, league, course share, rating)', () => {
    const app = src('ui/App.tsx');
    expect(app).toContain('if (t.stats) updateSettings({ rotationStats: t.stats });');
    expect(app).toMatch(/recordCompletion\(\{ lessonId: t\.lessonId[^\n]*items: \[\{ id: e\.id, skill: e\.skill/);
    expect(app).toContain('onTier={(t) => updateSettings({ rotationTier: t })}');
    expect(rbiTier(0)).toBe(1);
    expect(rbiTier(2)).toBe(2);
    expect(rbiTier(5)).toBe(3);
    expect(rbiTier(5, 1)).toBe(1);
  });
});

describe("the workout's improvisation block (D2) and today's lick", () => {
  const base = { goal: 'general' as never, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view: { units: [] } as never, licksDue: 0, opened: 4, technique: true, course: 'keys' as const };
  it('an instrument course: ~20 % path, the rest 70/30 technique / improvisation (beginner 85/15)', () => {
    const w = suggestWorkout({ ...base, total: 40, techTier: 2 });
    const m = (k: string) => w.filter((b) => b.target.kind === k).reduce((a, b) => a + b.minutes, 0);
    expect(m('path')).toBe(8);
    expect(m('improv')).toBe(10);
    expect(m('keys')).toBe(22);
    const imp = w.find((b) => b.target.kind === 'improv')!;
    expect(whyOf(imp.target)).toBe('week');
    const beg = suggestWorkout({ ...base, total: 40, techTier: 1 });
    expect(beg.filter((b) => b.target.kind === 'improv').reduce((a, b) => a + b.minutes, 0)).toBe(5);
    // guitar and bass too; drums: grooves; classical: repertoire
    expect(suggestWorkout({ ...base, total: 40, techTier: 2, course: 'guitar' }).some((b) => b.target.kind === 'improv')).toBe(true);
  });
  it('the block opens Improvise on the scales with today\'s lick on top, in the key of the day; Back returns to the run', () => {
    const app = src('ui/App.tsx');
    expect(app).toMatch(/if \(mode === 'improv'\) \{\s*improvInit\.current = null;\s*improvWorkout\.current = true;/);
    expect(app).toContain('workout={improvWorkout.current}');
    expect(app).toContain("dayKey={weekKeyIfKept('major'");
    expect(app).toContain("go(workoutPending.current ? 'workoutrun' : 'arcade')) : improvInit.current");
    const ui = src('ui/ImprovStudio.tsx');
    expect(ui).toContain("useState<Mode>(workout || !initialChart ? 'scales'");
    expect(ui).toContain('top={workout && vocab?.today ? <TodayLickCard');
    expect(ui).toMatch(/const c = lickImprovChart\(lick, dayKey\);/);
  });
  it("today's lick over its chart in the key of the day", () => {
    const l = LICKS[0];
    const c = lickImprovChart(l, 3);
    expect(c.bars).toBeGreaterThanOrEqual(8);
    expect(parseChart(c.text).errors).toEqual([]);
  });
});

describe('Improvise: its own place, and a button on every piece', () => {
  it('every piece with a chart offers Improvise in the courses that improvise; the chart becomes the first rotation chart', () => {
    for (const course of ['keys', 'guitar', 'bass', 'voice', 'ear'] as const) expect(pieceActions({ ref: { kind: 'rep', id: 'x' } as never, item: undefined, std: undefined } as never, course, true).some((a) => a.k === 'improvise')).toBe(true);
    const cs = rotationCharts('he', 3, { id: 'p', title: 'Autumn Leaves', text: 'Cm7 | F7 | Bbmaj7 | Ebmaj7', style: 'swing', bpm: 120 });
    expect(cs[0]).toMatchObject({ group: 'piece', c: { id: 'piece:' } });
    expect(cs.filter((x) => x.group === 'levels').map((x) => x.c.text)).toEqual(ROTATION_LEVELS.map((n) => transposeChart(lvl(n), 3)));
  });
  it('the place route stays; old routes are untouched', () => {
    const app = src('ui/App.tsx');
    expect(app).toContain("{route === 'improv' && s.activeCourse !== 'drums' && (");
    expect(app).toContain("improvInit.current = chart;\r\n      improvWorkout.current = false;");
  });
});
