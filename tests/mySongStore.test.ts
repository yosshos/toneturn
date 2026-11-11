import { describe, expect, it } from 'vitest';
import { cleanName, clearMySession, loadMySession, memorySongStore, roomFor, saveMySession, songName, type SessionKV, type StoredSong } from '../src/storage/mySongs';

const song = (id: string, size = 1000, addedAt = '2026-11-11T10:00:00Z'): StoredSong => ({ id, name: id, addedAt, duration: 30, size, type: 'audio/mpeg', analysis: null, blob: new Blob([new Uint8Array(4)]) });

describe('My songs storage (SPEC-MY-SONG §2)', () => {
  it('put, list newest first without the audio, get, rename, score, delete', async () => {
    const st = memorySongStore();
    expect((await st.put(song('a', 10, '2026-11-10T00:00:00Z'))).ok).toBe(true);
    await st.put(song('b', 10, '2026-11-11T00:00:00Z'));
    const list = await st.list();
    expect(list.map((s) => s.id)).toEqual(['b', 'a']);
    expect('blob' in list[0]).toBe(false);
    expect((await st.get('a'))?.blob).toBeInstanceOf(Blob);
    expect(await st.update('a', { name: 'Autumn take', scores: { bass: { score: 0.8, at: 'x' } } })).toBe(true);
    expect((await st.get('a'))?.name).toBe('Autumn take');
    expect((await st.get('a'))?.scores?.bass?.score).toBe(0.8);
    expect(await st.update('zzz', { name: 'x' })).toBe(false);
    await st.remove('a');
    expect((await st.list()).map((s) => s.id)).toEqual(['b']);
    expect(await st.get('a')).toBeNull();
  });

  it('a full device refuses with a quota reason (the screen asks to delete a song)', async () => {
    const st = memorySongStore(2500);
    expect((await st.put(song('a', 1000))).ok).toBe(true);
    expect((await st.put(song('b', 1000))).ok).toBe(true);
    expect(await st.put(song('c', 1000))).toEqual({ ok: false, reason: 'quota' });
    await st.remove('a');
    expect((await st.put(song('c', 1000))).ok).toBe(true);
  });

  it('room on the device: ok, low, full', () => {
    expect(roomFor(0, 1e9, 1e6)).toBe('ok');
    expect(roomFor(0.96e9, 1e9, 1e6)).toBe('low');
    expect(roomFor(0.999e9, 1e9, 5e6)).toBe('full');
    expect(roomFor(0, 0, 5e6)).toBe('ok');
  });

  it('names from files and typed names', () => {
    expect(songName('my_take_03.m4a')).toBe('my take 03');
    expect(songName('.mp3')).toBe('My song');
    expect(songName('x'.repeat(100) + '.wav').length).toBe(60);
    expect(cleanName('   ', 'Old')).toBe('Old');
    expect(cleanName('  New   name ', 'Old')).toBe('New name');
  });

  it('a half-done session is kept per course and resumes', () => {
    const m = new Map<string, string>();
    const kv: SessionKV = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
    const s = { songId: 'a', sessionId: 'x', section: 2, speed: 0.75, takes: [{ section: 0, score: 0.9, timing: 0.9, pitch: null, verdict: 'clean' as const, speed: 1 }], startedAt: 'now' };
    saveMySession('drums', s, kv);
    expect(loadMySession('drums', kv)).toEqual(s);
    expect(loadMySession('keys', kv)).toBeNull();
    clearMySession('drums', kv);
    expect(loadMySession('drums', kv)).toBeNull();
    m.set('toneturn.mysong.bass', '{broken');
    expect(loadMySession('bass', kv)).toBeNull();
  });
});
