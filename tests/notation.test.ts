// Notation 0.99: grace notes (acciaccatura / appoggiatura) and two voices on one staff — the piece text format, the
// piece / drill models, the score layout (metre filling, grace placement, voice alignment) and the take matcher
// (a played grace is never wrong or extra; leaving it out is soft unless the item is about graces).

import { describe, expect, it } from 'vitest';
import { midiOf, parseVoiceFull, pdNotes, pdPiece, pdToPiece } from '../src/content/classicalPD';
import { pdSectionDrill } from '../src/engine/drills/keysClassic';
import { layoutPiece, type LayoutEv } from '../src/engine/piece/layout';
import { parseMusicXml } from '../src/engine/piece/score';
import { chunkDrill } from '../src/engine/piece/toDrill';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { analyzeFree } from '../src/engine/drills/rubato';
import { absorbGraces } from '../src/engine/drills/grace';
import { generate } from '../src/engine/drills/generate';
import { levelDrills } from '../src/engine/drills/plan';
import { techLevel } from '../src/engine/ladderFacts';
import { onsetColumns, voiceBarLines, accidentalFor, keyAccidentals } from '../src/ui/vfGrace';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const minuet = pdPiece('minuet-g')!;
const prelude = pdPiece('prelude-c')!;

/** A take of the drill: every note on time (MIDI), plus extra presses. */
function take(d: Drill, bpm: number, opts: { graces?: 'before' | 'onbeat' | 'none'; graceMs?: number } = {}): PlayedNote[] {
  const beatMs = 60000 / bpm;
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const t = expTimeMs(d, n.beat, bpm);
    const gs = n.graces ?? [];
    if (gs.length && opts.graces === 'onbeat') {
      // appoggiatura as taught: the grace on the beat, the main note half its value later
      gs.forEach((g, k) => out.push({ pitch: g.pitch, on: t + k * 60, off: t + k * 60 + 50, vel: 70 }));
      out.push({ pitch: n.pitch, on: t + (n.dur * beatMs) / 2, off: t + n.dur * beatMs * 0.95, vel: 70 });
      continue;
    }
    if (gs.length && opts.graces !== 'none') gs.forEach((g, k) => out.push({ pitch: g.pitch, on: t - (opts.graceMs ?? 70) * (gs.length - k), off: t - 10, vel: 60 }));
    out.push({ pitch: n.pitch, on: t, off: t + n.dur * beatMs * 0.95, vel: 70 });
  }
  return out.sort((a, b) => a.on - b.on);
}

describe('the piece text format: graces and voices', () => {
  it('"[B4]A4/3" is a grace B before A (unslashed), "[/C5,D5]" two slashed graces; the bar still fills its metre', () => {
    const v = parseVoiceFull('[B4]A4/3 | [/C5,D5]E5/1 r/2', 3, 'R', 't');
    expect(v.notes[0]).toMatchObject({ midi: midiOf('A4'), dur: 3, graces: [{ pitch: midiOf('B4') }] });
    expect(v.notes[0].graces![0].slash).toBeUndefined();
    expect(v.notes[1].graces).toEqual([{ pitch: midiOf('C5'), slash: true }, { pitch: midiOf('D5'), slash: true }]);
    // a grace takes none of the bar's time: a bar of graces + 2 beats in 3/4 is short
    expect(() => parseVoiceFull('[B4]A4/2', 3, 'R', 't')).toThrow(/beats/);
  });
  it('rejects a grace before a rest, on a tied continuation, with an ornament', () => {
    expect(() => parseVoiceFull('[B4]r/3', 3, 'R', 't')).toThrow(/rest/);
    expect(() => parseVoiceFull('A4/3~ | [B4]A4/3', 3, 'R', 't')).toThrow(/tied/);
    expect(() => parseVoiceFull('[B4]A4/3@mordent(G4)', 3, 'R', 't')).toThrow(/ornament/);
  });
  it('two strings in a hand are voice 1 (first) and voice 2; a hand with one string has no voice mark', () => {
    const lh = pdNotes(prelude).filter((n) => n.hand === 'L' && n.bar === 0);
    expect(lh.filter((n) => n.voice === 1).map((n) => [n.midi, n.start, n.dur])).toEqual([
      [midiOf('E4'), 0.25, 1.75],
      [midiOf('E4'), 2.25, 1.75],
    ]);
    expect(lh.filter((n) => n.voice === 2).map((n) => [n.midi, n.start, n.dur])).toEqual([
      [midiOf('C4'), 0, 2],
      [midiOf('C4'), 2, 2],
    ]);
    expect(pdNotes(prelude).filter((n) => n.hand === 'R').every((n) => n.voice === undefined)).toBe(true);
    expect(pdNotes(minuet).every((n) => n.voice === undefined)).toBe(true);
  });
});

