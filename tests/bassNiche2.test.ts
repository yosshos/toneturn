// BASS_NICHE_PLAN P2 (jazz waltz b-walk 19–20, the standards ladder b-std, the upright top b-up-walk 6–9, extended
// techniques b-ext, fusion lines b-impro 15–18, rock stamina b-pick 9–10, meter by ear b-ear 20–21): every new level
// builds in every key on every bass, its model line keeps its own rules, a steady synthetic take passes at the start
// and target tempo, a sloppy one never; per family a failing take; plus the wiring.
import { describe, expect, it } from 'vitest';
import { families, hiddenBassLevels, levelDrills, shownFamilies, targetBpmOf, withBassTuning } from '../src/engine/drills/plan';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { withProg } from '../src/engine/drills/progAnalyze';
import { ruleCheck } from '../src/engine/drills/bassAnalyze';
import { timeMapOf } from '../src/engine/drills/timeline';
import type { Drill, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import type { LevelDef } from '../src/engine/drills/generate';
import { bassTake } from './bassTake';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { ladderFamiliesFor } from '../src/engine/ladderFacts';
import { stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { drillEvents } from '../src/engine/drills/events';
import { BADGES } from '../src/engine/badges';
import { lessonForUnit } from '../src/content/minilessons';
import { STD_LADDER } from '../src/engine/drills/bassNiche2';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { referenceOf, NO_REFERENCE } from '../src/content/references';

const all = () => families('bass').flatMap((f) => f.levels);
const lv = (id: string) => all().find((l) => l.id === id)!;
const levelsOf = (fam: string) => families('bass').find((f) => f.id === fam)!.levels;
/** Every P2 level. */
const P2_LEVELS = (): LevelDef[] => [
  ...levelsOf('b-walk').filter((l) => l.level >= 19),
  ...levelsOf('b-std'),
  ...levelsOf('b-up-walk').filter((l) => l.level >= 6),
  ...levelsOf('b-ext'),
  ...levelsOf('b-impro').filter((l) => l.level >= 15),
  ...levelsOf('b-pick').filter((l) => l.level >= 9),
  ...levelsOf('b-ear').filter((l) => l.level >= 20),
];
const verdict = (d: Drill, bpm: number, take: PlayedNote[]): TakeMetrics => withProg(analyzeGuitarTake(d, bpm, take), d, bpm, take);
const first = (id: string, i = 0) => levelDrills(lv(id), 'fifths-up')[i];

describe('BASS_NICHE_PLAN P2: wiring', () => {
  it('the new families and levels are in the catalogue, in teaching order', () => {
    const ids = families('bass').map((f) => f.id);
    expect(ids.indexOf('b-std')).toBe(ids.indexOf('b-latin') + 1);
    expect(ids.indexOf('b-ext')).toBe(ids.indexOf('b-legato') + 1);
    expect(levelsOf('b-walk').length).toBe(20);
    expect(levelsOf('b-impro').length).toBe(18);
    expect(levelsOf('b-pick').length).toBe(10);
    expect(levelsOf('b-ear').length).toBe(21);
    expect(levelsOf('b-up-walk').length).toBe(9);
    expect(levelsOf('b-std').length).toBe(5);
    expect(levelsOf('b-ext').length).toBe(8);
    expect(P2_LEVELS().length).toBe(27);
  });

  it('the standards ladder is on the jazz track; extended techniques on both', () => {
    const ids = (track?: 'jazz' | 'prog' | 'both') => ladderFamiliesFor('bass', { ...DEFAULT_DRILL_SETTINGS, bassTrack: track });
    expect(ids('jazz')).toContain('b-std');
    expect(ids('prog')).not.toContain('b-std');
    expect(ids('jazz')).toContain('b-ext');
    expect(ids('prog')).toContain('b-ext');
  });

  it('the fretless level shows only on a fretless bass or an upright', () => {
    expect(hiddenBassLevels('bass')).toContain('b-ext-8');
    expect(hiddenBassLevels('bass-fretless')).not.toContain('b-ext-8');
    expect(hiddenBassLevels('upright')).not.toContain('b-ext-8');
    const shown = (t: string) => shownFamilies({ emphasis: 'both', instrument: 'bass', bassTuning: t }).find((f) => f.id === 'b-ext')!.levels.map((l) => l.id);
    expect(shown('bass')).not.toContain('b-ext-8');
    expect(shown('bass-fretless')).toContain('b-ext-8');
  });

  it('own symbols, after the prerequisite on the path, rated, badged, a quick lesson', () => {
    const d = (id: string) => stepCatalogue().find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('b-std-1')).toBeGreaterThan(d('b-walk-11'));
    expect(d('b-ext-1')).toBeGreaterThan(d('b-legato-5'));
    expect(d('b-walk-19')).toBeGreaterThan(d('b-walk-18'));
    for (const f of ['b-std', 'b-ext']) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]).map(([k]) => k), f).toEqual([]);
      expect(BADGES.some((b) => b.id === `tech:g-bass:${f}:${levelsOf(f).length}`), f).toBe(true);
      expect(lessonForUnit(`tech:${f}`), f).not.toBeNull();
    }
    expect(BADGES.some((b) => b.id === 'tech:g-bass:setlist')).toBe(true);
    // Rated with a second skill (the upright and pick families carry the instrument tag only, as before).
    for (const l of P2_LEVELS().filter((x) => !/^b-(up-walk|pick)-/.test(x.id))) {
      const drill = levelDrills(l, 'fifths-up')[0];
      const ev = drillEvents(drill, { verdict: 'clean', nps: 4, accuracy: 1, cvR: 0.02, cvL: null } as unknown as TakeMetrics, '2026-11-11T10:00:00Z', 's', 0)[0];
      expect(ev.tags!.length, l.id).toBe(2);
    }
  });

  it('the ladder covers every walking standard once, plus the new practice forms (charts only, no reference needed)', () => {
    const ids = STD_LADDER.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(STANDARD_CHANGES.some((s) => s.id === id), id).toBe(true);
    for (const id of ['fast-aaba-cycle', 'bebop-form', 'coltrane-subs', 'ballad-cliche', 'ballad-backcycle']) {
      expect(ids, id).toContain(id);
      expect(id in NO_REFERENCE && !referenceOf(id), id).toBe(true);
    }
    for (const t of [1, 2, 3, 4, 5]) expect(STD_LADDER.filter((x) => x.tier === t).length, `tier ${t}`).toBeGreaterThanOrEqual(3);
  });
});

