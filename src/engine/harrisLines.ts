// Barry Harris lines (docs/BARRY-HARRIS-THEORY.md §8–§9; docs/research/BARRY-HARRIS-METHOD.md Parts A2, A3, A6, E):
// the line devices the research found missing, as pure note generators. Every function returns absolute MIDI pitches on
// a beat grid (quarter-note beats from 0; eighths = 0.5) with `ct` marking the notes the device puts on the beats.
// The keys family k-harrisline, the guitar levels g-harris 11+, the bass levels b-barry 9+, the voice levels v-barry
// 8+ and the topic bh-line-ear are all built on these; tests/harrisLines.test.ts checks the notes.
//
// Sources (keys from docs/research/BARRY-HARRIS-METHOD.md §0):
// - Barry's chromatic scale: Larsen [JL], Otto [MO], Parks / Open Studio [PO], Echols ep.5 [E] — scale degrees on the
//   beats, chromatic notes between, and at an existing half step a skip to the scale note above, then back.
//   The DESCENDING form mirrors it (the skip goes to the scale note below and comes back up), which is Otto's
//   "approach the half-step degrees from below" — the exact notes are not shown in the sources: (verify).
// - The extra-note rules: Parks, *Things I've Learned* video 5 [P5]; Goren, *Barry Harris Companion* [BC]; the Rees
//   workbook as quoted [HS, MR]. The miscellaneous rule: [MR] (Rees workbook p.10c) and [P5 5:45]. Triplets: [P5 8:19,
//   10:00] and [TR].
// - Scale outlines: Rees Workbook 1 ch.2 [R1], the study group [SG], OBT p.2 (Indiana).
// - The 5-4-3-2 phrases: Workbook 1 ch.1 [R1], notes from a workshop attendee's corrected notes [54] — (verify against
//   the workbook). The minor versions are derived here (lower the 3rd): (verify).
// - The three important arpeggios: [P5; OBT]. The ♭7-major pivot: [JL; P5]. Seven down to the 3rd: [TC; HS; H03].
//   3-to-♭9 over the family: [JL; R1; R3]. Upbeats and "feel 6 in 4": Workbook 1 ch.4 / 2 [R1; R2]. Compose a line over
//   a move: [SG] (from Harris and Rees workshops). Major arpeggios chromatically down and the ABCs in 3rds: [OBT joe2758].

export interface LineNote {
  p: number;
  beat: number;
  dur: number;
  /** A note the device puts on the beat (a chord tone, or a scale degree in the chromatic scale). */
  ct?: boolean;
}

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// ───────────────────────────── scales and chord tones ─────────────────────────────

/** Scale kinds of the chromatic scale: major, dominant, and the minor 6th-diminished (Barry's m6-dim). */
export type ChromKind = 'maj' | 'dom' | 'm6dim' | 'sixdim';
export const CHROM_SCALE: Record<ChromKind, number[]> = {
  maj: [0, 2, 4, 5, 7, 9, 11],
  dom: [0, 2, 4, 5, 7, 9, 10],
  m6dim: [0, 2, 3, 5, 7, 8, 9, 11],
  sixdim: [0, 2, 4, 5, 7, 8, 9, 11],
};

/** The rule scales: dominant (the C7 scale), major (6-chord tones 1 3 5 6), minor ("as major with ♭3"). */
export type RuleKind = 'dom' | 'maj' | 'min';
export const RULE_SCALE: Record<RuleKind, number[]> = {
  dom: [0, 2, 4, 5, 7, 9, 10],
  maj: [0, 2, 4, 5, 7, 9, 11],
  min: [0, 2, 3, 5, 7, 9, 11],
};
export const RULE_CT: Record<RuleKind, number[]> = {
  dom: [0, 4, 7, 10],
  maj: [0, 4, 7, 9],
  min: [0, 3, 7, 9],
};
/**
 * Where the extra half steps go, as [upper, lower] scale-degree pairs (semitones above the root): the chromatic note is
 * upper − 1. Dominant: one = 1–♭7; three = 3–2, 2–1, 1–♭7; two = 2–1, 1–♭7 [P5; BC]. Major: one = 6–5; three = 6–5,
 * 3–2, 2–1; two = 2–1, 6–5 [BC; HS]. Minor: as major with ♭3, so ♭3–2 leaves no room and "three" does not exist.
 */
export const RULE_PAIRS: Record<RuleKind, Partial<Record<0 | 1 | 2 | 3, [number, number][]>>> = {
  dom: { 0: [], 1: [[0, 10]], 2: [[2, 0], [0, 10]], 3: [[4, 2], [2, 0], [0, 10]] },
  maj: { 0: [], 1: [[9, 7]], 2: [[2, 0], [9, 7]], 3: [[9, 7], [4, 2], [2, 0]] },
  min: { 0: [], 1: [[9, 7]], 2: [[2, 0], [9, 7]] },
};
/** The default count for a start (semitones above the root): one from a chord tone, two from a non-chord tone. */
export const defaultCount = (kind: RuleKind, startSemi: number): 1 | 2 => (RULE_CT[kind].includes(mod12(startSemi)) ? 1 : 2);

// ───────────────────────────── D1: Barry's chromatic scale ─────────────────────────────

/**
 * Barry's chromatic scale over one octave, from `root` up (or from root + 12 down): every scale degree on a beat in 8ths.
 * A whole step gets the chromatic note between; at an existing half step the line skips to the next scale note beyond
 * the target and comes back to it (up: the note above; down: the note below). Ascending in C major:
 * C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C [JL; MO]. Returns the line (the last note held) and the indexes of the skips.
 */