describe('the Minuet in G: the source\'s grace B before bar 8', () => {
  it('bar 8\'s A carries an unslashed grace B; nothing else in the excerpt does', () => {
    const gs = pdNotes(minuet).filter((n) => n.graces);
    expect(gs.map((n) => [n.bar, n.midi, n.graces])).toEqual([[7, midiOf('A4'), [{ pitch: midiOf('B4') }]]]);
  });
  it('the piece model, the section drill and the piece coach\'s chunk carry it; the layout puts it on bar 8\'s head', () => {
    const p = pdToPiece(minuet);
    expect(p.notes.filter((n) => n.graces).length).toBe(1);
    const d = pdSectionDrill({ family: 'k-classic', kind: 'pd~minuet-g', key: 7, hands: 'RL', option: 0 }, minuet, 0);
    const main = d.notes.find((n) => n.graces)!;
    expect(main).toMatchObject({ pitch: midiOf('A4'), beat: 21, dur: 3 });
    expect(chunkDrill(p, 'minuet-g', 0, 7, 80).notes.filter((n) => n.graces).length).toBe(1);
    const bar8 = layoutPiece(p)[7].hands.R;
    expect(bar8.map((e) => [e.midis, e.dur, e.graces])).toEqual([[[midiOf('A4')], 3, [{ pitch: midiOf('B4') }]]]);
    // never a graded note of its own: the grace pitch is not among the bar's refs
    expect(bar8[0].refs.map((r) => p.notes[r].midi)).toEqual([midiOf('A4')]);
  });
});

describe('the Prelude in C: two voices in the left hand', () => {
  const p = pdToPiece(prelude);
  const L = layoutPiece(p);
  const sum = (evs: LayoutEv[]) => evs.reduce((a, e) => a + e.dur, 0);
  it('every bar lays the left hand out as two voices that each fill the bar (metre), the right hand as one', () => {
    for (const b of L) {
      expect(b.hands2?.L, `bar ${b.number}`).toBeTruthy();
      expect(b.hands2?.R).toBeUndefined();
      expect(sum(b.hands.L), `bar ${b.number} v1`).toBeCloseTo(4);
      expect(sum(b.hands2!.L!), `bar ${b.number} v2`).toBeCloseTo(4);
      expect(sum(b.hands.R)).toBeCloseTo(4);
    }
  });
  it('voice 1 = a 16th rest, a dotted eighth tied to a quarter (twice); voice 2 = the bass in halves', () => {
    const b = L[0];
    expect(b.hands.L.map((e) => [e.at, e.dur, e.midis.length ? e.midis[0] : 'r', e.tie, !!e.cont])).toEqual([
      [0, 0.25, 'r', false, false],
      [0.25, 0.75, midiOf('E4'), true, false],
      [1, 1, midiOf('E4'), false, true],
      [2, 0.25, 'r', false, false],
      [2.25, 0.75, midiOf('E4'), true, false],
      [3, 1, midiOf('E4'), false, true],
    ]);
    expect(b.hands2!.L!.map((e) => [e.at, e.dur, e.midis[0]])).toEqual([
      [0, 2, midiOf('C4')],
      [2, 2, midiOf('C4')],
    ]);
  });
  it('the section drill marks voice 2 (staffVoice) and never chords the two voices together', () => {
    const d = pdSectionDrill({ family: 'k-classic', kind: 'pd~prelude-c', key: 0, hands: 'RL', option: 0 }, prelude, 0);
    const lh = d.notes.filter((n) => n.hand === 'L');
    expect(lh.filter((n) => n.staffVoice === 2).length).toBe(22); // 11 bars × 2 halves
    expect(lh.filter((n) => n.staffVoice === 1).length).toBe(22);
    expect(lh.some((n) => n.chordId !== undefined)).toBe(false);
  });
});

