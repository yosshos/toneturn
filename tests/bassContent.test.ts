// Bass course content fixes (BASS_AUDIT track B): wrong notes, placement, free-choice rules, meters, swing, ear,
// upright, placement decisions. Pure engine tests.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { levelKeys } from '../src/engine/drills/plan';
import { parseChart } from '../src/engine/charts';
import { tuningById } from '../src/engine/fretboard';
import { drumHits } from '../src/engine/drills/bass';
import { BASS_PROBES, placeBass, placeEar, placePluck, placePocket, placeScale, placeSlap, placeWalk, probeSlot, tuningFromLowest } from '../src/engine/drills/bassProbes';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const BASS = guitarCatalog().filter((f) => f.id.startsWith('b-'));
const lv = (fam: string, n: number): GuitarLevelDef => BASS.find((f) => f.id === fam)!.levels[n - 1];
const pc = (m: number) => ((m % 12) + 12) % 12;
const allDrills = (fam: string, n: number, tunings = ['bass']): Drill[] => {
  const l = lv(fam, n);
  return levelKeys(l, 'fifths-up').flatMap((key) => l.specs.flatMap((sp) => (sp.tuning ? [sp.tuning] : tunings).map((tuning) => generate({ ...sp, key, tuning } as DrillSpec))));
};

/** The chart chord sounding at a beat (one chart entry per bar; two chords in a bar split it). */
function chordAt(d: Drill, beat: number) {
  const text = (d.chart ?? []).map((c) => c.replace(/♭/g, 'b').replace(/♯/g, '#').replace('°7', 'dim7').replace(/[‖:𝄋⊕]|1\.|2\.|D\.S\. al/g, '').trim() || 'N.C.').join(' | ');
  const p = parseChart(text, d.meter);
  const bar = Math.floor(beat / d.meter + 1e-9);
  const inBar = p.chords.filter((c) => c.bar === bar);
  return inBar.filter((c) => c.at <= beat - bar * d.meter + 1e-9).pop() ?? inBar[0];
}

