// AUDIT-GAMES §4.2 #1–#5: the five new games' engines — generation (theory), grading, the run, all 12 keys.
import { describe, expect, it } from 'vitest';
import { GT_STANDARDS, gtJudge, gtLap, gtMissed, gtResult, guideNames, guidePcs, isGtSave, lapBpm, newGtSave, gtLapDone, gtWindow } from '../src/engine/guideTone';
import { callItem, callPcs, gradeCall, lcsMatch, CALL_TAKES } from '../src/engine/call5432';
import { encItem, gradeEnc, leadSemis, chordScale } from '../src/engine/enclosure';
import { CW_TEMPLATES, cwAdd, cwGrade, cwPuzzle, cwResult, emptyCells, fixBars, locksOf, newCwSave, isCwSave, cwCredit, CW_PUZZLES } from '../src/engine/crossword';
import { HOLD_WAYS, holdAnswer, holdItem, holdPick, holdResult, isHoldSave, newHoldSave, playedWay, heldName } from '../src/engine/holdNote';
import { CT_Q, holdsNote, identifyChord } from '../src/engine/commonTone';
import { cycleKey, pc } from '../src/engine/newGamesKit';
import { degSemis } from '../src/engine/progGrid';

const pcs = (xs: number[]) => new Set(xs.map(pc)).size;

describe('the shared 12-key cycle', () => {
  it('any 12 items of a run cover the 12 keys, moving a 4th', () => {
    for (const s of [1, 77, 4242]) {
      const ks = Array.from({ length: 12 }, (_, i) => cycleKey(s, i));
      expect(pcs(ks)).toBe(12);
      for (let i = 1; i < 12; i++) expect(pc(ks[i] - ks[i - 1])).toBe(5);
    }
    // the start is random
    expect(pcs(Array.from({ length: 60 }, (_, s) => cycleKey(s, 0)))).toBe(12);
  });
});

