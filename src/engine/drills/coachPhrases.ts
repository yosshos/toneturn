// The key session's coach phrases (SPEC-KEY-SESSION-2 §6, owner 2026-11-25): short fixed lines, the same every time,
// so each one is pre-recorded like the lessons (src/speech/voice/lines.ts 'coach') and every device speaks them — phones
// without WebGPU too. A coach line is a few of these in a row (shown together, spoken one by one); tempi are said as
// numbers ("seventy-two"). No level titles are spoken. Pure.

export type T2 = { en: string; he: string };

export const PHRASES = {
  right: { en: 'Right hand.', he: 'יד ימין.' },
  left: { en: 'Left hand.', he: 'יד שמאל.' },
  both: { en: 'Both hands.', he: 'שתי ידיים.' },
  oct1: { en: 'One octave.', he: 'אוקטבה אחת.' },
  oct2: { en: 'Two octaves.', he: 'שתי אוקטבות.' },
  oct3: { en: 'Three octaves.', he: 'שלוש אוקטבות.' },
  oct4: { en: 'Four octaves.', he: 'ארבע אוקטבות.' },
  contrary: { en: 'Contrary motion.', he: 'תנועה נגדית.' },
  together: { en: 'Together.', he: 'יחד.' },
  broken: { en: 'Broken.', he: 'שבור.' },
  free: { en: 'In free time.', he: 'בקצב חופשי.' },
  pulse: { en: 'Feel the pulse.', he: 'עכשיו עם הדופק.' },
  quarters: { en: 'In quarters.', he: 'ברבעים.' },
  eighths: { en: 'Now in eighths.', he: 'עכשיו בשמיניות.' },
  sixteenths: { en: 'Sixteenths.', he: 'שש־עשריות.' },
  triplets: { en: 'Triplet feel: three notes per beat.', he: 'תחושת טריולה: שלושה צלילים בפעמה.' },
  faster: { en: 'Faster.', he: 'מהר יותר.' },
  hold: { en: 'Hold this tempo.', he: 'נשארים בטמפו הזה.' },
  slower: { en: 'A little slower.', he: 'קצת לאט יותר.' },
  again: { en: 'Again.', he: 'שוב.' },
  clean: { en: 'Clean.', he: 'נקי.' },
  nice: { en: 'Nice.', he: 'יפה.' },
  great: { en: 'Great.', he: 'מצוין.' },
  easy: { en: 'That was easy for you.', he: 'זה היה קל לך.' },
  almost: { en: 'Almost.', he: 'כמעט.' },
  notYet: { en: 'Not yet.', he: 'עוד לא.' },
  noRush: { en: 'No rush.', he: 'בלי למהר.' },
  limit: { en: "That's your limit today.", he: 'זה הגבול שלך היום.' },
  target: { en: 'Target reached.', he: 'הגעת ליעד.' },
  speed: { en: 'Now the speed.', he: 'עכשיו המהירות.' },
  theSpeed: { en: 'The speed.', he: 'המהירות.' },
  check: { en: 'A quick check first.', he: 'קודם בדיקה קצרה.' },
  known: { en: 'You know this. Moving on.', he: 'את זה כבר יודעים. ממשיכים.' },
  stage: { en: 'Next stage.', he: 'השלב הבא.' },
  nextScale: { en: 'Next: the scale.', he: 'הבא: הסולם.' },
  nextThirds: { en: 'Next: thirds.', he: 'הבא: טרצות.' },
  nextTriads: { en: 'Next: triads.', he: 'הבא: משולשים.' },
  nextSevenths: { en: 'Next: seventh chords.', he: 'הבא: ספטאקורדים.' },
  nextOther: { en: 'Next exercise.', he: 'התרגיל הבא.' },
  backScale: { en: 'Back to the scale.', he: 'חוזרים לסולם.' },
  pickUp: { en: 'Next time:', he: 'בפעם הבאה:' },
  listen: { en: 'Listen first.', he: 'קודם מקשיבים.' },
  warm: { en: 'Warm-up.', he: 'חימום.' },
  done: { en: "That's the session.", he: 'זה הסשן.' },
  position: { en: 'One position.', he: 'מצב אחד.' },
  positions: { en: 'Two positions joined.', he: 'שני מצבים מחוברים.' },
  nps3: { en: 'Three notes per string.', he: 'שלושה צלילים במיתר.' },
  neck: { en: 'The whole neck.', he: 'כל הצוואר.' },
  doubleStops: { en: 'Double stops.', he: 'צלילים כפולים.' },
  doubleThirds: { en: 'Double thirds.', he: 'טרצות כפולות.' },
  blockChords: { en: 'Block chords.', he: 'אקורדים בבלוק.' },
  tripletsAgain: { en: 'Triplets.', he: 'טריולות.' },
  nextVoicing: { en: 'Next voicing.', he: 'הפריסה הבאה.' },
  handsSep: { en: 'Hands separately first.', he: 'קודם כל יד לחוד.' },
  leaveIt: { en: "Let's leave it for today.", he: 'נשאיר את זה להיום.' },
  reviewHere: { en: 'A short review at this tempo.', he: 'חזרה קצרה בטמפו הזה.' },
  nextOne: { en: 'Next one.', he: 'הבא בתור.' },
  review: { en: 'A short review at the target.', he: 'חזרה קצרה בטמפו היעד.' },
  resume: { en: 'From where we stopped.', he: 'ממשיכים מאיפה שעצרנו.' },
  backTempo: { en: 'Back to the last clean tempo.', he: 'חוזרים לטמפו הנקי האחרון.' },
} as const satisfies Record<string, T2>;

