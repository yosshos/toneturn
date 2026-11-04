import { useEffect, useState, useSyncExternalStore } from 'react';
import { APP_BUILT, APP_COMMIT, APP_VERSION, CHANGELOG } from '../version';
import { applyUpdate, checkForUpdate, promptInstall, pwa } from '../pwa';
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
  onNavigate: (r: 'friends' | 'settings' | 'diagnostics' | 'games' | 'classes') => void;
  onSettings: (p: Partial<Settings>) => void;
}

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
          <button className="menu-link" onClick={() => onNavigate('friends')}>
            <span aria-hidden="true">👥</span> {t.friends}
          </button>
          <button className="menu-link" onClick={() => onNavigate('classes')}>
            <span aria-hidden="true">🏫</span> {t.classes}
          </button>
          <button className="menu-link" onClick={() => onNavigate('games')}>
            <span aria-hidden="true">🎮</span> {t.games}
          </button>
          <button className="menu-link" onClick={() => onNavigate('settings')}>
            <span aria-hidden="true">⚙</span> {t.settings}
          </button>
          <button className="menu-link" onClick={() => onNavigate('diagnostics')}>
            <span aria-hidden="true">🎙</span> {t.diagnostics}
          </button>
        </nav>

        {/* ---- Notifications ---- */}
        <section className="menu-card">
          <h3>🔔 {t.notifications}</h3>
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

        {/* ---- Install ---- */}
        <section className="menu-card">
          <h3>📲 {t.installApp}</h3>
          {p.installed ? (
            <p className="field-hint">✓ {t.installed}</p>
          ) : p.canInstall ? (
            <button className="btn primary" onClick={() => void promptInstall()}>
              {t.installApp}
            </button>
          ) : (
            <p className="field-hint">{p.iosManual ? t.installIos : t.installHint}</p>
          )}
        </section>

        {/* ---- Version & updates ---- */}
        <section className="menu-card">
          <h3>⟳ {t.updates}</h3>
          <p className="version-line" dir="ltr">
            {t.version} <b>{APP_VERSION}</b> · {APP_COMMIT}
            {APP_BUILT && <> · {new Date(APP_BUILT).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')}</>}
          </p>
          {p.updateReady ? (
            <>
              <p className="field-hint good">{t.updateReady}</p>
              <button className="btn mega" onClick={() => applyUpdate()}>
                {t.updateNow}
              </button>
            </>
          ) : p.swSupported && import.meta.env.PROD ? (
            <div className="row">
              <button
                className="btn"
                disabled={p.checking}
                onClick={async () => {
                  setChecked(await checkForUpdate());
                }}
              >
                {p.checking ? t.checking : t.checkUpdates}
              </button>
              {checked === false && <span className="field-hint">✓ {t.upToDate}</span>}
            </div>
          ) : (
            <p className="field-hint">{t.updatesDevOnly}</p>
          )}
          <button className="btn ghost small" onClick={() => setShowLog((x) => !x)} aria-expanded={showLog}>
            {t.whatsNew}
          </button>
          {showLog && <Changelog lang={lang} />}
        </section>
      </div>
    </div>
  );
}

export function Changelog({ lang, entries = CHANGELOG }: { lang: 'he' | 'en'; entries?: typeof CHANGELOG }) {
  return (
    <ol className="changelog">
      {entries.map((c) => (
        <li key={c.version}>
          <b dir="ltr">{c.version}</b> <small>{c.date}</small>
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
