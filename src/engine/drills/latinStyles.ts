// Brazilian and Afro-Cuban comping on piano and guitar (docs/SPEC-JAZZ-NEIGHBOURS.md §2, §3, §7 step 3). Every pattern
// is a convention written from the verified research — docs/research/STYLE-BRAZIL.md and STYLE-AFROCUBAN.md, claims
// tagged [V] or well-sourced [C]; the [?] figures are left out (named below where they would have gone). Rhythms and
// comping patterns are not protectable; no tune is used (the progressions are the research's generic ones, §5 / §6.3).
//
//   k-brazil  piano: bossa comping — the left hand the surdo (root on 1, 5th on 3; the pickups), the right hand the
//             tamborim (F1, the bossa-clave comp 3-2 / 2-3, all upbeats), shells → rootless → 6/9 and 4ths, anticipated
//             changes, the variation rung, pads "with a guitar"; samba comping in 2/4 (the surdo, its pickups, F1 at
//             16ths, chords anticipated by a 16th); bossa and samba with the drums.
//   k-montuno piano: the montuno / guajeo — the onbeat/offbeat motif in the clave direction (the three-side bar on the
//             offbeats), ponchando block chords, the broken octave figure, I–IV–V–IV and i–iv–V7–iv, ii–V (2 bars) and
//             ii–V–I (4 bars), the left hand doubling the line, anticipated changes, songo's right hand on the beats, and
//             the montuno with the clave and a tumbao.
//   g-brazil  guitar: the bossa batida — the thumb alone, root–5th, then the fingers (F1, the clave comp, upbeats), the
//             surdo pickups, anticipated changes, the bossa grips; the samba (thumb on one repeated note, F1 at 16ths).
//   g-guajeo  guitar: the guajeo, tres style — arpeggiated triads on strings 3-2-1 on the same onbeat/offbeat motif.
//
// Left out as [?]: the two-bar batida F3 (STYLE-BRAZIL B1), partido-alto (B2), Jovino's tamborim cells (B3), the cha-cha
// piano / guitar figures, bolero accompaniment, mambo figures beyond ponchando, songo's left-hand cells, 6/8 comping
// (STYLE-AFROCUBAN §2.3, §3.2, §3.3). All tempos are [?] in both files (B6): the ladders below use the research's
// proposed tiers. Every item: all 12 keys, free time first (rubato.ts), then the tempo ladder with count-in and click;
// the "with the band" levels are groove drills (the drums under the take), timed from the start like every band drill.
// Swing is 0 throughout (STYLE-BRAZIL §0.2 [V]). Pure and deterministic.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { all12 } from './keys12';
import type { ChartChordEv } from '../charts';
import { closeVoicings, rootless, voiceLead } from '../band';
import type { StyleId } from '../styles';
import type { Tuning } from '../fretboard';
import { noteAt } from '../fretboard';
import { alt, finish as gFinish, lowFret, place, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type GuitarStyle } from './guitar';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Left-to-right isolates for chord names and numerals inside Hebrew text. */
const ltr = (s: string): string => `⁦${s}⁩`;

// ───────────────────────────── chords and progressions ─────────────────────────────

type CQ = 'maj7' | 'm7' | '7' | '6' | 'M' | 'm' | 'm7b5' | '7b9' | '7#11' | 'm6' | '13';
const SUF: Record<CQ, string> = { maj7: 'maj7', m7: 'm7', '7': '7', '6': '6', M: '', m: 'm', m7b5: 'm7♭5', '7b9': '7♭9', '7#11': '7♯11', m6: 'm6', '13': '13' };
const IVS: Record<CQ, number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], '6': [0, 4, 7, 9], M: [0, 4, 7], m: [0, 3, 7], m7b5: [0, 3, 6, 10], '7b9': [0, 4, 7, 10, 13], '7#11': [0, 4, 7, 10, 18], m6: [0, 3, 7, 9], '13': [0, 4, 7, 10, 14, 21] };
/** A chord of a progression: semitones above the key, quality, length in beats. */
type PC = [number, CQ, number];
interface Prog {
  name: string;
  chords: PC[];
  /** Minor key (i is minor): the key signature is the relative major's. */
  minor?: boolean;
}

/**
 * Progressions (generic, not from any tune): STYLE-BRAZIL §5 (BN1 [C], BN2 / BN4 / BN6 / BN7 [V] LJS, BN5 [C]; SA1, SA2
 * [C]) and STYLE-AFROCUBAN §2.2 / §6.3 (the montuno vamps I–IV–V–IV and i–iv–V7–iv [C], ii–V and ii–V–I as a montuno
 * [C], the songo / timba vamp i–♭VII–♭VI–V7 [C], the songo loop i–♭VII–♭VI [V]).
 */