export type PhraseId = keyof typeof PHRASES;

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** A number in English words, 1–999 ("seventy-two", "one hundred and twelve"). */
export function numberWords(n: number): string {
  const k = Math.round(n);
  if (k <= 0) return 'zero';
  if (k >= 100) {
    const h = Math.floor(k / 100);
    const r = k % 100;
    return `${ONES[h]} hundred${r ? ` and ${numberWords(r)}` : ''}`;
  }
  if (k < 20) return ONES[k];
  const t = Math.floor(k / 10);
  const o = k % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
}

/** The coach's tempi said aloud (♩ ranges a take can be played at). */
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 240;

/** A tempo as a spoken phrase: "Seventy-two." (recorded for every ♩ in TEMPO_MIN…TEMPO_MAX). */
export function tempoPhrase(bpm: number): string {
  const w = numberWords(bpm);
  return `${w[0].toUpperCase()}${w.slice(1)}.`;
}

/** Every fixed English coach phrase, in one list (the voice inventory records each one). */
export function coachPhraseList(): string[] {
  const out: string[] = Object.values(PHRASES).map((p) => p.en);
  for (let b = TEMPO_MIN; b <= TEMPO_MAX; b++) out.push(tempoPhrase(b));
  return out;
}

/** The note values a pulse is played in (U9: every tempo shown with the note value actually played). */
export const UNIT: Record<number, T2> = {
  0.5: { en: 'half notes', he: 'חצאים' },
  1: { en: 'quarters', he: 'רבעים' },
  2: { en: 'eighths', he: 'שמיניות' },
  3: { en: 'triplets', he: 'טריולות' },
  4: { en: '16ths', he: 'שש־עשריות' },
};
const ISO = (x: string) => `${String.fromCharCode(0x2066)}${x}${String.fromCharCode(0x2069)}`;
/** "♩84 quarters" (Hebrew: the tempo isolated left-to-right so it never flips); no unit for other note values. */
export function tempoText(bpm: number, per: number | undefined, lang: 'en' | 'he'): string {
  const u = per ? UNIT[per] : undefined;
  const t = lang === 'he' ? ISO(`♩${Math.round(bpm)}`) : `♩${Math.round(bpm)}`;
  // Hebrew reads "♩76 ברבעים" (in quarters)
  return u ? (lang === 'he' ? `${t} ב${u.he}` : `${t} ${u.en}`) : t;
}

/** A coach line: shown in both languages, spoken phrase by phrase (English `say`, Hebrew `sayHe`) so every part is a fixed line. */
export interface CoachLine extends T2 {
  say?: string[];
  sayHe?: string[];
}

export type LinePart = PhraseId | { bpm: number; per?: number } | T2 | null | undefined | false;

/** Phrases (and tempi, shown as ♩n with the note value and said as words) joined into one line; a part repeated
 *  right after itself is dropped (S11). */
export function line(...parts: LinePart[]): CoachLine {
  const en: string[] = [];
  const he: string[] = [];
  const say: string[] = [];
  const sayHe: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    let e: string;
    let h: string;
    let s: string | null = null;
    let sh: string | null = null;
    if (typeof p === 'string') {
      e = PHRASES[p].en;
      h = PHRASES[p].he;
      s = e;
      sh = h;
    } else if ('bpm' in p) {
      const b = Math.round(p.bpm);
      e = `${tempoText(b, p.per, 'en')}.`;
      h = `${tempoText(b, p.per, 'he')}.`;
      if (b >= TEMPO_MIN && b <= TEMPO_MAX) s = tempoPhrase(b);
      sh = h;
    } else {
      e = p.en;
      h = p.he;
    }
    if (en[en.length - 1] === e) continue;
    en.push(e);
    he.push(h);
    if (s) say.push(s);
    if (sh) sayHe.push(sh);
  }
  return { en: en.join(' '), he: he.join(' '), say, sayHe };
}
