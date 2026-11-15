// Heads you play (docs/AUDIT-DEPTH-3.md §1 #2–#4, C1, C3, C4): the melody library of src/content/heads.ts on piano,
// guitar and bass, in all 12 keys (a head moves to the key; stdKey.ts spells its chart), new items in free time first
// (rubato.ts), then the tempo ladder. Five families:
//
//  k-harm  harmonise a melody (piano): the melody alone, then shells under it, four-way close, drop 2, drop 3 — each a
//          voice-leading item graded by voiceLead.ts (the melody note on top, a voicing of the chord, acceptable
//          motion). Styles come from the registry in src/engine/heads.ts: a style registered there (6-dim blocks,
//          borrowing — the Barry Harris build) becomes a level of its own after the base ones.
//  g-cmel  chord-melody (guitar): melody in position → + bass on the downbeats → + a guide tone → drop 2 under the melody
//          on the top string set → passing diminished → a whole chorus. Graded note for note (melody and chord tones).
//  k-tune  one head, comped step by step (piano): roots → guide tones → shells → rootless → drop 2 → melody + comp, then
//          the head reharmonised (tritone subs and extra ii–Vs; backdoor, passing dim, line cliché; Coltrane subs) and
//          comped, with the melody over the new chords. The reharm studio (ReharmStudio.tsx) makes your own: kind
//          `tn-own~<plan>` / `tn-ownmel~<plan>`.
//  g-tune  the same ladder on the guitar (roots, guide tones, shells, rootless, drop 2, chord-melody, the reharms).
//  b-tune  the bass: roots → two-feel → walking → walking with approaches, then walking each reharm.
//
// An item's option is the head's index in HEADS × 16 + the phrase (4 bars) for phrase items, or the head index.
// Imports guitar.ts / bass.ts helpers that are only used inside functions (they import this module).

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId, Hand } from './types';
import { itemIdOf, type FamilyDef, type LevelDef, type SpecTemplate } from './generate';
import { drop2Voicings, finish, place, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef } from './guitar';
import { alt, drillOf, fold, lowest, refWalk, rootOf, rulesFromText, feelLine, type BN } from './bass';
import { ruleSafe } from './bassRuleSafe';
import type { Tuning } from '../fretboard';
import { noteAt } from '../fretboard';
import { candidates, fitOnSet, gradeVoicings, measuredOf, motion, optimalPath, typePcs, type VLChord, type VLGoal } from './voiceLead';
import { voice, type Voiced } from './chartDrills';
import { parseChart, type ChartChordEv } from '../charts';
import { keyLabel, sharpKey, type Home } from '../stdKey';
import { HEADS, servedHeads, type Head } from '../../content/heads';
import { builtStyles, chordAt, chordKind, chordUnder, harmEvents, headIn, HARM_STYLES, notesIn, phraseCount, type HeadIn, type HNote } from '../heads';
import { applyPlan, autoPlan, parsePlan, type Device } from '../reharm';
import { sharedHands, splitShared } from '../soloPiano';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const pc = (n: number): number => ((n % 12) + 12) % 12;
const SIGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const sigOf = (h: Home): string => SIGS[pc(h.minor ? h.key + 3 : h.key)];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// ───────────────────────────── items: which head, which phrase ─────────────────────────────

/** HEADS indices of the heads the exercises use (a melody, nothing left to verify). */
export const SERVED: number[] = HEADS.map((h, i) => (servedHeads().includes(h) ? i : -1)).filter((i) => i >= 0);
export const decodeHead = (option = 0): { head: Head; idx: number; phrase: number } => {
  const idx = Math.floor(Math.max(0, option) / 16) % HEADS.length;
  return { head: HEADS[idx], idx, phrase: Math.max(0, option) % 16 };
};
const opt = (idx: number, phrase = 0): number => idx * 16 + phrase;

const barsLabel = (phrase: number): T2 => t(`bars ${phrase * 4 + 1}–${phrase * 4 + 4}`, `תיבות ${phrase * 4 + 1}–${phrase * 4 + 4}`);
/** A drill title: the head, what is played, the key (two lines at most on a phone). */
const titleOf = (hi: HeadIn, what: T2, part?: T2): T2 => {
  const k = keyLabel(hi.tonic);
  return t(`${hi.head.title.en}${part ? `, ${part.en}` : ''} · ${what.en} · ${k}`, `${hi.head.title.he}${part ? `, ${part.he}` : ''} · ${what.he} · ${k}`);
};
const pretty = (s: string): string => s.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯');
const chartOf = (bars: string[]): string[] => bars.map(pretty);

/** The reharm device sets of the preset levels (and the melody-over-the-reharm item). */
export const RH_SETS: Record<string, Device[]> = {
  'tn-rh1': ['tritone', 'iiV'],
  'tn-rh2': ['backdoor', 'pdim', 'cliche'],
  'tn-rh3': ['coltrane'],
  // HARMONY-REHARM §4: the borrowed chords (modal interchange) — the minor plagal ending, iv(m6), ♭VI, iiø7, ♭VII7.
  'tn-rh4': ['minorPlagal', 'minorIV', 'iiHalfDim', 'bVI', 'bVII'],
  'tn-rhmel': ['tritone', 'iiV', 'backdoor', 'pdim', 'cliche'],
};
/** A head's chart for a kind: as written, a preset reharm (autoPlan), or the player's own plan (`~<code>` in the kind). */
export function chartFor(hi: HeadIn, kind: string): { text: string; bars: string[]; reharm: boolean } {
  const own = /^tn-own(?:mel)?~(.*)$/.exec(kind);
  if (own) {
    const r = applyPlan(hi.text, parsePlan(own[1]), hi.tonic, hi.notes);
    return { text: r.text, bars: r.bars, reharm: true };
  }
  const set = RH_SETS[kind];
  if (!set) return { text: hi.text, bars: hi.bars, reharm: false };
  // The melody's octave does not change a reharm (tensions are pitch classes): one per head, key and device set.
  const ck = `${hi.head.id}|${hi.tonic.key}|${kind}`;
  let r = RH_CACHE.get(ck);
  if (!r) {
    r = applyPlan(hi.text, autoPlan(hi.text, hi.tonic, set, hi.notes), hi.tonic, hi.notes);
    RH_CACHE.set(ck, r);
  }
  return { text: r.text, bars: r.bars, reharm: true };
}
const RH_CACHE = new Map<string, ReturnType<typeof applyPlan>>();