const BOSSA: Prog[] = [
  { name: 'ii–V–I', chords: [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4], [0, '6', 4]] },
  { name: 'ii–♭II7–I', chords: [[2, 'm7', 4], [1, '7#11', 4], [0, 'maj7', 4], [0, 'maj7', 4]] },
  { name: 'I–VI7–ii–V7', chords: [[0, 'maj7', 4], [9, '7b9', 4], [2, 'm7', 4], [7, '7b9', 4]] },
  { name: 'iii–♭III7–ii–♭II7–I', chords: [[4, 'm7', 2], [3, '7', 2], [2, 'm7', 2], [1, '7#11', 2], [0, 'maj7', 4], [0, 'maj7', 4]] },
  { name: 'iv–♭VII7–I', chords: [[5, 'm7', 4], [10, '7', 4], [0, 'maj7', 4], [0, 'maj7', 4]] },
  { name: 'I–♭VImaj7', chords: [[0, 'maj7', 4], [8, 'maj7', 4], [0, 'maj7', 4], [8, 'maj7', 4]] },
];
/** One chord (the first batida rungs: STYLE-BRAZIL §6 T0–T1, grips maj7 and m7 with the root on string 6). */
const ONE: Prog[] = [
  { name: 'Imaj7', chords: [[0, 'maj7', 4]] },
  { name: 'Im7', chords: [[0, 'm7', 4]] },
];
const SAMBA: Prog[] = [
  { name: 'I–VI7–ii–V7', chords: [[0, 'maj7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]] },
  { name: 'I–I7–IV–iv', chords: [[0, 'maj7', 2], [0, '7', 2], [5, 'maj7', 2], [5, 'm6', 2], [0, 'maj7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]] },
];
const MONTUNO: Prog[] = [
  { name: 'I', chords: [[0, 'M', 8]] },
  { name: 'i', chords: [[0, 'm', 8]], minor: true },
  { name: 'I–IV–V–IV', chords: [[0, 'M', 2], [5, 'M', 2], [7, 'M', 2], [5, 'M', 2]] },
  { name: 'i–iv–V7–iv', chords: [[0, 'm', 2], [5, 'm', 2], [7, '7', 2], [5, 'm', 2]], minor: true },
  { name: 'ii–V', chords: [[2, 'm7', 2], [7, '7', 2], [2, 'm7', 2], [7, '7', 2]] },
  { name: 'ii–V–I', chords: [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4], [0, 'maj7', 4]] },
  { name: 'i–♭VII–♭VI–V7', chords: [[0, 'm', 4], [10, 'M', 4], [8, 'M', 4], [7, '7', 4]], minor: true },
];

/** One chord of a drill: its pitch-class root, intervals, symbol and place (beats from the start). */
interface Seg extends ChartChordEv {
  start: number;
}
/** The progression repeated to `beats` beats, in a key. */
function segsOf(key: number, prog: Prog, beats: number, meter: number): Seg[] {
  const out: Seg[] = [];
  let at = 0;
  for (let i = 0; at < beats - 1e-9; i++) {
    const [r, q, len] = prog.chords[i % prog.chords.length];
    const root = mod(key + r, 12);
    out.push({ root, iv: IVS[q], bass: root, sym: NAMES[root] + SUF[q], beats: len, bar: Math.floor(at / meter), at: at % meter, start: at });
    at += len;
  }
  return out;
}
const segAt = (segs: Seg[], beat: number): Seg => [...segs].reverse().find((s) => s.start <= beat + 1e-6) ?? segs[0];
/** Chord names per bar (a chord that starts in the bar). */
const chartOf = (segs: Seg[], bars: number, meter: number): string[] =>
  Array.from({ length: bars }, (_, b) => segs.filter((s) => s.start >= b * meter - 1e-6 && s.start < (b + 1) * meter - 1e-6).map((s) => s.sym).join(' ') || '%');

/** A bass note in the left hand's register (E2–D♯3). */
const lhRoot = (pc: number): number => 40 + mod(pc - 40, 12);
const fifthOf = (c: ChartChordEv): number => (c.iv.includes(7) ? 7 : c.iv.includes(6) ? 6 : 7);
const lhFifth = (c: ChartChordEv): number => {
  const r = lhRoot(c.root);
  const f = r + fifthOf(c);
  return f > 52 ? f - 12 : f;
};

// ───────────────────────────── rhythm cells ─────────────────────────────

/** [beat, length] of the hits of one bar. */
type Cell = [number, number][];
/** STYLE-BRAZIL §1(a): F1 = 1, 2, the "and" of 3 [V]; F2 = the bossa-clave comp, 3-side bar then 2-side bar [C/V]; F4 = all upbeats [V]. */
const F1: Cell = [[0, 1], [1, 1.5], [2.5, 1.5]];
const F2: [Cell, Cell] = [[[0, 1.5], [1.5, 1.5], [3, 1]], [[1, 1.5], [2.5, 1.5]]];
const F4: Cell = [[0.5, 1], [1.5, 1], [2.5, 1], [3.5, 0.5]];
/** The same F1 and bossa-clave comp at samba speed: one 2/4 bar of 16ths (STYLE-BRAZIL §2.3 [V] Munro, Jovino). */
const SF1: Cell = [[0, 0.5], [0.5, 0.75], [1.25, 0.75]];
const SF2: [Cell, Cell] = [[[0, 0.75], [0.75, 0.75], [1.5, 0.5]], [[0.5, 0.75], [1.25, 0.75]]];

/**
 * Anticipated changes: where a chord starts, a hit on its beat moves `ant` earlier (or one is added there); hits
 * before it are shortened (STYLE-BRAZIL §1(a) F5 [V] Ward; §1(b) a 16th in samba [V] Jovino).
 */
function anticipate(hits: [number, number][], segs: Seg[], ant: number, from: number, to: number): [number, number][] {
  const out = hits.map((h) => [...h] as [number, number]);
  for (const s of segs) {
    if (s.start <= from + 1e-6 || s.start >= to - 1e-6) continue;
    const i = out.findIndex((h) => Math.abs(h[0] - s.start) < 1e-6);
    if (i >= 0) out[i][0] = s.start - ant;
    else if (!out.some((h) => Math.abs(h[0] - (s.start - ant)) < 1e-6)) out.push([s.start - ant, ant + 0.5]);
  }
  out.sort((a, b) => a[0] - b[0]);
  // no two hits on one beat; each hit stops at the next
  const ded = out.filter((h, i) => i === 0 || Math.abs(h[0] - out[i - 1][0]) > 1e-6);
  return ded.map((h, i) => [h[0], Math.min(h[1], (ded[i + 1]?.[0] ?? h[0] + h[1]) - h[0])] as [number, number]);
}

// ───────────────────────────── piano ─────────────────────────────

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, ps: number[], hand: 'R' | 'L', o: { accent?: boolean } = {}): void {
    const id = ps.length > 1 ? ++this.cid : undefined;
    for (const p of ps) this.list.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id !== undefined ? { chordId: id } : {}), ...(o.accent ? { accent: true } : {}) });
  }
}

/** Right-hand voicings, as candidate lists (voice-led by voiceLead). */
type VoicingKind = 'shell' | 'rootless' | 'color' | 'close';
/** Every octave placement of a set of intervals (bottom to top, above the root) with its lowest note in [lo, hi]. */
function placements(c: ChartChordEv, ivs: number[], lo: number, hi: number): number[][] {
  const out: number[][] = [];
  for (let base = lo; base <= hi; base++) {
    if (mod(base - c.root - ivs[0], 12) !== 0) continue;
    out.push(ivs.map((x) => base + x - ivs[0]));
  }
  return out;
}
/**
 * shell: 3 and 7 (6 on a 6th chord), either on top ([C] the shell); rootless: the 4-way close A / B forms (band.ts,
 * [C] Levine); color: 3–6–9 on a major chord (6/9), the stacks of 4ths from the chord-scale — m7 E A D G over D (9–5–1–11),
 * 7 F B E A over G (♭7–3–13–9) — STYLE-BRAZIL §1(b) [C] Levine, the table's own degrees; close: close triads / 7ths.
 */
function voicings(c: ChartChordEv, kind: VoicingKind): number[][] {
  const all = voicings0(c, kind);
  const high = all.filter((v) => Math.min(...v) >= 53);
  return high.length ? high : all.map((v) => v.map((m) => m + 12));
}
function voicings0(c: ChartChordEv, kind: VoicingKind): number[][] {
  const has = (x: number) => c.iv.some((y) => mod(y, 12) === x);
  const third = has(4) ? 4 : 3;
  const sev = has(10) ? 10 : has(11) ? 11 : 9;
  if (kind === 'shell') return [...placements(c, [third, sev], 52, 64), ...placements(c, [sev, third + 12], 52, 64)];
  if (kind === 'close') return closeVoicings(c);
  if (kind === 'color') {
    if (has(4) && !has(10)) return placements(c, [4, 9, 14], 52, 64);
    if (has(3) && has(10) && has(7)) return placements(c, [2, 7, 12, 17], 52, 64);
    if (has(4) && has(10) && has(7) && !c.iv.includes(13) && !c.iv.includes(18)) return placements(c, [10, 16, 21, 26], 50, 62);
  }
  return rootless(c);
}

const KEYS = all12([0, 7, 5]);
const titleOf = (en: string, he: string, prog: string, key: number, minor?: boolean): T2 => {
  const k = NAMES[mod(key, 12)] + (minor ? 'm' : '');
  return t(`${en} · ${prog} · ${k}`, `${he} · ${ltr(prog)} · ${k}`);
};

/** A note held past its bar line (an anticipated chord) is written short: it stops at the bar line (as k-pop's push). */
const toBarLine = (beat: number, dur: number, meter: number): number => r6(Math.min(dur, (Math.floor(beat / meter + 1e-9) + 1) * meter - beat));

function pianoDone(s: DrillSpec, n: Notes, title: T2, meter: number, goal: Partial<DrillGoal>, extra: Partial<Drill>): Drill {
  const notes = n.list.map((x) => ({ ...x, dur: toBarLine(x.beat, x.dur, meter) })).sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const hands = new Set(notes.map((x) => x.hand));
  // Hands-together is graded only where the hands meet often enough to measure it (the anticipated comp meets the bass
  // a few times a chorus: a timing spread from so few shared onsets would be noise).
  const lOn = new Set(notes.filter((x) => x.hand === 'L').map((x) => x.beat));
  const shared = new Set(notes.filter((x) => x.hand === 'R' && lOn.has(x.beat)).map((x) => x.beat)).size;
  return {
    spec: { ...s, hands: hands.size > 1 ? 'RL' : (notes[0]?.hand ?? 'R') === 'L' ? 'L' : 'R' },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter,
    keySig: SIG[mod(s.key + (s.minor ? 3 : 0), 12)],
    goal: { evenness: false, hands: hands.size > 1 && shared >= 12, ...goal },
    startBpm: s.tempo ?? 80,
    ...extra,
  };
}

