// Solo jazz piano after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md, Parts A and C): the quick lessons before
// the k-lh, k-tex, k-comp and k-impro levels and the three ear topics. Every example is built by
// src/engine/soloPiano.ts (sources cited there), in C. His terms: "three elements, three registers", "the mango
// problem", "bass shells", "Bud Powell voicings", "shell stride", "walking 10ths", "stride-style comping", "shared
// hands", "stop-start rubato ballad", "repeated-quarter-note ballad". See ../miniTypes.ts for the format.
import { gated, gatedOr, isVerified, lessonVerified } from '../../engine/verifiedContent';
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { bpAlternate, bpShell, rootless, sharedVoicing, shellA, shellB, stridePattern, walkingTenths, withTritoneBass, type TChord } from '../../engine/soloPiano';
import { COMP_ROWS, IMPRO_ROWS, LH_ROWS, TEX_ROWS } from '../../engine/drills/soloPianoDrills';

const notes = (midis: number[], each = 0.32): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.3): Stimulus => ({ kind: 'rest', duration: d });
type Ev = { midi: number; start: number; duration: number; velocity: number };
const evs = (e: Ev[], length: number): Stimulus => ({ kind: 'events', events: e, length });
const IIVI: TChord[] = [
  { root: 2, q: 'm7', beat: 0, beats: 4 },
  { root: 7, q: '7', beat: 4, beats: 4 },
  { root: 0, q: 'maj7', beat: 8, beats: 4 },
  { root: 9, q: '7', beat: 12, beats: 4 },
];
/** Beat events at a tempo (straight). */
const beats = (xs: { beat: number; dur: number; ps: number[] }[], bpm = 112): Stimulus => {
  const s = 60 / bpm;
  const e = xs.flatMap((x) => x.ps.map((p) => ({ midi: p, start: x.beat * s, duration: x.dur * s * 0.92, velocity: 0.6 })));
  return evs(e, Math.max(...e.map((x) => x.start + x.duration)) + 0.4);
};
const STRIDE = beats(stridePattern(IIVI, 4, 'stride').map((e) => ({ beat: e.beat, dur: e.dur, ps: e.notes })));
const SHELL_STRIDE = beats(stridePattern(IIVI, 4, 'shell-stride').map((e) => ({ beat: e.beat, dur: e.dur, ps: e.notes })));
const PEACE = beats(stridePattern(IIVI, 4, 'peace').map((e) => ({ beat: e.beat, dur: e.dur, ps: e.notes })));
const TENTHS = beats(walkingTenths(0, [0, 1, 2, 3, 3, 2, 1, 0]).map((ps, i) => ({ beat: i, dur: 1, ps })), 104);
const CMAJ = { root: 0, q: 'maj7' as const };
const SHARED = sharedVoicing(CMAJ, 64, null) ?? [36, 47, 50, 55];

