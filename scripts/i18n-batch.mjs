// Splits what a locale still lacks into batches for translation (docs/SPEC-I18N.md §4).
// Usage: node scripts/i18n-batch.mjs <locale> [size=350]  → i18n/work/<locale>/in-NNN.json (arrays of English texts)
// A translator writes i18n/work/<locale>/out-NNN.json: an object { "<English>": "<translation>" } for the same texts.
// Then: node scripts/i18n-merge.mjs <locale>
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const [loc, sizeArg] = process.argv.slice(2);
if (!loc) throw new Error('locale?');
const size = Number(sizeArg ?? 350);
const src = JSON.parse(readFileSync(join(ROOT, 'i18n/source.json'), 'utf8'));
const catFile = join(ROOT, 'public/i18n', `${loc}.json`);
const cat = existsSync(catFile) ? JSON.parse(readFileSync(catFile, 'utf8')) : {};
// what the narrator says comes first (it is recorded per language once translated: scripts/voice/), the rest after
const voiceFile = join(ROOT, 'scripts/voice/.lines.json');
const spoken = new Set(existsSync(voiceFile) ? JSON.parse(readFileSync(voiceFile, 'utf8')).map((l) => l.say) : []);
const missing = src.filter((s) => !cat[s]);
const todo = [...missing.filter((s) => spoken.has(s)), ...missing.filter((s) => !spoken.has(s))];
const dir = join(ROOT, 'i18n/work', loc);
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.startsWith('in-')) rmSync(join(dir, f));
// short texts first, grouped by place in the source order so related texts stay together
let n = 0;
for (let i = 0; i < todo.length; i += size) writeFileSync(join(dir, `in-${String(n++).padStart(3, '0')}.json`), JSON.stringify(todo.slice(i, i + size), null, 1));
console.log(`${loc}: ${todo.length} of ${src.length} texts missing → ${n} batches in i18n/work/${loc}`);
