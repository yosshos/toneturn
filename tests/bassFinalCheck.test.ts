// Final bass check (docs/research/BASS_FINAL_CHECK.md): how the bass course is wired into the app.
import { describe, expect, it } from 'vitest';
import { courseInput } from '../src/engine/courses';
import { eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { TOPIC_GEN } from '../src/engine/topics';
import type { PlaceQuestion } from '../src/engine/lesson';
import { ladderFamiliesFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { FAMILY_GLYPH, GAME_STEP_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BASS_OPEN, makeRounds, midiHz, roundFor, toneHz } from '../src/engine/tuneUp';
import { voiceOf } from '../src/audio/piano';
import { courseInstrumentOf, neckTuningOf } from '../src/storage/progress';
import { LESSONS, UNITS } from '../src/content/mini/instrument';
import { courseOfResult } from '../src/engine/courseSocial';

const base: PathInput = {
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: null,
  leaveOut: [],
  packs: [],
  plays: [],
  minutes: 10,
  ratings: {} as PathInput['ratings'],
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now: new Date('2026-11-09T10:00:00Z'),
};
const bassSteps = () => stepCatalogue().filter((s) => eligible(s, { ...courseInput(base, 'bass'), ladderFamilies: ladderFamiliesFor('bass', DEFAULT_DRILL_SETTINGS, 'upright') }));

describe('bass path symbols', () => {
  const ids = ladderFamiliesFor('bass', DEFAULT_DRILL_SETTINGS, 'upright');
  it('every bass family (electric and upright) has its own drawn symbol', () => {
    expect(ids.length).toBeGreaterThanOrEqual(21);
    for (const id of ids) {
      expect(FAMILY_GLYPH[id], id).toBeDefined();
      expect(GLYPHS[FAMILY_GLYPH[id]], `${id} → ${FAMILY_GLYPH[id]}`).toBeDefined();
    }
  });
  it('no two kinds of step on the bass path share a symbol', () => {
    const seen = new Map<string, string>();
    const kinds = new Set<string>();
    for (const s of bassSteps()) {
      const key = s.ladder ? `family ${s.ladder.family}` : s.topic ? `topic ${s.topic}` : s.game ? `game ${s.game}` : null;
      if (!key || kinds.has(key)) continue;
      kinds.add(key);
      const g = s.ladder ? FAMILY_GLYPH[s.ladder.family] : s.topic ? TOPIC_GLYPH[s.topic] : GAME_STEP_GLYPH[s.game!];
      expect(g, key).toBeDefined();
      expect(seen.get(g), `${key} and ${seen.get(g)} share '${g}'`).toBeUndefined();
      seen.set(g, key);
    }
    expect(kinds.size).toBeGreaterThan(10);
  });
});

describe('bass path content', () => {
  it('has no guitar topics (open chords, CAGED, drop voicings, guitar scale boxes)', () => {
    const topics = new Set(bassSteps().filter((s) => s.topic).map((s) => s.topic));
    for (const t of ['fret-chords', 'fret-scales', 'fret-notes', 'fret-intervals']) expect(topics.has(t), t).toBe(false);
    expect(topics.has('bass-notes')).toBe(true);
    expect(topics.has('bass-shapes')).toBe(true);
  });
  it('every bass neck item is drawn and graded on the bass', () => {
    for (const t of ['bass-notes', 'bass-shapes'])
      for (let lv = 1; lv <= TOPIC_GEN[t].levels.length; lv++)
        for (let seed = 1; seed <= 25; seed++) {
          const q = TOPIC_GEN[t].gen(seed, lv, `x${seed}`) as PlaceQuestion;
          expect(q.topic, t).toBe(t);
          expect(q.level).toBe(lv);
          expect(q.instrument, `${t} L${lv}`).toBe('bass');
          for (const m of q.target) expect(m >= 28 && m <= 60, `${t} L${lv} note ${m}`).toBe(true);
        }
  });
  it('the guitar keeps its topics, bass levels included', () => {
    const g = stepCatalogue().filter((s) => eligible(s, courseInput(base, 'guitar')));
    expect(g.some((s) => s.topic === 'fret-chords' && s.level === 1)).toBe(true);
  });
  it('the bass topics open with their own quick lesson', () => {
    for (const t of ['bass-notes', 'bass-shapes']) {
      expect(UNITS[`topic:${t}`]).toBe(t);
      expect(LESSONS.find((l) => l.id === t)).toBeDefined();
    }
  });
});

describe('bass in games and screens', () => {
  it('the neck follows the course: bass tuning in the bass course, the guitar tuning elsewhere', () => {
    expect(neckTuningOf({ activeCourse: 'bass', tuning: 'standard' })).toBe('bass');
    expect(neckTuningOf({ activeCourse: 'bass', tuning: 'standard', bassTuning: 'bass5' })).toBe('bass5');
    expect(neckTuningOf({ activeCourse: 'guitar', tuning: 'dropd', bassTuning: 'bass5' })).toBe('dropd');
  });
  it('the course decides the instrument a screen assumes', () => {
    expect(courseInstrumentOf({ activeCourse: 'bass', instrument: 'keys' })).toBe('bass');
    expect(courseInstrumentOf({ activeCourse: 'ear', instrument: 'keys' })).toBe('keys');
  });
  it('tune-up in the bass course tunes the four bass strings, in tune = no beats', () => {
    const rs = makeRounds(7, 12, 'bass');
    expect(new Set(rs.map((r) => r.string))).toEqual(new Set([1, 2, 3, 4]));
    for (const r of rs) {
      expect(r.toneMidi, JSON.stringify(r)).toBe(r.refMidi);
      expect(Math.abs(toneHz(r, -r.detune) - midiHz(r.refMidi))).toBeLessThan(1e-9);
    }
    // the low E: fretted at 5 against the open A
    expect(roundFor(4, 10, 'fret', 'bass')).toMatchObject({ toneMidi: BASS_OPEN[3] + 5, refMidi: BASS_OPEN[2] });
    // the guitar is unchanged
    expect(makeRounds(7).every((r) => r.string >= 1 && r.string <= 6)).toBe(true);
  });
  it('in the bass course unmarked low notes sound on the bass; marked piano and high notes stay piano', () => {
    expect(voiceOf({ midi: 40 }, 'bass')).toBe('bass');
    expect(voiceOf({ midi: 60 }, 'bass')).toBe('bass');
    expect(voiceOf({ midi: 64 }, 'bass')).toBeUndefined();
    expect(voiceOf({ midi: 40, inst: 'piano' }, 'bass')).toBeUndefined();
    expect(voiceOf({ midi: 40 }, null)).toBeUndefined();
    expect(voiceOf({ midi: 40, inst: 'bass' }, null)).toBe('bass');
  });
  it('bass results count for the bass course (league XP, community)', () => {
    const r = (lessonId: string, course?: 'ear' | 'bass') => ({ lessonId, completedAt: '2026-11-09T10:00:00Z', xp: 10, ...(course ? { course } : {}) });
    expect(courseOfResult(r('tech:b-pluck-1'))).toBe('bass');
    expect(courseOfResult(r('tech:b-up-arco-1'))).toBe('bass');
    expect(courseOfResult(r('topic:bass-notes:1'))).toBe('bass');
    expect(courseOfResult(r('topic:bass-shapes:3', 'ear'))).toBe('bass');
  });
});
