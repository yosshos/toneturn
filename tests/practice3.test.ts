import { describe, expect, it } from 'vitest';
import { COURSE_ROWS, courseRows } from '../src/ui/courseRows';
import { engineArg, engineHash, ENGINE_HASH, legacyPracticeHash, practiceRouteOf, repHash, repViewOf } from '../src/ui/practiceRoutes';
import { legacyLicksHash, licksSectionOf } from '../src/ui/licksHub';
import { sectionOf } from '../src/ui/Sidebar';
import { placeOfRoute, placeTitle } from '../src/ui/continuePlace';
import { chartOfPiece, libraryFor, mineEntries, mineMatches, parsePieceKey, pieceActions, pieceKey, pieceStatus, searchLib, stdTier, whereInPath, type LibEntry } from '../src/engine/repLibrary';
import { placeSeries, sparkLabel } from '../src/engine/placeSpark';
import { REPERTOIRE, repLessonId, type RepCourse } from '../src/engine/repertoire';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { repSteps } from '../src/engine/pathBonus';
import type { Snapshot } from '../src/engine/snapshot';
import type { PathView } from '../src/engine/path';
import type { CourseId } from '../src/engine/courses';

// BUILD-PLAN-2026-11 phase 3 (SPEC-PRACTICE-IA-3, SPEC-PATH-TODAY-PRACTICE): Practice reorganised.

describe('the places per course (owner 2026-11-22)', () => {
  const places = (c: CourseId, jazz: 'off' | 'on' = 'off') => courseRows(c, false, jazz).filter((r) => r !== 'games');
  it('keys, guitar and bass: Technique, Licks, Repertoire, Improvise — with or without the jazz pack', () => {
    for (const c of ['keys', 'guitar', 'bass'] as const) {
      expect(places(c)).toEqual(['drills', 'licks', 'repertoire', 'improv']);
      expect(places(c, 'on')).toEqual(['drills', 'licks', 'repertoire', 'improv']);
      expect(courseRows(c)).toContain('games');
    }
  });
  it('voice: Technique, Licks, Repertoire; Improvise (scat) with the jazz pack', () => {
    expect(places('voice')).toEqual(['drills', 'licks', 'repertoire']);
    expect(places('voice', 'on')).toEqual(['drills', 'licks', 'repertoire', 'improv']);
  });
  it('drums: Technique, Repertoire, Games, Improvise — no Licks', () => {
    expect(courseRows('drums')).toEqual(['drills', 'repertoire', 'games', 'improv']);
    expect(courseRows('drums')).not.toContain('licks');
  });
  it('ear: Lessons, Repertoire (by ear), Puzzle, Games; exam prep puts Exams first', () => {
    expect(courseRows('ear')).toEqual(['lessons', 'repertoire', 'puzzle', 'games']);
    expect(courseRows('ear', true)[0]).toBe('exams');
  });
  it('the old rows are gone from every course (they live inside the places)', () => {
    for (const rows of Object.values(COURSE_ROWS)) for (const old of ['charts', 'pieces', 'mysong', 'transcribe', 'standards', 'songs', 'encore']) expect(rows).not.toContain(old);
    for (const c of Object.keys(COURSE_ROWS) as CourseId[]) for (const j of ['off', 'on', 'focus'] as const) for (const old of ['charts', 'pieces', 'mysong', 'transcribe', 'standards']) expect(courseRows(c, false, j)).not.toContain(old);
  });
});

