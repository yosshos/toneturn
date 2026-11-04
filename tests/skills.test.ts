import { describe, expect, it } from 'vitest';
import { band, evidence, expected, foldRatings, MAX_STEP, nextLevel, normalised, rate, weakestSkill, type RatingEvent } from '../src/engine/rating';
import {
  adaptPlacement,
  medalFor,
  placementItem,
  placementLesson,
  placementLevel,
  puzzleBand,
  questionFromTag,
  reviewLesson,
  weekId,
  weeklyPuzzle,
} from '../src/engine/adaptive';
import { compareStimulus, degreeQuestion, degreeSeqQuestion, qualityQuestion, renderStimulus } from '../src/engine/lesson';
import { parseDegreeSequence, parseQuality } from '../src/engine/parser';
import { calibrationOffset } from '../src/engine/memory';
import { createSession, grade, newTurn, advance, skip } from '../src/engine/session';
import { pc } from '../src/engine/pitch';
import { applyResult, emptyProgress, ratingsOf, resultFromSession, ProgressStore } from '../src/storage/progress';
import { memoryKV } from '../src/storage/kv';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } from '../src/game/fakes';

const ev = (id: string, d: number, correct: boolean, at = '2026-11-04T10:00:00Z'): RatingEvent => ({ id, skill: 'degrees', difficulty: d, correct, at });

describe('Elo-style ratings', () => {
  it('expected score follows the logistic formula', () => {
    expect(expected(1000, 1000)).toBeCloseTo(0.5);
    expect(expected(1400, 1000)).toBeCloseTo(1 / (1 + Math.pow(10, -1)));
  });
  it('provisional updates are larger, then settle; steps are bounded', () => {
    let r = rate(undefined, { difficulty: 1000, correct: true, at: '' });
    expect(r.r).toBe(1032); // 64 * 0.5
    for (let i = 0; i < 7; i++) r = rate(r, { difficulty: r.r, correct: true, at: '' });
    expect(r.n).toBe(8);
    const before = r.r;
    r = rate(r, { difficulty: r.r, correct: true, at: '' });
    expect(r.r - before).toBe(12); // 24 * 0.5
    const big = rate(undefined, { difficulty: 3000, correct: true, at: '' });
    expect(big.r - 1000).toBeLessThanOrEqual(MAX_STEP);
  });
  it('fold deduplicates by id (no replay farming) and is order-stable', () => {
    const a = foldRatings([ev('x', 1000, true), ev('x', 1000, true), ev('y', 1000, false, '2026-11-04T11:00:00Z')]);
    expect(a.degrees!.n).toBe(2);
    const b = foldRatings([ev('y', 1000, false, '2026-11-04T11:00:00Z'), ev('x', 1000, true)]);
    expect(b.degrees!.r).toBe(a.degrees!.r);
  });
  it('evidence: unmeasured → provisional → measured; unmeasured is never zero on the map', () => {
    expect(evidence(undefined)).toBe('unmeasured');
    expect(normalised(undefined)).toBeNull();
    const r = foldRatings(Array.from({ length: 8 }, (_, i) => ev(`e${i}`, 1000, true))).degrees!;
    expect(evidence(r)).toBe('measured');
    expect(evidence({ ...r, n: 3 })).toBe('provisional');
    expect(normalised({ ...r, r: 1100 })).toBeCloseTo(0.5);
  });
  it('bands and recommendation', () => {
    expect(band(850)).toBe('beginner');
    expect(band(1350)).toBe('advanced');
    const ratings = foldRatings([ev('a', 1000, false), { ...ev('b', 1000, true), skill: 'chords' }]);
    expect(weakestSkill(ratings)).toBe('degrees');
    // Everything measured is strong → recommend measuring something new.
    const strong = { degrees: { r: 1200, n: 9, correct: 9, recent: [] } };
    expect(weakestSkill(strong)).toBe('intervals'); // next unmeasured axis in map order
  });
  it('placement ladder moves up and down within bounds', () => {
    expect(nextLevel(1, true)).toBe(2);
    expect(nextLevel(2, true)).toBe(2);
    expect(nextLevel(0, false)).toBe(0);
  });
});

describe('placement', () => {
  it('9 items, 3 per skill, start in the middle, no XP, one attempt', () => {
    const l = placementLesson(5);
    expect(l.questions.map((q) => q.kind)).toEqual(['degree', 'quality', 'cadence', 'degree', 'quality', 'cadence', 'degree', 'quality', 'cadence']);
    expect(l.scoring).toEqual({ xpPerCorrect: 0, attemptLimit: 1 });
  });
  it('items get harder with level (difficulty and choices)', () => {
    const d = [0, 1, 2].map((lv) => placementItem('degrees', lv, 3, 'x'));
    expect(d.map((q) => q.difficulty)).toEqual([900, 1050, 1250]);
    expect(d.map((q) => q.choices.length)).toEqual([2, 3, 7]);
    const c = placementItem('chords', 2, 3, 'x');
    expect(c.choices).toEqual(['maj', 'min', 'dim', 'aug']);
  });
  it('adapts the next item of the same skill; resolved items never change', () => {
    const lesson = placementLesson(9);
    let s = newTurn(createSession(lesson), 'listening');
    const first = s.lesson.questions[0];
    [s] = grade(s, s.turn, 0, first.answer, 'buttons'); // degrees correct → level 2
    const adapted = adaptPlacement(s, 9);
    expect(adapted[0]).toBe(first);
    expect(adapted[3].difficulty).toBe(1250);
    expect(adapted[1].difficulty).toBe(1100); // chords untouched at level 1
    s = { ...s, lesson: { ...s.lesson, questions: adapted } };
    s = advance(s);
    s = skip(s); // skipping chords does not move its level
    expect(placementLevel(s, 'chords')).toBe(1);
  });
});

