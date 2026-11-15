// AUDIT-GAMES §4.2 new games (2026-11-15): Border Control, Which Brother?, Run Catcher, Comp Caller, Elevator — the
// engines (generation incl. theory, scoring, all 12 keys) and how each connects (tiers, XP, ratings, path, workout,
// key mastery, glyphs, badges, boards).
import { describe, expect, it } from 'vitest';
import { borderCase, stampBorder, keyStamp } from '../src/engine/borderControl';
import { chordPcs } from '../src/engine/keyMoves';
import { BROTHERS, brotherCase, brotherRoot, brotherVoicing, dimMoveReveal, dimMoveVoicings, dimNoteFor, dom7, familyDim, judgeBrother, tonicVoicing } from '../src/engine/whichBrother';
import { elevatorCase, floorShape, floorVoicing, judgeElevator, noteStep, onChord, SCALES, stepNote, type SixDimScale } from '../src/engine/elevator';
import { foldCents, gradeRun, newRc, rcAfterTake, rcNoteSec, rcOver, rcResult, runItem, shapesFor, RC_MAX_PCT, type RcFrame } from '../src/engine/runCatcher';
import { compHitsOf, compItem, compPcs, gradeComp, groupAttacks, guideTones, RHYTHMS, type CompItem } from '../src/engine/compCaller';
import { answerCaseRun, caseRunResult, isCaseRun, newCaseRun } from '../src/engine/caseRun';
import { DYN_NAMES, GAME_TIERS, MEASURED_ONLY, clearsRun, gameXp } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';
import { GAME_STEPS, gameForArea } from '../src/engine/path';
import { BONUS_GAMES, bonusSteps } from '../src/engine/pathBonus';
import { inCourse, type CourseId } from '../src/engine/courses';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { boardGames } from '../src/engine/gameBoard';
import { isKeyGame, keyTakesOf, gameKeyTitle, gameKeyFamily } from '../src/engine/gameKeys';
import { readFileSync } from 'node:fs';

const pc = (n: number) => ((n % 12) + 12) % 12;
const NEW = ['bordercontrol', 'whichbrother', 'runcatcher', 'compcaller', 'elevator'];

// ---------------------------------------------------------------- Border Control

describe('Border Control', () => {
  it('levels 1–5: the means come from the level pool; the move lands in the stamped key', () => {
    const pools = [['pivot', 'direct'], ['pivot', 'direct', 'iiv'], ['pivot', 'direct', 'iiv', 'dim'], ['pivot', 'direct', 'iiv', 'dim', 'tritone']];
    for (let lv = 1; lv <= 5; lv++)
      for (let s = 0; s < 60; s++) {
        const c = borderCase(s * 7 + 1, s % 8, lv);
        expect(c.first.kind).toBe('means');
        if (c.first.kind !== 'means') continue;
        expect(pools[Math.min(lv, 4) - 1]).toContain(c.first.answer);
        expect(c.first.options).toContain(c.first.answer);
        // four key options, the answer among them, never home major
        expect(c.second.options).toHaveLength(4);
        expect(c.second.options.map((k) => k.id)).toContain(c.second.answer.id);
        expect(new Set(c.second.options.map((k) => k.id)).size).toBe(4);
        expect(c.second.options.some((k) => k.id === `k${c.home}`)).toBe(false);
        // the phrase opens with the home ii–V and ends on the new tonic
        expect(c.chords[0].root).toBe(pc(c.home + 2));
        expect(c.chords[1].root).toBe(pc(c.home + 7));
        const last = c.chords[c.chords.length - 1];
        expect(last.root).toBe(c.second.answer.pc);
        // theory per means
        const move = c.chords.slice(2);
        const B = c.second.answer.pc;
        if (c.first.answer === 'dim') {
          // I6 → °7 → V7 of B, the V7 one note of the dim lowered a half step
          const dim = move.find((x) => x.q === 'dim7')!;
          const v = move.find((x) => x.q === '7')!;
          expect(v.root).toBe(pc(B + 7));
          const lowered = chordPcs(dim).filter((p) => !chordPcs(v).includes(p));
          expect(lowered).toHaveLength(1);
          expect(pc(lowered[0] - 1)).toBe(v.root);
        }
        if (c.first.answer === 'tritone') expect(move.some((x) => x.q === '7' && x.root === pc(B + 1))).toBe(true);
        if (c.first.answer === 'iiv') expect(move.some((x) => x.q === 'm7' && x.root === pc(B + 2))).toBe(true);
      }
  });
  it('level 6: three key centres, the 2nd and 3rd stamped', () => {
    for (let s = 0; s < 40; s++) {
      const c = borderCase(s, s, 6);
      expect(c.chords).toHaveLength(9);
      expect(c.first.kind).toBe('key');
      if (c.first.kind === 'key') expect(c.chords[5].root).toBe(c.first.answer.pc);
      expect(c.chords[8].root).toBe(c.second.answer.pc);
    }
  });
  it('all 12 home keys; two stamps scored; deterministic', () => {
    expect(new Set(Array.from({ length: 200 }, (_, i) => borderCase(99, i, 3).home)).size).toBe(12);
    expect(new Set(Array.from({ length: 200 }, (_, s) => borderCase(s, 0, 2).home)).size).toBe(12);
    const c = borderCase(5, 2, 3);
    expect(borderCase(5, 2, 3)).toEqual(c);
    const first = c.first.kind === 'means' ? c.first.answer : c.first.answer.id;
    expect(stampBorder(c, first, c.second.answer.id).got).toBe(2);
    expect(stampBorder(c, 'nope', c.second.answer.id).got).toBe(1);
    expect(stampBorder(c, first, keyStamp(c.second.answer.pc + 1).id).secondOk).toBe(false);
  });
});

