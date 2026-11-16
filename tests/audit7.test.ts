// AUDIT-7 (docs/research/AUDIT-7-GAPS.md §10 holes #4, #6, #7, #10, #11, #12, #15): reading past 1400, the bass's
// arpeggios and scales in 12 keys, the guitar's modes at their grades, pop accompaniment and pedalling, the
// public-domain classical tier, the drums' groove development and rudiment grades, bass riffs and feels.
import { describe, expect, it } from 'vitest';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { techLevel, ladderFamiliesFor } from '../src/engine/ladderFacts';
import { NON_MONOTONE_FAMILIES, PATH_CAP, stepCatalogue } from '../src/engine/path';
import { AUDIT7_PLACEMENT } from '../src/engine/audit7Placement';
import { hasRubato } from '../src/engine/drills/rubato';
import { strandsFor } from '../src/engine/drills/levelTest';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { resolveGlyph } from '../src/ui/BadgeArt';
import { drillEvents } from '../src/engine/drills/events';
import { analyzePedal, type PedalEvent } from '../src/engine/drills/pedal';
import { analyzeDrumTake, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { generateDrums } from '../src/engine/drills/drums';
import { DEV_PLAN, GROOVE_DEV } from '../src/engine/drills/drumGroove';
import { isPdWorldwide, midiOf, parseVoice, pdBarCount, pdNotes, pdToPiece, PD_PIECES, PRELUDE_C_CHORDS } from '../src/content/classicalPD';
import { chunkDrill } from '../src/engine/piece/toDrill';
import { tuningById } from '../src/engine/fretboard';
import type { Drill, TakeMetrics } from '../src/engine/drills/types';

const PIANO = catalog();
const GCAT = guitarCatalog();
const fam = (id: string) => [...PIANO, ...GCAT].find((f) => f.id === id)!;
const lv = (id: string): LevelDef => techLevel(id)!;
const pc = (k: number) => ((k % 12) + 12) % 12;
const keysOfLevel = (l: LevelDef) => new Set(levelDrills(l, 'fifths-up').map((d) => pc(d.spec.key)));
const NEW_KEYS_LEVELS = [...[11, 12, 13, 14, 15].map((n) => `k-read-${n}`), ...[1, 2, 3, 4, 5, 6].map((n) => `k-pop-${n}`), ...[1, 2, 3].map((n) => `k-pedal-${n}`)];
const NEW_BASS_LEVELS = [...[1, 2, 3, 4, 5].map((n) => `b-riff-${n}`), ...[1, 2, 3, 4, 5].map((n) => `b-feel-${n}`)];

/** No note of a piano drill crosses its bar line, and the hands never share a pitch at the same moment. */
function pianoClean(d: Drill): string | null {
  const m = d.meter || 4;
  if (!d.meters)
    for (const n of d.notes) {
      const bar = Math.floor(n.beat / m + 1e-9);
      if (n.beat + n.dur > (bar + 1) * m + 1e-6) return `${d.itemId}: ${n.pitch}@${n.beat} crosses the bar line`;
    }
  for (const a of d.notes) for (const b of d.notes) if (a !== b && a.pitch === b.pitch && Math.abs(a.beat - b.beat) < 1e-6) return `${d.itemId}: ${a.pitch} twice at ${a.beat}`;
  for (const n of d.notes) if (n.pitch < 21 || n.pitch > 108) return `${d.itemId}: ${n.pitch} off the keyboard`;
  return null;
}

describe('#4 keys sight-reading past 1400 (k-read 11–15)', () => {
  it('fifteen levels; 11–15 at 1450–1800 on the path, rising, all 12 keys, every item new', () => {
    expect(fam('k-read').levels.length).toBe(15);
    const cat = stepCatalogue();
    const ds = [11, 12, 13, 14, 15].map((n) => cat.find((s) => s.id === `tech:k-read-${n}`)!.difficulty);
    expect(ds).toEqual([1450, 1520, 1600, 1700, 1800]);
    expect(cat.find((s) => s.id === 'tech:k-read-10')!.difficulty).toBeLessThan(ds[0]);
    for (const n of [11, 12, 13, 14, 15]) {
      const l = lv(`k-read-${n}`);
      expect(keysOfLevel(l).size, l.id).toBe(12);
      const items = levelDrills(l, 'fifths-up');
      expect(new Set(items.map((d) => d.itemId)).size).toBe(items.length);
      // generated per seed: the same level in two keys is not the same tune moved
      const shape = (d: Drill) => d.notes.map((x) => `${x.pitch - d.notes[0].pitch}@${x.beat}`).join(' ');
      expect(new Set(items.slice(0, 6).map(shape)).size, l.id).toBeGreaterThan(3);
      for (const d of items) expect(pianoClean(d), d.itemId).toBeNull();
    }
  });
  it('four voices, written-out ornaments, changing metres, a lead sheet with hits, the quick study', () => {
    const one = (id: string) => levelDrills(lv(id), 'fifths-up')[0];
    const four = one('k-read-11');
    // two notes in each hand at each half
    expect(four.notes.filter((n) => n.beat === 0).map((n) => n.hand).sort().join('')).toBe('LLRR');
    const orn = levelDrills(lv('k-read-12'), 'fifths-up');
    expect(orn.every((d) => d.notes.some((n) => n.dur === 0.25))).toBe(true);
    expect(orn.some((d) => /trill|טריל/.test(d.title.en + d.title.he))).toBe(true);
    const met = one('k-read-13');
    expect(met.meters!.length).toBeGreaterThan(2);
    expect(met.beats).toBe(met.meters ? [4, 3, 4, 2, 3, 4].reduce((a, b) => a + b, 0) : 0);
    const lead = one('k-read-14');
    expect(lead.chart!.length).toBe(8);
    expect(lead.notes.some((n) => n.hand === 'L' && !Number.isInteger(n.beat))).toBe(levelDrills(lv('k-read-14'), 'fifths-up').some((d) => d.notes.some((n) => n.hand === 'L' && !Number.isInteger(n.beat))));
    const q = one('k-read-15');
    expect(q.prep).toBe(30);
    expect(q.beats).toBe(32);
  });
  it('rubato first, then the tempo ladder; the reading skill', () => {
    for (const n of [11, 13, 15]) expect(hasRubato(levelDrills(lv(`k-read-${n}`), 'fifths-up')[0]), `k-read-${n}`).toBe(true);
    const d = levelDrills(lv('k-read-11'), 'fifths-up')[0];
    const ev = drillEvents(d, { verdict: 'clean', accuracy: 1 } as unknown as TakeMetrics, new Date().toISOString(), 's', 0);
    expect(ev.some((e) => (e.tags ?? []).some((t) => t.sub === 'sight/read'))).toBe(true);
  });
});

describe('#6 bass arpeggios and scales in all 12 keys, inside the bass range', () => {
  const tu = tuningById('bass');
  const lowest = tu.open[tu.open.length - 1];
  const highest = tu.open[0] + 21;
  it('every b-chord and b-scale level runs in 12 keys; every note fits a 4-string bass (frets 0–21)', { timeout: 120_000 }, () => {
    for (const f of ['b-chord', 'b-scale']) {
      for (const l of fam(f).levels) {
        if (l.specs.some((s) => s.tuning === 'bass6')) continue; // the 6-string level is checked below
        expect(keysOfLevel(l).size, l.id).toBe(12);
        for (const d of levelDrills(l, 'fifths-up'))
          for (const n of d.notes) {
            expect(n.pitch >= lowest && n.pitch <= highest, `${d.itemId} ${n.pitch}`).toBe(true);
            if (n.fret !== undefined) expect(n.fret >= 0 && n.fret <= 21, `${d.itemId} fret ${n.fret}`).toBe(true);
          }
      }
    }
  });
  it('the 6-string three-notes-per-string level in 12 keys, on the neck', () => {
    const l = fam('b-scale').levels.find((x) => x.specs.some((s) => s.tuning === 'bass6'))!;
    expect(keysOfLevel(l).size).toBe(12);
    for (const d of levelDrills(l, 'fifths-up')) for (const n of d.notes) expect(n.fret! >= 0 && n.fret! <= 24, d.itemId).toBe(true);
  });
  it('the listed keys stay first (saved item ids unchanged)', () => {
    expect(levelDrills(lv('b-chord-1'), 'fifths-up')[0].spec.key).toBe(4);
    expect(levelDrills(lv('b-scale-5'), 'fifths-up')[0].spec.key).toBe(4);
  });
});

describe('#7 guitar modes and harmonic minor at grades 5, 6, 7', () => {
  it('g-scales 13 (G5 harmonic minor), 14 (G6 Dorian / Mixolydian), 15 (G7 Lydian / Phrygian / melodic minor); 7 keeps the rest at G8', () => {
    const g = (id: string) => fam('g-scales').levels.find((l) => l.id === id) as LevelDef & { grade?: number };
    expect([13, 14, 15].map((n) => g(`g-scales-${n}`).grade)).toEqual([5, 6, 7]);
    expect(g('g-scales-7').grade).toBe(8);
    const opts = (id: string) => g(id).specs.filter((s) => s.kind === 'mode').map((s) => s.option);
    expect(opts('g-scales-13')).toEqual([7, 5]);
    expect(opts('g-scales-14')).toEqual([1, 4]);
    expect(opts('g-scales-15')).toEqual([3, 2, 8]);
    for (const m of [1, 2, 3, 4, 7, 8]) expect(opts('g-scales-7'), `mode ${m}`).not.toContain(m);
    const cat = stepCatalogue();
    const d = (id: string) => cat.find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('g-scales-13')).toBeLessThan(d('g-scales-14'));
    expect(d('g-scales-14')).toBeLessThan(d('g-scales-15'));
    expect(d('g-scales-15')).toBeLessThan(d('g-scales-7'));
    expect(d('g-scales-13')).toBeGreaterThanOrEqual(1150);
    expect(d('g-scales-13')).toBeLessThan(1240);
    for (const n of [13, 14, 15]) expect(keysOfLevel(g(`g-scales-${n}`)).size).toBe(12);
  });
});

