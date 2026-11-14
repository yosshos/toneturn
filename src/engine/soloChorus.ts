// Write and play a solo chorus (docs/AUDIT-DEPTH-3.md C6): the player assembles a chorus over a form — the jazz blues,
// the A section of rhythm changes, or an own AABA — bar by bar from vocabulary cells (arpeggio, Barry Harris scale
// line, enclosure into the next chord, guide tones, the pivot, a chromatic approach, a rest) and the single-chord licks
// of the lick library, transposed to each bar's chord. The editor checks the rules (a chord tone on beat 1 of every
// bar that plays, an approach into each change); the k-solo / g-solo / b-solo chorus levels then play it graded note
// for note, rubato first, up the tempo ladder, in all 12 keys. Pure, apart from the saved plans (localStorage, guarded).

import { LICKS, LICK_Q, type Lick } from './licks';
import { VQ_DEF, leadIn, mod12, nearestPc, type VChord, type VN, type VQ } from './bebopVocab';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

type FBar = [number, VQ][];
/** An own AABA (16 bars): A = I–vi | ii–V | iii–VI | ii–V, the bridge III7 | VI7 | II7 | V7. */
export const AABA_FORM: { name: T2; bars: FBar[] } = (() => {
  const A: FBar[] = [[[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']], [[4, 'm7'], [9, '7']], [[2, 'm7'], [7, '7']]];
  const B: FBar[] = [[[4, '7']], [[9, '7']], [[2, '7']], [[7, '7']]];
  const lastA: FBar[] = [[[0, 'maj7'], [9, 'm7']], [[2, 'm7'], [7, '7']], [[0, 'maj7']], [[0, '6']]];
  return { name: t('an AABA form (own changes)', 'צורת AABA (מהלך מקורי)'), bars: [...A, ...A, ...B, ...lastA] };
})();
/** The chorus forms (options of the chorus items; append only). */
// The jazz blues and the A section of rhythm changes, as in bebopVocab.ts LINE_FORMS (copied: this module loads inside
// the drills' import cycle, so nothing from it may be read at load time).
export const BLUES_FORM: { name: T2; bars: FBar[] } = {
  name: t('jazz blues', 'בלוז ג׳אז'),
  bars: [[[0, '7']], [[5, '7']], [[0, '7']], [[7, 'm7'], [0, '7']], [[5, '7']], [[6, 'dim7']], [[0, '7']], [[9, '7']], [[2, 'm7']], [[7, '7']], [[0, '7'], [9, '7']], [[2, 'm7'], [7, '7']]],
};
export const RHYTHM_A_FORM: { name: T2; bars: FBar[] } = {
  name: t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A'),
  bars: [[[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, '7'], [0, '7']], [[5, 'maj7'], [6, 'dim7']], [[0, 'maj7'], [7, '7']], [[0, '6']]],
};
export const CHORUS_FORMS: { name: T2; bars: FBar[] }[] = [BLUES_FORM, RHYTHM_A_FORM, AABA_FORM];
/** The chords of each bar in a key (two chords in a bar get two beats each). */
export const barsOf = (form: number, key: number): VChord[][] => CHORUS_FORMS[form % CHORUS_FORMS.length].bars.map((bar) => bar.map(([d, q]) => ({ r: mod12(key + d), q, beats: 4 / bar.length })));

// ───────────────────────────── cells ─────────────────────────────

export type CellId = string;
export const CELL_NAME: Record<string, T2> = {
  arp: t('Arpeggio', 'ארפג׳יו'),
  harris: t('Scale line, chord tones on the beats', 'קו סולם, צלילי אקורד על הפעמות'),
  enc: t('Enclose the next chord', 'כיתור לאקורד הבא'),
  guide: t('Guide tones', 'צלילים מנחים'),
  pivot: t('Pivot', 'פיבוט'),
  approach: t('Approach the next chord', 'גישה לאקורד הבא'),
  rest: t('Rest', 'מנוחה'),
};
export const CELL_SHORT: Record<string, T2> = {
  arp: t('Arp', 'ארפ׳'),
  harris: t('Scale', 'סולם'),
  enc: t('Encl.', 'כיתור'),
  guide: t('Guide', 'מנחה'),
  pivot: t('Pivot', 'פיבוט'),
  approach: t('Appr.', 'גישה'),
  rest: t('Rest', 'מנוחה'),
};
export const BASE_CELLS = ['arp', 'harris', 'enc', 'guide', 'pivot', 'approach', 'rest'];
const famOf = (q: string): string => (q === 'm7' || q === 'm6' ? 'm' : q === 'maj7' || q === '6' ? 'M' : q === 'hd7' ? 'hd' : q === 'dim7' ? 'd' : '7');
/** Licks whose first chord lasts a bar or more and fits a chord's family: a bar borrows the lick's first bar. */
export function licksFor(q: VQ): Lick[] {
  return LICKS.filter((l) => l.chords[0][2] >= 4 && famOf(l.chords[0][1]) === famOf(q) && l.notes.filter((n) => n[1] < 4 - 1e-9).length >= 3);
}
/** The cells a bar may take (licks only on a one-chord bar). */
export function cellsFor(bar: VChord[]): CellId[] {
  return [...BASE_CELLS, ...(bar.length === 1 ? licksFor(bar[0].q).map((l) => `lick:${l.id}`) : [])];
}
export const cellName = (id: CellId): T2 => {
  if (id.startsWith('lick:')) {
    const l = LICKS.find((x) => x.id === id.slice(5));
    return l ? t(`Lick: ${l.name.en}`, `ליק: ${l.name.he}`) : t(id, id);
  }
  return CELL_NAME[id] ?? t(id, id);
};
export const cellShort = (id: CellId): T2 => (id.startsWith('lick:') ? t('Lick', 'ליק') : (CELL_SHORT[id] ?? t(id, id)));

const ctOf = (c: VChord): number[] => VQ_DEF[c.q].ct.slice(0, 4).map((x) => mod12(c.r + x));
const scOf = (c: VChord): number[] => VQ_DEF[c.q].sc.map((x) => mod12(c.r + x));
const guideOf = (c: VChord): number[] => [VQ_DEF[c.q].ct[1], VQ_DEF[c.q].ct[3]].map((x) => mod12(c.r + x));
const pitchesIn = (pcs: number[], lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let q = lo; q <= hi; q++) if (pcs.includes(mod12(q))) out.push(q);
  return out;
};

/** One chord's notes for a cell (eighths unless said), from beat `b0`, near the last pitch; `next` = the next chord. */
function cellNotes(id: CellId, c: VChord, next: VChord | null, b0: number, prev: number, lo: number, hi: number): VN[] {
  const n8 = Math.round(c.beats * 2);
  const ct = ctOf(c);
  const out: VN[] = [];
  const push = (p: number, k: number, dur = 0.5) => out.push({ p, beat: b0 + k / 2, dur, ct: ct.includes(mod12(p)) && k % 2 === 0 });
  if (id === 'rest') return out;
  if (id === 'guide') {
    const g = guideOf(c);
    const a = nearestPc(g[0], prev, lo, hi);
    const b = nearestPc(g[1], a, lo, hi);
    out.push({ p: a, beat: b0, dur: c.beats / 2, ct: true }, { p: b, beat: b0 + c.beats / 2, dur: c.beats / 2, ct: true });
    return out;
  }
  if (id === 'pivot') {
    const top = nearestPc(c.r, prev + 4, lo + 10, hi);
    const rel = VQ_DEF[c.q].ct.slice(1, 4);
    const seq = [top, ...rel.map((x) => top - 12 + x)];
    const full = n8 >= 8 ? [...seq, top, ...rel.slice().reverse().map((x) => top - 12 + x)] : seq;
    full.slice(0, n8).forEach((p, k) => push(p, k));
    return out;
  }
  if (id.startsWith('lick:')) {
    const l = LICKS.find((x) => x.id === id.slice(5));
    if (!l) return out;
    // The lick's chord root (above its tonic) moved to this bar's root, the octave nearest the last note.
    const shift = c.r - l.chords[0][0];
    const raw = l.notes.filter((n) => n[1] < c.beats - 1e-9).map((n) => n[0] + shift);
    let o = Math.round((prev - raw[0]) / 12) * 12;
    while (Math.max(...raw) + o > hi) o -= 12;
    while (Math.min(...raw) + o < lo) o += 12;
    const lct = LICK_Q[l.chords[0][1]].ct;
    for (const n of l.notes.filter((x) => x[1] < c.beats - 1e-9)) out.push({ p: n[0] + shift + o, beat: b0 + n[1], dur: Math.min(n[2], c.beats - n[1]), ct: lct.includes(mod12(n[0] - l.chords[0][0])) && Math.abs(n[1] - Math.round(n[1])) < 1e-6 });
    return out;
  }
  // arp / harris / enc / approach: a line of eighths with chord tones on the beats.
  const arp = pitchesIn(ct, lo, hi);
  const start = arp.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a), arp[0]);
  let tail: number[] = [];
  if ((id === 'enc' || id === 'approach') && next) {
    const tgt = nearestPc(guideOf(next)[0], start, lo + 2, hi - 2);
    tail = id === 'enc' ? leadIn('enc-ab', tgt, scOf(next)) : [tgt - 1];
  }
  const body = n8 - tail.length;
  const ps: number[] = [];
  if (id === 'harris') {
    // Down the chord scale: a chord tone on every beat, the scale tone (or a half step) between.
    let p = start + 12 <= hi ? arp.find((x) => x >= start + 5) ?? start : start;
    for (let k = 0; k < body; k++) {
      if (k % 2 === 0) {
        ps.push(p);
        continue;
      }
      let q = p - 1;
      while (!ct.includes(mod12(q))) q--;
      if (q < lo) {
        q = p + 1;
        while (!ct.includes(mod12(q))) q++;
      }
      const between = [];
      for (let x = Math.min(p, q) + 1; x < Math.max(p, q); x++) if (scOf(c).includes(mod12(x))) between.push(x);
      ps.push(between.length ? between[between.length - 1] : q < p ? q + 1 : q - 1);
      p = q;
    }
  } else {
    // Up the arpeggio, then back down (one turn).
    let i = arp.indexOf(start);
    let dir = i + 4 < arp.length ? 1 : -1;
    for (let k = 0; k < body; k++) {
      ps.push(arp[i]);
      if (i + dir < 0 || i + dir >= arp.length || k === 3) dir = -dir;
      i += dir;
    }
  }
  [...ps, ...tail].slice(0, n8).forEach((p, k) => push(p, k));
  return out;
}

