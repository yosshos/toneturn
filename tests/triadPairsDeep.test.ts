// Triad pairs, deep (owner 2026-11-16): the pair map is exact in all 12 keys (every pair's six notes inside its scale,
// the omitted tones exactly the rest, the map equal to a brute-force search, the core list inside it, every triad
// spelled on letters a third apart), the patterns are what they say, the voicings put the named triad on top, every
// new level generates in all 12 keys inside its instrument's range and a steady model take passes, the voicing check
// catches the wrong triad on top, and everything is wired (path, badges, glyphs, lessons, ear levels, the game).
import { describe, expect, it } from 'vitest';
import {
  CORE, EAR_BASE, PAIR_MAP, TP_SCALE_LIST, chordTonesOf, colourTones, coreById, coreHex, coreTriads, earColour, earGroupOf, mapEntry, mod12, pairDegrees, pairNameIn, pairsFor,
  patternUp, patternUpDown, rootIn, scalesHoldingPair, spellTriad, tpScale, triadPcsOf, type PatId, type TPTriad,
} from '../src/engine/triadPairs';
import { TRIAD_PAIRS, pairTriads } from '../src/engine/theoryPlay';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills, shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { analyzeTake, expTimeMs, micUnmeasurable } from '../src/engine/drills/analyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { drillEvents } from '../src/engine/drills/events';
import { BTP_ROWS, GTP_ROWS, KTP_ROWS, TPAIR_LEVEL_IDS, TPAIR_ROW_RATINGS, TP_KEYS, tpDec } from '../src/engine/drills/tpairDrills';
import { TPAIR_PLACEMENT } from '../src/engine/tpairPlacement';
import { LEVEL_PLACEMENT } from '../src/engine/levelPlacement';
import { stepCatalogue, PATH_CAP, GAME_STEPS } from '../src/engine/path';
import { TWELVE_KEY_FAMILIES } from '../src/engine/drills/keys12';
import { pianoStrands, guitarStrands, bassStrands } from '../src/engine/drills/levelTest';
import { TOPIC_GEN } from '../src/engine/topics';
import { gradePlace, placeKey, type ChoiceQuestion, type PlaceQuestion } from '../src/engine/lesson';
import { FAMILY_GLYPH, GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GLYPHS as BADGE_GLYPHS } from '../src/ui/BadgeArt';
import { BADGES, badgeInCourse } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { GAME_TIERS, clearsRun } from '../src/engine/gameTiers';
import { BONUS_GAMES } from '../src/engine/pathBonus';
import { JAZZ_WORKOUT_GAMES } from '../src/engine/workout2';
import { KEY_GAMES } from '../src/engine/gameKeys';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { WP_ITEMS, WP_POOL, isWPSave, newWPSave, playedPair, wpAnswer, wpItem, wpOver, wpResult, wpRun, wrongPairs } from '../src/engine/whichPair';
import type { Drill, PlayedNote } from '../src/engine/drills/types';
import { humanTake } from './pianoTake';

const ALL12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const pcs = (xs: number[]) => [...new Set(xs.map(mod12))].sort((a, b) => a - b);
const CAT = catalog();
const GCAT = guitarCatalog();
const fam = (id: string) => [...CAT, ...GCAT].find((f) => f.id === id)!;
const allLevels: LevelDef[] = [...CAT.flatMap((f) => f.levels), ...GCAT.flatMap((f) => f.levels)];
const lv = (id: string): LevelDef => allLevels.find((l) => l.id === id)!;

// ---------------------------------------------------------------- spelling helpers (independent of the engine)
const LET = 'CDEFGAB';
const NAT = [0, 2, 4, 5, 7, 9, 11];
function parse(n: string): { letter: number; pc: number; acc: number } {
  const letter = LET.indexOf(n[0]);
  const rest = n.slice(1);
  const acc = rest === '♯' ? 1 : rest === '♭' ? -1 : rest === '𝄪' ? 2 : rest === '𝄫' ? -2 : rest === '' ? 0 : NaN;
  return { letter, pc: mod12(NAT[letter] + acc), acc };
}

