import { describe, expect, it } from 'vitest';
import { MidiInput, type DrumHitEvent } from '../src/speech/midi';
import { calibrateVel, hatState, inDynBand, openness, pedalRange, slowOutput, velBand, voiceOf, wizardDone, wizardHit, wizardSkip, wizardStart, WIZARD_PADS, type KitProfile } from '../src/engine/drumKit';
import { courseInput, courseOf, COURSES, COURSE_AREAS, inCourse } from '../src/engine/courses';
import { buildPath, eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor, techLevel } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';

describe('MIDI drum mode (DRUMS_CURRICULUM §3.5)', () => {
  const kitInput = (kit: KitProfile = { preset: 'gm', map: {} }) => {
    const m = new MidiInput();
    m.setOptions({ octave: 1, drums: true, kit });
    const notes: number[] = [];
    const hits: DrumHitEvent[] = [];
    m.onNote((n, on) => on && notes.push(n));
    m.onHit((h) => hits.push(h));
    return { m, notes, hits };
  };
  it('raw notes: no octave shift; velocity and the voice on each hit; note-offs never make a hit', () => {
    const { m, notes, hits } = kitInput();
    m.message([0x99, 36, 100], 10);
    m.message([0x89, 36, 0], 20);
    m.message([0x99, 38, 64], 30);
    expect(notes).toEqual([36, 38]);
    expect(hits.map((h) => [h.voice, h.vel, h.at])).toEqual([
      ['kick', 100, 10],
      ['snare', 64, 30],
    ]);
  });
  it('the keyboard mode still shifts by octaves', () => {
    const m = new MidiInput();
    m.setOptions({ octave: 1 });
    const notes: number[] = [];
    m.onNote((n, on) => on && notes.push(n));
    m.message([0x90, 60, 100], 0);
    expect(notes).toEqual([72]);
  });
  it('CC4 openness is kept and attached to each hit; it decides open / closed on a one-note hat', () => {
    const { m, hits } = kitInput();
    m.message([0x99, 42, 90], 0); // no CC4 seen yet: the note decides
    expect(hits[0]).toMatchObject({ voice: 'hihat', open: null, hat: 'closed' });
    m.message([0xb9, 4, 0], 5); // pedal up (GM range: 127 closed, 0 open)
    m.message([0x99, 42, 90], 10);
    expect(hits[1]).toMatchObject({ voice: 'hhOpen', open: 1, hat: 'open' });
    m.message([0xb9, 4, 64], 15);
    m.message([0x99, 42, 90], 20);
    expect(hits[2].hat).toBe('half');
    expect(hits[2].voice).toBe('hihat');
    m.message([0xb9, 4, 127], 25);
    m.message([0x99, 46, 90], 30); // open-hat note with the pedal down: closed
    expect(hits[3]).toMatchObject({ voice: 'hihat', hat: 'closed' });
    expect(m.cc4).toBe(127);
  });
  it('chokes (poly pressure 0xA0) reach choke listeners; CC4 still reaches CC listeners', () => {
    const { m } = kitInput();
    const chokes: number[][] = [];
    const ccs: number[][] = [];
    m.onChoke((n, p) => chokes.push([n, p]));
    m.onCC((c, v) => ccs.push([c, v]));
    m.message([0xa9, 49, 127], 0);
    m.message([0xb9, 4, 30], 1);
    expect(chokes).toEqual([[49, 127]]);
    expect(ccs).toEqual([[4, 30]]);
  });
  it('a learned kit map wins over the preset and GM; presets add brand notes', () => {
    const { m, hits } = kitInput({ preset: 'roland', map: { 40: 'tom1' } });
    m.message([0x99, 40, 80], 0);
    m.message([0x99, 22, 80], 1); // Roland hat edge
    m.message([0x99, 99, 80], 2); // unmapped
    expect(hits.map((h) => h.voice)).toEqual(['tom1', 'hihat', null]);
    expect(voiceOf(83, { preset: 'yamaha', map: {} })).toBe('hhPedal');
    expect(voiceOf(83, { preset: 'gm', map: {} })).toBe(null);
  });
  it('optional cross-talk filter drops a soft neighbour within 3 ms', () => {
    const { m, hits } = kitInput();
    m.setOptions({ crosstalk: true });
    m.message([0x99, 38, 120], 100);
    m.message([0x99, 48, 20], 102);
    m.message([0x99, 48, 90], 110);
    expect(hits.map((h) => h.voice)).toEqual(['snare', 'tom1']);
  });
});

describe('hi-hat and velocity model', () => {
  it('openness from the learned pedal range; closed / half / open thresholds', () => {
    const kit: KitProfile = { preset: 'gm', map: {}, cc4: { closed: 90, open: 10 } };
    expect(openness(90, kit)).toBe(0);
    expect(openness(10, kit)).toBe(1);
    expect(openness(50, kit)).toBeCloseTo(0.5);
    expect([hatState(0.1), hatState(0.4), hatState(0.8)]).toEqual(['closed', 'half', 'open']);
  });
  it('velocity bands are relative to the calibration, never absolute', () => {
    const r = { soft: 30, loud: 90 };
    expect(velBand(32, r)).toBe('ghost');
    expect(velBand(85, r)).toBe('accent');
    expect(velBand(60, r)).toBe('normal');
    expect(velBand(60, { soft: 60, loud: 127 })).toBe('ghost');
    expect(inDynBand(35, 'p', r)).toBe(true);
    expect(inDynBand(88, 'f', r)).toBe(true);
    expect(inDynBand(60, 'mf', r)).toBe(true);
    expect(inDynBand(88, 'p', r)).toBe(false);
  });
  it('calibration: medians of soft and loud strokes, refused when they do not separate', () => {
    expect(calibrateVel([30, 32, 28, 31, 29, 33, 30, 30], [100, 104, 98, 101, 99, 103, 100, 102])).toEqual({ soft: 30, loud: 101 });
    expect(calibrateVel([60, 62, 61, 60], [64, 66, 65, 63])).toBeNull();
    expect(pedalRange([120, 122, 121], [5, 3, 4])).toEqual({ closed: 121, open: 4 });
    expect(pedalRange([60], [55])).toBeNull();
    expect(slowOutput(180)).toBe(true);
    expect(slowOutput(20, 0.02)).toBe(false);
  });
});

