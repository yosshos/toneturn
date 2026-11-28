// Today's workout (spec AH): the first card on Home, a calm editor (W17), and the run screen for blocks that are
// not lessons (practice timer, game, vocal) plus the end summary with one-tap feedback (W11).

import { Iso } from './Iso';
import { Icon } from './icons';
import { SessionEnd, type SessionEndProps } from './SessionEnd';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import type { PathView } from '../engine/path';
import { TOPIC_GEN } from '../engine/topicKit';
import { add, plusFive, plusFiveOffer, BETWEEN_S, blockLeftMs, blockSummary, canRescale, coverage, focusIdOf, LIMITS, moveTo, parseFocus, preset, remove, rescale, runLeftMs, setMinutes, templateStale, total, WHY_WORD, whyOf, type Block, type BlockTarget, type FocusMode, type Preset, type WorkoutRun } from '../engine/workout2';
import { keyName } from '../engine/drills/generate';
import { familyById } from '../engine/drills/plan';
import type { FamilyId } from '../engine/drills/types';
import type { CellState, FocusSheet } from '../engine/drills/focusSheet';
import { ROLE_NAME } from './PracticeKeys';
import { DOMAINS, type DomainId } from '../engine/rating';
import { DOMAIN_HUE, GAMES2 } from './Arcade';
import { useCourse } from './courseContext';
import { COURSE_AREAS } from '../engine/courses';
import { piano } from './services';
import { slotLabelOf, type ListenCard } from '../engine/practiceMethod';
import { studioText, sfill } from '../i18n/studioText';

