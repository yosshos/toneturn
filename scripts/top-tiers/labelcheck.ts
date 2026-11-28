// Row-label check for docs/RESEARCH-TOP-TIERS.md §1.5, and the per-row rung counts of §1.5.
// Run from the repo root: npx tsx scripts/top-tiers/labelcheck.ts
//
// This is a LEVEL-LEVEL check: a row label passes when the labelled level has at least one option whose class fits
// that row (prop.ts carries rung ids, not picks). It is safe because the build's row filter admits only the picked
// options whose class fits the row; the exact per-pick check is the builder's guard (§1.5), and tonality.ts already
// runs it on today's key-ladder rungs.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPlaced } from './tonality';

const DIR = dirname(fileURLToPath(import.meta.url));
const prop = readFileSync(join(DIR, 'prop.ts'), 'utf8');
const tab = classifyPlaced();
const fits: Record<string, (c: string) => boolean> = {
  m: (c) => c === 'minor' || c === 'pminor' || c === 'neutral',
  minor: (c) => c === 'minor' || c === 'pminor' || c === 'neutral',
  mel: (c) => c === 'minor' || c === 'pminor',
  m6dim: (c) => c === 'minor' || c === 'pminor',
  dor: (c) => c === 'mode:dorian', phr: (c) => c === 'mode:phrygian', loc: (c) => c === 'mode:locrian',
  lyd: (c) => c === 'mode:lydian', mix: (c) => c === 'mode:mixolydian', aeol: (c) => c === 'mode:aeolian' || c === 'minor',
};
const majorRow = (c: string) => c === 'major' || c === 'neutral' || c.startsWith('mode:');
const levelOf = (lab: string) => /((?:[a-z]+-)+\d+)/.exec(lab)?.[1];

let checked = 0, mis = 0, unknown = 0, plain = 0, plainMis = 0;
const labels = new Set([...prop.matchAll(/\['([^']+)', \d/g)].map((m) => m[1]));
for (const m of prop.matchAll(/S\(\[([^\]]+)\], '([^']+)', \d\)/g)) for (const n of m[1].matchAll(/'(\d+)'/g)) labels.add(m[2] + n[1]);
for (const lab of labels) {
  const pre = /^([a-z0-9]+)[: ]/.exec(lab)?.[1];
  const id = levelOf(lab);
  const cls = id ? tab.get(id) : undefined;
  if (!cls) { unknown++; continue; }
  if (pre && fits[pre]) {
    checked++;
    if (!cls.some(([, c]) => fits[pre](c))) { mis++; console.log(`  MISMATCH ${lab}: ${cls.map(([n, c]) => `${n}→${c}`).join('; ')}`); }
  } else if (!pre || pre === 'major' || pre === 'harris' || pre === 'split' || pre === 'v') {
    plain++;
    if (!cls.some(([, c]) => majorRow(c))) { plainMis++; console.log(`  NO MAJOR-ROW OPTION ${lab}: ${cls.map(([n, c]) => `${n}→${c}`).join('; ')}`); }
  }
}
console.log(`row labels checked ${checked}, mismatches ${mis}; unlabelled / major-row rungs ${plain}, without a major-row option ${plainMis}; new levels (not classified) ${unknown}`);

// Per-row rung counts per tier (major row / minor row; neutral and split levels count on both; new levels by label).
const AREAS = ['piano/line-jazz', 'guitar/line-jazz', 'bass/scales', 'bass/walking'];
for (const area of AREAS) {
  const i = prop.indexOf(`'${area}*'`);
  const blk = prop.slice(i, prop.indexOf(']),', i));
  const per = new Map<number, [number, number]>();
  const items: [string, number, number][] = [...blk.matchAll(/\['([^']+)', (\d)(?:, (\d))?\]/g)].map((m) => [m[1], +m[2], m[3] ? +m[3] : +m[2]]);
  for (const m of blk.matchAll(/S\(\[([^\]]+)\], '([^']+)', (\d)\)/g)) for (const n of m[1].matchAll(/'(\d+)'/g)) items.push([m[2] + n[1], +m[3], +m[3]]);
  for (const [lab, t0, t1] of items) {
    const id = levelOf(lab);
    const cls = id ? tab.get(id) : undefined;
    const pre = /^([a-z0-9]+)[: @]/.exec(lab)?.[1] ?? lab.replace(/@.*/, '');
    let maj: boolean, min: boolean;
    if (pre === 'm' || pre === 'minor' || pre === 'mel' || pre === 'm6dim') { maj = false; min = true; }
    else if (cls) { maj = cls.some(([, c]) => majorRow(c)); min = cls.some(([, c]) => c === 'minor' || c === 'pminor' || c === 'neutral'); }
    else if (['dor', 'phr', 'loc', 'lyd', 'mix', 'major'].includes(pre)) { maj = true; min = false; }
    else { maj = true; min = /hlfast|duo|comp-solo|V/.test(lab); } // new rule-generated levels: the g-hlfast rows / both
    for (let t = t0; t <= t1; t++) { const a = per.get(t) ?? [0, 0]; a[0] += +maj; a[1] += +min; per.set(t, a); }
  }
  console.log(`${area} (major/minor row): ` + [...per].sort((a, b) => a[0] - b[0]).map(([t, [a, b]]) => `T${t} ${a}/${b}`).join(', '));
}
if (mis || plainMis) process.exitCode = 1;
