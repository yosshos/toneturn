// Any progression as a piano drill (owner 2026-11-08): the improvisation levels, the chart templates, standards'
// changes or your own chart, played as voicings (shells, guide tones, rootless A / B, close 4-note, drop 2, drop 3,
// open, two-handed, quartal, upper structures, block chords) in a comping rhythm (whole, Charleston, reverse
// Charleston, Red Garland, anticipation, four to the bar) — or as a stride left hand (single, octave, tenths, broken
// tenths, walking). Mode "improv": only the left hand is written; the right hand improvises above it (not graded as
// notes — the screen checks it against the chord-scales). Pure: returns the events; generate.ts turns them into a Drill.
//
// The spec's kind encodes everything:  chart~<ref>~<voicing>~<rhythm>~<mode>
//   ref: "lv:<id>" improvisation level · "std:<id>" standard · "tpl:<id>" template · "txt:<uri-encoded text>" own chart

import { CHART_TEMPLATES, IMPROV_LEVELS, parseChart, type ChartChordEv } from '../charts';
import { STANDARD_CHANGES } from '../standards';
import { autoScale } from '../improvRules';
import { MODE_STEPS } from '../modes';
import type { Hand } from './types';

export type ChartVoicing = 'shell' | 'guide' | 'rootless-a' | 'rootless-b' | 'rootless' | 'close4' | 'drop2' | 'drop3' | 'open' | 'two-hand' | 'quartal' | 'upper' | 'block' | 'stride-single' | 'stride-octave' | 'stride-tenth' | 'stride-broken' | 'stride-walk';
export type CompRhythm = 'whole' | 'charleston' | 'reverse' | 'garland' | 'anticip' | 'four' | 'stride';
export type ChartMode = 'comp' | 'improv';

export const VOICINGS: ChartVoicing[] = ['shell', 'guide', 'rootless', 'rootless-a', 'rootless-b', 'close4', 'drop2', 'drop3', 'open', 'two-hand', 'quartal', 'upper', 'block'];
export const STRIDES: ChartVoicing[] = ['stride-single', 'stride-octave', 'stride-tenth', 'stride-broken', 'stride-walk'];
export const RHYTHMS: CompRhythm[] = ['whole', 'charleston', 'reverse', 'garland', 'anticip', 'four'];

type Bi = { en: string; he: string };
export const VOICING_NAME: Record<ChartVoicing, Bi> = {
  shell: { en: 'Shells (1-3-7 / 1-7-3)', he: 'שלדים (1-3-7 / 1-7-3)' },
  guide: { en: 'Guide tones (3 & 7)', he: 'צלילים מנחים (3 ו־7)' },
  rootless: { en: 'Rootless A/B (smoothest)', he: 'בלי יסוד A/B (הכי חלק)' },
  'rootless-a': { en: 'Rootless A (3-5-7-9)', he: 'בלי יסוד A (3-5-7-9)' },
  'rootless-b': { en: 'Rootless B (7-9-3-5)', he: 'בלי יסוד B (7-9-3-5)' },
  close4: { en: 'Four-note close', he: 'ארבעה צלילים צמודים' },
  drop2: { en: 'Drop 2', he: 'דרופ 2' },
  drop3: { en: 'Drop 3', he: 'דרופ 3' },
  open: { en: 'Open / spread (LH 1-7, RH 3-5-9)', he: 'פתוח (יד שמאל 1-7, ימין 3-5-9)' },
  'two-hand': { en: 'Two-handed (LH 3-7, RH 9-5-3)', he: 'שתי ידיים (שמאל 3-7, ימין 9-5-3)' },
  quartal: { en: 'Quartal (fourths)', he: 'קוורטלי (קוורטות)' },
  upper: { en: 'Upper-structure triads', he: 'משולשי Upper structure' },
  block: { en: 'Block chords (locked hands)', he: 'אקורדי בלוק (ידיים נעולות)' },
  'stride-single': { en: 'Stride: single bass', he: 'סטרייד: בס בודד' },
  'stride-octave': { en: 'Stride: octave bass', he: 'סטרייד: בס באוקטבות' },
  'stride-tenth': { en: 'Stride: tenths', he: 'סטרייד: דסימות' },
  'stride-broken': { en: 'Stride: broken tenths', he: 'סטרייד: דסימות שבורות' },
  'stride-walk': { en: 'Stride: walking bass on 3', he: 'סטרייד: בס הולך על 3' },
};
export const RHYTHM_NAME: Record<CompRhythm, Bi> = {
  whole: { en: 'One per chord', he: 'אחד לכל אקורד' },
  charleston: { en: 'Charleston', he: 'צ׳רלסטון' },
  reverse: { en: 'Reverse Charleston', he: 'צ׳רלסטון הפוך' },
  garland: { en: 'Red Garland', he: 'רד גרלנד' },
  anticip: { en: 'Anticipation (and of 4)', he: 'הקדמה (ו־4)' },
  four: { en: 'Four to the bar', he: 'ארבע לתיבה' },
  stride: { en: 'Stride (1-2-3-4)', he: 'סטרייד (1-2-3-4)' },
};

