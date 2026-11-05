// Words for every lesson and question kind: narration (spoken) and labels (on screen).
// Kept apart from the pure musical content in src/engine/lesson.ts.

import { pcFromKey, type Answer, type IntroStep, type LessonDef, type LessonId, type Question } from '../engine/lesson';
import { displayNote, spokenMajorKey, spokenNote, type Naming, type PitchClass } from '../engine/pitch';
import type { SungResult } from '../engine/sing';
import { parseAlternatives, parseCadence, parseDegree, parseDegreeSequence, parseInterval, parseInversion, parseNoteName, parseQuality, parseRunMaterial, parseRunShape, parseNoteNameSequence, parseProgression, parseSeventh, type ParseResult } from '../engine/parser';
import { songById } from '../engine/songs';
import { MODE_NAMES, MODE_STEPS, type ModeId } from '../engine/modes';
import { parseMode, parseTrueFalse } from '../engine/parser';
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
  'rhythm-r4': {
    title: { en: 'Rhythm 4: sixteenths', he: 'קצב 4: שש-עשריות' },
    blurb: { en: 'Four to a beat: tika-tika, ti tika, tika ti.', he: 'ארבע בפעמה: טיקה-טיקה, טי טיקה, טיקה טי.' },
    icon: 'drum',
    tip: { en: 'Whisper “tika-tika” while tapping the beat with your foot.', he: 'לחשו "טיקה-טיקה" ותקישו את הפעמה ברגל.' },
  },
  'rhythm-r5': {
    title: { en: 'Rhythm 5: syncopation', he: 'קצב 5: סינקופה' },
    blurb: { en: 'Off-beat accents: syn-co-pa, and eighth rests.', he: 'הדגשות בין הפעמות: סין-קו-פה, והפסקות שמינית.' },
    icon: 'drum',
    tip: { en: 'Clap only the “and”s while counting 1 & 2 & — that is the off-beat.', he: 'מחאו רק על ה"ו" בזמן שאתם סופרים 1 ו 2 ו — זה החלק החלש.' },
  },
  'rhythm-r6': {
    title: { en: 'Rhythm 6: triplets', he: 'קצב 6: טריולות' },
    blurb: { en: 'Three in a beat: tri-o-la — and how it differs from ti-ti.', he: 'שלוש בפעמה: טרי-או-לה — ובמה זה שונה מטי-טי.' },
    icon: 'drum',
    tip: { en: 'Say “straw-ber-ry” for triplets and “ap-ple” for eighths over the same beat.', he: 'אמרו "תות-שָׂ-דה" לטריולה ו"תפּוּ-ח" לשמיניות על אותה פעמה.' },
  },
  'rhythm-r7': {
    title: { en: 'Rhythm 7: 3/4, 6/8 and 12/8', he: 'קצב 7: 3/4, 6/8 ו־12/8' },
    blurb: { en: 'Waltz time and the rocking compound beat.', he: 'משקל ואלס, והפעמה המורכבת שמתנדנדת.' },
    icon: 'drum',
    tip: { en: 'In 6/8 feel two big beats, each split in three: ONE-two-three FOUR-five-six.', he: 'ב־6/8 מרגישים שתי פעמות גדולות, כל אחת מחולקת לשלוש: אחת-שתיים-שלוש ארבע-חמש-שש.' },
  },
  'rhythm-r8': {
    title: { en: 'Rhythm 8: swing', he: 'קצב 8: סווינג' },
    blurb: { en: 'Jazz eighths: written even, played long-short.', he: 'שמיניות של ג׳אז: כתובות שוות, מנוגנות ארוך-קצר.' },
    icon: 'drum',
    tip: { en: 'Swing is the triplet feel: “doo-ba doo-ba” with the “ba” on the last third of the beat.', he: 'סווינג הוא תחושת טריולה: "דו-בה דו-בה" כשה"בה" על השליש האחרון של הפעמה.' },
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
  'jazz-1': {
    title: { en: 'Jazz 1: sevenths & ii–V–I', he: 'ג׳אז 1: ספטאקורדים ו־ii–V–I' },
    blurb: { en: 'Major 7, dominant 7, minor 7, half-diminished — and the progressions they make.', he: 'מז׳ור 7, דומיננט 7, מינור 7, חצי מוקטן — והמהלכים שהם יוצרים.' },
    icon: 'chord',
    tip: { en: 'Listen for the ♭7 in a dominant chord: it pulls down to the next chord’s 3rd.', he: 'הקשיבו ל־♭7 באקורד הדומיננטי: הוא נמשך למטה אל הטרצה של האקורד הבא.' },
  },
  songs: {
    title: { en: 'Songs you know', he: 'שירים שאתם מכירים' },
    blurb: { en: 'Famous openings: name the degrees, then find out which song it was.', he: 'פתיחות מפורסמות: אומרים את הדרגות, ואז מגלים איזה שיר זה היה.' },
    icon: 'steps',
    tip: { en: 'Pick a song you love and work out its first notes as degrees.', he: 'בחרו שיר שאתם אוהבים ונסו לפענח את הצלילים הראשונים שלו כדרגות.' },
  },
  'note-sequences': {
    title: { en: 'Note sequences', he: 'רצפי תווים' },
    blurb: { en: 'Hear notes and name them; turn names into degrees and back; sing from names.', he: 'שומעים תווים ונותנים להם שם; ממירים שמות לדרגות ובחזרה; שרים לפי שמות.' },
    icon: 'steps',
    tip: { en: 'Read the note names of a song you know and sing them as degrees.', he: 'קראו את שמות התווים של שיר שאתם מכירים ושירו אותם כדרגות.' },
  },
  runs: {
    title: { en: 'Riffs & runs', he: 'ריפים וראנים' },
    blurb: { en: 'Hear a fast run, name it, then sing it back.', he: 'שומעים ראן מהיר, מזהים אותו, ושרים אותו בחזרה.' },
    icon: 'mic',
    tip: { en: 'Practise a run slowly on “ah”, then speed it up — the Runs workshop does this for you.', he: 'תרגלו ראן לאט על "אה", ואז האיצו — סדנת הראנים עושה את זה בשבילכם.' },
  },
  'absolute-pitch': {
    title: { en: 'Absolute pitch corner (optional)', he: 'פינת שמיעה מוחלטת (רשות)' },
    blurb: { en: 'A note with no reference — name it. Tracked apart from your relative skills.', he: 'צליל בלי צליל ייחוס — מה שמו? נמדד בנפרד מהמיומנויות היחסיות.' },
    icon: 'ear',
    tip: { en: 'Few adults gain full absolute pitch; this trains a feel for each note’s colour.', he: 'מעט מבוגרים רוכשים שמיעה מוחלטת מלאה; זה מאמן תחושה ל"צבע" של כל צליל.' },
  },
  'jazz-2': {
    title: { en: 'Jazz 2: licks & melodic minor', he: 'ג׳אז 2: ליקים ומינור מלודי' },
    blurb: { en: 'Melodic minor by ear; swung licks to write down and to sing.', he: 'מינור מלודי בשמיעה; ליקים בסווינג לכתוב ולשיר.' },
    icon: 'chord',
    tip: { en: 'Melodic minor = minor with a major 6th and 7th: listen for the bright top of the scale.', he: 'מינור מלודי = מינור עם שישית ושביעית גדולות: הקשיבו לחלק העליון הבהיר של הסולם.' },
  },
  dictation: {
    title: { en: 'Melodic dictation', he: 'הכתבה מלודית' },
    blurb: { en: 'A short melody with its rhythm: write the notes, then the rhythm.', he: 'מנגינה קצרה עם הקצב שלה: כותבים את הצלילים, ואז את הקצב.' },
    icon: 'steps',
    tip: { en: 'Sing it back in your head first — then write the notes, then tap the rhythm.', he: 'שירו אותה קודם בראש — ואז כתבו את הצלילים, ואז הקישו את הקצב.' },
  },
  'slash-chords': {
    title: { en: 'Slash chords & bass lines', he: 'אקורדים עם בס ומהלכי בס' },
    blurb: { en: 'C/E, C/G — or C/D? Then follow the bass under a progression.', he: 'C/E, C/G — או C/D? ואז לעקוב אחרי הבס מתחת למהלך.' },
    icon: 'chord',
    tip: { en: 'Hum the lowest note first — then decide whether it belongs to the chord.', he: 'זמזמו קודם את הצליל הנמוך ביותר — ואז החליטו אם הוא שייך לאקורד.' },
  },
  'wrong-notes': {
    title: { en: 'Spot the wrong note', he: 'מצאו את הצליל השגוי' },
    blurb: { en: 'A scale with one wrong note: which one?', he: 'סולם עם צליל אחד שגוי: איזה?' },
    icon: 'ear',
    tip: { en: 'Sing the scale in your head along with it — the wrong note sticks out.', he: 'שירו את הסולם בראש יחד איתו — הצליל השגוי בולט.' },
  },
  modes: {
    title: { en: 'Modes by ear', he: 'מודוסים בשמיעה' },
    blurb: { en: 'Hear a scale and name its mode — major, melodic and harmonic minor modes.', he: 'שומעים סולם ומזהים את המודוס — מודוסים של מז׳ור, מינור מלודי ומינור הרמוני.' },
    icon: 'ear',
    tip: { en: 'Listen for the one note that differs: the 4th, the 6th, the 7th or the 2nd.', he: 'הקשיבו לצליל האחד שמשתנה: הרביעית, השישית, השביעית או השנייה.' },
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
    case 'explain':
      return {
        'melodic-minor': { en: 'Natural minor, then melodic minor from the same note. Only the 6th and the 7th change — they go up a half step, so the top of the scale sounds bright.', he: 'מינור טבעי, ואז מינור מלודי מאותו צליל. רק השישית והשביעית משתנות — הן עולות בחצי טון, ולכן החלק העליון של הסולם נשמע בהיר.' },
        'swing-lick': { en: 'Jazz eighths swing: long–short, long–short. Listen to the lick, then you will write and sing licks like it.', he: 'שמיניות בג׳אז מתנדנדות: ארוך–קצר, ארוך–קצר. הקשיבו לליק, ואחר כך תכתבו ותשירו ליקים כאלה.' },
        'bass-line': { en: 'Listen to the lowest note of each chord: one, seven, six, five — the bass walks down while the chords change.', he: 'הקשיבו לצליל הנמוך ביותר בכל אקורד: אחת, שבע, שש, חמש — הבס יורד בזמן שהאקורדים מתחלפים.' },
        dictation: { en: 'A short melody with its rhythm. First write its notes as degrees, then choose its rhythm.', he: 'מנגינה קצרה עם הקצב שלה. קודם כותבים את הצלילים כדרגות, ואז בוחרים את הקצב.' },
      }[c.topic][l];
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
    case 'seventh':
      return {
        maj7: { en: 'A major seventh chord: dreamy and settled. Home in jazz.', he: 'אקורד מז׳ור שביעית: חלומי ורגוע. הבית בג׳אז.' },
        '7': { en: 'A dominant seventh: bluesy, with a pull to move on.', he: 'דומיננט שביעית: בלוזי, עם משיכה להמשיך הלאה.' },
        m7: { en: 'Minor seven, dominant seven, major seven: two, five, one — the most common move in jazz.', he: 'מינור שביעית, דומיננט שביעית, מז׳ור שביעית: שתיים, חמש, אחת — המהלך הנפוץ ביותר בג׳אז.' },
        m7b5: { en: 'Half-diminished: dark and restless.', he: 'חצי מוקטן: כהה וחסר מנוחה.' },
      }[c.quality][l];
    case 'song':
      return l === 'en'
        ? 'You know this one: one, one, five, five, six, six, five. Famous melodies are made of the same degrees you are learning.'
        : 'את זה אתם מכירים: אחת, אחת, חמש, חמש, שש, שש, חמש. מנגינות מפורסמות בנויות מאותן דרגות שאתם לומדים.';
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

const namesWords = (keys: string[], nm: Naming, l: Lang) => keys.map((k) => { const p = pcFromKey(k); return p ? spokenNote(p, nm, l) : k; }).join(', ');
const namesShown = (keys: string[], nm: Naming, l: Lang) => keys.map((k) => { const p = pcFromKey(k); return p ? displayNote(p, nm, l) : k; }).join(' – ');

export function answerWord(_q: Question, a: Answer, l: Lang, nm: Naming = 'letter'): string {
  if (typeof a === 'number') return deg(a, l);
  if (_q.kind === 'mode-id' && typeof a === 'string' && a in MODE_STEPS) return MODE_NAMES[a as ModeId][l];
  if (_q.kind === 'tf') return a === 'true' ? (l === 'en' ? 'true' : 'נכון') : l === 'en' ? 'false' : 'לא נכון';
  if (typeof a === 'string' && a.includes('.') && a.split('.').every((k) => pcFromKey(k))) return namesWords(a.split('.'), nm, l);
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
    maj7: { en: 'major seven', he: "מז'ור שביעית" },
    '7': { en: 'dominant seven', he: 'דומיננט שביעית' },
    m7: { en: 'minor seven', he: 'מינור שביעית' },
    m7b5: { en: 'half-diminished', he: 'חצי מוקטן' },
    'ii-V-I': { en: 'two five one', he: 'שתיים חמש אחת' },
    'V-I': { en: 'five one', he: 'חמש אחת' },
    'I-vi-ii-V': { en: 'one six two five', he: 'אחת שש שתיים חמש' },
    'iii-vi-ii-V': { en: 'three six two five', he: 'שלוש שש שתיים חמש' },
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
  if (q.kind === 'wrong-note') return l === 'en' ? `a number, two to ${q.choices.length + 1}` : `מספר, משתיים עד ${q.choices.length + 1}`;
  if (q.kind === 'name-seq') return l === 'en' ? 'the note names in order' : 'את שמות התווים לפי הסדר';
  if (q.kind === 'degree-seq') return l === 'en' ? 'the degrees in order' : 'את הדרגות לפי הסדר';
  if (q.kind === 'note-name') return l === 'en' ? 'the note name' : 'את שם התו';
  if (q.kind === 'rhythm-dict') return l === 'en' ? 'the rhythm, like “ta ti-ti ta”' : 'את הקצב, למשל "טה טי-טי טה"';
  if (q.choices.length > 4) return l === 'en' ? 'a degree, one to seven' : 'דרגה, מאחת עד שבע';
  return orList(q.choices.map((c) => answerWord(q, c, l)), l);
}

/** Spoken prompt at the start of a round. */
export function roundPrompt(q: Question, l: Lang, nm: Naming, n: number): string {
  switch (q.kind) {
    case 'abs-note':
      return l === 'en' ? `Round ${n}. No reference. Which note is this?` : `סיבוב ${n}. בלי צליל ייחוס. איזה צליל זה?`;
    case 'slash':
      return l === 'en' ? `Round ${n}. A ${spokenNote(q.key, nm, l)} major chord. Which note is in the bass?` : `סיבוב ${n}. אקורד ${spokenNote(q.key, nm, l)} מז׳ור. איזה צליל בבס?`;
    case 'tf':
      return l === 'en' ? `Round ${n}. ${tfLine(q, nm, l)}. True or false?` : `סיבוב ${n}. ${tfLine(q, nm, l)}. נכון או לא?`;
    case 'wrong-note':
      return l === 'en' ? `Round ${n}. ${MODE_NAMES[q.mode].en} from ${spokenNote(q.key, nm, l)}. Which note is wrong? Say its number.` : `סיבוב ${n}. ${MODE_NAMES[q.mode].he} מ־${spokenNote(q.key, nm, l)}. איזה צליל שגוי? אמרו את המספר שלו.`;
    case 'mode-id':
      return l === 'en' ? `Round ${n}. Which mode is this? ${sayChoices(q, l)}?` : `סיבוב ${n}. איזה מודוס זה? ${sayChoices(q, l)}?`;
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
    case 'seventh':
      return l === 'en' ? `Round ${n}. Which seventh chord? ${cap(sayChoices(q, l))}?` : `סיבוב ${n}. איזה ספטאקורד? ${sayChoices(q, l)}?`;
    case 'progression':
      return l === 'en' ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Which progression?` : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. איזה מהלך?`;
    case 'name-seq':
      return q.given === 'sound'
        ? l === 'en'
          ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. ${q.degrees.length} notes. Name them in order.`
          : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. ${q.degrees.length} צלילים. אמרו את שמות התווים לפי הסדר.`
        : l === 'en'
          ? `Round ${n}. In ${spokenMajorKey(q.key, nm, l)}, which notes are degrees ${q.degrees.map((d) => deg(d, l)).join(', ')}?`
          : `סיבוב ${n}. ב${spokenMajorKey(q.key, nm, l)}, אילו תווים הם הדרגות ${q.degrees.map((d) => deg(d, l)).join(', ')}?`;
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
      if (q.promptBy === 'name' && q.names)
        return l === 'en'
          ? `Round ${n}. ${cap(spokenMajorKey(q.key, nm, l))}. Sing ${namesWords(q.names, nm, l)}.`
          : `סיבוב ${n}. ${spokenMajorKey(q.key, nm, l)}. שירו ${namesWords(q.names, nm, l)}.`;
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
      if (q.given === 'names' && q.names)
        return l === 'en'
          ? `In ${spokenMajorKey(q.key, nm, l)}: ${namesWords(q.names, nm, l)}. Which degrees?`
          : `ב${spokenMajorKey(q.key, nm, l)}: ${namesWords(q.names, nm, l)}. אילו דרגות?`;
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
    case 'abs-note': {
      const r = parseAlternatives(alternatives, (t) => parseNoteName(t, inputNaming));
      if (r.kind === 'answer') return { ...r, value: `${r.value.letter}${r.value.acc}` };
      if (r.kind === 'ambiguous') return { ...r, candidates: r.candidates.map((c) => `${c.letter}${c.acc}`) };
      return r;
    }
    case 'slash': {
      const r = parseAlternatives(alternatives, (t) => parseNoteName(t.replace(/.*(over|\/|על|בבס)/i, ' '), inputNaming));
      if (r.kind === 'answer') return { ...r, value: `${r.value.letter}${r.value.acc}` };
      if (r.kind === 'ambiguous') return { ...r, candidates: r.candidates.map((c) => `${c.letter}${c.acc}`) };
      return r;
    }
    case 'tf':
      return parseAlternatives(alternatives, parseTrueFalse);
    case 'wrong-note':
      return parseAlternatives(alternatives, parseDegree);
    case 'mode-id':
      return parseAlternatives(alternatives, (t) => parseMode(t, q.choices));
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
    case 'name-seq':
      return parseAlternatives(alternatives, (t) => parseNoteNameSequence(t, inputNaming));
    case 'seventh':
      return parseAlternatives(alternatives, parseSeventh);
    case 'progression':
      return parseAlternatives(alternatives, parseProgression);
    case 'sing-seq':
    case 'sing-run':
    case 'rhythm-read':
      return { kind: 'unrecognized', heard: alternatives[0] ?? '' };
    case 'rhythm-dict': {
      // What is graded is what is heard: any spelling that sounds the same counts (spec G.3).
      for (const alt of alternatives) {
        const cells = parseRhythmWords(alt, q.rhythm.meter ?? '4/4');
        if (!cells) continue;
        const said = { ...q.rhythm, cells: cells as CellId[] };
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
  if (q.kind === 'sing' || q.kind === 'sing-seq') return (l === 'en' ? (firstTry ? 'Spot on!' : 'There it is!') : firstTry ? 'מדויק!' : 'הנה זה!') + songLine(q, l);
  const w = answerWord(q, q.answer, l);
  return (l === 'en' ? (firstTry ? `Yes, ${w}!` : `That's it, ${w}.`) : firstTry ? `נכון, ${w}!` : `זהו, ${w}.`) + songLine(q, l);
}

export function retryText(q: Question, l: Lang): string {
  if (q.kind === 'degree') return narration.retry(l);
  return l === 'en' ? 'Not quite. Listen again.' : 'לא בדיוק. הקשיבו שוב.';
}

/** "That's the opening of Ode to Joy." — appended after a song item. */
export function songLine(q: Question, l: Lang): string {
  const id = (q.kind === 'degree-seq' || q.kind === 'sing-seq') && q.song;
  const s = id ? songById(id) : undefined;
  if (!s) return '';
  return l === 'en' ? ` That’s the opening of “${s.title.en}”.` : ` זו הפתיחה של "${s.title.he}".`;
}

export function revealText(q: Question, l: Lang, nm: Naming): string {
  return revealCore(q, l, nm) + songLine(q, l);
}

function revealCore(q: Question, l: Lang, nm: Naming): string {
  switch (q.kind) {
    case 'abs-note':
      return l === 'en' ? `It was ${spokenNote(q.target, nm, l)}. Your note, then this one.` : `זה היה ${spokenNote(q.target, nm, l)}. הצליל שלכם, ואז הזה.`;
    case 'slash':
      return l === 'en' ? `It was ${displayNote(q.key, nm, l)}/${displayNote(q.bass, nm, l)}: ${spokenNote(q.bass, nm, l)} in the bass.` : `זה היה ${displayNote(q.key, nm, l)}/${displayNote(q.bass, nm, l)}: ${spokenNote(q.bass, nm, l)} בבס.`;
    case 'tf':
      return l === 'en' ? `It was ${q.answer}: the intervals are ${tfTruthWords(q, 'en')}.` : `זה היה ${q.answer === 'true' ? 'נכון' : 'לא נכון'}: המרווחים הם ${tfTruthWords(q, 'he')}.`;
    case 'wrong-note':
      return l === 'en' ? `Note ${q.position} was ${q.alt > 0 ? 'too high' : 'too low'}. What you heard, then the right scale.` : `צליל ${q.position} היה ${q.alt > 0 ? 'גבוה מדי' : 'נמוך מדי'}. מה ששמעתם, ואז הסולם הנכון.`;
    case 'mode-id':
      return l === 'en' ? `It was ${MODE_NAMES[q.answer].en}. Your answer, then the right one.` : `זה היה ${MODE_NAMES[q.answer].he}. התשובה שלכם, ואז הנכונה.`;
    case 'note-name':
      return l === 'en'
        ? `It's ${spokenNote(q.target, nm, l)}: degree ${deg(q.degree, l)} of ${spokenMajorKey(q.key, nm, l)}.`
        : `זה ${spokenNote(q.target, nm, l)}: דרגה ${deg(q.degree, l)} ב${spokenMajorKey(q.key, nm, l)}.`;
    case 'sing-seq':
      return l === 'en' ? 'Here are the notes.' : 'אלה הצלילים.';
    case 'sing-run':
      return l === 'en' ? 'Here is the run: half speed, then at tempo.' : 'הנה הראן: בחצי מהירות, ואז בקצב.';
    case 'seventh':
      return l === 'en' ? `It was ${answerWord(q, q.answer, l)}. Your chord, then the right one.` : `זה היה ${answerWord(q, q.answer, l)}. האקורד שלכם, ואז הנכון.`;
    case 'progression':
      return l === 'en' ? `It was ${answerWord(q, q.answer, l)}. Your progression, then the right one.` : `זה היה ${answerWord(q, q.answer, l)}. המהלך שלכם, ואז הנכון.`;
    case 'name-seq':
      return l === 'en' ? `It was ${namesWords(q.names, nm, l)}: degrees ${q.degrees.map((d) => deg(d, l)).join(', ')}.` : `זה היה ${namesWords(q.names, nm, l)}: דרגות ${q.degrees.map((d) => deg(d, l)).join(', ')}.`;
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
  if (_q.kind === 'slash' && typeof a === 'string') {
    const b = pcFromKey(a);
    const tones: ChoiceLabel['tone'][] = ['mint', 'gold', 'lilac', 'coral'];
    if (b) return { big: `${displayNote(_q.key, nm, l)}/${displayNote(b, nm, l)}`, small: '', tone: tones[_q.choices.indexOf(a) % 4] };
  }
  if (_q.kind === 'tf') return a === 'true' ? { big: '✓', small: l === 'en' ? 'True' : 'נכון', tone: 'mint' } : { big: '✗', small: l === 'en' ? 'False' : 'לא נכון', tone: 'coral' };
  if (_q.kind === 'wrong-note' && typeof a === 'number') return { big: String(a), small: l === 'en' ? 'note' : 'צליל', tone: (['mint', 'gold', 'lilac', 'coral'] as ChoiceLabel['tone'][])[a % 4] };
  if (_q.kind === 'mode-id' && typeof a === 'string' && a in MODE_STEPS) {
    const tones: ChoiceLabel['tone'][] = ['mint', 'gold', 'lilac', 'coral'];
    return { big: '', small: MODE_NAMES[a as ModeId][l], tone: tones[(_q.choices as string[]).indexOf(a) % 4] };
  }
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
    maj7: { big: 'Δ7', small: 'Major 7', he: 'Δ7', heSmall: "מז'ור 7", tone: 'gold' },
    '7': { big: '7', small: 'Dominant 7', he: '7', heSmall: 'דומיננט 7', tone: 'coral' },
    m7: { big: 'm7', small: 'Minor 7', he: 'm7', heSmall: 'מינור 7', tone: 'lilac' },
    m7b5: { big: 'ø7', small: 'Half-dim.', he: 'ø7', heSmall: 'חצי מוקטן', tone: 'mint' },
    'ii-V-I': { big: 'ii–V–I', small: '', he: 'ii–V–I', heSmall: '', tone: 'gold' },
    'V-I': { big: 'V–I', small: '', he: 'V–I', heSmall: '', tone: 'mint' },
    'I-vi-ii-V': { big: 'I–vi–ii–V', small: 'turnaround', he: 'I–vi–ii–V', heSmall: 'טרנאראונד', tone: 'lilac' },
    'iii-vi-ii-V': { big: 'iii–vi–ii–V', small: '', he: 'iii–vi–ii–V', heSmall: '', tone: 'coral' },
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
export function askTemplate(q: Question, l: Lang, nm: Naming = 'letter'): string {
  if (q.kind === 'degree-seq' && q.bassLine) return l === 'en' ? 'Which bass notes, as degrees of {k} major?' : 'אילו צלילי בס, כדרגות ב־{k} מז׳ור?';
  switch (q.kind) {
    case 'abs-note':
      return l === 'en' ? 'Which note is this? (no reference)' : 'איזה צליל זה? (בלי ייחוס)';
    case 'slash':
      return l === 'en' ? '{k} major — which note is in the bass?' : '{k} מז׳ור — איזה צליל בבס?';
    case 'tf':
      return `${tfLine(q, nm, l)} — ${l === 'en' ? 'true or false?' : 'נכון או לא?'}`;
    case 'wrong-note':
      return l === 'en' ? `${MODE_NAMES[q.mode].en} from {k}: which note is wrong?` : `${MODE_NAMES[q.mode].he} מ־{k}: איזה צליל שגוי?`;
    case 'mode-id':
      return l === 'en' ? 'Which mode starts on {k}?' : 'איזה מודוס מתחיל ב־{k}?';
    case 'degree':
      if (q.direction === 'name→degree') return l === 'en' ? 'Which degree is {n} in {k} major?' : "איזו דרגה היא {n} ב-{k} מז'ור?";
      return l === 'en' ? 'Which degree is {n}?' : 'איזו דרגה זה {n}?';
    case 'note-name':
      return q.direction === 'heard-pitch→name' ? (l === 'en' ? 'Which note is it?' : 'איזה תו זה?') : l === 'en' ? `Which note is degree ${q.degree}?` : `איזה תו הוא דרגה ${q.degree}?`;
    case 'sing-seq':
      if (q.promptBy === 'name' && q.names) return l === 'en' ? `Sing ${namesShown(q.names, nm, l)}` : `שירו ${namesShown(q.names, nm, l)}`;
      return l === 'en' ? `Sing ${q.degrees.join(' – ')}` : `שירו ${q.degrees.join(' – ')}`;
    case 'seventh':
      return l === 'en' ? 'Which seventh chord?' : 'איזה ספטאקורד?';
    case 'progression':
      return l === 'en' ? 'Which progression?' : 'איזה מהלך?';
    case 'name-seq':
      return q.given === 'sound' ? (l === 'en' ? 'Which notes, in order?' : 'אילו תווים, לפי הסדר?') : l === 'en' ? `Which notes are degrees ${q.degrees.join(' – ')}?` : `אילו תווים הם הדרגות ${q.degrees.join(' – ')}?`;
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
      if (q.given === 'names' && q.names) return l === 'en' ? `${namesShown(q.names, nm, l)}: which degrees?` : `${namesShown(q.names, nm, l)}: אילו דרגות?`;
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
  if (q.kind === 'name-seq') return voice ? (l === 'en' ? 'Say the note names in order' : 'אמרו את שמות התווים לפי הסדר') : l === 'en' ? 'Tap the notes in order, then Done' : 'לחצו על התווים לפי הסדר, ואז סיום';
  if (q.kind === 'degree-seq') return voice ? (l === 'en' ? 'Say them in order, e.g. “one three five”' : 'אמרו לפי הסדר, למשל "אחת שלוש חמש"') : l === 'en' ? 'Tap the degrees in order, then Done' : 'לחצו על הדרגות לפי הסדר, ואז סיום';
  if (q.kind === 'tf') return voice ? (l === 'en' ? 'Say “true” or “false”' : 'אמרו "נכון" או "לא"') : l === 'en' ? 'Tap ✓ or ✗' : 'בחרו ✓ או ✗';
  if (q.kind === 'wrong-note') return voice ? (l === 'en' ? 'Say the number of the wrong note (2, 3 …)' : 'אמרו את המספר של הצליל השגוי (2, 3 …)') : l === 'en' ? 'Tap the wrong note' : 'בחרו את הצליל השגוי';
  if (q.kind === 'mode-id') return voice ? (l === 'en' ? 'Say the mode name' : 'אמרו את שם המודוס') : l === 'en' ? 'Tap the mode' : 'בחרו מודוס';
  if (!voice) return l === 'en' ? 'Tap your answer' : 'בחרו תשובה';
  if (q.choices.length > 4) return l === 'en' ? 'Say a degree, “one” to “seven”' : 'אמרו דרגה, מ"אחת" עד "שבע"';
  const ws = q.choices.map((c) => `“${answerWord(q, c, l)}”`);
  return `${l === 'en' ? 'Say' : 'אמרו'} ${orList(ws, l)}`;
}

/** Short visual description of a question (badge + recap). */
export function questionBadge(q: Question, l: Lang, nm: Naming): { key?: PitchClass; text: string } {
  const major = l === 'en' ? 'major' : "מז'ור";
  switch (q.kind) {
    case 'abs-note':
      return { text: l === 'en' ? 'Absolute pitch' : 'שמיעה מוחלטת' };
    case 'slash':
      return { text: `${displayNote(q.key, nm, l)} ${l === 'en' ? 'major / bass' : 'מז׳ור / בס'}` };
    case 'tf':
      return { text: l === 'en' ? 'True or false?' : 'נכון או לא?' };
    case 'wrong-note':
      return { text: `${MODE_NAMES[q.mode][l]} · ${l === 'en' ? 'from' : 'מ־'} ${displayNote(q.key, nm, l)}` };
    case 'mode-id':
      return { text: `${l === 'en' ? 'Scale from' : 'סולם מ־'} ${displayNote(q.key, nm, l)} · ${q.dir === 'up' ? (l === 'en' ? 'up' : 'עולה') : l === 'en' ? 'up & down' : 'עולה ויורד'}` };
    case 'degree':
    case 'cadence':
    case 'sing':
    case 'degree-seq':
    case 'note-name':
    case 'sing-seq':
    case 'name-seq':
      return { key: q.key, text: major };
    case 'sing-run':
    case 'run-id':
      return { key: q.key, text: `${q.run.offsets.length} ${l === 'en' ? 'notes' : 'צלילים'} · ${q.run.nps} ${l === 'en' ? 'n/s' : 'בשנייה'}` };
    case 'quality':
      return { text: `${l === 'en' ? 'Chord on' : 'אקורד על'} ${displayNote(q.root, nm, l)}` };
    case 'seventh':
      return { text: `${l === 'en' ? 'Seventh chord on' : 'ספטאקורד על'} ${displayNote(q.root, nm, l)}` };
    case 'progression':
      return { key: q.key, text: l === 'en' ? 'jazz progression' : 'מהלך ג׳אז' };
    case 'interval':
      return { text: q.mode === 'melodic' ? (l === 'en' ? 'One after the other' : 'אחד אחרי השני') : l === 'en' ? 'Together' : 'ביחד' };
    case 'rhythm-read':
    case 'rhythm-dict':
      return { text: `${q.rhythm.meter ?? '4/4'}${q.rhythm.swing ? ' swing' : ''} · ${q.rhythm.meter === '6/8' || q.rhythm.meter === '12/8' ? `♩. = ${Math.round(q.bpm / 1.5)}` : `${q.bpm} BPM`} · ${q.rhythm.bars} ${l === 'en' ? (q.rhythm.bars > 1 ? 'bars' : 'bar') : q.rhythm.bars > 1 ? 'תיבות' : 'תיבה'}` };
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
  if (q.kind === 'name-seq') return namesShown(String(a).split('.'), nm, l);
  return typeof a === 'number' ? String(a) : choiceLabel(q, a, l).small;
}

/**
 * Does lighting the sounding keys during the question reveal the answer? True for every listening task
 * (degrees, chords, cadences, intervals, inversions, sequences, runs, jazz, songs, echo singing). The
 * exceptions are singing from a degree / name / description: only the key and tonic sound, as context.
 */
export function keysGiveAway(q: Question): boolean {
  if (q.kind === 'sing') return q.promptBy === 'echo';
  if (q.kind === 'sing-seq') return false;
  if (q.kind === 'sing-run') return q.prompt === 'echo';
  return true;
}



/** "B –m3→ D –♭5→ A♭" in the player's naming (true-or-false questions). */
function tfLine(q: Extract<Question, { kind: 'tf' }>, nm: Naming, l: Lang): string {
  const [a, b, c] = q.names.map((p) => displayNote(p, nm, l));
  return `${a} –${q.shownLeft}→ ${b} –${q.shownRight}→ ${c}`;
}
function tfTruthWords(q: Extract<Question, { kind: 'tf' }>, l: Lang): string {
  const name = (semis: number) => (['', 'm2', 'M2', 'm3', 'M3', 'P4', l === 'en' ? 'tritone' : 'טריטון', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'][semis] ?? String(semis));
  return `${name(q.midis[1] - q.midis[0])}, ${name(q.midis[2] - q.midis[1])}`;
}