describe('#10 pop accompaniment and pedalling', () => {
  it('k-pop 1–6 and k-pedal 1–3: all 12 keys, a lead sheet over every item, nothing across a bar line', { timeout: 120_000 }, () => {
    expect(fam('k-pop').levels.length).toBe(6);
    expect(fam('k-pedal').levels.length).toBe(3);
    for (const id of NEW_KEYS_LEVELS.filter((x) => !x.startsWith('k-read'))) {
      const l = lv(id);
      expect(keysOfLevel(l).size, id).toBe(12);
      for (const d of levelDrills(l, 'fifths-up')) {
        expect(pianoClean(d), d.itemId).toBeNull();
        expect(d.chart?.length, d.itemId).toBeGreaterThanOrEqual(4);
        if (id.startsWith('k-pedal')) expect(d.goal.pedal?.changes.length, d.itemId).toBeGreaterThan(4);
      }
    }
    expect(levelDrills(lv('k-pedal-3'), 'fifths-up')[0].goal.pedal!.style).toBe('half');
    // the syncopated pedal changes off the bar line
    expect(levelDrills(lv('k-pedal-2'), 'fifths-up').some((d) => d.goal.pedal!.changes.some((b) => b % 4 !== 0))).toBe(true);
    // the reggae skank is off the beat, the ballad pushes the "and" of 4
    expect(levelDrills(lv('k-pop-5'), 'fifths-up')[0].notes.filter((n) => n.hand === 'R').every((n) => n.beat % 1 === 0.5 || n.beat >= 32)).toBe(true);
    expect(levelDrills(lv('k-pop-3'), 'fifths-up')[0].notes.some((n) => n.hand === 'R' && n.beat % 4 === 3.5)).toBe(true);
  });
  it('half-pedal: a partial lift at each change passes, a full lift fails, an on/off pedal is graded as legato and says so', () => {
    const changes = [0, 2, 4, 6, 8];
    const bpm = 60;
    const half: PedalEvent[] = [{ at: 0, down: true, value: 127 }];
    for (const b of changes.slice(1)) half.push({ at: b * 1000 - 40, down: false, value: 30 }, { at: b * 1000 + 120, down: true, value: 120 });
    expect(analyzePedal({ style: 'half', changes }, half, bpm).pass).toBe(true);
    const full = half.map((e) => (e.value === 30 ? { ...e, value: 0 } : e));
    // a continuous pedal (the 120s) but lifted all the way
    const fr = analyzePedal({ style: 'half', changes }, full, bpm);
    expect(fr.pass).toBe(false);
    expect(fr.perChange.find((c) => !c.ok)!.why).toBe('full-lift');
    const sw: PedalEvent[] = [{ at: 0, down: true, value: 127 }];
    for (const b of changes.slice(1)) sw.push({ at: b * 1000 - 20, down: false, value: 0 }, { at: b * 1000 + 150, down: true, value: 127 });
    const sr = analyzePedal({ style: 'half', changes }, sw, bpm);
    expect(sr.switchPedal).toBe(true);
    expect(sr.pass).toBe(true);
    expect(sr.why.en).toMatch(/legato/);
    // the old styles still read transitions only
    expect(analyzePedal({ style: 'legato', changes }, sw.map(({ at, down }) => ({ at, down })), bpm).pass).toBe(true);
  });
});

