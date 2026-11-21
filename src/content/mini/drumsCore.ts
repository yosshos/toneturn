// The drums course's core lessons (CURRICULUM-AUDIT-VOICE-DRUMS B5–B11, owner 2026-11-19): note values and rests on
// the snare, even strokes and dynamics, accents and ghost notes, flams and drags, the shuffle, the jazz ride, bossa and
// samba, the clave, Middle-Eastern rhythms on the kit, fills, rolls, independence, echo, and styles by ear. Short screens
// (one idea each, a sound and a written bar per concept), an in-depth part after. Every timed example counts in first.
//
// Middle-Eastern rhythms: only the standard skeletons (maqsum D T . T D . T ., baladi D D . T D . T ., malfuf 3+3+2,
// dum / tak / ka) — the same patterns as the d-mideast levels (drills/drums.ts ME). Latin: son, rumba and bossa clave,
// the bossa kick, the samba feet — as drills/drumStyles.ts. The teacher-check levels (mambo, songo, Mozambique) are not
// taught here.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { barHits, hitsToEvents, type KitBar } from '../../engine/kitRead';
import type { Lanes } from '../../engine/drills/drums';
import { CELLS, TPQ, rhythmFromKey } from '../../engine/rhythm';
import { DRUM_STYLES, styleSound } from '../../engine/topicsDrumStyle';

// ---------------------------------------------------------------- sound and notation helpers

/** One 4/4 bar of kit notation: `sub` steps a beat (2 = eighths, 3 = triplets, 4 = sixteenths). */
const bar4 = (lanes: Lanes, sub = 2, extra: Partial<KitBar> = {}): KitBar => ({ lanes, sub, steps: sub * 4, num: 4, den: 4, groups: [sub, sub, sub, sub], ...extra });

/** Four count-in clicks (accent on 1) from `t0`. */
const countIn = (bpm: number, beats = 4): NoteEvent[] => Array.from({ length: beats }, (_, i) => ({ midi: 0, start: (i * 60) / bpm, duration: 0.05, velocity: i ? 0.5 : 0.8, perc: i ? ('click' as const) : ('accent' as const) }));

/** Bars of kit notation played one after the other at `bpm`, after a count-in. */
function kit(bpm: number, bars: KitBar[], opts: { count?: boolean } = {}): Stimulus {
  const q = 60 / bpm;
  const ev: NoteEvent[] = opts.count === false ? [] : countIn(bpm);
  let at = opts.count === false ? 0 : 4; // beats
  for (const b of bars) {
    ev.push(...hitsToEvents(barHits(b), bpm, at * q));
    at += b.steps / b.sub;
  }
  return { kind: 'events', events: ev, length: at * q + 0.4 };
}
const twice = (b: KitBar): KitBar[] => [b, b];

/** A rhythm (rhythmFromKey key) on the snare after a count-in, soft clicks under it. */
function snare(key: string, bpm = 80): Stimulus {
  const r = rhythmFromKey(key);
  const q = 60 / bpm;
  const ev: NoteEvent[] = countIn(bpm);
  const t0 = 4 * q;
  let at = 0;
  for (const c of r.cells) {
    for (const e of CELLS[c].events) if (!e.rest) ev.push({ midi: 38, start: t0 + ((at + e.start) / TPQ) * q, duration: 0.08, velocity: 0.8, perc: 'snare' });
    at += CELLS[c].beats * TPQ;
  }
  const beats = at / TPQ;
  for (let i = 0; i < beats; i++) ev.push({ midi: 0, start: t0 + i * q, duration: 0.05, velocity: 0.28, perc: 'click' });
  return { kind: 'events', events: ev, length: t0 + beats * q + 0.3 };
}

/** Snare strokes at beats with velocities (dynamics), after a count-in. */
function strokes(bpm: number, hits: [number, number][], beats: number): Stimulus {
  const q = 60 / bpm;
  const ev: NoteEvent[] = countIn(bpm);
  for (const [b, v] of hits) ev.push({ midi: 38, start: (4 + b) * q, duration: 0.08, velocity: v, perc: v < 0.35 ? 'snare-soft' : 'snare' });
  return { kind: 'events', events: ev, length: (4 + beats) * q + 0.3 };
}
const even = (n: number, step: number, v = 0.7): [number, number][] => Array.from({ length: n }, (_, i) => [i * step, v]);

/** Darbuka strokes: D dum (low), T tak (high), K ka (soft), - rest, one character an eighth at `bpm`. */
function darbuka(pattern: string, bpm: number, times: number): Stimulus {
  const e = 30 / bpm;
  const ev: NoteEvent[] = countIn(bpm);
  const t0 = (4 * 60) / bpm;
  const p = pattern.replace(/\s/g, '');
  for (let r = 0; r < times; r++)
    [...p].forEach((ch, i) => {
      const t = t0 + (r * p.length + i) * e;
      if (ch === 'D') ev.push({ midi: 43, start: t, duration: 0.18, velocity: 0.9, perc: 'kick' });
      if (ch === 'T') ev.push({ midi: 79, start: t, duration: 0.06, velocity: 0.75, perc: 'snare-soft' });
      if (ch === 'K') ev.push({ midi: 79, start: t, duration: 0.05, velocity: 0.35, perc: 'snare-soft' });
    });
  return { kind: 'events', events: ev, length: t0 + p.length * times * e + 0.3 };
}

const style = (id: string) => styleSound(DRUM_STYLES.find((s) => s.id === id)!, 7, 2);