describe('Guide-Tone Runner', () => {
  it('guide tones are the 3rd and 7th (6th of a tonic 6 / m6, °7 of a dim7), spelled on the chord letters', () => {
    const lap = gtLap(3, 1, 0);
    const [ii, v, one] = lap.chords;
    expect(pc(v.root - ii.root)).toBe(5);
    expect(pc(one.root - v.root)).toBe(5);
    expect(guidePcs(ii)).toEqual([pc(ii.root + 3), pc(ii.root + 10)]);
    expect(guidePcs(v)).toEqual([pc(v.root + 4), pc(v.root + 10)]);
    expect(guidePcs(one)).toEqual([pc(one.root + 4), pc(one.root + 11)]);
    expect(guideNames({ root: 2, q: 'm7', sym: 'Dm7' })).toEqual(['F', 'C']);
    expect(guideNames({ root: 11, q: '7', sym: 'B7' })).toEqual(['D♯', 'A']);
    expect(guideNames({ root: 6, q: 'dim7', sym: 'F♯°7' })).toEqual(['A', 'E♭']);
    expect(guideNames({ root: 0, q: 'm6', sym: 'Cm6' })).toEqual(['E♭', 'A']);
  });
  it('the levels: ii–V–I, the cycle of 4ths, minor ii–V–i, blues, rhythm changes A, standards', () => {
    const l2 = gtLap(9, 2, 0);
    expect(l2.chords.map((c) => c.q)).toEqual(['m7', '7', 'maj7', 'm7', '7', 'maj7']);
    expect(pc(l2.chords[3].root - l2.chords[0].root)).toBe(5);
    const l3 = gtLap(9, 3, 0);
    expect(l3.chords.map((c) => c.q)).toEqual(['m7b5', '7', 'm6']);
    expect(l3.chords[1].sym).toMatch(/7♭9$/);
    const l4 = gtLap(9, 4, 0);
    expect(l4.beats).toBe(48);
    const l5 = gtLap(9, 5, 0);
    expect(l5.beats).toBe(32);
    expect(l5.chords.every((c) => c.beats === 2)).toBe(true);
    expect(l5.chords.some((c) => c.q === 'dim7')).toBe(true);
    for (const st of GT_STANDARDS) expect(st.chords.length).toBeGreaterThan(4);
    for (let lap = 0; lap < 4; lap++) expect(gtLap(9, 6, lap).chords.length).toBeGreaterThan(4);
  });
  it('all 12 keys: level 1 picks any key; laps from level 2 walk the cycle of 4ths', () => {
    expect(pcs(Array.from({ length: 200 }, (_, s) => gtLap(s, 1, 0).key))).toBe(12);
    for (const lv of [3, 4, 5, 6]) expect(pcs(Array.from({ length: 12 }, (_, lap) => gtLap(5, lv, lap).key)), `level ${lv}`).toBe(12);
    expect(pcs(Array.from({ length: 6 }, (_, lap) => gtLap(5, 2, lap).chords.filter((c) => c.q === 'maj7').map((c) => c.root)).flat())).toBe(12);
  });
  it('judging: a guide tone in the window hits, any other note there is wrong, notes between are free; a closed window is a miss', () => {
    const lap = gtLap(3, 1, 0);
    const bpm = 80;
    const beat = 60000 / bpm;
    const caught = lap.chords.map(() => false);
    const [g3] = guidePcs(lap.chords[0]);
    expect(gtJudge(lap, bpm, -100, 60 + g3, caught)).toEqual({ kind: 'hit', i: 0 });
    expect(gtJudge(lap, bpm, 50, 60 + lap.chords[0].root, caught)).toEqual({ kind: 'wrong', i: 0 });
    expect(gtJudge(lap, bpm, 2.5 * beat, 61, caught)).toEqual({ kind: 'free' });
    caught[0] = true;
    expect(gtJudge(lap, bpm, 10, 60 + g3, caught).kind).toBe('dup');
    expect(gtMissed(lap, bpm, 3 * beat, caught)).toBe(-1);
    expect(gtMissed(lap, bpm, (4 + gtWindow(1).late) * beat + 10, caught)).toBe(1);
  });
  it('the run: clean laps go faster and keep their keys; the result carries tier, chain and key takes', () => {
    let s = newGtSave(11, 2, 'midi', 'p');
    const lap0 = gtLap(s.seed, s.level, 0);
    s = gtLapDone(s, lap0);
    expect(isGtSave(s)).toBe(true);
    expect(s.caught).toBe(6);
    expect(lapBpm(2, 1)).toBeGreaterThan(lapBpm(2, 0));
    const r = gtResult(s, gtLap(s.seed, s.level, 1), 2);
    expect(r.detail).toMatchObject({ right: 8, wrong: 1, best: 8, tier: 'p', laps: 1 });
    expect(r.detail.keyTakes).toHaveLength(2);
    expect(r.detail.keyTakes[0]).toMatchObject({ key: lap0.key, acc: 100 });
    expect(r.score).toBeGreaterThan(0);
  });
});