export interface ChartRef {
  text: string;
  title: Bi;
  bpm: number;
}

/** Resolve a chart reference. */
export function chartRef(ref: string): ChartRef | null {
  const [k, ...rest] = ref.split(':');
  const id = rest.join(':');
  if (k === 'lv') {
    const l = IMPROV_LEVELS.find((x) => x.id === id);
    return l ? { text: l.text, title: l.title, bpm: l.bpm } : null;
  }
  if (k === 'std') {
    const s = STANDARD_CHANGES.find((x) => x.id === id);
    return s ? { text: s.text, title: { en: `${s.name} (${s.part.en})`, he: `${s.name} (${s.part.he})` }, bpm: s.bpm } : null;
  }
  if (k === 'tpl') {
    const t = CHART_TEMPLATES.find((x) => x.id === id);
    return t ? { text: t.text, title: t.title, bpm: t.bpm } : null;
  }
  if (k === 'txt') {
    try {
      // "title⏎text" (the title is optional)
      const raw = decodeURIComponent(id);
      const nl = raw.indexOf('\n');
      const title = nl > 0 ? raw.slice(0, nl) : '';
      return { text: nl > 0 ? raw.slice(nl + 1) : raw, title: title ? { en: title, he: title } : { en: 'My chart', he: 'המהלך שלי' }, bpm: 100 };
    } catch {
      return null;
    }
  }
  return null;
}
export const chartKind = (ref: string, v: ChartVoicing, r: CompRhythm, m: ChartMode = 'comp') => `chart~${ref}~${v}~${r}~${m}`;
export function parseChartKind(kind: string): { ref: string; voicing: ChartVoicing; rhythm: CompRhythm; mode: ChartMode } | null {
  const p = kind.split('~');
  if (p[0] !== 'chart' || p.length < 5) return null;
  return { ref: p[1], voicing: p[2] as ChartVoicing, rhythm: p[3] as CompRhythm, mode: (p[4] as ChartMode) || 'comp' };
}

// ---------------------------------------------------------------- chord roles

const mod = (n: number, m = 12) => ((n % m) + m) % m;
interface Roles {
  third: number;
  fifth: number;
  seventh: number;
  ninth: number;
  /** 5th, or the 13th on a dominant (rootless voicings). */
  color: number;
  dom: boolean;
  alt: boolean;
}
export function roles(c: { iv: number[] }): Roles {
  const iv = c.iv;
  const has = (x: number) => iv.includes(x);
  const third = has(3) ? 3 : has(4) ? 4 : has(5) ? 5 : has(2) ? 2 : 4;
  const fifth = has(6) && !has(7) ? 6 : has(8) && !has(7) ? 8 : 7;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : third === 3 ? 10 : 9; // triads become 6 / m7 sounds
  const dom = third === 4 && seventh === 10;
  const alt = dom && (has(13) || has(15) || has(20));
  const ninth = has(13) ? 13 : has(15) ? 15 : third === 3 && fifth === 6 ? 12 /* m7♭5: the root */ : seventh === 9 && fifth === 6 ? 12 /* dim7 */ : 14;
  const color = dom ? (alt ? 20 : 21) - 12 : fifth;
  return { third, fifth, seventh, ninth, color, dom, alt };
}

