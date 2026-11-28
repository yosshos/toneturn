// Proposed T0–T8 catalogues of docs/RESEARCH-TOP-TIERS.md (v13) and the §4.4 harness run.
// Run from the repo root: npx tsx scripts/top-tiers/prop.ts [runs=60] [set: piano8|guitar|bass|bass-now|guitar-now] [--counts]
import { daysPerTier, climb, quantile } from '../../src/engine/measure/sim';
import { perTierCounts, realCatalogues } from '../../src/engine/measure/sim/realCatalogue';
import type { AreaCatalogue } from '../../src/engine/measure/sim/catalogue';
// [id, min, max?] ; max => one exercise per tier min..max (nps rungs)
type R = [string, number, number?];
const mk = (name: string, rs: R[]): AreaCatalogue => {
  const m = new Map<string, any>();
  for (const [id, min, max] of rs) for (let t = min; t <= (max ?? min); t++) { const k = `${id}${max !== undefined ? '@T' + t : ''}`; m.set(k, { id: k, tier: t, keys: 12, available: true }); }
  return { name, exercises: [...m.values()], tempo: true };
};
const addTo = (base: AreaCatalogue, name: string, rs: R[], drop: string[] = []): AreaCatalogue => {
  const ex = base.exercises.filter((e) => !drop.some((d) => e.id === d || e.id.startsWith(d + '@')));
  const extra = mk(name, rs).exercises.filter((e) => !ex.some((x) => x.id === e.id));
  return { name, exercises: [...ex, ...extra], tempo: true };
};
const cur = (inst: 'piano' | 'guitar' | 'bass') => Object.fromEntries(realCatalogues(inst).map((c) => [c.name.split('/')[1], c]));
const P = cur('piano');
const S = (ns: string[], pre: string, t: number): R[] => ns.map((n): R => [`${pre}${n}`, t]);
export const piano: AreaCatalogue[] = [
  addTo(P.scales, 'piano/scales*', [['major:scales-10', 6, 8], ['major:aeolian:scales-33', 6, 8], ['minor:melodic:scales-33', 6, 8], ['minor:scales-36', 6, 8], ['major:modes:scales-32', 6, 8], ['major:scales-8', 4, 8], ['major:scales-14', 6, 8]], ['major:aeolian:scales-33', 'minor:melodic:scales-33', 'major:scales-8']),
  mk('piano/arpeggios*', [['major:arpeggios-8', 3, 5], ['major:arpeggios-3', 3, 5], ['major:arpeggios-10', 3, 6], ['minor:arpeggios-11', 3, 6], ['major:arpeggios-12', 4, 8], ['major:arpeggios-15', 4, 8], ['major:arpeggios-16', 4, 8], ['major:arpeggios-6', 4, 7], ['major:N3', 6, 8]]),
  addTo(P.harmony, 'piano/harmony*', [
    ['major:k-cadlib-1', 3], ['major:k-cadlib-2', 3], ['major:k-cadlib-3', 3],
    ['major:k-sharm-5', 3], ['aeol:k-sharm-5', 3], ['minor:k-sharm-6', 3], ['major:k-sharm-45', 3], ['minor:k-sharm-46', 3], ['major:k-sharm-47', 5], ['minor:k-sharm-48', 5], ['major:k-sharm-9', 3], ['aeol:k-sharm-9', 3], ['minor:k-sharm-10', 3], ['major:k-sharm-13', 4], ['aeol:k-sharm-13', 4], ['minor:k-sharm-14', 4], ['major:k-sharm-43', 4], ['minor:k-sharm-44', 4], ['major:k-sharm-15', 5], ['aeol:k-sharm-15', 5], ['minor:k-sharm-16', 5], ['mel:k-sharm-14', 5], ['major:k-dimcol-1', 5], ['k-harrisline-8', 5], ['mel:k-sharm-16', 6],
    ['harris:k-sharm-12', 6], ['k-harrisline-9', 6], ['harris:k-sharm-14', 6], ['harris:k-sharm-16', 6], ['harris:k-sharm-18', 6],
    ['major:k-sharm-17', 6], ['minor:k-sharm-18', 6], ['major:k-sharm-35', 6], ['major:k-sharm-19', 6], ['major:k-sharm-20', 6],
    ...S(['21', '22', '24', '25', '38', '33', '34', '37', '36'], 'major:k-sharm-', 7), ['minor:k-sharm-40', 7], ['split:k-sharm-41', 7], ['major:k-sharm-23:walk', 7], ['k-tpair-3', 7], ['major:k-cadlib-17', 7], ['major:k-cadlib-18', 7], ['major:k-cadlib-20', 7], ['major:k-cadlib-21', 7],
    ...S(['26', '39', '30', '31', '42'], 'major:k-sharm-', 8), ['major:k-sharm-23:context', 8], ['major:k-sharm-24:context', 8], ['major:k-sharm-25:context', 8], ['minor:k-sharm-32:voicings', 8], ['major:k-cadlib-22', 8], ['major:k-reharm-8', 8], ['major:k-reharm-4', 8]]),
  addTo(P.independence, 'piano/independence*', [['k-indep-4', 4], ['fingers-8', 4], ['k-indep-8', 6], ['fingers-10', 6], ['advanced-3', 7], ['advanced-6', 7], ['advanced-8', 7], ['fingers-13', 7], ['sp37-r5', 7], ['N15', 7, 8], ['rh-line-lh-walk', 8], ['poly-figures', 8]]),
  mk('piano/line-jazz*', [['harris-1', 5], ['k-tpair-1', 5], ['k-modes-3', 5], ['harris-6', 5], ['k-bebop-1', 5], ['m:k-bebop-2', 5], ['k-bebop-3', 5], ['k-harrisline-2', 5], ['k-harrisline-3', 5], ['k-harrisline-4', 5], ['k-harrisline-6', 5], ['k-harrisline-7', 5],
    ['k-tpair-2', 6], ['m6dim:scales-31', 6], ['harris-26', 6], ['k-bebop-4', 6], ['k-bebop-5', 6], ...S(['11'], 'k-harrisline-', 6), ['m:k-harrisline-15', 6], ...S(['13', '33', '12'], 'k-harrisline-', 6), ['m:k-harrisline-16', 6], ...S(['10', '14'], 'k-harrisline-', 6),
    ...S(['19', '20', '21', '25', '18'], 'k-harrisline-', 7), ['harris-15', 7], ['k-tpair-5', 7], ['k-tpair-4', 7], ['harris-19', 7], ['harris-20', 7], ['k-bebop-6', 7], ['k-bebop-7', 7],
    ['k-hlfast-1', 8], ['k-hlfast-2', 8], ['k-hlfast-3', 8], ['k-hlfast-4', 8], ['k-sharm-27', 8], ['k-sharm-28', 8], ['k-sharm-29', 8], ['m:k-sharm-32:lines', 8], ['harris-21', 8], ['harris-17', 8], ['harris-18', 8], ['harris-16', 8], ['k-tpair-11', 8], ['m:k-tpair-14', 8], ['harris-22', 8], ['harris-23', 8], ['harris-24', 8], ['k-harrisline-30', 8], ['k-harrisline-35', 8], ['k-harrisline-34', 8], ['k-harrisline-28', 8], ['comp-solo', 8], ['k-bebop-9', 8]]),
];
export const guitar: AreaCatalogue[] = [
  mk('guitar/scales*', [['m:g-scales-1', 1, 3], ['g-scales-3', 1, 4], ['g-scales-12', 2, 3], ['g-harm-1', 2, 4], ['g-scales-4', 3, 5], ['m:g-scales-2', 3, 5], ['g-scales-5', 4, 6], ['g-scales-8', 4, 6], ['aeol:g-scales-13', 4, 6], ['m:harm:g-scales-13', 4, 6],
    ['g-picking-3', 5, 7], ['dor:g-scales-14', 5, 7], ['mix:g-scales-14', 5, 7], ['aeol:g-scales-16', 5, 8], ['m:g-scales-17', 5, 8], ['g-scales-11', 5, 8],
    ['lyd:g-scales-15', 6, 8], ['phr:g-scales-15', 6, 8], ['m:mel:g-scales-15', 6, 8], ['m:mel:g-scales-18', 6, 8], ['g-scales-9', 6, 8], ['g-scales-6', 6, 8],
    ['g-scales-10', 7, 8], ['loc:g-scales-7', 7, 8], ['g-scales-19', 7, 8], ['g-scales-20', 7, 8], ['g-scales-21dim', 7, 8], ['g-speed-1', 8]]),
  mk('guitar/arpeggios*', [['g-arps-1', 2, 4], ['m:g-arps-1', 2, 4], ['g-arps-2', 3, 5], ['g-arps-3', 4, 6], ['g-arps-4', 4, 6],
    ['g-arps-6', 5, 8], ['g-arps-7', 7, 8], ['g-arps-5', 7, 8], ['g-speed-3', 8], ['g-speed-4', 8]]),
  mk('guitar/harmony*', [['g-jblues-2', 2], ['g-jblues-3', 2], ['g-jblues-4', 2], ['g-harm-2', 3], ['g-jazz-1', 3], ['m:g-harm-2', 4], ['aeol:g-harm-2', 4], ['g-vl-1', 3], ['g-harm-4', 4], ['m:g-harm-4', 4], ['aeol:g-harm-4', 4], ['g-harm-3', 4], ['m:g-harm-3', 4], ['g-harm-15', 4], ['m:g-harm-15', 4],
    ['g-harm-6', 5], ['m:g-harm-6', 5], ['aeol:g-harm-6', 5], ['dor:g-harm-6', 5], ['mix:g-harm-6', 5], ['g-cadlib-1', 5], ['m:g-cadlib-1', 5], ['g-harm-5', 5], ['g-vl-2', 5],
    ['lyd:g-harm-6', 6], ['phr:g-harm-6', 6], ['g-harm-14', 6], ['m:g-harm-14', 6], ['g-harm-16', 6], ['m:g-harm-16', 6], ['g-tpair-1', 6], ['g-vl-3', 6], ['g-harrisline-8', 6], ['mel:g-harm-2', 6], ['mel:g-harm-4', 6], ['mel:g-harm-6', 6], ['g-cadlib-2', 6], ['g-cadlib-3', 6], ['g-cadlib-4', 6], ['m:g-cadlib-4', 6], ['g-cadlib-5', 6], ['g-harm-7', 6], ['g-harris-2', 6],
    ['loc:g-harm-6', 7], ['g-cadlib-6', 7], ['g-cadlib-7', 7], ['g-cadlib-8', 7], ['g-cadlib-9', 7], ['g-harm-8', 7], ['g-harm-9', 7], ['g-harm-10', 7], ['g-harm-11', 7], ['g-harm-13', 7], ['g-harm-12:walk', 7], ['g-harris-13:borrow', 7], ['g-harris-7', 7],
    ['g-cadlib-10', 8], ['g-harm-12:context', 8], ['g-harm-13:context', 8], ['g-solojazz-2', 8], ['g-solojazz-3', 8], ['g-harris-11', 8], ['g-harris-12:voicings', 8], ['g-harris-13', 8], ['g-solojazz-1', 8], ['g-tpair-5', 8]]),
  mk('guitar/independence*', [['g-picking-1', 1], ['g-fretting-1', 1], ['g-legato-1', 2], ['g-legato-2', 2], ['g-fretting-2', 2], ['g-fretting-3', 2], ['g-picking-2', 2], ['g-fretting-4', 3], ['g-legato-3', 3], ['new:two-string-picking-seq', 3],
    ['g-picking-4', 4], ['g-legato-4', 4], ['g-fretting-6', 4], ['g-fretting-5', 5], ['g-picking-10', 5], ['new:legato-seq-8ths', 5], ['g-legato-5', 6], ['new:picked-seq-8ths', 6], ['g-legato-7', 7], ['new:legato-seq-16', 7], ['new:picked-seq-16', 7],
    ['g-speed-2', 8], ['g-speed-5', 8], ['g-fusion-2', 8]]),
  mk('guitar/line-jazz*', [['g-harris-1', 5], ['g-harrisline-10', 5], ['g-harrisline-3', 5], ['g-jazz-5', 5], ['g-bebop-6', 5], ['g-tpair-2', 6], ['g-harrisline-1', 6], ['g-harrisline-2', 6], ['g-harrisline-4', 6], ['g-harris-3', 6],
    ['g-scales-21bebop', 7], ['g-harrisline-6', 7], ['g-tpair-3', 7], ['g-tpair-4', 7], ['g-harris-4', 7], ['g-harris-8', 7], ['g-harris-9', 7], ['g-harris-5', 7],
    ['g-harrisline-7', 8], ['g-tpair-6', 8], ['m:g-tpair-7', 8], ['g-harris-10', 8], ['g-hlfast-1', 8], ['g-hlfast-2', 8], ['g-hlfast-3', 8], ['g-hlfast-4', 8], ['g-fusion-1', 8], ['g-harris-6', 8], ['g-harris-12:lines', 8], ['g-fusion-3', 8], ['g-fusion-4', 8], ['g-fusion-5', 8]]),
];
export const bass: AreaCatalogue[] = [
  mk('bass/scales*', [
    ['b-scale-2', 0], ['b-scale-2@T2', 2], ['b-scale-2@T3', 3], ['b-scale-2@T5', 5], ['m:penta', 0], ['m:penta@T2', 2], ['m:penta@T3', 3], ['m:penta@T5', 5], ['b-fret-1', 0], ['b-fret-2', 0], ['b-legato-1', 0],
    ['m:natmin', 1], ['m:natmin@T2', 2], ['m:natmin@T3', 3], ['m:natmin@T5', 5], ['M:penta', 1], ['M:penta@T2', 2], ['M:penta@T3', 3], ['b-fret-3', 1], ['b-legato-2', 1],
    ['blues', 2], ['blues@T3', 3], ['blues@T5', 5], ['b-pluck-4', 2], ['b-fret-4', 2], ['b-pluck-5', 2],
    ['4ths', 3], ['b-fret-7', 3], ['b-pluck-6', 3], ['b-pluck-10', 3],
    ['m:harm b-scale-7', 4], ['m:harm@T5', 5], ['b-fret-8', 4], ['b-pluck-7', 4], ['b-pluck-11', 4], ['b-fret-6', 4],
    ['dor', 5], ['mix', 5], ['m:b-scale-10', 5], ['m:b-scale-5', 5], ['b-barry-1', 5], ['b-barry-3', 5], ['b-tpair-1', 5], ['b-harrisline-10', 5],
    ['lyd', 6], ['phr', 6], ['m:mel b-scale-7', 6], ['b-fret-5', 6], ['b-tpair-2', 6], ['b-barry-7', 6], ['b-barry-8', 6], ['b-harrisline-1', 6], ['b-harrisline-3', 6], ['b-harrisline-4', 6],
    ['V:b-scale-9', 7], ['m:b-scale-12nat', 7], ['V:b-scale-13', 7], ['b-harrisline-2', 7], ['b-harrisline-6', 7], ['b-harrisline-7', 7], ['b-barry-5', 7], ['b-barry-6', 7], ['b-tpair-3', 7], ['b-tpair-4', 7],
    ['b-scale-14', 8], ['b-scale-15', 8], ['m:b-scale-12harm-mel', 8], ['m:b-tpair-5', 8], ['b-hlfast-1', 8], ['b-hlfast-2', 8], ['b-hlfast-3', 8],
    ['b-fret-5@T8', 8], ['lyd@T8', 8], ['phr@T8', 8], ['m:mel@T8', 8], ['V:b-scale-9@T8', 8], ['m:b-scale-12nat@T8', 8]]),
  mk('bass/arpeggios*', [
    ['b-chord-2', 0], ['b-chord-3', 0], ['b-chord-4', 0], ['m:b-chord-4', 0],
    ['b-scale-6 3rds', 1], ['b-chord-5:1', 1], ['b-chord-5:2', 1],
    ['b-chord-4@T2', 2], ['m:b-chord-4@T2', 2], ['b-chord-6:7', 2], ['b-chord-5:1@T2', 2], ['b-chord-5:2@T2', 2],
    ['b-chord-4@T3', 3], ['m:b-chord-4@T3', 3], ['b-chord-6:7@T3', 3], ['b-chord-5:1@T3', 3], ['b-chord-5:2@T3', 3], ['b-chord-17', 3],
    ['b-chord-6:maj7', 4], ['b-chord-6:m7', 4], ['b-chord-7', 4], ['b-chord-11', 4], ['m:b-chord-17', 4],
    ['b-chord-6:m7b5', 5], ['b-chord-6:dim7', 5], ['b-chord-15', 5], ['m:b-chord-16nat', 5], ['m:b-chord-16harm', 5], ['b-chord-11@T5', 5], ['b-chord-14', 5], ['b-chord-7@T5', 5],
    ['b-chord-12:maj9', 6], ['b-chord-12:m9', 6], ['b-chord-12:9', 6], ['b-chord-18', 6], ['m:b-chord-18', 6],
    ['b-chord-13:7#5', 7], ['b-chord-13:7b5', 7], ['b-chord-13:7#9', 7], ['b-chord-13:7b9', 7],
    ['b-chord-11@T8', 8], ['b-chord-12:maj9@T8', 8], ['b-chord-12:m9@T8', 8], ['b-chord-12:9@T8', 8], ['b-chord-13:7#5@T8', 8], ['b-chord-13:7b5@T8', 8], ['b-chord-13:7#9@T8', 8], ['b-chord-13:7b9@T8', 8]]),
  mk('bass/walking*', [
    ['b-chord-1', 0], ['b-walk-1', 0], ['b-walk-2', 0], ['b-chord-8', 1], ['b-walk-21', 1], ['b-walk-3', 1],
    ['b-chord-9', 2], ['b-walk-4', 2], ['b-walk-5', 2], ['b-chord-10', 2], ['b-walk-6', 3], ['b-walk-7', 3], ['b-walk-8', 3],
    ['b-cadlib-1', 4], ['m:b-cadlib-1', 4], ['b-walk-14', 4], ['b-harrisline-8', 4], ['b-cadlib-3', 5], ['m:b-cadlib-3', 5], ['b-barry-4', 5], ['b-walk-19', 5],
    ['b-cadlib-2', 6], ['b-cadlib-4', 6], ['b-walk-10', 6], ['b-barry-2', 6], ['b-walk-20', 6], ['b-cadlib-5', 7], ['b-cadlib-6', 7], ['b-walk-11', 7], ['b-walk-13', 7], ['b-walk-16', 7],
    ['duo-iiVI', 8], ['duo-forms', 8], ['b-walk-18', 8]]),
];
const runs = +(process.argv[2] ?? 60), seed = 20261127 + 30;
const sets: [string, AreaCatalogue[]][] = [['piano8', piano],['bass-now', realCatalogues('bass')], ['bass', bass], ['guitar-now', realCatalogues('guitar')], ['guitar', guitar], ['piano', piano]];
const only = process.argv[3];
for (const [nm, cats] of sets) {
  if (only && nm !== only) continue;
  for (const cat of cats) {
    const line: string[] = [cat.name, perTierCounts(cat).join(' ')];
    if (!process.argv.includes('--counts')) {
      for (const [p, d] of [[0.75, 3], [0.85, 5]] as const) {
        const tt = daysPerTier(cat, p, d, runs, seed);
        line.push(`p${p}/${d}d: ` + tt.map((t) => `${t.from === null ? '-' : 'T' + t.from}>T${t.to} ${t.median}${t.reached < 1 ? `(${(100 * t.reached).toFixed(0)}%)` : ''}`).join(', ') + ` | med ${quantile(tt.map((t) => t.median), 0.5)}`);
      }
      const c = climb(cat, runs, seed + 30);
      line.push(`climb: target T${c.target} reached ${(100 * c.reachedTarget).toFixed(0)}% med ${c.medianDaysToTarget}d, all ${(100 * c.reachedAll).toFixed(0)}%, stalls ${c.stalls}, worst ${c.worstStall}d (T${c.worstStallTier ?? '-'})`);
    }
    console.log(line.join('\n   '));
  }
}
