// AUDIT-6 Stage A (2026-11-15): the shape of every course path — levels at their real difficulty, no holes, enough
// steps in each band, the jazz beginner band real jazz, the catalogue independent of the games' modules.
import { describe, expect, it } from 'vitest';
import { courseInput, inCourse, isJazzStep, type CourseId } from '../src/engine/courses';
import { JAZZ_OPEN_AT } from '../src/engine/jazzFold';
import type { RepCourse } from '../src/engine/repertoire';
import { buildPath, eligible, stepCatalogue, PATH_CAP, type PathFacts, type PathInput, type PathStep } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { G, LEVEL_PLACEMENT, monotoneFamily } from '../src/engine/levelPlacement';
import { TOPIC_GEN } from '../src/engine/topicKit';

const base: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-15T10:00:00Z') };
/** A course's path input as the app builds it (Path.tsx pathInputFrom), with default drill settings. */
// SPEC-JAZZ-FOLD: `jazz` = the jazz pack open (an intermediate background, climbing past mf, or jazz focus).
const inputFor = (c: CourseId, plays: string[] = [], facts: PathFacts = {}, jazz = true): PathInput => {
  const fams = ladderFamiliesFor(c, DEFAULT_DRILL_SETTINGS);
  return { ...courseInput({ ...base, plays, packs: jazz ? ['jazz'] : [] }, c), ...(fams.length ? { ladderFamilies: fams, ladderHidden: ladderHiddenFor(c, undefined, undefined, false, DEFAULT_DRILL_SETTINGS) } : {}), facts };
};
const stepsOf = (c: CourseId, plays: string[] = [], jazz = true): PathStep[] => {
  const inp = inputFor(c, plays, {}, jazz);
  return stepCatalogue().filter((s) => eligible(s, inp));
};
const byId = () => new Map(stepCatalogue().map((s) => [s.id, s] as const));
const BANDS = { beginner: [700, 1000], intermediate: [1000, 1400], advanced: [1400, 1901] } as const;
const inBand = (xs: PathStep[], [lo, hi]: readonly [number, number]) => xs.filter((s) => s.difficulty >= lo && s.difficulty < hi);

/** Each course as a player of it sees it once the jazz pack is open (SPEC-JAZZ-FOLD: the Jazz course folded in). */
const COURSES: { c: CourseId; plays?: string[]; perBand: Record<keyof typeof BANDS, number> }[] = [
  // Minimum steps per 100 points in each band (the averages today are about 2–4× these).
  { c: 'ear', perBand: { beginner: 8, intermediate: 40, advanced: 45 } },
  { c: 'voice', perBand: { beginner: 6, intermediate: 15, advanced: 8 } },
  { c: 'keys', perBand: { beginner: 20, intermediate: 40, advanced: 40 } },
  { c: 'guitar', perBand: { beginner: 10, intermediate: 30, advanced: 15 } },
  { c: 'bass', perBand: { beginner: 15, intermediate: 30, advanced: 25 } },
  { c: 'drums', perBand: { beginner: 12, intermediate: 20, advanced: 5 } },
];

describe('the step catalogue does not depend on module load order (AUDIT-6 X1)', () => {
  it('loading the Rush games changes nothing on the path; game-only topics are never steps', async () => {
    const before = stepCatalogue().map((s) => `${s.id}@${s.difficulty}`);
    await import('../src/engine/rush');
    const after = stepCatalogue().map((s) => `${s.id}@${s.difficulty}`);
    expect(after).toEqual(before);
    const gameOnly = Object.entries(TOPIC_GEN).filter(([, t]) => t.gameOnly).map(([k]) => k);
    expect(gameOnly).toEqual(expect.arrayContaining(['name-standard', 'interval-cells', 'mm-modes', 'chord-read-alt']));
    expect(stepCatalogue().filter((s) => s.topic && gameOnly.includes(s.topic))).toEqual([]);
  });
  it('the advanced games’ jazz-ear topics are Ear steps of the jazz pack', () => {
    for (const t of ['voicing-type', 'jazz-chains']) {
      const xs = stepCatalogue().filter((s) => s.topic === t);
      expect(xs.length, t).toBeGreaterThan(0);
      for (const s of xs) {
        expect(inCourse(s, 'ear'), s.id).toBe(true);
        expect(s.pack, s.id).toBe('jazz');
      }
    }
  });
});

