// Repertoire (owner concept 2026-11-10, docs/SPEC-REPERTOIRE.md): the Practice "Songs" row becomes a road from simple
// tunes to standards. Four tiers per course — Foundations → Blues & progressions → Standards → Advanced — and every
// item is named by what it teaches ("three chords I–IV–V", "minor ii–V"), says what it leads to, and opens the
// course's own measured practice for it (a song drill, a drill built on the chart, a sing-along, a groove level,
// a lesson topic). Results are LessonResults with the id "rep-<course>-<item>" (score × 10 of 10), so the history,
// the league XP, the course split, quests and badges all see them. Pure: no UI, no storage.
//
// Legal (docs/research/STANDARDS_LEGAL.md): songs = public-domain melodies (content/songbook.ts); standards = chord-only
// charts we wrote (engine/standards.ts) with the real titles; grooves and topics are our own material.

import type { CourseId } from './courses';
import { SONGBOOK } from '../content/songbook';
import { STANDARD_CHANGES } from './standards';
import { voiceSong } from './voiceSongs';
import type { ChartVoicing, CompRhythm } from './drills/chartDrills';

type Bi = { en: string; he: string };

export type RepTier = 1 | 2 | 3 | 4;
export const REP_TIERS: { n: RepTier; name: Bi; blurb: Bi }[] = [
  { n: 1, name: { en: 'Foundations', he: 'יסודות' }, blurb: { en: 'Simple tunes, simple harmony', he: 'מנגינות פשוטות, הרמוניה פשוטה' } },
  { n: 2, name: { en: 'Blues & progressions', he: 'בלוז ומהלכים' }, blurb: { en: '12-bar blues, ii–V–I, turnarounds', he: 'בלוז 12 תיבות, ii–V–I, טרנאראונדים' } },
  { n: 3, name: { en: 'Standards', he: 'סטנדרטים' }, blurb: { en: 'Chord charts of famous standards', he: 'דפי אקורדים של סטנדרטים מפורסמים' } },
  { n: 4, name: { en: 'Advanced', he: 'מתקדם' }, blurb: { en: 'Rhythm changes, Coltrane, odd meters', he: 'ריתם צ׳יינג׳ס, קולטריין, משקלים מורכבים' } },
];

/** How an item is practised — each one is measured by the screen it opens. */
export type RepWay =
  /** A songbook song as a drill (piano melody / chords / both; guitar strummed chords or melody; bass melody). */
  | { k: 'song'; song: string; part: 'melody' | 'chords' | 'both' }
  /** A vocal level (voice course): songs with the band, standards, scat — each phrase scored. */
  | { k: 'vocal'; level: number }
  /** A standard's changes as a piano drill (voicings and a comping rhythm, or stride). */
  | { k: 'chartDrill'; std: string; voicing: ChartVoicing; rhythm: CompRhythm }
  /** A standard's changes walked on the bass, judged by the walking rules. */
  | { k: 'bassStd'; std: string }
  /** A technique level as a queue (a groove, a comping level, a style). */
  | { k: 'level'; ref: string }
  /** Play along / improvise over the standard in Charts (backing band; the take is rated). */
  | { k: 'chart'; std: string }
  /** A lesson topic at a level (ear, theory, singing). */
  | { k: 'topic'; topic: string; level: number };

export interface RepItem {
  /** Lowercase words and dashes; "rep-<course>-<id>" is the result id (server: ≤ 40 chars). */
  id: string;
  tier: RepTier;
  /** The tune / form, by its real title. */
  title: Bi;
  /** What it teaches — the item's label (not its genre). */
  teaches: Bi;
  /** What it leads to: "this progression is the start of Autumn Leaves" (an item of this course when `to` is set). */
  leads?: { text: Bi; to?: string };
  /** A standard (tiers 3–4): counts for the "first standard" goal and badge. Simple tunes never do. */
  standard?: boolean;
  /** Legal basis: public-domain melody, chord-only chart, our own material (grooves, topics). */
  legal: 'pd' | 'chords' | 'own';
  /** The tune it refers to for a "listen to the original" row (songbook / standards id). */
  ref?: { kind: 'song' | 'standard'; id: string };
  ways: RepWay[];
}

// ------------------------------------------------------------------ helpers

const song = (id: string) => SONGBOOK.find((s) => s.id === id);
const std = (id: string) => STANDARD_CHANGES.find((s) => s.id === id);
const songTitle = (id: string): Bi => song(id)?.title ?? { en: id, he: id };
/** Hebrew names of the standards (titles stay in Latin letters, as players say them). */
const STD_HE: Record<string, string> = {
  'blues-basic': 'בלוז 12 תיבות',
  'blues-f': 'בלוז ג׳אז ב־F',
  'blues-bb': 'בלוז ג׳אז ב־B♭',
  'minor-blues': 'בלוז מינורי',
  'bird-blues': 'בלוז בירד',
  'blues-waltz': 'בלוז ואלס',
  'turnarounds-f': 'טרנאראונדים ב־F',
  'two-five-keys': 'ii–V–I בכל הסולמות',
  'minor-two-five-keys': 'ii–V–i מינורי במעגל',
  'sec-dominants-c': 'דומיננטות משניות ב־C',
  'ballad-ii-v': 'טרנאראונדים של בלדה',
  'dorian-vamp': 'ווּמפּ דורי',
  'rhythm-a': 'ריתם צ׳יינג׳ס, חלק A',
  'rhythm-bridge': 'ריתם צ׳יינג׳ס, הגשר',
  'rhythm-full': 'ריתם צ׳יינג׳ס',
  'giant-slow': 'Giant Steps (לאט)',
};
const stdTitle = (id: string): Bi => {
  const s = std(id);
  if (!s) return { en: id, he: id };
  const part = s.part.en.startsWith('Whole') ? null : s.part;
  return { en: part ? `${s.name} (${part.en})` : s.name, he: (STD_HE[id] ?? s.name) + (part && !STD_HE[id] ? ` (${part.he})` : '') };
};
const b = (en: string, he: string): Bi => ({ en, he });