// ───────────────────────────── piano: harmonise a melody (k-harm) ─────────────────────────────

/**
 * The model path a player can copy and pass: the smallest total motion through the events using only changes the
 * grader calls clean (the LH root and, over a melody, the melody note added as the player plays them).
 */
export function cleanPath(g: VLGoal): number[][] {
  const full = (v: number[], k: number): number[] => {
    const out = g.over && g.chords[k].melody !== undefined ? [...v, g.chords[k].melody!] : [...v];
    if (!g.bass) return out;
    let b = 36 + pc(g.chords[k].root - 36);
    while (b >= Math.min(...out)) b -= 12;
    return [b, ...out];
  };
  const cands = g.chords.map((c) => candidates(c, g));
  if (cands.some((c) => !c.length)) return optimalPath(g);
  const clean = (u: number[], v: number[], k: number): boolean => gradeVoicings([full(u, k - 1), full(v, k)], { ...g, chords: [g.chords[k - 1], g.chords[k]], at: [0, 1], first: undefined })[1].verdict === 'clean';
  let cost = cands[0].map(() => 0);
  const back: number[][] = [cands[0].map(() => -1)];
  for (let k = 1; k < cands.length; k++) {
    const nc: number[] = [];
    const bk: number[] = [];
    for (const v of cands[k]) {
      let best = Infinity;
      let arg = -1;
      cands[k - 1].forEach((u, j) => {
        if (!Number.isFinite(cost[j])) return;
        const d = cost[j] + motion(measuredOf(u, g.type), measuredOf(v, g.type)).total;
        if (d < best && clean(u, v, k)) {
          best = d;
          arg = j;
        }
      });
      nc.push(best);
      bk.push(arg);
    }
    cost = nc;
    back.push(bk);
  }
  const end = cost.indexOf(Math.min(...cost));
  if (!Number.isFinite(cost[end])) return optimalPath(g);
  const path: number[][] = [];
  for (let k = cands.length - 1, j = end; k >= 0; k--) {
    path.unshift(cands[k][j]);
    j = back[k][j];
  }
  return path;
}

/**
 * Shared hands (Siskind [PSJP-A]: the melody about the two octaves above middle C): the hands can only share the chord
 * under a melody in the lower of them, so a head sitting high (its mean above A4) moves down an octave for this style when it stays above A3.
 */
function sharedRegister(hi: HeadIn, type: string): HeadIn {
  if (type !== 'shared' || !hi.notes.length) return hi;
  const mean = hi.notes.reduce((a, n) => a + n.pitch, 0) / hi.notes.length;
  const low = Math.min(...hi.notes.map((n) => n.pitch)) - 12;
  return mean > 69 && low >= 57 ? { ...hi, notes: hi.notes.map((n) => ({ ...n, pitch: n.pitch - 12 })) } : hi;
}

/** The voice-leading goal of a harmonising item (one phrase in one style). */
export function harmPlan(s: DrillSpec): { hi: HeadIn; goal: VLGoal; phrase: number; path: number[][] } {
  const { head, phrase } = decodeHead(s.option);
  const style = HARM_STYLES[s.kind.slice(3)];
  if (!style) throw new Error(`Unknown harmonisation style: ${s.kind}`);
  const hi = sharedRegister(headIn(head, s.key, 'piano'), style.type);
  const g0 = { type: style.type, lo: style.lo, hi: style.hi, over: style.over };
  // A note no voicing of the style fits in its register stays a single melody note (left out of the item).
  const evs = harmEvents(hi, phrase * 4, phrase * 4 + 4, style).filter((e) => candidates(e.chord, g0).length > 0);
  if (evs.length < 2) throw new Error(`${head.id} bars ${phrase * 4 + 1}–${phrase * 4 + 4}: nothing to harmonise in ${style.id}`);
  const goal: VLGoal = {
    chords: evs.map((e) => e.chord),
    at: evs.map((e) => r6(e.note.beat - phrase * 16)),
    type: style.type,
    tol: style.tol,
    lo: style.lo,
    hi: style.hi,
    // a shared-hands voicing carries its own bass (Siskind: the LH pinky holds it)
    bass: style.type !== 'shared',
    flats: !sharpKey(hi.tonic),
    ...(style.over ? { over: true } : {}),
  };
  return { hi, goal, phrase, path: cleanPath(goal) };
}

function genHarm(s: DrillSpec): Drill {
  if (s.kind === 'hm-mel') return pianoMelody(s);
  const { hi, goal, phrase, path } = harmPlan(s);
  const style = HARM_STYLES[s.kind.slice(3)];
  const notes: ExpNote[] = [];
  let bassPrev = 46;
  if (style.type === 'shared') {
    // Siskind's hands (soloPiano.ts): LH = the bass part and the two lowest shared notes, RH = the rest and the melody.
    path.forEach((v, k) => {
      const beat = goal.at[k];
      const dur = r6(Math.max(0.5, (goal.at[k + 1] ?? 16) - beat));
      const hands = sharedHands(v, goal.chords[k].melody!);
      const { bass, inner } = splitShared(v);
      const lh = hands?.lh ?? [...bass, ...inner.slice(0, 2)];
      const rh = hands?.rh ?? [...inner.slice(2), goal.chords[k].melody!];
      lh.forEach((p) => notes.push({ pitch: p, beat, dur, hand: 'L', chordId: k + 1 }));
      rh.forEach((p) => notes.push({ pitch: p, beat, dur, hand: 'R', chordId: k + 1, ...(p === goal.chords[k].melody ? { accent: true } : {}) }));
    });
  } else
  path.forEach((v, k) => {
    const beat = goal.at[k];
    const dur = r6(Math.max(0.5, (goal.at[k + 1] ?? 16) - beat));
    const id = k + 1;
    const c = goal.chords[k];
    const rh = [...v, ...(goal.over ? [c.melody!] : [])].sort((a, b) => a - b);
    rh.forEach((p) => notes.push({ pitch: p, beat, dur, hand: 'R', chordId: id, ...(p === c.melody ? { accent: true } : {}) }));
    const opts = [36, 48].map((o) => o + pc(c.root - o)).filter((p) => p >= 36 && p <= 55 && p < rh[0]);
    let b = (opts.length ? opts : [36 + pc(c.root - 36)]).sort((a, z) => Math.abs(a - bassPrev) - Math.abs(z - bassPrev))[0];
    while (b >= rh[0]) b -= 12;
    bassPrev = b;
    notes.push({ pitch: b, beat, dur, hand: 'L', chordId: id });
  });
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const chordSets: NonNullable<DrillGoal['chordSets']> = goal.chords.map((c, k) => {
    const req = [...new Set([...typePcs(c, goal.type), pc(c.root), ...(goal.over ? [pc(c.melody!)] : [])])].sort((a, b) => a - b);
    return { chordId: k + 1, required: req, allowed: req };
  });
  return {
    spec: { ...s, hands: 'RL' },
    itemId: itemIdOf(s),
    title: titleOf(hi, style.name, barsLabel(phrase)),
    notes,
    beats: 16,
    meter: 4,
    keySig: sigOf(hi.tonic),
    goal: { evenness: false, hands: true, chordSets, vl: goal },
    startBpm: Math.round(s.tempo ?? (hi.head.feel === 'ballad' ? 56 : 66)),
    chart: chartOf(hi.bars.slice(phrase * 4, phrase * 4 + 4)),
    tonic: hi.tonic,
  };
}