describe('course membership rule (AUDIT-6 §3)', () => {
  const cat = byId();
  it('expression, Nashville numbers and transposition are Ear', () => {
    for (const t of ['mood', 'dynamics', 'articulation', 'nashville', 'transpose', 'transposition', 'transpose-adv']) {
      const xs = stepCatalogue().filter((s) => s.topic === t);
      expect(xs.length, t).toBeGreaterThan(0);
      for (const s of xs) {
        expect(inCourse(s, 'ear'), s.id).toBe(true);
        expect(s.pack, s.id).toBeUndefined();
      }
    }
  });
  it('rootless and upper-structure voicings, the jazz grids, bebop scales and jazz progressions are the jazz pack (Ear)', () => {
    for (const id of ['topic:upper-rootless:1', 'topic:voicings:3', 'topic:extensions:2', 'topic:grid-dictation:7', 'topic:grid-dictation:8', 'topic:scale-types:5', 'topic:progressions:2', 'topic:chart-analysis:1', 'topic:swing-ratio:1', 'topic:guide-tones:1']) {
      const s = cat.get(id)!;
      expect(s, id).toBeTruthy();
      expect(s.pack, id).toBe('jazz');
      expect(inCourse(s, 'ear'), id).toBe(true);
    }
    // The topics' other levels stay in Ear.
    for (const id of ['topic:voicings:1', 'topic:extensions:1', 'topic:grid-dictation:1', 'topic:scale-types:1', 'topic:progressions:1']) expect(inCourse(cat.get(id)!, 'ear'), id).toBe(true);
  });
  it('the performed jazz families are their instrument course only (SPEC-JAZZ-FOLD)', () => {
    const s = cat.get('tech:k-lh-4')!;
    expect(inCourse(s, 'keys')).toBe(true);
    expect(inCourse(s, 'ear')).toBe(false);
  });
});

describe('a beginner path (jazz pack closed) is whole up to where jazz opens (SPEC-JAZZ-FOLD)', () => {
  for (const { c } of COURSES)
    it(`${c}: no gap over 150 below the auto-open level, a full beginner band, no jazz step`, () => {
      const xs = stepsOf(c, [], false).filter((s) => s.difficulty >= 700);
      const ds = xs.map((s) => s.difficulty).filter((d) => d <= JAZZ_OPEN_AT + 150).sort((a, b) => a - b);
      expect(ds.slice(1).map((d, i) => [d - ds[i], ds[i]]).filter(([g]) => g > 150), c).toEqual([]);
      expect(inBand(xs, BANDS.beginner).length, c).toBeGreaterThanOrEqual(15);
      expect(xs.filter((s) => isJazzStep(s)).map((s) => s.id), c).toEqual([]);
    });
});

describe('path shape per course (AUDIT-6)', () => {
  for (const { c, plays, perBand } of COURSES) {
    it(`${c}: no gap over 150, enough steps in every band, nothing over the cap`, () => {
      const xs = stepsOf(c, plays).filter((s) => s.difficulty >= 700);
      const ds = xs.map((s) => s.difficulty).sort((a, b) => a - b);
      const gaps = ds.slice(1).map((d, i) => [d - ds[i], ds[i]]).filter(([g]) => g > 150);
      expect(gaps, c).toEqual([]);
      expect(Math.max(...ds), c).toBeLessThanOrEqual(PATH_CAP);
      for (const [band, range] of Object.entries(BANDS) as [keyof typeof BANDS, readonly [number, number]][]) {
        const per100 = (inBand(xs, range).length * 100) / (Math.min(range[1], 1900) - range[0]);
        expect(per100, `${c} ${band}`).toBeGreaterThanOrEqual(perBand[band]);
      }
      // Every 100 points up to 1800 holds at least one step (no empty stretch inside a band).
      for (let d = 700; d < 1800; d += 100) expect(xs.some((s) => s.difficulty >= d && s.difficulty < d + 100), `${c} ${d}`).toBe(true);
    });
  }
});

