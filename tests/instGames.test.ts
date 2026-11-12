import { describe, expect, it } from 'vitest';
import {
  addTakeScore, alignPcs, changeChords, chordPcs, compVoicing, gradeChanges, gradeSequence, gradeWalk, isTakeSave, judgeVoicing, keepsRule, newTakeSave, newVoicingRun, playbackItem, rootsItem, slotOf, swungBeat, takeRunOver, takeRunResult,
  TAKES_PER_RUN, voicingAnswer, voicingExample, voicingItem, voicingResult, voicingSize, walkChart, walkTargets, type Played,
} from '../src/engine/instGames';
import { DYN_NAMES, GAME_TIERS, MEASURED_ONLY, clearsRun, gameXp, tierDef } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { readFileSync } from 'node:fs';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';

const NEW = ['playback', 'voicingsprint', 'changerace', 'walkchanges', 'rootsear', 'harmonyhold', 'singinterval', 'kitread', 'namegroove'];
const pc = (n: number) => ((n % 12) + 12) % 12;

describe('0.76 games are wired like every game', () => {
  it('each has six tiers, a card, a glyph, a rating and a course', () => {
    for (const g of NEW) {
      const spec = GAME_TIERS[g];
      expect(spec, g).toBeTruthy();
      expect(spec.minTier).toBeUndefined();
      for (const t of DYN_NAMES) expect(spec.tiers[t].label.en.length).toBeGreaterThan(2);
      expect(readFileSync('src/ui/Arcade.tsx', 'utf8').includes(`{ id: '${g}',`), g).toBe(true);
      expect(GLYPHS[GAME_STEP_GLYPH[g]], g).toBeTruthy();
      expect(Object.values(COURSE_GAMES).some((l) => l.includes(g)), g).toBe(true);
      expect(gameEvents(g, 80, { accuracy: 80, tier: 'mf', rounds: 4 }, '2026-11-12', 's').length, g).toBeGreaterThan(0);
    }
    expect(COURSE_GAMES.keys).toEqual(expect.arrayContaining(['playback', 'voicingsprint']));
    expect(COURSE_GAMES.guitar).toContain('changerace');
    expect(COURSE_GAMES.bass).toEqual(expect.arrayContaining(['walkchanges', 'rootsear']));
    expect(COURSE_GAMES.voice).toEqual(expect.arrayContaining(['harmonyhold', 'singinterval']));
    expect(COURSE_GAMES.drums).toEqual(expect.arrayContaining(['kitread', 'namegroove']));
  });
  it('glyphs are new symbols, not reused ones', () => {
    const syms = NEW.map((g) => GAME_STEP_GLYPH[g]);
    expect(new Set(syms).size).toBe(syms.length);
    const others = Object.entries(GAME_STEP_GLYPH).filter(([k]) => !NEW.includes(k)).map(([, v]) => v);
    for (const s of syms) expect(others).not.toContain(s);
  });
  it('touch input never clears a measured game; measured runs clear; XP is capped', () => {
    for (const g of ['playback', 'walkchanges', 'rootsear', 'changerace', 'harmonyhold']) {
      expect(MEASURED_ONLY.has(g)).toBe(true);
      expect(clearsRun(g, 'mf', 400, { accuracy: 95, tier: 'mf', input: 'touch' })).toBe(false);
      expect(clearsRun(g, 'mf', 400, { accuracy: 95, tier: 'mf', input: 'mic' })).toBe(true);
      expect(clearsRun(g, 'mf', 400, { accuracy: 70, tier: 'mf', input: 'mic' })).toBe(false);
    }
    expect(clearsRun('voicingsprint', 'pp', 0, { right: 12, wrong: 1, input: 'midi' })).toBe(true);
    expect(clearsRun('voicingsprint', 'pp', 0, { right: 12, wrong: 1, input: 'touch' })).toBe(false);
    expect(gameXp('voicingsprint', 'ff', 0, { right: 40, wrong: 0 })).toBe(25);
  });
});

