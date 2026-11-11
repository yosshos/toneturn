// How a course starts (docs/SPEC-COURSE-START.md): the welcome card, the instrument check as a musical moment, the
// measured first win with the three next choices — and the small cards Home and Path show around it (the first-run
// hero "Start: <taste>", the level-test offer, the first-week card, the goal line). One phone screen each, no emoji.
import { useEffect, useRef, useState } from 'react';
import { courseOf, type CourseId } from '../engine/courses';
import { LADDER, PERSONAL_GOALS, PROMISE, goalById, goalProgress, rungOf, tasteFor, type CourseStartState, type SelfReport, type Stage, type TasteDef } from '../engine/courseStart';
import type { PathFacts, PathUnit, UnitStep } from '../engine/path';
import type { Settings } from '../storage/progress';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { midi } from '../speech/midi';
import { listenLoop } from './Flight';
import { KitSetup } from './DrumViews';
import { Glyph } from './Glyph';
import { Toni } from './Toni';
import { piano, SIMULATED } from './services';

type Lang = 'en' | 'he';
type T2 = { en: string; he: string };
const L = (lang: Lang, x: T2) => x[lang];

const LISTENING = (c: CourseId) => c === 'ear' || c === 'jazz';
const NAMES = { en: ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'], he: ['דו', 'דו♯', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'] };
const noteName = (m: number, lang: Lang) => NAMES[lang][((Math.round(m) % 12) + 12) % 12];

function reportOptions(c: CourseId, lang: Lang): { v: SelfReport; label: string; sub: string }[] {
  const he = lang === 'he';
  const verb = LISTENING(c) ? (he ? ['יודעים קצת', 'יודעים טוב'] : ['I know a bit', 'I know it well']) : c === 'voice' ? (he ? ['שרים קצת', 'שרים טוב'] : ['I sing a bit', 'I sing well']) : he ? ['מנגנים קצת', 'מנגנים טוב'] : ['I play a bit', 'I play well'];
  return [
    { v: 'new', label: he ? 'חדשים בזה' : 'New to this', sub: he ? 'מתחילים מהצעד הראשון' : 'Start from the first step' },
    { v: 'bit', label: verb[0], sub: he ? 'יש לי כמה בסיסים' : 'I have some basics' },
    { v: 'well', label: verb[1], sub: he ? 'טעימה קצרה, ואז בדיקת רמה' : 'A short taste, then a level test' },
  ];
}

/** The destination ladder: four rungs, the current one marked (no "you are here" before the player says where). */
export function Ladder({ course, lang, at }: { course: CourseId; lang: Lang; at?: number }) {
  return (
    <ol className="cs-ladder" aria-label={lang === 'he' ? 'לאן הקורס מוביל' : 'Where the course leads'}>
      {LADDER[course].map((r, i) => (
        <li key={r.en} className={at === undefined ? '' : i < at ? 'past' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <i aria-hidden="true" />
          <span>{L(lang, r)}</span>
        </li>
      ))}
    </ol>
  );
}

function Head({ lang, onBack, step, of }: { lang: Lang; onBack: () => void; step: number; of: number }) {
  return (
    <header className="ob-head">
      <button className="icon-btn" onClick={onBack} aria-label={lang === 'he' ? 'חזרה' : 'Back'}>
        <span className="flip-rtl">←</span>
      </button>
      <div className="ob-progress" aria-hidden="true">
        {Array.from({ length: of }, (_, k) => (
          <i key={k} className={k < step ? 'done' : k === step ? 'now' : ''} />
        ))}
      </div>
      <span className="ob-skip" />
    </header>
  );
}

/** Step 1: what this course gets you, the ladder, and "Where are you?". */
export function CourseWelcome({ course, lang, report, onReport, onBack }: { course: CourseId; lang: Lang; report?: SelfReport; onReport: (r: SelfReport) => void; onBack: () => void }) {
  const def = courseOf(course);
  const [picked, setPicked] = useState<SelfReport | null>(report ?? null);
  return (
    <main className="onboarding cs-screen cs-welcome" data-course-start="welcome" data-cs-course={course}>
      <Head lang={lang} onBack={onBack} step={0} of={3} />
      <div className="cs-course">
        <Glyph kind={def.glyph} color={def.color} size={30} />
        <b>{def.name[lang]}</b>
        <Toni state="draw" size={64} />
      </div>
      <h1>{L(lang, PROMISE[course])}</h1>
      <Ladder course={course} lang={lang} />
      <h2 className="cs-q">{lang === 'he' ? 'איפה אתם?' : 'Where are you?'}</h2>
      <div className="ob-choices" role="radiogroup">
        {reportOptions(course, lang).map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={picked === o.v}
            className={`ob-choice ${picked === o.v ? 'on' : ''}`}
            data-report={o.v}
            onClick={() => {
              setPicked(o.v);
              window.setTimeout(() => onReport(o.v), 160);
            }}
          >
            <b>{o.label}</b>
            <small>{o.sub}</small>
          </button>
        ))}
      </div>
    </main>
  );
}