describe('the pair map is exact', () => {
  it('the catalogue: 7 major modes, 7 melodic-minor modes, harmonic minor and its 5th mode, 3 symmetric scales', () => {
    expect(TP_SCALE_LIST.filter((s) => s.family === 'major')).toHaveLength(7);
    expect(TP_SCALE_LIST.filter((s) => s.family === 'melodic')).toHaveLength(7);
    expect(TP_SCALE_LIST.filter((s) => s.family === 'harmonic').map((s) => s.id)).toEqual(['harm-minor', 'phryg-dom']);
    expect(TP_SCALE_LIST.filter((s) => s.family === 'symmetric').map((s) => s.id)).toEqual(['half-whole', 'augmented', 'whole-tone']);
    // the modes are rotations: dorian = C major from D, altered = C melodic minor from B, phrygian dominant = C harmonic minor from G
    expect(tpScale('dorian').ints).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(tpScale('lydian-dom').ints).toEqual([0, 2, 4, 6, 7, 9, 10]);
    expect(tpScale('altered').ints).toEqual([0, 1, 3, 4, 6, 8, 10]);
    expect(tpScale('locrian-n2').ints).toEqual([0, 2, 3, 5, 6, 8, 10]);
    expect(tpScale('phryg-dom').ints).toEqual([0, 1, 4, 5, 7, 8, 10]);
  });
  it('the derived map equals a brute-force search of every two disjoint major / minor (whole tone: augmented) triads in each scale', () => {
    for (const sc of TP_SCALE_LIST) {
      const qs: [string, number[]][] = sc.id === 'whole-tone' ? [['+', [0, 4, 8]]] : [['M', [0, 4, 7]], ['m', [0, 3, 7]]];
      const tri: number[][] = [];
      for (let r = 0; r < 12; r++) for (const [, iv] of qs) if (iv.every((x) => sc.ints.includes(mod12(r + x)))) tri.push(pcs(iv.map((x) => r + x)));
      const uniq = tri.filter((t, i) => tri.findIndex((u) => u.join() === t.join()) === i);
      const want = new Set<string>();
      for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) if (!uniq[i].some((x) => uniq[j].includes(x))) want.add([uniq[i].join(), uniq[j].join()].sort().join('|'));
      const got = new Set(pairsFor(sc.id).map((p) => [pcs(triadPcsOf(p.a)).join(), pcs(triadPcsOf(p.b)).join()].sort().join('|')));
      expect([...got].sort(), sc.id).toEqual([...want].sort());
    }
  });
  it('every pair in all 12 keys: six notes inside the scale, the omitted tones exactly the rest, no common tone', () => {
    for (const p of PAIR_MAP) {
      const sc = tpScale(p.scale);
      for (const key of ALL12) {
        const A = triadPcsOf(p.a, key);
        const B = triadPcsOf(p.b, key);
        expect(A.some((x) => B.includes(x)), p.id).toBe(false);
        const scale = sc.ints.map((x) => mod12(key + x));
        expect([...A, ...B].every((x) => scale.includes(x)), `${p.id} ${key}`).toBe(true);
        expect(pcs(scale.filter((x) => !A.includes(x) && !B.includes(x))), `${p.id} ${key}`).toEqual(pcs(p.missing.map((x) => key + x)));
      }
      expect(p.missing.length).toBe(sc.ints.length - 6);
      expect(p.avoids.every((x) => !p.missing.includes(x))).toBe(true);
    }
  });
  it('the counts: a diatonic mode has its five adjacent pairs, melodic and harmonic minor two, half-whole twelve, augmented three, whole tone one', () => {
    for (const id of ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const) {
      expect(pairsFor(id), id).toHaveLength(5);
      expect(pairsFor(id).every((p) => p.kind === 'adjacent'), id).toBe(true);
    }
    for (const id of ['mel-minor', 'dorian-b2', 'lydian-aug', 'lydian-dom', 'mixo-b6', 'locrian-n2', 'altered', 'harm-minor', 'phryg-dom'] as const) expect(pairsFor(id), id).toHaveLength(2);
    expect(pairsFor('half-whole')).toHaveLength(12);
    expect(pairsFor('augmented')).toHaveLength(3);
    expect(pairsFor('augmented').every((p) => p.missing.length === 0)).toBe(true);
    expect(pairsFor('whole-tone')).toHaveLength(1);
    // the tritone pairs of the half-whole scale leave out two tones each
    expect(pairsFor('half-whole').every((p) => p.missing.length === 2 && p.kind === 'symmetric')).toBe(true);
  });
  it('the core pairs are in the map, with the tone each leaves out', () => {
    const miss: Record<string, number[]> = { dorian: [2], mixolydian: [9], lydian: [0], ionian: [5], aeolian: [8], 'mixo-no11': [5], 'lydian-dom': [10], altered: [4], 'mel-minor': [3], 'half-dim': [1], 'lydian-aug': [0], 'phryg-dom': [10], 'hw-tritone': [3, 9], augmented: [], 'whole-tone': [] };
    expect(CORE).toHaveLength(15);
    for (const c of CORE) {
      const e = mapEntry(c);
      expect(e, c.id).toBeDefined();
      expect(e!.missing, c.id).toEqual(miss[c.id]);
      // ratings: advanced material, rising in teaching order
      expect(c.rating >= 1350 && c.rating <= 1850, c.id).toBe(true);
    }
    expect(CORE.map((c) => c.rating)).toEqual([...CORE.map((c) => c.rating)].sort((a, b) => a - b));
    // the ionian and dominant core pairs leave out the avoid 11th; the aeolian one the avoid ♭13
    expect(mapEntry(coreById('ionian'))!.avoids).toEqual([]);
    expect(mapEntry(coreById('mixo-no11'))!.avoids).toEqual([]);
    expect(mapEntry(coreById('aeolian'))!.avoids).toEqual([]);
    expect(mapEntry(coreById('mixolydian'))!.avoids).toEqual([5]);
  });
  it('agrees with the existing pairs (theoryPlay.ts): the same two triads for dorian, lydian, lydian dominant, altered, lydian augmented, mixolydian', () => {
    for (const id of ['dorian', 'lydian', 'lydian-dom', 'altered', 'lydian-aug', 'mixolydian'] as const)
      for (const key of ALL12) {
        const old = pairTriads(TRIAD_PAIRS.find((p) => p.id === id)!, key).map(pcs);
        const neu = coreTriads(coreById(id), key).map(pcs);
        expect(neu, `${id} ${key}`).toEqual(old);
      }
  });
  it('degrees and colours: E♭ + F over Cm7 is ♭3 5 ♭7 · 11 13 1; G♭ + A♭ over C7alt adds ♭9 ♯9 ♯11 ♭13; the half-dim pair sits in locrian and locrian ♮2', () => {
    expect(pairDegrees(coreById('dorian'))).toEqual([['♭3', '5', '♭7'], ['11', '13', '1']]);
    expect(colourTones(coreById('altered'))).toEqual(['♭9', '♯9', '♯11', '♭13']);
    expect(colourTones(coreById('lydian'))).toEqual(['9', '♯11', '13']);
    expect(scalesHoldingPair(coreById('half-dim'))).toEqual(expect.arrayContaining(['locrian', 'locrian-n2']));
    expect(scalesHoldingPair(coreById('mel-minor'))).toEqual(expect.arrayContaining(['mel-minor']));
    // F + G is IV + V of melodic minor: over Cm(maj7) it leaves out the ♭3
    expect(mapEntry(coreById('mel-minor'))!.missing).toEqual([3]);
  });
  it('by ear the colours over one plain chord tell every pair of a group apart', () => {
    for (const g of ['maj', 'dom', 'min'] as const) {
      const group = CORE.filter((c) => earGroupOf(c) === g);
      expect(group.length, g).toBeGreaterThanOrEqual(3);
      const labels = group.map((c) => earColour(c).join(' '));
      expect(new Set(labels).size, g).toBe(labels.length);
      // the colours are exactly the pair's notes outside the plain chord
      for (const c of group) expect(earColour(c), c.id).toHaveLength(coreHex(c, 0).filter((x) => !EAR_BASE[g].includes(x)).length);
    }
    expect(earColour(coreById('lydian'))).toEqual(['9', '♯11', '13']);
    expect(earColour(coreById('mixo-no11'))).toEqual(['9', '13']);
    expect(earColour(coreById('mel-minor'))).toEqual(['9', '11', '13', '7']);
    expect(earGroupOf(coreById('augmented'))).toBeNull();
  });
});