/** The right hand over a list of hits: each takes the chord sounding `ant` later, voiced nearest the last. */
function rightHand(n: Notes, hits: [number, number][], segs: Seg[], kind: VoicingKind, ant: number): void {
  let prev: number[] | null = null;
  for (const [b, len] of hits) {
    const c = segAt(segs, b + ant);
    const v = voiceLead(voicings(c, kind), prev);
    prev = v;
    n.add(b, len, v, 'R');
  }
}

/**
 * Bossa left hand (STYLE-BRAZIL §1(b) [V] Jovino / PianoGroove): 'halves' root on 1, 5th on 3 (a second chord in the bar:
 * its root on 3); 'pickups' the surdo figure x..xx..x — root on 1, the 5th on the "and" of 2 (a light pickup), the 5th
 * on 3, the root (the next chord's when it changes, B2 [C]) on the "and" of 4 (B1 [V] Hubbard).
 */
function bossaLH(n: Notes, segs: Seg[], bars: number, kind: 'halves' | 'pickups'): void {
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * 4;
    const c1 = segAt(segs, b0);
    const c3 = segAt(segs, b0 + 2);
    const two = c3 !== c1;
    const third = two ? lhRoot(c3.root) : lhFifth(c1);
    if (kind === 'halves') {
      n.add(b0, 2, [lhRoot(c1.root)], 'L');
      n.add(b0 + 2, 2, [third], 'L');
    } else {
      const nx = segAt(segs, b0 + 4);
      n.add(b0, 1.5, [lhRoot(c1.root)], 'L', { accent: false });
      n.add(b0 + 1.5, 0.5, [lhFifth(c1)], 'L');
      n.add(b0 + 2, 1.5, [third], 'L', { accent: true });
      n.add(b0 + 3.5, 0.5, [lhRoot(bar === bars - 1 ? c3.root : nx.root)], 'L');
    }
  }
}

/** Samba left hand in 2/4 (STYLE-BRAZIL §2.1 [V]): root on 1, the accented 5th on 2; with the pickups x..xX..x (R . . 5 | 5 . . R, Hubbard). */
function sambaLH(n: Notes, segs: Seg[], bars: number, pickups: boolean): void {
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * 2;
    const c = segAt(segs, b0);
    const r = lhRoot(c.root);
    const f = lhFifth(c);
    if (!pickups) {
      n.add(b0, 1, [r], 'L');
      n.add(b0 + 1, 1, [f], 'L', { accent: true });
    } else {
      n.add(b0, 0.75, [r], 'L');
      n.add(b0 + 0.75, 0.25, [f], 'L');
      n.add(b0 + 1, 0.75, [f], 'L', { accent: true });
      n.add(b0 + 1.75, 0.25, [r], 'L');
    }
  }
}

/** Option = progression + 10 × variant (the clave direction, the pickups). */
const progOf = (list: Prog[], op: number): Prog => list[mod(op, 10) % list.length];
const variantOf = (op: number): number => Math.floor(op / 10);
const dirName = (d: number): string => (d ? '2-3' : '3-2');

function genBrazilPiano(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const samba = s.kind.startsWith('sb-');
  if (samba) {
    // 2/4 (STYLE-BRAZIL §0.1): 16 bars of the progression and the closing tonic bar.
    const prog = progOf(SAMBA, op);
    const bars = 16;
    const segs = segsOf(key, prog, bars * 2, 2);
    const n = new Notes();
    const v = variantOf(op);
    const chart = [...chartOf(segs, bars, 2), NAMES[key] + 'maj7'];
    const tonic: Seg = { ...segsOf(key, { name: '', chords: [[0, 'maj7', 2]] }, 2, 2)[0], start: bars * 2 };
    const end = (rh: boolean) => {
      n.add(bars * 2, 2, [lhRoot(key)], 'L');
      if (rh) n.add(bars * 2, 2, voiceLead(rootless(tonic), null), 'R');
    };
    switch (s.kind) {
      case 'sb-surdo': {
        sambaLH(n, segs, bars, v === 1);
        end(false);
        return pianoDone(s, n, titleOf(v ? 'Samba left hand: the surdo with its pickups' : 'Samba left hand: the surdo, the accent on 2', v ? 'יד שמאל בסמבה: הסורדו עם ההקדמות' : 'יד שמאל בסמבה: הסורדו, ההטעמה על 2', prog.name, key), 2, { evenness: v === 0 }, { chart });
      }
      case 'sb-f1':
      case 'sb-ant':
      case 'sb-band': {
        const ant = s.kind !== 'sb-f1';
        sambaLH(n, segs, bars, s.kind !== 'sb-f1');
        let hits: [number, number][] = [];
        for (let bar = 0; bar < bars; bar++) {
          // F1, or (from the anticipation level) the bossa-clave comp at 16ths every other pair of bars ("vary").
          const cell = ant && Math.floor(bar / 2) % 2 === 1 ? SF2[bar % 2] : SF1;
          for (const [b, len] of cell) hits.push([bar * 2 + b, len]);
        }
        if (ant) hits = anticipate(hits, segs, 0.25, 0, bars * 2);
        rightHand(n, hits, segs, 'rootless', ant ? 0.25 : 0);
        end(true);
        const band = s.kind === 'sb-band';
        const title = band
          ? titleOf('Samba with the drums: the surdo and the tamborim', 'סמבה עם התופים: הסורדו והטמבורים', prog.name, key)
          : ant
            ? titleOf('Samba: chords a 16th before the beat', 'סמבה: האקורדים שש-עשרית לפני הפעמה', prog.name, key)
            : titleOf('Samba: the surdo under the tamborim (F1 in 16ths)', 'סמבה: הסורדו מתחת לטמבורים (F1 בשש-עשריות)', prog.name, key);
        return pianoDone(s, n, title, 2, {}, { chart, ...(band ? { drums: { groove: 'samba' } } : {}) });
      }
    }
    throw new Error(`Unknown k-brazil kind ${s.kind}`);
  }
  // Bossa: 8 bars of the progression and the closing tonic bar, in 4/4 cut time (8ths).
  const prog = progOf(BOSSA, op);
  const bars = 8;
  const segs = segsOf(key, prog, bars * 4, 4);
  const v = variantOf(op);
  const n = new Notes();
  const chart = [...chartOf(segs, bars, 4), NAMES[key] + '6'];
  const tonic: Seg = { ...segsOf(key, { name: '', chords: [[0, '6', 4]] }, 4, 4)[0], start: bars * 4 };
  const close = (kind: VoicingKind) => {
    n.add(bars * 4, 4, [lhRoot(key)], 'L');
    if (kind) n.add(bars * 4, 4, voiceLead(voicings(tonic, kind === 'shell' ? 'shell' : kind), null), 'R');
  };
  const cells = (pick: (bar: number) => Cell): [number, number][] => {
    const out: [number, number][] = [];
    for (let bar = 0; bar < bars; bar++) for (const [b, len] of pick(bar)) out.push([bar * 4 + b, len]);
    return out;
  };
  /** F2 in a clave direction: the 3-side bar first (3-2) or second (2-3). */
  const f2 = (dir: number) => (bar: number) => F2[(bar + dir) % 2];
  switch (s.kind) {
    case 'bz-lh': {
      bossaLH(n, segs, bars, 'halves');
      n.add(bars * 4, 4, [lhRoot(key)], 'L');
      return pianoDone(s, n, titleOf('Bossa left hand: root on 1, 5th on 3', 'יד שמאל בבוסה: שורש על 1, קווינטה על 3', prog.name, key), 4, { evenness: true }, { chart });
    }
    case 'bz-f1': {
      bossaLH(n, segs, bars, 'halves');
      rightHand(n, cells(() => F1), segs, 'shell', 0);
      close('shell');
      return pianoDone(s, n, titleOf('Bossa comping: shells on 1, 2 and the "and" of 3', 'ליווי בוסה: שלדים על 1, 2 וה"וְ" של 3', prog.name, key), 4, {}, { chart });
    }
    case 'bz-f2': {
      bossaLH(n, segs, bars, 'halves');
      rightHand(n, cells(f2(v)), segs, 'rootless', 0);
      close('rootless');
      return pianoDone(s, n, titleOf(`The bossa-clave comp ${dirName(v)}, rootless voicings`, `ליווי קלאבת הבוסה ${ltr(dirName(v))}, ווייסינגים בלי שורש`, prog.name, key), 4, {}, { chart });
    }
    case 'bz-pick': {
      bossaLH(n, segs, bars, 'pickups');
      rightHand(n, cells(() => F1), segs, 'rootless', 0);
      close('rootless');
      return pianoDone(s, n, titleOf('The surdo pickups in the left hand', 'ההקדמות של הסורדו ביד שמאל', prog.name, key), 4, {}, { chart });
    }
    case 'bz-ant': {
      bossaLH(n, segs, bars, 'halves');
      rightHand(n, anticipate(cells(v ? () => F1 : f2(0)), segs, 0.5, 0, bars * 4), segs, 'rootless', 0.5);
      close('rootless');
      return pianoDone(s, n, titleOf('Anticipate the changes: the new chord on the "and" before', 'להקדים את החילופים: האקורד החדש על ה"וְ" שלפני', prog.name, key), 4, {}, { chart });
    }
    case 'bz-color': {
      bossaLH(n, segs, bars, 'halves');
      rightHand(n, cells(v ? f2(0) : () => F1), segs, 'color', 0);
      close('color');
      return pianoDone(s, n, titleOf('6/9 and 4ths voicings in the right hand', 'ווייסינגים של 6/9 וקוורטות ביד ימין', prog.name, key), 4, {}, { chart });
    }
    case 'bz-vary':
    case 'bz-band': {
      // The variation rung (STYLE-BRAZIL §0.5 [V] Faria & Korman): F2 / F1 / F4 rotating per two bars, the changes
      // anticipated; the left hand with its pickups. With the drums: F2 in the groove's clave direction.
      bossaLH(n, segs, bars, 'pickups');
      const ROT = [f2(v), () => F1, f2(v), () => F4];
      rightHand(n, anticipate(cells((bar) => ROT[Math.floor(bar / 2) % ROT.length](bar)), segs, 0.5, 0, bars * 4), segs, 'rootless', 0.5);
      close('rootless');
      const band = s.kind === 'bz-band';
      const title = band
        ? titleOf(`Bossa with the drums, clave ${dirName(v)}`, `בוסה עם התופים, קלאבה ${ltr(dirName(v))}`, prog.name, key)
        : titleOf('Vary the figures: F2, F1 and the upbeats', 'לגוון את הדמויות: F2, F1 וה"וְ"ים', prog.name, key);
      return pianoDone(s, n, title, 4, {}, { chart, ...(band ? { drums: { groove: v ? 'bossa-23' : 'bossa' } } : {}) });
    }
    case 'bz-pads': {
      // "With a guitar in the band": comp sparsely — pads (Faria & Korman [V]); one held chord a change.
      bossaLH(n, segs, bars, 'halves');
      rightHand(n, segs.filter((x) => x.start < bars * 4).map((x) => [x.start, x.beats - 0.05] as [number, number]), segs, 'rootless', 0);
      close('rootless');
      return pianoDone(s, n, titleOf('With a guitar in the band: sparse pads', 'עם גיטרה בלהקה: משטחים דלילים', prog.name, key), 4, {}, { chart });
    }
  }
  throw new Error(`Unknown k-brazil kind ${s.kind}`);
}

