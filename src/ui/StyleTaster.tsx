// SPEC-STYLE-FOCUS §9 (owner 2026-11-22): exposure to the styles a player didn't choose is a lasting service, never a
// wall — on Today (never inside an exercise), at most one of these small cards:
//   · a teacher's focus suggestion (§3: the student approves);
//   · "add <style> to your styles?" when more than 20 % of the month's improvisation / repertoire time went to it (§9.4);
//   · the 6-month look at the preferences (§9.4);
//   · the style taster (§9.1): about every two weeks, ~5 minutes — one groove or comping pattern, one lick, 8 bars over
//     the band — with one sentence on what this player gains, then "add it?" (add / not now / don't offer for 6 months).
// No toasts, no change notices: the card is the whole message.
import { useEffect, useMemo, useState } from 'react';
import type { CourseId } from '../engine/courses';
import { catalog } from '../engine/drills/generate';
import { guitarCatalog } from '../engine/drills/guitar';
import type { LevelDef } from '../engine/drills/generate';
import { techDifficulty } from '../engine/ladderFacts';
import { LICKS } from '../engine/licks';
import {
  addDays,
  addStyle,
  answerTaste,
  focusOf,
  heavyAsked,
  heavyStyle,
  minutesByStyle,
  offerShown,
  picksOf,
  prefsDue,
  tasted,
  tasterFor,
  tasterSentence,
  withFocus,
  type StyleFocus,
  type StyleTaste,
  type StyleTasteEntry,
  type WeakArea,
} from '../engine/styleFocus';
import { STYLE_TEXT, styleOfLevel, type StyleId } from '../engine/styles';
import type { Settings } from '../storage/progress';
import { StyleChips } from './StyleChips';
import { Icon } from './icons';

type Lang = 'en' | 'he';
type Part = 'groove' | 'lick' | 'band';
const INST: Partial<Record<CourseId, 'piano' | 'guitar' | 'bass' | 'drums'>> = { keys: 'piano', guitar: 'guitar', bass: 'bass', drums: 'drums' };

/** The taste's first part: the easiest technique level of the style in the course (a groove or a comping pattern). */
export function tasteLevel(course: CourseId, style: StyleId): LevelDef | null {
  const inst = INST[course];
  if (!inst) return null;
  const fams = inst === 'piano' ? catalog() : guitarCatalog().filter((f) => f.instruments.includes(inst) && !f.retired);
  const lv = fams.flatMap((f) => f.levels.filter((l) => styleOfLevel(l, f) === style));
  return lv.sort((a, b) => (techDifficulty(a.id) ?? 9999) - (techDifficulty(b.id) ?? 9999))[0] ?? null;
}
/** The taste's lick: the first lick tagged with the style (none yet for most styles: the part is skipped). */
export const tasteLick = (style: StyleId) => LICKS.find((l) => l.style === style) ?? null;

/** The parts this taste has in this course (drums: no lick; a style without content yet: only the band). */
export function tasteParts(course: CourseId, style: StyleId): Part[] {
  const out: Part[] = [];
  if (tasteLevel(course, style)) out.push('groove');
  if (course !== 'drums' && tasteLick(style)) out.push('lick');
  out.push('band');
  return out;
}

const T = {
  en: { taste: 'A taste of', min: '~5 min', start: 'Start', later: 'Not now', groove: 'One groove or comping pattern', lick: 'One lick in the style', band: '8 bars over the band', add: 'Add it', never: "Don't offer for 6 months", q: (s: string) => `Add ${s} to your styles?`, swap: 'Swap out:', yourStyles: 'Your styles', still: 'Do they still suit you?', keep: 'Keep them', change: 'Change', done: 'Done', liked: 'Tasted and liked', heavy: (s: string) => `You play a lot of ${s} lately. Add it to your styles?`, teacher: 'Your teacher suggests a focus', accept: 'Accept', decline: 'No thanks', six: 'Last 6 months', mins: 'min' },
  he: { taste: 'טעימה:', min: 'כ־5 דקות', start: 'להתחיל', later: 'לא עכשיו', groove: 'גרוב או דפוס ליווי אחד', lick: 'ליק אחד בסגנון', band: '8 תיבות עם הלהקה', add: 'להוסיף', never: 'לא להציע ל־6 חודשים', q: (s: string) => `להוסיף ${s} לסגנונות שלכם?`, swap: 'במקום:', yourStyles: 'הסגנונות שלכם', still: 'הם עדיין מתאימים לכם?', keep: 'להשאיר', change: 'לשנות', done: 'סיום', liked: 'טעמתם ואהבתם', heavy: (s: string) => `אתם מנגנים הרבה ${s} לאחרונה. להוסיף לסגנונות שלכם?`, teacher: 'המורה מציע מיקוד', accept: 'לקבל', decline: 'לא תודה', six: '6 החודשים האחרונים', mins: 'דק׳' },
};

