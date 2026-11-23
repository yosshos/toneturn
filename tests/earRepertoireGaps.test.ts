// SPEC-EAR-AND-READING and SPEC-PRACTICE-IA-3 gaps (2026-11-23 audit): the channel of non-technique takes and the
// measured week, XP by channel, a melody by ear or from the page, hear and continue, call and response in the key
// session, trading by ear (the band leads), the piece page's new actions (Learn the melody, Comp it, the piece's keys,
// Transcribe a phrase), the licks that fit a piece, and "now improvise with it" after a lick closes in the key.
import { describe, expect, it } from 'vitest';
import { channelGroup, channelXp, MEMORY_XP, noteChannelWeek, takeChannelOf, weekOfDay, weekShares } from '../src/engine/channelPlan';
import { defaultChannel } from '../src/engine/drills/channel';
import { hearAndContinue, melodyByEar, melodyDrillOf, patternPeriod } from '../src/engine/repMelody';
import { catalog, generate, itemIdOf } from '../src/engine/drills/generate';
import { ladderRungs, openKeyRungs } from '../src/engine/drills/keyIndex';
import { pieceActions, pieceKeys, type LibEntry } from '../src/engine/repLibrary';
import { licksThatFit } from '../src/engine/lickImprov';
import { LICKS } from '../src/engine/licks';
import { callPhrase } from '../src/ui/ImprovStudio';
import { closedRecently } from '../src/ui/PracticeKeys';
import { parseChart } from '../src/engine/charts';
import type { ItemState } from '../src/engine/drills/types';

describe('the measured week and XP by channel (§5)', () => {
  it('every take counts in its group; a new week starts from zero; the shares', () => {
    const day = '2026-11-23';
    let w = noteChannelWeek(null, 'ear-fresh', day);
    w = noteChannelWeek(w, 'ear-known', day);
    w = noteChannelWeek(w, 'page-known', day, 1);
    w = noteChannelWeek(w, 'unaided', day);
    expect(w.n).toEqual({ ear: 2, page: 1, memory: 1 });
    expect(weekShares(w, weekOfDay(day))).toMatchObject({ ear: 0.5, page: 0.25, memory: 0.25, n: 4 });
    expect(weekShares(w, weekOfDay('2026-12-07'))).toBeNull();
    expect(noteChannelWeek(w, 'page-sight', '2026-12-07').n).toEqual({ page: 1 });
    expect(channelGroup('page-sight')).toBe('page');
  });
  it('the take\'s channel is the one its item\'s tally moved', () => {
    expect(takeChannelOf({ 'page-known': { n: 2, clean: 1, best: 80 } }, { 'page-known': { n: 2, clean: 1, best: 80 }, 'ear-known': { n: 1, clean: 1, best: 80 } })).toBe('ear-known');
    expect(takeChannelOf(undefined, undefined)).toBeNull();
  });
  it('the weaker channel earns more (shrinking with the gap), memory a small extra, the strong channel never less', () => {
    const earStrong = { ear: 0.9, reading: 0.3 };
    expect(channelXp(10, 'page-known', earStrong, true)).toBe(13); // ×(1 + 0.6/2)
    expect(channelXp(10, 'ear-fresh', earStrong, true)).toBe(10);
    expect(channelXp(10, 'page-known', { ear: 0.6, reading: 0.5 }, true)).toBe(11);
    expect(channelXp(10, 'unaided', earStrong, true)).toBe(10 + MEMORY_XP);
    expect(channelXp(10, 'unaided', earStrong, false)).toBe(10);
    expect(channelXp(10, null, earStrong, true)).toBe(10);
  });
});

