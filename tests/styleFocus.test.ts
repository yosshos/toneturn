// SPEC-STYLE-FOCUS (owner 2026-11-22): one setting per course (a main style + up to 2), every style open from day one,
// the weights (60/30/10, never zero), the path's style units, block H, the defaults, the "My styles" strip, the
// recognition game, and the exposure service (§9). Plus the everything-connects guards (XP, league, path, level test,
// workout).
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addStyle,
  allocateSlots,
  answerTaste,
  DEFAULT_FOCUS,
  focusFromPicks,
  focusOf,
  focusRef,
  heavyStyle,
  improvStyleFor,
  isStyleUnit,
  legacyFocus,
  logStyleMinutes,
  migrateStyleFocus,
  normFocus,
  offerShown,
  parseFocusRef,
  pathStyleRank,
  picksOf,
  prefsDue,
  seedOf,
  styleWeight,
  tasted,
  tasterFor,
  tasterRotation,
  tasterSentence,
  tierShares,
  togglePick,
  weakAreaOf,
  type StyleFocus,
} from '../src/engine/styleFocus';
import { MAIN_STYLES, STYLE_CHART, STYLE_COURSES, STYLE_IDS, STYLE_TEXT, styleOfFamily, styleOfLevel, stylesFor } from '../src/engine/styles';
import { styledBacking } from '../src/engine/styleBand';
import { parseChart } from '../src/engine/charts';
import { catalog } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { shownFamilies } from '../src/engine/drills/plan';
import { ladderFamiliesFor, ladderHiddenFor, pathPianoLevels, styleHiddenLevels } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { buildPath, ladderStyleOf, stepCatalogue, type PathInput } from '../src/engine/path';
import { courseInput, type CourseId } from '../src/engine/courses';
import { keyLadder, styleRungs } from '../src/engine/drills/keyIndex';
import { keyMatrix, matrixSummary } from '../src/engine/drills/keyMatrix';
import { pickStyleCells, todayTechPlan } from '../src/engine/drills/todayPlan';
import { improvMode, suggestWorkout } from '../src/engine/workout2';
import { drillXp } from '../src/engine/drills/events';
import { grooveRound, GROOVE_STYLE_OF } from '../src/engine/nameGroove';
import { entryStyle, libraryFor } from '../src/engine/repLibrary';
import { strandsFor } from '../src/engine/drills/levelTest';
import { itemFromRaw } from '../src/cloud/teacher';
import '../src/engine/topics';

const C = (main: StyleFocus['main'], also: StyleFocus['also'] = []): StyleFocus => ({ main, also });

describe('the model (§1, §3)', () => {
  it('a main style and up to two more; jazz is the default main; the guitar add-ons are "also" only', () => {
    expect(DEFAULT_FOCUS).toEqual({ main: 'jazz', also: [] });
    expect(normFocus('keys', { main: 'brazil', also: ['jazz', 'soul', 'pop'] })).toEqual({ main: 'brazil', also: ['jazz', 'soul'] });
    expect(normFocus('keys', { main: 'prog' })).toEqual(DEFAULT_FOCUS); // prog is not a keys style
    expect(focusFromPicks('guitar', ['flamenco', 'brazil'])).toEqual({ main: 'brazil', also: ['flamenco'] });
    expect(focusFromPicks('guitar', ['flamenco'])).toEqual({ main: 'jazz', also: ['flamenco'] });
    for (const s of STYLE_IDS) expect(STYLE_TEXT[s].he.length, s).toBeGreaterThan(0);
    for (const s of MAIN_STYLES) expect(STYLE_COURSES[s].length, s).toBeGreaterThan(0);
  });
  it('chips: tap adds (≤ 3), tap again removes; removing the main promotes the next; the last pick stays', () => {
    let f = DEFAULT_FOCUS;
    f = togglePick('keys', f, 'brazil');
    f = togglePick('keys', f, 'afrocuban');
    expect(picksOf(f)).toEqual(['jazz', 'brazil', 'afrocuban']);
    expect(togglePick('keys', f, 'soul')).toEqual(f); // full
    f = togglePick('keys', f, 'jazz');
    expect(f).toEqual({ main: 'brazil', also: ['afrocuban'] });
    expect(togglePick('keys', C('jazz'), 'jazz')).toEqual(C('jazz'));
  });
  it('the teacher\'s suggestion travels as an assignment ref and reads back as kind "focus"', () => {
    const ref = focusRef('keys', C('afrocuban', ['jazz']));
    expect(ref).toBe('focus:keys:afrocuban+jazz');
    expect(parseFocusRef(ref)).toEqual({ course: 'keys', focus: C('afrocuban', ['jazz']) });
    expect(parseFocusRef('topic:x:1')).toBe(null);
    const it0 = itemFromRaw({ id: 'a', kind: 'piece', lesson_id: 'piece', ref, due_on: null, strictness: 'moderate', target_bpm: null, note: null, created_at: '2026-11-23', submissions: [] });
    expect(it0.kind).toBe('focus');
  });
});