/** A songbook tune (public domain). */
const S = (id: string, tier: RepTier, teaches: Bi, ways: RepWay[], leads?: RepItem['leads'], extra: Partial<RepItem> = {}): RepItem => ({ id, tier, title: songTitle(id), teaches, ways, legal: 'pd', ref: { kind: 'song', id }, ...(leads ? { leads } : {}), ...extra });
/** A chord-only chart of a standard or a form. */
const C = (id: string, tier: RepTier, teaches: Bi, ways: RepWay[], leads?: RepItem['leads'], extra: Partial<RepItem> = {}): RepItem => ({ id, tier, title: stdTitle(id), teaches, ways, legal: 'chords', ref: { kind: 'standard', id }, ...(tier >= 3 ? { standard: true } : {}), ...(leads ? { leads } : {}), ...extra });
/** Our own material (a groove level, a topic) — `title` names it. */
const O = (id: string, tier: RepTier, title: Bi, teaches: Bi, ways: RepWay[], leads?: RepItem['leads'], extra: Partial<RepItem> = {}): RepItem => ({ id, tier, title, teaches, ways, legal: 'own', ...(leads ? { leads } : {}), ...extra });

const L = (ref: string): RepWay => ({ k: 'level', ref });
const T = (topic: string, level: number): RepWay => ({ k: 'topic', topic, level });
const CH = (id: string): RepWay => ({ k: 'chart', std: id });
const PIANO = (id: string, voicing: ChartVoicing = 'shell', rhythm: CompRhythm = 'whole'): RepWay => ({ k: 'chartDrill', std: id, voicing, rhythm });
const BASS = (id: string): RepWay => ({ k: 'bassStd', std: id });

// Shared "leads to" lines (true musical facts about our charts).
const TO = {
  i4v: (to: string) => ({ to, text: b('I–IV–V is the backbone of the 12-bar blues', 'I–IV–V הוא השלד של בלוז 12 תיבות') }),
  i7iv: (to: string) => ({ to, text: b('I–I7–IV is bars 4–5 of every blues', 'I–I7–IV הן תיבות 4–5 של כל בלוז') }),
  iiv: (to: string) => ({ to, text: b('ii–V7–I is the cadence jazz is built on', 'ii–V7–I היא הקדנצה שעליה בנוי הג׳אז') }),
  ii7: (to: string) => ({ to, text: b('II7 going to V: bars 3–4 of Take the A Train', 'II7 שהולך ל־V: תיבות 3–4 של Take the A Train') }),
  minor: (to: string) => ({ to, text: b('A minor tune that ends V–i — Autumn Leaves resolves the same way', 'מנגינה במינור שנגמרת V–i — Autumn Leaves נפתר באותה דרך') }),
  minorIv: (to: string) => ({ to, text: b('i–iv–V in minor: the minor blues', 'i–iv–V במינור: הבלוז המינורי') }),
  vi: (to: string) => ({ to, text: b('vi and iii: the minor chords of the I–vi–ii–V turnaround', 'vi ו־iii: האקורדים המינוריים של הטרנאראונד I–vi–ii–V') }),
  chain: (to: string) => ({ to, text: b('III7–vi, a chain of dominants: the bridge of rhythm changes is III7–VI7–II7–V7', 'III7–vi, שרשרת דומיננטות: הגשר של ריתם צ׳יינג׳ס הוא III7–VI7–II7–V7') }),
  blues: (to: string) => ({ to, text: b('Add ii–Vs and a VI7 and this becomes the jazz blues', 'מוסיפים ii–V ו־VI7 וזה הופך לבלוז ג׳אז') }),
  jazzBlues: (to: string) => ({ to, text: b('Bird blues: the same 12 bars with a ii–V in almost every bar', 'בלוז בירד: אותן 12 תיבות עם ii–V כמעט בכל תיבה') }),
  turn: (to: string) => ({ to, text: b('Rhythm changes A is this turnaround, eight bars long', 'חלק A של ריתם צ׳יינג׳ס הוא הטרנאראונד הזה, באורך שמונה תיבות') }),
  autumn: (to: string) => ({ to, text: b('This progression is the start of Autumn Leaves (Cm7–F7–B♭maj7)', 'המהלך הזה הוא הפתיחה של Autumn Leaves (Cm7–F7–B♭maj7)') }),
  minorIiv: (to: string) => ({ to, text: b('Minor ii–V–i: the second half of Autumn Leaves and all of Blue Bossa', 'ii–V–i מינורי: החצי השני של Autumn Leaves וכל Blue Bossa') }),
  modal: (to: string) => ({ to, text: b('One chord for many bars: So What is 16 bars of Dm7', 'אקורד אחד להרבה תיבות: So What הוא 16 תיבות של Dm7') }),
  ballad: (to: string) => ({ to, text: b('Slow ii–Vs with a melody on top: Misty', 'ii–V איטיים עם מנגינה מעל: Misty') }),
  rhythm: (to: string) => ({ to, text: b('After the A section: the whole AABA form at tempo', 'אחרי חלק A: כל צורת AABA בטמפו') }),
  coltrane: (to: string) => ({ to, text: b('Keys a major third apart: Giant Steps', 'סולמות במרחק טרצה גדולה: Giant Steps') }),
  waltz: (to: string) => ({ to, text: b('The same blues in 3/4: the jazz waltz', 'אותו בלוז ב־3/4: ואלס ג׳אז') }),
  odd: (to: string) => ({ to, text: b('Grooves in 7 and 9: the prog side of the road', 'גרובים ב־7 וב־9: הצד הפרוגרסיבי של הדרך') }),
};

// ------------------------------------------------------------------ the catalogue, per course