/**
 * The montuno's attack grid (STYLE-AFROCUBAN §2.1 [V]): two bars of 8ths, the three-side bar all on the offbeats, the
 * two-side bar on the beats; 2-3 starts on the onbeat bar, 3-2 on the offbeat bar.
 */
function montunoHits(bars: number, dir: number): number[] {
  const out: number[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const offbeat = (bar % 2 === 0) === (dir === 1);
    for (let k = 0; k < 4; k++) out.push(bar * 4 + k + (offbeat ? 0.5 : 0));
  }
  return out;
}

/**
 * The broken figure ([C] Mauleón: the line note in octaves, alternating with inner chord tones; the left hand doubles
 * the line): the line note is the chord tone nearest the last one (ties upward), starting on the first chord's 5th
 * around G4; the inner tones are the chord's 3rd and 7th (a 7th chord) or its other two triad tones, inside the octave.
 */
function lineNote(c: ChartChordEv, prev: number | null): number {
  const pcs = [...new Set(c.iv.map((x) => mod(c.root + x, 12)))].filter((p) => c.iv.length < 4 || p !== mod(c.root, 12));
  const near = prev ?? 67;
  if (prev === null) {
    const f = mod(c.root + fifthOf(c), 12);
    return 62 + mod(f - 62, 12);
  }
  let best = 0;
  for (let p = 60; p <= 77; p++) {
    if (!pcs.includes(mod(p, 12))) continue;
    const d = Math.abs(p - near);
    if (!best || d < Math.abs(best - near) || (d === Math.abs(best - near) && p > best)) best = p;
  }
  return best;
}
function innerTones(c: ChartChordEv, line: number): number[] {
  const has = (x: number) => c.iv.some((y) => mod(y, 12) === x);
  const seventh = c.iv.length >= 4;
  const third = has(4) ? 4 : 3;
  const sev = has(10) ? 10 : has(11) ? 11 : 9;
  const fifth = fifthOf(c);
  const want = seventh ? [third, sev, fifth, 0] : [0, third, fifth];
  const pcs = want.map((x) => mod(c.root + x, 12)).filter((p) => p !== mod(line, 12)).slice(0, 2);
  return pcs.map((p) => line - 12 + mod(p - (line - 12), 12)).filter((m) => m > line - 12 && m < line).sort((a, b) => a - b);
}

