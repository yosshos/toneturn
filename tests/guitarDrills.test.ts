import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { expTimeMs } from '../src/engine/drills/analyze';
import { generateGuitar, guitarCatalog, GUITAR_PROBES, PERMS } from '../src/engine/drills/guitar';
import { analyzeBend, analyzeGuitarTake, analyzeVibrato, detectOnsets, normalizeGuitarTake, UNPITCHED, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { drillEvents } from '../src/engine/drills/events';
import { families, familyById, shownFamilies, todayDrills } from '../src/engine/drills/plan';
import { noteAt, tuningById } from '../src/engine/fretboard';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';

const ALL12 = Array.from({ length: 12 }, (_, i) => i);

/** Every catalogue drill: each level spec through its keys (all 12 for 'major' / 'minor'). */
function allDrills(): { drill: Drill; spec: DrillSpec }[] {
  const out: { drill: Drill; spec: DrillSpec }[] = [];
  for (const f of guitarCatalog().filter((x) => !x.id.startsWith('d-')))
    for (const l of f.levels) {
      const keys = Array.isArray(l.keys) ? l.keys : ALL12;
      for (const k of keys)
        for (const s of l.specs) {
          const spec = { ...s, key: k } as DrillSpec;
          out.push({ drill: generate(spec), spec });
        }
    }
  return out;
}
const DRILLS = allDrills();

/** A perfect take: every expected pitch once at its time. */
function perfect(d: Drill, bpm: number): PlayedNote[] {
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const on = expTimeMs(d, n.beat, bpm);
    // A dead (ghost) note sounds without a pitch, as the microphone reports it (UNPITCHED = -1).
    out.push({ pitch: n.technique === 'dead' ? -1 : n.pitch, on, off: null, vel: 64 });
  }
  return out;
}