describe('review & weekly puzzle', () => {
  it('rebuilds fresh questions from tags', () => {
    const q = questionFromTag('degree:E-1:5', 1, 'r1');
    expect(q?.kind).toBe('degree');
    expect(q?.answer).toBe(5);
    expect(questionFromTag('quality:dim', 1, 'r2')?.choices).toContain('dim');
    expect(questionFromTag('seq:C0:1-3-5', 1, 'r3')?.answer).toBe('1-3-5');
    expect(questionFromTag('nonsense', 1, 'x')).toBeNull();
  });
  it('review lesson: most recent first, unique tags, max 5, null when empty', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ questionId: `q${i}`, key: `cadence:${i % 2 ? 'open' : 'resolved'}`, answer: 'x', addedAt: `2026-11-0${i + 1}` }));
    const l = reviewLesson(items, 3)!;
    expect(l.questions).toHaveLength(2); // two unique tags
    expect(l.questions[0].answer).toBe('open'); // newest (i=7) first
    expect(reviewLesson([], 1)).toBeNull();
  });
  it('ISO week ids', () => {
    expect(weekId(new Date(2026, 10, 4))).toBe('2026-W45');
    expect(weekId(new Date(2021, 0, 1))).toBe('2020-W53');
    expect(weekId(new Date(2026, 11, 28))).toBe('2026-W53');
  });
  it('same puzzle for everyone in a band this week; harder bands get longer melodies', () => {
    const a = weeklyPuzzle('2026-W45', 'developing');
    const b = weeklyPuzzle('2026-W45', 'developing');
    expect(a.questions[0].answer).toBe(b.questions[0].answer);
    expect(weeklyPuzzle('2026-W46', 'developing').questions[0].id).not.toBe(a.questions[0].id);
    expect(String(weeklyPuzzle('2026-W45', 'advanced').questions[0].answer).split('-')).toHaveLength(5);
    expect(a.scoring.xpPerCorrect).toBe(0); // separate from league XP
    expect(puzzleBand({})).toBe('developing');
  });
  it('medals: first try gold, second silver', () => {
    expect(medalFor('correct')).toBe('gold');
    expect(medalFor('correct-retry')).toBe('silver');
    expect(medalFor('revealed')).toBeNull();
  });
});

describe('parsers: sequences, dim/aug', () => {
  const seq = (t: string) => {
    const r = parseDegreeSequence(t);
    return r.kind === 'answer' ? r.value : r.kind;
  };
  it.each([
    ['one three five', '1-3-5'],
    ['1 3 5', '1-3-5'],
    ['135', '1-3-5'],
    ['five four three two one', '5-4-3-2-1'],
    ['אחת שלוש חמש', '1-3-5'],
    ['one to three', '1-2-3'],
  ])('%s → %s', (t, v) => expect(seq(t)).toBe(v));
  it('commands and noise', () => {
    expect(seq('repeat')).toBe('command');
    expect(seq('banana')).toBe('unrecognized');
  });
  it('dim / aug', () => {
    const q = (t: string) => {
      const r = parseQuality(t);
      return r.kind === 'answer' ? r.value : r.kind;
    };
    expect(q('diminished')).toBe('dim');
    expect(q('augmented')).toBe('aug');
    expect(q('מוקטן')).toBe('dim');
    expect(q('מוגדל')).toBe('aug');
  });
});

describe('hear your answer next to the correct one', () => {
  it('degree: your note, then the right one, in the same key', () => {
    const q = degreeQuestion('q', pc('C'), 5, [1, 3, 5]);
    const s = compareStimulus(q, 3)!;
    const { events } = renderStimulus(s);
    expect(events.map((e) => e.midi % 12)).toEqual([4, 7]); // E then G
  });
  it('quality: your chord colour then the right one', () => {
    const q = qualityQuestion('q', pc('C'), 'maj');
    const { events } = renderStimulus(compareStimulus(q, 'min')!);
    const thirds = events.filter((e) => e.midi % 12 === 3 || e.midi % 12 === 4).map((e) => e.midi % 12);
    expect(thirds).toEqual([3, 4]);
  });
  it('sequence: replays what you said, then the melody', () => {
    const q = degreeSeqQuestion('q', pc('C'), [1, 3, 5]);
    const { events } = renderStimulus(compareStimulus(q, '1-2-5')!);
    expect(events.map((e) => e.midi % 12)).toEqual([0, 2, 7, 0, 4, 7]);
    expect(compareStimulus(q, 'zz')).toBeNull();
  });
});

