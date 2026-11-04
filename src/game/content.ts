// Words for every lesson and question kind: narration (spoken) and labels (on screen).
// Kept apart from the pure musical content in src/engine/lesson.ts.

import { pcFromKey, type Answer, type IntroStep, type LessonDef, type LessonId, type Question } from '../engine/lesson';
import { displayNote, spokenMajorKey, spokenNote, type Naming, type PitchClass } from '../engine/pitch';
import type { SungResult } from '../engine/sing';
import { parseAlternatives, parseCadence, parseDegree, parseDegreeSequence, parseInterval, parseInversion, parseNoteName, parseQuality, parseRunMaterial, parseRunShape, type ParseResult } from '../engine/parser';
import { describeRun } from '../engine/runs';
import { narration, type Lang } from './narration';
import { describe as describeRhythm, parseRhythmWords, rhythmFromKey, rhythmKey, sameRhythm, type CellId } from '../engine/rhythm';

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
  icon: 'ear' | 'steps' | 'chord' | 'cadence' | 'mic' | 'map' | 'review' | 'puzzle' | 'drum';
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
  intervals: {
    title: { en: 'Thirds, fifths, octaves', he: 'טרצות, קווינטות, אוקטבות' },
    blurb: { en: 'How far apart are two notes? One after the other, then together.', he: 'כמה רחוקים שני צלילים? אחד אחרי השני, ואז ביחד.' },
    icon: 'steps',
    tip: { en: 'Hum the first two notes of a song you love — which interval is it?', he: 'זמזמו את שני הצלילים הראשונים של שיר שאתם אוהבים — איזה מרווח זה?' },
  },
  inversions: {
    title: { en: 'Which note is in the bass?', he: 'איזה צליל בבס?' },
    blurb: { en: 'Same chord, different bass: C, C/E and C/G.', he: 'אותו אקורד, בס אחר: C,‏ C/E ו-C/G.' },
    icon: 'chord',
    tip: { en: 'Listen to bass lines today: is the bass on the chord’s root, or somewhere else?', he: 'הקשיבו היום לקווי בס: האם הבס על שורש האקורד, או במקום אחר?' },
  },
  'notes-degrees': {
    title: { en: 'Notes and degrees', he: 'תווים ודרגות' },
    blurb: { en: 'Hear it and name the note; turn note names into degrees and back.', he: 'שומעים ונותנים שם לתו; הופכים שמות תווים לדרגות ובחזרה.' },
    icon: 'steps',
    tip: { en: 'Pick a key and say its notes as degrees out loud: “E-flat is one, F is two…”.', he: 'בחרו סולם ואמרו את התווים שלו כדרגות בקול: "מי במול זה אחת, פה זה שתיים…".' },
  },
  'sing-names': {
    title: { en: 'Sing it by name', he: 'לשיר לפי שם' },
    blurb: { en: 'Echo a note, then sing notes you are told by name.', he: 'חוזרים על צליל, ואז שרים תווים לפי השם שלהם.' },
    icon: 'mic',
    tip: { en: 'Hum the note names of a melody you know: the name and the sound start to stick together.', he: 'זמזמו את שמות התווים של מנגינה שאתם מכירים: השם והצליל מתחילים להידבק.' },
  },
  'sing-degrees': {
    title: { en: 'Sing the degrees', he: 'לשיר את הדרגות' },
    blurb: { en: 'Hear “five three one” — sing those notes in order.', he: 'שומעים "חמש שלוש אחת" — שרים את הצלילים לפי הסדר.' },
    icon: 'mic',
    tip: { en: 'Sing 1–2–3–2–1 in a new key every day.', he: 'שירו 1–2–3–2–1 בסולם חדש כל יום.' },
  },
  'rhythm-r1': {
    title: { en: 'Rhythm 1: quarters and halves', he: 'קצב 1: רבעים וחצאים' },
    blurb: { en: 'Read and tap ♩ 𝅗𝅥 𝅝 and rests; hear a bar and pick its notation.', he: 'קוראים ומקישים ♩ 𝅗𝅥 𝅝 והפסקות; שומעים תיבה ובוחרים את התווים שלה.' },
    icon: 'drum',
    tip: { en: 'Tap along to songs on the radio: one tap per beat, then two per beat.', he: 'הקישו עם שירים ברדיו: הקשה אחת לכל פעמה, ואז שתיים.' },
  },
  'rhythm-r2': {
    title: { en: 'Rhythm 2: eighth notes', he: 'קצב 2: שמיניות' },
    blurb: { en: 'Two eighths per beat: ti-ti. Read it, tap it, hear it.', he: 'שתי שמיניות בפעמה: טי-טי. קוראים, מקישים, שומעים.' },
    icon: 'drum',
    tip: { en: 'Say “ti-ti ta” while walking: steps are the beat.', he: 'אמרו "טי-טי טה" תוך כדי הליכה: הצעדים הם הפעמה.' },
  },
  'rhythm-r3': {
    title: { en: 'Rhythm 3: dotted quarter', he: 'קצב 3: רבע מנוקד' },
    blurb: { en: 'Long-short across two beats: ta-i ti.', he: 'ארוך-קצר על פני שתי פעמות: טה-אי טי.' },
    icon: 'drum',
    tip: { en: 'Many folk songs start with ♩. ♪ — find one you know.', he: 'הרבה שירי עם מתחילים ב-♩. ♪ — מצאו אחד שאתם מכירים.' },
  },
  placement: {
    title: { en: 'Find my level', he: 'מציאת הרמה שלי' },
    blurb: { en: 'Nine quick questions that adapt to you.', he: 'תשע שאלות קצרות שמתאימות את עצמן אליכם.' },
    icon: 'map',
    tip: { en: 'Open your Skill Map to see what to practise next.', he: 'פתחו את מפת המיומנויות כדי לראות מה לתרגל עכשיו.' },
  },
  review: {
    title: { en: 'Review my mistakes', he: 'חזרה על הטעויות שלי' },
    blurb: { en: 'Fresh versions of what you missed — hear your answer next to the right one.', he: 'גרסאות חדשות של מה שפספסתם — שומעים את התשובה שלכם ליד הנכונה.' },
    icon: 'review',
    tip: { en: 'Nice clean-up. Mistakes you fixed leave the review list.', he: 'ניקוי יפה. טעויות שתיקנתם יוצאות מרשימת החזרה.' },
  },
  'weekly-puzzle': {
    title: { en: 'Weekly puzzle', he: 'החידה השבועית' },
    blurb: { en: 'One melody, the same for everyone at your level this week. Gold on the first try.', he: 'מנגינה אחת, זהה לכל מי שברמה שלכם השבוע. זהב בניסיון הראשון.' },
    icon: 'puzzle',
    tip: { en: 'A new puzzle arrives every Monday.', he: 'חידה חדשה מגיעה בכל יום שני.' },
  },
  runs: {
    title: { en: 'Riffs & runs', he: 'ריפים וראנים' },
    blurb: { en: 'Hear a fast run, name it, then sing it back.', he: 'שומעים ראן מהיר, מזהים אותו, ושרים אותו בחזרה.' },
    icon: 'mic',
    tip: { en: 'Practise a run slowly on “ah”, then speed it up — the Runs workshop does this for you.', he: 'תרגלו ראן לאט על "אה", ואז האיצו — סדנת הראנים עושה את זה בשבילכם.' },
  },
  'runs-workshop': {
    title: { en: 'Runs workshop', he: 'סדנת ראנים' },
    blurb: { en: 'Each run at 60 %, 80 %, then full speed.', he: 'כל ראן ב־60%, ב־80% ואז במהירות מלאה.' },
    icon: 'mic',
    tip: { en: 'Clean, separate notes beat speed: slow down when notes smear.', he: 'צלילים נקיים ונפרדים חשובים ממהירות: האטו כשהצלילים נמרחים.' },
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
    case 'interval':
      return {
        M3: { en: 'A third: close and sweet. Like the start of a major chord.', he: 'טרצה: קרובה ומתוקה. כמו ההתחלה של אקורד מז׳ור.' },
        P5: { en: 'A fifth: open and strong. Like a horn call.', he: 'קווינטה: פתוחה וחזקה. כמו תרועת קרן.' },
        P8: { en: 'An octave: the same note, higher. The two almost melt together.', he: 'אוקטבה: אותו צליל, גבוה יותר. השניים כמעט מתמזגים.' },
      }[c.name][l];
    case 'rhythm':
      return l === 'en'
        ? `Here is a bar: ${describeRhythm(rhythmFromKey(c.rhythm), 'names', l)}. Count it: ${describeRhythm(rhythmFromKey(c.rhythm), 'syllables', l)}.`
        : `זו תיבה: ${describeRhythm(rhythmFromKey(c.rhythm), 'names', l)}. סופרים: ${describeRhythm(rhythmFromKey(c.rhythm), 'syllables', l)}.`;
    case 'inversion':
      return {
        root: { en: 'Root in the bass: solid and grounded.', he: 'השורש בבס: יציב ומקורקע.' },
        third: { en: 'Third in the bass: lighter, it wants to move on.', he: 'הטרצה בבס: קליל יותר, רוצה להמשיך.' },
        fifth: { en: 'Fifth in the bass: suspended, like it is waiting.', he: 'הקווינטה בבס: תלוי, כאילו מחכה.' },
      }[c.bass][l];
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

export function answerWord(_q: Question, a: Answer, l: Lang, nm: Naming = 'letter'): string {
  if (typeof a === 'number') return deg(a, l);
  const asPc = typeof a === 'string' ? pcFromKey(a) : null;
  if (asPc) return spokenNote(asPc, nm, l);
  if (_q.kind === 'rhythm-dict' && typeof a === 'string') return describeRhythm(rhythmFromKey(a, _q.rhythm.bars), 'names', l);
  const words: Record<string, Record<Lang, string>> = {
    maj: { en: 'major', he: "מז'ור" },
    min: { en: 'minor', he: 'מינור' },
    resolved: { en: 'resolved', he: 'נפתר' },
    open: { en: 'open', he: 'פתוח' },
    dim: { en: 'diminished', he: 'מוקטן' },
    M3: { en: 'a third', he: 'טרצה' },
    P5: { en: 'a fifth', he: 'קווינטה' },
    P8: { en: 'an octave', he: 'אוקטבה' },
    root: { en: 'the root', he: 'השורש' },
    third: { en: 'the third', he: 'הטרצה' },
    fifth: { en: 'the fifth', he: 'הקווינטה' },
    aug: { en: 'augmented', he: 'מוגדל' },
    accurate: { en: 'in tune', he: 'מדויק' },
    major: { en: 'major scale', he: "סולם מז'ור" },
    'min-penta': { en: 'pentatonic', he: 'פנטטוני' },
    blues: { en: 'blues', he: 'בלוז' },
    up: { en: 'up', he: 'עולה' },
    down: { en: 'down', he: 'יורד' },
    turn: { en: 'up and back', he: 'עולה וחוזר' },
  };
  if (/^\d(-\d)+$/.test(String(a))) return String(a).split('-').map((d) => deg(Number(d), l)).join(', ');
  return words[a]?.[l] ?? String(a);
}

export function sayChoices(q: Question, l: Lang): string {
  if (q.kind === 'degree-seq') return l === 'en' ? 'the degrees in order' : 'את הדרגות לפי הסדר';
  if (q.kind === 'note-name') return l === 'en' ? 'the note name' : 'את שם התו';
  if (q.kind === 'rhythm-dict') return l === 'en' ? 'the rhythm, like “ta ti-ti ta”' : 'את הקצב, למשל "טה טי-טי טה"';
  if (q.choices.length > 4) return l === 'en' ? 'a degree, one to seven' : 'דרגה, מאחת עד שבע';
  return orList(q.choices.map((c) => answerWord(q, c, l)), l);
}

/** Spoken prompt at the start of a round. */
export function roundPrompt(q: Question, l: Lang, nm: Naming, n: number): string {
  switch (q.kind) {
    case 'degree':
      if (q.direction === 'name→degree')
        return l === 'en'
          ? `Round ${n}. In ${spokenMajorKey(q.key, nm, l)}, which degree is ${spokenNote(q.target, nm, l)}?`
          : `סיבוב ${n}. ב${spokenMajorKey(q.key, nm, l)}, איזו דרגה היא ${spokenNote(q.target, nm, l)}?`;
      return narration.roundPrompt(l, nm, n, q.key);
    case 'note-name':
      return q.direction === 'heard-pitch→name'
        ? l === 'en'
          ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Which note is this?`
          : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. איזה תו זה?`
        : l === 'en'
          ? `Round ${n}. In ${spokenMajorKey(q.key, nm, l)}, which note is degree ${deg(q.degree, l)}?`
          : `סיבוב ${n}. ב${spokenMajorKey(q.key, nm, l)}, איזה תו הוא דרגה ${deg(q.degree, l)}?`;
    case 'rhythm-read':
      return q.show === 'words'
        ? l === 'en'
          ? `Round ${n}. Tap this rhythm: ${describeRhythm(q.rhythm, 'names', l)}. Count-in, then go.`
          : `סיבוב ${n}. הקישו את הקצב: ${describeRhythm(q.rhythm, 'names', l)}. ספירה, ואז מתחילים.`
        : l === 'en'
          ? `Round ${n}. Read and tap. Count-in, then go.`
          : `סיבוב ${n}. קוראים ומקישים. ספירה, ואז מתחילים.`;
    case 'rhythm-dict':
      return l === 'en' ? `Round ${n}. Listen to the rhythm.` : `סיבוב ${n}. הקשיבו לקצב.`;
    case 'sing-run':
      return q.prompt === 'echo'
        ? l === 'en'
          ? `Round ${n}. Listen to the run, then sing it back on “ah”.`
          : `סיבוב ${n}. הקשיבו לראן, ושירו אותו בחזרה על "אה".`
        : l === 'en'
          ? `Round ${n}. From home: ${describeRun(q.run, l)}. Sing it after the chime.`
          : `סיבוב ${n}. מהבית: ${describeRun(q.run, l)}. שירו אחרי הצליל.`;
    case 'run-id':
      return q.aspect === 'material'
        ? l === 'en'
          ? `Round ${n}. Major scale, pentatonic, or blues?`
          : `סיבוב ${n}. סולם מז'ור, פנטטוני, או בלוז?`
        : l === 'en'
          ? `Round ${n}. Does the run go up, down, or up and back?`
          : `סיבוב ${n}. הראן עולה, יורד, או עולה וחוזר?`;
    case 'sing-seq':
      return l === 'en'
        ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Sing ${q.degrees.map((d) => deg(d, l)).join(', ')}.`
        : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. שירו ${q.degrees.map((d) => deg(d, l)).join(', ')}.`;
    case 'quality':
      return q.choices.length > 2
        ? l === 'en'
          ? `Round ${n}. Major, minor, diminished, or augmented?`
          : `סיבוב ${n}. מז'ור, מינור, מוקטן, או מוגדל?`
        : l === 'en'
          ? `Round ${n}. Major or minor?`
          : `סיבוב ${n}. מז'ור או מינור?`;
    case 'degree-seq':
      return l === 'en'
        ? `${cap(spokenMajorKey(q.key, nm, l))}. ${q.degrees.length} notes. Name the degrees in order.`
        : `${spokenMajorKey(q.key, nm, l)}. ${q.degrees.length} צלילים. אמרו את הדרגות לפי הסדר.`;
    case 'interval':
      return q.mode === 'melodic'
        ? l === 'en'
          ? `Round ${n}. One note, then another. Third, fifth, or octave?`
          : `סיבוב ${n}. צליל, ואחריו עוד אחד. טרצה, קווינטה, או אוקטבה?`
        : l === 'en'
          ? `Round ${n}. Two notes together. Third, fifth, or octave?`
          : `סיבוב ${n}. שני צלילים ביחד. טרצה, קווינטה, או אוקטבה?`;
    case 'inversion':
      return l === 'en' ? `Round ${n}. Listen to the bass. Root, third, or fifth?` : `סיבוב ${n}. הקשיבו לבס. שורש, טרצה, או קווינטה?`;
    case 'cadence':
      return l === 'en' ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Resolved, or open?` : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. נפתר, או פתוח?`;
    case 'sing':
      if (q.promptBy === 'echo') return l === 'en' ? `Round ${n}. Listen, then sing it back.` : `סיבוב ${n}. הקשיבו, ושירו בחזרה.`;
      if (q.promptBy === 'name')
        return l === 'en'
          ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Sing ${spokenNote(q.target, nm, l)}.`
          : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. שירו ${spokenNote(q.target, nm, l)}.`;
      return l === 'en'
        ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Sing ${q.degree === 1 ? 'home, degree one' : `degree ${deg(q.degree, l)}`}.`
        : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. שירו ${q.degree === 1 ? 'את הבית, דרגה אחת' : `דרגה ${deg(q.degree, l)}`}.`;
  }
}

export function parseAnswer(q: Question, alternatives: string[], inputNaming: Naming = 'letter'): ParseResult<Answer> {
  switch (q.kind) {
    case 'degree':
      return parseAlternatives(alternatives, parseDegree);
    case 'quality':
      return parseAlternatives(alternatives, parseQuality);
    case 'cadence':
      return parseAlternatives(alternatives, parseCadence);
    case 'sing':
      return { kind: 'unrecognized', heard: alternatives[0] ?? '' };
    case 'degree-seq':
      return parseAlternatives(alternatives, parseDegreeSequence);
    case 'interval':
      return parseAlternatives(alternatives, parseInterval);
    case 'inversion':
      return parseAlternatives(alternatives, parseInversion);
    case 'note-name': {
      const r = parseAlternatives(alternatives, (t) => parseNoteName(t, inputNaming));
      if (r.kind === 'answer') return { ...r, value: `${r.value.letter}${r.value.acc}` };
      if (r.kind === 'ambiguous') return { ...r, candidates: r.candidates.map((c) => `${c.letter}${c.acc}`) };
      return r;
    }
    case 'run-id':
      return q.aspect === 'material' ? parseAlternatives(alternatives, parseRunMaterial) : parseAlternatives(alternatives, parseRunShape);
    case 'sing-seq':
    case 'sing-run':
    case 'rhythm-read':
      return { kind: 'unrecognized', heard: alternatives[0] ?? '' };
    case 'rhythm-dict': {
      // What is graded is what is heard: any spelling that sounds the same counts (spec G.3).
      for (const alt of alternatives) {
        const cells = parseRhythmWords(alt);
        if (!cells) continue;
        const said = { beatsPerBar: 4 as const, bars: q.rhythm.bars, cells: cells as CellId[] };
        return { kind: 'answer', value: sameRhythm(said, q.rhythm) ? q.answer : rhythmKey(said), heard: alt };
      }
      return { kind: 'unrecognized', heard: alternatives[0] ?? '' };
    }
  }
}

export function correctText(q: Question, l: Lang, firstTry: boolean, nm: Naming = 'letter'): string {
  if (q.kind === 'degree') return firstTry ? narration.correct(l, q.answer) : narration.correctRetry(l, q.answer);
  if (q.kind === 'note-name') {
    const w = answerWord(q, q.answer, l, nm);
    return l === 'en' ? (firstTry ? `Yes, ${w}!` : `That's it, ${w}.`) : firstTry ? `נכון, ${w}!` : `זהו, ${w}.`;
  }
  if (q.kind === 'sing' || q.kind === 'sing-seq') return l === 'en' ? (firstTry ? 'Spot on!' : 'There it is!') : firstTry ? 'מדויק!' : 'הנה זה!';
  const w = answerWord(q, q.answer, l);
  return l === 'en' ? (firstTry ? `Yes, ${w}!` : `That's it, ${w}.`) : firstTry ? `נכון, ${w}!` : `זהו, ${w}.`;
}

export function retryText(q: Question, l: Lang): string {
  if (q.kind === 'degree') return narration.retry(l);
  return l === 'en' ? 'Not quite. Listen again.' : 'לא בדיוק. הקשיבו שוב.';
}

export function revealText(q: Question, l: Lang, nm: Naming): string {
  switch (q.kind) {
    case 'note-name':
      return l === 'en'
        ? `It's ${spokenNote(q.target, nm, l)}: degree ${deg(q.degree, l)} of ${spokenMajorKey(q.key, nm, l)}.`
        : `זה ${spokenNote(q.target, nm, l)}: דרגה ${deg(q.degree, l)} ב${spokenMajorKey(q.key, nm, l)}.`;
    case 'sing-seq':
      return l === 'en' ? 'Here are the notes.' : 'אלה הצלילים.';
    case 'sing-run':
      return l === 'en' ? 'Here is the run: half speed, then at tempo.' : 'הנה הראן: בחצי מהירות, ואז בקצב.';
    case 'run-id':
      return l === 'en' ? `It was ${answerWord(q, q.answer, l)}. Your answer, then the right one.` : `זה היה ${answerWord(q, q.answer, l)}. התשובה שלכם, ואז הנכונה.`;
    case 'rhythm-read':
      return l === 'en' ? `Here is how it goes: ${describeRhythm(q.rhythm, 'syllables', l)}.` : `ככה זה נשמע: ${describeRhythm(q.rhythm, 'syllables', l)}.`;
    case 'rhythm-dict':
      return l === 'en' ? `It was: ${describeRhythm(q.rhythm, 'names', l)}. Your rhythm, then the right one.` : `זה היה: ${describeRhythm(q.rhythm, 'names', l)}. הקצב שלכם, ואז הנכון.`;
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
    case 'degree-seq':
      return l === 'en' ? `It was ${answerWord(q, q.answer, l)}. Listen again.` : `זה היה ${answerWord(q, q.answer, l)}. הקשיבו שוב.`;
    case 'interval':
      return l === 'en' ? `It was ${answerWord(q, q.answer, l)}. Your answer, then the right one.` : `זו הייתה ${answerWord(q, q.answer, l)}. התשובה שלכם, ואז הנכונה.`;
    case 'inversion':
      return l === 'en' ? `The bass was ${answerWord(q, q.answer, l)}. Your answer, then the right one.` : `בבס היה ${answerWord(q, q.answer, l)}. התשובה שלכם, ואז הנכונה.`;
    case 'sing':
      return l === 'en' ? `Here is the note to sing: ${spokenNote(q.target, nm, l)}.` : `זה הצליל לשיר: ${spokenNote(q.target, nm, l)}.`;
  }
}

export function silenceText(q: Question, l: Lang): string {
  if (q.kind === 'sing' || q.kind === 'sing-run' || q.kind === 'sing-seq') return l === 'en' ? "I didn't hear singing. Try again after the chime." : 'לא שמעתי שירה. נסו שוב אחרי הצליל.';
  if (q.kind === 'degree' && q.choices.length === 2) return narration.silence(l);
  return l === 'en' ? `I didn't hear you. ${cap(sayChoices(q, l))}?` : `לא שמעתי. ${sayChoices(q, l)}?`;
}

export function unclearText(q: Question, l: Lang): string {
  if (q.kind === 'sing') return l === 'en' ? 'That was hard to hear. Sing one steady note.' : 'היה קשה לשמוע. שירו צליל אחד יציב.';
  if (q.kind === 'degree' && q.choices.length === 2) return narration.unclear(l);
  return l === 'en' ? `Sorry? Say ${sayChoices(q, l)}.` : `סליחה? אמרו ${sayChoices(q, l)}.`;
}

export function ambiguousText(q: Question, cands: Answer[], l: Lang, nm: Naming = 'letter'): string {
  const ws = cands.map((c) => answerWord(q, c, l, nm));
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

export function choiceLabel(_q: Question, a: Answer, l: Lang, nm: Naming = 'letter'): ChoiceLabel {
  if (_q.kind === 'rhythm-dict' && typeof a === 'string') {
    const tones: ChoiceLabel['tone'][] = ['mint', 'gold', 'lilac', 'coral'];
    return { big: '', small: describeRhythm(rhythmFromKey(a, _q.rhythm.bars), 'names', l), tone: tones[_q.choices.indexOf(a) % 4] };
  }
  const asPc = typeof a === 'string' ? pcFromKey(a) : null;
  if (asPc) {
    const tones: ChoiceLabel['tone'][] = ['mint', 'gold', 'lilac', 'coral'];
    return { big: displayNote(asPc, nm, l), small: '', tone: tones['CDEFGAB'.indexOf(asPc.letter) % 4] };
  }
  if (typeof a === 'number') {
    const small: Record<number, Record<Lang, string>> = {
      1: { en: 'Home', he: 'בית' },
      3: { en: 'Third', he: 'שלישית' },
      5: { en: 'Five', he: 'חמש' },
    };
    const tone = a === 1 ? 'mint' : a === 3 ? 'gold' : a === 5 ? 'lilac' : 'coral';
    return { big: String(a), small: small[a]?.[l] ?? '', tone };
  }
  const map: Record<string, ChoiceLabel & { he: string; heSmall: string }> = {
    maj: { big: '☀', small: 'Major', he: '☀', heSmall: "מז'ור", tone: 'gold' },
    min: { big: '☾', small: 'Minor', he: '☾', heSmall: 'מינור', tone: 'lilac' },
    resolved: { big: '⌂', small: 'Resolved', he: '⌂', heSmall: 'נפתר', tone: 'mint' },
    open: { big: '?', small: 'Open', he: '?', heSmall: 'פתוח', tone: 'coral' },
    dim: { big: '°', small: 'Diminished', he: '°', heSmall: 'מוקטן', tone: 'coral' },
    aug: { big: '+', small: 'Augmented', he: '+', heSmall: 'מוגדל', tone: 'mint' },
    M3: { big: '3', small: 'Third', he: '3', heSmall: 'טרצה', tone: 'gold' },
    P5: { big: '5', small: 'Fifth', he: '5', heSmall: 'קווינטה', tone: 'lilac' },
    P8: { big: '8', small: 'Octave', he: '8', heSmall: 'אוקטבה', tone: 'mint' },
    major: { big: '♪', small: 'Major scale', he: '♪', heSmall: "סולם מז'ור", tone: 'gold' },
    'min-penta': { big: '⁵', small: 'Pentatonic', he: '⁵', heSmall: 'פנטטוני', tone: 'mint' },
    blues: { big: '♭', small: 'Blues', he: '♭', heSmall: 'בלוז', tone: 'lilac' },
    up: { big: '↗', small: 'Up', he: '↗', heSmall: 'עולה', tone: 'mint' },
    down: { big: '↘', small: 'Down', he: '↘', heSmall: 'יורד', tone: 'lilac' },
    turn: { big: '⤻', small: 'Up & back', he: '⤻', heSmall: 'עולה וחוזר', tone: 'gold' },
    root: { big: '1', small: 'Root', he: '1', heSmall: 'שורש', tone: 'mint' },
    third: { big: '3', small: 'Third', he: '3', heSmall: 'טרצה', tone: 'gold' },
    fifth: { big: '5', small: 'Fifth', he: '5', heSmall: 'קווינטה', tone: 'lilac' },
  };
  const m = map[a];
  if (!m) return { big: String(a), small: '', tone: 'gold' };
  return { big: m.big, small: l === 'he' ? m.heSmall : m.small, tone: m.tone };
}

/** On-screen question line. `{n}` / `{k}` are note placeholders rendered with bidi isolation. */
export function askTemplate(q: Question, l: Lang): string {
  switch (q.kind) {
    case 'degree':
      if (q.direction === 'name→degree') return l === 'en' ? 'Which degree is {n} in {k} major?' : "איזו דרגה היא {n} ב-{k} מז'ור?";
      return l === 'en' ? 'Which degree is {n}?' : 'איזו דרגה זה {n}?';
    case 'note-name':
      return q.direction === 'heard-pitch→name' ? (l === 'en' ? 'Which note is it?' : 'איזה תו זה?') : l === 'en' ? `Which note is degree ${q.degree}?` : `איזה תו הוא דרגה ${q.degree}?`;
    case 'sing-seq':
      return l === 'en' ? `Sing ${q.degrees.join(' – ')}` : `שירו ${q.degrees.join(' – ')}`;
    case 'sing-run':
      return q.prompt === 'echo' ? (l === 'en' ? 'Sing the run back' : 'שירו את הראן בחזרה') : l === 'en' ? `Sing: ${describeRun(q.run, l)}` : `שירו: ${describeRun(q.run, l)}`;
    case 'run-id':
      return q.aspect === 'material' ? (l === 'en' ? 'Which scale was the run?' : 'מאיזה סולם הראן?') : l === 'en' ? 'Which way did it go?' : 'לאן הוא הלך?';
    case 'rhythm-read':
      return l === 'en' ? 'Tap this rhythm' : 'הקישו את הקצב';
    case 'rhythm-dict':
      return l === 'en' ? 'Which rhythm did you hear?' : 'איזה קצב שמעתם?';
    case 'quality':
      return q.choices.length > 2 ? (l === 'en' ? 'Which chord quality?' : 'איזה סוג אקורד?') : l === 'en' ? 'Major or minor?' : "מז'ור או מינור?";
    case 'degree-seq':
      return l === 'en' ? 'Which degrees, in order?' : 'אילו דרגות, לפי הסדר?';
    case 'interval':
      return l === 'en' ? 'Third, fifth or octave?' : 'טרצה, קווינטה או אוקטבה?';
    case 'inversion':
      return l === 'en' ? 'Which note is in the bass?' : 'איזה צליל בבס?';
    case 'cadence':
      return l === 'en' ? 'Resolved or open?' : 'נפתר או פתוח?';
    case 'sing':
      if (q.promptBy === 'echo') return l === 'en' ? 'Sing it back' : 'שירו בחזרה';
      if (q.promptBy === 'name') return l === 'en' ? 'Sing {n}' : 'שירו {n}';
      return q.degree === 1 ? (l === 'en' ? 'Sing home (1)' : 'שירו את הבית (1)') : l === 'en' ? `Sing degree ${q.degree}` : `שירו דרגה ${q.degree}`;
  }
}

export function hintText(q: Question, l: Lang, voice: boolean): string {
  if (q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run') return voice ? (l === 'en' ? 'Sing after the chime' : 'שירו אחרי הצליל') : l === 'en' ? 'Tap the mic, then sing' : 'לחצו על המיקרופון ושירו';
  if (q.kind === 'note-name' && voice) return l === 'en' ? 'Say the note name' : 'אמרו את שם התו';
  if (q.kind === 'rhythm-read') return voice ? (l === 'en' ? 'Say “ta” on each note (or tap)' : 'אמרו "טה" על כל תו (או הקישו)') : l === 'en' ? 'Tap the pad or press Space on each note' : 'הקישו על הכפתור או על רווח בכל תו';
  if (q.kind === 'rhythm-dict' && voice) return l === 'en' ? 'Say it: “ta ti-ti ta” or “quarter, two eighths…”' : 'אמרו: "טה טי-טי טה" או "רבע, שתי שמיניות…"';
  if (q.kind === 'degree-seq') return voice ? (l === 'en' ? 'Say them in order, e.g. “one three five”' : 'אמרו לפי הסדר, למשל "אחת שלוש חמש"') : l === 'en' ? 'Tap the degrees in order, then Done' : 'לחצו על הדרגות לפי הסדר, ואז סיום';
  if (!voice) return l === 'en' ? 'Tap your answer' : 'בחרו תשובה';
  if (q.choices.length > 4) return l === 'en' ? 'Say a degree, “one” to “seven”' : 'אמרו דרגה, מ"אחת" עד "שבע"';
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
    case 'degree-seq':
    case 'note-name':
    case 'sing-seq':
      return { key: q.key, text: major };
    case 'sing-run':
    case 'run-id':
      return { key: q.key, text: `${q.run.offsets.length} ${l === 'en' ? 'notes' : 'צלילים'} · ${q.run.nps} ${l === 'en' ? 'n/s' : 'בשנייה'}` };
    case 'quality':
      return { text: `${l === 'en' ? 'Chord on' : 'אקורד על'} ${displayNote(q.root, nm, l)}` };
    case 'interval':
      return { text: q.mode === 'melodic' ? (l === 'en' ? 'One after the other' : 'אחד אחרי השני') : l === 'en' ? 'Together' : 'ביחד' };
    case 'rhythm-read':
    case 'rhythm-dict':
      return { text: `4/4 · ${q.bpm} BPM · ${q.rhythm.bars} ${l === 'en' ? (q.rhythm.bars > 1 ? 'bars' : 'bar') : q.rhythm.bars > 1 ? 'תיבות' : 'תיבה'}` };
    case 'inversion':
      return { key: q.root, text: l === 'en' ? 'major chord' : "אקורד מז'ור" };
  }
}

export function giveText(q: Question, a: Answer, l: Lang, nm: Naming = 'letter'): string {
  const asPc = typeof a === 'string' ? pcFromKey(a) : null;
  if (asPc) return displayNote(asPc, nm, l);
  if (q.kind === 'rhythm-dict') return describeRhythm(rhythmFromKey(String(a), q.rhythm.bars), 'syllables', l);
  if (q.kind === 'rhythm-read') return a === 'accurate' ? (l === 'en' ? 'in time' : 'בזמן') : l === 'en' ? 'off' : 'לא מדויק';
  if (q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run') {
    const m: Record<string, Record<Lang, string>> = {
      accurate: { en: 'in tune', he: 'מדויק' },
      sharp: { en: 'high', he: 'גבוה' },
      flat: { en: 'low', he: 'נמוך' },
      wrong: { en: 'other note', he: 'צליל אחר' },
    };
    return m[String(a)]?.[l] ?? String(a);
  }
  if (q.kind === 'degree-seq') return String(a).split('-').join(' ');
  return typeof a === 'number' ? String(a) : choiceLabel(q, a, l).small;
}