describe('the migration from the six old settings (§6)', () => {
  it('maps each old setting; old fields stay readable; nothing chosen = jazz', () => {
    expect(legacyFocus({ jazzFocus: ['ear'] }, 'ear')).toEqual(C('jazz'));
    expect(legacyFocus({ drills: { emphasis: 'classical' } }, 'keys')).toEqual(C('classical', ['jazz']));
    expect(legacyFocus({ drills: { emphasis: 'both' } }, 'keys')).toEqual(C('jazz', ['classical']));
    expect(legacyFocus({ drills: { guitarAddOns: ['flamenco', 'fingerstyle', 'prog', 'jazz'] } }, 'guitar')).toEqual(C('jazz', ['flamenco', 'fingerstyle']));
    expect(legacyFocus({ drills: { bassTrack: 'prog' } }, 'bass')).toEqual(C('prog', ['jazz']));
    expect(legacyFocus({}, 'drums')).toBe(null);
    expect(focusOf({}, 'drums')).toEqual(DEFAULT_FOCUS);
    // a stored focus wins over the old fields
    expect(focusOf({ styleFocus: { keys: C('brazil') }, drills: { emphasis: 'classical' } }, 'keys')).toEqual(C('brazil'));
    const m = migrateStyleFocus({ drills: { emphasis: 'classical', bassTrack: 'prog' } }, ['keys', 'bass', 'drums']);
    expect(m).toEqual({ keys: C('classical', ['jazz']), bass: C('prog', ['jazz']) });
    expect(migrateStyleFocus({ styleFocus: m! }, ['keys', 'bass'])).toBe(null);
  });
});

describe('one weight function (§4, §8.3)', () => {
  it('main ~60 %, also ~30 %, the rest ~10 % and never zero; core content is not weighted', () => {
    const s = { styleFocus: { keys: C('brazil', ['afrocuban']) } };
    expect(styleWeight(s, 'keys', 'brazil')).toBeCloseTo(0.6);
    expect(styleWeight(s, 'keys', 'afrocuban')).toBeCloseTo(0.3);
    const rest = stylesFor('keys').filter((x) => x !== 'brazil' && x !== 'afrocuban');
    const restSum = rest.reduce((n, x) => n + styleWeight(s, 'keys', x), 0);
    expect(restSum).toBeCloseTo(0.1);
    for (const x of rest) expect(styleWeight(s, 'keys', x), x).toBeGreaterThan(0);
    expect(styleWeight(s, 'keys', null)).toBe(1);
    // no "also": its share goes to main; the rest keeps its 10 %
    expect(tierShares(C('jazz'), ['jazz', 'brazil'])).toEqual({ main: 0.9, also: 0, rest: 0.1 });
    // a style turned down comes up less, never zero; a tasted, liked one more
    const t = answerTaste(tasted(undefined, 'soul', '2026-11-01'), 'pop', 'never', '2026-11-01');
    const s2 = { ...s, styleTaste: t };
    expect(styleWeight(s2, 'keys', 'pop', '2026-11-02')).toBeGreaterThan(0);
    expect(styleWeight(s2, 'keys', 'pop', '2026-11-02')).toBeLessThan(styleWeight(s2, 'keys', 'soul', '2026-11-02'));
  });
  it('the day\'s slots average 60/30/10 over the weeks; the rest is never starved', () => {
    const tot = { main: 0, also: 0, rest: 0 };
    for (let d = 0; d < 365; d++) {
      const a = allocateSlots(3, { main: 0.6, also: 0.3, rest: 0.1 }, seedOf(addDays('2026-01-01', d)));
      expect(a.main + a.also + a.rest).toBe(3);
      tot.main += a.main;
      tot.also += a.also;
      tot.rest += a.rest;
    }
    const n = 365 * 3;
    expect(tot.main / n).toBeGreaterThan(0.5);
    expect(tot.main / n).toBeLessThan(0.7);
    expect(tot.also / n).toBeGreaterThan(0.2);
    expect(tot.rest / n).toBeGreaterThan(0.04);
  });
  it('improvisation: the band and the tune in the main style in about 60 % of sessions', () => {
    const s = { styleFocus: { keys: C('brazil', ['soul']) } };
    const by: Record<string, number> = {};
    for (let d = 0; d < 365; d++) {
      const x = improvStyleFor(s, 'keys', addDays('2026-01-01', d));
      by[x] = (by[x] ?? 0) + 1;
    }
    expect(by.brazil / 365).toBeGreaterThan(0.5);
    expect(by.brazil / 365).toBeLessThan(0.72);
    expect(by.soul / 365).toBeGreaterThan(0.18);
    expect(365 - by.brazil - by.soul).toBeGreaterThan(10); // the rest gets its share too
  });
  it('a classical main style plays repertoire in the improvisation share; the workout block carries today\'s style', () => {
    expect(improvMode('keys', undefined, 'classical')).toBe('repertoire');
    expect(improvMode('keys', undefined, 'jazz')).toBe('improv');
    expect(improvMode('drums', undefined, 'classical')).toBe('grooves');
  });
});

