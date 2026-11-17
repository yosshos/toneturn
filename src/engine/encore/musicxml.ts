// A phrase as MusicXML (SPEC-PHRASE-STUDIO §18 v3 "MusicXML export"): score-partwise, one part — piano with two
// staves when the phrase has a left hand, else one staff in the instrument's clef (guitar / bass octave clefs, the
// voice by its register). Pitches are the sounding notes in the chosen key as the app places them (phrasePitches);
// spelling follows the key signature; a pickup is an implicit short first measure; chords are <harmony> symbols.
// Durations are split into written values (dotted and triplet values included) and tied across bar lines;
// accidentals are left to the notation program (it reads them from the pitches).
// Pure; pieces' importer (engine/piece/score.ts parseMusicXml) reads it back (the test round-trips it).

import type { Lick, LickInstrument } from '../licks';
import { LICK_Q } from '../licks';
import { barEndBeat, phraseBars, phraseBeats, phrasePitches, pickupOf } from './phrase';

const mod = (n: number) => ((n % 12) + 12) % 12;
/** Divisions per quarter note: sixteenths, triplets and thirty-seconds stay exact (as the assignment code's ticks). */
export const DIV = 24;
/** Major-key fifths of a tonic (F♯ as 6, D♭ as −5 — the app's spelling). */
const FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
export const keyFifths = (tonic: number, minor = false): number => FIFTHS[mod(minor ? tonic + 3 : tonic)];
const SHARP: [string, number][] = [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
const FLAT: [string, number][] = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
/** Step, alter and octave of a MIDI pitch in a key signature (flats in flat keys, sharps otherwise). */
export function spell(midi: number, fifths: number): { step: string; alter: number; octave: number } {
  const [step, alter] = (fifths < 0 ? FLAT : SHARP)[mod(midi)];
  // the octave of the written letter (B♯ / C♭ never arise from these tables)
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
}

/** Written values in divisions, longest first: [ticks, type, dotted, triplet]. */
const VALUES: [number, string, boolean, boolean][] = [
  [96, 'whole', false, false],
  [72, 'half', true, false],
  [48, 'half', false, false],
  [36, 'quarter', true, false],
  [24, 'quarter', false, false],
  [18, 'eighth', true, false],
  [16, 'half', false, true],
  [12, 'eighth', false, false],
  [9, '16th', true, false],
  [8, 'quarter', false, true],
  [6, '16th', false, false],
  [4, 'eighth', false, true],
  [3, '32nd', false, false],
  [2, '16th', false, true],
  [1, '32nd', false, true],
];
/** A length in divisions as written values (greedy, longest first). */
export function splitValues(ticks: number): [number, string, boolean, boolean][] {
  const out: [number, string, boolean, boolean][] = [];
  let left = Math.max(0, Math.round(ticks));
  while (left > 0) {
    const v = VALUES.find((x) => x[0] <= left)!;
    out.push(v);
    left -= v[0];
  }
  return out;
}

const KIND: Record<string, string> = { maj7: 'major-seventh', '6': 'major-sixth', m7: 'minor-seventh', m6: 'minor-sixth', '7': 'dominant', hd7: 'half-diminished', dim7: 'diminished-seventh', alt: 'dominant', '7b9': 'dominant', maj: 'major', m: 'minor' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Ev {
  at: number;
  len: number;
  pitches: number[];
}
/** One staff's notes as onset groups (chords), each lasting to the next onset at most, in divisions. */
function staffEvents(notes: { midi: number; beat: number; dur: number }[], tpb = DIV): Ev[] {
  const by = new Map<number, { pitches: number[]; dur: number }>();
  for (const n of notes) {
    const at = Math.round(n.beat * tpb);
    const g = by.get(at) ?? { pitches: [], dur: 0 };
    if (!g.pitches.includes(n.midi)) g.pitches.push(n.midi);
    g.dur = Math.max(g.dur, Math.round(n.dur * tpb));
    by.set(at, g);
  }
  const ats = [...by.keys()].sort((a, b) => a - b);
  return ats.map((at, i) => {
    const g = by.get(at)!;
    const next = ats[i + 1] ?? Infinity;
    return { at, len: Math.max(1, Math.min(g.dur, next - at)), pitches: g.pitches.sort((a, b) => a - b) };
  });
}

/** The phrase in a key as a MusicXML document. */
export function phraseMusicXml(l: Lick, o: { key?: number; inst?: LickInstrument; title?: string; bpm?: number } = {}): string {
  const key = mod(o.key ?? l.homeKey ?? 0);
  const inst = o.inst ?? 'piano';
  const fifths = keyFifths(key, !!l.minor);
  const pp = phrasePitches(l, key, inst);
  const piano = inst === 'piano';
  const rh = l.notes.map((n, i) => ({ midi: pp.rh[i], beat: n[1], dur: n[2] }));
  const lh = (l.lh ?? []).map((n, i) => ({ midi: pp.lh[i], beat: n[1], dur: n[2] }));
  // off the piano: one line (the right hand; a left-hand-only phrase as itself)
  const staves = piano && lh.length && rh.length ? [rh, lh] : [rh.length ? rh : lh];
  const meter = l.meter ?? 4;
  const p = pickupOf(l);
  const nBars = Math.round(phraseBars(l));
  // divisions per drill beat: a quarter, or an eighth in 6/8 (DIV stays the divisions per quarter)
  const tpb = meter === 6 ? DIV / 2 : DIV;
  const total = phraseBeats(l) * tpb;
  const bars = Array.from({ length: nBars }, (_, b) => {
    const end = Math.min(total, barEndBeat(l, b) * tpb);
    const start = b === 0 ? 0 : barEndBeat(l, b - 1) * tpb;
    return { start, end };
  });
  const events = staves.map((s) => staffEvents(s, tpb));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const clefs: string[] =
    staves.length === 2
      ? ['<clef number="1"><sign>G</sign><line>2</line></clef>', '<clef number="2"><sign>F</sign><line>4</line></clef>']
      : inst === 'guitar'
        ? ['<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>']
        : inst === 'bass'
          ? ['<clef><sign>F</sign><line>4</line><clef-octave-change>-1</clef-octave-change></clef>']
          : mean(staves[0].map((n) => n.midi)) >= 57
            ? ['<clef><sign>G</sign><line>2</line></clef>']
            : ['<clef><sign>F</sign><line>4</line></clef>'];
  const chords: { at: number; root: number; q: string }[] = [];
  let ca = 0;
  for (const c of l.chords) {
    chords.push({ at: Math.round(ca * tpb), root: mod(c[0] + key), q: c[1] });
    ca += c[2];
  }
  const title = o.title ?? (typeof l.name === 'string' ? (l.name as string) : l.name.en || l.name.he);
  const bpm = Math.round(o.bpm ?? l.plan?.goalBpm ?? l.playedBpm ?? 100);
  const instName: Record<LickInstrument, string> = { piano: 'Piano', guitar: 'Guitar', bass: 'Bass', voice: 'Voice' };

  const noteXml = (pitch: number | null, ticks: [number, string, boolean, boolean], o2: { chord?: boolean; staff?: number; tieStart?: boolean; tieStop?: boolean }) => {
    const [d, type, dot, trip] = ticks;
    const sp = pitch === null ? null : spell(pitch, fifths);
    const ties = [o2.tieStop ? '<tie type="stop"/>' : '', o2.tieStart ? '<tie type="start"/>' : ''].join('');
    const tied = [o2.tieStop ? '<tied type="stop"/>' : '', o2.tieStart ? '<tied type="start"/>' : ''].join('');
    return (
      '<note>' +
      (o2.chord ? '<chord/>' : '') +
      (sp ? `<pitch><step>${sp.step}</step>${sp.alter ? `<alter>${sp.alter}</alter>` : ''}<octave>${sp.octave}</octave></pitch>` : '<rest/>') +
      `<duration>${d}</duration>${ties}<voice>${o2.staff ?? 1}</voice><type>${type}</type>${dot ? '<dot/>' : ''}` +
      (trip ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '') +
      (staves.length === 2 ? `<staff>${o2.staff ?? 1}</staff>` : '') +
      (tied ? `<notations>${tied}</notations>` : '') +
      '</note>'
    );
  };

  /** One staff's content in a bar: rests between groups, every group split into written values and tied. */
  const staffBar = (evs: Ev[], s: number, e: number, staff: number): string => {
    let out = '';
    let pos = s;
    const fill = (to: number) => {
      if (to <= pos) return;
      for (const v of splitValues(to - pos)) out += noteXml(null, v, { staff });
      pos = to;
    };
    for (const ev of evs) {
      const a = Math.max(ev.at, s);
      const b = Math.min(ev.at + ev.len, e);
      if (b <= a) continue;
      fill(a);
      const parts = splitValues(b - a);
      parts.forEach((v, i) => {
        const tieStop = i > 0 || a > ev.at;
        const tieStart = i < parts.length - 1 || b < ev.at + ev.len;
        ev.pitches.forEach((pc, j) => (out += noteXml(pc, v, { chord: j > 0, staff, tieStart, tieStop })));
      });
      pos = b;
    }
    fill(e);
    return out;
  };

  const measures = bars.map((bar, b) => {
    let x = `<measure number="${p ? b : b + 1}"${p && b === 0 ? ' implicit="yes"' : ''}>`;
    if (b === 0) {
      x += `<attributes><divisions>${DIV}</divisions><key><fifths>${fifths}</fifths><mode>${l.minor ? 'minor' : 'major'}</mode></key><time><beats>${meter}</beats><beat-type>${meter === 6 ? 8 : 4}</beat-type></time>${staves.length === 2 ? '<staves>2</staves>' : ''}${clefs.join('')}</attributes>`;
      x += `<direction placement="above"><direction-type><metronome><beat-unit>${meter === 6 ? 'eighth' : 'quarter'}</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${meter === 6 ? Math.round(bpm / 2) : bpm}"/></direction>`;
    }
    for (const c of chords.filter((c) => c.at >= bar.start && c.at < bar.end)) {
      const sp = spell(60 + c.root, fifths);
      x += `<harmony><root><root-step>${sp.step}</root-step>${sp.alter ? `<root-alter>${sp.alter}</root-alter>` : ''}</root><kind text="${esc(LICK_Q[c.q]?.sym ?? c.q)}">${KIND[c.q] ?? 'other'}</kind>${c.at > bar.start ? `<offset>${c.at - bar.start}</offset>` : ''}</harmony>`;
    }
    events.forEach((evs, si) => {
      if (si > 0) x += `<backup><duration>${bar.end - bar.start}</duration></backup>`;
      x += staffBar(evs, bar.start, bar.end, si + 1);
    });
    return x + '</measure>';
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
    `<score-partwise version="4.0"><work><work-title>${esc(title)}</work-title></work><identification><encoding><software>The 7th Sense</software></encoding></identification>` +
    `<part-list><score-part id="P1"><part-name>${instName[inst]}</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>\n`
  );
}
