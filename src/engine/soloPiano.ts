// Solo jazz piano after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md, Parts A–C). Pure music, no drills:
// the three registers, the left hand's three positions (bass notes, bass shells, rootless voicings), the two-note "Bud
// Powell" and three-note Type A / Type B bass shells with their variants, stride and its variations, stride-style
// comping, the left-hand shuttle, the comping vocabulary, and the four shared-hands rules. src/engine/drills/
// soloPianoDrills.ts builds the k-lh, k-tex, k-comp and k-impro families from these; voiceLead.ts grades the 'shared'
// voicing type with sharedCandidates / sharedRules.
//
// Sources (all fetched 2026-11-15, listed in the doc's source list):
//   [PSJP-B]  Siskind, Playing Solo Jazz Piano, 2nd ed., Chapter B "Three positions of the left hand" (free PDF)
//   [PSJP-A]  the same, Chapter A: three elements, three registers, the "mango problem" (free PDF)
//   [7SS]     "7 Secrets of Stride Piano" (YouTube TNm1i71s4is); [SS] "Shell Stride" (kLBp_CIizWg)
//   [SSC]     PSJP Ch. 5–6 stride-style comping (PianoWithJonny summary); [LI] "Lead-ins …" (faprE9by2bI);
//   [B3C]     "Comping Basics: Beat 3 Charleston" (__ugekzPa1w); [PO] "The Comping Variation Every Pianist Should
//             Master" (l-x_5vDpglY); [AC] "Accent Comping" (OnhS3jwnR8g); [JPF2] Jazz Piano Fundamentals Book 2
//   [SHV]     "Pro-Level Voicings for Solo Piano Jazz Ballads" (ExcZLksoxoA): the four shared-hands guidelines
//   [SHUT]    "Do the Left Hand Shuttle Like Bill Evans" (wVQRfHJF3jY)
// Procedures the free sources only name are marked `verify` exactly as the doc marks them (Part A3 "Procedures I
// inferred", A2 "verify against Ex. B.3", A5 "verify the spacing taste").

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// ───────────────────────────── chords ─────────────────────────────

export type SQ = 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | '6' | 'm6';
/** Chord tones above the root (semitones): 3rd, 5th, 7th (the 6th of a 6 chord, the ♭♭7 of a °7), 9th. */
export const SQI: Record<SQ, { third: number; fifth: number; seventh: number; ninth: number; label: string }> = {
  maj7: { third: 4, fifth: 7, seventh: 11, ninth: 14, label: 'maj7' },
  '7': { third: 4, fifth: 7, seventh: 10, ninth: 14, label: '7' },
  m7: { third: 3, fifth: 7, seventh: 10, ninth: 14, label: 'm7' },
  m7b5: { third: 3, fifth: 6, seventh: 10, ninth: 14, label: 'm7♭5' },
  dim7: { third: 3, fifth: 6, seventh: 9, ninth: 14, label: '°7' },
  '6': { third: 4, fifth: 7, seventh: 9, ninth: 14, label: '6' },
  m6: { third: 3, fifth: 7, seventh: 9, ninth: 14, label: 'm6' },
};
export interface SChord {
  /** Root pitch class. */
  root: number;
  q: SQ;
}
/** A chord placed in time (beats from 0). */
export interface TChord extends SChord {
  beat: number;
  beats: number;
}
const isDom = (q: SQ): boolean => q === '7';
const isMinorish = (q: SQ): boolean => q === 'm7' || q === 'm6' || q === 'm7b5';
/** The chord at a beat. */
export function chordAt<T extends TChord>(cs: T[], beat: number): T {
  let cur = cs[0];
  for (const c of cs) if (c.beat <= beat + 1e-6) cur = c;
  return cur;
}
/** The pitch with pitch class `pc` inside [lo, lo + 11]. */
export const pitchIn = (pc: number, lo: number): number => lo + mod12(pc - lo);

// ───────────────────────────── the three registers [PSJP-A] ─────────────────────────────

/**
 * [PSJP-A] Bass: as low as possible (the bottom two octaves); chords: the essential definition between C3 and G4 —
 * below is muddy, above is pretty but does not define the harmony; melody: about the two octaves above middle C; the top
 * two octaves for special effects only.
 */
export const REG = { bassLo: 28, bassHi: 47, chordLo: 48, chordHi: 67, melodyLo: 60, melodyHi: 84 } as const;
export type RegisterVerdict = 'ok' | 'muddy' | 'thin';
/** Where the essential tones (3rd and 7th) of a voicing sit: C3–G4 is ok, below muddy, above thin [PSJP-A]. */
export function registerCheck(essentials: number[]): RegisterVerdict {
  if (essentials.some((p) => p < REG.chordLo)) return 'muddy';
  if (essentials.some((p) => p > REG.chordHi)) return 'thin';
  return 'ok';
}
/** The 3rd and 7th of a chord inside a voicing (the pitches, not pitch classes). */
export const essentialsOf = (v: number[], c: SChord): number[] => v.filter((p) => mod12(p - c.root) === SQI[c.q].third || mod12(p - c.root) === mod12(SQI[c.q].seventh));

// ───────────────────────────── bass notes and bass shells [PSJP-B] ─────────────────────────────

/** Bass notes: a single root as low as practical, or root + 5th ("strong and open", his preferred harmonisation). */
export function bassNote(c: SChord, withFifth = false): number[] {
  const b = pitchIn(c.root, 33); // A1–G♯2: low, and above the rarely used lowest A, B♭, B
  return withFifth ? [b, b + SQI[c.q].fifth] : [b];
}

