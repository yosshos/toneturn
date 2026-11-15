// Reharmonise a head, keeping its melody (docs/AUDIT-DEPTH-3.md §1 #2, C3). Pure.
//
// The player picks a device per bar from an allowed set; each device is applicable only where its harmonic context is
// there (a dominant that resolves, a held chord, a minor chord …). The new chord under each melody note is checked:
// the note must be a chord tone or a valid tension of the new chord — never an avoid note (the 11th over a major or
// dominant chord, a major 7th over a dominant, a ♭9 over a major or minor chord …). Conflicts come back as one short line
// each. The result is an ordinary chart text (charts.ts syntax) that the comping, walking and melody drills read.

import { parseChart, type ChartChordEv } from './charts';
import { noteIn, noteNameIn, sharpKey, type Home } from './stdKey';
import { chordKind, type HNote } from './heads';

type T2 = { en: string; he: string };
const pc = (n: number): number => ((n % 12) + 12) % 12;

/**
 * The devices, from the first reharm level to the top one (Coltrane), then the borrowed chords of modal interchange
 * (HARMONY-REHARM §4, docs/research/REHARM-AND-COLOR.md C.3): iv(m6) for a IV bar, ♭VImaj7 for a held tonic bar,
 * ♭VII7 for a V7 bar, iiø7 for a ii before its V, and the minor plagal ending (ivm6 straight to I) for a V bar.
 */
export type Device = 'tritone' | 'iiV' | 'backdoor' | 'pdim' | 'cliche' | 'coltrane' | 'minorIV' | 'bVI' | 'bVII' | 'iiHalfDim' | 'minorPlagal';
/** The functional devices (the reharm levels and tests list them in this order). */
export const DEVICES_FUNCTIONAL: Device[] = ['tritone', 'iiV', 'backdoor', 'pdim', 'cliche', 'coltrane'];
/** The borrowed devices (modal interchange): colour, not direction. */
export const DEVICES_BORROWED: Device[] = ['minorIV', 'bVI', 'bVII', 'iiHalfDim', 'minorPlagal'];
export const DEVICES: Device[] = [...DEVICES_FUNCTIONAL, ...DEVICES_BORROWED];
export const DEVICE_NAME: Record<Device, T2> = {
  tritone: { en: 'Tritone sub', he: 'תחליף טריטון' },
  iiV: { en: 'Extra ii–V', he: 'ii–V נוסף' },
  backdoor: { en: 'Backdoor', he: 'דלת אחורית' },
  pdim: { en: 'Passing dim', he: 'דימיניש עובר' },
  cliche: { en: 'Line cliché', he: 'קו קלישאה' },
  coltrane: { en: 'Coltrane sub', he: 'תחליף קולטריין' },
  minorIV: { en: 'Minor iv', he: 'iv מינורי' },
  bVI: { en: '♭VI', he: '♭VI' },
  bVII: { en: '♭VII7', he: '♭VII7' },
  iiHalfDim: { en: 'iiø7', he: 'iiø7' },
  minorPlagal: { en: 'Minor plagal', he: 'פלגלית מינורית' },
};
/** One letter per device in a plan code ("3T5I": bar 4 tritone, bar 6 extra ii–V). */
const LETTER: Record<Device, string> = { tritone: 'T', iiV: 'I', backdoor: 'B', pdim: 'P', cliche: 'C', coltrane: 'J', minorIV: 'F', bVI: 'S', bVII: 'K', iiHalfDim: 'H', minorPlagal: 'N' };

type Ch = Pick<ChartChordEv, 'root' | 'iv' | 'sym' | 'beats' | 'at' | 'bar'>;

/** The chords of each bar of a chart text. */
export function barsOf(text: string): Ch[][] {
  const p = parseChart(text);
  const out: Ch[][] = Array.from({ length: p.bars }, () => []);
  for (const c of p.chords) out[c.bar].push(c);
  return out;
}