describe('a melody by ear or from the page (§3.3)', () => {
  const melody = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((b) => ({ b, d: 1, m: 60 + (b % 5) }));
  const page = melodyDrillOf({ id: 'chart-1', title: { en: 'My tune', he: 'השיר שלי' }, melody, chart: ['C', 'F', 'G7', 'C'], bpm: 100 })!;
  it('from the page: the tune as a drill over its bars', () => {
    expect(page.notes).toHaveLength(16);
    expect(page.beats).toBe(16);
    expect(page.chart).toEqual(['C', 'F', 'G7', 'C']);
    expect(defaultChannel(page, undefined)).toBe('page-known');
  });
  it('by ear: two-bar phrases, each heard then played back, the notation hidden; an ear take', () => {
    const ear = melodyByEar(page);
    expect(ear).toHaveLength(2);
    expect(ear[0]).toMatchObject({ show: 'none', phrase: { at: 8, level: 1 } });
    expect(ear[0].listen!.notes).toHaveLength(8);
    expect(ear[0].notes[0].beat).toBe(8);
    expect(new Set(ear.map((d) => d.itemId)).size).toBe(2);
    expect(ear[0].itemId).not.toBe(page.itemId);
    expect(defaultChannel(ear[0], undefined)).toBe('ear-fresh');
    expect(defaultChannel(ear[0], { takes: 2 } as ItemState)).toBe('ear-known');
  });
});

describe('hear and continue, call and response in the key session (§3.1)', () => {
  const triads = generate({ family: 'k-sharm', kind: catalog().find((f) => f.id === 'k-sharm')!.levels.find((l) => l.id === 'k-sharm-7')!.specs[0].kind, key: 0, hands: 'R', option: 0 } as never);
  it('the pattern\'s segment is found (triads: 3)', () => {
    expect(patternPeriod(triads)).toBe(3);
  });
  it('the first two segments are the call; the rest is played by ear, the notation hidden', () => {
    const hc = hearAndContinue(triads);
    expect(hc.show).toBe('none');
    expect(hc.listen!.notes).toHaveLength(6);
    expect(hc.notes.length).toBe(triads.notes.length - 6);
    expect(defaultChannel(hc, undefined)).toBe('ear-fresh');
  });
  it('generate() with ear "continue" gives its own item id and the by-ear drill', () => {
    const spec = { ...triads.spec, ear: 'continue' as const };
    const d = generate(spec);
    expect(d.itemId).toBe(itemIdOf(spec));
    expect(d.itemId).not.toBe(triads.itemId);
    expect(d.show).toBe('none');
  });
  it('block R: call and response on every instrument, hear and continue on the piano; built in the key', () => {
    for (const inst of ['piano', 'guitar', 'bass'] as const) {
      const r = ladderRungs('major', inst).filter((x) => x.block === 'R');
      expect(r.some((x) => /-phrase-1$/.test(x.id))).toBe(true);
    }
    expect(ladderRungs('minor', 'piano').some((x) => x.block === 'R' && x.ear === 'continue')).toBe(true);
    const { built } = openKeyRungs(catalog(), 5, 'major', 2);
    const cr = built.find((b) => b.rung.block === 'R' && b.rung.id === 'k-phrase-1');
    const hc = built.find((b) => b.rung.tag === 'hc');
    expect(cr?.lvl.keys).toEqual([5]);
    expect(hc?.lvl.specs.every((s) => (s as { ear?: string }).ear === 'continue')).toBe(true);
  });
});

describe('trading by ear: the band leads (§3.4)', () => {
  it('the call is the chart\'s own chord tones, over the four bars', () => {
    const p = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
    const call = callPhrase(p, 12345);
    expect(call.length).toBeGreaterThan(4);
    expect(Math.max(...call.map((n) => n.beat))).toBeLessThan(16);
    const pcsAt = (b: number) => (b < 4 ? [2, 5, 9, 0] : b < 8 ? [7, 11, 2, 5] : [0, 4, 7, 11]);
    expect(call.every((n) => pcsAt(n.beat).includes(n.midi % 12))).toBe(true);
  });
});