describe('old routes land in the new places', () => {
  it('#/charts, #/pieces, #/mysong → Repertoire › Mine; #/songs → Foundations; #/transcribe-coach → Licks › Transcribe', () => {
    expect(legacyPracticeHash('#/charts')).toBe('/repertoire/mine/charts');
    expect(legacyPracticeHash('#/pieces')).toBe('/repertoire/mine/scores');
    expect(legacyPracticeHash('#/mysong')).toBe('/repertoire/mine/recordings');
    expect(legacyPracticeHash('#/songs')).toBe('/repertoire/t/1');
    expect(legacyPracticeHash('#/transcribe-coach')).toBe('/licks/transcribe');
    expect(legacyPracticeHash('#charts/')).toBe('/repertoire/mine/charts');
    for (const h of ['#/transcribe', '#/repertoire', '#/licks', '#/arcade', '#/repertoire/chart', '#/improv', '#/encore']) expect(legacyPracticeHash(h), h).toBeNull();
  });
  it('every redirect target opens a real route', () => {
    for (const old of ['charts', 'pieces', 'mysong', 'songs', 'transcribe-coach']) {
      const to = legacyPracticeHash(`#/${old}`)!;
      expect(practiceRouteOf(`#${to}`), old).toBe(old === 'transcribe-coach' ? 'transcribe-coach' : 'repertoire');
    }
    expect(repViewOf('#/repertoire/mine/scores')).toEqual({ tab: 'mine', mine: 'scores' });
    expect(repViewOf('#/repertoire/t/1')).toEqual({ tab: 1 });
    // the game #/transcribe stays the race (not a Practice address)
    expect(practiceRouteOf('#/transcribe')).toBeNull();
    // the Encore redirects are untouched
    expect(legacyLicksHash('#/encore')).toBe('/licks/mine');
    expect(licksSectionOf('#/licks/transcribe')).toBe('transcribe');
  });
  it('the engines keep their screens under the new places, with the piece in the address', () => {
    expect(practiceRouteOf('#/repertoire/chart')).toBe('charts');
    expect(practiceRouteOf('#/repertoire/score/abc')).toBe('pieces');
    expect(practiceRouteOf('#/repertoire/recording/r1')).toBe('mysong');
    expect(practiceRouteOf('#/repertoire/songbook')).toBe('songs');
    expect(practiceRouteOf('#/licks/transcribe')).toBe('transcribe-coach');
    expect(practiceRouteOf('#/repertoire/p/rep%3Akeys%3Aautumn')).toBe('repertoire');
    for (const r of Object.keys(ENGINE_HASH) as (keyof typeof ENGINE_HASH)[]) expect(practiceRouteOf(`#${engineHash(r, 'x')}`)).toBe(r);
    const h = engineHash('charts', 'rep:keys:autumn-leaves');
    expect(engineArg(`#${h}`)).toBe('rep:keys:autumn-leaves');
    expect(engineArg('#/repertoire/chart')).toBeNull();
  });
  it('a Repertoire view round-trips through its address', () => {
    for (const v of [{}, { tab: 2 as const }, { tab: 'mine' as const }, { tab: 'mine' as const, mine: 'recordings' as const }, { tab: 3 as const, piece: 'rep:keys:autumn-leaves', from: 'path' as const }, { piece: 'chart:1234-abcd', from: 'today' as const }]) expect(repViewOf(`#${repHash(v)}`)).toEqual(v);
  });
  it('the sidebar lights Practice on every place and engine screen', () => {
    for (const r of ['repertoire', 'charts', 'pieces', 'mysong', 'songs', 'licks', 'transcribe-coach', 'improv', 'drills', 'learned', 'puzzle', 'exams']) expect(sectionOf(r), r).toBe('arcade');
    expect(sectionOf('diary')).toBe('skills');
    expect(sectionOf('tuner')).toBe('tools');
  });
});