describe('spelling in every key', () => {
  const check = (key: number, t: TPTriad, label: string, scale?: Parameters<typeof spellTriad>[2]) => {
    const s = spellTriad(key, t, scale);
    expect(s.notes, label).toHaveLength(3);
    const ps = s.notes.map(parse);
    // three letters a third apart, the right pitch classes, never a double accidental
    expect(ps.map((x) => mod12(x.letter * 0 + x.letter)), label).toEqual([0, 2, 4].map((d) => (ps[0].letter + d) % 7));
    // (an augmented triad may be named from any of its notes: the same set)
    if (t.q === '+') expect(pcs(ps.map((x) => x.pc)), label).toEqual(pcs(triadPcsOf(t, key)));
    else expect(ps.map((x) => x.pc), label).toEqual(triadPcsOf(t, key));
    expect(ps.every((x) => Math.abs(x.acc) <= 1), `${label}: ${s.notes.join(' ')}`).toBe(true);
    expect(['B♯', 'E♯', 'C♭', 'F♭'].includes(s.root), `${label}: root ${s.root}`).toBe(false);
    expect(s.name.startsWith(s.root)).toBe(true);
  };
  it('every triad of every map pair and core pair, in all 12 keys', () => {
    for (const key of ALL12) {
      for (const p of PAIR_MAP) {
        check(key, p.a, `${p.id} a ${key}`, p.scale);
        check(key, p.b, `${p.id} b ${key}`, p.scale);
      }
      for (const c of CORE) {
        check(key, c.a, `${c.id} a ${key}`, c.scale);
        check(key, c.b, `${c.id} b ${key}`, c.scale);
      }
    }
  });
  it('names players use: G♭ + A♭ over C7alt, D + Em over Cmaj7♯11, C + G♯m (augmented), C♯ + D♯m in B lydian, ii of B is C♯', () => {
    expect(pairNameIn(coreById('altered'), 0)).toBe('G♭ + A♭');
    expect(pairNameIn(coreById('lydian'), 0)).toBe('D + Em');
    expect(pairNameIn(coreById('dorian'), 2)).toBe('F + G');
    expect(pairNameIn(coreById('augmented'), 0)).toBe('C + G♯m');
    expect(pairNameIn(coreById('lydian'), 11)).toBe('C♯ + D♯m');
    expect(pairNameIn(coreById('hw-tritone'), 0)).toBe('C + F♯');
    expect(rootIn(11, 2)).toBe('C♯');
    expect(rootIn(11, 9)).toBe('G♯');
    expect(rootIn(5, 7)).toBe('C');
    expect(rootIn(3, 2)).toBe('F');
  });
});

