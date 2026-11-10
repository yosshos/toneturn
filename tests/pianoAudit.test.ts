// PIANO_AUDIT (2026-11-10): scale / arpeggio fingerings in every key, cadence voice leading, exam-grade tempos, Hebrew
// titles, and the take analysis with realistic human takes (jitter, velocity noise) at every level's target tempo.
import { describe, expect, it } from 'vitest';
import { catalog, EXAM_NPS, generate, parallelsBetween, type LevelDef } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs, micUnmeasurable, notesPerBeat, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { levelDrills, targetBpmOf } from '../src/engine/drills/plan';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const CAT = catalog();
const isBlack = (p: number) => [1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12);
const lvl = (id: string): LevelDef => CAT.flatMap((f) => f.levels).find((l) => l.id === id)!;

describe('C1 scale fingerings', () => {
  it('every major and minor scale (harmonic, melodic, natural) is fingered in all 12 keys, both hands, and the thumb never lands on a black key', () => {
    const bad: string[] = [];
    for (const scale of ['major', 'harmonic', 'melodic', 'natural'] as const)
      for (let key = 0; key < 12; key++)
        for (const hands of ['R', 'L', 'RL'] as const)
          for (const motion of ['parallel', 'contrary'] as const) {
            const d = generate({ family: 'scales', kind: 'scale', hands, key, octaves: 2, scale, minor: scale !== 'major', motion });
            for (const n of d.notes) {
              if (!n.finger) bad.push(`${d.itemId}: no finger at ${n.pitch}`);
              else if (n.finger === 1 && isBlack(n.pitch)) bad.push(`${d.itemId}: thumb on black ${n.pitch}`);
            }
          }
    expect(bad).toEqual([]);
  });
  it('F♯ and C♯ melodic minor: RH 2 3 1 2 3 4 1 up, the top note 3, and the natural-minor row (3 2 1 3 2 1 4 3) down', () => {
    for (const key of [6, 1]) {
      const d = generate({ family: 'scales', kind: 'scale', hands: 'R', key, octaves: 1, scale: 'melodic', minor: true });
      expect(d.notes.map((n) => n.finger)).toEqual([2, 3, 1, 2, 3, 4, 1, 3, 2, 1, 3, 2, 1, 4, 3]);
    }
  });
  it('the white-key minors keep 1 2 3 1 2 3 4 5 / 5 4 3 2 1 3 2 1 and B♭ minor LH keeps 2 1 3 2 1 4 3 2', () => {
    expect(generate({ family: 'scales', kind: 'scale', hands: 'R', key: 9, octaves: 1, scale: 'melodic', minor: true }).notes.slice(0, 8).map((n) => n.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    expect(generate({ family: 'scales', kind: 'scale', hands: 'L', key: 10, octaves: 1, scale: 'natural', minor: true }).notes.slice(0, 8).map((n) => n.finger)).toEqual([2, 1, 3, 2, 1, 4, 3, 2]);
  });
});

describe('C2 cadence voice leading', () => {
  it('no parallel 5ths or octaves (bass included) and no voice moving more than a 4th, in every cadence, key, mode and top position', () => {
    const bad: string[] = [];
    const kinds = ['cadence-1', 'cadence-64', 'cadence-ii6', 'cadence-circle', 'cadence-vofv', 'cadence-n6', 'cadence-aug6', 'cadence-plagal', 'cadence-deceptive', 'cadence-picardy'];
    for (const kind of kinds)
      for (const minor of [false, true])
        for (let key = 0; key < 12; key++)
          for (const option of [0, 1, 2]) {
            const d = generate({ family: 'cadences', kind, hands: 'RL', key, minor, option });
            const ids = [...new Set(d.notes.map((n) => n.chordId))];
            const ch = ids.map((id) => d.notes.filter((n) => n.chordId === id));
            const son = (c: typeof ch[number]) => [c.find((n) => n.hand === 'L')!.pitch, ...c.filter((n) => n.hand === 'R').map((n) => n.pitch).sort((a, b) => a - b)];
            for (let i = 1; i < ch.length; i++) {
              const a = son(ch[i - 1]);
              const b = son(ch[i]);
              if (parallelsBetween(a, b)) bad.push(`${d.itemId} step ${i}: ${a} → ${b}`);
              if (Math.max(...a.slice(1).map((p, j) => Math.abs(p - b[j + 1]))) > 5) bad.push(`${d.itemId} step ${i} jumps: ${a} → ${b}`);
              expect(Math.min(...b.slice(1))).toBeGreaterThan(b[0]);
            }
          }
    expect(bad).toEqual([]);
  });
  it('I–IV–V–I in C: IV → V moves against the bass (C F A → B D G over F → G)', () => {
    const d = generate({ family: 'cadences', kind: 'cadence-1', hands: 'RL', key: 0, option: 0 });
    const rh = (beat: number) => d.notes.filter((n) => n.beat === beat && n.hand === 'R').map((n) => n.pitch % 12).sort((a, b) => a - b);
    expect(rh(4)).toEqual([7, 11, 2].sort((a, b) => a - b));
    const v = d.notes.filter((n) => n.beat === 4 && n.hand === 'R').map((n) => n.pitch);
    const iv = d.notes.filter((n) => n.beat === 2 && n.hand === 'R').map((n) => n.pitch);
    expect(Math.max(...v)).toBeLessThanOrEqual(Math.max(...iv));
  });
});

describe('T1 exam-grade tempos', () => {
  it('the top scale level reaches ABRSM Grade 8 (5.87 notes/s) and the top arpeggio level Grade 8 (4.4)', () => {
    const top = (id: string) => Math.max(...levelDrills(lvl(id), 'fifths-up').map((d) => npsOf(d, targetBpmOf(lvl(id), d))));
    expect(top('scales-10')).toBeGreaterThanOrEqual(EXAM_NPS.scales[7] - 0.05);
    expect(top('arpeggios-6')).toBeGreaterThanOrEqual(EXAM_NPS.arpeggios[7] - 0.05);
  });
  it('a level with an exam speed starts every item at its start speed (whatever the note value) and targets the second', () => {
    for (const lv of CAT.flatMap((f) => f.levels).filter((l) => l.nps))
      for (const d of levelDrills(lv, 'fifths-up')) {
        const t = targetBpmOf(lv, d);
        expect(t).toBeGreaterThan(d.startBpm);
        expect(Math.abs(npsOf(d, t) - lv.nps![1])).toBeLessThan(0.1);
      }
  });
  it('levels without an exam speed keep the old rule (start × 1.25)', () => {
    const d = levelDrills(lvl('scales-1'), 'fifths-up')[0];
    expect(targetBpmOf(lvl('scales-1'), d)).toBe(Math.round(d.startBpm * 1.25));
  });
});

describe('C3 the hands never share a key', () => {
  it('no item has both hands on one key at once, except the unison where contrary motion starts and turns', () => {
    const bad: string[] = [];
    for (const f of CAT)
      for (const lv of f.levels)
        for (const d of levelDrills(lv, 'fifths-up').slice(0, 24)) {
          const R = new Set(d.notes.filter((n) => n.hand === 'R').map((n) => `${n.pitch}@${n.beat}`));
          const shared = d.notes.filter((n) => n.hand === 'L' && R.has(`${n.pitch}@${n.beat}`));
          const contrary = d.spec.motion === 'contrary' || d.spec.motion === 'formula';
          if (shared.length && !contrary) bad.push(`${lv.id} ${d.itemId}: ${shared.length} shared, e.g. ${shared[0].pitch}@${shared[0].beat}`);
        }
    expect(bad).toEqual([]);
  });
});

describe('titles', () => {
  it('Hebrew level titles carry no English words (chord symbols, Roman numerals and tune names aside)', () => {
    const ok = new Set(['maj', 'So', 'What', 'Ger']);
    const roman = /^(i{1,3}|iv|vi{0,2}|I{1,3}|IV|VI{0,2})$/;
    const bad = CAT.flatMap((f) => f.levels).flatMap((l) => (l.title.he.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !ok.has(w) && !roman.test(w)).map((w) => `${l.id}: ${w}`));
    expect(bad).toEqual([]);
  });
  it('no emoji in piano titles', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const l of CAT.flatMap((f) => f.levels)) expect(emoji.test(l.title.he) || emoji.test(l.title.en)).toBe(false);
  });
});

