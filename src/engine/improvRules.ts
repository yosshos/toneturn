// Improvising under rules (owner 2026-11-08; the library grew 2026-11-09 — "the highlight of the app"): measurable
// improvisation. A chart (chords per bar) + a scale for each bar (automatic from the chord, or set by the player /
// teacher) + up to four rules — one for the notes, one for the intervals, one for the rhythm, one for the shape of the
// phrases. Every played note is checked; the result is a compliance score per rule and a bar-by-bar map of where the
// rules were broken. Research basis: the constraint drills jazz teachers use — note-limiting (one, two, three notes),
// chord tones / guide tones / tensions only, targeting, enclosures, thirds- and fourths-only lines, continuous eighths,
// off-beat phrasing, rhythmic motifs, register and contour limits, call and response. Pure.

import { MODE_STEPS, type ModeId } from './modes';
import type { ParsedChart } from './charts';
import { chordAtBeat } from './charts';
import { RULE_CARDS, notesOfSeconds, spansOfChart, type CardCheck, type CardCtx } from './ruleCards';

// AUDIT-DEPTH-3 C5 (owner 2026-11-14): the rule cards (ruleCards.ts) join the library — the drilled vocabulary in a
// fifth slot (vocab), touch and instrument rules in a sixth (extra), and new note / interval / rhythm / shape rules in
// their families. A card id in any slot is checked by its analyzer; the 51 rules below keep their own checks.

export type NoteRule =
  | 'scale' | 'chord-tones' | 'guide-beats' | 'target-3' | 'three-notes'
  | 'one-note' | 'two-notes' | 'five-notes' | 'triad' | 'guide-tones' | 'upper' | 'no-roots' | 'pentatonic' | 'blues-scale'
  | 'target-7' | 'target-tension' | 'enclose' | 'connect'
  // rule cards (ruleCards.ts)
  | 'tensions' | 'three-on-one' | 'flat9' | 'side-slip' | 'tritone-sub' | 'bebop-scale' | 'pent-5th-up' | 'mm-alt';
export type IntervalRule = 'steps' | 'thirds' | 'no-repeats' | 'chromatic' | 'leaps' | 'fourths' | 'sixths' | 'small' | 'recover' | 'zigzag' | 'wide';
export type RhythmRule =
  | 'eighths' | 'triplets' | 'quarters' | 'sixteenths' | 'space'
  | 'half-notes' | 'offbeats' | 'no-one' | 'start-and' | 'dotted' | 'quarter-triplets' | 'one-on' | 'same-rhythm'
  | 'start-two' | 'bars-2' | 'rest-bar' | 'double-bar' | 'displace' | 'behind' | 'ahead' | 'sparse' | 'call-response';
export type ShapeRule = 'octave' | 'fifth' | 'short-phrases' | 'long-lines' | 'rise' | 'fall' | 'arch' | 'motif' | 'end-chord-tone' | 'peak-once'
  | 'motif-dev' | 'repeat-vary' | 'end-guide' | 'chrom-up' | 'full-range' | 'fall-chord';
/** The drilled vocabulary (rule cards). */
export type VocabRule = 'harris' | 'pivot' | 'enc-ab' | 'enc-ba' | 'enc-step' | 'enc-bebop' | 'enc-delayed' | 'approach' | 'triad-pair' | 'pent-super' | 'use-lick' | 'guide-target' | 'quote-head' | 'target-ct' | 'inside' | 'active';
/** Touch (MIDI velocity) and instrument rules (rule cards). */
export type ExtraRule = 'ghost' | 'accent-off' | 'one-string' | 'double-stops' | 'octaves' | 'imply-roots' | 'lh-shells';
export type AnyRule = NoteRule | IntervalRule | RhythmRule | ShapeRule | VocabRule | ExtraRule;
export interface RuleSet {
  note: NoteRule | null;
  interval: IntervalRule | null;
  rhythm: RhythmRule | null;
  /** Phrase shape (added 2026-11-09; absent on older charts = free). */
  shape?: ShapeRule | null;
  /** The drilled vocabulary (AUDIT-DEPTH-3 C5; absent = free). */
  vocab?: VocabRule | null;
  /** Touch or instrument (absent = free). */
  extra?: ExtraRule | null;
}

export const NOTE_RULES: NoteRule[] = ['one-note', 'two-notes', 'three-notes', 'five-notes', 'scale', 'pentatonic', 'blues-scale', 'triad', 'chord-tones', 'guide-tones', 'upper', 'no-roots', 'guide-beats', 'target-3', 'target-7', 'target-tension', 'enclose', 'connect', 'three-on-one', 'flat9', 'tensions', 'bebop-scale', 'pent-5th-up', 'mm-alt', 'tritone-sub', 'side-slip'];
export const INTERVAL_RULES: IntervalRule[] = ['steps', 'chromatic', 'thirds', 'fourths', 'sixths', 'leaps', 'wide', 'small', 'recover', 'zigzag', 'no-repeats'];
export const RHYTHM_RULES: RhythmRule[] = ['quarters', 'half-notes', 'eighths', 'triplets', 'quarter-triplets', 'dotted', 'sixteenths', 'offbeats', 'start-and', 'start-two', 'no-one', 'same-rhythm', 'one-on', 'space', 'sparse', 'bars-2', 'rest-bar', 'call-response', 'displace', 'double-bar', 'behind', 'ahead'];
export const SHAPE_RULES: ShapeRule[] = ['fifth', 'octave', 'full-range', 'short-phrases', 'long-lines', 'rise', 'fall', 'fall-chord', 'arch', 'motif', 'motif-dev', 'repeat-vary', 'end-chord-tone', 'end-guide', 'chrom-up', 'peak-once'];
export const VOCAB_RULES: VocabRule[] = ['inside', 'active', 'target-ct', 'guide-target', 'approach', 'harris', 'enc-ab', 'enc-ba', 'enc-step', 'enc-bebop', 'enc-delayed', 'pivot', 'triad-pair', 'pent-super', 'use-lick', 'quote-head'];
export const EXTRA_RULES: ExtraRule[] = ['ghost', 'accent-off', 'imply-roots', 'lh-shells', 'one-string', 'double-stops', 'octaves'];
/** Rule ids checked by a rule card (ruleCards.ts) rather than by checkRules' own code. */
export const isCardRule = (r: string): boolean => r in RULE_CARDS;

