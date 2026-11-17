// Strings of the studio-look design elements (celebrations, share card). Hebrew first.

type L = { he: string; en: string };

export const EL: Record<string, L> = {
  accuracy: { he: 'בפעם הראשונה', en: 'First try' },
  xp: { he: 'XP', en: 'XP' },
  time: { he: 'זמן תשובה', en: 'Answer time' },
  weakest: { he: 'לחזור עליו', en: 'Go back to' },
  next: { he: 'הצעד הבא', en: 'Next step' },
  toMaster: { he: 'הדרך למאסטר', en: 'The way to Master' },
  newBest: { he: 'שיא טמפו חדש', en: 'New best tempo' },
  prevBest: { he: 'השיא הקודם', en: 'Previous best' },
  share: { he: 'לשתף', en: 'Share' },
};

export const el = (k: keyof typeof EL, lang: 'he' | 'en') => EL[k][lang];
