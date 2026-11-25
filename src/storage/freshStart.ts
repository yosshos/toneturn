// A fresh start for every tester (owner, 2026-11-19): before launch there are only testers, and the path changed
// enough that their old progress no longer fits it. Once per epoch, each device drops its progress and the
// onboarding, path and course state, and keeps what belongs to the person or the device: language, account and
// profile, audio / MIDI calibration and sound choices, recordings, own charts and drills. Results finished before the
// cutoff are ignored when they come back from the cloud, and cloud settings from before the epoch only bring back
// the kept keys — so an old device or an old cloud copy cannot restore the old progress.
import { DEFAULT_SETTINGS, DEVICE_SETTINGS, emptyProgress, migrateSettings, practiceDays, PROGRESS_EPOCH, withoutDeviceSettings, type LessonResult, type Progress, type Settings } from './progress';

export { PROGRESS_EPOCH };
/** Results completed before this moment belong to the old path. */
// round 2 (owner 2026-11-24): the daily session, menus and screens changed; testers start again as new players,
// keeping their streak
export const PROGRESS_CUTOFF = '2026-11-24T18:45:00Z';
const EPOCH_KEY = 'toneturn.epoch';

/** Settings that survive a fresh start: the person, the device and their own material — never progress. */
export const KEEP_SETTINGS: readonly (keyof Settings)[] = [...new Set<keyof Settings>([
  // every device key (calibration, MIDI / mic / output choices and their per-device copies) — one list, progress.ts
  ...DEVICE_SETTINGS,
  'locale', 'a4', 'uiLang','inputLang', 'outputLang', 'keepAwake', 'naming', 'voiceGender', 'voices', 'reducedMotion', 'voiceConsent', 'reminderHour', 'seenVersion',
  'tapLatencyMs', 'midiLatencyMs', 'midiBiasMs', 'micLatencyMs', 'midiInput', 'midiDevice', 'midiOctave', 'midiPedalInvert', 'midiGuitarChannels', 'midiBendRange', 'midiSound', 'midiVolume', 'midiCurve',
  'audioOutput', 'computerKeys', 'micDeviceId', 'volume', 'cues', 'ttsRate', 'haptics', 'textScale', 'timedScoring',
  'nickname', 'hideNickPrompt', 'country', 'avatarIcon', 'avatarColor', 'avatarPhoto', 'privacy', 'birthYear', 'avatarFrame', 'purchases',
  'leftHanded', 'tuning', 'bassTuning', 'headphones', 'tunerPreset', 'metronome', 'drumKit', 'recalSnooze',
  'mixer', 'sound', 'guitarVoice', 'pianoDetail', 'soundQuality', 'audioLatency', 'organReg', 'organFast', 'epTremolo', 'bandDrums', 'droneSound', 'theme', 'cleanView', 'vibratoStyle',
  'keepTakes', 'keepTakeNotes', 'syncTakeNotes', 'myCharts', 'customDrills', 'lickBook', 'ownFingering', 'workoutTemplates', 'shareStats',
])];

/** Device stores that only hold derived progress (the player model, confusions, analysis, AI cards). */
const PROGRESS_DBS = ['toneturn-profile', 'toneturn-confusion', 'toneturn-analysis', 'toneturn-ai'];
/** localStorage keys that hold progress or a half-finished flow of the old path. */
const PROGRESS_KEYS = [
  'toneturn.resume.v2', 'toneturn.placement.resume.v1', 'toneturn.intake.draft.v1', 'toneturn.practice', 'toneturn.practice.v1', 'toneturn.practice.pending',
  'toneturn.pace', 'toneturn.slots.v1', 'toneturn.highway.best.v1', 'toneturn.aiWeekly.v1', 'toneturn.lessonTopic', 'toneturn.drilltopic', 'toneturn.voiceTest.v1',
  'toneturn.workout.minutes', 'toneturn.feedSnap', 'toneturn.feedPosted', 'toneturn.diary.draft',
  'toneturn.workoutAreaDays', 'toneturn.workoutCtx', 'toneturn.stepsInWorkout', 'toneturn.waitAsked', 'toneturn.todayKeys', 'toneturn.matrixSeen', 'toneturn.weekGroup',
  // practice runs kept for the day (storage/coachRun.ts)
  'toneturn.coachRun.v1', 'toneturn.queueRun.v1', 'toneturn.drillsOpen.v1',
];

export function keepOnly(s: Partial<Settings> | null | undefined): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (!s) return out;
  for (const k of KEEP_SETTINGS) if (s[k] !== undefined) (out as Record<string, unknown>)[k] = s[k];
  return out;
}

/** Results from the old path are left out of every rebuild. */
export const currentResults = (h: LessonResult[]): LessonResult[] => h.filter((r) => r.completedAt >= PROGRESS_CUTOFF);

/** Cloud settings saved before this epoch bring back only the kept keys — and never this device's own keys (a cloud
 *  copy holds another device's, or an older, calibration and MIDI sound choice). */
export function remoteSettingsForEpoch(remote: Partial<Settings>): Partial<Settings> {
  return withoutDeviceSettings(remote.progressEpoch === PROGRESS_EPOCH ? remote : keepOnly(remote));
}

interface FreshStore {
  loadSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  loadProgress(): Promise<Progress>;
  saveProgress(p: Progress): Promise<void>;
}

function ls(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** An empty progress that keeps the streak (owner 2026-11-24): the practice days and the streak count, nothing else. */
export function keepStreak(old: Progress): Progress {
  const p = emptyProgress();
  const days = [...practiceDays(old)].sort().slice(-800);
  return { ...p, streak: old.streak ?? p.streak, stats: { ...(p.stats ?? { goodSessions: 0, xpByDay: {} }), days, goodSessions: 0, xpByDay: {} } };
}

/** Runs once per device per epoch, before the app reads settings or progress. Returns true when it wiped. */
export async function freshStartIfNeeded(store: FreshStore): Promise<boolean> {
  const l = ls();
  if (!l) return false;
  let seen: string | null = null;
  try {
    seen = l.getItem(EPOCH_KEY);
  } catch {
    return false;
  }
  if (seen === PROGRESS_EPOCH) return false;
  // Automated browsers (the e2e suite seeds its own state) are left alone unless a test asks for the fresh start.
  const auto = typeof navigator !== 'undefined' && navigator.webdriver === true;
  if (auto && !l.getItem('toneturn.e2e.fresh')) return false;
  const [settings, progress] = await Promise.all([store.loadSettings(), store.loadProgress()]);
  const used = progress.history.length > 0 || Boolean(settings.firstUseAt) || Boolean(settings.intake) || Boolean(settings.activeCourse);
  if (used) {
    await store.saveSettings(migrateSettings({ ...DEFAULT_SETTINGS, ...keepOnly(settings), progressEpoch: PROGRESS_EPOCH }));
    await store.saveProgress(keepStreak(progress));
    for (const k of PROGRESS_KEYS) {
      try {
        l.removeItem(k);
      } catch {
        /* storage blocked */
      }
    }
    if (typeof indexedDB !== 'undefined') for (const db of PROGRESS_DBS) try { indexedDB.deleteDatabase(db); } catch { /* ignore */ }
  } else if (settings.progressEpoch !== PROGRESS_EPOCH) {
    await store.saveSettings({ ...settings, progressEpoch: PROGRESS_EPOCH });
  }
  try {
    l.setItem(EPOCH_KEY, PROGRESS_EPOCH);
  } catch {
    /* storage blocked */
  }
  return used;
}
