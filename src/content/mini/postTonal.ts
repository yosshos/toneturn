// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Owner 2026-11-19: Messiaen's modes of limited transposition, twelve-tone rows, Euclidean rhythms (Toussaint 2005).
// Every number matches the helpers the generators use (src/engine/postTonal.ts, src/engine/euclid.ts).

import type { MiniLesson } from '../miniTypes';
import type { NoteEvent, Stimulus } from '../../engine/lesson';

const ns = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const ch = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
const up = (t: number, steps: number[]) => steps.reduce<number[]>((a, s) => [...a, a[a.length - 1] + s], [t]);
/** A rhythm on a circle of pulses: a soft click on every pulse (accent on the first), a low drum on each hit. */
function cyc(p: string, cycles = 2, pulse = 0.2): Stimulus {
  const ev: NoteEvent[] = [];
  for (let c = 0; c < cycles; c++)
    [...p].forEach((x, i) => {
      const t = (c * p.length + i) * pulse;
      ev.push({ midi: 96, start: t, duration: 0.04, velocity: i === 0 ? 0.32 : 0.16, perc: i === 0 ? 'accent' : 'click' });
      if (x === 'x') ev.push({ midi: 45, start: t, duration: 0.14, velocity: 0.9, perc: 'kick' });
    });
  return { kind: 'events', events: ev, length: cycles * p.length * pulse + 0.2 };
}

const M1 = up(60, [2, 2, 2, 2, 2, 2]);
const M1b = up(61, [2, 2, 2, 2, 2, 2]);
const M2 = up(60, [1, 2, 1, 2, 1, 2, 1, 2]);
const M3 = up(60, [2, 1, 1, 2, 1, 1, 2, 1, 1]);
// A 4-note cell and its forms (inversion = intervals mirrored from the first note).
const P = [60, 61, 65, 63];
const I = P.map((x) => 120 - x); // C B G A
const R = P.slice().reverse();
const RI = I.slice().reverse();

