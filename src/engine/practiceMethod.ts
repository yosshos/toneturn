// Practice method after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md A11, C6). Pure, plus three tiny stores.
//
//  1. The four-slot, self-generating session ("How do I Practice Jazz and Improvisation?", YouTube Gv7tgujQxUI):
//     technique → repetition and transposition → tunes → engaging with the recorded history. Each part feeds the next:
//     what slot 2 (transposition, the workout's strengthen block) worked on is pushed into slot 3 on a tune
//     (tuneSlotLevels), and slot 4 is a guided listening card for the same concept (listenCard). The preset itself is
//     workout2.ts `preset('four-slot')`. The concept → tune-level table is ours (C6 asks for "self-generating"; the
//     exact mapping is not his).
//  2. The 7-step lick flow ("Professor Siskind's 7-Step Program to Improvised Bliss", improv coursepack; also
//     "Getting the Most out of Practicing Transcriptions", wu16Z-gWBOc): identify → many keys → the concept → new
//     phrases over the same chord → over other chords → overdo it in tunes → only where tasteful. The doc ties it to
//     his COREA process, whose acronym is not spelled out in any free source (verify).
//  3. Memorising a tune ("How to Memorize a Jazz Standard (10 Tips)", _0GZbfIgj5g; JPF Book 2 Unit 6): chunk by form →
//     transpose at once (two keys on day one) → write the changes from memory → sing melody, roots, 3rds → loop
//     listening → perform → the three lists (know / learning / next). The order of the steps is C6's (verify against
//     the video's own order of tips).

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

