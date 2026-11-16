// HARMONY-REHARM "Still open" closed: the Third Jump and Dark Side games (theory in 12 keys, grading, wiring), the
// guitar open-string pedal ladder, the player's own chords on the guitar, the bass modal-interchange ear level.
import { describe, expect, it } from 'vitest';
import { JUMP_ITEMS, chordId, degreeOf, isJumpSave, jumpAnswer, jumpChain, jumpItem, jumpOver, jumpResult, moveOf, newJumpSave, playedJump, spellJump, startChord, filmCue, type JumpQ } from '../src/engine/thirdJump';
import { DARK_ITEMS, barSymbol, darkAnswer, darkItem, darkResult, judgeTaps, keyName, newDarkSave, tapBar, isDarkSave, type DarkLoop } from '../src/engine/darkSide';
import { commonTones, triadPcs, mediantsOf } from '../src/engine/commonTone';
import { GAME_STEPS, gameForArea, stepCatalogue } from '../src/engine/path';
import { BONUS_GAMES, bonusSteps } from '../src/engine/pathBonus';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { isKeyGame, gameKeyTitle, gameKeyFamily, keyTakesOf } from '../src/engine/gameKeys';
import { gameEvents } from '../src/engine/gameRating';
import { clearsRun, gameXp, tierSpec, TIERS } from '../src/engine/gameTiers';
import { boardGames } from '../src/engine/gameBoard';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { gradeHeldChoices, analyzeHeldChoiceTake } from '../src/engine/drills/ctFreeAnalyze';
import { OPEN_PEDAL } from '../src/engine/drills/colorDrills';
import { UNITS } from '../src/content/mini/reharmColor';
import type { PlayedNote } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;
const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);

