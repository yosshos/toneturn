// Merges translated batches into public/i18n/<locale>.json, checking each one (docs/SPEC-I18N.md §4):
// the English text must be a known source text, every fill-in ({0}, {name}) must survive, no Hebrew, not empty.
// Usage: node scripts/i18n-merge.mjs <locale>
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const loc = process.argv[2];
if (!loc) throw new Error('locale?');
const src = new Set(JSON.parse(readFileSync(join(ROOT, 'i18n/source.json'), 'utf8')));
mkdirSync(join(ROOT, 'public/i18n'), { recursive: true });
const catFile = join(ROOT, 'public/i18n', `${loc}.json`);
const cat = existsSync(catFile) ? JSON.parse(readFileSync(catFile, 'utf8')) : {};
const dir = join(ROOT, 'i18n/work', loc);
// never translated: locale tags ("en-US") and regular expressions (speech matchers)
const SKIP_KEY = /^[a-z]{2}(-[A-Z]{2})?$|\\b|\(\?<|\[\^/;
// a tuning's string letters stay letters: "Standard (EADGBE)"
const TUNING = /\([A-G][#b♯♭]?(?:[A-G][#b♯♭]?){3,}\)/;
const fills = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
let ok = 0;
const bad = [];
for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.startsWith('out-')) : []) {
  let o;
  try {
    o = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  } catch (e) {
    bad.push(`${f}: not JSON (${e.message})`);
    continue;
  }
  for (const [en, t] of Object.entries(o)) {
    if (SKIP_KEY.test(en)) continue; // locale tags and regular expressions are code, not screen text
    if (TUNING.test(en) && (en.match(TUNING) ?? [])[0] !== (t.match(TUNING) ?? [])[0]) {
      bad.push(`${f}: tuning letters changed ${JSON.stringify(en).slice(0, 60)}`);
      continue;
    }
    if (!src.has(en)) bad.push(`${f}: unknown source ${JSON.stringify(en).slice(0, 60)}`);
    else if (typeof t !== 'string' || !t.trim()) bad.push(`${f}: empty for ${JSON.stringify(en).slice(0, 60)}`);
    else if (fills(en) !== fills(t)) bad.push(`${f}: fill-ins differ ${JSON.stringify(en).slice(0, 60)} → ${JSON.stringify(t).slice(0, 60)}`);
    else if (/[\u0590-\u05FF]/.test(t)) bad.push(`${f}: Hebrew in ${JSON.stringify(t).slice(0, 60)}`);
    else {
      cat[en] = t;
      ok++;
    }
  }
}
// keep only texts the app still has; sorted for small diffs
const out = Object.fromEntries(Object.keys(cat).filter((k) => src.has(k) && !SKIP_KEY.test(k) && !(TUNING.test(k) && (k.match(TUNING) ?? [])[0] !== (cat[k].match(TUNING) ?? [])[0])).sort().map((k) => [k, cat[k]]));
writeFileSync(catFile, JSON.stringify(out, null, 0).replace(/","/g, '",\n"') + '\n');
console.log(`${loc}: merged ${ok}, catalog ${Object.keys(out).length}/${src.size} (${Math.round((100 * Object.keys(out).length) / src.size)}%), problems ${bad.length}`);
for (const b of bad.slice(0, 30)) console.log('  ' + b);
