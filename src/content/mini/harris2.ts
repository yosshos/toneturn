// HARRIS_2 (docs/AUDIT-CONTENT-THEORY.md §ג, §ז.2): quick lessons for Barry Harris unit 2 — the three diminished
// chords and one 6th chord, the diminished's jobs (passing, auxiliary, dominant), "chords move to chords", one minor
// 6th over three basses, the 6th-diminished drop-2 on the guitar's string sets. Every fact matches its generator
// (src/engine/topicsHarris2.ts) and drill (k-sixdim 11–13, g-harris 7). See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { BH, bhProg } from '../../engine/topicsHarris2';

const chord = (midis: number[], duration = 1.3): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });
const P = (ks: (keyof typeof BH)[]) => bhProg(ks.map((k) => BH[k]), 0, 88);

const C6 = [60, 64, 67, 69];
const Cm6 = [60, 63, 67, 69];
const B7 = [59, 62, 65, 68];
const SCALE = [60, 62, 64, 65, 67, 68, 69, 71, 72];

export const LESSONS: MiniLesson[] = [
  {
    id: 'bh-three-dim',
    area: 'jazz',
    emoji: '°',
    title: { en: 'Three diminished chords, one 6th chord', he: 'שלושה דימינישים, אקורד 6 אחד' },
    takeaway: {
      en: 'There are only three diminished 7th chords. A 6th chord touches two of them; the third shares no note with it and is the scale’s own diminished: C6 or Cm6 + B°7 = the 6th-diminished scale, and B°7 = G7♭9 without its root.',
      he: 'יש רק שלושה אקורדי דימיניש. אקורד 6 נוגע בשניים מהם; השלישי לא חולק איתו אף צליל, והוא הדימיניש של הסולם: C6 או Cm6 + B°7 = סולם 6־דימיניש, ו־B°7 = G7♭9 בלי היסוד.',
    },
    steps: [
      {
        say: { en: 'There are only three diminished 7th chords. Every other one repeats the notes of one of these.', he: 'יש רק שלושה אקורדי דימיניש. כל אחד אחר חוזר על הצלילים של אחד מהם.' },
        play: [chord([60, 63, 66, 69], 1), chord([61, 64, 67, 70], 1), chord([62, 65, 68, 71], 1.3)],
        show: { text: { en: 'C°7 · C♯°7 · D°7', he: 'C°7 · C♯°7 · D°7' } },
      },
      {
        say: { en: 'C6 touches two of them: C and A are in C°7, E and G in C♯°7. The third, B°7 — the same notes as D°7 — shares no note with it.', he: 'C6 נוגע בשניים מהם: דו ולה נמצאים ב־C°7, מי וסול ב־C♯°7. השלישי, B°7 — אותם צלילים כמו D°7 — לא חולק איתו אף צליל.' },
        play: [chord(C6, 1.1), chord(B7, 1.4)],
        show: { text: { en: 'C6 + B°7: no shared note', he: 'C6 + B°7: אין צליל משותף' } },
      },
      {
        say: { en: 'That one is the scale’s own diminished. C6 and B°7 together make the 6th-diminished scale, and B°7 is G7♭9 without its root: the dominant.', he: 'הוא הדימיניש של הסולם. C6 ו־B°7 יחד הם סולם 6־דימיניש, ו־B°7 הוא G7♭9 בלי היסוד: הדומיננטה.' },
        play: [notes(SCALE, 0.26)],
        show: { notes: SCALE, key: 'C', text: { en: '1 2 3 4 5 ♭6 6 7', he: '1 2 3 4 5 ♭6 6 7' } },
      },
      {
        say: { en: 'The other two make the 6th chord. Raise E♭ and G♭ of C°7, and it is C6. Raise only the G♭, and it is Cm6: the root sits a 4th above the raised note.', he: 'שני האחרים בונים את אקורד ה־6. מרימים את מי במול ואת סול במול של C°7, ומקבלים C6. מרימים רק את סול במול, ומקבלים Cm6: היסוד יושב קוורטה מעל הצליל שהורם.' },
        play: [chord([60, 63, 66, 69], 0.9), chord(C6, 1.1), rest(), chord([60, 63, 66, 69], 0.9), chord(Cm6, 1.2)],
        show: { text: { en: 'C°7 → C6 · C°7 → Cm6', he: 'C°7 → C6 · C°7 → Cm6' } },
      },
      {
        say: { en: 'The minor 6th keeps the same partner: Cm6 and B°7 make the minor 6th-diminished scale. Your turn.', he: 'למינור 6 יש אותו בן זוג: Cm6 ו־B°7 הם סולם מינור 6־דימיניש. תורכם.' },
        play: [chord(Cm6, 1), chord(B7, 1.3)],
        show: { text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
    ],
    more: [
      {
        say: { en: 'Why only three? A diminished 7th chord splits the octave into four minor 3rds. Move it up a minor 3rd and you get the same four notes again, so only three starting notes give new chords: C, C♯ and D.', he: 'למה רק שלושה? אקורד דימיניש מחלק את האוקטבה לארבע טרצות קטנות. מזיזים אותו טרצה קטנה למעלה ומקבלים שוב את אותם ארבעה צלילים, ולכן רק שלושה צלילי פתיחה נותנים אקורדים חדשים: דו, דו דיאז ורה.' },
        play: [chord([60, 63, 66, 69], 0.9), chord([63, 66, 69, 72], 0.9), chord([66, 69, 72, 75], 1.2)],
      },
      {
        say: { en: 'The partner is always the diminished on the 7th degree, for any 6th chord: F6 takes E°7, B♭6 takes A°7, Gm6 takes F♯°7.', he: 'בן הזוג הוא תמיד הדימיניש שעל הדרגה השביעית, לכל אקורד 6: F6 מקבל E°7, ‏B♭6 מקבל A°7, ‏Gm6 מקבל F♯°7.' },
        play: [chord([65, 69, 72, 74], 1), chord([64, 67, 70, 73], 1.3)],
        show: { text: { en: 'F6 + E°7', he: 'F6 + E°7' } },
      },
      {
        say: { en: 'Because the two share no note, every note of the scale belongs to exactly one of them. That is what lets Barry harmonise any melody note: 1, 3, 5 and 6 take the 6th chord, the notes between take the diminished.', he: 'מכיוון שאין להם צליל משותף, כל צליל בסולם שייך בדיוק לאחד מהם. זה מה שמאפשר לבארי להרמן כל צליל מנגינה: 1, ‏3, ‏5 ו־6 מקבלים את אקורד ה־6, הצלילים שביניהם את הדימיניש.' },
      },
      {
        say: { en: 'Two diminished chords together, C°7 and C♯°7, do not make the 6th-diminished scale. They make the half-whole diminished scale: eight notes with no tonic chord inside. That is where the two are easily confused.', he: 'שני דימינישים יחד, C°7 ו־C♯°7, לא בונים את סולם 6־דימיניש. הם בונים את הסולם המוקטן חצי־שלם: שמונה צלילים בלי אקורד טוניקה בפנים. כאן קל להתבלבל בין השניים.' },
        play: [notes([60, 61, 63, 64, 66, 67, 69, 70, 72], 0.26)],
        show: { text: { en: '1 ♭2 ♭3 3 ♯4 5 6 ♭7', he: '1 ♭2 ♭3 3 ♯4 5 6 ♭7' } },
      },
      {
        say: { en: 'Recap: the 6th chord touches two diminished chords and grows from them; the third is its partner, the dominant of the scale.', he: 'לסיכום: אקורד ה־6 נוגע בשני דימינישים ונוצר מהם; השלישי הוא בן הזוג שלו, הדומיננטה של הסולם.' },
      },
    ],
  },
  {
    id: 'bh-dim-roles',
    area: 'jazz',
    emoji: '♯',
    title: { en: 'The diminished: passing, auxiliary, dominant', he: 'הדימיניש: עובר, עזר, דומיננטי' },
    takeaway: {
      en: 'Passing: the bass moves by half steps into a new chord (I6–♯I°7–ii7, I6/3–♭III°7–ii7). Auxiliary: the bass holds and the chord comes back (C6–C°7–C6; over a C bass ♯IV°7 has the same notes). Dominant: vii°7 stands for V and goes home.',
      he: 'עובר: הבס זז בחצאי טונים אל אקורד חדש (I6–♯I°7–ii7, ‏I6/3–♭III°7–ii7). עזר: הבס נשאר והאקורד חוזר (C6–C°7–C6; מעל בס דו ל־♯IV°7 יש אותם צלילים). דומיננטי: vii°7 במקום V, והביתה.',
    },
    steps: [
      {
        say: { en: 'The bass climbs by half steps: C6, C♯°7, Dm7. The diminished passes between two chords a whole step apart.', he: 'הבס עולה בחצאי טונים: C6, ‏C♯°7, ‏Dm7. הדימיניש עובר בין שני אקורדים שרחוקים טון זה מזה.' },
        play: [P(['I6', 'sI', 'ii7'])],
        show: { text: { en: 'I6 – ♯I°7 – ii7', he: 'I6 – ♯I°7 – ii7' } },
      },
      {
        say: { en: 'On up: Dm7, D♯°7, C6 over E. And down: C6 over E, E♭°7, Dm7. The same notes, named by the direction of the bass.', he: 'וממשיכים למעלה: Dm7, ‏D♯°7, ‏C6 מעל מי. ובירידה: C6 מעל מי, ‏E♭°7, ‏Dm7. אותם צלילים, ושם לפי כיוון הבס.' },
        play: [P(['ii7', 'sii', 'I6_3']), rest(0.5), P(['I6_3', 'bIII', 'ii7'])],
        show: { text: { en: 'ii7 – ♯ii°7 – I6/3 · I6/3 – ♭III°7 – ii7', he: 'ii7 – ♯ii°7 – I6/3 · I6/3 – ♭III°7 – ii7' } },
      },
      {
        say: { en: 'Auxiliary: the bass holds C, the chord leaves and comes back. C6, C°7, C6: the root and the 6th stay, the 3rd and the 5th dip a half step. Over the C bass, F♯°7 — ♯IV°7 — has the same notes.', he: 'עזר: הבס נשאר על דו, האקורד יוצא וחוזר. C6, ‏C°7, ‏C6: היסוד והסקסטה נשארים, הטרצה והקווינטה יורדות חצי טון. מעל בס דו, ל־F♯°7 — ‏♯IV°7 — יש אותם צלילים.' },
        play: [P(['I6', 'Idim', 'I6'])],
        show: { text: { en: 'C6 – C°7 – C6', he: 'C6 – C°7 – C6' } },
      },
      {
        say: { en: 'Dominant: B°7 is G7♭9 without its root. It stands for V and goes home.', he: 'דומיננטי: B°7 הוא G7♭9 בלי היסוד. הוא עומד במקום V והולך הביתה.' },
        play: [P(['ii7', 'vii', 'I6'])],
        show: { text: { en: 'ii7 – vii°7 – I6', he: 'ii7 – vii°7 – I6' } },
      },
      {
        say: { en: 'Bass by half steps into a new chord: passing. Bass holds and the chord returns: auxiliary. Instead of V: dominant. Your turn.', he: 'בס בחצאי טונים אל אקורד חדש: עובר. בס נשאר והאקורד חוזר: עזר. במקום V: דומיננטי. תורכם.' },
        show: { text: { en: 'passing · auxiliary · dominant', he: 'עובר · עזר · דומיננטי' } },
      },
    ],
    more: [
      {
        say: { en: 'A passing diminished also resolves up a half step, like a leading note: C♯°7 is the vii°7 of Dm7. What makes it passing is the chromatic bass between two chords.', he: 'גם דימיניש עובר נפתר חצי טון למעלה, כמו צליל מוביל: C♯°7 הוא ה־vii°7 של Dm7. מה שהופך אותו לעובר הוא הבס הכרומטי בין שני אקורדים.' },
      },
      {
        say: { en: 'The third passage of the scale: F6, F♯°7, C6 over G. Coming down, G, G♭, F: the same diminished from above.', he: 'המעבר השלישי בסולם: F6, ‏F♯°7, ‏C6 מעל סול. בירידה, סול, סול במול, פה: אותו דימיניש מלמעלה.' },
        play: [P(['IV6', 'sIV', 'I6_5']), rest(0.5), P(['I6_5', 'sIV', 'IV6'])],
        show: { text: { en: 'IV6 – ♯IV°7 – I6/5', he: 'IV6 – ♯IV°7 – I6/5' } },
      },
      {
        say: { en: 'The auxiliary works on IV too: F6, F°7, F6, with F and D held. Pianists use it to make a long chord breathe without leaving it.', he: 'העזר עובד גם על IV: F6, ‏F°7, ‏F6, כשפה ורה מוחזקים. פסנתרנים משתמשים בו כדי שאקורד ארוך ינשום בלי לעזוב אותו.' },
        play: [P(['IV6', 'IVdim', 'IV6'])],
      },
      {
        say: { en: 'How to tell them apart in a tune: follow the bass. A chromatic step into a new chord means passing; a held bass under a chord that leaves and returns means auxiliary; a diminished after a pre-dominant, going straight home, is the dominant.', he: 'איך מבחינים ביניהם בשיר: עוקבים אחרי הבס. צעד כרומטי אל אקורד חדש — עובר; בס מוחזק מתחת לאקורד שיוצא וחוזר — עזר; דימיניש אחרי סובדומיננטה, שהולך ישר הביתה — דומיננטי.' },
      },
      {
        say: { en: 'A common mistake is to call every diminished a dominant. Play the bass alone first: if it walks by half steps, or sits still, the diminished is decorating, not resolving the key.', he: 'טעות נפוצה היא לקרוא לכל דימיניש דומיננטה. מנגנים קודם רק את הבס: אם הוא הולך בחצאי טונים, או עומד במקום, הדימיניש מקשט ולא פותר את הסולם.' },
      },
      {
        say: { en: 'On the keys these passages are k-sixdim 5; the auxiliary with its two common tones held is k-sixdim 11.', he: 'בקלידים המעברים האלה הם k-sixdim 5; העזר, עם שני הצלילים המשותפים מוחזקים, הוא k-sixdim 11.' },
      },
    ],
  },
  {
    id: 'bh-chords-move',
    area: 'play',
    emoji: '↕',
    title: { en: 'Chords move to chords', he: 'אקורדים זזים לאקורדים' },
    takeaway: {
      en: 'Every 6th chord has a diminished neighbour on each side in the 6th-diminished scale: all four voices step to it and back (C6 → D F A♭ B → C6 → B D F A♭ → C6), from every inversion, with the bass moving too.',
      he: 'לכל אקורד 6 יש שכן דימיניש מכל צד בסולם 6־דימיניש: כל ארבעת הקולות צועדים אליו וחוזרים (C6 → D F A♭ B → C6 → B D F A♭ → C6), מכל היפוך, וגם הבס זז.',
    },
    steps: [
      {
        say: { en: 'Barry Harris liked to say that chords move to chords. A 6th chord steps up to the diminished, and back.', he: 'בארי האריס אהב לומר שאקורדים זזים לאקורדים. אקורד 6 צועד למעלה אל הדימיניש, וחוזר.' },
        play: [chord(C6, 0.8), chord([62, 65, 68, 71], 0.8), chord(C6, 1.2)],
        show: { text: { en: 'C6 → °7 → C6', he: 'C6 → °7 → C6' } },
      },
      {
        say: { en: 'And down to the diminished below, and back. Every voice moves by step inside the scale; no voice leaps.', he: 'ולמטה אל הדימיניש שמתחת, וחזרה. כל קול זז בצעד בתוך הסולם; אף קול לא קופץ.' },
        play: [chord(C6, 0.8), chord(B7, 0.8), chord(C6, 1.2)],
        show: { notes: B7, chord: true, key: 'C' },
      },
      {
        say: { en: 'Do it from each inversion of the 6th chord, and let the bass move too: the left hand plays the lowest voice an octave down.', he: 'עושים את זה מכל היפוך של אקורד ה־6, וגם הבס זז: יד שמאל מנגנת את הקול הנמוך אוקטבה למטה.' },
        play: [chord([52, 64, 67, 69, 72], 0.8), chord([53, 65, 68, 71, 74], 0.8), chord([52, 64, 67, 69, 72], 1.2)],
        show: { text: { en: 'E G A C → F A♭ B D', he: 'E G A C → F A♭ B D' } },
      },
      {
        say: { en: 'In minor the same moves work: Cm6 steps to the same B°7, above and below, because the scale’s diminished does not change.', he: 'במינור אותן תנועות עובדות: Cm6 צועד לאותו B°7, מעל ומתחת, כי הדימיניש של הסולם לא משתנה.' },
        play: [chord(Cm6, 0.8), chord([62, 65, 68, 71], 0.8), chord(Cm6, 0.8), chord(B7, 0.8), chord(Cm6, 1.2)],
        show: { text: { en: 'Cm6 → °7 → Cm6', he: 'Cm6 → °7 → Cm6' } },
      },
      {
        say: { en: 'The voice-leading meter counts how far each voice moves: here never more than a whole step. Your turn on the keys.', he: 'מד הובלת הקולות סופר כמה כל קול זז: כאן אף פעם לא יותר מטון. תורכם בקלידים.' },
        show: { text: { en: '≤ 2 semitones a voice', he: '≤ 2 חצאי טון לקול' } },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: in the 6th-diminished scale the notes of the 6th chord and of the diminished alternate. So the scale step above or below every note of one chord is a note of the other.', he: 'למה זה עובד: בסולם 6־דימיניש הצלילים של אקורד ה־6 ושל הדימיניש מתחלפים. לכן הצעד בסולם מעל או מתחת לכל צליל של אקורד אחד הוא צליל של השני.' },
        play: [notes(SCALE, 0.26)],
      },
      {
        say: { en: 'This is what makes a static chord sound like it is moving. A bar of C6 becomes C6, B°7, C6, the line on top walking by step.', he: 'זה מה שגורם לאקורד עומד להישמע כאילו הוא זז. תיבה של C6 נעשית C6, ‏B°7, ‏C6, והקו העליון הולך בצעדים.' },
        play: [chord(C6, 0.7), chord([62, 65, 68, 71], 0.7), chord([64, 67, 69, 72], 0.7), chord([65, 68, 71, 74], 0.7), chord([67, 69, 72, 76], 1.2)],
      },
      {
        say: { en: 'In a tune every chord can move this way: Dm7 as F6 with its E°7, G7 as Dm6 with its C♯°7, C as C6 with B°7. That is k-sixdim 9 and 10.', he: 'בשיר כל אקורד יכול לזוז כך: Dm7 בתור F6 עם ה־E°7 שלו, ‏G7 בתור Dm6 עם ה־C♯°7 שלו, ‏C בתור C6 עם B°7. אלה k-sixdim 9 ו־10.' },
      },
      {
        say: { en: 'A common mistake is to move only the top voice and leave the others. Then two voices clash with the diminished. All four go together, every time.', he: 'טעות נפוצה היא להזיז רק את הקול העליון ולהשאיר את האחרים. אז שני קולות מתנגשים עם הדימיניש. כל הארבעה זזים יחד, בכל פעם.' },
      },
      {
        say: { en: 'Practise it slowly first, out of time, until your hand finds each neighbour without looking. Then add the click: one chord a beat, and the bass moving with the lowest voice.', he: 'מתרגלים קודם לאט, בלי קצב, עד שהיד מוצאת כל שכן בלי להסתכל. אחר כך מוסיפים מטרונום: אקורד לפעמה, והבס זז עם הקול הנמוך.' },
      },
      {
        say: { en: 'Recap: 6th chord, diminished, 6th chord — up and down, from every position, bass included. Small steps, all voices.', he: 'לסיכום: אקורד 6, דימיניש, אקורד 6 — למעלה ולמטה, מכל מצב, כולל הבס. צעדים קטנים, כל הקולות.' },
      },
    ],
  },
  {
    id: 'bh-m6-bass',
    area: 'jazz',
    emoji: '6',
    title: { en: 'One minor 6th, three basses', he: 'מינור 6 אחד, שלושה בסים' },
    takeaway: {
      en: 'Cm6 (C E♭ G A) over A is Am7♭5; over F it is F9 — the m6 is the 9 chord without its root (3, 5, ♭7, 9 of F). An m6 on its root, a m7♭5 a minor 3rd below, a 9 chord a 5th below.',
      he: 'Cm6 (דו מי במול סול לה) מעל לה הוא Am7♭5; מעל פה הוא F9 — ה־m6 הוא אקורד ה־9 בלי היסוד (3, ‏5, ‏♭7, ‏9 של פה). m6 על היסוד, ‏m7♭5 טרצה קטנה מתחת, אקורד 9 קווינטה מתחת.',
    },
    steps: [
      {
        say: { en: 'Cm6: C, E♭, G, A. Put A under it, and the same notes are Am7♭5.', he: 'Cm6: דו, מי במול, סול, לה. שמים לה מתחת, ואותם צלילים הם Am7♭5.' },
        play: [chord([48, ...Cm6], 1.2), chord([45, ...Cm6], 1.4)],
        show: { text: { en: 'Cm6 = Am7♭5', he: 'Cm6 = Am7♭5' } },
      },
      {
        say: { en: 'Put F under it: F, A, C, E♭, G — F9. The minor 6th is the 9 chord without its root: the 3rd, 5th, ♭7 and 9th of F.', he: 'שמים פה מתחת: פה, לה, דו, מי במול, סול — F9. המינור 6 הוא אקורד ה־9 בלי היסוד: הטרצה, הקווינטה, ה־♭7 וה־9 של פה.' },
        play: [chord([41, ...Cm6], 1.6)],
        show: { text: { en: 'Cm6 / F = F9', he: 'Cm6 / F = F9' } },
      },
      {
        say: { en: 'One shape, three chords: an m6 on its root, a m7♭5 a minor 3rd below, a 9 chord a 5th below.', he: 'צורה אחת, שלושה אקורדים: m6 על היסוד, ‏m7♭5 טרצה קטנה מתחת, אקורד 9 קווינטה מתחת.' },
        play: [chord([48, ...Cm6], 0.9), chord([45, ...Cm6], 0.9), chord([41, ...Cm6], 1.3)],
        show: { text: { en: 'C · A · F', he: 'C · A · F' } },
      },
      {
        say: { en: 'And the 9 chord wants to resolve: F9 goes to B♭, a 4th up. The minor 6th shape moves by step into B♭6.', he: 'ואקורד ה־9 רוצה להיפתר: F9 הולך ל־B♭, קוורטה למעלה. צורת המינור 6 זזה בצעדים אל B♭6.' },
        play: [chord([41, ...Cm6], 1), chord([46, 62, 65, 67, 70], 1.4)],
        show: { text: { en: 'F9 → B♭6', he: 'F9 → B♭6' } },
      },
      {
        say: { en: 'In a ii–V–I in C: Dm7 is F6, and G7 is Dm6, the 9 chord without its root. Listen to the bass. Your turn.', he: 'ב־ii–V–I ב־C: ‏Dm7 הוא F6, ו־G7 הוא Dm6, אקורד ה־9 בלי היסוד. הקשיבו לבס. תורכם.' },
        play: [chord([50, 65, 69, 72, 74], 1), chord([43, 62, 65, 69, 71], 1), chord([48, ...C6], 1.4)],
        show: { text: { en: 'F6/D · Dm6/G · C6', he: 'F6/D · Dm6/G · C6' } },
      },
    ],
    more: [
      {
        say: { en: 'Count it from F: F is the root, A the 3rd, C the 5th, E♭ the ♭7 and G the 9th. Leave out the F and the four notes left are Cm6.', he: 'סופרים מפה: פה היסוד, לה הטרצה, דו הקווינטה, מי במול ה־♭7 וסול ה־9. משמיטים את פה, וארבעת הצלילים שנשארים הם Cm6.' },
        play: [notes([41, 45, 48, 51, 55], 0.4)],
      },
      {
        say: { en: 'In minor: Dm7♭5 is Fm6, so the minor ii–V–i the 6th-diminished way is Fm6 over D, G7, Cm6.', he: 'במינור: Dm7♭5 הוא Fm6, ולכן ii–V–i מינורי בדרך 6־דימיניש הוא Fm6 מעל רה, ‏G7, ‏Cm6.' },
        play: [chord([50, 65, 68, 72, 74], 1), chord([43, 59, 65, 67, 71], 1), chord([48, ...Cm6], 1.4)],
      },
      {
        say: { en: 'Bass players and pianists share this: the pianist keeps one m6 shape while the bass chooses the chord. It is the reason Barry calls the minor 6th the most useful chord.', he: 'בסיסטים ופסנתרנים חולקים את זה: הפסנתרן שומר על צורת m6 אחת והבס בוחר את האקורד. זו הסיבה שבארי קורא למינור 6 האקורד השימושי ביותר.' },
      },
      {
        say: { en: 'A common slip: calling Cm6 over F a D chord. Count from the bass, not from the top: F under C E♭ G A is F9.', he: 'טעות נפוצה: לקרוא ל־Cm6 מעל פה אקורד של רה. סופרים מהבס, לא מלמעלה: פה מתחת לדו מי במול סול לה הוא F9.' },
      },
      {
        say: { en: 'The same holds in every key: Gm6 is Em7♭5 and C9 without its root; E♭m6 is Cm7♭5 and A♭9. Find the m6 first, then count down a minor 3rd and a 5th for the bass.', he: 'אותו דבר בכל סולם: Gm6 הוא Em7♭5 ו־C9 בלי היסוד; ‏E♭m6 הוא Cm7♭5 ו־A♭9. מוצאים קודם את ה־m6, ואז סופרים טרצה קטנה וקווינטה למטה בשביל הבס.' },
        play: [chord([43, 55, 58, 62, 64], 1), chord([40, 55, 58, 62, 64], 1), chord([36, 55, 58, 62, 64], 1.3)],
      },
      {
        say: { en: 'On the keys, k-sixdim 13 plays the minor 6th over its three basses in all twelve keys.', he: 'בקלידים, k-sixdim 13 מנגן את המינור 6 מעל שלושת הבסים שלו בכל שנים־עשר הסולמות.' },
      },
    ],
  },
  {
    id: 'bh-guitar-sets',
    area: 'play',
    emoji: '#',
    title: { en: '6th-diminished on every string set', he: '6־דימיניש על כל קבוצת מיתרים' },
    takeaway: {
      en: 'Drop-2 voicings sit on four adjacent strings — a six-string has three such sets (6–5–4–3, 5–4–3–2, 4–3–2–1). Play the 6th chord and its diminished up the scale on each; the shapes change where the G–B major 3rd falls inside the set.',
      he: 'קולות דרופ 2 יושבים על ארבעה מיתרים צמודים — לגיטרה של שישה מיתרים יש שלוש קבוצות כאלה (6–5–4–3, ‏5–4–3–2, ‏4–3–2–1). מנגנים את אקורד ה־6 והדימיניש שלו לאורך הסולם בכל אחת; הצורות משתנות איפה שהטרצה הגדולה בין סול לסי נופלת בתוך הקבוצה.',
    },
    steps: [
      {
        say: { en: 'A drop-2 voicing takes the second voice from the top of a close chord down an octave. It fits four adjacent strings.', he: 'קול דרופ 2 לוקח את הקול השני מלמעלה באקורד צמוד ומוריד אותו אוקטבה. הוא נכנס בארבעה מיתרים צמודים.' },
        play: [chord(C6, 1), chord([55, 60, 64, 69], 1.4)],
        show: { text: { en: 'C E G A → G C E A', he: 'C E G A → G C E A' } },
      },
      {
        say: { en: 'Six strings give three sets: 6–5–4–3, 5–4–3–2 and 4–3–2–1. The same chord has a different shape on each, because of the major 3rd between the G and B strings.', he: 'שישה מיתרים נותנים שלוש קבוצות: 6–5–4–3, ‏5–4–3–2 ו־4–3–2–1. לאותו אקורד יש צורה אחרת בכל אחת, בגלל הטרצה הגדולה בין מיתר סול למיתר סי.' },
        show: { text: { en: '6543 · 5432 · 4321', he: '6543 · 5432 · 4321' } },
      },
      {
        say: { en: 'The diminished in drop-2 is the easy one: four notes a minor 3rd apart keep the same shape when you move it three frets.', he: 'הדימיניש בדרופ 2 הוא הקל: ארבעה צלילים בהפרש טרצה קטנה שומרים על אותה צורה כשמזיזים אותו שלושה סריגים.' },
        play: [chord([53, 59, 62, 68], 0.9), chord([56, 62, 65, 71], 1.2)],
      },
      {
        say: { en: 'Up the scale: the 6th chord on 1, 3, 5 and 6, the diminished on 2, 4, ♭6 and 7. Find each top note on the set’s highest string and fit the chord under it.', he: 'לאורך הסולם: אקורד ה־6 על 1, ‏3, ‏5 ו־6, הדימיניש על 2, ‏4, ‏♭6 ו־7. מוצאים כל צליל עליון על המיתר הגבוה של הקבוצה ומתאימים את האקורד מתחתיו.' },
        play: [notes(SCALE, 0.26)],
      },
      {
        say: { en: 'Start slowly, one chord a beat, and say the string set out loud before you play. Your turn.', he: 'מתחילים לאט, אקורד לפעמה, ואומרים בקול את קבוצת המיתרים לפני שמנגנים. תורכם.' },
        play: [chord([55, 60, 64, 69], 0.8), chord([56, 62, 65, 71], 0.8), chord([57, 64, 67, 72], 1.2)],
      },
    ],
    more: [
      {
        say: { en: 'On 6–5–4–3 the voicings sit low and dark: good for a chord-melody bass register, less so for comping with a bass player.', he: 'על 6–5–4–3 הקולות יושבים נמוך וכהה: טוב לאקורד־מלודיה ברגיסטר הבס, פחות לליווי עם בסיסט.' },
      },
      {
        say: { en: 'On 5–4–3–2 the major 3rd between G and B falls between the two top strings, so every shape bends there by one fret.', he: 'על 5–4–3–2 הטרצה הגדולה בין סול לסי נופלת בין שני המיתרים העליונים, ולכן כל צורה מתכופפת שם בסריג אחד.' },
      },
      {
        say: { en: 'On 4–3–2–1 the top string carries the melody: this is the set for playing a tune in Barry’s block chords.', he: 'על 4–3–2–1 המיתר העליון נושא את המנגינה: זו הקבוצה לנגינת מנגינה באקורדי הבלוק של בארי.' },
        play: [chord([57, 64, 67, 72], 0.8), chord([59, 65, 68, 74], 0.8), chord([60, 67, 69, 76], 1.2)],
      },
      {
        say: { en: 'Minor works the same way with the ♭3: Cm6 and B°7. Learn the minor scale of chords on the set you know best first.', he: 'מינור עובד אותו דבר עם ה־♭3: ‏Cm6 ו־B°7. לומדים קודם את סולם האקורדים במינור על הקבוצה שהכי מוכרת לכם.' },
        play: [chord([55, 60, 63, 69], 1), chord([53, 59, 62, 68], 1.2)],
      },
      {
        say: { en: 'Moving between sets: the same chord with the same top note can sit on two sets. Choose the one that keeps your hand in place, so the line on top stays smooth and the shapes change little.', he: 'מעבר בין קבוצות: אותו אקורד עם אותו צליל עליון יכול לשבת על שתי קבוצות. בוחרים את זו שמשאירה את היד במקום, כך שהקו העליון נשאר חלק והצורות משתנות מעט.' },
      },
      {
        say: { en: 'A good routine: one key a day, the scale of chords up and down on each set, then a standard’s melody harmonised on 4–3–2–1.', he: 'שגרה טובה: סולם אחד ביום, סולם האקורדים למעלה ולמטה על כל קבוצה, ואז מנגינה של סטנדרט מהורמנת על 4–3–2–1.' },
      },
      {
        say: { en: 'Recap: three sets, two chords, eight shapes per octave on each. The guitar levels name the set in every item.', he: 'לסיכום: שלוש קבוצות, שני אקורדים, שמונה צורות באוקטבה בכל אחת. רמות הגיטרה נותנות את שם הקבוצה בכל פריט.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:bh-three-dim': 'bh-three-dim',
  'topic:bh-dim-roles': 'bh-dim-roles',
  'topic:bh-m6-bass': 'bh-m6-bass',
  // The keys and guitar levels that build on them open with the same lesson (App.tsx gate: "tech:<level id>").
  'tech:k-sixdim-5': 'bh-dim-roles',
  'tech:k-sixdim-11': 'bh-dim-roles',
  'tech:k-sixdim-12': 'bh-chords-move',
  'tech:k-sixdim-13': 'bh-m6-bass',
  'tech:g-harris-7': 'bh-guitar-sets',
};
