// Closing the bass course's remaining gaps (BASS_VALIDATION §3 partial / missing rows): the harmony band under
// style / walking / bagrut takes, pocket half-time sections, the written transcription, the upright's treble clef,
// études and 3-octave keys, the RSL / Trinity / bagrut drills.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { levelDrills, levelKeys } from '../src/engine/drills/plan';
import { drumHits } from '../src/engine/drills/bass';
import { bandHits, bandStyleOf, chartText } from '../src/engine/drills/bassBand';
import { bandComping, closeVoicings } from '../src/engine/band';
import { parseChart } from '../src/engine/charts';
import { DEFAULT_DRILL_SETTINGS, type Drill } from '../src/engine/drills/types';

const BASS = guitarCatalog().filter((f) => f.id.startsWith('b-'));
const levelById = (id: string) => BASS.flatMap((f) => f.levels).find((l) => l.id === id) as GuitarLevelDef;
const order = DEFAULT_DRILL_SETTINGS.keyOrder;
const TUNE_IDS = ['bass', 'bass5', 'bass6', 'bass-dropd'];
/** Every item of a level on the given tunings (its own tuning when the spec fixes one). */
const drillsOf = (id: string, tunings = TUNE_IDS): Drill[] => {
  const lv = levelById(id);
  return levelKeys(lv, order).flatMap((key) => lv.specs.flatMap((sp) => (sp.tuning ? [sp.tuning] : tunings).map((tuning) => generate({ ...sp, key, tuning }))));
};

describe('harmony band under the take', () => {
  it('the comping style follows the drum groove', () => {
    expect(bandStyleOf('swing')).toBe('swing');
    expect(bandStyleOf('bossa')).toBe('bossa');
    expect(bandStyleOf('ballad-brush')).toBe('ballad');
    expect(bandStyleOf('rock-8b')).toBe('rock');
    expect(bandStyleOf('motown')).toBe('pop');
    expect(bandStyleOf('funk-1')).toBe('funk');
    expect(bandStyleOf('rnb')).toBe('funk');
    expect(bandStyleOf('reggae')).toBe('reggae');
    expect(bandStyleOf('samba')).toBe('latin');
    expect(bandStyleOf('shuffle')).toBe('shuffle');
    expect(bandStyleOf('maqsum')).toBe('hold');
  });

  it('chart text: accidentals and diminished spelled for the parser, roadmap marks dropped, empty bars repeat', () => {
    expect(chartText(['B♭7', 'C°7', 'F♯m7♭5', ''])).toBe('Bb7 | Cdim7 | F#m7b5 | %');
    expect(chartText(['𝄋 C', 'Am ⊕', 'G :‖'])).toBe('C | Am | G');
    expect(parseChart(chartText(['B♭7', 'C°7', 'F♯m7♭5', ''])).errors).toEqual([]);
  });

  it('close voicings hold the chord tones in the middle register; groove comping leads voices by step', () => {
    const p = parseChart('C | Am | F | G7');
    for (const c of p.chords) for (const v of closeVoicings(c)) for (const m of v) expect([...c.iv.map((x) => (c.root + x) % 12)]).toContain(m % 12);
    for (const style of ['pop', 'rock', 'funk', 'reggae', 'latin', 'shuffle', 'hold'] as const) {
      const hits = bandComping(p, 4, 16, style, 7);
      expect(hits.length, style).toBeGreaterThanOrEqual(4);
      for (const h of hits) {
        expect(h.beat).toBeGreaterThanOrEqual(0);
        expect(h.beat).toBeLessThan(16);
        for (const m of h.notes) expect(m).toBeGreaterThanOrEqual(50), expect(m).toBeLessThanOrEqual(80);
      }
      // the chord sounding at each hit is the chart's chord there
      for (const h of hits) {
        const bar = Math.floor(h.beat / 4);
        const want = p.chords[bar];
        expect(h.notes.every((m) => want.iv.map((x) => (want.root + x) % 12).includes(m % 12)), `${style} beat ${h.beat}`).toBe(true);
      }
    }
  });

  it('styles (F14), walking with standards (F9 L9–18), the bagrut solo and sight-read improvisation all play with a band', () => {
    const banded = ['b-styles-1', 'b-styles-2', 'b-styles-3', 'b-styles-4', 'b-styles-5', 'b-styles-6', 'b-styles-7', 'b-styles-8', 'b-styles-9', 'b-styles-10', 'b-styles-11', 'b-styles-12', 'b-walk-9', 'b-walk-10', 'b-walk-11', 'b-walk-12', 'b-walk-13', 'b-walk-14', 'b-walk-15', 'b-walk-16', 'b-walk-17', 'b-walk-18', 'b-read-8', 'b-read-12', 'b-pocket-7'];
    for (const id of banded)
      for (const d of levelDrills(levelById(id), order)) {
        expect(d.band, `${d.itemId}`).toBeTruthy();
        expect(d.drums, d.itemId).toBeTruthy();
        const hits = bandHits(d);
        expect(hits.length, d.itemId).toBeGreaterThan(0);
        for (const h of hits) {
          expect(h.beat, d.itemId).toBeGreaterThanOrEqual(0);
          expect(h.beat, d.itemId).toBeLessThan(d.beats);
          expect(h.notes.length, d.itemId).toBeGreaterThanOrEqual(3);
        }
      }
    // feel by tune: a bossa standard comps bossa, a ballad comps the ballad, a walking tune swings
    const std = levelDrills(levelById('b-walk-14'), order);
    expect(new Set(std.map((d) => d.band!.style))).toEqual(new Set(['bossa', 'ballad', 'swing']));
    expect(levelDrills(levelById('b-styles-6'), order)[0].band!.style).toBe('reggae');
  });

  it('drills with no chart keep drums only (no band)', () => {
    const k = generate({ family: 'b-pocket', kind: 'kick', key: 4, hands: 'R', option: 0 });
    expect(k.drums).toBeTruthy();
    expect(k.band).toBeUndefined();
    expect(bandHits(k)).toEqual([]);
  });
});

describe('pocket L7: two groove sections (8 bars in time, 8 half-time)', () => {
  it('drums change groove at bar 8 and the kick lane / bass line follow each section, on every tuning', () => {
    for (const d of drillsOf('b-pocket-7')) {
      expect(d.drums?.sections).toEqual([{ bar: 8, groove: 'half-time' }]);
      expect(d.chart!.length).toBe(16);
      const kicks = drumHits(d.drums!, d.beats, d.meter).filter((h) => h.d === 'k').map((h) => h.beat);
      // rock-8b: kicks on 1, the "and" of 2, 3 and the "and" of 3; half-time: 1 and the "and" of 4 (0, 3)
      expect(kicks.filter((b) => b < 4)).toEqual([0, 1.5, 2, 3]);
      expect(kicks.filter((b) => b >= 32 && b < 36)).toEqual([32, 35]);
      // snare on 3 only in the half-time bars
      const snares = drumHits(d.drums!, d.beats, d.meter).filter((h) => h.d === 's').map((h) => h.beat);
      expect(snares.filter((b) => b >= 32 && b < 36)).toEqual([34]);
      expect(d.goal.bass?.kickLane).toEqual(kicks);
      const onsets = d.notes.filter((n) => n.beat < 64).map((n) => n.beat);
      expect(onsets).toEqual(kicks.filter((b) => b < 64));
    }
  });
});

describe('quick study: prep time', () => {
  it('read L12 gives 30 s to read before Play and plays with the band', () => {
    for (const d of levelDrills(levelById('b-read-12'), order)) {
      expect(d.prep).toBe(30);
      expect(d.band).toBeTruthy();
    }
  });
});
