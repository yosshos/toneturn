// Strings of the studio game frame (cover, HUD, level row). Kept apart from strings.ts (redesign 2026-11-17).
export const GAMES_TX = {
  howTo: { en: 'How to play', he: 'איך משחקים' },
  hideHowTo: { en: 'Hide', he: 'הסתרה' },
  level: { en: 'Level', he: 'רמה' },
  chooseLevel: { en: 'Choose a level', he: 'בחירת רמה' },
  done: { en: 'Done', he: 'סיום' },
  close: { en: 'Close', he: 'סגירה' },
  progress: { en: 'Progress', he: 'התקדמות' },
  // the cover's one-line goal for games outside GAMES2 (games frame, second pass)
  goal: {
    melody: { en: 'Hear the chain, play it back — one note longer each turn.', he: 'שומעים את השרשרת ומנגנים בחזרה — צליל נוסף בכל תור.' },
    rhythm: { en: 'Hear the rhythm, tap it back — one beat longer each turn.', he: 'שומעים את המקצב ומקישים בחזרה — פעמה נוספת בכל תור.' },
    truefalse: { en: 'A statement about music: true or bluff? Fast.', he: 'משפט על מוזיקה: אמת או בלוף? מהר.' },
    duel: { en: 'Two players, one phone: the first right answer wins the round.', he: 'שני שחקנים, טלפון אחד: התשובה הנכונה הראשונה זוכה בסבב.' },
    daily: { en: 'The same questions for everyone today.', he: 'אותן שאלות לכולם היום.' },
    ghost: { en: 'Race your own best run.', he: 'מתחרים בריצה הטובה ביותר שלכם.' },
    online: { en: 'Everyone answers the same question at once.', he: 'כולם עונים על אותה שאלה באותו רגע.' },
    groove: { en: 'A fading click, the pocket, swing — keep the time yours.', he: 'קליק שנעלם, כיס וסווינג — הזמן נשאר שלכם.' },
  },
  // the play HUD and the result cards
  round: { en: 'Round', he: 'סבב' },
  score: { en: 'Score', he: 'ניקוד' },
  newBest: { en: 'New personal best', he: 'שיא אישי חדש' },
  tempo: { en: 'Tempo', he: 'טמפו' },
} as const;