type Bi = { en: string; he: string };
const OLD_RULE_NAME: Record<string, Bi & { how: Bi }> = {
  // ---- notes
  scale: { en: 'Stay in the scale', he: 'להישאר בסולם', how: { en: 'Only notes of each bar’s scale.', he: 'רק צלילים מהסולם של כל תיבה.' } },
  'chord-tones': { en: 'Chord tones only', he: 'רק צלילי אקורד', how: { en: 'Only 1, 3, 5, 7 of the chord you are on — arpeggios.', he: 'רק 1, 3, 5, 7 של האקורד הנוכחי — ארפג׳יו.' } },
  'guide-beats': { en: '3rd or 7th on 1 and 3', he: 'טרצה או ספטימה על 1 ו־3', how: { en: 'Free between the beats, but a guide tone (3rd / 7th) on beats 1 and 3.', he: 'חופשי בין הפעמות, אבל צליל מנחה (טרצה / ספטימה) על פעמות 1 ו־3.' } },
  'target-3': { en: 'Land on the 3rd', he: 'לנחות על הטרצה', how: { en: 'Start every new chord on its 3rd.', he: 'להתחיל כל אקורד חדש על הטרצה שלו.' } },
  'three-notes': { en: 'Three notes only', he: 'רק שלושה צלילים', how: { en: 'Pick any three pitch names and use only them for the whole chorus.', he: 'בחרו שלושה צלילים והשתמשו רק בהם לאורך כל הסבב.' } },
  'one-note': { en: 'One note only', he: 'צליל אחד בלבד', how: { en: 'One pitch for the whole chorus: all the music is in rhythm, length and accent.', he: 'צליל אחד לכל הסבב: כל המוזיקה בקצב, באורך ובהדגשה.' } },
  'two-notes': { en: 'Two notes only', he: 'רק שני צלילים', how: { en: 'Pick two pitch names. Hear how they change meaning as the chords move under them.', he: 'בחרו שני צלילים. שמעו איך המשמעות שלהם משתנה כשהאקורדים זזים מתחתם.' } },
  'five-notes': { en: 'Five notes only', he: 'רק חמישה צלילים', how: { en: 'Five pitch names for the whole chorus — make every one count.', he: 'חמישה צלילים לכל הסבב — שכל אחד מהם ייחשב.' } },
  triad: { en: 'Triad notes only', he: 'רק צלילי המשולש', how: { en: 'Only 1, 3 and 5 of the chord you are on.', he: 'רק 1, 3 ו־5 של האקורד הנוכחי.' } },
  'guide-tones': { en: 'Guide tones only', he: 'רק צלילים מנחים', how: { en: 'Only the 3rd and the 7th of each chord — the notes that name it.', he: 'רק הטרצה והספטימה של כל אקורד — הצלילים שנותנים לו את השם.' } },
  upper: { en: 'Upper chord tones: 3 5 7 9', he: 'הקומות העליונות: 3 5 7 9', how: { en: 'Arpeggiate from the 3rd: 3, 5, 7 and 9 — no roots. The modern sound.', he: 'ארפג׳יו מהטרצה: 3, 5, 7 ו־9 — בלי שורש. הסאונד המודרני.' } },
  'no-roots': { en: 'No roots', he: 'בלי שורש', how: { en: 'Anything but the root of the chord you are on.', he: 'הכל חוץ מהשורש של האקורד הנוכחי.' } },
  pentatonic: { en: 'Pentatonic of each chord', he: 'פנטטוני לכל אקורד', how: { en: 'Major pentatonic on major and dominant chords, minor pentatonic on minor ones.', he: 'פנטטוני מז׳ורי על אקורדים מז׳וריים ודומיננטים, מינורי על מינוריים.' } },
  'blues-scale': { en: 'Blues scale of the key', he: 'סולם בלוז של הבית', how: { en: 'One blues scale over everything (1 ♭3 4 ♭5 5 ♭7 of the first chord’s root).', he: 'סולם בלוז אחד מעל הכל (1 ♭3 4 ♭5 5 ♭7 מהשורש של האקורד הראשון).' } },
  'target-7': { en: 'Land on the 7th', he: 'לנחות על הספטימה', how: { en: 'Start every new chord on its 7th.', he: 'להתחיל כל אקורד חדש על הספטימה שלו.' } },
  'target-tension': { en: 'Land on a tension', he: 'לנחות על טנשן', how: { en: 'Start every new chord on a color note: 9, 11 or 13 (♭9, ♯11 … on altered chords).', he: 'להתחיל כל אקורד על צליל צבע: 9, 11 או 13 (♭9, ♯11 … באקורדים אלטרד).' } },
  enclose: { en: 'Approach from a half step', he: 'גישה מחצי טון', how: { en: 'Every chord tone on beats 1 and 3 is reached from a half step above or below.', he: 'כל צליל אקורד על פעמות 1 ו־3 מגיע מחצי טון מעליו או מתחתיו.' } },
  connect: { en: 'Connect the chords', he: 'לחבר את האקורדים', how: { en: 'When the chord changes, move by a step at most — no jumps across the bar line.', he: 'כשהאקורד מתחלף, לזוז לכל היותר צעד — בלי קפיצות מעל קו התיבה.' } },
  // ---- intervals
  steps: { en: 'Steps only', he: 'רק צעדים', how: { en: 'Every move is a half or whole step.', he: 'כל מעבר הוא חצי טון או טון.' } },
  thirds: { en: 'Thirds only', he: 'רק טרצות', how: { en: 'Every move is a minor or major third (up or down).', he: 'כל מעבר הוא טרצה קטנה או גדולה (למעלה או למטה).' } },
  'no-repeats': { en: 'No repeated notes', he: 'בלי לחזור על צליל', how: { en: 'Never play the same note twice in a row.', he: 'לא לנגן אותו צליל פעמיים ברצף.' } },
  chromatic: { en: 'Half steps only', he: 'רק חצאי טונים', how: { en: 'A chromatic line: every move is a half step.', he: 'קו כרומטי: כל מעבר הוא חצי טון.' } },
  leaps: { en: 'No steps', he: 'בלי צעדים', how: { en: 'Every move is a third or wider — no scale runs.', he: 'כל מעבר הוא טרצה או יותר — בלי ריצות סולם.' } },
  fourths: { en: 'Fourths only', he: 'רק קוורטות', how: { en: 'Every move is a perfect fourth up or down — the quartal sound.', he: 'כל מעבר הוא קוורטה זכה למעלה או למטה — הסאונד הקוורטלי.' } },
  sixths: { en: 'Sixths only', he: 'רק סקסטות', how: { en: 'Every move is a sixth (minor or major) — wide, singing leaps.', he: 'כל מעבר הוא סקסטה (קטנה או גדולה) — קפיצות רחבות ושרות.' } },
  small: { en: 'No leap wider than a fourth', he: 'בלי קפיצה גדולה מקוורטה', how: { en: 'Keep every move within a perfect fourth — a vocal line.', he: 'כל מעבר עד קוורטה — קו שאפשר לשיר.' } },
  recover: { en: 'Leap, then step back', he: 'קפיצה ואז צעד חזרה', how: { en: 'After any leap wider than a third, the next move is a step the other way.', he: 'אחרי כל קפיצה גדולה מטרצה, המעבר הבא הוא צעד בכיוון ההפוך.' } },
  zigzag: { en: 'Change direction every note', he: 'לשנות כיוון בכל צליל', how: { en: 'Up, down, up, down — never two moves the same way.', he: 'למעלה, למטה, למעלה, למטה — אף פעם לא פעמיים לאותו כיוון.' } },
  // ---- rhythm
  eighths: { en: 'Continuous eighths', he: 'שמיניות רצופות', how: { en: 'An unbroken line of eighth notes (swung is fine) through the changes.', he: 'קו רצוף של שמיניות (גם בסווינג) לאורך כל המהלך.' } },
  triplets: { en: 'Triplets only', he: 'רק טריולות', how: { en: 'Every note on an eighth-note triplet.', he: 'כל צליל על טריולה של שמיניות.' } },
  quarters: { en: 'Quarter notes only', he: 'רק רבעים', how: { en: 'One note on each beat — choose them well.', he: 'צליל אחד בכל פעמה — בחרו אותם היטב.' } },
  sixteenths: { en: 'Sixteenths', he: 'שש־עשריות', how: { en: 'Runs of sixteenth notes.', he: 'ריצות של שש־עשריות.' } },
  space: { en: 'Two bars on, two off', he: 'שתי תיבות כן, שתיים לא', how: { en: 'Play two bars, rest two bars — question and answer with yourself.', he: 'מנגנים שתי תיבות, שותקים שתיים — שאלה ותשובה עם עצמכם.' } },
  'half-notes': { en: 'Long notes only', he: 'רק צלילים ארוכים', how: { en: 'Half notes or longer, on the beat — a melody that breathes.', he: 'חצאים או ארוכים יותר, על הפעמה — מנגינה שנושמת.' } },
  offbeats: { en: 'Off the beat only', he: 'רק בין הפעמות', how: { en: 'Every note starts on an "and" — never on the beat.', he: 'כל צליל מתחיל על ה"וְ" — אף פעם לא על הפעמה.' } },
  'no-one': { en: 'Rest on beat 1', he: 'לשתוק על פעמה 1', how: { en: 'Nothing starts on the downbeat of a bar — phrase across the bar line.', he: 'שום צליל לא מתחיל בפעמה הראשונה של התיבה — משפטים שחוצים את קו התיבה.' } },
  'start-and': { en: 'Start phrases on an "and"', he: 'להתחיל משפטים על "וְ"', how: { en: 'Every phrase begins off the beat — the bebop way in.', he: 'כל משפט מתחיל בין הפעמות — הכניסה של הביבופ.' } },
  dotted: { en: 'Three over four', he: 'שלוש על ארבע', how: { en: 'Notes every dotted quarter (1½ beats) — a cross-rhythm against the band.', he: 'צליל כל רבע מנוקד (פעמה וחצי) — קצב צולב מול הלהקה.' } },
  'quarter-triplets': { en: 'Quarter-note triplets', he: 'טריולות של רבעים', how: { en: 'Three even notes over every two beats — float over the time.', he: 'שלושה צלילים שווים על כל שתי פעמות — לרחף מעל הזמן.' } },
  'one-on': { en: 'One bar on, one off', he: 'תיבה כן, תיבה לא', how: { en: 'Play one bar, rest one bar. Short ideas, lots of air.', he: 'מנגנים תיבה, שותקים תיבה. רעיונות קצרים והרבה אוויר.' } },
  'same-rhythm': { en: 'One rhythm, every bar', he: 'קצב אחד בכל תיבה', how: { en: 'Choose a one-bar rhythm in your first bar and keep it; only the notes change.', he: 'בחרו קצב של תיבה בתיבה הראשונה והישארו איתו; רק הצלילים משתנים.' } },
  // ---- shape
  octave: { en: 'Within one octave', he: 'בתוך אוקטבה אחת', how: { en: 'The whole chorus inside one octave — depth instead of range.', he: 'כל הסבב בתוך אוקטבה אחת — עומק במקום מנעד.' } },
  fifth: { en: 'Within a fifth', he: 'בתוך קווינטה', how: { en: 'Five neighbouring notes, one hand position, the whole chorus.', he: 'חמישה צלילים שכנים, תנוחת יד אחת, לאורך כל הסבב.' } },
  'short-phrases': { en: 'Short phrases', he: 'משפטים קצרים', how: { en: 'At most four notes, then a breath.', he: 'לכל היותר ארבעה צלילים, ואז נשימה.' } },
  'long-lines': { en: 'Long lines', he: 'קווים ארוכים', how: { en: 'Every phrase at least eight notes without stopping.', he: 'כל משפט לפחות שמונה צלילים בלי לעצור.' } },
  rise: { en: 'Every phrase climbs', he: 'כל משפט עולה', how: { en: 'Each phrase ends higher than it started.', he: 'כל משפט נגמר גבוה יותר משהתחיל.' } },
  fall: { en: 'Every phrase falls', he: 'כל משפט יורד', how: { en: 'Each phrase ends lower than it started — the way most jazz lines resolve.', he: 'כל משפט נגמר נמוך יותר משהתחיל — כמו שרוב קווי הג׳אז נפתרים.' } },
  arch: { en: 'Arch phrases', he: 'משפטים בצורת קשת', how: { en: 'Each phrase rises to a peak in the middle and comes down.', he: 'כל משפט עולה לשיא באמצע ויורד.' } },
  motif: { en: 'Develop one motif', he: 'לפתח מוטיב אחד', how: { en: 'Every phrase starts with the shape of your first one (the same first two moves, any pitch).', he: 'כל משפט מתחיל בצורה של הראשון (אותם שני מעברים ראשונים, מכל גובה).' } },
  'end-chord-tone': { en: 'End on a chord tone', he: 'לסיים על צליל אקורד', how: { en: 'Every phrase ends on a note of the chord under it.', he: 'כל משפט מסתיים על צליל של האקורד שמתחתיו.' } },
  'peak-once': { en: 'One high point', he: 'שיא אחד', how: { en: 'Save the highest note for one moment in the chorus — play it once.', he: 'לשמור את הצליל הגבוה ביותר לרגע אחד בסבב — לנגן אותו פעם אחת.' } },
};