export function chromaticScale(root: number, kind: ChromKind, dir: 'up' | 'down'): { line: LineNote[]; skips: number[] } {
  const sc = CHROM_SCALE[kind];
  const deg = [...sc.map((x) => root + x), root + 12];
  const ps: number[] = [];
  const skips: number[] = [];
  if (dir === 'up') {
    const beyond = [...deg, root + 12 + sc[1]];
    for (let i = 0; i < deg.length - 1; i++) {
      const a = deg[i];
      const gap = deg[i + 1] - a;
      ps.push(a);
      if (gap === 2) ps.push(a + 1);
      else if (gap === 1) {
        skips.push(ps.length);
        ps.push(beyond[i + 2]);
      } else throw new Error(`chromaticScale: gap ${gap}`);
    }
    ps.push(root + 12);
  } else {
    const d = [...deg].reverse();
    const beyond = [...d, root + sc[sc.length - 1] - 12];
    for (let i = 0; i < d.length - 1; i++) {
      const a = d[i];
      const gap = a - d[i + 1];
      ps.push(a);
      if (gap === 2) ps.push(a - 1);
      else if (gap === 1) {
        skips.push(ps.length);
        ps.push(beyond[i + 2]);
      } else throw new Error(`chromaticScale: gap ${gap}`);
    }
    ps.push(root);
  }
  const line = ps.map((p, i) => ({ p, beat: i / 2, dur: i === ps.length - 1 ? 2 : 0.5, ct: i % 2 === 0 }));
  return { line, skips };
}

/** Up and down one octave (the top shared), the scale degrees on every beat, the root held at the end. */
export function chromaticUpDown(root: number, kind: ChromKind): LineNote[] {
  const up = chromaticScale(root, kind, 'up').line;
  const down = chromaticScale(root, kind, 'down').line;
  const n = up.length - 1;
  return [...up.slice(0, n).map((x) => ({ ...x, dur: 0.5 })), ...down.map((x) => ({ ...x, beat: r6(x.beat + n / 2) }))];
}

// ───────────────────────────── the extra-note rules (D10, D14) ─────────────────────────────

/**
 * A descending line by the extra-note rules: from `start` down the rule scale of `root`, adding the `count` half steps
 * of RULE_PAIRS, each once, at its first occurrence. With `deferOnBeat` (the miscellaneous rule) an extra note that would
 * fall on a beat waits for the next occurrence, an octave lower. `pos0` is the eighth-note position of the first note
 * (an extra note on an even position is on the beat). Stops on a beat once every extra note is in and the line has run
 * at least `minLen` notes (9 = the sources' lines: C B B♭ A G F E D C).
 */
export function ruleLine(root: number, kind: RuleKind, start: number, count: 0 | 1 | 2 | 3, o: { deferOnBeat?: boolean; pos0?: number; minLen?: number } = {}): number[] {
  const sc = RULE_SCALE[kind];
  const pairs = RULE_PAIRS[kind][count];
  if (!pairs) throw new Error(`ruleLine: no ${count}-note rule for ${kind}`);
  const pos0 = o.pos0 ?? 0;
  const minLen = o.minLen ?? 9;
  const used = new Set<number>();
  const out = [start];
  let p = start;
  for (let guard = 0; guard < 40; guard++) {
    if (used.size === pairs.length && out.length >= minLen && (pos0 + out.length - 1) % 2 === 0) break;
    let q = p - 1;
    while (!sc.includes(mod12(q - root))) q--;
    const k = pairs.findIndex(([u, l], i) => !used.has(i) && mod12(p - root) === u && mod12(q - root) === l);
    if (k >= 0 && p - q === 2) {
      const onBeat = (pos0 + out.length) % 2 === 0;
      if (!(o.deferOnBeat && onBeat)) {
        used.add(k);
        out.push(p - 1);
      }
    }
    out.push(q);
    p = q;
  }
  return out;
}

/** Eighth notes from beat `b0`, the last held `last` beats; ct = a chord tone of `ct` (pitch classes). */
export function eighthsOf(ps: number[], ctPcs: number[], b0 = 0, last = 2): LineNote[] {
  return ps.map((p, i) => ({ p, beat: r6(b0 + i / 2), dur: i === ps.length - 1 ? last : 0.5, ct: ctPcs.includes(mod12(p)) }));
}
const pcsAbove = (root: number, ints: number[]): number[] => ints.map((x) => mod12(root + x));

/** A rule line from a degree (semitones above the root, in the octave above it), played twice (Parks's routine). */
export function ruleDrillLine(root: number, kind: RuleKind, startSemi: number, count: 0 | 1 | 2 | 3): LineNote[] {
  const one = ruleLine(root, kind, root + startSemi, count);
  const ct = pcsAbove(root, RULE_CT[kind]);
  return [...eighthsOf(one, ct, 0, 2), ...eighthsOf(one, ct, 8, 2)];
}

/**
 * The miscellaneous rule [MR quoting Rees p.10c; P5 5:45]: start on a note, go up the scale `up` steps, then come down by
 * the START note's rule; an extra note that would fall on a beat goes to the bottom octave. On C7 from G up to C:
 * G A B♭ C | B♭ A G F E D C B B♭ (derived, docs A2.4).
 */
export function miscRuleLine(root: number, kind: RuleKind, startSemi: number, up: number): LineNote[] {
  const sc = RULE_SCALE[kind];
  const start = root + startSemi;
  const ps = [start];
  let p = start;
  for (let i = 0; i < up; i++) {
    do p++;
    while (!sc.includes(mod12(p - root)));
    ps.push(p);
  }
  const count = RULE_CT[kind].includes(mod12(startSemi)) ? 1 : 0;
  const down = ruleLine(root, kind, p, count, { deferOnBeat: true, pos0: ps.length - 1, minLen: 8 });
  return eighthsOf([...ps, ...down.slice(1)], pcsAbove(root, RULE_CT[kind]));
}

