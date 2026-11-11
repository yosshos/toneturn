// The bass course's P2 levels (docs/research/BASS_NICHE_PLAN.md §3, "Implemented (P2)"): jazz-waltz walking (b-walk
// 19–20), the graded standards ladder (b-std, five tiers), the upright jazz top (b-up-walk 6–9), extended techniques
// (b-ext: harmonics, tapping, double-stops and shells, comping, fretless intonation), fusion harmony lines (b-impro
// 15–18) and the rock stamina top (b-pick 9–10). Built on the P1 helpers (bassNiche.ts) and the prog engine. Every line
// is generated from rules, never copied.
//
// NOTE: bass.ts, bassNiche.ts and this module import each other. Nothing here may call their exports at module top
// level (only inside functions).

import type { BassFamilyId, BassGoal, Drill, DrillSpec } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle } from './guitar';
import { guitarItemId, mod, rng, SIG } from './guitar';
import { alt, chartOf, chordName, drillOf, feelLine, fold, keyNameOf, overProg, endOn, rootOf, rulesFromText, spell, FEEL_T, STD_NAME_HE, BLUES, PROGS, QI, type BN, type Feel, type Prog, type Q } from './bass';
import { chartLc, ctLine, generateBassNiche, guideOf, lcOf, pitchesIn, repeatLc, rulesFor, SC, transposeName, type LC } from './bassNiche';
import { parseChart } from '../charts';
import { hashOf, walkingBass } from '../band';
import { STANDARD_CHANGES } from '../standards';
import { ruleSafe } from './bassRuleSafe';

type T2 = { en: string; he: string };
const tt = (en: string, he: string): T2 => ({ en, he });
const pc = (x: number) => ((x % 12) + 12) % 12;
const uniq = (xs: number[]) => [...new Set(xs)];
const withCents = (d: Drill, cents: number, extra: BassGoal = {}): Drill => ({ ...d, goal: { ...d.goal, bass: { ...(d.goal.bass ?? {}), ...extra, cents } } });
/** A drill built by another generator, filed under this spec (item id, family, kind, option stay this level's). */
const asSpec = (d: Drill, s: DrillSpec): Drill => ({ ...d, spec: { ...d.spec, family: s.family, kind: s.kind, option: s.option }, itemId: guitarItemId(s) });

// ───────────────────────────── J5: b-walk 19–20 — jazz-waltz walking ─────────────────────────────

/** The band's walking line in 3/4 for a chart text (one note a beat, no ghosts). */
function walk3(tu: Tuning, text: string, seed: string): BN[] {
  const p = parseChart(text, 3);
  const notes = walkingBass(p, 3, p.bars * 3, hashOf(seed)).filter((x) => !x.ghost);
  return notes.map((nt, i) => ({ b: nt.beat, d: Math.max(1 / 3, (notes[i + 1]?.beat ?? nt.beat + 1) - nt.beat), p: fold(tu, nt.midi), ct: Number.isInteger(nt.beat) && nt.beat % 3 === 0 }));
}
/** The walk rules of a 3/4 chart text (chord tones on each change, approaches before them). */
function rules3(text: string): NonNullable<BassGoal['rules']> {
  const p = parseChart(text, 3);
  return { kind: 'walk', chart: p.chords.map((c) => ({ chord: c.sym, root: pc(c.root), tones: uniq([0, pc(c.bass - c.root), ...c.iv.map(pc)]), beats: c.beats })), maxRepeat: 0.05 };
}
const ascii = (x: string) => x.replace(/°7/g, 'dim7').replace(/♭/g, 'b').replace(/♯/g, '#');

/** The b-walk kinds built here (levels 19–20). */
export const WALK_NICHE = ['waltz', 'blues-waltz'];
function genWaltz(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  let bars: string[];
  let name: T2;
  if (s.kind === 'waltz') {
    // 3/4 walking, one chord a bar, an approach on 3: I–vi–ii–V–iii–VI–ii–V (op 0) or a minor i–iv–ii°–V (op 1).
    const prog: Prog = op % 2 ? [[0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7'], [2, 'm7b5'], [7, '7'], [0, 'm7'], [7, '7']] : [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']];
    bars = chartOf(key, prog);
    name = op % 2 ? tt('Jazz waltz in minor: walking in 3', 'ואלס ג׳אז במינור: ווקינג בשלוש') : tt('Jazz waltz: walking in 3', 'ואלס ג׳אז: ווקינג בשלוש');
  } else {
    // A chorus of the blues waltz (standards.ts, in F), moved to the level's key.
    const st = STANDARD_CHANGES.find((x) => x.id === 'blues-waltz')!;
    bars = st.text.split('|').map((b) => b.trim().split(/\s+/).map((c) => transposeName(c, key - 5)).join(' '));
    name = tt('Blues waltz: a chorus walking in 3', 'בלוז ואלס: סבב ווקינג בשלוש');
  }
  const text = bars.map(ascii).join(' | ');
  const rules = rules3(text);
  const line = [...ruleSafe((k) => walk3(tu, text, `b-walk:${s.kind}:${key}:${op}${k ? `:${k}` : ''}`), rules, 3), { b: bars.length * 3, d: 3, p: rootOf(tu, key), ct: true }];
  return drillOf(s, tu, alt(line), { ...name, meter: 3, chart: bars, show: 'chart', ...(s.kind === 'waltz' && op % 2 ? { keyName: `${keyNameOf(key, true)}m` } : {}), bass: { rules }, drums: { groove: 'jazz-waltz' } });
}