type Lang = 'he' | 'en';
const W = {
  en: {
    title: "Today's workout",
    start: 'Start',
    cont: 'Continue',
    left: '{m} min left',
    edit: 'Edit',
    edited: 'Edited for today',
    reset: 'Back to suggested',
    min: 'min',
    total: 'Total',
    next: 'Next',
    unit: '≈ {c} of {o} steps of Unit {n}',
    unitDone: 'Unit {n} is done — the next one is ready',
    waits: 'Unit {n} will wait for {list}',
    pathSteps: '{n} path steps',
    free: 'free practice',
    add: 'Add',
    suggested: 'Suggested for you',
    search: 'Search topics…',
    saveDefault: 'Save as my default',
    everyDay: 'every day',
    thisDay: 'this weekday',
    saved: 'Saved as your default',
    undo: 'Undo',
    removed: 'Removed',
    lock: 'Lock its minutes',
    unlock: 'Unlock',
    swap: 'Something else here',
    remove: 'Remove',
    cantFit: 'That doesn’t fit — unlock a block first',
    done: 'Done',
    presets: { suggested: 'Suggested', ear: 'Ear focus', rhythm: 'Rhythm focus', reading: 'Reading focus', voice: 'Voice focus', instrument: 'Instrument focus', quick5: 'Quick 5', mistakes: 'Fix my mistakes', 'four-slot': 'Four-slot session' } as Record<Preset, string>,
    ctx: { nomic: 'No mic', quiet: 'Quiet place', noinst: 'No instrument' },
    // SPEC-PATH-ROLE §3: three blocks — New (the path), Strengthen (depth on what is opened), Review.
    kinds: { path: 'New', warmup: 'Review', vocal: 'Vocal warm-up', practice: 'My instrument', mistakes: 'Fix my mistakes', strengthen: 'Strengthen', keys: 'Technique', teacher: 'From the teacher', rubato: 'Warm-up', key: 'Key', rung: 'One exercise', item: 'One item', family: 'Family' } as Record<string, string>,
    improv: { improv: 'Improvise', repertoire: 'Repertoire', grooves: 'Grooves, fills and trading' } as Record<string, string>,
    blockSub: { path: 'Next steps of the path', warmup: 'Spaced review', strengthen: 'Opened steps, weakest keys first', keys: 'Half in the key of the week, the rest weakest first', teacher: 'Your class assignments', improv: 'In the key of the week', rubato: 'Slowly, in free time: the start of today’s main item', key: 'Every open exercise in the key', rung: 'Through the 12 keys, weakest first', item: 'Up its tempo ladder, then its other keys', family: 'The family’s levels at your level' } as Record<string, string>,
    slipped: 'Closed items that slipped this week',
    practiceHint: 'Practice on your own instrument. The metronome helps; write what you worked on.',
    metronome: 'Metronome',
    note: 'What did you work on?',
    blockDone: 'Block done',
    go: 'Go',
    finished: 'Workout done!',
    plusQ: 'Keep going? +5 min',
    plusSub: 'One more block: {b}.',
    plusYes: '+5 min',
    plusNo: 'Finish',
    howWas: 'How was it?',
    fb: { easy: 'Too easy', right: 'Just right', hard: 'Too hard', long: 'Too long' },
    end: 'End workout',
    skipBlock: 'Skip this block',
    home: 'Home',
    blockOver: '{b} done',
    nextIn: 'Next: {b} in {s}',
    nextPaused: 'Next: {b} · paused',
    nextNow: 'Next now',
    more: '+2 min',
    runLeft: '{m} min left in the workout',
    sumLine: '{m} min · {n} items · {r} right',
    sumMin: '{m} min',
    stale: 'Your default is over 30 days old. Refresh it?',
    refresh: 'Refresh',
    keep: 'Keep it',
    // SPEC-PRACTICE-SESSION §2: the card before Start
    practiceToday: 'Practice today',
    length: 'Length today',
    otherLen: 'Another length',
    focus: 'Focus',
    myPlan: 'My plan',
    focusName: { instrument: 'Technique', pitch: 'Ear', time: 'Rhythm', reading: 'Reading', voice: 'Voice' } as Partial<Record<DomainId, string>>,
    split: 'Today’s split',
    startN: 'Start · {m} min',
    editLink: 'Edit',
    // §12: the course's other shares, and the sheets for a key, an exercise or a family
    modeName: { improv: 'Improvise', repertoire: 'Repertoire', grooves: 'Grooves', licks: 'Licks' } as Record<FocusMode, string>,
    pick: { key: 'Key…', exercise: 'Exercise…', family: 'Family…' },
    sheet: { key: 'Practise one key', exercise: 'One exercise through the keys', family: 'One family' },
    close: 'Close',
    group: { major: 'major', minor: 'minor' },
    state: { new: 'New', working: 'Working', closed: 'Closed', due: 'Due' } as Record<CellState, string>,
    sheetEmpty: 'Nothing open here yet',
    minorRow: 'Minor',
  },
  he: {
    title: 'האימון של היום',
    start: 'להתחיל',
    cont: 'להמשיך',
    left: 'נשארו {m} דק׳',
    edit: 'עריכה',
    edited: 'נערך להיום',
    reset: 'חזרה להצעה',
    min: 'דק׳',
    total: 'סה״כ',
    next: 'הבא',
    unit: '≈ {c} מתוך {o} שלבים של יחידה {n}',
    unitDone: 'יחידה {n} הושלמה — הבאה מוכנה',
    waits: 'יחידה {n} תחכה ל{list}',
    pathSteps: '{n} שלבי מסלול',
    free: 'תרגול חופשי',
    add: 'הוספה',
    suggested: 'מוצעים לכם',
    search: 'חיפוש נושאים…',
    saveDefault: 'לשמור כברירת המחדל שלי',
    everyDay: 'כל יום',
    thisDay: 'היום בשבוע הזה',
    saved: 'נשמר כברירת המחדל שלכם',
    undo: 'ביטול',
    removed: 'הוסר',
    lock: 'לנעול את הדקות',
    unlock: 'לשחרר',
    swap: 'משהו אחר כאן',
    remove: 'להסיר',
    cantFit: 'זה לא נכנס — שחררו קודם בלוק נעול',
    done: 'סיום',
    presets: { suggested: 'מוצע', ear: 'דגש על שמיעה', rhythm: 'דגש על קצב', reading: 'דגש על קריאה', voice: 'דגש על קול', instrument: 'דגש על הכלי', quick5: 'חמש דקות מהירות', mistakes: 'לתקן טעויות', 'four-slot': 'אימון בארבעה חלקים' } as Record<Preset, string>,
    ctx: { nomic: 'בלי מיקרופון', quiet: 'מקום שקט', noinst: 'בלי כלי' },
    kinds: { path: 'חדש', warmup: 'חזרה', vocal: 'חימום קולי', practice: 'הכלי שלי', mistakes: 'לתקן טעויות', strengthen: 'חיזוק', keys: 'טכניקה', teacher: 'מהמורה', rubato: 'חימום', key: 'סולם', rung: 'תרגיל אחד', item: 'פריט אחד', family: 'משפחה' } as Record<string, string>,
    improv: { improv: 'אימפרוביזציה', repertoire: 'רפרטואר', grooves: 'גרובים, מעברים וחילופים' } as Record<string, string>,
    blockSub: { path: 'הצעדים הבאים במסלול', warmup: 'חזרה מרווחת', strengthen: 'צעדים שנפתחו, הסולמות החלשים קודם', keys: 'חצי בסולם השבוע, השאר מהחלש', teacher: 'המשימות מהכיתה', improv: 'בסולם השבוע', rubato: 'לאט ובזמן חופשי: הפתיחה של הפריט המרכזי של היום', key: 'כל התרגילים הפתוחים בסולם', rung: 'בכל 12 הסולמות, החלש קודם', item: 'במעלה סולם הטמפו, ואחר כך בסולמות האחרים', family: 'השלבים של המשפחה ברמה שלכם' } as Record<string, string>,
    slipped: 'פריטים סגורים שהחליקו השבוע',
    practiceHint: 'נגנו על הכלי שלכם. המטרונום עוזר; כתבו על מה עבדתם.',
    metronome: 'מטרונום',
    note: 'על מה עבדתם?',
    blockDone: 'הבלוק הושלם',
    go: 'קדימה',
    finished: 'האימון הושלם!',
    plusQ: 'להמשיך? עוד 5 דקות',
    plusSub: 'עוד בלוק אחד: {b}.',
    plusYes: '5 דק׳ נוספות',
    plusNo: 'לסיים',
    howWas: 'איך היה?',
    fb: { easy: 'קל מדי', right: 'בדיוק', hard: 'קשה מדי', long: 'ארוך מדי' },
    end: 'לסיים את האימון',
    skipBlock: 'לדלג על הבלוק',
    home: 'בית',
    blockOver: '{b} הושלם',
    nextIn: 'הבא: {b} בעוד {s}',
    nextPaused: 'הבא: {b} · בהשהיה',
    nextNow: 'הבא עכשיו',
    more: '+2 דק׳',
    runLeft: 'נשארו {m} דק׳ באימון',
    sumLine: '{m} דק׳ · {n} פריטים · {r} נכונים',
    sumMin: '{m} דק׳',
    stale: 'ברירת המחדל שלכם בת יותר מ־30 יום. לרענן אותה?',
    refresh: 'לרענן',
    keep: 'להשאיר',
    practiceToday: 'האימון של היום',
    length: 'אורך היום',
    otherLen: 'אורך אחר',
    focus: 'מיקוד',
    myPlan: 'התוכנית שלי',
    focusName: { instrument: 'טכניקה', pitch: 'שמיעה', time: 'קצב', reading: 'קריאה', voice: 'קול' } as Partial<Record<DomainId, string>>,
    split: 'החלוקה של היום',
    startN: 'להתחיל · {m} דק׳',
    editLink: 'עריכה',
    modeName: { improv: 'אימפרוביזציה', repertoire: 'רפרטואר', grooves: 'גרובים', licks: 'ליקים' } as Record<FocusMode, string>,
    pick: { key: 'סולם…', exercise: 'תרגיל…', family: 'משפחה…' },
    sheet: { key: 'אימון בסולם אחד', exercise: 'תרגיל אחד בכל הסולמות', family: 'משפחה אחת' },
    close: 'סגירה',
    group: { major: 'מז׳ור', minor: 'מינור' },
    state: { new: 'חדש', working: 'בעבודה', closed: 'סגור', due: 'לחזרה' } as Record<CellState, string>,
    sheetEmpty: 'עוד אין כאן תרגילים פתוחים',
    minorRow: 'מינור',
  },
};
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export function blockLabel(t: Strings, b: BlockTarget, lang: Lang, id?: string): string {
  const tx = W[lang];
  // The four-slot session's Tunes and Recordings blocks (practiceMethod.ts) are named by their block id.
  const slot = slotLabelOf(id);
  if (slot) return slot[lang];
  switch (b.kind) {
    case 'area':
      return t.domainNames[b.area];
    case 'skill':
      return t.skillNames[b.skill] ?? b.skill;
    case 'topic':
      return TOPIC_GEN[b.topic]?.title[lang] ?? b.topic;
    case 'game':
      if (b.game === 'licks') return lang === 'he' ? 'חזרה על ליקים' : 'Lick review';
      if (b.game === 'pieces' || b.game === 'rep-review') return lang === 'he' ? 'חזרה על יצירה' : 'Piece review';
      if (b.game === 'encore') return lang === 'he' ? 'ליקים · המשפטים שלי' : 'Licks · my phrases';
      if (b.game === 'transcribe') return lang === 'he' ? 'תמלול' : 'Transcribe';
      return GAMES2.find((g) => g.id === b.game)?.[lang][0] ?? b.game;
    case 'improv':
      return b.root !== undefined ? `${tx.improv[b.mode ?? 'improv']} · ${keyName(b.root, b.group === 'minor')} ${tx.group[b.group ?? 'major']}` : tx.improv[b.mode ?? 'improv'];
    case 'key':
      return `${keyName(b.root, b.group === 'minor')} ${tx.group[b.group]}`;
    case 'family':
      return familyById(b.family as FamilyId)?.title[lang] ?? tx.kinds.family;
    default:
      return tx.kinds[b.kind] ?? b.kind;
  }
}
const hueOf = (b: BlockTarget) => (b.kind === 'area' ? DOMAIN_HUE[b.area] : b.kind === 'path' ? 'var(--mint)' : b.kind === 'strengthen' || b.kind === 'keys' || b.kind === 'key' || b.kind === 'rung' || b.kind === 'item' || b.kind === 'family' ? 'var(--hue-instrument)' : b.kind === 'rubato' ? 'var(--gold)' : b.kind === 'improv' ? 'var(--hue-creative)' : b.kind === 'teacher' ? 'var(--purple)' : b.kind === 'warmup' || b.kind === 'mistakes' ? 'var(--gold)' : b.kind === 'game' ? 'var(--hue-creative)' : b.kind === 'vocal' ? 'var(--hue-voice)' : b.kind === 'practice' ? 'var(--hue-instrument)' : 'var(--hue-pitch)');

/** The stacked bar of blocks. */
function BlockBar({ blocks, run }: { blocks: Block[]; run?: WorkoutRun | null }) {
  const T = total(blocks) || 1;
  return (
    <div className="wk-bar" aria-hidden="true">
      {blocks.map((b, i) => {
        const usedPct = run ? Math.min(1, (run.used[b.id] ?? 0) / (b.minutes * 60000)) : 0;
        return (
          <span key={b.id} className={`wk-seg ${run && i < run.at ? 'past' : ''}`} style={{ flexGrow: b.minutes / T, ['--hue' as string]: hueOf(b.target), ['--used' as string]: `${usedPct * 100}%` }}>
            <i />
          </span>
        );
      })}
    </div>
  );
}

