// AUDIT-7 #11: graded classical repertoire on the keys path — the public-domain pieces of content/classicalPD.ts (our
// own engraving of works whose composers died 70+ years ago), one level a piece in grade order, a section an item.
// The same pieces open in the piece coach (Pieces.tsx "Classical library") for the chunk-by-chunk tempo ladder; here
// each section is a measured drill (notes and timing, both hands), in free time first, then the tempo ladder, like
// every piano item. Repertoire stays in its own key (a piece is not transposed). Pure.

import type { Drill, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { PD_PIECES, pdNotes, pdPiece, type PdPiece } from '../../content/classicalPD';

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const FIFTHS_KEY = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

/** A section of a piece as a drill (notes from the section's first bar; x/8 metres in eighths, pulse 8). */
export function pdSectionDrill(s: DrillSpec, p: PdPiece, section: number): Drill {
  const sec = p.sections[section % p.sections.length];
  const t0 = sec.from * p.meter;
  const ns = pdNotes(p).filter((n) => n.bar >= sec.from && n.bar <= sec.to);
  const groups = new Map<string, number>();
  let gid = 0;
  const notes: ExpNote[] = ns.map((n) => {
    const k = `${n.hand}:${Math.round((n.start - t0) * 48)}`;
    const same = ns.filter((m) => m.hand === n.hand && Math.abs(m.start - n.start) < 1e-6).length > 1;
    if (same && !groups.has(k)) groups.set(k, ++gid);
    return { pitch: n.midi, beat: r6(n.start - t0), dur: r6(n.dur), hand: n.hand, ...(same ? { chordId: groups.get(k) } : {}) };
  });
  const bars = sec.to - sec.from + 1;
  const eighths = p.unit === 8;
  const both = notes.some((n) => n.hand === 'L') && notes.some((n) => n.hand === 'R');
  const a = p.pickup ? sec.from : sec.from + 1;
  const b = p.pickup ? sec.to : sec.to + 1;
  return {
    spec: { ...s, hands: both ? 'RL' : 'R' },
    itemId: itemIdOf(s),
    title: { en: `${p.title.en} · ${p.composer.en} · bars ${a}–${b}`, he: `${p.title.he} · ${p.composer.he} · תיבות ${a}–${b}` },
    notes,
    beats: bars * p.meter,
    meter: p.meter,
    keySig: FIFTHS_KEY[p.fifths + 7],
    goal: { evenness: false, hands: both },
    startBpm: s.tempo ?? Math.round(p.tempo * 0.6),
    tonic: { key: p.tonic, ...(p.minor ? { minor: true } : {}) },
    ...(eighths ? { pulse: 8 as const, groups: [p.meter] } : {}),
    ...(bars > 8 ? { paged: true } : {}),
  };
}

/** Build a k-classic item: kind "pd~<piece id>", option = the section. */
export function genKeysClassic(s: DrillSpec): Drill {
  const id = s.kind.replace(/^pd~/, '');
  const p = pdPiece(id);
  if (!p) throw new Error(`Unknown public-domain piece ${id}`);
  return pdSectionDrill({ ...s, key: p.tonic }, p, s.option ?? 0);
}

/** One level a piece, in grade order; each section an item; the piece's own key only. */
export function keysClassicFamily(): FamilyDef {
  const fam: FamilyId = 'k-classic';
  const levels: LevelDef[] = [...PD_PIECES]
    .sort((a, b) => a.grade - b.grade)
    .map((p, i): LevelDef => {
      const target = p.tempo;
      const start = Math.round(target * 0.6);
      const specs: SpecTemplate[] = p.sections.map((_, k) => ({ family: fam, kind: `pd~${p.id}`, hands: 'RL', option: k, tempo: start }));
      return { id: `${fam}-${i + 1}`, level: i + 1, title: { en: `${p.title.en} (${p.composer.en})`, he: `${p.title.he} (${p.composer.he})` }, specs, keys: [p.tonic], tempo: [start, target] };
    });
  return { id: fam, title: { en: 'Classical pieces', he: 'יצירות קלאסיות' }, style: 'classical', levels };
}