export type BPForm = '3' | '10' | '7';
/** Is a key black? (The 9th-under-the-thumb rule needs 9 and 10 the same colour.) */
export const isBlack = (pc: number): boolean => [1, 3, 6, 8, 10].includes(mod12(pc));
/** [PSJP-B] "Can't reach a 10th: add the 9th and take 9 and 10 with the thumb when both are white or both black." */
export const thumbNinthOk = (c: SChord): boolean => isBlack(c.root + SQI[c.q].ninth) === isBlack(c.root + SQI[c.q].third);

/**
 * [PSJP-B] Two-note bass shells, "Bud Powell voicings": the root plus one essential tone — the 3rd a 3rd above (C3+E3), a
 * 10th above (C2+E3: a lower, richer bass) or the 7th (C3+B3). The root sits in F2–E3 (D3+F3, G2+B2, C3+E3 as in his
 * ii–V–I), the 10th's root in G1–F♯2. `thumb9`: the 9th added under the 10th where 9 and 10 share a colour.
 */
export function bpShell(c: SChord, form: BPForm, thumb9 = false): number[] {
  const Q = SQI[c.q];
  if (form === '10') {
    const b = pitchIn(c.root, 31);
    return thumb9 && thumbNinthOk(c) ? [b, b + Q.ninth, b + 12 + Q.third] : [b, b + 12 + Q.third];
  }
  const b = pitchIn(c.root, 41);
  return [b, b + (form === '3' ? Q.third : Q.seventh)];
}
/**
 * [PSJP-B] ii–V–I in two-note shells, alternating 3rd and 7th for the voice leading: starting with the 3rd D3+F3 → G2+F3
 * → C3+E3; starting with the 7th D3+C4 → G2+B2 → C3+B3 (the second is the doc's own voicing — verify against Ex. B.3).
 */
export function bpAlternate(cs: SChord[], start: '3' | '7'): number[][] {
  return cs.map((c, i) => bpShell(c, (i % 2 === 0) === (start === '3') ? '3' : '7'));
}
/** [PSJP-B] Three-note Type A bass shell 1-3-7 (fits any hand; the bass sits fairly high): Dm7 D3-F3-C4, G7 G2-B2-F3, Cmaj7 C3-E3-B3. */
export function shellA(c: SChord): number[] {
  const b = pitchIn(c.root, 41);
  return [b, b + SQI[c.q].third, b + SQI[c.q].seventh];
}
/**
 * [PSJP-B] Three-note Type B bass shell 1-7-10 (needs a big hand): Dm7 D2-C3-F3, G7 G2-F3-B3, Cmaj7 C2-B2-E3. `thumb9`:
 * the 9th under the 10th for the thumb (where 9 and 10 share a colour) — the 9th-under-the-thumb rule applied to the
 * Type B shell is the doc's reading (verify).
 */
export function shellB(c: SChord, thumb9 = false): number[] {
  const Q = SQI[c.q];
  const b = pitchIn(c.root, 36);
  return thumb9 && thumbNinthOk(c) ? [b, b + Q.seventh, b + Q.ninth, b + 12 + Q.third] : [b, b + Q.seventh, b + 12 + Q.third];
}
/** [PSJP-B] The 5th replacing the root under a shell: a lower reach in Type A, no stretch in Type B (C: G2-E3-B3, G2-B2-E3). */
export function withFifthBass(v: number[], c: SChord): number[] {
  const top = v.slice(1);
  let f = pitchIn(c.root + SQI[c.q].fifth, Math.min(...top) - 12);
  if (f >= Math.min(...top)) f -= 12;
  return [f, ...top];
}
/** [PSJP-B] The tritone replacing the root on a dominant (a built-in tritone sub): G7 → D♭2-F3-B3. */
export function withTritoneBass(c: SChord): number[] {
  const Q = SQI[c.q];
  const b = pitchIn(c.root + 6, 36);
  const sev = pitchIn(c.root + Q.seventh, 48);
  return [b, sev, sev + mod12(Q.third - Q.seventh)];
}

// ───────────────────────────── shells (3 + 7) and rootless voicings ─────────────────────────────

/**
 * [PSJP-B] Shells: just the 3rd and the 7th, Type A (3rd below) or Type B (7th below), chosen for the smoothest voice
 * leading, kept between C3 and G4 (Cmaj7 A = E3+B3, B = B2+E3 — the B form only where its 7th stays at C3 or above).
 */
export function guideShell(c: SChord, prev: number[] | null): number[] {
  const Q = SQI[c.q];
  const t = mod12(c.root + Q.third);
  const s = mod12(c.root + Q.seventh);
  const cands: number[][] = [];
  for (let x = REG.chordLo; x <= 60; x++) {
    if (mod12(x) === t) cands.push([x, x + mod12(s - t)]);
    if (mod12(x) === s) cands.push([x, x + mod12(t - s)]);
  }
  const fit = cands.filter((v) => v[1] <= REG.chordHi);
  return nearestTo(fit.length ? fit : cands, prev, 55);
}
/** The candidate nearest the previous voicing (summed nearest moves), else nearest a centre pitch. */
export function nearestTo(cands: number[][], prev: number[] | null, centre: number): number[] {
  const cost = (v: number[]) => (prev?.length ? v.reduce((a, m) => a + Math.min(...prev.map((p) => Math.abs(p - m))), 0) : Math.abs(v.reduce((a, b) => a + b, 0) / v.length - centre));
  return cands.slice().sort((a, b) => cost(a) - cost(b))[0];
}
/**
 * [PSJP-B] Rootless voicings around middle C: Type A 3-(5)-7-9, Type B 7-9-3-(5). "Avoid stacks of thirds": on major and
 * dominant chords the 13th replaces the 5th (G7 A = B3-E4-F4-A4); on m7 the stack is accepted.
 */
