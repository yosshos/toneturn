// Ornament signs in the notation (k-read 12, the classical pieces): the score draws ONE head with the sign over it
// (VexFlow's Ornament), while the drill's notes stay the written-out realisation the player is graded on. A legend line
// under the staff says how each sign is played, with the real notes of its first use. Pure.
//
// The realisations follow the Baroque / Classical tables (C. P. E. Bach, Türk; J. S. Bach's own table in the
// Clavierbüchlein for W. F. Bach): every ornament starts ON the beat.
//   prall    (upper mordent, Pralltriller; the short wavy line)        main – upper – main
//   mordent  (lower mordent; the wavy line crossed by a vertical stroke) main – lower – main
//   turn     (the S on its side, over the note)                        upper – main – lower – main
//   trill    (tr)                                                      from the upper note, upper – main …, ending on the main note

export type OrnKind = 'prall' | 'mordent' | 'turn' | 'trill';

/** One ornament sign: drawn on the head at `beat` (pitch `pitch`, written length `dur`); the notes inside [beat, beat + dur) of that hand are its realisation. */
export interface Ornament {
  beat: number;
  dur: number;
  hand: 'R' | 'L';
  /** The written (main) note. */
  pitch: number;
  kind: OrnKind;
}

/** VexFlow 4 ornament codes by the glyph drawn: 'mordent' is the plain short trill (no stroke), 'mordent_inverted' the stroked one. */
export const VF_ORNAMENT: Record<OrnKind, string> = { prall: 'mordent', mordent: 'mordent_inverted', turn: 'turn', trill: 'tr' };

export const ORN_NAME: Record<OrnKind, { en: string; he: string }> = {
  prall: { en: 'Upper mordent', he: 'מורדנט עליון' },
  mordent: { en: 'Mordent', he: 'מורדנט' },
  turn: { en: 'Turn', he: 'גרופטו' },
  trill: { en: 'Trill', he: 'טריל' },
};
/** How each sign is played, in words (the legend's fallback when no notes are given). */
export const ORN_HOW: Record<OrnKind, { en: string; he: string }> = {
  prall: { en: 'main – upper – main', he: 'ראשי – עליון – ראשי' },
  mordent: { en: 'main – lower – main', he: 'ראשי – תחתון – ראשי' },
  turn: { en: 'upper – main – lower – main', he: 'עליון – ראשי – תחתון – ראשי' },
  trill: { en: 'from the upper note, fast alternation', he: 'מהצליל העליון, החלפה מהירה' },
};

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

/**
 * The written-out notes of one ornament on a note of `dur` beats at `beat`: `upper` / `lower` are the neighbour notes
 * (the key's, or the one the score asks for), `short` the length of each quick note (default a quarter of the note,
 * at most a 16th in quarter-note beats: 0.25).
 */
export function realise(kind: OrnKind, beat: number, dur: number, main: number, upper: number, lower: number, short = Math.min(0.25, dur / 4)): { pitch: number; beat: number; dur: number }[] {
  const s = short;
  const at = (k: number) => r6(beat + k * s);
  switch (kind) {
    case 'prall':
      return [
        { pitch: main, beat: at(0), dur: s },
        { pitch: upper, beat: at(1), dur: s },
        { pitch: main, beat: at(2), dur: r6(dur - 2 * s) },
      ];
    case 'mordent':
      return [
        { pitch: main, beat: at(0), dur: s },
        { pitch: lower, beat: at(1), dur: s },
        { pitch: main, beat: at(2), dur: r6(dur - 2 * s) },
      ];
    case 'turn':
      return [
        { pitch: upper, beat: at(0), dur: s },
        { pitch: main, beat: at(1), dur: s },
        { pitch: lower, beat: at(2), dur: s },
        { pitch: main, beat: at(3), dur: r6(dur - 3 * s) },
      ];
    case 'trill': {
      // upper – main pairs in `s`, the last main held to the end (an even count of quick notes before it)
      const n = Math.max(2, Math.floor(dur / s) - 1);
      const k = n % 2 ? n - 1 : n;
      const out = Array.from({ length: k }, (_, j) => ({ pitch: j % 2 ? main : upper, beat: at(j), dur: s }));
      out.push({ pitch: main, beat: at(k), dur: r6(dur - k * s) });
      return out;
    }
  }
}

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A short realisation in note names ("C–B–C"), from the notes that sound inside the ornament (same hand). */
export function realisationNames(o: Ornament, notes: { pitch: number; beat: number; hand: 'R' | 'L' }[], name: (midi: number) => string = (m) => NAMES[((m % 12) + 12) % 12]): string {
  const ns = notes.filter((n) => n.hand === o.hand && n.beat >= o.beat - 1e-6 && n.beat < o.beat + o.dur - 1e-6).sort((a, b) => a.beat - b.beat);
  return ns.map((n) => name(n.pitch)).join('–');
}

/** One legend entry a kind (in order of first use): the name, and how its first use is played (note names). */
export function ornamentLegend(orns: Ornament[], notes: { pitch: number; beat: number; hand: 'R' | 'L' }[], lang: 'en' | 'he', name?: (midi: number) => string): { kind: OrnKind; name: string; how: string }[] {
  const seen = new Set<OrnKind>();
  const out: { kind: OrnKind; name: string; how: string }[] = [];
  for (const o of [...orns].sort((a, b) => a.beat - b.beat)) {
    if (seen.has(o.kind)) continue;
    seen.add(o.kind);
    out.push({ kind: o.kind, name: ORN_NAME[o.kind][lang], how: realisationNames(o, notes, name) || ORN_HOW[o.kind][lang] });
  }
  return out;
}

/** The realisation notes each sign stands for (indexes into `notes`), and whether every note inside a sign belongs to it. */
export function ornamentGroups<N extends { beat: number; hand: 'R' | 'L' }>(orns: Ornament[], notes: N[]): Map<Ornament, N[]> {
  const m = new Map<Ornament, N[]>();
  for (const o of orns) m.set(o, notes.filter((n) => n.hand === o.hand && n.beat >= o.beat - 1e-6 && n.beat < o.beat + o.dur - 1e-6));
  return m;
}
