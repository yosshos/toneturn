// Prints the live scale coverage matrix (src/engine/drills/scaleMatrix.ts) as Markdown, for docs/AUDIT-SCALES.md.
//   npx vite-node scripts/audit-scales.mts
import { matrixMarkdown, missingCells } from '../src/engine/drills/scaleMatrix';
import { catalog } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { H_SCALES, H_STEPS } from '../src/engine/drills/harmLadder';

const out: string[] = [];
out.push(matrixMarkdown());
out.push('');
out.push(`Missing cells: ${missingCells().length ? missingCells().join(', ') : 'none'}`);
out.push('');
// Harmonization ladder: scale × step × instrument → the level that holds it.
const where = (fams: { id: string; levels: { id: string; specs: { family: string; kind: string; option?: number; position?: number }[] }[] }[], fam: string, kind: string, option: number) =>
  fams.find((f) => f.id === fam)?.levels.filter((lv) => lv.specs.some((sp) => sp.kind === kind && (sp.option ?? 0) === option)).map((lv) => lv.id).join(', ') || '—';
const pc = catalog();
const gc = guitarCatalog();
out.push(`| Scale | ${H_STEPS.map((s) => `${s} piano / guitar`).join(' | ')} |`);
out.push(`|---|${H_STEPS.map(() => '---').join('|')}|`);
H_SCALES.forEach((sc, i) => out.push(`| ${sc.name.en} | ${H_STEPS.map((st) => `${where(pc, 'k-sharm', `hl-${st}`, i)} / ${where(gc, 'g-harm', `hl-${st}`, i)}`).join(' | ')} |`));
console.log(out.join('\n'));
