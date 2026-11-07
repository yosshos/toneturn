import { describe, expect, it } from 'vitest';
import {
  PRESETS,
  customFromDrill,
  customIncluded,
  customKeys,
  customProblems,
  customToDrill,
  drillToEvents,
  parseRow,
  patternFromPlayed,
  presetDrill,
  quantizePlayed,
  readShareCode,
  rowToText,
  shareCode,
  shiftsOf,
  splitRich,
  undoLast,
  validateCustom,
  withScale,
} from '../src/engine/drills/custom';
import { SCALE_INTERVALS, keyName, mod, rhBase, catalog } from '../src/engine/drills/generate';
import { specDrills } from '../src/engine/drills/plan';
import type { CustomDrill, Drill, ExpNote, Hand, ScaleType } from '../src/engine/drills/types';

const base = (p: Partial<CustomDrill> & { text?: string; lhText?: string } = {}): CustomDrill => {
  const { text = '1 2 3 4', lhText, ...rest } = p;
  const s = splitRich(parseRow(text, 'R').notes);
  const c: CustomDrill = { id: 't1', name: 'Test', scale: 'major', sequenceSteps: 0, hands: 'R', createdAt: '2026-11-07', v: 2, pattern: s.pattern, ...(s.marks ? { marks: s.marks } : {}), ...rest };
  if (lhText !== undefined) {
    const l = splitRich(parseRow(lhText, 'L').notes);
    c.lh = l.pattern;
    if (l.marks) c.lhMarks = l.marks;
  }
  return c;
};
const pitches = (d: Drill, h?: Hand) => d.notes.filter((n) => !h || n.hand === h).map((n) => n.pitch);

/** Guitar / bass: frets 0–24; inside each hand position the fretted notes span ≤ 5 frets (6 with stretch). */
function playable(d: Drill, stretch = false) {
  for (const n of d.notes) {
    expect(n.string).toBeDefined();
    expect(n.fret!).toBeGreaterThanOrEqual(0);
    expect(n.fret!).toBeLessThanOrEqual(24);
  }
  let run: number[] = [];
  let pos = -1;
  const check = () => run.length && expect(Math.max(...run) - Math.min(...run)).toBeLessThanOrEqual(stretch ? 6 : 5);
  for (const n of d.notes) {
    if (!n.fret) continue;
    if (n.pos !== pos) {
      check();
      run = [];
      pos = n.pos!;
    }
    run.push(n.fret);
  }
  check();
}