describe('the known misplacements now sit in their grade band (AUDIT-6)', () => {
  const d = (id: string) => byId().get(id)!.difficulty;
  // [step, low, high] — the grade from the syllabus the audits cite, G(grade) = 700 + 90 · grade.
  const CASES: [string, number, number][] = [
    // keys
    ['tech:control-11', G(0), G(1) + 20], // five-finger sight-reading: Initial–G1
    ['tech:scales-28', G(1), G(2) + 20], // major pentatonic: RSL G1–G2
    ['tech:scales-29', G(2), G(3)], // blues: RSL G3
    ['tech:scales-19', G(2), G(4)], // Dorian: RSL G1–G2 (each hand), within a grade or two
    ['tech:scales-7', G(2), G(3)], // chromatic: ABRSM G2–G3
    ['tech:arpeggios-9', 900, 960], // curriculum flow K7: after the minor triads hands together (arpeggios-3, 910)
    ['tech:control-10', G(2), G(3)], // pedal: RCM G2–G3
    ['tech:scales-15', 990, 1060],
    ['tech:k-rhythm-2', G(4), G(6)], // 3:2, 4:3: ABRSM G5–G6
    // bass
    ['tech:b-styles-15', G(1), G(3)], // rock study, Grades 1–3
    ['tech:b-styles-16', G(4), G(6) + 20], // funk and slap, Grades 4–6
    ['tech:b-scale-10', 1050, 1120],
    ['tech:b-walk-19', G(6), G(8)], // jazz waltz: intermediate walking
    // drums
    ['tech:d-diddles-1', G(0), G(2)], // paradiddles: Debut–G1
    ['tech:d-diddles-5', G(1), G(3)], // flams: G2
    ['tech:d-diddles-10', G(3), G(5)], // around the kit: G4
    ['tech:d-count-3', G(6), G(8)], // 7/8: G6–G8
    ['tech:d-prog-1', G(6), G(8)], // odd-meter rock
    ['tech:d-feet-6', G(6), G(8)], // double pedal
    ['tech:d-read-11', 1380, 1400], // curriculum flow R10: after d-read 8 (tom fills, 1379), whose material it reads
    // voice
    ['vocal:1601', 1400, 1600], // bebop lines (sat at 910)
    ['vocal:2001', G(1), G(3) + 20], // arpeggios: RSL G1–G3
    ['vocal:405', 1400, 1650], // sight-singing 5 (items 1450–1550)
    ['vocal:1104', 1200, 1450], // swing eighths (sat at 980)
    // vocal:308 (Barry Harris lines 8) is hidden until verified (src/engine/verifiedContent.ts)
    // jazz
    ['topic:swing-ratio:1', 760, 850],
  ];
  it.each(CASES)('%s in [%i, %i]', (id, lo, hi) => {
    expect(d(id)).toBeGreaterThanOrEqual(lo);
    expect(d(id)).toBeLessThanOrEqual(hi);
  });
  it('cadences: plagal and deceptive before the Neapolitan and augmented 6th; shells before 10ths on the bass', () => {
    expect(d('tech:cadences-6')).toBeLessThan(d('tech:cadences-5'));
    expect(d('tech:b-ext-9')).toBeLessThan(d('tech:b-ext-6'));
    expect(d('tech:b-scale-10')).toBeLessThan(d('tech:b-scale-5'));
  });
  it('every curated rating is an integer inside the path, and the placement helpers hold', () => {
    for (const [k, v] of Object.entries(LEVEL_PLACEMENT)) {
      expect(Number.isInteger(v), k).toBe(true);
      expect(v, k).toBeGreaterThanOrEqual(500);
      expect(v, k).toBeLessThanOrEqual(PATH_CAP);
    }
    expect([G(0), G(3), G(8)]).toEqual([700, 970, 1420]);
    expect(monotoneFamily([900, 880, 1000])).toEqual([900, 915, 1000]);
  });
  it('voice: every family rises in its teaching order', () => {
    const by = new Map<string, PathStep[]>();
    for (const s of stepCatalogue()) if (s.kind === 'vocal') by.set(s.ladder!.family, [...(by.get(s.ladder!.family) ?? []), s]);
    for (const [f, xs] of by) {
      xs.sort((a, b) => a.ladder!.level - b.ladder!.level);
      xs.forEach((x, i) => i && expect(x.difficulty, `${f} ${x.id}`).toBeGreaterThan(xs[i - 1].difficulty));
    }
  });
});

