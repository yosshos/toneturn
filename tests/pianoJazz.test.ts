// PIANO_JAZZ (2026-11-10): Barry Harris harmony, bebop lines and trading fours, jazz-piano harmony — the content (rules,
// voicings), the measurement (landings in free bars) and the synthetic human-take sweep (steady passes at the target
// tempo, sloppy never), plus how the new families are wired (path, symbols, badges, rating, hub, placement, topics).
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { analyzeTake, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { levelDrills, shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { drillEvents } from '../src/engine/drills/events';
import type { Drill, PlayedNote } from '../src/engine/drills/types';
import { stepCatalogue } from '../src/engine/path';
import { TOPIC_GEN } from '../src/engine/topics';
import type { PlaceQuestion } from '../src/engine/lesson';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES, badgeInCourse } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { humanTake, steadySd } from './pianoTake';

const CAT = catalog();
const NEW = ['k-sixdim', 'k-bebop', 'k-reharm'] as const;
const pc = (m: number) => ((m % 12) + 12) % 12;
const jazzLevels = () => CAT.flatMap((f) => f.levels.filter((lv) => (NEW as readonly string[]).includes(f.id) || lv.id === 'harris-14' || lv.id === 'harris-15'));
const lvl = (id: string) => CAT.flatMap((f) => f.levels).find((l) => l.id === id)!;
const allKeys = (d: { spec: Drill['spec'] }) => Array.from({ length: 12 }, (_, key) => generate({ ...d.spec, key }));

describe('PIANO_JAZZ content', () => {
  it('three new families (9 + 8 + 7 levels) and two more Harris line levels, each item generating in every key', () => {
    expect(CAT.find((f) => f.id === 'k-sixdim')!.levels).toHaveLength(10);
    expect(CAT.find((f) => f.id === 'k-bebop')!.levels).toHaveLength(10);
    expect(CAT.find((f) => f.id === 'k-reharm')!.levels).toHaveLength(8);
    expect(CAT.find((f) => f.id === 'harris')!.levels).toHaveLength(18);
    for (const lv of jazzLevels())
      for (const sp of lv.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key });
          expect(d.notes.every((n) => n.pitch >= 21 && n.pitch <= 108 && Number.isFinite(n.beat)), d.itemId).toBe(true);
          // The hands never share a key, and the LH is never above the RH at one moment.
          for (const a of d.notes) for (const b of d.notes) if (a.hand === 'L' && b.hand === 'R' && Math.abs(a.beat - b.beat) < 1e-6) expect(a.pitch < b.pitch, `${d.itemId} b${a.beat}`).toBe(true);
        }
  });
  it('the half-step rule: C7 from the 9th is D D♭ C B B♭ A G F E …, chord tones on every beat', () => {
    const d = generate({ family: 'harris', kind: 'h14-rules', key: 0, hands: 'R', option: 0 });
    expect(d.notes.slice(0, 9).map((n) => pc(n.pitch))).toEqual([2, 1, 0, 11, 10, 9, 7, 5, 4]);
    for (const n of d.notes.filter((x) => x.beat > 0 && Number.isInteger(x.beat))) expect([0, 4, 7, 10]).toContain(pc(n.pitch));
    // C6 from the 9th: D D♭ C B A A♭ G …; Cm6 from the 9th the same with E♭.
    expect(generate({ family: 'harris', kind: 'h14-rules', key: 0, hands: 'R', option: 2 }).notes.slice(0, 7).map((n) => pc(n.pitch))).toEqual([2, 1, 0, 11, 9, 8, 7]);
  });
  it('the scale of chords: 6th chord on the 6th-chord tones, the diminished on the others, close under the melody', () => {
    for (const o of [0, 1, 2, 3]) {
      const d = generate({ family: 'k-sixdim', kind: 'sd-inversions', key: 0, hands: 'R', option: o });
      const chords = [...new Set(d.notes.map((n) => n.chordId))].map((id) => d.notes.filter((n) => n.chordId === id).map((n) => n.pitch).sort((a, b) => a - b));
      expect(chords).toHaveLength(17);
      for (const c of chords) {
        const set = new Set(c.map(pc));
        expect([[0, 4, 7, 9], [2, 5, 8, 11]].some((x) => x.every((p) => set.has(p)))).toBe(true);
        expect(c[3] - c[0]).toBeLessThan(12);
      }
      expect(pc(chords[0][3])).toBe([0, 4, 7, 9][o]);
    }
  });
  it('borrowing: one voice at a time moves by a step to a note of the diminished, the other three hold', () => {
    const d = generate({ family: 'k-sixdim', kind: 'sd-borrow', key: 0, hands: 'R', option: 0 });
    const chords = [...new Set(d.notes.map((n) => n.chordId))].map((id) => d.notes.filter((n) => n.chordId === id).map((n) => n.pitch).sort((a, b) => a - b));
    for (let i = 1; i < chords.length; i += 2) {
      const moved = chords[i].filter((p) => !chords[i - 1].includes(p));
      expect(moved).toHaveLength(1);
      expect([2, 5, 8, 11]).toContain(pc(moved[0]));
    }
  });
  it('the dominant ♭9 from the diminished: one note up a whole step gives a 7♭9 on it, which resolves a 4th up', () => {
    const d = generate({ family: 'k-sixdim', kind: 'sd-dom', key: 0, hands: 'R' });
    const chords = [...new Set(d.notes.map((n) => n.chordId))].map((id) => d.notes.filter((n) => n.chordId === id).map((n) => pc(n.pitch)));
    // First the move into the key: F → G gives G7♭9 (G B D A♭), then C6.
    expect(new Set(chords[1])).toEqual(new Set([7, 11, 2, 8]));
    expect(new Set(chords[2])).toEqual(new Set([0, 4, 7, 9]));
  });
  it('bebop lines: a chord tone of the bar on every beat, and every chord change approached by a half step or a step', () => {
    for (const lv of ['k-bebop-1', 'k-bebop-4', 'k-bebop-5', 'k-bebop-6'].map(lvl))
      for (const sp of lv.specs) {
        const d = generate({ ...sp, key: 5 });
        expect(d.goal.chordTonesOnBeats).toBe(true);
        for (const n of d.notes.filter((x) => Number.isInteger(x.beat) && x.hand === 'R')) expect(n.chordTone, `${d.itemId} b${n.beat}`).toBe(true);
        // No leaps wider than a 6th inside a line.
        const r = d.notes.filter((n) => n.hand === 'R');
        for (let i = 1; i < r.length; i++) expect(Math.abs(r[i].pitch - r[i - 1].pitch), `${d.itemId} ${i}`).toBeLessThanOrEqual(9);
      }
  });
});