/** Names and how-tos of every rule: the 51 above and the rule cards. */
// A proxy, not a spread: ruleCards.ts sits in an import cycle (licks → drills → band → here), so the cards may not
// exist yet while this module loads; their names are looked up on first use.
export const RULE_NAME = new Proxy(OLD_RULE_NAME, {
  get: (t, k) => {
    if (typeof k !== 'string') return undefined;
    if (!(k in t) && RULE_CARDS[k]) t[k] = { en: RULE_CARDS[k].name.en, he: RULE_CARDS[k].name.he, how: RULE_CARDS[k].how };
    return t[k];
  },
}) as Record<AnyRule, Bi & { how: Bi }>;

/** Which family (slot) a rule belongs to. */
export const familyOf = (r: AnyRule): 'note' | 'interval' | 'rhythm' | 'shape' | 'vocab' | 'extra' =>
  (NOTE_RULES as string[]).includes(r)
    ? 'note'
    : (INTERVAL_RULES as string[]).includes(r)
      ? 'interval'
      : (RHYTHM_RULES as string[]).includes(r)
        ? 'rhythm'
        : (SHAPE_RULES as string[]).includes(r)
          ? 'shape'
          : (VOCAB_RULES as string[]).includes(r)
            ? 'vocab'
            : 'extra';

export interface Challenge {
  id: string;
  group: 'first' | 'notes' | 'lines' | 'rhythm' | 'shape' | 'vocab' | 'masters';
  /** 1 easy … 5 hard. */
  level: number;
  title: Bi;
  idea: Bi;
  rules: RuleSet;
}
const R = (note: NoteRule | null, interval: IntervalRule | null, rhythm: RhythmRule | null, shape: ShapeRule | null = null, vocab: VocabRule | null = null, extra: ExtraRule | null = null): RuleSet => ({
  note,
  interval,
  rhythm,
  shape,
  ...(vocab ? { vocab } : {}),
  ...(extra ? { extra } : {}),
});

export const CHALLENGE_GROUPS: Record<Challenge['group'], Bi> = {
  first: { en: 'First steps', he: 'צעדים ראשונים' },
  notes: { en: 'Choosing notes', he: 'בחירת צלילים' },
  lines: { en: 'Lines and intervals', he: 'קווים ומרווחים' },
  rhythm: { en: 'Rhythm and time', he: 'קצב וזמן' },
  shape: { en: 'Phrases and form', he: 'משפטים וצורה' },
  vocab: { en: 'Vocabulary', he: 'אוצר מילים' },
  masters: { en: 'Combined — the hard ones', he: 'משולבים — הקשים' },
};

