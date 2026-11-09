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
import { gradeWritten, withWritten } from '../src/engine/drills/bassEar';
import { DEFAULT_DRILL_SETTINGS, type Drill, type TakeMetrics } from '../src/engine/drills/types';

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

describe('ear L7: the written transcription', () => {
  it('every item carries the line to write: the answer bars, note for note, on every tuning', () => {
    for (const d of drillsOf('b-ear-7')) {
      const answer = d.notes.filter((n) => n.beat >= 8).map((n) => n.pitch);
      expect(d.write?.pitches).toEqual(answer);
      expect(d.write!.pitches.length).toBe(8);
    }
  });

  it('graded note for note; a wrong written note keeps a clean take from counting, never raises one', () => {
    const want = [38, 41, 45, 44, 43, 47, 50, 49];
    expect(gradeWritten(want, want)).toEqual({ ok: 8, total: 8, marks: want.map(() => true) });
    const g = gradeWritten(want, [38, 41, 45, 44, 43, 47, 50, 37]);
    expect(g.ok).toBe(7);
    expect(g.marks[7]).toBe(false);
    const clean = { verdict: 'clean', why: { en: 'ok', he: 'ok' } } as TakeMetrics;
    expect(withWritten(clean, gradeWritten(want, want)).verdict).toBe('clean');
    const w = withWritten(clean, g);
    expect(w.verdict).toBe('almost');
    expect(w.written).toEqual({ ok: 7, total: 8 });
    expect(w.why.en).toContain('note 8');
    expect(/[֐-׿]/.test(w.why.he)).toBe(true);
    const not = { verdict: 'not', why: { en: 'late', he: 'מאוחר' } } as TakeMetrics;
    expect(withWritten(not, g).verdict).toBe('not');
  });
});

describe('upright: treble clef, studies, three octaves in more keys', () => {
  const pcOf = (m: number) => ((m % 12) + 12) % 12;
  it('treble-clef levels read the thumb register on the G and D strings, written an octave up into the treble staff', () => {
    for (const id of ['b-up-read-5', 'b-up-read-6'])
      for (const d of drillsOf(id)) {
        expect(d.spec.tuning).toBe('upright');
        expect(d.spec.kind).toBe('treble');
        expect(d.show).toBe('staff');
        expect(d.bow).toBe('arco');
        expect(d.goal.bass?.cents).toBeLessThanOrEqual(10);
        for (const n of d.notes) {
          expect(n.string).toBeLessThanOrEqual(2);
          expect(n.fret!).toBeGreaterThanOrEqual(id === 'b-up-read-5' ? 12 : 7);
          // written (sounding + 12) inside / near the treble staff: G3 … C6
          expect(n.pitch + 12).toBeGreaterThanOrEqual(55);
          expect(n.pitch + 12).toBeLessThanOrEqual(84);
        }
        expect(pcOf(d.notes[d.notes.length - 1].pitch)).toBe(pcOf(d.spec.key + (d.spec.minor ? 0 : 0)));
      }
  });

  it('studies per grade band: phrases end on the 5th then the tonic, bowed or pizz, read from the staff, intonation measured', () => {
    for (const id of ['b-up-arco-7', 'b-up-arco-8', 'b-up-arco-9', 'b-up-pizz-4'])
      for (const d of drillsOf(id)) {
        const g = d.spec.option!;
        const meter = g === 1 ? 3 : 4;
        expect(d.meter).toBe(meter);
        expect(d.beats).toBe((g === 2 ? 12 : 8) * meter);
        expect(d.show).toBe('staff');
        expect(d.bow).toBe(id.startsWith('b-up-pizz') ? 'pizz' : 'arco');
        expect(d.goal.bass?.cents).toBeDefined();
        const tonic = pcOf(d.spec.key);
        const last = d.notes[d.notes.length - 1];
        expect(pcOf(last.pitch), d.itemId).toBe(tonic);
        const end4 = d.notes.filter((n) => n.beat < 4 * meter).pop()!;
        expect(pcOf(end4.pitch - tonic), d.itemId).toBe(7);
        // every bar is full (no gaps, no overlaps)
        let t = 0;
        for (const n of d.notes) {
          expect(n.beat).toBeCloseTo(t, 6);
          t = n.beat + n.dur;
        }
        expect(t).toBeCloseTo(d.beats, 6);
        // range by grade: first position (≤ fret 5) for Gr 1–3; above it later
        const maxFret = Math.max(...d.notes.map((n) => n.fret!));
        if (g === 0) expect(maxFret).toBeLessThanOrEqual(7);
      }
    // studies are different per key (generated, not one tune transposed)
    const [a, b] = levelDrills(levelById('b-up-arco-8'), order);
    expect(a.notes.map((n) => n.beat)).not.toEqual(b.notes.map((n) => n.beat).slice(0, a.notes.length));
  });

  it('three-octave scales and arpeggios in F, F♯ and G reach the top without folding (fret ≤ 24)', () => {
    for (const d of drillsOf('b-up-scales-10')) {
      const ps = d.notes.map((n) => n.pitch);
      const lo = Math.min(...ps);
      expect(Math.max(...ps) - lo).toBe(36);
      expect(Math.max(...d.notes.map((n) => n.fret!))).toBeLessThanOrEqual(24);
      // strictly up, then strictly down
      const top = ps.indexOf(Math.max(...ps));
      for (let k = 1; k <= top; k++) expect(ps[k]).toBeGreaterThan(ps[k - 1]);
      for (let k = top + 1; k < ps.length; k++) expect(ps[k]).toBeLessThan(ps[k - 1]);
    }
  });
});