describe('5-4-3-2 Call', () => {
  it('the phrases on the called chord: dominant 3 = the 3-to-9, phrase 4 encloses the 3rd', () => {
    const it2 = { q: 'dom' as const, n: 3 as const, root: 0 };
    expect(callPcs(it2).pcs).toEqual([4, 7, 10, 2]);
    expect(callPcs({ q: 'dom', n: 4, root: 0 }).pcs).toEqual([7, 5, 2, 3, 4]);
    expect(callPcs({ q: 'maj', n: 3, root: 5 }).pcs).toEqual([9, 0, 4, 7]); // F: A C E G
  });
  it('tiers: major, dominant, minor, mixed (rubato), then with the band on the V or the I of a ii–V–I', () => {
    expect(callItem(1, 1, 0)).toMatchObject({ q: 'maj', time: 'free' });
    expect(callItem(1, 2, 0)).toMatchObject({ q: 'dom', time: 'free' });
    expect(callItem(1, 3, 0).sym).toMatch(/m6$/);
    for (let i = 0; i < 20; i++) {
      const f = callItem(3, 5, i);
      expect(f.time).toBe('loose');
      expect(f.chart).toHaveLength(4);
      expect(f.q).toBe(f.bar === 1 ? 'dom' : 'maj');
      expect(pc(f.root - f.key)).toBe(f.bar === 1 ? 7 : 0);
    }
    expect(callItem(3, 6, 0).time).toBe('strict');
    expect(pcs(Array.from({ length: 12 }, (_, i) => callItem(8, 4, i).key))).toBe(12);
    expect(new Set(Array.from({ length: CALL_TAKES }, (_, i) => callItem(8, 1, i).n)).size).toBeGreaterThan(1);
  });
  it('grading: the phrase in order scores 100 in any octave; the optional (G) of phrase 4; extras cost a little', () => {
    const it4 = { ...callItem(1, 2, 0), q: 'dom' as const, n: 4 as const, root: 0, key: 0 };
    const play = (ps: number[]) => ps.map((m, k) => ({ ms: k * 300, midi: m }));
    expect(gradeCall(it4, play([67, 65, 62, 63, 64]), 0).score).toBe(100);
    expect(gradeCall(it4, play([53, 50, 51, 52]), 0).score).toBe(100); // without the (G), an octave lower
    expect(gradeCall(it4, play([65, 62, 64]), 0).score).toBeLessThan(80);
    expect(gradeCall(it4, play([67, 65, 61, 62, 63, 64, 66]), 0).score).toBeLessThan(100);
    expect(gradeCall(it4, [], 0).score).toBe(0);
    expect(lcsMatch([1, 2, 3], [1, 9, 3]).wi).toEqual([0, 2]);
  });
  it('strict timing: notes on their 8ths in the called bar', () => {
    const it = callItem(5, 6, 0);
    const bpm = 108;
    const beat = 60000 / bpm;
    const bar = it.bar! * 4 * beat;
    const { pcs: want } = callPcs(it);
    const notes = (it.n === 4 ? [0, 0.5, 1, 1.5, 2] : it.n === 2 ? [0.5, 1, 1.5, 2, 2.5].slice(0, want.length) : [0, 0.5, 1, 1.5, 2].slice(0, want.length));
    const onTime = want.map((p, k) => ({ ms: bar + notes[k] * beat, midi: 60 + p }));
    const late = onTime.map((n) => ({ ...n, ms: n.ms + 0.45 * beat }));
    const a = gradeCall(it, onTime, bpm);
    expect(a.score).toBeGreaterThanOrEqual(90);
    expect(gradeCall(it, late, bpm).score).toBeLessThan(a.score);
  });
});

describe('Enclosure Target', () => {
  it('the lead-ins as signed semitones into the target', () => {
    const c = { root: 0, q: 'maj7' as const };
    expect(leadSemis('chr-below', 0, c)).toEqual([-1]);
    expect(leadSemis('enc-ab', 4, c)).toEqual([1, -1]);
    expect(leadSemis('enc-step', 4, c)).toEqual([1, -1]); // F above E is the scale step, then E♭
    expect(leadSemis('enc-step', 0, c)).toEqual([2, -1]); // D above C
    expect(leadSemis('enc-bebop', 7, c)).toEqual([2, 1, -1]);
    expect(leadSemis('enc-delayed', 7, c)).toEqual([1, -1, -2, -1]);
    expect(chordScale({ root: 7, q: '7' })).toEqual([7, 9, 11, 0, 2, 4, 5]);
  });
  it('tiers and 12 keys; ff targets the 3rds of the V and the I on beat 1 of their bars', () => {
    const a = encItem(2, 1, 0);
    expect(a.time).toBe('free');
    expect(a.targets[0]).toMatchObject({ deg: 0, lead: 'chr-below', pc: a.key });
    expect(encItem(2, 3, 0).targets[0].lead).toBe('enc-step');
    expect(encItem(2, 5, 0).targets[0].semis).toHaveLength(4);
    const f = encItem(2, 6, 3);
    expect(f.targets.map((t) => t.beat)).toEqual([4, 8]);
    expect(f.targets[0].pc).toBe(pc(f.key + 7 + 4));
    expect(f.targets[1].pc).toBe(pc(f.key + 4));
    expect(pcs(Array.from({ length: 12 }, (_, i) => encItem(4, 2, i).key))).toBe(12);
  });
  it('grading: shape, target and its beat', () => {
    const it = { ...encItem(1, 2, 0) };
    it.targets = [{ ...it.targets[0], pc: 4, semis: [1, -1], lead: 'enc-ab' }];
    const bpm = 80;
    const beat = 60000 / bpm;
    const at = 4 * beat;
    const good = [{ ms: at - beat, midi: 65 }, { ms: at - 0.5 * beat, midi: 63 }, { ms: at + 10, midi: 64 }];
    expect(gradeEnc(it, good, bpm).score).toBe(100);
    const late = good.map((n) => ({ ...n, ms: n.ms + 0.4 * beat }));
    expect(gradeEnc(it, late, bpm).score).toBeLessThan(100);
    const wrongShape = [{ ms: at - beat, midi: 62 }, { ms: at - 0.5 * beat, midi: 66 }, { ms: at, midi: 64 }];
    expect(gradeEnc(it, wrongShape, bpm).score).toBe(50);
    expect(gradeEnc(it, [], bpm).score).toBe(0);
    // another octave is the same
    expect(gradeEnc(it, good.map((n) => ({ ...n, midi: n.midi + 12 })), bpm).score).toBe(100);
    // free (rubato): order only
    const fr = encItem(1, 1, 0);
    expect(gradeEnc(fr, [{ ms: 0, midi: 59 + fr.targets[0].pc }, { ms: 900, midi: 60 + fr.targets[0].pc }], 0).score).toBe(100);
  });
});

