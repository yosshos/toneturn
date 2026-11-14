// AUDIT-DEPTH-3: the path order inside 700–1900 (the Harris rules before the pivots), improvising under rule cards as
// path steps on piano, guitar and bass (C5), the comp-and-solo duo (C7), the written solo chorus (C6), the graded
// improvising right hand of voicings 17 / accomp 16, and the wiring (glyphs, badges, lessons, level test, events).
import { describe, expect, it } from 'vitest';
import { stepCatalogue, NON_MONOTONE_FAMILIES, PATH_CAP } from '../src/engine/path';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { drillEvents } from '../src/engine/drills/events';
import { hasRubato } from '../src/engine/drills/rubato';
import { pianoStrands, guitarStrands, bassStrands } from '../src/engine/drills/levelTest';
import { DUO_ITEMS, SOLO_ITEMS, SOLO_KEYS, duoModel, formChords, soloModel } from '../src/engine/drills/soloDrills';
import { ruleCheck } from '../src/engine/improvRules';
import { RULE_CARDS, cardKept, spansOfVChords, type CardCtx } from '../src/engine/ruleCards';
import { CHORUS_FORMS, assembleChorus, barsOf, cellsFor, chorusChecks, defaultPlan } from '../src/engine/soloChorus';
import { mod12, VQ_DEF } from '../src/engine/bebopVocab';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { MINI_LESSONS, lessonForUnit } from '../src/content/minilessons';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const famOf = (id: string) => [...catalog(), ...guitarCatalog()].find((f) => f.id === id)!;
/** Guitar levels sit by grade on purpose (a later-added easier level opens first): these families may go down. */
const BY_GRADE = ['g-rhythm', 'g-picking', 'g-scales', 'g-ear', 'g-fretting', 'g-lead', 'g-arps', 'g-jazz', 'g-prog', 'g-harris', 'g-theory'];

describe('path difficulty order (AUDIT-DEPTH-3 §0)', () => {
  const tech = stepCatalogue().filter((s) => s.kind === 'tech' && s.ladder && ['piano', 'guitar', 'bass'].includes(s.ladder.instrument ?? ''));
  it('(a) every piano, guitar and bass path step sits at or below 1950', () => {
    const over = tech.filter((s) => s.difficulty > 1950).map((s) => `${s.id} ${s.difficulty}`);
    expect(over).toEqual([]);
    expect(PATH_CAP).toBeLessThanOrEqual(1950);
  });
  it('(b) the Harris half-step rules and ii–V–I by the rules come before every pivot level', () => {
    const d = (id: string) => tech.find((s) => s.id === `tech:${id}`)!.difficulty;
    for (const pre of ['harris-14', 'harris-15']) for (let n = 19; n <= 24; n++) expect(d(pre), `${pre} < harris-${n}`).toBeLessThan(d(`harris-${n}`));
    expect(d('harris-1')).toBeGreaterThanOrEqual(700);
  });
  it('(c) inside a family, difficulty never goes down with the level number (unless allow-listed)', () => {
    const allow = new Set([...NON_MONOTONE_FAMILIES, ...BY_GRADE]);
    const by = new Map<string, { lv: number; d: number }[]>();
    for (const s of tech) by.set(s.ladder!.family, [...(by.get(s.ladder!.family) ?? []), { lv: s.ladder!.level, d: s.difficulty }]);
    const bad: string[] = [];
    for (const [f, xs] of by) {
      if (allow.has(f)) continue;
      xs.sort((a, b) => a.lv - b.lv);
      xs.forEach((x, i) => i && x.d < xs[i - 1].d && bad.push(`${f}-${x.lv}: ${x.d} < ${xs[i - 1].d}`));
    }
    expect(bad).toEqual([]);
  });
  it('the long families are squeezed inside the scale, integers, and the new families sit at ~1190–1880', () => {
    expect(tech.every((s) => Number.isInteger(s.difficulty))).toBe(true);
    const d = (id: string) => tech.find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('accomp-18')).toBeLessThanOrEqual(1880);
    expect(d('voicings-17')).toBeLessThanOrEqual(1880);
    expect(d('k-sixdim-13')).toBeLessThanOrEqual(1880);
    expect(d('k-solo-1')).toBeGreaterThanOrEqual(1150);
    expect(d('k-ctx-13')).toBeLessThanOrEqual(1880);
  });
});

