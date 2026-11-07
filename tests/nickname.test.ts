import { describe, expect, it } from 'vitest';
import { checkNickname, isOffensive, MUSIC_WORDS, NICK_MAX, PLAYFUL_NOUNS, suggestNicknames } from '../src/engine/nickname';

describe('nicknames (SPEC-SOCIAL §1.1)', () => {
  it('suggests distinct, valid, musical names with a number', () => {
    const s = suggestNicknames(8, 42);
    expect(new Set(s).size).toBe(8);
    for (const n of s) {
      expect(checkNickname(n).ok).toBe(true);
      expect(n.length).toBeLessThanOrEqual(NICK_MAX);
      expect(/\d+$/.test(n)).toBe(true);
      expect(MUSIC_WORDS.some((w) => n.startsWith(w))).toBe(true);
    }
  });
  it('is reproducible by seed and skips taken names', () => {
    expect(suggestNicknames(4, 7)).toEqual(suggestNicknames(4, 7));
    const first = suggestNicknames(1, 7)[0].toLowerCase();
    expect(suggestNicknames(4, 7, (n) => n === first).map((x) => x.toLowerCase())).not.toContain(first);
  });
  it('every musical word + noun pair is clean', () => {
    for (const w of MUSIC_WORDS) for (const n of PLAYFUL_NOUNS) expect(isOffensive(`${w}${n}1`), `${w}${n}`).toBe(false);
  });
  it('rules: length, characters', () => {
    expect(checkNickname('ab')).toEqual({ ok: false, why: 'short' });
    expect(checkNickname('a'.repeat(21))).toEqual({ ok: false, why: 'long' });
    expect(checkNickname('דנה123')).toEqual({ ok: false, why: 'chars' });
    expect(checkNickname('Coda Fox')).toEqual({ ok: false, why: 'chars' });
    expect(checkNickname('Coda_Fox_7')).toEqual({ ok: true });
  });
  it('blocks offensive names, also disguised', () => {
    for (const bad of ['FuckYou1', 'Sh1tHead', 'xXbitchXx', 'KusEmak', 'Sharmuta9', 'PuTaMadre', 'B1yat', 'nazi_88'])
      expect(isOffensive(bad), bad).toBe(true);
  });
  it('keeps innocent names that contain short roots or long-root look-alikes', () => {
    for (const ok of ['Arsenal7', 'Kusama3', 'SextetOwl', 'AnalogFox', 'SkillfulCrane', 'PeacockPiano', 'HomophonicLark', 'Dickens9'])
      expect(isOffensive(ok), ok).toBe(false);
  });
});