/**
 * Triplet rules [P5; TR]. An EIGHTH-note triplet (one beat, three notes) follows its MIDDLE note's rule: the line after it
 * is the 8th-note line that starts on the middle note. `shape` 'rise': the scale note below, the middle, the note above,
 * then the line from the middle on beat 2; 'fall': the note above, the middle, then the middle's line goes on.
 * A SIXTEENTH-note triplet (three notes in an eighth) follows its FIRST note's rule: the line from the first note, its
 * first three notes squeezed into the first eighth.
 */
export function tripletLine(root: number, kind: RuleKind, semi: number, type: 'eighth-rise' | 'eighth-fall' | 'sixteenth', count?: 0 | 1 | 2 | 3): LineNote[] {
  const sc = RULE_SCALE[kind];
  const ct = pcsAbove(root, RULE_CT[kind]);
  const m = root + semi;
  const c = count ?? defaultCount(kind, semi);
  const L = ruleLine(root, kind, m, c);
  const step = (p: number, d: 1 | -1) => {
    let q = p + d;
    while (!sc.includes(mod12(q - root))) q += d;
    return q;
  };
  const isCt = (p: number) => ct.includes(mod12(p));
  const third = (x: number) => r6(x / 3);
  if (type === 'sixteenth') {
    const trip = L.slice(0, 3).map((p, i) => ({ p, beat: r6(i / 6), dur: r6(1 / 6), ct: i === 0 ? isCt(p) : false }));
    return [...trip, ...eighthsOf(L.slice(3), ct, 0.5)];
  }
  if (type === 'eighth-rise') {
    const trip = [step(m, -1), m, step(m, 1)].map((p, i) => ({ p, beat: third(i), dur: third(1), ct: i === 0 ? isCt(p) : false }));
    return [...trip, ...eighthsOf(L, ct, 1)];
  }
  const trip = [step(m, 1), m, L[1]].map((p, i) => ({ p, beat: third(i), dur: third(1), ct: i === 0 ? isCt(p) : false }));
  return [...trip, ...eighthsOf(L.slice(2), ct, 1)];
}

// ───────────────────────────── D2: scale outlines ─────────────────────────────

/** One chord of an outline: its scale (`play`) may differ from the chord written (`sym`): "ii is V". */
export interface OutlineChord {
  /** Semitones above the key. */
  deg: number;
  /** What is played: the dominant scale, major, minor (m6), or the related diminished (its arpeggio). */
  play: 'dom' | 'maj' | 'min' | 'dim';
  /** Beats (4 = a bar, 2 = half a bar). */
  beats: 2 | 4;
  /** The chord(s) as written, relative: [degree, quality] — e.g. ii (Dm7) is played as the V7 scale. */
  sym: [number, string][];
  /** The second bar of a long chord: come back down (by the rule from the octave). */
  down?: boolean;
  /** The related diminished (the app marks this bar). */
  dimBar?: boolean;
}

const OC = (deg: number, play: OutlineChord['play'], beats: 2 | 4, sym: [number, string][], o: Partial<OutlineChord> = {}): OutlineChord => ({ deg, play, beats, sym, ...o });
/**
 * The outlines (chord symbols only; changes are not copyrightable, and *Indiana* (1917) is public domain worldwide).
 * - indiana: bars 1–8 of *Back Home Again in Indiana* — I | I | VI7 | VI7 | II7 | II7 | V7 | V7 — every chord two bars:
 *   up, then down (OBT p.2; [R1] "scale outline of Indiana").
 * - blues: the jazz blues; bar 6 the related diminished (♯IV°7), bars 9–10 ii–V played as V ("ii is V"), so V7 is two
 *   bars: up, then down [SG; R1 ch.2 "use of the related diminished chord"]. The app's outline after the workbook's:
 *   the bar details are (verify).
 * - rhythm: the rhythm-changes A section, ii–V as V, half-bar chords up from the root, bar 6 IV – ♯IV°7 (the related
 *   diminished) [R1; R2 "Rhythm Changes – Seven Songs in One"].
 */
export const OUTLINES: Record<'indiana' | 'blues' | 'rhythm', { name: { en: string; he: string }; chords: OutlineChord[] }> = {
  indiana: {
    name: { en: 'the Indiana changes (Donna Lee)', he: 'המהלך של אינדיאנה (דונה לי)' },
    chords: [
      OC(0, 'maj', 4, [[0, '6']]),
      OC(0, 'maj', 4, [[0, '6']], { down: true }),
      OC(9, 'dom', 4, [[9, '7']]),
      OC(9, 'dom', 4, [[9, '7']], { down: true }),
      OC(2, 'dom', 4, [[2, '7']]),
      OC(2, 'dom', 4, [[2, '7']], { down: true }),
      OC(7, 'dom', 4, [[7, '7']]),
      OC(7, 'dom', 4, [[7, '7']], { down: true }),
    ],
  },
  blues: {
    name: { en: 'the blues', he: 'הבלוז' },
    chords: [
      OC(0, 'dom', 4, [[0, '7']]),
      OC(5, 'dom', 4, [[5, '7']]),
      OC(0, 'dom', 4, [[0, '7']]),
      OC(0, 'dom', 4, [[0, '7']], { down: true }),
      OC(5, 'dom', 4, [[5, '7']]),
      OC(6, 'dim', 4, [[6, '°7']], { dimBar: true }),
      OC(0, 'dom', 4, [[0, '7']]),
      OC(0, 'dom', 4, [[0, '7']], { down: true }),
      OC(7, 'dom', 4, [[2, 'm7']]),
      OC(7, 'dom', 4, [[7, '7']], { down: true }),
      OC(0, 'dom', 2, [[0, '7']]),
      OC(9, 'dom', 2, [[9, '7']]),
      OC(7, 'dom', 4, [[2, 'm7'], [7, '7']]),
    ],
  },
  rhythm: {
    name: { en: 'rhythm changes (A)', he: 'ריתם צ׳יינג׳ס (A)' },
    chords: [
      OC(0, 'maj', 2, [[0, '6']]),
      OC(9, 'dom', 2, [[9, '7']]),
      OC(7, 'dom', 4, [[2, 'm7'], [7, '7']]),
      OC(0, 'maj', 2, [[0, '6']]),
      OC(9, 'dom', 2, [[9, '7']]),
      OC(7, 'dom', 4, [[2, 'm7'], [7, '7']]),
      OC(0, 'maj', 2, [[0, '6']]),
      OC(0, 'dom', 2, [[0, '7']]),
      OC(5, 'maj', 2, [[5, '6']]),
      OC(6, 'dim', 2, [[6, '°7']], { dimBar: true }),
      OC(0, 'maj', 2, [[0, '6']]),
      OC(7, 'dom', 2, [[7, '7']]),
      OC(0, 'maj', 4, [[0, '6']]),
    ],
  },
};
/** The scale a chord's bar uses (up: from the root; down: from the octave). */
const OUT_SCALE: Record<'dom' | 'maj' | 'min', RuleKind> = { dom: 'dom', maj: 'maj', min: 'min' };
const DIM = [0, 3, 6, 9];

