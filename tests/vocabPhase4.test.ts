// BUILD-PLAN-2026-11 phase 4 (Vocabulary): language in the key (block G), the line families as lick sources, the
// steps for the ear's phrases in the library, today's lick and where it fits, the lick cards in Improvise.
import { describe, expect, it } from 'vitest';
import { generate, catalog } from '../src/engine/drills/generate';
import { LICKS, lickById, lickDrill, lickItemId, lickOfDrill, lickTempos, lineLicks, LINE_FAMILIES, reviewStart, type Lick } from '../src/engine/licks';
import { inMyLanguage, lickFits, lickPool, todaysLick, usesOf, type LickUse } from '../src/engine/vocab';
import { keyLadder, openKeyRungs } from '../src/engine/drills/keyIndex';
import { cellItemIds, keyMatrix } from '../src/engine/drills/keyMatrix';
import { specDrills, itemTargetBpm } from '../src/engine/drills/plan';
import { lickKeyDrill } from '../src/engine/drills/lickRungs';
import { RULE_CARDS, type CardCtx, type CSpan } from '../src/engine/ruleCards';
import { CHALLENGES, VOCAB_RULES, checkRules } from '../src/engine/improvRules';
import { parseChart } from '../src/engine/charts';
import type { ItemState } from '../src/engine/drills/types';

const st = (id: string, takes = 1, last = '2026-11-20T10:00:00Z'): ItemState => ({ itemId: id, family: 'licks', key: Number(id.split(':').pop()), takes, cleanBpm: 90, history: [], passLog: [], last }) as unknown as ItemState;
const fams = catalog();

describe('the line families as lick sources (BUILD-PLAN §0.2)', () => {
  const lines = lineLicks();
  it('k-bebop, k-vocab and k-harrisline lines become licks with chords; ids unique and stable', () => {
    expect(lines.length).toBeGreaterThan(30);
    for (const f of LINE_FAMILIES) expect(lines.some((l) => l.src?.fam === f)).toBe(true);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect(lines.find((l) => l.id === 'ln-k-bebop-1-0')?.chords.map((c) => c[1])).toEqual(['m7', '7', 'maj7', '6']);
    for (const l of lines) {
      expect(l.chords.length).toBeGreaterThan(0);
      expect(l.notes.length).toBeGreaterThanOrEqual(3);
      expect(l.ctx).toBe('lines');
    }
  });
  it('on the piano a line plays its family drill and keeps the family item ids (no progress split)', () => {
    const l = lickById('ln-k-bebop-1-0')!;
    for (const k of [0, 5, 10]) {
      const fam = generate({ ...(l.src!.spec as object), key: k } as never);
      expect(lickDrill(l, k, 'piano').itemId).toBe(fam.itemId);
      expect(lickItemId(l, 'piano', k)).toBe(fam.itemId);
      expect(lickOfDrill(fam)?.id).toBe(l.id);
    }
    // its tempo ladder is the level's
    const d = generate({ ...(l.src!.spec as object), key: 0 } as never);
    expect(lickTempos(l)[0]).toBe(d.startBpm);
    expect(lickTempos(l)[3]).toBe(itemTargetBpm(d));
    // another instrument plays it as a lick drill
    expect(lickDrill(l, 0, 'guitar').itemId).toBe('lick:ln-k-bebop-1-0:guitar:0');
  });
  it('a take on the family level puts the line in the pool', () => {
    const l = lickById('ln-k-harrisline-21-1')!;
    expect(l).toBeTruthy();
    const id = l.src!.item.replace('{k}', '7');
    expect(lickPool({ [id]: st(id) }, undefined).map((x) => x.id)).toContain(l.id);
  });
});

describe('the steps for the ear join the library (SPEC-EAR-AND-READING §3.2)', () => {
  it('the ii–V–I solo phrases of level 9 are library licks', () => {
    const tx = LICKS.filter((l) => l.id.startsWith('tx9-'));
    expect(tx).toHaveLength(4);
    for (const l of tx) expect(l.chords.map((c) => c[1])).toEqual(['m7', '7', 'maj7']);
  });
});

