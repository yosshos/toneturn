// 0.38 games: Rhythm Highway, Melody Puzzle, Ear Bingo — pure engines.
import { describe, expect, it } from 'vitest';
import {
  backingTrack,
  hitWindows,
  highwaySong,
  judgeInput,
  multiplier,
  newRun,
  OnsetTracker,
  rewind,
  sectionStartMs,
  sectionsDone,
  summary,
  sweepMisses,
  type HighwayRun,
} from '../src/engine/highway';
import { readTolerance, type RhythmLevel } from '../src/engine/rhythm';
import { checkPuzzle, puzzleAt, puzzleEvents, puzzlePoints, PUZZLE_LEVELS, tileLabel, type PuzzleLevel } from '../src/engine/melodyPuzzle';
import {
  BINGO_SETS,
  bingoCalls,
  bingoCallEvents,
  bingoCard,
  bingoPool,
  cardCanWin,
  CELLS,
  completedLines,
  decodeClaim,
  encodeClaim,
  LINES,
  validateClaim,
  winsAt,
} from '../src/engine/bingo';

describe('Rhythm Highway', () => {
  const song = highwaySong({ mode: 'tap', level: 2, song: 1, bpm: 90 });

  it('songs are deterministic, sorted, and split into sections', () => {
    expect(highwaySong({ mode: 'tap', level: 2, song: 1, bpm: 90 })).toEqual(song);
    expect(song.notes.length).toBeGreaterThan(4);
    for (let i = 1; i < song.notes.length; i++) expect(song.notes[i].ms).toBeGreaterThan(song.notes[i - 1].ms);
    expect(song.sections).toBe(4);
    expect(song.notes.every((n) => n.section >= 0 && n.section < song.sections)).toBe(true);
    expect(sectionStartMs(song, 1)).toBe(Math.round(2 * 4 * (60000 / 90)));
  });

  it('windows come from the reading tolerance', () => {
    for (const lvl of [1, 4, 6, 8] as RhythmLevel[]) {
      const w = hitWindows(lvl, 100);
      expect(w.good).toBe(readTolerance(lvl, 100));
      expect(w.perfect).toBeLessThan(w.good);
    }
    expect(hitWindows(2, 90, 'pitch').good).toBeGreaterThan(hitWindows(2, 90).good);
  });

  it('subtracts the tap latency before grading (R8)', () => {
    const n = song.notes[1];
    const w = hitWindows(2, 90);
    // A tap 80 ms late on a device that taps 80 ms late is perfect.
    const a = judgeInput(song, newRun(song), n.ms + 80, 80);
    expect(a.grade).toBe('perfect');
    expect(a.note).toBe(1);
    expect(a.offset).toBe(0);
    // Without the correction the same tap is only good (or worse).
    const b = judgeInput(song, newRun(song), n.ms + w.perfect + 5, 0);
    expect(b.grade).toBe('good');
    // Far outside the window: a stray tap, combo broken.
    const c = judgeInput(song, { ...newRun(song), combo: 5 }, n.ms + w.good + 40, 0);
    if (!song.notes.some((x) => Math.abs(x.ms - (n.ms + w.good + 40)) <= w.good)) {
      expect(c.grade).toBe(null);
      expect(c.run.extra).toBe(1);
      expect(c.run.combo).toBe(0);
    }
  });

  it('combo, multiplier, misses and accuracy', () => {
    let run: HighwayRun = newRun(song);
    for (const n of song.notes) run = judgeInput(song, run, n.ms, 0).run;
    expect(run.combo).toBe(song.notes.length);
    expect(run.maxCombo).toBe(song.notes.length);
    const s = summary(song, run);
    expect(s.accuracy).toBe(100);
    expect(s.fullCombo).toBe(true);
    expect(multiplier(0)).toBe(1);
    expect(multiplier(8)).toBe(2);
    expect(multiplier(100)).toBe(4);
    // Miss everything after the first note.
    let r2 = judgeInput(song, newRun(song), song.notes[0].ms, 0).run;
    r2 = sweepMisses(song, r2, song.lengthMs + 1000, 0).run;
    const s2 = summary(song, r2);
    expect(s2.miss).toBe(song.notes.length - 1);
    expect(s2.fullCombo).toBe(false);
    expect(r2.combo).toBe(0);
    expect(s2.accuracy).toBe(Math.round(100 / song.notes.length));
  });

  it('a note is judged only once; equal input twice = one hit + one stray', () => {
    const n = song.notes[0];
    const a = judgeInput(song, newRun(song), n.ms, 0);
    const b = judgeInput(song, a.run, n.ms, 0);
    const near = song.notes.filter((x) => Math.abs(x.ms - n.ms) <= hitWindows(2, 90).good);
    if (near.length === 1) expect(b.grade).toBe(null);
  });

  it('checkpoint rewind keeps earlier sections and recounts', () => {
    let run = newRun(song);
    for (const n of song.notes) run = judgeInput(song, run, n.ms, 0).run;
    const r = rewind(song, run, 2);
    const before = song.notes.filter((n) => n.section < 2).length;
    expect(r.grades.filter((g) => g !== null).length).toBe(before);
    expect(r.combo).toBe(before);
    expect(sectionsDone(song, r, 2)).toBe(true);
    expect(sectionsDone(song, r, 3)).toBe(song.notes.every((n) => n.section !== 2));
  });

  it('pitch lanes grade the pitch class (octave ignored); wrong pitch leaves the note open', () => {
    const p = highwaySong({ mode: 'pitch', level: 1, song: 2, bpm: 80, lanes: 4 });
    expect(p.laneMidis.length).toBe(4);
    expect(p.notes.every((n) => n.midi !== null && p.laneMidis.includes(n.midi) && n.lane >= 0 && n.lane < 4)).toBe(true);
    const n = p.notes[0];
    const right = judgeInput(p, newRun(p), n.ms, 0, n.midi! + 12.2);
    expect(right.grade).toBe('perfect');
    const wrong = judgeInput(p, newRun(p), n.ms, 0, n.midi! + 1);
    expect(wrong.grade).toBe(null);
    expect(wrong.wrongPitch).toBe(true);
    expect(wrong.run.grades[0]).toBe(null);
  });

  it('backing loop covers the song after a one-bar count-in', () => {
    const b = backingTrack(song, 0);
    expect(b.clicks.length).toBe(4);
    expect(b.kit.length).toBe(song.bars * 4);
    expect(b.extras.some((e) => e.perc === 'hat')).toBe(true);
    expect(b.extras.some((e) => !e.perc)).toBe(true);
    expect(backingTrack(song, 0, { bass: false }).extras.every((e) => e.perc === 'hat')).toBe(true);
    const from2 = backingTrack(song, 2);
    expect(from2.kit.length).toBe((song.bars - 4) * 4);
  });

  it('onset tracker: new notes, pitch changes and re-attacks', () => {
    const tr = new OnsetTracker();
    const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
    const on: { ms: number; midi: number }[] = [];
    const feed = (ms: number, m: number | null, rms = 0.1) => {
      const r = tr.feed({ ms, hz: m === null ? null : hz(m), confidence: m === null ? 0 : 0.95, rms });
      if (r) on.push(r);
    };
    feed(0, null);
    feed(20, 60);
    feed(40, 60);
    feed(60, 60);
    feed(80, 62);
    feed(100, 62);
    feed(120, 30); // kick drum: ignored
    feed(140, null);
    feed(160, 64, 0.1);
    feed(180, 64, 0.1);
    for (let t = 200; t <= 400; t += 20) feed(t, 64, 0.05);
    feed(420, 64, 0.3);
    expect(on.map((o) => o.midi)).toEqual([60, 62, 64, 64]);
    expect(on[0].ms).toBe(20);
  });
});