describe('Repertoire: one place for every piece, every id kept', () => {
  it('a road piece keeps its path step id and its result id', () => {
    const steps = new Set(repSteps().map((s) => s.id));
    for (const [course, items] of Object.entries(REPERTOIRE) as [RepCourse, (typeof REPERTOIRE)[RepCourse]][])
      for (const it of items) {
        const k = pieceKey({ kind: 'rep', course, id: it.id });
        expect(steps.has(k), k).toBe(true);
        expect(parsePieceKey(k)).toEqual({ kind: 'rep', course, id: it.id });
        expect(repLessonId(course, it.id)).toBe(`rep-${course}-${it.id}`);
      }
  });
  it('every course lists its whole road; Ear with the jazz pack lists the jazz standards too', () => {
    for (const c of ['ear', 'voice', 'keys', 'guitar', 'bass', 'drums'] as const) {
      const keys = new Set(libraryFor(c).map((e) => e.key));
      for (const it of REPERTOIRE[c]) expect(keys.has(`rep:${c}:${it.id}`)).toBe(true);
    }
    const ear = libraryFor('ear', 'on').map((e) => e.key);
    for (const it of REPERTOIRE.jazz) expect(ear).toContain(`rep:jazz:${it.id}`);
    expect(libraryFor('ear', 'off').some((e) => e.ref.course === 'jazz')).toBe(false);
  });
  it('with the jazz pack every standard\'s changes is reachable (the old Charts list), each once', () => {
    for (const c of ['keys', 'guitar', 'bass'] as const) {
      const lib = libraryFor(c, 'on');
      // a standard is reachable as its own piece or through a road item's ways (its chart, comping or walking)
      const stds = new Set([...lib.map((e) => e.std), ...lib.flatMap((e) => (e.item?.ways ?? []).map((w) => ('std' in w ? w.std : undefined)))].filter(Boolean));
      for (const s of STANDARD_CHANGES) expect(stds.has(s.id), `${c} ${s.id}`).toBe(true);
      expect(new Set(lib.map((e) => e.key)).size).toBe(lib.length);
    }
    expect(stdTier({ group: 'blues', level: 1 })).toBe(2);
    expect(stdTier({ group: 'swing', level: 2 })).toBe(3);
    expect(stdTier({ group: 'swing', level: 5 })).toBe(4);
  });
  it('Mine: my charts, scores and recordings, filtered by kind', () => {
    const m = mineEntries([{ id: 'c1', title: 'Blue Bossa', text: 'Cm7 | Fm7', style: 'bossa', bpm: 120 }], [{ id: 's1', title: 'Minuet' }], [{ id: 'r1', name: 'My take' }]);
    expect(m.map((e) => e.key)).toEqual(['chart:c1', 'score:s1', 'rec:r1']);
    expect(m.filter((e) => mineMatches(e, 'scores')).map((e) => e.key)).toEqual(['score:s1']);
    expect(m.every((e) => e.tab === 'mine')).toBe(true);
    expect(searchLib(m, 'bossa').map((e) => e.key)).toEqual(['chart:c1']);
  });
  it('search finds by title or what it teaches, in Hebrew and English', () => {
    const lib = libraryFor('keys');
    const first = lib[0];
    expect(searchLib(lib, first.title.en).some((e) => e.key === first.key)).toBe(true);
    expect(searchLib(lib, first.title.he).some((e) => e.key === first.key)).toBe(true);
    expect(searchLib(lib, '')).toHaveLength(lib.length);
  });
  it('the piece page shows only what the piece has', () => {
    const lib = libraryFor('keys', 'on');
    const std = lib.find((e) => e.ref.kind === 'std')!;
    expect(pieceActions(std, 'keys', true).map((a) => a.k)).toEqual(['band', 'improvise', 'technique']);
    expect(pieceActions(std, 'drums', true).map((a) => a.k)).toEqual(['band']);
    expect(pieceActions({ ref: { kind: 'score', id: 's' } }, 'keys', false).map((a) => a.k)).toEqual(['score']);
    expect(pieceActions({ ref: { kind: 'rec', id: 'r' } }, 'ear', false).map((a) => a.k)).toEqual(['recording']);
    // a road item whose own way is the band does not get a second band button
    const withBand = lib.find((e) => e.item?.ways.some((w) => w.k === 'chart')) as LibEntry;
    const acts = pieceActions(withBand, 'keys', true);
    expect(acts.filter((a) => a.k === 'band')).toHaveLength(0);
    expect(acts.filter((a) => a.k === 'way')).toHaveLength(withBand.item!.ways.length);
    // no chart: no band, no improvise
    const tune = libraryFor('keys').find((e) => e.ref.kind === 'rep' && !e.std)!;
    expect(pieceActions(tune, 'keys', false).some((a) => a.k === 'band' || a.k === 'improvise')).toBe(false);
  });
  it('a road standard plays its chart under the same id Charts used (rep-<std>), so results follow it', () => {
    const e = libraryFor('keys').find((x) => x.ref.kind === 'rep' && x.std)!;
    const c = chartOfPiece(e.ref, 'en', [])!;
    expect(c.id).toBe(`rep-${e.std}`);
    expect(c.std).toBe(e.std);
    expect(chartOfPiece({ kind: 'chart', id: 'nope' }, 'en', [])).toBeNull();
    expect(chartOfPiece({ kind: 'tpl', id: 'blues-f' }, 'he', [])!.text).toContain('F7');
  });
});

describe('one status word (D1, D4): closed = 3 clean takes on 2 days', () => {
  const at = (d: string) => `2026-11-${d}T10:00:00.000Z`;
  const h = (d: string, s: number) => ({ lessonId: 'rep-keys-x', completedAt: at(d), firstTry: Math.round(s * 10), total: 10 });
  it('new → learning → almost → closed', () => {
    expect(pieceStatus([], {}, 'keys', 'x')).toBe('new');
    expect(pieceStatus([h('01', 0.5)], {}, 'keys', 'x')).toBe('learning');
    expect(pieceStatus([h('01', 0.9)], {}, 'keys', 'x')).toBe('almost');
    expect(pieceStatus([h('01', 0.9), h('01', 0.8), h('01', 1)], {}, 'keys', 'x')).toBe('almost');
    expect(pieceStatus([h('01', 0.9), h('01', 0.8), h('02', 1)], {}, 'keys', 'x')).toBe('closed');
    // older results than the history: a pass once is almost
    expect(pieceStatus([], { 'rep-keys-x': { best: 9, completions: 4 } }, 'keys', 'x')).toBe('almost');
    expect(pieceStatus([], { 'rep-keys-x': { best: 4, completions: 1 } }, 'keys', 'x')).toBe('learning');
  });
});