// ───────────────────────────── improv items ─────────────────────────────

const ctxOf = (notes: { p: number; beat: number; dur: number }[], chords: ReturnType<typeof formChords>): CardCtx => ({ notes: notes.map((n) => ({ beat: n.beat, dur: n.dur, midi: n.p })), spans: spansOfVChords(chords), meter: 4, bpm: 100 });
/** A take that plays notes exactly on time (ms from the drill's beat 0). */
const playAt = (d: Drill, bpm: number, notes: { p: number; beat: number; dur: number }[]): PlayedNote[] =>
  notes.map((n) => ({ pitch: n.p, on: expTimeMs(d, n.beat, bpm), off: expTimeMs(d, n.beat + n.dur * 0.9, bpm), vel: 80 }));

describe('improvising under rule cards (C5)', () => {
  it('every item names cards that exist, en + he', () => {
    for (const it of SOLO_ITEMS) {
      for (const c of it.cards) expect(RULE_CARDS[c], c).toBeDefined();
      expect(/[֐-׿]/.test(it.name.he)).toBe(true);
    }
  });
  it('every item’s model line keeps its cards, in all 12 keys, on piano, guitar and bass', () => {
    const bad: string[] = [];
    SOLO_ITEMS.forEach((it, op) => {
      for (const key of SOLO_KEYS)
        for (const inst of ['piano', 'guitar', 'bass'] as const) {
          const m = soloModel(op, key, inst);
          const ctx = ctxOf(m, formChords(it.form, key));
          for (const card of it.cards) {
            const c = ruleCheck(card, ctx);
            if (!cardKept(card, c)) bad.push(`${op} ${card} key ${key} ${inst}: ${c.ok}/${c.total}`);
          }
        }
    });
    expect(bad).toEqual([]);
  });
  it('the model played on the keys passes; a take that ignores the cards does not', () => {
    for (const op of [0, 4, 6, 11, 13, 17]) {
      const d = generate({ family: 'k-solo', kind: 'sl-imp', key: 5, hands: 'R', swing: false, option: op });
      expect(d.goal.improv?.cards).toEqual(SOLO_ITEMS[op].cards);
      const good = analyzeTake(d, 100, playAt(d, 100, soloModel(op, 5, 'piano')));
      expect(good.improv?.every((c) => c.pass), `${op} ${JSON.stringify(good.improv)}`).toBe(true);
      expect(good.verdict, `${op} ${good.why.en}`).toBe('clean');
      // The same rhythm on one repeated note a half step above the key: no card is kept.
      const bad = analyzeTake(d, 100, playAt(d, 100, soloModel(op, 5, 'piano').map((n) => ({ ...n, p: 66 }))));
      expect(bad.improv?.some((c) => !c.pass)).toBe(true);
      expect(bad.verdict).not.toBe('clean');
    }
  });
  it('improv items have no rubato stage (the cards judge beats) and feed improvising', () => {
    const d = generate({ family: 'k-solo', kind: 'sl-imp', key: 0, hands: 'R', swing: true, option: 0 });
    expect(hasRubato(d)).toBe(false);
    const m = analyzeTake(d, 100, playAt(d, 100, soloModel(0, 0, 'piano')));
    expect(drillEvents(d, m, new Date().toISOString(), 's', 0).some((e) => (e.tags ?? []).some((x) => x.sub === 'improv/play'))).toBe(true);
  });
  it('guitar and bass improv items carry the cards and a landing on the last chord', () => {
    for (const f of ['g-solo', 'b-solo']) {
      for (const lv of famOf(f).levels)
        for (const d of levelDrills(lv, 'fifths-up')) {
          if (d.spec.kind === 'sl-chorus') continue;
          expect(d.goal.improv?.cards.length, d.itemId).toBeGreaterThan(0);
          expect(d.goal.free?.windows.length).toBeGreaterThan(0);
        }
    }
  });
});