/** The head's melody alone, right hand, the whole chorus (paged two lines at a time). */
function pianoMelody(s: DrillSpec, kind = s.kind): Drill {
  const { head } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'piano');
  const { text, bars } = chartFor(hi, kind);
  void text;
  const notes: ExpNote[] = hi.notes.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R' as Hand }));
  return {
    spec: { ...s, hands: 'R' },
    itemId: itemIdOf(s),
    title: titleOf(hi, t('the melody', 'המנגינה')),
    notes,
    beats: bars.length * 4,
    meter: 4,
    keySig: sigOf(hi.tonic),
    goal: { evenness: false, hands: false },
    startBpm: Math.round(s.tempo ?? (head.feel === 'ballad' ? 60 : 80)),
    chart: chartOf(bars),
    tonic: hi.tonic,
    paged: true,
  };
}

// ───────────────────────────── piano: comp a head (k-tune) ─────────────────────────────

type PianoComp = 'root' | 'guide' | 'shell' | 'rootless' | 'drop2' | 'melody';
const TUNE_WHAT: Record<string, T2> = {
  'tn-root': t('roots', 'יסודות'),
  'tn-guide': t('guide tones', 'צלילים מנחים'),
  'tn-shell': t('shells', 'שלדים'),
  'tn-rootless': t('rootless', 'בלי יסוד'),
  'tn-drop2': t('drop 2', 'דרופ 2'),
  'tn-melcomp': t('melody + comp', 'מנגינה + ליווי'),
  'tn-rh1': t('reharm: tritone subs, extra ii–Vs', 'הרמון מחדש: טריטון, ii–V נוסף'),
  'tn-rh2': t('reharm: backdoor, passing dim, cliché', 'הרמון מחדש: דלת אחורית, דימיניש, קלישאה'),
  'tn-rh3': t('reharm: Coltrane subs', 'הרמון מחדש: תחליפי קולטריין'),
  'tn-rh4': t('reharm: borrowed chords', 'הרמון מחדש: אקורדים שאולים'),
  'tn-rhmel': t('the melody over the reharm', 'המנגינה מעל ההרמון החדש'),
  'tn-own': t('my reharm', 'ההרמון שלי'),
  'tn-ownmel': t('the melody over my reharm', 'המנגינה מעל ההרמון שלי'),
  'tn-two': t('two-feel', 'בשתיים'),
  'tn-walk': t('walking', 'ווקינג'),
  'tn-appr': t('walking with approaches', 'ווקינג עם צלילי גישה'),
};
const whatOf = (kind: string): T2 => TUNE_WHAT[kind.split('~')[0]] ?? TUNE_WHAT['tn-root'];

/** The piano voicing a k-tune kind comps with. */
function pianoCompOf(kind: string): PianoComp {
  const k = kind.split('~')[0];
  if (k === 'tn-root' || k === 'tn-guide' || k === 'tn-shell' || k === 'tn-rootless' || k === 'tn-drop2') return k.slice(3) as PianoComp;
  if (k === 'tn-melcomp' || k === 'tn-rhmel' || k === 'tn-ownmel') return 'melody';
  return k === 'tn-rh3' ? 'drop2' : 'rootless';
}

interface CEv {
  beat: number;
  dur: number;
  notes: { pitch: number; hand: Hand }[];
  chordPcs: number[];
}

/**
 * Notes + chord sets from events (two or more notes at once share a chordId; single notes are graded as notes).
 * `exact`: the written pitches are graded note for note, no chord sets — melody + comp, where a chord set's onset
 * window would swallow an 8th-note melody note right after the chord.
 */
