// PIANO_AUDIT §3–§4: the pianist's ear (k-ear), the piano's own path topics, and how they are wired (path symbols and
// order, badges, rating, placement, hub).
import { describe, expect, it } from 'vitest';
import { catalog, generate, KEYS_EAR_PROBE, KEYS_EAR_TEMPO } from '../src/engine/drills/generate';
import { analyzeTake } from '../src/engine/drills/analyze';
import { activeFamilies, levelDrills, shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { drillEvents } from '../src/engine/drills/events';
import { DEFAULT_DRILL_SETTINGS, type Drill } from '../src/engine/drills/types';
import { courseInput } from '../src/engine/courses';
import { eligible, KEYS_LATER, stepCatalogue, type PathInput } from '../src/engine/path';
import { TOPIC_GEN } from '../src/engine/topics';
import type { PlaceQuestion } from '../src/engine/lesson';
import { ladderFamiliesFor } from '../src/engine/ladderFacts';
import { FAMILY_GLYPH, GAME_STEP_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES, badgeInCourse, keysEarClean, KEYS_EAR_ITEMS } from '../src/engine/badges';
import { LESSONS, UNITS } from '../src/content/mini/instrument';
import { humanTake } from './pianoTake';

const EAR = catalog().find((f) => f.id === 'k-ear')!;
const ear = (): Drill[] => EAR.levels.flatMap((lv) => levelDrills(lv, 'fifths-up'));
const pc = (m: number) => ((m % 12) + 12) % 12;
const inWin = (d: Drill, beat: number) => d.listen!.windows.some(([a, b]) => beat >= a - 1e-6 && beat < b - 1e-6);

describe("the pianist's ear: content", () => {
  it('has 9 levels and 17 items (kind × option), each with a call, hidden answers and calm tempo', () => {
    expect(EAR.levels.length).toBe(9);
    expect(new Set(EAR.levels.flatMap((l) => l.specs.map((s) => `${s.kind}:${s.option ?? 0}`))).size).toBe(KEYS_EAR_ITEMS);
    for (const d of ear()) {
      expect(d.show).toBe('none');
      expect(d.listen!.notes.length).toBeGreaterThan(0);
      expect(d.startBpm).toBe(KEYS_EAR_TEMPO[0]);
      expect(d.title.he).not.toMatch(/[A-Za-z]{3,}/);
    }
  });
  it('every call note sits inside a listening window and every answer note outside, after its call', () => {
    for (const d of ear()) {
      for (const n of d.listen!.notes) expect(inWin(d, n.beat), `${d.itemId} call @${n.beat}`).toBe(true);
      for (const n of d.notes) expect(inWin(d, n.beat), `${d.itemId} answer @${n.beat}`).toBe(false);
      expect(Math.min(...d.notes.map((n) => n.beat))).toBeGreaterThan(Math.min(...d.listen!.notes.map((n) => n.beat)));
      for (const n of d.notes) expect(n.pitch, d.itemId).toBeGreaterThanOrEqual(28);
    }
  });
  it('echo, intervals: the answer is the call, note for note', () => {
    for (const d of ear().filter((x) => ['echo-note', 'echo-motif', 'echo-melody', 'intervals'].includes(x.spec.kind))) {
      const call = d.listen!.notes.filter((n) => n.midi.length === 1 || d.spec.kind === 'intervals').flatMap((n) => n.midi);
      const ans = d.notes.map((n) => n.pitch);
      for (const p of ans) expect(call.map(pc), d.itemId).toContain(pc(p));
    }
  });
  it('the bass line answers each chord’s lowest note; a progression by ear answers its chords', () => {
    for (const d of ear().filter((x) => x.spec.kind === 'bass-line')) {
      const lows = d.listen!.notes.map((n) => pc(Math.min(...n.midi)));
      expect(d.notes.map((n) => pc(n.pitch))).toEqual(lows);
      expect(d.notes.every((n) => n.hand === 'L')).toBe(true);
    }
    for (const d of ear().filter((x) => x.spec.kind === 'chords')) {
      const sets = d.goal.chordSets!;
      const calls = d.listen!.notes.map((n) => [...new Set(n.midi.map(pc))].sort((a, b) => a - b));
      expect(sets.map((s) => s.required)).toEqual(calls);
    }
  });
  it('harmonise: each melody note fits only one of I, IV, V, and the answer is that chord', () => {
    for (const d of ear().filter((x) => x.spec.kind === 'harmonise')) {
      const k = d.spec.key;
      const I = [0, 4, 7].map((x) => pc(k + x));
      const IV = [5, 9, 0].map((x) => pc(k + x));
      const V = [7, 11, 2].map((x) => pc(k + x));
      d.listen!.notes.forEach((n, i) => {
        const m = pc(n.midi[0]);
        const fits = [I, IV, V].filter((c) => c.includes(m));
        expect(fits.length, `${d.itemId} note ${i}`).toBe(1);
        expect(d.goal.chordSets![i].required).toEqual([...fits[0]].sort((a, b) => a - b));
      });
    }
  });
  it('transpose: the answer is the call a 5th (op 0) or a 4th (op 1) up, and the ask names the new key', () => {
    for (const d of ear().filter((x) => x.spec.kind === 'transpose')) {
      const melody = d.listen!.notes.filter((n) => n.midi.length === 1).map((n) => n.midi[0]);
      const up = d.spec.option === 1 ? 5 : 7;
      expect(d.notes.map((n) => pc(n.pitch))).toEqual(melody.map((m) => pc(m + up)));
    }
  });
});

describe("the pianist's ear: measured by what is played", () => {
  it('a steady answer is clean at the start and the target tempo; an octave up still counts (any octave)', () => {
    for (const lv of EAR.levels)
      for (const d of levelDrills(lv, 'fifths-up').slice(0, 4)) {
        for (const bpm of [d.startBpm, targetBpmOf(lv, d)]) expect(analyzeTake(d, bpm, humanTake(d, bpm, 9, 3)).verdict, `${d.itemId}@${bpm}`).toBe('clean');
        expect(analyzeTake(d, d.startBpm, humanTake(d, d.startBpm, 9, 3, 12)).verdict, `${d.itemId} 8va`).toBe('clean');
      }
  });
  it('a wrong note, or no answer at all, never passes', () => {
    for (const d of ear().slice(0, 30)) {
      const take = humanTake(d, 72, 6, 2);
      take[Math.floor(take.length / 2)] = { ...take[Math.floor(take.length / 2)], pitch: take[Math.floor(take.length / 2)].pitch + 1 };
      expect(analyzeTake(d, 72, take).verdict, d.itemId).not.toBe('clean');
      expect(analyzeTake(d, 72, []).verdict).toBe('not');
    }
  });
  it('rates the instrument and the ear skill the level trains', () => {
    const tag = (kind: string, option?: number) => drillEvents(generate({ family: 'k-ear', kind, key: 0, hands: 'R', option }), analyzeTake(generate({ family: 'k-ear', kind, key: 0, hands: 'R', option }), 72, []), 'now', 's', 0)[0].tags![1].sub;
    expect(tag('echo-melody')).toBe('sequences/melody');
    expect(tag('intervals', 2)).toBe('intervals/harmonic');
    expect(tag('bass-line')).toBe('dictation/bass');
    expect(tag('harmonise')).toBe('cadences/harmonize');
    expect(tag('transpose')).toBe('transpose/pitch');
  });
  it("a new piano player's Today has ear items with every emphasis", () => {
    for (const emphasis of ['classical', 'jazz', 'both'] as const) expect(activeFamilies({ ...DEFAULT_DRILL_SETTINGS, emphasis, instrument: 'piano' }, {}).map((f) => f.id)).toContain('k-ear');
  });
  it('the placement probe is a real ear item', () => {
    const d = generate(KEYS_EAR_PROBE);
    expect(d.listen).toBeDefined();
    expect(analyzeTake(d, 72, humanTake(d, 72, 6)).verdict).toBe('clean');
  });
});

const base: PathInput = {
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: null,
  leaveOut: [],
  packs: [],
  plays: [],
  minutes: 10,
  ratings: {} as PathInput['ratings'],
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now: new Date('2026-11-10T10:00:00Z'),
};
const keysSteps = () => stepCatalogue().filter((s) => eligible(s, { ...courseInput(base, 'keys'), ladderFamilies: ladderFamiliesFor('keys', DEFAULT_DRILL_SETTINGS) }));

describe('the keys path', () => {
  it("has the pianist's ear in every emphasis, and the three new piano topics", () => {
    for (const emphasis of ['classical', 'jazz', 'both'] as const) expect(shownFamilies({ emphasis }).map((f) => f.id)).toContain('k-ear');
    const topics = new Set(keysSteps().filter((s) => s.topic).map((s) => s.topic));
    for (const t of ['key-notes', 'key-read', 'key-shapes', 'key-scales']) expect(topics.has(t), t).toBe(true);
    expect(keysSteps().some((s) => s.ladder?.family === 'k-ear')).toBe(true);
  });
  it('no two kinds of step on the keys path share a symbol, and every symbol is drawn', () => {
    const seen = new Map<string, string>();
    const kinds = new Set<string>();
    for (const s of keysSteps()) {
      const key = s.ladder ? `family ${s.ladder.family}` : s.topic ? `topic ${s.topic}` : null;
      if (!key || kinds.has(key)) continue;
      kinds.add(key);
      const g = s.ladder ? FAMILY_GLYPH[s.ladder.family] : TOPIC_GLYPH[s.topic!];
      expect(g, key).toBeDefined();
      expect(GLYPHS[g], `${key}: ${g}`).toBeDefined();
      expect(seen.get(g), `${key} and ${seen.get(g)} share '${g}'`).toBeUndefined();
      seen.set(g, key);
    }
    // The games that sit in a keys unit don't reuse a family's or topic's symbol either.
    for (const game of ['rush-note', 'rush-chord', 'rush-keysig', 'highway', 'melodypuzzle']) expect(seen.has(GAME_STEP_GLYPH[game]), `${game}: ${GAME_STEP_GLYPH[game]} ↔ ${seen.get(GAME_STEP_GLYPH[game])}`).toBe(false);
    expect(kinds.size).toBeGreaterThanOrEqual(15);
  });
  it('the basics come first: advanced, Barry Harris, jazz lines and voicings start after the first scale levels', () => {
    const diff = (id: string) => stepCatalogue().find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(diff('advanced-1')).toBeGreaterThan(diff('scales-5'));
    expect(diff('harris-1')).toBeGreaterThan(diff('scales-3'));
    expect(diff('voicings-1')).toBeGreaterThan(diff('scales-2'));
    expect(diff('k-ear-1')).toBe(diff('scales-1'));
    expect(KEYS_LATER['k-ear']).toBe(0);
  });
});

describe('the piano topics', () => {
  it('every item is answered on the keys and graded note for note, inside the keyboard', () => {
    for (const t of ['key-read', 'key-shapes', 'key-scales'])
      for (let lv = 1; lv <= TOPIC_GEN[t].levels.length; lv++)
        for (let seed = 1; seed <= 30; seed++) {
          const q = TOPIC_GEN[t].gen(seed, lv, `x${seed}`) as PlaceQuestion;
          expect(q.kind).toBe('place');
          expect(q.surface).toBe('keys');
          expect(q.match).toBe('exact');
          for (const m of q.target) expect(m >= 21 && m <= 108, `${t} ${lv}: ${m}`).toBe(true);
          expect(q.ask.he).not.toMatch(/\b(Build|Find|Play|the)\b/);
        }
  });
  it('the shapes are right: a minor triad in 1st inversion, a shell with the 3rd on top, a melodic minor scale', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = TOPIC_GEN['key-shapes'].gen(seed, 3, 'x') as PlaceQuestion;
      const iv = q.target.map((m) => m - q.target[0]);
      expect([[0, 3, 8], [0, 4, 9], [0, 5, 9], [0, 5, 8], [0, 3, 9], [0, 6, 9], [0, 4, 8], [0, 3, 6]].map(String)).toContain(String(iv));
      const s = TOPIC_GEN['key-scales'].gen(seed, 4, 'x') as PlaceQuestion;
      expect(s.target.map((m) => m - s.target[0])).toEqual([0, 2, 3, 5, 7, 9, 11, 12]);
    }
  });
  it('the reading topic draws the note on the clef it names', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const q = TOPIC_GEN['key-read'].gen(seed, 2, 'x') as PlaceQuestion;
      expect(q.given?.clef).toBe('bass');
      expect(q.target[0]).toBeLessThan(60);
      const t = TOPIC_GEN['key-read'].gen(seed, 1, 'x') as PlaceQuestion;
      expect(t.given?.clef).toBe('treble');
      expect(t.target[0]).toBeGreaterThanOrEqual(60);
    }
  });
  it('each new topic has its quick lesson, without emoji', () => {
    for (const t of ['key-read', 'key-shapes', 'key-scales']) {
      const l = LESSONS.find((x) => x.id === UNITS[`topic:${t}`]);
      expect(l, t).toBeDefined();
      expect(JSON.stringify(l)).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("the pianist's ear: badges", () => {
  it('three milestones in the keys course, counted by different items played back clean', () => {
    const bs = BADGES.filter((b) => b.id.startsWith('tech:k-ear:'));
    expect(bs.length).toBe(3);
    for (const b of bs) expect(badgeInCourse(b, 'keys') && !badgeInCourse(b, 'drums')).toBe(true);
    expect(keysEarClean({ 'k-ear:echo-motif:0:R': 72, 'k-ear:echo-motif:7:R': 72, 'k-ear:echo-motif:0:R:op1': 80, 'scales:scale:0:R': 66 })).toBe(2);
  });
});