describe('Third Jump: chromatic mediants', () => {
  it('spells the jumps on the letter a 3rd away: C → E, A♭, A, E♭; E → G♯, C, C♯, G', () => {
    const C = startChord(0, false);
    expect(mediantsOf(C).map((t) => spellJump(C, t).name)).toEqual(['E', 'A♭', 'A', 'E♭']);
    const E = startChord(4, false);
    expect(mediantsOf(E).map((t) => spellJump(E, t).name)).toEqual(['G♯', 'C', 'C♯', 'G']);
    const Cm = startChord(0, true);
    expect(mediantsOf(Cm).map((t) => spellJump(Cm, t).name)).toEqual(['Em', 'A♭m', 'Am', 'E♭m']);
    // never a double accidental or B♯ / E♯ as a root
    for (let r = 0; r < 12; r++)
      for (const minor of [false, true]) {
        const s = startChord(r, minor);
        for (const t of mediantsOf(s)) expect(spellJump(s, t).rootName).not.toMatch(/♭♭|𝄪|B♯|E♯|C♭|F♭/);
      }
  });
  it('every keep question has exactly one choice that keeps the glowing note, and it is a chromatic mediant', () => {
    for (const lv of [1, 2, 5, 6])
      for (const seed of SEEDS)
        for (const q of jumpChain(seed, lv)) {
          if (q.kind !== 'keep') continue;
          expect(triadPcs(q.from)).toContain(q.glow);
          const keeps = q.choices.filter((c) => {
            const m = /^(\d+)(m?)$/.exec(c.id)!;
            return triadPcs({ root: Number(m[1]), minor: m[2] === 'm' }).includes(q.glow);
          });
          expect(keeps.map((c) => c.id)).toEqual([q.answer]);
          expect(moveOf(q.from, q.to)).not.toBeNull();
          expect(new Set(q.choices.map((c) => c.id)).size).toBe(4);
          if (lv === 1) expect(q.from.minor).toBe(false);
        }
  });
  it('mp asks for the doubly chromatic jump; mf by ear offers the four mediants; f asks the right degree', () => {
    let none = 0;
    for (const seed of SEEDS) {
      for (const q of jumpChain(seed, 3))
        if (q.kind === 'none') {
          none++;
          expect(commonTones(q.from, q.to)).toEqual([]);
          for (const c of q.choices.filter((x) => x.id !== q.answer)) {
            const m = /^(\d+)(m?)$/.exec(c.id)!;
            expect(commonTones(q.from, { root: Number(m[1]), minor: m[2] === 'm' }).length).toBe(1);
          }
        }
      for (const q of jumpChain(seed, 4)) {
        expect(q.kind).toBe('ear');
        expect(new Set(q.choices.map((c) => c.id))).toEqual(new Set(mediantsOf(q.from).map(chordId)));
        expect(q.answer).toBe(chordId(q.to));
      }
      for (const q of jumpChain(seed, 5))
        if (q.kind === 'degree') {
          expect(degreeOf(q.to, q.glow)).toBe(q.answer);
          expect(commonTones(q.from, q.to)).toEqual([q.glow]);
        }
    }
    expect(none).toBeGreaterThan(10);
    // C → A♭: C is the 3rd of A♭; C → E: E is the root of E
    expect(degreeOf({ root: 8, minor: false }, 0)).toBe('3');
    expect(degreeOf({ root: 4, minor: false }, 4)).toBe('1');
    expect(degreeOf({ root: 9, minor: true }, 0)).toBe('♭3');
  });
  it('a run is a chain (each jump starts where the last landed) and visits all 12 keys over runs', () => {
    const roots = new Set<number>();
    for (const seed of SEEDS) {
      const ch = jumpChain(seed, 2);
      expect(ch).toHaveLength(JUMP_ITEMS);
      ch.forEach((q, i) => {
        roots.add(q.from.root);
        if (i % 5 !== 0) expect(q.from.root).toBe(ch[i - 1].to.root);
      });
      // item starts walk the cycle of 4ths (every 5th jump)
      expect(pc(ch[5].from.root - ch[0].from.root)).toBe(pc(25));
    }
    expect(roots.size).toBe(12);
  });
  it('ff on MIDI: the played triad must be the target mediant; takes feed key mastery', () => {
    const q = jumpChain(7, 6).find((x): x is Extract<JumpQ, { kind: 'keep' }> => x.kind === 'keep')!;
    expect(playedJump(q, { root: q.to.root, q: q.to.minor ? 'm' : 'M' })).toBe(true);
    expect(playedJump(q, { root: q.to.root, q: q.to.minor ? 'M' : 'm' })).toBe(false);
    expect(playedJump(q, { root: pc(q.to.root + 1), q: q.to.minor ? 'm' : 'M' })).toBe(false);
    let s = newJumpSave(7, 6, 'midi', 'ff');
    for (let i = 0; i < JUMP_ITEMS; i++) s = jumpAnswer(s, true, 1000, true).save;
    expect(jumpOver(s)).toBe(true);
    expect(s.bestStreak).toBe(JUMP_ITEMS);
    const r = jumpResult(s);
    expect(r.detail.right).toBe(JUMP_ITEMS);
    expect(keyTakesOf(r.detail as Record<string, unknown>)!.takes).toHaveLength(JUMP_ITEMS);
    expect(isKeyGame('thirdjump')).toBe(true);
    expect(gameKeyTitle(gameKeyFamily('thirdjump', 'piano'))?.he).toMatch(/[א-ת]/);
    // the film cue grows with the streak; a wrong jump costs a life and resets it
    expect(filmCue(0)).toBe(1);
    expect(filmCue(6)).toBe(1.5);
    let t = newJumpSave(9, 2, 'touch');
    t = jumpAnswer(t, true, 1000).save;
    t = jumpAnswer(t, false, 1000).save;
    expect(t.streak).toBe(0);
    expect(t.lives).toBe(2);
    expect(isJumpSave(t)).toBe(true);
    expect(jumpItem(9, 2, t.i)).toEqual(jumpChain(9, 2)[t.i]);
  });
});

