// A tiny XML reader for MusicXML (SPEC-PIECE §3): elements, attributes and text — no DTDs, no namespaces needed.
// Pure and dependency-free, so the importer runs the same in the browser and in unit tests.

export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m)));

export function parseXml(src: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    if (lt > i) stack[stack.length - 1].text += decode(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      const e = src.indexOf(']]>', lt);
      stack[stack.length - 1].text += src.slice(lt + 9, e < 0 ? n : e);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (src[lt + 1] === '?' || src[lt + 1] === '!') {
      // <?xml …?>, <!DOCTYPE …> (may contain [ … ])
      let depth = 0;
      let k = lt + 1;
      for (; k < n; k++) {
        if (src[k] === '[') depth++;
        else if (src[k] === ']') depth--;
        else if (src[k] === '>' && depth <= 0) break;
      }
      i = k + 1;
      continue;
    }
    const gt = src.indexOf('>', lt);
    if (gt < 0) break;
    const body = src.slice(lt + 1, gt);
    i = gt + 1;
    if (body[0] === '/') {
      const name = body.slice(1).trim();
      while (stack.length > 1) {
        const top = stack.pop()!;
        if (top.name === name) break;
      }
      continue;
    }
    const self = body.endsWith('/');
    const inner = self ? body.slice(0, -1) : body;
    const m = /^([\w:.-]+)/.exec(inner);
    if (!m) continue;
    const node: XNode = { name: m[1], attrs: {}, children: [], text: '' };
    const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a: RegExpExecArray | null;
    while ((a = re.exec(inner.slice(m[1].length)))) node.attrs[a[1]] = decode(a[3] ?? a[4] ?? '');
    stack[stack.length - 1].children.push(node);
    if (!self) stack.push(node);
  }
  return root;
}

export const kids = (x: XNode | undefined, name: string) => (x ? x.children.filter((c) => c.name === name) : []);
export const kid = (x: XNode | undefined, name: string) => x?.children.find((c) => c.name === name);
export const txt = (x: XNode | undefined, name: string) => kid(x, name)?.text.trim();
/** First descendant with this name (depth-first). */
export function find(x: XNode | undefined, name: string): XNode | undefined {
  if (!x) return undefined;
  for (const c of x.children) {
    if (c.name === name) return c;
    const f = find(c, name);
    if (f) return f;
  }
  return undefined;
}