export const LESSONS: MiniLesson[] = [
  {
    id: 'messiaen-modes',
    area: 'theory',
    emoji: 'scales',
    title: { en: "Messiaen's modes of limited transposition", he: 'המודוסים של מסיאן: טרנספוזיציה מוגבלת' },
    takeaway: { en: 'Seven scales that land back on their own notes when moved: the repeating block in semitones = the number of transpositions (2, 3, 4, then 6).', he: 'שבעה סולמות שחוזרים לאותם צלילים כשמזיזים אותם: גודל הבלוק החוזר בחצאי טונים = מספר הטרנספוזיציות (2, 3, 4, ואז 6).' },
    steps: [
      {
        say: { en: 'Olivier Messiaen built his harmony on seven special scales, the modes of limited transposition. Move one up a little, and it lands back on its own notes.', he: 'אוליבייה מסיאן בנה את ההרמוניה שלו על שבעה סולמות מיוחדים: המודוסים בטרנספוזיציה מוגבלת. מזיזים אחד מהם קצת למעלה, והוא נוחת שוב על אותם צלילים.' },
        play: [ns(M1)],
        show: { notes: M1, text: { en: 'mode 1 = 2 2 2 2 2 2', he: 'מודוס 1 = 2 2 2 2 2 2' } },
      },
      {
        say: { en: 'Mode 1 is the whole-tone scale you know: six notes, a whole step apart. Move it up a whole step and you get the same six notes. So there are only two: on C and on C sharp.', he: 'מודוס 1 הוא סולם הטון השלם שאתם מכירים: שישה צלילים, טון שלם ביניהם. מזיזים אותו טון שלם למעלה ומקבלים את אותם שישה צלילים. לכן יש רק שניים: על דו ועל דו דיאז.' },
        play: [ns(M1), rest(0.4), ns(M1b)],
        show: { notes: M1b, text: { en: '2 transpositions', he: '2 טרנספוזיציות' } },
      },
      {
        say: { en: 'Mode 2 is the diminished scale you know, started on its half step: half, whole, half, whole. Move it up three semitones and it lands on itself. So it has three transpositions.', he: 'מודוס 2 הוא הסולם המוקטן שאתם מכירים, כשמתחילים מחצי הטון שלו: חצי, שלם, חצי, שלם. מזיזים אותו שלושה חצאי טונים למעלה והוא נוחת על עצמו. לכן יש לו שלוש טרנספוזיציות.' },
        play: [ns(M2)],
        show: { notes: M2, text: { en: '1 2 · 1 2 · 1 2 · 1 2 → 3', he: '1 2 · 1 2 · 1 2 · 1 2 → 3' } },
      },
      {
        say: { en: 'The rule: find the block that repeats. Its size in semitones is the number of transpositions. Mode 1 repeats every 2 semitones, mode 2 every 3.', he: 'הכלל: מוצאים את הבלוק שחוזר. הגודל שלו בחצאי טונים הוא מספר הטרנספוזיציות. מודוס 1 חוזר כל 2 חצאי טונים, מודוס 2 כל 3.' },
        show: { text: { en: 'block of 2 → 2 · block of 3 → 3', he: 'בלוק של 2 ← 2 · בלוק של 3 ← 3' } },
      },
      {
        say: { en: 'Mode 3 repeats the block 2, 1, 1 three times: nine notes. The block spans four semitones, so it has four transpositions.', he: 'מודוס 3 חוזר על הבלוק 2, 1, 1 שלוש פעמים: תשעה צלילים. הבלוק משתרע על ארבעה חצאי טונים, ולכן יש לו ארבע טרנספוזיציות.' },
        play: [ns(M3, 0.26)],
        show: { notes: M3, text: { en: '2 1 1 · 2 1 1 · 2 1 1 → 4', he: '2 1 1 · 2 1 1 · 2 1 1 → 4' } },
      },
      {
        say: { en: 'Modes 4 to 7 repeat their block twice, every half octave, so each has six transpositions. Mode 5 has six notes, modes 4 and 6 have eight, mode 7 has ten.', he: 'מודוסים 4 עד 7 חוזרים על הבלוק שלהם פעמיים, כל חצי אוקטבה, ולכן לכל אחד שש טרנספוזיציות. למודוס 5 שישה צלילים, למודוסים 4 ו־6 שמונה, ולמודוס 7 עשרה.' },
        show: { text: { en: '4: 1 1 3 1 ×2 · 5: 1 4 1 ×2 · 6: 2 2 1 1 ×2 · 7: 1 1 1 2 1 ×2', he: '4: 1 1 3 1 ×2 · 5: 1 4 1 ×2 · 6: 2 2 1 1 ×2 · 7: 1 1 1 2 1 ×2' } },
      },
      {
        say: { en: 'Your turn! Count notes and transpositions, then tell modes 1, 2 and 3 apart by ear: whole steps only, half and whole, or whole, half, half.', he: 'תורכם! סופרים צלילים וטרנספוזיציות, ואז מבחינים בשמיעה בין מודוסים 1, 2 ו־3: רק טונים שלמים, חצי ושלם, או שלם, חצי, חצי.' },
        play: [ns(M1, 0.24), rest(0.3), ns(M2, 0.24), rest(0.3), ns(M3, 0.24)],
        show: { text: { en: '2 · 1 2 · 2 1 1', he: '2 · 1 2 · 2 1 1' } },
      },
    ],
    more: [
      {
        say: { en: 'Messiaen described the modes in his book The Technique of My Musical Language, from 1944. An ordinary scale has twelve transpositions; these have fewer, and that is the "limit".', he: 'מסיאן תיאר את המודוסים בספרו "הטכניקה של השפה המוזיקלית שלי", מ־1944. לסולם רגיל יש שתים־עשרה טרנספוזיציות; לאלה יש פחות, וזו ה"הגבלה".' },
        show: { text: { en: 'major scale: 12 · mode 1: 2', he: 'סולם מז׳ור: 12 · מודוס 1: 2' } },
      },
      {
        say: { en: 'By ear: mode 1 has no half steps at all. Mode 2 alternates half and whole. Mode 3 has groups of three notes in a row by half steps.', he: 'בשמיעה: במודוס 1 אין בכלל חצאי טונים. במודוס 2 חצי ושלם מתחלפים. במודוס 3 יש קבוצות של שלושה צלילים ברצף בחצאי טונים.' },
        play: [ns(M3.slice(1, 4), 0.4)],
        show: { notes: M3.slice(1, 4), text: { en: 'D E♭ E', he: 'רה מי♭ מי' } },
      },
      {
        say: { en: 'Chords live inside the modes too. The diminished seventh sits in mode 2, the augmented triad in mode 3. A chord with a seventh and a flat ninth, like C E G B flat D flat, is all mode 2.', he: 'גם אקורדים יושבים בתוך המודוסים. ספטאקורד מוקטן יושב במודוס 2, והמשולש המוגדל במודוס 3. אקורד עם ספטימה ו־9 במול, כמו דו מי סול סי במול רה במול, כולו ממודוס 2.' },
        play: [ch([60, 63, 66, 69]), ch([60, 64, 68]), ch([48, 64, 67, 70, 73])],
        show: { notes: [48, 64, 67, 70, 73], chord: true, text: { en: 'C7♭9 ⊂ mode 2', he: 'C7♭9 ⊂ מודוס 2' } },
      },
      {
        say: { en: 'Try it with the major scale: move C major up a semitone and almost every note changes, so all twelve keys are different. Move the whole-tone scale up a semitone and you reach its other version; one more semitone and you are back on the first.', he: 'נסו את זה עם סולם מז׳ור: מזיזים את דו מז׳ור חצי טון למעלה וכמעט כל הצלילים משתנים, ולכן כל שנים־עשר הסולמות שונים. מזיזים את סולם הטון השלם חצי טון למעלה ומגיעים לגרסה השנייה שלו; עוד חצי טון, וחוזרים לראשונה.' },
        play: [ns(M1, 0.22), rest(0.3), ns(M1b, 0.22), rest(0.3), ns(up(62, [2, 2, 2, 2, 2, 2]), 0.22)],
        show: { text: { en: 'C → C♯ → D = C again', he: 'דו ← דו♯ ← רה = שוב דו' } },
      },
      {
        say: { en: 'To keep: find the repeating block, measure it in semitones, and you have the number of transpositions.', he: 'לזכור: מוצאים את הבלוק החוזר, מודדים אותו בחצאי טונים, ויש לכם את מספר הטרנספוזיציות.' },
        show: { text: { en: '1: 2 · 2: 3 · 3: 4 · 4–7: 6', he: '1: 2 · 2: 3 · 3: 4 · 4–7: 6' } },
      },
    ],
  },
  {
    id: 'twelve-tone',
    area: 'theory',
    emoji: 'theory',
    title: { en: 'Twelve-tone rows: P, I, R, RI', he: 'סדרות של 12 צלילים: P, I, R, RI' },
    takeaway: { en: 'A row uses all twelve notes once. Its forms: prime (P), inversion (I, intervals mirrored), retrograde (R, backwards), retrograde inversion (RI); any form can be moved (Pn). The matrix lays them all out.', he: 'סדרה משתמשת בכל 12 הצלילים פעם אחת. הצורות שלה: המקור (P), היפוך (I, המרווחים במראה), רטרוגרד (R, מהסוף), רטרוגרד של ההיפוך (RI); כל צורה אפשר להזיז (Pn). המטריצה מציגה את כולן.' },
    steps: [
      {
        say: { en: "In twelve-tone music, Schoenberg's method from the 1920s, a piece grows from a row: all twelve notes, each used once, in a fixed order.", he: 'במוזיקה של 12 צלילים, השיטה של שנברג משנות העשרים, יצירה צומחת מסדרה: כל שנים־עשר הצלילים, כל אחד פעם אחת, בסדר קבוע.' },
        play: [ns([60, 71, 67, 68, 63, 61, 62, 70, 66, 65, 64, 69], 0.32)],
        show: { notes: [60, 71, 67, 68, 63, 61, 62, 70, 66, 65, 64, 69], text: { en: '12 notes, each once', he: '12 צלילים, כל אחד פעם אחת' } },
      },
      {
        say: { en: 'A row has four forms. Let us watch them on a short cell of four notes. The prime, P, is the cell itself.', he: 'לסדרה יש ארבע צורות. נראה אותן על תא קצר של ארבעה צלילים. המקור, P, הוא התא עצמו.' },
        play: [ns(P, 0.45)],
        show: { notes: P, text: { en: 'P', he: 'P' } },
      },
      {
        say: { en: 'Inversion, I, turns it upside down: every interval mirrored. Up a semitone becomes down a semitone. It starts on the same note.', he: 'היפוך, I, הופך אותו: כל מרווח במראה. חצי טון למעלה הופך לחצי טון למטה. הוא מתחיל באותו צליל.' },
        play: [ns(P, 0.45), rest(0.4), ns(I, 0.45)],
        show: { notes: I, text: { en: 'I', he: 'I' } },
      },
      {
        say: { en: 'Retrograde, R, plays the cell backwards. Retrograde inversion, RI, plays the inversion backwards.', he: 'רטרוגרד, R, מנגן את התא מהסוף להתחלה. רטרוגרד של ההיפוך, RI, מנגן את ההיפוך מהסוף להתחלה.' },
        play: [ns(R, 0.45), rest(0.4), ns(RI, 0.45)],
        show: { notes: [...R, ...RI], durs: [1, 1, 1, 1, 1, 1, 1, 1], text: { en: 'R | RI', he: 'R | RI' } },
      },
      {
        say: { en: 'Any form can start on another note. The prime moved up two semitones is P2: every interval stays the same.', he: 'כל צורה יכולה להתחיל בצליל אחר. המקור שהוזז שני חצאי טונים למעלה הוא P2: כל המרווחים נשארים אותו דבר.' },
        play: [ns(P, 0.45), rest(0.4), ns(P.map((x) => x + 2), 0.45)],
        show: { notes: P.map((x) => x + 2), text: { en: 'P2', he: 'P2' } },
      },
      {
        say: { en: 'The matrix lays out all the forms: the prime along the top row, the inversion down the first column. Every row is the prime started on that column\'s note.', he: 'המטריצה מציגה את כל הצורות: המקור בשורה העליונה, וההיפוך בעמודה הראשונה. כל שורה היא המקור שמתחיל בצליל של העמודה.' },
        show: { text: { en: 'C D♭ F E♭ / B C E D / G A♭ C B♭ / A B♭ D C', he: 'דו רה♭ פה מי♭ / סי דו מי רה / סול לה♭ דו סי♭ / לה סי♭ רה דו' } },
      },
      {
        say: { en: 'Your turn! Name the form on paper and by ear, check whether a row uses every note once, and fill a gap in a matrix.', he: 'תורכם! תנו שם לצורה בכתב ובשמיעה, בדקו אם סדרה משתמשת בכל צליל פעם אחת, והשלימו צליל חסר במטריצה.' },
        show: { text: { en: 'P · I · R · RI', he: 'P · I · R · RI' } },
      },
    ],
    more: [
      {
        say: { en: 'To tell the forms apart, look at the ends. Same first note with mirrored steps: inversion. The last note comes first: retrograde. Both: retrograde inversion. Same steps, new start: a moved prime.', he: 'כדי להבחין בין הצורות, הסתכלו על הקצוות. אותו צליל ראשון והצעדים במראה: היפוך. הצליל האחרון בא ראשון: רטרוגרד. שניהם: רטרוגרד של ההיפוך. אותם צעדים, התחלה חדשה: מקור מוזז.' },
        play: [ns(P, 0.42), rest(0.4), ns(I, 0.42), rest(0.4), ns(R, 0.42)],
        show: { text: { en: 'first note · direction of steps', he: 'הצליל הראשון · כיוון הצעדים' } },
      },
      {
        say: { en: 'By ear, follow the contour. The inversion draws the same shape upside down: where the cell climbs, it falls. The retrograde draws the shape backwards, so the last turn of the cell comes first.', he: 'בשמיעה, עקבו אחרי הקו. ההיפוך מצייר את אותה צורה הפוכה: איפה שהתא עולה, הוא יורד. הרטרוגרד מצייר את הצורה מהסוף, כך שהפנייה האחרונה של התא באה ראשונה.' },
        play: [ns(P, 0.42), rest(0.4), ns(RI, 0.42)],
        show: { notes: [...P, ...RI], durs: [1, 1, 1, 1, 1, 1, 1, 1], text: { en: 'P | RI', he: 'P | RI' } },
      },
      {
        say: { en: 'A row of twelve notes has twelve primes, twelve inversions, twelve retrogrades and twelve retrograde inversions: up to forty-eight forms, all in one matrix.', he: 'לסדרה של 12 צלילים יש שנים־עשר מקורות, שנים־עשר היפוכים, שנים־עשר רטרוגרדים ושנים־עשר רטרוגרדים של ההיפוך: עד ארבעים ושמונה צורות, כולן במטריצה אחת.' },
        show: { text: { en: '12 × 4 = 48', he: '12 × 4 = 48' } },
      },
      {
        say: { en: 'The common slip in a row is a repeated note: then one of the twelve is missing. Count the pitch classes, not the octaves: a C up high and a C down low are the same pitch class.', he: 'הטעות הנפוצה בסדרה היא צליל שחוזר: אז אחד משנים־עשר הצלילים חסר. סופרים מחלקות צליל, לא אוקטבות: דו גבוה ודו נמוך הם אותה מחלקת צליל.' },
        play: [ns([60, 72], 0.6)],
      },
      {
        say: { en: 'Schoenberg\'s pupils Berg and Webern wrote with rows, and so did Stravinsky in his late works. To keep: P, I mirrored, R backwards, RI both.', he: 'התלמידים של שנברג, ברג ווברן, כתבו בסדרות, וכך גם סטרווינסקי ביצירותיו המאוחרות. לזכור: P, ‏I במראה, R מהסוף, RI שניהם.' },
        show: { text: { en: 'P · I · R · RI', he: 'P · I · R · RI' } },
      },
    ],
  },
  {
    id: 'euclid-rhythms',
    area: 'rhythm',
    emoji: 'euclid',
    title: { en: 'Euclidean rhythms E(k, n)', he: 'מקצבים אוקלידיים E(k, n)' },
    takeaway: { en: 'E(k, n): k hits spread as evenly as possible over n pulses. E(3,8) is the tresillo, E(5,8) the cinquillo; other traditional rhythms are rotations, like the bossa nova of E(5,16).', he: 'E(k, n): ‏k מכות מפוזרות באופן שווה ככל האפשר על n משבצות. E(3,8) הוא הטרסיו, E(5,8) הסינקיו; מקצבים מסורתיים אחרים הם רוטציות, כמו הבוסה נובה של E(5,16).' },
    steps: [
      {
        say: { en: 'Take eight pulses and three hits. Spread the hits as evenly as you can, and you get the tresillo you know.', he: 'לוקחים שמונה משבצות ושלוש מכות. מפזרים את המכות באופן שווה ככל האפשר, ומקבלים את הטרסיו שאתם מכירים.' },
        play: [cyc('x..x..x.', 3)],
        show: { text: { en: 'E(3,8) = x..x..x.', he: 'E(3,8) = x..x..x.' } },
      },
      {
        say: { en: 'Godfried Toussaint showed in 2005 that this one rule, k hits spread over n pulses, gives many traditional rhythms. He writes it E of k and n.', he: 'גודפריד טוסן הראה ב־2005 שהכלל הזה, k מכות מפוזרות על n משבצות, נותן הרבה מקצבים מסורתיים. הוא כותב אותו E של k ו־n.' },
        show: { text: { en: 'E(k, n): k hits · n pulses', he: 'E(k, n): ‏k מכות · n משבצות' } },
      },
      {
        say: { en: 'The rule comes from Euclid\'s algorithm, the ancient way to find a greatest common divisor. Bjorklund\'s version deals the rests out among the hits, again and again, until they are even.', he: 'הכלל בא מהאלגוריתם של אוקלידס, הדרך העתיקה למצוא מחלק משותף גדול ביותר. הגרסה של ביורקלונד מחלקת את השקטים בין המכות, שוב ושוב, עד שהם שווים.' },
        show: { text: { en: 'x x x . . . . . → x. x. x. . . → x.. x.. x.', he: 'x x x . . . . . → x. x. x. . . → x.. x.. x.' } },
      },
      {
        say: { en: 'Five hits over eight give the Cuban cinquillo. Seven over twelve give a West African bell pattern, and four over nine the Turkish aksak.', he: 'חמש מכות על שמונה נותנות את הסינקיו הקובני. שבע על שתים־עשרה נותנות דפוס פעמון ממערב אפריקה, וארבע על תשע את האקסאק הטורקי.' },
        play: [cyc('x.xx.xx.', 2), rest(0.4), cyc('x.xx.x.xx.x.', 2, 0.17), rest(0.4), cyc('x.x.x.x..', 2)],
        show: { text: { en: 'E(5,8) · E(7,12) · E(4,9)', he: 'E(5,8) · E(7,12) · E(4,9)' } },
      },
      {
        say: { en: 'Draw it on a circle: the pulses go round like a clock, and the hits make a shape. Start on another hit and you get a rotation: the same circle, a new rhythm.', he: 'מציירים את זה על מעגל: המשבצות מסתובבות כמו שעון, והמכות יוצרות צורה. מתחילים ממכה אחרת ומקבלים רוטציה: אותו מעגל, מקצב חדש.' },
        play: [cyc('x..x..x.', 2), rest(0.4), cyc('x..x.x..', 2)],
        show: { text: { en: 'x..x..x. → x..x.x..', he: 'x..x..x. → x..x.x..' } },
      },
      {
        say: { en: 'The bossa nova is such a rotation: Toussaint shows it is a rotation of five hits over sixteen.', he: 'הבוסה נובה היא רוטציה כזו: טוסן מראה שהיא רוטציה של חמש מכות על שש־עשרה.' },
        play: [cyc('x..x..x..x..x...', 2, 0.15), rest(0.4), cyc('x..x..x...x..x..', 2, 0.15)],
        show: { text: { en: 'E(5,16) → x..x..x...x..x..', he: 'E(5,16) → x..x..x...x..x..' } },
      },
      {
        say: { en: 'Your turn! Count the hits, pick the circle you heard, build E of k and n, and find a rotation. Count the pulses "1 & 2 &" if it helps.', he: 'תורכם! ספרו את המכות, בחרו את המעגל ששמעתם, בנו E של k ו־n, ומצאו רוטציה. אם זה עוזר, ספרו את המשבצות "1 ו 2 ו".' },
        play: [cyc('x.x..', 3)],
        show: { text: { en: 'E(2,5) = x.x..', he: 'E(2,5) = x.x..' } },
      },
    ],
    more: [
      {
        say: { en: 'Even means the gaps between hits come in at most two sizes, one apart. E of 3 and 8 has gaps of 3, 3 and 2; E of 5 and 8 has gaps of 2, 1, 2, 1 and 2. Count the pulses from one hit to the next to find them.', he: 'שווה פירושו שהמרווחים בין המכות באים בשני גדלים לכל היותר, בהפרש של אחד. ב־E של 3 ו־8 המרווחים הם 3, 3 ו־2; ב־E של 5 ו־8 הם 2, 1, 2, 1 ו־2. סופרים את המשבצות ממכה למכה כדי למצוא אותם.' },
        show: { text: { en: 'x..x..x. → 3 + 3 + 2', he: 'x..x..x. → 3 + 3 + 2' } },
      },
      {
        say: { en: 'Toussaint\'s list also has E of 3 and 4, E of 2 and 5, and E of 5 and 12.', he: 'ברשימה של טוסן יש גם E של 3 ו־4, ‏E של 2 ו־5, ו־E של 5 ו־12.' },
        play: [cyc('x.xx', 3), rest(0.3), cyc('x..x.x..x.x.', 2, 0.17)],
        show: { text: { en: 'x.xx · x.x.. · x..x.x..x.x.', he: 'x.xx · x.x.. · x..x.x..x.x.' } },
      },
      {
        say: { en: 'The common slip is hearing a rotation as a new rhythm. Find the accented first pulse, then check whether the gaps are the same, only starting elsewhere.', he: 'הטעות הנפוצה היא לשמוע רוטציה כמקצב חדש. מוצאים את המשבצת הראשונה המודגשת, ובודקים אם המרווחים אותם מרווחים, רק מתחילים ממקום אחר.' },
        show: { text: { en: '3 3 2 = 3 2 3 = 2 3 3', he: '3 3 2 = 3 2 3 = 2 3 3' } },
      },
      {
        say: { en: 'Hear the difference between even and uneven. Three hits over eight with gaps of 3, 3 and 2 swing round the circle; squeeze two hits together and the shape goes lopsided.', he: 'שמעו את ההבדל בין שווה ללא שווה. שלוש מכות על שמונה עם מרווחים של 3, 3 ו־2 מתגלגלות סביב המעגל; מצמידים שתי מכות והצורה נהיית עקומה.' },
        play: [cyc('x..x..x.', 2), rest(0.4), cyc('xx....x.', 2)],
        show: { text: { en: 'x..x..x. · xx....x.', he: 'x..x..x. · xx....x.' } },
      },
      {
        say: { en: 'To keep: k hits, n pulses, gaps as even as they get. Draw it on the circle, and turn the circle to start on another hit: that is a rotation, the same gaps in a new order.', he: 'לזכור: k מכות, n משבצות, מרווחים שווים ככל האפשר. מציירים על המעגל, ומסובבים אותו כדי להתחיל ממכה אחרת: זו רוטציה, אותם מרווחים בסדר חדש.' },
        show: { text: { en: 'E(k, n) · rotation', he: 'E(k, n) · רוטציה' } },
      },
    ],
  },
];
