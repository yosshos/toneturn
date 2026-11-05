// Spoken narration text (kept separate from on-screen UI strings).

import { spokenMajorKey, spokenNote, type Naming, type PitchClass } from '../engine/pitch';

export type Lang = 'he' | 'en';

const NUM = { en: { 1: 'one', 5: 'five' }, he: { 1: 'אחת', 5: 'חמש' } } as Record<Lang, Record<number, string>>;
const deg = (n: number, l: Lang) => NUM[l][n] ?? String(n);

export const narration = {
  introBb: (l: Lang, nm: Naming, key: PitchClass, note: PitchClass) =>
    l === 'en'
      ? `Here is ${spokenMajorKey(key, nm, l)}. Now ${spokenNote(note, nm, l)}. It sounds like home. That's degree one.`
      : `זה ${spokenMajorKey(key, nm, l)}. ועכשיו ${spokenNote(note, nm, l)}. זה נשמע כמו בית. דרגה אחת.`,
  introEb: (l: Lang, nm: Naming, key: PitchClass, note: PitchClass) =>
    l === 'en'
      ? `Now ${spokenMajorKey(key, nm, l)}. The very same ${spokenNote(note, nm, l)} is now degree five. It wants to fall home.`
      : `ועכשיו ${spokenMajorKey(key, nm, l)}. אותו ${spokenNote(note, nm, l)} בדיוק הוא עכשיו דרגה חמש. הוא רוצה לחזור הביתה.`,
  introGo: (l: Lang) => (l === 'en' ? 'Your turn. Answer one, or five.' : 'תורכם. ענו אחת, או חמש.'),
  roundPrompt: (l: Lang, nm: Naming, n: number, key: PitchClass) =>
    l === 'en' ? `Round ${n}. ${spokenMajorKey(key, nm, l)}.` : `סיבוב ${n}. ${spokenMajorKey(key, nm, l)}.`,
  repeatPrompt: (l: Lang) => (l === 'en' ? 'Once more.' : 'עוד פעם.'),
  correct: (l: Lang, d: number) => (l === 'en' ? `Yes, ${deg(d, l)}!` : `נכון, ${deg(d, l)}!`),
  correctRetry: (l: Lang, d: number) => (l === 'en' ? `That's it, ${deg(d, l)}.` : `זהו, ${deg(d, l)}.`),
  retry: (l: Lang) => (l === 'en' ? 'Not quite. Listen again.' : 'לא בדיוק. הקשיבו שוב.'),
  reveal: (l: Lang, nm: Naming, d: number, key: PitchClass, note: PitchClass) =>
    l === 'en'
      ? `It's ${deg(d, l)}. In ${spokenMajorKey(key, nm, l)}, ${spokenNote(note, nm, l)} is ${d === 1 ? 'home' : 'the fifth'}.`
      : `זו ${deg(d, l)}. ב${spokenMajorKey(key, nm, l)}, ${spokenNote(note, nm, l)} ${d === 1 ? 'הוא הבית' : 'הוא דרגה 5'}.`,
  silence: (l: Lang) => (l === 'en' ? "I didn't hear you. One, or five?" : 'לא שמעתי. אחת, או חמש?'),
  unclear: (l: Lang) => (l === 'en' ? 'Sorry? Say one, or five.' : 'סליחה? אמרו אחת, או חמש.'),
  ambiguous: (l: Lang, cands: number[]) =>
    l === 'en'
      ? `I heard ${cands.map((c) => deg(c, l)).join(' and ')}. Which one?`
      : `שמעתי ${cands.map((c) => deg(c, l)).join(' וגם ')}. מה התשובה?`,
  skipped: (l: Lang) => (l === 'en' ? 'Skipped.' : 'דילגנו.'),
  paused: (l: Lang) => (l === 'en' ? 'Paused.' : 'עצרנו.'),
  complete: (l: Lang, firstTry: number, total: number, xp: number) =>
    l === 'en'
      ? `Lesson complete. ${firstTry} of ${total} on the first try. ${xp} XP.`
      : `השיעור הושלם. ${firstTry} מתוך ${total} בניסיון ראשון. ${xp} נקודות.`,
};
