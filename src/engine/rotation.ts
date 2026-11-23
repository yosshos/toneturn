// Rule-based improvisation with a scale per chord, rotated (docs/SPEC-RBI-ROTATION.md, track A; research in
// docs/research/CHORD-SCALE-ROTATION.md; owner answers 2026-11-22: altered over V→major from T2, half-whole over
// V→minor only from T4). Pure.
//
//   1. the harmony timeline: each chord span with its function — a dominant by what it resolves to a fifth down (a
//      major, minor or dominant target; otherwise not resolving), the tonic minor by its chord;
//   2. the menus: per function, the chord-scales open at the tier, mild → tense (Aebersold's order);
//   3. colour notes: what a chosen scale adds over the function's default scale (the notes the rotation tests);
//   4. the rotation: per chorus (T1–2) or every 4 bars (T3+), each function's scale picked by need (never played on
//      that function → lowest colour coverage → longest ago), ~15 % maintenance of scales already strong;
//   5. logical half-bar substitutions by tier (each leads to the next chord);
//   6. the note classifier and the metrics: in-set rate, chord tones on strong beats, avoid faults, colour coverage,
//      the resolution across the changes.

import { MODE_STEPS, type ModeId } from './modes';

/** One chord in beats (as ruleCards.spansOfChart gives it): root pitch class, intervals above the root. */
export interface ChordSpan {
  at: number;
  beats: number;
  root: number;
  iv: number[];
}

export type Quality = 'maj' | 'm7' | 'mtonic' | 'hd7' | 'dom' | 'dim7' | 'sus';
/**
 * The chord functions the menus are keyed by. `i` = tonic minor m6 (or a plain minor triad), `iM7` = tonic mMaj7,
 * `i7` = a tonic minor played as m7 (Dorian); `iv` = the borrowed minor iv (m6), `iv7` = a minor iv m7 (the backdoor's iv, the iv of a minor key);
 * `V-sec` = a dominant resolving a fifth down to another dominant (D7 → G7); `V-sub` = a non-resolving dominant
 * brought in by a sub (the tritone sub, the backdoor ♭VII7).
 */
export type Fn = 'I' | 'IV' | 'ii' | 'iii' | 'vi' | 'i' | 'iM7' | 'i7' | 'iv' | 'iv7' | 'iiø' | 'V-maj' | 'V-min' | 'V-sec' | 'V-free' | 'V-sub' | 'dim' | 'sus';

export interface HarmonySpan extends ChordSpan {
  q: Quality;
  fn: Fn;
  /** The local key centre the chord sits in (keyAreas). */
  key?: KeyCentre;
  /** A substitution inserted by the rotation (shown above the original). */
  sub?: { root: number; iv: number[]; label: { en: string; he: string } };
}

const mod = (n: number) => ((n % 12) + 12) % 12;
const has = (iv: number[], x: number) => iv.some((i) => mod(i) === x);

/**
 * A chord's quality from its 3rd and 7th (6th). A major 3rd makes it major or dominant whatever else is stacked on
 * it — the ♯9 of a 7♯9 / 7alt is a tension (the same pitch class as a minor 3rd), never the chord's 3rd.
 */
export function qualityOf(iv: number[]): Quality {
  const M3 = has(iv, 4), m3 = has(iv, 3) && !M3, b5 = has(iv, 6), m7 = has(iv, 10), M7 = has(iv, 11), d7 = has(iv, 9) && !m7 && !M7;
  if (m3 && b5 && d7) return 'dim7';
  if (m3 && b5 && m7) return 'hd7';
  if (m3 && (M7 || (!m7 && has(iv, 9)))) return 'mtonic';
  if (m3) return m7 ? 'm7' : 'mtonic';
  if (!M3 && has(iv, 5) && m7) return 'sus';
  if (M3 && m7) return 'dom';
  return 'maj';
}

const sameChord = (a: ChordSpan, b: ChordSpan) => a.root === b.root && a.iv.length === b.iv.length && a.iv.every((x, k) => x === b.iv[k]);

/** The next span with a different chord (a chord held over several spans looks past itself); the form wraps. */
function nextOther(spans: ChordSpan[], i: number): ChordSpan | undefined {
  for (let k = 1; k < spans.length; k++) {
    const n = spans[(i + k) % spans.length];
    if (!sameChord(n, spans[i])) return n;
  }
  return undefined;
}

/** A key centre: its tonic pitch class and whether it is minor. */
export interface KeyCentre {
  tonic: number;
  minor: boolean;
}

/** The pitch classes a key holds: major = Ionian; minor = natural, harmonic and melodic minor together (the jazz
 *  minor key mixes all three: Levine, The Jazz Theory Book, the minor-key scales). */
const MAJOR_KEY = [0, 2, 4, 5, 7, 9, 11];
const MINOR_KEY = [0, 2, 3, 5, 7, 8, 9, 10, 11];
/** A chord's own tones (root, 3rd, 5th, 7th / 6th; the tensions above the octave left out) all sit in the key. */
function diatonicIn(c: { root: number; iv: number[] }, k: KeyCentre): boolean {
  const set = k.minor ? MINOR_KEY : MAJOR_KEY;
  return c.iv.filter((x) => x < 12).every((x) => set.includes(mod(c.root + x - k.tonic)));
}