describe('the jazz beginner band is real jazz, in Ear and the instruments (AUDIT-6 J-W1, J-W2; SPEC-JAZZ-FOLD)', () => {
  const beginner = (c: CourseId, plays: string[] = []) => inBand(stepsOf(c, plays), BANDS.beginner).map((s) => s.id);
  it('Ear with the jazz pack: swing feel, the blues, shells and guide tones by ear', () => {
    const ids = beginner('ear');
    expect(ids).toContain('topic:swing-ratio:1');
    expect(ids.filter((id) => id.startsWith('topic:blues-ear:')).length).toBe(3);
    // AUDIT-7 #2: the solo left hand by ear is a piano item — only for a player of the keys.
    expect(ids).not.toContain('topic:lh-tex-ear:1');
    expect(beginner('ear', ['keys'])).toContain('topic:lh-tex-ear:1'); // shells by ear
    expect(ids).toContain('topic:guide-tones:1');
    // Comping rhythms by ear (comp-rhythm-ear) are hidden until verified: src/engine/verifiedContent.ts
    expect(ids).not.toContain('topic:comp-rhythm-ear:1');
  });
  it('a pianist plays shells and a first solo over a blues in the beginner band; a guitarist improvises', () => {
    expect(beginner('keys')).toEqual(expect.arrayContaining(['tech:k-lh-4', 'tech:k-impro-4']));
    expect(beginner('guitar')).toContain('tech:g-impro-1');
  });
  it('jazz focus brings the jazz families early on a pianist path; closed, none come', () => {
    const walk = (inp: (facts: PathFacts) => PathInput) => {
      let facts: PathFacts = {};
      const out: PathStep[] = [];
      for (let u = 0; u < 8; u++) {
        const v = buildPath(inp(facts));
        const cur = v.units.find((x) => x.status === 'current');
        if (!cur) break;
        out.push(...cur.steps.map((x) => x.step));
        const steps = { ...(facts.steps ?? {}) };
        for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-15T10:00:00Z' };
        facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-15T10:00:00Z' }] : [])] };
      }
      return out;
    };
    const fams = ladderFamiliesFor('keys', DEFAULT_DRILL_SETTINGS);
    const hidden = ladderHiddenFor('keys', undefined, undefined, false, DEFAULT_DRILL_SETTINGS);
    const focus = walk((facts) => ({ ...courseInput({ ...base, packs: [] }, 'keys', false, true), ladderFamilies: fams, ladderHidden: hidden, facts }));
    const closed = walk((facts) => ({ ...courseInput({ ...base, packs: [] }, 'keys'), ladderFamilies: fams, ladderHidden: hidden, facts }));
    expect(focus.some((s) => isJazzStep(s)), focus.map((s) => s.id).join(' ')).toBe(true);
    expect(closed.some((s) => isJazzStep(s))).toBe(false);
  });
});

describe('repertoire across the whole path (AUDIT-6 §5)', () => {
  const rep = stepCatalogue().filter((s) => s.rep);
  it('reaches past 1400 in every course and to ~1880 where there are advanced items', () => {
    for (const c of ['keys', 'jazz', 'guitar', 'bass', 'voice', 'ear', 'drums'] as RepCourse[]) {
      const ds = rep.filter((s) => s.rep!.course === c).map((s) => s.difficulty);
      expect(Math.max(...ds), c).toBeGreaterThanOrEqual(1800);
      expect(Math.min(...ds), c).toBeLessThanOrEqual(800);
    }
  });
  it('no clumps: at most three items of a course inside any 20 points', () => {
    for (const c of ['keys', 'jazz', 'guitar', 'bass'] as RepCourse[]) {
      const ds = rep.filter((s) => s.rep!.course === c).map((s) => s.difficulty).sort((a, b) => a - b);
      for (let i = 3; i < ds.length; i++) expect(ds[i] - ds[i - 3], `${c} at ${ds[i]}`).toBeGreaterThan(20);
    }
  });
  it('ii–V–I through all twelve keys and the jazz blues in F are out of the beginner band', () => {
    for (const s of rep.filter((x) => ['two-five-keys', 'minor-two-five-keys', 'blues-f'].includes(x.rep!.id))) expect(s.difficulty, s.id).toBeGreaterThanOrEqual(1000);
  });
});

describe('topic levels rise smoothly (AUDIT-6 §6)', () => {
  it('no topic jumps more than 250 points from one level to the next, and none gets easier', () => {
    const by = new Map<string, number[]>();
    for (const s of stepCatalogue()) if (s.kind === 'topic') by.set(s.topic!, Object.assign(by.get(s.topic!) ?? [], { [s.level! - 1]: s.difficulty }));
    const bad: string[] = [];
    for (const [t, ds] of by) for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] > 250) bad.push(`${t} ${i}→${i + 1}: +${ds[i] - ds[i - 1]}`);
    expect(bad).toEqual([]);
  });
});
