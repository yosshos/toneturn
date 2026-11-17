// Install the app (2026-11-17): one labelled pill — the logo tile, an arrow and "התקנה" — wherever install makes sense
// (top bar of the main tabs, the welcome screen). Uses the browser's own prompt when it has one; otherwise (iPhone,
// Firefox, a prompt already used) a short sheet with the three steps. Hidden once the app is installed.
import { useState, useSyncExternalStore } from 'react';
import { pwa, promptInstall } from '../../pwa';
import { INSTALL_TEXT } from '../../i18n/installText';
import { Icon } from '../icons';
import { Logo } from './Logo';
import '../../install.css';

export function useCanOfferInstall(): boolean {
  const p = useSyncExternalStore(pwa.subscribe, pwa.get);
  return !p.installed && (p.canInstall || p.iosManual || import.meta.env.PROD);
}

export function InstallButton({ lang, className = '' }: { lang: 'he' | 'en'; className?: string }) {
  const p = useSyncExternalStore(pwa.subscribe, pwa.get);
  const [howTo, setHowTo] = useState(false);
  const tx = INSTALL_TEXT[lang];
  if (p.installed || !(p.canInstall || p.iosManual || import.meta.env.PROD)) return null;
  const open = async () => {
    if (p.canInstall) {
      const r = await promptInstall();
      if (r !== 'unavailable') return;
    }
    setHowTo(true);
  };
  const steps = p.iosManual ? tx.ios : tx.other;
  return (
    <>
      <button type="button" className={`install-pill ${className}`} onClick={() => void open()} aria-label={tx.title} title={tx.title} data-install-btn="1">
        <Icon k="download" size={17} />
        <span>{tx.short}</span>
      </button>
      {howTo && (
        <div className="sheet-backdrop" onClick={() => setHowTo(false)}>
          <div className="sheet install-sheet2" role="dialog" aria-modal="true" aria-label={tx.title} onClick={(e) => e.stopPropagation()}>
            <div className="is-head">
              <Logo size={52} />
              <h2>{tx.title}</h2>
            </div>
            <p className="is-lead">{tx.lead}</p>
            <ol className="is-steps">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <button type="button" className="btn primary" onClick={() => setHowTo(false)}>
              {tx.done}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