describe('kit mapping wizard', () => {
  it('two hits on the same note learn each pad in order', () => {
    let s = wizardStart();
    s = wizardHit(s, 40, 90);
    s = wizardHit(s, 40, 90);
    expect(s.map).toEqual({ 40: 'snare' });
    expect(s.step).toBe(1);
    s = wizardHit(s, 35, 90);
    s = wizardHit(s, 36, 90); // two different notes: start over on this pad
    expect(s.note).toBe('again');
    s = wizardHit(s, 36, 90);
    expect(s.map[36]).toBe('kick');
  });
  it('a note already learned is refused, except the open hat on the hat note (one note + CC4)', () => {
    let s = wizardStart();
    for (const n of [38, 38, 36, 36, 42, 42]) s = wizardHit(s, n, 80);
    expect(WIZARD_PADS[s.step].voice).toBe('hhOpen');
    const taken = wizardHit(s, 36, 80);
    expect(taken.note).toBe('taken');
    expect(taken.step).toBe(s.step);
    s = wizardHit(s, 42, 80);
    expect(s.hatByCc).toBe(true);
    expect(WIZARD_PADS[s.step].voice).toBe('hhPedal');
  });
  it('optional pads can be skipped, required ones cannot; the wizard ends after the last pad', () => {
    let s = wizardStart();
    expect(wizardSkip(s)).toBe(s);
    for (const n of [38, 38, 36, 36, 42, 42]) s = wizardHit(s, n, 80);
    s = wizardSkip(wizardSkip(wizardSkip(s))); // open hat, pedal, ride
    for (const n of [49, 49, 48, 48]) s = wizardHit(s, n, 80);
    s = wizardSkip(s); // mid tom
    s = wizardHit(wizardHit(s, 43, 80), 43, 80);
    expect(wizardDone(s)).toBe(true);
    expect(Object.values(s.map).sort()).toEqual(['crash', 'hihat', 'kick', 'snare', 'tom1', 'tom3']);
    expect(wizardHit(s, 50, 80)).toBe(s);
  });
});

describe('the drums course and its path', () => {
  const base: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: ['instrument'], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-09T10:00:00Z') };
  it('is a course with its own colour, glyph and areas', () => {
    const c = courseOf('drums');
    expect(c.id).toBe('drums');
    expect(c.name.he).toBe('תופים');
    expect(c.glyph).toBe('drums');
    expect(new Set(COURSES.map((x) => x.color)).size).toBeGreaterThan(4);
    expect(COURSE_AREAS.drums).toEqual(['instrument', 'time']);
    const inp = courseInput(base, 'drums');
    expect(inp.plays).toEqual(['drums']);
    expect(inp.leaveOut).not.toContain('instrument');
  });
  it('drum levels are path steps of the drums course only, each a "tech:" step rated as drum technique', () => {
    const tech = stepCatalogue().filter((s) => s.ladder?.instrument === 'drums');
    expect(tech.length).toBe(91);
    for (const s of tech) {
      expect(s.id.startsWith('tech:d-')).toBe(true);
      expect(s.sub).toBe('instrument/drum-tech');
      expect(inCourse(s, 'drums')).toBe(true);
      expect(inCourse(s, 'bass')).toBe(false);
      expect(techLevel(s.ladder!.ref)).toBeDefined();
    }
    expect(ladderFamiliesFor('drums', DEFAULT_DRILL_SETTINGS)).toEqual(['d-strokes', 'd-rolls', 'd-diddles', 'd-time', 'd-rock', 'd-fills', 'd-read', 'd-funk', 'd-shuffle', 'd-indep', 'd-mideast', 'd-feet', 'd-ear', 'd-jazz', 'd-latin']);
    expect(ladderFamiliesFor('bass', DEFAULT_DRILL_SETTINGS).some((f) => f.startsWith('d-'))).toBe(false);
  });
  it('the drums path starts at level 1 of the first families; a practice pad leaves out the kit levels', () => {
    const fams = ladderFamiliesFor('drums', DEFAULT_DRILL_SETTINGS);
    const inp = { ...courseInput(base, 'drums'), ladderFamilies: fams };
    const v = buildPath(inp);
    const u = v.units.find((x) => x.status === 'current')!;
    const tech = u.steps.filter((x) => x.step.kind === 'tech');
    expect(tech.length).toBeGreaterThanOrEqual(2);
    for (const x of tech) {
      expect(x.step.ladder!.level).toBe(1);
      expect(x.step.ladder!.family.startsWith('d-')).toBe(true);
    }
    const hidden = ladderHiddenFor('drums', undefined, true);
    expect(hidden).toContain('d-rock-1');
    expect(hidden).toContain('d-read-5');
    expect(hidden).not.toContain('d-read-1');
    const micInp = { ...inp, ladderFamilies: ladderFamiliesFor('drums', DEFAULT_DRILL_SETTINGS, undefined, true), ladderHidden: hidden };
    expect(stepCatalogue().filter((s) => s.ladder && eligible(s, micInp)).every((s) => !hidden.includes(s.ladder!.ref) && !s.ladder!.family.match(/d-(rock|fills)/))).toBe(true);
  });
});
