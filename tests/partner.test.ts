// Partner theme layer (docs/SPEC-PARTNER-PITCH.md §3.2) and the depth page's live counts (§3.3).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACTIVE_PARTNER, allowedCourses, copy, courseAllowed, defaultCourse, partnerById, themeCss, visibleCourses, wordmark } from '../src/partner';
import { OPENSTUDIO } from '../src/partner/openstudio';
import { depthCounts, linkResolves, scaleMatrix } from '../src/partner/counts';
import { DEPTH_MAPS } from '../src/partner/depthMaps';
import { COURSES } from '../src/engine/courses';

const lum = (hex: string) => {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('no partner: the normal app is unchanged', () => {
  it('builds without VITE_PARTNER', () => {
    expect(ACTIVE_PARTNER).toBeNull();
    expect(partnerById(undefined)).toBeNull();
    expect(partnerById('nope')).toBeNull();
  });
  it('offers every course, in order, with Ear as the fallback', () => {
    expect(visibleCourses().map((c) => c.id)).toEqual(['ear', 'voice', 'keys', 'guitar', 'bass', 'drums', 'jazz']);
    expect(visibleCourses()).toBe(COURSES);
    expect(defaultCourse()).toBe('ear');
    expect(allowedCourses(['voice', 'drums'])).toEqual(['voice', 'drums']);
    expect(COURSES.every((c) => courseAllowed(c.id))).toBe(true);
  });
  it('adds no theme CSS and keeps the app copy and wordmark', () => {
    expect(themeCss()).toBe('');
    expect(wordmark('en')).toBe('The 7th Sense');
    expect(copy('ob.slogan', 'en', { en: 'Hear. Understand. Perform.', he: 'x' })).toBe('Hear. Understand. Perform.');
  });
  it('keeps the v2 light tokens (snapshot)', () => {
    const css = readFileSync(new URL('../src/v2.css', import.meta.url), 'utf8');
    const start = css.indexOf(':root,');
    const block = css.slice(start, css.indexOf(":root[dir='ltr']", start));
    expect(start).toBeGreaterThan(-1);
    const tokens = Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
    expect(tokens).toMatchSnapshot();
  });
});

describe('openstudio config', () => {
  it('limits courses to keys and guitar', () => {
    expect(partnerById('openstudio')).toBe(OPENSTUDIO);
    expect(visibleCourses(OPENSTUDIO).map((c) => c.id)).toEqual(['keys', 'guitar']);
    expect(defaultCourse(OPENSTUDIO)).toBe('keys');
    expect(allowedCourses(['ear', 'voice'], OPENSTUDIO)).toEqual(['keys']);
    expect(allowedCourses(['ear', 'guitar'], OPENSTUDIO)).toEqual(['guitar']);
    expect(courseAllowed('drums', OPENSTUDIO)).toBe(false);
  });
  it('uses the teacher frame, its wordmark and copy, and themes light and dark', () => {
    expect(OPENSTUDIO.mascot).toBe('teacher-frame');
    expect(wordmark('en', OPENSTUDIO)).not.toBe('The 7th Sense');
    const css = themeCss(OPENSTUDIO);
    expect(css).toContain(":root[data-partner='openstudio'][data-theme='light']");
    expect(css).toContain(":root[data-partner='openstudio'][data-theme='dark']");
    expect(css).not.toContain('contrast');
  });
  it('keeps text readable (WCAG AA)', () => {
    const l = OPENSTUDIO.theme.light;
    const d = OPENSTUDIO.theme.dark;
    expect(contrast(l['--ink']!, l['--bg']!)).toBeGreaterThan(7);
    expect(contrast(l['--ink-dim']!, l['--bg']!)).toBeGreaterThan(4.5);
    expect(contrast(l['--accent']!, l['--accent-ink']!)).toBeGreaterThan(4.5);
    expect(contrast(d['--ink']!, d['--bg']!)).toBeGreaterThan(7);
    expect(contrast(d['--ink-dim']!, d['--card']!)).toBeGreaterThan(4.5);
    expect(contrast(d['--accent']!, d['--accent-ink']!)).toBeGreaterThan(4.5);
  });
  it('maps every course row to real families and topics, public titles only, no teacher names', () => {
    for (const r of OPENSTUDIO.courseMap) {
      expect(r.links.length).toBeGreaterThan(0);
      for (const l of r.links) expect(linkResolves(l), `${r.course} → ${l.id}`).toBe(true);
    }
    expect(JSON.stringify(OPENSTUDIO)).not.toMatch(/Maness|Martin|Echols|Siskind|logo/i);
  });
});

describe('depth page counts (live)', () => {
  it('are non-zero and add up', () => {
    const c = depthCounts();
    expect(c.instruments.map((x) => x.id)).toEqual(['piano', 'guitar', 'bass', 'drums', 'voice']);
    for (const x of c.instruments) expect(x.levels).toBeGreaterThan(0);
    expect(c.levels).toBe(c.instruments.reduce((n, x) => n + x.levels, 0));
    expect(c.items).toBeGreaterThan(c.levels);
    expect(c.drills).toBeGreaterThan(c.items);
    expect(c.topics).toBeGreaterThan(50);
    expect(c.lessons).toBeGreaterThan(50);
    expect(c.ruleCards).toBeGreaterThan(10);
    expect(c.twelveKeyShare).toBeGreaterThan(0.3);
    expect(c.twelveKeyShare).toBeLessThanOrEqual(1);
  });
  it('every map link opens something real', () => {
    for (const m of DEPTH_MAPS) for (const r of m.rows) for (const l of r.links) expect(linkResolves(l), `${m.id} → ${l.kind}:${l.id}`).toBe(true);
  });
  it('the scale matrix reads the catalogue', () => {
    const m = scaleMatrix();
    expect(m.rows.length).toBeGreaterThan(10);
    expect(m.covered).toBeGreaterThan(0);
    expect(m.covered).toBeLessThanOrEqual(m.required);
  });
});
