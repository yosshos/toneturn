// The modes and symmetric scales as full scale exercises (docs/SPEC-PRACTICE-KEYS.md §2, §6; owner 2026-11-21).
//
//   k-modes  the major modes on a root (C dorian, C phrygian … C aeolian, C locrian, and the bebop dominant) in the
//            forms scales 19–33 lack: aeolian and bebop dominant in every form, every mode a 3rd / 6th / 10th apart and
//            over 3 octaves; and the two whole-family exercises — all seven modes on one root (parallel) and the seven
//            modes through the parent (derived: C ionian, D dorian, E phrygian …). Key page tab: major.
//   k-mmhm   the melodic-minor modes (dorian ♭2, lydian augmented, lydian dominant, mixolydian ♭6, locrian ♮2, altered)
//            and the harmonic-minor modes (locrian ♮6, ionian ♯5, dorian ♯4, phrygian dominant, lydian ♯2, altered ♭♭7)
//            in every form, both families' parallel and derived exercises, and whole-tone, diminished half-whole and
//            whole-half hands together and in contrary motion. Key page tabs: mmhm, symmetric.
//
// Standard theory only: the mode names and parents of keyTheory.ts, each heptatonic mode spelled one letter per degree
// (keyTheory.spellScale) from the root name with the fewest accidentals. Every scale form is genScale's (generate.ts):
// the same paths, registers and the same automatic fingering the modes of scales 19–27 use; no fingering on the
// symmetric scales (their fingerings vary between methods). Every item runs in all 12 keys.
//
// NOTE: generate.ts imports this module and it imports generate.ts: nothing here calls its exports at module top level.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { EXAM_NPS, genScaleWith, itemIdOf, keyName, pianoTitle, type CustomScale } from './generate';
import { HARMONIC_MINOR, HM_MODES, MAJOR, MELODIC_MINOR, MM_MODES, modeOf } from '../scaleModes';
import { spellScale } from '../keyTheory';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod12 = (n: number): number => ((n % 12) + 12) % 12;

export type ModeFamily = 'major' | 'mm' | 'hm' | 'sym';
export interface ModeDef {
  ints: number[];
  name: T2;
  fam: ModeFamily;
  /** The degree of the parent scale the mode starts on (0 = the parent itself). */
  deg?: number;
}

const MAJOR_MODE_NAMES: T2[] = [
  t('ionian', 'יוני'),
  t('dorian', 'דורי'),
  t('phrygian', 'פריגי'),
  t('lydian', 'לידי'),
  t('mixolydian', 'מיקסולידי'),
  t('aeolian', 'אאולי'),
  t('locrian', 'לוקרי'),
];

/** Every scale of the two families, by option number (stable: the option is in the item id). */
export const MODES: ModeDef[] = [
  // 0–6 the major modes
  ...MAJOR_MODE_NAMES.map((name, d): ModeDef => ({ ints: modeOf(MAJOR, d), name, fam: 'major', deg: d })),
  // 7 the bebop dominant: mixolydian with the passing major 7th (Barry Harris, David Baker)
  { ints: [0, 2, 4, 5, 7, 9, 10, 11], name: t('bebop dominant', 'ביבופ דומיננטי'), fam: 'major' },
  // 8 melodic minor (ascending form, the jazz melodic minor), 9–14 its modes
  { ints: MELODIC_MINOR, name: t('melodic minor', 'מינור מלודי'), fam: 'mm', deg: 0 },
  ...MM_MODES.map(([d, name]): ModeDef => ({ ints: modeOf(MELODIC_MINOR, d), name, fam: 'mm', deg: d })),
  // 15 harmonic minor, 16–21 its modes
  { ints: HARMONIC_MINOR, name: t('harmonic minor', 'מינור הרמוני'), fam: 'hm', deg: 0 },
  ...HM_MODES.map(([d, name]): ModeDef => ({ ints: modeOf(HARMONIC_MINOR, d), name, fam: 'hm', deg: d })),
  // 22–24 the symmetric scales
  { ints: [0, 2, 4, 6, 8, 10], name: t('whole-tone', 'טונים שלמים'), fam: 'sym' },
  { ints: [0, 1, 3, 4, 6, 7, 9, 10], name: t('diminished half-whole', 'מוקטן חצי־שלם'), fam: 'sym' },
  { ints: [0, 2, 3, 5, 6, 8, 9, 11], name: t('diminished whole-half', 'מוקטן שלם־חצי'), fam: 'sym' },
];
/** Option numbers by name (tests, levels). */
export const MODE_OPT = {
  ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6, bebopDom: 7,
  melodicMinor: 8, dorianB2: 9, lydianAug: 10, lydianDom: 11, mixolydianB6: 12, locrianN2: 13, altered: 14,
  harmonicMinor: 15, locrianN6: 16, ionianS5: 17, dorianS4: 18, phrygianDom: 19, lydianS2: 20, alteredBb7: 21,
  wholeTone: 22, dimHW: 23, dimWH: 24,
} as const;

