import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LESSON_ORDER, type LessonDef, type LessonId, type Question, type SkillId } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import { adaptPlacement, placementLesson, puzzleBand, reviewLesson, weekId, weeklyPuzzle } from '../engine/adaptive';
import { SkillMap } from './SkillMap';
import { PracticeTools } from './Tools';
import { MicIcon } from './bits';
import { STRINGS } from '../i18n/strings';
import { ratingsOf, visibleStreak, type Progress, type Settings, DEFAULT_SETTINGS, emptyProgress, migrateSettings } from '../storage/progress';
import { cloudConfigured, currentUser, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { Home, lessonStates } from './Home';
import { LessonScreen } from './Lesson';
import { SettingsScreen } from './SettingsScreen';
import { Diagnostics } from './Diagnostics';
import { GameScreen, GameSetup, type GameSetupValue } from './Games';
import { DailyScreen, DuelScreen, DuelSetup } from './Tournament';
import type { SetKind } from '../engine/tournament';
import type { GameKind } from '../game/memoryGame';
import { MenuSheet, Changelog } from './Menu';
import { FriendsScreen } from './Friends';
import { reportGameBest } from '../cloud/social';
import { APP_VERSION, unseenChanges } from '../version';
import { pwa } from '../pwa';
import { piano, SIMULATED, store, tts } from './services';

type Route = 'home' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay';
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
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
  const [duel, setDuel] = useState<{ names: string[]; kind: SetKind; rounds: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Generated session in progress (placement / review / weekly puzzle). */
  /** Voice-consent gate for sessions started outside the Practice button. */
  const [consentThen, setConsentThen] = useState<null | (() => void)>(null);
  const [generated, setGenerated] = useState<{ def: LessonDef; adapt?: (s: SessionState) => Question[] | null } | null>(null);
  const pwaState = useSyncExternalStore(pwa.subscribe, pwa.get);
  const [sync, setSync] = useState<SyncState>('idle');
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    void store.loadSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
    void store.loadProgress().then(setProgress);
    const onHash = () => setRoute((r) => ((r === 'lesson' || r === 'game' || r === 'duelplay') && routeFromHash() === 'home' ? r : routeFromHash()));
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

  const openGenerated = (def: LessonDef, adapt?: (s: SessionState) => Question[] | null, consented = false) => {
    if (!consented && s.mode === 'voice' && !s.voiceConsent) {
      setConsentThen(() => () => openGenerated(def, adapt, true));
      return;
    }
    void piano.unlock();
    setGenerated({ def, adapt });
    setLessonId(def.id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    location.hash = '';
    setRoute('lesson');
  };
  const openPlacement = () => {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    openGenerated(placementLesson(seed), (st) => adaptPlacement(st, seed));
  };
  const openReview = () => {
    const def = reviewLesson(progress.review, Date.now() >>> 0);
    if (def) openGenerated(def);
  };
  const openPuzzle = () => {
    const week = weekId(new Date());
    const fixed = progress.puzzles?.[week]?.band as Parameters<typeof weeklyPuzzle>[1] | undefined;
    openGenerated(weeklyPuzzle(week, fixed ?? puzzleBand(ratingsOf(progress))));
  };
  const practiceSkill = (k: SkillId) => {
    const map: Partial<Record<SkillId, LessonId>> = {
      degrees: (progress.lessons['bflat-two-homes']?.completions ?? 0) > 0 ? 'degrees-135' : 'bflat-two-homes',
      chords: 'major-minor',
      cadences: 'cadences',
      singing: 'sing-home-five',
      intervals: 'intervals',
      notes: 'notes-degrees',
      'rhythm-reading': 'rhythm-r1',
      'rhythm-dictation': 'rhythm-r1',
    };
    if (k === 'sequences') return openPuzzle();
    if (k === 'rhythm' || k === 'timing') {
      setGameKind('rhythm');
      return go('games');
    }
    openLesson(map[k] ?? 'bflat-two-homes');
  };

  const openLesson = (id: LessonId) => {
    void piano.unlock(); // inside the Start gesture
    setGenerated(null);
    setLessonId(id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    setRoute('lesson');
  };

  // First run: remember the current version silently and when this device started (untimed first week).
  useEffect(() => {
    if (settings && !settings.seenVersion) updateSettings({ seenVersion: APP_VERSION });
    if (settings && !settings.firstUseAt) updateSettings({ firstUseAt: new Date().toISOString() });
  }, [settings, updateSettings]);

  if (!settings) return <div className="boot" />;
  const news = unseenChanges(s.seenVersion);

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
          onMenu={() => setMenuOpen(true)}
          tools={<PracticeTools t={t} progress={progress} onSkills={() => go('skills')} onPlacement={openPlacement} onReview={openReview} onPuzzle={openPuzzle} onDaily={() => go('daily')} />}
          updateReady={pwaState.updateReady}
          news={
            news.length > 0 ? (
              <section className="news-card" role="status">
                <div className="news-head">
                  <b>✨ {t.whatsNew}</b>
                  <button className="icon-btn" aria-label={t.done} onClick={() => updateSettings({ seenVersion: APP_VERSION })}>
                    ✕
                  </button>
                </div>
                <Changelog lang={s.uiLang} entries={news} />
              </section>
            ) : null
          }
          onSettings={() => go('settings')}
          onDuel={() => go('duel')}
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
          onAgain={() => (generated?.def.id === 'placement' ? openPlacement() : generated?.def.id === 'review' ? openReview() : generated ? openPuzzle() : openLesson(lessonId))}
          lessonDef={generated?.def}
          adapt={generated?.adapt}
          nextLabel={generated ? t.seeSkillMap : undefined}
          onNext={generated ? () => go('skills') : canNext ? () => openLesson(nextId) : null}
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
      {route === 'friends' && <FriendsScreen t={t} user={user} sync={sync} onBack={() => go('home')} />}
      {route === 'skills' && <SkillMap t={t} progress={progress} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />}
      {consentThen && (
        <div className="sheet-backdrop" onClick={() => setConsentThen(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="consent2-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="consent2-title">
              <MicIcon /> {t.consentTitle}
            </h2>
            <p>{t.consentBody}</p>
            <button
              className="btn mega"
              autoFocus
              onClick={() => {
                const go2 = consentThen;
                setConsentThen(null);
                updateSettings({ voiceConsent: true });
                go2();
              }}
            >
              {t.consentAllow}
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                const go2 = consentThen;
                setConsentThen(null);
                updateSettings({ mode: 'buttons' });
                go2();
              }}
            >
              {t.consentButtons}
            </button>
          </div>
        </div>
      )}
      {menuOpen && (
        <MenuSheet
          t={t}
          settings={s}
          user={user}
          onClose={() => setMenuOpen(false)}
          onSettings={updateSettings}
          onNavigate={(r) => {
            setMenuOpen(false);
            go(r);
          }}
        />
      )}
      {route === 'games' && (
        <GameSetup
          t={t}
          initialKind={gameSetup?.kind ?? gameKind}
          progress={progress}
          settings={s}
          onSettings={updateSettings}
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
      {route === 'daily' && <DailyScreen t={t} settings={s} progress={progress} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'duel' && (
        <DuelSetup
          t={t}
          onBack={() => go('home')}
          onStart={(names, kind, rounds) => {
            setDuel({ names, kind, rounds });
            setGameKey((k) => k + 1);
            location.hash = '';
            setRoute('duelplay');
          }}
        />
      )}
      {route === 'duelplay' && duel && (
        <DuelScreen key={gameKey} t={t} settings={s} {...duel} onExit={() => go('home')} onRematch={() => setGameKey((k) => k + 1)} />
      )}
      {route === 'game' && gameSetup && (
        <GameScreen
          key={gameKey}
          t={t}
          settings={s}
          setup={gameSetup}
          onExit={() => go('home')}
          onChangePlayers={() => go('games')}
          onProgress={(p) => {
            setProgress(p);
            if (user && p.games) {
              void reportGameBest('melody', p.games.melody).catch(() => {});
              void reportGameBest('rhythm', p.games.rhythm).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