/** Listen on the microphone (and a MIDI keyboard) for one steady note; resolves through onHeard once. */
function useListen(active: boolean, o: { midiFirst: boolean; fft?: number; minHz?: number; sim: number }, onHeard: (m: number, via: 'midi' | 'mic') => void) {
  const [live, setLive] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const cb = useRef(onHeard);
  cb.current = onHeard;
  useEffect(() => {
    if (!active) return;
    const ac = new AbortController();
    let done = false;
    const hit = (m: number, via: 'midi' | 'mic') => {
      if (done) return;
      done = true;
      ac.abort();
      cb.current(m, via);
    };
    // A MIDI keyboard: the first key wins (asked once, quietly ignored when the browser has no MIDI).
    let offMidi: (() => void) | null = null;
    if (o.midiFirst && midi.supported && !SIMULATED) {
      void midi
        .enable()
        .then(() => {
          if (ac.signal.aborted) return;
          offMidi = midi.onNote((m, on) => on && hit(m, 'midi'));
        })
        .catch(() => {});
    }
    let run: number[] = [];
    void listenLoop(
      new BrowserPitchCapture(),
      ac.signal,
      (f) => {
        if (!f.hz || f.confidence < 0.85) {
          run = [];
          setLive(null);
          return;
        }
        const m = 69 + 12 * Math.log2(f.hz / 440);
        setLive(m);
        run = [...run.slice(-7), m];
        if (run.length >= 8 && Math.max(...run) - Math.min(...run) < 0.6) hit(run.reduce((a, b) => a + b, 0) / run.length, 'mic');
      },
      () => o.sim,
      { fftSize: o.fft, minHz: o.minHz },
    ).then((e) => e && setErr(e.code));
    return () => {
      ac.abort();
      offMidi?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return { live, err };
}

const chordOn = (root: number, ints: number[], dur = 1.6) => {
  const ctl = new AbortController();
  void piano
    .unlock()
    .then(() => piano.play(ints.map((i, k) => ({ midi: root + i, start: k * 0.02, duration: dur, velocity: 0.66 })), dur + 0.3, ctl.signal))
    .catch(() => {});
};

const SETUP_TX: Record<'keys' | 'guitar' | 'bass' | 'voice', { title: T2; hint: T2; heard: (n: string, lang: Lang) => string; sim: number; fft?: number; minHz?: number }> = {
  keys: { title: { en: 'Play any key', he: 'נגנו על קליד כלשהו' }, hint: { en: 'A MIDI keyboard or the microphone hears it, and a chord answers you.', he: 'מקלדת MIDI או המיקרופון ישמעו אותו, ואקורד יענה לכם.' }, heard: (n, lang) => (lang === 'he' ? `שמענו ${n}. הנה האקורד שלו.` : `That was ${n}. Here is its chord.`), sim: 60 },
  guitar: { title: { en: 'Pluck the low string', he: 'פרטו על המיתר הנמוך' }, hint: { en: 'The tuner shows it, and the band answers.', he: 'הטיונר יראה אותו, והלהקה תענה.' }, heard: (n, lang) => (lang === 'he' ? `${n} — המיתר נשמע טוב.` : `${n} — the string comes through.`), sim: 40 },
  bass: { title: { en: 'Pluck the low string', he: 'פרטו על המיתר הנמוך' }, hint: { en: 'The tuner shows it, and the band answers.', he: 'הטיונר יראה אותו, והלהקה תענה.' }, heard: (n, lang) => (lang === 'he' ? `${n} — הבס נשמע טוב.` : `${n} — the bass comes through.`), sim: 28, fft: 4096, minHz: 28 },
  voice: { title: { en: 'Sing any note', he: 'שירו צליל כלשהו' }, hint: { en: 'Hold it for a moment. Toni echoes it back.', he: 'החזיקו אותו רגע. טוני יחזיר לכם אותו.' }, heard: (n, lang) => (lang === 'he' ? `${n}. זה הצליל שלכם.` : `${n}. That is your note.`), sim: 57 },
};

/** Step 2: the instrument check as a musical moment (skipped by the caller when already checked). */
export function CourseSetup({ course, lang, settings, onSettings, onDone, onBack }: { course: CourseId; lang: Lang; settings: Settings; onSettings: (p: Partial<Settings>) => void; onDone: (skipped: boolean) => void; onBack: () => void }) {
  const he = lang === 'he';
  const skip = (
    <button className="link cs-skip" onClick={() => onDone(true)} data-setup-skip="1">
      {he ? 'לדלג בינתיים' : 'Skip for now'}
    </button>
  );
  if (course === 'drums')
    return (
      <main className="onboarding cs-screen cs-setup" data-course-start="setup" data-cs-course={course}>
        <Head lang={lang} onBack={onBack} step={1} of={3} />
        {/* The short form (three pads, no pedal / velocity steps); the kit card finishes it later. */}
        <KitSetup quick lang={lang} kit={settings.drumKit} latency={settings} onSave={(k) => onSettings({ drumKit: k, ...(k.mic ? {} : { midiInput: true }) })} onLatency={(p) => onSettings(p)} onDone={() => onDone(false)} />
        {skip}
      </main>
    );
  if (LISTENING(course)) return <ListenCheck lang={lang} course={course} onSettings={onSettings} onDone={onDone} onBack={onBack} skip={skip} />;
  return <PlayCheck lang={lang} course={course as 'keys' | 'guitar' | 'bass' | 'voice'} onSettings={onSettings} onDone={onDone} onBack={onBack} skip={skip} />;
}

function PlayCheck({ lang, course, onSettings, onDone, onBack, skip }: { lang: Lang; course: 'keys' | 'guitar' | 'bass' | 'voice'; onSettings: (p: Partial<Settings>) => void; onDone: (skipped: boolean) => void; onBack: () => void; skip: React.ReactNode }) {
  const tx = SETUP_TX[course];
  const [on, setOn] = useState(false);
  const [heard, setHeard] = useState<number | null>(null);
  const { live, err } = useListen(on && heard === null, { midiFirst: course === 'keys', fft: tx.fft, minHz: tx.minHz, sim: tx.sim }, (m, via) => {
    setHeard(m);
    if (via === 'midi') onSettings({ midiInput: true });
    const root = Math.round(m);
    // The answer: a chord on the note (keys), the band's power chord (strings), Toni's echo (voice).
    if (course === 'keys') chordOn(root < 48 ? root + 12 : root, [0, 4, 7, 12]);
    else if (course === 'voice') chordOn(root, [0], 1.4);
    else chordOn(root + 12 < 40 ? root + 24 : root + 12, [0, 7, 12]);
  });
  const he = lang === 'he';
  const cents = live !== null ? Math.round((live - Math.round(live)) * 100) : 0;
  return (
    <main className="onboarding cs-screen cs-setup" data-course-start="setup" data-cs-course={course}>
      <Head lang={lang} onBack={onBack} step={1} of={3} />
      <h1>{L(lang, tx.title)}</h1>
      <p className="field-hint">{L(lang, tx.hint)}</p>
      <div className="cs-listen">
        <Toni state={heard !== null ? 'correct' : on ? 'listen' : 'idle'} size={110} />
        <div className="cs-readout" aria-live="polite" data-heard={heard !== null ? Math.round(heard) : undefined}>
          {heard !== null ? (
            <b>{tx.heard(noteName(heard, lang), lang)}</b>
          ) : live !== null ? (
            <>
              <b dir="ltr">{noteName(live, lang)}</b>
              {course !== 'voice' && course !== 'keys' && (
                <span className="cs-cents" style={{ ['--c' as string]: `${50 + cents / 2}%` }} aria-hidden="true">
                  <i />
                </span>
              )}
            </>
          ) : (
            <span>{on ? (he ? 'מקשיבים…' : 'Listening…') : ' '}</span>
          )}
        </div>
        {err && <p className="cs-err">{he ? 'המיקרופון לא זמין. אפשר לדלג ולהגדיר אחר כך בהגדרות.' : 'The microphone is not available. Skip now and set it up later in Settings.'}</p>}
      </div>
      <div className="ob-actions cs-actions">
        {heard !== null ? (
          <button className="btn primary ob-cta" onClick={() => onDone(false)} data-setup-next="1">
            {he ? 'המשך' : 'Continue'}
          </button>
        ) : (
          <button className="btn primary ob-cta" disabled={on && !err} onClick={() => (void piano.unlock(), setOn(true))} data-setup-listen="1">
            {on ? (he ? 'מקשיבים…' : 'Listening…') : he ? 'להתחיל להקשיב' : 'Start listening'}
          </button>
        )}
        {skip}
      </div>
    </main>
  );
}

function ListenCheck({ lang, course, onSettings, onDone, onBack, skip }: { lang: Lang; course: CourseId; onSettings: (p: Partial<Settings>) => void; onDone: (skipped: boolean) => void; onBack: () => void; skip: React.ReactNode }) {
  const he = lang === 'he';
  const [played, setPlayed] = useState(false);
  const play = () => {
    // A ii–V–I (Dm7 G7 Cmaj7): the sound the course is about, at a comfortable level.
    const ctl = new AbortController();
    const ch = (r: number, ints: number[], t: number) => ints.map((i) => ({ midi: r + i, start: t, duration: 1.1, velocity: 0.6 }));
    void piano
      .unlock()
      .then(() => piano.play([...ch(50, [0, 10, 15, 19], 0), ...ch(43, [0, 10, 16, 21], 1.2), ...ch(48, [0, 11, 16, 19], 2.4)], 4, ctl.signal))
      .catch(() => {})
      .finally(() => setPlayed(true));
  };
  const pick = (h: boolean) => {
    onSettings({ headphones: h });
    onDone(false);
  };
  return (
    <main className="onboarding cs-screen cs-setup" data-course-start="setup" data-cs-course={course}>
      <Head lang={lang} onBack={onBack} step={1} of={3} />
      <h1>{he ? 'בדיקת צליל' : 'A sound check'}</h1>
      <p className="field-hint">{he ? 'השמיעו את המהלך וכוונו את העוצמה כך שיהיה נעים וברור. אוזניות נותנות את התוצאה הכי טובה.' : 'Play the progression and set the volume so it sounds clear and comfortable. Headphones work best.'}</p>
      <div className="cs-listen">
        <Toni state={played ? 'correct' : 'idle'} size={110} />
        <button className="btn cs-play" onClick={play} data-setup-play="1">
          {played ? (he ? 'שוב' : 'Again') : he ? 'להשמיע' : 'Play it'}
        </button>
      </div>
      <h2 className="cs-q">{he ? 'במה אתם מקשיבים?' : 'What are you listening on?'}</h2>
      <div className="ob-pair">
        <button className="ob-choice" onClick={() => pick(true)} data-setup-headphones="1">
          <b>{he ? 'אוזניות' : 'Headphones'}</b>
        </button>
        <button className="ob-choice" onClick={() => pick(false)} data-setup-speaker="1">
          <b>{he ? 'רמקול' : 'Speaker'}</b>
        </button>
      </div>
      {skip}
    </main>
  );
}

/** A plain medal for the "First session" mark (no emoji: a ring, a ribbon, the course colour). */
function Medal({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 48" width="34" height="40" aria-hidden="true">
      <path d="M12 2h7l-4 14h-7zM28 2h-7l4 14h7z" fill="var(--ink-dim)" />
      <circle cx="20" cy="30" r="15" fill={color} stroke="var(--ink)" strokeWidth="2" />
      <circle cx="20" cy="30" r="9" fill="none" stroke="var(--ink)" strokeWidth="1.6" opacity="0.6" />
      <path d="M20 24l1.8 3.8 4.2.4-3.2 2.8 1 4.1-3.8-2.2-3.8 2.2 1-4.1-3.2-2.8 4.2-.4z" fill="var(--ink)" />
    </svg>
  );
}

/** The measured line of the first win: what the player actually did. */
export function winLine(cs: CourseStartState, lang: Lang): string {
  const w = cs.win;
  const he = lang === 'he';
  if (!w) return he ? 'השיעור הראשון הושלם.' : 'Your first session is done.';
  if (w.kind === 'lesson') return he ? `${w.right ?? 0} מתוך ${w.total ?? 0} נכונות בניסיון הראשון` : `${w.right ?? 0} of ${w.total ?? 0} right first time`;
  const parts: string[] = [];
  if (w.bars) parts.push(he ? `${w.bars} תיבות עם הלהקה` : `${w.bars} bars with the band`);
  if (w.takes) parts.push(he ? `${w.clean ?? 0} מתוך ${w.takes} ניסיונות נקיים` : `${w.clean ?? 0} of ${w.takes} takes clean`);
  if (w.acc !== undefined && w.takes) parts.push(he ? `${Math.round(w.acc * 100)}% מהצלילים מדויקים` : `${Math.round(w.acc * 100)}% of the notes right`);
  return parts.join(' · ') || (he ? 'השיעור הראשון הושלם.' : 'Your first session is done.');
}

export const GOAL_XP: { xp: number; min: number }[] = [
  { xp: 10, min: 5 },
  { xp: 20, min: 10 },
  { xp: 30, min: 15 },
  { xp: 50, min: 25 },
];

/** Steps 4–5: the measured first win, then the three choices (one highlighted by the self-report). */
export function FirstWin({
  course,
  lang,
  cs,
  streak,
  dailyGoal,
  reminderHour,
  onPath,
  onFindLevel,
  onDailyGoal,
  onReminder,
  onPersonalGoal,
}: {
  course: CourseId;
  lang: Lang;
  cs: CourseStartState;
  streak: number;
  dailyGoal?: number;
  reminderHour: number;
  onPath: () => void;
  onFindLevel: () => void;
  onDailyGoal: (xp: number) => void;
  /** Ask for the reminder (a tap): resolves to a short status for the line under the button. */
  onReminder: (hour: number) => Promise<'on' | 'signin' | 'unsupported' | 'denied' | 'error'>;
  onPersonalGoal: (id: string | null) => void;
}) {
  const he = lang === 'he';
  const def = courseOf(course);
  const [sheet, setSheet] = useState<'daily' | 'goal' | null>(null);
  const [goalXp, setGoalXp] = useState<number>(dailyGoal ?? 20);
  const [hour, setHour] = useState(reminderHour);
  const [remind, setRemind] = useState<string | null>(null);
  const [savedDaily, setSavedDaily] = useState(false);
  const well = cs.report === 'well';
  const pg = cs.goal ? goalById(course, cs.goal.id) : undefined;
  const choice = (key: string, title: string, sub: string, primary: boolean, on: () => void) => (
    <button key={key} className={`cs-next ${primary ? 'primary' : ''}`} onClick={on} data-next={key}>
      <b>{title}</b>
      <small>{sub}</small>
    </button>
  );
  const nexts = [
    choice('path', he ? 'להמשיך במסלול' : 'Continue the path', he ? 'הצעד הבא בקורס' : 'The next step of the course', !well, onPath),
    choice('level', he ? 'בדיקת רמה' : 'Find my level', he ? '3–6 דקות, והמסלול זז למקום שלכם' : '3–6 minutes; the path moves to where you are', well, onFindLevel),
    choice('daily', savedDaily ? (he ? `יעד יומי: ${goalXp} XP` : `Daily goal: ${goalXp} XP`) : he ? 'יעד יומי ותזכורת' : 'Set a daily goal', he ? 'כמה דקות ביום, ומתי להזכיר' : 'Minutes a day, and when to remind you', false, () => setSheet('daily')),
  ];
  return (
    <main className="onboarding cs-screen cs-win" data-course-start="win" data-cs-course={course}>
      <div className="cs-win-top">
        <Toni state="wow" size={96} />
        <h1>{he ? 'השיעור הראשון הושלם' : 'First session done'}</h1>
        <p className="cs-measure" data-win-line="1">
          {winLine(cs, lang)}
        </p>
      </div>
      <ul className="cs-stats">
        <li data-win-badge="1">
          <Medal color={def.color} />
          <span>{he ? 'שיעור ראשון' : 'First session'}</span>
        </li>
        <li>
          <b dir="ltr">+{cs.win?.xp ?? 0}</b>
          <span>XP</span>
        </li>
        <li>
          <b dir="ltr">{Math.max(1, streak)}</b>
          <span>{he ? 'ימי רצף' : streak > 1 ? 'day streak' : 'day streak'}</span>
        </li>
      </ul>
      <h2 className="cs-q">{he ? 'מה עכשיו?' : 'What next?'}</h2>
      <div className="cs-nexts">{well ? [nexts[1], nexts[0], nexts[2]] : nexts}</div>
      <button className="link cs-goal-link" onClick={() => setSheet('goal')} data-personal-goal="1">
        {pg ? (he ? `המטרה שלכם: ${pg.title.he}` : `Your goal: ${pg.title.en}`) : he ? 'להוסיף מטרה אישית (לא חובה)' : 'Add a personal goal (optional)'}
      </button>

      {sheet === 'daily' && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet cs-sheet" role="dialog" aria-modal="true" aria-labelledby="cs-daily-title" onClick={(e) => e.stopPropagation()} data-daily-sheet="1">
            <h2 id="cs-daily-title">{he ? 'יעד יומי' : 'Daily goal'}</h2>
            <div className="cs-chips" role="radiogroup">
              {GOAL_XP.map((g) => (
                <button key={g.xp} role="radio" aria-checked={goalXp === g.xp} className={`chip ${goalXp === g.xp ? 'on' : ''}`} onClick={() => setGoalXp(g.xp)} data-goal-xp={g.xp}>
                  <b>{he ? `${g.min} דק׳` : `${g.min} min`}</b>
                  <small dir="ltr">{g.xp} XP</small>
                </button>
              ))}
            </div>
            <div className="cs-remind">
              <label className="hour-pick">
                {he ? 'תזכורת ב־' : 'Remind me at'}{' '}
                <select value={hour} onChange={(e) => setHour(Number(e.target.value))} data-remind-hour="1">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn small"
                onClick={async () => {
                  const r = await onReminder(hour);
                  setRemind(
                    r === 'on'
                      ? he ? 'התזכורת פעילה.' : 'The reminder is on.'
                      : r === 'signin'
                        ? he ? 'השעה נשמרה. תזכורות פועלות אחרי התחברות.' : 'Saved. Reminders work once you sign in.'
                        : r === 'denied'
                          ? he ? 'ההתראות חסומות בדפדפן.' : 'Notifications are blocked in the browser.'
                          : he ? 'השעה נשמרה. המכשיר הזה לא תומך בתזכורות.' : 'Saved. This device does not support reminders.',
                  );
                }}
                data-remind="1"
              >
                {he ? 'להזכיר לי' : 'Remind me'}
              </button>
            </div>
            {remind && (
              <p className="field-hint" role="status">
                {remind}
              </p>
            )}
            <button
              className="btn primary"
              onClick={() => {
                onDailyGoal(goalXp);
                setSavedDaily(true);
                setSheet(null);
              }}
              data-daily-save="1"
            >
              {he ? 'לשמור' : 'Save'}
            </button>
          </div>
        </div>
      )}
      {sheet === 'goal' && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet cs-sheet" role="dialog" aria-modal="true" aria-labelledby="cs-goal-title" onClick={(e) => e.stopPropagation()} data-goal-sheet="1">
            <h2 id="cs-goal-title">{he ? 'מטרה אישית' : 'A personal goal'}</h2>
            <p className="field-hint">{he ? 'המסלול יראה את ההתקדמות אליה.' : 'The path shows your progress toward it.'}</p>
            <div className="ob-choices">
              {PERSONAL_GOALS[course].map((g) => (
                <button
                  key={g.id}
                  className={`ob-choice ${cs.goal?.id === g.id ? 'on' : ''}`}
                  onClick={() => {
                    onPersonalGoal(g.id);
                    setSheet(null);
                  }}
                  data-goal={g.id}
                >
                  <b>{L(lang, g.title)}</b>
                </button>
              ))}
            </div>
            <button
              className="btn ghost"
              onClick={() => {
                if (cs.goal) onPersonalGoal(null);
                setSheet(null);
              }}
            >
              {cs.goal ? (he ? 'בלי מטרה' : 'No goal') : he ? 'לא עכשיו' : 'Not now'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Home / Path first run: "Start: <taste>" (Find my level second for "I play well"), the course and its ladder. */
export function CourseStartHero({ course, lang, stage, cs, onStart, onFindLevel, compact = false }: { course: CourseId; lang: Lang; stage: Stage; cs?: CourseStartState; onStart: () => void; onFindLevel: () => void; compact?: boolean }) {
  const he = lang === 'he';
  const def = courseOf(course);
  const taste: TasteDef | null = cs?.report ? tasteFor(course, cs.report) : null;
  const label =
    stage === 'win'
      ? he ? 'לתוצאה הראשונה שלכם' : 'See your first result'
      : !taste
        ? he ? 'להתחיל את הקורס' : 'Start the course'
        : cs?.tasteAt
          ? `${he ? 'להמשיך' : 'Continue'}: ${L(lang, taste.title)}`
          : `${he ? 'להתחיל' : 'Start'}: ${L(lang, taste.title)}`;
  const H = compact ? 'h2' : 'h1';
  return (
    <section className={`hero first-run cs-hero ${compact ? 'compact' : ''}`} data-course-hero={stage}>
      <div className="cs-course">
        <Glyph kind={def.glyph} color={def.color} size={26} />
        <b>{def.name[lang]}</b>
      </div>
      <H>{L(lang, PROMISE[course])}</H>
      {!compact && <Ladder course={course} lang={lang} at={0} />}
      {taste && stage !== 'win' && <p className="blurb">{L(lang, taste.blurb)}</p>}
      <button className="btn primary first-run-cta" onClick={onStart} data-course-start-cta="1">
        {label}
      </button>
      {cs?.report === 'well' && stage !== 'win' && (
        <button className="link start-from-one" onClick={onFindLevel} data-course-find-level="1">
          {he ? 'בדיקת רמה' : 'Find my level'}
        </button>
      )}
    </section>
  );
}

/** The explicit level test, offered (never forced) after the first session for "well", after session 3 for the rest. */
export function LevelOfferCard({ lang, onFind, onLater }: { lang: Lang; onFind: () => void; onLater: () => void }) {
  const he = lang === 'he';
  return (
    <div className="cs-card cs-offer" data-level-offer="1">
      <span>
        <b>{he ? 'מוכנים לבדיקת רמה?' : 'Ready to find your level?'}</b>
        <small>{he ? '3–6 דקות, אפשר לעצור ולהמשיך. המסלול זז למקום שלכם.' : '3–6 minutes, stop any time. The path moves to where you are.'}</small>
      </span>
      <div className="row">
        <button className="btn primary small" onClick={onFind}>
          {he ? 'בדיקת רמה' : 'Find my level'}
        </button>
        <button className="btn ghost small" onClick={onLater}>
          {he ? 'לא עכשיו' : 'Not now'}
        </button>
      </div>
    </div>
  );
}

/** Sessions 2–3: the path's probe steps, as normal steps (they move fast when the player knows the material). */
export function FirstWeekCard({ lang, day, picks, onOpen }: { lang: Lang; day: 2 | 3; picks: { x: UnitStep; unit: PathUnit }[]; onOpen: (x: UnitStep, unit: PathUnit) => void }) {
  const he = lang === 'he';
  if (!picks.length) return null;
  return (
    <div className="cs-card cs-week" data-first-week={day}>
      <span>
        <b>{he ? `השבוע הראשון · יום ${day}` : `Your first week · day ${day}`}</b>
        <small>{he ? 'עוד צעד באותה מיומנות, ומשהו חדש.' : 'More of the same skill, and something new.'}</small>
      </span>
      <div className="cs-week-steps">
        {picks.map((p) => (
          <button key={p.x.step.id} className="btn small" onClick={() => onOpen(p.x, p.unit)} data-week-step={p.x.step.id}>
            {L(lang, p.x.step.title)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The path header line: the personal goal's progress, else the next rung of the destination ladder. */
export function CourseGoalLine({ course, lang, cs, facts, section }: { course: CourseId; lang: Lang; cs?: CourseStartState; facts?: PathFacts; section?: string }) {
  const he = lang === 'he';
  const g = cs?.goal;
  const def = g ? goalById(course, g.id) : undefined;
  if (g && def) {
    const p = goalProgress(g, facts, new Date());
    return (
      <div className="cs-goal-line" data-goal-line={g.id}>
        <span>
          <b>{L(lang, def.title)}</b>
          <small dir="auto">{he ? `${p.done} / ${p.total} צעדים · נשארו ${p.weeksLeft} שבועות` : `${p.done} / ${p.total} steps · ${p.weeksLeft} weeks left`}</small>
        </span>
        <span className="sec-track" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done} style={{ ['--p' as string]: `${(100 * p.done) / Math.max(1, p.total)}%` }}>
          <span />
        </span>
      </div>
    );
  }
  const at = rungOf(section);
  const next = LADDER[course][Math.min(3, at + 1)];
  if (at >= 3) return null;
  return (
    <div className="cs-goal-line" data-goal-line="ladder">
      <span>
        <small>{he ? 'היעד הבא' : 'Next goal'}</small>
        <b>{L(lang, next)}</b>
      </span>
    </div>
  );
}
