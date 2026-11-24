// The screen-side translator for the eight translated locales (docs/SPEC-I18N.md). The app renders in English
// underneath; every text that reaches the screen through JSX (src/i18n/jsx/jsx-runtime.ts) and the few other exits
// (speech, document title, toasts drawn outside React) pass through translate(). A catalog maps an English text to
// the locale's text; a key with {0}, {1}… is a pattern for texts built around numbers or names ("Level {0}").
// Nothing here runs for Hebrew or English: active() is false and translate() returns its input.
import { isTranslated, LOCALES, type LocaleCode } from './locales';

declare const __APP_VERSION__: string;

export interface Catalog {
  /** English text (or pattern with {0} / {name} fill-ins) → translated text. */
  [en: string]: string;
}

let current: LocaleCode | null = null;
let exact = new Map<string, string>();
interface Pat {
  re: RegExp;
  out: string;
  /** The pattern's literal start (bucket key), '' when it opens with a placeholder. */
  head: string;
  /** The fill-in names in the order they appear in the English text ({0}, {name}…). */
  names: string[];
}
let buckets = new Map<string, Pat[]>();
let openers: Pat[] = [];
const cache = new Map<string, string>();
const misses = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();

const HEAD = 3;
const PH = /\{(\w+)\}/g;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Load a catalog for a locale (replaces the one before). Pass null to switch translation off. */
export function setCatalog(locale: LocaleCode | null, cat: Catalog | null): void {
  current = locale && isTranslated(locale) && cat ? locale : null;
  exact = new Map();
  buckets = new Map();
  openers = [];
  cache.clear();
  misses.clear();
  if (current && cat)
    for (const [k, v] of Object.entries(cat)) {
      if (!v) continue;
      if (!/\{\w+\}/.test(k)) {
        exact.set(k, v);
        continue;
      }
      const parts = k.split(/(\{\w+\})/);
      const isPh = (x: string) => /^\{\w+\}$/.test(x);
      const names = parts.filter(isPh).map((x) => x.slice(1, -1));
      let re: RegExp;
      try {
        re = new RegExp(`^${parts.map((x) => (isPh(x) ? '(.*?)' : esc(x))).join('')}$`, 's');
      } catch {
        continue;
      }
      // a pattern open at both ends needs two words of its own, or one real word ("{0} in {1}" would match any sentence
      // with "in"; "{0} hesitation{1}" is fine)
      const fixed = parts.filter((x) => !isPh(x)).join(' ').match(/[A-Za-z]{2,}/g) ?? [];
      if (fixed.length < 2 && parts[0] === '' && parts[parts.length - 1] === '' && (fixed[0] ?? '').length <= 4) continue;
      const head = parts[0];
      const pat: Pat = { re, out: v, head, names };
      if (head.length >= HEAD) {
        const b = head.slice(0, HEAD);
        (buckets.get(b) ?? buckets.set(b, []).get(b)!).push(pat);
      } else openers.push(pat);
    }
  version++;
  HOOK.on = current !== null;
  for (const f of listeners) f();
}
/** The JSX runtime's way in (src/i18n/jsx/jsx-runtime.ts). */
const HOOK = { on: false, t: (s: string) => translate(s) };
(globalThis as { __ttI18n?: typeof HOOK }).__ttI18n = HOOK;

