// Teacher phrase assignments (SPEC-PHRASE-STUDIO §11): the ref code round trip and its size (< 4 KB for 16 bars, the
// legacy 2000-char channel), trimming to 16 bars, the student's locked phrase, one submission per passed key (queued,
// never twice), automatic grading with the teacher's override, the 'piece' fallback read back as a phrase.
import { describe, expect, it } from 'vitest';
import type { Lick, LickNote } from '../src/engine/licks';
import type { ItemState } from '../src/engine/drills/types';
import {
  assignmentOf, assignProblem, autoMark, decodePhraseRef, encodePhraseRef, keyStrip, assignmentPassed, lickFromAssignment, pendingKeySubmissions, phraseFromPlaying, phraseScore, refBytes, requiredKeys, trimBars, teacherPhraseId, withAssignedPhrase,
  LEGACY_REF_MAX, MAX_TEACHER_BARS, PHRASE_REF_MAX, type PhraseAssignment,
} from '../src/engine/encore/assign';
import { phraseItemId, finalHand, phraseBars } from '../src/engine/encore/phrase';
import { emptyOutbox, enqueuePassed, markFailed, markSent } from '../src/storage/phraseOutbox';
import { itemFromRaw } from '../src/cloud/teacher';
import { autoRows } from '../src/ui/TeacherLoop';

const phrase = (bars: number, perBeat = 2, lhChords = false): Lick => {
  const notes: LickNote[] = [];
  for (let b = 0; b < bars * 4 * perBeat; b++) notes.push([(b * 5) % 14, b / perBeat, 1 / perBeat]);
  const lh: LickNote[] = [];
  if (lhChords) for (let b = 0; b < bars * 4; b++) for (const s of [0, 4, 7]) lh.push([s, b, 1]);
  return { id: 'enc-x', v: 3, ctx: 'free', level: 3, name: { en: 'ii–V in F', he: 'ii–V ב־F' }, own: true, chords: [[2, 'm7', 4], [7, '7', 4]], notes, ...(lh.length ? { lh } : {}), meter: 4, swing: 0.6, homeKey: 5, instrument: 'piano', playedBpm: 120 };
};
const plan = { goalBpm: 160, keys: 'all' as const, order: 'easiest' as const, hands: 'R' as const, band: true };

describe('the phrase code', () => {
  it('round-trips notes, chords, plan and the teacher', () => {
    const l = phrase(4);
    const a = assignmentOf(l, { ...plan, keys: [5, 10, 3], startBpm: 90 }, { teacher: 'רונית' });
    const back = decodePhraseRef(encodePhraseRef(a))!;
    expect(back.rh).toEqual(l.notes);
    expect(back.chords).toEqual(l.chords);
    expect(back.homeKey).toBe(5);
    expect(back.swing).toBeCloseTo(0.6);
    expect(back.plan).toEqual({ goalBpm: 160, startBpm: 90, keys: [5, 10, 3], order: 'easiest', hands: 'R', band: true });
    expect(back.teacher).toBe('רונית');
    expect(back.name).toBe('ii–V ב־F');
  });
  it('keeps triplets and sixteenths exact (1/24 beat)', () => {
    const l = { ...phrase(1), notes: [[0, 0, 1 / 3], [2, 1 / 3, 1 / 3], [4, 2 / 3, 1 / 3], [5, 1.25, 0.25]] as LickNote[] };
    const back = decodePhraseRef(encodePhraseRef(assignmentOf(l, plan)))!;
    back.rh.forEach((n, i) => {
      expect(n[1]).toBeCloseTo(l.notes[i][1], 6);
      expect(n[2]).toBeCloseTo(l.notes[i][2], 6);
    });
  });
  it('stays under 4 KB for 16 dense bars with two hands (sync model §11.4)', () => {
    const a = assignmentOf(phrase(16, 4, true), plan, { teacher: 'A teacher with a long name' });
    const ref = encodePhraseRef(a);
    expect(refBytes(ref)).toBeLessThan(PHRASE_REF_MAX);
    expect(assignProblem(a, PHRASE_REF_MAX)).toBeNull();
  });
  it('an 8-bar line fits the legacy 2000-char ref; an oversize one says so', () => {
    expect(assignProblem(assignmentOf(phrase(8), plan), LEGACY_REF_MAX)).toBeNull();
    expect(assignProblem(assignmentOf(phrase(16, 4, true), plan), LEGACY_REF_MAX)).toBe('size');
  });
  it('rejects garbage and more than 16 bars', () => {
    expect(decodePhraseRef('phrase1:@@@')).toBeNull();
    expect(decodePhraseRef('hello')).toBeNull();
    expect(assignProblem(assignmentOf(phrase(17), plan), 99999)).toBe('bars');
  });
});