describe('the piece page (SPEC-PRACTICE-IA-3 §3)', () => {
  const std: Pick<LibEntry, 'ref' | 'item' | 'std'> = { ref: { kind: 'chart', id: 'x' }, std: 'blues-f' };
  const mine: Pick<LibEntry, 'ref' | 'item' | 'std'> = { ref: { kind: 'chart', id: 'mine-1' } };
  it('Comp it as a direct action: piano voicings, guitar comping, bass walking (a standard); piano on any chart', () => {
    const k = pieceActions(std, 'keys', true).find((a) => a.k === 'comp');
    expect(k).toMatchObject({ way: { k: 'chartDrill', std: 'blues-f' } });
    expect(pieceActions(std, 'guitar', true).find((a) => a.k === 'comp')).toMatchObject({ way: { k: 'guitarStd' } });
    expect(pieceActions(std, 'bass', true).find((a) => a.k === 'comp')).toMatchObject({ way: { k: 'bassStd' } });
    expect(pieceActions(mine, 'keys', true).some((a) => a.k === 'comp')).toBe(true);
    expect(pieceActions(mine, 'bass', true).some((a) => a.k === 'comp')).toBe(false);
  });
  it('Learn the melody (both ways, the strong channel first) when the piece has one; Transcribe a phrase on standards', () => {
    const ks = (o: Parameters<typeof pieceActions>[3]) => pieceActions(mine, 'keys', true, o).filter((a) => a.k === 'melody').map((a) => (a as { mode: string }).mode);
    expect(ks({ melody: true, strong: 'page' })).toEqual(['page', 'ear']);
    expect(ks({ melody: true, strong: 'ear' })).toEqual(['ear', 'page']);
    expect(ks({})).toEqual([]);
    expect(pieceActions(std, 'keys', true).some((a) => a.k === 'transcribe')).toBe(true);
    expect(pieceActions(mine, 'keys', true).some((a) => a.k === 'transcribe')).toBe(false);
  });
  it('the piece\'s keys: every V → I, in order', () => {
    expect(pieceKeys('Cm7 F7 | Bbmaj7 | Am7b5 D7 | Gm6')).toEqual([{ root: 10, minor: false }, { root: 7, minor: true }]);
    expect(pieceKeys('Cmaj7 | Am7 | Dm7 | Fmaj7')).toEqual([{ root: 5, minor: false }]);
  });
  it('the licks of mine that fit the piece (Improvise on it), today\'s lick first; not the cells', () => {
    const pool = LICKS.filter((l) => l.ctx === 'major-251').slice(0, 4);
    const fits = licksThatFit(pool, 'Dm7 | G7 | Cmaj7 | Cmaj7 | Em7 | A7 | Dm7 | G7', { today: pool[2].id });
    expect(fits.length).toBeGreaterThan(0);
    expect(fits[0].lick.id).toBe(pool[2].id);
    expect(fits[0].bars).toContain(1);
    expect(licksThatFit([], 'Dm7 | G7 | C')).toEqual([]);
  });
});

describe('"now improvise with it" after a lick closes in the key (SPEC-LICKS-IN-IMPROV §5.4)', () => {
  it('the most recently closed lick within three days', () => {
    const now = Date.parse('2026-11-23T12:00:00Z');
    const a = LICKS[0], b = LICKS[1];
    const st = (last: string) => ({ last }) as ItemState;
    expect(closedRecently([{ l: a, st: st('2026-11-22T10:00:00Z'), closed: true }, { l: b, st: st('2026-11-23T09:00:00Z'), closed: true }], now)?.id).toBe(b.id);
    expect(closedRecently([{ l: a, st: st('2026-11-10T10:00:00Z'), closed: true }], now)).toBeNull();
    expect(closedRecently([{ l: a, st: st('2026-11-23T10:00:00Z'), closed: false }], now)).toBeNull();
  });
});