export const active = (): boolean => current !== null;
export const activeLocale = (): LocaleCode | null => current;
/** Bumps whenever the catalog changes (a React key / effect dependency to re-render translated text). */
export const catalogVersion = (): number => version;
export function onCatalog(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

/** Text worth translating: has a run of two letters (not a lone note name, number, symbol or chord). */
const WORDY = /[A-Za-z]{2}/;
/** Chord symbols, note names, Roman numerals, keys and versions stay as they are. */
const MUSIC = /^(?:(?:Do|Re|Mi|Fa|Sol|La|Si|Ti)[♯♭#b]?(?:\s+(?:Do|Re|Mi|Fa|Sol|La|Si|Ti)[♯♭#b]?)*|[A-G][#b♯♭]?(?:maj|min|m|dim|aug|sus|add|alt|ø|°|\+|-|Δ|\d|\(|\)|\/|[#b♯♭]|\s)*|[ivIV♭♯b#]+[°ø+]?\d*(?:\/[ivIV]+)?|v?\d+(?:\.\d+)*|[A-G][#b♯♭]?\s?(?:major|minor))$/;

/** A lone function word is a piece of a sentence built in parts ("Hear what is going on" + "in" + "the music"):
 *  translated alone it lands mid-English, so it stays as it is (the whole sentence wants one template instead). */
const FRAGMENT = new Set(['in', 'on', 'of', 'at', 'to', 'by', 'for', 'and', 'or', 'the', 'a', 'an', 'with', 'from', 'as', 'is', 'are', 'it', 'than', 'then', 'into', 'over', 'under', 'per', 'via', 'vs', 'was', 'were', 'be', 'been', 'not', 'no', 'but', 'so', 'if', 'at the', 'of the', 'in the', 'on the', 'to the', 'th', 'st', 'nd', 'rd']);

function core(s: string): string {
  const hit = exact.get(s);
  if (hit !== undefined) return hit;
  const tryPats = (list: Pat[] | undefined): string | null => {
    if (!list) return null;
    for (const p of list) {
      const m = p.re.exec(s);
      // a fill-in is a number, a name or a short phrase; one that swallowed a sentence means the pattern is wrong here
      if (!m || m.slice(1).some((x) => x.split(/\s+/).length > 6)) continue;
      const val = new Map<string, string>();
      p.names.forEach((n, i) => val.has(n) || val.set(n, m[i + 1]));
      // a fill-in goes back as it came (a number, a name), or translated when it is itself a known text; the
      // translation may move it
      return p.out.replace(PH, (all, n: string) => {
        const f = val.get(n);
        // an English plural ending carried in a fill-in ("hesitation{1}" with {1} = "s") means nothing in the locale
        if (f === 's' || f === 'es') return '';
        return f === undefined ? all : (exact.get(f) ?? f);
      });
    }
    return null;
  };
  const r = tryPats(buckets.get(s.slice(0, HEAD))) ?? tryPats(openers);
  if (r !== null) return r;
  // texts the screens put together: "12. Sing it by name" (a numbered title), "Repertoire · 0/5" (parts joined by a
  // middle dot): each part on its own
  const num = /^(\d+\.\s+)(.+)$/.exec(s);
  if (num) {
    const t = core(num[2]);
    if (t !== num[2]) return num[1] + t;
  }
  // "High or low 2": a name with a running number after it
  const tail = /^(.*\D)(\s+\d+)$/.exec(s);
  if (tail && WORDY.test(tail[1])) {
    const t = core(tail[1]);
    if (t !== tail[1]) return t + tail[2];
  }
  if (s.includes(' · ')) {
    const parts = s.split(' · ');
    const t = parts.map((x) => (WORDY.test(x) && !MUSIC.test(x) ? core(x) : x));
    if (t.some((x, i) => x !== parts[i])) return t.join(' · ');
  }
  misses.add(s);
  return s;
}

/** The locale's text for an English text; the input itself when no catalog is active or nothing matches. Leading and
 *  trailing spaces are kept (JSX text runs between expressions carry them). */
export function translate(s: string): string {
  if (!current || !WORDY.test(s)) return s;
  const c = cache.get(s);
  if (c !== undefined) return c;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!;
  const body = m[2];
  const out = !body || MUSIC.test(body) || FRAGMENT.has(body) ? s : m[1] + core(body) + m[3];
  if (cache.size > 20000) cache.clear();
  cache.set(s, out);
  return out;
}

/** The English texts the screen showed that the catalog lacks (QA: window.__i18nMisses()). */
export const missing = (): string[] => [...misses];
if (typeof window !== 'undefined') (window as unknown as { __i18nMisses: () => string[] }).__i18nMisses = missing;

/** Load the catalog for a locale: public/i18n/<code>.json, fetched (not bundled), so only the chosen language
 *  downloads and the app's own files stay the same size; the service worker keeps it for offline use. */
let wanted: LocaleCode | null = null;
let loading: Promise<void> | null = null;
export async function loadLocale(locale: LocaleCode): Promise<void> {
  // already on (or on its way): nothing to do. A load re-mounts the app, whose mount asks again: this ends that loop.
  const target = isTranslated(locale) ? locale : null;
  if (target === wanted) return loading ?? undefined;
  wanted = target;
  if (!target) {
    loading = null;
    if (current !== null) setCatalog(null, null);
    return;
  }
  loading = fetchCatalog(target);
  return loading;
}
async function fetchCatalog(locale: LocaleCode): Promise<void> {
  let cat: Catalog = {};
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}i18n/${locale}.json?v=${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}`);
    if (r.ok) cat = (await r.json()) as Catalog;
  } catch {
    /* offline before the first load: English until it can be fetched */
  }
  if (wanted === locale) setCatalog(locale, cat);
}

/** The Intl tag for dates and numbers: Hebrew's, the translated locale's when one is on, else English's
 *  (`fallbackEn`: en-GB / en-US as each screen had it). */
export function intlTag(base: string, fallbackEn = 'en-US'): string {
  if (base === 'he' || base === 'he-IL') return 'he-IL';
  if (current) return LOCALE_TAGS[current] ?? fallbackEn;
  return fallbackEn;
}
const LOCALE_TAGS: Partial<Record<LocaleCode, string>> = Object.fromEntries(LOCALES.map((l) => [l.code, l.tag]));
