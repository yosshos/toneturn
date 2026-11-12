// Today's workout (spec AH): the first card on Home, a calm editor (W17), and the run screen for blocks that are
// not lessons (practice timer, game, vocal) plus the end summary with one-tap feedback (W11).

import { Toni } from './Toni';
import { Iso } from './Iso';
import { WaveMeter } from './WaveMeter';
import { Icon } from './icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import type { PathView } from '../engine/path';
import { TOPIC_GEN } from '../engine/topicKit';
import { add, blockLeftMs, canRescale, coverage, LIMITS, moveTo, preset, remove, rescale, runLeftMs, setMinutes, total, type Block, type BlockTarget, type Preset, type WorkoutRun } from '../engine/workout2';
import { DOMAINS, type DomainId } from '../engine/rating';
import { DOMAIN_HUE, GAMES2 } from './Arcade';
import { useCourse } from './courseContext';
import { COURSE_AREAS } from '../engine/courses';
import { piano } from './services';

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
    presets: { suggested: 'Suggested', ear: 'Ear focus', rhythm: 'Rhythm focus', reading: 'Reading focus', voice: 'Voice focus', instrument: 'Instrument focus', quick5: 'Quick 5', mistakes: 'Fix my mistakes' } as Record<Preset, string>,
    ctx: { nomic: 'No mic', quiet: 'Quiet place', noinst: 'No instrument' },
    kinds: { path: 'Path', warmup: 'Warm-up', vocal: 'Vocal warm-up', practice: 'My instrument', mistakes: 'Fix my mistakes' } as Record<string, string>,
    practiceHint: 'Practice on your own instrument. The metronome helps; write what you worked on.',
    metronome: 'Metronome',
    note: 'What did you work on?',
    blockDone: 'Block done',
    go: 'Go',
    finished: 'Workout done!',
    howWas: 'How was it?',
    fb: { easy: 'Too easy', right: 'Just right', hard: 'Too hard', long: 'Too long' },
    end: 'End workout',
    skipBlock: 'Skip this block',
    home: 'Home',
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
    presets: { suggested: 'מוצע', ear: 'דגש על שמיעה', rhythm: 'דגש על קצב', reading: 'דגש על קריאה', voice: 'דגש על קול', instrument: 'דגש על הכלי', quick5: 'חמש דקות מהירות', mistakes: 'לתקן טעויות' } as Record<Preset, string>,
    ctx: { nomic: 'בלי מיקרופון', quiet: 'מקום שקט', noinst: 'בלי כלי' },
    kinds: { path: 'מסלול', warmup: 'חימום', vocal: 'חימום קולי', practice: 'הכלי שלי', mistakes: 'לתקן טעויות' } as Record<string, string>,
    practiceHint: 'נגנו על הכלי שלכם. המטרונום עוזר; כתבו על מה עבדתם.',
    metronome: 'מטרונום',
    note: 'על מה עבדתם?',
    blockDone: 'הבלוק הושלם',
    go: 'קדימה',
    finished: 'האימון הושלם!',
    howWas: 'איך היה?',
    fb: { easy: 'קל מדי', right: 'בדיוק', hard: 'קשה מדי', long: 'ארוך מדי' },
    end: 'לסיים את האימון',
    skipBlock: 'לדלג על הבלוק',
    home: 'בית',
  },
};
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export function blockLabel(t: Strings, b: BlockTarget, lang: Lang): string {
  const tx = W[lang];
  switch (b.kind) {
    case 'area':
      return t.domainNames[b.area];
    case 'skill':
      return t.skillNames[b.skill] ?? b.skill;
    case 'topic':
      return TOPIC_GEN[b.topic]?.title[lang] ?? b.topic;
    case 'game':
      if (b.game === 'licks') return lang === 'he' ? 'חזרה על ליקים' : 'Lick review';
      if (b.game === 'pieces') return lang === 'he' ? 'חזרה על יצירה' : 'Piece review';
      if (b.game === 'transcribe') return lang === 'he' ? 'תמלול' : 'Transcribe';
      return GAMES2.find((g) => g.id === b.game)?.[lang][0] ?? b.game;
    default:
      return tx.kinds[b.kind] ?? b.kind;
  }
}
const hueOf = (b: BlockTarget) => (b.kind === 'area' ? DOMAIN_HUE[b.area] : b.kind === 'path' ? 'var(--mint)' : b.kind === 'warmup' || b.kind === 'mistakes' ? 'var(--gold)' : b.kind === 'game' ? 'var(--hue-creative)' : b.kind === 'vocal' ? 'var(--hue-voice)' : b.kind === 'practice' ? 'var(--hue-instrument)' : 'var(--hue-pitch)');

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

/**
 * Today's workout (W1, redesigned 0.41 — owner: "too much text and color"): one title line with the total and ✎, the
 * next path step, a calm numbered list of blocks (one accent: the block you're on), Start with a small daily-goal ring.
 * The context switches (no mic / quiet / no instrument) live in the editor.
 */