describe('melodic patterns', () => {
  const PATS: PatId[] = ['root', 'perm1', 'perm2', 'inv', 'cell2', 'spread', 'hex'];
  it('every pattern of every core pair in all 12 keys: only the pair’s notes, inside the range, up then the same notes down', () => {
    for (const c of CORE)
      for (const key of ALL12)
        for (const pat of PATS) {
          const [A, B] = coreTriads(c, key);
          const lo = 53 + mod12(A[0] - 53);
          const hi = lo + 26;
          const up = patternUp(A, B, pat, lo, hi);
          const ud = patternUpDown(A, B, pat, lo, hi);
          const six = coreHex(c, key);
          expect(up.length, `${c.id} ${key} ${pat}`).toBeGreaterThanOrEqual(6);
          expect(ud.every((m) => six.includes(mod12(m))), `${c.id} ${key} ${pat}`).toBe(true);
          expect(Math.max(...ud), `${c.id} ${key} ${pat}`).toBeLessThanOrEqual(hi);
          expect(Math.min(...ud), `${c.id} ${key} ${pat}`).toBeGreaterThanOrEqual(lo - 7);
          expect(ud.slice(up.length - 1).reverse(), `${c.id} ${key} ${pat}`).toEqual(up);
        }
  });
  it('triad shapes: root 1-3-5, perm1 3-5-1, perm2 5-1-3, inv cycles the inversions, A and B take turns, each group rising', () => {
    for (const c of CORE.filter((x) => x.a.q !== '+'))
      for (const key of ALL12) {
        const [A, B] = coreTriads(c, key);
        const lo = 53 + mod12(A[0] - 53);
        for (const [pat, first] of [['root', 0], ['perm1', 1], ['perm2', 2], ['inv', -1]] as [PatId, number][]) {
          const up = patternUp(A, B, pat, lo, lo + 26);
          for (let g = 0; g * 3 < up.length; g++) {
            const grp = up.slice(g * 3, g * 3 + 3);
            const T = g % 2 === 0 ? A : B;
            const inv = first >= 0 ? first : g % 3;
            expect(grp.map(mod12), `${c.id} ${key} ${pat} ${g}`).toEqual([T[inv], T[(inv + 1) % 3], T[(inv + 2) % 3]]);
            expect(grp[0] < grp[1] && grp[1] < grp[2], `${c.id} ${key} ${pat}`).toBe(true);
            if (g > 0) expect(grp[0] > up[(g - 1) * 3], `${c.id} ${key} ${pat}`).toBe(true);
          }
        }
        // two-note cells: two of A, two of B; open triads: root, 5th, 10th
        const cells = patternUp(A, B, 'cell2', lo, lo + 26);
        for (let k = 0; k < cells.length; k += 2) expect(cells.slice(k, k + 2).every((m) => ((k / 2) % 2 === 0 ? A : B).includes(mod12(m))), `${c.id} ${key} cell2`).toBe(true);
        const open = patternUp(A, B, 'spread', lo, lo + 26);
        for (let k = 0; k < open.length; k += 3) {
          const T = (k / 3) % 2 === 0 ? A : B;
          expect([open[k + 1] - open[k], open[k + 2] - open[k]], `${c.id} ${key} spread`).toEqual([mod12(T[2] - T[0]), 12 + mod12(T[1] - T[0])]);
        }
        // the hexatonic scale: rising by step through all six notes
        const hex = patternUp(A, B, 'hex', lo, lo + 26);
        expect(pcs(hex)).toEqual(coreHex(c, key));
        expect(hex.every((m, i) => i === 0 || m > hex[i - 1])).toBe(true);
      }
  });
});

