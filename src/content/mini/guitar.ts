// GUITAR_DEEPENING (2026-11-11): quick lessons for the new guitar concepts — the guitarist's ear, comping on
// standards and chord melody, Barry Harris on the neck, odd meters and metric modulation. Own words and examples; the
// drills then measure them in time. Opened from the family's page in Technique (FAMILY_LESSON).

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.35): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
/** A pulse of `n` notes `each` seconds apart on one pitch, louder on the accented ones (group starts). */
const pulse = (n: number, each: number, accents: number[], midi = 52): Stimulus => ({
  kind: 'events',
  events: Array.from({ length: n }, (_, i) => ({ midi, start: i * each, duration: each * 0.8, velocity: accents.includes(i) ? 0.9 : 0.45 })),
  length: n * each,
});

export const LESSONS: MiniLesson[] = [
  {
    id: 'g-ear-echo',
    area: 'play',
    emoji: '𝄞',
    title: { en: "The guitarist's ear", he: 'השמיעה של הגיטריסט' },
    takeaway: { en: 'Hear it, then find it on the neck: the answer is measured by what you play, in time.', he: 'שומעים, ואז מוצאים על הצוואר: התשובה נמדדת לפי מה שמנגנים, בזמן.' },
    steps: [
      {
        say: { en: 'Hi {name}! In these levels the band plays first, then it is your turn on the guitar.', he: 'היי {name}! בשלבים האלה הלהקה מנגנת קודם, ואז תורכם על הגיטרה.' },
        play: [notes([57, 60, 62, 64]), rest(0.4), notes([57, 60, 62, 64])],
      },
      {
        say: { en: 'Sing it inside first, then find the first note. Every line starts on a note I tell you: the root or the fifth.', he: 'שרים בפנים קודם, ואז מוצאים את הצליל הראשון. כל קו מתחיל בצליל שאני אומר: היסוד או הקווינטה.' },
        play: [notes([57, 64], 0.6)],
      },
      {
        say: { en: 'For chords, listen to the lowest note: that is the root you play on strings six and five.', he: 'באקורדים מקשיבים לצליל הנמוך ביותר: זה היסוד שמנגנים על מיתרים שש וחמש.' },
        play: [chord([45, 57, 60, 64], 1), chord([50, 57, 62, 65], 1)],
      },
      {
        say: { en: 'Any octave and any position count. Play on the beat after the call; the call itself is never taken for your answer.', he: 'כל אוקטבה וכל מצב נחשבים. מנגנים על הפעמה אחרי הקריאה; הקריאה עצמה אף פעם לא נחשבת לתשובה שלכם.' },
        show: { text: { en: 'hear · find · play', he: 'שומעים · מוצאים · מנגנים' } },
      },
      {
        say: { en: 'Your turn: the first call is short and slow. Listen once, breathe on the empty beat, then answer on the next bar line.', he: 'תורכם: הקריאה הראשונה קצרה ואיטית. מקשיבים פעם אחת, נושמים על הפעמה הריקה, ועונים על קו התיבה הבא.' },
        show: { text: { en: 'call · breath · answer', he: 'קריאה · נשימה · תשובה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why the guitar and not the screen? Because finding a sound on the neck is the skill a player needs on the bandstand: hear a line, find it, play it in time.', he: 'למה בגיטרה ולא במסך? כי למצוא צליל על הצוואר זו המיומנות שנגן צריך על הבמה: לשמוע קו, למצוא אותו ולנגן אותו בזמן.' },
        play: [notes([52, 55, 57, 55, 52], 0.3)],
      },
      {
        say: { en: 'Start from the tonic. Most lines lean on it, and from home every other note is a distance you can learn to feel.', he: 'מתחילים מהטוניקה. רוב הקווים נשענים עליה, ומהבית כל צליל אחר הוא מרחק שאפשר ללמוד להרגיש.' },
        play: [notes([57, 64, 57], 0.5)],
      },
      {
        say: { en: 'For rhythm, mute the strings with the fretting hand and strum: only the rhythm counts, not the pitch.', he: 'במקצב משתיקים את המיתרים ביד הלוחצת ופורטים: רק המקצב נחשב, לא הגובה.' },
        play: [chord([52, 57, 62], 0.2), rest(0.25), chord([52, 57, 62], 0.2), chord([52, 57, 62], 0.2)],
      },
      {
        say: { en: 'For the root finder, hum the lowest voice of each chord. Chords come in inversions on purpose, so the top voice will not give it away.', he: 'במוצא היסודות מזמזמים את הקול הנמוך של כל אקורד. האקורדים מגיעים בהיפוכים בכוונה, כדי שהקול העליון לא יסגיר את התשובה.' },
        play: [chord([52, 57, 60], 1), chord([53, 57, 62], 1)],
      },
      {
        say: { en: 'A common mistake is to answer late while still searching. Better to play a wrong note on time and fix it next round than to drop the bar.', he: 'טעות נפוצה היא לענות באיחור תוך כדי חיפוש. עדיף לנגן צליל שגוי בזמן ולתקן בסיבוב הבא מאשר לאבד את התיבה.' },
        show: { text: { en: 'on time first', he: 'קודם בזמן' } },
      },
      {
        say: { en: 'Practise away from the app too: sing a line you know, then find it on one string first, then inside one position. The ear and the hand learn together.', he: 'מתרגלים גם מחוץ לאפליקציה: שרים קו שמכירים, ואז מוצאים אותו קודם על מיתר אחד ואחר כך בתוך מצב אחד. האוזן והיד לומדות יחד.' },
        play: [notes([57, 59, 60, 62, 64], 0.3)],
      },
    ],
  },
  {
    id: 'g-jazz-comp',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Comping and chord melody', he: 'ליווי ואקורד-מלודיה' },
    takeaway: { en: 'Shells hold the 3rd and 7th; drop-2 puts the melody on top. The rhythm is the comp.', he: 'קונכיות מחזיקות את הטרצה והספטימה; דרופ 2 שם את המנגינה למעלה. המקצב הוא הליווי.' },
    steps: [
      {
        say: { en: 'A jazz guitarist rarely plays full chords. Three notes are enough: the root, the 3rd and the 7th.', he: 'גיטריסט ג׳אז כמעט לא מנגן אקורדים מלאים. שלושה צלילים מספיקים: היסוד, הטרצה והספטימה.' },
        play: [chord([50, 60, 65], 1), chord([55, 59, 65], 1), chord([48, 59, 64], 1.6)],
      },
      {
        say: { en: 'The 3rd and 7th move by step from chord to chord. That small motion is what makes the changes sound.', he: 'הטרצה והספטימה זזות בצעדים מאקורד לאקורד. התנועה הקטנה הזאת היא מה שמשמיע את המהלך.' },
        play: [notes([65, 65, 64], 0.7)],
      },
      {
        say: { en: 'Comping is rhythm: the Charleston, four to the bar, or a push on the "and" of four into the next chord.', he: 'ליווי הוא מקצב: צ׳רלסטון, ארבע לתיבה, או דחיפה על ה"וְ" של ארבע אל האקורד הבא.' },
        play: [chord([50, 60, 65], 0.5), rest(0.25), chord([50, 60, 65], 0.9)],
      },
      {
        say: { en: 'In chord melody the tune sits on the top string and a drop-2 voicing hangs under every melody note.', he: 'באקורד-מלודיה המנגינה יושבת על המיתר העליון, וקול דרופ 2 תלוי מתחת לכל צליל מנגינה.' },
        play: [chord([53, 60, 64, 69], 1), chord([55, 59, 65, 67], 1), chord([52, 59, 64, 67], 1.6)],
      },
      {
        say: { en: 'Your turn: shells first, four to the bar, then the Charleston. Keep the chords short so the bass and drums can breathe.', he: 'תורכם: קודם קונכיות, ארבע לתיבה, ואז צ׳רלסטון. משאירים את האקורדים קצרים כדי שהבס והתופים יוכלו לנשום.' },
        show: { text: { en: 'R · 3 · 7', he: 'R · 3 · 7' } },
      },
    ],
    more: [
      {
        say: { en: 'Freddie Green played short shells on every beat in the Basie band: barely heard alone, but the whole band leaned on them.', he: 'פרדי גרין ניגן קונכיות קצרות על כל פעמה בלהקה של בייסי: כמעט לא שומעים אותן לבד, אבל כל הלהקה נשענה עליהן.' },
        play: [chord([43, 53, 59], 0.3), rest(0.2), chord([43, 53, 59], 0.3), rest(0.2), chord([43, 53, 59], 0.3)],
      },
      {
        say: { en: 'Drop-2: take a close four-note chord and drop its second voice from the top an octave. On the guitar it fits four neighbouring strings.', he: 'דרופ 2: לוקחים אקורד צפוף של ארבעה צלילים ומורידים אוקטבה את הקול השני מלמעלה. בגיטרה הוא נכנס בארבעה מיתרים שכנים.' },
        play: [chord([60, 64, 67, 71], 1), chord([55, 60, 64, 71], 1)],
      },
      {
        say: { en: 'Voice leading: from one chord to the next, move each voice to the nearest note. The top voice then sings a line of its own.', he: 'הובלת קולות: מאקורד לאקורד מזיזים כל קול לצליל הקרוב. הקול העליון שר אז קו משלו.' },
        play: [chord([53, 60, 65, 69], 0.9), chord([53, 59, 65, 67], 0.9), chord([52, 59, 64, 67], 1.2)],
      },
      {
        say: { en: 'Tritone substitution: a dominant can be replaced by the dominant a tritone away. They share the 3rd and 7th, and the bass slides down by half steps.', he: 'תחליף טריטון: אפשר להחליף דומיננטה בדומיננטה במרחק טריטון. יש להן אותן טרצה וספטימה, והבס מחליק למטה בחצאי טונים.' },
        play: [chord([50, 60, 65], 0.9), chord([49, 59, 65], 0.9), chord([48, 59, 64], 1.2)],
      },
      {
        say: { en: 'To keep: three notes are a chord, the rhythm is the comp, and the melody on top of drop-2 is chord melody. The drills measure each hit in time.', he: 'מה לזכור: שלושה צלילים הם אקורד, המקצב הוא הליווי, והמנגינה מעל דרופ 2 היא אקורד-מלודיה. התרגילים מודדים כל מכה בזמן.' },
        show: { text: { en: 'shells · drop-2 · rhythm', he: 'קונכיות · דרופ 2 · מקצב' } },
      },
      {
        say: { en: 'Listen to the great comping guitarists and notice how little they play: a short chord, a long silence, and every hit placed exactly with the drummer.', he: 'מקשיבים לגיטריסטים הגדולים בליווי ושמים לב כמה מעט הם מנגנים: אקורד קצר, שקט ארוך, וכל מכה במקום המדויק עם המתופף.' },
        play: [chord([50, 60, 65], 0.3), rest(0.6), chord([55, 59, 65], 0.3)],
      },
    ],
  },
  {
    id: 'g-harris-neck',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Barry Harris on the neck', he: 'בארי האריס על הצוואר' },
    takeaway: { en: 'The 6th chord and the diminished make an 8-note scale; on the dominant scale, chord tones land on the beats.', he: 'אקורד השישית והמוקטן יוצרים סולם של 8 צלילים; בסולם הדומיננטה צלילי האקורד נוחתים על הפעמות.' },
    steps: [
      {
        say: { en: 'Barry Harris adds one note to the major scale: the raised 5th. C, D, E, F, G, G sharp, A, B.', he: 'בארי האריס מוסיף צליל אחד לסולם המז׳ורי: הקווינטה המוגבהת. דו, רה, מי, פה, סול, סול דיאז, לה, סי.' },
        play: [notes([60, 62, 64, 65, 67, 68, 69, 71, 72], 0.3)],
      },
      {
        say: { en: 'Now every chord tone of C6 falls on a beat and every other note sits between: the line swings by itself.', he: 'עכשיו כל צליל של C6 נופל על פעמה וכל צליל אחר יושב ביניהם: הקו מסווינג מעצמו.' },
        play: [notes([72, 71, 69, 68, 67, 65, 64, 62, 60], 0.3)],
      },
      {
        say: { en: 'On a dominant, coming down from a chord tone, add a half step between the root and the flat 7th.', he: 'על דומיננטה, בירידה מצליל אקורד, מוסיפים חצי טון בין היסוד לספטימה הקטנה.' },
        play: [notes([67, 65, 64, 62, 60, 59, 58, 57, 55], 0.3)],
      },
      {
        say: { en: 'On the guitar we play it in position, swung, and harmonise each note with a drop-2 6th or diminished chord.', he: 'בגיטרה מנגנים את זה במצב, בסווינג, ומהרמנים כל צליל באקורד דרופ 2 של שישית או מוקטן.' },
        play: [chord([55, 60, 64, 69], 0.8), chord([56, 59, 65, 71], 0.8), chord([60, 64, 69, 72], 1.2)],
      },
      {
        say: { en: 'Your turn: the scale in two positions, swung, slowly. Feel the chord tones fall on the beats, then speed up.', he: 'תורכם: הסולם בשני מצבים, בסווינג, לאט. מרגישים את צלילי האקורד נופלים על הפעמות, ואז מאיצים.' },
        show: { text: { en: 'C6 · B°7', he: 'C6 · B°7' } },
      },
    ],
    more: [
      {
        say: { en: 'Barry Harris taught in workshops for decades. His idea: the music lives in movement between rest and tension, and the diminished chord is the tension.', he: 'בארי האריס לימד בסדנאות במשך עשורים. הרעיון שלו: המוזיקה חיה בתנועה בין מנוחה למתח, והאקורד המוקטן הוא המתח.' },
        play: [chord([59, 62, 65, 68], 0.9), chord([60, 64, 67, 69], 1.2)],
      },
      {
        say: { en: 'Lower one note of a diminished chord a half step and it becomes a dominant 7th. Four notes to lower give four dominants a minor third apart: the brothers.', he: 'מורידים צליל אחד של אקורד מוקטן בחצי טון והוא הופך לספטאקורד דומיננטי. ארבעה צלילים להוריד נותנים ארבע דומיננטות בהפרש טרצה קטנה: האחים.' },
        play: [chord([59, 62, 65, 68], 0.8), chord([59, 62, 65, 67], 0.8)],
      },
      {
        say: { en: 'The half-step rule: coming down a dominant scale from a chord tone, add one chromatic note between the root and the flat 7th, so the chord tones stay on the beats.', he: 'חוק חצי הטון: בירידה בסולם הדומיננטה מצליל אקורד מוסיפים צליל כרומטי אחד בין היסוד לספטימה הקטנה, כדי שצלילי האקורד יישארו על הפעמות.' },
        play: [notes([64, 62, 60, 59, 58, 57, 55], 0.3)],
      },
      {
        say: { en: 'Pivot: when the line runs out of neck, jump the next note an octave and keep going in the same direction of the scale.', he: 'פיבוט: כשהקו נגמר על הצוואר, מקפיצים את הצליל הבא אוקטבה וממשיכים באותו כיוון בסולם.' },
        play: [notes([67, 65, 64, 76, 74, 72], 0.3)],
      },
      {
        say: { en: 'On the guitar, learn each idea in one position first, then in a second one. The drills check the notes and that chord tones land on the beats.', he: 'בגיטרה לומדים כל רעיון קודם במצב אחד ואז בשני. התרגילים בודקים את הצלילים ושצלילי האקורד נוחתים על הפעמות.' },
        show: { text: { en: 'rest · tension · rest', he: 'מנוחה · מתח · מנוחה' } },
      },
      {
        say: { en: 'Sing the lines before you play them. Barry asked his students to sing everything, because a line you can sing is a line your fingers will find.', he: 'שרים את הקווים לפני שמנגנים אותם. בארי ביקש מהתלמידים שלו לשיר הכול, כי קו שאפשר לשיר הוא קו שהאצבעות ימצאו.' },
        play: [notes([67, 65, 64, 62, 60], 0.35)],
      },
    ],
  },
  {
    id: 'g-prog-meter',
    area: 'rhythm',
    emoji: '𝄞',
    title: { en: 'Odd meters and metric modulation', he: 'משקלים אי-זוגיים ומודולציה מטרית' },
    takeaway: { en: 'Count odd bars in groups of 2 and 3; in a modulation one note value becomes the new beat.', he: 'סופרים תיבות אי-זוגיות בקבוצות של 2 ו-3; במודולציה ערך תו אחד הופך לפעמה החדשה.' },
    steps: [
      {
        say: { en: 'Seven eighths in a bar feel natural when you group them: two, two, three. Count it: one two, one two, one two three.', he: 'שבע שמיניות בתיבה מרגישות טבעיות כשמקבצים אותן: שתיים, שתיים, שלוש. סופרים: אחת שתיים, אחת שתיים, אחת שתיים שלוש.' },
        play: [pulse(14, 0.3, [0, 2, 4, 7, 9, 11])],
      },
      {
        say: { en: 'The click sounds only on each group, so lean on the first note of every group.', he: 'הקליק נשמע רק בתחילת כל קבוצה, אז נשענים על הצליל הראשון של כל קבוצה.' },
        show: { text: { en: '2 + 2 + 3', he: '2 + 2 + 3' } },
        play: [pulse(7, 0.3, [0, 2, 4])],
      },
      {
        say: { en: 'In a metric modulation the triplet of the old tempo becomes the new beat: the music speeds up by half without a jolt.', he: 'במודולציה מטרית הטריולה של הטמפו הישן הופכת לפעמה החדשה: המוזיקה מאיצה בחצי בלי קפיצה.' },
        play: [pulse(12, 1 / 6, [0, 3, 6, 9], 57), pulse(4, 1 / 3, [0, 1, 2, 3], 57)],
      },
      {
        say: { en: 'Keep the grid inside you and land on every new one. A lost bar is named in the result.', he: 'שומרים על הרשת בפנים ונוחתים על כל אחת חדשה. תיבה שהלכה לאיבוד מוזכרת בתוצאה.' },
        show: { text: { en: '7/8 · 4/4 · 7/8', he: '7/8 · 4/4 · 7/8' } },
      },
      {
        say: { en: 'Your turn: say the groups aloud while you play the riff, slowly. When the count feels easy, let the band in.', he: 'תורכם: אומרים את הקבוצות בקול בזמן שמנגנים את הריף, לאט. כשהספירה מרגישה קלה, נותנים ללהקה להיכנס.' },
        show: { text: { en: '1 2 · 1 2 · 1 2 3', he: '1 2 · 1 2 · 1 2 3' } },
      },
    ],
    more: [
      {
        say: { en: 'Odd meters come from folk music long before rock: Balkan dances in 7 and 11, Indian rhythmic cycles, Greek and Turkish songs.', he: 'משקלים אי-זוגיים מגיעים ממוזיקה עממית הרבה לפני הרוק: ריקודים בלקניים ב-7 וב-11, מחזורים קצביים הודיים, שירים יווניים וטורקיים.' },
        play: [pulse(11, 0.22, [0, 3, 6, 9])],
      },
      {
        say: { en: 'The same seven eighths can group 2 2 3, 3 2 2 or 2 3 2. The grouping is the feel, so the drills tell you which one they want.', he: 'אותן שבע שמיניות יכולות להתקבץ 2 2 3, 3 2 2 או 2 3 2. הקיבוץ הוא התחושה, ולכן התרגילים אומרים איזה קיבוץ הם רוצים.' },
        play: [pulse(7, 0.25, [0, 3, 5])],
      },
      {
        say: { en: 'Polyrhythm in a riff: groups of three sixteenths over four beats. The accents drift across the bar and meet the downbeat again after three beats.', he: 'פוליריתמיקה בריף: קבוצות של שלוש שש-עשריות על ארבע פעמות. ההדגשות נודדות על פני התיבה ופוגשות שוב את הפעמה החזקה אחרי שלוש פעמות.' },
        play: [pulse(12, 0.15, [0, 3, 6, 9])],
      },
      {
        say: { en: 'Metric modulation: hear the new beat inside the old bar before it arrives. Here the dotted eighth of the old tempo becomes the new quarter.', he: 'מודולציה מטרית: שומעים את הפעמה החדשה בתוך התיבה הישנה לפני שהיא מגיעה. כאן השמינית עם הנקודה של הטמפו הישן הופכת לרבע החדש.' },
        play: [pulse(8, 0.25, [0, 3, 6]), pulse(4, 0.375, [0, 1, 2, 3])],
      },
      {
        say: { en: 'A common mistake is to rush the long group. Keep every eighth equal; the result names a lost bar and the tempo of each section.', he: 'טעות נפוצה היא למהר בקבוצה הארוכה. שומרים על כל שמינית שווה; התוצאה מציינת תיבה שאבדה ואת הטמפו של כל קטע.' },
        show: { text: { en: 'equal eighths', he: 'שמיניות שוות' } },
      },
      {
        say: { en: 'Practise with the click on group starts only, then on the first beat of each bar only, until the groups live in your body and not in the click.', he: 'מתרגלים עם קליק רק בתחילת כל קבוצה, ואז רק על הפעמה הראשונה בכל תיבה, עד שהקבוצות חיות בגוף ולא בקליק.' },
        play: [pulse(7, 0.25, [0])],
      },
    ],
  },
];

// GUITAR_DEEPENING §6 P2: the chord finder (Tools), strummed answers on the neck topics and Chord Rush played.
LESSONS.push({
  id: 'g-chord-finder',
  area: 'play',
  emoji: '',
  title: { en: 'The chord finder: strum it, the app names it', he: 'מאתר האקורדים: פורטים, והאפליקציה נותנת שם' },
  takeaway: { en: 'Strum one chord with a clean tone and let it ring: the app names it, or says it is not sure. It never guesses.', he: 'פורטים אקורד אחד בצליל נקי ונותנים לו להדהד: האפליקציה נותנת לו שם, או אומרת שהיא לא בטוחה. היא אף פעם לא מנחשת.' },
  steps: [
    {
      say: { en: 'Hi {name}! Strum a chord once and let every string ring. The app listens to the first half second and names the chord.', he: 'היי {name}! פורטים אקורד פעם אחת ונותנים לכל המיתרים להדהד. האפליקציה מקשיבה לחצי השנייה הראשונה ונותנת לאקורד שם.' },
      play: [chord([45, 52, 57, 60, 64], 1.6)],
    },
    {
      say: { en: 'It hears every note and the lowest one. A minor with E in the bass is A minor over E.', he: 'היא שומעת כל צליל ואת הנמוך ביותר. לה מינור עם מי בבס הוא לה מינור על מי.' },
      play: [chord([40, 45, 52, 57, 60], 1.4)],
      show: { text: { en: 'Am · Am/E', he: 'Am · Am/E' } },
    },
    {
      say: { en: 'When two names are close it says so and offers both. A string that did not ring is named, so you can fix the finger.', he: 'כששני שמות קרובים היא אומרת את זה ומציעה את שניהם. מיתר שלא צלצל מקבל שם, כדי שתתקנו את האצבע.' },
      show: { text: { en: 'sure · not sure · not ringing', he: 'בטוח · לא בטוח · לא מצלצל' } },
    },
    {
      say: { en: 'The other way round: pick a name and see every shape on the neck. Tap a shape to hear it.', he: 'ולהפך: בוחרים שם ורואים כל צורה על הצוואר. מקישים על צורה כדי לשמוע אותה.' },
      play: [chord([48, 55, 58, 64], 1.2), chord([48, 52, 58, 62], 1.2)],
    },
    {
      say: { en: 'The same ear works in the lessons and in Chord Rush: when a chord is asked, you can strum it instead of tapping the neck.', he: 'אותה אוזן עובדת בשיעורים ובמרוץ האקורדים: כששואלים על אקורד, אפשר לפרוט אותו במקום להקיש על הצוואר.' },
      show: { text: { en: 'clean tone · every string · let it ring', he: 'צליל נקי · כל המיתרים · לתת להדהד' } },
    },
  ],
  more: [
    {
      say: { en: 'How it hears: a chord is a set of pitch classes. The app folds every note into twelve bins, one per note name, and compares that picture with the picture of each chord it knows.', he: 'איך היא שומעת: אקורד הוא קבוצה של שמות צלילים. האפליקציה מקפלת כל צליל לשנים־עשר תאים, אחד לכל שם של צליל, ומשווה את התמונה הזאת לתמונה של כל אקורד שהיא מכירה.' },
      play: [chord([48, 52, 55, 60, 64], 1.4)],
    },
    {
      say: { en: 'A plucked string also sounds its overtones. The third overtone of E is a B, so a plain C chord can look a little like C major 7. The app only names the 7th when it really rings.', he: 'מיתר פרוט משמיע גם את הצלילים העיליים שלו. הצליל העילי השלישי של מי הוא סי, ולכן אקורד דו פשוט יכול להיראות קצת כמו דו מז׳ור 7. האפליקציה נותנת שם לספטימה רק כשהיא באמת מצלצלת.' },
      play: [chord([48, 52, 55, 60, 64], 1.2), chord([48, 52, 55, 59, 64], 1.2)],
    },
    {
      say: { en: 'The lowest note decides the bass. Play C with E on the low string and you get C over E, a first inversion. Mute the low string and the root takes the bass again.', he: 'הצליל הנמוך ביותר קובע את הבס. מנגנים דו עם מי במיתר הנמוך ומקבלים דו על מי, היפוך ראשון. משתיקים את המיתר הנמוך והיסוד חוזר לבס.' },
      play: [chord([40, 48, 55, 60, 64], 1.2), chord([48, 52, 55, 60, 64], 1.2)],
    },
    {
      say: { en: 'A common mistake is a buzzing or muted string. The answer still comes, but the app lists the note that did not ring, so you know which finger to move.', he: 'טעות נפוצה היא מיתר שמזמזם או מושתק. התשובה עדיין מגיעה, אבל האפליקציה מציינת את הצליל שלא צלצל, כדי שתדעו איזו אצבע להזיז.' },
      show: { text: { en: 'not ringing: G', he: 'לא מצלצל: G' } },
    },
    {
      say: { en: 'Distortion and a band from the phone speaker blur the picture. Use a clean tone and headphones for the backing, and strum once rather than a long pattern.', he: 'דיסטורשן ולהקה מרמקול הטלפון מטשטשים את התמונה. משתמשים בצליל נקי ובאוזניות לליווי, ופורטים פעם אחת במקום דפוס ארוך.' },
      show: { text: { en: 'clean · headphones · one strum', he: 'נקי · אוזניות · פריטה אחת' } },
    },
    {
      say: { en: 'Use the shapes page to learn a new chord in every position: open, the E shape on string six, the A shape on string five and drop-2 for sevenths. Strum each one and check the name.', he: 'משתמשים בדף הצורות כדי ללמוד אקורד חדש בכל מצב: פתוח, צורת E על מיתר שש, צורת A על מיתר חמש ודרופ 2 לספטאקורדים. פורטים כל אחת ובודקים את השם.' },
      play: [chord([53, 57, 60, 64], 1.2), chord([41, 48, 52, 57, 60], 1.2)],
    },
  ],
});

/** The quick lesson behind each new guitar family (opened from its page in Technique). */
export const FAMILY_LESSON: Record<string, string> = { 'g-ear': 'g-ear-echo', 'g-jazz': 'g-jazz-comp', 'g-harris': 'g-harris-neck', 'g-prog': 'g-prog-meter' };