// ───────────────────────────── J6: b-std — the graded standards ladder ─────────────────────────────

/**
 * The standards ladder (BASS_NICHE_PLAN J6): the walking standards in five tiers with tier tempos — T1 blues and modal
 * forms, T2 rhythm changes and ii–V tunes, T3 minor, bossa and ballads, T4 bebop up-tempo, T5 Coltrane changes. Each
 * in the tune's lead-sheet key and the feel it calls for. Options index this list; append only (item ids).
 */
export const STD_LADDER: { id: string; key: number; minor?: boolean; feel: Feel; tier: 1 | 2 | 3 | 4 | 5 }[] = [
  { id: 'blues-f', key: 5, feel: 'walk', tier: 1 },
  { id: 'blues-bb', key: 10, feel: 'two', tier: 1 },
  { id: 'blues-basic', key: 7, feel: 'walk', tier: 1 },
  { id: 'minor-blues', key: 0, minor: true, feel: 'walk', tier: 1 },
  { id: 'so-what', key: 2, minor: true, feel: 'walk', tier: 1 },
  { id: 'modal-a', key: 9, minor: true, feel: 'two', tier: 1 },
  { id: 'cantaloupe', key: 5, minor: true, feel: 'two', tier: 1 },
  { id: 'rhythm-a', key: 10, feel: 'walk', tier: 2 },
  { id: 'fly', key: 0, feel: 'walk', tier: 2 },
  { id: 'tune-up', key: 2, feel: 'walk', tier: 2 },
  { id: 'sec-dominants-c', key: 0, feel: 'walk', tier: 2 },
  { id: 'turnarounds-f', key: 5, feel: 'walk', tier: 2 },
  { id: 'backdoor-g', key: 7, feel: 'walk', tier: 2 },
  { id: 'a-train', key: 0, feel: 'two', tier: 2 },
  { id: 'satin', key: 0, feel: 'two', tier: 2 },
  { id: 'never-another', key: 3, feel: 'walk', tier: 2 },
  { id: 'attya', key: 8, feel: 'walk', tier: 2 },
  { id: 'ladybird', key: 0, feel: 'walk', tier: 2 },
  { id: 'autumn', key: 7, minor: true, feel: 'walk', tier: 3 },
  { id: 'solar', key: 0, minor: true, feel: 'walk', tier: 3 },
  { id: 'minor-two-five-keys', key: 0, minor: true, feel: 'walk', tier: 3 },
  { id: 'blue-bossa', key: 0, minor: true, feel: 'bossa', tier: 3 },
  { id: 'ipanema', key: 5, feel: 'bossa', tier: 3 },
  { id: 'song-father', key: 5, minor: true, feel: 'bossa', tier: 3 },
  { id: 'minor-bossa', key: 9, minor: true, feel: 'bossa', tier: 3 },
  { id: 'misty', key: 3, feel: 'ballad', tier: 3 },
  { id: 'valentine', key: 0, minor: true, feel: 'ballad', tier: 3 },
  { id: 'ballad-ii-v', key: 3, feel: 'ballad', tier: 3 },
  { id: 'ballad-cliche', key: 2, minor: true, feel: 'ballad', tier: 3 },
  { id: 'ballad-backcycle', key: 3, feel: 'ballad', tier: 3 },
  { id: 'maiden', key: 2, feel: 'two', tier: 3 },
  { id: 'rhythm-full', key: 10, feel: 'walk', tier: 4 },
  { id: 'bird-blues', key: 5, feel: 'walk', tier: 4 },
  { id: 'two-five-keys', key: 0, feel: 'walk', tier: 4 },
  { id: 'fast-aaba-cycle', key: 10, feel: 'walk', tier: 4 },
  { id: 'bebop-form', key: 5, feel: 'walk', tier: 4 },
  { id: 'stella', key: 10, feel: 'walk', tier: 5 },
  { id: 'giant', key: 11, feel: 'walk', tier: 5 },
  { id: 'coltrane-subs', key: 0, feel: 'walk', tier: 5 },
  { id: 'miss-jones', key: 5, feel: 'walk', tier: 5 },
];
/** The ladder's options of one tier (catalogue). */
const tierOps = (t: number): number[] => STD_LADDER.map((x, i) => (x.tier === t ? i : -1)).filter((i) => i >= 0);

/**
 * One chorus of a ladder standard: the chart only, judged by the walk rules (chord tones in other feels). Walking
 * choruses of 16 bars or more also keep the time: long quarters and no drift from the first half to the second.
 */