describe('#11 the public-domain classical tier', () => {
  it('PD check list: every composer died 70+ years ago, every edition is our own engraving', () => {
    expect(PD_PIECES.length).toBeGreaterThanOrEqual(4);
    for (const p of PD_PIECES) {
      expect(isPdWorldwide(p, 2026), p.id).toBe(true);
      expect(p.died + 70, p.id).toBeLessThan(2026);
      expect(p.edition, p.id).toBe('own');
      expect(p.composer.he.length > 0 && p.title.he.length > 0, p.id).toBe(true);
    }
    expect(isPdWorldwide({ died: 1960, edition: 'own' }, 2026)).toBe(false);
  });
  it('every bar fills its metre; known notes are where the music has them', () => {
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('F#4')).toBe(66);
    expect(midiOf('Bb3')).toBe(58);
    expect(() => parseVoice('C4/1 D4/1 | E4/3', 4, 'R')).toThrow(/beats/);
    const minuet = PD_PIECES.find((p) => p.id === 'minuet-g')!;
    expect(pdBarCount(minuet)).toBe(16);
    const rh = pdNotes(minuet).filter((n) => n.hand === 'R');
    expect(rh.slice(0, 6).map((n) => n.midi)).toEqual([74, 67, 69, 71, 72, 74]); // D5 G4 A4 B4 C5 D5
    const prelude = PD_PIECES.find((p) => p.id === 'prelude-c')!;
    expect(PRELUDE_C_CHORDS.length).toBe(19);
    expect(pdNotes(prelude).filter((n) => n.bar === 0).map((n) => n.midi).slice(0, 5)).toEqual([60, 64, 67, 72, 76]);
    const elise = PD_PIECES.find((p) => p.id === 'fur-elise')!;
    expect(pdNotes(elise).filter((n) => n.hand === 'R').slice(0, 4).map((n) => n.midi)).toEqual([76, 75, 76, 75]); // E5 D♯5 E5 D♯5
  });
  it('the ladder: one level a piece in grade order, a section an item, at its grade on the path; the coach opens the same piece', () => {
    const f = fam('k-classic');
    expect(f.levels.length).toBe(PD_PIECES.length);
    const cat = stepCatalogue();
    const ds = f.levels.map((l) => cat.find((s) => s.id === `tech:${l.id}`)!.difficulty);
    expect([...ds].sort((a, b) => a - b)).toEqual(ds);
    for (const l of f.levels) {
      expect(cat.find((s) => s.id === `tech:${l.id}`)!.difficulty).toBe(AUDIT7_PLACEMENT[l.id]);
      for (const d of levelDrills(l, 'fifths-up')) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(8);
        expect(Math.max(...d.notes.map((n) => n.beat + n.dur))).toBeLessThanOrEqual(d.beats + 1e-6);
      }
    }
    expect(levelDrills(lv('k-classic-4'), 'fifths-up')[0].pulse).toBe(8); // Für Elise (3/8)
    expect(hasRubato(levelDrills(lv('k-classic-2'), 'fifths-up')[0])).toBe(true);
    for (const p of PD_PIECES) {
      const piece = pdToPiece(p, 'he');
      expect(piece.bars.length).toBe(pdBarCount(p));
      expect(piece.notes.length).toBe(pdNotes(p).length);
      const c = chunkDrill(piece, p.id, 0, 1, 60);
      expect(c.notes.length).toBeGreaterThan(0);
    }
  });
});

