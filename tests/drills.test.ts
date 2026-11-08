import { describe, expect, it } from 'vitest';
import { catalog, generate, keysInOrder, MAJOR_FINGERING } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs, tempoBand } from '../src/engine/drills/analyze';
import { applyTake, familyLevel, ladderStep, newItem, todaysItems, weakness } from '../src/engine/drills/ladder';
import { customToDrill, patternFromPlayed, validateCustom } from '../src/engine/drills/custom';
import type { CustomDrill, Drill, DrillSpec, ExpNote, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';

const VEL: Record<string, number> = {
  'even-pp': 32,
  'even-p': 50,
  'even-mf': 80,
  'even-f': 98,
  'even-ff': 115,
};

/** A perfect take of a drill (each expected note at its time; one key press for a shared unison). */
function perfect(
  d: Drill,
  bpm: number,
  opts: {
    shift?: (n: ExpNote, i: number) => number;
    vel?: (n: ExpNote, i: number) => number;
    kdr?: number;
  } = {},
): PlayedNote[] {
  const beatMs = 60000 / bpm;
  const art = d.goal.articulation;
  const kdr = opts.kdr ?? (art === 'staccato' ? 0.3 : art === 'portato' ? 0.7 : 1);
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  d.notes.forEach((n, i) => {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) return;
    seen.add(k);
    const on = expTimeMs(d, n.beat, bpm) + (opts.shift ? opts.shift(n, i) : 0);
    const len = n.dur * beatMs;
    const vel = opts.vel ? opts.vel(n, i) : n.accent ? 100 : (VEL[d.goal.dynamics ?? ''] ?? 70);
    out.push({
      pitch: n.pitch,
      on,
      off: on + (kdr >= 1 ? len + 20 : len * kdr),
      vel,
    });
  });
  return out;
}

const spec = (o: Partial<DrillSpec>): DrillSpec => ({
  family: 'scales',
  kind: 'scale',
  key: 0,
  hands: 'R',
  ...o,
});

