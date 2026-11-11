// 0.70: the top-tier content and the advanced games built on shared engines (Rush modes, Highway R9 / R10 / kit 7,
// chromatic Echo pads, the PD Name That Tune catalogue, jazz-harmony facts, the groove level test, the game board).
import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topicKit';
import { currentItem, isRounds, isStreak, newRush, rushAnswer, rushHears, rushResult, roundPoints, ROUNDS, START_LIVES, type RushMode } from '../src/engine/rush';
import { clearsRun, GAME_TIERS, lockReason, tierAllowed, tierDef, tierInfo, TIERS, type DynName } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';
import { voiceAs, ntsStart, chartBars, NTS_TUNES } from '../src/engine/topicsAdvGames';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { backingTrack, highwaySong, hitWindows, ODD_LEVEL, POLY_LEVEL } from '../src/engine/highway';
import { melodyGame, PAD_SETS, padLabel, padSemis } from '../src/engine/memory';
import { minorMutation, PD_TUNES, tuneById, tuneCatalogue } from '../src/engine/pdTunes';
import { songEvents } from '../src/engine/nameTune';
import { factItem, jazzHarmFact } from '../src/engine/theoryFacts';
import { grooveTierPlan, grooveTierScore } from '../src/engine/grooveTier';
import { boardGames, boardRows, boardTiers } from '../src/engine/gameBoard';
import { COURSE_GAMES } from '../src/ui/courseRows';
import type { ChoiceQuestion } from '../src/engine/lesson';

const ADV = ['rush-voicing', 'rush-scale', 'rush-standard', 'reharm', 'transcribe', 'bhtime', 'riffecho', 'polylock'];
const rnd = (seed: number) => {
  let a = seed >>> 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};