/** The chorus's notes from a plan (one cell per bar). Two-chord bars take the cell on each chord. */
export function assembleChorus(bars: VChord[][], plan: CellId[], lo: number, hi: number): VN[] {
  const flat = bars.flat();
  const out: VN[] = [];
  let prev = Math.round(lo + (hi - lo) * 0.55);
  let beat = 0;
  let ci = 0;
  bars.forEach((bar, bi) => {
    const id = plan[bi] ?? 'arp';
    for (const c of bar) {
      const cid = id.startsWith('lick:') && bar.length > 1 ? 'arp' : id;
      const ns = cellNotes(cid, c, flat[ci + 1] ?? null, beat, prev, lo, hi);
      out.push(...ns);
      if (ns.length) prev = ns[ns.length - 1].p;
      beat += c.beats;
      ci++;
    }
  });
  // The chorus ends on a chord tone of the last chord, held (unless it ends in a rest bar).
  const last = flat[flat.length - 1];
  if (out.length && plan[bars.length - 1] !== 'rest') {
    const lastBar = bars.length - 1;
    const keep = out.filter((n) => n.beat < lastBar * 4 + 2 - 1e-6);
    const end = nearestPc(ctOf(last)[0], keep[keep.length - 1]?.p ?? prev, lo, hi);
    keep.push({ p: end, beat: lastBar * 4 + 2, dur: 2, ct: true });
    return keep;
  }
  return out;
}