const isDom = (c: Ch) => chordKind(c.iv) === 'dom';
const isMajor = (c: Ch) => chordKind(c.iv) === 'maj';
const isMinor = (c: Ch) => chordKind(c.iv) === 'min';
const nextFirst = (bars: Ch[][], i: number): Ch | null => bars[i + 1]?.[0] ?? null;
/** The chord after chord k of bar i (in the bar, else the next bar's first). */
const after = (bars: Ch[][], i: number, k: number): Ch | null => bars[i][k + 1] ?? nextFirst(bars, i);

const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/**
 * A new chord's symbol, spelled as players write it: a root in the key's scale as the key spells it; a root outside it
 * flat (the ♭II7 of a tritone sub, ♭VII7, ♭VImaj7), or sharp for a passing diminished (C → C♯°7 → Dm7).
 */
const sym = (root: number, q: string, h: Home, raised = false): string => {
  const major = pc(h.key + (h.minor ? 3 : 0));
  const inKey = [0, 2, 4, 5, 7, 9, 11].includes(pc(root - major));
  // A sharp key never shows a flat chord name (bass final check): outside the scale it is sharp there too.
  return (inKey ? noteIn(root, h) : raised || sharpKey(h) ? SHARP[pc(root)] : FLAT[pc(root)]) + q;
};