describe('language in the key: block G (SPEC-DAILY-WORKOUT §6)', () => {
  const lick = LICKS.find((l) => l.id === 'maj-arp')!;
  const minor = LICKS.find((l) => l.id === 'min-arp')!;
  it('every lick of the pool is a G rung in every key of its group, its items lick:<id>:piano:<key>', () => {
    for (const root of [0, 3, 8]) {
      const { built } = openKeyRungs(fams, root, 'major', 3, { licks: [lick, minor] });
      const g = built.filter((b) => b.rung.block === 'G');
      expect(g.map((b) => b.rung.id)).toEqual(['lick-maj-arp']);
      const ds = specDrills(g[0].lvl, 0, 'fifths-up');
      expect(ds.map((d) => d.itemId)).toEqual([`lick:maj-arp:piano:${root}`]);
      expect(itemTargetBpm(ds[0])).toBe(lickTempos(lick)[3]);
    }
    const m = openKeyRungs(fams, 9, 'minor', 3, { licks: [lick, minor] }).built.filter((b) => b.rung.block === 'G');
    expect(m.map((b) => b.rung.id)).toEqual(['lick-min-arp']);
  });
  it('the ladder picks the lick most in need; the matrix has a G cell per key', () => {
    const items = { 'lick:maj-arp:piano:0': st('lick:maj-arp:piano:0', 3) };
    const lad = keyLadder(fams, 0, 'major', 3, items, { licks: [lick, LICKS.find((l) => l.id === 'dom-arp9')!] })!;
    const g = lad.levels.filter((l) => l.id.includes('-lick-'));
    expect(g).toHaveLength(1);
    expect(g[0].id).toBe('key-0-lick-dom-arp9'); // never played comes first
    const cells = keyMatrix(fams, 3, items, { licks: [lick], groups: ['major'] }).filter((c) => c.block === 'G');
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((c) => c.rung))).toEqual(new Set(['lick-maj-arp']));
    expect(cellItemIds(cells.find((c) => c.root === 0)!)).toEqual(['lick:maj-arp:piano:0']);
    expect(cells.find((c) => c.root === 0)!.need.s).toBe(1);
  });
  it('a line in block G is the family item itself; an Encore phrase its phrase drill', () => {
    const line = lickById('ln-k-bebop-1-0')!;
    const g = openKeyRungs(fams, 5, 'major', 3, { licks: [line] }).built.filter((b) => b.rung.block === 'G');
    expect(specDrills(g[0].lvl, 0, 'fifths-up')[0].itemId).toBe(line.src!.item.replace('{k}', '5'));
    const enc: Lick = { ...lick, id: 'enc-x1', v: 3, own: true };
    expect(lickKeyDrill(enc, 2).itemId).toBe('lick:enc-x1:piano:2');
  });
});

describe("today's lick and where it fits (SPEC-LICKS-IN-IMPROV §2)", () => {
  const a = LICKS.find((l) => l.id === 'maj-arp')!;
  const b = LICKS.find((l) => l.id === 'dom-arp9')!;
  it('due for review first, else the most recently practised not yet in my language', () => {
    const items = { x: st('lick:maj-arp:piano:0', 2, '2026-11-18T10:00:00Z'), y: st('lick:dom-arp9:piano:0', 2, '2026-11-21T10:00:00Z') };
    expect(todaysLick([a, b], undefined, items)?.id).toBe('dom-arp9');
    const due = { review: { 'maj-arp': { ...reviewStart('2026-11-01T10:00:00Z') } } };
    expect(todaysLick([a, b], due, items, '2026-11-22T10:00:00Z')?.id).toBe('maj-arp');
    expect(todaysLick([], undefined, {})).toBeNull();
  });
  it('the chart marks where a ii–V–I lick fits, with its key (and over the tritone sub)', () => {
    const iv = { m7: [0, 3, 7, 10], d7: [0, 4, 7, 10], M7: [0, 4, 7, 11] };
    const chart: CSpan[] = [
      { root: 2, iv: iv.m7, at: 0, beats: 4 }, { root: 7, iv: iv.d7, at: 4, beats: 4 }, { root: 0, iv: iv.M7, at: 8, beats: 8 },
      { root: 7, iv: iv.m7, at: 16, beats: 4 }, { root: 6, iv: iv.d7, at: 20, beats: 4 }, { root: 5, iv: iv.M7, at: 24, beats: 8 },
    ];
    expect(lickFits(a, chart)).toEqual([{ at: 0, key: 0 }, { at: 16, key: 5 }]);
  });
  it('"used N times in K keys" and "in my language"', () => {
    const u: LickUse[] = [{ id: 'q', key: 0, kind: 'exact', at: '', session: 'a' }, { id: 'q', key: 5, kind: 'varied', at: '', session: 'b' }, { id: 'q', key: 5, kind: 'exact', at: '', session: 'c' }];
    expect(usesOf(u, 'q')).toEqual({ n: 3, keys: 2, sessions: 3 });
    expect(inMyLanguage(u, 'q')).toBe(true);
  });
});