/** Lay pitch offsets (relative to the root pc) into a register: the lowest note lands in [lo, lo + 12). */
function place(root: number, offs: number[], lo: number): number[] {
  const base = offs.map((o) => root + o);
  const low = Math.min(...base);
  const shift = Math.ceil((lo - low) / 12) * 12;
  return base.map((m) => m + shift).sort((a, b) => a - b);
}
/** Of several candidate voicings, the one closest to the previous (sum of nearest-note moves); first when none. */
function nearest(cands: number[][], prev: number[] | null): number[] {
  if (!cands.length) return [];
  if (!prev?.length) return cands[0];
  const cost = (v: number[]) => v.reduce((a, m) => a + Math.min(...prev.map((p) => Math.abs(p - m))), 0) + Math.abs(v[0] - prev[0]) * 0.5;
  return cands.slice().sort((a, b) => cost(a) - cost(b))[0];
}
/** The same offsets one octave down / up as extra candidates (keeps a voicing in range while it moves smoothly). */
const octaves = (v: number[], lo: number, hi: number) => {
  const xs = [v, v.map((m) => m - 12), v.map((m) => m + 12)].filter((x) => x[0] >= lo - 2 && x[x.length - 1] <= hi + 2);
  return xs.length ? xs : [v];
};

export interface Voiced {
  lh: number[];
  rh: number[];
}

