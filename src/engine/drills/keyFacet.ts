// Where an item lives in Practice (docs/SPEC-PRACTICE-KEYS.md, owner 2026-11-21): one facet per drill, read by both
// views — by topic (a family split into its groups) and by key (a root's page, its group tabs and rows). Pure; the
// item id never changes, so saved progress is untouched.
//
//  - scope: 'keyed' (on a key page), 'neutral' (General technique: no key), 'apply' (tunes, comping, reading, ear in a
//    key — on the key page under the technique rows).
//  - root: the page (0–11). Chord-built items (C7 lines, C dorian, triad pairs over C7alt) file by their own root;
//    whatever resolves (cadences, ii–V–I, turnarounds) by the key it resolves to — both are the drill's key number.
//  - group: the tab — 'major' (with the major modes on the root), 'minor' (natural / harmonic / melodic and the minor
//    material), 'mmhm' (the melodic- and harmonic-minor modes on the root), 'symmetric' (chromatic, whole-tone,
//    diminished).
//  - role: the row on the page.
//  - control: the take measures touch — dynamics, articulation, pedal, lengths, holds, voicing (owner 2026-11-21: the
//    dynamics and everything measured there belong to both views too).

import type { Drill } from './types';
import { keyName } from './generate';

export type FacetScope = 'keyed' | 'neutral' | 'apply';
export type FacetGroup = 'major' | 'minor' | 'mmhm' | 'symmetric';
export type FacetRole = 'scale' | 'arpeggio' | 'cadence' | 'pattern' | 'control' | 'harris' | 'harmony' | 'voicing' | 'line' | 'colour' | 'comping' | 'apply';

export interface KeyFacet {
  scope: FacetScope;
  root: number;
  group: FacetGroup;
  role: FacetRole;
  control: boolean;
}

export const FACET_GROUPS: FacetGroup[] = ['major', 'minor', 'mmhm', 'symmetric'];

/** `group`: the tab is fixed by the family (its chord names would read as another mode: "A♭m6" in a major item). */
type Fam = { scope?: FacetScope; role: FacetRole; group?: FacetGroup; neutralKinds?: string[]; kinds?: Record<string, FacetRole> };