/** The new chords a device puts in bar i (and i + 1 for Coltrane), or null when it does not apply there. */
export function deviceBars(bars: Ch[][], i: number, d: Device, h: Home): string[][] | null {
  const bar = bars[i];
  if (!bar?.length) return null;
  const one = bar.length === 1 && bar[0].beats >= 4 - 1e-6 ? bar[0] : null;
  switch (d) {
    case 'tritone': {
      // Every dominant in the bar that resolves down a 5th becomes the dominant a tritone away.
      let hit = false;
      const out = bar.map((c, k) => {
        const nx = after(bars, i, k);
        if (isDom(c) && nx && pc(nx.root - c.root) === 5) {
          hit = true;
          return sym(c.root + 6, '7', h);
        }
        return c.sym;
      });
      return hit ? [out] : null;
    }
    case 'backdoor': {
      // A V7 (with or without its ii in the bar) going to a major I: iv m7 – ♭VII7 instead.
      const last = bar[bar.length - 1];
      const nx = nextFirst(bars, i);
      if (!isDom(last) || !nx || !isMajor(nx) || pc(nx.root - last.root) !== 5) return null;
      const rest = bar.slice(0, -1);
      if (rest.some((c) => !(pc(c.root - last.root) === 7 && chordKind(c.iv) === 'min'))) return null;
      return [[sym(nx.root + 5, 'm7', h), sym(nx.root + 10, '7', h)]];
    }
    case 'iiV': {
      if (!one) return null;
      // A whole bar of a dominant: its related ii first (G7 → Dm7 G7).
      if (isDom(one)) {
        // Minor ii (m7♭5) when the dominant resolves to a minor chord a 5th below.
        const nx = nextFirst(bars, i);
        const toMinor = !!nx && pc(nx.root - one.root) === 5 && chordKind(nx.iv) === 'min';
        return [[sym(one.root + 7, toMinor ? 'm7b5' : 'm7', h), one.sym]];
      }
      // The second bar of a held chord: the ii–V of the next chord.
      const prev = bars[i - 1];
      const nx = nextFirst(bars, i);
      if (prev?.length === 1 && prev[0].sym === one.sym && nx && nx.root !== one.root && !isDom(nx)) {
        const minor = chordKind(nx.iv) === 'min' || chordKind(nx.iv) === 'half';
        return [[sym(nx.root + 2, minor ? 'm7b5' : 'm7', h), sym(nx.root + 7, '7', h)]];
      }
      return null;
    }
    case 'pdim': {
      // A whole-bar chord a whole step below the next chord: the diminished on the half step between (C → C♯°7 → Dm7).
      const nx = nextFirst(bars, i);
      if (!one || !nx || chordKind(one.iv) === 'dim' || pc(nx.root - one.root) !== 2) return null;
      return [[one.sym, sym(one.root + 1, 'dim7', h, true)]];
    }
    case 'cliche': {
      // A whole bar of a minor chord: the line falls a half step a beat inside it (m, m(maj7), m7, m6).
      if (!one || !isMinor(one)) return null;
      const r = noteIn(one.root, h);
      return [[`${r}m`, `${r}m(maj7)`, `${r}m7`, `${r}m6`]];
    }
    case 'coltrane': {
      // A ii–V (or V) into a major I becomes the Giant Steps cycle into the I: ♭VImaj7 – VII7 – IIImaj7 – V7. Over two
      // bars of ii / V two chords a bar; over one bar of ii–V, one a beat.
      const cyc = (I: Ch): string[] => [sym(I.root + 8, 'maj7', h), sym(I.root + 11, '7', h), sym(I.root + 4, 'maj7', h), sym(I.root + 7, '7', h)];
      const okII = (c: Ch, I: Ch) => (pc(c.root - I.root) === 2 && chordKind(c.iv) === 'min') || (pc(c.root - I.root) === 7 && isDom(c));
      const intoI = (b: Ch[], I: Ch | undefined): I is Ch => !!I && isMajor(I) && b.length > 0 && isDom(b[b.length - 1]) && pc(b[b.length - 1].root - I.root) === 7 && b.every((c) => okII(c, I));
      const b2 = bars[i + 1];
      const I2 = bars[i + 2]?.[0];
      if (b2 && intoI([...bar, ...b2], I2) && bar.every((c) => okII(c, I2))) {
        const c = cyc(I2);
        return [c.slice(0, 2), c.slice(2)];
      }
      const I1 = bars[i + 1]?.[0];
      if (bar.length >= 2 && intoI(bar, I1)) return [cyc(I1)];
      return null;
    }
    // ── modal interchange: borrowed from the parallel minor (major keys only; the tonic is the head's key) ──
    case 'minorIV': {
      // A whole bar of IV (major) becomes iv m6: Fmaj7 → Fm6 in C.
      if (h.minor || !one || !isMajor(one) || pc(one.root - h.key) !== 5) return null;
      return [[sym(one.root, 'm6', h)]];
    }
    case 'bVI': {
      // The second bar of a held tonic becomes ♭VImaj7 (C | C → C | A♭maj7): the colour of the minor's sixth degree.
      const prev = bars[i - 1];
      if (h.minor || !one || !isMajor(one) || pc(one.root - h.key) !== 0 || prev?.length !== 1 || prev[0].root !== one.root || !isMajor(prev[0])) return null;
      return [[sym(h.key + 8, 'maj7', h)]];
    }
    case 'bVII': {
      // A whole bar of V7 into the major tonic becomes ♭VII7 (the backdoor dominant alone): G7 → B♭7.
      const nx = nextFirst(bars, i);
      if (h.minor || !one || !isDom(one) || pc(one.root - h.key) !== 7 || !nx || !isMajor(nx) || pc(nx.root - h.key) !== 0) return null;
      return [[sym(h.key + 10, '7', h)]];
    }
    case 'iiHalfDim': {
      // Every ii m7 that goes to its V7 in the bar (or across the bar line) becomes iiø7 (Dm7 → Dm7♭5): the minor's ii.
      if (h.minor) return null;
      let hit = false;
      const out = bar.map((c, k) => {
        const nx = after(bars, i, k);
        if (chordKind(c.iv) === 'min' && pc(c.root - h.key) === 2 && nx && isDom(nx) && pc(nx.root - c.root) === 5) {
          hit = true;
          return sym(c.root, 'm7b5', h);
        }
        return c.sym;
      });
      return hit ? [out] : null;
    }
    case 'minorPlagal': {
      // A whole bar of V7 (or ii–V) into the major tonic becomes ivm6, going straight to I: G7 | C → Fm6 | C.
      const last = bar[bar.length - 1];
      const nx = nextFirst(bars, i);
      if (h.minor || !isDom(last) || pc(last.root - h.key) !== 7 || !nx || !isMajor(nx) || pc(nx.root - h.key) !== 0) return null;
      if (bar.slice(0, -1).some((c) => !(pc(c.root - last.root) === 7 && chordKind(c.iv) === 'min'))) return null;
      return [[sym(h.key + 5, 'm6', h)]];
    }
  }
}

