// The course and unit openers (src/content/openers.ts, src/ui/Opener.tsx): every course has its film, every station
// stands for something real on the course's path, all copy is Hebrew + English without emoji, and the seen flags
// make each opener play once on its own.
import { describe, expect, it } from 'vitest';
import { COURSES } from '../src/engine/courses';
import { LADDER, SELF_REPORTS, tasteFor } from '../src/engine/courseStart';
import { THEMES, type Section } from '../src/engine/path';
import { ladderFamiliesFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { TOPIC_GEN } from '../src/engine/topicKit';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import {
  COURSE_OPENERS,
  COURSE_UNIT,
  DAY,
  FILM,
  GO,
  START,
  UNIT_THEMES,
  UNIT_TX,
  courseOpenerSeen,
  markCourseOpener,
  markUnitOpener,
  openerLines,
  reportLabel,
  rungOfReport,
  sndEvents,
  themeGlyph,
  unitCopy,
  unitMinutes,
  unitOpenerDue,
  unitOpenerSeen,
} from '../src/content/openers';
import { openerLines as voiceOpenerLines } from '../src/speech/voice/lines';

const SECTIONS: Section[] = ['beginner', 'developing', 'solid', 'advanced'];
const EMOJI = /\p{Extended_Pictographic}/u;

/** Every {he, en} pair inside a value, with its path. */
function pairs(v: unknown, path = ''): { path: string; he: unknown; en: unknown }[] {
  if (!v || typeof v !== 'object') return [];
  const o = v as Record<string, unknown>;
  if ('he' in o && 'en' in o && Object.keys(o).length === 2) return [{ path, he: o.he, en: o.en }];
  return Object.entries(o).flatMap(([k, x]) => pairs(x, `${path}.${k}`));
}

describe('course openers: data', () => {
  it('every course has an opener', () => {
    for (const c of COURSES) expect(COURSE_OPENERS[c.id], c.id).toBeDefined();
    expect(Object.keys(COURSE_OPENERS).sort()).toEqual(COURSES.map((c) => c.id).sort());
  });

  it('every line has Hebrew and English, short and without emoji', () => {
    const all = pairs({ COURSE_OPENERS, UNIT_THEMES, COURSE_UNIT, DAY, FILM, GO, START, UNIT_TX });
    expect(all.length).toBeGreaterThan(400);
    for (const p of all) {
      expect(typeof p.he === 'string' && p.he.trim().length > 0, `${p.path}.he`).toBe(true);
      expect(typeof p.en === 'string' && p.en.trim().length > 0, `${p.path}.en`).toBe(true);
      expect(EMOJI.test(String(p.he)) || EMOJI.test(String(p.en)), `${p.path} has an emoji`).toBe(false);
      // Owner rule: few words, one line.
      expect(String(p.en).split(/\s+/).length, `${p.path}.en is long`).toBeLessThanOrEqual(26);
    }
  });

  it('4–5 stations per course, each standing for something real on the course path', () => {
    for (const c of COURSES) {
      const st = COURSE_OPENERS[c.id].road.stations;
      expect(st.length, c.id).toBeGreaterThanOrEqual(4);
      expect(st.length, c.id).toBeLessThanOrEqual(5);
      const fams = ladderFamiliesFor(c.id, DEFAULT_DRILL_SETTINGS);
      for (const s of st) {
        if (s.ref.theme) expect(THEMES.some((t) => t.id === s.ref.theme), `${c.id} theme ${s.ref.theme}`).toBe(true);
        if (s.ref.family) expect(fams.includes(s.ref.family) || fams.some((f) => f === s.ref.family), `${c.id} family ${s.ref.family} not on the path`).toBe(true);
        if (s.ref.topic) expect(TOPIC_GEN[s.ref.topic], `${c.id} topic ${s.ref.topic}`).toBeDefined();
        expect(!!(s.ref.theme || s.ref.family || s.ref.topic), `${c.id} ${s.name.en}: no reference`).toBe(true);
        const g = s.glyph ?? (s.ref.family ? FAMILY_GLYPH[s.ref.family] : s.ref.topic ? TOPIC_GLYPH[s.ref.topic] : themeGlyph(s.ref.theme));
        expect(g && GLYPHS[g], `${c.id} ${s.name.en}: symbol ${g}`).toBeTruthy();
        expect((s.snd.n?.length ?? 0) + (s.snd.p?.length ?? 0), `${c.id} ${s.name.en}: a sound`).toBeGreaterThan(0);
        expect(sndEvents(s.snd).length, `${c.id} ${s.name.en}: about a second`).toBeLessThanOrEqual(2.2);
      }
    }
  });

  it('the Ear stations follow what a new player meets, unit by unit (lead lessons, tester 2026-11-18)', async () => {
    const { buildPath } = await import('../src/engine/path');
    const { courseInput } = await import('../src/engine/courses');
    const { unitThemeOf } = await import('../src/content/openers');
    await import('../src/engine/topics');
    const base = { track: 'explorer', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-18T10:00:00Z') } as unknown as Parameters<typeof courseInput>[0];
    let facts: Record<string, unknown> = {};
    const met: string[] = [];
    for (let u = 0; u < 8; u++) {
      const v = buildPath({ ...courseInput(base, 'ear'), ladderFamilies: ladderFamiliesFor('ear', DEFAULT_DRILL_SETTINGS), facts } as never);
      const cur = v.units.find((x) => x.status === 'current');
      if (!cur) break;
      const t = unitThemeOf('ear', cur.theme, cur.steps.map((x) => x.step), THEMES);
      if (t && !met.includes(t)) met.push(t);
      const steps = { ...((facts.steps as object) ?? {}) } as Record<string, unknown>;
      for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-18T10:00:00Z' };
      facts = { ...facts, steps, units: [...((facts.units as unknown[]) ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-18T10:00:00Z' }] : [])] };
    }
    const key = (s: (typeof COURSE_OPENERS)['ear']['road']['stations'][number]) => (s.ref.topic === 'basics-highlow' ? 'basics' : s.ref.theme);
    const st = COURSE_OPENERS.ear.road.stations.map(key);
    // Curriculum flow (one new idea per unit, 2026-11-19): the first three stations still match the units; the 4th
    // (home: degrees 1-3-5) now comes after the pulse lessons — the opener's station order is content (flagged).
    expect(met.slice(0, 3)).toEqual(st.slice(0, 3));
  });

  it('hook: four cards with sound; the question demo is complete; one rung line per ladder rung', () => {
    for (const c of COURSES) {
      const d = COURSE_OPENERS[c.id];
      expect(d.hook.cards).toHaveLength(4);
      for (const cd of d.hook.cards) expect(sndEvents(cd.snd).events.length).toBeGreaterThan(0);
      if (d.how.kind === 'choice') {
        expect(d.how.opts).toHaveLength(2);
        expect([0, 1]).toContain(d.how.answer);
      } else {
        expect(d.how.chips?.length).toBeGreaterThan(0);
        for (const st of d.how.steps) if (st.light !== null) expect(st.light).toBeLessThan(d.how.chips!.length);
      }
      expect(d.rungs).toHaveLength(LADDER[c.id].length);
    }
  });

  it('sounds become note / drum events for the app engine', () => {
    const e = sndEvents({ n: [[60, 0, 0.5]], p: [['kick', 0.2]] });
    expect(e.events).toHaveLength(2);
    expect(e.events[1].perc).toBe('kick');
    expect(e.length).toBeCloseTo(0.9);
    expect(sndEvents({ n: [[60, 0, 0.5]], hum: true }).events[0].inst).toBe('hum');
  });

  it('where you start follows the self-report', () => {
    expect(SELF_REPORTS.map(rungOfReport)).toEqual([0, 1, 2]);
    expect(reportLabel('keys', 'bit').en).toBe('I play a bit');
    expect(reportLabel('voice', 'well').he).toBe('שרים טוב');
    expect(reportLabel('ear', 'new').en).toBe('New to this');
  });
});

describe('unit openers: data', () => {
  it('every unit theme has its what / why / goal and a two-pass sound demo', () => {
    for (const t of THEMES) {
      const u = UNIT_THEMES[t.id];
      expect(u, t.id).toBeDefined();
      expect(u.demo).toHaveLength(2);
      for (const p of u.demo) expect(p.ev.length).toBeGreaterThan(0);
      expect(u.feeds).toHaveLength(3);
      for (const f of u.feeds) expect(GLYPHS[f.g], `${t.id} feed ${f.g}`).toBeDefined();
      expect(GLYPHS[themeGlyph(t.id)], t.id).toBeDefined();
    }
  });

  it('playing courses have a unit line and a why for every section; listening courses use the theme', () => {
    for (const c of ['keys', 'guitar', 'bass', 'drums', 'voice'] as const) {
      expect(COURSE_UNIT[c], c).toBeDefined();
      for (const s of SECTIONS) expect(COURSE_UNIT[c]!.why[s].en.length, `${c} ${s}`).toBeGreaterThan(0);
      expect(unitCopy(c, 'home', 'solid').why).toEqual(COURSE_UNIT[c]!.why.solid);
    }
    expect(unitCopy('ear', 'harmony', 'beginner').what).toEqual(UNIT_THEMES.harmony.what);
    expect(unitCopy('jazz', 'colour', 'solid').why).toEqual(UNIT_THEMES.colour.why);
    // An unknown theme falls back to home.
    expect(unitCopy('ear', 'nope', 'beginner').theme).toBe(UNIT_THEMES.home);
  });

  it('rough minutes: about a minute and a half a step, to the nearest five', () => {
    expect(unitMinutes(6)).toBe(10);
    expect(unitMinutes(8)).toBe(10);
    expect(unitMinutes(10)).toBe(15);
    expect(unitMinutes(2)).toBe(5);
  });
});

describe('seen flags', () => {
  const now = '2026-11-18T10:00:00Z';
  it('the course opener is remembered per course, once', () => {
    expect(courseOpenerSeen(undefined, 'ear')).toBe(false);
    const o = markCourseOpener(undefined, 'ear', now);
    expect(courseOpenerSeen(o, 'ear')).toBe(true);
    expect(courseOpenerSeen(o, 'keys')).toBe(false);
    // Marking again keeps the first time (and the same object).
    expect(markCourseOpener(o, 'ear', '2027-01-01T00:00:00Z')).toBe(o);
    const o2 = markUnitOpener(o, 'ear', 'u3', now);
    expect(courseOpenerSeen(o2, 'ear')).toBe(true);
  });

  it('the unit opener plays on the first entry into the current unit only', () => {
    const fresh = { id: 'u2', status: 'current', steps: [{ state: 'open' }, { state: 'open' }] };
    expect(unitOpenerDue(undefined, 'ear', fresh)).toBe(true);
    // Seen: never again on its own (per course: the same unit id in another course is another unit).
    const o = markUnitOpener(undefined, 'ear', 'u2', now);
    expect(unitOpenerSeen(o, 'ear', 'u2')).toBe(true);
    expect(unitOpenerDue(o, 'ear', fresh)).toBe(false);
    expect(unitOpenerDue(o, 'keys', fresh)).toBe(true);
    // A unit already started (an existing player's), a past or a projected unit: no opener.
    expect(unitOpenerDue(undefined, 'ear', { ...fresh, steps: [{ state: 'done', stars: 2 }, { state: 'open' }] })).toBe(false);
    expect(unitOpenerDue(undefined, 'ear', { ...fresh, status: 'past' })).toBe(false);
    expect(unitOpenerDue(undefined, 'ear', { ...fresh, status: 'projected' })).toBe(false);
    // Tested-out steps (✓ by test) are not "started".
    expect(unitOpenerDue(undefined, 'ear', { ...fresh, steps: [{ state: 'tested' }, { state: 'open' }] })).toBe(true);
  });
});

describe('narration', () => {
  it('every English line is in the voice inventory, with every first-lesson title', () => {
    const lines = voiceOpenerLines().map((l) => l.text);
    for (const c of COURSES) {
      for (const s of COURSE_OPENERS[c.id].road.stations) expect(lines).toContain(s.say.en);
      for (const r of SELF_REPORTS) expect(lines).toContain(GO.say(tasteFor(c.id, r).title).en);
    }
    expect(lines).toContain(UNIT_THEMES.home.whatSay.en);
    expect(new Set(lines).size).toBe(lines.length);
    expect(openerLines('he', []).every((l) => /[֐-׿]/.test(l))).toBe(true);
  });
});

describe('a unit opener describes what the unit holds (tester 2026-11-18)', () => {
  it('the lead lesson decides; else the theme most steps belong to; playing courses keep the path theme', async () => {
    const { unitThemeOf, UNIT_THEMES } = await import('../src/content/openers');
    const { THEMES } = await import('../src/engine/path');
    const u1 = [{ id: 'lesson:basics-pitch', sub: 'pitch/higher-lower' }, { id: 'topic:dynamics:1', sub: 'expression/dynamics' }, { id: 'topic:basics-beat:1', sub: 'timing/steady' }];
    expect(unitThemeOf('ear', 'home', u1, THEMES)).toBe('basics');
    expect(UNIT_THEMES.basics.name?.he).toBeTruthy();
    expect(unitThemeOf('ear', 'home', [{ id: 'topic:intervals-all:1', sub: 'intervals/melodic' }, { id: 'topic:x:1', sub: 'intervals/harmonic' }], THEMES)).toBe('steps');
    expect(unitThemeOf('keys', 'home', u1, THEMES)).toBe('home');
    for (const t of Object.values((await import('../src/content/openers')).LEAD_LESSON_THEME)) expect(UNIT_THEMES[t]).toBeTruthy();
  });
});
