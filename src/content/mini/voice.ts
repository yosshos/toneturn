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
        say: { en: 'Width is how far each wave swings, in cents. Pop voices keep it narrow, classical voices swing wider, but the centre always stays on the note.', he: 'הרוחב הוא כמה רחוק כל גל מתנדנד, בסנטים. בפופ הוא צר, בשירה קלאסית רחב יותר, אבל המרכז תמיד נשאר על הצליל.' },
        play: [note(60, 2)],
        show: { notes: [60], text: { en: 'centre = the note', he: 'המרכז = הצליל' } },
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
        say: { en: 'High notes need steady air, not more squeeze. Keep the jaw and neck loose and let the sound get lighter as you climb.', he: 'צלילים גבוהים צריכים אוויר יציב, לא עוד לחץ. השאירו את הלסת והצוואר משוחררים ותנו לצליל להתקל ככל שעולים.' },
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
        say: { en: 'The piano can only give you the two ends. I check that your slide is even, always moving one way, and lands right on the target.', he: 'הפסנתר נותן רק את שתי הקצוות. אני בודק שהגלישה אחידה, נעה תמיד לכיוון אחד ונוחתת בדיוק על היעד.' },
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
        show: { notes: [55, 59, 62], chord: true, text: { en: '🎧', he: '🎧' } },
      },
      {
        say: { en: 'Your turn: listen to the held note or the melody, then sing your part on "ah" — in tune, steady, and your own.', he: 'תורכם: הקשיבו לצליל המוחזק או למנגינה, ואז שירו את הקול שלכם על "אה" — מדויק, יציב, ושלכם.' },
        play: [{ kind: 'chord', midis: [55, 59], duration: 1.8 }],
        show: { notes: [55, 59] },
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
        say: { en: 'A mordent goes main, up, main — fast — then holds. The lower mordent dips below instead.', he: 'מורדנט הולך עיקרי, למעלה, עיקרי — מהר — ואז מחזיק. המורדנט התחתון יורד מתחת במקום.' },
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
        say: { en: 'Don\'t memorise letters. Remember the shape: up, a little down, a jump, back home.', he: 'אל תשננו אותיות. זכרו את הצורה: למעלה, קצת למטה, קפיצה, חזרה הביתה.' },
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
  },

  // ------------------------------------------------------------------ play: True or false?
  {
    id: 'game-truefalse',
    area: 'play',
    emoji: '⚖️',
    title: { en: 'True or false?', he: 'נכון או לא?' },
    takeaway: { en: 'Three notes, two interval labels: check both — the lies are only a half step off.', he: 'שלושה צלילים, שתי תוויות של מרווחים: בודקים את שתיהן — השקרים רחוקים רק בחצי טון.' },
    steps: [
      {
        say: { en: 'Hi {name}! True or false is a race against the clock. You get three notes and two interval labels, one for each step. Are both right?', he: 'היי {name}! נכון או לא הוא מרוץ נגד השעון. מקבלים שלושה צלילים ושתי תוויות של מרווחים, אחת לכל צעד. שתיהן נכונות?' },
        play: [notes([60, 64, 67], 0.75)],
        show: { notes: [60, 64, 67], text: { en: 'M3 · m3 ?', he: 'M3 · m3 ?' } },
      },
      {
        say: { en: 'C to E is a major third, and E to G a minor third. Both labels right: true!', he: 'מדו למי זו טרצה גדולה, וממי לסול טרצה קטנה. שתי התוויות נכונות: נכון!' },
        play: [notes([60, 64], 0.8), rest(0.3), notes([64, 67], 0.8)],
        show: { notes: [60, 64, 67], text: { en: 'M3 ✓ · m3 ✓', he: 'M3 ✓ · m3 ✓' } },
      },
      {
        say: { en: 'The lies are sneaky: only one label is wrong, and only by a half step. A minor third gets called major, or a fourth gets called a tritone.', he: 'השקרים ערמומיים: רק תווית אחת שגויה, ורק בחצי טון. טרצה קטנה נקראת גדולה, או קוורטה נקראת טריטון.' },
        play: [notes([60, 63], 0.8), rest(0.3), notes([60, 64], 0.8)],
        show: { notes: [60, 63, 64], text: { en: 'm3 ≠ M3', he: 'm3 ≠ M3' } },
      },
      {
        say: { en: 'So hear the size, then check the label. The fourth sounds open, the tritone tense, the fifth wide and stable.', he: 'אז שמעו את הגודל, ואז בדקו את התווית. הקוורטה נשמעת פתוחה, הטריטון מתוח, והקווינטה רחבה ויציבה.' },
        play: [notes([60, 65], 0.6), rest(0.3), notes([60, 66], 0.6), rest(0.3), notes([60, 67], 0.6)],
        show: { notes: [60, 65, 66, 67], text: { en: 'P4 · ♯4 · P5', he: 'P4 · ♯4 · P5' } },
      },
      {
        say: { en: 'You have sixty seconds. Every right answer scores, streaks earn bonus points, and a wrong answer costs two seconds.', he: 'יש לכם שישים שניות. כל תשובה נכונה מזכה בנקודות, רצפים מביאים בונוס, ותשובה שגויה עולה שתי שניות.' },
        show: { text: { en: '⏱ 60 s · ✗ = −2 s', he: '⏱ 60 שנ׳ · ✗ = ‎−2 שנ׳' } },
      },
      {
        say: { en: 'Your turn: look, listen, and answer true or false. Fast, but not careless — a lie hides in just one half step.', he: 'תורכם: הסתכלו, הקשיבו וענו נכון או לא. מהר, אבל לא ברשלנות — השקר מסתתר בחצי טון אחד.' },
        play: [notes([60, 65, 69], 0.7)],
        show: { notes: [60, 65, 69], text: { en: 'P4 · M3 ?', he: 'P4 · M3 ?' } },
      },
    ],
  },
];