/**
 * The key areas of a chart (SPEC-RBI-ROTATION §1: a chord's function is relative to the key it sits in, not to one
 * global tonic). The textbook analysis (Levine, The Jazz Theory Book: the II–V–I and the tune analyses):
 *   1. cadences establish a local tonic: a dominant resolving to a major or minor tonic chord a fifth down (V–I), a
 *      half step down (the tritone sub, ♭II7–I) or a whole step up (the backdoor, ♭VII7–I), with the ii (m7 or ø) a
 *      fourth below the dominant when there is one. The ii, the V and the I all sit in that key.
 *   2. a minor seventh reached by a V is NOT a tonic when it is itself the ii of a ii–V (A7 → Dm7 G7: V of ii), or
 *      when it falls a fifth straight into a ii–V(–I) of another key it is diatonic to (the vi of a vi–ii–V–I: All the Things
 *      You Are's turnaround Gm7♭5 C7 → Fm7 → B♭m7 E♭7 A♭maj7 keeps Fm7 as vi of A♭);
 *   3. a chord outside every cadence inherits the key around it: the neighbouring key it is the tonic chord of; else
 *      the preceding key if it is diatonic there (a key holds until a new cadence displaces it), else the following
 *      key if diatonic there, else the nearer one.
 *   The form wraps (a rotation loops the chorus), so a last-bar turnaround resolves into the first bar.
 * Index-aligned with `chords`; null for every chord when the chart has no cadence at all (a modal vamp, a blues of
 * dominants), so the caller falls back to one tonic.
 */
export function keyAreas(chords: { root: number; iv: number[] }[]): (KeyCentre | null)[] {
  const n = chords.length;
  const out: (KeyCentre | null)[] = chords.map(() => null);
  if (!n) return out;
  // the chords as events: a chord held over several spans is one event
  const ev: number[][] = [];
  chords.forEach((c, i) => {
    const last = ev[ev.length - 1];
    if (last && sameChord(chords[last[0]] as ChordSpan, c as ChordSpan)) last.push(i);
    else ev.push([i]);
  });
  const m = ev.length;
  if (m < 2) return out;
  const E = (k: number) => chords[ev[((k % m) + m) % m][0]];
  const Q = (k: number) => qualityOf(E(k).iv);
  const key: (KeyCentre | null)[] = ev.map(() => null);
  /** A cadence at dominant event k into event k+1 (or null): its target's key and whether a ii comes before it. */
  const cadence = (k: number): { target: number; key: KeyCentre; ii: boolean } | null => {
    if (Q(k) !== 'dom') return null;
    const d = E(k), t = E(k + 1), tq = Q(k + 1);
    if (!(tq === 'maj' || tq === 'mtonic' || tq === 'm7')) return null;
    const dist = mod(t.root - d.root);
    if (!(dist === 5 || dist === 11 || dist === 2)) return null;
    // a minor seventh is a tonic only after a plain V; the backdoor resolves to a major I
    if ((tq === 'm7' && dist !== 5) || (dist === 2 && tq !== 'maj')) return null;
    const pq = Q(k - 1);
    const ii = m > 2 && (pq === 'm7' || pq === 'hd7') && mod(d.root - E(k - 1).root) === 5;
    return { target: k + 1, key: { tonic: t.root, minor: tq !== 'maj' }, ii };
  };
  const cads = ev.map((_, k) => cadence(k));
  /** A ii–V(–I) starting at event k: the key it resolves to, or 'open' for a ii–V that does not resolve. */
  const iiV = (k: number): KeyCentre | 'open' | null => {
    const q = Q(k);
    if (!(q === 'm7' || q === 'hd7') || Q(k + 1) !== 'dom' || mod(E(k + 1).root - E(k).root) !== 5) return null;
    return cads[(k + 1) % m]?.key ?? 'open';
  };
  for (let k = 0; k < m; k++) {
    const c = cads[k];
    if (!c) continue;
    const t = c.target % m;
    if (Q(t) === 'm7') {
      // rule 2: a minor seventh that is the ii of a ii–V, or the vi leading into another key's ii–V
      if (iiV(t) !== null) continue;
      const nx = iiV(t + 1);
      if (nx && nx !== 'open' && mod(E(t + 1).root - E(t).root) === 5 && nx.tonic !== E(t).root && diatonicIn(E(t), nx)) continue;
    }
    for (const j of c.ii ? [k - 1, k, t] : [k, t]) {
      const jj = ((j % m) + m) % m;
      key[jj] ??= c.key;
    }
  }
  if (key.every((x) => !x)) return out;
  // rule 3: the chords outside every cadence inherit the key around them
  const anchored = key.slice();
  for (let k = 0; k < m; k++) {
    if (anchored[k]) continue;
    let b = 1, f = 1;
    while (!anchored[(((k - b) % m) + m) % m]) b++;
    while (!anchored[(k + f) % m]) f++;
    const P = anchored[(((k - b) % m) + m) % m]!, N = anchored[(k + f) % m]!;
    // a major or minor tonic chord that is the tonic of a neighbouring key is that key (rhythm changes: | E♭ E°7 | B♭ G7 |)
    const q = Q(k);
    const isTonic = (x: KeyCentre) => (q === 'maj' || q === 'mtonic') && x.tonic === E(k).root && x.minor === (q === 'mtonic');
    key[k] = isTonic(P) ? P : isTonic(N) ? N : diatonicIn(E(k), P) ? P : diatonicIn(E(k), N) ? N : f < b ? N : P;
  }
  ev.forEach((idx, k) => idx.forEach((i) => (out[i] = key[k])));
  return out;
}