function genMontuno(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const prog = progOf(MONTUNO, op);
  const dir = variantOf(op) % 2;
  const bars = 8;
  const segs = segsOf(key, prog, bars * 4, 4);
  const n = new Notes();
  const chart = [...chartOf(segs, bars, 4), segs[0].sym];
  const final = { ...segs[0], start: bars * 4 };
  const ant = s.kind === 'mt-ant' || s.kind === 'mt-band';
  const lh = s.kind === 'mt-hands' || s.kind === 'mt-ant' || s.kind === 'mt-band';
  if (s.kind === 'mt-songo') {
    // Songo (§2.3 [V] Moore via Wikipedia): the right hand on the four beats over the looped minor vamp; the left-hand
    // cells are [?] and are not written.
    let prev: number[] | null = null;
    for (let b = 0; b < bars * 4; b++) {
      const v = voiceLead(voicings(segAt(segs, b), 'close'), prev);
      prev = v;
      n.add(b, 0.5, v, 'R', { accent: b % 4 === 0 });
    }
    n.add(bars * 4, 2, voiceLead(voicings(final, 'close'), prev), 'R');
    return pianoDone(s, n, titleOf('Songo: the right hand on the four beats', 'סונגו: יד ימין על ארבע הפעמות', prog.name, key, prog.minor), 4, { evenness: true }, { chart });
  }
  const hits = montunoHits(bars, dir);
  let prevV: number[] | null = null;
  let line: number | null = null;
  let lastSeg: Seg | null = null;
  let k = 0;
  for (const b of hits) {
    const offbeat = b % 1 !== 0;
    // Anticipated changes ([C] Mauleón): an offbeat attack an 8th before a new chord already plays it.
    const c = segAt(segs, b + (ant && offbeat ? 0.5 : 0));
    if (c !== lastSeg) {
      k = 0;
      lastSeg = c;
    }
    if (s.kind === 'mt-ponch') {
      // Ponchando (§2.1 [V]): block chords on the attack points.
      prevV = voiceLead(voicings(c, 'close'), prevV);
      n.add(b, 0.5, prevV, 'R');
    } else if (k % 2 === 0) {
      line = lineNote(c, line);
      n.add(b, 0.5, [line - 12, line], 'R');
      if (lh) n.add(b, 0.5, [line - 24], 'L');
    } else {
      n.add(b, 0.5, innerTones(c, line ?? lineNote(c, null)), 'R');
    }
    k++;
  }
  // the closing chord on the next 1
  if (s.kind === 'mt-ponch') n.add(bars * 4, 2, voiceLead(voicings(final, 'close'), prevV), 'R');
  else {
    const l = lineNote(final, line);
    n.add(bars * 4, 2, [l - 12, ...innerTones(final, l), l], 'R');
    if (lh) n.add(bars * 4, 2, [l - 24], 'L');
  }
  const d = dirName(dir);
  const T: Record<string, [string, string]> = {
    'mt-ponch': [`Ponchando: block chords on the montuno rhythm, clave ${d}`, `פונצ׳נדו: אקורדים חסומים במקצב המונטונו, קלאבה ${ltr(d)}`],
    'mt-broken': [`The montuno figure: octaves and inner tones, clave ${d}`, `דמות המונטונו: אוקטבות וצלילים פנימיים, קלאבה ${ltr(d)}`],
    'mt-hands': [`Montuno hands together: the left hand doubles the line, clave ${d}`, `מונטונו בשתי ידיים: יד שמאל מכפילה את הקו, קלאבה ${ltr(d)}`],
    'mt-ant': [`Montuno: anticipate the changes by an 8th, clave ${d}`, `מונטונו: להקדים את החילופים בשמינית, קלאבה ${ltr(d)}`],
    'mt-band': [`Montuno with the clave and the tumbao, clave ${d}`, `מונטונו עם הקלאבה והטומבאו, קלאבה ${ltr(d)}`],
  };
  const [en, he] = T[s.kind] ?? T['mt-broken'];
  const band = s.kind === 'mt-band';
  return pianoDone(s, n, titleOf(en, he, prog.name, key, prog.minor), 4, {}, { chart, ...(band ? { drums: { groove: dir ? 'clave-32' : 'clave-23' }, band: { style: 'mambo' as const, bass: true, comp: false as const } } : {}) });
}

/** Build a k-brazil or k-montuno item. */
export function genLatinPiano(s: DrillSpec): Drill {
  return s.family === 'k-montuno' ? genMontuno(s) : genBrazilPiano(s);
}

// ───────────────────────────── guitar ─────────────────────────────

/**
 * The bossa grips, bottom to top as intervals over the root (STYLE-BRAZIL §1(a) table, [C] Faria; Ward names maj9, 6/9,
 * 13, ♭9, m7 … as the bossa vocabulary [V]). Root on string 6 (strings 6-4-3-2) or 5 (5-4-3-2, 6/9 to string 1).
 */
const GRIP6: Partial<Record<CQ, number[]>> = { maj7: [0, 11, 4, 7], m7: [0, 10, 3, 7], '7': [0, 10, 4, 7], '13': [0, 10, 4, 9], m7b5: [0, 10, 3, 6], '7#11': [0, 10, 2, 6] };
const GRIP5: Partial<Record<CQ, number[]>> = { maj7: [0, 7, 11, 4], '6': [0, 4, 9, 2, 7], m7: [0, 3, 10, 2], m6: [0, 3, 9, 2], '7': [0, 4, 10, 2], '7b9': [0, 4, 10, 1] };
const qOf = (c: Seg): CQ => (Object.keys(IVS) as CQ[]).find((q) => NAMES[c.root] + SUF[q] === c.sym) ?? 'maj7';

/** A grip for the chord: the root string nearest the last position (or the one asked for), the root fret 2–14. */
function grip(tu: Tuning, c: Seg, near: number, only?: 5 | 6): { s: number; f: number }[] {
  const q = qOf(c);
  // a quality with no grip on the asked-for string takes the other (C6 = the 6/9 grip, root on 5)
  const avail = ([6, 5] as const).filter((rs) => (rs === 6 ? GRIP6 : GRIP5)[q]);
  const opts: (5 | 6)[] = only && avail.includes(only) ? [only] : [...avail];
  let best: { s: number; f: number }[] | null = null;
  let bestD = Infinity;
  for (const rs of opts) {
    const pcs = (rs === 6 ? GRIP6 : GRIP5)[q];
    if (!pcs) continue;
    const strings = rs === 6 ? [6, 4, 3, 2] : [5, 4, 3, 2, 1];
    for (const f0 of [lowFret(tu, c.root, rs), lowFret(tu, c.root, rs) + 12]) {
      if (f0 < 2 || f0 > 14) continue;
      const out: { s: number; f: number }[] = [{ s: rs, f: f0 }];
      let last = noteAt(tu, rs, f0);
      pcs.slice(1).forEach((iv, i) => {
        let p = last + 1;
        while (mod(p - c.root - iv, 12) !== 0) p++;
        out.push({ s: strings[i + 1], f: p - tu.open[strings[i + 1] - 1] });
        last = p;
      });
      if (out.some((x) => x.f < 0 || x.f > 17)) continue;
      const d = Math.abs(f0 - near);
      if (d < bestD) {
        bestD = d;
        best = out;
      }
    }
  }
  return best ?? grip(tu, { ...c, sym: NAMES[c.root] + 'maj7' }, near, 6);
}

/** A guitar progression of the batida levels by option: BOSSA / SAMBA. */
const FINGER_STROKES: NonNullable<GN['stroke']>[] = ['i', 'm', 'a', 'c'];

function genBrazilGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const v = variantOf(op);
  const samba = s.kind.startsWith('gs-');
  const meter = samba ? 2 : 4;
  // One grip first (T0–T1: thumb alone, then thumb and fingers on one chord), then the progressions.
  const oneChord = s.kind === 'gb-one' || (s.kind === 'gb-thumb' && v === 0);
  const prog = samba ? progOf(SAMBA, op) : oneChord ? progOf(ONE, op) : progOf(BOSSA, op);
  const bars = samba ? 16 : 8;
  const segs = segsOf(key, prog, bars * meter, meter);
  const evs: Ev[] = [];
  const only: 6 | undefined = s.kind === 'gb-thumb' || s.kind === 'gb-one' ? 6 : undefined;
  // the grip of each chord, voice-led by position
  const grips = new Map<Seg, { s: number; f: number }[]>();
  let near = 6;
  for (const c of segs) {
    const g = grip(tu, c, near, only);
    grips.set(c, g);
    near = g[0].f;
  }
  const tonicSeg: Seg = { ...segsOf(key, { name: '', chords: [[0, samba ? 'maj7' : '6', meter]] }, meter, meter)[0], start: bars * meter };
  const tonic = grip(tu, tonicSeg, near, samba ? undefined : 5);
  const thumbOf = (g: { s: number; f: number }[], fifth: boolean): GN => {
    if (!fifth) return { ...g[0], stroke: 'p' };
    const r = noteAt(tu, g[0].s, g[0].f);
    // the 5th: on the next string up from a 6th-string root (Ward Ex. 4 [V]); below on string 6 from a 5th-string root
    const p = g[0].s === 6 ? place(tu, r + 7, [5], 0, 17) : place(tu, r - 5, [6], 0, 17);
    return { ...(p ?? g[0]), stroke: 'p' };
  };
  // Thumb: 'one' (root on 1 and 3), 'alt' (root, then 5th), 'pick' (the surdo pickups); samba: one repeated note.
  const thumb = s.kind === 'gb-thumb' && v === 0 ? 'one' : s.kind === 'gb-pick' || s.kind === 'gb-vary' || s.kind === 'gb-band' ? 'pick' : samba ? 'one' : s.kind === 'gb-one' ? 'one' : 'alt';
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * meter;
    if (samba) {
      const g = grips.get(segAt(segs, b0))!;
      evs.push({ beat: b0, dur: 1, notes: [thumbOf(g, false)] }, { beat: b0 + 1, dur: 1, notes: [{ ...thumbOf(g, false), acc: true }] });
      continue;
    }
    const c1 = segAt(segs, b0);
    const c3 = segAt(segs, b0 + 2);
    const g1 = grips.get(c1)!;
    const g3 = grips.get(c3)!;
    if (thumb === 'pick') {
      const nx = grips.get(segAt(segs, b0 + 4)) ?? g1;
      evs.push({ beat: b0, dur: 1.5, notes: [thumbOf(g1, false)] });
      evs.push({ beat: b0 + 1.5, dur: 0.5, notes: [thumbOf(g1, true)] });
      evs.push({ beat: b0 + 2, dur: 1.5, notes: [c3 !== c1 ? thumbOf(g3, false) : thumbOf(g1, true)] });
      evs.push({ beat: b0 + 3.5, dur: 0.5, notes: [thumbOf(bar === bars - 1 ? g3 : nx, false)] });
    } else {
      evs.push({ beat: b0, dur: 2, notes: [thumbOf(g1, false)] });
      evs.push({ beat: b0 + 2, dur: 2, notes: [c3 !== c1 ? thumbOf(g3, false) : thumbOf(g1, thumb === 'alt')] });
    }
  }
  // Fingers (the tamborim layer): none on the thumb levels; F1, F2 (clave direction), F4; the variation rung rotates.
  let hits: [number, number][] = [];
  const antOn = s.kind === 'gb-ant' || s.kind === 'gb-vary' || s.kind === 'gb-band' || s.kind === 'gs-ant' || s.kind === 'gs-band';
  if (s.kind !== 'gb-thumb') {
    for (let bar = 0; bar < bars; bar++) {
      let cell: Cell;
      if (samba) cell = antOn && Math.floor(bar / 2) % 2 === 1 ? SF2[bar % 2] : SF1;
      else if (s.kind === 'gb-clave') cell = F2[(bar + v) % 2];
      else if (s.kind === 'gb-ant') cell = Math.floor(bar / 2) % 2 === 1 ? F4 : F2[bar % 2];
      else if (s.kind === 'gb-vary' || s.kind === 'gb-band') cell = [F2[(bar + v) % 2], F1, F2[(bar + v) % 2], F4][Math.floor(bar / 2) % 4];
      else cell = F1;
      for (const [b, len] of cell) hits.push([bar * meter + b, len]);
    }
    const ant = samba ? 0.25 : 0.5;
    if (antOn) hits = anticipate(hits, segs, ant, 0, bars * meter);
    for (const [b, len] of hits) {
      const g = grips.get(segAt(segs, b + (antOn ? ant : 0)))!;
      evs.push({ beat: b, dur: len, notes: g.slice(1).map((x, i) => ({ ...x, stroke: FINGER_STROKES[i] })) });
    }
  }
  evs.push({ beat: bars * meter, dur: meter, notes: [{ ...tonic[0], stroke: 'p' }, ...tonic.slice(1).map((x, i) => ({ ...x, stroke: FINGER_STROKES[i] }))] });
  const chart = [...chartOf(segs, bars, meter), tonicSeg.sym];
  const T: Record<string, [string, string]> = {
    'gb-thumb': v ? ['The bossa thumb: root and 5th on 1 and 3', 'האגודל בבוסה: שורש וקווינטה על 1 ו-3'] : ['The bossa thumb alone: the bass on 1 and 3', 'האגודל לבד בבוסה: הבס על 1 ו-3'],
    'gb-one': ['The batida: thumb and fingers on one grip', 'הבטידה: אגודל ואצבעות על תפיסה אחת'],
    'gb-f1': ['The batida: thumb on 1 and 3, fingers on 1, 2 and the "and" of 3', 'הבטידה: אגודל על 1 ו-3, אצבעות על 1, 2 וה"וְ" של 3'],
    'gb-clave': [`The bossa-clave comp ${dirName(v)} over the thumb`, `ליווי קלאבת הבוסה ${ltr(dirName(v))} מעל האגודל`],
    'gb-ant': ['Anticipate the changes; the upbeats as a variation', 'להקדים את החילופים; ה"וְ"ים כגיוון'],
    'gb-pick': ['The surdo pickups in the thumb', 'ההקדמות של הסורדו באגודל'],
    'gb-vary': ['Vary the figures over the surdo thumb', 'לגוון את הדמויות מעל אגודל הסורדו'],
    'gb-band': [`Bossa with the drums, clave ${dirName(v)}`, `בוסה עם התופים, קלאבה ${ltr(dirName(v))}`],
    'gs-f1': ['Samba: the thumb on one note, the fingers in 16ths', 'סמבה: האגודל על צליל אחד, האצבעות בשש-עשריות'],
    'gs-ant': ['Samba: the chords a 16th before the beat', 'סמבה: האקורדים שש-עשרית לפני הפעמה'],
    'gs-band': ['Samba with the drums', 'סמבה עם התופים'],
  };
  const [en, he] = T[s.kind] ?? T['gb-f1'];
  for (const e of evs) e.dur = toBarLine(e.beat, e.dur, meter);
  const d = gFinish(s, tu, evs, { title: titleOf(en, he, prog.name, key), bpm: samba ? 60 : 80, evenness: s.kind === 'gb-thumb', meter, keySig: SIG[key] });
  const drums = s.kind === 'gb-band' ? { groove: v ? 'bossa-23' : 'bossa' } : s.kind === 'gs-band' ? { groove: 'samba' } : undefined;
  return { ...d, chart, ...(drums ? { drums } : {}) };
}

/**
 * The guajeo on guitar (STYLE-AFROCUBAN §3.1): the generic son guajeo is "arpeggiated triads" on the onbeat/offbeat
 * motif [V]; on guitar the motif in single notes on strings 3-2-1 over close triad shapes [C] — the same grid as the piano
 * montuno. The triad: the chord's root triad (a 7th chord: its 3–5–7, the rootless upper triad), placed near the last
 * shape (from about the 7th fret); each attack walks it low–middle–high–middle.
 */
function triadShape(tu: Tuning, c: ChartChordEv, near: number): { s: number; f: number }[] {
  const has = (x: number) => c.iv.some((y) => mod(y, 12) === x);
  const seventh = c.iv.length >= 4 && (has(10) || has(11));
  const third = has(4) ? 4 : 3;
  const ivs = seventh ? [third, fifthOf(c), has(10) ? 10 : 11] : [0, third, fifthOf(c)];
  const pcs = ivs.map((x) => mod(c.root + x, 12));
  let best: { s: number; f: number }[] = [];
  let bestD = Infinity;
  for (const order of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
    for (let f3 = 0; f3 <= 15; f3++) {
      const p3 = noteAt(tu, 3, f3);
      if (mod(p3, 12) !== pcs[order[0]]) continue;
      let p2 = p3 + 1;
      while (mod(p2, 12) !== pcs[order[1]]) p2++;
      let p1 = p2 + 1;
      while (mod(p1, 12) !== pcs[order[2]]) p1++;
      const shape = [{ s: 3, f: f3 }, { s: 2, f: p2 - tu.open[1] }, { s: 1, f: p1 - tu.open[0] }];
      const fr = shape.map((x) => x.f);
      if (Math.min(...fr) < 1 || Math.max(...fr) > 17 || Math.max(...fr) - Math.min(...fr) > 4) continue;
      const d = Math.abs(fr.reduce((a, b) => a + b, 0) / 3 - near);
      if (d < bestD) {
        bestD = d;
        best = shape;
      }
    }
  }
  return best;
}