/** The challenge library: ready rule sets with a musical idea behind each. */
export const CHALLENGES: Challenge[] = [
  { id: 'one-note-swing', group: 'first', level: 1, title: { en: 'One-note swing', he: 'סווינג על צליל אחד' }, idea: { en: 'One pitch, all rhythm. If it swings on one note, it will swing on all of them.', he: 'צליל אחד, הכל קצב. אם זה מסווינג על צליל אחד, זה יסווינג על כולם.' }, rules: R('one-note', null, 'offbeats') },
  { id: 'two-note-story', group: 'first', level: 1, title: { en: 'Two-note story', he: 'סיפור בשני צלילים' }, idea: { en: 'Two notes and space. Say something, then wait for the band to answer.', he: 'שני צלילים ושקט. להגיד משהו, ואז לחכות שהלהקה תענה.' }, rules: R('two-notes', null, 'one-on') },
  { id: 'three-note-melody', group: 'first', level: 1, title: { en: 'Three-note melodies', he: 'מנגינות משלושה צלילים' }, idea: { en: 'Three notes, quarter notes: melody before speed.', he: 'שלושה צלילים, ברבעים: מנגינה לפני מהירות.' }, rules: R('three-notes', null, 'quarters') },
  { id: 'long-tones', group: 'first', level: 1, title: { en: 'Long tones over the changes', he: 'צלילים ארוכים מעל המהלך' }, idea: { en: 'Half notes from the scale. Hear each note against the chord.', he: 'חצאים מתוך הסולם. לשמוע כל צליל מול האקורד.' }, rules: R('scale', null, 'half-notes') },
  { id: 'five-finger', group: 'first', level: 1, title: { en: 'One hand position', he: 'תנוחת יד אחת' }, idea: { en: 'Five neighbouring notes in the scale — no reaching, just listening.', he: 'חמישה צלילים שכנים בסולם — בלי למתוח את היד, רק להקשיב.' }, rules: R('scale', null, 'quarters', 'fifth') },
  { id: 'question-answer', group: 'first', level: 2, title: { en: 'Question and answer', he: 'שאלה ותשובה' }, idea: { en: 'Two bars ask, two bars rest. Make the next phrase answer the last one.', he: 'שתי תיבות שואלות, שתיים שותקות. שהמשפט הבא יענה לקודם.' }, rules: R('scale', null, 'space', 'end-chord-tone') },

  { id: 'triads-only', group: 'notes', level: 1, title: { en: 'Triads only', he: 'רק משולשים' }, idea: { en: '1, 3, 5 of each chord — the strongest notes there are.', he: '1, 3, 5 של כל אקורד — הצלילים הכי יציבים שיש.' }, rules: R('triad', null, 'quarters') },
  { id: 'arpeggios', group: 'notes', level: 2, title: { en: 'Arpeggios through the changes', he: 'ארפג׳יו לאורך המהלך' }, idea: { en: 'Chord tones only, in quarters — outline every chord.', he: 'רק צלילי אקורד, ברבעים — לצייר כל אקורד.' }, rules: R('chord-tones', null, 'quarters') },
  { id: 'guide-tone-line', group: 'notes', level: 2, title: { en: 'Guide-tone line', he: 'קו של צלילים מנחים' }, idea: { en: '3rds and 7ths only, moving by small steps — the voice leading inside the changes.', he: 'רק טרצות וספטימות, בצעדים קטנים — הובלת הקולות שבתוך המהלך.' }, rules: R('guide-tones', 'small', 'half-notes') },
  { id: 'land-3', group: 'notes', level: 2, title: { en: 'Hit the 3rd', he: 'לפגוע בטרצה' }, idea: { en: 'Every chord change lands on its 3rd: the listener hears the changes in your line.', he: 'כל החלפת אקורד נוחתת על הטרצה: השומע שומע את המהלך בקו שלכם.' }, rules: R('target-3', null, 'eighths') },
  { id: 'land-7', group: 'notes', level: 3, title: { en: 'Hit the 7th', he: 'לפגוע בספטימה' }, idea: { en: 'Land on the 7th of each chord — then let it fall to the next 3rd.', he: 'לנחות על הספטימה של כל אקורד — ולתת לה לרדת לטרצה הבאה.' }, rules: R('target-7', 'small', null) },
  { id: 'colors', group: 'notes', level: 4, title: { en: 'Color notes', he: 'צלילי צבע' }, idea: { en: 'Start every chord on a 9, 11 or 13 — the sound of modern jazz.', he: 'להתחיל כל אקורד על 9, 11 או 13 — הסאונד של הג׳אז המודרני.' }, rules: R('target-tension', null, 'eighths') },
  { id: 'upper-structure', group: 'notes', level: 3, title: { en: '3 to 9', he: 'מ־3 עד 9' }, idea: { en: 'Arpeggios from the 3rd up to the 9th, never the root.', he: 'ארפג׳יו מהטרצה עד ה־9, אף פעם לא השורש.' }, rules: R('upper', 'thirds', 'eighths') },
  { id: 'rootless', group: 'notes', level: 2, title: { en: 'Leave the root to the bass', he: 'להשאיר את השורש לבס' }, idea: { en: 'Anything but the root — your line floats above the band.', he: 'הכל חוץ מהשורש — הקו שלכם מרחף מעל הלהקה.' }, rules: R('no-roots', null, 'eighths') },
  { id: 'pentatonics', group: 'notes', level: 2, title: { en: 'Pentatonic per chord', he: 'פנטטוני לכל אקורד' }, idea: { en: 'A pentatonic for each chord — open, modern, no wrong notes.', he: 'פנטטוני לכל אקורד — פתוח, מודרני, בלי צלילים שגויים.' }, rules: R('pentatonic', 'leaps', null) },
  { id: 'blues-over', group: 'notes', level: 1, title: { en: 'One blues scale over everything', he: 'סולם בלוז אחד מעל הכל' }, idea: { en: 'The blues scale of the key over the whole form. Feel the tension against each chord.', he: 'סולם הבלוז של הבית לאורך כל הצורה. להרגיש את המתח מול כל אקורד.' }, rules: R('blues-scale', null, 'triplets') },
  { id: 'enclosures', group: 'notes', level: 4, title: { en: 'Enclosures', he: 'כיתורים' }, idea: { en: 'Reach the chord tones on 1 and 3 from a half step away — the bebop approach.', he: 'להגיע לצלילי האקורד על 1 ו־3 מחצי טון — הגישה של הביבופ.' }, rules: R('enclose', null, 'eighths') },
  { id: 'smooth-changes', group: 'notes', level: 3, title: { en: 'Through the bar line', he: 'דרך קו התיבה' }, idea: { en: 'Never jump at a chord change: connect the chords by step.', he: 'אף פעם לא לקפוץ בהחלפת אקורד: לחבר את האקורדים בצעד.' }, rules: R('connect', null, 'eighths') },

  { id: 'scale-steps', group: 'lines', level: 1, title: { en: 'Scale lines', he: 'קווי סולם' }, idea: { en: 'Steps only, in the scale — smooth lines that follow the changes.', he: 'רק צעדים, בתוך הסולם — קווים חלקים שעוקבים אחרי המהלך.' }, rules: R('scale', 'steps', 'eighths') },
  { id: 'no-repeat', group: 'lines', level: 1, title: { en: 'Keep moving', he: 'לא לעמוד במקום' }, idea: { en: 'Never the same note twice in a row.', he: 'אף פעם לא אותו צליל פעמיים ברצף.' }, rules: R('scale', 'no-repeats', 'quarters') },
  { id: 'singable', group: 'lines', level: 2, title: { en: 'A line you could sing', he: 'קו שאפשר לשיר' }, idea: { en: 'No leap wider than a fourth, every phrase falls. Sing it before you play it.', he: 'בלי קפיצה גדולה מקוורטה, וכל משפט יורד. לשיר לפני שמנגנים.' }, rules: R('scale', 'small', null, 'fall') },
  { id: 'thirds-line', group: 'lines', level: 3, title: { en: 'Thirds only', he: 'רק טרצות' }, idea: { en: 'Every move a third: arpeggios that turn and climb.', he: 'כל מעבר טרצה: ארפג׳יו שמסתובבים ומטפסים.' }, rules: R('scale', 'thirds', null) },
  { id: 'leap-recover', group: 'lines', level: 3, title: { en: 'Leap and recover', he: 'קפיצה והתאוששות' }, idea: { en: 'The oldest rule of melody: after a leap, step back the other way.', he: 'הכלל העתיק של המלודיה: אחרי קפיצה, צעד חזרה לכיוון השני.' }, rules: R('scale', 'recover', null) },
  { id: 'no-runs', group: 'lines', level: 3, title: { en: 'No scale runs', he: 'בלי ריצות סולם' }, idea: { en: 'Leaps only: break the habit of running up and down the scale.', he: 'רק קפיצות: לשבור את ההרגל לרוץ למעלה ולמטה בסולם.' }, rules: R('chord-tones', 'leaps', 'eighths') },
  { id: 'chromatic-line', group: 'lines', level: 3, title: { en: 'Chromatic line', he: 'קו כרומטי' }, idea: { en: 'Half steps only — and every phrase still ends on a chord tone.', he: 'רק חצאי טונים — וכל משפט עדיין מסתיים על צליל אקורד.' }, rules: R(null, 'chromatic', 'eighths', 'end-chord-tone') },
  { id: 'quartal', group: 'lines', level: 4, title: { en: 'Fourths', he: 'קוורטות' }, idea: { en: 'Lines built in fourths — the open sound of modal jazz.', he: 'קווים שבנויים בקוורטות — הסאונד הפתוח של הג׳אז המודאלי.' }, rules: R('scale', 'fourths', null) },
  { id: 'wide', group: 'lines', level: 4, title: { en: 'Wide intervals', he: 'מרווחים רחבים' }, idea: { en: 'Sixths only — a singing line that covers the whole range.', he: 'רק סקסטות — קו שר שמכסה את כל המנעד.' }, rules: R('scale', 'sixths', 'quarters') },
  { id: 'zigzag', group: 'lines', level: 4, title: { en: 'Zigzag', he: 'זיגזג' }, idea: { en: 'Change direction on every note. Angular, unpredictable lines.', he: 'לשנות כיוון בכל צליל. קווים זוויתיים ולא צפויים.' }, rules: R('scale', 'zigzag', 'eighths') },

  { id: 'air', group: 'rhythm', level: 1, title: { en: 'Air between ideas', he: 'אוויר בין רעיונות' }, idea: { en: 'One bar on, one bar off, short phrases. Less is more.', he: 'תיבה כן, תיבה לא, משפטים קצרים. פחות זה יותר.' }, rules: R('scale', null, 'one-on', 'short-phrases') },
  { id: 'off-the-beat', group: 'rhythm', level: 2, title: { en: 'Off the beat', he: 'בין הפעמות' }, idea: { en: 'Only on the "ands": everything syncopated, nothing on the beat.', he: 'רק על ה"וְ": הכל בסינקופה, שום דבר על הפעמה.' }, rules: R('scale', null, 'offbeats') },
  { id: 'triplet-feel', group: 'rhythm', level: 2, title: { en: 'Triplet feel', he: 'תחושת טריולה' }, idea: { en: 'Every note on a triplet — the inside of swing.', he: 'כל צליל על טריולה — הפנים של הסווינג.' }, rules: R('scale', null, 'triplets') },
  { id: 'eighth-river', group: 'rhythm', level: 3, title: { en: 'The eighth-note river', he: 'נהר של שמיניות' }, idea: { en: 'Unbroken eighths through the whole form — the bebop workout.', he: 'שמיניות רצופות לאורך כל הצורה — האימון של הביבופ.' }, rules: R('scale', null, 'eighths') },
  { id: 'skip-one', group: 'rhythm', level: 3, title: { en: 'Skip the downbeat', he: 'לדלג על הפעמה הראשונה' }, idea: { en: 'Nothing starts on beat 1 — phrases that cross the bar line.', he: 'שום דבר לא מתחיל בפעמה 1 — משפטים שחוצים את קו התיבה.' }, rules: R('scale', null, 'no-one') },
  { id: 'bebop-entry', group: 'rhythm', level: 3, title: { en: 'Enter on the "and"', he: 'להיכנס על ה"וְ"' }, idea: { en: 'Start every phrase off the beat, end it on a chord tone.', he: 'להתחיל כל משפט בין הפעמות, ולסיים על צליל אקורד.' }, rules: R('scale', null, 'start-and', 'end-chord-tone') },
  { id: 'rhythm-motif', group: 'rhythm', level: 3, title: { en: 'One rhythm, new notes', he: 'קצב אחד, צלילים חדשים' }, idea: { en: 'Pick a one-bar rhythm and keep it. The changes give it new notes.', he: 'בחרו קצב של תיבה והישארו איתו. המהלך נותן לו צלילים חדשים.' }, rules: R('chord-tones', null, 'same-rhythm') },
  { id: 'float', group: 'rhythm', level: 4, title: { en: 'Float over the time', he: 'לרחף מעל הזמן' }, idea: { en: 'Quarter-note triplets: three against two, relaxed against the band.', he: 'טריולות של רבעים: שלוש מול שתיים, רגוע מול הלהקה.' }, rules: R('scale', null, 'quarter-triplets') },
  { id: 'three-four', group: 'rhythm', level: 4, title: { en: 'Three over four', he: 'שלוש על ארבע' }, idea: { en: 'A note every beat and a half — a cross-rhythm that lands back on 1 every three bars.', he: 'צליל כל פעמה וחצי — קצב צולב שחוזר ל־1 כל שלוש תיבות.' }, rules: R('chord-tones', null, 'dotted') },
  { id: 'double-time', group: 'rhythm', level: 5, title: { en: 'Double time', he: 'דאבל טיים' }, idea: { en: 'Sixteenth-note runs in the scale — the ballad double-time.', he: 'ריצות של שש־עשריות בסולם — הדאבל טיים של הבלדה.' }, rules: R('scale', 'steps', 'sixteenths') },

  { id: 'resolve', group: 'shape', level: 2, title: { en: 'Resolve every phrase', he: 'לפתור כל משפט' }, idea: { en: 'Every phrase ends on a chord tone — the sound of a finished sentence.', he: 'כל משפט מסתיים על צליל אקורד — הצליל של משפט גמור.' }, rules: R('scale', null, null, 'end-chord-tone') },
  { id: 'arches', group: 'shape', level: 2, title: { en: 'Arches', he: 'קשתות' }, idea: { en: 'Each phrase climbs to a peak and comes back down.', he: 'כל משפט מטפס לשיא וחוזר למטה.' }, rules: R('scale', null, null, 'arch') },
  { id: 'climb', group: 'shape', level: 2, title: { en: 'Build up', he: 'לבנות' }, idea: { en: 'Each phrase ends higher — a solo that grows.', he: 'כל משפט נגמר גבוה יותר — סולו שגדל.' }, rules: R('scale', null, null, 'rise') },
  { id: 'small-room', group: 'shape', level: 2, title: { en: 'A small room', he: 'חדר קטן' }, idea: { en: 'One octave, the whole chorus — depth instead of range.', he: 'אוקטבה אחת לכל הסבב — עומק במקום מנעד.' }, rules: R('chord-tones', null, 'eighths', 'octave') },
  { id: 'motif-dev', group: 'shape', level: 3, title: { en: 'Develop a motif', he: 'לפתח מוטיב' }, idea: { en: 'Every phrase starts like your first one — move it, stretch it, answer it.', he: 'כל משפט מתחיל כמו הראשון — להזיז, למתוח, לענות.' }, rules: R('scale', null, null, 'motif') },
  { id: 'one-peak', group: 'shape', level: 3, title: { en: 'One climax', he: 'שיא אחד' }, idea: { en: 'Save your highest note for one moment. Shape the whole chorus around it.', he: 'לשמור את הצליל הגבוה לרגע אחד. לבנות את כל הסבב סביבו.' }, rules: R('scale', null, null, 'peak-once') },
  { id: 'long-breath', group: 'shape', level: 4, title: { en: 'Long breath', he: 'נשימה ארוכה' }, idea: { en: 'Phrases of eight notes or more — keep the line alive through the changes.', he: 'משפטים של שמונה צלילים ומעלה — להחזיק את הקו חי לאורך המהלך.' }, rules: R('scale', 'steps', 'eighths', 'long-lines') },

  { id: 'storyteller', group: 'masters', level: 4, title: { en: 'Storyteller', he: 'מספר סיפורים' }, idea: { en: 'Five notes, short phrases with air, one climax.', he: 'חמישה צלילים, משפטים קצרים עם אוויר, שיא אחד.' }, rules: R('five-notes', null, 'one-on', 'peak-once') },
  { id: 'three-note-bebop', group: 'masters', level: 4, title: { en: 'Three notes, no downbeats', he: 'שלושה צלילים, בלי פעמה ראשונה' }, idea: { en: 'Three pitches only, never on beat 1, every phrase from one motif — all invention is in the rhythm.', he: 'רק שלושה צלילים, אף פעם לא על פעמה 1, כל משפט ממוטיב אחד — כל ההמצאה בקצב.' }, rules: R('three-notes', null, 'no-one', 'motif') },
  { id: 'bebop-test', group: 'masters', level: 5, title: { en: 'Bebop test', he: 'מבחן ביבופ' }, idea: { en: 'Continuous eighths, guide tones on 1 and 3, phrases resolve to a chord tone.', he: 'שמיניות רצופות, צלילים מנחים על 1 ו־3, ומשפטים שנפתרים לצליל אקורד.' }, rules: R('guide-beats', null, 'eighths', 'end-chord-tone') },
  { id: 'modern-test', group: 'masters', level: 5, title: { en: 'Modern colors', he: 'צבעים מודרניים' }, idea: { en: 'Land on tensions, move in leaps, start phrases off the beat.', he: 'לנחות על טנשנים, לזוז בקפיצות, להתחיל משפטים בין הפעמות.' }, rules: R('target-tension', 'leaps', 'start-and') },
  { id: 'guide-river', group: 'masters', level: 5, title: { en: 'Connected eighths', he: 'שמיניות מחוברות' }, idea: { en: 'Eighths through the changes, connecting every chord by step, long lines.', he: 'שמיניות לאורך המהלך, מחברים כל אקורד בצעד, קווים ארוכים.' }, rules: R('connect', 'small', 'eighths', 'long-lines') },
  { id: 'arpeggio-architect', group: 'masters', level: 5, title: { en: 'Arpeggio architect', he: 'אדריכל ארפג׳יו' }, idea: { en: '3 to 9 arpeggios in thirds, in triplets, every phrase an arch.', he: 'ארפג׳יו מ־3 עד 9 בטרצות, בטריולות, כל משפט קשת.' }, rules: R('upper', 'thirds', 'triplets', 'arch') },
  // AUDIT-DEPTH-3 C5 (owner 2026-11-14): the drilled vocabulary and the wider library, 2–3 rules each.
  { id: 'guide-landing', group: 'vocab', level: 2, title: { en: 'Guide-tone landings', he: 'נחיתות על צלילים מנחים' }, idea: { en: 'A 3rd or 7th on every change, the rest inside the changes.', he: 'טרצה או ספטימה בכל החלפה, וכל השאר בתוך המהלך.' }, rules: R(null, null, 'eighths', null, 'guide-target') },
  { id: 'approach-changes', group: 'vocab', level: 2, title: { en: 'Approach every chord', he: 'גישה לכל אקורד' }, idea: { en: 'Slide into each new chord from a half step, and end phrases on a chord tone.', he: 'להחליק לכל אקורד חדש מחצי טון, ולסיים משפטים על צליל אקורד.' }, rules: R(null, null, null, 'end-chord-tone', 'approach') },
  { id: 'harris-river', group: 'vocab', level: 4, title: { en: 'Barry’s eighth-note line', he: 'קו השמיניות של בארי' }, idea: { en: 'Harris rules in continuous eighths, every phrase ending on a guide tone.', he: 'חוקי האריס בשמיניות רצופות, כל משפט מסתיים על צליל מנחה.' }, rules: R(null, null, 'eighths', 'end-guide', 'harris') },
  { id: 'pivot-entry', group: 'vocab', level: 4, title: { en: 'Pivot from the "and"', he: 'פיבוט מה"וְ"' }, idea: { en: 'Enter off the beat and drop a pivot into every four bars.', he: 'להיכנס בין הפעמות ולשתול פיבוט בכל ארבע תיבות.' }, rules: R(null, null, 'start-and', null, 'pivot') },
  { id: 'step-enclose-3', group: 'vocab', level: 3, title: { en: 'Enclose the 3rd', he: 'לכתר את הטרצה' }, idea: { en: 'Scale step above, half step below — and the 3rd on beat 1 of each chord.', he: 'צעד סולם מעל, חצי טון מתחת — והטרצה בפעמה 1 של כל אקורד.' }, rules: R('three-on-one', null, null, null, 'enc-step') },
  { id: 'enclose-ab', group: 'vocab', level: 3, title: { en: 'Above and below', he: 'מעל ומתחת' }, idea: { en: 'The chromatic enclosure from above, in a line of eighths.', he: 'הכיתור הכרומטי מלמעלה, בקו של שמיניות.' }, rules: R(null, null, 'eighths', null, 'enc-ab') },
  { id: 'enclose-ba', group: 'vocab', level: 3, title: { en: 'Below and above', he: 'מתחת ומעל' }, idea: { en: 'The chromatic enclosure from below; resolve every phrase.', he: 'הכיתור הכרומטי מלמטה; לפתור כל משפט.' }, rules: R(null, null, null, 'end-chord-tone', 'enc-ba') },
  { id: 'bebop-enclosure', group: 'vocab', level: 4, title: { en: 'The bebop enclosure', he: 'כיתור הביבופ' }, idea: { en: 'Four notes around the target, over continuous eighths.', he: 'ארבעה צלילים סביב המטרה, מעל שמיניות רצופות.' }, rules: R(null, null, 'eighths', null, 'enc-bebop') },
  { id: 'delayed', group: 'vocab', level: 5, title: { en: 'Delay the resolution', he: 'להשהות את הפתרון' }, idea: { en: 'Circle the target before you land; end phrases on a guide tone.', he: 'להקיף את המטרה לפני הנחיתה; לסיים משפטים על צליל מנחה.' }, rules: R(null, null, null, 'end-guide', 'enc-delayed') },
  { id: 'pairs-space', group: 'vocab', level: 4, title: { en: 'Triad pairs with space', he: 'זוגות משולשים עם אוויר' }, idea: { en: 'Two triads per chord, never more than four notes a bar.', he: 'שני משולשים לכל אקורד, לא יותר מארבעה צלילים בתיבה.' }, rules: R(null, null, 'sparse', null, 'triad-pair') },
  { id: 'pent-colours', group: 'vocab', level: 4, title: { en: 'Pentatonic colours', he: 'צבעים פנטטוניים' }, idea: { en: 'A superimposed pentatonic on every chord, wide leaps.', he: 'פנטטוני מונח על כל אקורד, בקפיצות רחבות.' }, rules: R(null, 'leaps', null, null, 'pent-super') },
  { id: 'lick-in', group: 'vocab', level: 3, title: { en: 'Work a lick in', he: 'לשלב ליק' }, idea: { en: 'Fit one of your licks over its chord, inside the changes otherwise.', he: 'לשלב ליק שלכם מעל האקורד שלו, ובשאר הזמן בתוך המהלך.' }, rules: R('scale', null, null, null, 'use-lick') },
  { id: 'side-slip-in', group: 'masters', level: 5, title: { en: 'Out and back in', he: 'החוצה ובחזרה' }, idea: { en: 'Slip a half step outside, then resolve to a chord tone at the end of each phrase.', he: 'לגלוש חצי טון החוצה, ואז לפתור לצליל אקורד בסוף כל משפט.' }, rules: R('side-slip', null, null, 'end-chord-tone') },
  { id: 'dialogue', group: 'shape', level: 4, title: { en: 'Dialogue with a motif', he: 'דיאלוג עם מוטיב' }, idea: { en: 'Answer each phrase in its rhythm, and keep transforming your opening motif.', he: 'לענות לכל משפט בקצב שלו, ולהמשיך לשנות את מוטיב הפתיחה.' }, rules: R(null, null, 'call-response', 'motif-dev') },
  { id: 'repeat-vary-2', group: 'shape', level: 3, title: { en: 'Repeat and vary', he: 'לחזור ולגוון' }, idea: { en: 'Two-bar phrases; each one starts like the last and goes somewhere new.', he: 'משפטים של שתי תיבות; כל אחד מתחיל כמו הקודם והולך למקום חדש.' }, rules: R(null, null, 'bars-2', 'repeat-vary') },
  { id: 'breathe-bar', group: 'rhythm', level: 2, title: { en: 'A bar to breathe', he: 'תיבה לנשום' }, idea: { en: 'Rest a full bar between phrases; start each one on beat 2.', he: 'לשתוק תיבה שלמה בין משפטים; להתחיל כל אחד בפעמה 2.' }, rules: R('scale', null, 'rest-bar') },
  { id: 'beat-two', group: 'rhythm', level: 2, title: { en: 'Enter on 2', he: 'להיכנס על 2' }, idea: { en: 'Every phrase starts on beat 2 and ends on a guide tone.', he: 'כל משפט מתחיל בפעמה 2 ומסתיים על צליל מנחה.' }, rules: R(null, null, 'start-two', 'end-guide') },
  { id: 'shift-motif', group: 'rhythm', level: 4, title: { en: 'Shift the motif', he: 'להזיז את המוטיב' }, idea: { en: 'Repeat your opening a beat later each time, inside the scale.', he: 'לחזור על הפתיחה פעמה מאוחר יותר בכל פעם, בתוך הסולם.' }, rules: R('scale', null, 'displace') },
  { id: 'double-up', group: 'rhythm', level: 5, title: { en: 'Double up', he: 'להכפיל' }, idea: { en: 'One bar of 16ths in every four, by step, inside the scale.', he: 'תיבה של שש־עשריות בכל ארבע, בצעדים, בתוך הסולם.' }, rules: R('scale', 'steps', 'double-bar') },
  { id: 'lay-back', group: 'rhythm', level: 4, title: { en: 'Lay back', he: 'להישען אחורה' }, idea: { en: 'Quarter notes on chord tones, each a little behind the beat.', he: 'רבעים על צלילי אקורד, כל אחד קצת מאחורי הפעמה.' }, rules: R('chord-tones', null, 'behind') },
  { id: 'third-on-one', group: 'notes', level: 2, title: { en: 'The 3rd on the one', he: 'הטרצה על האחת' }, idea: { en: 'Land on each chord’s 3rd on its first beat, in eighths.', he: 'לנחות על הטרצה של כל אקורד בפעמה הראשונה שלו, בשמיניות.' }, rules: R('three-on-one', null, 'eighths') },
  { id: 'flat-nine', group: 'notes', level: 3, title: { en: 'Find the ♭9', he: 'למצוא את ה־♭9' }, idea: { en: 'The ♭9 on every dominant, every phrase falling.', he: 'ה־♭9 על כל דומיננט, כל משפט יורד.' }, rules: R('flat9', null, null, 'fall') },
  { id: 'upper-only', group: 'notes', level: 4, title: { en: 'Only the colours', he: 'רק הצבעים' }, idea: { en: '9, 11 and 13 only, long notes.', he: 'רק 9, 11 ו־13, בצלילים ארוכים.' }, rules: R('tensions', null, 'half-notes') },
  { id: 'bebop-scale-line', group: 'notes', level: 3, title: { en: 'The bebop scale', he: 'סולם הביבופ' }, idea: { en: 'The bebop scale with chord tones on the beats, continuous eighths.', he: 'סולם הביבופ עם צלילי אקורד על הפעמות, בשמיניות רצופות.' }, rules: R('bebop-scale', null, 'eighths') },
  { id: 'minor-pent-up', group: 'notes', level: 3, title: { en: 'Pentatonic a 5th up', he: 'פנטטוני קווינטה מעל' }, idea: { en: 'Over minor chords, the minor pentatonic on the 5th; leaps.', he: 'מעל אקורדים מינוריים, הפנטטוני המינורי על הקווינטה; בקפיצות.' }, rules: R('pent-5th-up', 'leaps', null) },
  { id: 'altered-colours', group: 'notes', level: 4, title: { en: 'Altered dominants', he: 'דומיננטים אלטרד' }, idea: { en: 'The altered scale on every dominant; resolve to a guide tone.', he: 'הסולם האלטרד על כל דומיננט; לפתור לצליל מנחה.' }, rules: R('mm-alt', null, null, 'end-guide') },
  { id: 'tritone-over', group: 'masters', level: 5, title: { en: 'The tritone sub on top', he: 'תחליף הטריטון מלמעלה' }, idea: { en: 'Play the sub over every dominant, in eighths, ending on chord tones.', he: 'לנגן את התחליף מעל כל דומיננט, בשמיניות, ולסיים על צלילי אקורד.' }, rules: R('tritone-sub', null, 'eighths', 'end-chord-tone') },
  { id: 'wide-open', group: 'lines', level: 4, title: { en: 'Wide open', he: 'פתוח לרווחה' }, idea: { en: 'Fourths and wider, over two octaves.', he: 'קוורטות ומעלה, על פני שתי אוקטבות.' }, rules: R('scale', 'wide', null, 'full-range') },
  { id: 'chromatic-climb', group: 'lines', level: 3, title: { en: 'Climb into it', he: 'לטפס אליו' }, idea: { en: 'Every phrase climbs three half steps into a chord tone on the beat.', he: 'כל משפט מטפס שלושה חצאי טונים אל צליל אקורד על הפעמה.' }, rules: R(null, null, 'eighths', 'chrom-up') },
  { id: 'falling-lines', group: 'lines', level: 2, title: { en: 'Fall through the changes', he: 'ליפול דרך המהלך' }, idea: { en: 'A falling line on every chord, inside the scale.', he: 'קו יורד על כל אקורד, בתוך הסולם.' }, rules: R('scale', null, null, 'fall-chord') },
  { id: 'ghost-accent', group: 'masters', level: 4, title: { en: 'Touch', he: 'מגע' }, idea: { en: 'Eighths with a ghosted note in every bar (MIDI).', he: 'שמיניות עם צליל רפאים בכל תיבה (MIDI).' }, rules: R(null, null, 'eighths', null, null, 'ghost') },
  { id: 'off-accents', group: 'rhythm', level: 3, title: { en: 'Accent the "ands"', he: 'להדגיש את ה"וְ"' }, idea: { en: 'Continuous eighths, the off-beats louder (MIDI).', he: 'שמיניות רצופות, האוף־ביט חזק יותר (MIDI).' }, rules: R('scale', null, 'eighths', null, null, 'accent-off') },
  { id: 'bass-roots-solo', group: 'masters', level: 3, title: { en: 'Bass solo over the roots', he: 'סולו בס מעל השורשים' }, idea: { en: 'Bass: solo in eighths, still placing every root on its chord’s first beat.', he: 'בס: סולו בשמיניות, ועדיין לשים כל שורש בפעמה הראשונה של האקורד.' }, rules: R(null, null, 'eighths', null, null, 'imply-roots') },
  { id: 'shells-and-line', group: 'masters', level: 4, title: { en: 'Shells and a line', he: 'שלדים וקו' }, idea: { en: 'Piano: left-hand shells on every chord, the right hand lands guide tones.', he: 'פסנתר: שלדים ביד שמאל בכל אקורד, יד ימין נוחתת על צלילים מנחים.' }, rules: R(null, null, null, null, 'guide-target', 'lh-shells') },
  { id: 'one-string-solo', group: 'lines', level: 3, title: { en: 'One string', he: 'מיתר אחד' }, idea: { en: 'Guitar: a melody on one string, inside the scale (MIDI guitar).', he: 'גיטרה: מנגינה על מיתר אחד, בתוך הסולם (גיטרת MIDI).' }, rules: R('scale', null, null, null, null, 'one-string') },
  { id: 'octave-line', group: 'lines', level: 3, title: { en: 'Octave melody', he: 'מנגינה באוקטבות' }, idea: { en: 'Guitar: quarter notes in octaves, Wes-style.', he: 'גיטרה: רבעים באוקטבות, בסגנון ווס.' }, rules: R(null, null, 'quarters', null, null, 'octaves') },
  { id: 'double-stop-line', group: 'lines', level: 3, title: { en: 'Double stops', he: 'דאבל סטופים' }, idea: { en: 'Guitar: two notes at a time, chord tones on the change.', he: 'גיטרה: שני צלילים בבת אחת, צלילי אקורד בהחלפה.' }, rules: R(null, null, null, null, 'target-ct', 'double-stops') },
];

