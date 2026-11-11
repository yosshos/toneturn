import { describe, expect, it } from 'vitest';
import {
  RUSH_MODES,
  RUSH_MS,
  START_LIVES,
  comboMult,
  currentItem,
  fretAnswers,
  fretTarget,
  gradeFret,
  isRushSaved,
  newRush,
  rushAnswer,
  rushHears,
  rushItem,
  rushLadder,
  rushMaxLevel,
  rushResult,
  rushTick,
  type RushState,
} from '../src/engine/rush';
import { TUNINGS, noteAt } from '../src/engine/fretboard';

const run = (s: RushState, answers: boolean[]) => answers.reduce((st, a) => rushAnswer(st, a).state, s);

describe('rush: scoring and combo', () => {
  it('multiplier: 1, ×1.5 from 5 in a row, ×2 from 10', () => {
    expect([1, 4, 5, 9, 10, 30].map(comboMult)).toEqual([1, 1, 1.5, 1.5, 2, 2]);
  });
  it('scores 10 per right × combo, wrong resets the combo and costs 2 s', () => {
    let s = newRush({ mode: 'note', seed: 1, startLevel: 1 });
    s = run(s, Array(4).fill(true));
    expect(s.score).toBe(40);
    const fifth = rushAnswer(s, true);
    expect(fifth.gained).toBe(15);
    expect(fifth.burst).toBe(1.5);
    s = run(fifth.state, Array(4).fill(true)); // combo 9
    const tenth = rushAnswer(s, true);
    expect(tenth.gained).toBe(20);
    expect(tenth.burst).toBe(2);
    s = tenth.state;
    expect(s.score).toBe(40 + 15 * 5 + 20);
    const w = rushAnswer(s, false).state;
    expect(w.combo).toBe(0);
    expect(w.maxCombo).toBe(10);
    expect(w.timeLeftMs).toBe(RUSH_MS - 2000);
    expect(rushAnswer(w, true).gained).toBe(10);
  });
  it('the clock: ticking and wrong answers end the round', () => {
    let s = newRush({ mode: 'interval', seed: 2, startLevel: 1 });
    s = rushTick(s, 59_000);
    expect(s.over).toBe(false);
    s = rushAnswer(s, false).state;
    expect(s.over).toBe(true);
    expect(s.timeLeftMs).toBe(0);
    expect(rushAnswer(s, true).state).toBe(s); // nothing after the end
    expect(rushTick(newRush({ mode: 'chord', seed: 1, startLevel: 1 }), 60_000).over).toBe(true);
  });
});

describe('rush: levels', () => {
  it('timed modes level up every 5 right; never past the top', () => {
    let s = newRush({ mode: 'chord', seed: 3, startLevel: 2 });
    s = run(s, [true, true, true, true, false, true]);
    expect(s.level).toBe(3);
    const top = rushMaxLevel('chord');
    expect(top).toBe(7);
    s = run(newRush({ mode: 'chord', seed: 3, startLevel: 1 }), Array(60).fill(true));
    expect(s.level).toBe(top);
  });
  it('start level is clamped', () => {
    expect(newRush({ mode: 'keysig', seed: 1, startLevel: 99 }).level).toBe(rushMaxLevel('keysig'));
    expect(newRush({ mode: 'keysig', seed: 1, startLevel: 0 }).level).toBe(1);
  });
  it('every ladder exists and rises in difficulty', () => {
    for (const m of RUSH_MODES) {
      const l = rushLadder(m);
      expect(l.length, m).toBeGreaterThanOrEqual(3);
      for (const r of l) expect(r.name.en && r.name.he).toBeTruthy();
    }
  });
});

describe('rush: Progression Detective (streak)', () => {
  it('3 lives, no clock, level every 3 right', () => {
    let s = newRush({ mode: 'progression', seed: 9, startLevel: 1 });
    expect(s.lives).toBe(START_LIVES);
    s = rushTick(s, 120_000);
    expect(s.over).toBe(false);
    s = run(s, [true, true, true]);
    expect(s.level).toBe(2);
    s = run(s, [false, false]);
    expect(s.lives).toBe(1);
    expect(s.over).toBe(false);
    s = rushAnswer(s, false).state;
    expect(s.over).toBe(true);
    expect(rushResult(s)).toEqual({ game: 'rush-progression', score: 30, detail: { right: 3, wrong: 3, maxCombo: 3, level: 2 } });
  });
  it('a saved run is recognised and survives JSON', () => {
    const s = run(newRush({ mode: 'progression', seed: 4, startLevel: 1 }), [true, false]);
    const saved = JSON.parse(JSON.stringify({ v: 1, game: 'rush', state: s }));
    expect(isRushSaved(saved, 'progression')).toBe(true);
    expect(isRushSaved(saved, 'chord')).toBe(false);
    expect(isRushSaved(null, 'progression')).toBe(false);
    expect(currentItem(saved.state).key).toBe(currentItem(s).key);
  });
});

