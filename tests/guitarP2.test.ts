// GUITAR_DEEPENING P2: the chord recognizer in Chord Rush (played) and the neck topics, comping a standard's whole
// chart (g-jazz 13, the repertoire's guitar standards), the lick quest in the guitar course.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog, MAX_FRET } from '../src/engine/drills/guitar';
import { decodeGuitarStd, GUITAR_STD, guitarStdOption, guitarStdTempo } from '../src/engine/drills/guitarJazz';
import { standardIdOfSpec } from '../src/engine/drills/standardRef';
import { parseChart } from '../src/engine/charts';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { repertoireFor } from '../src/engine/repertoire';
import { isDrillWay, repDrills } from '../src/engine/repertoireDrills';
import { ladderOf, newRush, currentItem, rushAnswer, rushResult, strumTarget, PLAY_LEVELS } from '../src/engine/rush';
import { candidatePcs, QUALITY_INTS } from '../src/engine/chordRecognize';
import { heardMidis, identifyChord } from '../src/engine/chordFinder';
import { genTopic } from '../src/engine/topicKit';
import '../src/engine/topics';
import { dailyQuests } from '../src/engine/quests';
import type { DrillSpec } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;

describe('Chord Rush, played (strum it)', () => {
  it('has its own five-level ladder; every item is a chord with a shape and the target first in its closed set', () => {
    expect(ladderOf({ mode: 'chord', picture: 'play' }).length).toBe(PLAY_LEVELS.length);
    for (let lv = 1; lv <= PLAY_LEVELS.length; lv++)
      for (let seed = 1; seed < 40; seed++) {
        const t = strumTarget(seed * 7919, lv);
        expect(t.candidates[t.answer]).toEqual({ root: t.chord.root, quality: t.chord.quality });
        expect(t.shape, `${t.symbol}`).toBeDefined();
        // The hint shape plays the asked chord.
        for (const m of t.shape!.midis) expect(candidatePcs(t.chord)).toContain(pc(m));
        if (lv === 1) expect(['M', 'm']).toContain(t.chord.quality);
      }
  });
  it('a run deals strum items, scores like any Chord Rush, and marks the result as played', () => {
    let s = newRush({ mode: 'chord', seed: 42, startLevel: 1, picture: 'play' });
    expect(currentItem(s).kind).toBe('strum');
    for (let i = 0; i < 6; i++) s = rushAnswer(s, true).state;
    expect(s.level).toBe(2);
    expect(rushResult(s).detail.played).toBe(true);
    expect(rushResult(newRush({ mode: 'chord', seed: 1, startLevel: 1, picture: 'neck' })).detail.played).toBeUndefined();
  });
});

describe('fret-chords answered by strumming', () => {
  it('every chord built on the neck (levels 2, 4, 5) spells a chord the recognizer knows; a wrong strum never grades right', () => {
    for (const level of [2, 4, 5])
      for (let seed = 1; seed < 30; seed++) {
        const q = genTopic('fret-chords', seed, level, `t${seed}`);
        if (q.kind !== 'place') continue;
        const c = identifyChord(q.target);
        expect(c, `${level} ${q.target.join(',')}`).not.toBeNull();
        const set = new Set(QUALITY_INTS[c!.quality].map((i) => pc(c!.root + i)));
        expect(new Set(q.target.map(pc))).toEqual(set);
        // A heard chord entered as notes differs from the target's notes.
        const other = { root: c!.root, quality: c!.quality === 'm' ? ('M' as const) : ('m' as const) };
        expect(heardMidis(other, q.target).sort().join()).not.toBe([...q.target].sort().join());
      }
  });
});

describe('comp a whole standard (g-jazz 13)', () => {
  const lv = guitarCatalog().find((f) => f.id === 'g-jazz')!.levels.find((l) => l.level === 13)!;
  it('is a jazz level with one item per guitar standard, each at its own tempo, grade 7', () => {
    expect(lv).toBeDefined();
    expect(lv.specs.length).toBe(GUITAR_STD.length);
    expect(lv.grade).toBe(7);
    for (const s of lv.specs) {
      const { id } = decodeGuitarStd(s.option!);
      expect(s.tempo).toBe(guitarStdTempo(id)[0]);
      expect(standardIdOfSpec(s as DrillSpec)).toBe(id);
    }
  });
  it('comps every chord of the whole chart: chart bars, a hit inside each chord, only chord tones, playable frets', () => {
    for (const x of GUITAR_STD)
      for (const voicing of ['shell', 'drop2'] as const)
        for (const key of [0, 5]) {
          const d = generate({ family: 'g-jazz', kind: 'comp-chart', key, hands: 'R', instrument: 'guitar', option: guitarStdOption(x.id, voicing)! } as DrillSpec);
          const std = STANDARD_CHANGES.find((s) => s.id === x.id)!;
          const p = parseChart(std.text);
          const bars = Math.max(...p.chords.map((c) => c.bar + 1));
          expect(d.chart?.length, x.id).toBe(bars);
          expect(d.band?.bass).toBe(true);
          for (const c of p.chords) {
            const from = c.bar * 4 + c.at;
            const hit = d.notes.filter((n) => n.beat >= from - 1e-6 && n.beat < from + c.beats - 1e-6);
            expect(hit.length, `${x.id} bar ${c.bar}`).toBeGreaterThan(0);
            const tones = new Set(c.iv.map((i) => pc(c.root + key + i)));
            for (const n of hit) expect(tones.has(pc(n.pitch)) || [9].includes(pc(n.pitch - c.root - key)), `${x.id} ${voicing} bar ${c.bar}: ${n.pitch}`).toBe(true);
          }
          for (const n of d.notes) expect(n.fret ?? 0).toBeLessThanOrEqual(MAX_FRET);
        }
  });
  it('the repertoire opens the standard itself first, and its drill is the level item (same progress)', () => {
    const items = repertoireFor('guitar').filter((x) => x.ref?.kind === 'standard' && x.tier >= 2);
    expect(items.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(lv.specs.map((s) => generate({ ...s, key: 0 } as DrillSpec).itemId));
    for (const it of items) {
      const w = it.ways[0];
      expect(w.k, it.id).toBe('guitarStd');
      expect(isDrillWay(w)).toBe(true);
      const [d] = repDrills(w, 'guitar');
      expect(d, it.id).toBeDefined();
      expect(ids.has(d.itemId), `${it.id} ${d.itemId}`).toBe(true);
    }
  });
});

describe('quests: three clean lick takes in the guitar course', () => {
  it('lick3 is in the guitar rotation and counts clean lick takes', () => {
    const at = '2026-11-14T10:00:00';
    const events = [0, 1, 2].map((i) => ({ id: `g:lick:ii-v-${i}`, at, skill: 'instrument', correct: true }));
    const days = Array.from({ length: 12 }, (_, i) => `2026-11-${String(10 + i).padStart(2, '0')}`);
    const all = days.flatMap((day) => dailyQuests({ day, course: 'guitar', events: events.map((e) => ({ ...e, at: `${day}T10:00:00` })) as never[], sessions: [], stepsToday: 0, minutesToday: 0 }));
    const q = all.find((x) => x.id === 'lick3');
    expect(q).toBeDefined();
    expect(q!.now).toBe(3);
  });
});
