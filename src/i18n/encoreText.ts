// Encore leftovers (SPEC-PHRASE-STUDIO §5.3 meter chips, §5.6 fingering, §7.5 LH shells, §6.2 synced notes, §12
// featured phrase and the sharer's bonus): the words, he + en. Kept out of strings.ts (it holds the owner's work in
// progress), like recordingsText.ts. Few words, no emoji; Latin (chord symbols, numbers) goes inside <bdi> at the call.

type L = { en: string; he: string };

export const EX = {
  // §5.3 — meter
  meter: { en: 'Meter', he: 'משקל' },
  // §5.6 — fingering
  fingering: { en: 'Fingering', he: 'אצבוע' },
  fingeringOn: { en: 'Suggested fingering', he: 'אצבוע מוצע' },
  fingersEdit: { en: 'Edit fingering', he: 'עריכת אצבוע' },
  fingersTitle: { en: 'Fingering', he: 'אצבוע' },
  fingersHint: { en: 'Tap a note to change its finger.', he: 'נגיעה בתו משנה את האצבע.' },
  fingersHome: { en: 'In the home key; other keys get their own suggestion.', he: 'בסולם הבית; בשאר הסולמות — הצעה משלהם.' },
  fingersReset: { en: 'Back to the suggestion', he: 'חזרה להצעה' },
  rh: { en: 'RH', he: 'ימין' },
  lh: { en: 'LH', he: 'שמאל' },
  bar: { en: 'Bar', he: 'תיבה' },
  prevBar: { en: 'Previous bar', he: 'התיבה הקודמת' },
  nextBar: { en: 'Next bar', he: 'התיבה הבאה' },
  ownMark: { en: 'yours', he: 'שלך' },
  // §7.5 — LH shells
  shells: { en: 'LH shells', he: 'שלדים ביד שמאל' },
  shellsHint: { en: 'Root, 3rd and 7th under each chord.', he: 'יסוד, טרצה וספטימה מתחת לכל אקורד.' },
  band: { en: 'Band', he: 'להקה' },
  // §6.2 — synced notes
  syncNotes: { en: 'Sync the notes of starred takes', he: 'לסנכרן תווים של ניסיונות מסומנים' },
  syncNotesHint: { en: 'Notes only, never audio. Starred, foldered and phrase takes.', he: 'רק תווים, אף פעם לא שמע. ניסיונות מסומנים, בתיקיות ומשפטים.' },
  fromCloud: { en: 'Notes from another device', he: 'תווים ממכשיר אחר' },
  // §12 — featured phrase on Today, the sharer's bonus
  featured: { en: 'Phrase of the week', he: 'משפט השבוע' },
  fromFriend: { en: 'From a friend', he: 'מחבר/ה' },
  featuredBy: { en: 'by', he: 'מאת' },
  dismiss: { en: 'Hide', he: 'להסתיר' },
  learnedBonus: { en: 'A friend learned your phrase', he: 'חבר/ה למד/ה את המשפט שלך' },
} satisfies Record<string, L>;

export type EncoreTextKey = keyof typeof EX;