/** The bar's notes: up from the root (6 eighths + a quarter on beat 4: 1 3 5 7 on the beats), or down from the octave by the rule. */
export function outlineBar(root: number, c: OutlineChord, b0: number): LineNote[] {
  if (c.play === 'dim') {
    const n = c.beats * 2;
    const ps = Array.from({ length: n }, (_, i) => root + DIM[i % 4] + 12 * Math.floor(i / 4));
    return ps.map((p, i) => ({ p, beat: r6(b0 + i / 2), dur: 0.5, ct: true }));
  }
  const k = OUT_SCALE[c.play];
  const sc = RULE_SCALE[k];
  const ct = pcsAbove(root, RULE_CT[k]);
  const isCt = (p: number) => ct.includes(mod12(p)) || (k !== 'dom' && mod12(p - root) === 11);
  if (c.down) {
    const ps = ruleLine(root, k, root + 12, 1).slice(0, 8);
    return ps.map((p, i) => ({ p, beat: r6(b0 + i / 2), dur: 0.5, ct: isCt(p) }));
  }
  if (c.beats === 2) {
    const ps = [root, root + sc[1], root + sc[2]];
    return ps.map((p, i) => ({ p, beat: r6(b0 + i / 2), dur: i === 2 ? 1 : 0.5, ct: isCt(p) }));
  }
  const ps = sc.map((x) => root + x);
  return ps.map((p, i) => ({ p, beat: r6(b0 + i / 2), dur: i === 6 ? 1 : 0.5, ct: isCt(p) }));
}

/** The root of each bar: inside [lo, lo + 12), nearest to where the line is; a down bar starts an octave above its up bar's root. */
export function scaleOutline(key: number, chords: OutlineChord[], lo: number): { line: LineNote[]; roots: number[] } {
  const line: LineNote[] = [];
  const roots: number[] = [];
  let b = 0;
  let prevRoot = lo + mod12(key - lo);
  chords.forEach((c, i) => {
    const pc = mod12(key + c.deg);
    let root: number;
    if (c.down && i > 0) root = roots[i - 1];
    else {
      const cands = [lo + mod12(pc - lo), lo + mod12(pc - lo) - 12, lo + mod12(pc - lo) + 12].filter((x) => x >= lo - 5 && x < lo + 12);
      root = cands.reduce((a, z) => (Math.abs(z - prevRoot) < Math.abs(a - prevRoot) ? z : a));
    }
    roots.push(root);
    line.push(...outlineBar(root, c, b));
    prevRoot = root;
    b += c.beats;
  });
  return { line, roots };
}

// ───────────────────────────── D5: the 5-4-3-2 phrases ─────────────────────────────

export type PhraseQ = 'dom' | 'maj' | 'min';
export type PhraseN = 5 | 4 | 3 | 2;
/**
 * The 5-4-3-2 phrases (Workbook 1 ch.1, "'5-4-3-2' on the Major / Dominant 7th / Minor Scale"). Notes as semitones above
 * the chord root with their beats, from a workshop attendee's corrected notes [54]: (verify against the workbook).
 * Dominant (C7): 5 = G B C F E · 4 = (G) F D E♭ E (the enclosure of the 3rd) · 3 = E G B♭ D (the 3-to-9) · 2 = (rest)
 * D B♭ B C. Major: 5 and 4 the same, 3 = E G B D, 2 = (rest) D, a triplet B C C♯, D. Minor: DERIVED here, the dominant
 * shapes with the ♭3 (5 = G B C F E♭ · 4 = G F D E♭ · 3 = E♭ G B D · 2 = (rest) D B C): (verify).
 */