describe('B4: chart drills play the chart', () => {
  // Every chart drill of the harmony families: each note is a tone of its chord (or the next chord, when anticipated
  // up to a half beat before the bar line), or is marked as an approach / passing tone (chordTone false), or a ghost.
  const fams: [string, number[]][] = [
    ['b-chord', [1, 2, 3, 4, 5, 8, 9, 10]],
    ['b-walk', [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 16, 17]],
    ['b-styles', [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14]],
    ['b-pocket', [1, 2, 3, 4, 5, 6, 7, 8]],
    ['b-read', [6, 8, 10, 11, 12]],
  ];
  for (const [fam, levels] of fams)
    it(`${fam}: every note is a chord tone or a marked approach`, () => {
      for (const n of levels)
        for (const d of allDrills(fam, n)) {
          if (!d.chart?.length || d.spec.kind === 'roadmap') continue;
          for (const nt of d.notes) {
            if (nt.chordTone === false || nt.technique === 'dead' || nt.technique === 'harmonic' || nt.beat >= d.chart.length * d.meter) continue;
            const c = chordAt(d, nt.beat);
            if (!c) continue;
            const tones = new Set([c.bass, ...c.iv.map((x) => c.root + x)].map(pc));
            const next = chordAt(d, Math.ceil((nt.beat + 1e-6) / d.meter) * d.meter);
            const nextTones = next ? new Set([next.bass, ...next.iv.map((x) => next.root + x)].map(pc)) : new Set<number>();
            const anticip = Math.ceil((nt.beat + 1e-6) / d.meter) * d.meter - nt.beat <= 0.5 + 1e-6;
            const ok = tones.has(pc(nt.pitch)) || (anticip && nextTones.has(pc(nt.pitch)));
            expect(ok, `${d.title.en} beat ${nt.beat} pitch ${nt.pitch} over ${c.sym}`).toBe(true);
          }
        }
    });

  it('pop ballad: D (the 5th of G) under G/B, never F♯; the chart names G/B', () => {
    const d = generate({ family: 'b-styles', kind: 'style', key: 0, hands: 'R', option: 1 });
    expect(d.chart?.[1]).toBe('G/B');
    const bar2 = d.notes.filter((n) => n.beat >= 4 && n.beat < 7.5).map((n) => pc(n.pitch));
    expect(bar2).toContain(2);
    expect(bar2).not.toContain(6);
  });

  it('walk L4–L6: beat 4 never repeats beat 3, and the last bar approaches the closing tonic', () => {
    for (const n of [4, 5, 6])
      for (const d of allDrills('b-walk', n, ['bass', 'bass5'])) {
        const bars = Math.round(d.chart!.length);
        for (let bar = 0; bar < bars; bar++) {
          const b3 = d.notes.find((x) => x.beat === bar * 4 + 2)!;
          const b4 = d.notes.find((x) => x.beat === bar * 4 + 3)!;
          expect(b4.pitch, `${d.title.en} bar ${bar + 1}`).not.toBe(b3.pitch);
        }
        const last = d.notes.find((x) => x.beat === bars * 4 - 1)!;
        const tonic = d.notes[d.notes.length - 1];
        expect(pc(tonic.pitch)).toBe(pc(d.spec.key));
        const dist = Math.min(...[-12, 0, 12].map((o) => Math.abs(last.pitch + o - tonic.pitch)));
        if (n === 4) expect(dist, d.title.en).toBe(1);
        if (n === 5) expect([5, 7]).toContain(dist);
      }
  });

  it('idle-string muting: the high notes sit on strings ≤ n−2 on every bass', () => {
    for (const tid of ['bass', 'bass5', 'bass6', 'bass-dropd']) {
      const n = tuningById(tid).open.length;
      for (const d of allDrills('b-length', 3, [tid])) for (const nt of d.notes.filter((x) => x.fret! > 0)) expect(nt.string!, `${tid} ${nt.beat}`).toBeLessThanOrEqual(n - 2);
    }
  });

  it('standards: the real key in the title and key signature, the part named, Blue Bossa as a bossa pattern', () => {
    const autumn = generate({ family: 'b-walk', kind: 'standard', key: 0, hands: 'R', perBeat: 1, option: 3 });
    expect(autumn.title.en).toMatch(/Autumn Leaves.*· Gm$/);
    expect(autumn.keySig).toBe('Bb');
    const fly = generate({ family: 'b-walk', kind: 'standard', key: 0, hands: 'R', perBeat: 1, option: 0 });
    expect(fly.title.en).toMatch(/A section/);
    const bb = generate({ family: 'b-walk', kind: 'standard', key: 0, hands: 'R', perBeat: 1, option: 1 });
    expect(bb.title.en).toMatch(/bossa/);
    // The bossa figure: a dotted quarter on 1, an 8th on the "and" of 2.
    expect(bb.notes.slice(0, 2).map((n) => [n.beat, n.dur])).toEqual([[0, 1.5], [1.5, 0.5]]);
    expect(bb.keySig).toBe('Eb');
    expect(bb.drums?.groove).toBe('bossa');
  });

  it('B18: at least 12 more standards beyond the first four, each in its own feel', () => {
    const extra = [...lv('b-walk', 13).specs, ...lv('b-walk', 14).specs];
    expect(extra.length).toBeGreaterThanOrEqual(12);
    const feels = new Set(extra.map((sp) => generate({ ...sp, key: 0 } as DrillSpec).title.en.split(', ').pop()));
    expect(feels.size).toBeGreaterThanOrEqual(3);
  });
});

describe('B8: duplicates and leaps', () => {
  it('no two items of a level have identical notes', () => {
    for (const f of BASS)
      for (const l of f.levels) {
        const seen = new Map<string, string>();
        for (const key of levelKeys(l, 'fifths-up'))
          for (const sp of l.specs) {
            const d = generate({ ...sp, key } as DrillSpec);
            const sig = d.notes.map((n) => `${n.beat}:${n.pitch}:${n.string}:${n.fret}:${n.accent ? 1 : 0}:${n.technique ?? ''}`).join(',') + (d.click ?? '');
            expect(seen.get(sig), `${l.id} ${d.itemId} duplicates ${seen.get(sig)}`).toBeUndefined();
            seen.set(sig, d.itemId);
          }
      }
  });

  it('no same-string leap of 7+ frets within half a beat (free-placed lines)', () => {
    for (const f of BASS)
      for (const l of f.levels)
        for (const key of levelKeys(l, 'fifths-up').slice(0, 3))
          for (const sp of l.specs)
            for (const tid of sp.tuning ? [sp.tuning] : ['bass', 'bass5']) {
              const d = generate({ ...sp, key, tuning: tid } as DrillSpec);
              const ns = d.notes.filter((n) => n.chordId === undefined && n.fret! > 0);
              for (let i = 1; i < ns.length; i++) {
                const a = ns[i - 1];
                const b = ns[i];
                if (a.string === b.string && b.beat - a.beat <= 0.5 + 1e-9) expect(Math.abs(b.fret! - a.fret!), `${l.id} ${d.itemId} beat ${b.beat}`).toBeLessThan(7);
              }
            }
  }, 120000);
});