describe('k-tpair: the keys family', () => {
  it('16 levels at their path ratings (1350–1840, rising), the same as the placement table; jazz emphasis only', () => {
    const f = fam('k-tpair');
    expect(f.levels).toHaveLength(KTP_ROWS.length);
    expect(KTP_ROWS).toHaveLength(16);
    expect(TPAIR_ROW_RATINGS).toEqual(TPAIR_PLACEMENT);
    for (const [id, r] of Object.entries(TPAIR_PLACEMENT)) expect(LEVEL_PLACEMENT[id], id).toBe(r);
    const steps = stepCatalogue();
    for (const id of [...TPAIR_LEVEL_IDS.keys, ...TPAIR_LEVEL_IDS.guitar, ...TPAIR_LEVEL_IDS.bass]) {
      const st = steps.find((s) => s.id === `tech:${id}`);
      expect(st, id).toBeDefined();
      expect(st!.difficulty, id).toBe(TPAIR_PLACEMENT[id]);
      expect(st!.difficulty).toBeGreaterThanOrEqual(1350);
      expect(st!.difficulty).toBeLessThanOrEqual(Math.min(1850, PATH_CAP));
    }
    expect(KTP_ROWS.map((r) => r.rating)).toEqual([...KTP_ROWS.map((r) => r.rating)].sort((a, b) => a - b));
    expect(shownFamilies({ emphasis: 'jazz' }).map((x) => x.id)).toContain('k-tpair');
    expect(shownFamilies({ emphasis: 'classical' }).map((x) => x.id)).not.toContain('k-tpair');
  });
  for (const id of TPAIR_LEVEL_IDS.keys)
    it(`${id}: all 12 keys, notes from the pair(s), keyboard range, a steady take passes`, () => {
      const l = lv(id);
      const ds = levelDrills(l, 'fifths-up');
      expect(new Set(ds.map((d) => mod12(d.spec.key))).size, id).toBe(12);
      for (const sp of l.specs)
        for (const key of ALL12) {
          const d = generate({ ...sp, key });
          const ps = d.notes.map((n) => n.pitch);
          expect(Math.min(...ps), d.itemId).toBeGreaterThanOrEqual(36);
          expect(Math.max(...ps), d.itemId).toBeLessThanOrEqual(96);
          expect(d.itemId.includes(`:${key}:`), d.itemId).toBe(true);
          if (sp.kind === 'tpk-pat') {
            const six = coreHex(tpDec(sp.option!).c, key);
            expect(d.notes.every((n) => six.includes(mod12(n.pitch))), d.itemId).toBe(true);
            expect(hasRubato(d), d.itemId).toBe(true);
          }
          if (['tpk-vamp', 'tpk-iivi', 'tpk-blues', 'tpk-form', 'tpk-slip', 'tpk-sym', 'tpk-comp'].includes(sp.kind)) {
            // lines over a chart: the band, the chart, the count-in and click are the drill runner's (timed)
            expect(d.band, d.itemId).toBeDefined();
            expect(d.chart?.length, d.itemId).toBeGreaterThan(0);
          }
        }
      for (const sp of l.specs)
        for (const key of [0, 6, 11]) {
          const d = generate({ ...sp, key });
          const bpm = targetBpmOf(l, d);
          const m = analyzeTake(d, bpm, humanTake(d, bpm, 4, 3));
          expect(m.verdict, `${d.itemId} @${bpm}: ${m.why.en}`).toBe('clean');
        }
    });
  it('lines over changes: every bar’s notes come from that bar’s pair (the side-slip bars from the slid pair)', () => {
    for (const key of ALL12) {
      const iivi = generate({ family: 'k-tpair', kind: 'tpk-iivi', key, hands: 'R', option: 1 });
      const pairs = [[2, 'dorian'], [7, 'altered'], [0, 'lydian'], [0, 'lydian']] as const;
      for (const n of iivi.notes.filter((x) => x.beat < 16)) {
        const [d, id] = pairs[Math.floor(n.beat / 4)];
        expect(coreHex(coreById(id), key + d).includes(mod12(n.pitch)), `${key} ${n.beat}`).toBe(true);
      }
      const slip = generate({ family: 'k-tpair', kind: 'tpk-slip', key, hands: 'R', option: 0 });
      const shift = [0, 1, 0, -1];
      for (const n of slip.notes.filter((x) => x.beat < 16)) expect(coreHex(coreById('dorian'), key + shift[Math.floor(n.beat / 4)]).includes(mod12(n.pitch)), `slip ${key} ${n.beat}`).toBe(true);
      const sym = generate({ family: 'k-tpair', kind: 'tpk-sym', key, hands: 'R', option: 0 });
      const hw = tpScale('half-whole').ints.map((x) => mod12(key + x));
      expect(sym.notes.every((n) => hw.includes(mod12(n.pitch))), `sym ${key}`).toBe(true);
      // the chart names the chords spelled in the key
      expect(iivi.chart![0]).toBe(`${rootIn(key, 2)}m7`);
    }
  });
});