function pianoDrill(s: DrillSpec, evs: CEv[], title: T2, hi: HeadIn, bars: string[], bpm: number, exact = false): Drill {
  const byBeat = new Map<number, CEv>();
  for (const e of evs) {
    const k = Math.round(e.beat * 1e4);
    const cur = byBeat.get(k);
    if (cur) {
      cur.notes.push(...e.notes);
      cur.dur = Math.max(cur.dur, e.dur);
      cur.chordPcs = [...new Set([...cur.chordPcs, ...e.chordPcs])];
    } else byBeat.set(k, { ...e, notes: [...e.notes] });
  }
  const notes: ExpNote[] = [];
  const chordSets: NonNullable<DrillGoal['chordSets']> = [];
  let cid = 0;
  for (const e of [...byBeat.values()].sort((a, b) => a.beat - b.beat)) {
    const ps = [...new Map(e.notes.map((n) => [n.pitch, n])).values()];
    const id = ps.length > 1 ? ++cid : undefined;
    for (const n of ps) {
      // A melody note shorter than the chord under it keeps its own length.
      notes.push({ pitch: n.pitch, beat: r6(e.beat), dur: r6(e.dur), hand: n.hand, ...(id ? { chordId: id } : {}) });
    }
    if (id && !exact) {
      const req = [...new Set(ps.map((n) => pc(n.pitch)))].sort((a, b) => a - b);
      chordSets.push({ chordId: id, required: req, allowed: [...new Set([...req, ...e.chordPcs])].sort((a, b) => a - b) });
    }
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const hands = new Set(notes.map((n) => n.hand));
  return {
    spec: { ...s, hands: hands.size > 1 ? 'RL' : hands.has('R') ? 'R' : 'L' },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: bars.length * 4,
    meter: 4,
    keySig: sigOf(hi.tonic),
    goal: { evenness: false, hands: hands.size > 1, ...(chordSets.length ? { chordSets } : {}) },
    startBpm: Math.round(s.tempo ?? bpm),
    chart: chartOf(bars),
    tonic: hi.tonic,
    paged: true,
  };
}

const chordPcsOf = (c: ChartChordEv): number[] => c.iv.map((x) => pc(c.root + x));

function genTunePiano(s: DrillSpec): Drill {
  if (s.kind.startsWith('hm-') || s.kind === 'tn-mel') return pianoMelody(s);
  const { head } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'piano');
  const { text, bars } = chartFor(hi, s.kind);
  const chords = parseChart(text).chords;
  const mode = pianoCompOf(s.kind);
  const evs: CEv[] = [];
  let prev: Voiced | null = null;
  for (const c of chords) {
    const beat = c.bar * 4 + c.at;
    let v: Voiced;
    if (mode === 'root') v = { lh: [40 + pc(c.root - 40)], rh: [] };
    else v = voice(c, mode === 'melody' ? 'shell' : mode, prev);
    if (mode === 'melody') {
      // The left hand stays below the melody sounding over its chord (an octave down where they would meet).
      const over = hi.notes.filter((n) => n.beat < beat + c.beats - 1e-6 && n.beat + n.dur > beat + 1e-6).map((n) => n.pitch);
      const floor = over.length ? Math.min(...over) : 128;
      while (Math.max(...v.lh) >= floor && Math.min(...v.lh) - 12 >= 33) v = { lh: v.lh.map((p) => p - 12), rh: v.rh };
    }
    prev = v;
    evs.push({ beat, dur: c.beats, notes: [...v.lh.map((p) => ({ pitch: p, hand: 'L' as Hand })), ...v.rh.map((p) => ({ pitch: p, hand: 'R' as Hand }))], chordPcs: chordPcsOf(c) });
  }
  if (mode === 'melody') for (const n of hi.notes) evs.push({ beat: n.beat, dur: n.dur, notes: [{ pitch: n.pitch, hand: 'R' }], chordPcs: chordPcsOf(chordAt(chords, n.beat)) });
  return pianoDrill(s, evs, titleOf(hi, whatOf(s.kind)), hi, bars, head.feel === 'ballad' ? 56 : Math.round(head.bpm * 0.5), mode === 'melody');
}

// ───────────────────────────── guitar helpers ─────────────────────────────

type P = { s: number; f: number };
const strum = (ps: P[], ct = true): GN[] => ps.map((x) => ({ ...x, tech: 'strum-down' as const, stroke: 'D' as const, ct }));
const lowFretOf = (v: P[]): number => Math.min(...v.filter((p) => p.f > 0).map((p) => p.f).concat([99]));
/** The four tones of a chart chord on the guitar (a plain triad as a 6th chord; a diminished as °7). */
function fourOf(c: Pick<ChartChordEv, 'iv'>): number[] {
  const has = (x: number) => c.iv.some((i) => pc(i) === x);
  const k = chordKind(c.iv);
  if (k === 'dim') return [0, 3, 6, 9];
  if (k === 'half') return [0, 3, 6, 10];
  const third = k === 'min' || k === 'mmaj' ? 3 : 4;
  const fifth = has(8) && !has(7) ? 8 : 7;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : third === 3 ? 10 : 9;
  return [0, third, fifth, seventh];
}
/** Every fingering of pitch classes on given strings (one each, low → high pitch), within a 4-fret span. */
function shapesOn(tu: Tuning, pcs: number[], strings: number[], hi = 15): P[][] {
  const per = strings.map((s, i) => {
    const fs: number[] = [];
    for (let f = 0; f <= hi; f++) if (pc(noteAt(tu, s, f)) === pc(pcs[i])) fs.push(f);
    return fs;
  });
  const out: P[][] = [];
  const rec = (i: number, acc: P[]) => {
    if (i === strings.length) {
      const ms = acc.map((p) => noteAt(tu, p.s, p.f));
      if (!ms.every((m, k) => k === 0 || m > ms[k - 1])) return;
      const fr = acc.map((p) => p.f).filter((f) => f > 0);
      if (fr.length && Math.max(...fr) - Math.min(...fr) > 4) return;
      out.push(acc.slice());
      return;
    }
    for (const f of per[i]) rec(i + 1, [...acc, { s: strings[i], f }]);
  };
  rec(0, []);
  return out;
}
const nearest = (cands: P[][], near: number): P[] | null => (cands.length ? cands.reduce((a, b) => (Math.abs(lowFretOf(b) - near) < Math.abs(lowFretOf(a) - near) ? b : a)) : null);

const D2 = new Map<string, P[][]>();
/** drop2Voicings, remembered per tuning, pitch-class set and string set (a head repeats its chords). */
function drop2Cached(tu: Tuning, pcs: number[], strings: number[]): P[][] {
  const k = `${tu.id}|${pcs.map(pc).join(',')}|${strings.join('')}`;
  let v = D2.get(k);
  if (!v) {
    v = drop2Voicings(tu, pcs, strings, 13);
    D2.set(k, v);
  }
  return v;
}
/** One chord as a guitar voicing for a comping kind, near a fret. */
function guitarVoicing(tu: Tuning, c: ChartChordEv, mode: 'root' | 'guide' | 'shell' | 'rootless' | 'drop2', near: number, topPrev: number): P[] {
  const f4 = fourOf(c).map((x) => c.root + x);
  const [R, T, , S] = f4;
  const opts: P[][] = [];
  if (mode === 'root') opts.push(...shapesOn(tu, [R], [6]), ...shapesOn(tu, [R], [5]));
  else if (mode === 'guide') opts.push(...shapesOn(tu, [T, S], [4, 3]), ...shapesOn(tu, [S, T], [4, 3]), ...shapesOn(tu, [T, S], [3, 2]), ...shapesOn(tu, [S, T], [3, 2]));
  else if (mode === 'shell') opts.push(...shapesOn(tu, [R, S, T], [6, 4, 3]), ...shapesOn(tu, [R, T, S], [5, 4, 3]));
  else {
    const pcs = mode === 'rootless' ? [T, f4[2], S, c.root + (chordKind(c.iv) === 'dim' ? 9 : chordKind(c.iv) === 'half' ? 5 : 2)] : f4;
    const d2 = drop2Cached(tu, pcs, [4, 3, 2, 1]);
    const cands = d2.length ? d2 : drop2Cached(tu, pcs, [5, 4, 3, 2]);
    if (cands.length && topPrev > 0) {
      const top = (v: P[]) => Math.max(...v.map((p) => noteAt(tu, p.s, p.f)));
      return cands.reduce((a, b) => (Math.abs(top(b) - topPrev) + 0.3 * Math.abs(lowFretOf(b) - near) < Math.abs(top(a) - topPrev) + 0.3 * Math.abs(lowFretOf(a) - near) ? b : a));
    }
    opts.push(...cands);
  }
  return nearest(opts.filter((v) => lowFretOf(v) <= 12 || v.every((p) => p.f === 0)), near) ?? nearest(opts, near) ?? [{ s: 5, f: pc(c.root - 45) }];
}

