// Quick language switch (owner 2026-11-18): a globe in the top bar flips the whole app between English and Hebrew
// without opening Settings. The app registers the real setter (it writes settings.uiLang); the button just calls it.
let setter: ((lang: 'he' | 'en') => void) | null = null;

export function registerLangSetter(fn: ((lang: 'he' | 'en') => void) | null): void {
  setter = fn;
}

export function switchLang(to: 'he' | 'en'): void {
  setter?.(to);
}