export function rootless(c: SChord, type: 'A' | 'B'): number[] {
  const Q = SQI[c.q];
  const colour = c.q === 'maj7' || isDom(c.q) ? 9 : Q.fifth;
  const pcs = type === 'A' ? [Q.third, colour, Q.seventh, Q.ninth] : [Q.seventh, Q.ninth, Q.third + 12, colour + 12];
  const lo = type === 'A' ? 50 : 46;
  const base = pitchIn(c.root + pcs[0], lo);
  return pcs.map((x) => base + (x - pcs[0]));
}
/** [PSJP-B Ex. B.16] The same chord in every register: bass alone → two-note shell → Type A bass shell → Type B bass shell → Type A rootless → Type B rootless. */
export function sixPlaces(c: SChord): number[][] {
  return [bassNote(c), bpShell(c, '3'), shellA(c), shellB(c), rootless(c, 'A'), rootless(c, 'B')];
}

// ───────────────────────────── left-hand patterns: stride and its variations ─────────────────────────────

export type LRole = 'bass' | 'chord';
export interface LEv {
  beat: number;
  dur: number;
  notes: number[];
  role: LRole;
}
/** The stride bass on 1 (the root, A1–G♯2) and on 3 (the 5th, E1–D♯2: C2 | … | G1, as in Shell Stride [SS]). */
const bassOne = (c: SChord): number => pitchIn(c.root, 33);
const bassThree = (c: SChord): number => pitchIn(c.root + SQI[c.q].fifth, 28);
/** The stride chord on 2 and 4: 3-5-7 close in the middle register (G3–E4), or the shell (3 + 7) for shell stride. */
function strideChord(c: SChord, shell: boolean, prev: number[] | null): number[] {
  if (shell) return guideShell(c, prev);
  const Q = SQI[c.q];
  const cands = [0, 1, 2].map((k) => {
    const pcs = [Q.third, Q.fifth, Q.seventh];
    const ord = [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)];
    const b = pitchIn(c.root + ord[0], 52);
    return ord.map((x) => b + (x - ord[0]));
  });
  return nearestTo(cands, prev, 60);
}
/** A chromatic approach from below to the next root (the Peace Piece pattern's beat 4 walks or approaches the next downbeat). */
const approachBelow = (next: SChord): number => pitchIn(next.root - 1, 31);

/**
 * Stride and its variations, one pattern for every bar ([7SS]; the Peace Piece, 3+3+2, reversed, skip-beat and 3:4
 * procedures are the doc's inferred readings — verify every row against the book and the videos):
 *  - stride: bass on 1 and 3, chord on 2 and 4 [7SS]; shell-stride: the same with the shell (3 + 7) as the chord [SS]
 *  - peace: "low-high-high-low" — bass 1, chord 2 and 3, bass 4 approaching the next downbeat (verify)
 *  - reverse: chord on 1 and 3, bass on 2 and 4 [PSJP-B "shells on the strong beats"; reversed stride] (verify)
 *  - skip: one beat of the pattern left out (beat 4 of every second bar), room for a right-hand fill (verify)
 *  - three32: 3 + 3 + 2 in 8ths — bass on 1, chord on the "and" of 2, bass on 4 (verify)
 *  - antic-bass: the next bar's bass anticipated on the "and" of 4 [7SS "anticipate the bass"] (verify the placement)
 *  - antic-both: bass on the "and" of 4 and the chord an 8th early too [7SS "anticipate bass and chord"] (verify)
 *  - early: the chord placed earlier, on the "and" of 1 and of 3 [7SS "rhythmic variety"] (verify)
 *  - three4: a bass-chord-chord cell of three beats across 4/4 bars, realigning after three bars [7SS 3 against 4] (verify)
 *  - tenths: root + 10th on 1, the 5th + its 10th on 3, chord on 2 and 4 (stride with 10ths)
 *  - shells-strong: shell on 1 and 3, bass on 2 and 4 [PSJP-B "the shells on the strong beats"]
 *  - evans: essentials first, bass after — the shell on the "and" of 4 of the bar before, the bass on 1 [PSJP-B "Bill
 *    Evans style"] (verify the exact syncopation against his "Alone" recording)
 */
export type StridePat = 'stride' | 'shell-stride' | 'peace' | 'reverse' | 'skip' | 'three32' | 'antic-bass' | 'antic-both' | 'early' | 'three4' | 'tenths' | 'shells-strong' | 'evans';