function genTier(s: DrillSpec, tu: Tuning, idx?: number): Drill {
  const std = STD_LADDER[(idx ?? s.option ?? 0) % STD_LADDER.length];
  const st = STANDARD_CHANGES.find((x) => x.id === std.id) ?? STANDARD_CHANGES[0];
  const walk = std.feel === 'walk';
  const rules = rulesFromText(st.text, walk ? 'walk' : 'chordTones');
  // The same line as the walking family's chorus of this tune (its seed), unless that breaks the rules.
  const line = ruleSafe((k) => feelLine(tu, st.text, std.feel, k ? `b-std:${st.id}:${k}` : `b-walk:std:${st.id}`), rules, 4);
  const bars = st.text.split('|').map((x) => x.trim());
  const total = bars.length * 4;
  line.push({ b: total, d: 2, p: rootOf(tu, std.key), ct: true });
  const part = st.part.en.startsWith('Whole form') ? '' : ` (${st.part.en})`;
  const partHe = part ? ` (${st.part.he})` : '';
  const feel = FEEL_T[std.feel];
  const sw = walk && bars.length >= 16 ? { swingWalk: { long: 0.85, drift: 0.02, chorusBeats: total / 2 } } : {};
  return drillOf(s, tu, alt(line), {
    en: `${st.name}${part}, ${feel.en}`,
    he: `${STD_NAME_HE[st.name] ?? st.name}${partHe}, ${feel.he}`,
    keyName: `${keyNameOf(std.key, !!std.minor)}${std.minor ? 'm' : ''}`,
    keySig: SIG[std.minor ? mod(std.key + 3, 12) : std.key],
    chart: bars,
    show: 'chart',
    evenness: walk,
    bass: { rules, ...sw },
    drums: { groove: std.feel === 'bossa' ? 'bossa' : std.feel === 'ballad' ? 'ballad-brush' : std.tier >= 4 && std.tier < 5 ? 'swing-fast' : 'swing' },
  });
}

// ───────────────────────────── J7: b-up-walk 6–9 — the upright jazz top ─────────────────────────────

/** The b-up-walk kinds built here (levels 6–9). */
export const UP_WALK_NICHE = ['up-std', 'up-fast', 'up-solo', 'up-arco'];
/** Standards on the upright (ladder ids). */
export const UP_STD = ['fly', 'autumn', 'tune-up', 'solar', 'attya'];
export function generateUprightNiche(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'up-std': {
      // A standard's chorus by the walk rules, pizz, in tune (±15 cents).
      const i = STD_LADDER.findIndex((x) => x.id === UP_STD[op % UP_STD.length]);
      return withCents({ ...asSpec(genTier(s, tu, i), s), bow: 'pizz' }, 15);
    }
    case 'up-fast': {
      // Up-tempo pizz walking (160 → 260): the swing-time measures (long quarters, the ride, no drift) and intonation.
      const d = generateBassNiche({ ...s, family: 'b-swing', kind: 'uptempo' }, tu);
      return withCents({ ...asSpec(d, s), bow: 'pizz' }, 20);
    }
    case 'up-solo': {
      // A blues solo chorus in thumb position (A2 … D4, from the 12th place): guide tones on the changes, swung 8ths.
      const rnd = rng(`b-up-walk:solo:${key}:${op}`);
      const cs = lcOf(key, op % 2 ? [...PROGS.iivi, ...PROGS.iivi, ...PROGS.iivi] : BLUES).map((c) => ({ ...c, land: guideOf(c) }));
      const line = ctLine(cs, rnd, { per: 2, every: 1, lo: 45, hi: 62, guide: true, from: 50 });
      const d = drillOf(s, tu, alt(line), { ...(op % 2 ? tt('Thumb-position solo: ii–V–I', 'סולו במצב אגודל: ii–V–I') : tt('Thumb-position solo: the blues', 'סולו במצב אגודל: בלוז')), chart: chartLc(cs), show: 'chart', evenness: false, pos: 12, open: false, bow: 'pizz', bass: { rules: rulesFor(cs, 'target', { passing: 2 }), swing: { ratio: 1.8, tol: 0.3, sub: 8 } }, drums: { groove: 'swing' } });
      return withCents(d, 15);
    }
    case 'up-arco': {
      // An arco head-style line: the guide tones (3rd, 7th) of ii–V–I twice in half notes, voice-led by step.
      const prog: Prog = op % 2 ? [...PROGS.jazz, ...PROGS.iivi] : [...PROGS.iivi, ...PROGS.iivi];
      const cs = lcOf(key, prog);
      const line: BN[] = [];
      let prev = rootOf(tu, key) + 16;
      cs.forEach((c, i) => {
        const g = pitchesIn(c.root, guideOf(c), 38, 57);
        const a = [...g].sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev))[0];
        const b = [...g].filter((x) => pc(x - a) !== 0).sort((x, y) => Math.abs(x - a) - Math.abs(y - a))[0] ?? a;
        line.push({ b: i * 4, d: 2, p: a, ct: true }, { b: i * 4 + 2, d: 2, p: b, ct: true });
        prev = b;
      });
      line.push({ b: cs.length * 4, d: 4, p: pitchesIn(key, [4], 38, 57).sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev))[0], ct: true });
      const d = drillOf(s, tu, line, { ...tt('Arco head-style line: the guide tones', 'קו נושא בקשת: הצלילים המנחים'), chart: chartLc(cs), evenness: true, bow: 'arco', open: false });
      return withCents(d, 12);
    }
  }
  throw new Error(`Unknown b-up-walk kind ${s.kind}`);
}

// ───────────────────────────── P4: b-ext — extended techniques ─────────────────────────────

/** The plucked strings E A D G of any bass as string numbers (1 = highest), low to high; a drop-D / no-E bass: its 4 lowest standard strings. */
function eadg(tu: Tuning): number[] {
  const e = tu.open.indexOf(28);
  const low = e >= 0 ? e + 1 : tu.open.length;
  return [low, low - 1, low - 2, low - 3];
}
/** A two-note chord on fixed strings: the lower note's fret ≥ min, the upper note `iv` semitones above on string `hi`. */
function dstop(tu: Tuning, rootPc: number, lo: number, hi: number, iv: number, b: number, d: number, min = 2): BN {
  let f = mod(rootPc - tu.open[lo - 1], 12);
  const span = tu.open[hi - 1] - tu.open[lo - 1];
  while (f < min || f + iv - span < 0) f += 12;
  const p = tu.open[lo - 1] + f;
  return { b, d, p, s: lo, f, ct: true, with: [{ s: hi, f: f + iv - span }] };
}
const third = (q: Q) => (QI[q].includes(3) ? 3 : 4);
const seventh = (q: Q) => (q === 'maj7' ? 11 : q === 'dim7' ? 9 : 10);