// ---------------------------------------------------------------- Which Brother?

describe('Which Brother? (BARRY-HARRIS-THEORY §1–§2)', () => {
  it('in C the brothers are G7, B♭7, D♭7, E7 and share B°7 (D°) as their rootless 7♭9', () => {
    expect(BROTHERS.map((b) => brotherRoot(0, b))).toEqual([7, 10, 1, 4]);
    expect(familyDim(0).sort((a, b) => a - b)).toEqual([2, 5, 8, 11]);
    for (const t of Array.from({ length: 12 }, (_, i) => i))
      for (const b of BROTHERS) {
        const r = brotherRoot(t, b);
        // rootless 7♭9 = 3, 5, ♭7, ♭9
        const rootless = [4, 7, 10, 1].map((x) => pc(r + x)).sort((a, c) => a - c);
        expect(rootless).toEqual([...familyDim(t)].sort((a, c) => a - c));
        // the dim move: that dim note down a half step is the root
        expect(familyDim(t)).toContain(dimNoteFor(t, b));
        expect(pc(dimNoteFor(t, b) - 1)).toBe(r);
      }
  });
  it('the dim move voicing: one register, a fixed lowest voice, the drop inside, the born brother in inversion', () => {
    let rootLowest = 0;
    let n = 0;
    for (let t = 0; t < 12; t++)
      for (const b of BROTHERS)
        for (let low = 0; low < 3; low++) {
          const [d, born] = dimMoveVoicings(t, b, low);
          n++;
          expect(new Set(d.map(pc))).toEqual(new Set(familyDim(t)));
          // exactly one voice moves, down a half step, and it is never the lowest
          const moved = d.map((m, k) => born[k] - m);
          expect(moved.filter((x) => x !== 0)).toEqual([-1]);
          expect(Math.min(...born)).toBe(Math.min(...d));
          expect(born[0]).toBe(d[0]);
          expect(pc(d[moved.indexOf(-1)])).toBe(dimNoteFor(t, b));
          // one register: the lowest voice C3–B3, the chord inside an octave
          expect(d[0]).toBeGreaterThanOrEqual(48);
          expect(d[0]).toBeLessThan(60);
          expect(d[3] - d[0]).toBe(9);
          // the born chord is the brother (its four tones), but the root is not the lowest note
          const root = brotherRoot(t, b);
          if (pc(Math.min(...born)) === root) rootLowest++;
          expect(new Set(born.map(pc))).toEqual(new Set(dom7(root)));
        }
    expect(rootLowest / n).toBeLessThan(0.25);
  });
  it('level 3 cases: all four brothers, all 12 keys, the lowest voice rotates', () => {
    const cs = Array.from({ length: 300 }, (_, i) => brotherCase(13, i, 3));
    expect(new Set(cs.map((c) => c.answer)).size).toBe(4);
    expect(new Set(cs.map((c) => c.tonic)).size).toBe(12);
    expect(new Set(cs.map((c) => c.low)).size).toBe(3);
    for (const c of cs.slice(0, 40)) {
      const r = dimMoveReveal(c.tonic, c.answer, c.low);
      expect(pc(r[0])).toBe(brotherRoot(c.tonic, c.answer));
      expect(judgeBrother(c.tonic, c.answer, r).ok).toBe(true);
    }
  });
  it('voicings: the brother passes its own judge, fails the others; the tonic is a 6 chord', () => {
    for (let t = 0; t < 12; t++)
      for (const b of BROTHERS) {
        const v = brotherVoicing(t, b);
        expect(judgeBrother(t, b, v).ok).toBe(true);
        for (const o of BROTHERS) if (o !== b) expect(judgeBrother(t, o, v).ok).toBe(false);
        expect(new Set(v.map(pc))).toEqual(new Set(dom7(brotherRoot(t, b))));
      }
    expect(tonicVoicing(0).map(pc).slice(1).sort()).toEqual([0, 4, 7, 9].sort());
  });
  it('judge: root in the bass, 3 and ♭7 needed, tensions allowed, foreign notes not', () => {
    // D♭7 into C
    expect(judgeBrother(0, 6, [37, 53, 59]).ok).toBe(true); // D♭ F C♭(B)
    expect(judgeBrother(0, 6, [41, 49, 59]).why).toBe('bass');
    expect(judgeBrother(0, 6, [37, 53, 56]).why).toBe('missing');
    expect(judgeBrother(0, 6, [37, 53, 59, 62]).ok).toBe(true); // + ♭9 (D)
    expect(judgeBrother(0, 6, [37, 53, 59, 60]).why).toBe('extra'); // + C (maj7)
  });
  it('levels: ear choices, the half-step brother is the tritone sub, 12 keys', () => {
    for (let s = 0; s < 50; s++) {
      expect(brotherCase(s, 0, 1).options).toEqual([0, 6]);
      expect(brotherCase(s, 0, 2).options).toHaveLength(4);
      expect(brotherCase(s, 0, 4).answer).toBe(6);
      expect([3, 6, 9]).toContain(brotherCase(s, 0, 5).answer);
    }
    expect(new Set(Array.from({ length: 120 }, (_, i) => brotherCase(7, i, 2).tonic)).size).toBe(12);
    // D♭7 lands a half step into C: its root is a half step above the tonic
    expect(pc(brotherRoot(0, 6) - 0)).toBe(1);
  });
});