export const PHRASE_5432: Record<PhraseQ, Record<PhraseN, { s: number; b: number }[]>> = {
  dom: {
    5: [{ s: 7, b: 0 }, { s: 11, b: 0.5 }, { s: 12, b: 1 }, { s: 17, b: 1.5 }, { s: 16, b: 2 }],
    4: [{ s: 7, b: 0 }, { s: 5, b: 0.5 }, { s: 2, b: 1 }, { s: 3, b: 1.5 }, { s: 4, b: 2 }],
    3: [{ s: 4, b: 0 }, { s: 7, b: 0.5 }, { s: 10, b: 1 }, { s: 14, b: 1.5 }],
    2: [{ s: 14, b: 0.5 }, { s: 10, b: 1 }, { s: 11, b: 1.5 }, { s: 12, b: 2 }],
  },
  maj: {
    5: [{ s: 7, b: 0 }, { s: 11, b: 0.5 }, { s: 12, b: 1 }, { s: 17, b: 1.5 }, { s: 16, b: 2 }],
    4: [{ s: 7, b: 0 }, { s: 5, b: 0.5 }, { s: 2, b: 1 }, { s: 3, b: 1.5 }, { s: 4, b: 2 }],
    3: [{ s: 4, b: 0 }, { s: 7, b: 0.5 }, { s: 11, b: 1 }, { s: 14, b: 1.5 }],
    2: [{ s: 14, b: 0.5 }, { s: 11, b: 1 }, { s: 12, b: 4 / 3 }, { s: 13, b: 5 / 3 }, { s: 14, b: 2 }],
  },
  min: {
    5: [{ s: 7, b: 0 }, { s: 11, b: 0.5 }, { s: 12, b: 1 }, { s: 17, b: 1.5 }, { s: 15, b: 2 }],
    4: [{ s: 7, b: 0 }, { s: 5, b: 0.5 }, { s: 2, b: 1 }, { s: 3, b: 1.5 }],
    3: [{ s: 3, b: 0 }, { s: 7, b: 0.5 }, { s: 11, b: 1 }, { s: 14, b: 1.5 }],
    2: [{ s: 14, b: 0.5 }, { s: 11, b: 1 }, { s: 12, b: 1.5 }],
  },
};
/** The combined "5-4-3-2" lick on C7 [54] (verify): G B C F D E♭ E G B♭ D B♭ B C, 8ths. */
export const LICK_5432 = [7, 11, 12, 17, 14, 15, 16, 19, 22, 26, 22, 23, 24];
/** Chord tones per quality (the 7th of the major chord counts: maj7). */
export const PHRASE_CT: Record<PhraseQ, number[]> = { dom: [0, 4, 7, 10], maj: [0, 4, 7, 9, 11], min: [0, 3, 7, 9, 11] };

/** One phrase over a bar from `b0` (its last note held to the bar's end, or 1 beat at least). */
export function phrase5432(root: number, q: PhraseQ, n: PhraseN, b0 = 0, barEnd = 4): LineNote[] {
  const ns = PHRASE_5432[q][n];
  const ct = pcsAbove(root, PHRASE_CT[q]);
  return ns.map((x, i) => {
    const next = ns[i + 1]?.b;
    const dur = next !== undefined ? next - x.b : Math.max(1, barEnd - x.b);
    return { p: root + x.s, beat: r6(b0 + x.b), dur: r6(dur), ct: ct.includes(mod12(root + x.s)) };
  });
}
/** The combined lick over C7 (two bars), the root held at the end. */
export function lick5432(root: number, b0 = 0): LineNote[] {
  const ct = pcsAbove(root, PHRASE_CT.dom);
  return LICK_5432.map((s, i) => ({ p: root + s, beat: r6(b0 + i / 2), dur: i === LICK_5432.length - 1 ? 2 : 0.5, ct: ct.includes(mod12(root + s)) }));
}

// ───────────────────────────── D8: the three important arpeggios ─────────────────────────────

/** On a dominant: on 1 (I), on 5 (the minor on 5) and on ♭7 (the major on ♭7), each 1-3-5-8 [P5; OBT]. */
export const IMPORTANT_ARPS: { on: number; ints: number[]; name: { en: string; he: string } }[] = [
  { on: 0, ints: [0, 4, 7, 12], name: { en: 'on 1', he: 'על 1' } },
  { on: 7, ints: [0, 3, 7, 12], name: { en: 'the minor on 5', he: 'המינור על 5' } },
  { on: 10, ints: [0, 4, 7, 12], name: { en: 'the major on ♭7', he: 'המז׳ור על ♭7' } },
];
/** The three arpeggios on the dominant `root`: 'up' (1-3-5-8), 'down' (8-5-3-1) or 'inv' (from the 3rd: 3-5-8-10); then the root. */
export function importantArps(root: number, shape: 'up' | 'down' | 'inv'): LineNote[] {
  const line: LineNote[] = [];
  IMPORTANT_ARPS.forEach((a, k) => {
    const base = root + a.on;
    let ps = a.ints.map((x) => base + x);
    if (shape === 'down') ps = [...ps].reverse();
    if (shape === 'inv') ps = [ps[1], ps[2], ps[3], ps[1] + 12];
    ps.forEach((p, i) => line.push({ p, beat: r6(k * 2 + i / 2), dur: 0.5, ct: true }));
  });
  line.push({ p: shape === 'down' ? root : root + 12, beat: 6, dur: 2, ct: true });
  return line;
}
/**
 * One important arpeggio up (1-3-5-8, 8ths), then the dominant scale down by the rules from the next chord tone above its
 * top — "arpeggio up, scale down" [P5; R1; SG]: C E G C | E D C B B♭ A G F E; G B♭ D G | B♭ A G F E D C B B♭; B♭ D F B♭ |
 * C B B♭ A G F E D C.
 */
export function arpIntoScale(root: number, which: 0 | 1 | 2): LineNote[] {
  const a = IMPORTANT_ARPS[which];
  const up = a.ints.map((x) => root + a.on + x);
  const ctPcs = pcsAbove(root, RULE_CT.dom);
  let nt = up[3] + 1;
  while (!ctPcs.includes(mod12(nt))) nt++;
  const down = ruleLine(root, 'dom', nt, 1);
  const arp: LineNote[] = up.map((p, i) => ({ p, beat: i / 2, dur: 0.5, ct: true }));
  return [...arp, ...eighthsOf(down, ctPcs, 2)];
}

// ───────────────────────────── D9: seven down to the 3rd ─────────────────────────────