describe('BASS_NICHE_PLAN P2: the new levels', () => {
  it('every level builds in every key on 4-, 5- and 6-string, inside the neck, titled in both languages', () => {
    for (const l of P2_LEVELS()) {
      const t = l as LevelDef & { tempo?: [number, number] };
      expect(t.tempo![0], l.id).toBeLessThanOrEqual(t.tempo![1]);
      expect(l.title.he, l.id).not.toMatch(/[a-z]{4,}/);
      for (const d0 of levelDrills(l, 'fifths-up'))
        for (const tu of ['bass', 'bass5', 'bass6']) {
          const d = withBassTuning([d0], tu)[0];
          expect(d.notes.length, `${d.itemId} ${tu}`).toBeGreaterThan(7);
          const maxF = d.spec.tuning === 'upright' ? 24 : 21;
          for (const n of d.notes) expect((n.fret ?? 0) >= 0 && (n.fret ?? 0) <= maxF, `${d.itemId} ${tu} fret ${n.fret}`).toBe(true);
          if (!['tier', 'up-std'].includes(d.spec.kind)) expect(d.title.he, d.itemId).not.toMatch(/[a-z]{4,}/);
        }
    }
  });

  it('model lines keep their own rules (free-choice levels)', () => {
    for (const l of P2_LEVELS())
      for (const d of levelDrills(l, 'fifths-up')) {
        const r = d.goal.bass?.rules;
        if (!r) continue;
        const rep = ruleCheck(r.kind, r.chart, d.notes.map((n) => ({ pitch: n.pitch, beat: n.beat })), d.meter || 4, r.maxMove ?? 4, { every: r.every, anticipate: r.anticipate, passing: r.passing });
        expect(rep.validShare, `${d.itemId}: ${rep.labels.join(' ')}`).toBe(1);
        expect(rep.beat1Ct, d.itemId).toBeGreaterThanOrEqual(0.9);
      }
  });

  it('the old b-walk standards keep their own rules too (6th chords no longer walked as 7ths)', () => {
    for (const l of levelsOf('b-walk').filter((x) => [11, 13, 14, 18].includes(x.level)))
      for (const d of levelDrills(l, 'fifths-up')) {
        const r = d.goal.bass?.rules;
        if (!r) continue;
        const rep = ruleCheck(r.kind, r.chart, d.notes.map((n) => ({ pitch: n.pitch, beat: n.beat })), d.meter || 4, r.maxMove ?? 4, { every: r.every, anticipate: r.anticipate, passing: r.passing });
        expect(rep.validShare, `${d.itemId}: ${rep.labels.join(' ')}`).toBe(1);
      }
  });

  it('a steady take passes at the start and the target tempo; a sloppy one never', () => {
    const fails: string[] = [];
    for (const l of P2_LEVELS())
      for (const d of levelDrills(l, 'fifths-up').slice(0, 3)) {
        for (const bpm of [d.startBpm, targetBpmOf(l, d)]) {
          const m = verdict(d, bpm, bassTake(d, bpm, 6, 3));
          if (m.verdict !== 'clean') fails.push(`${d.itemId}@${bpm}: ${m.verdict} — ${m.why.en}`);
          for (const seed of [1, 2]) {
            const ear = d.spec.family === 'b-ear';
            const take = ear ? bassTake(d, bpm, 6, seed).map((p, i) => (i % 2 ? { ...p, pitch: p.pitch + 1 } : p)) : bassTake(d, bpm, 45, seed);
            if (verdict(d, bpm, take).verdict === 'clean') fails.push(`${d.itemId}@${bpm} sloppy seed ${seed} was clean`);
          }
        }
      }
    expect(fails).toEqual([]);
  });
});

