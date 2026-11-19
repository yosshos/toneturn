// Heads (docs/AUDIT-DEPTH-3.md C1, #4, C3): the quick lessons before the k-harm, g-cmel and k-tune / g-tune / b-tune
// families (and the melody-fit ear topic). Every example is played from the same music the drills use
// (src/engine/heads.ts, reharm.ts) on the original head "Corner Bench" (src/content/heads.ts), in F.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { HEADS } from '../heads';
import { chordAt, harmEvents, headIn, HARM_STYLES } from '../../engine/heads';
import { optimalPath, type VLGoal } from '../../engine/drills/voiceLead';
import { voice, type Voiced } from '../../engine/drills/chartDrills';
import { parseChart } from '../../engine/charts';
import { applyPlan, autoPlan, type Device } from '../../engine/reharm';

type Ev = { midi: number; start: number; duration: number; velocity: number };
const ev = (evs: Ev[], length: number): Stimulus[] => (evs.length ? [{ kind: 'events', events: evs, length }] : []);
const HI = () => headIn(HEADS[0], 5);
const pc = (n: number) => ((n % 12) + 12) % 12;
const mel = (from: number, sec: number): Ev[] => HI().notes.filter((n) => n.beat >= from * 4 && n.beat < from * 4 + 16).map((n) => ({ midi: n.pitch, start: (n.beat - from * 4) * sec, duration: n.dur * sec * 0.95, velocity: 0.75 }));

/** Four bars of the melody alone. */
function melodyStim(bpm = 96): Stimulus[] {
  const sec = 60 / bpm;
  return ev(mel(0, sec), 16 * sec + 0.5);
}
/** The first phrase harmonised in a style (the smallest-motion voicings, the LH root under each). */
function harmStim(style: string, bpm = 84): Stimulus[] {
  try {
    const hi = HI();
    const st = HARM_STYLES[style];
    const es = harmEvents(hi, 0, 4, st);
    const g: VLGoal = { chords: es.map((e) => e.chord), at: es.map((e) => e.note.beat), type: st.type, tol: st.tol, lo: st.lo, hi: st.hi, bass: true, ...(st.over ? { over: true } : {}) };
    const path = optimalPath(g);
    const sec = 60 / bpm;
    const out: Ev[] = [];
    path.forEach((v, k) => {
      const t0 = g.at[k] * sec;
      const d = ((g.at[k + 1] ?? 16) - g.at[k]) * sec * 0.95;
      for (const m of [...v, ...(st.over ? [g.chords[k].melody!] : [])]) out.push({ midi: m, start: t0, duration: d, velocity: m === g.chords[k].melody ? 0.85 : 0.55 });
      out.push({ midi: 36 + pc(g.chords[k].root - 36), start: t0, duration: d, velocity: 0.5 });
    });
    return ev(out, 16 * sec + 0.6);
  } catch {
    return [];
  }
}
/** The melody with one low voice on each downbeat: the root, or a guide tone (3rd or 7th) below the melody. */
function twoVoiceStim(guide: boolean, bpm = 92): Stimulus[] {
  const hi = HI();
  const sec = 60 / bpm;
  const out = mel(0, sec);
  for (const n of hi.notes.filter((x) => x.beat < 16 && x.beat % 4 === 0)) {
    const c = chordAt(hi.chords, n.beat);
    const third = c.iv.includes(3) ? 3 : 4;
    const sev = c.iv.includes(10) ? 10 : c.iv.includes(11) ? 11 : 9;
    let low = guide ? n.pitch - 12 + pc(c.root + third - (n.pitch - 12)) : 40 + pc(c.root - 40);
    if (guide && low >= n.pitch - 2) low = n.pitch - 12 + pc(c.root + sev - (n.pitch - 12));
    out.push({ midi: low, start: n.beat * sec, duration: 4 * sec * 0.9, velocity: 0.5 });
  }
  return ev(out, 16 * sec + 0.5);
}
/** Four bars (from `from`): LH shells (as written, or reharmonised with `devices`) under the melody. */
function compStim(devices: Device[] | null, from = 0, bpm = 120): Stimulus[] {
  const hi = HI();
  const text = devices ? applyPlan(hi.text, autoPlan(hi.text, hi.tonic, devices, hi.notes), hi.tonic, hi.notes).text : hi.text;
  const sec = 60 / bpm;
  const out: Ev[] = mel(from, sec);
  let prev: Voiced | null = null;
  for (const c of parseChart(text).chords.filter((x) => x.bar >= from && x.bar < from + 4)) {
    const v = voice(c, 'shell', prev);
    prev = v;
    for (const m of v.lh) out.push({ midi: m, start: (c.bar * 4 + c.at - from * 4) * sec, duration: c.beats * sec * 0.9, velocity: 0.5 });
  }
  return ev(out, 16 * sec + 0.6);
}
/** A chord, then a melody note on top (C major 7 under D, then under F). */
const fitStim = (top: number): Stimulus[] => ev([{ midi: 36, start: 0, duration: 2, velocity: 0.5 }, ...[52, 55, 59].map((m) => ({ midi: m, start: 0, duration: 2, velocity: 0.45 })), { midi: top, start: 0.5, duration: 1.5, velocity: 0.8 }], 2.3);

