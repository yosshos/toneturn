// The voice course (docs/research/VOICE_CURRICULUM.md): placement, families, measured rules.
import { describe, expect, it } from 'vitest';
import { stepCatalogue } from '../src/engine/path';
import { synthDahs, synthLine, swingRatioOf, timeFeel, voiceOnsets, driftOf, feelVerdict } from '../src/engine/voiceTime';
import { gradeSongTake, songBacking, songPlan, voiceSong, songbookAt } from '../src/engine/voiceSongs';
import { VOICE_SONGS } from '../src/content/voiceSongs';
import { SONGBOOK } from '../src/content/songbook';

const vocal = () => stepCatalogue().filter((s) => s.kind === 'vocal');
const step = (ref: string) => vocal().find((s) => s.ladder!.ref === ref)!;

describe('voice path placement (VOICE_CURRICULUM §8, VOICE_LATER)', () => {
  it('Barry Harris L1, harmony L1 and modes L1 no longer sit next to "hold a note" L1', () => {
    const hold = step('1').difficulty;
    expect(step('301').difficulty).toBeGreaterThanOrEqual(hold + 6 * 70);
    expect(step('201').difficulty).toBeGreaterThan(hold);
    expect(step('101').difficulty).toBeGreaterThan(hold);
  });
});

const RANGE = { low: 52, high: 72 };

describe('voice onsets and time feel (F7)', () => {
  const beat = 60 / 100;
  const grid = Array.from({ length: 12 }, (_, k) => 1 + k * beat);
  it('finds every "dah" within a frame', () => {
    const on = voiceOnsets(synthDahs(grid));
    expect(on.length).toBe(12);
    on.forEach((t, k) => expect(Math.abs(t - grid[k])).toBeLessThanOrEqual(0.011));
  });
  it('measures a steady lateness as the mean, after the delay is removed', () => {
    const on = voiceOnsets(synthDahs(grid, 60, { late: 0.13 }));
    const f = timeFeel(on, grid, { latencyMs: 70 });
    expect(f.n).toBe(12);
    expect(f.meanMs).toBeGreaterThanOrEqual(55);
    expect(f.meanMs).toBeLessThanOrEqual(65);
    expect(f.sdMs).toBeLessThan(10);
    expect(feelVerdict(f)).toBe('laid-back');
  });
  it('needs 8 notes before it calls anything laid back', () => {
    expect(feelVerdict({ n: 5, meanMs: 80, sdMs: 10 })).toBe('too-few');
  });
  it('reads the swing ratio of articulated pairs', () => {
    const b = 60 / 120;
    const swung = Array.from({ length: 8 }, (_, k) => [k * b, k * b + (2 / 3) * b]).flat();
    expect(swingRatioOf(voiceOnsets(synthDahs(swung.map((t) => t + 0.5), 60, { len: 0.12 })), b, 8, { t0: 0.5 }).ratio).toBeCloseTo(2, 0);
    const straight = Array.from({ length: 8 }, (_, k) => [k * b, k * b + 0.5 * b]).flat();
    expect(swingRatioOf(voiceOnsets(synthDahs(straight.map((t) => t + 0.5), 60, { len: 0.12 })), b, 8, { t0: 0.5 }).ratio).toBeCloseTo(1, 0);
  });
  it('drift: the last phrase against the first, note error inside each phrase', () => {
    const d = driftOf([0, 5, -5, 20, 30, 25], [0, 0, 0, 1, 1, 1])!;
    expect(d.drift).toBe(25);
    expect(d.medianError).toBe(5);
  });
});

