// BASS_NICHE_PLAN P1 (jazz and prog families, b-impro 7–14, b-ear 10–19): every new level builds in every key on
// every bass, its model line keeps its own rules, a steady synthetic human take passes at the target tempo, a sloppy
// one never; plus the wiring (track filter, symbols, path, tags, badges, quick lessons, summits).
import { describe, expect, it } from 'vitest';
import { families, levelDrills, shownFamilies, targetBpmOf, withBassTuning } from '../src/engine/drills/plan';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { withProg } from '../src/engine/drills/progAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { ruleCheck } from '../src/engine/drills/bassAnalyze';
import type { Drill, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import type { LevelDef } from '../src/engine/drills/generate';
import { bassTake, NEW_FAMS, NEW_LEVELS } from './bassTake';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { ladderFamiliesFor } from '../src/engine/ladderFacts';
import { stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { drillEvents } from '../src/engine/drills/events';
import { BADGES } from '../src/engine/badges';
import { lessonForUnit } from '../src/content/minilessons';
import { BASS_SUMMITS, improvCaptureOpts } from '../src/engine/drills/bassNiche';
import { courseOfResult } from '../src/engine/courseSocial';

describe('BASS_NICHE_PLAN P1: wiring', () => {
  it('the jazz and prog families open by the player’s track; both shows all', () => {
    const ids = (track?: 'jazz' | 'prog' | 'both') => ladderFamiliesFor('bass', { ...DEFAULT_DRILL_SETTINGS, bassTrack: track });
    for (const f of NEW_FAMS) expect(ids('both'), f).toContain(f);
    expect(ids()).toEqual(ids('both'));
    for (const f of ['b-swing', 'b-barry', 'b-jform', 'b-latin']) {
      expect(ids('jazz')).toContain(f);
      expect(ids('prog')).not.toContain(f);
    }
    for (const f of ['b-odd', 'b-prog', 'b-poly']) {
      expect(ids('prog')).toContain(f);
      expect(ids('jazz')).not.toContain(f);
    }
    // Shared families stay on both tracks (b-impro 7–14 and b-ear 10–19 included).
    for (const f of ['b-walk', 'b-impro', 'b-ear', 'b-pick']) {
      expect(ids('jazz')).toContain(f);
      expect(ids('prog')).toContain(f);
    }
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass', bassTrack: 'prog' }).some((f) => f.id === 'b-swing')).toBe(false);
  });

  it('every new family: own symbol, after its prerequisite on the path, rated, badged, a quick lesson, bass course', () => {
    const d = (id: string) => stepCatalogue().find((s) => s.id === `tech:${id}`)!.difficulty;
    const after: [string, string][] = [['b-swing-1', 'b-walk-6'], ['b-barry-1', 'b-impro-5'], ['b-jform-1', 'b-walk-10'], ['b-latin-1', 'b-styles-8'], ['b-odd-1', 'b-time-10'], ['b-prog-1', 'b-odd-2'], ['b-poly-1', 'b-odd-4']];
    for (const [a, b] of after) expect(d(a), `${a} after ${b}`).toBeGreaterThan(d(b));
    for (const f of NEW_FAMS) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(BADGES.some((b) => b.id === `tech:g-bass:${f}:${families('bass').find((x) => x.id === f)!.levels.length}`), f).toBe(true);
      expect(lessonForUnit(`tech:${f}`), f).not.toBeNull();
      expect(courseOfResult({ lessonId: `tech:${f}-1`, completedAt: '2026-11-11T10:00:00Z', xp: 4 })).toBe('bass');
      const lv = families('bass').find((x) => x.id === f)!.levels[0];
      const drill = levelDrills(lv, 'fifths-up')[0];
      const ev = drillEvents(drill, { verdict: 'clean', nps: 4, accuracy: 1, cvR: 0.02, cvL: null } as unknown as TakeMetrics, '2026-11-11T10:00:00Z', 's', 0)[0];
      expect(ev.tags!.length, f).toBe(2);
      expect(ev.tags![0].sub).toBe('instrument/bass-tech');
    }
    for (const t of ['jazz', 'prog'] as const) {
      expect(BADGES.some((b) => b.id === `tech:g-bass:summit-${t}`)).toBe(true);
      for (const id of BASS_SUMMITS[t].levels) expect(NEW_LEVELS().concat(families('bass').flatMap((f) => f.levels)).some((l) => l.id === id), id).toBe(true);
    }
  });

  it('the constraint-improvisation screen captures the bass register in the bass course', () => {
    expect(improvCaptureOpts({ activeCourse: 'bass' })).toEqual({ minHz: 28, fftSize: 4096 });
    expect(improvCaptureOpts({ activeCourse: 'bass', bassTuning: 'bass5' })!.minHz).toBe(22);
    expect(improvCaptureOpts({ activeCourse: 'jazz' })).toBeNull();
  });
});

/** The ride offset a placement level asks for (the middle of its window). */
const rideAim = (d: Drill): number => {
  const r = d.goal.bass?.swingWalk?.ride;
  return r ? (r[0] + r[1]) / 2 : 0;
};
const verdict = (d: Drill, bpm: number, take: PlayedNote[]): TakeMetrics => withProg(analyzeGuitarTake(d, bpm, take), d, bpm, take);

describe('BASS_NICHE_PLAN P1: the new levels', () => {
  it('every new level builds in every key, inside the neck, on 4-, 5- and 6-string, titled in both languages', () => {
    const lv = NEW_LEVELS();
    expect(lv.length).toBeGreaterThanOrEqual(70);
    for (const l of lv) {
      const t = l as LevelDef & { tempo?: [number, number] };
      expect(t.tempo![0], l.id).toBeLessThanOrEqual(t.tempo![1]);
      expect(l.title.he, l.id).not.toMatch(/[a-z]{4,}/);
      for (const d0 of levelDrills(l, 'fifths-up'))
        for (const tu of ['bass', 'bass5', 'bass6']) {
          const d = withBassTuning([d0], tu)[0];
          expect(d.notes.length, `${d.itemId} ${tu}`).toBeGreaterThan(7);
          for (const n of d.notes) expect((n.fret ?? 0) >= 0 && (n.fret ?? 0) <= 21, `${d.itemId} ${tu} fret ${n.fret}`).toBe(true);
          // Tune titles stay as they are (a standard's name); every other word is Hebrew.
          if (!['std-solo', 'latin-jazz'].includes(d.spec.kind)) expect(d.title.he, d.itemId).not.toMatch(/[a-z]{4,}/);
        }
    }
  });

  it('model lines keep their own rules (free-choice levels)', () => {
    for (const l of NEW_LEVELS())
      for (const d of levelDrills(l, 'fifths-up')) {
        const r = d.goal.bass?.rules;
        if (!r) continue;
        const rep = ruleCheck(r.kind, r.chart, d.notes.map((n) => ({ pitch: n.pitch, beat: n.beat })), d.meter || 4, r.maxMove ?? 4, { every: r.every, anticipate: r.anticipate, passing: r.passing });
        expect(rep.validShare, `${d.itemId}: ${rep.labels.join(' ')}`).toBe(1);
        expect(rep.beat1Ct, d.itemId).toBeGreaterThanOrEqual(0.9);
        if (rep.downbeat !== undefined) expect(rep.downbeat, d.itemId).toBe(1);
        if (rep.anticipated !== undefined) expect(rep.anticipated, d.itemId).toBeGreaterThanOrEqual(0.9);
      }
  });

  it('a steady take passes at the start and the target tempo; a sloppy one never', () => {
    const fails: string[] = [];
    for (const l of NEW_LEVELS())
      for (const d of levelDrills(l, 'fifths-up').slice(0, 3)) {
        for (const bpm of [d.startBpm, targetBpmOf(l, d)]) {
          const m = verdict(d, bpm, bassTake(d, bpm, 6, 3, rideAim(d)));
          if (m.verdict !== 'clean') fails.push(`${d.itemId}@${bpm}: ${m.verdict} — ${m.why.en}`);
          // Sloppy: 45 ms of jitter (twice the bass MIDI timing limit). Ear levels answer in whole notes a bar apart —
          // their point is the pitch, so their sloppy take is one with every other answer a half step off.
          for (const seed of [1, 2]) {
            const ear = d.spec.family === 'b-ear';
            const take = ear ? bassTake(d, bpm, 6, seed).map((p, i) => (i % 2 ? { ...p, pitch: p.pitch + 1 } : p)) : bassTake(d, bpm, 45, seed, rideAim(d));
            const s = verdict(d, bpm, take);
            if (s.verdict === 'clean') fails.push(`${d.itemId}@${bpm} sloppy seed ${seed} was clean`);
          }
        }
      }
    expect(fails).toEqual([]);
  });
});

describe('BASS_NICHE_PLAN P1: what each new family measures', () => {
  const lv = (id: string) => families('bass').flatMap((f) => f.levels).find((l) => l.id === id)!;
  const first = (id: string, i = 0) => levelDrills(lv(id), 'fifths-up')[i];

  it('swing time: short notes fail long quarters; on the beat fails "on top"; slowing down over the choruses fails', () => {
    const long = first('b-swing-1');
    const bpm = long.startBpm;
    const good = bassTake(long, bpm, 6, 3);
    expect(verdict(long, bpm, good).verdict).toBe('clean');
    const m = verdict(long, bpm, good.map((p) => ({ ...p, off: p.on + 120 })));
    expect(m.verdict).not.toBe('clean');
    expect(m.why.en).toMatch(/Long quarters/);
    const top = first('b-swing-2');
    expect(verdict(top, 140, bassTake(top, 140, 6, 3, -15)).verdict).toBe('clean');
    expect(verdict(top, 140, bassTake(top, 140, 6, 3, 0)).why.en).toMatch(/ride/);
    const ch = first('b-swing-5');
    const beat = 60000 / 180;
    // From the second chorus on every beat 4 % longer (dragging).
    const drag = bassTake(ch, 180, 6, 3).map((p) => {
      const b = p.on / beat;
      const on = b > 48 ? 48 * beat + (b - 48) * beat * 1.04 : p.on;
      return { ...p, on, off: on + beat * 0.9 };
    });
    expect(verdict(ch, 180, drag).verdict).not.toBe('clean');
  });

  it('odd meters: flat loudness fails the group accents; an extra 8th in every bar fails', () => {
    const d = first('b-odd-2');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 6, 3)).verdict).toBe('clean');
    const flat = bassTake(d, bpm, 6, 3).map((p, i) => ({ ...p, vel: 80 + (i % 3) }));
    expect(verdict(d, bpm, flat).verdict).not.toBe('clean');
    expect(verdict(d, bpm, flat).why.en).toMatch(/[Aa]ccent/);
    const eight = bassTake(d, bpm, 6, 3).map((p, i) => ({ ...p, on: p.on + Math.floor(d.notes[i].beat / 7) * (60000 / bpm) }));
    expect(verdict(d, bpm, eight).verdict).toBe('not');
  });

  it('metric modulation: keeping the old tempo fails, the new tempo passes', () => {
    const d = first('b-poly-5');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 5, 3)).verdict).toBe('clean');
    const old = d.notes.map((n) => ({ pitch: n.pitch, on: n.beat * (60000 / bpm), off: null, vel: 80 }));
    expect(verdict(d, bpm, old).verdict).toBe('not');
  });

  it('unisons: 30 ms behind the band fails the lock', () => {
    const d = first('b-prog-2');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 5, 3)).verdict).toBe('clean');
    const late = verdict(d, bpm, bassTake(d, bpm, 5, 3, 30));
    expect(late.verdict).not.toBe('clean');
    expect(late.prog?.unison?.mean ?? 0).toBeGreaterThan(20);
  });

  it('form: a bar too many in the head is a lost bar', () => {
    const d = first('b-jform-2');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 6, 3)).verdict).toBe('clean');
    const bar = 4 * (60000 / bpm);
    const lost = bassTake(d, bpm, 6, 3).map((p, i) => (d.notes[i].beat >= 12 ? { ...p, on: p.on + bar, off: (p.off ?? p.on) + bar } : p));
    expect(verdict(d, bpm, lost).verdict).toBe('not');
  });

  it('montuno: the current root on 4 instead of the next fails; an extra note on 1 in the tumbao fails', () => {
    const d = first('b-latin-3');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 6, 3)).verdict).toBe('clean');
    const chart = d.goal.bass!.rules!.chart;
    const late = bassTake(d, bpm, 6, 3).map((p, i) => {
      const n = d.notes[i];
      if (Math.abs((n.beat % 4) - 3) > 1e-6) return p;
      const r = chart[Math.floor(n.beat / 4) % chart.length].root;
      const down = (((p.pitch - r) % 12) + 12) % 12;
      return { ...p, pitch: p.pitch - down };
    });
    expect(verdict(d, bpm, late).verdict).not.toBe('clean');
    const tb = first('b-latin-1');
    const one = [...bassTake(tb, tb.startBpm, 6, 3), ...[4, 8, 12, 16, 20, 24].map((b) => ({ pitch: tb.notes[0].pitch, on: expTimeMs(tb, b, tb.startBpm), off: null, vel: 80 }))].sort((a, b) => a.on - b.on);
    expect(verdict(tb, tb.startBpm, one).verdict).not.toBe('clean');
  });

  it('Barry Harris: half-step-off notes on the downbeats fail the chord-tone rule', () => {
    const d = first('b-barry-3');
    const bpm = d.startBpm;
    expect(verdict(d, bpm, bassTake(d, bpm, 6, 3)).verdict).toBe('clean');
    const off = bassTake(d, bpm, 6, 3).map((p, i) => (Number.isInteger(d.notes[i].beat) && i % 4 === 0 && i > 0 ? { ...p, pitch: p.pitch + 1 } : p));
    expect(verdict(d, bpm, off).verdict).not.toBe('clean');
  });

  it('b-impro 5–6 are swung now: straight 8ths fail the swing ratio (BASS_NICHE_PLAN X3)', () => {
    for (const id of ['b-impro-5', 'b-impro-6', 'b-impro-8']) {
      const d = first(id);
      const bpm = d.startBpm;
      expect(d.spec.swing, id).toBe(true);
      expect(verdict(d, bpm, bassTake(d, bpm, 5, 3)).verdict, id).toBe('clean');
      const straight = d.notes.map((n) => ({ pitch: n.pitch, on: n.beat * (60000 / bpm), off: null, vel: 80 }));
      expect(verdict(d, bpm, straight).verdict, id).not.toBe('clean');
    }
  });

  it('trading 4s: the band lays out in the drum bars and the re-entry on 1 is measured', () => {
    const d = first('b-impro-14');
    expect(d.band?.rests).toEqual([[16, 32], [48, 64]]);
    expect(d.goal.bass?.landing).toBe(40);
    expect(d.notes.some((n) => n.beat > 17 && n.beat < 32)).toBe(false);
    const bpm = d.startBpm;
    const late = bassTake(d, bpm, 5, 3).map((p, i) => (Math.abs(d.notes[i].beat - 32) < 1e-6 ? { ...p, on: p.on + 70 } : p));
    expect(verdict(d, bpm, late).verdict).not.toBe('clean');
  });
});
