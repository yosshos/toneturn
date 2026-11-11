import { TodayCards } from './TodayCards';
import { qualityOf } from '../audio/quality';
import { courseLevels } from '../engine/courseSocial';
import { techQueue, workoutCreditsStep } from '../engine/ladderFacts';
import { CourseContext } from './courseContext';
import { CourseSheet } from './CourseSwitcher';
import { COURSE_AREAS, courseGoal, courseOf, switchCourse, type CourseId } from '../engine/courses';
import { AREAS as INTAKE_AREAS } from '../engine/intake';
import { miniForSkill } from '../content/refresher';
import { CHALLENGES } from '../engine/improvRules';
import { InsightsScreen } from './Insights';
import { Sidebar, type NavId } from './Sidebar';
import { Onboarding, Splash } from './Onboarding';
import { CommandPalette, type PaletteHit } from './CommandPalette';
import { startComputerKeys } from '../speech/computerKeys';
import { TodayAside } from './Asides';
import { ProgPuzzleScreen } from './ProgPuzzle';
import { ImprovStudioScreen } from './ImprovStudio';
import { ExamsScreen, mockExamLesson } from './Exams';
import type { ExamDef } from '../content/bagrut';
import { AdminScreen, CoolDownSheet, PlansScreen } from './Plans';
import { coolDown, loadPricing, myPlan, type MyPlan, type Pricing } from '../cloud/pricing';
import { GrooveTrainerScreen } from './GrooveTrainer';
import { earIndex } from '../engine/rating';
import { MixerScreen } from './Mixer';
import type { Drill } from '../engine/drills/types';
import { catalog, generate } from '../engine/drills/generate';
import { drumMicOf, VOICE_PERC } from '../engine/drumKit';
import { guitarCatalog } from '../engine/drills/guitar';
import { levelDrills } from '../engine/drills/plan';
import { parseTopicRef, submitResult, type AssignItem } from '../cloud/teacher';
import { DigestScreen } from './TeacherLoop';
import { IMPROV_LEVELS } from '../engine/charts';
import { PiecesScreen } from './Pieces';
import { SlowDownScreen } from './SlowDown';
import { ChartsScreen, type MyChart } from './Charts';
import { chartOfRulesRef } from './ImprovRules';
import { PracticeLogSheet } from './PracticeLog';
import { makeLogResult, type LogKind } from '../engine/practiceLog';
import { lazy, Suspense } from 'react';
import { IntakeScreen } from './Intake';
import { personalOrder, type Intake } from '../engine/intake';
import { catchUp, hasCatchUp } from '../engine/catchup';
import { CatchUpCard, ResumePlacementCard, ResumeSessionCard } from './CatchUp';
import { intakeDraftProgress } from './Intake';
import { clearSlot, latestAnything, latestSession, clearPlacement, clearSession, loadPlacement, loadSession, PLACEMENT_KEY, placementProgressOf, saveSession, sessionProgressOf, type SavedSession } from '../storage/resume';
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
import { canBuy, canBuyCosmetic } from '../engine/streak';
import { appearanceOf, resolvedTheme } from './themes';
import { modesLevelFor, recommendFor } from '../engine/recommend';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { LESSON_ORDER, runLevelFor, runsWorkshop, type LessonDef, type LessonId, type Question, type SkillId } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import type { DomainId } from '../engine/rating';
import { adaptPlacement, placementLesson, puzzleBand, reviewLesson, weekId, weeklyPuzzle } from '../engine/adaptive';
import { EarChordCard, SkillMap } from './SkillMap';
import { NickPrompt } from './Profile';
import { shortName } from '../engine/pathNames';
import { PathExtras } from './Tools';
import { MicIcon } from './bits';
import { STRINGS } from '../i18n/strings';
import { bassTuningOf, dueReviews, gemsOf, lessonMastered, localDay, namingFor, ratingsOf, type Progress, type Settings, DEFAULT_SETTINGS, DEFAULT_SOUND, emptyProgress, migrateSettings } from '../storage/progress';
import { cloudConfigured, currentUser, signInWithGoogle, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { DAILY_GOAL_XP, Home, lessonStates, TopBar } from './Home';
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
import { DomainTiles, GAMES2, PlayScreen, TabBar, TAB_ROUTES, WhatsNewButton, type TabId } from './Arcade';
import { Tuner } from './Tuner';
import { Metronome } from './Metronome';
import { Drills, drillSettingsOf } from './Drills';
import { badgeInputOf, refreshRanksBadges } from '../engine/rankBadges';
import { PLACEMENT_ORDER, ratingDrift, recalibration } from '../engine/placement';
import { foldFromMemo } from '../engine/stats';
import { BadgesView, ChallengeCard } from './Badges';
import type { RankChange } from '../engine/ranks';
import type { Badge } from '../engine/badges';
import { BadgeUnlock, RankUpUnlock } from './BadgeUnlock';
import { todayDrills } from '../engine/drills/plan';
import { blockLabel, WorkoutCard, WorkoutEditor, WorkoutRunScreen } from './Workout';
import { addSession, nextBlock, nextForBlock, runLeftMs, startRun, suggestWorkout, validateTemplate, type Block, type BlockTarget, type WorkoutRun } from '../engine/workout2';
import { subPriorities } from '../engine/scheduler';
import { foldSubs } from '../engine/taxonomy';
import { DOMAINS, evidence, weakestSkill } from '../engine/rating';
import { useMotion } from './motion';
import { awardName, MonthReviewIcon, ProgressTabs } from './Stats';
import { achievements, earnAwards, firstLaunchAwards } from '../engine/achievements';
import { bumpCount } from '../engine/stats';
import { gameAccuracy } from '../engine/gameRating';
import '../tiers.css';
import { submitGameBest } from '../cloud/compete';
import { socialInfo, TIERS, clearsRun, isTier, tierStepStars, tierInfo, tierKey, type DynName, type TierInfo } from '../engine/gameTiers';
import { Flight } from './Flight';
import { NameTune } from './NameTune';
import { TuneUp } from './TuneUp';
import { Highway } from './Highway';
import { MelodyPuzzle } from './MelodyPuzzle';
import { PitchMemory } from './PitchMemory';
import { PeakHunter } from './PeakHunter';
import { Rush } from './Rush';
import { loadSlot, saveSlot } from '../storage/resume';
import { nodeTitle, PathView2, stepTitle, usePathView } from './Path';
import { checkpointSession, recordStep, stepSession, stepStars, testOutPassed, testOutSession, type PathStep, type PathUnit, type UnitStep } from '../engine/path';
import { FriendsScreen } from './Friends';
import { reportGameBest, reportRating, reportStreakDays, setProfile, uploadAvatar } from '../cloud/social';
import { isYoung } from '../engine/privacy';
import { overallRating } from '../engine/rating';
import { APP_VERSION, unseenChanges } from '../version';
import { params, piano, setMidiEnabled, SIMULATED, store, tts } from './services';
import { midi } from '../speech/midi';
import { setPreferredMic } from '../speech/mic';

/** Screens that play the band (0.69: its sets load here, and only here on Lite / Standard). */
const BAND_ROUTES = new Set<string>(['charts', 'improv', 'groove', 'metronome', 'mixer', 'slowdown', 'perform', 'highway', 'drills', 'workoutrun']);

type Route = 'intake' | 'studio' | 'home' | 'path' | 'arcade' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay' | 'online' | 'drone' | 'classes' | 'ghost' | 'truefalse' | 'vocal' | 'achievements' | 'singalong' | 'perform' | 'learned' | 'tuner' | 'metronome' | 'songs' | 'drills' | 'workout' | 'workoutrun' | 'peakhunter' | 'rush-chord' | 'rush-note' | 'rush-fretboard' | 'rush-interval' | 'rush-keysig' | 'rush-progression' | 'flight' | 'pitchmemory' | 'nametune' | 'tuneup' | 'highway' | 'melodypuzzle' | 'charts' | 'slowdown' | 'pieces' | 'mixer' | 'insights' | 'groove' | 'welcome' | 'puzzle' | 'improv' | 'exams' | 'plans' | 'admin';
/** Invite links: #/online/CODE */
const onlineCodeFromHash = () => (/^#\/?online\/(\w+)/.exec(location.hash)?.[1] ?? '');
const PLAY_HASH = 'play';
/** The app (re)opened inside an exercise — the phone reloaded a tab it had closed in the background. */
const BOOT_IN_PLAY = typeof location !== 'undefined' && location.hash.replace(/^#\/?/, '') === PLAY_HASH;
const LESSON_TITLE_FALLBACK = { en: { wrong: 'Wrong notes' }, he: { wrong: 'תווים שגויים' } };
const enterPlay = () => {
  if (location.hash.replace(/^#\/?/, '') !== PLAY_HASH) location.hash = `/${PLAY_HASH}`;
};
const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '').replace(/^online\/.*$/, 'online').replace(/^settings\/.*$/, 'settings');
  return (['path', 'arcade', 'settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost', 'truefalse', 'vocal', 'achievements', 'singalong', 'perform', 'learned', 'studio', 'intake', 'tuner', 'metronome', 'songs', 'drills', 'workout', 'workoutrun', 'peakhunter', 'rush-chord', 'rush-note', 'rush-fretboard', 'rush-interval', 'rush-keysig', 'rush-progression', 'flight', 'pitchmemory', 'nametune', 'tuneup', 'highway', 'melodypuzzle', 'charts', 'slowdown', 'pieces', 'mixer', 'insights', 'groove', 'welcome', 'puzzle', 'improv', 'exams', 'plans', 'admin'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
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
  // "mf cleared — f opens" (GAMES_TIERS_PLAN §2.3): one line for a few seconds after a run clears a tier.
  const [tierToast, setTierToast] = useState<{ tier: DynName; next: DynName | null } | null>(null);
  useEffect(() => {
    const c = progress.lastTierClear;
    if (!c) return;
    const i = TIERS.indexOf(c.tier);
    setTierToast({ tier: c.tier, next: i < TIERS.length - 1 ? TIERS[i + 1] : null });
    void store.consumeTierClear();
    const id = window.setTimeout(() => setTierToast(null), 3500);
    return () => clearTimeout(id);
  }, [progress.lastTierClear]);
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
  const [duel, setDuel] = useState<{ names: string[]; kind: SetKind; rounds: number; tier?: DynName } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [arcadeKey, setArcadeKey] = useState(0);
  // Pricing (0.54): public prices and the free tier's limit; my plan (signed in). The cool-down shows when a free
  // player starts a lesson after today's free minutes (only when the owner turned the limit on).
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [cool, setCool] = useState(false);
  useEffect(() => {
    void loadPricing().then(setPricing);
  }, []);
  useEffect(() => {
    if (user) void myPlan().then(setPlan);
    else setPlan(null);
  }, [user]);
  /** Today's practice minutes (about 20 s an answered item). */
  const minutesToday = () => {
    const d = localDay(new Date());
    return Math.round(progress.history.filter((h) => localDay(new Date(h.completedAt)) === d).reduce((a, h) => a + h.total, 0) / 3);
  };
  /** The free tier's cool-down (off unless the owner turned the limit on): true = stopped here. */
  const cooled = () => {
    if (pricing && coolDown(pricing, plan, minutesToday())) {
      setCool(true);
      return true;
    }
    return false;
  };
  // The parent digest (#/digest/<token>, 0.52): readable without signing in.
  const [digestToken, setDigestToken] = useState<string | null>(() => /^#\/?digest\/([\w-]{20,64})/.exec(location.hash)?.[1] ?? null);
  // The opening (0.52): the logo draws itself once per app start (not in automated runs unless ?splash).
  const [splash, setSplash] = useState(() => params.has('splash') || !(SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver)));
  /** Generated session in progress (placement / review / weekly puzzle). */
  /** Voice-consent gate for sessions started outside the Practice button. */
  const [consentThen, setConsentThen] = useState<null | (() => void)>(null);
  const [generated, setGenerated] = useState<{ def: LessonDef; adapt?: (s: SessionState) => Question[] | null } | null>(null);
  /** The running lesson's save slot (every lesson keeps its place after each answer; playtesting, 0.35.2). */
  const [dropTick, setDropTick] = useState(0);
  type Brief = { kicker: string; title: string; about: string; topic?: string; keepStep?: string };
  const [slot, setSlot] = useState<{ key: string; title: string; seed?: number; resume?: SavedSession; brief?: Brief } | null>(null);
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
  // Practice log (SPEC-0.48 §P1): practice away from the app.
  const [logOpen, setLogOpen] = useState(false);
  const saveLog = async (kind: LogKind, minutes: number, xpToday: number) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setProgress(await store.recordCompletion(makeLogResult(kind, minutes, xpToday, new Date(), id)));
    setLogOpen(false);
  };
  const gems = useMemo(() => gemsOf(progress, settings?.purchases ?? []), [progress, settings?.purchases]);
  const buyCosmetic = (item: string) => {
    const purchases = settings?.purchases ?? [];
    if (!canBuyCosmetic(item, gems.balance, purchases)) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    updateSettings({ purchases: [...purchases, { id, kind: 'cosmetic', item, day: localDay(new Date()) }], avatarFrame: item.replace(/^frame-/, '') });
  };
  const pickCourse = (c: CourseId) => {
    setCourseSheet(false);
    if (!settings) return;
    // 0.61: technique follows the course's instrument (keys → piano drills, guitar / bass → theirs).
    const inst = c === 'keys' ? 'piano' : c === 'guitar' || c === 'bass' || c === 'drums' ? c : null;
    updateSettings({ ...switchCourse(settings, c), ...(inst ? { drills: { ...drillSettingsOf(settings), instrument: inst } } : {}) });
    // 0.64 (owner): stay where you are — the same screen of the other course (only a screen that belongs to one
    // exercise falls back to Today).
    if (!['home', 'path', 'arcade', 'skills', 'friends', 'achievements', 'insights'].includes(route)) go('home');
  };
  /** First-try results per skill (the answer ladder, 0.61): the last 60 rated items of each skill, oldest first. */
  const recentBySkill = (p: Progress): Partial<Record<string, boolean[]>> => {
    const out: Record<string, boolean[]> = {};
    for (const e of p.ratingEvents ?? []) {
      if (e.set !== undefined) continue;
      (out[e.skill] ??= []).push(e.score !== undefined ? e.score >= 0.5 : e.correct);
    }
    for (const k of Object.keys(out)) out[k] = out[k].slice(-60);
    return out;
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
  // Appearance (0.61): light / dark / high contrast, or automatic by the device. Old theme choices map to a mode.
  const appearance = appearanceOf(s.theme);
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setPrefersDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const themeId = resolvedTheme(appearance, prefersDark);
  // Courses (0.61, SPEC-COURSES): one active course; the chrome reads it from CourseContext.
  const [courseSheet, setCourseSheet] = useState(false);
  const courseCtx = useMemo(
    () => ({ active: s.activeCourse ?? 'ear', mine: s.courses?.length ? s.courses : ['ear' as CourseId], open: () => setCourseSheet(true), examPrep: !!s.examPrep, setExamPrep: (on: boolean) => updateSettings({ examPrep: on }) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.activeCourse, s.courses, s.examPrep],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    // The browser / phone status-bar colour follows the theme.
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#FBF7FF');
  }, [themeId]);

  // Sound, vibration, microphone and MIDI preferences (Settings audit, 0.41) apply to the shared services.
  useEffect(() => {
    piano.setVolume(s.volume ?? 0.9);
    piano.setMixer(s.mixer);
    piano.cuesOn = s.cues ?? true;
    tts.rate = s.ttsRate ?? 1;
    document.documentElement.dataset.haptics = s.haptics === false ? 'off' : 'on';
    setPreferredMic(s.micDeviceId);
    // 0.65: the drums course reads the e-kit in drum mode (raw notes, CC4 hi-hat, the learned kit map).
    midi.setOptions({ only: s.midiDevice ?? null, octave: s.midiOctave ?? 0, pedalInvert: !!s.midiPedalInvert, drums: s.activeCourse === 'drums', ...(s.drumKit ? { kit: s.drumKit } : {}) });
    document.documentElement.style.fontSize = s.textScale && s.textScale !== 1 ? `${Math.round(s.textScale * 100)}%` : '';
    document.documentElement.dataset.cvd = s.cvd ? 'on' : 'off';
  }, [s.mixer, s.textScale, s.cvd, s.volume, s.cues, s.ttsRate, s.haptics, s.micDeviceId, s.midiDevice, s.midiOctave, s.midiPedalInvert, s.activeCourse, s.drumKit]);
  // MIDI keys sounded through the app (0.50), everywhere — on by default (most MIDI keyboards have no speakers).
  useEffect(() => {
    piano.setLiveOptions({ volume: s.midiVolume ?? 1, curve: s.midiCurve ?? 'normal' });
  }, [s.midiVolume, s.midiCurve]);
  // The chosen sound output (Settings → MIDI / Sound), applied now and whenever audio starts.
  useEffect(() => {
    void piano.setOutputDevice(s.audioOutput ?? null);
  }, [s.audioOutput]);
  useEffect(() => {
    // An e-kit's module plays its own drums: no piano notes for kit hits in the drums course.
    if ((!s.midiInput && !s.computerKeys) || s.midiSound === false || s.activeCourse === 'drums') return;
    // 0.69: the sound is the first listener (before any screen reacts), started from the key's own MIDI timestamp.
    const offN = midi.onNote((m, on, at, vel) => (piano.context ? piano.liveNote(m, on, vel, at) : void piano.unlock().then(() => piano.liveNote(m, on, vel), () => {})), { first: true });
    const offC = midi.onCC((cc, v) => piano.liveControl(cc, v), { first: true });
    // A keyboard unplugged mid-note, or the app sent to the background: no note may keep sounding.
    const offS = midi.onState(() => piano.liveAllOff());
    const onVis = () => document.hidden && piano.liveAllOff();
    document.addEventListener('visibilitychange', onVis);
    // Browsers start sound only after a tap: the first tap or key anywhere opens it, so the first MIDI key already sounds
    // (and again after the phone suspended it), so every tap or key re-opens it while it is not running.
    const wake = () => {
      if (!piano.audioRunning) void piano.unlock().catch(() => {});
    };
    addEventListener('pointerdown', wake, true);
    addEventListener('keydown', wake, true);
    document.addEventListener('visibilitychange', wake);
    return () => {
      offN();
      offC();
      offS();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pointerdown', wake, true);
      removeEventListener('keydown', wake, true);
      document.removeEventListener('visibilitychange', wake);
      piano.liveAllOff();
    };
  }, [s.midiInput, s.midiSound, s.computerKeys, s.activeCourse]);
  // Drums: pad controllers without a sound module — the app plays the kit's sound on each hit (kit card, default off).
  const drumSounds = s.activeCourse === 'drums' && !!s.drumKit?.sounds && !s.drumKit?.mic;
  useEffect(() => {
    if (!drumSounds) return;
    piano.preloadKit();
    const off = midi.onHit(
      (h) => {
        if (!h.voice) return;
        const kind = VOICE_PERC[h.voice];
        if (piano.context) piano.liveDrum(kind, h.vel, h.at);
        else void piano.unlock().then(() => piano.liveDrum(kind, h.vel), () => {});
      },
      { first: true },
    );
    const wake = () => {
      if (!piano.audioRunning) void piano.unlock().catch(() => {});
    };
    addEventListener('pointerdown', wake, true);
    return () => {
      off();
      removeEventListener('pointerdown', wake, true);
      piano.setScene({ drumsLive: false });
    };
  }, [drumSounds]);
  // The computer keyboard as a piano (opt-in, Settings → MIDI).
  useEffect(() => (s.computerKeys ? startComputerKeys(midi) : undefined), [s.computerKeys]);

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
  // Profile → server (SPEC-SOCIAL §1–§2, owner 2026-11-08: "no reason for it to stay on the device"): nickname, flag,
  // picture (icon + colour, or the cropped photo in storage), privacy and year of birth, a moment after any change.
  const [profileErr, setProfileErr] = useState<string | null>(null);
  // My level per course (pp … ff) goes with the profile, so friends can compare per course (owner 2026-11-09).
  const courseLevelsJson = useMemo(() => (settings ? JSON.stringify(courseLevels(settings.courses ?? ['ear'], ratingsOf(progress))) : ''), [settings, progress]);
  const sentProfile = useRef('');
  const sentPhoto = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user || !settings) return;
    const st = settings;
    const levels = courseLevelsJson ? (JSON.parse(courseLevelsJson) as Record<string, string>) : undefined;
    const key = JSON.stringify([st.nickname, st.country, st.avatarIcon, st.avatarColor, !!st.avatarPhoto, st.privacy, st.birthYear, courseLevelsJson]);
    const photoChanged = sentPhoto.current !== (st.avatarPhoto ?? null);
    if (key === sentProfile.current && !photoChanged) return;
    const id = setTimeout(() => {
      void (async () => {
        try {
          const young = isYoung(st.birthYear);
          if (photoChanged && !young) await uploadAvatar(user.id, st.avatarPhoto ?? null);
          await setProfile({
            nickname: st.nickname ?? null,
            country: st.country ?? '',
            icon: st.avatarIcon ?? null,
            color: st.avatarColor ?? null,
            photo: !!st.avatarPhoto && !young,
            privacy: st.privacy ?? null,
            birthYear: st.birthYear ?? null,
            courseLevels: levels,
          });
          sentProfile.current = key;
          sentPhoto.current = st.avatarPhoto ?? null;
          setProfileErr(null);
        } catch (e) {
          const m = String((e as { message?: string })?.message ?? e);
          const he = st.uiLang === 'he';
          setProfileErr(
            /taken/.test(m)
              ? he ? 'הכינוי הזה כבר תפוס — בחרו אחר בהגדרות.' : 'That nickname is taken — pick another in Settings.'
              : /30 days/.test(m)
                ? he ? 'אפשר לשנות כינוי פעם ב־30 יום.' : 'The nickname can change once every 30 days.'
                : he ? 'הפרופיל לא נשמר בשרת — ננסה שוב.' : 'Your profile could not be saved — we will try again.',
          );
        }
      })();
    }, 1200);
    return () => clearTimeout(id);
  }, [user, settings, courseLevelsJson]);

  // Where a tool (tuner, metronome, drone) was opened from — Practice tab or the menu — so Back returns there.
  const toolFrom = useRef<Route>('home');
  const chartInit = useRef<MyChart | null>(null);
  const go = (r: Route) => {
    if ((r === 'tuner' || r === 'metronome' || r === 'drone' || r === 'charts' || r === 'slowdown' || r === 'groove' || r === 'vocal' || r === 'learned') && route !== r && route !== 'lesson' && route !== 'singalong' && route !== 'mixer') toolFrom.current = route === 'arcade' || route === 'path' || route === 'drills' || route === 'insights' || route === 'improv' || route === 'friends' || route === 'exams' ? route : 'home';
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
  /** Where the session about to open came from: the workout (runCurrent) and / or the path screen. Read by the recap. */
  const openFrom = useRef<{ path: boolean }>({ path: false });
  const [origin, setOrigin] = useState<{ workout: boolean; path: boolean }>({ workout: false, path: false });
  const noteOrigin = () => {
    setOrigin({ workout: !!workoutPending.current, path: openFrom.current.path });
    openFrom.current.path = false;
  };
  /** Open a generated session in its save slot: an unfinished one in the same slot continues instead. */
  const openGenerated = (def: LessonDef, adapt?: (s: SessionState) => Question[] | null, consented = false, extra: { key?: string; title?: string; seed?: number; resume?: SavedSession; brief?: Brief } = {}) => {
    if (!extra.resume && cooled()) return;
    if (!consented && s.mode === 'voice' && !s.voiceConsent) {
      setConsentThen(() => () => openGenerated(def, adapt, true, extra));
      return;
    }
    void piano.unlock();
    const key = extra.key ?? def.id;
    const saved = extra.resume ?? (extra.seed === undefined ? loadSession(key) : null);
    noteOrigin();
    setGenerated({ def: saved ? saved.lesson : def, adapt });
    setSlot({ key, title: extra.title ?? saved?.title ?? '', seed: extra.seed, resume: saved ?? undefined, brief: saved ? undefined : extra.brief });
    setLessonId(def.id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    enterPlay();
    setRoute('lesson');
  };
  /** Find my level: every skill, or one domain (the voice domain always sings). */
  /** Placement 3.0: skills already measured start the search from their rating (fewer questions on a retake). */
  const measuredPriors = (): Partial<Record<SkillId, number>> => Object.fromEntries(Object.entries(ratingsOf(progress)).filter(([k, r]) => !k.includes('/') && r && evidence(r) === 'measured').map(([k, r]) => [k, Math.round(r!.r)]));
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
  /** Can the due mistakes be rebuilt as a review session? (Due tags from old lessons may not rebuild — 0.68.1.) */
  const canReview = () => reviewLesson(progress.review, 1) !== null;
  /** The review of due mistakes; never a dead tap (0.68.1, owner): when none of the due items can be rebuilt, the
   * weakest skill's practice opens instead. */
  const openReview = (fallback: SkillId = weakestSkill(ratingsOf(progress))) => {
    const def = reviewLesson(progress.review, Date.now() >>> 0);
    if (def) return openGenerated(def, undefined, false, { key: 'review', title: t.review });
    practiceSkill(fallback);
  };
  const openPuzzle = () => {
    const week = weekId(new Date());
    const fixed = progress.puzzles?.[week]?.band as Parameters<typeof weeklyPuzzle>[1] | undefined;
    openGenerated(weeklyPuzzle(week, fixed ?? puzzleBand(ratingsOf(progress))), undefined, false, { key: `puzzle:${week}`, title: t.weeklyPuzzle });
  };
  const openModes = (level: number) => gate('modes', () => openGenerated(modesLesson(level, Date.now() >>> 0), undefined, false, { key: `modes:${level}`, title: `${t.skillNames.modes} · ${level}` }));
  const openAbsolute = (level: number) => gate('absolute-pitch', () => openGenerated(absoluteLesson(level, Date.now() >>> 0), undefined, false, { key: `absolute:${level}`, title: `${t.skillNames.absolute} · ${level}` }));
  const openTopic = (topic: string, level: number) =>
    gate(`topic:${topic}`, () => openGenerated(topicLesson(topic, level, Date.now() >>> 0), undefined, false, { key: `topic:${topic}:${level}`, title: `${TOPIC_GEN[topic]?.title[s.uiLang] ?? topic} · ${TOPIC_GEN[topic]?.levels[level - 1]?.[s.uiLang] ?? level}`, brief: briefFor(topic, level) }));
  /** A mock exam (Programs & exams, and Today's exam-prep card): every section in order, resumable. */
  const openMock = (e: ExamDef) => openGenerated(mockExamLesson(e), undefined, false, { key: `exam:${e.id}`, title: e.title[s.uiLang] });
  // Deep link to a topic level (#/topic/<id>/<level>): opens that practice directly — used by the e2e checks and, later,
  // by challenge links (SPEC-SOCIAL §8).
  const openTopicRef = useRef(openTopic);
  openTopicRef.current = openTopic;
  const settingsReady = !!settings;
  useEffect(() => {
    if (!settingsReady) return;
    const go = () => {
      const m = /^#\/topic\/([a-z0-9-]+)\/(\d+)/.exec(location.hash);
      if (m && TOPIC_GEN[m[1]]) openTopicRef.current(m[1], Number(m[2]));
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, [settingsReady]);
  // Back into the exercise (0.50.2): a phone that closed the tab in the background reloads the app on #/play — open the
  // session that was cut off (saved after every answer) where it stood, instead of the home screen.
  const resumeRef = useRef({ resumePlacement, continueSession });
  resumeRef.current = { resumePlacement, continueSession };
  useEffect(() => {
    if (!settingsReady || !BOOT_IN_PLAY) return;
    const v = latestSession();
    if (!v || Date.now() - new Date(v.savedAt).getTime() > 6 * 3600 * 1000) return;
    if (v.key === PLACEMENT_KEY && v.seed !== undefined) resumeRef.current.resumePlacement(v);
    else resumeRef.current.continueSession(v);
  }, [settingsReady]);
  const [vocalLevel, setVocalLevel] = useState<number | null>(null);
  /** Class assignments: path lessons and generated practice (vocal levels, modes, wrong notes). */
  // The teacher loop (0.52): an assignment opened from the class list; its result is sent when it is finished.
  const activeAssign = useRef<{ a: AssignItem; t0: number; after: string | null } | null>(null);
  const submitAssign = (score: number, metrics: Record<string, unknown> = {}) => {
    const x = activeAssign.current;
    if (!x) return;
    activeAssign.current = null;
    void submitResult(x.a.id, score, (Date.now() - x.t0) / 60000, metrics).catch(() => {});
  };
  const openAssignItem = (a: AssignItem) => {
    activeAssign.current = { a, t0: Date.now(), after: progress.history[progress.history.length - 1]?.sessionId ?? null };
    if (a.kind === 'lesson') return openAssignment(a.lessonId);
    if (a.kind === 'topic') {
      const r = parseTopicRef(a.ref);
      if (r) return openTopic(r.id, r.level);
    }
    if (a.kind === 'drill' && settings) {
      const id = (a.ref ?? '').replace(/^drill:/, '');
      // Any instrument's level (a guitar teacher assigns g-* levels; the piano catalogue alone missed them).
      const lv = [...catalog(), ...guitarCatalog()].flatMap((f) => f.levels).find((l) => l.id === id);
      if (lv) {
        chartQueue.current = levelDrills(lv, drillSettingsOf(settings).keyOrder);
        drillFrom.current = 'assign';
        return go('drills');
      }
    }
    if (a.kind === 'chart' && a.ref?.startsWith('rules:')) {
      const c = chartOfRulesRef(a.ref, s.uiLang);
      if (c) {
        chartInit.current = c;
        return go('charts');
      }
    }
    if (a.kind === 'chart' && a.ref) {
      chartQueue.current = [generate({ family: a.ref.includes('~stride-') ? 'accomp' : 'voicings', kind: a.ref, key: 0, hands: 'L', swing: true })];
      drillFrom.current = 'assign';
      return go('drills');
    }
    activeAssign.current = null;
  };
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

  const openLesson = (id: LessonId) => (cooled() ? undefined : gate(id, () => openLessonNow(id)));
  const lessonTitle = (id: LessonId) => (LESSON_META[id]?.title[s.uiLang] ?? id).replace(/\{[nk]\}/g, displayNote(pc('Bb'), namingFor(s.naming, s.uiLang), s.uiLang));
  const openLessonNow = (id: LessonId) => {
    void piano.unlock(); // inside the Start gesture
    setGenerated(null);
    noteOrigin();
    const key = `path:${id}`;
    const saved = loadSession(key);
    setSlot({ key, title: lessonTitle(id), resume: saved ?? undefined });
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
      if (count > 0 && !settings.cleanView) setAwardToast(settings.uiLang === 'en' ? `${count} awards from before are in your Awards` : `${count} פרסים מלפני כן מחכים בפרסים שלכם`);
      return;
    }
    const { awards, newly } = earnAwards(progress.awards, achievements(progress, extra), at);
    if (!newly.length) return;
    const next = { ...progress, awards };
    void store.saveProgress(next).then(() => setProgress(next));
    if (!settings.cleanView) {
      const best = newly.sort((a, b) => b.tier - a.tier)[0];
      setAwardToast(`${awardName(best.id, settings.uiLang)}${newly.length > 1 ? ` +${newly.length - 1}` : ''}`);
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
      if (r.newly.length) setAwardToast(settings.uiLang === 'en' ? `${r.newly.length} badges from before are in Progress → Badges` : `${r.newly.length} תגים מלפני כן מחכים בהתקדמות ← תגים`);
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
  const pendingStep = useRef<{ id: string; kind: PathStep['kind']; after: string | null; testOut?: string[]; /** A game step's tier (GAMES_TIERS_PLAN §5.2). */ tier?: DynName } | null>(null);
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
  /** The brief before a topic exercise (owner, 2026-11-07); automated test runs skip it unless ?brief. */
  const briefFor = (topic: string, level: number, extra: Partial<Brief> = {}): Brief | undefined => {
    const T = TOPIC_GEN[topic];
    const automated = SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver);
    if (!T || (automated && !params.has('brief'))) return undefined;
    return { kicker: `${shortName(topic, T.title, s.uiLang)} ${level}`, title: T.title[s.uiLang], about: T.levels[level - 1]?.[s.uiLang] ?? '', topic, ...extra };
  };
  /** Progress → the Skill Map tab (after a level test, "See my Skill Map"). */
  const openSkillMap = () => {
    try {
      sessionStorage.setItem('toneturn.progressTab', 'skills');
    } catch {
      /* private mode */
    }
    go('skills');
  };
  /** The path step opened last (the recap's "Next step" skips it even before its stars are saved). */
  const lastStepId = useRef<string | null>(null);
  /** A step opened from the path screen (or its recap's "Next step") — not from the workout. */
  const openFromPath = (x: UnitStep, unit: PathUnit, mode: 'step' | 'practice') => {
    openFrom.current.path = true;
    workoutPending.current = null;
    openPathStep(x, unit, mode);
  };
  /** The recap's "Next step" (0.68.1, owner): the next open step of the current unit, through the normal opener. */
  const openNextStep = () => {
    const nx = nextForBlock({ id: 'next', target: { kind: 'path' }, minutes: 1 }, pathView, new Set(lastStepId.current ? [lastStepId.current] : []));
    if (nx && 'step' in nx) {
      const unit = pathView.units.find((u) => u.id === nx.unitId);
      if (unit && stepOpens(nx.step.step)) return openFromPath(nx.step, unit, 'step');
    }
    go('path');
  };
  const openPathStep = (x: UnitStep, unit: PathUnit, mode: 'step' | 'practice') => {
    const step = x.step;
    pendingStep.current = { id: step.id, kind: step.kind, after: lastSession(), ...(step.kind === 'game' && step.tier ? { tier: step.tier } : {}) };
    lastStepId.current = step.id;
    const title = stepTitle(step, s, s.uiLang);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    if (step.kind === 'lesson' && step.lesson) return s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => openLesson(step.lesson!)) : openLesson(step.lesson);
    if (step.kind === 'review') {
      pendingStep.current = null;
      return openReview();
    }
    if (step.kind === 'check') return openGenerated(checkpointSession(unit, seed), undefined, false, { key: `pathstep:${step.id}`, title });
    // 0.61 (owner): a technique level runs its items not yet clean as a drill queue; a vocal level opens the Vocal screen on it.
    if (step.kind === 'tech' && step.ladder && settings && progress) {
      chartQueue.current = techQueue(step.ladder.ref, progress.drillItems ?? {}, drillSettingsOf(settings).keyOrder);
      drillFrom.current = 'path';
      drillSessionXp.current = 0;
      drillSession.current = { takes: 0, clean: 0 };
      // BASS_NICHE_PLAN: a family with a quick lesson ("tech:<family>") opens with it the first time.
      return gate(`tech:${step.ladder.family}`, () => go('drills'));
    }
    if (step.kind === 'vocal' && step.ladder) {
      toolFrom.current = 'path';
      setVocalWarmup(false);
      setVocalLevel(Number(step.ladder.ref));
      return go('vocal');
    }
    // A game inside the unit (0.38): its result is recorded as the step's stars when the game ends.
    if (step.kind === 'game' && step.game) {
      if (step.game === 'drills') drillFrom.current = 'path';
      return go(step.game as Route);
    }
    const how = mode === 'practice' ? 'step' : x.probe ? 'probe' : x.state === 'quick' ? 'quick' : 'step';
    const def = stepSession(step, seed, how);
    if (def) return gate(`topic:${step.topic}`, () => openGenerated(def, undefined, false, { key: `pathstep:${step.id}`, title, brief: step.topic ? briefFor(step.topic, step.level ?? 1, x.state === 'tested' ? { keepStep: step.id } : {}) : undefined }));
    // A step that can't build a session (0.68.1): never a dead tap — practise its skill instead.
    pendingStep.current = null;
    practiceSkill(step.skill);
  };
  const openTestOut = (unit: PathUnit) => {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const { def, steps } = testOutSession(unit, seed);
    pendingStep.current = { id: `testout:${unit.id}`, kind: 'check', after: lastSession(), testOut: steps };
    openGenerated(def, undefined, false, { key: `testout:${unit.id}`, title: s.uiLang === 'en' ? 'Test out' : 'מבחן מעבר' });
  };
  /** Technique drills opened from a path step or a workout block run today's items as a queue (spec AI §9). */
  const drillFrom = useRef<'path' | 'workout' | 'test' | 'chart' | 'assign' | null>(null);
  /** Technique takes since the session opened (0.61): their XP, count and clean count go to the server as one result. */
  const drillSessionXp = useRef(0);
  const drillSession = useRef({ takes: 0, clean: 0 });
  const noteTake = (xp: number, verdict?: string) => {
    drillSessionXp.current += xp;
    drillSession.current = { takes: drillSession.current.takes + 1, clean: drillSession.current.clean + (verdict === 'clean' ? 1 : 0) };
  };
  /** Every technique session — path, workout, free practice, songs, the playing test — is one result: the streak, the
   * teacher's view and the server's weekly XP see it (its XP was already counted take by take on this device). */
  const techResult = (lessonId: string, takes?: number, clean?: number) => {
    const t0 = Math.max(takes ?? 0, drillSession.current.takes);
    const c0 = Math.max(clean ?? 0, drillSession.current.clean);
    const xp = drillSessionXp.current;
    drillSessionXp.current = 0;
    drillSession.current = { takes: 0, clean: 0 };
    if (!t0) return null;
    return store.recordCompletion({ lessonId, lessonVersion: 1, sessionId: `tech-${Date.now()}`, completedAt: new Date().toISOString(), firstTry: c0, total: t0, xp, xpCounted: true, missed: [], items: [], ...(settings?.activeCourse ? { course: settings.activeCourse } : {}) });
  };
  /** A progression from Charts practised as a drill (voicings / comping / stride). */
  const chartQueue = useRef<Drill[] | null>(null);
  /** The mixer returns to the screen it was opened from (Settings or Charts). */
  const mixerFrom = useRef<Route>('settings');
  const openMixer = () => {
    mixerFrom.current = route;
    go('mixer');
  };
  const techAfterPlacement = useRef(false);
  /** 0.61: an instrument course's "find my level" is the playing test (it sets the start level of every technique family). */
  const instrumentCourse = !!settings && ['keys', 'guitar', 'bass', 'drums'].includes(settings.activeCourse ?? 'ear');
  const openTechTest = () => {
    drillFrom.current = 'test';
    go('drills');
  };
  const drillQueue = useMemo(
    () => (route === 'drills' && (drillFrom.current === 'chart' || drillFrom.current === 'assign' || (drillFrom.current === 'path' && chartQueue.current)) ? chartQueue.current ?? undefined : route === 'drills' && (drillFrom.current === 'path' || drillFrom.current === 'workout') && settings && progress ? todayDrills({ ...drillSettingsOf(settings), bassTuning: bassTuningOf(settings), drumMic: drumMicOf(settings.drumKit) }, progress.drillItems ?? {}, settings.drillStart ?? {}, settings.customDrills ?? []).map((x) => x.drill) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route],
  );
  const drillQueueDone = (takes: number, clean: number) => {
    const from = drillFrom.current;
    drillFrom.current = null;
    const tech = from === 'path' && pendingStep.current?.kind === 'tech' ? pendingStep.current : null;
    const done = techResult(tech ? tech.id : from === 'assign' ? 'technique-assign' : 'technique', takes, clean);
    if (done && !tech) void done.then(setProgress);
    if (from === 'path' && pendingStep.current?.kind === 'tech') {
      // A technique level from the path: one result for the session (history → streak, teacher, workout, the step's stars).
      chartQueue.current = null;
      if (done)
        void done.then((p) => {
            setProgress(p);
            notePathResult(p);
          });
      else pendingStep.current = null;
      return go('path');
    }
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
    if (from === 'assign') {
      chartQueue.current = null;
      if (takes > 0) submitAssign(clean / takes, { takes, clean });
      return go('friends');
    }
    if (from === 'chart') {
      chartQueue.current = null;
      // back to Charts, and Charts' own back still goes where it came from (not to the drill)
      const keep = toolFrom.current;
      go('charts');
      toolFrom.current = keep;
      return;
    }
    go(from === 'workout' ? 'workoutrun' : 'arcade');
  };
  /** A game step of the path (0.38): stars from the game's accuracy (≥ 60 % = 1, 80 % = 2, 95 % = 3). */
  const noteGameStep = (game: string, score: number, detail: unknown) => {
    const ps = pendingStep.current;
    if (!ps || ps.kind !== 'game' || !ps.id.endsWith(`:${game}`) || !settings) return;
    pendingStep.current = null;
    const d = (detail ?? {}) as Record<string, unknown>;
    const acc = gameAccuracy(game, score, d);
    // A step with a tier (GAMES_TIERS_PLAN): 3 stars when the run met the rule at that tier or above, else at most 2.
    const stars = ps.tier ? tierStepStars(ps.tier, isTier(d.tier) ? d.tier : null, isTier(d.tier) && clearsRun(game, d.tier, score, d), acc) : acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
    updateSettings({ pathFacts: recordStep(settings.pathFacts ?? {}, ps.id, stars, new Date().toISOString()) });
  };
  /** The tier a game opens at (GAMES_TIERS_PLAN §2.2); a path game step asks for its own tier. */
  const tierFor = (g: string): TierInfo => {
    const info = tierInfo(g, ratingsOf(progress), progress.gameTiers?.[tierKey(g)], s.activeCourse ?? 'ear', s.courses);
    const ps = pendingStep.current;
    return ps && ps.kind === 'game' && ps.tier && ps.id.endsWith(`:${g}`) ? { ...info, forced: ps.tier } : info;
  };
  /** A tiered run's score goes to the week's game board (friends, per tier) when signed in. */
  const noteGameBest = (g: string, score: number, detail: unknown) => {
    const tier = (detail as { tier?: unknown } | null)?.tier;
    if (user && isTier(tier)) void submitGameBest(g, tier, score);
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
    // An assigned lesson / topic just finished: its result goes to the teacher (0.52).
    const asg = activeAssign.current;
    if (asg && (asg.a.kind === 'lesson' || asg.a.kind === 'topic') && lastR && lastR.sessionId !== asg.after && lastR.total > 0) submitAssign(lastR.firstTry / lastR.total, { firstTry: lastR.firstTry, total: lastR.total, xp: lastR.xp });
    {
      // The workout's credit first (it needs the step id before the path's pending step is cleared).
      const ps0 = pendingStep.current;
      // N12: a technique step is credited only once its level's measured rule passes (workoutCreditsStep); the
      // session's minutes still count for a block started from the workout.
      const done0 = ps0 && lastR && lastR.sessionId !== ps0.after && !ps0.testOut && workoutCreditsStep(ps0, lastR.firstTry, lastR.total, p.drillItems ?? {}, drillSettingsOf(settings ?? DEFAULT_SETTINGS).keyOrder) ? ps0.id : null;
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
    // BASS_AUDIT A4: a technique step is passed only by its level's measured rule (3 clean takes at the target tempo,
    // derived by withLadderFacts) — never by one session's clean share.
    if (ps.kind === 'tech') return;
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
    // 0.61 (SPEC-COURSES): the workout belongs to the active course — its own areas, its goal, its warm-ups only.
    const course = courseOf(s.activeCourse);
    const own = COURSE_AREAS[course.id];
    return suggestWorkout({ total: tmpl ? tmpl.reduce((a, b) => a + b.minutes, 0) : baseMinutes, goal: courseGoal(course.id, !!s.examPrep), priorities: (s.intake as Intake | null | undefined)?.priorities ?? null, leaveOut: [...new Set([...(s.pathLeaveOut ?? []).filter((d) => course.id === 'ear' || !own.includes(d)), ...INTAKE_AREAS.filter((d) => !own.includes(d))])], reviewsDue: new Set(dueReviews(progress.review, now0).map((r) => r.key)).size, singer: course.id === 'voice' && !s.noMic, view: pathView, template: tmpl, technique: s.drills?.inWorkout !== false && (course.id === 'keys' || course.id === 'guitar' || course.id === 'bass' || course.id === 'drums') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathView, baseMinutes, tmplRaw, s.goal, s.examPrep, s.pathLeaveOut, s.pathHidden, s.mode, s.noSing, s.noMic, progress.review.length, today, progress.history.length]);
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
  /** "Again" on a generated session's recap (0.68.1): the same kind of session again — it used to open the weekly
   * puzzle for every topic / path-step session. */
  const againGenerated = () => {
    const k = slot?.key ?? '';
    const tm = /^topic:([a-z0-9-]+):(\d+)$/.exec(k);
    if (tm && TOPIC_GEN[tm[1]]) return openTopic(tm[1], Number(tm[2]));
    if (k.startsWith('puzzle:')) return openPuzzle();
    if (k.startsWith('absolute:')) return openAbsolute(Number(k.split(':')[1]) || 1);
    if (k.startsWith('pathstep:')) {
      const id = k.slice(9);
      const unit = pathView.units.find((u) => u.steps.some((x) => x.step.id === id));
      const x = unit?.steps.find((y) => y.step.id === id);
      if (unit && x && x.step.kind !== 'check') return openPathStep(x, unit, 'practice');
    }
    if (generated) openGenerated(generated.def, generated.adapt, false, { key: k || undefined, title: slot?.title });
  };
  /** What a skill's practice opens, named (the workout card shows it). */
  const skillOpen = (k: SkillId): { title: string; open: () => void } => {
    const rec = recommendFor(k, ratingsOf(progress), (id) => lessonMastered(progress, id));
    const title = rec.kind === 'topic' ? `${TOPIC_GEN[rec.topic]?.title[s.uiLang] ?? rec.topic} · ${rec.level}` : rec.kind === 'lesson' ? lessonTitle(rec.lessonId) : (t.skillNames[k] ?? k);
    return { title, open: () => practiceSkill(k) };
  };
  /** Can this path step build something to open? */
  const stepOpens = (st: UnitStep['step']) =>
    st.kind === 'review' ? canReview() : st.kind === 'topic' ? !!st.topic && !!TOPIC_GEN[st.topic] : st.kind === 'lesson' ? !!st.lesson : st.kind === 'tech' || st.kind === 'vocal' ? !!st.ladder : st.kind === 'game' ? !!st.game : st.kind === 'check';
  /**
   * What the workout's Continue opens for the block in progress (0.68.1, owner: "Continue does nothing" and "the card
   * says Gap click but a harmony exercise opens"). One decision for both the Home card's title and runCurrent, and
   * every branch ends in something that opens: due mistakes that can't be rebuilt, a path step that can't build a
   * session, or no open step fall back to the block's (or the weakest) skill.
   */
  const workoutNext = (r: WorkoutRun): { title: string; open: () => void } | null => {
    const b = r.blocks[r.at];
    if (r.finished || !b) return null;
    const tg = b.target;
    if (tg.kind === 'game' || tg.kind === 'vocal' || tg.kind === 'practice') return { title: blockLabel(t, tg, s.uiLang), open: () => go('workoutrun') };
    const ratings = ratingsOf(progress);
    if (tg.kind === 'warmup' || tg.kind === 'mistakes') {
      if (dueReviews(progress.review, new Date()).length > 0 && canReview()) return { title: t.review, open: () => openReview() };
      return skillOpen(weakestSkill(ratings));
    }
    const nx = nextForBlock(b, pathView, new Set(r.steps));
    if (nx && 'step' in nx) {
      const unit = pathView.units.find((u) => u.id === nx.unitId);
      if (unit && stepOpens(nx.step.step)) return { title: nodeTitle(nx.step.step, s, s.uiLang), open: () => openPathStep(nx.step, unit, 'step') };
    }
    // Free practice (§9.1.3): the area's / skill's weakest skill, or the topic at its first level.
    if (tg.kind === 'area') return skillOpen(weakestSkill(ratings, DOMAINS.find((d) => d.id === tg.area)?.skills));
    if (tg.kind === 'skill') return skillOpen(tg.skill);
    if (tg.kind === 'topic' && TOPIC_GEN[tg.topic]) return { title: `${TOPIC_GEN[tg.topic].title[s.uiLang]} · 1`, open: () => openTopic(tg.topic, 1) };
    const cur = pathView.current;
    const unit = pathView.units.find((u) => u.status === 'current');
    if (cur && unit && stepOpens(cur.step)) return { title: nodeTitle(cur.step, s, s.uiLang), open: () => openPathStep(cur, unit, 'step') };
    return skillOpen(weakestSkill(ratings));
  };
  const runCurrent = (r: WorkoutRun) => {
    const nx = workoutNext(r);
    const tg = r.blocks[r.at]?.target;
    if (!nx || !tg || tg.kind === 'game' || tg.kind === 'vocal' || tg.kind === 'practice') return go('workoutrun');
    workoutPending.current = { t0: Date.now() };
    openFrom.current.path = false;
    nx.open();
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
  // The guitar course sounds like a guitar (0.66: a modelled plucked string; the piano before), whatever the piano sound.
  // The bass course's games, lessons and neck taps sound on the bass (unmarked notes up to C4).
  const courseVoice = settings?.activeCourse === 'bass' ? 'bass' : null;
  useEffect(() => piano.setCourseVoice(courseVoice), [courseVoice]);
  const soundId = settings?.activeCourse === 'guitar' ? 'guitar' : (settings?.sound ?? DEFAULT_SOUND);
  useEffect(() => {
    void piano.setSound(soundId);
  }, [soundId]);
  // Sound quality (0.69): Lite / Standard / Studio by device, or the player's choice (the 0.54 grand detail maps onto it).
  const soundQuality = settings ? qualityOf(settings) : 'auto';
  useEffect(() => piano.setQuality(soundQuality), [soundQuality]);
  const latencyMode = settings?.audioLatency ?? 'auto';
  useEffect(() => piano.setLatencyMode(latencyMode), [latencyMode]);
  // Only the screens with a band load the band (drums + bass): charts, improv, grooves, the metronome's kit, the mixer,
  // and the drums and bass courses everywhere. Elsewhere its sets are let go after a while (Lite / Standard).
  const bandScene = BAND_ROUTES.has(route) || settings?.activeCourse === 'drums' || settings?.activeCourse === 'bass';
  useEffect(() => piano.setScene({ band: bandScene }), [bandScene]);
  const organReg = settings?.organReg ?? 'jazz';
  const organFast = !!settings?.organFast;
  useEffect(() => piano.setOrgan({ reg: organReg, fast: organFast }), [organReg, organFast]);
  const epTremolo = settings?.epTremolo ?? 0;
  useEffect(() => piano.setTremolo(epTremolo), [epTremolo]);
  const bandDrums = settings?.bandDrums ?? 'jazz';
  useEffect(() => piano.setBandDrums(bandDrums), [bandDrums]);
  const droneSoundId = settings?.droneSound ?? 'soft';
  useEffect(() => {
    void piano.setDroneSound(droneSoundId);
  }, [droneSoundId]);

  const fresh0 = () => progress.history.length === 0 && !Object.values(progress.lessons).some((l) => (l?.completions ?? 0) > 0);
  // First visit: the intake questionnaire comes before anything else (once; "later" counts as answered).
  // Automated runs see it only when asked (?intake), like the quick lessons.
  useEffect(() => {
    if (!settings || !progressReady || settings.intake !== undefined) return;
    const automated = (SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver)) && !params.has('intake') && !params.has('welcome');
    if (params.has('intake') && fresh0() && route === 'home') return go('intake');
    const fresh = progress.history.length === 0 && !Object.values(progress.lessons).some((l) => (l?.completions ?? 0) > 0);
    // 0.52: the short onboarding (splash → welcome → a first taste → three questions); the full questionnaire stays in Settings.
    if ((!automated || params.has('welcome')) && fresh && route === 'home') go('welcome');
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
  // The recap's actions (0.68.1, owner): a path session → "Next step" (and "Continue workout" as a second button only
  // when the session belongs to a workout in progress); a workout block → "Continue workout"; other generated sessions
  // (practice topic, review, level test) → the Skill Map; a hand-made lesson → the next lesson.
  const workoutLive = !!wrun && !wrun.finished && wrun.day === today;
  // A path step started from the path screen still counts for the workout when it fits the block in progress (W2).
  const pathStepNow = origin.path && lastStepId.current ? pathView.units.flatMap((u) => u.steps).find((x) => x.step.id === lastStepId.current)?.step : null;
  const blockNow = wrun && !wrun.finished ? wrun.blocks[wrun.at] : undefined;
  const pathFitsBlock = !!pathStepNow && !!blockNow && (blockNow.target.kind === 'path' || (blockNow.target.kind === 'area' && blockNow.target.area === pathStepNow.domain));
  const workoutAction = workoutLive && (origin.workout || pathFitsBlock) ? { label: s.uiLang === 'en' ? `Continue workout · ${Math.ceil(runLeftMs(wrun!) / 60000)} min` : `להמשיך באימון · ${Math.ceil(runLeftMs(wrun!) / 60000)} דק׳`, open: () => runCurrent(wrunRef.current!) } : null;
  const recapNext: { label?: string; open: (() => void) | null; secondary?: { label: string; open: () => void } } = origin.path
    ? { label: s.uiLang === 'en' ? 'Next step' : 'לשלב הבא', open: openNextStep, secondary: workoutAction ?? undefined }
    : workoutAction
      ? { label: workoutAction.label, open: workoutAction.open }
      : generated
        ? { label: t.seeSkillMap, open: () => openSkillMap() }
        : { open: canNext ? () => openLesson(nextId) : null };

  const isTab = (TAB_ROUTES as string[]).includes(route);
  // The side menu (SPEC-DESKTOP): shown from 700 px wide by CSS; not during the first questionnaire or the studio.
  const withSide = route !== 'intake' && route !== 'welcome' && route !== 'studio' && !mini;
  const onPalette = (h: PaletteHit) => {
    if (h.kind === 'nav') return sideNav(h.id);
    if (h.kind === 'topic') return openTopic(h.id, 1);
    if (h.kind === 'song') return go('songs');
    location.hash = `/settings/${h.id}`;
    go('settings');
  };
  const sideNav = (id: NavId) => {
    if (id === 'placement') return openPlacement();
    if (id === 'gamelist') {
      try {
        sessionStorage.setItem('toneturn.practice', 'games');
      } catch {
        /* private mode */
      }
      setArcadeKey((k) => k + 1);
      return go('arcade');
    }
    if (id === 'mixer') return openMixer();
    if (id === 'log') return setLogOpen(true);
    go(id as Route);
  };

  // The parent digest page stands alone (no menus, no sign-in).
  if (digestToken)
    return (
      <div className="app">
        <DigestScreen token={digestToken} lang={s.uiLang} t={t} onHome={() => ((location.hash = ''), setDigestToken(null))} />
      </div>
    );

  return (
    <CourseContext.Provider value={courseCtx}>
    <MiniGateContext.Provider value={gate}>
    <RefresherContext.Provider value={openRefresher}>
    <div className={`app ${isTab ? 'has-tabs' : ''} ${withSide ? 'with-side' : ''}`}>
      {splash && <Splash lang={s.uiLang} onDone={() => setSplash(false)} />}
      {withSide && <CommandPalette lang={s.uiLang} onPick={onPalette} />}
      {SIMULATED && <div className="sim-banner">{t.simulated}</div>}
      {withSide && <Sidebar route={route} lang={s.uiLang} onNav={sideNav} me={{ name: playerFirstName, streak: gems.streak.count, onOpen: () => go('settings') }} extra={<>
            <WhatsNewButton t={t} lang={s.uiLang} unseen={news.length > 0} onSeen={() => updateSettings({ seenVersion: APP_VERSION })} />
            <MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />
          </>} />}
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
      {isTab && route !== 'home' && !mini && (
        <div className="tab-topbar">
          <TopBar t={t} lang={s.uiLang} streak={gems.streak} onStreak={() => setStreakOpen(true)} whatsNew={{ unseen: news.length > 0, onSeen: () => updateSettings({ seenVersion: APP_VERSION }) }} headerExtra={<MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />} onMenu={() => setMenuOpen(true)} />
        </div>
      )}
      {route === 'learned' && <LearnedScreen t={t} settings={s} name={playerFirstName} onLearned={markLearned} onBack={() => go(toolFrom.current)} />}
      {route === 'home' && (
        <Home
          t={t}
          settings={s}
          progress={progress}
          workout={
            <WorkoutCard
              t={t}
              lang={s.uiLang}
              blocks={wrun && wrun.day === today && !wrun.finished ? wrun.blocks : todayBlocks}
              run={wrun && wrun.day === today ? wrun : null}
              view={pathView}
              nextLine={workoutNext(wrun && wrun.day === today && !wrun.finished ? wrun : startRun(today, withContext(todayBlocks)))?.title ?? null}
              edited={s.workoutToday?.day === today}
              onStart={() => (s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => startWorkout()) : startWorkout())}
              onEdit={() => go('workout')}
              onReset={() => updateSettings({ workoutToday: undefined })}
            />
          }
          today={
            <TodayCards
              t={t}
              settings={s}
              progress={progress}
              goalXp={s.dailyGoal ?? DAILY_GOAL_XP}
              signedIn={!!user}
              onLeague={() => go('friends')}
              exam={{ mock: openMock, practise: (topic, level) => openTopic(topic, level), all: () => go('exams') }}
            />
          }
          headerExtra={<MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />}
          streak={gems.streak}
          onStreak={() => setStreakOpen(true)}
          onMenu={() => setMenuOpen(true)}
          assigned={user && assigned.length ? <AssignedCard t={t} items={assigned} lang={s.uiLang} onOpen={(id) => openAssignment(id)} /> : null}
          aside={<TodayAside lang={s.uiLang} progress={progress} streak={gems.streak.count} puzzleRows={s.progPuzzle?.[localDay(new Date())]?.rows} onPuzzle={() => go('puzzle')} onDaily={() => go('daily')} onExams={() => go('exams')} onImprov={() => go('improv')} />}
          news={
            <>
              {(progress.ratingEvents?.length ?? 0) > 0 && <NickPrompt lang={s.uiLang} s={s} onChange={updateSettings} />}
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
                  onFindLevel={() => (instrumentCourse ? openTechTest() : s.activeCourse === 'voice' ? openPlacement('voice') : openPlacement())}
                  onHide={() => updateSettings({ catchUpHidden: catchUpKey })}
                />
              )}
            </>
          }
          whatsNew={{ unseen: news.length > 0, onSeen: () => updateSettings({ seenVersion: APP_VERSION }) }}
          onPlacement={openPlacement}
          onMode={(mode) => updateSettings({ mode })}
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
      {route === 'path' && <PathView2 t={t} settings={s} progress={progress} view={pathView} onStep={openFromPath} onTestOut={openTestOut} onPlacement={() => (instrumentCourse ? openTechTest() : s.activeCourse === 'voice' ? openPlacement('voice') : openPlacement())} onTechTest={instrumentCourse && !s.drillStart && !Object.keys(progress.drillItems ?? {}).length ? openTechTest : undefined} onSettings={updateSettings} onLesson={(id) => {
        openFrom.current.path = true;
        workoutPending.current = null;
        return s.mode === 'voice' && !s.voiceConsent ? setConsentThen(() => () => openLesson(id)) : openLesson(id);
      }}
          extras={
            <PathExtras
              t={t}
              progress={progress}
              view={pathView}
              lang={s.uiLang}
              onTopic={openTopic}
              onModes={openModes}
              onWrongNotes={openWrongNotes}
              onAbsolute={openAbsolute}
              onReview={() => openReview()}
              onRuns={openRuns}
              onDrone={() => go('drone')}
              onPerform={() => gate('perform:backing', () => go('perform'))}
              onLearned={() => go('learned')}
              learnedCount={learnedCount(s)}
              onDrills={() => go('drills')}
              onVocal={(warm) => {
                setVocalWarmup(warm);
                go('vocal');
              }}
            />
          }
        />}
      {route === 'arcade' && (
        <PlayScreen
          key={arcadeKey}
          status={{
            ...((s.myCharts ?? []).length ? { charts: s.uiLang === 'he' ? `${(s.myCharts ?? []).length} שמורים` : `${(s.myCharts ?? []).length} saved` } : {}),
            ...((s.knownChords ?? []).length ? { songs: s.uiLang === 'he' ? `${(s.knownChords ?? []).length} אקורדים` : `${(s.knownChords ?? []).length} chords` } : {}),
            ...(s.progPuzzle?.[localDay(new Date())] ? { puzzle: s.uiLang === 'he' ? 'שוחק היום' : 'Played today' } : {}),
            ...(Object.keys(s.challengeBest ?? {}).length ? { improv: `${Object.values(s.challengeBest ?? {}).filter((x) => x >= 0.85).length}/${CHALLENGES.length}` } : {}),
          }}
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
          hub={{
            songs: () => go('songs'),
            drills: () => go('drills'),
            vocal: () => go('vocal'),
            singalong: () => go('singalong'),
            lessons: () => go('learned'),
            tuner: () => go('tuner'),
            metronome: () => go('metronome'),
            drone: () => go('drone'),
            log: () => setLogOpen(true),
            charts: () => go('charts'),
            slowdown: () => go('slowdown'),
            groove: () => go('groove'),
            improv: () => go('improv'),
            puzzle: () => go('puzzle'),
            exams: () => go('exams'),
            pieces: () => go('pieces'),
            mixer: openMixer,
          }}
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
          onAgain={() => (generated?.def.id === 'placement' ? openPlacement(generated.def.placementDomain ?? null, true) : generated?.def.id === 'review' ? openReview() : generated?.def.id === 'modes' ? openModes(modesAgainLevel(generated.def)) : generated?.def.id === 'wrong-notes' ? openWrongNotes(wrongLevel) : generated ? againGenerated() : openLesson(lessonId))}
          brief={slot?.brief}
          onHideTopic={slot?.brief?.topic ? () => {
            updateSettings({ pathHidden: [...new Set([...(s.pathHidden ?? []), slot.brief!.topic!])] });
            pendingStep.current = null;
            go('path');
          } : undefined}
          onKeepStep={slot?.brief?.keepStep ? () => updateSettings({ pathKeep: [...new Set([...(s.pathKeep ?? []), slot.brief!.keepStep!])] }) : undefined}
          lessonDef={generated?.def ?? slot?.resume?.lesson}
          adapt={generated?.adapt}
          resume={slot?.resume}
          onStep={(st) => {
            if (slot) saveSession(slot.key, slot.title, st, slot.seed);
            // Five answers in, today is a practice day (the streak), even if the session is left unfinished.
            if (st.records.filter((r) => r.attempts.length).length === 5) void store.markPracticeDay().then(setProgress);
          }}
          onDone={slot ? () => clearSession(slot.key) : undefined}
          nextLabel={recapNext.label}
          secondary={recapNext.secondary}
          ratings={ratingsOf(progress)}
          recent={recentBySkill(progress)}
          onNext={recapNext.open}
          onProgress={(p) => {
            setProgress(p);
            notePathResult(p);
            if (user) void runSync();
          }}
          onSettings={updateSettings}
        />
      )}
      {route === 'settings' && (
        <SettingsScreen t={t} settings={s} ratings={ratingsOf(progress)} onChange={updateSettings} onBack={() => go('home')} onPlans={() => go('plans')} onAdmin={plan?.admin ? () => go('admin') : undefined} onIntake={() => go('intake')} onMixer={openMixer} account={<AccountCard t={t} user={user} sync={sync} />} />
      )}
      {route === 'diagnostics' && <Diagnostics t={t} settings={s} onBack={() => go('home')} />}
      {route === 'friends' && <FriendsScreen profileErr={profileErr} settings={s} t={t} user={user} sync={sync} progress={progress} streak={gems.streak.count} onBack={() => go('home')} onBestTier={(b) => b > (s.bestLeague ?? 0) && updateSettings({ bestLeague: b })} onLeagueSeen={(leagueSeen) => updateSettings({ leagueSeen })} classes={<ClassesScreen t={t} settings={s} user={user} onBack={() => go('friends')} onOpenLesson={(id) => openAssignment(id)} onOpenItem={openAssignItem} embedded />} />}
      {route === 'skills' && (
        <ProgressTabs
          t={t}
          lang={s.uiLang}
          progress={progress}
          extra={{ bestLeague: s.bestLeague, learned: learnedCount(s) }}
          pinned={s.trophies}
          onPin={(trophies) => updateSettings({ trophies })}
          overview={
            <>
              <button className="set-card in-entry" onClick={() => go('insights')} data-open-insights="1">
                <span className="in-entry-n" dir="ltr">
                  {earIndex(ratingsOf(progress))?.r ?? '—'}
                </span>
                <span className="in-entry-text">
                  <b>{s.uiLang === 'he' ? 'תובנות' : 'Insights'}</b>
                  <small>{s.uiLang === 'he' ? 'מדד האוזן, מפת הידיים, טביעת הגרוב, מפת הבלבולים' : 'Ear Index, hand map, groove fingerprint, confusion map'}</small>
                </span>
                <span className="flip-rtl" aria-hidden="true">
                  ›
                </span>
              </button>
              <EarChordCard t={t} ratings={ratingsOf(progress)} bestLeague={s.bestLeague} />
              <DomainTiles t={t} progress={progress} onPractice={practiceSkill} lang={s.uiLang} onTechnique={() => go('drills')} onLearn={{ has: (k) => !!miniForSkill(k), open: (k) => openRefresher(miniForSkill(k)!, () => undefined) }} />
              <ChallengeCard input={badgeInputOf(progress, new Date(), s.uiLang === 'he' ? [5, 6] : undefined)} lang={s.uiLang} />
            </>
          }
          map={<SkillMap t={t} lang={s.uiLang} progress={progress} bestLeague={s.bestLeague} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />}
          badges={<BadgesView lang={s.uiLang} input={badgeInputOf(progress, new Date(), s.uiLang === 'he' ? [5, 6] : undefined)} log={progress.badges} earnedOnly course={s.activeCourse ?? 'ear'} courses={s.courses ?? ['ear']} />}
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
          extra={
            <>
              <WhatsNewButton t={t} lang={s.uiLang} unseen={news.length > 0} onSeen={() => updateSettings({ seenVersion: APP_VERSION })} />
              <MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />
            </>
          }
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
          tiers={(k) => tierFor(k)}
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
          tier={tierFor('truefalse')}
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
      {route === 'welcome' && (
        <Onboarding
          lang={s.uiLang}
          onSignIn={() => void signInWithGoogle()}
          onDone={(res, then) => {
            updateSettings({ ...res.patch, pathFacts: unfreezeIfEarly(res.patch.pathFacts ?? s.pathFacts) });
            if (then === 'placement') {
              go('home');
              // Drums first: its level test is the kit setup + the playing probe, not the ear placement (keys / guitar /
              // bass keep the ear placement, which continues into their technique section).
              const drumsFirst = res.patch.activeCourse === 'drums';
              window.setTimeout(() => (drumsFirst ? openTechTest() : openPlacement()), 0);
            } else {
              const first = personalOrder(res.intake.priorities, res.patch.track)[0];
              go('home');
              window.setTimeout(() => openLesson(first), 0);
            }
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
            updateSettings({ ...res.patch, pathFacts: unfreezeIfEarly(res.patch.pathFacts ?? s.pathFacts) });
            if (then === 'placement') {
              go('home');
              // Drums first: its level test is the kit setup + the playing probe, not the ear placement (keys / guitar /
              // bass keep the ear placement, which continues into their technique section).
              const drumsFirst = res.patch.activeCourse === 'drums';
              window.setTimeout(() => (drumsFirst ? openTechTest() : openPlacement()), 0);
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
          ctx={wctx}
          onCtx={setWctx}
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
            // Any other block (this screen restored on a path / area / warm-up block): open it as Continue would.
            if (b.target.kind !== 'game' && b.target.kind !== 'vocal') return runCurrent(wrun);
            // Games and the vocal warm-up: the block counts as done when started (they run on their own screens).
            saveRun(addSession(wrun, b.minutes * 60000, Math.max(1, b.minutes), Math.max(1, b.minutes)));
            if (b.target.kind === 'game') {
              if (b.target.game === 'drills') {
                drillFrom.current = 'workout';
                drillSessionXp.current = 0;
                drillSession.current = { takes: 0, clean: 0 };
              }
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
      {route === 'pieces' && (
        <PiecesScreen
          settings={s}
          onBack={() => go('songs')}
          onMinutes={(min, cleanReps) => {
            const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const r = makeLogResult('piece', min, 0, new Date(), id);
            void store.recordCompletion({ ...r, sessionId: `piece-${id}`, xp: Math.min(30, cleanReps * 2) }).then(setProgress);
          }}
        />
      )}
      {route === 'insights' && <InsightsScreen lang={s.uiLang} progress={progress} onBack={() => go('skills')} onTopic={(id, lv) => openTopic(id, lv)} onDrills={() => go('drills')} onPieces={() => go('pieces')} onGroove={() => go('groove')} />}
      {route === 'groove' && <GrooveTrainerScreen settings={s} onBack={() => go(toolFrom.current)} />}
      {route === 'puzzle' && (
        <ProgPuzzleScreen
          settings={s}
          onChange={updateSettings}
          onBack={() => go('arcade')}
          onSolved={(pts) => {
            if (pts > 0) void store.markPracticeDay().then(setProgress);
          }}
        />
      )}
      {route === 'improv' && <ImprovStudioScreen settings={s} onBack={() => go('arcade')} onOpenChart={(c) => ((chartInit.current = c), go('charts'))} />}
      {route === 'exams' && (
        <ExamsScreen
          lang={s.uiLang}
          onBack={() => go('arcade')}
          onPractise={(topic, level) => openTopic(topic, level)}
          onMock={openMock}
        />
      )}
      {route === 'plans' && <PlansScreen lang={s.uiLang} onBack={() => go('settings')} />}
      {route === 'admin' && <AdminScreen lang={s.uiLang} onBack={() => go('settings')} />}
      {cool && <CoolDownSheet lang={s.uiLang} minutes={pricing?.free.dailyMinutes ?? 20} onPlans={() => (setCool(false), go('plans'))} onClose={() => setCool(false)} />}
      {route === 'mixer' && <MixerScreen settings={s} onChange={updateSettings} onBack={() => go(mixerFrom.current)} />}
      {route === 'slowdown' && <SlowDownScreen lang={s.uiLang} onBack={() => go(toolFrom.current)} />}
      {route === 'charts' && <ChartsScreen
          initial={() => { const c = chartInit.current; chartInit.current = null; return c; }}
          settings={s}
          onChange={updateSettings}
          onBack={() => go(toolFrom.current)}
          onMixer={openMixer}
          onDrill={(kind, stride) => {
            chartQueue.current = [generate({ family: stride ? 'accomp' : 'voicings', kind, key: 0, hands: 'L', swing: true })];
            drillFrom.current = 'chart';
            go('drills');
          }}
          onImprov={(score, bpm, chords, level, challenge) => {
            if (challenge && score > (s.challengeBest?.[challenge] ?? -1)) updateSettings({ challengeBest: { ...(s.challengeBest ?? {}), [challenge]: score } });
            // an "improvise under rules" assignment: the take is the submission
            if (activeAssign.current?.a.kind === 'chart' && activeAssign.current.a.ref?.startsWith('rules:')) submitAssign(score, { bpm, rules: true });
            if (level && score > (s.improvBest?.[level] ?? -1)) updateSettings({ improvBest: { ...(s.improvBest ?? {}), [level]: score } });
            const lv = level ? IMPROV_LEVELS.find((x) => x.id === level)?.n ?? 0 : 0;
            void store
              .recordRatingEvents([{ id: `improv:chart:${Date.now()}`, skill: 'improv', difficulty: Math.round((lv ? 900 + lv * 55 : 1050 + Math.min(200, chords * 15)) + Math.max(0, bpm - 90) * 2), correct: score >= 0.6, score, at: new Date().toISOString() }])
              .then(setProgress);
          }}
        />}
      {route === 'tuner' && <Tuner lang={s.uiLang} settings={s} onChange={updateSettings} onBack={() => go(toolFrom.current)} />}
      {route === 'metronome' && <Metronome lang={s.uiLang} settings={s} onChange={updateSettings} onBack={() => go(toolFrom.current)} />}
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
          onTake={(st, evs, xp, m) => {
            noteTake(xp, m?.verdict);
            void store.recordDrill(st, evs, xp, m).then(setProgress);
          }}
          onBack={() => {
            if (drillFrom.current) return drillQueueDone(0, 0);
            void techResult('technique')?.then(setProgress);
            go('arcade');
          }}
          onVoice={s.noSing ? undefined : () => (setVocalWarmup(false), go('vocal'))}
          queue={drillQueue}
          onQueueDone={drillQueueDone}
          startTest={drillFrom.current === 'test'}
          onTestDone={() => {
            drillFrom.current = null;
            void techResult('technique-test')?.then(setProgress);
            go('path');
          }}
        />
      )}
      {route === 'songs' && (
        <Drills
          key="songs"
          lang={s.uiLang}
          settings={s}
          onSettings={updateSettings}
          items={progress.drillItems ?? {}}
          onTake={(st, evs, xp, m) => {
            noteTake(xp, m?.verdict);
            void store.recordDrill(st, evs, xp, m).then(setProgress);
          }}
          onBack={() => {
            void techResult('technique-songs')?.then(setProgress);
            go('arcade');
          }}
          songs
          onPieces={() => go('pieces')}
          onSing={
            s.noSing
              ? undefined
              : () => {
                  const r = ratingsOf(progress).singing;
                  const lv = Math.max(1, Math.min(TOPIC_GEN['song-sing']?.levels.length ?? 1, r?.n ? 1 + Math.floor((r.r - 800) / 150) : 1));
                  openTopic('song-sing', lv);
                }
          }
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
            noteGameBest(g, r.score, r.detail);
              noteGameStep(g, r.score, r.detail);
            }}
            best={progress.bests?.[g]}
            tier={tierFor(g)}
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
            noteGameBest(g, r.score, r.detail);
            noteGameStep(g, r.score, r.detail);
          },
          best: progress.bests?.[g],
          tier: tierFor(g),
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
      {route === 'classes' && <ClassesScreen t={t} settings={s} user={user} onBack={() => go('home')} onOpenLesson={(id) => openAssignment(id)} onOpenItem={openAssignItem} />}
      {logOpen && <PracticeLogSheet lang={s.uiLang} progress={progress} onSave={(k, m, x) => void saveLog(k, m, x)} onClose={() => setLogOpen(false)} />}
      {streakOpen && (
        <StreakSheet t={t} st={gems.streak} gems={gems.balance} today={localDay(new Date())} lang={s.uiLang} onBuy={buy} purchases={s.purchases ?? []} frame={s.avatarFrame} onBuyCosmetic={buyCosmetic} onFrame={(avatarFrame) => updateSettings({ avatarFrame })} onClose={() => setStreakOpen(false)} />
      )}
      {route === 'drone' && <DroneScreen t={t} settings={s} onBack={() => go(toolFrom.current)} />}
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
          onProgress={(p) => {
            setProgress(p);
            notePathResult(p);
          }}
          onBack={() => go(toolFrom.current)}
          onRuns={openRuns}
          onSingAlong={() => gate('vocal:singalong', () => go('singalong'))}
          startWarmup={vocalWarmup}
        />
      )}
      {route === 'online' && (
        <OnlineScreen key={`${onlineKey}-${user?.id ?? ''}`} t={t} settings={s} user={user} initialCode={onlineCode} facts={onlineFacts} onBack={() => go('arcade')} tier={socialInfo(ratingsOf(progress), s.activeCourse ?? 'ear', progress.gameTiers?.online, s.courses)} />
      )}
      {route === 'daily' && <DailyScreen t={t} settings={s} progress={progress} user={user} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'duel' && (
        <DuelSetup
          t={t}
          course={s.activeCourse}
          lang={s.uiLang}
          tier={socialInfo(ratingsOf(progress), s.activeCourse ?? 'ear', progress.gameTiers?.duel, s.courses)}
          onBack={() => go('arcade')}
          onStart={(names, kind, rounds, tier) => {
            setDuel({ names, kind, rounds, ...(tier ? { tier } : {}) });
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
    {tierToast && (
      <p className="tier-toast" role="status" data-tier-toast={tierToast.tier}>
        {s.uiLang === 'he' ? (
          <>
            עברתם את <i className="dyn">{tierToast.tier}</i>
            {tierToast.next ? <> — נפתחת <i className="dyn">{tierToast.next}</i></> : null}
          </>
        ) : (
          <>
            <i className="dyn">{tierToast.tier}</i> cleared{tierToast.next ? <> — <i className="dyn">{tierToast.next}</i> opens</> : null}
          </>
        )}
      </p>
    )}
    {courseSheet && <CourseSheet mine={courseCtx.mine} active={courseCtx.active} lang={s.uiLang} onPick={pickCourse} onClose={() => setCourseSheet(false)} />}
    </RefresherContext.Provider>
    </MiniGateContext.Provider>
    </CourseContext.Provider>
  );
}