describe('band songs (F13 to F14)', () => {
  it('every voice song and every whole-bar songbook song parses, fits a range and has a chart bar per melody bar', () => {
    const ids = [...VOICE_SONGS.map((s) => s.id), ...SONGBOOK.filter((s) => s.meter >= 2).map((s) => s.id)];
    for (const id of ids) {
      const s = voiceSong(id)!;
      expect(s, id).toBeDefined();
      const p = songPlan(s, RANGE);
      expect(p.chartBars.length, id).toBe(p.bars);
      expect(p.notes.length, id).toBeGreaterThan(3);
      const b = songBacking(p);
      expect(b.events.length, id).toBeGreaterThan(4);
    }
    expect(songbookAt([1, 2]).length).toBeGreaterThan(10);
  });
  it('a clean take scores high on every phrase; a sour phrase is the weakest', () => {
    const p = songPlan(voiceSong('morning-line')!, RANGE);
    const clean = gradeSongTake(synthLine(p.notes), p, { rhythm: true });
    expect(clean.phrases.length).toBe(4);
    for (const ph of clean.phrases) expect(ph.score, `phrase ${ph.i}`).toBeGreaterThan(0.85);
    const sour = gradeSongTake(synthLine(p.notes, { cents: (i) => (p.notes[i].phrase === 2 ? 80 : 0) }), p, { rhythm: true });
    expect(sour.weakest).toBe(2);
    expect(sour.score).toBeLessThan(0.75);
  });
  it('a breath in the middle of a phrase costs the breath part', () => {
    const p = songPlan(voiceSong('slow-harbor')!, RANGE);
    const g = gradeSongTake(synthLine(p.notes, { gapAfter: [0] }), p);
    expect(g.phrases[0].breath).toBeLessThan(1);
    expect(g.phrases[1].breath).toBe(1);
  });
  it('a loop of one phrase is graded on its own clock', () => {
    const p = songPlan(voiceSong('paper-boats')!, RANGE);
    const ph = p.phrases[1];
    const base = ph.fromBar * p.meter * p.beat;
    const notes = p.notes.filter((n) => n.phrase === 1).map((n) => ({ ...n, start: n.start - base }));
    const g = gradeSongTake(synthLine(notes), p, { fromBar: ph.fromBar, toBar: ph.toBar, rhythm: true });
    expect(g.phrases.length).toBe(1);
    expect(g.phrases[0].score).toBeGreaterThan(0.85);
  });
});

