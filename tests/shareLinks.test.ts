import { describe, expect, it } from 'vitest';
import { appHome, FRIEND_CODE_RE, friendFromHash, friendInviteText, friendLink, inviteTail, withLink } from '../src/engine/shareLinks';
import { shareText as puzzleShare } from '../src/engine/progPuzzle';
import { shareText as encoreShare } from '../src/engine/encore/community';

const HOME = appHome({ origin: 'https://7sense.netlify.app', pathname: '/' });

describe('share links: every share carries a way back into the app', () => {
  it('a friend link round-trips its code', () => {
    const link = friendLink(HOME, 'K7Q2MX');
    expect(link).toBe('https://7sense.netlify.app/#/f/K7Q2MX');
    expect(friendFromHash(new URL(link).hash)).toBe('K7Q2MX');
    expect(friendFromHash('#f/k7q2mx')).toBe('K7Q2MX');
  });
  it('rejects codes the server never makes', () => {
    for (const h of ['#/f/K7Q2M', '#/f/K7Q2MXX', '#/f/O7Q2MX', '#/f/K1Q2MX', '#/c/K7Q2MXAB', '']) expect(friendFromHash(h)).toBeNull();
    expect(FRIEND_CODE_RE.test('ABCDEF')).toBe(true);
    expect(FRIEND_CODE_RE.test('ABCDEL')).toBe(false);
  });
  it('the invite names the app, who invites, and keeps the code readable', () => {
    for (const lang of ['he', 'en'] as const) {
      const s = friendInviteText('Dana', 'K7Q2MX', lang);
      expect(s).toContain('Dana');
      expect(s).toContain('K7Q2MX');
      expect(s).toMatch(lang === 'he' ? /חוש ה־7/ : /The 7th Sense/);
      expect(friendInviteText('  ', 'K7Q2MX', lang)).not.toMatch(/^\s|undefined|מ־:/);
    }
  });
  it('the link goes last, on its own line (the chat app turns it into the preview card)', () => {
    const s = withLink(`${puzzleShare(12, [['right', 'right', 'right', 'right']], 'en')}\n\n${inviteTail('en')}`, HOME);
    const lines = s.split('\n');
    expect(lines.at(-1)).toBe(HOME);
    expect(lines.at(-2)).toMatch(/The 7th Sense/);
  });
  it('the Encore share texts name the app', () => {
    expect(encoreShare({ title: 'Blues lick', bpm: 120, keys: 12, lang: 'en' })).toMatch(/The 7th Sense/);
    expect(encoreShare({ title: 'Blues lick', bpm: 120, keys: 12, lang: 'he', beat: { bpm: 130, keys: 6 } })).toMatch(/החוש ה־7|בחוש ה־7/);
  });
});
