import { describe, expect, it } from 'vitest';
import { effectivePrivacy, isYoung } from '../src/engine/privacy';

const now = new Date('2026-11-07T12:00:00Z');

describe('privacy & friends (SPEC-SOCIAL §2, §8)', () => {
  it('default = friends only', () => {
    const e = effectivePrivacy(undefined, null, false, now);
    expect(e.photo).toBe('friends');
    expect(e.challenges).toBe('friends');
    expect(e.onBoards).toBe('nickname');
    expect(e.dontDisturb).toBe(true);
  });
  it('presets and advanced overrides', () => {
    expect(effectivePrivacy({ preset: 'open' }, null, false, now).photo).toBe('everyone');
    expect(effectivePrivacy({ preset: 'private' }, null, false, now).onBoards).toBe('anonymous');
    expect(effectivePrivacy({ preset: 'friends', photo: 'everyone' }, null, false, now).photo).toBe('everyone');
  });
  it('young-player mode caps everything', () => {
    expect(isYoung(2016, false, now)).toBe(true);
    expect(isYoung(2010, false, now)).toBe(false);
    expect(isYoung(2012, true, now)).toBe(true); // 13 in the EU → still young (16)
    const e = effectivePrivacy({ preset: 'open' }, 2016, false, now);
    expect(e.photo).toBe('none');
    expect(e.canUploadPhoto).toBe(false);
    expect(e.canShareOutside).toBe(false);
    expect(e.challenges).toBe('friends');
    expect(e.friendRequests).toBe('code');
    expect(e.quickMessages).toBe('friends');
  });
});
