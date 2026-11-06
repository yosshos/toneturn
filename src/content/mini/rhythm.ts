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
        say: { en: 'Your turn! After the count-in, tap the pad or press Space on every note you read. Then hear a bar and pick the notation that matches. Easy does it!', he: 'תורכם! אחרי הספירה, הקישו על הכפתור או על רווח בכל תו שאתם קוראים. אחר כך שמעו תיבה ובחרו את התווים שמתאימים לה. בנחת!' },
        show: { text: { en: '♩ = 1   𝅗𝅥 = 2   𝅝 = 4   𝄽 = sh', he: '♩ = 1   𝅗𝅥 = 2   𝅝 = 4   𝄽 = שְׁ' } },
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
        say: { en: 'Your turn! Tap what you read: hold the long note, then a quick tap on the "and". Then hear a bar and pick its notation. You\'ve got this!', he: 'תורכם! הקישו את מה שאתם קוראים: החזיקו את הצליל הארוך, ואז הקשה קצרה על ה"ו". אחר כך שמעו תיבה ובחרו את התווים שלה. אתם יכולים!' },
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
        say: { en: '12/8 is two bars of 6/8 glued together: four big beats, each split in three. Hello, slow blues.', he: '12/8 זה שתי תיבות של 6/8 מודבקות: ארבע פעמות גדולות, כל אחת מחולקת לשלוש. שלום, בלוז איטי.' },
        play: [R('m12:qe.qe.qe.dq', 84)],
        show: { text: { en: '12/8  ·  123 456 789 10-11-12', he: '12/8  ·  123 456 789 10-11-12' } },
      },
      {
        say: { en: 'Your turn! Check the meter first. In 6/8 and 12/8, feel the big beats and the three inside each. Tap what you read, then hear a bar and choose or build it.', he: 'תורכם! קודם בדקו את המשקל. ב־6/8 וב־12/8 הרגישו את הפעמות הגדולות ואת השלוש שבתוך כל אחת. הקישו את מה שאתם קוראים, ואז שמעו תיבה ובחרו או בנו אותה.' },
        show: { text: { en: '3/4 · 6/8 · 12/8', he: '3/4 · 6/8 · 12/8' } },
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
        say: { en: 'Hi {name}, welcome to jazz! Swing eighths are written as plain ti-ti, but played long-short. First even, then swung.', he: 'היי {name}, ברוכים הבאים לג׳אז! שמיניות סווינג כתובות כמו טי-טי רגיל, אבל מנוגנות ארוך-קצר. קודם שוות, ואז בסווינג.' },
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
  },
];
