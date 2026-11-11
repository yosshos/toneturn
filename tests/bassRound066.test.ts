// 0.66 bass round (docs/research/BASS_FINAL_CHECK.md, "0.66"): the bass's own neck topics (intervals, scale boxes),
// position reading, fills and target notes, picking-hand patterns, the 6-string 3-notes-per-string level, the per-course
// level, the bass family names and the bass course out of beta.
import { describe, expect, it } from 'vitest';
import { courseInput, courseOf } from '../src/engine/courses';
import { eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { TOPIC_GEN } from '../src/engine/topics';
import type { ChoiceQuestion, PlaceQuestion } from '../src/engine/lesson';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { families, levelDrills, shownFamilies } from '../src/engine/drills/plan';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { ruleCheck } from '../src/engine/drills/bassAnalyze';
import { generate } from '../src/engine/drills/generate';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { defaultTuning, noteAt, tuningById } from '../src/engine/fretboard';
import { bassPentaBox } from '../src/engine/topicsInstrument';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { LESSONS, UNITS } from '../src/content/mini/instrument';
import { hasShortName, shortName } from '../src/engine/pathNames';
import { courseLevel, courseLevels, courseOfResult } from '../src/engine/courseSocial';
import { foldRatings, type RatingEvent } from '../src/engine/rating';
import { drillEvents } from '../src/engine/drills/events';
import type { Drill, TakeMetrics } from '../src/engine/drills/types';

const base: PathInput = {
  track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10,
  ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-10T10:00:00Z'),
};
const BASS = defaultTuning('bass');
const lv = (id: string) => families('bass').flatMap((f) => f.levels).find((l) => l.id === id)!;
const levelsOf = (fam: string) => families('bass').find((f) => f.id === fam)!.levels;

describe('bass neck topics (0.66)', () => {
  it('interval shapes: the target is the asked interval from the dot, on the bass', () => {
    const want = [[12, -12], [3, 4, 5, 7], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [15, 16], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]];
    for (let level = 1; level <= 5; level++)
      for (let seed = 1; seed <= 40; seed++) {
        const q = TOPIC_GEN['bass-intervals'].gen(seed, level, `x${seed}`) as PlaceQuestion;
        expect(q.instrument).toBe('bass');
        const dot = q.neck!.dots![0];
        const from = noteAt(BASS, dot.str, dot.fret);
        expect(want[level - 1], `L${level} seed ${seed}`).toContain(q.target[0] - from);
        // The asked string holds the answer on the neck shown (frets 0–14).
        if (q.neck!.onString) {
          const f = q.target[0] - BASS.open[q.neck!.onString - 1];
          expect(f >= 0 && f <= 14, `L${level} seed ${seed} fret ${f}`).toBe(true);
        }
      }
  });
  it('10ths go from the E string to the G string; octaves two strings over', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q = TOPIC_GEN['bass-intervals'].gen(seed, 4, 'x') as PlaceQuestion;
      expect(q.neck!.dots![0].str).toBe(4);
      expect(q.neck!.onString).toBe(1);
      const o = TOPIC_GEN['bass-intervals'].gen(seed, 1, 'x') as PlaceQuestion;
      expect(Math.abs(o.neck!.onString! - o.neck!.dots![0].str)).toBe(2);
    }
  });
  it('scale boxes: the major scale from E/A, box 1, and five different boxes', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q1 = TOPIC_GEN['bass-scales'].gen(seed, 1, 'x') as PlaceQuestion;
      expect(q1.target.map((m) => m - q1.target[0])).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
      expect([4, 3]).toContain(q1.neck!.dots![0].str);
      const q2 = TOPIC_GEN['bass-scales'].gen(seed, 2, 'x') as PlaceQuestion;
      const pcs = new Set(q2.target.map((m) => (m - q2.target[0] + 120) % 12));
      expect([...pcs].sort((a, b) => a - b)).toEqual([0, 3, 5, 7, 10]);
      const q3 = TOPIC_GEN['bass-scales'].gen(seed, 3, 'x') as ChoiceQuestion;
      expect(q3.choices).toEqual(['1', '2', '3', '4', '5']);
    }
    // Every box fits one hand (≤ 5 frets) and the five shapes differ.
    const shapes = new Set<string>();
    for (let b = 1; b <= 5; b++) {
      const ps = bassPentaBox(b, 9);
      const fs = ps.map((p) => p.fret);
      expect(Math.max(...fs) - Math.min(...fs)).toBeLessThanOrEqual(4);
      shapes.add(ps.map((p) => `${p.str}:${p.fret - Math.min(...fs)}`).join(','));
    }
    expect(shapes.size).toBe(5);
  });
  it('are on the bass path (not the guitar one), with a quick lesson, a short name and their own symbol', () => {
    const bass = stepCatalogue().filter((s) => eligible(s, { ...courseInput(base, 'bass'), ladderFamilies: ladderFamiliesFor('bass', DEFAULT_DRILL_SETTINGS) }));
    const guitar = stepCatalogue().filter((s) => eligible(s, courseInput(base, 'guitar')));
    for (const t of ['bass-intervals', 'bass-scales']) {
      expect(bass.some((s) => s.topic === t), t).toBe(true);
      expect(guitar.some((s) => s.topic === t), t).toBe(false);
      expect(UNITS[`topic:${t}`]).toBe(t);
      expect(LESSONS.find((l) => l.id === t)).toBeDefined();
      expect(hasShortName(t)).toBe(true);
      expect(shortName(t, { en: '', he: '' }, 'he').length).toBeLessThan(14);
      expect(GLYPHS[TOPIC_GLYPH[t]]).toBeDefined();
      expect(courseOfResult({ lessonId: `topic:${t}:1`, completedAt: '2026-11-10T10:00:00Z', xp: 5 })).toBe('bass');
    }
  });
});