describe('rush: items', () => {
  it('deterministic from the seed and the answers', () => {
    for (const mode of RUSH_MODES) {
      const answers = [true, false, true, true, true, true, true, false, true];
      const play = () => {
        let s = newRush({ mode, seed: 77, startLevel: 1, picture: 'mixed' });
        const keys: string[] = [];
        for (const a of answers) {
          keys.push(currentItem(s).key);
          s = rushAnswer(s, a).state;
        }
        return { keys, s };
      };
      const a = play();
      const b = play();
      expect(a.keys, mode).toEqual(b.keys);
      expect(a.s).toEqual(b.s);
      // another seed gives another sequence
      let o = newRush({ mode, seed: 78, startLevel: 1, picture: 'mixed' });
      const k2: string[] = [];
      for (const x of answers) {
        k2.push(currentItem(o).key);
        o = rushAnswer(o, x).state;
      }
      expect(k2, mode).not.toEqual(a.keys);
    }
  });
  it('no immediate repeats', () => {
    for (const mode of RUSH_MODES) {
      let s = newRush({ mode, seed: 5, startLevel: 1 });
      let prev = '';
      for (let i = 0; i < 25; i++) {
        const it = currentItem(s);
        expect(it.key, `${mode} #${i}`).not.toBe(prev);
        prev = it.key;
        s = rushAnswer(s, true, it.key).state;
        if (s.over) break; // rounds mode (Name That Standard) ends after 10
      }
    }
  });
  it('every mode and level gives a playable item', () => {
    for (const mode of RUSH_MODES)
      for (let level = 1; level <= rushMaxLevel(mode); level++)
        for (let i = 0; i < 6; i++) {
          const it = rushItem({ mode, seed: 11, startLevel: 1, picture: 'mixed' }, i, level);
          if (it.kind === 'choice') {
            expect(it.q.choices).toContain(it.q.answer);
            if (mode === 'interval' || mode === 'progression' || mode === 'voicing' || mode === 'scale' || mode === 'standard') expect(it.q.stimulus.length, `${mode} L${level}`).toBeGreaterThan(0);
            else expect(!!(it.q.show || it.q.diagram || it.q.text), `${mode} L${level}`).toBe(true);
          } else expect(mode).toBe('fretboard');
        }
  });
  it('chord mode respects the picture filter', () => {
    for (const picture of ['keys', 'staff', 'neck'] as const)
      for (let level = 1; level <= 7; level++) {
        const it = rushItem({ mode: 'chord', seed: 3, startLevel: 1, picture }, level, level);
        if (it.kind !== 'choice') throw new Error('choice expected');
        if (picture === 'staff') expect(it.q.show).toBeTruthy();
        else if (picture === 'keys') expect(it.q.diagram?.kind).toBe('keys');
        else expect(['neck', 'box']).toContain(it.q.diagram?.kind);
      }
  });
  it('Chord Rush: a keys or guitar picture sounds its chord, the staff stays reading only (playtest 0.68: silent keys)', () => {
    for (const picture of ['keys', 'neck', 'staff'] as const)
      for (let level = 1; level <= 7; level++) {
        const it = rushItem({ mode: 'chord', seed: 5, startLevel: 1, picture }, level, level);
        if (it.kind !== 'choice') throw new Error('choice expected');
        if (picture === 'staff') expect(rushHears('chord', it), `staff L${level}`).toBe(false);
        else {
          expect(rushHears('chord', it), `${picture} L${level}`).toBe(true);
          const notes = it.q.stimulus.flatMap((s) => (s.kind === 'chord' ? s.midis : []));
          expect(notes.sort()).toEqual([...(it.q.diagram?.kind === 'keys' ? it.q.diagram.midis ?? [] : notes)].sort());
          expect(notes.length).toBeGreaterThanOrEqual(3);
        }
      }
    expect(rushHears('note', rushItem({ mode: 'note', seed: 5, startLevel: 1 }, 0, 1))).toBe(false);
    expect(rushHears('interval', null)).toBe(true);
  });
});

describe('rush: fretboard', () => {
  const std = TUNINGS[0];
  const bass = TUNINGS.find((t) => t.id === 'bass')!;
  it('targets are always reachable and graded by pitch on the allowed strings', () => {
    for (const t of [std, bass])
      for (let level = 1; level <= 5; level++)
        for (let seed = 1; seed < 80; seed++) {
          const f = fretTarget(seed, level, t);
          const ok = fretAnswers(f, t);
          expect(ok.length, `${t.id} L${level}`).toBeGreaterThan(0);
          for (const p of ok) expect(f.strings).toContain(p.str);
          if (level <= 2) expect([0, 2, 4, 5, 7, 9, 11]).toContain(f.pc);
          if (level === 1 || level === 3) expect(f.strings).toEqual([t.open.length, t.open.length - 1]);
          if (level === 5) expect(f.midi).toBeDefined();
        }
  });
  it('grading', () => {
    const f = { pc: 9, strings: [6, 5], frets: [0, 12] as [number, number], name: { en: 'A', he: 'לה' } };
    expect(gradeFret(f, 6, 5, std)).toBe(true); // A on the low E string
    expect(gradeFret(f, 5, 0, std)).toBe(true); // open A
    expect(gradeFret(f, 5, 12, std)).toBe(true);
    expect(gradeFret(f, 3, 2, std)).toBe(false); // an A, but not on an allowed string
    expect(gradeFret(f, 6, 6, std)).toBe(false);
    const exact = { ...f, midi: noteAt(std, 5, 0), strings: [1, 2, 3, 4, 5, 6] };
    expect(gradeFret(exact, 6, 5, std)).toBe(true); // same pitch
    expect(gradeFret(exact, 5, 12, std)).toBe(false); // an octave higher
  });
});