describe('guitar drills: catalogue', () => {
  it('has guitar families with ordered levels (≤ 7) and a bass family', () => {
    const cat = guitarCatalog();
    expect(cat.length).toBeGreaterThanOrEqual(12);
    for (const f of cat) {
      expect(/^[gbd]-/.test(f.id)).toBe(true);
      expect(f.levels.length).toBeGreaterThan(0);
      // Bass-course families (b-*, BASS_CURRICULUM §5) run up to 12 levels.
      expect(f.levels.length).toBeLessThanOrEqual(f.id.startsWith('b-') || f.id.startsWith('d-') ? 20 : 7);
      f.levels.forEach((l, i) => expect(l.level).toBe(i + 1));
    }
    expect(cat.find((f) => f.id === 'g-bass')?.instruments).toEqual(['bass']);
    expect(PERMS.length).toBe(24);
    expect(new Set(PERMS.map((p) => p.join(''))).size).toBe(24);
  });

  it('every item × key generates valid, playable notes', () => {
    expect(DRILLS.length).toBeGreaterThan(500);
    const bad: string[] = [];
    const check = (ok: boolean, msg: string) => {
      if (!ok && bad.length < 20) bad.push(msg);
    };
    for (const { drill, spec } of DRILLS) {
      const tu = tuningById(spec.tuning ?? drill.spec.tuning ?? (spec.family === 'g-bass' || spec.family.startsWith('b-') ? 'bass' : 'standard'));
      const id = drill.itemId;
      check(drill.notes.length > 0, `${id}: no notes`);
      // Up-tempo swing (b-swing 6–7, BASS_NICHE_PLAN J1) starts at 220–240.
      check(drill.startBpm >= 40 && drill.startBpm <= (spec.family === 'b-swing' ? 240 : 200), `${id}: start bpm ${drill.startBpm}`);
      check(drill.title.en.length > 0 && drill.title.he.length > 0, `${id}: title`);
      const stretch = !!drill.spec.stretch;
      for (const n of drill.notes) {
        const at = `${id} beat ${n.beat} ${n.string}:${n.fret}`;
        check(Number.isInteger(n.string) && n.string! >= 1 && n.string! <= Math.min(6, tu.open.length), `${at}: string`);
        check(Number.isInteger(n.fret) && n.fret! >= 0 && n.fret! <= 24, `${at}: fret`);
        if (n.technique !== 'harmonic' && n.technique !== 'prebend') check(n.pitch === noteAt(tu, n.string!, n.fret!), `${at}: pitch ${n.pitch}`);
        if (n.finger !== undefined) check(n.finger >= 1 && n.finger <= 4, `${at}: finger ${n.finger}`);
        // Playable: a fretted note sits inside its hand position (5 frets, or 7 for a stretch drill).
        if (n.fret! > 0 && n.technique !== 'tap' && n.technique !== 'harmonic') {
          const d = n.fret! - (n.pos ?? NaN);
          check(d >= -1 && d <= (stretch ? 6 : 4), `${at}: outside position ${n.pos}`);
        }
      }
      // Chords: one note per string, span ≤ 4 frets.
      const byChord = new Map<number, typeof drill.notes>();
      for (const n of drill.notes) if (n.chordId !== undefined) byChord.set(n.chordId, [...(byChord.get(n.chordId) ?? []), n]);
      for (const ns of byChord.values()) {
        check(new Set(ns.map((n) => n.string)).size === ns.length, `${id}: two notes on one string`);
        const fr = ns.filter((n) => n.fret! > 0 && n.technique !== 'harmonic').map((n) => n.fret!);
        if (fr.length) check(Math.max(...fr) - Math.min(...fr) <= 4, `${id}: chord span`);
      }
      for (let i = 1; i < drill.notes.length; i++) check(drill.notes[i].beat >= drill.notes[i - 1].beat, `${id}: unsorted`);
    }
    expect(bad).toEqual([]);
  }, 30000);

  it('item ids are stable and unique per spec', () => {
    const seen = new Map<string, string>();
    for (const { drill, spec } of DRILLS) {
      expect(generateGuitar(spec).itemId).toBe(drill.itemId);
      // Key-free items (natural harmonics) are one item under their stored key.
      const sig = JSON.stringify(Object.entries({ ...spec, key: drill.spec.key }).filter(([, v]) => v !== undefined).sort());
      const prev = seen.get(drill.itemId);
      if (prev !== undefined) expect(prev, drill.itemId).toBe(sig);
      seen.set(drill.itemId, sig);
    }
    // Different keys → different ids, same notes → same pitch shape transposed for movable drills.
    const a = generate({ family: 'g-scales', kind: 'penta', key: 9, hands: 'R', position: 1, minor: true });
    const b = generate({ family: 'g-scales', kind: 'penta', key: 4, hands: 'R', position: 1, minor: true });
    expect(a.itemId).not.toBe(b.itemId);
    expect(a.notes.map((n) => n.pitch - a.notes[0].pitch)).toEqual(b.notes.map((n) => n.pitch - b.notes[0].pitch));
  });

  it('known shapes: A minor pentatonic box 1 at the 5th fret, E-shape F barre, open C', () => {
    const p = generate({ family: 'g-scales', kind: 'penta', key: 9, hands: 'R', position: 1, minor: true });
    expect(p.notes.slice(0, 12).map((n) => `${n.string}:${n.fret}`)).toEqual(['6:5', '6:8', '5:5', '5:7', '4:5', '4:7', '3:5', '3:7', '2:5', '2:8', '1:5', '1:8']);
    const f = generate({ family: 'g-chords', kind: 'barre-check', key: 5, hands: 'R', position: 6 });
    const strum = f.notes.filter((n) => n.beat === 0).sort((a, b) => b.string! - a.string!);
    expect(strum.map((n) => n.fret)).toEqual([1, 3, 3, 2, 1, 1]);
    const c = generate({ family: 'g-chords', kind: 'chord-check', key: 0, hands: 'R', option: 6 });
    expect(c.notes.filter((n) => n.beat === 0).map((n) => n.pitch)).toEqual([48, 52, 55, 60, 64]);
  });

  it('coverage guard: every audited sub-topic keeps its drill kinds (docs/research/DRILLS_COVERAGE_AUDIT.md)', () => {
    const variants = new Map<string, Set<string>>();
    for (const f of guitarCatalog())
      for (const l of f.levels)
        for (const sp of l.specs) {
          const v = variants.get(f.id) ?? new Set<string>();
          v.add(sp.kind);
          v.add(`${sp.kind}#${sp.option ?? ''}`);
          variants.set(f.id, v);
        }
    const need: Record<string, string[]> = {
      'g-fretting': ['spider', 'walk', 'cross', 'stretch'],
      'g-picking': ['single-string', 'cross', '3nps', '3nps-economy', 'skip', 'skip#1', 'tremolo', 'tremolo#1', 'tremolo#2', 'sweep3', 'sweep5', 'hybrid', 'chicken', 'banjo'],
      'g-legato': ['hammer', 'pull', 'trill', 'penta-legato', '3nps-legato', 'tap', 'tap-arp'],
      'g-scales': ['penta', 'blues', 'caged', '3nps', 'one-string', 'mode', 'seq3', 'seq4'],
      'g-arps': ['triad', 'caged-arp', 'inversions', 'seventh', 'iivi-arp'],
      'g-chords': ['chord-check', 'one-minute', 'power', 'barre-check', 'barre-check#0', 'barre-check#2', 'barre-changes', 'triad-inv', 'caged-chords'],
      'g-rhythm': ['quarters', 'eighths', 'waltz', 'old-faithful', 'rock8', 'shuffle', 'boom-chick', 'reggae', 'ska', 'funk16', 'bossa', 'freddie', 'clave', 'gallop', 'chug'],
      'g-lead': ['slides', 'slides#2', 'harmonics', 'harmonics#1', 'harmonics#2', 'bend', 'prebend', 'vibrato', 'double-stops', 'bb-box'],
      'g-fingerstyle': ['thumb', 'pima', 'travis', 'scale-stroke', 'ligado', 'tremolo'],
      'g-flamenco': ['rasgueado', 'rasg-triplet', 'picado', 'picado#1', 'alzapua', 'compas', 'compas#1', 'compas#2'],
      'g-jazz': ['shells', 'comp', 'drop2', 'drop3', 'iivi-drop2', 'guide-tones', 'walking', 'harmonized', 'octaves'],
      'g-reading': ['position'],
      'g-impro': ['targets-root', 'targets-third', 'targets-arp', 'targets-guide', 'targets-guide#1', 'targets-guide#2', 'targets-guide#3'],
      'g-bass': ['spider', 'major', 'penta', 'r58', 'ghost', 'arp', 'octaves', 'slap', 'walking', 'walk-blues'],
    };
    for (const [fam, ks] of Object.entries(need)) for (const k of ks) expect(variants.get(fam)?.has(k), `${fam}/${k}`).toBe(true);
    // Drop-2 runs on all three string sets.
    const drop2 = guitarCatalog()
      .find((f) => f.id === 'g-jazz')!
      .levels.flatMap((l) => l.specs)
      .filter((sp) => sp.kind === 'drop2');
    expect(new Set(drop2.map((sp) => sp.position ?? 0))).toEqual(new Set([0, 1, 2]));
  });

  it('coverage additions: exact shapes', () => {
    const tu = tuningById('standard');
    // Natural harmonics at fret 4 / 9 sound two octaves and a major 3rd above the open string.
    const h = generate({ family: 'g-lead', kind: 'harmonics', key: 9, hands: 'R', option: 1 });
    expect(h.notes[0]).toMatchObject({ string: 6, fret: 4, pitch: 40 + 28 });
    // The waltz strum is in 3/4.
    expect(generate({ family: 'g-rhythm', kind: 'waltz', key: 7, hands: 'R' }).meter).toBe(3);
    // Octave string-skipping: each low note is followed by its octave two strings up.
    const sk = generate({ family: 'g-picking', kind: 'skip', key: 9, hands: 'R', option: 1 });
    expect(sk.notes[1].pitch - sk.notes[0].pitch).toBe(12);
    expect(sk.notes[0].string! - sk.notes[1].string!).toBe(2);
    // Wes octaves: two notes together, an octave apart, on strings two apart.
    const oc = generate({ family: 'g-jazz', kind: 'octaves', key: 0, hands: 'R' });
    const first = oc.notes.filter((n) => n.beat === 0);
    expect(first.map((n) => n.pitch).sort((a, b) => a - b)).toEqual([first[0].pitch, first[0].pitch + 12].sort((a, b) => a - b));
    // Minor blues targets: the 3rd on beat 1 of bar 1 is the minor 3rd.
    const mb = generate({ family: 'g-impro', kind: 'targets-third', key: 9, hands: 'R', option: 1 });
    expect((mb.notes[0].pitch - 9 + 120) % 12).toBe(3);
    // Bass blues walk: chord tones on beats 1-3 of every bar, the 4th beat a half step from the next root.
    const wb = generate({ family: 'g-bass', kind: 'walk-blues', key: 7, hands: 'R' });
    const bt = tuningById('bass');
    for (const n of wb.notes) expect(n.pitch).toBe(noteAt(bt, n.string!, n.fret!));
    for (let bar = 0; bar < 12; bar++) {
      const appr = wb.notes.find((n) => n.beat === bar * 4 + 3)!;
      const next = wb.notes.find((n) => n.beat === bar * 4 + 4)!;
      expect(Math.abs(appr.pitch - next.pitch)).toBe(1);
    }
    // Bulería compás accents count from 12.
    const bu = generate({ family: 'g-flamenco', kind: 'compas', key: 4, hands: 'R', option: 1 });
    const acc = [...new Set(bu.notes.filter((n) => n.accent && n.beat < 12).map((n) => n.beat))];
    expect(acc).toEqual([0, 3, 6, 8, 10]);
    expect(noteAt(tu, 6, 0)).toBe(40);
  });

  it('second review additions (docs/research/DRILLS_SECOND_REVIEW.md): exact shapes', () => {
    const tu = tuningById('standard');
    const bt = tuningById('bass');
    const kinds = new Set(guitarCatalog().flatMap((f) => f.levels.flatMap((l) => l.specs.map((sp) => `${f.id}/${sp.kind}#${sp.option ?? ''}`))));
    for (const k of [
      'g-picking/pedal#',
      'g-scales/mode#5',
      'g-scales/mode#9',
      'g-scales/mode#10',
      'g-scales/mode#11',
      'g-scales/seq-g3#',
      'g-arps/seventh#5',
      'g-arps/seventh#8',
      'g-chords/chord-check#5',
      'g-rhythm/arp-pick#',
      'g-rhythm/funk-stabs#',
      'g-lead/unison#0',
      'g-lead/unison#1',
      'g-fingerstyle/campanella#',
      'g-flamenco/compas#3',
      'g-bass/mode#1',
      'g-bass/groove#0',
      'g-bass/groove#1',
      'g-bass/groove#2',
      'g-bass/slap#1',
    ])
      expect(kinds.has(k), k).toBe(true);
    // Unison bend: the lower string is fretted a whole step below the higher string's note and bent up to it.
    const ub = generate({ family: 'g-lead', kind: 'unison', key: 9, hands: 'R', option: 0 });
    const pair = ub.notes.filter((n) => n.beat === 0);
    const bent = pair.find((n) => n.technique === 'bend')!;
    const held = pair.find((n) => n.technique !== 'bend')!;
    expect(held.pitch - bent.pitch).toBe(2);
    expect(bent.bendCents).toBe(200);
    expect(bent.string! - held.string!).toBe(1);
    // C7♯9 arpeggio: C E G B♭ D♯.
    const a9 = generate({ family: 'g-arps', kind: 'seventh', key: 0, hands: 'R', option: 8, position: 6 });
    expect(a9.notes.slice(0, 5).map((n) => n.pitch % 12)).toEqual([0, 4, 7, 10, 3]);
    // D Dorian carries C major's key signature; the altered scale is C D♭ E♭ F♭ G♭ A♭ B♭.
    expect(generate({ family: 'g-scales', kind: 'mode', key: 2, hands: 'R', option: 1 }).keySig).toBe('C');
    const alt = generate({ family: 'g-scales', kind: 'mode', key: 0, hands: 'R', option: 11 });
    expect([...new Set(alt.notes.map((n) => n.pitch % 12))].sort((a, b) => a - b)).toEqual([0, 1, 3, 4, 6, 8, 10]);
    // Cadd9 = x32030.
    const add9 = generate({ family: 'g-chords', kind: 'chord-check', key: 0, hands: 'R', option: 5, position: 4 });
    expect(add9.notes.filter((n) => n.beat === 0).map((n) => n.pitch)).toEqual([48, 52, 55, 62, 64]);
    // Campanella: most consecutive notes change string.
    const cp = generate({ family: 'g-fingerstyle', kind: 'campanella', key: 7, hands: 'R' });
    const changes = cp.notes.slice(1, 8).filter((n, i) => n.string !== cp.notes[i].string).length;
    expect(changes).toBeGreaterThanOrEqual(5);
    // Pedal point: every other note is the tonic on the 1st string.
    const pp = generate({ family: 'g-picking', kind: 'pedal', key: 9, hands: 'R' });
    for (let i = 1; i < pp.notes.length; i += 2) expect([pp.notes[i].string, pp.notes[i].pitch % 12]).toEqual([1, 9]);
    // Motown bass: the last 8th of each bar is a half step from the next bar's root.
    const mt = generate({ family: 'g-bass', kind: 'groove', key: 7, hands: 'R', option: 1 });
    for (let bar = 0; bar < 4; bar++) {
      const appr = mt.notes.find((n) => n.beat === bar * 4 + 3.5)!;
      const next = mt.notes.find((n) => n.beat === bar * 4 + 4)!;
      expect(Math.abs(appr.pitch - next.pitch) % 12).toBe(1);
      expect(appr.pitch).toBe(noteAt(bt, appr.string!, appr.fret!));
    }
    expect(noteAt(tu, 1, 0)).toBe(64);
  });

  it('the level-test probes generate', () => {
    for (const p of GUITAR_PROBES) expect(generate(p.spec).notes.length).toBeGreaterThan(0);
  });
});

