import { describe, expect, it } from 'vitest';
import { gradeSequence, newTakeSave, playbackItem, playbackLevelAt, hearEvents, PLAYBACK_MAX, TAKES_PER_RUN } from '../src/engine/instGames';
import { GAME_TIERS } from '../src/engine/gameTiers';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { phraseFor, TX_KEYS, TX_LEVELS } from '../src/engine/transcribe';
import { MEASURED_STEP_LEVELS, stepCatalogue } from '../src/engine/path';
import { BY_EAR_REVEAL, byEarCredit, byEarXp, lickDrill, lickEvents, lickSound, LICKS } from '../src/engine/licks';
import { TOPIC_GEN } from '../src/engine/topicKit';
import { gradePlace, placeKey, type PlaceQuestion } from '../src/engine/lesson';
import { phraseRetry } from '../src/engine/coach';
import '../src/engine/topicsJazzEar';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { BADGE_FAMILIES, KEYS_FAMILIES } from '../src/engine/badges';
import { strandsFor } from '../src/engine/drills/levelTest';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { callSound, REPLAY_SLOW } from '../src/engine/drills/phraseDrills';
import { generate } from '../src/engine/drills/generate';
import { inBassTrack } from '../src/engine/drills/bassNiche';
import { ADDON_FAMILY } from '../src/engine/drills/guitarMeta';
import type { TakeMetrics } from '../src/engine/drills/types';

describe('Play It Back on keys, guitar and bass, past ff, in 12 keys', () => {
  it('guitar and bass offer it; keys still do', () => {
    for (const c of ['keys', 'guitar', 'bass'] as const) expect(COURSE_GAMES[c]).toContain('playback');
    expect(GAME_TIERS.playback.source('guitar')).toBe('instrument/guitar-tech');
    expect(GAME_TIERS.playback.source('bass')).toBe('instrument/bass-tech');
  });

  it('every level runs in all 12 keys', () => {
    for (let lv = 1; lv <= PLAYBACK_MAX; lv++) {
      const keys = new Set(Array.from({ length: 400 }, (_, s) => playbackItem(s, lv).key));
      expect(keys.size, `level ${lv}`).toBe(12);
    }
  });

  it('past ff: levels 7–9 are an enclosure, the bebop scale and an altered ii–V–I, swung over a comp', () => {
    for (const lv of [7, 8, 9]) {
      const it = playbackItem(3, lv);
      expect(it.level).toBe(lv);
      expect(it.rhythm && it.swing).toBe(true);
      expect(it.backing!.length).toBeGreaterThan(0);
      expect(it.notes.length).toBeGreaterThanOrEqual(lv === 9 ? 17 : 5);
      const ev = hearEvents(it, 110).events;
      expect(ev.length).toBe(it.notes.length + it.backing!.reduce((a, b) => a + b.midi.length, 0));
    }
    expect(GAME_TIERS.playback.tiers.ff.levels).toEqual([6, 7, 8, 9]);
    // An ff run climbs 6 → 9 over its phrases; the lower tiers keep their level.
    const s = newTakeSave('playback', 1, 6, 110, 'ff');
    expect(Array.from({ length: TAKES_PER_RUN.playback }, (_, i) => playbackLevelAt(s, i))).toEqual([6, 6, 7, 8, 8, 9]);
    expect(playbackLevelAt(newTakeSave('playback', 1, 3, 90), 5)).toBe(3);
  });

  it('on the bass the phrase sits two octaves down and sounds on the bass; graded by pitch class', () => {
    const k = playbackItem(9, 3, 'keys');
    const b = playbackItem(9, 3, 'bass');
    expect(b.notes.map((n) => n.midi)).toEqual(k.notes.map((n) => n.midi - 24));
    expect(hearEvents(b, 90).events.filter((e) => e.inst === 'bass').length).toBe(b.notes.length);
    const top = playbackItem(9, 9, 'bass');
    expect(Math.max(...top.notes.map((n) => n.midi))).toBeLessThanOrEqual(60);
    // The keys answer of the same notes an octave up is right (pitch classes).
    const g = gradeSequence(b, b.notes.map((n, i) => ({ ms: i * 500, midi: n.midi + 24 })), 90);
    expect(g.marks.every((m) => m === 'hit')).toBe(true);
  });
});