describe('RSL / Trinity / bagrut drills', () => {
  const pcOf = (m: number) => ((m % 12) + 12) % 12;
  it('stylistic studies: 8 bars combining the grade\'s techniques, with the band', () => {
    for (const id of ['b-styles-15', 'b-styles-16', 'b-styles-17'])
      for (const d of drillsOf(id)) {
        expect(d.chart!.length, d.itemId).toBe(8);
        expect(d.band, d.itemId).toBeTruthy();
        expect(bandHits(d).length).toBeGreaterThan(8);
        const tech = new Set(d.notes.map((n) => n.technique));
        if (id === 'b-styles-15') {
          expect(tech.has('slide'), d.itemId).toBe(true);
          expect(d.notes.some((n) => n.accent)).toBe(true);
          // real rests: some beat with no note sounding
          const sounding = (b: number) => d.notes.some((n) => n.beat <= b + 1e-6 && n.beat + n.dur > b + 1e-6);
          expect([...Array(32).keys()].some((q) => !sounding(q + 0.5))).toBe(true);
        }
        if (id === 'b-styles-16') {
          expect(tech.has('dead'), d.itemId).toBe(true);
          expect(d.goal.bass?.ghostClass).toBe(0.85);
          expect(d.notes.some((n) => n.stroke === 'p') && d.notes.some((n) => n.stroke === 'i')).toBe(true);
        }
        if (id === 'b-styles-17') {
          const low = Math.min(...d.notes.map((n) => n.pitch));
          expect(Math.max(...d.notes.map((n) => n.pitch)) - low, d.itemId).toBeGreaterThanOrEqual(19);
          expect(d.notes.some((n) => Math.abs((n.beat % 1) - 2 / 3) < 1e-6)).toBe(true); // swung 8ths
        }
      }
  });

  it('session skills: improvise over a rock / pop chart — chart only, chord-tone rules, the band, a new chart per key', () => {
    const ds = drillsOf('b-read-13');
    for (const d of ds) {
      expect(d.show).toBe('chart');
      expect(d.goal.bass?.rules?.kind).toBe('chordTones');
      expect(d.band).toBeTruthy();
      expect(d.chart!.slice(-2).map((c) => c.replace(/[^A-G♭♯]/g, '').length > 0)).toEqual([true, true]);
    }
    const charts = new Set(levelDrills(levelById('b-read-13'), order).map((d) => d.chart!.map((c, i) => `${i}:${c.length}`).join()));
    expect(charts.size).toBeGreaterThan(1);
  });

  it('ear L9 chord quality: the answer is the arpeggio of the chord the band plays (its 3rd, 5th and 7th)', () => {
    for (const d of drillsOf('b-ear-9', ['bass', 'bass5'])) {
      const piano = d.listen!.notes.filter((n) => n.inst === 'piano');
      expect(piano.length).toBe(4);
      piano.forEach((ch, r) => {
        const ans = d.notes.filter((n) => n.beat >= r * 8 + 4 && n.beat < r * 8 + 8).map((n) => pcOf(n.pitch));
        expect(ans.length).toBe(4);
        expect(new Set(ans)).toEqual(new Set(ch.midi.map(pcOf)));
      });
    }
  });

  it('every new level is tagged with its exam', () => {
    const want: Record<string, string> = {
      'b-styles-15': 'RSL',
      'b-styles-16': 'RSL',
      'b-styles-17': 'RSL',
      'b-read-13': 'Trinity',
      'b-ear-9': 'RSL',
      'b-up-read-5': 'ABRSM',
      'b-up-read-6': 'ABRSM',
      'b-up-arco-7': 'ABRSM',
      'b-up-arco-8': 'ABRSM',
      'b-up-arco-9': 'ABRSM',
      'b-up-pizz-4': 'ABRSM',
      'b-up-scales-10': 'ABRSM',
      'b-walk-13': 'Bagrut',
      'b-walk-14': 'Bagrut',
      'b-ear-7': 'Bagrut',
      'b-walk-15': 'Bagrut',
      'b-walk-16': 'Bagrut',
    };
    for (const [id, board] of Object.entries(want)) expect(levelById(id).exam?.map((e) => e.board), id).toContain(board);
  });

  it('every new level generates in all its keys on 4-, 5-, 6-string and drop D (the upright ones on the upright)', () => {
    for (const id of ['b-styles-15', 'b-styles-16', 'b-styles-17', 'b-read-13', 'b-ear-9', 'b-pocket-7', 'b-up-read-5', 'b-up-read-6', 'b-up-arco-7', 'b-up-arco-8', 'b-up-arco-9', 'b-up-pizz-4', 'b-up-scales-10'])
      for (const d of drillsOf(id)) {
        const tu = d.spec.tuning ?? 'bass';
        expect(d.notes.length, `${d.itemId} ${tu}`).toBeGreaterThan(3);
        for (const n of d.notes) {
          expect(n.fret!, d.itemId).toBeGreaterThanOrEqual(0);
          expect(n.fret!, d.itemId).toBeLessThanOrEqual(24);
        }
        if (id.startsWith('b-up-')) expect(tu).toBe('upright');
        expect(levelById(id).tempo![0]).toBeLessThanOrEqual(levelById(id).tempo![1]);
        expect(/[֐-׿]/.test(d.title.he)).toBe(true);
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