// ---------------------------------------------------------------- Elevator

describe('Elevator (Echols F1.2, C6-dim from C)', () => {
  it('matches the method doc table', () => {
    const v = (n: number) => floorVoicing(60, 'major', 0, n);
    expect(v(1)).toEqual([60]);
    expect(v(2)).toEqual([59, 62]); // B3 D4
    expect(v(3)).toEqual([57, 60, 64]); // A3 C4 E4
    expect(v(4)).toEqual([56, 65]); // G♯3 (B3) F4
    expect(v(5)).toEqual([55, 67]); // G3 (C4 E4) G4
    expect(v(6)).toEqual([53, 59, 62, 68]); // F3 B3 D4 G♯4 (drop 2)
    expect(v(7)).toEqual([52, 60, 67, 69]); // E3 C4 G4 A4 (drop 3)
    expect(v(8)).toEqual([50, 56, 65, 71]); // D3 G♯3 F4 B4 (drop 2&4)
    expect(v(9)).toEqual([48, 72]); // C3 (…) C5
  });
  it('outer voices are both on or both off, and only 3rds, 5ths, 6ths, octaves… between them', () => {
    for (const sc of ['major', 'minor'] as SixDimScale[])
      for (let s0 = 0; s0 < 8; s0++)
        for (let n = 2; n <= 9; n++) {
          const f = floorShape(60, sc, s0, n);
          const kb = noteStep(60, sc, f.bottom)!;
          const kt = noteStep(60, sc, f.top)!;
          expect(onChord(kb)).toBe(onChord(kt));
          expect(kt - kb).toBe(2 * (n - 1)); // an even scale-step distance: never a 2nd, 4th, 7th or 9th of the scale
          // the doc's interval rule (from the tonic, as in its table): no 2nds, 4ths or 7ths inside the octave
          if (s0 === 0 && f.top - f.bottom < 12) expect([1, 2, 5, 10, 11]).not.toContain(f.top - f.bottom);
          // the inner voices are in the same chord
          for (const m of f.inner) expect(onChord(noteStep(60, sc, m)!)).toBe(f.on);
          // drop voicings are four different pitch classes
          if (n >= 6 && n <= 8) expect(new Set(floorVoicing(60, sc, s0, n).map(pc)).size).toBe(4);
        }
  });
  it('the four 6-dim scales are BARRY-HARRIS-THEORY §5', () => {
    expect(SCALES.major).toEqual([0, 2, 4, 5, 7, 8, 9, 11]);
    expect(SCALES.minor).toEqual([0, 2, 3, 5, 7, 8, 9, 11]);
    expect(SCALES.dom).toEqual([0, 2, 4, 5, 7, 8, 10, 11]);
    expect(SCALES.domb5).toEqual([0, 2, 4, 5, 6, 8, 10, 11]);
    // the off tones of each scale form one dim 7 (minor thirds apart)
    for (const sc of Object.keys(SCALES) as SixDimScale[]) {
      const off = [1, 3, 5, 7].map((k) => stepNote(0, sc, k));
      for (let k = 1; k < 4; k++) expect(off[k] - off[k - 1]).toBe(3);
    }
  });
  it('judge: the answer passes; free middles take chord tones; wrong outer or chord fails', () => {
    for (let s = 0; s < 120; s++)
      for (let lv = 1; lv <= 6; lv++) {
        const c = elevatorCase(s, s % 10, lv);
        expect(judgeElevator(c, c.answer).ok, `${lv} ${s}`).toBe(true);
        expect(judgeElevator(c, c.answer.map((m) => m + 1)).ok).toBe(false);
      }
    // floor 5 from C: G3 G4 with C4 E4 inside is fine; with D4 (off) it is not
    const c5 = { level: 1, t: 60, scale: 'major' as const, kind: 'floor' as const, floor: 5, s0: 0, shown: [60], answer: [55, 67] };
    expect(judgeElevator(c5, [55, 60, 64, 67]).ok).toBe(true);
    expect(judgeElevator(c5, [55, 62, 67]).why).toBe('inner');
    expect(judgeElevator(c5, [55, 65]).why).toBe('outer');
  });
  it('borrowing (E22): the top voices step up into the other chord, the rest hold', () => {
    for (let s = 0; s < 80; s++) {
      const c = elevatorCase(s, s, 5);
      expect(c.kind).toBe('borrow');
      const n = c.borrow!;
      const held = c.shown.slice(0, c.shown.length - n);
      expect(c.answer.slice(0, held.length)).toEqual(held);
      for (const m of c.answer.slice(held.length)) expect(onChord(noteStep(c.t, c.scale, m)!)).toBe(false);
    }
  });
  it('all 12 keys; every floor from the tonic, so the outer voices keep the interval rule (owner 2026-11-15)', () => {
    expect(new Set(Array.from({ length: 120 }, (_, i) => pc(elevatorCase(3, i, 4).t))).size).toBe(12);
    // 3rds, 5ths, 6ths, 8ths, 10ths, 11ths, 13ths, double octaves by letter name (in semitones: diminished 5ths and
    // augmented 11ths appear on the dim floors)
    const OK = new Set([3, 4, 6, 7, 8, 9, 12, 15, 16, 17, 18, 20, 21, 24]);
    for (let s = 0; s < 120; s++)
      for (let lv = 1; lv <= 6; lv++) {
        const c = elevatorCase(s, s % 10, lv);
        expect(c.s0, `${lv} ${s}`).toBe(0);
        expect(c.kind).not.toBe('melody');
        if (c.kind === 'borrow') continue;
        const span = c.answer[c.answer.length - 1] - c.answer[0];
        expect(OK.has(span), `${lv} ${s} ${c.scale} floor ${c.floor}: ${span}`).toBe(true);
      }
  });
});

