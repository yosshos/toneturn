// How topics are grouped on the practice screen (spec T–V).

export const TOPIC_GROUPS: { id: string; icon: string; title: { en: string; he: string }; topics: string[] }[] = [
  { id: 'barry', icon: '🎹', title: { en: 'Barry Harris', he: 'בארי האריס' }, topics: ['bh-scale', 'bh-tone', 'bh-convert', 'bh-convert-2', 'bh-keys', 'bh-six-over', 'bh-lines', 'bh-pivot', 'bh-brothers', 'chromatic-added'] },
  { id: 'harmony', icon: '🎼', title: { en: 'Harmony: extensions, voicings, progressions', he: 'הרמוניה: הרחבות, וויסינגים, מהלכים' }, topics: ['extensions', 'voicings', 'progressions', 'form'] },
  { id: 'ear', icon: '👂', title: { en: 'Fine ear, two voices, post-tonal', he: 'אוזן עדינה, שני קולות, פוסט־טונלי' }, topics: ['intervals-all', 'degrees-ext', 'fine-pitch', 'in-tune', 'two-voice', 'set-classes'] },
  { id: 'world', icon: '🌍', title: { en: 'Maqamat and Middle-Eastern rhythms', he: 'מקאמים ומקצבים מזרחיים' }, topics: ['maqam', 'eastern-rhythm'] },
  { id: 'rhythm', icon: '🥁', title: { en: 'Advanced rhythm', he: 'קצב מתקדם' }, topics: ['tempo', 'polyrhythm', 'odd-meter', 'swing-ratio'] },
  { id: 'theory', icon: '📖', title: { en: 'Written theory', he: 'תיאוריה כתובה' }, topics: ['key-signatures', 'interval-spelling', 'chord-spelling', 'roman-numerals', 'circle-fifths', 'transposition', 'chord-scale', 'note-reading', 'sight-read'] },
];
