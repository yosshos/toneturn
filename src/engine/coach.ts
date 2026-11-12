// Coaching (spec X.4): personal, mistake-specific feedback. After a wrong try: a hint about *your* answer
// that does not give the right one away. After the reveal: what makes the two different. After the
// session: the pair you mixed up most, with a tip. Pure; texts in English and Hebrew.

import type { Answer, Question } from './lesson';
import { MODE_STEPS, type ModeId } from './modes';

type Lang = 'en' | 'he';
const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];
const withName = (s: string, name: string | null, l: Lang) => s.replace('{n}', name ? (l === 'en' ? `, ${name}` : ` ${name}`) : '');

/** A friendly opener that changes from turn to turn (the name now and then). */
export function opener(l: Lang, seed: number, name: string | null): string {
  const en = ['Close{n}!', 'Almost{n} —', 'Good try{n} —', 'Not quite —', 'Ooh, near miss{n} —', 'Nice effort —'];
  const he = ['קרוב{n}!', 'כמעט{n} —', 'ניסיון יפה{n} —', 'לא בדיוק —', 'פספוס קטן{n} —', 'כל הכבוד על הניסיון —'];
  const s = pick(l === 'en' ? en : he, seed);
  return withName(s, seed % 3 === 0 ? name : null, l);
}

// ---------------------------------------------------------------- characters

const DEGREE_CHAR: Record<number, { en: string; he: string }> = {
  1: { en: '1 is home — total rest', he: '1 הוא הבית — מנוחה מוחלטת' },
  2: { en: '2 sits just above home and wants to step down', he: '2 יושב ממש מעל הבית ורוצה לרדת' },
  3: { en: '3 is the warm color of the chord', he: '3 הוא הצבע החם של האקורד' },
  4: { en: '4 leans down towards 3', he: '4 נשען למטה אל 3' },
  5: { en: '5 is open and strong, a little "in the air"', he: '5 פתוח וחזק, קצת "באוויר"' },
  6: { en: '6 is soft and a bit wistful', he: '6 רך וקצת נוגה' },
  7: { en: '7 is restless and pulls up to home', he: '7 חסר מנוחה ומושך למעלה אל הבית' },
  8: { en: '8 is home again, an octave up', he: '8 הוא שוב הבית, אוקטבה למעלה' },
};
const INTERVAL_SIZE: Record<string, number> = { M3: 4, P5: 7, P8: 12 };
const INTERVAL_CHAR: Record<string, { en: string; he: string }> = {
  M3: { en: 'a major third is small and sweet', he: 'טרצה גדולה — קרובה ומתוקה' },
  P5: { en: 'a fifth is wide, open and hollow', he: 'קווינטה רחבה, פתוחה וחלולה' },
  P8: { en: 'an octave is the same note, higher', he: 'אוקטבה היא אותו צליל, גבוה יותר' },
};
const QUALITY_CHAR: Record<string, { en: string; he: string }> = {
  maj: { en: 'major is bright and settled', he: 'מז׳ור בהיר ויציב' },
  min: { en: 'minor has a darker middle note', he: 'במינור הצליל האמצעי כהה יותר' },
  dim: { en: 'diminished is squeezed and tense — its top note is lowered', he: 'מוקטן לחוץ ומתוח — הצליל העליון שלו מונמך' },
  aug: { en: 'augmented sounds stretched and unresolved — its top note is raised', he: 'מוגדל נשמע מתוח ולא פתור — הצליל העליון שלו מוגבה' },
};
const QUALITY_PAIR_TIP: Record<string, { en: string; he: string }> = {
  'maj|min': { en: 'Focus on the middle note: bright or dark?', he: 'התמקדו בצליל האמצעי: בהיר או כהה?' },
  'maj|aug': { en: 'Focus on the top note: does it sit still, or does it want to move?', he: 'התמקדו בצליל העליון: הוא נח, או רוצה לזוז?' },
  'dim|min': { en: 'Focus on the top note: stable, or squeezed inwards?', he: 'התמקדו בצליל העליון: יציב, או נלחץ פנימה?' },
};
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

const ordinal = (n: number, l: Lang) => (l === 'en' ? `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}` : `ה־${n}`);

