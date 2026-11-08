// Improvisation beyond notes (0.53, PLAN §12–14). Pure analysis of a played line (onsets in beats, MIDI pitches):
//   phrases    — phrase lengths, rests between them, density (notes per beat), where each phrase peaks (its arc);
//   motifs     — a 3–5 note cell and its returns: exact, transposed (sequence), inverted, displaced, rhythm only;
//   vary       — a given phrase and the player's answer: related (contour / rhythm / skeleton kept) yet changed, and
//                which change was made (displaced, ornamented, transposed, answered);
//   trade      — the app's reply to a player's four bars: their motif, developed (sequenced, inverted, displaced).
// Rules for the "phrasing" exercises are checked here too (max density, phrase length, a bar of rest).

export interface PNote {
  /** Onset in beats from the start. */
  beat: number;
  /** Length in beats (0 when unknown). */
  dur: number;
  midi: number;
}

export interface Phrase {
  start: number;
  end: number;
  notes: PNote[];
  /** Highest note's position in the phrase, 0 = at its start, 1 = at its end. */
  peakAt: number;
  /** Notes per beat inside the phrase. */
  density: number;
}

/** Split a line into phrases at gaps of at least `gap` beats (default: a beat and a half). */
export function phrasesOf(notes: PNote[], gap = 1.5): Phrase[] {
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  const out: PNote[][] = [];
  for (const n of ns) {
    const cur = out[out.length - 1];
    const last = cur?.[cur.length - 1];
    if (!cur || n.beat - (last.beat + Math.max(last.dur, 0.25)) >= gap) out.push([n]);
    else cur.push(n);
  }
  return out.map((p) => {
    const start = p[0].beat;
    const end = p[p.length - 1].beat + Math.max(p[p.length - 1].dur, 0.5);
    const hi = p.reduce((a, b) => (b.midi > a.midi ? b : a));
    const span = Math.max(0.001, p[p.length - 1].beat - start);
    return { start, end, notes: p, peakAt: p.length > 1 ? (hi.beat - start) / span : 0, density: p.length / Math.max(0.5, end - start) };
  });
}

export interface PhrasingReport {
  phrases: number;
  /** Mean phrase length in beats. */
  meanLength: number;
  /** Share of the time with nothing played (0–1). */
  space: number;
  /** Notes per beat overall. */
  density: number;
  /** Phrases whose high point comes in their second half (an arc that builds). */
  buildingArcs: number;
}

export function phrasingReport(notes: PNote[], totalBeats: number): PhrasingReport {
  const ps = phrasesOf(notes);
  const played = ps.reduce((a, p) => a + (p.end - p.start), 0);
  return {
    phrases: ps.length,
    meanLength: ps.length ? played / ps.length : 0,
    space: totalBeats > 0 ? Math.max(0, Math.min(1, 1 - played / totalBeats)) : 0,
    density: totalBeats > 0 ? notes.length / totalBeats : 0,
    buildingArcs: ps.filter((p) => p.notes.length >= 3 && p.peakAt >= 0.5).length,
  };
}

export type PhraseRule = { kind: 'max-density'; perBeat: number } | { kind: 'phrase-bars'; bars: number; meter: number } | { kind: 'rest-bar'; meter: number };

/** Check a phrasing rule: ok, and a short reason in both languages. */
export function checkPhraseRule(notes: PNote[], _totalBeats: number, rule: PhraseRule): { ok: boolean; why: { en: string; he: string } } {
  const ps = phrasesOf(notes);
  if (rule.kind === 'max-density') {
    const worst = Math.max(0, ...ps.map((p) => p.density));
    const ok = worst <= rule.perBeat + 1e-6;
    return { ok, why: ok ? { en: 'Density kept', he: 'הצפיפות נשמרה' } : { en: `Too busy: ${worst.toFixed(1)} notes a beat (max ${rule.perBeat})`, he: `צפוף מדי: ${worst.toFixed(1)} צלילים לפעמה (מקסימום ${rule.perBeat})` } };
  }
  if (rule.kind === 'phrase-bars') {
    const target = rule.bars * rule.meter;
    const off = ps.filter((p) => Math.abs(p.end - p.start - target) > rule.meter * 0.5);
    const ok = ps.length > 0 && off.length === 0;
    return { ok, why: ok ? { en: `Every phrase ${rule.bars} bars`, he: `כל משפט ${rule.bars} תיבות` } : { en: `${off.length} of ${ps.length} phrases are not ${rule.bars} bars long`, he: `${off.length} מתוך ${ps.length} משפטים אינם באורך ${rule.bars} תיבות` } };
  }
  // a full bar of rest between phrases
  const gaps = ps.slice(1).map((p, i) => p.start - ps[i].end);
  const ok = ps.length > 1 && gaps.every((g) => g >= rule.meter - 0.25);
  return { ok, why: ok ? { en: 'A bar of rest between phrases', he: 'תיבה של שקט בין משפטים' } : { en: 'Leave a whole bar of rest between phrases', he: 'השאירו תיבה שלמה של שקט בין משפטים' } };
}

