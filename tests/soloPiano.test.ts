// Solo jazz piano after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md): the music (soloPiano.ts) in C, the four
// families (soloPianoDrills.ts) in all 12 keys, the shared-hands style, free comping, the ear topics and the wiring.
import { describe, expect, it } from 'vitest';
import {
  bpAlternate,
  bpShell,
  compHits,
  freeCompCheck,
  guideShell,
  registerCheck,
  rootless,
  sharedCandidates,
  sharedRules,
  sharedVoicing,
  shellA,
  shellB,
  sixPlaces,
  stridePattern,
  strideComp,
  thumbNinthOk,
  walkingTenths,
  withFifthBass,
  withTritoneBass,
  type TChord,
} from '../src/engine/soloPiano';
import { catalog, generate } from '../src/engine/drills/generate';
import { COMP_ROWS, IMPRO_ROWS, LH_ROWS, SP_FAMILIES, SP_LEVEL_DIFF, TEX_ROWS } from '../src/engine/drills/soloPianoDrills';
import { HARM_STYLES, builtStyles } from '../src/engine/heads';
import { pianoHarmFamily } from '../src/engine/drills/headDrills';
import { classify, candidates } from '../src/engine/drills/voiceLead';
import { analyzeTake } from '../src/engine/drills/analyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { KEYS_LEVEL_DIFF, PATH_CAP, stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { familyLevelCount } from '../src/engine/badges';
import { genTopic, TOPIC_GEN } from '../src/engine/topicKit';
import { HEADS } from '../src/content/heads';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON as UNITS } from '../src/content/units';
import type { Drill, PlayedNote } from '../src/engine/drills/types';
import '../src/engine/topics';

const C = (q: 'maj7' | '7' | 'm7') => ({ root: 0, q });
const ALL12 = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

describe('the left hand in C (PSJP Ch. B)', () => {
  it('Type A bass shells are 1-3-7: C-E-B♭ on C7, C-E-B on Cmaj7 (C3 bass)', () => {
    expect(shellA(C('7'))).toEqual([48, 52, 58]);
    expect(shellA(C('maj7'))).toEqual([48, 52, 59]);
    expect(shellA({ root: 2, q: 'm7' })).toEqual([50, 53, 60]); // D3-F3-C4
    expect(shellA({ root: 7, q: '7' })).toEqual([43, 47, 53]); // G2-B2-F3
  });
  it('Type B bass shells are 1-7-10: C-B♭-E on C7, C-B-E on Cmaj7 (C2 bass)', () => {
    expect(shellB(C('7'))).toEqual([36, 46, 52]);
    expect(shellB(C('maj7'))).toEqual([36, 47, 52]);
    expect(shellB({ root: 2, q: 'm7' })).toEqual([38, 48, 53]); // D2-C3-F3
    expect(shellB({ root: 7, q: '7' })).toEqual([43, 53, 59]); // G2-F3-B3
  });
  it('two-note "Bud Powell" shells: root + 3rd, + 10th, + 7th, and the ii–V–I alternations', () => {
    expect(bpShell(C('maj7'), '3')).toEqual([48, 52]);
    expect(bpShell(C('maj7'), '10')).toEqual([36, 52]);
    expect(bpShell(C('maj7'), '7')).toEqual([48, 59]);
    const iivi = [{ root: 2, q: 'm7' as const }, { root: 7, q: '7' as const }, { root: 0, q: 'maj7' as const }];
    expect(bpAlternate(iivi, '3')).toEqual([[50, 53], [43, 53], [48, 52]]); // D3+F3 → G2+F3 → C3+E3
    expect(bpAlternate(iivi, '7')).toEqual([[50, 60], [43, 47], [48, 59]]); // D3+C4 → G2+B2 → C3+B3
  });
  it('the 9th under the thumb only where 9 and 10 share a key colour; the 5th and the tritone for the root', () => {
    expect(thumbNinthOk(C('maj7'))).toBe(true); // D, E white
    expect(bpShell(C('maj7'), '10', true)).toEqual([36, 50, 52]); // C2 + D3+E3
    expect(thumbNinthOk({ root: 9, q: 'maj7' })).toBe(false); // B white, C♯ black
    expect(bpShell({ root: 9, q: 'maj7' }, '10', true)).toHaveLength(2);
    expect(withFifthBass(shellA(C('maj7')), C('maj7'))).toEqual([43, 52, 59]); // G2-E3-B3
    expect(withFifthBass(shellB(C('maj7')), C('maj7'))).toEqual([43, 47, 52]); // G2-B2-E3
    expect(withTritoneBass({ root: 7, q: '7' })).toEqual([37, 53, 59]); // D♭2-F3-B3
  });
  it('rootless voicings avoid the stack: the 13th for the 5th on maj and dominant (G7 A = B3-E4-F4-A4)', () => {
    expect(rootless({ root: 7, q: '7' }, 'A')).toEqual([59, 64, 65, 69]);
    expect(rootless({ root: 2, q: 'm7' }, 'A')).toEqual([53, 57, 60, 64]); // the m7 stack is accepted
    expect(sixPlaces(C('maj7'))).toHaveLength(6);
  });
  it('the registers: essentials between C3 and G4, below muddy, above thin; shells keep them there', () => {
    expect(registerCheck([52, 59])).toBe('ok');
    expect(registerCheck([40, 47])).toBe('muddy');
    expect(registerCheck([76, 83])).toBe('thin');
    expect(guideShell(C('maj7'), null)).toEqual([52, 59]); // E3+B3
    for (const k of ALL12) for (const q of ['maj7', '7', 'm7'] as const) {
      const g = guideShell({ root: k, q }, null);
      expect(registerCheck(g), `${k}${q}`).toBe('ok');
      const a = shellA({ root: k, q });
      expect(registerCheck(a.slice(1).filter((p) => p >= 48)), `${k}${q} A`).toBe('ok');
    }
  });
  it('walking 10ths: C2+E3 → D2+F3 → E2+G3 → F2+A3', () => {
    expect(walkingTenths(0, [0, 1, 2, 3])).toEqual([[36, 52], [38, 53], [40, 55], [41, 57]]);
  });
  const LOOP: TChord[] = [{ root: 2, q: 'm7', beat: 0, beats: 4 }, { root: 7, q: '7', beat: 4, beats: 4 }, { root: 0, q: 'maj7', beat: 8, beats: 4 }, { root: 9, q: '7', beat: 12, beats: 4 }];
  it('stride roles: bass on 1 and 3, chord on 2 and 4; shell stride uses the shell; reversed swaps them', () => {
    const st = stridePattern(LOOP, 4, 'shell-stride');
    expect(st.filter((e) => e.role === 'bass').map((e) => e.beat % 4)).toEqual(Array(8).fill(0).map((_, i) => (i % 2) * 2));
    expect(st.filter((e) => e.role === 'chord').every((e) => e.notes.length === 2 && e.beat % 2 === 1)).toBe(true);
    const rev = stridePattern(LOOP, 4, 'reverse');
    expect(rev.filter((e) => e.role === 'chord').every((e) => e.beat % 2 === 0)).toBe(true);
    const ant = stridePattern(LOOP, 4, 'antic-bass');
    expect(ant.some((e) => e.role === 'bass' && Math.abs((e.beat % 4) - 3.5) < 1e-6)).toBe(true);
    expect(strideComp(LOOP, 4, 'charleston').map((e) => e.beat % 4)).toEqual([0, 1.5, 0, 1.5, 0, 1.5, 0, 1.5]);
  });
});