describe('B3 / B10: free choice shows the chart; reading forces notation', () => {
  it('free-choice levels carry the rules and show only the chart', () => {
    for (const [fam, n, kind] of [['b-chord', 8, 'chordTones'], ['b-chord', 9, 'nearest'], ['b-walk', 7, 'walk'], ['b-walk', 11, undefined], ['b-read', 8, 'chordTones']] as const) {
      const d = allDrills(fam, n)[0];
      expect(d.show, `${fam}-${n}`).toBe('chart');
      expect(d.goal.bass?.rules?.chart.length, `${fam}-${n}`).toBeGreaterThan(0);
      if (kind) expect(d.goal.bass!.rules!.kind).toBe(kind);
      for (const c of d.goal.bass!.rules!.chart) {
        expect(c.tones).toContain(c.root);
        expect(c.beats).toBeGreaterThan(0);
      }
    }
    expect(allDrills('b-read', 8)[0].freeFrom).toBe(8);
    expect(allDrills('b-walk', 9)[0].show).toBeUndefined();
    expect(allDrills('b-chord', 1)[0].show).toBe('chart');
    expect(allDrills('b-read', 6)[0].show).toBe('chart');
    expect(allDrills('b-read', 7)[0].show).toBe('chart');
  });

  it('reading levels force notation, and read L1 starts untimed (≤ 2 s per note)', () => {
    for (const n of [1, 2, 3, 4, 5, 9]) for (const d of allDrills('b-read', n)) expect(d.show, d.itemId).toBe('staff');
    const first = allDrills('b-read', 1)[0];
    expect(first.untimed).toEqual({ maxMs: 2000 });
    expect(first.notes.length).toBeGreaterThanOrEqual(8);
  });
});

