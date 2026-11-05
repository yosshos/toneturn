import { MiniGateContext, MiniLessonPlayer } from './MiniLesson';
import { LearnedScreen, learnedCount } from './Learned';
import { lessonForUnit } from '../content/minilessons';
import type { MiniLesson } from '../content/miniTypes';
import { PerformScreen } from './Perform';
import { topicLesson } from '../engine/topics';
import { SingAlongScreen } from './SingAlong';
import { AchievementsScreen } from './Extras';
import { absoluteLesson, modesLesson, MODE_ID_LEVELS, wrongNotesLesson } from '../engine/lesson';
import { TrueFalseScreen } from './TrueFalse';
import { FreezeToast, StreakSheet } from './Streak';
import { canBuy, canBuyCosmetic, ownsCosmetic } from '../engine/streak';
import { modesLevelFor, recommendFor } from '../engine/recommend';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useMemo } from 'react';
import { LESSON_ORDER, runLevelFor, runsWorkshop, type LessonDef, type LessonId, type Question, type SkillId } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import { adaptPlacement, placementLesson, puzzleBand, reviewLesson, weekId, weeklyPuzzle } from '../engine/adaptive';
import { SkillMap } from './SkillMap';
import { PracticeTools } from './Tools';
import { MicIcon } from './bits';
import { STRINGS } from '../i18n/strings';
import { gemsOf, lessonMastered, localDay, ratingsOf, type Progress, type Settings, DEFAULT_SETTINGS, emptyProgress, migrateSettings } from '../storage/progress';
import { cloudConfigured, currentUser, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { Home, lessonStates } from './Home';
import { LessonScreen } from './Lesson';
import { SettingsScreen } from './SettingsScreen';
import { Diagnostics } from './Diagnostics';
import { GameScreen, GameSetup, type GameSetupValue } from './Games';
import { VocalScreen } from './Vocal';
import { DailyScreen, DuelScreen, DuelSetup, GhostScreen } from './Tournament';
import { OnlineScreen, PENDING_ONLINE_KEY } from './Online';
import { DroneScreen } from './Drone';
import { AssignedCard, ClassesScreen } from './Classes';
import { myClasses, openAssignments } from '../cloud/classes';
import type { SetKind } from '../engine/tournament';
import type { GameKind } from '../game/memoryGame';
import { MenuSheet, Changelog } from './Menu';
import { FriendsScreen } from './Friends';
import { reportGameBest, reportRating, reportStreakDays } from '../cloud/social';
import { overallRating } from '../engine/rating';
import { APP_VERSION, unseenChanges } from '../version';
import { pwa } from '../pwa';
import { params, piano, setMidiEnabled, SIMULATED, store, tts } from './services';
import { midi } from '../speech/midi';

type Route = 'home' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay' | 'online' | 'drone' | 'classes' | 'ghost' | 'truefalse' | 'vocal' | 'achievements' | 'singalong' | 'perform' | 'learned';
/** Invite links: #/online/CODE */
const onlineCodeFromHash = () => (/^#\/?online\/(\w+)/.exec(location.hash)?.[1] ?? '');
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '').replace(/^online\/.*$/, 'online');
  return (['settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost', 'truefalse', 'vocal', 'achievements', 'singalong', 'perform', 'learned'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
};

/** The level a generated modes lesson was made at (from its first question's pool size). */
const modesAgainLevel = (def: { questions: { choices: unknown[]; difficulty: number }[] }) => {
  const d = def.questions[0]?.difficulty ?? 900;
  const i = MODE_ID_LEVELS.findIndex((_, k) => d < (MODE_ID_LEVELS[k + 1]?.base ?? Infinity));
  return Math.max(1, i + 1);
};

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [vocalWarmup, setVocalWarmup] = useState(false);
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [lessonKey, setLessonKey] = useState(0);
  const [lessonId, setLessonId] = useState<LessonId>('bflat-two-homes');
  const [autoStart, setAutoStart] = useState(false);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [gameKind, setGameKind] = useState<GameKind>('melody');
  const [gameSetup, setGameSetup] = useState<GameSetupValue | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [onlineCode, setOnlineCode] = useState(onlineCodeFromHash);
  const [onlineKey, setOnlineKey] = useState(0);
  const [duel, setDuel] = useState<{ names: string[]; kind: SetKind; rounds: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Generated session in progress (placement / review / weekly puzzle). */
  /** Voice-consent gate for sessions started outside the Practice button. */
  const [consentThen, setConsentThen] = useState<null | (() => void)>(null);
  const [generated, setGenerated] = useState<{ def: LessonDef; adapt?: (s: SessionState) => Question[] | null } | null>(null);
  const pwaState = useSyncExternalStore(pwa.subscribe, pwa.get);
  const [sync, setSync] = useState<SyncState>('idle');
  // MIDI keyboard input (Settings): singing tasks capture from the keyboard.
  useEffect(() => {
    setMidiEnabled(!!settings?.midiInput);
    if (settings?.midiInput && midi.supported) void midi.enable().catch(() => {});
  }, [settings?.midiInput]);
  // Class assignments for the Home card (signed in only).
  const [assigned, setAssigned] = useState<ReturnType<typeof openAssignments>>([]);
  useEffect(() => {
    if (!user || route !== 'home') return;
    void myClasses()
      .then((c) => setAssigned(openAssignments(c)))
      .catch(() => {});
  }, [user, route]);
  // Report the overall rating (spec L.2) whenever it changes while signed in; silent if the server lacks it.
  const reported = useRef<string>('');
  useEffect(() => {
    if (!user) return;
    const o = overallRating(ratingsOf(progress));
    if (!o) return;
    const key = `${user.id}:${o.r}:${o.provisional}`;
    if (reported.current === key) return;
    reported.current = key;
    void reportRating(o.r, o.provisional).catch(() => {});
  }, [user, progress]);
  // Streak 2.0 & gems (spec N): derived from progress + the synced purchase list.
  const [streakOpen, setStreakOpen] = useState(false);
  const gems = useMemo(() => gemsOf(progress, settings?.purchases ?? []), [progress, settings?.purchases]);
  const buyCosmetic = (item: string) => {
    const purchases = settings?.purchases ?? [];
    if (!canBuyCosmetic(item, gems.balance, purchases)) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    updateSettings({ purchases: [...purchases, { id, kind: 'cosmetic', item, day: localDay(new Date()) }], theme: item.replace(/^theme-/, '') });
  };
  const buy = (kind: 'freeze' | 'repair') => {
    const purchases = settings?.purchases ?? [];
    if (!canBuy(kind, gems.balance, gems.streak)) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    updateSettings({ purchases: [...purchases, { id, kind, day: localDay(new Date()) }] });
  };
  const lastFreeze = gems.streak.freezeDays.at(-1) ?? null;
  const reportedDays = useRef('');
  useEffect(() => {
    if (!user) return;
    const days = [...gems.streak.freezeDays.map((day) => ({ day, kind: 'freeze' as const })), ...gems.streak.repairedDays.map((day) => ({ day, kind: 'repair' as const }))];
    const key = `${user.id}:${days.map((d) => d.day).join(',')}`;
    if (!days.length || reportedDays.current === key) return;
    reportedDays.current = key;
    void reportStreakDays(days).catch(() => {});
  }, [user, gems.streak.freezeDays, gems.streak.repairedDays]);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    void store.loadSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
    void store.loadProgress().then(setProgress);
    // Back from Google sign-in that started on the online screen.
    try {
      const pending = sessionStorage.getItem(PENDING_ONLINE_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_ONLINE_KEY);
        setOnlineCode(pending === '-' ? '' : pending);
        location.hash = pending === '-' ? '/online' : `/online/${pending}`;
        setRoute('online');
      }
    } catch {
      /* storage unavailable */
    }
    const onHash = () => {
      if (routeFromHash() === 'online') setOnlineCode(onlineCodeFromHash());
    };
    window.addEventListener('hashchange', onHash);
    const onHashRoute = () => setRoute((r) => ((r === 'lesson' || r === 'game' || r === 'duelplay') && routeFromHash() === 'home' ? r : routeFromHash()));
    window.addEventListener('hashchange', onHashRoute);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('hashchange', onHashRoute);
    };
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
      if (remote)
        setSettings((prev) => {
          // Gem purchases are append-only: keep the union of both devices (by id).
          const all = [...(prev?.purchases ?? []), ...((remote as Partial<Settings>).purchases ?? [])];
          const purchases = all.filter((x, i) => all.findIndex((y) => y.id === x.id) === i);
          return migrateSettings({ ...(prev ?? DEFAULT_SETTINGS), ...remote, purchases, voiceConsent: prev?.voiceConsent ?? false });
        });
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
  // Colour theme (cosmetic): only an owned one applies.
  const themeId = s.theme && ownsCosmetic(s.purchases ?? [], `theme-${s.theme}`) ? s.theme : 'violet';
  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

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

  // Mini-lessons (spec X): a unit opens with its short lesson until the player has heard it to the end.
  const [mini, setMini] = useState<{ lesson: MiniLesson; then: () => void } | null>(null);
  const playerFirstName = user?.name ? user.name.split(' ')[0] : null;
  const markLearned = (id: string) => updateSettings({ learned: { ...(settings?.learned ?? {}), [id]: new Date().toISOString() } });
  const gate = (unit: string | null, start: () => void) => {
    const l = unit ? lessonForUnit(unit) : null;
    const cur = settings;
    // Test runs (simulator, unlocked) skip them unless asked for with ?mini.
    const auto = (cur?.miniLessons ?? true) && (!(SIMULATED || params.has('unlock')) || params.has('mini'));
    if (!l || !auto || cur?.learned?.[l.id]) return start();
    void piano.unlock();
    setMini({ lesson: l, then: start });
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
    openGenerated(placementLesson(seed, { singing: s.mode === 'voice' }), (st) => adaptPlacement(st, seed));
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
  const openModes = (level: number) => gate('modes', () => openGenerated(modesLesson(level, Date.now() >>> 0)));
  const openAbsolute = (level: number) => gate('absolute-pitch', () => openGenerated(absoluteLesson(level, Date.now() >>> 0)));
  const openTopic = (topic: string, level: number) => gate(`topic:${topic}`, () => openGenerated(topicLesson(topic, level, Date.now() >>> 0)));
  const [vocalLevel, setVocalLevel] = useState<number | null>(null);
  /** Class assignments: path lessons and generated practice (vocal levels, modes, wrong notes). */
  const openAssignment = (id: string) => {
    if ((LESSON_ORDER as string[]).includes(id)) return openLesson(id as LessonId);
    const m = /^vocal-(modes-|harmony-|barry-|sight-|orn-)?(\d+)$/.exec(id);
    if (m) {
      setVocalWarmup(false);
      setVocalLevel((m[1] === 'modes-' ? 100 : m[1] === 'harmony-' ? 200 : m[1] === 'barry-' ? 300 : m[1] === 'sight-' ? 400 : m[1] === 'orn-' ? 500 : 0) + Number(m[2]));
      return go('vocal');
    }
    if (id === 'modes') return openModes(modesLevelFor(ratingsOf(progress).modes?.n ? ratingsOf(progress).modes!.r : null));
    if (id === 'wrong-notes') return openWrongNotes(1);
  };
  const [wrongLevel, setWrongLevel] = useState(1);
  const openWrongNotes = (level: number) =>
    gate('wrong-notes', () => {
      setWrongLevel(level);
      openGenerated(wrongNotesLesson(level, Date.now() >>> 0));
    });
  const openRuns = () =>
    gate('runs', () => {
      const r = ratingsOf(progress).agility;
      openGenerated(runsWorkshop(runLevelFor(r?.n ? r.r : null)));
    });
  // Practise a skill at the player's level: the lesson on that skill's ladder that fits their rating.
  const practiceSkill = (k: SkillId) => {
    const rec = recommendFor(k, ratingsOf(progress), (id) => lessonMastered(progress, id));
    if (rec.kind === 'puzzle') return openPuzzle();
    if (rec.kind === 'runs-workshop') return openRuns();
    if (rec.kind === 'modes') return openModes(rec.level);
    if (rec.kind === 'absolute') return openAbsolute(1);
    if (rec.kind === 'vocal') {
      setVocalWarmup(false);
      return go('vocal');
    }
    if (rec.kind === 'rhythm-game') {
      setGameKind('rhythm');
      return go('games');
    }
    openLesson(rec.lessonId);
  };

  const openLesson = (id: LessonId) => gate(id, () => openLessonNow(id));
  const openLessonNow = (id: LessonId) => {
    void piano.unlock(); // inside the Start gesture
    setGenerated(null);
    setLessonId(id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    setRoute('lesson');
  };

  // Instrument sound (spec Q): load the chosen sample set (falls back to the classic piano on failure).
  const soundId = settings?.sound ?? 'classic';
  useEffect(() => {
    void piano.setSound(soundId);
  }, [soundId]);
  const droneSoundId = settings?.droneSound ?? 'soft';
  useEffect(() => {
    void piano.setDroneSound(droneSoundId);
  }, [droneSoundId]);

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
    <MiniGateContext.Provider value={gate}>
    <div className="app">
      {SIMULATED && <div className="sim-banner">{t.simulated}</div>}
      {mini && (
        <MiniLessonPlayer
          t={t}
          settings={s}
          lesson={mini.lesson}
          name={playerFirstName}
          onFinish={(heardAll) => {
            if (heardAll) markLearned(mini.lesson.id);
            const then = mini.then;
            setMini(null);
            then();
          }}
        />
      )}
      {route === 'learned' && <LearnedScreen t={t} settings={s} name={playerFirstName} onLearned={markLearned} onBack={() => go('home')} />}
      {route === 'home' && (
        <Home
          t={t}
          settings={s}
          progress={progress}
          streak={gems.streak}
          onStreak={() => setStreakOpen(true)}
          account={<AccountCard t={t} user={user} sync={sync} compact />}
          onMenu={() => setMenuOpen(true)}
          tools={<>{user && <AssignedCard t={t} items={assigned} lang={s.uiLang} onOpen={(id) => openAssignment(id)} />}<PracticeTools t={t} progress={progress} onSkills={() => go('skills')} onPlacement={openPlacement} onReview={openReview} onPuzzle={openPuzzle} onDaily={() => go('daily')} onRuns={openRuns} onDrone={() => go('drone')} onPerform={() => gate('perform:backing', () => go('perform'))} onLearned={() => go('learned')} learnedCount={learnedCount(s)} onModes={openModes} onWrongNotes={openWrongNotes} onAbsolute={openAbsolute} onTopic={openTopic} lang={s.uiLang} /></>}
          updateReady={pwaState.updateReady}
          news={
            <>
              {lastFreeze && settings?.seenFreezeDay !== lastFreeze && gems.streak.count > 0 && (
                <FreezeToast t={t} count={gems.streak.count} onClose={() => updateSettings({ seenFreezeDay: lastFreeze })} />
              )}
              {news.length > 0 ? (
              <section className="news-card" role="status">
                <div className="news-head">
                  <b>✨ {t.whatsNew}</b>
                  <button className="icon-btn" aria-label={t.done} onClick={() => updateSettings({ seenVersion: APP_VERSION })}>
                    ✕
                  </button>
                </div>
                <Changelog lang={s.uiLang} entries={news} />
              </section>
            ) : null}
            </>
          }
          onSettings={() => go('settings')}
          onDuel={() => go('duel')}
          onGhost={() => go('ghost')}
          onTrueFalse={() => gate('game:truefalse', () => go('truefalse'))}
          onVocal={(warm) => {
            setVocalWarmup(warm);
            go('vocal');
          }}
          onWorkout={(st) => {
            if (st.kind === 'lesson') return openLesson(st.lessonId);
            if (st.kind === 'review') return openReview();
            if (st.kind === 'modes') return openModes(st.level);
            if (st.kind === 'runs') return openRuns();
            if (st.kind === 'vocal' || st.kind === 'vocal-warmup') {
              setVocalWarmup(st.kind === 'vocal-warmup');
              return go('vocal');
            }
            if (st.game === 'truefalse') return go('truefalse');
            setGameKind(st.game === 'echo' ? 'melody' : 'rhythm');
            go('games');
          }}
          onPlacement={openPlacement}
          onSkills={() => go('skills')}
          playerName={user?.name ? user.name.split(' ')[0] : null}
          onOnline={() => {
            setOnlineCode('');
            setOnlineKey((k) => k + 1);
            go('online');
          }}
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
          playerName={playerFirstName}
          t={t}
          lessonId={lessonId}
          settings={s}
          autoStart={autoStart}
          onMode={(mode) => updateSettings({ mode })}
          onExit={() => go('home')}
          onAgain={() => (generated?.def.id === 'placement' ? openPlacement() : generated?.def.id === 'review' ? openReview() : generated?.def.id === 'modes' ? openModes(modesAgainLevel(generated.def)) : generated?.def.id === 'wrong-notes' ? openWrongNotes(wrongLevel) : generated ? openPuzzle() : openLesson(lessonId))}
          lessonDef={generated?.def}
          adapt={generated?.adapt}
          nextLabel={generated ? t.seeSkillMap : undefined}
          ratings={ratingsOf(progress)}
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
      {route === 'friends' && <FriendsScreen settings={s} t={t} user={user} sync={sync} onBack={() => go('home')} />}
      {route === 'skills' && <SkillMap t={t} lang={s.uiLang} progress={progress} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />}
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
            if (r === 'placement') openPlacement();
            else go(r);
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
          onStart={(v) =>
            gate(v.kind === 'melody' ? 'game:echo' : 'game:beat', () => {
              void piano.unlock(); // the Start gesture
              setGameSetup(v);
              setGameKey((k) => k + 1);
              location.hash = '';
              setRoute('game');
            })
          }
        />
      )}
      {route === 'truefalse' && <TrueFalseScreen t={t} settings={s} progress={progress} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'ghost' && <GhostScreen t={t} settings={s} progress={progress} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'classes' && <ClassesScreen t={t} settings={s} user={user} onBack={() => go('home')} onOpenLesson={(id) => openAssignment(id)} />}
      {streakOpen && (
        <StreakSheet t={t} st={gems.streak} gems={gems.balance} today={localDay(new Date())} lang={s.uiLang} onBuy={buy} purchases={s.purchases ?? []} theme={themeId} onBuyCosmetic={buyCosmetic} onTheme={(theme) => updateSettings({ theme })} onClose={() => setStreakOpen(false)} />
      )}
      {route === 'drone' && <DroneScreen t={t} settings={s} onBack={() => go('home')} />}
      {route === 'perform' && <PerformScreen t={t} settings={s} onBack={() => go('home')} />}
      {route === 'achievements' && <AchievementsScreen t={t} progress={progress} onBack={() => go('home')} />}
      {route === 'singalong' && <SingAlongScreen t={t} settings={s} onBack={() => go('vocal')} />}
      {route === 'vocal' && (
        <VocalScreen
          key={vocalWarmup ? 'warmup' : `home-${vocalLevel ?? ''}`}
          startLevel={vocalLevel}
          t={t}
          settings={s}
          progress={progress}
          onSettings={updateSettings}
          onProgress={setProgress}
          onBack={() => go('home')}
          onRuns={openRuns}
          onSingAlong={() => go('singalong')}
          startWarmup={vocalWarmup}
        />
      )}
      {route === 'online' && (
        <OnlineScreen key={`${onlineKey}-${user?.id ?? ''}`} t={t} settings={s} user={user} initialCode={onlineCode} onBack={() => go('home')} />
      )}
      {route === 'daily' && <DailyScreen t={t} settings={s} progress={progress} user={user} onBack={() => go('home')} onProgress={setProgress} />}
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
    </MiniGateContext.Provider>
  );
}
