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
        say: { en: 'That skill is called audiation. Practise it anywhere: hum a song, stop, keep it going silently, then come back in.', he: 'הכישור הזה נקרא אודיאציה. אפשר לתרגל אותו בכל מקום: מזמזמים שיר, עוצרים, ממשיכים בשקט, ואז חוזרים לשיר בקול.' },
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
  },
  {
    id: 'chromatic-chords',
    area: 'harmony',
    emoji: '🎨',
    title: { en: 'Colour chords', he: 'אקורדי צבע' },
    takeaway: { en: 'Colour chords borrow notes from outside the key. The cadential 6/4, the Neapolitan, the augmented sixth and borrowed chords each add a typical colour before the music goes home.', he: 'אקורדי צבע שואלים צלילים מחוץ לסולם. הקוורטסקסט הקדנציאלי, הנפוליטני, הסקסטה המוגדלת והאקורדים השאולים מוסיפים כל אחד צבע אופייני לפני החזרה הביתה.' },
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
        say: { en: 'Listen for the moment the colour changes, then for where it goes next. Almost every colour chord leads to V or straight home.', he: 'הקשיבו לרגע שבו הצבע משתנה, ואז לאן הוא ממשיך. כמעט כל אקורד צבע מוביל ל־V או ישר הביתה.' },
      },
    ],
  },
  {
    id: 'song-sections',
    area: 'ear',
    emoji: '🧩',
    title: { en: 'Verse, chorus, bridge', he: 'בית, פזמון, גשר' },
    takeaway: { en: 'The verse tells the story and is calmer; the chorus is fuller, louder and repeats a hook; the bridge brings a new colour before the last chorus. Follow the sections and you can map any song.', he: 'הבית מספר את הסיפור והוא רגוע יותר; הפזמון מלא, חזק וחוזר על הוק; הגשר מביא צבע חדש לפני הפזמון האחרון. כשעוקבים אחרי החלקים אפשר למפות כל שיר.' },
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
        say: { en: 'The bridge changes the colour: chords from outside the usual set, a new melody, and it ends wanting to go back to the chorus.', he: 'הגשר משנה את הצבע: אקורדים מחוץ לסט הרגיל, מנגינה חדשה, והוא נגמר ברצון לחזור לפזמון.' },
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
  },
  {
    id: 'style-periods',
    area: 'ear',
    emoji: '🏛️',
    title: { en: 'Which period?', he: 'איזו תקופה?' },
    takeaway: { en: 'Baroque runs in busy, equal lines; Classical is a clear tune over a light accompaniment; Romantic is rich, wide and flexible in time; the 20th century stacks fourths and new scales; jazz swings; pop loops four chords over a beat.', he: 'בארוק רץ בקווים עסוקים ושווים; קלאסי הוא מנגינה ברורה מעל ליווי קליל; רומנטי עשיר, רחב וגמיש בזמן; המאה ה־20 בונה רביעיות וסולמות חדשים; ג׳אז מסווינג; ופופ חוזר על ארבעה אקורדים מעל ביט.' },
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