export const LESSONS: MiniLesson[] = [
  {
    id: 'sp-registers',
    area: 'play',
    emoji: '3',
    title: { en: 'Solo piano: three elements, three registers', he: 'פסנתר סולו: שלושה רכיבים, שלושה רגיסטרים' },
    takeaway: {
      en: 'Bass as low as possible; the chord’s 3rd and 7th between C3 and G4; the melody in the two octaves above middle C.',
      he: 'בס נמוך ככל האפשר; הטרצה והספטימה של האקורד בין C3 ל־G4; המנגינה בשתי האוקטבות שמעל דו האמצעי.',
    },
    steps: [
      { say: { en: 'Solo piano has three jobs: bass, chords and melody. Each has its own register.', he: 'לפסנתר סולו שלוש עבודות: בס, אקורדים ומנגינה. לכל אחת רגיסטר משלה.' } },
      { say: { en: 'The bass sits as low as you can: a root, or a root and a 5th.', he: 'הבס יושב נמוך ככל שאפשר: יסוד, או יסוד וקווינטה.' }, play: [chord([36], 0.9), rest(), chord([36, 43], 1)] },
      {
        say: { en: 'The chord’s 3rd and 7th live between C3 and G4. Lower is muddy; higher is pretty but doesn’t say the chord.', he: 'הטרצה והספטימה של האקורד גרות בין C3 ל־G4. נמוך יותר זה עכור; גבוה יותר זה יפה אבל לא אומר את האקורד.' },
        play: [chord([28, 35], 1), rest(), chord([52, 59], 1), rest(), chord([76, 83], 1)],
        show: { text: { en: 'muddy · clear · thin', he: 'עכור · ברור · דק' } },
      },
      { say: { en: 'The melody sings in the two octaves above middle C, like a voice or a horn.', he: 'המנגינה שרה בשתי האוקטבות שמעל דו האמצעי, כמו קול או כלי נשיפה.' }, play: [notes([64, 67, 72, 71, 69, 67], 0.3)] },
      {
        say: { en: 'The left hand has three positions: bass notes, bass shells, rootless voicings. Here is one chord in six places.', he: 'ליד שמאל שלושה מצבים: צלילי בס, שלדי בס, וויסינג בלי יסוד. הנה אקורד אחד בשישה מקומות.' },
        play: [chord([36], 0.7), chord(bpShell(CMAJ, '3'), 0.7), chord(shellA(CMAJ), 0.7), chord(shellB(CMAJ), 0.7), chord(rootless(CMAJ, 'A'), 0.7), chord(rootless(CMAJ, 'B'), 0.9)],
      },
      { say: { en: 'Check yourself by ear: if a chord sounds thick and grey, the 3rd and 7th sit too low; move them up into the middle.', he: 'בדקו את עצמכם בשמיעה: אם אקורד נשמע עבה ואפור, הטרצה והספטימה יושבות נמוך מדי; העלו אותן לאמצע.' }, play: [chord([36, 40, 46], 0.9), rest(), chord([36, 52, 58], 1)] },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'The lowest A, B♭ and B are rarely used: they blur. Octaves in the bass are an effect, not the default.', he: 'הלה, הסי♭ והסי הנמוכים כמעט לא בשימוש: הם מטשטשים. אוקטבות בבס הן אפקט, לא ברירת מחדל.' } },
      { say: { en: 'Thick right-hand chords over a low bass sound empty, because nothing sits between C3 and G4.', he: 'אקורדים עבים ביד ימין מעל בס נמוך נשמעים ריקים, כי שום דבר לא יושב בין C3 ל־G4.' }, play: [chord([36, 72, 76, 79, 83], 1.2)] },
      { say: { en: 'The top two octaves are for effects: bells, a doubled melody, crystal arpeggios.', he: 'שתי האוקטבות העליונות הן לאפקטים: פעמונים, מנגינה מוכפלת, ארפג׳ים בדולח.' }, play: [notes([88, 91, 95, 100], 0.22)] },
      { say: { en: 'A common mistake is a left hand that drifts up toward the melody until the hands crash. Keep the left hand below middle C and let the right hand rise.', he: 'טעות נפוצה היא יד שמאל שמטפסת לכיוון המנגינה עד שהידיים מתנגשות. השאירו את יד שמאל מתחת לדו האמצעי ותנו ליד ימין לעלות.' }, play: [chord([48, 52, 59], 0.8), notes([67, 72, 76], 0.3)] },
      { say: { en: 'Recap: the bass low, the 3rd and 7th between C3 and G4, the melody above middle C, effects at the top.', he: 'סיכום: הבס נמוך, הטרצה והספטימה בין C3 ל־G4, המנגינה מעל דו האמצעי, אפקטים למעלה.' } },
      { say: { en: 'Where it lives: listen to any solo pianist play a ballad — the bass rings low, the chords sit warm in the middle, and the melody sings clearly above them, never buried.', he: 'איפה זה חי: הקשיבו לכל פסנתרן סולו שמנגן בלדה — הבס מצלצל נמוך, האקורדים יושבים חמים באמצע, והמנגינה שרה בבירור מעליהם, אף פעם לא קבורה.' } },
      { say: { en: 'Practise it with one chord: play it as a bass note, a shell, a bass shell and a rootless voicing, and say aloud which register each one lives in.', he: 'מתאמנים עם אקורד אחד: מנגנים אותו כצליל בס, כשלד, כשלד בס וכוויסינג בלי יסוד, ואומרים בקול באיזה רגיסטר כל אחד גר.' } },
    ],
  },
  {
    id: 'sp-mango',
    area: 'play',
    emoji: '5',
    title: { en: 'The mango problem: five ways to share three jobs', he: 'בעיית המנגו: חמש דרכים לחלק שלוש עבודות' },
    takeaway: {
      en: 'Three mangos — bass, chords, melody — and two hands: two in the LH, two in the RH, one shared, drop one, or juggle.',
      he: 'שלושה מנגו — בס, אקורדים, מנגינה — ושתי ידיים: שניים בשמאל, שניים בימין, אחד משותף, מפילים אחד, או ג׳אגלינג.',
    },
    steps: [
      { say: { en: 'Three mangos, two hands. Siskind’s five answers are the whole map of solo piano.', he: 'שלושה מנגו, שתי ידיים. חמש התשובות של סיסקינד הן כל המפה של פסנתר סולו.' } },
      { say: { en: 'One: two in the left hand. Stride, bass shells, shell stride.', he: 'אחת: שניים ביד שמאל. סטרייד, שלדי בס, סטרייד שלדים.' }, play: [SHELL_STRIDE] },
      { say: { en: 'Two: two in the right hand. A bassline below; the right hand shuttles, drapes or plays the chords in the line.', he: 'שתיים: שניים ביד ימין. קו בס למטה; יד ימין מדלגת, עוטפת, או מנגנת את האקורדים בתוך הקו.' }, play: [notes([36, 43, 41, 36], 0.45)] },
      { say: { en: 'Three: one in each hand, the third shared — shared-hands voicings, mostly for ballads.', he: 'שלוש: אחד בכל יד, השלישי משותף — וויסינג בשתי ידיים, בעיקר לבלדות.' }, play: [chord([...SHARED, 64], 1.6)] },
      { say: { en: 'Four: drop a mango — most often the bass: closed position, drop 2. Five: juggle, and switch as you go.', he: 'ארבע: מפילים מנגו — לרוב את הבס: מצב צמוד, דרופ 2. חמש: ג׳אגלינג, ומחליפים תוך כדי.' }, play: [chord([60, 64, 67, 72], 0.9), chord([48, 72], 0.9)] },
      { say: { en: 'Each solution has its own sound, and the textures ladder walks through them one at a time, on the same original tunes.', he: 'לכל פתרון צליל משלו, וסולם המרקמים עובר ביניהם אחד אחרי השני, על אותם שירים מקוריים.' } },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'The great pianists mix freely. Dave McKenna called his version the third hand.', he: 'הפסנתרנים הגדולים מערבבים בחופשיות. דייב מקנה קרא לגרסה שלו היד השלישית.' } },
      { say: { en: 'The textures ladder climbs the same way: melody and bass, shells, call and response, shell stride, notes under the melody, filled octaves — then the right hand over a bass, the blocks, shared hands and the ballads.', he: 'סולם המרקמים מטפס באותה דרך: מנגינה ובס, שלדים, שאלה ותשובה, סטרייד שלדים, צלילים מתחת למנגינה, אוקטבות ממולאות — ואז יד ימין מעל בס, הבלוקים, ידיים משותפות והבלדות.' } },
      { say: { en: 'The last step is an arrangement: an intro, then each phrase in another texture.', he: 'השלב האחרון הוא עיבוד: פתיחה, ואז כל משפט במרקם אחר.' } },
      { say: { en: 'Mango one in sound: the left hand alone carries bass and chord while the melody floats above.', he: 'מנגו אחת בצליל: יד שמאל לבד נושאת בס ואקורד, והמנגינה מרחפת מעל.' }, play: [STRIDE] },
      { say: { en: 'Mango four in sound: no bass at all, the melody harmonised in a block under the right hand.', he: 'מנגו ארבע בצליל: בלי בס בכלל, המנגינה מהורמנת בבלוק מתחת ליד ימין.' }, play: [chord([60, 64, 67, 72], 0.7), chord([62, 65, 69, 74], 0.7), chord([64, 67, 71, 76], 0.9)] },
      { say: { en: 'A common mistake is to stay in one texture for the whole tune. Change every eight bars and the arrangement breathes.', he: 'טעות נפוצה היא להישאר במרקם אחד לאורך כל השיר. מחליפים כל שמונה תיבות, והעיבוד נושם.' } },
      { say: { en: 'Where it lives: in solo recordings the textures change every few bars — stride for a chorus, a bassline under a right-hand shuttle, then a quiet shared-hands ballad. The changes keep the listener with you.', he: 'איפה זה חי: בהקלטות סולו המרקמים מתחלפים כל כמה תיבות — סטרייד לפזמון, קו בס מתחת לשאטל ביד ימין, ואז בלדה שקטה בשתי ידיים. ההחלפות שומרות את המאזין איתכם.' } },
    ],
  },
  {
    id: 'sp-shells',
    area: 'play',
    emoji: '10',
    title: { en: 'Bass shells: Bud Powell, Type A, Type B', he: 'שלדי בס: באד פאוול, A ו־B' },
    takeaway: {
      en: 'Root + one essential tone (3rd, 10th or 7th); Type A 1-3-7, Type B 1-7-10; the 9th under the thumb; the 5th or the tritone for the root.',
      he: 'יסוד + צליל מהותי אחד (טרצה, דצימה או ספטימה); A זה 1-3-7, B זה 1-7-10; הנונה מתחת לאגודל; הקווינטה או הטריטון במקום היסוד.',
    },
    steps: [
      { say: { en: 'Two-note bass shells — Bud Powell voicings: the root and one essential tone.', he: 'שלדי בס בשני צלילים — הוויסינג של באד פאוול: היסוד וצליל מהותי אחד.' }, play: [chord(bpShell(CMAJ, '3'), 0.8), chord(bpShell(CMAJ, '10'), 0.8), chord(bpShell(CMAJ, '7'), 0.9)], show: { text: { en: '1+3 · 1+10 · 1+7', he: '1+3 · 1+10 · 1+7' } } },
      { say: { en: 'Alternate 3rd and 7th through a ii–V–I and the voices barely move.', he: 'מחליפים טרצה וספטימה לאורך ii–V–I והקולות כמעט לא זזים.' }, play: bpAlternate(IIVI.slice(0, 3), '3').map((v) => chord(v, 0.9)) },
      { say: { en: 'Three notes: Type A is 1-3-7, a fairly high bass for any hand. Type B is 1-7-10, for a bigger hand.', he: 'שלושה צלילים: A הוא 1-3-7, בס די גבוה שמתאים לכל יד. B הוא 1-7-10, ליד גדולה יותר.' }, play: [chord(shellA({ root: 0, q: '7' }), 0.9), rest(), chord(shellB({ root: 0, q: '7' }), 0.9)], show: { text: { en: 'C7: C-E-B♭ · C-B♭-E', he: 'C7: C-E-B♭ · C-B♭-E' } } },
      { say: { en: 'Can’t reach a 10th? Add the 9th and take 9 and 10 with the thumb, when both keys share a colour.', he: 'לא מגיעים לדצימה? מוסיפים את הנונה ולוקחים 9 ו־10 באגודל, כששני הקלידים באותו צבע.' }, play: [chord(bpShell(CMAJ, '10', true), 1)] },
      { say: { en: 'The 5th can replace the root; on a dominant the tritone can — a built-in tritone sub.', he: 'הקווינטה יכולה להחליף את היסוד; בדומיננט גם הטריטון — תחליף טריטון מובנה.' }, play: [chord(withTritoneBass({ root: 7, q: '7' }), 1.1)] },
      { say: { en: 'Then shell stride: the bass on 1 and 3, the shell on 2 and 4.', he: 'ואז סטרייד שלדים: הבס על 1 ו־3, השלד על 2 ו־4.' }, play: [SHELL_STRIDE] },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'Not at once: roll the bass an eighth early and land the shell on the beat; at medium and fast tempos leave the bass out.', he: 'לא ביחד: מגלגלים את הבס שמינית מוקדם ומנחיתים את השלד על הפעמה; בטמפו בינוני ומהיר משמיטים את הבס.' } },
      { say: { en: 'Or reverse the roles: shells on the strong beats, the bass between. Bill Evans played the essentials first and the bass after.', he: 'או הופכים תפקידים: שלדים על הפעמות החזקות, הבס ביניהן. ביל אוונס ניגן קודם את הצלילים המהותיים ואחר כך את הבס.' } },
      { say: { en: 'Hear the difference: the two-note shell is light and open; Type A adds weight in the middle; Type B is wide and full.', he: 'שמעו את ההבדל: השלד בשני צלילים קל ופתוח; A מוסיף משקל באמצע; B רחב ומלא.' }, play: [chord(bpShell(CMAJ, '3'), 0.8), chord(shellA(CMAJ), 0.8), chord(shellB(CMAJ), 1)] },
      { say: { en: 'A common mistake is a shell that jumps an octave on every chord. Choose the 3rd or the 7th so the top note moves by step.', he: 'טעות נפוצה היא שלד שקופץ אוקטבה בכל אקורד. בוחרים טרצה או ספטימה כך שהצליל העליון זז בצעד.' }, play: bpAlternate(IIVI.slice(0, 3), '7').map((v) => chord(v, 0.8)) },
      { say: { en: 'Recap: root plus 3rd, 10th or 7th; Type A and Type B; the 9th under the thumb; the 5th or the tritone for the root.', he: 'סיכום: יסוד ועוד טרצה, דצימה או ספטימה; A ו־B; הנונה מתחת לאגודל; הקווינטה או הטריטון במקום היסוד.' } },
      { say: { en: 'Where it lives: Bud Powell comped with two-note shells under fast bebop lines; Kenny Barron and Monk play shell stride. Start slowly, keep the bass on the beat, and the shells will settle under any melody.', he: 'איפה זה חי: באד פאוול ליווה בשלדים של שני צלילים מתחת לקווי ביבופ מהירים; קני בארון ומונק מנגנים סטרייד שלדים. מתחילים לאט, שומרים את הבס על הפעמה, והשלדים יתיישבו מתחת לכל מנגינה.' } },
    ],
  },
  {
    id: 'sp-stride',
    area: 'play',
    emoji: '1·2',
    title: { en: 'Stride: walking 10ths, variations, comping', he: 'סטרייד: דצימות הולכות, וריאציות, ליווי' },
    takeaway: {
      en: 'Walking 10ths; the Peace Piece pattern, reversed, skip beat, 3+3+2, anticipations, 3 against 4; LH breaks; stride-style comping; the shuttle.',
      he: 'דצימות הולכות; תבנית פיס פיס, הפוך, פעמה מדולגת, 3+3+2, הקדמות, 3 נגד 4; הפסקות ביד שמאל; ליווי בסגנון סטרייד; השאטל.',
    },
    steps: [
      { say: { en: 'Stride: bass on 1 and 3, a chord on 2 and 4, the melody on top.', he: 'סטרייד: בס על 1 ו־3, אקורד על 2 ו־4, המנגינה למעלה.' }, play: [STRIDE] },
      { say: { en: 'Walking 10ths: every beat a 10th, moving by step into the next chord.', he: 'דצימות הולכות: כל פעמה דצימה, בצעדים אל האקורד הבא.' }, play: [TENTHS], show: { text: { en: 'C2+E3 → D2+F3 → E2+G3 → F2+A3', he: 'C2+E3 → D2+F3 → E2+G3 → F2+A3' } } },
      { say: { en: 'Vary it: low-high-high-low, the Peace Piece pattern — the bass on 4 walks into the next bar.', he: 'מגוונים: נמוך־גבוה־גבוה־נמוך, תבנית פיס פיס — הבס על 4 הולך אל התיבה הבאה.' }, play: [PEACE] },
      { say: { en: 'Anticipate the bass, group 3 + 3 + 2, play 3 against 4 — and take breaks while the right hand fills.', he: 'מקדימים את הבס, מקבצים 3 + 3 + 2, מנגנים 3 נגד 4 — ולוקחים הפסקות כשיד ימין ממלאת.' } },
      { say: { en: 'Stride-style comping: the left hand still covers bass and chord, but syncopated — Charleston, reverse, Red Garland.', he: 'ליווי בסגנון סטרייד: יד שמאל עדיין מכסה בס ואקורד, אבל בסינקופה — צ׳רלסטון, הפוך, רד גרלנד.' } },
      { say: { en: 'Keep the bass low and the chord in the middle: the jump between them is the skill, so practise it slowly without looking.', he: 'שומרים את הבס נמוך ואת האקורד באמצע: הקפיצה ביניהם היא המיומנות, אז מתאמנים עליה לאט בלי להסתכל.' }, play: [chord([36], 0.5), chord([52, 55, 59], 0.5), chord([31], 0.5), chord([52, 55, 59], 0.5)] },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'His practice tip: play a whole tune in 10ths, on 1 and 3.', he: 'טיפ האימון שלו: לנגן שיר שלם בדצימות, על 1 ו־3.' } },
      { say: { en: 'The shuttle, after Bill Evans: the left hand moves between a bass note and a mid-register voicing under a held right hand. The variation procedures here are our reading of his videos.', he: 'השאטל, בעקבות ביל אוונס: יד שמאל עוברת בין צליל בס לוויסינג באמצע, מתחת ליד ימין מוחזקת. אופן הביצוע של הווריאציות כאן הוא הקריאה שלנו בסרטונים שלו.' } },
      { say: { en: 'Listen to the 10ths walk: the bass and the 10th move together by step, like a second singer under the melody.', he: 'הקשיבו לדצימות הולכות: הבס והדצימה זזים יחד בצעדים, כמו זמר שני מתחת למנגינה.' }, play: [TENTHS] },
      { say: { en: 'A common mistake is to rush the jump back to the bass. Land the bass on time and let the chord be short.', he: 'טעות נפוצה היא למהר בקפיצה חזרה לבס. מנחיתים את הבס בזמן, והאקורד קצר.' }, play: [SHELL_STRIDE] },
      { say: { en: 'Recap: stride, walking 10ths, the variations, breaks, stride-style comping and the shuttle — each a new way for one hand to do two jobs.', he: 'סיכום: סטרייד, דצימות הולכות, הווריאציות, הפסקות, ליווי בסגנון סטרייד והשאטל — כל אחד דרך חדשה ליד אחת לעשות שתי עבודות.' } },
      { say: { en: 'Where it lives: the stride masters used walking 10ths and anticipations to keep the left hand from sounding like a machine. Change one thing every four bars and listen to how the groove opens.', he: 'איפה זה חי: אמני הסטרייד השתמשו בדצימות הולכות ובהקדמות כדי שיד שמאל לא תישמע כמו מכונה. משנים דבר אחד כל ארבע תיבות ומקשיבים איך הגרוב נפתח.' } },
      { say: { en: 'Practise every variation in all twelve keys, free time first.', he: 'מתאמנים על כל וריאציה בכל שנים־עשר הסולמות, קודם בלי קצב.' } },
    ],
  },
  {
    id: 'sp-shared',
    area: 'play',
    emoji: '4',
    title: { en: 'Shared hands and the three ballad styles', he: 'ידיים משותפות ושלושת סגנונות הבלדה' },
    takeaway: {
      en: 'Melody on top, bass at the bottom, the thumbs and index fingers share the chord. Four rules: 3 and 7, no doubling, even spacing, no minor 9ths.',
      he: 'מנגינה למעלה, בס למטה, האגודלים והאצבעות המורות חולקים את האקורד. ארבעה כללים: 3 ו־7, בלי הכפלות, ריווח שווה, בלי נונות קטנות.',
    },
    steps: [
      { say: { en: 'Shared hands: the right hand holds the melody, the left the bass, and both hands share the chord between.', he: 'ידיים משותפות: יד ימין מחזיקה את המנגינה, שמאל את הבס, ושתיהן חולקות את האקורד באמצע.' }, play: [chord([...SHARED, 64], 1.8)] },
      { say: { en: 'Four rules: include the 3rd and 7th; don’t double; space the notes evenly; avoid minor 9ths.', he: 'ארבעה כללים: לכלול טרצה וספטימה; לא להכפיל; לרווח באופן שווה; להימנע מנונות קטנות.' }, show: { text: { en: '3·7 · ×2 · ↔ · ♭9', he: '3·7 · ×2 · ↔ · ♭9' } } },
      { say: { en: 'Stop-start rubato: a chord, a stop, then the melody gesture — no pulse at all.', he: 'רובאטו עצור־וזז: אקורד, עצירה, ואז תנועת המנגינה — בלי פעמה בכלל.' }, play: [chord([...SHARED, 64], 1.4), rest(0.6), notes([64, 67, 65], 0.5)] },
      { say: { en: 'Repeated quarters: hold the voicing and repeat the left-hand thumb as a quiet timekeeper.', he: 'רבעים חוזרים: מחזיקים את הוויסינג וחוזרים על האגודל של יד שמאל כשומר זמן שקט.' }, play: [chord([...SHARED, 64], 0.7), chord([SHARED[2] ?? 50], 0.7), chord([SHARED[2] ?? 50], 0.7), chord([SHARED[2] ?? 50], 0.7)] },
      { say: { en: 'Stride ballad: swung stride at a ballad tempo. Then move an inner voice on long melody notes.', he: 'בלדת סטרייד: סטרייד מסווינג בטמפו של בלדה. ואחר כך מזיזים קול פנימי על צלילי מנגינה ארוכים.' } },
      { say: { en: 'Let the melody sing out over the chord: the top fingers a little louder, the thumbs soft.', he: 'תנו למנגינה לשיר מעל האקורד: האצבעות העליונות קצת חזק יותר, האגודלים בשקט.' } },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'The corner thumb: one thumb takes two neighbouring keys, so four shared notes fit two hands.', he: 'האגודל הפינתי: אגודל אחד לוקח שני קלידים שכנים, וכך ארבעה צלילים משותפים נכנסים בשתי ידיים.' } },
      { say: { en: 'Four-voice training: sing and play the ballad melody in the soprano, then the alto, tenor and bass.', he: 'אימון ארבעה קולות: לשיר ולנגן את מנגינת הבלדה בסופרן, ואז באלט, בטנור ובבס.' } },
      { say: { en: 'Hear the repeated-quarter style: the voicing rings, and one soft inner note keeps the time.', he: 'שמעו את סגנון הרבעים החוזרים: הוויסינג מצלצל, וצליל פנימי שקט אחד שומר על הזמן.' }, play: [chord([...SHARED, 64], 0.7), chord([SHARED[2] ?? 50], 0.7), chord([SHARED[2] ?? 50], 0.7), chord([SHARED[2] ?? 50], 0.7)] },
      { say: { en: 'A common mistake is to double the melody note inside the chord. Leave it out of the middle and the melody stands clear.', he: 'טעות נפוצה היא להכפיל את צליל המנגינה בתוך האקורד. משאירים אותו מחוץ לאמצע, והמנגינה בולטת.' }, play: [chord([36, 47, 52, 55, 64], 1), rest(), chord([...SHARED, 64], 1)] },
      { say: { en: 'Recap: four rules, three ballad styles, then inner voices and four-voice training.', he: 'סיכום: ארבעה כללים, שלושה סגנונות בלדה, ואז קולות פנימיים ואימון ארבעה קולות.' } },
      { say: { en: 'Where it lives: pianists like Mehldau, Hersch and Jarrett use the repeated-quarter style for intimate ballads, and many begin a ballad in stop-start rubato before the time comes in. Practise each chord slowly first: find the voicing, check the four rules, then play it in time.', he: 'איפה זה חי: פסנתרנים כמו מלדאו, הרש וג׳רט משתמשים בסגנון הרבעים החוזרים לבלדות אינטימיות, ורבים פותחים בלדה ברובאטו עצור־וזז לפני שהזמן נכנס. מתאמנים קודם על כל אקורד לאט: מוצאים את הוויסינג, בודקים את ארבעת הכללים, ואז מנגנים בזמן.' } },
      { say: { en: 'The corner thumb and the hand split change with each chord: sometimes the left hand takes two shared notes, sometimes one. Choose the split that keeps both hands relaxed.', he: 'האגודל הפינתי וחלוקת הידיים משתנים בכל אקורד: לפעמים יד שמאל לוקחת שני צלילים משותפים, לפעמים אחד. בוחרים את החלוקה שמשאירה את שתי הידיים רפויות.' } },
    ],
  },
  {
    id: 'sp-comping',
    area: 'jazz',
    emoji: '2+',
    title: { en: 'Comping vocabulary', he: 'אוצר מילים לליווי' },
    // Hidden until verified (verifiedContent.ts): the named rhythms the doc only read from titles.
    takeaway: isVerified('card:sp-comp-rhythms')
      ? {
      en: 'Beat-3 Charleston, lead-ins, Count Basie, push-offs, accent comping, two-bar patterns — then free comping by rule.',
      he: 'צ׳רלסטון מ־3, כניסות מקדימות, קאונט בייסי, פוש־אוף, ליווי על ההדגשות, תבניות של שתי תיבות — ואז ליווי חופשי לפי כללים.',
    }
      : { en: 'Lead-ins and two-bar patterns — then free comping by rule.', he: 'כניסות מקדימות ותבניות של שתי תיבות — ואז ליווי חופשי לפי כללים.' },
    steps: [
      { say: { en: 'Comping is mostly off the beat — short jabs, like a boxer.', he: 'ליווי הוא בעיקר מחוץ לפעמה — מכות קצרות, כמו מתאגרף.' } },
      ...gatedOr('sp-comp-rhythms', { say: { en: 'The Beat-3 Charleston starts the Charleston on 3: room for a melody in the first half of the bar.', he: 'הצ׳רלסטון מ־3 מתחיל את הצ׳רלסטון על 3: מקום למנגינה בחצי הראשון של התיבה.' }, play: [rest(0.9), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.4), rest(0.35), chord(rootless({ root: 7, q: '7' }, 'B'), 0.5)] }, [{ say: { en: 'The Charleston: a chord on 1 and on the and of 2. Short, like a jab, then wait for the next bar.', he: 'הצ׳רלסטון: אקורד על 1 ועל ה"וְ" של 2. קצר, כמו מכה, ואז מחכים לתיבה הבאה.' }, play: [chord([48, 52, 55, 58], 0.2), rest(0.55), chord([48, 52, 55, 58], 0.2)] }]),
      { say: { en: 'A lead-in: a chord on the and of 3, or on 4, leads into the next downbeat.', he: 'כניסה מקדימה: אקורד על ה״וְ״ של 3, או על 4, מוביל אל הפעמה הבאה.' }, play: [rest(0.9), chord(rootless({ root: 7, q: '7' }, 'B'), 0.4), chord(rootless({ root: 0, q: 'maj7' }, 'A'), 0.8)] },
      ...gatedOr('sp-comp-rhythms', { say: { en: 'A push-off repeats a chord on a beat and the offbeat after it — a lift to the Count Basie rhythm.', he: 'פוש־אוף חוזר על אקורד בפעמה ובחלק החלש שאחריה — הרמה לקצב של קאונט בייסי.' }, play: [rest(0.5), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.25), rest(0.75), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.25), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.25)] }, [{ say: { en: 'A two-bar pattern: the Charleston in the first bar, a lead-in on 4 in the second, so the comp breathes across two bars.', he: 'תבנית של שתי תיבות: צ׳רלסטון בתיבה הראשונה, כניסה מקדימה על 4 בשנייה, כך שהליווי נושם על פני שתי תיבות.' }, play: [chord([48, 52, 55, 58], 0.2), rest(0.55), chord([48, 52, 55, 58], 0.2), rest(1.6), chord([53, 57, 60, 63], 0.3)] }]),
      { say: { en: 'Free comping by rule: one to four hits a bar, at least three rhythms, never three bars the same, anticipations that sound the next chord.', he: 'ליווי חופשי לפי כללים: אחת עד ארבע מכות בתיבה, לפחות שלושה מקצבים, אף פעם לא שלוש תיבות זהות, הקדמות שמשמיעות את האקורד הבא.' } },
      { say: { en: 'Keep every chord short and light, and let the click on 2 and 4 hold the time for you.', he: 'כל אקורד קצר וקליל, והקליק על 2 ו־4 מחזיק בשבילכם את הזמן.' } },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      ...gatedOr('sp-comp-rhythms', { say: { en: 'Accent comping is a coordination device: the left hand lands exactly with the right hand’s accents.', he: 'ליווי על ההדגשות הוא תרגיל קואורדינציה: יד שמאל נוחתת בדיוק עם ההדגשות של יד ימין.' } }, [{ say: { en: 'Two-bar patterns: a rhythm that takes two bars to come round, so the comp does not repeat every bar and the soloist hears a phrase, not a loop. Start with a lead-in in the second bar, then move it.', he: 'תבניות של שתי תיבות: מקצב שלוקח שתי תיבות להשלים סיבוב, כך שהליווי לא חוזר על עצמו בכל תיבה והסולן שומע משפט ולא לופ. מתחילים בכניסה מקדימה בתיבה השנייה, ואז מזיזים אותה.' }, play: [chord([48, 52, 55, 58], 0.2), rest(0.55), chord([48, 52, 55, 58], 0.2), rest(1.6), chord([53, 57, 60, 63], 0.3)] }]),
      ...gated('sp-comp-rhythms', { say: { en: 'The Basie rhythm and the push-off placements here are our reading of his videos; the names are his.', he: 'מיקומי קצב בייסי והפוש־אוף כאן הם הקריאה שלנו בסרטונים שלו; השמות שלו.' } }),
      ...gated('sp-comp-rhythms', { say: { en: 'Hear the Charleston and the Beat-3 Charleston side by side: the same two hits, half a bar apart.', he: 'שמעו את הצ׳רלסטון ואת הצ׳רלסטון מ־3 זה לצד זה: אותן שתי מכות, בהפרש של חצי תיבה.' }, play: [chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.4), rest(0.35), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.4), rest(1), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.4), rest(0.35), chord(rootless({ root: 2, q: 'm7' }, 'A'), 0.4)] }),
      { say: { en: 'A common mistake is comping on every downbeat. Leave space: a comp that answers the melody is worth more than a busy one.', he: 'טעות נפוצה היא ללוות על כל פעמה ראשונה. משאירים מקום: ליווי שעונה למנגינה שווה יותר מליווי עמוס.' }, play: [chord(rootless({ root: 7, q: '7' }, 'B'), 0.3), rest(0.9), chord(rootless({ root: 0, q: 'maj7' }, 'A'), 0.6)] },
      { say: { en: 'Recap: name the rhythm, keep it light, vary it by rule, and anticipate into the next chord.', he: 'סיכום: נותנים שם למקצב, שומרים אותו קליל, מגוונים לפי כללים, ומקדימים אל האקורד הבא.' } },
      { say: { en: 'Where it lives: the great compers mix these rhythms freely, answering the soloist instead of repeating one pattern. Learn each by name first, then let them blend: a Charleston here, a lead-in there, space in between.', he: 'איפה זה חי: המלווים הגדולים מערבבים את המקצבים האלה בחופשיות, ועונים לסולן במקום לחזור על תבנית אחת. לומדים קודם כל אחד בשמו, ואז נותנים להם להתמזג: צ׳רלסטון כאן, כניסה מקדימה שם, ומקום ביניהם.' } },
      { say: { en: 'Free comping by rule is graded on what you choose: one to four hits a bar, at least three different bar rhythms, never three identical bars in a row, and every anticipation sounding the next chord.', he: 'ליווי חופשי לפי כללים נבדק לפי מה שבוחרים: אחת עד ארבע מכות בתיבה, לפחות שלושה מקצבי תיבה שונים, אף פעם לא שלוש תיבות זהות ברצף, וכל הקדמה משמיעה את האקורד הבא.' } },
    ],
  },
  {
    id: 'sp-phrasing',
    area: 'jazz',
    emoji: '1/1',
    title: { en: 'Improvising in phrases', he: 'לאלתר במשפטים' },
    takeaway: {
      en: 'Real phrases with rests between, varied starts and lengths, tied to the form: organized and varied, never monotonous or random.',
      he: 'משפטים אמיתיים עם מנוחות ביניהם, התחלות ואורכים מגוונים, קשורים לצורה: מאורגן ומגוון, אף פעם לא מונוטוני או אקראי.',
    },
    steps: [
      { say: { en: 'Siskind’s rubric hears phrasing on a scale: monotonous, organized, varied, random. The two ends don’t work.', he: 'הסולם של סיסקינד שומע משפטים על ציר: מונוטוני, מאורגן, מגוון, אקראי. שני הקצוות לא עובדים.' }, show: { text: { en: 'monotonous · organized · varied · random', he: 'מונוטוני · מאורגן · מגוון · אקראי' } } },
      { say: { en: 'Start over a drone: an open 5th in the left hand, short melodies on the major scale, with rests.', he: 'מתחילים מעל דרון: קווינטה פתוחה ביד שמאל, מנגינות קצרות על הסולם המז׳ורי, עם מנוחות.' }, play: [chord([36, 43], 0.6), notes([60, 62, 64, 65, 64], 0.28), rest(0.6), notes([67, 65, 64, 62], 0.28)] },
      { say: { en: 'Play one, rest one: a bar of melody, a bar of silence. Then play two, rest two.', he: 'תיבה מנגנים, תיבה נחים: תיבה של מנגינה, תיבה של שקט. ואז שתיים ושתיים.' }, play: [notes([64, 67, 69, 67], 0.25), rest(1), notes([65, 69, 72, 71], 0.25)] },
      { say: { en: 'Then trade with yourself: the right hand asks, the left hand answers.', he: 'ואז מחליפים עם עצמכם: יד ימין שואלת, יד שמאל עונה.' }, play: [notes([72, 71, 69, 67], 0.25), rest(0.2), chord([50, 53, 57], 0.4), chord([50, 53, 57], 0.4)] },
      { say: { en: 'The result now shows your phrasing: organized or varied is the goal; monotonous or random gets a tip.', he: 'התוצאה מראה עכשיו את המשפטים שלכם: מאורגן או מגוון זו המטרה; מונוטוני או אקראי מקבל טיפ.' } },
      { say: { en: 'Every take is measured in all twelve keys: free time first, then in time on the tempo ladder. Your turn — slowly, and listen to each register.', he: 'כל ניסיון נמדד בכל שנים־עשר הסולמות: קודם בלי קצב, ואז בזמן על סולם הטמפו. תורכם — לאט, ולהקשיב לכל רגיסטר.' } },
    ],
    more: [
      { say: { en: 'Note choice has its own scale: bland, colourful, arbitrary. Arpeggios with chromatic neighbours move a bland line toward colour.', he: 'לבחירת הצלילים ציר משלה: תפל, צבעוני, שרירותי. ארפג׳ים עם שכנים כרומטיים מזיזים קו תפל לכיוון צבע.' } },
      { say: { en: 'Every improvised take now shows its phrasing and note choice under the result.', he: 'כל ניסיון מאולתר מראה עכשיו את המשפטים ואת בחירת הצלילים מתחת לתוצאה.' } },
      { say: { en: 'Hear an organized line: two short phrases, a breath between them, the second answering the first.', he: 'שמעו קו מאורגן: שני משפטים קצרים, נשימה ביניהם, והשני עונה לראשון.' }, play: [notes([64, 65, 67, 69, 67], 0.25), rest(0.7), notes([69, 67, 65, 64, 62], 0.25)] },
      { say: { en: 'A common mistake is the endless line with no rests: it sounds monotonous however good the notes are. Breathe, as a singer would.', he: 'טעות נפוצה היא קו אינסופי בלי מנוחות: הוא נשמע מונוטוני גם כשהצלילים טובים. נושמים, כמו זמר.' }, play: [notes([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65], 0.18)] },
      { say: { en: 'Recap: real phrases, rests between them, varied starts and lengths, tied to the form; and notes that are colourful, not bland or arbitrary.', he: 'סיכום: משפטים אמיתיים, מנוחות ביניהם, התחלות ואורכים מגוונים, קשורים לצורה; וצלילים צבעוניים, לא תפלים ולא שרירותיים.' } },
      { say: { en: 'Where it lives: the clearest improvisers phrase like singers — a line, a breath, a reply. Siskind built his evaluation rubric for teachers around exactly this, and the app now checks it on every improvised take.', he: 'איפה זה חי: המאלתרים הברורים ביותר מנסחים כמו זמרים — קו, נשימה, תשובה. סיסקינד בנה סביב זה בדיוק את סולם ההערכה שלו למורים, והאפליקציה בודקת את זה עכשיו בכל ניסיון מאולתר.' } },
      { say: { en: 'Over the drone, set a phrase timer in your head: two bars of melody, two bars of listening. Then let the lengths vary — one bar, three bars — while the rests stay real.', he: 'מעל הדרון, הפעילו בראש שעון משפטים: שתי תיבות של מנגינה, שתי תיבות של הקשבה. ואז תנו לאורכים להשתנות — תיבה אחת, שלוש תיבות — כשהמנוחות נשארות אמיתיות.' } },
    ],
  },
];