/** The three families of the whole-family exercises: the scales in degree order, the parent, its names. */
export const MODE_FAMILIES: { opts: number[]; parent: number[]; parentName: T2; modes: T2 }[] = [
  { opts: [0, 1, 2, 3, 4, 5, 6], parent: MAJOR, parentName: t('major', 'מז׳ור'), modes: t('major modes', 'המודוסים של מז׳ור') },
  { opts: [8, 9, 10, 11, 12, 13, 14], parent: MELODIC_MINOR, parentName: t('melodic minor', 'מינור מלודי'), modes: t('melodic-minor modes', 'המודוסים של מינור מלודי') },
  { opts: [15, 16, 17, 18, 19, 20, 21], parent: HARMONIC_MINOR, parentName: t('harmonic minor', 'מינור הרמוני'), modes: t('harmonic-minor modes', 'המודוסים של מינור הרמוני') },
];

// ───────────────────────────── spelling ─────────────────────────────

const ACC: Record<string, number> = { '': 0, '♭': -1, '♯': 1, '𝄫': -2, '𝄪': 2 };
const ACC_S: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
/** The names a root can take: a white key its letter, a black key its sharp and its flat name. */
const ROOT_NAMES: string[][] = [['C'], ['C♯', 'D♭'], ['D'], ['D♯', 'E♭'], ['E'], ['F'], ['F♯', 'G♭'], ['G'], ['G♯', 'A♭'], ['A'], ['A♯', 'B♭'], ['B']];
/** How hard a spelling reads: a double accidental 3, E♯ / B♯ / F♭ / C♭ 1.5, any other accidental 1. */
const costOf = (notes: string[]): number =>
  notes.reduce((c, n) => {
    const a = Math.abs(ACC[n.slice(1)] ?? 0);
    return c + (a >= 2 ? 3 : a === 1 ? (/^(E♯|B♯|F♭|C♭)$/.test(n) ? 1.5 : 1) : 0);
  }, 0);

/** The notes of a scale spelled from a root name; bebop dominant: the mixolydian letters plus its passing major 7th. */
function spellFrom(root: string, m: ModeDef): string[] | null {
  if (m.ints.length === 7) return spellScale(root, m.ints);
  if (m.fam === 'major' && m.ints.length === 8) {
    const mixo = spellScale(root, modeOf(MAJOR, 4));
    const b7 = mixo[6];
    return [...mixo, b7[0] + (ACC_S[(ACC[b7.slice(1)] ?? 0) + 1] ?? '?')];
  }
  return null;
}

/**
 * A mode on a pitch class: its root name and its notes, one letter per degree, from the root name with the fewest
 * accidentals (F♯ dorian, not G♭ dorian; E♭ dorian, not D♯); a tie keeps the key page's name (keyName). The symmetric
 * scales have no one-letter-per-degree spelling: their notes are null (the staff spells them in C).
 */
export function spellMode(pc: number, opt: number, rootName?: string): { root: string; notes: string[] | null } {
  const m = MODES[opt];
  const page = keyName(pc);
  if (rootName) return { root: rootName, notes: spellFrom(rootName, m) };
  if (m.fam === 'sym') return { root: page, notes: null };
  let best: { root: string; notes: string[] | null; cost: number } | null = null;
  for (const r of ROOT_NAMES[mod12(pc)]) {
    const notes = spellFrom(r, m);
    const cost = notes ? costOf(notes) : 0;
    if (!best || cost < best.cost || (cost === best.cost && r === page)) best = { root: r, notes, cost };
  }
  return { root: best!.root, notes: best!.notes };
}