describe('shared hands: his four rules', () => {
  it('3 and 7, no doubling, even spacing, no minor 9ths', () => {
    // Cmaj7 under E4: C2 | B2 D3 | G3 + E4 (the melody holds the 3rd)
    expect(sharedRules([36, 47, 50, 55, 64], C('maj7')).ok).toBe(true);
    expect(sharedRules([36, 50, 55, 62, 64], C('maj7')).has37).toBe(false); // no 7th
    expect(sharedRules([36, 47, 52, 55, 64], C('maj7')).noDouble).toBe(false); // E twice
    expect(sharedRules([36, 47, 50, 70, 76], C('maj7')).even).toBe(false); // a 20-semitone gap
    expect(sharedRules([36, 47, 52, 53, 64], { root: 0, q: '7' }).noMinor9).toBe(true);
    expect(sharedRules([36, 46, 52, 61, 64], { root: 0, q: '7' }).noMinor9).toBe(false); // C♯4 a ♭9 over C2
  });
  it('every generated candidate keeps all four rules, in all 12 keys', () => {
    for (const k of ALL12)
      for (const q of ['maj7', '7', 'm7', '6'] as const) {
        const mel = 64 + ((k + 4) % 12);
        const cs = sharedCandidates({ root: k, q }, mel);
        for (const v of cs) expect(sharedRules([...v, mel], { root: k, q }).ok, `${k}${q} ${v}`).toBe(true);
      }
    expect(sharedVoicing(C('maj7'), 64, null)).not.toBeNull();
  });
  it('hm-shared is registered after drop 3: k-harm level 8, graded by the rules through voiceLead', () => {
    expect(HARM_STYLES.shared?.type).toBe('shared');
    expect(builtStyles().map((s) => s.id)).toEqual(['shell', 'close', 'drop2', 'drop3', 'shared']);
    const f = pianoHarmFamily();
    expect(f.levels).toHaveLength(8);
    expect(f.levels[7].specs[0].kind).toBe('hm-shared');
    const c = { root: 0, q: 'maj7' as const, melody: 64 };
    const g = { type: 'shared' as const, bass: false, over: true };
    expect(classify([36, 47, 50, 55, 64], c, g).ok).toBe(true);
    expect(classify([36, 47, 52, 55, 64], c, g).kind).toBe('double');
    expect(classify([36, 52, 55, 62, 64], { ...c }, g).kind).toBe('missing');
    expect(candidates(c, { type: 'shared', lo: 36, hi: 84, over: true }).length).toBeGreaterThan(0);
  });
});