describe('every style open from day one (§2, §8.1)', () => {
  it('Practice shows every family whatever the old emphasis / add-ons / track', () => {
    const ids = (o: Parameters<typeof shownFamilies>[0]) => shownFamilies(o).map((f) => f.id);
    expect(ids({ emphasis: 'classical', instrument: 'piano' })).toEqual(ids({ emphasis: 'jazz', instrument: 'piano' }));
    expect(ids({ emphasis: 'both', instrument: 'guitar', guitarAddOns: [] })).toEqual(expect.arrayContaining(['g-flamenco', 'g-fingerstyle', 'g-prog', 'g-jazz']));
    expect(ids({ emphasis: 'both', instrument: 'bass', bassTrack: 'jazz' })).toEqual(ids({ emphasis: 'both', instrument: 'bass', bassTrack: 'prog' }));
  });
  it('the path leaves out only the styled levels outside the focus (they stay in Practice); the jazz core never', () => {
    const jz = new Set(styleHiddenLevels('bass', C('jazz')));
    expect(jz.has('b-latin-1')).toBe(true);
    expect(jz.has('b-walk-1')).toBe(false);
    expect(jz.has('b-swing-1')).toBe(false); // jazz-styled: core
    const ac = new Set(styleHiddenLevels('bass', C('afrocuban')));
    expect(ac.has('b-latin-1')).toBe(false);
    expect(ac.has('b-latin-8')).toBe(true); // baião is Brazilian
    expect(ladderHiddenFor('bass', undefined, undefined, false, undefined, C('jazz'))).toContain('b-prog-1');
    expect(pathStyleRank(C('brazil', ['soul']), 'soul')).toBe(2);
    expect(pathStyleRank(C('brazil'), null)).toBe(0);
  });
});

describe('the path: style units of the main style every 2–3 core units (§4)', () => {
  const base: PathInput = { track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: ['jazz'], plays: ['bass'], minutes: 20, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-23T10:00:00Z') };
  it('isStyleUnit: two core units, then a style unit', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => isStyleUnit(n))).toEqual([false, false, true, false, false, true]);
  });
  it('fixture: the main style\'s levels come only in style units; without the style in focus they are not pushed', () => {
    const fams = ['b-pluck', 'b-time', 'b-fret', 'b-latin'];
    const view = (focus: StyleFocus) => buildPath({ ...courseInput(base, 'bass'), ladderFamilies: fams, ladderHidden: styleHiddenLevels('bass', focus), styleFocus: focus });
    const latinUnits = (v: ReturnType<typeof buildPath>) => v.units.filter((u) => u.steps.some((x) => x.step.ladder?.family === 'b-latin')).map((u) => u.n);
    const ac = latinUnits(view(C('afrocuban')));
    expect(ac.length).toBeGreaterThan(0);
    for (const n of ac) expect(isStyleUnit(n), `unit ${n}`).toBe(true);
    expect(latinUnits(view(C('jazz')))).toEqual([]);
    expect(ladderStyleOf('b-latin-1')).toBe('afrocuban');
  });
});

