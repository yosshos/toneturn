// §1.5 area guard prototype for docs/RESEARCH-TOP-TIERS.md. Run from the repo root: npx tsx scripts/top-tiers/guard.ts
// Strict prototype of the §1.5 table: an exact (family, kind) list; options only where the table names them. No patterns,
// except the data part of chart kinds (the cadence id), which is matched as "anything" while the voicing part is closed.
import { catalog } from '../../src/engine/drills/generate';
import { guitarCatalog } from '../../src/engine/drills/guitar';

const W = (s: string) => s.split(/\s+/).filter(Boolean);
const HSTEP = W('hl-3b hl-3t hl-ta hl-tb hl-7a hl-7b hl-d2 hl-d3 hl-d24 hl-ti hl-c4 hl-9a');
const BW = W('bw-chord bw-chord-d2 bw-chord-d3 bw-iivi bw-iivi-d2 bw-iivi-d3 bw-one bw-one-d2 bw-one-d3 bw-out bw-root bw-scale bw-scale-d2 bw-scale-d3 bw-std bw-std-d3 bw-three bw-two bw-two-d2 bw-two-d3 bw-walk bw-walk-d2 bw-walk-d3');
const SH_HARM = [...HSTEP, ...BW, ...W('cm-expand v7-d2 vl-ladder sf-voice sf-comp sf-borrow sixth5 mv-first mv-next mv-mmm shell4 tm-res sub-tune')];
const HL = W('hl-3b9 hl-abc hl-chrom hl-chrom2 hl-eight hl-imp-arps hl-imp-scale hl-misc hl-outline hl-rules hl-sevendown hl-triplet');
type T = Record<string, string>;
const m = (area: string, kinds: string[]): T => Object.fromEntries(kinds.map((k) => [k, area]));
const TABLE: Record<string, T> = {
  'b-walk': m('walking', W('arpwalk blues-chrom blues-waltz chrom cycle dom free lowb r5walk rhythm scaleapp sight-impro skips solo standard two-feel two-four waltz')),
  'b-chord': { ...m('walking', W('roots ctline nearest slash')), ...m('arpeggios', W('r5 r58 triad inv sev arp2 arp7x2 arp9 arpalt')), ...m('arp-nomax', W('dia7 dia9 dia1235 hichords')) },
  'k-sharm': { ...m('harmony', SH_HARM), 'hl-line': 'scales', 'sf-line': 'line', 'sf-minor': 'OPT' },
  'g-harm': { ...m('harmony', SH_HARM), 'hl-line': 'scales' },
  'g-harris': { ...m('harmony', [...SH_HARM, 'sixdim-chords', 'sixdim-sets']), 'sf-line': 'line', 'sf-minor': 'OPT', ...m('line', W('sixdim-scale dom-scale triads-3to9 enclosure brothers pivot-arp scale-pivot pivot-encl')) },
  'k-harrisline': { ...m('line', HL), ...m('harmony', W('hl-upbeat hl-ands')) },
  'g-harrisline': { ...m('line', HL.filter((k) => k !== 'hl-chrom2')), 'hl-upbeat': 'harmony' },
  'b-harrisline': { ...m('line', HL.filter((k) => k !== 'hl-chrom2')), 'hl-walkties': 'walking' },
  'g-hlfast': m('line', W('g-harrisline>hl-3b9 g-harrisline>hl-chrom g-harrisline>hl-outline g-harrisline>hl-rules g-harrisline>hl-sevendown g-harrisline>hl-triplet')),
  harris: { 'h7-line': 'coverage', ...m('line', W('h1-linear h2-dominant h6-approach h8-brothers h11-arp-scale h14-rules h15-iivi h16-chains h17-chromatic h18-sixfive h19-pivot h20-pivotrot h21-pivotiivi h22-scalepivot h23-pivotencl')), ...m('harmony', W('h3-triads h4-chords h5-pivots h9-sixdim h10-minor6dim h13-dimmoves')) },
  'b-barry': { ...m('line', W('sixdim halfstep pivot bebop pivot-arp scale-pivot')), walk13: 'walking', dimpass: 'walking' },
  'k-tpair': { ...m('line', W('tpk-pat tpk-vamp tpk-iivi tpk-blues tpk-slip tpk-form tpk-sym')), ...m('harmony', W('tpk-close tpk-spread tpk-block tpk-comp')) },
  'g-tpair': { ...m('line', W('gtp-line gtp-hex gtp-iivi gtp-slip')), ...m('harmony', W('gtp-shapes gtp-comp')) },
  'b-tpair': m('line', W('btp-arp btp-blues btp-iivi btp-inv btp-slip')),
  'g-bebop': { ...m('line', W('v-3b9 v-digit v-lead v-line v-minor v-trip')), 'v-time': 'rhythm' },
  'k-bebop': { ...m('line', W('bb-251 bb-alt bb-blues bb-form bb-hands bb-matrix bb-minor bb-rhythm bb-standard')), 'bb-trade': 'coverage' },
  'g-fusion': { ...m('line', W('fu-slip fu-pair fu-vamp g-prog>fusion')), 'fu-4nps': 'independence' },
  'g-jazz': { ...m('harmony', W('chord-melody comp comp-chart comp-std drop2 drop3 harmonized iivi-drop2 octaves rhythm-changes shells solo-texture vl-ear')), 'guide-tones': 'line', walking: 'coverage' },
  'k-dimcol': { ...m('harmony', W('dc-lower dc-raise dc-whole dc-two')), 'dc-run': 'line' },
  'k-reharm': m('harmony', W('rh-altered rh-approach rh-ballad rh-borrowed rh-chains rh-dev rh-maj7s5 rh-mi rh-minor rh-modal rh-modern rh-pedal rh-pedalpt rh-planemel rh-planing rh-reharm rh-slip rh-solo rh-sus')),
  cadences: m('harmony', W('cadence-1 cadence-64 cadence-aug6 cadence-circle cadence-deceptive cadence-ii6 cadence-n6 cadence-picardy cadence-plagal cadence-vofv')),
  'g-vl': m('harmony', W('gvl-drop2 gvl-drop3 gvl-triads')),
  'g-solojazz': { ...m('harmony', W('g-jazz>solo-texture sj-blues sj-rhythm')), 'sj-head': 'coverage' },
  'g-jblues': { ...m('harmony', W('blues-comp blues-guide blues-shells')), 'blues-head': 'coverage' },
  arpeggios: { ...m('arpeggios', W('arp-dim7 arp-dom7 arp-hd7 arp-m7 arp-maj7 arp-triad broken')), blocked: 'harmony' },
  'g-arps': m('arpeggios', W('triad caged-arp caged7 inversions seventh ext-arp ust iivi-arp')),
  'g-speed': { ...m('arpeggios', W('g-picking>sweep3 g-picking>sweep5 g-legato>tap')), ...m('scales', W('g-picking>3nps g-picking>3nps-economy')), ...m('independence', W('g-legato>3nps-legato g-picking>skip g-picking>tremolo')) },
  scales: m('SCALE', W('scale jscale')),
  'k-modes': m('MODE', W('mode mode-der mode-par')),
  'g-scales': m('GSCALE', W('3nps 3nps-neck blues caged caged-connect caged-minor interval-seq interval-shapes mode one-string penta segovia seq-g3 seq3 seq4')),
  'b-scale': m('BSCALE', W('nps3 penta-pos penta5 scale scale2 seq')),
  control: m('scales', W('balance melody-alberti pedal reading scale voicing')),
  'g-picking': { ...m('scales', W('3nps 3nps-economy')), ...m('arpeggios', W('sweep3 sweep5 sweep7')), ...m('independence', W('banjo chicken cross fusion-pick hybrid hybrid-riff pedal single-string skip tremolo')) },
  'b-fret': m('scales', W('2oct oct10 one-string simandl spider stretch upper')),
  'b-pluck': m('scales', W('accent16 cross gallop ima open rake skip skip2 stamina thumb zone')),
  'b-legato': m('scales', W('harm hp legline octslide pedal slide vib')),
  fingers: m('independence', W('arp-dim7 arp-dom7 arp-triad five hanon hanon-1 hanon-style held ornament rep-chords repeated rotation scale thumb-under trill velocity')),
  advanced: m('independence', W('double-notes leaps octaves polyrhythm')),
  'k-indep': m('independence', W('ind-all ind-dyn ind-hold ind-ostinato ind-poly ind-touch ind-voices')),
  'k-keyx': m('independence', W('kx-boct kx-canon kx-leap kx-ost kx-ost3 kx-stride kx-waltz')),
  'g-fretting': m('independence', W('cross spider stretch walk')),
  'g-legato': { ...m('independence', W('3nps-legato hammer legato-shift penta-legato pull tap tap8 trill')), 'tap-arp': 'arpeggios' },
};
const CHART: Record<string, [RegExp, string]> = {
  'k-cadlib': [/^chart~[^~]+~(barron|close4|drop2|drop3|guide|rootless|shell|sowhat1|sowhat2|stride-tenth|two-hand|walk-lh)~(whole|charleston|four)~comp$/, 'harmony'],
  'g-cadlib': [/^cad~[^~]+~(drop2|drop3|rootless|shell)$/, 'harmony'],
  'b-cadlib': [/^cad~[^~]+~(approach|walk|pedal)$/, 'walking'],
};
function area(fam: string, kind: string, opt: number, scale?: string): string | null {
  const c = CHART[fam];
  if (c) return c[0].test(kind) ? c[1] : null;
  const a = TABLE[fam]?.[kind];
  if (!a) return null;
  if (a === 'OPT') return opt === 1 ? 'line' : 'harmony';
  if (a === 'SCALE') return ['six-dim', 'six-dim-m', 'bebop-dom'].includes(scale ?? '') ? 'line' : 'scales';
  if (a === 'MODE') return kind === 'mode' && opt === 7 ? 'line' : 'scales';
  if (a === 'GSCALE') return kind === 'mode' && opt === 24 ? 'line' : 'scales';
  if (a === 'BSCALE') return kind === 'scale' && opt === 27 ? 'line' : kind === 'seq' && opt === 0 ? 'arp-nomax' : 'scales';
  return a;
}
let specs = 0, bad = 0;
const mixed: string[] = [];
for (const f of [...catalog(), ...guitarCatalog()] as any[]) {
  if (!(f.id in TABLE) && !(f.id in CHART)) continue;
  for (const l of f.levels) {
    const areas = new Set<string>();
    for (const sp of l.specs) {
      specs++;
      const a = area(f.id, String(sp.kind), sp.option ?? 0, sp.scale);
      if (!a) { bad++; console.log('UNLISTED', l.id, sp.kind, sp.option ?? '', sp.scale ?? ''); } else areas.add(a === 'arp-nomax' ? 'arpeggios' : a);
    }
    if (areas.size > 1) mixed.push(`${l.id} [${[...areas].join(', ')}]`);
  }
}
console.log(`families ${Object.keys(TABLE).length + Object.keys(CHART).length}, specs ${specs}, unlisted ${bad}`);
console.log('mixed:', mixed.join('; '));