const KEYS: RepItem[] = [
  S('twinkle', 1, b('Three chords: I–IV–V', 'שלושה אקורדים: I–IV–V'), [{ k: 'song', song: 'twinkle', part: 'both' }, { k: 'song', song: 'twinkle', part: 'chords' }], TO.i4v('blues-basic')),
  S('saints', 1, b('I–I7–IV and a pickup', 'I–I7–IV ופתיחה מתרוממת'), [{ k: 'song', song: 'saints', part: 'both' }, { k: 'song', song: 'saints', part: 'melody' }], TO.i7iv('blues-f')),
  S('jingle', 1, b('The secondary dominant II7', 'הדומיננטה המשנית II7'), [{ k: 'song', song: 'jingle', part: 'both' }, { k: 'song', song: 'jingle', part: 'chords' }], TO.ii7('a-train')),
  S('tannenbaum', 1, b('ii–V7–I in a simple tune', 'ii–V7–I במנגינה פשוטה'), [{ k: 'song', song: 'tannenbaum', part: 'both' }, { k: 'song', song: 'tannenbaum', part: 'chords' }], TO.iiv('two-five-keys')),
  S('canon-d', 1, b('I–V–vi–iii–IV: the minor chords of a key', 'I–V–vi–iii–IV: האקורדים המינוריים של הסולם'), [{ k: 'song', song: 'canon-d', part: 'chords' }, { k: 'song', song: 'canon-d', part: 'both' }], TO.vi('turnarounds-f')),
  S('greensleeves', 1, b('A minor key: i–III–VII–v', 'סולם מינורי: i–III–VII–v'), [{ k: 'song', song: 'greensleeves', part: 'both' }, { k: 'song', song: 'greensleeves', part: 'melody' }], TO.minor('minor-two-five-keys')),
  C('blues-basic', 2, b('The 12-bar blues: I7–IV7–V7', 'בלוז 12 תיבות: I7–IV7–V7'), [PIANO('blues-basic', 'shell', 'whole'), PIANO('blues-basic', 'stride-single', 'stride')], TO.blues('blues-f')),
  C('turnarounds-f', 2, b('The I–vi–ii–V turnaround', 'הטרנאראונד I–vi–ii–V'), [PIANO('turnarounds-f', 'shell', 'whole'), PIANO('turnarounds-f', 'guide', 'charleston')], TO.turn('rhythm-a')),
  C('two-five-keys', 2, b('Major ii–V–I in every key', 'ii–V–I מז׳ורי בכל הסולמות'), [PIANO('two-five-keys', 'shell', 'whole'), PIANO('two-five-keys', 'rootless', 'charleston')], TO.autumn('autumn')),
  C('minor-two-five-keys', 2, b('Minor ii–V–i', 'ii–V–i מינורי'), [PIANO('minor-two-five-keys', 'shell', 'whole'), PIANO('minor-two-five-keys', 'rootless', 'charleston')], TO.minorIiv('blue-bossa')),
  C('blues-f', 2, b('The jazz blues: ii–V and VI7', 'בלוז ג׳אז: ii–V ו־VI7'), [PIANO('blues-f', 'shell', 'charleston'), PIANO('blues-f', 'rootless', 'charleston')], TO.jazzBlues('bird-blues')),
  C('dorian-vamp', 2, b('A two-chord dorian vamp', 'ווּמפּ דורי של שני אקורדים'), [PIANO('dorian-vamp', 'quartal', 'charleston')], TO.modal('so-what')),
  C('autumn', 3, b('Major and minor ii–V–I in one tune', 'ii–V–I מז׳ורי ומינורי בשיר אחד'), [PIANO('autumn', 'shell', 'whole'), PIANO('autumn', 'rootless', 'charleston'), CH('autumn')]),
  C('fly', 3, b('A cycle of fifths, A section', 'מעגל קווינטות, חלק A'), [PIANO('fly', 'shell', 'whole'), PIANO('fly', 'rootless', 'charleston'), CH('fly')]),
  C('blue-bossa', 3, b('Minor ii–V–i and a key change', 'ii–V–i מינורי ומעבר סולם'), [PIANO('blue-bossa', 'shell', 'anticip'), PIANO('blue-bossa', 'rootless', 'anticip'), CH('blue-bossa')]),
  C('a-train', 3, b('II7 (♯11) and an AABA form', 'II7 (♯11) וצורת AABA'), [PIANO('a-train', 'shell', 'charleston'), PIANO('a-train', 'stride-octave', 'stride'), CH('a-train')]),
  C('so-what', 3, b('Modal: dorian and quartal voicings', 'מודאלי: דורי ווויסינג קוורטלי'), [PIANO('so-what', 'quartal', 'charleston'), CH('so-what')]),
  C('misty', 3, b('Ballad ii–Vs, A section', 'ii–V של בלדה, חלק A'), [PIANO('misty', 'rootless', 'whole'), PIANO('misty', 'two-hand', 'whole'), CH('misty')]),
  C('satin', 3, b('Chains of ii–Vs', 'שרשראות של ii–V'), [PIANO('satin', 'rootless', 'charleston'), CH('satin')]),
  C('attya', 3, b('ii–Vs through five keys', 'ii–V דרך חמישה סולמות'), [PIANO('attya', 'rootless', 'whole'), PIANO('attya', 'drop2', 'whole'), CH('attya')]),
  C('rhythm-a', 4, b('Rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A'), [PIANO('rhythm-a', 'shell', 'charleston'), PIANO('rhythm-a', 'stride-tenth', 'stride'), CH('rhythm-a')], TO.rhythm('rhythm-full')),
  C('rhythm-full', 4, b('Rhythm changes: the whole AABA', 'ריתם צ׳יינג׳ס: כל ה־AABA'), [PIANO('rhythm-full', 'rootless', 'charleston'), CH('rhythm-full')]),
  C('bird-blues', 4, b('Bird blues: a ii–V in every bar', 'בלוז בירד: ii–V בכל תיבה'), [PIANO('bird-blues', 'rootless', 'charleston'), CH('bird-blues')]),
  C('stella', 4, b('Half-diminished ii–Vs, 32 bars', 'ii–V חצי־מוקטנים, 32 תיבות'), [PIANO('stella', 'rootless', 'whole'), CH('stella')]),
  C('solar', 4, b('Minor-major to major: keys a step apart', 'ממינור־מז׳ור למז׳ור: סולמות במרחק טון'), [PIANO('solar', 'rootless', 'charleston'), CH('solar')], TO.coltrane('giant')),
  C('giant', 4, b('Coltrane changes: three keys a major third apart', 'קולטריין צ׳יינג׳ס: שלושה סולמות במרחק טרצה גדולה'), [PIANO('giant-slow', 'shell', 'whole'), PIANO('giant', 'rootless', 'whole'), CH('giant')]),
];