describe('free comping by rule', () => {
  const LOOP: TChord[] = [{ root: 2, q: 'm7', beat: 0, beats: 4 }, { root: 7, q: '7', beat: 4, beats: 4 }, { root: 0, q: 'maj7', beat: 8, beats: 4 }, { root: 9, q: '7', beat: 12, beats: 4 }];
  const v = (c: TChord) => rootless(c, 'A');
  it('passes varied bars, fails the same bar three times and empty bars', () => {
    const varied = [{ beat: 0, pcs: v(LOOP[0]) }, { beat: 1.5, pcs: v(LOOP[0]) }, { beat: 4.5, pcs: v(LOOP[1]) }, { beat: 6, pcs: v(LOOP[1]) }, { beat: 9, pcs: v(LOOP[2]) }, { beat: 11, pcs: v(LOOP[2]) }, { beat: 14, pcs: v(LOOP[3]) }];
    expect(freeCompCheck(varied, LOOP, 4).ok).toBe(true);
    const same = [0, 4, 8, 12].flatMap((b, i) => [{ beat: b, pcs: v(LOOP[i]) }, { beat: b + 1.5, pcs: v(LOOP[i]) }]);
    expect(freeCompCheck(same, LOOP, 4).repeats).toBe(true);
    expect(freeCompCheck(same.slice(0, 2), LOOP, 4).density).toBe(false);
    // an anticipation on the "and" of 4 must sound the next chord
    const ant = [{ beat: 0, pcs: v(LOOP[0]) }, { beat: 3.5, pcs: v(LOOP[0]) }, { beat: 5, pcs: v(LOOP[1]) }, { beat: 9, pcs: v(LOOP[2]) }, { beat: 10.5, pcs: v(LOOP[2]) }, { beat: 13, pcs: v(LOOP[3]) }];
    expect(freeCompCheck(ant, LOOP, 4).anticipations.ok).toBe(0);
    expect(compHits(LOOP, 4, 'beat3').map((h) => h.beat % 4)).toEqual([2, 3.5, 2, 3.5, 2, 3.5, 2, 3.5]);
  });
  it('the free-comping item grades its own model clean (played as written)', () => {
    const lv = catalog().find((f) => f.id === 'k-comp')!.levels.at(-1)!;
    const d = generate({ ...lv.specs[0], key: 0 });
    const bpm = 100;
    const ms = 60000 / bpm;
    const played: PlayedNote[] = d.notes.map((n) => ({ pitch: n.pitch, on: (Math.floor(n.beat) + (n.beat % 1 ? 2 / 3 : 0)) * ms, off: null, vel: 80 }));
    expect(analyzeTake(d, bpm, played).verdict).toBe('clean');
    expect(analyzeTake(d, bpm, played.filter((p) => p.on < ms * 8)).verdict).not.toBe('clean');
  });
});