export function stridePattern(cs: TChord[], bars: number, pat: StridePat, meter = 4): LEv[] {
  const out: LEv[] = [];
  let prev: number[] | null = null;
  const chord = (c: SChord) => {
    const v = strideChord(c, pat === 'shell-stride' || pat === 'shells-strong' || pat === 'evans', prev);
    prev = v;
    return v;
  };
  const at = (b: number) => chordAt(cs, b);
  const push = (beat: number, dur: number, notes: number[], role: LRole) => out.push({ beat: r6(beat), dur: r6(dur), notes, role });
  // the root on 1 and wherever a chord starts; the 5th on 3 under a chord already sounding
  const bassAt = (b: number) => {
    const c = at(b);
    return b % meter === 0 || Math.abs(c.beat - b) < 1e-6 ? bassOne(c) : bassThree(c);
  };
  if (pat === 'three4') {
    for (let b = 0; b < bars * meter; b += 3) {
      push(b, 1, [bassAt(b)], 'bass');
      if (b + 1 < bars * meter) push(b + 1, 1, chord(at(b + 1)), 'chord');
      if (b + 2 < bars * meter) push(b + 2, 1, chord(at(b + 2)), 'chord');
    }
    return out;
  }
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * meter;
    const c1 = at(b0);
    const c3 = at(b0 + 2);
    const next = at(b0 + meter);
    const last = bar === bars - 1;
    switch (pat) {
      case 'stride':
      case 'shell-stride':
        push(b0, 1, [bassAt(b0)], 'bass');
        push(b0 + 1, 1, chord(c1), 'chord');
        push(b0 + 2, 1, [bassAt(b0 + 2)], 'bass');
        push(b0 + 3, 1, chord(c3), 'chord');
        break;
      case 'tenths': {
        const ten = (c: SChord, onThree: boolean) => {
          const b = onThree && c === c1 ? bassThree(c) : pitchIn(c.root, 31);
          const third = onThree && c === c1 ? SQI[c.q].third - SQI[c.q].fifth : SQI[c.q].third;
          return [b, b + 12 + mod12(third)];
        };
        push(b0, 1, ten(c1, false), 'bass');
        push(b0 + 1, 1, chord(c1), 'chord');
        push(b0 + 2, 1, ten(c3, true), 'bass');
        push(b0 + 3, 1, chord(c3), 'chord');
        break;
      }
      case 'peace':
        push(b0, 1, [bassAt(b0)], 'bass');
        push(b0 + 1, 1, chord(c1), 'chord');
        push(b0 + 2, 1, chord(c3), 'chord');
        push(b0 + 3, 1, [last ? bassThree(c3) : next.root === c3.root && next.q === c3.q ? bassThree(c3) : approachBelow(next)], 'bass');
        break;
      case 'reverse':
      case 'shells-strong':
        push(b0, 1, chord(c1), 'chord');
        push(b0 + 1, 1, [bassOne(c1)], 'bass');
        push(b0 + 2, 1, chord(c3), 'chord');
        push(b0 + 3, 1, [c3 === c1 ? bassThree(c3) : bassOne(c3)], 'bass');
        break;
      case 'skip':
        push(b0, 1, [bassAt(b0)], 'bass');
        push(b0 + 1, 1, chord(c1), 'chord');
        push(b0 + 2, bar % 2 === 1 ? 2 : 1, [bassAt(b0 + 2)], 'bass');
        if (bar % 2 === 0) push(b0 + 3, 1, chord(c3), 'chord');
        break;
      case 'three32':
        push(b0, 1.5, [bassAt(b0)], 'bass');
        push(b0 + 1.5, 1.5, chord(at(b0 + 1.5)), 'chord');
        push(b0 + 3, 1, [bassAt(b0 + 2)], 'bass');
        break;
      case 'antic-bass':
        if (bar === 0) push(b0, 1, [bassAt(b0)], 'bass');
        push(b0 + 1, 1, chord(c1), 'chord');
        push(b0 + 2, 1, [bassAt(b0 + 2)], 'bass');
        push(b0 + 3, last ? 1 : 0.5, chord(c3), 'chord');
        if (!last) push(b0 + 3.5, 1.5, [bassOne(next)], 'bass');
        break;
      case 'antic-both':
        if (bar === 0) push(b0, 0.5, [bassAt(b0)], 'bass');
        push(b0 + 0.5, 1, chord(c1), 'chord');
        push(b0 + 2, 1, [bassAt(b0 + 2)], 'bass');
        push(b0 + 3, 0.5, chord(c3), 'chord');
        if (!last) push(b0 + 3.5, 1, [bassOne(next)], 'bass');
        break;
      case 'early':
        push(b0, 0.5, [bassAt(b0)], 'bass');
        push(b0 + 0.5, 1.5, chord(c1), 'chord');
        push(b0 + 2, 0.5, [bassAt(b0 + 2)], 'bass');
        push(b0 + 2.5, 1.5, chord(c3), 'chord');
        break;
      case 'evans': {
        // The shell of each bar sounds on the "and" of 4 before it (the first bar: on 1, the bass on 2), the bass after it.
        const sh = bar === 0 || !prev ? chord(c1) : prev;
        if (bar === 0) push(b0, 1, sh, 'chord');
        push(b0 + (bar === 0 ? 1 : 0), bar === 0 ? 2.5 : 3.5, [bassOne(c1)], 'bass');
        if (!last) push(b0 + 3.5, 1.5, chord(next), 'chord');
        break;
      }
    }
  }
  return out;
}

/** Bass first, shell on the beat [PSJP-B "not simultaneous"]: the bass an 8th before each chord, the shell exactly on it. */
export function rolledBass(cs: TChord[], shell: (c: SChord) => number[]): LEv[] {
  const out: LEv[] = [];
  for (const c of cs) {
    const v = shell(c);
    out.push({ beat: r6(c.beat + 4 - 0.5), dur: 0.5, notes: [v[0]], role: 'bass' });
    out.push({ beat: r6(c.beat + 4), dur: r6(c.beats), notes: v.slice(1), role: 'chord' });
  }
  return out;
}

