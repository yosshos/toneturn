// Quick language switch (owner 2026-11-18): a globe in the top bar flips the whole app between English and Hebrew
// without opening Settings; the welcome screen also offers the translated locales (docs/SPEC-I18N.md). The app
// registers the real setter (it writes settings.uiLang and settings.locale); the buttons just call it.
import type { LocaleCode } from '../i18n/locales';

let setter: ((to: LocaleCode) => void) | null = null;

export function registerLangSetter(fn: ((to: LocaleCode) => void) | null): void {
  setter = fn;
}

export function switchLang(to: LocaleCode): void {
  setter?.(to);
}
