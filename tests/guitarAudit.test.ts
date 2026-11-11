// Guitar course audit (docs/research/GUITAR_AUDIT.md): playability, duplicate items, copy, and the course wiring.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog, MAX_FRET } from '../src/engine/drills/guitar';
import { levelDrills, levelStars } from '../src/engine/drills/plan';
import { eligible, stepCatalogue } from '../src/engine/path';
import { dailyQuests } from '../src/engine/quests';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import type { Drill, ItemState } from '../src/engine/drills/types';
import { courseInstrument, noteViewsOf, playedShift } from '../src/ui/noteViewPref';

const ALL12 = Array.from({ length: 12 }, (_, i) => i);
const GUITAR = guitarCatalog().filter((f) => f.instruments.includes('guitar') && !f.retired);

function levelItems(): { level: string; drills: Drill[] }[] {
  return GUITAR.flatMap((f) => f.levels.map((l) => ({ level: l.id, drills: (Array.isArray(l.keys) ? l.keys : ALL12).flatMap((k) => l.specs.map((s) => generate({ ...s, key: k }))) })));
}
const LEVELS = levelItems();

describe('guitar audit: content', () => {
  it(`every guitar item fits a ${MAX_FRET}-fret neck`, () => {
    const bad: string[] = [];
    for (const { drills } of LEVELS) for (const d of drills) for (const n of d.notes) if ((n.fret ?? 0) > MAX_FRET && bad.length < 10) bad.push(`${d.itemId} ${n.string}:${n.fret}`);
    expect(bad).toEqual([]);
  });

  it('no two items of a level play the same notes (one-string octave, stretches, harmonics)', () => {
    const bad: string[] = [];
    for (const { level, drills } of LEVELS) {
      const seen = new Map<string, string>();
      for (const d of drills) {
        const sig = d.notes.map((n) => `${n.beat}:${n.string}:${n.fret}:${n.technique ?? ''}:${n.stroke ?? ''}:${n.finger ?? ''}:${n.bendCents ?? ''}:${n.accent ? 1 : 0}`).join(' ');
        const prev = seen.get(sig);
        if (prev && prev !== d.itemId) bad.push(`${level}: ${prev} = ${d.itemId}`);
        seen.set(sig, d.itemId);
      }
    }
    expect(bad).toEqual([]);
  });

  it('natural harmonics are one item per option, whatever the level key (levelDrills keeps it once)', () => {
    const lv = GUITAR.find((f) => f.id === 'g-lead')!.levels[0];
    const ds = levelDrills(lv, 'fifths-up');
    const harm = ds.filter((d) => d.spec.kind === 'harmonics');
    expect(harm.length).toBe(3);
    expect(new Set(ds.map((d) => d.itemId)).size).toBe(ds.length);
    // Three passed harmonics items do not count as three keys of the level.
    const pass = (d: Drill): ItemState => ({ itemId: d.itemId, family: d.spec.family, key: d.spec.key, hands: d.spec.hands, cleanBpm: 80, goalBpm: 80, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '', history: [], passLog: ['2026-11-01', '2026-11-02', '2026-11-03'].map((at) => ({ at, bpm: 300 })) });
    const items = Object.fromEntries(harm.slice(0, 1).map((d) => [d.itemId, pass(d)]));
    expect(levelStars(lv, items, 'fifths-up')).toBe(2);
  });

  it('the one-string scale, tapped arpeggios, slides and double stops stay low on the neck', () => {
    const one = generate({ family: 'g-scales', kind: 'one-string', key: 6, hands: 'R', position: 3 });
    expect(one.notes.every((n) => n.string === 4)).toBe(true);
    expect(one.title.he).toContain('מיתר 4');
    const g = generate({ family: 'g-scales', kind: 'one-string', key: 7, hands: 'R', position: 3 });
    expect(g.notes[0].fret).toBe(0);
    expect(Math.max(...g.notes.map((n) => n.fret!))).toBe(12);
    const tap = generate({ family: 'g-legato', kind: 'tap-arp', key: 9, hands: 'R' });
    expect(Math.max(...tap.notes.map((n) => n.fret!))).toBeLessThanOrEqual(MAX_FRET);
    const ds = generate({ family: 'g-lead', kind: 'double-stops', key: 7, hands: 'R', option: 0 });
    expect(ds.notes.filter((n) => n.beat === 0).map((n) => n.fret)).toEqual([0, 0]);
  });

  it('Hebrew titles use Hebrew words (no "major", "minor", "alternating")', () => {
    const bad = new Set<string>();
    for (const { drills } of LEVELS) for (const d of drills) if (/\b(major|minor|alternating|string|fret)\b/i.test(d.title.he)) bad.add(d.title.he);
    expect([...bad]).toEqual([]);
  });

  it('family names in Hebrew are hand-neutral (left-handed players fret with the right hand)', () => {
    for (const f of GUITAR) expect(f.title.he).not.toMatch(/יד (שמאל|ימין)/);
  });
});