// ───────────────────────────── walking 10ths [7SS #2] ─────────────────────────────

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/**
 * Walking 10ths [7SS #2; "Learn to Love Tenths"]: every beat a 10th — the bass plus a diatonic 10th above — moving by
 * step into the next chord. C example: C2+E3 → D2+F3 → E2+G3 → F2+A3 (C6 to F). Teddy Wilson / Hank Jones style (the
 * scalewise procedure is the doc's reading — verify). `degrees` are major-scale degrees (0 = the key's 1) per beat;
 * `chrom` maps a beat to a chromatic bass (a passing diminished) with the 10th above it a minor 10th.
 */
export function walkingTenths(key: number, degrees: number[], chrom: Record<number, number> = {}, thumb9 = false): number[][] {
  const lo = pitchIn(key, 33);
  const deg = (d: number): number => lo + 12 * Math.floor(d / 7) + MAJOR[((d % 7) + 7) % 7];
  return degrees.map((d, i) => {
    if (chrom[i] !== undefined) {
      const b = lo + chrom[i];
      return thumb9 && isBlack(b + 14) === isBlack(b + 15) ? [b, b + 14, b + 15] : [b, b + 15];
    }
    const b = deg(d);
    const ten = deg(d + 2) + 12;
    const nine = deg(d + 1) + 12;
    return thumb9 && isBlack(nine) === isBlack(ten) ? [b, nine, ten] : [b, ten];
  });
}

// ───────────────────────────── stride-style comping, shuttle [SSC, SHUT] ─────────────────────────────

/**
 * Stride-style comping [SSC]: the LH alone still covers bass and chord, spread syncopated rather than on every beat.
 *  - charleston: 1 and the "and" of 2 — bass on 1, chord on 2+
 *  - reverse: the "and" of 1, then 3 — bass on 1, chord on 1+ and on 3 (verify)
 *  - garland: the Red Garland pattern — chords on the offbeats with an anticipation (after the coursepack figure, verify)
 *  - pushoff: a chord repeated on a beat and the offbeat after it [PO] (verify the exact figure)
 *  - leadin: a chord on 4 leading into the next downbeat [LI] (verify)
 * Positions in beats within the bar; `next` = the next bar's chord sounds (an anticipation / lead-in).
 */
export const SSC_PATS: Record<'charleston' | 'reverse' | 'garland' | 'pushoff' | 'leadin', { at: number; role: LRole; next?: boolean }[]> = {
  charleston: [{ at: 0, role: 'bass' }, { at: 1.5, role: 'chord' }],
  reverse: [{ at: 0, role: 'bass' }, { at: 0.5, role: 'chord' }, { at: 2, role: 'chord' }],
  garland: [{ at: 0, role: 'bass' }, { at: 1.5, role: 'chord' }, { at: 3.5, role: 'chord', next: true }],
  pushoff: [{ at: 0, role: 'bass' }, { at: 1, role: 'chord' }, { at: 1.5, role: 'chord' }],
  leadin: [{ at: 0, role: 'bass' }, { at: 1.5, role: 'chord' }, { at: 3, role: 'chord', next: true }],
};
export type SscPat = keyof typeof SSC_PATS;
export function strideComp(cs: TChord[], bars: number, pat: SscPat): LEv[] {
  const out: LEv[] = [];
  let prev: number[] | null = null;
  const P = SSC_PATS[pat];
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * 4;
    for (let k = 0; k < P.length; k++) {
      const h = P[k];
      if (h.next && bar === bars - 1) continue;
      const c = chordAt(cs, h.next ? b0 + 4 : b0 + h.at);
      const end = k + 1 < P.length ? P[k + 1].at : 4;
      const dur = Math.max(0.5, Math.min(end - h.at, 1.5));
      if (h.role === 'bass') {
        // a bar already reached by an anticipation keeps its chord: the bass still lands on 1
        out.push({ beat: r6(b0 + h.at), dur: r6(dur), notes: [bassOne(c)], role: 'bass' });
      } else {
        const v = guideShell(c, prev);
        prev = v;
        out.push({ beat: r6(b0 + h.at), dur: r6(h.next ? 1 : dur), notes: v, role: 'chord' });
      }
    }
  }
  return out;
}

/**
 * The left-hand shuttle [SHUT] (Bill Evans, "Waltz for Debby" with Tony Bennett): the LH moves back and forth between a
 * bass note and a mid-register voicing, under a sustained right hand. Type 0: bass on 1, the voicing on the "and" of 2;
 * type 1: the voicing on 1, the bass after it on 2 ("essentials first"). The public sources name the types without
 * describing them — both are the doc's reading (verify the shuttle types with the book).
 */
export function shuttle(cs: TChord[], bars: number, type: 0 | 1): LEv[] {
  const out: LEv[] = [];
  let prevType: 'A' | 'B' = 'A';
  for (let bar = 0; bar < bars; bar++) {
    const c = chordAt(cs, bar * 4);
    const c3 = chordAt(cs, bar * 4 + 2);
    const v = rootless(c, prevType);
    prevType = prevType === 'A' ? 'B' : 'A';
    const b0 = bar * 4;
    if (type === 0) {
      out.push({ beat: b0, dur: 1.5, notes: [bassOne(c)], role: 'bass' });
      out.push({ beat: b0 + 1.5, dur: c3 === c ? 2.5 : 0.5, notes: v, role: 'chord' });
      if (c3 !== c) {
        out.push({ beat: b0 + 2, dur: 1.5, notes: [bassOne(c3)], role: 'bass' });
        out.push({ beat: b0 + 3.5, dur: 0.5, notes: rootless(c3, prevType), role: 'chord' });
      }
    } else {
      out.push({ beat: b0, dur: 1, notes: v, role: 'chord' });
      out.push({ beat: b0 + 1, dur: c3 === c ? 3 : 1, notes: [bassOne(c)], role: 'bass' });
      if (c3 !== c) {
        out.push({ beat: b0 + 2, dur: 1, notes: rootless(c3, prevType), role: 'chord' });
        out.push({ beat: b0 + 3, dur: 1, notes: [bassOne(c3)], role: 'bass' });
      }
    }
  }
  return out;
}