describe('Melody Puzzle', () => {
  const levels = Object.keys(PUZZLE_LEVELS).map(Number) as PuzzleLevel[];

  it('is deterministic per level and seed', () => {
    for (const l of levels) for (const s of [1, 77, 4242]) expect(puzzleAt(l, s)).toEqual(puzzleAt(l, s));
  });

  it('follows the level: length, decoys, minor, chromatic', () => {
    for (const l of levels)
      for (let s = 0; s < 40; s++) {
        const p = puzzleAt(l, s);
        const def = PUZZLE_LEVELS[l];
        expect(p.answer.length).toBe(def.notes);
        expect(p.decoys.length).toBe(def.decoys);
        expect(p.tiles.length).toBe(def.notes + def.decoys);
        if (def.minor === true) expect(p.minor).toBe(true);
        if (def.minor === false) expect(p.minor).toBe(false);
        expect(p.answer.every((x) => x >= 0 && x <= 12)).toBe(true);
        if (l === 1 || l === 2) {
          // Stepwise: neighbours on the scale ladder.
          for (let i = 1; i < p.answer.length; i++) expect(Math.abs(p.answer[i] - p.answer[i - 1])).toBeLessThanOrEqual(2);
        }
      }
    const chrom = Array.from({ length: 30 }, (_, s) => puzzleAt(8, s)).filter((p) => p.answer.some((x) => [1, 3, 6, 8, 10].includes(x)));
    expect(chrom.length).toBeGreaterThan(20);
  });

  it('decoys never equal a note of the answer', () => {
    for (const l of levels)
      for (let s = 0; s < 60; s++) {
        const p = puzzleAt(l, s);
        for (const d of p.decoys) expect(p.answer).not.toContain(d);
        for (const t of p.tiles.filter((x) => x.decoy)) expect(p.answer).not.toContain(t.semis);
        expect(p.tiles.filter((x) => !x.decoy).map((t) => t.semis).sort()).toEqual(p.answer.slice().sort());
      }
  });

  it('checks by pitch (equal tiles interchangeable) and labels tiles', () => {
    const p = puzzleAt(3, 9);
    const right = p.answer.map((s) => p.tiles.find((t) => !t.decoy && t.semis === s)!.id);
    expect(checkPuzzle(p, right).solved).toBe(true);
    const wrong = right.slice();
    wrong[0] = p.tiles.find((t) => t.decoy)!.id;
    const r = checkPuzzle(p, wrong);
    expect(r.solved).toBe(false);
    expect(r.correct[0]).toBe(false);
    expect(checkPuzzle(p, p.answer.map(() => null)).solved).toBe(false);
    const t = p.tiles[0];
    expect(tileLabel(t, 'degrees', 'en')).toBe(t.degree);
    expect(tileLabel({ ...t, pc: { letter: 'B', acc: -1 }, semis: 5 }, 'letter', 'en')).toBe('B♭');
  });

  it('scores: replays and extra checks cost points; cadence before the melody', () => {
    expect(puzzlePoints({ notes: 4, replays: 0, checks: 1, ms: 10_000 })).toBe(120);
    expect(puzzlePoints({ notes: 4, replays: 2, checks: 1, ms: 60_000 })).toBe(80);
    expect(puzzlePoints({ notes: 4, replays: 0, checks: 3, ms: 60_000 })).toBe(60);
    expect(puzzlePoints({ notes: 4, replays: 20, checks: 9, ms: 60_000 })).toBe(10);
    const p = puzzleAt(6, 3);
    const ev = puzzleEvents(p);
    const melody = ev.events.slice(-p.answer.length).map((e) => e.midi - p.tonicMidi);
    expect(melody).toEqual(p.answer);
    expect(ev.events.length).toBeGreaterThan(p.answer.length + 8);
  });
});