// ---------------------------------------------------------------- motifs

const intervals = (ns: PNote[]) => ns.slice(1).map((n, i) => n.midi - ns[i].midi);
const iois = (ns: PNote[]) => ns.slice(1).map((n, i) => +(n.beat - ns[i].beat).toFixed(3));
const sameArr = (a: number[], b: number[], tol = 0) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol);

export type Transform = 'exact' | 'sequence' | 'inversion' | 'displaced' | 'rhythm';
export interface MotifReturn {
  at: number;
  how: Transform;
}

/** The motif = the first `len` notes; its later returns and how each was changed. */
export function motifReturns(notes: PNote[], len = 3): { motif: PNote[]; returns: MotifReturn[] } {
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  if (ns.length < len * 2) return { motif: ns.slice(0, len), returns: [] };
  const m = ns.slice(0, len);
  const mi = intervals(m);
  const mr = iois(m);
  const mBeatInBar = m[0].beat % 4;
  const out: MotifReturn[] = [];
  for (let i = len; i + len <= ns.length; i++) {
    const w = ns.slice(i, i + len);
    const wi = intervals(w);
    const wr = iois(w);
    const sameRhythm = sameArr(wr, mr, 0.13);
    let how: Transform | null = null;
    if (sameArr(wi, mi) && sameRhythm) {
      if (w[0].midi === m[0].midi) how = Math.abs((w[0].beat % 4) - mBeatInBar) > 0.13 ? 'displaced' : 'exact';
      else how = 'sequence';
    } else if (sameArr(wi, mi.map((x) => -x)) && sameRhythm && mi.some((x) => x !== 0)) how = 'inversion';
    else if (sameRhythm && !sameArr(wi, mi)) how = 'rhythm';
    if (how) {
      out.push({ at: w[0].beat, how });
      i += len - 1;
    }
  }
  return { motif: m, returns: out };
}

/** A development score 0–1: returns that change the motif count most; exact repeats a little; nothing = 0. */
export function developmentScore(r: MotifReturn[]): number {
  const w: Record<Transform, number> = { exact: 0.15, rhythm: 0.25, sequence: 0.35, displaced: 0.35, inversion: 0.4 };
  const kinds = new Set(r.map((x) => x.how));
  return Math.min(1, r.reduce((a, x) => a + w[x.how], 0) * 0.6 + kinds.size * 0.12);
}

// ---------------------------------------------------------------- vary this phrase

export type Variation = 'displace' | 'ornament' | 'transpose' | 'answer';
export interface VaryVerdict {
  related: boolean;
  changed: boolean;
  /** The change the player made, as heard. */
  heard: Variation | 'same' | 'unrelated';
  ok: boolean;
  why: { en: string; he: string };
}

const contour = (ns: PNote[]) => intervals(ns).map(Math.sign);
function contourSimilarity(a: PNote[], b: PNote[]): number {
  const ca = contour(a);
  const cb = contour(b);
  if (!ca.length || !cb.length) return 0;
  // compare the shorter against the longer's skeleton (every k-th move)
  const [s, l] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  const k = l.length / s.length;
  let same = 0;
  s.forEach((x, i) => {
    if (l[Math.min(l.length - 1, Math.floor(i * k))] === x) same++;
  });
  return same / s.length;
}