// ───────────────────────────── guitar: chord-melody (g-cmel) and the melody + comp step ─────────────────────────────

export type CmMode = 'mel' | 'bass' | 'guide' | 'drop2' | 'dim';
const CM_MODE: Record<string, CmMode> = { 'cm-mel': 'mel', 'cm-bass': 'bass', 'cm-guide': 'guide', 'cm-drop2': 'drop2', 'cm-dim': 'dim', 'cm-chorus': 'dim', 'tn-melcomp': 'drop2' };
const CM_WHAT: Record<string, T2> = {
  'cm-mel': t('the melody in position', 'המנגינה בפוזיציה'),
  'cm-bass': t('melody + bass on the downbeats', 'מנגינה + בס על הפעמות'),
  'cm-guide': t('melody + a guide tone', 'מנגינה + צליל מנחה'),
  'cm-drop2': t('drop 2 under the melody', 'דרופ 2 מתחת למנגינה'),
  'cm-dim': t('with passing diminished', 'עם דימיניש עובר'),
  'cm-chorus': t('a whole chorus', 'פזמון שלם'),
};

/** Place a melody note on the top strings near a fret (strings 1–3). */
function melodyPlace(tu: Tuning, m: number, near: number): P {
  const all = [1, 2, 3].map((s) => ({ s, f: m - tu.open[s - 1] })).filter((p) => p.f >= 0 && p.f <= 17);
  if (!all.length) return place(tu, m, [1, 2, 3, 4, 5, 6], 0, 22) ?? { s: 1, f: Math.max(0, m - tu.open[0]) };
  return all.reduce((a, b) => (Math.abs(b.f - near) < Math.abs(a.f - near) ? b : a));
}

/**
 * A chord-melody arrangement of notes (the melody in sounding pitch): per mode, what sounds under each melody note.
 * Harmonised notes: the chord tone notes on beats 1 and 3 and where a chord starts (as harmEvents picks them); with
 * passing diminished also the other picked notes (the °7 that contains the note).
 */
export function chordMelodyEvs(tu: Tuning, notes: HNote[], chords: ChartChordEv[], mode: CmMode, b0 = 0): Ev[] {
  const evs: Ev[] = [];
  let near = 5;
  for (const n of notes) {
    const c = chordAt(chords, n.beat);
    const inBar = n.beat - Math.floor(n.beat / 4 + 1e-9) * 4;
    const picked = Math.abs(inBar) < 1e-6 || Math.abs(inBar - 2) < 1e-6 || Math.abs(c.bar * 4 + c.at - n.beat) < 1e-6;
    const q = chordUnder(n.pitch, c);
    const single = (): Ev => {
      const p = melodyPlace(tu, n.pitch, near);
      if (p.f > 0) near = p.f;
      return { beat: n.beat - b0, dur: n.dur, notes: [{ ...p, stroke: 'D', ct: q !== null }] };
    };
    if (mode === 'mel' || !picked) {
      evs.push(single());
      continue;
    }
    if (mode === 'bass' || mode === 'guide') {
      const downbeat = Math.abs(inBar) < 1e-6 || Math.abs(c.bar * 4 + c.at - n.beat) < 1e-6;
      if (!downbeat) {
        evs.push(single());
        continue;
      }
      const mp = melodyPlace(tu, n.pitch, near);
      let low: P | null = null;
      if (mode === 'bass') {
        for (let p = 40; p <= 52 && !low; p++) if (pc(p) === pc(c.root)) low = place(tu, p, [6, 5], Math.max(0, mp.f - 4), mp.f + 4) ?? place(tu, p + 12, [5, 4], Math.max(0, mp.f - 4), mp.f + 4);
      } else {
        const f4 = fourOf(c).map((x) => c.root + x);
        for (const g of [f4[1], f4[3]]) {
          for (let p = n.pitch - 12; p < n.pitch - 2 && !low; p++) if (pc(p) === pc(g)) low = place(tu, p, [2, 3, 4].filter((s) => s > mp.s), Math.max(0, mp.f - 4), mp.f + 4);
          if (low) break;
        }
      }
      if (mp.f > 0) near = mp.f;
      evs.push({ beat: n.beat - b0, dur: n.dur, notes: low ? [{ ...low, stroke: 'D', ct: true }, { ...mp, stroke: 'D', ct: q !== null, acc: true }] : [{ ...mp, stroke: 'D', ct: q !== null }] });
      continue;
    }
    // Drop 2 under the melody note on the top string set (the melody on string 1; 5-4-3-2 when 4-3-2-1 has no fit).
    const vc: VLChord | null = q ? { root: c.root, q, melody: n.pitch } : mode === 'dim' ? { root: pc(n.pitch), q: 'dim7', melody: n.pitch } : null;
    if (!vc) {
      evs.push(single());
      continue;
    }
    let shape: P[] | null = null;
    for (const set of [[4, 3, 2, 1], [5, 4, 3, 2]]) {
      const cs = candidates(vc, { type: 'drop2', lo: 40, hi: 88, strings: [set], tuning: tu.id })
        .map((v) => fitOnSet(v, set, tu.id))
        .filter((x): x is P[] => !!x);
      shape = nearest(cs, near);
      if (shape) break;
    }
    if (!shape) {
      evs.push(single());
      continue;
    }
    near = lowFretOf(shape) < 99 ? lowFretOf(shape) : near;
    evs.push({ beat: n.beat - b0, dur: n.dur, notes: shape.map((p) => ({ ...p, stroke: 'D' as const, tech: 'strum-down' as const, ct: true, ...(noteAt(tu, p.s, p.f) === n.pitch ? { acc: true } : {}) })) });
  }
  return evs;
}