describe('Dark Side: modal interchange by ear', () => {
  it('every loop has its borrowed bars, the asked bar is borrowed, the answer is one of four different choices', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (const seed of SEEDS)
        for (let i = 0; i < DARK_ITEMS; i++) {
          const it = darkItem(seed, lv, i);
          expect(it.loop.bars).toHaveLength(4);
          expect(it.borrowed.length).toBeGreaterThan(0);
          if (lv <= 4) expect(it.borrowed).toHaveLength(1);
          expect(it.borrowed).toContain(it.ask);
          expect(it.choices.map((c) => c.id)).toContain(it.answer);
          expect(new Set(it.choices.map((c) => c.id)).size).toBe(it.choices.length);
          expect(it.choices.length).toBeGreaterThanOrEqual(lv === 1 ? 2 : 4);
          if (lv <= 2) for (const b of it.loop.bars) expect(['M', 'm']).toContain(b.q);
          if (lv === 5) expect(it.borrowed.length).toBeGreaterThanOrEqual(2);
        }
  });
  it('the 12 keys over a run’s first 12 loops; minor loops at ff', () => {
    const keys = new Set<number>();
    for (let i = 0; i < 12; i++) keys.add(darkItem(42, 3, i).loop.key);
    expect(keys.size).toBe(12);
    const minor = SEEDS.flatMap((s) => Array.from({ length: DARK_ITEMS }, (_, i) => darkItem(s, 6, i))).filter((x) => x.loop.minor);
    expect(minor.length).toBeGreaterThan(10);
  });
  it('borrowed chords are spelled from the parallel minor: D: B♭, C, Gm; E: C, D, Am; C: A♭maj7, Fm6, B♭7, Dø7', () => {
    const at = (key: number, bars: DarkLoop['bars']): DarkLoop => ({ key, minor: false, bars });
    const A = { en: 'x', he: 'x' };
    const D = at(2, [{ d: 8, q: 'M', rn: '♭VI', from: A }, { d: 10, q: 'M', rn: '♭VII', from: A }, { d: 5, q: 'm', rn: 'iv', from: A }, { d: 4, q: 'm', rn: 'iii' }]);
    expect(D.bars.map((b) => barSymbol(D, b))).toEqual(['B♭', 'C', 'Gm', 'F♯m']);
    const E = at(4, [{ d: 8, q: 'M', rn: '♭VI', from: A }, { d: 10, q: 'M', rn: '♭VII', from: A }, { d: 5, q: 'm', rn: 'iv', from: A }, { d: 1, q: 'maj7', rn: '♭IImaj7', from: A }]);
    expect(E.bars.map((b) => barSymbol(E, b))).toEqual(['C', 'D', 'Am', 'Fmaj7']);
    const C = at(0, [{ d: 8, q: 'maj7', rn: '♭VImaj7', from: A }, { d: 5, q: 'm6', rn: 'ivm6', from: A }, { d: 10, q: '7', rn: '♭VII7', from: A }, { d: 2, q: 'm7b5', rn: 'iiø7', from: A }]);
    expect(C.bars.map((b) => barSymbol(C, b))).toEqual(['A♭maj7', 'Fm6', 'B♭7', 'Dø7']);
    expect(keyName({ key: 1, minor: true, bars: [] })).toBe('C♯m');
    expect(keyName({ key: 6, minor: false, bars: [] })).toBe('F♯');
  });
  it('taps: the bar a tap counts for, a sixteenth early allowed; hits, false taps (max 2) and misses', () => {
    expect(tapBar(-0.2)).toBe(0);
    expect(tapBar(3.8)).toBe(1);
    expect(tapBar(8.1)).toBe(2);
    expect(tapBar(-1)).toBe(-1);
    expect(tapBar(16)).toBe(-1);
    const it = darkItem(5, 1, 0);
    const b = it.borrowed[0];
    const good = judgeTaps(it, [b * 4 + 0.1], 1);
    expect(good.hits).toEqual([b]);
    expect(good.missed).toEqual([]);
    const other = [0, 1, 2, 3].find((x) => !it.borrowed.includes(x))!;
    const bad = judgeTaps(it, [other * 4 + 1, other * 4 + 2, other * 4 + 3], 1);
    expect(bad.falses).toBe(2);
    expect(bad.missed).toEqual([b]);
    // earlier in the bar scores more
    expect(judgeTaps(it, [b * 4], 1).points).toBeGreaterThan(judgeTaps(it, [b * 4 + 3], 1).points);
  });
  it('a run: right / wrong per caught bar and name; the result clears the tier at 80 %', () => {
    let s = newDarkSave(11, 2, 'p');
    for (let i = 0; i < DARK_ITEMS; i++) {
      const it = darkItem(s.seed, s.level, s.i);
      s = darkAnswer(s, it.borrowed.map((x) => x * 4 + 0.2), true).save;
    }
    expect(isDarkSave(s)).toBe(false);
    const r = darkResult(s);
    expect(r.detail.wrong).toBe(0);
    expect(clearsRun('darkside', 'p', r.score, r.detail)).toBe(true);
    let w = newDarkSave(11, 2, 'p');
    for (let i = 0; i < DARK_ITEMS; i++) w = darkAnswer(w, [], false).save;
    expect(clearsRun('darkside', 'p', darkResult(w).score, darkResult(w).detail)).toBe(false);
  });
});

