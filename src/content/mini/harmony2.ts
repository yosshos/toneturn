// Quick lessons for the 0.38 topics (spec AE): inner hearing, triads, seventh chords, colour chords, song form,
// style. Sound first, plain words, EN + HE.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { arrange, ch, styleClip, voiceChords, type Chord, type LeadNote, type Section } from '../../engine/form';

const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const chord = (midis: number[], duration = 1.3, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const click = (start: number, accent = false): NoteEvent => ({ midi: 76, start, duration: 0.04, velocity: accent ? 0.5 : 0.3, perc: accent ? 'accent' : 'click' });
/** Notes on the beat with a click on every beat; `null` = a silent beat (the click goes on). */
function withClicks(midis: (number | null)[], beat = 0.6): Stimulus {
  const out: NoteEvent[] = [];
  midis.forEach((m, i) => {
    out.push(click(i * beat, i % 4 === 0));
    if (m !== null) out.push({ midi: m, start: i * beat, duration: beat * 0.9, velocity: 0.72 });
  });
  return ev(out, midis.length * beat + 0.3);
}
/** Voice-led chords in C (null = silent, the click goes on), `each` seconds apiece. */
function chords(list: (Chord | null)[], each = 0.9, clicks = false): Stimulus {
  const voiced = voiceChords(list.map((c) => c ?? ch(0)), 60);
  const out: NoteEvent[] = [];
  list.forEach((c, i) => {
    if (clicks) out.push(click(i * each, true));
    if (!c) return;
    const last = i === list.length - 1;
    voiced[i].forEach((m) => out.push({ midi: m, start: i * each, duration: last ? 1.6 : each * 0.95, velocity: 0.5 }));
  });
  return ev(out, (list.length - 1) * each + 1.8);
}
const play = (s: Section[], bpm = 116) => {
  const a = arrange(s, { tonic: 60, bpm, groove: 'rock' });
  return ev(a.events, a.length);
};
const clip = (style: Parameters<typeof styleClip>[0]) => {
  const a = styleClip(style, 60, 0);
  return ev(a.events, a.length);
};
const C = 60;

const verse: Section = { bars: [[ch(0)], [ch(5)], [ch(0)], [ch(7)]], energy: 1, lead: [[0, 4, 1], [1, 2, 1], [2, 0, 2], [4, 5, 1], [5, 4, 1], [6, 2, 2], [8, 4, 1.5], [9.5, 5, 0.5], [10, 7, 2], [12, 5, 1], [13, 4, 1], [14, 2, 2]] };
const hook: LeadNote[] = [[0, 12, 0.5], [0.5, 12, 0.5], [1, 14, 1], [2.5, 12, 0.5], [3, 9, 1]];
const chorus: Section = { bars: [[ch(0)], [ch(7)], [ch(9, 'm')], [ch(5)]], energy: 3, lead: [0, 1, 2].flatMap((b) => hook.map(([x, s, l]) => [b * 4 + x, s, l] as LeadNote)).concat([[12, 14, 1], [13, 12, 3]]) };
const bridge: Section = { bars: [[ch(8)], [ch(10)], [ch(5)], [ch(7, '7')]], energy: 2, lead: [[0, 15, 2], [2, 12, 2], [4, 14, 2], [6, 17, 2], [8, 17, 2], [10, 12, 2], [12, 14, 4]] };

export const LESSONS: MiniLesson[] = [
  {
    id: 'audiation',
    area: 'ear',
    emoji: '🧠',
    title: { en: 'Hear it in your head', he: 'לשמוע את זה בראש' },
    takeaway: { en: 'Musicians keep the music going inside when it goes quiet. Sing along silently, keep your place with the click, and you will know exactly where the music is when it comes back.', he: 'מוזיקאים ממשיכים את המוזיקה בפנים גם כשהיא שקטה. שירו בשקט, שמרו על המקום עם הקליק, ותדעו בדיוק איפה המוזיקה כשהיא חוזרת.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here is a tune you know, with a click on every beat. Sing it along in your head, without a sound.', he: 'היי {name}! הנה מנגינה שאתם מכירים, עם קליק על כל פעמה. שירו אותה בראש, בלי קול.' },
        play: [withClicks([C, C, C + 7, C + 7, C + 9, C + 9, C + 7, null])],
      },
      {
        say: { en: 'Now two notes go silent, but the click goes on. Keep singing inside — the tune should come back exactly where your inner voice is.', he: 'עכשיו שני צלילים נעלמים, אבל הקליק ממשיך. המשיכו לשיר בפנים — המנגינה צריכה לחזור בדיוק איפה שהקול הפנימי שלכם נמצא.' },
        play: [withClicks([C, C, C + 7, C + 7, null, null, C + 7, null])],
        show: { text: { en: '1 1 5 5 · · 5', he: '1 1 5 5 · · 5' } },
      },
      {
        say: { en: 'The same with a scale. It climbs, disappears for three notes and lands again. Which step did it land on? Count up silently with the clicks.', he: 'אותו דבר עם סולם. הוא עולה, נעלם לשלושה צלילים ונוחת שוב. על איזו דרגה הוא נחת? ספרו למעלה בשקט עם הקליקים.' },
        play: [withClicks([C, C + 2, null, null, null, C + 9, C + 11, C + 12])],
      },
      {
        say: { en: 'Chords too: a loop plays once, then two chords go silent. Keep the loop turning in your head and the right chord comes back.', he: 'גם אקורדים: לופ מתנגן פעם אחת, ואז שני אקורדים שותקים. המשיכו לסובב את הלופ בראש, והאקורד הנכון חוזר.' },
        play: [chords([ch(0), ch(9, 'm'), ch(5), ch(7), ch(0), null, null, ch(7)], 0.8, true)],
      },
      {
        say: { en: 'That skill is called audiation. Practice it anywhere: hum a song, stop, keep it going silently, then come back in.', he: 'הכישור הזה נקרא אודיאציה. אפשר לתרגל אותו בכל מקום: מזמזמים שיר, עוצרים, ממשיכים בשקט, ואז חוזרים לשיר בקול.' },
      },
    ],
    more: [
      {
        say: { en: 'Audiation means hearing and understanding music in your mind when no sound is present. The term comes from the music educator Edwin Gordon. It is to music what thinking in words is to language.', he: 'אודיאציה פירושה לשמוע ולהבין מוזיקה בראש כשאין שום צליל. המונח בא ממחנך המוזיקה אדווין גורדון. היא למוזיקה מה שחשיבה במילים היא לשפה.' },
      },
      {
        say: { en: 'It is more than memory: when you audiate, you predict. You know which note comes next and where the beat falls, so a wrong note jumps out at once. Listen — the second time, one note is off.', he: 'זה יותר מזיכרון: כשעושים אודיאציה, צופים קדימה. יודעים איזה צליל בא ואיפה נופלת הפעמה, ולכן צליל שגוי קופץ מיד. הקשיבו — בפעם השנייה צליל אחד לא במקום.' },
        play: [withClicks([C, C, C + 7, C + 7, C + 9, C + 9, C + 7, null]), rest(0.4), withClicks([C, C, C + 7, C + 7, C + 9, C + 10, C + 7, null])],
        show: { text: { en: '1 1 5 5 6 6 5 · 1 1 5 5 6 ♭7 5', he: '1 1 5 5 6 6 5 · 1 1 5 5 6 ♭7 5' } },
      },
      {
        say: { en: 'The pulse is the frame that holds the silent music. During a gap, count the beats in your head so the music returns exactly on time. Here four notes of the scale go silent.', he: 'הפעמה היא המסגרת שמחזיקה את המוזיקה השקטה. בזמן הפסקה, ספרו את הפעמות בראש כדי שהמוזיקה תחזור בדיוק בזמן. כאן ארבעה צלילים של הסולם שותקים.' },
        play: [withClicks([C, C + 2, C + 4, null, null, null, null, C + 12])],
        show: { text: { en: '1 2 3 · · · · 1', he: '1 2 3 · · · · 1' } },
      },
      {
        say: { en: 'Harmony can be audiated too. Start with the bass: it is the easiest part to carry silently, and the chords hang on it. Hum the lowest notes of this loop, then keep them going in your head.', he: 'אפשר לעשות אודיאציה גם להרמוניה. התחילו מהבס: הוא החלק הכי קל להמשיך בשקט, והאקורדים נשענים עליו. זמזמו את הצלילים הנמוכים של הלופ הזה, ואז המשיכו אותם בראש.' },
        play: [chords([ch(0), ch(9, 'm'), ch(5), ch(7), ch(0)], 0.8)],
        show: { text: { en: 'I – vi – IV – V – I', he: 'I – vi – IV – V – I' } },
      },
      {
        say: { en: 'A practice routine: sing a scale but voice only every other note; the silent ones still happen inside. Then try a song you know with whole bars left silent.', he: 'שגרת תרגול: שירו סולם אבל השמיעו בקול רק כל צליל שני; הצלילים השקטים עדיין קורים בפנים. אחר כך נסו שיר מוכר עם תיבות שלמות בשקט.' },
        play: [withClicks([C, null, C + 4, null, C + 7, null, C + 11, C + 12])],
        show: { text: { en: '1 · 3 · 5 · 7 1', he: '1 · 3 · 5 · 7 1' } },
      },
      {
        say: { en: 'The common mistake is letting the tempo drift in the silence — most people rush. Keep the beat in your body: tap a finger, nod, or breathe with it.', he: 'הטעות הנפוצה היא לתת לטמפו לזוז בזמן השקט — רוב האנשים ממהרים. החזיקו את הפעמה בגוף: הקישו באצבע, הנהנו, או נשמו איתה.' },
      },
      {
        say: { en: 'Musicians audiate all the time: a singer hears the first note before the band starts, a sight-reader hears the page before playing it, a composer hears parts with no instrument at hand.', he: 'מוזיקאים עושים אודיאציה כל הזמן: זמרת שומעת את הצליל הראשון לפני שהלהקה מתחילה, קורא תווים שומע את הדף לפני שהוא מנגן, ומלחין שומע קולות בלי כלי ביד.' },
      },
      {
        say: { en: 'Recap: audiation is hearing music inside, with its pulse and its harmony. Keep counting, predict what comes next, and check yourself when the sound returns.', he: 'לסיכום: אודיאציה היא לשמוע מוזיקה בפנים, עם הפעמה וההרמוניה שלה. המשיכו לספור, צפו מה בא, ובדקו את עצמכם כשהצליל חוזר.' },
      },
    ],
  },
  {
    id: 'triad-types',
    area: 'harmony',
    emoji: '🔺',
    title: { en: 'Triad types', he: 'סוגי משולשים' },
    takeaway: { en: 'Major is bright, minor is darker, diminished is tight and tense, augmented floats, sus chords are open and want to resolve. The bass note tells you the inversion.', he: 'מז׳ור בהיר, מינור כהה יותר, מוקטן צפוף ומתוח, מוגדל מרחף, ואקורדי סאס פתוחים ורוצים להיפתר. צליל הבס מגלה את ההיפוך.' },
    steps: [
      {
        say: { en: 'Hi {name}! A triad is three notes stacked in thirds. Major sounds bright and settled, minor sounds darker.', he: 'היי {name}! משולש הוא שלושה צלילים בטרצות. מז׳ור נשמע בהיר ויציב, מינור נשמע כהה יותר.' },
        play: [chord([C, C + 4, C + 7], 1.2, true), rest(0.3), chord([C, C + 3, C + 7], 1.2, true)],
      },
      {
        say: { en: 'Diminished squeezes the top note down: small and tense. Augmented pushes it up: wide, floating, like a question.', he: 'מוקטן מוריד את הצליל העליון: קטן ומתוח. מוגדל מעלה אותו: רחב ומרחף, כמו שאלה.' },
        play: [chord([C, C + 3, C + 6], 1.2, true), rest(0.3), chord([C, C + 4, C + 8], 1.2, true)],
      },
      {
        say: { en: 'Sus chords have no third at all. Sus four leans on the fourth and wants to fall to the third — listen to it resolve.', he: 'לאקורדי סאס אין טרצה בכלל. סאס 4 נשען על הקוורטה ורוצה לרדת לטרצה — הקשיבו לפתרון.' },
        play: [chord([C - 12, C, C + 5, C + 7], 1.2), chord([C - 12, C, C + 4, C + 7], 1.4)],
      },
      {
        say: { en: 'Inversions keep the same notes but change the bass. Root position, then the third in the bass, then the fifth. Listen to the lowest note.', he: 'בהיפוכים הצלילים אותם צלילים, אבל הבס משתנה. מצב יסודי, אחר כך הטרצה בבס, ואז הקווינטה. הקשיבו לצליל הנמוך.' },
        play: [chord([C - 12, C, C + 4, C + 7], 1.1), chord([C - 8, C + 4, C + 7, C + 12], 1.1), chord([C - 5, C + 7, C + 12, C + 16], 1.3)],
      },
      {
        say: { en: 'Close position keeps the notes inside one octave; open position spreads them wide. Same chord, a fuller sound.', he: 'במצב צפוף הצלילים בתוך אוקטבה אחת; במצב פתוח הם פרושים לרוחב. אותו אקורד, צליל מלא יותר.' },
        play: [chord([C - 12, C - 8, C - 5, C], 1.3), rest(0.3), chord([C - 12, C - 5, C + 4, C + 7], 1.3)],
      },
    ],
    more: [
      {
        say: { en: 'A triad stacks two thirds on a root. Major: a major third (4 semitones), then a minor third (3) — C E G. Minor: minor, then major — C E♭ G. Both span a perfect fifth, 7 semitones.', he: 'משולש בונה שתי טרצות על יסוד. מז׳ור: טרצה גדולה (4 חצאי טונים) ואז טרצה קטנה (3) — דו מי סול. מינור: קטנה ואז גדולה — דו מי♭ סול. בשניהם יש קווינטה זכה, 7 חצאי טונים.' },
        play: [chord([C, C + 4, C + 7], 1.1, true), rest(0.2), chord([C, C + 3, C + 7], 1.1, true)],
        show: { notes: [C, C + 4, C + 7], key: 'C', text: { en: 'C E G · C E♭ G', he: 'דו מי סול · דו מי♭ סול' } },
      },
      {
        say: { en: 'Diminished stacks two minor thirds: C E♭ G♭ — the fifth shrinks to 6 semitones, a tritone. Augmented stacks two major thirds: C E G♯ — the fifth grows to 8.', he: 'מוקטן בונה שתי טרצות קטנות: דו מי♭ סול♭ — הקווינטה מתכווצת ל־6 חצאי טונים, טריטון. מוגדל בונה שתי טרצות גדולות: דו מי סול♯ — הקווינטה גדלה ל־8.' },
        play: [chord([C, C + 3, C + 6], 1.1, true), rest(0.2), chord([C, C + 4, C + 8], 1.1, true)],
        show: { text: { en: 'C E♭ G♭ · C E G♯', he: 'דו מי♭ סול♭ · דו מי סול♯' } },
      },
      {
        say: { en: 'In a major key the triads fall in place: major on 1, 4 and 5; minor on 2, 3 and 6; diminished on 7. Augmented never appears in major; it lives on 3 of harmonic minor.', he: 'בסולם מז׳ור המשולשים מסתדרים: מז׳ור על 1, 4 ו־5; מינור על 2, 3 ו־6; מוקטן על 7. מוגדל לא מופיע במז׳ור; הוא גר על 3 של המינור ההרמוני.' },
        play: [chords([ch(0), ch(2, 'm'), ch(4, 'm'), ch(5), ch(7), ch(9, 'm'), ch(11, 'd'), ch(0)], 0.55)],
        show: { text: { en: 'I ii iii IV V vi vii° I', he: 'I ii iii IV V vi vii° I' } },
      },
      {
        say: { en: 'Sus chords replace the third. Sus2 uses the 2nd (C D G), sus4 the 4th (C F G). With no third they are neither major nor minor — open and undecided until the third arrives.', he: 'אקורדי סאס מחליפים את הטרצה. סאס 2 משתמש בסקונדה (דו רה סול), סאס 4 בקוורטה (דו פה סול). בלי טרצה הם לא מז׳ור ולא מינור — פתוחים ולא מוכרעים עד שהטרצה מגיעה.' },
        play: [chord([C, C + 2, C + 7], 1), chord([C, C + 5, C + 7], 1), chord([C, C + 4, C + 7], 1.3)],
        show: { text: { en: 'sus2 · sus4 · C', he: 'sus2 · sus4 · C' } },
      },
      {
        say: { en: 'A listening order: first, stable or not? Major and minor are stable. Then sort the rest: bright or dark (major, minor), squeezed (diminished), stretched (augmented), or hollow (sus).', he: 'סדר הקשבה: קודם, יציב או לא? מז׳ור ומינור יציבים. אחר כך ממיינים: בהיר או כהה (מז׳ור, מינור), דחוס (מוקטן), מתוח לרוחב (מוגדל), או חלול (סאס).' },
      },
      {
        say: { en: 'A common confusion is minor versus diminished: both start with a minor third. Listen to the top note — in diminished it is a semitone lower and pulls inward.', he: 'בלבול נפוץ הוא מינור מול מוקטן: שניהם מתחילים בטרצה קטנה. הקשיבו לצליל העליון — במוקטן הוא נמוך בחצי טון ומושך פנימה.' },
        play: [chord([C, C + 3, C + 7], 1.2), rest(0.2), chord([C, C + 3, C + 6], 1.2)],
        show: { text: { en: 'Cm · Cdim', he: 'Cm · Cdim' } },
      },
      {
        say: { en: 'Inversions name the bass: root in the bass is root position; the third, first inversion (figured 6); the fifth, second inversion (6/4). The quality never changes — only the weight of the chord.', he: 'ההיפוכים נקראים לפי הבס: יסוד בבס הוא מצב יסודי; טרצה בבס, היפוך ראשון (סקסט, 6); קווינטה בבס, היפוך שני (קוורטסקסט, 6/4). האיכות לא משתנה — רק המשקל של האקורד.' },
        play: [chord([C - 12, C, C + 4, C + 7], 0.9), chord([C - 8, C, C + 7, C + 12], 0.9), chord([C - 5, C, C + 4, C + 12], 1.2)],
        show: { text: { en: '5/3 · 6 · 6/4', he: '5/3 · 6 · 6/4' } },
      },
      {
        say: { en: 'In real music, major and minor triads carry most pop, folk and classical harmony. Diminished chords often pass between two others, and a sus4 resolving to major is a favorite in rock and hymns alike.', he: 'במוזיקה אמיתית, משולשים מז׳וריים ומינוריים נושאים את רוב ההרמוניה בפופ, בפולק ובמוזיקה קלאסית. אקורדים מוקטנים עוברים הרבה בין שני אקורדים, וסאס 4 שנפתר למז׳ור אהוב גם ברוק וגם במזמורים.' },
        play: [chords([ch(0), ch(5), ch(7, 'sus4'), ch(7), ch(0)], 0.8)],
        show: { text: { en: 'I – IV – Vsus4 – V – I', he: 'I – IV – Vsus4 – V – I' } },
      },
      {
        say: { en: 'Recap: two stacked thirds make a triad; their sizes give major, minor, diminished or augmented. Sus replaces the third, and the bass names the inversion.', he: 'לסיכום: שתי טרצות זו על זו יוצרות משולש; הגודל שלהן קובע מז׳ור, מינור, מוקטן או מוגדל. סאס מחליף את הטרצה, והבס קובע את ההיפוך.' },
      },
    ],
  },
  {
    id: 'seventh-types',
    area: 'harmony',
    emoji: '7️⃣',
    title: { en: 'Seventh chords', he: 'ספטאקורדים' },
    takeaway: { en: 'Add a seventh to a triad and you get a four-note chord: maj7 is dreamy, 7 (dominant) wants to move, m7 is mellow, half-diminished is dark, dim7 is tense and symmetrical.', he: 'מוסיפים ספטימה למשולש ומקבלים אקורד של ארבעה צלילים: maj7 חלומי, 7 (דומיננטי) רוצה לזוז, m7 רך, חצי מוקטן כהה, ו־dim7 מתוח וסימטרי.' },
    steps: [
      {
        say: { en: 'Hi {name}! A seventh chord is a triad with one more third on top. Major seven: soft, dreamy, a little jazzy.', he: 'היי {name}! ספטאקורד הוא משולש עם עוד טרצה למעלה. ספט מז׳ור: רך, חלומי, קצת ג׳אזי.' },
        play: [chord([C - 12, C, C + 4, C + 7, C + 11], 1.4, true)],
      },
      {
        say: { en: 'The dominant seven has a tense core that wants to move on. Here it resolves home.', he: 'בספט הדומיננטי יש לב מתוח שרוצה להמשיך. כאן הוא נפתר הביתה.' },
        play: [chord([C - 17, C - 1, C + 2, C + 5], 1.2), chord([C - 12, C, C + 4, C + 7], 1.4)],
      },
      {
        say: { en: 'Minor seven is mellow and relaxed. Half-diminished darkens it by lowering the fifth. Diminished seven lowers the seventh too — pure tension.', he: 'ספט מינור רך ורגוע. חצי מוקטן מכהה אותו בהנמכת הקווינטה. ספט מוקטן מנמיך גם את הספטימה — מתח טהור.' },
        play: [chord([C - 12, C, C + 3, C + 7, C + 10], 1.1), chord([C - 12, C, C + 3, C + 6, C + 10], 1.1), chord([C - 12, C, C + 3, C + 6, C + 9], 1.3)],
      },
      {
        say: { en: 'Four notes means four possible basses: root position, then the third, the fifth and the seventh in the bass. The seventh in the bass sounds the most restless.', he: 'ארבעה צלילים פירושם ארבעה בסים אפשריים: מצב יסודי, ואז הטרצה, הקווינטה והספטימה בבס. הספטימה בבס נשמעת הכי חסרת מנוחה.' },
        play: [chord([C - 17, C - 5, C - 1, C + 2, C + 5], 1), chord([C - 13, C - 1, C + 2, C + 5, C + 7], 1), chord([C - 10, C + 2, C + 5, C + 7, C + 11], 1), chord([C - 7, C + 5, C + 7, C + 11, C + 14], 1.3)],
      },
      {
        say: { en: 'Tip: first decide if the chord is bright or dark, then whether it is calm or tense. That narrows it down fast.', he: 'טיפ: קודם החליטו אם האקורד בהיר או כהה, ואחר כך אם הוא רגוע או מתוח. זה מצמצם את האפשרויות מהר.' },
      },
    ],
    more: [
      {
        say: { en: 'A seventh chord is a triad plus the seventh above the root. Its name comes from two choices: the triad (major, minor or diminished) and the seventh (major, 11 semitones; minor, 10; diminished, 9).', he: 'ספטאקורד הוא משולש ועוד הספטימה מעל היסוד. השם שלו נקבע משתי בחירות: המשולש (מז׳ור, מינור או מוקטן) והספטימה (גדולה, 11 חצאי טונים; קטנה, 10; מוקטנת, 9).' },
      },
      {
        say: { en: 'The five types on C: maj7 is C E G B; 7 is C E G B♭; m7 is C E♭ G B♭; half-diminished, ø7, is C E♭ G♭ B♭; diminished, °7, is C E♭ G♭ B𝄫 — sounding like A.', he: 'חמשת הסוגים על דו: maj7 הוא דו מי סול סי; 7 הוא דו מי סול סי♭; m7 הוא דו מי♭ סול סי♭; חצי מוקטן, ø7, הוא דו מי♭ סול♭ סי♭; מוקטן, °7, הוא דו מי♭ סול♭ סי𝄫 — שנשמע כמו לה.' },
        play: [chord([C, C + 4, C + 7, C + 11], 0.9), chord([C, C + 4, C + 7, C + 10], 0.9), chord([C, C + 3, C + 7, C + 10], 0.9), chord([C, C + 3, C + 6, C + 10], 0.9), chord([C, C + 3, C + 6, C + 9], 1.2)],
        show: { text: { en: 'maj7 · 7 · m7 · ø7 · °7', he: 'maj7 · 7 · m7 · ø7 · °7' } },
      },
      {
        say: { en: 'In a major key: Imaj7 and IVmaj7; ii7, iii7 and vi7 are minor sevenths; V7 is the only dominant seventh; viiø7 is half-diminished. The full diminished seventh comes from harmonic minor.', he: 'בסולם מז׳ור: Imaj7 ו־IVmaj7; ii7, iii7 ו־vi7 הם ספט מינור; V7 הוא הספט הדומיננטי היחיד; viiø7 חצי מוקטן. הספט המוקטן המלא בא מהמינור ההרמוני.' },
        play: [chords([ch(2, 'm7'), ch(7, '7'), ch(0, 'maj7')], 1)],
        show: { text: { en: 'ii7 – V7 – Imaj7', he: 'ii7 – V7 – Imaj7' } },
      },
      {
        say: { en: 'Why V7 pulls home: G7 contains B and F, a tritone apart. B rises to C, F falls to E, and the tension dissolves into the tonic chord.', he: 'למה V7 מושך הביתה: ב־G7 יש סי ופה, במרחק טריטון. סי עולה לדו, פה יורד למי, והמתח נמס לתוך אקורד הטוניקה.' },
        play: [chord([C - 17, C - 1, C + 5], 1.2), chord([C - 12, C, C + 4], 1.5)],
        show: { notes: [43, 59, 65], text: { en: 'B → C · F → E', he: 'סי → דו · פה → מי' } },
      },
      {
        say: { en: 'How to hear the seventh: find the triad first, then listen to the top. A major seventh sits a semitone under the octave and rubs sweetly; a minor seventh is a whole tone under and sounds bluesy.', he: 'איך שומעים את הספטימה: קודם מוצאים את המשולש, ואז מקשיבים למעלה. ספטימה גדולה יושבת חצי טון מתחת לאוקטבה ומתחככת במתיקות; ספטימה קטנה נמצאת טון מתחת ונשמעת בלוזית.' },
        play: [chord([C - 12, C + 4, C + 7, C + 11], 1.2), rest(0.2), chord([C - 12, C + 4, C + 7, C + 10], 1.2)],
        show: { text: { en: 'Cmaj7 · C7', he: 'Cmaj7 · C7' } },
      },
      {
        say: { en: 'A common mistake is in the names: plain “C7” always means the minor seventh, B♭ — the dominant sound. The major seventh must be written maj7 or Δ7.', he: 'טעות נפוצה היא בשמות: “C7” לבד תמיד פירושו ספטימה קטנה, סי במול — הצליל הדומיננטי. ספטימה גדולה חייבים לכתוב maj7 או Δ7.' },
      },
      {
        say: { en: 'The diminished seventh is built only from minor thirds, so it divides the octave into four equal parts. B D F A♭ resolves to C — and the same sound, respelled, can lead to three other keys.', he: 'הספט המוקטן בנוי רק מטרצות קטנות, ולכן הוא מחלק את האוקטבה לארבעה חלקים שווים. סי רה פה לה♭ נפתר לדו — ואותו צליל, בכתיב אחר, יכול להוביל לעוד שלושה סולמות.' },
        play: [chord([C - 1, C + 2, C + 5, C + 8], 1.2), chord([C, C + 4, C + 7, C + 12], 1.5)],
        show: { notes: [59, 62, 65, 68], chord: true, text: { en: 'B°7 → C', he: 'B°7 → C' } },
      },
      {
        say: { en: 'In real music: jazz runs on sevenths, and ii7–V7–Imaj7 is its most common progression. Blues puts a dominant seventh on every chord. Classical music relies on V7 and vii°7 to drive its cadences.', he: 'במוזיקה אמיתית: הג׳אז רץ על ספטאקורדים, ו־ii7–V7–Imaj7 הוא המהלך הנפוץ ביותר שלו. בבלוז יש ספט דומיננטי על כל אקורד. המוזיקה הקלאסית נשענת על V7 ו־vii°7 כדי להניע את הקדנצות.' },
      },
      {
        say: { en: 'Recap: triad plus seventh. Major triad with a major seventh is maj7, with a minor seventh it is the dominant 7. Minor gives m7; diminished gives ø7 or °7.', he: 'לסיכום: משולש ועוד ספטימה. משולש מז׳ורי עם ספטימה גדולה הוא maj7, עם ספטימה קטנה — 7 הדומיננטי. מינור נותן m7; מוקטן נותן ø7 או °7.' },
      },
    ],
  },
  {
    id: 'chromatic-chords',
    area: 'harmony',
    emoji: '🎨',
    title: { en: 'Color chords', he: 'אקורדי צבע' },
    takeaway: { en: 'Color chords borrow notes from outside the key. The cadential 6/4, the Neapolitan, the augmented sixth and borrowed chords each add a typical color before the music goes home.', he: 'אקורדי צבע שואלים צלילים מחוץ לסולם. הקוורטסקסט הקדנציאלי, הנפוליטני, הסקסטה המוגדלת והאקורדים השאולים מוסיפים כל אחד צבע אופייני לפני החזרה הביתה.' },
    steps: [
      {
        say: { en: 'Hi {name}! First a plain cadence. Then the same with a cadential six four: the home chord over the fifth in the bass, delaying the V.', he: 'היי {name}! קודם קדנצה פשוטה. אחר כך אותה קדנצה עם קוורטסקסט קדנציאלי: אקורד הבית מעל הקווינטה בבס, שמשהה את ה־V.' },
        play: [chords([ch(0), ch(5), ch(7), ch(7, '7'), ch(0)], 0.7), rest(0.4), chords([ch(0), ch(5), ch(0, 'M', 7), ch(7, '7'), ch(0)], 0.7)],
      },
      {
        say: { en: 'In minor, the Neapolitan lowers the second step. It sounds noble and dark, and leads to V.', he: 'במינור, הנפוליטני מנמיך את הדרגה השנייה. הוא נשמע אצילי וכהה, ומוביל ל־V.' },
        play: [chords([ch(0, 'm'), ch(1, 'M', 5), ch(7, '7'), ch(0, 'm')], 0.85)],
      },
      {
        say: { en: 'The augmented sixth: two notes spread apart and move outward to the same note, in the bass and on top. It pours into V.', he: 'הסקסטה המוגדלת: שני צלילים שמתרחקים זה מזה אל אותו צליל, בבס ולמעלה. היא נשפכת אל ה־V.' },
        play: [chord([C - 16, C, C + 3, C + 6], 1.2), chord([C - 17, C - 1, C + 2, C + 7], 1.5)],
      },
      {
        say: { en: 'Borrowed chords come from the minor key while you stay in major. The minor four gives a sweet, sad touch on the way home.', he: 'אקורדים שאולים מגיעים מהמינור בזמן שנשארים במז׳ור. הרביעית המינורית נותנת נגיעה מתוקה ועצובה בדרך הביתה.' },
        play: [chords([ch(0), ch(5), ch(5, 'm'), ch(0)], 0.9)],
      },
      {
        say: { en: 'Listen for the moment the color changes, then for where it goes next. Almost every color chord leads to V or straight home.', he: 'הקשיבו לרגע שבו הצבע משתנה, ואז לאן הוא ממשיך. כמעט כל אקורד צבע מוביל ל־V או ישר הביתה.' },
      },
    ],
    more: [
      {
        say: { en: 'Chromatic chords use notes from outside the key without leaving it. They color the road to a goal — usually V or I — and each has a typical sound and a typical destination.', he: 'אקורדים כרומטיים משתמשים בצלילים מחוץ לסולם בלי לעזוב אותו. הם צובעים את הדרך אל היעד — בדרך כלל V או I — ולכל אחד צליל אופייני ויעד אופייני.' },
      },
      {
        say: { en: 'The most common is the secondary dominant: a dominant seventh aimed at a chord other than I. In C, D7 with its F♯ is “V of V” and drives to G.', he: 'הנפוץ ביותר הוא הדומיננטה המשנית: ספט דומיננטי שמכוון לאקורד אחר מ־I. בדו, D7 עם הפה דיאז שלו הוא “V של V” ודוחף אל סול.' },
        play: [chords([ch(0), ch(2, '7'), ch(7), ch(0)], 0.9)],
        show: { text: { en: 'I – V7/V – V – I', he: 'I – V7/V – V – I' } },
      },
      {
        say: { en: 'The cadential 6/4 is the tonic triad over 5 in the bass — C E over G. It sounds like home, but works as V with two notes delayed: the 6 falls to 5 and the 4 to 3.', he: 'הקוורטסקסט הקדנציאלי הוא משולש הטוניקה מעל 5 בבס — דו ומי מעל סול. הוא נשמע כמו הבית, אבל מתפקד כ־V עם שני צלילים מושהים: 6 יורד ל־5 ו־4 יורד ל־3.' },
        play: [chord([43, 60, 64, 67], 1), chord([43, 59, 62, 67], 1), chord([36, 60, 64, 67], 1.4)],
        show: { text: { en: 'I 6/4 → V → I', he: 'I 6/4 → V → I' } },
      },
      {
        say: { en: 'The Neapolitan is a major chord on the lowered 2nd: in C minor, D♭ F A♭. It usually has F in the bass — the Neapolitan sixth — and moves to V, D♭ dropping to the leading note B.', he: 'הנפוליטני הוא אקורד מז׳ורי על הדרגה 2 המונמכת: בדו מינור, רה♭ פה לה♭. בדרך כלל פה בבס — הסקסטה הנפוליטנית — והוא עובר ל־V, כשרה♭ יורד לצליל המוביל סי.' },
        play: [chord([41, 56, 61, 65], 1.1), chord([43, 55, 59, 62], 1.1), chord([36, 55, 60, 63], 1.4)],
        show: { text: { en: 'N6 → V → i', he: 'N6 → V → i' } },
      },
      {
        say: { en: 'Augmented sixth chords put ♭6 in the bass and ♯4 above — A♭ and F♯ in C. Both slide a semitone outward to the octave G. Italian, French and German versions differ in their remaining notes.', he: 'אקורדי סקסטה מוגדלת שמים ♭6 בבס ו־♯4 מעליו — לה♭ ופה♯ בדו. שניהם מחליקים חצי טון החוצה לאוקטבה של סול. הגרסאות האיטלקית, הצרפתית והגרמנית נבדלות בשאר הצלילים.' },
        play: [chord([44, 60, 66, 72], 1.2), chord([43, 59, 67, 74], 1.5)],
        show: { text: { en: 'A♭ + F♯ → G + G', he: 'לה♭ + פה♯ → סול + סול' } },
      },
      {
        say: { en: 'Borrowed chords come from the parallel minor while you stay in major: iv (F A♭ C), ♭VI (A♭ C E♭), ♭VII (B♭ D F). The A♭ is the giveaway — a darker 6th inside a bright key.', he: 'אקורדים שאולים מגיעים מהמינור שעל אותה טוניקה (בדו מז׳ור: מדו מינור) בזמן שנשארים במז׳ור: iv (פה לה♭ דו), ♭VI (לה♭ דו מי♭), ♭VII (סי♭ רה פה). הלה במול מסגיר אותם — 6 כהה בתוך סולם בהיר.' },
        play: [chords([ch(0), ch(8), ch(10), ch(0)], 0.9)],
        show: { text: { en: 'I – ♭VI – ♭VII – I', he: 'I – ♭VI – ♭VII – I' } },
      },
      {
        say: { en: 'How to hear them: catch the odd note, then follow it. A sharp rising by semitone points to a secondary dominant; a flat 6 or flat 2 sinking toward 5 or 1 points to a borrowed, Neapolitan or augmented-sixth chord.', he: 'איך שומעים אותם: תופסים את הצליל הזר, ועוקבים אחריו. דיאז שעולה בחצי טון מצביע על דומיננטה משנית; 6 או 2 מונמכים ששוקעים אל 5 או 1 מצביעים על אקורד שאול, נפוליטני או סקסטה מוגדלת.' },
      },
      {
        say: { en: 'A common mistake is hearing the cadential 6/4 as a real arrival home. Check the bass: if it sits on 5 and V follows, the “home” was only a delay.', he: 'טעות נפוצה היא לשמוע את הקוורטסקסט הקדנציאלי כהגעה אמיתית הביתה. בדקו את הבס: אם הוא על 5 ואחריו בא V, ה“בית” היה רק השהיה.' },
      },
      {
        say: { en: 'In real music, Mozart and Beethoven place Neapolitan and augmented-sixth chords at big cadences. In pop and rock, ♭VI–♭VII–I and the minor iv are classic moves.', he: 'במוזיקה אמיתית, מוצרט ובטהובן שמים אקורדים נפוליטניים וסקסטות מוגדלות בקדנצות גדולות. בפופ וברוק, ♭VI–♭VII–I וה־iv המינורי הם מהלכים קלאסיים.' },
      },
      {
        say: { en: 'Recap: a color chord borrows a note from outside the key, and that note almost always moves by semitone toward V or I.', he: 'לסיכום: אקורד צבע שואל צליל מחוץ לסולם, והצליל הזה כמעט תמיד זז בחצי טון לכיוון V או I.' },
      },
    ],
  },
  {
    id: 'song-sections',
    area: 'ear',
    emoji: '🧩',
    title: { en: 'Verse, chorus, bridge', he: 'בית, פזמון, גשר' },
    takeaway: { en: 'The verse tells the story and is calmer; the chorus is fuller, louder and repeats a hook; the bridge brings a new color before the last chorus. Follow the sections and you can map any song.', he: 'הבית מספר את הסיפור והוא רגוע יותר; הפזמון מלא, חזק וחוזר על הוק; הגשר מביא צבע חדש לפני הפזמון האחרון. כשעוקבים אחרי החלקים אפשר למפות כל שיר.' },
    steps: [
      {
        say: { en: 'Hi {name}! This is a verse: light drums, a soft pad, and a melody that keeps moving to new notes.', he: 'היי {name}! זה בית: תופים קלים, ריפוד רך ומנגינה שממשיכה לצלילים חדשים.' },
        play: [play([verse])],
      },
      {
        say: { en: 'And the chorus: the drums and bass get busier, everything is louder, and the same short hook comes back again and again.', he: 'והפזמון: התופים והבס עמוסים יותר, הכול חזק יותר, ואותו הוק קצר חוזר שוב ושוב.' },
        play: [play([chorus])],
      },
      {
        say: { en: 'The bridge changes the color: chords from outside the usual set, a new melody, and it ends wanting to go back to the chorus.', he: 'הגשר משנה את הצבע: אקורדים מחוץ לסט הרגיל, מנגינה חדשה, והוא נגמר ברצון לחזור לפזמון.' },
        play: [play([bridge])],
      },
      {
        say: { en: 'Put together, many songs go verse, chorus, verse, chorus, bridge, chorus. Older standards use AABA: a tune twice, a bridge, then the tune again.', he: 'ביחד, הרבה שירים בנויים בית, פזמון, בית, פזמון, גשר, פזמון. סטנדרטים ותיקים משתמשים ב־AABA: מנגינה פעמיים, גשר, ושוב המנגינה.' },
        show: { text: { en: 'V C V C B C   ·   A A B A', he: 'V C V C B C   ·   A A B A' } },
      },
      {
        say: { en: 'A 12-bar blues has its own map: four bars on I, two on IV, two on I, then V, IV, and a turnaround back to the top.', he: 'לבלוז של 12 תיבות יש מפה משלו: ארבע תיבות על I, שתיים על IV, שתיים על I, ואז V, IV וטרנאראונד חזרה להתחלה.' },
        play: [chords([ch(0, '7'), ch(5, '7'), ch(0, '7'), ch(7, '7'), ch(5, '7'), ch(0, '7')], 0.75)],
      },
    ],
    more: [
      {
        say: { en: 'Song form is the order of a song’s sections. Each section is a group of bars, very often 8 or 16, with its own job. Letters label them: the same letter means the same music.', he: 'מבנה שיר הוא סדר החלקים שלו. כל חלק הוא קבוצת תיבות, הרבה פעמים 8 או 16, עם תפקיד משלו. מסמנים אותם באותיות: אותה אות פירושה אותה מוזיקה.' },
      },
      {
        say: { en: 'The verse sets the scene. Its music returns each time with new words, so it tends to stay calmer and lower, leaving room for the story.', he: 'הבית מציג את הסיפור. המוזיקה שלו חוזרת כל פעם עם מילים חדשות, ולכן הוא נוטה להיות רגוע ונמוך יותר, ומשאיר מקום לסיפור.' },
        play: [play([verse])],
        show: { text: { en: 'verse', he: 'בית' } },
      },
      {
        say: { en: 'The chorus is the center. The title and the hook usually live there; words and music both repeat, the melody often sits higher, and the band plays fuller.', he: 'הפזמון הוא המרכז. השם של השיר וההוק נמצאים שם בדרך כלל; גם המילים וגם המוזיקה חוזרות, המנגינה יושבת לרוב גבוה יותר, והלהקה מנגנת מלא יותר.' },
        play: [play([chorus])],
        show: { text: { en: 'chorus', he: 'פזמון' } },
      },
      {
        say: { en: 'Many songs add a pre-chorus, a short build between verse and chorus, plus an intro and an outro to open and close.', he: 'הרבה שירים מוסיפים פרה־פזמון, בנייה קצרה בין הבית לפזמון, וגם פתיחה וסיום.' },
      },
      {
        say: { en: 'The bridge usually comes once, after the second chorus. It brings new chords — often starting away from the tonic — and leads back into a final chorus, often the biggest.', he: 'הגשר מגיע בדרך כלל פעם אחת, אחרי הפזמון השני. הוא מביא אקורדים חדשים — לעיתים קרובות מתחיל רחוק מהטוניקה — ומוביל חזרה לפזמון אחרון, שהוא בדרך כלל הגדול ביותר.' },
        play: [play([bridge])],
        show: { text: { en: 'bridge', he: 'גשר' } },
      },
      {
        say: { en: 'AABA, the 32-bar song form, has four 8-bar sections: a tune, the tune again, a contrasting B — also called the bridge or middle eight — and the tune to finish. Many jazz standards use it.', he: 'AABA, מבנה 32 התיבות, בנוי מארבעה חלקים של 8 תיבות: מנגינה, שוב המנגינה, B מנוגד — שנקרא גם גשר — והמנגינה לסיום. הרבה סטנדרטים של ג׳אז בנויים כך.' },
        show: { text: { en: 'A8 A8 B8 A8 = 32', he: 'A8 A8 B8 A8 = 32' } },
      },
      {
        say: { en: 'The 12-bar blues: four bars of I, two of IV, two of I, then V, IV, I, and often V in the last bar as a turnaround back to the top.', he: 'בלוז של 12 תיבות: ארבע תיבות של I, שתיים של IV, שתיים של I, ואז V, IV, I, ולרוב V בתיבה האחרונה כטרנאראונד חזרה להתחלה.' },
        play: [chords([0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((r) => ch(r, '7')), 0.42)],
        show: { text: { en: 'I I I I | IV IV I I | V IV I V', he: 'I I I I | IV IV I I | V IV I V' } },
      },
      {
        say: { en: 'How to map a song: count bars in groups of four and mark every change — a drum fill, the band thinning or swelling, the melody jumping up. Sections usually change every 8 or 16 bars.', he: 'איך ממפים שיר: סופרים תיבות בקבוצות של ארבע ומסמנים כל שינוי — מילוי של תופים, הלהקה מתדללת או מתעצמת, המנגינה קופצת למעלה. החלקים מתחלפים בדרך כלל כל 8 או 16 תיבות.' },
      },
      {
        say: { en: 'A common mistake is calling the first loud part the chorus. Check what repeats: a chorus brings back the same words, a verse brings new words over the same music.', he: 'טעות נפוצה היא לקרוא לחלק החזק הראשון פזמון. בדקו מה חוזר: פזמון מחזיר את אותן מילים, בית מביא מילים חדשות על אותה מוזיקה.' },
      },
      {
        say: { en: 'Recap: verse tells, chorus repeats the hook, bridge contrasts. Count in fours, listen for changes, and you can map almost any song.', he: 'לסיכום: הבית מספר, הפזמון חוזר על ההוק, הגשר מביא ניגוד. ספרו בארבע, הקשיבו לשינויים, ותוכלו למפות כמעט כל שיר.' },
      },
    ],
  },
  {
    id: 'style-periods',
    area: 'ear',
    emoji: '🏛️',
    title: { en: 'Which period?', he: 'איזו תקופה?' },
    takeaway: { en: 'Baroque runs in busy, equal lines; Classical is a clear tune over a light accompaniment; Romantic is rich, wide and flexible in time; the 20th century stacks fourths and new scales; jazz swings; pop loops four chords over a beat.', he: 'בארוק רץ בקווים עסוקים ושווים; קלאסי הוא מנגינה ברורה מעל ליווי קליל; רומנטי עשיר, רחב וגמיש בזמן; המאה ה־20 בונה קוורטות וסולמות חדשים; ג׳אז מסווינג; ופופ חוזר על ארבעה אקורדים מעל ביט.' },
    steps: [
      {
        say: { en: 'Hi {name}! Baroque: two lines running in steady, even notes, both equally important, like a conversation.', he: 'היי {name}! בארוק: שני קווים שרצים בצלילים קבועים ושווים, שניהם חשובים באותה מידה, כמו שיחה.' },
        play: [clip('baroque')],
      },
      {
        say: { en: 'Classical: one clear, singable tune on top, with a light broken-chord pattern underneath, and a tidy cadence at the end.', he: 'קלאסי: מנגינה אחת ברורה שאפשר לשיר, עם ליווי קליל של אקורדים שבורים מתחת, וקדנצה מסודרת בסוף.' },
        play: [clip('classical')],
      },
      {
        say: { en: 'Romantic: rich chords, wide waves in the left hand, and a tempo that breathes — it pushes ahead and then holds back.', he: 'רומנטי: אקורדים עשירים, גלים רחבים ביד שמאל, וטמפו שנושם — הוא דוחף קדימה ואז מתעכב.' },
        play: [clip('romantic')],
      },
      {
        say: { en: 'Twentieth century: chords built from fourths sliding in parallel, a whole-tone melody, and uneven groups of beats.', he: 'המאה ה־20: אקורדים שבנויים מקוורטות ומחליקים במקביל, מנגינה בסולם טונים שלמים, וקבוצות פעמות לא שוות.' },
        play: [clip('modern')],
      },
      {
        say: { en: 'Jazz: swung eighth notes, a walking bass, a ride cymbal and short chord jabs.', he: 'ג׳אז: שמיניות בסווינג, בס מהלך, מצילת רייד ודקירות קצרות של אקורדים.' },
        play: [clip('jazz')],
      },
      {
        say: { en: 'Pop: four chords looping over a steady backbeat, with a catchy hook. Listen for the rhythm first, then the harmony.', he: 'פופ: ארבעה אקורדים בלופ מעל ביט יציב, עם הוק קליט. הקשיבו קודם למקצב, ואחר כך להרמוניה.' },
        play: [clip('pop')],
      },
    ],
    more: [
      {
        say: { en: 'Style periods are rough labels for how music was written at a time. The usual outline is Baroque (about 1600–1750), Classical (1750–1820), Romantic (1820–1900) and the 20th century. Jazz and pop grew up alongside in the 1900s.', he: 'תקופות סגנון הן תוויות כלליות לאופן שבו כתבו מוזיקה בזמן מסוים. החלוקה המקובלת: בארוק (בערך 1600–1750), קלאסי (1750–1820), רומנטי (1820–1900) והמאה ה־20. ג׳אז ופופ צמחו לצידה במאה ה־20.' },
      },
      {
        say: { en: 'Baroque: polyphony — several equal lines woven together — over a busy bass, a steady motor rhythm, and plenty of ornaments. Bach and Handel, harpsichord and organ.', he: 'בארוק: פוליפוניה — כמה קווים שווים שזורים יחד — מעל בס עסוק, מקצב מוטורי קבוע והרבה קישוטים. באך והנדל, צ׳מבלו ועוגב.' },
        play: [clip('baroque')],
      },
      {
        say: { en: 'Classical: one clear melody with accompaniment, balanced 4- and 8-bar phrases, tidy cadences. Haydn, Mozart, early Beethoven. A hallmark is the Alberti bass: a broken chord played low, high, middle, high.', he: 'קלאסי: מנגינה אחת ברורה עם ליווי, משפטים מאוזנים של 4 ו־8 תיבות, קדנצות מסודרות. היידן, מוצרט, בטהובן המוקדם. סימן היכר הוא בס אלברטי: אקורד שבור בסדר נמוך, גבוה, אמצעי, גבוה.' },
        play: [clip('classical')],
      },
      {
        say: { en: 'Romantic: bigger emotions, richer and more chromatic harmony, wide piano textures, and rubato — a tempo that bends. Chopin, Schumann, Brahms, Tchaikovsky.', he: 'רומנטי: רגשות גדולים יותר, הרמוניה עשירה וכרומטית יותר, מרקמים רחבים בפסנתר, ורובאטו — טמפו שמתגמש. שופן, שומאן, ברהמס, צ׳ייקובסקי.' },
        play: [clip('romantic')],
      },
      {
        say: { en: 'The 20th century went in many directions: Debussy’s whole-tone scales and parallel chords, Stravinsky’s shifting meters, chords built in fourths, and music with no home key at all.', he: 'המאה ה־20 הלכה לכיוונים רבים: סולמות הטונים השלמים והאקורדים המקבילים של דביסי, המשקלים המתחלפים של סטרווינסקי, אקורדים שבנויים בקוורטות, ומוזיקה בלי סולם בית בכלל.' },
        play: [clip('modern')],
      },
      {
        say: { en: 'Jazz: a swing feel with long-short eighths, seventh chords and extensions, improvisation, and a walking bass. Pop: a steady backbeat on 2 and 4, short chord loops, verse–chorus form and a hook.', he: 'ג׳אז: תחושת סווינג עם שמיניות ארוך־קצר, ספטאקורדים וטנשנים, אימפרוביזציה ובס מהלך. פופ: ביט יציב עם הדגשה על 2 ו־4, לופים קצרים של אקורדים, מבנה בית־פזמון והוק.' },
        play: [clip('jazz')],
      },
      {
        say: { en: 'A listening order: first the rhythm (motor, flexible, swung or backbeat), then the texture (equal lines, or a tune with accompaniment), then the harmony (plain or rich).', he: 'סדר הקשבה: קודם המקצב (מוטורי, גמיש, סווינג או ביט), אחר כך המרקם (קווים שווים, או מנגינה עם ליווי), ובסוף ההרמוניה (פשוטה או עשירה).' },
      },
      {
        say: { en: 'The classic mix-up is Baroque versus Classical. Both sound tidy, but in Baroque every line stays busy, while in Classical one tune leads and the rest support it.', he: 'הבלבול הקלאסי הוא בארוק מול קלאסי. שניהם נשמעים מסודרים, אבל בבארוק כל הקווים עסוקים, ובקלאסי מנגינה אחת מובילה והשאר תומכים בה.' },
      },
      {
        say: { en: 'Recap: rhythm, texture, harmony — in that order. Equal busy lines say Baroque, a clear tune says Classical, rich and flexible says Romantic, swing says jazz, a backbeat says pop.', he: 'לסיכום: מקצב, מרקם, הרמוניה — בסדר הזה. קווים עסוקים ושווים אומרים בארוק, מנגינה ברורה — קלאסי, עשיר וגמיש — רומנטי, סווינג — ג׳אז, ביט — פופ.' },
      },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'topic:audiation': 'audiation',
  'topic:triads': 'triad-types',
  'topic:seventh-chords': 'seventh-types',
  'topic:chromatic-harmony': 'chromatic-chords',
  'topic:song-form': 'song-sections',
  'topic:style': 'style-periods',
};