/** The degrees (1-based) where two modes differ, and whether `a` is higher there. */
export function modeDifference(a: ModeId, b: ModeId): { degree: number; aHigher: boolean }[] {
  const A = MODE_STEPS[a];
  const B = MODE_STEPS[b];
  const out: { degree: number; aHigher: boolean }[] = [];
  for (let i = 1; i < Math.min(A.length, B.length) - 1; i++) if (A[i] !== B[i]) out.push({ degree: i + 1, aHigher: A[i] > B[i] });
  return out;
}

// ---------------------------------------------------------------- after a wrong try (no spoilers)

export function retryCoach(q: Question, given: Answer, l: Lang, seed: number, name: string | null): string | null {
  const o = opener(l, seed, name);
  switch (q.kind) {
    case 'degree': {
      const g = Number(given);
      const a = Number(q.answer);
      if (!g || g === a) return null;
      const lower = a < g;
      return l === 'en'
        ? `${o} it's not ${g}. Listen again: this one is ${lower ? 'lower' : 'higher'} than ${g}. Sing up from home if you're unsure.`
        : `${o} זה לא ${g}. הקשיבו שוב: הצליל הזה ${lower ? 'נמוך' : 'גבוה'} מ־${g}. אם לא בטוחים — שירו למעלה מהבית.`;
    }
    case 'interval': {
      const gs = INTERVAL_SIZE[String(given)];
      const as = INTERVAL_SIZE[String(q.answer)];
      if (!gs || !as) return null;
      return l === 'en' ? `${o} it's ${as < gs ? 'smaller' : 'bigger'} than that. Sing the two notes to measure the gap.` : `${o} הוא ${as < gs ? 'קטן' : 'גדול'} יותר. שירו את שני הצלילים כדי למדוד את המרחק.`;
    }
    case 'quality': {
      const tip = QUALITY_PAIR_TIP[pairKey(String(given), String(q.answer))];
      return tip ? `${o} ${tip[l]}` : null;
    }
    case 'inversion':
      return l === 'en' ? `${o} listen only to the lowest note — hum it, then compare it with the chord.` : `${o} הקשיבו רק לצליל הנמוך ביותר — זמזמו אותו, ואז השוו לאקורד.`;
    case 'cadence':
      return l === 'en' ? `${o} listen to the very last chord: does it feel like arriving home, or like a question?` : `${o} הקשיבו לאקורד האחרון: הוא מרגיש כמו הגעה הביתה, או כמו שאלה?`;
    case 'mode-id': {
      const diff = modeDifference(q.answer as ModeId, given as ModeId);
      if (!diff.length) return null;
      const d = diff[0];
      return l === 'en'
        ? `${o} not ${String(given)}. Listen closely to the ${ordinal(d.degree, l)} note of the scale — that's where they differ.`
        : `${o} זה לא המודוס הזה. הקשיבו היטב לצליל ${ordinal(d.degree, l)} של הסולם — שם הם שונים.`;
    }
    case 'wrong-note': {
      const g = Number(given);
      const p = Number(q.answer);
      if (!g || g === p) return null;
      return l === 'en' ? `${o} note ${g} was fine. The odd one comes ${p > g ? 'later' : 'earlier'}.` : `${o} צליל ${g} היה בסדר. החריג מגיע ${p > g ? 'אחריו' : 'לפניו'}.`;
    }
    case 'degree-seq': {
      const want = String(q.answer).split('-');
      const got = String(given).split('-');
      const k = want.findIndex((x, i) => got[i] !== x);
      if (k <= 0) return null;
      return l === 'en' ? `${o} the first ${k} ${k === 1 ? 'note was' : 'notes were'} right — listen again for note ${k + 1}.` : `${o} ${k === 1 ? 'הצליל הראשון היה נכון' : `${k} הצלילים הראשונים היו נכונים`} — הקשיבו שוב לצליל ${k + 1}.`;
    }
    case 'choice': {
      const n = q.names[String(given)];
      if (!n) return null;
      return l === 'en' ? `${o} not ${n.en}. Listen for what sets it apart.` : `${o} זה לא ${n.he}. הקשיבו למה שמייחד אותו.`;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- after the reveal: the difference

export function revealCoach(q: Question, given: Answer, l: Lang): string | null {
  switch (q.kind) {
    case 'degree': {
      const g = Number(given);
      const a = Number(q.answer);
      if (!g || g === a || !DEGREE_CHAR[a] || !DEGREE_CHAR[g]) return null;
      return l === 'en' ? `You said ${g}: ${DEGREE_CHAR[g].en}, while ${DEGREE_CHAR[a].en}.` : `אמרתם ${g}: ${DEGREE_CHAR[g].he}, ואילו ${DEGREE_CHAR[a].he}.`;
    }
    case 'interval': {
      const g = INTERVAL_CHAR[String(given)];
      const a = INTERVAL_CHAR[String(q.answer)];
      if (!g || !a || given === q.answer) return null;
      return l === 'en' ? `Remember: ${a.en}; ${g.en}.` : `זכרו: ${a.he}; ${g.he}.`;
    }
    case 'quality': {
      const g = QUALITY_CHAR[String(given)];
      const a = QUALITY_CHAR[String(q.answer)];
      if (!g || !a || given === q.answer) return null;
      return l === 'en' ? `The difference: ${a.en}, ${g.en}.` : `ההבדל: ${a.he}, ${g.he}.`;
    }
    case 'mode-id': {
      const diff = modeDifference(q.answer as ModeId, given as ModeId);
      if (!diff.length) return null;
      const parts = diff.slice(0, 2).map((d) => (l === 'en' ? `the ${ordinal(d.degree, l)} is ${d.aHigher ? 'higher' : 'lower'}` : `הצליל ${ordinal(d.degree, l)} ${d.aHigher ? 'גבוה' : 'נמוך'} יותר`));
      return l === 'en' ? `Compared with your answer, ${parts.join(' and ')}.` : `בהשוואה לתשובה שלכם, ${parts.join(' ו')}.`;
    }
    case 'degree-seq': {
      const want = String(q.answer).split('-');
      const got = String(given).split('-');
      const off = want.map((x, i) => (got[i] !== x ? i + 1 : 0)).filter(Boolean);
      if (!off.length || off.length === want.length) return null;
      return l === 'en' ? `You had ${want.length - off.length} of ${want.length} — the ${off.length === 1 ? 'note' : 'notes'} at ${off.join(', ')} went astray.` : `צדקתם ב־${want.length - off.length} מתוך ${want.length} — ${off.length === 1 ? 'הצליל במקום' : 'הצלילים במקומות'} ${off.join(', ')} התפספסו.`;
    }
    case 'choice':
      return choiceContrast(q, String(given), l);
    default:
      return null;
  }
}

/** Practice topics (spec X.4): what makes the given answer and the right one different. */
function choiceContrast(q: Extract<Question, { kind: 'choice' }>, given: string, l: Lang): string | null {
  const a = q.names[q.answer];
  const g = q.names[given];
  if (!a || !g || given === q.answer) return null;
  // Scales: name the degree where they part ways.
  if (q.answer in MODE_STEPS && given in MODE_STEPS) {
    const d = modeDifference(q.answer as ModeId, given as ModeId)[0];
    if (d) return l === 'en' ? `${a.en} and ${g.en} part ways at the ${ordinal(d.degree, l)} note — in ${a.en} it is ${d.aHigher ? 'higher' : 'lower'}.` : `${a.he} ו${g.he} נפרדים בצליל ${ordinal(d.degree, l)} — ב${a.he} הוא ${d.aHigher ? 'גבוה' : 'נמוך'} יותר.`;
  }
  const hint = TOPIC_CONTRAST[q.topic];
  const tip = hint ? hint[l] : l === 'en' ? 'Your answer plays first, then the right one — listen for what changes.' : 'התשובה שלכם מתנגנת קודם, ואז הנכונה — הקשיבו למה שמשתנה.';
  // The reveal already names the right answer (and the screen shows it): say only what is new.
  return l === 'en' ? `Not ${g.en}. ${tip}` : `לא ${g.he}. ${tip}`;
}

/** One listening tip per practice topic, said with the contrast. */
const TOPIC_CONTRAST: Record<string, { en: string; he: string }> = {
  extensions: { en: 'Listen to the top note only: it carries the color.', he: 'הקשיבו רק לצליל העליון: הוא נושא את הצבע.' },
  voicings: { en: 'Listen to the spacing and to the lowest note.', he: 'הקשיבו למרווחים בין הצלילים ולצליל הנמוך ביותר.' },
  progressions: { en: 'Follow the bass: where it moves tells the progression.', he: 'עקבו אחרי הבס: לאן שהוא זז — זה המהלך.' },
  form: { en: 'Compare each phrase with the first one: same start? same end?', he: 'השוו כל משפט לראשון: אותה התחלה? אותו סוף?' },
  'fine-pitch': { en: 'Hum the first note softly and feel which way the second pulls.', he: 'זמזמו בשקט את הצליל הראשון והרגישו לאן השני מושך.' },
  'in-tune': { en: 'Out of tune, two notes beat — a slow wobble in the sound.', he: 'כשהם לא מכוונים, שני צלילים פועמים — רעד איטי בצליל.' },
  'two-voice': { en: 'Follow one voice at a time, then the other.', he: 'עקבו אחרי קול אחד בכל פעם, ואז אחרי השני.' },
  'set-classes': { en: 'Find the ingredients: a semitone crunch, a tritone, an open fifth.', he: 'חפשו את המרכיבים: חיכוך של חצי טון, טריטון, קווינטה פתוחה.' },
  maqam: { en: 'The first four notes (the jins) give the flavor — listen to their gaps.', he: 'ארבעת הצלילים הראשונים (הג׳ינס) נותנים את הטעם — הקשיבו למרווחים ביניהם.' },
  'eastern-rhythm': { en: 'Listen for where the low dums fall in the cycle.', he: 'הקשיבו איפה נופלים הדומים הנמוכים במחזור.' },
  polyrhythm: { en: 'Count the low drum first, then the high clicks between two meeting points.', he: 'ספרו קודם את התוף הנמוך, ואז את הקליקים הגבוהים בין שתי נקודות מפגש.' },
  'odd-meter': { en: 'Count the groups — short, short, long — not every eighth.', he: 'ספרו קבוצות — קצר, קצר, ארוך — לא כל שמינית.' },
  'swing-ratio': { en: 'Listen to where the short note lands inside the beat.', he: 'הקשיבו איפה נוחת הצליל הקצר בתוך הפעמה.' },
  'drum-style': { en: 'Listen to the ride or hat first: triplets or straight, then where the kick and the snare sit.', he: 'הקשיבו קודם לרייד או להיי־האט: טריולות או ישר, ואז איפה יושבים הקיק והסנר.' },
  'bh-convert': { en: 'Lowered note = dominant (restless); raised note = minor 6 (dark, at rest).', he: 'צליל שירד = דומיננט (חסר מנוחה); צליל שעלה = מינור 6 (כהה ונח).' },
  'bh-convert-2': { en: 'Still restless? A dominant. At rest: sunny major 6 or shadowy minor 6?', he: 'עדיין חסר מנוחה? דומיננט. נח: מז׳ור 6 מואר או מינור 6 מוצל?' },
  'bh-keys': { en: 'Hum the first home note, then compare the new home with it.', he: 'זמזמו את צליל הבית הראשון, ואז השוו אליו את הבית החדש.' },
  'bh-brothers': { en: 'Brothers have roots three or six semitones apart.', he: 'לאחים יש שורשים במרחק שלושה או שישה חצאי טונים.' },
  'bh-family': { en: 'A 6 chord is the minor 7 a minor third below it; listen to the bass to name it.', he: 'אקורד 6 הוא המינור 7 שטרצה קטנה מתחתיו; הקשיבו לבס כדי לתת שם.' },
  'bh-block': { en: 'Hum the top note: if it is 1, 3, 5 or 6 of the scale the chord is the 6 chord.', he: 'זמזמו את הצליל העליון: אם הוא 1, 3, 5 או 6 בסולם — זה אקורד ה־6.' },
  comping: { en: 'Count 1 & 2 & — where does the piano land: on a beat or on an "&"?', he: 'ספרו 1 ו 2 ו — איפה הפסנתר נוחת: על פעמה או על "ו"?' },
  turnarounds: { en: 'Listen to the bass: it walks the roots — and a half step down means a tritone sub.', he: 'הקשיבו לבס: הוא הולך על השורשים — וירידה בחצי טון פירושה תחליף טריטון.' },
  'sight-modulate': { en: 'Find the new accidental before you start: it is the leading tone of the new home. Hear that home before you sing toward it.', he: 'מצאו את סימן ההיתק החדש לפני שמתחילים: הוא הצליל המוביל של הבית החדש. שמעו את הבית הזה לפני ששרים אליו.' },
  'chart-analysis': { en: 'Find the I first (where the tune rests), then look for minor 7 → dominant a fourth up: every ii–V points at the chord after it.', he: 'קודם מצאו את ה־I (איפה השיר נח), ואז חפשו מינור 7 ← דומיננטה קוורטה מעליו: כל ii–V מצביע על האקורד שאחריו.' },
  'chorale-rn': { en: 'Start from the bass: its note tells you the inversion. Then ask what the chord does — rest (I), move away (IV, ii) or pull home (V).', he: 'התחילו מהבס: הצליל שלו מגלה את ההיפוך. ואז שאלו מה האקורד עושה — מנוחה (I), תנועה החוצה (IV, ii) או משיכה הביתה (V).' },
  'where-home': { en: 'Home feels like rest: listen for the chord where the tension lets go — usually right after the V.', he: 'הבית מרגיש כמו מנוחה: הקשיבו לאקורד שבו המתח משתחרר — לרוב מיד אחרי ה־V.' },
  'next-chord': { en: 'Sing the bass of the next chord before you answer — where does it want to go?', he: 'שירו את הבס של האקורד הבא לפני שעונים — לאן הוא רוצה ללכת?' },
  'reharm-swap': { en: 'Follow the bass in both versions: the bar where it moves differently is the one that changed.', he: 'עקבו אחרי הבס בשתי הגרסאות: התיבה שבה הוא זז אחרת היא זו שהשתנתה.' },
  'figure-out': { en: 'One step at a time: first home, then the bass, then the chords, then the tune.', he: 'צעד אחר צעד: קודם הבית, אחר כך הבס, אחר כך האקורדים, ואז המנגינה.' },
  'guide-tones': { en: 'Follow only the top voice: does it hold, then fall a half step, or fall first?', he: 'עקבו רק אחרי הקול העליון: הוא נשאר ואז יורד חצי טון, או יורד קודם?' },
  'chromatic-added': { en: 'Sing the plain scale in your head along with it — the extra note sticks out.', he: 'שירו בראש את הסולם הרגיל יחד איתו — הצליל הנוסף בולט.' },
  // EAR_THEORY_AUDIT
  'modes-ear': { en: 'Bright or dark first (the 3rd), then find the one note that differs from plain major or minor.', he: 'קודם בהיר או כהה (הטרצה), ואז מצאו את הצליל האחד ששונה ממז׳ור או ממינור רגיל.' },
  'prog-meter': { en: 'Follow the snare: count the gaps between its hits, not every eighth.', he: 'עקבו אחרי הסנר: ספרו את המרווחים בין המכות שלו, לא כל שמינית.' },
  'jazz-changes': { en: 'Bass first: fourths up is a ii–V, a half step down a tritone sub, a whole step up the backdoor.', he: 'קודם הבס: קוורטות למעלה זה ii–V, חצי טון למטה תחליף טריטון, טון שלם למעלה דלת אחורית.' },
  'reharm-spot': { en: 'Follow the bass in both versions: where it moves differently is where the trick is.', he: 'עקבו אחרי הבס בשתי הגרסאות: איפה שהוא זז אחרת, שם הטריק.' },
  'guide-line': { en: 'Read the chords, then follow only the top note: does it hold or fall a half step?', he: 'קראו את האקורדים, ועקבו רק אחרי הצליל העליון: הוא נשאר או יורד חצי טון?' },
  'jazz-phrase': { en: 'Hum the bass, place the first note against it, then follow steps and leaps.', he: 'זמזמו את הבס, מקמו מולו את הצליל הראשון, ואז עקבו אחרי צעדים וקפיצות.' },
  'jazz-form': { en: 'How fast do the chords change, and are they minor or dominant?', he: 'כמה מהר האקורדים מתחלפים, והאם הם מינוריים או דומיננטיים?' },
};

export interface SessionInsight {
  kind: 'flawless' | 'pair' | 'encourage';
  text: string;
}

const SEQUENCE_KINDS = new Set<Question['kind']>(['degree-seq', 'name-seq', 'sing-seq', 'sing-run', 'rhythm-read', 'rhythm-dict', 'place']);

/** The confusion that came up most, or praise. `misses`: [right answer, given] per wrong try. */
export function sessionInsight(qs: Question[], misses: { q: number; given: Answer }[], firstTry: number, total: number, l: Lang, name: string | null): SessionInsight {
  if (total > 0 && firstTry === total)
    return { kind: 'flawless', text: withName(l === 'en' ? 'Flawless{n}! Every answer right the first time.' : 'מושלם{n}! כל התשובות נכונות בניסיון הראשון.', name, l) };
  const pairs = new Map<string, { q: Question; given: Answer; n: number }>();
  for (const m of misses) {
    const q = qs[m.q];
    if (!q || String(m.given) === String(q.answer)) continue;
    // A 'pair' of whole sequences / dictations / entered notes is no pair to learn from, and its raw key
    // ("1-3-5-6-4-2-…", "60:1.62:0.5…") would blow the line up (0.69): only short answers make a pair.
    if (SEQUENCE_KINDS.has(q.kind) || String(q.answer).length > 24) continue;
    const key = `${q.kind}:${pairKey(String(q.answer), String(m.given))}`;
    const cur = pairs.get(key);
    pairs.set(key, { q, given: m.given, n: (cur?.n ?? 0) + 1 });
  }
  const top = [...pairs.values()].sort((a, b) => b.n - a.n)[0];
  if (top && top.n >= 2) {
    const name2 = (v: Answer) => (top.q.kind === 'choice' ? (top.q.names[String(v)]?.[l] ?? String(v)) : top.q.kind === 'quality' ? ({ maj: l === 'en' ? 'major' : 'מז׳ור', min: l === 'en' ? 'minor' : 'מינור', dim: l === 'en' ? 'diminished' : 'מוקטן', aug: l === 'en' ? 'augmented' : 'מוגדל' } as Record<string, string>)[String(v)] ?? String(v) : String(v));
    // A few words per name (a spelled chord is five note names): the line stays short (0.69).
    const cut = (v: Answer) => {
      const items = name2(v).split(' – ');
      if (items.length > 1) return items.length > 5 ? `${items.slice(0, 5).join(' – ')} …` : items.join(' – ');
      const ws = name2(v).split(/\s+/);
      return ws.length > 6 ? `${ws.slice(0, 6).join(' ')} …` : ws.join(' ');
    };
    const head = l === 'en' ? `Your tricky pair today: ${cut(top.q.answer)} vs ${cut(top.given)} (${top.n} times).` : `הזוג המבלבל שלכם היום: ${cut(top.q.answer)} מול ${cut(top.given)} (${top.n} פעמים).`;
    const why = head.split(/\s+/).length <= 14 ? revealCoach(top.q, top.given, l) : null;
    return { kind: 'pair', text: why ? `${head} ${why}` : head };
  }
  const pct = total ? firstTry / total : 0;
  const en = pct >= 0.8 ? 'Strong session{n} — your ear is sharp today.' : pct >= 0.5 ? 'Good work{n}. Every miss you hear back makes the next one easier.' : 'Tough one{n} — that is exactly how ears grow. Try it again tomorrow and watch it click.';
  const he = pct >= 0.8 ? 'סשן חזק{n} — האוזן חדה היום.' : pct >= 0.5 ? 'עבודה טובה{n}. כל טעות ששומעים שוב מקלה על הבאה.' : 'זה היה קשה{n} — ככה בדיוק אוזניים גדלות. נסו שוב מחר ותראו איך זה מתיישב.';
  return { kind: 'encourage', text: withName(l === 'en' ? en : he, name, l) };
}