/** The key signatures a staff draws (major tonics), as the drill's keySig strings. */
const SIGS: Record<string, string> = { C: 'C', G: 'G', D: 'D', A: 'A', E: 'E', B: 'B', 'F♯': 'F#', 'C♯': 'C#', F: 'F', 'B♭': 'Bb', 'E♭': 'Eb', 'A♭': 'Ab', 'D♭': 'Db', 'G♭': 'Gb', 'C♭': 'Cb' };

/** The key signature of a spelled mode: the major modes take their parent major's (D dorian → C); the rest none. */
function keySigOf(m: ModeDef, notes: string[] | null): string {
  if (!notes || m.fam !== 'major') return 'C';
  const parent = m.deg === undefined ? notes[3] /* bebop dominant: the mixolydian's parent, a 4th up */ : notes[(7 - m.deg) % 7];
  return SIGS[parent] ?? 'C';
}

/** The scale of one item: intervals, the title name on its root, key signature, spelling per pitch class, fingering. */
export function modeCustom(pc: number, opt: number, rootName?: string): CustomScale {
  const m = MODES[opt];
  const sp = spellMode(pc, opt, rootName);
  const spell = sp.notes ? Object.fromEntries(sp.notes.map((n, i) => [mod12(pc + m.ints[i]), n])) : undefined;
  return { ints: m.ints, name: t(`${sp.root} ${m.name.en}`, `${sp.root} ${m.name.he}`), keySig: keySigOf(m, sp.notes), spell, finger: m.fam !== 'sym' };
}

// ───────────────────────────── drills ─────────────────────────────

const optOf = (s: DrillSpec, n: number): number => Math.min(n - 1, Math.max(0, s.option ?? 0));

/**
 * The whole-family exercises, one octave each way per mode, one mode after another. Parallel: every mode on the root
 * (C ionian, C dorian, C phrygian …). Derived: the parent from each of its degrees (C ionian, D dorian, E phrygian …),
 * each segment starting on its degree, the roots spelled as the parent spells them.
 */
function familyRun(s: DrillSpec, derived: boolean): Drill {
  const F = MODE_FAMILIES[optOf(s, MODE_FAMILIES.length)];
  const key = mod12(s.key);
  const parentNotes = spellMode(key, F.opts[0]).notes!;
  const segs: Drill[] = [];
  let ref: number | null = null;
  F.opts.forEach((opt, d) => {
    const pc = derived ? mod12(key + F.parent[d]) : key;
    const sp: DrillSpec = { ...s, kind: 'mode', key: pc, option: opt, octaves: 1, motion: s.motion === 'contrary' ? 'contrary' : 'parallel' };
    const seg = genScaleWith(sp, modeCustom(pc, opt, derived ? parentNotes[d] : undefined));
    // the first note of the leading hand (RH, or the LH alone); derived segments start on their degree above the parent's
    const lead = s.hands === 'L' ? 'L' : 'R';
    const first = seg.notes.filter((n) => n.hand === lead).reduce((a, b) => (b.beat < a.beat || (b.beat === a.beat && b.pitch < a.pitch) ? b : a));
    if (ref === null) ref = first.pitch;
    const want = derived ? ref + F.parent[d] : ref;
    const shift = want - first.pitch;
    segs.push({ ...seg, notes: seg.notes.map((n) => ({ ...n, pitch: n.pitch + shift })) });
  });
  // the derived run climbs a 7th above the parent's octave: keep the RH under about F6 and the LH alone under G4
  const top = Math.max(...segs.flatMap((seg) => seg.notes.map((n) => n.pitch)));
  const down = (s.hands === 'L' && top > 67) || top > 86 ? 12 : 0;
  if (down) segs.forEach((seg, i) => (segs[i] = { ...seg, notes: seg.notes.map((n) => ({ ...n, pitch: n.pitch - down })) }));
  let at = 0;
  const notes = segs.flatMap((seg, i) => {
    const out = seg.notes.map((n) => ({ ...n, beat: Math.round((n.beat + at) * 1e6) / 1e6, ...(n.chordId !== undefined ? { chordId: n.chordId + i * 10000 } : {}) }));
    at += seg.beats;
    return out;
  });
  const R = keyName(key);
  const ttl = derived
    ? t(`Through ${R} ${F.parentName.en}: the ${F.modes.en} in turn (derived)`, `דרך ${R} ${F.parentName.he}: ${F.modes.he} ברצף (נגזרים)`)
    : t(`All the ${F.modes.en} on ${R} (parallel)`, `כל ${F.modes.he} על ${R} (מקבילים)`);
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title: pianoTitle([ttl, s.motion === 'contrary' ? t('contrary motion', 'תנועה נגדית') : null, t('1 oct', '1 אוק׳')], s),
    notes,
    beats: Math.round(at * 1e6) / 1e6,
    meter: 4,
    // derived through a major parent: every note is the parent's, so its signature; otherwise accidentals as spelled
    keySig: derived && F.opts[0] === 0 ? segs[0].keySig : 'C',
    goal: segs[0].goal,
    startBpm: s.tempo ?? segs[0].startBpm,
  };
}