function genExt(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const [E, A, D, G] = eadg(tu);
  switch (s.kind) {
    case 'nat-harm': {
      // Natural harmonics at the 12th, 7th, 5th, 4th and 3rd fret on every string (the 2nd to 6th partials).
      const line: BN[] = [];
      let b = 0;
      for (const fr of [12, 7, 5, 4, 3]) for (const st of [E, A, D, G]) line.push({ b: b++, d: 1, p: 0, s: st, f: fr, tech: 'harmonic' });
      return drillOf(s, tu, line, { ...tt('Natural harmonics: 12, 7, 5, 4 and 3', 'הרמוניקים טבעיים: 12, 7, 5, 4 ו־3'), evenness: false });
    }
    case 'harm-chord': {
      // Harmonic chords (two strings at one fret, op 0) and a harmonic melody up and down (op 1).
      const line: BN[] = [];
      if (op % 2 === 0) {
        const CH: [number, number, number][] = [[D, G, 12], [D, G, 7], [A, D, 7], [A, D, 5], [D, G, 5], [E, A, 12], [A, D, 12], [D, G, 12]];
        CH.forEach(([lo, hi, fr], i) => line.push({ b: i * 2, d: 2, p: 0, s: lo, f: fr, tech: 'harmonic', with: [{ s: hi, f: fr }] }));
        return drillOf(s, tu, line, { ...tt('Harmonic chords: two strings at one fret', 'אקורדים של הרמוניקים: שני מיתרים באותו סריג'), evenness: false, bass: { doubleStops: 0.8 } });
      }
      const MEL: [number, number][] = [[A, 12], [E, 7], [D, 12], [A, 7], [G, 12], [D, 7], [A, 4], [G, 7], [D, 4], [G, 7], [D, 7], [A, 7], [D, 12], [E, 7], [A, 12]];
      MEL.forEach(([st, fr], i) => line.push({ b: i, d: 1, p: 0, s: st, f: fr, tech: 'harmonic' }));
      return drillOf(s, tu, line, { ...tt('A melody in harmonics', 'מנגינה בהרמוניקים'), evenness: false });
    }
    case 'art-harm': {
      // Artificial harmonics: fret the note, touch the string 12 frets higher (the tab shows the touch point): the
      // major pentatonic of the key up an octave and back, each note sounding an octave above the fretted one.
      const R = rootOf(tu, key);
      const up = [0, 2, 4, 7, 9, 12].map((x) => R + x);
      const ps = [...up, ...up.slice(0, -1).reverse()];
      const line: BN[] = ps.map((q, i) => {
        const st = [E, A, D, G].find((x) => q - tu.open[x - 1] >= 0 && q - tu.open[x - 1] <= 8) ?? G;
        const f = q - tu.open[st - 1];
        return { b: i, d: 1, p: q + 12, s: st, f: f + 12, tech: 'harmonic' };
      });
      return drillOf(s, tu, line, { ...tt('Artificial harmonics: fret, touch 12 frets up', 'הרמוניקים מלאכותיים: ללחוץ, ולגעת 12 סריגים מעל'), evenness: false });
    }
    case 'tap': {
      // Two-hand tapping: the fretting hand sounds the root (hammer-on from nowhere), the tapping hand 5th, octave and
      // 10th — 16ths over I–vi–ii–V, twice.
      const prog: Prog = [...PROGS.jazz, ...PROGS.jazz];
      const line = overProg(tu, key, prog, (R, c) => [0, 1, 2, 3].flatMap((b) => [0, 7, 12, 12 + third(c[1])].map((x, k): BN => ({ b: b + k / 4, d: 0.25, p: R + x, tech: k === 0 ? 'hammer' : 'tap', acc: k === 0 }))));
      line.push(endOn(tu, key, prog.length * 4, 1));
      return drillOf(s, tu, line, { ...tt('Tapping: root, 5th, octave, 10th', 'טאפינג: יסוד, קווינטה, אוקטבה, דצימה'), chart: chartOf(key, prog), open: false });
    }
    case 'tap-iivi': {
      // Tapped arpeggios through ii–V–I: 1-3-5-7 up and the octave back down in 16ths, the root by the fretting hand.
      const prog: Prog = [...PROGS.iivi, ...PROGS.iivi];
      const line = overProg(tu, key, prog, (R, c) => {
        const [r, t, f, sv] = [0, third(c[1]), QI[c[1]][2], c[1] === 'M' ? 12 : seventh(c[1])];
        const UP = [r, t, f, sv];
        const DOWN = [12, sv, f, t];
        return [UP, DOWN, UP, DOWN].flatMap((cell, b) => cell.map((x, k): BN => ({ b: b + k / 4, d: 0.25, p: R + x, tech: k === 0 && b % 2 === 0 ? 'hammer' : 'tap', acc: k === 0 })));
      });
      line.push(endOn(tu, key, prog.length * 4, 1));
      return drillOf(s, tu, line, { ...tt('Tapped arpeggios through ii–V–I', 'ארפג׳יו בטאפינג על ii–V–I'), chart: chartOf(key, prog), open: false });
    }
    case 'dstop': {
      // Chordal bass on ii–V–I: 10ths (root on the E string, the 3rd an octave up on the G string, op 0) or shells (the
      // root and the 7th two strings up, op 1). Both notes must ring: the chroma check on the microphone.
      const prog: Prog = [...PROGS.iivi, ...PROGS.iivi];
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = key + c[0];
        for (const k of [0, 1]) line.push(op % 2 ? dstop(tu, r, E, D, seventh(c[1]), bar * 4 + k * 2, 2) : dstop(tu, r, E, G, 12 + third(c[1]), bar * 4 + k * 2, 2));
      });
      return drillOf(s, tu, line, { ...(op % 2 ? tt('Shells on ii–V–I: root and 7th', 'שלדים על ii–V–I: יסוד וספטימה') : tt('10ths on ii–V–I', 'דצימות על ii–V–I')), chart: chartOf(key, prog), evenness: false, open: false, bass: { doubleStops: 0.8 } });
    }
    case 'comp': {
      // Comping on the bass: root–7th shells in the Charleston rhythm (1, the "and" of 2), over the blues (op 0) or
      // ii–V–I (op 1), with the drums.
      const prog: Prog = op % 2 ? [...PROGS.iivi, ...PROGS.iivi] : BLUES;
      const line: BN[] = [];
      prog.forEach((c, bar) => {
        const r = key + c[0];
        line.push(dstop(tu, r, E, D, seventh(c[1]), bar * 4, 1.5), dstop(tu, r, E, D, seventh(c[1]), bar * 4 + 1.5, 1.5));
      });
      return drillOf(s, tu, line, { ...(op % 2 ? tt('Comping shells: ii–V–I', 'ליווי בשלדים: ii–V–I') : tt('Comping shells: the blues', 'ליווי בשלדים: בלוז')), chart: chartOf(key, prog), evenness: false, open: false, bass: { doubleStops: 0.8 }, drums: { groove: 'swing' }, band: false });
    }
    case 'fretless': {
      // Fretless intonation (the fretless tuning): slide up a whole step into each guide tone, hold it, then a long
      // note with vibrato — ii–V–I twice in the upper register, every note within ±12 cents.
      const cs = lcOf(key, [...PROGS.iivi, ...PROGS.iivi]);
      const line: BN[] = [];
      let prev = rootOf(tu, key) + 19;
      cs.forEach((c, i) => {
        const g = pitchesIn(c.root, guideOf(c), 45, 60);
        const a = [...g].sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev))[0];
        const v = [...pitchesIn(c.root, c.ct, 45, 60)].filter((x) => x !== a).sort((x, y) => Math.abs(x - a) - Math.abs(y - a))[0] ?? a;
        line.push({ b: i * 4, d: 0.25, p: a - 2 }, { b: i * 4 + 0.25, d: 1.75, p: a, tech: 'slide', ct: true }, { b: i * 4 + 2, d: 2, p: v, tech: 'vibrato', bend: 30, ct: true });
        prev = v;
      });
      const d = drillOf(s, tu, line, { ...tt('Fretless: slide into the target, hold it in tune', 'פרטלס: להחליק אל צליל המטרה ולהחזיק אותו מכוון'), chart: chartLc(cs), evenness: false, open: false });
      return withCents(d, 12);
    }
  }
  throw new Error(`Unknown b-ext kind ${s.kind}`);
}

