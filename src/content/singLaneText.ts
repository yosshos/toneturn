// Copy for the live singing view and the take review (docs/research/VOICE-FEEDBACK-UI.md). Few words each.

type T = { en: string; he: string };

export const SING_TX = {
  why: { en: 'Why?', he: 'למה?' },
  clean: { en: 'Clean take', he: 'ביצוע נקי' },
  good: { en: 'Good take', he: 'ביצוע טוב' },
  best: { en: 'best', he: 'רצף' },
  straight: { en: 'straight', he: 'ישר' },
  vibrato: { en: 'vibrato', he: 'ויברטו' },
  unsteady: { en: 'unsteady', he: 'לא יציב' },
  rising: { en: 'rising', he: 'עולה' },
  sagging: { en: 'sagging', he: 'שוקע' },
  listen: { en: 'Listen', he: 'האזנה' },
  pause: { en: 'Pause', he: 'עצירה' },
  // owner 2026-11-15: inside the pass band = in tune (it passes); the tight centre is only the stamp
  inZone: { en: 'in tune', he: 'מכוון' },
  centre: { en: 'dead centre', he: 'בול במרכז' },
  missed: { en: 'missed', he: 'פוספס' },
  note: { en: 'Note', he: 'צליל' },
  settle: { en: 'settle', he: 'התייצבות' },
  steady: { en: 'steady', he: 'יציבות' },
  onset: { en: 'onset', he: 'כניסה' },
  early: { en: 'early', he: 'מוקדם' },
  late: { en: 'late', he: 'מאוחר' },
  octave: { en: 'wrong octave', he: 'אוקטבה אחרת' },
  even: { en: 'even cycles', he: 'גלים אחידים' },
  wanders: { en: 'rate wanders', he: 'קצב משתנה' },
} satisfies Record<string, T>;