/** "Why today" (SPEC-PATH-TODAY-PRACTICE §2): a small chip on a block — new from the path, from your teacher, … */
export function WhyChip({ target, lang }: { target: BlockTarget; lang: Lang }) {
  const w = whyOf(target);
  if (!w) return null;
  return (
    <span className={`wk-why why-${w}`} data-why={w}>
      {WHY_WORD[w][lang]}
    </span>
  );
}
/** A block's second line: what the caller knows about it (the key of the week, the teacher …), else the kind's line. */
const subOf = (tx: (typeof W)['en'], b: BlockTarget, leadsTo?: string | null, subs?: Partial<Record<string, string>>): string | undefined =>
  b.kind === 'strengthen' && leadsTo ? leadsTo : b.kind === 'rubato' && b.items?.length ? tx.slipped : b.kind === 'improv' && b.root !== undefined ? undefined : (subs?.[b.kind] ?? tx.blockSub[b.kind]);

/** W10: where you are today (no mic / quiet place / no instrument) — kept for the day; on Today and in the editor. */
export type WorkoutCtx = { nomic: boolean; quiet: boolean; noinst: boolean };
export function WorkoutCtxChips({ ctx, onCtx, lang }: { ctx: WorkoutCtx; onCtx: (c: WorkoutCtx) => void; lang: Lang }) {
  const tx = W[lang];
  return (
    <div className="wk-ctx" role="group" aria-label={lang === 'he' ? 'איפה אתם היום' : 'Where you are today'} data-wk-ctx="1">
      {(['nomic', 'quiet', 'noinst'] as const).map((k) => (
        <button key={k} type="button" className={`chip small ${ctx[k] ? 'on' : ''}`} aria-pressed={ctx[k]} onClick={() => onCtx({ ...ctx, [k]: !ctx[k] })} data-wk-ctx-k={k}>
          <Icon k={k === 'nomic' ? 'mute' : k === 'quiet' ? 'phones' : 'pads'} size={16} />
          {tx.ctx[k]}
        </button>
      ))}
    </div>
  );
}
/** W6: a default over 30 days old asks once whether to keep it or refresh it (on Today and in the editor). */
export function TemplateStaleAsk({ templateAt, today, onTemplate, lang }: { templateAt?: string | null; today?: string; onTemplate?: (keep: boolean) => void; lang: Lang }) {
  const tx = W[lang];
  if (!templateAt || !today || !onTemplate || !templateStale(templateAt, today)) return null;
  return (
    <div className="wk-stale" role="group" data-template-stale="1">
      <small dir="auto">{tx.stale}</small>
      <button type="button" className="btn small ghost" onClick={() => onTemplate(false)} data-stale="refresh">
        {tx.refresh}
      </button>
      <button type="button" className="btn small ghost" onClick={() => onTemplate(true)} data-stale="keep">
        {tx.keep}
      </button>
    </div>
  );
}

/**
 * Today's workout (W1): the hero of Today, with today's context switches (no mic / quiet / no instrument) and the W6
 * question about an old default (both also in the editor).
 */
export function WorkoutCard({ t, lang, blocks, run, nextLine, edited, onStart, onEdit, onReset, leadsTo, subs, ctx, onCtx, templateAt, today, onTemplate, focus, focusAreas, onFocus, onLength, reason, focusModes, loadSheet, focusLabel }: {
  /** SPEC-PRACTICE-SESSION §2: today's focus in the active course ('plan', one of its areas, or a §12 target). */
  focus?: string;
  /** The active course's areas the focus picker offers. */
  focusAreas?: DomainId[];
  onFocus?: (f: string) => void;
  /** §3.2: the one reason line for the biggest need-based move (my plan only). */
  reason?: { en: string; he: string } | null;
  /** §12: the course's other shares as a focus (Improvise / Repertoire / Grooves, Licks). */
  focusModes?: FocusMode[];
  /** §12: the sheets — a key or an exercise (piano, guitar, bass), a family (drums); null when unavailable. */
  loadSheet?: (which: SheetWhich) => SheetData | null;
  /** The name of today's target focus (a key, an exercise, an item, a family). */
  focusLabel?: string | null;
  /** A length chip or the stepper: re-split today and remember it as the daily length. */
  onLength?: (minutes: number) => void;
  /** W10: where you are today (kept for the day). */
  ctx?: WorkoutCtx;
  onCtx?: (c: WorkoutCtx) => void;
  /** W6: when the default in use was saved; with `today`, older than 30 days asks to refresh it. */
  templateAt?: string | null;
  today?: string;
  onTemplate?: (keep: boolean) => void;
  /** SPEC-PATH-ROLE §8: what the strengthen block leads to. */
  leadsTo?: string | null;
  /** A block kind's own second line today ("Key of the week: E♭ · 6 exercises"). */
  subs?: Partial<Record<string, string>>;
  t: Strings; lang: Lang; blocks: Block[]; run: WorkoutRun | null; view?: PathView; nextLine: string | null; edited: boolean; onStart: () => void; onEdit: () => void; onReset: () => void }) {
  const active = (run && !run.finished && run.at > 0) || (run && Object.keys(run.used).length > 0 && !run.finished);
  const leftMin = run && !run.finished ? Math.ceil(runLeftMs(run) / 60000) : total(blocks);
  const at = run && !run.finished ? run.at : -1;
  const extra = (
    <>
      {ctx && onCtx && !run?.finished && <WorkoutCtxChips ctx={ctx} onCtx={onCtx} lang={lang} />}
      <TemplateStaleAsk templateAt={templateAt} today={today} onTemplate={onTemplate} lang={lang} />
    </>
  );
  // Before Start (§2): length, focus, the split and Start. Running or done: the card as it was.
  if (!active && !run?.finished && onLength && onFocus) return <PlanCard {...{ t, lang, blocks, nextLine, edited, onStart, onEdit, onReset, leadsTo, subs, extra, onLength, onFocus, reason, loadSheet, focusLabel }} focus={focus ?? 'plan'} focusAreas={focusAreas ?? []} focusModes={focusModes ?? []} />;
  return <StudioWorkoutCard {...{ t, lang, blocks, run, nextLine, edited, onStart, onEdit, onReset, leadsTo, subs, active: !!active, leftMin, at, extra }} />;
}

const LENGTHS = [10, 20, 30, 45, 60, 90];

/**
 * SPEC-PRACTICE-SESSION §2: the card before Start — one row of length chips (… opens a 5–180 stepper), the focus
 * (my plan or one of the active course's areas), the split as one bar with minutes (a block's "why today" on tap),
 * Start · N min and Edit ›.
 */
/** §12: which sheet the focus row opens. */
export type SheetWhich = 'key' | 'exercise' | 'family';
/** §12: what a sheet lists — the matrix's keys and exercises (piano, guitar, bass) or the drums' families. */
export type SheetData = { kind: 'matrix'; data: FocusSheet } | { kind: 'families'; families: { id: string; title: { en: string; he: string }; state: CellState }[] };

/** The sheet a target focus belongs to (its pill shows the target's name). */
const sheetOfFocus = (focus: string): SheetWhich | null => {
  const f = parseFocus(focus);
  return !f ? null : f.kind === 'key' ? 'key' : f.kind === 'rung' || f.kind === 'item' ? 'exercise' : f.kind === 'family' ? 'family' : null;
};