// ───────────────────────────── P5: b-impro 15–18 — fusion harmony lines ─────────────────────────────

/** The b-impro kinds built here (levels 15–18). */
export const IMPRO_FUSION = ['fus-vamp', 'constant', 'alt16', 'ust'];

/**
 * A 16th-note fingerstyle line: a chord tone on every beat (the landing tone at a change), then three steps through
 * the chord scale, turning at the edges of the range. Every note is a scale or chord tone.
 */
function line16(cs: LC[], rnd: () => number, lo: number, hi: number, special?: (c: LC, i: number) => number[] | null): BN[] {
  const out: BN[] = [];
  let at = 0;
  let prev = lo + 9;
  let dir = 1;
  const near = (xs: number[], to: number) => [...xs].sort((a, b) => Math.abs(a - to) - Math.abs(b - to))[0];
  cs.forEach((c, ci) => {
    const triad = special?.(c, ci) ?? null;
    const scale = pitchesIn(c.root, uniq([...c.sc, ...c.ct]), lo, hi);
    for (let b = 0; b < c.beats; b++) {
      if (prev > hi - 5) dir = -1;
      else if (prev < lo + 5) dir = 1;
      else if (rnd() < 0.2) dir = -dir;
      let cell: number[];
      if (triad) {
        // An upper-structure triad: its arpeggio up (or down) from the triad tone nearest the last note.
        const tp = pitchesIn(0, triad, lo, hi);
        const i = tp.indexOf(near(tp, prev));
        if (i + 3 * dir < 0 || i + 3 * dir >= tp.length) dir = -dir;
        cell = [0, 1, 2, 3].map((k) => tp[Math.max(0, Math.min(tp.length - 1, i + k * dir))]);
      } else {
        const pool = pitchesIn(c.root, b === 0 ? (c.land ?? c.ct) : c.ct, lo, hi).filter((p) => p !== prev && Math.abs(p - prev) <= 7);
        const ahead = pool.filter((p) => (p - prev) * dir > 0);
        const a = ahead.length ? near(ahead, prev) : pool.length ? near(pool, prev) : near(pitchesIn(c.root, c.ct, lo, hi), prev);
        let i = scale.indexOf(a);
        cell = [a];
        for (let k = 1; k < 4; k++) {
          if (i + dir < 0 || i + dir >= scale.length) dir = -dir;
          i += dir;
          cell.push(scale[i]);
        }
      }
      cell.forEach((p, k) => out.push({ b: at + b + k / 4, d: 0.25, p, ct: k === 0, acc: k === 0 }));
      prev = cell[3];
    }
    at += c.beats;
  });
  out.push({ b: at, d: 1, p: near(pitchesIn(cs[0].root, cs[0].land ?? cs[0].ct, lo, hi), prev), ct: true });
  return out;
}

