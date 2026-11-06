import { lazy, Suspense } from 'react';
import { IntakeScreen } from './Intake';
import { personalOrder, type Intake } from '../engine/intake';
import { catchUp, hasCatchUp } from '../engine/catchup';
import { CatchUpCard, ResumePlacementCard, ResumeSessionCard } from './CatchUp';
import { intakeDraftProgress } from './Intake';
import { clearSlot, latestAnything, clearPlacement, clearSession, loadPlacement, loadSession, PLACEMENT_KEY, placementProgressOf, saveSession, sessionProgressOf, type SavedSession } from '../storage/resume';
import { vocalUnit } from '../content/units';
const AvatarStudio = lazy(() => import('./AvatarStudio'));
import { MiniGateContext, MiniLessonPlayer } from './MiniLesson';
import { LearnedScreen, learnedCount } from './Learned';
import { lessonForUnit, MINI_LESSONS } from '../content/minilessons';
import type { MiniLesson } from '../content/miniTypes';
import { PerformScreen } from './Perform';
import { topicLesson, TOPIC_GEN } from '../engine/topics';
import { LESSON_META } from '../game/content';
import { displayNote, pc } from '../engine/pitch';
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
import type { DomainId } from '../engine/rating';
import { adaptPlacement, placementLesson, puzzleBand, reviewLesson, weekId, weeklyPuzzle } from '../engine/adaptive';
import { SkillMap } from './SkillMap';
import { PracticeTools } from './Tools';
import { MicIcon } from './bits';
import { STRINGS, type Strings } from '../i18n/strings';
import type { CHANGELOG } from '../version';
import { gemsOf, lessonMastered, localDay, namingFor, ratingsOf, type Progress, type Settings, DEFAULT_SETTINGS, DEFAULT_SOUND, emptyProgress, migrateSettings } from '../storage/progress';
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
import type { FactLevel, FactTopic } from '../engine/theoryFacts';
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