/**
 * Seven down to the 3rd [TC; HS; H03]: over the m7♭5 of a minor ii–V, play the dominant a major 3rd below it (Dø → B♭7)
 * up from its root to its 7th, then down from the 7th, landing on the 3rd of the V (B, which replaces B♭): in C minor
 * B♭ C D E♭ F G A♭ | A♭ G F E♭ D C B → C. The beats of the second bar, A♭ F D B, are B°7 = G7♭9.
 * `key` is the tonic pitch the line resolves to; the line sits around it.
 */
export function sevenDownLine(tonic: number, form: 'full' | 'down'): LineNote[] {
  const r = tonic - 2; // B♭ below C: the dominant a major 3rd below the ii (D)
  const DOMS = RULE_SCALE.dom;
  const up = DOMS.map((x) => r + x); // B♭ C D E♭ F G A♭
  const down = [...up].reverse(); // A♭ G F E♭ D C B♭
  down[down.length - 1] = tonic - 1; // B, the 3rd of G7
  const bctBar1 = pcsAbove(r, [0, 4, 7, 10]);
  const bctBar2 = pcsAbove(tonic + 7, [4, 7, 10, 13]); // G7♭9 without the root: B D F A♭
  const out: LineNote[] = [];
  let b = 0;
  if (form === 'full') {
    up.forEach((p, i) => out.push({ p, beat: r6(i / 2), dur: i === 6 ? 1 : 0.5, ct: bctBar1.includes(mod12(p)) }));
    b = 4;
  }
  down.forEach((p, i) => out.push({ p, beat: r6(b + i / 2), dur: i === 6 ? 1 : 0.5, ct: bctBar2.includes(mod12(p)) }));
  out.push({ p: tonic, beat: b + 4, dur: 2, ct: true });
  return out;
}

// ───────────────────────────── D15: 3-to-♭9 over the family ─────────────────────────────

/**
 * 3-to-♭9 over the four related dominants (the V7 of `tonic` and the dominants a minor 3rd apart: G7, B♭7, D♭7, E7 in C):
 * each one's 3rd, 5th, ♭7, ♭9 — always the same four notes, the dim on the 3rd (B D F A♭) [JL; R1; R3]. Up (or down),
 * two beats each, then the line resolves a half step into the tonic's 3rd.
 */
export function threeToFlatNine(tonic: number, dir: 'up' | 'down'): { line: LineNote[]; roots: number[] } {
  const roots = [7, 10, 1, 4].map((d) => mod12(tonic + d));
  const line: LineNote[] = [];
  let third = tonic - 1; // B below C
  roots.forEach((r, k) => {
    const t3 = third + mod12(r + 4 - third);
    const ps = [t3, t3 + 3, t3 + 6, t3 + 9];
    const xs = dir === 'up' ? ps : [...ps].reverse();
    xs.forEach((p, i) => line.push({ p, beat: r6(k * 2 + i / 2), dur: 0.5, ct: true }));
    third = t3 + 1;
  });
  const last = line[line.length - 1].p;
  // into the tonic: a half step down from ♭9 (A♭ → G) or up from the 3rd (B → C), whichever is a chord tone of I6
  const home = pcsAbove(tonic, [0, 4, 7, 9]);
  const land = home.includes(mod12(last - 1)) ? last - 1 : last + 1;
  line.push({ p: land, beat: 8, dur: 2, ct: true });
  return { line, roots };
}

// ───────────────────────────── D16: rhythm ─────────────────────────────

/** Feel 6 in 4 [R2]: a melody in dotted quarters (option 'dotted') or in three-note cells of 8ths over 4/4, 3 bars. */
export function feelSixLine(root: number, shape: 'dotted' | 'cells'): LineNote[] {
  const ct = pcsAbove(root, [0, 4, 7, 10]);
  if (shape === 'dotted') {
    const ps = [0, 4, 7, 10, 12, 10, 7, 4].map((x) => root + x);
    return ps.map((p, i) => ({ p, beat: r6(i * 1.5), dur: i === ps.length - 1 ? 1.5 : 1.5, ct: ct.includes(mod12(p)) }));
  }
  // cells of three 8ths, each cell starting on a chord tone on the dotted-quarter grid
  const cells = [[0, 2, 4], [7, 5, 4], [10, 9, 7], [12, 10, 9], [7, 9, 10], [4, 5, 7], [2, 4, 5], [0, -1, 0]];
  return cells.flatMap((c, k) => c.map((x, i) => ({ p: root + x, beat: r6(k * 1.5 + i / 2), dur: 0.5, ct: i === 0 })));
}

// ───────────────────────────── D19: arpeggios chromatically down, the ABCs in 3rds ─────────────────────────────

/** Major triads chromatically down from `root` (C G E C → B F♯ D♯ B …), `n` of them; inv 0 = 8-5-3-1, 1 = 10-8-5-3, 2 = 5-3-1-5 (from the top down). */
export function chromaticArpsDown(root: number, n: number, inv: 0 | 1 | 2): LineNote[] {
  const shapes = [[12, 7, 4, 0], [16, 12, 7, 4], [19, 16, 12, 7]];
  const line: LineNote[] = [];
  for (let k = 0; k < n; k++) shapes[inv].forEach((x, i) => line.push({ p: root - k + x, beat: r6(k * 2 + i / 2), dur: 0.5, ct: true }));
  line.push({ p: root - n + shapes[inv][0], beat: n * 2, dur: 2, ct: true });
  return line;
}
/**
 * The ABCs in 3rds [R1; OBT joe2758]: 'plain' = the major scale in 3rds up and down (C E D F E G …); 'half' = each third
 * with a half step below its first note, as triplets (as transcribed from the 7th: B C E | C♯ D F | D♯ E G …).
 */
