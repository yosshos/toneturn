import { useCallback, useEffect, useState } from 'react';
import { STRINGS } from '../i18n/strings';
import { visibleStreak, type Progress, type Settings, DEFAULT_SETTINGS, emptyProgress } from '../storage/progress';
import { Home } from './Home';
import { LessonScreen } from './Lesson';
import { SettingsScreen } from './SettingsScreen';
import { Diagnostics } from './Diagnostics';
import { piano, SIMULATED, store, tts } from './services';

type Route = 'home' | 'lesson' | 'settings' | 'diagnostics';
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['settings', 'diagnostics'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
};

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [lessonKey, setLessonKey] = useState(0);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    void store.loadSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
    void store.loadProgress().then(setProgress);
    const onHash = () => setRoute((r) => (r === 'lesson' && routeFromHash() === 'home' ? 'lesson' : routeFromHash()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const s = settings ?? DEFAULT_SETTINGS;
  const t = STRINGS[s.uiLang];

  useEffect(() => {
    document.documentElement.lang = s.uiLang;
    document.documentElement.dir = s.uiLang === 'he' ? 'rtl' : 'ltr';
    const osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.dataset.motion = (s.reducedMotion ?? osReduce) ? 'reduced' : 'full';
  }, [s.uiLang, s.reducedMotion]);

  // Narration voice preferences apply to the single shared player.
  useEffect(() => {
    tts.prefs = { gender: s.voiceGender, voices: s.voices };
  }, [s.voiceGender, s.voices]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...(prev ?? DEFAULT_SETTINGS), ...patch };
        void store.saveSettings(next);
        return next;
      });
    },
    [],
  );

  const go = (r: Route) => {
    location.hash = r === 'home' || r === 'lesson' ? '' : `/${r}`;
    setRoute(r);
  };

  if (!settings) return <div className="boot" />;

  return (
    <div className="app">
      {SIMULATED && <div className="sim-banner">{t.simulated}</div>}
      {route === 'home' && (
        <Home
          t={t}
          settings={s}
          progress={progress}
          streak={visibleStreak(progress.streak, new Date())}
          onSettings={() => go('settings')}
          onMode={(mode) => updateSettings({ mode })}
          onLang={(l) => updateSettings({ uiLang: l, inputLang: l, outputLang: l })}
          onPractice={(consented) => {
            void piano.unlock(); // inside the Start gesture
            if (consented) updateSettings({ voiceConsent: true });
            setLessonKey((k) => k + 1);
            setAutoStart(true);
            setRoute('lesson');
          }}
          onButtonsInstead={() => {
            void piano.unlock();
            updateSettings({ mode: 'buttons' });
            setLessonKey((k) => k + 1);
            setAutoStart(true);
            setRoute('lesson');
          }}
        />
      )}
      {route === 'lesson' && (
        <LessonScreen
          key={lessonKey}
          t={t}
          settings={s}
          autoStart={autoStart}
          onMode={(mode) => updateSettings({ mode })}
          onExit={() => go('home')}
          onAgain={() => {
            setLessonKey((k) => k + 1);
            setAutoStart(true);
          }}
          onProgress={setProgress}
        />
      )}
      {route === 'settings' && <SettingsScreen t={t} settings={s} onChange={updateSettings} onBack={() => go('home')} />}
      {route === 'diagnostics' && <Diagnostics t={t} settings={s} onBack={() => go('home')} />}
    </div>
  );
}