describe('the teacher', () => {
  it('trims to whole bars, at most 16', () => {
    const l = phrase(20);
    const t = trimBars(l, 2, 40);
    expect(phraseBars(t)).toBe(MAX_TEACHER_BARS);
    expect(Math.min(...t.notes.map((n) => n[1]))).toBe(0);
    const t2 = trimBars(l, 1, 3);
    expect(phraseBars(t2)).toBe(2);
    expect(t2.chords.reduce((a, c) => a + c[2], 0)).toBe(4); // bar 2 of the ii–V
  });
  it('catches a phrase from MIDI playing', () => {
    const P = 500;
    const notes = Array.from({ length: 16 }, (_, i) => ({ pitch: 60 + [0, 2, 4, 5, 7, 9, 11, 12][i % 8], on: 200 + i * P, off: 200 + i * P + 400, vel: 80 }));
    const r = phraseFromPlaying(notes)!;
    expect(r).not.toBeNull();
    expect(r.bars).toBeGreaterThanOrEqual(3);
    expect(r.bars).toBeLessThanOrEqual(MAX_TEACHER_BARS);
    expect(r.l.notes.length).toBeGreaterThanOrEqual(14);
  });
});

/** Items with `key` passed at the target (3 clean takes on 2 days). */
const passedItems = (l: Lick, keys: number[], bpm: number, acc = 0.96, sd = 20): Record<string, ItemState> => {
  const out: Record<string, ItemState> = {};
  for (const k of keys) {
    const id = phraseItemId(l, 'piano', k, finalHand(l));
    out[id] = { itemId: id, family: 'licks', key: k, hands: 'R', goalBpm: bpm, streak: 0, fails: 0, last: '2026-11-11T11:00:00Z', history: [], cleanBpm: bpm, takes: 5, ewma: { cv: 0.05, sd, vsd: 0, hands: 0, acc }, passLog: [{ at: '2026-11-10T10:00:00Z', bpm }, { at: '2026-11-11T10:00:00Z', bpm }, { at: '2026-11-11T11:00:00Z', bpm }] } as ItemState;
  }
  return out;
};