export function abcThirds(root: number, shape: 'plain' | 'half'): LineNote[] {
  const sc = RULE_SCALE.maj;
  const at = (d: number) => root + sc[mod12(((d % 7) + 7) % 7)] + 12 * Math.floor(d / 7);
  const ct = pcsAbove(root, [0, 4, 7, 11]);
  if (shape === 'plain') {
    // up: C E D F E G F A G B A C B D; down from the top: E C D B C A B G A F G E F D E C; the root held
    const up: number[] = [];
    for (let d = 0; d < 7; d++) up.push(at(d), at(d + 2));
    const down: number[] = [];
    for (let d = 9; d >= 2; d--) down.push(at(d), at(d - 2));
    const all = [...up, ...down];
    return all.map((p, i) => ({ p, beat: r6(i / 2), dur: i === all.length - 1 ? 2 : 0.5, ct: i % 2 === 0 && ct.includes(mod12(p)) }));
  }
  const line: LineNote[] = [];
  for (let d = 0; d < 8; d++) {
    const lo = at(d);
    [lo - 1, lo, at(d + 2)].forEach((p, i) => line.push({ p, beat: r6(d + i / 3), dur: r6(1 / 3), ct: false }));
  }
  line.push({ p: at(7), beat: 8, dur: 2, ct: true });
  return line;
}

// ───────────────────────────── D17: compose a line over a move ─────────────────────────────

/** The moves of D17 as [degree, quality, beats]: I → VI7, ii–V–I, and the rhythm-changes A section (a tune that uses both). */
export const MOVES: Record<'i-vi' | 'ii-v' | 'rhythm', { name: { en: string; he: string }; chords: [number, '6' | '7' | 'm7', number][] }> = {
  'i-vi': { name: { en: 'I → VI7', he: 'I → VI7' }, chords: [[0, '6', 4], [9, '7', 4], [0, '6', 4], [9, '7', 4]] },
  'ii-v': { name: { en: 'ii–V–I', he: 'ii–V–I' }, chords: [[2, 'm7', 4], [7, '7', 4], [0, '6', 4], [0, '6', 4]] },
  rhythm: {
    name: { en: 'rhythm changes (A, bars 5–8)', he: 'ריתם צ׳יינג׳ס (A, תיבות 5–8)' },
    // bars 5–8 of the A section: I I7 | IV iv | I VI7 | ii V — both moves inside the tune, at tune speed (one screen)
    chords: [[0, '6', 2], [0, '7', 2], [5, '6', 2], [5, 'm7', 2], [0, '6', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]],
  },
};
export const MOVE_CT: Record<'6' | '7' | 'm7', number[]> = { '6': [0, 4, 7, 9], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] };
export const MOVE_SCALE: Record<'6' | '7' | 'm7', number[]> = { '6': [0, 2, 4, 5, 7, 9, 11], '7': [0, 2, 4, 5, 7, 9, 10], m7: [0, 2, 3, 5, 7, 9, 10] };

/**
 * A model line over a move, by the rules: every chord's bar down its scale from the chord tone nearest the last note,
 * with the extra half steps where the next chord tone is a whole step away (chord tones on every beat), and the last
 * eighth of each chord a half step into the next chord's tone where one fits. The player writes their own; this one is
 * shown after the take.
 */
export function moveModel(key: number, chords: [number, '6' | '7' | 'm7', number][], lo: number, hi: number, start: number): LineNote[] {
  const line: LineNote[] = [];
  const cts = chords.map(([d, q]) => MOVE_CT[q].map((x) => mod12(key + d + x)));
  /** The chord tone of chord i nearest p (inside the range, low enough to fall a few beats). */
  const startOf = (i: number, p: number): number => {
    const ct = cts[i];
    let x = p;
    for (let k = 0; k < 12; k++) {
      if (ct.includes(mod12(p - k)) && p - k >= lo) {
        x = p - k;
        break;
      }
      if (ct.includes(mod12(p + k)) && p + k <= hi) {
        x = p + k;
        break;
      }
    }
    return x - 7 < lo ? x + 12 : x;
  };
  let x = startOf(0, start);
  let b = 0;
  chords.forEach(([d, q, beats], ci) => {
    const ct = cts[ci];
    const sc = MOVE_SCALE[q].map((y) => mod12(key + d + y));
    for (let beat = 0; beat < beats; beat++) {
      line.push({ p: x, beat: b + beat, dur: 0.5, ct: true });
      // the next chord tone below; between: the scale note, or the chromatic note (the half-step rule)
      let nx = x - 1;
      while (!ct.includes(mod12(nx))) nx--;
      if (x - nx === 1) {
        nx--;
        while (!ct.includes(mod12(nx))) nx--;
      }
      const last = beat === beats - 1;
      if (last && ci + 1 < chords.length) nx = startOf(ci + 1, nx);
      else if (nx < lo) nx += 12;
      let mid: number;
      if (nx < x - 1 && !(last && ci + 1 < chords.length)) {
        mid = x - 1;
        for (let q2 = x - 1; q2 > nx; q2--) if (sc.includes(mod12(q2))) mid = q2;
      } else {
        // into the next chord (or after a leap): a half step above the target, or below if that is where we are
        mid = nx + 1 === x ? nx - 1 : nx + 1;
      }
      line.push({ p: mid, beat: b + beat + 0.5, dur: 0.5, ct: false });
      x = nx;
    }
    b += beats;
  });
  return line;
}

// ───────────────────────────── Part F additions (Parks, Echols) ─────────────────────────────

/**
 * Tune outlines in Parks's order [TILF EP 1, 2, 8, 9, 14, 18, 23, 104; F2.2]: blues, rhythm changes, Cherokee, Donna Lee
 * (= the Indiana changes), How High the Moon, Night in Tunisia, All the Things You Are, Giant Steps. CHORD CHARTS ONLY
 * (no melody), relative to the tune's key, typed from the standard changes — the Cherokee, How High the Moon and Night
 * in Tunisia charts are (verify) against a fake book. Each is the tune's opening (8 or 16 bars).
 */
