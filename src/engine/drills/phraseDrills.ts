// Phrases by ear (owner 2026-11-14): the phrase-playback ladder as drill families on each instrument — k-phrase
// (keys), g-phrase (guitar, the jazz add-on), b-phrase (bass, the jazz track). Call and response inside one take, like
// the instrument ear families: the count-in, then the call (the phrase over a comp, `listen`), then the player plays it
// back in the bars after it, on the click, with the bar cue. The written answer stays hidden until the result; the
// call can be replayed and slowed before the take (EarCard). Graded note by note by the transcription coach's comparer
// (phraseGrade.ts: pitch and rhythm on the player's own pulse, partial credit). Every level runs in all 12 keys and
// the key is part of the item id, so every take feeds key mastery. The music is in ../phraseEar.ts.
//
// NOTE: guitar.ts, bass.ts and generate.ts import this module and it imports theirs: nothing here may call their
// exports at module top level (only inside functions).

import type { Drill, DrillSpec, ExpNote, BassFamilyId, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import type { Tuning } from '../fretboard';
import type { NoteEvent } from '../lesson';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev } from './guitar';
import { finish as gFinish, place } from './guitar';
import { drillOf, alt, type BN } from './bass';
import { PHRASE_KINDS, PHRASE_LEVEL_NAME, PHRASE_OPTIONS, PHRASE_SWING, callBars, earPhrase, levelOfKind, phraseChart, phraseComp, phraseKeyLabel, swingBeat, type EarPhrase } from '../phraseEar';
import { mod12 } from '../bebopVocab';

type T2 = { en: string; he: string };
type Listen = NonNullable<Drill['listen']>;
const t = (en: string, he: string): T2 => ({ en, he });
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
/** All 12 keys, around the circle of fourths. */
export const PHRASE_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

/** Registers (MIDI) the phrases are written in (each 32 semitones or more, so the widest line fits): the right hand, the neck to fret 16, the bass to fret 16. */
export const PHRASE_REG = { piano: [55, 88], guitar: [47, 80], bass: [28, 60] } as const;
type Inst = keyof typeof PHRASE_REG;
/** The phrase families. */
export const PHRASE_FAMILIES = ['k-phrase', 'g-phrase', 'b-phrase'];
export const isPhraseFamily = (f: string): boolean => PHRASE_FAMILIES.includes(f);
/** Start → target tempo (♩) of each level: calm for the short calls, faster for the bebop lines. */
export const PHRASE_TEMPO: [number, number][] = [
  [72, 100],
  [72, 100],
  [72, 110],
  [72, 110],
  [76, 120],
  [76, 120],
  [80, 132],
  [80, 132],
];

const ASK: T2 = t('Hear the phrase over the chords — then play it back', 'שמעו את המשפט מעל האקורדים — ואז נגנו אותו בחזרה');

/** The phrase of a drill spec on an instrument (its seed: family, kind, key, option). */
export function phraseOf(s: DrillSpec, inst: Inst): EarPhrase {
  const [lo, hi] = PHRASE_REG[inst];
  return earPhrase(s.kind, mod12(s.key), s.option ?? 0, lo, hi, `${s.family}:${s.kind}:${mod12(s.key)}:${s.option ?? 0}`);
}

/**
 * The call: the comp (a shell on each chord; on the bass a root on the bass under the piano's 3rd and 7th) and the
 * phrase, swung where the level swings; every onset before the window's end (a beat before the answer).
 */
function callOf(p: EarPhrase, inst: Inst, swing: boolean): { notes: Listen['notes']; windows: [number, number][]; at: number; bars: number } {
  const bars = callBars(p);
  const at = bars * 4;
  const until = at - 1;
  const notes: Listen['notes'] = [];
  for (const c of phraseComp(p, until, inst === 'bass' ? 48 : 36)) {
    notes.push({ beat: r6(swingBeat(c.beat, swing)), dur: r6(c.dur), midi: inst === 'bass' ? c.shell : [c.root, ...c.shell], inst: 'piano', vel: 0.38 });
  }
  for (const n of p.notes) {
    const b = swingBeat(n.beat, swing);
    notes.push({ beat: r6(b), dur: r6(Math.max(0.2, Math.min(n.dur * 0.92, at - 0.5 - b))), midi: [n.p], inst: inst === 'bass' ? 'bass' : 'piano', vel: 0.8 });
  }
  notes.sort((a, b) => a.beat - b.beat);
  return { notes, windows: [[0, until]], at, bars };
}