function genGuajeo(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const prog = progOf(MONTUNO, op);
  const dir = variantOf(op) % 2;
  const bars = 8;
  const segs = segsOf(key, prog, bars * 4, 4);
  const ant = s.kind === 'gg-ant' || s.kind === 'gg-band';
  const evs: Ev[] = [];
  let near = 7.5;
  let last: ChartChordEv | null = null;
  let shape: { s: number; f: number }[] = [];
  let k = 0;
  for (const b of montunoHits(bars, dir)) {
    const offbeat = b % 1 !== 0;
    const c = segAt(segs, b + (ant && offbeat ? 0.5 : 0));
    if (c !== last) {
      shape = triadShape(tu, c, near);
      near = shape.reduce((a, x) => a + x.f, 0) / 3;
      last = c;
      k = 0;
    }
    evs.push({ beat: b, dur: 0.5, notes: [{ ...shape[[0, 1, 2, 1][k % 4]] }] });
    k++;
  }
  const end = triadShape(tu, segs[0], near);
  const gns = alt(evs.map((e) => e.notes[0]));
  evs.forEach((e, i) => (e.notes = [gns[i]]));
  evs.push({ beat: bars * 4, dur: 2, notes: end.map((x) => ({ ...x, stroke: 'D' as const })) });
  const d0 = dirName(dir);
  const T: Record<string, [string, string]> = {
    'gg-one': [`The guajeo on one triad, clave ${d0}`, `הגואחאו על משולש אחד, קלאבה ${ltr(d0)}`],
    'gg-prog': [`The guajeo over the changes, clave ${d0}`, `הגואחאו על המהלך, קלאבה ${ltr(d0)}`],
    'gg-ant': [`The guajeo: anticipate the changes by an 8th, clave ${d0}`, `הגואחאו: להקדים את החילופים בשמינית, קלאבה ${ltr(d0)}`],
    'gg-band': [`The guajeo with the clave and the tumbao, clave ${d0}`, `הגואחאו עם הקלאבה והטומבאו, קלאבה ${ltr(d0)}`],
  };
  const [en, he] = T[s.kind] ?? T['gg-prog'];
  for (const e of evs) e.dur = toBarLine(e.beat, e.dur, 4);
  const d = gFinish(s, tu, evs, { title: titleOf(en, he, prog.name, key, prog.minor), bpm: 80, evenness: true, meter: 4, keySig: SIG[mod(key + (prog.minor ? 3 : 0), 12)] });
  const chart = [...chartOf(segs, bars, 4), segs[0].sym];
  return { ...d, chart, ...(s.kind === 'gg-band' ? { drums: { groove: dir ? 'clave-32' : 'clave-23' }, band: { style: 'mambo' as const, bass: true, comp: false as const } } : {}) };
}

/** The guitar entry (guitar.ts): g-brazil and g-guajeo. */
export function genLatinGuitar(s: DrillSpec, tu: Tuning): Drill {
  return s.family === 'g-guajeo' ? genGuajeo(s, tu) : genBrazilGuitar(s, tu);
}

// ───────────────────────────── the families ─────────────────────────────

/** The style each new family belongs to (SPEC-STYLE-FOCUS). */
export const LATIN_FAMILY_STYLE: Record<string, StyleId> = { 'k-brazil': 'brazil', 'g-brazil': 'brazil', 'k-montuno': 'afrocuban', 'g-guajeo': 'afrocuban' };

/** Option of an item: progression index + 10 × variant. */
const o = (prog: number, variant = 0): number => prog + 10 * variant;

export function keysBrazilFamily(): FamilyDef {
  const fam: FamilyId = 'k-brazil';
  const sp = (kind: string, option: number, hands: SpecTemplate['hands'] = 'RL'): SpecTemplate => ({ family: fam, kind, hands, option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'brazil' });
  return {
    id: fam,
    title: t('Bossa and samba comping', 'ליווי בוסה וסמבה'),
    style: 'both',
    styleId: 'brazil',
    levels: [
      L(1, 'Bossa left hand: root on 1, 5th on 3', 'יד שמאל בבוסה: שורש על 1, קווינטה על 3', [sp('bz-lh', o(0), 'L'), sp('bz-lh', o(2), 'L')], [70, 90]),
      L(2, 'Bossa comping: the basic figure with shells', 'ליווי בוסה: הדמות הבסיסית עם שלדים', [sp('bz-f1', o(0)), sp('bz-f1', o(2))], [80, 100]),
      L(3, 'The bossa-clave comp 3-2, rootless voicings', 'ליווי קלאבת הבוסה 3-2, ווייסינגים בלי שורש', [sp('bz-f2', o(0)), sp('bz-f2', o(1))], [90, 120]),
      L(4, 'The bossa-clave comp 2-3', 'ליווי קלאבת הבוסה 2-3', [sp('bz-f2', o(2, 1)), sp('bz-f2', o(0, 1))], [90, 120]),
      L(5, 'The surdo pickups in the left hand', 'ההקדמות של הסורדו ביד שמאל', [sp('bz-pick', o(0)), sp('bz-pick', o(2))], [90, 120]),
      L(6, 'Anticipated changes', 'חילופים מוקדמים', [sp('bz-ant', o(3)), sp('bz-ant', o(4, 1)), sp('bz-ant', o(2))], [100, 130]),
      L(7, '6/9 and 4ths voicings', 'ווייסינגים של 6/9 וקוורטות', [sp('bz-color', o(0)), sp('bz-color', o(5, 1))], [100, 130]),
      L(8, 'Vary the figures', 'לגוון את הדמויות', [sp('bz-vary', o(1)), sp('bz-vary', o(4, 1))], [110, 150]),
      L(9, 'With a guitar in the band: sparse pads', 'עם גיטרה בלהקה: משטחים דלילים', [sp('bz-pads', o(1)), sp('bz-pads', o(5))], [110, 150]),
      L(10, 'Samba left hand: the surdo', 'יד שמאל בסמבה: הסורדו', [sp('sb-surdo', o(0), 'L'), sp('sb-surdo', o(0, 1), 'L')], [60, 80]),
      L(11, 'Samba: the surdo under the tamborim', 'סמבה: הסורדו מתחת לטמבורים', [sp('sb-f1', o(0)), sp('sb-f1', o(1))], [60, 80]),
      L(12, 'Samba: chords a 16th before the beat', 'סמבה: אקורדים שש-עשרית לפני הפעמה', [sp('sb-ant', o(0)), sp('sb-ant', o(1))], [70, 100]),
      L(13, 'Bossa with the drums', 'בוסה עם התופים', [sp('bz-band', o(0)), sp('bz-band', o(3, 1))], [110, 150]),
      L(14, 'Samba with the drums', 'סמבה עם התופים', [sp('sb-band', o(0)), sp('sb-band', o(1))], [80, 100]),
    ],
  };
}

