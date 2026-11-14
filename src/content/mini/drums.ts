// Quick lessons for the drums niche families (DRUMS_NICHE_PLAN P1): songs and song form on the kit, prog / fusion
// (odd meters, polymeter and polyrhythm, metric modulation, linear drumming), counting meters, drum notation. They open
// before the first step of each family on the drums path (unit "tech:<family>"). Plain words, sound first.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
type Hit = [number, 'kick' | 'snare' | 'hat' | 'hat-open' | 'crash' | 'tom-hi' | 'tom-lo' | 'ride', number?];
/** Kit events from [beat, drum, velocity] at `bpm` (beats = quarters, or eighths with `eighths`). */
function kit(bpm: number, beats: number, hits: Hit[]): Stimulus {
  const b = 60 / bpm;
  const MIDI = { kick: 36, snare: 38, hat: 42, 'hat-open': 46, crash: 49, 'tom-hi': 48, 'tom-lo': 43, ride: 51 } as const;
  return ev(
    hits.map(([t, d, v]) => ({ midi: MIDI[d], start: t * b, duration: d === 'crash' ? 0.6 : d === 'hat-open' ? 0.45 : 0.08, velocity: v ?? (d === 'hat' || d === 'ride' ? 0.45 : 0.8), perc: d })),
    beats * b + 0.4,
  );
}
const every = (from: number, to: number, step: number, d: Hit[1], v?: number): Hit[] => Array.from({ length: Math.round((to - from) / step) }, (_, i) => [from + i * step, d, v] as Hit);
/** A rock bar at `b0`: hat 8ths, kick 1 and 3, snare 2 and 4. */
const rockBar = (b0: number, top: Hit[1] = 'hat'): Hit[] => [...every(b0, b0 + 4, 0.5, top), [b0, 'kick'], [b0 + 2, 'kick'], [b0 + 1, 'snare'], [b0 + 3, 'snare']];
/** A one-beat 16th fill on beat 4 of the bar at `b0`, then crash + kick on the next 1. */
const fillLand = (b0: number): Hit[] => [...every(b0, b0 + 3, 0.5, 'hat'), [b0, 'kick'], [b0 + 1, 'snare'], [b0 + 2, 'kick'], [b0 + 3, 'snare'], [b0 + 3.25, 'snare'], [b0 + 3.5, 'tom-hi'], [b0 + 3.75, 'tom-lo'], [b0 + 4, 'crash'], [b0 + 4, 'kick']];
/** An odd-meter bar in eighths: hat every eighth, kick / snare on the group starts (alternating), accent on starts. */
function oddBar(b0: number, groups: number[]): Hit[] {
  const out: Hit[] = [];
  let at = 0;
  groups.forEach((g, k) => {
    out.push([b0 + at, k % 2 ? 'snare' : 'kick']);
    for (let i = 0; i < g; i++) out.push([b0 + at + i, 'hat', i === 0 ? 0.7 : 0.35]);
    at += g;
  });
  return out;
}
/** Two limbs: `a` strokes against `b` strokes per beat, for `beats` beats. */
const ratio = (a: number, b: number, beats: number): Hit[] => [...Array.from({ length: a * beats }, (_, i) => [i / a, 'ride', i % a ? 0.4 : 0.6] as Hit), ...Array.from({ length: b * beats }, (_, i) => [i / b, 'kick', 0.8] as Hit)];