/** The plan the app suggests: a varied mix, an enclosure or approach into every second change, the last bar resolving. */
export function defaultPlan(form: number): CellId[] {
  const n = CHORUS_FORMS[form % CHORUS_FORMS.length].bars.length;
  const cycle = ['arp', 'enc', 'harris', 'approach', 'pivot', 'enc', 'guide', 'approach'];
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 'guide' : cycle[i % cycle.length]));
}

export interface ChorusCheck {
  bar: number;
  ok: boolean;
}
/** The editor's rule check: a chord tone on beat 1 of every bar that plays, and an approach (a half step) into each new bar. */
export function chorusChecks(bars: VChord[][], notes: VN[]): { downbeats: ChorusCheck[]; approaches: ChorusCheck[] } {
  const downbeats: ChorusCheck[] = [];
  const approaches: ChorusCheck[] = [];
  bars.forEach((bar, i) => {
    const one = notes.find((n) => Math.abs(n.beat - i * 4) < 1e-6);
    if (!one) return;
    downbeats.push({ bar: i, ok: ctOf(bar[0]).includes(mod12(one.p)) });
    const before = notes.filter((n) => n.beat < i * 4 - 1e-6).pop();
    if (i > 0 && before && before.beat + before.dur >= i * 4 - 0.5 - 1e-6) approaches.push({ bar: i, ok: Math.abs(before.p - one.p) <= 2 });
  });
  return { downbeats, approaches };
}

// ───────────────────────────── the player's saved plans ─────────────────────────────

const store = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};
const planKey = (inst: string, form: number) => `tt.chorus.${inst}.${form}`;
/** The player's chorus for an instrument and form (null = not written yet: the suggested plan plays). */
export function savedPlan(inst: string, form: number): CellId[] | null {
  try {
    const raw = store()?.getItem(planKey(inst, form));
    const p = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(p) && p.every((x) => typeof x === 'string') ? (p as string[]) : null;
  } catch {
    return null;
  }
}
export function savePlan(inst: string, form: number, plan: CellId[] | null): void {
  try {
    if (plan) store()?.setItem(planKey(inst, form), JSON.stringify(plan));
    else store()?.removeItem(planKey(inst, form));
  } catch {
    /* private mode: the plan lives for this session only */
  }
}
export const planOf = (inst: string, form: number): CellId[] => savedPlan(inst, form) ?? defaultPlan(form);