describe('#12 drums: develop the groove, solo, come back; rudiments at their grades', () => {
  const d0 = generateDrums({ family: 'd-fills', kind: '9:develop', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
  const bpm = 84;
  const ms = 60000 / bpm;
  const written: DrumTakeHit[] = d0.notes.map((n) => ({ voice: n.voice!, on: n.beat * ms, vel: n.accent ? 110 : 80 }));
  const zones = d0.goal.drum!.impro!.zones;
  const own = zones.flatMap(([a, b]) => Array.from({ length: Math.round((b - a) * 2) }, (_, i) => ({ voice: 'tom1' as const, on: (a + i * 0.5 + 0.25) * ms, vel: 70 })));
  it('groove 4 · develop 4 · solo 2 · groove 4; anchors written in the development, nothing written in the solo; the return lands', () => {
    const total = DEV_PLAN.groove + DEV_PLAN.develop + DEV_PLAN.solo + DEV_PLAN.back;
    expect(d0.beats).toBe(total * 4);
    expect(zones).toEqual([
      [16, 32],
      [32, 40],
    ]);
    expect(d0.notes.filter((n) => n.beat >= 32 && n.beat < 40).length).toBe(0);
    expect(d0.notes.filter((n) => n.beat >= 16 && n.beat < 32).every((n) => n.voice === 'kick' || n.voice === 'snare')).toBe(true);
    expect(d0.goal.drum!.landing!.beats).toEqual([40]);
    expect(d0.drum!.tier).toBe(2);
    expect(d0.band!.rests).toEqual([[32, 40]]);
    expect(GROOVE_DEV.length).toBe(3);
  });
  it('measured: a take with the groove, its own bars and the return is clean; a silent solo or a lost return is not', () => {
    expect(analyzeDrumTake(d0, bpm, [...written, ...own]).verdict).toBe('clean');
    expect(analyzeDrumTake(d0, bpm, [...written, ...own.filter((h) => h.on < 32 * ms)]).verdict).not.toBe('clean');
    const lost = written.filter((h) => h.on < 40 * ms - 1);
    expect(analyzeDrumTake(d0, bpm, [...lost, ...own]).verdict).not.toBe('clean');
  });
  it('the triple-stroke roll and the triple paradiddle at G4–G5, the 10/11-stroke rolls at G6, graded intermediate', () => {
    const cat = stepCatalogue();
    const d = (id: string) => cat.find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('d-pas-3')).toBeGreaterThanOrEqual(1060);
    expect(d('d-pas-3')).toBeLessThanOrEqual(1150);
    expect(d('d-pas-2')).toBeLessThanOrEqual(1150);
    expect(d('d-pas-4')).toBeLessThan(1300);
    expect(d('d-fills-9')).toBe(1120);
    expect(NON_MONOTONE_FAMILIES).toEqual(expect.arrayContaining(['d-pas', 'd-fills']));
    const pas3 = generateDrums({ family: 'd-pas', kind: '3:triplepara', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(pas3.drum!.tier).toBe(2);
    expect(generateDrums({ family: 'd-pas', kind: '7:pataflafla', option: 0, key: 0, hands: 'RL', instrument: 'drums' }).drum!.tier).toBe(3);
  });
});

describe('#15 bass riffs by grade and the feels', () => {
  const tu = tuningById('bass');
  it('b-riff 1–5 (one per grade, RSL-tagged), b-feel 1–4; all 12 keys, in range, at their ratings, rubato first', { timeout: 120_000 }, () => {
    expect(fam('b-riff').levels.length).toBe(5);
    expect(fam('b-feel').levels.length).toBe(5);
    const cat = stepCatalogue();
    for (const id of NEW_BASS_LEVELS) {
      const l = lv(id);
      expect(keysOfLevel(l).size, id).toBe(12);
      expect(cat.find((s) => s.id === `tech:${id}`)!.difficulty, id).toBe(AUDIT7_PLACEMENT[id]);
      for (const d of levelDrills(l, 'fifths-up')) {
        if (id.startsWith('b-feel')) expect(d.drums?.groove, d.itemId).toBeTruthy();
        expect(d.chart!.length).toBeGreaterThanOrEqual(4);
        for (const n of d.notes) {
          expect(n.pitch >= tu.open[3] && n.pitch <= tu.open[0] + 21, `${d.itemId} ${n.pitch}`).toBe(true);
          expect(n.fret! >= 0 && n.fret! <= 21).toBe(true);
        }
      }
    }
    // riffs: free time first; the feels are time drills with the drums under them (timed, rubato.ts)
    expect(hasRubato(levelDrills(lv('b-riff-1'), 'fifths-up')[0])).toBe(true);
    expect(hasRubato(levelDrills(lv('b-feel-1'), 'fifths-up')[0])).toBe(false);
    // the half-time feel leaves beat 3 to the snare; the two-feel plays halves
    expect(levelDrills(lv('b-feel-2'), 'fifths-up')[0].notes.some((n) => n.beat % 4 === 2)).toBe(false);
    expect(levelDrills(lv('b-feel-1'), 'fifths-up')[0].notes.slice(0, 4).map((n) => n.dur)).toEqual([2, 2, 2, 2]);
  });
});

describe('wiring: path, courses, glyphs, badges, level test, skill map', () => {
  it('every new family is on its course path with its own drawn glyph', () => {
    const ds = { emphasis: 'both', instrument: 'piano' } as Parameters<typeof ladderFamiliesFor>[1];
    for (const f of ['k-pop', 'k-pedal', 'k-classic', 'k-read']) expect(ladderFamiliesFor('keys', ds), f).toContain(f);
    for (const f of ['b-riff', 'b-feel']) expect(ladderFamiliesFor('bass', { ...ds, instrument: 'bass' }), f).toContain(f);
    for (const f of ['k-pop', 'k-pedal', 'k-classic', 'b-riff', 'b-feel']) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]).map(([k]) => k), f).toEqual([]);
    }
    const cat = stepCatalogue();
    for (const id of [...NEW_KEYS_LEVELS, ...NEW_BASS_LEVELS, 'g-scales-13', 'd-fills-9', 'k-classic-1']) {
      const s = cat.find((x) => x.id === `tech:${id}`);
      expect(s, id).toBeDefined();
      expect(s!.difficulty, id).toBeLessThanOrEqual(PATH_CAP);
    }
  });
  it('badges: a title per level (k-read 15, k-pop 6, k-pedal 3, k-classic, g-scales 15), named bass milestones, drawn art', () => {
    for (const [f, n] of [['k-read', 15], ['k-pop', 6], ['k-pedal', 3], ['k-classic', PD_PIECES.length], ['g-scales', 15]] as const) expect(BADGES.filter((b) => b.id.startsWith(`tech:${f}:`)).length, f).toBe(n);
    for (const f of ['b-riff', 'b-feel']) expect(BADGES.some((b) => b.group === f && !/:/.test(b.name.en)), f).toBe(true);
    for (const b of BADGES.filter((x) => /^tech:k-(pop|pedal|classic):/.test(x.id))) expect(resolveGlyph(b).fallback, b.id).toBe(false);
    const names = BADGES.map((b) => b.name.en);
    for (const b of BADGES.filter((x) => /^tech:(k-(pop|pedal|classic)|g-bass:b-(riff|feel)):/.test(x.id))) expect(names.filter((n) => n === b.name.en).length, b.name.en).toBe(1);
  });
  it('the level tests reach the new levels', () => {
    const p = (e: 'classical' | 'jazz' | 'both') => strandsFor('piano', e).flatMap((s) => s.rungs.map((r) => r.level));
    for (const id of ['k-read-12', 'k-read-14', 'k-pop-2', 'k-pop-4', 'k-classic-6']) expect(p('classical'), id).toContain(id);
    expect(p('jazz')).toContain('k-pop-3');
    const b = strandsFor('bass', 'both').flatMap((s) => s.rungs.map((r) => r.level));
    for (const id of ['b-riff-4', 'b-feel-2']) expect(b, id).toContain(id);
    expect(strandsFor('drums', 'both').flatMap((s) => s.rungs.map((r) => r.level))).toContain('d-fills-9');
  });
  it('every new piano item generates in every key (generator dispatch)', () => {
    for (const s of ['kp-block', 'kp-broken', 'kp-ballad', 'kp-rock', 'kp-reggae', 'kp-lead']) expect(generate({ family: 'k-pop', kind: s, key: 3, hands: 'RL', option: 1 }).notes.length).toBeGreaterThan(20);
    for (const s of ['kped-legato', 'kped-synco', 'kped-half']) expect(generate({ family: 'k-pedal', kind: s, key: 8, hands: 'RL', option: 2 }).goal.pedal).toBeDefined();
  });
});