/** The devices that apply to bar i. */
export const applicable = (text: string, i: number, h: Home, allowed: Device[] = DEVICES): Device[] => {
  const bars = barsOf(text);
  return allowed.filter((d) => deviceBars(bars, i, d, h) !== null);
};

/** A plan: bar index → device. */
export type Plan = Record<number, Device>;
export const planCode = (p: Plan): string =>
  Object.keys(p)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => `${i}${LETTER[p[i]]}`)
    .join('');
export function parsePlan(code: string): Plan {
  const out: Plan = {};
  const inv = Object.fromEntries(Object.entries(LETTER).map(([d, l]) => [l, d as Device]));
  for (const m of code.matchAll(/(\d+)([A-Z])/g)) if (inv[m[2]]) out[Number(m[1])] = inv[m[2]];
  return out;
}

// ───────────────────────────── the melody against the new chords ─────────────────────────────

/** A melody note's role over a chord: a chord tone, a valid tension, or an avoid note. */
export type Role = 'chord' | 'tension' | 'avoid';
const DEGREE: T2[] = [
  { en: 'root', he: 'יסוד' }, { en: '♭9', he: '♭9' }, { en: '9th', he: 'נונה' }, { en: '♭3', he: '♭3' }, { en: '3rd', he: 'טרצה' }, { en: '11th', he: 'אונדצימה' },
  { en: '♯11', he: '♯11' }, { en: '5th', he: 'קווינטה' }, { en: '♭13', he: '♭13' }, { en: '13th', he: '13' }, { en: '♭7', he: '♭7' }, { en: 'maj 7', he: 'ספטימה גדולה' },
];
const KIND_NAME: Record<string, T2> = {
  maj: { en: 'a major chord', he: 'אקורד מז׳ורי' },
  min: { en: 'a minor chord', he: 'אקורד מינורי' },
  dom: { en: 'a dominant', he: 'דומיננט' },
  half: { en: 'a half-diminished chord', he: 'אקורד חצי מוקטן' },
  dim: { en: 'a diminished chord', he: 'אקורד מוקטן' },
  mmaj: { en: 'a minor-major chord', he: 'אקורד מינור-מז׳ור' },
};

/** The role of a melody pitch class over a chord (tension rules of jazz harmony). */
export function roleOf(melodyPc: number, c: Pick<ChartChordEv, 'root' | 'iv'>): Role {
  const r = pc(melodyPc - c.root);
  if (c.iv.some((i) => pc(i) === r)) return 'chord';
  const k = chordKind(c.iv);
  const tens: Record<ChordKind2, number[]> = {
    maj: [2, 6, 9, 11],
    min: [2, 5, 9, 10],
    dom: [1, 2, 3, 6, 8, 9],
    half: [2, 5, 8],
    dim: [2, 5, 8, 11],
    mmaj: [2, 5, 9],
  };
  return tens[k].includes(r) ? 'tension' : 'avoid';
}
type ChordKind2 = ReturnType<typeof chordKind>;

export interface Conflict {
  bar: number;
  beat: number;
  pitch: number;
  sym: string;
  line: T2;
}

/**
 * The melody notes that clash with the chords of a chart: notes on beats 1 and 3, notes of a beat or longer, and every
 * note where a chord starts (short passing notes between are free). Only bars in `only` when given.
 */
