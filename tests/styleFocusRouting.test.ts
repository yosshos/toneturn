// SPEC-STYLE-FOCUS audit fixes (2026-11-23): styleWeight routed through block H, the improvisation pick, today's lick and
// the Repertoire goal (with the taste factor: liked ×2, declined ×0.4); "jazz rungs a tier earlier" from the focus; the
// drums' style block (grooves by tempo, 60/30/10); the repertoire goal by the main style and its minutes per style; the
// rule cards by style (the clave, the samba phrase); the level test's style check; the core's neighbour-style moment;
// the taster's lick part falling back to the library on the style.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { addDays, improvStyleFor, offeredWeights, styleWeight, weightedFocus, heaviestStyle, logStyleMinutes, heavyStyle, type StyleFocus } from '../src/engine/styleFocus';
import { stylesFor } from '../src/engine/styles';
import { catalog } from '../src/engine/drills/generate';
import { keyMatrix } from '../src/engine/drills/keyMatrix';
import { jazzFirst, openKeyRungs } from '../src/engine/drills/keyIndex';
import { pickStyleCells } from '../src/engine/drills/todayPlan';
import { todaysLick } from '../src/engine/vocab';
import { LICKS, type Lick } from '../src/engine/licks';
import { drumStyleBlock, grooveTempo } from '../src/engine/drills/drumStyleBlock';
import { families } from '../src/engine/drills/plan';
import { repGoalFor, repItemStyle, styleGoalTitle } from '../src/engine/repStyleGoal';
import { repertoireFor } from '../src/engine/repertoire';
import { checkCard, cardKept, CLAVE_STROKES, STYLE_CARD_IDS, type CNote, type CSpan } from '../src/engine/ruleCards';
import { challengesForStyle, familyOf, RULE_NAME } from '../src/engine/improvRules';
import { styleStrand, strandsFor } from '../src/engine/drills/levelTest';
import { buildPath, stepCatalogue } from '../src/engine/path';
import { NEIGHBOUR_MOMENTS, neighbourMoments } from '../src/engine/pathBonus';
import { isVerified } from '../src/engine/verifiedContent';
const verifiedLevel = (id: string) => isVerified(`level:${id}`);
import { tasteParts, tasteLick } from '../src/ui/StyleTaster';
import { LickTrainerScreen } from '../src/ui/LickTrainer';
import { DEFAULT_SETTINGS } from '../src/storage/progress';
import type { ItemState } from '../src/engine/drills/types';
import '../src/engine/topics';

const C = (main: StyleFocus['main'], also: StyleFocus['also'] = []): StyleFocus => ({ main, also });

