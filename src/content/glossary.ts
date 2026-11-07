// Plain-language glossary (spec AC): every music word a beginner meets in the first lessons, explained
// in one friendly sentence with a sound. Mini-lessons show the words of each step as tappable chips.

import type { Stimulus } from '../engine/lesson';
import type { Bi } from './miniTypes';

export interface Term {
  id: string;
  label: Bi;
  /** One or two plain sentences — no other jargon. */
  explain: Bi;
  play: Stimulus[];
  /** What to look for in a sentence (English is matched case-insensitively). */
  match: { en: RegExp; he: RegExp };
}

const notes = (midis: number[], each = 0.4): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.3): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
const C = { letter: 'C' as const, acc: 0 as const };
const clicks = (n: number, gap: number): Stimulus => ({
  kind: 'events',
  events: Array.from({ length: n }, (_, i) => ({ midi: 76, start: i * gap, duration: 0.05, velocity: i % 4 === 0 ? 0.7 : 0.45, perc: i % 4 === 0 ? ('accent' as const) : ('click' as const) })),
  length: n * gap + 0.2,
});
/** Hebrew has no \b — a word edge is anything that is not a Hebrew letter. */
const heWord = (body: string) => new RegExp(`(^|[^\\u05D0-\\u05EA])(?:[ובלהמש]{0,2})(?:${body})(?=$|[^\\u05D0-\\u05EA])`);