describe('voicings on the keys', () => {
  const chordsOf = (d: Drill) => [...new Set(d.notes.map((n) => n.chordId).filter((x): x is number => x !== undefined))].map((id) => ({ id, ns: d.notes.filter((n) => n.chordId === id) }));
  it('close, spread, block and comping: the named triad on top of every chord, the lower triad / bass below, two hands', () => {
    for (const kind of ['tpk-close', 'tpk-spread', 'tpk-block', 'tpk-comp'])
      for (const op of kind === 'tpk-comp' ? [0, 1, 2] : [0, 2, 6, 7])
        for (const key of ALL12) {
          const d = generate({ family: 'k-tpair', kind, key, hands: 'RL', option: op });
          const pv = d.goal.pairVoicing!;
          expect(pv.length, d.itemId).toBe(chordsOf(d).length);
          for (const { id, ns } of chordsOf(d)) {
            const v = pv.find((x) => x.chordId === id)!;
            const sorted = ns.map((n) => n.pitch).sort((a, b) => a - b);
            expect(pcs(sorted.slice(-3)), `${d.itemId} ${id}`).toEqual(v.top);
            if (v.low) expect(pcs(sorted.slice(0, 2)), `${d.itemId} ${id}`).toEqual(v.low);
            if (v.bass !== undefined) expect(mod12(sorted[0]), `${d.itemId} ${id}`).toBe(v.bass);
            // the top triad is one of the two triads of a core pair (the chord's own pair)
            expect(v.top).toHaveLength(3);
          }
          expect(d.goal.hands, d.itemId).toBe(true);
          expect(micUnmeasurable(d), d.itemId).toContain('voicing');
          const rh = d.notes.filter((n) => n.hand === 'R').map((n) => n.pitch);
          expect(Math.max(...rh), d.itemId).toBeLessThanOrEqual(84);
        }
  });
  it('spread: the lower triad’s root and 5th in the LH, its 3rd as the 10th, the other triad close on top', () => {
    const d = generate({ family: 'k-tpair', kind: 'tpk-spread', key: 0, hands: 'RL', option: 0 });
    const first = d.notes.filter((n) => n.chordId === 1).sort((a, b) => a.pitch - b.pitch);
    // over Cm7 (E♭ + F): F2 C3 | A3 E♭4 G4 B♭4
    expect(first.map((n) => n.pitch)).toEqual([41, 48, 57, 63, 67, 70]);
    expect(first.map((n) => n.hand)).toEqual(['L', 'L', 'R', 'R', 'R', 'R']);
  });
  it('the voicing check: the same notes with the wrong triad on top (or by microphone) do not pass', () => {
    const d = generate({ family: 'k-tpair', kind: 'tpk-close', key: 0, hands: 'RL', option: 0 });
    const bpm = 60;
    const good: PlayedNote[] = d.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: expTimeMs(d, n.beat + n.dur, bpm) - 30, vel: 72 }));
    expect(analyzeTake(d, bpm, good).verdict).toBe('clean');
    // chord 2 (F A C on top) played with its triad dropped an octave under the LH 7th: the notes are right, the voicing is not
    const c2 = d.notes.filter((n) => n.chordId === 2).map((n) => n.pitch);
    const bad = good.map((p) => (c2.includes(p.pitch) && Math.abs(p.on - expTimeMs(d, 2, bpm)) < 5 ? { ...p, pitch: p.pitch - 24 } : p));
    const m = analyzeTake(d, bpm, bad);
    expect(m.verdict).not.toBe('clean');
    expect(analyzeTake(d, bpm, good, undefined, { mic: true }).verdict).toBe('not');
  });
});

