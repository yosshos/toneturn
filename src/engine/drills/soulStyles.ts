// Soul-jazz, gospel and funk-jazz on piano, guitar and bass (docs/SPEC-JAZZ-NEIGHBOURS.md §4). Every pattern is a
// convention written from the verified research — docs/research/STYLE-SOUL.md, claims tagged [V] or well-sourced [C],
// plus the owner's two confirmed additions (the I–ii / ii–I rocking through the inversions; the two "gospel scale" forms
// as melodic material, the 7th a melodic tendency, not a rule). The [?] material is left out (named below). Rhythms,
// progressions and comping patterns are not protectable; no tune is used.
//
//   k-gospel    piano: IV/I over the tonic pedal and the repeated plagal I–IV [V]; I–IV and I–ii / ii–I rocking through
//               the inversions [V owner]; the minor plagal IV–iv–I with the 6–♭6–5 inner voice [V]; the 1–4 and 2–5
//               walk-ups [V]; IV/V and V9sus → V [V]; ♭III7–III7–IV [V]; 1625 with an altered VI7 and the VII7 → VI7
//               approach [V]; IV–♯iv°7–I/5 with chromatic octave approaches in the left hand [V]; VI7sus–♭VI7–II7–V7 [V];
//               grace notes into the 3rds [V]; the two gospel scales [V owner]; the 12/8 feel [C] and with the drums.
//   k-souljazz  piano: Charleston comping in 3–7 guide tones [V] over the I7–IV7 vamp [C], the soul-jazz blues (ii–V in
//               bars 4, 8, 10, 12) [V], a walking left hand, drop 2 with ♭9 / ♯9 / ♭13 [V], the minor blues [C]; with the
//               shuffle drums and the band.
//   g-soul      guitar: the Charleston in guide tones [V], drop 2 behind the organ [V]; funk — the 9 chord on every
//               downbeat with muted 16ths between [C], the one-chord vamp and the m7 + related dominant [V]; with the band.
//   b-soul      bass: the boogie figure R–3–5–6–♭7–6–5–3 under the shuffle blues [C]; walking the soul-jazz blues [V];
//               the gospel walk-ups 1–2–3–4 and 2–3–♯4–5 [V]; the generic funk line with the "one" [C]/[V]; with the band.
//
// Left out as [?] (STYLE-SOUL §11.7): the boogaloo groove and bass line, the descending 1–♭7–6–♭6 bass, which chords of
// 3–6–2–5–1 are dominant, shout tempo / loops / bass lines, the gospel drawbar settings, specific funk keys / guitar
// syncopations (§3.2), the organ comp rhythm in a shuffle (§2.3), named gospel licks. Every item: all 12 keys, free time
// first (rubato.ts), then the tempo ladder with count-in and click; the "with the band" levels are groove drills (the
// drums under the take), timed from the start like every band drill. Pure and deterministic.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { generate, itemIdOf } from './generate';
import { all12 } from './keys12';
import { closeVoicings, rootless, voiceLead } from '../band';
import { parseChart, type ChartChordEv } from '../charts';
import { chartKind } from './chartDrills';
import { noteNameIn, transposeTextIn } from '../stdKey';
import type { StyleId } from '../styles';
import type { Tuning } from '../fretboard';
import { noteAt } from '../fretboard';
import { finish as gFinish, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type GuitarStyle } from './guitar';
import { guitarCands, lead, placements } from './cadenceLibrary';
import { alt, drillOf, rootOf, type BN } from './bass';
import type { BassFamilyId } from './types';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m = 12): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
/** A pitch class named for the drill's key (♯ in the sharp keys, ♭ in the flat ones). */
const nameIn = (p: number, key: number): string => noteNameIn(p, { key: ((key % 12) + 12) % 12 });
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const KEYS = all12([0, 7, 5]);

// ───────────────────────────── chords ─────────────────────────────

/** A chord: root (semitones above the key), intervals, bass (semitones above the key), symbol suffix. */
interface Ch {
  root: number;
  iv: number[];
  bass?: number;
  suf: string;
}
const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const DOM = [0, 4, 7, 10];
const ch = (root: number, iv: number[], suf: string, bass?: number): Ch => ({ root, iv, suf, ...(bass !== undefined ? { bass } : {}) });
/** The chord's name in a key (a slash bass when it is not the root). */
function nameOf(key: number, c: Ch): string {
  const r = mod(key + c.root);
  const b = mod(key + (c.bass ?? c.root));
  return `${nameIn(r, key)}${c.suf}${b !== r ? `/${nameIn(b, key)}` : ''}`;
}
const evOf = (key: number, c: Ch): ChartChordEv => {
  const root = mod(key + c.root);
  return { root, iv: c.iv, bass: mod(key + (c.bass ?? c.root)), sym: nameOf(key, c), beats: 4, bar: 0, at: 0 };
};

/** Close triads of three pitch classes, every inversion with its lowest note in [lo, hi]. */
function triads(pcs: number[], lo: number, hi: number): number[][] {
  const out: number[][] = [];
  for (let inv = 0; inv < 3; inv++) {
    const order = [...pcs.slice(inv), ...pcs.slice(0, inv)];
    for (let base = lo; base <= hi; base++) {
      if (mod(base) !== mod(order[0])) continue;
      const v = [base];
      for (const x of order.slice(1)) {
        let m = v[v.length - 1] + 1;
        while (mod(m) !== mod(x)) m++;
        v.push(m);
      }
      out.push(v);
    }
  }
  return out;
}
/** The right hand's voicing of a chord: a close triad (3 notes) or, on a 7th chord, the rootless form; voice-led. */
function rhOf(key: number, c: Ch, prev: number[] | null, kind: 'triad' | 'rootless' = c.iv.length > 3 ? 'rootless' : 'triad'): number[] {
  const e = evOf(key, c);
  if (kind === 'rootless') {
    const v = voiceLead(rootless(e), prev);
    return v.map((m) => (Math.min(...v) < 53 ? m + 12 : m));
  }
  return voiceLead(triads(c.iv.slice(0, 3).map((x) => e.root + x), 55, 67), prev);
}
/** A left-hand note in C2–B2. */
const lhNote = (pc: number): number => 36 + mod(pc - 36);
/** A left-hand octave's lower note in G1–F♯2 (the octave stays under the right hand's G3). */
const lhLow = (pc: number): number => 31 + mod(pc - 31);

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, ps: number[], hand: 'R' | 'L', o: Partial<ExpNote> = {}): void {
    const id = ps.length > 1 ? ++this.cid : undefined;
    for (const p of ps) this.list.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id !== undefined ? { chordId: id } : {}), ...o });
  }
}