describe('the student', () => {
  const a: PhraseAssignment = { ...assignmentOf(phrase(4), { ...plan, keys: [5, 0, 7] }), teacher: 'T' };
  const l = lickFromAssignment(a, 'abc-123', 'T', '2026-11-09T00:00:00Z');
  it('gets a locked Encore phrase with a stable id', () => {
    expect(l.id).toBe(teacherPhraseId('abc-123'));
    expect(l.source).toEqual({ kind: 'teacher', assignmentId: 'abc-123', teacher: 'T' });
    expect(l.plan?.locked).toEqual(['goalBpm', 'keys', 'hands']);
    expect(l.plan?.goalBpm).toBe(160);
    expect(requiredKeys(l)).toEqual([0, 5, 7]);
    const b = withAssignedPhrase({ own: [{ ...l, folder: 'x' }] }, l);
    expect(b.own).toHaveLength(1);
    expect(b.own![0].folder).toBe('x');
  });
  it('one submission per passed required key, with score and tempo', () => {
    const items = passedItems(l, [5, 0, 3], 160);
    const subs = pendingKeySubmissions(l, items, []);
    expect(subs.map((s) => s.key)).toEqual([0, 5]); // 3 is not required
    expect(subs[0].metrics).toMatchObject({ key: 0, bpm: 160, acc: 0.96, timingSD: 20, kind: 'phrase' });
    expect(subs[0].score).toBeCloseTo(0.96);
    expect(pendingKeySubmissions(l, items, [0])).toHaveLength(1);
    expect(phraseScore(1, 175)).toBeCloseTo(0.6);
  });
  it('the outbox queues each key once and keeps it until sent', () => {
    const items = passedItems(l, [5], 160);
    const book = { own: [l] };
    let st = enqueuePassed(emptyOutbox(), book, items, '2026-11-12T00:00:00Z').state;
    expect(st.queue).toHaveLength(1);
    expect(enqueuePassed(st, book, items, 'x').added).toHaveLength(0); // already queued
    st = markFailed(st, st.queue[0].id);
    expect(st.queue[0].tries).toBe(1);
    st = markSent(st, st.queue[0].id);
    expect(st.queue).toHaveLength(0);
    expect(st.sent['abc-123']).toEqual([5]);
    expect(enqueuePassed(st, book, items, 'x').added).toHaveLength(0); // already sent
    expect(JSON.stringify(enqueuePassed(emptyOutbox(), book, items, 'x').added[0].metrics).length).toBeLessThan(400);
  });
});

describe('grading', () => {
  it('grades by the strictness', () => {
    expect(autoMark(0.8, 'moderate')).toBe('good');
    expect(autoMark(0.9, 'moderate')).toBe('great');
    expect(autoMark(0.7, 'moderate')).toBe('again');
    expect(autoMark(0.65, 'lenient')).toBe('good');
    expect(autoMark(null, 'lenient')).toBe('again');
    const strip = keyStrip([{ metrics: { kind: 'phrase', key: 0, bpm: 150 }, score: 0.8 }, { metrics: { kind: 'phrase', key: 0, bpm: 160 }, score: 0.9 }, { metrics: {}, score: 1 }]);
    expect(strip.get(0)).toEqual({ score: 0.9, bpm: 160 });
    expect(assignmentPassed([0], strip, 'strict')).toBe(true);
    expect(assignmentPassed([0, 5], strip, 'lenient')).toBe(false);
  });
  it('reads a phrase sent as a piece back as a phrase; the inbox grades it and keeps the override', () => {
    const ref = encodePhraseRef(assignmentOf(phrase(2), { ...plan, keys: [0, 5] }));
    const raw = { id: 'a1', kind: 'piece' as const, lesson_id: 'piece', ref, due_on: null, strictness: 'moderate' as const, target_bpm: 160, note: null, created_at: '2026-11-10', submissions: [
      { id: 's1', user_id: 'u', name: 'Dana', created_at: '2026-11-11', score: 0.8, metrics: { kind: 'phrase', key: 0, bpm: 160 }, comment: null, mark: null },
      { id: 's2', user_id: 'u', name: 'Dana', created_at: '2026-11-12', score: 0.92, metrics: { kind: 'phrase', key: 5, bpm: 160 }, comment: null, mark: null },
    ] };
    const it0 = itemFromRaw(raw);
    expect(it0.kind).toBe('phrase');
    const rows = autoRows({ assignments: [it0], minutes: {} });
    expect(rows).toHaveLength(1);
    expect(rows[0].mark).toBe('good'); // weakest key 0.8 at moderate
    expect(rows[0].done).toBe(2);
    const over = autoRows({ assignments: [{ ...it0, submissions: [{ ...it0.submissions[0], mark: 'again' as const }, it0.submissions[1]] }], minutes: {} });
    expect(over[0].shown).toBe('again');
    expect(over[0].overridden).toBe(true);
  });
});
