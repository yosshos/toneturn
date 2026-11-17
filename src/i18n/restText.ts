// Strings of the studio-look stage 3 (own fingering, the new-best-tempo moment). Hebrew first; few words.

type L = { he: string; en: string };

export const RT = {
  ownFing: { he: 'אצבוע אחר?', en: 'Other fingering?' },
  ownFingOn: { he: 'האצבוע שלי', en: 'My fingering' },
  ownTitle: { he: 'האצבוע שלי', en: 'My fingering' },
  ownUse: { he: 'אני מאצבע אחרת', en: 'I use a different fingering' },
  ownHint: { he: 'הקשה על תו מחליפה אצבע.', en: 'Tap a note to change its finger.' },
  ownNone: { he: 'אפשר גם בלי מספרים.', en: 'Numbers are optional.' },
  ownReset: { he: 'לאפס', en: 'Reset' },
  ownOff: { he: 'חזרה להמלצה', en: 'Back to the suggestion' },
  done: { he: 'סיום', en: 'Done' },
  rh: { he: 'ימין', en: 'RH' },
  lh: { he: 'שמאל', en: 'LH' },
  mine: { he: 'שלי', en: 'mine' },
  newBest: { he: 'שיא טמפו חדש', en: 'New best tempo' },
  prevBest: { he: 'השיא הקודם', en: 'Previous best' },
  share: { he: 'לשתף', en: 'Share' },
  tapOn: { he: 'הקשה להמשך', en: 'Tap to continue' },
  shareText: { he: 'שיא טמפו חדש ב־{t}: ♩{n}', en: 'New best tempo on {t}: ♩{n}' },
  nextFinger: { he: 'אצבע {n}', en: 'finger {n}' },
} satisfies Record<string, L>;

export const rt = (k: keyof typeof RT, lang: 'he' | 'en', vars: Record<string, string | number> = {}) =>
  RT[k][lang].replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? ''));