function genChordMelody(s: DrillSpec, tu: Tuning): Drill {
  const { head, phrase } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'guitar');
  const whole = s.kind === 'cm-chorus';
  const from = whole ? 0 : phrase * 4;
  const to = whole ? hi.bars.length : phrase * 4 + 4;
  const evs = chordMelodyEvs(tu, notesIn(hi, from, to), hi.chords, CM_MODE[s.kind] ?? 'mel', from * 4);
  const d = finish(s, tu, evs, { title: titleOf(hi, CM_WHAT[s.kind] ?? CM_WHAT['cm-mel'], whole ? undefined : barsLabel(phrase)), bpm: head.feel === 'ballad' ? 56 : 66, evenness: false, keySig: sigOf(hi.tonic) });
  return { ...d, beats: Math.max(d.beats, (to - from) * 4), chart: chartOf(hi.bars.slice(from, to)), tonic: hi.tonic };
}

// ───────────────────────────── guitar: comp a head (g-tune) ─────────────────────────────

function guitarCompOf(kind: string): 'root' | 'guide' | 'shell' | 'rootless' | 'drop2' {
  const k = kind.split('~')[0];
  if (k === 'tn-root' || k === 'tn-guide' || k === 'tn-shell' || k === 'tn-rootless' || k === 'tn-drop2') return k.slice(3) as 'root';
  return 'drop2';
}

function genTuneGuitar(s: DrillSpec, tu: Tuning): Drill {
  const { head } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'guitar');
  const { text, bars } = chartFor(hi, s.kind);
  const chords = parseChart(text).chords;
  let evs: Ev[];
  const k = s.kind.split('~')[0];
  if (k === 'tn-melcomp' || k === 'tn-rhmel' || k === 'tn-ownmel') evs = chordMelodyEvs(tu, hi.notes, chords, 'drop2');
  else {
    const mode = guitarCompOf(s.kind);
    evs = [];
    let near = 5;
    let top = -1;
    for (const c of chords) {
      const v = guitarVoicing(tu, c, mode, near, mode === 'drop2' || mode === 'rootless' ? top : -1);
      near = lowFretOf(v) < 99 ? lowFretOf(v) : near;
      top = Math.max(...v.map((p) => noteAt(tu, p.s, p.f)));
      evs.push({ beat: c.bar * 4 + c.at, dur: c.beats, notes: mode === 'root' ? [{ ...v[0], stroke: 'D', ct: true }] : strum(v) });
    }
  }
  const d = finish(s, tu, evs, { title: titleOf(hi, whatOf(s.kind)), bpm: head.feel === 'ballad' ? 56 : Math.round(head.bpm * 0.5), evenness: false, keySig: sigOf(hi.tonic) });
  return { ...d, beats: Math.max(d.beats, bars.length * 4), chart: chartOf(bars), tonic: hi.tonic };
}

// ───────────────────────────── bass (b-tune) ─────────────────────────────

/** A walking line with a chromatic approach (a half step from the next root, from above or below) before every change. */
export function withApproaches(tu: Tuning, line: BN[], text: string): BN[] {
  const chords = parseChart(text).chords;
  const starts = chords.slice(1).map((c) => ({ beat: c.bar * 4 + c.at, root: c.root }));
  const out = line.map((n) => ({ ...n }));
  for (const st of starts) {
    const i = out.findIndex((n) => Math.abs(n.b + n.d - st.beat) < 1e-6 && n.b < st.beat);
    if (i < 0) continue;
    const next = out.find((n) => Math.abs(n.b - st.beat) < 1e-6);
    const target = next?.p ?? rootOf(tu, st.root);
    const prevP = out[i - 1]?.p ?? target;
    const cands = [target - 1, target + 1].filter((p) => p >= lowest(tu) && p !== prevP);
    if (!cands.length) continue;
    out[i] = { ...out[i], p: cands.sort((a, b) => Math.abs(a - prevP) - Math.abs(b - prevP))[0], ct: false };
  }
  return out;
}

/**
 * A line-cliché bar (m, m(maj7), m7, m6 a beat each) walks the cliché itself: root, maj 7, ♭7, 6 — a chord tone of each
 * chord, never the root four times.
 */
export function clicheInBass(tu: Tuning, line: BN[], text: string): BN[] {
  const out = line.map((n) => ({ ...n }));
  for (const c of parseChart(text).chords.filter((x) => /m\(maj7\)/.test(x.sym))) {
    const b0 = c.bar * 4;
    const first = out.find((n) => Math.abs(n.b - b0) < 1e-6);
    const R = first && pc(first.p - c.root) === 0 ? first.p : rootOf(tu, c.root);
    const top = R - 3 < lowest(tu) ? R + 12 : R;
    [0, 1, 2, 3].forEach((k) => {
      const i = out.findIndex((n) => Math.abs(n.b - (b0 + k)) < 1e-6);
      if (i >= 0) out[i] = { ...out[i], p: top - k, ct: true };
    });
  }
  return out;
}

function genTuneBass(s: DrillSpec, tu: Tuning): Drill {
  const { head } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'piano');
  const { text, bars } = chartFor(hi, s.kind);
  const k = s.kind.split('~')[0];
  const seed = `b-tune:${head.id}:${s.kind}:${pc(s.key)}`;
  const total = bars.length * 4;
  let line: BN[];
  let rules: ReturnType<typeof rulesFromText> | undefined;
  if (k === 'tn-root') {
    line = parseChart(text).chords.map((c) => ({ b: c.bar * 4 + c.at, d: c.beats, p: rootOf(tu, c.root), ct: true }));
  } else if (k === 'tn-two') {
    rules = rulesFromText(text, 'chordTones');
    line = ruleSafe((x) => feelLine(tu, text, 'two', `${seed}:${x}`), rules, 4);
  } else {
    rules = rulesFromText(text, 'walk');
    line = ruleSafe((x) => refWalk(tu, text, `${seed}:${x}`, false), rules, 4);
    if (k === 'tn-appr') line = withApproaches(tu, line, text);
    line = clicheInBass(tu, line, text);
  }
  line = line.filter((n) => n.b < total - 1e-6).map((n) => ({ ...n, p: fold(tu, n.p) }));
  line.push({ b: total, d: 2, p: rootOf(tu, hi.tonic.key), ct: true });
  const walk = k !== 'tn-root' && k !== 'tn-two';
  const d = drillOf(s, tu, alt(line), {
    en: `${head.title.en} · ${whatOf(s.kind).en}`,
    he: `${head.title.he} · ${whatOf(s.kind).he}`,
    keyName: keyLabel(hi.tonic),
    keySig: sigOf(hi.tonic),
    chart: chartOf(bars),
    show: 'chart',
    evenness: walk,
    goal: { chordTonesOnBeats: true },
    ...(rules ? { bass: { rules } } : {}),
    ...(walk ? { drums: { groove: head.feel === 'ballad' ? 'ballad-brush' : 'swing' } } : {}),
  });
  return { ...d, tonic: hi.tonic };
}