/**
 * The function of each chord from its neighbours and its local key (SPEC-RBI-ROTATION §1; keyAreas). A dominant is
 * filtered by the quality of the chord it resolves to a fifth down: a major target → V-maj, a minor or
 * half-diminished one → V-min, another dominant (a secondary dominant, D7 → G7) → V-sec; any other dominant is
 * non-resolving (V-free). A chord held over several spans takes its target from the next different chord.
 * A minor seventh followed by a dominant a fourth up is a ii (Dorian) wherever it sits (Levine, The Jazz Theory Book: every ii–V is a
 * ii–V); otherwise by its degree in the local key: major → iii (Phrygian), vi (Aeolian), iv (the borrowed iv m7,
 * Dorian), else ii (Dorian); minor → the tonic (i7, Dorian), the iv (iv7, Dorian), else ii. The tonic minor by its
 * quality (m6 → i, mMaj7 → iM7); a minor 6th on the 4th degree is the borrowed iv. A major chord on the local 4th
 * degree, or on the ♭6 of a minor key (Levine: ♭VImaj7 → Lydian), is a IV; else a I. `tonic` is the fallback
 * key when the chart has no cadence at all (minor when the chord on it is minor).
 */
export function harmonyOf(spans: ChordSpan[], tonic: number): HarmonySpan[] {
  const areas = keyAreas(spans);
  const onTonic = spans.find((s) => s.root === mod(tonic));
  const fallback: KeyCentre = { tonic: mod(tonic), minor: !!onTonic && ['m7', 'mtonic'].includes(qualityOf(onTonic.iv)) };
  return spans.map((s, i) => {
    const q = qualityOf(s.iv);
    const next = nextOther(spans, i);
    const nq = next ? qualityOf(next.iv) : 'maj';
    const key = areas[i] ?? fallback;
    const deg = mod(s.root - key.tonic);
    const toNext = next ? mod(next.root - s.root) : -1;
    let fn: Fn;
    if (q === 'dom') {
      if (toNext === 5) fn = nq === 'm7' || nq === 'mtonic' || nq === 'hd7' ? 'V-min' : nq === 'dom' || nq === 'sus' ? 'V-sec' : nq === 'maj' ? 'V-maj' : 'V-free';
      else fn = 'V-free';
    } else if (q === 'm7') {
      if (toNext === 5 && nq === 'dom') fn = 'ii';
      else if (key.minor) fn = deg === 0 ? 'i7' : deg === 5 ? 'iv7' : 'ii';
      else fn = deg === 4 ? 'iii' : deg === 9 ? 'vi' : deg === 5 ? 'iv7' : deg === 0 ? 'i7' : 'ii';
    } else if (q === 'mtonic') fn = has(s.iv, 11) ? 'iM7' : deg === 5 ? 'iv' : 'i';
    else if (q === 'hd7') fn = 'iiø';
    else if (q === 'dim7') fn = 'dim';
    else if (q === 'sus') fn = 'sus';
    else fn = deg === 5 || (key.minor && deg === 8) ? 'IV' : 'I';
    return { ...s, q, fn, key };
  });
}

export interface MenuEntry {
  mode: ModeId;
  /** The tier it opens at. */
  min: number;
}

/** The chord-scale menus per function, mild → tense; the first entry is the function's default. */
export const MENUS: Record<Fn, MenuEntry[]> = {
  I: [{ mode: 'ionian', min: 0 }, { mode: 'major-pentatonic', min: 1 }, { mode: 'lydian', min: 2 }, { mode: 'bebop-major', min: 2 }],
  IV: [{ mode: 'lydian', min: 0 }, { mode: 'ionian', min: 1 }, { mode: 'major-pentatonic', min: 1 }],
  ii: [{ mode: 'dorian', min: 0 }, { mode: 'minor-pentatonic', min: 1 }],
  iii: [{ mode: 'phrygian', min: 0 }, { mode: 'dorian', min: 3 }],
  vi: [{ mode: 'aeolian', min: 0 }, { mode: 'dorian', min: 2 }],
  // the tonic minor by the chord (research §1.3): melodic minor is THE sound for m6 / mMaj7; Dorian fits an m6 but
  // its ♭7 contradicts an mMaj7; harmonic minor's ♭6 clashes with the 6th of an m6, so it serves the mMaj7 only
  i: [{ mode: 'melodic-minor', min: 0 }, { mode: 'dorian', min: 1 }, { mode: 'minor-sixth-dim', min: 3 }],
  iM7: [{ mode: 'melodic-minor', min: 0 }, { mode: 'harmonic-minor', min: 2 }, { mode: 'minor-sixth-dim', min: 3 }],
  // a tonic minor played as m7 (research §1.2, "i in a modal tune"): Dorian, minor pentatonic — no ♮7 scale
  i7: [{ mode: 'dorian', min: 0 }, { mode: 'minor-pentatonic', min: 1 }],
  // the borrowed minor iv (research S4): melodic minor or Dorian
  iv: [{ mode: 'melodic-minor', min: 0 }, { mode: 'dorian', min: 1 }],
  // a minor iv m7 — the backdoor's iv (research S3) or the iv of a minor key (Levine): Dorian
  iv7: [{ mode: 'dorian', min: 0 }],
  iiø: [{ mode: 'locrian', min: 0 }, { mode: 'locrian-sharp2', min: 2 }],
  // owner 2026-11-22: altered over a V going to major from T2. The spec's "Lydian dominant (non-resolving)" in this
  // row is the non-resolving V (V-free / V-sub / V-sec below): a V that resolves to a major chord never takes it.
  'V-maj': [{ mode: 'mixolydian', min: 0 }, { mode: 'bebop-dominant', min: 1 }, { mode: 'altered', min: 2 }, { mode: 'diminished', min: 2 }],
  // owner 2026-11-22: half-whole over a V going to minor only as an advanced colour from T4
  'V-min': [{ mode: 'phrygian-dominant', min: 0 }, { mode: 'altered', min: 2 }, { mode: 'mixolydian-b6', min: 2 }, { mode: 'diminished', min: 4 }],
  // SPEC-RBI-ROTATION §1 "Secondary dominants": D7 → G7 takes Mixolydian / Lydian dominant (research §5.2: T3)
  'V-sec': [{ mode: 'mixolydian', min: 0 }, { mode: 'lydian-dominant', min: 3 }],
  'V-free': [{ mode: 'mixolydian', min: 0 }, { mode: 'lydian-dominant', min: 2 }],
  // a sub's own dominant (§2: "D♭7 brings D♭ Lydian dominant"; the backdoor B♭7: Lydian dominant or Mixolydian)
  'V-sub': [{ mode: 'lydian-dominant', min: 0 }, { mode: 'mixolydian', min: 3 }],
  dim: [{ mode: 'whole-half', min: 0 }],
  // (the pentatonic on the ♭7 has Mixolydian's notes: no colour notes, so it is not a rotation choice)
  sus: [{ mode: 'mixolydian', min: 0 }],
};