describe('guitar audit: course wiring', () => {
  const inp = (course: 'guitar' | 'bass', plays: string[]) => ({ leaveOut: [], packs: [], plays, track: 'hobby' as const, course, ladderFamilies: [] });
  it('the guitar path has no bass-only topic levels, the bass path no guitar-only shapes', () => {
    const cat = stepCatalogue().filter((s) => !s.ladder);
    const g = cat.filter((s) => eligible(s, inp('guitar', ['guitar']))).map((s) => s.id);
    const b = cat.filter((s) => eligible(s, inp('bass', ['bass']))).map((s) => s.id);
    expect(g).toContain('topic:fret-chords:1');
    expect(g).not.toContain('topic:fret-chords:6');
    expect(g).not.toContain('topic:fret-scales:5');
    // The bass lines live in the bass course's own topic (final bass check), not in the guitar topics.
    expect(b.some((id) => id.startsWith('topic:bass-shapes:'))).toBe(true);
    expect(b).not.toContain('topic:fret-chords:6');
    expect(b).not.toContain('topic:fret-chords:1');
    expect(b).not.toContain('topic:fret-scales:1');
  });

  it('every guitar path step has its own symbol', () => {
    const fams = GUITAR.map((f) => f.id);
    const topics = [...new Set(stepCatalogue().filter((s) => !s.ladder && s.topic && eligible(s, inp('guitar', ['guitar']))).map((s) => s.topic!))].filter((t) => TOPIC_GLYPH[t]);
    const glyphs = [...fams.map((f) => FAMILY_GLYPH[f]), ...topics.map((t) => TOPIC_GLYPH[t])];
    for (const k of glyphs) expect(GLYPHS[k], k).toBeDefined();
    const dup = glyphs.filter((k, i) => glyphs.indexOf(k) !== i);
    expect(dup).toEqual([]);
  });

  it("the technique quest shows the course's instrument", () => {
    const d = { day: '2026-11-15', course: 'guitar' as const, events: [], sessions: [], stepsToday: 0, minutesToday: 0 };
    const q = dailyQuests(d as never).find((x) => x.id === 'tech3');
    expect(q?.glyph).toBe('guitar');
  });
});

describe('guitar audit: playing into the app in the guitar course', () => {
  it('notes show on the neck, not a piano keyboard, in the guitar course', () => {
    expect(noteViewsOf({ activeCourse: 'guitar' })).toEqual(['tab', 'staff']);
    expect(noteViewsOf({ activeCourse: 'guitar', noteViews: ['keyboard', 'tab'] })).toEqual(['tab']);
    expect(noteViewsOf({ activeCourse: 'keys' })).toEqual(['keyboard', 'staff']);
  });
  it('the course decides the instrument; a heard note on the neck is never moved an octave', () => {
    expect(courseInstrument({ activeCourse: 'guitar' })).toBe('guitar');
    expect(courseInstrument({ activeCourse: 'ear', instrument: 'keys' })).toBe('keys');
    // Low E heard by the microphone = 40 = fretboard.noteAt(standard, 6, 0): no shift on the neck.
    expect(playedShift('guitar', 'neck')).toBe(0);
    expect(playedShift('guitar', 'staff')).toBe(12);
    expect(playedShift('keys', 'staff')).toBe(0);
  });
});