/** Judge a variation of `given` against the asked change. */
export function judgeVariation(given: PNote[], answer: PNote[], asked: Variation): VaryVerdict {
  const g = [...given].sort((a, b) => a.beat - b.beat);
  const a = [...answer].sort((x, y) => x.beat - y.beat);
  if (a.length < 2) return { related: false, changed: false, heard: 'unrelated', ok: false, why: { en: 'Play a phrase back', he: 'נגנו משפט בחזרה' } };
  const gi = intervals(g);
  const ai = intervals(a);
  const sameIntervals = sameArr(gi, ai);
  const sameRhythm = sameArr(iois(g), iois(a), 0.13);
  const shift = a[0].beat - g[0].beat;
  const pitchesKept = g.every((n) => a.some((x) => x.midi === n.midi));
  const cs = contourSimilarity(g, a);
  let heard: VaryVerdict['heard'];
  if (sameIntervals && sameRhythm && a[0].midi === g[0].midi && Math.abs((shift % 4 + 4) % 4) < 0.13) heard = 'same';
  else if (sameIntervals && sameRhythm && a[0].midi === g[0].midi) heard = 'displace';
  else if (sameIntervals && a[0].midi !== g[0].midi) heard = 'transpose';
  else if (a.length > g.length && pitchesKept && cs >= 0.5) heard = 'ornament';
  else if (cs >= 0.4 || pitchesKept) heard = 'answer';
  else heard = 'unrelated';
  const related = heard !== 'unrelated';
  const changed = heard !== 'same';
  const ok = related && changed && (heard === asked || (asked === 'answer' && heard !== 'same'));
  const names: Record<Variation, { en: string; he: string }> = {
    displace: { en: 'moved in time', he: 'הוזז בזמן' },
    ornament: { en: 'ornamented', he: 'קושט' },
    transpose: { en: 'moved to another pitch', he: 'הועבר לגובה אחר' },
    answer: { en: 'answered', he: 'נענה' },
  };
  const why = ok
    ? { en: `Yes — ${names[asked].en}, and still the same idea`, he: `כן — ${names[asked].he}, ועדיין אותו רעיון` }
    : heard === 'same'
      ? { en: 'That is the same phrase — change it', he: 'זה אותו משפט — שנו אותו' }
      : heard === 'unrelated'
        ? { en: 'A new idea — keep something of the given phrase (its shape or rhythm)', he: 'רעיון חדש — שמרו משהו מהמשפט הנתון (הצורה או הקצב)' }
        : { en: `Heard it ${names[heard as Variation].en}; asked: ${names[asked].en}`, he: `נשמע ${names[heard as Variation].he}; התבקש: ${names[asked].he}` };
  return { related, changed, heard, ok, why };
}

/** A phrase to vary, from a key and a seed: four to six notes of the scale, a clear rhythm. */
export function phraseToVary(seed: number, tonic = 60): PNote[] {
  let h = seed >>> 0 || 1;
  const r = () => ((h = Math.imul(h ^ (h >>> 13), 1103515245) + 12345) >>> 0) / 4294967296;
  const SC = [0, 2, 4, 5, 7, 9, 11, 12];
  const n = 4 + Math.floor(r() * 3);
  const out: PNote[] = [];
  let d = Math.floor(r() * 5);
  let beat = 0;
  for (let i = 0; i < n; i++) {
    out.push({ beat, dur: 0.5, midi: tonic + SC[d] });
    d = Math.max(0, Math.min(7, d + [-2, -1, 1, 1, 2][Math.floor(r() * 5)]));
    beat += r() < 0.3 ? 1 : 0.5;
  }
  return out;
}

// ---------------------------------------------------------------- trading fours

/** The app's answer to the player's four bars: their opening cell, sequenced up a step and inverted, then home. */
export function tradeAnswer(player: PNote[], tonic: number, startBeat: number): PNote[] {
  const ns = [...player].sort((a, b) => a.beat - b.beat);
  const cell = ns.slice(0, Math.min(4, ns.length));
  if (cell.length < 2) return [{ beat: startBeat, dur: 2, midi: tonic + 12 }];
  const base = cell[0].beat;
  const out: PNote[] = [];
  const add = (ofs: number, f: (n: PNote) => number) => cell.forEach((n) => out.push({ beat: startBeat + ofs + (n.beat - base), dur: n.dur || 0.5, midi: f(n) }));
  add(0, (n) => n.midi + 2); // sequenced a step up
  add(4, (n) => cell[0].midi + 2 - (n.midi - cell[0].midi)); // inverted
  add(8, (n) => n.midi - 2); // a step down
  out.push({ beat: startBeat + 12, dur: 2, midi: tonic + 12 });
  return out;
}