describe('BASS_NICHE_PLAN P2: what each new level measures', () => {
  it('jazz waltz: 3/4 bars, the waltz groove, a non-chord tone on the 1 fails', () => {
    const d = first('b-walk-19');
    expect(d.meter).toBe(3);
    expect(d.drums?.groove).toBe('jazz-waltz');
    expect(d.notes.filter((n) => n.beat % 3 === 0 && n.beat < 24).length).toBe(8);
    const bpm = d.startBpm;
    const bad = bassTake(d, bpm, 6, 3).map((p, i) => (d.notes[i].beat % 3 === 0 && d.notes[i].beat > 0 ? { ...p, pitch: p.pitch + 1 } : p));
    expect(verdict(d, bpm, bad).verdict).not.toBe('clean');
    expect(first('b-walk-20').chart!.length).toBe(12);
  });

  it('standards ladder: five tiers with rising top tempos; a long walking chorus that slows down fails', () => {
    const tops = levelsOf('b-std').map((l) => (l as LevelDef & { tempo: [number, number] }).tempo[1]);
    expect(tops[3]).toBe(280);
    const d = levelDrills(lv('b-std-2'), 'fifths-up').find((x) => (x.chart?.length ?? 0) >= 16 && x.goal.bass?.swingWalk)!;
    expect(d).toBeDefined();
    const bpm = d.startBpm;
    const beat = 60000 / bpm;
    const half = d.goal.bass!.swingWalk!.chorusBeats!;
    const drag = bassTake(d, bpm, 6, 3).map((p) => {
      const b = p.on / beat;
      const on = b > half ? half * beat + (b - half) * beat * 1.05 : p.on;
      return { ...p, on, off: on + beat * 0.9 };
    });
    expect(verdict(d, bpm, drag).verdict).not.toBe('clean');
  });

  it('upright top: intonation is gated, the thumb-position solo sits high, the arco line is bowed', () => {
    for (const id of ['b-up-walk-6', 'b-up-walk-7', 'b-up-walk-8', 'b-up-walk-9']) {
      const d = first(id);
      expect(d.spec.tuning, id).toBe('upright');
      expect(d.goal.bass?.cents, id).toBeLessThanOrEqual(20);
    }
    expect(Math.min(...first('b-up-walk-8').notes.map((n) => n.pitch))).toBeGreaterThanOrEqual(45);
    expect(first('b-up-walk-9').bow).toBe('arco');
    expect(first('b-up-walk-7').goal.bass?.swingWalk).toBeDefined();
  });

  it('extended techniques: harmonics at the 3rd fret sound two octaves and a 5th up; double-stops are chords; tapping is marked', () => {
    const h = first('b-ext-1');
    const at3 = h.notes.filter((n) => n.fret === 3);
    expect(at3.length).toBe(4);
    for (const n of at3) expect(n.technique).toBe('harmonic');
    expect(at3.map((n) => n.pitch).sort((a, b) => a - b)).toEqual([59, 64, 69, 74]);
    const ah = first('b-ext-3');
    for (const n of ah.notes) expect(n.fret! >= 12 && n.technique === 'harmonic', ah.itemId).toBe(true);
    for (const id of ['b-ext-6', 'b-ext-7']) {
      const d = first(id);
      expect(d.goal.bass?.doubleStops, id).toBe(0.8);
      const ids = new Set(d.notes.map((n) => n.chordId));
      expect(ids.size, id).toBeGreaterThan(7);
      expect(d.notes.every((n) => n.chordId !== undefined), id).toBe(true);
    }
    const tap = first('b-ext-4');
    expect(tap.notes.filter((n) => n.technique === 'tap').length).toBeGreaterThan(tap.notes.length / 2);
    const fl = first('b-ext-8');
    expect(fl.spec.tuning).toBe('bass-fretless');
    expect(fl.goal.bass?.cents).toBe(12);
  });

  it('fusion lines: 16ths, every note in the chord scale; a wrong note on each change fails', () => {
    for (const id of ['b-impro-15', 'b-impro-16', 'b-impro-17', 'b-impro-18']) {
      const d = first(id);
      expect(d.notes.filter((n) => Math.abs(n.dur - 0.25) < 1e-6).length, id).toBeGreaterThan(d.notes.length * 0.9);
      const bpm = d.startBpm;
      const bad = bassTake(d, bpm, 6, 3).map((p, i) => (d.notes[i].beat % 4 === 0 && d.notes[i].beat > 0 ? { ...p, pitch: p.pitch + 1 } : p));
      expect(verdict(d, bpm, bad).verdict, id).not.toBe('clean');
    }
  });

  it('rock stamina: two minutes at 200, the evenness of the end against the start', () => {
    const d = first('b-pick-9');
    expect(d.beats).toBeGreaterThanOrEqual(400);
    expect(d.goal.bass?.drift).toBe(0.15);
    const m = first('b-pick-10');
    expect(m.notes.every((n) => n.technique === 'mute')).toBe(true);
  });

  it('meter by ear: answers on the group starts of a hidden grouping; the old tempo after the modulation fails', () => {
    const g = first('b-ear-20');
    expect(g.listen!.windows.length).toBe(2);
    expect(g.click).toBe('gap');
    expect(g.gap).toEqual([0, 1]);
    // The count-in bar is ungrouped (every 8th the same), so the grouping is only heard.
    expect(timeMapOf(g, 180).bars[0].groups.length).toBe(7);
    const m = first('b-ear-21');
    expect(m.tempoMap?.[0].ratio).toBe(1.5);
    const bpm = m.startBpm;
    expect(verdict(m, bpm, bassTake(m, bpm, 5, 3)).verdict).toBe('clean');
    // Keeping the old beat: the answers a quarter of the old tempo apart.
    const t0 = timeMapOf(m, bpm).msAt(12);
    const old = m.notes.map((n, i) => ({ pitch: n.pitch, on: t0 + i * (60000 / bpm), off: null, vel: 80 }));
    expect(verdict(m, bpm, old).verdict).not.toBe('clean');
  });
});

