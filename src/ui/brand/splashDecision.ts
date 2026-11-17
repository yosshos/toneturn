// When the opening animation (Splash.tsx) shows. Pure logic plus thin storage helpers, so it is unit-tested.
//
// Shown only with the studio look (<html data-look="studio"> or ?look=studio), on the first open of each local day, at
// the home screen. Never in automated runs (navigator.webdriver; ?splash=force overrides that one rule for tests), with
// ?nosplash, or when a deep link (a hash route other than home) is opened. Reduced motion: the final frame, briefly.

export const SPLASH_DAY_KEY = 'tt.splash.day';
/** The language and motion setting last used by the app (the splash shows before settings load). */
export const SPLASH_PREFS_KEY = 'tt.splash.prefs';

export interface SplashEnv {
  /** location.search */
  search: string;
  /** location.hash */
  hash: string;
  webdriver: boolean;
  /** <html data-look> at mount time. */
  look: string | null | undefined;
  reducedMotion: boolean;
  /** The day it was last shown (SPLASH_DAY_KEY), if any. */
  lastDay: string | null;
  /** Today, local (localDay()). */
  today: string;
}

export type SplashSkip = 'nosplash' | 'look' | 'webdriver' | 'deeplink' | 'today';
export type SplashPlan = { show: false; reason: SplashSkip } | { show: true; mode: 'full' | 'still' };

/** Hashes that are the home screen. */
const HOME_HASH = /^#?\/?(home)?\/?$/;

export const isStudioLook = (look: string | null | undefined, search: string) =>
  look === 'studio' || new URLSearchParams(search).get('look') === 'studio';

export function decideSplash(env: SplashEnv): SplashPlan {
  const q = new URLSearchParams(env.search);
  if (q.has('nosplash')) return { show: false, reason: 'nosplash' };
  if (!isStudioLook(env.look, env.search)) return { show: false, reason: 'look' };
  if (env.webdriver && q.get('splash') !== 'force') return { show: false, reason: 'webdriver' };
  if (!HOME_HASH.test(env.hash)) return { show: false, reason: 'deeplink' };
  if (env.lastDay === env.today) return { show: false, reason: 'today' };
  return { show: true, mode: env.reducedMotion ? 'still' : 'full' };
}

/** The local calendar day, YYYY-MM-DD. */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function readSplashDay(): string | null {
  try {
    return localStorage.getItem(SPLASH_DAY_KEY);
  } catch {
    return null;
  }
}

export function writeSplashDay(day: string) {
  try {
    localStorage.setItem(SPLASH_DAY_KEY, day);
  } catch {
    /* private mode: it may show again, fine */
  }
}

export interface SplashPrefs {
  lang?: 'he' | 'en';
  reduced?: boolean;
}

export function readSplashPrefs(): SplashPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(SPLASH_PREFS_KEY) ?? '{}') as SplashPrefs;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** Called by the app once its settings are loaded. */
export function rememberSplashPrefs(p: SplashPrefs) {
  try {
    localStorage.setItem(SPLASH_PREFS_KEY, JSON.stringify(p));
  } catch {
    /* fine */
  }
}

/** The splash language: ?lang, then the app's last language, then the device language. */
export function splashLang(search: string, prefs: SplashPrefs, deviceLang: string): 'he' | 'en' {
  const forced = new URLSearchParams(search).get('lang');
  if (forced === 'he' || forced === 'en') return forced;
  if (prefs.lang === 'he' || prefs.lang === 'en') return prefs.lang;
  return /^(he|iw)\b/i.test(deviceLang) ? 'he' : 'en';
}

/** Reads the live environment (browser only). */
export function readSplashEnv(): SplashEnv {
  const prefs = readSplashPrefs();
  const osReduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    search: location.search,
    hash: location.hash,
    webdriver: typeof navigator !== 'undefined' && !!navigator.webdriver,
    look: document.documentElement.dataset.look,
    reducedMotion: document.documentElement.dataset.motion === 'reduced' || (prefs.reduced ?? osReduce),
    lastDay: readSplashDay(),
    today: localDay(),
  };
}
