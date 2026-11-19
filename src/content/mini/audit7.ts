// AUDIT-7 (docs/research/AUDIT-7-GAPS.md #1, #2, #8, #9): the quick lessons before the new steps — note values and
// interval numbers (written theory from ABRSM grade 1), the jazz entry on guitar, bass and voice, the singer's new first
// steps, improvising in pop, pop and theatre style. See ../miniTypes.ts for the format. Technique claims are standard
// vocal pedagogy only (sirens and bright vowels through the break, belting kept below the top and never pushed).
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.4): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const note = (midi: number, duration = 1.2): Stimulus => ({ kind: 'note', midi, duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'note-values',
    area: 'theory',
    emoji: 'theory',
    title: { en: 'How long is a note?', he: 'כמה זמן נמשך תו?' },
    takeaway: { en: 'A quarter note is one beat; a half is two, a whole four, an eighth half a beat. A dot adds half the note again.', he: 'רבע הוא פעמה אחת; חצי שתיים, שלם ארבע, שמינית חצי פעמה. נקודה מוסיפה עוד חצי מערך התו.' },
    steps: [
      { say: { en: 'Music is counted in beats, like steady footsteps. Count four of them out loud: one, two, three, four. A quarter note lasts exactly one of those beats.', he: 'מוזיקה נספרת בפעמות, כמו צעדים קבועים. ספרו ארבע בקול: אחת, שתיים, שלוש, ארבע. רבע נמשך בדיוק פעמה אחת מהן.' }, show: { text: { en: '♩ = 1', he: '♩ = 1' } }, play: [notes([60, 60, 60, 60], 0.6)] },
      { say: { en: 'A half note is held for two beats, and a whole note for all four. Their shapes are hollow: the longer the note, the emptier it looks.', he: 'חצי מוחזק שתי פעמות, ותו שלם את כל הארבע. הצורה שלהם חלולה: ככל שהתו ארוך יותר, הוא נראה ריק יותר.' }, show: { text: { en: '𝅗𝅥 = 2 · 𝅝 = 4', he: '𝅗𝅥 = 2 · 𝅝 = 4' } }, play: [notes([60, 60], 1.2)] },
      { say: { en: 'An eighth note has a flag and lasts half a beat, so two eighths fill one beat. Sixteenths are quicker still: four of them make a beat.', he: 'לשמינית יש דגל והיא נמשכת חצי פעמה, כך ששתי שמיניות ממלאות פעמה אחת. שש־עשריות מהירות עוד יותר: ארבע מהן הן פעמה.' }, show: { text: { en: '♪♪ = 1', he: '♪♪ = 1' } }, play: [notes([60, 60, 60, 60, 60, 60, 60, 60], 0.3)] },
      { say: { en: 'A dot after a note adds half of its value again. A dotted half note is two plus one: three beats. Rests are silences with the same lengths.', he: 'נקודה אחרי תו מוסיפה עוד חצי מערכו. חצי עם נקודה הוא שתיים ועוד אחת: שלוש פעמות. הפסקות הן שקטים באותם אורכים.' }, show: { text: { en: '𝅗𝅥. = 3 · 𝄽 = 1', he: '𝅗𝅥. = 3 · 𝄽 = 1' } }, play: [note(60, 1.8)] },
      { say: { en: 'Your turn. Each question shows a note, a rest, or a short group. Say how many beats it lasts, counting the quarter note as one.', he: 'תורכם. כל שאלה מראה תו, הפסקה או קבוצה קצרה. אמרו כמה פעמות היא נמשכת, כשרבע הוא אחת.' } },
    ],
    more: [
      { say: { en: 'Why the quarter note is one beat: in 2/4, 3/4 and 4/4, the lower number 4 says the beat is a quarter. Other meters choose other notes as the beat.', he: 'למה רבע הוא פעמה אחת: ב־2/4, 3/4 ו־4/4 המספר התחתון 4 אומר שהפעמה היא רבע. משקלים אחרים בוחרים תווים אחרים כפעמה.' } },
      { say: { en: 'Each value is half of the one before: whole, half, quarter, eighth, sixteenth. Doubling and halving is the whole system.', he: 'כל ערך הוא חצי מהקודם: שלם, חצי, רבע, שמינית, שש־עשרית. הכפלה וחציה הן כל השיטה.' }, play: [notes([60, 60, 60, 60], 0.6), notes([64, 64, 64, 64, 64, 64, 64, 64], 0.3)] },
      { say: { en: 'A dotted quarter is one and a half beats. It often pairs with an eighth note, and together they fill two beats, as in many folk tunes.', he: 'רבע עם נקודה הוא פעמה וחצי. לרוב הוא בא יחד עם שמינית, ויחד הם ממלאים שתי פעמות, כמו בהרבה שירי עם.' }, play: [{ kind: 'events', events: [{ midi: 60, start: 0, duration: 0.85, velocity: 0.7 }, { midi: 62, start: 0.9, duration: 0.28, velocity: 0.6 }, { midi: 64, start: 1.2, duration: 1, velocity: 0.7 }], length: 2.4 }] },
      { say: { en: 'A common mistake is counting a rest as nothing. A rest still takes its beats: keep counting through the silence, then come in on time.', he: 'טעות נפוצה היא לספור הפסקה כאילו היא כלום. הפסקה עדיין לוקחת את הפעמות שלה: המשיכו לספור דרך השקט, ואז היכנסו בזמן.' } },
      { say: { en: 'To add up a group, turn every sign into a number and add them: a quarter, two eighths and a half make one, plus one, plus two: four.', he: 'כדי לחבר קבוצה, הפכו כל סימן למספר וחברו: רבע, שתי שמיניות וחצי הם אחת, ועוד אחת, ועוד שתיים: ארבע.' }, show: { text: { en: '♩ ♪♪ 𝅗𝅥 = 4', he: '♩ ♪♪ 𝅗𝅥 = 4' } } },
      { say: { en: 'Where it lives: every written rhythm, every bar line and every theory paper of grade one starts here. Recap: halve and double, a dot adds half.', he: 'איפה זה חי: כל מקצב כתוב, כל קו תיבה וכל מבחן תיאוריה של שלב ראשון מתחילים כאן. סיכום: חוצים ומכפילים, נקודה מוסיפה חצי.' } },
    ],
  },
  {
    id: 'interval-numbers',
    area: 'theory',
    emoji: 'intervals',
    title: { en: 'Interval numbers', he: 'מספרי מרווחים' },
    takeaway: { en: 'Count the letter names from the lower note to the upper, both included: C to E is a 3rd.', he: 'סופרים את שמות התווים מהנמוך אל הגבוה, כולל שניהם: דו עד מי זו טרצה.' },
    steps: [
      { say: { en: 'An interval is the distance between two notes. Its number comes from counting letter names, starting on the lower note and counting it as one.', he: 'מרווח הוא המרחק בין שני צלילים. המספר שלו בא מספירת שמות התווים, מתחילים בתו הנמוך וסופרים אותו כאחת.' }, show: { notes: [60, 64], key: 'C' }, play: [notes([60, 64], 0.6)] },
      { say: { en: 'C, D, E: three letters, so C up to E is a third. C up to G is C, D, E, F, G: a fifth.', he: 'דו, רה, מי: שלושה שמות, אז דו עד מי זו טרצה. דו עד סול זה דו, רה, מי, פה, סול: קווינטה.' }, show: { notes: [60, 67], key: 'C' }, play: [notes([60, 67], 0.6)] },
      { say: { en: 'From C to the next C is eight letters, so we call it an octave, not an eighth. The same letter twice on the same line is a unison.', he: 'מדו עד הדו הבא יש שמונה שמות, ולכן קוראים לזה אוקטבה. אותו תו פעמיים על אותו קו הוא אוניסון.' }, show: { notes: [60, 72], key: 'C' }, play: [notes([60, 72], 0.6)] },
      { say: { en: 'A fast way on the staff: from a line to the next line is a third, from a line to a space a second or a fourth. Line to line is always odd.', he: 'דרך מהירה על החמשה: מקו לקו הבא זו טרצה, מקו לרווח סקונדה או קוורטה. מקו לקו זה תמיד מספר אי־זוגי.' }, show: { notes: [62, 69], key: 'C', chord: true }, play: [chord([62, 69])] },
      { say: { en: 'Your turn. Two notes appear on the staff, one after the other or together. Count the letters and choose the number.', he: 'תורכם. שני תווים מופיעים על החמשה, בזה אחר זה או יחד. ספרו את השמות ובחרו את המספר.' } },
    ],
    more: [
      { say: { en: 'Sharps and flats never change the number. C to E flat is still a third, because the letters are still C, D, E. They change the quality, which comes later.', he: 'דיאזים ובמולים אף פעם לא משנים את המספר. דו עד מי במול זו עדיין טרצה, כי השמות הם עדיין דו, רה, מי. הם משנים את הסוג, שבא מאוחר יותר.' }, play: [notes([60, 63], 0.6)] },
      { say: { en: 'Melodic means one note after the other; harmonic means both together. The number is the same either way.', he: 'מלודי פירושו צליל אחרי צליל; הרמוני פירושו שניהם יחד. המספר זהה בשני המקרים.' }, play: [notes([60, 65], 0.6), chord([60, 65])] },
      { say: { en: 'In the bass clef the counting is the same, only the lines have other names. Find the lower note first, then count up.', he: 'במפתח פה הספירה זהה, רק לקווים יש שמות אחרים. מצאו קודם את התו הנמוך, ואז ספרו למעלה.' }, show: { notes: [43, 50], key: 'C', clef: 'bass' } },
      { say: { en: 'A common mistake is counting the steps between the notes instead of the notes themselves. C to E has two steps but three letters: it is a third.', he: 'טעות נפוצה היא לספור את הצעדים בין התווים במקום את התווים עצמם. מדו למי יש שני צעדים אבל שלושה שמות: זו טרצה.' } },
      { say: { en: 'A practice tip: say the letter names out loud as you count up, touching each line and space with a finger. After a few days you will see thirds and fifths at a glance.', he: 'טיפ לתרגול: אמרו את שמות התווים בקול בזמן שאתם סופרים למעלה, ונגעו בכל קו ורווח באצבע. אחרי כמה ימים תראו טרצות וקווינטות במבט אחד.' }, play: [notes([60, 62, 64, 65, 67], 0.3)] },
      { say: { en: 'Where it lives: every chord is built from thirds, and every melody moves by seconds and leaps. Recap: count the letters, both ends included.', he: 'איפה זה חי: כל אקורד בנוי מטרצות, וכל מנגינה זזה בסקונדות ובקפיצות. סיכום: סופרים את השמות, כולל שני הקצוות.' }, play: [notes([60, 64, 67], 0.4)] },
    ],
  },
  {
    id: 'voice-first-more',
    area: 'voice',
    emoji: 'sing',
    title: { en: 'Match, echo, sing a song', he: 'להתאים, להדהד, לשיר שיר' },
    takeaway: { en: 'Hear it, then sing it: one note, a rhythm on “da”, five notes, then four bars with the band.', he: 'שומעים, ואז שרים: צליל אחד, קצב על ״דה״, חמישה צלילים, ואז ארבע תיבות עם הלהקה.' },
    steps: [
      { say: { en: 'Now the note is played first and then stops. Keep it in your ear, sing the same note, and hold it steady for two seconds.', he: 'עכשיו הצליל מתנגן קודם ואז נעצר. שמרו אותו באוזן, שירו את אותו צליל, והחזיקו אותו יציב שתי שניות.' }, play: [note(57)] },
      { say: { en: 'Then a rhythm: two bars on one note. Listen once, and sing it back on “da”, starting on the next bar, with the click.', he: 'אחר כך קצב: שתי תיבות על צליל אחד. הקשיבו פעם אחת, ושירו אותו בחזרה על ״דה״, מהתיבה הבאה, עם הקליק.' }, play: [notes([57, 57, 57], 0.5)] },
      { say: { en: 'Five notes follow, moving by step. Listen to the shape: up, down, or up and back. Then sing the same five notes in the same rhythm.', he: 'אחר כך חמישה צלילים שזזים בצעדים. הקשיבו לצורה: למעלה, למטה, או למעלה ובחזרה. ואז שירו את אותם חמישה צלילים באותו מקצב.' }, play: [notes([60, 62, 64, 62, 60], 0.45)] },
      { say: { en: 'Last, the first four bars of a well-known song, with the band. The pitch and the timing of every note are measured.', he: 'ולבסוף, ארבע התיבות הראשונות של שיר מוכר, עם הלהקה. הגובה והתזמון של כל צליל נמדדים.' }, play: [notes([64, 62, 60, 62, 64, 64, 64], 0.35)] },
      { say: { en: 'Your turn. Breathe low, stay relaxed, and sing at a comfortable volume. If a take misses, it waits for you: try again.', he: 'תורכם. נושמים נמוך, נשארים רפויים, ושרים בעוצמה נוחה. אם טייק לא עובר, הוא מחכה לכם: נסו שוב.' } },
    ],
    more: [
      { say: { en: 'Why the note stops first: matching a note from memory trains the inner ear. The drone in the first steps helped; now the ear holds the note alone.', he: 'למה הצליל נעצר קודם: התאמת צליל מהזיכרון מאמנת את האוזן הפנימית. הצליל המתמשך בצעדים הראשונים עזר; עכשיו האוזן מחזיקה את הצליל לבד.' }, play: [note(60, 1)] },
      { say: { en: 'Singing a rhythm back is a standard part of graded singing exams. One clear syllable, “da”, makes every start easy to hear.', he: 'שירת קצב בחזרה היא חלק רגיל במבחני שירה מדורגים. הברה אחת ברורה, ״דה״, הופכת כל התחלה לקלה לשמיעה.' }, play: [notes([60, 60, 60, 60], 0.5)] },
      { say: { en: 'For the five notes, picture the steps as stairs. Most mistakes come from a step that was too big or too small, not from a wrong direction.', he: 'לחמשת הצלילים, דמיינו את הצעדים כמדרגות. רוב הטעויות באות ממדרגה גדולה או קטנה מדי, לא מכיוון שגוי.' }, play: [notes([60, 62, 64, 65, 64], 0.45)] },
      { say: { en: 'A common mistake is rushing to sing before the call has finished. Wait for your bar; the timing counts as much as the notes.', he: 'טעות נפוצה היא למהר לשיר לפני שהקריאה הסתיימה. חכו לתיבה שלכם; התזמון נחשב בדיוק כמו הצלילים.' } },
      { say: { en: 'A practice tip: hum the note quietly before you sing it out. Humming lets you check the pitch without effort, and the louder note then starts in the right place.', he: 'טיפ לתרגול: זמזמו את הצליל בשקט לפני שאתם שרים אותו בקול. הזמזום מאפשר לבדוק את הגובה בלי מאמץ, והצליל החזק מתחיל אז במקום הנכון.' }, play: [note(57, 1)] },
      { say: { en: 'Where it lives: every choir rehearsal and every lesson starts with hearing and singing back. Recap: listen fully, then sing: note, rhythm, melody, song.', he: 'איפה זה חי: כל חזרה של מקהלה וכל שיעור מתחילים בשמיעה ושירה בחזרה. סיכום: מקשיבים עד הסוף, ואז שרים: צליל, קצב, מנגינה, שיר.' } },
    ],
  },
  {
    id: 'voice-jazz-start',
    area: 'jazz',
    emoji: 'improv',
    title: { en: 'The blues, sung', he: 'הבלוז, בשירה' },
    takeaway: { en: 'Copy short scat calls, sing a blues head, then the guide tones: the 3rd and 7th of each chord.', he: 'מעתיקים קריאות סקאט קצרות, שרים נושא בלוז, ואז את הצלילים המנחים: הטרצה והספטימה של כל אקורד.' },
    steps: [
      { say: { en: 'Jazz singing starts with the blues: twelve bars, three chords, and a swing feel. The clicks fall on beats two and four, where the drummer’s hi-hat closes.', he: 'שירת ג׳אז מתחילה בבלוז: שתים־עשרה תיבות, שלושה אקורדים ותחושת סווינג. הקליקים נופלים על פעמות שתיים וארבע, שם ההיי־האט של המתופף נסגר.' }, play: [chord([48, 58, 64]), chord([53, 63, 69]), chord([48, 58, 64])] },
      { say: { en: 'A scat call is a short rhythm on a syllable like “doo” or “bah”. Listen to one bar, then copy it on one note, swung.', he: 'קריאת סקאט היא קצב קצר על הברה כמו ״דו״ או ״בה״. הקשיבו לתיבה אחת, ואז העתיקו אותה על צליל אחד, בסווינג.' }, play: [notes([60, 60, 60], 0.45)] },
      { say: { en: 'A blues head is the tune of a blues. Ours is a riff, the same riff over the four chord, and then an answer.', he: 'נושא בלוז הוא המנגינה של בלוז. שלנו הוא ריף, אותו ריף על אקורד הרביעית, ואז תשובה.' }, play: [notes([67, 67, 63, 60], 0.4)] },
      { say: { en: 'Guide tones are the third and the seventh of each chord. Two notes are enough to spell the whole harmony, and they move by small steps.', he: 'צלילים מנחים הם הטרצה והספטימה של כל אקורד. שני צלילים מספיקים כדי לאיית את כל ההרמוניה, והם זזים בצעדים קטנים.' }, play: [chord([48, 64, 70]), chord([53, 63, 69])] },
      { say: { en: 'Your turn: copy the calls, sing the head with the band, then a guide tone on every half note. Every note is measured.', he: 'תורכם: העתיקו את הקריאות, שירו את הנושא עם הלהקה, ואז צליל מנחה על כל חצי. כל צליל נמדד.' } },
    ],
    more: [
      { say: { en: 'Swing eighths are uneven: the first of each pair is longer, the second shorter and lighter. Say “doo-bah, doo-bah” with a lilt.', he: 'שמיניות בסווינג אינן שוות: הראשונה בכל זוג ארוכה יותר, השנייה קצרה וקלה יותר. אמרו ״דו־בה, דו־בה״ בנדנוד.' }, play: [{ kind: 'events', events: [0, 1, 2, 3].flatMap((k) => [{ midi: 60, start: k * 0.6, duration: 0.35, velocity: 0.7 }, { midi: 60, start: k * 0.6 + 0.4, duration: 0.18, velocity: 0.5 }]), length: 2.6 }] },
      { say: { en: 'The twelve bars: four on the one chord, two on the four chord, two on the one, then the five, the four, and home.', he: 'שתים־עשרה התיבות: ארבע על אקורד הראשונה, שתיים על הרביעית, שתיים על הראשונה, ואז החמישית, הרביעית, והביתה.' } },
      { say: { en: 'Over C7 the guide tones are E and B flat; over F7 they are A and E flat. E falls to E flat, B flat falls to A: half steps.', he: 'מעל C7 הצלילים המנחים הם מי וסי במול; מעל F7 הם לה ומי במול. מי יורד למי במול, סי במול יורד ללה: חצאי טונים.' }, play: [notes([64, 63], 0.6), notes([70, 69], 0.6)] },
      { say: { en: 'A common mistake is singing the root because it feels safe. The root belongs to the bass player; the third and seventh are yours.', he: 'טעות נפוצה היא לשיר את השורש כי הוא מרגיש בטוח. השורש שייך לבסיסט; הטרצה והספטימה שלכם.' } },
      { say: { en: 'A practice tip: sing the head on “doo” first, then on “bah”, then with your own syllables. The syllable never counts, only the pitch and the time, so choose what swings for you.', he: 'טיפ לתרגול: שירו את הנושא קודם על ״דו״, אחר כך על ״בה״, ואז בהברות שלכם. ההברה אף פעם לא נחשבת, רק הגובה והזמן, אז בחרו מה שמתנדנד לכם.' }, play: [notes([67, 67, 63, 60], 0.4)] },
      { say: { en: 'Where it lives: every jazz singer’s first standards are blues tunes, and every scat solo grows from short calls. Recap: calls, the head, guide tones.', he: 'איפה זה חי: הסטנדרטים הראשונים של כל זמר ג׳אז הם בלוזים, וכל סולו סקאט צומח מקריאות קצרות. סיכום: קריאות, הנושא, צלילים מנחים.' } },
    ],
  },
  {
    id: 'voice-impro',
    area: 'voice',
    emoji: 'improv',
    title: { en: 'Improvising in pop', he: 'אלתור בפופ' },
    takeaway: { en: 'Answer the band, land on chord tones, stay inside the pentatonic, keep the beat.', he: 'עונים ללהקה, נוחתים על צלילי אקורד, נשארים בתוך הפנטטוני, שומרים על הפעמה.' },
    steps: [
      { say: { en: 'Improvising means making up your own melody, right now, over the band. Pop improvising starts simple: a few notes, clearly in time.', he: 'אלתור פירושו להמציא מנגינה משלכם, עכשיו, מעל הלהקה. אלתור בפופ מתחיל פשוט: כמה צלילים, ברור ובזמן.' } },
      { say: { en: 'First, call and response. The band plays two bars, you answer with two of your own. The answer does not copy; it replies.', he: 'קודם, שאלה ותשובה. הלהקה מנגנת שתי תיבות, ואתם עונים בשתיים משלכם. התשובה לא מעתיקה; היא מגיבה.' }, play: [notes([64, 67, 69, 67], 0.35)] },
      { say: { en: 'Over the one, four and five chords, put a chord tone on the first beat of each chord, and end your phrase on one.', he: 'מעל אקורדי הראשונה, הרביעית והחמישית, שימו צליל אקורד על הפעמה הראשונה של כל אקורד, וסיימו את המשפט על אחד מהם.' }, play: [chord([48, 60, 64, 67]), chord([53, 60, 65, 69]), chord([55, 62, 67, 71])] },
      { say: { en: 'The pentatonic scale has five notes that rarely clash with these chords: one, two, three, five and six in major. In minor: one, flat three, four, five, flat seven.', he: 'בסולם הפנטטוני חמישה צלילים שכמעט לא מתנגשים עם האקורדים האלה: אחת, שתיים, שלוש, חמש ושש במז׳ור. במינור: אחת, שלוש במול, ארבע, חמש, שבע במול.' }, play: [notes([60, 62, 64, 67, 69, 72], 0.3)] },
      { say: { en: 'Your turn. The scale’s degrees show while you sing. Stay in time, use only those notes, and finish on a chord tone.', he: 'תורכם. הדרגות של הסולם מוצגות בזמן השירה. הישארו בזמן, השתמשו רק בצלילים האלה, וסיימו על צליל אקורד.' } },
    ],
    more: [
      { say: { en: 'Why chord tones on strong beats: the ear hears beats one and three as arrivals. A chord tone there sounds settled; anything else sounds like it wants to move.', he: 'למה צלילי אקורד בפעמות החזקות: האוזן שומעת את פעמות אחת ושלוש כהגעה. צליל אקורד שם נשמע יציב; כל דבר אחר נשמע כאילו הוא רוצה לזוז.' }, play: [chord([48, 64, 67]), note(64, 0.8)] },
      { say: { en: 'A good answer often borrows one idea from the call: its rhythm, its first note, or its shape, and changes the rest.', he: 'תשובה טובה לוקחת לרוב רעיון אחד מהשאלה: את המקצב, את הצליל הראשון, או את הצורה, ומשנה את השאר.' }, play: [notes([64, 67, 69], 0.35), notes([69, 67, 64], 0.35)] },
      { say: { en: 'Leave space. Rests let the band breathe and make your next phrase clearer. Two short phrases beat one long one.', he: 'השאירו מקום. הפסקות נותנות ללהקה לנשום והופכות את המשפט הבא לברור יותר. שני משפטים קצרים עדיפים על אחד ארוך.' } },
      { say: { en: 'A common mistake is losing the beat while thinking about notes. Keep the pulse in your body first; the notes can be simple.', he: 'טעות נפוצה היא לאבד את הפעמה בזמן שחושבים על הצלילים. שמרו קודם על הפעמה בגוף; הצלילים יכולים להיות פשוטים.' } },
      { say: { en: 'A practice tip: start with only three notes of the scale, for example one, two and three. When those feel free, add five and six. Fewer notes make better ideas.', he: 'טיפ לתרגול: התחילו רק עם שלושה צלילים מהסולם, למשל אחת, שתיים ושלוש. כשהם מרגישים חופשיים, הוסיפו חמש ושש. פחות צלילים יוצרים רעיונות טובים יותר.' }, play: [notes([60, 62, 64, 62, 60], 0.35)] },
      { say: { en: 'Where it lives: ad-libs at the end of pop choruses, gospel and soul call and response, and graded singing exams. Recap: answer, land, stay in the scale, keep time.', he: 'איפה זה חי: אד־ליבים בסוף פזמוני פופ, שאלה ותשובה בגוספל ובסול, ומבחני שירה מדורגים. סיכום: עונים, נוחתים, נשארים בסולם, שומרים על זמן.' } },
    ],
  },
  {
    id: 'voice-pop',
    area: 'voice',
    emoji: 'sing',
    title: { en: 'Pop and theatre style', he: 'סגנון פופ ותיאטרון' },
    takeaway: { en: 'Through the break smoothly, strong but never pushed, short riffs clean before fast, phrases that tell the story.', he: 'דרך המעבר בחלקות, חזק אבל בלי לדחוף, ריפים קצרים נקיים לפני מהירים, משפטים שמספרים את הסיפור.' },
    steps: [
      { say: { en: 'Most voices have a break, a place where the sound wants to flip from low to high. Mix voice is singing through that place with an even sound.', he: 'לרוב הקולות יש מעבר, מקום שבו הצליל רוצה לקפוץ מנמוך לגבוה. קול מעורב הוא שירה דרך המקום הזה בצליל אחיד.' }, play: [notes([55, 57, 59, 60, 62, 64, 62, 60, 59, 57, 55], 0.25)] },
      { say: { en: 'Sirens on “oo” and a bright “nay” on five notes are common ways to practise it. Keep the sound light and let the pitch glide.', he: 'סירנות על ״או״ ו״ניי״ בהיר על חמישה צלילים הן דרכים נפוצות לתרגל את זה. שמרו על צליל קל ותנו לגובה לגלוש.' }, play: [notes([60, 62, 64, 65, 67, 65, 64, 62, 60], 0.3)] },
      { say: { en: 'Belting is strong, speech-like singing. Here the phrases stay below your top notes. Never push the volume, and stop at once if it hurts or you feel hoarse.', he: 'בלטינג הוא שירה חזקה, קרובה לדיבור. כאן המשפטים נשארים מתחת לצלילים הגבוהים שלכם. אל תדחפו את העוצמה, ועצרו מיד אם כואב או שהקול צרוד.' } },
      { say: { en: 'A riff is a short run of notes on one vowel. Learn it slowly and cleanly first; the tempo rises only when every note is in tune.', he: 'ריף הוא רצף קצר של צלילים על תנועה אחת. לומדים אותו קודם לאט ונקי; הטמפו עולה רק כשכל צליל מדויק.' }, play: [notes([67, 69, 67, 64, 62, 60], 0.18)] },
      { say: { en: 'Your turn. Then whole songs: make the melody yours but keep its long notes, lift the chorus, and hold the long notes steady to the end.', he: 'תורכם. אחר כך שירים שלמים: עשו את המנגינה שלכם אבל שמרו על הצלילים הארוכים, הרימו את הפזמון, והחזיקו צלילים ארוכים יציבים עד הסוף.' }, play: [notes([64, 64, 62, 60, 62, 67], 0.4)] },
    ],
    more: [
      { say: { en: 'The app hears pitch, timing and loudness, not which register you use. So it measures a smooth glide through the break, not the name of the sound.', he: 'האפליקציה שומעת גובה, תזמון ועוצמה, לא באיזה רגיסטר אתם משתמשים. לכן היא מודדת גלישה חלקה דרך המעבר, לא את שם הצליל.' } },
      { say: { en: 'A loud phrase still needs a steady breath. Grow louder towards the peak note, then let the phrase come down softer.', he: 'גם משפט חזק צריך נשימה יציבה. התחזקו לקראת הצליל השיא, ואז תנו למשפט לרדת ברכות.' }, play: [notes([60, 62, 64, 65, 67, 65, 64, 62, 60], 0.35)] },
      { say: { en: 'Short riffs often use the pentatonic scale. Sing them at sixty percent first, then eighty, then full speed.', he: 'ריפים קצרים משתמשים לרוב בסולם הפנטטוני. שירו אותם קודם בשישים אחוז, אחר כך שמונים, ואז במהירות מלאה.' }, play: [notes([69, 67, 64, 62, 64, 60], 0.22)] },
      { say: { en: 'Pop phrasing moves the rhythm a little, ahead or behind the beat, like speech. Theatre phrasing tells the story: clear long notes and a chorus that builds.', he: 'פרייזינג בפופ מזיז מעט את המקצב, לפני הפעמה או אחריה, כמו בדיבור. פרייזינג בתיאטרון מספר את הסיפור: צלילים ארוכים ברורים ופזמון שנבנה.' } },
      { say: { en: 'A common mistake is getting louder by squeezing the throat. If the sound feels tight, sing softer and lower until it is easy again.', he: 'טעות נפוצה היא להתחזק על ידי לחיצה בגרון. אם הצליל מרגיש לחוץ, שירו חלש ונמוך יותר עד שזה שוב קל.' } },
      { say: { en: 'A practice tip: warm up before every style session with a lip trill and a few gentle sirens, and drink some water. Short, regular sessions build the voice more than one long push.', he: 'טיפ לתרגול: התחממו לפני כל אימון סגנון ברטט שפתיים וכמה סירנות עדינות, ושתו מעט מים. אימונים קצרים וקבועים בונים את הקול יותר מדחיפה ארוכה אחת.' }, play: [notes([55, 59, 62, 67, 62, 59, 55], 0.3)] },
      { say: { en: 'Where it lives: pop, rock and musical-theatre songs, and the style sections of graded exams. Recap: smooth break, never push, clean riffs, tell the story.', he: 'איפה זה חי: שירי פופ, רוק ותיאטרון מוזיקלי, וחלקי הסגנון במבחנים מדורגים. סיכום: מעבר חלק, בלי לדחוף, ריפים נקיים, לספר את הסיפור.' } },
    ],
  },
  {
    id: 'guitar-jazz-start',
    area: 'jazz',
    emoji: 'chords',
    title: { en: 'Jazz guitar starts on the blues', he: 'גיטרת ג׳אז מתחילה בבלוז' },
    takeaway: { en: 'Play the head, then shells four to the bar, then the guide tones, then the Charleston, in every key.', he: 'מנגנים את הנושא, אחר כך שלדים ארבע לתיבה, אחר כך צלילים מנחים, ואז צ׳רלסטון, בכל הסולמות.' },
    steps: [
      { say: { en: 'Jazz guitar starts on the twelve-bar blues: three dominant seventh chords. First the head, the tune itself, played in the first positions.', he: 'גיטרת ג׳אז מתחילה בבלוז של שתים־עשרה תיבות: שלושה אקורדי דומיננט ספט. קודם הנושא, המנגינה עצמה, בפוזיציות הראשונות.' }, play: [notes([67, 67, 63, 60], 0.4)] },
      { say: { en: 'A shell is three notes: the root, the third and the seventh. It is all the chord a band needs from the guitar.', he: 'שלד הוא שלושה צלילים: השורש, הטרצה והספטימה. זה כל האקורד שהלהקה צריכה מהגיטרה.' }, play: [chord([43, 53, 59])] },
      { say: { en: 'Strum four even, short chords a bar, the root on string six or five, whichever keeps your hand closer to the last shell.', he: 'פרטו ארבעה אקורדים שווים וקצרים בתיבה, השורש על מיתר שש או חמש, לפי מה שמשאיר את היד קרובה לשלד הקודם.' }, play: [chord([48, 58, 64], 0.4), chord([48, 58, 64], 0.4), chord([53, 63, 69], 0.4)] },
      { say: { en: 'The guide tones alone, the third and seventh, make a line that shows the changes. Then the Charleston rhythm: beat one and the “and” of two.', he: 'הצלילים המנחים לבד, הטרצה והספטימה, יוצרים קו שמראה את החילופים. ואז מקצב הצ׳רלסטון: פעמה אחת וה״וְ״ של שתיים.' }, play: [notes([64, 70, 69, 63], 0.5)] },
      { say: { en: 'Your turn. Each item starts in free time, then climbs the tempo ladder, and moves through all twelve keys.', he: 'תורכם. כל פריט מתחיל בזמן חופשי, אחר כך מטפס בסולם הטמפו, ועובר בכל שנים־עשר הסולמות.' } },
    ],
    more: [
      { say: { en: 'Why shells: the bass plays the root and the piano may play too. Three notes stay out of their way and keep the sound clear.', he: 'למה שלדים: הבס מנגן את השורש ואולי גם הפסנתר. שלושה צלילים לא מפריעים להם ושומרים על צליל נקי.' }, play: [chord([43, 53, 59]), chord([48, 52, 58])] },
      { say: { en: 'Four to the bar is the oldest jazz guitar job: short, even chords that lock with the drummer’s ride cymbal.', he: 'ארבע לתיבה הוא התפקיד הוותיק ביותר של גיטרת ג׳אז: אקורדים קצרים ושווים שננעלים עם מצילת הרייד של המתופף.' }, play: [chord([48, 58, 64], 0.35), chord([48, 58, 64], 0.35), chord([48, 58, 64], 0.35), chord([48, 58, 64], 0.35)] },
      { say: { en: 'Between C7 and F7 the third of one chord moves a half step to the seventh of the next. That is why guide-tone lines sound smooth.', he: 'בין C7 ל־F7 הטרצה של אקורד אחד זזה חצי טון לספטימה של הבא. לכן קווי צלילים מנחים נשמעים חלקים.' }, play: [notes([64, 63], 0.6)] },
      { say: { en: 'A common mistake is letting the chords ring. Lift the fretting fingers a little after each strum, so the chords stay short.', he: 'טעות נפוצה היא לתת לאקורדים להדהד. הרימו מעט את האצבעות הלוחצות אחרי כל פריטה, כדי שהאקורדים יישארו קצרים.' } },
      { say: { en: 'A practice tip: learn the shells for one key slowly, saying each chord name aloud as you play it. Then move the same shapes to a new key: they never change, only their place on the neck.', he: 'טיפ לתרגול: למדו את השלדים בסולם אחד לאט, ואמרו בקול את שם כל אקורד בזמן שאתם מנגנים אותו. אחר כך העבירו את אותן צורות לסולם חדש: הן לא משתנות, רק המקום שלהן על הצוואר.' }, play: [chord([43, 53, 59]), chord([48, 58, 64])] },
      { say: { en: 'Where it lives: big-band guitar, small-group comping and every jazz jam’s first tune. Recap: head, shells, guide tones, Charleston, every key.', he: 'איפה זה חי: גיטרה בביג בנד, ליווי בהרכב קטן והשיר הראשון של כל ג׳אם. סיכום: נושא, שלדים, צלילים מנחים, צ׳רלסטון, כל הסולמות.' } },
    ],
  },
  {
    id: 'bass-blues-walk',
    area: 'jazz',
    emoji: 'walk',
    title: { en: 'A first walking line', he: 'קו בס מהלך ראשון' },
    takeaway: { en: 'Root, 3rd, 5th on beats 1–3, then a half step into the next chord on beat 4.', he: 'שורש, טרצה, קווינטה בפעמות 1–3, ואז חצי טון אל האקורד הבא בפעמה 4.' },
    steps: [
      { say: { en: 'A walking bass plays one note on every beat. Roots and fifths came first; now the line walks up the chord itself.', he: 'בס מהלך מנגן צליל אחד בכל פעמה. קודם באו שורשים וקווינטות; עכשיו הקו הולך במעלה האקורד עצמו.' }, play: [notes([36, 43, 36, 43], 0.45)] },
      { say: { en: 'On beats one to three play the root, the third and the fifth of the chord. They tell the band exactly which chord it is.', he: 'בפעמות אחת עד שלוש נגנו את השורש, הטרצה והקווינטה של האקורד. הם אומרים ללהקה בדיוק איזה אקורד זה.' }, play: [notes([36, 40, 43], 0.45)] },
      { say: { en: 'Beat four leads into the next chord from a half step away, below or above. The ear hears the new root coming.', he: 'פעמה ארבע מובילה אל האקורד הבא מחצי טון, מלמטה או מלמעלה. האוזן שומעת את השורש החדש מגיע.' }, play: [notes([36, 40, 43, 40, 41], 0.45)] },
      { say: { en: 'Over the twelve bars of the blues the plan is the same in every bar. Keep the quarter notes even and the same length.', he: 'על שתים־עשרה התיבות של הבלוז התוכנית זהה בכל תיבה. שמרו על רבעים שווים ובאותו אורך.' }, play: [notes([41, 45, 48, 47, 36], 0.45)] },
      { say: { en: 'Your turn. Free time first, then the tempo ladder, in all twelve keys. Every note is measured against the chord.', he: 'תורכם. קודם זמן חופשי, אחר כך סולם הטמפו, בכל שנים־עשר הסולמות. כל צליל נמדד מול האקורד.' } },
    ],
    more: [
      { say: { en: 'Why a half step on beat four: it is the strongest pull in music. Any note a half step from the target sounds like it leads there.', he: 'למה חצי טון בפעמה ארבע: זו המשיכה החזקה ביותר במוזיקה. כל צליל בחצי טון מהיעד נשמע כאילו הוא מוביל אליו.' }, play: [notes([42, 43], 0.6)] },
      { say: { en: 'From below or from above: when the note below would be lower than your lowest string, approach from above instead.', he: 'מלמטה או מלמעלה: כשהצליל מלמטה נמוך מהמיתר הנמוך ביותר שלכם, גשו מלמעלה.' }, play: [notes([29, 28], 0.6)] },
      { say: { en: 'Dominant seventh chords have a major third. Over the blues, every chord is a dominant seventh, so the third is always four half steps above the root.', he: 'לאקורדי דומיננט ספט יש טרצה גדולה. בבלוז כל אקורד הוא דומיננט ספט, אז הטרצה תמיד ארבעה חצאי טונים מעל השורש.' }, play: [notes([36, 40], 0.5)] },
      { say: { en: 'A common mistake is landing the approach late. Beat four is as long as the others; the new root arrives exactly on beat one.', he: 'טעות נפוצה היא לנחות על הגישה באיחור. פעמה ארבע ארוכה כמו האחרות; השורש החדש מגיע בדיוק בפעמה אחת.' } },
      { say: { en: 'A practice tip: sing the line while you play it, or say the names: root, three, five, step. When your voice knows the plan, your hands stop hesitating at each chord change.', he: 'טיפ לתרגול: שירו את הקו בזמן שאתם מנגנים אותו, או אמרו את השמות: שורש, שלוש, חמש, צעד. כשהקול מכיר את התוכנית, הידיים מפסיקות להסס בכל חילוף אקורד.' }, play: [notes([36, 40, 43, 42, 41], 0.45)] },
      { say: { en: 'Where it lives: every swing tune and jam session. Recap: root, third, fifth, a half step in, even quarters, every key.', he: 'איפה זה חי: כל שיר סווינג וכל ג׳אם. סיכום: שורש, טרצה, קווינטה, חצי טון פנימה, רבעים שווים, כל הסולמות.' } },
    ],
  },
];

/** Units: the topic (topic:<id>), the first level of a voice family (vocal:<ref>), a technique level (tech:<level>). */
export const UNITS: Record<string, string> = {
  'topic:note-values': 'note-values',
  'topic:interval-number': 'interval-numbers',
  'vocal:2104': 'voice-first-more',
  'vocal:2301': 'voice-jazz-start',
  'vocal:2311': 'voice-impro',
  'vocal:2321': 'voice-pop',
  'tech:g-jblues': 'guitar-jazz-start',
  'tech:b-walk-21': 'bass-blues-walk',
};