export function checkMelody(notes: HNote[], text: string, h: Home, only?: number[]): Conflict[] {
  const chords = parseChart(text).chords;
  const out: Conflict[] = [];
  for (const n of notes) {
    const bar = Math.floor(n.beat / 4 + 1e-9);
    if (only && !only.includes(bar)) continue;
    let c = chords[0];
    for (const x of chords) if (x.bar * 4 + x.at <= n.beat + 1e-6) c = x;
    const inBar = n.beat - bar * 4;
    const strong = Math.abs(inBar) < 1e-6 || Math.abs(inBar - 2) < 1e-6;
    const onChange = Math.abs(c.bar * 4 + c.at - n.beat) < 1e-6;
    if (!(strong || onChange || n.dur >= 1 - 1e-6)) continue;
    if (roleOf(n.pitch, c) !== 'avoid') continue;
    const deg = DEGREE[pc(n.pitch - c.root)];
    const kn = KIND_NAME[chordKind(c.iv)];
    const name = noteNameIn(n.pitch, h);
    const s = c.sym.replace('#', '♯').replace(/(?<=^[A-G])b/, '♭');
    out.push({ bar, beat: n.beat, pitch: n.pitch, sym: c.sym, line: { en: `Bar ${bar + 1}: ${name} over ${s} — the ${deg.en} on ${kn.en}`, he: `תיבה ${bar + 1}: ${name} מעל ${s} — ${deg.he} על ${kn.he}` } });
  }
  return out;
}

// ───────────────────────────── applying a plan ─────────────────────────────

export interface Reharm {
  /** The new chart text (charts.ts syntax). */
  text: string;
  /** One chord string per bar. */
  bars: string[];
  /** Bars the plan changed (Coltrane: both of its bars). */
  changed: number[];
  /** Devices that could not be used where the plan put them (not applicable there, or overlapping). */
  skipped: number[];
  /** Melody clashes in the changed bars. */
  conflicts: Conflict[];
}

/** Apply a plan to a chart (in its key `h`) and check the melody in every changed bar. */
export function applyPlan(text: string, plan: Plan, h: Home, melody: HNote[] = []): Reharm {
  const bars = barsOf(text);
  const out = bars.map((b) => b.map((c) => c.sym));
  const changed: number[] = [];
  const skipped: number[] = [];
  for (const i of Object.keys(plan).map(Number).sort((a, b) => a - b)) {
    const d = plan[i];
    const nb = changed.includes(i) ? null : deviceBars(bars, i, d, h);
    if (!nb || (d === 'coltrane' && changed.includes(i + 1))) {
      skipped.push(i);
      continue;
    }
    nb.forEach((cs, k) => {
      out[i + k] = cs;
      changed.push(i + k);
    });
  }
  const newText = out.map((b) => b.join(' ')).join(' | ');
  return { text: newText, bars: out.map((b) => b.join(' ')), changed: changed.sort((a, b) => a - b), skipped, conflicts: melody.length ? checkMelody(melody, newText, h, changed) : [] };
}

/**
 * The app's own reharm with a set of devices: bar by bar, the first device of the set that applies and keeps the
 * melody clean (no conflict in its bars). Used for the preset reharm levels.
 */
export function autoPlan(text: string, h: Home, devices: Device[], melody: HNote[] = []): Plan {
  const plan: Plan = {};
  const bars = barsOf(text);
  const used = new Set<number>();
  for (let i = 0; i < bars.length; i++) {
    if (used.has(i)) continue;
    for (const d of devices) {
      const nb = deviceBars(bars, i, d, h);
      if (!nb || (d === 'coltrane' && used.has(i + 1))) continue;
      const trial = applyPlan(text, { ...plan, [i]: d }, h, melody);
      const span = nb.map((_, k) => i + k);
      if (trial.conflicts.some((c) => span.includes(c.bar))) continue;
      plan[i] = d;
      // One bar left as written after each device (and after both bars of a Coltrane sub): a reharm, not a new tune.
      [...span, span[span.length - 1] + 1].forEach((b) => used.add(b));
      break;
    }
  }
  return plan;
}