/** One chord as a voicing (absolute MIDI), led smoothly from the previous one. */
export function voice(c: ChartChordEv, v: ChartVoicing, prev: Voiced | null): Voiced {
  const R = roles(c);
  const r = c.root;
  const { third: T, seventh: S, ninth: N, color: X, fifth: F } = R;
  const lhOnly = (cands: number[][]): Voiced => ({ lh: nearest(cands.flatMap((x) => octaves(x, 48, 67)), prev?.lh ?? null), rh: [] });
  switch (v) {
    case 'shell':
      return lhOnly([place(r, [0, T, S], 40), place(r, [0, S, T + 12], 40)]);
    case 'guide':
      return lhOnly([place(r, [T, S], 52), place(r, [S, T + 12], 52)]);
    case 'rootless-a':
      return lhOnly([place(r, [T, X, S, N], 50)]);
    case 'rootless-b':
      return lhOnly([place(r, [S, N, T + 12, X + 12], 50)]);
    case 'rootless':
      return lhOnly([place(r, [T, X, S, N], 50), place(r, [S, N, T + 12, X + 12], 50)]);
    case 'quartal': {
      // stacked fourths inside the chord-scale, from the first of 9, 3, 5, 1 that gives perfect fourths
      const scale = MODE_STEPS[autoScale(c.iv)].map((x) => x % 12);
      for (const start of [N % 12, T, F, 0]) {
        const notes = [start];
        let ok = true;
        for (let k = 0; k < 3 && ok; k++) {
          const next = notes[notes.length - 1] + 5;
          if (scale.includes(mod(next))) notes.push(next);
          else ok = false;
        }
        if (ok) return lhOnly([place(r, notes, 50)]);
      }
      return lhOnly([place(r, [T, X, S, N], 50)]);
    }
    case 'close4': {
      const pcs = [0, T, F, S];
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 57));
      return { lh: [], rh: nearest(inv.flatMap((x) => octaves(x, 55, 79)), prev?.rh ?? null) };
    }
    case 'drop2':
    case 'drop3': {
      const pcs = [0, T, F, S];
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 60));
      const dropped = inv.map((cl) => {
        const top = cl.slice().sort((a, b) => b - a);
        const d = v === 'drop2' ? top[1] : top[2];
        return cl.map((m) => (m === d ? m - 12 : m)).sort((a, b) => a - b);
      });
      const pick = nearest(dropped.flatMap((x) => octaves(x, 48, 79)), prev ? [...prev.lh, ...prev.rh] : null);
      return { lh: [pick[0]], rh: pick.slice(1) };
    }
    case 'open': {
      const lh = nearest([place(r, [0, S], 40), place(r, [0, S], 40).map((m) => m + 12)].filter((x) => x[0] <= 52), prev?.lh ?? null);
      const rh = nearest(octaves(place(r, [T, X > 12 ? X - 12 : X, N], 60), 58, 79), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'two-hand': {
      const lh = nearest([place(r, [T, S], 50), place(r, [S, T + 12], 50)], prev?.lh ?? null);
      const rh = nearest(octaves(place(r, [N, X + 12, T + 12], 60), 60, 82), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'upper': {
      // LH guide tones; RH a triad that colours the chord: II (9, ♯11, 13) on dominants, ♭VI (♭13, 1, ♯9) on altered,
      // II on maj7 (lydian), IV on m7 (dorian 11-13-1), ♭III on m7♭5.
      const lh = nearest([place(r, [T, S], 50), place(r, [S, T + 12], 50)], prev?.lh ?? null);
      const tri = R.alt ? [8, 12, 15] : R.dom ? [2, 6, 9] : T === 4 ? [2, 6, 9] : F === 6 ? [3, 6, 10] : [5, 9, 12];
      const rh = nearest(octaves(place(r, tri, 62), 60, 82), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'block': {
      // locked hands: a close 4-note chord in the RH with its top note doubled an octave lower in the LH
      const pcs = [0, T, F, S];
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 64));
      const rh = nearest(inv.flatMap((x) => octaves(x, 62, 84)), prev?.rh ?? null);
      return { lh: [rh[rh.length - 1] - 12], rh };
    }
    default:
      return lhOnly([place(r, [0, T, S], 40)]);
  }
}

// ---------------------------------------------------------------- the drill events

export interface ChartEv {
  beat: number;
  dur: number;
  notes: { pitch: number; hand: Hand; accent?: boolean }[];
  required: number[];
  allowed: number[];
}
export interface ChartDrillData {
  title: Bi;
  evs: ChartEv[];
  meter: number;
  startBpm: number;
  /** Notes at or above this pitch are the free right hand (improv mode): not graded as notes. */
  freeAbove?: number;
  /** The chart in the drill's key (for the right-hand check and the chart line). */
  text: string;
}

const HITS: Record<Exclude<CompRhythm, 'stride' | 'whole'>, number[]> = { charleston: [0, 1.5], reverse: [0.5, 2], garland: [1.5, 3.5], anticip: [0, 3.5], four: [0, 1, 2, 3] };

/** Build the events for a chart drill in key offset `key` (semitones from the chart as written). */
export function chartDrillData(kind: string, key: number): ChartDrillData | null {
  const k = parseChartKind(kind);
  if (!k) return null;
  const ref = chartRef(k.ref);
  if (!ref) return null;
  const meter = 4;
  const parsed0 = parseChart(ref.text, meter);
  if (!parsed0.chords.length) return null;
  const chords = parsed0.chords.map((c) => ({ ...c, root: mod(c.root + key), bass: mod(c.bass + key) }));
  const bars = parsed0.bars;
  const stride = k.voicing.startsWith('stride');
  const evs: ChartEv[] = [];
  let prev: Voiced | null = null;
  const chordAt = (beat: number) => {
    let cur = chords[0];
    for (const c of chords) if (c.bar * meter + c.at <= beat + 1e-6) cur = c;
    return cur;
  };
  const pcsOf = (c: ChartChordEv) => c.iv.map((x) => mod(c.root + x));
  const allowOf = (c: ChartChordEv) => {
    const scale = MODE_STEPS[autoScale(c.iv)].map((x) => mod(c.root + x));
    return [...new Set([...pcsOf(c), ...scale])];
  };
  const push = (beat: number, dur: number, c: ChartChordEv, pitches: { pitch: number; hand: Hand }[], req?: number[]) => {
    if (!pitches.length) return;
    evs.push({ beat, dur, notes: pitches.map((p, i) => ({ ...p, accent: i === pitches.length - 1 })), required: req ?? [...new Set(pitches.map((p) => mod(p.pitch)))], allowed: [...new Set([...allowOf(c), ...pitches.map((p) => mod(p.pitch))])] });
  };
  const lowRoot = (pc: number, lo = 36) => lo + mod(pc - lo);

  if (stride) {
    // Stride: bass on 1 and 3, a chord in the middle register on 2 and 4.
    for (let b = 0; b < bars * meter; b++) {
      const c = chordAt(b);
      const nx = chordAt(b + 1);
      const pos = b % meter;
      const R = roles(c);
      if (pos % 2 === 0) {
        // tenths need a low root so the 10th stays under middle C
        const root = lowRoot(c.bass, k.voicing === 'stride-tenth' || k.voicing === 'stride-broken' ? 33 : 36);
        let bass: number[];
        const fifthBelow = lowRoot(mod(c.root + R.fifth), 31);
        const onThree = pos === 2;
        switch (k.voicing) {
          case 'stride-octave':
            bass = onThree ? [fifthBelow, fifthBelow + 12] : [root - 12 >= 28 ? root - 12 : root, root - 12 >= 28 ? root : root + 12];
            break;
          case 'stride-tenth':
            bass = onThree ? [fifthBelow, fifthBelow + mod(R.third - R.fifth)] : [root, root + 12 + R.third];
            break;
          case 'stride-broken': {
            const ten = onThree ? [fifthBelow] : [root, root + 12 + R.third];
            push(b, 0.5, c, [{ pitch: ten[0], hand: 'L' }], [mod(ten[0])]);
            if (ten[1]) push(b + 0.5, 0.5, c, [{ pitch: ten[1], hand: 'L' }], [mod(ten[1])]);
            continue;
          }
          case 'stride-walk':
            bass = onThree ? [lowRoot(mod(nx.root + (nx === c ? 7 : -1)), 31)] : [root];
            break;
          default:
            bass = onThree ? [fifthBelow] : [root];
        }
        push(b, 1, c, bass.map((p) => ({ pitch: p, hand: 'L' as Hand })), [...new Set(bass.map((p) => mod(p)))]);
      } else {
        // the stride chord: 3-5-7 (or 3-7-9) between G3 and E4, close
        const chord = place(c.root, [R.third, R.fifth, R.seventh], 52);
        push(b, 1, c, chord.map((p) => ({ pitch: p, hand: 'L' as Hand })));
      }
    }
  } else {
    // Comping: hits per bar in the rhythm; every chord gets at least one hit; an anticipation sounds the next chord.
    const voiced = new Map<ChartChordEv, Voiced>();
    for (const c of chords) {
      const v = voice(c, k.voicing, prev);
      voiced.set(c, v);
      prev = v;
    }
    const hits: { beat: number; c: ChartChordEv }[] = [];
    for (let bar = 0; bar < bars; bar++) {
      const inBar = chords.filter((c) => c.bar === bar);
      if (k.rhythm === 'whole') for (const c of inBar) hits.push({ beat: bar * meter + c.at, c });
      else {
        for (const h of HITS[k.rhythm as keyof typeof HITS]) {
          const beat = bar * meter + h;
          const ant = k.rhythm === 'anticip' && h === 3.5 && bar < bars - 1;
          hits.push({ beat, c: ant ? chordAt((bar + 1) * meter) : chordAt(beat) });
        }
        for (const c of inBar) if (!hits.some((x) => x.c === c)) hits.push({ beat: bar * meter + c.at, c });
      }
    }
    hits.sort((a, b) => a.beat - b.beat);
    hits.forEach((h, i) => {
      const next = hits[i + 1]?.beat ?? bars * meter;
      const v = voiced.get(h.c)!;
      const pitches = [...v.lh.map((p) => ({ pitch: p, hand: 'L' as Hand })), ...(k.mode === 'improv' ? [] : v.rh.map((p) => ({ pitch: p, hand: 'R' as Hand })))];
      push(h.beat, Math.max(0.5, Math.min(next - h.beat, k.rhythm === 'four' ? 0.9 : 4)), h.c, pitches);
    });
  }
  const text = chords
    .reduce<string[][]>((acc, c) => {
      (acc[c.bar] ??= []).push(transposeSym(c.sym, key));
      return acc;
    }, [])
    .map((b) => (b ?? []).join(' '))
    .join(' | ');
  const vt = VOICING_NAME[k.voicing];
  const rt = stride ? RHYTHM_NAME.stride : RHYTHM_NAME[k.rhythm];
  return {
    title: { en: `${ref.title.en} · ${vt.en} · ${rt.en}${k.mode === 'improv' ? ' · RH improvises' : ''}`, he: `${ref.title.he} · ${vt.he} · ${rt.he}${k.mode === 'improv' ? ' · יד ימין מאלתרת' : ''}` },
    evs,
    meter,
    startBpm: Math.max(50, Math.round(ref.bpm * 0.55)),
    // the right hand starts just above the left hand's highest note (never below middle C)
    ...(k.mode === 'improv' ? { freeAbove: Math.max(60, ...evs.flatMap((e) => e.notes.map((n) => n.pitch + 1))) } : {}),
    text,
  };
}

const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LET: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function transposeSym(sym: string, n: number): string {
  if (!n) return sym;
  return sym.replace(/^([A-G])([#♯b♭]?)/, (_, l: string, a: string) => FLATS[mod(LET[l] + (a === '#' || a === '♯' ? 1 : a ? -1 : 0) + n)]).replace(/\/([A-G])([#♯b♭]?)$/, (_, l: string, a: string) => '/' + FLATS[mod(LET[l] + (a === '#' || a === '♯' ? 1 : a ? -1 : 0) + n)]);
}
