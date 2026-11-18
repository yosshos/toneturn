// Quick language switch (owner 2026-11-18): globe + the language it switches to ("EN" / "עב"), in the top bar and on the
// welcome screen. One tap flips the whole app; Settings keeps the full language options.
import { Icon } from './icons';
import { switchLang } from './langSwitch';
import '../install.css';

export function LangButton({ lang }: { lang: 'he' | 'en' }) {
  const to = lang === 'he' ? 'en' : 'he';
  return (
    <button type="button" className="icon-btn hdr-action lang-btn" onClick={() => switchLang(to)} aria-label={to === 'en' ? 'Switch to English' : 'החלפה לעברית'} title={to === 'en' ? 'English' : 'עברית'} data-lang-btn="1">
      <Icon k="globe" size={19} />
      <span className="lang-to" lang={to}>
        {to === 'en' ? 'EN' : 'עב'}
      </span>
    </button>
  );
}