const JAZZ: RepItem[] = [
  O('progressions', 1, b('Pop and jazz progressions by ear', 'מהלכי פופ וג׳אז בשמיעה'), b('Hear I–IV–V and I–vi–IV–V', 'לשמוע I–IV–V ו־I–vi–IV–V'), [T('progressions', 1), T('progressions', 2)], TO.i4v('blues-basic')),
  O('guide-tones', 1, b('Guide-tone lines', 'קווי צלילים מנחים'), b('3rds and 7ths through ii–V–I', 'טרצות וספטימות לאורך ii–V–I'), [T('guide-tones', 1), T('guide-line', 1)], TO.iiv('two-five-keys')),
  C('blues-basic', 2, b('The 12-bar blues: I7–IV7–V7', 'בלוז 12 תיבות: I7–IV7–V7'), [CH('blues-basic'), PIANO('blues-basic', 'shell', 'whole')], TO.blues('blues-f')),
  C('blues-f', 2, b('The jazz blues: ii–V and VI7', 'בלוז ג׳אז: ii–V ו־VI7'), [CH('blues-f'), PIANO('blues-f', 'shell', 'charleston'), T('jazz-form', 1)], TO.jazzBlues('bird-blues')),
  C('two-five-keys', 2, b('Major ii–V–I in every key', 'ii–V–I מז׳ורי בכל הסולמות'), [CH('two-five-keys'), PIANO('two-five-keys', 'rootless', 'charleston'), T('jazz-changes', 1)], TO.autumn('autumn')),
  C('minor-blues', 2, b('Minor blues: minor ii–V–i', 'בלוז מינורי: ii–V–i מינורי'), [CH('minor-blues'), PIANO('minor-blues', 'shell', 'whole')], TO.minorIiv('blue-bossa')),
  C('autumn', 3, b('Major and minor ii–V–I in one tune', 'ii–V–I מז׳ורי ומינורי בשיר אחד'), [CH('autumn'), PIANO('autumn', 'rootless', 'charleston'), T('chart-analysis', 2)]),
  C('blue-bossa', 3, b('Minor ii–V–i and a key change', 'ii–V–i מינורי ומעבר סולם'), [CH('blue-bossa'), PIANO('blue-bossa', 'rootless', 'anticip')]),
  C('so-what', 3, b('Modal: dorian, a half step up', 'מודאלי: דורי, וחצי טון למעלה'), [CH('so-what'), PIANO('so-what', 'quartal', 'charleston')]),
  C('satin', 3, b('Chains of ii–Vs', 'שרשראות של ii–V'), [CH('satin'), PIANO('satin', 'rootless', 'charleston'), T('chart-analysis', 3)]),
  C('song-father', 3, b('Minor vamp with descending dominants', 'ווּמפּ מינורי עם דומיננטות יורדות'), [CH('song-father')]),
  C('misty', 3, b('Ballad ii–Vs, A section', 'ii–V של בלדה, חלק A'), [CH('misty'), PIANO('misty', 'rootless', 'whole')]),
  C('rhythm-full', 4, b('Rhythm changes: the whole AABA', 'ריתם צ׳יינג׳ס: כל ה־AABA'), [CH('rhythm-full'), PIANO('rhythm-full', 'rootless', 'charleston'), T('jazz-form', 2)]),
  C('bird-blues', 4, b('Bird blues: a ii–V in every bar', 'בלוז בירד: ii–V בכל תיבה'), [CH('bird-blues'), T('jazz-form', 3)]),
  C('ladybird', 4, b('Tritone subs and the Ladybird turnaround', 'תחליפי טריטון והטרנאראונד של Lady Bird'), [CH('ladybird'), T('turnarounds', 3)]),
  C('giant', 4, b('Coltrane changes: three tonal centres', 'קולטריין צ׳יינג׳ס: שלושה מרכזים טונאליים'), [CH('giant-slow'), CH('giant'), T('jazz-changes', 5)]),
];

const EAR: RepItem[] = [
  O('pop-progressions', 1, b('Pop progressions by ear', 'מהלכי פופ בשמיעה'), b('Three chords I–IV–V and I–vi–IV–V', 'שלושה אקורדים I–IV–V ו־I–vi–IV–V'), [T('progressions', 1)], TO.i4v('blues-forms')),
  O('sing-tunes', 1, b('Sing well-known tunes back', 'לשיר בחזרה מנגינות מוכרות'), b('Hold a melody in your ear', 'להחזיק מנגינה באוזן'), [T('song-sing', 1), T('song-sing', 2)]),
  O('blues-forms', 2, b('The blues by ear', 'הבלוז בשמיעה'), b('Major or minor 12-bar blues', 'בלוז 12 תיבות מז׳ורי או מינורי'), [T('jazz-form', 1), CH('blues-f')], TO.jazzBlues('bird-ear')),
  O('two-five-ear', 2, b('ii–V–I by ear', 'ii–V–I בשמיעה'), b('Major or minor ii–V', 'ii–V מז׳ורי או מינורי'), [T('jazz-changes', 1), CH('two-five-keys')], TO.autumn('autumn-ear')),
  O('turnarounds-ear', 2, b('Turnarounds by ear', 'טרנאראונדים בשמיעה'), b('I–vi–ii–V or iii–vi–ii–V', 'I–vi–ii–V או iii–vi–ii–V'), [T('turnarounds', 1)], TO.turn('rhythm-ear')),
  O('autumn-ear', 3, b('Autumn Leaves: read the chart', 'Autumn Leaves: לקרוא את דף האקורדים'), b('Find the key and the ii–Vs of a standard', 'למצוא את הסולם ואת ה־ii–V של סטנדרט'), [T('chart-analysis', 1), T('chart-analysis', 2), CH('autumn')], undefined, { standard: true, ref: { kind: 'standard', id: 'autumn' } }),
  O('functions-ear', 3, b('What each chord does', 'מה כל אקורד עושה'), b('Chord functions in standards', 'תפקידי אקורדים בסטנדרטים'), [T('chart-analysis', 3), CH('satin')], undefined, { standard: true, ref: { kind: 'standard', id: 'satin' } }),
  O('subs-ear', 3, b('Tritone subs and the backdoor', 'תחליף טריטון ודלת אחורית'), b('ii–V, tritone sub or backdoor?', 'ii–V, תחליף טריטון או דלת אחורית?'), [T('jazz-changes', 2), CH('backdoor-g')], undefined, { standard: true }),
  O('rhythm-ear', 4, b('Rhythm changes by ear', 'ריתם צ׳יינג׳ס בשמיעה'), b('An A section or the bridge?', 'חלק A או הגשר?'), [T('jazz-form', 2), CH('rhythm-full')], undefined, { standard: true, ref: { kind: 'standard', id: 'rhythm-full' } }),
  O('bird-ear', 4, b('Which blues: major, jazz or Bird?', 'איזה בלוז: מז׳ורי, ג׳אז או בירד?'), b('Blues variants by ear', 'גרסאות הבלוז בשמיעה'), [T('jazz-form', 3), CH('bird-blues')], undefined, { standard: true, ref: { kind: 'standard', id: 'bird-blues' } }),
  O('coltrane-ear', 4, b('Coltrane changes by ear', 'קולטריין צ׳יינג׳ס בשמיעה'), b('Chains and cycles', 'שרשראות ומעגלים'), [T('jazz-changes', 5), CH('giant-slow')], undefined, { standard: true, ref: { kind: 'standard', id: 'giant' } }),
  O('odd-ear', 4, b('Prog and odd-time grooves', 'גרוב פרוג ומשקלים מורכבים'), b('5/4, 9/8 and 11/8 groupings', 'חלוקות של 5/4, 9/8 ו־11/8'), [T('prog-meter', 1), T('prog-meter', 2), T('prog-meter', 3)], undefined, { standard: true }),
];

