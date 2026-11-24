// Owner 2026-11-19: every tester starts over once — progress goes, the person, the device and their own material stay.
import { beforeEach, describe, expect, it } from 'vitest';
import { currentResults, freshStartIfNeeded, keepOnly, PROGRESS_CUTOFF, PROGRESS_EPOCH, remoteSettingsForEpoch } from '../src/storage/freshStart';
import { DEFAULT_SETTINGS, emptyProgress, type LessonResult, type Progress, type Settings } from '../src/storage/progress';

class MemLS {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const result = (completedAt: string): LessonResult => ({ lessonId: 'x', lessonVersion: 1, sessionId: completedAt, completedAt, firstTry: 1, total: 1, xp: 5, missed: [] });

function memStore(settings: Settings, progress: Progress) {
  const st = { settings, progress };
  return {
    st,
    loadSettings: async () => st.settings,
    saveSettings: async (s: Settings) => void (st.settings = s),
    loadProgress: async () => st.progress,
    saveProgress: async (p: Progress) => void (st.progress = p),
  };
}

let ls: MemLS;
beforeEach(() => {
  ls = new MemLS();
  (globalThis as unknown as { localStorage: MemLS }).localStorage = ls;
});

describe('fresh start for every tester', () => {
  it('a used device drops progress and path state, keeps language, profile, calibration and own material', async () => {
    const old: Settings = { ...DEFAULT_SETTINGS, progressEpoch: undefined, uiLang: 'he', nickname: 'Yos', midiLatencyMs: 42, firstUseAt: '2026-11-01T10:00:00Z', activeCourse: 'jazz' as never, goal: 'jazz' } as Settings;
    const s = memStore(old, { ...emptyProgress(), history: [result('2026-11-10T10:00:00Z')], streak: { count: 9, lastDay: '2026-11-10' }, xp: 500 });
    ls.setItem('toneturn.resume.v2', '{}');
    ls.setItem('toneturn.headphones', '1');
    expect(await freshStartIfNeeded(s)).toBe(true);
    expect(s.st.progress.history).toEqual([]);
    // the streak stays (owner 2026-11-24): its count and its practice days, nothing else
    expect(s.st.progress.streak).toEqual({ count: 9, lastDay: '2026-11-10' });
    expect(s.st.progress.stats?.days).toContain('2026-11-10');
    expect(s.st.progress.xp).toBe(0);
    expect(s.st.settings.uiLang).toBe('he');
    expect(s.st.settings.nickname).toBe('Yos');
    expect(s.st.settings.midiLatencyMs).toBe(42);
    expect(s.st.settings.activeCourse).not.toBe('jazz');
    expect(s.st.settings.goal).not.toBe('jazz');
    expect(s.st.settings.firstUseAt).toBe(DEFAULT_SETTINGS.firstUseAt);
    expect(s.st.settings.progressEpoch).toBe(PROGRESS_EPOCH);
    expect(ls.getItem('toneturn.resume.v2')).toBeNull();
    expect(ls.getItem('toneturn.headphones')).toBe('1');
    // once only
    s.st.progress = { ...emptyProgress(), history: [result('2026-11-20T10:00:00Z')] };
    expect(await freshStartIfNeeded(s)).toBe(false);
    expect(s.st.progress.history).toHaveLength(1);
  });
  it('a new device is left alone', async () => {
    const s = memStore({ ...DEFAULT_SETTINGS }, emptyProgress());
    expect(await freshStartIfNeeded(s)).toBe(false);
    expect(ls.getItem('toneturn.epoch')).toBe(PROGRESS_EPOCH);
  });
  it('old results and old cloud settings cannot bring the old progress back', () => {
    expect(currentResults([result('2026-11-10T10:00:00Z'), result('2026-12-01T10:00:00Z')]).map((r) => r.completedAt)).toEqual(['2026-12-01T10:00:00Z']);
    expect(PROGRESS_CUTOFF.startsWith(PROGRESS_EPOCH)).toBe(true);
    const stale = remoteSettingsForEpoch({ uiLang: 'he', activeCourse: 'jazz', pathFacts: {} } as unknown as Partial<Settings>);
    expect(stale).toEqual({ uiLang: 'he' });
    const fresh = { uiLang: 'he', activeCourse: 'jazz', progressEpoch: PROGRESS_EPOCH } as unknown as Partial<Settings>;
    expect(remoteSettingsForEpoch(fresh)).toEqual(fresh);
    expect(keepOnly(null)).toEqual({});
  });
});

describe('first visit language', () => {
  it('follows the phone: Hebrew when Hebrew is among the preferred languages', async () => {
    const { browserLang } = await import('../src/storage/progress');
    expect(browserLang({ languages: ['he-IL', 'en-US'] })).toBe('he');
    expect(browserLang({ languages: ['en-US', 'iw'] })).toBe('he');
    expect(browserLang({ languages: ['en-GB'], language: 'en-GB' })).toBe('en');
    expect(browserLang(undefined)).toBe('en');
  });
});