describe('the lick cards in Improvise', () => {
  const lick = LICKS.find((l) => l.id === 'dom-arp9')!; // V7 → I, 8 beats
  // 16 bars of V–I in C; the lick played (in time) in bars 1, 5 and 9 → 3 of 4 windows with notes
  const spans: CSpan[] = Array.from({ length: 8 }, (_, i) => [{ root: 7, iv: [0, 4, 7, 10], at: i * 8, beats: 4 }, { root: 0, iv: [0, 4, 7, 11], at: i * 8 + 4, beats: 4 }]).flat();
  const at = (start: number) => lick.notes.map(([p, b, d]) => ({ midi: 60 + p, beat: start + b, dur: d }));
  const filler = (start: number) => [0, 1, 2, 3].map((k) => ({ midi: 64 + (k % 2) * 3, beat: start + k, dur: 0.9 }));
  const ctx = (notes: { midi: number; beat: number; dur: number }[], opt?: CardCtx['opt']): CardCtx => ({ notes, spans, meter: 4, bpm: 120, opt });
  it('"a lick every 4 bars": windows with a use ÷ windows with notes (3 of 4 = 75 %)', () => {
    const notes = [...at(0), ...at(16), ...at(32), ...filler(48)];
    const c = RULE_CARDS['lick-every-4'].check(ctx(notes, { licks: [lick] }));
    expect(c).toMatchObject({ ok: 3, total: 4 });
    expect(c.miss).toEqual([48]);
  });
  it('"today\'s lick": that lick over its chords; another lick does not count', () => {
    expect(RULE_CARDS['todays-lick'].check(ctx(at(8), { today: lick })).ok).toBe(1);
    expect(RULE_CARDS['todays-lick'].check(ctx(at(8), { today: LICKS.find((l) => l.id === 'maj-arp')! })).ok).toBe(0);
  });
  it('"use a lick" counts the player\'s own pool when given', () => {
    const own: Lick = { ...lick, id: 'own-1', own: true };
    expect(RULE_CARDS['use-lick'].check(ctx(at(0), { licks: [own] })).ok).toBe(1);
  });
  it('the cards are in the vocabulary slot and the challenge library; checkRules passes the pool through', () => {
    expect(VOCAB_RULES).toEqual(expect.arrayContaining(['lick-every-4', 'todays-lick']));
    expect(CHALLENGES.map((c) => c.id)).toEqual(expect.arrayContaining(['lick-every-4', 'todays-lick']));
    const chart = parseChart('G7 | C | G7 | C');
    const sec = 60 / 120;
    const played = at(0).map((n) => ({ start: n.beat * sec, end: (n.beat + n.dur) * sec, midi: n.midi }));
    const r = checkRules(played, chart, 4, 120, { note: null, interval: null, rhythm: null, vocab: 'todays-lick' }, {}, 4, { today: lick });
    expect(r.checks[0]).toMatchObject({ rule: 'todays-lick', ok: 1, total: 1 });
  });
});