const titleOf = (p: EarPhrase, key: number): T2 => {
  const k = phraseKeyLabel(key, p.minor);
  return t(`${p.name.en} · ${k}`, `${p.name.he} · ${k}`);
};
const keySigOf = (p: EarPhrase, key: number) => SIG[mod12(p.minor ? key + 3 : key)];

// ───────────────────────────── keys: k-phrase ─────────────────────────────

export function genKeysPhrase(s0: DrillSpec): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const p = phraseOf(s, 'piano');
  const swing = !!s.swing;
  const c = callOf(p, 'piano', swing);
  const notes: ExpNote[] = p.notes.map((n) => ({ pitch: n.p, beat: r6(c.at + n.beat), dur: r6(n.dur), hand: 'R', chordTone: n.ct }));
  const chart = phraseChart(p, c.bars);
  return {
    spec: s,
    itemId: itemIdOf(s),
    title: titleOf(p, key),
    notes,
    beats: r6(Math.max(c.at + c.bars * 4, ...notes.map((n) => n.beat + n.dur))),
    meter: 4,
    keySig: keySigOf(p, key),
    goal: { evenness: false, hands: false },
    startBpm: s.tempo ?? PHRASE_TEMPO[levelOfKind(s.kind) - 1][0],
    chart: [...chart, ...chart],
    show: 'none',
    listen: { notes: c.notes, windows: c.windows, ask: ASK },
    phrase: { at: c.at, level: levelOfKind(s.kind) },
  };
}

/** The level specs of a family (each level one kind, all its options). */
function levelSpecs(family: FamilyId, kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate[] {
  return Array.from({ length: PHRASE_OPTIONS[kind as (typeof PHRASE_KINDS)[number]] }, (_, op) => ({ family, kind, hands: 'R' as const, option: op, ...(PHRASE_SWING[kind as (typeof PHRASE_KINDS)[number]] ? { swing: true } : {}), ...o }));
}

/** The keys family: eight levels, ~1200 (one bar of chord tones) to ~1900 (eight bars over a form). */
export function keysPhraseFamily(): FamilyDef {
  return {
    id: 'k-phrase',
    title: t('Phrases by ear', 'משפטים בשמיעה'),
    style: 'jazz',
    levels: PHRASE_KINDS.map((kind, i): LevelDef => ({
      id: `k-phrase-${i + 1}`,
      level: i + 1,
      title: PHRASE_LEVEL_NAME[i],
      specs: levelSpecs('k-phrase', kind).map((x) => ({ ...x, tempo: PHRASE_TEMPO[i][0] })),
      keys: PHRASE_KEYS,
      tempo: PHRASE_TEMPO[i],
    })),
  };
}

// ───────────────────────────── guitar: g-phrase ─────────────────────────────

/** A line on the neck, in one position around its lowest note (strings 6 → 1), frets 0–15. */
function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}

export function genGuitarPhrase(s0: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const p = phraseOf(s, 'guitar');
  const c = callOf(p, 'guitar', !!s.swing);
  const pos = onNeck(tu, p.notes.map((n) => n.p));
  const evs: Ev[] = p.notes.map((n, i) => ({ beat: c.at + n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? ('D' as const) : ('U' as const), ct: n.ct }] }));
  const lv = levelOfKind(s.kind);
  const d = gFinish(s, tu, evs, { title: titleOf(p, key), bpm: s.tempo ?? PHRASE_TEMPO[lv - 1][0], evenness: false, keySig: keySigOf(p, key) });
  const chart = phraseChart(p, c.bars);
  return { ...d, beats: Math.max(d.beats, c.at + c.bars * 4), chart: [...chart, ...chart], show: 'none', listen: { notes: c.notes, windows: c.windows, ask: ASK }, phrase: { at: c.at, level: lv } };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** RSL-equivalent grade of each guitar level (the guitar path orders by grade). */