describe('advanced games: tiers', () => {
  it('open at mp; pp and p say "opens at mp"; six tiers each', () => {
    for (const g of ADV) {
      const spec = GAME_TIERS[g];
      expect(spec, g).toBeTruthy();
      expect(Object.keys(spec.tiers)).toEqual(TIERS);
      expect(spec.minTier).toBe('mp');
      const info = tierInfo(g, {}, undefined, 'jazz');
      expect(info.open).toBe('mp');
      expect(tierAllowed(info, 'pp')).toBe(false);
      expect(tierAllowed(info, 'mf')).toBe(true);
      expect(lockReason(info, 'p', 'en')).toBe('opens at mp');
      expect(lockReason(info, 'p', 'he')).toContain('mp');
    }
  });
  it('every tier rung is a real topic level that generates a heard choice', () => {
    for (const g of ['rush-voicing', 'rush-scale', 'rush-standard', 'rush-chord', 'rush-progression']) {
      for (const t of TIERS) {
        for (const r of tierDef(g, t)?.rungs ?? []) {
          const def = TOPIC_GEN[r.topic];
          expect(def, `${g} ${t} ${r.topic}`).toBeTruthy();
          expect(r.level).toBeLessThanOrEqual(def.levels.length);
          for (let s = 1; s <= 6; s++) {
            const q = def.gen(s * 7919, r.level, 'x') as ChoiceQuestion;
            expect(q.kind).toBe('choice');
            expect(q.choices).toContain(q.answer);
            expect(new Set(q.choices).size).toBe(q.choices.length);
            for (const c of q.choices) expect(q.names[c], `${r.topic}#${r.level} ${c}`).toBeTruthy();
            if (r.topic !== 'chord-read') expect(q.stimulus.length, `${r.topic}#${r.level}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
  it('the advanced games are placed in their courses (riff echo not in drums: the kit has Odd-meter Echo)', () => {
    expect(COURSE_GAMES.jazz).toEqual(expect.arrayContaining(['rush-standard', 'rush-voicing', 'reharm', 'bhtime', 'transcribe', 'rush-scale']));
    expect(COURSE_GAMES.ear).toEqual(expect.arrayContaining(['rush-voicing', 'reharm', 'rush-scale', 'transcribe', 'rush-standard', 'polylock']));
    expect(COURSE_GAMES.keys).toEqual(expect.arrayContaining(['bhtime', 'rush-voicing', 'transcribe', 'riffecho', 'polylock']));
    expect(COURSE_GAMES.guitar).toEqual(expect.arrayContaining(['rush-voicing', 'riffecho']));
    expect(COURSE_GAMES.bass).toContain('riffecho');
    expect(COURSE_GAMES.drums).toContain('polylock');
    expect(COURSE_GAMES.drums).not.toContain('riffecho');
    expect(COURSE_GAMES.voice).toContain('rush-scale');
  });
  it('rated in the tier band; touch never clears an instrument game', () => {
    for (const g of ADV) {
      const ev = gameEvents(g, 80, { tier: 'ff', accuracy: 80, right: 8, wrong: 2, level: 1 }, '2026-11-11T10:00:00Z', 's1');
      expect(ev.length, g).toBeGreaterThan(0);
      expect(ev[0].difficulty).toBeGreaterThanOrEqual(1400);
    }
    expect(clearsRun('bhtime', 'mf', 95, { accuracy: 95, input: 'midi' })).toBe(true);
    expect(clearsRun('bhtime', 'mf', 95, { accuracy: 95, input: 'touch' })).toBe(false);
    expect(clearsRun('reharm', 'mp', 0, { right: 6 })).toBe(true);
    expect(clearsRun('reharm', 'mp', 0, { right: 5 })).toBe(false);
  });
});

describe('Rush modes', () => {
  const run = (mode: RushMode, tier: DynName) => newRush({ mode, seed: 42, startLevel: 1, tier, rungs: tierDef(`rush-${mode}`, tier)?.rungs });
  it('Voicing Spy is a streak; Scale & Mode Rush timed; Name That Standard 10 rounds', () => {
    expect(isStreak('voicing')).toBe(true);
    expect(isRounds('standard')).toBe(true);
    expect(run('voicing', 'mf').lives).toBe(START_LIVES);
    expect(run('scale', 'mp').timeLeftMs).toBe(60_000);
    let s = run('standard', 'mf');
    expect(s.timeLeftMs).toBe(0);
    for (let i = 0; i < ROUNDS; i++) s = rushAnswer(s, i % 2 === 0, undefined, 1000).state;
    expect(s.over).toBe(true);
    expect(rushResult(s).detail.right).toBe(5);
    expect(clearsRun('rush-standard', 'mf', s.score, rushResult(s).detail)).toBe(false);
  });
  it('rounds score speed: 10 within 2 s, 5 at 12 s', () => {
    expect(roundPoints(1500)).toBe(10);
    expect(roundPoints(12000)).toBe(5);
    expect(roundPoints(7000)).toBeLessThan(10);
  });
  it('their items sound', () => {
    for (const m of ['voicing', 'scale', 'standard'] as RushMode[]) {
      const s = run(m, 'ff');
      expect(rushHears(m, currentItem(s))).toBe(true);
    }
  });
});

describe('top-tier content', () => {
  it('voicings: drop 2 / drop 3 move one voice an octave down; rootless has no root; quartal stacks 4ths', () => {
    const close = voiceAs('closed', 0, 'maj7');
    expect(Math.max(...close) - Math.min(...close)).toBeLessThan(12);
    const d2 = voiceAs('drop2', 0, 'maj7');
    expect(d2.map((m) => m % 12).sort()).toEqual(close.map((m) => m % 12).sort());
    expect(Math.max(...d2) - Math.min(...d2)).toBeGreaterThan(12);
    const rl = voiceAs('rootless', 5, 'dom7');
    expect(rl.some((m) => m % 12 === 5)).toBe(false);
    const q = voiceAs('quartal', 2, 'm7');
    expect(q.slice(1).map((m, i) => m - q[i])).toEqual([5, 5, 5]);
    expect(voiceAs('upper', 0, 'dom7')).toHaveLength(6);
  });
  it('Name That Standard: real tunes, bar 1 early, the middle and another key at ff', () => {
    for (const t of NTS_TUNES) expect(STANDARD_CHANGES.some((s) => s.id === t.id), t.id).toBe(true);
    expect(ntsStart(32, 1, rnd(1))).toBe(0);
    expect(ntsStart(32, 3, rnd(1))).toBe(16);
    expect(ntsStart(12, 3, rnd(1))).toBe(8);
    const s4 = ntsStart(32, 4, rnd(3));
    expect(s4).toBeGreaterThanOrEqual(4);
    expect(s4).toBeLessThanOrEqual(28);
    expect(chartBars('C | % | F')).toEqual(['C', 'C', 'F']);
    const q = TOPIC_GEN['name-standard'].gen(5, 4, 'x') as ChoiceQuestion;
    expect(q.choices).toHaveLength(4);
  });
  it('Highway R9: odd meters from the prog engine, every group start played; R10 polyrhythm composite; kit 7', () => {
    for (let song = 1; song <= 3; song++) {
      const s = highwaySong({ mode: 'tap', level: ODD_LEVEL, song, bpm: 140 });
      expect(s.groups!.reduce((a, b) => a + b, 0)).toBe(s.beatsPerBar * 2);
      expect([5, 7, 9, 11]).toContain(s.beatsPerBar * 2);
      expect(s.notes.some((n) => n.beat === 0)).toBe(true);
      expect(s.meterLabel).toMatch(/\/8 · /);
      const bt = backingTrack(s);
      expect(bt.clicks).toHaveLength(s.groups!.length);
    }
    const p = highwaySong({ mode: 'tap', level: POLY_LEVEL, song: 1, bpm: 120 });
    expect(p.meterLabel).toBe('3:2');
    expect(p.notes.filter((n) => n.bar === 0).map((n) => Math.round(n.beat * 1000) / 1000)).toEqual([0, 0.667, 1, 1.333]);
    expect(hitWindows(POLY_LEVEL, 120).good).toBeGreaterThan(0);
    const labels = new Set([1, 2, 3, 4].map((song) => highwaySong({ mode: 'kit', level: 7, song, bpm: 140 }).meterLabel));
    expect(labels.size).toBeGreaterThan(1);
    const k = highwaySong({ mode: 'kit', level: 7, song: 1, bpm: 140 });
    expect(k.notes.every((n) => n.midi !== null)).toBe(true);
    expect(tierDef('highway', 'ff')?.levels).toEqual([9, 10, 9]);
    expect(tierDef('highway', 'ff')?.params?.kit).toEqual([7]);
  });
  it('Echo Chain chromatic pads: twelve distinct notes, labelled ♭2 … ♯4 … ♭7', () => {
    expect(PAD_SETS.chroma.map(padSemis)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(padLabel(2.5)).toBe('♭3');
    expect(padLabel(4.5)).toBe('♯4');
    expect(padLabel(5)).toBe('5');
    const g = melodyGame(3, [...PAD_SETS.chroma]);
    expect(new Set(g.pads.map((p) => p.midi)).size).toBe(12);
    expect(tierDef('melody', 'f')?.params?.pads).toBe('chroma');
    expect(tierDef('melody', 'mf')?.params?.pads).toBe('blue');
  });
  it('Name That Tune catalogue: PD tunes per tier, sound right, minor mutation', () => {
    expect(new Set(PD_TUNES.map((t) => t.id)).size).toBe(PD_TUNES.length);
    for (const t of PD_TUNES) {
      expect(t.semis.length, t.id).toBe(t.beats.length);
      expect(t.source.length).toBeGreaterThan(3);
    }
    for (const t of TIERS) expect(tuneCatalogue(t).length, t).toBeGreaterThanOrEqual(8);
    expect(tuneCatalogue('mp').some((s) => s.id === 'elise')).toBe(true);
    expect(tuneCatalogue('pp').some((s) => s.id === 'elise')).toBe(false);
    const elise = songEvents(tuneById('elise')!, 69);
    expect(elise.events.slice(0, 3).map((e) => e.midi)).toEqual([76, 75, 76]);
    const ode = minorMutation(tuneById('ode')!);
    expect(ode.semis!.slice(0, 2)).toEqual([3, 3]); // E → E♭
    expect(minorMutation(tuneById('elise')!)).toBe(tuneById('elise'));
  });
  it('jazz-harmony facts read as statements with a reason', () => {
    const r = rnd(9);
    let t = 0;
    for (let i = 0; i < 60; i++) {
      const f = jazzHarmFact(r);
      expect(f.topic).toBe('jazz');
      expect(f.text.en.length).toBeGreaterThan(10);
      expect(f.why.he.length).toBeGreaterThan(5);
      if (f.truth) t++;
    }
    expect(t).toBeGreaterThan(10);
    expect(t).toBeLessThan(50);
    expect(factItem(['jazz'], 3, rnd(4)).level).toBe(3);
  });
  it('groove level test: in-time silent beats score high, silence scores 0', () => {
    const plan = grooveTierPlan('mp');
    expect(plan.bars).toBe(4);
    const n = plan.plan.length * 4;
    const beatMs = 60000 / plan.bpm;
    expect(grooveTierScore(plan, Array(n).fill(5), beatMs).accuracy).toBeGreaterThan(90);
    expect(grooveTierScore(plan, Array(n).fill(null), beatMs).accuracy).toBe(0);
    const late = grooveTierScore(plan, Array(n).fill(60), beatMs);
    expect(late.accuracy).toBeLessThan(80);
    expect(clearsRun('groove', 'mp', 90, { accuracy: 90 })).toBe(true);
    expect(gameEvents('groove', 90, { tier: 'mp', accuracy: 90 }, '2026-11-11T10:00:00Z', 'g')[0].tags?.[0]?.sub).toBe('timing/pocket');
  });
});

describe('game board', () => {
  it('my local best fills in, places are shared on ties', () => {
    const rows = boardRows([{ name: 'Dana', best: 300, me: false }, { name: 'Avi', best: 300, me: false }], 250, 'You');
    expect(rows.map((r) => [r.name, r.place])).toEqual([['Dana', 1], ['Avi', 1], ['You', 3]]);
    const up = boardRows([{ name: 'Me', best: 100, me: true }], 180, 'You');
    expect(up[0].best).toBe(180);
    expect(boardRows(null, undefined, 'You')).toEqual([]);
  });
  it('only tiered games; advanced games from mp', () => {
    const g = boardGames(COURSE_GAMES.ear);
    expect(g).not.toContain('duel');
    expect(g).not.toContain('daily');
    expect(g).toContain('rush-voicing');
    expect(boardTiers('reharm')).toEqual(['mp', 'mf', 'f', 'ff']);
    expect(boardTiers('highway')).toHaveLength(6);
  });
});
