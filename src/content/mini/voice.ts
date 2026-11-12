// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Voice (vocal technique, scales, harmony, sight-singing, ornaments) and play (guitar tab, Echo Chain, True or false?).

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** Notes one after another: [midi (−1 = rest; fractional = out of tune), seconds, velocity?]. */
function seq(notes: [number, number, number?][], tail = 0.2): Stimulus {
  let t = 0;
  const events: NoteEvent[] = [];
  for (const [midi, d, v] of notes) {
    if (midi >= 0) events.push({ midi, start: t, duration: d * 0.97, velocity: v ?? 0.68 });
    t += d;
  }
  return { kind: 'events', events, length: t + tail };
}

/** Soft clicks at `perSec` per second (shows a vibrato speed); `jitter` (s) makes them uneven. */
function pulses(perSec: number, secs: number, jitter: number[] = []): Stimulus {
  const n = Math.round(perSec * secs);
  const events: NoteEvent[] = Array.from({ length: n }, (_, k) => ({ midi: 91, start: k / perSec + (jitter.length ? jitter[k % jitter.length] : 0), duration: 0.04, velocity: 0.5, perc: 'click' as const }));
  return { kind: 'events', events, length: secs + 0.3 };
}

/** The tonic, then a four-click count-in (as in sight-singing and the guitar drill). */
function countIn(tonic: number, bpm: number): Stimulus {
  const beat = 60 / bpm;
  const events: NoteEvent[] = [
    { midi: tonic, start: 0, duration: 1.2, velocity: 0.75 },
    ...[0, 1, 2, 3].map((k) => ({ midi: k === 0 ? 96 : 91, start: 1.4 + k * beat, duration: 0.05, velocity: 0.5, perc: (k === 0 ? 'accent' : 'click') as NoteEvent['perc'] })),
  ];
  return { kind: 'events', events, length: 1.4 + 4 * beat };
}

/** One pitch repeated with changing loudness (a piano's way of showing a dynamic shape). */
const shape = (midi: number, vels: number[], each = 0.4): Stimulus => seq(vels.map((v) => [midi, each, v] as [number, number, number]));