export const G_PHRASE_GRADE = [6, 6, 7, 7, 8, 8, 9, 9];
/** The guitar family (the jazz add-on): grades 6 to 9. */
export function guitarPhraseFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  return fam(
    'g-phrase',
    'Phrases by ear on guitar',
    'משפטים בשמיעה בגיטרה',
    'jazz',
    ['jazz'],
    PHRASE_KINDS.map((kind, i) => LT('g-phrase', i + 1, PHRASE_LEVEL_NAME[i].en, PHRASE_LEVEL_NAME[i].he, levelSpecs('g-phrase', kind, { instrument: 'guitar' }), PHRASE_KEYS, PHRASE_TEMPO[i], PHRASE_SWING[kind] ? 'swing 8ths' : '8ths', G_PHRASE_GRADE[i])),
  );
}

// ───────────────────────────── bass: b-phrase ─────────────────────────────

export function genBassPhrase(s0: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const p = phraseOf(s, 'bass');
  const c = callOf(p, 'bass', !!s.swing);
  const line: BN[] = p.notes.map((n) => ({ b: c.at + n.beat, d: n.dur, p: n.p, ct: n.ct }));
  const chart = phraseChart(p, c.bars);
  const d = drillOf(s, tu, alt(line), {
    en: p.name.en,
    he: p.name.he,
    chart: [...chart, ...chart],
    evenness: false,
    show: 'none',
    listen: { notes: c.notes, windows: c.windows, ask: ASK },
    keySig: keySigOf(p, key),
    ...(p.minor ? { keyName: phraseKeyLabel(key, true) } : { keyName: phraseKeyLabel(key) }),
  });
  return { ...d, beats: Math.max(d.beats, c.at + c.bars * 4), phrase: { at: c.at, level: levelOfKind(s.kind) } };
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The bass family (jazz track): the same eight levels in the bass register. */
export function bassPhraseFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  return fam(
    'b-phrase',
    'Phrases by ear on bass',
    'משפטים בשמיעה בבס',
    PHRASE_KINDS.map((kind, i) => L('b-phrase', i + 1, PHRASE_LEVEL_NAME[i].en, PHRASE_LEVEL_NAME[i].he, levelSpecs('b-phrase', kind, { instrument: 'bass' }), PHRASE_KEYS, PHRASE_TEMPO[i], PHRASE_SWING[kind] ? 'swung 8ths' : '8ths')),
  );
}

// ───────────────────────────── the call's replay ─────────────────────────────

/** Replay speed of "Slower" before the take (the call as written plays at the take's tempo). */
export const REPLAY_SLOW = 0.65;
/**
 * The call as audio events (seconds from 0.05), at `bpm` × `rate` — the replay before the take (EarCard). Notes keep
 * their instrument (the bass call on the bass); the length runs to the call window's end.
 */
export function callSound(drill: Drill, bpm: number, rate = 1): { events: NoteEvent[]; length: number } {
  const beatS = 60 / Math.max(20, bpm * rate);
  const L = drill.listen;
  if (!L) return { events: [], length: 0 };
  const end = Math.max(0, ...L.windows.map((w) => w[1]));
  const events: NoteEvent[] = L.notes.flatMap((n) =>
    n.perc ? [] : n.midi.map((m) => ({ midi: m, start: 0.05 + n.beat * beatS, duration: n.dur * beatS, velocity: n.vel ?? 0.5, ...(n.inst === 'bass' ? { inst: 'bass' as const } : {}) })),
  );
  return { events, length: 0.05 + (end + 1) * beatS + 0.4 };
}