// ───────────────────────────── after the merge (2026-11-23): the left-out items ─────────────────────────────
import { repDueKey, REP_REVIEW_DAYS } from '../src/engine/repLibrary';
import { repertoireFor, repLessonId } from '../src/engine/repertoire';
import { suggestWorkout } from '../src/engine/workout2';
import { buildPath } from '../src/engine/path';
import { phraseOfLick, phrasesOfMelody } from '../src/engine/transcribe';
import { readFileSync } from 'node:fs';

describe('the Repertoire workout block offers a piece due for review (SPEC-PRACTICE-IA-3 §5)', () => {
  const it0 = repertoireFor('keys')[0];
  const run = (day: string) => ({ lessonId: repLessonId('keys', it0.id), completedAt: `${day}T10:00:00Z`, firstTry: 10, total: 10 });
  const hist = [run('2026-11-01'), run('2026-11-01'), run('2026-11-02')];
  it('a closed road piece comes back after a week; not before; never an open one', () => {
    expect(repDueKey(hist, 'keys', '2026-11-12')).toBe(`rep:keys:${it0.id}`);
    expect(repDueKey(hist, 'keys', '2026-11-05')).toBeNull();
    expect(repDueKey(hist.slice(0, 1), 'keys', '2026-11-30')).toBeNull();
    expect(REP_REVIEW_DAYS).toBe(7);
  });
  it('the workout adds a short review block that opens the piece (the score coach first when a score is due)', () => {
    const view = buildPath({ track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 20, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-12T12:00:00Z') });
    const base = { total: 15, goal: 'general' as const, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view };
    const rep = suggestWorkout({ ...base, repDue: 'rep:keys:x' }).find((b) => b.target.kind === 'game' && b.target.game === 'rep-review');
    expect(rep).toMatchObject({ minutes: 3, target: { piece: 'rep:keys:x' } });
    const both = suggestWorkout({ ...base, repDue: 'rep:keys:x', piecesDue: 1 });
    expect(both.some((b) => b.target.kind === 'game' && b.target.game === 'pieces')).toBe(true);
  });
});

describe('Transcribe a phrase loads the piece (SPEC-PRACTICE-IA-3 §7)', () => {
  it('a melody in two-bar phrases, each from its bar', () => {
    const notes = Array.from({ length: 16 }, (_, b) => ({ midi: 60 + (b % 4), beat: b, dur: 1 }));
    const ps = phrasesOfMelody({ id: 'song', title: { en: 'Song', he: 'שיר' }, notes, key: 0, bpm: 100 });
    expect(ps).toHaveLength(2);
    expect(ps[1].notes[0]).toMatchObject({ beat: 0, midi: 60 });
    expect(ps[0]).toMatchObject({ level: 4, source: 'public-domain' });
  });
  it('a chords-only standard: one of the app\'s licks over its chords, in the key it fits', () => {
    const p = phraseOfLick(LICKS[0], 5);
    expect(p).toMatchObject({ key: 5, source: 'lick', chords: LICKS[0].chords });
    expect(p.notes).toHaveLength(LICKS[0].notes.length);
  });
});

describe('the rotation\'s lead sheet from memory; the Licks page in the strong channel; the day key with minor weeks', () => {
  const src = (p: string) => readFileSync(`src/${p}`, 'utf8');
  it('ScaleRotation hides the chords while playing from memory; the now-cue cell stays', () => {
    const s = src('ui/ScaleRotation.tsx');
    expect(s).toContain('hidden={memory && running}');
    expect(s).toContain("i === now ? ' now' : ''");
    expect(s).toContain('data-rs-memory="1"');
  });
  it('LickTrainer orders the two ways by the profile and reads the week key with its group', () => {
    const s = src('ui/LickTrainer.tsx');
    expect(s).toContain('strongOf(profileOf(items');
    expect(s).toContain("dayKeyIfKept(inst === 'voice' ? 'piano' : inst)");
    expect(s).not.toContain("weekKeyIfKept('major'");
  });
});