describe('the four families', () => {
  const fams = catalog().filter((f) => (SP_FAMILIES as string[]).includes(f.id));
  it('counts: k-lh 18, k-tex 20, k-comp 7, k-impro 7 levels built; on show without the hidden-until-verified ones', () => {
    // src/engine/verifiedContent.ts: a head in 10ths, stride variations, the shuttle (k-lh); drop-2 sidesteps, the inner
    // voice (k-tex); Basie, push-off, accents (k-comp). Switched on 2026-11-15: walking 10ths, the call on the Charleston
    // on 3, the Charleston on 3.
    expect(fams.map((f) => [f.id, f.levels.length])).toEqual([['k-lh', 11], ['k-tex', 18], ['k-comp', 4], ['k-impro', 7]]);
    expect(LH_ROWS.length + TEX_ROWS.length + COMP_ROWS.length + IMPRO_ROWS.length).toBe(52);
  });
  it('every item generates in all 12 keys, the key in its id, notes on the keyboard', () => {
    for (const f of fams)
      for (const lv of f.levels) {
        expect([...(lv.keys as number[])].sort((a, b) => a - b), lv.id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        for (const sp of lv.specs) {
          const ids = new Set<string>();
          for (const k of ALL12) {
            const d = generate({ ...sp, key: k });
            expect(d.notes.length, `${lv.id} ${sp.kind} ${k}`).toBeGreaterThan(0);
            for (const n of d.notes) expect(n.pitch >= 24 && n.pitch <= 96, `${lv.id} ${sp.kind} ${k} ${n.pitch}`).toBe(true);
            expect(d.itemId).toContain(`:${k}:`);
            ids.add(d.itemId);
          }
          expect(ids.size, `${lv.id} ${sp.kind}`).toBe(12);
        }
      }
  }, 60000);
  it('rubato first for the note items; rhythm items on a click; stop-start always free', () => {
    const one = (id: string, i = 0) => generate({ ...catalog().flatMap((f) => f.levels).find((l) => l.id === id)!.specs[i], key: 0 });
    expect(hasRubato(one('k-lh-3'))).toBe(true);
    expect(hasRubato(one('k-tex-6'))).toBe(true);
    expect(hasRubato(one('k-comp-2'))).toBe(false);
    expect(one('k-comp-2').click).toBe('24');
    const stop: Drill = one('k-tex-15');
    expect(stop.rubatoOnly).toBe(true);
    expect(stop.spec.target).toBe(stop.spec.tempo);
  });
  it('melodies come only from original heads', () => {
    for (const lv of fams.find((f) => f.id === 'k-tex')!.levels)
      for (const sp of lv.specs) {
        const head = HEADS[Math.floor((sp.option ?? 0) / 16)];
        expect(head.licence.kind === 'original' || head.licence.kind === 'pd-worldwide', `${lv.id}`).toBe(true);
        expect(head.melody && !head.verify).toBeTruthy();
      }
  });
  it('the improvisation habits carry the phrase goals (drone: organized / varied; play one / rest one)', () => {
    const one = (id: string) => generate({ ...catalog().flatMap((f) => f.levels).find((l) => l.id === id)!.specs[0], key: 0 });
    expect(one('k-impro-1').goal.phrase?.pass).toEqual(['organized', 'varied']);
    expect(one('k-impro-4').goal.playRest).toEqual({ play: 1, rest: 1 });
    expect(one('k-impro-5').goal.playRest).toEqual({ play: 2, rest: 2 });
    expect(one('k-impro-7').goal.playRest).toEqual({ play: 2, rest: 1 });
    expect(one('k-impro-3').goal.improv?.spans[0].iv).toEqual([0, 3, 7, 10]);
    expect(one('k-impro-1').freeAbove).toBe(60);
  });
});

describe('wiring', () => {
  it('path: every level at its own rating, rising, under PATH_CAP; ratings in the asked ranges', () => {
    const cat = stepCatalogue();
    for (const f of SP_FAMILIES) {
      const ds = cat.filter((s) => s.ladder?.family === f).sort((a, b) => a.ladder!.level - b.ladder!.level).map((s) => s.difficulty);
      expect(ds.length, f).toBeGreaterThan(0);
      expect(ds.every((d, i) => i === 0 || d >= ds[i - 1]), f).toBe(true);
      expect(Math.max(...ds)).toBeLessThanOrEqual(PATH_CAP);
    }
    expect(KEYS_LEVEL_DIFF['k-lh-1']).toBe(760);
    expect(SP_LEVEL_DIFF['k-lh-9']).toBe(1200);
    expect(SP_LEVEL_DIFF['k-tex-20']).toBe(1900);
  });
  it('glyphs, badges, lessons and topics', () => {
    const glyphs = SP_FAMILIES.map((f) => FAMILY_GLYPH[f]);
    expect(new Set(glyphs).size).toBe(4);
    for (const g of glyphs) expect(Object.entries(FAMILY_GLYPH).filter(([, v]) => v === g)).toHaveLength(1);
    expect(SP_FAMILIES.map((f) => familyLevelCount(f))).toEqual([18, 20, 7, 7]);
    expect(familyLevelCount('k-harm')).toBe(8);
    // sp-stride is hidden until verified (its tenths, variations and shuttle): src/engine/verifiedContent.ts
    for (const id of ['sp-registers', 'sp-mango', 'sp-shells', 'sp-shared', 'sp-comping', 'sp-phrasing']) expect(MINI_LESSONS[id], id).toBeDefined();
    expect(MINI_LESSONS['sp-stride']).toBeUndefined();
    for (let i = 1; i <= 18; i++) expect(MINI_LESSONS[UNITS[`tech:k-lh-${i}`]], `k-lh-${i}`).toBeDefined();
    for (const t of ['lh-tex-ear', 'solo-tex-ear', 'comp-rhythm-ear']) {
      expect(TOPIC_GEN[t], t).toBeDefined();
      for (let lv = 1; lv <= TOPIC_GEN[t].levels.length; lv++)
        for (const seed of [1, 2, 3, 42]) {
          const q = genTopic(t, seed, lv, 'x') as { choices: string[]; answer: string; stimulus: unknown[] };
          expect(q.choices).toContain(q.answer);
          expect(q.stimulus.length).toBeGreaterThan(0);
        }
    }
  });
});