describe('Changes Crossword', () => {
  it('templates are theory-right: secondary dominants fall a 5th, tritone subs a half step', () => {
    for (const t of CW_TEMPLATES[3])
      t.forEach((c, i) => {
        const next = t[i + 1];
        if (c.q === '7' && next && c.deg !== '5') expect(pc(degSemis(c.deg) - degSemis(next.deg)), `${c.deg}7 → ${next.deg}`).toBe(7);
      });
    for (const t of CW_TEMPLATES[5])
      t.forEach((c, i) => {
        const next = t[i + 1];
        if (c.q === '7' && c.deg.startsWith('b') && next) expect(pc(degSemis(c.deg) - degSemis(next.deg)), `${c.deg}7 → ${next.deg}`).toBe(1);
      });
    // borrowed chords come from the parallel minor (♭VI, ♭VII, iv, iiø)
    for (const t of CW_TEMPLATES[4]) expect(t.some((c) => ['b6', 'b7'].includes(c.deg) || (c.deg === '4' && c.q.startsWith('m')) || (c.deg === '2' && c.q === 'm7b5'))).toBe(true);
  });
  it('puzzles: 4 bars (8 at ff), spelled for the key, bass asked mp–f, 12 keys', () => {
    const p1 = cwPuzzle(4, 1, 0);
    expect(p1.cells).toHaveLength(4);
    expect(p1.cells[0].deg).toBe('1');
    expect(p1.extras).toEqual([]);
    expect(cwPuzzle(4, 3, 0).extras.length).toBe(4);
    expect(cwPuzzle(4, 6, 0).cells).toHaveLength(8);
    expect(pcs(Array.from({ length: 12 }, (_, i) => cwPuzzle(9, 2, i).key))).toBe(12);
    const p = cwPuzzle(2, 5, 1);
    for (const c of p.cells) expect(p.spell[c.root]).toBe(c.sym.match(/^[A-G][♭♯]?/)![0]);
  });
  it('a check locks the right parts; the fix pass asks only the wrong bars; partial credit', () => {
    const p = cwPuzzle(7, 2, 0);
    const cells = p.cells.map((c) => ({ root: c.root, q: c.q, x: null }));
    expect(cwGrade(p, cells).score).toBe(1);
    const half = cells.map((c, i) => (i === 1 ? { ...c, q: c.q === 'm7' ? ('7' as const) : ('m7' as const) } : c));
    const g = cwGrade(p, half);
    expect(g.score).toBeLessThan(1);
    expect(fixBars(g)).toEqual([1]);
    const lk = locksOf(g);
    expect(lk.root[1]).toBe(true);
    expect(lk.q[1]).toBe(false);
    expect(cwCredit(g.score, 1)).toBeGreaterThan(g.score);
    expect(cwGrade(p, emptyCells(4)).score).toBe(0);
    // enharmonic roots are the same note (answers are pitch classes)
    expect(cwGrade(p, cells.map((c) => ({ ...c, root: c.root + 12 }))).score).toBe(1);
  });
  it('the run: 5 puzzles, right = 90 % credit', () => {
    let s = newCwSave(1, 2, 'p');
    for (const c of [1, 0.95, 0.5, 1, 0.8]) s = cwAdd(s, c);
    expect(isCwSave(s)).toBe(false);
    expect(s.credits).toHaveLength(CW_PUZZLES);
    expect(cwResult(s).detail).toMatchObject({ right: 3, wrong: 2, tier: 'p' });
  });
});

