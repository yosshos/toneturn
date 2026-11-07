import { lazy, Suspense } from 'react';
import { IntakeScreen } from './Intake';
import { personalOrder, type Intake } from '../engine/intake';
import { catchUp, hasCatchUp } from '../engine/catchup';
import { CatchUpCard, ResumePlacementCard, ResumeSessionCard } from './CatchUp';
import { intakeDraftProgress } from './Intake';
import { clearSlot, latestAnything, clearPlacement, clearSession, loadPlacement, loadSession, PLACEMENT_KEY, placementProgressOf, saveSession, sessionProgressOf, type SavedSession } from '../storage/resume';
import { vocalUnit } from '../content/units';
const AvatarStudio = lazy(() => import('./AvatarStudio'));
import { MiniGateContext, MiniLessonPlayer, RefresherContext } from './MiniLesson';
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
import { STRINGS } from '../i18n/strings';
import { dueReviews, gemsOf, lessonMastered, localDay, namingFor, ratingsOf, type Progress, type Settings, DEFAULT_SETTINGS, DEFAULT_SOUND, emptyProgress, migrateSettings } from '../storage/progress';
import { cloudConfigured, currentUser, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { DAILY_GOAL_XP, Home, lessonStates } from './Home';
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
import { MenuSheet } from './Menu';
import { GAMES2, PlayScreen, TabBar, TAB_ROUTES, type TabId } from './Arcade';
import { Tuner } from './Tuner';
import { Drills, drillSettingsOf } from './Drills';
import { badgeInputOf, refreshRanksBadges } from '../engine/rankBadges';
import { PLACEMENT_ORDER, ratingDrift, recalibration } from '../engine/placement';
import { foldFromMemo } from '../engine/stats';
import { AreaRanks, BadgesView } from './Badges';
import type { RankChange } from '../engine/ranks';
import type { Badge } from '../engine/badges';
import { BadgeUnlock, RankUpUnlock } from './BadgeUnlock';
import { todayDrills } from '../engine/drills/plan';
import { WorkoutCard, WorkoutEditor, WorkoutRunScreen } from './Workout';
import { addSession, nextBlock, nextForBlock, runLeftMs, startRun, suggestWorkout, validateTemplate, type Block, type BlockTarget, type WorkoutRun } from '../engine/workout2';
import { subPriorities } from '../engine/scheduler';
import { foldSubs } from '../engine/taxonomy';
import { DOMAINS, evidence, weakestSkill } from '../engine/rating';
import { useMotion } from './motion';
import { awardName, MonthReviewIcon, ProgressTabs } from './Stats';
import { achievements, earnAwards, firstLaunchAwards } from '../engine/achievements';
import { bumpCount } from '../engine/stats';
import { gameAccuracy } from '../engine/gameRating';
import { Flight } from './Flight';
import { NameTune } from './NameTune';
import { TuneUp } from './TuneUp';
import { Highway } from './Highway';
import { MelodyPuzzle } from './MelodyPuzzle';
import { PitchMemory } from './PitchMemory';
import { PeakHunter } from './PeakHunter';
import { Rush } from './Rush';
import { loadSlot, saveSlot } from '../storage/resume';
import { PathView2, stepTitle, usePathView } from './Path';
import { checkpointSession, recordStep, stepSession, stepStars, testOutPassed, testOutSession, THEMES, type PathStep, type PathUnit, type UnitStep } from '../engine/path';
import { FriendsScreen } from './Friends';
import { reportGameBest, reportRating, reportStreakDays } from '../cloud/social';
import { overallRating } from '../engine/rating';
import { APP_VERSION, unseenChanges } from '../version';
import { pwa } from '../pwa';
import { params, piano, setMidiEnabled, SIMULATED, store, tts } from './services';
import { midi } from '../speech/midi';

type Route = 'intake' | 'studio' | 'home' | 'path' | 'arcade' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay' | 'online' | 'drone' | 'classes' | 'ghost' | 'truefalse' | 'vocal' | 'achievements' | 'singalong' | 'perform' | 'learned' | 'tuner' | 'drills' | 'workout' | 'workoutrun' | 'peakhunter' | 'rush-chord' | 'rush-note' | 'rush-fretboard' | 'rush-interval' | 'rush-keysig' | 'rush-progression' | 'flight' | 'pitchmemory' | 'nametune' | 'tuneup' | 'highway' | 'melodypuzzle';
/** Invite links: #/online/CODE */
const onlineCodeFromHash = () => (/^#\/?online\/(\w+)/.exec(location.hash)?.[1] ?? '');
const PLAY_HASH = 'play';
const LESSON_TITLE_FALLBACK = { en: { wrong: 'Wrong notes' }, he: { wrong: 'תווים שגויים' } };
const enterPlay = () => {
  if (location.hash.replace(/^#\/?/, '') !== PLAY_HASH) location.hash = `/${PLAY_HASH}`;
};
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '').replace(/^online\/.*$/, 'online').replace(/^settings\/.*$/, 'settings');
  return (['path', 'arcade', 'settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost', 'truefalse', 'vocal', 'achievements', 'singalong', 'perform', 'learned', 'studio', 'intake', 'tuner', 'drills', 'workout', 'workoutrun', 'peakhunter', 'rush-chord', 'rush-note', 'rush-fretboard', 'rush-interval', 'rush-keysig', 'rush-progression', 'flight', 'pitchmemory', 'nametune', 'tuneup', 'highway', 'melodypuzzle'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
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

  useMotion(route);
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
  /** The concept refresher (owner, 2026-11-07): a mini-lesson over the exercise; the exercise continues after it. */
  const openRefresher = (lesson: MiniLesson, after: () => void) => {
    void piano.unlock();
    setMini({ lesson, then: after });
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
  /** Placement 3.0: skills already measured start the search from their rating (fewer questions on a retake). */
  const measuredPriors = (): Partial<Record<SkillId, number>> => Object.fromEntries(Object.entries(ratingsOf(progress)).filter(([, r]) => r && evidence(r) === 'measured').map(([k, r]) => [k, Math.round(r!.r)]));
  // A placement left half-way (back button, swipe back, reload) continues where it stopped (playtesting, 0.35.2).
  const resumePlacement = (v: SavedSession) => openGenerated(v.lesson, (st) => adaptPlacement(st, v.seed!), false, { key: PLACEMENT_KEY, title: t.findLevel, seed: v.seed, resume: v });
  const startPlacement = (seed: number, def: LessonDef) => openGenerated(def, (st) => adaptPlacement(st, seed), false, { key: PLACEMENT_KEY, title: t.findLevel, seed });
  const openPlacement = (domain?: DomainId | null, fresh = false) => {
    const d = typeof domain === 'string' ? domain : null;
    const saved = fresh ? null : loadPlacement();
    if (saved && (saved.lesson.placementDomain ?? null) === d) return resumePlacement(saved);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice' || d === 'voice', domain: d, priorities: (s.intake as Intake | null | undefined)?.priorities, priors: measuredPriors() }));
  };
  /** Catching up: only the sections this player has not been measured on yet. */
  const openCatchUpPlacement = (only: SkillId[]) => {
    const saved = loadPlacement();
    if (saved && !saved.lesson.placementDomain) return resumePlacement(saved);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice', priorities: (s.intake as Intake | null | undefined)?.priorities, only, priors: measuredPriors() }));
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

  // ---- awards (spec AG §5, S7): earned after each save; a toast after the session, never during a question ----
  const [awardToast, setAwardToast] = useState<string | null>(null);
  useEffect(() => {
    if (!settings || !progress.applied.length) return;
    if (route === 'lesson') return; // never during a session
    const extra = { bestLeague: settings.bestLeague, learned: learnedCount(settings) };
    const at = new Date().toISOString();
    if (!settings.awardsInit) {
      const { awards, count } = firstLaunchAwards(progress, extra, at);
      const next = { ...progress, awards };
      void store.saveProgress(next).then(() => setProgress(next));
      updateSettings({ awardsInit: true });
      if (count > 0 && !settings.cleanView) setAwardToast(settings.uiLang === 'en' ? `🏅 ${count} awards from before are in your Awards` : `🏅 ${count} פרסים מלפני כן מחכים בפרסים שלכם`);
      return;
    }
    const { awards, newly } = earnAwards(progress.awards, achievements(progress, extra), at);
    if (!newly.length) return;
    const next = { ...progress, awards };
    void store.saveProgress(next).then(() => setProgress(next));
    if (!settings.cleanView) {
      const best = newly.sort((a, b) => b.tier - a.tier)[0];
      setAwardToast(`🏅 ${awardName(best.id, settings.uiLang)}${newly.length > 1 ? ` +${newly.length - 1}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.applied.length, progress.ratingEvents?.length, progress.bests, route, settings?.awardsInit]);
  // ---- re-calibration after every session (docs/SPEC-PLACEMENT.md §6): the level, the path and the workout follow
  // the evidence more often than at unit boundaries ----
  const [recalOffer, setRecalOffer] = useState<{ kind: 'promote' | 'retest'; key: string; area?: DomainId } | null>(null);
  const snoozeRecal = () => {
    if (recalOffer) updateSettings({ recalSnooze: { ...(settings?.recalSnooze ?? {}), [recalOffer.key]: new Date().toISOString() } });
    setRecalOffer(null);
  };
  const recalSeen = useRef(0);
  useEffect(() => {
    if (!settings || route === 'lesson' || !progress.history.length || recalSeen.current === progress.history.length) return;
    recalSeen.current = progress.history.length;
    const now = new Date();
    const snoozed = Object.entries(settings.recalSnooze ?? {}).filter(([, at]) => now.getTime() - Date.parse(at) < 7 * 864e5).map(([k]) => k);
    const rc = recalibration(progress.ratingEvents ?? [], ratingsOf(progress), now, PLACEMENT_ORDER, snoozed as SkillId[]);
    // Harder than expected, or the frozen unit's skills moved ≥ 100: the current unit is rebuilt if under half done.
    const unit = pathView.units.find((u) => u.status === 'current');
    const unitSkills = unit ? [...new Set(unit.steps.map((x) => x.step.skill))] : [];
    const frozenAt = settings.pathFacts?.units?.[settings.pathFacts.units.length - 1]?.at;
    const before = frozenAt ? foldFromMemo(progress.ratingBase, (progress.ratingEvents ?? []).filter((e) => e.at <= frozenAt)) : null;
    const drift = before ? ratingDrift(before, ratingsOf(progress), unitSkills) : [];
    if (rc.demote.some((k) => unitSkills.includes(k)) || drift.length) {
      const next = unfreezeIfEarly(settings.pathFacts);
      if (next !== settings.pathFacts) updateSettings({ pathFacts: next });
    }
    if (rc.promote.some((k) => unitSkills.includes(k)) && !snoozed.includes('promote:' + (unit?.id ?? ''))) setRecalOffer({ kind: 'promote', key: 'promote:' + (unit?.id ?? '') });
    else if (rc.retest.length && !snoozed.includes('retest:' + rc.retest[0])) setRecalOffer({ kind: 'retest', key: 'retest:' + rc.retest[0], area: rc.retest[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.history.length, route]);

  // ---- area ranks + badges (spec AG §9): refreshed after each save, the unlock overlay after the session ----
  const [unlock, setUnlock] = useState<{ badges: Badge[]; rank?: RankChange } | null>(null);
  useEffect(() => {
    if (!settings || route === 'lesson') return;
    const r = refreshRanksBadges(progress, new Date(), settings.uiLang === 'he' ? [5, 6] : undefined);
    if (!r) return;
    void store.saveProgress(r.next).then(() => setProgress(r.next));
    if (settings.cleanView || !settings.awardsInit) return;
    // First run of badges (an update): what was earned before is logged quietly, one note instead of a parade.
    if (!progress.badges) {
      if (r.newly.length) setAwardToast(settings.uiLang === 'en' ? `🏅 ${r.newly.length} badges from before are in Progress → Badges` : `🏅 ${r.newly.length} תגים מלפני כן מחכים בהתקדמות ← תגים`);
      return;
    }
    const up = r.rankChanges.filter((c) => c.newTier || c.kind === 'up').sort((a, b) => b.to - a.to)[0];
    if (up || r.newly.length) setUnlock({ badges: r.newly, rank: up });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.applied.length, progress.ratingEvents?.length, progress.drillItems, route]);
  useEffect(() => {
    if (!awardToast) return;
    const id = window.setTimeout(() => setAwardToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [awardToast]);

  // ---- the learning path (spec AF) ----
  const pathView = usePathView(s, progress);
  /** The step being played from the path: its result is recorded when the session completes. */
  const pendingStep = useRef<{ id: string; kind: PathStep['kind']; after: string | null; testOut?: string[] } | null>(null);
  // A unit becomes current → frozen as a fact (P9).
  useEffect(() => {
    const f = pathView.freeze;
    if (!f || !settings) return;
    const units = settings.pathFacts?.units ?? [];
    if (units.some((u) => u.id === f.id)) return;
    updateSettings({ pathFacts: { ...(settings.pathFacts ?? {}), units: [...units, { ...f, at: new Date().toISOString() }] } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathView.freeze ? pathView.freeze.id + pathView.freeze.steps.join() : '']);
  const lastSession = () => progress.history[progress.history.length - 1]?.sessionId ?? null;
  const openPathStep = (x: UnitStep, unit: PathUnit, mode: 'step' | 'practice') => {
    const step = x.step;
    pendingStep.current = { id: step.id, kind: step.kind, after: lastSession() };
    const title = stepTitle(step, s, s.uiLang);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    if (step.kind === 'lesson' && step.lesson) return s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => openLesson(step.lesson!)) : openLesson(step.lesson);
    if (step.kind === 'review') {
      pendingStep.current = null;
      return openReview();
    }
    if (step.kind === 'check') return openGenerated(checkpointSession(unit, seed), undefined, false, { key: `pathstep:${step.id}`, title });
    // A game inside the unit (0.38): its result is recorded as the step's stars when the game ends.
    if (step.kind === 'game' && step.game) {
      if (step.game === 'drills') drillFrom.current = 'path';
      return go(step.game as Route);
    }
    const how = mode === 'practice' ? 'step' : x.probe ? 'probe' : x.state === 'quick' ? 'quick' : 'step';
    const def = stepSession(step, seed, how);
    if (def) gate(`topic:${step.topic}`, () => openGenerated(def, undefined, false, { key: `pathstep:${step.id}`, title }));
  };
  const openTestOut = (unit: PathUnit) => {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const { def, steps } = testOutSession(unit, seed);
    pendingStep.current = { id: `testout:${unit.id}`, kind: 'check', after: lastSession(), testOut: steps };
    openGenerated(def, undefined, false, { key: `testout:${unit.id}`, title: s.uiLang === 'en' ? 'Test out' : 'מבחן מעבר' });
  };
  /** Technique drills opened from a path step or a workout block run today's items as a queue (spec AI §9). */
  const drillFrom = useRef<'path' | 'workout' | 'test' | null>(null);
  const techAfterPlacement = useRef(false);
  const drillQueue = useMemo(
    () => (route === 'drills' && (drillFrom.current === 'path' || drillFrom.current === 'workout') && settings && progress ? todayDrills(drillSettingsOf(settings), progress.drillItems ?? {}, settings.drillStart ?? {}, settings.customDrills ?? []).map((x) => x.drill) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route],
  );
  const drillQueueDone = (takes: number, clean: number) => {
    const from = drillFrom.current;
    drillFrom.current = null;
    if (from === 'path') {
      const ps = pendingStep.current;
      if (ps && ps.kind === 'game' && ps.id.endsWith(':drills') && settings && takes > 0) {
        pendingStep.current = null;
        const r = clean / takes;
        const stars = r >= 0.8 ? 3 : r >= 0.5 ? 2 : takes >= 3 ? 1 : 0;
        updateSettings({ pathFacts: recordStep(settings.pathFacts ?? {}, ps.id, stars, new Date().toISOString()) });
      }
      return go('path');
    }
    go(from === 'workout' ? 'workoutrun' : 'arcade');
  };
  /** A game step of the path (0.38): stars from the game's accuracy (≥ 60 % = 1, 80 % = 2, 95 % = 3). */
  const noteGameStep = (game: string, score: number, detail: unknown) => {
    const ps = pendingStep.current;
    if (!ps || ps.kind !== 'game' || !ps.id.endsWith(`:${game}`) || !settings) return;
    pendingStep.current = null;
    const acc = gameAccuracy(game, score, (detail ?? {}) as Record<string, unknown>);
    const stars = acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
    updateSettings({ pathFacts: recordStep(settings.pathFacts ?? {}, ps.id, stars, new Date().toISOString()) });
  };
  /** P14: after the questionnaire or the level test, a current unit under half done is rebuilt. */
  const unfreezeIfEarly = (facts: Settings['pathFacts']): Settings['pathFacts'] => {
    const units = facts?.units ?? [];
    const last = units[units.length - 1];
    if (!last) return facts;
    const done = last.steps.filter((id) => (facts?.steps?.[id]?.stars ?? 0) > 0).length;
    return done < last.steps.length / 2 ? { ...facts, units: units.slice(0, -1) } : facts;
  };
  const seenPlacement = useRef<string | null>(null);
  /** After a session: a path step's stars (P10), or a test-out's ✓ by test (P16). */
  const notePathResult = (p: Progress) => {
    const lastR = p.history[p.history.length - 1];
    {
      // The workout's credit first (it needs the step id before the path's pending step is cleared).
      const ps0 = pendingStep.current;
      const done0 = ps0 && lastR && lastR.sessionId !== ps0.after && !ps0.testOut && stepStars(ps0.kind, lastR.firstTry, lastR.total) > 0 ? ps0.id : null;
      if (lastR && (!ps0 || lastR.sessionId !== ps0.after)) noteWorkoutResult(p, done0);
    }
    if (lastR?.lessonId === 'placement' && lastR.sessionId !== seenPlacement.current && settings) {
      seenPlacement.current = lastR.sessionId;
      updateSettings({ pathFacts: unfreezeIfEarly(settings.pathFacts) });
      // Keys players: the level test continues with its technique section (spec AI §13).
      if (!lastR.lessonId.includes('domain') && (settings.midiInput || settings.instrument === 'keys' || settings.instrument === 'guitar' || settings.instrument === 'bass' || ((settings.intake as Intake | null | undefined)?.plays ?? []).includes('keys'))) techAfterPlacement.current = true;
    }
    const ps = pendingStep.current;
    const r = p.history[p.history.length - 1];
    if (!ps || !r || r.sessionId === ps.after || !settings) return;
    pendingStep.current = null;
    const at = new Date().toISOString();
    if (ps.testOut) {
      const passed = testOutPassed(ps.testOut, (r.items ?? []).map((it) => ({ id: it.id, correct: it.correct })));
      if (passed.length) {
        updateSettings({ pathFacts: { ...(settings.pathFacts ?? {}), tests: { ...(settings.pathFacts?.tests ?? {}), ...Object.fromEntries(passed.map((id) => [id, at])) } } });
        const np = { ...p, counts: bumpCount(p.counts, 'stepsByTest', passed.length) };
        void store.saveProgress(np).then(() => setProgress(np));
      }
      return;
    }
    const stars = stepStars(ps.kind, r.firstTry, r.total);
    updateSettings({ pathFacts: recordStep(settings.pathFacts ?? {}, ps.id, stars, at) });
    if (ps.kind === 'check' && stars > 0) {
      // Path awards (spec AG §5): units finished, checkpoints at 3 stars.
      let c = bumpCount(p.counts, 'units', 1);
      if (stars === 3) c = bumpCount(c, 'checkpoints3', 1);
      const np = { ...p, counts: c };
      void store.saveProgress(np).then(() => setProgress(np));
    }
  };

  // ---- today's workout (spec AH): suggested, editable, and one system with the path (§9) ----
  const now0 = new Date();
  // W9: a workout belongs to the day it started; until 04:00 yesterday's unfinished one continues.
  const yday = localDay(new Date(now0.getTime() - 86400000));
  const today = now0.getHours() < 4 && (loadSlot<WorkoutRun>(`workout:${yday}`)?.data?.finished === false) ? yday : localDay(now0);
  const nudge = s.workoutNudge && s.workoutNudge.until >= today ? s.workoutNudge.delta : 0;
  const baseMinutes = Math.max(5, Math.min(60, ((s.intake as Intake | null | undefined)?.minutes ?? 10) + nudge));
  const tmplRaw = s.workoutTemplates?.[String(now0.getDay())] ?? s.workoutTemplates?.all ?? null;
  const suggestedWorkout = useMemo(() => {
    const tmpl = tmplRaw ? validateTemplate(tmplRaw, { leaveOut: s.pathLeaveOut ?? [], topics: new Set(Object.keys(TOPIC_GEN)), hidden: s.pathHidden ?? [], games: new Set(GAMES2.map((g) => g.id)) }) : null;
    return suggestWorkout({ total: tmpl ? tmpl.reduce((a, b) => a + b.minutes, 0) : baseMinutes, goal: s.goal ?? 'general', priorities: (s.intake as Intake | null | undefined)?.priorities ?? null, leaveOut: s.pathLeaveOut ?? [], reviewsDue: new Set(dueReviews(progress.review, now0).map((r) => r.key)).size, singer: s.mode === 'voice' && !s.noSing && !s.noMic, view: pathView, template: tmpl, technique: s.drills?.inWorkout !== false && (!!s.midiInput || s.instrument === 'keys' || s.instrument === 'guitar' || s.instrument === 'bass' || ((s.intake as Intake | null | undefined)?.plays ?? []).includes('keys')) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathView, baseMinutes, tmplRaw, s.goal, s.pathLeaveOut, s.pathHidden, s.mode, s.noSing, s.noMic, progress.review.length, today, progress.history.length]);
  const todayBlocks = s.workoutToday?.day === today ? s.workoutToday.blocks : suggestedWorkout;
  const [wrun, setWrun] = useState<WorkoutRun | null>(() => loadSlot<WorkoutRun>(`workout:${today}`)?.data ?? null);
  const wrunRef = useRef(wrun);
  wrunRef.current = wrun;
  const saveRun = (r: WorkoutRun | null) => {
    setWrun(r);
    wrunRef.current = r;
    if (r) saveSlot(`workout:${r.day}`, { title: s.uiLang === 'en' ? "Today's workout" : 'האימון של היום', route: 'home', done: r.at, total: r.blocks.length, data: r });
  };
  /** A session started from the workout (credited when it completes). */
  const workoutPending = useRef<{ t0: number } | null>(null);
  const [wctx, setWctx] = useState<{ nomic: boolean; quiet: boolean; noinst: boolean }>({ nomic: !!s.noMic, quiet: false, noinst: false });
  /** W10: today's context swaps blocks that need the mic / sound / an instrument. */
  const withContext = (bs: Block[]): Block[] =>
    bs
      .map((b) => (((wctx.nomic || wctx.quiet) && b.target.kind === 'vocal') || (wctx.quiet && b.target.kind === 'game') ? { ...b, target: { kind: 'warmup' } as BlockTarget } : b))
      .filter((b) => !(wctx.noinst && b.target.kind === 'practice'));
  const runCurrent = (r: WorkoutRun) => {
    if (r.finished || !r.blocks[r.at]) return go('workoutrun');
    const b = r.blocks[r.at];
    const t = b.target;
    if (t.kind === 'game' || t.kind === 'vocal' || t.kind === 'practice') return go('workoutrun');
    workoutPending.current = { t0: Date.now() };
    if (t.kind === 'warmup' || t.kind === 'mistakes') {
      const due = new Set(dueReviews(progress.review, new Date()).map((x) => x.key)).size;
      if (due > 0) return openReview();
      return practiceSkill(weakestSkill(ratingsOf(progress)));
    }
    const nx = nextForBlock(b, pathView, new Set(r.steps));
    if (nx && 'step' in nx) {
      const unit = pathView.units.find((u) => u.id === nx.unitId)!;
      return openPathStep(nx.step, unit, 'step');
    }
    // Free practice (§9.1.3): the area's / skill's weakest skill, or the topic at its first open level.
    if (t.kind === 'area') return practiceSkill(weakestSkill(ratingsOf(progress), DOMAINS.find((d) => d.id === t.area)!.skills));
    if (t.kind === 'skill') return practiceSkill(t.skill);
    if (t.kind === 'topic') return openTopic(t.topic, 1);
    return openPathStep(pathView.current ?? pathView.units[0].steps[0], pathView.units.find((u) => u.status === 'current') ?? pathView.units[0], 'step');
  };
  const startWorkout = () => {
    void piano.unlock();
    const r = wrun && wrun.day === today && !wrun.finished ? wrun : startRun(today, withContext(todayBlocks));
    saveRun(r);
    runCurrent(r);
  };
  /** Credit a finished session to the block in progress (W2, W3). */
  const noteWorkoutResult = (p: Progress, stepId: string | null) => {
    const r = wrunRef.current;
    const lastR = p.history[p.history.length - 1];
    if (!r || r.finished || !lastR) return;
    const fromWorkout = workoutPending.current;
    workoutPending.current = null;
    const ms = fromWorkout ? Date.now() - fromWorkout.t0 : lastR.total * 30000;
    // From the road (not started in the workout): only path steps that fit the current block count (W2).
    if (!fromWorkout) {
      const b = r.blocks[r.at];
      const step = stepId ? pathView.units.flatMap((u) => u.steps).find((x) => x.step.id === stepId)?.step : null;
      const fits = !!b && !!step && (b.target.kind === 'path' || (b.target.kind === 'area' && b.target.area === step.domain));
      if (!fits) return;
    }
    saveRun(addSession(r, ms, lastR.total, lastR.firstTry, stepId ?? undefined));
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

  const isTab = (TAB_ROUTES as string[]).includes(route);

  return (
    <MiniGateContext.Provider value={gate}>
    <RefresherContext.Provider value={openRefresher}>
    <div className={`app ${isTab ? 'has-tabs' : ''}`}>
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
          pathNext={(() => {
            const cur = pathView.current;
            const unit = pathView.units.find((u) => u.status === 'current');
            if (!cur || !unit) return undefined;
            const th = unit.theme ? THEMES.find((x) => x.id === unit.theme) : null;
            return { title: stepTitle(cur.step, s, s.uiLang), blurb: `${s.uiLang === 'en' ? 'Unit' : 'יחידה'} ${unit.n}${th ? ` · ${th.name[s.uiLang]}` : ''}`, onStart: () => openPathStep(cur, unit, 'step') };
          })()}
          warmUp={{ count: new Set(dueReviews(progress.review, new Date()).map((r) => r.key)).size, onStart: openReview }}
          workout={
            <WorkoutCard
              t={t}
              lang={s.uiLang}
              blocks={wrun && wrun.day === today && !wrun.finished ? wrun.blocks : todayBlocks}
              run={wrun && wrun.day === today ? wrun : null}
              view={pathView}
              nextLine={pathView.current ? stepTitle(pathView.current.step, s, s.uiLang) : null}
              edited={s.workoutToday?.day === today}
              onStart={() => (s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => startWorkout()) : startWorkout())}
              onEdit={() => go('workout')}
              onReset={() => updateSettings({ workoutToday: undefined })}
              ctx={wctx}
              onCtx={setWctx}
              goal={{ todayXp: progress.history.filter((h) => localDay(new Date(h.completedAt)) === localDay(new Date())).reduce((a, h) => a + h.xp, 0), goalXp: DAILY_GOAL_XP }}
            />
          }
          headerExtra={<MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />}
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
            </>
          }
          onSettings={() => go('settings')}
          onPracticeSkill={practiceSkill}
          whatsNew={{ unseen: news.length > 0, onSeen: () => updateSettings({ seenVersion: APP_VERSION }) }}
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
      {route === 'path' && <PathView2 t={t} settings={s} progress={progress} view={pathView} onStep={openPathStep} onTestOut={openTestOut} onPlacement={() => openPlacement()} onSettings={updateSettings} onLesson={(id) => (s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => openLesson(id)) : openLesson(id))} />}
      {route === 'arcade' && (
        <PlayScreen
          t={t}
          progress={progress}
          onGame={(k) => {
            setGameKind(k);
            go('games');
          }}
          onTrueFalse={() => gate('game:truefalse', () => go('truefalse'))}
          onDuel={() => go('duel')}
          onGhost={() => go('ghost')}
          onDaily={() => go('daily')}
          onPuzzle={openPuzzle}
          onGame2={(id) => go(id)}
          lang={s.uiLang}
          onOnline={() => {
            setOnlineFacts(null);
            setOnlineCode('');
            setOnlineKey((k) => k + 1);
            go('online');
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
          onExit={() => {
            if (techAfterPlacement.current) {
              techAfterPlacement.current = false;
              drillFrom.current = 'test';
              return go('drills');
            }
            go('home');
          }}
          onAgain={() => (generated?.def.id === 'placement' ? openPlacement(generated.def.placementDomain ?? null, true) : generated?.def.id === 'review' ? openReview() : generated?.def.id === 'modes' ? openModes(modesAgainLevel(generated.def)) : generated?.def.id === 'wrong-notes' ? openWrongNotes(wrongLevel) : generated ? openPuzzle() : openLesson(lessonId))}
          lessonDef={generated?.def ?? slot?.resume?.lesson}
          adapt={generated?.adapt}
          resume={slot?.resume}
          onStep={slot ? (st) => saveSession(slot.key, slot.title, st, slot.seed) : undefined}
          onDone={slot ? () => clearSession(slot.key) : undefined}
          nextLabel={wrun && !wrun.finished && wrun.day === today ? (s.uiLang === 'en' ? `Continue workout · ${Math.ceil(runLeftMs(wrun) / 60000)} min` : `להמשיך באימון · ${Math.ceil(runLeftMs(wrun) / 60000)} דק׳`) : generated ? t.seeSkillMap : undefined}
          ratings={ratingsOf(progress)}
          onNext={wrun && !wrun.finished && wrun.day === today ? () => runCurrent(wrunRef.current!) : generated ? () => go('skills') : canNext ? () => openLesson(nextId) : null}
          onProgress={(p) => {
            setProgress(p);
            notePathResult(p);
            if (user) void runSync();
          }}
          onSettings={updateSettings}
        />
      )}
      {route === 'settings' && (
        <SettingsScreen t={t} settings={s} onChange={updateSettings} onBack={() => go('home')} onIntake={() => go('intake')} account={<AccountCard t={t} user={user} sync={sync} />} />
      )}
      {route === 'diagnostics' && <Diagnostics t={t} settings={s} onBack={() => go('home')} />}
      {route === 'friends' && <FriendsScreen settings={s} t={t} user={user} sync={sync} progress={progress} streak={gems.streak.count} onBack={() => go('home')} onBestTier={(b) => b > (s.bestLeague ?? 0) && updateSettings({ bestLeague: b })} onLeagueSeen={(leagueSeen) => updateSettings({ leagueSeen })} />}
      {route === 'skills' && (
        <ProgressTabs
          t={t}
          lang={s.uiLang}
          progress={progress}
          extra={{ bestLeague: s.bestLeague, learned: learnedCount(s) }}
          pinned={s.trophies}
          onPin={(trophies) => updateSettings({ trophies })}
          map={
            <>
              <AreaRanks ranks={progress.ranks} lang={s.uiLang} />
              <SkillMap t={t} lang={s.uiLang} progress={progress} bestLeague={s.bestLeague} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />
            </>
          }
          badges={<BadgesView lang={s.uiLang} input={badgeInputOf(progress, new Date(), s.uiLang === 'he' ? [5, 6] : undefined)} log={progress.badges} />}
        />
      )}
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
          onBack={() => go('arcade')}
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
          onBack={() => go('arcade')}
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
            updateSettings({ ...res.patch, pathFacts: unfreezeIfEarly(s.pathFacts) });
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
      {recalOffer && route !== 'lesson' && !unlock && (
        <div className="sheet-backdrop" onClick={() => snoozeRecal()}>
          <div className="sheet recal-sheet" role="dialog" aria-modal="true" aria-labelledby="recal-title" onClick={(e) => e.stopPropagation()} data-recal={recalOffer.kind}>
            <h2 id="recal-title">{recalOffer.kind === 'promote' ? (s.uiLang === 'en' ? 'You seem above this unit' : 'נראה שאתם מעל היחידה הזאת') : s.uiLang === 'en' ? `Your ${t.domainNames[recalOffer.area!]} level moved a lot` : `הרמה שלכם ב${t.domainNames[recalOffer.area!]} זזה הרבה`}</h2>
            <p>{recalOffer.kind === 'promote' ? (s.uiLang === 'en' ? 'Your last answers are well above what this unit expects. Take the short jump-ahead test and skip what you already know?' : 'התשובות האחרונות שלכם הרבה מעל מה שהיחידה מצפה לו. לעשות את מבחן הקפיצה הקצר ולדלג על מה שאתם כבר יודעים?') : s.uiLang === 'en' ? 'A quick re-test (about 8 questions) puts your path back where you are.' : 'מבחן קצר מחדש (כ־8 שאלות) מחזיר את המסלול למקום שבו אתם נמצאים.'}</p>
            <div className="row">
              <button className="btn primary" onClick={() => { const o = recalOffer; setRecalOffer(null); if (o.kind === 'promote') { const u = pathView.units.find((x) => x.status === 'current'); if (u) openTestOut(u); } else openPlacement(o.area ?? null, true); }}>{recalOffer.kind === 'promote' ? (s.uiLang === 'en' ? 'Test out' : 'למבחן') : s.uiLang === 'en' ? 'Re-test' : 'למבחן קצר'}</button>
              <button className="btn ghost" onClick={() => snoozeRecal()}>{s.uiLang === 'en' ? 'Not now' : 'לא עכשיו'}</button>
            </div>
          </div>
        </div>
      )}
      {awardToast && (
        <button className="award-toast" role="status" onClick={() => (setAwardToast(null), go('skills'))}>
          {awardToast}
        </button>
      )}
      {route === 'workout' && (
        <WorkoutEditor
          t={t}
          lang={s.uiLang}
          blocks={wrun && wrun.day === today && !wrun.finished ? wrun.blocks.slice(wrun.at) : todayBlocks}
          suggested={suggestedWorkout}
          view={pathView}
          settings={s}
          onSave={(blocks) => {
            // W8: during a run only the blocks not run yet change.
            if (wrun && wrun.day === today && !wrun.finished) saveRun({ ...wrun, blocks: [...wrun.blocks.slice(0, wrun.at), ...blocks] });
            updateSettings({ workoutToday: { day: today, blocks: wrun && wrun.day === today && !wrun.finished ? [...wrun.blocks.slice(0, wrun.at), ...blocks] : blocks } });
          }}
          onSaveDefault={(blocks, scope) => updateSettings({ workoutTemplates: { ...(s.workoutTemplates ?? {}), [scope === 'all' ? 'all' : String(new Date().getDay())]: blocks.map((b) => ({ ...b })) }, workoutToday: { day: today, blocks } })}
          onClose={() => go('home')}
          addOptions={{
            suggested: subPriorities({ ratings: ratingsOf(progress), subs: foldSubs(progress.ratingEvents ?? []), track: s.track ?? null, priorities: (s.intake as Intake | null | undefined)?.priorities ?? null, voice: s.mode === 'voice', now: new Date() })
              .slice(0, 12)
              .map((x) => ({ kind: 'skill', skill: x.skill }) as BlockTarget)
              .filter((x, i, a) => a.findIndex((y) => JSON.stringify(y) === JSON.stringify(x)) === i),
            topics: Object.keys(TOPIC_GEN),
            games: GAMES2.map((g) => g.id),
          }}
        />
      )}
      {route === 'workoutrun' && wrun && (
        <WorkoutRunScreen
          t={t}
          lang={s.uiLang}
          run={wrun}
          onGo={() => {
            const b = wrun.blocks[wrun.at];
            // Games and the vocal warm-up: the block counts as done when started (they run on their own screens).
            saveRun(addSession(wrun, b.minutes * 60000, Math.max(1, b.minutes), Math.max(1, b.minutes)));
            if (b.target.kind === 'game') {
              if (b.target.game === 'drills') drillFrom.current = 'workout';
              go(b.target.game as Route);
            }
            else go('vocal');
          }}
          onBlockDone={(ms) => {
            const b = wrun.blocks[wrun.at];
            const r = addSession(wrun, Math.max(ms, b.minutes * 60000), 1, 1);
            saveRun(r);
            if (!r.finished) runCurrent(r);
          }}
          onSkip={() => {
            const r = nextBlock(wrun);
            saveRun(r);
            runCurrent(r);
          }}
          onEnd={() => {
            saveRun({ ...wrun, finished: true });
            go('home');
          }}
          onFeedback={(f) => {
            const until = localDay(new Date(Date.now() + 3 * 86400000));
            updateSettings({ workoutNudge: { until, delta: f === 'easy' ? 5 : f === 'long' ? -5 : 0 } });
            go('home');
          }}
        />
      )}
      {route === 'tuner' && <Tuner lang={s.uiLang} settings={s} onChange={updateSettings} onBack={() => go('home')} />}
      {unlock &&
        route !== 'lesson' &&
        (unlock.rank ? (
          <RankUpUnlock change={unlock.rank} lang={s.uiLang} onDone={() => setUnlock(unlock.badges.length ? { badges: unlock.badges } : null)} />
        ) : (
          <BadgeUnlock badges={unlock.badges} lang={s.uiLang} onDone={() => setUnlock(null)} />
        ))}
      {route === 'drills' && (
        <Drills
          lang={s.uiLang}
          settings={s}
          onSettings={updateSettings}
          items={progress.drillItems ?? {}}
          onTake={(st, evs, xp, m) => void store.recordDrill(st, evs, xp, m).then(setProgress)}
          onBack={() => (drillFrom.current ? drillQueueDone(0, 0) : go('arcade'))}
          queue={drillQueue}
          onQueueDone={drillQueueDone}
          startTest={drillFrom.current === 'test'}
          onTestDone={() => {
            drillFrom.current = null;
            go('path');
          }}
        />
      )}
      {(['chord', 'note', 'fretboard', 'interval', 'keysig', 'progression'] as const).map((mode) => {
        const g = `rush-${mode}` as Route;
        if (route !== g) return null;
        const key = `game:${g}`;
        return (
          <Rush
            key={g}
            lang={s.uiLang}
            settings={s}
            mode={mode}
            saved={loadSlot<unknown>(key)?.data ?? null}
            onSave={(st: unknown | null) => (st ? saveSlot(key, { title: GAMES2.find((x) => x.id === g)?.[s.uiLang][0] ?? g, route: g, done: 0, total: 0, data: st }) : clearSlot(key))}
            onExit={() => go('arcade')}
            onResult={(r: { game: string; score: number; detail?: unknown }) => {
              void store.recordGame2(g, r.score, undefined, (r.detail ?? {}) as Record<string, unknown>).then(setProgress);
              noteGameStep(g, r.score, r.detail);
            }}
            best={progress.bests?.[g]}
          />
        );
      })}
      {(['flight', 'nametune', 'tuneup', 'highway', 'melodypuzzle', 'pitchmemory', 'peakhunter'] as const).map((g) => {
        if (route !== g) return null;
        const key = `game:${g === 'melodypuzzle' ? 'melody-puzzle' : g}`;
        const title = GAMES2.find((x) => x.id === g)![s.uiLang][0];
        const props = {
          lang: s.uiLang,
          settings: s,
          saved: loadSlot<unknown>(key)?.data ?? null,
          onSave: (st: unknown | null) => (st ? saveSlot(key, { title, route: g, done: 0, total: 0, data: st }) : clearSlot(key)),
          onExit: () => go('arcade'),
          onResult: (r: { score: number; detail?: unknown }) => {
            void store.recordGame2(g, r.score, undefined, (r.detail ?? {}) as Record<string, unknown>).then(setProgress);
            noteGameStep(g, r.score, r.detail);
          },
          best: progress.bests?.[g],
        };
        if (g === 'flight') return <Flight key={g} {...props} />;
        if (g === 'nametune') return <NameTune key={g} {...props} />;
        if (g === 'tuneup') return <TuneUp key={g} {...props} />;
        if (g === 'highway') return <Highway key={g} {...props} />;
        if (g === 'melodypuzzle') return <MelodyPuzzle key={g} {...props} />;
        if (g === 'peakhunter') return <PeakHunter key={g} {...props} />;
        return <PitchMemory key={g} {...props} log={progress.pitchMemory ?? []} onLog={(e) => void store.recordGame2('pitchmemory', Math.max(0, 100 - Math.abs(e.cents)), e).then(setProgress)} />;
      })}
      {route === 'studio' && (
        <Suspense fallback={<main className="panel-screen"><p className="stage-msg">{t.avatarLoading}</p></main>}>
          <AvatarStudio t={t} settings={s} onBack={() => go('home')} onSave={(p) => { updateSettings({ avatars: p }); go('home'); }} />
        </Suspense>
      )}
      {route === 'ghost' && <GhostScreen t={t} settings={s} progress={progress} onBack={() => go('arcade')} onProgress={setProgress} />}
      {route === 'classes' && <ClassesScreen t={t} settings={s} user={user} onBack={() => go('home')} onOpenLesson={(id) => openAssignment(id)} />}
      {streakOpen && (
        <StreakSheet t={t} st={gems.streak} gems={gems.balance} today={localDay(new Date())} lang={s.uiLang} onBuy={buy} purchases={s.purchases ?? []} theme={themeId} onBuyCosmetic={buyCosmetic} onTheme={(theme) => updateSettings({ theme })} onClose={() => setStreakOpen(false)} />
      )}
      {route === 'drone' && <DroneScreen t={t} settings={s} onBack={() => go('home')} />}
      {route === 'perform' && <PerformScreen t={t} settings={s} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'achievements' && <AchievementsScreen t={t} progress={progress} extra={{ bestLeague: s.bestLeague, learned: learnedCount(s), lessonsTotal: Object.keys(MINI_LESSONS).length }} onBack={() => go('skills')} />}
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
        <OnlineScreen key={`${onlineKey}-${user?.id ?? ''}`} t={t} settings={s} user={user} initialCode={onlineCode} facts={onlineFacts} onBack={() => go('arcade')} />
      )}
      {route === 'daily' && <DailyScreen t={t} settings={s} progress={progress} user={user} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'duel' && (
        <DuelSetup
          t={t}
          onBack={() => go('arcade')}
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
      {isTab && !mini && <TabBar t={t} route={route as TabId} onGo={(r) => go(r)} />}
    </div>
    </RefresherContext.Provider>
    </MiniGateContext.Provider>
  );
}