describe('block H: the style block in the matrix (§5)', () => {
  it('styled levels that play in any key become style rungs, open at the tier, with their tier in the focus', () => {
    const rungs = styleRungs(catalog(), 5, C('brazil', ['soul']));
    const br = rungs.find((r) => r.style === 'brazil');
    expect(br?.block).toBe('H');
    expect(br?.tier).toBe('main');
    expect(rungs.every((r) => r.block === 'H')).toBe(true);
    // beginner style rungs exist from T0
    expect(styleRungs(catalog(), 0).length).toBeGreaterThan(0);
  });
  it('the content agent\'s families feed block H by their tags (k-brazil, k-montuno, g-brazil, g-guajeo); hidden levels never', () => {
    expect(styleOfFamily({ id: 'k-brazil', styleId: 'brazil' })).toBe('brazil');
    const piano = styleRungs(catalog(), 5, C('brazil', ['afrocuban']));
    expect(piano.some((r) => r.fam === 'k-brazil' && r.style === 'brazil' && r.tier === 'main')).toBe(true);
    expect(piano.some((r) => r.fam === 'k-montuno' && r.style === 'afrocuban' && r.tier === 'also')).toBe(true);
    expect(piano.some((r) => r.id === 'k-montuno-3')).toBe(false); // hidden until verified ('montuno-lines')
    const gtr = styleRungs(guitarCatalog().filter((f) => f.instruments.includes('guitar') && !f.retired), 5, C('brazil'));
    expect(gtr.some((r) => r.fam === 'g-brazil')).toBe(true);
    expect(gtr.some((r) => r.fam === 'g-guajeo')).toBe(true);
  });
  it('the band plays the style: the band engine\'s Brazilian and Afro-Cuban styles back any chart', () => {
    expect(STYLE_CHART.afrocuban).toBe('mambo');
    const p = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
    for (const st of ['bossa', 'swing'] as const) expect(styledBacking(p, st, 100, 1).events.length, st).toBeGreaterThan(8);
    for (const st of ['mambo', 'samba', 'baiao', 'chacha', 'songo', 'bolero'] as const) {
      const b = styledBacking(p, st, 100, 1);
      expect(b.events.filter((e) => e.inst === 'piano').length, st).toBeGreaterThan(0);
      expect(b.events.filter((e) => e.inst === 'bass').length, st).toBeGreaterThan(0);
      expect(b.length, st).toBeGreaterThan(0);
    }
  });
  it('the matrix gets H cells; the summary counts only the focus styles; today\'s plan gives them their slice', () => {
    const cells = keyMatrix(catalog(), 3, {}, { focus: C('brazil'), groups: ['major'], day: '2026-11-23' });
    const h = cells.filter((c) => c.block === 'H');
    expect(h.length).toBeGreaterThan(0);
    expect(h.some((c) => c.tier === 'main')).toBe(true);
    const sum = matrixSummary(cells);
    expect(sum.cells).toBe(cells.filter((c) => c.tier !== 'rest').length);
    const plan = todayTechPlan(cells, { minutes: 40, weekRoot: 0, focus: C('brazil'), day: '2026-11-23' });
    expect(plan.some((p) => p.why === 'style')).toBe(true);
    expect(plan.filter((p) => p.why !== 'style').every((p) => p.cell.block !== 'H')).toBe(true);
    // over many days the rest gets picked too (exposure, never zero)
    let rest = 0;
    for (let d = 0; d < 60; d++) rest += pickStyleCells(cells, C('brazil'), 12, addDays('2026-11-01', d)).filter((c) => c.tier === 'rest').length;
    expect(rest).toBeGreaterThan(0);
  });
  it('a key session takes one H rung of the focus styles (main first), never a rest one', () => {
    const lad = keyLadder(catalog(), 0, 'major', 4, {}, { focus: C('brazil') });
    const hs = (lad?.levels ?? []).filter((l) => l.id.includes('accomp-6') || l.id.includes('k-organ') || l.id.includes('k-pop'));
    expect(hs.every((l) => !l.id.includes('k-organ') && !l.id.includes('k-pop'))).toBe(true);
  });
});

