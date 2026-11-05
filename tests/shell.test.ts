import { describe, expect, it } from 'vitest';
import { CHANGELOG, compareVersions, unseenChanges } from '../src/version';
import { weeklyBoard, type FriendRow } from '../src/cloud/social';
import { migrateSettings } from '../src/storage/progress';
import pkg from '../package.json';

describe('versions', () => {
  it('compares semantic versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.4.2', '0.5.0')).toBe(-1);
  });
  it('changelog is newest-first and its top entry matches package.json', () => {
    for (let i = 1; i < CHANGELOG.length; i++) expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(1);
    expect(CHANGELOG[0].version).toBe(pkg.version);
    for (const c of CHANGELOG) expect(c.he.length).toBe(c.en.length);
  });
  it('shows only entries newer than the last seen version; nothing on first run', () => {
    expect(unseenChanges(null)).toEqual([]);
    expect(unseenChanges('0.3.0').map((c) => c.version)).toEqual(['0.23.0', '0.22.0', '0.21.0', '0.20.0', '0.19.0', '0.18.0', '0.17.0', '0.16.0', '0.15.0', '0.14.0', '0.13.0', '0.12.0', '0.11.0', '0.10.0', '0.9.0', '0.8.0', '0.7.1', '0.7.0', '0.6.0', '0.5.0', '0.4.0']);
    expect(unseenChanges(pkg.version)).toEqual([]);
  });
  it('settings gain reminder hour + seen version with defaults', () => {
    const s = migrateSettings({ version: 2, uiLang: 'he' } as never);
    expect(s.reminderHour).toBe(19);
    expect(s.seenVersion).toBeNull();
  });
});

describe('friends weekly board', () => {
  const row = (name: string, relation: FriendRow['relation'], week: number | null, streak = 0): FriendRow => ({
    user_id: name,
    name,
    relation,
    week_xp: week,
    total_xp: 0,
    streak,
    lessons_done: 0,
    best_melody: null,
    best_rhythm: null,
    last_active: null,
  });
  it('ranks me and accepted friends by weekly XP, then streak; pending excluded', () => {
    const b = weeklyBoard([row('Me', 'me', 40), row('Ann', 'friend', 70), row('Bo', 'friend', 40, 5), row('Pen', 'incoming', null), row('Out', 'outgoing', null)]);
    expect(b.map((r) => r.name)).toEqual(['Ann', 'Bo', 'Me']);
  });
});