describe('the two games connect to everything', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[] };
  it('path units (Ear course, from their floors), Jazz bonus steps, games lists, workout, boards', () => {
    const ear = new Set<string>();
    for (let n = 0; n < 60; n++) ear.add(gameForArea('pitch', n, { ...base, plays: [], course: 'ear' }, 1400) ?? '');
    expect([...ear]).toEqual(expect.arrayContaining(['thirdjump', 'darkside']));
    for (let n = 0; n < 30; n++) expect(gameForArea('pitch', n, { ...base, plays: [], course: 'ear' }, 1000)).not.toMatch(/thirdjump|darkside/);
    const jazz = bonusSteps().filter((s) => s.id.startsWith('bonus:jazz:'));
    for (const g of ['thirdjump', 'darkside']) {
      expect(jazz.some((s) => s.game === g), g).toBe(true);
      expect(!!GAME_STEPS[g] && BONUS_GAMES.some((b) => b.game === g)).toBe(true);
      expect(COURSE_GAMES.ear).toContain(g);
      expect(COURSE_GAMES.jazz).toContain(g);
      expect(WORKOUT_GAMES.jazz).toContain(g);
    }
    expect(COURSE_GAMES.keys).toContain('thirdjump');
    expect(WORKOUT_GAMES.ear).toContain('darkside');
    expect(boardGames(COURSE_GAMES.jazz)).toEqual(expect.arrayContaining(['thirdjump', 'darkside']));
  });
  it('glyphs (each its own), badges, tiers in Hebrew, ratings, XP, clears', () => {
    const gl = ['thirdjump', 'darkside'].map((g) => GAME_STEP_GLYPH[g]);
    for (const g of gl) expect(GLYPHS[g], g).toBeDefined();
    expect(gl[0]).not.toBe(gl[1]);
    expect(Object.entries(GAME_STEP_GLYPH).filter(([, v]) => gl.includes(v)).map(([k]) => k).sort()).toEqual(['darkside', 'thirdjump']);
    const at = '2026-11-16T10:00:00Z';
    for (const g of ['thirdjump', 'darkside']) {
      expect(GAME_BADGE_GAMES.some((b) => b.game === g), g).toBe(true);
      const spec = tierSpec(g)!;
      for (const t of TIERS) expect(spec.tiers[t].label.he, `${g} ${t}`).toMatch(/[א-ת]/);
      const d = { right: 9, wrong: 1, tier: 'mf' };
      expect(gameEvents(g, 120, d, at, 's').length, g).toBeGreaterThan(0);
      expect(gameXp(g, 'mf', 120, d)).toBeGreaterThan(0);
      expect(clearsRun(g, 'mf', 120, d)).toBe(true);
    }
    // Third Jump ff is the played tier: taps don't clear it
    expect(clearsRun('thirdjump', 'ff', 120, { right: 10, wrong: 0, input: 'touch' })).toBe(false);
    expect(clearsRun('thirdjump', 'ff', 120, { right: 10, wrong: 0, input: 'midi' })).toBe(true);
  });
});