function PlanCard({ t, lang, blocks, nextLine, edited, onStart, onEdit, onReset, leadsTo, subs, extra, focus, focusAreas, onFocus, onLength, reason, focusModes, loadSheet, focusLabel }: { t: Strings; lang: Lang; blocks: Block[]; nextLine: string | null; edited: boolean; onStart: () => void; onEdit: () => void; onReset: () => void; leadsTo?: string | null; subs?: Partial<Record<string, string>>; extra?: React.ReactNode; focus: string; focusAreas: DomainId[]; onFocus: (f: string) => void; onLength: (m: number) => void; reason?: { en: string; he: string } | null; focusModes: FocusMode[]; loadSheet?: (which: SheetWhich) => SheetData | null; focusLabel?: string | null }) {
  const tx = W[lang];
  const T = total(blocks);
  const custom = !LENGTHS.includes(T);
  const [stepper, setStepper] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ which: SheetWhich; data: SheetData } | null>(null);
  const curSheet = sheetOfFocus(focus);
  // the sheets this course has: a key and an exercise on the piano, the guitar and the bass; a family on the drums
  const [sheets] = useState<SheetWhich[]>(() => (loadSheet ? (focusModes.includes('grooves') ? ['family'] : ['key', 'exercise']) : []));
  const openSheet = (which: SheetWhich) => {
    const data = loadSheet?.(which);
    if (data) setSheet({ which, data });
  };
  const pick = (f: string) => {
    setSheet(null);
    setSel(null);
    onFocus(f);
  };
  const selB = blocks.find((b) => b.id === sel) ?? null;
  const selSub = selB ? subOf(tx, selB.target, leadsTo, subs) : undefined;
  const T1 = T || 1;
  return (
    <section className="wk-card wk-hero st-plan wk-plan2" aria-label={tx.practiceToday} data-plan-card="1">
      <div className="st-plan-h">
        <span className="st-eyebrow">{tx.practiceToday}</span>
      </div>
      {/* what Start opens (one decision with the start itself: 0.68.1) */}
      {nextLine && (
        <h2 className="wk-title wk-plan-next">
          <Iso text={nextLine} />
        </h2>
      )}
      <div className="wk-len" role="radiogroup" aria-label={tx.length} data-wk-len={T}>
        {LENGTHS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={T === n} className={`wk-pill ${T === n ? 'on' : ''}`} onClick={() => (setStepper(false), onLength(n))} data-len={n} dir="ltr">
            {n}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={custom} aria-expanded={stepper} aria-label={tx.otherLen} className={`wk-pill ${custom ? 'on' : ''}`} onClick={() => setStepper((x) => !x)} data-len="more" dir="ltr">
          {custom ? T : '…'}
        </button>
        <span className="wk-len-unit">{tx.min}</span>
      </div>
      {stepper && (
        <div className="wk-len-step" data-len-stepper="1" dir="ltr">
          <button type="button" className="icon-btn" onClick={() => onLength(T - 5)} disabled={T <= LIMITS.minTotal} aria-label="−5">
            <Icon k="minus" size={16} />
          </button>
          <b dir="auto">
            {T} {tx.min}
          </b>
          <button type="button" className="icon-btn" onClick={() => onLength(T + 5)} disabled={T >= LIMITS.maxTotal} aria-label="+5">
            <Icon k="plus" size={16} />
          </button>
        </div>
      )}
      {focusAreas.length + focusModes.length + sheets.length > 0 && (
        <div className="wk-focus" role="radiogroup" aria-label={tx.focus} data-wk-focus={focus}>
          {(['plan', ...focusAreas] as ('plan' | DomainId)[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={focus === f} className={`wk-pill ${focus === f ? 'on' : ''}`} onClick={() => pick(f)} data-focus={f}>
              {f === 'plan' ? tx.myPlan : (tx.focusName[f] ?? t.domainNames[f])}
            </button>
          ))}
          {focusModes.map((m) => {
            const id = focusIdOf({ kind: 'mode', mode: m });
            return (
              <button key={id} type="button" role="radio" aria-checked={focus === id} className={`wk-pill ${focus === id ? 'on' : ''}`} onClick={() => pick(id)} data-focus={id}>
                {tx.modeName[m]}
              </button>
            );
          })}
          {sheets.map((w) => (
            <button key={w} type="button" role="radio" aria-checked={curSheet === w} aria-haspopup="dialog" className={`wk-pill wk-pill-sheet ${curSheet === w ? 'on' : ''}`} onClick={() => openSheet(w)} data-focus-sheet={w}>
              <span>{curSheet === w && focusLabel ? focusLabel : tx.pick[w]}</span>
            </button>
          ))}
        </div>
      )}
      {sheet && <FocusSheetPanel t={t} lang={lang} which={sheet.which} data={sheet.data} focus={focus} onPick={pick} onClose={() => setSheet(null)} />}
      <div className="wk-split" role="group" aria-label={tx.split}>
        <div className="wk-split-bar">
          {blocks.map((b) => (
            <button key={b.id} type="button" className={`wk-split-seg ${sel === b.id ? 'on' : ''}`} style={{ flexGrow: b.minutes / T1, ['--hue' as string]: hueOf(b.target) }} onClick={() => setSel(sel === b.id ? null : b.id)} aria-pressed={sel === b.id} aria-label={`${blockLabel(t, b.target, lang, b.id)} · ${b.minutes} ${tx.min}`} data-seg={b.target.kind} data-min={b.minutes} />
          ))}
        </div>
        <p className="wk-split-legend" dir="auto">
          {blocks.map((b) => (
            <button key={b.id} type="button" className={`wk-split-item ${sel === b.id ? 'on' : ''}`} style={{ ['--hue' as string]: hueOf(b.target) }} onClick={() => setSel(sel === b.id ? null : b.id)} aria-pressed={sel === b.id}>
              <i aria-hidden="true" />
              {blockLabel(t, b.target, lang, b.id)} <bdi dir="ltr">{b.minutes}</bdi>
            </button>
          ))}
        </p>
        {selB && (
          <p className="wk-split-why" dir="auto" data-why-of={selB.id}>
            <WhyChip target={selB.target} lang={lang} />
            <span>{selSub ?? blockLabel(t, selB.target, lang, selB.id)}</span>
          </p>
        )}
        {!selB && reason && focus === 'plan' && (
          <p className="wk-reason" dir="auto" data-wk-reason="1">
            {reason[lang]}
          </p>
        )}
      </div>
      {extra}
      <button className="btn mega wk-start st-cta" data-continue="1" onClick={onStart}>
        <Icon k="play" size={18} />
        <span>{fill(tx.startN, { m: T })}</span>
      </button>
      <div className="wk-plan-foot">
        {edited && (
          <button className="link wk-edited st-tlink" onClick={onReset}>
            {tx.edited} · {tx.reset}
          </button>
        )}
        <button className="link st-tlink wk-edit-link" onClick={onEdit} data-wk-edit="1">
          {tx.editLink} <Icon k="next" size={12} className="flip-rtl" />
        </button>
      </div>
    </section>
  );
}

/**
 * §12: the compact sheet behind "Key…", "Exercise…" (piano, guitar, bass) and "Family…" (drums). Keys: the 12 keys of
 * each row group the matrix has open; exercises: the rungs by role, as on the key page; each marked new / working /
 * closed / due. A tap sets today's focus.
 */