// ───────────────────────────── human takes ─────────────────────────────

/** Seeded normal noise. */
function noise(seed: number): () => number {
  let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0; // spread nearby seeds (an LCG from 5, 6, 7 starts almost alike)
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
const BAND: Record<string, number> = { pp: 32, p: 49, mf: 80, f: 98, ff: 113 };

/**
 * A human take on MIDI: every key pressed once (a unison shared by the hands is one press), timing jitter `sd` ms per
 * onset (chord notes 4 ms apart at most), the RH 6 ms ahead of the LH, velocities in the goal's band with a little
 * spread, releases as the articulation asks.
 */
export function humanTake(d: Drill, bpm: number, sd: number, seed = 7): PlayedNote[] {
  const g = noise(seed);
  const beatMs = 60000 / bpm;
  const dyn = d.goal.dynamics;
  const base = dyn?.startsWith('even-') ? BAND[dyn.slice(5)] : 72;
  const seen = new Set<string>();
  const onAt = new Map<string, number>();
  const out: PlayedNote[] = [];
  const top = Math.max(...d.notes.map((n) => n.pitch));
  const ordered = d.notes.slice().sort((a, b) => a.beat - b.beat);
  ordered.forEach((n) => {
    const k = `${n.pitch}:${n.beat}`;
    if (seen.has(k)) return;
    seen.add(k);
    const slot = `${n.hand}:${n.beat}`;
    if (!onAt.has(slot)) onAt.set(slot, expTimeMs(d, n.beat, bpm) + g() * sd + (n.hand === 'L' ? 6 : 0));
    const on = onAt.get(slot)! + (n.chordId !== undefined ? g() * 1.5 : 0);
    let vel = base + g() * 3;
    if (n.accent) vel += dyn === 'voicing' ? 20 : 26;
    if (dyn === 'cresc') vel = 45 + 55 * ((n.pitch - (top - 24)) / 24) + g() * 2;
    const next = ordered.find((o) => o.hand === n.hand && o.beat > n.beat + 1e-6);
    const gap = next ? (next.beat - n.beat) * beatMs : n.dur * beatMs;
    const art = d.goal.articulation;
    const off = art === 'legato' ? on + gap + 15 : art === 'staccato' ? on + 0.3 * gap : art === 'portato' ? on + 0.7 * gap : on + 0.9 * n.dur * beatMs;
    out.push({ pitch: n.pitch, on, off, vel: Math.max(1, Math.min(127, Math.round(vel))) });
  });
  return out.sort((a, b) => a.on - b.on);
}

/**
 * A steady pianist: onset jitter ≈ 1.8 % of the note gap (IOI CV ≈ 2.5 %, "very even" in the research table), at least
 * 5 ms (fast passages: ≈ 7 ms of IOI spread, near the just-noticeable shift) and at most 9 ms.
 */
const steadySd = (d: Drill, bpm: number) => Math.max(5, Math.min(9, 0.018 * (1000 / npsOf(d, bpm))));

const ALL = (): { lv: LevelDef; d: Drill }[] => CAT.flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').slice(0, Math.max(lv.specs.length, 2) * 2).map((d) => ({ lv, d }))));

describe('A3 piano analysis with human takes', () => {
  it('a steady human take is clean at every level target tempo (MIDI)', () => {
    const bad: string[] = [];
    for (const { lv, d } of ALL()) {
      const bpm = targetBpmOf(lv, d);
      for (const seed of [1, 2]) {
        const m = analyzeTake(d, bpm, humanTake(d, bpm, steadySd(d, bpm), seed));
        if (m.verdict !== 'clean') bad.push(`${lv.id} ${d.itemId}@${bpm} s${seed}: ${m.why.en}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('a sloppy take (jitter = 2 × the band SD limit) is never clean; a drill of 3–5 chords (a timing SD from 3 onsets) at most once in 4 tries', () => {
    const bad: string[] = [];
    for (const { lv, d } of ALL()) {
      const bpm = targetBpmOf(lv, d);
      const sd = 2 * thresholds(tempoBand(npsOf(d, bpm))).sd;
      const onsets = new Set(d.notes.map((n) => n.beat)).size;
      const seeds = onsets < 6 ? [5, 6, 7, 8] : [5];
      const clean = seeds.filter((seed) => analyzeTake(d, bpm, humanTake(d, bpm, sd, seed)).verdict === 'clean').length;
      if (clean > (onsets < 6 ? 1 : 0)) bad.push(`${lv.id} ${d.itemId}@${bpm} ×${clean}`);
    }
    expect(bad).toEqual([]);
  });
  it('A1: a fast scale (Grade 8, 5.87 notes/s) with 6 ms of jitter passes; before, the 3 % CV asked for ~5 ms of IOI spread', () => {
    const d = generate({ family: 'scales', kind: 'scale', hands: 'RL', key: 0, octaves: 4, perBeat: 4 });
    const bpm = 88;
    expect(1000 / (bpm / 60) / notesPerBeat(d)).toBeCloseTo(170.5, 0);
    expect(analyzeTake(d, bpm, humanTake(d, bpm, 6, 3)).verdict).toBe('clean');
    // An uneven one (IOI spread ≈ 28 ms) still fails on evenness.
    const m = analyzeTake(d, bpm, humanTake(d, bpm, 20, 3));
    expect(m.verdict).not.toBe('clean');
  });
});

describe('A2 piano by microphone', () => {
  const mic = (ps: PlayedNote[]) => ps.map((p) => ({ ...p, vel: 64, off: null }));
  it('a loudness, articulation or pedal goal never passes by microphone, and says it needs MIDI', () => {
    for (const id of ['control-1', 'control-2', 'control-3', 'control-4', 'control-5', 'control-6', 'control-8', 'control-10']) {
      for (const d of levelDrills(lvl(id), 'fifths-up').slice(0, 3)) {
        expect(micUnmeasurable(d).length).toBeGreaterThan(0);
        const bpm = d.startBpm;
        const m = analyzeTake(d, bpm, mic(humanTake(d, bpm, 5, 1)), undefined, { mic: true });
        expect(m.verdict).toBe('not');
        expect(m.unmeasured?.length).toBeGreaterThan(0);
        expect(m.why.he).toContain('MIDI');
      }
    }
  });
  it('a plain scale by microphone (25 ms frame clock) is clean; before, "even p" at velocity 64 passed by mic', () => {
    const d = generate({ family: 'scales', kind: 'scale', hands: 'R', key: 0, octaves: 2 });
    const quant = (ps: PlayedNote[]) => ps.map((p) => ({ ...p, on: Math.round(p.on / 25) * 25 }));
    expect(analyzeTake(d, 83, mic(quant(humanTake(d, 83, 6, 2))), undefined, { mic: true }).verdict).toBe('clean');
    const p = generate({ family: 'control', kind: 'scale', hands: 'R', key: 0, octaves: 2, dynamics: 'even-p' });
    expect(analyzeTake(p, 60, mic(humanTake(p, 60, 5, 2))).verdict).toBe('clean'); // without the flag (the old path) it "passed"
    expect(analyzeTake(p, 60, mic(humanTake(p, 60, 5, 2)), undefined, { mic: true }).verdict).toBe('not');
  });
});