// ---------------------------------------------------------------- Run Catcher

describe('Run Catcher', () => {
  const sing = (notes: number[], noteMs: number, off = 0, bend = 0): RcFrame[] => {
    const out: RcFrame[] = [];
    for (let t = -300; t < notes.length * noteMs + 400; t += 20) {
      const k = Math.floor((t - off) / noteMs);
      out.push({ ms: t, midi: k >= 0 && k < notes.length ? notes[k] + bend : null });
    }
    return out;
  };
  it('a run in time and in tune is 100 %; late by 150 ms too; an octave down counts', () => {
    const it = runItem(1, 0, 3, 55, 67);
    const ms = rcNoteSec(80) * 1000;
    expect(gradeRun(it.notes, sing(it.notes, ms), ms).pct).toBe(100);
    expect(gradeRun(it.notes, sing(it.notes, ms, 150), ms).pct).toBe(100);
    expect(gradeRun(it.notes, sing(it.notes.map((m) => m - 12), ms), ms).pct).toBe(100);
    expect(gradeRun(it.notes, sing(it.notes, ms, 0, 0.9), ms).pct).toBe(0); // 90 cents sharp
    expect(gradeRun(it.notes, [], ms).marks.every((m) => m === 'miss')).toBe(true);
    expect(foldCents(72.3, 60)).toBe(30);
  });
  it('runs sit in the singer\'s range and use all 12 keys; the bebop lines put chord tones on the beats', () => {
    for (let s = 0; s < 100; s++) {
      const it = runItem(s, s % 8, 2, 55, 67);
      expect(Math.min(...it.notes)).toBeGreaterThanOrEqual(52);
      expect(Math.max(...it.notes)).toBeLessThanOrEqual(70);
    }
    expect(new Set(Array.from({ length: 120 }, (_, i) => pc(runItem(4, i, 1).tonic))).size).toBe(12);
    const [six, bop] = shapesFor(5);
    // sixteenths: beats on notes 0, 4, 8 — 6th-dim: C, G, C (C6); bebop dominant: C, G, C (C7); every other 8th a chord tone
    expect([0, 2, 4, 6].map((k) => pc(six.steps[k]))).toEqual([0, 9, 7, 4]);
    expect([0, 2, 4, 6].map((k) => pc(bop.steps[k]))).toEqual([0, 10, 7, 4]);
  });
  it('the ladder: clean +10 % (to 130), under half costs a life, 8 takes', () => {
    let s = newRc(1, 'mp', 3);
    expect(s.pct).toBe(80);
    s = rcAfterTake(s, 80, 8, 10);
    expect(s.pct).toBe(90);
    expect(s.topPct).toBe(80);
    s = rcAfterTake(s, 60, 6, 10);
    expect(s.pct).toBe(90);
    expect(s.lives).toBe(3);
    s = rcAfterTake(s, 30, 3, 10);
    expect(s.lives).toBe(2);
    for (let k = 0; k < 10; k++) s = rcAfterTake({ ...s, lives: 3, takes: [] }, 100, 10, 10);
    expect(s.pct).toBe(RC_MAX_PCT);
    const r = rcResult(rcAfterTake(newRc(2, 'f', 5), 90, 9, 10));
    expect(r.detail).toMatchObject({ tier: 'f', accuracy: 90, topPct: 90 });
    expect(rcOver({ ...newRc(1, 'pp', 1), takes: [1, 1, 1, 1, 1, 1, 1, 1] })).toBe(true);
  });
});