const note = (midi: number, duration: number): Stimulus => ({ kind: 'note', midi, duration });
const notes = (midis: number[], each: number): Stimulus => ({ kind: 'notes', midis, each });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ vocal technique 1–2
  {
    id: 'vocal-hold',
    area: 'voice',
    emoji: '🎯',
    title: { en: 'Match it, hold it', he: 'להתאים ולהחזיק' },
    takeaway: { en: 'Land on the note right away, stay in tune, and keep it still to the very end — on easy, flowing breath.', he: 'נוחתים על הצליל מיד, נשארים מדויקים ושומרים עליו יציב עד הסוף — על נשימה רגועה וזורמת.' },
    steps: [
      {
        say: { en: 'Hi {name}! This unit is all about one note. You hear it, you match it, and you hold it — like parking exactly between the lines.', he: 'היי {name}! היחידה הזאת כולה על צליל אחד. שומעים אותו, מתאימים אליו ומחזיקים — כמו לחנות בדיוק בין הקווים.' },
        play: [note(60, 2.2)],
        show: { notes: [60], text: { en: 'match → hold', he: 'להתאים ← להחזיק' } },
      },
      {
        say: { en: 'Breathe in low and easy, then let the sound ride on the air. No pushing: a relaxed, steady flow keeps the pitch steady too.', he: 'נשמו נמוך ובנחת, ותנו לצליל לרכוב על האוויר. בלי לדחוף: זרימה רגועה ואחידה שומרת גם על גובה יציב.' },
        play: [note(60, 3)],
        show: { notes: [60], text: { en: 'low breath, easy flow', he: 'נשימה נמוכה, זרימה קלה' } },
      },
      {
        say: { en: 'First I check how fast you land. Hear the difference: a slide up into the note, then a clean start right on it.', he: 'קודם אני בודק כמה מהר אתם נוחתים. הקשיבו להבדל: החלקה מלמטה אל הצליל, ואז התחלה נקייה ישר עליו.' },
        play: [seq([[58.9, 0.09], [59.4, 0.09], [59.8, 0.09], [60, 1.3], [-1, 0.5], [60, 1.5]])],
        show: { notes: [60], text: { en: 'slide ✗ · clean ✓', he: 'החלקה ✗ · נקי ✓' } },
      },
      {
        say: { en: 'Then intonation: how close you are, in cents. A hundred cents make one half step. Here is the note, then the same note a bit flat.', he: 'אחר כך אינטונציה: כמה קרוב אתם, בסנטים. מאה סנט הם חצי טון. הנה הצליל, ואז אותו צליל קצת נמוך מדי.' },
        play: [seq([[60, 1.4], [-1, 0.3], [59.7, 1.4]])],
        show: { notes: [60], text: { en: '100¢ = ½ step', he: '100¢ = חצי טון' } },
      },
      {
        say: { en: 'And drift: as the air runs low, notes like to sag. Keep the last second as true as the first.', he: 'ויש סחיפה: כשהאוויר אוזל, הצליל נוטה לשקוע. שמרו על השנייה האחרונה מדויקת כמו הראשונה.' },
        play: [seq([[60, 0.7], [59.9, 0.7], [59.8, 0.7], [59.65, 0.9]])],
        show: { notes: [60], text: { en: 'no sagging', he: 'בלי לשקוע' } },
      },
      {
        say: { en: 'Level two asks for straight tone: no vibrato at all, a pure, still line, like a choir or an organ pipe. I measure that stillness.', he: 'ברמה השנייה מבקשים צליל ישר: בלי ויברטו בכלל, קו נקי ושקט, כמו מקהלה או צינור של עוגב. את השקט הזה אני מודד.' },
        play: [note(60, 3)],
        show: { notes: [60], text: { en: 'straight tone', he: 'צליל ישר' } },
      },
      {
        say: { en: 'Short notes count too: start each one right on the pitch, with no scoop from below.', he: 'גם צלילים קצרים נחשבים: התחילו כל אחד בדיוק על הגובה, בלי גלישה מלמטה.' },
        play: [notes([60, 60, 60, 60], 0.75)],
        show: { notes: [60], text: { en: '♩ ♩ ♩ ♩', he: '♩ ♩ ♩ ♩' } },
      },
      {
        say: { en: 'Your turn: listen, then sing on "ah" and hold until the bar fills. With headphones the note keeps sounding; without them it stops when you start.', he: 'תורכם: הקשיבו, ואז שירו על "אה" והחזיקו עד שהפס מתמלא. עם אוזניות הצליל ממשיך להישמע; בלעדיהן הוא נעצר כשמתחילים לשיר.' },
        play: [note(60, 1.6)],
        show: { notes: [60], text: { en: '"ah" — hold', he: '"אה" — להחזיק' } },
      },
    ],
    more: [
      {
        say: { en: 'Pitch matching is two skills working together: the ear hears the target, and the voice finds it. Holding adds a third: keeping pitch, tone and loudness steady for the whole note. All three improve with short, regular practice.', he: 'התאמת גובה היא שתי מיומנויות שעובדות יחד: האוזן שומעת את היעד, והקול מוצא אותו. החזקה מוסיפה שלישית: לשמור על גובה, גוון ועוצמה יציבים לכל אורך הצליל. שלושתן משתפרות בתרגול קצר וקבוע.' },
        play: [note(60, 2.5)],
        show: { notes: [60], text: { en: 'hear → find → hold', he: 'לשמוע ← למצוא ← להחזיק' } },
      },
      {
        say: { en: 'Support starts with the inhale. Let the belly, lower ribs and back expand while the shoulders and chest stay quiet. As you sing, keep the ribs gently open so the air leaves slowly and evenly. Singers call this support; it is balance, not force.', he: 'התמיכה מתחילה בשאיפה. תנו לבטן, לצלעות התחתונות ולגב להתרחב, בזמן שהכתפיים והחזה נשארים שקטים. בזמן השירה השאירו את הצלעות פתוחות בעדינות, כך שהאוויר יוצא לאט ובאחידות. זמרים קוראים לזה תמיכה; זה איזון, לא כוח.' },
        play: [note(60, 4)],
        show: { notes: [60], text: { en: 'ribs open · air even', he: 'צלעות פתוחות · אוויר אחיד' } },
      },
      {
        say: { en: 'The onset is how a note begins. A breathy onset lets air leak before the sound; a hard onset presses the vocal folds shut and pops them open. Aim for a balanced onset: air and sound start together. Think of a silent "h", or start from a hum.', he: 'הפתיחה (onset) היא איך שהצליל מתחיל. בפתיחה נשופה האוויר בורח לפני הצליל; בפתיחה קשה מיתרי הקול נלחצים זה לזה ונפתחים בבת אחת. כוונו לפתיחה מאוזנת: האוויר והצליל מתחילים יחד. חשבו על "ה" שקטה, או התחילו מזמזום.' },
        play: [seq([[60, 1.2], [-1, 0.4], [60, 1.2]])],
        show: { notes: [60], text: { en: 'breathy ✗ · hard ✗ · balanced ✓', he: 'נשופה ✗ · קשה ✗ · מאוזנת ✓' } },
      },
      {
        say: { en: 'To check yourself, record a few notes and listen back, or cup a hand behind one ear. Not sure if you are flat or sharp? Start slightly below and slide up slowly until the sound locks in. Here is a note a little flat, then in tune.', he: 'כדי לבדוק את עצמכם, הקליטו כמה צלילים והאזינו, או שימו כף יד מאחורי אוזן אחת. לא בטוחים אם אתם נמוכים או גבוהים? התחילו מעט מתחת והחליקו לאט למעלה עד שהצליל ננעל. הנה צליל קצת נמוך, ואז מדויק.' },
        play: [seq([[59.75, 1.4], [-1, 0.3], [60, 1.4]])],
        show: { notes: [60], text: { en: 'flat → locked in', he: 'נמוך ← ננעל' } },
      },
      {
        say: { en: 'The two classic faults are the scoop, sliding up into every note, and the sag at the end, when the air runs low. Think of the note from above before you start, and finish while you still have air. A shorter clean note beats a longer sinking one.', he: 'שתי הטעויות הקלאסיות הן הגלישה מלמטה אל כל צליל, והשקיעה בסוף, כשהאוויר אוזל. חשבו על הצליל מלמעלה לפני שמתחילים, וסיימו כשעוד נשאר לכם אוויר. צליל קצר ונקי עדיף על צליל ארוך ששוקע.' },
        play: [seq([[59.4, 0.12], [59.8, 0.12], [60, 1], [59.8, 0.5], [59.6, 0.6]])],
        show: { notes: [60], text: { en: 'scoop ✗ · sag ✗', he: 'גלישה ✗ · שקיעה ✗' } },
      },
      {
        say: { en: 'Straight tone, with no vibrato, is a style choice: early music, many choirs, a lot of pop. It should come from steady air, not a locked throat. If your neck tightens to keep the note still, let a little vibrato back in.', he: 'צליל ישר, בלי ויברטו, הוא בחירה סגנונית: מוזיקה עתיקה, מקהלות רבות, הרבה פופ. הוא צריך לבוא מאוויר יציב, לא מגרון נעול. אם הצוואר מתכווץ כדי להחזיק את הצליל שקט, תנו לקצת ויברטו לחזור.' },
        show: { notes: [60], text: { en: 'straight = steady air', he: 'ישר = אוויר יציב' } },
      },
      {
        say: { en: 'Look after the instrument. Warm up for a few minutes with hums or lip trills, sip water through the day, and practice in your comfortable middle range. Stop if you feel pain or get hoarse, and rest. Hoarseness that lasts more than two weeks is a reason to see a doctor.', he: 'שמרו על הכלי. התחממו כמה דקות עם זמזום או טריל שפתיים, שתו מים לאורך היום, ותרגלו באמצע הנוח של המנעד. עצרו אם יש כאב או צרידות, ונוחו. צרידות שנמשכת יותר משבועיים היא סיבה לפנות לרופא.' },
        show: { text: { en: 'warm up · water · stop on pain', he: 'חימום · מים · עוצרים בכאב' } },
      },
      {
        say: { en: 'To keep: low, easy breath, a balanced onset, land right on the note, and make the last second as true as the first.', he: 'לזכור: נשימה נמוכה וקלה, פתיחה מאוזנת, נחיתה ישר על הצליל, והשנייה האחרונה מדויקת כמו הראשונה.' },
        play: [note(60, 2)],
        show: { notes: [60], text: { en: 'breath · onset · land · hold', he: 'נשימה · פתיחה · נחיתה · החזקה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ vibrato 3, 10, 11
  {
    id: 'vocal-vibrato',
    area: 'voice',
    emoji: '🌊',
    title: { en: 'Vibrato', he: 'ויברטו' },
    takeaway: { en: 'Vibrato is a regular wave around the note, about 5–7 times a second, that a free voice lets happen — then you learn to switch, speed and size it.', he: 'ויברטו הוא גל קבוע סביב הצליל, בערך 5–7 פעמים בשנייה, שקול חופשי מאפשר לו לקרות — ואז לומדים להדליק, לכבות, לשנות מהירות ורוחב.' },
    steps: [
      {
        say: { en: 'Hey {name}! Vibrato is a gentle, regular wave in the pitch. You don\'t shake it in: it appears when the voice is free and the breath keeps flowing.', he: 'היי {name}! ויברטו הוא גל עדין וקבוע בגובה הצליל. לא מנענעים אותו בכוח: הוא מופיע כשהקול חופשי והנשימה ממשיכה לזרום.' },
        play: [note(60, 2)],
        show: { notes: [60], text: { en: '~~~~~', he: '~~~~~' } },
      },
      {
        say: { en: 'The piano can\'t sing a vibrato, so listen to its speed in clicks: about five to seven waves every second.', he: 'פסנתר לא יכול לשיר ויברטו, אז הקשיבו למהירות שלו בנקישות: בערך חמישה עד שבעה גלים בכל שנייה.' },
        play: [pulses(5.8, 2.4)],
        show: { text: { en: '≈ 5–7 per second', he: '≈ 5–7 בשנייה' } },
      },
      {
        say: { en: 'Width is how far each wave swings, in cents. Pop voices keep it narrow, classical voices swing wider, but the center always stays on the note.', he: 'הרוחב הוא כמה רחוק כל גל מתנדנד, בסנטים. בפופ הוא צר, בשירה קלאסית רחב יותר, אבל המרכז תמיד נשאר על הצליל.' },
        play: [note(60, 2)],
        show: { notes: [60], text: { en: 'center = the note', he: 'המרכז = הצליל' } },
      },
      {
        say: { en: 'A good vibrato is regular: every wave the same speed and size. Hear steady pulses, then uneven ones. I score that evenness.', he: 'ויברטו טוב הוא קבוע: כל גל באותה מהירות ובאותו גודל. הקשיבו לפעימות אחידות, ואז ללא אחידות. את האחידות הזאת אני מודד.' },
        play: [pulses(5.5, 1.8), rest(0.4), pulses(5.5, 1.8, [0, 0.06, -0.04, 0.08, 0, -0.06, 0.05])],
        show: { text: { en: 'even ✓ · uneven ✗', he: 'אחיד ✓ · לא אחיד ✗' } },
      },
      {
        say: { en: 'Level three starts straight, lets the vibrato bloom on a cue, then turns it off again. Hold still, then simply relax and let it come.', he: 'רמה שלוש מתחילה בצליל ישר, נותנת לוויברטו לפרוח ברגע הסימן, ואז מכבה אותו שוב. החזיקו ישר, ואז פשוט שחררו ותנו לו לבוא.' },
        play: [note(60, 3)],
        show: { notes: [60], text: { en: 'straight → ~~~ → straight', he: 'ישר ← ~~~ ← ישר' } },
      },
      {
        say: { en: 'Later you choose the speed: about five waves a second, or a quicker six. Here is five, then six.', he: 'בהמשך אתם בוחרים מהירות: בערך חמישה גלים בשנייה, או שישה מהירים יותר. הנה חמש, ואז שש.' },
        play: [pulses(5, 2), rest(0.5), pulses(6.3, 2)],
        show: { text: { en: '5 / s · 6 / s', he: '5 בשנייה · 6 בשנייה' } },
      },
      {
        say: { en: 'In phrases, vibrato goes only where you want it, usually on long notes. Sing the short ones straight and let the last one shimmer.', he: 'במשפטים, הוויברטו מגיע רק לאן שתרצו, בדרך כלל לצלילים הארוכים. שירו את הקצרים ישר ותנו לאחרון לנצנץ.' },
        play: [{ kind: 'melody', midis: [55, 57, 59, 60, 62], beats: [1, 1, 1, 1, 4], bpm: 100 }],
        show: { notes: [55, 57, 59, 60, 62], durs: [1, 1, 1, 1, 4], key: 'G' },
      },
      {
        say: { en: 'Your turn: listen to the note, then sing on "ah" and follow the cues on screen. Keep it easy — never force a wobble.', he: 'תורכם: הקשיבו לצליל, שירו על "אה" ועקבו אחרי הסימנים במסך. בקלות — אף פעם לא לכפות רעידה.' },
        play: [note(60, 1.6)],
        show: { notes: [60] },
      },
    ],
    more: [
      {
        say: { en: 'Vibrato is a regular wave in pitch, with a small wave in loudness riding along. It has two measures: rate, usually about five to seven waves a second, and extent, how far it swings. We hear the center of the wave as the note.', he: 'ויברטו הוא גל קבוע בגובה הצליל, ואיתו גל קטן גם בעוצמה. יש לו שני מדדים: מהירות, בדרך כלל בערך חמישה עד שבעה גלים בשנייה, ורוחב — כמה רחוק הוא מתנדנד. את מרכז הגל אנחנו שומעים כצליל.' },
        play: [pulses(6, 2)],
        show: { text: { en: 'rate · extent · center', he: 'מהירות · רוחב · מרכז' } },
      },
      {
        say: { en: 'Extent changes with style. Pop and musical-theater singers often keep it narrow; classical singers may swing up to about a half step each way. Either way, the center must sit on the pitch.', he: 'הרוחב משתנה לפי סגנון. בפופ ובמחזמר שומרים עליו לרוב צר; זמרים קלאסיים יכולים להתנדנד עד בערך חצי טון לכל כיוון. בכל מקרה, המרכז צריך לשבת על הצליל.' },
        play: [note(60, 2)],
        show: { notes: [60], text: { en: 'narrow (pop) · wide (classical)', he: 'צר (פופ) · רחב (קלאסי)' } },
      },
      {
        say: { en: 'A healthy vibrato is not made by the jaw, the tongue or the belly. It appears on its own when the breath flows steadily and the throat is free: a natural pulse of a balanced voice. That is why you allow it rather than build it.', he: 'ויברטו בריא לא נוצר מהלסת, מהלשון או מהבטן. הוא מופיע מעצמו כשהנשימה זורמת ביציבות והגרון חופשי — פעימה טבעית של קול מאוזן. לכן מאפשרים לו, ולא בונים אותו.' },
        show: { text: { en: 'allow it, don\'t build it', he: 'לאפשר, לא לבנות' } },
      },
      {
        say: { en: 'Two things go wrong. A wobble is too slow and too wide, often from fatigue or heavy pressure. A bleat, or tremolo, is too fast and tight, usually from throat tension. Hear about four pulses a second, then eight; good vibrato lives between them.', he: 'שני דברים משתבשים. רעידה איטית (wobble) היא איטית ורחבה מדי, לרוב מעייפות או מלחץ כבד. רעידה מהירה (bleat, טרמולו) מהירה וצפופה מדי, ובדרך כלל באה ממתח בגרון. הקשיבו לבערך ארבע פעימות בשנייה, ואז לשמונה; ויברטו טוב חי ביניהן.' },
        play: [pulses(4, 2), rest(0.4), pulses(8, 2)],
        show: { text: { en: 'wobble 4/s · bleat 8/s', he: 'איטי 4 בשנייה · מהיר 8 בשנייה' } },
      },
      {
        say: { en: 'To find it, hold a comfortable middle note in straight tone, then release: soften the jaw, keep the air moving, think of the sound floating. Another classic drill: alternate slowly between two notes a half step apart, then speed up until it becomes a wave.', he: 'כדי למצוא אותו, החזיקו צליל נוח באמצע בצליל ישר, ואז שחררו: הרפו את הלסת, המשיכו את זרימת האוויר, וחשבו על צליל שמרחף. תרגיל קלאסי נוסף: החליפו לאט בין שני צלילים במרחק חצי טון, והאיצו עד שזה הופך לגל.' },
        play: [seq([[60, 0.3], [61, 0.3], [60, 0.3], [61, 0.3], [60, 0.2], [61, 0.2], [60, 0.2], [61, 0.2], [60, 0.15], [61, 0.15], [60, 0.15], [61, 0.15], [60, 0.15], [61, 0.15], [60, 0.8]])],
        show: { notes: [60, 61], text: { en: 'slow → faster → wave', he: 'לאט ← מהר יותר ← גל' } },
      },
      {
        say: { en: 'The common mistake is forcing it: a shaking jaw or a pumping belly makes a fake, uneven wave. Watch your jaw in a mirror; it should stay still. The other mistake is vibrato on every short note, which blurs the melody.', he: 'הטעות הנפוצה היא לכפות אותו: לסת שרועדת או בטן שפועמת יוצרות גל מזויף ולא אחיד. הסתכלו על הלסת במראה; היא צריכה להישאר שקטה. הטעות השנייה היא ויברטו על כל צליל קצר, וזה מטשטש את המנגינה.' },
        show: { text: { en: 'jaw still in the mirror', he: 'לסת שקטה במראה' } },
      },
      {
        say: { en: 'In opera and art song, vibrato is nearly continuous. Early music and many choirs use it sparingly, to blend. Pop, jazz and musical theater often use a delayed vibrato: the long note starts straight and blooms at the end.', he: 'באופרה ובשיר אמנותי הוויברטו כמעט רציף. במוזיקה עתיקה ובמקהלות רבות משתמשים בו במשורה, כדי להתמזג. בפופ, בג׳אז ובמחזמר נפוץ ויברטו מושהה: הצליל הארוך מתחיל ישר ופורח בסופו.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 65, 67], beats: [1, 1, 1, 1, 4], bpm: 100 }],
        show: { notes: [60, 62, 64, 65, 67], durs: [1, 1, 1, 1, 4], key: 'C', text: { en: 'straight … then ~~~', he: 'ישר … ואז ~~~' } },
      },
      {
        say: { en: 'To keep: vibrato is a regular wave of five to seven per second, centered on the note. Let it come from free breath, and choose where it goes.', he: 'לזכור: ויברטו הוא גל קבוע של חמש עד שבע פעמים בשנייה, שמרכזו על הצליל. תנו לו לבוא מנשימה חופשית, ובחרו לאן הוא הולך.' },
        show: { notes: [60], text: { en: '5–7 / s · centered · chosen', he: '5–7 בשנייה · במרכז · בבחירה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ range 4, messa di voce 5
  {
    id: 'vocal-range',
    area: 'voice',
    emoji: '🏔️',
    title: { en: 'Across your range', he: 'לאורך המנעד' },
    takeaway: { en: 'Hold notes low to high with the same easy breath; in messa di voce, swell soft – loud – soft while the pitch stays put.', he: 'מחזיקים צלילים מלמטה למעלה באותה נשימה קלה; במסה די ווצ׳ה מתגברים חלש – חזק – חלש בזמן שהגובה נשאר במקום.' },
    steps: [
      {
        say: { en: 'Hi {name}! Your range is every note you sing comfortably, from the easy bottom to the easy top. The app measured yours when you glided on "ah".', he: 'היי {name}! המנעד שלכם הוא כל הצלילים שאתם שרים בנוחות, מהתחתית הקלה ועד הפסגה הקלה. האפליקציה מדדה אותו כשגלשתם על "אה".' },
        play: [notes([48, 52, 55, 60, 64, 67, 72], 0.45)],
        show: { notes: [48, 55, 60, 67, 72], text: { en: 'low → high', he: 'נמוך ← גבוה' } },
      },
      {
        say: { en: 'Now you hold five notes spread across it: low, low-middle, middle, high-middle and high. Three seconds each, steady and in tune.', he: 'עכשיו מחזיקים חמישה צלילים לאורכו: נמוך, נמוך־אמצעי, אמצעי, גבוה־אמצעי וגבוה. שלוש שניות כל אחד, יציב ומדויק.' },
        play: [notes([53, 57, 60, 64, 67], 0.9)],
        show: { notes: [53, 57, 60, 64, 67] },
      },
      {
        say: { en: 'Low notes like a relaxed, speech-like sound. Don\'t press down into them; they may be a little quieter, and that\'s fine.', he: 'צלילים נמוכים אוהבים צליל רגוע, כמו דיבור. אל תלחצו אליהם למטה; מותר להם להיות קצת שקטים יותר, וזה בסדר.' },
        play: [note(53, 2)],
        show: { notes: [53], text: { en: 'low: relaxed', he: 'נמוך: רגוע' } },
      },
      {
        say: { en: 'High notes need steady air, not more squeeze. Keep the jaw and neck loose and let the sound get lighter as you climb.', he: 'צלילים גבוהים צריכים אוויר יציב, לא עוד לחץ. השאירו את הלסת והצוואר משוחררים ותנו לצליל להיעשות קל יותר ככל שעולים.' },
        play: [note(67, 2)],
        show: { notes: [67], text: { en: 'high: light, loose', he: 'גבוה: קל ומשוחרר' } },
      },
      {
        say: { en: 'Level five is messa di voce: one note that grows from soft to loud and back to soft, on a single breath.', he: 'רמה חמש היא מסה די ווצ׳ה: צליל אחד שמתגבר מחלש לחזק וחוזר לחלש, בנשימה אחת.' },
        play: [shape(60, [0.18, 0.3, 0.45, 0.62, 0.8, 0.62, 0.45, 0.3, 0.18], 0.55)],
        show: { notes: [60], text: { en: 'p < f > p', he: 'p < f > p' } },
      },
      {
        say: { en: 'The trick: the pitch must not move. Many voices go sharp as they get louder and flat as they fade — hear it go wrong.', he: 'הטריק: הגובה לא זז. קולות רבים עולים כשהם מתחזקים ויורדים כשהם דועכים — הקשיבו איך זה נשמע כשזה משתבש.' },
        play: [seq([[60, 0.6, 0.2], [60.15, 0.6, 0.5], [60.3, 0.8, 0.8], [59.85, 0.6, 0.45], [59.7, 0.8, 0.2]])],
        show: { notes: [60], text: { en: 'louder ≠ higher', he: 'חזק יותר ≠ גבוה יותר' } },
      },
      {
        say: { en: 'I measure how much the loudness changes and how still the pitch stays. Your turn: hear the note, sing on "ah" — and stop if anything strains.', he: 'אני מודד כמה העוצמה משתנה וכמה הגובה נשאר יציב. תורכם: הקשיבו לצליל, שירו על "אה" — ועצרו אם משהו מתאמץ.' },
        play: [note(60, 1.6)],
        show: { notes: [60], text: { en: 'soft – loud – soft', he: 'חלש – חזק – חלש' } },
      },
    ],
    more: [
      {
        say: { en: 'Your full range is every note you can make; your comfortable range, or tessitura, is where the voice sits easily for a whole song. Voice types such as soprano, alto, tenor and bass depend on that comfort zone and on color, not only on the extreme notes.', he: 'המנעד המלא הוא כל צליל שאתם מסוגלים להפיק; המנעד הנוח, או הטסיטורה, הוא המקום שבו הקול יושב בקלות לאורך שיר שלם. סוגי קול כמו סופרן, אלט, טנור ובס נקבעים לפי האזור הנוח ולפי הגוון, לא רק לפי הצלילים הקיצוניים.' },
        play: [notes([48, 52, 55, 60, 64, 67, 72], 0.4)],
        show: { notes: [48, 60, 72], text: { en: 'range ⊃ tessitura', he: 'מנעד ⊃ טסיטורה' } },
      },
      {
        say: { en: 'The voice has registers. Chest voice uses thicker vibrating folds and feels speech-like; head voice and falsetto use thinner folds and feel lighter. Between them is the passaggio, the shift. For many voices a first shift lies roughly between the E and G above middle C.', he: 'לקול יש רגיסטרים. קול חזה משתמש במיתרי קול עבים יותר ומרגיש כמו דיבור; קול ראש ופלסטו משתמשים במיתרים דקים יותר ומרגישים קלים. ביניהם נמצא הפסאג׳ו, המעבר. אצל קולות רבים מעבר ראשון נמצא בערך בין מי לסול שמעל דו האמצעי.' },
        play: [notes([60, 62, 64, 65, 67], 0.6)],
        show: { notes: [64, 67], text: { en: 'passaggio ≈ E4–G4', he: 'פסאג׳ו ≈ E4–G4' } },
      },
      {
        say: { en: 'To smooth the shift, don\'t carry the heavy low sound upward. Let it thin out gradually as you climb, and narrow the vowel slightly. Sirens on a lip trill, on "ng" or through a straw are classic, gentle tools for this.', he: 'כדי להחליק את המעבר, אל תסחבו את הצליל הכבד מלמטה כלפי מעלה. תנו לו להיעשות קל ודק יותר בהדרגה ככל שעולים, וצמצמו מעט את התנועה. סירנות על טריל שפתיים, על "נג" או דרך קשית הן כלים קלאסיים ועדינים לזה.' },
        play: [notes([55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72], 0.25)],
        show: { notes: [55, 60, 64, 67, 72], text: { en: 'thinner as you climb', he: 'דק יותר ככל שעולים' } },
      },
      {
        say: { en: 'Messa di voce, Italian for "placing the voice", is a classic bel canto exercise: one note swells and fades on one breath. It trains the breath and the vocal folds to change loudness without changing pitch.', he: 'מסה די ווצ׳ה, באיטלקית "הצבת הקול", היא תרגיל קלאסי של בל קנטו: צליל אחד מתגבר ודועך בנשימה אחת. הוא מאמן את הנשימה ואת מיתרי הקול לשנות עוצמה בלי לשנות גובה.' },
        play: [shape(60, [0.18, 0.3, 0.45, 0.62, 0.8, 0.62, 0.45, 0.3, 0.18], 0.55)],
        show: { notes: [60], text: { en: 'p < f > p', he: 'p < f > p' } },
      },
      {
        say: { en: 'Why does pitch drift? More breath pressure tends to raise pitch, and as you fade, the voice tends to sag. So as you grow, think slightly down; as you fade, keep the energy up. Start with a small swell, soft to medium and back, over four to six seconds.', he: 'למה הגובה זז? יותר לחץ אוויר נוטה להעלות את הגובה, וכשדועכים הקול נוטה לשקוע. אז כשמתגברים, חשבו מעט למטה; כשדועכים, שמרו על האנרגיה. התחילו בהתגברות קטנה, מחלש לבינוני וחזרה, לאורך ארבע עד שש שניות.' },
        play: [shape(60, [0.2, 0.35, 0.5, 0.35, 0.2], 0.9)],
        show: { notes: [60], text: { en: 'p < mf > p', he: 'p < mf > p' } },
      },
      {
        say: { en: 'The common mistake is reaching: lifting the chin, raising the larynx and pushing volume for high notes, or pressing the chin down for low ones. Keep the head level and the neck long, and let high notes be lighter and low notes quieter.', he: 'הטעות הנפוצה היא "להושיט יד": להרים את הסנטר, להעלות את בית הקול ולדחוף עוצמה בצלילים גבוהים, או ללחוץ את הסנטר למטה בנמוכים. שמרו את הראש ישר והצוואר ארוך, ותנו לגבוהים להיות קלים ולנמוכים שקטים יותר.' },
        show: { text: { en: 'head level · neck long', he: 'ראש ישר · צוואר ארוך' } },
      },
      {
        say: { en: 'Range grows slowly, over months. Warm up before you visit the edges, spend only short moments there, and come back to the middle. If a note hurts, scratches or leaves you hoarse, stop: tomorrow\'s voice matters more than today\'s top note.', he: 'המנעד גדל לאט, לאורך חודשים. התחממו לפני שאתם מבקרים בקצוות, שהו שם רק רגעים קצרים, וחזרו לאמצע. אם צליל כואב, מגרד או משאיר צרידות, עצרו: הקול של מחר חשוב יותר מהצליל הגבוה של היום.' },
        show: { text: { en: 'warm up · short visits · stop on pain', he: 'חימום · ביקורים קצרים · עוצרים בכאב' } },
      },
      {
        say: { en: 'To keep: one easy breath across the whole range, lighter as you rise, and a swell that changes loudness, never pitch.', he: 'לזכור: נשימה קלה אחת לאורך כל המנעד, קל יותר ככל שעולים, והתגברות שמשנה עוצמה — אף פעם לא גובה.' },
        show: { notes: [60], text: { en: 'louder ≠ higher', he: 'חזק יותר ≠ גבוה יותר' } },
      },
    ],
  },

  // ------------------------------------------------------------------ glides, melodies, leaps, speed 6–9
  {
    id: 'vocal-melody',
    area: 'voice',
    emoji: '🎢',
    title: { en: 'Moving between notes', he: 'לנוע בין צלילים' },
    takeaway: { en: 'Glides are smooth and land exactly; melodies are right, in tune and connected; leaps land without overshooting; fast passages stay with the beat.', he: 'גלישות חלקות ונוחתות בדיוק; מנגינות נכונות, מדויקות ומחוברות; קפיצות נוחתות בלי לעבור את היעד; קטעים מהירים נשארים עם הפעמה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Now your voice starts to move. First, glides: one smooth slide between two notes, like a siren, with no steps on the way.', he: 'היי {name}! עכשיו הקול מתחיל לזוז. קודם גלישות: החלקה רציפה אחת בין שני צלילים, כמו סירנה, בלי מדרגות בדרך.' },
        play: [notes([55, 60], 1.1)],
        show: { notes: [55, 60], text: { en: 'slide ↗ smooth', he: 'גלישה ↗ חלקה' } },
      },
      {
        say: { en: 'The piano can only give you the two ends. I check that your slide is even, always moving one way, and lands right on the target.', he: 'הפסנתר נותן רק את שני הקצוות. אני בודק שהגלישה אחידה, נעה תמיד לכיוון אחד ונוחתת בדיוק על היעד.' },
        play: [notes([62, 55], 1.1)],
        show: { notes: [62, 55], text: { en: 'even · one way · land', he: 'אחיד · כיוון אחד · נחיתה' } },
      },
      {
        say: { en: 'Then melodies: you hear a short tune and sing it back. Every note counts: the right pitch, in tune, and connected.', he: 'אחר כך מנגינות: שומעים מנגינה קצרה ושרים אותה בחזרה. כל צליל נחשב: הגובה הנכון, מדויק ומחובר.' },
        play: [notes([55, 57, 59, 60, 59], 0.6)],
        show: { notes: [55, 57, 59, 60, 59], key: 'G' },
      },
      {
        say: { en: 'Connected means legato: one line of sound, the air never stops. Move quickly from note to note instead of sliding slowly between them.', he: 'מחובר זה לגאטו: קו צליל אחד, האוויר לא נעצר. עברו מהר מצליל לצליל, במקום להחליק לאט ביניהם.' },
        play: [notes([55, 57, 59, 57, 55], 0.55)],
        show: { notes: [55, 57, 59, 57, 55], key: 'G', text: { en: 'legato', he: 'לגאטו' } },
      },
      {
        say: { en: 'Wider intervals come next: thirds, fifths, even an octave. Picture the target before you jump, and don\'t overshoot it.', he: 'אחר כך מרווחים רחבים: טרצות, קווינטות, אפילו אוקטבה. דמיינו את היעד לפני הקפיצה, ואל תעברו אותו.' },
        play: [notes([55, 62, 59, 55], 0.7)],
        show: { notes: [55, 62, 59, 55], key: 'G', text: { en: '1 – 5 – 3 – 1', he: '1 – 5 – 3 – 1' } },
      },
      {
        say: { en: 'Finally, faster transitions: the same moves with more notes per beat. Now rhythm counts too, so stay with the pulse.', he: 'ולבסוף מעברים מהירים: אותן תנועות עם יותר צלילים בכל פעמה. עכשיו גם הקצב נחשב, אז הישארו עם הפעמה.' },
        play: [{ kind: 'melody', midis: [55, 57, 59, 60, 62, 60, 59, 57, 55], beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], bpm: 80 }],
        show: { notes: [55, 57, 59, 60, 62, 60, 59, 57, 55], key: 'G', durs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1] },
      },
      {
        say: { en: 'Your turn: listen, then sing it back on "ah" or "la". Extra listens are allowed; they cost a little melodic-memory rating, never your pitch rating.', he: 'תורכם: הקשיבו ושירו בחזרה על "אה" או "לה". מותר להאזין שוב; זה עולה מעט בדירוג הזיכרון המלודי, אף פעם לא בדירוג הגובה.' },
        play: [notes([55, 59, 57, 55], 0.6)],
        show: { notes: [55, 59, 57, 55], key: 'G' },
      },
    ],
    more: [
      {
        say: { en: 'A glide, or portamento, is a continuous slide in pitch. As an exercise, the siren warms up the whole voice and smooths the register shifts. As expression, a slide is a spice: lovely now and then, tiring on every note.', he: 'גלישה, או פורטמנטו, היא החלקה רציפה בגובה. כתרגיל, הסירנה מחממת את כל הקול ומחליקה את המעברים בין הרגיסטרים. כביטוי, החלקה היא תבלין: יפה פה ושם, מעייפת על כל צליל.' },
        play: [notes([55, 67], 1)],
        show: { notes: [55, 67], text: { en: 'portamento = spice', he: 'פורטמנטו = תבלין' } },
      },
      {
        say: { en: 'Legato means the air keeps flowing and the vowel stays the same while the pitch changes quickly and cleanly. Compare connected notes with detached ones, staccato, where each note stops short.', he: 'לגאטו פירושו שהאוויר ממשיך לזרום והתנועה נשארת אותה תנועה, בזמן שהגובה משתנה מהר ונקי. השוו צלילים מחוברים לצלילים מנותקים, סטקטו, שבהם כל צליל נעצר קצר.' },
        play: [notes([60, 62, 64, 65, 67], 0.45), rest(0.4), seq([[60, 0.2], [-1, 0.25], [62, 0.2], [-1, 0.25], [64, 0.2], [-1, 0.25], [65, 0.2], [-1, 0.25], [67, 0.2]])],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'legato · staccato', he: 'לגאטו · סטקטו' } },
      },
      {
        say: { en: 'Before a leap, hear the target inside before you sing it. Anchor on the home chord: 1, 3, 5 and the octave. Going up, prepare lightness instead of reaching with the neck; going down, keep the brightness so the low note doesn\'t land flat.', he: 'לפני קפיצה, שמעו את היעד בפנים לפני ששרים אותו. היעזרו באקורד הבית: 1, 3, 5 והאוקטבה. בעלייה הכינו קלילות במקום למתוח את הצוואר; בירידה שמרו על הבהירות כדי שהצליל הנמוך לא ינחת נמוך מדי.' },
        play: [notes([55, 59, 62, 67, 55], 0.6)],
        show: { notes: [55, 59, 62, 67, 55], key: 'G', text: { en: '1 3 5 8 1', he: '1 3 5 8 1' } },
      },
      {
        say: { en: 'Know the usual traps. Big leaps up tend to fall short; descending scales tend to sink; repeated notes tend to sag. On the way down, think up a little. Hear a falling line that sinks, then the same line in tune.', he: 'הכירו את המלכודות הרגילות. קפיצות גדולות למעלה נוטות לא להגיע; סולמות יורדים נוטים לשקוע; צלילים חוזרים נוטים לצנוח. בירידה, חשבו מעט למעלה. הקשיבו לקו יורד ששוקע, ואז לאותו קו מדויק.' },
        play: [seq([[62, 0.45], [59.9, 0.45], [58.8, 0.45], [56.7, 0.45], [54.6, 0.8]]), rest(0.4), seq([[62, 0.45], [60, 0.45], [59, 0.45], [57, 0.45], [55, 0.8]])],
        show: { notes: [62, 60, 59, 57, 55], key: 'G', text: { en: 'sinking ✗ · true ✓', he: 'שוקע ✗ · מדויק ✓' } },
      },
      {
        say: { en: 'Fast passages need a light, flexible voice. Keep the air moving and avoid putting an "h" before each note. Practice slowly with a metronome, in small groups, then raise the tempo step by step. Accuracy first, speed second.', he: 'קטעים מהירים צריכים קול קל וגמיש. שמרו על זרימת האוויר והימנעו מ"ה" לפני כל צליל. תרגלו לאט עם מטרונום, בקבוצות קטנות, ואז העלו את הטמפו בהדרגה. קודם דיוק, אחר כך מהירות.' },
        play: [{ kind: 'melody', midis: [55, 57, 59, 60, 62, 60, 59, 57, 55], beats: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1], bpm: 72 }],
        show: { notes: [55, 57, 59, 60, 62, 60, 59, 57, 55], key: 'G', text: { en: 'slow → faster', he: 'לאט ← מהר יותר' } },
      },
      {
        say: { en: 'To sing a melody back, remember its contour, up or down, step or leap, and where it sits in the key. Chunk longer tunes into short phrases. Notice the last note: it often lands on 1, 3 or 5.', he: 'כדי לשיר מנגינה בחזרה, זכרו את קו המתאר שלה — למעלה או למטה, צעד או קפיצה — ואיפה היא יושבת בסולם. חלקו מנגינות ארוכות למשפטים קצרים. שימו לב לצליל האחרון: לעיתים קרובות הוא נוחת על 1, 3 או 5.' },
        show: { text: { en: 'contour · chunks · last note', he: 'קו מתאר · קבוצות · צליל אחרון' } },
      },
      {
        say: { en: 'Many notes on one syllable is called melisma. You hear it in Handel\'s Messiah, in gospel and R&B runs, and in Middle Eastern singing, where fast, exact ornaments are part of the style.', he: 'הרבה צלילים על הברה אחת נקראים מליסמה. שומעים אותה במשיח של הנדל, בריפים ובראנים של גוספל ו־R&B, ובשירה מזרחית, שבה עיטורים מהירים ומדויקים הם חלק מהסגנון.' },
        show: { text: { en: 'melisma', he: 'מליסמה' } },
      },
      {
        say: { en: 'To keep: connect the notes with steady air, hear each target before you go, watch the way down, and build speed only on accuracy.', he: 'לזכור: חברו את הצלילים באוויר יציב, שמעו כל יעד לפני שהולכים אליו, היזהרו בירידות, ובנו מהירות רק על דיוק.' },
        show: { text: { en: 'air · target · downhill · speed', he: 'אוויר · יעד · ירידות · מהירות' } },
      },
    ],
  },

  // ------------------------------------------------------------------ sung scales & modes
  {
    id: 'vocal-scales',
    area: 'voice',
    emoji: '🪜',
    title: { en: 'Singing scales and modes', he: 'לשיר סולמות ומודוסים' },
    takeaway: { en: 'Every mode is the same ladder with a few rungs moved — hear which ones, and sing each step clean and connected.', he: 'כל מודוס הוא אותו סולם עם כמה שלבים שזזו — שומעים אילו, ושרים כל צעד נקי ומחובר.' },
    steps: [
      {
        say: { en: 'Hi {name}! A scale is a ladder of notes from home to home. Major is the bright one: sing it with even steps, each one clean.', he: 'היי {name}! סולם הוא סולם של צלילים מבית לבית. מז׳ור הוא המואר: שירו אותו בצעדים שווים, כל אחד נקי.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67], 0.45)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G', text: { en: 'G major', he: 'סול מז׳ור' } },
      },
      {
        say: { en: 'Natural minor lowers the 3rd, 6th and 7th: the same climb, but darker.', he: 'מינור טבעי מנמיך את הדרגות 3, 6 ו־7: אותה עלייה, רק כהה יותר.' },
        play: [notes([55, 57, 58, 60, 62, 63, 65, 67], 0.45)],
        show: { notes: [55, 57, 58, 60, 62, 63, 65, 67], key: 'Bb', text: { en: 'G minor', he: 'סול מינור' } },
      },
      {
        say: { en: 'Modes move just one or two rungs. Mixolydian is major with a lowered 7th — hear it near the top.', he: 'מודוסים מזיזים רק שלב או שניים. מיקסולידי הוא מז׳ור עם דרגה 7 מונמכת — הקשיבו לה ליד הפסגה.' },
        play: [notes([55, 57, 59, 60, 62, 64, 65, 67], 0.45)],
        show: { notes: [55, 57, 59, 60, 62, 64, 65, 67], key: 'C', text: { en: 'Mixolydian: ♭7', he: 'מיקסולידי: ♭7' } },
      },
      {
        say: { en: 'Pentatonic skips the half steps: five notes, no clashes. It\'s the sound of folk songs and blues.', he: 'פנטטוני מדלג על חצאי הטונים: חמישה צלילים, בלי חיכוכים. זה הצליל של שירי עם ושל בלוז.' },
        play: [notes([55, 57, 59, 62, 64, 67], 0.5)],
        show: { notes: [55, 57, 59, 62, 64, 67], key: 'G', text: { en: '1 2 3 5 6', he: '1 2 3 5 6' } },
      },
      {
        say: { en: 'At first you hear the whole scale and echo it. Later you hear only the starting note, and the scale has to come from inside you.', he: 'בהתחלה שומעים את כל הסולם ומהדהדים אותו. בהמשך שומעים רק את צליל הפתיחה, והסולם צריך לבוא מבפנים.' },
        play: [note(55, 1.6)],
        show: { notes: [55], text: { en: 'only the tonic', he: 'רק הטוניקה' } },
      },
      {
        say: { en: 'The top levels go up in one mode and down in another. Here: up in major, down in minor. Feel which notes change on the way down.', he: 'הרמות הגבוהות עולות במודוס אחד ויורדות באחר. כאן: למעלה במז׳ור, למטה במינור. הרגישו אילו צלילים משתנים בירידה.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67, 65, 63, 62, 60, 58, 57, 55], 0.36)],
        show: { notes: [55, 59, 64, 66, 67, 65, 63, 58, 55], text: { en: 'up major · down minor', he: 'למעלה מז׳ור · למטה מינור' } },
      },
      {
        say: { en: 'Your turn: listen, then sing it up — and back down if asked — on "la" or note names. I grade the right notes, intonation and clean, connected steps.', he: 'תורכם: הקשיבו, ואז שירו למעלה — ובחזרה למטה אם התבקשתם — על "לה" או בשמות הצלילים. הציון על הצלילים הנכונים, האינטונציה וצעדים נקיים ומחוברים.' },
        play: [notes([55, 57, 59, 60, 62], 0.5)],
        show: { notes: [55, 57, 59, 60, 62], key: 'G' },
      },
    ],
    more: [
      {
        say: { en: 'A scale is a set of notes in step order, from the tonic to its octave. Major follows the pattern whole, whole, half, whole, whole, whole, half. The half steps, 3 to 4 and 7 to 8, give it its shape.', he: 'סולם הוא סדרת צלילים בצעדים, מהטוניקה ועד האוקטבה שלה. מז׳ור בנוי לפי התבנית טון, טון, חצי, טון, טון, טון, חצי. חצאי הטונים, בין 3 ל־4 ובין 7 ל־8, נותנים לו את הצורה.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67], 0.45)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G', text: { en: '1 1 ½ 1 1 1 ½', he: '1 1 ½ 1 1 1 ½' } },
      },
      {
        say: { en: 'Minor has three forms. Natural minor lowers 3, 6 and 7. Harmonic minor raises 7 again, for a leading tone, leaving a wide step between 6 and 7. Melodic minor raises 6 and 7 going up and traditionally comes down natural.', he: 'למינור יש שלוש צורות. מינור טבעי מנמיך את 3, 6 ו־7. מינור הרמוני מגביה שוב את 7, בשביל צליל מוביל, ומשאיר צעד רחב בין 6 ל־7. מינור מלודי מגביה את 6 ו־7 בעלייה, ובמסורת יורד כמו מינור טבעי.' },
        play: [notes([57, 59, 60, 62, 64, 65, 68, 69], 0.45)],
        show: { notes: [57, 59, 60, 62, 64, 65, 68, 69], key: 'C', text: { en: 'A harmonic minor: F → G♯', he: 'לה מינור הרמוני: פה ← סול♯' } },
      },
      {
        say: { en: 'The modes start the major pattern from different notes. Each has a color note: Dorian is minor with a raised 6, Phrygian minor with a lowered 2, Lydian major with a raised 4, Mixolydian major with a lowered 7. Here is G Dorian: listen for E natural.', he: 'המודוסים מתחילים את תבנית המז׳ור מצלילים שונים. לכל אחד יש צליל צבע: דורי הוא מינור עם 6 מוגבהת, פריגי מינור עם 2 מונמכת, לידי מז׳ור עם 4 מוגבהת, מיקסולידי מז׳ור עם 7 מונמכת. הנה סול דורי: הקשיבו למי בקר.' },
        play: [notes([55, 57, 58, 60, 62, 64, 65, 67], 0.42)],
        show: { notes: [55, 57, 58, 60, 62, 64, 65, 67], key: 'F', text: { en: 'G Dorian: ♮6', he: 'סול דורי: ♮6' } },
      },
      {
        say: { en: 'To hear a mode, sing it over a held tonic, a drone. The color note rubs or glows against it. Here is G Lydian over a G drone: the raised 4, C sharp, floats.', he: 'כדי לשמוע מודוס, שירו אותו מעל טוניקה מוחזקת — דרון. צליל הצבע מתחכך או זוהר מולה. הנה סול לידי מעל דרון סול: דרגה 4 המוגבהת, דו דיאז, מרחפת.' },
        play: [{
          kind: 'events',
          length: 4.6,
          events: [
            { midi: 43, start: 0, duration: 4.3, velocity: 0.42 },
            { midi: 50, start: 0, duration: 4.3, velocity: 0.38 },
            ...[55, 57, 59, 61, 62, 64, 66, 67].map((m, i) => ({ midi: m, start: 0.3 + i * 0.48, duration: 0.46, velocity: 0.68 })),
          ],
        }],
        show: { notes: [55, 57, 59, 61, 62, 64, 66, 67], key: 'D', text: { en: 'G Lydian: ♯4', he: 'סול לידי: ♯4' } },
      },
      {
        say: { en: 'Sing scales on one vowel or in solfège, slowly at first. Most intonation trouble lives in the half steps: singers make them too wide. Keep 3 to 4 and 7 to 8 small, with the leading tone close to home.', he: 'שירו סולמות על תנועה אחת או בסולפז׳, לאט בהתחלה. רוב בעיות האינטונציה גרות בחצאי הטונים: זמרים עושים אותם רחבים מדי. שמרו על 3–4 ועל 7–8 קטנים, והצליל המוביל קרוב לבית.' },
        play: [notes([57, 59, 60], 0.6), rest(0.4), notes([64, 66, 67], 0.6)],
        show: { notes: [59, 60, 66, 67], key: 'G', text: { en: '3–4 · 7–8: small', he: '3–4 · 7–8: קטנים' } },
      },
      {
        say: { en: 'Major pentatonic uses 1, 2, 3, 5 and 6. Minor pentatonic uses 1, ♭3, 4, 5 and ♭7, the backbone of blues and rock solos. Add a ♭5 and you have the blues scale.', he: 'פנטטוני מז׳ור משתמש ב־1, 2, 3, 5 ו־6. פנטטוני מינור משתמש ב־1, ♭3, 4, 5 ו־♭7 — עמוד השדרה של סולואים בבלוז וברוק. מוסיפים ♭5 ומקבלים את סולם הבלוז.' },
        play: [notes([55, 58, 60, 62, 65, 67], 0.45)],
        show: { notes: [55, 58, 60, 62, 65, 67], key: 'Bb', text: { en: '1 ♭3 4 5 ♭7', he: '1 ♭3 4 5 ♭7' } },
      },
      {
        say: { en: 'The common mistake is slipping back into major halfway through a mode, because the ear knows major best. Anchor on 1, 3 and 5, and aim deliberately at the color note.', he: 'הטעות הנפוצה היא לחזור למז׳ור באמצע מודוס, כי האוזן מכירה מז׳ור הכי טוב. היאחזו ב־1, 3 ו־5, וכוונו במודע אל צליל הצבע.' },
        show: { text: { en: 'anchor 1 3 5 · aim at the color', he: 'עוגן 1 3 5 · לכוון לצליל הצבע' } },
      },
      {
        say: { en: 'Modes are everywhere: Scarborough Fair is usually sung in Dorian, The Simpsons theme is Lydian, and much rock and folk is Mixolydian. To keep: the same ladder with different rungs moved; know which ones.', he: 'מודוסים נמצאים בכל מקום: את Scarborough Fair שרים בדרך כלל בדורי, הפתיח של משפחת סימפסון בלידי, והרבה רוק ופולק במיקסולידי. לזכור: אותו סולם עם שלבים אחרים שזזו — דעו אילו.' },
        show: { text: { en: 'Dorian · Lydian · Mixolydian', he: 'דורי · לידי · מיקסולידי' } },
      },
    ],
  },

  // ------------------------------------------------------------------ harmony singing
  {
    id: 'vocal-harmony',
    area: 'voice',
    emoji: '👯',
    title: { en: 'Singing in harmony', he: 'לשיר בהרמוניה' },
    takeaway: { en: 'Keep your own note in your head while another one sounds: intervals over a held note, the missing chord note, then a line in thirds or sixths.', he: 'שומרים על הצליל שלכם בראש בזמן שצליל אחר נשמע: מרווחים מעל צליל מוחזק, הצליל החסר באקורד, ואז קו בטרצות או בסקסטות.' },
    steps: [
      {
        say: { en: 'Hey {name}! Harmony means singing a different note that fits with the one you hear. The piano holds one note; you sing the other.', he: 'היי {name}! הרמוניה פירושה לשיר צליל אחר שמתאים לצליל שאתם שומעים. הפסנתר מחזיק צליל אחד; אתם שרים את השני.' },
        play: [note(55, 1), { kind: 'chord', midis: [55, 62], duration: 2 }],
        show: { notes: [55, 62], chord: true },
      },
      {
        say: { en: 'Start with intervals over a held note. A fifth above sounds open and hollow; a third above sounds sweet.', he: 'מתחילים במרווחים מעל צליל מוחזק. קווינטה מעליו נשמעת פתוחה וחלולה; טרצה מעליו נשמעת מתוקה.' },
        play: [{ kind: 'chord', midis: [55, 62], duration: 1.6 }, rest(0.3), { kind: 'chord', midis: [55, 59], duration: 1.6 }],
        show: { notes: [55, 59, 62], text: { en: 'fifth · third', he: 'קווינטה · טרצה' } },
      },
      {
        say: { en: 'Keep your note in your head, not your ear on the piano. If you drift toward the held note, you end up singing along with it.', he: 'שמרו את הצליל שלכם בראש, ולא את האוזן על הפסנתר. אם נסחפים לצליל המוחזק, מוצאים את עצמכם שרים איתו באוניסון.' },
        play: [note(59, 1.2), { kind: 'chord', midis: [55, 59], duration: 2 }],
        show: { notes: [59], text: { en: 'your note', he: 'הצליל שלכם' } },
      },
      {
        say: { en: 'Next, a chord with a hole in it: root and fifth sound, and you sing the missing third. Later, any note can be the missing one.', he: 'אחר כך אקורד עם חור: השורש והקווינטה נשמעים, ואתם שרים את הטרצה החסרה. בהמשך כל צליל יכול להיות החסר.' },
        play: [{ kind: 'chord', midis: [55, 62], duration: 1.5 }, rest(0.3), { kind: 'chord', midis: [55, 59, 62], duration: 1.8 }],
        show: { notes: [55, 59, 62], chord: true, text: { en: '1 _ 5 → 3', he: '1 _ 5 ← 3' } },
      },
      {
        say: { en: 'Then a whole line against a melody: a third above it, later a sixth or a third below. Two lines moving together, like a duet.', he: 'אחר כך קו שלם מול מנגינה: טרצה מעליה, ובהמשך סקסטה או טרצה מתחתיה. שני קווים שנעים יחד, כמו דואט.' },
        play: [
          {
            kind: 'events',
            length: 4.6,
            events: [55, 57, 59, 57, 55].flatMap((m, i) => [
              { midi: m, start: i * 0.83, duration: 0.8, velocity: 0.55 },
              { midi: [59, 60, 62, 60, 59][i], start: i * 0.83, duration: 0.8, velocity: 0.68 },
            ]),
          },
        ],
        show: { notes: [59, 60, 62, 60, 59], key: 'G', text: { en: 'a third above', he: 'טרצה מעל' } },
      },
      {
        say: { en: 'Use headphones here: the app keeps playing while you sing, and the mic must hear only you. I check that your note is in tune and steady.', he: 'כאן צריך אוזניות: האפליקציה ממשיכה לנגן בזמן שאתם שרים, והמיקרופון צריך לשמוע רק אתכם. אני בודק שהצליל שלכם מדויק ויציב.' },
        play: [{ kind: 'chord', midis: [55, 59, 62], duration: 2.2 }],
        show: { notes: [55, 59, 62], chord: true, text: { en: 'headphones', he: 'אוזניות' } },
      },
      {
        say: { en: 'Your turn: listen to the held note or the melody, then sing your part on "ah" — in tune, steady, and your own.', he: 'תורכם: הקשיבו לצליל המוחזק או למנגינה, ואז שירו את הקול שלכם על "אה" — מדויק, יציב, ושלכם.' },
        play: [{ kind: 'chord', midis: [55, 59], duration: 1.8 }],
        show: { notes: [55, 59] },
      },
    ],
    more: [
      {
        say: { en: 'Harmony is two or more pitches at once. The most stable intervals are the unison, the octave and the fifth. Thirds and sixths are the sweet ones, which is why most harmony parts live there. Seconds and sevenths clash and want to move.', he: 'הרמוניה היא שני צלילים או יותר בבת אחת. המרווחים היציבים ביותר הם אוניסון, אוקטבה וקווינטה. טרצות וסקסטות הן המתוקות, ולכן רוב קווי ההרמוניה גרים שם. סקונדות וספטימות מתחככות ורוצות לזוז.' },
        play: [{ kind: 'chord', midis: [60, 67], duration: 1.2 }, rest(0.3), { kind: 'chord', midis: [60, 64], duration: 1.2 }, rest(0.3), { kind: 'chord', midis: [60, 62], duration: 1.2 }],
        show: { notes: [60, 62, 64, 67], text: { en: 'open · sweet · clash', he: 'פתוח · מתוק · חיכוך' } },
      },
      {
        say: { en: 'A part a third above follows the key, so its thirds are sometimes major, sometimes minor. Over C, D, E, F, G in C major, the second voice sings E, F, G, A, B.', he: 'קו בטרצה מעל הולך לפי הסולם, ולכן הטרצות שלו פעם גדולות ופעם קטנות. מעל דו, רה, מי, פה, סול בדו מז׳ור, הקול השני שר מי, פה, סול, לה, סי.' },
        play: [{
          kind: 'events',
          length: 4.4,
          events: [60, 62, 64, 65, 67].flatMap((m, i) => [
            { midi: m, start: i * 0.8, duration: 0.77, velocity: 0.55 },
            { midi: [64, 65, 67, 69, 71][i], start: i * 0.8, duration: 0.77, velocity: 0.68 },
          ]),
        }],
        show: { notes: [64, 65, 67, 69, 71], key: 'C', text: { en: 'a third above', he: 'טרצה מעל' } },
      },
      {
        say: { en: 'Move that part down an octave and it becomes a sixth below. Sixths sound warm and open, a favorite for a lower voice under the tune.', he: 'מורידים את הקו הזה באוקטבה, והוא הופך לסקסטה מתחת. סקסטות נשמעות חמות ופתוחות, ואהובות על קול נמוך שמתחת למנגינה.' },
        play: [{
          kind: 'events',
          length: 2.8,
          events: [64, 65, 67].flatMap((m, i) => [
            { midi: m, start: i * 0.8, duration: 0.77, velocity: 0.68 },
            { midi: [55, 57, 59][i], start: i * 0.8, duration: 0.77, velocity: 0.55 },
          ]),
        }],
        show: { notes: [55, 57, 59], key: 'C', text: { en: 'a sixth below', he: 'סקסטה מתחת' } },
      },
      {
        say: { en: 'When two voices are in tune, they blend and almost fuse into one sound. Slightly out, you hear a slow beating, a wobble in the sound. Hear a third in tune, then one that is a little sharp.', he: 'כששני קולות מדויקים, הם מתמזגים וכמעט הופכים לצליל אחד. כשהם קצת לא מדויקים, שומעים פעימה איטית, גל בתוך הצליל. הקשיבו לטרצה מדויקת, ואז לטרצה קצת גבוהה מדי.' },
        play: [{
          kind: 'events',
          length: 4.4,
          events: [
            { midi: 60, start: 0, duration: 1.9, velocity: 0.6 },
            { midi: 64, start: 0, duration: 1.9, velocity: 0.6 },
            { midi: 60, start: 2.3, duration: 1.9, velocity: 0.6 },
            { midi: 64.4, start: 2.3, duration: 1.9, velocity: 0.6 },
          ],
        }],
        show: { notes: [60, 64], text: { en: 'blend ✓ · beating ✗', he: 'מיזוג ✓ · פעימה ✗' } },
      },
      {
        say: { en: 'Practice in layers: sing the melody, then your part alone, then your part against the melody. Know your degree in the chord, for example the 3. Covering one ear lightly helps you hear yourself inside the blend.', he: 'תרגלו בשכבות: שירו את המנגינה, אחר כך את הקול שלכם לבד, ואז את הקול שלכם מול המנגינה. דעו מה הדרגה שלכם באקורד, למשל 3. כיסוי קל של אוזן אחת עוזר לשמוע את עצמכם בתוך המיזוג.' },
        show: { text: { en: 'melody → part → together', he: 'מנגינה ← קול ← ביחד' } },
      },
      {
        say: { en: 'The usual mistakes: drifting into the melody, and leaving the key by singing a major third where the key wants a minor one. Think in scale degrees, not in fixed distances.', he: 'הטעויות הרגילות: להיסחף אל המנגינה, ולצאת מהסולם — לשיר טרצה גדולה במקום שבו הסולם רוצה קטנה. חשבו בדרגות של הסולם, לא במרחקים קבועים.' },
        show: { text: { en: 'degrees, not distances', he: 'דרגות, לא מרחקים' } },
      },
      {
        say: { en: 'Close harmony in thirds is the sound of the Everly Brothers, barbershop quartets and countless pop backing vocals. Unaccompanied groups often tune major thirds slightly lower than the piano, so the chord rings.', he: 'הרמוניה צפופה בטרצות היא הצליל של האחים אוורלי, של רביעיות ברברשופ ושל אינספור קולות רקע בפופ. הרכבים בלי ליווי מכוונים לעיתים קרובות טרצות גדולות קצת נמוך יותר מהפסנתר, כדי שהאקורד יצלצל.' },
        show: { text: { en: 'close harmony', he: 'הרמוניה צפופה' } },
      },
      {
        say: { en: 'To keep: thirds and sixths, shaped by the key; your note held in your head; blend until the beating stops.', he: 'לזכור: טרצות וסקסטות, לפי הסולם; הצליל שלכם מוחזק בראש; מתמזגים עד שהפעימה נעלמת.' },
        show: { text: { en: '3rds · 6ths · blend', he: 'טרצות · סקסטות · מיזוג' } },
      },
    ],
  },

  // ------------------------------------------------------------------ sight-singing
  {
    id: 'vocal-sight',
    area: 'voice',
    emoji: '👀',
    title: { en: 'Sight-singing', he: 'סולפז׳ — קריאה בשירה' },
    takeaway: { en: 'Find home from the tonic, read steps and skips from the staff, and keep the written rhythm — no melody to copy.', he: 'מוצאים את הבית מהטוניקה, קוראים צעדים ודילוגים מהחמשה ושומרים על הקצב הכתוב — אין מנגינה להעתיק.' },
    steps: [
      {
        say: { en: 'Hi {name}! Sight-singing means reading a melody and singing it without hearing it first. You get only the home note and a count-in.', he: 'היי {name}! סולפז׳ זה לקרוא מנגינה ולשיר אותה בלי לשמוע אותה קודם. מקבלים רק את צליל הבית וספירה.' },
        play: [countIn(60, 72)],
        show: { notes: [60], key: 'C', text: { en: 'tonic + 1 2 3 4', he: 'טוניקה + 1 2 3 4' } },
      },
      {
        say: { en: 'Find home first. Every note on the staff is a step or a skip away from it. Steps move to the very next line or space.', he: 'קודם מוצאים את הבית. כל צליל בחמשה נמצא צעד או דילוג ממנו. צעד עובר לקו או לרווח הבא מיד.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 62, 60], beats: [1, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [60, 62, 64, 62, 60], key: 'C', durs: [1, 1, 1, 1, 2] },
      },
      {
        say: { en: 'Thirds skip one: line to line, or space to space.', he: 'טרצות מדלגות על אחד: מקו לקו, או מרווח לרווח.' },
        play: [{ kind: 'melody', midis: [60, 64, 62, 65, 64], beats: [1, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [60, 64, 62, 65, 64], key: 'C', durs: [1, 1, 1, 1, 2] },
      },
      {
        say: { en: 'Rhythm matters as much as pitch. A quarter note gets one beat, a half note two, and eighths go two to a beat.', he: 'הקצב חשוב בדיוק כמו הגובה. רבע מקבל פעמה אחת, חצי — שתיים, ושמיניות הולכות שתיים בפעמה.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 65, 64, 62, 60], beats: [1, 0.5, 0.5, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [60, 62, 64, 65, 64, 62, 60], key: 'C', durs: [1, 0.5, 0.5, 1, 1, 1, 2], text: { en: '♩ ♫ ♩ ♩ ♩ 𝅗𝅥', he: '♩ ♫ ♩ ♩ ♩ 𝅗𝅥' } },
      },
      {
        say: { en: 'In minor, watch for the raised seventh: the leading tone that pulls up to home.', he: 'במינור, שימו לב לדרגה 7 המוגבהת: הצליל המוביל שמושך למעלה אל הבית.' },
        play: [{ kind: 'melody', midis: [57, 59, 60, 59, 57, 56, 57], beats: [1, 1, 1, 1, 1, 1, 2], bpm: 76 }],
        show: { notes: [57, 59, 60, 59, 57, 56, 57], key: 'C', durs: [1, 1, 1, 1, 1, 1, 2], text: { en: 'A minor: G♯ → A', he: 'לה מינור: סול♯ ← לה' } },
      },
      {
        say: { en: 'Sing on "la", note names or do-re-mi, whatever helps you. If one note slips, keep going: the next beat is a fresh chance.', he: 'שירו על "לה", בשמות הצלילים או בדו־רה־מי, מה שעוזר לכם. אם צליל אחד בורח, תמשיכו: הפעמה הבאה היא הזדמנות חדשה.' },
      },
      {
        say: { en: 'Your turn: read the melody, hear the tonic and count-in, then sing it in rhythm. I grade the right notes, intonation and timing.', he: 'תורכם: קראו את המנגינה, שמעו את הטוניקה והספירה, ואז שירו בקצב. הציון על הצלילים הנכונים, האינטונציה והתזמון.' },
        play: [countIn(60, 72)],
        show: { notes: [60], key: 'C' },
      },
    ],
    more: [
      {
        say: { en: 'Sight-singing is reading pitch and rhythm and singing them with no instrument. It rests on relative pitch: knowing how each note relates to the tonic. Some read with movable do, where do is always home; in Israel most musicians use fixed note names; numbers work too.', he: 'סולפז׳ הוא לקרוא גובה וקצב ולשיר אותם בלי כלי. הוא נשען על שמיעה יחסית: לדעת איך כל צליל קשור לטוניקה. יש שקוראים בדו נייד, שבו דו הוא תמיד הבית; בישראל רוב המוזיקאים משתמשים בשמות צלילים קבועים; גם מספרים עובדים.' },
        play: [countIn(60, 72)],
        show: { notes: [60], key: 'C', text: { en: 'every note ↔ the tonic', he: 'כל צליל ↔ הטוניקה' } },
      },
      {
        say: { en: 'Before you sing, scan for half a minute: key and time signature, the first note\'s degree, the highest and lowest notes, the leaps and any tricky rhythms. Then set the key by singing 1, 3, 5 and back.', he: 'לפני ששרים, סרקו חצי דקה: סימן מפתח ומשקל, הדרגה של הצליל הראשון, הצליל הגבוה והנמוך ביותר, הקפיצות וקצבים מסובכים. ואז קבעו את הסולם כששרים 1, 3, 5 וחזרה.' },
        play: [notes([60, 64, 67, 72, 67, 64, 60], 0.4)],
        show: { notes: [60, 64, 67, 72], key: 'C', text: { en: 'scan → 1 3 5 8', he: 'סריקה ← 1 3 5 8' } },
      },
      {
        say: { en: 'Steps are easy; leaps need an anchor. Leaps inside the home chord, 1, 3 and 5, are the easiest. For any other leap, find the nearest chord note and step from it. Here, 1 leaps to 5, then steps down home.', he: 'צעדים קלים; קפיצות צריכות עוגן. קפיצות בתוך אקורד הבית, 1, 3 ו־5, הן הקלות ביותר. לכל קפיצה אחרת, מצאו את צליל האקורד הקרוב וצעדו ממנו. כאן 1 קופץ ל־5, ואז יורד בצעדים הביתה.' },
        play: [{ kind: 'melody', midis: [60, 67, 65, 64, 62, 60], beats: [1, 1, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [60, 67, 65, 64, 62, 60], key: 'C', durs: [1, 1, 1, 1, 1, 2] },
      },
      {
        say: { en: 'Keep the pulse going inside you, tapping or conducting lightly. Count the subdivisions in long and dotted notes: a dotted quarter lasts one and a half beats. Never stop to fix a note; the beat moves on.', he: 'שמרו על הפעמה בתוככם, בהקשה או בניצוח קל. ספרו את החלוקות בצלילים ארוכים ומנוקדים: רבע מנוקד נמשך פעמה וחצי. אף פעם לא עוצרים לתקן צליל; הפעמה ממשיכה.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 60], beats: [1.5, 0.5, 1, 1], bpm: 72 }],
        show: { notes: [60, 62, 64, 60], key: 'C', durs: [1.5, 0.5, 1, 1] },
      },
      {
        say: { en: 'In minor, sing the tonic triad first: 1, ♭3, 5. Watch for the raised 7, and in harmonic minor for the wide step from 6 to 7: in A minor, F to G sharp, three half steps.', he: 'במינור, שירו קודם את אקורד הטוניקה: 1, ♭3, 5. שימו לב לדרגה 7 המוגבהת, ובמינור הרמוני לצעד הרחב בין 6 ל־7: בלה מינור, מפה לסול דיאז, שלושה חצאי טון.' },
        play: [notes([57, 60, 64], 0.5), rest(0.3), notes([65, 68, 69], 0.7)],
        show: { notes: [65, 68, 69], key: 'C', text: { en: 'F → G♯ → A', he: 'פה ← סול♯ ← לה' } },
      },
      {
        say: { en: 'The common mistake is singing the right shape in the wrong key: the intervals drift and home moves. When you feel lost, hear 1 in your head and find your degree from it.', he: 'הטעות הנפוצה היא לשיר את הצורה הנכונה בסולם הלא נכון: המרווחים נסחפים והבית זז. כשאתם מרגישים אבודים, שמעו את 1 בראש ומצאו ממנו את הדרגה שלכם.' },
        show: { text: { en: 'lost? → hear 1', he: 'אבודים? ← לשמוע את 1' } },
      },
      {
        say: { en: 'Practice a little every day with simple tunes, folk songs and hymns, slightly below your level, so you can keep going. Read a new melody each time; the skill is reading, not memory.', he: 'תרגלו קצת כל יום עם מנגינות פשוטות, שירי עם ומזמורים, מעט מתחת לרמה שלכם, כדי שתוכלו להמשיך בלי לעצור. קראו מנגינה חדשה בכל פעם; המיומנות היא קריאה, לא זיכרון.' },
        show: { text: { en: 'a little, every day', he: 'קצת, כל יום' } },
      },
      {
        say: { en: 'To keep: scan, set the key with 1, 3, 5, anchor every leap, and keep the beat whatever happens.', he: 'לזכור: סורקים, קובעים את הסולם עם 1, 3, 5, מעגנים כל קפיצה ושומרים על הפעמה בכל מצב.' },
        show: { text: { en: 'scan · 1 3 5 · anchor · beat', he: 'סריקה · 1 3 5 · עוגן · פעמה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ ornaments & dynamics
  {
    id: 'vocal-ornaments',
    area: 'voice',
    emoji: '✨',
    title: { en: 'Ornaments and dynamics', he: 'קישוטים ודינמיקה' },
    takeaway: { en: 'Ornaments are quick, light decorations that return to a steady main note; dynamics change the loudness while the pitch stays put.', he: 'קישוטים הם עיטורים מהירים וקלים שחוזרים לצליל עיקרי יציב; דינמיקה משנה את העוצמה בזמן שהגובה נשאר במקום.' },
    steps: [
      {
        say: { en: 'Hey {name}! Ornaments are tiny decorations around one main note. Quick and light: the main note is still the star. First, a grace note — a flick from above.', he: 'היי {name}! קישוטים הם עיטורים קטנטנים סביב צליל עיקרי אחד. מהירים וקלים: הצליל העיקרי נשאר הכוכב. קודם אצ׳קטורה — נגיעה מהירה מלמעלה.' },
        play: [seq([[62, 0.1], [60, 1.5]])],
        show: { notes: [62, 60], text: { en: 'grace note', he: 'אצ׳קטורה' } },
      },
      {
        say: { en: 'An upper mordent goes main, up, main — fast — then holds. The lower mordent dips below instead.', he: 'מורדנט עליון הולך עיקרי, למעלה, עיקרי — מהר — ואז מחזיק. המורדנט התחתון יורד מתחת במקום.' },
        play: [seq([[60, 0.12], [62, 0.12], [60, 1.2], [-1, 0.4], [60, 0.12], [59, 0.12], [60, 1.2]])],
        show: { notes: [60, 62, 60], text: { en: 'main – up – main', he: 'עיקרי – למעלה – עיקרי' } },
      },
      {
        say: { en: 'A turn circles the note: above, the note, below, the note — quick and even.', he: 'טרן מקיף את הצליל: מעל, הצליל, מתחת, הצליל — מהר ואחיד.' },
        play: [seq([[62, 0.12], [60, 0.12], [59, 0.12], [60, 1.4]])],
        show: { notes: [62, 60, 59, 60], text: { en: 'above – note – below – note', he: 'מעל – צליל – מתחת – צליל' } },
      },
      {
        say: { en: 'A trill alternates fast between the main note and the one above, then settles on the main note.', he: 'טריל מחליף מהר בין הצליל העיקרי לזה שמעליו, ואז מתייצב על העיקרי.' },
        play: [seq([...Array.from({ length: 14 }, (_, i) => [i % 2 ? 62 : 60, 0.12] as [number, number]), [60, 1.3]])],
        show: { notes: [60, 62], text: { en: 'tr~~~', he: 'tr~~~' } },
      },
      {
        say: { en: 'I check the shape — the right notes in order — the speed, and that the main note lands in tune and stays steady. Think light and loose, not loud.', he: 'אני בודק את הצורה — הצלילים הנכונים בסדר הנכון — את המהירות, ושהצליל העיקרי נוחת מדויק ונשאר יציב. חשבו קל ומשוחרר, לא חזק.' },
      },
      {
        say: { en: 'The other half is dynamics: a crescendo grows from soft to loud, a decrescendo fades, and the swell does both. The pitch stays exactly where it is.', he: 'החצי השני הוא דינמיקה: קרשנדו מתגבר מחלש לחזק, דקרשנדו דועך, וקרשנדו־דקרשנדו עושה את שניהם. הגובה נשאר בדיוק במקומו.' },
        play: [shape(60, [0.15, 0.25, 0.37, 0.5, 0.63, 0.78], 0.45), rest(0.4), shape(60, [0.78, 0.63, 0.5, 0.37, 0.25, 0.15], 0.45)],
        show: { notes: [60], text: { en: 'cresc. < · decresc. >', he: 'קרשנדו < · דקרשנדו >' } },
      },
      {
        say: { en: 'Your turn: listen, then sing on "ah" — the ornament quick and clean, then hold the main note. For dynamics, shape it with your breath, never by pushing.', he: 'תורכם: הקשיבו, ואז שירו על "אה" — הקישוט מהיר ונקי, ואז החזיקו את הצליל העיקרי. בדינמיקה, עצבו עם הנשימה, אף פעם לא בדחיפה.' },
        play: [seq([[62, 0.1], [60, 1.4]])],
        show: { notes: [62, 60] },
      },
    ],
    more: [
      {
        say: { en: 'Ornaments decorate a main note. Some are written as small notes or symbols; in Baroque music singers were also expected to add their own, especially on repeats.', he: 'קישוטים מעטרים צליל עיקרי. חלקם כתובים כצלילים קטנים או כסימנים; במוזיקת הבארוק גם ציפו מהזמרים להוסיף קישוטים משלהם, בעיקר בחזרות.' },
        play: [seq([[62, 0.1], [60, 1.4]])],
        show: { notes: [62, 60], text: { en: 'written or added', he: 'כתוב או מוסף' } },
      },
      {
        say: { en: 'Two small notes look alike. The acciaccatura, with a slash, is crushed in as fast as possible. The appoggiatura, a leaning note, takes real time from the main note, falls on the beat and resolves by step. Hear the acciaccatura, then the appoggiatura.', he: 'שני צלילים קטנים נראים דומה. האצ׳קטורה, עם קו חוצה, נמחצת פנימה הכי מהר שאפשר. האפוג׳יאטורה, צליל נשען, לוקחת זמן אמיתי מהצליל העיקרי, נופלת על הפעמה ונפתרת בצעד. הקשיבו לאצ׳קטורה, ואז לאפוג׳יאטורה.' },
        play: [seq([[62, 0.07], [60, 1.3]]), rest(0.4), seq([[62, 0.7], [60, 0.9]])],
        show: { notes: [62, 60], text: { en: 'crushed · leaning', he: 'נמחצת · נשענת' } },
      },
      {
        say: { en: 'Names vary. In Baroque terms the mordent dips to the note below and back; the version that flicks to the note above is the upper, or inverted, mordent. A turn uses both neighbors: above, main, below, main.', he: 'השמות משתנים. במינוח הבארוקי המורדנט יורד לצליל שמתחת וחוזר; הגרסה שנוגעת בצליל שמעל נקראת מורדנט עליון, או מורדנט הפוך. טרן משתמש בשני השכנים: מעל, עיקרי, מתחת, עיקרי.' },
        play: [seq([[60, 0.1], [59, 0.1], [60, 1]]), rest(0.3), seq([[62, 0.1], [60, 0.1], [59, 0.1], [60, 1]])],
        show: { notes: [60, 59, 60], text: { en: 'mordent · turn', he: 'מורדנט · טרן' } },
      },
      {
        say: { en: 'A trill alternates the main note with the scale note above, a whole or half step depending on the key. In Baroque and Classical music it usually starts on the upper note; later music often starts on the main note. Many trills close with a small turn.', he: 'טריל מחליף בין הצליל העיקרי לצליל הסולם שמעליו, טון או חצי טון לפי הסולם. בבארוק ובקלאסיקה הוא מתחיל בדרך כלל מהצליל העליון; במוזיקה מאוחרת יותר לעיתים קרובות מהעיקרי. טרילים רבים נסגרים בטרן קטן.' },
        play: [seq([...Array.from({ length: 12 }, (_, i) => [i % 2 ? 60 : 62, 0.11] as [number, number]), [59, 0.11], [60, 1.1]])],
        show: { notes: [62, 60, 59, 60], text: { en: 'tr~~~ + turn', he: 'tr~~~ + טרן' } },
      },
      {
        say: { en: 'Sing ornaments light and on flowing air, with a relaxed throat and no "h" before each note. Learn them slowly and evenly, then speed up. For a trill, alternate two notes in a steady rhythm and speed up only while it stays even.', he: 'שירו קישוטים קלים ועל אוויר זורם, בגרון רפוי ובלי "ה" לפני כל צליל. למדו אותם לאט ובאחידות, ואז האיצו. בטריל, החליפו בין שני צלילים בקצב קבוע, והאיצו רק כל עוד זה נשאר אחיד.' },
        show: { text: { en: 'light · even · then faster', he: 'קל · אחיד · ואז מהר יותר' } },
      },
      {
        say: { en: 'Dynamics run from pianissimo, very soft, to fortissimo, very loud: pp, p, mp, mf, f, ff. Change loudness with breath energy, not by squeezing the throat, and keep the pitch level: louder tends to go sharp, softer tends to go flat.', he: 'הדינמיקה נעה מפיאניסימו, חלש מאוד, עד פורטיסימו, חזק מאוד: pp, p, mp, mf, f, ff. שנו עוצמה באנרגיית הנשימה, לא בלחיצת הגרון, ושמרו על הגובה: חזק נוטה לעלות, חלש נוטה לרדת.' },
        play: [shape(60, [0.12, 0.25, 0.4, 0.55, 0.7, 0.85], 0.45)],
        show: { notes: [60], text: { en: 'pp p mp mf f ff', he: 'pp p mp mf f ff' } },
      },
      {
        say: { en: 'The common mistake is a heavy, slow ornament that hides the main note. Style matters too: trills and appoggiaturas belong to Baroque and Classical arias, while pop, gospel and R&B decorate with riffs and runs.', he: 'הטעות הנפוצה היא קישוט כבד ואיטי שמסתיר את הצליל העיקרי. גם הסגנון חשוב: טרילים ואפוג׳יאטורות שייכים לאריות בארוק וקלאסיות, ואילו פופ, גוספל ו־R&B מקשטים בריפים ובראנים.' },
        show: { text: { en: 'light, and in style', he: 'קל, ובסגנון' } },
      },
      {
        say: { en: 'To keep: ornaments are quick and light and return to a steady main note; dynamics change loudness, never pitch.', he: 'לזכור: קישוטים מהירים וקלים וחוזרים לצליל עיקרי יציב; דינמיקה משנה עוצמה, אף פעם לא גובה.' },
        show: { notes: [60], text: { en: 'quick · light · steady', he: 'מהיר · קל · יציב' } },
      },
    ],
  },

  // ------------------------------------------------------------------ play: guitar from tab
  {
    id: 'perform-guitar',
    area: 'play',
    emoji: '🎸',
    title: { en: 'Guitar from tab', he: 'גיטרה מטאב' },
    takeaway: { en: 'Tab shows string and fret; hear the tonic and count-in, then play each note clean and in time.', he: 'הטאב מראה מיתר וסריג; שומעים טוניקה וספירה, ואז מנגנים כל צליל נקי ובזמן.' },
    steps: [
      {
        say: { en: 'Hi {name}! Grab your guitar. You read a short melody in tab and play it, and the mic listens to the notes and the rhythm.', he: 'היי {name}! קחו את הגיטרה. קוראים מנגינה קצרה בטאב ומנגנים אותה, והמיקרופון מקשיב לצלילים ולקצב.' },
        play: [{ kind: 'melody', midis: [55, 57, 59, 57, 55], beats: [1, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [55, 57, 59, 57, 55], key: 'G', durs: [1, 1, 1, 1, 2] },
      },
      {
        say: { en: 'Tab has six lines, one per string; the top line is the thin high E string. The number is the fret to press, and 0 means the open string.', he: 'בטאב יש שישה קווים, אחד לכל מיתר; הקו העליון הוא מיתר המי הדק והגבוה. המספר הוא הסריג ללחוץ עליו, ו־0 פירושו מיתר פתוח.' },
        play: [notes([64, 67], 0.9)],
        show: { notes: [64, 67], text: { en: '0 → 3', he: '0 ← 3' } },
      },
      {
        say: { en: 'Read left to right, like words. Here every note comes one at a time, so a melody can cross strings.', he: 'קוראים משמאל לימין, כמו מילים. כאן כל צליל בא לבד, אז מנגינה יכולה לעבור בין מיתרים.' },
        play: [notes([59, 60, 62, 64], 0.6)],
        show: { notes: [59, 60, 62, 64] },
      },
      {
        say: { en: 'You hear the tonic, then four clicks. Start right after the fourth click, at that tempo, and give each note its written length.', he: 'שומעים את הטוניקה ואז ארבע נקישות. מתחילים מיד אחרי הנקישה הרביעית, באותו טמפו, ונותנים לכל צליל את האורך הכתוב שלו.' },
        play: [countIn(55, 72)],
        show: { notes: [55], text: { en: 'tonic + 1 2 3 4', he: 'טוניקה + 1 2 3 4' } },
      },
      {
        say: { en: 'Let each note ring clearly and mute the strings you aren\'t playing, so the mic hears one clean note at a time.', he: 'תנו לכל צליל לצלצל ברור והשתיקו את המיתרים שלא מנגנים עליהם, כדי שהמיקרופון ישמע צליל נקי אחד בכל פעם.' },
        play: [notes([57, 59, 60], 0.8)],
        show: { notes: [57, 59, 60] },
      },
      {
        say: { en: 'Your turn: read the tab, hear the tonic and count-in, then play. I grade the right notes, their tuning and your timing — so tune up first!', he: 'תורכם: קראו את הטאב, שמעו את הטוניקה והספירה, ואז נגנו. הציון על הצלילים הנכונים, הכיוון שלהם והתזמון — אז כוונו את הגיטרה קודם!' },
        play: [countIn(55, 72)],
        show: { notes: [55, 57, 59, 57, 55], key: 'G', durs: [1, 1, 1, 1, 2] },
      },
    ],
    more: [
      {
        say: { en: 'Tab shows where to play, not what the note is called. The six lines are the six strings: the top line is the high E string, the bottom line the low E. A number is a fret, and numbers stacked vertically are played together.', he: 'טאב מראה איפה לנגן, לא איך קוראים לצליל. ששת הקווים הם ששת המיתרים: הקו העליון הוא מיתר מי הגבוה, התחתון הוא מי הנמוך. מספר הוא סריג, ומספרים זה מעל זה מנוגנים יחד.' },
        play: [notes([64, 67], 0.8)],
        show: { notes: [64, 67], text: { en: 'line = string · number = fret', he: 'קו = מיתר · מספר = סריג' } },
      },
      {
        say: { en: 'Standard tuning, from low to high, is E, A, D, G, B, E. Each fret raises a string by a half step, so the 5th fret of one string matches the next open string, except on the G string, where the 4th fret matches B.', he: 'הכיוון הסטנדרטי, מהנמוך לגבוה, הוא מי, לה, רה, סול, סי, מי. כל סריג מעלה את המיתר בחצי טון, ולכן הסריג החמישי של מיתר שווה למיתר הפתוח הבא — חוץ ממיתר סול, שבו הסריג הרביעי שווה לסי.' },
        play: [notes([40, 45, 50, 55, 59, 64], 0.5)],
        show: { notes: [40, 45, 50, 55, 59, 64], text: { en: 'E A D G B E', he: 'E A D G B E' } },
      },
      {
        say: { en: 'The same pitch lives in several places. The G above middle C is the 3rd fret on the high E string, or the 8th fret on the B string. Tab chooses the place for you; the staff tells you only the pitch.', he: 'אותו גובה גר בכמה מקומות. הסול שמעל דו האמצעי הוא סריג 3 במיתר מי הגבוה, או סריג 8 במיתר סי. הטאב בוחר את המקום בשבילכם; החמשה אומרת רק את הגובה.' },
        play: [note(67, 1.2), rest(0.3), note(67, 1.2)],
        show: { notes: [67], text: { en: 'e 3 = B 8', he: 'e 3 = B 8' } },
      },
      {
        say: { en: 'Plain tab often leaves out rhythm, so read it beside the staff or listen first. Count the beat aloud, start right after the count-in, and give each note its full length.', he: 'טאב פשוט משמיט לעיתים קרובות את הקצב, אז קראו אותו לצד החמשה או הקשיבו קודם. ספרו את הפעמה בקול, התחילו מיד אחרי הספירה ותנו לכל צליל את מלוא האורך שלו.' },
        play: [{ kind: 'melody', midis: [55, 57, 59, 57, 55], beats: [1, 1, 1, 1, 2], bpm: 72 }],
        show: { notes: [55, 57, 59, 57, 55], key: 'G', durs: [1, 1, 1, 1, 2] },
      },
      {
        say: { en: 'For a clean note, press just behind the fret with the fingertip, not on top of it, and use only as much pressure as the note needs. Keep the other fingers off the strings that should ring.', he: 'בשביל צליל נקי, לחצו ממש מאחורי הסריג עם קצה האצבע, לא עליו, ובלחץ שהצליל צריך ולא יותר. הרחיקו את שאר האצבעות מהמיתרים שצריכים לצלצל.' },
        show: { text: { en: 'just behind the fret', he: 'ממש מאחורי הסריג' } },
      },
      {
        say: { en: 'Tab also has symbols: h for a hammer-on, p for a pull-off, a slash for a slide, b for a bend, and x for a muted string.', he: 'בטאב יש גם סימנים: h להאמר־און, p לפול־אוף, לוכסן לסלייד, b לבנד, ו־x למיתר מושתק.' },
        show: { text: { en: 'h · p · / · b · x', he: 'h · p · / · b · x' } },
      },
      {
        say: { en: 'Common mistakes: reading the tab upside down, as if the top line were the low string; rushing the long notes; and playing out of tune because the guitar was never tuned. Tune first, then play slowly and in time.', he: 'טעויות נפוצות: לקרוא את הטאב הפוך, כאילו הקו העליון הוא המיתר הנמוך; למהר בצלילים הארוכים; ולנגן לא מכוון כי הגיטרה לא כוונה. קודם מכוונים, ואז מנגנים לאט ובזמן.' },
        show: { text: { en: 'top line = high E', he: 'קו עליון = מי גבוה' } },
      },
      {
        say: { en: 'To keep: lines are strings, numbers are frets, the top line is the high E. Tune, count in, and let each note ring for its full length.', he: 'לזכור: קווים הם מיתרים, מספרים הם סריגים, הקו העליון הוא מי הגבוה. מכוונים, סופרים, ונותנים לכל צליל לצלצל לכל אורכו.' },
        play: [countIn(55, 72)],
        show: { notes: [55], text: { en: 'tune · count · ring', he: 'כיוון · ספירה · צלצול' } },
      },
    ],
  },

  // ------------------------------------------------------------------ play: Echo Chain
  {
    id: 'game-echo',
    area: 'play',
    emoji: '🔗',
    title: { en: 'Echo Chain', he: 'שרשרת הד' },
    takeaway: { en: 'Remember the shape, not the letters: chunk the growing chain into small groups and sing or tap it back.', he: 'זוכרים את הצורה, לא את האותיות: מחלקים את השרשרת המתארכת לקבוצות קטנות ושרים או מקישים אותה בחזרה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Echo Chain is a memory game. I play a short melody and you repeat it. Every round the chain grows by one note.', he: 'היי {name}! שרשרת הד הוא משחק זיכרון. אני מנגן מנגינה קצרה ואתם חוזרים עליה. בכל סיבוב השרשרת גדלה בצליל אחד.' },
        play: [notes([60, 64], 0.6), rest(0.5), notes([60, 64, 62], 0.6), rest(0.5), notes([60, 64, 62, 67], 0.6)],
        show: { notes: [60, 64, 62, 67], text: { en: '+1 each round', he: '+1 בכל סיבוב' } },
      },
      {
        say: { en: 'The notes come from a few pads: 1, 2, 3 and 5 of the key. Learn their sound, and the chain gets easier to follow.', he: 'הצלילים מגיעים מכמה כפתורים: 1, 2, 3 ו־5 של הסולם. למדו את הצליל שלהם, והשרשרת תהיה קלה יותר למעקב.' },
        play: [notes([60, 62, 64, 67], 0.6)],
        show: { notes: [60, 62, 64, 67], key: 'C', text: { en: '1 2 3 5', he: '1 2 3 5' } },
      },
      {
        say: { en: 'Don\'t memorize letters. Remember the shape: up, a little down, a jump, back home.', he: 'אל תשננו אותיות. זכרו את הצורה: למעלה, קצת למטה, קפיצה, חזרה הביתה.' },
        play: [notes([60, 64, 62, 67, 60], 0.6)],
        show: { notes: [60, 64, 62, 67, 60], key: 'C', text: { en: '↗ ↘ ↗ ⌂', he: '↗ ↘ ↗ ⌂' } },
      },
      {
        say: { en: 'Group the chain in small chunks, like a phone number: three notes, a breath, three more.', he: 'חלקו את השרשרת לקבוצות קטנות, כמו מספר טלפון: שלושה צלילים, נשימה, ועוד שלושה.' },
        play: [notes([60, 62, 64], 0.5), rest(0.5), notes([67, 64, 60], 0.5)],
        show: { notes: [60, 62, 64, 67, 64, 60], key: 'C', text: { en: '1 2 3 · 5 3 1', he: '1 2 3 · 5 3 1' } },
      },
      {
        say: { en: 'Sing it back or tap the pads. When you sing, each note counts within 80 cents by default — almost a half step either way. You can tighten that in settings.', he: 'שירו בחזרה או הקישו על הכפתורים. בשירה, כל צליל נחשב בטווח של 80 סנט כברירת מחדל — כמעט חצי טון לכל כיוון. אפשר להדק את זה בהגדרות.' },
        play: [note(64, 1.4)],
        show: { notes: [64], text: { en: '± 80¢', he: '± 80¢' } },
      },
      {
        say: { en: 'Your turn: listen to the chain, then sing or tap it back. How long can you make it?', he: 'תורכם: הקשיבו לשרשרת, ואז שירו או הקישו אותה בחזרה. עד כמה ארוכה תצליחו להגיע?' },
        play: [notes([60, 64, 62], 0.6)],
        show: { notes: [60, 64, 62], key: 'C' },
      },
    ],
    more: [
      {
        say: { en: 'Echo Chain trains short-term musical memory: holding a sequence of pitches in mind and reproducing it. Most people hold only about four to seven items at once, so a long chain needs a strategy, not just effort.', he: 'שרשרת הד מאמנת זיכרון מוזיקלי לטווח קצר: להחזיק בראש רצף צלילים ולשחזר אותו. רוב האנשים מחזיקים רק בערך ארבעה עד שבעה פריטים בבת אחת, אז שרשרת ארוכה צריכה אסטרטגיה, לא רק מאמץ.' },
        play: [notes([60, 64, 62, 67, 64], 0.5)],
        show: { notes: [60, 64, 62, 67, 64], key: 'C', text: { en: '4–7 items', he: '4–7 פריטים' } },
      },
      {
        say: { en: 'Hear each pad as a scale degree. 1 is home and restful, 3 is bright, 5 is open and stable, 2 is a passing step that wants to move. Knowing their roles turns sounds into meaning.', he: 'שמעו כל כפתור כדרגה בסולם. 1 הוא הבית והמנוחה, 3 בהיר, 5 פתוח ויציב, 2 הוא צעד מעבר שרוצה לזוז. כשמכירים את התפקידים, הצלילים הופכים למשמעות.' },
        play: [notes([60, 62, 64, 67], 0.6)],
        show: { notes: [60, 62, 64, 67], key: 'C', text: { en: '1 2 3 5', he: '1 2 3 5' } },
      },
      {
        say: { en: 'Contour is the melody\'s shape: which way each move goes, and whether it steps or leaps. Hear 1, 3, 2, 5: up a skip, down a step, up a leap.', he: 'קו המתאר הוא צורת המנגינה: לאיזה כיוון כל תנועה הולכת, והאם היא צעד או קפיצה. הקשיבו ל־1, 3, 2, 5: דילוג למעלה, צעד למטה, קפיצה למעלה.' },
        play: [notes([60, 64, 62, 67], 0.6)],
        show: { notes: [60, 64, 62, 67], key: 'C', text: { en: '↗ ↘ ↗', he: '↗ ↘ ↗' } },
      },
      {
        say: { en: 'Chunking packs several notes into one unit. Group the chain in threes or fours, and notice patterns you already know, like 1 2 3 or the chord 1 3 5. Each familiar pattern takes the memory space of a single item.', he: 'חלוקה לקבוצות אורזת כמה צלילים ליחידה אחת. חלקו את השרשרת לשלשות או לרביעיות, ושימו לב לתבניות מוכרות, כמו 1 2 3 או האקורד 1 3 5. כל תבנית מוכרת תופסת בזיכרון מקום של פריט אחד.' },
        play: [notes([60, 62, 64], 0.45), rest(0.5), notes([67, 64, 60], 0.45)],
        show: { notes: [60, 62, 64, 67, 64, 60], key: 'C', text: { en: '1 2 3 · 5 3 1', he: '1 2 3 · 5 3 1' } },
      },
      {
        say: { en: 'While the chain plays, sing along silently in your head. Then, before you answer, replay it inside once, calmly.', he: 'בזמן שהשרשרת מתנגנת, שירו איתה בשקט בראש. ואז, לפני שאתם עונים, נגנו אותה בפנים פעם אחת, ברוגע.' },
        show: { text: { en: 'silent replay', he: 'חזרה שקטה בראש' } },
      },
      {
        say: { en: 'The common mistake is rushing: answering at once while the last notes are still fuzzy, or trying to remember the newest note on its own. Each round repeats the old chain, so rebuild it from the start every time.', he: 'הטעות הנפוצה היא למהר: לענות מיד כשהצלילים האחרונים עוד מטושטשים, או לנסות לזכור רק את הצליל החדש. כל סיבוב חוזר על השרשרת הישנה, אז בנו אותה מההתחלה בכל פעם.' },
        show: { text: { en: 'rebuild from the start', he: 'לבנות מההתחלה' } },
      },
      {
        say: { en: 'This is how musicians learn by ear: call and response in gospel and blues, a teacher singing a phrase for a student to copy, a band picking up a riff. To keep: degrees, contour, chunks and a silent replay.', he: 'ככה מוזיקאים לומדים בשמיעה: קריאה ותשובה בגוספל ובבלוז, מורה ששר משפט ותלמיד שמעתיק, להקה שלומדת ריף. לזכור: דרגות, קו מתאר, קבוצות וחזרה שקטה בראש.' },
        show: { text: { en: 'degrees · contour · chunks · replay', he: 'דרגות · קו מתאר · קבוצות · חזרה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ play: True or false?
  {
    id: 'game-truefalse',
    area: 'play',
    emoji: '⚖️',
    title: { en: 'Truth or Bluff', he: 'אמת או בלוף' },
    takeaway: { en: 'Read the whole statement, then hunt for the one detail that could be a bluff — bluffs are always a near miss.', he: 'קראו את כל המשפט, ואז חפשו את הפרט האחד שיכול להיות בלוף — בלוף הוא תמיד כמעט־נכון.' },
    steps: [
      {
        say: { en: 'Hi {name}! Truth or Bluff is music theory as a race. A statement appears — is it true, or a bluff? No sound needed, so you can play it anywhere.', he: 'היי {name}! אמת או בלוף זה תיאוריה במוזיקה כמרוץ. מופיע משפט — האם הוא אמת, או בלוף? לא צריך צלילים, אז אפשר לשחק בכל מקום.' },
        show: { text: { en: 'G major has one sharp — true or bluff?', he: 'ל־G מז׳ור יש דיאז אחד — אמת או בלוף?' } },
      },
      {
        say: { en: 'True! G major has one sharp, F sharp. Now this one: A C E is an A major triad. Bluff — C is a minor third above A, so it is A minor.', he: 'אמת! ל־G מז׳ור יש דיאז אחד, F דיאז. ועכשיו: A C E הוא משולש A מז׳ור. בלוף — C היא טרצה קטנה מעל A, אז זה A מינור.' },
        play: [notes([57, 60, 64], 0.5)],
        show: { notes: [57, 60, 64], text: { en: 'A C E = A minor', he: 'A C E = A מינור' } },
      },
      {
        say: { en: 'Bluffs are sneaky: always a near miss. One sharp too many, a minor third called major, the wrong relative minor. Check the one detail that matters.', he: 'הבלופים ערמומיים: תמיד כמעט־נכונים. דיאז אחד יותר מדי, טרצה קטנה שנקראת גדולה, המינור המקביל הלא נכון. בדקו את הפרט שקובע.' },
        play: [notes([57, 60], 0.7), rest(0.3), notes([57, 61], 0.7)],
        show: { notes: [57, 60, 61], text: { en: 'm3 ↔ M3 · 1♯ ↔ 2♯', he: 'm3 ↔ M3 · 1♯ ↔ 2♯' } },
      },
      {
        say: { en: 'Pick your topics — keys, intervals, chords, scales, rhythm, harmony, jazz, or the interval trios, also by ear — and a level: easy, medium or hard.', he: 'בחרו נושאים — סולמות, מרווחים, אקורדים, מקצב, הרמוניה, ג׳אז, או שלישיות המרווחים, גם בשמיעה — ורמה: קל, בינוני או קשה.' },
        play: [notes([60, 64], 0.8)],
        show: { notes: [60, 64], text: { en: 'easy · medium · hard', he: 'קל · בינוני · קשה' } },
      },
      {
        say: { en: 'Solo you have sixty seconds; streaks earn bonus points and a wrong answer costs two seconds — and shows you why. Or play a friend on this device, or online.', he: 'לבד יש לכם שישים שניות; רצפים מביאים בונוס, ותשובה שגויה עולה שתי שניות — ומראה לכם למה. או שחקו נגד חבר על המכשיר, או אונליין.' },
        show: { text: { en: '⏱ 60 s · ✗ = −2 s', he: '⏱ 60 שנ׳ · ✗ = ‎−2 שנ׳' } },
      },
      {
        say: { en: 'Your turn: read, think, and call it — truth or bluff. Fast, but not careless.', he: 'תורכם: קראו, חשבו והכריעו — אמת או בלוף. מהר, אבל לא ברשלנות.' },
        show: { text: { en: 'truth or bluff?', he: 'אמת או בלוף?' } },
      },
    ],
    more: [
      {
        say: { en: 'Truth or Bluff tests theory facts you can check in your head: key signatures, intervals, chords, scales and note values. Each statement has one detail that decides it; your job is to find that detail fast.', he: 'אמת או בלוף בודק עובדות תיאוריה שאפשר לבדוק בראש: סימני מפתח, מרווחים, אקורדים, סולמות וערכי תווים. בכל משפט יש פרט אחד שמכריע; התפקיד שלכם הוא למצוא אותו מהר.' },
        show: { text: { en: 'find the deciding detail', he: 'למצוא את הפרט המכריע' } },
      },
      {
        say: { en: 'Keys: the order of sharps is F, C, G, D, A, E, B, and each new sharp key is a fifth higher: G has one, D two, A three. Flats run the other way, B, E, A, D, G, C, F: F has one, B flat two.', he: 'סולמות: סדר הדיאזים הוא F, C, G, D, A, E, B, וכל סולם דיאזים חדש גבוה בקווינטה: ל־G יש אחד, ל־D שניים, ל־A שלושה. הבמולים בכיוון ההפוך, B, E, A, D, G, C, F: ל־F יש אחד, ל־B♭ שניים.' },
        play: [notes([55, 62, 69], 0.6)],
        show: { notes: [55, 62, 69], text: { en: 'G 1♯ → D 2♯ → A 3♯', he: 'G 1♯ ← D 2♯ ← A 3♯' } },
      },
      {
        say: { en: 'Intervals: count the letters for the number, then the half steps for the quality. C to E is a third with four half steps, so major; C to E flat has three, so minor. A bluff often keeps the number and swaps the quality.', he: 'מרווחים: סופרים אותיות בשביל המספר, וחצאי טון בשביל הסוג. C עד E זו טרצה עם ארבעה חצאי טון, אז גדולה; C עד E♭ — שלושה, אז קטנה. בלוף משאיר לעיתים קרובות את המספר ומחליף את הסוג.' },
        play: [notes([60, 64], 0.7), rest(0.3), notes([60, 63], 0.7)],
        show: { notes: [60, 63, 64], text: { en: 'M3 = 4 · m3 = 3', he: 'M3 = 4 · m3 = 3' } },
      },
      {
        say: { en: 'Chords: check the third, then the fifth. Major has a major third and a perfect fifth, minor a minor third and a perfect fifth, diminished a minor third and a diminished fifth, augmented a major third and an augmented fifth. A C E is minor; A C E flat is diminished.', he: 'אקורדים: בודקים את הטרצה, ואז את הקווינטה. במז׳ור טרצה גדולה וקווינטה זכה, במינור טרצה קטנה וקווינטה זכה, במוקטן טרצה קטנה וקווינטה מוקטנת, במוגדל טרצה גדולה וקווינטה מוגדלת. A C E הוא מינור; A C E♭ הוא מוקטן.' },
        play: [{ kind: 'chord', midis: [57, 60, 64], duration: 1.2 }, rest(0.3), { kind: 'chord', midis: [57, 60, 63], duration: 1.2 }],
        show: { notes: [57, 60, 63, 64], text: { en: 'Am · Adim', he: 'Am · Adim' } },
      },
      {
        say: { en: 'Relatives: every major key shares its signature with the minor key a minor third below. C major and A minor have no sharps or flats; G major and E minor share one sharp. A favorite bluff names the minor a major third below.', he: 'מקבילים: לכל סולם מז׳ור יש אותו סימן מפתח כמו למינור שנמצא טרצה קטנה מתחתיו. לדו מז׳ור וללה מינור אין דיאזים או במולים; סול מז׳ור ומי מינור חולקים דיאז אחד. בלוף אהוב הוא לתת את המינור שטרצה גדולה מתחת.' },
        show: { text: { en: 'C ↔ Am · G ↔ Em', he: 'C ↔ Am · G ↔ Em' } },
      },
      {
        say: { en: 'Strategy: read the whole statement before you answer, since the bluff can hide in the last word as easily as the first. If unsure, check the one deciding detail with a rule, then commit.', he: 'אסטרטגיה: קראו את כל המשפט לפני שאתם עונים, כי הבלוף יכול להסתתר במילה האחרונה בדיוק כמו בראשונה. אם אתם לא בטוחים, בדקו את הפרט המכריע לפי כלל — ואז הכריעו.' },
        show: { text: { en: 'read all · check one · commit', he: 'לקרוא הכול · לבדוק אחד · להכריע' } },
      },
      {
        say: { en: 'To keep: find the deciding detail, whether the number of sharps, the size of the third or the relative key, and check it with a rule, not a feeling.', he: 'לזכור: מוצאים את הפרט המכריע — מספר הדיאזים, גודל הטרצה או הסולם המקביל — ובודקים אותו לפי כלל, לא לפי תחושה.' },
        show: { text: { en: 'a rule, not a feeling', he: 'כלל, לא תחושה' } },
      },
    ],
  },
];
