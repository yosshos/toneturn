// Shared by the b-walk standards (bass.ts) and the standards ladder (bassNiche2.ts).
import type { BassGoal } from './types';
import type { BN } from './bass';
import { ruleCheck } from './bassAnalyze';

const pc = (x: number) => ((x % 12) + 12) % 12;

/**
 * The band's walker (band.ts) is seeded and now and then picks a tension the rules don't take (a ♭9 on a m7♭5): try a
 * few seeds and keep the first line that keeps its own rules (deterministic, so the item never changes).
 */
export function ruleSafe(make: (seed: number) => BN[], rules: NonNullable<BassGoal['rules']>, meter: number): BN[] {
  const best: BN[] = make(0);
  const ok = (line: BN[]) => {
    const rep = ruleCheck(rules.kind, rules.chart, line.map((n) => ({ pitch: n.p, beat: n.b })), meter, 4);
    return { good: rep.validShare === 1 && rep.beat1Ct >= 0.9, valid: rep.valid };
  };
  for (let k = 0; k < 8; k++) {
    const line = k ? make(k) : best;
    if (ok(line).good) return line;
  }
  // Safety net: the walker used to treat a 6th chord as a 7th (an F on Gm6; fixed in band.ts walkScale, 2026-11-12).
  // If a line still breaks a rule, move each note the rules refuse to the nearest chord tone of its chord (never the
  // same pitch as the note before).
  const total = rules.chart.reduce((a, c) => a + c.beats, 0);
  const chordAt = (beat: number) => {
    let t = ((beat % total) + total) % total;
    for (const c of rules.chart) {
      if (t < c.beats - 1e-6) return c;
      t -= c.beats;
    }
    return rules.chart[rules.chart.length - 1];
  };
  const { valid } = ok(best);
  return best.map((n, i) => {
    if (valid[i]) return n;
    const c = chordAt(n.b);
    const prev = best[i - 1]?.p;
    const cand = [-2, -1, 1, 2, -3, 3, -4, 4].map((d) => n.p + d).filter((p) => p >= 28 && c.tones.includes(pc(p - c.root)) && p !== prev);
    return cand.length ? { ...n, p: cand[0] } : n;
  });
}