describe('the transcription coach: 12 keys, guitar and bass to level 9', () => {
  it('phrases come in all 12 keys', () => {
    expect(new Set(TX_KEYS).size).toBe(12);
    for (const level of [1, 3, 5, 9]) {
      const keys = new Set(Array.from({ length: 300 }, (_, s) => phraseFor(level, s).key));
      expect(keys.size, `level ${level}`).toBe(12);
    }
  });
  it('guitar and bass path steps reach L9', () => {
    expect(MEASURED_STEP_LEVELS.transcribe.guitar).toContain(9);
    expect(MEASURED_STEP_LEVELS.transcribe.bass).toContain(9);
    expect(Math.max(...MEASURED_STEP_LEVELS.transcribe.guitar)).toBe(TX_LEVELS.length);
    const ids = stepCatalogue().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['transcribe:guitar:9', 'transcribe:bass:9', 'transcribe:bass:6']));
  });
});

describe('the lick trainer by ear', () => {
  const l = LICKS.find((x) => x.level >= 2)!;
  const m = (verdict: TakeMetrics['verdict'], accuracy: number) => ({ verdict, accuracy }) as TakeMetrics;
  it('revealing the notes before the first take gives less credit; by ear it counts as dictation', () => {
    const at = '2026-11-14T00:00:00Z';
    const plain = lickEvents(l, 'piano', m('clean', 1), 100, at, 's', 0)[0];
    const ear = lickEvents(l, 'piano', m('clean', 1), 100, at, 's', 0, 'vocab', { byEar: true, revealed: false })[0];
    const shown = lickEvents(l, 'piano', m('clean', 1), 100, at, 's', 0, 'vocab', { byEar: true, revealed: true })[0];
    expect(plain.skill).toBe('improv');
    expect(ear.skill).toBe('dictation');
    expect(ear.score).toBe(1);
    expect(ear.correct).toBe(true);
    expect(ear.difficulty).toBeGreaterThan(plain.difficulty);
    expect(shown.score).toBeCloseTo(BY_EAR_REVEAL, 6);
    expect(shown.correct).toBe(false);
    expect(byEarCredit({ byEar: true, revealed: true })).toBe(BY_EAR_REVEAL);
    expect(byEarCredit({ byEar: true, revealed: false })).toBe(1);
    expect(byEarCredit(undefined)).toBe(1);
    // Partial credit carries through, then the reveal factor.
    const part = lickEvents(l, 'piano', m('almost', 0.8), 100, at, 's', 0, 'vocab', { byEar: true, revealed: true })[0];
    expect(part.score).toBeCloseTo(0.8 * 0.85 * BY_EAR_REVEAL, 3);
    expect(byEarXp(m('clean', 1), { byEar: true, revealed: false })).toBeGreaterThan(byEarXp(m('clean', 1), { byEar: true, revealed: true }));
  });
  it('"Hear it" plays the lick’s notes (slower on request)', () => {
    const d = lickDrill(l, 5, 'piano');
    const a = lickSound(d, 100);
    const b = lickSound(d, 100, 0.65);
    expect(a.events.map((e) => e.midi)).toEqual(d.notes.map((n) => n.pitch));
    expect(b.length).toBeGreaterThan(a.length);
  });
});