describe('trading fours: landings in your bars', () => {
  const d = generate({ family: 'k-bebop', kind: 'bb-trade', key: 0, hands: 'R', option: 0, swing: true });
  const bpm = 120;
  it('the band plays four bars, you four, twice; its phrase stops a beat before yours; your notes are landings on 1 and 3', () => {
    expect(d.listen!.windows).toEqual([[0, 15], [32, 47]]);
    expect(d.listen!.notes.every((n) => d.listen!.windows.some(([a, b]) => n.beat >= a && n.beat + n.dur <= b + 1e-6))).toBe(true);
    expect(d.notes).toHaveLength(16);
    expect(d.notes.every((n) => n.land && n.land.includes(pc(n.pitch)) && n.beat % 2 === 0 && (n.beat >= 16 && n.beat < 32 || n.beat >= 48))).toBe(true);
    expect(d.show).toBe('none');
    expect(d.chart).toHaveLength(16);
  });
  it('your own line passes on any chord tone at the landings (any octave), not only the model notes', () => {
    const take = humanTake(d, bpm, 6, 3).map((p) => (d.notes.some((n) => Math.abs(p.on - n.beat * 500) < 60) ? { ...p, pitch: p.pitch + 12 } : p));
    expect(analyzeTake(d, bpm, humanTake(d, bpm, 6, 3)).verdict).toBe('clean');
    expect(analyzeTake(d, bpm, take).verdict).toBe('clean');
  });
  it('a wrong note on a landing, laying out, or a line outside the changes never passes', () => {
    const base = humanTake(d, bpm, 6, 3);
    const wrongLand = base.map((p, i) => (i === base.findIndex((q) => Math.abs(q.on - 16 * 500) < 60) ? { ...p, pitch: p.pitch + 1 } : p));
    expect(analyzeTake(d, bpm, wrongLand).verdict).not.toBe('clean');
    const quiet: PlayedNote[] = base.filter((p) => p.on < 48 * 500 - 100);
    expect(analyzeTake(d, bpm, quiet).verdict).not.toBe('clean');
    const outside = base.map((p) => (d.notes.some((n) => Math.abs(p.on - n.beat * 500) < 60) ? p : { ...p, pitch: p.pitch + 6 }));
    expect(analyzeTake(d, bpm, outside).verdict).not.toBe('clean');
  });
});

describe('PIANO_JAZZ sweep (synthetic human takes)', () => {
  it('a steady take is clean at every level target tempo in every key; a sloppy one (2 × the SD limit) never', () => {
    const bad: string[] = [];
    let n = 0;
    for (const lv of jazzLevels())
      for (const d of levelDrills(lv, 'fifths-up').flatMap(allKeys)) {
        n++;
        const bpm = targetBpmOf(lv, d);
        for (const seed of [1, 2]) {
          const m = analyzeTake(d, bpm, humanTake(d, bpm, steadySd(d, bpm), seed));
          if (m.verdict !== 'clean') bad.push(`steady ${lv.id} ${d.itemId}@${bpm} s${seed}: ${m.why.en}`);
        }
        const sd = 2 * thresholds(tempoBand(npsOf(d, bpm))).sd;
        const onsets = new Set(d.notes.map((x) => x.beat)).size;
        const seeds = onsets < 6 ? [5, 6, 7, 8] : [5];
        const clean = seeds.filter((seed) => analyzeTake(d, bpm, humanTake(d, bpm, sd, seed)).verdict === 'clean').length;
        if (clean > (onsets < 6 ? 1 : 0)) bad.push(`sloppy ${lv.id} ${d.itemId}@${bpm} ×${clean}`);
      }
    expect(n).toBeGreaterThan(500);
    expect(bad).toEqual([]);
  }, 300_000);
  it('chord levels pass by microphone (no accents to measure), lines too', () => {
    for (const id of ['k-sixdim-1', 'k-sixdim-8', 'k-reharm-1', 'k-reharm-3', 'k-bebop-1', 'k-bebop-8']) {
      const lv = lvl(id);
      const d = levelDrills(lv, 'fifths-up')[0];
      const bpm = targetBpmOf(lv, d);
      expect(analyzeTake(d, bpm, humanTake(d, bpm, 12, 2), undefined, { mic: true }).verdict, id).toBe('clean');
    }
  });
});