// ───────────────────────────── the comping vocabulary [B3C, LI, PO, AC, JPF2] ─────────────────────────────

/**
 * Comping rhythms beyond Charleston / reverse / Red Garland (doc C3), hit positions in beats inside a bar; `next` hits
 * sound the next bar's chord (a lead-in / anticipation):
 *  - beat3: the Beat-3 Charleston — the Charleston started on beat 3: 3 and the "and" of 4 [B3C] (the name's reading — verify)
 *  - leadin3 / leadin4: a chord on the "and" of 3 / on 4 leading into the downbeat [LI]
 *  - basie: the Count Basie rhythm — light chords on 2 and 4 (verify: the free sources name the rhythm only)
 *  - pushoff: the Basie rhythm with a push-off — the chord repeated on 4 and the "and" of 4 [PO] (verify)
 *  - twobar: a two-bar pattern — Charleston, then reverse Charleston [JPF2 U3]
 */
export const COMP_RHYTHMS: Record<'beat3' | 'leadin3' | 'leadin4' | 'basie' | 'pushoff' | 'twobar', { at: number; next?: boolean }[][]> = {
  beat3: [[{ at: 2 }, { at: 3.5 }]],
  leadin3: [[{ at: 0 }, { at: 2.5, next: true }]],
  leadin4: [[{ at: 0 }, { at: 3, next: true }]],
  basie: [[{ at: 1 }, { at: 3 }]],
  pushoff: [[{ at: 1 }, { at: 3 }, { at: 3.5 }]],
  twobar: [[{ at: 0 }, { at: 1.5 }], [{ at: 0.5 }, { at: 2 }]],
};
export type CompRhythmId = keyof typeof COMP_RHYTHMS;
/** The hits of a comping rhythm over `bars` bars: beat and the chord that sounds. */
export function compHits(cs: TChord[], bars: number, id: CompRhythmId): { beat: number; dur: number; chord: TChord }[] {
  const pats = COMP_RHYTHMS[id];
  const out: { beat: number; dur: number; chord: TChord }[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const P = pats[bar % pats.length];
    P.forEach((h, k) => {
      if (h.next && bar === bars - 1) return;
      const beat = bar * 4 + h.at;
      const end = k + 1 < P.length ? P[k + 1].at : 4;
      out.push({ beat, dur: Math.max(0.5, Math.min(1.5, end - h.at)), chord: chordAt(cs, h.next ? (bar + 1) * 4 : beat) });
    });
    // every chord change inside the bar gets a hit of its own when the pattern misses it
    for (const c of cs.filter((x) => x.beat > bar * 4 + 1e-6 && x.beat < bar * 4 + 4 - 1e-6)) if (!out.some((o) => o.chord === c)) out.push({ beat: c.beat, dur: 1, chord: c });
  }
  return out.sort((a, b) => a.beat - b.beat);
}

/**
 * Free comping by rule (doc C3, final level; JPF2 U6 "free comping"): the player varies the rhythm, the grader checks
 * the density band (1–4 hits a bar), at least three different bar rhythms per chorus, no more than two identical bars in
 * a row, and anticipations (a hit in the last 8th before a change) that sound the next chord. The rule numbers are ours.
 */
export interface FreeCompReport {
  density: boolean;
  variety: number;
  repeats: boolean;
  anticipations: { ok: number; total: number };
  /** Hits whose notes are not the chord (or, for an anticipation, the next chord). */
  wrongHits: number;
  ok: boolean;
}
export function freeCompCheck(hits: { beat: number; pcs: number[] }[], cs: TChord[], bars: number): FreeCompReport {
  const perBar: string[] = [];
  let density = true;
  let wrongHits = 0;
  const ant = { ok: 0, total: 0 };
  for (let bar = 0; bar < bars; bar++) {
    const hs = hits.filter((h) => h.beat >= bar * 4 - 0.25 && h.beat < bar * 4 + 4 - 0.25);
    if (hs.length < 1 || hs.length > 4) density = false;
    perBar.push(hs.map((h) => Math.round((h.beat - bar * 4) * 2) / 2).join(','));
  }
  for (const h of hits) {
    const c = chordAt(cs, h.beat + 0.01);
    const nextC = chordAt(cs, Math.floor(h.beat + 0.75) + 0.01);
    const inChord = (x: SChord) => {
      const Q = SQI[x.q];
      // chord tones, the 9th, the 13th on major / dominant, the 11th on minor [PSJP-B colour-tone rules]
      const ok = [0, Q.third, Q.fifth, Q.seventh, Q.ninth, ...(x.q === 'maj7' || x.q === '7' || x.q === '6' ? [9] : []), ...(isMinorish(x.q) ? [5] : [])].map((i) => mod12(x.root + i));
      return h.pcs.every((p) => ok.includes(mod12(p)));
    };
    const frac = h.beat - Math.floor(h.beat);
    const change = cs.find((x) => x.beat > h.beat && x.beat - h.beat <= 0.6);
    if (change && frac >= 0.4) {
      ant.total++;
      if (inChord(change) && h.pcs.some((p) => [SQI[change.q].third, SQI[change.q].seventh].map((i) => mod12(change.root + i)).includes(mod12(p)))) ant.ok++;
      continue;
    }
    if (!inChord(c) && !inChord(nextC)) wrongHits++;
  }
  const variety = new Set(perBar).size;
  let repeats = false;
  for (let i = 2; i < perBar.length; i++) if (perBar[i] === perBar[i - 1] && perBar[i] === perBar[i - 2]) repeats = true;
  const ok = density && variety >= Math.min(3, bars) && !repeats && ant.ok === ant.total && wrongHits <= Math.max(1, Math.floor(hits.length * 0.1));
  return { density, variety, repeats, anticipations: ant, wrongHits, ok };
}