describe('styleWeight is THE weight everywhere (§4, §9.2)', () => {
  it('offered weights: 60 / 30 / 10, the rest by taste (liked ×2, declined ×0.4), never zero', () => {
    const s = { styleFocus: { keys: C('brazil', ['afrocuban']) }, styleTaste: { by: { soul: { tasted: '2026-11-01', answer: 'later' as const }, pop: { answer: 'never' as const, declinedUntil: '2027-05-01' } } } };
    const w = offeredWeights(s, 'keys', stylesFor('keys', { main: true }), '2026-11-23');
    expect(w.brazil).toBeCloseTo(0.6);
    expect(w.afrocuban).toBeCloseTo(0.3);
    expect(w.soul!).toBeGreaterThan(w.neworleans!);
    expect(w.pop!).toBeLessThan(w.neworleans!);
    expect(w.pop!).toBeGreaterThan(0);
    // the full weights agree with styleWeight
    const wf = weightedFocus(s, 'keys', '2026-11-23');
    for (const x of stylesFor('keys')) expect(wf.w![x]).toBeCloseTo(styleWeight(s, 'keys', x, '2026-11-23'));
  });
  it('the improvisation pick draws by it: ~60 % main over a year, a liked style more often than a declined one', () => {
    const s = { styleFocus: { keys: C('brazil', ['afrocuban']) }, styleTaste: { by: { soul: { tasted: '2026-01-01', answer: 'later' as const }, pop: { answer: 'never' as const, declinedUntil: '2030-01-01' } } } };
    const n: Record<string, number> = {};
    for (let d = 0; d < 1000; d++) {
      const x = improvStyleFor(s, 'keys', addDays('2026-01-01', d));
      n[x] = (n[x] ?? 0) + 1;
    }
    expect(n.brazil / 1000).toBeGreaterThan(0.5);
    expect(n.brazil / 1000).toBeLessThan(0.7);
    expect(n.afrocuban / 1000).toBeGreaterThan(0.2);
    expect(n.soul ?? 0).toBeGreaterThan(n.pop ?? 0);
  });
  it('block H: a weighted focus draws the rest tier by taste — a declined style comes up less than a liked one', () => {
    const cells = keyMatrix(catalog(), 5, {}, { focus: C('jazz'), groups: ['major'], day: '2026-11-23' });
    const rest = [...new Set(cells.filter((c) => c.block === 'H' && c.tier === 'rest').map((c) => c.style!))];
    expect(rest.length).toBeGreaterThanOrEqual(2);
    const [liked, declined] = rest;
    const s = { styleFocus: { keys: C('jazz') }, styleTaste: { by: { [liked]: { tasted: '2026-10-01', answer: 'later' as const }, [declined]: { answer: 'never' as const, declinedUntil: '2030-01-01' } } } };
    let nl = 0, nd = 0;
    for (let d = 0; d < 200; d++) {
      const day = addDays('2026-01-01', d);
      for (const c of pickStyleCells(cells, weightedFocus(s, 'keys', day), 40, day)) {
        if (c.style === liked) nl++;
        if (c.style === declined) nd++;
      }
    }
    expect(nl).toBeGreaterThan(nd);
    expect(nd).toBeGreaterThan(0);
  });
  it("today's lick prefers the focus styles", () => {
    const a = { ...LICKS[0], id: 'a-jazz' } as Lick;
    const b = { ...LICKS[1], id: 'b-bossa', style: 'brazil' } as Lick;
    const s = { styleFocus: { keys: C('brazil') } };
    expect(todaysLick([a, b], undefined, {})?.id).toBe('a-jazz');
    expect(todaysLick([a, b], undefined, {}, new Date(), (l) => styleWeight(s, 'keys', l.style ?? 'jazz'))?.id).toBe('b-bossa');
  });
  it('the place leads with the heaviest style it has content for', () => {
    expect(heaviestStyle({ styleFocus: { keys: C('brazil', ['soul']) } }, 'keys', ['jazz', 'soul'])).toBe('soul');
    expect(heaviestStyle({ styleFocus: { keys: C('brazil') } }, 'keys', ['jazz', 'brazil'])).toBe('brazil');
  });
});

describe('jazz rungs a tier earlier come from the focus (§6), the old emphasis only without one', () => {
  it('jazzFirst', () => {
    expect(jazzFirst({ focus: C('jazz') })).toBe(true);
    expect(jazzFirst({ focus: C('classical'), jazz: true })).toBe(false);
    expect(jazzFirst({ jazz: true })).toBe(true);
    expect(jazzFirst({})).toBe(false);
  });
  it('a jazz main style opens the jazz rungs at a lower tier than a classical one, whatever the old emphasis says', () => {
    const fams = catalog();
    const ids = (o: Parameters<typeof openKeyRungs>[4]) => new Set(openKeyRungs(fams, 0, 'major', 3, o).built.map((b) => b.lvl.id));
    const jazz = ids({ focus: C('jazz'), jazz: false });
    const classical = ids({ focus: C('classical'), jazz: true });
    expect([...jazz].filter((x) => !classical.has(x)).length).toBeGreaterThan(0);
    expect(ids({ focus: C('classical'), jazz: true })).toEqual(ids({ focus: C('classical'), jazz: false }));
  });
});

