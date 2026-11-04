import { useCallback, useEffect, useRef, useState } from 'react';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { STRINGS } from '../i18n/strings';
import { visibleStreak, type Progress, type Settings, DEFAULT_SETTINGS, emptyProgress, migrateSettings } from '../storage/progress';
import { cloudConfigured, currentUser, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { Home, lessonStates } from './Home';
import { LessonScreen } from './Lesson';
import { SettingsScreen } from './SettingsScreen';
import { Diagnostics } from './Diagnostics';
import { GameScreen, GameSetup, type GameSetupValue } from './Games';
import type { GameKind } from '../game/memoryGame';
import { piano, SIMULATED, store, tts } from './services';

type Route = 'home' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game';
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['settings', 'diagnostics', 'games'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
};

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [lessonKey, setLessonKey] = useState(0);
  const [lessonId, setLessonId] = useState<LessonId>('bflat-two-homes');
  const [autoStart, setAutoStart] = useState(false);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [gameKind, setGameKind] = useState<GameKind>('melody');
  const [gameSetup, setGameSetup] = useState<GameSetupValue | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [sync, setSync] = useState<SyncState>('idle');
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    void store.loadSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
    void store.loadProgress().then(setProgress);
    const onHash = () => setRoute((r) => ((r === 'lesson' || r === 'game') && routeFromHash() === 'home' ? r : routeFromHash()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ---- cloud: optional sign-in + sync (never blocks local play) ----
  const runSync = useCallback(async () => {
    if (!cloudConfigured || SIMULATED) return;
    setSync('syncing');
    try {
      const local = await store.loadProgress();
      const merged = await syncProgress(local);
      await store.saveProgress(merged);
      setProgress(merged);
      setSync('synced');
    } catch (e) {
      console.warn('[toneturn] sync failed', e);
      setSync('error');
    }
  }, []);

  useEffect(() => {
    if (!cloudConfigured || SIMULATED) return;
    void currentUser().then(setUser);
    return onAuthChange(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const remote = await pullSettings(user.id).catch(() => null);
      if (remote) setSettings((prev) => migrateSettings({ ...(prev ?? DEFAULT_SETTINGS), ...remote, voiceConsent: prev?.voiceConsent ?? false }));
      await runSync();
    })();
  }, [user, runSync]);

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
        if (user) void pushSettings(user.id, next).catch(() => {});
        return next;
      });
    },
    [user],
  );

  const go = (r: Route) => {
    location.hash = r === 'home' || r === 'lesson' || r === 'game' ? '' : `/${r}`;
    setRoute(r);
  };

  const openLesson = (id: LessonId) => {
    void piano.unlock(); // inside the Start gesture
    setLessonId(id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    setRoute('lesson');
  };

  if (!settings) return <div className="boot" />;

  const states = lessonStates(progress);
  const idx = LESSON_ORDER.indexOf(lessonId);
  const nextId = LESSON_ORDER[idx + 1];
  const canNext = nextId && states[nextId] !== 'locked';

  return (
    <div className="app">
      {SIMULATED && <div className="sim-banner">{t.simulated}</div>}
      {route === 'home' && (
        <Home
          t={t}
          settings={s}
          progress={progress}
          streak={visibleStreak(progress.streak, new Date())}
          account={<AccountCard t={t} user={user} sync={sync} compact />}
          onSettings={() => go('settings')}
          onGame={(k) => {
            setGameKind(k);
            go('games');
          }}
          onMode={(mode) => updateSettings({ mode })}
          onLang={(l) => updateSettings({ uiLang: l, inputLang: l, outputLang: l })}
          onPractice={(id, consented) => {
            if (consented) updateSettings({ voiceConsent: true });
            openLesson(id);
          }}
          onButtonsInstead={(id) => {
            updateSettings({ mode: 'buttons' });
            openLesson(id);
          }}
        />
      )}
      {route === 'lesson' && (
        <LessonScreen
          key={lessonKey}
          t={t}
          lessonId={lessonId}
          settings={s}
          autoStart={autoStart}
          onMode={(mode) => updateSettings({ mode })}
          onExit={() => go('home')}
          onAgain={() => openLesson(lessonId)}
          onNext={canNext ? () => openLesson(nextId) : null}
          onProgress={(p) => {
            setProgress(p);
            if (user) void runSync();
          }}
        />
      )}
      {route === 'settings' && (
        <SettingsScreen t={t} settings={s} onChange={updateSettings} onBack={() => go('home')} account={<AccountCard t={t} user={user} sync={sync} />} />
      )}
      {route === 'diagnostics' && <Diagnostics t={t} settings={s} onBack={() => go('home')} />}
      {route === 'games' && (
        <GameSetup
          t={t}
          initialKind={gameSetup?.kind ?? gameKind}
          progress={progress}
          onBack={() => go('home')}
          onStart={(v) => {
            void piano.unlock(); // the Start gesture
            setGameSetup(v);
            setGameKey((k) => k + 1);
            location.hash = '';
            setRoute('game');
          }}
        />
      )}
      {route === 'game' && gameSetup && (
        <GameScreen key={gameKey} t={t} settings={s} setup={gameSetup} onExit={() => go('home')} onChangePlayers={() => go('games')} onProgress={setProgress} />
      )}
    </div>
  );
}
