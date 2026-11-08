import { describe, expect, it } from 'vitest';
import { parseMidi, parseMusicXml, performanceOrder, notesIn, type Piece } from '../src/engine/piece/score';
import { barMastery, initPlan, nextTask, planProgress, recordRep, segment, startDay, type PlanState } from '../src/engine/piece/coach';

const note = (step: string, oct: number, dur: number, extra = '') => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration>${extra}</note>`;
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Little &amp; Test</work-title></work>
  <identification><creator type="composer">Anon</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
      <direction><sound tempo="96"/></direction>
      <barline location="left"><repeat direction="forward"/></barline>
      ${note('G', 4, 2, '<staff>1</staff>')}${note('A', 4, 2, '<staff>1</staff>')}${note('B', 4, 4, '<tie type="start"/><staff>1</staff>')}
      <backup><duration>8</duration></backup>
      ${note('G', 2, 8, '<staff>2</staff>')}
    </measure>
    <measure number="2">
      ${note('B', 4, 2, '<tie type="stop"/><staff>1</staff>')}${note('C', 5, 2, '<staff>1</staff><notations><articulations><staccato/></articulations></notations>')}<note><rest/><duration>4</duration><staff>1</staff></note>
      <barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>
      <barline location="left"><ending number="1" type="start"/></barline>
    </measure>
    <measure number="3">
      <barline location="left"><ending number="2" type="start"/></barline>
      ${note('D', 5, 8, '<staff>1</staff>')}
    </measure>
    <measure number="4">
      ${note('G', 4, 8, '<staff>1</staff>')}
    </measure>
  </part>
</score-partwise>`;

describe('piece import (SPEC-PIECE §3)', () => {
  it('reads MusicXML: title, tempo, key, hands, ties, articulation, repeats and endings', () => {
    const p = parseMusicXml(XML);
    expect(p.title).toBe('Little & Test');
    expect(p.composer).toBe('Anon');
    expect(p.tempo).toBe(96);
    expect(p.fifths).toBe(1);
    // bars 1, 2 (1st ending), 1, 3 (2nd ending), 4
    expect(p.bars.map((b) => b.number)).toEqual(['1', '2', '1', '3', '4']);
    const first = p.notes.filter((n) => n.bar === 0);
    expect(first.map((n) => [n.midi, n.hand])).toEqual([[43, 'L'], [67, 'R'], [69, 'R'], [71, 'R']]);
    // the tied B lasts 2 + 1 beats
    expect(first.find((n) => n.midi === 71)!.dur).toBe(3);
    expect(p.notes.find((n) => n.midi === 72)!.staccato).toBe(true);
    expect(p.bars[3].boundary).toBe(true);
  });
  it('performance order: plain repeat, voltas, no forward repeat', () => {
    const B = (o: Partial<{ repeatStart: boolean; repeatEnd: boolean; ending: number[] | null }> = {}) => ({ repeatStart: false, repeatEnd: false, ending: null, ...o });
    expect(performanceOrder([B(), B({ repeatEnd: true }), B()])).toEqual([0, 1, 0, 1, 2]);
    expect(performanceOrder([B(), B({ repeatStart: true }), B({ repeatEnd: true }), B()])).toEqual([0, 1, 2, 1, 2, 3]);
    expect(performanceOrder([B({ repeatStart: true }), B(), B({ ending: [1], repeatEnd: true }), B({ ending: [2] }), B()])).toEqual([0, 1, 2, 0, 1, 3, 4]);
  });
  it('reads a Standard MIDI File (two tracks → hands)', () => {
    const vlq = (n: number) => (n < 128 ? [n] : [0x80 | (n >> 7), n & 0x7f]);
    const track = (evs: number[]) => [0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, evs.length, ...evs];
    const t0 = [0, 0xff, 0x51, 3, 0x09, 0x27, 0xc0, 0, 0xff, 0x58, 4, 3, 2, 24, 8, ...[0, 0x90, 60, 80], ...vlq(480), 0x80, 60, 0, ...[0, 0x90, 64, 80], ...vlq(480), 0x80, 64, 0, ...[0, 0xff, 0x2f, 0]];
    const t1 = [0, 0x91, 48, 70, ...vlq(1440), 0x81, 48, 0, 0, 0xff, 0x2f, 0];
    const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, 0x01, 0xe0, ...track(t0), ...track(t1)]);
    const p = parseMidi(bytes, 'Mini');
    expect(p.tempo).toBe(100);
    expect(p.bars[0].sig).toEqual([3, 4]);
    expect(p.notes.map((n) => [n.midi, n.start, n.dur, n.hand])).toEqual([[48, 0, 3, 'L'], [60, 0, 1, 'R'], [64, 1, 1, 'R']]);
  });
});