// ───────────────────────────── dispatch ─────────────────────────────

/** Piano: k-harm and k-tune. */
export function genHeadPiano(s: DrillSpec): Drill {
  return s.family === 'k-harm' ? genHarm(s) : genTunePiano(s);
}
/** Guitar: g-cmel and g-tune. */
export function generateGuitarHead(s: DrillSpec, tu: Tuning): Drill {
  return s.family === 'g-cmel' ? genChordMelody(s, tu) : genTuneGuitar(s, tu);
}
/** Bass: b-tune. */
export function generateBassHead(s: DrillSpec, tu: Tuning): Drill {
  return genTuneBass(s, tu);
}

// ───────────────────────────── catalogue ─────────────────────────────

/** All twelve keys round the cycle of 4ths (absolute tonics; a head moves to each). */
export const HEAD_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
/** Can a preset reharm kind change this head at all (a Coltrane sub needs a ii–V into a major I)? */
const REHARMABLE = new Map<string, boolean>();
const reharmable = (idx: number, kind: string): boolean => {
  const k = `${idx}|${kind}`;
  if (!REHARMABLE.has(k)) {
    const hi = headIn(HEADS[idx], HEADS[idx].home.key);
    REHARMABLE.set(k, Object.keys(autoPlan(hi.text, hi.tonic, RH_SETS[kind], hi.notes)).length > 0);
  }
  return REHARMABLE.get(k)!;
};
const headsFor = (kind: string): number[] => (RH_SETS[kind] ? SERVED.filter((i) => reharmable(i, kind)) : SERVED);

/** Base harmonising levels (stable ids 1–7); registered styles beyond the base four follow as levels 8, 9 … */
const BASE_STYLES = ['shell', 'close', 'drop2', 'drop3'];
const HARM_TITLE: Record<string, T2> = {
  shell: t('Shells under the melody', 'שלדים מתחת למנגינה'),
  close: t('Four-way close: the melody on top', 'ארבעה קולות צמודים: המנגינה למעלה'),
  drop2: t('Drop 2 under the melody', 'דרופ 2 מתחת למנגינה'),
  drop3: t('Drop 3 under the melody', 'דרופ 3 מתחת למנגינה'),
};

/** k-harm: harmonise a melody (piano, path ~1330 → 1750). */
export function pianoHarmFamily(): FamilyDef {
  const fam: FamilyId = 'k-harm';
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef =>
    ({ id: `${fam}-${level}`, level, title: t(en, he), specs, keys: HEAD_KEYS, tempo }) as LevelDef;
  const phrase0 = (kind: string, tempo: number): SpecTemplate[] => SERVED.map((i) => ({ family: fam, kind, hands: 'RL', option: opt(i, 0), tempo }));
  const levels: LevelDef[] = [
    L(1, 'The melody alone', 'המנגינה לבד', SERVED.map((i) => ({ family: fam, kind: 'hm-mel', hands: 'R', option: opt(i), tempo: 80 })), [80, 132]),
    ...BASE_STYLES.map((id, k) => L(k + 2, HARM_TITLE[id].en, HARM_TITLE[id].he, phrase0(`hm-${id}`, 60), [60, 100])),
    L(6, 'The next phrases in drop 2', 'המשפטים הבאים בדרופ 2', SERVED.flatMap((i) => [1, 2].filter((p) => p < phraseCount(HEADS[i])).map((p) => ({ family: fam, kind: 'hm-drop2', hands: 'RL' as const, option: opt(i, p), tempo: 60 }))), [60, 100]),
    L(7, 'The rest of the head in drop 3', 'שאר השיר בדרופ 3', SERVED.flatMap((i) => [2, 3].filter((p) => p < phraseCount(HEADS[i])).map((p) => ({ family: fam, kind: 'hm-drop3', hands: 'RL' as const, option: opt(i, p), tempo: 60 }))), [60, 100]),
  ];
  // Plugged-in styles (heads.ts registerHarmStyle): one level each, after the base ladder.
  for (const st of builtStyles().filter((x) => !BASE_STYLES.includes(x.id))) levels.push(L(levels.length + 1, st.name.en, st.name.he, phrase0(`hm-${st.id}`, 60), [60, 100]));
  return { id: fam, title: t('Harmonise a melody', 'הרמון מנגינה'), style: 'jazz', levels };
}

/** The piano tune ladder: [kind, en, he]. */
const TUNE_PIANO: [string, string, string][] = [
  ['tn-root', 'Roots through the head', 'יסודות לאורך השיר'],
  ['tn-guide', 'Guide tones through the head', 'צלילים מנחים לאורך השיר'],
  ['tn-shell', 'Shells through the head', 'שלדים לאורך השיר'],
  ['tn-rootless', 'Rootless voicings through the head', 'קולות בלי יסוד לאורך השיר'],
  ['tn-drop2', 'Drop 2 through the head', 'דרופ 2 לאורך השיר'],
  ['tn-melcomp', 'Melody and comp: shells under the head', 'מנגינה וליווי: שלדים מתחת לשיר'],
  ['tn-rh1', 'Reharm: tritone subs and extra ii–Vs', 'הרמון מחדש: תחליפי טריטון ו־ii–V נוסף'],
  ['tn-rh2', 'Reharm: backdoor, passing dim, line cliché', 'הרמון מחדש: דלת אחורית, דימיניש עובר, קו קלישאה'],
  ['tn-rh3', 'Reharm: Coltrane subs, and the melody over it', 'הרמון מחדש: קולטריין, והמנגינה מעליו'],
  // HARMONY-REHARM §4: modal interchange inside a head (the borrowed devices of reharm.ts, checked against the melody).
  ['tn-rh4', 'Reharm: borrowed chords — iv, ♭VI, ♭VII7, iiø7, minor plagal', 'הרמון מחדש: אקורדים שאולים — iv, ♭VI, ♭VII7, iiø7, פלגלית מינורית'],
];