function pianoDone(s: DrillSpec, n: Notes, title: T2, goal: Partial<DrillGoal>, extra: Partial<Drill> = {}): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const hands = new Set(notes.map((x) => x.hand));
  return {
    spec: { ...s, hands: hands.size > 1 ? 'RL' : notes[0]?.hand === 'L' ? 'L' : 'R' },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter: 4,
    keySig: SIG[mod(s.key)],
    goal: { evenness: false, hands: hands.size > 1, ...goal },
    startBpm: s.tempo ?? 70,
    ...extra,
  };
}
const titleOf = (en: string, he: string, key: number): T2 => t(`${en} · ${nameIn(mod(key), key)}`, `${he} · ${nameIn(mod(key), key)}`);

// ───────────────────────────── k-gospel ─────────────────────────────

/** A timed chord of a gospel drill: [chord, beats]. */
type Step = [Ch, number];
const I = ch(0, MAJ, '');
const IV = ch(5, MAJ, '');
const V = ch(7, MAJ, '');
const ii = ch(2, MIN, 'm');
/** Repeat steps to `bars` bars of 4/4. */
function fill(steps: Step[], bars: number): Step[] {
  const out: Step[] = [];
  let at = 0;
  for (let i = 0; at < bars * 4 - 1e-9; i++) {
    const s = steps[i % steps.length];
    out.push(s);
    at += s[1];
  }
  return out;
}
/** Chart bars from steps: the chords that start in each bar. */
function chartOf(key: number, steps: Step[]): string[] {
  const bars: string[][] = [];
  let at = 0;
  for (const [c, b] of steps) {
    const bar = Math.floor(at / 4 + 1e-9);
    (bars[bar] ??= []).push(nameOf(key, c));
    at += b;
  }
  return bars.map((x) => x?.join(' ') ?? '%');
}

/** One of the three positions of a triad on `root` with its lowest note near the 4th octave: inversion k (0, 1, 2; 3 = root position an octave up). */
function position(rootPc: number, iv: number[], k: number): number[] {
  const r0 = 52 + mod(rootPc - 52);
  const base = [r0, r0 + iv[1], r0 + iv[2]];
  const v = [...base];
  for (let i = 0; i < k; i++) {
    const low = v.shift()!;
    v.push(low + 12);
  }
  return v;
}
/** The slash name of a triad voicing (its lowest note as the bass). */
const slashName = (key: number, c: Ch, v: number[]): Ch => ({ ...c, bass: mod(Math.min(...v) - key) });