describe('drills: generate', () => {
  it('scale fingerings of C, F, B♭ and B major match the research table', () => {
    for (const key of [0, 5, 10, 11]) {
      for (const hands of ['R', 'L'] as const) {
        const d = generate(spec({ key, hands, octaves: 1 }));
        const up = d.notes.slice(0, 8).map((n) => n.finger);
        expect(up).toEqual(MAJOR_FINGERING[key][hands === 'R' ? 'r' : 'l']);
      }
    }
    expect(
      generate(spec({ key: 0, octaves: 1 }))
        .notes.slice(0, 8)
        .map((n) => n.finger),
    ).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    expect(
      generate(spec({ key: 5, octaves: 1 }))
        .notes.slice(0, 8)
        .map((n) => n.finger),
    ).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
    expect(
      generate(spec({ key: 10, octaves: 1, hands: 'L' }))
        .notes.slice(0, 8)
        .map((n) => n.finger),
    ).toEqual([3, 2, 1, 4, 3, 2, 1, 3]);
    expect(
      generate(spec({ key: 11, octaves: 1, hands: 'L' }))
        .notes.slice(0, 8)
        .map((n) => n.finger),
    ).toEqual([4, 3, 2, 1, 4, 3, 2, 1]);
    // Two octaves of B♭ RH: the middle B♭ takes 4 (not the starting 2).
    const bb2 = generate(spec({ key: 10, octaves: 2 })).notes.map((n) => n.finger);
    expect(bb2.slice(0, 15)).toEqual([2, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4]);
    // The C major scale itself.
    expect(generate(spec({ octaves: 1 })).notes.map((n) => n.pitch)).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
  });

  it('every catalogue item generates sorted notes in sensible ranges with stable, unique ids', () => {
    const ids = new Map<string, string>();
    let count = 0;
    for (const fam of catalog()) {
      expect(fam.levels.length).toBeGreaterThan(0);
      for (const lvl of fam.levels) {
        const keys = Array.isArray(lvl.keys) ? lvl.keys : keysInOrder('fifths-up', lvl.keys === 'minor');
        for (const tpl of lvl.specs)
          for (const key of keys) {
            const s = { ...tpl, key } as DrillSpec;
            const d = generate(s);
            count++;
            expect(d.notes.length).toBeGreaterThan(1);
            for (let i = 1; i < d.notes.length; i++) expect(d.notes[i].beat).toBeGreaterThanOrEqual(d.notes[i - 1].beat);
            const wide = (d.spec.octaves ?? 0) >= 3;
            for (const n of d.notes) {
              expect(n.pitch).toBeGreaterThanOrEqual(wide ? 21 : 28);
              expect(n.pitch).toBeLessThanOrEqual(wide ? 104 : 100);
              // RH from about C3 up, LH up to about G5 (3- and 4-octave runs reach further).
              if (n.hand === 'R') expect(n.pitch, d.itemId).toBeGreaterThanOrEqual(wide ? 40 : 47);
              if (n.hand === 'L') expect(n.pitch, d.itemId).toBeLessThanOrEqual(wide ? 92 : 79);
              expect(n.dur).toBeGreaterThan(0);
              if (n.finger !== undefined) expect([1, 2, 3, 4, 5]).toContain(n.finger);
            }
            expect(d.beats).toBeGreaterThan(d.notes[d.notes.length - 1].beat);
            expect(d.startBpm).toBeGreaterThanOrEqual(30);
            expect(d.startBpm).toBeLessThanOrEqual(220);
            expect(d.title.en.length).toBeGreaterThan(3);
            expect(d.title.he.length).toBeGreaterThan(3);
            for (const c of d.goal.chordSets ?? []) {
              expect(d.notes.some((n) => n.chordId === c.chordId)).toBe(true);
              for (const r of c.required) expect(c.allowed).toContain(r);
            }
            // Stable: same spec → same id and notes.
            const again = generate(s);
            expect(again.itemId).toBe(d.itemId);
            expect(again.notes).toEqual(d.notes);
            const sig = JSON.stringify({
              ...d.spec,
              octaves: d.spec.octaves || undefined,
            });
            const prev = ids.get(d.itemId);
            if (prev) expect(prev).toBe(sig);
            ids.set(d.itemId, sig);
          }
      }
    }
    expect(count).toBeGreaterThan(500);
  }, 120_000);

  it('a perfect take of every catalogue item in every key is clean', () => {
    for (const fam of catalog())
      for (const lvl of fam.levels)
        for (const tpl of lvl.specs)
          for (const key of Array.isArray(lvl.keys) ? lvl.keys : keysInOrder('fifths-up', lvl.keys === 'minor')) {
          const d = generate({ ...tpl, key } as DrillSpec);
          let vel: ((n: ExpNote, i: number) => number) | undefined;
          if (d.goal.dynamics === 'cresc') {
            const peak = d.notes.reduce((b, n, i) => (n.pitch > d.notes[b].pitch ? i : b), 0);
            vel = (_n, i) => 30 + 3 * (i <= peak ? i : 2 * peak - i);
          }
          const m = analyzeTake(d, d.startBpm, perfect(d, d.startBpm, { vel }));
          expect({ id: d.itemId, v: m.verdict, why: m.why.en }).toEqual({
            id: d.itemId,
            v: 'clean',
            why: m.why.en,
          });
          expect(m.accuracy).toBe(1);
          if (d.goal.chordTonesOnBeats) expect(m.chordToneOnBeats).toBe(1);
        }
  }, 60000);

  it('coverage guard: every audited sub-topic keeps its drill kinds (docs/research/DRILLS_COVERAGE_AUDIT.md)', () => {
    const kinds = new Map<string, Set<string>>();
    for (const fam of catalog())
      for (const lvl of fam.levels)
        for (const tpl of lvl.specs) {
          const k = kinds.get(fam.id) ?? new Set<string>();
          k.add(tpl.kind);
          kinds.set(fam.id, k);
        }
    const need: Record<string, string[]> = {
      scales: ['scale'],
      arpeggios: ['arp-triad', 'arp-dom7', 'arp-dim7', 'arp-maj7', 'arp-m7', 'arp-hd7', 'broken', 'blocked'],
      cadences: ['cadence-1', 'cadence-64', 'cadence-ii6', 'cadence-circle', 'cadence-vofv', 'cadence-n6', 'cadence-aug6', 'cadence-plagal', 'cadence-deceptive', 'cadence-picardy'],
      fingers: ['five', 'hanon-1', 'hanon-style', 'held', 'trill', 'repeated', 'thumb-under', 'ornament', 'rep-chords', 'rotation', 'velocity'],
      control: ['scale', 'voicing', 'melody-alberti', 'balance', 'pedal', 'reading'],
      advanced: ['octaves', 'polyrhythm', 'double-notes', 'leaps'],
      harris: ['h1-linear', 'h2-dominant', 'h3-triads', 'h4-chords', 'h5-pivots', 'h6-approach', 'h7-line', 'h8-brothers', 'h9-sixdim', 'h10-minor6dim', 'h11-arp-scale'],
      voicings: ['v-triads', 'v-sevenths', 'shells', 'rootless', 'one-minute', 'blues-shells', 'so-what', 'quartal', 'two-hand', 'drop2', 'tritone-sub', 'comp', 'coltrane-v'],
      jazz: ['guide-tones', 'digital', 'ust', 'jscale', 'form-thirds', 'form-guide', 'form-arp', 'locked', 'coltrane', 'blues-lick'],
      accomp: ['alberti', 'walking', 'stride', 'boogie', 'bossa', 'montuno', 'pop-lh', 'walk-changes'],
    };
    for (const [fam, ks] of Object.entries(need)) for (const k of ks) expect(kinds.get(fam)?.has(k), `${fam}/${k}`).toBe(true);
    // Every scale motion and form of the syllabi is offered (major, minor, chromatic; contrary, 3rd / 6th / 10th apart, formula).
    const scaleSpecs = catalog()
      .find((f) => f.id === 'scales')!
      .levels.flatMap((l) => l.specs);
    for (const motion of ['contrary', 'third', 'sixth', 'tenth', 'formula'] as const) {
      expect(
        scaleSpecs.some((sp) => sp.motion === motion && !sp.minor && sp.scale !== 'chromatic'),
        `major ${motion}`,
      ).toBe(true);
      if (motion !== 'formula') expect(scaleSpecs.some((sp) => sp.motion === motion && sp.minor), `minor ${motion}`).toBe(true);
    }
    for (const motion of ['contrary', 'third', 'sixth'] as const) expect(scaleSpecs.some((sp) => sp.motion === motion && sp.scale === 'chromatic'), `chromatic ${motion}`).toBe(true);
    for (const oct of [1, 2, 3, 4]) expect(scaleSpecs.some((sp) => sp.octaves === oct), `${oct} octaves`).toBe(true);
    // No family is thin: every piano family has at least 7 levels.
    for (const fam of catalog()) expect(fam.levels.length, fam.id).toBeGreaterThanOrEqual(7);
  });

  it('coverage additions: exact shapes', () => {
    // Chromatic a minor 3rd apart: the hands stay exactly 3 semitones apart; a major 6th apart: 9.
    const ch = generate(spec({ hands: 'RL', scale: 'chromatic', motion: 'third' }));
    const R = ch.notes.filter((n) => n.hand === 'R');
    const L = ch.notes.filter((n) => n.hand === 'L');
    expect(R.length).toBe(L.length);
    R.forEach((n, i) => expect(n.pitch - L[i].pitch).toBe(3));
    const c6 = generate(spec({ hands: 'RL', scale: 'chromatic', motion: 'sixth' }));
    const R6 = c6.notes.filter((n) => n.hand === 'R');
    c6.notes.filter((n) => n.hand === 'L').forEach((n, i) => expect(R6[i].pitch - n.pitch).toBe(9));
    // Thumb under after 3 in C: C D E F E D, fingers 1 2 3 1 3 2.
    const tu = generate({ family: 'fingers', kind: 'thumb-under', key: 0, hands: 'R' });
    expect(tu.notes.slice(0, 6).map((n) => n.pitch)).toEqual([60, 62, 64, 65, 64, 62]);
    expect(tu.notes.slice(0, 6).map((n) => n.finger)).toEqual([1, 2, 3, 1, 3, 2]);
    // Upper mordent on C: C D C, the main note again after a 32nd.
    const mo = generate({ family: 'fingers', kind: 'ornament', key: 0, hands: 'R', option: 0 });
    expect(mo.notes.slice(0, 3).map((n) => [n.pitch, n.beat])).toEqual([
      [60, 0],
      [62, 0.125],
      [60, 0.25],
    ]);
    // Pedalling: the plan marks every harmony change.
    const pd = generate({ family: 'control', kind: 'pedal', key: 0, hands: 'RL', option: 1 });
    expect(pd.goal.pedal).toEqual({ style: 'legato', changes: [0, 4, 8, 12, 16] });
    // Locked hands: the LH doubles the melody (the RH top note) an octave down.
    const lk = generate({ family: 'jazz', kind: 'locked', key: 0, hands: 'RL' });
    for (const id of new Set(lk.notes.map((n) => n.chordId))) {
      const g = lk.notes.filter((n) => n.chordId === id);
      const top = Math.max(...g.filter((n) => n.hand === 'R').map((n) => n.pitch));
      expect(g.find((n) => n.hand === 'L')!.pitch).toBe(top - 12);
    }
    // Charleston: chords on 1 and the "and" of 2 in every bar.
    const cp = generate({ family: 'voicings', kind: 'comp', key: 0, hands: 'L', option: 0, swing: true });
    expect([...new Set(cp.notes.map((n) => n.beat))]).toEqual([0, 1.5, 4, 5.5, 8, 9.5, 12, 13.5]);
    // Coltrane cycle in C: C – E♭7 – A♭ – B7 – E – G7 – C, the root on each chord's first beat.
    const co = generate({ family: 'jazz', kind: 'coltrane', key: 0, hands: 'R' });
    expect([0, 2, 4, 6, 8, 10, 12].map((b) => co.notes.find((n) => n.beat === b)!.pitch % 12)).toEqual([0, 3, 8, 11, 4, 7, 0]);
    // Barry Harris H11: G7 arpeggio 3-5-7-9 up, then the scale down with chord tones on every beat.
    const h11 = generate({ family: 'harris', kind: 'h11-arp-scale', key: 7, hands: 'R', option: 1 });
    expect(h11.notes.slice(0, 4).map((n) => n.pitch % 12)).toEqual([11, 2, 5, 9]);
    for (const n of h11.notes.filter((q) => Number.isInteger(q.beat))) expect([7, 11, 2, 5]).toContain(n.pitch % 12);
    // Minor blues guide tones: the first target is the 3rd or 7th of Cm7.
    const mb = generate({ family: 'jazz', kind: 'form-guide', key: 0, hands: 'R', option: 1 });
    expect([3, 10]).toContain(mb.notes[0].pitch % 12);
  });

  it('second review additions (docs/research/DRILLS_SECOND_REVIEW.md)', () => {
    // Hand crossing: on beat 3 of every bar the LH plays above every RH note sounding then.
    const hc = generate({ family: 'advanced', kind: 'leaps', key: 0, hands: 'RL', option: 3 });
    for (let bar = 0; bar < 8; bar++) {
      const lh = hc.notes.find((n) => n.hand === 'L' && n.beat === bar * 4 + 2)!;
      const rh = hc.notes.filter((n) => n.hand === 'R' && n.beat >= bar * 4 && n.beat < bar * 4 + 4);
      expect(lh.pitch).toBeGreaterThan(Math.max(...rh.map((n) => n.pitch)));
      expect(hc.notes.find((n) => n.hand === 'L' && n.beat === bar * 4)!.pitch).toBeLessThan(Math.min(...rh.map((n) => n.pitch)));
    }
    // Alberti bass in keys outside C / G / F: root position, every note defined (A major used to come out empty).
    for (const key of [9, 2, 4, 11, 1]) {
      const al = generate({ family: 'accomp', kind: 'alberti', key, hands: 'L' });
      expect(al.notes.every((n) => Number.isFinite(n.pitch))).toBe(true);
      expect(al.notes[0].pitch % 12).toBe(key);
    }
    // Piano families may grow: advanced and accompaniment gained a level each.
    expect(catalog().find((f) => f.id === 'advanced')!.levels.length).toBeGreaterThanOrEqual(8);
    expect(catalog().find((f) => f.id === 'accomp')!.levels.length).toBeGreaterThanOrEqual(10);
  });

  it('contrary motion mirrors (unison start, opposite steps, both hands on every beat)', () => {
    const d = generate(spec({ hands: 'RL', motion: 'contrary', octaves: 2 }));
    const R = d.notes.filter((n) => n.hand === 'R');
    const L = d.notes.filter((n) => n.hand === 'L');
    expect(R.length).toBe(L.length);
    expect(R[0].pitch).toBe(L[0].pitch);
    for (let i = 1; i < R.length; i++) {
      expect(R[i].beat).toBe(L[i].beat);
      expect(Math.sign(R[i].pitch - R[i - 1].pitch)).toBe(-Math.sign(L[i].pitch - L[i - 1].pitch));
    }
    expect(R[14].pitch - R[0].pitch).toBe(24);
    expect(L[0].pitch - L[14].pitch).toBe(24);
    // Every LH pitch belongs to C major.
    for (const n of L) expect([0, 2, 4, 5, 7, 9, 11]).toContain(n.pitch % 12);
  });

  it('key orders', () => {
    expect(keysInOrder('chromatic-up')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(keysInOrder('chromatic-down').slice(0, 3)).toEqual([0, 11, 10]);
    expect(keysInOrder('fifths-up').slice(0, 4)).toEqual([0, 7, 2, 9]);
    expect(keysInOrder('fifths-down').slice(0, 4)).toEqual([0, 5, 10, 3]);
    expect(keysInOrder('difficulty')).toEqual([0, 7, 2, 9, 4, 5, 11, 10, 3, 8, 1, 6]);
    expect(keysInOrder('difficulty', true).slice(0, 3)).toEqual([9, 4, 2]);
    for (const o of ['chromatic-up', 'chromatic-down', 'fifths-up', 'fifths-down', 'difficulty'] as const) expect(new Set(keysInOrder(o, true)).size).toBe(12);
  });

  it('Hanon No. 1 pattern and the cadence voice leading', () => {
    const h = generate({
      family: 'fingers',
      kind: 'hanon-1',
      key: 0,
      hands: 'R',
    });
    expect(h.notes.slice(0, 16).map((n) => n.pitch)).toEqual([48, 52, 53, 55, 57, 55, 53, 52, 50, 53, 55, 57, 59, 57, 55, 53]); // C3 E F G A G F E | D3 F G A B …
    expect(h.notes.slice(0, 8).map((n) => n.finger)).toEqual([1, 2, 3, 4, 5, 4, 3, 2]);
    const c = generate({
      family: 'cadences',
      kind: 'cadence-64',
      key: 0,
      hands: 'RL',
      option: 1,
    });
    const rh = [...new Set(c.notes.map((n) => n.chordId))].map((id) => c.notes.filter((n) => n.chordId === id && n.hand === 'R').map((n) => n.pitch));
    expect(rh[0][2] % 12).toBe(4); // 3rd on top
    for (let i = 1; i < rh.length; i++) {
      const moved = rh[i].reduce((a, p, j) => a + Math.abs(p - rh[i - 1][j]), 0);
      expect(moved).toBeLessThanOrEqual(5);
    }
  });
});

describe('drills: analyzeTake', () => {
  const d = generate(spec({ hands: 'RL', octaves: 2 }));
  const bpm = 80;

  it('a perfect take is clean with CV 0 and Δ 0', () => {
    const m = analyzeTake(d, bpm, perfect(d, bpm));
    expect(m.verdict).toBe('clean');
    expect(m.accuracy).toBe(1);
    expect(m.wrong).toBe(0);
    expect(m.cvR).toBeCloseTo(0, 6);
    expect(m.cvL).toBeCloseTo(0, 6);
    expect(m.handsAbs).toBeCloseTo(0, 6);
    expect(m.timingSD).toBeCloseTo(0, 6);
    expect(m.hesitations).toBe(0);
    expect(m.why.en).toMatch(/Clean/);
    expect(tempoBand(m.nps)).toBe(1);
  });

  it('RH 15 % late on alternate notes → uneven, the right hand named', () => {
    const ioi = 60000 / bpm / 2;
    let r = 0;
    const take = perfect(d, bpm, {
      shift: (n) => (n.hand === 'R' && r++ % 2 === 1 ? 0.15 * ioi : 0),
    });
    const m = analyzeTake(d, bpm, take);
    expect(m.verdict).toBe('not');
    expect(m.cvR!).toBeGreaterThan(0.1);
    expect(m.cvL).toBeCloseTo(0, 6);
    expect(m.why.en).toMatch(/^RH uneven \(\d+(\.\d)? %\)$/);
    expect(m.why.he).toMatch(/^יד ימין לא אחידה/);
    expect(m.handsAbs!).toBeGreaterThan(10);
  });

  it('wrong and missing notes', () => {
    const take = perfect(d, bpm);
    take[3] = { ...take[3], pitch: take[3].pitch + 1 };
    take.splice(10, 1);
    const m = analyzeTake(d, bpm, take);
    expect(m.wrong).toBe(1);
    expect(m.missing).toBe(2);
    expect(m.verdict).not.toBe('clean');
    expect(m.perNote.filter((p) => !p.ok).length).toBe(2);
  });

  it('crescendo: a smooth rise is clean, a flat line is not', () => {
    const c = generate({
      family: 'control',
      kind: 'scale',
      key: 0,
      hands: 'R',
      octaves: 2,
      dynamics: 'cresc',
    });
    const peak = 14;
    const good = analyzeTake(
      c,
      70,
      perfect(c, 70, {
        vel: (_n, i) => 30 + 4 * (i <= peak ? i : 2 * peak - i),
      }),
    );
    expect(good.r2!).toBeGreaterThan(0.95);
    expect(good.slope!).toBeCloseTo(4, 3);
    expect(good.verdict).toBe('clean');
    const flat = analyzeTake(c, 70, perfect(c, 70, { vel: (_n, i) => 70 + (i % 2) * 3 }));
    expect(flat.verdict).toBe('not');
    expect(flat.why.en).toMatch(/Crescendo/);
  });

  it('legato vs staccato: KOT and KDR', () => {
    const leg = generate({
      family: 'control',
      kind: 'scale',
      key: 0,
      hands: 'R',
      octaves: 1,
      articulation: 'legato',
    });
    const sta = generate({
      family: 'control',
      kind: 'scale',
      key: 0,
      hands: 'R',
      octaves: 1,
      articulation: 'staccato',
    });
    const legTake = perfect(leg, 80, { kdr: 1 });
    const staTake = perfect(sta, 80, { kdr: 0.3 });
    const a = analyzeTake(leg, 80, legTake);
    expect(a.kot).toBeCloseTo(20, 5);
    expect(a.verdict).toBe('clean');
    const b = analyzeTake(sta, 80, staTake);
    expect(b.kdr).toBeCloseTo(0.3, 5);
    expect(b.kot!).toBeLessThan(-100);
    expect(b.verdict).toBe('clean');
    // Swapped: legato played on the staccato drill, staccato played on the legato drill.
    const c = analyzeTake(sta, 80, perfect(sta, 80, { kdr: 1 }));
    expect(c.verdict).toBe('not');
    expect(c.why.en).toMatch(/Staccato too long/);
    const e = analyzeTake(leg, 80, perfect(leg, 80, { kdr: 0.3 }));
    expect(e.verdict).toBe('not');
    expect(e.why.en).toMatch(/Not legato/);
  });

  it('even dynamics band and velocity SD', () => {
    const p = generate({
      family: 'control',
      kind: 'scale',
      key: 0,
      hands: 'R',
      octaves: 2,
      dynamics: 'even-p',
    });
    expect(analyzeTake(p, 70, perfect(p, 70)).bandHit).toBe(1);
    const loud = analyzeTake(p, 70, perfect(p, 70, { vel: () => 100 }));
    expect(loud.bandHit).toBe(0);
    expect(loud.verdict).toBe('not');
    const cal = { latencyMs: 0, velMin: 20, velMax: 120 };
    expect(analyzeTake(p, 70, perfect(p, 70, { vel: () => 45 }), cal).bandHit).toBe(1);
  });

  it('Barry Harris H2: root → ♮7 → ♭7 puts chord tones on every beat', () => {
    const h = generate({
      family: 'harris',
      kind: 'h2-dominant',
      key: 7,
      hands: 'R',
      option: 0,
    });
    const pcs = h.notes.map((n) => n.pitch % 12);
    expect(pcs.slice(0, 4)).toEqual([7, 6, 5, 4]); // G, F♯, F, E
    const onBeats = h.notes.filter((n) => Number.isInteger(n.beat)).map((n) => n.pitch % 12);
    for (const p of onBeats) expect([7, 11, 2, 5]).toContain(p);
    const m = analyzeTake(h, 60, perfect(h, 60));
    expect(m.chordToneOnBeats).toBe(1);
    expect(m.verdict).toBe('clean');
    // Without the half step (plain mixolydian down), the chord tones slip off the beats.
    const top = h.notes[0].pitch;
    const mixo: number[] = [top];
    for (let p = top - 1; mixo.length < 17; p--) if ([7, 9, 11, 0, 2, 4, 5].includes(p % 12)) mixo.push(p);
    const take = mixo.map((pitch, i) => ({
      pitch,
      on: i * 500,
      off: i * 500 + 480,
      vel: 70,
    }));
    const bad = analyzeTake(h, 60, take);
    expect(bad.chordToneOnBeats!).toBeLessThan(0.6);
    expect(bad.verdict).not.toBe('clean');
    // All four starting chord tones keep the rule.
    for (const option of [1, 2, 3]) {
      const x = generate({
        family: 'harris',
        kind: 'h2-dominant',
        key: 0,
        hands: 'R',
        option,
      });
      for (const n of x.notes.filter((q) => Number.isInteger(q.beat))) expect([0, 4, 7, 10]).toContain(n.pitch % 12);
    }
  });

  it('chord sets: another voicing of the right chord passes, a wrong chord does not', () => {
    const r = generate({
      family: 'voicings',
      kind: 'rootless',
      key: 0,
      hands: 'L',
    });
    expect(analyzeTake(r, 60, perfect(r, 60)).verdict).toBe('clean');
    // Dm9 as B voicing (C E F A) instead of A — still correct.
    const alt = perfect(r, 60).map((p) => (p.on < 100 ? p : p));
    const first = alt.filter((p) => p.on < 100);
    const dB = [60, 64, 65, 69];
    first.forEach((p, i) => (p.pitch = dB[i]));
    const m = analyzeTake(r, 60, alt);
    expect(m.accuracy).toBe(1);
    expect(m.wrong).toBe(0);
    expect(m.voiceLeading).not.toBeNull();
    // A wrong note (D♭) in the first chord.
    const bad = perfect(r, 60);
    bad[0] = { ...bad[0], pitch: 49 };
    const mb = analyzeTake(r, 60, bad);
    expect(mb.wrong).toBeGreaterThan(0);
    expect(mb.verdict).not.toBe('clean');
  });
});

describe('drills: ladder', () => {
  const d = generate(spec({ hands: 'RL' }));
  const take = (verdict: TakeMetrics['verdict'], extra: Partial<TakeMetrics> = {}): TakeMetrics => ({
    ...analyzeTake(d, 80, perfect(d, 80)),
    verdict,
    ...extra,
  });

  it('3 clean in a row → +1 step; 2 failed → −10 %', () => {
    let st = { ...newItem(d), goalBpm: 100 };
    let r = applyTake(st, take('clean'), 100, '2026-11-07T10:00:00Z');
    expect(r.next.action).toBe('again');
    r = applyTake(r.state, take('clean'), 100, '2026-11-07T10:01:00Z');
    expect(r.state.streak).toBe(2);
    r = applyTake(r.state, take('clean'), 100, '2026-11-07T10:02:00Z');
    expect(r.next.action).toBe('raise');
    expect(r.next.bpm).toBe(104);
    expect(r.state.cleanBpm).toBe(100);
    expect(r.state.streak).toBe(0);
    expect(r.message.en).toBe('3 clean at ♩ 100 → ♩ 104');
    expect(r.state.history.length).toBe(1);
    expect(ladderStep(40)).toBe(2);
    // An almost breaks the streak.
    st = r.state;
    r = applyTake(st, take('clean'), 104, '2026-11-08T10:00:00Z');
    r = applyTake(r.state, take('almost'), 104, '2026-11-08T10:01:00Z');
    expect(r.state.streak).toBe(0);
    r = applyTake(r.state, take('not'), 104, '2026-11-08T10:02:00Z');
    expect(r.next.action).toBe('again');
    r = applyTake(r.state, take('not'), 104, '2026-11-08T10:03:00Z');
    expect(r.next.action).toBe('lower');
    expect(r.next.bpm).toBe(94);
    expect(r.state.takes).toBe(7);
    expect(r.state.ewma.acc).toBeCloseTo(1, 6);
  });

  it('continuous modes: next key, raise tempo, next drill', () => {
    const st = { ...newItem(d), goalBpm: 80 };
    const nk = applyTake(st, take('clean'), 80, '2026-11-07', {
      ...DEFAULT_DRILL_SETTINGS,
      continuous: 'next-key',
    });
    expect(nk.next.action).toBe('next-key');
    const rt = applyTake(st, take('almost'), 80, '2026-11-07', {
      ...DEFAULT_DRILL_SETTINGS,
      continuous: 'raise-tempo',
    });
    expect(rt.next.action).toBe('raise');
    expect(rt.next.bpm).toBe(83);
    const nd = applyTake(st, take('clean'), 80, '2026-11-07', {
      ...DEFAULT_DRILL_SETTINGS,
      continuous: 'next-drill',
    });
    expect(nd.next.action).toBe('next-drill');
    // Below the accuracy threshold: the plain ladder.
    const low = applyTake(st, take('almost', { accuracy: 0.9 }), 80, '2026-11-07', { ...DEFAULT_DRILL_SETTINGS, continuous: 'next-key' });
    expect(low.next.action).toBe('again');
  });

  it("weakness, today's items and the family level", () => {
    const keys = [0, 7, 2, 9, 4, 5];
    const drills = keys.map((key) => generate(spec({ key, hands: 'RL' })));
    const states = drills.map((dr, i) => ({
      ...newItem(dr),
      takes: 5,
      goalBpm: 100,
      cleanBpm: [100, 96, 90, 70, 98, 99][i],
      last: ['2026-11-06', '2026-11-06', '2026-11-05', '2026-11-06', '2026-10-01', '2026-11-06'][i],
      ewma: {
        cv: [0.02, 0.03, 0.05, 0.08, 0.03, 0.025][i],
        sd: 20,
        vsd: 8,
        hands: 15,
        acc: 1,
      },
    }));
    const w = states.map((s) => weakness(s, states, '2026-11-07'));
    expect(w[3]).toBe(Math.max(...w));
    const fresh = generate(spec({ key: 11, hands: 'RL' }));
    const variant = generate(spec({ key: 0, hands: 'RL', variant: 'dotted' }));
    const today = todaysItems(states, [...drills, fresh, variant], 5, '2026-11-07');
    expect(today.length).toBe(5);
    expect(today[0].role).toBe('warm-up');
    expect(today.some((t) => t.drill.itemId === drills[3].itemId && t.role === 'weak')).toBe(true);
    expect(today.some((t) => t.role === 'maintenance')).toBe(true);
    expect(today.some((t) => t.role === 'variant')).toBe(true);
    for (let i = 1; i < today.length; i++) expect(today[i].drill.spec.key === today[i - 1].drill.spec.key && i > 1).toBe(false);
    const lvl = familyLevel(states, 'scales', drills);
    expect(lvl).toBeGreaterThanOrEqual(1);
    expect(familyLevel(states, 'harris')).toBe(0);
  });
});

describe('drills: custom', () => {
  const c: CustomDrill = {
    id: 'mine1',
    name: 'Thirds up',
    scale: 'major',
    pattern: [
      { deg: 1, dur: 0.5, hand: 'R' },
      { deg: 3, dur: 0.5, hand: 'R' },
      { deg: 2, dur: 0.5, hand: 'R' },
      { deg: 4, dur: 0.5, hand: 'R' },
      { deg: 5, alt: 1, dur: 1, hand: 'R' },
    ],
    sequenceSteps: 3,
    hands: 'RL',
    createdAt: '2026-11-07',
  };

  it('becomes a Drill in any key, sequenced up and back, hands an octave apart', () => {
    expect(validateCustom(c)).toEqual([]);
    expect(validateCustom({ ...c, pattern: [] }).length).toBeGreaterThan(0);
    const d = customToDrill(c, 2);
    expect(d.itemId).toBe('custom:mine1:2:RL');
    expect(d.spec.family).toBe('custom');
    const R = d.notes.filter((n) => n.hand === 'R');
    const L = d.notes.filter((n) => n.hand === 'L');
    expect(R.length).toBe(5 * 7);
    expect(R.slice(0, 5).map((n) => n.pitch)).toEqual([62, 66, 64, 67, 70]); // D F♯ E G A♯
    expect(R.slice(5, 10).map((n) => n.pitch)).toEqual([64, 67, 66, 69, 72]); // up a step (B♯ = C)
    R.forEach((n, i) => {
      expect(L[i].pitch).toBe(n.pitch - 12);
      expect(L[i].beat).toBe(n.beat);
    });
    expect(R[R.length - 5].pitch).toBe(62);
    expect(d.goal.evenness).toBe(true);
    expect(analyzeTake(d, d.startBpm, perfect(d, d.startBpm)).verdict).toBe('clean');
  });

  it('patternFromPlayed round-trips a played pattern in another key', () => {
    const d = customToDrill({ ...c, hands: 'R' }, 7);
    const beatMs = 500;
    const played = d.notes.slice(0, 5).map((n) => ({ pitch: n.pitch, on: n.beat * beatMs + (n.beat ? 7 : 0) }));
    const pat = patternFromPlayed(played, 7, 'major');
    expect(pat.map((p) => [p.deg, p.alt ?? 0, p.hand])).toEqual(c.pattern.map((p) => [p.deg, p.alt ?? 0, 'R']));
    expect(pat.slice(0, 4).map((p) => p.dur)).toEqual([0.5, 0.5, 0.5, 0.5]);
    // A chord (two notes together) becomes length 0 + the last note's length.
    const chord = patternFromPlayed(
      [
        { pitch: 60, on: 0 },
        { pitch: 64, on: 10 },
        { pitch: 67, on: 400 },
        { pitch: 72, on: 800 },
      ],
      0,
      'major',
    );
    expect(chord.map((p) => [p.deg, p.dur])).toEqual([
      [1, 0],
      [3, 0.5],
      [5, 0.5],
      [8, 0.5],
    ]);
  });
});
