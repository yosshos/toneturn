import { useEffect, useState, useSyncExternalStore } from 'react';
import { APP_BUILT, APP_COMMIT, APP_VERSION, CHANGELOG } from '../version';
import { checkForUpdate, pwa } from '../pwa';
import { disablePush, enablePush, pushStatus, updatePushPrefs, type PushStatus } from '../cloud/social';
import type { CloudUser } from '../cloud/cloud';
import { cloudConfigured } from '../cloud/cloud';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';

interface Props {
  t: Strings;
  settings: Settings;
  user: CloudUser | null;
  onClose: () => void;
  onNavigate: (r: 'tuner' | 'metronome' | 'friends' | 'settings' | 'diagnostics' | 'games' | 'classes' | 'placement' | 'truefalse' | 'achievements' | 'studio') => void;
  onSettings: (p: Partial<Settings>) => void;
}

/** Line icons for the menu rows (mature, clean UI — owner 2026-11-07: the old grid looked bad). */
const MENU_ICON: Record<string, React.ReactNode> = {
  level: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M2.8 19.5c.6-3.1 3.1-5 6.2-5s5.6 1.9 6.2 5M16.3 5.8a3.2 3.2 0 0 1 0 6.3M17.4 14.7c2.2.5 3.6 2.2 3.9 4.8" />
    </>
  ),
  class: (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
      <path d="M7 11.5v4.2c1.4 1.3 3.1 1.9 5 1.9s3.6-.6 5-1.9v-4.2M21 9.5V15" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5" />
      <path d="M9 3h6l-1.6 6.6M9 3l1.6 6.6M12 12.2v4.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  tuner: (
    <>
      <path d="M4.5 16a8 8 0 0 1 15 0" />
      <path d="M12 16l3.5-6.5" />
      <circle cx="12" cy="16" r="1.2" />
    </>
  ),
  metronome: (
    <>
      <path d="M8.5 3h7l4 18h-15z" />
      <path d="M12 16l4.5-9M6.5 16h11" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
};
const MenuIcon = ({ k }: { k: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {MENU_ICON[k]}
  </svg>
);

export function MenuSheet({ t, settings, user, onClose, onNavigate, onSettings }: Props) {
  const p = useSyncExternalStore(pwa.subscribe, pwa.get);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const lang = settings.uiLang;

  useEffect(() => {
    void pushStatus().then(setPush);
  }, []);

  const notifText =
    push === 'on'
      ? t.notifOn
      : push === 'denied'
        ? t.notifDenied
        : push === 'unsupported'
          ? t.notifUnsupported
          : push === 'needs-install'
            ? t.notifNeedsInstall
            : push === 'no-sw'
              ? t.notifNoSw
              : t.remindWhy;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet menu-sheet" role="dialog" aria-modal="true" aria-label={t.menu} onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h2>{t.menu}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.back}>
            ✕
          </button>
        </div>

        <nav className="menu-links">
          {(
            [
              ['placement', 'level', t.findLevel],
              ['tuner', 'tuner', lang === 'he' ? 'טיונר' : 'Tuner'],
              ['metronome', 'metronome', lang === 'he' ? 'מטרונום' : 'Metronome'],
              ['friends', 'friends', t.friends],
              ['classes', 'class', t.classes],
              ['achievements', 'medal', t.achievementsTitle],
              ['settings', 'gear', t.settings],
              ['diagnostics', 'mic', t.diagnostics],
            ] as const
          ).map(([to, icon, label]) => (
            <button key={to} className="menu-link" onClick={() => onNavigate(to)}>
              <span className="ml-icon" aria-hidden="true">
                <MenuIcon k={icon} />
              </span>
              <span className="ml-text">{label}</span>
              <span className="ml-chev flip-rtl" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </nav>

        {/* ---- Notifications ---- */}
        <section className="menu-card">
          <h3>{t.notifications}</h3>
          <p className="field-hint">{!user && cloudConfigured ? t.notifNeedsSignIn : notifText}</p>
          {user && (push === 'off' || push === 'on') && (
            <div className="row">
              <label className="hour-pick">
                {t.remindAt}{' '}
                <select
                  value={settings.reminderHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    onSettings({ reminderHour: h });
                    if (push === 'on') void updatePushPrefs(settings.outputLang, h);
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              {push === 'off' ? (
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setPush(await enablePush(settings.outputLang, settings.reminderHour));
                    } catch {
                      setPush(await pushStatus());
                    }
                    setBusy(false);
                  }}
                >
                  {t.turnOn}
                </button>
              ) : (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await disablePush().catch(() => {});
                    setPush(await pushStatus());
                    setBusy(false);
                  }}
                >
                  {t.turnOff}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ---- What's new (latest version, in the chosen language) ---- */}
        <section className="menu-card whats-new-card">
          <h3>
            {t.whatsNewIn} <span dir="ltr">{APP_VERSION}</span>
          </h3>
          <Changelog lang={lang} entries={CHANGELOG.slice(0, 1)} bare />
          <p className="version-line" dir="ltr">
            {t.version} <b>{APP_VERSION}</b> · {APP_COMMIT}
            {APP_BUILT && <> · {new Date(APP_BUILT).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')}</>}
          </p>
          <div className="row">
            {p.swSupported && import.meta.env.PROD && !p.updateReady && (
              <button className="btn ghost small" disabled={p.checking} onClick={async () => setChecked(await checkForUpdate())}>
                {p.checking ? t.checking : t.checkUpdates}
              </button>
            )}
            {checked === false && <span className="field-hint">✓ {t.upToDate}</span>}
            <button className="btn ghost small" onClick={() => setShowLog((x) => !x)} aria-expanded={showLog}>
              {t.allVersions}
            </button>
          </div>
          {showLog && <Changelog lang={lang} entries={CHANGELOG.slice(1)} />}
        </section>
      </div>
    </div>
  );
}

export function Changelog({ lang, entries = CHANGELOG, bare = false }: { lang: 'he' | 'en'; entries?: typeof CHANGELOG; bare?: boolean }) {
  return (
    <ol className={`changelog ${bare ? 'bare' : ''}`}>
      {entries.map((c) => (
        <li key={c.version}>
          {!bare && (
            <>
              <b dir="ltr">{c.version}</b> <small>{c.date}</small>
            </>
          )}
          <ul>
            {c[lang].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