describe('path ↔ practice', () => {
  const view = {
    history: [{ id: 'h1', n: 1, no: 1, steps: [{ step: { id: 'rep:keys:a' }, state: 'done' }], difficulty: 0, section: 'beginner', areas: [], status: 'past' }],
    units: [
      { id: 'u2', n: 2, no: 4, steps: [{ step: { id: 'x' }, state: 'done' }, { step: { id: 'rep:keys:b' }, state: 'current' }], difficulty: 0, section: 'beginner', areas: [], status: 'current' },
      { id: 'u3', n: 3, no: 7, steps: [{ step: { id: 'rep:keys:c' }, state: 'locked' }], difficulty: 0, section: 'beginner', areas: [], status: 'projected' },
    ],
  } as unknown as PathView;
  it('where it sits: the unit and step, or later in the path', () => {
    expect(whereInPath(view, 'rep:keys:a')).toEqual({ unit: 1, step: 1, state: 'done' });
    expect(whereInPath(view, 'rep:keys:b')).toEqual({ unit: 4, step: 2, state: 'current' });
    expect(whereInPath(view, 'rep:keys:c')).toEqual({ unit: 7, step: 1, state: 'ahead' });
    expect(whereInPath(view, 'rep:keys:z')).toBeNull();
    expect(whereInPath(null, 'rep:keys:a')).toBeNull();
  });
});

describe('a place\'s sparkline reads the daily snapshots', () => {
  const snap = (day: string, closed: number, mins: Record<string, number> = {}, licks = 0): Snapshot => ({ day, status: { 'keys:technique': { closed, learning: 2 }, 'guitar:x': { closed: 9 } }, tempo: {}, minutes: mins, channels: { ear: null, reading: null }, keys: {}, vocab: { played: licks, closed: licks }, practised: true });
  it('hidden with fewer than 3 days of data', () => {
    expect(placeSeries({ '2026-11-20': snap('2026-11-20', 1), '2026-11-21': snap('2026-11-21', 2) }, 'technique', 'keys', '2026-11-22')).toBeNull();
  });
  it('technique = closed items in the course; repertoire = minutes with pieces; licks = closed licks', () => {
    const s = {
      '2026-11-20': snap('2026-11-20', 1, { 'keys|chart||| run': 3, 'keys|technique|scales|0|edge': 9 }, 1),
      '2026-11-21': snap('2026-11-21', 2, { 'keys|piece|||run': 4 }, 2),
      '2026-11-22': snap('2026-11-22', 4, { 'keys|song|||run': 1, 'keys|improv|||run': 6 }, 2),
      '2026-09-01': snap('2026-09-01', 0),
    };
    expect(placeSeries(s, 'technique', 'keys', '2026-11-22')).toEqual([1, 2, 4]);
    expect(placeSeries(s, 'repertoire', 'keys', '2026-11-22')).toEqual([3, 4, 1]);
    expect(placeSeries(s, 'improv', 'keys', '2026-11-22')).toEqual([0, 0, 6]);
    expect(placeSeries(s, 'licks', 'keys', '2026-11-22')).toEqual([1, 2, 2]);
    expect(sparkLabel('technique', [1, 2, 4], 'en')).toBe('4 closed · +3 this month');
    expect(sparkLabel('repertoire', [3, 4, 1], 'he')).toBe('8 דק׳ בחודש');
  });
});

describe('continue where I stopped', () => {
  it('a place per screen, and a name for the card', () => {
    expect(placeOfRoute('charts')).toBe('repertoire');
    expect(placeOfRoute('transcribe-coach')).toBe('licks');
    expect(placeOfRoute('arcade')).toBeNull();
    const k = libraryFor('keys')[0];
    expect(placeTitle('repertoire', `#${repHash({ piece: k.key })}`, 'en')).toBe(`Repertoire · ${k.title.en}`);
    expect(placeTitle('transcribe-coach', '#/licks/transcribe', 'he')).toBe('ליקים · תמלול');
    expect(placeTitle('improv', '#/improv', 'en')).toBe('Improvise');
  });
});
