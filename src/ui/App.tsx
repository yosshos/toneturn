import { COURSE_SECTIONS } from '../engine/courseSections';
import { challengeFor } from '../engine/ranks';
import { SoundBlocked } from './SoundBlocked';
import { TodayCards } from './TodayCards';
import { GrooveEchoModes } from './GrooveEchoModes';
import { qualityOf } from '../audio/quality';
import { courseLevels } from '../engine/courseSocial';
import { techLevel, techQueue, workoutCreditsStep } from '../engine/ladderFacts';
import { CourseContext } from './courseContext';
import { CourseSheet } from './CourseSwitcher';
import { COURSE_AREAS, coursePlacementSkills, courseGoal, courseOf, switchCourse, type CourseId } from '../engine/courses';
import { AREAS as INTAKE_AREAS } from '../engine/intake';
import { miniForSkill } from '../content/refresher';
import { CHALLENGES } from '../engine/improvRules';
import { InsightsScreen } from './Insights';
import { Sidebar, type NavId } from './Sidebar';
import { Onboarding, onboardingIntake } from './Onboarding';
import { ACTIVE_PARTNER, allowedCourses, courseAllowed, defaultCourse, type DepthLink } from '../partner';
import { DepthCard, DepthScreen } from '../partner/Depth';
import { CommandPalette, type PaletteHit } from './CommandPalette';
import { startComputerKeys } from '../speech/computerKeys';
import { TodayAside } from './Asides';
import { ProgPuzzleScreen } from './ProgPuzzle';
import { ImprovStudioScreen } from './ImprovStudio';
import { LickTrainerScreen } from './LickTrainer';
import { LicksRoute, licksDue } from './LicksHead';
import { legacyLicksHash, licksHash } from './licksHub';
import { EncoreScreen } from './encore/Encore';
import { ChallengeScreen, PhrasePublicScreen } from './encore/Challenge';
import { CHALLENGES_ON, challengesMockOn, mockSignedOut, sharerBonusesDue, syncChallengeResults } from '../cloud/challenges';
import { syncGifts } from '../cloud/gifts';
import { syncTakeNotes } from '../cloud/takeNotes';
import { SHARER_RESULT_ID } from '../engine/encore/sharerBonus';
import { EX } from '../i18n/encoreText';
import { withAssignedPhrase } from '../engine/encore/assign';
import { TogetherChip } from './encore/Together';
import { publicFromHash } from '../engine/encore/community';
import { TeachScreen } from './TeachPhrase';
import { useTeacherPhrases, bookWithTeacherPhrases, phraseAssignsOf } from './teacherPhraseSync';
import { teacherMockOn } from '../cloud/teacher';
import { phrasesDueCount } from '../engine/encore/connect';
import { dueLicks, reviewAfter } from '../engine/licks';
import { bookUses, lickPool, todaysLick } from '../engine/vocab';
import { TranscribeCoachScreen } from './TranscribeCoach';
import { ExamsScreen, mockExamLesson } from './Exams';
import type { ExamDef } from '../content/bagrut';
import { AdminScreen, CoolDownSheet, PlansScreen } from './Plans';
import { coolDown, loadPricing, myPlan, type MyPlan, type Pricing } from '../cloud/pricing';
import { GrooveTrainerScreen } from './GrooveTrainer';
import { earIndex } from '../engine/rating';
import { MixerScreen } from './Mixer';
import type { Drill, FamilyId, ItemState } from '../engine/drills/types';
import { catalog, generate, type FamilyDef } from '../engine/drills/generate';
import { drumMicOf, VOICE_PERC } from '../engine/drumKit';
import { guitarCatalog } from '../engine/drills/guitar';
import { levelDrills } from '../engine/drills/plan';
import { listenCard, tuneSlotLevels } from '../engine/practiceMethod';
import { parseTopicRef, submitResult, type AssignItem } from '../cloud/teacher';
import { DigestScreen } from './TeacherLoop';
import { IMPROV_LEVELS } from '../engine/charts';
import { loadPieces, PiecesScreen, piecesDue } from './Pieces';
import { SlowDownScreen } from './SlowDown';
import { MySongScreen } from './MySong';
import { ChartsScreen, type MyChart, type VocabCtx } from './Charts';
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
import { ladderLessonKey, lessonForUnit, MINI_LESSONS } from '../content/minilessons';
import { guitarAddOnsOf, guitarVoiceOf } from '../engine/drills/guitarMeta';
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
import { freshStartIfNeeded, PROGRESS_EPOCH, remoteSettingsForEpoch } from '../storage/freshStart';
import { cloudConfigured, currentUser, signInWithGoogle, onAuthChange, pullSettings, pushSettings, syncProgress, type CloudUser } from '../cloud/cloud';
import { AccountCard, type SyncState } from './Account';
import { DAILY_GOAL_XP, Home, lessonStates, TopBar } from './Home';
import { KeysSoundAsk, useMidiDevices, type KeysSoundProp } from './KeysSound';
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
import { ChordFinder } from './ChordFinder';
import { ChordBuilder } from './ChordBuilder';
import { Metronome } from './Metronome';
import { Drills, drillSettingsOf } from './Drills';
import { badgeInputOf, refreshRanksBadges } from '../engine/rankBadges';
import { PLACEMENT_ORDER, ratingDrift, recalibration } from '../engine/placement';
import { mergePriors, tierPlacement } from '../engine/tierPlacement';
import { placementOfCourse, placementSkills } from '../engine/placement';
import { foldFromMemo } from '../engine/stats';
import { BadgesView, ChallengeCard } from './Badges';
import type { RankChange } from '../engine/ranks';
import type { Badge } from '../engine/badges';
import { BadgeUnlock, RankUpUnlock } from './BadgeUnlock';
import { familyById, itemTargetBpm, skillDrillsInKey, todayDrills } from '../engine/drills/plan';
import { blockLabel, WorkoutCard, WorkoutEditor, WorkoutRunScreen } from './Workout';
import { addSession, blockLeftMs, creditBlock, nextBlock, nextForBlock, runLeftMs, startRun, suggestWorkout, teacherToday, techBlockOf, validateTemplate, withTeacher, type Block, type BlockTarget, type WorkoutRun } from '../engine/workout2';
import { keptPlan, matrixTierOf, weekKeyIfKept } from './todayTech';
import { keyName as keyNameOf } from '../engine/drills/generate';
import { subPriorities } from '../engine/scheduler';
import { foldSubs } from '../engine/taxonomy';
import { DOMAINS, evidence, weakestSkill } from '../engine/rating';
import { useMotion } from './motion';
import { ICON_MOTION_ROUTES } from './paper/motion';
import { awardName, MonthReviewIcon, ProgressTabs } from './Stats';
import { achievements, earnAwards, firstAwardsLine, firstLaunchAwards } from '../engine/achievements';
import { bumpCount } from '../engine/stats';
import { gameAccuracy } from '../engine/gameRating';
import '../tiers.css';
import { submitGameBest } from '../cloud/compete';
import { socialInfo, TIERS, clearsRun, isTier, tierStepStars, tierInfo, tierKey, type DynName, type TierInfo } from '../engine/gameTiers';
import { Flight } from './Flight';
import { NameTune } from './NameTune';
import { TuneUp } from './TuneUp';
import { Highway } from './Highway';
import { DrumGame } from './DrumGame';
import { GrooveOff } from './GrooveOff';
import { MelodyPuzzle } from './MelodyPuzzle';
import { PitchMemory } from './PitchMemory';
import { PeakHunter } from './PeakHunter';
import { Rush } from './Rush';
import { ReharmSpot } from './ReharmSpot';
import { TranscribeRace } from './TranscribeRace';
import { BhInTime } from './BhInTime';
import { RiffEcho } from './RiffEcho';
// 0.76: instrument, voice and drum games (GAMES_TIERS_PLAN §3)
import { PlayItBack, RootsByEar } from './HearPlay';
import { VoicingSprint } from './VoicingSprint';
import { ChordChangeRace } from './ChangeRace';
import { WalkTheChanges } from './WalkChanges';
import { HarmonyHold } from './HarmonyHold';
import { GuideToneRunner } from './GuideToneRunner';
import { StaffRunner } from './StaffRunner';
import { RootCatcher } from './RootCatcher';
import { StrumChanges } from './StrumChanges';
import { ReboundBall } from './ReboundBall';
import { SingBack } from './SingBack';
import { Call5432 } from './Call5432';
import { EnclosureTarget } from './EnclosureTarget';
import { ChangesCrossword } from './ChangesCrossword';
import { HoldTheNote } from './HoldTheNote';
import { ThirdJump } from './ThirdJump';
import { DarkSide } from './DarkSide';
import { EuclidGame } from './EuclidGame';
import { WhichPair } from './WhichPair';
import { MirrorGame } from './MirrorGame';
import { Tonnetz } from './Tonnetz';
import { SingInterval } from './SingInterval';
import { KitRead } from './KitRead';
import { NameGroove } from './NameGroove';
import { BorderControl } from './BorderControl';
import { WhichBrother } from './WhichBrother';
import { RunCatcher } from './RunCatcher';
import { CompCaller } from './CompCaller';
import { Elevator } from './Elevator';
import { PolyLock } from './PolyLock';
import { GameBoard } from './GameBoard';
import { GAME_TITLES } from '../engine/gameBoard';
import { COURSE_GAMES } from './courseRows';
// The social round (SPEC-SOCIAL §8, 2026-11-12): milestone posts, challenge links.
import { ChallengeSheet } from './Community';
import { clearPendingChallenge, openChallenge, pendingChallenge, postMilestones, savePendingChallenge, type OpenedChallenge } from '../cloud/community';
import { challengeFromHash, learnedStandards, type MilestoneEvents } from '../engine/socialRound';
import { effectivePrivacy } from '../engine/privacy';
import { loadSlot, saveSlot } from '../storage/resume';
import { nodeTitle, PathView2, stepTitle, useMasteryView, usePathView } from './Path';
import { checkpointTech, checkTechStars, leadsTo, masteryLine, rankHold, strengthenDrills, strengthenStep, unitMastery, UNIT_MASTERY_XP } from '../engine/pathMastery';
import { THEMES, checkpointParts, checkpointSession, recordStep, stepSession, stepStars, testOutPassed, testOutSession, type PathStep, type PathUnit, type UnitStep } from '../engine/path';
import { FriendsScreen } from './Friends';
import { useWakeLock } from './useWakeLock';
import { clearPendingFriend, friendFromHash, pendingFriend, savePendingFriend, setFriendFlash } from '../engine/shareLinks';
import { addFriend, enablePush, reportGameBest, reportRating, reportStreakDays, setProfile, uploadAvatar } from '../cloud/social';
import { courseHasProgress, firstWeekDay, levelOfReport, levelTested, markSetup, markTasteDone, markTasteOpened, markWinSeen, migrateCourseStart, offerDue, pickProbes, reportCourse, sessionsSince, setPersonalGoal, setupNeeded, snoozeOffer, stageOf, goalById, tasteFor, type CourseStartMap, type ProgressFacts, type SelfReport } from '../engine/courseStart';
import { coursesToOpen, jazzFocusOn, jazzOpenIn, toggleJazzFocus } from '../engine/jazzFold';
import { tasteDrills, tasteLesson } from '../engine/tasteLessons';
import { realDrills } from '../engine/tasteLessons';
import { firstWinCourses, markRealDone, markRealOpened, markRealSeen, realMusicCard, realMusicFor, skipReal } from '../engine/courseStart';
import { RealMusicCard } from './CourseStart';
import { Opener, type OpenerSpec } from './Opener';
import { stepGlyphOf } from './Path';
import { courseOpenerSeen, markCourseOpener, markUnitOpener, unitOpenerDue, unitThemeOf } from '../content/openers';
import { CourseGoalLine, CourseSetup, CourseStartHero, CourseWelcome, FirstWeekCard, FirstWin, LevelOfferCard } from './CourseStart';
import { isYoung } from '../engine/privacy';
import { overallRating } from '../engine/rating';
import { APP_VERSION, unseenChanges } from '../version';
import { params, piano, setMidiEnabled, SIMULATED, store, tts } from './services';
import { midi } from '../speech/midi';
import { RepertoireScreen } from './Repertoire';
import { engineArg, engineHash, isEngineRoute, legacyPracticeHash, practiceRouteOf, repHash, type RepView } from './practiceRoutes';
import { chartOfLevel, chartOfPiece, parsePieceKey, pieceKey, type LibEntry, type PieceAction } from '../engine/repLibrary';
import { firstRootPc } from './Charts';
import { PlaceSpark } from './PlaceSpark';
import { placeOfRoute, placeTitle, rememberPlace } from './continuePlace';
import { DrumImprovScreen } from './DrumImprov';
import type { LeadSheet } from '../engine/leadsheet';
import { irealStyle } from '../engine/leadsheet';
import type { ChartStyle } from '../engine/charts';
import { isRepLesson, repGoal, repResult, repResults, type RepCourse, type RepItem, type RepWay } from '../engine/repertoire';
import { isDrillWay, repDrills } from '../engine/repertoireDrills';
import { STANDARD_CHANGES } from '../engine/standards';
import { setPreferredMic } from '../speech/mic';
import { PracticeDiaryScreen, DiaryEntryCard, plateausOf } from './PracticeDiary';
import { ConsentBody, RecordingsEntryCard, RecordingsScreen } from './Recordings';
import { applySyncedMeta, putSyncedTake, runCleanup, setRecordingContext, setRecordingPrefs, setVocalMigrationSource, subscribeRecordings, syncCandidates } from '../storage/recordings';
import { listTakes as listOldVocalTakes } from '../storage/takes';
import { armGameTap, keepGameTake, setRecKindHint, setRecRoute } from './recKeep';
import { measuredMsOn } from '../engine/practiceTime';
import { recordSnapshot } from '../storage/snapshots';
import { addJournalNote, loadLedger, installPracticeClock, onMeasuredDay, recordPlateauTry, setPracticeContext } from '../storage/practice';
import { otherKey, stepBack, type PlateauFinding } from '../engine/plateau';
import { Icon } from './icons';
import { registerLangSetter } from './langSwitch';
import { rememberSplashPrefs } from './brand/splashDecision';

/** Screens that play the band (0.69: its sets load here, and only here on Lite / Standard). */
const BAND_ROUTES = new Set<string>(['charts', 'improv', 'groove', 'metronome', 'mixer', 'slowdown', 'perform', 'highway', 'drills', 'workoutrun', 'land', 'groove-echo', 'odd-echo', 'time-lock', 'ghost-control', 'rudiment-rush', 'groove-off']);

type Route = 'intake' | 'studio' | 'home' | 'path' | 'arcade' | 'lesson' | 'settings' | 'diagnostics' | 'games' | 'game' | 'friends' | 'skills' | 'daily' | 'duel' | 'duelplay' | 'online' | 'drone' | 'classes' | 'ghost' | 'truefalse' | 'vocal' | 'achievements' | 'singalong' | 'perform' | 'learned' | 'tuner' | 'metronome' | 'songs' | 'repertoire' | 'drills' | 'workout' | 'workoutrun' | 'peakhunter' | 'rush-chord' | 'rush-note' | 'rush-fretboard' | 'rush-interval' | 'rush-keysig' | 'rush-progression' | 'rush-voicing' | 'rush-scale' | 'rush-standard' | 'reharm' | 'transcribe' | 'bhtime' | 'riffecho' | 'polylock' | 'gameboard' | 'flight' | 'pitchmemory' | 'nametune' | 'tuneup' | 'highway' | 'melodypuzzle' | 'charts' | 'slowdown' | 'pieces' | 'mixer' | 'insights' | 'groove' | 'welcome' | 'coursestart' | 'puzzle' | 'improv' | 'exams' | 'plans' | 'admin' | 'land' | 'groove-echo' | 'odd-echo' | 'time-lock' | 'ghost-control' | 'rudiment-rush' | 'groove-off' | 'licks' | 'transcribe-coach' | 'chordfinder' | 'mysong' | 'chordbuilder' | 'playback' | 'voicingsprint' | 'changerace' | 'walkchanges' | 'rootsear' | 'harmonyhold' | 'singinterval' | 'kitread' | 'namegroove' | 'depth' | 'guidetone' | 'call5432' | 'enclosure' | 'crossword' | 'holdnote' | 'bordercontrol' | 'whichbrother' | 'runcatcher' | 'compcaller' | 'elevator' | 'diary' | 'staffrunner' | 'rootcatch' | 'strumchange' | 'rebound' | 'singback' | 'thirdjump' | 'darkside' | 'recordings' | 'encore' | 'whichpair' | 'mirror' | 'tonnetz' | 'teach' | 'challenges' | 'euclid';
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
  // Owner 2026-11-22: Encore moved inside the Licks tile — its old homes (#/encore, #/challenges) open the tile's
  // section (Mine, Challenges); the address is rewritten in place, so Back never lands on the old one.
  const legacy = legacyLicksHash(location.hash);
  if (legacy) history.replaceState(history.state, '', `#${legacy}`);
  // Phase 3 (SPEC-PRACTICE-IA-3 §5): Charts, My pieces, My song and the songbook live in Repertoire, the transcription
  // coach in Licks › Transcribe — their old homes land there (practiceRoutes.ts).
  const legacyP = legacyPracticeHash(location.hash);
  if (legacyP) history.replaceState(history.state, '', `#${legacyP}`);
  const pr = practiceRouteOf(location.hash);
  if (pr) return pr;
  const h = location.hash.replace(/^#\/?/, '').replace(/^licks\/.*$/, 'licks').replace(/^online\/.*$/, 'online').replace(/^settings\/.*$/, 'settings').replace(/^recordings\/.*$/, 'recordings').replace(/^encore[/?].*$/, 'encore').replace(/^teach\/.*$/, 'teach').replace(/^challenges[/?].*$/, 'challenges');
  return (['path', 'arcade', 'settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost', 'truefalse', 'vocal', 'achievements', 'singalong', 'perform', 'learned', 'studio', 'intake', 'tuner', 'metronome', 'songs', 'repertoire', 'drills', 'workout', 'workoutrun', 'peakhunter', 'rush-chord', 'rush-note', 'rush-fretboard', 'rush-interval', 'rush-keysig', 'rush-progression', 'rush-voicing', 'rush-scale', 'rush-standard', 'reharm', 'transcribe', 'bhtime', 'riffecho', 'polylock', 'gameboard', 'flight', 'pitchmemory', 'nametune', 'tuneup', 'highway', 'melodypuzzle', 'charts', 'slowdown', 'pieces', 'mixer', 'insights', 'groove', 'welcome', 'coursestart', 'puzzle', 'improv', 'exams', 'plans', 'admin', 'land', 'groove-echo', 'odd-echo', 'time-lock', 'ghost-control', 'rudiment-rush', 'groove-off', 'licks', 'transcribe-coach', 'chordfinder', 'mysong', 'chordbuilder', 'playback', 'voicingsprint', 'changerace', 'walkchanges', 'rootsear', 'harmonyhold', 'singinterval', 'kitread', 'namegroove', 'depth', 'bordercontrol', 'whichbrother', 'runcatcher', 'compcaller', 'elevator', 'guidetone', 'call5432', 'enclosure', 'crossword', 'holdnote', 'diary', 'staffrunner', 'rootcatch', 'strumchange', 'rebound', 'singback', 'thirdjump', 'darkside', 'recordings', 'encore', 'whichpair', 'euclid', 'mirror', 'tonnetz', 'teach', 'challenges'] as Route[]).includes(h as Route) ? (h as Route) : 'home';
};

/** The level a generated modes lesson was made at (from its first question's pool size). */
const modesAgainLevel = (def: { questions: { choices: unknown[]; difficulty: number }[] }) => {
  const d = def.questions[0]?.difficulty ?? 900;
  const i = MODE_ID_LEVELS.findIndex((_, k) => d < (MODE_ID_LEVELS[k + 1]?.base ?? Infinity));
  return Math.max(1, i + 1);
};

