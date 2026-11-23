// Start-up of the translated locales (docs/SPEC-I18N.md): the chosen locale is remembered on this device (settings
// load later, from IndexedDB), so a Spanish player's first frame is already Spanish: the catalog loads before the app
// renders. ?lang=es (any locale code) forces one for a visit (tests, shared links). When the locale changes the app
// tree re-mounts under the new catalog (its texts were translated as they were built).
import { useEffect, useState, type ReactNode } from 'react';
import { isTranslated, LOCALES, type LocaleCode } from './locales';
import { catalogVersion, loadLocale, onCatalog } from './translate';

const KEY = 'tt-locale';
const isCode = (v: string | null | undefined): v is LocaleCode => !!v && LOCALES.some((l) => l.code === v);

/** ?lang=… for this visit, else the locale last used on this device. */
export function bootLocale(): LocaleCode | null {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (isCode(q)) return q;
    const v = localStorage.getItem(KEY);
    return isCode(v) ? v : null;
  } catch {
    return null;
  }
}

export function rememberLocale(c: LocaleCode): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* private mode */
  }
}

/** Switch the screen's language (loads the catalog; the gate re-mounts the app). A locale forced by ?lang= is for
 *  this visit only: not remembered. */
export function useLocale(c: LocaleCode, remember = true): void {
  useEffect(() => {
    if (remember) rememberLocale(c);
    void loadLocale(c);
  }, [c, remember]);
}

/** Renders the app once the remembered locale's catalog is in, and again (fresh) whenever the catalog changes. */
export function LocaleGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => !isTranslated(bootLocale()));
  const [v, setV] = useState(catalogVersion());
  useEffect(() => onCatalog(() => setV(catalogVersion())), []);
  useEffect(() => {
    const c = bootLocale();
    if (c && isTranslated(c)) void loadLocale(c).finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return <div key={v} style={{ display: 'contents' }}>{children}</div>;
}