export function genImproFusion(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-impro:${s.kind}:${key}:${op}`);
  const lo = 31;
  const hi = 57;
  const N = (d: number, home = key) => spell(key + d, home);
  const lyd = (d: number, beats = 4): LC => ({ root: pc(key + d), ct: [0, 4, 7, 11], sc: SC.lyd, beats, name: `${N(d)}maj7♯11` });
  const fin = (cs: LC[], line: BN[], name: T2, extra: Partial<Parameters<typeof drillOf>[3]> = {}) =>
    drillOf(s, tu, alt(line), { ...name, chart: chartLc(cs), show: 'chart', evenness: true, bass: { rules: rulesFor(cs.map((c) => ({ ...c, land: c.land ?? c.ct })), 'target') }, drums: { groove: 'rock-16' }, ...extra });
  switch (s.kind) {
    case 'fus-vamp': {
      // A Lydian vamp (I – ♭VII maj7♯11, op 0) or a sus vamp (I7sus4 – II7sus4, op 1), two bars each, twice.
      const sus = (d: number): LC => ({ root: pc(key + d), ct: [0, 5, 7, 10], sc: SC.mix, beats: 8, name: `${N(d)}7sus4` });
      const cs = op % 2 ? repeatLc([sus(0), sus(2)], 2) : repeatLc([lyd(0, 8), lyd(10, 8)], 2);
      return fin(cs, line16(cs, rnd, lo, hi), op % 2 ? tt('16th lines over a sus vamp', 'קווים בשש-עשריות על וואמפ sus') : tt('16th lines over a Lydian vamp', 'קווים בשש-עשריות על וואמפ לידי'));
    }
    case 'constant': {
      // Constant structure: one chord shape moved by non-functional steps — maj7♯11 chords (op 0) or the II triad
      // over its root (D/C …, op 1) — a bar each, twice.
      const roots = [0, 4, 9, 5];
      const slash = (d: number): LC => ({ root: pc(key + d), ct: [0, 2, 6, 9], sc: SC.lyd, beats: 4, name: `${N(d + 2, key + d)}/${N(d)}` });
      const cs = repeatLc(roots.map((d) => (op % 2 ? slash(d) : lyd(d))), 2);
      return fin(cs, line16(cs, rnd, lo, hi), op % 2 ? tt('Constant structure: slash chords', 'מבנה קבוע: אקורדי סלאש') : tt('Constant structure: maj7♯11 chords', 'מבנה קבוע: אקורדי maj7♯11'));
    }
    case 'alt16': {
      // Minor ii–V–i with an altered dominant in 16ths: Locrian, the altered scale, Dorian.
      const cs: LC[] = repeatLc(
        [
          { root: pc(key + 2), ct: [0, 3, 6, 10], sc: SC.loc, beats: 4, name: `${N(2, key + 3)}m7♭5` },
          { root: pc(key + 7), ct: [0, 4, 10], sc: SC.alt, beats: 4, name: `${N(7, key + 3)}7alt` },
          { root: key, ct: [0, 3, 7, 10], sc: SC.dor, beats: 8, name: `${N(0, key + 3)}m7` },
        ],
        2,
      );
      return fin(cs, line16(cs, rnd, lo, hi), tt('Altered dominant lines in 16ths', 'קווי דומיננטה אלטרד בשש-עשריות'), { keyName: `${keyNameOf(key, true)}m` });
    }
    case 'ust': {
      // Upper-structure arpeggios on the dominant of ii–V–I: the II triad (9, ♯11, 13) the first time, the ♭VI triad
      // (♭13, root, ♯9) the second; the ii and the I in scale lines.
      const V = pc(key + 7);
      const ii: LC = { root: pc(key + 2), ct: [0, 3, 7, 10], sc: SC.dor, beats: 4, name: chordName(key, [2, 'm7']) };
      const I: LC = { root: key, ct: [0, 4, 7, 11], sc: SC.ion, beats: 8, name: chordName(key, [0, 'maj7']) };
      const V1: LC = { root: V, ct: [0, 4, 10], sc: SC.lydDom, beats: 4, name: `${N(7)}13♯11`, land: [2, 6, 9] };
      const V2: LC = { root: V, ct: [0, 4, 10], sc: SC.alt, beats: 4, name: `${N(7)}7♯9♭13`, land: [8, 0, 3] };
      const cs = [ii, V1, I, ii, V2, I];
      const UST: Record<number, number[]> = { 1: [2, 6, 9].map((x) => pc(V + x)), 4: [8, 0, 3].map((x) => pc(V + x)) };
      return fin(cs, line16(cs, rnd, lo, hi, (_c, i) => UST[i] ?? null), tt('Upper-structure triads on the dominant', 'משולשי מבנה עליון על הדומיננטה'));
    }
  }
  throw new Error(`Unknown b-impro kind ${s.kind}`);
}

// ───────────────────────────── P6: b-pick 9–10 — rock stamina ─────────────────────────────

/** The b-pick kinds built here (levels 9–10). */
export const PICK_NICHE = ['stamina8', 'mute16'];
function genPickTop(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  if (s.kind === 'stamina8') {
    // Down-strokes for two minutes at 200 (100 bars of 8ths): the evenness of the last bars against the first.
    const prog: Prog = Array.from({ length: 25 }, () => PROGS.rock).flat();
    const line = overProg(tu, key, prog, (R) => Array.from({ length: 8 }, (_, k): BN => ({ b: k / 2, d: 0.5, p: R, acc: k % 2 === 0 })));
    line.push(endOn(tu, key, prog.length * 4, 1));
    return drillOf(s, tu, alt(line, ['D']), { ...tt('Down-strokes for two minutes', 'מכות למטה במשך שתי דקות'), chart: chartOf(key, prog), bass: { drift: 0.15 }, drums: { groove: 'rock-8' } });
  }
  // Alternate 16ths with the palm mute, 8 bars twice (i – ♭VI – ♭VII).
  const prog: Prog = Array.from({ length: 4 }, (): Prog => [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M']]).flat();
  const line = overProg(tu, key, prog, (R) => Array.from({ length: 16 }, (_, k): BN => ({ b: k / 4, d: 0.25, p: R, tech: 'mute', acc: k % 4 === 0 })));
  line.push({ ...endOn(tu, key, prog.length * 4, 1), tech: 'mute' });
  return drillOf(s, tu, alt(line, ['D', 'U']), { ...tt('Palm-muted alternate 16ths', 'שש-עשריות מתחלפות עם השתקת כף יד'), chart: chartOf(key, prog), keyName: `${keyNameOf(key, true)}m`, evenness: false, bass: { asym: { ms: 8, db: 3 } }, drums: { groove: 'rock-16' } });
}

// ───────────────────────────── dispatch and catalogue ─────────────────────────────

/** Build a drill of the P2 levels here (called from bass.ts generateBass). */
export function generateBassNiche2(s: DrillSpec, tu: Tuning): Drill {
  switch (s.family as BassFamilyId) {
    case 'b-walk':
      return genWaltz(s, tu);
    case 'b-std':
      return genTier(s, tu);
    case 'b-ext':
      return genExt(s, tu);
    case 'b-impro':
      return genImproFusion(s, tu);
    case 'b-pick':
      return genPickTop(s, tu);
  }
  throw new Error(`Not a P2 bass family: ${s.family}`);
}

type LFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type FamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
const spOf =
  (family: BassFamilyId, o0: Partial<SpecTemplate> = {}) =>
  (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'bass', ...o0, ...o });

/** b-walk 19–20 (appended to the walking family in bass.ts). */
export function waltzLevels(L: LFn): GuitarLevelDef[] {
  const WK = spOf('b-walk');
  return [
    L('b-walk', 19, 'Jazz waltz: walking in 3', 'ואלס ג׳אז: ווקינג בשלוש', [WK('waltz', { perBeat: 1 }), WK('waltz', { perBeat: 1, option: 1 })], [0, 5, 10, 7], [120, 180], 'quarters'),
    L('b-walk', 20, 'A blues-waltz chorus', 'סבב של בלוז ואלס', [WK('blues-waltz', { perBeat: 1 })], [5, 10, 7, 0], [120, 200], 'quarters'),
  ];
}

/** The standards ladder (jazz track, after b-latin in teaching order). */
export function standardsFamily(L: LFn, fam: FamFn): GuitarFamilyDef {
  const ST = spOf('b-std');
  const tier = (t: number) => tierOps(t).map((o) => ST('tier', { option: o, perBeat: STD_LADDER[o].feel === 'walk' ? 1 : 0.5 }));
  return fam('b-std', 'Standards ladder', 'סולם הסטנדרטים', [
    L('b-std', 1, 'Tier 1: blues and modal tunes', 'דרגה 1: בלוזים ושירים מודאליים', tier(1), [0], [100, 160], 'quarters / halves'),
    L('b-std', 2, 'Tier 2: rhythm changes and ii–V tunes', 'דרגה 2: ריתם צ׳יינג׳ס ושירי ii–V', tier(2), [0], [120, 200], 'quarters / halves'),
    L('b-std', 3, 'Tier 3: minor tunes, bossas and ballads', 'דרגה 3: שירים במינור, בוסות ובלדות', tier(3), [0], [80, 160], 'quarters / halves / bossa'),
    L('b-std', 4, 'Tier 4: bebop up-tempo', 'דרגה 4: ביבופ בטמפו מהיר', tier(4), [0], [200, 280], 'quarters'),
    L('b-std', 5, 'Tier 5: Coltrane changes and moving keys', 'דרגה 5: קולטריין צ׳יינג׳ס וסולמות נעים', tier(5), [0], [120, 200], 'quarters'),
  ]);
}

/** Extended techniques (both tracks, after b-legato in teaching order). */
export function extFamily(L: LFn, fam: FamFn): GuitarFamilyDef {
  const EX = spOf('b-ext');
  const K = [0, 5, 7, 10, 3];
  return fam('b-ext', 'Extended techniques', 'טכניקות מורחבות', [
    L('b-ext', 1, 'Natural harmonics 12 to 3', 'הרמוניקים טבעיים מ־12 עד 3', [EX('nat-harm', { perBeat: 1 })], [4], [60, 90], 'quarters'),
    L('b-ext', 2, 'Harmonic chords and melodies', 'אקורדים ומנגינות בהרמוניקים', [EX('harm-chord', { perBeat: 0.5 }), EX('harm-chord', { perBeat: 1, option: 1 })], [4], [60, 80], 'halves / quarters'),
    L('b-ext', 3, 'Artificial harmonics', 'הרמוניקים מלאכותיים', [EX('art-harm', { perBeat: 1 })], [4, 9, 2, 7], [60, 80], 'quarters'),
    L('b-ext', 4, 'Two-hand tapping: R-5-8-10', 'טאפינג בשתי ידיים: R-5-8-10', [EX('tap', { perBeat: 4 })], K, [60, 100], '16ths'),
    L('b-ext', 5, 'Tapped arpeggios through ii–V–I', 'ארפג׳יו בטאפינג על ii–V–I', [EX('tap-iivi', { perBeat: 4 })], K, [60, 100], '16ths'),
    L('b-ext', 6, 'Double-stops: 10ths and shells', 'צלילים כפולים: דצימות ושלדים', [EX('dstop', { perBeat: 0.5 }), EX('dstop', { perBeat: 0.5, option: 1 })], K, [60, 100], 'halves'),
    L('b-ext', 7, 'Comping on the bass', 'ליווי אקורדים על הבס', [EX('comp'), EX('comp', { option: 1 })], [5, 10, 7, 0], [80, 120], 'Charleston'),
    L('b-ext', 8, 'Fretless intonation', 'אינטונציה בפרטלס', [EX('fretless', { perBeat: 0.5, tuning: 'bass-fretless' })], K, [60, 90], 'halves'),
  ]);
}

/** b-impro 15–18 (fusion harmony lines, appended after the P1 levels). */
export function fusionLevels(L: LFn): GuitarLevelDef[] {
  const IM = spOf('b-impro');
  const S16 = '16ths';
  return [
    L('b-impro', 15, 'Fusion vamps: Lydian and sus in 16ths', 'וואמפים של פיוז׳ן: לידי ו־sus בשש-עשריות', [IM('fus-vamp', { perBeat: 4 }), IM('fus-vamp', { perBeat: 4, option: 1 })], [0, 5, 7, 2], [70, 110], S16),
    L('b-impro', 16, 'Constant structure', 'מבנה קבוע', [IM('constant', { perBeat: 4 }), IM('constant', { perBeat: 4, option: 1 })], [0, 5, 7, 2], [70, 110], S16),
    L('b-impro', 17, 'Altered lines in 16ths', 'קווי אלטרד בשש-עשריות', [IM('alt16', { perBeat: 4 })], [9, 2, 7, 0], [70, 110], S16),
    L('b-impro', 18, 'Upper-structure arpeggios', 'ארפג׳יו של מבנה עליון', [IM('ust', { perBeat: 4 })], [0, 5, 10, 3], [70, 110], S16),
  ];
}

/** b-pick 9–10 (the rock stamina top). */
export function pickTopLevels(L: LFn): GuitarLevelDef[] {
  const PI = spOf('b-pick');
  return [
    L('b-pick', 9, 'Down-strokes for two minutes', 'מכות למטה במשך שתי דקות', [PI('stamina8')], [4, 9], [150, 200], '8ths'),
    L('b-pick', 10, 'Palm-muted alternate 16ths', 'שש-עשריות מתחלפות עם השתקה', [PI('mute16', { perBeat: 4, minor: true })], [4, 9, 2], [120, 150], '16ths'),
  ];
}

/** b-up-walk 6–9 (the upright jazz top; the levels carry the upright tuning). */
export function uprightTopLevels(L: LFn): GuitarLevelDef[] {
  const WU = spOf('b-up-walk', { tuning: 'upright' });
  return [
    L('b-up-walk', 6, 'Standards on the upright, in tune', 'סטנדרטים על הקונטרבס, מכוונים', UP_STD.map((_, o) => WU('up-std', { perBeat: 1, option: o })), [0], [100, 180], 'quarters'),
    L('b-up-walk', 7, 'Up-tempo pizzicato walking', 'ווקינג בפיציקטו בטמפו מהיר', [WU('up-fast', { perBeat: 1 })], [10, 5, 3], [160, 260], 'quarters'),
    L('b-up-walk', 8, 'A solo in thumb position', 'סולו במצב אגודל', [WU('up-solo', { swing: true }), WU('up-solo', { swing: true, option: 1 })], [5, 10, 7, 0], [90, 150], 'swung 8ths'),
    L('b-up-walk', 9, 'Arco head-style line', 'קו נושא בקשת', [WU('up-arco', { perBeat: 0.5 }), WU('up-arco', { perBeat: 0.5, option: 1 })], [0, 5, 10, 7], [60, 90], 'halves'),
  ];
}

/** The fretless level (hidden unless the bass is fretless or an upright). */
export const FRETLESS_LEVELS = ['b-ext-8'];
/** The set-list badge: every tier of the standards ladder reached. */
export const SETLIST = { title: tt('Set list', 'רשימת שירים'), levels: [1, 2, 3, 4, 5].map((t) => `b-std-${t}`) };

// Exam / board tags for the P2 levels (shown on the level card).
export const NICHE2_EXAM: Record<string, [string, string][]> = {
  'b-std-4': [['Berklee', 'standards repertoire']],
  'b-walk-19': [['Bagrut', 'jazz waltz']],
  'b-ext-6': [['Berklee', 'chordal bass']],
};