describe('g-tpair and b-tpair', () => {
  function gtake(d: Drill, bpm: number): PlayedNote[] {
    const seen = new Set<string>();
    const out: PlayedNote[] = [];
    for (const n of d.notes) {
      const k = `${n.pitch}@${n.beat}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: null, vel: 64 });
    }
    return out.sort((a, b) => a.on - b.on);
  }
  it('7 guitar levels (grades 7–10, the jazz add-on) and 5 bass levels (the jazz track)', () => {
    expect(fam('g-tpair').levels).toHaveLength(GTP_ROWS.length);
    expect(GTP_ROWS).toHaveLength(7);
    for (const l of fam('g-tpair').levels) expect((l as { grade?: number }).grade! >= 7 && (l as { grade?: number }).grade! <= 10).toBe(true);
    expect(fam('b-tpair').levels).toHaveLength(BTP_ROWS.length);
    expect(BTP_ROWS).toHaveLength(5);
  });
  for (const id of [...TPAIR_LEVEL_IDS.guitar, ...TPAIR_LEVEL_IDS.bass])
    it(`${id}: all 12 keys on the neck, the string sets kept, the pair’s notes, a steady take passes`, () => {
      const l = lv(id);
      const bass = id.startsWith('b-');
      for (const sp of l.specs)
        for (const key of ALL12) {
          const d = generate({ ...sp, key });
          expect(d.notes.every((n) => n.fret! >= 0 && n.fret! <= (bass ? 21 : 17)), d.itemId).toBe(true);
          if (bass) expect(d.notes.every((n) => n.pitch >= 28 && n.pitch <= 64), d.itemId).toBe(true);
          if (sp.kind === 'gtp-shapes' || sp.kind === 'gtp-line') {
            const set = tpDec(sp.option!).v === 1 ? [4, 3, 2] : [3, 2, 1];
            expect(d.notes.every((n) => set.includes(n.string!)), d.itemId).toBe(true);
          }
          if (['gtp-shapes', 'gtp-line', 'gtp-hex', 'btp-arp', 'btp-inv'].includes(sp.kind)) {
            const six = coreHex(tpDec(sp.option!).c, key);
            expect(d.notes.every((n) => six.includes(mod12(n.pitch))), d.itemId).toBe(true);
            expect(d.notes.length, d.itemId).toBeGreaterThanOrEqual(sp.kind === 'gtp-shapes' ? 15 : 17);
          }
        }
      for (const sp of l.specs)
        for (const key of [0, 6]) {
          const d = generate({ ...sp, key });
          const bpm = targetBpmOf(l, d);
          const m = analyzeGuitarTake(d, bpm, gtake(d, bpm));
          expect(m.verdict, `${d.itemId} @${bpm}: ${m.why.en}`).toBe('clean');
        }
    });
});

describe('ear: triad-pairs 6–9', () => {
  const T = TOPIC_GEN['triad-pairs'];
  it('nine levels; 6–9 at 1700–1820, the answer among the choices, every choice name different', () => {
    expect(T.levels).toHaveLength(9);
    for (let level = 6; level <= 9; level++)
      for (let seed = 1; seed <= 120; seed++) {
        const q = T.gen(seed, level, 'x') as ChoiceQuestion | PlaceQuestion;
        expect(q.difficulty).toBe([1700, 1740, 1780, 1820][level - 6]);
        if (q.kind === 'choice') {
          expect(q.choices).toContain(q.answer);
          const names = q.choices.map((c) => q.names[c].en);
          expect(new Set(names).size, `${level} ${seed}`).toBe(names.length);
          expect(new Set(q.choices).size).toBe(q.choices.length);
        }
      }
  });
  it('level 7: only the answer fits the chord (every other pair has a note outside the chord’s scale)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = T.gen(seed, 7, 'x') as ChoiceQuestion;
      const ans = coreById(q.answer as never);
      for (const c of q.choices.filter((x) => x !== q.answer)) expect(scalesHoldingPair(coreById(c as never)).includes(ans.scale), `${seed} ${c}`).toBe(false);
    }
  });
  it('level 8: play back the two triads in order — any octave passes, the wrong order does not', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const q = T.gen(seed, 8, 'x') as PlaceQuestion;
      expect(q.kind).toBe('place');
      expect(q.target).toHaveLength(6);
      expect(gradePlace(q, placeKey(q, q.target.map((m) => m + 12))).score).toBe(1);
      expect(gradePlace(q, placeKey(q, [...q.target.slice(3), ...q.target.slice(0, 3)])).score).toBeLessThan(1);
      expect(placeKey(q, q.target)).toBe(q.answer);
    }
  });
  it('the path has every level, in the jazz pack; the lesson for the deep levels exists', () => {
    const steps = stepCatalogue();
    for (let level = 6; level <= 9; level++) {
      const st = steps.find((s) => s.id === `topic:triad-pairs:${level}`);
      expect(st, String(level)).toBeDefined();
      expect(st!.pack).toBe('jazz');
    }
  });
});

describe('Which Pair? (the game)', () => {
  it('ten items a run at every tier; one choice fits; choices distinct; names spelled', () => {
    for (let level = 1; level <= 6; level++)
      for (let seed = 1; seed <= 60; seed++) {
        const run = wpRun(seed * 7919, level);
        expect(run).toHaveLength(WP_ITEMS);
        const keys = new Set<number>();
        for (const q of run) {
          keys.add(q.root);
          expect(q.choices.map((c) => c.id)).toContain(q.answer);
          expect(new Set(q.choices.map((c) => c.label)).size, `${level} ${seed}`).toBe(q.choices.length);
          if (q.kind === 'pick') for (const c of q.choices.filter((x) => x.id !== q.answer)) expect(scalesHoldingPair(coreById(c.id as never)).includes(q.pair.scale)).toBe(false);
          if (level <= 3 || level === 6) expect((WP_POOL[level] ?? WP_POOL[3]).some((c) => c.id === q.pair.id)).toBe(true);
        }
        // a run walks the cycle of 4ths from a random start: ten different keys
        expect(keys.size).toBe(10);
      }
  });
  it('ff: the six notes in any octave and order are the pair; five, or a wrong note, are not', () => {
    const q = wpItem(12345, 6, 0);
    const six = coreHex(q.pair, q.root);
    expect(playedPair(q, six.map((x) => 60 + x).reverse())).toBe(true);
    expect(playedPair(q, six.map((x) => 48 + x))).toBe(true);
    expect(playedPair(q, six.slice(1).map((x) => 60 + x))).toBe(false);
    expect(playedPair(q, [...six.slice(1), mod12(six[0] + 1)].map((x) => 60 + x))).toBe(false);
    expect(wrongPairs(q.pair, CORE).every((c) => !scalesHoldingPair(c).includes(q.pair.scale))).toBe(true);
  });
  it('a run: answers, lives, the result; the save resumes; ff by touch never clears the tier', () => {
    let s = newWPSave(99, 3, 'touch', 'mp');
    expect(isWPSave(s)).toBe(true);
    let n = 0;
    while (!wpOver(s) && n++ < 20) s = wpAnswer(s, n % 4 !== 0, 2000).save;
    const r = wpResult(s);
    expect(r.game).toBe('whichpair');
    expect(r.detail.right + r.detail.wrong).toBe(s.i);
    expect(r.score).toBeGreaterThan(0);
    expect(clearsRun('whichpair', 'ff', 100, { input: 'touch', right: 10, wrong: 0, items: 10 })).toBe(false);
    const midi = wpAnswer(newWPSave(5, 6, 'midi', 'ff'), true, 1000, true).save;
    expect(midi.takes).toHaveLength(1);
    expect(wpResult(midi).detail.keyInst).toBe('piano');
  });
  it('everything connects: tiers, the path, bonus, workout, key mastery, badges, glyphs, Arcade lesson', () => {
    expect(Object.keys(GAME_TIERS.whichpair.tiers)).toEqual(['pp', 'p', 'mp', 'mf', 'f', 'ff']);
    expect(GAME_STEPS.whichpair.minDiff).toBe(1350);
    expect(BONUS_GAMES.some((b) => b.game === 'whichpair')).toBe(true);
    expect(JAZZ_WORKOUT_GAMES.ear).toContain('whichpair');
    expect(KEY_GAMES).toContain('whichpair');
    expect(GAME_BADGE_GAMES.some((g) => g.game === 'whichpair')).toBe(true);
    expect(GLYPHS[GAME_STEP_GLYPH.whichpair]).toBeDefined();
    expect(BADGE_GLYPHS['special:game:whichpair']).toBeDefined();
    expect(MINI_LESSONS[UNIT_LESSON['game:whichpair']]).toBeDefined();
  });
});

describe('wiring', () => {
  it('own symbols (not shared), badges per level, the 12-key families, lessons, level-test steps, skill tags', () => {
    for (const f of ['k-tpair', 'g-tpair', 'b-tpair']) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]), f).toEqual([]);
      expect(TWELVE_KEY_FAMILIES, f).toContain(f);
      expect(MINI_LESSONS[UNIT_LESSON[`tech:${f}`]], f).toBeDefined();
    }
    const kb = BADGES.filter((b) => b.id.startsWith('tech:k-tpair:'));
    expect(kb).toHaveLength(16);
    for (const b of kb) expect(badgeInCourse(b, 'keys'), b.id).toBe(true);
    expect(BADGES.filter((b) => b.id.startsWith('tech:g-tpair:'))).toHaveLength(7);
    expect(BADGE_GLYPHS['family:k-tpair']).toBeDefined();
    expect(BADGE_GLYPHS['family:g-tpair']).toBeDefined();
    const rungs = (ss: { rungs: { level: string }[] }[]) => ss.flatMap((s) => s.rungs.map((r) => r.level));
    expect(rungs(pianoStrands('jazz'))).toContain('k-tpair-6');
    expect(rungs(guitarStrands())).toContain('g-tpair-4');
    expect(rungs(bassStrands())).toContain('b-tpair-2');
    const tags = (kind: string, hands: 'R' | 'RL', option: number) => {
      const d = generate({ family: 'k-tpair', kind, key: 0, hands, option });
      return drillEvents(d, analyzeTake(d, d.startBpm, humanTake(d, d.startBpm, 4, 1)), '2026-11-16T00:00:00Z', 's', 0).flatMap((e) => e.tags ?? []).map((t) => t.sub);
    };
    expect(tags('tpk-pat', 'R', 0)).toContain('improv/vocab');
    expect(tags('tpk-close', 'RL', 0)).toContain('chords/voicing');
    // every lesson is free of emoji and names no teacher
    for (const u of ['tech:k-tpair', 'tech:g-tpair']) {
      const l = JSON.stringify(MINI_LESSONS[UNIT_LESSON[u]]);
      expect(/\p{Extended_Pictographic}/u.test(l.replace(/𝄞/g, ''))).toBe(false);
      expect(/Weiskopf|Campbell|Bergonzi|Goldings/.test(l)).toBe(false);
    }
    expect(TP_KEYS).toHaveLength(12);
    expect(chordTonesOf('altered')).toEqual([0, 4, 10]);
  });
});