/**
 * What a chord symbol's written tensions demand of a scale (pitch classes above the root): `need` — the written
 * tension itself; `not` — the other inflection of the same degree, which contradicts it. The chord-scale reading of a
 * symbol (Levine, The Jazz Theory Book, chord-scale theory): ♭9 excludes the natural 9; a natural 9 excludes ♭9 and ♯9; ♯9
 * excludes the natural 9; 11 / ♯11 and ♭13 / 13 exclude each other; a ♯5 that replaces the 5th excludes the natural
 * 5th. A dominant with a ♯11 and no altered 9th or 13th is Lydian dominant (Levine: 7♯11 → Lydian dominant),
 * so its 9th and 13th are natural. Intervals above the octave are tensions (parseChord: 13 = ♭9 … 21 = 13).
 */
export function writtenTensions(iv: number[]): { need: number[]; not: number[] } {
  const need = new Set<number>(), not = new Set<number>();
  const w = (x: number) => iv.includes(x);
  const rule = (x: number, pc: number, against: number[]) => {
    if (!w(x)) return;
    need.add(pc);
    for (const a of against) not.add(a);
  };
  rule(13, 1, [2]);
  rule(14, 2, [1, 3]);
  rule(15, 3, [2]);
  rule(17, 5, [6]);
  rule(18, 6, [5]);
  rule(20, 8, [9]);
  rule(21, 9, [8]);
  if (w(8) && !w(7) && has(iv, 4)) rule(8, 8, [7]);
  if (w(18) && qualityOf(iv) === 'dom' && !w(13) && !w(15) && !w(20)) for (const a of [1, 3, 8]) not.add(a);
  return { need: [...need], not: [...not] };
}

/** Does a scale over a chord honour every written tension (and contradict none)? */
export function scaleFitsChord(mode: ModeId, iv: number[]): boolean {
  const { need, not } = writtenTensions(iv);
  const pcs = MODE_STEPS[mode].map(mod);
  return need.every((p) => pcs.includes(p)) && !not.some((p) => pcs.includes(p));
}

/** Scales the written tensions may call for when no menu entry fits (the textbook scale of each symbol, Levine:
 *  7alt → altered, 7♭9 → half-whole, 7♯11 → Lydian dominant, 7♭13 → Mixolydian ♭13, 7♯5 → whole tone; sus♭9 →
 *  Phrygian, spec §1 "(T5) Phrygian / Dorian ♭2 on sus♭9"; ø9 → Locrian ♮2; maj7♯11 → Lydian). */
const BY_SYMBOL: Record<Quality, ModeId[]> = {
  dom: ['altered', 'diminished', 'phrygian-dominant', 'mixolydian-b6', 'lydian-dominant', 'mixolydian', 'whole-tone'],
  sus: ['mixolydian', 'phrygian', 'dorian-b2'],
  maj: ['ionian', 'lydian', 'lydian-augmented'],
  m7: ['dorian', 'aeolian', 'phrygian'],
  mtonic: ['melodic-minor', 'dorian', 'harmonic-minor'],
  hd7: ['locrian', 'locrian-sharp2'],
  dim7: ['whole-half'],
};

/**
 * The scales open for a span at a tier: its function's menu at the tier, filtered by the chord's written tensions
 * (SPEC-RBI-ROTATION §1 menus; a G7alt is altered, a G7♭9 never Mixolydian). The written chord outranks the tier: when
 * nothing open fits, the mildest menu entry that fits at any tier, else the symbol's own textbook scale.
 */
export function menuFor(s: HarmonySpan, tier: number): ModeId[] {
  const iv = s.sub ? s.sub.iv : s.iv;
  const fits = (m: ModeId) => scaleFitsChord(m, iv);
  const open = MENUS[s.fn].filter((e) => tier >= e.min && fits(e.mode)).map((e) => e.mode);
  if (open.length) return open;
  const any = MENUS[s.fn].find((e) => fits(e.mode));
  if (any) return [any.mode];
  const own = BY_SYMBOL[qualityOf(iv)].find(fits);
  return [own ?? MENUS[s.fn][0].mode];
}

/**
 * The plain scale a function's colour notes are measured against, where it is not the menu's first entry: a sub's
 * dominant defaults to Lydian dominant, but what that scale adds over the plain dominant scale (the ♯11) is still
 * what it tests (research §5.5, K: "Lydian: ♯11").
 */
const COLOUR_REF: Partial<Record<Fn, ModeId>> = { 'V-sub': 'mixolydian' };

/** The scale's pitch classes from a root. */
export const scalePcs = (mode: ModeId, root: number): number[] => [...new Set(MODE_STEPS[mode].map((x) => mod(root + x)))];

/** Colour notes: the scale's pitch classes the function's plain scale does not have. */
export function colourNotes(fn: Fn, mode: ModeId, root: number): number[] {
  const def = new Set(scalePcs(COLOUR_REF[fn] ?? MENUS[fn][0].mode, root));
  return scalePcs(mode, root).filter((p) => !def.has(p));
}