describe('guitar drills: analysis', () => {
  it('a perfect synthetic take is clean (every item in every key)', () => {
    for (const { drill: d } of DRILLS) {
      // Pocket on purpose (A6) asks to sit behind / ahead of the grid: an on-grid take is rightly not clean (tested in bassMeasure).
      if (d.goal.bass?.pocket?.some((x) => x !== 0)) continue;
      // Placement on purpose against the ride (b-swing 2–3): a take on the grid is not what the level asks.
      const ride = d.goal.bass?.swingWalk?.ride;
      if (ride && (ride[0] > 0 || ride[1] < 0)) continue;
      const m = analyzeGuitarTake(d, d.startBpm, perfect(d, d.startBpm));
      expect(m.verdict, `${d.itemId}: ${m.why.en}`).toBe('clean');
      // A ghosted triplet skip right before a beat can pair with the beat's onset (one note in a walking chorus).
      if (d.notes.some((n) => n.technique === 'dead') || d.goal.bass?.rules) expect(m.accuracy, d.itemId).toBeGreaterThanOrEqual(0.95); // rule-judged: the model line is one valid answer among many
      else expect(m.accuracy, d.itemId).toBe(1);
      if (d.goal.chordTonesOnBeats && !d.goal.bass?.rules) expect(m.chordToneOnBeats, d.itemId).toBe(1); // rule-judged lines (A5) supersede it
    }
  }, 60000);

  it('a strum heard as separate string onsets (and noise without pitch) counts as one clean chord', () => {
    const d = generate({ family: 'g-chords', kind: 'one-minute', key: 0, hands: 'R', option: 0, perBeat: 0.25 });
    const bpm = 60;
    const played: PlayedNote[] = [];
    const chords = new Map<number, number[]>();
    for (const n of d.notes) chords.set(n.beat, [...(chords.get(n.beat) ?? []), n.pitch]);
    for (const [beat, ps] of chords) {
      const t0 = expTimeMs(d, beat, bpm) + 5;
      played.push({ pitch: ps[ps.length - 1], on: t0, off: null, vel: 64 }, { pitch: UNPITCHED, on: t0 + 25, off: null, vel: 64 }, { pitch: ps[0] + 12, on: t0 + 50, off: null, vel: 64 });
    }
    const norm = normalizeGuitarTake(d, bpm, played);
    expect(norm.strums.length).toBe(chords.size);
    expect(norm.strums[0].spread).toBe(50);
    const m = analyzeGuitarTake(d, bpm, played);
    expect(m.verdict).toBe('clean');
    expect(m.guitar.strumSpread).toBe(50);
    expect(m.guitar.changesPerMin).toBeGreaterThan(0);
  });

  it('octave errors fold to the expected note; wrong notes still count', () => {
    const d = generate({ family: 'g-scales', kind: 'penta', key: 9, hands: 'R', position: 1, minor: true });
    const bpm = d.startBpm;
    const played = perfect(d, bpm).map((p, i) => (i === 0 ? { ...p, pitch: p.pitch + 12 } : p));
    expect(analyzeGuitarTake(d, bpm, played).verdict).toBe('clean');
    const wrong = perfect(d, bpm).map((p, i) => (i === 3 ? { ...p, pitch: p.pitch + 1 } : p));
    expect(analyzeGuitarTake(d, bpm, wrong).verdict).not.toBe('clean');
  });

  it('bend intonation from a pitch trace', () => {
    const base = 62; // D4 bent a whole step to E4
    const mk = (heldCents: number): GFrame[] =>
      Array.from({ length: 100 }, (_, i) => {
        const t = i * 10;
        const c = t < 150 ? (heldCents * t) / 150 : heldCents;
        return { t, hz: 440 * 2 ** ((base - 69 + c / 100) / 12), conf: 0.95, rms: 0.2 };
      });
    const good = analyzeBend(mk(195), base, 200, 0, 990);
    expect(good.verdict).toBe('clean');
    expect(Math.round(good.error)).toBe(-5);
    expect(good.riseMs).toBeLessThanOrEqual(150);
    expect(analyzeBend(mk(228), base, 200, 0, 990).verdict).toBe('almost');
    const flat = analyzeBend(mk(130), base, 200, 0, 990);
    expect(flat.verdict).toBe('not');
    expect(flat.held).toBeNull();
  });

  it('vibrato rate and width from a pitch trace', () => {
    const base = 64;
    const frames: GFrame[] = Array.from({ length: 200 }, (_, i) => {
      const t = i * 10;
      const c = 25 + 25 * Math.sin((2 * Math.PI * 5.5 * t) / 1000);
      return { t, hz: 440 * 2 ** ((base - 69 + c / 100) / 12), conf: 0.95, rms: 0.2 };
    });
    const v = analyzeVibrato(frames, base, 0, 1990);
    expect(v.rateHz).toBeGreaterThan(5);
    expect(v.rateHz).toBeLessThan(6);
    expect(v.widthCents).toBeGreaterThan(40);
    expect(v.widthCents).toBeLessThan(55);
    expect(v.verdict).toBe('clean');
    expect(analyzeVibrato(frames, base, 0, 1990, true).verdict).toBe('almost');
  });

  it('a bend drill with a flat bend is not clean', () => {
    const d = generate({ family: 'g-lead', kind: 'bend', key: 9, hands: 'R', option: 2 });
    const bpm = 70;
    const played = perfect(d, bpm);
    const frames: GFrame[] = [];
    for (let t = 0; t < (d.beats + 1) * (60000 / bpm); t += 10) {
      const n = [...d.notes].reverse().find((x) => expTimeMs(d, x.beat, bpm) <= t) ?? d.notes[0];
      const c = n.technique === 'bend' ? 120 : 0; // under-bent
      frames.push({ t, hz: 440 * 2 ** ((n.pitch - 69 + c / 100) / 12), conf: 0.95, rms: 0.2 });
    }
    const m = analyzeGuitarTake(d, bpm, played, undefined, frames);
    expect(m.guitar.bends.length).toBeGreaterThan(0);
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/Bend/);
  });

  it('detectOnsets finds picked attacks, a legato note and an unpitched chuck', () => {
    const frames: GFrame[] = [];
    const seg = (from: number, to: number, midi: number | null, rms: (t: number) => number) => {
      for (let t = from; t < to; t += 10) frames.push({ t, hz: midi === null ? null : 440 * 2 ** ((midi - 69) / 12), conf: midi === null ? 0 : 0.95, rms: rms(t - from) });
    };
    seg(0, 200, null, () => 0.001);
    seg(200, 500, 64, (t) => 0.3 * Math.exp(-t / 400)); // picked E4
    seg(500, 800, 66, (t) => 0.2 * Math.exp(-t / 400)); // hammered F♯4: no new attack
    seg(800, 900, null, () => 0.001);
    seg(900, 1000, null, (t) => (t < 30 ? 0.25 : 0.01)); // muted chuck
    const on = detectOnsets(frames);
    expect(on.map((n) => n.pitch)).toEqual([64, 66, UNPITCHED]);
    expect(on[0].on).toBe(200);
    expect(on[1].on).toBe(500);
    expect(on[2].on).toBe(900);
  });

  it('guitar takes rate the guitar-tech sub-skill', () => {
    const d = generate({ family: 'g-fretting', kind: 'spider', key: 9, hands: 'R', option: 0 });
    const m = analyzeGuitarTake(d, d.startBpm, perfect(d, d.startBpm));
    const ev = drillEvents(d, m, '2026-11-07T10:00:00Z', 's1', 0)[0];
    expect(ev.tags?.[0].sub).toBe('instrument/guitar-tech');
    const p = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R' });
    expect(drillEvents(p, analyzeGuitarTake(p, 80, perfect(p, 80)), '2026-11-07T10:00:00Z', 's1', 0)[0].tags?.[0].sub).toBe('instrument/piano-tech');
  });
});

