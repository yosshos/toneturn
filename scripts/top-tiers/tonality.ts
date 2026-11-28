// Tonality classifier for docs/RESEARCH-TOP-TIERS.md §1.5 (the guard's tonality reference).
// Run from the repo root: npx tsx scripts/top-tiers/tonality.ts [--verbose] [--table out.md] [--appendix out.md]
// Hardened in round 11. Semantic data first; never keySig, never "has a minor 3rd".
// Classes: major | minor | neutral (chord quality, technique, blues, dominant) | mode:<name> (a mode from the root) |
// pminor (a mode of melodic / harmonic minor) | unresolved (fails the guard; a person decides).
import { catalog, generate } from '../../src/engine/drills/generate';
import { guitarCatalog } from '../../src/engine/drills/guitar';
import { ladderRungs, laterRungs } from '../../src/engine/drills/keyIndex';
import { H_SCALES } from '../../src/engine/drills/harmLadder';
import { RULE_OPTS } from '../../src/engine/drills/harrisLineDrills';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
type Cls = string;
const NEUTRAL_FAM = new Set(['fingers', 'advanced', 'g-fretting', 'g-picking', 'g-legato', 'b-fret', 'b-pluck', 'b-legato', 'g-speed', 'g-fusion']);
const NEUTRAL_KIND: Record<string, string[]> = {
  'b-chord': ['r5', 'r58', 'triad', 'inv', 'sev', 'arp2', 'arp7x2', 'arp9', 'arpalt', 'hichords'],
  'g-arps': ['triad', 'caged-arp', 'caged7', 'inversions', 'seventh', 'ext-arp', 'ust'],
  arpeggios: ['arp-dim7', 'arp-dom7', 'arp-hd7', 'arp-m7', 'arp-maj7', 'arp-triad', 'broken', 'blocked'],
  harris: ['h19-pivot', 'h20-pivotrot'],
  'g-harris': ['pivot-arp', 'brothers'],
  'b-barry': ['pivot-arp'],
};
const MODE_IDS = ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'aeolian'];
function fromHScale(o: number): Cls | null {
  const sc = H_SCALES[o];
  if (!sc) return null;
  if (sc.id === 'ionian' || sc.id === 'six-dim') return 'major';
  if (MODE_IDS.includes(sc.id)) return `mode:${sc.id}`;
  if (sc.id === 'harmonic' || sc.id === 'melodic' || sc.id === 'six-dim-m') return 'minor';
  if (sc.id === 'dom-dim' || sc.id === 'dom5-dim') return 'neutral';
  return null;
}
/** The generator's own names (title, spec.scale): longest phrases first. */
const LEX: [RegExp, Cls][] = [
  [/minor blues/, 'minor'],
  [/blues/, 'neutral'],
  [/altered ♭♭7|diminished 7th|dim7/, 'neutral'],
  [/dorian ♭2|lydian augmented|mixolydian ♭6|locrian ♮2|locrian ♮6|ionian ♯5|dorian ♯4|lydian ♯2|melodic-minor modes|harmonic-minor modes/, 'pminor'],
  [/lydian dominant|phrygian dominant|bebop dominant|altered|whole-tone|diminished( scale)? \((half|whole)|diminished whole|dominant 7th-dim|7♭5-dim|brothers|family of dominants|dominant scale|dominant rule|dominant line/, 'neutral'],
  [/minor 6th-dim|m6-dim|natural minor|harmonic minor|melodic minor|minor pentatonic|\bminor\b/, 'minor'],
  [/aeolian/, 'mode:aeolian'], [/dorian/, 'mode:dorian'], [/phrygian/, 'mode:phrygian'], [/locrian/, 'mode:locrian'], [/mixolydian/, 'mode:mixolydian'], [/lydian/, 'mode:lydian'],
  [/6th-diminished|six-dim|\bmajor\b|ionian|major pentatonic/, 'major'],
];
const SCALE_NAME: Record<string, Cls> = { chromatic: 'neutral', major: 'major', natural: 'minor', harmonic: 'minor', melodic: 'minor', 'six-dim': 'major', 'six-dim-m': 'minor', 'bebop-dom': 'neutral', blues: 'neutral', pentatonic: 'major', dorian: 'mode:dorian', phrygian: 'mode:phrygian', lydian: 'mode:lydian', mixolydian: 'mode:mixolydian', locrian: 'mode:locrian', aeolian: 'mode:aeolian' };
const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (s: string) => { const m = /^([A-G])([b#♭♯]?)/.exec(s); return m ? (NOTE[m[1]] + (/[b♭]/.test(m[2]) ? 11 : /[#♯]/.test(m[2]) ? 1 : 0)) % 12 : null; };
function chordClass(sym: string): Cls | null {
  const q = sym.replace(/^[A-G][b#♭♯]?/, '').split('/')[0];
  if (/^(m(?!aj)|min|-)/.test(q)) return 'minor';
  if (/^(ø|°|dim)/.test(q)) return null;
  if (/^(7|9|13|11|7sus|9sus|alt)/.test(q)) return 'neutral';
  if (q === '' || /^(6|maj|Δ|M7|add9|69)/.test(q)) return 'major';
  return null;
}
function tonicChords(chart: string[], title: string, tonic: number): Map<Cls, number> {
  const out = new Map<Cls, number>();
  const scan = (t: string, bareOk: boolean) => {
    for (const tok of t.split(/[\s|,:;()·→–-]+/)) {
      if (!/^[A-G][b#♭♯]?(m|maj|min|6|7|9|Δ|ø|°|dim|sus|add|$)/.test(tok)) continue;
      if (!bareOk && /^[A-G][b#♭♯]?$/.test(tok)) continue;
      if (pcOf(tok) !== tonic) continue;
      const c = chordClass(tok);
      if (c) out.set(c, (out.get(c) ?? 0) + 1);
    }
  };
  for (const c of chart) scan(c, true);
  scan(title, false);
  return out;
}
/** Decisions recorded by a person, for items with no semantic signal (each listed in the doc). */
export const DECIDED: Record<string, [Cls, string]> = {
  'mv-next:0': ['major', 'Harris move between major 6 chords (E♭6 → C°7 → A♭6)'],
  'sf-borrow:1': ['neutral', 'borrowing inside the tritone brother (a dominant)'],
  'dc-lower:0': ['neutral', 'the four dominants from one diminished chord'],
  'hl-outline:5': ['minor', 'A Night in Tunisia is a minor-key tune'],
  'hl-outline:4': ['major', 'How High the Moon is a major-key tune (its minor bars are tonicisations)'],
  'standard:2': ['major', 'Tune Up is in D major'],
  'standard:13': ['major', 'Stella by Starlight is in B♭ major'],
  'standard:27': ['major', 'ii–V–I through the keys: major ii–V–Is'],
  'sight-impro': ['neutral', 'sight-read charts in either mode (it reads the chart it is given)'],
  'btp-slip:0': ['minor', 'side-slip over the tonic m7 (Cm7)'],
  'penta5:0': ['minor', 'the minor pentatonic through the five positions (SCALES.pentaMinor, bass.ts:1196)'],
  'interval-shapes:1': ['neutral', 'perfect 4ths across the strings: interval technique with no 3rd'],
  'interval-shapes:2': ['neutral', 'perfect 5ths across the strings: interval technique with no 3rd'],
  'interval-shapes:4': ['neutral', 'octaves across the strings: interval technique with no 3rd'],
  'sf-borrow:0': ['neutral', 'borrowing inside the important minor over the V (a dominant function)'],
  'pivot-encl:0': ['major', 'pivot and enclosure down the C (major) bebop scale'],
  'pivot-encl:1': ['major', 'the same, from the 5th'],
  'h23-pivotencl:0': ['major', 'pivot and enclosure down the C (major) bebop scale'],
  'h23-pivotencl:1': ['major', 'the same, from the 5th'],
  'sixth5:0': ['major', 'the sixth on the fifth: G6 over C (a major-key colour)'],
  'sixth5:1': ['major', 'the same, drop 2'],
  'sf-comp:0': ['major', 'a C-major turnaround with the important / tritone minors'],
  'h6-approach:0': ['major', 'a half step below each note of C (major)'],
};
export const decidedHits = new Map<string, number>();
export function classify(fam: string, sp: any, useDecided = true): { cls: Cls; why: string; title: string } {
  const kind = String(sp.kind);
  if (NEUTRAL_FAM.has(fam) || (NEUTRAL_KIND[fam] ?? []).includes(kind)) return { cls: 'neutral', why: 'declared (chord quality / technique)', title: '' };
  let d: any;
  try { d = generate({ ...sp, key: 0 }); } catch (e: any) { return { cls: 'unresolved', why: 'ERR', title: '' }; }
  const title = String(d.title?.en ?? '');
  const tonic = d.tonic ? d.tonic.key : 0;
  if (d.tonic?.minor || sp.minor) return { cls: 'minor', why: d.tonic?.minor ? 'tonic.minor' : 'spec.minor', title };
  const o = sp.option ?? 0;
  const base = kind.replace(/^[a-z-]+>/, '');
  if ((fam === 'k-sharm' || fam === 'g-harm') && /^hl-/.test(base) && base !== 'hl-line' || ((fam === 'k-sharm' || fam === 'g-harm') && base === 'hl-line')) {
    const c = fromHScale(o);
    if (c) return { cls: c, why: `H_SCALES[${o}]`, title };
  }
  if (base === 'hl-rules') { const r = RULE_OPTS[o]; if (r) return { cls: r[0] === 'min' ? 'minor' : 'major', why: `RULE_OPTS[${o}]`, title }; }
  if (sp.scale && SCALE_NAME[sp.scale]) return { cls: SCALE_NAME[sp.scale], why: `scale ${sp.scale}`, title };
  const dk = `${base}:${o}`;
  if (useDecided && DECIDED[dk]) { decidedHits.set(dk, (decidedHits.get(dk) ?? 0) + 1); return { cls: DECIDED[dk][0], why: `decided: ${DECIDED[dk][1]}`, title }; }
  if (useDecided && DECIDED[base] && sp.option === undefined) { decidedHits.set(base, (decidedHits.get(base) ?? 0) + 1); return { cls: DECIDED[base][0], why: `decided: ${DECIDED[base][1]}`, title }; }
  // the tonic chord anywhere in the chart, or named (with its quality) in the title
  const tc = tonicChords(d.chart ?? [], title, tonic);
  const mi = tc.get('minor') ?? 0, ma = tc.get('major') ?? 0, ne = tc.get('neutral') ?? 0;
  if (mi && !ma) return { cls: 'minor', why: `tonic chord minor (${mi})`, title };
  if (ma && !mi) return { cls: 'major', why: `tonic chord major (${ma}${ne ? ', dominant ' + ne : ''})`, title };
  if (ne && !mi && !ma) return { cls: 'neutral', why: 'tonic chord dominant', title };
  // scale / mode names in the title
  // Harris device names that are not the key: the important minor, the tritone's minor, the minor 6ths over the V
  const tl = title.toLowerCase().replace(/important minors?|tritone[’']s minors?|minor 6ths? on (their|its) 5ths?|the minor on 5/g, '');
  for (const [re, c] of LEX) if (re.test(tl)) return { cls: c, why: `title: ${re.source.slice(0, 24)}`, title };
  if (mi && ma) return { cls: 'unresolved', why: `tonic chords minor ${mi} + major ${ma}`, title };
  // the generator's key label: "· C" / "in C" = C major, "· Cm" / "C minor" = C minor (the app's key-label convention)
  const NM = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][tonic];
  const NM2 = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][tonic];
  for (const nm of [NM, NM2]) {
    const minRe = new RegExp('(·|\\bin)\\s+' + nm + '(m\\b|\\s+minor)');
    const majRe = new RegExp('(·|\\bin)\\s+' + nm + '(\\s|$|:|,|\\.)');
    if (minRe.test(title)) return { cls: 'minor', why: 'key label (minor)', title };
    const pcs = new Set<number>((d.notes ?? []).map((n: any) => (((n.pitch - tonic) % 12) + 12) % 12));
    if (majRe.test(title + ' ')) return pcs.has(4) ? { cls: 'major', why: 'key label (major), confirmed by a major 3rd', title } : { cls: 'unresolved', why: 'key label says major but there is no major 3rd', title };
    if (title.startsWith(nm + ':')) return { cls: 'major', why: 'key label (major, title head)', title };
  }
  return { cls: 'unresolved', why: 'no semantic signal', title };
}

// ---------------- placed levels ----------------
const fams = [...catalog(), ...guitarCatalog()] as any[];
export const levelById = new Map<string, { fam: string; l: any }>();
for (const f of fams) for (const l of f.levels) levelById.set(l.id, { fam: f.id, l });
const insts = ['piano', 'guitar', 'bass'] as const;

/** Every level the plan places (prop.ts) plus every level of today's key-ladder rungs. */
export function placedLevels(): string[] {
  const prop = readFileSync(join(DIR, 'prop.ts'), 'utf8');
  const placed = new Set<string>();
  for (const m of prop.matchAll(/\['([^']+)', \d/g)) for (const id of m[1].matchAll(/((?:[a-z]+-)+\d+)/g)) placed.add(id[1]);
  for (const m of prop.matchAll(/S\(\[([^\]]+)\], '([^']+)', \d\)/g)) for (const n of m[1].matchAll(/'(\d+)'/g)) placed.add(m[2].replace(/^(major|minor):/, '') + n[1]);
  for (const id of ['b-scale-1', 'b-scale-3', 'b-scale-4', 'b-scale-8', 'b-scale-6']) placed.add(id);
  for (const inst of insts) for (const g of ['major', 'minor'] as const) for (const r of [...ladderRungs(g, inst), ...laterRungs(g, inst)]) placed.add(r.id);
  return [...placed].filter((id) => levelById.has(id)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}
/** Option name as Appendix B prints it: kind[:option][/scale id][ (minor)]. */
export const optName = (sp: any) => `${sp.kind}${sp.option !== undefined ? ':' + sp.option : ''}${sp.scale ? '/' + sp.scale : ''}${sp.minor ? ' (minor)' : ''}`;
const v11Name = (sp: any) => `${sp.kind}${sp.option !== undefined ? ':' + sp.option : ''}${sp.minor ? ' (minor)' : ''}`;
export const rowOf = (c: Cls) => (c === 'minor' || c === 'pminor' ? 'minor' : c === 'neutral' ? 'both' : c === 'major' ? 'major' : c.startsWith('mode:') ? 'major (mode view)' : 'UNRESOLVED');

/** level id → [option name, class] for every spec of every placed level. */
export function classifyPlaced(): Map<string, [string, Cls][]> {
  const out = new Map<string, [string, Cls][]>();
  for (const id of placedLevels()) {
    const e = levelById.get(id)!;
    out.set(id, e.l.specs.map((sp: any): [string, Cls] => [optName(sp), classify(e.fam, sp).cls]));
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const argOf = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  // v11's classes (the round-10 classifier), for the reclassification counts
  const oldCls = new Map<string, string>();
  const v11 = join(DIR, 'v11-classes.md');
  if (existsSync(v11)) for (const line of readFileSync(v11, 'utf8').split('\n').slice(2)) {
    const c = line.split('|').map((x) => x.trim());
    if (c.length < 5) continue;
    const id = c[1].replace(/`/g, '');
    for (const [col, cls] of [[2, 'minor'], [3, 'major'], [4, 'neutral']] as const) for (const o of c[col].split(', ')) if (o && o !== '—') oldCls.set(`${id}|${o}`, cls);
  }
  const table: string[] = [];
  const unresolved: string[] = [];
  const moves = new Map<string, number>();
  let total = 0, wouldBeUnresolved = 0;
  const byKindOpt = new Map<string, Map<string, string[]>>();
  const SHARED = /^(k-harrisline|g-harrisline|b-harrisline|g-hlfast|k-sharm|g-harm|g-harris|k-tpair|g-tpair|b-tpair)$/;
  const appendix: { id: string; mi: string[]; ma: string[]; bo: string[] }[] = [];
  for (const id of placedLevels()) {
    const e = levelById.get(id)!;
    const cells: string[] = [];
    const ap = { id, mi: [] as string[], ma: [] as string[], bo: [] as string[] };
    for (const sp of e.l.specs) {
      total++;
      const r = classify(e.fam, sp);
      if (r.why.startsWith('decided') && classify(e.fam, sp, false).cls === 'unresolved') wouldBeUnresolved++;
      const n = optName(sp);
      cells.push(`${n} → ${r.cls}`);
      const push = (a: string[], t: string) => { if (!a.includes(t)) a.push(t); };
      if (r.cls === 'minor' || r.cls === 'pminor') push(ap.mi, n + (r.cls === 'pminor' ? ' (pminor)' : ''));
      else if (r.cls === 'neutral') push(ap.bo, n);
      else push(ap.ma, n + (r.cls.startsWith('mode:') ? ` (${r.cls.slice(5)})` : ''));
      if (r.cls === 'unresolved') unresolved.push(`${id} ${n}: ${r.why} | ${r.title}`);
      const old = oldCls.get(`${id}|${v11Name(sp)}`);
      if (old) {
        const now = r.cls.startsWith('mode:') ? 'mode' : r.cls;
        if (now !== old) {
          const k = `${old} → ${now}`;
          moves.set(k, (moves.get(k) ?? 0) + 1);
          if (verbose) console.log(`  MOVE ${id} ${n}: ${old} → ${r.cls} (${r.why})`);
        }
      }
      const ko = `${String(sp.kind).replace(/^[a-z-]+>/, '')}:${sp.option ?? 0}${sp.scale ? '/' + sp.scale : ''}`;
      if (SHARED.test(e.fam)) {
        const m = byKindOpt.get(ko) ?? new Map<string, string[]>();
        const arr = m.get(r.cls) ?? [];
        arr.push(id);
        m.set(r.cls, arr);
        byKindOpt.set(ko, m);
      }
    }
    table.push(`| \`${id}\` | ${cells.join('; ')} |`);
    appendix.push(ap);
  }
  const moved = [...moves.values()].reduce((a, b) => a + b, 0);
  console.log(`levels ${table.length}; specs classified: ${total}; unresolved: ${unresolved.length}`);
  console.log(`moves against v11 (v11 had no modes: a v11 minor/major that is now a mode counts as a move): ${moved}`);
  for (const [k, v] of [...moves].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
  const decSpecs = [...decidedHits.values()].reduce((a, b) => a + b, 0);
  console.log(`human decisions: ${Object.keys(DECIDED).length} keys, ${decidedHits.size} used, ${decSpecs} specs; ${wouldBeUnresolved} of those specs would be unresolved without them`);
  for (const u of unresolved) console.log('  UNRESOLVED ' + u);
  let cross = 0;
  for (const [ko, m] of byKindOpt) if (m.size > 1) {
    const fs = [...m.values()].flat().map((id) => id.replace(/-\d+$/, ''));
    if (new Set(fs).size > 1) { cross++; console.log(`  CROSS ${ko}: ${[...m].map(([c, ids]) => `${c}=${ids.join(',')}`).join(' / ')}`); }
  }
  console.log(`cross-instrument disagreements: ${cross}`);

  // today's rungs: rows and views, per picked option (exact)
  const VIEW_MODE: Record<string, string> = { aeolian: 'mode:aeolian', dorian: 'mode:dorian', phrygian: 'mode:phrygian', lydian: 'mode:lydian', mixolydian: 'mode:mixolydian', locrian: 'mode:locrian' };
  let rowMis = 0, viewMis = 0;
  for (const inst of insts) for (const g of ['major', 'minor'] as const) for (const r of [...ladderRungs(g, inst), ...laterRungs(g, inst)]) {
    const e = levelById.get(r.id);
    if (!e) continue;
    for (const sp of e.l.specs.filter((s: any) => !r.pick || r.pick(s))) {
      const k = classify(e.fam, sp);
      const c = k.cls;
      if (r.tag && VIEW_MODE[r.tag]) {
        const t = k.title.toLowerCase();
        const ok = c === VIEW_MODE[r.tag] || (r.tag === 'aeolian' && c === 'minor' && /natural|aeolian|minor/.test(t) && !/harmonic|melodic/.test(t));
        if (!ok) { viewMis++; console.log(`  VIEW ${inst} ${g} ${r.tag}:${r.id} ${optName(sp)} → ${c}`); }
        continue;
      }
      if (r.tag === 'melodic' || r.tag === 'm6dim') { if (c !== 'minor' && c !== 'pminor') { viewMis++; console.log(`  VIEW ${inst} ${g} ${r.tag}:${r.id} ${optName(sp)} → ${c}`); } continue; }
      const row = rowOf(c);
      const bad = row === 'UNRESOLVED' || (g === 'major' ? row === 'minor' : row === 'major' || row.startsWith('major (mode'));
      if (bad) { rowMis++; console.log(`  ROW ${inst} ${g} ${r.tag ? r.tag + ':' : ''}${r.id} ${optName(sp)} → ${c}`); }
    }
  }
  console.log(`today's rungs: row mismatches ${rowMis}; view mismatches ${viewMis}`);

  const tablePath = argOf('--table');
  if (tablePath) writeFileSync(tablePath, '| Level | option → class |\n|---|---|\n' + table.join('\n') + '\n');
  const apPath = argOf('--appendix');
  if (apPath) {
    const allMaj = appendix.filter((a) => !a.mi.length && !a.bo.length).map((a) => `\`${a.id}\``);
    const f = (l: string[]) => (l.length ? l.join(', ') : '—');
    const rows = appendix.filter((a) => a.mi.length || a.bo.length).map((a) => `| \`${a.id}\` | ${f(a.mi)} | ${f(a.ma)} | ${f(a.bo)} |`);
    writeFileSync(apPath, `ALLMAJ ${allMaj.length}: ${allMaj.join(', ')}\n\n| Level | Minor rows (minor options) | Major rows (major / modal options) | Both rows (neutral) |\n|---|---|---|---|\n${rows.join('\n')}\n`);
  }
  if (unresolved.length || cross || viewMis) process.exitCode = 1;
}
if (process.argv[1] && /top-tiers[\\/]tonality\.ts$/.test(process.argv[1])) main();