// Voice (0.70.1 voice course): the band sing-along levels (F13 songs with the band, F14 standards, F15 scat) — each
// item opens its vocal level, which sings the song with the band and scores every phrase.
const V = (n: number): RepWay => ({ k: 'vocal', level: n });
/** A band song of the voice course (songbook = public domain; ours = written for the app). */
const VS = (id: string, tier: RepTier, teaches: Bi, ways: RepWay[], leads?: RepItem['leads'], extra: Partial<RepItem> = {}): RepItem => {
  const vs = voiceSong(id);
  return { id, tier, title: vs?.title ?? songTitle(id), teaches, ways, legal: vs && 'tier' in vs && vs.tier === 'own' ? 'own' : 'pd', ref: { kind: 'song', id }, ...(leads ? { leads } : {}), ...extra };
};
const VOICE: RepItem[] = [
  VS('twinkle', 1, b('One phrase over a pop groove', 'פראזה אחת מעל גרוב פופ'), [V(1301), V(1303)], TO.i4v('blue-window')),
  VS('ode', 1, b('Two phrases, rhythm graded', 'שתי פראזות, עם ציון לקצב'), [V(1302)]),
  VS('morning-line', 1, b('Verse and chorus on I–V–vi–IV', 'בית ופזמון על I–V–vi–IV'), [V(1301), V(1303)], TO.vi('guide-tones')),
  VS('greensleeves', 1, b('A minor key, a longer song', 'סולם מינורי, שיר ארוך יותר'), [V(1306)], TO.minor('corner-light')),
  VS('blue-window', 2, b('A 12-bar blues head', 'ראש של בלוז 12 תיבות'), [V(1401)], TO.i7iv('saints-jazz')),
  O('roots-i4v', 2, b('The roots of I, IV and V', 'השורשים של I, IV ו־V'), b('Sing the bass of the blues', 'לשיר את הבס של הבלוז'), [T('sing-intervals', 6)], TO.blues('blue-window')),
  O('guide-tones', 2, b('Guide tones through ii–V–I', 'צלילים מנחים לאורך ii–V–I'), b('3rds and 7ths over the band', 'טרצות וספטימות מעל הלהקה'), [V(1502)], TO.autumn('corner-light')),
  VS('saints-jazz', 3, b('A New Orleans head, as written', 'ראש בסגנון ניו אורלינס, כפי שנכתב'), [V(1402), V(1403)], undefined, { standard: true }),
  VS('swing-low-jazz', 3, b('A spiritual in swing, then as a ballad', 'שיר רוחני בסווינג, ואז כבלדה'), [V(1402), V(1405)], undefined, { standard: true }),
  VS('corner-light', 3, b('Laid back over a minor ii–V cycle', 'מאחורי הפעמה, על מעגל ii–V מינורי'), [V(1404)], undefined, { standard: true }),
  VS('slow-harbor', 3, b('A ballad: one breath per phrase', 'בלדה: נשימה אחת לפראזה'), [V(1405)], undefined, { standard: true }),
  VS('rio-gray', 3, b('Bossa nova: straight eighths, soft', 'בוסה נובה: שמיניות ישרות, ברכות'), [V(1406)], undefined, { standard: true }),
  VS('fast-tracks', 4, b('Rhythm changes A at 160–180', 'ריתם צ׳יינג׳ס A ב־160–180'), [V(1407)], undefined, { standard: true }),
  O('scat-landing', 4, b('Scat: land on chord tones', 'סקאט: נחיתה על צלילי אקורד'), b('Free lines over ii–V–I and the blues', 'קווים חופשיים מעל ii–V–I ובלוז'), [V(1503), V(1504)], undefined, { standard: true }),
];