/** Every family of piano, guitar and bass (guard test: a family missing here fails). */
export const FAMILY_FACETS: Record<string, Fam> = {
  // ── piano
  'k-first': { role: 'pattern', neutralKinds: ['kf-read', 'kf-piece'] },
  scales: { role: 'scale' },
  arpeggios: { role: 'arpeggio' },
  cadences: { role: 'cadence' },
  fingers: { role: 'pattern' },
  control: { role: 'control', kinds: { reading: 'apply' } },
  advanced: { role: 'pattern', neutralKinds: ['polyrhythm', 'leaps'] },
  harris: { role: 'harris' },
  'k-sixdim': { role: 'harris' },
  voicings: { role: 'voicing' },
  'k-reharm': { role: 'cadence' },
  'k-theory': { role: 'colour' },
  jazz: { role: 'line', kinds: { scale: 'scale', jscale: 'scale' } },
  'k-bebop': { role: 'line' },
  accomp: { role: 'comping' },
  'k-ear': { scope: 'apply', role: 'apply' },
  'k-rhythm': { scope: 'neutral', role: 'pattern' },
  'k-vl': { role: 'voicing' },
  'k-keys': { role: 'cadence' },
  'k-vocab': { role: 'line' },
  'k-indep': { scope: 'neutral', role: 'control' },
  'k-sharm': { role: 'harmony' },
  'k-phrase': { role: 'line' },
  'k-harm': { scope: 'apply', role: 'apply' },
  'k-tune': { scope: 'apply', role: 'apply' },
  'k-solo': { scope: 'apply', role: 'apply' },
  'k-ctx': { role: 'line' },
  'k-harrisline': { role: 'harris' },
  'k-ctone': { role: 'colour' },
  'k-mediant': { role: 'colour' },
  'k-organ': { scope: 'apply', role: 'apply' },
  'k-tpair': { role: 'colour' },
  // Harris's half-step moves sit on the Harris row; the whole-step and two-note colours (and the run) on Colour.
  // Every item resolves to major 6th chords: the major tab, whatever m6 chords its title names.
  'k-dimcol': { role: 'colour', group: 'major', kinds: { 'dc-lower': 'harris', 'dc-raise': 'harris' } },
  'k-lh': { role: 'voicing' },
  'k-tex': { scope: 'apply', role: 'apply' },
  'k-comp': { role: 'comping' },
  'k-impro': { scope: 'apply', role: 'apply' },
  'k-read': { scope: 'apply', role: 'apply' },
  'k-pop': { role: 'comping' },
  'k-pedal': { role: 'control' },
  'k-classic': { scope: 'apply', role: 'apply' },
  'k-gig': { scope: 'apply', role: 'apply' },
  // SPEC-PRACTICE-KEYS §6: the major modes on a root (major tab); melodic / harmonic minor modes and symmetric scales
  // (their tabs by the item's own scale).
  'k-modes': { role: 'scale', group: 'major' },
  'k-mmhm': { role: 'scale' },
  // ── guitar
  'g-first': { scope: 'neutral', role: 'pattern' },
  'g-riff': { scope: 'apply', role: 'apply' },
  'g-fretting': { scope: 'neutral', role: 'pattern' },
  'g-picking': { scope: 'neutral', role: 'pattern' },
  'g-legato': { scope: 'neutral', role: 'pattern' },
  'g-scales': { role: 'scale' },
  'g-arps': { role: 'arpeggio' },
  'g-chords': { role: 'voicing' },
  'g-rhythm': { role: 'comping' },
  'g-lead': { scope: 'neutral', role: 'control' },
  'g-fingerstyle': { scope: 'neutral', role: 'pattern' },
  'g-flamenco': { scope: 'neutral', role: 'pattern' },
  'g-jazz': { role: 'voicing' },
  'g-jblues': { scope: 'apply', role: 'apply' },
  'g-theory': { role: 'colour' },
  'g-harris': { role: 'harris' },
  'g-harm': { role: 'harmony' },
  'g-harrisline': { role: 'harris' },
  'g-ctone': { role: 'colour' },
  'g-color': { role: 'colour' },
  'g-tpair': { role: 'colour' },
  'g-reading': { scope: 'apply', role: 'apply' },
  'g-ear': { scope: 'apply', role: 'apply' },
  'g-impro': { scope: 'apply', role: 'apply' },
  'g-prog': { scope: 'neutral', role: 'pattern' },
  'g-meter': { scope: 'neutral', role: 'pattern' },
  'g-vl': { role: 'voicing' },
  'g-keys': { role: 'cadence' },
  'g-bebop': { role: 'line' },
  'g-phrase': { role: 'line' },
  'g-cmel': { scope: 'apply', role: 'apply' },
  'g-tune': { scope: 'apply', role: 'apply' },
  'g-ctx': { role: 'line' },
  'g-solo': { scope: 'apply', role: 'apply' },
  'g-gig': { scope: 'apply', role: 'apply' },
  'g-speed': { scope: 'neutral', role: 'pattern' },
  'g-fusion': { role: 'line' },
  'g-cmarr': { scope: 'apply', role: 'apply' },
  'g-solojazz': { scope: 'apply', role: 'apply' },
  'g-hlfast': { role: 'harris' },
  // ── bass
  'g-bass': { role: 'scale', neutralKinds: ['spider', 'ghost', 'groove'] },
  'b-first': { scope: 'neutral', role: 'pattern' },
  'b-pluck': { scope: 'neutral', role: 'pattern' },
  'b-time': { scope: 'neutral', role: 'pattern' },
  'b-fret': { scope: 'neutral', role: 'pattern' },
  'b-chord': { role: 'arpeggio' },
  'b-ear': { scope: 'apply', role: 'apply' },
  'b-scale': { role: 'scale' },
  'b-length': { scope: 'neutral', role: 'control' },
  'b-pocket': { scope: 'neutral', role: 'pattern' },
  'b-read': { scope: 'apply', role: 'apply' },
  'b-posread': { scope: 'apply', role: 'apply' },
  'b-styles': { scope: 'apply', role: 'apply' },
  'b-ghost': { scope: 'neutral', role: 'control' },
  'b-walk': { role: 'line' },
  'b-impro': { scope: 'apply', role: 'apply' },
  'b-swing': { role: 'line' },
  'b-barry': { role: 'harris' },
  'b-jform': { scope: 'apply', role: 'apply' },
  'b-latin': { scope: 'apply', role: 'apply' },
  'b-std': { scope: 'apply', role: 'apply' },
  'b-keys': { role: 'cadence' },
  'b-bebop': { role: 'line' },
  'b-phrase': { role: 'line' },
  'b-tune': { scope: 'apply', role: 'apply' },
  'b-ctx': { role: 'line' },
  'b-solo': { scope: 'apply', role: 'apply' },
  'b-gig': { scope: 'apply', role: 'apply' },
  'b-harrisline': { role: 'harris' },
  'b-counter': { role: 'colour' },
  'b-tpair': { role: 'colour' },
  'b-legato': { scope: 'neutral', role: 'pattern' },
  'b-ext': { scope: 'neutral', role: 'pattern' },
  'b-pick': { scope: 'neutral', role: 'pattern' },
  'b-odd': { scope: 'neutral', role: 'pattern' },
  'b-prog': { scope: 'neutral', role: 'pattern' },
  'b-poly': { scope: 'neutral', role: 'pattern' },
  'b-slap': { scope: 'neutral', role: 'pattern' },
  'b-riff': { scope: 'apply', role: 'apply' },
  'b-feel': { role: 'line' },
  'b-up-pos': { scope: 'neutral', role: 'pattern' },
  'b-up-arco': { scope: 'neutral', role: 'control' },
  'b-up-scales': { role: 'scale' },
  'b-up-pizz': { scope: 'neutral', role: 'control' },
  'b-up-walk': { role: 'line' },
  'b-up-read': { scope: 'apply', role: 'apply' },
};