type Route = 'intake' | 'studio' | 'home' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay' | 'online' | 'drone' | 'classes' | 'ghost' | 'truefalse' | 'vocal' | 'achievements' | 'singalong' | 'perform' | 'learned';
/** Invite links: #/online/CODE */
const onlineCodeFromHash = () => (/^#\/?online\/(\w+)/.exec(location.hash)?.[1] ?? '');
const PLAY_HASH = 'play';
const LESSON_TITLE_FALLBACK = { en: { wrong: 'Wrong notes' }, he: { wrong: 'תווים שגויים' } };
const enterPlay = () => {
  if (location.hash.replace(/^#\/?/, '') !== PLAY_HASH) location.hash = `/${PLAY_HASH}`;
};
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '').replace(/^online\/.*$/, 'online');
  return (['settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost', 'truefalse', 'vocal', 'achievements', 'singalong', 'perform', 'learned', 'studio', 'intake'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
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
  const [progressReady, setProgressReady] = useState(false);
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
  /** Truth or Bluff → online: the room starts with these topics and level. */
  const [onlineFacts, setOnlineFacts] = useState<{ topics: FactTopic[]; level: FactLevel } | null>(null);
  const [duel, setDuel] = useState<{ names: string[]; kind: SetKind; rounds: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Generated session in progress (placement / review / weekly puzzle). */
  /** Voice-consent gate for sessions started outside the Practice button. */
  const [consentThen, setConsentThen] = useState<null | (() => void)>(null);
  const [generated, setGenerated] = useState<{ def: LessonDef; adapt?: (s: SessionState) => Question[] | null } | null>(null);
  /** The running lesson's save slot (every lesson keeps its place after each answer; playtesting, 0.35.2). */
  const [dropTick, setDropTick] = useState(0);
  const [slot, setSlot] = useState<{ key: string; title: string; seed?: number; resume?: SavedSession } | null>(null);
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
    void store.loadProgress().then((p) => {
      setProgress(p);
      setProgressReady(true);
    });
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
    // A lesson sits on its own history entry (#/play), so the back button or a swipe back returns home inside the
    // app instead of leaving it (playtesting, 0.35.2); Find my level keeps its place and offers to continue.
    const onHashRoute = () =>
      setRoute((r) => {
        if (location.hash.replace(/^#\/?/, '') === PLAY_HASH) return r === 'lesson' || r === 'game' || r === 'duelplay' ? r : 'home';
        return routeFromHash();
      });
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

  // ?lang=he|en forces the interface language (shared links, tests).
  const forcedLang = params.get('lang') === 'he' || params.get('lang') === 'en' ? (params.get('lang') as 'he' | 'en') : null;
  const s0 = settings ?? DEFAULT_SETTINGS;
  const s = forcedLang ? { ...s0, uiLang: forcedLang, outputLang: forcedLang } : s0;
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
    location.hash = r === 'lesson' || r === 'game' ? `/${PLAY_HASH}` : r === 'home' ? '' : `/${r}`;
    setRoute(r);
  };

  // Mini-lessons (spec X): a unit opens with its short lesson until the player has heard it to the end.
  const [mini, setMini] = useState<{ lesson: MiniLesson; then: () => void } | null>(null);
  const playerFirstName = user?.name ? user.name.split(' ')[0] : null;
  const markLearned = (id: string) => updateSettings({ learned: { ...(settings?.learned ?? {}), [id]: new Date().toISOString() } });
  const gate = (unit: string | null, start: () => void) => {
    const l = unit ? lessonForUnit(unit) : null;
    const cur = settings;
    // Automated test runs (simulator, unlocked, WebDriver) skip them unless asked for with ?mini.
    const automated = SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver);
    const auto = (cur?.miniLessons ?? true) && (!automated || params.has('mini'));
    if (!l || !auto || cur?.learned?.[l.id] || cur?.miniSeen?.[l.id]) return start();
    void piano.unlock();
    setMini({ lesson: l, then: start });
  };
  /** Open a generated session in its save slot: an unfinished one in the same slot continues instead. */
  const openGenerated = (def: LessonDef, adapt?: (s: SessionState) => Question[] | null, consented = false, extra: { key?: string; title?: string; seed?: number; resume?: SavedSession } = {}) => {
    if (!consented && s.mode === 'voice' && !s.voiceConsent) {
      setConsentThen(() => () => openGenerated(def, adapt, true, extra));
      return;
    }
    void piano.unlock();
    const key = extra.key ?? def.id;
    const saved = extra.resume ?? (extra.seed === undefined ? loadSession(key) : null);
    setGenerated({ def: saved ? saved.lesson : def, adapt });
    setSlot({ key, title: extra.title ?? saved?.title ?? '', seed: extra.seed, resume: saved ?? undefined });
    setLessonId(def.id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    enterPlay();
    setRoute('lesson');
  };
  /** Find my level: every skill, or one domain (the voice domain always sings). */
  // A placement left half-way (back button, swipe back, reload) continues where it stopped (playtesting, 0.35.2).
  const resumePlacement = (v: SavedSession) => openGenerated(v.lesson, (st) => adaptPlacement(st, v.seed!), false, { key: PLACEMENT_KEY, title: t.findLevel, seed: v.seed, resume: v });
  const startPlacement = (seed: number, def: LessonDef) => openGenerated(def, (st) => adaptPlacement(st, seed), false, { key: PLACEMENT_KEY, title: t.findLevel, seed });
  const openPlacement = (domain?: DomainId | null, fresh = false) => {
    const d = typeof domain === 'string' ? domain : null;
    const saved = fresh ? null : loadPlacement();
    if (saved && (saved.lesson.placementDomain ?? null) === d) return resumePlacement(saved);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice' || d === 'voice', domain: d, priorities: (s.intake as Intake | null | undefined)?.priorities }));
  };
  /** Catching up: only the sections this player has not been measured on yet. */
  const openCatchUpPlacement = (only: SkillId[]) => {
    const saved = loadPlacement();
    if (saved && !saved.lesson.placementDomain) return resumePlacement(saved);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice', priorities: (s.intake as Intake | null | undefined)?.priorities, only }));
  };
  /** The home card's "continue": path lessons through their own opener (mini-lesson gate, unlocks). */
  const continueSession = (v: SavedSession) => {
    if (v.key.startsWith('path:')) return openLesson(v.key.slice(5) as LessonId);
    openGenerated(v.lesson, undefined, false, { key: v.key, title: v.title, resume: v });
  };
  /** A saved screen: vocal levels open straight at their level; the rest show their own "continue" button. */
  const continueSlot = (key: string, r: Route) => {
    const m = /^vocal:(\d+|warmup)$/.exec(key);
    if (m) {
      setVocalWarmup(m[1] === 'warmup');
      setVocalLevel(m[1] === 'warmup' ? null : Number(m[1]));
    }
    go(r);
  };
  const openReview = () => {
    const def = reviewLesson(progress.review, Date.now() >>> 0);
    if (def) openGenerated(def, undefined, false, { key: 'review', title: t.review });
  };
  const openPuzzle = () => {
    const week = weekId(new Date());
    const fixed = progress.puzzles?.[week]?.band as Parameters<typeof weeklyPuzzle>[1] | undefined;
    openGenerated(weeklyPuzzle(week, fixed ?? puzzleBand(ratingsOf(progress))), undefined, false, { key: `puzzle:${week}`, title: t.weeklyPuzzle });
  };
  const openModes = (level: number) => gate('modes', () => openGenerated(modesLesson(level, Date.now() >>> 0), undefined, false, { key: `modes:${level}`, title: `${t.skillNames.modes} · ${level}` }));
  const openAbsolute = (level: number) => gate('absolute-pitch', () => openGenerated(absoluteLesson(level, Date.now() >>> 0), undefined, false, { key: `absolute:${level}`, title: `${t.skillNames.absolute} · ${level}` }));
  const openTopic = (topic: string, level: number) =>
    gate(`topic:${topic}`, () => openGenerated(topicLesson(topic, level, Date.now() >>> 0), undefined, false, { key: `topic:${topic}:${level}`, title: `${TOPIC_GEN[topic]?.title[s.uiLang] ?? topic} · ${level}` }));
  const [vocalLevel, setVocalLevel] = useState<number | null>(null);
  /** Class assignments: path lessons and generated practice (vocal levels, modes, wrong notes). */
  const openAssignment = (id: string) => {
    if ((LESSON_ORDER as string[]).includes(id)) return openLesson(id as LessonId);
    const m = /^vocal-(modes-|harmony-|barry-|sight-|orn-)?(\d+)$/.exec(id);
    if (m) {
      const lv = (m[1] === 'modes-' ? 100 : m[1] === 'harmony-' ? 200 : m[1] === 'barry-' ? 300 : m[1] === 'sight-' ? 400 : m[1] === 'orn-' ? 500 : 0) + Number(m[2]);
      return gate(vocalUnit(lv), () => {
        setVocalWarmup(false);
        setVocalLevel(lv);
        go('vocal');
      });
    }
    if (id === 'modes') return openModes(modesLevelFor(ratingsOf(progress).modes?.n ? ratingsOf(progress).modes!.r : null));
    if (id === 'wrong-notes') return openWrongNotes(1);
  };
  const [wrongLevel, setWrongLevel] = useState(1);
  const openWrongNotes = (level: number) =>
    gate('wrong-notes', () => {
      setWrongLevel(level);
      openGenerated(wrongNotesLesson(level, Date.now() >>> 0), undefined, false, { key: `wrong-notes:${level}`, title: `${LESSON_TITLE_FALLBACK[s.uiLang].wrong} · ${level}` });
    });
  const openRuns = () =>
    gate('runs', () => {
      const r = ratingsOf(progress).agility;
      openGenerated(runsWorkshop(runLevelFor(r?.n ? r.r : null)), undefined, false, { key: 'runs-workshop', title: t.skillNames.agility });
    });
  // Practise a skill at the player's level: the lesson on that skill's ladder that fits their rating.
  const practiceSkill = (k: SkillId) => {
    const rec = recommendFor(k, ratingsOf(progress), (id) => lessonMastered(progress, id));
    if (rec.kind === 'puzzle') return openPuzzle();
    if (rec.kind === 'runs-workshop') return openRuns();
    if (rec.kind === 'modes') return openModes(rec.level);
    if (rec.kind === 'absolute') return openAbsolute(1);
    if (rec.kind === 'topic') return openTopic(rec.topic, rec.level);
    if (rec.kind === 'perform') return gate('perform:improv', () => go('perform'));
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
    const key = `path:${id}`;
    const saved = loadSession(key);
    setSlot({ key, title: (LESSON_META[id]?.title[s.uiLang] ?? id).replace(/\{[nk]\}/g, displayNote(pc('Bb'), namingFor(s.naming, s.uiLang), s.uiLang)), resume: saved ?? undefined });
    setLessonId(id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    enterPlay();
    setRoute('lesson');
  };

  // Instrument sound (spec Q): load the chosen sample set (falls back to the classic piano on failure).
  const soundId = settings?.sound ?? DEFAULT_SOUND;
  useEffect(() => {
    void piano.setSound(soundId);
  }, [soundId]);
  const droneSoundId = settings?.droneSound ?? 'soft';
  useEffect(() => {
    void piano.setDroneSound(droneSoundId);
  }, [droneSoundId]);

  // First visit: the intake questionnaire comes before anything else (once; "later" counts as answered).
  // Automated runs see it only when asked (?intake), like the quick lessons.
  useEffect(() => {
    if (!settings || !progressReady || settings.intake !== undefined) return;
    const automated = (SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver)) && !params.has('intake');
    const fresh = progress.history.length === 0 && !Object.values(progress.lessons).some((l) => (l?.completions ?? 0) > 0);
    if (!automated && fresh && route === 'home') go('intake');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.intake, route, progressReady]);
  // First run: remember the current version silently and when this device started (untimed first week).
  useEffect(() => {
    if (settings && !settings.seenVersion) updateSettings({ seenVersion: APP_VERSION });
    if (settings && !settings.firstUseAt) updateSettings({ firstUseAt: new Date().toISOString() });
  }, [settings, updateSettings]);

  if (!settings) return <div className="boot" />;
  const news = unseenChanges(s.seenVersion);
  // Existing players (not the first run): what they have not done yet of today's first-run flow.
  const automatedRun = (SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver)) && !params.has('catchup');
  const started = progress.history.length > 0 || Object.values(progress.lessons).some((l) => (l?.completions ?? 0) > 0);
  const pending = catchUp(s, progress);
  const savedPlacement = route === 'home' ? loadPlacement() : null;
  void dropTick;
  const lastThing = route === 'home' && !automatedRun ? latestAnything([PLACEMENT_KEY]) : null;
  // A questionnaire left half-way shows as partly filled, to continue any time (also before any lesson).
  const intakeDraft = route === 'home' ? intakeDraftProgress() : null;
  const catchUpKey = `${pending.key}${intakeDraft ? '|draft' : ''}`;
  const showCatchUp = !automatedRun && (intakeDraft || (!savedPlacement && started && hasCatchUp(pending))) && s.catchUpHidden !== catchUpKey;

  const order = personalOrder((s.intake as Intake | null | undefined)?.priorities, s.track);
  const states = lessonStates(progress, order);
  const idx = order.indexOf(lessonId);
  const nextId = order[idx + 1];
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
            else updateSettings({ miniSeen: { ...(settings?.miniSeen ?? {}), [mini.lesson.id]: new Date().toISOString() } });
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
          tools={<>{user && <AssignedCard t={t} items={assigned} lang={s.uiLang} onOpen={(id) => openAssignment(id)} />}<PracticeTools t={t} progress={progress} onSkills={() => go('skills')} onPlacement={openPlacement} onReview={openReview} onPuzzle={openPuzzle} onDaily={() => go('daily')} onRuns={openRuns} onDrone={() => go('drone')} onPerform={() => gate('perform:backing', () => go('perform'))} onLearned={() => go('learned')} onStudio={s.cleanView ? undefined : () => go('studio')} learnedCount={learnedCount(s)} onModes={openModes} onWrongNotes={openWrongNotes} onAbsolute={openAbsolute} onTopic={openTopic} lang={s.uiLang} /></>}
          updateReady={pwaState.updateReady}
          news={
            <>
              {lastFreeze && settings?.seenFreezeDay !== lastFreeze && gems.streak.count > 0 && (
                <FreezeToast t={t} count={gems.streak.count} onClose={() => updateSettings({ seenFreezeDay: lastFreeze })} />
              )}
              {savedPlacement && (
                <ResumePlacementCard
                  t={t}
                  progress={placementProgressOf(savedPlacement)}
                  onContinue={() => resumePlacement(savedPlacement)}
                  onRestart={() => {
                    clearPlacement();
                    openPlacement(savedPlacement.lesson.placementDomain ?? null, true);
                  }}
                />
              )}
              {lastThing && (
                <ResumeSessionCard
                  t={t}
                  title={lastThing.v.title}
                  progress={lastThing.kind === 'session' ? sessionProgressOf(lastThing.v) : { answered: lastThing.v.done, total: lastThing.v.total }}
                  onContinue={() => (lastThing.kind === 'session' ? continueSession(lastThing.v) : continueSlot(lastThing.v.key, lastThing.v.route as Route))}
                  onDrop={() => {
                    if (lastThing.kind === 'session') clearSession(lastThing.v.key);
                    else clearSlot(lastThing.v.key);
                    setDropTick((x) => x + 1);
                  }}
                />
              )}
              {showCatchUp && (
                <CatchUpCard
                  t={t}
                  c={{ ...pending, ...(intakeDraft && pending.intake === null ? { intake: 'later' as const } : {}), ...(savedPlacement ? { unmeasured: [] } : {}) }}
                  draft={intakeDraft}
                  onIntake={() => go('intake')}
                  onMeasure={() => openCatchUpPlacement(pending.unmeasured)}
                  onFindLevel={() => openPlacement()}
                  onHide={() => updateSettings({ catchUpHidden: catchUpKey })}
                />
              )}
              {news.length > 0 ? (
              <NewsCard t={t} lang={s.uiLang} entries={news} onClose={() => updateSettings({ seenVersion: APP_VERSION })} />
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
            if (st.kind === 'topic') return openTopic(st.topic, st.level);
            if (st.kind === 'vocal' || st.kind === 'vocal-warmup') {
              setVocalWarmup(st.kind === 'vocal-warmup');
              return go('vocal');
            }
            if (st.game === 'truefalse') return gate('game:truefalse', () => go('truefalse'));
            setGameKind(st.game === 'echo' ? 'melody' : 'rhythm');
            go('games');
          }}
          onPlacement={openPlacement}
          onSkills={() => go('skills')}
          playerName={user?.name ? user.name.split(' ')[0] : null}
          onOnline={() => {
            setOnlineFacts(null);
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
          onAgain={() => (generated?.def.id === 'placement' ? openPlacement(generated.def.placementDomain ?? null, true) : generated?.def.id === 'review' ? openReview() : generated?.def.id === 'modes' ? openModes(modesAgainLevel(generated.def)) : generated?.def.id === 'wrong-notes' ? openWrongNotes(wrongLevel) : generated ? openPuzzle() : openLesson(lessonId))}
          lessonDef={generated?.def ?? slot?.resume?.lesson}
          adapt={generated?.adapt}
          resume={slot?.resume}
          onStep={slot ? (st) => saveSession(slot.key, slot.title, st, slot.seed) : undefined}
          onDone={slot ? () => clearSession(slot.key) : undefined}
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
        <SettingsScreen t={t} settings={s} onChange={updateSettings} onBack={() => go('home')} onIntake={() => go('intake')} account={<AccountCard t={t} user={user} sync={sync} />} />
      )}
      {route === 'diagnostics' && <Diagnostics t={t} settings={s} onBack={() => go('home')} />}
      {route === 'friends' && <FriendsScreen settings={s} t={t} user={user} sync={sync} onBack={() => go('home')} onBestTier={(b) => b > (s.bestLeague ?? 0) && updateSettings({ bestLeague: b })} onLeagueSeen={(leagueSeen) => updateSettings({ leagueSeen })} />}
      {route === 'skills' && <SkillMap t={t} lang={s.uiLang} progress={progress} bestLeague={s.bestLeague} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />}
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
            else if (r === 'truefalse') gate('game:truefalse', () => go('truefalse'));
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
          onTrueFalse={() => gate('game:truefalse', () => go('truefalse'))}
          onStart={(v) =>
            gate(v.kind === 'melody' ? 'game:echo' : 'game:beat', () => {
              void piano.unlock(); // the Start gesture
              setGameSetup(v);
              setGameKey((k) => k + 1);
              enterPlay();
              setRoute('game');
            })
          }
        />
      )}
      {route === 'truefalse' && (
        <TrueFalseScreen
          t={t}
          settings={s}
          progress={progress}
          onBack={() => go('home')}
          onProgress={setProgress}
          onOnline={(topics, level) => {
            setOnlineFacts({ topics, level });
            setOnlineCode('');
            setOnlineKey((k) => k + 1);
            go('online');
          }}
        />
      )}
      {route === 'intake' && (
        <IntakeScreen
          t={t}
          settings={s}
          onSkip={() => {
            updateSettings({ intake: s.intake ?? null });
            go('home');
          }}
          onDone={(res, then) => {
            updateSettings(res.patch);
            if (then === 'placement') {
              go('home');
              window.setTimeout(() => openPlacement(), 0);
            } else if (then === 'basics') {
              const first = personalOrder(res.intake.priorities, res.patch.track)[0];
              go('home');
              window.setTimeout(() => openLesson(first), 0);
            } else go('home');
          }}
        />
      )}
      {route === 'studio' && (
        <Suspense fallback={<main className="panel-screen"><p className="stage-msg">{t.avatarLoading}</p></main>}>
          <AvatarStudio t={t} settings={s} onBack={() => go('home')} onSave={(p) => { updateSettings({ avatars: p }); go('home'); }} />
        </Suspense>
      )}
      {route === 'ghost' && <GhostScreen t={t} settings={s} progress={progress} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'classes' && <ClassesScreen t={t} settings={s} user={user} onBack={() => go('home')} onOpenLesson={(id) => openAssignment(id)} />}
      {streakOpen && (
        <StreakSheet t={t} st={gems.streak} gems={gems.balance} today={localDay(new Date())} lang={s.uiLang} onBuy={buy} purchases={s.purchases ?? []} theme={themeId} onBuyCosmetic={buyCosmetic} onTheme={(theme) => updateSettings({ theme })} onClose={() => setStreakOpen(false)} />
      )}
      {route === 'drone' && <DroneScreen t={t} settings={s} onBack={() => go('home')} />}
      {route === 'perform' && <PerformScreen t={t} settings={s} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'achievements' && <AchievementsScreen t={t} progress={progress} extra={{ bestLeague: s.bestLeague, learned: learnedCount(s), lessonsTotal: Object.keys(MINI_LESSONS).length }} onBack={() => go('home')} />}
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
          onSingAlong={() => gate('vocal:singalong', () => go('singalong'))}
          startWarmup={vocalWarmup}
        />
      )}
      {route === 'online' && (
        <OnlineScreen key={`${onlineKey}-${user?.id ?? ''}`} t={t} settings={s} user={user} initialCode={onlineCode} facts={onlineFacts} onBack={() => go('home')} />
      )}
      {route === 'daily' && <DailyScreen t={t} settings={s} progress={progress} user={user} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'duel' && (
        <DuelSetup
          t={t}
          onBack={() => go('home')}
          onStart={(names, kind, rounds) => {
            setDuel({ names, kind, rounds });
            setGameKey((k) => k + 1);
            enterPlay();
            setRoute('duelplay');
          }}
        />
      )}
      {route === 'duelplay' && duel && (
        <DuelScreen key={gameKey} t={t} settings={s} {...duel} onExit={() => go('home')} onRematch={() => {
          setGameKey((k) => k + 1);
        }} />
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

/** What's new, compact (home polish): the headline of the latest version; the rest on request. */
function NewsCard({ t, lang, entries, onClose }: { t: Strings; lang: 'he' | 'en'; entries: typeof CHANGELOG; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const head = entries[0];
  return (
    <section className={`news-card compact ${open ? 'open' : ''}`} role="status">
      <div className="news-head">
        <b>
          ✨ {t.whatsNew} <small dir="ltr">{head.version}</small>
        </b>
        <button className="icon-btn" aria-label={t.done} onClick={onClose}>
          ✕
        </button>
      </div>
      {open ? <Changelog lang={lang} entries={entries.slice(0, 3)} /> : <p className="news-headline">{head[lang][0]}</p>}
      <button className="link news-more" onClick={() => setOpen((x) => !x)}>
        {open ? t.newsLess : t.newsMore}
      </button>
    </section>
  );
}
