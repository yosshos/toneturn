// Games audit leftovers: Sing Interval's title fits a card (it took three lines at 320 px), and the Arcade cards carry no
// emoji `icon` (owner rule: no emoji anywhere; the cards draw their glyph from GAME_GLYPH).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

// Arcade.tsx needs a browser to import; read its GAMES2 list from the source.
const SRC = readFileSync('src/ui/Arcade.tsx', 'utf8');
const AT = SRC.indexOf('export const GAMES2:');
const OPEN = SRC.indexOf('}[] = [', AT);
const LIST = SRC.slice(OPEN, SRC.indexOf('\n];', OPEN));
const pair = (l: string, k: 'en' | 'he'): [string, string] => {
  const m = new RegExp(`${k}: \\['([^']*)', '([^']*)'\\]`).exec(l);
  return [m?.[1] ?? '', m?.[2] ?? ''];
};
const GAMES2 = LIST.split('\n')
  .filter((l) => l.trim().startsWith('{ id:'))
  .map((l) => ({ id: /id: '([^']+)'/.exec(l)![1], line: l, en: pair(l, 'en'), he: pair(l, 'he') }));
const EMOJI = /\p{Extended_Pictographic}/u;

describe('Arcade game cards', () => {
  it('no card has an icon field, and no title or blurb carries an emoji', () => {
    expect(GAMES2.length).toBeGreaterThan(40);
    expect(SRC.slice(AT, OPEN)).not.toContain('icon');
    for (const g of GAMES2) {
      expect(g.line, g.id).not.toMatch(/\bicon:/);
      for (const s of [...g.en, ...g.he]) expect(EMOJI.test(s), `${g.id}: ${s}`).toBe(false);
    }
    const cards = SRC.slice(SRC.indexOf('const cards:'), SRC.indexOf('.filter((c) => COURSE_GAMES[course]'));
    expect(cards.length).toBeGreaterThan(100);
    expect(cards).not.toMatch(/\bicon:/);
  });
  it('Sing Interval has a short title, the same on the card, in the game and on the path', () => {
    const g = GAMES2.find((x) => x.id === 'singinterval')!;
    expect(g.en[0]).toBe('Interval Sing');
    expect(g.he[0]).toBe('ספרינט שירה');
    expect(g.en[0].length).toBeLessThanOrEqual(14);
    expect(readFileSync('src/ui/SingInterval.tsx', 'utf8')).toContain("title: { en: 'Interval Sing', he: 'ספרינט שירה' }");
    expect(readFileSync('src/engine/path.ts', 'utf8')).toContain("singinterval: { domain: 'voice', skill: 'singing', sub: 'intervals', title: { en: 'Interval Sing', he: 'ספרינט שירה' }");
  });
});