// ---------------------------------------------------------------- Comp Caller

describe('Comp Caller', () => {
  it('rhythm positions are the comping vocabulary (soloPiano / topicsSoloPiano)', () => {
    expect(RHYTHMS.charleston[0].map((h) => h.at)).toEqual([0, 1.5]);
    expect(RHYTHMS.reverse[0].map((h) => h.at)).toEqual([0.5, 2]);
    expect(RHYTHMS.beat3[0].map((h) => h.at)).toEqual([2, 3.5]);
    expect(RHYTHMS.basie[0].map((h) => h.at)).toEqual([1, 3]);
    expect(RHYTHMS.garland[0]).toEqual([{ at: 1.5 }, { at: 3.5, next: true }]);
  });
  const play = (it: CompItem, opt: { late?: number; wrong?: boolean; extra?: boolean } = {}) =>
    compHitsOf(it).map((h) => ({ beat: h.beat + (opt.late ?? 0), pcs: opt.wrong ? [pc(h.chord.root + 1)] : compPcs(h.chord) }));
  it('grades: in time with the guide tones = 100; wrong chord, misses and extras cost', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let s = 0; s < 20; s++) {
        const it = compItem(s, s % 4, lv);
        expect(gradeComp(it, play(it)).score, `${lv}`).toBe(100);
        expect(gradeComp(it, play(it, { late: 0.1 })).score).toBe(100);
        expect(gradeComp(it, play(it, { late: 0.24 })).marks.every((m) => m === 'miss')).toBe(true);
        expect(gradeComp(it, play(it, { wrong: true })).marks.every((m) => m === 'chord')).toBe(true);
        // mic: no pitch → rhythm only
        expect(gradeComp(it, compHitsOf(it).map((h) => ({ beat: h.beat }))).score).toBe(100);
        const extra = [...play(it), { beat: 0.75, pcs: [0] }, { beat: 2.75, pcs: [0] }];
        expect(gradeComp(it, extra).score).toBeLessThan(100);
      }
  });
  it('a "next" hit sounds the next bar\'s chord', () => {
    for (let s = 0; s < 60; s++) {
      const it = compItem(s, 0, 4);
      it.calls.forEach((c, bar) => {
        if (c.id !== 'garland' || bar === it.chords.length - 1) return;
        const h = compHitsOf(it).find((x) => x.bar === bar && x.beat === bar * 4 + 3.5)!;
        expect(h.chord).toBe(it.chords[bar + 1]);
      });
    }
  });
  it('levels 1–2 switch rhythm every bar; charts in all 12 keys; MIDI grouping', () => {
    for (let s = 0; s < 40; s++) {
      const it = compItem(s, 0, 1);
      for (let k = 1; k < it.calls.length; k++) expect(it.calls[k].id).not.toBe(it.calls[k - 1].id);
      expect(compItem(s, 0, 5).chords).toHaveLength(8);
    }
    expect(new Set(Array.from({ length: 120 }, (_, i) => compItem(11, i, 3).key)).size).toBe(12);
    const at = groupAttacks([{ ms: 0, midi: 60 }, { ms: 30, midi: 64 }, { ms: 500, midi: 62 }], 120);
    expect(at).toHaveLength(2);
    expect(at[1].beat).toBeCloseTo(1, 5);
    expect(guideTones({ root: 2, q: 'm7' })).toEqual([5, 0]);
  });
});