export const TUNE_CHARTS: Record<'cherokee' | 'hhtm' | 'tunisia' | 'attya' | 'giant', { name: { en: string; he: string }; key: number; minor?: boolean; text: string }> = {
  cherokee: { name: { en: 'Cherokee', he: 'צ׳רוקי' }, key: 10, text: 'Bbmaj7 | Fm7 Bb7 | Ebmaj7 | Ab7 | Bbmaj7 | C7 | Cm7 | F7' },
  hhtm: { name: { en: 'How High the Moon', he: 'האו היי דה מון' }, key: 7, text: 'Gmaj7 | Gmaj7 | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | Bb7 | Ebmaj7 | Am7b5 D7 | Gmaj7 | Am7 D7 | Bm7 | E7 | Am7 | D7' },
  tunisia: { name: { en: 'A Night in Tunisia', he: 'לילה בתוניסיה' }, key: 2, minor: true, text: 'Eb7 | Dm6 | Eb7 | Dm6 | Eb7 | Dm6 | Em7b5 A7 | Dm6' },
  attya: { name: { en: 'All the Things You Are', he: 'אול דה ת׳ינגס יו אר' }, key: 8, text: 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | G7 | Cmaj7 | Cmaj7' },
  giant: { name: { en: 'Giant Steps', he: 'ג׳איינט סטפס' }, key: 11, text: 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7' },
};
const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/**
 * A chart (bars split by |, one or two chords a bar) as an outline relative to `key`: maj7 / 6 → major; 7 → dominant;
 * m7 → its dominant a 4th up ("ii is V"); m7♭5 → the dominant a major 3rd down; m6 / m → minor; °7 → the diminished.
 * A chord held two bars goes up, then down [F2.2; A2.5].
 */
export function outlineFromChart(text: string, key: number): OutlineChord[] {
  const out: OutlineChord[] = [];
  const bars = text.split('|').map((b) => b.trim().split(/\s+/).filter(Boolean));
  let prev = '';
  bars.forEach((bar) => {
    bar.forEach((sym) => {
      const m = /^([A-G])([b#]?)(.*)$/.exec(sym)!;
      const root = mod12(NOTE_PC[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) - key);
      const q = m[3];
      let deg = root;
      let play: OutlineChord['play'] = 'maj';
      let qs = q === 'maj7' || q === '6' || q === '' ? '6' : q;
      if (q === '7') play = 'dom';
      else if (q === 'm7') {
        play = 'dom';
        deg = mod12(root + 5);
        qs = 'm7';
      } else if (q === 'm7b5') {
        play = 'dom';
        deg = mod12(root - 4);
        qs = 'ø7';
      } else if (q === 'm6' || q === 'm') {
        play = 'min';
        qs = 'm6';
      } else if (q === 'dim7') {
        play = 'dim';
        qs = '°7';
      }
      const beats = (bar.length === 2 ? 2 : 4) as 2 | 4;
      const id = `${deg}${play}`;
      const down = beats === 4 && prev === id && !out[out.length - 1]?.down && play !== 'dim';
      out.push(OC(deg, play, beats, [[root, qs]], down ? { down: true } : {}));
      prev = beats === 4 ? id : '';
    });
  });
  return out;
}

/**
 * Barry's chromatic scale in two voices (Echols LL 8 [F E05]): the 6-dim scale's chromatic scale with a second voice in
 * 3rds (the scale note two steps below in the 8-note scale) or 6ths (two steps above, an octave down) — along one floor,
 * so 6-chord notes pair with 6-chord notes and dim notes with dim notes; a chromatic note slides in parallel into the
 * next pair. Returns [upper, lower] pairs on the line's grid. The voicing is the app's reading of "along a floor":
 * (verify).
 */
export function chromaticTwoVoices(root: number, kind: 'sixdim' | 'm6dim', dir: 'up' | 'down', interval: '3rds' | '6ths'): { pairs: [number, number][]; line: LineNote[] } {
  const line = chromaticScale(root, kind, dir).line;
  const sc = CHROM_SCALE[kind];
  const inSc = (p: number) => sc.includes(mod12(p - root));
  const steps = (p: number, n: number) => {
    let q = p;
    const d = n > 0 ? 1 : -1;
    for (let k = 0; k < Math.abs(n); k++) {
      do q += d;
      while (!inSc(q));
    }
    return q;
  };
  const voiceOf = (p: number) => (interval === '3rds' ? steps(p, -2) : steps(p, 2) - 12);
  const pairs: [number, number][] = line.map((n, i) => {
    if (inSc(n.p)) return [n.p, voiceOf(n.p)];
    const next = line[i + 1] ?? line[i - 1];
    return [n.p, n.p - (next.p - voiceOf(next.p))];
  });
  return { pairs, line };
}

/**
 * Parks's warm-up "the dominant scale eight ways" on F7 (WoS L2; the [P5] PDF), as the app reads it: up an octave from
 * each degree 1–7, then down by that degree's extra-note rule; the eighth way down from the octave with three half steps
 * (Parks's root option). The exact eight are (verify).
 */
export function eightWays(root: number, way: number): LineNote[] {
  const sc = RULE_SCALE.dom;
  const ct = pcsAbove(root, RULE_CT.dom);
  if (way >= 7) return eighthsOf(ruleLine(root, 'dom', root + 12, 3), ct);
  const up: number[] = [];
  for (let k = 0; k < 7; k++) up.push(root + sc[(way + k) % 7] + 12 * Math.floor((way + k) / 7));
  const top = root + sc[way] + 12;
  const down = ruleLine(root, 'dom', top, defaultCount('dom', sc[way]));
  return eighthsOf([...up, ...down], ct);
}
