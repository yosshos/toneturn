// The chord chart's cells (COURSE-FEEDBACK-UI §4.7, slice 8). Pure: one cell a bar — the chord, whether the band or
// the player has the bar, the target note a rule asks for ("→ E", before the take), and after the take the bar's result:
// a corner tab (teal ✓ kept; pink with the numbers of the rules broken there) and the note really landed on.

import type { Drill, TakeMetrics } from './types';
import { TARGET_CARDS, autoScale, targetPcs } from '../ruleCards';
import { MODE_STEPS } from '../modes';

const PC = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A pitch-class name (flats but F♯; the cell is tiny, so no key-aware spelling). */
export const pcName = (pc: number): string => PC[((pc % 12) + 12) % 12];
/** A chord symbol with real accidentals (B♭7, F♯m7♭5). */
export const prettyChord = (c: string): string => c.replace(/([A-G])b/g, '$1♭').replace(/([A-G])#/g, '$1♯').replace(/b(\d)/g, '♭$1').replace(/#(\d)/g, '♯$1');

export interface ChartCell {
  /** The bar's chord symbol (null / '' = the same as before: '%'; absent = no chord shown). */
  chord?: string | null;
  /** Ear and trading items: the band's bar (listen) or the player's. */
  role?: 'band' | 'you';
  /** The note a target rule asks for in this bar (shown before the take). */
  target?: string;
  /** After the take: kept (ok) or broken (bad), with the 1-based numbers of the rules broken in this bar. */
  tab?: { kind: 'ok' | 'bad' | 'changed'; rules: number[] };
  /** After the take, target rules: the note landed on at the bar's change, and whether it was a target. */
  landed?: { name: string; hit: boolean } | null;
  /** While the take runs: a dot per note played in the bar (chord tone / tension / outside). */
  dots?: NoteRole[];
  /** A small line under the chord (the chart player's bar scale). */
  note?: string;
  /** The note was chosen by the player (a bar scale set by hand), not the default. */
  noteSet?: boolean;
}

/** The band's bars of an ear / trading item (its listen windows). */
const bandBar = (drill: Drill, bar: number): boolean => {
  const meter = drill.meter || 4;
  return (drill.listen?.windows ?? []).some(([a, b]) => bar * meter >= a - 1e-6 && bar * meter < b - 1e-6);
};

/** Per bar, the target notes of a target card at the bar's first change ('F/C': the 3rd / the 7th), else null. */
export function barTargets(drill: Drill): (string | null)[] {
  const g = drill.goal.improv;
  const want = g?.cards.map((c) => TARGET_CARDS[c]).find(Boolean);
  const meter = drill.meter || 4;
  const n = drill.chart?.length ?? Math.ceil(drill.beats / meter - 1e-6);
  const out: (string | null)[] = Array.from({ length: n }, () => null);
  if (!g || !want) return out;
  g.spans.forEach((s, i) => {
    const prev = g.spans[i - 1];
    if (prev && prev.root === s.root && prev.iv.join() === s.iv.join()) return;
    const bar = Math.floor(s.at / meter + 1e-6);
    if (bar < n && out[bar] === null) out[bar] = targetPcs(s, want).map(pcName).join('/') || pcName(s.root);
  });
  return out;
}

/** The chart's cells for a drill, with the take's per-bar result when there is one. */
export function chartCells(drill: Drill, m?: Pick<TakeMetrics, 'improv' | 'landings'> | null): ChartCell[] {
  const chart = drill.chart ?? [];
  const targets = barTargets(drill);
  const cards = drill.goal.improv?.cards ?? [];
  return chart.map((chord, i) => {
    const role = drill.listen ? (bandBar(drill, i) ? 'band' : 'you') : undefined;
    const cell: ChartCell = { chord, ...(role ? { role } : {}) };
    if (role !== 'band' && targets[i]) cell.target = targets[i]!;
    if (m && role !== 'band' && cards.length) {
      const rules = (m.improv ?? []).filter((c) => c.bars?.includes(i)).map((c) => cards.indexOf(c.card) + 1).filter((k) => k > 0);
      const land = m.landings?.find((l) => l.bar === i);
      if (land) cell.landed = land.landed === null ? null : { name: pcName(land.landed), hit: land.hit };
      const judged = rules.length > 0 || !!land || (m.improv ?? []).some((c) => c.total > 0);
      if (judged) cell.tab = { kind: rules.length ? 'bad' : 'ok', rules };
    }
    return cell;
  });
}

// ───────────────────────────── note roles (§4.7, live) ─────────────────────────────

/** A played note against the chord sounding: a chord tone, a tension (in the chord's usual scale), or outside it. */
export type NoteRole = 'chord' | 'tension' | 'outside';

/**
 * The role of a pitch over a chord (root pitch class, intervals above it): a chord tone; else a note of the chord's
 * usual chord-scale (ruleCards.autoScale, the engine's own default: dorian on a minor 7th, mixolydian on a dominant,
 * and so on) is a tension; anything else is outside.
 */
export function noteRole(pitch: number, span: { root: number; iv: number[] }): NoteRole {
  const rel = (((pitch - span.root) % 12) + 12) % 12;
  if (span.iv.some((x) => ((x % 12) + 12) % 12 === rel)) return 'chord';
  return MODE_STEPS[autoScale(span.iv)].some((x) => x % 12 === rel) ? 'tension' : 'outside';
}

/** Dots shown under a bar at most (the last ones played). */
export const ROLE_DOTS = 6;

/**
 * Note-role dots per bar (rule-card items, `goal.improv`): each improvised note played so far, by the bar it fell in,
 * against the chord sounding at its beat. Bars with nothing played are empty.
 */
export function noteRoles(drill: Drill, notes: { beat: number; midi: number }[]): NoteRole[][] {
  const g = drill.goal.improv;
  const meter = drill.meter || 4;
  const n = drill.chart?.length ?? Math.ceil(drill.beats / meter - 1e-6);
  const out: NoteRole[][] = Array.from({ length: n }, () => []);
  if (!g?.spans.length) return out;
  for (const x of notes) {
    const bar = Math.floor(x.beat / meter + 1e-6);
    if (bar < 0 || bar >= n) continue;
    const span = g.spans.find((s) => x.beat >= s.at - 1e-6 && x.beat < s.at + s.beats - 1e-6) ?? [...g.spans].reverse().find((s) => s.at <= x.beat + 1e-6);
    if (!span) continue;
    out[bar].push(noteRole(x.midi, span));
  }
  return out.map((r) => r.slice(-ROLE_DOTS));
}

/** "Rules kept 6/8 bars": the player's bars with a result, and how many kept every rule. */
export function rulesKept(cells: ChartCell[]): { kept: number; of: number } | null {
  const judged = cells.filter((c) => c.tab && c.tab.kind !== 'changed');
  return judged.length ? { kept: judged.filter((c) => c.tab!.kind === 'ok').length, of: judged.length } : null;
}