describe('defaults and places (§4)', () => {
  it('Repertoire knows the style of an entry (a bossa standard is Brazilian)', () => {
    const lib = libraryFor('keys', 'on');
    const styles = new Set(lib.map((e) => entryStyle(e)));
    expect(styles.has('jazz')).toBe(true);
    expect(styles.has('brazil')).toBe(true);
  });
  it('the recognition game leans on the focus styles, and every style still appears', () => {
    const count = (focus?: string[]) => {
      let mine = 0;
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const r = grooveRound(7, i, 6, undefined, focus as never);
        seen.add(r.answer);
        if (focus?.includes(GROOVE_STYLE_OF[r.answer])) mine++;
      }
      return { mine, seen };
    };
    const f = count(['brazil']);
    const none = count();
    expect(f.mine).toBeGreaterThan(150);
    expect(f.seen.size).toBeGreaterThan(10);
    // without focus the rounds are as before (deterministic)
    expect(grooveRound(7, 3, 6)).toEqual(grooveRound(7, 3, 6, undefined, undefined));
    expect(none.seen.size).toBeGreaterThan(10);
  });
});

describe('exposure to the styles not chosen (§9)', () => {
  const s0 = { styleFocus: { keys: C('jazz') }, styleTaste: { since: '2026-01-01' } };
  it('a taster about every two weeks, ranked by relevance to the main style, the weak area and the longest since', () => {
    const first = tasterFor(s0, 'keys', '2026-01-20');
    expect(first?.style).toBe('soul'); // jazz → gospel / soul first (§9.3)
    expect(first?.gain.en).toMatch(/IV–I/);
    const t1 = tasted(offerShown(s0.styleTaste, '2026-01-20'), 'soul', '2026-01-20');
    expect(tasterFor({ ...s0, styleTaste: t1 }, 'keys', '2026-01-25')).toBe(null);
    const next = tasterFor({ ...s0, styleTaste: t1 }, 'keys', '2026-02-04');
    expect(next?.style).not.toBe('soul');
    // weak melody → bossa ranks higher
    expect(tasterRotation(s0, 'keys', '2026-01-20', 'melody').indexOf('brazil')).toBeLessThan(tasterRotation(s0, 'keys', '2026-01-20', null).indexOf('brazil'));
  });
  it('"don\'t offer" holds for 6 months; every other unchosen style is tasted at least once a quarter', () => {
    const t = answerTaste(s0.styleTaste, 'soul', 'never', '2026-01-20');
    for (let d = 0; d < 170; d += 14) expect(tasterFor({ ...s0, styleTaste: { ...t, lastOffer: addDays('2026-01-20', d - 14) } }, 'keys', addDays('2026-01-20', d))?.style).not.toBe('soul');
    // simulate a year of tasters: each unchosen, not declined style comes within every 91 days
    let st = { ...s0.styleTaste } as typeof s0.styleTaste & Record<string, unknown>;
    const last: Record<string, string> = {};
    for (let d = 0; d < 365; d++) {
      const day = addDays('2026-01-01', d);
      const o = tasterFor({ ...s0, styleTaste: st }, 'keys', day);
      if (o) {
        st = tasted(st, o.style, day) as typeof st;
        last[o.style] = day;
      }
    }
    const stylesNotChosen = stylesFor('keys', { main: true }).filter((x) => x !== 'jazz');
    for (const x of stylesNotChosen) expect(last[x], x).toBeDefined();
  });
  it('add (swap one out when full) / not now / never; the 6-month look; the >20 % trigger', () => {
    expect(addStyle('keys', C('jazz'), 'brazil')).toEqual(C('jazz', ['brazil']));
    expect(addStyle('keys', C('jazz', ['brazil', 'soul']), 'afrocuban')).toBe(null);
    expect(addStyle('keys', C('jazz', ['brazil', 'soul']), 'afrocuban', 'soul')).toEqual(C('jazz', ['brazil', 'afrocuban']));
    expect(prefsDue({ since: '2026-01-01' }, '2026-06-01')).toBe(false);
    expect(prefsDue({ since: '2026-01-01' }, '2026-07-05')).toBe(true);
    expect(prefsDue({ since: '2026-01-01', prefsSeen: '2026-07-05' }, '2026-08-01')).toBe(false);
    let log = logStyleMinutes(undefined, { d: '2026-11-01', c: 'keys', s: 'jazz', m: 40, w: 'improv' });
    log = logStyleMinutes(log, { d: '2026-11-05', c: 'keys', s: 'brazil', m: 15, w: 'improv' });
    expect(heavyStyle({ ...s0, styleMinutes: log }, 'keys', '2026-11-10')).toBe('brazil');
    expect(heavyStyle({ ...s0, styleFocus: { keys: C('jazz', ['brazil']) }, styleMinutes: log }, 'keys', '2026-11-10')).toBe(null);
    expect(tasterSentence('pop', 'jazz').en).toMatch(/7th chords/);
    expect(weakAreaOf({ rhythm: { r: 900, n: 5 }, chords: { r: 1100, n: 5 }, degrees: { r: 1150, n: 5 } })).toBe('timing');
  });
});

