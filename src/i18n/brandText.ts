// Strings for the brand pieces (logo, opening animation). Kept out of strings.ts on purpose.

export const BRAND_TEXT = {
  he: {
    slogan: ['לשמוע.', 'להבין.', 'לבצע.'] as const,
    /** The splash's accessible name. */
    splashLabel: 'החוש ה־7. לשמוע. להבין. לבצע.',
    logo: 'החוש ה־7',
  },
  en: {
    slogan: ['Hear.', 'Understand.', 'Perform.'] as const,
    splashLabel: 'The 7th Sense. Hear. Understand. Perform.',
    logo: 'The 7th Sense',
  },
} as const;