/** A 16-bar piece: steady quarters, bars 9–10 dense 16ths (a hard spot). */
function demoPiece(): Piece {
  const bars = Array.from({ length: 16 }, (_, i) => ({ number: String(i + 1), start: i * 4, beats: 4, sig: [4, 4] as [number, number], ...(i === 0 || i === 8 ? { boundary: true } : {}) }));
  const notes = bars.flatMap((b, i) => {
    const per = i === 8 || i === 9 ? 16 : 4;
    return Array.from({ length: per }, (_, k) => ({ midi: 60 + ((k * 2) % 12), start: b.start + (k * 4) / per, dur: 4 / per, bar: i, hand: 'R' as const }));
  });
  return { title: 'Demo', bars, notes, fifths: 0, source: 'musicxml' };
}

describe('piece coach (SPEC-PIECE §2)', () => {
  it('segments at boundaries and makes the dense bars a spot chunk', () => {
    const segs = segment(demoPiece(), 100);
    expect(segs.find((s) => s.spot)).toEqual({ from: 8, to: 9, spot: true });
    expect(segs.every((s) => s.to - s.from < 4)).toBe(true);
    expect(segs[0]).toEqual({ from: 0, to: 3, spot: false });
    // every bar is covered exactly once
    const covered = segs.flatMap((s) => Array.from({ length: s.to - s.from + 1 }, (_, k) => s.from + k));
    expect(covered).toEqual(Array.from({ length: 16 }, (_, k) => k));
  });

  it('starts slow, steps up after three clean reps, steps back to the error bar after two misses', () => {
    let s = initPlan(demoPiece(), { target: 100 }, '2026-11-08');
    let t = nextTask(s)!;
    expect([t.from, t.to, t.tempo]).toEqual([0, 3, 55]);
    for (let k = 0; k < 3; k++) s = recordRep(s, t, { acc: 1, timingOk: true }, new Date()).state;
    t = nextTask(s)!;
    expect(t.tempo).toBe(58);
    s = recordRep(s, t, { acc: 0.9, timingOk: true, errorBar: 2 }, new Date()).state;
    const r = recordRep(s, t, { acc: 0.9, timingOk: true, errorBar: 2 }, new Date());
    expect(r.events).toContainEqual({ k: 'stepBack', chunk: 'c0', bar: 2, tempo: 52 });
    const loop = nextTask(r.state)!;
    expect([loop.kind, loop.from, loop.to, loop.tempo]).toEqual(['loop', 1, 2, 52]);
    let s2 = recordRep(r.state, loop, { acc: 1, timingOk: true }, new Date()).state;
    const done = recordRep(s2, loop, { acc: 1, timingOk: true }, new Date());
    expect(done.events).toContainEqual({ k: 'loopDone', chunk: 'c0' });
    s2 = done.state;
    expect(nextTask(s2)!.kind).toBe('chunk');
  });

  it('a simulated player who improves with practice learns the whole piece, and the plan joins chunks on the way', () => {
    const p = demoPiece();
    let s: PlanState = initPlan(p, { target: 100 }, 'd0');
    // Skill per bar: the tempo the player can play cleanly; it grows with each rep on that bar.
    const skill: number[] = p.bars.map((_, i) => (i === 8 || i === 9 ? 35 : 60));
    const seen = new Set<string>();
    let day = 0;
    let reps = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (!s.done && reps < 6000) {
      if (reps % 120 === 119) s = startDay(s, `d${++day}`);
      const t = nextTask(s)!;
      let worst = t.from;
      let ok = true;
      for (let b = t.from; b <= t.to; b++) {
        if (skill[b] < t.tempo * (0.97 + 0.06 * rnd())) {
          ok = false;
          worst = b;
        }
        skill[b] = Math.min(130, skill[b] + 0.35);
      }
      const r = recordRep(s, t, { acc: ok ? 1 : 0.88, timingOk: ok, errorBar: worst }, new Date());
      for (const e of r.events) seen.add(e.k);
      s = r.state;
      reps++;
    }
    expect(s.done).toBe(true);
    expect(planProgress(s, p.bars.length)).toBe(1);
    for (const k of ['stepUp', 'stepBack', 'newChunk', 'seam', 'join', 'rotate', 'fullRun', 'pieceDone']) expect(seen.has(k), k).toBe(true);
    expect(barMastery(s, p.bars.length).every((x) => x === 1)).toBe(true);
  });

  it('backward chaining starts with the last chunk', () => {
    const s = initPlan(demoPiece(), { target: 100, backward: true }, 'd0');
    expect(nextTask(s)!.to).toBe(15);
  });

  it('notes of a range are relative to its first bar', () => {
    const p = demoPiece();
    expect(notesIn(p, 2, 2)[0].start).toBe(0);
  });
});