describe('tap-latency calibration', () => {
  it('median offset after the settling clicks', () => {
    const beat = 600; // 100 BPM
    const taps = Array.from({ length: 12 }, (_, i) => 1000 + i * beat + (i < 4 ? 200 : 45 + (i % 3) * 5));
    expect(calibrationOffset(1000, taps, 100)).toBe(50);
    expect(calibrationOffset(1000, [1000, 1600], 100)).toBeNull();
  });
});

describe('progress: ratings, review clearing, puzzles, snapshots', () => {
  const finish = (lesson: ReturnType<typeof placementLesson>, answers: (boolean | 'skip')[]) => {
    let s = newTurn(createSession(lesson), 'listening');
    answers.forEach((a, i) => {
      if (a === 'skip') s = skip(s);
      else {
        const q = s.lesson.questions[i];
        const wrongAnswer = q.choices.find((c) => c !== q.answer)!;
        [s] = grade(s, s.turn, i, a ? q.answer : wrongAnswer, 'buttons');
      }
      s = advance(s);
    });
    return s;
  };
  it('records one rating event per answered item; skipped items are not rated', () => {
    const s = finish(placementLesson(1), [true, false, 'skip', true, true, true, true, true, true]);
    const r = resultFromSession(s, 'S1', new Date('2026-11-04T10:00:00Z'));
    expect(r.items).toHaveLength(8);
    const p = applyResult(emptyProgress(), r, new Date('2026-11-04T10:00:00Z'));
    const ratings = ratingsOf(p);
    expect(ratings.degrees!.n).toBe(3);
    expect(ratings.chords!.n).toBe(3);
    expect(ratings.cadences!.n).toBe(2);
    expect(p.snapshots).toHaveLength(1);
    // applying twice changes nothing
    expect(applyResult(p, r, new Date())).toBe(p);
  });
  it('a first-try correct answer clears that tag from the review queue', () => {
    const p0 = { ...emptyProgress(), review: [{ questionId: 'r1', key: 'cadence:open', answer: 'open', addedAt: '2026-11-01' }] };
    const lesson = reviewLesson(p0.review, 1)!;
    const s = finish(lesson as never, [true]);
    const p = applyResult(p0, resultFromSession(s, 'R1', new Date()), new Date());
    expect(p.review).toHaveLength(0);
  });
  it('only the first scored puzzle of the week counts', () => {
    const puzzle = weeklyPuzzle('2026-W45', 'beginner');
    const solved = finish(puzzle as never, [true]);
    let p = applyResult(emptyProgress(), resultFromSession(solved, 'P1', new Date()), new Date());
    expect(p.puzzles!['2026-W45'].medal).toBe('gold');
    const later = finish(puzzle as never, [false]);
    p = applyResult(p, resultFromSession(later, 'P2', new Date()), new Date());
    expect(p.puzzles!['2026-W45'].medal).toBe('gold');
    expect(p.xp).toBe(0);
  });
  it('solo game rounds are rated once each', async () => {
    const store = new ProgressStore(memoryKV());
    const log = [
      { length: 2, pass: true },
      { length: 3, pass: true },
      { length: 4, pass: false },
    ];
    await store.recordGameRounds('melody', 42, log);
    const p = await store.recordGameRounds('melody', 42, log);
    expect(ratingsOf(p).sequences!.n).toBe(3);
  });
});

describe('controller: adaptive placement and sequence answers', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function until(pred: () => boolean, max = 1500) {
    for (let i = 0; i < max; i++) {
      if (pred()) return;
      await tick();
    }
    throw new Error('condition not reached');
  }
  const say = (e: unknown) =>
    typeof e === 'number' ? ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][e] : e === 'maj' ? 'major' : e === 'min' ? 'minor' : e === 'dim' ? 'diminished' : e === 'aug' ? 'augmented' : String(e).replace(/-/g, ' ');

  it('placement by voice: all correct pushes every skill to the hardest items, without an intro', async () => {
    const seed = 77;
    const lesson = placementLesson(seed);
    const stt = new ScriptedTranscriber(Array.from({ length: 12 }, () => say));
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
      { adapt: (s) => adaptPlacement(s, seed) },
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    expect(c.getView().stage).not.toBe('intro');
    await until(() => c.getView().stage === 'complete');
    const qs = c.getView().session.lesson.questions;
    expect(qs.slice(6).map((q) => q.difficulty)).toEqual([1250, 1300, 1200]);
    expect(c.getView().session.records.every((r) => r.outcome === 'correct')).toBe(true);
  });

  it('weekly puzzle answered by voice as a sequence', async () => {
    const lesson = weeklyPuzzle('2026-W45', 'developing');
    const stt = new ScriptedTranscriber([(e) => say(e)]);
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records[0].outcome).toBe('correct');
  });
});