// ───────────────────────────── shared-hands voicings [SHV] ─────────────────────────────

/**
 * [SHV] Roles: the RH holds the melody (pinky, ring, middle), the LH the bass (pinky, ring, middle), and the thumbs and
 * index fingers of both hands share the chord in the middle. His four guidelines: (1) include the 3rd and 7th; (2) don't
 * double; (3) space the notes fairly evenly; (4) avoid minor 9ths (a note a ♭9 above a lower one). Thresholds for "fairly
 * evenly" are ours (verify the spacing taste): every gap between the shared notes at most a major 6th, the largest at
 * most 7 semitones more than the smallest, the melody at most an octave above the top shared note, and the bass to the
 * first shared note at most a 12th.
 */
export interface SharedCheck {
  has37: boolean;
  noDouble: boolean;
  even: boolean;
  noMinor9: boolean;
  ok: boolean;
}
/** The bass part of a voicing: the lowest note, and the 5th right above it when present (root + 5th). */
export function splitShared(v: number[]): { bass: number[]; inner: number[] } {
  const s = [...v].sort((a, b) => a - b);
  const two = s.length > 2 && s[1] - s[0] === 7;
  return { bass: two ? s.slice(0, 2) : s.slice(0, 1), inner: s.slice(two ? 2 : 1) };
}
/** Check the four rules on a whole shared-hands voicing (bass part, shared notes, melody on top). */
export function sharedRules(v: number[], c: SChord): SharedCheck {
  const s = [...v].sort((a, b) => a - b);
  const Q = SQI[c.q];
  const pcs = s.map(mod12);
  const has37 = pcs.includes(mod12(c.root + Q.third)) && pcs.includes(mod12(c.root + Q.seventh));
  const noDouble = new Set(pcs).size === pcs.length;
  const { bass, inner } = splitShared(s);
  // the shared notes (all but the top note, the melody): even among themselves; the melody at most an octave above them
  const shared = inner.slice(0, -1);
  const gaps = shared.slice(1).map((x, i) => x - shared[i]);
  const top = inner[inner.length - 1] - (shared[shared.length - 1] ?? inner[0]);
  const even = shared.length >= 2 && gaps.every((g) => g >= 1 && g <= 9) && Math.max(...gaps) - Math.min(...gaps) <= 7 && top >= 1 && top <= 12 && shared[0] - bass[bass.length - 1] <= 19;
  let noMinor9 = true;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (s[j] - s[i] >= 13 && (s[j] - s[i]) % 12 === 1) noMinor9 = false;
  return { has37, noDouble, even, noMinor9, ok: has37 && noDouble && even && noMinor9 };
}
/** The tones a shared voicing may use above the bass: 3, 5, 7, 9; the 13th on major and dominant, the 11th on minor [PSJP-B colour-tone rules]. */
export function sharedPalette(c: SChord): number[] {
  const Q = SQI[c.q];
  const xs = [Q.third, Q.fifth, Q.seventh, 14];
  if (c.q === 'maj7' || isDom(c.q)) xs.push(9);
  if (isMinorish(c.q) && c.q !== 'm7b5') xs.push(5);
  return [...new Set(xs.map((x) => mod12(x)))];
}

/**
 * Every shared-hands voicing of a chord under a melody note (full voicings: bass part, shared notes; the melody is not
 * included — it sounds on top). The bass is the root in C2–B2, alone or with its 5th; three or four shared notes with
 * the 3rd and 7th, from the palette, none doubling the melody or the bass; hand spans: LH (bass + the two lowest shared
 * notes) within a 10th, RH (the upper shared notes + the melody) within an 11th, as in the doc's Cmaj7 example (our reading of the finger
 * roles [SHV] — verify); and the four rules.
 */