export function WorkoutCard({ t, lang, blocks, run, nextLine, edited, onStart, onEdit, onReset, goal }: {
  goal?: { todayXp: number; goalXp: number }; t: Strings; lang: Lang; blocks: Block[]; run: WorkoutRun | null; view?: PathView; nextLine: string | null; edited: boolean; onStart: () => void; onEdit: () => void; onReset: () => void }) {
  const tx = W[lang];
  const active = (run && !run.finished && run.at > 0) || (run && Object.keys(run.used).length > 0 && !run.finished);
  const leftMin = run && !run.finished ? Math.ceil(runLeftMs(run) / 60000) : total(blocks);
  const at = run && !run.finished ? run.at : -1;
  const pct = goal ? Math.min(1, goal.todayXp / Math.max(1, goal.goalXp)) : 0;
  // 0.61 (SPEC-REDESIGN, "Today"): the workout is the hero — purple, a staff behind, Toni, one lemon button.
  const he = lang === 'he';
  const bubble = active ? fill(tx.left, { m: leftMin }) : goal && goal.todayXp > 0 && pct < 1 ? (he ? 'עוד קצת, והיעד של היום מושלם.' : 'A little more and today’s goal is done.') : he ? 'מוכנים? בוא נתחיל.' : 'Ready? Let’s go.';
  return (
    <section className="wk-card wk-hero" aria-label={tx.title}>
      <svg className="wk-staff" viewBox="0 0 390 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30H390M0 46H390M0 62H390M0 78H390M0 94H390" />
      </svg>
      <div className="wk-head">
        <div className="wk-toni">
          <Toni state={active ? 'hint' : 'idle'} size={92} />
          <span className="wk-bubble">{bubble}</span>
        </div>
        <button className="icon-btn wk-edit" onClick={onEdit} aria-label={tx.edit}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
          </svg>
        </button>
      </div>
      <h2 className="wk-title">
        <Iso text={nextLine ?? tx.title} />
      </h2>
      <p className="wk-line">
        {blocks.map((b, i) => (
          <span key={b.id} className={i < at ? 'done' : i === at || (at < 0 && i === 0) ? 'now' : ''}>
            {i > 0 && ' · '}
            {blockLabel(t, b.target, lang)}
          </span>
        ))}
        <span>
          {' · '}
          {total(blocks)} {tx.min}
        </span>
      </p>
      <button className="btn mega wk-start" data-continue="1" onClick={onStart}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M7 4v16l13-8z" fill="currentColor" />
        </svg>
        {active ? `${tx.cont} · ${fill(tx.left, { m: leftMin })}` : tx.start}
      </button>
      {goal && (
        <div className="wk-goal" role="progressbar" aria-valuemin={0} aria-valuemax={goal.goalXp} aria-valuenow={Math.min(goal.todayXp, goal.goalXp)} aria-label={`${t.dailyGoal}: ${goal.todayXp}/${goal.goalXp} ${t.xp}`}>
          <WaveMeter value={pct} />
          <small dir="ltr">
            {goal.todayXp}/{goal.goalXp} {t.xp}
          </small>
        </div>
      )}
      {edited && (
        <button className="link wk-edited" onClick={onReset}>
          {tx.edited} · {tx.reset}
        </button>
      )}
    </section>
  );
}