function genGospel(s: DrillSpec): Drill {
  const key = mod(s.key);
  const op = s.option ?? 0;
  const n = new Notes();
  let prev: number[] | null = null;
  /** Lay the steps out: the right hand voiced (or given), the left hand on the bass. */
  const lay = (steps: Step[], o: { rh?: (c: Ch, i: number) => number[] | null; lh?: 'root' | 'pedal' | 'octave'; graces?: boolean } = {}) => {
    let at = 0;
    steps.forEach(([c, b], i) => {
      const v = o.rh?.(c, i) ?? rhOf(key, c, prev);
      prev = v;
      if (o.graces) {
        // a grace a half step below the chord's 3rd (Pianote: "slide from a black key to the white target")
        const third = mod(key + c.root + (c.iv.includes(4) ? 4 : 3));
        n.add(at, b, v.filter((m) => mod(m) !== third), 'R');
        for (const m of v.filter((x) => mod(x) === third)) n.add(at, b, [m], 'R', { graces: [{ pitch: m - 1, slash: true }] });
      } else n.add(at, b, v, 'R');
      const bassPc = o.lh === 'pedal' ? key : mod(key + (c.bass ?? c.root));
      n.add(at, b, o.lh === 'octave' ? [lhLow(bassPc), lhLow(bassPc) + 12] : [lhNote(bassPc)], 'L');
      at += b;
    });
    return at;
  };
  const end = (at: number, c: Ch = I) => {
    const v = rhOf(key, c, prev);
    n.add(at, 4, v, 'R');
    n.add(at, 4, [lhNote(mod(key + c.root))], 'L');
  };
  switch (s.kind) {
    case 'gs-plagal': {
      // op 0: IV/I ↔ I over the tonic pedal — RH 3–5–1 ↔ 4–6–1, the tonic on top ([C] the gospel lesson sites;
      // [V] the plagal cadence); op 1: the repeated plagal I–IV, IV over its own bass ([V] Wikipedia *Plagal cadence*).
      const top = 67 + mod(key - 67);
      const steps = fill([[I, 4], [op ? IV : ch(5, MAJ, '', 0), 4]], 8);
      const at = lay(steps, { rh: (c) => (c.root === 0 ? [top - 8, top - 5, top] : [top - 7, top - 3, top]), lh: op ? 'root' : 'pedal' });
      n.add(at, 4, [top - 8, top - 5, top], 'R');
      n.add(at, 4, [lhNote(key)], 'L');
      return pianoDone(s, n, titleOf(op ? 'The repeated plagal: I–IV–I–IV' : 'IV/I over the tonic: 3–5–1 and 4–6–1', op ? 'הפלגלית החוזרת: I–IV–I–IV' : 'IV/I מעל הטוניקה: 3–5–1 ו־4–6–1', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-rock': {
      // Rocking through the inversions (STYLE-SOUL, owner addition): I in root position, 1st, 2nd inversion (and root
      // position an octave up), each rocking to IV (op 0) or ii (op 1, 2) and back by step, the top voice moving by step.
      // op 2 starts on ii (ii–I). Each chord's lowest note is its bass (C, F/C, C/E, F, C/G, F/A …).
      const other = op === 0 ? IV : ii;
      const order = [0, 1, 2, 3, 2, 1, 0];
      const steps: Step[] = [];
      const rhs: number[][] = [];
      for (const k of order) {
        if (op === 2) {
          const a = position(mod(key + other.root), other.iv, k);
          const b = voiceLead(triads(I.iv.map((x) => key + x), a[0] - 3, a[0] + 3), a);
          steps.push([slashName(key, other, a), 2], [slashName(key, I, b), 2]);
          rhs.push(a, b);
        } else {
          const a = position(key, I.iv, k);
          const b = voiceLead(triads(other.iv.map((x) => key + other.root + x), a[0] - 3, a[0] + 3), a);
          steps.push([slashName(key, I, a), 2], [slashName(key, other, b), 2]);
          rhs.push(a, b);
        }
      }
      const at = lay(steps, { rh: (_, i) => rhs[i], lh: 'root' });
      const last = position(key, I.iv, 0);
      n.add(at, 4, last, 'R');
      n.add(at, 4, [lhNote(key)], 'L');
      const T: [string, string][] = [
        ['I–IV through the inversions', 'I–IV דרך ההיפוכים'],
        ['I–ii through the inversions', 'I–ii דרך ההיפוכים'],
        ['ii–I through the inversions', 'ii–I דרך ההיפוכים'],
      ];
      return pianoDone(s, n, titleOf(T[op][0], T[op][1], key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-minor': {
      // I – I7 – IV – iv – I: the ♭6 falls to 5 in an inner voice (A → A♭ → G in C) [V] Wikipedia *Plagal cadence*.
      const steps = fill([[I, 4], [ch(0, [4, 7, 10], '7'), 4], [IV, 4], [ch(5, MIN, 'm'), 4]], 8);
      const at = lay(steps, { rh: (c) => (c.suf === '7' ? voiceLead(triads([key + 4, key + 7, key + 10], 55, 67), prev) : null), lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf('I–I7–IV–iv–I: the 6 falls to ♭6, then 5', 'I–I7–IV–iv–I: ה־6 יורד ל־♭6 ואז ל־5', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-walk': {
      // op 0: the 1–4 walk-up I – ♭VII/2 – I/3 – IVmaj7, the bass 1–2–3–4 [V] Hear and Play; op 1: the 2–5 walk-up
      // ii – I/3 – II/♯4 – V, the bass 2–3–♯4–5 [V] Hear and Play. The second chord of the bar and the third are quarters.
      const steps: Step[] = op
        ? fill([[ii, 2], [ch(0, MAJ, '', 4), 1], [ch(2, MAJ, '', 6), 1], [V, 4]], 8)
        : fill([[I, 2], [ch(10, MAJ, '', 2), 1], [ch(0, MAJ, '', 4), 1], [ch(5, [0, 4, 7, 11], 'maj7'), 4]], 8);
      const at = lay(steps, { rh: (c) => (c.suf === 'maj7' ? voiceLead(triads([key + 9, key + 12, key + 16], 55, 67), prev) : null), lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf(op ? 'The 2–5 walk-up: the bass 2–3–♯4–5' : 'The 1–4 walk-up: the bass 1–2–3–4', op ? 'העלייה מ־2 ל־5: הבס 2–3–♯4–5' : 'העלייה מ־1 ל־4: הבס 1–2–3–4', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-sus': {
      // op 0: IV/V → I — the IV triad over the 5th = V9sus4 [V] Pianote; op 1: V9sus4 → V (the 4th falls to the 3rd, the
      // other voices stay: IV's triad, then its root a half step down) → I [V] PianoGroove.
      const IVt = [key + 5, key + 9, key + 12];
      const sus = voiceLead(triads(IVt, 55, 67), null);
      const nine = sus.map((m) => (mod(m) === mod(key) ? m - 1 : m));
      const steps: Step[] = op ? fill([[ch(7, [0, 5, 7, 10, 14], '9sus4'), 2], [ch(7, [0, 4, 7, 10, 14], '9'), 2], [I, 4]], 8) : fill([[ch(5, MAJ, '', 7), 4], [I, 4]], 8);
      const at = lay(steps, { rh: (c) => (c.suf === '9sus4' || c.bass === 7 ? sus : c.suf === '9' ? nine : null), lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf(op ? 'V9sus4 → V9 → I: the sus falls to the 3rd' : 'IV/V → I: the gospel sus dominant', op ? 'V9sus4 ← V9 ← I: הסאס יורד לטרצה' : 'IV/V ← I: הדומיננטה הסאס של הגוספל', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-chrom': {
      // I – ♭III7 – III7 – IV: the chromatic dominant walk-up into IV [V] PianoGroove (A♭7 – A7 – B♭ in F).
      const steps = fill([[I, 4], [ch(3, DOM, '7'), 2], [ch(4, DOM, '7'), 2], [IV, 4], [I, 4]], 8);
      const at = lay(steps, { lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf('♭III7–III7 into IV', '♭III7–III7 אל IV', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-1625': {
      // I – VI7(♭9) – ii7 – V7 [V] PianoGroove; op 1 with VII7 → VI7, the chromatic approach into the VI7 [V].
      const steps: Step[] = op
        ? fill([[I, 4], [ch(11, DOM, '7'), 2], [ch(9, [0, 4, 7, 10, 13], '7♭9'), 2], [ch(2, [0, 3, 7, 10], 'm7'), 4], [ch(7, DOM, '7'), 4]], 8)
        : fill([[I, 4], [ch(9, [0, 4, 7, 10, 13], '7♭9'), 4], [ch(2, [0, 3, 7, 10], 'm7'), 4], [ch(7, DOM, '7'), 4]], 8);
      const at = lay(steps, { lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf(op ? '1–6–2–5 with VII7 into VI7♭9' : '1–6–2–5 with an altered VI7', op ? '1–6–2–5 עם VII7 אל VI7♭9' : '1–6–2–5 עם VI7 אלטרד', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-dim': {
      // IV – ♯iv°7 – I/5 – V7 – I, the bass stepping 4–♯4–5 [V] PianoGroove; op 1: the left hand in octaves, each new bass
      // note approached from two half steps away [V] Pianote (E♭–E–F into F).
      const steps = fill([[IV, 4], [ch(6, [0, 3, 6, 9], '°7'), 4], [ch(0, MAJ, '', 7), 2], [ch(7, DOM, '7'), 2], [I, 4]], 8);
      let at = 0;
      steps.forEach(([c, b], i) => {
        const v = c.suf === '°7' ? voiceLead(closeVoicings(evOf(key, c)), prev) : rhOf(key, c, prev);
        prev = v;
        n.add(at, b, v, 'R');
        const lhOf = op ? lhLow : lhNote;
        const bass = lhOf(mod(key + (c.bass ?? c.root)));
        const next = steps[i + 1] ? lhOf(mod(key + (steps[i + 1][0].bass ?? steps[i + 1][0].root))) : lhOf(key);
        const oct = (m: number) => (op ? [m, m + 12] : [m]);
        const gap = next - bass;
        if (op && b >= 4 && Math.abs(gap) > 2) {
          const t0 = next + (gap > 0 ? -2 : 2);
          const t1 = next + (gap > 0 ? -1 : 1);
          n.add(at, 2, oct(bass), 'L');
          n.add(at + 2, 1, oct(t0), 'L');
          n.add(at + 3, 1, oct(t1), 'L');
        } else n.add(at, b, oct(bass), 'L');
        at += b;
      });
      end(at);
      return pianoDone(s, n, titleOf(op ? 'IV–♯iv°7–I/5: octave approaches in the left hand' : 'IV–♯iv°7–I/5–V7–I: the bass steps 4–♯4–5', op ? 'IV–♯iv°7–I/5: גישות באוקטבות ביד שמאל' : 'IV–♯iv°7–I/5–V7–I: הבס צועד 4–♯4–5', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-trit': {
      // VI7sus – ♭VI7 – II7 – V7 – I: the tritone substitute inside 1–6–2–5 [V] PianoGroove.
      const steps = fill([[I, 4], [ch(9, [0, 5, 7, 10], '7sus4'), 2], [ch(8, DOM, '7'), 2], [ch(2, DOM, '7'), 2], [ch(7, DOM, '7'), 2]], 8);
      const at = lay(steps, { lh: 'root' });
      end(at);
      return pianoDone(s, n, titleOf('VI7sus–♭VI7–II7–V7–I', 'VI7sus–♭VI7–II7–V7–I', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-grace': {
      // I – IV – I – IV with a grace a half step below each chord's 3rd [V] Pianote (E♭ → E over C).
      const steps = fill([[I, 4], [IV, 4]], 8);
      const at = lay(steps, { lh: 'root', graces: true });
      end(at);
      return pianoDone(s, n, titleOf('Grace notes into the 3rds', 'צלילי חן אל הטרצות', key), { graces: 'strict' }, { chart: [...chartOf(key, steps), nameIn(key, key)] });
    }
    case 'gs-scale': {
      // The gospel scale as melodic material (STYLE-SOUL "Gospel and the 7th degree", owner-agreed): op 0 major without
      // the 7th 1 2 3 4 5 6 (Weisman); op 1 1 2 ♭3 3 5 6 (the major blues form most sources give). Up to the octave and
      // down, 8ths, over the I–IV vamp; no 7th anywhere.
      const deg = op ? [0, 2, 3, 4, 7, 9] : [0, 2, 4, 5, 7, 9];
      const T0 = 60 + mod(key - 60);
      const line = [...deg, 12, ...deg.slice(1).reverse()];
      for (let rep = 0; rep < 4; rep++) {
        const b0 = rep * 8;
        line.forEach((d, i) => n.add(b0 + i / 2, 0.5, [T0 + d], 'R'));
        n.add(b0 + 6, 2, [T0], 'R');
        n.add(b0, 4, [lhNote(key)], 'L');
        n.add(b0 + 4, 4, [lhNote(key + 5)], 'L');
      }
      n.add(32, 2, [T0], 'R');
      n.add(32, 2, [lhNote(key)], 'L');
      const chart = [...Array.from({ length: 8 }, (_, b) => nameIn(mod(key + (b % 2 ? 5 : 0)), key)), nameIn(key, key)];
      return pianoDone(s, n, titleOf(op ? 'The gospel scale 1 2 ♭3 3 5 6 over I–IV' : 'The gospel scale 1 2 3 4 5 6 over I–IV', op ? 'סולם הגוספל 1 2 ♭3 3 5 6 על I–IV' : 'סולם הגוספל 1 2 3 4 5 6 על I–IV', key), {}, { chart });
    }
    case 'gs-68':
    case 'gs-band': {
      // The gospel 12/8: the left hand an octave on 1 and 3 and the 5th on 2 and 4, the right hand a triad on every
      // triplet 8th, the beats accented ([C] PianoGroove "12/8 Grooves"; Tim Richards "Gospel groove"), over the repeated
      // plagal I–IV [V]. With the drums: the slow-blues 12/8 groove.
      const steps = fill([[I, 4], [IV, 4]], 8);
      let at = 0;
      for (const [c] of steps) {
        const v = rhOf(key, c, prev);
        prev = v;
        for (let k = 0; k < 12; k++) n.add(at + k / 3, 1 / 3, v, 'R', k % 3 === 0 ? { accent: true } : {});
        const r = lhLow(mod(key + c.root));
        const f = r + 7;
        n.add(at, 1, [r, r + 12], 'L');
        n.add(at + 1, 1, [f], 'L');
        n.add(at + 2, 1, [r, r + 12], 'L');
        n.add(at + 3, 1, [f], 'L');
        at += 4;
      }
      end(at);
      const band = s.kind === 'gs-band';
      return pianoDone(s, n, titleOf(band ? 'Gospel 12/8 with the drums' : 'The gospel 12/8: triads on every triplet', band ? 'גוספל 12/8 עם התופים' : 'גוספל 12/8: משולשים על כל טריולה', key), {}, { chart: [...chartOf(key, steps), nameIn(key, key)], ...(band ? { drums: { groove: 'slow-blues' } } : {}) });
    }
  }
  throw new Error(`Unknown k-gospel kind ${s.kind}`);
}

// ───────────────────────────── k-souljazz ─────────────────────────────

/** The chart kinds of k-souljazz (generate.ts plays every "chart~" kind); the band level wraps one with the drums. */
const SJ_CHART = (set: string, voicing: 'guide' | 'drop2' | 'walk-lh', rhythm: 'charleston' | 'whole' = 'charleston') => chartKind(`set:${set}`, voicing, rhythm);

function genSoulJazzBand(s: DrillSpec): Drill {
  // The guide-tone Charleston over the soul-jazz blues (op 0) or the minor blues (op 1), with the shuffle and the band's
  // walking bass (its piano lays out: the player comps).
  const kind = SJ_CHART((s.option ?? 0) ? 'sj-minor' : 'sj-blues', 'guide');
  const d = generate({ ...s, kind, swing: true });
  return { ...d, spec: { ...d.spec, kind: s.kind }, itemId: itemIdOf(s), title: t(`${d.title.en} · with the band`, `${d.title.he} · עם הלהקה`), drums: { groove: 'shuffle' }, band: { style: 'souljazz', bass: true, comp: false } };
}

/** The piano entry (generate.ts): k-gospel, and the k-souljazz band level (its chart levels go to genChart). */
export function genSoulPiano(s: DrillSpec): Drill {
  return s.family === 'k-souljazz' ? genSoulJazzBand(s) : genGospel(s);
}

// ───────────────────────────── g-soul ─────────────────────────────

/** A chart in a key, parsed (the progressions of the soul-jazz chart sets, chartDrills.ts). */
const SJ_TEXT: Record<string, string> = {
  vamp: 'C7 | F7 | C7 | F7 | C7 | F7 | C7 | F7',
  blues: 'C7 | F7 | C7 | Gm7 C7 | F7 | F7 | C7 | Em7 A7 | Dm7 | G7 | C7 | Dm7 G7',
  alt: 'C7 | F7 | C7 | Gm7 C7b9 | F7 | F7 | C7 | Em7 A7#9 | Dm7 | G7b13 | C7 | Dm7 G7b9',
  funk1: 'C9 | C9 | C9 | C9 | C9 | C9 | C9 | C9',
  funk2: 'Cm7 | F9 | Cm7 | F9 | Cm7 | F9 | Cm7 | F9',
};
const sjChart = (id: string, key: number) => {
  const text = transposeTextIn(SJ_TEXT[id], key, { key });
  return { text, p: parseChart(text), bars: text.split('|').map((b) => b.trim().replace(/([A-G])b/g, '$1♭').replace(/([A-G])#/g, '$1♯').replace(/(\d)b(\d)/g, '$1♭$2').replace(/(\d)#(\d)/g, '$1♯$2')) };
};

/** A grip on given strings (high to low order of `strings` is low → high), the root on the first string near `near`. */
function grip(tu: Tuning, rootPc: number, ivs: number[], strings: number[], near: number): GN[] | null {
  let best: GN[] | null = null;
  let bestD = Infinity;
  for (let f0 = 1; f0 <= 14; f0++) {
    if (mod(noteAt(tu, strings[0], f0) - rootPc) !== 0) continue;
    const out: GN[] = [{ s: strings[0], f: f0 }];
    let ok = true;
    for (let i = 1; i < strings.length; i++) {
      const want = mod(rootPc + ivs[i]);
      let found = -1;
      for (let f = Math.max(0, f0 - 2); f <= f0 + 3; f++) if (mod(noteAt(tu, strings[i], f)) === want) found = f;
      if (found < 0) {
        ok = false;
        break;
      }
      out.push({ s: strings[i], f: found });
    }
    if (!ok) continue;
    const d = Math.abs(f0 - near);
    if (d < bestD) {
      bestD = d;
      best = out;
    }
  }
  return best;
}

function genSoulGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key);
  const op = s.option ?? 0;
  const evs: Ev[] = [];
  if (s.kind === 'gsj-funk' || (s.kind === 'gsj-band' && op === 1)) {
    // Funk: the chord on the downbeat of every beat, muted strokes on the other 16ths, the motion never stopping ([C]
    // funk handouts / TrueFire; the chank, [V] Wikipedia *Funk*). The 9 chord R–3–♭7–9–5 on strings 5-1 and the m7 stab
    // R–5–♭7–♭3 on strings 5-2 (STYLE-SOUL §4, [C] standard spellings). op 0 one chord (I9), op 1 i m7 – IV9 (the m7
    // and its related dominant, [V] Wikipedia *Funk*).
    const c = sjChart(op ? 'funk2' : 'funk1', key);
    let near = 5;
    for (let bar = 0; bar < 8; bar++) {
      const x = c.p.chords.find((y) => y.bar === bar)!;
      const minor = x.iv.includes(3);
      const g = grip(tu, x.root, minor ? [0, 7, 10, 15] : [0, 4, 10, 14, 19], minor ? [5, 4, 3, 2] : [5, 4, 3, 2, 1], near) ?? grip(tu, x.root, minor ? [0, 7, 10, 15] : [0, 4, 10, 14, 19], minor ? [5, 4, 3, 2] : [5, 4, 3, 2, 1], 7)!;
      near = g[0].f;
      for (let k = 0; k < 16; k++) {
        const beat = bar * 4 + k / 4;
        const down = k % 2 === 0;
        if (k % 4 === 0) evs.push({ beat, dur: 0.25, notes: g.map((p) => ({ ...p, tech: 'strum-down', stroke: 'D', ...(k === 0 ? { acc: true } : {}) })) });
        else evs.push({ beat, dur: 0.25, notes: g.slice(1).map((p) => ({ ...p, tech: 'dead', stroke: down ? 'D' : 'U' })) });
      }
    }
    const end = grip(tu, key, op ? [0, 7, 10, 15] : [0, 4, 10, 14, 19], op ? [5, 4, 3, 2] : [5, 4, 3, 2, 1], near)!;
    evs.push({ beat: 32, dur: 2, notes: end.map((p) => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
    const band = s.kind === 'gsj-band';
    const ttl = band ? t('Funk with the band: the chord on every beat', 'פאנק עם הלהקה: האקורד על כל פעמה') : op ? t('Funk: i m7 – IV9, the chord on every beat, mutes between', 'פאנק: i m7 – IV9, האקורד על כל פעמה, השתקות ביניהן') : t('Funk: the 9 chord on every beat, mutes between', 'פאנק: אקורד 9 על כל פעמה, השתקות ביניהן');
    const d = gFinish({ ...s, swing: false }, tu, evs, { title: titleOf(ttl.en, ttl.he, key), bpm: 70, evenness: true, keySig: SIG[op ? mod(key + 3) : key] });
    return { ...d, chart: [...c.bars, op ? `${nameIn(key, key)}m7` : `${nameIn(key, key)}9`], ...(band ? { drums: { groove: 'funk-1' }, band: { style: 'funkjazz', bass: true, comp: false } } : {}) };
  }
  // Soul-jazz comping: the Charleston — beat 1 and the (swung) "and" of 2 — in two-note 3–7 guide tones (op 0 the vamp,
  // op 1 the blues), or drop 2 on the blues with ♭9 / ♯9 / ♭13 (gsj-drop2) ([V] Purcell, Premier Guitar).
  const drop2 = s.kind === 'gsj-drop2';
  const c = sjChart(drop2 ? 'alt' : op === 0 && s.kind !== 'gsj-band' ? 'vamp' : 'blues', key);
  let prev: { s: number; f: number }[] | null = null;
  const voice = (x: ChartChordEv) => {
    const third = x.iv.includes(4) ? 4 : 3;
    const sev = x.iv.includes(10) ? 10 : 11;
    const cands = drop2 ? guitarCands(tu, x, 'drop2') : placements(tu, [x.root + third, x.root + sev], [[4, 3], [3, 2]], () => true);
    // the first grip: the low position in the keys C–F, higher up the neck from F♯ (the tritone keys share their guide
    // tones, so the two halves of the cycle sit in different places)
    const lowF = (g: { s: number; f: number }[]) => Math.min(...g.map((q) => q.f));
    const first = (cs: { s: number; f: number }[][]) => (cs.length ? cs.reduce((a, g) => (Math.abs(lowF(g) - (key >= 6 ? 9 : 4)) < Math.abs(lowF(a) - (key >= 6 ? 9 : 4)) ? g : a)) : null);
    const v = (prev ? lead(tu, cands, prev) : first(cands)) ?? lead(tu, guitarCands(tu, x, 'shell'), prev)!;
    prev = v;
    return v;
  };
  // the swung "and" is written straight: the drill is swung (spec.swing), the engine plays and grades it long–short
  const sw = 0.5;
  for (let bar = 0; bar < c.p.bars; bar++) {
    const inBar = c.p.chords.filter((y) => y.bar === bar);
    if (inBar.length > 1) for (const x of inBar) evs.push({ beat: bar * 4 + x.at, dur: 1.3, notes: voice(x).map((p) => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
    else {
      const v = voice(inBar[0]);
      evs.push({ beat: bar * 4, dur: 0.8, notes: v.map((p) => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
      evs.push({ beat: bar * 4 + 1 + sw, dur: 1.2, notes: v.map((p) => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
    }
  }
  const tonic = evOf(key, ch(0, DOM, '7'));
  const endV = voice(tonic);
  evs.push({ beat: c.p.bars * 4, dur: 2, notes: endV.map((p) => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
  const band = s.kind === 'gsj-band';
  const ttl = band ? t('Soul-jazz blues with the band: the Charleston in guide tones', 'בלוז סול-ג׳אז עם הלהקה: צ׳רלסטון בצלילים מנחים') : drop2 ? t('Drop 2 behind the organ: ♭9, ♯9, ♭13 on the dominants', 'דרופ 2 מאחורי האורגן: ♭9, ♯9, ♭13 על הדומיננטים') : op ? t('The soul-jazz blues: the Charleston in guide tones', 'בלוז סול-ג׳אז: צ׳רלסטון בצלילים מנחים') : t('The Charleston in guide tones: I7–IV7', 'צ׳רלסטון בצלילים מנחים: I7–IV7');
  const d = gFinish({ ...s, swing: true }, tu, evs, { title: titleOf(ttl.en, ttl.he, key), bpm: 80, evenness: false, keySig: SIG[key] });
  return { ...d, chart: [...c.bars, `${nameIn(key, key)}7`], ...(band ? { drums: { groove: 'shuffle' }, band: { style: 'souljazz', bass: true, comp: false } } : {}) };
}

/** The guitar entry (guitar.ts): g-soul. */
export function genSoulGuitarDrill(s: DrillSpec, tu: Tuning): Drill {
  return genSoulGuitar(s, tu);
}

// ───────────────────────────── b-soul ─────────────────────────────

/** The bass lines of b-soul. */
export function generateBassSoul(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key);
  const op = s.option ?? 0;
  const R = (pc: number) => rootOf(tu, pc);
  const up = (r: number, iv: number) => (r + iv > 55 ? r + iv - 12 : r + iv);
  const line: BN[] = [];
  const kind = s.kind === 'bs-band' ? (op ? 'bs-funk' : 'bs-boogie') : s.kind;
  let chart: string[] = [];
  let title: T2;
  if (kind === 'bs-boogie') {
    // The boogie figure R–3–5–6–♭7–6–5–3 through the 12-bar blues, swung 8ths ([C] STYLE-SOUL §2.2; Pianist magazine).
    const BL = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
    BL.forEach((d, bar) => {
      const r = R(key + d);
      [0, 4, 7, 9, 10, 9, 7, 4].forEach((iv, k) => line.push({ b: bar * 4 + k / 2, d: 0.5, p: up(r, iv), ct: true, ...(k === 0 ? { acc: true } : {}) }));
    });
    line.push({ b: 48, d: 2, p: R(key), ct: true });
    chart = [...BL.map((d) => `${nameIn(mod(key + d), key)}7`), `${nameIn(key, key)}7`];
    title = t('The boogie figure under the shuffle blues', 'דמות הבוגי מתחת לבלוז השאפל');
  } else if (kind === 'bs-walk') {
    // Walking the soul-jazz blues (the ii–V in bars 4, 8, 10, 12, [V] Purcell): root, 3rd, 5th, a half step into the
    // next root; a two-chord bar: root, approach, root, approach.
    const c = sjChart('blues', key);
    const ch2 = c.p.chords;
    ch2.forEach((x, i) => {
      const r = R(x.root);
      const nx = ch2[i + 1] ?? { root: key };
      const nr = R(nx.root);
      const appr = nr - 1 >= tu.open[tu.open.length - 1] ? nr - 1 : nr + 1;
      const at = x.bar * 4 + x.at;
      const third = x.iv.includes(4) ? 4 : 3;
      if (x.beats >= 4) [r, up(r, third), up(r, 7), appr].forEach((p, k) => line.push({ b: at + k, d: 1, p, ct: k < 3 }));
      else [r, appr].forEach((p, k) => line.push({ b: at + k, d: 1, p, ct: k === 0 }));
    });
    line.push({ b: 48, d: 2, p: R(key), ct: true });
    chart = [...c.bars, `${nameIn(key, key)}7`];
    title = t('Walking the soul-jazz blues', 'בס מהלך בבלוז הסול-ג׳אז');
  } else if (kind === 'bs-walkup') {
    // The gospel walk-ups ([V] Hear and Play): op 0 1–2–3–4 under I – ♭VII/2 – I/3 – IVmaj7; op 1 2–3–♯4–5 under
    // ii – I/3 – II/♯4 – V. The root a half note, then two quarters, the target a whole note.
    const cells: [number, number][] = op ? [[2, 2], [4, 1], [6, 1], [7, 4]] : [[0, 2], [2, 1], [4, 1], [5, 4]];
    const names = op ? [`${nameIn(mod(key + 2), key)}m ${nameIn(key, key)}/${nameIn(mod(key + 4), key)} ${nameIn(mod(key + 2), key)}/${nameIn(mod(key + 6), key)}`, nameIn(mod(key + 7), key)] : [`${nameIn(key, key)} ${nameIn(mod(key + 10), key)}/${nameIn(mod(key + 2), key)} ${nameIn(key, key)}/${nameIn(mod(key + 4), key)}`, `${nameIn(mod(key + 5), key)}maj7`];
    const base = R(key + (op ? 2 : 0));
    for (let rep = 0; rep < 4; rep++) {
      let at = rep * 8;
      for (const [iv, d] of cells) {
        line.push({ b: at, d, p: base + (iv - (op ? 2 : 0)), ct: true });
        at += d;
      }
      chart.push(...names);
    }
    line.push({ b: 32, d: 2, p: R(key), ct: true });
    chart.push(nameIn(key, key));
    title = op ? t('The gospel 2–5 walk-up: 2–3–♯4–5', 'העלייה בגוספל מ־2 ל־5: 2–3–♯4–5') : t('The gospel 1–4 walk-up: 1–2–3–4', 'העלייה בגוספל מ־1 ל־4: 1–2–3–4');
  } else {
    // Funk: the generic line R . g R' . . g ♭7 . 5 . g R . g ♭3 ([C] STYLE-SOUL §3.2), dead notes ghosted, the "one"
    // accented ([V] Wikipedia *Funk*); op 0 the i m7 vamp, op 1 i m7 – IV7 (the m7 and its related dominant, [V]).
    const prog: [number, boolean][] = Array.from({ length: 8 }, (_, b) => (op && b % 2 ? [5, false] : [0, true]));
    prog.forEach(([d, minor], bar) => {
      const r = R(key + d);
      const third = minor ? 3 : 4;
      const cell: [number, number | 'g'][] = [[0, 0], [2, 'g'], [3, 12], [6, 'g'], [7, 10], [9, 7], [11, 'g'], [12, 0], [14, 'g'], [15, third]];
      for (const [step, iv] of cell) {
        const b = bar * 4 + step / 4;
        if (iv === 'g') line.push({ b, d: 0.25, p: r, tech: 'dead' });
        else line.push({ b, d: 0.25, p: up(r, iv), ct: true, ...(step === 0 ? { acc: true } : {}) });
      }
    });
    line.push({ b: 32, d: 1, p: R(key), ct: true });
    chart = [...prog.map(([d, minor]) => `${nameIn(mod(key + d), key)}${minor ? 'm7' : '7'}`), `${nameIn(key, key)}m7`];
    title = op ? t('Funk: the i m7 – IV7 vamp, the "one" and dead notes', 'פאנק: וואמפ i m7 – IV7, ה"אחת" ותווים מתים') : t('Funk: one chord, the "one" and dead notes', 'פאנק: אקורד אחד, ה"אחת" ותווים מתים');
  }
  const band = s.kind === 'bs-band';
  const funk = kind === 'bs-funk';
  const d = drillOf(s, tu, alt(line), {
    en: band ? `${title.en} · with the band` : title.en,
    he: band ? `${title.he} · עם הלהקה` : title.he,
    chart,
    evenness: false,
    ...(funk ? { bass: { ghostClass: 0.9 } } : {}),
    ...(band ? { drums: { groove: funk ? 'funk-1' : 'shuffle' }, band: funk ? ('funkjazz' as const) : ('souljazz' as const) } : {}),
  });
  return d;
}

// ───────────────────────────── the families ─────────────────────────────

/** The style of each new family (SPEC-STYLE-FOCUS). */
export const SOUL_FAMILY_STYLE: Record<string, StyleId> = { 'k-gospel': 'soul', 'k-souljazz': 'soul', 'g-soul': 'soul', 'b-soul': 'soul' };

export function keysGospelFamily(): FamilyDef {
  const fam: FamilyId = 'k-gospel';
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: fam, kind, hands: 'RL', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'soul' });
  return {
    id: fam,
    title: t('Gospel piano', 'פסנתר גוספל'),
    style: 'both',
    styleId: 'soul',
    levels: [
      L(1, 'IV/I over the tonic and the repeated plagal', 'IV/I מעל הטוניקה והפלגלית החוזרת', [sp('gs-plagal', 0), sp('gs-plagal', 1)], [60, 90]),
      L(2, 'I–IV through the inversions', 'I–IV דרך ההיפוכים', [sp('gs-rock', 0)], [60, 90]),
      L(3, 'I–ii and ii–I through the inversions', 'I–ii ו־ii–I דרך ההיפוכים', [sp('gs-rock', 1), sp('gs-rock', 2)], [60, 90]),
      L(4, 'The minor plagal: 6, ♭6, 5', 'הפלגלית המינורית: 6, ♭6, 5', [sp('gs-minor')], [60, 90]),
      L(5, 'The 1–4 and 2–5 walk-ups', 'העליות מ־1 ל־4 ומ־2 ל־5', [sp('gs-walk', 0), sp('gs-walk', 1)], [60, 96]),
      L(6, 'IV/V and the sus that falls to the 3rd', 'IV/V והסאס שיורד לטרצה', [sp('gs-sus', 0), sp('gs-sus', 1)], [60, 96]),
      L(7, '♭III7–III7 into IV', '♭III7–III7 אל IV', [sp('gs-chrom')], [70, 100]),
      L(8, '1–6–2–5 with an altered VI7', '1–6–2–5 עם VI7 אלטרד', [sp('gs-1625', 0), sp('gs-1625', 1)], [70, 110]),
      L(9, 'IV–♯iv°7–I/5 and octave approaches', 'IV–♯iv°7–I/5 וגישות באוקטבות', [sp('gs-dim', 0), sp('gs-dim', 1)], [70, 110]),
      L(10, 'VI7sus–♭VI7–II7–V7', 'VI7 סאס – ♭VI7 – II7 – V7', [sp('gs-trit')], [80, 120]),
      L(11, 'Grace notes into the 3rds', 'צלילי חן אל הטרצות', [sp('gs-grace')], [60, 90]),
      L(12, 'The two gospel scales', 'שני סולמות הגוספל', [sp('gs-scale', 0), sp('gs-scale', 1)], [60, 100]),
      L(13, 'The gospel 12/8', 'גוספל 12/8', [sp('gs-68')], [50, 66]),
      L(14, 'Gospel 12/8 with the drums', 'גוספל 12/8 עם התופים', [sp('gs-band')], [50, 72]),
    ],
  };
}

export function keysSoulJazzFamily(): FamilyDef {
  const fam: FamilyId = 'k-souljazz';
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: fam, kind, hands: 'L', option, swing: true });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'soul' });
  return {
    id: fam,
    title: t('Soul-jazz comping', 'ליווי סול-ג׳אז'),
    style: 'both',
    styleId: 'soul',
    levels: [
      L(1, 'The Charleston in guide tones: I7–IV7', 'צ׳רלסטון בצלילים מנחים: I7–IV7', [sp(SJ_CHART('sj-vamp', 'guide'))], [80, 120]),
      L(2, 'The soul-jazz blues: ii–V in bars 4, 8, 10, 12', 'בלוז הסול-ג׳אז: ii–V בתיבות 4, 8, 10, 12', [sp(SJ_CHART('sj-blues', 'guide'))], [80, 130]),
      L(3, 'A walking left hand under the soul-jazz blues', 'יד שמאל מהלכת מתחת לבלוז הסול-ג׳אז', [sp(SJ_CHART('sj-blues', 'walk-lh', 'whole'))], [80, 130]),
      L(4, 'Drop 2 with ♭9, ♯9 and ♭13', 'דרופ 2 עם ♭9, ♯9 ו־♭13', [sp(SJ_CHART('sj-blues-alt', 'drop2'))], [80, 130]),
      L(5, 'The minor blues in guide tones', 'הבלוז המינורי בצלילים מנחים', [sp(SJ_CHART('sj-minor', 'guide'))], [80, 130]),
      L(6, 'A walking left hand under the minor blues', 'יד שמאל מהלכת מתחת לבלוז המינורי', [sp(SJ_CHART('sj-minor', 'walk-lh', 'whole'))], [80, 130]),
      L(7, 'Soul-jazz with the shuffle and the band', 'סול-ג׳אז עם השאפל והלהקה', [sp('sj-band', 0), sp('sj-band', 1)], [90, 140]),
    ],
  };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;

export function guitarSoulFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: 'g-soul', kind, hands: 'R', instrument: 'guitar', option, ...(kind === 'gsj-funk' || (kind === 'gsj-band' && option === 1) ? {} : { swing: true }) });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string, grade: number): GuitarLevelDef => ({ ...LT('g-soul', level, en, he, specs, KEYS, tempo, sub, grade), style: 'soul' });
  return {
    ...fam('g-soul', 'Soul-jazz and funk guitar', 'גיטרת סול-ג׳אז ופאנק', 'jazz', ['funk', 'jazz'], [
      L(1, 'The Charleston in guide tones: I7–IV7', 'צ׳רלסטון בצלילים מנחים: I7–IV7', [sp('gsj-guide', 0)], [80, 120], 'Charleston', 4),
      L(2, 'The soul-jazz blues in guide tones', 'בלוז הסול-ג׳אז בצלילים מנחים', [sp('gsj-guide', 1)], [80, 130], 'Charleston', 5),
      L(3, 'Drop 2 behind the organ', 'דרופ 2 מאחורי האורגן', [sp('gsj-drop2')], [80, 130], 'Charleston', 5),
      L(4, 'Funk: the 9 chord on every beat, mutes between', 'פאנק: אקורד 9 על כל פעמה, השתקות ביניהן', [sp('gsj-funk', 0)], [60, 100], '16ths', 5),
      L(5, 'Funk: i m7 – IV9', 'פאנק: i m7 – IV9', [sp('gsj-funk', 1)], [70, 105], '16ths', 6),
      L(6, 'Soul-jazz and funk with the band', 'סול-ג׳אז ופאנק עם הלהקה', [sp('gsj-band', 0), sp('gsj-band', 1)], [90, 130], 'Charleston / 16ths', 6),
    ]),
    style: 'both',
    styleId: 'soul',
  };
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;

export function bassSoulFamily(L0: BLFn, fam: BFamFn): GuitarFamilyDef {
  const sp = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'b-soul', kind, hands: 'R', instrument: 'bass', ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string): GuitarLevelDef => ({ ...L0('b-soul', level, en, he, specs, KEYS, tempo, sub, ['funk', 'jazz']), style: 'soul' });
  return {
    ...fam('b-soul', 'Soul-jazz, gospel and funk bass', 'בס סול-ג׳אז, גוספל ופאנק', [
      L(1, 'The boogie figure under the shuffle blues', 'דמות הבוגי מתחת לבלוז השאפל', [sp('bs-boogie', { swing: true })], [70, 120], 'swung 8ths'),
      L(2, 'Walking the soul-jazz blues', 'בס מהלך בבלוז הסול-ג׳אז', [sp('bs-walk', { perBeat: 1 })], [90, 140], 'quarters'),
      L(3, 'The gospel walk-ups', 'העליות של הגוספל', [sp('bs-walkup', { option: 0, perBeat: 1 }), sp('bs-walkup', { option: 1, perBeat: 1 })], [60, 96], 'quarters'),
      L(4, 'Funk: one chord, the "one" and dead notes', 'פאנק: אקורד אחד, ה"אחת" ותווים מתים', [sp('bs-funk', { option: 0, perBeat: 4, minor: true })], [70, 100], '16ths'),
      L(5, 'Funk: the i m7 – IV7 vamp', 'פאנק: וואמפ i m7 – IV7', [sp('bs-funk', { option: 1, perBeat: 4, minor: true })], [75, 105], '16ths'),
      L(6, 'Soul-jazz and funk with the band', 'סול-ג׳אז ופאנק עם הלהקה', [sp('bs-band', { option: 0, swing: true }), sp('bs-band', { option: 1, perBeat: 4, minor: true })], [85, 130], 'swung 8ths / 16ths'),
    ]),
    style: 'both',
    styleId: 'soul',
  };
}

/** Path places (KEYS_LEVEL_DIFF): no gates — every style open from the start, difficulty by level. */
export const SOUL_LEVEL_DIFF: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`k-gospel-${i + 1}`, 880 + 45 * i])),
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`k-souljazz-${i + 1}`, 1050 + 60 * i])),
};
