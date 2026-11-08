// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Rhythm: reading levels R1–R8 (src/engine/rhythm.ts), the rhythm topics (src/engine/topicsEar.ts),
// the inner-clock drill (src/engine/perform.ts) and Beat Echo (src/game/memoryGame.ts).

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** A rhythm on one pitch after a one-bar count-in (keys as in rhythmFromKey: "q.ee.h", "m3:…", "m6:…", "sw:…"). */
const R = (rhythm: string, bpm: number, bars = 1): Stimulus => ({ kind: 'rhythm', rhythm, bars, bpm });
const evs = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });

// Same sounds as the topic generators in src/engine/topicsEar.ts.
const DUM = 43;
const TEK = 79;
/** D dum, T tek, - rest on a grid of `step` seconds, repeated. */
function drum(pattern: string, step: number, times: number): Stimulus {
  const ev: NoteEvent[] = [];
  const p = pattern.replace(/\s/g, '');
  for (let r = 0; r < times; r++)
    p.split('').forEach((ch, i) => {
      const t = (r * p.length + i) * step;
      if (ch === 'D') ev.push({ midi: DUM, start: t, duration: 0.18, velocity: 0.9, perc: 'kick' });
      if (ch === 'T') ev.push({ midi: TEK, start: t, duration: 0.06, velocity: 0.7, perc: 'snare-soft' });
    });
  return evs(ev, p.length * times * step + 0.2);
}
/** `a` high clicks against `b` low notes in each cycle. */
function poly(a: number, b: number, cycle: number, times: number): Stimulus {
  const ev: NoteEvent[] = [];
  for (let r = 0; r < times; r++) {
    for (let i = 0; i < a; i++) ev.push({ midi: 84, start: r * cycle + (i * cycle) / a, duration: 0.05, velocity: i ? 0.55 : 0.8, perc: 'snare-soft' });
    for (let i = 0; i < b; i++) ev.push({ midi: 45, start: r * cycle + (i * cycle) / b, duration: 0.12, velocity: i ? 0.7 : 0.9, perc: 'kick' });
  }
  return evs(ev, cycle * times + 0.2);
}
/** Eighth-note ticks with a low accent at each group start (stronger on the downbeat). */
function meter(groups: number[], bars: number, step = 0.17): Stimulus {
  const ev: NoteEvent[] = [];
  const len = groups.reduce((a, b) => a + b, 0);
  for (let b = 0; b < bars; b++) {
    let i = 0;
    groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++, i++) {
        const t = (b * len + i) * step;
        if (k === 0) ev.push({ midi: gi === 0 ? 45 : 50, start: t, duration: 0.12, velocity: gi === 0 ? 0.9 : 0.7, perc: gi === 0 ? 'kick' : 'snare-soft' });
        ev.push({ midi: 84, start: t, duration: 0.04, velocity: k === 0 ? 0.8 : 0.5, perc: 'hat' });
      }
    });
  }
  return evs(ev, bars * len * step + 0.2);
}
/** Eighth pairs at a long:short ratio over a bass note on each beat. */
function swing(ratio: number, bpm: number, beats: number): Stimulus {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  const long = (beat * ratio) / (ratio + 1);
  for (let b = 0; b < beats; b++) {
    const t = b * beat;
    ev.push({ midi: 41 + (b % 4 === 0 ? 0 : 5), start: t, duration: beat * 0.8, velocity: 0.6 });
    ev.push({ midi: 82, start: t, duration: 0.05, velocity: 0.55 });
    ev.push({ midi: 82, start: t + long, duration: 0.05, velocity: 0.4 });
  }
  return evs(ev, beats * beat + 0.2);
}
/** Inner-clock drill sound (as clockEvents): `audible` beats click; optional taps on a woodblock. */
function clock(bpm: number, audible: number[], total: number, taps: number[] = []): Stimulus {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = audible.map((i) => ({ midi: i % 4 === 0 ? 96 : 91, start: i * beat, duration: 0.05, velocity: i % 4 === 0 ? 0.6 : 0.45 }));
  for (const t of taps) ev.push({ midi: 84, start: t, duration: 0.05, velocity: 0.6, perc: 'snare' });
  return evs(ev, total * beat + 0.3);
}
/** Beat Echo turn (as rhythmTimeline): 4 count-in clicks, the pattern on a woodblock over a soft pulse, then optionally the 4-click answer count-in and the gap to answer in. */
function echo(onsets: number[], beats: number, bpm: number, answer: boolean): Stimulus {
  const b = 60 / bpm;
  const ev: NoteEvent[] = [];
  const click = (t: number, accent: boolean) => ev.push({ midi: 96, start: t, duration: 0.05, velocity: accent ? 0.5 : 0.3, perc: accent ? 'accent' : 'click' });
  for (let i = 0; i < 4; i++) click(i * b, i === 0);
  for (let i = 0; i < beats; i++) click((4 + i) * b, false);
  for (const o of onsets) ev.push({ midi: 84, start: (4 + o) * b, duration: 0.05, velocity: 0.7, perc: 'snare' });
  if (answer) for (let i = 0; i < 4; i++) click((4 + beats + i) * b, i === 0);
  return evs(ev, (answer ? 8 + 2 * beats : 4 + beats) * b + 0.3);
}

const IQA = {
  maqsum: 'DT-TD-T-',
  baladi: 'DD-TD-T-',
  saidi: 'DT-DD-T-',
  malfuf: 'D--T--T-',
  samai: 'D--T-DDT--',
  karsilama: 'D-T-D-TTT',
};