describe('the guitar open-string pedal (g-color 13–15)', () => {
  const G = guitarCatalog().find((f) => f.id === 'g-color')!;
  const lv = (n: number) => G.levels.find((l) => l.id === `g-color-${n}`)!;
  it('runs in E, A, D (tonic) and A, D, G (dominant), E A D G (open B and E above); the pedal rings in every chord', () => {
    expect(lv(13).keys).toEqual([4, 9, 2]);
    expect(lv(14).keys).toEqual([9, 2, 7]);
    expect(lv(15).keys).toEqual([4, 9, 2, 7]);
    for (const n of [13, 14]) {
      const dom = n === 14;
      for (const d of levelDrills(lv(n), 'fifths-up')) {
        const ped = pc(d.spec.key + (dom ? 7 : 0));
        const str = OPEN_PEDAL[ped];
        const beats = [...new Set(d.notes.map((x) => x.beat))];
        const pedalBars = dom ? beats.slice(0, -1) : beats;
        for (const b of pedalBars) {
          const at = d.notes.filter((x) => x.beat === b);
          expect(at.some((x) => x.string === str && x.fret === 0), `${d.itemId} @${b}`).toBe(true);
          expect(at.length).toBe(4);
          // the pedal is the lowest note
          expect(Math.min(...at.map((x) => x.pitch))).toBe(at.find((x) => x.string === str)!.pitch);
          // fretted notes within one hand position
          const fr = at.filter((x) => (x.fret ?? 0) > 0).map((x) => x.fret!);
          if (fr.length) expect(Math.max(...fr) - Math.min(...fr)).toBeLessThanOrEqual(4);
        }
        if (dom) {
          // home: the tonic triad over its root
          const last = d.notes.filter((x) => x.beat === beats[beats.length - 1]);
          expect(pc(Math.min(...last.map((x) => x.pitch)))).toBe(pc(d.spec.key));
          expect(new Set(last.map((x) => pc(x.pitch)))).toEqual(new Set([0, 4, 7].map((x) => pc(d.spec.key + x))));
          const fr = last.filter((x) => (x.fret ?? 0) > 0).map((x) => x.fret!);
          if (fr.length) expect(Math.max(...fr) - Math.min(...fr)).toBeLessThanOrEqual(4);
        }
      }
    }
  });
  it('the dominant pedal in A: Bm/E – D/E – F/E – E7 – A; in G: Am/D – C/D – E♭/D – D7 – G', () => {
    const a = generate({ family: 'g-color', kind: 'gop-dom', key: 9, hands: 'R', instrument: 'guitar', option: 0 });
    expect(a.chart!.join(' ')).toBe('Bm/E D/E F/E E7 A');
    const g = generate({ family: 'g-color', kind: 'gop-dom', key: 7, hands: 'R', instrument: 'guitar', option: 0 });
    expect(g.chart!.join(' ')).toBe('Am/D C/D E♭/D D7 G');
    const t = generate({ family: 'g-color', kind: 'gop-tonic', key: 4, hands: 'R', instrument: 'guitar', option: 1 });
    expect(t.chart!.join(' ')).toBe('E D/E A/E E');
  });
  it('open B and E above the shapes: the names match the sounding notes', () => {
    const want: Record<number, string> = { 4: 'E C♯m7 Aadd9 E', 9: 'Aadd9 F♯m7add11 D6/9 Aadd9', 2: 'D6/9 G6 Aadd9 D6/9', 7: 'G6 Cmaj7 Em G6' };
    for (const k of [4, 9, 2, 7]) {
      const d = generate({ family: 'g-color', kind: 'gop-ring', key: k, hands: 'R', instrument: 'guitar', option: 0 });
      expect(d.chart!.join(' ')).toBe(want[k]);
      for (const b of [0, 4, 8, 12]) {
        const at = d.notes.filter((x) => x.beat === b);
        expect(at.filter((x) => x.fret === 0 && (x.string === 1 || x.string === 2))).toHaveLength(2);
      }
    }
  });
  it('the lesson is pedal point; the levels stay in their keys', () => {
    expect(UNITS['tech:g-color-13']).toBe('pedal-point');
    expect(UNITS['tech:g-color-15']).toBe('pedal-point');
  });
});