// The v1 generator, verbatim (before the creator 2), for the back-compat check.
function legacyToDrill(c: CustomDrill, key: number): Drill {
  const k = mod(key, 12);
  const tonicR = rhBase(k);
  const shifts: number[] = [];
  for (let s = 0; s <= c.sequenceSteps; s++) shifts.push(s);
  for (let s = c.sequenceSteps - 1; s >= 0; s--) shifts.push(s);
  const mixed = new Set(c.pattern.map((p) => p.hand)).size > 1;
  const ints = SCALE_INTERVALS[c.scale];
  const dp = (tonic: number, deg: number, alt: number) => tonic + 12 * Math.floor((deg - 1) / ints.length) + ints[mod(deg - 1, ints.length)] + alt;
  const notes: ExpNote[] = [];
  let beat = 0;
  let cid = 0;
  for (const sh of shifts) {
    let group: { p: CustomDrill['pattern'][number]; beat: number }[] = [];
    const flush = (dur: number) => {
      const sns: { pitch: number; hand: Hand }[] = [];
      for (const g of group) {
        const hands: Hand[] = mixed ? [g.p.hand] : c.hands === 'RL' ? ['R', 'L'] : [c.hands];
        for (const h of hands) sns.push({ pitch: dp(h === 'R' && (mixed || c.hands !== 'L') ? tonicR : tonicR - 12, g.p.deg + sh, g.p.alt ?? 0), hand: h });
      }
      const id = sns.length > 1 ? ++cid : undefined;
      for (const x of sns) notes.push({ pitch: x.pitch, beat: Math.round(group[0].beat * 1e6) / 1e6, dur, hand: x.hand, ...(id !== undefined ? { chordId: id } : {}) });
      group = [];
    };
    for (const p of c.pattern) {
      group.push({ p, beat });
      if (p.dur > 0) {
        flush(p.dur);
        beat += p.dur;
      }
    }
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const minDur = Math.min(...c.pattern.filter((p) => p.dur > 0).map((p) => p.dur));
  const handsT = { R: { en: 'RH', he: 'יד ימין' }, L: { en: 'LH', he: 'יד שמאל' }, RL: { en: 'HT', he: 'ידיים יחד' } }[c.hands];
  const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return {
    spec: { family: 'custom', kind: `custom:${c.id}`, key: k, scale: c.scale, hands: c.hands },
    itemId: `custom:${c.id}:${k}:${c.hands}`,
    title: { en: `${c.name} · ${keyName(k)} · ${handsT.en}`, he: `${c.name} · ${keyName(k)} · ${handsT.he}` },
    notes,
    beats: Math.max(...notes.map((n) => n.beat + n.dur)),
    meter: 4,
    keySig: ['natural', 'harmonic', 'melodic'].includes(c.scale) ? SIG[mod(k + 3, 12)] : c.scale === 'chromatic' ? 'C' : SIG[k],
    goal: { evenness: true, hands: c.hands === 'RL' || mixed },
    startBpm: Math.max(40, Math.min(200, Math.round(120 * minDur))),
  };
}

describe('drill creator: degree text', () => {
  it('parses rhythm suffixes (sticky), triplets, dotted, explicit beats', () => {
    const { notes, bad } = parseRow('1/8 2 3/4 4/16 5/8t 6/4. 7:1.25');
    expect(bad).toEqual([]);
    expect(notes.map((n) => n.dur)).toEqual([0.5, 0.5, 1, 0.25, 1 / 3, 1.5, 1.25]);
    expect(notes.map((n) => n.deg)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('parses alterations, negatives, rests, chords, accents, staccato and guitar marks', () => {
    const { notes, bad } = parseRow("b3 #4 -2 r/4 [1 3 5]/2 >5' 3h 2p 4b 5~ 6pm 7s");
    expect(bad).toEqual([]);
    expect(notes[0]).toMatchObject({ deg: 3, alt: -1, dur: 0.5 });
    expect(notes[1]).toMatchObject({ deg: 4, alt: 1 });
    expect(notes[2]).toMatchObject({ deg: -2 });
    expect(notes[3]).toMatchObject({ rest: true, dur: 1 });
    expect(notes.slice(4, 7).map((n) => [n.deg, n.dur])).toEqual([
      [1, 0],
      [3, 0],
      [5, 2],
    ]);
    expect(notes[7]).toMatchObject({ deg: 5, acc: true, stac: true, dur: 2 });
    expect(notes.slice(8).map((n) => n.tech)).toEqual(['hammer', 'pull', 'bend', 'vibrato', 'mute', 'slide']);
    expect(notes[10].bend).toBe(200);
    expect(parseRow('1 x7 2/9').bad).toEqual(['x7', '2/9']);
  });
  it('round-trips text and notes, and undoes whole events', () => {
    const text = "1/16 >3 5' r/8 [1 3 5]/4 b7/8t 2h 1p";
    const a = parseRow(text).notes;
    expect(parseRow(rowToText(a)).notes).toEqual(a);
    const u = undoLast(parseRow('1 2 [3 5 8]').notes);
    expect(u.map((n) => n.deg)).toEqual([1, 2]);
    expect(undoLast(parseRow('1 r').notes).length).toBe(1);
  });
  it('rests and chords generate the right beats; accents and staccato reach the drill', () => {
    const d = customToDrill(base({ text: "1/4 r [3 5] >8'" }), 0);
    expect(d.notes.map((n) => [n.pitch, n.beat])).toEqual([
      [60, 0],
      [64, 2],
      [67, 2],
      [72, 3],
    ]);
    expect(d.notes[1].chordId).toBe(d.notes[2].chordId);
    expect(d.notes[3].accent).toBe(true);
    const st = customToDrill(base({ text: "1' 2' 3'" }), 0);
    expect(st.goal.articulation).toBe('staccato');
  });
});

describe('drill creator: quantisation', () => {
  it('quantises to 8ths, 16ths and triplets, with chords', () => {
    const beat = 600; // quarter = 100 bpm
    const played = [
      { pitch: 60, on: 0, off: 280 },
      { pitch: 62, on: 300, off: 580 },
      { pitch: 64, on: 610, off: 740 },
      { pitch: 65, on: 755, off: 1180 },
      { pitch: 67, on: 1200, off: 1390 }, // triplet 8ths from beat 2
      { pitch: 69, on: 1405, off: 1590 },
      { pitch: 71, on: 1600, off: 1790 },
      { pitch: 60, on: 1800, off: 2110 }, // a chord (two notes 15 ms apart)
      { pitch: 64, on: 1815, off: 2110 },
    ].map((n) => ({ ...n, on: n.on + (n.on ? 9 : 0) }));
    const row = quantizePlayed(played, { key: 0, scale: 'major', bpm: 60000 / beat }).rh;
    expect(row.map((n) => (n.rest ? 'r' : n.deg))).toEqual([1, 2, 3, 4, 5, 6, 7, 1, 3]);
    expect(row.slice(0, 7).map((n) => +n.dur.toFixed(4))).toEqual([0.5, 0.5, 0.25, 0.75, 0.3333, 0.3333, 0.3333]);
    expect(row[7].dur).toBe(0);
    expect(row[8].dur).toBe(0.5);
  });
  it('a release long before the next onset becomes a rest', () => {
    const rest = quantizePlayed(
      [
        { pitch: 60, on: 0, off: 250 },
        { pitch: 62, on: 1250, off: 1500 },
      ],
      { key: 0, scale: 'major', bpm: 120 },
    ).rh;
    expect(rest.map((n) => [n.rest ? 'r' : n.deg, n.dur])).toEqual([
      [1, 0.5],
      ['r', 2],
      [2, 0.5],
    ]);
  });
  it('splits hands at the split point into an independent LH row (with a leading rest)', () => {
    const r = quantizePlayed(
      [
        { pitch: 60, on: 0 },
        { pitch: 64, on: 500 },
        { pitch: 48, on: 500 },
        { pitch: 67, on: 1000 },
        { pitch: 55, on: 1000 },
        { pitch: 72, on: 1500 },
      ],
      { key: 0, scale: 'major', bpm: 60, split: 60 },
    );
    expect(r.rh.map((n) => n.deg)).toEqual([1, 3, 5, 8]);
    expect(r.rh.every((n) => n.hand === 'R')).toBe(true);
    expect(r.lh.map((n) => [n.rest ? 'r' : n.deg, n.dur])).toEqual([
      ['r', 0.5],
      [1, 0.5],
      [5, 0.5],
    ]);
  });
  it('loud notes become accents; patternFromPlayed keeps its v1 behaviour', () => {
    const r = quantizePlayed(
      [60, 62, 64, 65, 67].map((p, i) => ({ pitch: p, on: i * 250, vel: i === 2 ? 110 : 70 })),
      { key: 0, scale: 'major' },
    );
    expect(r.rh.map((n) => !!n.acc)).toEqual([false, false, true, false, false]);
    const pat = patternFromPlayed(
      [
        { pitch: 60, on: 0 },
        { pitch: 64, on: 10 },
        { pitch: 67, on: 400 },
        { pitch: 72, on: 800 },
      ],
      0,
      'major',
    );
    expect(pat.map((p) => [p.deg, p.dur])).toEqual([
      [1, 0],
      [3, 0.5],
      [5, 0.5],
      [8, 0.5],
    ]);
  });
});

describe('drill creator: hands', () => {
  it('RH, LH, octaves', () => {
    expect(pitches(customToDrill(base({ handsMode: 'R' }), 0))).toEqual([60, 62, 64, 65]);
    expect(pitches(customToDrill(base({ handsMode: 'L', hands: 'L' }), 0))).toEqual([48, 50, 52, 53]);
    const o = customToDrill(base({ handsMode: 'octaves', hands: 'RL' }), 0);
    expect(pitches(o, 'R')).toEqual([60, 62, 64, 65]);
    expect(pitches(o, 'L')).toEqual([48, 50, 52, 53]);
    expect(o.goal.hands).toBe(true);
    expect(o.spec.hands).toBe('RL');
  });
  it('contrary motion mirrors the LH around the tonic, sequence included', () => {
    const d = customToDrill(base({ text: '1 2 3', handsMode: 'contrary', sequenceSteps: 1, direction: 'up' }), 0);
    expect(pitches(d, 'R')).toEqual([60, 62, 64, 62, 64, 65]);
    expect(pitches(d, 'L')).toEqual([48, 47, 45, 47, 45, 43]);
    expect(d.title.en).toContain('contrary');
  });
  it('an independent LH row runs alongside the RH (unit = the longer row)', () => {
    const d = customToDrill(base({ text: '1/8 2 3 4 5 4 3 2', lhText: '1/2 5', handsMode: 'independent', hands: 'RL', sequenceSteps: 1, direction: 'up' }), 0);
    const L = d.notes.filter((n) => n.hand === 'L');
    expect(L.map((n) => [n.pitch, n.beat])).toEqual([
      [48, 0],
      [55, 2],
      [50, 4],
      [57, 6],
    ]);
    expect(d.notes.filter((n) => n.hand === 'R').length).toBe(16);
    expect(d.beats).toBe(8);
    expect(customProblems(base({ handsMode: 'independent', lh: [] })).some((e) => /left-hand/.test(e.en))).toBe(true);
  });
});

describe('drill creator: movement and keys', () => {
  it('direction, step size and octaves', () => {
    const c = { sequenceSteps: 2 };
    expect(shiftsOf(c, 7)).toEqual([0, 1, 2, 1, 0]);
    expect(shiftsOf({ ...c, direction: 'up' }, 7)).toEqual([0, 1, 2]);
    expect(shiftsOf({ ...c, direction: 'down' }, 7)).toEqual([0, -1, -2]);
    expect(shiftsOf({ ...c, direction: 'up', step: 2 }, 7)).toEqual([0, 2, 4]);
    expect(shiftsOf({ ...c, direction: 'up', step: 3 }, 7)).toEqual([0, 3, 6]);
    expect(shiftsOf({ sequenceSteps: 0, octaves: 3, direction: 'up' }, 7)).toEqual([0, 7, 14]);
    expect(shiftsOf({ sequenceSteps: 7, octaves: 2, direction: 'up' }, 7)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const d = customToDrill(base({ text: '1 3', sequenceSteps: 2, step: 2, direction: 'down' }), 0);
    expect(pitches(d)).toEqual([60, 64, 57, 60, 53, 57]);
    const oct = customToDrill(base({ text: '1 2', octaves: 2, direction: 'updown' }), 0);
    expect(pitches(oct)).toEqual([60, 62, 72, 74, 60, 62]);
  });
  it('subset keys in the player order, minor order, extra scales', () => {
    expect(customKeys(base(), 'fifths-up')).toEqual([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
    expect(customKeys(base({ keys: [5, 0, 2] }), 'fifths-up')).toEqual([0, 2, 5]);
    expect(customKeys(base({ keys: [5, 0, 2] }), 'chromatic-down')).toEqual([0, 5, 2]);
    expect(customKeys(base({ minor: true }), 'chromatic-up')[0]).toBe(9);
    expect(validateCustom(base({ keys: [] })).length).toBeGreaterThan(0);
    const dor = withScale(base({ text: '1 2 3 4 5 6 7 8' }), 'dorian');
    expect(dor.scale).toBe('natural');
    expect(pitches(customToDrill(dor, 2))).toEqual([62, 64, 65, 67, 69, 71, 72, 74]);
    expect(customToDrill(dor, 2).keySig).toBe('C');
    const wt = withScale(base({ text: '1 2 3 4 5 6 7' }), 'whole-tone');
    expect(pitches(customToDrill(wt, 0))).toEqual([60, 62, 64, 66, 68, 70, 72]);
    expect(withScale(dor, 'lydian').mode).toBe('lydian');
    expect(withScale(dor, 'major').mode).toBeUndefined();
    for (const m of ['altered', 'dim-hw', 'dim-wh', 'harmonic-major', 'phrygian', 'locrian'] as const) expect(validateCustom(withScale(base({ text: '1 3 5 7 9', sequenceSteps: 3 }), m))).toEqual([]);
  });
  it('tempo, grading, dynamics and inclusion flags', () => {
    const c = base({ startBpm: 66, goalBpm: 120, dynamics: 'cresc', grade: { evenness: true, hands: false, dynamics: true }, inWorkout: false });
    const d = customToDrill(c, 0);
    expect(d.startBpm).toBe(66);
    expect(d.goal).toMatchObject({ evenness: true, hands: false, dynamics: 'cresc' });
    expect(customToDrill({ ...c, grade: { dynamics: false } }, 0).goal.dynamics).toBeUndefined();
    expect(customIncluded(c, 'today')).toBe(true);
    expect(customIncluded(c, 'workout')).toBe(false);
    expect(customIncluded(c, 'today', 'guitar')).toBe(false);
    expect(validateCustom({ ...c, goalBpm: 50 })).toContain('The goal tempo is below the start tempo.');
    const ev = drillToEvents(d, 60);
    expect(ev.events.length).toBe(d.notes.length);
    expect(ev.events[3].velocity).toBeGreaterThan(ev.events[0].velocity);
  });
  it('keeps the keyboard range and says so in plain language (EN + HE)', () => {
    const c = base({ text: '1 8 15 22', sequenceSteps: 14, octaves: 4, direction: 'up' });
    const p = customProblems(c);
    expect(p.length).toBeGreaterThan(0);
    expect(p[0].en).toMatch(/keyboard/);
    expect(p[0].he).toMatch(/מקלדת/);
  });
});

describe('drill creator: guitar / bass', () => {
  it('places degrees in a position with tab info, technique marks, string sets', () => {
    const c = base({ text: '1/16 2h 3 5 8b 5~ 3pm 2s', instrument: 'guitar', sequenceSteps: 4, direction: 'updown' });
    for (let k = 0; k < 12; k++) {
      const d = customToDrill(c, k);
      expect(d.spec.instrument).toBe('guitar');
      playable(d);
      expect(d.notes.every((n) => n.hand === 'R')).toBe(true);
    }
    const d = customToDrill(c, 0);
    expect(d.notes[1].technique).toBe('hammer');
    expect(d.notes.find((n) => n.technique === 'bend')!.bendCents).toBe(200);
    // The tonic sits on the root string (6 by default; 5 when chosen).
    expect(d.notes[0].string).toBe(6);
    expect(customToDrill({ ...c, rootString: 5 }, 0).notes[0]).toMatchObject({ string: 5, fret: 3 });
    const top = customToDrill({ ...c, rootString: 3, strings: [1, 2, 3] }, 7);
    expect(top.notes.every((n) => n.string! <= 3)).toBe(true);
    playable(top);
  });
  it('bass uses 4 strings; unreachable patterns are reported', () => {
    const b = customToDrill(base({ text: '1 3 5 8', instrument: 'bass', sequenceSteps: 3 }), 5);
    expect(b.notes.every((n) => n.string! >= 1 && n.string! <= 4)).toBe(true);
    playable(b);
    const low = base({ text: '-6 1', instrument: 'guitar', rootString: 6 });
    expect(customProblems(low)[0].en).toMatch(/neck/);
  });
});

describe('drill creator: presets, copies, share codes, back-compat', () => {
  it('every preset is valid in all 12 keys (piano, and guitar / bass where offered)', () => {
    for (const p of PRESETS) {
      for (const inst of p.guitarOnly ? (['guitar', 'bass'] as const) : (['piano', 'guitar'] as const)) {
        const c = presetDrill(p, `p-${p.id}`, '2026-11-07', inst);
        expect(validateCustom(c), `${p.id} ${inst}`).toEqual([]);
        for (let k = 0; k < 12; k++) {
          const d = customToDrill(c, k);
          expect(d.notes.length).toBeGreaterThan(0);
          if (inst !== 'piano') playable(d, !!c.stretch);
          else expect(d.notes.every((n) => n.pitch >= 21 && n.pitch <= 108)).toBe(true);
        }
      }
    }
  });
  it('copies built-in piano drills into editable drills that sound the same', () => {
    let copied = 0;
    for (const f of catalog()) {
      for (const lv of f.levels.slice(0, 3)) {
        const all = specDrills(lv, 0, 'chromatic-up');
        const d = all.find((x) => x.spec.key === 0) ?? all[0];
        if (!d) continue;
        const c = customFromDrill(d, 'copy1', '2026-11-07');
        if (!c) continue;
        copied++;
        expect(validateCustom(c)).toEqual([]);
        const back = customToDrill(c, d.spec.key);
        const sig = (x: Drill) => x.notes.map((n) => `${n.hand}${n.pitch}@${n.beat}`).sort();
        expect(sig(back), d.itemId).toEqual(sig(d));
      }
    }
    expect(copied).toBeGreaterThan(10);
  });
  it('share code round-trips (v2 with marks / LH row / options, and a v1 mixed-hand drill)', () => {
    const c = base({ name: 'סולם בטרצות', text: "1/16 >3 5' r [1 3 5]/4", lhText: '1/2 5', handsMode: 'independent', hands: 'RL', sequenceSteps: 3, step: 2, direction: 'up', keys: [0, 7], minor: true, startBpm: 60, goalBpm: 100, dynamics: 'even-p', inPath: false });
    const code = shareCode(c);
    expect(code).toMatch(/^TTD2-[A-Za-z0-9_-]+$/);
    const r = readShareCode(code, c.id, c.createdAt);
    expect('drill' in r).toBe(true);
    if (!('drill' in r)) return;
    expect(r.drill).toEqual(c);
    const v1: CustomDrill = {
      id: 'old',
      name: 'Mixed',
      scale: 'major',
      pattern: [
        { deg: 1, dur: 0, hand: 'L' },
        { deg: 3, dur: 0.5, hand: 'R' },
        { deg: 5, alt: 1, dur: 1, hand: 'R' },
      ],
      sequenceSteps: 2,
      hands: 'RL',
      createdAt: 'x',
    };
    const r1 = readShareCode(shareCode(v1), 'old', 'x');
    expect('drill' in r1 && r1.drill).toEqual(v1);
    expect('error' in readShareCode('hello')).toBe(true);
    expect('error' in readShareCode('TTD2-!!!')).toBe(true);
    const fresh = readShareCode(code);
    expect('drill' in fresh && fresh.drill.id).not.toBe(c.id);
  });
  it('old (v1) custom drills generate exactly as before', () => {
    const olds: CustomDrill[] = [
      {
        id: 'a',
        name: 'Thirds',
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
        createdAt: 'x',
      },
      { id: 'b', name: 'LH', scale: 'harmonic', pattern: [1, 2, 3, 4, 5].map((deg) => ({ deg, dur: 0.25, hand: 'L' as Hand })), sequenceSteps: 2, hands: 'L', createdAt: 'x' },
      {
        id: 'c',
        name: 'Mixed',
        scale: 'mixolydian',
        pattern: [
          { deg: 1, dur: 0, hand: 'L' },
          { deg: 3, dur: 0.5, hand: 'R' },
          { deg: 5, dur: 0.5, hand: 'R' },
        ],
        sequenceSteps: 4,
        hands: 'RL',
        createdAt: 'x',
      },
      {
        id: 'd',
        name: 'Chords',
        scale: 'pentatonic' as ScaleType,
        pattern: [
          { deg: 1, dur: 0, hand: 'R' },
          { deg: 3, dur: 1, hand: 'R' },
          { deg: 2, dur: 0.5, hand: 'R' },
        ],
        sequenceSteps: 0,
        hands: 'R',
        createdAt: 'x',
      },
    ];
    for (const c of olds) {
      expect(validateCustom(c)).toEqual([]);
      for (let k = 0; k < 12; k++) expect(customToDrill(c, k), `${c.id} ${k}`).toEqual(legacyToDrill(c, k));
    }
  });
});
