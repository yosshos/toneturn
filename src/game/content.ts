// Words for every lesson and question kind: narration (spoken) and labels (on screen).
// Kept apart from the pure musical content in src/engine/lesson.ts.

import type { Answer, IntroStep, LessonDef, LessonId, Question } from '../engine/lesson';
import { displayNote, spokenMajorKey, spokenNote, type Naming, type PitchClass } from '../engine/pitch';
import type { SungResult } from '../engine/sing';
import { parseAlternatives, parseCadence, parseDegree, parseQuality, type ParseResult } from '../engine/parser';
import { narration, type Lang } from './narration';

const NUM: Record<Lang, Record<number, string>> = {
  en: { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven' },
  he: { 1: 'אחת', 2: 'שתיים', 3: 'שלוש', 4: 'ארבע', 5: 'חמש', 6: 'שש', 7: 'שבע' },
};
const deg = (n: number, l: Lang) => NUM[l][n] ?? String(n);
const orList = (xs: string[], l: Lang) => {
  const or = l === 'en' ? 'or' : 'או';
  if (xs.length <= 1) return xs.join('');
  if (xs.length === 2) return `${xs[0]} ${or} ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')}, ${or} ${xs[xs.length - 1]}`;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- lesson meta

export interface LessonMeta {
  title: Record<Lang, string>; // may contain {n}/{k}
  blurb: Record<Lang, string>;
  icon: 'ear' | 'steps' | 'chord' | 'cadence' | 'mic';
  /** Recommendation after a perfect run. */
  tip: Record<Lang, string>;
}

export const LESSON_META: Record<LessonId, LessonMeta> = {
  'bflat-two-homes': {
    title: { en: 'Same {n}, two homes', he: 'אותו {n}, שני בתים' },
    blurb: { en: 'One note. Two keys. Hear it change.', he: 'צליל אחד. שני סולמות. שומעים את ההבדל.' },
    icon: 'ear',
    tip: {
      en: 'Keep the fifth in your ear: hum {n} then {k} before your next session.',
      he: 'שמרו את החמישית באוזן: זמזמו {n} ואז {k} לפני התרגול הבא.',
    },
  },
  'degrees-135': {
    title: { en: 'Home, third, fifth', he: 'בית, שלישית, חמישית' },
    blurb: { en: 'The three notes of the home chord, in any key.', he: 'שלושת הצלילים של אקורד הבית, בכל סולם.' },
    icon: 'steps',
    tip: { en: 'Sing 1–3–5 up and down in any key you like. Your ear learns the shape.', he: 'שירו 1–3–5 למעלה ולמטה בכל סולם. האוזן לומדת את הצורה.' },
  },
  'major-minor': {
    title: { en: 'Major or minor?', he: "מז'ור או מינור?" },
    blurb: { en: 'Bright or dark: the middle note decides.', he: 'בהיר או כהה: הצליל האמצעי מחליט.' },
    icon: 'chord',
    tip: { en: 'Listen for the middle note: it moves just one half-step between major and minor.', he: 'הקשיבו לצליל האמצעי: בין מז׳ור למינור הוא זז רק חצי טון.' },
  },
  cadences: {
    title: { en: 'Cadence detective', he: 'בלש הקדנצות' },
    blurb: { en: 'Does the phrase come home, or stop on a question?', he: 'האם המשפט חוזר הביתה, או נעצר בשאלה?' },
    icon: 'cadence',
    tip: { en: 'In songs you know, notice the phrase endings that sound like a question.', he: 'בשירים שאתם מכירים, שימו לב לסופי משפטים שנשמעים כמו שאלה.' },
  },
  'sing-home-five': {
    title: { en: 'Sing home & five', he: 'לשיר את הבית ואת החמש' },
    blurb: { en: 'Hear the key, then sing the note.', he: 'שומעים את הסולם, ושרים את הצליל.' },
    icon: 'mic',
    tip: { en: 'Hum the fifth above any note you hear today: it is the most common jump in music.', he: 'זמזמו חמישית מעל כל צליל שתשמעו היום: זו הקפיצה הנפוצה ביותר במוזיקה.' },
  },
};

// ---------------------------------------------------------------- intro narration

export function introText(lesson: LessonDef, step: IntroStep, l: Lang, nm: Naming): string {
  const c = step.card;
  switch (c.kind) {
    case 'key-degree':
      return c.degree === 1 ? narration.introBb(l, nm, c.key, c.note) : narration.introEb(l, nm, c.key, c.note);
    case 'degrees':
      return l === 'en'
        ? `In ${spokenMajorKey(c.key, nm, l)}: one is home, three is bright, five is strong.`
        : `ב${spokenMajorKey(c.key, nm, l)}: אחת היא הבית, שלוש בהירה, חמש חזקה.`;
    case 'quality':
      return c.quality === 'maj'
        ? l === 'en'
          ? 'This is a major chord. Bright and open.'
          : "זה אקורד מז'ור. בהיר ופתוח."
        : l === 'en'
          ? 'Same root, minor chord. The middle note drops, and it turns darker.'
          : 'אותו בס, אקורד מינור. הצליל האמצעי יורד, והצבע נהיה כהה.';
    case 'cadence':
      return c.ending === 'resolved'
        ? l === 'en'
          ? 'Five, then one. The phrase comes home. Resolved.'
          : 'חמש, ואז אחת. המשפט חוזר הביתה. נפתר.'
        : l === 'en'
          ? 'This one stops on five. It hangs like a question. Open.'
          : 'כאן הוא נעצר על חמש. תלוי כמו שאלה. פתוח.';
    case 'sing':
      return l === 'en'
        ? 'First you hear the key and its home note. Then sing what I ask: home, or five steps up the scale.'
        : 'קודם שומעים את הסולם ואת צליל הבית. אחר כך שרים מה שאבקש: את הבית, או את החמישית.';
  }
  void lesson;
}

export function introGo(lesson: LessonDef, l: Lang): string {
  const q = lesson.questions[0];
  if (q.kind === 'degree' && lesson.id === 'bflat-two-homes') return narration.introGo(l);
  if (q.kind === 'sing') return l === 'en' ? 'Your turn. Sing when you hear the chime.' : 'תורכם. שירו אחרי הצליל.';
  return l === 'en' ? `Your turn. Answer ${sayChoices(q, l)}.` : `תורכם. ענו ${sayChoices(q, l)}.`;
}

// ---------------------------------------------------------------- per question

export function answerWord(_q: Question, a: Answer, l: Lang): string {
  if (typeof a === 'number') return deg(a, l);
  const words: Record<string, Record<Lang, string>> = {
    maj: { en: 'major', he: "מז'ור" },
    min: { en: 'minor', he: 'מינור' },
    resolved: { en: 'resolved', he: 'נפתר' },
    open: { en: 'open', he: 'פתוח' },
    accurate: { en: 'in tune', he: 'מדויק' },
  };
  return words[a]?.[l] ?? String(a);
}

export function sayChoices(q: Question, l: Lang): string {
  return orList(q.choices.map((c) => answerWord(q, c, l)), l);
}

/** Spoken prompt at the start of a round. */
export function roundPrompt(q: Question, l: Lang, nm: Naming, n: number): string {
  switch (q.kind) {
    case 'degree':
      return narration.roundPrompt(l, nm, n, q.key);
    case 'quality':
      return l === 'en' ? `Round ${n}. Major or minor?` : `סיבוב ${n}. מז'ור או מינור?`;
    case 'cadence':
      return l === 'en' ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Resolved, or open?` : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. נפתר, או פתוח?`;
    case 'sing':
      return l === 'en'
        ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Sing ${q.degree === 1 ? 'home, degree one' : `degree ${deg(q.degree, l)}`}.`
        : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. שירו ${q.degree === 1 ? 'את הבית, דרגה אחת' : `דרגה ${deg(q.degree, l)}`}.`;
  }
}

export function parseAnswer(q: Question, alternatives: string[]): ParseResult<Answer> {
  switch (q.kind) {
    case 'degree':
      return parseAlternatives(alternatives, parseDegree);
    case 'quality':
      return parseAlternatives(alternatives, parseQuality);
    case 'cadence':
      return parseAlternatives(alternatives, parseCadence);
    case 'sing':
      return { kind: 'unrecognized', heard: alternatives[0] ?? '' };
  }
}

export function correctText(q: Question, l: Lang, firstTry: boolean): string {
  if (q.kind === 'degree') return firstTry ? narration.correct(l, q.answer) : narration.correctRetry(l, q.answer);
  if (q.kind === 'sing') return l === 'en' ? (firstTry ? 'Spot on!' : 'There it is!') : firstTry ? 'מדויק!' : 'הנה זה!';
  const w = answerWord(q, q.answer, l);
  return l === 'en' ? (firstTry ? `Yes, ${w}!` : `That's it, ${w}.`) : firstTry ? `נכון, ${w}!` : `זהו, ${w}.`;
}

export function retryText(q: Question, l: Lang): string {
  if (q.kind === 'degree') return narration.retry(l);
  return l === 'en' ? 'Not quite. Listen again.' : 'לא בדיוק. הקשיבו שוב.';
}

export function revealText(q: Question, l: Lang, nm: Naming): string {
  switch (q.kind) {
    case 'degree':
      if (q.choices.length === 2 && q.choices.includes(5) && q.choices.includes(1)) return narration.reveal(l, nm, q.answer, q.key, q.target);
      return l === 'en'
        ? `It's ${deg(q.answer, l)}. In ${spokenMajorKey(q.key, nm, l)}, that note is ${spokenNote(q.target, nm, l)}.`
        : `זו ${deg(q.answer, l)}. ב${spokenMajorKey(q.key, nm, l)}, הצליל הזה הוא ${spokenNote(q.target, nm, l)}.`;
    case 'quality':
      return q.answer === 'maj'
        ? l === 'en'
          ? "It's major. Hear how bright it is."
          : "זה מז'ור. שימו לב כמה הוא בהיר."
        : l === 'en'
          ? "It's minor. Hear the darker middle note."
          : 'זה מינור. שימו לב לצליל האמצעי הכהה.';
    case 'cadence':
      return q.answer === 'resolved'
        ? l === 'en'
          ? 'It was resolved: five went home to one.'
          : 'הוא נפתר: חמש חזרה הביתה לאחת.'
        : l === 'en'
          ? 'It was open: it stopped on five.'
          : 'הוא פתוח: הוא נעצר על חמש.';
    case 'sing':
      return l === 'en' ? `Here is the note to sing: ${spokenNote(q.target, nm, l)}.` : `זה הצליל לשיר: ${spokenNote(q.target, nm, l)}.`;
  }
}

export function silenceText(q: Question, l: Lang): string {
  if (q.kind === 'sing') return l === 'en' ? "I didn't hear singing. Try again after the chime." : 'לא שמעתי שירה. נסו שוב אחרי הצליל.';
  if (q.kind === 'degree' && q.choices.length === 2) return narration.silence(l);
  return l === 'en' ? `I didn't hear you. ${cap(sayChoices(q, l))}?` : `לא שמעתי. ${sayChoices(q, l)}?`;
}

export function unclearText(q: Question, l: Lang): string {
  if (q.kind === 'sing') return l === 'en' ? 'That was hard to hear. Sing one steady note.' : 'היה קשה לשמוע. שירו צליל אחד יציב.';
  if (q.kind === 'degree' && q.choices.length === 2) return narration.unclear(l);
  return l === 'en' ? `Sorry? Say ${sayChoices(q, l)}.` : `סליחה? אמרו ${sayChoices(q, l)}.`;
}

export function ambiguousText(q: Question, cands: Answer[], l: Lang): string {
  const ws = cands.map((c) => answerWord(q, c, l));
  return l === 'en' ? `I heard ${ws.join(' and ')}. Which one?` : `שמעתי ${ws.join(' וגם ')}. מה התשובה?`;
}

/** Spoken per-attempt singing feedback: direction of pitch error, never a raw "wrong". */
export function singFeedbackText(r: SungResult, l: Lang): string {
  const c = Math.abs(r.cents ?? 0);
  switch (r.status) {
    case 'accurate':
      return l === 'en' ? 'Spot on!' : 'מדויק!';
    case 'sharp':
      return l === 'en' ? `A little high, about ${c} cents. Try a bit lower.` : `קצת גבוה, בערך ${c} סנט. נסו קצת נמוך יותר.`;
    case 'flat':
      return l === 'en' ? `A little low, about ${c} cents. Try a bit higher.` : `קצת נמוך, בערך ${c} סנט. נסו קצת גבוה יותר.`;
    case 'wrong':
      return (r.cents ?? 0) > 0
        ? l === 'en'
          ? 'That was a different note, too high. Listen and try again.'
          : 'זה צליל אחר, גבוה מדי. הקשיבו ונסו שוב.'
        : l === 'en'
          ? 'That was a different note, too low. Listen and try again.'
          : 'זה צליל אחר, נמוך מדי. הקשיבו ונסו שוב.';
    case 'unclear':
      return l === 'en' ? 'That was hard to hear. Sing one steady note.' : 'היה קשה לשמוע. שירו צליל אחד יציב.';
  }
}

// ---------------------------------------------------------------- on-screen labels

export interface ChoiceLabel {
  big: string;
  small: string;
  tone: 'mint' | 'lilac' | 'gold' | 'coral';
}

export function choiceLabel(_q: Question, a: Answer, l: Lang): ChoiceLabel {
  if (typeof a === 'number') {
    const small: Record<number, Record<Lang, string>> = {
      1: { en: 'Home', he: 'בית' },
      3: { en: 'Third', he: 'שלישית' },
      5: { en: 'Five', he: 'חמש' },
    };
    const tone = a === 1 ? 'mint' : a === 3 ? 'gold' : 'lilac';
    return { big: String(a), small: small[a]?.[l] ?? '', tone };
  }
  const map: Record<string, ChoiceLabel & { he: string; heSmall: string }> = {
    maj: { big: '☀', small: 'Major', he: '☀', heSmall: "מז'ור", tone: 'gold' },
    min: { big: '☾', small: 'Minor', he: '☾', heSmall: 'מינור', tone: 'lilac' },
    resolved: { big: '⌂', small: 'Resolved', he: '⌂', heSmall: 'נפתר', tone: 'mint' },
    open: { big: '?', small: 'Open', he: '?', heSmall: 'פתוח', tone: 'coral' },
  };
  const m = map[a];
  if (!m) return { big: String(a), small: '', tone: 'gold' };
  return { big: m.big, small: l === 'he' ? m.heSmall : m.small, tone: m.tone };
}

/** On-screen question line. `{n}` / `{k}` are note placeholders rendered with bidi isolation. */
export function askTemplate(q: Question, l: Lang): string {
  switch (q.kind) {
    case 'degree':
      return l === 'en' ? 'Which degree is {n}?' : 'איזו דרגה זה {n}?';
    case 'quality':
      return l === 'en' ? 'Major or minor?' : "מז'ור או מינור?";
    case 'cadence':
      return l === 'en' ? 'Resolved or open?' : 'נפתר או פתוח?';
    case 'sing':
      return q.degree === 1 ? (l === 'en' ? 'Sing home (1)' : 'שירו את הבית (1)') : l === 'en' ? `Sing degree ${q.degree}` : `שירו דרגה ${q.degree}`;
  }
}

export function hintText(q: Question, l: Lang, voice: boolean): string {
  if (q.kind === 'sing') return voice ? (l === 'en' ? 'Sing after the chime' : 'שירו אחרי הצליל') : l === 'en' ? 'Tap the mic, then sing' : 'לחצו על המיקרופון ושירו';
  if (!voice) return l === 'en' ? 'Tap your answer' : 'בחרו תשובה';
  const ws = q.choices.map((c) => `“${answerWord(q, c, l)}”`);
  return `${l === 'en' ? 'Say' : 'אמרו'} ${orList(ws, l)}`;
}

/** Short visual description of a question (badge + recap). */
export function questionBadge(q: Question, l: Lang, nm: Naming): { key?: PitchClass; text: string } {
  const major = l === 'en' ? 'major' : "מז'ור";
  switch (q.kind) {
    case 'degree':
    case 'cadence':
    case 'sing':
      return { key: q.key, text: major };
    case 'quality':
      return { text: `${l === 'en' ? 'Chord on' : 'אקורד על'} ${displayNote(q.root, nm, l)}` };
  }
}

export function giveText(q: Question, a: Answer, l: Lang): string {
  if (q.kind === 'sing') {
    const m: Record<string, Record<Lang, string>> = {
      accurate: { en: 'in tune', he: 'מדויק' },
      sharp: { en: 'high', he: 'גבוה' },
      flat: { en: 'low', he: 'נמוך' },
      wrong: { en: 'other note', he: 'צליל אחר' },
    };
    return m[String(a)]?.[l] ?? String(a);
  }
  return typeof a === 'number' ? String(a) : choiceLabel(q, a, l).small;
}
