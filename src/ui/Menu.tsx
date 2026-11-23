import { useEffect, useState, useSyncExternalStore } from 'react';
import { APP_BUILT, APP_COMMIT, APP_VERSION, CHANGELOG } from '../version';
import { applyUpdate, checkForUpdate, pwa } from '../pwa';
import { disablePush, enablePush, pushStatus, updatePushPrefs, type PushStatus } from '../cloud/social';
import type { CloudUser } from '../cloud/cloud';
import { cloudConfigured } from '../cloud/cloud';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { Icon, type IconKey } from './icons';
import { intlTag } from '../i18n/translate';

interface Props {
  t: Strings;
  settings: Settings;
  user: CloudUser | null;
  onClose: () => void;
  onNavigate: (r: 'tuner' | 'metronome' | 'drone' | 'friends' | 'settings' | 'diagnostics' | 'games' | 'classes' | 'placement' | 'truefalse' | 'achievements' | 'studio' | 'exams' | 'improv' | 'charts' | 'groove' | 'slowdown') => void;
  onSettings: (p: Partial<Settings>) => void;
  /** 0.61: what's new and the month review moved here from the top bar. */
  extra?: React.ReactNode;
}

/** The menu rows' symbols (Paper chrome cut, 2026-11-16). */
const MENU_ICON: Record<string, IconKey> = {
  level: 'compass',
  friends: 'people',
  class: 'cap',
  medal: 'medal',
  gear: 'settings',
  tuner: 'gauge',
  metronome: 'metronome',
  drone: 'levels',
  note: 'quaver',
  chart: 'chordgrid',
  groove: 'wave',
  slowdown: 'clock',
  mic: 'mic',
};
const MenuIcon = ({ k }: { k: string }) => <Icon k={MENU_ICON[k] ?? 'quaver'} size={20} />;

export function MenuSheet({ t, settings, user, onClose, onNavigate, onSettings, extra }: Props) {
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
          {extra && <div className="menu-extra">{extra}</div>}
          <button className="icon-btn menu-close" onClick={onClose} aria-label={t.back}>
            <Icon k="close" />
          </button>
        </div>

        {/* Grouped by what you do (owner 2026-11-08: the old list mixed the level test, settings and tools) */}
        {(
          [
            [lang === 'he' ? 'כלים' : 'Tools', [
              ['tuner', 'tuner', lang === 'he' ? 'טיונר' : 'Tuner'],
              ['metronome', 'metronome', lang === 'he' ? 'מטרונום' : 'Metronome'],
              ['drone', 'drone', lang === 'he' ? 'צליל רקע' : 'Drone'],
              ['groove', 'groove', lang === 'he' ? 'מאמן גרוב' : 'Groove trainer'],
              ['slowdown', 'slowdown', lang === 'he' ? 'האטה ולופ' : 'Slow down & loop'],
            ]],
            [lang === 'he' ? 'בדיקה' : 'Check yourself', [
              ['placement', 'level', t.findLevel],
              ['diagnostics', 'mic', t.diagnostics],
            ]],
            [lang === 'he' ? 'אני' : 'You', [
              ['achievements', 'medal', t.achievementsTitle],
              ['settings', 'gear', t.settings],
            ]],
          ] as const
        ).map(([title, rows]) => (
          <section key={title} className="menu-group">
            <h3 className="menu-group-h">{title}</h3>
            <nav className="menu-links">
              {rows.map(([to, icon, label]) => (
                <button key={to} className="menu-link" onClick={() => onNavigate(to)} data-menu={to}>
                  <span className="ml-icon" aria-hidden="true">
                    <MenuIcon k={icon} />
                  </span>
                  <span className="ml-text">{label}</span>
                  <span className="ml-chev" aria-hidden="true">
                    <Icon k="fwd" />
                  </span>
                </button>
              ))}
            </nav>
          </section>
        ))}

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
            {APP_BUILT && <> · {new Date(APP_BUILT).toLocaleDateString(intlTag(lang === 'he' ? 'he' : 'en', 'en-GB'))}</>}
          </p>
          <div className="row">
            {p.updateReady && (
              <button className="btn small" onClick={() => applyUpdate()} data-menu-update="1">
                {t.updateReady} · {t.updateShort}
              </button>
            )}
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
