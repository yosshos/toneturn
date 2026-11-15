// Hidden until verified (owner 2026-11-15): every id in src/engine/verifiedContent.ts is hidden from every list —
// path, Drills catalogues, games, workout, badges, level test, lessons, depth counts — verified content is untouched,
// and saved progress on hidden ids still works.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { gameVerified, hiddenContentIds, isVerified, itemIdVerified, itemVerified, SWITCHED_ON, UNVERIFIED_CLAIMS } from '../src/engine/verifiedContent';
import { catalog, generate, itemIdOf } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { drumFamilies } from '../src/engine/drills/drums';
import { stepCatalogue } from '../src/engine/path';
import { VOICE_FAMILIES } from '../src/engine/voiceFamilies';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { bonusSteps } from '../src/engine/pathBonus';
import { gameBadgeSeeds } from '../src/engine/gameBadges';
import { workoutGame, WORKOUT_GAMES } from '../src/engine/workout2';
import { MINI_LESSONS } from '../src/content/minilessons';
import { strandsFor } from '../src/engine/drills/levelTest';
import { depthCounts, familyLevels, topicLevels } from '../src/partner/counts';
import { TOPIC_GEN } from '../src/engine/topics';
import { keyMastery } from '../src/engine/analysis/keyMastery';
import { HL_ROWS } from '../src/engine/drills/harrisLineDrills';
import type { CourseId } from '../src/engine/courses';
import type { ItemState } from '../src/engine/drills/types';

const ALL_FAMS = [...catalog(), ...guitarCatalog(), ...drumFamilies()];
const ALL_LEVELS = ALL_FAMS.flatMap((f) => f.levels);
const ALL_SPECS = ALL_LEVELS.flatMap((l) => l.specs);
const baseKind = (k: string) => k.slice(k.lastIndexOf('>') + 1);
const hidden = hiddenContentIds();
const of = (prefix: string) => hidden.filter((h) => h.startsWith(prefix)).map((h) => h.slice(prefix.length));