/** Per (function, mode): measured use — takes, mean colour coverage, last played. */
export type ModeStats = Record<string, { n: number; cov: number; last: string }>;
export const modeKey = (fn: Fn, mode: ModeId) => `${fn}|${mode}`;

/** A small deterministic generator (the rotation is reproducible for a seed). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The scale for a function: by need (never played → lowest coverage → oldest), ~15 % maintenance of strong ones.
 * `used`: the scales this take has already given the function in earlier windows — they count as the most recently
 * played, so the next window rotates to another one. `menu`: the scales open for the span (menuFor), else the
 * function's menu at the tier.
 */
export function pickScale(fn: Fn, tier: number, stats: ModeStats, rand: () => number, used?: ReadonlySet<ModeId>, menu?: ModeId[]): ModeId {
  const open = menu ?? MENUS[fn].filter((e) => tier >= e.min).map((e) => e.mode);
  if (open.length <= 1) return open[0] ?? MENUS[fn][0].mode;
  const rated = open.map((m) => ({ m, st: stats[modeKey(fn, m)] }));
  const strong = rated.filter((x) => x.st && x.st.cov >= 0.7);
  if (strong.length && rand() < 0.15) return strong[Math.floor(rand() * strong.length)].m;
  const u = (m: ModeId) => (used?.has(m) ? 1 : 0);
  rated.sort((a, b) => u(a.m) - u(b.m) || (a.st ? 1 : 0) - (b.st ? 1 : 0) || (a.st?.cov ?? 0) - (b.st?.cov ?? 0) || (a.st?.last ?? '').localeCompare(b.st?.last ?? ''));
  return rated[0].m;
}

/** How often the scales change (SPEC-RBI-ROTATION §3): once per chorus at T1–2, every 4 bars at T3, every 2 at T4, per chord at T5. */
export const rotationBars = (tier: number, chorusBars: number): number => (tier <= 2 ? chorusBars : tier === 3 ? 4 : tier === 4 ? 2 : 1);

/**
 * The scale of every span over `choruses` choruses: within one rotation window, every span of the same function keeps
 * the same scale; a new window picks again by need. Returns the scale per span (index-aligned over all choruses).
 */
export function assignScales(h: HarmonySpan[], tier: number, meter: number, chorusBars: number, choruses: number, stats: ModeStats, seed = 1): { span: HarmonySpan; mode: ModeId; window: number }[] {
  const rand = rng(seed);
  const win = rotationBars(tier, chorusBars) * meter;
  const chorusBeats = chorusBars * meter;
  const out: { span: HarmonySpan; mode: ModeId; window: number }[] = [];
  let curWin = -1;
  let picks: Record<string, ModeId> = {};
  const used: Record<string, Set<ModeId>> = {};
  for (let c = 0; c < choruses; c++)
    for (const s of h) {
      const at = c * chorusBeats + s.at;
      const w = Math.floor(at / win);
      if (w !== curWin) {
        curWin = w;
        picks = {};
      }
      // a substitution carries its own function (VI7 → V-min, the tritone sub → V-sub, the passing dim → dim); spans
      // of one function whose written tensions open different scales (G7 and G7♭9) are picked apart
      const fn = s.fn;
      const menu = menuFor(s, tier);
      const k = `${fn}|${menu.join()}`;
      if (!picks[k]) {
        const u = (used[k] ??= new Set());
        // every open scale used this take: start the cycle again
        if (menu.every((m) => u.has(m))) u.clear();
        picks[k] = pickScale(fn, tier, stats, rand, u, menu);
        u.add(picks[k]);
      }
      out.push({ span: { ...s, at }, mode: picks[k], window: w });
    }
  return out;
}

/** The chord a span sounds (its substitution's when there is one). */
const chordOf = (s: HarmonySpan): { root: number; iv: number[] } => s.sub ?? { root: s.root, iv: s.iv };

/** The guide tones of a chord: its 3rd and 7th (a sus: the 4th; a 6th chord: the 6th; a dim7: its ♭3 and °7). */
function guideTones(c: { root: number; iv: number[] }): number[] {
  const q = qualityOf(c.iv);
  const third = q === 'sus' ? 5 : q === 'maj' || q === 'dom' ? 4 : 3;
  const sev = has(c.iv, 10) ? 10 : has(c.iv, 11) ? 11 : has(c.iv, 9) ? 9 : null;
  return [third, ...(sev === null ? [] : [sev])].map((x) => mod(c.root + x));
}

/**
 * A sub is logical when it meets the criteria of SPEC-RBI-ROTATION §2 (research §2.1), checked against the chord
 * that follows it:
 *   - it leads to the next chord: its root a fifth above it, a half step above or below, or the backdoor whole step
 *     below (an m6 leads as the rootless 9th a fifth below its root: Fm6 = B♭9 without B♭, research S4); a sus leads
 *     by its 4th falling to the 3rd of the same dominant (S11);
 *   - its guide tones move by step (or stay) into chord tones of the next chord;
 *   - the bass moves chromatically or by a fifth (the backdoor: a whole step up; a sus: the bass stays);
 *   - a held melody note fits the sub's scale — the charts carry no melody yet, so there is nothing to check.
 */
export function subFits(s: HarmonySpan, next: HarmonySpan | undefined): boolean {
  if (!s.sub || !next) return false;
  const a = s.sub, b = chordOf(next);
  const qa = qualityOf(a.iv);
  const bass = mod(b.root - a.root);
  const sus = qa === 'sus' && bass === 0 && qualityOf(b.iv) === 'dom';
  const implied = qa === 'mtonic' && has(a.iv, 9) ? [a.root, mod(a.root + 5)] : [a.root];
  const backdoor = qa === 'dom' && bass === 2;
  const leads = sus || implied.some((r) => [5, 1, 11, 2].includes(mod(b.root - r)));
  const bt = b.iv.map((x) => mod(b.root + x));
  const step = guideTones(a).every((g) => bt.some((t) => Math.min(mod(t - g), mod(g - t)) <= 2));
  const bassOk = [1, 11, 5, 7].includes(bass) || sus || backdoor;
  return leads && step && bassOk;
}