describe('the comp-and-solo duo (C7)', () => {
  it('piano: the LH comps under middle C (graded), the RH line above it keeps the cards', () => {
    DUO_ITEMS.forEach((_it, op) => {
      const d = generate({ family: 'k-solo', kind: 'sl-duo', key: 3, hands: 'RL', swing: false, option: op });
      expect(d.freeAbove).toBe(60);
      expect(d.notes.every((n) => n.pitch < 60 && n.hand === 'L')).toBe(true);
      const lh = d.notes.map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur }));
      const good = analyzeTake(d, 90, playAt(d, 90, [...lh, ...duoModel(op, 3)]));
      expect(good.improv?.every((c) => c.pass), `${op} ${JSON.stringify(good.improv)}`).toBe(true);
      expect(good.verdict, `${op} ${good.why.en}`).toBe('clean');
      // The comping alone (no line): the cards are broken.
      expect(analyzeTake(d, 90, playAt(d, 90, lh)).verdict).not.toBe('clean');
    });
  });
  it('guitar: chord bars and line bars take turns; bass: walking bars and fill bars', () => {
    const g = levelDrills(famOf('g-solo').levels.find((l) => l.specs.some((s) => s.kind === 'sl-duo'))!, 'fifths-up');
    for (const d of g) {
      const wins = d.goal.free!.windows;
      expect(wins.every(([a]) => a % 8 === 4)).toBe(true);
      expect(d.notes.every((n) => Math.floor(n.beat / 4) % 2 === 0)).toBe(true);
    }
    const b = levelDrills(famOf('b-solo').levels.find((l) => l.specs.some((s) => s.kind === 'sl-duo'))!, 'fifths-up');
    for (const d of b) expect(d.notes.every((n) => Math.floor(n.beat / 4) % 2 === 0)).toBe(true);
  });
});

describe('write and play a solo chorus (C6)', () => {
  it('three forms; every bar offers the cells, one-chord bars the matching licks', () => {
    expect(CHORUS_FORMS.length).toBe(3);
    const blues = barsOf(0, 0);
    expect(cellsFor(blues[0]).some((c) => c.startsWith('lick:'))).toBe(true);
    expect(cellsFor(barsOf(1, 0)[0]).some((c) => c.startsWith('lick:'))).toBe(false);
  });
  it('the suggested chorus starts most bars on a chord tone and ends on one, in all 12 keys', () => {
    for (let form = 0; form < 3; form++)
      for (const key of SOLO_KEYS) {
        const bars = barsOf(form, key);
        const ns = assembleChorus(bars, defaultPlan(form), 60, 84);
        const ck = chorusChecks(bars, ns);
        expect(ck.downbeats.filter((x) => x.ok).length / ck.downbeats.length, `${form} ${key}`).toBeGreaterThanOrEqual(0.75);
        const last = ns[ns.length - 1];
        const lc = bars[bars.length - 1][bars[bars.length - 1].length - 1];
        expect(VQ_DEF[lc.q].ct.map((x) => mod12(lc.r + x))).toContain(mod12(last.p));
        expect(ns.every((n) => n.p >= 60 && n.p <= 84)).toBe(true);
      }
  });
  it('a plan of licks and rests transposes with the key', () => {
    const plan = defaultPlan(0).map((c, i) => (i === 0 ? cellsFor(barsOf(0, 0)[0]).find((x) => x.startsWith('lick:'))! : i === 1 ? 'rest' : c));
    const a = assembleChorus(barsOf(0, 0), plan, 48, 96);
    const b = assembleChorus(barsOf(0, 7), plan, 48, 96);
    expect(a.filter((n) => n.beat < 4).map((n) => mod12(n.p + 7))).toEqual(b.filter((n) => n.beat < 4).map((n) => mod12(n.p)));
    expect(a.some((n) => n.beat >= 4 && n.beat < 8)).toBe(false);
  });
  it('the chorus levels play it note for note, rubato first, on piano, guitar and bass', () => {
    for (const f of ['k-solo', 'g-solo', 'b-solo']) {
      const lv = famOf(f).levels.find((l) => l.specs.some((s) => s.kind === 'sl-chorus'))!;
      const ds = levelDrills(lv, 'fifths-up');
      expect(new Set(ds.map((d) => d.spec.key)).size).toBe(12);
      for (const d of ds) {
        expect(d.notes.length).toBeGreaterThan(20);
        expect(hasRubato(d)).toBe(true);
      }
    }
  });
});

