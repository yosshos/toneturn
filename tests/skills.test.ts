import { answerWord } from '../src/game/content';
import { describe, expect, it } from 'vitest';
import { band, evidence, expected, foldRatings, MAX_STEP, nextLevel, normalised, rate, weakestSkill, type RatingEvent } from '../src/engine/rating';
import {
  adaptPlacement,
  medalFor,
  placementLesson,
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
    expect(weakestSkill(strong)).toBe('intervals'); // next unmeasured skill in map (domain) order
  });
  it('placement ladder moves up and down within bounds', () => {
    expect(nextLevel(1, true)).toBe(2);
    expect(nextLevel(2, true)).toBe(2);
    expect(nextLevel(0, false)).toBe(0);
  });
});

import { LADDERS, PLACEMENT_ORDER, placementEstimate, placementResults, placementSkills, SUNG_SKILLS } from '../src/engine/placement';
import { DOMAINS, SKILLS, type DomainId } from '../src/engine/rating';
describe('Find my level 2.0: every skill, staircase to failure', () => {
  // Play a whole placement: the player is right up to `can[skill]` (a ladder level), wrong above it.
  const run = (can: Partial<Record<string, number>>, singing = false, domain: DomainId | null = null, skip: string[] = []) => {
    let lesson = placementLesson(9, { singing, domain });
    let s = newTurn(createSession(lesson), 'listening');
    for (let guard = 0; guard < 200; guard++) {
      const q = s.lesson.questions[s.index];
      const [, skill, lv] = /^p:([a-z-]+):(\d+):/.exec(q.id)!;
      if (skip.includes(skill) && !(s.lesson.placementSkipped ?? []).includes(skill as never)) {
        // "Skip this section": the section leaves the placement, then the question is skipped.
        s = { ...s, lesson: { ...s.lesson, placementSkipped: [...(s.lesson.placementSkipped ?? []), skill as never] } };
      }
      const right = Number(lv) <= (can[skill] ?? 0);
      const wrong = q.choices.find((c) => c !== q.answer) ?? '__';
      [s] = grade(s, s.turn, s.index, right ? q.answer : wrong, 'buttons');
      const next = adaptPlacement(s, 9);
      s = { ...s, lesson: { ...s.lesson, questions: next }, records: next.map((_, i) => s.records[i] ?? { attempts: [], outcome: 'pending', xp: 0, unclear: 0 }) };
      if (next.length === s.index + 1) break;
      s = newTurn(advance(s), 'listening');
    }
    return s;
  };
  it('every skill in the order is measured; singing only with the microphone', () => {
    const s = run({});
    const skills = new Set(s.lesson.questions.map((q) => q.id.split(':')[1]));
    for (const k of PLACEMENT_ORDER.filter((x) => !SUNG_SKILLS.includes(x))) expect(skills.has(k), k).toBe(true);
    for (const k of SUNG_SKILLS) expect(skills.has(k), k).toBe(false);
    const sung = new Set(run({}, true).lesson.questions.map((q) => q.id.split(':')[1]));
    for (const k of SUNG_SKILLS) expect(sung.has(k), k).toBe(true);
  });
  it('by default, every skill on the map is measured (rhythmic precision through rhythm reading)', () => {
    const measured = new Set([...placementSkills({ singing: true }), 'timing']);
    for (const k of SKILLS) expect(measured.has(k), k).toBe(true);
    for (const k of PLACEMENT_ORDER) expect(LADDERS[k]!.length, k).toBeGreaterThanOrEqual(4);
  });
  it('a skipped section is not measured and not rated; the rest still are', () => {
    const s = run({ degrees: 3, chords: 3 }, false, null, ['intervals', 'theory']);
    const res = Object.fromEntries(placementResults(s).map((r) => [r.skill, r]));
    expect(res.intervals).toBeUndefined();
    expect(res.theory).toBeUndefined();
    expect(res.degrees.passed).toBe(3);
    expect(res.chords.passed).toBe(3);
    expect(res.sight).toBeDefined();
    // Only one question of a skipped section was shown (the one skipped).
    expect(s.lesson.questions.filter((q) => q.id.startsWith('p:intervals:')).length).toBe(1);
  });
  it('by domain: only that domain\'s skills', () => {
    for (const d of DOMAINS) {
      const skills = placementSkills({ singing: true, domain: d.id });
      expect(skills.length, d.id).toBeGreaterThan(0);
      for (const k of skills) expect(d.skills.includes(k) || (k === 'rhythm-reading' && d.id === 'time'), `${d.id}:${k}`).toBe(true);
    }
    const s = run({ sequences: 2, rhythm: 2 }, false, 'memory');
    expect(new Set(s.lesson.questions.map((q) => q.id.split(':')[1]))).toEqual(new Set(['sequences', 'rhythm', 'form']));
    expect(placementResults(s).map((r) => r.skill).sort()).toEqual(['form', 'rhythm', 'sequences']);
  });
  it('climbs until the player fails, and sets the rating between passed and failed', () => {
    const s = run({ degrees: 5, chords: 99, intervals: 0 });
    const res = Object.fromEntries(placementResults(s).map((r) => [r.skill, r]));
    expect(res.degrees.passed).toBe(5);
    expect(res.degrees.rating).toBe(placementEstimate('degrees', 5));
    expect(res.chords.passed).toBe(LADDERS.chords!.length); // reached the top
    expect(res.chords.rating).toBeGreaterThan(1600);
    expect(res.intervals.passed).toBe(0);
    expect(res.intervals.rating).toBeLessThan(800);
    // A skill stops after its second miss: never more than ladder length + 2 questions
    for (const k of PLACEMENT_ORDER) if (res[k]) expect(res[k].asked, k).toBeLessThanOrEqual(LADDERS[k]!.length + 2);
  });
  it('ladders get harder level by level', () => {
    for (const [k, L] of Object.entries(LADDERS)) for (let i = 1; i < L!.length; i++) expect(L![i].difficulty, k).toBeGreaterThan(L![i - 1].difficulty);
  });
  it('a placement event SETS the rating (no small Elo step)', () => {
    const r = rate(undefined, { difficulty: 1500, correct: true, set: 1500, at: '2026-01-01T00:00:00Z' });
    expect(r.r).toBe(1500);
    expect(rate(r, { difficulty: 1000, correct: true, at: '2026-01-01T00:00:01Z' }).r).toBeLessThan(1500 + 60);
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
    const l = reviewLesson(items, 3, 5, new Date('2026-12-01'))!; // all due
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
  it('a first-try correct answer moves the tag to the next spaced-repetition box (due again in a day)', () => {
    const p0 = { ...emptyProgress(), review: [{ questionId: 'r1', key: 'cadence:open', answer: 'open', addedAt: '2026-11-01' }] };
    const lesson = reviewLesson(p0.review, 1)!;
    const s = finish(lesson as never, [true]);
    const now = new Date();
    const p = applyResult(p0, resultFromSession(s, 'R1', now), now);
    expect(p.review).toHaveLength(1);
    expect(p.review[0].box).toBe(1);
    expect(new Date(p.review[0].due!).getTime() - now.getTime()).toBeGreaterThan(23 * 3600e3);
    expect(reviewLesson(p.review, 1, 5, now)).toBeNull(); // not due today
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

  it('Find my level by voice: all correct climbs every skill to the top of its ladder, without an intro', async () => {
    const seed = 77;
    const lesson = placementLesson(seed);
    let c!: LessonController;
    const sayIt = (e: unknown) => answerWord(c.getView().question, e as never, 'en');
    const stt = new ScriptedTranscriber(Array.from({ length: 200 }, () => sayIt));
    c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
      { adapt: (s) => adaptPlacement(s, seed) },
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    expect(c.getView().stage).not.toBe('intro');
    // Rhythm reading is tapped on the pad (a scripted voice cannot tap): stop when it comes up.
    await until(() => c.getView().stage === 'complete' || c.getView().question.id.startsWith('p:rhythm-reading'), 20000);
    const qs = c.getView().session.lesson.questions;
    const top: Record<string, number> = {};
    for (const q of qs) {
      const [, k, lv] = q.id.split(':');
      top[k] = Math.max(top[k] ?? 0, Number(lv));
    }
    for (const k of PLACEMENT_ORDER.slice(0, PLACEMENT_ORDER.indexOf('rhythm-reading'))) expect(top[k], k).toBe(LADDERS[k]!.length);
    c.pause();
  }, 60_000);

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