describe('the player’s own chords on the guitar (g-ctone 6)', () => {
  const lvl = guitarCatalog().find((f) => f.id === 'g-ctone')!.levels.find((l) => l.id === 'g-ctone-6')!;
  it('all 12 keys; graded by the held-choice grader (the note anywhere in the strum); the model passes', () => {
    const ds = levelDrills(lvl, 'fifths-up');
    expect(new Set(ds.map((d) => pc(d.spec.key))).size).toBe(12);
    for (const d of ds) {
      expect(d.goal.ct?.count).toBe(8);
      expect(d.goal.ct?.loose).toBe(true);
      const by = new Map<number, number[]>();
      for (const n of d.notes) by.set(n.beat, [...(by.get(n.beat) ?? []), n.pitch]);
      expect(gradeHeldChoices([...by.values()], d.goal.ct!.held, true).map((s) => s.kind), d.itemId).toEqual(Array(8).fill('ok'));
    }
    const d = ds[0];
    const by = new Map<number, number[]>();
    for (const n of d.notes) by.set(n.beat, [...(by.get(n.beat) ?? []), n.pitch]);
    const vs = [...by.values()];
    const played: PlayedNote[] = vs.flatMap((v, k) => v.map((p) => ({ pitch: p, on: 1000 + k * 1500, off: 1000 + k * 1500 + 1200, vel: 80 })));
    expect(analyzeHeldChoiceTake(d, 60, played, { rubato: true }).verdict).toBe('clean');
    // the held note missing from a chord, a repeat
    const H = d.goal.ct!.held;
    expect(gradeHeldChoices([vs[0].filter((p) => pc(p) !== pc(H))], H, true)[0].kind).toBe('held');
    expect(gradeHeldChoices([vs[0], vs[0]], H, true)[1].kind).toBe('repeat');
  });
});

describe('the bass hears borrowed chords (b-ear 24)', () => {
  const lvl = guitarCatalog().find((f) => f.id === 'b-ear')!.levels.find((l) => l.id === 'b-ear-24')!;
  it('all 12 keys; the answer is the roots (the borrowed root included); the chart is spelled from the parallel minor', () => {
    const ds = levelDrills(lvl, 'fifths-up');
    expect(new Set(ds.map((d) => pc(d.spec.key))).size).toBe(12);
    for (const d of ds) {
      expect(d.listen?.notes.length).toBeGreaterThan(0);
      // one root a bar after the band's 4 bars, twice
      expect(d.notes.length).toBe(8);
      const borrowedRoots = d.notes.map((n) => pc(n.pitch - d.spec.key)).filter((x) => [8, 10, 3, 1].includes(x) || false);
      const chart = d.chart!.join(' ');
      expect(borrowedRoots.length + (chart.match(/m6|m(?!aj)/g)?.length ?? 0) + (chart.includes('ø7') ? 1 : 0), chart).toBeGreaterThan(0);
    }
    const dkey = levelDrills(lvl, 'fifths-up').filter((d) => pc(d.spec.key) === 2).map((d) => d.chart!.join(' ')).join(' | ');
    expect(dkey).not.toMatch(/A♯|D♯/);
    const step = stepCatalogue().find((s) => s.id === 'tech:b-ear-24')!;
    expect(step.difficulty).toBe(1450);
    expect(UNITS['tech:b-ear-24']).toBe('modal-mix');
  });
});