describe('the drawing model', () => {
  it('two voices: the columns are the distinct onsets, and both voices meet at every bar line', () => {
    // a Prelude bar as the drill staff draws it, merged in time order: v2 C half | v1 r16 E 8. E q | …
    const items: { d: number; v: 1 | 2 }[] = [
      { d: 2, v: 2 }, { d: 0.25, v: 1 }, { d: 0.75, v: 1 }, { d: 1, v: 1 },
      { d: 2, v: 2 }, { d: 0.25, v: 1 }, { d: 0.75, v: 1 }, { d: 1, v: 1 },
    ];
    expect(onsetColumns(items.map((x) => x.d), items.map((x) => x.v))).toBe(6);
    const bl = voiceBarLines(items.map((x) => x.d), items.map((x) => x.v), 4);
    expect(bl[1]).toEqual([4]);
    expect(bl[2]).toEqual([4]);
  });
  it('grace accidentals follow the key signature', () => {
    expect(keyAccidentals('G').F).toBe(1);
    expect(keyAccidentals('Bb').E).toBe(-1);
    expect(accidentalFor('b/4', 'G')).toBeNull();
    expect(accidentalFor('f/5', 'G')).toBe('n');
    expect(accidentalFor('eb/5', 'C')).toBe('b');
    expect(accidentalFor('f#/4', 'D')).toBeNull();
  });
});

describe('the matcher: grace notes', () => {
  const sec = pdSectionDrill({ family: 'k-classic', kind: 'pd~minuet-g', key: 7, hands: 'RL', option: 0 }, minuet, 0);
  it('the Minuet with its grace played just before bar 8: clean, nothing wrong, the grace counted', () => {
    const m = analyzeTake(sec, 80, take(sec, 80));
    expect(m.wrong).toBe(0);
    expect(m.accuracy).toBe(1);
    expect(m.verdict).toBe('clean');
    expect(m.graces).toEqual({ ok: 1, total: 1, missed: [] });
    // the main note's timing is its own (on the beat), not the grace's
    const a = m.perNote.find((r) => r.exp.graces)!;
    expect(Math.abs(a.dev!)).toBeLessThan(1);
  });
  it('the same grace played on the beat (main note late): the main note is graded on the grace\'s onset — still clean', () => {
    const m = analyzeTake(sec, 80, take(sec, 80, { graces: 'onbeat' }));
    expect(m.wrong).toBe(0);
    expect(m.verdict).toBe('clean');
    expect(Math.abs(m.perNote.find((r) => r.exp.graces)!.dev!)).toBeLessThan(1);
  });
  it('leaving the grace out is a soft mark: still clean, reported', () => {
    const m = analyzeTake(sec, 80, take(sec, 80, { graces: 'none' }));
    expect(m.verdict).toBe('clean');
    expect(m.graces?.ok).toBe(0);
    expect(m.graces?.missed.length).toBe(1);
    expect(m.why.en).toMatch(/grace/);
  });
  it('a grace-note item (ornaments: acciaccatura / appoggiatura) is strict: left out keeps it from clean', () => {
    for (const option of [3, 4]) {
      const d = generate({ family: 'fingers', kind: 'ornament', key: 0, hands: 'R', option });
      expect(d.notes.slice(0, -1).every((n) => n.graces?.length === 1), `op ${option}`).toBe(true); // the closing tonic has none
      expect(d.notes[0].graces![0].slash ?? false).toBe(option === 3);
      expect(analyzeTake(d, 60, take(d, 60, { graces: option === 4 ? 'onbeat' : 'before' })).verdict, `op ${option}`).toBe('clean');
      const miss = analyzeTake(d, 60, take(d, 60, { graces: 'none' }));
      expect(miss.verdict, `op ${option} missed`).toBe('almost');
      expect(miss.wrong).toBe(0);
    }
  });
  it('several graces in a row are absorbed in order; a press of a grace pitch nearer another written note is that note', () => {
    const d: Drill = { ...sec, notes: [
      { pitch: 60, beat: 0, dur: 1, hand: 'R' },
      { pitch: 64, beat: 1, dur: 1, hand: 'R', graces: [{ pitch: 60 }, { pitch: 62 }] },
    ], beats: 2 };
    const r = absorbGraces(d, 1000, [
      { pitch: 60, on: 0, off: 100, vel: 60 },
      { pitch: 60, on: 820, off: 860, vel: 60 },
      { pitch: 62, on: 900, off: 950, vel: 60 },
      { pitch: 64, on: 1000, off: 1900, vel: 60 },
    ], (b) => b * 1000);
    expect(r.graces).toEqual({ ok: 2, total: 2, missed: [] });
    expect(r.played.map((p) => p.pitch)).toEqual([60, 64]);
  });
  it('free time (rubato): the grace press is neither wrong nor needed', () => {
    const played = take(sec, 60);
    const m = analyzeFree(sec, played);
    expect(m.wrong).toBe(0);
    expect(m.accuracy).toBe(1);
    expect(m.graces?.ok).toBe(1);
    const none = analyzeFree(sec, take(sec, 60, { graces: 'none' }));
    expect(none.verdict).toBe('clean');
    expect(none.graces?.missed.length).toBe(1);
  });
});