const GUITAR: RepItem[] = [
  S('twinkle', 1, b('Three open chords: I–IV–V', 'שלושה אקורדים פתוחים: I–IV–V'), [{ k: 'song', song: 'twinkle', part: 'chords' }, { k: 'song', song: 'twinkle', part: 'melody' }], TO.i4v('blues-basic')),
  S('oh-susanna', 1, b('I–IV–V7 and a steady strum', 'I–IV–V7 ופריטה יציבה'), [{ k: 'song', song: 'oh-susanna', part: 'chords' }, { k: 'song', song: 'oh-susanna', part: 'melody' }], TO.i4v('blues-basic')),
  S('saints', 1, b('I–I7–IV: the blues move', 'I–I7–IV: התנועה של הבלוז'), [{ k: 'song', song: 'saints', part: 'chords' }, { k: 'song', song: 'saints', part: 'melody' }], TO.i7iv('blues-basic')),
  S('greensleeves', 1, b('A minor key in 3/4', 'סולם מינורי ב־3/4'), [{ k: 'song', song: 'greensleeves', part: 'chords' }, { k: 'song', song: 'greensleeves', part: 'melody' }], TO.minor('minor-blues')),
  O('strums', 1, b('Strumming patterns', 'דפוסי פריטה'), b('Quarters, down-up 8ths and the waltz', 'רבעים, שמיניות למטה־למעלה וואלס'), [L('g-rhythm-1'), L('g-rhythm-2')]),
  C('blues-basic', 2, b('The 12-bar blues and the shuffle', 'בלוז 12 תיבות והשאפל'), [L('g-rhythm-3'), L('g-impro-1'), CH('blues-basic')], TO.blues('blues-f')),
  C('minor-blues', 2, b('Minor blues: roots on beat 1', 'בלוז מינורי: יסודות על 1'), [L('g-impro-1'), CH('minor-blues')], TO.minorIiv('blue-bossa')),
  C('two-five-keys', 2, b('Shell voicings: ii–V–I', 'קונכיות: ii–V–I'), [L('g-jazz-1'), CH('two-five-keys')], TO.autumn('autumn')),
  C('blues-f', 2, b('The jazz blues: 3rds on beat 1', 'בלוז ג׳אז: טרצות על 1'), [L('g-impro-2'), CH('blues-f')], TO.jazzBlues('bird-blues')),
  C('autumn', 3, b('Major and minor ii–V–I, comped', 'ii–V–I מז׳ורי ומינורי, בליווי'), [L('g-jazz-1'), L('g-jazz-4'), CH('autumn')]),
  C('blue-bossa', 3, b('Bossa comping and a key change', 'ליווי בוסה ומעבר סולם'), [L('g-rhythm-6'), CH('blue-bossa')]),
  C('fly', 3, b('Drop-2 voicings around the cycle', 'וויסינג דרופ 2 במעגל'), [L('g-jazz-2'), CH('fly')]),
  C('so-what', 3, b('Modal: one chord, many bars', 'מודאלי: אקורד אחד, הרבה תיבות'), [L('g-impro-3'), CH('so-what')]),
  C('a-train', 3, b('Guide-tone lines through an AABA', 'קווי צלילים מנחים לאורך AABA'), [L('g-jazz-5'), CH('a-train')]),
  C('rhythm-full', 4, b('Rhythm changes: drop-2 ii–Vs at tempo', 'ריתם צ׳יינג׳ס: ii–V בדרופ 2 בטמפו'), [L('g-jazz-4'), CH('rhythm-full')]),
  C('bird-blues', 4, b('Bird blues: guide tones through the form', 'בלוז בירד: צלילים מנחים לאורך הצורה'), [L('g-impro-4'), CH('bird-blues')]),
  C('giant', 4, b('Coltrane changes: chord melody and guide tones', 'קולטריין צ׳יינג׳ס: אקורד־מלודיה וצלילים מנחים'), [L('g-jazz-7'), CH('giant-slow')]),
  O('compas', 4, b('12-beat compás', 'קומפאס של 12 פעמות'), b('Odd groupings: 3+3+2+2+2', 'חלוקות לא זוגיות: 3+3+2+2+2'), [L('g-flamenco-5')], undefined, { standard: true }),
];

const BASS_ITEMS: RepItem[] = [
  S('twinkle', 1, b('Melody on the neck, I–IV–V underneath', 'מנגינה על הצוואר, I–IV–V מתחת'), [{ k: 'song', song: 'twinkle', part: 'melody' }], TO.i4v('blues-basic')),
  S('saints', 1, b('Melody with a pickup', 'מנגינה עם פתיחה מתרוממת'), [{ k: 'song', song: 'saints', part: 'melody' }], TO.i7iv('blues-basic')),
  S('ode', 1, b('Stepwise melody in position', 'מנגינה בצעדים בפוזיציה'), [{ k: 'song', song: 'ode', part: 'melody' }]),
  O('roots', 1, b('Roots of a chord chart', 'יסודות של דף אקורדים'), b('Roots, then root and 5th', 'יסודות, ואז יסוד וקווינטה'), [L('b-chord-1'), L('b-chord-2')], TO.i4v('blues-basic')),
  C('blues-basic', 2, b('The 12-bar blues, walked', 'בלוז 12 תיבות, בווקינג'), [BASS('blues-basic'), L('b-styles-4'), CH('blues-basic')], TO.blues('blues-f')),
  C('turnarounds-f', 2, b('The I–vi–ii–V turnaround', 'הטרנאראונד I–vi–ii–V'), [BASS('turnarounds-f'), CH('turnarounds-f')], TO.turn('rhythm-full')),
  C('two-five-keys', 2, b('ii–V–I through all keys', 'ii–V–I בכל הסולמות'), [BASS('two-five-keys'), L('b-walk-9')], TO.autumn('autumn')),
  C('blues-f', 2, b('The jazz blues in 4', 'בלוז ג׳אז בארבע'), [BASS('blues-f'), CH('blues-f')], TO.jazzBlues('bird-blues')),
  C('fly', 3, b('Walking a cycle of fifths', 'ווקינג על מעגל קווינטות'), [BASS('fly'), CH('fly')]),
  C('autumn', 3, b('Major and minor ii–V–I, walked', 'ii–V–I מז׳ורי ומינורי, בווקינג'), [BASS('autumn'), CH('autumn')]),
  C('blue-bossa', 3, b('Bossa bass and a key change', 'בס בוסה ומעבר סולם'), [BASS('blue-bossa'), L('b-styles-7'), CH('blue-bossa')]),
  C('a-train', 3, b('A two-feel through an AABA', 'תחושת שתיים לאורך AABA'), [BASS('a-train'), CH('a-train')]),
  C('so-what', 3, b('Modal walking: dorian, a half step up', 'ווקינג מודאלי: דורי, וחצי טון למעלה'), [BASS('so-what'), CH('so-what')]),
  C('misty', 3, b('A ballad: half notes and space', 'בלדה: חצאים ומרווח'), [BASS('misty'), CH('misty')]),
  C('rhythm-full', 4, b('Rhythm changes: two chords a bar', 'ריתם צ׳יינג׳ס: שני אקורדים בתיבה'), [BASS('rhythm-full'), L('b-walk-10')]),
  C('bird-blues', 4, b('Bird blues: a ii–V in every bar', 'בלוז בירד: ii–V בכל תיבה'), [BASS('bird-blues'), CH('bird-blues')]),
  C('stella', 4, b('Half-diminished ii–Vs, 32 bars', 'ii–V חצי־מוקטנים, 32 תיבות'), [BASS('stella'), CH('stella')]),
  C('giant', 4, b('Coltrane changes, walked', 'קולטריין צ׳יינג׳ס, בווקינג'), [BASS('giant'), CH('giant-slow')]),
];