describe('the registry', () => {
  it('every claim has an id, a reason and content; ids are unique; switched-on ids are real claims', () => {
    const ids = UNVERIFIED_CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of UNVERIFIED_CLAIMS) {
      expect(c.why.length).toBeGreaterThan(20);
      expect(c.hides.length).toBeGreaterThan(0);
      for (const h of c.hides) expect(h).toMatch(/^(item|level|vocal|topic|lesson|card|game):/);
    }
    for (const id of SWITCHED_ON) expect(ids.includes(id) || id.includes(':'), id).toBe(true);
    // a not-pursued claim is never switched on
    for (const c of UNVERIFIED_CLAIMS) if (c.notPursued || c.unsourced) expect(SWITCHED_ON.has(c.id), c.id).toBe(false);
    expect(hidden.length).toBeGreaterThan(25);
  });
  it('every hidden id names real content (no typos that would hide nothing)', () => {
    const kinds = new Set<string>();
    for (const f of [...catalog(), ...guitarCatalog()]) void f;
    // kinds are checked against the unfiltered sources: the registry's own kinds must appear in a generator file
    for (const id of of('item:')) kinds.add(id.split(':')[0]);
    const src = Object.values(import.meta.glob('../src/engine/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n');
    for (const k of kinds) expect(src.includes(`'${k}'`), k).toBe(true);
    for (const t of of('topic:')) expect(TOPIC_GEN[t.split(':')[0]], t).toBeTruthy();
    const lessonSrc = Object.values(import.meta.glob('../src/content/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n');
    for (const l of of('lesson:')) expect(lessonSrc.includes(`id: '${l}'`), l).toBe(true);
    for (const c of of('card:')) expect(lessonSrc.includes(`gated('${c}'`) || lessonSrc.includes(`gatedOr('${c}'`), c).toBe(true);
    for (const g of of('game:')) expect(Object.values(WORKOUT_GAMES).flat().concat(['call5432']).includes(g) || src.includes(`'${g}'`), g).toBe(true);
  });
});

describe('hidden everywhere', () => {
  it('drill catalogues (keys, guitar, bass, drums): no hidden item or level', () => {
    for (const s of ALL_SPECS) expect(itemVerified(s.kind, s.option), `${s.family} ${s.kind} ${s.option}`).toBe(true);
    const ids = new Set(ALL_LEVELS.map((l) => l.id));
    for (const l of of('level:')) expect(ids.has(l), l).toBe(false);
    for (const id of of('item:')) {
      const [k, op] = id.split(':');
      expect(ALL_SPECS.some((s) => baseKind(s.kind) === k && (op === undefined || s.option === Number(op))), id).toBe(false);
    }
  });
  it('the path: no hidden topic, topic level, vocal level, game or technique level', () => {
    const cat = stepCatalogue();
    for (const t of of('topic:')) {
      const [topic, lv] = t.split(':');
      expect(cat.some((s) => s.topic === topic && (lv === undefined || s.level === Number(lv))), t).toBe(false);
    }
    const levelIds = new Set(ALL_LEVELS.map((l) => l.id));
    for (const s of cat.filter((x) => x.kind === 'tech')) expect(levelIds.has(s.id.replace(/^tech:/, '')), s.id).toBe(true);
    const bonus = bonusSteps();
    for (const g of of('game:')) expect(bonus.some((b) => b.game === g), g).toBe(false);
  });
  it('voice: no hidden vocal level in any family', () => {
    const refs = VOICE_FAMILIES.flatMap((f) => f.refs);
    for (const v of of('vocal:')) expect(refs.includes(Number(v)), v).toBe(false);
  });
  it('games: lists, badges and the workout rotation leave hidden games out', () => {
    const seeds = gameBadgeSeeds();
    for (const g of of('game:')) {
      for (const c of Object.keys(COURSE_GAMES) as CourseId[]) expect(COURSE_GAMES[c], `${c} ${g}`).not.toContain(g);
      expect(seeds.some((x) => x.id.startsWith(`special:game:${g}:`)), g).toBe(false);
      for (const c of Object.keys(WORKOUT_GAMES) as CourseId[])
        for (let d = 0; d < 20; d++) expect(workoutGame(c, `2026-11-${String(d + 1).padStart(2, '0')}`)).not.toBe(g);
    }
  });
  it('lessons: hidden lessons are not in the lesson list', () => {
    for (const l of of('lesson:')) expect(MINI_LESSONS[l], l).toBeUndefined();
  });
  it('level test: no rung on a hidden level (every instrument)', () => {
    const ids = new Set(ALL_LEVELS.map((l) => l.id));
    for (const inst of ['piano', 'guitar', 'bass', 'drums'] as const)
      for (const st of strandsFor(inst, 'both')) for (const r of st.rungs) expect(ids.has(r.level), `${inst} ${r.level}`).toBe(true);
    expect(strandsFor('piano', 'jazz').flatMap((s) => s.rungs).some((r) => r.level === 'k-harrisline-17')).toBe(false); // the 5-4-3-2 phrases
  });
  it('depth counts: hidden levels and topic levels are not counted', () => {
    expect(familyLevels('k-harrisline')).toBe(catalog().find((f) => f.id === 'k-harrisline')!.levels.length);
    expect(familyLevels('k-harrisline')).toBeLessThan(HL_ROWS.length);
    expect(topicLevels('comp-rhythm-ear')).toBe(2);
    expect(topicLevels('lh-tex-ear')).toBe(1);
    const c = depthCounts();
    expect(c.lessons).toBe(Object.keys(MINI_LESSONS).length);
  });
});

describe('every verify-marked item is hidden unless switched on', () => {
  // The `verify` marks in src/engine (harrisLines, harrisLineDrills, harmLadder, soloPiano, soloPianoDrills, vocal) and
  // the drums' teacher-check levels.
  const VERIFY_MARKED: [string, number?][] = [
    ['hl-5432'], ['hl-lick'], ['hl-outline', 0], ['hl-arps-down'], ['hl-feel6'], ['hl-compose'], ['hl-3b9'],
    ['el-borrow'], ['cm-elevator'], ['vl-ladder', 0], ['vl-ladder', 1], ['vl-ladder', 3], ['vl-ladder', 7],
    ['lh-bpalt', 1], ['lh-shB', 1], ['lh-strong', 1], ['lh-var1'], ['lh-332'], ['lh-var2'], ['lh-34'], ['lh-scomp', 3], ['lh-walk10', 2], ['lh-head10'],
    ['lh-shuttle'], ['tx-drop2'], ['tx-inner'], ['cp-basie'], ['cp-pushoff'], ['cp-accent'],
  ];
  it('no catalogue spec of a verify-marked kind / option', () => {
    for (const [k, op] of VERIFY_MARKED) {
      expect(itemVerified(k, op ?? 0), k).toBe(false);
      expect(ALL_SPECS.some((s) => baseKind(s.kind) === k && (op === undefined || s.option === op)), `${k} ${op}`).toBe(false);
    }
    for (const l of ['d-latin-8', 'd-latin-9', 'd-latin-10']) expect(ALL_LEVELS.some((x) => x.id === l), l).toBe(false);
    expect(VOICE_FAMILIES.some((f) => f.refs.includes(309)), '309').toBe(false);
    expect(gameVerified('call5432')).toBe(false);
  });
});

describe('switched on 2026-11-15 (the owner\'s answers and the re-research): back everywhere', () => {
  const ON: [string, number?][] = [
    ['hl-chrom', 0], ['hl-chrom', 1], ['hl-chrom', 2], ['hl-chrom2', 0], ['hl-chrom2', 2], ['hl-chrom2', 6], ['hl-eight', 0], ['hl-eight', 12],
    ['hl-sevendown', 0], ['hl-imp-scale', 3], ['hl-imp-scale', 4], ['hl-abc', 2], ['hl-abc', 3], ['hl-outline', 2], ['hl-outline', 4], ['hl-outline', 5],
    ['vl-ladder', 2], ['vl-ladder', 6], ['vl-ladder', 8], ['vl-ladder', 9], ['cp-beat3', 0], ['tx-call', 0], ['lh-scomp', 1], ['lh-scomp', 2], ['lh-scomp', 4],
    ['lh-walk10', 0], ['lh-walk10', 1],
  ];
  it('in the catalogues (keys, guitar, bass), every key', () => {
    for (const [k, op] of ON) {
      expect(itemVerified(k, op), `${k} ${op}`).toBe(true);
      expect(ALL_SPECS.some((s) => baseKind(s.kind) === k && s.option === op), `${k} ${op}`).toBe(true);
    }
    const hl = catalog().find((f) => f.id === 'k-harrisline')!;
    expect(hl.levels.find((l) => l.specs.some((s) => s.kind === 'hl-chrom'))!.keys).toHaveLength(12);
    for (const fam of ['g-harrisline', 'b-harrisline']) {
      const f = ALL_FAMS.find((x) => x.id === fam)!;
      expect(f.levels.some((l) => l.specs.some((s) => baseKind(s.kind) === 'hl-chrom')), fam).toBe(true);
    }
  });
  it('the path, the ear topic levels, the voice levels, lessons and the depth counts', () => {
    const cat = stepCatalogue();
    for (const [topic, lv] of [['bh-line-ear', 1], ['bh-line-ear', 2], ['bh-line-ear', 5], ['comp-rhythm-ear', 1], ['comp-rhythm-ear', 3]] as const)
      expect(cat.some((s) => s.topic === topic && s.level === lv), `${topic} ${lv}`).toBe(true);
    expect(cat.some((s) => s.topic === 'comp-rhythm-ear' && s.level === 2)).toBe(false);
    for (const v of [308, 310]) expect(VOICE_FAMILIES.some((f) => f.refs.includes(v)), String(v)).toBe(true);
    expect(MINI_LESSONS['bh-chromatic']).toBeTruthy();
    expect(topicLevels('bh-line-ear')).toBe(5);
    const c = depthCounts();
    expect(c.lessons).toBe(Object.keys(MINI_LESSONS).length);
    // the chromatic scale and seven down are tech steps on the path
    const tech = new Set(cat.filter((s) => s.kind === 'tech').map((s) => s.id.replace(/^tech:/, '')));
    const hl = catalog().find((f) => f.id === 'k-harrisline')!;
    const chromLv = hl.levels.find((l) => l.specs.some((s) => s.kind === 'hl-chrom'))!.id;
    expect(tech.has(chromLv), chromLv).toBe(true);
  });
  it('the level test can reach the switched-on Harris levels; key mastery counts them', () => {
    const ids = new Set(ALL_LEVELS.map((l) => l.id));
    for (const st of strandsFor('piano', 'jazz')) for (const r of st.rungs) expect(ids.has(r.level), r.level).toBe(true);
    const spec = { family: 'k-harrisline' as const, kind: 'hl-chrom', key: 5, hands: 'R' as const, option: 0, tempo: 60 };
    expect(itemIdVerified(itemIdOf(spec as never))).toBe(true);
  });
  it('the lessons speak of the confirmed forms only', () => {
    const say = JSON.stringify(MINI_LESSONS['bh-chromatic']);
    expect(say).not.toContain('working form');
    expect(say).toContain('a 3rd, a 6th or a 10th below');
    expect(JSON.stringify(MINI_LESSONS['bh-line-devices'])).toContain('Seven down to the 3rd: over');
  });
});

describe('verified content unaffected', () => {
  it('sourced Harris lines, the Elevator, other courses stay', () => {
    const hl = catalog().find((f) => f.id === 'k-harrisline')!;
    const kinds = new Set(hl.levels.flatMap((l) => l.specs.map((s) => s.kind)));
    for (const k of ['hl-imp-arps', 'hl-rules', 'hl-triplet', 'hl-misc', 'hl-upbeat', 'hl-ands', 'hl-outline', 'hl-imp-scale']) expect(kinds.has(k), k).toBe(true);
    // level ids keep their numbers (saved progress): the important arpeggios are still k-harrisline-4
    expect(hl.levels.find((l) => l.id === 'k-harrisline-4')?.level).toBe(4);
    expect(gameVerified('elevator')).toBe(true);
    expect(COURSE_GAMES.keys).toContain('elevator');
    expect(COURSE_GAMES.guitar).toContain('elevator');
    expect(ALL_LEVELS.some((l) => l.id === 'd-latin-7')).toBe(true);
    expect(MINI_LESSONS['bh-line-devices']).toBeTruthy();
    expect(MINI_LESSONS['bh-lines']).toBeTruthy();
    // the line-devices lesson keeps its sourced cards, without the hidden ones
    const say = JSON.stringify(MINI_LESSONS['bh-line-devices']);
    expect(say).toContain('three important arpeggios');
    expect(say).not.toContain('5-4-3-2 phrases, from Workbook 1');
  });
  it('the elevator levels start from the tonic only (cm-expand options 0 and 8)', () => {
    const ops = ALL_SPECS.filter((s) => baseKind(s.kind) === 'cm-expand').map((s) => s.option);
    expect(ops.length).toBeGreaterThan(0);
    for (const o of ops) expect([0, 8]).toContain(o);
  });
});

describe('saved progress on hidden content', () => {
  it('a hidden item still generates (no crash), but key mastery leaves it out', () => {
    const spec = { family: 'k-harrisline' as const, kind: 'hl-5432', key: 0, hands: 'R' as const, option: 0, tempo: 60 };
    const d = generate(spec as never);
    expect(d.notes.length).toBeGreaterThan(0);
    const id = itemIdOf(spec as never);
    expect(itemIdVerified(id)).toBe(false);
    expect(itemIdVerified(itemIdOf({ ...spec, kind: 'hl-rules' } as never))).toBe(true);
    expect(itemIdVerified('k-game-call5432:game:0:RL')).toBe(false);
    expect(itemIdVerified('d-latin:8:mambo:0:RL:op0')).toBe(false);
    expect(itemIdVerified('d-latin:7:x:0:RL:op0')).toBe(true);
    const st = (itemId: string, family: string): ItemState => ({ itemId, family, key: 0, takes: 9, cleanBpm: 100, goalBpm: 100, targetBpm: 100, last: '2026-11-14T10:00:00Z' } as unknown as ItemState);
    const km = keyMastery([st(id, 'k-harrisline')], '2026-11-15T10:00:00Z');
    expect(km.length).toBe(0);
  });
  it('isVerified is true for unknown ids (content not in the registry is shown)', () => {
    expect(isVerified('item:hl-rules')).toBe(true);
    expect(isVerified('game:highway')).toBe(true);
  });
});
