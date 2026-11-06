// The spoken intake (product owner, 0.35.2): the narrator asks, the player answers out loud — the game's mood is a
// conversation, not a form. Pure matching of what was heard to the step's options; the loop lives in src/ui/Intake.tsx.

const NUMBER_WORDS: Record<'he' | 'en', string[][]> = {
  en: [
    ['1', 'one', 'first', 'won'],
    ['2', 'two', 'second'],
    ['3', 'three', 'third', 'tree'],
    ['4', 'four', 'fourth'],
  ],
  he: [
    ['1', 'אחת', 'אחד', 'ראשון', 'ראשונה', 'הראשון', 'הראשונה'],
    ['2', 'שתיים', 'שניים', 'שתים', 'שני', 'שנייה', 'השני', 'השנייה'],
    ['3', 'שלוש', 'שלושה', 'שלישי', 'שלישית', 'השלישי', 'השלישית'],
    ['4', 'ארבע', 'ארבעה', 'רביעי', 'רביעית', 'הרביעי', 'הרביעית'],
  ],
};

/** Lower case, no emoji or punctuation, Hebrew prefixes (ו/ה/ב/ל/ש/מ) kept as is — words are compared by stem below. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '') // niqqud
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (s: string) => normalize(s).split(' ').filter(Boolean);
/** A heard word matches a label word when equal, or equal after one Hebrew prefix letter. */
const same = (heard: string, label: string) => heard === label || (heard.length > 2 && /^[והבלשמכ]/.test(heard) && heard.slice(1) === label) || (label.length > 2 && /^[והבלשמכ]/.test(label) && label.slice(1) === heard);
const STOP = new Set(['the', 'and', 'a', 'an', 'i', 'my', 'is', 'of', 'to', 'it', 'in', 'or', 'with', 'את', 'של', 'אני', 'עם', 'או', 'זה', 'גם', 'כן', 'לא', 'על', 'רק', 'יש', 'מה']);

/** Which option was said: its number ("two", "השני"), or the option whose own words were heard most (ties = none). */
export function matchOption(alternatives: string[], labels: string[], lang: 'he' | 'en'): number | null {
  for (const alt of alternatives) {
    const ws = words(alt);
    const nums = NUMBER_WORDS[lang].slice(0, labels.length);
    // A lone number (or "number two") wins outright.
    let numHits = nums.map((list, i) => (ws.some((w) => list.includes(w)) ? i : -1)).filter((i) => i >= 0);
    // "the third one": "one" is a pronoun there.
    if (numHits.length > 1 && ws.includes('one')) numHits = numHits.filter((i) => i !== 0);
    if (numHits.length === 1 && ws.length <= 3) return numHits[0];
    const score = labels.map((l) => {
      const lw = words(l).filter((w) => !STOP.has(w) && w.length > 1);
      return lw.filter((x) => ws.some((h) => same(h, x))).length;
    });
    const best = Math.max(...score);
    if (best > 0 && score.filter((s) => s === best).length === 1) return score.indexOf(best);
    if (numHits.length === 1) return numHits[0];
  }
  return null;
}

/** Several things said in one breath, in the order they were said (instruments, practice areas). */
export function matchMany<K extends string>(alternatives: string[], vocab: Record<K, string[]>): K[] {
  for (const alt of alternatives) {
    const ws = words(alt);
    const found: { k: K; at: number }[] = [];
    for (const k of Object.keys(vocab) as K[]) {
      let at = -1;
      for (const phrase of vocab[k]) {
        const pw = words(phrase).filter((w) => !STOP.has(w));
        for (const p of pw) {
          const i = ws.findIndex((h) => same(h, p) || (p.length > 4 && h.startsWith(p.slice(0, p.length - 1))));
          if (i >= 0 && (at < 0 || i < at)) at = i;
        }
      }
      if (at >= 0) found.push({ k, at });
    }
    if (found.length) return found.sort((a, b) => a.at - b.at).map((x) => x.k);
  }
  return [];
}

/** Did the player say one of these words (yes / no / mix …)? */
export const saidAny = (alternatives: string[], list: string[]) => alternatives.some((alt) => words(alt).some((w) => list.some((x) => same(w, normalize(x)))));

/** Read the options out: "One: …. Two: …." */
export function optionsSpoken(labels: string[], lang: 'he' | 'en'): string {
  const n = NUMBER_WORDS[lang];
  return labels.map((l, i) => `${n[i]?.[1] ?? i + 1}: ${l.replace(/[^\p{L}\p{N}\s,.'’–-]/gu, '').trim()}.`).join(' ');
}

/** Extra words people use for the instruments and areas (beyond the labels shown). */
export const PLAY_WORDS: Record<'he' | 'en', Record<string, string[]>> = {
  en: { none: ['nothing', 'none', 'no'], keys: ['piano', 'keys', 'keyboard', 'organ'], guitar: ['guitar', 'bass', 'ukulele'], strings: ['violin', 'cello', 'viola', 'strings'], winds: ['flute', 'sax', 'saxophone', 'clarinet', 'trumpet', 'trombone', 'winds', 'oboe'], drums: ['drums', 'drum', 'percussion'], voice: ['voice', 'sing', 'singing', 'singer'] },
  he: { none: ['כלום', 'שום', 'לא', 'אף'], keys: ['פסנתר', 'קלידים', 'אורגן', 'קלביר'], guitar: ['גיטרה', 'בס', 'יוקלילי'], strings: ['כינור', 'צ׳לו', 'צלו', 'ויולה', 'מיתרים'], winds: ['חליל', 'סקסופון', 'סקס', 'קלרינט', 'חצוצרה', 'טרומבון', 'נשיפה'], drums: ['תופים', 'תוף', 'כלי הקשה', 'מתופף'], voice: ['קול', 'שירה', 'שר', 'שרה', 'זמר', 'זמרת'] },
};
export const AREA_WORDS: Record<'he' | 'en', Record<string, string[]>> = {
  en: { pitch: ['hearing', 'notes', 'chords', 'ear', 'pitch'], time: ['rhythm', 'tempo', 'beat'], memory: ['memory', 'remember', 'form'], voice: ['singing', 'sing', 'voice'], reading: ['reading', 'theory', 'read'], creative: ['improvising', 'improvise', 'transposing', 'expression', 'creative'] },
  he: { pitch: ['שמיעה', 'צלילים', 'אקורדים', 'אוזן'], time: ['קצב', 'מקצב', 'טמפו', 'פעמה'], memory: ['זיכרון', 'לזכור', 'מבנה'], voice: ['שירה', 'לשיר', 'קול'], reading: ['קריאה', 'תיאוריה', 'תווים', 'לקרוא'], creative: ['אלתור', 'לאלתר', 'טרנספוזיציה', 'הבעה', 'יצירה'] },
};
export const MIX_WORDS = { en: ['mix', 'mixed', 'everything', 'all'], he: ['הכל', 'הכול', 'מעורבב', 'לערבב', 'שילוב', 'כולם'] };