describe('new bass families and levels (0.66)', () => {
  it('position reading and fills / target notes are bass families with symbols, on the path after the basics', () => {
    const ids = ladderFamiliesFor('bass', DEFAULT_DRILL_SETTINGS);
    for (const f of ['b-posread', 'b-impro']) {
      expect(ids).toContain(f);
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(courseOfResult({ lessonId: `tech:${f}-1`, completedAt: '2026-11-10T10:00:00Z', xp: 4 })).toBe('bass');
    }
    const d = (id: string) => stepCatalogue().find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('b-impro-1')).toBeGreaterThan(d('b-chord-3'));
    expect(d('b-posread-1')).toBeGreaterThan(d('b-read-1'));
  });
  it('every new level builds in every key, on the neck (frets 0–21)', () => {
    const ids = [...levelsOf('b-posread'), ...levelsOf('b-impro').filter((l) => l.level <= 6)].map((l) => l.id).concat(['b-pluck-10', 'b-pluck-11', 'b-pluck-12', 'b-pick-6', 'b-pick-7', 'b-pick-8']);
    for (const id of ids)
      for (const d of levelDrills(lv(id), 'fifths-up')) {
        expect(d.notes.length, id).toBeGreaterThan(8);
        for (const n of d.notes) expect((n.fret ?? 0) >= 0 && (n.fret ?? 0) <= 21, `${id} ${d.title.en}`).toBe(true);
        expect(d.title.he).not.toMatch(/[a-z]{4,}/);
      }
  });
  it('every fill / solo model line keeps its own rules: scale tones, and the target on every change', () => {
    // Levels 1–6 (0.66); 7–14 (BASS_NICHE_PLAN) have their own rules (downbeats, passing notes): tests/bassNiche.test.ts.
    for (const l of levelsOf('b-impro').filter((x) => x.level <= 6))
      for (const d of levelDrills(l, 'fifths-up')) {
        const r = d.goal.bass!.rules!;
        expect(r.kind).toBe('target');
        const rep = ruleCheck(r.kind, r.chart, d.notes.map((n) => ({ pitch: n.pitch, beat: n.beat })), d.meter || 4);
        expect(rep.validShare, `${l.id} ${d.title.en}: ${rep.labels.join(' ')}`).toBe(1);
        expect(rep.beat1Ct, `${l.id} ${d.title.en}`).toBe(1);
        expect(d.show).toBe('chart');
        expect(d.drums).toBeDefined();
      }
  });
  it('a solo that misses its targets is marked down (measured, not just played)', () => {
    const d = levelDrills(lv('b-impro-5'), 'fifths-up')[0];
    const beat = 60000 / 100;
    const right = d.notes.map((n) => ({ pitch: n.pitch, on: n.beat * beat, off: (n.beat + n.dur) * beat - 20, vel: 80 }));
    // The same rhythm, but every chord's first note a root (not the 3rd or 7th the level asks for).
    const roots = d.notes.map((n, i) => {
      const r = d.goal.bass!.rules!.chart[Math.floor(n.beat / 4) % 12];
      return Number.isInteger(n.beat) && n.beat % 4 === 0 ? { ...right[i], pitch: n.pitch - ((n.pitch - r.root) % 12 + 12) % 12 } : right[i];
    });
    const good = analyzeGuitarTake(d, 100, right);
    const bad = analyzeGuitarTake(d, 100, roots);
    expect(good.rules!.beat1Ct).toBe(1);
    expect(bad.rules!.beat1Ct).toBeLessThan(0.2);
    expect(bad.accuracy).toBeLessThan(good.accuracy);
  });
  it('position reading: the low range goes below the staff, the upper register above it; one position stays in its window', () => {
    const low = levelDrills(lv('b-posread-1'), 'fifths-up');
    for (const d of low) expect(d.show).toBe('staff');
    // Sounding below G1 (written below the bass staff's bottom line G2).
    expect(low.some((d) => d.notes.some((n) => n.pitch < 31))).toBe(true);
    // Sounding above C3 (written above the staff's top line A3).
    expect(levelDrills(lv('b-posread-6'), 'fifths-up').every((d) => d.notes.some((n) => n.pitch > 48))).toBe(true);
    for (const d of levelDrills(lv('b-posread-3'), 'fifths-up')) {
      const fs = d.notes.map((n) => n.fret!).filter((f) => f > 0);
      expect(Math.min(...fs)).toBeGreaterThanOrEqual(5);
      expect(Math.max(...fs)).toBeLessThanOrEqual(8);
    }
  });
  it('picking-hand patterns: alternate strokes over the skip, economy strokes over the sweep, three fingers', () => {
    const skip = levelDrills(lv('b-pick-6'), 'fifths-up')[0];
    skip.notes.slice(0, 8).forEach((n, i) => expect(n.stroke).toBe(i % 2 ? 'U' : 'D'));
    expect(Math.abs(skip.notes[0].string! - skip.notes[1].string!)).toBe(2);
    const sweep = levelDrills(lv('b-pick-7'), 'fifths-up')[0];
    sweep.notes.slice(1, 8).forEach((n, i) => {
      const prev = sweep.notes[i];
      if (n.string! < prev.string!) expect(n.stroke, `note ${i + 1}`).toBe('D');
      if (n.string! > prev.string!) expect(n.stroke, `note ${i + 1}`).toBe('U');
    });
    const ima = levelDrills(lv('b-pluck-11'), 'fifths-up')[0];
    expect(new Set(ima.notes.slice(0, 3).map((n) => n.stroke))).toEqual(new Set(['i', 'm', 'a']));
    const thumb = levelDrills(lv('b-pluck-12'), 'fifths-up')[0];
    expect(thumb.notes.filter((n) => n.stroke === 'p').every((n) => n.string! >= 3)).toBe(true);
  });
  it('three notes per string only on a 6-string: hidden elsewhere, 18 notes up over six strings', () => {
    expect(ladderHiddenFor('bass', 'bass')).toContain('b-scale-11');
    expect(ladderHiddenFor('bass', 'bass5')).toContain('b-scale-11');
    expect(ladderHiddenFor('bass', 'bass6')).not.toContain('b-scale-11');
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass', bassTuning: 'bass6' }).find((f) => f.id === 'b-scale')!.levels.map((l) => l.id)).toContain('b-scale-11');
    for (const d of levelDrills(lv('b-scale-11'), 'fifths-up')) {
      expect(d.spec.tuning).toBe('bass6');
      const up = d.notes.slice(0, 18);
      for (let s = 0; s < 6; s++) expect(new Set(up.slice(s * 3, s * 3 + 3).map((n) => n.string)).size).toBe(1);
      expect(new Set(up.map((n) => n.string)).size).toBe(6);
      for (let i = 1; i < 18; i++) expect(up[i].pitch).toBeGreaterThan(up[i - 1].pitch);
      expect(tuningById('bass6').open.length).toBe(6);
    }
  });
});