const DOM7 = [0, 4, 7, 10], M7 = [0, 3, 7, 10], HD7 = [0, 3, 6, 10], M6 = [0, 3, 7, 9], SUS7 = [0, 5, 7, 10], DIM7 = [0, 3, 6, 9];
type SubLabel = { en: string; he: string };
const LBL: Record<'vi7' | 'sus' | 'iii' | 'iv' | 'dim' | 'tt' | 'bd' | 'tmp', SubLabel> = {
  vi7: { en: 'VI7 for vi (V of ii)', he: 'VI7 במקום vi (הדומיננטה של ii)' },
  sus: { en: 'Sus before V', he: 'sus לפני V' },
  iii: { en: 'iii for I', he: 'iii במקום I' },
  iv: { en: 'Minor iv', he: 'iv מינורי' },
  dim: { en: 'Passing diminished', he: 'מוקטן עובר' },
  tt: { en: 'Tritone sub', he: 'תחליף טריטון' },
  bd: { en: 'Backdoor ii–V', he: 'ii–V של הדלת האחורית' },
  tmp: { en: 'Temporary ii–V', he: 'ii–V זמני' },
};

/**
 * Logical half-bar substitutions by tier, as SPEC-RBI-ROTATION §2 lists them (research §2.2 gives each one's form;
 * at most one per 4 bars below T4; every one checked by subFits). The highest tier's subs are placed first, so a
 * player meets the subs of their own tier. Below T4 only:
 *   T1+ VI7 for a vi going to ii (S7);
 *   T2+ sus before a whole-bar V→major, | G7sus4 G7 | (S11); iii for a half-bar I before VI7, | Em7 A7 | (S10); the
 *       minor iv on the second half of a whole-bar IV going to I, | F Fm6 | C (S4); a passing ♯I°7 on the second half
 *       of a I going up to ii (S5);
 *   T3+ the tritone sub (♭II7) on the second half of a whole-bar V→major (S1; on V→minor it is a minor-key sub, T4);
 *       the backdoor ii–V for a one-bar ii–V into I, | Fm7 B♭7 | C (S3); the temporary ii–V into a minor target on
 *       the second half of a whole-bar major chord in 4/4, | Cmaj7 Em7♭5 A7 | Dm7 (S6).
 * A whole bar is a span that starts on a bar line and lasts at least a bar in the meter; a half bar needs an even
 * meter (no half-bar subs in 3/4).
 */
