// A piece chunk as a drill (SPEC-PIECE §3): the same take engine (count-in, MIDI / microphone, per-note marks,
// timing) plays and judges a chunk of a piece. Pure.

import type { Drill, Dyn, ExpNote, TakeMetrics } from '../drills/types';

const DYNS: Dyn[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
/** A score's dynamic as a level we grade (pp … ff; fff / ppp to the nearest, sf / fp and others not graded). */
const dynMarkOf = (d?: string): Dyn | undefined => (d === 'fff' ? 'ff' : d === 'ppp' ? 'pp' : DYNS.includes(d as Dyn) ? (d as Dyn) : undefined);
import { beatsIn, notesIn, type Piece } from './score';
import type { RepResult } from './coach';

const FIFTHS_KEY = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

export function chunkDrill(p: Piece, pieceId: string, from: number, to: number, bpm: number): Drill {
  const ns = notesIn(p, from, to);
  // Notes sharing an onset in one hand form a chord.
  const groups = new Map<string, number>();
  let gid = 0;
  const notes: ExpNote[] = ns.map((n) => {
    // one voice of one hand (two voices starting together are not one chord)
    const key = `${n.hand}:${n.voice ?? 1}:${Math.round(n.start * 48)}`;
    const same = ns.filter((m) => m.hand === n.hand && (m.voice ?? 1) === (n.voice ?? 1) && Math.abs(m.start - n.start) < 1e-3).length > 1;
    if (same && !groups.has(key)) groups.set(key, gid++);
    // MEASUREMENT-AUDIT G1: the written dynamics, hairpins, staccato dots and slurs reach the take (graded per passage).
    const dm = dynMarkOf(n.dyn);
    return { pitch: n.midi, beat: n.start, dur: n.dur, hand: n.hand, ...(dm ? { dynMark: dm } : {}), ...(n.hair ? { hair: n.hair } : {}), ...(n.staccato ? { stac: true } : {}), ...(n.slur !== undefined ? { slur: n.slur } : {}), ...(same ? { chordId: groups.get(key) } : {}), ...(n.accent ? { accent: true } : {}), ...(n.graces ? { graces: n.graces } : {}), ...(n.voice ? { staffVoice: n.voice } : {}) };
  });
  const sig = p.bars[from]?.sig ?? [4, 4];
  const meter = Math.max(1, Math.round((sig[0] * 4) / sig[1]));
  const both = notes.some((n) => n.hand === 'R') && notes.some((n) => n.hand === 'L');
  return {
    spec: { family: 'custom', kind: `piece:${pieceId}:${from}-${to}`, key: 0, hands: both ? 'RL' : notes.some((n) => n.hand === 'L') ? 'L' : 'R' },
    itemId: `piece:${pieceId}:${from}-${to}`,
    title: { en: `${p.title} · ${barLabel(p, from, to)}`, he: `${p.title} · ${barLabel(p, from, to, 'he')}` },
    notes,
    beats: beatsIn(p, from, to),
    meter,
    keySig: FIFTHS_KEY[Math.max(0, Math.min(14, p.fifths + 7))],
    goal: { evenness: false, hands: both, marks: true, lengths: true },
    startBpm: bpm,
    barBase: Number(p.bars[from]?.number) || from + 1,
  };
}

export const barLabel = (p: Piece, from: number, to: number, lang: 'en' | 'he' = 'en') => {
  const a = p.bars[from]?.number ?? String(from + 1);
  const b = p.bars[to]?.number ?? String(to + 1);
  return from === to ? `${lang === 'he' ? 'תיבה' : 'bar'} ${a}` : `${lang === 'he' ? 'תיבות' : 'bars'} ${a}–${b}`;
};

/** A judged take → the coach's rep result (accuracy, timing, the bar with the most errors). */
export function repFromTake(p: Piece, from: number, m: TakeMetrics): RepResult {
  const bad = new Map<number, number>();
  const t0 = p.bars[from]?.start ?? 0;
  for (const r of m.perNote)
    if (!r.ok) {
      const abs = r.exp.beat + t0;
      const bar = p.bars.findIndex((b) => abs >= b.start - 1e-6 && abs < b.start + b.beats - 1e-6);
      if (bar >= 0) bad.set(bar, (bad.get(bar) ?? 0) + 1);
    }
  const errorBar = bad.size ? [...bad.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0] : null;
  return { acc: m.accuracy, timingOk: m.verdict !== 'not', stopped: m.hesitations > 1, errorBar };
}
