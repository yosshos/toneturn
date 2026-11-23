// "Use it in improvisation" (SPEC-LICKS-IN-IMPROV §5, phase 4): from a lick's page, a chart that has its context — the
// lick's own progression in a key, cycled — and the standards (Repertoire's charts) where its progression appears.
// Pure.

import { parseChart, type ChartStyle } from './charts';
import { lickBandStyle, lickChart, lickTempos, type Lick } from './licks';
import { spansOfChart } from './ruleCards';
import { lickFits } from './vocab';
import { STANDARD_CHANGES } from './standards';
import type { RuleSet } from './improvRules';

/** The rules of a chart opened for today's lick. */
export const TODAYS_LICK_RULES: RuleSet = { note: null, interval: null, rhythm: null, shape: null, vocab: 'todays-lick', extra: null };

/** The lick's progression in a key, repeated to at least 8 bars (with an empty bar of the last chord between rounds). */
export function lickImprovChart(l: Lick, key: number): { text: string; style: ChartStyle; bpm: number; bars: number } {
  const one = lickChart(l, key);
  const round = one.length % 2 ? [...one, '%'] : one;
  const reps = Math.max(2, Math.ceil(8 / Math.max(1, round.length)));
  const bars = Array.from({ length: reps }, () => round).flat();
  return { text: bars.join(' | '), style: lickBandStyle(l), bpm: Math.max(72, Math.min(160, lickTempos(l)[1])), bars: bars.length };
}

/** Standards whose changes carry the lick's progression: the bars where it fits (1-based) and the key it is in there. */
export function lickInRepertoire(l: Lick, max = 4): { id: string; name: string; part: { en: string; he: string }; bars: number[]; key: number }[] {
  const out: { id: string; name: string; part: { en: string; he: string }; bars: number[]; key: number }[] = [];
  for (const s of STANDARD_CHANGES) {
    if (s.style === 'waltz') continue;
    const p = parseChart(s.text, 4);
    if (p.errors.length || !p.chords.length) continue;
    const fits = lickFits(l, spansOfChart(p, 4, p.bars));
    if (!fits.length) continue;
    out.push({ id: s.id, name: s.name, part: s.part, bars: [...new Set(fits.map((f) => Math.floor(f.at / 4 + 1e-6) + 1))], key: fits[0].key });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The piece page's "Improvise on it" (SPEC-LICKS-IN-IMPROV §5.3): the licks of mine that fit this chart's progression —
 * where (1-based bars) and in which key; today's lick first if it fits, then by the number of places. Approach cells fit
 * everywhere and are not listed.
 */
export function licksThatFit(pool: Lick[], text: string, o: { today?: string | null; max?: number } = {}): { lick: Lick; bars: number[]; key: number }[] {
  const p = parseChart(text, 4);
  if (p.errors.length || !p.chords.length) return [];
  const spans = spansOfChart(p, 4, p.bars);
  const out = pool
    .filter((l) => !l.cell)
    .map((l) => ({ l, fits: lickFits(l, spans) }))
    .filter((x) => x.fits.length > 0)
    .map((x) => ({ lick: x.l, bars: [...new Set(x.fits.map((f) => Math.floor(f.at / 4 + 1e-6) + 1))], key: x.fits[0].key }));
  out.sort((a, b) => Number(b.lick.id === o.today) - Number(a.lick.id === o.today) || b.bars.length - a.bars.length);
  return out.slice(0, o.max ?? 3);
}