describe('BASS_NICHE_PLAN P2: the road-map strip', () => {
  it('a form drill shows its sections, the bar being played lit, and the next section cued a bar ahead', async () => {
    const { createElement: h } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { RoadMapStrip, sectionCue } = await import('../src/ui/RoadMap');
    const d = first('b-jform-2'); // AABA: A in 2, the bridge in 4
    const bpm = d.startBpm;
    const idle = renderToStaticMarkup(h(RoadMapStrip, { drill: d, beat: -1, bpm, lang: 'en' }));
    expect((idle.match(/data-rm-section=/g) ?? []).length).toBe(4);
    expect(idle).toContain('in 2');
    // Beat 60 = bar 16, the last bar of the second A (8 bars each): the bridge is cued, "in 4".
    const before = renderToStaticMarkup(h(RoadMapStrip, { drill: d, beat: 60, bpm, lang: 'en' }));
    expect(before).toContain('data-rm-cue="1"');
    expect(before).toMatch(/B — in 4/);
    expect((before.match(/class="on"/g) ?? []).length).toBe(1);
    const he = renderToStaticMarkup(h(RoadMapStrip, { drill: d, beat: 60, bpm, lang: 'he' }));
    expect(he).toContain('בארבע');
    expect(sectionCue({ name: 'S', kind: 'head', bars: 4, groove: 'stop' }, 'en')).toBe('stop-time hits');
    expect(renderToStaticMarkup(h(RoadMapStrip, { drill: first('b-walk-11'), beat: 0, bpm: 100, lang: 'en' }))).toBe('');
  });
});