export const LESSONS: MiniLesson[] = [
  {
    id: 'harmonize-melody',
    area: 'jazz',
    emoji: 'H',
    title: { en: 'Harmonising a melody', he: 'הרמון של מנגינה' },
    takeaway: {
      en: 'The melody stays on top; under each strong melody note goes a voicing of the bar’s chord that contains it: shells, then four-way close, drop 2, drop 3.',
      he: 'המנגינה נשארת למעלה; מתחת לכל צליל חזק במנגינה בא קול של האקורד של התיבה שמכיל אותו: שלדים, ואז ארבעה קולות צמודים, דרופ 2, דרופ 3.',
    },
    steps: [
      { say: { en: 'First the melody alone. Learn it until you can sing it, because every chord you add will sit under it.', he: 'קודם המנגינה לבד. למדו אותה עד שתוכלו לשיר אותה, כי כל אקורד שתוסיפו יישב מתחתיה.' }, play: melodyStim() },
      {
        say: { en: 'Shells under it: the root in the left hand, and the 3rd and 7th of the chord just below the melody note.', he: 'שלדים מתחתיה: השורש ביד שמאל, והטרצה והספטימה של האקורד ממש מתחת לצליל המנגינה.' },
        play: harmStim('shell'),
        show: { text: { en: 'root · 3 · 7 · melody', he: 'שורש · 3 · 7 · מנגינה' } },
      },
      {
        say: { en: 'Four-way close: the melody note is the top of a close four-note chord. A major chord under its root or its 6th becomes a 6 chord.', he: 'ארבעה קולות צמודים: צליל המנגינה הוא הקצה העליון של אקורד צמוד בן ארבעה צלילים. אקורד מז׳ורי מתחת לשורש או לסקסטה שלו הופך לאקורד 6.' },
        play: harmStim('close'),
      },
      {
        say: { en: 'Drop 2: take the second voice from the top down an octave. The melody sings out above a wider, warmer chord.', he: 'דרופ 2: מורידים את הקול השני מלמעלה באוקטבה. המנגינה בולטת מעל אקורד רחב וחם יותר.' },
        play: harmStim('drop2'),
        show: { text: { en: 'drop 2 · drop 3', he: 'דרופ 2 · דרופ 3' } },
      },
      { say: { en: 'Your turn: phrase by phrase, in all twelve keys. Free time first, then the click. Move each inner voice to the nearest note.', he: 'תורכם: משפט אחר משפט, בכל שנים־עשר הסולמות. קודם בזמן חופשי, אחר כך עם המטרונום. הזיזו כל קול פנימי לצליל הקרוב.' } },
    ],
    more: [
      { say: { en: 'Only the notes on beats one and three, and the notes where a chord starts, get a chord. The notes between them pass by on their own.', he: 'רק הצלילים על פעמה אחת ושלוש, והצלילים שבהם אקורד מתחיל, מקבלים אקורד. הצלילים שביניהם עוברים לבד.' }, play: melodyStim(80) },
      { say: { en: 'A note that is not in the chord, like a 9th, stays single for now. The 6th-diminished blocks, coming later, give such a note the diminished chord.', he: 'צליל שאינו באקורד, כמו נונה, נשאר לבד בינתיים. בלוקי השש-מוקטן, שיבואו בהמשך, נותנים לצליל כזה את האקורד המוקטן.' } },
      { say: { en: 'Drop 3 takes the third voice from the top down instead. It spreads the hands further, a sound pianists and guitarists both love for ballads.', he: 'בדרופ 3 מורידים במקום זה את הקול השלישי מלמעלה. הוא פותח את הידיים עוד יותר, צליל שפסנתרנים וגיטריסטים אוהבים בבלדות.' }, play: harmStim('drop3') },
      { say: { en: 'Common mistake: letting a lower voice climb above the melody. Check the top note first, then fill in the rest from the top down, one voice at a time.', he: 'טעות נפוצה: לתת לקול נמוך לעלות מעל המנגינה. בדקו קודם את הצליל העליון, ואז מלאו את השאר מלמעלה למטה, קול אחד בכל פעם.' } },
      { say: { en: 'Where it lives: big-band sax sections, Shearing’s locked hands, and every solo-piano ballad. The melody leads; the harmony follows it.', he: 'איפה זה חי: גזרת הסקסופונים של הביג בנד, הידיים הנעולות של שירינג, וכל בלדה לפסנתר סולו. המנגינה מובילה; ההרמוניה הולכת אחריה.' } },
      { say: { en: 'To keep: melody on top, a chord tone under it, the smallest move to the next chord. Sing the melody while you play the chords.', he: 'מה לזכור: המנגינה למעלה, צליל אקורד מתחתיה, התנועה הקטנה ביותר לאקורד הבא. שירו את המנגינה בזמן שאתם מנגנים את האקורדים.' } },
    ],
  },
  {
    id: 'chord-melody',
    area: 'play',
    emoji: 'C',
    title: { en: 'Chord-melody', he: 'אקורד-מלודיה' },
    takeaway: {
      en: 'Melody on the top strings; under it, step by step: the bass note on the downbeats, a guide tone, a drop-2 voicing on the top four strings, a passing diminished.',
      he: 'המנגינה על המיתרים העליונים; מתחתיה, שלב אחר שלב: צליל בס על הפעמות, צליל מנחה, דרופ 2 על ארבעת המיתרים העליונים, מוקטן עובר.',
    },
    steps: [
      { say: { en: 'Find the melody in one position on the top strings, so that a chord can fit under every note without a jump.', he: 'מצאו את המנגינה בפוזיציה אחת על המיתרים העליונים, כך שאקורד יוכל להיכנס מתחת לכל צליל בלי קפיצה.' }, play: melodyStim() },
      { say: { en: 'Add the root on string six or five on each downbeat. Two voices already sound like a small band.', he: 'הוסיפו את השורש על מיתר שש או חמש בכל פעמה ראשונה. שני קולות כבר נשמעים כמו הרכב קטן.' }, play: twoVoiceStim(false) },
      { say: { en: 'Then a guide tone, the 3rd or the 7th, under the melody instead of the root. Now the harmony is clear without a bass.', he: 'אחר כך צליל מנחה, הטרצה או הספטימה, מתחת למנגינה במקום השורש. עכשיו ההרמוניה ברורה גם בלי בס.' }, play: twoVoiceStim(true) },
      {
        say: { en: 'Drop 2 on strings four, three, two and one, with the melody on string one. Notes outside the chord can take the diminished that contains them.', he: 'דרופ 2 על מיתרים ארבע, שלוש, שתיים ואחת, והמנגינה על מיתר אחת. צלילים מחוץ לאקורד יכולים לקבל את המוקטן שמכיל אותם.' },
        play: harmStim('drop2'),
      },
      { say: { en: 'Your turn: each step on four bars, then a whole chorus, in all twelve keys. Free time first.', he: 'תורכם: כל שלב על ארבע תיבות, ואז פזמון שלם, בכל שנים־עשר הסולמות. קודם בזמן חופשי.' } },
    ],
    more: [
      { say: { en: 'Pick the position from the highest melody note: it must sit on string one or two, with room for three strings below it. Then check the lowest note fits the same hand.', he: 'בחרו את הפוזיציה לפי צליל המנגינה הגבוה ביותר: הוא צריך לשבת על מיתר אחת או שתיים, עם מקום לשלושה מיתרים מתחתיו. אחר כך בדקו שהצליל הנמוך ביותר נכנס באותה יד.' } },
      { say: { en: 'Chord on the strong beats, single notes between. The ear fills in the harmony, and the melody keeps moving.', he: 'אקורד על הפעמות החזקות, צלילים בודדים ביניהן. האוזן משלימה את ההרמוניה, והמנגינה ממשיכה לזרום.' }, play: harmStim('close', 100) },
      { say: { en: 'The bass on the downbeats is the start of a solo-guitar texture. Later the bass can walk between the chords.', he: 'הבס על הפעמות הוא תחילתו של מרקם גיטרת סולו. בהמשך הבס יכול ללכת בין האקורדים.' }, play: twoVoiceStim(false, 104) },
      { say: { en: 'Common mistake: a voicing that leaves the melody on string two while the chord rings above it. Keep the melody the highest string sounding.', he: 'טעות נפוצה: קול שמשאיר את המנגינה על מיתר שתיים בזמן שהאקורד מצלצל מעליה. המנגינה צריכה להיות המיתר הגבוה שמצלצל.' } },
      { say: { en: 'Where it lives: Joe Pass, Johnny Smith and Barney Kessel played whole tunes this way, with no band at all, from slow ballads to fast swing.', he: 'איפה זה חי: ג׳ו פאס, ג׳וני סמית׳ ובארני קסל ניגנו כך שירים שלמים, בלי להקה בכלל, מבלדות איטיות ועד סווינג מהיר.' } },
      { say: { en: 'To keep: melody first, then the bass, then the guide tone, then the full voicing. Each step is a finished arrangement on its own, so play every step musically.', he: 'מה לזכור: קודם המנגינה, אחר כך הבס, אחר כך הצליל המנחה, ואז הקול המלא. כל שלב הוא עיבוד שלם בפני עצמו, אז נגנו כל שלב במוזיקליות.' } },
    ],
  },
  {
    id: 'reharm-tune',
    area: 'jazz',
    emoji: 'R',
    title: { en: 'Reharmonising a tune', he: 'הרמון מחדש של שיר' },
    takeaway: {
      en: 'Learn the head’s changes step by step, then swap chords bar by bar: tritone sub, extra ii–V, backdoor, passing dim, line cliché, Coltrane. The melody must still fit each new chord.',
      he: 'לומדים את ההרמוניה של השיר שלב אחר שלב, ואז מחליפים אקורדים תיבה אחר תיבה: טריטון, ii–V נוסף, דלת אחורית, מוקטן עובר, קו קלישאה, קולטריין. המנגינה חייבת להתאים לכל אקורד חדש.',
    },
    steps: [
      { say: { en: 'Comp the head as written first: roots, guide tones, shells, rootless, drop 2, and then the melody over your own comp.', he: 'קודם מלווים את השיר כפי שהוא כתוב: שורשים, צלילים מנחים, שלדים, בלי שורש, דרופ 2, ואז המנגינה מעל הליווי שלכם.' }, play: compStim(null) },
      {
        say: { en: 'Now change bars. A dominant that resolves can become the dominant a tritone away: the melody’s 3rd turns into the new chord’s 7th.', he: 'עכשיו מחליפים תיבות. דומיננט שנפתר יכול להפוך לדומיננט במרחק טריטון: הטרצה של המנגינה הופכת לספטימה של האקורד החדש.' },
        play: compStim(['tritone', 'iiV']),
        show: { text: { en: 'G7 → D♭7: B = ♭7', he: 'G7 → D♭7: B = ♭7' } },
      },
      { say: { en: 'Check every strong melody note against the new chord. A chord tone or a tension is fine; the 11th over a major chord clashes.', he: 'בדקו כל צליל חזק במנגינה מול האקורד החדש. צליל אקורד או מתח זה בסדר; האונדצימה מעל אקורד מז׳ורי מתנגשת.' }, play: [...fitStim(74), { kind: 'rest', duration: 0.4 }, ...fitStim(77)] },
      { say: { en: 'The backdoor, a passing diminished, a line cliché: each fits only where its chords are. The studio on the family page shows you where.', he: 'הדלת האחורית, מוקטן עובר, קו קלישאה: כל אחד מתאים רק במקום שבו האקורדים שלו נמצאים. הסטודיו בעמוד המשפחה מראה לכם איפה.' }, play: compStim(['backdoor', 'pdim', 'cliche']) },
      { say: { en: 'Then play your reharm: comp it, walk it on the bass, and play the melody over it, in all twelve keys.', he: 'ואז מנגנים את ההרמון שלכם: מלווים אותו, עושים עליו בס מהלך, ומנגנים מעליו את המנגינה, בכל שנים־עשר הסולמות.' } },
    ],
    more: [
      { say: { en: 'A tritone sub keeps the 3rd and 7th of the dominant and slides the bass down a half step into the next chord. Under a melody root it gives a sharp 11.', he: 'תחליף טריטון שומר על הטרצה והספטימה של הדומיננט ומחליק את הבס חצי טון למטה אל האקורד הבא. מתחת לשורש במנגינה הוא נותן ♯11.' } },
      { say: { en: 'An extra ii–V puts the related minor chord before a dominant, or the ii–V of the next chord in a bar that only holds a chord.', he: 'ii–V נוסף שם את האקורד המינורי הקשור לפני דומיננט, או את ה־ii–V של האקורד הבא בתיבה שרק מחזיקה אקורד.' } },
      { say: { en: 'The Coltrane sub turns a ii–V into the Giant Steps cycle: three keys a major third apart, landing on the same tonic.', he: 'תחליף קולטריין הופך ii–V למעגל של Giant Steps: שלושה סולמות במרחק טרצה גדולה, שנוחתים על אותה טוניקה.' }, play: compStim(['coltrane'], 4) },
      { say: { en: 'Common mistake: too many devices at once. Leave a bar as written between changes; the melody needs a place to breathe.', he: 'טעות נפוצה: יותר מדי תחבולות בבת אחת. השאירו תיבה כפי שנכתבה בין השינויים; המנגינה צריכה מקום לנשום.' }, play: compStim(['tritone', 'iiV'], 4) },
      { say: { en: 'Where it lives: every jazz record of a standard. Players rarely play the changes exactly as written, but the melody always fits.', he: 'איפה זה חי: בכל הקלטת ג׳אז של סטנדרט. נגנים כמעט אף פעם לא מנגנים את האקורדים בדיוק כפי שנכתבו, אבל המנגינה תמיד מתאימה.' } },
      { say: { en: 'To keep: change a bar, check the melody, play it on your instrument, and hear the new colour. A good reharm makes the old melody sound new.', he: 'מה לזכור: משנים תיבה, בודקים את המנגינה, מנגנים אותה בכלי, ושומעים את הצבע החדש. הרמון טוב גורם למנגינה הישנה להישמע חדשה.' } },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'tech:k-harm': 'harmonize-melody',
  // AUDIT-DEPTH-3 C1, #1, #3: the 6-dim conversions under a melody open with the Harris lesson on them (Dm7 as F6 with
  // E°7, G7 as Dm6 with C♯°7), borrowing with the borrowing lesson, triads under a melody with this unit's lesson.
  'tech:k-harm-9': 'bh-chords-move',
  'tech:k-harm-10': 'bh-chords-move',
  'tech:k-harm-11': 'bh-borrow',
  'tech:k-harm-12': 'bh-chords-move',
  'tech:k-harm-13': 'harmonize-melody',
  // AUDIT-DEPTH-3 C2: embellishing the head opens with the bebop lessons on approaches and enclosures and the pivot.
  'tech:k-tune-11': 'vocab-approach',
  'tech:k-tune-12': 'vocab-enclose',
  'tech:k-tune-13': 'bh-pivot-arp',
  'tech:g-tune-10': 'vocab-approach',
  'tech:g-tune-11': 'vocab-enclose',
  'tech:g-tune-12': 'bh-pivot-arp',
  'tech:b-tune-8': 'vocab-approach',
  'tech:b-tune-9': 'vocab-enclose',
  'tech:b-tune-10': 'bh-pivot-arp',
  'tech:g-cmel': 'chord-melody',
  'tech:k-tune': 'reharm-tune',
  'tech:g-tune': 'reharm-tune',
  'tech:b-tune': 'reharm-tune',
  'topic:melody-fit': 'reharm-tune',
};
