// The app's display languages (docs/SPEC-I18N.md, owner 2026-11-22: ten jazz-market languages).
// Hebrew and English are authored in the code itself (every text has both). The other eight run the app in English
// underneath and translate at the screen (src/i18n/translate.ts) from a per-language catalog keyed by the English
// text, so no screen needs its own code for them. Each is marked beta until a native speaker has read it.

export type BaseLang = 'he' | 'en';
export type LocaleCode = 'he' | 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh';

export interface LocaleInfo {
  code: LocaleCode;
  /** The language's own name, as shown in the picker. */
  name: string;
  /** BCP 47 tag for Intl and <html lang>. */
  tag: string;
  dir: 'rtl' | 'ltr';
  /** Note names when the player leaves naming on "auto": fixed-do solfège or letters (German: H for B natural). */
  naming: 'solfege' | 'letter' | 'german';
  /** An on-device voice exists for this language (Kokoro); without one, spoken lines show as text. */
  voice: boolean;
  /** Machine-translated, waiting for a native speaker's review. */
  beta: boolean;
}

export const LOCALES: LocaleInfo[] = [
  { code: 'he', name: 'עברית', tag: 'he-IL', dir: 'rtl', naming: 'solfege', voice: false, beta: false },
  { code: 'en', name: 'English', tag: 'en-US', dir: 'ltr', naming: 'letter', voice: true, beta: false },
  { code: 'es', name: 'Español', tag: 'es', dir: 'ltr', naming: 'solfege', voice: true, beta: true },
  { code: 'pt', name: 'Português (Brasil)', tag: 'pt-BR', dir: 'ltr', naming: 'solfege', voice: true, beta: true },
  { code: 'fr', name: 'Français', tag: 'fr', dir: 'ltr', naming: 'solfege', voice: true, beta: true },
  { code: 'de', name: 'Deutsch', tag: 'de', dir: 'ltr', naming: 'german', voice: false, beta: true },
  { code: 'it', name: 'Italiano', tag: 'it', dir: 'ltr', naming: 'solfege', voice: true, beta: true },
  { code: 'ja', name: '日本語', tag: 'ja', dir: 'ltr', naming: 'letter', voice: true, beta: true },
  { code: 'ko', name: '한국어', tag: 'ko', dir: 'ltr', naming: 'letter', voice: false, beta: true },
  { code: 'zh', name: '中文（简体）', tag: 'zh-CN', dir: 'ltr', naming: 'letter', voice: true, beta: true },
];

/** Translated locales offered in the pickers: a language joins once its catalog covers the app's frame and screens
 *  (scripts/i18n-merge.mjs reports the coverage). Any locale can still be opened with ?lang=xx for testing. */
// 2026-11-24 (0.129): all eight carry the frame, the labels, the screens and the lesson titles; long explanations still
// show in English where not yet translated
export const OFFERED: LocaleCode[] = ['es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh'];
export const offeredLocales = (): LocaleInfo[] => LOCALES.filter((l) => !isTranslated(l.code) || OFFERED.includes(l.code));

export const localeInfo = (c: LocaleCode | undefined | null): LocaleInfo => LOCALES.find((l) => l.code === c) ?? LOCALES[1];

/** The language the code itself renders in: Hebrew for Hebrew, English for every other locale. */
export const baseOf = (c: LocaleCode | undefined | null): BaseLang => (c === 'he' ? 'he' : 'en');

/** A translated locale (not one of the two authored in the code). */
export const isTranslated = (c: LocaleCode | undefined | null): boolean => !!c && c !== 'he' && c !== 'en';

/** The best locale for a browser language list (navigator.languages). */
export function localeFromBrowser(langs: readonly string[]): LocaleCode {
  for (const l of langs) {
    const p = l.toLowerCase();
    if (p.startsWith('he') || p.startsWith('iw')) return 'he';
    const hit = LOCALES.find((x) => p === x.code || p.startsWith(`${x.code}-`));
    if (hit) return hit.code;
  }
  return 'en';
}