export function insertSubs(h: HarmonySpan[], tier: number, tonic: number, meter = 4): HarmonySpan[] {
  const half = meter / 2;
  /** The local tonic a span sits in (keyAreas), else the chart's. */
  const tk = (x: HarmonySpan) => x.key?.tonic ?? tonic;
  const even = meter % 2 === 0;
  const gap = tier >= 4 ? 1 : 4;
  const onBar = (at: number) => Math.abs(at / meter - Math.round(at / meter)) < 1e-6;
  const wholeBar = (s: HarmonySpan) => even && onBar(s.at) && s.beats >= meter - 1e-6;
  /** Spans of h replaced: the first index → its replacement and how many spans of h it consumes. */
  const chosen = new Map<number, { spans: HarmonySpan[]; n: number }>();
  const taken = new Set<number>();
  const subBars: number[] = [];
  /** How many spans of h the last candidate replaces (the backdoor takes the ii and the V). */
  let consumed = 1;
  /** The spans, if every sub among them leads logically into what follows. */
  const fit = (spans: HarmonySpan[], after: HarmonySpan | undefined) => (spans.every((x, k) => !x.sub || subFits(x, spans[k + 1] ?? after)) ? spans : null);
  const candidate = (i: number, level: number): HarmonySpan[] | null => {
    const s = h[i], prev = h[i - 1], next = h[i + 1];
    if (level === 3) {
      // the backdoor ii–V (S3): a ii–V filling one bar and resolving to I
      if (s.fn === 'ii' && next?.fn === 'V-maj' && !taken.has(i + 1) && mod(next.root - s.root) === 5 && mod(next.root + 5) === tk(next) && onBar(s.at) && Math.abs(s.beats + next.beats - meter) < 1e-6) {
        const r = fit(
          [
            { ...s, sub: { root: mod(tk(next) + 5), iv: M7, label: LBL.bd }, q: 'm7', fn: 'iv7' },
            { ...next, sub: { root: mod(tk(next) + 10), iv: DOM7, label: LBL.bd }, q: 'dom', fn: 'V-sub' },
          ],
          h[i + 2],
        );
        if (r) return (consumed = 2), r;
      }
      // the tritone sub (S1) on the second half of the last whole bar of a V going to major
      if (s.fn === 'V-maj' && wholeBar(s) && next && !sameChord(next, s)) {
        const r = fit([{ ...s, beats: s.beats - half }, { ...s, at: s.at + s.beats - half, beats: half, sub: { root: mod(s.root + 6), iv: DOM7, label: LBL.tt }, q: 'dom', fn: 'V-sub' }], next);
        if (r) return r;
      }
      // a temporary ii–V into a minor target (S6) on the second half of a whole-bar major chord (4/4)
      if (meter === 4 && s.q === 'maj' && wholeBar(s) && s.beats === meter && next && onBar(next.at) && next.q === 'm7' && (next.fn === 'ii' || next.fn === 'iii' || next.fn === 'vi')) {
        const q4 = half / 2;
        const r = fit(
          [
            { ...s, beats: half },
            { ...s, at: s.at + half, beats: q4, sub: { root: mod(next.root + 2), iv: HD7, label: LBL.tmp }, q: 'hd7', fn: 'iiø' },
            { ...s, at: s.at + half + q4, beats: q4, sub: { root: mod(next.root + 7), iv: DOM7, label: LBL.tmp }, q: 'dom', fn: 'V-min' },
          ],
          next,
        );
        if (r) return r;
      }
    }
    if (level === 2) {
      // sus before V (S11) on the first half of the first whole bar of a V going to major
      if (s.fn === 'V-maj' && wholeBar(s) && !(prev && sameChord(prev, s))) {
        const r = fit([{ ...s, beats: half, sub: { root: s.root, iv: SUS7, label: LBL.sus }, q: 'sus', fn: 'sus' }, { ...s, at: s.at + half, beats: s.beats - half }], next);
        if (r) return r;
      }
      // iii for I (S10): a half-bar I before VI7
      if (even && s.fn === 'I' && s.root === tk(s) && Math.abs(s.beats - half) < 1e-6 && next?.q === 'dom' && next.root === mod(tk(s) + 9)) {
        const r = fit([{ ...s, sub: { root: mod(tk(s) + 4), iv: M7, label: LBL.iii }, q: 'm7', fn: 'iii' }], next);
        if (r) return r;
      }
      // the minor iv (S4) on the second half of the last whole bar of a IV going to I
      if (s.fn === 'IV' && wholeBar(s) && next?.q === 'maj' && next.root === tk(s)) {
        const r = fit([{ ...s, beats: s.beats - half }, { ...s, at: s.at + s.beats - half, beats: half, sub: { root: s.root, iv: M6, label: LBL.iv }, q: 'mtonic', fn: 'iv' }], next);
        if (r) return r;
      }
      // a passing diminished (S5) on the second half of a I going up a whole step to ii
      if (s.fn === 'I' && next?.fn === 'ii' && mod(next.root - s.root) === 2 && s.beats >= 2) {
        const hb = s.beats / 2;
        const r = fit([{ ...s, beats: hb }, { ...s, at: s.at + hb, beats: hb, sub: { root: mod(s.root + 1), iv: DIM7, label: LBL.dim }, q: 'dim7', fn: 'dim' }], next);
        if (r) return r;
      }
    }
    if (level === 1 && s.fn === 'vi' && next?.fn === 'ii') return fit([{ ...s, sub: { root: s.root, iv: DOM7, label: LBL.vi7 }, q: 'dom', fn: 'V-min' }], next);
    return null;
  };
  for (const level of [3, 2, 1])
    if (tier >= level)
      for (let i = 0; i < h.length; i++) {
        if (taken.has(i)) continue;
        const bar = Math.floor(h[i].at / meter);
        if (subBars.some((b) => Math.abs(b - bar) < gap)) continue;
        consumed = 1;
        const r = candidate(i, level);
        if (!r) continue;
        const n = consumed;
        chosen.set(i, { spans: r, n });
        for (let k = 0; k < n; k++) taken.add(i + k);
        subBars.push(bar);
      }
  const out: HarmonySpan[] = [];
  for (let i = 0; i < h.length; i++) {
    const c = chosen.get(i);
    if (c) {
      out.push(...c.spans);
      i += c.n - 1;
    } else out.push(h[i]);
  }
  return out;
}

export type NoteClass = 'ct' | 'tension' | 'colour' | 'avoid' | 'passing' | 'wrong';
export interface PlayedNote {
  beat: number;
  dur: number;
  midi: number;
}

/** The chord tones of a span (the substitution's when there is one). */
export const chordPcs = (s: HarmonySpan): number[] => {
  const root = s.sub ? s.sub.root : s.root;
  const iv = s.sub ? s.sub.iv : s.iv;
  return [...new Set(iv.map((x) => mod(root + x)))];
};

/** An avoid note: a scale note a half step above a chord tone (on a dominant only the 11th over the 3rd). */
function isAvoid(pc: number, s: HarmonySpan, cts: number[]): boolean {
  const root = s.sub ? s.sub.root : s.root;
  // over a sus the 4th is a chord tone and the 3rd is the clash ("Mixolydian without the 3rd", research §1.8)
  if (s.q === 'sus') return mod(pc - root) === 4;
  if (s.q === 'dom' || s.fn.startsWith('V')) return mod(pc - root) === 5 && cts.includes(mod(root + 4));
  return cts.some((c) => mod(pc - c) === 1);
}

/** The avoid notes of a scale over a span (outlined on the keyboard). */
export function avoidPcs(s: HarmonySpan, mode: ModeId): number[] {
  const cts = chordPcs(s);
  return scalePcs(mode, s.sub ? s.sub.root : s.root).filter((p) => !cts.includes(p) && isAvoid(p, s, cts));
}