describe('drums: the style block is grooves by tempo, 60/30/10 (§5)', () => {
  it('picks styled grooves by the focus shares, each at its next tempo', () => {
    const fams = families('drums');
    const f = weightedFocus({ styleFocus: { drums: C('afrocuban', ['soul']) } }, 'drums', '2026-11-23');
    const tally: Record<string, number> = { main: 0, also: 0, rest: 0 };
    for (let d = 0; d < 90; d++) for (const p of drumStyleBlock(fams, {}, f, 5, 10, addDays('2026-08-01', d))) tally[p.tier]++;
    const tot = tally.main + tally.also + tally.rest;
    expect(tot).toBeGreaterThan(0);
    expect(tally.main / tot).toBeGreaterThan(0.45);
    expect(tally.rest).toBeGreaterThan(0);
    const one = drumStyleBlock(fams, {}, f, 5, 10, '2026-11-23');
    for (const p of one) {
      expect(p.style).toBeTruthy();
      expect(p.drill.startBpm).toBe(p.tempo);
      expect(p.tempo).toBeLessThanOrEqual(p.target);
    }
  });
  it('the tempo ladder: start, then the clean tempo plus a step, capped at the target', () => {
    expect(grooveTempo(undefined, 70, 110)).toBe(70);
    expect(grooveTempo({ takes: 3, cleanBpm: 90, history: [], passLog: [] } as unknown as ItemState, 70, 110)).toBe(94);
    expect(grooveTempo({ takes: 3, cleanBpm: 109, history: [], passLog: [] } as unknown as ItemState, 70, 110)).toBe(110);
  });
});

describe('Repertoire follows the main style (§4, §9.4)', () => {
  it('"your nth <style> piece" when the main style has pieces; jazz keeps the road to the standards', () => {
    const keys = repertoireFor('keys');
    const styled = keys.find((it) => repItemStyle(it) && repItemStyle(it) !== 'jazz');
    expect(styled).toBeTruthy();
    const st = repItemStyle(styled!)!;
    const g = repGoalFor('keys', {}, { styleFocus: { keys: C(st) } });
    expect(g.id).toBe(`style-${st}`);
    expect(g.title.en).toContain('first');
    expect(repItemStyle(g.next!)).toBe(st);
    const learned = { [keys.filter((it) => repItemStyle(it) === st)[0].id]: { best: 1, completions: 1 } };
    const g2 = repGoalFor('keys', learned as never, { styleFocus: { keys: C(st) } });
    if (keys.filter((it) => repItemStyle(it) === st).length > 1) expect(g2.title.en).toContain('second');
    expect(repGoalFor('keys', {}, { styleFocus: { keys: C('jazz') } }).id).toBe('first-standard');
    expect(styleGoalTitle('brazil', 3)).toEqual({ en: 'Your third Brazilian piece', he: 'היצירה השלישית שלכם בסגנון ברזילאי' });
  });
  it('repertoire minutes per style feed the > 20 % trigger', () => {
    let log = logStyleMinutes(undefined, { d: '2026-11-20', c: 'keys', s: 'jazz', m: 30, w: 'improv' });
    log = logStyleMinutes(log, { d: '2026-11-21', c: 'keys', s: 'soul', m: 20, w: 'rep' });
    expect(heavyStyle({ styleFocus: { keys: C('jazz') }, styleMinutes: log }, 'keys', '2026-11-23')).toBe('soul');
  });
});

