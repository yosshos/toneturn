// Small leftovers (DRUMS_NICHE_PLAN "Not built", guitar, bass): game badges and quests, the foot splash, the drum
// speed records, the drum-style topic, the guitar trade's model line.
import { describe, expect, it } from 'vitest';
import { BADGES, BADGE_BY_ID, badgeInCourse } from '../src/engine/badges';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { resolveGlyph } from '../src/ui/BadgeArt';
import { dailyQuests, ADV_QUEST_GAMES, DRUM_QUEST_GAMES } from '../src/engine/quests';
import { pedalKind, splashCheck, withSplash } from '../src/engine/drills/drumSplash';
import { levelRecord, rushTopBpm } from '../src/engine/drumRecords';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import { stepCatalogue } from '../src/engine/path';
import { TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { families, levelDrills } from '../src/engine/drills/plan';
import type { Drill, ItemState, TakeMetrics } from '../src/engine/drills/types';
import type { GameTiers } from '../src/engine/gameTiers';
import { buildChord, cadenceMotion, cadenceRunDetail, CADENCES, checkHeld, closeVoicings, voiceCadence } from '../src/engine/chordBuilder';
import { identifyChord } from '../src/engine/chordFinder';

describe('game badges', () => {
  it('three per game (mp, f, ff), drawn, no emoji, in the right course', () => {
    expect(GAME_BADGE_GAMES.length).toBe(12);
    for (const g of GAME_BADGE_GAMES)
      for (const t of ['mp', 'f', 'ff']) {
        const b = BADGE_BY_ID[`special:game:${g.game}:${t}`];
        expect(b, `${g.game}:${t}`).toBeDefined();
        expect(b.name.en).not.toMatch(/\p{Extended_Pictographic}/u);
        const r = resolveGlyph(b);
        expect(r.fallback).toBe(false);
        expect(r.key).toBe(`special:game:${g.game}`);
        expect(badgeInCourse(b, g.course)).toBe(true);
      }
    expect(new Set(GAME_BADGE_GAMES.map((g) => resolveGlyph({ id: `special:game:${g.game}:f`, cat: 'special' }).glyph)).size).toBe(12);
    expect(badgeInCourse(BADGE_BY_ID['special:game:time-lock:f'], 'drums')).toBe(true);
    expect(badgeInCourse(BADGE_BY_ID['special:game:time-lock:f'], 'jazz')).toBe(false);
  });
  it('earned by the tier cleared', () => {
    const tiers: GameTiers = { 'time-lock': { cleared: 'f', recent: {}, best: {}, runs: 3 } };
    const b = (id: string) => BADGES.find((x) => x.id === id)!.rule({ today: '2026-11-12', gameTiers: tiers });
    expect(b('special:game:time-lock:mp').done).toBe(true);
    expect(b('special:game:time-lock:f').done).toBe(true);
    expect(b('special:game:time-lock:ff').done).toBe(false);
    expect(b('special:game:polylock:mp').done).toBe(false);
  });
});

describe('game quests', () => {
  const day = '2026-11-12';
  const at = new Date(2026, 10, 12, 10).toISOString();
  it('the drum-game quest counts only the drum games; the advanced one only the 8 advanced games', () => {
    expect(DRUM_QUEST_GAMES).toContain('rudiment-rush');
    expect(ADV_QUEST_GAMES.length).toBe(8);
    // Find a day whose quests include drumGame for the drums course.
    let found = false;
    for (let d = 1; d <= 28 && !found; d++) {
      const dd = `2026-11-${String(d).padStart(2, '0')}`;
      const qs = dailyQuests({ day: dd, course: 'drums', events: [], sessions: [], stepsToday: 0, minutesToday: 0, tierRuns: [{ game: 'time-lock', tier: 'mp', pass: true, at: new Date(2026, 10, d, 10).toISOString() }, { game: 'rush-chord', tier: 'mp', pass: true, at: new Date(2026, 10, d, 10).toISOString() }] });
      const q = qs.find((x) => x.id === 'drumGame');
      if (q) {
        found = true;
        expect(q.now).toBe(1);
      }
    }
    expect(found).toBe(true);
    void day;
    void at;
  });
});

describe('foot splash vs chick', () => {
  it('by the CC4 stream: the hats open after a splash, stay closed after a chick; nothing sent = not measured', () => {
    const cc = [{ at: 0, open: 0 }, { at: 1080, open: 0.8 }, { at: 1300, open: 0 }];
    expect(pedalKind({ on: 1000 }, cc)).toBe('splash');
    expect(pedalKind({ on: 2000 }, cc)).toBe('chick');
    expect(pedalKind({ on: 2000 }, [])).toBeNull();
  });
  it("by the kit's own splash note", () => {
    const kit = { preset: 'yamaha' as const, map: {} };
    expect(pedalKind({ on: 0, note: 83 }, [], kit)).toBe('splash');
    expect(pedalKind({ on: 0, note: 44 }, [], kit)).toBe('chick');
  });
  it('d-feet 5 asks for splashes; chicks fail a clean take, an unmeasured kit keeps the verdict', () => {
    const lv = families('drums').find((f) => f.id === 'd-feet')!.levels.find((l) => l.level === 5)!;
    const d: Drill = levelDrills(lv, 'fifths-up')[0];
    expect(d.goal.drum?.splash?.share).toBe(0.8);
    const bpm = d.startBpm;
    const beatMs = 60000 / bpm;
    const pedal = d.notes.filter((n) => n.voice === 'hhPedal').map((n) => ({ on: n.beat * beatMs }));
    const opens = pedal.map((p) => ({ at: p.on + 100, open: 0.9 }));
    expect(splashCheck(d, bpm, pedal, opens)!.ok).toBe(pedal.length);
    const m = { verdict: 'clean', why: { en: '', he: '' }, drum: { missed: [] } } as unknown as TakeMetrics;
    expect(withSplash(m, d, bpm, pedal, [{ at: 0, open: 0 }]).verdict).toBe('not');
    const un = withSplash(m, d, bpm, pedal, []);
    expect(un.verdict).toBe('clean');
    expect(un.drum?.splash?.measured).toBe(false);
  });
});

describe('drum speed records', () => {
  it('the fastest clean take of the level and its day; Rudiment Rush keeps the fastest passed round', () => {
    const row = [{ itemId: 'a' }, { itemId: 'b' }] as Drill[];
    const st = (bpm: number): ItemState => ({ itemId: 'x', family: 'd-feet', key: 0, hands: 'RL', cleanBpm: bpm, goalBpm: bpm, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '', history: [{ at: '2026-11-10T10:00:00.000Z', bpm, cv: 0.05 }] });
    expect(levelRecord(row, {}, () => 100)).toBeNull();
    const r = levelRecord(row, { a: st(90), b: st(104) }, () => 110)!;
    expect(r).toMatchObject({ bpm: 104, variant: 2, target: 110, day: '2026-11-10' });
    expect(rushTopBpm([{ ok: true, bpm: 90 }, { ok: false, bpm: 120 }, { ok: true, bpm: 100 }])).toBe(100);
    expect(rushTopBpm([])).toBe(0);
  });
});

describe('drum-style topic', () => {
  it('four levels, drums only, a band (drums + bass + comping) in every item, the answer among the choices', () => {
    const T = TOPIC_GEN['drum-style'];
    expect(T.levels.length).toBe(4);
    expect(T.forPlays).toEqual(['drums']);
    for (let level = 1; level <= 4; level++)
      for (let seed = 1; seed < 30; seed++) {
        const q = T.gen(seed, level, 'x');
        if (q.kind !== 'choice') throw new Error('choice');
        expect(q.choices).toContain(q.answer);
        expect(q.choices.length).toBe(4);
        const s = q.stimulus[0];
        if (s.kind !== 'events') throw new Error('events');
        expect(s.events.some((e) => e.perc === 'kick')).toBe(true);
        expect(s.events.some((e) => e.inst === 'bass')).toBe(true);
      }
    expect(stepCatalogue().some((s) => s.id === 'topic:drum-style:1')).toBe(true);
    expect(TOPIC_GLYPH['drum-style']).toBeDefined();
  });
});

describe('guitar trade model line', () => {
  it('g-impro 7 carries a model line with neck positions', () => {
    const lv = families('guitar').find((f) => f.id === 'g-impro')!.levels.find((l) => l.level === 7)!;
    const d = levelDrills(lv, 'fifths-up')[0];
    const model = d.goal.free!.model;
    expect(model.length).toBeGreaterThan(8);
    for (const n of model) {
      expect(n.string).toBeGreaterThanOrEqual(1);
      expect(n.fret).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('chord & cadence builder', () => {
  it('builds a chord in root position, names tapped notes in any inversion', () => {
    expect(buildChord(0, 'maj7')).toEqual([48, 52, 55, 59]);
    expect(buildChord(2, '9')).toEqual([50, 54, 57, 60, 64]);
    expect(identifyChord([52, 55, 60])).toMatchObject({ root: 0, quality: 'M', bass: 4 });
    expect(closeVoicings([0, 4, 7]).length).toBe(3);
  });
  it('every cadence in every key, major and minor: right chords, small moves, a guitar shape', () => {
    for (const c of CADENCES)
      for (let k = 0; k < 12; k++)
        for (const minor of [false, true]) {
          const cs = voiceCadence(c.id, k, minor);
          expect(cs.length).toBe(c.chords[minor ? 'minor' : 'major'].length);
          for (const x of cs) {
            expect(x.upper.every((m) => m >= 55 && m <= 80)).toBe(true);
            expect(x.bass).toBeGreaterThanOrEqual(36);
            expect(x.bass).toBeLessThan(48);
            expect(x.shape, `${c.id} ${k} ${x.symbol}`).not.toBeNull();
          }
          // Each move between chords stays small (no voice jumps an octave).
          expect(cadenceMotion(cs) / Math.max(1, cs.length - 1)).toBeLessThanOrEqual(12);
        }
    expect(voiceCadence('two-five-one', 0).map((x) => x.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']);
    expect(voiceCadence('backdoor', 0).map((x) => x.symbol)).toEqual(['Fm7', 'B♭7', 'Cmaj7']);
    expect(voiceCadence('deceptive', 0, true).map((x) => x.symbol)).toEqual(['Fm', 'G7', 'A♭']);
  });
  it('a held chord: all tones, nothing else, the 5th of a 7th chord may be left out', () => {
    expect(checkHeld([50, 53, 57, 60], { root: 2, quality: 'm7' }).ok).toBe(true);
    expect(checkHeld([50, 53, 60], { root: 2, quality: 'm7' }).ok).toBe(true);
    expect(checkHeld([50, 53, 57, 61], { root: 2, quality: 'm7' }).ok).toBe(false);
    expect(checkHeld([48, 52], { root: 0, quality: 'M' }).ok).toBe(false);
    const r = cadenceRunDetail([true, false, true], 'midi', 'two-five-one', 0, false);
    expect(r.detail).toMatchObject({ right: 2, wrong: 1, tier: 'mf' });
  });
});