// Grooves used more than once.
const ROCK = bar4({ h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' });
const RIDE: Lanes = { r: 'x..x.xx..x.x' };
const SHUF_SN = '...x.....x..';

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ B5 note values and rests on the snare
  {
    id: 'drum-values',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Note values and rests', he: 'ערכי תווים והפסקות' },
    takeaway: { en: 'Quarter one beat, eighth half, sixteenth a quarter of a beat, half two; a dot adds half; rests are counted too.', he: 'רבע פעמה אחת, שמינית חצי, שש־עשרית רבע פעמה, חצי שתיים; נקודה מוסיפה חצי; גם הפסקות נספרות.' },
    steps: [
      { say: { en: 'A quarter note lasts one beat. Four of them fill a bar.', he: 'רבע נמשך פעמה אחת. ארבעה כאלה ממלאים תיבה.' }, show: { rhythm: 'q.q.q.q', text: { en: '1 2 3 4', he: '1 2 3 4' } }, play: [snare('q.q.q.q')] },
      { say: { en: 'Eighth notes split the beat in two: one and two and.', he: 'שמיניות מחלקות את הפעמה לשתיים: 1 וְ 2 וְ.' }, show: { rhythm: 'ee.ee.ee.ee', text: { en: '1 & 2 & 3 & 4 &', he: '1 וְ 2 וְ 3 וְ 4 וְ' } }, play: [snare('ee.ee.ee.ee')] },
      { say: { en: 'Sixteenths split it in four: one e and a.', he: 'שש־עשריות מחלקות אותה לארבע: 1 אִי וְ אָה.' }, show: { rhythm: 'ssss.ssss.q.q', text: { en: '1 e & a 2 e & a', he: '1 אִי וְ אָה 2 אִי וְ אָה' } }, play: [snare('ssss.ssss.q.q', 70)] },
      { say: { en: 'A half note lasts two beats: one stroke, then keep counting.', he: 'חצי נמשך שתי פעמות: מכה אחת, וממשיכים לספור.' }, show: { rhythm: 'h.h', text: { en: '1 (2) 3 (4)', he: '1 (2) 3 (4)' } }, play: [snare('h.h')] },
      { say: { en: 'A dot adds half the value. A dotted quarter is one and a half beats.', he: 'נקודה מוסיפה חצי מהערך. רבע עם נקודה הוא פעמה וחצי.' }, show: { rhythm: 'dqe.dqe', text: { en: '♩. = 1½', he: '♩. = 1½' } }, play: [snare('dqe.dqe')] },
      { say: { en: 'A rest is silence of the same length. Count straight through it.', he: 'הפסקה היא שקט באותו אורך. סופרים דרכה בלי לעצור.' }, show: { rhythm: 'q.qr.q.qr', text: { en: '1 (2) 3 (4)', he: '1 (2) 3 (4)' } }, play: [snare('q.qr.q.qr')] },
      { say: { en: 'Your turn: how many beats, and which bar did the snare play?', he: 'תורכם: כמה פעמות, ואיזו תיבה ניגן הסנר?' }, show: { text: { en: '♩ = 1 · ♪ = ½ · 𝄽 = 1', he: '♩ = 1 · ♪ = ½ · 𝄽 = 1' } } },
    ],
    more: [
      { say: { en: 'An eighth rest takes half a beat. Here every stroke lands on the "and": count the number silently, play the "and".', he: 'הפסקת שמינית לוקחת חצי פעמה. כאן כל מכה נוחתת על ה״וְ״: סופרים את המספר בשקט, ומנגנים את ה״וְ״.' }, show: { rhythm: 'ere.ere.ere.ere' }, play: [snare('ere.ere.ere.ere')] },
      { say: { en: 'Flags and beams mean the same. An eighth alone has a flag; eighths or sixteenths inside one beat are joined by a beam, so you see where every beat starts.', he: 'דגלים וקורות אומרים אותו דבר. לשמינית לבד יש דגל; שמיניות או שש־עשריות בתוך פעמה אחת מחוברות בקורה, וכך רואים איפה מתחילה כל פעמה.' }, show: { rhythm: 'q.ee.ssss.q' }, play: [snare('q.ee.ssss.q', 72)] },
      { say: { en: 'On the drums a long note does not ring longer: the snare dies away at once. The written length is the space before the next stroke, so a half note means: wait.', he: 'בתופים תו ארוך לא מצלצל יותר זמן: הסנר דועך מיד. האורך הכתוב הוא המרווח עד המכה הבאה, אז חצי פירושו: לחכות.' }, play: [snare('h.q.q')] },
      { say: { en: 'The common mistake is rushing through rests and long notes: the next stroke comes early because nothing filled the gap. Count every beat out loud, played or not.', he: 'הטעות הנפוצה היא למהר דרך הפסקות ותווים ארוכים: המכה הבאה מגיעה מוקדם כי שום דבר לא מילא את הרווח. סופרים כל פעמה בקול, מנוגנת או לא.' }, play: [snare('q.qr.qr.q')] },
      { say: { en: 'A reading tip: keep a quiet pulse with your left foot on the hi-hat while you read. The foot keeps the beats; the hands read the lengths.', he: 'טיפ לקריאה: שמרו על דופק שקט ברגל שמאל על ההיי־האט בזמן הקריאה. הרגל שומרת על הפעמות; הידיים קוראות את האורכים.' } },
      { say: { en: 'Recap: a quarter is one beat, an eighth half, a sixteenth a quarter of a beat, a half two. A dot adds half, and rests count like notes.', he: 'לסיכום: רבע הוא פעמה אחת, שמינית חצי, שש־עשרית רבע פעמה, חצי שתיים. נקודה מוסיפה חצי, והפסקות נספרות כמו תווים.' }, show: { text: { en: '♩ 1 · ♪ ½ · 𝅘𝅥𝅯 ¼ · 𝅗𝅥 2', he: '♩ 1 · ♪ ½ · 𝅘𝅥𝅯 ¼ · 𝅗𝅥 2' } } },
    ],
  },

  // ------------------------------------------------------------------ B11 d-strokes: even strokes and dynamics
  {
    id: 'drum-strokes',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Even strokes, three heights', he: 'מכות שוות, שלושה גבהים' },
    takeaway: { en: 'Same height, same speed, same spot: same sound. One hand at a time; low sticks play p, middle mf, high f.', he: 'אותו גובה, אותה מהירות, אותו מקום: אותו צליל. יד אחת בכל פעם; מקלות נמוכים מנגנים p, באמצע mf, גבוהים f.' },
    steps: [
      { say: { en: 'Even strokes sound alike: same height, same speed, same spot on the head.', he: 'מכות שוות נשמעות אותו דבר: אותו גובה, אותה מהירות, אותו מקום על העור.' }, show: { kit: bar4({ s: 'x.x.x.x.' }), text: { en: 'R R R R', he: 'R R R R' } }, play: [strokes(80, even(4, 1), 4)] },
      { say: { en: 'Listen: even quarters, then uneven ones. Hear the bumps?', he: 'הקשיבו: רבעים שווים, ואז לא שווים. שומעים את הבליטות?' }, play: [strokes(80, [...even(4, 1), [4, 0.8], [5.08, 0.5], [6, 0.9], [6.95, 0.45]], 8)] },
      { say: { en: 'One hand at a time first. The weaker hand needs the most work.', he: 'קודם יד אחת בכל פעם. היד החלשה צריכה הכי הרבה עבודה.' }, show: { text: { en: 'R R R R · L L L L', he: 'R R R R · L L L L' } }, play: [strokes(80, even(8, 1), 8)] },
      { say: { en: 'Height sets loudness. Low sticks play soft, p. High sticks play loud, f.', he: 'הגובה קובע את העוצמה. מקלות נמוכים מנגנים חלש, p. מקלות גבוהים מנגנים חזק, f.' }, show: { text: { en: 'p · f', he: 'p · f' } }, play: [strokes(80, [...even(4, 1, 0.3), ...even(4, 1, 0.95).map(([b, v]) => [b + 4, v] as [number, number])], 8)] },
      { say: { en: 'The middle height gives mf. Hold each level for a whole bar.', he: 'הגובה האמצעי נותן mf. מחזיקים כל עוצמה תיבה שלמה.' }, show: { text: { en: 'p · mf · f', he: 'p · mf · f' } }, play: [strokes(90, [...even(4, 1, 0.3), ...even(4, 1, 0.6).map(([b, v]) => [b + 4, v] as [number, number]), ...even(4, 1, 0.95).map(([b, v]) => [b + 8, v] as [number, number])], 12)] },
      { say: { en: 'Your turn: even quarters, then eighths, then three heights on cue.', he: 'תורכם: רבעים שווים, אחר כך שמיניות, ואז שלושה גבהים לפי הסימן.' }, show: { kit: bar4({ s: 'xxxxxxxx' }), text: { en: 'R L R L R L R L', he: 'R L R L R L R L' } } },
    ],
    more: [
      { say: { en: 'The app measures each stroke twice: when it lands against the click, and how hard it is. Even means both match the stroke before.', he: 'האפליקציה מודדת כל מכה פעמיים: מתי היא נוחתת מול הקליק, וכמה היא חזקה. שווה פירושו ששניהם תואמים את המכה הקודמת.' } },
      { say: { en: 'Throw the stick down and let it rebound to where it started. A stroke that ends at the height it began needs no extra effort for the next one.', he: 'זורקים את המקל למטה ונותנים לו לקפוץ חזרה למקום שממנו התחיל. מכה שנגמרת בגובה שבו התחילה לא צריכה מאמץ נוסף בשביל הבאה.' }, play: [strokes(72, even(8, 0.5, 0.65), 4)] },
      { say: { en: 'The common mistake: the hand gets louder as it speeds up, or softer as it tires. Keep the height fixed and let the tempo change only the speed.', he: 'הטעות הנפוצה: היד מתחזקת כשהיא מאיצה, או נחלשת כשהיא מתעייפת. שומרים על הגובה קבוע, ונותנים לטמפו לשנות רק את המהירות.' }, play: [strokes(80, [[0, 0.5], [0.5, 0.55], [1, 0.62], [1.5, 0.7], [2, 0.78], [2.5, 0.86], [3, 0.92], [3.5, 1]], 4)] },
      { say: { en: 'Watch your hands in a mirror or film them: two sticks at the same height look like a matched pair.', he: 'הסתכלו על הידיים במראה או צלמו אותן: שני מקלות באותו גובה נראים כמו זוג תואם.' } },
      { say: { en: 'Dynamics are written under the staff: p for piano, soft; mf for mezzo-forte, medium; f for forte, loud.', he: 'דינמיקה נכתבת מתחת לחמשה: p לפיאנו, חלש; mf למצו־פורטה, בינוני; f לפורטה, חזק.' }, show: { text: { en: 'p · mf · f', he: 'p · mf · f' } } },
      { say: { en: 'A practice tip: one minute of quarters on each hand every day, with the click at a slow tempo. The weaker hand shows itself in softer, later strokes.', he: 'טיפ לתרגול: דקה של רבעים בכל יד בכל יום, עם הקליק בטמפו איטי. היד החלשה מתגלה במכות רכות ומאחרות יותר.' } },
      { say: { en: 'Recap: same height for the same sound, one hand at a time, low for soft and high for loud, and every level held steady.', he: 'לסיכום: אותו גובה לאותו צליל, יד אחת בכל פעם, נמוך לחלש וגבוה לחזק, וכל עוצמה נשמרת יציבה.' } },
    ],
  },

  // ------------------------------------------------------------------ B6 accents and ghost notes
  {
    id: 'drum-accents',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Accents and ghost notes', he: 'הדגשות ותווי רפאים' },
    takeaway: { en: 'Three heights: a full stroke for the accent (>), a low tap, a ghost note softer still (in brackets). The backbeat is loud on 2 and 4.', he: 'שלושה גבהים: מכה מלאה להדגשה (>), נקישה נמוכה, תו רפאים רך עוד יותר (בסוגריים). הבקביט חזק על 2 ו־4.' },
    steps: [
      { say: { en: 'Three stick heights make three sounds: full, tap and ghost.', he: 'שלושה גבהים של המקל יוצרים שלושה צלילים: מלאה, נקישה ורפאים.' }, show: { text: { en: 'full · tap · ghost', he: 'מלאה · נקישה · רפאים' } }, play: [strokes(70, [[0, 0.95], [1, 0.55], [2, 0.2], [4, 0.95], [5, 0.55], [6, 0.2]], 8)] },
      { say: { en: 'An accent is a full stroke from high up. It is written with >.', he: 'הדגשה היא מכה מלאה מגובה. כותבים אותה עם >.' }, show: { kit: bar4({ s: 'Xxxxxxxx' }) }, play: [kit(80, twice(bar4({ s: 'Xxxxxxxx' })))] },
      { say: { en: 'Taps are low, soft strokes between accents. Same hand, lower height.', he: 'נקישות הן מכות נמוכות ורכות בין ההדגשות. אותה יד, גובה נמוך יותר.' }, show: { kit: bar4({ s: 'XxxxXxxxXxxxXxxx' }, 4) }, play: [kit(70, twice(bar4({ s: 'XxxxXxxxXxxxXxxx' }, 4)))] },
      { say: { en: 'A ghost note is softer still, almost silent. It is written in brackets.', he: 'תו רפאים רך עוד יותר, כמעט שקט. כותבים אותו בסוגריים.' }, show: { kit: bar4({ s: '..g.X..g..g.X...' }, 4) }, play: [kit(76, twice(bar4({ s: '..g.X..g..g.X...' }, 4)))] },
      { say: { en: 'The backbeat: accents on 2 and 4, ghosts in between. That is funk.', he: 'הבקביט: הדגשות על 2 ו־4, תווי רפאים ביניהן. זה פאנק.' }, show: { kit: bar4({ h: 'x.x.x.x.x.x.x.x.', s: '....X..g.g..X...', k: 'x.......x.......' }, 4) }, play: [kit(84, twice(bar4({ h: 'x.x.x.x.x.x.x.x.', s: '....X..g.g..X...', k: 'x.......x.......' }, 4)))] },
      { say: { en: 'Your turn: accents and taps, then ghosts against the backbeat.', he: 'תורכם: הדגשות ונקישות, ואז תווי רפאים מול הבקביט.' }, show: { text: { en: '> · tap · ( )', he: '> · נקישה · ( )' } } },
    ],
    more: [
      { say: { en: 'The down-stroke: an accent that starts high and stops low, ready for the taps after it. The up-stroke: a tap that lifts the stick for the next accent.', he: 'מכת ירידה: הדגשה שמתחילה גבוה ונעצרת נמוך, מוכנה לנקישות שאחריה. מכת עלייה: נקישה שמרימה את המקל להדגשה הבאה.' }, play: [kit(66, twice(bar4({ s: 'XxxxXxxxXxxxXxxx' }, 4)))] },
      { say: { en: 'Keep the ghosts truly quiet. If they are as loud as the backbeat, the groove loses its shape. On an e-kit the app reads how hard each stroke is.', he: 'שמרו על תווי הרפאים שקטים באמת. אם הם חזקים כמו הבקביט, הגרוב מאבד את הצורה שלו. בתופים אלקטרוניים האפליקציה קוראת כמה חזקה כל מכה.' } },
      { say: { en: 'The common mistake: the taps creep louder after each accent. Keep the gap between the heights wide.', he: 'הטעות הנפוצה: הנקישות מתחזקות אחרי כל הדגשה. שומרים על פער רחב בין הגבהים.' } },
      { say: { en: 'A moving accent puts the loud note on another sixteenth of the beat. The hands keep going; only the height changes.', he: 'הדגשה נודדת שמה את הצליל החזק על שש־עשרית אחרת בפעמה. הידיים ממשיכות; רק הגובה משתנה.' }, show: { kit: bar4({ s: 'XxxxxXxxxxXxxxxX' }, 4) }, play: [kit(66, [bar4({ s: 'XxxxxXxxxxXxxxxX' }, 4)])] },
      { say: { en: 'In real music, ghost notes give funk, soul and R&B grooves their sixteenth-note motion: felt more than heard.', he: 'במוזיקה אמיתית, תווי רפאים נותנים לגרובים של פאנק, סול ו־R&B את התנועה בשש־עשריות: מרגישים אותם יותר משומעים.' } },
      { say: { en: 'Practice the two heights slowly: one accent, three taps, over and over. Speed comes later; first make the difference between loud and soft clear and steady.', he: 'תרגלו את שני הגבהים לאט: הדגשה אחת, שלוש נקישות, שוב ושוב. המהירות תבוא אחר כך; קודם עושים את ההבדל בין חזק לחלש ברור ויציב.' } },
      { say: { en: 'Recap: high and full for the accent, low for the tap, lower still for the ghost, and a loud backbeat on 2 and 4.', he: 'לסיכום: גבוה ומלא להדגשה, נמוך לנקישה, נמוך עוד יותר לתו הרפאים, ובקביט חזק על 2 ו־4.' } },
    ],
  },

  // ------------------------------------------------------------------ B7 flams and drags
  {
    id: 'drum-flams',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Flams and drags', he: 'פלאמים ודראגים' },
    takeaway: { en: 'A grace note is a soft stroke just before the main one: one makes a flam, two (a quick double) make a drag. Grace stick low, main stick high.', he: 'צליל חן הוא מכה רכה רגע לפני המכה העיקרית: אחד יוצר פלאם, שניים (כפולה מהירה) יוצרים דראג. מקל החן נמוך, המקל העיקרי גבוה.' },
    steps: [
      { say: { en: 'A grace note is a small, soft stroke just before the main one.', he: 'צליל חן הוא מכה קטנה ורכה רגע לפני המכה העיקרית.' }, play: [kit(60, [bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 2: 1, 4: 1, 6: 1 } })])] },
      { say: { en: 'A flam has one grace note, almost together with the main stroke.', he: 'לפלאם יש צליל חן אחד, כמעט יחד עם המכה העיקרית.' }, show: { kit: bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 2: 1, 4: 1, 6: 1 } }), text: { en: 'fla-am', he: 'פְלַ־אם' } }, play: [kit(60, [bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 2: 1, 4: 1, 6: 1 } })])] },
      { say: { en: 'Low hand, high hand: the grace stick starts low, the main stick high.', he: 'יד נמוכה, יד גבוהה: מקל החן מתחיל נמוך, המקל העיקרי גבוה.' }, show: { text: { en: 'grace low · main high', he: 'חן נמוך · עיקרי גבוה' } } },
      { say: { en: 'Swap hands every time: lR, then rL. The small letter is the grace.', he: 'מחליפים ידיים כל פעם: lR, ואז rL. האות הקטנה היא צליל החן.' }, show: { text: { en: 'lR · rL · lR · rL', he: 'lR · rL · lR · rL' } }, play: [kit(66, [bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 2: 1, 4: 1, 6: 1 } })])] },
      { say: { en: 'A drag has two grace notes: a quick double bounce before the stroke.', he: 'לדראג יש שני צלילי חן: קפיצה כפולה מהירה לפני המכה.' }, show: { kit: bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 2, 2: 2, 4: 2, 6: 2 } }), text: { en: 'llR · rrL', he: 'llR · rrL' } }, play: [kit(60, [bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 2, 2: 2, 4: 2, 6: 2 } })])] },
      { say: { en: 'On paper, grace notes are small notes just before the main note.', he: 'על הדף, צלילי חן הם תווים קטנים רגע לפני התו העיקרי.' }, show: { kit: bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 4: 2 } }), text: { en: 'flam · drag', he: 'פלאם · דראג' } } },
      { say: { en: 'Your turn: flams hand to hand, then drags. Keep the grace soft.', he: 'תורכם: פלאמים יד ליד, ואז דראגים. שומרים על צליל החן רך.' }, play: [kit(60, [bar4({ s: 'x.x.x.x.' }, 2, { grace: { 0: 1, 2: 1, 4: 2, 6: 2 } })])] },
    ],
    more: [
      { say: { en: 'Too open, and a flam sounds like two strokes; too closed, and both sticks land at once, a flat. Aim for one thick sound.', he: 'פתוח מדי, והפלאם נשמע כמו שתי מכות; סגור מדי, ושני המקלות נוחתים יחד, ״פלאט״. מכוונים לצליל אחד עבה.' } },
      { say: { en: 'The flam accent: three notes a beat, the flam on the first. The sticking alternates, so each beat starts its flam on the other hand.', he: 'פלאם אקסנט: שלושה צלילים בפעמה, הפלאם על הראשון. האצבוע מתחלף, כך שכל פעמה מתחילה את הפלאם ביד השנייה.' }, show: { kit: bar4({ s: 'Xxx'.repeat(4) }, 3, { grace: { 0: 1, 3: 1, 6: 1, 9: 1 } }), text: { en: 'lR L R · rL R L', he: 'lR L R · rL R L' } }, play: [kit(60, [bar4({ s: 'Xxx'.repeat(4) }, 3, { grace: { 0: 1, 3: 1, 6: 1, 9: 1 } })])] },
      { say: { en: 'The flam tap: a flam, then a tap with the same hand, then the other side. A flammed double stroke.', he: 'פלאם טאפ: פלאם, ואז נקישה באותה יד, ואז הצד השני. מכה כפולה עם פלאם.' }, show: { text: { en: 'lR R · rL L', he: 'lR R · rL L' } }, play: [kit(66, [bar4({ s: 'XxXxXxXx' }, 2, { grace: { 0: 1, 2: 1, 4: 1, 6: 1 } })])] },
      { say: { en: 'The single drag tap: a drag, then one tap with the other hand.', he: 'סינגל דראג טאפ: דראג, ואז נקישה אחת ביד השנייה.' }, show: { text: { en: 'llR L · rrL R', he: 'llR L · rrL R' } } },
      { say: { en: 'The common mistake: the grace note gets loud. It should sit about as low as a ghost note, so the main stroke stays on top.', he: 'הטעות הנפוצה: צליל החן מתחזק. הוא צריך לשבת נמוך בערך כמו תו רפאים, כך שהמכה העיקרית נשארת מעליו.' } },
      { say: { en: 'A practice tip: play flams slowly with the click on every beat, and listen to the space between the two sticks. It should stay the same on both hands, right flam and left flam.', he: 'טיפ לתרגול: נגנו פלאמים לאט עם קליק על כל פעמה, והקשיבו למרווח בין שני המקלות. הוא צריך להישאר זהה בשתי הידיים, בפלאם ימני ובפלאם שמאלי.' } },
      { say: { en: 'Recap: one grace for a flam, two for a drag, grace low and soft, main high, hands swapping each time.', he: 'לסיכום: צליל חן אחד לפלאם, שניים לדראג, החן נמוך ורך, העיקרי גבוה, והידיים מתחלפות כל פעם.' } },
    ],
  },

  // ------------------------------------------------------------------ B8 (1) triplets and the shuffle
  {
    id: 'drum-shuffle',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Triplets and the shuffle', he: 'טריולות והשאפל' },
    takeaway: { en: 'Three even strokes a beat (tri-o-la); leave out the middle one and you have the shuffle: long, short, snare on 2 and 4. Slow blues counts it in 12/8.', he: 'שלוש מכות שוות בפעמה (טרי־או־לה); משמיטים את האמצעית ומקבלים שאפל: ארוך, קצר, סנר על 2 ו־4. בלוז איטי סופר אותו ב־12/8.' },
    steps: [
      { say: { en: 'A triplet puts three even strokes in one beat: tri-o-la.', he: 'טריולה מכניסה שלוש מכות שוות לפעמה אחת: טרי־או־לה.' }, show: { kit: bar4({ h: 'xxxxxxxxxxxx' }, 3) }, play: [kit(72, [bar4({ h: 'xxxxxxxxxxxx' }, 3)])] },
      { say: { en: 'On the kit: triplets on the hi-hat, snare on 2 and 4.', he: 'על המערכת: טריולות בהיי־האט, סנר על 2 ו־4.' }, show: { kit: bar4({ h: 'xxxxxxxxxxxx', s: SHUF_SN, k: 'x.....x.....' }, 3) }, play: [kit(72, twice(bar4({ h: 'xxxxxxxxxxxx', s: SHUF_SN, k: 'x.....x.....' }, 3)))] },
      { say: { en: 'Now leave out the middle triplet. Long, short: the shuffle.', he: 'עכשיו משמיטים את הטריולה האמצעית. ארוך, קצר: השאפל.' }, show: { kit: bar4({ h: 'x.xx.xx.xx.x', s: SHUF_SN, k: 'x.....x.....' }, 3) }, play: [kit(88, twice(bar4({ h: 'x.xx.xx.xx.x', s: SHUF_SN, k: 'x.....x.....' }, 3)))] },
      { say: { en: 'The short note is the last triplet. It leads into the next beat.', he: 'הצליל הקצר הוא הטריולה האחרונה. הוא מוביל לפעמה הבאה.' }, show: { text: { en: '1 (o) la 2 (o) la', he: '1 (או) לה 2 (או) לה' } }, play: [kit(88, [bar4({ h: 'x.xx.xx.xx.x' }, 3)])] },
      { say: { en: 'Slow blues counts it in 12/8: four big beats of three.', he: 'בלוז איטי סופר אותו ב־12/8: ארבע פעמות גדולות של שלוש.' }, show: { kit: { lanes: { r: 'xxxxxxxxxxxx', s: SHUF_SN, k: 'x.....x.....' }, sub: 3, steps: 12, num: 12, den: 8, groups: [3, 3, 3, 3] } }, play: [kit(54, [bar4({ r: 'xxxxxxxxxxxx', s: SHUF_SN, k: 'x.....x.....' }, 3)])] },
      { say: { en: 'Your turn: triplets, then the shuffle, then the slow blues.', he: 'תורכם: טריולות, אחר כך שאפל, ואז בלוז איטי.' }, show: { text: { en: '3 → long-short → 12/8', he: '3 ← ארוך־קצר ← 12/8' } } },
    ],
    more: [
      { say: { en: 'The shuffle and swing eighths share the same long-short: the beat split in three, the first two thirds joined into one long note.', he: 'לשאפל ולשמיניות בסווינג יש אותו ארוך־קצר: הפעמה מחולקת לשלוש, ושני השלישים הראשונים מתחברים לצליל ארוך אחד.' } },
      { say: { en: 'The common mistake: the short note slides toward a straight eighth, or a stiff dotted rhythm. Keep it on the last triplet. First the straight version, then the shuffle.', he: 'הטעות הנפוצה: הצליל הקצר מחליק לשמינית ישרה, או לקצב מנוקד ונוקשה. משאירים אותו על הטריולה האחרונה. קודם הגרסה הישרה, ואז השאפל.' }, play: [kit(88, [bar4({ h: 'xxxxxxxx' }), bar4({ h: 'x.xx.xx.xx.x' }, 3)])] },
      { say: { en: 'Count the triplets out loud before you drop one: tri-o-la, tri-o-la. Then whisper the middle syllable and play only the outer two.', he: 'ספרו את הטריולות בקול לפני שמשמיטים אחת: טרי־או־לה, טרי־או־לה. אחר כך לחשו את ההברה האמצעית ונגנו רק את שתי החיצוניות.' } },
      { say: { en: 'The double shuffle puts the shuffle in both hands: the right on the hi-hat, the left on the snare, with accents on 2 and 4.', he: 'השאפל הכפול שם את השאפל בשתי הידיים: ימין על ההיי־האט, שמאל על הסנר, עם הדגשות על 2 ו־4.' }, play: [kit(96, twice(bar4({ h: 'x.xx.xx.xx.x', s: 'g.gX.gg.gX.g', k: 'x..x..x..x..' }, 3)))] },
      { say: { en: 'Where it lives: blues, early rock and roll, and many rock shuffles. A slow blues often sits at fifty to sixty beats a minute.', he: 'איפה זה חי: בלוז, רוקנרול מוקדם, והרבה שאפלים ברוק. בלוז איטי יושב הרבה פעמים על חמישים עד שישים פעמות בדקה.' } },
      { say: { en: 'A practice tip: keep the click on every beat at first, then on 2 and 4 only. When the shuffle stays steady with fewer clicks, the feel is your own.', he: 'טיפ לתרגול: בהתחלה הקליק על כל פעמה, ואחר כך רק על 2 ו־4. כשהשאפל נשאר יציב עם פחות קליקים, התחושה כבר שלכם.' } },
      { say: { en: 'Recap: three even notes a beat, drop the middle one, keep the short note on the last triplet, snare on 2 and 4.', he: 'לסיכום: שלושה צלילים שווים בפעמה, משמיטים את האמצעי, הצליל הקצר נשאר על הטריולה האחרונה, סנר על 2 ו־4.' } },
    ],
  },

  // ------------------------------------------------------------------ B8 (2) the jazz ride, the foot, feathering
  {
    id: 'drum-swing-ride',
    area: 'jazz',
    emoji: '',
    title: { en: 'The swing ride', he: 'הרייד בסווינג' },
    takeaway: { en: 'Ding, ding-a, ding, ding-a on the ride (the skip note on the last triplet of 2 and 4), the hi-hat foot on 2 and 4, a soft kick under every beat.', he: 'דינג, דינג־אה, דינג, דינג־אה על הרייד (צליל הקפיצה על הטריולה האחרונה של 2 ו־4), רגל ההיי־האט על 2 ו־4, קיק רך מתחת לכל פעמה.' },
    steps: [
      { say: { en: 'In jazz the time lives on the ride cymbal, not the hi-hat.', he: 'בג׳אז הזמן חי על מצלת הרייד, לא על ההיי־האט.' }, play: [kit(120, twice(bar4({ ...RIDE, p: SHUF_SN }, 3)))] },
      { say: { en: 'The ride pattern: ding, ding-a, ding, ding-a.', he: 'תבנית הרייד: דינג, דינג־אה, דינג, דינג־אה.' }, show: { kit: bar4(RIDE, 3) }, play: [kit(116, twice(bar4(RIDE, 3)))] },
      { say: { en: 'The skip note, the "a", is the last triplet of beats 2 and 4.', he: 'צליל הקפיצה, ה״אה״, הוא הטריולה האחרונה של פעמות 2 ו־4.' }, show: { text: { en: '1 · 2 a · 3 · 4 a', he: '1 · 2 אה · 3 · 4 אה' } }, play: [kit(100, [bar4(RIDE, 3)])] },
      { say: { en: 'The left foot closes the hi-hat on 2 and 4: a crisp chick.', he: 'הרגל השמאלית סוגרת את ההיי־האט על 2 ו־4: צ׳יק חד.' }, show: { kit: bar4({ ...RIDE, p: SHUF_SN }, 3) }, play: [kit(116, twice(bar4({ ...RIDE, p: SHUF_SN }, 3)))] },
      { say: { en: 'Feathering: the kick on every beat, so soft you feel it more than hear it.', he: 'קיק מרוכך (פת׳רינג): קיק על כל פעמה, כל כך רך שמרגישים אותו יותר משומעים.' }, show: { kit: bar4({ ...RIDE, p: SHUF_SN, k: 'g..g..g..g..' }, 3) }, play: [kit(116, twice(bar4({ ...RIDE, p: SHUF_SN, k: 'g..g..g..g..' }, 3)))] },
      { say: { en: 'Your turn: the ride first, then the foot, then the feathered kick.', he: 'תורכם: קודם הרייד, אחר כך הרגל, ואז הקיק המרוכך.' }, show: { text: { en: 'ride · foot · kick', he: 'רייד · רגל · קיק' } } },
    ],
    more: [
      { say: { en: 'The skip note is swung: at slow tempos it sits near the last triplet; at fast tempos it moves closer to a straight eighth.', he: 'צליל הקפיצה בסווינג: בטמפו איטי הוא יושב ליד הטריולה האחרונה; בטמפו מהיר הוא מתקרב לשמינית ישרה.' }, play: [kit(200, [...twice(bar4({ ...RIDE, p: SHUF_SN }, 3)), ...twice(bar4({ ...RIDE, p: SHUF_SN }, 3))])] },
      { say: { en: 'Play the quarter notes a little stronger than the skip notes. The quarters carry the band; the skip is a light bounce.', he: 'נגנו את הרבעים קצת חזק יותר מצלילי הקפיצה. הרבעים נושאים את הלהקה; הקפיצה היא ניתור קל.' } },
      { say: { en: 'Keep the hi-hat chick short and closed, never splashing. Together with the ride it marks 2 and 4, where the swing leans.', he: 'שומרים על הצ׳יק של ההיי־האט קצר וסגור, אף פעם לא מתיז. יחד עם הרייד הוא מסמן את 2 ו־4, שם הסווינג נשען.' } },
      { say: { en: 'Feathering is a choice. Many drummers feather lightly or not at all, especially with a bass player who carries the low end.', he: 'קיק מרוכך הוא בחירה. הרבה מתופפים מרככים קלות או בכלל לא, במיוחד עם בסיסט שנושא את הצד הנמוך.' } },
      { say: { en: 'The common mistake: the ride gets loud and the skip notes get lazy. Keep the ride light and the time steady; the whole band listens to it.', he: 'הטעות הנפוצה: הרייד מתחזק וצלילי הקפיצה מתעצלים. שומרים על הרייד קל ועל הזמן יציב; כל הלהקה מקשיבה לו.' }, play: [kit(132, twice(bar4({ ...RIDE, p: SHUF_SN, k: 'g..g..g..g..' }, 3)))] },
      { say: { en: 'Practice the ride with the band in the app: lock the quarter notes to the walking bass, and let the skip notes float lightly between them.', he: 'תרגלו את הרייד עם הלהקה באפליקציה: נועלים את הרבעים על הבס המהלך, ונותנים לצלילי הקפיצה לרחף בקלות ביניהם.' } },
      { say: { en: 'Recap: ding, ding-a on the ride, a chick on 2 and 4, a soft kick under the quarters, and the ride always light.', he: 'לסיכום: דינג, דינג־אה על הרייד, צ׳יק על 2 ו־4, קיק רך מתחת לרבעים, והרייד תמיד קל.' } },
    ],
  },

  // ------------------------------------------------------------------ B9 (1) bossa nova and samba
  {
    id: 'drum-brazil',
    area: 'world',
    emoji: '',
    title: { en: 'Bossa nova and samba', he: 'בוסה נובה וסמבה' },
    takeaway: { en: 'Bossa: soft eighths, the bossa clave on the cross-stick, the kick on 1 and 3 with the "and" before. Samba: in two, the kick on each beat and the sixteenth before it, the hi-hat foot on the "and"s.', he: 'בוסה: שמיניות רכות, קלאבת הבוסה בקרוס־סטיק, הקיק על 1 ו־3 עם ה״וְ״ שלפניהן. סמבה: בשתיים, הקיק על כל פעמה ועל השש־עשרית שלפניה, רגל ההיי־האט על ה״וְ״.' },
    steps: [
      { say: { en: 'Bossa nova is soft and steady: eighths on the hi-hat.', he: 'בוסה נובה רכה ויציבה: שמיניות בהיי־האט.' }, play: [kit(120, [bar4({ h: 'xxxxxxxx', rm: 'x..x..x.', k: 'x..xx..x' }), bar4({ h: 'xxxxxxxx', rm: '..x..x..', k: 'x..xx..x' })])] },
      { say: { en: 'The left hand plays the bossa clave as a cross-stick.', he: 'יד שמאל מנגנת את קלאבת הבוסה כקרוס־סטיק.' }, show: { kit: bar4({ rm: 'x..x..x.' }), text: { en: '1 · &2 · 4 | 2 · &3', he: '1 · וְ2 · 4 | 2 · וְ3' } }, play: [kit(120, [bar4({ rm: 'x..x..x.' }), bar4({ rm: '..x..x..' })])] },
      { say: { en: 'The kick: one, the "and" of two, three, the "and" of four.', he: 'הקיק: 1, ה״וְ״ של 2, 3, ה״וְ״ של 4.' }, show: { kit: bar4({ h: 'xxxxxxxx', rm: 'x..x..x.', k: 'x..xx..x' }) }, play: [kit(120, twice(bar4({ k: 'x..xx..x' })))] },
      { say: { en: 'Samba is faster and felt in two. The feet carry it.', he: 'סמבה מהירה יותר ומורגשת בשתיים. הרגליים נושאות אותה.' }, play: [kit(84, twice(bar4({ k: 'x..xx..xx..xx..x', p: '..x...x...x...x.', r: 'x.x.x.x.x.x.x.x.' }, 4)))] },
      { say: { en: 'Kick on each beat and the sixteenth before it; hi-hat foot on the "and"s.', he: 'קיק על כל פעמה ועל השש־עשרית שלפניה; רגל ההיי־האט על ה״וְ״.' }, show: { kit: bar4({ k: 'x..xx..xx..xx..x', p: '..x...x...x...x.' }, 4) }, play: [kit(80, twice(bar4({ k: 'x..xx..xx..xx..x', p: '..x...x...x...x.' }, 4)))] },
      { say: { en: 'Your turn: bossa first, then the samba feet, then the hands on top.', he: 'תורכם: קודם בוסה, אחר כך רגלי הסמבה, ואז הידיים מעליהן.' }, show: { text: { en: 'bossa · samba', he: 'בוסה · סמבה' } } },
    ],
    more: [
      { say: { en: 'Bossa nova grew in Rio de Janeiro in the late 1950s out of samba: slower, quieter, close to the voice and the guitar.', he: 'הבוסה נובה צמחה בריו דה ז׳ניירו בסוף שנות החמישים מתוך הסמבה: איטית יותר, שקטה יותר, קרובה לקול ולגיטרה.' } },
      { say: { en: 'The clave has two sides: a bar of three notes and a bar of two. 3-2 starts with the three side; 2-3 swaps the bars. Here is 3-2, then 2-3.', he: 'לקלאבה יש שני צדדים: תיבה של שלושה צלילים ותיבה של שניים. 3-2 מתחילה בצד של השלוש; 2-3 מחליפה את התיבות. הנה 3-2, ואז 2-3.' }, play: [kit(120, [bar4({ rm: 'x..x..x.' }), bar4({ rm: '..x..x..' }), bar4({ rm: '..x..x..' }), bar4({ rm: 'x..x..x.' })])] },
      { say: { en: 'Keep it quiet. Bossa is played at a low volume; the cross-stick and the hi-hat should never cover the singer.', he: 'שומרים על שקט. בוסה מנוגנת בעוצמה נמוכה; הקרוס־סטיק וההיי־האט אף פעם לא מכסים את הזמר.' } },
      { say: { en: 'The samba kick plays the part of the surdo, the big Brazilian bass drum, which leans on the second beat of each bar of two.', he: 'הקיק בסמבה מנגן את התפקיד של הסורדו, תוף הבס הברזילאי הגדול, שנשען על הפעמה השנייה בכל תיבה של שתיים.' } },
      { say: { en: 'The common mistake in samba: the sixteenth before each beat drifts late and the feet start to gallop. Keep it a true sixteenth, close to the beat.', he: 'הטעות הנפוצה בסמבה: השש־עשרית שלפני כל פעמה מאחרת והרגליים מתחילות לדהור. שומרים עליה שש־עשרית אמיתית, קרובה לפעמה.' }, play: [kit(76, twice(bar4({ k: 'x..xx..xx..xx..x' }, 4)))] },
      { say: { en: 'Recap: bossa is soft eighths, the cross-stick clave and the kick on 1 and 3 with pickups; samba is the kick and the sixteenth before each beat, with the foot on the "and"s.', he: 'לסיכום: בוסה היא שמיניות רכות, קלאבה בקרוס־סטיק וקיק על 1 ו־3 עם המכות שלפניהן; סמבה היא קיק ושש־עשרית לפני כל פעמה, עם הרגל על ה״וְ״.' } },
    ],
  },

  // ------------------------------------------------------------------ B9 (2) son and rumba clave
  {
    id: 'drum-clave',
    area: 'world',
    emoji: '',
    title: { en: 'Son and rumba clave', he: 'קלאבת סון ורומבה' },
    takeaway: { en: 'The clave is a two-bar key: the three side (1, "and" of 2, 4) and the two side (2, 3). 3-2 or 2-3 by the song; rumba moves the third note half a beat later.', he: 'הקלאבה היא מפתח של שתי תיבות: צד השלוש (1, ה״וְ״ של 2, 4) וצד השתיים (2, 3). 3-2 או 2-3 לפי השיר; ברומבה הצליל השלישי זז חצי פעמה מאוחר יותר.' },
    steps: [
      { say: { en: 'The clave is a two-bar key the whole band locks to.', he: 'הקלאבה היא מפתח של שתי תיבות שכל הלהקה ננעלת עליו.' }, play: [kit(100, [bar4({ r: 'x.x.x.x.', rm: 'x..x..x.' }), bar4({ r: 'x.x.x.x.', rm: '..x.x...' })])] },
      { say: { en: 'Son clave 3-2: three notes in the first bar, two in the second.', he: 'קלאבת סון 3-2: שלושה צלילים בתיבה הראשונה, שניים בשנייה.' }, show: { text: { en: '3 | 2', he: '3 | 2' } }, play: [kit(100, [bar4({ rm: 'x..x..x.' }), bar4({ rm: '..x.x...' })])] },
      { say: { en: 'The three side: one, the "and" of two, four.', he: 'צד השלוש: 1, ה״וְ״ של 2, 4.' }, show: { kit: bar4({ rm: 'x..x..x.' }), text: { en: '1 · &2 · 4', he: '1 · וְ2 · 4' } }, play: [kit(100, [bar4({ rm: 'x..x..x.' })])] },
      { say: { en: 'The two side: two and three.', he: 'צד השתיים: 2 ו־3.' }, show: { kit: bar4({ rm: '..x.x...' }), text: { en: '2 · 3', he: '2 · 3' } }, play: [kit(100, [bar4({ rm: '..x.x...' })])] },
      { say: { en: 'Clave 2-3 starts on the two side: the same notes, bars swapped.', he: 'קלאבה 2-3 מתחילה בצד השתיים: אותם צלילים, התיבות מתחלפות.' }, show: { text: { en: '2 | 3', he: '2 | 3' } }, play: [kit(100, [bar4({ rm: '..x.x...' }), bar4({ rm: 'x..x..x.' })])] },
      { say: { en: 'Rumba clave moves the third note half a beat later.', he: 'קלאבת רומבה מזיזה את הצליל השלישי חצי פעמה מאוחר יותר.' }, show: { kit: bar4({ rm: 'x..x...x' }), text: { en: '1 · &2 · &4', he: '1 · וְ2 · וְ4' } }, play: [kit(100, [bar4({ rm: 'x..x...x' }), bar4({ rm: '..x.x...' })])] },
      { say: { en: 'Your turn: the clave on the cross-stick, under ride quarters.', he: 'תורכם: הקלאבה בקרוס־סטיק, מתחת לרבעים ברייד.' }, show: { kit: bar4({ r: 'x.x.x.x.', rm: 'x..x..x.' }) } },
    ],
    more: [
      { say: { en: 'The three side is the tresillo: three plus three plus two eighths. Long, long, short. Feel it against all eight eighths of the bar.', he: 'צד השלוש הוא הטרסיו: שלוש ועוד שלוש ועוד שתיים שמיניות. ארוך, ארוך, קצר. מרגישים אותו מול כל שמונה השמיניות של התיבה.' }, show: { text: { en: '3 + 3 + 2', he: '3 + 3 + 2' } }, play: [kit(100, twice(bar4({ h: 'xxxxxxxx', rm: 'x..x..x.' })))] },
      { say: { en: 'The arrangement sets the direction, 3-2 or 2-3, and every part fits it. A drummer who flips it by mistake is heard at once.', he: 'העיבוד קובע את הכיוון, 3-2 או 2-3, וכל תפקיד מתאים את עצמו אליו. מתופף שהופך אותו בטעות נשמע מיד.' } },
      { say: { en: 'The common mistake: evening out the three side. The second note sits on the "and" of two, not on beat two or three.', he: 'הטעות הנפוצה: ליישר את צד השלוש. הצליל השני יושב על ה״וְ״ של 2, לא על פעמה 2 או 3.' }, play: [kit(100, [bar4({ rm: 'x...x.x.' }), bar4({ rm: 'x..x..x.' })])] },
      { say: { en: 'Son clave comes from the Cuban son; rumba clave from the rumba, where the later third note gives a more restless feel.', he: 'קלאבת סון באה מהסון הקובני; קלאבת רומבה מהרומבה, שבה הצליל השלישי המאוחר נותן תחושה חסרת מנוחה יותר.' } },
      { say: { en: 'Where it lives: salsa, mambo and Afro-Cuban jazz are all built on the clave. Even when nobody plays it, everyone feels it.', he: 'איפה זה חי: סלסה, מאמבו וג׳אז אפרו־קובני בנויים כולם על הקלאבה. גם כשאף אחד לא מנגן אותה, כולם מרגישים אותה.' } },
      { say: { en: 'A practice tip: say the clave out loud while you play quarters on the ride, then swap: play the clave and say the quarters. Both ways train the same lock.', he: 'טיפ לתרגול: אמרו את הקלאבה בקול בזמן שאתם מנגנים רבעים ברייד, ואז החליפו: נגנו את הקלאבה ואמרו את הרבעים. שתי הדרכים מאמנות את אותה נעילה.' } },
      { say: { en: 'Recap: three side 1, "and" of 2, 4; two side 2 and 3; the song picks 3-2 or 2-3; rumba delays the third note.', he: 'לסיכום: צד השלוש 1, ה״וְ״ של 2, 4; צד השתיים 2 ו־3; השיר בוחר 3-2 או 2-3; ברומבה הצליל השלישי מאחר.' } },
    ],
  },

  // ------------------------------------------------------------------ B10 Middle-Eastern rhythms on the kit
  {
    id: 'drum-mideast',
    area: 'world',
    emoji: '',
    title: { en: 'Dum, tak, ka', he: 'דום, תק, קה' },
    takeaway: { en: 'Dum low, tak high, ka a soft tak from the other hand. Maqsum D T . T D . T ., baladi D D . T D . T ., malfuf 3 + 3 + 2; on the kit the dum is the kick, the tak the snare.', he: 'דום נמוך, תק גבוה, קה הוא תק רך מהיד השנייה. מקסום ד ת . ת ד . ת ., בלדי ד ד . ת ד . ת ., מלפוף 3 + 3 + 2; על המערכת הדום הוא הקיק, התק הוא הסנר.' },
    steps: [
      { say: { en: 'Middle-Eastern rhythms speak in strokes: dum is low, tak is high.', he: 'מקצבים מזרחיים מדברים במכות: דום נמוך, תק גבוה.' }, show: { text: { en: 'D = dum · T = tak', he: 'ד = דום · ת = תק' } }, play: [darbuka('D---T---', 100, 2)] },
      { say: { en: 'Maqsum: dum tak, tak dum, tak.', he: 'מקסום: דום תק, תק דום, תק.' }, show: { text: { en: 'D T - T D - T -', he: 'ד ת - ת ד - ת -' } }, play: [darbuka('DT-TD-T-', 100, 3)] },
      { say: { en: 'On the kit, the dum goes to the kick, the tak to the snare.', he: 'על המערכת, הדום הולך לקיק, התק לסנר.' }, show: { kit: bar4({ s: '.x.x..x.', k: 'x...x...' }) }, play: [kit(96, twice(bar4({ s: '.x.x..x.', k: 'x...x...' })))] },
      { say: { en: 'Baladi doubles the first dum: dum dum, tak dum, tak.', he: 'בלדי מכפיל את הדום הראשון: דום דום, תק דום, תק.' }, show: { kit: bar4({ s: '...x..x.', k: 'xx..x...' }), text: { en: 'D D - T D - T -', he: 'ד ד - ת ד - ת -' } }, play: [kit(96, twice(bar4({ s: '...x..x.', k: 'xx..x...' })))] },
      { say: { en: 'Malfuf is quick, grouped three, three, two: dum, tak, tak.', he: 'מלפוף מהיר, בקבוצות שלוש, שלוש, שתיים: דום, תק, תק.' }, show: { kit: bar4({ s: '...x..x.', k: 'x.......' }), text: { en: 'D - - T - - T -', he: 'ד - - ת - - ת -' } }, play: [kit(110, [bar4({ s: '...x..x.', k: 'x.......' }), bar4({ s: '...x..x.', k: 'x.......' }), bar4({ s: '...x..x.', k: 'x.......' })])] },
      { say: { en: 'Ka is a soft tak from the other hand, filling the gaps.', he: 'קה הוא תק רך מהיד השנייה, שממלא את הרווחים.' }, show: { kit: bar4({ s: '.xgx.gxg', k: 'x...x...' }), text: { en: 'D T K T D K T K', he: 'ד ת ק ת ד ק ת ק' } }, play: [kit(96, twice(bar4({ s: '.xgx.gxg', k: 'x...x...' })))] },
      { say: { en: 'Your turn: dum and tak on kick and snare; the ka comes later.', he: 'תורכם: דום ותק בקיק ובסנר; הקה יבוא בהמשך.' }, show: { text: { en: 'D → kick · T → snare', he: 'ד ← קיק · ת ← סנר' } } },
    ],
    more: [
      { say: { en: 'On the darbuka, the dum is the strong hand near the centre of the head, the tak the strong hand on the rim, and the ka the other hand on the rim.', he: 'על הדרבוקה, הדום הוא היד החזקה ליד מרכז העור, התק הוא היד החזקה על השפה, והקה היא היד השנייה על השפה.' } },
      { say: { en: 'Learn a rhythm by speaking it: say "dum tak, tak dum, tak" over a steady pulse, then play exactly what you said.', he: 'לומדים מקצב בדיבור: אומרים ״דום תק, תק דום, תק״ מעל דופק יציב, ואז מנגנים בדיוק את מה שאמרתם.' } },
      { say: { en: 'Maqsum and baladi differ in one stroke: the second stroke is a tak in maqsum and a dum in baladi. Maqsum, then baladi.', he: 'מקסום ובלדי נבדלים במכה אחת: המכה השנייה היא תק במקסום ודום בבלדי. מקסום, ואז בלדי.' }, play: [darbuka('DT-TD-T-', 100, 2), darbuka('DD-TD-T-', 100, 2)] },
      { say: { en: 'Some levels move the dum to the floor tom for a deeper, hand-drum sound. The rhythm stays the same; only the drum changes.', he: 'בחלק מהשלבים הדום עובר לטום הרצפה, לצליל עמוק יותר שדומה לתוף יד. המקצב נשאר אותו דבר; רק התוף מתחלף.' }, play: [kit(96, [bar4({ s: '.x.x..x.', t3: 'x...x...' })])] },
      { say: { en: 'The common mistake: rushing the empty slots. The gaps belong to the rhythm; count all eight eighths, played or not.', he: 'הטעות הנפוצה: למהר במשבצות הריקות. הרווחים שייכים למקצב; סופרים את כל שמונה השמיניות, מנוגנות או לא.' } },
      { say: { en: 'The first levels leave the hi-hat out, so only the dum and the tak sound. A later level adds the hi-hat in sixteenths over the same rhythm.', he: 'השלבים הראשונים משאירים את ההיי־האט בחוץ, כך שרק הדום והתק נשמעים. שלב מאוחר יותר מוסיף היי־האט בשש־עשריות מעל אותו מקצב.' } },
      { say: { en: 'Where it lives: maqsum and baladi sit under a large share of Egyptian and Arabic popular music. Recap: dum low, tak high, ka soft, and every slot counted.', he: 'איפה זה חי: מקסום ובלדי נמצאים מתחת לחלק גדול מהמוזיקה הפופולרית המצרית והערבית. לסיכום: דום נמוך, תק גבוה, קה רך, וכל משבצת נספרת.' } },
    ],
  },

  // ------------------------------------------------------------------ B11 d-fills
  {
    id: 'drum-fills',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Fills and landing on 1', he: 'מעברים ונחיתה על 1' },
    takeaway: { en: 'A fill is a short break from the groove; start with one beat (4 e & a on the snare) and land crash and kick together on the next 1, in time.', he: 'מעבר הוא הפסקה קצרה מהגרוב; מתחילים בפעמה אחת (4 אִי וְ אָה בסנר) ונוחתים בקראש וקיק יחד על ה־1 הבא, בזמן.' },
    steps: [
      { say: { en: 'A fill is a short break from the groove that leads into the next bar.', he: 'מעבר הוא הפסקה קצרה מהגרוב שמובילה לתיבה הבאה.' }, play: [kit(92, [ROCK, bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xxxx', k: 'x.......x.......' }, 4), bar4({ c: 'x.......', k: 'x...x...', s: '..x...x.', h: '..xxxxxx' })])] },
      { say: { en: 'Start small: one beat. The groove plays beats 1, 2 and 3.', he: 'מתחילים בקטן: פעמה אחת. הגרוב מנגן את פעמות 1, 2 ו־3.' }, show: { kit: bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xxxx', k: 'x.......x.......' }, 4) }, play: [kit(88, [bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......', k: 'x.......x.......' }, 4)])] },
      { say: { en: 'Beat 4 is the fill: four sixteenths on the snare.', he: 'פעמה 4 היא המעבר: ארבע שש־עשריות בסנר.' }, show: { text: { en: '4 e & a', he: '4 אִי וְ אָה' } }, play: [kit(88, [bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xxxx', k: 'x.......x.......' }, 4)])] },
      { say: { en: 'Then land: crash and kick together on the next 1.', he: 'ואז נוחתים: קראש וקיק יחד על ה־1 הבא.' }, show: { kit: bar4({ c: 'x.......', k: 'x...x...', s: '..x...x.', h: '..xxxxxx' }) }, play: [kit(88, [bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xxxx', k: 'x.......x.......' }, 4), bar4({ c: 'x.......', k: 'x...x...', s: '..x...x.', h: '..xxxxxx' })])] },
      { say: { en: 'The fill never rushes. The 1 comes when it comes.', he: 'המעבר לא ממהר. ה־1 מגיע כשהוא מגיע.' }, show: { text: { en: '4 e & a | 1', he: '4 אִי וְ אָה | 1' } } },
      { say: { en: 'Your turn: groove, a one-beat fill, and land on 1.', he: 'תורכם: גרוב, מעבר של פעמה, ונחיתה על 1.' }, show: { text: { en: 'groove · fill · 1', he: 'גרוב · מעבר · 1' } } },
    ],
    more: [
      { say: { en: 'Count while you fill: "four e and a, ONE". Saying the one out loud pulls you onto it.', he: 'סופרים בזמן המעבר: ״4 אִי וְ אָה, אחת!״. לומר את האחת בקול מושך אתכם אליה.' } },
      { say: { en: 'Around the kit: the same four sixteenths can go snare, snare, high tom, floor tom. Moving down the toms is the classic sound.', he: 'סביב המערכת: אותן ארבע שש־עשריות יכולות ללכת סנר, סנר, טום גבוה, טום רצפה. לרדת בטומים זה הצליל הקלאסי.' }, show: { kit: bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xx..', t1: '..............x.', t3: '...............x', k: 'x.......x.......' }, 4) }, play: [kit(88, [bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xx..', t1: '..............x.', t3: '...............x', k: 'x.......x.......' }, 4), bar4({ c: 'x.......', k: 'x...x...', s: '..x...x.', h: '..xxxxxx' })])] },
      { say: { en: 'Longer fills start earlier: two beats from beat 3, a whole bar from beat 1. The landing never moves.', he: 'מעברים ארוכים מתחילים מוקדם יותר: שתי פעמות מפעמה 3, תיבה שלמה מפעמה 1. הנחיתה לא זזה אף פעם.' } },
      { say: { en: 'The common mistake: the groove after the landing comes back late, or the hand stays on the toms. Go straight back to the groove on the 1.', he: 'הטעות הנפוצה: הגרוב אחרי הנחיתה חוזר באיחור, או שהיד נשארת על הטומים. חוזרים ישר לגרוב על ה־1.' } },
      { say: { en: 'In songs, fills mark the end of a phrase, often every four or eight bars, and the crash on the 1 tells the band a new section has begun.', he: 'בשירים, מעברים מסמנים סוף של משפט, הרבה פעמים כל ארבע או שמונה תיבות, והקראש על ה־1 אומר ללהקה שקטע חדש התחיל.' } },
      { say: { en: 'A practice tip: play three bars of groove and one bar with the fill, again and again, with the click. Four-bar phrases are how most songs are built.', he: 'טיפ לתרגול: נגנו שלוש תיבות של גרוב ותיבה אחת עם מעבר, שוב ושוב, עם הקליק. משפטים של ארבע תיבות הם הדרך שבה בנויים רוב השירים.' }, play: [kit(100, [ROCK, ROCK, ROCK, bar4({ h: 'x.x.x.x.x.x.....', s: '....x.......xxxx', k: 'x.......x.......' }, 4)])] },
      { say: { en: 'Recap: keep the groove, fill on beat 4, count it out loud, and land crash and kick together, right on 1.', he: 'לסיכום: שומרים על הגרוב, ממלאים את פעמה 4, סופרים בקול, ונוחתים בקראש וקיק יחד, בדיוק על 1.' } },
    ],
  },

  // ------------------------------------------------------------------ B11 d-rolls
  {
    id: 'drum-rolls',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Singles, doubles, rolls', he: 'בודדות, כפולות, גלגולים' },
    takeaway: { en: 'Singles alternate R L R L; doubles play two per hand, R R L L, the second as strong as the first; rolls string doubles together and end on an accent.', he: 'בודדות מחליפות R L R L; כפולות מנגנות שתיים לכל יד, R R L L, השנייה חזקה כמו הראשונה; גלגולים מחברים כפולות ונגמרים בהדגשה.' },
    steps: [
      { say: { en: 'Single strokes alternate hands: right, left, right, left.', he: 'מכות בודדות מחליפות ידיים: ימין, שמאל, ימין, שמאל.' }, show: { kit: bar4({ s: 'xxxxxxxx' }), text: { en: 'R L R L R L R L', he: 'R L R L R L R L' } }, play: [kit(80, twice(bar4({ s: 'xxxxxxxx' })))] },
      { say: { en: 'Both hands must sound the same. Listen for a weak left.', he: 'שתי הידיים צריכות להישמע אותו דבר. הקשיבו ליד שמאל חלשה.' }, play: [strokes(80, Array.from({ length: 8 }, (_, i) => [i * 0.5, i % 2 ? 0.4 : 0.8] as [number, number]), 4)] },
      { say: { en: 'Double strokes: two per hand. Right right, left left.', he: 'מכות כפולות: שתיים לכל יד. ימין ימין, שמאל שמאל.' }, show: { kit: bar4({ s: 'xxxxxxxx' }), text: { en: 'R R L L R R L L', he: 'R R L L R R L L' } }, play: [kit(72, twice(bar4({ s: 'xxxxxxxx' })))] },
      { say: { en: 'The second stroke comes from the bounce, but must match the first.', he: 'המכה השנייה באה מהקפיצה, אבל חייבת להיות שווה לראשונה.' }, play: [strokes(72, Array.from({ length: 8 }, (_, i) => [i * 0.5, 0.7] as [number, number]), 4)] },
      { say: { en: 'A five-stroke roll: two doubles and an accent. R R L L, R.', he: 'גלגול של חמש מכות: שתי כפולות והדגשה. R R L L, R.' }, show: { kit: bar4({ s: 'xxxxX...xxxxX...' }, 4), text: { en: 'RRLL R> · LLRR L>', he: 'RRLL R> · LLRR L>' } }, play: [kit(72, [bar4({ s: 'xxxxX...xxxxX...' }, 4)])] },
      { say: { en: 'Your turn: singles, then doubles; slow first, then faster.', he: 'תורכם: בודדות, ואז כפולות; קודם לאט, אחר כך מהר יותר.' }, show: { text: { en: 'RLRL · RRLL', he: 'RLRL · RRLL' } } },
    ],
    more: [
      { say: { en: 'A seven-stroke roll is three doubles and an accent; a nine-stroke roll is four doubles and an accent.', he: 'גלגול של שבע מכות הוא שלוש כפולות והדגשה; גלגול של תשע מכות הוא ארבע כפולות והדגשה.' }, show: { text: { en: 'RRLLRR L> · RRLLRRLL R>', he: 'RRLLRR L> · RRLLRRLL R>' } }, play: [kit(66, [bar4({ s: 'xxxxxxX.xxxxxxxX' }, 4)])] },
      { say: { en: 'Played open, as here, you hear every stroke. Played fast and close, the doubles blur into one smooth sound.', he: 'כשמנגנים פתוח, כמו כאן, שומעים כל מכה. כשמנגנים מהר וצפוף, הכפולות מתמזגות לצליל חלק אחד.' }, play: [kit(90, [bar4({ s: 'xxxxxxxxxxxxxxxx' }, 4)])] },
      { say: { en: 'The common mistake: the second stroke of a double is weak, a bounce left to chance. Add a little finger push so the pair sounds even.', he: 'הטעות הנפוצה: המכה השנייה בכפולה חלשה, קפיצה שנשארת למזל. מוסיפים דחיפה קטנה של האצבעות כדי שהזוג יישמע שווה.' } },
      { say: { en: 'Start every pattern slowly with the click, and raise the tempo only when the two hands sound like one.', he: 'מתחילים כל תבנית לאט עם הקליק, ומעלים את הטמפו רק כששתי הידיים נשמעות כמו אחת.' } },
      { say: { en: 'Singles drive fast fills; doubles give the smooth, even sound of a roll. Most drummers drill both every day.', he: 'בודדות מניעות מעברים מהירים; כפולות נותנות את הצליל החלק והאחיד של גלגול. רוב המתופפים מתרגלים את שתיהן כל יום.' } },
      { say: { en: 'A practice tip: play eight strokes with one hand, then eight with the other, then four and four, two and two, and finally singles. This ladder evens out the hands quickly.', he: 'טיפ לתרגול: נגנו שמונה מכות ביד אחת, ואז שמונה בשנייה, אחר כך ארבע וארבע, שתיים ושתיים, ולבסוף בודדות. הסולם הזה משווה את הידיים מהר.' } },
      { say: { en: 'Recap: singles R L, doubles R R L L with an equal second stroke, rolls built from doubles ending on an accent.', he: 'לסיכום: בודדות R L, כפולות R R L L עם מכה שנייה שווה, וגלגולים שבנויים מכפולות ונגמרים בהדגשה.' } },
    ],
  },

  // ------------------------------------------------------------------ B11 d-indep
  {
    id: 'drum-indep',
    area: 'rhythm',
    emoji: '',
    title: { en: 'One limb at a time', he: 'גף אחד בכל פעם' },
    takeaway: { en: 'Build a groove limb by limb: the steady part first, then a limb in unison, then let one limb move while the others keep going. Read only the moving part.', he: 'בונים גרוב גף אחרי גף: קודם החלק הקבוע, אחר כך גף באוניסון, ואז נותנים לגף אחד לזוז בזמן שהאחרים ממשיכים. קוראים רק את החלק שזז.' },
    steps: [
      { say: { en: 'Independence: each limb plays its own part while the others keep going.', he: 'עצמאות: כל גף מנגן את התפקיד שלו בזמן שהאחרים ממשיכים.' }, play: [kit(84, twice(bar4({ h: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...' })))] },
      { say: { en: 'Build it one limb at a time. First, the hi-hat alone.', he: 'בונים גף אחד בכל פעם. קודם, ההיי־האט לבד.' }, show: { kit: bar4({ h: 'xxxxxxxx' }) }, play: [kit(84, twice(bar4({ h: 'xxxxxxxx' })))] },
      { say: { en: 'Add the kick on every hand stroke: both together, in unison.', he: 'מוסיפים את הקיק על כל מכה של היד: שניהם יחד, באוניסון.' }, show: { kit: bar4({ h: 'xxxxxxxx', k: 'xxxxxxxx' }) }, play: [kit(76, twice(bar4({ h: 'xxxxxxxx', k: 'xxxxxxxx' })))] },
      { say: { en: 'Now the kick moves, and the hi-hat stays exactly the same.', he: 'עכשיו הקיק זז, וההיי־האט נשאר בדיוק אותו דבר.' }, show: { kit: bar4({ h: 'xxxxxxxx', k: 'x..xx...' }) }, play: [kit(80, twice(bar4({ h: 'xxxxxxxx', k: 'x..xx...' })))] },
      { say: { en: 'Read only the moving part. The steady part runs on its own.', he: 'קוראים רק את החלק שזז. החלק הקבוע רץ לבד.' }, show: { kit: bar4({ h: 'xxxxxxxx', k: 'x.x..x..' }), text: { en: 'read the kick', he: 'קוראים את הקיק' } }, play: [kit(80, twice(bar4({ h: 'xxxxxxxx', k: 'x.x..x..' })))] },
      { say: { en: 'Your turn: unison first, then read the kick under the hi-hat.', he: 'תורכם: קודם אוניסון, ואז קוראים את הקיק מתחת להיי־האט.' }, show: { text: { en: 'unison · read', he: 'אוניסון · קריאה' } } },
    ],
    more: [
      { say: { en: 'If a limb drifts, slow down until every limb lands exactly together on the beats they share.', he: 'אם גף נודד, מאטים עד שכל הגפיים נוחתות בדיוק יחד על הפעמות המשותפות.' } },
      { say: { en: 'Say the moving part out loud while you play: "one, and of two, three". Speaking it helps the foot find it.', he: 'אמרו את החלק שזז בקול בזמן הנגינה: ״1, ה־וְ של 2, 3״. הדיבור עוזר לרגל למצוא אותו.' }, play: [kit(76, [bar4({ h: 'xxxxxxxx', k: 'x..xx...' })])] },
      { say: { en: 'The common mistake: the hi-hat hand copies the kick and stops on its notes. Keep the hand going like a clock.', he: 'הטעות הנפוצה: היד על ההיי־האט מחקה את הקיק ונעצרת על הצלילים שלו. היד ממשיכה כמו שעון.' } },
      { say: { en: 'An ostinato is a part that repeats unchanged; over it, one limb reads a new line every bar. Later levels change which limb reads.', he: 'אוסטינטו הוא תפקיד שחוזר בלי שינוי; מעליו, גף אחד קורא שורה חדשה בכל תיבה. שלבים מאוחרים יותר מחליפים את הגף שקורא.' }, show: { kit: bar4({ h: 'xxxxxxxx', s: '..x.x..x', k: 'x...x...' }) }, play: [kit(80, twice(bar4({ h: 'xxxxxxxx', s: '..x.x..x', k: 'x...x...' })))] },
      { say: { en: 'Where it lives: every groove is independence. The hi-hat holds steady while the kick and the snare follow the song.', he: 'איפה זה חי: כל גרוב הוא עצמאות. ההיי־האט נשאר יציב בזמן שהקיק והסנר הולכים עם השיר.' } },
      { say: { en: 'A practice tip: loop one bar for a minute before you change anything. Independence grows from repetition: the limbs learn the pattern, so the mind is free to read the next one.', he: 'טיפ לתרגול: חזרו על תיבה אחת במשך דקה לפני שמשנים משהו. עצמאות צומחת מחזרה: הגפיים לומדות את התבנית, והראש פנוי לקרוא את הבאה.' } },
      { say: { en: 'Recap: the steady part first, then a limb in unison, then one limb moves; read only what moves, and slow down when a limb drifts.', he: 'לסיכום: קודם החלק הקבוע, אחר כך גף באוניסון, ואז גף אחד זז; קוראים רק את מה שזז, ומאטים כשגף נודד.' } },
    ],
  },

  // ------------------------------------------------------------------ B11 d-ear: the drummer's ear (echo)
  {
    id: 'drum-echo',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Echo: hear it, play it', he: 'הד: שומעים ומנגנים' },
    takeaway: { en: 'The app plays a bar, you play it back in the next one: count while you listen, notice numbers and "and"s, come in right on 1, rhythm before dynamics.', he: 'האפליקציה מנגנת תיבה, ואתם מנגנים אותה בחזרה בתיבה הבאה: סופרים בזמן ההקשבה, שמים לב למספרים ול״וְ״, נכנסים בדיוק על 1, הקצב לפני העוצמה.' },
    steps: [
      { say: { en: 'Echo: the app plays a bar; you play it back in the next bar.', he: 'הד: האפליקציה מנגנת תיבה; אתם מנגנים אותה בחזרה בתיבה הבאה.' }, play: [snare('q.ee.q.q', 84)] },
      { say: { en: 'Count the beat while you listen: one, two, three, four.', he: 'סופרים את הפעמה בזמן ההקשבה: 1, 2, 3, 4.' }, show: { text: { en: '1 2 3 4', he: '1 2 3 4' } }, play: [snare('ee.q.ee.q', 84)] },
      { say: { en: 'Notice where each stroke falls: on a number, or on an "and".', he: 'שימו לב איפה נופלת כל מכה: על מספר, או על ״וְ״.' }, show: { rhythm: 'q.ere.q.q', text: { en: '1 · &2 · 3 · 4', he: '1 · וְ2 · 3 · 4' } }, play: [snare('q.ere.q.q', 84)] },
      { say: { en: 'Come in right on 1. Don’t wait to think.', he: 'נכנסים בדיוק על 1. לא מחכים לחשוב.' }, show: { text: { en: 'listen | play', he: 'מקשיבים | מנגנים' } } },
      { say: { en: 'Copy the rhythm first; loud and soft come later.', he: 'קודם מעתיקים את הקצב; חזק וחלש באים אחר כך.' }, play: [snare('ee.ee.q.qr', 84)] },
      { say: { en: 'Your turn: listen, count, and echo it on the snare.', he: 'תורכם: מקשיבים, סופרים, ומחזירים הד בסנר.' }, show: { text: { en: 'hear · count · play', he: 'שומעים · סופרים · מנגנים' } } },
    ],
    more: [
      { say: { en: 'Count the rhythm in your head: a number for each beat, "and" for the second eighth. A rhythm you can count, you can play.', he: 'ספרו את הקצב בראש: מספר לכל פעמה, "וְ" לשמינית השנייה. קצב שאפשר לספור, אפשר לנגן.' }, play: [snare('q.ee.ee.q', 84)] },
      { say: { en: 'Keep the beat in your body while you listen, with a foot or a nod. Your bar starts from that beat, not from the last note you heard.', he: 'שמרו על הפעמה בגוף בזמן ההקשבה, ברגל או בהנהון. התיבה שלכם מתחילה מהפעמה הזאת, לא מהצליל האחרון ששמעתם.' } },
      { say: { en: 'The common mistake: copying the speed of the last notes and rushing the start. The bar has four beats whatever the rhythm.', he: 'הטעות הנפוצה: להעתיק את המהירות של הצלילים האחרונים ולמהר בהתחלה. בתיבה יש ארבע פעמות, לא משנה מה הקצב.' } },
      { say: { en: 'Later the echo grows: sixteenths, then a whole groove on kick, snare and hi-hat. Listen to one part at a time, the kick first, then the snare.', he: 'בהמשך ההד גדל: שש־עשריות, ואחר כך גרוב שלם בקיק, סנר והיי־האט. מקשיבים לחלק אחד בכל פעם, קודם הקיק ואז הסנר.' }, play: [kit(84, [ROCK], { count: true })] },
      { say: { en: 'Where it lives: trading bars in a jam, learning grooves from records, and call and response with a band.', he: 'איפה זה חי: חילופי תיבות בג׳אם, לימוד גרובים מהקלטות, ושאלה ותשובה עם להקה.' } },
      { say: { en: 'Start with short, simple bars: quarters and eighths only. When you echo them right every time, the levels move on to sixteenths and grooves.', he: 'מתחילים בתיבות קצרות ופשוטות: רבעים ושמיניות בלבד. כשההד יוצא נכון בכל פעם, השלבים עוברים לשש־עשריות ולגרובים.' } },
      { say: { en: 'Recap: count while you listen, place every stroke on a number or an "and", and come in right on 1.', he: 'לסיכום: סופרים בזמן ההקשבה, ממקמים כל מכה על מספר או על ״וְ״, ונכנסים בדיוק על 1.' } },
    ],
  },

  // ------------------------------------------------------------------ topic drum-style: styles by ear
  {
    id: 'drum-styles-ear',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Styles by ear', he: 'סגנונות בשמיעה' },
    takeaway: { en: 'Listen to the cymbal first, then the snare, then the kick: rock is straight eighths and a backbeat, swing the ride’s ding, ding-a, bossa the cross-stick clave, reggae the empty 1 and the drop on 3.', he: 'מקשיבים קודם למצילה, אחר כך לסנר, ואז לקיק: רוק הוא שמיניות ישרות ובקביט, סווינג הוא דינג, דינג־אה של הרייד, בוסה היא קלאבה בקרוס־סטיק, רגאיי הוא 1 ריק ונפילה על 3.' },
    steps: [
      { say: { en: 'Every style has a fingerprint. Listen to the cymbal first.', he: 'לכל סגנון יש טביעת אצבע. מקשיבים קודם למצילה.' }, show: { text: { en: 'cymbal · snare · kick', he: 'מצילה · סנר · קיק' } }, play: [style('rock')] },
      { say: { en: 'Rock: straight eighths on the hi-hat, the snare on 2 and 4.', he: 'רוק: שמיניות ישרות בהיי־האט, הסנר על 2 ו־4.' }, show: { kit: ROCK }, play: [style('rock')] },
      { say: { en: 'Swing: ding, ding-a on the ride, the hi-hat foot on 2 and 4.', he: 'סווינג: דינג, דינג־אה ברייד, רגל ההיי־האט על 2 ו־4.' }, show: { kit: bar4({ ...RIDE, p: SHUF_SN }, 3) }, play: [style('swing')] },
      { say: { en: 'Bossa nova: soft eighths and the clave on the cross-stick.', he: 'בוסה נובה: שמיניות רכות והקלאבה בקרוס־סטיק.' }, show: { kit: bar4({ h: 'xxxxxxxx', rm: 'x..x..x.', k: 'x..xx..x' }) }, play: [style('bossa')] },
      { say: { en: 'Reggae one-drop: beat 1 is empty; kick and snare land together on 3.', he: 'רגאיי וואן־דרופ: פעמה 1 ריקה; הקיק והסנר נוחתים יחד על 3.' }, show: { text: { en: '1 . 2 . 3 X 4 .', he: '1 . 2 . 3 X 4 .' } }, play: [style('reggae')] },
      { say: { en: 'Your turn: which style is the band playing?', he: 'תורכם: באיזה סגנון הלהקה מנגנת?' }, show: { text: { en: 'rock · swing · bossa · reggae', he: 'רוק · סווינג · בוסה · רגאיי' } } },
    ],
    more: [
      { say: { en: 'Straight or swung? That one question separates rock from swing at once. Then the cymbal: a hi-hat in rock, a ride in swing.', he: 'ישר או בסווינג? השאלה האחת הזאת מפרידה מיד בין רוק לסווינג. אחר כך המצילה: היי־האט ברוק, רייד בסווינג.' }, play: [style('rock'), style('swing')] },
      { say: { en: 'Then find the snare: a loud backbeat in rock, a light cross-stick pattern in bossa, a single drop on 3 in reggae.', he: 'אחר כך מוצאים את הסנר: בקביט חזק ברוק, תבנית קרוס־סטיק קלה בבוסה, נפילה אחת על 3 ברגאיי.' } },
      { say: { en: 'The kick tells the rest: 1 and 3 in rock, 1 and 3 with pickups in bossa, and on 3 with the snare in the one-drop.', he: 'הקיק מספר את השאר: 1 ו־3 ברוק, 1 ו־3 עם המכות שלפניהן בבוסה, ועל 3 יחד עם הסנר בוואן־דרופ.' }, play: [style('bossa'), style('reggae')] },
      { say: { en: 'The common mistake: judging by the chords or the tempo. A slow rock and a soft bossa can share a tempo; the drum pattern decides.', he: 'הטעות הנפוצה: לשפוט לפי האקורדים או הטמפו. רוק איטי ובוסה רכה יכולים לחלוק טמפו; תבנית התופים מכריעה.' } },
      { say: { en: 'Later levels add the shuffle, funk, samba and the jazz waltz, and then pairs that sound alike, like swing and the shuffle.', he: 'שלבים מאוחרים יותר מוסיפים שאפל, פאנק, סמבה וואלס ג׳אזי, ואחר כך זוגות שנשמעים דומה, כמו סווינג ושאפל.' } },
      { say: { en: 'A listening tip: before naming the style, tap the beat and count one bar. Most styles give themselves away within a single bar, once you know where to listen.', he: 'טיפ להאזנה: לפני שנותנים שם לסגנון, הקישו את הפעמה וספרו תיבה אחת. רוב הסגנונות מתגלים בתוך תיבה אחת, כשיודעים לאן להקשיב.' } },
      { say: { en: 'Recap: cymbal first, straight or swung; then the snare; then the kick. Three questions name the style.', he: 'לסיכום: קודם המצילה, ישר או בסווינג; אחר כך הסנר; ואז הקיק. שלוש שאלות נותנות את שם הסגנון.' } },
    ],
  },
];