describe('the curriculum: grace notes and voices where they are taught', () => {
  it('the blues "crush" lick writes the ♭3 as a slashed grace into the 3rd', () => {
    const d = generate({ family: 'jazz', kind: 'blues-lick', key: 0, hands: 'RL', option: 2 });
    const g = d.notes.filter((n) => n.graces);
    expect(g.length).toBe(2);
    for (const n of g) expect(n.graces).toEqual([{ pitch: n.pitch - 1, slash: true }]);
    expect(d.goal.graces).toBe('strict');
    expect(analyzeTake(d, 70, take(d, 70)).verdict).toBe('clean');
  });
  it('k-read 11 (four voices): two voices a staff, the alto held a half under the soprano\'s passing quarters', () => {
    for (const d of levelDrills(techLevel('k-read-11')!, 'fifths-up').slice(0, 4)) {
      for (const h of ['R', 'L'] as const) {
        const ns = d.notes.filter((n) => n.hand === h);
        expect(ns.every((n) => n.staffVoice === 1 || n.staffVoice === 2)).toBe(true);
        // each voice fills the item: its lengths add up to the item's length
        for (const v of [1, 2]) expect(ns.filter((n) => n.staffVoice === v).reduce((a, n) => a + n.dur, 0), `${d.itemId} ${h}${v}`).toBe(d.beats);
      }
      expect(d.notes.filter((n) => n.staffVoice === 2 && n.hand === 'R').every((n) => n.dur === 2)).toBe(true);
    }
  });
});

describe('MusicXML import: graces and voices', () => {
  const n = (step: string, oct: number, dur: number, extra = '') => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration>${extra}</note>`;
  const xml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
      <note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><voice>1</voice><staff>1</staff></note>
      ${n('C', 5, 2, '<voice>1</voice><staff>1</staff>')}
      <backup><duration>2</duration></backup>
      ${n('E', 3, 1, '<voice>5</voice><staff>2</staff>')}${n('F', 3, 1, '<voice>5</voice><staff>2</staff>')}
      <backup><duration>2</duration></backup>
      ${n('C', 3, 2, '<voice>6</voice><staff>2</staff>')}
    </measure></part></score-partwise>`;
  it('a <grace slash="yes"/> becomes the next note\'s acciaccatura; a staff\'s second voice is voice 2', () => {
    const p = parseMusicXml(xml);
    expect(p.notes.find((x) => x.midi === midiOf('C5'))!.graces).toEqual([{ pitch: midiOf('B4'), slash: true }]);
    expect(p.notes.filter((x) => x.hand === 'L').map((x) => [x.midi, x.voice])).toEqual([
      [midiOf('C3'), 2],
      [midiOf('E3'), 1],
      [midiOf('F3'), 1],
    ]);
    expect(p.notes.find((x) => x.midi === midiOf('C5'))!.voice).toBeUndefined();
    const L = layoutPiece(p)[0];
    expect(L.hands2?.L?.map((e) => e.dur)).toEqual([2]);
    expect(L.hands.L.map((e) => e.dur)).toEqual([1, 1]);
  });
});