export const GLOSSARY: Term[] = [
  {
    id: 'pitch',
    label: { en: 'pitch', he: 'גובה צליל' },
    explain: { en: 'How high or low a note sounds. A bird sings high, a big drum sounds low.', he: 'כמה גבוה או נמוך נשמע צליל. ציפור שרה גבוה, תוף גדול נשמע נמוך.' },
    play: [notes([48], 0.9), rest(0.3), notes([79], 0.9)],
    match: { en: /\bpitch(es)?\b/i, he: /גובה צליל|גובה הצליל/ },
  },
  {
    id: 'note',
    label: { en: 'note', he: 'תו / צליל' },
    explain: { en: 'One single musical sound. Notes have letter names: C D E F G A B (Do Re Mi Fa Sol La Si).', he: 'צליל מוזיקלי אחד. לכל צליל יש שם: דו רה מי פה סול לה סי (או באותיות C D E F G A B).' },
    play: [notes([60, 62, 64, 65, 67, 69, 71], 0.32)],
    match: { en: /\bnote names?\b/i, he: heWord('שמות תווים|שם התו|תווים') },
  },
  {
    id: 'melody',
    label: { en: 'melody', he: 'מנגינה' },
    explain: { en: 'Notes one after another that make a tune you could sing.', he: 'צלילים אחד אחרי השני שיוצרים מנגינה שאפשר לשיר.' },
    play: [notes([60, 62, 64, 60, 64, 65, 67], 0.3)],
    match: { en: /\bmelod(y|ies)\b/i, he: heWord('מלודיה|מלודיות') },
  },
  {
    id: 'key',
    label: { en: 'key', he: 'סולם' },
    explain: { en: 'The family of notes a song uses, built around one home note. "In G" means G is home.', he: 'משפחת הצלילים ששיר משתמש בה, סביב צליל בית אחד. "בסול" אומר שסול הוא הבית.' },
    play: [{ kind: 'cadence', key: C }, notes([60, 62, 64, 65, 67, 69, 71, 72], 0.25)],
    match: { en: /\bkeys?\b/i, he: heWord('סולם|סולמות|סולמים') },
  },
  {
    id: 'scale',
    label: { en: 'scale', he: 'סולם (בסדר עולה)' },
    explain: { en: 'The notes of a key played in order, step by step, like a staircase.', he: 'הצלילים של הסולם מנוגנים לפי הסדר, צעד אחרי צעד, כמו מדרגות.' },
    play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.25)],
    match: { en: /\bscales?\b/i, he: /$^/ },
  },
  {
    id: 'tonic',
    label: { en: 'home note (tonic)', he: 'הבית (טוניקה)' },
    explain: { en: 'The note a song feels finished on — where the music wants to rest. We call it 1.', he: 'הצליל שבו שיר מרגיש גמור — המקום שבו המוזיקה רוצה לנוח. קוראים לו 1.' },
    play: [notes([67, 65, 64, 62], 0.3), notes([60], 1.2)],
    match: { en: /\btonic\b|\bhome note\b/i, he: heWord('טוניקה|צליל הבית') },
  },
  {
    id: 'degree',
    label: { en: 'degree (number)', he: 'דרגה (מספר בסולם)' },
    explain: { en: 'A note’s number in the key: home is 1, the next step up is 2, and so on up to 7.', he: 'המספר של צליל בסולם: הבית הוא 1, הצעד הבא למעלה הוא 2, וכך עד 7.' },
    play: [notes([60, 62, 64, 65, 67, 69, 71], 0.3)],
    match: { en: /\bdegrees?\b/i, he: heWord('דרגה|דרגות|הדרגה|הדרגות|מדרגה') },
  },
  {
    id: 'interval',
    label: { en: 'interval', he: 'מרווח' },
    explain: { en: 'The distance between two notes — a small step or a big jump.', he: 'המרחק בין שני צלילים — צעד קטן או קפיצה גדולה.' },
    play: [notes([60, 62], 0.5), rest(0.4), notes([60, 72], 0.5)],
    match: { en: /\bintervals?\b/i, he: heWord('מרווח|מרווחים') },
  },
  {
    id: 'half-step',
    label: { en: 'half step', he: 'חצי טון' },
    explain: { en: 'The smallest step in Western music: from one piano key to the very next one, black or white.', he: 'הצעד הכי קטן במוזיקה המערבית: מקליד אחד בפסנתר לקליד הצמוד אליו, שחור או לבן.' },
    play: [notes([64, 65, 64, 65], 0.4)],
    match: { en: /\bhalf[- ]steps?\b|\bsemitones?\b/i, he: /חצי טון|חצאי טון|חצי־טון/ },
  },
  {
    id: 'third',
    label: { en: 'third', he: 'טרצה' },
    explain: { en: 'Skip one note of the scale: Do to Mi. It sounds sweet and is the heart of a chord.', he: 'מדלגים על צליל אחד בסולם: מדו למי. נשמע מתוק, והוא הלב של האקורד.' },
    play: [notes([60, 64], 0.6), chord([60, 64], 1)],
    match: { en: /\bthirds?\b/i, he: /טרצ/ },
  },
  {
    id: 'fifth',
    label: { en: 'fifth', he: 'קווינטה' },
    explain: { en: 'From Do to Sol — five notes up. Strong and open, like the start of a fanfare.', he: 'מדו לסול — חמישה צלילים למעלה. חזק ופתוח, כמו פתיחה של תרועה.' },
    play: [notes([60, 67], 0.6), chord([60, 67], 1)],
    match: { en: /\bfifths?\b/i, he: /קווינט/ },
  },
  {
    id: 'octave',
    label: { en: 'octave', he: 'אוקטבה' },
    explain: { en: 'The same note, higher or lower — like a man and a child singing the same tune.', he: 'אותו צליל, גבוה או נמוך יותר — כמו גבר וילד ששרים את אותה מנגינה.' },
    play: [notes([60, 72], 0.6), chord([60, 72], 1)],
    match: { en: /\boctaves?\b/i, he: /אוקטב/ },
  },
  {
    id: 'chord',
    label: { en: 'chord', he: 'אקורד' },
    explain: { en: 'Three or more notes played together. Guitarists strum chords under a song.', he: 'שלושה צלילים או יותר שמנוגנים ביחד. גיטריסטים פורטים אקורדים מתחת לשיר.' },
    play: [notes([60, 64, 67], 0.35), chord([60, 64, 67], 1.4)],
    match: { en: /\bchords?\b/i, he: /אקורד/ },
  },
  {
    id: 'major-minor',
    label: { en: 'major / minor', he: 'מז׳ור / מינור' },
    explain: { en: 'Two moods of chords and keys: major usually sounds bright, minor sounds darker or sadder.', he: 'שני מצבי רוח של אקורדים וסולמות: מז׳ור נשמע בדרך כלל בהיר, מינור כהה או עצוב יותר.' },
    play: [chord([60, 64, 67], 1.2), rest(0.4), chord([60, 63, 67], 1.4)],
    match: { en: /\bmajor\b|\bminor\b/i, he: /מז׳ור|מז'ור|מינור/ },
  },
  {
    id: 'cadence',
    label: { en: 'cadence', he: 'קדנצה (סיומת)' },
    explain: { en: 'The chords at the end of a phrase — like punctuation: a full stop, or a question mark.', he: 'האקורדים בסוף משפט מוזיקלי — כמו סימני פיסוק: נקודה, או סימן שאלה.' },
    play: [{ kind: 'cadence', key: C }],
    match: { en: /\bcadences?\b/i, he: /קדנצ/ },
  },
  {
    id: 'bass',
    label: { en: 'bass', he: 'בס' },
    explain: { en: 'The lowest note you hear — the floor the rest of the music stands on.', he: 'הצליל הכי נמוך שאתם שומעים — הרצפה שעליה עומדת שאר המוזיקה.' },
    play: [notes([36, 43, 41, 43], 0.45)],
    match: { en: /\bbass\b/i, he: heWord('בס') },
  },
  {
    id: 'sharp-flat',
    label: { en: 'sharp ♯ / flat ♭', he: 'דיאז ♯ / במול ♭' },
    explain: { en: 'Sharp means a half step higher, flat a half step lower: F♯ is just above F, B♭ just below B.', he: 'דיאז זה חצי טון למעלה, במול חצי טון למטה: פה דיאז קצת מעל פה, סי במול קצת מתחת לסי.' },
    play: [notes([65, 66], 0.5), rest(0.3), notes([71, 70], 0.5)],
    match: { en: /\bsharps?\b|\bflats?\b|[♯♭]/i, he: /דיאז|במול|[♯♭]/ },
  },
  {
    id: 'beat',
    label: { en: 'beat', he: 'פעמה' },
    explain: { en: 'The steady pulse you tap your foot to. Most songs group beats in fours.', he: 'הדופק הקבוע שמקישים לו ברגל. ברוב השירים הפעמות מתקבצות בארבע.' },
    play: [clicks(8, 0.6)],
    match: { en: /\bbeats?\b/i, he: heWord('פעמה|פעמות|הפעמה') },
  },
  {
    id: 'tempo',
    label: { en: 'tempo', he: 'טמפו' },
    explain: { en: 'How fast the beat goes. Measured in beats per minute (BPM).', he: 'כמה מהר הפעמה. נמדד בפעמות לדקה (BPM).' },
    play: [clicks(4, 0.9), rest(0.4), clicks(8, 0.35)],
    match: { en: /\btempo\b|\bbpm\b/i, he: /טמפו|BPM/ },
  },
  {
    id: 'rhythm',
    label: { en: 'rhythm', he: 'קצב' },
    explain: { en: 'The pattern of long and short sounds on top of the beat.', he: 'התבנית של צלילים ארוכים וקצרים מעל הפעמה.' },
    play: [notes([67, 67], 0.25), notes([67], 0.5), notes([67, 67, 67], 0.17), notes([67], 0.6)],
    match: { en: /\brhythms?\b/i, he: heWord('קצב|מקצב') },
  },
  {
    id: 'transpose',
    label: { en: 'transpose', he: 'טרנספוזיציה' },
    explain: { en: 'Moving a whole tune higher or lower so it starts on a new note — same tune, new key.', he: 'להזיז מנגינה שלמה למעלה או למטה כך שתתחיל בצליל אחר — אותה מנגינה, סולם חדש.' },
    play: [notes([60, 64, 67], 0.35), rest(0.4), notes([65, 69, 72], 0.35)],
    match: { en: /\btranspos/i, he: /טרנספוז|להעביר סולם/ },
  },
  // ---- 0.38 (spec AE §10.4) ----
  {
    id: 'seventh-chord',
    label: { en: 'seventh chord', he: 'ספטאקורד' },
    explain: { en: 'A chord of four notes: a triad with one more note on top, a seventh above the root. It sounds richer, often jazzy.', he: 'אקורד של ארבעה צלילים: משולש ועוד צליל אחד מעליו, ספטימה מעל השורש. נשמע עשיר יותר, לפעמים ג׳אזי.' },
    play: [chord([48, 52, 55, 59]), rest(), chord([48, 52, 55, 58])],
    match: { en: /seventh chords?/i, he: heWord('ספטאקורד(ים)?') },
  },
  {
    id: 'neapolitan',
    label: { en: 'Neapolitan chord', he: 'אקורד נפוליטני' },
    explain: { en: 'A major chord on the lowered second step (D♭ in C), usually just before the dominant. Dark and dramatic.', he: 'אקורד מז׳ור על הדרגה השנייה המונמכת (רה♭ בדו), בדרך כלל ממש לפני הדומיננטה. כהה ודרמטי.' },
    play: [chord([53, 56, 61]), chord([55, 59, 62]), chord([48, 52, 55])],
    match: { en: /neapolitan/i, he: /נפוליטני/ },
  },
  {
    id: 'aug-sixth',
    label: { en: 'augmented sixth', he: 'סקסטה מוגדלת' },
    explain: { en: 'A chord whose two outer notes squeeze outwards onto the same note an octave apart — a strong pull to the dominant.', he: 'אקורד ששני הצלילים החיצוניים שלו נפתחים החוצה אל אותו צליל באוקטבה — משיכה חזקה לדומיננטה.' },
    play: [chord([44, 48, 54]), chord([43, 50, 55])],
    match: { en: /augmented sixth|(it|fr|ger)+6/i, he: /סקסטה מוגדלת/ },
  },
  {
    id: 'figured-bass',
    label: { en: 'figured bass', he: 'בס ממוספר' },
    explain: { en: 'A bass line with small numbers under it that tell which chord to play above each note.', he: 'קו בס עם מספרים קטנים מתחתיו שאומרים איזה אקורד לנגן מעל כל צליל.' },
    play: [notes([48, 52, 55], 0.35)],
    match: { en: /figured bass|figures/i, he: /בס ממוספר|ספרות הבס/ },
  },
  {
    id: 'caged',
    label: { en: 'CAGED', he: 'CAGED' },
    explain: { en: 'Five chord shapes (C, A, G, E, D) that move up the guitar neck — every chord can be played with each of them.', he: 'חמש צורות אקורד (C, A, G, E, D) שזזות לאורך צוואר הגיטרה — כל אקורד אפשר לנגן בכל אחת מהן.' },
    play: [chord([48, 52, 55, 60, 64])],
    match: { en: /CAGED/, he: /CAGED/ },
  },
  {
    id: 'audiation',
    label: { en: 'inner hearing', he: 'שמיעה פנימית' },
    explain: { en: 'Hearing music in your head when no sound is playing — keeping a tune going in silence.', he: 'לשמוע מוזיקה בראש כשאין צליל — להמשיך מנגינה בתוך השקט.' },
    play: [notes([60, 62, 64], 0.4), rest(1.2), notes([67], 0.6)],
    match: { en: /inner hearing|audiat/i, he: /שמיעה פנימית/ },
  },
  {
    id: 'eq',
    label: { en: 'EQ', he: 'EQ (אקולייזר)' },
    explain: { en: 'Turning some frequencies up or down — more bass, less harshness, more air.', he: 'להגביר או להחליש תדרים מסוימים — יותר בס, פחות צורמני, יותר אוויר.' },
    play: [notes([48, 72], 0.6)],
    match: { en: /EQ|equali[sz]/i, he: /אקולייזר|EQ/ },
  },
  {
    id: 'compression',
    label: { en: 'compression', he: 'דחיסה' },
    explain: { en: 'Making the loud parts softer so everything sounds even and punchy.', he: 'להחליש את החלקים החזקים כדי שהכול יישמע אחיד ובועט.' },
    play: [clicks(4, 0.3)],
    match: { en: /compress/i, he: /דחיסה|קומפרסור/ },
  },
  {
    id: 'reverb',
    label: { en: 'reverb', he: 'הדהוד' },
    explain: { en: 'The sound of a room: the tail of echoes after a note — small in a room, long in a cathedral.', he: 'הצליל של חדר: זנב ההדים אחרי צליל — קצר בחדר, ארוך בקתדרלה.' },
    play: [notes([67], 0.8)],
    match: { en: /reverb/i, he: /הדהוד|ריוורב/ },
  },
];

export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(GLOSSARY.map((t) => [t.id, t]));

/** The glossary words that appear in a sentence, in reading order (at most `max`). */
export function termsIn(text: string, lang: 'en' | 'he', max = 3): Term[] {
  const hits: { t: Term; at: number }[] = [];
  for (const t of GLOSSARY) {
    const m = t.match[lang].exec(text);
    if (m) hits.push({ t, at: m.index });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, max).map((h) => h.t);
}