export function keysMontunoFamily(): FamilyDef {
  const fam: FamilyId = 'k-montuno';
  const sp = (kind: string, option: number, hands: SpecTemplate['hands'] = 'R'): SpecTemplate => ({ family: fam, kind, hands, option, ...(MONTUNO[mod(option, 10)].minor ? { minor: true } : {}) });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'afrocuban' });
  return {
    id: fam,
    title: t('Montuno', 'מונטונו'),
    style: 'both',
    styleId: 'afrocuban',
    levels: [
      L(1, 'Ponchando on one chord, clave 2-3', 'פונצ׳נדו על אקורד אחד, קלאבה 2-3', [sp('mt-ponch', o(0)), sp('mt-ponch', o(1))], [70, 90]),
      L(2, 'Ponchando on one chord, clave 3-2', 'פונצ׳נדו על אקורד אחד, קלאבה 3-2', [sp('mt-ponch', o(0, 1)), sp('mt-ponch', o(1, 1))], [70, 90]),
      L(3, 'The montuno figure on one chord', 'דמות המונטונו על אקורד אחד', [sp('mt-broken', o(0)), sp('mt-broken', o(1, 1))], [80, 100]),
      L(4, 'I–IV–V–IV, clave 2-3', 'I–IV–V–IV, קלאבה 2-3', [sp('mt-broken', o(2))], [80, 100]),
      L(5, 'I–IV–V–IV, clave 3-2', 'I–IV–V–IV, קלאבה 3-2', [sp('mt-broken', o(2, 1))], [80, 100]),
      L(6, 'Hands together: the left hand doubles the line', 'שתי ידיים: יד שמאל מכפילה את הקו', [sp('mt-hands', o(2), 'RL'), sp('mt-hands', o(3, 1), 'RL')], [90, 120]),
      L(7, 'Anticipated changes', 'חילופים מוקדמים', [sp('mt-ant', o(2), 'RL'), sp('mt-ant', o(3), 'RL')], [100, 130]),
      L(8, 'ii–V as a montuno', 'ii–V כמונטונו', [sp('mt-hands', o(4), 'RL'), sp('mt-hands', o(4, 1), 'RL')], [100, 130]),
      L(9, 'ii–V–I over four bars', 'ii–V–I על ארבע תיבות', [sp('mt-ant', o(5), 'RL'), sp('mt-ant', o(5, 1), 'RL')], [110, 150]),
      L(10, 'Songo: the right hand on the beats', 'סונגו: יד ימין על הפעמות', [sp('mt-songo', o(6))], [100, 130]),
      L(11, 'Montuno with the clave and the tumbao', 'מונטונו עם הקלאבה והטומבאו', [sp('mt-band', o(2), 'RL'), sp('mt-band', o(5, 1), 'RL'), sp('mt-band', o(3), 'RL')], [110, 150]),
      // SPEC-STYLE-FOCUS §9 (the core's neighbour-style moment): the ii–V–I in ponchando — block chords on the montuno
      // rhythm (§2.1 [V]), close voicings led by voice leading; no line notes (the montuno line levels stay hidden).
      L(12, 'Ponchando over ii–V–I', 'פונצ׳נדו על ii–V–I', [sp('mt-ponch', o(5)), sp('mt-ponch', o(5, 1))], [80, 110]),
    ],
  };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;

export function guitarBrazilFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const sp = (kind: string, option: number): SpecTemplate => ({ family: 'g-brazil', kind, hands: 'R', instrument: 'guitar', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string, grade: number): GuitarLevelDef => ({ ...LT('g-brazil', level, en, he, specs, KEYS, tempo, sub, grade), style: 'brazil' });
  return {
    ...fam('g-brazil', 'Bossa and samba guitar', 'גיטרת בוסה וסמבה', 'jazz', ['latin', 'jazz'], [
      L(1, 'The bossa thumb alone: the bass on 1 and 3', 'האגודל לבד בבוסה: הבס על 1 ו-3', [sp('gb-thumb', o(0))], [70, 90], 'half notes', 2),
      L(2, 'The thumb: root and 5th', 'האגודל: שורש וקווינטה', [sp('gb-thumb', o(0, 1)), sp('gb-thumb', o(2, 1))], [70, 90], 'half notes', 2),
      L(3, 'The batida on one grip', 'הבטידה על תפיסה אחת', [sp('gb-one', o(0)), sp('gb-one', o(1))], [70, 90], '8ths', 3),
      L(4, 'The batida over ii–V–I', 'הבטידה על ii–V–I', [sp('gb-f1', o(0)), sp('gb-f1', o(2))], [80, 100], '8ths', 3),
      L(5, 'The bossa-clave comp, 3-2 and 2-3', 'ליווי קלאבת הבוסה, 3-2 ו-2-3', [sp('gb-clave', o(0)), sp('gb-clave', o(1, 1))], [80, 110], '8ths', 4),
      L(6, 'Anticipated changes and the upbeats', 'חילופים מוקדמים וה"וְ"ים', [sp('gb-ant', o(1)), sp('gb-ant', o(3))], [90, 130], '8ths', 4),
      L(7, 'The surdo pickups in the thumb', 'ההקדמות של הסורדו באגודל', [sp('gb-pick', o(2)), sp('gb-pick', o(4))], [90, 130], '8ths', 5),
      L(8, 'Vary the figures', 'לגוון את הדמויות', [sp('gb-vary', o(1)), sp('gb-vary', o(3, 1))], [100, 140], '8ths', 5),
      L(9, 'Samba: thumb on one note, fingers in 16ths', 'סמבה: אגודל על צליל אחד, אצבעות בשש-עשריות', [sp('gs-f1', o(0)), sp('gs-f1', o(1))], [60, 80], '16ths (2/4)', 5),
      L(10, 'Samba: chords a 16th before the beat', 'סמבה: אקורדים שש-עשרית לפני הפעמה', [sp('gs-ant', o(0)), sp('gs-ant', o(1))], [70, 100], '16ths (2/4)', 6),
      L(11, 'Bossa and samba with the drums', 'בוסה וסמבה עם התופים', [sp('gb-band', o(0)), sp('gb-band', o(3, 1)), sp('gs-band', o(0))], [100, 140], '8ths / 16ths', 6),
    ]),
    style: 'both',
    styleId: 'brazil',
  };
}

export function guitarGuajeoFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const sp = (kind: string, option: number): SpecTemplate => ({ family: 'g-guajeo', kind, hands: 'R', instrument: 'guitar', option, ...(MONTUNO[mod(option, 10)].minor ? { minor: true } : {}) });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], grade: number): GuitarLevelDef => ({ ...LT('g-guajeo', level, en, he, specs, KEYS, tempo, '8ths', grade), style: 'afrocuban' });
  return {
    ...fam('g-guajeo', 'Guajeo on guitar', 'גואחאו בגיטרה', 'jazz', ['latin', 'jazz'], [
      L(1, 'The guajeo on one triad, clave 2-3', 'הגואחאו על משולש אחד, קלאבה 2-3', [sp('gg-one', o(0)), sp('gg-one', o(1))], [80, 100], 3),
      L(2, 'The guajeo on one triad, clave 3-2', 'הגואחאו על משולש אחד, קלאבה 3-2', [sp('gg-one', o(0, 1)), sp('gg-one', o(1, 1))], [80, 100], 3),
      L(3, 'I–IV–V–IV, clave 2-3', 'I–IV–V–IV, קלאבה 2-3', [sp('gg-prog', o(2))], [90, 120], 4),
      L(4, 'I–IV–V–IV, clave 3-2', 'I–IV–V–IV, קלאבה 3-2', [sp('gg-prog', o(2, 1))], [90, 120], 4),
      L(5, 'Minor: i–iv–V7–iv', 'מינור: i–iv–V7–iv', [sp('gg-prog', o(3)), sp('gg-prog', o(3, 1))], [90, 120], 5),
      L(6, 'ii–V as a guajeo', 'ii–V כגואחאו', [sp('gg-prog', o(4)), sp('gg-prog', o(4, 1))], [100, 130], 5),
      L(7, 'ii–V–I over four bars', 'ii–V–I על ארבע תיבות', [sp('gg-prog', o(5)), sp('gg-prog', o(5, 1))], [100, 130], 6),
      L(8, 'Anticipated changes', 'חילופים מוקדמים', [sp('gg-ant', o(2)), sp('gg-ant', o(3, 1))], [100, 130], 6),
      L(9, 'The guajeo with the clave and the tumbao', 'הגואחאו עם הקלאבה והטומבאו', [sp('gg-band', o(2)), sp('gg-band', o(5, 1))], [110, 150], 6),
    ]),
    style: 'both',
    styleId: 'afrocuban',
  };
}

/** Path places (KEYS_LEVEL_DIFF; guitar levels sit by grade): no gates — every style open from the start, difficulty by level. */
export const LATIN_LEVEL_DIFF: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`k-brazil-${i + 1}`, 900 + 40 * i])),
  ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k-montuno-${i + 1}`, 980 + 50 * i])),
  // the ponchando ii–V–I (SPEC-STYLE-FOCUS §9's neighbour moment): after the family's last level, in the family's order
  'k-montuno-12': 1500,
};