/** k-modes and k-mmhm drills. */
export function genModeScale(s: DrillSpec): Drill {
  if (s.kind === 'mode-par') return familyRun(s, false);
  if (s.kind === 'mode-der') return familyRun(s, true);
  if (s.kind === 'mode') return genScaleWith(s, modeCustom(s.key, optOf(s, MODES.length)));
  throw new Error(`Unknown mode-scale kind: ${s.kind}`);
}

// ───────────────────────────── catalogue ─────────────────────────────

/** A level: every item starts at the level's start speed (notes per second → ♩ at the item's note value), all 12 keys. */
function lv(fam: FamilyId, level: number, en: string, he: string, specs: SpecTemplate[], nps: [number, number]): LevelDef {
  return { id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: Math.max(40, Math.round((nps[0] * 60) / (x.perBeat ?? 2))) })), keys: 'major', nps };
}
const item = (fam: FamilyId, kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', option, ...o });
/** Each hand, one and two octaves. */
const eachHand = (fam: FamilyId, opt: number): SpecTemplate[] => [1, 2].flatMap((oc) => (['R', 'L'] as const).map((h) => item(fam, 'mode', opt, { hands: h, octaves: oc as 1 | 2 })));
/** Hands together, parallel and contrary, one and two octaves. */
const together = (fam: FamilyId, opt: number): SpecTemplate[] => [1, 2].flatMap((oc) => [item(fam, 'mode', opt, { hands: 'RL', octaves: oc as 1 | 2 }), item(fam, 'mode', opt, { hands: 'RL', octaves: oc as 1 | 2, motion: 'contrary' })]);
/** A 3rd, 6th and 10th apart, two octaves. */
const apart = (fam: FamilyId, opt: number): SpecTemplate[] => (['third', 'sixth', 'tenth'] as const).map((mo) => item(fam, 'mode', opt, { hands: 'RL', octaves: 2, motion: mo }));
const three = (fam: FamilyId, opt: number): SpecTemplate => item(fam, 'mode', opt, { hands: 'RL', octaves: 3 });
const four = (fam: FamilyId, opt: number): SpecTemplate => item(fam, 'mode', opt, { hands: 'RL', octaves: 4, perBeat: 4 });
/** The whole-family exercises: parallel and derived, right hand, left hand and hands together. */
const wholeFamily = (fam: FamilyId, f: number, hands: SpecTemplate['hands'][]): SpecTemplate[] => (['mode-par', 'mode-der'] as const).flatMap((k) => hands.map((h) => item(fam, k, f, { hands: h })));
const nm = (opt: number): T2 => MODES[opt].name;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const list = (opts: number[], lang: 'en' | 'he'): string => opts.map((o) => nm(o)[lang]).join(', ');

/**
 * Path difficulty of every level (path.ts KEYS_LEVEL_DIFF), by level number: the major modes after scales 19–27 (from
 * 1540); the symmetric scales hands together from 1600, the melodic / harmonic minor modes from 1640, all under PATH_CAP.
 */
const K_MODES_DIFF = [1540, 1580, 1620, 1660, 1700, 1740, 1780, 1820, 1860, 1870, 1890];
const K_MMHM_DIFF = [1640, 1660, 1680, 1700, 1720, 1740, 1650, 1670, 1690, 1710, 1730, 1750, 1780, 1800, 1790, 1810, 1840, 1850, 1890, 1895, 1600, 1615, 1630, 1880, 1860, 1870];
export const MODE_LEVEL_DIFF: Record<string, number> = Object.fromEntries([
  ...K_MODES_DIFF.map((d, i) => [`k-modes-${i + 1}`, d]),
  ...K_MMHM_DIFF.map((d, i) => [`k-mmhm-${i + 1}`, d]),
]);

export function keysModesFamily(): FamilyDef {
  const F: FamilyId = 'k-modes';
  const O = MODE_OPT;
  const SN = EXAM_NPS.scales;
  const levels: LevelDef[] = [];
  const add = (en: string, he: string, specs: SpecTemplate[], nps: [number, number], diff: number) => {
    const l = lv(F, levels.length + 1, en, he, specs, nps);
    // the static table is what the path reads; the number here only documents the level's place
    if (MODE_LEVEL_DIFF[l.id] !== diff) throw new Error(`MODE_LEVEL_DIFF out of step at ${l.id}`);
    levels.push(l);
  };
  add('Aeolian: each hand, one and two octaves', 'אאולי: כל יד, אוקטבה ושתיים', eachHand(F, O.aeolian), [SN[2], SN[4]], 1540);
  add('Aeolian: hands together, parallel and contrary', 'אאולי: ידיים יחד, מקביל ונגדי', together(F, O.aeolian), [SN[2], SN[4]], 1580);
  add('Bebop dominant: each hand, one and two octaves', 'ביבופ דומיננטי: כל יד, אוקטבה ושתיים', eachHand(F, O.bebopDom), [SN[2], SN[4]], 1620);
  add('Bebop dominant: hands together, parallel and contrary', 'ביבופ דומיננטי: ידיים יחד, מקביל ונגדי', together(F, O.bebopDom), [SN[2], SN[4]], 1660);
  add('Dorian and mixolydian a 3rd, 6th and 10th apart', 'דורי ומיקסולידי בהפרש טרצה, סקסטה ודצימה', [...apart(F, O.dorian), ...apart(F, O.mixolydian)], [SN[2], SN[4]], 1700);
  add('Lydian and phrygian a 3rd, 6th and 10th apart', 'לידי ופריגי בהפרש טרצה, סקסטה ודצימה', [...apart(F, O.lydian), ...apart(F, O.phrygian)], [SN[2], SN[4]], 1740);
  add('Aeolian and locrian a 3rd, 6th and 10th apart', 'אאולי ולוקרי בהפרש טרצה, סקסטה ודצימה', [...apart(F, O.aeolian), ...apart(F, O.locrian)], [SN[2], SN[4]], 1780);
  add('The modes over three octaves, hands together', 'המודוסים בשלוש אוקטבות, ידיים יחד', [O.dorian, O.phrygian, O.lydian, O.mixolydian, O.aeolian, O.locrian, O.bebopDom].map((o) => three(F, o)), [SN[3], SN[5]], 1820);
  add('All the modes on one root (parallel)', 'כל המודוסים על צליל אחד (מקבילים)', wholeFamily(F, 0, ['R', 'L', 'RL']).filter((x) => x.kind === 'mode-par'), [SN[2], SN[4]], 1860);
  add('The modes through the parent scale (derived)', 'המודוסים דרך סולם האם (נגזרים)', wholeFamily(F, 0, ['R', 'L', 'RL']).filter((x) => x.kind === 'mode-der'), [SN[2], SN[4]], 1870);
  add('Aeolian and bebop dominant, 4 octaves hands together in 16ths', 'אאולי וביבופ דומיננטי, 4 אוקטבות בידיים יחד בשש-עשריות', [four(F, O.aeolian), four(F, O.bebopDom)], [SN[3], SN[7]], 1890);
  return { id: F, title: t('Modes on a root', 'מודוסים על צליל'), style: 'both', levels };
}

export function keysMmhmFamily(): FamilyDef {
  const F: FamilyId = 'k-mmhm';
  const O = MODE_OPT;
  const SN = EXAM_NPS.scales;
  const levels: LevelDef[] = [];
  const add = (en: string, he: string, specs: SpecTemplate[], nps: [number, number], diff: number) => {
    const l = lv(F, levels.length + 1, en, he, specs, nps);
    // the static table is what the path reads; the number here only documents the level's place
    if (MODE_LEVEL_DIFF[l.id] !== diff) throw new Error(`MODE_LEVEL_DIFF out of step at ${l.id}`);
    levels.push(l);
  };
  const MM = [O.dorianB2, O.lydianAug, O.lydianDom, O.mixolydianB6, O.locrianN2, O.altered];
  const HM = [O.locrianN6, O.ionianS5, O.dorianS4, O.phrygianDom, O.lydianS2, O.alteredBb7];
  // one level per mode: each hand and hands together (melodic minor's from 1640, harmonic minor's between them)
  MM.forEach((o, i) => add(`${cap(nm(o).en)}: each hand and hands together, parallel and contrary`, `${nm(o).he}: כל יד וידיים יחד, מקביל ונגדי`, [...eachHand(F, o), ...together(F, o)], [SN[2], SN[4]], 1640 + 20 * i));
  HM.forEach((o, i) => add(`${cap(nm(o).en)}: each hand and hands together, parallel and contrary`, `${nm(o).he}: כל יד וידיים יחד, מקביל ונגדי`, [...eachHand(F, o), ...together(F, o)], [SN[2], SN[4]], 1650 + 20 * i));
  // a 3rd, 6th and 10th apart, three modes a level
  for (const [fam, opts, d0] of [[t('Melodic-minor modes', 'המודוסים של מינור מלודי'), MM, 1780], [t('Harmonic-minor modes', 'המודוסים של מינור הרמוני'), HM, 1790]] as const)
    for (const half of [0, 1]) {
      const os = opts.slice(half * 3, half * 3 + 3);
      add(`${fam.en} a 3rd, 6th and 10th apart: ${list(os, 'en')}`, `${fam.he} בהפרש טרצה, סקסטה ודצימה: ${list(os, 'he')}`, os.flatMap((o) => apart(F, o)), [SN[2], SN[4]], d0 + 20 * half);
    }
  add('Melodic-minor modes over three octaves, hands together', 'המודוסים של מינור מלודי בשלוש אוקטבות, ידיים יחד', MM.map((o) => three(F, o)), [SN[3], SN[5]], 1840);
  add('Harmonic-minor modes over three octaves, hands together', 'המודוסים של מינור הרמוני בשלוש אוקטבות, ידיים יחד', HM.map((o) => three(F, o)), [SN[3], SN[5]], 1850);
  add('Melodic-minor modes, 4 octaves hands together in 16ths', 'המודוסים של מינור מלודי, 4 אוקטבות בידיים יחד בשש-עשריות', MM.map((o) => four(F, o)), [SN[3], SN[7]], 1890);
  add('Harmonic-minor modes, 4 octaves hands together in 16ths', 'המודוסים של מינור הרמוני, 4 אוקטבות בידיים יחד בשש-עשריות', HM.map((o) => four(F, o)), [SN[3], SN[7]], 1895);
  // the symmetric scales: each hand and hands together (they were right hand only), then 3 and 4 octaves
  for (const [o, d] of [[O.wholeTone, 1600], [O.dimHW, 1615], [O.dimWH, 1630]] as const)
    add(`${cap(nm(o).en)}: each hand and hands together, parallel and contrary`, `${nm(o).he}: כל יד וידיים יחד, מקביל ונגדי`, [...eachHand(F, o), ...together(F, o)], [SN[2], SN[4]], d);
  add('Symmetric scales over 3 and 4 octaves, hands together', 'סולמות סימטריים ב־3 וב־4 אוקטבות, ידיים יחד', [...[O.wholeTone, O.dimHW, O.dimWH].map((o) => three(F, o)), ...[O.wholeTone, O.dimHW, O.dimWH].map((o) => four(F, o))], [SN[3], SN[6]], 1880);
  // the whole-family exercises
  add('Melodic minor: all the modes on one root, and through the parent', 'מינור מלודי: כל המודוסים על צליל אחד, ודרך סולם האם', wholeFamily(F, 1, ['R', 'RL']), [SN[2], SN[4]], 1860);
  add('Harmonic minor: all the modes on one root, and through the parent', 'מינור הרמוני: כל המודוסים על צליל אחד, ודרך סולם האם', wholeFamily(F, 2, ['R', 'RL']), [SN[2], SN[4]], 1870);
  return { id: F, title: t('Melodic & harmonic minor modes, symmetric scales', 'מודוסים של מינור מלודי והרמוני, סולמות סימטריים'), style: 'jazz', levels };
}