export function sharedCandidates(c: SChord, melody: number): number[][] {
  const key = `${c.root}|${c.q}|${melody}`;
  const hit = SH_CACHE.get(key);
  if (hit) return hit;
  const Q = SQI[c.q];
  const third = mod12(c.root + Q.third);
  const sev = mod12(c.root + Q.seventh);
  const mpc = mod12(melody);
  const out: number[][] = [];
  if (mpc === mod12(c.root)) {
    SH_CACHE.set(key, out);
    return out;
  }
  for (let b = 36; b <= 47; b++) {
    if (mod12(b) !== mod12(c.root)) continue;
    for (const withFifth of [false, true]) {
      if (withFifth && (Q.fifth !== 7 || mpc === mod12(c.root + 7))) continue;
      const bass = withFifth ? [b, b + 7] : [b];
      const used = new Set([...bass.map(mod12), mpc]);
      // rule 1: the 3rd and 7th — the melody may be one of them (then the shared notes need not double it)
      const req = [third, sev].filter((p) => !used.has(p));
      const pool = sharedPalette(c).map((x) => mod12(c.root + x)).filter((p) => !used.has(p) && !req.includes(p));
      const sets: number[][] = [];
      const extras = (k: number): number[][] => (k === 0 ? [[]] : pool.flatMap((x, i) => extras(k - 1).filter((r) => r.every((y) => pool.indexOf(y) > i)).map((r) => [x, ...r])));
      for (const size of [3, 4]) if (size - req.length >= 0) for (const ex of extras(size - req.length)) sets.push([...req, ...ex]);
      for (const set of sets)
        for (const ord of perms(set)) {
          for (let first = bass[bass.length - 1] + 1; first <= bass[bass.length - 1] + 19; first++) {
            if (mod12(first) !== ord[0]) continue;
            const v = [first];
            for (let k = 1; k < ord.length; k++) v.push(v[k - 1] + (mod12(ord[k] - v[k - 1]) || 12));
            if (v[v.length - 1] >= melody) continue;
            const full = [...bass, ...v];
            if (!sharedHands(full, melody)) continue;
            if (v[0] < 45 || v[v.length - 1] > 79) continue;
            if (!sharedRules([...full, melody], c).ok) continue;
            out.push(full);
          }
        }
    }
  }
  SH_CACHE.set(key, out);
  return out;
}
const SH_CACHE = new Map<string, number[][]>();
/**
 * Which hand plays what in a shared voicing: the LH the bass part and one or two shared notes (thumb and index, the
 * thumb may take two — the corner thumb), the RH the rest and the melody; LH within a 10th, RH within an 11th. The two
 * splits (2 LH + rest RH, then 1 LH) follow his inner-voice hand splits (3 + 2 / 2 + 3) — our reading, verify.
 */
export function sharedHands(full: number[], melody: number): { lh: number[]; rh: number[] } | null {
  const { bass, inner } = splitShared(full);
  for (const k of [2, 1, 3]) {
    if (k > inner.length) continue;
    const lh = [...bass, ...inner.slice(0, k)];
    const rh = [...inner.slice(k), melody];
    if (lh[lh.length - 1] - lh[0] <= 16 && rh[rh.length - 1] - rh[0] <= 17) return { lh, rh };
  }
  return null;
}
function perms(xs: number[]): number[][] {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
/** One shared voicing: the candidate nearest the previous one (shared notes), else the most even one near the middle. */
export function sharedVoicing(c: SChord, melody: number, prev: number[] | null): number[] | null {
  const cands = sharedCandidates(c, melody);
  if (!cands.length) return null;
  const inner = (v: number[]) => splitShared(v).inner;
  const cost = (v: number[]) => {
    const iv = inner(v);
    if (prev) {
      const pv = inner(prev);
      return iv.reduce((a, m) => a + Math.min(...pv.map((p) => Math.abs(p - m))), 0) + Math.abs(v[0] - prev[0]) * 0.2;
    }
    const gaps = [...iv, melody].slice(1).map((x, i) => x - [...iv, melody][i]);
    return Math.max(...gaps) - Math.min(...gaps) + Math.abs(iv[0] - 52) * 0.3 + (iv.length === 4 ? 0 : 1);
  };
  return cands.slice().sort((a, b) => cost(a) - cost(b))[0];
}

// ───────────────────────────── ballad styles [Siskind "Three Essential Ballad Styles", QBRae05tDnA] ─────────────────────────────

/**
 * The repeated-quarter-note ballad (Vnfm8aB9uvo; PianoWithJonny): keep a shared-hands voicing and repeat one of its notes
 * — usually the LH thumb, the top note of the left hand — in quarter notes as a timekeeper under the melody; skip the
 * extra quarter when the chords change every beat. Returns the beats (inside [from, to)) where the thumb restrikes.
 */
export function repeatedQuarters(from: number, to: number): number[] {
  const out: number[] = [];
  for (let b = Math.ceil(from + 1 - 1e-6); b < to - 1e-6; b++) out.push(b);
  return out;
}
/** The LH thumb of a shared voicing: the higher of the two lowest shared notes (the LH's top note). */
export const thumbOf = (v: number[]): number => {
  const { bass, inner } = splitShared(v);
  return inner.length >= 2 ? inner[1] : inner[0] ?? bass[bass.length - 1];
};

// ───────────────────────────── the mango problem [PSJP-A] ─────────────────────────────

/** [PSJP-A] Three mangos (bass, chords, melody), two hands: his five solutions, which double as his chapter map. */
export const MANGO = [
  { n: 1, en: 'Two in the LH, one in the RH', he: 'שניים ביד שמאל, אחד בימין', styles: { en: 'stride, bass shells, every LH that shuttles', he: 'סטרייד, שלדי בס, כל יד שמאל שמדלגת' } },
  { n: 2, en: 'Two in the RH, one in the LH', he: 'שניים ביד ימין, אחד בשמאל', styles: { en: 'a bassline; the RH shuttles, drapes, or implies the chords', he: 'קו בס; יד ימין מדלגת, עוטפת או מרמזת את האקורדים' } },
  { n: 3, en: 'One in each hand, the third shared', he: 'אחד בכל יד, השלישי משותף', styles: { en: 'shared-hands voicings, mainly ballads', he: 'וויסינג בשתי ידיים, בעיקר בבלדות' } },
  { n: 4, en: 'Drop a mango', he: 'מפילים מנגו', styles: { en: 'most often no bass: closed position, drop 2', he: 'לרוב בלי בס: מצב צמוד, דרופ 2' } },
  { n: 5, en: 'Juggle', he: 'ג׳אגלינג', styles: { en: 'switch which hand covers what', he: 'מחליפים איזו יד מכסה מה' } },
] as const;
