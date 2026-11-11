// Chord finder (GUITAR_DEEPENING §6, P2): what the recognizer needs outside the drills.
//   · Strum frames → a chroma window and the sounding bass (the live microphone frames of pitchCapture).
//   · Open set: name any strum among 12 roots × 10 qualities (+ the bass for slash chords), with a confidence; below the
//     margin it says "not sure" and offers the two nearest names. Never a confident guess.
//   · Closed set for questions: a target chord and its nearest confusers (same root, other qualities), so a topic
//     question or a Chord Rush item can ask "strum Am7" and know whether Am7 sounded.
//   · Name → shapes: every playable shape of a chord on the neck (open chords, the E / A / D movable shapes, drop-2).
// Pure: no Web Audio, no UI.

import { BASS_BONUS, QUALITY_INTS, RECOGNIZE_MARGIN, RECOGNIZE_MIN_SCORE, candidatePcs, recognizeFromChroma, type ChordCandidate, type ChordQuality } from './chordRecognize';
import { meanChroma, ringCheck } from './chroma';
import { TUNINGS, boxPicture, dropVoicing, noteAt, parseShape, type FretShape, type NeckPos, type Tuning } from './fretboard';

type Bi = { en: string; he: string };
const pc12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;

// ───────────────────────────── names ─────────────────────────────

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAMES_HE = ['דו', 'דו דיאז', 'רה', 'מי במול', 'מי', 'פה', 'פה דיאז', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];
/** Qualities the open-set finder names (the recognizer's templates). */
export const OPEN_QUALITIES: ChordQuality[] = ['M', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'sus2', 'sus4', '5'];
const SYM: Record<ChordQuality, string> = { M: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', sus2: 'sus2', sus4: 'sus4', '5': '5', '9': '9', add9: 'add9' };
const QUALITY_HE: Record<ChordQuality, string> = { M: 'מז׳ור', m: 'מינור', '7': 'שביעית דומיננטית', maj7: 'מז׳ור 7', m7: 'מינור 7', m7b5: 'חצי מוקטן', dim7: 'מוקטן 7', sus2: 'sus2', sus4: 'sus4', '5': 'קווינטה (פאוור)', '9': '9', add9: 'add9' };
const QUALITY_EN: Record<ChordQuality, string> = { M: 'major', m: 'minor', '7': 'dominant 7th', maj7: 'major 7th', m7: 'minor 7th', m7b5: 'half-diminished', dim7: 'diminished 7th', sus2: 'sus2', sus4: 'sus4', '5': 'power chord', '9': 'dominant 9th', add9: 'add9' };
export const qualityName = (q: ChordQuality): Bi => ({ en: QUALITY_EN[q], he: QUALITY_HE[q] });
export const noteNameBi = (pc: number): Bi => ({ en: NAMES[pc12(pc)], he: NAMES_HE[pc12(pc)] });

/** Lead-sheet symbol: "Am7", "C/E", "B♭°7". A bass that is the root (or none) is not written. */
export function chordSymbol(c: Pick<ChordCandidate, 'root' | 'quality' | 'bass'>): string {
  const slash = c.bass !== undefined && pc12(c.bass) !== pc12(c.root) ? `/${NAMES[pc12(c.bass)]}` : '';
  return `${NAMES[pc12(c.root)]}${SYM[c.quality]}${slash}`;
}
/** The chord in words: "A minor 7th" / "לה מינור 7" (slash: "over E" / "עם מי בבס"). */
export function chordWords(c: Pick<ChordCandidate, 'root' | 'quality' | 'bass'>): Bi {
  const slash = c.bass !== undefined && pc12(c.bass) !== pc12(c.root);
  return {
    en: `${NAMES[pc12(c.root)]} ${QUALITY_EN[c.quality]}${slash ? ` over ${NAMES[pc12(c.bass!)]}` : ''}`,
    he: `${NAMES_HE[pc12(c.root)]} ${QUALITY_HE[c.quality]}${slash ? `, ${NAMES_HE[pc12(c.bass!)]} בבס` : ''}`,
  };
}

/** The chord a set of notes spells (any inversion), or null. The lowest note becomes the bass when it isn't the root. */
export function identifyChord(midis: number[], qualities: ChordQuality[] = OPEN_QUALITIES): ChordCandidate | null {
  if (!midis.length) return null;
  const want = [...new Set(midis.map(pc12))].sort((a, b) => a - b).join(',');
  const low = pc12(Math.min(...midis));
  // The lowest note as root first (root position wins over a rootless reading of the same notes).
  const roots = [low, ...[...new Set(midis.map(pc12))].filter((p) => p !== low)];
  for (const r of roots)
    for (const q of qualities) {
      const set = [...new Set(QUALITY_INTS[q].map((i) => pc12(r + i)))].sort((a, b) => a - b).join(',');
      if (set === want) return { root: r, quality: q, ...(low !== r ? { bass: low } : {}) };
    }
  return null;
}

// ───────────────────────────── strum frames ─────────────────────────────

/** A live analysis frame (pitchCapture: t in ms here, YIN pitch, loudness, 12-bin chroma). */
export interface StrumFrame {
  t: number;
  hz: number | null;
  conf?: number;
  rms: number;
  chroma?: number[];
}

/** ⚙ The strum onset: loudness at least this many times the quiet floor before it (and above STRUM_MIN_RMS). */
export const STRUM_RISE = 3;
export const STRUM_MIN_RMS = 0.02;

/** Time (ms) of the first strum in the frames: a jump in loudness over the quiet before it. Null when none. */
export function strumOnset(frames: StrumFrame[]): number | null {
  for (let i = 1; i < frames.length; i++) {
    const prev = frames.slice(Math.max(0, i - 6), i).map((f) => f.rms);
    const floor = Math.min(...prev);
    if (frames[i].rms >= STRUM_MIN_RMS && frames[i].rms >= STRUM_RISE * Math.max(floor, 0.002)) return frames[i].t;
  }
  return null;
}

/** The mean chroma 60–450 ms after the onset (frames with chroma and sound) and the sounding bass (lowest steady YIN
 *  pitch 70–330 Hz), as the drill analysis reads a chord. Null when fewer than 3 frames carry the chord. */
export function strumWindow(frames: StrumFrame[], onset: number | null = strumOnset(frames)): { chroma: number[]; bass: number | null } | null {
  if (onset === null) return null;
  const win = frames.filter((f) => f.chroma && f.t >= onset + 60 && f.t <= onset + 450 && f.rms > 0.01);
  if (win.length < 3) return null;
  const lows = win.filter((f) => f.hz && (f.conf ?? 1) >= 0.5 && f.hz >= 70 && f.hz <= 330).map((f) => Math.round(12 * Math.log2(f.hz! / 440) + 69));
  return { chroma: meanChroma(win.map((f) => f.chroma!)), bass: lows.length >= 2 ? pc12(Math.min(...lows)) : null };
}

// ───────────────────────────── open set ─────────────────────────────

export interface OpenResult {
  status: 'ok' | 'unsure' | 'silent';
  /** The named chord (status ok), with a slash bass when the heard bass is another chord tone. */
  best?: ChordCandidate & { symbol: string; confidence: number };
  /** The nearest names (best first) — shown as "maybe" when unsure. */
  near: { symbol: string; root: number; quality: ChordQuality; score: number }[];
  /** Pitch classes of the best name that did not ring ("B string not ringing"). */
  missing: number[];
  bass: number | null;
  chroma: number[];
}

// ⚙ calibrate with real takes: chroma share (of the strongest class) that counts an extra note as ringing / absent,
// and how far below the best score a subset / superset name may be to be considered.
export const EXTRA_PRESENT = 0.45;
export const EXTRA_ABSENT = 0.12;
const SUBSET_WINDOW = 0.15;

const ALL_OPEN: ChordCandidate[] = Array.from({ length: 12 }, (_, r) => OPEN_QUALITIES.map((q) => ({ root: r, quality: q }))).flat();

/**
 * Name a strum among every root × OPEN_QUALITIES. Candidates that spell the same notes (the four roots of a °7) are
 * one name; the heard bass picks the root among them. The best name must beat the next different note set by the
 * recognizer's margin, else "unsure" with the nearest names.
 */
export function recognizeOpen(chroma: number[], bassPc: number | null): OpenResult {
  const empty: OpenResult = { status: 'silent', near: [], missing: [], bass: bassPc, chroma };
  if (!chroma.length || Math.max(...chroma) <= 0) return empty;
  const r = recognizeFromChroma(chroma, bassPc, ALL_OPEN);
  // One entry per note set: the best-scoring spelling (the bass bonus decides among a °7's roots).
  const groups = new Map<string, { i: number; score: number }>();
  ALL_OPEN.forEach((c, i) => {
    const key = [...new Set(candidatePcs(c))].sort((a, b) => a - b).join(',');
    const g = groups.get(key);
    if (!g || r.scores[i] > g.score) groups.set(key, { i, score: r.scores[i] });
  });
  const ranked = [...groups.values()].sort((a, b) => b.score - a.score);
  // Subset names (C ⊂ Cmaj7, A5 ⊂ Am) are decided by the extra notes themselves: present → the fuller chord, absent
  // → the smaller one. The template cosine alone leans to triads when a 7th rings softly.
  const pcsOf = (g: { i: number }) => new Set(candidatePcs(ALL_OPEN[g.i]));
  const sub = (a: Set<number>, b: Set<number>) => a.size < b.size && [...a].every((p) => b.has(p));
  let top = ranked[0];
  for (let pass = 0; pass < 3; pass++) {
    const T = pcsOf(top);
    const next = ranked.slice(0, 6).find((g) => {
      if (g === top || g.score < top.score - SUBSET_WINDOW) return false;
      const G = pcsOf(g);
      if (sub(T, G)) return [...G].filter((p) => !T.has(p)).every((p) => chroma[p] >= EXTRA_PRESENT);
      if (sub(G, T)) return [...T].filter((p) => !G.has(p)).some((p) => chroma[p] < EXTRA_ABSENT);
      return false;
    });
    if (!next) break;
    top = next;
  }
  const order = [top, ...ranked.filter((g) => g !== top)];
  const near = order.slice(0, 3).map((g) => ({ symbol: chordSymbol(ALL_OPEN[g.i]), root: ALL_OPEN[g.i].root, quality: ALL_OPEN[g.i].quality, score: g.score }));
  const c = ALL_OPEN[top.i];
  const cos = top.score - (bassPc !== null && bassPc === pc12(c.root) ? BASS_BONUS : 0);
  const missing = ringCheck(chroma, candidatePcs(c)).missing;
  // The margin is over the nearest name that is not a subset / superset of this one (those were decided above).
  const T = pcsOf(top);
  const rival = ranked.find((g) => g !== top && !sub(pcsOf(g), T) && !sub(T, pcsOf(g)));
  const margin = top.score - (rival?.score ?? 0);
  if (cos < RECOGNIZE_MIN_SCORE || margin < RECOGNIZE_MARGIN) return { status: 'unsure', near, missing, bass: bassPc, chroma };
  const slash = bassPc !== null && bassPc !== pc12(c.root) && candidatePcs(c).includes(bassPc) ? { bass: bassPc } : {};
  const best = { ...c, ...slash };
  return { status: 'ok', best: { ...best, symbol: chordSymbol(best), confidence: Math.round(margin * 1000) / 1000 }, near, missing, bass: bassPc, chroma };
}

/** Name a strum straight from live frames (onset, window, open set). */
export function findChord(frames: StrumFrame[]): OpenResult {
  const w = strumWindow(frames);
  if (!w) return { status: 'silent', near: [], missing: [], bass: null, chroma: [] };
  return recognizeOpen(w.chroma, w.bass);
}

/** Progression smoothing: a single strum that differs from the same name on both sides is that name (A B A → A A A);
 *  unsure strums (null) take a neighbour's name when both neighbours agree. */
export function smoothNames(xs: (string | null)[]): (string | null)[] {
  return xs.map((x, i) => (i > 0 && i < xs.length - 1 && xs[i - 1] !== null && xs[i - 1] === xs[i + 1] && x !== xs[i - 1] ? xs[i - 1] : x));
}

// ───────────────────────────── closed set for questions ─────────────────────────────

/** The nearest wrong answers per quality (same root): what a player most likely strums instead. */
const CONFUSE: Record<ChordQuality, ChordQuality[]> = {
  M: ['m', '7', 'maj7', 'sus4'],
  m: ['M', 'm7', 'm7b5', 'sus2'],
  '7': ['M', 'maj7', 'm7', 'sus4'],
  maj7: ['M', '7', 'm7'],
  m7: ['m', '7', 'm7b5', 'maj7'],
  m7b5: ['m7', 'dim7', '7', 'm'],
  dim7: ['m7b5', '7', 'm'],
  sus2: ['M', 'm', 'sus4'],
  sus4: ['M', '7', 'sus2'],
  '5': ['M', 'm'],
  '9': ['7', 'M', 'm7'],
  add9: ['M', 'sus2', 'maj7'],
};

/** A strum question: the target first among its confusers (and, for an inversion, the other basses). */
export function strumCandidates(target: ChordCandidate): { candidates: ChordCandidate[]; answer: number } {
  const base = { root: pc12(target.root), quality: target.quality };
  const cands: ChordCandidate[] = [target.bass !== undefined ? { ...base, bass: pc12(target.bass) } : base];
  for (const q of CONFUSE[target.quality]) cands.push({ root: base.root, quality: q });
  if (target.bass !== undefined) for (const p of candidatePcs(base)) if (p !== pc12(target.bass)) cands.push({ ...base, bass: p });
  return { candidates: cands, answer: 0 };
}

export interface StrumVerdict {
  verdict: 'right' | 'wrong' | 'again';
  /** What was heard (right / wrong), as a symbol. */
  heard?: string;
  heardChord?: ChordCandidate;
  /** Strings of the target that did not ring (pitch classes). */
  missing: number[];
}

/** Judge a strum against a target chord (closed set). `needBass`: an inversion question — the bass must agree. */
export function judgeStrum(frames: StrumFrame[], target: ChordCandidate, needBass = false): StrumVerdict {
  const w = strumWindow(frames);
  if (!w) return { verdict: 'again', missing: [] };
  // Which chord (root + quality) among the target and its confusers; then, for an inversion question, the heard bass.
  const ids = strumCandidates(target).candidates.map(({ root, quality }) => ({ root, quality })).filter((c, i, a) => a.findIndex((x) => x.root === c.root && x.quality === c.quality) === i);
  const r = recognizeFromChroma(w.chroma, w.bass, ids);
  if (r.status !== 'ok' || !r.best) return { verdict: 'again', missing: r.missing };
  const same = r.best.root === pc12(target.root) && r.best.quality === target.quality;
  if (needBass && same && w.bass === null) return { verdict: 'again', missing: r.missing };
  const bassTone = w.bass !== null && candidatePcs(r.best).includes(w.bass) && w.bass !== r.best.root ? { bass: w.bass } : {};
  const heard: ChordCandidate = { root: r.best.root, quality: r.best.quality, ...bassTone };
  const right = same && (!needBass || w.bass === pc12(target.bass ?? target.root));
  return { verdict: right ? 'right' : 'wrong', heard: chordSymbol(heard), heardChord: heard, missing: r.missing };
}

/** The notes of a heard chord near a target voicing (a wrong strummed answer, entered as what was heard): its bass
 *  (or root) at the target's lowest note's octave, the rest stacked above. Never equal to the target's notes. */
export function heardMidis(heard: ChordCandidate | undefined, target: number[]): number[] {
  if (!heard) return target.map((m) => m + 1);
  const low = Math.min(...target);
  const b = pc12(heard.bass ?? heard.root);
  const base = low - pc12(low - b);
  const pcs = candidatePcs(heard).filter((p) => p !== b);
  const out = [base, ...pcs.map((p) => base + ((p - b + 12) % 12))];
  const same = out.length === target.length && [...out].sort((x, y) => x - y).every((m, i) => m === [...target].sort((x, y) => x - y)[i]);
  return same ? out.map((m, i) => (i === 0 ? m - 12 : m)) : out;
}

// ───────────────────────────── name → shapes ─────────────────────────────

const STD = TUNINGS[0];

/** Open chords (standard tuning), lowest string first. */
const OPEN_SHAPES: { root: number; quality: ChordQuality; shape: string }[] = [
  { root: 0, quality: 'M', shape: 'x32010' }, { root: 9, quality: 'M', shape: 'x02220' }, { root: 7, quality: 'M', shape: '320003' }, { root: 4, quality: 'M', shape: '022100' }, { root: 2, quality: 'M', shape: 'xx0232' },
  { root: 9, quality: 'm', shape: 'x02210' }, { root: 4, quality: 'm', shape: '022000' }, { root: 2, quality: 'm', shape: 'xx0231' },
  { root: 9, quality: '7', shape: 'x02020' }, { root: 2, quality: '7', shape: 'xx0212' }, { root: 4, quality: '7', shape: '020100' }, { root: 7, quality: '7', shape: '320001' }, { root: 0, quality: '7', shape: 'x32310' }, { root: 11, quality: '7', shape: 'x21202' },
  { root: 9, quality: 'm7', shape: 'x02010' }, { root: 4, quality: 'm7', shape: '022030' }, { root: 2, quality: 'm7', shape: 'xx0211' },
  { root: 0, quality: 'maj7', shape: 'x32000' }, { root: 5, quality: 'maj7', shape: 'xx3210' }, { root: 9, quality: 'maj7', shape: 'x02120' }, { root: 2, quality: 'maj7', shape: 'xx0222' }, { root: 4, quality: 'maj7', shape: '021100' },
  { root: 11, quality: 'm7b5', shape: 'x20201' },
  { root: 9, quality: 'sus4', shape: 'x02230' }, { root: 2, quality: 'sus4', shape: 'xx0233' }, { root: 4, quality: 'sus4', shape: '022200' },
  { root: 9, quality: 'sus2', shape: 'x02200' }, { root: 2, quality: 'sus2', shape: 'xx0230' },
  { root: 4, quality: '5', shape: '022xxx' }, { root: 9, quality: '5', shape: 'x022xx' },
];

/** Movable shapes: fret offsets from the root fret on the root string (strings 6 → 1, 'x' muted). */
const MOVABLE: { str: 6 | 5 | 4; name: Bi; shapes: Partial<Record<ChordQuality, (number | 'x')[]>> }[] = [
  {
    str: 6,
    name: { en: 'E shape, root on 6', he: 'צורת E, יסוד על 6' },
    shapes: { M: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], maj7: [0, 'x', 1, 1, 0, 'x'], m7: [0, 2, 0, 0, 0, 0], m7b5: [0, 'x', 0, 0, -1, 'x'], dim7: [0, 'x', -1, 0, -1, 'x'], sus4: [0, 2, 2, 2, 0, 0], sus2: [0, 2, 4, 4, 0, 0], '5': [0, 2, 2, 'x', 'x', 'x'], '9': [0, 2, 0, 1, 0, 2] },
  },
  {
    str: 5,
    name: { en: 'A shape, root on 5', he: 'צורת A, יסוד על 5' },
    shapes: { M: ['x', 0, 2, 2, 2, 0], m: ['x', 0, 2, 2, 1, 0], '7': ['x', 0, 2, 0, 2, 0], maj7: ['x', 0, 2, 1, 2, 0], m7: ['x', 0, 2, 0, 1, 0], m7b5: ['x', 0, 1, 0, 1, 'x'], dim7: ['x', 0, 1, -1, 1, 'x'], sus4: ['x', 0, 2, 2, 3, 0], sus2: ['x', 0, 2, 2, 0, 0], '5': ['x', 0, 2, 2, 'x', 'x'], '9': ['x', 0, -1, 0, 0, 'x'] },
  },
  {
    str: 4,
    name: { en: 'D shape, root on 4', he: 'צורת D, יסוד על 4' },
    shapes: { M: ['x', 'x', 0, 2, 3, 2], m: ['x', 'x', 0, 2, 3, 1], '7': ['x', 'x', 0, 2, 1, 2], maj7: ['x', 'x', 0, 2, 2, 2], m7: ['x', 'x', 0, 2, 1, 1], m7b5: ['x', 'x', 0, 1, 1, 1], dim7: ['x', 'x', 0, 1, 0, 1], sus4: ['x', 'x', 0, 2, 3, 3], sus2: ['x', 'x', 0, 2, 3, 0] },
  },
];

