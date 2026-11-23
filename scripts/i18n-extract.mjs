// Collects every English text the app can show (docs/SPEC-I18N.md) into i18n/source.json, the list the
// translated locales are made from. A text is English when the code pairs it with Hebrew: an `en` property (and all
// the text under it), a table named en / E / EN, or the non-Hebrew side of a choice whose other side is Hebrew
// (`lang === 'he' ? 'שלום' : 'Hello'`). A template literal becomes a pattern: `${n} bars` → "{0} bars".
// Usage: node scripts/i18n-extract.mjs   (then: node scripts/i18n-status.mjs to see what each locale still lacks)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAst } from 'rolldown/parseAst';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const SKIP = /[\\/](i18n[\\/]catalogs|dev[\\/]|paper[\\/]Gallery|ToniGallery|ElementsGallery|AvatarStudio)/;
const HEB = /[\u0590-\u05FF]/;
const WORDY = /[A-Za-z]{2}/;

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f) && !SKIP.test(p)) files.push(p);
  }
})(SRC);

const out = new Map(); // text → first place
let fileRel = '';
const add = (s, node) => {
  s = s.replace(/\s+/g, ' ').trim();
  if (!s || !WORDY.test(s) || HEB.test(s)) return;
  if (!out.has(s)) out.set(s, fileRel);
};
const tpl = (n) => {
  let i = 0;
  return n.quasis.map((q, k) => (q.value.cooked ?? q.value.raw) + (k < n.expressions.length ? `{${i++}}` : '')).join('');
};
const hasHeb = (n) => {
  let yes = false;
  visit(n, (x) => {
    if (yes) return false;
    if ((x.type === 'Literal' && typeof x.value === 'string' && HEB.test(x.value)) || (x.type === 'TemplateLiteral' && x.quasis.some((q) => HEB.test(q.value.raw))) || (x.type === 'JSXText' && HEB.test(x.value))) yes = true;
  });
  return yes;
};
/** Every text inside a subtree (not object keys, comparisons, imports or index keys). */
function collect(n) {
  visit(n, (x, parent) => {
    if (x.type === 'Literal' && typeof x.value === 'string') {
      if (parent && parent.type === 'Property' && parent.key === x && !parent.computed) return;
      if (parent && parent.type === 'BinaryExpression') return;
      if (parent && (parent.type === 'MemberExpression' || parent.type === 'ImportDeclaration' || parent.type === 'JSXAttribute' && /^(className|data-|key|id|href|role|type|k)$/.test(parent.name?.name ?? ''))) return;
      add(x.value, x);
    } else if (x.type === 'TemplateLiteral') {
      if (parent && parent.type === 'TaggedTemplateExpression') return;
      add(tpl(x), x);
      // a text inside a placeholder (`${n === 1 ? 'bar' : 'bars'}`) is collected on its own too
    } else if (x.type === 'JSXText') add(x.value, x);
  });
}
function visit(n, f, parent = null) {
  if (!n || typeof n.type !== 'string') return;
  if (f(n, parent) === false) return;
  for (const k in n) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'range' || k === 'loc') continue;
    const v = n[k];
    if (Array.isArray(v)) for (const c of v) visit(c, f, n);
    else if (v && typeof v === 'object' && typeof v.type === 'string') visit(v, f, n);
  }
}
const keyName = (p) => (p.key?.type === 'Identifier' ? p.key.name : p.key?.type === 'Literal' ? String(p.key.value) : null);
const isLangTest = (t) => {
  let yes = false;
  visit(t, (x) => {
    if ((x.type === 'Identifier' && /^(he|isHe|heb|rtl)$/.test(x.name)) || (x.type === 'Literal' && (x.value === 'he' || x.value === 'en'))) yes = true;
  });
  return yes;
};

for (const f of files) {
  fileRel = relative(ROOT, f).split(String.fromCharCode(92)).join('/');
  const code = readFileSync(f, 'utf8');
  if (!HEB.test(code)) continue; // a file with no Hebrew has no paired texts
  let ast;
  try {
    ast = parseAst(code, { lang: f.endsWith('x') ? 'tsx' : 'ts' }, f);
  } catch (e) {
    console.warn('skip (parse):', fileRel, e.message.split('\n')[0]);
    continue;
  }
  visit(ast, (n) => {
    if (n.type === 'Property' && keyName(n) === 'en') {
      collect(n.value);
      return false;
    }
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && /^(en|E|EN|EN_[A-Z_]+|[A-Z_]+_EN)$/.test(n.id.name) && n.init) {
      collect(n.init);
      return false;
    }
    if (n.type === 'ConditionalExpression' && isLangTest(n.test)) {
      const a = hasHeb(n.consequent);
      const b = hasHeb(n.alternate);
      if (a && !b) collect(n.alternate);
      else if (b && !a) collect(n.consequent);
      // the Hebrew side may hold more choices: keep walking it
      visit(a ? n.consequent : n.alternate, () => undefined);
    }
  });
}

// the app's frame first (the shared string tables), then the screens, then the course content, file by file in the
// order met: translating the first batches already gives a usable app, and texts of one screen travel together
// Short texts (up to 5 words: labels, buttons, names of courses and areas) come right after the frame wherever they
// live, since course data files hold many of the words every screen shows.
const shortText = (s) => s.split(/\s+/).length <= 5;
const prio = (f) => (f.startsWith('src/i18n/') ? 0 : f.startsWith('src/ui/') ? 1 : 2);
const rank = (s) => (prio(out.get(s)) === 0 ? 0 : shortText(s) ? 1 : prio(out.get(s)) === 1 ? 2 : 3);
const list = [...out.keys()].sort((x, y) => rank(x) - rank(y) || out.get(x).localeCompare(out.get(y)));
writeFileSync(join(ROOT, 'i18n/source.json'), JSON.stringify(list, null, 0).replace(/","/g, '",\n"') + '\n');
for (const [k, name] of [[0, 'frame'], [1, 'short texts'], [2, 'screens'], [3, 'content']]) {
  const part = list.filter((s) => rank(s) === k);
  console.log(`  ${name}: ${part.length} texts, ${part.reduce((a, s) => a + s.split(/\s+/).length, 0)} words`);
}
const words = list.reduce((a, s) => a + s.split(/\s+/).length, 0);
console.log(`${list.length} texts, ${words} words, from ${files.length} files`);
