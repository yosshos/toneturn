import { describe, expect, it } from 'vitest';
import { buildIndex, searchIndex } from '../src/ui/CommandPalette';

describe('search palette', () => {
  it('finds screens, topics, songs and settings in both languages', () => {
    const en = buildIndex('en');
    expect(searchIndex(en, 'metro')[0]).toMatchObject({ kind: 'nav', id: 'metronome' });
    expect(searchIndex(en, 'midi')[0]).toMatchObject({ kind: 'settings', id: 'midi' });
    expect(searchIndex(en, 'twinkle').some((h) => h.kind === 'song')).toBe(true);
    expect(searchIndex(en, 'where home').some((h) => h.kind === 'topic' && h.id === 'where-home')).toBe(true);
    const he = buildIndex('he');
    expect(searchIndex(he, 'מטרונום')[0]).toMatchObject({ kind: 'nav', id: 'metronome' });
    expect(searchIndex(he, 'tuner')[0]).toMatchObject({ id: 'tuner' }); // English words work in Hebrew too
  });
});