describe('Ear Bingo', () => {
  it('cards: 16 distinct items from the pool, deterministic per (seed, player)', () => {
    for (const set of BINGO_SETS) {
      expect(bingoPool(set).length).toBeGreaterThanOrEqual(CELLS + 2);
      const a = bingoCard(set, 99, 'ann');
      expect(a).toEqual(bingoCard(set, 99, 'ann'));
      expect(a.cells.length).toBe(CELLS);
      expect(new Set(a.cells).size).toBe(CELLS);
      const ids = new Set(bingoPool(set).map((x) => x.id));
      expect(a.cells.every((c) => ids.has(c))).toBe(true);
      expect(bingoCard(set, 99, 'bob').cells).not.toEqual(a.cells);
    }
  });

  it('calls: every pool item once; every card can win (fairness)', () => {
    for (const set of BINGO_SETS)
      for (let seed = 0; seed < 10; seed++) {
        const calls = bingoCalls(set, seed);
        expect(new Set(calls).size).toBe(bingoPool(set).length);
        for (const p of ['a', 'b', 'c', 'd', 'e', 'f']) {
          const card = bingoCard(set, seed, p);
          expect(cardCanWin(card, calls)).toBe(true);
          expect(winsAt(card, calls)).toBeGreaterThanOrEqual(3);
        }
      }
  });

  it('line detection: 10 lines', () => {
    expect(LINES.length).toBe(10);
    expect(completedLines([0, 1, 2, 3])).toEqual([[0, 1, 2, 3]]);
    expect(completedLines([0, 4, 8, 12])).toEqual([[0, 4, 8, 12]]);
    expect(completedLines([0, 5, 10, 15])).toEqual([[0, 5, 10, 15]]);
    expect(completedLines([3, 6, 9, 12])).toEqual([[3, 6, 9, 12]]);
    expect(completedLines([0, 1, 2, 4, 5])).toEqual([]);
  });

  it('a claim is validated against the calls so far', () => {
    const card = bingoCard('chords', 5, 'u1');
    const row = [4, 5, 6, 7];
    const called = row.map((i) => card.cells[i]);
    expect(validateClaim(card, row, called).valid).toBe(true);
    expect(validateClaim(card, row, called.slice(0, 3)).valid).toBe(false);
    const r = validateClaim(card, [...row, 0], called);
    expect(r.valid).toBe(true);
    expect(r.falseMarks).toEqual(card.cells[0] && !called.includes(card.cells[0]) ? [0] : []);
    expect(decodeClaim(encodeClaim([7, 4, 5, 6, 6]))).toEqual([4, 5, 6, 7]);
    expect(decodeClaim('x')).toBe(null);
  });

  it('call sounds are deterministic and audible', () => {
    for (const set of BINGO_SETS) {
      const id = bingoPool(set)[3].id;
      const a = bingoCallEvents(set, id, 1, 2);
      expect(a).toEqual(bingoCallEvents(set, id, 1, 2));
      expect(a.events.length).toBeGreaterThan(1);
      expect(a.length).toBeGreaterThan(1);
    }
  });
});
