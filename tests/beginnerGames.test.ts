// AUDIT-7 hole #14: the beginner game per instrument — Staff Runner (keys), Root Catcher (bass), Strum Changes (guitar),
// Rebound Ball (drums), Sing It Back (voice). Generation per tier, 12 keys, grading (the shared matcher, each game's
// judge and checks), the run (lives, tempo, save / resume, result) and the connections (tiers, XP, ratings, path,
// games lists, workout, boards, key mastery, glyphs, badges).
import { describe, expect, it } from 'vitest';
import { afterLap, bResult, bWindow, B_GAMES, B_LAPS, B_LIVES, isBSave, KEYS_BY_EASE, lapKey, lapOutcome, matchLap, newBSave, runOver, type BEvent, type BLap } from '../src/engine/beginnerRun';
import { staffJudge, staffLap, staffTonic, STAFF_LEVELS } from '../src/engine/staffRunner';
import { rootBand, rootJudge, rootLap, ROOT_LEVELS } from '../src/engine/rootCatcher';
import { midiStrumVerdict, strumJudge, strumLap } from '../src/engine/strumChanges';
import { evenness, peakToVel, reboundCheck, reboundJudge, reboundLap } from '../src/engine/reboundBall';
import { singJudge, singLap, singTonic } from '../src/engine/singBack';
import { clearsRun, gameXp, tierSpec, TIERS } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';
import { GAME_STEPS, gameForArea } from '../src/engine/path';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { isKeyGame, keyTakesOf } from '../src/engine/gameKeys';
import { boardGames } from '../src/engine/gameBoard';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { DRUM_QUEST_GAMES } from '../src/engine/quests';
import { gameVerified } from '../src/engine/verifiedContent';
import type { CourseId } from '../src/engine/courses';

const LAPS: Record<string, (seed: number, level: number, lap: number) => BLap> = {
  staffrunner: (s, l, k) => staffLap(s, l, k),
  rootcatch: (s, l, k) => rootLap(s, l, k),
  strumchange: (s, l, k) => strumLap(s, l, k),
  rebound: (s, l, k) => reboundLap(s, l, k),
  singback: (s, l, k) => singLap(s, l, k),
};
const pc = (n: number) => ((n % 12) + 12) % 12;
const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 2654435761) >>> 0);
const ms = (lap: BLap, beat: number) => (beat * 60000) / lap.bpm;

describe('generation: six tiers, laps in the bar, deterministic', () => {
  it('every game, every level: targets inside the lap, rising order, same lap for the same seed', () => {
    for (const g of B_GAMES)
      for (let lv = 1; lv <= 6; lv++)
        for (const s of SEEDS.slice(0, 8)) {
          const a = LAPS[g](s, lv, 2);
          expect(a.targets.length, `${g} ${lv}`).toBeGreaterThan(1);
          expect(a.targets.length).toBeLessThanOrEqual(32);
          a.targets.forEach((t, i) => {
            expect(t.beat).toBeGreaterThanOrEqual(0);
            expect(t.beat).toBeLessThan(a.beats);
            if (i) expect(t.beat).toBeGreaterThan(a.targets[i - 1].beat);
          });
          expect(LAPS[g](s, lv, 2)).toEqual(a);
          expect(a.bpm).toBeGreaterThanOrEqual(60);
        }
  });
  it('the tempo rises with the tier (pp slowest) and with clean laps', () => {
    for (const g of B_GAMES) {
      const pp = LAPS[g](1, 1, 0).bpm;
      expect(LAPS[g](1, 6, 0).bpm, g).toBeGreaterThan(pp);
    }
    expect(staffLap(1, 1, 0, { boost: 2 }).bpm).toBe(staffLap(1, 1, 0).bpm + 8);
    expect(staffLap(1, 1, 0, { boost: 99 }).bpm).toBe(staffLap(1, 1, 0).bpm + 20);
  });
});