// ── the group, from the item itself (the mode it is in or the scale it is) ──
const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SYM = /whole-tone|whole tone|half-whole|whole-half|half–whole|whole–half|augmented \(symmetric\)/i;
const MMHM = /altered|7alt|lydian dominant|lydian augmented|locrian ♮2|dorian ♭2|mixolydian ♭6|phrygian dominant|super-?locrian|melodic[- ]minor mode|harmonic[- ]minor mode|lydian ♯2|ionian ♯5|dorian ♯4|locrian ♮6/i;
/** The colour of a cadence's chord is the cadence's (a "V altered" in a ii–V–I in C stays with C). */
const CADENCE = /ii–V|I–IV|turnaround|cadence|on the V\b|the V altered|secondary dominants|→ ?[A-G][♭♯]?(maj7|6)?\b/i;
/** The major modes on a root sit with major (owner 2026-11-21: C dorian, C lydian … on the C page). */
const MAJOR_MODE = /\b(ionian|dorian|phrygian|lydian|mixolydian|locrian)\b/i;
/** "minor" as a mode or chord — not an interval ("minor-3rd mediants", "a minor 2nd"). */
const MINOR_WORD = /\bminor\b(?! pentatonic over)(?![- ](2nd|3rd|second|third)\b)|\baeolian\b/i;
/** Roman numerals are case-sensitive ("I–IV" is major, "i–iv" minor). */
const MINOR_RN = /ii–V–i(?![A-Za-z])|(^|[^A-Za-z♭♯])i–iv(?![A-Za-z])|\bm6\b/;

/** The group of a drill (see the head comment). */
export function facetGroup(d: Drill): FacetGroup {
  const fixed = FAMILY_FACETS[d.spec.family]?.group;
  if (fixed) return fixed;
  const t = d.title.en;
  if (d.tonic ? d.tonic.minor : d.spec.minor) return 'minor';
  const k = d.tonic ? d.tonic.key : d.spec.key;
  const names = [keyName(k), keyName(k, true)].map(ESC).join('|');
  // the item's own scale is symmetric: "C chromatic · …", whole-tone, half-whole / whole-half diminished
  if (SYM.test(t) || new RegExp(`(^|[\\s·])(${names}) chromatic( scale)? ·`).test(t)) return 'symmetric';
  if (MMHM.test(t) && !CADENCE.test(t)) return 'mmhm';
  // an explicit minor key ("in Cm", "C harmonic minor") wins over a mode word inside the item ("im6 – IV7 (Dorian)")
  if (new RegExp(`\\bin (${names})m(?![a-z0-9])|(^|[\\s·])(${names}) ((harmonic|melodic|natural|jazz melodic) )?minor\\b`).test(t)) return 'minor';
  if (MAJOR_MODE.test(t)) return 'major';
  // a minor chord on the item's own root ("Cm", "Cm6", "Cm7"), or the minor words
  if (new RegExp(`(^|[\\s·(:])(${names})m(6|7|\\(maj7\\))?(?=[\\s·:,)/]|$)`).test(t) || MINOR_WORD.test(t) || MINOR_RN.test(t)) return 'minor';
  return 'major';
}

/** Measures touch: dynamics, articulation, pedal, lengths, holds, a hand's articulation, graces. */
export function facetControl(d: Drill): boolean {
  const g = d.goal as unknown as Record<string, unknown>;
  return !!(d.spec.dynamics || d.spec.articulation || g.dynamics || g.articulation || g.pedal || g.lengths || g.holds || g.handArt || g.graces);
}

/** The base kind ("g-harrisline>hl-chrom" → "hl-chrom"). */
const baseKind = (kind: string): string => kind.slice(kind.lastIndexOf('>') + 1);

/** The facet of a drill; null for a family this table doesn't know (the guard test keeps it complete). */
export function keyFacet(d: Drill): KeyFacet | null {
  const f = FAMILY_FACETS[d.spec.family];
  if (!f) return null;
  const kind = baseKind(d.spec.kind);
  const control = facetControl(d);
  const scope: FacetScope = f.neutralKinds?.includes(kind) ? 'neutral' : (f.scope ?? 'keyed');
  let role: FacetRole = f.kinds?.[kind] ?? f.role;
  // a scale or pattern item that measures touch also counts as control work (the Control row lists it)
  if (control && (role === 'scale' || role === 'pattern' || role === 'arpeggio') && f.role === 'control') role = 'control';
  return { scope, root: ((d.tonic ? d.tonic.key : d.spec.key) % 12 + 12) % 12, group: f.group ?? facetGroup(d), role, control };
}