describe('everything connects (XP, league, path, level test, workout)', () => {
  const styledLevels = () => [...catalog().flatMap((f) => f.levels.map((l) => ({ f, l }))), ...guitarCatalog().filter((f) => !f.retired).flatMap((f) => f.levels.map((l) => ({ f, l })))].filter(({ f, l }) => styleOfLevel(l, f));
  it('every styled level is a path step and open in Practice; in focus it is not hidden from the path', () => {
    const steps = new Set(stepCatalogue().filter((s) => s.ladder).map((s) => s.ladder!.ref));
    const xs = styledLevels();
    expect(xs.length).toBeGreaterThan(20);
    for (const { f, l } of xs) {
      expect(steps.has(l.id), l.id).toBe(true);
      const st = styleOfLevel(l, f)!;
      const inst = (f as unknown as { instruments?: string[] }).instruments?.[0];
      const course: CourseId = !inst ? 'keys' : inst === 'guitar' ? 'guitar' : inst === 'bass' ? 'bass' : 'drums';
      if (!STYLE_COURSES[st].includes(course)) continue;
      const focus = normFocus(course, MAIN_STYLES.includes(st) ? { main: st } : { main: 'jazz', also: [st] });
      expect(styleHiddenLevels(course, focus), `${l.id} in ${course}`).not.toContain(l.id);
      expect(ladderFamiliesFor(course, DEFAULT_DRILL_SETTINGS, course === 'bass' ? 'upright' : undefined)).toContain(f.id);
    }
  });
  it('XP is the same in every style (a take\'s XP reads only its verdict); leagues count XP', () => {
    expect(drillXp({ verdict: 'clean' } as never)).toBe(4);
    expect(drillXp.length).toBe(1);
  });
  it('the level test offers every piano level the path teaches (styled ones included) and never drops jazz by emphasis', () => {
    const lv = new Set(pathPianoLevels());
    const piano = new Set(catalog().map((f) => f.id));
    for (const { l } of styledLevels().filter(({ f }) => piano.has(f.id))) expect(lv.has(l.id), l.id).toBe(true);
    expect(strandsFor('piano', 'both').length).toBe(strandsFor('piano', 'jazz').length);
  });
  it('the workout: block H feeds today\'s technique; the improvisation block carries today\'s style', () => {
    const view = buildPath({ ...courseInput({ track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: ['jazz'], plays: ['keys'], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-23T10:00:00Z') }, 'keys') });
    const w = suggestWorkout({ total: 40, goal: 'general', priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view, technique: true, course: 'keys', techTier: 3, opened: 5, mainStyle: 'brazil', improvStyle: 'brazil' });
    const imp = w.find((b) => b.target.kind === 'improv');
    expect(imp && imp.target.kind === 'improv' ? imp.target.style : null).toBe('brazil');
    expect(styleOfFamily({ id: 'b-latin' })).toBe('afrocuban');
  });
});