export const LESSONS: MiniLesson[] = [
  {
    id: 'drum-song',
    area: 'play',
    emoji: '',
    title: { en: 'Drumming a song', he: 'לתופף שיר' },
    takeaway: { en: 'A song is sections: keep each one’s groove, fill in the bar before the next, and land crash + kick on its 1.', he: 'שיר הוא קטעים: שומרים על הגרוב של כל אחד, ממלאים בתיבה שלפני הבא, ונוחתים בקראש + קיק על ה-1 שלו.' },
    steps: [
      { say: { en: 'Hi {name}! A song is made of sections — verse, chorus, bridge — and the drummer marks every change. Listen: a verse on the hi-hat, a fill, and the chorus on the ride.', he: 'היי {name}! שיר בנוי מקטעים — בית, פזמון, גשר — והמתופף מסמן כל מעבר. הקשיבו: בית על ההיי־האט, מעבר, והפזמון על הרייד.' }, play: [kit(96, 13, [...rockBar(0), ...fillLand(4), ...rockBar(8, 'ride').filter((h) => !(h[0] === 8 && h[1] !== 'snare'))])] },
      { say: { en: 'Three jobs at every section change: the fill in the bar before, the landing — crash and kick together on the 1 — and the new groove right after.', he: 'שלוש משימות בכל מעבר בין קטעים: המעבר בתיבה שלפני, הנחיתה — קראש וקיק יחד על ה-1 — והגרוב החדש מיד אחריה.' }, play: [kit(96, 6, fillLand(0))], show: { text: { en: 'fill → 1 → groove', he: 'מעבר ← 1 ← גרוב' } } },
      { say: { en: 'A bridge often changes the feel. Half-time keeps the tempo but puts the snare on beat three only, so the music seems to slow down.', he: 'גשר משנה הרבה פעמים את התחושה. חצי זמן שומר על הטמפו אבל שם את הסנר רק על פעמה שלוש, והמוזיקה נשמעת כאילו האטה.' }, play: [kit(96, 8, [...every(0, 8, 0.5, 'hat'), [0, 'kick'], [3, 'kick'], [2, 'snare'], [4, 'kick'], [7, 'kick'], [6, 'snare']])] },
      { say: { en: 'Count the bars. Sections are usually 4, 8, 12 or 16 bars long; the road map above the score shows where you are and cues the next section one bar ahead.', he: 'ספרו את התיבות. קטעים הם בדרך כלל באורך 4, 8, 12 או 16 תיבות; מפת הדרך מעל התווים מראה איפה אתם, ומסמנת את הקטע הבא תיבה מראש.' }, show: { text: { en: 'Verse 8 · Chorus 8 · Bridge 4', he: 'בית 8 · פזמון 8 · גשר 4' } } },
      { say: { en: 'The band plays the chords from the chart, so you hear the form as you play. The app checks each section’s groove, the landings, that no bar was lost, and that the tempo holds into the chorus.', he: 'הלהקה מנגנת את האקורדים מהתרשים, אז שומעים את הצורה בזמן הנגינה. האפליקציה בודקת את הגרוב של כל קטע, את הנחיתות, שאף תיבה לא אבדה, ושהטמפו מחזיק גם בכניסה לפזמון.' } },
    ],
    more: [
      { say: { en: 'The most common slip is rushing into the chorus: the fill gets exciting and the new section comes early. Keep the fill inside the beat — the 1 comes when it comes.', he: 'הטעות הנפוצה ביותר היא להאיץ בכניסה לפזמון: המעבר מתלהב והקטע החדש מגיע מוקדם. השאירו את המעבר בתוך הפעמה — ה-1 מגיע כשהוא מגיע.' } },
      { say: { en: 'Dynamics shape a song as much as grooves do: a softer verse, a louder chorus, a breakdown where almost everything drops out. Play the difference, not just the notes.', he: 'דינמיקה מעצבת שיר לא פחות מגרובים: בית שקט יותר, פזמון חזק יותר, שבירה שבה כמעט הכול נעלם. נגנו את ההבדל, לא רק את התווים.' } },
      { say: { en: 'Band hits are written figures the whole band plays together. Catch them with crash and kick, and set them up with a short snare figure just before.', he: 'מכות להקה הן דמויות כתובות שכל הלהקה מנגנת יחד. תופסים אותן בקראש וקיק, ומכינים אותן בדמות קצרה בסנר רגע לפני.' }, play: [kit(96, 4, [[0, 'crash'], [0, 'kick'], [0.5, 'snare'], [1, 'snare'], [1.5, 'crash'], [1.5, 'kick'], [2, 'snare'], [2.5, 'snare'], [3, 'crash'], [3, 'kick']])] },
      { say: { en: 'The ending is a section too: a short fill and one crash with the kick on the last 1, then let it ring while the band holds the chord.', he: 'גם הסיום הוא קטע: מעבר קצר וקראש אחד עם הקיק על ה-1 האחרון, ואז נותנים לו לצלצל בזמן שהלהקה מחזיקה את האקורד.' }, play: [kit(96, 6, fillLand(0).filter((h) => h[0] <= 4))] },
      { say: { en: 'In real music, session drummers often get only a chord chart with the form and a few hits written in. The rest — the grooves, the fills, the dynamics — is theirs to choose.', he: 'במוזיקה אמיתית, מתופפי אולפן מקבלים הרבה פעמים רק תרשים אקורדים עם הצורה וכמה מכות כתובות. כל השאר — הגרובים, המעברים, הדינמיקה — בחירה שלהם.' } },
      { say: { en: 'Your own songs work the same way: type the chords of each section and the tempo, and the band plays the form for you to drum. Chord progressions are free to use; recordings are not, so the app never needs one.', he: 'גם השירים שלכם עובדים כך: מקלידים את האקורדים של כל קטע ואת הטמפו, והלהקה מנגנת את הצורה כדי שתתופפו. מהלכי אקורדים חופשיים לשימוש; הקלטות לא — ולכן האפליקציה לא צריכה אף אחת.' } },
    ],
  },
  {
    id: 'drum-prog',
    area: 'play',
    emoji: '',
    title: { en: 'Prog and fusion time', he: 'זמן בפרוג ובפיוז׳ן' },
    takeaway: { en: 'Count odd meters in groups of 2 and 3; in polymeter the cycles drift and meet again, in polyrhythm two limbs split the same beat; metric modulation turns one note value into the new beat.', he: 'סופרים משקלים מוזרים בקבוצות של 2 ו-3; בפולימטר המחזורים נודדים ונפגשים שוב, בפולירית׳ם שתי גפיים מחלקות את אותה פעמה; מודולציה מטרית הופכת ערך תו אחד לפעמה החדשה.' },
    steps: [
      { say: { en: 'Hi {name}! Odd meters are counted in groups of two and three eighths. Here is 7/8 as 2 + 2 + 3: the kick and snare sit on each group’s start.', he: 'היי {name}! משקלים מוזרים נספרים בקבוצות של שתיים ושלוש שמיניות. הנה 7/8 כ-2 + 2 + 3: הקיק והסנר יושבים בתחילת כל קבוצה.' }, play: [kit(220, 21, [...oddBar(0, [2, 2, 3]), ...oddBar(7, [2, 2, 3]), ...oddBar(14, [2, 2, 3])])], show: { text: { en: '1 2 · 1 2 · 1 2 3', he: '1 2 · 1 2 · 1 2 3' } } },
      { say: { en: 'Polymeter: a riff of seven eighths loops over cymbals in four. The riff starts in a new place every bar until both meet again.', he: 'פולימטר: ריף של שבע שמיניות חוזר מעל מצלתיים בארבע. הריף מתחיל במקום אחר בכל תיבה עד ששניהם נפגשים שוב.' }, play: [kit(110, 14, [...every(0, 14, 1, 'ride'), ...[0, 3.5, 7, 10.5].flatMap((b): Hit[] => [[b, 'kick'], [b + 1.5, 'kick'], [b + 2.5, 'snare']])])], show: { text: { en: '7 over 4 → meet after 7 bars', he: '7 מעל 4 ← נפגשים אחרי 7 תיבות' } } },
      { say: { en: 'Polyrhythm splits the same beat two ways at once. Three on the ride against two on the kick — both meet on every beat.', he: 'פולירית׳ם מחלק את אותה פעמה בשתי דרכים בבת אחת. שלוש ברייד מול שתיים בקיק — שתיהן נפגשות בכל פעמה.' }, play: [kit(60, 4, ratio(3, 2, 4))], show: { text: { en: '3 : 2', he: '3 : 2' } } },
      { say: { en: 'Metric modulation: a note value of the old tempo becomes the new beat. Here the triplet eighth becomes the new eighth, so the tempo moves up by half, smoothly.', he: 'מודולציה מטרית: ערך תו מהטמפו הישן הופך לפעמה החדשה. כאן שמינית הטריולה הופכת לשמינית החדשה, והטמפו עולה בחצי — בלי קפיצה.' }, show: { text: { en: '♪³ = ♪  (× 3/2)', he: '♪³ = ♪  (× 3/2)' } } },
      { say: { en: 'Five-four is often three plus two quarter notes: a long half and a short half. Feel the bar as two uneven steps.', he: 'חמש־רבעים הוא הרבה פעמים שלוש ועוד שתיים: חצי ארוך וחצי קצר. הרגישו את התיבה כשני צעדים לא שווים.' }, play: [kit(110, 10, [...every(0, 10, 0.5, 'hat'), [0, 'kick'], [2, 'snare'], [3, 'kick'], [4, 'snare'], [5, 'kick'], [7, 'snare'], [8, 'kick'], [9, 'snare']])], show: { text: { en: '5/4 = 3 + 2', he: '5/4 = 3 + 2' } } },
    ],
    more: [
      { say: { en: 'Linear drumming plays one limb at a time — never two together. The groove comes from the order of the limbs: right hand, left hand, kick.', he: 'תיפוף ליניארי מנגן גפה אחת בכל פעם — אף פעם לא שתיים יחד. הגרוב נוצר מסדר הגפיים: יד ימין, יד שמאל, קיק.' }, play: [kit(80, 4, [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75].map((t, i) => [t, (['kick', 'hat', 'snare'] as const)[i % 3]] as Hit))], show: { text: { en: 'R L K · R L K', he: 'R L K · R L K' } } },
      { say: { en: 'Groupings over 4/4: accent every third sixteenth on the hi-hat and the accents slide across the beat — the bar stays in four, the ear hears threes.', he: 'קבוצות מעל 4/4: מדגישים כל שש-עשרית שלישית בהיי־האט, וההדגשות מחליקות על פני הפעמה — התיבה נשארת בארבע, האוזן שומעת שלשות.' }, show: { text: { en: '3 + 3 + 3 + 3 + 4', he: '3 + 3 + 3 + 3 + 4' } } },
      { say: { en: 'A displaced groove keeps its shape but moves it — the backbeat a sixteenth or an eighth late. Count the original grid hard; the displacement only works against it.', he: 'גרוב מוזז שומר על הצורה אבל מזיז אותה — הביט האחורי שש-עשרית או שמינית מאוחר. ספרו חזק את הרשת המקורית; ההזזה עובדת רק מולה.' }, play: [kit(90, 4, [...every(0, 4, 0.5, 'hat'), [0, 'kick'], [2, 'kick'], [1.5, 'snare'], [3.5, 'snare']])] },
      { say: { en: 'In real music, odd meters and modulations are the language of progressive rock and fusion, and of much Balkan and Middle-Eastern music long before them. Groupings and displacement make a simple bar sound new.', he: 'במוזיקה אמיתית, משקלים מוזרים ומודולציות הם השפה של פרוגרסיב רוק ופיוז׳ן, ושל הרבה מוזיקה בלקנית ומזרחית עוד לפניהם. קבוצות והזזות גורמות לתיבה פשוטה להישמע חדשה.' } },
      { say: { en: 'Practise any of these slowly with the click on the group starts only. When the groups feel natural, raise the tempo a few beats at a time; the app moves the target up as your takes come out clean.', he: 'תרגלו כל אחד מאלה לאט, עם קליק רק על תחילת הקבוצות. כשהקבוצות מרגישות טבעיות, העלו את הטמפו בכמה פעמות בכל פעם; האפליקציה מעלה את היעד כשהנגינות יוצאות נקיות.' } },
      { say: { en: 'The common mistake in odd meters is to rush the long group. Feel the three as one longer step, not a hurry to the next bar.', he: 'הטעות הנפוצה במשקלים מוזרים היא למהר בקבוצה הארוכה. הרגישו את השלוש כצעד אחד ארוך יותר, לא כמרוץ לתיבה הבאה.' } },
    ],
  },
  {
    id: 'drum-count',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Counting meters on the kit', he: 'לספור משקלים על המערכת' },
    takeaway: { en: 'Simple meters split the beat in two, compound in three. 6/8 and 3/4 have the same six eighths — the accents tell them apart.', he: 'משקלים פשוטים מחלקים את הפעמה לשתיים, מורכבים לשלוש. ל-6/8 ול-3/4 אותן שש שמיניות — ההדגשות מבדילות ביניהם.' },
    steps: [
      { say: { en: 'Hi {name}! Six eighths can be two beats of three — that is 6/8 — or three beats of two — that is 3/4. Listen to the accents.', he: 'היי {name}! שש שמיניות יכולות להיות שתי פעמות של שלוש — זה 6/8 — או שלוש פעמות של שתיים — זה 3/4. הקשיבו להדגשות.' }, play: [kit(200, 12, [...every(0, 6, 1, 'snare', 0.4).map((h, i) => (i % 3 === 0 ? ([h[0], 'snare', 0.9] as Hit) : h)), ...every(6, 12, 1, 'snare', 0.4).map((h, i) => (i % 2 === 0 ? ([h[0], 'snare', 0.9] as Hit) : h))])], show: { text: { en: '1 2 3 4 5 6 · 1 2 3 4 5 6', he: '1 2 3 4 5 6 · 1 2 3 4 5 6' } } },
      { say: { en: 'Odd meters group eighths in twos and threes. 7/8 can be 2 + 2 + 3 or 3 + 2 + 2: the signature over the bar says which, and your accents show it.', he: 'משקלים מוזרים מקבצים שמיניות בזוגות ובשלשות. 7/8 יכול להיות 2 + 2 + 3 או 3 + 2 + 2: הסימן מעל התיבה אומר איזה, וההדגשות שלכם מראות אותו.' }, play: [kit(220, 14, [...[0, 2, 4].map((b): Hit => [b, 'snare', 0.9]), ...[1, 3, 5, 6].map((b): Hit => [b, 'snare', 0.35]), ...[7, 10, 12].map((b): Hit => [b, 'snare', 0.9]), ...[8, 9, 11, 13].map((b): Hit => [b, 'snare', 0.35])])], show: { text: { en: '2+2+3 · 3+2+2', he: '2+2+3 · 3+2+2' } } },
      { say: { en: 'When the time signature changes, the bar line moves: count the new bar from its own 1. Here two bars of four, then a bar of three — the kick marks each 1.', he: 'כשהמשקל משתנה, קו התיבה זז: סופרים את התיבה החדשה מה-1 שלה. כאן שתי תיבות של ארבע, ואז תיבה של שלוש — הקיק מסמן כל 1.' }, play: [kit(100, 11, [...every(0, 11, 0.5, 'hat'), [0, 'kick'], [4, 'kick'], [8, 'kick'], [1, 'snare'], [3, 'snare'], [5, 'snare'], [7, 'snare'], [9, 'snare'], [10, 'snare']])], show: { text: { en: '4/4 · 4/4 · 3/4', he: '4/4 · 4/4 · 3/4' } } },
      { say: { en: 'In rests, keep counting the bars — enter exactly on the 1 they lead to. Here a figure, two silent bars, and the figure again.', he: 'בהפסקות ממשיכים לספור תיבות — ונכנסים בדיוק על ה-1 שהן מובילות אליו. כאן דמות, שתי תיבות שקטות, ושוב הדמות.' }, play: [kit(120, 13, [[0, 'snare'], [0.5, 'snare'], [1, 'snare'], [2, 'snare'], [12, 'snare', 0.9]])] },
      { say: { en: 'In the exercises you play the counts on the kit or a pad: the accents must fall where the signature says. The app measures which strokes were louder, and when.', he: 'בתרגילים מנגנים את הספירה על המערכת או על פד: ההדגשות צריכות ליפול איפה שהמשקל אומר. האפליקציה מודדת אילו מכות היו חזקות יותר, ומתי.' } },
    ],
    more: [
      { say: { en: 'Say the counts out loud while you play: "1 2 3 4 5 6" with the accented numbers louder. Saying them keeps the grouping in your body, not just on the page.', he: 'אמרו את הספירה בקול בזמן הנגינה: "1 2 3 4 5 6", והמספרים המודגשים חזק יותר. האמירה שומרת את הקיבוץ בגוף, לא רק על הדף.' } },
      { say: { en: 'Twelve eight is four beats of three — the slow blues and many ballads live there. It sounds like 4/4 with triplets everywhere.', he: '12/8 הוא ארבע פעמות של שלוש — הבלוז האיטי והרבה בלדות חיים שם. זה נשמע כמו 4/4 עם טריולות בכל מקום.' } },
      { say: { en: 'Hear it in twelve eight: four big beats, each split in three.', he: 'שמעו את זה ב-12/8: ארבע פעמות גדולות, כל אחת מחולקת לשלוש.' }, play: [kit(180, 12, [...every(0, 12, 1, 'ride', 0.4), [0, 'kick'], [6, 'kick'], [3, 'snare'], [9, 'snare']])] },
      { say: { en: 'A good drill: play the same six eighths for two bars as 6/8, then two bars as 3/4, without stopping. Only the accents move; the eighths stay exactly even.', he: 'תרגיל טוב: נגנו את אותן שש שמיניות שתי תיבות כ-6/8, ואז שתי תיבות כ-3/4, בלי לעצור. רק ההדגשות זזות; השמיניות נשארות שוות לגמרי.' }, play: [kit(200, 12, every(0, 12, 1, 'snare', 0.45).map((h, i) => ((i < 6 ? i % 3 === 0 : i % 2 === 0) ? ([h[0], 'snare', 0.9] as Hit) : h)))] },
      { say: { en: 'In real music, 6/8 drives Irish jigs and much African and Afro-Cuban music; 3/4 is the waltz; 7/8 and 9/8 run through Balkan, Greek and Turkish dances, and through progressive rock.', he: 'במוזיקה אמיתית, 6/8 מניע ג׳יגים איריים והרבה מוזיקה אפריקאית ואפרו־קובנית; 3/4 הוא הוואלס; 7/8 ו-9/8 עוברים בריקודים בלקניים, יווניים ותורכיים, ובפרוגרסיב רוק.' } },
      { say: { en: 'The common mistake is to let the click decide the grouping. The click marks group starts; your hands must still feel which group is long.', he: 'הטעות הנפוצה היא לתת לקליק להחליט על הקיבוץ. הקליק מסמן את תחילת הקבוצות; הידיים עדיין צריכות להרגיש איזו קבוצה ארוכה.' } },
    ],
  },
  {
    id: 'drum-notation',
    area: 'theory',
    emoji: '',
    title: { en: 'Drum notation', he: 'כתב התופים' },
    takeaway: { en: 'The line or space tells the drum, the notehead tells drum (round) or cymbal (x), the marks tell how to hit it.', he: 'הקו או הרווח אומרים איזה תוף, ראש התו אומר תוף (עגול) או מצילה (x), והסימנים אומרים איך להכות.' },
    steps: [
      { say: { en: 'Hi {name}! On the drum staff each line or space is a drum: the kick in the lowest space, the floor tom above it, the snare in the middle, the toms higher, the cymbals on top with x noteheads.', he: 'היי {name}! בחמשת התופים כל קו או רווח הוא תוף: הקיק ברווח התחתון, טום הרצפה מעליו, הסנר באמצע, הטומים גבוה יותר, והמצלתיים למעלה עם ראשי תווים בצורת x.' }, play: [kit(80, 7, [[0, 'kick'], [1, 'tom-lo'], [2, 'snare'], [3, 'tom-hi'], [4, 'hat'], [5, 'ride'], [6, 'crash']])], show: { text: { en: 'x cymbals · ● toms · ● snare · ● kick', he: 'x מצלתיים · ● טומים · ● סנר · ● קיק' } } },
      { say: { en: 'A small circle over the hi-hat means open; an accent mark means louder; a note in brackets is a ghost note, very soft; a tiny note just before is a flam or a drag.', he: 'עיגול קטן מעל ההיי־האט פירושו פתוח; סימן הדגשה פירושו חזק יותר; תו בסוגריים הוא תו רפאים, רך מאוד; תו זעיר רגע לפני הוא פלאם או דראג.' }, play: [kit(70, 4, [[0, 'snare', 0.95], [0.5, 'snare', 0.15], [0.75, 'snare', 0.15], [1, 'snare', 0.6], [1.94, 'snare', 0.25], [2, 'snare', 0.9], [3, 'snare', 0.6]])] },
      { say: { en: 'Slashes through a stem shorten the strokes: one slash plays eighths, two play sixteenths. A slash with two dots repeats the bar before; a thick bar with a number is that many bars of rest.', he: 'קווים דרך הצוואר מקצרים את המכות: קו אחד מנגן שמיניות, שניים שש-עשריות. קו נטוי עם שתי נקודות חוזר על התיבה הקודמת; קו עבה עם מספר הוא כמה תיבות של הפסקה.' }, play: [kit(70, 4, [...every(0, 2, 0.5, 'snare'), ...every(2, 4, 0.25, 'snare')])], show: { text: { en: '♩ / = ♫ · ♩ // = ♬ · % · ▬ 2', he: '♩ / = ♫ · ♩ // = ♬ · % · ▬ 2' } } },
      { say: { en: 'Read ahead: while one bar plays, your eyes are already on the next. Find the bar line, the time signature and any repeat sign before the count-in ends.', he: 'קוראים קדימה: בזמן שתיבה אחת מתנגנת, העיניים כבר על הבאה. מוצאים את קו התיבה, את המשקל ואת סימני החזרה לפני שהספירה נגמרת.' } },
      { say: { en: 'In the exercises you read the staff and play it on the kit: every note on its own drum, every mark as written. The app hears which drum you hit, when, and how hard.', he: 'בתרגילים קוראים את החמשה ומנגנים אותה על המערכת: כל תו על התוף שלו, כל סימן כמו שכתוב. האפליקציה שומעת על איזה תוף הכיתם, מתי, ובאיזו עוצמה.' } },
    ],
    more: [
      { say: { en: 'Stems up are the hands, stems down the feet. Reading one direction at a time — hands first, then feet — makes a busy bar simple.', he: 'צוואר למעלה הוא הידיים, צוואר למטה הרגליים. קריאה של כיוון אחד בכל פעם — קודם ידיים, אחר כך רגליים — הופכת תיבה עמוסה לפשוטה.' } },
      { say: { en: 'Tuplets carry their number in a bracket: 3 for triplets, 5 for quintuplets, 6 for sextuplets — that many notes evenly in the space of the beat.', he: 'טריולות ודומיהן נושאות את המספר שלהן בסוגר: 3 לטריולה, 5 לחמישייה, 6 לשישייה — כך וכך תווים שווים בתוך הפעמה.' }, play: [kit(60, 3, [...every(0, 1, 1 / 3, 'snare'), ...every(1, 2, 0.2, 'snare'), ...every(2, 3, 1 / 6, 'snare')])] },
      { say: { en: 'Open and closed hi-hat: an x alone is closed and short; with a small circle above it the hat is open and rings until the next closed note or the foot.', he: 'היי־האט פתוח וסגור: x לבד הוא סגור וקצר; עם עיגול קטן מעליו ההיי־האט פתוח ומצלצל עד התו הסגור הבא או עד הרגל.' }, play: [kit(90, 4, [...every(0, 4, 0.5, 'hat'), [1.5, 'hat-open', 0.5], [3.5, 'hat-open', 0.5], [0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare']])] },
      { say: { en: 'Rolls are written as tremolo slashes too: three slashes on a long note ask for a closed, buzzed roll, as smooth as you can make it, from the start of the note to its end.', he: 'גם גלגולים נכתבים בקווי טרמולו: שלושה קווים על תו ארוך מבקשים גלגול סגור ומזמזם, חלק ככל האפשר, מתחילת התו ועד סופו.' } },
      { say: { en: 'The common mistake is to read the floor tom as the kick: both are low round heads. The kick is in the lowest space, the floor tom one step higher.', he: 'הטעות הנפוצה היא לקרוא את טום הרצפה כקיק: שניהם ראשים עגולים נמוכים. הקיק ברווח התחתון, טום הרצפה מדרגה אחת מעליו.' } },
      { say: { en: 'To keep: position tells the drum, the notehead tells drum or cymbal, stems tell hands or feet, the marks tell how. Read one voice at a time, then stack them.', he: 'מה לזכור: המיקום אומר איזה תוף, ראש התו אומר תוף או מצילה, הצוואר אומר ידיים או רגליים, והסימנים אומרים איך. קוראים קול אחד בכל פעם, ואז מניחים אותם זה על זה.' } },
    ],
  },
  {
    id: 'drum-form',
    area: 'theory',
    emoji: '',
    title: { en: 'Song form for drummers', he: 'צורת שיר למתופפים' },
    takeaway: { en: 'Know the shape before you play: 12-bar blues, AABA, verse–chorus; follow repeats, endings and D.S. al Coda without losing a bar.', he: 'מכירים את הצורה לפני שמנגנים: בלוז 12 תיבות, AABA, בית–פזמון; עוקבים אחרי חזרות, סיומות ו-D.S. al Coda בלי לאבד תיבה.' },
    steps: [
      { say: { en: 'Hi {name}! Forms have standard shapes. The blues is 12 bars; a jazz standard is often AABA, four sections of 8 bars. Mark each new section with a crash on its 1.', he: 'היי {name}! לצורות יש מבנים קבועים. הבלוז הוא 12 תיבות; סטנדרט ג׳אז הוא הרבה פעמים AABA, ארבעה קטעים של 8 תיבות. מסמנים כל קטע חדש בקראש על ה-1 שלו.' }, play: [kit(220, 33, [...every(0, 32, 1, 'ride'), ...[0, 8, 16, 24, 32].flatMap((b): Hit[] => [[b, 'crash'], [b, 'kick']])])], show: { text: { en: 'A 8 · A 8 · B 8 · A 8', he: 'A 8 · A 8 · B 8 · A 8' } } },
      { say: { en: 'Charts save space with signs. Repeat bars send you back; a first ending is played the first time only, the second ending the second time.', he: 'תרשימים חוסכים מקום בעזרת סימנים. סימני חזרה שולחים אחורה; סיומת ראשונה מנוגנת רק בפעם הראשונה, והשנייה בפעם השנייה.' }, play: [kit(200, 25, [...every(0, 24, 1, 'hat'), ...[0, 8, 16, 24].flatMap((b): Hit[] => [[b, 'crash'], [b, 'kick']]), [6, 'snare'], [7, 'snare'], [22, 'snare'], [23, 'snare']])], show: { text: { en: '‖: A :‖ 1. — 2.', he: '‖: A :‖ 1. — 2.' } } },
      { say: { en: 'D.S. al Coda means: go back to the sign, play until "To Coda", then jump to the coda. In these steps the road map shows only the signs — you follow them yourself.', he: 'D.S. al Coda פירושו: חוזרים לסימן, מנגנים עד "To Coda", ואז קופצים לקודה. בצעדים האלה מפת הדרך מראה רק את הסימנים — אתם עוקבים אחריהם בעצמכם.' }, show: { text: { en: '𝄋 … To Coda ⊕ … D.S. al Coda → ⊕', he: '𝄋 … To Coda ⊕ … D.S. al Coda ← ⊕' } } },
      { say: { en: 'The blues: twelve bars, the chord changing in bars 5, 7, 9, 10 and 11. A small fill in bar 12 sends the band back to the top.', he: 'הבלוז: שתים־עשרה תיבות, והאקורד מתחלף בתיבות 5, 7, 9, 10 ו-11. מעבר קטן בתיבה 12 שולח את הלהקה חזרה להתחלה.' }, play: [kit(240, 49, [...every(0, 48, 1, 'ride'), ...[0, 16, 32, 36].map((b): Hit => [b, 'kick']), [46, 'snare'], [46.5, 'snare'], [47, 'tom-lo'], [48, 'crash'], [48, 'kick']])] },
      { say: { en: 'In the exercises the chart shows the sections and their lengths. You keep time, count the bars, and land a crash with the kick on every section start.', he: 'בתרגילים התרשים מראה את הקטעים ואת האורכים שלהם. אתם שומרים על הזמן, סופרים תיבות, ונוחתים בקראש עם הקיק על כל פתיחת קטע.' } },
    ],
    more: [
      { say: { en: 'Count in groups of four: "one-two-three-four, two-two-three-four…" — the second number tells you the bar. Most sections end on a multiple of four.', he: 'סופרים בקבוצות של ארבע: "אחת־שתיים־שלוש־ארבע, שתיים־שתיים־שלוש־ארבע…" — המספר השני אומר באיזו תיבה אתם. רוב הקטעים נגמרים בכפולה של ארבע.' } },
      { say: { en: 'In a blues, the turnaround is the last two bars, leading back to the top. A small fill there tells the band the next chorus is coming.', he: 'בבלוז, הטרנאראונד הוא שתי התיבות האחרונות, שמובילות חזרה להתחלה. מעבר קטן שם אומר ללהקה שהכורוס הבא מגיע.' }, play: [kit(110, 9, [...every(0, 6, 0.5, 'hat'), [0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare'], [4, 'kick'], [5, 'snare'], [6, 'snare'], [6.5, 'snare'], [7, 'tom-hi'], [7.5, 'tom-lo'], [8, 'crash'], [8, 'kick']])] },
      { say: { en: 'In AABA the bridge, B, is the contrast: new chords, often a new key. Drummers mark it — a setup fill into it, a busier ride, then back to the A feel for the last A.', he: 'ב-AABA הגשר, B, הוא הניגוד: אקורדים חדשים, הרבה פעמים סולם חדש. המתופפים מסמנים אותו — מעבר הכנה לתוכו, רייד עמוס יותר, ואז חזרה לתחושת ה-A ב-A האחרון.' }, play: [kit(200, 9, [...every(0, 7, 1, 'ride'), [6, 'snare'], [6.33, 'snare'], [6.67, 'snare'], [7, 'tom-lo'], [7.67, 'snare'], [8, 'crash'], [8, 'kick']])] },
      { say: { en: 'Songs in a verse and chorus form mark their sections with the band: fuller in the chorus, thinner in the verse. A crash on the 1 tells everyone the new section has begun.', he: 'שירים בצורת בית ופזמון מסמנים את הקטעים עם הלהקה: מלאה יותר בפזמון, דלילה יותר בבית. קראש על ה-1 אומר לכולם שהקטע החדש התחיל.' } },
      { say: { en: 'The common mistake is to lose a bar in a long section and come in a bar early or late. If unsure, listen for the chord change that starts each section.', he: 'הטעות הנפוצה היא לאבד תיבה בקטע ארוך ולהיכנס תיבה מוקדם או מאוחר. כשלא בטוחים, הקשיבו לשינוי האקורד שפותח כל קטע.' } },
    ],
  },
];

/** The drums path opens each niche family with its quick lesson (unit "tech:<family>"). */
export const UNITS: Record<string, string> = { 'tech:d-song': 'drum-song', 'tech:d-prog': 'drum-prog', 'tech:d-count': 'drum-count', 'tech:d-notation': 'drum-notation', 'tech:d-form': 'drum-form' };