/** An area preset belongs to the courses that practise that area (no "voice focus" in the guitar course). */
const PRESET_AREA: Partial<Record<Preset, DomainId>> = { ear: 'pitch', rhythm: 'time', reading: 'reading', voice: 'voice', instrument: 'instrument' };

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
}: {
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
  const courseAreas = COURSE_AREAS[useCourse().active];
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

  return (
    <main className="wk-editor">
      <header className="wk-ed-head">
        <button className="icon-btn" onClick={onClose} aria-label={tx.done}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{tx.title}</h1>
        <button className="btn small primary" onClick={onClose}>
          {tx.done}
        </button>
      </header>
      {ctx && onCtx && (
        <div className="wk-ctx" role="group" aria-label={lang === 'he' ? 'איפה אתם היום' : 'Where you are today'}>
          {(['nomic', 'quiet', 'noinst'] as const).map((k) => (
            <button key={k} className={`chip small ${ctx[k] ? 'on' : ''}`} aria-pressed={ctx[k]} onClick={() => onCtx({ ...ctx, [k]: !ctx[k] })}>
              {tx.ctx[k]}
            </button>
          ))}
        </div>
      )}
      <section className="wk-total-bar" aria-label={tx.total}>
        <div className="wk-chips" role="group">
          {[5, 10, 15, 20, 30, 45, 60].map((n) => (
            <button key={n} className={`chip ${T === n ? 'on' : ''}`} onClick={() => setTotal(n)} dir="ltr">
              {n}′
            </button>
          ))}
        </div>
        <div className="wk-stepper">
          <button className="icon-btn" onClick={() => setTotal(T - 5)} aria-label="−5">
            −
          </button>
          <b dir="ltr">
            {T} {tx.min}
          </b>
          <button className="icon-btn" onClick={() => setTotal(T + 5)} aria-label="+5">
            +
          </button>
        </div>
        {msg && <p className="field-hint" role="status">{msg}</p>}
      </section>

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
                <b>{blockLabel(t, b.target, lang)}</b>
                {path !== null && <small dir="auto">{path > 0 ? fill(tx.pathSteps, { n: path }) : tx.free}</small>}
              </span>
              <span className="wk-min">
                <button className="icon-btn" aria-label="−1" disabled={b.minutes <= LIMITS.minBlock} onClick={() => change(setMinutes(bs, b.id, b.minutes - 1))}>
                  −
                </button>
                <b dir="ltr">{b.minutes}′</b>
                <button className="icon-btn" aria-label="+1" disabled={b.minutes >= LIMITS.maxBlock} onClick={() => change(setMinutes(bs, b.id, b.minutes + 1))}>
                  +
                </button>
              </span>
              <button className="icon-btn wk-more" aria-label="⋯" onClick={() => setMenu(menu === b.id ? null : b.id)}>
                ⋯
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
                    ✕ {tx.remove}
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
                      ⇄ {tx.swap}
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
        ＋ {tx.add}
      </button>

      <div className="wk-presets" role="group">
        {(['suggested', 'ear', 'rhythm', 'reading', 'voice', 'instrument', 'mistakes', 'quick5'] as Preset[]).filter((p) => !PRESET_AREA[p] || courseAreas.includes(PRESET_AREA[p]!)).map((p) => (
          <button key={p} className="chip" onClick={() => change(preset(p, T, suggested), tx.presets[p])}>
            {tx.presets[p]}
          </button>
        ))}
      </div>

      <div className="wk-default">
        <button className="btn small" onClick={() => (onSaveDefault(bs, 'all'), setMsg(tx.saved))}>
          ★ {tx.saveDefault} · {tx.everyDay}
        </button>
        <button className="btn small ghost" onClick={() => (onSaveDefault(bs, 'weekday'), setMsg(tx.saved))}>
          {tx.thisDay}
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
              {[...addOptions.suggested.slice(0, 6), { kind: 'path' } as BlockTarget, { kind: 'warmup' } as BlockTarget, { kind: 'practice' } as BlockTarget, { kind: 'mistakes' } as BlockTarget].map((x, i) => (
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

/** The run screen for blocks that are not lessons (practice timer, game, vocal), and the finish summary. */
export function WorkoutRunScreen({ t, lang, run, onGo, onBlockDone, onSkip, onEnd, onFeedback }: { t: Strings; lang: Lang; run: WorkoutRun; onGo: () => void; onBlockDone: (ms: number) => void; onSkip: () => void; onEnd: () => void; onFeedback: (f: 'easy' | 'right' | 'hard' | 'long') => void }) {
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
  if (run.finished || !b) {
    const items = Object.values(run.items).reduce((a, [n, r]) => [a[0] + n, a[1] + r], [0, 0]);
    const mins = Math.round(Object.values(run.used).reduce((a, x) => a + x, 0) / 60000);
    return (
      <main className="wk-run wk-finished">
        <h1>{tx.finished}</h1>
        <p dir="ltr" className="wk-sum">
          {mins}′ · {items[0]} ✓{items[1]} · {run.steps.length} {lang === 'he' ? 'שלבים' : 'steps'}
        </p>
        <h2>{tx.howWas}</h2>
        <div className="intake-chips">
          {(['easy', 'right', 'hard', 'long'] as const).map((f) => (
            <button key={f} className="chip" onClick={() => onFeedback(f)}>
              {tx.fb[f]}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={onEnd}>
          {tx.home}
        </button>
      </main>
    );
  }
  const leftMs = Math.max(0, blockLeftMs(run) - (b.target.kind === 'practice' ? now - t0 : 0));
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);
  return (
    <main className="wk-run" style={{ ['--hue' as string]: hueOf(b.target) }}>
      <BlockBar blocks={run.blocks} run={run} />
      <h1>{blockLabel(t, b.target, lang)}</h1>
      <p className="wk-timer" dir="ltr">
        {mm}:{String(ss).padStart(2, '0')}
      </p>
      {b.target.kind === 'practice' ? (
        <>
          <p className="field-hint">{tx.practiceHint}</p>
          <label className="toggle-row">
            <input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} />
            <span>
              {tx.metronome} <b dir="ltr">♩ = {bpm}</b>
            </span>
          </label>
          <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label={tx.metronome} />
          <textarea className="wk-note" placeholder={tx.note} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <button className="btn primary" onClick={() => onBlockDone(now - t0)}>
            ✓ {tx.blockDone}
          </button>
        </>
      ) : (
        <button className="btn primary" onClick={onGo}>
          ▶ {tx.go}
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