/** A random challenge, optionally up to a level. */
export function randomChallenge(maxLevel = 5, rnd: () => number = Math.random): Challenge {
  const pool = CHALLENGES.filter((c) => c.level <= maxLevel);
  return pool[Math.floor(rnd() * pool.length)] ?? CHALLENGES[0];
}

/** The challenge a rule set is (null when it is a custom mix). */
export const challengeOf = (r: RuleSet): Challenge | null =>
  CHALLENGES.find(
    (c) =>
      c.rules.note === r.note &&
      c.rules.interval === r.interval &&
      c.rules.rhythm === r.rhythm &&
      (c.rules.shape ?? null) === (r.shape ?? null) &&
      (c.rules.vocab ?? null) === (r.vocab ?? null) &&
      (c.rules.extra ?? null) === (r.extra ?? null),
  ) ?? null;
/** The active rules of a set, in slot order. */
export const activeRules = (r: RuleSet): AnyRule[] => [r.note, r.interval, r.rhythm, r.shape ?? null, r.vocab ?? null, r.extra ?? null].filter((x): x is AnyRule => !!x);

/** Scales a bar can be set to (chord-scale theory + blues / pentatonics). */
export const BAR_SCALES: ModeId[] = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'melodic-minor', 'lydian-dominant', 'altered', 'diminished', 'whole-tone', 'harmonic-minor', 'phrygian-dominant', 'bebop-dominant', 'major-pentatonic', 'minor-pentatonic', 'blues'];