describe('per-course level (0.66)', () => {
  const take = (family: string, instrument: 'bass' | 'drums' | 'guitar', i: number, at: string): RatingEvent[] => {
    const drill = generate({ family: family as Drill['spec']['family'], kind: family === 'b-pluck' ? 'open' : family === 'd-strokes' ? 'singles' : 'chromatic', key: 4, hands: 'R', instrument, tempo: 120 } as Drill['spec']);
    const m = { verdict: 'clean', nps: 8, accuracy: 1, cvR: 0.02, cvL: null } as unknown as TakeMetrics;
    return drillEvents(drill, m, at, `s${family}`, i);
  };
  it('drum takes move the drums level, never the bass level', () => {
    const bassEv = Array.from({ length: 10 }, (_, i) => take('b-pluck', 'bass', i, `2026-11-0${1 + (i % 8)}T10:00:0${i}Z`));
    const r0 = foldRatings(bassEv.flat());
    const bass0 = courseLevel('bass', r0, ['ear', 'bass', 'drums']);
    expect(bass0.r).not.toBeNull();
    expect(courseLevel('drums', r0, ['ear', 'bass', 'drums']).r).toBeNull();
    // Lots of failed drum takes: the shared instrument rating drops, the bass level does not.
    const drumEv: RatingEvent[] = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, skill: 'instrument', difficulty: 900, correct: false, score: 0, tags: [{ skill: 'instrument', sub: 'instrument/drum-tech', w: 1 }], at: `2026-11-09T10:00:${String(i).padStart(2, '0')}Z` }));
    const r1 = foldRatings([...bassEv.flat(), ...drumEv]);
    expect(courseLevel('bass', r1, ['ear', 'bass', 'drums']).r).toBe(bass0.r);
    expect(courseLevel('drums', r1, ['ear', 'bass', 'drums']).r!).toBeLessThan(bass0.r!);
    expect(r1.instrument!.r).toBeLessThan(r0.instrument!.r);
    expect(Object.keys(courseLevels(['ear', 'bass', 'drums'], r1))).toEqual(expect.arrayContaining(['bass', 'drums']));
  });
  it('old data without per-instrument ratings: the shared rating stands for the one instrument course only', () => {
    const legacy = { instrument: { r: 1200, n: 20, correct: 15, recent: [] } };
    expect(courseLevel('bass', legacy, ['ear', 'bass']).r).not.toBeNull();
    expect(courseLevel('bass', legacy, ['ear', 'bass', 'drums']).r).toBeNull();
    expect(courseLevel('drums', legacy, ['ear', 'bass', 'drums']).r).toBeNull();
    // Once a sub is rated, the shared rating no longer stands in.
    const mixed = { ...legacy, 'instrument/drum-tech': { r: 900, n: 3, correct: 1, recent: [] } };
    expect(courseLevel('bass', mixed, ['ear', 'bass']).r).toBeNull();
    expect(courseLevel('drums', mixed, ['ear', 'drums']).r).toBe(900);
  });
});

describe('names and the beta flag (0.66)', () => {
  it('bass family names say what the hand does, not which hand', () => {
    const t = (id: string) => families('bass').find((f) => f.id === id)!.title.he;
    expect(t('b-pluck')).toBe('פריטה');
    expect(t('b-fret')).toBe('יד לוחצת');
    for (const f of families('bass')) for (const l of [f.title.he, ...f.levels.map((x) => x.title.he)]) expect(l, l).not.toMatch(/יד (ימין|שמאל)/);
  });
  it('the bass course is out of beta; drums stays beta', () => {
    expect(courseOf('bass').beta).toBeFalsy();
    expect(courseOf('drums').beta).toBe(true);
  });
  it('guitar harmonics are called הרמוניקים', () => {
    const titles = families('guitar').flatMap((f) => f.levels.flatMap((l) => [l.title.he, ...levelDrills(l, 'fifths-up').map((d) => d.title.he)]));
    expect(titles.some((x) => x.includes('הרמוניקים'))).toBe(true);
    expect(titles.filter((x) => x.includes('הרמוניות'))).toEqual([]);
  });
});