describe('Improvise: rules by style (§4) — the clave and the samba phrase, as rule cards', () => {
  const spans: CSpan[] = [{ at: 0, beats: 32, root: 0, iv: [0, 4, 7, 10] }];
  const ctx = (notes: CNote[]) => ({ notes, spans, meter: 4, bpm: 100 });
  const phrase = (start: number, n = 4, step = 0.5): CNote[] => Array.from({ length: n }, (_, i) => ({ beat: start + i * step, dur: 0.4, midi: 60 + i }));
  it('the cards exist, named in both languages, in their slots', () => {
    expect(STYLE_CARD_IDS).toEqual(['clave-two-side', 'clave-stroke', 'clave-even', 'clave-ponche', 'samba-phrase']);
    for (const id of STYLE_CARD_IDS) {
      expect((RULE_NAME as Record<string, { he: string }>)[id].he.length).toBeGreaterThan(0);
      expect(['rhythm', 'shape']).toContain(familyOf(id as never));
    }
    expect(challengesForStyle('afrocuban').map((c) => c.id)).toEqual(['clave-2-side', 'clave-on', 'clave-ponche', 'montuno-trade']);
    expect(challengesForStyle('brazil').map((c) => c.id)).toEqual(['samba-phrase', 'bossa-space']);
  });
  it('2-3 clave: phrases starting in the two-side bar pass; in the three-side they fail', () => {
    expect(cardKept('clave-two-side', checkCard('clave-two-side', ctx([...phrase(1), ...phrase(9)])))).toBe(true);
    expect(cardKept('clave-two-side', checkCard('clave-two-side', ctx([...phrase(5), ...phrase(13)])))).toBe(false);
  });
  it('a phrase on a clave stroke (2-3: 1, 2, 4, 5½, 7 beats into the cycle)', () => {
    expect(CLAVE_STROKES['23']).toEqual([1, 2, 4, 5.5, 7]);
    expect(cardKept('clave-stroke', checkCard('clave-stroke', ctx([...phrase(5.5), ...phrase(10)])))).toBe(true);
    expect(cardKept('clave-stroke', checkCard('clave-stroke', ctx([...phrase(0.5), ...phrase(8.5)])))).toBe(false);
  });
  it('phrases of whole cycles, and landing on the ponche (beat 4 of the three-side)', () => {
    const twoBars = Array.from({ length: 15 }, (_, i) => ({ beat: i * 0.5, dur: 0.45, midi: 60 + (i % 5) }));
    expect(cardKept('clave-even', checkCard('clave-even', ctx(twoBars)))).toBe(true);
    expect(cardKept('clave-even', checkCard('clave-even', ctx(phrase(3, 4, 1))))).toBe(false);
    // 2-3: the three-side is bar 2 of the cycle — its beat 4 is 7 beats in
    expect(cardKept('clave-ponche', checkCard('clave-ponche', ctx([...phrase(5.5, 4, 0.5)])))).toBe(true);
    expect(cardKept('clave-ponche', checkCard('clave-ponche', ctx([...phrase(0, 3, 0.5)])))).toBe(false);
  });
  it('a samba phrase: off the downbeat at both ends, straight eighths', () => {
    expect(cardKept('samba-phrase', checkCard('samba-phrase', ctx([...phrase(0.5, 4), ...phrase(4.5, 4)])))).toBe(true);
    expect(cardKept('samba-phrase', checkCard('samba-phrase', ctx([...phrase(0, 4), ...phrase(4, 5)])))).toBe(false);
    const swung = [0.67, 1.67, 2.67].map((b) => ({ beat: b, dur: 0.3, midi: 62 }));
    expect(cardKept('samba-phrase', checkCard('samba-phrase', ctx(swung)))).toBe(false);
  });
});

describe('the level test: one short check in the main style (§4)', () => {
  it('a style strand of up to 4 of the style family\'s levels, placing the family; none for jazz', () => {
    const st = styleStrand('piano', 'brazil')!;
    expect(st.id).toBe('style');
    expect(st.rungs.length).toBeGreaterThanOrEqual(2);
    expect(st.rungs.length).toBeLessThanOrEqual(4);
    expect(st.rungs.every((r) => r.level.startsWith('k-brazil'))).toBe(true);
    expect(Object.keys(st.rungs[0].places)).toEqual(['k-brazil']);
    expect(st.title.he).toContain('ברזילאי');
    expect(styleStrand('piano', 'jazz')).toBeNull();
    const all = strandsFor('piano', 'both', { style: 'afrocuban' });
    expect(all.at(-1)!.id).toBe('style');
    // the hidden montuno line levels never come into the check (only ponchando / songo, verified)
    expect(all.at(-1)!.rungs.every((r) => verifiedLevel(r.level))).toBe(true);
    expect(strandsFor('drums', 'both', { style: 'brazil' }).some((x) => x.id === 'style')).toBe(true);
  });
});