export interface ChordShape {
  name: Bi;
  /** The chord-box picture (roots marked). */
  box: ReturnType<typeof boxPicture>;
  /** Sounding notes, low to high. */
  midis: number[];
  /** Lowest fretted fret (sorting, the "position"). */
  pos: number;
}

const shapeOf = (tu: Tuning, s: FretShape) => s.dots.map((d) => noteAt(tu, d.str, d.fret)).sort((a, b) => a - b);
/** A shape is right when it plays only chord tones, the root, the 3rd / sus note and the 7th (a 5th may be left out). */
function spells(midis: number[], root: number, q: ChordQuality): boolean {
  const pcs = new Set(midis.map(pc12));
  const want = QUALITY_INTS[q].map((i) => pc12(root + i));
  if ([...pcs].some((p) => !want.includes(p))) return false;
  return want.every((p, k) => pcs.has(p) || (QUALITY_INTS[q][k] === 7 && want.length >= 4));
}

/** Every playable shape of a chord (standard tuning): the open chord, the E / A / D movable shapes, drop-2 for 7ths. */
export function shapesFor(root: number, quality: ChordQuality, tu: Tuning = STD): ChordShape[] {
  const r = pc12(root);
  const out: ChordShape[] = [];
  const push = (name: Bi, s: FretShape) => {
    const midis = shapeOf(tu, s);
    if (!s.dots.length || !spells(midis, r, quality)) return;
    const key = s.dots.map((d) => `${d.str}:${d.fret}`).sort().join(',');
    if (out.some((x) => x.box.dots.concat(x.box.open.map((o) => ({ str: o, fret: 0 }))).map((d) => `${d.str}:${d.fret}`).sort().join(',') === key)) return;
    const fr = s.dots.filter((d) => d.fret > 0).map((d) => d.fret);
    out.push({ name, box: boxPicture(tu, s, r), midis, pos: fr.length ? Math.min(...fr) : 0 });
  };
  if (tu.id === STD.id) for (const o of OPEN_SHAPES) if (o.root === r && o.quality === quality) push({ en: 'Open chord', he: 'אקורד פתוח' }, parseShape(o.shape));
  for (const m of MOVABLE) {
    const offs = m.shapes[quality];
    if (!offs) continue;
    const nums = offs.filter((x): x is number => x !== 'x');
    let rf = pc12(r - tu.open[m.str - 1]);
    if (rf + Math.min(...nums) < 1) rf += 12;
    if (rf + Math.max(...nums) > 15) continue;
    const dots: NeckPos[] = [];
    const muted: number[] = [];
    offs.forEach((o, i) => (o === 'x' ? muted.push(6 - i) : dots.push({ str: 6 - i, fret: rf + o })));
    push(m.name, { dots, muted });
  }
  const sev: Partial<Record<ChordQuality, 'maj7' | '7' | 'm7' | 'm7b5'>> = { maj7: 'maj7', '7': '7', m7: 'm7', m7b5: 'm7b5' };
  const k = sev[quality];
  if (k)
    for (const rs of [5, 4]) {
      const rf0 = pc12(r - tu.open[rs - 1]);
      for (const rf of [rf0, rf0 + 12]) {
        const v = dropVoicing(tu, 2, k, rs, rf);
        if (!v || v.some((p) => p.fret === 0) || Math.max(...v.map((p) => p.fret)) > 15) continue;
        const all = [6, 5, 4, 3, 2, 1].filter((s) => !v.some((p) => p.str === s));
        push({ en: `Drop-2, root on ${rs}`, he: `דרופ 2, יסוד על ${rs}` }, { dots: v, muted: all });
        break;
      }
    }
  return out.sort((a, b) => a.pos - b.pos).slice(0, 6);
}