describe('PIANO_JAZZ wiring', () => {
  const keysSteps = () => stepCatalogue().filter((s) => s.forPlays?.includes('keys'));
  it('jazz emphasis shows the new families, classical hides them; each has its own drawn path symbol', () => {
    for (const f of NEW) {
      expect(shownFamilies({ emphasis: 'jazz' }).map((x) => x.id)).toContain(f);
      expect(shownFamilies({ emphasis: 'classical' }).map((x) => x.id)).not.toContain(f);
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
    }
    expect(new Set(NEW.map((f) => FAMILY_GLYPH[f])).size).toBe(3);
    for (const t of ['key-sixdim', 'key-jazz']) expect(GLYPHS[TOPIC_GLYPH[t]], t).toBeDefined();
  });
  it('on the path after what they build on: Harris harmony after the Harris block chords, bebop after the guide tones', () => {
    const diff = (id: string) => stepCatalogue().find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(diff('k-sixdim-1')).toBeGreaterThan(diff('harris-5'));
    expect(diff('k-bebop-1')).toBeGreaterThan(diff('jazz-1'));
    expect(diff('k-reharm-1')).toBeGreaterThan(diff('voicings-3'));
    expect(diff('k-sixdim-1')).toBeGreaterThan(diff('scales-5'));
    const topics = new Set(keysSteps().filter((s) => s.topic).map((s) => s.topic));
    expect(topics.has('key-sixdim') && topics.has('key-jazz')).toBe(true);
  });
  it('badges in the keys course and rating shares: Barry harmony, extensions / voicings / progressions, improvising', () => {
    for (const f of NEW) {
      const bs = BADGES.filter((b) => b.group === f);
      expect(bs.filter((b) => b.id.startsWith(`tech:${f}:`)).length, f).toBe(7);
      for (const b of bs) expect(badgeInCourse(b, 'keys'), b.id).toBe(true);
    }
    const tags = (d: Drill) => drillEvents(d, analyzeTake(d, 80, humanTake(d, 80, 6, 1)), '2026-11-10T00:00:00Z', 's', 0).flatMap((e) => e.tags ?? []).map((t) => t.sub);
    expect(tags(generate({ family: 'k-sixdim', kind: 'sd-dom', key: 0, hands: 'R' }))).toContain('chords/barry');
    expect(tags(generate({ family: 'k-reharm', kind: 'rh-altered', key: 0, hands: 'RL' }))).toContain('chords/extension');
    expect(tags(generate({ family: 'k-reharm', kind: 'rh-reharm', key: 0, hands: 'RL' }))).toContain('cadences/progression');
    expect(tags(generate({ family: 'k-bebop', kind: 'bb-251', key: 0, hands: 'R', swing: true }))).toContain('improv/play');
  });
  it('the two topics: answered on the keys note for note, with a quick lesson each, no emoji', () => {
    for (const t of ['key-sixdim', 'key-jazz']) {
      expect(TOPIC_GEN[t].forPlays).toEqual(['keys']);
      for (let level = 1; level <= 5; level++)
        for (let seed = 1; seed <= 20; seed++) {
          const q = TOPIC_GEN[t].gen(seed, level, `x${seed}`) as PlaceQuestion;
          expect(q.kind).toBe('place');
          expect(q.target.every((m) => m >= 36 && m <= 96)).toBe(true);
          // The note given is part of the answer, except where it is the voice that moves (borrowing, the raised note).
          if (t === 'key-jazz' || level <= 3) expect(q.target.includes(q.given!.midis![0]), `${t} ${level} ${seed}`).toBe(true);
        }
      const l = MINI_LESSONS[UNIT_LESSON[`topic:${t}`]];
      expect(l, t).toBeDefined();
      const text = JSON.stringify(l);
      expect(/\p{Extended_Pictographic}/u.test(text.replace(/𝄞/g, ''))).toBe(false);
    }
    // So What on D: D G C F A.
    const sw = TOPIC_GEN['key-jazz'].gen(3, 4, 'y') as PlaceQuestion;
    expect(sw.target.map((m) => m - sw.target[0])).toEqual([0, 5, 10, 15, 19]);
  });
});