const DRUMS: RepItem[] = [
  O('rock-beat', 1, b('The basic rock beat', 'קצב הרוק הבסיסי'), b('Hat 8ths, snare on 2 and 4', 'היי־האט בשמיניות, סנר על 2 ו־4'), [L('d-rock-1'), L('d-rock-3')]),
  O('groove-fill', 1, b('Groove and a fill', 'גרוב ומעבר'), b('A fill every 4th bar, land on 1', 'מעבר כל תיבה רביעית, נחיתה על 1'), [L('d-rock-8'), L('d-fills-1')]),
  O('shuffle', 2, b('The shuffle', 'השאפל'), b('Triplet feel: the blues groove', 'תחושת טריולות: הגרוב של הבלוז'), [L('d-shuffle-1'), L('d-shuffle-2')], { to: 'swing-ride', text: b('The shuffle’s triplet is the swing of the ride pattern', 'הטריולה של השאפל היא הסווינג של תבנית הרייד') }),
  O('slow-blues', 2, b('Slow blues in 12/8', 'בלוז איטי ב־12/8'), b('Twelve bars, triplet feel, slow', 'שתים־עשרה תיבות, טריולות, לאט'), [L('d-shuffle-3'), CH('blues-basic')]),
  O('swing-ride', 2, b('The swing ride pattern', 'תבנית הרייד בסווינג'), b('Ride and hi-hat foot on 2 and 4', 'רייד ורגל היי־האט על 2 ו־4'), [L('d-jazz-1'), L('d-jazz-2')], { to: 'swing-standard', text: b('Ride, feathered kick and comping: a swing standard', 'רייד, קיק מרוכך וקומפינג: סטנדרט בסווינג') }),
  O('swing-standard', 3, b('Swing a standard: Autumn Leaves', 'סווינג על סטנדרט: Autumn Leaves'), b('Comping on the snare through a form', 'קומפינג בסנר לאורך צורה'), [L('d-jazz-4'), L('d-jazz-5'), CH('autumn')], undefined, { standard: true, ref: { kind: 'standard', id: 'autumn' } }),
  O('bossa', 3, b('Bossa nova: Blue Bossa', 'בוסה נובה: Blue Bossa'), b('The bossa groove and cross-stick', 'גרוב הבוסה וקרוס־סטיק'), [L('d-latin-1'), CH('blue-bossa')], undefined, { standard: true, ref: { kind: 'standard', id: 'blue-bossa' } }),
  O('jazz-waltz', 3, b('Jazz waltz: blues in 3/4', 'ואלס ג׳אז: בלוז ב־3/4'), b('The ride in three', 'הרייד בשלוש'), [L('d-jazz-6'), CH('blues-waltz')], undefined, { standard: true, ref: { kind: 'standard', id: 'blues-waltz' } }),
  O('samba', 3, b('Samba', 'סמבה'), b('16ths in 2, the surdo on the kick', 'שש־עשריות בשתיים, הסורדו בקיק'), [L('d-latin-2')], undefined, { standard: true }),
  O('up-tempo', 4, b('Up-tempo: rhythm changes', 'טמפו מהיר: ריתם צ׳יינג׳ס'), b('A 2-feel at 200 and up', 'תחושת שתיים ב־200 ומעלה'), [L('d-jazz-7'), CH('rhythm-full')], undefined, { standard: true, ref: { kind: 'standard', id: 'rhythm-full' } }),
  O('trading', 4, b('Trading 4s', 'חילופי 4'), b('Solo four bars, keep the form', 'סולו של ארבע תיבות, בלי לאבד את הצורה'), [L('d-jazz-8')], TO.odd('odd-9'), { standard: true }),
  O('odd-9', 4, b('9/8: karsilama and aksak', '9/8: קרשילמה ואקסאק'), b('Grouping 2+2+2+3', 'חלוקה 2+2+2+3'), [L('d-mideast-7')], undefined, { standard: true }),
  O('odd-7', 4, b('7/8 and 10/8', '7/8 ו־10/8'), b('Odd meters in a groove', 'משקלים לא זוגיים בתוך גרוב'), [L('d-mideast-8')], undefined, { standard: true }),
];

export const REPERTOIRE: Record<CourseId, RepItem[]> = { keys: KEYS, jazz: JAZZ, ear: EAR, voice: VOICE, guitar: GUITAR, bass: BASS_ITEMS, drums: DRUMS };

export const repertoireFor = (course: CourseId): RepItem[] => REPERTOIRE[course] ?? REPERTOIRE.ear;
export const repItem = (course: CourseId, id: string): RepItem | undefined => repertoireFor(course).find((x) => x.id === id);
export const tierName = (n: RepTier): Bi => REP_TIERS[n - 1].name;

// ------------------------------------------------------------------ results

/** The result id of an item (a lesson id the server accepts: lowercase words and dashes, ≤ 40 chars). */
export const repLessonId = (course: CourseId, id: string) => `rep-${course}-${id}`;
export const isRepLesson = (lessonId: string) => lessonId.startsWith('rep-');
/** Results are stored out of 10 (score × 10), so lessons[id].best / 10 is the best score. */
export const REP_TOTAL = 10;
/** A piece counts as learned at 80 % (the app's cautious ✓). */
export const REP_LEARNED = 0.8;

/** The course and item of a result id, when it is one. */
export function parseRepLesson(lessonId: string): { course: CourseId; id: string } | null {
  const m = /^rep-(ear|jazz|voice|keys|guitar|bass|drums)-(.+)$/.exec(lessonId);
  return m ? { course: m[1] as CourseId, id: m[2] } : null;
}

export type RepStatus = 'new' | 'started' | 'learned';
export interface RepBest {
  /** Best score 0..1. */
  best: number;
  plays: number;
}
/** Best scores per item of a course from progress.lessons (lessonId → best of 10, completions). */
export function repResults(lessons: Record<string, { best: number; completions: number }> | undefined, course: CourseId): Record<string, RepBest> {
  const out: Record<string, RepBest> = {};
  for (const it of repertoireFor(course)) {
    const l = lessons?.[repLessonId(course, it.id)];
    if (l?.completions) out[it.id] = { best: Math.min(1, l.best / REP_TOTAL), plays: l.completions };
  }
  return out;
}
export const repStatus = (r: RepBest | undefined): RepStatus => (!r ? 'new' : r.best >= REP_LEARNED ? 'learned' : 'started');

/** A finished practice of an item as a result (score 0..1 → first-try out of 10). */
export function repResult(course: CourseId, id: string, score: number, xp: number, at = new Date(), xpCounted = false) {
  const s = Math.max(0, Math.min(1, score));
  return {
    lessonId: repLessonId(course, id),
    lessonVersion: 1,
    sessionId: `rep-${at.getTime()}`,
    completedAt: at.toISOString(),
    firstTry: Math.round(s * REP_TOTAL),
    total: REP_TOTAL,
    xp: Math.max(0, Math.round(xp)),
    ...(xpCounted ? { xpCounted: true } : {}),
    missed: [] as never[],
    items: [] as never[],
    course,
  };
}