// ---------------------------------------------------------------- the case run

describe('case runs (save / resume, scoring)', () => {
  it('lives, right / wrong, parts; over at the end or out of lives; resumable until then', () => {
    let r = newCaseRun('elevator', 5, 'mf', 4, 10);
    expect(isCaseRun(r, 'elevator')).toBe(true);
    expect(isCaseRun(r, 'bordercontrol')).toBe(false);
    r = answerCaseRun(r, 1, 1, 1000).save;
    r = answerCaseRun(r, 0, 1, 1000).save;
    expect(r).toMatchObject({ i: 2, right: 1, wrong: 1, lives: 2 });
    r = answerCaseRun(answerCaseRun(r, 0, 1, 0).save, 0, 1, 0).save;
    expect(r.over).toBe(true);
    expect(isCaseRun(r, 'elevator')).toBe(false);
    const half = answerCaseRun(newCaseRun('bordercontrol', 1, 'pp', 1, 8), 1, 2, 0);
    expect(half.ok).toBe(false);
    expect(half.save.parts).toEqual({ right: 1, total: 2 });
    expect(caseRunResult(half.save).detail).toMatchObject({ tier: 'pp', accuracy: 50 });
  });
});

// ---------------------------------------------------------------- connections

describe('the new games connect like every game', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[] };
  it('six tiers, a card, a glyph of their own, a rating, a course, a board', () => {
    const arcade = readFileSync('src/ui/Arcade.tsx', 'utf8');
    for (const g of NEW) {
      const spec = GAME_TIERS[g];
      expect(spec, g).toBeTruthy();
      for (const t of DYN_NAMES) {
        expect(spec.tiers[t].label.en.length).toBeGreaterThan(2);
        expect(spec.tiers[t].label.he).toMatch(/[א-ת]/);
      }
      expect(arcade.includes(`{ id: '${g}',`), g).toBe(true);
      expect(GLYPHS[GAME_STEP_GLYPH[g]], g).toBeTruthy();
      expect(Object.values(COURSE_GAMES).some((l) => l.includes(g)), g).toBe(true);
      expect(gameEvents(g, 80, { accuracy: 80, tier: 'mf', right: 6, wrong: 2, level: 4 }, '2026-11-15', 's').length, g).toBeGreaterThan(0);
      expect(boardGames([g])).toEqual([g]);
      expect(GAME_BADGE_GAMES.some((b) => b.game === g), g).toBe(true);
    }
    const syms = NEW.map((g) => GAME_STEP_GLYPH[g]);
    expect(new Set(syms).size).toBe(syms.length);
    const others = Object.entries(GAME_STEP_GLYPH).filter(([k]) => !NEW.includes(k)).map(([, v]) => v);
    for (const s of syms) expect(others).not.toContain(s);
  });
  it('the courses list them', () => {
    expect(COURSE_GAMES.ear).toContain('bordercontrol');
    expect(COURSE_GAMES.jazz).toEqual(expect.arrayContaining(['bordercontrol', 'whichbrother', 'compcaller']));
    expect(COURSE_GAMES.voice).toContain('runcatcher');
    expect(COURSE_GAMES.keys).toEqual(expect.arrayContaining(['whichbrother', 'compcaller', 'elevator']));
    expect(COURSE_GAMES.guitar).toEqual(expect.arrayContaining(['compcaller', 'elevator']));
  });
  it('path: unit games in their courses from a difficulty floor; jazz bonus steps', () => {
    const cases: [string, CourseId, string[]][] = [
      ['bordercontrol', 'ear', []],
      ['runcatcher', 'voice', []],
      ['whichbrother', 'keys', ['keys']],
      ['compcaller', 'keys', ['keys']],
      ['compcaller', 'guitar', ['guitar']],
      ['elevator', 'keys', ['keys']],
      ['elevator', 'guitar', ['guitar']],
    ];
    for (const [g, course, plays] of cases) {
      const area = GAME_STEPS[g].domain;
      const seen = new Set<string>();
      for (let n = 0; n < 60; n++) {
        const x = gameForArea(area, n, { ...base, plays, course }, 1400);
        if (x) seen.add(x);
      }
      expect([...seen], `${g} in ${course}`).toContain(g);
      for (let n = 0; n < 60; n++) expect(gameForArea(area, n, { ...base, plays, course }, 900)).not.toBe(g);
    }
    for (const g of ['bordercontrol', 'whichbrother', 'compcaller']) {
      expect(BONUS_GAMES.some((b) => b.game === g && b.course === 'jazz')).toBe(true);
      const st = bonusSteps().find((s) => s.id === `bonus:jazz:${g}`)!;
      expect(inCourse(st, 'jazz')).toBe(true);
      expect(GAME_TIERS[g].tiers.mp).toBeDefined();
    }
  });
  it('workout rotation, key mastery, measured-only input', () => {
    expect(WORKOUT_GAMES.voice).toContain('runcatcher');
    expect(WORKOUT_GAMES.jazz).toEqual(expect.arrayContaining(['whichbrother', 'bordercontrol', 'compcaller']));
    expect(WORKOUT_GAMES.keys).toEqual(expect.arrayContaining(['elevator', 'compcaller']));
    for (const g of ['whichbrother', 'compcaller', 'elevator']) {
      expect(isKeyGame(g)).toBe(true);
      expect(gameKeyTitle(gameKeyFamily(g, 'piano'))?.en.length).toBeGreaterThan(3);
    }
    expect(keyTakesOf({ keyInst: 'piano', keyTakes: [{ key: 3, acc: 100 }] })?.takes).toHaveLength(1);
    expect(MEASURED_ONLY.has('whichbrother') && MEASURED_ONLY.has('compcaller')).toBe(true);
    expect(clearsRun('whichbrother', 'mf', 100, { right: 9, wrong: 1, input: 'touch' })).toBe(false);
    expect(clearsRun('whichbrother', 'mf', 100, { right: 9, wrong: 1, input: 'midi' })).toBe(true);
    expect(clearsRun('whichbrother', 'pp', 100, { right: 8, wrong: 2, input: 'choice' })).toBe(true);
    expect(clearsRun('whichbrother', 'pp', 100, { right: 7, wrong: 3, input: 'choice' })).toBe(false);
    expect(clearsRun('bordercontrol', 'mp', 100, { right: 13, wrong: 3 })).toBe(true);
    expect(clearsRun('bordercontrol', 'mp', 100, { right: 12, wrong: 4 })).toBe(false);
    expect(clearsRun('runcatcher', 'f', 100, { accuracy: 80 })).toBe(true);
    expect(clearsRun('compcaller', 'p', 100, { accuracy: 90, input: 'touch' })).toBe(false);
    expect(clearsRun('compcaller', 'p', 100, { accuracy: 90, input: 'midi' })).toBe(true);
    expect(clearsRun('elevator', 'ff', 100, { right: 8, wrong: 2, input: 'touch' })).toBe(true);
    expect(gameXp('elevator', 'ff', 0, { right: 40, wrong: 0 })).toBe(25);
  });
});
