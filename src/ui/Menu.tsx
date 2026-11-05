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
  onNavigate: (r: 'friends' | 'settings' | 'diagnostics' | 'games' | 'classes' | 'placement' | 'truefalse' | 'achievements') => void;
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
          <button className="menu-link" onClick={() => onNavigate('placement')}>
            <span aria-hidden="true">🧭</span> {t.findLevel}
          </button>
          <button className="menu-link" onClick={() => onNavigate('friends')}>
            <span aria-hidden="true">👥</span> {t.friends}
          </button>
          <button className="menu-link" onClick={() => onNavigate('classes')}>
            <span aria-hidden="true">🏫</span> {t.classes}
          </button>
          <button className="menu-link" onClick={() => onNavigate('truefalse')}>
            <span aria-hidden="true">✓✗</span> {t.trueFalse} <span className="new-chip">{t.newChip}</span>
          </button>
          <button className="menu-link" onClick={() => onNavigate('achievements')}>
            <span aria-hidden="true">🏅</span> {t.achievementsTitle}
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

        {/* ---- What's new (latest version, in the chosen language) ---- */}
        <section className="menu-card whats-new-card">
          <h3>
            ✨ {t.whatsNewIn} <span dir="ltr">{APP_VERSION}</span>
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