export interface StyleCardsProps {
  settings: Settings;
  lang: Lang;
  course: CourseId;
  today: string;
  weak?: WeakArea;
  /** A teacher's pending focus suggestion (SPEC-STYLE-FOCUS §3). */
  suggestion?: { id: string; course: CourseId; focus: StyleFocus; className?: string } | null;
  onSettings: (p: Partial<Settings>) => void;
  /** Run a taste part: the groove level's drills, the lick, the 8 bars over the band. */
  onGroove: (level: LevelDef) => void;
  onLick: (lickId: string) => void;
  onBand: (style: StyleId) => void;
}

/** The one style card for Today (or nothing). */
export function StyleCards(p: StyleCardsProps) {
  const { settings: s, lang, course, today, onSettings } = p;
  const tx = T[lang];
  const he = lang === 'he';
  const taste = s.styleTaste;
  // the service's clock starts on the first Today (the quarter and the 6 months count from it)
  useEffect(() => {
    if (!taste?.since) onSettings({ styleTaste: { ...(taste ?? {}), since: today } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taste?.since]);
  const focus = focusOf(s, course);
  const name = (x: StyleId) => STYLE_TEXT[x][lang];
  const setTaste = (t: StyleTaste, extra: Partial<Settings> = {}) => onSettings({ styleTaste: t, ...extra });
  const offer = useMemo(() => (INST[course] ? tasterFor(s, course, today, p.weak ?? null) : null), [s.styleTaste, s.styleFocus, course, today, p.weak]); // eslint-disable-line react-hooks/exhaustive-deps
  const heavy = useMemo(() => heavyStyle(s, course, today), [s.styleMinutes, s.styleFocus, s.styleTaste, course, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const [changing, setChanging] = useState(false);
  const [swapFor, setSwapFor] = useState<StyleId | null>(null);
  const cur = taste?.cur && taste.cur.course === course && taste.cur.started >= addDays(today, -7) ? taste.cur : null;

  const addOrSwap = (style: StyleId, then: (t: StyleTaste) => StyleTaste) => {
    const next = addStyle(course, focus, style);
    if (!next) return setSwapFor(style);
    setTaste(then(answerTaste(taste, style, 'add', today)), { styleFocus: withFocus(s, course, next) });
  };
  const swapRow = (style: StyleId, then: (t: StyleTaste) => StyleTaste) => (
    <div className="tc-swap" data-taster-swap={style}>
      <span>{tx.swap}</span>
      {focus.also.map((o) => (
        <button key={o} type="button" className="chip" onClick={() => (setSwapFor(null), setTaste(then(answerTaste(taste, style, 'add', today)), { styleFocus: withFocus(s, course, addStyle(course, focus, style, o) ?? focus) }))} data-taster-swap-out={o}>
          {name(o)}
        </button>
      ))}
    </div>
  );

  // 1. the teacher's suggestion
  if (p.suggestion && !(s.styleSuggestSeen ?? []).includes(p.suggestion.id)) {
    const sg = p.suggestion;
    const seen = [...(s.styleSuggestSeen ?? []), sg.id];
    return (
      <section className="taster-card" data-style-suggest={sg.id}>
        <div className="tc-head">
          <b>{tx.teacher}</b>
          {sg.className && <small>{sg.className}</small>}
        </div>
        <p className="tc-gain">{picksOf(sg.focus).map((x, i) => (i === 0 ? `${name(x)} (${he ? 'ראשי' : 'main'})` : name(x))).join(' · ')}</p>
        <div className="tc-actions">
          <button type="button" className="btn primary small" onClick={() => onSettings({ styleFocus: withFocus(s, sg.course, sg.focus), styleSuggestSeen: seen })} data-style-suggest-accept="1">
            {tx.accept}
          </button>
          <button type="button" className="btn ghost small" onClick={() => onSettings({ styleSuggestSeen: seen })} data-style-suggest-decline="1">
            {tx.decline}
          </button>
        </div>
      </section>
    );
  }

  // 2. the >20 % trigger (§9.4)
  if (heavy && !cur) {
    const ask = (t: StyleTaste) => heavyAsked(t, heavy, today);
    return (
      <section className="taster-card" data-style-heavy={heavy}>
        <p className="tc-q">{tx.heavy(name(heavy))}</p>
        {swapFor === heavy ? swapRow(heavy, ask) : (
          <div className="tc-actions">
            <button type="button" className="btn primary small" onClick={() => addOrSwap(heavy, ask)} data-style-heavy-add="1">{tx.add}</button>
            <button type="button" className="btn ghost small" onClick={() => setTaste(ask(answerTaste(taste, heavy, 'later', today)))}>{tx.later}</button>
            <button type="button" className="btn ghost small" onClick={() => setTaste(ask(answerTaste(taste, heavy, 'never', today)))}>{tx.never}</button>
          </div>
        )}
      </section>
    );
  }

  // 3. the 6-month look (§9.4)
  if (!cur && prefsDue(taste, today)) {
    const by = minutesByStyle(s.styleMinutes, course, addDays(today, -182));
    const rows = (Object.entries(by) as [StyleId, number][]).filter(([, m]) => m >= 1).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const liked = (Object.entries(taste?.by ?? {}) as [StyleId, StyleTasteEntry | undefined][]).filter(([x, e]) => e?.tasted && e.answer !== 'never' && !picksOf(focus).includes(x)).map(([x]) => x);
    const seen = () => setTaste({ ...(taste ?? {}), prefsSeen: today });
    return (
      <section className="taster-card" data-style-prefs="1">
        <div className="tc-head">
          <b>
            {tx.yourStyles}: {picksOf(focus).map(name).join(', ')}
          </b>
        </div>
        <p className="tc-q">{tx.still}</p>
        {rows.length > 0 && (
          <ul className="tc-times" aria-label={tx.six}>
            {rows.map(([x, m]) => (
              <li key={x}>
                <span>{name(x)}</span>
                <small>
                  <bdi dir="ltr">{Math.round(m)}</bdi> {tx.mins}
                </small>
              </li>
            ))}
          </ul>
        )}
        {liked.length > 0 && (
          <p className="tc-gain">
            {tx.liked}: {liked.map(name).join(', ')}
          </p>
        )}
        {changing ? (
          <>
            <StyleChips course={course} lang={lang} focus={focus} onChange={(f) => onSettings({ styleFocus: withFocus(s, course, f) })} title={false} />
            <div className="tc-actions">
              <button type="button" className="btn primary small" onClick={() => (setChanging(false), seen())} data-style-prefs-done="1">{tx.done}</button>
            </div>
          </>
        ) : (
          <div className="tc-actions">
            <button type="button" className="btn primary small" onClick={seen} data-style-prefs-keep="1">{tx.keep}</button>
            <button type="button" className="btn ghost small" onClick={() => setChanging(true)} data-style-prefs-change="1">{tx.change}</button>
          </div>
        )}
      </section>
    );
  }

  // 4. the taster (§9.1)
  const style = cur?.style ?? offer?.style;
  if (!style) return null;
  const parts = tasteParts(course, style);
  const done = cur?.done ?? [];
  const allDone = parts.every((x) => done.includes(x));
  const gain = tasterSentence(focus.main, style);
  const run = (part: Part) => {
    const t0 = cur ? taste! : tasted(taste, style, today);
    const c = { style, course, started: cur?.started ?? today, done: [...new Set([...done, part])] };
    setTaste({ ...t0, cur: c });
    if (part === 'groove') {
      const lv = tasteLevel(course, style);
      if (lv) p.onGroove(lv);
    } else if (part === 'lick') {
      const l = tasteLick(style);
      if (l) p.onLick(l.id);
    } else p.onBand(style);
  };
  const close = (t: StyleTaste): StyleTaste => ({ ...t, cur: undefined });
  const canAsk = !cur || offer?.ask !== false;
  return (
    <section className="taster-card" data-style-taster={style} data-taster-step={allDone ? 'ask' : cur ? 'run' : 'offer'}>
      <div className="tc-head">
        <b>
          {tx.taste} {name(style)}
        </b>
        <small>{tx.min}</small>
        {!cur && (
          <button type="button" className="icon-btn tc-close" aria-label={tx.later} title={tx.later} onClick={() => setTaste(offerShown(taste, today))} data-taster-later="1">
            <Icon k="close" size={14} />
          </button>
        )}
      </div>
      {gain && <p className="tc-gain">{gain[lang]}</p>}
      <ol className="tc-parts">
        {parts.map((x, i) => (
          <li key={x} className={done.includes(x) ? 'done' : ''}>
            <i aria-hidden="true">
              <bdi dir="ltr">{i + 1}</bdi>
            </i>
            <button type="button" className="link" onClick={() => run(x)} data-taster-part={x}>
              {tx[x]}
            </button>
          </li>
        ))}
      </ol>
      {!cur && (
        <div className="tc-actions">
          <button type="button" className="btn primary small" onClick={() => run(parts[0])} data-taster-start="1">
            <Icon k="play" size={14} /> {tx.start}
          </button>
        </div>
      )}
      {cur && allDone && canAsk && (
        <>
          <p className="tc-q">{tx.q(name(style))}</p>
          {swapFor === style ? swapRow(style, close) : (
            <div className="tc-actions">
              <button type="button" className="btn primary small" onClick={() => addOrSwap(style, close)} data-taster-add="1">{tx.add}</button>
              <button type="button" className="btn ghost small" onClick={() => setTaste(close(answerTaste(taste, style, 'later', today)))} data-taster-notnow="1">{tx.later}</button>
              <button type="button" className="btn ghost small" onClick={() => setTaste(close(answerTaste(taste, style, 'never', today)))} data-taster-never="1">{tx.never}</button>
            </div>
          )}
        </>
      )}
      {cur && allDone && !canAsk && (
        <div className="tc-actions">
          <button type="button" className="btn ghost small" onClick={() => setTaste(close(taste!))}>{tx.done}</button>
        </div>
      )}
    </section>
  );
}
