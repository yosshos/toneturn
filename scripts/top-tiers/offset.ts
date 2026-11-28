// Chart-tune offset scan for docs/RESEARCH-TOP-TIERS.md §1.5. Run: npx tsx scripts/top-tiers/offset.ts "<level id regex>"
// Which placed rungs read spec.key as an offset from a lead sheet (drill.tonic.key !== spec.key)?
import { catalog, generate } from '../../src/engine/drills/generate';
import { guitarCatalog } from '../../src/engine/drills/guitar';
const ids = process.argv.slice(2);
const want = new RegExp(ids[0]);
const found = new Map<string, string>();
for (const f of [...catalog(), ...guitarCatalog()] as any[]) for (const l of f.levels) {
  if (!want.test(l.id)) continue;
  for (const sp of l.specs) {
    try {
      const d: any = generate({ ...sp, key: 2 });
      if (d.tonic && d.tonic.key !== 2) found.set(l.id, `${sp.kind}${sp.option !== undefined ? ':' + sp.option : ''} key 2 → tonic ${d.tonic.key}${d.tonic.minor ? 'm' : ''}`);
    } catch { /* skip */ }
  }
}
console.log(found.size ? [...found].map(([k, v]) => `${k}: ${v}`).join('\n') : 'none');