describe('the core ii–V–I unit includes its neighbour-style moment (§9)', () => {
  it('the moments are the styled levels (bossa; montuno ponchando — never a hidden line level)', () => {
    const byId = new Map(stepCatalogue().map((s) => [s.id, s]));
    const ms = neighbourMoments(['tech:voicings-3'], byId);
    expect(ms.map((m) => m.id)).toEqual(['moment:keys:iivi-bossa', 'moment:keys:iivi-ponchando']);
    expect(ms.every((m) => m.bonus)).toBe(true);
    expect(ms[1].ladder?.ref).toBe('k-montuno-12');
    expect(verifiedLevel('k-montuno-12')).toBe(true);
    expect(verifiedLevel('k-montuno-9')).toBe(true); // the line levels, open since 2026-11-23 (THEORY-QUESTIONS 13)
    for (const m of NEIGHBOUR_MOMENTS.flatMap((x) => x.moments)) expect(byId.has(m.level), m.level).toBe(true);
  });
  it('the ponchando ii–V–I is block chords only', () => {
    const lv = catalog().find((f) => f.id === 'k-montuno')!.levels.find((l) => l.id === 'k-montuno-12')!;
    expect(lv.specs.every((s) => s.kind === 'mt-ponch')).toBe(true);
  });
  it('a path unit holding the core ii–V–I shows them as optional steps', () => {
    const steps: Record<string, { stars: number; at: string }> = {};
    const v = buildPath({
      ratings: {},
      events: [],
      track: 'student',
      minutes: 10,
      facts: { steps },
      leaveOut: [],
      packs: [],
      plays: ['keys'],
      goal: 'general',
      keep: [],
      hidden: [],
      reviewDue: 0,
      now: new Date('2026-11-23T10:00:00Z'),
      course: 'keys',
    } as never);
    const all = [...v.units, ...v.history].flatMap((u) => u.steps.map((x) => x.step.id));
    if (all.includes('tech:voicings-3')) expect(all).toContain('moment:keys:iivi-bossa');
  });
});

describe('the taster\'s lick part falls back to the library on the style (§9.1)', () => {
  it('the lick part stays without a style lick (Afro-Cuban: none verified), and the library opens filtered to the style', () => {
    expect(tasteLick('afrocuban')).toBeNull();
    expect(tasteParts('keys', 'afrocuban')).toContain('lick');
    expect(tasteParts('drums', 'afrocuban')).not.toContain('lick');
    const html = renderToStaticMarkup(createElement(LickTrainerScreen, { lang: 'he', settings: { ...DEFAULT_SETTINGS, activeCourse: 'keys' }, items: {}, onSettings: () => {}, onTake: () => {}, onUsed: () => {}, onBack: () => {}, startStyle: 'afrocuban' } as never));
    expect(html).toContain('data-lick-style-empty="afrocuban"');
    expect(html).toContain('data-lick-style-pick="afrocuban"');
    expect(html).toContain('אפרו-קובני');
  });
  it('a style with a verified device (2026-11-23: the bossa inner line) gives the taster its lick', () => {
    expect(tasteLick('brazil')?.id).toBe('sty-br-inner');
    expect(tasteLick('neworleans')?.id).toBe('sty-nola-line');
    const html = renderToStaticMarkup(createElement(LickTrainerScreen, { lang: 'he', settings: { ...DEFAULT_SETTINGS, activeCourse: 'keys' }, items: {}, onSettings: () => {}, onTake: () => {}, onUsed: () => {}, onBack: () => {}, startStyle: 'brazil' } as never));
    expect(html).not.toContain('data-lick-style-empty');
    expect(html).toContain('data-lick-card="sty-br-inner"');
  });
});