describe('Hold the Note', () => {
  it('which chord: exactly one choice has the note (pp triads, p sevenths)', () => {
    for (let i = 0; i < 24; i++)
      for (const lv of [1, 2]) {
        const q = holdItem(5, lv, i);
        if (q.kind !== 'which') throw new Error('kind');
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map((c) => c.id)).size).toBe(4);
        expect(CT_Q[q.right.q].ints.some((x) => pc(x) === pc(q.held - q.right.root))).toBe(true);
      }
  });
  it('degrees, spelled: a held F is the ♯11 of B7♯11 (E♯); mf asks tensions', () => {
    for (let i = 0; i < 24; i++) {
      const q = holdItem(3, 3, i);
      if (q.kind !== 'degree') throw new Error('kind');
      expect(q.choices.map((c) => c.id)).toContain(q.chord.degree);
      expect(holdsNote(q.chord.root, q.chord.q, q.held)).toBe(true);
    }
    const tens = Array.from({ length: 30 }, (_, i) => holdItem(3, 4, i)).filter((q) => q.kind === 'degree') as Extract<ReturnType<typeof holdItem>, { kind: 'degree' }>[];
    expect(tens.every((q) => ['9', '11', '13', '♭9', '♯9', '♯11', '♭13'].includes(q.chord.degree))).toBe(true);
    const sharp11 = tens.find((q) => q.chord.degree === '♯11' && heldName(q.held) === 'F');
    if (sharp11) expect(sharp11.chord.held).toBe('E♯');
  });
  it('the chain: three bars hold the note, one drops it (not even as a tension)', () => {
    for (let i = 0; i < 20; i++) {
      const q = holdItem(8, 5, i);
      if (q.kind !== 'chain') throw new Error('kind');
      expect(q.bars).toHaveLength(4);
      expect(q.bars[Number(q.answer)]).toBe(q.drop.sym);
    }
  });
  it('8 ways: at least 8 chips hold it, the others do not; played chords count once', () => {
    const q = holdItem(2, 6, 0);
    if (q.kind !== 'ways') throw new Error('kind');
    expect(q.chips).toHaveLength(16);
    expect(q.chips.filter((c) => c.holds).length).toBeGreaterThanOrEqual(HOLD_WAYS);
    for (const c of q.chips) {
      const [r, qq] = c.id.split('.');
      expect(holdsNote(Number(r), qq as never, q.held), c.label).toBe(c.holds);
    }
    let s = newHoldSave(2, 6, 'touch', 'ff');
    const yes = q.chips.filter((c) => c.holds);
    const r1 = holdPick(s, yes[0].id, true, 1000);
    expect(r1.result).toBe('new');
    expect(holdPick(r1.save, yes[0].id, true, 1000).result).toBe('repeat');
    s = r1.save;
    for (const c of yes.slice(1, HOLD_WAYS)) s = holdPick(s, c.id, true, 1000).save;
    expect(s.i).toBe(1);
    expect(s.found).toEqual([]);
    // a played Fmaj7 holds C (its 5th); a B triad does not
    expect(playedWay(0, identifyChord([53, 57, 60, 64]))?.holds).toBe(true);
    expect(playedWay(0, identifyChord([59, 63, 66]))?.holds).toBe(false);
  });
  it('the run: speed scores, a wrong answer costs a life', () => {
    let s = newHoldSave(1, 1, 'touch', 'pp');
    const a = holdAnswer(s, true, 1000);
    const b = holdAnswer(s, true, 14000);
    expect(a.gained).toBeGreaterThan(b.gained);
    s = holdAnswer(a.save, false, 1000).save;
    expect(s.lives).toBe(2);
    expect(isHoldSave(s)).toBe(true);
    expect(holdResult(s).detail).toMatchObject({ right: 1, wrong: 1, tier: 'pp' });
    expect(pcs(Array.from({ length: 12 }, (_, i) => holdItem(6, 1, i).held))).toBe(12);
  });
});