// Rushing in the silence: on time with the click, then each tap 40 ms early, so the gap grows.
const RUSH_BPM = 96;
const rushTaps = Array.from({ length: 12 }, (_, i) => (i < 4 ? i * (60 / RUSH_BPM) : 3 * (60 / RUSH_BPM) + (i - 3) * (60 / RUSH_BPM - 0.04)));
// Dragging, the mirror image: each tap after the click stops lands 30 ms later than the last.
const dragTaps = Array.from({ length: 12 }, (_, i) => (i < 4 ? i * (60 / RUSH_BPM) : 3 * (60 / RUSH_BPM) + (i - 3) * (60 / RUSH_BPM + 0.03)));

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ R1
  {
    id: 'rhythm-r1',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Quarters, halves and rests', he: 'רבעים, חצאים והפסקות' },
    takeaway: { en: 'A quarter lasts one beat, a half two, a whole four; a rest is a counted beat of silence.', he: 'רבע נמשך פעמה אחת, חצי שתיים, שלם ארבע; הפסקה היא פעמה של שקט שסופרים אותה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Rhythm lives on the beat — a steady pulse, like a heartbeat. Count along with the clicks: 1, 2, 3, 4.', he: 'היי {name}! קצב חי על הפעמה — דופק קבוע, כמו לב. ספרו יחד עם הקליקים: 1, 2, 3, 4.' },
        play: [clock(70, [0, 1, 2, 3, 4, 5, 6, 7], 8)],
        show: { text: { en: '1  2  3  4', he: '1  2  3  4' } },
      },
      {
        say: { en: 'A quarter note lasts exactly one beat. Say "ta" on each one.', he: 'רבע נמשך בדיוק פעמה אחת. אמרו "טה" על כל אחד.' },
        play: [R('q.q.q.q', 70)],
        show: { text: { en: '♩ ♩ ♩ ♩  ·  ta ta ta ta', he: '♩ ♩ ♩ ♩  ·  טה טה טה טה' } },
      },
      {
        say: { en: 'A half note lasts two beats: ta-a. You play it once and let it ring through the next beat.', he: 'חצי נמשך שתי פעמות: טה-אה. מנגנים אותו פעם אחת ונותנים לו להתמשך גם על הפעמה הבאה.' },
        play: [R('q.q.h', 70)],
        show: { text: { en: '♩ ♩ 𝅗𝅥  ·  ta ta ta-a', he: '♩ ♩ 𝅗𝅥  ·  טה טה טה-אה' } },
      },
      {
        say: { en: 'A whole note fills all four beats: ta-a-a-a. One sound, a long ride.', he: 'שלם ממלא את כל ארבע הפעמות: טה-אה-אה-אה. צליל אחד, נסיעה ארוכה.' },
        play: [R('w', 70)],
        show: { text: { en: '𝅝  ·  ta-a-a-a', he: '𝅝  ·  טה-אה-אה-אה' } },
      },
      {
        say: { en: 'A rest is a beat of silence. You still count it — you just don\'t play. Whisper "sh" in its place.', he: 'הפסקה היא פעמה של שקט. עדיין סופרים אותה — פשוט לא מנגנים. לחשו "שְׁ" במקומה.' },
        play: [R('q.qr.q.qr', 70)],
        show: { text: { en: '♩ 𝄽 ♩ 𝄽  ·  ta sh ta sh', he: '♩ 𝄽 ♩ 𝄽  ·  טה שְׁ טה שְׁ' } },
      },
      {
        say: { en: 'When you tap, hold your finger down on long notes, for their full length. The app checks that too.', he: 'כשאתם מקישים, החזיקו את האצבע לחוצה על צלילים ארוכים, לכל האורך שלהם. האפליקציה בודקת גם את זה.' },
        play: [R('h.q.q', 70)],
        show: { text: { en: '𝅗𝅥 = hold for 2', he: '𝅗𝅥 = מחזיקים 2' } },
      },
      {
        say: { en: 'Your turn! After the count-in, tap the pad or press Space on every note you read. Then hear a bar and pick the notation that matches.', he: 'תורכם! אחרי הספירה, הקישו על הכפתור או על רווח בכל תו שאתם קוראים. אחר כך שמעו תיבה ובחרו את התווים שמתאימים לה.' },
        show: { text: { en: '♩ = 1   𝅗𝅥 = 2   𝅝 = 4   𝄽 = sh', he: '♩ = 1   𝅗𝅥 = 2   𝅝 = 4   𝄽 = שְׁ' } },
      },
    ],
    more: [
      {
        say: { en: 'Note values are relative, not fixed times. A quarter note is one beat at whatever tempo is set, measured in beats per minute (BPM). The same bar at 72, then at 108 BPM: the rhythm stays the same, only the clock changes.', he: 'ערכי התווים יחסיים, לא זמנים קבועים. רבע הוא פעמה אחת בכל קצב שנקבע, והקצב נמדד בפעמות לדקה (BPM). אותה תיבה ב־72 ואז ב־108 BPM: המקצב זהה, רק השעון משתנה.' },
        play: [R('q.q.h', 72), R('q.q.h', 108)],
        show: { text: { en: '♩ ♩ 𝅗𝅥  ·  72 → 108 BPM', he: '♩ ♩ 𝅗𝅥  ·  72 ← 108 BPM' } },
      },
      {
        say: { en: 'The time signature 4/4 says: four beats in each bar, and a quarter note gets one beat. Bar lines split the music into these four-beat boxes, and beat 1 of each bar is the strongest.', he: 'המשקל 4/4 אומר: ארבע פעמות בכל תיבה, ורבע מקבל פעמה אחת. קווי התיבה מחלקים את המוזיקה לקופסאות של ארבע פעמות, ופעמה 1 בכל תיבה היא החזקה ביותר.' },
        play: [R('h.q.q', 80)],
        show: { text: { en: '4/4  ·  | 1 2 3 4 |', he: '4/4  ·  | 1 2 3 4 |' } },
      },
      {
        say: { en: 'Every note value has a matching rest. A quarter rest is the squiggle. A half rest is a small block sitting on the middle line; a whole rest hangs below the fourth line, and it also means a whole silent bar in any meter.', he: 'לכל ערך תו יש הפסקה מקבילה. הפסקת רבע היא הסלסול. הפסקת חצי היא מלבן קטן שיושב על הקו האמצעי; הפסקת שלם תלויה מתחת לקו הרביעי, והיא גם מסמנת תיבה שלמה של שקט בכל משקל.' },
        show: { text: { en: '𝄽 = 1   𝄼 = 2   𝄻 = 4', he: '𝄽 = 1   𝄼 = 2   𝄻 = 4' } },
      },
      {
        say: { en: 'To read a rhythm by ear, follow the beat and ask one question: on which beats does a new sound start? Here, on 1 and 4. Beat 2 is still ringing, beat 3 is silent. A note lasts until the next start or rest.', he: 'כדי לקרוא מקצב בשמיעה, עקבו אחרי הפעמה ושאלו שאלה אחת: על אילו פעמות מתחיל צליל חדש? כאן, על 1 ועל 4. פעמה 2 עדיין מתמשכת, פעמה 3 שקטה. צליל נמשך עד ההתחלה הבאה או עד ההפסקה.' },
        play: [R('h.qr.q', 76)],
        show: { text: { en: '𝅗𝅥 𝄽 ♩  ·  1 (2) sh 4', he: '𝅗𝅥 𝄽 ♩  ·  1 (2) שְׁ 4' } },
      },
      {
        say: { en: 'To perform it, count out loud, 1, 2, 3, 4, and clap only where a note starts. On a half note, keep your hand moving through the second beat, so the length is felt, not guessed. Start slowly, around 60 to 70 BPM.', he: 'כדי לבצע, ספרו בקול, 1, 2, 3, 4, ומחאו כף רק איפה שתו מתחיל. על חצי, המשיכו להזיז את היד דרך הפעמה השנייה, כך שהאורך מורגש ולא מנוחש. התחילו לאט, בסביבות 60 עד 70 BPM.' },
      },
      {
        say: { en: 'The common mistakes: cutting long notes short, and hurrying through rests to reach the next note. A rest lasts exactly as long as the note it replaces. Hear two rests held honestly.', he: 'הטעויות הנפוצות: לקצר צלילים ארוכים, ולמהר דרך ההפסקות כדי להגיע לתו הבא. הפסקה נמשכת בדיוק כמו התו שהיא מחליפה. שמעו שתי הפסקות שמוחזקות ביושר.' },
        play: [R('q.qr.qr.q', 72)],
        show: { text: { en: 'ta sh sh ta', he: 'טה שְׁ שְׁ טה' } },
      },
      {
        say: { en: 'In real music, quarters often carry a walking bass line or a steady strum, while halves and wholes hold the long notes of hymns, chorales and sustained pads under a band. Rests give phrases room to breathe.', he: 'במוזיקה אמיתית, רבעים נושאים לעתים קרובות קו בס מהלך או פריטה יציבה, וחצאים ושלמים מחזיקים את הצלילים הארוכים של מזמורים, כוראלים ומשטחי צליל מתמשכים מתחת ללהקה. ההפסקות נותנות למשפטים מקום לנשום.' },
      },
      {
        say: { en: 'To keep: the beat is the ruler. Quarter = 1, half = 2, whole = 4, and each rest lasts exactly as long as its note.', he: 'לזכור: הפעמה היא הסרגל. רבע = 1, חצי = 2, שלם = 4, וכל הפסקה נמשכת בדיוק כמו התו שלה.' },
        show: { text: { en: '♩ 1 · 𝅗𝅥 2 · 𝅝 4', he: '♩ 1 · 𝅗𝅥 2 · 𝅝 4' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R2
  {
    id: 'rhythm-r2',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Eighth notes', he: 'שמיניות' },
    takeaway: { en: 'Two eighth notes share one beat equally: ti-ti, counted "1 &".', he: 'שתי שמיניות חולקות פעמה אחת שווה בשווה: טי-טי, סופרים "1 ו".' },
    steps: [
      {
        say: { en: 'Hi {name}! Split one beat into two equal halves and you get two eighth notes. We say ti-ti.', he: 'היי {name}! מחלקים פעמה אחת לשני חצאים שווים ומקבלים שתי שמיניות. אומרים טי-טי.' },
        play: [R('ee.ee.ee.ee', 76)],
        show: { text: { en: '♫ ♫ ♫ ♫  ·  ti-ti ti-ti ti-ti ti-ti', he: '♫ ♫ ♫ ♫  ·  טי-טי טי-טי טי-טי טי-טי' } },
      },
      {
        say: { en: 'Count them with "and". The numbers sit on the beat; each "and" falls exactly halfway to the next one.', he: 'סופרים אותן עם "ו". המספרים יושבים על הפעמה; כל "ו" נופל בדיוק באמצע הדרך לפעמה הבאה.' },
        play: [R('ee.q.ee.q', 76)],
        show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 ו 2 ו 3 ו 4 ו' } },
      },
      {
        say: { en: 'Two eighths take the same time as one quarter. Listen: ta, then ti-ti — same beat, twice as busy.', he: 'שתי שמיניות לוקחות בדיוק את הזמן של רבע אחד. הקשיבו: טה, ואז טי-טי — אותה פעמה, פי שניים עסוקה.' },
        play: [R('q.ee.q.ee', 76)],
        show: { text: { en: '♩ ♫ ♩ ♫  ·  ta ti-ti ta ti-ti', he: '♩ ♫ ♩ ♫  ·  טה טי-טי טה טי-טי' } },
      },
      {
        say: { en: 'Now mixed with a half note: ti-ti, ta, ta-a. Feel the gears shift from fast to slow.', he: 'עכשיו בשילוב עם חצי: טי-טי, טה, טה-אה. הרגישו איך ההילוך עובר ממהיר לאיטי.' },
        play: [R('ee.q.h', 76)],
        show: { text: { en: '♫ ♩ 𝅗𝅥  ·  ti-ti ta ta-a', he: '♫ ♩ 𝅗𝅥  ·  טי-טי טה טה-אה' } },
      },
      {
        say: { en: 'The usual slip is rushing the second eighth. Keep both halves even — the two "ti"s are twins.', he: 'הטעות הנפוצה היא למהר עם השמינית השנייה. שמרו על שני החצאים שווים — שני ה"טי" הם תאומים.' },
        play: [R('ee.ee.q.q', 76)],
        show: { text: { en: 'ti = ti', he: 'טי = טי' } },
      },
      {
        say: { en: 'Your turn! Tap every note you read after the count-in — two even taps for ti-ti. Then hear a bar and choose it, or just say it: "ta ti-ti ta ta".', he: 'תורכם! הקישו על כל תו שאתם קוראים אחרי הספירה — שתי הקשות שוות לטי-טי. אחר כך שמעו תיבה ובחרו אותה, או פשוט אמרו: "טה טי-טי טה טה".' },
        show: { text: { en: '♫ = ti-ti = 1 beat', he: '♫ = טי-טי = פעמה אחת' } },
      },
    ],
    more: [
      {
        say: { en: 'An eighth note is exactly half a quarter, so a 4/4 bar holds eight of them. Alone, an eighth has a flag. In groups, the flags join into a beam, and the beams usually show where each beat begins.', he: 'שמינית היא בדיוק חצי רבע, ולכן תיבה של 4/4 מכילה שמונה כאלה. לבד, לשמינית יש דגל. בקבוצה, הדגלים מתחברים לקורה, והקורות בדרך כלל מראות איפה מתחילה כל פעמה.' },
        show: { text: { en: '♪ + ♪ = ♫ = ♩', he: '♪ + ♪ = ♫ = ♩' } },
      },
      {
        say: { en: 'The numbers are the beats themselves; the "ands" are the off-beats. Hear a bar of steady eighths: the beat keeps the same speed, you simply hear its halfway points as well.', he: 'המספרים הם הפעמות עצמן; ה"ו" הם האוף־ביט, הנקודות שבין הפעמות. שמעו תיבה של שמיניות רצופות: הפעמה שומרת על אותה מהירות, פשוט שומעים גם את נקודות האמצע שלה.' },
        play: [R('ee.ee.ee.ee', 80)],
        show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 ו 2 ו 3 ו 4 ו' } },
      },
      {
        say: { en: 'Listening strategy: keep a silent "1 & 2 &" grid running, then mark which slots have a sound. In this bar: 1, &, 2, 3, 4, & — two eighths, two quarters, two eighths.', he: 'אסטרטגיית האזנה: הריצו בראש רשת שקטה של "1 ו 2 ו", וסמנו באילו משבצות יש צליל. בתיבה הזאת: 1, ו, 2, 3, 4, ו — שתי שמיניות, שני רבעים, שתי שמיניות.' },
        play: [R('ee.q.q.ee', 80)],
        show: { text: { en: '1 & 2 · 3 · 4 &', he: '1 ו 2 · 3 · 4 ו' } },
      },
      {
        say: { en: 'To perform: tap the beat with your foot and the eighths with your hand, two hand taps for each foot tap. Say the counts aloud. When it feels easy, drop the counting and let the foot carry the beat.', he: 'לביצוע: הקישו את הפעמה ברגל ואת השמיניות ביד, שתי הקשות יד על כל הקשת רגל. אמרו את הספירה בקול. כשזה נהיה קל, וותרו על הספירה ותנו לרגל לשאת את הפעמה.' },
      },
      {
        say: { en: 'The classic mistake is speeding up when the eighths arrive, as if busier meant faster. It does not: the beat must stay exactly where it was. Listen — a half note, then eighths, on the same pulse.', he: 'הטעות הקלאסית היא להאיץ כשמגיעות השמיניות, כאילו עמוס יותר אומר מהר יותר. זה לא כך: הפעמה חייבת להישאר בדיוק איפה שהייתה. הקשיבו — חצי, ואז שמיניות, על אותו דופק.' },
        play: [R('h.ee.ee', 80)],
        show: { text: { en: 'busier ≠ faster', he: 'עמוס יותר ≠ מהר יותר' } },
      },
      {
        say: { en: 'Steady eighths are everywhere: the hi-hat in most rock and pop drumming, driving bass lines, strummed guitar. In jazz the same written eighths are played long-short — that is swing, which comes later in the path.', he: 'שמיניות רצופות נמצאות בכל מקום: ההיי־האט ברוב תיפוף הרוק והפופ, קווי בס דוחפים, גיטרה בפריטה. בג׳אז אותן שמיניות כתובות מנוגנות ארוך-קצר — זה הסווינג, שמגיע בהמשך המסלול.' },
      },
      {
        say: { en: 'To keep: two eighths equal one quarter. Count "1 & 2 &", keep both halves even, and never let the beat speed up.', he: 'לזכור: שתי שמיניות שוות לרבע אחד. סופרים "1 ו 2 ו", שומרים על שני החצאים שווים, ולא נותנים לפעמה להאיץ.' },
        show: { text: { en: '♫ = ♩', he: '♫ = ♩' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R3
  {
    id: 'rhythm-r3',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'The dotted quarter', he: 'הרבע המנוקד' },
    takeaway: { en: 'A dot adds half the note\'s length: a dotted quarter is 1½ beats, usually followed by an eighth (ta-i ti).', he: 'נקודה מוסיפה חצי מאורך התו: רבע מנוקד הוא פעמה וחצי, ובדרך כלל אחריו שמינית (טה-אי טי).' },
    steps: [
      {
        say: { en: 'Hey {name}! A dot after a note adds half its length. A quarter is one beat, so a dotted quarter lasts one and a half.', he: 'היי {name}! נקודה אחרי תו מוסיפה חצי מהאורך שלו. רבע הוא פעמה אחת, אז רבע מנוקד נמשך פעמה וחצי.' },
        play: [R('dqe.h', 80)],
        show: { text: { en: '♩. = 1 + ½ beat', he: '♩. = 1 + ½ פעמה' } },
      },
      {
        say: { en: 'It almost always brings an eighth along, so together they fill two beats: long, short. We say ta-i ti.', he: 'כמעט תמיד באה איתו שמינית, וביחד הן ממלאות שתי פעמות: ארוך, קצר. אומרים טה-אי טי.' },
        play: [R('dqe.dqe', 80)],
        show: { text: { en: '♩. ♪  ·  ta-i ti', he: '♩. ♪  ·  טה-אי טי' } },
      },
      {
        say: { en: 'Count it: the long note starts on 1 and holds right through 2. The eighth lands on the "and" of 2.', he: 'ספרו: הצליל הארוך מתחיל על 1 ונמשך גם דרך 2. השמינית נוחתת על ה"ו" של 2.' },
        play: [R('dqe.q.q', 80)],
        show: { text: { en: '1 (& 2) &  ·  ta-i ti', he: '1 (ו 2) ו  ·  טה-אי טי' } },
      },
      {
        say: { en: 'Compare: two quarters, then the dotted pair. Same two beats — but the second note moves later, onto the "and".', he: 'השוו: שני רבעים, ואז הזוג המנוקד. אותן שתי פעמות — אבל הצליל השני זז מאוחר יותר, אל ה"ו".' },
        play: [R('q.q.dqe', 80)],
        show: { text: { en: 'ta ta  |  ta-i ti', he: 'טה טה  |  טה-אי טי' } },
      },
      {
        say: { en: 'That long-short gives a tune a little skip forward. Hear it mixed with eighths.', he: 'הארוך-קצר הזה נותן למנגינה קפיצה קטנה קדימה. שמעו אותו בשילוב עם שמיניות.' },
        play: [R('dqe.ee.q', 80)],
        show: { text: { en: 'ta-i ti  ti-ti  ta', he: 'טה-אי טי  טי-טי  טה' } },
      },
      {
        say: { en: 'Your turn! Tap what you read: hold the long note, then a quick tap on the "and". Then hear a bar and pick its notation.', he: 'תורכם! הקישו את מה שאתם קוראים: החזיקו את הצליל הארוך, ואז הקשה קצרה על ה"ו". אחר כך שמעו תיבה ובחרו את התווים שלה.' },
        show: { text: { en: '♩. ♪ = 1½ + ½', he: '♩. ♪ = 1½ + ½' } },
      },
    ],
    more: [
      {
        say: { en: 'The dot rule works on any note: it adds half of the note\'s own value. A dotted half is 2 + 1 = 3 beats. A dotted quarter is 1 + ½ = 1½. A dotted eighth is ½ + ¼ = ¾ of a beat.', he: 'חוק הנקודה עובד על כל תו: הוא מוסיף חצי מהערך של התו עצמו. חצי מנוקד הוא 2 + 1 = 3 פעמות. רבע מנוקד הוא 1 + ½ = 1½. שמינית מנוקדת היא ½ + ¼ = ¾ פעמה.' },
        show: { text: { en: '𝅗𝅥. = 3   ♩. = 1½   ♪. = ¾', he: '𝅗𝅥. = 3   ♩. = 1½   ♪. = ¾' } },
      },
      {
        say: { en: 'A dotted quarter sounds exactly like a quarter tied to an eighth: the tie joins them into one held note. The dot is just a shorter way to write it. Hear the pair twice.', he: 'רבע מנוקד נשמע בדיוק כמו רבע שקשור בליגטורה לשמינית: הליגטורה מחברת אותם לצליל אחד מוחזק. הנקודה היא פשוט דרך קצרה יותר לכתוב את זה. שמעו את הזוג פעמיים.' },
        play: [R('dqe.dqe', 80)],
        show: { text: { en: '♩. = ♩‿♪', he: '♩. = ♩‿♪' } },
      },
      {
        say: { en: 'Compare ta ti-ti with ta-i ti. Both last two beats and both end on the "and" of the second beat. The only difference: in the dotted version, nothing new happens on that second beat.', he: 'השוו טה טי-טי לטה-אי טי. שתיהן נמשכות שתי פעמות ושתיהן נגמרות על ה"ו" של הפעמה השנייה. ההבדל היחיד: בגרסה המנוקדת, שום דבר חדש לא קורה על הפעמה השנייה.' },
        play: [R('q.ee.dqe', 80)],
        show: { text: { en: 'ta ti-ti  |  ta-i ti', he: 'טה טי-טי  |  טה-אי טי' } },
      },
      {
        say: { en: 'The secret is subdividing. Count eighths: "1 & 2 &". Start the long note on 1, hold it through "& 2", and play the short one on the last "&". The pair can start on any beat — here it begins on beat 2.', he: 'הסוד הוא חלוקה פנימית. ספרו שמיניות: "1 ו 2 ו". התחילו את הצליל הארוך על 1, החזיקו אותו דרך "ו 2", ונגנו את הקצר על ה"ו" האחרון. הזוג יכול להתחיל בכל פעמה — כאן הוא מתחיל על פעמה 2.' },
        play: [R('q.dqe.q', 80)],
        show: { text: { en: 'ta  ta-i ti  ta', he: 'טה  טה-אי טי  טה' } },
      },
      {
        say: { en: 'The usual mistake is playing the eighth too early, right on the beat, which turns ta-i ti into two plain quarters. The opposite slip is confusing it with a dotted eighth and sixteenth, a much tighter skip inside a single beat.', he: 'הטעות הרגילה היא לנגן את השמינית מוקדם מדי, בדיוק על הפעמה, וכך טה-אי טי הופך לשני רבעים רגילים. הטעות ההפוכה היא לבלבל אותו עם שמינית מנוקדת ושש־עשרית, קפיצה צפופה הרבה יותר בתוך פעמה אחת.' },
      },
      {
        say: { en: 'Two dotted quarters and a quarter make 3 + 3 + 2 eighths: the tresillo. It is the backbone of Cuban music, of reggaeton and of countless pop grooves. Hear it on a low drum.', he: 'שני רבעים מנוקדים ורבע יוצרים 3 + 3 + 2 שמיניות: הטרסיו (tresillo). זה עמוד השדרה של המוזיקה הקובנית, של הרגאטון ושל אינספור גרוב בפופ. שמעו אותו על תוף נמוך.' },
        play: [drum('D--D--D-', 0.19, 3)],
        show: { text: { en: '♩. ♩. ♩  =  3 + 3 + 2', he: '♩. ♩. ♩  =  3 + 3 + 2' } },
      },
      {
        say: { en: 'To keep: a dot adds half. A dotted quarter is 1½ beats, and the eighth after it lands on an "and".', he: 'לזכור: נקודה מוסיפה חצי. רבע מנוקד הוא פעמה וחצי, והשמינית שאחריו נוחתת על "ו".' },
        show: { text: { en: '♩. ♪ = 1½ + ½', he: '♩. ♪ = 1½ + ½' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R4
  {
    id: 'rhythm-r4',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Sixteenth notes', he: 'שש־עשריות' },
    takeaway: { en: 'Four sixteenths fill one beat (tika-tika); glue two into an eighth for ti tika or tika ti.', he: 'ארבע שש־עשריות ממלאות פעמה אחת (טיקה-טיקה); מדביקים שתיים לשמינית ומקבלים טי טיקה או טיקה טי.' },
    steps: [
      {
        say: { en: 'Hi {name}! Split one beat into four equal parts and you get sixteenth notes. We say tika-tika.', he: 'היי {name}! מחלקים פעמה אחת לארבעה חלקים שווים ומקבלים שש־עשריות. אומרים טיקה-טיקה.' },
        play: [R('ssss.q.ssss.q', 66)],
        show: { text: { en: '♬♬ ♩ ♬♬ ♩  ·  tika-tika ta', he: '♬♬ ♩ ♬♬ ♩  ·  טיקה-טיקה טה' } },
      },
      {
        say: { en: 'Glue the first two together into one eighth and you get ti tika: long, short, short.', he: 'מדביקים את שתי הראשונות לשמינית אחת ומקבלים טי טיקה: ארוך, קצר, קצר.' },
        play: [R('es.es.h', 66)],
        show: { text: { en: '♪ ♬  ·  ti tika', he: '♪ ♬  ·  טי טיקה' } },
      },
      {
        say: { en: 'Glue the last two instead and it flips: tika ti — short, short, long.', he: 'מדביקים במקום זה את שתי האחרונות וזה מתהפך: טיקה טי — קצר, קצר, ארוך.' },
        play: [R('se.se.h', 66)],
        show: { text: { en: '♬ ♪  ·  tika ti', he: '♬ ♪  ·  טיקה טי' } },
      },
      {
        say: { en: 'All three in a row. Listen for where the quick pair sits: at the start of the beat, or at the end?', he: 'שלושתם ברצף. הקשיבו איפה יושב הזוג המהיר: בתחילת הפעמה, או בסוף?' },
        play: [R('ssss.es.se.q', 66)],
        show: { text: { en: 'tika-tika  ti tika  tika ti  ta', he: 'טיקה-טיקה  טי טיקה  טיקה טי  טה' } },
      },
      {
        say: { en: 'Keep the beat slow and steady in your body. The sixteenths are tiny steps inside it — they never push it faster.', he: 'שמרו על פעמה איטית ויציבה בגוף. השש־עשריות הן צעדים קטנים בתוכה — הן אף פעם לא מאיצות אותה.' },
        play: [R('q.ssss.q.ssss', 66)],
        show: { text: { en: '1 beat = 4 × ♬', he: 'פעמה = 4 שש־עשריות' } },
      },
      {
        say: { en: 'Your turn! Tap what you read, then hear a bar and choose it. In the last round you build the bar yourself from blocks: tika-tika, ti tika, tika ti.', he: 'תורכם! הקישו את מה שאתם קוראים, ואז שמעו תיבה ובחרו אותה. בסיבוב האחרון אתם בונים את התיבה בעצמכם מקוביות: טיקה-טיקה, טי טיקה, טיקה טי.' },
        show: { text: { en: 'tika-tika · ti tika · tika ti', he: 'טיקה-טיקה · טי טיקה · טיקה טי' } },
      },
    ],
    more: [
      {
        say: { en: 'A sixteenth note is half an eighth: four per beat, sixteen in a 4/4 bar. It has two flags, or two beams in a group. Musicians count them "1 e & a, 2 e & a", with the "&" still exactly halfway.', he: 'שש־עשרית היא חצי שמינית: ארבע בפעמה, שש־עשרה בתיבה של 4/4. יש לה שני דגלים, או שתי קורות בקבוצה. נגנים סופרים אותן "1 e & a, 2 e & a", כמו באנגלית, וה־& עדיין בדיוק באמצע.' },
        show: { text: { en: '1 e & a  2 e & a', he: '1 e & a  2 e & a' } },
      },
      {
        say: { en: 'Inside one beat, sixteenths can merge. Ti tika is an eighth then two sixteenths, sounding on 1, &, a. Tika ti is two sixteenths then an eighth, sounding on 1, e, &. Hear them alternate.', he: 'בתוך פעמה אחת, שש־עשריות יכולות להתמזג. טי טיקה היא שמינית ואז שתי שש־עשריות, שנשמעות על 1, &, a. טיקה טי היא שתי שש־עשריות ואז שמינית, שנשמעות על 1, e, &. שמעו אותן מתחלפות.' },
        play: [R('es.se.es.se', 66)],
        show: { text: { en: '1 & a  ·  1 e &', he: '1 & a  ·  1 e &' } },
      },
      {
        say: { en: 'Listening strategy: find the "&" first. If the quick pair comes after it, the beat is ti tika; if before it, tika ti. If all four slots sound, it is tika-tika.', he: 'אסטרטגיית האזנה: מצאו קודם את ה־&. אם הזוג המהיר בא אחריו, הפעמה היא טי טיקה; אם לפניו, טיקה טי. אם כל ארבע המשבצות נשמעות, זה טיקה-טיקה.' },
        show: { text: { en: 'pair after & → ti tika · before → tika ti', he: 'זוג אחרי & ← טי טיקה · לפני ← טיקה טי' } },
      },
      {
        say: { en: 'To perform, keep your hand moving in steady sixteenths the whole time — down, up, down, up — and only touch the drum or the strings where a note is written. Drummers and guitarists both work this way. Start slowly.', he: 'לביצוע, השאירו את היד זזה בשש־עשריות קבועות כל הזמן — למטה, למעלה, למטה, למעלה — ונגעו בתוף או במיתרים רק איפה שכתוב תו. גם מתופפים וגם גיטריסטים עובדים כך. התחילו לאט.' },
        play: [R('ssss.es.ssss.se', 66)],
        show: { text: { en: '↓ ↑ ↓ ↑', he: '↓ ↑ ↓ ↑' } },
      },
      {
        say: { en: 'The common mistake is blurring ti tika into a triplet, making all three notes even. Listen: ti tika, then tri-o-la. In ti tika, the first note is twice as long as each of the other two.', he: 'הטעות הנפוצה היא למרוח את טי טיקה לטריולה, ולהפוך את שלושת הצלילים לשווים. הקשיבו: טי טיקה, ואז טרי-או-לה. בטי טיקה, הצליל הראשון ארוך פי שניים מכל אחד משני האחרים.' },
        play: [R('es.trip.es.trip', 66)],
        show: { text: { en: 'ti tika ≠ tri-o-la', he: 'טי טיקה ≠ טרי-או-לה' } },
      },
      {
        say: { en: 'Sixteenths drive funk and disco: the hi-hat and the scratchy rhythm guitar often run in constant sixteenths. They are also the language of fast melodic runs and of many rap flows.', he: 'שש־עשריות מניעות פאנק ודיסקו: ההיי־האט וגיטרת הקצב המגרדת רצים לעתים קרובות בשש־עשריות רצופות. הן גם השפה של ריצות מלודיות מהירות ושל הרבה פלואו בראפ.' },
      },
      {
        say: { en: 'To keep: four sixteenths per beat, counted "1 e & a". Find the "&", and the shape of the beat becomes clear.', he: 'לזכור: ארבע שש־עשריות בפעמה, סופרים "1 e & a". מוצאים את ה־&, וצורת הפעמה מתבהרת.' },
        show: { text: { en: '♩ = 4 × ♬', he: '♩ = 4 × ♬' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R5
  {
    id: 'rhythm-r5',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Syncopation', he: 'סינקופה' },
    takeaway: { en: 'Syncopation puts the note on the "and" instead of the beat: syn-co-pa (eighth, quarter, eighth) and sh-ti (eighth rest, eighth).', he: 'סינקופה שמה את הצליל על ה"ו" במקום על הפעמה: סין-קו-פה (שמינית, רבע, שמינית) ושְׁ-טי (הפסקת שמינית, שמינית).' },
    steps: [
      {
        say: { en: 'Hey {name}! Most notes like to land on the beat. Syncopation is when a note jumps in on the "and" between beats.', he: 'היי {name}! רוב הצלילים אוהבים לנחות על הפעמה. סינקופה היא כשצליל קופץ פנימה על ה"ו" שבין הפעמות.' },
        play: [R('syn.syn', 84)],
        show: { text: { en: '1 & 2 &  ·  on the "&"', he: '1 ו 2 ו  ·  על ה"ו"' } },
      },
      {
        say: { en: 'The classic shape is eighth, quarter, eighth: syn-co-pa. The long middle note starts on the "and" of 1 and rings across beat 2.', he: 'הצורה הקלאסית היא שמינית, רבע, שמינית: סין-קו-פה. הצליל הארוך שבאמצע מתחיל על ה"ו" של 1 ונמשך מעבר לפעמה 2.' },
        play: [R('syn.q.q', 84)],
        show: { text: { en: '♪ ♩ ♪  ·  syn-co-pa', he: '♪ ♩ ♪  ·  סין-קו-פה' } },
      },
      {
        say: { en: 'Compare with plain eighths. In syn-co-pa, beat 2 gets no new note — it\'s swallowed by the long one.', he: 'השוו לשמיניות רגילות. בסין-קו-פה אין צליל חדש על פעמה 2 — הארוך בולע אותה.' },
        play: [R('ee.ee.syn', 84)],
        show: { text: { en: 'ti-ti ti-ti  |  syn-co-pa', he: 'טי-טי טי-טי  |  סין-קו-פה' } },
      },
      {
        say: { en: 'The eighth rest is the other off-beat trick: silence on the beat, a note on the "and". Say sh-ti.', he: 'הפסקת השמינית היא הטריק השני: שקט על הפעמה, צליל על ה"ו". אומרים שְׁ-טי.' },
        play: [R('q.ere.q.ere', 84)],
        show: { text: { en: '𝄾 ♪  ·  sh-ti', he: '𝄾 ♪  ·  שְׁ-טי' } },
      },
      {
        say: { en: 'Feel the beat firmly in your foot, so the off-beats can pull against it. That tug is what makes music groove.', he: 'הרגישו את הפעמה חזק ברגל, כדי שהצלילים שבין הפעמות יוכלו למשוך נגדה. המשיכה הזאת היא מה שעושה גרוב.' },
        play: [R('syn.ere.q', 84)],
        show: { text: { en: 'syn-co-pa  sh-ti  ta', he: 'סין-קו-פה  שְׁ-טי  טה' } },
      },
      {
        say: { en: 'Your turn! Tap what you read — notes on the "and" get a tap, the beat under them doesn\'t. Then hear a bar and choose or build it.', he: 'תורכם! הקישו את מה שאתם קוראים — צליל על ה"ו" מקבל הקשה, הפעמה שמתחתיו לא. אחר כך שמעו תיבה ובחרו או בנו אותה.' },
        show: { text: { en: 'syn-co-pa · sh-ti', he: 'סין-קו-פה · שְׁ-טי' } },
      },
    ],
    more: [
      {
        say: { en: 'Precisely, syncopation is an accent on a weak position, between the beats, while the stronger beat after it gets no new note. In 4/4, beats 1 and 3 are strongest, 2 and 4 weaker, and the "ands" weaker still.', he: 'באופן מדויק, סינקופה היא הדגשה במקום חלש, בין הפעמות, כשהפעמה החזקה שאחריה לא מקבלת צליל חדש. ב־4/4, פעמות 1 ו־3 הן החזקות, 2 ו־4 חלשות יותר, וה"ו" חלשים עוד יותר.' },
        show: { text: { en: 'strong 1, 3 · weaker 2, 4 · weakest &', he: 'חזק 1, 3 · חלש 2, 4 · הכי חלש ו' } },
      },
      {
        say: { en: 'Syn-co-pa is often written with a tie: eighth, eighth tied to eighth, eighth. The tie hides beat 2 inside a note that started on the "and" of 1. Same sound, two spellings.', he: 'סין-קו-פה נכתבת לעתים קרובות עם ליגטורה: שמינית, שמינית קשורה לשמינית, שמינית. הליגטורה מחביאה את פעמה 2 בתוך צליל שהתחיל על ה"ו" של 1. אותו צליל, שתי דרכי כתיבה.' },
        play: [R('syn.syn', 84)],
        show: { text: { en: '♪ ♩ ♪  =  ♪ ♪‿♪ ♪', he: '♪ ♩ ♪  =  ♪ ♪‿♪ ♪' } },
      },
      {
        say: { en: 'A very common type is the anticipation, or push: a note arrives on the last "and" of a bar and is held over the next downbeat. Pop melodies and horn sections use it constantly to make the music lean forward.', he: 'סוג נפוץ מאוד הוא ההקדמה, או "פוש": צליל מגיע על ה"ו" האחרון של התיבה ומוחזק מעבר לפעמה 1 של התיבה הבאה. מנגינות פופ וכלי נשיפה משתמשים בזה כל הזמן כדי שהמוזיקה תישען קדימה.' },
        show: { text: { en: '4 & | (1)', he: '4 ו | (1)' } },
      },
      {
        say: { en: 'Listening strategy: tap the beat with your foot and notice two things — notes that fall between the taps, and taps with no new sound above them. Here every note sits on an "and", and no beat sounds at all.', he: 'אסטרטגיית האזנה: הקישו את הפעמה ברגל ושימו לב לשני דברים — צלילים שנופלים בין ההקשות, והקשות שאין מעליהן צליל חדש. כאן כל צליל יושב על "ו", ואף פעמה לא נשמעת בכלל.' },
        play: [R('ere.ere.ere.ere', 84)],
        show: { text: { en: 'sh-ti ×4', he: 'שְׁ-טי ×4' } },
      },
      {
        say: { en: 'To perform: count all the eighths aloud, "1 & 2 &", and say the "ands" louder than the numbers. Keep the foot on the beat whatever the hands do. Start slowly; syncopation is about precision, not speed.', he: 'לביצוע: ספרו את כל השמיניות בקול, "1 ו 2 ו", ואמרו את ה"ו" חזק יותר מהמספרים. השאירו את הרגל על הפעמה לא משנה מה הידיים עושות. התחילו לאט; סינקופה היא עניין של דיוק, לא של מהירות.' },
      },
      {
        say: { en: 'The common mistake is letting the off-beat become the new beat. After a few syncopations the ear flips, and you end up half a beat out. Keep the pulse in your body and listen: quarter, sh-ti, syn-co-pa.', he: 'הטעות הנפוצה היא לתת לאוף־ביט להפוך לפעמה החדשה. אחרי כמה סינקופות האוזן מתהפכת, ואתם מוצאים את עצמכם חצי פעמה בחוץ. החזיקו את הדופק בגוף והקשיבו: רבע, שְׁ-טי, סין-קו-פה.' },
        play: [R('q.ere.syn', 84)],
        show: { text: { en: 'ta  sh-ti  syn-co-pa', he: 'טה  שְׁ-טי  סין-קו-פה' } },
      },
      {
        say: { en: 'Syncopation is the engine of ragtime — Scott Joplin built a whole style on it — and of jazz, funk, Latin music and modern pop. In ska, the guitar plays short chords on the "ands", against the bass.', he: 'סינקופה היא המנוע של הרגטיים — סקוט ג׳ופלין בנה עליה סגנון שלם — ושל ג׳אז, פאנק, מוזיקה לטינית ופופ מודרני. בסקה, הגיטרה מנגנת אקורדים קצרים על ה"ו", מול הבס.' },
      },
      {
        say: { en: 'To keep: syncopation moves the note off the beat while the beat stays put. Feel the beat firmly, and that pull becomes groove.', he: 'לזכור: סינקופה מזיזה את הצליל מהפעמה בזמן שהפעמה נשארת במקומה. הרגישו את הפעמה בחוזקה, והמשיכה הזאת הופכת לגרוב.' },
        show: { text: { en: 'note off · beat on', he: 'הצליל זז · הפעמה נשארת' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R6
  {
    id: 'rhythm-r6',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Triplets', he: 'טריולות' },
    takeaway: { en: 'A triplet splits one beat into three equal notes (tri-o-la) instead of two.', he: 'טריולה מחלקת פעמה אחת לשלושה צלילים שווים (טרי-או-לה) במקום לשניים.' },
    steps: [
      {
        say: { en: 'Hi {name}! So far you split beats into two and four. A triplet splits one beat into three equal notes: tri-o-la.', he: 'היי {name}! עד עכשיו חילקתם פעמות לשתיים ולארבע. טריולה מחלקת פעמה אחת לשלושה צלילים שווים: טרי-או-לה.' },
        play: [R('trip.trip.trip.trip', 72)],
        show: { text: { en: '³♪♪♪  ·  tri-o-la', he: '³♪♪♪  ·  טרי-או-לה' } },
      },
      {
        say: { en: 'Hear the difference on the same beat: ti-ti, then tri-o-la. Two marches; three rolls.', he: 'שמעו את ההבדל על אותה פעמה: טי-טי, ואז טרי-או-לה. שתיים צועד; שלוש מתגלגל.' },
        play: [R('ee.trip.ee.trip', 72)],
        show: { text: { en: 'ti-ti  tri-o-la  ti-ti  tri-o-la', he: 'טי-טי  טרי-או-לה  טי-טי  טרי-או-לה' } },
      },
      {
        say: { en: 'A word trick: "ap-ple" for two, "straw-ber-ry" for three. Say them over the beat.', he: 'טריק של מילים: "תַּ-פּוּז" לשתיים, "תַּ-פּוּ-זִים" לשלוש. אמרו אותן על הפעמה.' },
        play: [R('ee.ee.trip.trip', 72)],
        show: { text: { en: 'ap-ple · straw-ber-ry', he: 'תַּ-פּוּז · תַּ-פּוּ-זִים' } },
      },
      {
        say: { en: 'The first note of every triplet sits right on the beat. The other two share the rest evenly — no hurrying to the next beat.', he: 'הצליל הראשון בכל טריולה יושב בדיוק על הפעמה. השניים האחרים מתחלקים בשאר בשווה — בלי למהר לפעמה הבאה.' },
        play: [R('trip.q.trip.q', 72)],
        show: { text: { en: '1-tri-o-la  2  3-tri-o-la  4', he: '1-טרי-או-לה  2  3-טרי-או-לה  4' } },
      },
      {
        say: { en: 'Mixed with quarters and halves, it\'s a little ripple in the flow.', he: 'בשילוב עם רבעים וחצאים, זה אדווה קטנה בזרם.' },
        play: [R('q.trip.h', 72)],
        show: { text: { en: 'ta  tri-o-la  ta-a', he: 'טה  טרי-או-לה  טה-אה' } },
      },
      {
        say: { en: 'Your turn! Tap what you read — three even taps inside one beat. Then hear a bar: is it ti-ti or tri-o-la? Choose it, or build it from blocks.', he: 'תורכם! הקישו את מה שאתם קוראים — שלוש הקשות שוות בתוך פעמה אחת. אחר כך שמעו תיבה: טי-טי או טרי-או-לה? בחרו אותה, או בנו אותה מקוביות.' },
        show: { text: { en: '2 or 3 per beat?', he: '2 או 3 בפעמה?' } },
      },
    ],
    more: [
      {
        say: { en: 'A triplet is a tuplet: three notes in the time normally taken by two. It is written with a bracket or beam and the number 3. An eighth-note triplet puts three notes in one beat, each lasting exactly a third of it.', he: 'טריולה היא חלוקה חריגה: שלושה צלילים בזמן שבדרך כלל לוקחים שניים. כותבים אותה עם סוגר או קורה והמספר 3. טריולת שמיניות מכניסה שלושה צלילים לפעמה אחת, וכל אחד נמשך בדיוק שליש ממנה.' },
        show: { text: { en: '³♪♪♪ = ♫ = ♩', he: '³♪♪♪ = ♫ = ♩' } },
      },
      {
        say: { en: 'Hear one beat divided three ways in a row: four sixteenths, a triplet, two eighths, a triplet. The beat never moves; only the number of slices changes.', he: 'שמעו פעמה אחת שמחולקת בשלוש דרכים ברצף: ארבע שש־עשריות, טריולה, שתי שמיניות, טריולה. הפעמה לא זזה; רק מספר הפרוסות משתנה.' },
        play: [R('ssss.trip.ee.trip', 72)],
        show: { text: { en: '4 · 3 · 2 · 3', he: '4 · 3 · 2 · 3' } },
      },
      {
        say: { en: 'Listening strategy: ignore the melody and ask how many notes fit between two beats. Two feels square, like marching. Three feels round and rolling. Four feels busy, but still square.', he: 'אסטרטגיית האזנה: התעלמו מהמנגינה ושאלו כמה צלילים נכנסים בין שתי פעמות. שניים מרגישים מרובעים, כמו צעידה. שלושה מרגישים עגולים ומתגלגלים. ארבעה מרגישים עמוסים, אבל עדיין מרובעים.' },
      },
      {
        say: { en: 'To perform, say "tri-o-la" on each beat and lean slightly on "tri", which sits on the beat. A classic drill: change between 2, 3 and 4 notes per beat while the metronome stays exactly the same.', he: 'לביצוע, אמרו "טרי-או-לה" על כל פעמה ושימו דגש קל על "טרי", שיושב על הפעמה. תרגיל קלאסי: לעבור בין 2, 3 ו־4 צלילים בפעמה בזמן שהמטרונום נשאר בדיוק אותו דבר.' },
        play: [R('ee.trip.ssss.trip', 66)],
        show: { text: { en: '2 · 3 · 4 · 3', he: '2 · 3 · 4 · 3' } },
      },
      {
        say: { en: 'The common mistake is rushing the first two notes, which turns a triplet into tika ti — two sixteenths and an eighth. Compare: tika ti, then a true triplet. In the triplet, all three gaps are equal.', he: 'הטעות הנפוצה היא למהר עם שני הצלילים הראשונים, וכך הטריולה הופכת לטיקה טי — שתי שש־עשריות ושמינית. השוו: טיקה טי, ואז טריולה אמיתית. בטריולה, כל שלושת המרווחים שווים.' },
        play: [R('se.trip.se.trip', 66)],
        show: { text: { en: 'tika ti ≠ tri-o-la', he: 'טיקה טי ≠ טרי-או-לה' } },
      },
      {
        say: { en: 'Triplets are central to blues and shuffle, to the piano chords of 1950s ballads and doo-wop, and to drum fills everywhere. A 4/4 bar filled with eighth-note triplets is effectively 12/8: the two notations meet.', he: 'טריולות הן מרכזיות בבלוז ובשאפל, באקורדי הפסנתר של בלדות ודו־וופ משנות ה־50, ובפילים של תופים בכל מקום. תיבת 4/4 מלאה בטריולות שמיניות היא למעשה 12/8: שני הכתיבים נפגשים.' },
      },
      {
        say: { en: 'To keep: a triplet is three equal notes where two would normally go. Keep every gap the same, and the first note on the beat.', he: 'לזכור: טריולה היא שלושה צלילים שווים במקום שבדרך כלל יש שניים. שומרים על כל המרווחים שווים, ועל הצליל הראשון על הפעמה.' },
        show: { text: { en: '3 in the time of 2', he: '3 בזמן של 2' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R7
  {
    id: 'rhythm-r7',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: '3/4, 6/8 and 12/8', he: '3/4, 6/8 ו־12/8' },
    takeaway: { en: '3/4 has three beats per bar; 6/8 and 12/8 have big dotted-quarter beats, each split into three eighths.', he: 'ב־3/4 יש שלוש פעמות בתיבה; ב־6/8 וב־12/8 יש פעמות גדולות של רבע מנוקד, כל אחת מחולקת לשלוש שמיניות.' },
    steps: [
      {
        say: { en: 'Hey {name}! Not every bar has four beats. In 3/4 there are three: ONE two three — the waltz.', he: 'היי {name}! לא בכל תיבה יש ארבע פעמות. ב־3/4 יש שלוש: אחת שתיים שלוש — הוואלס.' },
        play: [R('m3:h.q.q.q.q', 84, 2)],
        show: { text: { en: '3/4  ·  ONE two three', he: '3/4  ·  אחת שתיים שלוש' } },
      },
      {
        say: { en: 'The dotted half lasts three beats — two, plus half of two. One note fills a whole 3/4 bar: ta-a-a.', he: 'חצי מנוקד נמשך שלוש פעמות — שתיים, ועוד חצי משתיים. צליל אחד ממלא תיבה שלמה של 3/4: טה-אה-אה.' },
        play: [R('m3:q.q.q.dh', 84, 2)],
        show: { text: { en: '𝅗𝅥. = 3 beats  ·  ta-a-a', he: '𝅗𝅥. = 3 פעמות  ·  טה-אה-אה' } },
      },
      {
        say: { en: '6/8 rocks instead. Six eighths in two big beats of three: ONE-two-three FOUR-five-six. Each big beat is a dotted quarter, and the clicks mark only those.', he: '6/8 דווקא מתנדנד. שש שמיניות בשתי פעמות גדולות של שלוש: אחת-שתיים-שלוש ארבע-חמש-שש. כל פעמה גדולה היא רבע מנוקד, והקליקים מסמנים רק אותן.' },
        play: [R('m6:eee.eee.eee.eee', 84, 2)],
        show: { text: { en: '6/8  ·  1 2 3  4 5 6', he: '6/8  ·  1 2 3  4 5 6' } },
      },
      {
        say: { en: 'Inside a big beat you\'ll meet ta-i-i (one long note), ta ti (quarter, eighth) and ti ta (eighth, quarter).', he: 'בתוך פעמה גדולה תפגשו טה-אי-אי (צליל אחד ארוך), טה טי (רבע, שמינית) וטי טה (שמינית, רבע).' },
        play: [R('m6:dq.qe.eq.dq', 84, 2)],
        show: { text: { en: '♩.  ·  ♩ ♪  ·  ♪ ♩', he: '♩.  ·  ♩ ♪  ·  ♪ ♩' } },
      },
      {
        say: { en: 'Both 3/4 and 6/8 hold six eighths — but 3/4 is three pairs and 6/8 is two triples. Count the clicks: three, then two.', he: 'גם 3/4 וגם 6/8 מכילים שש שמיניות — אבל 3/4 זה שלושה זוגות ו־6/8 זה שתי קבוצות של שלוש. ספרו את הקליקים: שלושה, ואז שניים.' },
        play: [R('m3:ee.ee.ee', 84), R('m6:eee.eee', 84)],
        show: { text: { en: '3/4: 12 34 56  ·  6/8: 123 456', he: '3/4: 12 34 56  ·  6/8: 123 456' } },
      },
      {
        say: { en: '12/8 is two bars of 6/8 glued together: four big beats, each split in three. It is the meter of the slow blues.', he: '12/8 זה שתי תיבות של 6/8 מודבקות: ארבע פעמות גדולות, כל אחת מחולקת לשלוש. זה המשקל של הבלוז האיטי.' },
        play: [R('m12:qe.qe.qe.dq', 84)],
        show: { text: { en: '12/8  ·  123 456 789 10-11-12', he: '12/8  ·  123 456 789 10-11-12' } },
      },
      {
        say: { en: 'Your turn! Check the meter first. In 6/8 and 12/8, feel the big beats and the three inside each. Tap what you read, then hear a bar and choose or build it.', he: 'תורכם! קודם בדקו את המשקל. ב־6/8 וב־12/8 הרגישו את הפעמות הגדולות ואת השלוש שבתוך כל אחת. הקישו את מה שאתם קוראים, ואז שמעו תיבה ובחרו או בנו אותה.' },
        show: { text: { en: '3/4 · 6/8 · 12/8', he: '3/4 · 6/8 · 12/8' } },
      },
    ],
    more: [
      {
        say: { en: 'A time signature has two numbers. The top one says how many units fill a bar; the bottom one says which note is the unit: 4 is a quarter, 8 an eighth. So 3/4 is three quarters per bar, and 6/8 is six eighths.', he: 'למשקל יש שני מספרים. העליון אומר כמה יחידות ממלאות תיבה; התחתון אומר איזה תו הוא היחידה: 4 זה רבע, 8 זו שמינית. לכן 3/4 זה שלושה רבעים בתיבה, ו־6/8 זה שש שמיניות.' },
        show: { text: { en: '3/4 = 3 × ♩  ·  6/8 = 6 × ♪', he: '3/4 = 3 × ♩  ·  6/8 = 6 × ♪' } },
      },
      {
        say: { en: 'A meter is simple when each beat splits into two, and compound when it splits into three. In compound meters, divide the top number by three to get the beats: 6/8 has two, 9/8 three, 12/8 four. Hear a bar of 12/8.', he: 'משקל הוא פשוט כשכל פעמה מתחלקת לשתיים, ומורכב כשהיא מתחלקת לשלוש. במשקלים מורכבים, מחלקים את המספר העליון בשלוש ומקבלים את מספר הפעמות: ל־6/8 יש שתיים, ל־9/8 שלוש, ל־12/8 ארבע. שמעו תיבה של 12/8.' },
        play: [R('m12:eee.eee.eee.eee', 84)],
        show: { text: { en: '6/8: 2  ·  9/8: 3  ·  12/8: 4', he: '6/8: 2  ·  9/8: 3  ·  12/8: 4' } },
      },
      {
        say: { en: 'Listening strategy: first tap the pulse that feels natural. Then count the small notes inside each tap — two means simple, three means compound. Finally, count the taps from one strong downbeat to the next.', he: 'אסטרטגיית האזנה: קודם הקישו את הדופק שמרגיש טבעי. אחר כך ספרו את הצלילים הקטנים בתוך כל הקשה — שניים זה פשוט, שלושה זה מורכב. לבסוף, ספרו את ההקשות מפעמה 1 חזקה אחת לבאה.' },
      },
      {
        say: { en: 'Six eighths can be heard as 3 + 3 or as 2 + 2 + 2. Switching between the two is called hemiola. Baroque composers used it at cadences, and Bernstein\'s "America" from West Side Story is built on alternating them.', he: 'שש שמיניות אפשר לשמוע כ־3 + 3 או כ־2 + 2 + 2. המעבר ביניהן נקרא המיולה. מלחינים בארוקיים השתמשו בה בקדנצות, והשיר "America" של ברנשטיין מתוך "סיפור הפרברים" בנוי על החלפה ביניהן.' },
        play: [meter([3, 3], 2), meter([2, 2, 2], 2)],
        show: { text: { en: '3 + 3  ·  2 + 2 + 2', he: '3 + 3  ·  2 + 2 + 2' } },
      },
      {
        say: { en: 'To perform, conduct or tap the real beats: three per bar in 3/4, two per bar in 6/8 at a moderate tempo. Count 6/8 as "1 2 3 4 5 6" with the weight on 1 and 4, so the big beats stay in your body.', he: 'לביצוע, נצחו או הקישו את הפעמות האמיתיות: שלוש בתיבה ב־3/4, שתיים בתיבה ב־6/8 בקצב בינוני. ספרו 6/8 כ"1 2 3 4 5 6" עם המשקל על 1 ועל 4, כך שהפעמות הגדולות נשארות בגוף.' },
      },
      {
        say: { en: 'The common mistake is treating 6/8 as six equal beats, or as a fast 3/4. It has a lilt: long-short, long-short. Hear ta ti, the typical 6/8 figure, swaying in two.', he: 'הטעות הנפוצה היא להתייחס ל־6/8 כאל שש פעמות שוות, או כאל 3/4 מהיר. יש לו נדנוד: ארוך-קצר, ארוך-קצר. שמעו טה טי, הדמות הטיפוסית של 6/8, מתנדנדת בשתיים.' },
        play: [R('m6:qe.qe.qe.qe', 84, 2)],
        show: { text: { en: '♩ ♪  ♩ ♪  ·  ta ti ta ti', he: '♩ ♪  ♩ ♪  ·  טה טי טה טי' } },
      },
      {
        say: { en: 'In real music, 3/4 is the waltz, from Johann Strauss to film scores. 6/8 drives Irish jigs and many lullabies. 12/8 is the home of the slow blues and of 1950s ballads with piano triplets.', he: 'במוזיקה אמיתית, 3/4 הוא הוואלס, מיוהן שטראוס ועד מוזיקת סרטים. 6/8 מניע ג׳יגים איריים והרבה שירי ערש. 12/8 הוא הבית של הבלוז האיטי ושל בלדות משנות ה־50 עם טריולות בפסנתר.' },
      },
      {
        say: { en: 'To keep: the bottom number names the unit, and the split of the beat — into two or three — tells simple from compound.', he: 'לזכור: המספר התחתון קובע את היחידה, והחלוקה של הפעמה — לשתיים או לשלוש — מבדילה בין פשוט למורכב.' },
        show: { text: { en: 'simple ÷2 · compound ÷3', he: 'פשוט ÷2 · מורכב ÷3' } },
      },
    ],
  },
  // ------------------------------------------------------------------ R8
  {
    id: 'rhythm-r8',
    area: 'rhythm',
    emoji: '🎷',
    title: { en: 'Swing and quarter triplets', he: 'סווינג וטריולת רבעים' },
    takeaway: { en: 'Swing eighths are written even but played long-short (2:1); a quarter-note triplet puts three even notes across two beats.', he: 'שמיניות סווינג כתובות שוות אבל מנוגנות ארוך-קצר (2:1); טריולת רבעים מכניסה שלושה צלילים שווים לשתי פעמות.' },
    steps: [
      {
        say: { en: 'Hi {name}, this is jazz rhythm. Swing eighths are written as plain ti-ti, but played long-short. First even, then swung.', he: 'היי {name}, זה הקצב של הג׳אז. שמיניות סווינג כתובות כמו טי-טי רגיל, אבל מנוגנות ארוך-קצר. קודם שוות, ואז בסווינג.' },
        play: [R('ee.ee.ee.ee', 116), R('sw:ee.ee.ee.ee', 116)],
        show: { text: { en: '♫ written → long-short played', he: '♫ כתוב ← ארוך-קצר מנוגן' } },
      },
      {
        say: { en: 'How long is long? Think of a triplet. The first eighth takes two thirds of the beat, the second just the last third: doo-ba, doo-ba.', he: 'כמה ארוך זה ארוך? חשבו על טריולה. השמינית הראשונה לוקחת שני שלישים מהפעמה, והשנייה רק את השליש האחרון: דו-בה, דו-בה.' },
        play: [R('trip.trip.trip.trip', 116), R('sw:ee.ee.ee.ee', 116)],
        show: { text: { en: '⅔ + ⅓  ·  doo-ba', he: '⅔ + ⅓  ·  דו-בה' } },
      },
      {
        say: { en: 'Syncopations swing too: a note on the "and" arrives late and lazy, on that last third.', he: 'גם סינקופות מתנדנדות: צליל על ה"ו" מגיע מאוחר ובעצלתיים, על השליש האחרון הזה.' },
        play: [R('sw:ee.syn.q', 116)],
        show: { text: { en: 'ti-ti  syn-co-pa  ta', he: 'טי-טי  סין-קו-פה  טה' } },
      },
      {
        say: { en: 'New shape: the quarter-note triplet. Three even notes stretched across two beats: ta-ta-ta. Only the first one lands on a beat.', he: 'צורה חדשה: טריולת רבעים. שלושה צלילים שווים שנמתחים על פני שתי פעמות: טה-טה-טה. רק הראשון נוחת על פעמה.' },
        play: [R('q.q.qtrip', 116)],
        show: { text: { en: 'ta ta  |  ³ta-ta-ta', he: 'טה טה  |  ³טה-טה-טה' } },
      },
      {
        say: { en: 'It floats over the beat, as if the band slowed down for a moment — but the beat never moves.', he: 'היא מרחפת מעל הפעמה, כאילו הלהקה האטה לרגע — אבל הפעמה לא זזה.' },
        play: [R('sw:qtrip.ee.ee', 116)],
        show: { text: { en: '3 in the space of 2', he: '3 במקום של 2' } },
      },
      {
        say: { en: 'Your turn! Everything here swings, at a brisk 116. Tap what you read — keep the off-beats late. Then hear a bar and choose or build it.', he: 'תורכם! הכול כאן בסווינג, בקצב זריז של 116. הקישו את מה שאתם קוראים — השאירו את הצלילים שבין הפעמות מאוחרים. אחר כך שמעו תיבה ובחרו או בנו אותה.' },
        show: { text: { en: 'swing: ⅔ + ⅓', he: 'סווינג: ⅔ + ⅓' } },
      },
    ],
    more: [
      {
        say: { en: 'Swing is a reading convention. A chart marked "Swing", or headed with two eighths equal to a triplet quarter and eighth, means: play every written eighth pair long-short, two thirds plus one third. Nobody writes the triplets out; the style tells you.', he: 'סווינג הוא מוסכמת קריאה. תווים שמסומנים "Swing", או שבראשם כתוב ששתי שמיניות שוות לרבע ושמינית טריוליים, אומרים: נגנו כל זוג שמיניות כתוב ארוך-קצר, שני שלישים ועוד שליש. אף אחד לא כותב את הטריולות; הסגנון אומר לכם.' },
        show: { text: { en: '♫ = ³♩♪', he: '♫ = ³♩♪' } },
      },
      {
        say: { en: 'In swing, the off-beat eighth often gets a light accent, and the drummer\'s hi-hat closes on beats 2 and 4. Hear swung eighths with quarters between them: each "and" lands late, with a small push.', he: 'בסווינג, השמינית שבין הפעמות מקבלת לעתים קרובות הדגשה קלה, וההיי־האט של המתופף נסגר על פעמות 2 ו־4. שמעו שמיניות סווינג עם רבעים ביניהן: כל "ו" נוחת מאוחר, עם דחיפה קטנה.' },
        play: [R('sw:ee.q.ee.q', 116)],
        show: { text: { en: 'doo-ba  ta  doo-ba  ta', he: 'דו-בה  טה  דו-בה  טה' } },
      },
      {
        say: { en: 'A quarter-note triplet fits three quarters into the time of two beats, so each note lasts two thirds of a beat. It is exactly every other note of an eighth-note triplet. Hear two beats of eighth triplets, then the quarter triplet.', he: 'טריולת רבעים מכניסה שלושה רבעים לזמן של שתי פעמות, כך שכל צליל נמשך שני שלישים של פעמה. זה בדיוק כל צליל שני מטריולת שמיניות. שמעו שתי פעמות של טריולות שמיניות, ואז את טריולת הרבעים.' },
        play: [R('trip.trip.qtrip', 100)],
        show: { text: { en: '³♪♪♪ ³♪♪♪  |  ³♩♩♩', he: '³♪♪♪ ³♪♪♪  |  ³♩♩♩' } },
      },
      {
        say: { en: 'To place it, think of three triplet slots in every beat, and play the first slot of beat 1, the third slot of beat 1 and the second slot of beat 2. Only the first note touches a beat; the second comes just before beat 2, the third just after it.', he: 'כדי למקם אותה, חשבו על שלוש משבצות טריולה בכל פעמה, ונגנו על המשבצת הראשונה של פעמה 1, על השלישית של פעמה 1 ועל השנייה של פעמה 2. רק הצליל הראשון נוגע בפעמה; השני מגיע רגע לפני פעמה 2, השלישי רגע אחריה.' },
        show: { text: { en: 'triplet slots 1, 3, 5 of 6', he: 'משבצות טריולה 1, 3, 5 מתוך 6' } },
      },
      {
        say: { en: 'Two common mistakes. Over-swinging: playing a choppy dotted eighth and sixteenth where a relaxed triplet feel is meant. And swinging everything: only the eighth pairs swing, while quarters and quarter triplets stay even.', he: 'שתי טעויות נפוצות. סווינג מוגזם: לנגן שמינית מנוקדת ושש־עשרית קופצניות במקום שבו הכוונה לתחושת טריולה רגועה. וסווינג על הכול: רק זוגות השמיניות מתנדנדים, ורבעים וטריולות רבעים נשארים שווים.' },
      },
      {
        say: { en: 'Swing eighths are the default in most jazz, from big bands to bebop, and in the blues shuffle. Quarter-note triplets show up in melodies that seem to float over the bar line, in drum fills and in big-band ensemble hits.', he: 'שמיניות סווינג הן ברירת המחדל ברוב הג׳אז, מהביג בנד ועד הביבופ, ובשאפל של הבלוז. טריולות רבעים מופיעות במנגינות שנדמה שהן מרחפות מעל קו התיבה, בפילים של תופים ובמכות משותפות של ביג בנד.' },
        play: [R('sw:ee.qtrip.q', 116)],
        show: { text: { en: 'doo-ba  ³ta-ta-ta  ta', he: 'דו-בה  ³טה-טה-טה  טה' } },
      },
      {
        say: { en: 'To keep: swing is written even and played two thirds plus one third. A quarter triplet is three even notes across two beats.', he: 'לזכור: סווינג כתוב שווה ומנוגן שני שלישים ועוד שליש. טריולת רבעים היא שלושה צלילים שווים על פני שתי פעמות.' },
        show: { text: { en: '⅔ + ⅓  ·  3 in 2', he: '⅔ + ⅓  ·  3 ב־2' } },
      },
    ],
  },
  // ------------------------------------------------------------------ odd meters
  {
    id: 'odd-meter',
    area: 'rhythm',
    emoji: '🧮',
    title: { en: 'Odd meters', he: 'משקלים אי־זוגיים' },
    takeaway: { en: 'Odd meters are groups of 2 and 3 eighths: 5/8 = 3+2, 7/8 = 2+2+3 (or 3+2+2, 2+3+2), 9/8 = 2+2+2+3, 11/8 = 2+2+3+2+2.', he: 'משקלים אי־זוגיים בנויים מקבוצות של 2 ו־3 שמיניות: 5/8 = 3+2, 7/8 = 2+2+3 (או 3+2+2, 2+3+2), 9/8 = 2+2+2+3, 11/8 = 2+2+3+2+2.' },
    steps: [
      {
        say: { en: 'Hey {name}! Odd meters count in quick eighths, and the eighths clump into groups of two and three. The low drum marks where each group starts.', he: 'היי {name}! במשקלים אי־זוגיים סופרים שמיניות מהירות, והן מתקבצות לקבוצות של שתיים ושלוש. התוף הנמוך מסמן איפה כל קבוצה מתחילה.' },
        play: [meter([3, 3], 4)],
        show: { text: { en: '6/8 = 3 + 3', he: '6/8 = 3 + 3' } },
      },
      {
        say: { en: 'That was 6/8: two even groups of three. Now 5/8: one group of three, one of two. It limps — charmingly.', he: 'זה היה 6/8: שתי קבוצות שוות של שלוש. עכשיו 5/8: קבוצה אחת של שלוש ואחת של שתיים. הוא צולע — בחן.' },
        play: [meter([3, 2], 4)],
        show: { text: { en: '5/8 = 3 + 2', he: '5/8 = 3 + 2' } },
      },
      {
        say: { en: '7/8 adds another two: 2+2+3. Count it "1-2, 1-2, 1-2-3".', he: '7/8 מוסיף עוד שתיים: 2+2+3. ספרו "1-2, 1-2, 1-2-3".' },
        play: [meter([2, 2, 3], 4)],
        show: { text: { en: '7/8 = 2 + 2 + 3', he: '7/8 = 2 + 2 + 3' } },
      },
      {
        say: { en: 'The same seven can be grouped other ways: 3+2+2, or 2+3+2. Listen for where the long group sits.', he: 'את אותן שבע אפשר לקבץ גם אחרת: 3+2+2, או 2+3+2. הקשיבו איפה יושבת הקבוצה הארוכה.' },
        play: [meter([3, 2, 2], 3), meter([2, 3, 2], 3)],
        show: { text: { en: '3+2+2  ·  2+3+2', he: '3+2+2  ·  2+3+2' } },
      },
      {
        say: { en: 'Longer ones: 9/8 here is 2+2+2+3, a Balkan favourite. 11/8 is 2+2+3+2+2.', he: 'וארוכים יותר: 9/8 כאן הוא 2+2+2+3, אהוב בבלקן. 11/8 הוא 2+2+3+2+2.' },
        play: [meter([2, 2, 2, 3], 2), meter([2, 2, 3, 2, 2], 2)],
        show: { text: { en: '9/8 = 2+2+2+3  ·  11/8 = 2+2+3+2+2', he: '9/8 = 2+2+2+3  ·  11/8 = 2+2+3+2+2' } },
      },
      {
        say: { en: 'Trick: don\'t count to eleven. Count the groups — short, short, long — and add them up.', he: 'טריק: אל תספרו עד אחת־עשרה. ספרו את הקבוצות — קצר, קצר, ארוך — וחברו אותן.' },
        play: [meter([2, 2, 3], 3)],
        show: { text: { en: '2 + 2 + 3 = 7', he: '2 + 2 + 3 = 7' } },
      },
      {
        say: { en: 'Your turn! Listen to a few bars and tell me the meter — "seven eight" — or, at level 2, the grouping, like "two two three".', he: 'תורכם! הקשיבו לכמה תיבות ואמרו לי את המשקל — "שבע שמיניות" — או, ברמה השנייה, את החלוקה, למשל "2+2+3".' },
        show: { text: { en: '5/8 · 6/8 · 7/8 · 9/8 · 11/8', he: '5/8 · 6/8 · 7/8 · 9/8 · 11/8' } },
      },
    ],
    more: [
      {
        say: { en: 'Odd meters are additive: instead of equal beats, the bar is built from short beats of two eighths and long beats of three. The beats are uneven, but the eighth note never changes speed. Turkish music calls such rhythms aksak, "limping".', he: 'משקלים אי־זוגיים הם חיבוריים: במקום פעמות שוות, התיבה נבנית מפעמות קצרות של שתי שמיניות ופעמות ארוכות של שלוש. הפעמות לא שוות, אבל השמינית אף פעם לא משנה מהירות. במוזיקה הטורקית קוראים למקצבים כאלה אקסק, "צולע".' },
        show: { text: { en: 'short = 2 · long = 3', he: 'קצר = 2 · ארוך = 3' } },
      },
      {
        say: { en: 'Five can also be counted in quarters. Dave Brubeck\'s "Take Five" is in 5/4, felt as 3 + 2. It is the same long-short shape as 5/8, only slower. Listen at a relaxed pace.', he: 'את חמש אפשר לספור גם ברבעים. "Take Five" של דייב ברובק כתוב ב־5/4, ומורגש כ־3 + 2. זו אותה צורה של ארוך-קצר כמו 5/8, רק לאט יותר. הקשיבו בקצב רגוע.' },
        play: [meter([3, 2], 3, 0.3)],
        show: { text: { en: '5/4 = 3 + 2', he: '5/4 = 3 + 2' } },
      },
      {
        say: { en: '7/8 lives in Balkan and Greek dance. The Bulgarian rachenitsa is 2 + 2 + 3; the Greek kalamatianos is 3 + 2 + 2. Same seven eighths, a completely different step. Hear the kalamatianos grouping.', he: '7/8 חי בריקודים בלקניים ויווניים. הרצ׳ניצה הבולגרית היא 2 + 2 + 3; הקלמטיאנוס היווני הוא 3 + 2 + 2. אותן שבע שמיניות, צעד שונה לגמרי. שמעו את החלוקה של הקלמטיאנוס.' },
        play: [meter([3, 2, 2], 3)],
        show: { text: { en: '7/8 = 3 + 2 + 2', he: '7/8 = 3 + 2 + 2' } },
      },
      {
        say: { en: 'Watch out: 9/8 can be additive, 2 + 2 + 2 + 3, as in the Turkish karsilama, or a plain compound meter, 3 + 3 + 3. Hear both: the first limps at the end, the second rolls evenly.', he: 'שימו לב: 9/8 יכול להיות חיבורי, 2 + 2 + 2 + 3, כמו בקרשילמה הטורקית, או משקל מורכב רגיל, 3 + 3 + 3. שמעו את שניהם: הראשון צולע בסוף, השני מתגלגל באופן שווה.' },
        play: [meter([2, 2, 2, 3], 2), meter([3, 3, 3], 2)],
        show: { text: { en: '2+2+2+3  ·  3+3+3', he: '2+2+2+3  ·  3+3+3' } },
      },
      {
        say: { en: 'Listening strategy: follow the low accents and compare the gaps between them. A short gap is a 2, a long gap is a 3. Note the gaps — short, short, long — and you have both the grouping and the meter.', he: 'אסטרטגיית האזנה: עקבו אחרי ההדגשות הנמוכות והשוו את המרווחים ביניהן. מרווח קצר הוא 2, מרווח ארוך הוא 3. רשמו את המרווחים — קצר, קצר, ארוך — ויש לכם גם את החלוקה וגם את המשקל.' },
      },
      {
        say: { en: 'To perform, speak syllables: "ta-ka" for a 2 and "ta-ki-ta" for a 3, a trick borrowed from South Indian rhythm syllables. 7/8 as 2 + 2 + 3 becomes ta-ka ta-ka ta-ki-ta. Clap on every "ta".', he: 'לביצוע, אמרו הברות: "טה-קה" ל־2 ו"טה-קי-טה" ל־3, טריק שמגיע מהברות הקצב של דרום הודו. 7/8 כ־2 + 2 + 3 הופך לטה-קה טה-קה טה-קי-טה. מחאו כף על כל "טה".' },
        play: [meter([2, 2, 3], 3)],
        show: { text: { en: 'ta-ka ta-ka ta-ki-ta', he: 'טה-קה טה-קה טה-קי-טה' } },
      },
      {
        say: { en: 'The common mistake is squaring it off: evening out the groups, by clipping the 3 or stretching a 2, until the bar feels like plain 4/4 or 6/8. Keep the eighths perfectly even; the unevenness belongs to the groups, not to the notes.', he: 'הטעות הנפוצה היא "ליישר" את המשקל: להשוות את הקבוצות, לקצץ את ה־3 או למתוח 2, עד שהתיבה מרגישה כמו 4/4 או 6/8 רגילים. שמרו על שמיניות שוות לגמרי; חוסר השוויון שייך לקבוצות, לא לצלילים.' },
      },
      {
        say: { en: 'Beyond the Balkans and Turkey, odd meters appear in progressive rock — Pink Floyd\'s "Money" is mostly in 7/4 — in modern jazz, and in film and game music that wants to feel restless.', he: 'מעבר לבלקן ולטורקיה, משקלים אי־זוגיים מופיעים ברוק מתקדם — "Money" של פינק פלויד כתוב ברובו ב־7/4 — בג׳אז מודרני, ובמוזיקה לסרטים ולמשחקים שרוצה להרגיש חסרת מנוחה.' },
      },
      {
        say: { en: 'To keep: odd meters are chains of 2s and 3s over a steady eighth. Find the long group, and you have found the meter.', he: 'לזכור: משקלים אי־זוגיים הם שרשראות של 2 ו־3 מעל שמינית יציבה. מצאו את הקבוצה הארוכה, ומצאתם את המשקל.' },
        show: { text: { en: '2 + 2 + 3 = 7', he: '2 + 2 + 3 = 7' } },
      },
    ],
  },
  // ------------------------------------------------------------------ polyrhythm
  {
    id: 'polyrhythm',
    area: 'rhythm',
    emoji: '🔀',
    title: { en: 'Polyrhythms', he: 'פולי־ריתמים' },
    takeaway: { en: 'A polyrhythm divides one span two ways at once: in "3 against 2" the high part plays 3 even notes while the low part plays 2.', he: 'פולי־ריתם מחלק את אותו פרק זמן בשתי דרכים בבת אחת: ב"3 נגד 2" הקול הגבוה מנגן 3 צלילים שווים והנמוך 2.' },
    steps: [
      {
        say: { en: 'Hi {name}! A polyrhythm is two even pulses at once, splitting the same stretch of time differently. Here the high click plays one number, the low drum the other.', he: 'היי {name}! פולי־ריתם הוא שני דפקים שווים בבת אחת, שמחלקים את אותו פרק זמן אחרת. כאן הקליק הגבוה מנגן מספר אחד, והתוף הנמוך את השני.' },
        play: [poly(2, 1, 1.5, 3)],
        show: { text: { en: '2 : 1', he: '2 : 1' } },
      },
      {
        say: { en: 'That was 2 against 1: two high, one low. Easy — they meet on every low note.', he: 'זה היה 2 נגד 1: שניים גבוהים, אחד נמוך. קל — הם נפגשים בכל צליל נמוך.' },
        play: [poly(2, 1, 1.5, 2)],
        show: { text: { en: 'high ×2 · low ×1', he: 'גבוה ×2 · נמוך ×1' } },
      },
      {
        say: { en: '3 against 2: three high over two low. They meet only on the first. In between you hear high, low, high.', he: '3 נגד 2: שלושה גבוהים מעל שניים נמוכים. הם נפגשים רק על הראשון. ביניהם שומעים גבוה, נמוך, גבוה.' },
        play: [poly(3, 2, 1.5, 3)],
        show: { text: { en: 'together · high · low · high', he: 'יחד · גבוה · נמוך · גבוה' } },
      },
      {
        say: { en: '4 against 3 is busier: four high over three low, like a gallop that keeps slipping.', he: '4 נגד 3 עמוס יותר: ארבעה גבוהים מעל שלושה נמוכים, כמו דהרה שכל הזמן מחליקה.' },
        play: [poly(4, 3, 1.5, 3)],
        show: { text: { en: '4 : 3', he: '4 : 3' } },
      },
      {
        say: { en: '5 against 4 and 5 against 3 are the tricky ones — the clicks almost blur together.', he: '5 נגד 4 ו־5 נגד 3 הם המאתגרים — הקליקים כמעט מתמזגים.' },
        play: [poly(5, 4, 1.5, 2), poly(5, 3, 1.5, 2)],
        show: { text: { en: '5 : 4  ·  5 : 3', he: '5 : 4  ·  5 : 3' } },
      },
      {
        say: { en: 'Trick: lock onto the low drum first and count its notes per cycle. Then count the high clicks from one meeting point to the next.', he: 'טריק: קודם היצמדו לתוף הנמוך וספרו כמה צלילים יש לו בכל מחזור. ואז ספרו את הקליקים הגבוהים מנקודת מפגש אחת לבאה.' },
        play: [poly(3, 2, 1.5, 2)],
        show: { text: { en: 'low first, then high', he: 'קודם נמוך, אחר כך גבוה' } },
      },
      {
        say: { en: 'Your turn! Hear the pattern and name it high against low — "three against two" means three high, two low.', he: 'תורכם! הקשיבו לדפוס ותנו לו שם, גבוה נגד נמוך — "3 נגד 2" זה שלושה גבוהים ושניים נמוכים.' },
        show: { text: { en: 'high : low', he: 'גבוה : נמוך' } },
      },
    ],
    more: [
      {
        say: { en: 'Precisely, a polyrhythm is two even pulses that divide the same span of time differently and meet at its start. It differs from polymeter, where two parts share one pulse but repeat in bars of different lengths.', he: 'באופן מדויק, פולי־ריתם הוא שני דפקים שווים שמחלקים את אותו פרק זמן אחרת ונפגשים בתחילתו. זה שונה מפולי־מטר, שבו שני קולות חולקים דופק אחד אבל חוזרים בתיבות באורכים שונים.' },
        show: { text: { en: 'polyrhythm ≠ polymeter', he: 'פולי־ריתם ≠ פולי־מטר' } },
      },
      {
        say: { en: 'The math behind 3 against 2: split the cycle into six slots. The three fall on slots 1, 3 and 5; the two on slots 1 and 4. Together: both, high, low, high. A handy English phrase for it: "nice cup of tea".', he: 'החשבון מאחורי 3 נגד 2: מחלקים את המחזור לשש משבצות. השלושה נופלים על משבצות 1, 3 ו־5; השניים על משבצות 1 ו־4. ביחד: שניהם, גבוה, נמוך, גבוה. משפט עזר באנגלית: "nice cup of tea".' },
        play: [poly(3, 2, 1.2, 4)],
        show: { text: { en: 'high 1 3 5 · low 1 4  (of 6)', he: 'גבוה 1 3 5 · נמוך 1 4  (מתוך 6)' } },
      },
      {
        say: { en: '4 against 3 works the same way on a grid of twelve: the four land every three slots, the three every four slots. Hear how the two lines interlock into one uneven pattern.', he: '4 נגד 3 עובד באותה דרך על רשת של שתים־עשרה: הארבעה נוחתים כל שלוש משבצות, השלושה כל ארבע משבצות. שמעו איך שני הקווים משתלבים לדפוס אחד לא שווה.' },
        play: [poly(4, 3, 1.6, 3)],
        show: { text: { en: '4 : 3  ·  grid of 12', he: '4 : 3  ·  רשת של 12' } },
      },
      {
        say: { en: 'Listening strategy: your ear picks one layer as "the beat". Here the roles swap — the low drum now plays three and the high click two. Practise hearing either layer as the beat; the pattern is the same.', he: 'אסטרטגיית האזנה: האוזן בוחרת שכבה אחת להיות "הפעמה". כאן התפקידים מתחלפים — התוף הנמוך מנגן עכשיו שלושה והקליק הגבוה שניים. התאמנו לשמוע כל אחת מהשכבות כפעמה; הדפוס זהה.' },
        play: [poly(2, 3, 1.2, 4)],
        show: { text: { en: '2 : 3', he: '2 : 3' } },
      },
      {
        say: { en: 'To perform 3 against 2, tap on a table: right hand on slots 1, 3 and 5, left hand on 1 and 4, counting "1 2 3 4 5 6" aloud. Slowly the counting fades and the pattern becomes one motion.', he: 'כדי לבצע 3 נגד 2, הקישו על שולחן: יד ימין על משבצות 1, 3 ו־5, יד שמאל על 1 ו־4, וספרו בקול "1 2 3 4 5 6". לאט לאט הספירה נעלמת והדפוס הופך לתנועה אחת.' },
      },
      {
        say: { en: 'The common mistake is letting one line give in to the other: the three turns lopsided, long-short-short, to fit around the two. Each layer must stay perfectly even on its own.', he: 'הטעות הנפוצה היא לתת לקו אחד להיכנע לשני: השלושה נהיים עקומים, ארוך-קצר-קצר, כדי להתאים לשניים. כל שכבה חייבת להישאר שווה לגמרי בפני עצמה.' },
      },
      {
        say: { en: 'Cross-rhythms such as 3 against 2 are a foundation of much West African drumming and of Afro-Cuban music. In piano music, Chopin\'s Fantaisie-Impromptu sets four notes against three between the hands, page after page.', he: 'קרוס־ריתמים כמו 3 נגד 2 הם בסיס להרבה מהתיפוף המערב־אפריקאי ולמוזיקה האפרו־קובנית. בפסנתר, הפנטזיה־אימפרומפטו של שופן מעמידה ארבעה צלילים מול שלושה בין הידיים, עמוד אחרי עמוד.' },
      },
      {
        say: { en: 'To keep: a polyrhythm is two even pulses over one cycle. Build it on the common grid — six for 3:2, twelve for 4:3.', he: 'לזכור: פולי־ריתם הוא שני דפקים שווים על מחזור אחד. בונים אותו על הרשת המשותפת — שש ל־3:2, שתים־עשרה ל־4:3.' },
        show: { text: { en: '3:2 → 6 · 4:3 → 12', he: '3:2 = 6 · 4:3 = 12' } },
      },
    ],
  },
  // ------------------------------------------------------------------ swing ratio
  {
    id: 'swing-ratio',
    area: 'rhythm',
    emoji: '🎷',
    title: { en: 'Swing feel', he: 'תחושת סווינג' },
    takeaway: { en: 'Swing makes the first eighth of each beat longer: light 3:2, triplet 2:1, hard 3:1 — straight is 1:1.', he: 'סווינג מאריך את השמינית הראשונה בכל פעמה: קל 3:2, טריולי 2:1, חזק 3:1 — ישר זה 1:1.' },
    steps: [
      {
        say: { en: 'Hey {name}! Straight eighths split each beat into two equal halves. Swing makes the first one longer and the second shorter. Straight, then swing.', he: 'היי {name}! שמיניות ישרות מחלקות כל פעמה לשני חצאים שווים. סווינג מאריך את הראשונה ומקצר את השנייה. ישר, ואז סווינג.' },
        play: [swing(1, 120, 4), swing(2, 120, 4)],
        show: { text: { en: 'straight 1:1  →  swing', he: 'ישר 1:1  ←  סווינג' } },
      },
      {
        say: { en: 'Classic swing is 2:1, the triplet feel. The first eighth takes two thirds of the beat; the second gets the last third.', he: 'הסווינג הקלאסי הוא 2:1, תחושת הטריולה. השמינית הראשונה לוקחת שני שלישים מהפעמה; השנייה מקבלת את השליש האחרון.' },
        play: [swing(2, 120, 8)],
        show: { text: { en: 'triplet  2 : 1  =  ⅔ + ⅓', he: 'טריולי  2 : 1  =  ⅔ + ⅓' } },
      },
      {
        say: { en: 'Light swing is 3:2 — just a lean, three fifths and two fifths. Players often swing lighter at fast tempos.', he: 'סווינג קל הוא 3:2 — רק נטייה, שלוש חמישיות ושתי חמישיות. נגנים מרבים לנגן סווינג קל יותר בקצב מהיר.' },
        play: [swing(1.5, 132, 8)],
        show: { text: { en: 'light  3 : 2', he: 'קל  3 : 2' } },
      },
      {
        say: { en: 'Hard swing is 3:1 — a dotted eighth and a sixteenth. Bouncy, almost jumpy.', he: 'סווינג חזק הוא 3:1 — שמינית מנוקדת ושש־עשרית. קופצני, כמעט מקפץ.' },
        play: [swing(3, 132, 8)],
        show: { text: { en: 'hard  3 : 1', he: 'חזק  3 : 1' } },
      },
      {
        say: { en: 'All four in a row: straight, light, triplet, hard. The short note slides later each time.', he: 'כל הארבעה ברצף: ישר, קל, טריולי, חזק. הצליל הקצר מחליק מאוחר יותר בכל פעם.' },
        play: [swing(1, 132, 4), swing(1.5, 132, 4), swing(2, 132, 4), swing(3, 132, 4)],
        show: { text: { en: '1:1 · 3:2 · 2:1 · 3:1', he: '1:1 · 3:2 · 2:1 · 3:1' } },
      },
      {
        say: { en: 'Trick: listen only to the short note. Exactly halfway? Straight. A touch late? Light. On the last third? Triplet. Nearly touching the next beat? Hard.', he: 'טריק: הקשיבו רק לצליל הקצר. בדיוק באמצע? ישר. טיפה מאוחר? קל. על השליש האחרון? טריולי. כמעט נוגע בפעמה הבאה? חזק.' },
        show: { text: { en: 'where is the short note?', he: 'איפה הצליל הקצר?' } },
      },
      {
        say: { en: 'Your turn! Listen to the eighths over the bass and tell me how they\'re played — straight or swing, and later, how much swing.', he: 'תורכם! הקשיבו לשמיניות מעל הבס ואמרו לי איך הן מנוגנות — ישר או סווינג, ובהמשך גם כמה סווינג.' },
        play: [swing(2, 120, 4)],
        show: { text: { en: 'straight or swing?', he: 'ישר או סווינג?' } },
      },
    ],
    more: [
      {
        say: { en: 'The swing ratio is the length of the long eighth divided by the short one. As percentages of the beat: straight 1:1 is 50/50, light 3:2 is 60/40, triplet 2:1 is about 67/33, and hard 3:1 is 75/25.', he: 'יחס הסווינג הוא אורך השמינית הארוכה חלקי הקצרה. באחוזים מהפעמה: ישר 1:1 זה 50/50, קל 3:2 זה 60/40, טריולי 2:1 זה בערך 67/33, וחזק 3:1 זה 75/25.' },
        show: { text: { en: '50 · 60 · 67 · 75 %', he: '50 · 60 · 67 · 75 %' } },
      },
      {
        say: { en: 'Drum machines and recording software set swing in the same percentages: 50% is straight, about 66% is triplet swing. Producers often dial in something between, around 55 to 60%, for a gentle lean. This is about 58%.', he: 'מכונות תופים ותוכנות הקלטה מגדירות סווינג באותם אחוזים: 50% זה ישר, בערך 66% זה סווינג טריולי. מפיקים בוחרים הרבה פעמים משהו באמצע, בסביבות 55 עד 60%, לנטייה עדינה. זה בערך 58%.' },
        play: [swing(1.4, 100, 8)],
        show: { text: { en: '≈ 58%', he: '≈ 58%' } },
      },
      {
        say: { en: 'The ratio depends on tempo. In ballads players can swing deeply; at very fast tempos the eighths get straighter, because there is simply no room for a big long-short. Slow and deep, then fast and light.', he: 'היחס תלוי בקצב. בבלדות אפשר לנגן סווינג עמוק; בקצבים מהירים מאוד השמיניות מתיישרות, כי פשוט אין מקום לארוך-קצר גדול. איטי ועמוק, ואז מהיר וקל.' },
        play: [swing(2.5, 80, 4), swing(1.2, 220, 8)],
        show: { text: { en: '80 deep  ·  220 light', he: '80 עמוק  ·  220 קל' } },
      },
      {
        say: { en: 'Listening strategy: imagine an eighth-note triplet over each beat. Does the short note land on its last slot? That is 2:1. Before it? Lighter. After it, almost touching the next beat? Harder. Compare triplet swing with hard swing.', he: 'אסטרטגיית האזנה: דמיינו טריולת שמיניות מעל כל פעמה. הצליל הקצר נוחת על המשבצת האחרונה שלה? זה 2:1. לפניה? קל יותר. אחריה, כמעט נוגע בפעמה הבאה? חזק יותר. השוו סווינג טריולי לסווינג חזק.' },
        play: [swing(2, 110, 4), swing(3, 110, 4)],
        show: { text: { en: '2:1  ·  3:1', he: '2:1  ·  3:1' } },
      },
      {
        say: { en: 'To play it, sing "doo-ba" over a metronome that clicks only on 2 and 4. Start from full triplets with the middle note silent, then relax the timing until it sounds like speech rather than arithmetic.', he: 'כדי לנגן, שירו "דו-בה" מעל מטרונום שמקיש רק על 2 ו־4. התחילו מטריולות מלאות כשהצליל האמצעי שקט, ואז שחררו את התזמון עד שזה נשמע כמו דיבור ולא כמו חשבון.' },
      },
      {
        say: { en: 'The common mistake is thinking swing is only a ratio. The feel also lives in accents, a light push on the off-beat, and in where the band sits against the beat. Still, the ratio is the part you can measure and train.', he: 'הטעות הנפוצה היא לחשוב שסווינג הוא רק יחס. התחושה חיה גם בהדגשות, דחיפה קלה על האוף־ביט, ובמקום שבו הלהקה יושבת ביחס לפעמה. ובכל זאת, היחס הוא החלק שאפשר למדוד ולאמן.' },
      },
      {
        say: { en: 'Triplet swing marks most jazz and the blues shuffle. Lighter swing is common in fast bebop and in hip-hop and neo-soul grooves. Hard, dotted 3:1 figures are more typical of marches and written dotted rhythms.', he: 'סווינג טריולי מאפיין את רוב הג׳אז ואת השאפל של הבלוז. סווינג קל יותר נפוץ בביבופ מהיר ובגרוב של היפ־הופ ונאו־סול. דמויות מנוקדות חזקות של 3:1 אופייניות יותר למארשים ולמקצבים מנוקדים כתובים.' },
      },
      {
        say: { en: 'To keep: swing is a share of the beat — 50% straight, about 67% triplet. Listen to where the short note lands.', he: 'לזכור: סווינג הוא חלק מהפעמה — 50% ישר, בערך 67% טריולי. הקשיבו איפה נוחת הצליל הקצר.' },
        show: { text: { en: 'where is the short note?', he: 'איפה הצליל הקצר?' } },
      },
    ],
  },
  // ------------------------------------------------------------------ iqa'at
  {
    id: 'eastern-rhythm',
    area: 'world',
    emoji: '🪘',
    title: { en: 'Middle-Eastern rhythms', he: 'מקצבים מזרחיים' },
    takeaway: { en: 'Iqa\'at are cycles of dum (low) and tek (high): maqsum, baladi, saidi, malfuf — plus samai in 10/8 and karsilama in 9/8.', he: 'איקאעאת הם מחזורים של דום (נמוך) ותק (גבוה): מקסום, בלדי, סעידי, מלפוף — ועוד סמאעי ב־10/8 וקרשילמה ב־9/8.' },
    steps: [
      {
        say: { en: 'Ahlan, {name}! Arabic music rides on rhythm cycles called iqa\'at. They\'re spoken in two sounds: dum, the deep centre of the drum, and tek, the sharp rim.', he: 'אהלן {name}! המוזיקה הערבית רוכבת על מחזורי קצב שנקראים איקאעאת. אומרים אותם בשני צלילים: דום, המרכז העמוק של התוף, ותק, השפה החדה.' },
        play: [drum('D---T---', 0.2, 2)],
        show: { text: { en: 'dum = low · tek = high', he: 'דום = נמוך · תק = גבוה' } },
      },
      {
        say: { en: 'Maqsum is the everyday one: dum tek, tek dum, tek.', he: 'מקסום הוא היומיומי: דום תק, תק דום, תק.' },
        play: [drum(IQA.maqsum, 0.2, 3)],
        show: { text: { en: 'D T - T D - T -', he: 'ד ת - ת ד - ת -' } },
      },
      {
        say: { en: 'Baladi opens with two dums: dum dum, tek dum, tek. Heavier, earthier.', he: 'בלדי פותח בשני דומים: דום דום, תק דום, תק. כבד יותר, ארצי יותר.' },
        play: [drum(IQA.baladi, 0.2, 3)],
        show: { text: { en: 'D D - T D - T -', he: 'ד ד - ת ד - ת -' } },
      },
      {
        say: { en: 'Saidi moves the double dum to the middle: dum tek, dum dum, tek. It\'s the rhythm of Upper Egypt.', he: 'סעידי מעביר את הדום הכפול לאמצע: דום תק, דום דום, תק. זה המקצב של מצרים העילית.' },
        play: [drum(IQA.saidi, 0.2, 3)],
        show: { text: { en: 'D T - D D - T -', he: 'ד ת - ד ד - ת -' } },
      },
      {
        say: { en: 'Malfuf is quick and spinning: one dum and two teks, grouped 3+3+2.', he: 'מלפוף מהיר ומסתובב: דום אחד ושני תק, בחלוקה 3+3+2.' },
        play: [drum(IQA.malfuf, 0.2, 3)],
        show: { text: { en: 'D - - T - - T -', he: 'ד - - ת - - ת -' } },
      },
      {
        say: { en: 'Two longer cycles: samai has ten beats, with a dum dum in the middle. Karsilama has nine, 2+2+2+3, ending tek tek tek.', he: 'ושני מחזורים ארוכים: לסמאעי יש עשר פעמות, עם דום דום באמצע. לקרשילמה יש תשע, 2+2+2+3, והיא נגמרת בתק תק תק.' },
        play: [drum(IQA.samai, 0.17, 2), drum(IQA.karsilama, 0.17, 2)],
        show: { text: { en: '10/8: D - - T - D D T - -  ·  9/8: D - T - D - T T T', he: '10/8: ד - - ת - ד ד ת - -  ·  9/8: ד - ת - ד - ת ת ת' } },
      },
      {
        say: { en: 'Your turn! Listen for where the dums fall — low is dum, high is tek — and name the rhythm.', he: 'תורכם! הקשיבו איפה נופלים הדומים — נמוך זה דום, גבוה זה תק — ואמרו את שם המקצב.' },
        show: { text: { en: 'where are the dums?', he: 'איפה הדומים?' } },
      },
    ],
    more: [
      {
        say: { en: 'An iqa\' (plural iqa\'at) is a repeating rhythmic cycle, defined by where its dums and teks fall. Maqsum, baladi and saidi each fill a 4/4 bar of eight eighths; malfuf is usually written in 2/4 and played fast.', he: 'איקאע (ברבים איקאעאת) הוא מחזור קצבי חוזר, שמוגדר לפי המקום של הדומים והתקים בו. מקסום, בלדי וסעידי ממלאים כל אחד תיבה של 4/4 עם שמונה שמיניות; מלפוף נכתב בדרך כלל ב־2/4 ומנוגן מהר.' },
        show: { text: { en: '4/4: maqsum · baladi · saidi  ·  2/4: malfuf', he: '4/4: מקסום · בלדי · סעידי  ·  2/4: מלפוף' } },
      },
      {
        say: { en: 'On the darbuka, the goblet drum, dum is a stroke of the strong hand near the centre; tek is a sharp stroke on the rim. A tek played by the other hand is often called ka.', he: 'על הדרבוקה, תוף הגביע, דום הוא מכה של היד החזקה ליד המרכז; תק הוא מכה חדה על השפה. תק שמנוגן ביד השנייה נקרא לעתים קרובות קה.' },
        show: { text: { en: 'dum = centre · tek = rim · ka = other hand', he: 'דום = מרכז · תק = שפה · קה = היד השנייה' } },
      },
      {
        say: { en: 'Listening strategy: ignore the teks and follow the dums. Maqsum starts dum-tek; baladi starts dum-dum. Hear them back to back — that second dum gives baladi away.', he: 'אסטרטגיית האזנה: התעלמו מהתקים ועקבו אחרי הדומים. מקסום מתחיל דום-תק; בלדי מתחיל דום-דום. שמעו אותם ברצף — הדום השני מסגיר את הבלדי.' },
        play: [drum(IQA.maqsum, 0.2, 2), drum(IQA.baladi, 0.2, 2)],
        show: { text: { en: 'D T - T D - T -  ·  D D - T D - T -', he: 'ד ת - ת ד - ת -  ·  ד ד - ת ד - ת -' } },
      },
      {
        say: { en: 'Drummers rarely play the bare skeleton. They fill the gaps with light teks and rolls, while the dums stay in place. Here is maqsum filled in: every slot sounds, yet the dums still mark the cycle.', he: 'מתופפים כמעט אף פעם לא מנגנים את השלד החשוף. הם ממלאים את הרווחים בתקים קלים ובגלגולים, והדומים נשארים במקומם. הנה מקסום ממולא: כל משבצת נשמעת, ובכל זאת הדומים מסמנים את המחזור.' },
        play: [drum('DTTTDTTT', 0.17, 3)],
        show: { text: { en: 'D T t T D t T t', he: 'ד ת ת ת ד ת ת ת' } },
      },
      {
        say: { en: 'Malfuf groups its eight eighths 3 + 3 + 2, the same grouping as the Latin tresillo. Played fast, it feels like a spinning pulse in two, a common choice for quick, light passages.', he: 'מלפוף מחלק את שמונה השמיניות שלו ל־3 + 3 + 2, אותה חלוקה כמו הטרסיו הלטיני. כשמנגנים אותו מהר, הוא מרגיש כמו דופק מסתובב בשתיים, בחירה נפוצה לקטעים מהירים וקלילים.' },
        play: [drum(IQA.malfuf, 0.13, 4)],
        show: { text: { en: '3 + 3 + 2', he: '3 + 3 + 2' } },
      },
      {
        say: { en: 'The long cycles belong to particular forms. Samai thaqil, in 10/8, carries the classical instrumental form called sama\'i. Karsilama, in 9/8 grouped 2 + 2 + 2 + 3, is a lively dance rhythm of Turkey and Greece.', he: 'המחזורים הארוכים שייכים לצורות מסוימות. סמאעי ת׳קיל, ב־10/8, נושא את הצורה הכלית הקלאסית שנקראת סמאעי. קרשילמה, ב־9/8 בחלוקה 2 + 2 + 2 + 3, היא מקצב ריקוד עליז מטורקיה ומיוון.' },
        show: { text: { en: '10/8 samai · 9/8 karsilama', he: '10/8 סמאעי · 9/8 קרשילמה' } },
      },
      {
        say: { en: 'To learn a rhythm, speak it before you play it: "dum tek, tek dum, tek" over a steady foot. Then tap the dums with the right hand and the teks with the left on your knees. Keep the cycle going without stopping at its end.', he: 'כדי ללמוד מקצב, אמרו אותו לפני שאתם מנגנים: "דום תק, תק דום, תק" מעל רגל יציבה. אחר כך הקישו את הדומים ביד ימין ואת התקים ביד שמאל על הברכיים. המשיכו את המחזור בלי לעצור בסופו.' },
      },
      {
        say: { en: 'The common mistake is mixing up maqsum and saidi. Both start dum-tek; the difference is in the middle, where saidi has two dums in a row and maqsum has tek-dum. Hear saidi again with that in mind.', he: 'הטעות הנפוצה היא לבלבל בין מקסום לסעידי. שניהם מתחילים דום-תק; ההבדל באמצע, שם לסעידי יש שני דומים ברצף ולמקסום תק-דום. שמעו שוב את הסעידי עם זה בראש.' },
        play: [drum(IQA.saidi, 0.2, 2)],
        show: { text: { en: 'D T - D D - T -', he: 'ד ת - ד ד - ת -' } },
      },
      {
        say: { en: 'Maqsum underlies a huge share of Egyptian song and of Mizrahi pop in Israel. Baladi is a staple of belly dance, and saidi accompanies the stick dance of Upper Egypt.', he: 'מקסום עומד בבסיס של חלק עצום מהשיר המצרי ושל הפופ המזרחי בישראל. בלדי הוא עמוד תווך של ריקוד הבטן, וסעידי מלווה את ריקוד המקלות של מצרים העילית.' },
      },
      {
        say: { en: 'To keep: an iqa\' is a cycle you recognise by its dums. Learn the skeleton, then hear it through the ornaments.', he: 'לזכור: איקאע הוא מחזור שמזהים לפי הדומים שלו. לומדים את השלד, ואז שומעים אותו דרך הקישוטים.' },
        show: { text: { en: 'follow the dums', he: 'עקבו אחרי הדומים' } },
      },
    ],
  },
  // ------------------------------------------------------------------ inner clock
  {
    id: 'perform-clock',
    area: 'play',
    emoji: '⏱️',
    title: { en: 'Your inner clock', he: 'השעון הפנימי' },
    takeaway: { en: 'Keep the beat when the metronome goes silent; getting ahead is rushing, falling behind is dragging.', he: 'שומרים על הפעמה כשהמטרונום משתתק; להקדים זה למהר, לפגר זה לגרור.' },
    steps: [
      {
        say: { en: 'Hey {name}! Every musician carries an inner clock. This drill checks how steady yours is when nobody keeps time for you.', he: 'היי {name}! לכל מוזיקאי יש שעון פנימי. התרגיל הזה בודק כמה יציב שלכם כשאף אחד לא שומר לכם על הקצב.' },
        play: [clock(96, [0, 1, 2, 3, 4, 5, 6, 7], 8)],
        show: { text: { en: '1 2 3 4  1 2 3 4', he: '1 2 3 4  1 2 3 4' } },
      },
      {
        say: { en: 'First, two bars with the metronome. Tap along on every beat and settle in.', he: 'קודם, שתי תיבות עם המטרונום. הקישו יחד איתו על כל פעמה והתמקמו.' },
        show: { text: { en: '2 bars: click', he: '2 תיבות: קליק' } },
      },
      {
        say: { en: 'Then the click goes silent for 2, 4 or 8 bars — your choice — and one bar comes back to check you. Keep tapping right through the silence.', he: 'ואז הקליק משתתק ל־2, 4 או 8 תיבות — לבחירתכם — ותיבה אחת חוזרת כדי לבדוק אתכם. המשיכו להקיש לאורך כל השקט.' },
        play: [clock(96, [0, 1, 2, 3, 8, 9, 10, 11], 12)],
        show: { text: { en: 'click · silence · click', he: 'קליק · שקט · קליק' } },
      },
      {
        say: { en: 'Get ahead and you\'re rushing — the classic when you\'re excited. Hear a tapper speed up in the silence and land early.', he: 'אם אתם מקדימים, אתם ממהרים — הקלאסיקה כשמתרגשים. שמעו מקיש שמאיץ בשקט ונוחת מוקדם.' },
        play: [clock(RUSH_BPM, [0, 1, 2, 3, 8, 9, 10, 11], 12, rushTaps)],
        show: { text: { en: 'rushing = early', he: 'ממהרים = מוקדם' } },
      },
      {
        say: { en: 'Fall behind and you\'re dragging. Either way, the returning click tells the truth.', he: 'אם אתם מפגרים, אתם גוררים. כך או כך, הקליק שחוזר מגלה את האמת.' },
        show: { text: { en: 'dragging = late', he: 'גוררים = מאוחר' } },
      },
      {
        say: { en: 'Trick: move with it. Nod, tap a foot, breathe in time. Your body keeps time better than counting alone.', he: 'טריק: זוזו עם זה. הנהנו, הקישו ברגל, נשמו בקצב. הגוף שומר על זמן טוב יותר מספירה לבד.' },
        play: [clock(96, [0, 1, 2, 3], 4)],
        show: { text: { en: 'nod · tap · breathe', he: 'הנהון · הקשה · נשימה' } },
      },
      {
        say: { en: 'Your turn! Pick a tempo and the silent bars, tap the pad or press Space on every beat, and I\'ll tell you: steady, rushing or dragging.', he: 'תורכם! בחרו קצב ומספר תיבות שקטות, הקישו על הכפתור או על רווח בכל פעמה, ואני אגיד לכם: יציב, ממהר או גורר.' },
        show: { text: { en: 'steady · rushing · dragging', he: 'יציב · ממהר · גורר' } },
      },
    ],
    more: [
      {
        say: { en: 'Your inner clock is your ability to keep a steady tempo without outside help. Its errors are measured in milliseconds: an early tap is rushing, a late one dragging. The goal is not perfection, but a small and consistent error.', he: 'השעון הפנימי הוא היכולת לשמור על קצב יציב בלי עזרה מבחוץ. הטעויות שלו נמדדות באלפיות שנייה: הקשה מוקדמת היא מיהור, מאוחרת היא גרירה. המטרה היא לא שלמות, אלא טעות קטנה ועקבית.' },
        show: { text: { en: 'early = rushing · late = dragging', he: 'מוקדם = ממהר · מאוחר = גורר' } },
      },
      {
        say: { en: 'Surprisingly, slow tempos are harder to hold than medium ones: the gap between beats is long, and the mind fills it badly. Here is 60 BPM — four clicks, then four silent beats. Try to feel where they fall.', he: 'באופן מפתיע, קשה יותר להחזיק קצב איטי מאשר בינוני: המרווח בין הפעמות ארוך, והמוח ממלא אותו גרוע. הנה 60 BPM — ארבעה קליקים, ואז ארבע פעמות שקטות. נסו להרגיש איפה הן נופלות.' },
        play: [clock(60, [0, 1, 2, 3], 8)],
        show: { text: { en: '1 2 3 4  (5 6 7 8)', he: '1 2 3 4  (5 6 7 8)' } },
      },
      {
        say: { en: 'The fix is subdivision. Count "1 & 2 &" in your head, so every gap has a landmark in the middle. Hear the same 60 BPM with the halves filled in: the silence suddenly has a shape.', he: 'התיקון הוא חלוקה פנימית. ספרו "1 ו 2 ו" בראש, כך שלכל מרווח יש נקודת ציון באמצע. שמעו את אותו 60 BPM עם החצאים ממולאים: לשקט פתאום יש צורה.' },
        play: [clock(60, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 5)],
        show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 ו 2 ו 3 ו 4 ו' } },
      },
      {
        say: { en: 'Dragging sounds like this: on time with the click, then each tap a little late, so when the click returns the taps trail behind it. Rushing is the mirror image, and usually comes from excitement or tension.', he: 'כך נשמעת גרירה: בזמן עם הקליק, ואז כל הקשה קצת מאוחרת, כך שכשהקליק חוזר ההקשות מזדנבות אחריו. מיהור הוא תמונת המראה, ובדרך כלל נובע מהתרגשות או ממתח.' },
        play: [clock(RUSH_BPM, [0, 1, 2, 3, 8, 9, 10, 11], 13, dragTaps)],
        show: { text: { en: 'dragging = late', he: 'גוררים = מאוחר' } },
      },
      {
        say: { en: 'A proven practice ladder: first the metronome on every beat, then only on beats 2 and 4, then once per bar, then with silent bars. Each step hands more of the job to you. Hear clicks on 2 and 4.', he: 'סולם תרגול מוכח: קודם מטרונום על כל פעמה, אחר כך רק על 2 ו־4, אחר כך פעם בתיבה, ואחר כך עם תיבות שקטות. כל שלב מעביר יותר מהעבודה אליכם. שמעו קליקים על 2 ו־4.' },
        play: [clock(80, [1, 3, 5, 7], 8)],
        show: { text: { en: '· 2 · 4 · 2 · 4', he: '· 2 · 4 · 2 · 4' } },
      },
      {
        say: { en: 'The common mistake is jumping when the click returns and you find you are off. Do not lurch to catch it; adjust gently over a beat or two, as a band would. And breathe — tension makes almost everyone rush.', he: 'הטעות הנפוצה היא לקפוץ כשהקליק חוזר ומגלים שזזתם. אל תזנקו כדי לתפוס אותו; תקנו בעדינות לאורך פעמה או שתיים, כמו שלהקה הייתה עושה. ונשמו — מתח גורם כמעט לכל אחד למהר.' },
      },
      {
        say: { en: 'In a band, the drummer and bassist hold the time for everyone, and studios often record to a click track. Steady time is also what makes deliberate freedom, like rubato in a ballad, sound intended rather than unsteady.', he: 'בלהקה, המתופף והבסיסט מחזיקים את הזמן בשביל כולם, ובאולפנים מקליטים הרבה פעמים עם קליק. זמן יציב הוא גם מה שגורם לחופש מכוון, כמו רובאטו בבלדה, להישמע מתוכנן ולא רעוע.' },
      },
      {
        say: { en: 'To keep: subdivide the silence, move with the beat, and correct gently. A steady inner clock is the base of every groove.', he: 'לזכור: חלקו את השקט, זוזו עם הפעמה, ותקנו בעדינות. שעון פנימי יציב הוא הבסיס של כל גרוב.' },
        show: { text: { en: 'subdivide · move · correct gently', he: 'לחלק · לזוז · לתקן בעדינות' } },
      },
    ],
  },
  // ------------------------------------------------------------------ Beat Echo
  {
    id: 'game-beat',
    area: 'play',
    emoji: '👏',
    title: { en: 'Beat Echo', he: 'הד קצבי' },
    takeaway: { en: 'Hear a rhythm, wait for the four clicks, tap it back — each pass adds one beat.', he: 'שומעים קצב, מחכים לארבעת הקליקים, מקישים אותו בחזרה — כל הצלחה מוסיפה פעמה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Beat Echo is a memory game for your hands. I play a rhythm, you tap it back.', he: 'היי {name}! הד קצבי הוא משחק זיכרון לידיים. אני מנגן קצב, ואתם מקישים אותו בחזרה.' },
        play: [echo([0, 1, 1.5], 2, 90, false)],
        show: { text: { en: 'ta ti-ti', he: 'טה טי-טי' } },
      },
      {
        say: { en: 'Four clicks set the tempo. Then the rhythm plays on a woodblock, over a soft pulse.', he: 'ארבעה קליקים קובעים את הקצב. ואז הקצב מתנגן על בלוק עץ, מעל דופק רך.' },
        show: { text: { en: '1 2 3 4 → rhythm', he: '1 2 3 4 ← קצב' } },
      },
      {
        say: { en: 'Then four more clicks — your count-in. Start tapping right after them: same rhythm, same speed.', he: 'אחר כך עוד ארבעה קליקים — הספירה שלכם. התחילו להקיש מיד אחריהם: אותו קצב, אותה מהירות.' },
        play: [echo([0, 1, 1.5], 2, 90, true)],
        show: { text: { en: 'listen · 1 2 3 4 · tap!', he: 'הקשבה · 1 2 3 4 · הקשה!' } },
      },
      {
        say: { en: 'Each beat holds a quarter or two eighths. From four beats on, watch out for silent beats and lone off-beat eighths.', he: 'בכל פעמה יש רבע או שתי שמיניות. מארבע פעמות והלאה, היזהרו מפעמות שקטות ומשמיניות בודדות בין הפעמות.' },
        play: [echo([0, 0.5, 1, 3.5], 4, 90, false)],
        show: { text: { en: 'ti-ti  ta  sh  sh-ti', he: 'טי-טי  טה  שְׁ  שְׁ-טי' } },
      },
      {
        say: { en: 'You start at two beats. Every rhythm you nail grows by one beat. Playing solo, one miss ends the game — so your longest echo is your score.', he: 'מתחילים בשתי פעמות. כל קצב שאתם מצליחים מתארך בפעמה אחת. במשחק לבד, טעות אחת מסיימת — אז ההד הכי ארוך שלכם הוא הניקוד.' },
        show: { text: { en: '2 → 3 → 4 → …', he: '2 ← 3 ← 4 ← …' } },
      },
      {
        say: { en: 'Trick: don\'t memorise taps — sing it in your head, "ti-ti ta sh sh-ti", and tap what you sing.', he: 'טריק: אל תשננו הקשות — שירו את זה בראש, "טי-טי טה שְׁ שְׁ-טי", והקישו את מה שאתם שרים.' },
        play: [echo([0, 0.5, 1, 3.5], 4, 90, false)],
        show: { text: { en: 'sing it, then tap it', he: 'שרים, ואז מקישים' } },
      },
      {
        say: { en: 'Your turn! Listen, wait for the four clicks, then tap the pad or press Space. How long can you go?', he: 'תורכם! הקשיבו, חכו לארבעת הקליקים, ואז הקישו על הכפתור או על רווח. כמה רחוק תגיעו?' },
        show: { text: { en: 'listen · wait · tap', he: 'הקשבה · המתנה · הקשה' } },
      },
    ],
    more: [
      {
        say: { en: 'Beat Echo trains rhythmic memory: hearing a pattern once, holding it, and reproducing it in time. It is the old call and response of music teaching — the teacher plays, the student answers.', he: 'הד קצבי מאמן זיכרון קצבי: לשמוע דפוס פעם אחת, להחזיק אותו, ולשחזר אותו בזמן. זו הקריאה והתשובה הוותיקה של הוראת המוזיקה — המורה מנגן, התלמיד עונה.' },
        show: { text: { en: 'call → response', he: 'קריאה ← תשובה' } },
      },
      {
        say: { en: 'The key is chunking. Every beat in the game is one of four shapes: ta, ti-ti, a silent beat, or sh-ti. Name each beat as it passes, and a long rhythm becomes a short list of words.', he: 'המפתח הוא חלוקה לגושים. כל פעמה במשחק היא אחת מארבע צורות: טה, טי-טי, פעמה שקטה, או שְׁ-טי. תנו שם לכל פעמה כשהיא עוברת, ומקצב ארוך הופך לרשימה קצרה של מילים.' },
        play: [echo([0, 1, 1.5, 2, 3.5], 4, 90, false)],
        show: { text: { en: 'ta  ti-ti  ta  sh-ti', he: 'טה  טי-טי  טה  שְׁ-טי' } },
      },
      {
        say: { en: 'Listening strategy: anchor on the soft pulse under the woodblock. For each pulse, ask: did a note start with it, after it, both, or neither? Those four answers are the four shapes.', he: 'אסטרטגיית האזנה: היאחזו בדופק הרך שמתחת לבלוק העץ. על כל דופק שאלו: האם צליל התחיל איתו, אחריו, גם וגם, או אף אחד? ארבע התשובות האלה הן ארבע הצורות.' },
        show: { text: { en: 'with = ta · both = ti-ti · after = sh-ti · neither = sh', he: 'איתו = טה · גם וגם = טי-טי · אחריו = שְׁ-טי · אף אחד = שְׁ' } },
      },
      {
        say: { en: 'To answer well, keep the beat in your foot or head through the count-in, and keep it going while you tap. Short, relaxed taps are more precise than heavy ones. Start on the beat right after the fourth click.', he: 'כדי לענות טוב, החזיקו את הפעמה ברגל או בראש לאורך הספירה, והמשיכו אותה בזמן שאתם מקישים. הקשות קצרות ורפויות מדויקות יותר מכבדות. התחילו על הפעמה שמיד אחרי הקליק הרביעי.' },
      },
      {
        say: { en: 'Two classic mistakes: a lone off-beat note gets pulled onto the beat, and a silent beat gets skipped, so the answer comes out shorter than the call. Hear both traps: ta, sh-ti, ta, then a silent beat.', he: 'שתי טעויות קלאסיות: צליל בודד בין הפעמות נמשך אל הפעמה, ופעמה שקטה מדולגת, כך שהתשובה יוצאת קצרה מהקריאה. שמעו את שתי המלכודות: טה, שְׁ-טי, טה, ואז פעמה שקטה.' },
        play: [echo([0, 1.5, 2], 4, 90, false)],
        show: { text: { en: 'ta  sh-ti  ta  sh', he: 'טה  שְׁ-טי  טה  שְׁ' } },
      },
      {
        say: { en: 'Once rhythms grow past four beats, group them in pairs of beats, the way you remember a phone number in chunks. Three short phrases are far easier to hold than six separate beats.', he: 'כשהמקצבים עוברים ארבע פעמות, קבצו אותם לזוגות של פעמות, כמו שזוכרים מספר טלפון בגושים. שלושה משפטים קצרים הרבה יותר קל להחזיק משש פעמות נפרדות.' },
        play: [echo([0, 0.5, 1, 2, 2.5, 3, 4, 5.5], 6, 90, false)],
        show: { text: { en: 'ti-ti ta | ti-ti ta | ta sh-ti', he: 'טי-טי טה | טי-טי טה | טה שְׁ-טי' } },
      },
      {
        say: { en: 'Call and response runs through African drumming, gospel and the blues. Jazz musicians "trade fours", answering each other in four-bar solos, and many drum traditions are taught entirely by ear, phrase by phrase.', he: 'קריאה ותשובה עוברת דרך התיפוף האפריקאי, הגוספל והבלוז. נגני ג׳אז "מחליפים ארבע", עונים זה לזה בסולואים של ארבע תיבות, והרבה מסורות תיפוף נלמדות כולן בשמיעה, משפט אחר משפט.' },
      },
      {
        say: { en: 'To keep: hear in beat-sized words, keep the pulse running, and never skip the silent beats.', he: 'לזכור: שומעים במילים בגודל של פעמה, שומרים על הדופק רץ, ואף פעם לא מדלגים על הפעמות השקטות.' },
        show: { text: { en: 'ta · ti-ti · sh · sh-ti', he: 'טה · טי-טי · שְׁ · שְׁ-טי' } },
      },
    ],
  },
];