describe('B5 / B7 / B9: drums, meters, swing', () => {
  it('pocket, styles and time levels play a drum groove; the kick lane is the drum kick, not the written notes', () => {
    const d = generate({ family: 'b-pocket', kind: 'kick', key: 4, hands: 'R', option: 1 });
    expect(d.drums?.groove).toBe('rock-8b');
    expect(d.goal.bass?.kickLane?.slice(0, 3)).toEqual([0, 1.5, 2]);
    const style = generate({ family: 'b-styles', kind: 'style', key: 4, hands: 'R', option: 2 });
    expect(style.drums?.groove).toBe('motown');
    expect(style.goal.bass?.kick).toBe(25);
    expect(style.goal.bass!.kickLane!.length).toBeGreaterThan(8);
    expect(style.goal.bass!.kickLane).not.toEqual(style.notes.map((n) => n.beat));
  });

  it('pocket L8 plays real fills (snare and toms) in the fill bars and a crash on the landing', () => {
    const d = generate({ family: 'b-pocket', kind: 'fills', key: 4, hands: 'R' });
    const hits = drumHits(d.drums!, d.beats, d.meter);
    expect(hits.some((h) => h.d === 'tom-lo' && h.beat > 12 && h.beat < 16)).toBe(true);
    expect(hits.some((h) => h.d === 'crash' && h.beat === 16)).toBe(true);
    expect(d.goal.bass?.pocket).toBeUndefined();
    expect(generate({ family: 'b-pocket', kind: 'pocket', key: 4, hands: 'R' }).goal.bass?.pocket).toEqual([0, 15, -10]);
  });

  it('7/8 counts eighths: pulse 8, start tempo ≤ the level target in eighths', () => {
    const t10 = lv('b-time', 10);
    const sp = t10.specs[2];
    const d = generate({ ...sp, key: 4 } as DrillSpec);
    expect(d.pulse).toBe(8);
    expect(d.meter).toBe(7);
    expect(d.startBpm).toBeLessThanOrEqual(t10.tempo![1] * 2);
    const st = generate({ ...lv('b-styles', 12).specs[1], key: 4 } as DrillSpec);
    expect(st.pulse).toBe(8);
    expect(st.startBpm / 2).toBeLessThanOrEqual(lv('b-styles', 12).tempo![1]);
  });

  it('swung 16ths really swing: ≥ 4 notes a bar on the late "e" / "a", and the swing goal is set', () => {
    for (const d of allDrills('b-pocket', 5)) {
      expect(d.goal.bass?.swing).toEqual({ ratio: 1.5, tol: 0.1, sub: 16 });
      for (let bar = 0; bar < 4; bar++) {
        const swung = d.notes.filter((n) => n.beat >= bar * 4 && n.beat < bar * 4 + 4 && [0.3, 0.8].some((f) => Math.abs(n.beat - Math.floor(n.beat) - f) < 1e-6));
        expect(swung.length, `${d.itemId} bar ${bar + 1}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe('B11: the bass-ear family', () => {
  it('8 levels, after b-chord in the course order; every drill has a band part, hidden answers and answer bars after it', () => {
    const ids = BASS.map((f) => f.id);
    expect(ids.indexOf('b-ear')).toBe(ids.indexOf('b-chord') + 1);
    expect(BASS.find((f) => f.id === 'b-ear')!.levels.length).toBe(8);
    for (let n = 1; n <= 8; n++)
      for (const d of allDrills('b-ear', n, ['bass', 'bass5'])) {
        expect(d.show).toBe('none');
        expect(d.listen!.notes.length).toBeGreaterThan(0);
        expect(d.listen!.ask.he.length).toBeGreaterThan(5);
        // No expected note inside a band window: the player answers after the band.
        for (const nt of d.notes) for (const [a, b] of d.listen!.windows) expect(nt.beat >= a && nt.beat < b, `${d.itemId} ${nt.beat}`).toBe(false);
      }
  });

  it('higher / lower answers are the higher / lower note; the root finder answers are the chord roots', () => {
    const hi = generate({ family: 'b-ear', kind: 'hilo', key: 4, hands: 'R' });
    const pairs = hi.listen!.notes;
    hi.notes.forEach((n, r) => expect(pc(n.pitch)).toBe(pc(Math.max(pairs[2 * r].midi[0], pairs[2 * r + 1].midi[0]))));
    const roots = generate({ family: 'b-ear', kind: 'roots', key: 7, hands: 'R' });
    const p = parseChart(roots.chart!.join(' | ').replace(/♭/g, 'b').replace(/♯/g, '#'));
    roots.notes.forEach((n, i) => expect(pc(n.pitch)).toBe(p.chords[Math.floor(i / 2)].root));
  });
});

describe('B16: the upright track', () => {
  it('six families on the fretless upright tuning, with an intonation goal and a bow / pizz flag', () => {
    const up = BASS.filter((f) => f.id.startsWith('b-up-'));
    expect(up.length).toBe(6);
    expect(tuningById('upright').fretted).toBe(false);
    for (const f of up) {
      expect((f as { upright?: boolean }).upright).toBe(true);
      for (const l of f.levels)
        for (const sp of l.specs) {
          expect(sp.tuning).toBe('upright');
          const d = generate({ ...sp, key: levelKeys(l, 'fifths-up')[0] } as DrillSpec);
          expect(d.goal.bass?.cents, l.id).toBeGreaterThan(0);
          expect(['arco', 'pizz']).toContain(d.bow);
          expect(d.itemId.startsWith(f.id)).toBe(true);
        }
    }
    // ABRSM coverage: 1-, 2-, 3-octave scales, arpeggios, dominant and diminished 7ths, 3rds.
    expect(BASS.find((f) => f.id === 'b-up-scales')!.levels.length).toBeGreaterThanOrEqual(9);
  });
});

describe('B6: placement decisions from measured probes', () => {
  it('task 0 reads the tuning from the lowest string', () => {
    expect(tuningFromLowest(23)).toBe('bass5');
    expect(tuningFromLowest(28)).toBe('bass');
    expect(tuningFromLowest(26)).toBe('bass-dropd');
    expect(tuningFromLowest(undefined)).toBeNull();
    expect(tuningFromLowest(40)).toBeNull();
  });

  it('per-task rules follow the doc', () => {
    expect(placePocket({ lock: 0.95 })).toEqual({ 'b-pocket': 3, 'b-time': 3, 'b-chord': 2 });
    expect(placePocket({ lock: 0.5 })).toEqual({ 'b-pocket': 1, 'b-time': 1, 'b-chord': 1 });
    expect(placePocket({ lock: 0.75 })['b-pocket']).toBe(2);
    expect(placeScale({ best: 0 })).toEqual({ 'b-scale': 1, 'b-fret': 1 });
    expect(placeScale({ best: 125 })['b-scale']).toBe(4);
    expect(placePluck({ best: 110, asymMs: 4 })).toEqual({ 'b-pluck': 6 });
    expect(placePluck({ best: 110, asymMs: 14 })).toEqual({ 'b-pluck': 5 });
    expect(placePluck({ best: 0 })).toEqual({ 'b-pluck': 1 });
    expect(placeWalk({ beat1Ct: 0.95, approach: 0.5, rootShare: 0.3 })['b-walk']).toBe(7);
    expect(placeWalk({ beat1Ct: 0.95, approach: 0, rootShare: 0.4 })['b-walk']).toBe(4);
    expect(placeWalk({ beat1Ct: 0.8, approach: 0, rootShare: 1 })['b-walk']).toBe(2);
    expect(placeWalk({ beat1Ct: 0.2 })['b-walk']).toBe(1);
    expect(placeEar({ acc: 0.95 })).toEqual({ 'b-ear': 5 });
    expect(placeSlap({ verdict: 'not' })).toEqual({});
  });

  it('pluck never seeds note length; unprobed families start at 1; levels are capped', () => {
    const fams = BASS.map((f) => ({ id: f.id, levels: f.levels.length }));
    const { start, tuning } = placeBass({ lowest: { lowest: 23 }, pocket: { lock: 0.95 }, scale: { best: 130 }, pluck: { best: 120, asymMs: 3 }, walk: { beat1Ct: 1, approach: 0.6, rootShare: 0.3 }, ear: { acc: 1 } }, fams);
    expect(tuning).toBe('bass5');
    expect(start['b-pluck']).toBe(6);
    expect(start['b-length']).toBe(1);
    expect(start['b-walk']).toBe(7);
    expect(start['b-chord']).toBe(8);
    expect(start['b-slap']).toBe(1);
    expect(start['b-styles']).toBe(1);
  });

  it('the probe list has tasks 0–6 and every probe maps to a slot and generates', () => {
    const slots = BASS_PROBES.map(probeSlot);
    expect(slots).toEqual(['lowest', 'pocket', 'scale', 'pluck', 'walk', 'ear', 'slap']);
    for (const p of BASS_PROBES) expect(generate(p.spec).notes.length).toBeGreaterThan(3);
    expect(generate(BASS_PROBES[4].spec).show).toBe('chart');
  });
});

describe('B14 / B15: exam tags and the new curriculum content', () => {
  it('levels carry exam tags per the audit mapping', () => {
    expect(lv('b-scale', 1).exam).toEqual([{ board: 'RSL', grade: 'Debut' }]);
    expect(lv('b-ear', 7).exam?.[0].board).toBe('Bagrut');
    expect(lv('b-walk', 15).exam?.[0]).toEqual({ board: 'Bagrut', grade: '2-chorus solo' });
    const tagged = BASS.flatMap((f) => f.levels).filter((l) => (l as GuitarLevelDef).exam?.length);
    expect(new Set(tagged.flatMap((l) => (l as GuitarLevelDef).exam!.map((e) => e.board)))).toEqual(new Set(['RSL', 'Trinity', 'Bagrut', 'ABRSM', 'Berklee']));
  });

  it('the five pentatonic positions are separate items, each a different box', () => {
    const ds = lv('b-scale', 10).specs.map((sp) => generate({ ...sp, key: 9 } as DrillSpec));
    expect(ds.length).toBe(5);
    expect(new Set(ds.map((d) => d.notes[0].fret)).size).toBe(5);
    for (const d of ds) for (const n of d.notes) expect([0, 3, 5, 7, 10]).toContain(pc(n.pitch - 9));
  });

  it('altered and 9th arpeggios have the right tones; the roadmap chart shows its symbols', () => {
    const alt = generate({ family: 'b-chord', kind: 'arpalt', key: 0, hands: 'R', option: 2 });
    expect(new Set(alt.notes.map((n) => pc(n.pitch)))).toEqual(new Set([0, 4, 7, 10, 3]));
    const ninth = generate({ family: 'b-chord', kind: 'arp9', key: 0, hands: 'R', option: 2 });
    expect(new Set(ninth.notes.map((n) => pc(n.pitch)))).toEqual(new Set([0, 4, 7, 10, 2]));
    const ds = generate({ family: 'b-read', kind: 'roadmap', key: 0, hands: 'R', option: 1, perBeat: 1 });
    expect(ds.chart!.join(' ')).toMatch(/D\.S\. al ⊕/);
    const nash = generate({ family: 'b-read', kind: 'nash-switch', key: 0, hands: 'R', perBeat: 1 });
    expect(nash.chart![4]).toMatch(/^F: 1/);
  });

  it('low B: on a 5-string the low-register levels use notes below E1; on a 4-string they stay at E1 and up', () => {
    const five = generate({ family: 'b-walk', kind: 'lowb', key: 2, hands: 'R', perBeat: 1, tuning: 'bass5' });
    expect(Math.min(...five.notes.map((n) => n.pitch))).toBeLessThan(28);
    const four = generate({ family: 'b-walk', kind: 'lowb', key: 2, hands: 'R', perBeat: 1 });
    expect(Math.min(...four.notes.map((n) => n.pitch))).toBeGreaterThanOrEqual(28);
  });
});