describe('guitar drills: plan', () => {
  it('piano stays the default; guitar and bass catalogues are separate', () => {
    expect(families().every((f) => !f.id.startsWith('g-'))).toBe(true);
    expect(shownFamilies({ emphasis: 'both' }).every((f) => !f.id.startsWith('g-'))).toBe(true);
    const g = shownFamilies({ emphasis: 'both', instrument: 'guitar' });
    expect(g.length).toBeGreaterThan(10);
    expect(g.every((f) => f.id.startsWith('g-') && f.id !== 'g-bass')).toBe(true);
    // Bass: the 14 course families; the old g-bass starter is retired (kept for old ids, not shown).
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass' }).map((f) => f.id)).toEqual(['b-pluck', 'b-time', 'b-fret', 'b-chord', 'b-ear', 'b-scale', 'b-length', 'b-pocket', 'b-read', 'b-posread', 'b-styles', 'b-ghost', 'b-walk', 'b-impro', 'b-swing', 'b-barry', 'b-jform', 'b-latin', 'b-legato', 'b-pick', 'b-odd', 'b-prog', 'b-poly', 'b-slap', 'b-up-pos', 'b-up-arco', 'b-up-scales', 'b-up-pizz', 'b-up-walk', 'b-up-read']);
    expect(familyById('g-legato')?.levels.length).toBeGreaterThan(0);
  });

  it('the guitar style filters families and levels', () => {
    const fl = shownFamilies({ emphasis: 'both', instrument: 'guitar', guitarStyle: 'flamenco' }).map((f) => f.id);
    expect(fl).toContain('g-flamenco');
    expect(fl).toContain('g-scales');
    expect(fl).not.toContain('g-jazz');
    const metal = shownFamilies({ emphasis: 'both', instrument: 'guitar', guitarStyle: 'metal' });
    const rhythm = metal.find((f) => f.id === 'g-rhythm')!;
    expect(rhythm.levels.map((l) => l.level)).toEqual([7]);
  });

  it("today's items for a new guitar player come from the starter families", () => {
    const items = todayDrills({ ...DEFAULT_DRILL_SETTINGS, instrument: 'guitar' }, {}, {}, [], 5, '2026-11-07T10:00:00Z');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => ['g-fretting', 'g-chords', 'g-scales'].includes(i.drill.spec.family))).toBe(true);
  });
});
