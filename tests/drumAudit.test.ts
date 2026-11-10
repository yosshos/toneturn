// DRUMS_AUDIT (2026-11-09): realistic takes (human jitter, velocity noise) at every level's target tempo, rudiment
// sticking (PAS), groove placement, reading durations, and the engraving rules of the percussion staff.
import { describe, expect, it } from 'vitest';
import { drumFamilies, type DrumLevelDef } from '../src/engine/drills/drums';
import { analyzeDrumTake, DRUM_TIERS, drumWindow, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { levelDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { beamBeats, dotted, restsOf } from '../src/engine/drumNotation';
import type { Drill } from '../src/engine/drills/types';
import { BADGES, badgeInCourse } from '../src/engine/badges';
import { courseSetKinds } from '../src/engine/courseSocial';
import { dailyQuests } from '../src/engine/quests';
import { stepCatalogue } from '../src/engine/path';
import { inCourse } from '../src/engine/courses';

const FAMS = drumFamilies();
const all = (): { lv: DrumLevelDef; d: Drill }[] => FAMS.flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').map((d) => ({ lv, d }))));
const gen = (family: string, kind: string, option: number) => generate({ family: family as never, kind, option, key: 0, hands: 'RL', instrument: 'drums' });

/** Seeded normal noise. */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
/** A human take: timing jitter `sd` ms, velocities in their bands with a little spread. */
function humanHits(d: Drill, bpm: number, sd: number, seed = 7): DrumTakeHit[] {
  const g = noise(seed);
  return d.notes.flatMap((n) => {
    const base = n.ghost ? 34 : n.accent ? 116 : n.dyn === 'p' ? 44 : n.dyn === 'f' ? 114 : 78;
    const j = g() * sd;
    // Flams / drags: grace hits 25 ms apart before the stroke (their gap jitters by 2 ms), soft.
    const graces: DrumTakeHit[] = Array.from({ length: n.grace ?? 0 }, (_, k) => ({ voice: n.voice ?? 'snare', on: expTimeMs(d, n.beat, bpm) + j - (25 + g() * 2) * ((n.grace ?? 0) - k), vel: 40 }));
    return [...graces, {
      voice: n.voice ?? 'snare',
      on: expTimeMs(d, n.beat, bpm) + j,
      vel: Math.max(1, Math.min(127, Math.round(base + g() * (n.ghost ? 1.5 : 3)))),
      open: n.voice === 'hhOpen' ? 1 : 0,
      hat: n.voice === 'hhOpen' ? 'open' : n.voice === 'hihat' ? 'closed' : null,
    } as DrumTakeHit];
  });
}

describe('drum analysis with human takes', () => {
  it('a steady human take (jitter = 45 % of the tier SD) is clean at every level target tempo', () => {
    const bad: string[] = [];
    for (const { lv, d } of all()) {
      const bpm = lv.tempo![1];
      const sd = 0.45 * DRUM_TIERS[d.drum!.tier].sd;
      for (const seed of [1, 2, 3]) {
        const m = analyzeDrumTake(d, bpm, humanHits(d, bpm, sd, seed));
        if (m.verdict !== 'clean') bad.push(`${d.itemId}@${bpm} s${seed}: ${m.drum!.missed.join(',')} (win ${m.drum!.windowMs})`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('a sloppy take (jitter = 2 × the tier SD) is never clean', () => {
    for (const { lv, d } of all()) {
      const bpm = lv.tempo![0];
      const m = analyzeDrumTake(d, bpm, humanHits(d, bpm, 2 * DRUM_TIERS[d.drum!.tier].sd, 5));
      expect(m.verdict, d.itemId).not.toBe('clean');
    }
  });
  it('the hit window never drops below what the SD rule allows (fast sextuplets stay fair) nor reaches half a gap', () => {
    const seven = gen('d-rolls', '5:stroke4', 1);
    const w = drumWindow(seven, 110);
    const ioi = 60000 / 110 / 6;
    expect(w).toBeGreaterThanOrEqual(1.6 * DRUM_TIERS[2].sd - 1e-6);
    expect(w).toBeLessThan(0.4 * ioi);
  });
});

describe('rudiments follow the PAS stickings', () => {
  const sticking = (d: Drill) => d.notes.map((n) => n.hand).join('');
  it('single-stroke seven alternates all seven strokes, accent on the 7th', () => {
    const d = gen('d-rolls', '5:stroke4', 1);
    expect(sticking(d).slice(0, 14)).toBe('RLRLRLRLRLRLRL');
    expect(d.notes[6].accent).toBe(true);
  });
  it('single-stroke four: RLRL with the accent on the 4th, which is an 8th (no overlap)', () => {
    const d = gen('d-rolls', '5:stroke4', 0);
    expect(sticking(d).slice(0, 8)).toBe('RLRLLRLR');
    expect(d.notes[3].accent && d.notes[3].dur).toBe(0.5);
    for (let i = 1; i < d.notes.length; i++) expect(d.notes[i - 1].beat + d.notes[i - 1].dur).toBeLessThanOrEqual(d.notes[i].beat + 1e-5);
  });
  it('5-, 7- and 9-stroke rolls release on the hand after the last double', () => {
    const groups = (d: Drill, n: number) => sticking(d).slice(0, n);
    expect(groups(gen('d-rolls', '6:roll', 0), 10)).toBe('RRLLRLLRRL');
    expect(groups(gen('d-rolls', '6:roll', 1), 14)).toBe('RRLLRRLRRLLRRL');
    expect(groups(gen('d-rolls', '6:roll', 2), 18)).toBe('RRLLRRLLRLLRRLLRRL');
    for (const o of [0, 1, 2]) {
      const d = gen('d-rolls', '6:roll', o);
      for (let i = 1; i < d.notes.length; i++) expect(d.notes[i - 1].beat + d.notes[i - 1].dur).toBeLessThanOrEqual(d.notes[i].beat + 1e-5);
    }
  });
  it('paradiddles: single, inverted, reverse, double, paradiddle-diddle', () => {
    expect(sticking(gen('d-diddles', '1:para', 0)).slice(0, 8)).toBe('RLRRLRLL');
    expect(sticking(gen('d-diddles', '3:inverted', 0)).slice(0, 8)).toBe('RLLRLRRL');
    expect(sticking(gen('d-diddles', '3:inverted', 1)).slice(0, 8)).toBe('RRLRLLRL');
    expect(sticking(gen('d-diddles', '4:double', 0)).slice(0, 12)).toBe('RLRLRRLRLRLL');
    expect(sticking(gen('d-diddles', '4:double', 1)).slice(0, 6)).toBe('RLRRLL');
  });
});

describe('grooves put the voices where the title says', () => {
  const at = (d: Drill, voice: string, bar = 0) => d.notes.filter((n) => n.voice === voice && n.beat >= bar * 4 && n.beat < bar * 4 + 4).map((n) => n.beat - bar * 4);
  it('every rock / pop groove has the backbeat (2 and 4) or the half-time 3', () => {
    for (const lv of FAMS.find((f) => f.id === 'd-rock')!.levels)
      for (const d of levelDrills(lv, 'fifths-up')) {
        const sn = at(d, 'snare', 1);
        if (/Half-time/.test(d.title.en)) expect(sn).toEqual([2]);
        else if (/Double-time/.test(d.title.en)) expect(sn).toEqual([0.5, 1.5, 2.5, 3.5]);
        else expect(sn, d.itemId).toEqual(expect.arrayContaining([1, 3]));
      }
  });
  it('kick variations land where the title says', () => {
    const want = [[0, 2, 2.5], [0, 1.5, 2], [0, 0.5, 2], [0, 2, 3.5]];
    want.forEach((k, o) => expect(at(gen('d-rock', '2:kick', o), 'kick')).toEqual(k));
  });
  it('the two-handed 16th hat keeps the alternation: the snare on 2 and 4 is the right hand', () => {
    const d = gen('d-rock', '5:hat16x2', 0);
    const hands = d.notes.filter((n) => n.voice !== 'kick' && n.beat < 4).map((n) => n.hand).join('');
    expect(hands).toBe('RLRLRLRLRLRLRLRL');
  });
});

describe('snare reading engraving', () => {
  it('reading L1, L3, L4: no written note crosses its beat; L2 dotted quarters only on the beat', () => {
    for (const lvN of [1, 3, 4]) {
      const lv = FAMS.find((f) => f.id === 'd-read')!.levels[lvN - 1];
      for (const d of levelDrills(lv, 'fifths-up')) for (const n of d.notes) expect(Math.floor(n.beat + 1e-6), d.itemId).toBe(Math.ceil(n.beat + n.dur - 1e-6) - 1);
    }
    const l2 = FAMS.find((f) => f.id === 'd-read')!.levels[1];
    for (const d of levelDrills(l2, 'fifths-up')) for (const n of d.notes) if (n.dur > 1) expect(Number.isInteger(n.beat)).toBe(true);
  });
  it('sticking: R on the beat and "&", L on "e" / "a" (16th levels); L on the "&" in 8th levels', () => {
    for (const d of levelDrills(FAMS.find((f) => f.id === 'd-read')!.levels[2], 'fifths-up'))
      for (const n of d.notes) {
        const q = Math.round((n.beat % 1) * 4);
        expect(n.hand).toBe(q % 2 ? 'L' : 'R');
      }
    for (const d of levelDrills(FAMS.find((f) => f.id === 'd-read')!.levels[0], 'fifths-up')) for (const n of d.notes) expect(n.hand).toBe(n.beat % 1 ? 'L' : 'R');
  });
  it('beams: 16ths get two beams, 8th + two 16ths a partial second beam, dotted 8th + 16th a stub, quarters none', () => {
    const b = (xs: [number, number][]) => beamBeats(xs.map(([beat, dur]) => ({ beat, dur })));
    expect(b([[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25]])[0].second).toEqual([[0, 1], [1, 2], [2, 3]]);
    expect(b([[0, 0.5], [0.5, 0.25], [0.75, 0.25]])[0].second).toEqual([[1, 2]]);
    const dot = b([[0, 0.75], [0.75, 0.25]])[0];
    expect(dot.second).toEqual([]);
    expect(dot.stubs).toEqual([{ at: 1, dir: -1 }]);
    expect(dotted(0.75)).toBe(true);
    expect(b([[0, 1], [1, 1]])).toEqual([]);
    expect(b([[0.5, 0.5]])[0].flag).toBe(1);
    // A syncopated quarter on the "&" is not beamed to the 8th before it.
    expect(b([[0, 0.5], [0.5, 1]])[0].flag).toBe(1);
  });
  it('tuplets: 3 over 8th triplets, 6 over sextuplets, 3 over only the 16th-triplet half', () => {
    const b = (xs: number[], dur: number) => beamBeats(xs.map((beat) => ({ beat, dur })))[0].tuplet;
    expect(b([0, 1 / 3, 2 / 3], 1 / 3)).toEqual({ n: 3, from: 0, to: 2 });
    expect(b([0, 1, 2, 3, 4, 5].map((k) => k / 6), 1 / 6)).toEqual({ n: 6, from: 0, to: 5 });
    expect(beamBeats([{ beat: 0, dur: 1 / 6 }, { beat: 1 / 6, dur: 1 / 6 }, { beat: 1 / 3, dur: 1 / 6 }, { beat: 0.5, dur: 0.5 }])[0].tuplet).toEqual({ n: 3, from: 0, to: 2 });
    expect(b([0, 0.5], 0.5)).toBeUndefined();
  });
  it('rests: quarter for an empty beat, 8th before an "&", 16th before an "e"', () => {
    const r = restsOf([{ beat: 0.5, dur: 0.5 }, { beat: 2.25, dur: 0.25 }, { beat: 2.5, dur: 0.5 }], 0, 4);
    expect(r).toEqual([{ beat: 0, kind: '8' }, { beat: 1, kind: 'q' }, { beat: 2, kind: '16' }, { beat: 3, kind: 'q' }]);
    // A dotted quarter covers the next beat's first half.
    expect(restsOf([{ beat: 0, dur: 1.5 }, { beat: 1.5, dur: 0.5 }], 0, 2)).toEqual([]);
  });
});

describe('the drums course across the app (everything connects)', () => {
  it('drum families have their own badges (milestones) in the drums course; instrument area badges show there too', () => {
    const drum = BADGES.filter((b) => b.id.startsWith('tech:drums:'));
    expect(new Set(drum.map((b) => b.group)).size).toBe(FAMS.length);
    for (const b of drum) expect(b.course).toBe('drums');
    expect(BADGES.some((b) => b.cat === 'area' && b.group === 'instrument' && badgeInCourse(b, 'drums'))).toBe(true);
    expect(drum.every((b) => !badgeInCourse(b, 'keys'))).toBe(true);
  });
  it('duels in the drums course offer rhythm only', () => {
    expect(courseSetKinds('drums', ['mixed', 'chords', 'intervals', 'beat', 'echo'] as never[])).toEqual(['beat']);
  });
  it('the rhythm quest counts measured drum takes (timing share); the technique quest wears the sticks', () => {
    const at = '2026-11-09T10:00:00Z';
    const ev = { at, skill: 'instrument', sub: 'instrument/drum-tech', correct: true, score: 0.9, tags: [{ skill: 'timing', sub: 'timing/steady', w: 0.3 }] };
    const days = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'];
    const qs = days.flatMap((day) => dailyQuests({ day, course: 'drums', events: Array(5).fill({ ...ev, at: `${day}T10:00:00Z` }) as never[], sessions: [], stepsToday: 0, minutesToday: 0 }));
    const tech = qs.find((x) => x.id === 'tech3');
    if (tech) expect(tech.glyph).toBe('sticks');
    const r = qs.find((x) => x.id === 'rhythm');
    expect(r).toBeDefined();
    expect(r!.now).toBe(5);
  });
  it('kit reading (drum-read) is a drums course topic, not an ear one', () => {
    const dr = stepCatalogue().filter((s) => s.topic === 'drum-read');
    expect(dr.length).toBeGreaterThan(0);
    for (const s of dr) {
      expect(inCourse(s, 'drums')).toBe(true);
      expect(inCourse(s, 'ear')).toBe(false);
    }
  });
});

describe('v2 families: funk, shuffle, independence, Middle-Eastern, feet', () => {
  const at = (d: Drill, voice: string, bar = 0) => d.notes.filter((n) => n.voice === voice && n.beat >= bar * 4 - 1e-6 && n.beat < bar * 4 + 4 - 1e-6).map((n) => Math.round((n.beat - bar * 4) * 1000) / 1000);
  it('funk L1: accents on 2 and 4 (right hand), ghosts on "e" / "a" (left hand); a practice pad can play it', () => {
    const d = gen('d-funk', '1:ghosts', 0);
    expect(d.drum?.mic).toBe(true);
    expect(d.notes.filter((n) => n.accent).map((n) => n.beat % 4)).toEqual(Array(8).fill(0).map((_, i) => (i % 2 ? 3 : 1)));
    for (const n of d.notes) expect(n.hand).toBe(n.accent ? 'R' : 'L');
    expect(d.notes.filter((n) => n.ghost).every((n) => [0.25, 0.75].includes(n.beat % 1))).toBe(true);
    expect(d.goal.drum?.ghost).toBe(0.85);
  });
  it('shuffle: the skip note sits on the third triplet; the double shuffle accents 2 and 4 with the left hand', () => {
    const s = gen('d-shuffle', '2:shuffle', 0);
    expect(at(s, 'hihat')).toEqual([0, 0.667, 1, 1.667, 2, 2.667, 3, 3.667]);
    expect(at(s, 'snare')).toEqual([1, 3]);
    const dbl = gen('d-shuffle', '4:double', 0);
    expect(dbl.notes.filter((n) => n.voice === 'snare' && n.accent && n.beat < 4).map((n) => n.beat)).toEqual([1, 3]);
    expect(dbl.notes.filter((n) => n.voice === 'snare').every((n) => n.hand === 'L')).toBe(true);
  });
  it('Middle-Eastern: maqsum D T . T D . T ., baladi D D . T D . T ., sa\'idi D T . D D . T ., malfuf D . . T . . T .', () => {
    const m = gen('d-mideast', '1:maqsum', 1);
    expect(at(m, 'kick')).toEqual([0, 2]);
    expect(at(m, 'snare')).toEqual([0.5, 1.5, 3]);
    const b = gen('d-mideast', '2:baladi', 0);
    expect(at(b, 'kick')).toEqual([0, 0.5, 2]);
    expect(at(b, 'snare')).toEqual([1.5, 3]);
    const sa = gen('d-mideast', '2:baladi', 1);
    expect(at(sa, 'kick')).toEqual([0, 1.5, 2]);
    expect(at(sa, 'snare')).toEqual([0.5, 3]);
    const mf = gen('d-mideast', '1:maqsum', 0);
    expect(at(mf, 'snare')).toEqual([0.75, 1.5, 2.75, 3.5]);
    // Ka: the soft left hand fills the empty 8ths; tak stays the right hand.
    const ka = gen('d-mideast', '3:ka', 0);
    for (const n of ka.notes.filter((x) => x.voice === 'snare')) expect(n.hand).toBe(n.ghost ? 'L' : 'R');
    expect(ka.notes.filter((n) => n.ghost && n.beat < 4).map((n) => n.beat)).toEqual([1, 2.5, 3.5]);
  });
  it('independence lines are generated, deterministic, start every bar on 1 and differ between variants', () => {
    const a = gen('d-indep', '2:kick8', 0);
    expect(gen('d-indep', '2:kick8', 0).notes).toEqual(a.notes);
    const kicks = (d: Drill) => d.notes.filter((n) => n.voice === 'kick').map((n) => n.beat).join(',');
    expect(new Set([0, 1, 2, 3].map((o) => kicks(gen('d-indep', '2:kick8', o)))).size).toBeGreaterThan(2);
    for (const lvKind of ['2:kick8', '3:kick16'])
      for (let b = 0; b < 16; b += 4) expect(gen('d-indep', lvKind, 1).notes.some((n) => n.voice === 'kick' && n.beat === b)).toBe(true);
    expect(gen('d-indep', '4:snare', 0).show).toBe('staff');
  });
  it('feet: the hi-hat foot chick on 2 and 4 is the left foot', () => {
    const d = gen('d-feet', '1:chick', 0);
    const p = d.notes.filter((n) => n.voice === 'hhPedal');
    expect(p.filter((n) => n.beat < 4).map((n) => n.beat)).toEqual([1, 3]);
    expect(p.every((n) => n.limb === 'LF')).toBe(true);
  });
  it('v2 families have their own path glyph and come after the basics on the path', () => {
    const steps = stepCatalogue().filter((s) => s.ladder?.instrument === 'drums');
    const diff = (ref: string) => steps.find((s) => s.ladder!.ref === ref)!.difficulty;
    expect(diff('d-funk-1')).toBeGreaterThan(diff('d-rock-2'));
    expect(diff('d-mideast-1')).toBeGreaterThan(diff('d-strokes-1'));
  });
});