// ------------------------------------------------------------------ the goal ("Next goal: your first standard")

export interface RepGoal {
  id: 'first-standard' | 'five-standards' | 'first-advanced' | 'all';
  title: Bi;
  now: number;
  target: number;
  /** The item to play next towards the goal. */
  next?: RepItem;
}

/** Learned counts per tier, and learned standards. */
export function repCounts(course: CourseId, res: Record<string, RepBest>): { tier: Record<RepTier, number>; standards: number; total: Record<RepTier, number> } {
  const tier = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<RepTier, number>;
  const total = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<RepTier, number>;
  let standards = 0;
  for (const it of repertoireFor(course)) {
    total[it.tier]++;
    if (repStatus(res[it.id]) !== 'learned') continue;
    tier[it.tier]++;
    if (it.standard) standards++;
  }
  return { tier, standards, total };
}

/** The road: two foundations, two blues & progressions, then a standard (5 steps); then five standards; then an
 *  advanced piece; then the whole list. `next` is the first item not yet learned in the stage that is still open
 *  (an item already started comes first). */
export function repGoal(course: CourseId, res: Record<string, RepBest>): RepGoal {
  const items = repertoireFor(course);
  const c = repCounts(course, res);
  const pick = (tiers: RepTier[], onlyStandard = false): RepItem | undefined => {
    const open = items.filter((x) => tiers.includes(x.tier) && (!onlyStandard || x.standard) && repStatus(res[x.id]) !== 'learned');
    return open.find((x) => repStatus(res[x.id]) === 'started') ?? open[0];
  };
  const firstStd = c.standards >= 1 || items.some((x) => x.standard && x.tier === 3 && repStatus(res[x.id]) === 'learned');
  if (!firstStd) {
    const now = Math.min(2, c.tier[1]) + Math.min(2, c.tier[2]);
    const stage: RepTier[] = c.tier[1] < 2 ? [1] : c.tier[2] < 2 ? [2] : [3];
    const next = stage[0] === 3 ? pick([3], true) : (pick(stage) ?? pick([3], true));
    return { id: 'first-standard', title: { en: 'Your first standard', he: 'הסטנדרט הראשון שלכם' }, now, target: 5, next };
  }
  const std3 = items.filter((x) => x.tier === 3 && x.standard && repStatus(res[x.id]) === 'learned').length;
  const want3 = Math.min(5, items.filter((x) => x.tier === 3 && x.standard).length);
  if (std3 < want3) return { id: 'five-standards', title: want3 === 5 ? { en: 'Five standards', he: 'חמישה סטנדרטים' } : { en: 'Every standard in the list', he: 'כל הסטנדרטים ברשימה' }, now: std3, target: want3, next: pick([3], true) };
  if (c.tier[4] < 1) return { id: 'first-advanced', title: { en: 'Your first advanced piece', he: 'היצירה המתקדמת הראשונה שלכם' }, now: 0, target: 1, next: pick([4]) };
  const learned = items.filter((x) => repStatus(res[x.id]) === 'learned').length;
  return { id: 'all', title: { en: 'The whole repertoire', he: 'כל הרפרטואר' }, now: learned, target: items.length, next: pick([1, 2, 3, 4]) };
}

/** Has the player learned a standard in this course (the "first standard" badge)? */
export const hasFirstStandard = (course: CourseId, res: Record<string, RepBest>): boolean => repertoireFor(course).some((x) => x.standard && repStatus(res[x.id]) === 'learned');

/** The items that lead to this one (for "comes from" on an item page). */
export const repLeadsFrom = (course: CourseId, id: string): RepItem[] => repertoireFor(course).filter((x) => x.leads?.to === id);

/** A short label of a way (for the item page's buttons). */
export function wayLabel(w: RepWay, course: CourseId): Bi {
  switch (w.k) {
    case 'song':
      if (course === 'guitar') return w.part === 'chords' ? b('Strum the chords', 'לפרוט את האקורדים') : b('Play the melody', 'לנגן את המנגינה');
      if (course === 'bass') return b('Play the melody', 'לנגן את המנגינה');
      return w.part === 'both' ? b('Both hands', 'שתי ידיים') : w.part === 'chords' ? b('Chords (left hand)', 'אקורדים (יד שמאל)') : b('Melody (right hand)', 'מנגינה (יד ימין)');
    case 'vocal':
      return b('Sing with the band', 'לשיר עם הלהקה');
    case 'chartDrill':
      return w.voicing.startsWith('stride') ? b('Stride left hand', 'יד שמאל בסטרייד') : w.voicing === 'quartal' ? b('Quartal voicings', 'וויסינג קוורטלי') : w.voicing === 'rootless' ? b('Rootless voicings, comping', 'וויסינג בלי יסוד, ליווי') : w.voicing === 'shell' ? b('Shell voicings', 'שלדים (שלושה צלילים)') : w.voicing === 'guide' ? b('Guide tones, comping', 'צלילים מנחים, ליווי') : b('Voicings', 'וויסינגים');
    case 'bassStd':
      return b('Walk the changes', 'ווקינג על המהלך');
    case 'level':
      return b('Technique level', 'שלב טכניקה');
    case 'chart':
      return b('Play along with the band', 'לנגן עם הלהקה');
    case 'topic':
      return b('Lesson', 'שיעור');
  }
}

/** Every standard / song / level / topic an item uses (for tests and the spec). */
export function repRefs(it: RepItem): { songs: string[]; standards: string[]; levels: string[]; topics: { topic: string; level: number }[]; vocal: number[] } {
  const out = { songs: [] as string[], standards: [] as string[], levels: [] as string[], topics: [] as { topic: string; level: number }[], vocal: [] as number[] };
  for (const w of it.ways) {
    if (w.k === 'song') out.songs.push(w.song);
    else if (w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'chart') out.standards.push(w.std);
    else if (w.k === 'level') out.levels.push(w.ref);
    else if (w.k === 'topic') out.topics.push({ topic: w.topic, level: w.level });
    else if (w.k === 'vocal') out.vocal.push(w.level);
  }
  return out;
}