/** k-tune: comp a head (piano, path ~1330 → 1780). */
export function pianoTuneFamily(): FamilyDef {
  const fam: FamilyId = 'k-tune';
  const levels: LevelDef[] = TUNE_PIANO.map(([kind, en, he], i) => {
    const kinds = kind === 'tn-rh3' ? ['tn-rh3', 'tn-rhmel'] : [kind];
    const specs: SpecTemplate[] = kinds.flatMap((k) => headsFor(k).map((idx) => ({ family: fam, kind: k, hands: 'RL' as const, option: opt(idx), tempo: 60 })));
    return { id: `${fam}-${i + 1}`, level: i + 1, title: t(en, he), specs, keys: HEAD_KEYS, tempo: [60, 120] } as LevelDef;
  });
  return { id: fam, title: t('Tunes: comp the head', 'שירים: ליווי השיר'), style: 'jazz', levels };
}

/** g-cmel: chord-melody (guitar, jazz add-on). [kind, en, he, grade]. */
const CMEL: [string, string, string, number][] = [
  ['cm-mel', 'The melody alone, in position', 'המנגינה לבד, בפוזיציה', 7],
  ['cm-bass', 'Melody and the bass note on the downbeats', 'מנגינה וצליל הבס על הפעמות', 7],
  ['cm-guide', 'Two voices: melody and a guide tone', 'שני קולות: מנגינה וצליל מנחה', 8],
  ['cm-drop2', 'Drop 2 under the melody, top four strings', 'דרופ 2 מתחת למנגינה, ארבעת המיתרים העליונים', 8],
  ['cm-dim', 'Passing diminished between the chords', 'דימיניש עובר בין האקורדים', 9],
  ['cm-chorus', 'A whole chorus of chord-melody', 'פזמון שלם של אקורד-מלודיה', 9],
];
export function guitarChordMelodyFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-cmel';
  const levels: GuitarLevelDef[] = CMEL.map(([kind, en, he, grade], i) => ({
    id: `${fam}-${i + 1}`,
    level: i + 1,
    title: t(en, he),
    specs: SERVED.map((idx): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', option: opt(idx, 0), tempo: 60 })),
    keys: HEAD_KEYS,
    tempo: [60, 112],
    sub: kind === 'cm-mel' ? 'single notes' : 'chord-melody',
    grade,
  }));
  return { id: fam, title: t('Chord-melody', 'אקורד-מלודיה'), style: 'jazz', genres: ['jazz'], instruments: ['guitar'], levels };
}

/** g-tune: the tune ladder on the guitar (jazz add-on). */
const TUNE_GUITAR: [string, string, string, number][] = [
  ['tn-root', 'Roots through the head', 'יסודות לאורך השיר', 7],
  ['tn-guide', 'Guide tones through the head', 'צלילים מנחים לאורך השיר', 7],
  ['tn-shell', 'Shells through the head', 'שלדים לאורך השיר', 7],
  ['tn-rootless', 'Rootless drop 2 through the head', 'דרופ 2 בלי יסוד לאורך השיר', 8],
  ['tn-drop2', 'Drop 2 through the head', 'דרופ 2 לאורך השיר', 8],
  ['tn-melcomp', 'Melody and comp: chord-melody on the changes', 'מנגינה וליווי: אקורד-מלודיה על חילופי האקורדים', 8],
  ['tn-rh1', 'Reharm: tritone subs and extra ii–Vs', 'הרמון מחדש: תחליפי טריטון ו־ii–V נוסף', 9],
  ['tn-rh2', 'Reharm: backdoor, passing dim, line cliché', 'הרמון מחדש: דלת אחורית, דימיניש עובר, קו קלישאה', 9],
  ['tn-rh3', 'Reharm: Coltrane subs, and the melody over it', 'הרמון מחדש: קולטריין, והמנגינה מעליו', 9],
];
export function guitarTuneFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-tune';
  const levels: GuitarLevelDef[] = TUNE_GUITAR.map(([kind, en, he, grade], i) => {
    const kinds = kind === 'tn-rh3' ? ['tn-rh3', 'tn-rhmel'] : [kind];
    return {
      id: `${fam}-${i + 1}`,
      level: i + 1,
      title: t(en, he),
      specs: kinds.flatMap((k) => headsFor(k).map((idx): SpecTemplate => ({ family: fam, kind: k, hands: 'R', instrument: 'guitar', option: opt(idx), tempo: 60 }))),
      keys: HEAD_KEYS,
      tempo: [60, 120],
      sub: 'one chord a change',
      grade,
    };
  });
  return { id: fam, title: t('Tunes on the neck', 'שירים על הצוואר'), style: 'jazz', genres: ['jazz'], instruments: ['guitar'], levels };
}

/** b-tune: the bass ladder per head (jazz track). */
const TUNE_BASS: [string, string, string][] = [
  ['tn-root', 'Roots through the head', 'יסודות לאורך השיר'],
  ['tn-two', 'Two-feel through the head', 'בשתיים לאורך השיר'],
  ['tn-walk', 'Walking the head', 'ווקינג על השיר'],
  ['tn-appr', 'Walking with approach notes', 'ווקינג עם צלילי גישה'],
  ['tn-rh1', 'Walk the reharm: tritone subs and extra ii–Vs', 'ווקינג על ההרמון החדש: טריטון ו־ii–V נוסף'],
  ['tn-rh2', 'Walk the reharm: backdoor, passing dim, line cliché', 'ווקינג על ההרמון החדש: דלת אחורית, דימיניש, קלישאה'],
  ['tn-rh3', 'Walk the reharm: Coltrane subs', 'ווקינג על ההרמון החדש: קולטריין'],
];
export function bassTuneFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-tune';
  const levels: GuitarLevelDef[] = TUNE_BASS.map(([kind, en, he], i) => {
    const walk = kind !== 'tn-root' && kind !== 'tn-two';
    return {
      id: `${fam}-${i + 1}`,
      level: i + 1,
      title: t(en, he),
      specs: headsFor(kind).map((idx): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'bass', option: opt(idx), ...(walk ? { perBeat: 1 } : {}), tempo: walk ? 80 : 70 })),
      keys: HEAD_KEYS,
      tempo: walk ? [80, 160] : [70, 120],
      sub: walk ? 'quarters' : 'halves',
    };
  });
  return { id: fam, title: t('Tunes on the bass', 'שירים בבס'), style: 'jazz', genres: ['all'], instruments: ['bass'], levels };
}

/** The level kinds of each family (tests, lessons). */
export const HEAD_LEVEL_KINDS = { 'k-tune': TUNE_PIANO.map((x) => x[0]), 'g-tune': TUNE_GUITAR.map((x) => x[0]), 'b-tune': TUNE_BASS.map((x) => x[0]), 'g-cmel': CMEL.map((x) => x[0]) };