describe('Play It Back / Roots by Ear', () => {
  it('phrases grow with the level and are deterministic', () => {
    expect(playbackItem(5, 1).notes).toHaveLength(1);
    expect(playbackItem(5, 3).notes).toHaveLength(4);
    expect(playbackItem(5, 4).notes).toHaveLength(4);
    expect(playbackItem(5, 4).chords).toHaveLength(4);
    for (let s = 0; s < 40; s++) {
      const a = playbackItem(s, 6);
      expect(a).toEqual(playbackItem(s, 6));
      expect(a.rhythm && a.swing).toBe(true);
      expect(a.notes.length).toBeGreaterThanOrEqual(6);
      for (let k = 1; k < a.notes.length; k++) expect(a.notes[k].midi).not.toBe(a.notes[k - 1].midi);
      expect(playbackItem(s, 2).notes.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('roots are the progression roots, in a bass register', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let s = 0; s < 20; s++) {
        const it = rootsItem(s * 7 + lv, lv);
        expect(it.chords!.length).toBe(it.notes.length);
        it.notes.forEach((n, i) => {
          expect(pc(n.midi)).toBe(pc(it.chords![i].root));
          expect(n.midi).toBeGreaterThanOrEqual(28);
          expect(n.midi).toBeLessThanOrEqual(39);
        });
      }
  });
  it('grades in order by pitch class; rhythm counts on rhythm items', () => {
    const it = playbackItem(11, 3);
    const exact: Played[] = it.notes.map((n, i) => ({ ms: i * 500, midi: n.midi + 12 }));
    expect(gradeSequence(it, exact, 90).score).toBe(100);
    const swapped = [exact[1], exact[0], ...exact.slice(2)];
    expect(gradeSequence(it, swapped, 90).score).toBeLessThan(100);
    expect(gradeSequence(it, [], 90).score).toBe(0);
    const r = playbackItem(3, 5);
    const beat = 60000 / 100;
    const onTime: Played[] = r.notes.map((n) => ({ ms: n.at * beat, midi: n.midi }));
    const g = gradeSequence(r, onTime, 100);
    expect(g.rhythm).toBe(1);
    expect(g.score).toBe(100);
    const late = onTime.map((p) => ({ ...p, ms: p.ms + 400 }));
    expect(gradeSequence(r, late, 100).score).toBeLessThanOrEqual(60);
  });
  it('alignment counts extras', () => {
    expect(alignPcs([60, 62, 64], [60, 61, 62, 64]).extra).toBe(1);
    expect(swungBeat(1.5, true)).toBeCloseTo(1 + 2 / 3);
    expect(swungBeat(1.5, false)).toBe(1.5);
  });
});

describe('Walk the Changes', () => {
  it('charts per level: blues, ii–V–I, rhythm changes, Giant Steps', () => {
    expect(walkChart(1, 1).chords.every((c) => c.beats === 4)).toBe(true);
    expect(walkChart(1, 4).chords.every((c) => c.beats === 2)).toBe(true);
    expect(walkChart(1, 5).chords).toHaveLength(8);
    expect(walkChart(1, 6).chords.reduce((a, c) => a + c.beats, 0)).toBe(32);
  });
  it('rules: pp root on 1 and fifth on 3; mp approach on 4', () => {
    const c = walkChart(3, 1);
    const t = walkTargets(c);
    expect(t[0].rule).toBe('root');
    expect(t[2].rule).toBe('fifth');
    expect(t[1].rule).toBeNull();
    expect(keepsRule(t[0], c, 28 + pc(c.chords[0].root - 4))).toBe(true);
    expect(keepsRule(t[0], c, 28 + pc(c.chords[0].root - 4) + 1)).toBe(false);
    const m = walkChart(9, 3);
    const tm = walkTargets(m);
    expect(tm.some((x) => x.rule === 'approach')).toBe(true);
  });
  it('a line that keeps every rule in time scores 100; a silent take 0', () => {
    const c = walkChart(4, 2);
    const beat = 60000 / 90;
    const line: Played[] = walkTargets(c).map((t) => ({ ms: t.beat * beat + 10, midi: 36 + chordPcs(c.chords[t.chord])[t.rule === 'tone' ? 1 : 0] }));
    expect(gradeWalk(c, line, 90).score).toBe(100);
    expect(gradeWalk(c, [], 90).score).toBe(0);
    const wrong = line.map((p) => ({ ...p, midi: p.midi + 1 }));
    expect(gradeWalk(c, wrong, 90).score).toBeLessThan(100);
  });
});

describe('Chord Change Race', () => {
  it('chords per level, no repeat in a row', () => {
    for (let lv = 1; lv <= 6; lv++) {
      const cs = changeChords(lv * 13, lv, lv === 6 ? 2 : 4);
      expect(cs).toHaveLength(4);
      for (let i = 1; i < cs.length; i++) expect(cs[i].root === cs[i - 1].root && cs[i].quality === cs[i - 1].quality).toBe(false);
    }
  });
  it('strums on the beat and right score 100; late halves; missing is 0', () => {
    const cs = changeChords(1, 1);
    const beat = 60000 / 70;
    expect(slotOf(cs, 10, 70)).toBe(0);
    expect(slotOf(cs, 4 * beat - 100, 70)).toBe(1);
    const on = cs.map((_, i) => ({ ms: i * 4 * beat + 20, verdict: 'right' as const, chord: i }));
    expect(gradeChanges(cs, on, 70).score).toBe(100);
    const late = on.map((s) => ({ ...s, ms: s.ms + 250 }));
    expect(gradeChanges(cs, late, 70).score).toBe(60);
    expect(gradeChanges(cs, [], 70).score).toBe(0);
  });
});

describe('Voicing Sprint', () => {
  it('the example spelling of every item passes its own judge', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let s = 0; s < 60; s++) {
        const it = voicingItem(s * 31 + lv, lv);
        const ex = voicingExample(it);
        expect(ex.length).toBe(voicingSize(it));
        expect(judgeVoicing(it, ex), `${lv} ${it.symbol} ${it.how.en} ${ex}`).toBe(true);
      }
  });
  it('wrong voicings fail', () => {
    const shell = voicingItem(4, 3);
    expect(judgeVoicing(shell, [60, 64, 67])).toBe(false);
    const tri = voicingItem(2, 1);
    const ex = voicingExample(tri);
    expect(judgeVoicing(tri, [ex[1], ex[2], ex[0] + 12])).toBe(false);
  });
  it('the run: wrong costs time, result carries right / wrong', () => {
    let r = newVoicingRun(9, 2, 'p');
    r = voicingAnswer(r, true);
    r = voicingAnswer(r, false);
    expect(r.right).toBe(1);
    expect(r.timeLeftMs).toBe(58_000);
    expect(voicingResult(r, 'midi').detail).toMatchObject({ right: 1, wrong: 1, tier: 'p' });
  });
});

describe('take runs', () => {
  it('lives, end, result', () => {
    let s = newTakeSave('rootsear', 5, 2, 85, 'p');
    expect(isTakeSave(s, 'rootsear')).toBe(true);
    s = addTakeScore(s, 50);
    s = addTakeScore(s, 90);
    expect(s.lives).toBe(2);
    while (!takeRunOver(s)) s = addTakeScore(s, 90);
    expect(s.takes.length).toBeLessThanOrEqual(TAKES_PER_RUN.rootsear);
    expect(takeRunResult(s, 'mic').detail).toMatchObject({ tier: 'p', input: 'mic', level: 2 });
    expect(compVoicing({ root: 0, quality: 'maj7' })).toEqual([48, 52, 55, 59]);
    expect(tierDef('walkchanges', 'ff')?.levels).toEqual([6]);
  });
});