import { BARRY_LEVELS, HARMONY_LEVELS, LADDER, MODE_LEVELS, ORNAMENT_LEVELS, SIGHT_LEVELS, itemTargets, type VocalItem } from '../src/engine/vocal';
import { NEW_LEVELS, NEW_LEVEL_NAMES, VOICE_FAMILIES, vocalLevelByRef, voiceItemTags } from '../src/engine/voiceFamilies';
import { gradeMore, simulateMore, MORE_KINDS, breakOf } from '../src/engine/vocalMore';
import { gradeScat, gradeTime } from '../src/engine/voiceGrade';
import { SUB_BY_ID } from '../src/engine/taxonomy';
import { FAMILY_GLYPH, GAME_STEP_GLYPH, LESSON_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { inCourse } from '../src/engine/courses';
import '../src/engine/topics';

describe('the voice families (VOICE_CURRICULUM §5, §9)', () => {
  it('every old level is re-homed exactly once, by number — none renumbered, none lost', () => {
    const old = [...LADDER.map((_, i) => i + 1), ...MODE_LEVELS.map((_, i) => 101 + i), ...HARMONY_LEVELS.map((_, i) => 201 + i), ...BARRY_LEVELS.map((_, i) => 301 + i), ...SIGHT_LEVELS.map((_, i) => 401 + i), ...ORNAMENT_LEVELS.map((_, i) => 501 + i)];
    const all = VOICE_FAMILIES.flatMap((f) => f.refs);
    for (const n of old) expect(all.filter((x) => x === n).length, `level ${n}`).toBe(1);
    expect(new Set(all).size).toBe(all.length);
    for (const n of all) expect(vocalLevelByRef(n), `level ${n}`).toBeDefined();
  });
  // + the first steps (AUDIT-CONTENT-THEORY §ז.2).
  it('15 families + Barry Harris + the first steps, each with its own symbol on the voice path; every step of the path has one', () => {
    expect(VOICE_FAMILIES.length).toBe(17);
    const glyphs = VOICE_FAMILIES.map((f) => FAMILY_GLYPH[f.id]);
    for (const g of glyphs) expect(GLYPHS[g], g).toBeDefined();
    const steps = stepCatalogue().filter((s) => inCourse(s, 'voice'));
    const bySource = new Map<string, string>();
    for (const s of steps) {
      // Licks / transcription steps (SPEC-LICKS-TRANSCRIPTION): one symbol per game, shared by its levels.
      const src = s.ladder ? `f:${s.ladder.family}` : s.topic ? `t:${s.topic}` : s.lesson ? `l:${s.lesson}` : s.game ? `g:${s.game}` : s.id;
      const g = s.ladder ? FAMILY_GLYPH[s.ladder.family] : s.topic ? TOPIC_GLYPH[s.topic] : s.lesson ? LESSON_GLYPH[s.lesson] : s.game ? GAME_STEP_GLYPH[s.game] : undefined;
      expect(g, src).toBeDefined();
      bySource.set(src, g!);
    }
    const vals = [...bySource.values()];
    expect(new Set(vals).size, JSON.stringify([...bySource])).toBe(vals.length);
  });
  it('new levels: unique item ids, a name in Hebrew and English (no English words in the Hebrew), ≥ 1 item', () => {
    const ids = NEW_LEVELS.flatMap((l) => l.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of NEW_LEVELS) {
      expect(l.items.length, String(l.level)).toBeGreaterThan(0);
      const nm = NEW_LEVEL_NAMES[l.level];
      expect(nm, String(l.level)).toBeDefined();
      expect(/[a-z]{2,}/i.test(nm.he), nm.he).toBe(false);
    }
  });
  it('rating tags use real sub-skills', () => {
    for (const l of NEW_LEVELS) for (const vi of l.items) for (const t of voiceItemTags(l.level, vi).tags) expect(SUB_BY_ID[t.sub], `${l.level} ${t.sub}`).toBeDefined();
  });
  it('stages: Barry Harris last, songs, breath and pitch first', () => {
    expect(VOICE_FAMILIES[VOICE_FAMILIES.length - 1].id).toBe('v-barry');
    expect(VOICE_FAMILIES.slice(0, 3).map((f) => f.id)).toEqual(['v-songs', 'v-breath', 'v-pitch']);
  });
});

describe('further kinds (vocalMore): a clean simulated take passes, a bad one does not', () => {
  const R = { low: 50, high: 74 };
  for (const l of NEW_LEVELS)
    for (const vi of l.items.filter((x) => MORE_KINDS.includes(x.kind)))
      it(`${vi.id} (${vi.kind})`, () => {
        const fr = simulateMore(vi, itemTargets(vi, R))!;
        const g = gradeMore(vi, fr, R);
        expect(g.unclear, vi.id).toBe(false);
        expect(g.score, `${vi.id} ${JSON.stringify(g.metrics.map((m) => [m.key, m.value, Math.round(m.score * 100)]))}`).toBeGreaterThanOrEqual(l.pass);
      });
  it('the break detector: a smooth siren has none, a cracked one has one', () => {
    const smooth = simulateMore({ id: 'x', kind: 'siren', level: 801, seconds: 5, reference: 'before', at: [0.1, 0.9], difficulty: 1 }, [52, 72])!;
    expect(breakOf(smooth).breaks).toBe(0);
    const cracked = smooth.map((f, i) => (i > 50 && i < 54 ? { ...f, hz: null, confidence: 0 } : i >= 54 && i < 100 && f.hz ? { ...f, hz: f.hz * 2 ** (3 / 12) } : f));
    expect(breakOf(cracked).breaks).toBeGreaterThanOrEqual(1);
  });
});

describe('timed kinds (voiceGrade)', () => {
  const item = (n: number, k = 0) => vocalLevelByRef(n)!.items[k];
  const at = (it: VocalItem, shift = 0, beats?: number[]) => (beats ?? it.time!.hits).map((h) => h * (60 / it.time!.bpm) + shift);
  it('on the click: right on passes, a steady 70 ms lag fails "on" but passes "behind"', () => {
    const on = item(1105, 0);
    const behind = item(1105, 1);
    expect(gradeTime(on, at(on)).grade.score).toBeGreaterThan(0.85);
    expect(gradeTime(on, at(on, 0.07)).grade.score).toBeLessThan(gradeTime(on, at(on)).grade.score);
    expect(gradeTime(behind, at(behind, 0.07)).grade.score).toBeGreaterThan(0.8);
    expect(gradeTime(behind, at(behind)).grade.score).toBeLessThan(0.6);
  });
  it('swing: long-short pairs pass, straight eighths do not', () => {
    const sw = item(1104, 0);
    const b = 60 / sw.time!.bpm;
    const straight = Array.from({ length: 8 }, (_, k) => [k * b, k * b + b / 2]).flat();
    expect(gradeTime(sw, at(sw)).grade.score).toBeGreaterThan(0.8);
    expect(gradeTime(sw, straight).grade.score).toBeLessThan(0.6);
  });
  it('back-phrasing: late start, target caught', () => {
    const bk = item(1106, 0);
    const b = 60 / bk.time!.bpm;
    const w = bk.time!.written!;
    const late = w.map((x, i) => (i < w.length - 1 ? x * b + 0.7 * b : x * b));
    expect(gradeTime(bk, late).grade.score).toBeGreaterThan(0.8);
    expect(gradeTime(bk, w.map((x) => x * b)).grade.score).toBeLessThan(0.7);
  });
  it('the inner clock: steady through the silence passes; drifting 150 ms late fails', () => {
    const ck = item(1107, 0);
    const b = 60 / ck.time!.bpm;
    expect(gradeTime(ck, at(ck)).grade.score).toBeGreaterThan(0.85);
    const drift = ck.time!.hits.map((h) => h * b + (h >= 16 ? Math.min(1, (h - 16) / 16) * 0.15 : 0));
    expect(gradeTime(ck, drift).grade.score).toBeLessThan(0.75);
  });
  it('call and response: the copied rhythm passes', () => {
    const c = item(1501, 0);
    expect(gradeTime(c, at(c)).grade.score).toBeGreaterThan(0.85);
  });
  it('scat guide tones: 3rds and 7ths pass, roots do not', () => {
    const gi = item(1502, 0);
    const b = 60 / gi.scat!.bpm;
    const mk = (pcs: number[]) => synthLine(pcs.map((pc, k) => ({ midi: 60 + pc, start: k * 2 * b, dur: 2 * b * 0.9 })));
    // Dm7 G7 C C (twice), two half notes a bar: guide tones F/C, F/B, E/B …; the roots D, G, C do not count.
    const guide = [5, 0, 5, -1, 4, -1, 4, 4];
    expect(gradeScat(gi, mk([...guide, ...guide]), 0).grade.score).toBeGreaterThan(0.8);
    const roots = [2, 2, 7, 7, 0, 0, 0, 0];
    expect(gradeScat(gi, mk([...roots, ...roots]), 0).grade.score).toBeLessThan(0.3);
  });
});

import { probeStarts } from '../src/engine/voiceFamilies';
import { withLadderFacts } from '../src/engine/ladderFacts';

describe('the voice placement probe (§8)', () => {
  it('a clear pass moves a family one or two levels on; a weak take moves nothing; jazz only after everything passed', () => {
    expect(probeStarts({ hold: 0.5, echo: 0.6, time: 0.4, song: 0.5 })).toEqual({});
    const pop = probeStarts({ hold: 0.9, echo: 0.9, time: 0.9, song: 0.9 });
    expect(pop['v-songs']).toBe(2);
    expect(pop['v-scat']).toBeUndefined();
    const jazz = probeStarts({ hold: 0.9, echo: 0.9, time: 0.9, song: 0.9, guide: 0.9 });
    expect(jazz['v-scat']).toBe(3);
    expect(Math.max(...Object.values(jazz))).toBeLessThanOrEqual(4);
  });
  it('levels before the probed start are ✓ by test on the path (open to practise), never "done"', () => {
    const f = withLadderFacts({}, { families: ['v-songs'], items: {}, order: 'fifths-up' as never, start: { 'v-songs': 3 } as never, vocalPassed: [], at: '2026-11-11T10:00:00Z' });
    expect(f.tests?.['vocal:1301']).toBeDefined();
    expect(f.tests?.['vocal:1302']).toBeDefined();
    expect(f.tests?.['vocal:1303']).toBeUndefined();
    expect(f.steps?.['vocal:1301']).toBeUndefined();
  });
});