/** The usual chord-scale for a chord (by its intervals) — the default when nobody set one. */
export function autoScale(iv: number[]): ModeId {
  const has = (x: number) => iv.includes(x);
  if (has(3) && has(6) && has(9)) return 'diminished';
  if (has(3) && has(6)) return 'locrian';
  if (has(3) && has(11)) return 'melodic-minor';
  if (has(3)) return 'dorian';
  if (has(11) && has(18)) return 'lydian';
  if (has(4) && has(8) && has(10)) return 'whole-tone';
  if (has(5) && has(10) && has(13)) return 'phrygian';
  if (has(4) && has(10) && (has(13) || has(15) || has(20))) return 'altered';
  if (has(4) && has(10) && has(18)) return 'lydian-dominant';
  if (has(4) && has(10)) return 'mixolydian';
  if (has(5) && has(10)) return 'mixolydian';
  if (has(4) && has(8)) return 'whole-tone';
  return 'ionian';
}

export interface PlayedNote {
  /** Seconds from the chart's first beat. */
  start: number;
  end: number;
  midi: number;
  /** MIDI velocity when known (the touch cards). */
  vel?: number;
}

export interface RuleCheck {
  rule: AnyRule;
  ok: number;
  total: number;
}
export interface RulesReport {
  notes: number;
  checks: RuleCheck[];
  /** Per bar (of the performance): notes and rule breaks. */
  bars: { notes: number; breaks: number }[];
  /** 0..1: the mean compliance of the active rules (0 with fewer than 4 notes). */
  score: number;
}