function FocusSheetPanel({ lang, which, data, focus, onPick, onClose }: { t: Strings; lang: Lang; which: SheetWhich; data: SheetData; focus: string; onPick: (f: string) => void; onClose: () => void }) {
  const tx = W[lang];
  const closeRef = useRef<HTMLButtonElement>(null);
  const cur = parseFocus(focus);
  const groups = data.kind === 'matrix' ? data.data.groups : [];
  const [group, setGroup] = useState<'major' | 'minor'>(() => (cur?.kind === 'key' && groups.includes(cur.group) ? cur.group : groups[0] ?? 'major'));
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = (s: CellState) => (
    <small className={`wk-sh-st st-${s}`} data-state={s}>
      {tx.state[s]}
    </small>
  );
  let body: React.ReactNode = null;
  if (data.kind === 'families') {
    body = data.families.length ? (
      <ul className="wk-sh-list">
        {data.families.map((f) => {
          const id = focusIdOf({ kind: 'family', family: f.id });
          return (
            <li key={f.id}>
              <button type="button" className={`wk-sh-row ${focus === id ? 'on' : ''}`} aria-pressed={focus === id} onClick={() => onPick(id)} data-sheet-family={f.id}>
                <span dir="auto">{f.title[lang]}</span>
                {mark(f.state)}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;
  } else if (which === 'key') {
    const keys = data.data.keys.filter((k) => k.group === group);
    body = (
      <>
        {groups.length > 1 && (
          <div className="wk-sh-groups" role="radiogroup" aria-label={tx.sheet.key}>
            {groups.map((g) => (
              <button key={g} type="button" role="radio" aria-checked={group === g} className={`wk-pill ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)} data-sheet-group={g}>
                {tx.group[g]}
              </button>
            ))}
          </div>
        )}
        {keys.length > 0 && (
          <div className="wk-sh-keys">
            {keys.map((k) => {
              const id = focusIdOf({ kind: 'key', root: k.root, group: k.group });
              return (
                <button key={id} type="button" className={`wk-sh-key ${focus === id ? 'on' : ''}`} aria-pressed={focus === id} aria-label={`${keyName(k.root, k.group === 'minor')} ${tx.group[k.group]} · ${tx.state[k.state]}`} onClick={() => onPick(id)} data-sheet-key={k.root}>
                  <b dir="ltr">{keyName(k.root, k.group === 'minor')}</b>
                  {mark(k.state)}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
    if (!keys.length) body = null;
  } else {
    // the exercises by role, as on the key page (the minor rows' after the major ones)
    const rows: { head: string; rungs: FocusSheet['rungs'] }[] = [];
    for (const r of data.data.rungs) {
      const head = `${r.group === 'minor' ? `${tx.minorRow} · ` : ''}${ROLE_NAME[r.role][lang]}`;
      const last = rows[rows.length - 1];
      if (last?.head === head) last.rungs.push(r);
      else rows.push({ head, rungs: [r] });
    }
    const curRung = cur?.kind === 'rung' ? focusIdOf(cur) : null;
    body = rows.length ? (
      <div className="wk-sh-rows">
        {rows.map((row) => (
          <section key={row.head} className="wk-sh-role">
            <h4 dir="auto">{row.head}</h4>
            <ul className="wk-sh-list">
              {row.rungs.map((r) => {
                const id = focusIdOf({ kind: 'rung', rung: r.rung, group: r.group });
                return (
                  <li key={id}>
                    <button type="button" className={`wk-sh-row ${curRung === id ? 'on' : ''}`} aria-pressed={curRung === id} onClick={() => onPick(id)} data-sheet-rung={r.rung}>
                      <span dir="auto">{r.title[lang]}</span>
                      {mark(r.state)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    ) : null;
  }
  return (
    <div className="wk-sh-back" onClick={(e) => e.target === e.currentTarget && onClose()} data-focus-sheet-open={which}>
      <section className="wk-sh" role="dialog" aria-modal="true" aria-label={tx.sheet[which]}>
        <header className="wk-sh-h">
          <h3 dir="auto">{tx.sheet[which]}</h3>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label={tx.close}>
            <Icon k="close" size={18} />
          </button>
        </header>
        {body ?? <p className="field-hint">{tx.sheetEmpty}</p>}
      </section>
    </div>
  );
}

/**
 * The Today hero (redesign 2026-11): "Today's workout", the blocks as numbered steps (done / now / next)
 * with their minutes, a thin bar of time used, and one lemon button "Continue · <step>". Toni is not on it every day.
 */
function StudioWorkoutCard({ t, lang, blocks, run, nextLine, edited, onStart, onEdit, onReset, leadsTo, subs, active, leftMin, at, extra }: { extra?: React.ReactNode; t: Strings; lang: Lang; blocks: Block[]; run: WorkoutRun | null; nextLine: string | null; edited: boolean; onStart: () => void; onEdit: () => void; onReset: () => void; leadsTo?: string | null; subs?: Partial<Record<string, string>>; active: boolean; leftMin: number; at: number }) {
  const tx = W[lang];
  const sx = studioText(lang);
  const T = total(blocks);
  const finished = !!run?.finished;
  const cur = finished ? -1 : Math.max(0, at);
  const usedPct = finished ? 100 : T ? Math.round((100 * Math.max(0, T - leftMin)) / T) : 0;
  const curLabel = cur >= 0 && blocks[cur] ? blockLabel(t, blocks[cur].target, lang, blocks[cur].id) : '';
  return (
    <section className="wk-card wk-hero st-plan" aria-label={tx.title}>
      <div className="st-plan-h">
        <span className="st-eyebrow">{sx.todayWorkout}</span>
        <span className="st-chip" dir="auto">
          <Icon k="clock" size={14} />
          {active ? fill(tx.left, { m: leftMin }) : `${T} ${sx.min}`}
        </span>
        <button className="icon-btn wk-edit st-edit" onClick={onEdit} aria-label={tx.edit}>
          <Icon k="edit" size={18} />
        </button>
      </div>
      <h2 className="wk-title">
        <Iso text={nextLine ?? tx.title} />
      </h2>
      <ol className="st-steps">
        {blocks.map((b, i) => {
          const state = finished || i < cur ? 'done' : i === cur ? 'cur' : '';
          const sub = subOf(tx, b.target, leadsTo, subs);
          return (
            <li key={b.id} className={state} data-step-state={state || 'next'} data-block-kind={b.target.kind}>
              <span className="st-sn" aria-hidden="true">
                {state === 'done' ? <Icon k="check" size={14} /> : i + 1}
              </span>
              <span className="st-st">
                <span className="st-st-h">
                  <b dir="auto">{blockLabel(t, b.target, lang, b.id)}</b>
                  <WhyChip target={b.target} lang={lang} />
                </span>
                {sub && (
                  <small dir="auto" data-leads-to={b.target.kind === 'strengthen' && leadsTo ? '1' : undefined}>
                    {sub}
                  </small>
                )}
              </span>
              <span className="st-min" dir="ltr">
                {sfill(sx.minShort, { m: b.minutes })}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPct} aria-label={tx.title}>
        <i style={{ width: `${usedPct}%` }} />
      </div>
      {extra}
      <button className="btn mega wk-start st-cta" data-continue="1" onClick={onStart}>
        <Icon k="play" size={18} />
        <span>{curLabel ? `${active ? sx.cont : sx.start} · ${curLabel}` : active ? sx.cont : sx.start}</span>
      </button>
      {edited && (
        <button className="link wk-edited st-tlink" onClick={onReset}>
          {tx.edited} · {tx.reset}
        </button>
      )}
    </section>
  );
}

/** An area preset belongs to the courses that practice that area (no "voice focus" in the guitar course). */
const PRESET_AREA: Partial<Record<Preset, DomainId>> = { ear: 'pitch', rhythm: 'time', reading: 'reading', voice: 'voice', instrument: 'instrument', 'four-slot': 'instrument' };

/** The editor (W17): sticky total, per block − / + · ✕ · drag; ⋯ for lock and swap; Add; presets; save as default. */
export function WorkoutEditor({
  t,
  lang,
  blocks: initial,
  suggested,
  view,
  settings,
  onSave,
  onSaveDefault,
  onClose,
  addOptions,
  ctx,
  onCtx,
  leadsTo,
  subs,
  templateAt,
  today,
  onTemplate,
}: {
  /** W6: when the default in use was saved (null: no default); with `today`, older than 30 days asks to refresh it. */
  templateAt?: string | null;
  today?: string;
  /** W6's answer: keep the default (true) or refresh it (false: back to the suggestion). */
  onTemplate?: (keep: boolean) => void;
  /** SPEC-PATH-ROLE §8: what the strengthen block leads to ("2 more steps and unit C is mastered"). */
  leadsTo?: string | null;
  /** A block kind's own second line today (the key of the week, the teacher …). */
  subs?: Partial<Record<string, string>>;
  t: Strings;
  lang: Lang;
  blocks: Block[];
  suggested: Block[];
  view: PathView;
  settings: Settings;
  onSave: (bs: Block[]) => void;
  onSaveDefault: (bs: Block[], scope: 'all' | 'weekday') => void;
  onClose: () => void;
  addOptions: { suggested: BlockTarget[]; topics: string[]; games: string[] };
  /** Where you are today (moved here from the card, 0.41): no mic / quiet place / no instrument. */
  ctx?: { nomic: boolean; quiet: boolean; noinst: boolean };
  onCtx?: (c: { nomic: boolean; quiet: boolean; noinst: boolean }) => void;
}) {
  const tx = W[lang];
  const activeCourse = useCourse().active;
  const courseAreas = COURSE_AREAS[activeCourse];
  const instrumentCourse = activeCourse === 'keys' || activeCourse === 'guitar' || activeCourse === 'bass' || activeCourse === 'drums';
  const [bs, setBs] = useState<Block[]>(initial);
  const [undo, setUndo] = useState<{ prev: Block[]; text: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  void settings;
  // Edits are saved silently for today (W18).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onSave(bs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bs]);
  useEffect(() => {
    if (!undo) return;
    const id = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(id);
  }, [undo]);
  const change = (next: Block[], undoText?: string) => {
    if (undoText) setUndo({ prev: bs, text: undoText });
    setBs(next);
  };
  const T = total(bs);
  const setTotal = (n: number) => {
    if (!canRescale(bs, n)) return setMsg(tx.cantFit);
    setMsg(null);
    change(rescale(bs, n));
  };
  const cov = coverage(bs, view);
  const waitList = [...cov.waiting.entries()].map(([a, n]) => `${n} ${t.domainNames[a as DomainId]}`).join(', ');
  const filteredTopics = useMemo(() => addOptions.topics.filter((id) => !q || (TOPIC_GEN[id]?.title[lang] ?? id).toLowerCase().includes(q.toLowerCase())).slice(0, 30), [q, addOptions.topics, lang]);

  // Sectioned (length · where you are · blocks · presets) with the total and Done in a bottom bar.
  const sx = studioText(lang);
  const ctxEl = ctx && onCtx && <WorkoutCtxChips ctx={ctx} onCtx={onCtx} lang={lang} />;

  return (
    <main className="wk-editor st-editor">
      <header className="wk-ed-head">
        <button className="icon-btn" onClick={onClose} aria-label={tx.done}>
          <Icon k="back" />
        </button>
        <h1>{tx.title}</h1>
      </header>
      <TemplateStaleAsk templateAt={templateAt} today={today} onTemplate={onTemplate} lang={lang} />
      <h2 className="st-sec-h">{sx.duration}</h2>
      <section className="wk-total-bar" aria-label={tx.total}>
        <div className="wk-chips" role="group">
          {[5, 10, 15, 20, 30, 45, 60, 90, 120, 180].map((n) => (
            <button key={n} className={`chip ${T === n ? 'on' : ''}`} onClick={() => setTotal(n)} dir="ltr">
              {n}′
            </button>
          ))}
        </div>
        <div className="wk-stepper" dir="ltr">
          <button className="icon-btn" onClick={() => setTotal(T - 5)} aria-label="−5">
            <Icon k="minus" />
          </button>
          <b dir="ltr">
            {T} {tx.min}
          </b>
          <button className="icon-btn" onClick={() => setTotal(T + 5)} aria-label="+5">
            <Icon k="plus" />
          </button>
        </div>
        {msg && <p className="field-hint" role="status">{msg}</p>}
      </section>
      {ctxEl && (
        <>
          <h2 className="st-sec-h">{sx.conditions}</h2>
          {ctxEl}
        </>
      )}
      <h2 className="st-sec-h">{sx.blocks}</h2>

      <ol className="wk-blocks">
        {bs.map((b) => {
          const path = b.target.kind === 'area' ? view.units.find((u) => u.status === 'current')?.steps.filter((x) => x.step.domain === (b.target as { area: DomainId }).area && x.step.kind !== 'check' && (x.state === 'open' || x.state === 'current')).length ?? 0 : null;
          return (
            <li
              key={b.id}
              className={`wk-block ${dragId === b.id ? 'dragging' : ''} ${b.locked ? 'locked' : ''}`}
              style={{ ['--hue' as string]: hueOf(b.target) }}
              data-block={b.target.kind}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId && dragId !== b.id) change(moveTo(bs, dragId, bs.findIndex((x) => x.id === b.id)));
              }}
            >
              <span className="wk-drag" draggable onDragStart={() => setDragId(b.id)} onDragEnd={() => setDragId(null)} aria-hidden="true">
                ⋮⋮
              </span>
              <span className="wk-name">
                <b>{blockLabel(t, b.target, lang, b.id)}</b>
                <span className="wk-why-row">
                  <WhyChip target={b.target} lang={lang} />
                </span>
                {path !== null && <small dir="auto">{path > 0 ? fill(tx.pathSteps, { n: path }) : tx.free}</small>}
                {path === null && subOf(tx, b.target, leadsTo, subs) && (
                  <small dir="auto" data-leads-to={b.target.kind === 'strengthen' && leadsTo ? '1' : undefined}>
                    {subOf(tx, b.target, leadsTo, subs)}
                  </small>
                )}
              </span>
              <span className="wk-min" dir="ltr">
                <button className="icon-btn" aria-label="−1" disabled={b.minutes <= LIMITS.minBlock} onClick={() => change(setMinutes(bs, b.id, b.minutes - 1))}>
                  <Icon k="minus" />
                </button>
                <b dir="ltr">{b.minutes}′</b>
                <button className="icon-btn" aria-label="+1" disabled={b.minutes >= LIMITS.maxBlock} onClick={() => change(setMinutes(bs, b.id, b.minutes + 1))}>
                  <Icon k="plus" />
                </button>
              </span>
              <button className="icon-btn wk-more" aria-label={lang === 'he' ? 'עוד' : 'More'} onClick={() => setMenu(menu === b.id ? null : b.id)}>
                <Icon k="more" />
              </button>
              {menu === b.id && (
                <div className="wk-menu" role="menu">
                  <button role="menuitem" className="btn small ghost" onClick={() => (change(moveTo(bs, b.id, bs.findIndex((x) => x.id === b.id) - 1)), setMenu(null))}>
                    ↑ {lang === 'he' ? 'למעלה' : 'Move up'}
                  </button>
                  <button role="menuitem" className="btn small ghost" onClick={() => (change(moveTo(bs, b.id, bs.findIndex((x) => x.id === b.id) + 1)), setMenu(null))}>
                    ↓ {lang === 'he' ? 'למטה' : 'Move down'}
                  </button>
                  <button role="menuitem" className="btn small ghost wk-x" disabled={bs.length <= 1} onClick={() => (change(remove(bs, b.id), tx.removed), setMenu(null))}>
                    <Icon k="close" /> {tx.remove}
                  </button>
                  <button role="menuitem" className="btn small ghost" onClick={() => (change(bs.map((x) => (x.id === b.id ? { ...x, locked: !x.locked } : x))), setMenu(null))}>
                    <Icon k="lock" /> {b.locked ? tx.unlock : tx.lock}
                  </button>
                  {(b.target.kind === 'area' || b.target.kind === 'topic' || b.target.kind === 'skill') && (
                    <button
                      role="menuitem"
                      className="btn small ghost"
                      onClick={() => {
                        // Swap: the next suggested target of another kind in place.
                        const alt = addOptions.suggested.find((x) => JSON.stringify(x) !== JSON.stringify(b.target) && !bs.some((y) => JSON.stringify(y.target) === JSON.stringify(x)));
                        if (alt) change(bs.map((x) => (x.id === b.id ? { ...x, target: alt } : x)));
                        setMenu(null);
                      }}
                    >
                      <Icon k="swap" /> {tx.swap}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {cov.unitN !== null && (
        <p className="wk-cov" dir="auto">
          {cov.open === 0 ? fill(tx.unitDone, { n: cov.unitN }) : fill(tx.unit, { c: cov.covered, o: cov.open, n: cov.unitN })}
          {waitList && (
            <>
              <br />
              <small>{fill(tx.waits, { n: cov.unitN, list: waitList })}</small>
            </>
          )}
        </p>
      )}

      <button className="btn wk-add" onClick={() => setAdding(true)} disabled={bs.length >= LIMITS.maxBlocks}>
        <Icon k="plus" /> {tx.add}
      </button>

      <h2 className="st-sec-h">{sx.presets}</h2>
      <div className="wk-presets" role="group">
        {(['suggested', 'ear', 'rhythm', 'reading', 'voice', 'instrument', 'four-slot', 'mistakes', 'quick5'] as Preset[]).filter((p) => !PRESET_AREA[p] || courseAreas.includes(PRESET_AREA[p]!)).map((p) => (
          <button key={p} className="chip" onClick={() => change(preset(p, T, suggested), tx.presets[p])} data-preset={p}>
            {tx.presets[p]}
          </button>
        ))}
      </div>

      <div className="wk-default">
        <button className="btn small" onClick={() => (onSaveDefault(bs, 'all'), setMsg(tx.saved))}>
          <Icon k="star" /> {tx.saveDefault} · {tx.everyDay}
        </button>
        <button className="btn small ghost" onClick={() => (onSaveDefault(bs, 'weekday'), setMsg(tx.saved))}>
          {tx.thisDay}
        </button>
      </div>

      <div className="st-dock wk-dock">
          <span className="st-dock-total">
            <small>{sx.total}</small>
            <b dir="auto">
              {T} {sx.min}
            </b>
          </span>
          <button className="btn primary st-primary" onClick={onClose}>
            {tx.done}
          </button>
        </div>

      {undo && (
        <div className="wk-undo" role="status">
          <span>{undo.text}</span>
          <button className="btn small" onClick={() => (setBs(undo.prev), setUndo(null))}>
            ↶ {tx.undo}
          </button>
        </div>
      )}

      {adding && (
        <div className="sheet-backdrop" onClick={() => setAdding(false)}>
          <div className="sheet wk-add-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{tx.add}</h2>
            <h3 className="intake-sub">{tx.suggested}</h3>
            <div className="intake-chips">
              {[...addOptions.suggested.slice(0, 6), { kind: 'path' } as BlockTarget, ...(instrumentCourse ? [{ kind: 'keys' } as BlockTarget, { kind: 'improv', mode: activeCourse === 'drums' ? 'grooves' : 'improv' } as BlockTarget] : [{ kind: 'strengthen' } as BlockTarget]), { kind: 'warmup' } as BlockTarget, { kind: 'practice' } as BlockTarget, { kind: 'mistakes' } as BlockTarget].map((x, i) => (
                <button key={i} className="chip" onClick={() => (change(add(bs, x, 3)), setAdding(false))}>
                  {blockLabel(t, x, lang)}
                </button>
              ))}
            </div>
            <div className="intake-chips">
              {DOMAINS.map((d) => (
                <button key={d.id} className="chip" style={{ ['--hue' as string]: DOMAIN_HUE[d.id] }} onClick={() => (change(add(bs, { kind: 'area', area: d.id }, 3)), setAdding(false))}>
                  {t.domainNames[d.id]}
                </button>
              ))}
              {addOptions.games.map((g) => (
                <button key={g} className="chip" onClick={() => (change(add(bs, { kind: 'game', game: g }, 3)), setAdding(false))}>
                  {blockLabel(t, { kind: 'game', game: g }, lang)}
                </button>
              ))}
            </div>
            <input className="wk-search" type="search" placeholder={tx.search} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="wk-topic-list">
              {filteredTopics.map((id) => (
                <button key={id} className="chip" onClick={() => (change(add(bs, { kind: 'topic', topic: id }, 3)), setAdding(false))}>
                  {TOPIC_GEN[id]?.title[lang] ?? id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * §5 / W20: between two blocks — the finished block's one-line summary, the time left in the workout, and the next
 * block starting on its own after a 3-second countdown (touching the screen pauses it); Next now · +2 min · End.
 */
function BetweenBlocks({ t, lang, run, onNext, onMore, onEnd }: { t: Strings; lang: Lang; run: WorkoutRun; onNext: () => void; onMore: () => void; onEnd: () => void }) {
  const tx = W[lang];
  const done = run.blocks.find((b) => b.id === run.between);
  const next = run.blocks[run.at];
  const [left, setLeft] = useState(BETWEEN_S);
  const [paused, setPaused] = useState(false);
  const fired = useRef(false);
  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      if (!fired.current) {
        fired.current = true;
        onNext();
      }
      return;
    }
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!done || !next) return null;
  const sum = blockSummary(run, done.id);
  const nextName = blockLabel(t, next.target, lang, next.id);
  return (
    <main className="wk-run wk-between" style={{ ['--hue' as string]: hueOf(next.target) }} onPointerDown={() => setPaused(true)} data-between={done.id}>
      <BlockBar blocks={run.blocks} run={run} />
      <h1>
        <Icon k="check" size={18} /> {fill(tx.blockOver, { b: blockLabel(t, done.target, lang, done.id) })}
      </h1>
      <p className="wk-sum" dir="auto" data-block-summary="1">
        {sum.items ? fill(tx.sumLine, { m: sum.minutes, n: sum.items, r: sum.right }) : fill(tx.sumMin, { m: sum.minutes })}
      </p>
      <p className="field-hint" dir="auto" data-run-left="1">
        {fill(tx.runLeft, { m: Math.ceil(runLeftMs(run) / 60000) })}
      </p>
      <p className="wk-next" dir="auto" aria-live="polite" data-countdown={paused ? 'paused' : left}>
        {paused ? fill(tx.nextPaused, { b: nextName }) : fill(tx.nextIn, { b: nextName, s: left })}
      </p>
      <button
        className="btn primary"
        onClick={() => {
          fired.current = true;
          onNext();
        }}
        data-next-now="1"
      >
        <Icon k="play" /> {tx.nextNow}
      </button>
      <div className="wk-run-actions">
        <button className="btn small ghost" onClick={onMore} data-more="1">
          {tx.more}
        </button>
        <button className="btn small ghost" onClick={onEnd}>
          {tx.end}
        </button>
      </div>
    </main>
  );
}

/** §5: "How was it?" — one tap, the chosen chip stays marked (tomorrow's session follows it: W11). */
function FeedbackChips({ lang, onFeedback }: { lang: Lang; onFeedback: (f: 'easy' | 'right' | 'hard' | 'long') => void }) {
  const tx = W[lang];
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="wk-howwas">
      <h2>{tx.howWas}</h2>
      <div className="intake-chips" role="radiogroup" aria-label={tx.howWas}>
        {(['easy', 'right', 'hard', 'long'] as const).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={picked === f} className={`chip ${picked === f ? 'on' : ''}`} onClick={() => (setPicked(f), onFeedback(f))} data-feedback={f}>
            {tx.fb[f]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The run screen for blocks that are not lessons (practice timer, game, vocal), between blocks, and the finish summary. */
export function WorkoutRunScreen({ t, lang, run, onGo, onBlockDone, onSkip, onEnd, onFeedback, listen, subs, onNext, onMore, endCard, end, onPlusFive, onFinish, resumable }: { /** Owner 2026-11-25: the block's run was stopped earlier today — Go continues it where it stopped. */ resumable?: boolean; /** SPEC-PRACTICE-SESSION §5: the end screen's content and actions (engine/sessionReward.ts, engine/momentum.ts). */ end?: Omit<SessionEndProps, 'lang' | 'feedback'>; /** §4: "Keep going? +5 min" taken: one more block of the most needed area. */ onPlusFive?: (block: string) => void; /** §4: the offer declined — on to the end screen. */ onFinish?: () => void; /** SPEC-STYLE-FOCUS §9.1: a card at the end of the session (the style taster), never inside an exercise. */ endCard?: React.ReactNode; /** §5: the countdown ran out or Next now (the next block starts). */ onNext?: () => void; /** §5: "+2 min" on the block that just ended. */ onMore?: () => void; /** A block kind's own line today (the key of the week …). */ subs?: Partial<Record<string, string>>; t: Strings; lang: Lang; run: WorkoutRun; onGo: () => void; onBlockDone: (ms: number, note?: string) => void; onSkip: () => void; onEnd: () => void; onFeedback: (f: 'easy' | 'right' | 'hard' | 'long') => void; /** The four-slot session's Recordings card (practiceMethod.ts listenCard). */ listen?: ListenCard }) {
  const tx = W[lang];
  const b = run.blocks[run.at];
  const [t0] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [bpm, setBpm] = useState(80);
  const [metro, setMetro] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!metro) return;
    const id = window.setInterval(() => void piano.play([{ midi: 76, start: 0, duration: 0.05, velocity: 0.5, perc: 'click' }], 0.1, new AbortController().signal).catch(() => {}), 60000 / bpm);
    return () => window.clearInterval(id);
  }, [metro, bpm]);
  // SPEC-PRACTICE-SESSION §4: the last block ran out on its own — "Keep going? +5 min" once, before the end screen
  if (run.finished && plusFiveOffer(run) && onPlusFive && onFinish) {
    const last = run.blocks.find((x) => x.id === run.between);
    const sum = last ? blockSummary(run, last.id) : null;
    const added = plusFive(run).blocks;
    const nextB = added[added.length - 1];
    return (
      <main className="wk-run wk-between wk-plus5" data-plus5-offer="1">
        <BlockBar blocks={run.blocks} run={run} />
        {last && (
          <h1>
            <Icon k="check" size={18} /> {fill(tx.blockOver, { b: blockLabel(t, last.target, lang, last.id) })}
          </h1>
        )}
        {sum && (
          <p className="wk-sum" dir="auto">
            {sum.items ? fill(tx.sumLine, { m: sum.minutes, n: sum.items, r: sum.right }) : fill(tx.sumMin, { m: sum.minutes })}
          </p>
        )}
        <h2>{tx.plusQ}</h2>
        {nextB && (
          <p className="field-hint" dir="auto">
            {fill(tx.plusSub, { b: blockLabel(t, nextB.target, lang, nextB.id) })}
          </p>
        )}
        <button className="btn primary" onClick={() => onPlusFive(nextB?.id ?? '')} data-plus5="1">
          <Icon k="play" /> {tx.plusYes}
        </button>
        <div className="wk-run-actions">
          <button className="btn small ghost" onClick={onFinish} data-plus5-no="1">
            {tx.plusNo}
          </button>
        </div>
      </main>
    );
  }
  if (run.finished || !b) {
    if (!end) return null;
    // §5: the end screen (also after "End" early); "How was it?" and the style card sit in its feedback slot
    return (
      <SessionEnd
        lang={lang}
        {...end}
        feedback={
          <>
            <FeedbackChips lang={lang} onFeedback={onFeedback} />
            {endCard}
          </>
        }
      />
    );
  }
  if (run.between && onNext && onMore) return <BetweenBlocks key={run.between} t={t} lang={lang} run={run} onNext={onNext} onMore={onMore} onEnd={onEnd} />;
  const leftMs = Math.max(0, blockLeftMs(run) - (b.target.kind === 'practice' ? now - t0 : 0));
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);
  return (
    <main className="wk-run" style={{ ['--hue' as string]: hueOf(b.target) }}>
      <BlockBar blocks={run.blocks} run={run} />
      <h1>{blockLabel(t, b.target, lang, b.id)}</h1>
      {(subs?.[b.target.kind] || whyOf(b.target)) && (
        <p className="wk-run-sub" dir="auto">
          <WhyChip target={b.target} lang={lang} />
          {subs?.[b.target.kind] && <span>{subs[b.target.kind]}</span>}
        </p>
      )}
      <p className="wk-timer" dir="ltr">
        {mm}:{String(ss).padStart(2, '0')}
      </p>
      {b.target.kind === 'practice' ? (
        <>
          {b.id.startsWith('listen-') && listen ? (
            <div className="wk-listen" data-listen-card={listen.concept ?? 'any'}>
              <p className="field-hint">
                <b>{lang === 'he' ? 'להקשיב: ' : 'Put on: '}</b>
                {listen.who[lang]}
              </p>
              <ol className="field-hint">
                {listen.prompts.map((q, i) => (
                  <li key={i}>{q[lang]}</li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="field-hint">{tx.practiceHint}</p>
          )}
          {!b.id.startsWith('listen-') && (
            <>
          <label className="toggle-row">
            <input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} />
            <span>
              {tx.metronome} <b dir="ltr">♩ = {bpm}</b>
            </span>
          </label>
          <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label={tx.metronome} />
            </>
          )}
          <textarea className="wk-note" placeholder={tx.note} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <button className="btn primary" onClick={() => onBlockDone(now - t0, note.trim() || undefined)}>
            ✓ {tx.blockDone}
          </button>
        </>
      ) : (
        <button className="btn primary" onClick={onGo} data-wk-go={resumable ? 'resume' : 'go'}>
          <Icon k="play" /> {resumable ? (lang === 'he' ? 'להמשיך מאיפה שעצרתם' : 'Continue where you stopped') : tx.go}
        </button>
      )}
      <div className="wk-run-actions">
        <button className="btn small ghost" onClick={onSkip}>
          ⇥ {tx.skipBlock}
        </button>
        <button className="btn small ghost" onClick={onEnd}>
          {tx.end}
        </button>
      </div>
    </main>
  );
}

export const workoutText = W;