/** The lesson each level opens with (App.tsx gate: "tech:<level id>"), by its kind. */
const LH_LESSON = (kind: string): string => (['lh-bass', 'lh-six'].includes(kind) ? 'sp-registers' : /^lh-(bp|sh|roll|sstride|strong)/.test(kind) || !lessonVerified('sp-stride') ? 'sp-shells' : 'sp-stride');
const TEX_LESSON = (kind: string): string => (/^tx-(shared|stop|repq|sballad|inner|4v)/.test(kind) ? 'sp-shared' : 'sp-mango');
export const UNITS: Record<string, string> = {
  'tech:k-lh': 'sp-registers',
  'tech:k-tex': 'sp-mango',
  'tech:k-comp': 'sp-comping',
  'tech:k-impro': 'sp-phrasing',
  ...Object.fromEntries(LH_ROWS.map((r, i) => [`tech:k-lh-${i + 1}`, LH_LESSON(r.kind)])),
  ...Object.fromEntries(TEX_ROWS.map((r, i) => [`tech:k-tex-${i + 1}`, TEX_LESSON(r.kind)])),
  ...Object.fromEntries(COMP_ROWS.map((_, i) => [`tech:k-comp-${i + 1}`, 'sp-comping'])),
  ...Object.fromEntries(IMPRO_ROWS.map((_, i) => [`tech:k-impro-${i + 1}`, 'sp-phrasing'])),
  'topic:lh-tex-ear': 'sp-shells',
  'topic:solo-tex-ear': 'sp-mango',
  'topic:comp-rhythm-ear': 'sp-comping',
};