const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;

/** The basic chord tones of a chord (relative pitch classes): root, 3rd, 5th, 7th (each may be missing). */
function tonesOf(iv: number[]) {
  const m = iv.map((x) => x % 12);
  const third = m.find((x) => x === 3 || x === 4) ?? (m.includes(5) ? 5 : m.includes(2) ? 2 : undefined);
  const fifth = m.find((x) => x === 7 || x === 6 || x === 8);
  const seventh = m.find((x) => x === 10 || x === 11) ?? (m.includes(9) && (m.includes(3) || m.includes(4)) ? 9 : undefined);
  return { root: 0, third, fifth, seventh };
}

/**
 * Check a take against the rules. `scales[bar]` overrides the automatic chord-scale of that chart bar.
 * Beat positions are in quarter beats; swing is tolerated (an "&" anywhere from 1/2 to 2/3 of the beat).
 */
export function checkRules(played: PlayedNote[], chart: ParsedChart, meter: number, bpm: number, rules: RuleSet, scales: Record<number, ModeId> = {}, totalBars?: number): RulesReport {
  const beatS = 60 / bpm;
  const notes = played.filter((n) => n.end - n.start > 0.04).sort((a, b) => a.start - b.start);
  const nBars = totalBars ?? Math.max(1, Math.ceil((notes.length ? notes[notes.length - 1].end : 0) / beatS / meter));
  const bars = Array.from({ length: nBars }, () => ({ notes: 0, breaks: 0 }));
  const checks: RuleCheck[] = [];
  const add = (rule: RuleCheck['rule']) => {
    const c = { rule, ok: 0, total: 0 };
    checks.push(c);
    return c;
  };
  const barOf = (t: number) => Math.max(0, Math.min(nBars - 1, Math.floor(t / beatS / meter + 1e-6)));
  const beatOf = (t: number) => t / beatS;
  const mark = (c: RuleCheck, t: number, ok: boolean) => {
    c.total++;
    if (ok) c.ok++;
    else bars[barOf(t)].breaks++;
  };
  for (const n of notes) bars[barOf(n.start)].notes++;
  const chordAt = (t: number) => chordAtBeat(chart, meter, Math.floor(beatOf(t) + 0.15));
  const chartBar = (t: number) => Math.floor(Math.floor(beatOf(t) + 0.15) / meter) % Math.max(1, chart.bars);
  const scaleAt = (t: number, iv: number[]) => MODE_STEPS[scales[chartBar(t)] ?? autoScale(iv)].map((x) => x % 12);
  const frac = (t: number) => {
    const b = beatOf(t);
    return b - Math.floor(b);
  };
  const onBeat = (t: number) => frac(t) < 0.15 || frac(t) > 0.88;
  /** A rest of about a beat (or more) starts a new phrase. */
  const phrases: PlayedNote[][] = [];
  for (const n of notes) {
    const last = phrases[phrases.length - 1];
    if (last && n.start - last[last.length - 1].end <= beatS * 0.9) last.push(n);
    else phrases.push([n]);
  }
  const relOf = (n: PlayedNote) => {
    const ch = chordAt(n.start);
    return ch ? { ch, rel: (pc(n.midi) - ch.root + 12) % 12, t: tonesOf(ch.iv) } : null;
  };
  const isChordTone = (n: PlayedNote) => {
    const r = relOf(n);
    return !!r && [r.t.root, r.t.third, r.t.fifth, r.t.seventh].includes(r.rel);
  };
  // Rule cards (ruleCards.ts): the take in beats over the chart's chords repeated through the take.
  let cardCtx: CardCtx | null = null;
  const addCard = (rule: AnyRule) => {
    cardCtx ??= { notes: notesOfSeconds(notes, bpm), spans: spansOfChart(chart, meter, nBars), meter, bpm };
    const r: CardCheck = RULE_CARDS[rule].check(cardCtx);
    const c = add(rule);
    c.ok = r.ok;
    c.total = r.total;
    for (const b of r.miss ?? []) bars[Math.max(0, Math.min(nBars - 1, Math.floor(b / meter + 1e-6)))].breaks++;
  };
  for (const r of [rules.note, rules.interval, rules.rhythm, rules.shape ?? null, rules.vocab ?? null, rules.extra ?? null]) if (r && isCardRule(r)) addCard(r);

  // ---- notes
  if (rules.note && !isCardRule(rules.note)) {
    const c = add(rules.note);
    const limit = { 'one-note': 1, 'two-notes': 2, 'three-notes': 3, 'five-notes': 5 }[rules.note as string];
    if (limit) {
      const counts = new Map<number, number>();
      for (const n of notes) counts.set(pc(n.midi), (counts.get(pc(n.midi)) ?? 0) + 1);
      const keep = new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([p]) => p));
      for (const n of notes) mark(c, n.start, keep.has(pc(n.midi)));
    } else if (rules.note === 'blues-scale') {
      const home = chart.chords[0]?.root ?? 0;
      for (const n of notes) mark(c, n.start, [0, 3, 5, 6, 7, 10].includes((pc(n.midi) - home + 12) % 12));
    } else {
      let prevChord: ReturnType<typeof chordAt> = null;
      let prevNote: PlayedNote | null = null;
      for (const n of notes) {
        const ch = chordAt(n.start);
        if (!ch) continue;
        const rel = (pc(n.midi) - ch.root + 12) % 12;
        const tones = ch.iv.map((x) => x % 12);
        const T = tonesOf(ch.iv);
        const basic = [T.root, T.third, T.fifth, T.seventh].filter((x): x is number => x !== undefined);
        const b = beatOf(n.start);
        const onStrong = Math.abs(b - Math.round(b)) < 0.2 && Math.round(b) % 2 === 0;
        const changed = ch !== prevChord;
        const linked = !!prevNote && n.start - prevNote.end <= beatS;
        switch (rules.note) {
          case 'scale':
            mark(c, n.start, scaleAt(n.start, ch.iv).includes(rel));
            break;
          case 'chord-tones':
            mark(c, n.start, tones.includes(rel));
            break;
          case 'triad':
            mark(c, n.start, [T.root, T.third, T.fifth].includes(rel));
            break;
          case 'guide-tones':
            mark(c, n.start, rel === T.third || rel === (T.seventh ?? T.fifth));
            break;
          case 'upper': {
            const ninth = tones.find((x) => x === 1 || x === 2 || (x === 3 && T.third === 4)) ?? scaleAt(n.start, ch.iv)[1];
            mark(c, n.start, [T.third, T.fifth, T.seventh, ninth].includes(rel));
            break;
          }
          case 'no-roots':
            mark(c, n.start, rel !== 0);
            break;
          case 'pentatonic':
            mark(c, n.start, (T.third === 3 ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]).includes(rel));
            break;
          case 'guide-beats':
            if (onStrong) mark(c, n.start, rel === ch.iv[1] % 12 || rel === (ch.iv[3] ?? ch.iv[2]) % 12);
            break;
          case 'target-3':
            if (changed) mark(c, n.start, rel === ch.iv[1] % 12);
            break;
          case 'target-7':
            if (changed) mark(c, n.start, rel === (T.seventh ?? T.root));
            break;
          case 'target-tension':
            if (changed) mark(c, n.start, scaleAt(n.start, ch.iv).concat(tones.filter((x) => !basic.includes(x))).includes(rel) && !basic.includes(rel));
            break;
          case 'enclose':
            if (onStrong) mark(c, n.start, basic.includes(rel) && linked && Math.abs(Math.round(n.midi) - Math.round(prevNote!.midi)) === 1);
            break;
          case 'connect':
            if (changed && linked && prevChord) mark(c, n.start, Math.abs(Math.round(n.midi) - Math.round(prevNote!.midi)) <= 2);
            break;
        }
        prevChord = ch;
        prevNote = n;
      }
    }
  }

  // ---- intervals
  if (rules.interval && !isCardRule(rules.interval)) {
    const c = add(rules.interval);
    let prevMove = 0;
    for (let i = 1; i < notes.length; i++) {
      // a rest longer than a beat starts a new phrase: no interval to judge
      if (notes[i].start - notes[i - 1].end > beatS) {
        prevMove = 0;
        continue;
      }
      const mv = Math.round(notes[i].midi) - Math.round(notes[i - 1].midi);
      const d = Math.abs(mv);
      switch (rules.interval) {
        case 'steps':
          mark(c, notes[i].start, d === 1 || d === 2);
          break;
        case 'thirds':
          mark(c, notes[i].start, d === 3 || d === 4);
          break;
        case 'no-repeats':
          mark(c, notes[i].start, d !== 0);
          break;
        case 'chromatic':
          mark(c, notes[i].start, d === 1);
          break;
        case 'leaps':
          mark(c, notes[i].start, d >= 3);
          break;
        case 'fourths':
          mark(c, notes[i].start, d === 5);
          break;
        case 'sixths':
          mark(c, notes[i].start, d === 8 || d === 9);
          break;
        case 'small':
          mark(c, notes[i].start, d <= 5);
          break;
        case 'recover':
          if (Math.abs(prevMove) > 4) mark(c, notes[i].start, d >= 1 && d <= 2 && Math.sign(mv) === -Math.sign(prevMove));
          break;
        case 'zigzag':
          if (prevMove !== 0) mark(c, notes[i].start, mv !== 0 && Math.sign(mv) === -Math.sign(prevMove));
          break;
      }
      prevMove = mv;
    }
  }

  // ---- rhythm
  if (rules.rhythm && !isCardRule(rules.rhythm)) {
    const c = add(rules.rhythm);
    const r = rules.rhythm;
    const barIdx = (t: number) => Math.floor(beatOf(t) / meter + 1e-6);
    if (r === 'space' || r === 'one-on') {
      for (const n of notes) mark(c, n.start, r === 'space' ? barIdx(n.start) % 4 < 2 : barIdx(n.start) % 2 === 0);
    } else if (r === 'half-notes') {
      notes.forEach((n, i) => mark(c, n.start, onBeat(n.start) && (i === notes.length - 1 || (n.end - n.start) / beatS >= 1.6)));
    } else if (r === 'offbeats') {
      for (const n of notes) mark(c, n.start, !onBeat(n.start));
    } else if (r === 'no-one') {
      for (const n of notes) {
        const inBar = beatOf(n.start) - barIdx(n.start) * meter;
        mark(c, n.start, !(inBar < 0.15 || inBar > meter - 0.12));
      }
    } else if (r === 'start-and') {
      for (const p of phrases) mark(c, p[0].start, !onBeat(p[0].start));
    } else if (r === 'dotted' || r === 'quarter-triplets') {
      const unit = r === 'dotted' ? 1.5 : 2 / 3;
      const tol = r === 'dotted' ? 0.14 : 0.1;
      for (const n of notes) {
        const f = beatOf(n.start) % unit;
        mark(c, n.start, f < tol || f > unit - tol);
      }
    } else if (r === 'same-rhythm') {
      const byBar = new Map<number, Set<number>>();
      for (const n of notes) {
        const bi = barIdx(n.start);
        const pos = Math.round((beatOf(n.start) - bi * meter) * 4) / 4;
        if (!byBar.has(bi)) byBar.set(bi, new Set());
        byBar.get(bi)!.add(pos % meter);
      }
      const order = [...byBar.keys()].sort((a, b) => a - b);
      const ref = order.length ? byBar.get(order[0])! : new Set<number>();
      for (const bi of order.slice(1)) {
        const q = byBar.get(bi)!;
        const inter = [...q].filter((x) => ref.has(x)).length;
        const uni = new Set([...q, ...ref]).size;
        mark(c, bi * meter * beatS, uni > 0 && inter / uni >= 0.6);
      }
    } else {
      const grid = r === 'quarters' ? [0] : r === 'eighths' ? [0, 0.5, 2 / 3] : r === 'triplets' ? [0, 1 / 3, 2 / 3] : [0, 0.25, 0.5, 0.75];
      const tol = r === 'sixteenths' ? 0.08 : 0.11;
      for (const n of notes) {
        const f = frac(n.start);
        const onGrid = grid.some((g) => Math.abs(f - g) < tol) || f > 1 - tol;
        mark(c, n.start, onGrid);
      }
      // continuous eighths: also no holes — every beat of the take has two onsets
      if (r === 'eighths' && notes.length) {
        const first = Math.floor(beatOf(notes[0].start));
        const last = Math.floor(beatOf(notes[notes.length - 1].start));
        for (let b = first; b <= last; b++) {
          const n = notes.filter((x) => Math.floor(beatOf(x.start) + 0.1) === b).length;
          mark(c, b * beatS, n >= 2);
        }
      }
    }
  }

  // ---- shape
  if (rules.shape && !isCardRule(rules.shape)) {
    const c = add(rules.shape);
    const s = rules.shape;
    const m = (n: PlayedNote) => Math.round(n.midi);
    if (s === 'octave' || s === 'fifth') {
      const span = s === 'octave' ? 12 : 7;
      let lo = notes.length ? m(notes[0]) : 0;
      let best = -1;
      for (const a of notes) {
        const k = notes.filter((b) => m(b) >= m(a) && m(b) <= m(a) + span).length;
        if (k > best) [best, lo] = [k, m(a)];
      }
      for (const n of notes) mark(c, n.start, m(n) >= lo && m(n) <= lo + span);
    } else if (s === 'short-phrases') {
      for (const p of phrases) p.forEach((n, i) => mark(c, n.start, i < 4));
    } else if (s === 'peak-once') {
      const top = Math.max(...notes.map(m));
      notes.filter((n) => m(n) === top).forEach((n, i) => mark(c, n.start, i === 0));
    } else if (s === 'motif') {
      const shaped = phrases.filter((p) => p.length >= 3);
      const sig = (p: PlayedNote[]) => [m(p[1]) - m(p[0]), m(p[2]) - m(p[1])];
      const ref = shaped[0] ? sig(shaped[0]) : null;
      for (const p of shaped.slice(1)) {
        const g = sig(p);
        mark(c, p[0].start, !!ref && Math.abs(g[0] - ref[0]) <= 1 && Math.abs(g[1] - ref[1]) <= 1 && Math.sign(g[0]) === Math.sign(ref[0]));
      }
    } else {
      for (const p of phrases) {
        const end = p[p.length - 1];
        if (s === 'long-lines') mark(c, end.start, p.length >= 8);
        else if (s === 'end-chord-tone') mark(c, end.start, isChordTone(end));
        else if (p.length >= 2 && (s === 'rise' || s === 'fall')) mark(c, end.start, s === 'rise' ? m(end) > m(p[0]) : m(end) < m(p[0]));
        else if (p.length >= 3 && s === 'arch') {
          const top = Math.max(...p.map(m));
          const at = p.findIndex((n) => m(n) === top);
          mark(c, end.start, at > 0 && at < p.length - 1);
        }
      }
    }
  }

  const active = checks.filter((c) => c.total > 0);
  const score = notes.length < 4 || !active.length ? 0 : Math.round((active.reduce((a, c) => a + c.ok / c.total, 0) / active.length) * 1000) / 1000;
  return { notes: notes.length, checks, bars, score };
}