/** What says a course was already played (SPEC-COURSE-START migration): path facts, results, technique, vocal levels. */
const courseFactsOf = (s: Settings, p: Progress): ProgressFacts => ({
  activeCourse: s.activeCourse,
  pathFacts: s.pathFacts,
  pathFactsBy: s.pathFactsBy,
  history: p.history,
  lessonsDone: Object.values(p.lessons).filter((l) => (l?.completions ?? 0) > 0).length,
  drillFamilies: [...new Set(Object.values(p.drillItems ?? {}).map((x) => x.family as string))],
  vocalPassed: p.vocal?.passed?.length ?? 0,
});

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [progressReady, setProgressReady] = useState(false);
  // SPEC-PROGRESS-CHARTS §1 (phase 1b): today's progress snapshot, a few seconds after progress settles; the past is
  // back-filled once. Feeds the over-time charts; nothing on screen yet.
  useEffect(() => {
    if (!progressReady) return;
    const id = window.setTimeout(() => {
      void recordSnapshot(localDay(new Date()), progress.drillItems ?? {}, loadLedger().days);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [progress.drillItems, progressReady]);
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
  // Encore v3 (SPEC-PHRASE-STUDIO §11.7): a shared phrase's public link (#/p/CODE[/BEAT]) — readable without an account.
  const [publicLink, setPublicLink] = useState(() => publicFromHash(location.hash));
  useEffect(() => {
    const on = () => {
      const p = publicFromHash(location.hash);
      if (p) setPublicLink(p);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  /** Generated session in progress (placement / review / weekly puzzle). */
  /** Voice-consent gate for sessions started outside the Practice button. */
  const [consentThen, setConsentThen] = useState<null | (() => void)>(null);
  const [generated, setGenerated] = useState<{ def: LessonDef; adapt?: (s: SessionState) => Question[] | null } | null>(null);
  /** The running lesson's save slot (every lesson keeps its place after each answer; playtesting, 0.35.2). */
  const [dropTick, setDropTick] = useState(0);
  type Brief = { kicker: string; title: string; about: string; topic?: string; keepStep?: string; level?: number; pathStep?: string };
  const [slot, setSlot] = useState<{ key: string; title: string; seed?: number; resume?: SavedSession; brief?: Brief; briefSeen?: boolean } | null>(null);
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
  const saveLog = async (kind: LogKind, minutes: number, xpToday: number, note?: string) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setProgress(await store.recordCompletion({ ...makeLogResult(kind, minutes, xpToday, new Date(), id), ...(note ? { note } : {}) }));
    setLogOpen(false);
  };
  const gems = useMemo(() => gemsOf(progress, settings?.purchases ?? [], new Date(), settings?.streakWeekly), [progress, settings?.purchases, settings?.streakWeekly]);
  // AUDIT-5 #1: the practice clock (active, idle-trimmed time on practice screens), and #4: a day with 5 measured
  // minutes is a practice day even without a recorded take.
  useEffect(() => installPracticeClock(), []);
  useEffect(() => onMeasuredDay(() => void store.markPracticeDay().then(setProgress)), []);
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
    // SPEC-COURSE-START: a course never started (and never played) opens with its own welcome card.
    if (c !== (settings.activeCourse ?? 'ear') && !settings.courseStart?.[c] && !courseHasProgress(c, courseFactsOf(settings, progress))) go('coursestart');
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
  // Testing round (owner 2026-11-19): after a fresh start, say so once, so it never looks like a bug.
  const [freshNotice, setFreshNotice] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    // Once per epoch every device starts over (storage/freshStart.ts), before anything reads settings or progress.
    void freshStartIfNeeded(store)
      .catch(() => false)
      .then((wiped) => {
        if (wiped) setFreshNotice(true);
        void store.loadSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
        void store.loadProgress().then((p) => {
          setProgress(p);
          setProgressReady(true);
        });
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
      const raw = await pullSettings(user.id).catch(() => null);
      // A cloud copy from before the fresh start brings back only the person's and the device's settings.
      const stale = Boolean(raw) && raw!.progressEpoch !== PROGRESS_EPOCH;
      const remote = raw ? remoteSettingsForEpoch(raw) : null;
      if (remote)
        setSettings((prev) => {
          // Gem purchases are append-only: keep the union of both devices (by id).
          const all = [...(prev?.purchases ?? []), ...((remote as Partial<Settings>).purchases ?? [])];
          const purchases = all.filter((x, i) => all.findIndex((y) => y.id === x.id) === i);
          const next = migrateSettings({ ...(prev ?? DEFAULT_SETTINGS), ...remote, purchases, voiceConsent: prev?.voiceConsent ?? false, progressEpoch: PROGRESS_EPOCH });
          if (stale) void pushSettings(user.id, next).catch(() => {});
          return next;
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
  // The opening animation shows before settings load: it reads the last language and motion setting from here.
  useEffect(() => {
    if (settings) rememberSplashPrefs({ lang: s.uiLang, reduced: s.reducedMotion ?? undefined });
  }, [settings, s.uiLang, s.reducedMotion]);
  // AUDIT-5 #1: the clock runs on practice screens only, and books time to the active course.
  useEffect(() => setPracticeContext(route, settings?.activeCourse), [route, settings?.activeCourse]);
  // My recordings (SPEC-PHRASE-STUDIO §6): takes know their screen, course and session; the settings' two switches; the
  // old vocal takes are copied in on first use; the retention policy runs once a little after start.
  const recFrom = useRef<Route>('home');
  const lastRoute = useRef<Route>(route);
  const recCourse = useRef<CourseId | null>(null);
  useEffect(() => {
    recCourse.current = (settings?.activeCourse ?? null) as CourseId | null;
    if (route === 'recordings' && lastRoute.current !== 'recordings') recFrom.current = lastRoute.current;
    lastRoute.current = route;
    setRecRoute(route, recCourse.current);
    setRecKindHint(route === 'drills' && drillFrom.current === 'test' ? 'level-test' : null);
  }, [route, settings?.activeCourse]); // eslint-disable-line react-hooks/exhaustive-deps
  // My recordings: a game that takes MIDI or microphone input keeps each run's notes (and audio) as a take; quiz games
  // (the rush family) and games that open no input keep nothing.
  useEffect(() => {
    const g = GAMES2.find((x) => x.id === route);
    if (!g || g.id === 'drills' || route.startsWith('rush-')) return;
    return armGameTap(route, { en: g.en[0], he: g.he[0] });
  }, [route]);
  useEffect(() => setRecordingPrefs({ keepNotes: settings?.keepTakeNotes !== false, keepAudio: settings?.keepTakes !== false }), [settings?.keepTakeNotes, settings?.keepTakes]);
  useEffect(() => {
    setRecordingContext(() => ({ route: lastRoute.current, course: recCourse.current, measuredMs: measuredMsOn(loadLedger(), localDay(new Date())) }));
    setVocalMigrationSource(listOldVocalTakes);
    const id = window.setTimeout(() => void runCleanup(), 15_000);
    return () => window.clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    () => {
      const active = courseAllowed(s.activeCourse ?? 'ear') ? s.activeCourse ?? 'ear' : defaultCourse();
      return {
        active,
        mine: allowedCourses(s.courses?.length ? s.courses : ['ear' as CourseId]),
        open: () => setCourseSheet(true),
        examPrep: !!s.examPrep,
        setExamPrep: (on: boolean) => updateSettings({ examPrep: on }),
        // SPEC-JAZZ-FOLD: the jazz pack and the jazz-focus switch of the active course.
        jazzOn: jazzOpenIn(s, active),
        jazzFocus: jazzFocusOn(s, active),
        setJazzFocus: (on: boolean) => updateSettings({ jazzFocus: toggleJazzFocus(s, active, on) }),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.activeCourse, s.courses, s.examPrep, s.jazzFocus, s.jazzOpen, s.pathPacks, s.track, s.goal, s.drills],
  );
  // A partner build offers only its courses (src/partner): a stored course outside them moves to the build's first.
  useEffect(() => {
    if (!ACTIVE_PARTNER || !settings) return;
    const mine = settings.courses?.length ? settings.courses : ['ear' as CourseId];
    const active = settings.activeCourse ?? 'ear';
    if (courseAllowed(active) && mine.every((c) => courseAllowed(c))) return;
    updateSettings({ courses: allowedCourses(mine), activeCourse: courseAllowed(active) ? active : allowedCourses(mine)[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!settings, settings?.activeCourse, settings?.courses]);

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
    midi.setOptions({ only: s.midiDevice ?? null, octave: s.midiOctave ?? 0, pedalInvert: !!s.midiPedalInvert, guitarChannels: s.midiGuitarChannels ?? 'auto', bendRange: s.midiBendRange ?? 2, drums: s.activeCourse === 'drums', ...(s.drumKit ? { kit: s.drumKit } : {}) });
    document.documentElement.style.fontSize = s.textScale && s.textScale !== 1 ? `${Math.round(s.textScale * 100)}%` : '';
  }, [s.mixer, s.textScale, s.volume, s.cues, s.ttsRate, s.haptics, s.micDeviceId, s.midiDevice, s.midiOctave, s.midiPedalInvert, s.midiGuitarChannels, s.midiBendRange, s.activeCourse, s.drumKit]);
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
  // Owner 2026-11-20: the app's sound for MIDI keys, one tap away in the top bar while a keyboard is connected, and one
  // question when a keyboard first connects (a digital piano has its own speakers; the app's echo arrives late).
  const keysSound: KeysSoundProp | undefined = s.midiInput && s.activeCourse !== 'drums' ? { on: s.midiSound !== false, toggle: () => updateSettings({ midiSound: s.midiSound === false, midiSoundAsked: true }), lang: s.uiLang } : undefined;
  const midiNames = useMidiDevices(!!s.midiInput && s.activeCourse !== 'drums');
  // Automated runs (e2e, stub keyboards) are asked only with ?keysask in the address — the sheet would cover every MIDI test.
  const askKeysSound = !!s.midiInput && s.activeCourse !== 'drums' && !s.midiSoundAsked && midiNames.length > 0 && !(typeof navigator !== 'undefined' && navigator.webdriver && !params.has('keysask')) ? midiNames[0] : null;
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
  useWakeLock(s.keepAwake !== false);
  // SPEC-JAZZ-FOLD §3: a beginner whose course level reaches mf gets that course's jazz opened (persisted, with a
  // one-time notice). Never closes anything.
  const jazzToOpen = useMemo(() => (settings && progressReady ? coursesToOpen(settings, ratingsOf(progress)) : []), [settings, progress, progressReady]);
  useEffect(() => {
    if (!settings || !jazzToOpen.length) return;
    updateSettings({ jazzOpen: Array.from(new Set([...(settings.jazzOpen ?? []), ...jazzToOpen])), jazzNotice: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jazzToOpen.join(',')]);
  // Owner 2026-11-19: no notices while the app is in development (no real users yet) — jazz opens quietly.
  useEffect(() => {
    // The globe switches the whole app: screens, spoken answers and the voice that answers (owner feedback 2026-11-18).
    registerLangSetter((lang) => updateSettings({ uiLang: lang, inputLang: lang, outputLang: lang }));
    return () => registerLangSetter(null);
  }, [updateSettings]);
  /** SPEC-COURSE-START: one step of a course's start, applied to the latest state (several can land in one tap). */
  const updateCourseStart = useCallback(
    (fn: (m: CourseStartMap | undefined) => CourseStartMap | undefined) => {
      setSettings((prev) => {
        const base = prev ?? DEFAULT_SETTINGS;
        const cs = fn(base.courseStart);
        if (cs === base.courseStart) return prev;
        const next = { ...base, courseStart: cs };
        void store.saveSettings(next);
        if (user) void pushSettings(user.id, next).catch(() => {});
        return next;
      });
    },
    [user],
  );

  // Encore v3 (SPEC-PHRASE-STUDIO §12): community challenges, behind the flag (cloud/challenges.ts CHALLENGES_ON).
  const challengeSignedIn = !!user || (challengesMockOn() && !mockSignedOut());
  useEffect(() => {
    if (!publicLink || !challengeSignedIn) return;
    try {
      localStorage.removeItem('toneturn.phraseLink');
    } catch {
      /* fine */
    }
    location.hash = `/challenges/p/${publicLink.code}${publicLink.beat ? `/${publicLink.beat}` : ''}`;
    setPublicLink(null);
  }, [publicLink, challengeSignedIn]);
  useEffect(() => {
    // a public link opened before signing in: the OAuth round trip drops the hash
    if (!challengeSignedIn || publicLink) return;
    try {
      const saved = localStorage.getItem('toneturn.phraseLink');
      if (saved) {
        localStorage.removeItem('toneturn.phraseLink');
        location.hash = `/challenges/p/${saved}`;
      }
    } catch {
      /* fine */
    }
  }, [challengeSignedIn, publicLink]);
  useEffect(() => {
    if (!CHALLENGES_ON() || !challengeSignedIn) return;
    const id = window.setTimeout(() => void syncChallengeResults(s.lickBook, progress.drillItems ?? {}).catch(() => 0), 2500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeSignedIn, progress.drillItems, s.lickBook]);
  // Gifts between friends (owner 2026-11-16, cloud/gifts.ts): fermatas into the purchase list, dedications into the
  // Encore library, a dedication made "yours" reported once, completion bonuses granted once (personal XP only).
  const giftBusy = useRef(false);
  useEffect(() => {
    if (!CHALLENGES_ON() || !challengeSignedIn || giftBusy.current) return;
    const id = window.setTimeout(() => {
      giftBusy.current = true;
      void (async () => {
        try {
          if (!settings) return;
          const r = await syncGifts({ book: s.lickBook, purchases: s.purchases ?? [], items: progress.drillItems ?? {}, granted: progress.granted });
          if (r.purchases.length || r.licks.length)
            setSettings((prev) => {
              const base = prev ?? DEFAULT_SETTINGS;
              const have = new Set((base.purchases ?? []).map((x) => x.id));
              const add = r.purchases.filter((x) => !have.has(x.id));
              let book = base.lickBook;
              for (const l of r.licks) if (!(book?.own ?? []).some((x) => x.id === l.id)) book = withAssignedPhrase(book, l);
              if (!add.length && book === base.lickBook) return prev;
              const next = { ...base, purchases: [...(base.purchases ?? []), ...add], lickBook: book };
              void store.saveSettings(next);
              if (user) void pushSettings(user.id, next).catch(() => {});
              return next;
            });
          let p: Progress | null = null;
          for (const g of r.xp) p = await store.recordBonusXp(g.key, g.xp);
          if (p) setProgress(p);
        } finally {
          giftBusy.current = false;
        }
      })();
    }, 1800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeSignedIn, !!settings, progress.drillItems, route]);
  // Encore challenges (§11.5): +5 XP when a friend reaches the target on my shared phrase — once per friend and phrase,
  // at most 50 a week — as an ordinary result, so it counts in the weekly league (never a practice day).
  useEffect(() => {
    if (!CHALLENGES_ON() || !challengeSignedIn || !progressReady) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const due = await sharerBonusesDue(progress.history);
          let p: Progress | null = null;
          for (const b of due)
            p = await store.recordCompletion({ lessonId: SHARER_RESULT_ID, lessonVersion: 1, sessionId: b.sessionId, completedAt: new Date().toISOString(), firstTry: 1, total: 1, xp: b.xp, missed: [], items: [] });
          if (p) {
            setProgress(p);
            const xp = due.reduce((a, b) => a + b.xp, 0);
            setAwardToast(`${EX.learnedBonus[s.uiLang]} · ‎+${xp} XP`);
          }
        } catch {
          /* next check */
        }
      })();
    }, 3000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeSignedIn, progressReady, route]);
  // My recordings (§6.2): the opt-in sync of starred takes' NOTES between my devices (cloud/takeNotes.ts, flag off by
  // default) — a moment after sign-in, and 10 s after the recordings change (a star, a folder, a delete).
  const notesSyncOn = !!user && !!settings?.syncTakeNotes;
  useEffect(() => {
    if (!notesSyncOn) return;
    let busy = false;
    let timer = 0;
    const run = () => {
      if (busy) return;
      busy = true;
      void syncTakeNotes(true, { local: syncCandidates, put: putSyncedTake, meta: applySyncedMeta })
        .catch((e) => console.warn('[toneturn] take notes sync failed', e))
        .finally(() => (busy = false));
    };
    const soon = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, ms);
    };
    soon(4000);
    const off = subscribeRecordings(() => soon(10_000));
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [notesSyncOn]);
  // Encore v2 (SPEC-PHRASE-STUDIO §11): teacher phrases into the lick book; each passed key submitted once
  useTeacherPhrases({ enabled: !!user || teacherMockOn(), route, book: s.lickBook, items: progress.drillItems ?? {}, onBook: (lickBook) => updateSettings({ lickBook }) });
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
            /not allowed/.test(m)
              ? he ? 'הכינוי הוסר אחרי דיווחים — בחרו כינוי חדש בהגדרות.' : 'Your nickname was removed after reports — choose a new one in Settings.'
              : /taken/.test(m)
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
  /** Improvise opened from a piece ("Improvise on it"): the chart its rules start on. */
  const improvInit = useRef<MyChart | null>(null);
  /** A practice at the piano opened from a chart player whose address names its piece: Back returns to that player. */
  const chartReturn = useRef(false);
  /** Technique opened from a piece ("Practise it in the technique hub"): the key page of the chart's key. */
  const [drillsKey, setDrillsKey] = useState<number | null>(null);
  const go = (r: Route) => {
    // The Licks tile (owner 2026-11-22): Encore's home is its "Mine" section, the challenges gallery its "Challenges".
    if (r === 'encore' || r === 'challenges') {
      location.hash = licksHash(r === 'encore' ? 'mine' : 'challenges');
      return setRoute('licks');
    }
    if ((r === 'tuner' || r === 'metronome' || r === 'drone' || r === 'charts' || r === 'slowdown' || r === 'groove' || r === 'vocal' || r === 'learned' || r === 'chordfinder' || r === 'chordbuilder') && route !== r && route !== 'lesson' && route !== 'singalong' && route !== 'mixer') toolFrom.current = route === 'arcade' || route === 'path' || route === 'drills' || route === 'insights' || route === 'improv' || route === 'friends' || route === 'exams' || route === 'repertoire' || route === 'licks' ? route : 'home';
    // Phase 3: the engines Repertoire / Licks reuse open at their new addresses (with the piece they show, for a reload).
    const arg = engineArgNext.current;
    engineArgNext.current = null;
    location.hash = r === 'lesson' || r === 'game' ? `/${PLAY_HASH}` : r === 'home' ? '' : isEngineRoute(r) ? engineHash(r, arg) : `/${r}`;
    setRoute(r);
  };
  /** The id the next engine screen shows (go() puts it in the address). */
  const engineArgNext = useRef<string | null>(null);
  /** Repertoire at a view (a tab, Mine, a piece page and how it was reached). */
  const openRep = (v: RepView) => {
    location.hash = repHash(v);
    setRoute('repertoire');
  };
  /** An engine screen opened from a piece page (the chart player, the piece coach, My song, a practice): its way back
   *  is the browser's Back, to the very page it came from; without one (a reload) it lands on `fallback`. */
  const repReturn = useRef<string | null>(null);
  const backToRep = (fallback: () => void) => {
    const h = repReturn.current;
    repReturn.current = null;
    if (h && location.hash !== h) return history.back();
    fallback();
  };

  // Mini-lessons (spec X): a unit opens with its short lesson until the player has heard it to the end.
  const [mini, setMini] = useState<{ lesson: MiniLesson; then: () => void } | null>(null);
  // The course / unit opener (Opener.tsx): a film over the screen; `then` continues what opened it (Start or Skip).
  const [opener, setOpener] = useState<{ spec: OpenerSpec; then?: () => void } | null>(null);
  /** Openers show on their own except in automated runs (like the mini-lessons), unless asked for with ?openers. */
  const openersOn = !(SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver)) || params.has('openers');
  // "Continue where I stopped" (phase 3): the last place's address, kept as the player moves inside it.
  useEffect(() => {
    const place = placeOfRoute(route);
    if (!place || !settings) return;
    const save = () => {
      if (placeOfRoute(routeFromHash()) !== place) return;
      rememberPlace({ place, hash: location.hash || `#/${route}`, title: placeTitle(route, location.hash, settings.uiLang, settings.myCharts) });
    };
    save();
    window.addEventListener('hashchange', save);
    return () => window.removeEventListener('hashchange', save);
  }, [route, !!settings]); // eslint-disable-line react-hooks/exhaustive-deps
  // Licks › Transcribe opens with its quick lesson the first time (game:transcribe), as its tile did.
  useEffect(() => {
    if (route === 'transcribe-coach' && !measuredStep.current) gate('game:transcribe', () => undefined);
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps
  // Icon tap motion (src/ui/paper/motion.ts) only on the app's own screens — never inside an exercise or a mini-lesson.
  useEffect(() => {
    document.documentElement.dataset.iconMotion = ICON_MOTION_ROUTES.has(route) && !mini ? 'on' : 'off';
  }, [route, mini]);
  const playerFirstName = user?.name ? user.name.split(' ')[0] : null;
  const markLearned = (id: string) => updateSettings({ learned: { ...(settings?.learned ?? {}), [id]: new Date().toISOString() } });
  /** The unit opener just played (owner 2026-11-18): it REPLACES the first screen of what the unit opens with — the
   *  mini-lesson's first step when one is due, otherwise the exercise's brief page. Read once by the next gate(). */
  const openerReplaces = useRef(false);
  const gate = (unit: string | null, start: () => void) => {
    const l = unit ? lessonForUnit(unit) : null;
    const cur = settings;
    const replaced = openerReplaces.current;
    openerReplaces.current = false;
    // Automated test runs (simulator, unlocked, WebDriver) skip them unless asked for with ?mini.
    const automated = SIMULATED || params.has('unlock') || (typeof navigator !== 'undefined' && navigator.webdriver);
    const auto = (cur?.miniLessons ?? true) && (!automated || params.has('mini'));
    if (!l || !auto || cur?.learned?.[l.id] || cur?.miniSeen?.[l.id]) {
      if (!replaced) return start();
      againing.current = true; // the brief page was the opener's last scene
      start();
      againing.current = false;
      return;
    }
    // The mini-lesson continues from its second step (the opener was its first screen), and still counts as heard.
    if (replaced && l.steps.length > 1 && !loadSlot(`mini:${l.id}`)) saveSlot(`mini:${l.id}`, { title: l.title[s.uiLang], route: 'home', done: 1, total: l.steps.length, data: { i: 1, heard: [0] } });
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
  /** Owner 2026-11-13: "Again" on a recap starts the exercise at once — the brief page was already read. */
  const againing = useRef(false);
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
    setSlot({ key, title: extra.title ?? saved?.title ?? '', seed: extra.seed, resume: saved ?? undefined, brief: saved ? undefined : extra.brief, briefSeen: againing.current });
    againing.current = false;
    setLessonId(def.id);
    setLessonKey((k) => k + 1);
    setAutoStart(true);
    enterPlay();
    setRoute('lesson');
  };
  /** Find my level: every skill, or one domain (the voice domain always sings). */
  /** Placement 3.0: skills already measured start the search from their rating (fewer questions on a retake). */
  const ratedPriors = (): Partial<Record<SkillId, number>> => Object.fromEntries(Object.entries(ratingsOf(progress)).filter(([k, r]) => !k.includes('/') && r && evidence(r) === 'measured').map(([k, r]) => [k, Math.round(r!.r)]));
  // GAMES_TIERS_PLAN §5.2 (0.76): a game tier cleared at mf or above starts that skill's search higher; at f or above,
  // with the skill's rating already established, its section is skipped.
  const gameTierPlacement = () => tierPlacement(progress.gameTiers, s.activeCourse ?? 'ear', ratingsOf(progress));
  const measuredPriors = (): Partial<Record<SkillId, number>> => mergePriors(gameTierPlacement().priors, ratedPriors());
  // A placement left half-way (back button, swipe back, reload) continues where it stopped (playtesting, 0.35.2).
  const resumePlacement = (v: SavedSession) => openGenerated(v.lesson, (st) => adaptPlacement(st, v.seed!), false, { key: PLACEMENT_KEY, title: t.findLevel, seed: v.seed, resume: v });
  const startPlacement = (seed: number, def: LessonDef) => openGenerated(def, (st) => adaptPlacement(st, seed), false, { key: PLACEMENT_KEY, title: t.findLevel, seed });
  const openPlacement = (domain?: DomainId | null, fresh = false) => {
    const d = typeof domain === 'string' ? domain : null;
    // Owner 2026-11-13: "Find my level" belongs to the course — the ear course measures its own areas, not voice or
    // instrument (the voice and instrument courses have their own tests).
    const areas = d ? null : COURSE_AREAS[(s.activeCourse ?? 'ear') as CourseId] ?? null;
    // Owner 2026-11-19: everything the course covers (the ear test asked no harmony; the jazz test only improvising).
    // SPEC-JAZZ-FOLD: with the jazz pack closed (a beginner), no jazz sections or rungs.
    const jazzOn = jazzOpenIn(s, (s.activeCourse ?? 'ear') as CourseId);
    const skills = coursePlacementSkills((s.activeCourse ?? 'ear') as CourseId, jazzOn);
    const saved = fresh ? null : loadPlacement();
    const savedFits = !areas || (saved?.lesson.placementSkills ?? []).every((k) => placementSkills({ singing: true, ...(skills ? { skills } : { areas }) }).includes(k));
    if (saved && (saved.lesson.placementDomain ?? null) === d && savedFits) return resumePlacement(saved);
    if (saved) clearPlacement(); // an old all-areas test never comes back in another course
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const skip = gameTierPlacement().skip;
    const scope = skills && !d ? { skills } : { areas, ...(skills ? { skills } : {}) };
    const only = skip.length ? placementSkills({ singing: s.mode === 'voice' || d === 'voice', domain: d, ...scope }).filter((k) => !skip.includes(k)) : undefined;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice' || d === 'voice', domain: d, ...scope, priorities: (s.intake as Intake | null | undefined)?.priorities, priors: measuredPriors(), ...(only?.length ? { only } : {}), ...(jazzOn ? {} : { noJazz: true }) }));
  };
  /** Catching up: only the sections this player has not been measured on yet. */
  const openCatchUpPlacement = (only: SkillId[]) => {
    const saved = loadPlacement();
    if (saved && !saved.lesson.placementDomain) return resumePlacement(saved);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    startPlacement(seed, placementLesson(seed, { singing: s.mode === 'voice', priorities: (s.intake as Intake | null | undefined)?.priorities, only, priors: measuredPriors(), ...(jazzOpenIn(s, (s.activeCourse ?? 'ear') as CourseId) ? {} : { noJazz: true }) }));
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
  const [vocalTest, setVocalTest] = useState(false);
  useEffect(() => {
    if (route !== 'vocal') setVocalTest(false);
  }, [route]);
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
    // Encore v2 (SPEC-PHRASE-STUDIO §11.2): a phrase goes into the lick book and opens its assignment page; each key
    // passed later is submitted by useTeacherPhrases (not by submitAssign)
    if (a.kind === 'phrase') {
      const b = bookWithTeacherPhrases(s.lickBook, phraseAssignsOf([a]));
      if (b && b !== s.lickBook) updateSettings({ lickBook: b });
      location.hash = `/teach/a/${encodeURIComponent(a.id)}`;
      return;
    }
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
  // Practice a skill at the player's level: the lesson on that skill's ladder that fits their rating.
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
      // AUDIT-GAMES §6: the shown language (a forced ?lang too), and "1 award", not "1 awards".
      if (count > 0 && !settings.cleanView) setAwardToast(firstAwardsLine(count, s.uiLang));
      return;
    }
    const { awards, newly } = earnAwards(progress.awards, achievements(progress, extra), at);
    if (!newly.length) return;
    const next = { ...progress, awards };
    void store.saveProgress(next).then(() => setProgress(next));
    if (!settings.cleanView) {
      const best = newly.sort((a, b) => b.tier - a.tier)[0];
      setAwardToast(`${awardName(best.id, s.uiLang)}${newly.length > 1 ? ` +${newly.length - 1}` : ''}`);
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

  // ---- the social round (SPEC-SOCIAL §8): automatic milestone posts, challenge links ----
  /** Post measured milestones (levels, standards, streaks; badges and ranks from the unlock effect) to friends. */
  const feedPost = (ev: MilestoneEvents) => {
    if (!user || !settings || !effectivePrivacy(settings.privacy, settings.birthYear).feed) return;
    const levels = courseLevelsJson ? (JSON.parse(courseLevelsJson) as Record<string, string>) : {};
    void postMilestones({ levels, standards: learnedStandards(progress.lessons), streak: gems.streak.count }, ev);
  };
  useEffect(() => {
    if (progressReady && user) feedPost({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressReady, user, courseLevelsJson, progress.history.length, gems.streak.count]);
  /** A "beat my score" link being played: the game key, its tier, the score to beat and who sent it. */
  const challengeRun = useRef<{ game: string; tier: DynName; score: number; from: string } | null>(null);
  const [challenge, setChallenge] = useState<OpenedChallenge | 'missing' | 'signin' | null | undefined>(undefined);
  useEffect(() => {
    // "#/c/CODE": remember it (sign-in drops the hash), then clean the address bar.
    const code = challengeFromHash(location.hash);
    if (!code) return;
    savePendingChallenge(code);
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }, []);
  useEffect(() => {
    const code = pendingChallenge();
    if (!code || !cloudConfigured) return;
    if (!user) {
      // Give the saved session a moment to come back before asking to sign in.
      const id = window.setTimeout(() => setChallenge('signin'), 2500);
      return () => window.clearTimeout(id);
    }
    void openChallenge(code).then((r) => {
      if (r !== 'missing') clearPendingChallenge();
      setChallenge(r);
    });
  }, [user]);
  // "#/f/CODE" (a friend's invite link): remember it (sign-in and onboarding drop the hash), then send the request once signed in.
  useEffect(() => {
    const code = friendFromHash(location.hash);
    if (!code) return;
    savePendingFriend(code);
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }, []);
  useEffect(() => {
    const code = pendingFriend();
    if (!code || !user || !cloudConfigured) return;
    void addFriend(code)
      .then((r) => {
        clearPendingFriend();
        setFriendFlash(r);
        try {
          sessionStorage.setItem('toneturn.friendsTab', 'friends');
        } catch {
          /* fine */
        }
        go('friends');
      })
      .catch(() => {
        /* offline: the link waits for the next sign-in */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const challengeGame = (key: string | null | undefined) => (key ? Object.values(COURSE_GAMES).flat().find((g) => tierKey(g) === key) : undefined);
  const playChallenge = () => {
    const ch = challenge;
    setChallenge(undefined);
    if (!ch || typeof ch !== 'object') return;
    if (ch.kind === 'duel') {
      try {
        sessionStorage.setItem('toneturn.friendsTab', 'duels');
      } catch {
        /* fine */
      }
      return go('friends');
    }
    const route = challengeGame(ch.game);
    if (!route || ch.game == null) return go('arcade');
    challengeRun.current = { game: ch.game, tier: TIERS[Math.max(0, Math.min(TIERS.length - 1, ch.tier ?? 0))], score: ch.score ?? 0, from: ch.from };
    go(route as Route);
  };

  // ---- area ranks + badges (spec AG §9): refreshed after each save, the unlock overlay after the session ----
  const [unlock, setUnlock] = useState<{ badges: Badge[]; rank?: RankChange } | null>(null);
  useEffect(() => {
    if (!settings || route === 'lesson') return;
    // SPEC-PATH-ROLE §6 Q2: an area with an open checkpoint on the path waits for it before it moves up.
    const r = refreshRanksBadges(progress, new Date(), settings.uiLang === 'he' ? [5, 6] : undefined, { firstWins: firstWinCourses(settings.courseStart) }, rankHold(pathView));
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
    if (up || r.newly.length) feedPost({ badges: r.newly, rank: up ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.applied.length, progress.ratingEvents?.length, progress.drillItems, route, firstWinCourses(settings?.courseStart).join()]);
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
  // SPEC-PATH-ROLE §8: opened vs mastered — the live keys and the silver refresh on every step.
  const { view: mview, ctx: mctx } = useMasteryView(pathView, s, progress);
  const unitName = (u: PathUnit) => String(u.no ?? u.n);
  const leadsLine = leadsTo(mview, mctx.facts, unitName)?.[s.uiLang] ?? null;
  // A unit sealed for the first time (every step at 5★, the checkpoint passed): bonus XP (it counts in the league),
  // the badge counter, a short note. Once per unit (facts.sealed).
  useEffect(() => {
    if (!settings || !progressReady) return;
    const facts = settings.pathFacts ?? {};
    const newly = mview.units.filter((u) => u.status !== 'projected' && !facts.sealed?.[u.id] && unitMastery(u, mctx.facts).sealed);
    if (!newly.length) return;
    const at = new Date().toISOString();
    updateSettings({ pathFacts: { ...facts, sealed: { ...(facts.sealed ?? {}), ...Object.fromEntries(newly.map((u) => [u.id, at])) } } });
    void store
      .recordCompletion({ lessonId: 'unit-mastered', lessonVersion: 1, sessionId: `unit-mastered-${newly.map((u) => u.id).join('-')}-${Date.now()}`, completedAt: at, firstTry: newly.length, total: newly.length, xp: UNIT_MASTERY_XP * newly.length, missed: [], items: [], ...(settings.activeCourse ? { course: settings.activeCourse } : {}) })
      .then((p) => {
        const np = { ...p, counts: bumpCount(p.counts, 'unitsMastered', newly.length) };
        return store.saveProgress(np).then(() => setProgress(np));
      });
    setAwardToast(settings.uiLang === 'en' ? `Unit ${unitName(newly[0])} mastered · +${UNIT_MASTERY_XP * newly.length} XP` : `יחידה ${unitName(newly[0])} נשלטת · ‎+${UNIT_MASTERY_XP * newly.length} XP`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mview, progressReady]);
  /** SPEC-PATH-ROLE §4: a checkpoint's technique part (after its questions, or alone in a technique-only unit). */
  const checkTech = useRef<{ id: string; drills: Drill[]; steps: string[]; t0: string; qStars: number | null; clean: Set<string> } | null>(null);
  const [checkTechWaiting, setCheckTechWaiting] = useState(false);
  const startCheckTech = () => {
    const ct = checkTech.current;
    if (!ct) return go('path');
    setCheckTechWaiting(false);
    chartQueue.current = ct.drills;
    drillFrom.current = 'check';
    drillSessionXp.current = 0;
    drillSession.current = { takes: 0, clean: 0 };
    go('drills');
  };
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
    // The unit opener (owner 2026-11-18): the first entry into a unit plays it in place of the first screen.
    const c: CourseId = s.activeCourse ?? 'ear';
    if (mode === 'step' && openersOn && unitOpenerDue(s.openers, c, unit)) {
      updateSettings({ openers: markUnitOpener(s.openers, c, unit.id, new Date().toISOString()) });
      setOpener({
        spec: unitOpenerSpec(unit, false),
        then: () => {
          openerReplaces.current = true;
          openFrom.current.path = true;
          workoutPending.current = null;
          openPathStep(x, unit, mode);
          openerReplaces.current = false;
        },
      });
      return;
    }
    openFrom.current.path = true;
    workoutPending.current = null;
    openPathStep(x, unit, mode);
  };
  /** The unit opener's facts: the unit's number and theme, its real steps (road names and symbols), its families. */
  const unitOpenerSpec = (unit: PathUnit, replay: boolean): OpenerSpec => {
    const steps = unit.steps.filter((y) => !y.step.bonus);
    const fams = new Map<string, { title: string; glyph: ReturnType<typeof stepGlyphOf> }>();
    for (const y of steps) if (y.step.ladder && !fams.has(y.step.ladder.family)) fams.set(y.step.ladder.family, { title: y.step.title[s.uiLang].split(' · ')[0], glyph: stepGlyphOf(y.step) });
    return {
      kind: 'unit',
      course: s.activeCourse ?? 'ear',
      unitId: unit.id,
      no: unit.no ?? unit.n,
      theme: unitThemeOf(s.activeCourse ?? 'ear', unit.theme, steps.map((y) => y.step), THEMES),
      section: unit.section,
      steps: steps.map((y) => ({ title: nodeTitle(y.step, s, s.uiLang), step: y.step, glyph: stepGlyphOf(y.step) })),
      families: [...fams.values()],
      replay,
    };
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
    if (step.kind === 'check') {
      // SPEC-PATH-ROLE §4: the questions (when the unit has ≥ 2 question steps), then the technique part — the unit's
      // technique levels in 4 random keys (2 in a short unit) at the target tempo.
      const parts = checkpointParts(unit);
      const tech = parts.tech.length && settings ? checkpointTech(unit, drillSettingsOf(settings).keyOrder, seed) : null;
      checkTech.current = tech && tech.drills.length ? { id: step.id, drills: tech.drills, steps: Object.keys(tech.keys), t0: new Date().toISOString(), qStars: parts.questions.length ? null : 3, clean: new Set() } : null;
      setCheckTechWaiting(false);
      if (parts.questions.length) return openGenerated(checkpointSession(unit, seed), undefined, false, { key: `pathstep:${step.id}`, title });
      pendingStep.current = null;
      if (checkTech.current) return startCheckTech();
      return go('path');
    }
    // 0.61 (owner): a technique level runs its items not yet clean as a drill queue; a vocal level opens the Vocal screen on it.
    if (step.kind === 'tech' && step.ladder && settings && progress) {
      chartQueue.current = techQueue(step.ladder.ref, progress.drillItems ?? {}, drillSettingsOf(settings).keyOrder);
      drillFrom.current = 'path';
      drillSessionXp.current = 0;
      drillSession.current = { takes: 0, clean: 0 };
      // A family with its own quick lesson ("tech:<family>": bass and drums niche families) opens with it the first time.
      // DRUMS P2: a level with its own quick lesson ("tech:<level id>", e.g. the pocket) opens with that one instead.
      // Curriculum audit R7: else the family's existing lesson (guitar families, voice leading, 7th chords, numerals …).
      return gate(ladderLessonKey('tech', step.ladder), () => go('drills'));
    }
    if (step.kind === 'vocal' && step.ladder) {
      toolFrom.current = 'path';
      setVocalWarmup(false);
      setVocalLevel(Number(step.ladder.ref));
      // A vocal level with its own quick lesson ("vocal:<level>", the first steps) opens with it the first time.
      // Curriculum audit R2: else the family's track lesson (breath, pitch, scales, sight, scat …), as the Vocal screen does.
      return gate(ladderLessonKey('vocal', step.ladder), () => go('vocal'));
    }
    // A game inside the unit (0.38): its result is recorded as the step's stars when the game ends.
    if (step.kind === 'game' && step.game) {
      // PIANO_JAZZ P2: a repertoire step opens the item's page; its stars come from the item's measured result.
      if (step.game === 'repertoire' && step.rep) {
        pendingStep.current = null;
        // Phase 3 (SPEC-PATH-TODAY-PRACTICE §2): the piece's one page, reached from the path — "Continue the step" and
        // "The full practice of the step". A jazz standard (rep:jazz:…) keeps its own collection in the key.
        return openRep({ piece: pieceKey({ kind: 'rep', course: step.rep.course, id: step.rep.id }), from: 'path' });
      }
      if (step.game === 'drills') drillFrom.current = 'path';
      // Licks / transcription steps open on their level; the screen reports the step's stars when the player leaves.
      // (A bonus step with game 'transcribe' is the Transcription Race, not the coach.)
      if ((step.game === 'licks' || step.game === 'transcribe') && !step.bonus) {
        measuredStep.current = { id: step.id, level: step.level ?? 1 };
        drillSessionXp.current = 0;
        drillSession.current = { takes: 0, clean: 0 };
      }
      return go((step.game === 'transcribe' && !step.bonus ? 'transcribe-coach' : step.game) as Route);
    }
    const how = mode === 'practice' ? 'step' : x.probe ? 'probe' : x.state === 'quick' ? 'quick' : 'step';
    const def = stepSession(step, seed, how);
    if (def) return gate(`topic:${step.topic}`, () => openGenerated(def, undefined, false, { key: `pathstep:${step.id}`, title, brief: step.topic ? briefFor(step.topic, step.level ?? 1, { ...(x.state === 'tested' ? { keepStep: step.id } : {}), level: step.level ?? 1, pathStep: step.id }) : undefined }));
    // A step that can't build a session (0.68.1): never a dead tap — practice its skill instead.
    pendingStep.current = null;
    practiceSkill(step.skill);
  };
  /** SPEC-PATH-ROLE §8: the what's-missing sheet's Practice on a technique step — exactly its missing keys (all keys
   *  for a refresh), weak keys first; the takes raise the step's stars like any take of the level. */
  const practiceMissing = (x: UnitStep, unit: PathUnit, keys: number[]) => {
    const lv = x.step.ladder ? techLevel(x.step.ladder.ref) : undefined;
    if (!lv || !settings || !progress) return openFromPath(x, unit, 'practice');
    const order = drillSettingsOf(settings).keyOrder;
    const rank = (k: number) => keys.indexOf(((k % 12) + 12) % 12);
    const q = levelDrills(lv, order)
      .filter((d) => rank(d.spec.key) >= 0)
      .sort((a, b) => rank(a.spec.key) - rank(b.spec.key));
    if (!q.length) return openFromPath(x, unit, 'practice');
    openFrom.current.path = true;
    workoutPending.current = null;
    pendingStep.current = { id: x.step.id, kind: 'tech', after: lastSession() };
    lastStepId.current = x.step.id;
    chartQueue.current = q.slice(0, 8);
    drillFrom.current = 'path';
    drillSessionXp.current = 0;
    drillSession.current = { takes: 0, clean: 0 };
    go('drills');
  };
  const openTestOut = (unit: PathUnit) => {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const { def, steps } = testOutSession(unit, seed);
    pendingStep.current = { id: `testout:${unit.id}`, kind: 'check', after: lastSession(), testOut: steps };
    openGenerated(def, undefined, false, { key: `testout:${unit.id}`, title: s.uiLang === 'en' ? 'Test out' : 'מבחן מעבר' });
  };
  /** Technique drills opened from a path step or a workout block run today's items as a queue (spec AI §9). */
  const drillFrom = useRef<'path' | 'workout' | 'test' | 'chart' | 'assign' | 'taste' | 'repertoire' | 'keys' | 'check' | 'depth' | 'diary' | 'improv' | null>(null);
  /** BUILD-PLAN phase 2: the workout's technique block opens today's matrix cells (the same plan as the technique screen). */
  const drillToday = useRef(false);
  /** Drill item writes in order (a take, then the coach's ceiling on it — never one overwriting the other). */
  const drillWrites = useRef<Promise<unknown>>(Promise.resolve());
  /** A licks / transcription path step being played (SPEC-LICKS-TRANSCRIPTION), and the workout's lick-review block. */
  const measuredStep = useRef<{ id: string; level: number } | null>(null);
  const lickReview = useRef(false);
  /** Leaving the licks / transcription screens: one result for the session (streak, XP per course), the path step's stars. */
  const leaveMeasured = (kind: 'licks' | 'transcribe', stars: number | null) => {
    const ms = measuredStep.current;
    measuredStep.current = null;
    lickReview.current = false;
    void techResult(kind)?.then(setProgress);
    if (ms && stars !== null && settings && stars > 0) {
      pendingStep.current = null;
      updateSettings({ pathFacts: recordStep(settings.pathFacts ?? {}, ms.id, stars, new Date().toISOString()) });
      return go('path');
    }
    if (ms) return go('path');
    go(workoutPending.current ? 'workoutrun' : 'arcade');
  };
  /** Technique takes since the session opened (0.61): their XP, count and clean count go to the server as one result. */
  const drillSessionXp = useRef(0);
  const drillSession = useRef({ takes: 0, clean: 0 });
  /** SPEC-LICKS-IN-IMPROV (phase 4): the lick pool, today's lick and the usage log for Improvise; a take's uses are booked
   *  (the log; a passed review for a lick closed in a key) and their XP is one result (XP, league, course share). */
  const vocabCtx = (): VocabCtx => {
    const items = progress.drillItems ?? {};
    const pool = lickPool(items, s.lickBook);
    return {
      pool,
      today: todaysLick(pool, s.lickBook, items),
      log: s.lickBook?.uses,
      onUses: (uses, xp) => {
        updateSettings({ lickBook: bookUses(s.lickBook, uses, items, (b, id) => ({ ...b, review: { ...(b.review ?? {}), [id]: reviewAfter(b.review?.[id], true) } })) });
        if (xp > 0) void store.recordCompletion({ lessonId: 'improv-vocab', lessonVersion: 1, sessionId: uses[0]?.session ?? `vocab-${Date.now()}`, completedAt: new Date().toISOString(), firstTry: uses.length, total: uses.length, xp, missed: [], items: [], course: (s.activeCourse ?? 'keys') as CourseId }).then(setProgress);
      },
    };
  };
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
  /** A progression from Charts practiced as a drill (voicings / comping / stride). */
  const chartQueue = useRef<Drill[] | null>(null);
  /** Repertoire (SPEC-REPERTOIRE): the item being practiced (its result is recorded when the practice ends) and the
   *  item page to come back to. */
  const repOpen = useRef<{ course: RepCourse; id: string; after: string | null; kind: 'drill' | 'session' | 'chart' } | null>(null);
  const openRepWay = (item: RepItem, way: RepWay, inCourse?: RepCourse) => {
    if (!settings || !progress) return;
    const course: RepCourse = inCourse ?? ((settings.activeCourse ?? 'ear') as CourseId);
    const after = lastSession();
    repReturn.current = location.hash;
    if (isDrillWay(way)) {
      const q = repDrills(way, course, progress.drillItems ?? {}, drillSettingsOf(settings).keyOrder);
      if (!q.length) return;
      chartQueue.current = q;
      drillFrom.current = 'repertoire';
      drillSessionXp.current = 0;
      drillSession.current = { takes: 0, clean: 0 };
      repOpen.current = { course, id: item.id, after, kind: 'drill' };
      return go('drills');
    }
    if (way.k === 'chart') {
      const st = STANDARD_CHANGES.find((x) => x.id === way.std);
      if (!st) return;
      repOpen.current = { course, id: item.id, after, kind: 'chart' };
      chartInit.current = { id: `rep-${st.id}`, title: `${item.title[settings.uiLang]} — ${st.part[settings.uiLang]}`, text: st.text, style: st.style, bpm: st.bpm, std: st.id };
      toolFrom.current = 'repertoire';
      engineArgNext.current = pieceKey({ kind: 'rep', course, id: item.id });
      return go('charts');
    }
    if (way.k === 'topic') {
      repOpen.current = { course, id: item.id, after, kind: 'session' };
      return openTopic(way.topic, way.level);
    }
    if (way.k === 'vocal') {
      repOpen.current = { course, id: item.id, after, kind: 'session' };
      toolFrom.current = 'repertoire';
      setVocalWarmup(false);
      setVocalLevel(way.level);
      return go('vocal');
    }
  };
  /** A lesson / vocal session opened from the repertoire finished: its first-try share is the item's score. */
  const noteRepSession = (p: Progress) => {
    const rp = repOpen.current;
    const r = p.history[p.history.length - 1];
    if (!rp || rp.kind !== 'session' || !r || r.sessionId === rp.after || isRepLesson(r.lessonId) || r.total <= 0) return;
    repOpen.current = null;
    void store.recordCompletion(repResult(rp.course, rp.id, r.firstTry / r.total, 0, new Date(), true)).then(setProgress);
  };
  /** Phase 3: a piece page's action (SPEC-PRACTICE-IA-3 §3): its own measured way, the band, Improvise with this chart,
   *  the piece coach, My song, or the technique hub at the chart's key. Each comes back to the page it left. */
  const repAction = (e: LibEntry, a: PieceAction) => {
    if (!settings) return;
    const lang = settings.uiLang;
    if (a.k === 'way' && e.item) return openRepWay(e.item, a.way, e.ref.course);
    repReturn.current = location.hash;
    const chart = chartOfPiece(e.ref, lang, settings.myCharts) as MyChart | null;
    if (a.k === 'band' && chart) {
      if (e.ref.kind === 'rep' && e.ref.course) repOpen.current = { course: e.ref.course, id: e.ref.id, after: lastSession(), kind: 'chart' };
      chartInit.current = chart;
      engineArgNext.current = e.key;
      return go('charts');
    }
    if (a.k === 'improvise' && chart) {
      improvInit.current = chart;
      return go('improv');
    }
    if (a.k === 'score') {
      engineArgNext.current = e.ref.id;
      return go('pieces');
    }
    if (a.k === 'recording') return openRecording(e.ref.id);
    if (a.k === 'technique') {
      setDrillsKey(chart ? firstRootPc(chart.text) ?? 0 : 0);
      return go('drills');
    }
  };
  /** My song on a recording (or its library, to add one): the singer's is voice level 1308; the others open the
   *  play-along / transcription screen, with its quick lesson the first time (game:mysong, game:mysong-ear). */
  const openRecording = (id: string | null) => {
    if (!settings) return;
    if (settings.activeCourse === 'voice') {
      setVocalWarmup(false);
      setVocalLevel(1308);
      return go('vocal');
    }
    gate(settings.activeCourse === 'ear' ? 'game:mysong-ear' : 'game:mysong', () => {
      engineArgNext.current = id;
      go('mysong');
    });
  };
  const newChartId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  /** Lead sheets added in Repertoire become my charts (as Charts did); one sheet opens as its piece. */
  const addLeadSheets = (sheets: LeadSheet[]): string | null => {
    if (!settings) return null;
    const made: MyChart[] = sheets.map((l) => ({ id: newChartId(), title: l.title === 'Untitled' ? (settings.uiLang === 'he' ? 'המהלך שלי' : 'My chart') : l.title, text: l.text, style: (l.meter === 3 ? 'waltz' : l.style ? irealStyle(l.style) : 'swing') as ChartStyle, bpm: l.bpm && l.bpm > 30 ? l.bpm : 120, ...(l.melody ? { melody: l.melody.map((n) => ({ b: n.beat, d: n.dur, m: n.midi })) } : {}) }));
    updateSettings({ myCharts: [...made, ...(settings.myCharts ?? [])].slice(0, 120) });
    return made.length === 1 ? pieceKey({ kind: 'chart', id: made[0].id }) : null;
  };
  /** SPEC-PATH-TODAY-PRACTICE §3.1: a path step's home in Practice ("keep practising now"): a piece's page, a technique
   *  level's family, Licks, Licks › Transcribe, a topic's practice. Null when the step has no home there. */
  const [drillsFamily, setDrillsFamily] = useState<FamilyDef | null>(null);
  const stepHome = (x: UnitStep): (() => void) | null => {
    const st = x.step;
    if (st.rep) return () => openRep({ piece: pieceKey({ kind: 'rep', course: st.rep!.course, id: st.rep!.id }) });
    if (st.kind === 'tech' && st.ladder) {
      const ref = st.ladder.ref;
      const fam = [...catalog(), ...guitarCatalog()].find((f) => f.levels.some((l) => l.id === ref));
      return fam ? () => (setDrillsFamily(fam), go('drills')) : null;
    }
    if (st.game === 'licks') return () => go('licks');
    if (st.game === 'transcribe' && !st.bonus) return () => go('transcribe-coach');
    if (st.topic) return () => openTopic(st.topic!, st.level ?? 1);
    return null;
  };
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
  // 0.84: the voice course's Find my level is its own sectioned test (VoiceLevelTest), like the playing tests.
  const openVoiceTest = () => {
    toolFrom.current = route;
    setVocalWarmup(false);
    setVocalLevel(null);
    setVocalTest(true);
    go('vocal');
  };
  /** The depth page (src/partner): a family opens its first level's drills; a topic opens its lesson. Back returns there. */
  const openDepthLink = (l: DepthLink) => {
    if (l.kind === 'topic') return openTopic(l.id, l.level ?? 1);
    // by level number (levels hidden until verified leave gaps), else the family's first shown level
    const fam = familyById(l.id as FamilyId);
    const lv = fam?.levels.find((x) => x.level === (l.level ?? 1)) ?? fam?.levels[0];
    if (!lv || !settings) return;
    chartQueue.current = levelDrills(lv, drillSettingsOf(settings).keyOrder);
    drillFrom.current = 'depth';
    go('drills');
  };
  const drillQueue = useMemo(
    () => (route === 'drills' && (drillFrom.current === 'chart' || drillFrom.current === 'keys' || drillFrom.current === 'diary' || drillFrom.current === 'depth' || drillFrom.current === 'assign' || drillFrom.current === 'taste' || drillFrom.current === 'repertoire' || drillFrom.current === 'improv' || (drillFrom.current === 'path' && chartQueue.current) || drillFrom.current === 'check' || (drillFrom.current === 'workout' && chartQueue.current)) ? chartQueue.current ?? undefined : route === 'drills' && (drillFrom.current === 'path' || drillFrom.current === 'workout') && settings && progress ? todayDrills({ ...drillSettingsOf(settings), bassTuning: bassTuningOf(settings), drumMic: drumMicOf(settings.drumKit) }, progress.drillItems ?? {}, settings.drillStart ?? {}, settings.customDrills ?? []).map((x) => x.drill) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route],
  );
  const drillQueueDone = (takes: number, clean: number) => {
    const from = drillFrom.current;
    drillFrom.current = null;
    if (from === 'taste') return tasteDrillsDone(takes, clean);
    if (from === 'check') {
      // SPEC-PATH-ROLE §4: the checkpoint's technique part — a drill counts when it had a clean take at the target
      // tempo during the part. The checkpoint's stars = the lower of its two parts; the technique part marks the unit's
      // levels "checked in keys". The takes themselves feed keyMastery and the technique rank like any take.
      chartQueue.current = null;
      const ct = checkTech.current;
      checkTech.current = null;
      setCheckTechWaiting(false);
      let stars = 0;
      if (ct && settings) {
        const at = new Date().toISOString();
        const tStars = checkTechStars(ct.drills.filter((d) => ct.clean.has(d.itemId)).length, ct.drills.length);
        stars = Math.min(ct.qStars ?? 3, tStars);
        let facts = recordStep(settings.pathFacts ?? {}, ct.id, stars, at);
        if (tStars > 0) facts = { ...facts, keysChecked: { ...(facts.keysChecked ?? {}), ...Object.fromEntries(ct.steps.map((id) => [id, at])) } };
        updateSettings({ pathFacts: facts });
      }
      // Path awards (spec AG §5): units finished, checkpoints at 3 stars — after the part's result is saved.
      const award = (p: Progress): Progress => (stars > 0 ? { ...p, counts: stars === 3 ? bumpCount(bumpCount(p.counts, 'units', 1), 'checkpoints3', 1) : bumpCount(p.counts, 'units', 1) } : p);
      const done = techResult('checkpoint-tech', takes, clean);
      if (done) void done.then((p) => (stars > 0 ? store.saveProgress(award(p)).then(() => setProgress(award(p))) : setProgress(p)));
      else if (stars > 0) void store.saveProgress(award(progress)).then(() => setProgress(award(progress)));
      return go('path');
    }
    if (from === 'workout') {
      chartQueue.current = null;
      drillToday.current = false;
    }    if (from === 'repertoire') {
      // A repertoire item practiced as drills: one result for the item (score = clean takes / takes), with the course.
      chartQueue.current = null;
      const rp = repOpen.current;
      repOpen.current = null;
      const t0 = Math.max(takes, drillSession.current.takes);
      const c0 = Math.max(clean, drillSession.current.clean);
      const xp = drillSessionXp.current;
      drillSessionXp.current = 0;
      drillSession.current = { takes: 0, clean: 0 };
      if (rp && t0 > 0) void store.recordCompletion(repResult(rp.course, rp.id, c0 / t0, xp, new Date(), true)).then(setProgress);
      // back to the piece's page it was opened from
      return backToRep(() => openRep({}));
    }
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
    if (from === 'depth') {
      chartQueue.current = null;
      return go('depth');
    }
    if (from === 'improv') {
      // Improvise on the kit (drums): back to its list of fills, solos and trading levels.
      chartQueue.current = null;
      return go('improv');
    }
    if (from === 'keys') {
      // Key mastery: a skill in one key, started from Insights — the technique result is recorded above; back to Insights.
      chartQueue.current = null;
      return go('insights');
    }
    if (from === 'diary') {
      // AUDIT-5 #5: a plateau suggestion opened from the practice diary — back to it.
      chartQueue.current = null;
      return go('diary');
    }
    if (from === 'chart') {
      chartQueue.current = null;
      // back to the chart player it came from (its address names the piece), and Charts' own back still goes where it
      // came from (not to the drill)
      const keep = toolFrom.current;
      if (/^#\/?drills/.test(location.hash) && chartReturn.current) {
        chartReturn.current = false;
        history.back();
        return;
      }
      go('charts');
      toolFrom.current = keep;
      return;
    }
    go(from === 'workout' ? 'workoutrun' : 'arcade');
  };

  // ---- How a course starts (docs/SPEC-COURSE-START.md): welcome → setup → taste → first win → what next ----
  const activeC: CourseId = settings?.activeCourse ?? 'ear';
  const cStart = settings?.courseStart?.[activeC];
  const cStage = settings ? stageOf(cStart, setupNeeded(activeC, settings)) : 'done';
  const [csWelcomeAgain, setCsWelcomeAgain] = useState(false);
  /** The taste's takes (playing tastes): best note accuracy and bars played, for the measured first win. */
  const tasteTake = useRef({ acc: 0, bars: 0 });
  /** Find my level, per course: the playing test (instruments), the voice placement, the ear placement (ear / jazz). */
  const findLevel = () => (instrumentCourse ? openTechTest() : s.activeCourse === 'voice' ? openVoiceTest() : openPlacement());
  /** The jazz "I play well" taste: sung by a singer, played by a pianist or bassist (owner 2026-11-11). */
  // SPEC-JAZZ-FOLD: a course in jazz focus opens with its jazz taste.
  const tasteJazz = (c: CourseId) => jazzFocusOn(s, c);
  /** A sung taste in progress (the vocal level's result is its first win). */
  const tasteVocal = useRef<{ course: CourseId; level: number; since: string } | null>(null);
  const startTaste = (report?: SelfReport) => {
    if (!settings) return;
    const c = activeC;
    const def = tasteFor(c, report ?? cStart?.report, tasteJazz(c));
    updateCourseStart((m) => markTasteOpened(m, c, new Date().toISOString()));
    setCsWelcomeAgain(false);
    if (def.run.kind === 'vocal') {
      tasteVocal.current = { course: c, level: def.run.level, since: new Date().toISOString() };
      toolFrom.current = 'home';
      setVocalWarmup(false);
      setVocalLevel(def.run.level);
      go('vocal');
      return;
    }
    if (def.run.kind === 'lesson') {
      // Saved after every answer under taste:<course>: an abandoned taste continues where it stopped.
      openGenerated(tasteLesson(def, (Date.now() ^ (Math.random() * 1e9)) >>> 0), undefined, false, { key: `taste:${c}`, title: def.title[s.uiLang] });
      return;
    }
    chartQueue.current = tasteDrills(def, { drumPad: drumMicOf(settings.drumKit) === 'pad' });
    tasteTake.current = { acc: 0, bars: 0 };
    drillSessionXp.current = 0;
    drillSession.current = { takes: 0, clean: 0 };
    drillFrom.current = 'taste';
    go('drills');
  };
  /** Day 3 (SPEC-COURSE-START): the first "real music" moment — a full chorus with the band, measured; Toni on its card. */
  const realRun = useRef<CourseId | null>(null);
  const realVocal = useRef<{ course: CourseId; level: number; since: string } | null>(null);
  const startReal = () => {
    if (!settings) return;
    const c = activeC;
    const def = realMusicFor(c, cStart?.report);
    updateCourseStart((m) => markRealOpened(m, c, new Date().toISOString()));
    if (def.run.kind === 'vocal') {
      realVocal.current = { course: c, level: def.run.level, since: new Date().toISOString() };
      toolFrom.current = 'home';
      setVocalWarmup(false);
      setVocalLevel(def.run.level);
      go('vocal');
      return;
    }
    if (def.run.kind === 'lesson') {
      // Saved after every answer under real:<course>: an abandoned one continues where it stopped.
      openGenerated(tasteLesson(def, (Date.now() ^ (Math.random() * 1e9)) >>> 0), undefined, false, { key: `real:${c}`, title: def.title[s.uiLang] });
      return;
    }
    realRun.current = c;
    chartQueue.current = realDrills(def, { drumPad: drumMicOf(settings.drumKit) === 'pad' });
    tasteTake.current = { acc: 0, bars: 0 };
    drillSessionXp.current = 0;
    drillSession.current = { takes: 0, clean: 0 };
    drillFrom.current = 'taste';
    go('drills');
  };
  const realDrillsDone = (c: CourseId, takes: number, clean: number) => {
    const t0 = Math.max(takes, drillSession.current.takes);
    const c0 = Math.max(clean, drillSession.current.clean);
    const xp = drillSessionXp.current;
    const x = tasteTake.current;
    chartQueue.current = null;
    const done = techResult('technique', t0, c0);
    if (done) void done.then(setProgress);
    // Only measured practice counts: left before its first take, the offer stays on Home ("Continue").
    if (t0 > 0) updateCourseStart((m) => markRealDone(m, c, { kind: 'drills', takes: t0, clean: c0, ...(x.acc > 0 ? { acc: x.acc } : {}), bars: x.bars, xp }, new Date().toISOString()));
    go('home');
  };
  const tasteDrillsDone = (takes: number, clean: number) => {
    const rc = realRun.current;
    if (rc) {
      realRun.current = null;
      return realDrillsDone(rc, takes, clean);
    }
    const c = activeC;
    const t0 = Math.max(takes, drillSession.current.takes);
    const c0 = Math.max(clean, drillSession.current.clean);
    const xp = drillSessionXp.current;
    const x = tasteTake.current;
    chartQueue.current = null;
    const done = techResult('technique', t0, c0);
    if (done) void done.then(setProgress);
    // Only measured practice counts: a taste left before its first take stays "continue" on Home and Path.
    if (t0 > 0) {
      updateCourseStart((m) => markTasteDone(m, c, { kind: 'drills', takes: t0, clean: c0, ...(x.acc > 0 ? { acc: x.acc } : {}), bars: x.bars, xp }, new Date().toISOString()));
      return go('coursestart');
    }
    go('home');
  };
  /** Home / Path first-run CTA: the welcome card and setup, or straight into the taste (an abandoned one resumes). */
  const continueCourseStart = () => (cStage === 'taste' ? startTaste() : go('coursestart'));
  const onCourseReport = (r: SelfReport) => {
    if (!settings) return;
    const c = activeC;
    updateCourseStart((m) => reportCourse(m, c, r, new Date().toISOString()));
    // Onboarding's first course: the self-report is the quick questionnaire's level (it was asked here, not there).
    if (cStart?.fromOnboarding && !cStart.report) {
      const ir = onboardingIntake(settings.courses?.length ? settings.courses : [c], levelOfReport(r));
      updateSettings({ ...ir.patch, pathFacts: unfreezeIfEarly(settings.pathFacts) });
    }
    setCsWelcomeAgain(false);
    const next = () => {
      if (!(setupNeeded(c, settings) && !cStart?.setupAt)) startTaste(r);
    };
    // The course opener (owner 2026-11-18): once per course, right after the self-report and before the taste.
    if (openersOn && !courseOpenerSeen(settings.openers, c)) {
      updateSettings({ openers: markCourseOpener(settings.openers, c, new Date().toISOString()) });
      setOpener({ spec: { kind: 'course', course: c, report: r, replay: false, taste: tasteFor(c, r, tasteJazz(c)).title, jazz: jazzOpenIn(s, c) }, then: next });
      return;
    }
    next();
  };
  const csNow = () => new Date().toISOString();
  const leaveWin = (then: () => void) => {
    updateCourseStart((m) => markWinSeen(m, activeC, csNow()));
    then();
  };
  // Existing players: a course with progress and no start state counts as started — never the welcome (once loaded).
  useEffect(() => {
    if (!settings || !progressReady) return;
    const m = migrateCourseStart(settings.courseStart, settings.courses?.length ? settings.courses : [settings.activeCourse ?? 'ear'], courseFactsOf(settings, progress));
    if (m !== settings.courseStart) updateCourseStart(() => m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressReady, settings?.courses, settings?.activeCourse, progress.history.length]);
  // The course-start screen shows only welcome / setup / the first win; anything else goes back to Today.
  useEffect(() => {
    if (route === 'coursestart' && settings && !opener && (cStage === 'done' || (cStage === 'taste' && !csWelcomeAgain))) go('home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, cStage, csWelcomeAgain, opener]);

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
    const chg = challengeRun.current;
    if (chg && chg.game === tierKey(g) && !(ps && ps.kind === 'game' && ps.id.endsWith(`:${g}`))) return { ...info, forced: chg.tier };
    return ps && ps.kind === 'game' && ps.tier && ps.id.endsWith(`:${g}`) ? { ...info, forced: ps.tier } : info;
  };
  /** A tiered run's score goes to the week's game board (friends, per tier) when signed in. */
  const noteGameBest = (g: string, score: number, detail: unknown) => {
    keepGameTake(g, detail);
    const tier = (detail as { tier?: unknown } | null)?.tier;
    if (user && isTier(tier)) void submitGameBest(g, tier, score);
    // A "beat my score" run: the result against the friend's score, once.
    const chg = challengeRun.current;
    if (chg && chg.game === tierKey(g)) {
      challengeRun.current = null;
      const he = s.uiLang === 'he';
      setAwardToast(score > chg.score ? (he ? `עברתם את ${chg.from}: ${score} מול ${chg.score}` : `You beat ${chg.from}: ${score} vs ${chg.score}`) : he ? `${chg.from}: ${chg.score} · אתם: ${score}` : `${chg.from}: ${chg.score} · you: ${score}`);
    }
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
    noteRepSession(p);
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
    // SPEC-PATH-ROLE §4: the questions passed and the checkpoint has a technique part — it is recorded after that part.
    if (ps.kind === 'check' && checkTech.current?.id === ps.id) {
      if (stars > 0) {
        checkTech.current.qStars = stars;
        setCheckTechWaiting(true);
        return;
      }
      checkTech.current = null;
    }
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
  // BUILD-PLAN phase 2: a window up to 180 minutes (SPEC-DAILY-WORKOUT §4).
  const baseMinutes = Math.max(5, Math.min(180, ((s.intake as Intake | null | undefined)?.minutes ?? 10) + nudge));
  // SPEC-PATH-TODAY-PRACTICE §5.1: the open class assignments, today's share (spread until the due date by default).
  const teacherTp = useMemo(() => teacherToday(assigned.map((a) => ({ id: a.lessonId, dueOn: a.dueOn, minutes: a.minutes, ifShort: a.ifShort })), localDay(now0), baseMinutes), [assigned, baseMinutes]); // eslint-disable-line react-hooks/exhaustive-deps
  const tmplRaw = s.workoutTemplates?.[String(now0.getDay())] ?? s.workoutTemplates?.all ?? null;
  // Learned pieces due for a review run (SPEC-PIECE §2.10): the pieces live in IndexedDB, so the count loads once a day
  // and again after the pieces screen closes.
  const [piecesDueN, setPiecesDueN] = useState(0);
  useEffect(() => {
    if (route === 'pieces') return;
    let live = true;
    void loadPieces().then((ps) => live && setPiecesDueN(piecesDue(ps, today).length)).catch(() => {});
    return () => {
      live = false;
    };
  }, [today, route === 'pieces']); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestedWorkout = useMemo(() => {
    const tmpl = tmplRaw ? validateTemplate(tmplRaw, { leaveOut: s.pathLeaveOut ?? [], topics: new Set(Object.keys(TOPIC_GEN)), hidden: s.pathHidden ?? [], games: new Set(GAMES2.map((g) => g.id)) }) : null;
    // 0.61 (SPEC-COURSES): the workout belongs to the active course — its own areas, its goal, its warm-ups only.
    const course = courseOf(s.activeCourse);
    const own = COURSE_AREAS[course.id];
    // D2: the technique tier sets the split (a beginner 85/15); a classical emphasis plays repertoire beside technique.
    const dsW = drillSettingsOf(s);
    const techTier = course.id === 'keys' || course.id === 'guitar' || course.id === 'bass' ? matrixTierOf(s, dsW, progress.drillItems ?? {}) : undefined;
    return suggestWorkout({ techTier, emphasis: dsW.emphasis, teacher: teacherTp, total: tmpl ? tmpl.reduce((a, b) => a + b.minutes, 0) : baseMinutes, goal: courseGoal(course.id, !!s.examPrep, jazzFocusOn(s, course.id)), priorities: (s.intake as Intake | null | undefined)?.priorities ?? null, leaveOut: [...new Set([...(s.pathLeaveOut ?? []).filter((d) => course.id === 'ear' || !own.includes(d)), ...INTAKE_AREAS.filter((d) => !own.includes(d))])], reviewsDue: new Set(dueReviews(progress.review, now0).map((r) => r.key)).size, singer: course.id === 'voice' && !s.noMic, view: pathView, template: tmpl, technique: s.drills?.inWorkout !== false && (course.id === 'keys' || course.id === 'guitar' || course.id === 'bass' || course.id === 'drums'), licksDue: course.id === 'drums' || (course.id === 'ear' && !jazzOpenIn(s, 'ear')) ? 0 : dueLicks(s.lickBook?.review, now0).length - phrasesDueCount(s.lickBook, now0.toISOString()), phrasesDue: course.id === 'keys' || course.id === 'guitar' || course.id === 'bass' || course.id === 'voice' ? phrasesDueCount(s.lickBook, now0.toISOString()) : 0, piecesDue: course.id === 'ear' ? 0 : piecesDueN, pathMode: s.pathMode ?? 'guide', course: course.id, day: today, jazz: jazzFocusOn(s, course.id) ? 'focus' : jazzOpenIn(s, course.id) ? 'on' : 'off' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathView, baseMinutes, tmplRaw, s.goal, s.examPrep, s.jazzFocus, s.jazzOpen, s.pathPacks, s.pathLeaveOut, s.pathHidden, s.mode, s.noSing, s.noMic, progress.review.length, today, progress.history.length, piecesDueN, s.pathMode, teacherTp, s.drills?.emphasis]);
  // Today's edits keep the teacher's section (it is added, never replaced: §5.1).
  const todayBlocks = s.workoutToday?.day === today ? withTeacher(s.workoutToday.blocks, teacherTp) : suggestedWorkout;
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
  // BUILD-PLAN phase 2: today's technique block — its minutes and what is left (the technique screen's "part of today's
  // workout" runs the same cells, as long as the block). No technique block today: no "today" on the technique screen.
  const wBlocks = wrun && wrun.day === today ? wrun.blocks : todayBlocks;
  const techMin = wBlocks.filter((b) => b.target.kind === 'keys').reduce((n, b) => n + b.minutes, 0);
  const techLeft = wrun && wrun.day === today ? wrun.blocks.reduce((n, b, i) => n + (b.target.kind === 'keys' ? blockLeftMs(wrun, i) : 0), 0) / 60000 : techMin;
  const drillsToday = techMin > 0 ? { minutes: techMin, left: Math.max(0, techLeft), day: today } : undefined;
  /**
   * SPEC-PATH-TODAY-PRACTICE §3.4: a take on an item of today's technique plan counts toward today's workout wherever it
   * is played (Practice, the key page, the workout itself) — its active time goes to the technique block.
   */
  const creditTodayTake = (st: ItemState, prevMs: number) => {
    if (!techMin || !keptPlan(today)?.items.includes(st.itemId)) return;
    const ms = Math.max(0, (st.activeMs ?? 0) - prevMs) || 15000;
    const r0 = wrunRef.current && wrunRef.current.day === today ? wrunRef.current : startRun(today, withContext(todayBlocks));
    const tb = techBlockOf(r0);
    if (tb) saveRun(creditBlock(r0, tb.id, ms));
  };
  /** Today's lines under some blocks: the key of the week on the technique block, the teacher's class and due date. */
  const workoutSubs = useMemo((): Partial<Record<string, string>> => {
    const he = s.uiLang === 'he';
    const out: Partial<Record<string, string>> = {};
    const wk = s.activeCourse === 'keys' ? weekKeyIfKept('major', 'piano') : null;
    if (wk !== null) {
      const n = keptPlan(today)?.cells.length ?? 0;
      const name = `${keyNameOf(wk)}`;
      out.keys = he ? `סולם השבוע: ${name} מז׳ור${n ? ` · ${n} תרגילים` : ''}` : `Key of the week: ${name} major${n ? ` · ${n} exercises` : ''}`;
      out.improv = he ? `בסולם השבוע: ${name} מז׳ור` : `In the key of the week: ${name} major`;
    }
    const a = assigned[0];
    if (a) out.teacher = he ? `${a.className}${a.dueOn ? ` · עד ${a.dueOn.slice(8, 10)}.${a.dueOn.slice(5, 7)}` : ''}` : `${a.className}${a.dueOn ? ` · due ${a.dueOn.slice(5)}` : ''}`;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.uiLang, s.activeCourse, assigned, today, route]);
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
    if (tg.kind === 'game' || tg.kind === 'vocal' || tg.kind === 'practice' || tg.kind === 'improv' || tg.kind === 'keys') return { title: blockLabel(t, tg, s.uiLang), open: () => go('workoutrun') };
    // §5.1: the teacher's section — the first open assignment (done ones drop out of the list).
    if (tg.kind === 'teacher') {
      const a = assigned.find((x) => !tg.ids || tg.ids.includes(x.lessonId)) ?? assigned[0];
      if (a) return { title: `${blockLabel(t, tg, s.uiLang)} · ${lessonTitle(a.lessonId as LessonId)}`, open: () => openAssignment(a.lessonId) };
      // every assignment is done (or the list hasn't loaded): on to the next block
      return {
        title: blockLabel(t, tg, s.uiLang),
        open: () => {
          workoutPending.current = null;
          const nr = nextBlock(r);
          saveRun(nr);
          if (!nr.finished) runCurrent(nr);
          else go('workoutrun');
        },
      };
    }
    const ratings = ratingsOf(progress);
    if (tg.kind === 'warmup' || tg.kind === 'mistakes') {
      if (dueReviews(progress.review, new Date()).length > 0 && canReview()) return { title: t.review, open: () => openReview() };
      return skillOpen(weakestSkill(ratings));
    }
    // SPEC-PATH-ROLE §3: strengthen — an instrument course plays its opened technique levels (weak keys first, run from
    // the workout screen); otherwise the weakest opened ear / theory step, whose stars a clean run raises.
    if (tg.kind === 'strengthen') {
      if (instrumentCourse) return { title: blockLabel(t, tg, s.uiLang), open: () => go('workoutrun') };
      const st = strengthenStep(mview, mctx.facts);
      if (st && stepOpens(st.x.step)) return { title: nodeTitle(st.x.step, s, s.uiLang), open: () => openPathStep(st.x, st.unit, 'practice') };
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
    if (!nx || !tg || tg.kind === 'game' || tg.kind === 'vocal' || tg.kind === 'practice' || tg.kind === 'improv' || tg.kind === 'keys' || (tg.kind === 'strengthen' && instrumentCourse)) return go('workoutrun');
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
  // GUITAR_DEEPENING §8: the modelled guitar's voice (steel / nylon / clean electric), by the add-ons or the player's choice.
  const guitarVoice = settings ? guitarVoiceOf(settings.guitarVoice, guitarAddOnsOf(settings.drills ?? {}, settings.courses)) : 'steel';
  useEffect(() => piano.setGuitarVoice(guitarVoice), [guitarVoice]);
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
  const courseAreas: DomainId[] = instrumentCourse ? [] : COURSE_AREAS[(s.activeCourse ?? 'ear') as CourseId] ?? [];
  const courseSkills = instrumentCourse ? null : coursePlacementSkills((s.activeCourse ?? 'ear') as CourseId, jazzOpenIn(s, (s.activeCourse ?? 'ear') as CourseId));
  const pending = catchUp(s, progress, courseAreas, courseSkills);
  // 0.84: the "continue your level test" card only for a test of this course — an old all-areas test (from before
  // 0.83) came back from Home in the keys course.
  const savedPlacement = route === 'home' ? placementOfCourse(loadPlacement(), courseAreas, courseSkills) : null;
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
  // SPEC-COURSE-START: the level-test offer (after the first session for "well", after session 3 for the rest) and the
  // first-week card (sessions 2–3 weave in the path's probe steps).
  const csSessions = sessionsSince(progress.history, activeC, cStart?.tasteDoneAt);
  const csOffer = offerDue(cStart, csSessions, levelTested(activeC, progress.history, Object.keys(s.drillStart ?? {})), localDay(new Date()));
  const csDay = firstWeekDay(cStart, csSessions);
  const csReal = realMusicCard(cStart, csSessions, localDay(new Date()));
  const recapNext: { label?: string; open: (() => void) | null; secondary?: { label: string; open: () => void } } = slot?.key.startsWith('taste:')
    ? { label: s.uiLang === 'en' ? 'See your first result' : 'לתוצאה הראשונה', open: () => go('coursestart') }
    : slot?.key.startsWith('real:')
    ? { label: s.uiLang === 'en' ? 'See the result' : 'לתוצאה', open: () => go('home') }
    : checkTechWaiting && checkTech.current
    ? { label: s.uiLang === 'en' ? 'Technique part' : 'חלק הנגינה', open: startCheckTech }
    : origin.path
    ? { label: s.uiLang === 'en' ? 'Next step' : 'לשלב הבא', open: openNextStep, secondary: workoutAction ?? undefined }
    : workoutAction
      ? { label: workoutAction.label, open: workoutAction.open }
      : generated
        ? { label: t.seeSkillMap, open: () => openSkillMap() }
        : { open: canNext ? () => openLesson(nextId) : null };

  const isTab = (TAB_ROUTES as string[]).includes(route);
  // The side menu (SPEC-DESKTOP): shown from 700 px wide by CSS; not during the first questionnaire or the studio.
  const withSide = route !== 'intake' && route !== 'welcome' && route !== 'coursestart' && route !== 'studio' && !mini;
  const onPalette = (h: PaletteHit) => {
    if (h.kind === 'nav') return sideNav(h.id);
    if (h.kind === 'topic') return openTopic(h.id, 1);
    if (h.kind === 'song') return go('songs');
    location.hash = `/settings/${h.id}`;
    go('settings');
  };
  const sideNav = (id: NavId) => {
    // Per course (owner 2026-11-13): an instrument course's level test is played, not a multiple-choice ear quiz.
    if (id === 'placement') return findLevel();
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
    if (id === 'improv') improvInit.current = null;
    go(id as Route);
  };

  // AUDIT-5 #5: act on a plateau — step back on the tempo ladder, another key, or open the item (loop the weak bars
  // from its error map); a flat skill goes into a mixed workout. The try is remembered so the next one rotates.
  const drillOfItem = (itemId: string): Drill | undefined => {
    const st = progress.drillItems?.[itemId];
    const f = st ? familyById(st.family) : undefined;
    for (const lv of f?.levels ?? []) {
      try {
        const d = levelDrills(lv, drillSettingsOf(s).keyOrder).find((x) => x.itemId === itemId);
        if (d) return d;
      } catch {
        /* a level that can't build here (another instrument's tuning) */
      }
    }
    return undefined;
  };
  const openDrillItem = (itemId: string, from: 'diary' | 'keys') => {
    const d = drillOfItem(itemId);
    if (!d) return go('drills');
    chartQueue.current = [d];
    drillFrom.current = from;
    go('drills');
  };
  const actOnPlateau = (f: PlateauFinding, from: 'diary' | 'keys') => {
    recordPlateauTry({ id: f.scope === 'skill' ? `skill:${f.id}` : f.id, how: f.how, base: f.now });
    const st = f.scope === 'item' ? progress.drillItems?.[f.id] : undefined;
    if (!st) return go('workout');
    if (f.how === 'key') {
      const fam = familyById(st.family);
      const k = otherKey(progress.drillItems ?? {}, st.family, st.key, [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
      const q = fam ? skillDrillsInKey(fam, progress.drillItems ?? {}, drillSettingsOf(s).keyOrder, k, s.drillStart?.[st.family]) : [];
      if (!q.length) return openDrillItem(f.id, from);
      chartQueue.current = q;
      drillFrom.current = from;
      return go('drills');
    }
    if (f.how === 'slower') return void store.setDrillItem(stepBack(st)).then((p) => (setProgress(p), openDrillItem(f.id, from)));
    openDrillItem(f.id, from);
  };
  /** Names for the diary's ledger ids: lesson titles and game names. */
  const ledgerLabel = (id: string): string | null => {
    const rest = id.slice(2);
    if (id.startsWith('l:')) {
      if (LESSON_META[rest as LessonId]) return lessonTitle(rest as LessonId);
      const generic: Record<string, [string, string]> = { review: ['Review', 'חזרה'], topic: ['Topic lesson', 'שיעור נושא'], placement: ['Find my level', 'מציאת רמה'], 'weekly-puzzle': ['Weekly puzzle', 'חידה שבועית'] };
      const g = generic[rest] ?? (rest.startsWith('vocal') ? ['Vocal technique', 'טכניקה קולית'] : null);
      return g ? g[s.uiLang === 'he' ? 1 : 0] : null;
    }
    if (id.startsWith('g:')) {
      const g = GAMES2.find((x) => x.id === rest);
      if (g) return g[s.uiLang][0];
      const mem: Record<string, [string, string]> = { melody: ['Melody memory', 'זיכרון מלודי'], rhythm: ['Rhythm memory', 'זיכרון קצבי'] };
      return mem[rest]?.[s.uiLang === 'he' ? 1 : 0] ?? null;
    }
    return null;
  };

  // The parent digest page stands alone (no menus, no sign-in).
  if (digestToken)
    return (
      <div className="app">
        <DigestScreen token={digestToken} lang={s.uiLang} t={t} onHome={() => ((location.hash = ''), setDigestToken(null))} />
      </div>
    );
  // The public link of a shared phrase stands alone too (hear it, see it, try it in free time — no account needed).
  if (publicLink && !challengeSignedIn)
    return (
      <div className="app">
        <PhrasePublicScreen
          code={publicLink.code}
          beat={publicLink.beat}
          lang={s.uiLang}
          signedIn={false}
          onOpenInApp={() => setPublicLink(null)}
          onSignIn={() => {
            try {
              localStorage.setItem('toneturn.phraseLink', `${publicLink.code}${publicLink.beat ? `/${publicLink.beat}` : ''}`);
            } catch {
              /* fine */
            }
            if (cloudConfigured) void signInWithGoogle();
          }}
          onHome={() => ((location.hash = ''), setPublicLink(null))}
        />
      </div>
    );

  return (
    <CourseContext.Provider value={courseCtx}>
    <MiniGateContext.Provider value={gate}>
    <RefresherContext.Provider value={openRefresher}>
    <div className={`app ${isTab ? 'has-tabs' : ''} ${withSide ? 'with-side' : ''}`}>
      {withSide && <CommandPalette lang={s.uiLang} onPick={onPalette} />}
      {SIMULATED && <div className="sim-banner">{t.simulated}</div>}
      {withSide && <Sidebar route={route} lang={s.uiLang} onNav={sideNav} me={{ name: playerFirstName, streak: gems.streak.count, onOpen: () => go('settings') }} extra={<>
            <WhatsNewButton t={t} lang={s.uiLang} unseen={news.length > 0} onSeen={() => updateSettings({ seenVersion: APP_VERSION })} />
            <MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />
          </>} />}
      {opener && (
        <Opener
          key={opener.spec.kind === 'course' ? `c:${opener.spec.course}` : `u:${opener.spec.unitId}`}
          spec={opener.spec}
          lang={s.outputLang}
          onDone={() => {
            const then = opener.then;
            setOpener(null);
            then?.();
          }}
        />
      )}
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
          <TopBar keysSound={keysSound} t={t} lang={s.uiLang} streak={gems.streak} onStreak={() => setStreakOpen(true)} whatsNew={{ unseen: news.length > 0, onSeen: () => updateSettings({ seenVersion: APP_VERSION }) }} headerExtra={<MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />} onMenu={() => setMenuOpen(true)} />
        </div>
      )}
      {route === 'learned' && <LearnedScreen t={t} settings={s} name={playerFirstName} onLearned={markLearned} onBack={() => go(toolFrom.current)} />}
      {route === 'home' && (
        <Home
          keysSound={keysSound}
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
              leadsTo={leadsLine}
              subs={workoutSubs}
            />
          }
          today={
            <TodayCards
              settings={s}
              progress={progress}
              goalXp={s.dailyGoal ?? DAILY_GOAL_XP}
              signedIn={!!user}
              onLeague={() => go('friends')}
              exam={{ mock: openMock, practise: (topic, level) => openTopic(topic, level), all: () => go('exams') }}
              onRepertoire={(id) => openRep(id ? { piece: pieceKey({ kind: 'rep', course: (s.activeCourse ?? 'ear') as CourseId, id }), from: 'today' } : {})}
              onPitchMemory={() => go('pitchmemory')}
              streak={gems.streak.count}
              onStreak={() => setStreakOpen(true)}
              onEncore={(h) => (location.hash = h)}
            />
          }
          headerExtra={<MonthReviewIcon t={t} lang={s.uiLang} progress={progress} seenMonth={s.monthReviewSeen} onSeen={(monthReviewSeen) => updateSettings({ monthReviewSeen })} />}
          streak={gems.streak}
          onStreak={() => setStreakOpen(true)}
          onMenu={() => setMenuOpen(true)}
          assigned={user && assigned.length ? <AssignedCard t={t} items={assigned} lang={s.uiLang} onOpen={(id) => openAssignment(id)} /> : null}
          aside={<TodayAside lang={s.uiLang} progress={progress} streak={gems.streak.count} puzzleRows={s.progPuzzle?.[localDay(new Date())]?.rows} onPuzzle={() => go('puzzle')} onDaily={() => go('daily')} onExams={() => go('exams')} onImprov={() => ((improvInit.current = null), go('improv'))} />}
          startLessonLink={activeC === 'ear' && cStage === 'welcome'}
          startHero={cStage !== 'done' ? <CourseStartHero course={activeC} lang={s.uiLang} stage={cStage} cs={cStart} jazz={tasteJazz(activeC)} onStart={continueCourseStart} onFindLevel={findLevel} onIntro={openersOn && courseOpenerSeen(s.openers, activeC) ? () => setOpener({ spec: { kind: 'course', course: activeC, report: cStart?.report ?? 'new', replay: true, taste: tasteFor(activeC, cStart?.report, tasteJazz(activeC)).title, jazz: jazzOpenIn(s, activeC) } }) : undefined} /> : undefined}
          news={
            <>
              <DepthCard lang={s.uiLang} onOpen={() => go('depth')} />
              {csOffer && <LevelOfferCard lang={s.uiLang} onFind={findLevel} onLater={() => updateCourseStart((m) => snoozeOffer(m, activeC, localDay(new Date())))} />}
              {csReal && cStage === 'done' && (
                <RealMusicCard
                  lang={s.uiLang}
                  mode={csReal}
                  def={realMusicFor(activeC, cStart?.report)}
                  cs={cStart}
                  onStart={startReal}
                  onLater={() => updateCourseStart((m) => skipReal(m, activeC, csNow(), csSessions, localDay(new Date())))}
                  onClose={() => updateCourseStart((m) => markRealSeen(m, activeC, csNow()))}
                />
              )}
              {csDay && cStage === 'done' && csReal !== 'offer' && <FirstWeekCard lang={s.uiLang} day={csDay} picks={pickProbes(pathView.units)} onOpen={(x, unit) => openFromPath(x, unit, 'step')} />}
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
                  onMeasure={() => (instrumentCourse ? openTechTest() : openCatchUpPlacement(pending.unmeasured))}
                  onFindLevel={() => (instrumentCourse ? openTechTest() : s.activeCourse === 'voice' ? openVoiceTest() : openPlacement())}
                  onHide={() => updateSettings({ catchUpHidden: catchUpKey })}
                />
              )}
            </>
          }
          whatsNew={{ unseen: news.length > 0, onSeen: () => updateSettings({ seenVersion: APP_VERSION }) }}
          onPlacement={openPlacement}
          onFindLevel={findLevel}
          levelAreas={instrumentCourse || s.activeCourse === 'voice' ? [] : (s.activeCourse ?? 'ear') === 'ear' ? [...COURSE_AREAS.ear, 'creative'] : COURSE_AREAS[(s.activeCourse ?? 'ear') as CourseId] ?? []}
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
      {route === 'path' && <PathView2 t={t} settings={s} progress={progress} view={pathView} onStep={openFromPath} onFullPractice={stepHome} onCourseIntro={() => setOpener({ spec: { kind: 'course', course: activeC, report: cStart?.report ?? 'new', replay: true, taste: tasteFor(activeC, cStart?.report, tasteJazz(activeC)).title, jazz: jazzOpenIn(s, activeC) } })} onAboutUnit={(u) => setOpener({ spec: unitOpenerSpec(u, true) })} onPracticeMissing={practiceMissing} onTestOut={openTestOut} onPlacement={() => (instrumentCourse ? openTechTest() : s.activeCourse === 'voice' ? openVoiceTest() : openPlacement())} onTechTest={instrumentCourse && cStart?.legacy && !s.drillStart && !Object.keys(progress.drillItems ?? {}).length ? openTechTest : undefined} onSettings={updateSettings} top={
        cStage !== 'done' ? (
          <CourseStartHero course={activeC} lang={s.uiLang} stage={cStage} cs={cStart} jazz={tasteJazz(activeC)} onStart={continueCourseStart} onFindLevel={findLevel} compact />
        ) : (
          <>
            {csOffer && <LevelOfferCard lang={s.uiLang} onFind={findLevel} onLater={() => updateCourseStart((m) => snoozeOffer(m, activeC, localDay(new Date())))} />}
            <CourseGoalLine course={activeC} lang={s.uiLang} cs={cStart} facts={s.pathFacts} section={pathView.units.find((u) => u.status === 'current')?.section} />
          </>
        )
      } onLesson={(id) => {
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
            repertoire: (() => {
              const g = repGoal(s.activeCourse ?? 'ear', repResults(progress.lessons, s.activeCourse ?? 'ear'));
              return `${g.title[s.uiLang]} · ${g.now}/${g.target}`;
            })(),
            standards: (() => {
              const g = repGoal('jazz', repResults(progress.lessons, 'jazz'));
              return `${g.title[s.uiLang]} · ${g.now}/${g.target}`;
            })(),
            ...((s.knownChords ?? []).length ? { songs: s.uiLang === 'he' ? `${(s.knownChords ?? []).length} אקורדים` : `${(s.knownChords ?? []).length} chords` } : {}),
            ...(s.progPuzzle?.[localDay(new Date())] ? { puzzle: s.uiLang === 'he' ? 'שוחק היום' : 'Played today' } : {}),
            // The Licks tile: the library's reviews and my phrases' keys due today, together.
            ...((() => {
              const d = licksDue(s.lickBook);
              const n = d.library + d.mine;
              return n ? { licks: s.uiLang === 'he' ? `${n} לחזרה היום` : `${n} due today` } : {};
            })()),
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
          onBoard={() => go('gameboard')}
          lang={s.uiLang}
          hub={{
            songs: () => go('songs'),
            // Phase 3: one Repertoire for every piece (charts, scores, recordings, Ear's jazz standards inside it).
            repertoire: () => openRep({}),
            drills: () => go('drills'),
            vocal: () => go('vocal'),
            singalong: () => go('singalong'),
            lessons: () => go('learned'),
            tuner: () => go('tuner'),
            metronome: () => go('metronome'),
            drone: () => go('drone'),
            slowdown: () => go('slowdown'),
            groove: () => go('groove'),
            // Improvise for every player; on the kit it is fills, solos and trading fours.
            improv: () => (improvInit.current = null, go('improv')),
            // Owner 2026-11-22: one Licks tile — the library, my phrases (Encore) and the challenges inside it.
            licks: () => gate('game:licks', () => go('licks')),
            // GUITAR_DEEPENING §6.3: the chord finder (guitar course), opened by its quick lesson the first time.
            ...(s.activeCourse === 'guitar' ? { chordfinder: () => gate('game:chordfinder', () => go('chordfinder')) } : {}),
            // Chord & cadence builder (guitar roadmap): the keys and guitar courses' Tools.
            ...(s.activeCourse === 'guitar' || s.activeCourse === 'keys' ? { chordbuilder: () => gate('game:chordbuilder', () => go('chordbuilder')) } : {}),
            puzzle: () => go('puzzle'),
            exams: () => go('exams'),
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
          onAgain={() => ((againing.current = true), window.setTimeout(() => (againing.current = false), 0), generated?.def.id === 'placement' ? openPlacement(generated.def.placementDomain ?? null, true) : generated?.def.id === 'review' ? openReview() : generated?.def.id === 'modes' ? openModes(modesAgainLevel(generated.def)) : generated?.def.id === 'wrong-notes' ? openWrongNotes(wrongLevel) : generated ? againGenerated() : openLesson(lessonId))}
          brief={slot?.brief}
          briefSeen={!!slot?.briefSeen}
          onHideTopic={slot?.brief?.topic ? () => {
            updateSettings({ pathHidden: [...new Set([...(s.pathHidden ?? []), slot.brief!.topic!])] });
            pendingStep.current = null;
            go('path');
          } : undefined}
          onKeepStep={slot?.brief?.keepStep ? () => updateSettings({ pathKeep: [...new Set([...(s.pathKeep ?? []), slot.brief!.keepStep!])] }) : undefined}
          onFullPractice={slot?.brief?.pathStep && slot.brief.topic ? () => {
            // SPEC-PATH-TODAY-PRACTICE §3.1: the topic's own practice, beyond the step's minimum (free, not the step).
            pendingStep.current = null;
            openTopic(slot.brief!.topic!, slot.brief!.level ?? 1);
          } : undefined}
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
            // A course's taste lesson finished: its measured first win (the first one only), then the win screen.
            const tc = slot?.key.startsWith('taste:') ? (slot.key.slice(6) as CourseId) : null;
            const r = p.history[p.history.length - 1];
            if (tc && r) updateCourseStart((m) => markTasteDone(m, tc, { kind: 'lesson', right: r.firstTry, total: r.total, xp: r.xp }, r.completedAt));
            // Day 3's "real music" moment as questions: its measured result (kept once) for the card on Home.
            const rc = slot?.key.startsWith('real:') ? (slot.key.slice(5) as CourseId) : null;
            if (rc && r) updateCourseStart((m) => markRealDone(m, rc, { kind: 'lesson', right: r.firstTry, total: r.total, xp: r.xp }, r.completedAt));
            if (user) void runSync();
          }}
          onSettings={updateSettings}
        />
      )}
      {route === 'settings' && (
        <SettingsScreen t={t} settings={s} ratings={ratingsOf(progress)} onChange={updateSettings} onBack={() => go('home')} onPlans={() => go('plans')} onAdmin={plan?.admin ? () => go('admin') : undefined} onIntake={() => go('intake')} onDepth={() => go('depth')} onMixer={openMixer} account={<AccountCard t={t} user={user} sync={sync} />} />
      )}
      {route === 'depth' && <DepthScreen lang={s.uiLang} onBack={() => go(ACTIVE_PARTNER ? 'home' : 'settings')} onOpen={openDepthLink} />}
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
                  {COURSE_SECTIONS[s.activeCourse ?? 'ear'] ? <Icon k="quaver" /> : (earIndex(ratingsOf(progress))?.r ?? '—')}
                </span>
                <span className="in-entry-text">
                  <b>{s.uiLang === 'he' ? 'תובנות' : 'Insights'}</b>
                  <small>{s.uiLang === 'he' ? 'מדד האוזן, מפת הידיים, טביעת הגרוב, מפת הבלבולים' : 'Ear Index, hand map, groove fingerprint, confusion map'}</small>
                </span>
                <span aria-hidden="true">
                  <Icon k="fwd" />
                </span>
              </button>
              <DiaryEntryCard lang={s.uiLang} onOpen={() => go('diary')} />
              {/* Phase 3 (SPEC-PRACTICE-IA-3 §2): logging practice away from the app sits beside the diary. */}
              <button className="set-card in-entry in-log" onClick={() => setLogOpen(true)} data-open-log="progress">
                <span className="in-entry-text">
                  <b>{s.uiLang === 'he' ? 'רישום אימון מחוץ לאפליקציה' : 'Log practice away from the app'}</b>
                  <small>{s.uiLang === 'he' ? 'דקות, מה תרגלתם, הערה' : 'Minutes, what you practised, a note'}</small>
                </span>
                <span aria-hidden="true">
                  <Icon k="plus" />
                </span>
              </button>
              <RecordingsEntryCard lang={s.uiLang} />
              {/* owner 2026-11-21: an instrument course shows its own sections (the radar, Skills) — not the ear's chord,
                  areas and a challenge from another course */}
              {!COURSE_SECTIONS[s.activeCourse ?? 'ear'] && <EarChordCard t={t} ratings={ratingsOf(progress)} bestLeague={s.bestLeague} />}
              {!COURSE_SECTIONS[s.activeCourse ?? 'ear'] && <DomainTiles t={t} progress={progress} onPractice={practiceSkill} lang={s.uiLang} onTechnique={() => go('drills')} onLearn={{ has: (k) => !!miniForSkill(k), open: (k) => openRefresher(miniForSkill(k)!, () => undefined) }} />}
              {challengeInCourse(s.activeCourse ?? 'ear') && <ChallengeCard input={badgeInputOf(progress, new Date(), s.uiLang === 'he' ? [5, 6] : undefined, { firstWins: firstWinCourses(s.courseStart) })} lang={s.uiLang} />}
            </>
          }
          map={<SkillMap t={t} lang={s.uiLang} progress={progress} bestLeague={s.bestLeague} onBack={() => go('home')} onPractice={practiceSkill} onPlacement={openPlacement} />}
          badges={<BadgesView lang={s.uiLang} input={badgeInputOf(progress, new Date(), s.uiLang === 'he' ? [5, 6] : undefined, { firstWins: firstWinCourses(s.courseStart) })} log={progress.badges} earnedOnly course={s.activeCourse ?? 'ear'} courses={s.courses ?? ['ear']} />}
        />
      )}
      <SoundBlocked lang={s.uiLang} />
      {askKeysSound && <KeysSoundAsk device={askKeysSound} lang={s.uiLang} onAnswer={(appSound) => updateSettings({ midiSound: appSound, midiSoundAsked: true })} />}
      {freshNotice && (
        <div className="sheet-backdrop" onClick={() => setFreshNotice(false)}>
          <div className="sheet fresh-sheet" role="dialog" aria-modal="true" aria-labelledby="fresh-title" onClick={(e) => e.stopPropagation()} data-fresh-notice>
            <h2 id="fresh-title">{s.uiLang === 'he' ? 'מצב בדיקה: מתחילים מחדש' : 'Testing round: a fresh start'}</h2>
            <p>
              {s.uiLang === 'he'
                ? 'סידרנו מחדש את השלבים בכל הקורסים, ולכן ההתקדמות של כל הבודקים נמחקה בכוונה. כך תוכלו לחוות את ההתחלה כמו משתמש חדש: בחירת קורס, הפתיחה המונפשת והיחידות הראשונות.'
                : 'We reordered the steps in every course, so every tester’s progress was cleared on purpose. Now you can try the start as a new player would: choosing a course, the animated opening and the first units.'}
            </p>
            <p className="muted">{s.uiLang === 'he' ? 'השפה, הכינוי, הכיול וההקלטות שלכם נשמרו.' : 'Your language, nickname, calibration and recordings were kept.'}</p>
            <button className="btn mega" autoFocus onClick={() => setFreshNotice(false)}>
              {s.uiLang === 'he' ? 'מתחילים' : 'Start'}
            </button>
          </div>
        </div>
      )}
      {consentThen && (
        <div className="sheet-backdrop" onClick={() => setConsentThen(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="consent2-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="consent2-title">
              <MicIcon /> {t.consentTitle}
            </h2>
            <p>
              <ConsentBody lang={s.uiLang} />
            </p>
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
            if (r === 'placement') findLevel();
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
      {route === 'coursestart' &&
        (cStage === 'welcome' || csWelcomeAgain ? (
          <CourseWelcome key={activeC} course={activeC} lang={s.uiLang} report={cStart?.report} onReport={onCourseReport} onBack={() => (csWelcomeAgain ? setCsWelcomeAgain(false) : go('home'))} track={drillSettingsOf(s).bassTrack} onTrack={(t) => updateSettings({ drills: { ...drillSettingsOf(s), bassTrack: t } })} />
        ) : cStage === 'setup' ? (
          <CourseSetup
            key={activeC}
            course={activeC}
            lang={s.uiLang}
            settings={s}
            onSettings={updateSettings}
            onBack={() => setCsWelcomeAgain(true)}
            onDone={(skipped) => {
              updateCourseStart((m) => markSetup(m, activeC, csNow(), skipped));
              startTaste();
            }}
          />
        ) : cStage === 'win' && cStart ? (
          <FirstWin
            course={activeC}
            lang={s.uiLang}
            cs={cStart}
            streak={gems.streak.count}
            dailyGoal={s.dailyGoal}
            reminderHour={s.reminderHour}
            onPath={() => leaveWin(() => go('path'))}
            onFindLevel={() => leaveWin(findLevel)}
            onDailyGoal={(xp) => updateSettings({ dailyGoal: xp })}
            onReminder={async (h) => {
              updateSettings({ reminderHour: h });
              if (!user) return 'signin';
              try {
                const st = await enablePush(s.outputLang, h);
                return st === 'on' ? 'on' : st === 'denied' ? 'denied' : 'unsupported';
              } catch {
                return 'error';
              }
            }}
            onPersonalGoal={(id) => {
              const g = id ? goalById(activeC, id) : null;
              updateCourseStart((m) => setPersonalGoal(m, activeC, g ? { id: g.id, at: csNow(), weeks: g.weeks, steps: g.steps } : null));
            }}
          />
        ) : null)}
      {route === 'welcome' && (
        <Onboarding
          lang={s.uiLang}
          onSignIn={() => void signInWithGoogle()}
          onDone={(res) => {
            // SPEC-COURSE-START: no level test before any music — the first course opens with its welcome card.
            updateSettings({ ...res.patch, courseStart: { ...(s.courseStart ?? {}), ...(res.patch.courseStart ?? {}) }, pathFacts: unfreezeIfEarly(res.patch.pathFacts ?? s.pathFacts) });
            go('coursestart');
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
            const c = (res.patch.activeCourse ?? activeC) as CourseId;
            if (then === 'placement') {
              // Chosen explicitly in the full questionnaire: the course's own level test (SPEC-COURSE-START, level test).
              go('home');
              window.setTimeout(() => (['keys', 'guitar', 'bass', 'drums'].includes(c) ? openTechTest() : c === 'voice' ? openVoiceTest() : openPlacement()), 0);
            } else if (then === 'basics') {
              go('home');
              // A course not started yet starts with its welcome card and taste; a started one with the first lesson.
              if (stageOf(s.courseStart?.[c], setupNeeded(c, s)) !== 'done') window.setTimeout(() => go('coursestart'), 0);
              else {
                const first = personalOrder(res.intake.priorities, res.patch.track)[0];
                window.setTimeout(() => openLesson(first), 0);
              }
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
              <button className="btn primary" onClick={() => { const o = recalOffer; setRecalOffer(null); if (o.kind === 'promote') { const u = pathView.units.find((x) => x.status === 'current'); if (u) openTestOut(u); } else if (instrumentCourse) openTechTest(); else openPlacement(o.area ?? null, true); }}>{recalOffer.kind === 'promote' ? (s.uiLang === 'en' ? 'Test out' : 'למבחן') : s.uiLang === 'en' ? 'Re-test' : 'למבחן קצר'}</button>
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
      {challenge !== undefined && (
        <ChallengeSheet
          lang={s.uiLang}
          ch={challenge}
          signedIn={!!user}
          gameTitle={(() => {
            const g = typeof challenge === 'object' && challenge ? challengeGame(challenge.game) : undefined;
            return g ? (GAMES2.find((x) => x.id === g)?.[s.uiLang][0] ?? GAME_TITLES[g]?.[s.uiLang] ?? g) : undefined;
          })()}
          tierName={typeof challenge === 'object' && challenge && challenge.tier != null ? TIERS[challenge.tier] : undefined}
          onPlay={playChallenge}
          onFriends={() => (setChallenge(undefined), go('friends'))}
          onSignIn={() => void signInWithGoogle()}
          onClose={() => setChallenge(undefined)}
        />
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
          leadsTo={leadsLine}
          subs={workoutSubs}
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
          listen={listenCard(tuneSlotLevels(progress.drillItems ?? {}).concept)}
          lang={s.uiLang}
          run={wrun}
          subs={workoutSubs}
          onGo={() => {
            const b = wrun.blocks[wrun.at];
            // BUILD-PLAN phase 2: the piano's technique block — today's matrix cells under the coach, as long as the block;
            // its time is counted take by take (creditTodayTake), so stopping resumes the block at the cell.
            if (b.target.kind === 'keys' && drillSettingsOf(s).instrument === 'piano' && s.activeCourse === 'keys') {
              chartQueue.current = null;
              drillFrom.current = 'workout';
              drillToday.current = true;
              drillSessionXp.current = 0;
              drillSession.current = { takes: 0, clean: 0 };
              return go('drills');
            }
            // D2: the improvisation share (repertoire for a classical emphasis, grooves on the drums) runs on its screen.
            if (b.target.kind === 'improv') {
              saveRun(addSession(wrun, b.minutes * 60000, Math.max(1, b.minutes), Math.max(1, b.minutes)));
              const mode = b.target.mode ?? 'improv';
              return go(mode === 'repertoire' ? 'pieces' : mode === 'grooves' ? 'groove-echo' : 'improv');
            }
            // Any other block (this screen restored on a path / area / warm-up block): open it as Continue would.
            // SPEC-PATH-ROLE §3: an instrument course's strengthen block — the opened levels' drills, weak keys first
            // (also the technique block on the guitar, bass and drums: other instruments keep this until their ladders).
            if ((b.target.kind === 'strengthen' || b.target.kind === 'keys') && instrumentCourse) {
              saveRun(addSession(wrun, b.minutes * 60000, Math.max(1, b.minutes), Math.max(1, b.minutes)));
              let q = strengthenDrills(mview, mctx);
              // AUDIT-5 #5: an item on a plateau leads the block (once in the opened levels' pool or not, it is edge work).
              const pf = plateausOf(progress, loadLedger(), localDay(new Date()), 4).find((f) => f.scope === 'item' && f.kind === 'plateau');
              const pd = pf ? drillOfItem(pf.id) : undefined;
              if (pd && q.length) q = [pd, ...q.filter((d) => d.itemId !== pd.itemId)].slice(0, Math.max(q.length, 1));
              chartQueue.current = q.length ? q : null;
              drillFrom.current = 'workout';
              drillSessionXp.current = 0;
              drillSession.current = { takes: 0, clean: 0 };
              return go('drills');
            }
            if (b.target.kind !== 'game' && b.target.kind !== 'vocal') return runCurrent(wrun);
            // Games and the vocal warm-up: the block counts as done when started (they run on their own screens).
            saveRun(addSession(wrun, b.minutes * 60000, Math.max(1, b.minutes), Math.max(1, b.minutes)));
            // The four-slot session's Tunes block (practiceMethod.ts): the head levels for what slot 2 worked on.
            if (b.id.startsWith('tunes-') && settings) {
              const levels = [...catalog(), ...guitarCatalog()].flatMap((f) => f.levels);
              let q: Drill[] = [];
              for (const id of tuneSlotLevels(progress.drillItems ?? {}).levels) {
                const lv = levels.find((l) => l.id === id);
                if (!lv) continue;
                try {
                  q = levelDrills(lv, drillSettingsOf(settings).keyOrder).slice(0, 6);
                } catch {
                  q = [];
                }
                if (q.length) break;
              }
              chartQueue.current = q.length ? q : null;
            }
            if (b.target.kind === 'game') {
              if (b.target.game === 'licks') lickReview.current = true;
              if (b.target.game === 'drills') {
                drillFrom.current = 'workout';
                drillSessionXp.current = 0;
                drillSession.current = { takes: 0, clean: 0 };
              }
              go(b.target.game as Route);
            }
            else go('vocal');
          }}
          onBlockDone={(ms, note) => {
            // AUDIT-5: book the time actually measured (not the planned block), and keep the player's note as a log entry.
            const r = addSession(wrun, ms, 1, 1);
            const min = Math.round(ms / 60000);
            if (min >= 1) {
              const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
              void store.recordCompletion({ ...makeLogResult('other', min, 0, new Date(), id), sessionId: `wk-${id}`, xp: 0, ...(note ? { note } : {}) }).then(setProgress);
            } else if (note) addJournalNote(note, { course: s.activeCourse }); // under a minute: the note still goes in the diary
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
          key={`pieces-${engineArg(location.hash) ?? ''}`}
          settings={s}
          openId={engineArg(location.hash)}
          // Phase 3 fix: Back returns to where it was opened from (the piece page, Mine, the songbook).
          onBack={() => backToRep(() => (workoutPending.current ? go('workoutrun') : openRep({ tab: 'mine', mine: 'scores' })))}
          onMinutes={(min, cleanReps) => {
            const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const r = makeLogResult('piece', min, 0, new Date(), id);
            void store.recordCompletion({ ...r, sessionId: `piece-${id}`, xp: Math.min(30, cleanReps * 2) }).then(setProgress);
          }}
        />
      )}
      {CHALLENGES_ON() && challengeSignedIn && <TogetherChip lang={s.uiLang} />}
      {route === 'challenges' && (
        <ChallengeScreen
          lang={s.uiLang}
          settings={s}
          items={progress.drillItems ?? {}}
          signedIn={challengeSignedIn}
          onSettings={updateSettings}
          onBack={() => (history.length > 1 ? history.back() : go('friends'))}
          onSignIn={() => (cloudConfigured ? void signInWithGoogle() : go('settings'))}
        />
      )}
      {route === 'teach' && <TeachScreen lang={s.uiLang} settings={s} items={progress.drillItems ?? {}} onBack={() => (history.length > 1 ? history.back() : go('home'))} />}
      {route === 'recordings' && <RecordingsScreen lang={s.uiLang} onBack={() => go(recFrom.current === 'recordings' ? 'home' : recFrom.current)} />}
      {route === 'diary' && (
        <PracticeDiaryScreen
          lang={s.uiLang}
          progress={progress}
          skillNames={t.skillNames}
          label={ledgerLabel}
          course={(s.activeCourse ?? 'ear') as CourseId}
          weeklyTarget={s.streakWeekly ?? 0}
          onWeekly={(n) => updateSettings({ streakWeekly: n || undefined })}
          onBack={() => go('skills')}
          onPlateau={(f) => actOnPlateau(f, 'diary')}
        />
      )}
      {route === 'insights' && <InsightsScreen onPlateau={(f) => actOnPlateau(f, 'keys')} plateauLabel={ledgerLabel} lang={s.uiLang} progress={progress} nearMastery={masteryLine(mview, mctx, unitName, (st) => nodeTitle(st, s, 'en')) || undefined} onBack={() => go('skills')} onTopic={(id, lv) => openTopic(id, lv)} onDrills={() => go('drills')} onDrillKey={(family, key) => {
            const f = familyById(family);
            const q = f ? skillDrillsInKey(f, progress.drillItems ?? {}, drillSettingsOf(s).keyOrder, key, s.drillStart?.[family]) : [];
            if (!q.length) return go('drills');
            chartQueue.current = q;
            drillFrom.current = 'keys';
            go('drills');
          }} onPieces={() => go('pieces')} onGroove={() => go('groove')} course={(s.activeCourse ?? 'ear') as CourseId} />}
      {route === 'groove' && (
        <GrooveTrainerScreen
          settings={s}
          onBack={() => go(toolFrom.current)}
          tier={tierFor('groove')}
          onResult={(r) => {
            void store.recordGame2('groove', r.score, undefined, r.detail).then(setProgress);
            noteGameBest('groove', r.score, r.detail);
            noteGameStep('groove', r.score, r.detail);
          }}
        />
      )}
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
      {/* The Licks tile (owner 2026-11-22): the library, my phrases (what Encore was) and the challenges, as sections. */}
      {route === 'licks' && (
        <LicksRoute>
          {(section) =>
            section === 'mine' ? (
              <EncoreScreen
                hub
                lang={s.uiLang}
                settings={s}
                items={progress.drillItems ?? {}}
                onSettings={updateSettings}
                onTake={(st, evs, xp, m) => {
                  noteTake(xp, m.verdict);
                  void store.recordDrill(st, evs, xp, m).then(setProgress);
                }}
                onBack={() => {
                  void techResult('encore')?.then(setProgress);
                  go(workoutPending.current ? 'workoutrun' : 'arcade');
                }}
                onDrills={() => go('drills')}
              />
            ) : section === 'challenges' ? (
              <ChallengeScreen
                hub
                lang={s.uiLang}
                settings={s}
                items={progress.drillItems ?? {}}
                signedIn={challengeSignedIn}
                onSettings={updateSettings}
                onBack={() => (history.length > 1 ? history.back() : go('friends'))}
                onSignIn={() => (cloudConfigured ? void signInWithGoogle() : go('settings'))}
              />
            ) : (
              <LickTrainerScreen
                hub
                lang={s.uiLang}
                settings={s}
                items={progress.drillItems ?? {}}
                onSettings={updateSettings}
                onTake={(st, evs, xp, m) => {
                  noteTake(xp, m?.verdict);
                  void store.recordDrill(st, evs, xp, m).then(setProgress);
                }}
                onUsed={(evs, xp) => {
                  drillSessionXp.current += xp;
                  void store.recordRatingEvents(evs).then(setProgress);
                }}
                startReview={lickReview.current}
                vocab={vocabCtx()}
                onImprovise={(c) => {
                  // "use it in improvisation" (SPEC-LICKS-IN-IMPROV §5): the chart player with today's lick; Back returns to Licks
                  chartInit.current = c;
                  toolFrom.current = 'licks';
                  go('charts');
                }}
                pathLevel={measuredStep.current?.level}
                onPathDone={(stars) => leaveMeasured('licks', stars)}
                onBack={() => leaveMeasured('licks', null)}
              />
            )
          }
        </LicksRoute>
      )}
      {route === 'encore' && (
        <EncoreScreen
          lang={s.uiLang}
          settings={s}
          items={progress.drillItems ?? {}}
          onSettings={updateSettings}
          onTake={(st, evs, xp, m) => {
            noteTake(xp, m.verdict);
            void store.recordDrill(st, evs, xp, m).then(setProgress);
          }}
          onBack={() => {
            void techResult('encore')?.then(setProgress);
            go(workoutPending.current ? 'workoutrun' : 'arcade');
          }}
          onDrills={() => go('drills')}
        />
      )}
      {route === 'transcribe-coach' && (
        <TranscribeCoachScreen
          hub
          lang={s.uiLang}
          settings={s}
          items={progress.drillItems ?? {}}
          onSettings={updateSettings}
          onTake={(st, evs, xp, m) => {
            noteTake(xp, m?.verdict);
            void store.recordDrill(st, evs, xp, m).then(setProgress);
          }}
          onPhrase={(st, evs, xp, stars) => {
            noteTake(xp, stars === 3 ? 'clean' : 'not');
            void store.recordDrill(st, evs, xp, { verdict: stars === 3 ? 'clean' : 'not', hands: 'R', cv: null }).then(setProgress);
          }}
          pathLevel={measuredStep.current?.level}
          onPathDone={(stars) => leaveMeasured('transcribe', stars)}
          onBack={() => leaveMeasured('transcribe', null)}
        />
      )}
      {route === 'improv' && s.activeCourse === 'drums' && (
        <DrumImprovScreen
          lang={s.uiLang}
          items={progress.drillItems ?? {}}
          order={drillSettingsOf(s).keyOrder}
          onBack={() => go('arcade')}
          onLevel={(lv) => {
            chartQueue.current = levelDrills(lv, drillSettingsOf(s).keyOrder);
            drillFrom.current = 'improv';
            drillSessionXp.current = 0;
            drillSession.current = { takes: 0, clean: 0 };
            go('drills');
          }}
        />
      )}
      {route === 'improv' && s.activeCourse !== 'drums' && (
        <ImprovStudioScreen
          key={improvInit.current?.id ?? 'improv'}
          settings={s}
          initialChart={improvInit.current}
          title={<PlaceSpark place="improv" course={(s.activeCourse ?? 'ear') as CourseId} lang={s.uiLang} />}
          vocab={vocabCtx()}
          onLickUsed={(evs, xp) => void store.recordRatingEvents(evs).then(setProgress).then(() => void xp)}
          onBack={() => (improvInit.current ? ((improvInit.current = null), backToRep(() => go('arcade'))) : go('arcade'))}
          onOpenChart={(c) => ((chartInit.current = c), go('charts'))}
        />
      )}
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
      {route === 'mysong' && (
        <MySongScreen
          key={`mysong-${engineArg(location.hash) ?? ''}`}
          lang={s.uiLang}
          settings={s}
          course={(s.activeCourse ?? 'ear') as CourseId}
          openId={engineArg(location.hash)}
          onSettings={updateSettings}
          onBack={() => backToRep(() => (workoutPending.current ? go('workoutrun') : openRep({ tab: 'mine', mine: 'recordings' })))}
          onResult={(r) => {
            // One measured session: XP, streak, daily goal, league (per course) and the rated items.
            void store
              .recordCompletion({ lessonId: `my-song-${r.course}`, lessonVersion: 1, sessionId: r.sessionId, completedAt: new Date().toISOString(), firstTry: r.firstTry, total: r.total, xp: r.xp, missed: [], items: r.items, course: r.course })
              .then(setProgress);
          }}
        />
      )}
      {route === 'charts' && <ChartsScreen
          key={`charts-${engineArg(location.hash) ?? ''}`}
          initial={() => {
            const c = chartInit.current;
            chartInit.current = null;
            if (c) return c;
            // A reload on the chart player: the piece (or improvisation level) in the address.
            const arg = engineArg(location.hash);
            const lv = arg?.startsWith('lvl:') ? chartOfLevel(arg.slice(4), s.uiLang) : null;
            const ref = parsePieceKey(arg);
            return (lv ?? (ref ? chartOfPiece(ref, s.uiLang, s.myCharts) : null)) as MyChart | null;
          }}
          settings={s}
          onChange={updateSettings}
          onBack={() => backToRep(() => go(toolFrom.current))}
          onMixer={openMixer}
          vocab={vocabCtx()}
          onDrill={(kind, stride) => {
            chartQueue.current = [generate({ family: stride ? 'accomp' : 'voicings', kind, key: 0, hands: 'L', swing: true })];
            drillFrom.current = 'chart';
            chartReturn.current = !!engineArg(location.hash);
            go('drills');
          }}
          onImprov={(score, bpm, chords, level, challenge) => {
            // A standard opened from the repertoire: the take is the item's result.
            const rp = repOpen.current;
            if (rp && rp.kind === 'chart') {
              repOpen.current = null;
              void store.recordCompletion(repResult(rp.course, rp.id, score, Math.round(score * 12))).then(setProgress);
            }
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
      {route === 'chordfinder' && <ChordFinder lang={s.uiLang} settings={s} onBack={() => go(toolFrom.current)} />}
      {route === 'chordbuilder' && (
        // Chord & cadence builder: a cadence played through counts like a game (ratings, XP, path evidence).
        <ChordBuilder lang={s.uiLang} settings={s} course={s.activeCourse === 'guitar' ? 'guitar' : 'keys'} onBack={() => go(toolFrom.current)} onResult={(r) => void store.recordGame2('cadence-builder', r.score, undefined, r.detail).then(setProgress)} />
      )}
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
          key={drillsKey === null ? (drillsFamily ? `drills-fam-${drillsFamily.id}` : 'drills') : `drills-key-${drillsKey}`}
          openKey={drillsKey}
          openFamily={drillsFamily}
          lang={s.uiLang}
          settings={s}
          onSettings={updateSettings}
          items={progress.drillItems ?? {}}
          today={drillsToday}
          startToday={drillFrom.current === 'workout' && drillToday.current}
          onItem={(st) => void (drillWrites.current = drillWrites.current.then(() => store.setDrillItem(st)).then(setProgress).catch(() => {}))}
          onTake={(st, evs, xp, m) => {
            noteTake(xp, m?.verdict);
            creditTodayTake(st, progress.drillItems?.[st.itemId]?.activeMs ?? 0);
            const ct = checkTech.current;
            if (drillFrom.current === 'check' && ct && m?.verdict === 'clean') {
              // The checkpoint's technique part: a clean take at the level's target tempo during the part.
              const d = ct.drills.find((x) => x.itemId === st.itemId);
              const atT = (x: { at: string; bpm: number }) => x.at >= ct.t0 && !!d && x.bpm >= 0.95 * itemTargetBpm(d) - 1e-9;
              if ((st.passLog ?? []).some(atT) || (st.history ?? []).some(atT)) ct.clean.add(st.itemId);
            }
            if (drillFrom.current === 'taste') {
              // The taste's measured win: best note accuracy and the bars played with the band.
              const d = chartQueue.current?.find((x) => x.itemId === st.itemId) ?? chartQueue.current?.[0];
              tasteTake.current = { acc: Math.max(tasteTake.current.acc, st.ewma.acc), bars: tasteTake.current.bars + (d ? Math.round(d.beats / (d.meter || 4)) : 0) };
            }
            void (drillWrites.current = drillWrites.current.then(() => store.recordDrill(st, evs, xp, m)).then(setProgress).catch(() => {}));
          }}
          onBack={() => {
            if (drillFrom.current) return drillQueueDone(0, 0);
            void techResult('technique')?.then(setProgress);
            if (drillsKey !== null) {
              setDrillsKey(null);
              return backToRep(() => go('arcade'));
            }
            if (drillsFamily) {
              setDrillsFamily(null);
              return go('path');
            }
            go('arcade');
          }}
          onVoice={s.noSing ? undefined : () => (setVocalWarmup(false), go('vocal'))}
          queue={drillQueue}
          onQueueDone={drillQueueDone}
          atTarget={drillFrom.current === 'check'}
          startTest={drillFrom.current === 'test'}
          onTestDone={() => {
            drillFrom.current = null;
            void techResult('technique-test')?.then(setProgress);
            go('path');
          }}
        />
      )}
      {route === 'repertoire' && (
        <RepertoireScreen
          lang={s.uiLang}
          course={(s.activeCourse ?? 'ear') as CourseId}
          jazz={jazzFocusOn(s, (s.activeCourse ?? 'ear') as CourseId) ? 'focus' : jazzOpenIn(s, (s.activeCourse ?? 'ear') as CourseId) ? 'on' : 'off'}
          lessons={progress.lessons}
          history={progress.history}
          myCharts={s.myCharts}
          pathView={pathView}
          whyToday={(key) => (pathView.current?.step.id === key ? { en: 'New from the path', he: 'חדש מהמסלול' } : null)}
          onBack={() => go('arcade')}
          onLeavePiece={(from) => go(from === 'path' ? 'path' : from === 'teacher' ? 'friends' : 'home')}
          onAction={repAction}
          onPathNode={() => go('path')}
          onAdd={(src) => {
            repReturn.current = location.hash;
            if (src === 'score') return go('pieces');
            if (src === 'recording') return openRecording(null);
            chartInit.current = { id: newChartId(), title: s.uiLang === 'he' ? 'המהלך שלי' : 'My chart', text: '', style: 'swing', bpm: 110 };
            go('charts');
          }}
          onSheets={addLeadSheets}
          onTemplate={(id) => {
            const c = chartOfPiece({ kind: 'tpl', id }, s.uiLang, s.myCharts);
            if (!c) return;
            chartInit.current = { ...c, id: newChartId() } as MyChart;
            repReturn.current = location.hash;
            engineArgNext.current = `tpl:${id}`;
            go('charts');
          }}
          onSongbook={['keys', 'guitar', 'bass'].includes(s.activeCourse ?? 'ear') ? () => ((repReturn.current = location.hash), go('songs')) : undefined}
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
            backToRep(() => openRep({ tab: 1 }));
          }}
          songs
          onPieces={() => ((repReturn.current = location.hash), go('pieces'))}
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
      {(['chord', 'note', 'fretboard', 'interval', 'keysig', 'progression', 'voicing', 'scale', 'standard'] as const).map((mode) => {
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
      {(['flight', 'nametune', 'tuneup', 'highway', 'melodypuzzle', 'pitchmemory', 'peakhunter', 'reharm', 'transcribe', 'bhtime', 'riffecho', 'polylock'] as const).map((g) => {
        if (route !== g) return null;
        const key = `game:${g === 'melodypuzzle' ? 'melody-puzzle' : g}`;
        const title = GAMES2.find((x) => x.id === g)![s.uiLang][0];
        const props = {
          lang: s.uiLang,
          settings: s,
          saved: loadSlot<unknown>(key)?.data ?? null,
          onSave: (st: unknown | null) => (st ? saveSlot(key, { title, route: g, done: 0, total: 0, data: st }) : clearSlot(key)),
          // Pitch Memory is a Today card (AUDIT-GAMES §9): back goes home.
          onExit: () => go(g === 'pitchmemory' ? 'home' : 'arcade'),
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
        if (g === 'highway') return <Highway key={g} {...props} onKitSounds={(on) => s.drumKit && updateSettings({ drumKit: { ...s.drumKit, sounds: on } })} />;
        if (g === 'melodypuzzle') return <MelodyPuzzle key={g} {...props} />;
        if (g === 'peakhunter') return <PeakHunter key={g} {...props} />;
        if (g === 'reharm') return <ReharmSpot key={g} {...props} />;
        if (g === 'transcribe') return <TranscribeRace key={g} {...props} />;
        if (g === 'bhtime') return <BhInTime key={g} {...props} />;
        if (g === 'riffecho') return <RiffEcho key={g} {...props} />;
        if (g === 'polylock') return <PolyLock key={g} {...props} />;
        return <PitchMemory key={g} {...props} log={progress.pitchMemory ?? []} onLog={(e) => void store.recordGame2('pitchmemory', Math.max(0, 100 - Math.abs(e.cents)), e).then(setProgress)} />;
      })}
      {(['playback', 'voicingsprint', 'changerace', 'walkchanges', 'rootsear', 'harmonyhold', 'singinterval', 'kitread', 'namegroove'] as const).map((g) => {
        // 0.76 (GAMES_TIERS_PLAN §3): instrument, voice and drum games — tiers, XP, ratings, board like every game.
        if (route !== g) return null;
        const key = `game:${g}`;
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
        if (g === 'playback') return <PlayItBack key={g} {...props} />;
        if (g === 'rootsear') return <RootsByEar key={g} {...props} />;
        if (g === 'voicingsprint') return <VoicingSprint key={g} {...props} />;
        if (g === 'changerace') return <ChordChangeRace key={g} {...props} />;
        if (g === 'walkchanges') return <WalkTheChanges key={g} {...props} />;
        if (g === 'harmonyhold') return <HarmonyHold key={g} {...props} />;
        if (g === 'singinterval') return <SingInterval key={g} {...props} />;
        if (g === 'kitread') return <KitRead key={g} {...props} />;
        return <NameGroove key={g} {...props} />;
      })}
      {(['bordercontrol', 'whichbrother', 'runcatcher', 'compcaller', 'elevator', 'guidetone', 'call5432', 'enclosure', 'crossword', 'holdnote', 'thirdjump', 'darkside', 'whichpair', 'mirror', 'tonnetz'] as const).map((g) => {
        // AUDIT-GAMES §4.2 new games: tiers, XP, ratings, boards, key mastery, path and workout steps.
        if (route !== g) return null;
        const key = `game:${g}`;
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
        if (g === 'bordercontrol') return <BorderControl key={g} {...props} />;
        if (g === 'whichbrother') return <WhichBrother key={g} {...props} />;
        if (g === 'runcatcher') return <RunCatcher key={g} {...props} />;
        if (g === 'compcaller') return <CompCaller key={g} {...props} />;
        if (g === 'elevator') return <Elevator key={g} {...props} />;
        if (g === 'guidetone') return <GuideToneRunner key={g} {...props} />;
        if (g === 'call5432') return <Call5432 key={g} {...props} />;
        if (g === 'enclosure') return <EnclosureTarget key={g} {...props} />;
        if (g === 'crossword') return <ChangesCrossword key={g} {...props} />;
        if (g === 'thirdjump') return <ThirdJump key={g} {...props} />;
        if (g === 'darkside') return <DarkSide key={g} {...props} />;
        if (g === 'whichpair') return <WhichPair key={g} {...props} />;
        if (g === 'mirror') return <MirrorGame key={g} {...props} />;
        if (g === 'tonnetz') return <Tonnetz key={g} {...props} />;
        return <HoldTheNote key={g} {...props} />;
      })}
      {route === 'euclid' &&
        (() => {
          // Owner 2026-11-19: Euclid — tiers, XP, ratings, boards, badges, path, bonus and workout steps.
          const g = 'euclid';
          const key = `game:${g}`;
          const title = GAMES2.find((x) => x.id === g)![s.uiLang][0];
          return (
            <EuclidGame
              lang={s.uiLang}
              settings={s}
              saved={loadSlot<unknown>(key)?.data ?? null}
              onSave={(st: unknown | null) => (st ? saveSlot(key, { title, route: g, done: 0, total: 0, data: st }) : clearSlot(key))}
              onExit={() => go('arcade')}
              onResult={(r: { score: number; detail?: unknown }) => {
                void store.recordGame2(g, r.score, undefined, (r.detail ?? {}) as Record<string, unknown>).then(setProgress);
                noteGameBest(g, r.score, r.detail);
                noteGameStep(g, r.score, r.detail);
              }}
              best={progress.bests?.[g]}
              tier={tierFor(g)}
            />
          );
        })()}
      {(['staffrunner', 'rootcatch', 'strumchange', 'rebound', 'singback'] as const).map((g) => {
        // AUDIT-7 hole #14: the beginner game per instrument (tiers, XP, ratings, boards, key mastery, path, workout).
        if (route !== g) return null;
        const key = `game:${g}`;
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
        if (g === 'staffrunner') return <StaffRunner key={g} {...props} />;
        if (g === 'rootcatch') return <RootCatcher key={g} {...props} />;
        if (g === 'strumchange') return <StrumChanges key={g} {...props} />;
        if (g === 'rebound') return <ReboundBall key={g} {...props} />;
        return <SingBack key={g} {...props} />;
      })}
      {route === 'gameboard' && (
        <GameBoard
          lang={s.uiLang}
          progress={progress}
          games={COURSE_GAMES[s.activeCourse ?? 'ear']}
          titleOf={(g) => GAMES2.find((x) => x.id === g)?.[s.uiLang][0] ?? GAME_TITLES[g]?.[s.uiLang] ?? g}
          tierFor={tierFor}
          signedIn={!!user}
          canShare={!!user && effectivePrivacy(s.privacy, s.birthYear).canShareOutside}
          onBack={() => go('arcade')}
        />
      )}
      {(route === 'groove-echo' || route === 'odd-echo') && (
        // AUDIT-GAMES §10: Odd-meter Echo is Groove Echo's second mode; each mode records under its own id.
        <GrooveEchoModes
          key={route}
          initialOdd={route === 'odd-echo'}
          lang={s.uiLang}
          settings={s}
          onExit={() => go('arcade')}
          onResult={(g, r) => {
            void store.recordGame2(g, r.score, undefined, (r.detail ?? {}) as Record<string, unknown>).then(setProgress);
            noteGameBest(g, r.score, r.detail);
            noteGameStep(g, r.score, r.detail);
          }}
          bestOf={(g) => progress.bests?.[g]}
          tierOf={(g) => tierFor(g)}
          onKit={(drumKit) => updateSettings({ drumKit })}
        />
      )}
      {(['land', 'time-lock', 'ghost-control', 'rudiment-rush'] as const).map((g) => {
        // Drum games P1 (DRUMS_NICHE_PLAN §3): measured takes on the kit, tiers / XP / path like every game.
        if (route !== g) return null;
        return (
          <DrumGame
            key={g}
            game={g}
            lang={s.uiLang}
            settings={s}
            onExit={() => go('arcade')}
            onResult={(r: { score: number; detail?: unknown }) => {
              void store.recordGame2(g, r.score, undefined, (r.detail ?? {}) as Record<string, unknown>).then(setProgress);
              noteGameBest(g, r.score, r.detail);
              noteGameStep(g, r.score, r.detail);
            }}
            best={progress.bests?.[g]}
            tier={tierFor(g)}
            onKit={(drumKit) => updateSettings({ drumKit })}
            bestBpm={g === 'rudiment-rush' ? progress.counts?.rushBpm : undefined}
          />
        );
      })}
      {route === 'groove-off' && (
        // Groove-off (DRUMS_NICHE_PLAN §3): the drum duel; its tier is the drum level from the ladder.
        <GrooveOff
          lang={s.uiLang}
          settings={s}
          items={progress.drillItems ?? {}}
          signedIn={!!user}
          onExit={() => go('arcade')}
          onResult={(r) => {
            void store.recordGame2('groove-off', r.score, undefined, r.detail).then(setProgress);
            noteGameBest('groove-off', r.score, r.detail);
          }}
        />
      )}
      {route === 'studio' && (
        <Suspense fallback={<main className="panel-screen"><p className="stage-msg">{t.avatarLoading}</p></main>}>
          <AvatarStudio t={t} settings={s} onBack={() => go('home')} onSave={(p) => { updateSettings({ avatars: p }); go('home'); }} />
        </Suspense>
      )}
      {route === 'ghost' && <GhostScreen t={t} settings={s} progress={progress} onBack={() => go('arcade')} onProgress={setProgress} />}
      {route === 'classes' && <ClassesScreen t={t} settings={s} user={user} onBack={() => go('home')} onOpenLesson={(id) => openAssignment(id)} onOpenItem={openAssignItem} />}
      {logOpen && <PracticeLogSheet lang={s.uiLang} progress={progress} onSave={(k, m, x, note) => void saveLog(k, m, x, note)} onClose={() => setLogOpen(false)} />}
      {streakOpen && (
        <StreakSheet t={t} st={gems.streak} gems={gems.balance} today={localDay(new Date())} lang={s.uiLang} onBuy={buy} purchases={s.purchases ?? []} frame={s.avatarFrame} onBuyCosmetic={buyCosmetic} onFrame={(avatarFrame) => updateSettings({ avatarFrame })} onClose={() => setStreakOpen(false)} />
      )}
      {route === 'drone' && <DroneScreen t={t} settings={s} onBack={() => go(toolFrom.current)} />}
      {route === 'perform' && <PerformScreen t={t} settings={s} onBack={() => go('home')} onProgress={setProgress} />}
      {route === 'achievements' && <AchievementsScreen t={t} progress={progress} extra={{ bestLeague: s.bestLeague, learned: learnedCount(s), lessonsTotal: Object.keys(MINI_LESSONS).length }} onBack={() => go('skills')} />}
      {route === 'singalong' && <SingAlongScreen t={t} settings={s} onBack={() => go('vocal')} />}
      {route === 'vocal' && (
        <VocalScreen
          key={vocalTest ? 'test' : vocalWarmup ? 'warmup' : `home-${vocalLevel ?? ''}`}
          startLevel={vocalLevel}
          startTest={vocalTest}
          t={t}
          settings={s}
          progress={progress}
          onSettings={updateSettings}
          onProgress={(p) => {
            setProgress(p);
            notePathResult(p);
            // A sung taste: its first measured result is the course's first win.
            const tv = tasteVocal.current;
            if (tv) {
              const r = [...p.history].reverse().find((x) => x.completedAt >= tv.since && x.lessonId.startsWith('vocal') && x.lessonId.endsWith(String(tv.level)));
              if (r) {
                tasteVocal.current = null;
                updateCourseStart((m) => markTasteDone(m, tv.course, { kind: 'lesson', right: r.firstTry, total: r.total, xp: r.xp }, r.completedAt));
                toolFrom.current = 'coursestart';
              }
            }
            // Day 3 sung: the whole song's first measured result is the moment's result.
            const rv = realVocal.current;
            if (rv) {
              const r = [...p.history].reverse().find((x) => x.completedAt >= rv.since && x.lessonId.startsWith('vocal') && x.lessonId.endsWith(String(rv.level)));
              if (r) {
                realVocal.current = null;
                updateCourseStart((m) => markRealDone(m, rv.course, { kind: 'lesson', right: r.firstTry, total: r.total, xp: r.xp }, r.completedAt));
              }
            }
          }}
          onBack={() => {
            realVocal.current = null;
            tasteVocal.current = null;
            go(toolFrom.current);
          }}
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
        }} onResult={(r) => {
          // AUDIT-GAMES §9: the duel records like every game (the device owner's side): XP, rating, tier, board.
          void store.recordGame2('duel', r.score, undefined, r.detail).then(setProgress);
          noteGameBest('duel', r.score, r.detail);
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

/** The month's area challenge only in a course that has that area (owner 2026-11-21: "Voice" in Piano). */
function challengeInCourse(course: CourseId): boolean {
  return COURSE_AREAS[course].includes(challengeFor(new Date().toISOString().slice(0, 7)).area as DomainId);
}