describe('keys: easy keys at pp, all 12 at the top', () => {
  const keysAt = (g: string, lv: number) => new Set(SEEDS.flatMap((s) => Array.from({ length: 6 }, (_, k) => LAPS[g](s, lv, k).key)));
  it('Staff Runner, Root Catcher, Sing It Back and Strum Changes (barre / 7ths) reach all 12 keys at f and ff', () => {
    for (const g of ['staffrunner', 'rootcatch', 'singback', 'strumchange'])
      for (const lv of [5, 6]) expect([...keysAt(g, lv)].sort((a, b) => a! - b!), `${g} ${lv}`).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('pp uses only easy keys', () => {
    expect([...keysAt('staffrunner', 1)].sort()).toEqual([0, 5, 7]);
    expect([...keysAt('rootcatch', 1)].sort()).toEqual([2, 4, 9]);
    expect([...keysAt('singback', 1)].sort()).toEqual([0, 5, 7]);
    // open-chord pairs have no key; drums never
    expect([...keysAt('strumchange', 1)]).toEqual([null]);
    expect([...keysAt('rebound', 6)]).toEqual([null]);
  });
  it('12 consecutive laps of a 12-key pool cover every key', () => {
    for (const s of SEEDS.slice(0, 5)) expect(new Set(Array.from({ length: 12 }, (_, k) => lapKey(s, k, KEYS_BY_EASE))).size).toBe(12);
  });
});

describe('Staff Runner', () => {
  it('five-finger positions on the staff: pp treble steps from the tonic, p bass, both clefs above', () => {
    for (const s of SEEDS) {
      const a = staffLap(s, 1, 0);
      expect(a.clef).toBe('treble');
      const t0 = staffTonic(a.key!, 'treble');
      expect(a.targets[0].midi).toBe(t0);
      expect(a.targets.length).toBe(4);
      a.targets.forEach((t, i) => {
        expect(t.midi! - t0).toBeGreaterThanOrEqual(0);
        expect(t.midi! - t0).toBeLessThanOrEqual(7);
        if (i) expect(Math.abs([0, 2, 4, 5, 7].indexOf(t.midi! - t0) - [0, 2, 4, 5, 7].indexOf(a.targets[i - 1].midi! - t0))).toBe(1);
      });
      expect(staffLap(s, 2, 0).clef).toBe('bass');
      expect(staffLap(s, 3, 0).clef).toBe('treble');
      expect(staffLap(s, 3, 1).clef).toBe('bass');
    }
    expect(STAFF_LEVELS[6].rhythm).toBe('mixed');
    expect(SEEDS.some((s) => staffLap(s, 6, 0).targets.length > 8)).toBe(true);
  });
  it('MIDI grades the exact note (enharmonics are one key), the mic the pitch class', () => {
    const t = { beat: 0, midi: 61, label: '' };
    expect(staffJudge('midi')(t, { ms: 0, midi: 61 })).toBe('right');
    expect(staffJudge('midi')(t, { ms: 0, midi: 73 })).toBe('wrong');
    expect(staffJudge('mic')(t, { ms: 0, midi: 73 })).toBe('right');
    expect(staffJudge('mic')(t, { ms: 0, midi: 62 })).toBe('wrong');
  });
});

describe('Root Catcher', () => {
  it('roots of the chart; the band never plays the root', () => {
    const a = rootLap(SEEDS.find((s) => rootLap(s, 1, 0).key === 4)!, 1, 0);
    const roots = a.targets.map((t) => t.pcs![0]);
    expect(roots.every((r) => [4, 9, 11].includes(r))).toBe(true);
    for (const lv of [1, 2, 3, 4, 5, 6])
      for (const t of rootLap(3, lv, 1).targets) {
        expect(rootBand(t).map(pc)).not.toContain(t.pcs![0]);
        expect(rootBand(t).length).toBeGreaterThanOrEqual(2);
      }
    expect(ROOT_LEVELS[6].numerals).toBe(true);
    expect(rootLap(3, 6, 0).targets.every((t) => !!t.num)).toBe(true);
    // two chords a bar from f
    expect(rootLap(3, 5, 0).targets.some((t) => t.beat % 4 === 2)).toBe(true);
  });
  it('any octave of the root; with the mic a chord tone of the band is no decision', () => {
    const t = { beat: 0, pcs: [9], tones: [9, 1, 4], label: 'A' };
    expect(rootJudge('midi')(t, { ms: 0, midi: 33 })).toBe('right');
    expect(rootJudge('midi')(t, { ms: 0, midi: 40 })).toBe('wrong');
    expect(rootJudge('mic')(t, { ms: 0, midi: 40 })).toBe('skip');
    expect(rootJudge('mic')(t, { ms: 0, midi: 38 })).toBe('wrong');
  });
  it('chord symbols are spelled in the key (B♭ in F, F♯m in A)', () => {
    const f = SEEDS.map((s) => rootLap(s, 5, 0)).find((l) => l.key === 5)!;
    expect(f.targets.map((t) => t.label)).toContain('Gm7');
    const ab = SEEDS.map((s) => rootLap(s, 5, 0)).find((l) => l.key === 8)!;
    expect(ab.targets[0].label).toBe('B♭m7');
  });
});

describe('Strum Changes', () => {
  it('pairs alternate, songs run in order, two changes a bar at mf, 12-key barre chords at f', () => {
    const a = strumLap(5, 1, 0);
    expect(a.targets.length).toBe(4);
    expect(a.targets[0].label).toBe(a.targets[2].label);
    expect(a.targets[0].label).not.toBe(a.targets[1].label);
    expect(strumLap(5, 4, 0).targets.length).toBe(8);
    const f = strumLap(5, 5, 0);
    expect(f.targets.map((t) => t.chord!.root)).toEqual([0, 5, 0, 7].map((d) => (f.key! + d) % 12));
  });
  it('a MIDI strum: root + chord tones only', () => {
    expect(midiStrumVerdict([40, 47, 52, 56, 59, 64], { root: 4, quality: 'M' })).toBe('right');
    expect(midiStrumVerdict([40, 47, 52, 55, 59, 64], { root: 4, quality: 'M' })).toBe('wrong');
    expect(midiStrumVerdict([47, 56], { root: 4, quality: 'M' })).toBe('wrong');
    expect(midiStrumVerdict([52], { root: 4, quality: 'M' })).toBe('again');
    expect(strumJudge({ beat: 0, label: '' }, { ms: 0, verdict: 'again' })).toBe('skip');
  });
});

describe('Rebound Ball', () => {
  const lapOf = (lv: number) => reboundLap(1, lv, 0);
  const play = (lap: BLap, vel: (i: number) => number, off = 0): BEvent[] => lap.targets.map((t, i) => ({ ms: ms(lap, t.beat) + off, vel: vel(i) }));
  it('strokes per tier: 8 quarters, 16 eighths, 32 sixteenths; RRLL sticking', () => {
    expect(lapOf(1).targets.length).toBe(8);
    expect(lapOf(2).targets.length).toBe(16);
    expect(lapOf(5).targets.length).toBe(32);
    expect(lapOf(4).targets.slice(0, 4).map((t) => t.label).join('')).toBe('RRLL');
    expect(lapOf(3).targets.filter((t) => t.accent).length).toBe(8);
  });
  it('even strokes pass, uneven fail; accents must stand out; a swell must follow the curve', () => {
    const l = lapOf(2);
    const even = matchLap(l, play(l, () => 80), reboundJudge);
    expect(lapOutcome(even, reboundCheck(l, even, 'midi')).clean).toBe(true);
    const uneven = matchLap(l, play(l, (i) => (i % 2 ? 30 : 110)), reboundJudge);
    const o = lapOutcome(uneven, reboundCheck(l, uneven, 'midi'));
    expect(o.pass).toBe(false);
    expect(o.check?.why).toBe('uneven');
    const a = lapOf(3);
    const flat = matchLap(a, play(a, () => 80), reboundJudge);
    expect(reboundCheck(a, flat, 'midi').why).toBe('accent');
    const acc = matchLap(a, play(a, (i) => (a.targets[i].accent ? 120 : 70)), reboundJudge);
    expect(reboundCheck(a, acc, 'midi').ok).toBe(true);
    const s = lapOf(6);
    const swell = matchLap(s, play(s, (i) => Math.round(20 + 100 * (s.targets[i].level ?? 0))), reboundJudge);
    expect(reboundCheck(s, swell, 'midi').ok).toBe(true);
    const noSwell = matchLap(s, play(s, () => 80), reboundJudge);
    expect(reboundCheck(s, noSwell, 'midi').ok).toBe(false);
  });
  it('stray strokes fail the lap; the mic is more lenient; peaks become velocities', () => {
    const l = lapOf(1);
    const ev = [...play(l, () => 80), ...[1, 2, 3].map((k) => ({ ms: ms(l, k + 0.5), vel: 60 }))];
    expect(reboundCheck(l, matchLap(l, ev, reboundJudge), 'midi').why).toBe('extra');
    const mid = matchLap(l, play(l, (i) => (i % 2 ? 40 : 110)), reboundJudge);
    expect(reboundCheck(l, mid, 'midi').ok).toBe(false);
    expect(reboundCheck(l, mid, 'mic').ok).toBe(true);
    expect(evenness([80, 80, 80])).toBe(100);
    expect(peakToVel(1)).toBe(127);
    expect(peakToVel(0.0001)).toBe(1);
  });
});

describe('Sing It Back', () => {
  it('each answer note is its call note four beats later; inside the singer’s range', () => {
    for (const s of SEEDS)
      for (const lv of [1, 3, 6]) {
        const a = singLap(s, lv, 0, undefined, { low: 50, high: 64 });
        expect(a.calls!.length).toBe(a.targets.length);
        a.targets.forEach((t, i) => {
          expect(t.midi).toBe(a.calls![i].midi);
          expect(t.beat - a.calls![i].beat).toBe(4);
          expect(t.midi!).toBeGreaterThanOrEqual(43);
          expect(t.midi!).toBeLessThanOrEqual(76);
        });
      }
    expect(singTonic(0, 55, 67, 7)).toBe(60);
    expect(singLap(1, 1, 0).targets.length).toBe(4);
    expect(singLap(1, 6, 0).targets.length).toBe(10);
  });
  it('any octave of the sung note counts', () => {
    const t = { beat: 4, midi: 62, label: '' };
    expect(singJudge(t, { ms: 0, midi: 50 })).toBe('right');
    expect(singJudge(t, { ms: 0, midi: 63 })).toBe('wrong');
  });
});

describe('matching heard events to targets', () => {
  const lap = staffLap(9, 3, 0);
  const judge = staffJudge('midi');
  it('on time and right → hit; wrong note → wrong; nothing → miss after the window; the first note decides', () => {
    const w = bWindow(lap);
    const ev: BEvent[] = [
      { ms: ms(lap, lap.targets[0].beat) + 20, midi: lap.targets[0].midi },
      { ms: ms(lap, lap.targets[1].beat) - 10, midi: lap.targets[1].midi! + 1 },
      { ms: ms(lap, lap.targets[1].beat) + 5, midi: lap.targets[1].midi },
    ];
    const m = matchLap(lap, ev, judge, ms(lap, lap.targets[3].beat));
    expect(m.marks[0]).toBe('hit');
    expect(m.marks[1]).toBe('wrong');
    expect(m.marks[2]).toBe('miss');
    expect(m.marks[3]).toBeUndefined();
    expect(m.offs[0]).toBe(20);
    expect(w.early).toBeGreaterThan(0);
    // outside every window: an extra, not a decision
    const late = matchLap(lap, [{ ms: ms(lap, lap.targets[0].beat) + w.late + 5, midi: lap.targets[0].midi }], judge);
    expect(late.marks[0]).toBe('miss');
  });
  it('windows never overlap (≤ 45 % of the gap), even at sixteenths', () => {
    const l = reboundLap(1, 5, 0);
    const w = bWindow(l);
    const gap = ms(l, 0.25);
    expect(w.early + w.late).toBeLessThan(gap);
  });
});

describe('the run', () => {
  const lap = staffLap(4, 1, 0);
  it('three lives, six laps, a clean lap speeds up, keys kept for key mastery', () => {
    let s = newBSave('staffrunner', 4, 1, 'midi', 'pp');
    expect(isBSave(s, 'staffrunner')).toBe(true);
    expect(isBSave(s, 'rootcatch')).toBe(false);
    const clean = { hits: 4, total: 4, pass: true, clean: true, firstMiss: -1 };
    const fail = { hits: 1, total: 4, pass: false, clean: false, firstMiss: 1 };
    s = afterLap(s, lap, clean);
    expect(s.boost).toBe(1);
    expect(s.keys[0]).toEqual({ key: lap.key, acc: 100, bpm: lap.bpm });
    s = afterLap(afterLap(s, lap, fail), lap, fail);
    expect(s.lives).toBe(B_LIVES - 2);
    expect(runOver(s)).toBe(false);
    s = afterLap(s, lap, fail);
    expect(runOver(s)).toBe(true);
    const r = bResult(s, 64);
    expect(r.detail.right).toBe(7);
    expect(r.detail.wrong).toBe(9);
    expect(r.detail.accuracy).toBe(44);
    expect(r.detail.tier).toBe('pp');
    expect(keyTakesOf({ ...r.detail, keyInst: 'piano' })?.takes.length).toBe(4);
    let t = newBSave('rebound', 1, 1, 'mic');
    for (let k = 0; k < B_LAPS; k++) t = afterLap(t, { key: null, bpm: 70 }, clean);
    expect(runOver(t)).toBe(true);
    expect(t.keys).toEqual([]);
    expect(bResult(t, 90).detail).not.toHaveProperty('keyTakes');
  });
  it('a lap passes at 3 of 4', () => {
    expect(lapOutcome({ marks: ['hit', 'hit', 'hit', 'miss'] }).pass).toBe(true);
    expect(lapOutcome({ marks: ['hit', 'hit', 'wrong', 'miss'] }).pass).toBe(false);
    expect(lapOutcome({ marks: ['hit', 'hit', 'hit', 'hit'] }, { ok: false }).pass).toBe(false);
  });
});

describe('connections: everything connects', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[] };
  const COURSE: Record<string, { course: CourseId; plays: string[]; area: 'instrument' | 'voice' }> = {
    staffrunner: { course: 'keys', plays: ['keys'], area: 'instrument' },
    rootcatch: { course: 'bass', plays: ['bass'], area: 'instrument' },
    strumchange: { course: 'guitar', plays: ['guitar'], area: 'instrument' },
    rebound: { course: 'drums', plays: ['drums'], area: 'instrument' },
    singback: { course: 'voice', plays: [], area: 'voice' },
  };
  it('path: every other unit of the beginner band, nothing above 1150 or below 720', () => {
    for (const g of B_GAMES) {
      const c = COURSE[g];
      const inp = { ...base, plays: c.plays, course: c.course };
      for (const d of [740, 820, 900, 1100]) {
        expect(gameForArea(c.area, 1, inp, d), `${g} ${d}`).toBe(g);
        expect(gameForArea(c.area, 3, inp, d), `${g} ${d}`).toBe(g);
      }
      for (let n = 0; n < 20; n++) expect(gameForArea(c.area, n, inp, 1300)).not.toBe(g);
      expect(gameForArea(c.area, 1, inp, 700)).not.toBe(g);
      expect(GAME_STEPS[g].minDiff).toBeLessThanOrEqual(900);
    }
    // the other courses never get them
    expect(gameForArea('instrument', 1, { ...base, plays: ['keys'], course: 'keys' }, 800)).toBe('staffrunner');
    expect(gameForArea('voice', 1, { ...base, plays: [], course: 'voice', noMic: true }, 800)).not.toBe('singback');
  });
  it('games lists, workout rotation, boards, drum quests', () => {
    for (const g of B_GAMES) {
      const c = COURSE[g].course;
      expect(gameVerified(g)).toBe(true);
      expect(COURSE_GAMES[c], g).toContain(g);
      expect(WORKOUT_GAMES[c], g).toContain(g);
      expect(boardGames(COURSE_GAMES[c])).toContain(g);
      for (const other of ['ear'] as CourseId[]) expect(COURSE_GAMES[other]).not.toContain(g);
    }
    expect(DRUM_QUEST_GAMES).toContain('rebound');
  });
  it('tiers (Hebrew labels), clear rule, measured input only, XP, ratings', () => {
    const at = '2026-11-16T10:00:00Z';
    for (const g of B_GAMES) {
      const spec = tierSpec(g)!;
      expect(spec.minTier).toBeUndefined();
      for (const t of TIERS) expect(spec.tiers[t].label.he, `${g} ${t}`).toMatch(/[א-ת]/);
      const d = { right: 34, wrong: 6, accuracy: 85, tier: 'mp', input: 'midi' };
      expect(clearsRun(g, 'mp', 300, d), g).toBe(true);
      expect(clearsRun(g, 'mp', 300, { ...d, right: 28, wrong: 12, accuracy: 70 }), g).toBe(false);
      expect(clearsRun(g, 'mp', 300, { ...d, input: 'touch' }), g).toBe(false);
      expect(gameXp(g, 'mp', 300, d), g).toBeGreaterThan(0);
      expect(gameEvents(g, 300, d, at, 's').length, g).toBeGreaterThan(0);
    }
  });
  it('key mastery for the key-relative ones; glyphs and badges', () => {
    for (const g of ['staffrunner', 'rootcatch', 'strumchange']) expect(isKeyGame(g)).toBe(true);
    for (const g of ['rebound', 'singback']) expect(isKeyGame(g)).toBe(false);
    const glyphs = B_GAMES.map((g) => GAME_STEP_GLYPH[g]);
    for (const k of glyphs) expect(GLYPHS[k], k).toBeDefined();
    expect(new Set(glyphs).size).toBe(5);
    for (const g of B_GAMES) {
      const b = GAME_BADGE_GAMES.find((x) => x.game === g);
      expect(b, g).toBeDefined();
      expect(b!.course).toBe(COURSE[g].course);
    }
  });
});