/** A minimal Storage (localStorage, or a fake in tests). */
export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
const ls = (): KV | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};
function load<T>(key: string, fallback: T, kv: KV | null = ls()): T {
  try {
    const raw = kv?.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown, kv: KV | null = ls()): void {
  try {
    kv?.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode / full storage: the flow still works for this session */
  }
}

// ───────────────────────────── 1. the four-slot session ─────────────────────────────

/** What a technique item practises, for the tunes and listening slots. */
export type Concept = 'shells' | 'rootless' | 'guide' | 'stride' | 'walking' | 'comping' | 'harmonise' | 'lines' | 'ballad';

/**
 * Slot 3: the head-based levels that put a concept on a tune, first that exists wins (k-tex = "Solo piano: textures",
 * Part C2 numbering; k-tune / k-harm in headDrills.ts as the fallback). One table, easy to adjust.
 */
export const CONCEPT_TUNE_LEVELS: Record<Concept, string[]> = {
  shells: ['k-tex-2', 'k-tex-3', 'k-tune-3'],
  guide: ['k-tex-2', 'k-tune-2'],
  rootless: ['k-tex-8', 'k-tune-4'],
  stride: ['k-tex-5', 'k-tex-13', 'k-tune-1'],
  walking: ['k-tex-9', 'k-tex-7', 'k-tune-1'],
  comping: ['k-tex-4', 'k-tune-6'],
  harmonise: ['k-tex-10', 'k-harm-4'],
  lines: ['k-tex-4', 'k-tune-6'],
  ballad: ['k-tex-15', 'k-tex-16', 'k-harm-2'],
};
/** No concept found: comp a head with the melody. */
export const DEFAULT_TUNE_LEVELS = ['k-tune-6', 'k-tune-1'];

/** Families that are already tunes or ear work: they don't feed slot 3. */
const NOT_TECHNIQUE = /^(k-ear|k-tune|k-harm|k-tex|k-phrase|licks|transcribe|custom|d-)/;

/** The concept of an item (its family and kind; chart drills by their voicing / rhythm). Null = none we can map. */
export function conceptOf(family: string, kind: string): Concept | null {
  if (NOT_TECHNIQUE.test(family)) return null;
  const k = kind.toLowerCase();
  if (k.startsWith('chart~')) {
    const [, , v, r] = k.split('~');
    if (v?.startsWith('stride-walk')) return 'walking';
    if (v?.startsWith('stride')) return 'stride';
    if (r && r !== 'whole') return 'comping';
    if (v === 'shell') return 'shells';
    if (v === 'guide') return 'guide';
    if (v?.startsWith('rootless')) return 'rootless';
    if (v === 'drop2' || v === 'drop3' || v === 'close4' || v === 'block') return 'harmonise';
    return 'comping';
  }
  if (/ballad|rubato/.test(k)) return 'ballad';
  if (/stride|tenth|peace|break/.test(k)) return 'stride';
  if (/walk|bass-?line/.test(k)) return 'walking';
  if (/shell/.test(k)) return 'shells';
  if (/rootless/.test(k)) return 'rootless';
  if (/guide/.test(k)) return 'guide';
  if (/charleston|garland|comp|push|lead-?in|basie|accent/.test(k)) return 'comping';
  if (/drop2|drop3|close|block|locked|shared/.test(k)) return 'harmonise';
  if (family === 'k-lh') return 'shells';
  if (family === 'k-comp') return 'comping';
  if (family === 'accomp') return 'stride';
  if (family === 'voicings') return 'rootless';
  if (/^(harris|k-harrisline|k-bebop|k-vocab|jazz|k-solo|k-sixdim)$/.test(family)) return 'lines';
  return null;
}

/** The fields of an item's state the slot needs (ItemState has them). */
export interface SlotItem {
  itemId: string;
  family: string;
  last: string;
  cleanBpm: number;
  targetBpm?: number;
  takes: number;
}
/** The kind inside an item id (family:kind:key:hands:… — a chart kind holds ':' itself, as in 'lv:<id>'). */
const kindOf = (itemId: string): string => /^[^:]+:(.*?):\d{1,2}:(?:RL|R|L)(?::|$)/.exec(itemId)?.[1] ?? itemId.split(':')[1] ?? '';

/**
 * Slot 2 → slot 3 ("self-generating"): the newest technique item that reached its level tempo (else the newest one
 * played) names the concept; its tune levels come back, then the defaults. Items played more than `days` ago are ignored.
 */
export function tuneSlotLevels(items: Record<string, SlotItem>, now = new Date(), days = 14): { concept: Concept | null; levels: string[] } {
  const since = now.getTime() - days * 86400000;
  const cands = Object.values(items)
    .filter((x) => x.takes > 0 && Date.parse(x.last) >= since)
    .map((x) => ({ x, c: conceptOf(x.family, kindOf(x.itemId)) }))
    .filter((y): y is { x: SlotItem; c: Concept } => y.c !== null)
    .sort((a, b) => Date.parse(b.x.last) - Date.parse(a.x.last));
  const mastered = cands.find((y) => (y.x.targetBpm ?? Infinity) <= y.x.cleanBpm);
  const pick = mastered ?? cands[0];
  if (!pick) return { concept: null, levels: [...DEFAULT_TUNE_LEVELS] };
  return { concept: pick.c, levels: [...new Set([...CONCEPT_TUNE_LEVELS[pick.c], ...DEFAULT_TUNE_LEVELS])] };
}

/** Slot 4: a guided listening card — who to put on (generic), three things to listen for. */
export interface ListenCard {
  concept: Concept | null;
  who: T2;
  prompts: T2[];
}
const LISTEN: Record<Concept | 'any', { who: T2; prompts: T2[] }> = {
  shells: { who: t('A solo pianist playing a medium-tempo standard', 'פסנתרן סולו בסטנדרט בטמפו בינוני'), prompts: [t('Where is the bass: low, or close to the chord?', 'איפה הבס: נמוך, או קרוב לאקורד?'), t('Is the chord on the beat or just after the bass?', 'האקורד על הפעמה או מיד אחרי הבס?'), t('When does the left hand stop?', 'מתי היד השמאלית שותקת?')] },
  guide: { who: t('A horn player on a ballad', 'נגן כלי נשיפה בבלדה'), prompts: [t('Hum the 3rd of each new chord.', 'זמזמו את הטרצה של כל אקורד חדש.'), t('Which notes move by a half step?', 'אילו צלילים זזים בחצי טון?'), t('Where does the phrase land?', 'איפה המשפט נוחת?')] },
  rootless: { who: t('A piano trio, the pianist comping', 'טריו פסנתר, הפסנתרן מלווה'), prompts: [t('How often does the piano hit?', 'כמה פעמים הפסנתר מכה?'), t('Short chords or held ones?', 'אקורדים קצרים או מוחזקים?'), t('Does the comp answer the soloist?', 'האם הליווי עונה לסולן?')] },
  stride: { who: t('A stride pianist', 'פסנתרן סטרייד'), prompts: [t('Count the bass notes in one bar.', 'ספרו את צלילי הבס בתיבה אחת.'), t('Find one break: the left hand stops.', 'מצאו הפסקה אחת: היד השמאלית עוצרת.'), t('Tenths or single notes?', 'דצימות או צלילים בודדים?')] },
  walking: { who: t('A bassist walking a blues', 'בסיסט בווקינג על בלוז'), prompts: [t('Sing the root on each new chord.', 'שירו את השורש בכל אקורד חדש.'), t('Find a chromatic approach.', 'מצאו צליל גישה כרומטי.'), t('Two-feel or four?', 'בשתיים או בארבע?')] },
  comping: { who: t('A big band, then a trio pianist', 'ביג בנד, ואחריו פסנתרן בטריו'), prompts: [t('Clap the comping rhythm of two bars.', 'מחאו כף את קצב הליווי של שתי תיבות.'), t('Anticipations: chords before the bar line?', 'הקדמות: אקורדים לפני קו התיבה?'), t('Where is there silence?', 'איפה יש שקט?')] },
  harmonise: { who: t('A pianist playing block chords', 'פסנתרן מנגן אקורדי בלוק'), prompts: [t('Is the melody on top all the time?', 'המנגינה למעלה כל הזמן?'), t('Thick or light voicings?', 'קולות עבים או קלים?'), t('Which notes are not chord tones?', 'אילו צלילים אינם צלילי אקורד?')] },
  lines: { who: t('A bebop soloist', 'סולן ביבופ'), prompts: [t('Which beat do the phrases start on?', 'על איזו פעמה המשפטים מתחילים?'), t('Find a phrase you would steal.', 'מצאו משפט שהייתם גונבים.'), t('Sing its last three notes.', 'שירו את שלושת הצלילים האחרונים שלו.')] },
  ballad: { who: t('A solo ballad', 'בלדה בסולו'), prompts: [t('Is there a steady pulse, or free time?', 'יש פעימה קבועה, או זמן חופשי?'), t('What keeps time under a long note?', 'מה שומר על הזמן מתחת לצליל ארוך?'), t('Where does the pianist pause?', 'איפה הפסנתרן עוצר?')] },
  any: { who: t('A recording of the tune you are learning', 'הקלטה של השיר שאתם לומדים'), prompts: [t('Sing the melody along.', 'שירו את המנגינה יחד.'), t('Count the form: where is bar 1?', 'ספרו את הצורה: איפה תיבה 1?'), t('What would you copy from it?', 'מה הייתם מעתיקים ממנה?')] },
};
export function listenCard(concept: Concept | null): ListenCard {
  const c = LISTEN[concept ?? 'any'];
  return { concept, who: c.who, prompts: c.prompts };
}

/** The four slots' labels (the workout shows them by block id prefix). */
export const SLOT_LABEL = {
  technique: t('Technique', 'טכניקה'),
  transpose: t('Repetition & transposition', 'חזרה והעברה לסולמות'),
  tunes: t('Tunes', 'שירים'),
  listen: t('Recordings', 'הקלטות'),
};
/** A four-slot block's label by its id ('tunes-1', 'listen-1'), else null. */
export function slotLabelOf(id: string | undefined): T2 | null {
  if (!id) return null;
  if (id.startsWith('tunes-')) return SLOT_LABEL.tunes;
  if (id.startsWith('listen-')) return SLOT_LABEL.listen;
  return null;
}

// ───────────────────────────── 2. the 7-step lick flow ─────────────────────────────

export type LickConcept = 'rhythm' | 'contour' | 'harmony';
export const LICK_CONCEPTS: { id: LickConcept; name: T2 }[] = [
  { id: 'rhythm', name: t('Rhythm', 'קצב') },
  { id: 'contour', name: t('Contour', 'צורה') },
  { id: 'harmony', name: t('Harmony', 'הרמוניה') },
];
export type LickStepN = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const LICK_STEPS: { n: LickStepN; title: T2; how: T2 }[] = [
  { n: 1, title: t('Pick it', 'לבחור'), how: t('A phrase you love.', 'משפט שאתם אוהבים.') },
  { n: 2, title: t('Many keys', 'בהרבה סולמות'), how: t('Three keys at tempo opens the next step.', 'שלושה סולמות בטמפו פותחים את השלב הבא.') },
  { n: 3, title: t('The concept', 'הרעיון'), how: t('What do you like in it?', 'מה אתם אוהבים בו?') },
  { n: 4, title: t('Same chord', 'אותו אקורד'), how: t('New phrases, same concept.', 'משפטים חדשים, אותו רעיון.') },
  { n: 5, title: t('Other chords', 'אקורדים אחרים'), how: t('The concept over other chords.', 'הרעיון מעל אקורדים אחרים.') },
  { n: 6, title: t('Overdo it', 'להגזים'), how: t('Everywhere in a tune.', 'בכל מקום בשיר.') },
  { n: 7, title: t('With taste', 'בטעם'), how: t('Only where it fits.', 'רק איפה שזה מתאים.') },
];
/**
 * The rule cards that check a tagged concept in steps 4–7 (ids of improvRules.ts / ruleCards.ts): rhythm → keep one
 * rhythm, contour → vary a repeated shape, harmony → land on chord colours. Step 6 adds the use-a-lick card, step 7
 * the space card. The choice of cards is ours (his steps name no exercise).
 */
export const CONCEPT_CARDS: Record<LickConcept, string[]> = { rhythm: ['same-rhythm'], contour: ['repeat-vary'], harmony: ['target-3', 'tensions'] };
export function stepCards(step: LickStepN, concept: LickConcept | undefined): string[] {
  if (step < 4 || !concept) return [];
  return [...CONCEPT_CARDS[concept], ...(step === 6 ? ['use-lick'] : []), ...(step === 7 ? ['space'] : [])];
}

export interface LickFlow {
  /** The first step not done (8 = all done). */
  step: number;
  concept?: LickConcept;
  /** Step → ISO date it was marked done. */
  done: Partial<Record<LickStepN, string>>;
}
export const newLickFlow = (): LickFlow => ({ step: 1, done: {} });

/** Can this step be marked done now? Only the current one; step 3 and later need the concept. */
export function canComplete(f: LickFlow, step: LickStepN, concept?: LickConcept): boolean {
  if (step !== f.step) return false;
  if (step === 3) return !!(concept ?? f.concept);
  if (step >= 4) return !!f.concept;
  return true;
}
/** Mark a step done (unchanged when it can't be). Step 3 stores the concept. */
export function completeStep(f: LickFlow, step: LickStepN, at: string, concept?: LickConcept): LickFlow {
  if (!canComplete(f, step, concept)) return f;
  return { step: step + 1, concept: step === 3 ? (concept ?? f.concept) : f.concept, done: { ...f.done, [step]: at } };
}
/** Step 2 is done by the 12-key trainer: enough keys at tempo (the lick's stars). */
export function withKeyStars(f: LickFlow, stars: number, need: number, at: string): LickFlow {
  return f.step === 2 && stars >= need ? completeStep(f, 2, at) : f;
}

const LICK_KEY = 'tt.lickFlow.v1';
export const loadLickFlows = (kv?: KV | null): Record<string, LickFlow> => load<Record<string, LickFlow>>(LICK_KEY, {}, kv === undefined ? ls() : kv);
export const saveLickFlows = (m: Record<string, LickFlow>, kv?: KV | null): void => save(LICK_KEY, m, kv === undefined ? ls() : kv);

// ───────────────────────────── 3. memorising a tune ─────────────────────────────

export type TuneList = 'know' | 'learning' | 'next';
export const TUNE_LISTS: { id: TuneList; name: T2 }[] = [
  { id: 'know', name: t('Know', 'יודעים') },
  { id: 'learning', name: t('Learning', 'לומדים') },
  { id: 'next', name: t('Next', 'הבא') },
];
export type MemoStep = 'chunk' | 'transpose' | 'write' | 'sing' | 'loop' | 'perform';
/** The steps in order; `topic` = the app's topic that does it (harmonic dictation: write chords from what you hear). */
export const MEMO_STEPS: { id: MemoStep; title: T2; how: T2; topic?: string }[] = [
  { id: 'chunk', title: t('Chunk by form', 'לחלק לפי הצורה'), how: t('Name the sections and their bars.', 'לתת שם לחלקים ולתיבות שלהם.') },
  { id: 'transpose', title: t('Transpose at once', 'להעביר סולם מיד'), how: t('Two keys on day one.', 'שני סולמות כבר ביום הראשון.') },
  { id: 'write', title: t('Write the changes', 'לכתוב את האקורדים'), how: t('From memory, then check.', 'מהזיכרון, ואז לבדוק.'), topic: 'harmonic-dictation' },
  { id: 'sing', title: t('Sing it', 'לשיר'), how: t('Melody, then roots, then 3rds.', 'מנגינה, אחר כך שורשים, אחר כך טרצות.') },
  { id: 'loop', title: t('Loop a recording', 'להקשיב בלופ'), how: t('Listen until you hear ahead.', 'להקשיב עד ששומעים קדימה.') },
  { id: 'perform', title: t('Perform it', 'לנגן בפני מישהו'), how: t('For someone, or record it.', 'בפני מישהו, או להקליט.') },
];

export interface MemoState {
  lists: Record<string, TuneList>;
  steps: Record<string, Partial<Record<MemoStep, string>>>;
}
export const newMemo = (): MemoState => ({ lists: {}, steps: {} });

export const moveTune = (s: MemoState, id: string, list: TuneList): MemoState => ({ ...s, lists: { ...s.lists, [id]: list } });
export const tunesIn = (s: MemoState, list: TuneList): string[] => Object.keys(s.lists).filter((k) => s.lists[k] === list);
/**
 * Tick / untick a step. The first tick moves a tune from Next (or no list) to Learning; ticking the last step (perform)
 * with all the others done moves it to Know.
 */
export function toggleMemoStep(s: MemoState, id: string, step: MemoStep, at: string): MemoState {
  const cur = { ...(s.steps[id] ?? {}) };
  if (cur[step]) delete cur[step];
  else cur[step] = at;
  let lists = s.lists;
  const all = MEMO_STEPS.every((x) => cur[x.id]);
  if (all) lists = { ...lists, [id]: 'know' };
  else if (Object.keys(cur).length && (!lists[id] || lists[id] === 'next')) lists = { ...lists, [id]: 'learning' };
  return { lists, steps: { ...s.steps, [id]: cur } };
}
/** Done steps and the next one (null = all done). */
export function memoProgress(s: MemoState, id: string): { done: number; next: MemoStep | null } {
  const cur = s.steps[id] ?? {};
  return { done: MEMO_STEPS.filter((x) => cur[x.id]).length, next: MEMO_STEPS.find((x) => !cur[x.id])?.id ?? null };
}

const MEMO_KEY = 'tt.tuneMemo.v1';
export const loadMemo = (kv?: KV | null): MemoState => load<MemoState>(MEMO_KEY, newMemo(), kv === undefined ? ls() : kv);
export const saveMemo = (s: MemoState, kv?: KV | null): void => save(MEMO_KEY, s, kv === undefined ? ls() : kv);