/** Classify every note against the scale active at its onset (an anticipation an eighth early belongs to the next chord). */
export function classifyNotes(notes: PlayedNote[], plan: { span: HarmonySpan; mode: ModeId }[]): NoteClass[] {
  const at = (b: number) => plan.find((p) => b >= p.span.at - 1e-6 && b < p.span.at + p.span.beats - 1e-6);
  return notes.map((n, i) => {
    let p = at(n.beat);
    const ahead = at(n.beat + 0.5);
    const pc = mod(n.midi);
    const test = (q: typeof p) => {
      if (!q) return null;
      const root = q.span.sub ? q.span.sub.root : q.span.root;
      // a note that contradicts a written tension (A over G7♭9) is never in the set, whatever the scale says
      if (writtenTensions(q.span.sub ? q.span.sub.iv : q.span.iv).not.includes(mod(pc - root))) return null;
      const cts = chordPcs(q.span);
      const sc = scalePcs(q.mode, root);
      if (cts.includes(pc)) return 'ct' as NoteClass;
      if (sc.includes(pc)) return isAvoid(pc, q.span, cts) ? 'avoid' : colourNotes(q.span.fn, q.mode, root).includes(pc) ? 'colour' : 'tension';
      return null;
    };
    let c = test(p);
    if (!c && ahead && ahead !== p) {
      const c2 = test(ahead);
      if (c2) (c = c2), (p = ahead);
    }
    if (c) return c;
    // a passing note: off the beat, short, moving a half step into the next note in the scale
    const nx = notes[i + 1];
    const off = Math.abs(n.beat - Math.round(n.beat)) > 0.15;
    if (off && n.dur <= 0.6 && nx && Math.abs(nx.midi - n.midi) === 1) return 'passing';
    return 'wrong';
  });
}

/** The colour notes of a planned span (empty for the function's default scale). */
export const spanColours = (p: { span: HarmonySpan; mode: ModeId }): number[] => colourNotes(p.span.fn, p.mode, p.span.sub ? p.span.sub.root : p.span.root);

export interface RotationMetrics {
  /** Share of note duration in the set (chord tones, tensions, colour, avoid handled, passing). */
  inSet: number;
  /** Share of notes on beats 1 and 3 that are chord tones. */
  strongCt: number;
  /** Avoid-note faults: one on a strong beat lasting a beat or more, or one that leaves by a leap (research §5.5). */
  avoidFaults: number;
  /** Spans of ≥ 2 beats whose scale has colour notes: those with at least one played ÷ such spans that had notes. */
  colour: number;
  colourSpans: number;
  /** Target resolution (shown from T3): chord changes whose first note is a chord tone of the new chord reached by a
   *  step or half step ÷ the changes that had a note before and after. */
  resolution: number;
  changes: number;
}

export function rotationMetrics(notes: PlayedNote[], plan: { span: HarmonySpan; mode: ModeId }[], meter = 4): RotationMetrics {
  const cls = classifyNotes(notes, plan);
  let dur = 0, ok = 0, strong = 0, strongOk = 0, faults = 0;
  notes.forEach((n, i) => {
    dur += n.dur;
    if (cls[i] !== 'wrong') ok += n.dur;
    const inBar = n.beat % meter;
    const onStrong = Math.abs(inBar) < 0.15 || Math.abs(inBar - meter / 2) < 0.15;
    if (onStrong) {
      strong++;
      if (cls[i] === 'ct') strongOk++;
    }
    // an avoid note is a fault when it sits on a strong beat and lasts a beat or more, or does not move on by step
    const nx = notes[i + 1];
    if (cls[i] === 'avoid' && ((onStrong && n.dur >= 1) || (nx && Math.abs(nx.midi - n.midi) > 2))) faults++;
  });
  let spans = 0, hit = 0;
  for (const p of plan) {
    if (p.span.beats < 2 || !spanColours(p).length) continue;
    const idx = notes.map((n, i) => (n.beat >= p.span.at - 1e-6 && n.beat < p.span.at + p.span.beats - 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    spans++;
    if (idx.some((i) => cls[i] === 'colour')) hit++;
  }
  // the resolution across each change of chord: the first note of the new chord (an anticipation an eighth early, or
  // the first on or after the change — the more favourable) is a chord tone reached by step from the note before it
  let changes = 0, resolved = 0;
  for (let k = 1; k < plan.length; k++) {
    const a = chordPcs(plan[k - 1].span), p = plan[k].span;
    const cts = chordPcs(p);
    if (a.length === cts.length && a.every((x) => cts.includes(x))) continue;
    const end = p.at + p.beats - 1e-6;
    const early = notes.findIndex((n) => n.beat >= p.at - 0.5 - 1e-6 && n.beat < p.at - 1e-6);
    const onIt = notes.findIndex((n) => n.beat >= p.at - 1e-6 && n.beat < end);
    const cand = [early, onIt].filter((j) => j > 0);
    if (!cand.length) continue;
    changes++;
    if (cand.some((j) => cts.includes(mod(notes[j].midi)) && [1, 2].includes(Math.abs(notes[j].midi - notes[j - 1].midi)))) resolved++;
  }
  return { inSet: dur ? ok / dur : 0, strongCt: strong ? strongOk / strong : 0, avoidFaults: faults, colour: spans ? hit / spans : 0, colourSpans: spans, resolution: changes ? resolved / changes : 0, changes };
}

/** Fold one take's coverage into the per (function, mode) stats. */
export function updateModeStats(stats: ModeStats, plan: { span: HarmonySpan; mode: ModeId }[], notes: PlayedNote[], at: string): ModeStats {
  const cls = classifyNotes(notes, plan);
  const out: ModeStats = { ...stats };
  for (const p of plan) {
    const idx = notes.map((n, i) => (n.beat >= p.span.at - 1e-6 && n.beat < p.span.at + p.span.beats - 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!idx.length || p.span.beats < 2) continue;
    const fn = p.span.fn;
    const k = modeKey(fn, p.mode);
    const cur = out[k] ?? { n: 0, cov: 0, last: '' };
    // a scale with no colour notes (the function's default) has nothing to cover: it never reads as weak
    const hit = !spanColours(p).length || idx.some((i) => cls[i] === 'colour') ? 1 : 0;
    out[k] = { n: cur.n + 1, cov: (cur.cov * cur.n + hit) / (cur.n + 1), last: at };
  }
  return out;
}