describe('jazz-phrase: the enclosure and the bebop line as transcriptions', () => {
  const T = TOPIC_GEN['jazz-phrase'];
  it('levels 6–7 are place questions in all 12 keys, the first note given, graded with partial credit', () => {
    expect(T.levels.length).toBe(7);
    for (const level of [6, 7]) {
      const keys = new Set<number>();
      for (let seed = 1; seed < 200; seed++) {
        const q = T.gen(seed, level, `q${seed}`) as PlaceQuestion;
        expect(q.kind).toBe('place');
        expect(q.as).toBe('seq');
        expect(q.match).toBe('pc');
        expect(q.given!.midis[0]).toBe(q.target[0]);
        expect(level === 6 ? [5, 6] : [8]).toContain(q.target.length);
        keys.add(((q.target[q.target.length - 1] % 12) + 12) % 12);
        expect(gradePlace(q, q.answer).score).toBe(1);
        // One wrong note costs one note.
        const wrong = [...q.target];
        wrong[2] += 1;
        expect(gradePlace(q, placeKey(q, wrong)).score).toBeCloseTo((q.target.length - 1) / q.target.length, 6);
        // An enharmonic spelling is the same key (pitch class).
        expect(gradePlace(q, placeKey(q, q.target.map((x) => x + 12))).score).toBe(1);
      }
      expect(keys.size).toBe(12);
    }
    // The multiple-choice levels stay as the easier steps.
    expect(T.gen(3, 3, 'x').kind).toBe('choice');
    expect(T.gen(3, 4, 'x').kind).toBe('choice');
  });
  it('the coach says where the transcription went off', () => {
    expect(phraseRetry('4.5.7', '4.5.8', 'OK,', 'en')).toContain('note 3');
    expect(phraseRetry('4.5.7', '3.5.7', 'OK,', 'en')).toContain('first note');
    expect(phraseRetry('4.5.7', '4.5.7', 'OK,', 'en')).toBeNull();
    expect(phraseRetry('4.5.7', '4.6.7', 'אוקיי,', 'he')).toMatch(/[֐-׿]/);
  });
});

describe('phrases by ear: wiring', () => {
  it('glyphs, badges, lessons, the level test, tracks and add-ons', () => {
    for (const f of ['k-phrase', 'g-phrase', 'b-phrase']) expect(FAMILY_GLYPH[f], f).toBeTruthy();
    expect(new Set(['k-phrase', 'g-phrase', 'b-phrase'].map((f) => FAMILY_GLYPH[f])).size).toBe(3);
    expect(BADGE_FAMILIES).toEqual(expect.arrayContaining(['k-phrase', 'g-phrase']));
    expect(KEYS_FAMILIES).toEqual(expect.arrayContaining(['k-phrase', 'g-phrase']));
    const ml = MINI_LESSONS['phrase-by-ear'];
    expect(ml.title.en).toBe('Learning lines by ear');
    for (const f of ['k-phrase', 'g-phrase', 'b-phrase']) expect(UNIT_LESSON[`tech:${f}`]).toBe('phrase-by-ear');
    for (const inst of ['piano', 'guitar', 'bass'] as const) {
      const ear = strandsFor(inst, 'both').find((s) => s.id === 'ear')!;
      expect(ear.rungs.some((r) => r.level.includes('-phrase-')), inst).toBe(true);
    }
    expect(inBassTrack('b-phrase', 'jazz')).toBe(true);
    expect(inBassTrack('b-phrase', 'prog')).toBe(false);
    expect(ADDON_FAMILY['g-phrase']).toBe('jazz');
  });
  it('the path places the levels by difficulty, ~1200 to ~1900', () => {
    const steps = stepCatalogue().filter((s) => s.ladder && (s.ladder.family === 'k-phrase' || s.ladder.family === 'b-phrase'));
    for (const f of ['k-phrase', 'b-phrase']) {
      const ds = steps.filter((s) => s.ladder!.family === f).sort((a, b) => a.ladder!.level - b.ladder!.level).map((s) => Math.round(s.difficulty));
      expect(ds, f).toEqual([1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]);
    }
    const g = stepCatalogue().filter((s) => s.ladder?.family === 'g-phrase').sort((a, b) => a.ladder!.level - b.ladder!.level).map((s) => s.difficulty);
    expect(g.length).toBe(8);
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeGreaterThanOrEqual(g[i - 1]);
  });
  it('the call can be replayed and slowed', () => {
    const d = generate({ family: 'k-phrase', kind: 'ph-251', key: 4, hands: 'R', option: 0, swing: true });
    const a = callSound(d, 90);
    const b = callSound(d, 90, REPLAY_SLOW);
    expect(a.events.length).toBe(d.listen!.notes.reduce((n, x) => n + x.midi.length, 0));
    expect(b.length).toBeGreaterThan(a.length * 1.4);
  });
});