describe('the improvising right hand of voicings 17 and accomp 16 is graded', () => {
  it('carries rule cards over the chart', () => {
    for (const id of ['voicings-17', 'accomp-16']) {
      const lv = catalog().flatMap((f) => f.levels).find((l) => l.id === id)!;
      for (const d of levelDrills(lv, 'fifths-up').slice(0, 6)) {
        expect(d.freeAbove).toBeDefined();
        expect(d.goal.improv?.cards).toEqual(['inside', 'target-ct', 'active']);
        expect(d.goal.improv!.spans.length).toBeGreaterThan(0);
      }
    }
  });
  it('a silent right hand breaks the cards; a chord-tone line on every change keeps them', () => {
    const lv = catalog().flatMap((f) => f.levels).find((l) => l.id === 'voicings-17')!;
    const d = levelDrills(lv, 'fifths-up')[0];
    const lh = d.notes.map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur }));
    expect(analyzeTake(d, 80, playAt(d, 80, lh)).improv?.some((c) => !c.pass)).toBe(true);
    const rh = d.goal.improv!.spans.map((s) => ({ p: 72 + mod12(s.root + (s.iv.includes(4) ? 4 : 3) - 72 + 120) % 12, beat: s.at, dur: Math.min(1, s.beats) }));
    const m = analyzeTake(d, 80, playAt(d, 80, [...lh, ...rh]));
    expect(m.improv?.every((c) => c.pass), JSON.stringify(m.improv)).toBe(true);
  });
});

describe('wiring', () => {
  const FAMS = ['k-solo', 'g-solo', 'b-solo', 'k-ctx', 'g-ctx', 'b-ctx'];
  it('every new family has its own glyph, and every level is a path step', () => {
    const glyphs = FAMS.map((f) => FAMILY_GLYPH[f]);
    expect(new Set(glyphs).size).toBe(6);
    for (const g of glyphs) expect(GLYPHS[g], g).toBeDefined();
    const ids = new Set(stepCatalogue().map((s) => s.id));
    for (const f of FAMS) for (const lv of famOf(f).levels) expect(ids.has(`tech:${lv.id}`), lv.id).toBe(true);
  });
  it('badges for the keys and guitar families, lessons for every family', () => {
    for (const f of ['k-solo', 'g-solo', 'k-ctx', 'g-ctx']) expect(BADGES.some((b) => b.id.includes(f)), f).toBe(true);
    for (const f of FAMS) {
      expect(lessonForUnit(`tech:${f}`), f).toBeTruthy();
    }
    for (const id of ['solo-rules', 'solo-duo', 'solo-chorus']) expect(/[֐-׿]/.test(MINI_LESSONS[id].title.he)).toBe(true);
  });
  it('the level tests place the new families', () => {
    const levels = [...pianoStrands('jazz'), ...guitarStrands(), ...bassStrands()].flatMap((s) => s.rungs.map((r) => r.level));
    for (const id of ['k-ctx-2', 'k-solo-4', 'g-ctx-1', 'g-solo-3', 'b-ctx-1', 'b-solo-1']) expect(levels).toContain(id);
  });
  it('all levels run in all 12 keys', () => {
    for (const f of FAMS) for (const lv of famOf(f).levels) expect(new Set(levelDrills(lv, 'fifths-up').map((d) => d.spec.key)).size, lv.id).toBe(12);
  });
});