/**
 * Check ANY rule id — a rule card or one of the 51 library rules — on a card context (beats + chord spans). The old
 * rules run through checkRules on a chart rebuilt from the spans.
 */
export function ruleCheck(id: string, ctx: CardCtx): CardCheck {
  if (isCardRule(id)) return RULE_CARDS[id].check(ctx);
  const fam = familyOf(id as AnyRule);
  if (fam === 'vocab' || fam === 'extra') return { ok: 0, total: 0 };
  const meter = ctx.meter;
  const end = Math.max(meter, ...ctx.spans.map((s) => s.at + s.beats), ...ctx.notes.map((n) => n.beat + n.dur));
  const bars = Math.max(1, Math.ceil(end / meter - 1e-6));
  const chart: ParsedChart = {
    chords: ctx.spans.map((s) => ({ root: s.root, iv: s.iv, bass: s.root, sym: '', beats: s.beats, bar: Math.floor(s.at / meter + 1e-6), at: s.at - Math.floor(s.at / meter + 1e-6) * meter })),
    bars,
    errors: [],
  };
  const sec = 60 / ctx.bpm;
  const played: PlayedNote[] = ctx.notes.map((n) => ({ start: n.beat * sec, end: (n.beat + n.dur) * sec, midi: n.midi, ...(n.vel !== undefined ? { vel: n.vel } : {}) }));
  const rs: RuleSet = { note: null, interval: null, rhythm: null, shape: null, [fam]: id };
  const c = checkRules(played, chart, meter, ctx.bpm, rs, {}, bars).checks[0];
  return c ? { ok: c.ok, total: c.total } : { ok: 0, total: 0 };
}
