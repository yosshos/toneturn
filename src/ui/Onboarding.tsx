// The first minute (owner 2026-11-08: "the first screen is uninviting — it should open with an animation of the logo,
// and think again whether a questionnaire is the right first step"). Research (Duolingo, Simply Piano, Yousician,
// Headspace): open with the brand, one promise, a first win within ~20 s, then at most a few questions; ask the rest
// later, in context. So:
//   Splash   — the logo draws itself (the ear, the clef-7, the wave), the name fades in; tap to skip; reduced motion = still.
//   Welcome  — one line of promise · Start · I already have an account.
//   Taste    — two notes: which one was higher? (a first, real win before any question)
//   Courses  — what to learn (everything else has sensible defaults; the full questionnaire stays in Settings).
//   Then the first course starts (SPEC-COURSE-START, 2026-11-11): its welcome card asks "Where are you?" (that also sets
//   the level here), the setup is a musical moment, a taste lesson, a measured first win — no level test before music.
import { Toni } from './Toni';
import { COURSES, courseOf, type CourseId } from '../engine/courses';
import { KIT_NOTICE } from '../engine/drumKit';
import { Glyph } from './Glyph';
import { useEffect, useRef, useState } from 'react';
import { intakeSettings, trackOf, type Intake, type Level4 } from '../engine/intake';
import { defaultPacks, type Goal } from '../engine/path';
import type { Settings } from '../storage/progress';
import type { IntakeResult } from './Intake';
import { piano } from './services';

type Lang = 'en' | 'he';

/** The logo, drawn stroke by stroke (same geometry as bits.Logo, v2: ink outline, flat fills). */
export function SplashLogo({ size = 132, onDark = false }: { size?: number; onDark?: boolean }) {
  const ink = '#1E1033';
  const EAR = 'M226 206 C226 132 274 96 318 96 C380 96 420 146 420 208 C420 266 388 290 368 320 C348 350 358 404 304 418 C266 428 242 404 236 378';
  const WAVE = 'M240 286 Q220 222 200 286 Q182 338 164 286 Q149 250 134 286 Q122 308 110 286';
  const SEVEN = 'M272 186 L356 186 Q370 186 364 200 L312 330';
  return (
    <svg width={size} height={size} viewBox="60 60 420 420" aria-hidden="true" className="splash-logo">
      <g transform="translate(256 256) scale(0.86) translate(-306 -256)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="sp-wave" pathLength={1} d={WAVE} stroke={ink} strokeWidth="44" />
        <path className="sp-wave" pathLength={1} d={WAVE} stroke="#12C9B4" strokeWidth="24" />
        <path className="sp-ear" pathLength={1} d={EAR} stroke={onDark ? '#FFFFFF' : ink} strokeWidth="80" />
        <path className="sp-ear" pathLength={1} d={EAR} stroke="#FFD43B" strokeWidth="56" />
        <path className="sp-seven" pathLength={1} d={SEVEN} stroke={ink} strokeWidth="40" />
        <path className="sp-seven" pathLength={1} d={SEVEN} stroke="#FFFFFF" strokeWidth="20" />
      </g>
      <circle className="sp-dot d1" cx="430" cy="196" r="26" fill="#FF5FA2" stroke={ink} strokeWidth="9" />
      <circle className="sp-dot d2" cx="430" cy="268" r="26" fill="#FF5FA2" stroke={ink} strokeWidth="9" />
    </svg>
  );
}

/** The opening: ~1.6 s, tap anywhere to skip. Calls onDone once. */
export function Splash({ onDone, lang = 'he' }: { onDone: () => void; lang?: Lang }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const reduced = document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 0.63 (owner): long enough to read the name and the slogan.
    const id = setTimeout(finish, reduced ? 3100 : 5300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="splash" onPointerDown={finish} role="presentation" data-splash="1">
      <SplashLogo onDark />
      <div className="splash-word">{lang === 'he' ? 'החוש השביעי' : 'The 7th Sense'}</div>
      <div className="splash-slogan">{lang === 'he' ? 'לשמוע. להבין. לבצע.' : 'Hear. Understand. Perform.'}</div>
      <svg className="splash-staff" viewBox="0 0 390 130" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 2H390M0 32H390M0 62H390M0 92H390M0 122H390" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

const TX = {
  en: {
    promise: 'Train the ear that musicians have.',
    sub: 'Hear intervals, chords and rhythm — sing, play and read — a few minutes a day, at your level.',
    start: 'Get started',
    account: 'I already have an account',
    tasteQ: 'Two notes. Which one was higher?',
    listen: 'Listen',
    first: 'The first',
    second: 'The second',
    right: 'Right — that is your ear at work.',
    wrong: (first: boolean) => `It was the ${first ? 'first' : 'second'} one — the ear learns fast. Another pair?`,
    again: 'Again',
    next: 'Continue',
    goalQ: 'What would you like most?',
    instQ: 'What do you play?',
    levelQ: 'Where are you starting from?',
    startQ: 'How shall we begin?',
    findLevel: 'Find my level',
    findHint: 'About 10 minutes, one skill after another — stop any time and continue later.',
    basics: 'Start from the beginning',
    basicsHint: 'The first lesson, right now.',
    later: 'You can change all of this later in Settings.',
    skip: 'Skip',
  },
  he: {
    promise: 'לאמן את האוזן שיש למוזיקאים.',
    sub: 'לשמוע מרווחים, אקורדים וקצב — לשיר, לנגן ולקרוא — כמה דקות ביום, ברמה שלכם.',
    start: 'להתחיל',
    account: 'יש לי כבר חשבון',
    tasteQ: 'שני צלילים. איזה מהם היה גבוה יותר?',
    listen: 'להקשיב',
    first: 'הראשון',
    second: 'השני',
    right: 'נכון — זאת האוזן שלכם בעבודה.',
    wrong: (first: boolean) => `דווקא ${first ? 'הראשון' : 'השני'} היה גבוה יותר — האוזן לומדת מהר. עוד זוג?`,
    again: 'שוב',
    next: 'המשך',
    goalQ: 'מה הכי מעניין אתכם?',
    instQ: 'על מה אתם מנגנים?',
    levelQ: 'מאיפה אתם מתחילים?',
    startQ: 'איך נתחיל?',
    findLevel: 'בדיקת רמה',
    findHint: 'כעשר דקות, מיומנות אחרי מיומנות — אפשר לעצור בכל רגע ולהמשיך אחר כך.',
    basics: 'להתחיל מההתחלה',
    basicsHint: 'השיעור הראשון, עכשיו.',
    later: 'אפשר לשנות הכל אחר כך בהגדרות.',
    skip: 'דילוג',
  },
};

type Step = 'welcome' | 'taste' | 'courses';
// 0.61 (SPEC-COURSES): "goal" and "instrument" became one step — the courses. SPEC-COURSE-START: the level and "how to
// begin" moved into the first course's welcome card.
const ORDER: Step[] = ['welcome', 'taste', 'courses'];

/** The intake built from the three answers (the rest: defaults; the full questionnaire stays in Settings). */
export function quickIntake(goal: Goal, inst: string, music: Level4): IntakeResult {
  const theory = music;
  const reading = (music >= 2 ? 2 : music) as 0 | 1 | 2;
  const plays = inst === 'none' ? [] : [inst];
  const intake: Intake = {
    v: 1,
    at: new Date().toISOString(),
    music,
    singing: (inst === 'voice' ? Math.max(1, music) : 1) as Level4,
    theory,
    reading,
    plays,
    priorities: null,
    motivation: 'learn',
    minutes: 10,
    goal,
    leaveOut: [],
    packs: defaultPacks(trackOf({ music, theory, reading }), plays, goal),
    noSing: false,
    noMic: false,
  };
  const s = intakeSettings(intake);
  const patch: Partial<Settings> = { intake, track: s.track, cleanView: s.cleanView, miniLessons: s.miniLessons, ...(s.noteViews ? { noteViews: s.noteViews } : {}), goal, pathLeaveOut: [], pathPacks: intake.packs, noSing: false, noMic: false };
  if (inst === 'guitar' || inst === 'bass' || inst === 'keys' || inst === 'strings') patch.instrument = inst;
  return { intake, patch };
}

/** The intake for a set of courses at a music level: the goal follows the first course, the instrument the first
 *  instrument course (onboarding, and the first course's self-report that refines the level). */
export function onboardingIntake(picked: CourseId[], music: Level4): IntakeResult {
  const first = picked[0] ?? 'ear';
  const inst = picked.find((c) => c === 'keys' || c === 'guitar' || c === 'bass' || c === 'drums') ?? (picked.includes('voice') ? 'voice' : 'none');
  return quickIntake(courseOf(first).goal, inst, music);
}

export function Onboarding({ lang, onDone, onSignIn }: { lang: Lang; onDone: (r: IntakeResult) => void; onSignIn: () => void }) {
  const tx = TX[lang];
  const [step, setStep] = useState<Step>('welcome');
  const [picked, setPicked] = useState<CourseId[]>([]);
  const first = picked[0] ?? 'ear';
  const togglePick = (c: CourseId) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  // The first course starts with its welcome card; its "Where are you?" refines the level (0 until then).
  const finish = () => {
    const r = onboardingIntake(picked, 0);
    onDone({ ...r, patch: { ...r.patch, courses: picked.length ? picked : ['ear'], activeCourse: first, courseStart: { [first]: { fromOnboarding: true } } } });
  };
  const [taste, setTaste] = useState<{ hi: 0 | 1; heard: boolean; said: 'right' | 'wrong' | null }>(() => ({ hi: Math.random() < 0.5 ? 0 : 1, heard: false, said: null }));
  const i = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(ORDER.length - 1, i + 1)]);
  const back = () => setStep(ORDER[Math.max(0, i - 1)]);

  const playTaste = async () => {
    await piano.unlock();
    const lo = 60 + Math.floor(Math.random() * 5);
    const hi = lo + 3 + Math.floor(Math.random() * 4);
    const [a, b] = taste.hi === 0 ? [hi, lo] : [lo, hi];
    const ctl = new AbortController();
    await piano
      .play(
        [
          { midi: a, start: 0, duration: 0.7, velocity: 0.72 },
          { midi: b, start: 0.9, duration: 0.9, velocity: 0.72 },
        ],
        2,
        ctl.signal,
      )
      .catch(() => {});
    setTaste((t) => ({ ...t, heard: true }));
  };
  const answerTaste = (k: 0 | 1) => setTaste((t) => ({ ...t, said: k === t.hi ? 'right' : 'wrong' }));

  return (
    <main className={`onboarding ob-${step}`} data-onboarding={step}>
      {step !== 'welcome' && (
        <header className="ob-head">
          <button className="icon-btn" onClick={back} aria-label={lang === 'he' ? 'חזרה' : 'Back'}>
            <span className="flip-rtl">←</span>
          </button>
          <div className="ob-progress" aria-hidden="true">
            {ORDER.slice(1).map((s, k) => (
              <i key={s} className={k < i ? 'done' : k === i - 1 ? 'now' : ''} />
            ))}
          </div>
          {step === 'taste' ? (
            <button className="link ob-skip" onClick={next}>
              {tx.skip}
            </button>
          ) : (
            <span className="ob-skip" />
          )}
        </header>
      )}

      {step === 'welcome' && (
        <section className="ob-welcome">
          <div className="ob-brand">
            <SplashLogo size={44} />
            <span className="ob-word">{lang === 'he' ? 'החוש השביעי' : 'The 7th Sense'}</span>
          </div>
          <div className="ob-hero">
            <Toni state="draw" size={200} />
          </div>
          <h1>{lang === 'he' ? 'לשמוע. להבין. לבצע.' : 'Hear. Understand. Perform.'}</h1>
          <p>{lang === 'he' ? 'שמיעה, שירה ונגינה, עשר דקות ביום.' : 'Ear, voice and playing, ten minutes a day.'}</p>
          <div className="ob-actions">
            <button className="btn primary ob-cta" onClick={next} data-ob="start">
              {tx.start}
            </button>
            <button className="btn ghost ob-account" onClick={onSignIn} data-ob="account">
              {tx.account}
            </button>
          </div>
        </section>
      )}

      {step === 'taste' && (
        <section className="ob-taste">
          <h1>{tx.tasteQ}</h1>
          <button className={`ob-listen ${taste.heard ? 'heard' : ''}`} onClick={() => void playTaste()} data-ob="listen" aria-label={tx.listen}>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10v4h4l5 4V6L8 10z" />
              <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
            </svg>
            <span>{tx.listen}</span>
          </button>
          <div className="ob-pair">
            {([0, 1] as const).map((k) => (
              <button key={k} className={`ob-choice ${taste.said && k === taste.hi ? 'right' : ''} ${taste.said === 'wrong' && k !== taste.hi ? 'wrong' : ''}`} disabled={!taste.heard || !!taste.said} onClick={() => answerTaste(k)} data-ob={`taste-${k}`}>
                <b>{k === 0 ? tx.first : tx.second}</b>
              </button>
            ))}
          </div>
          <p className={`ob-said ${taste.said ?? ''}`} aria-live="polite">
            {taste.said === 'right' ? tx.right : taste.said === 'wrong' ? tx.wrong(taste.hi === 0) : ' '}
          </p>
          <div className="ob-actions">
            {taste.said === 'wrong' && (
              <button className="btn ghost" onClick={() => setTaste({ hi: Math.random() < 0.5 ? 0 : 1, heard: false, said: null })}>
                {tx.again}
              </button>
            )}
            <button className="btn primary ob-cta" disabled={!taste.said} onClick={next} data-ob="taste-next">
              {tx.next}
            </button>
          </div>
        </section>
      )}

      {step === 'courses' && (
        <section>
          <h1>{lang === 'he' ? 'מה בא לך ללמוד?' : 'What would you like to learn?'}</h1>
          <p className="field-hint">{lang === 'he' ? 'אפשר לבחור כמה. כל קורס הוא מסלול נפרד, ומחליפים ביניהם בלחיצה.' : 'Pick as many as you like. Each course is its own path; switch with one tap.'}</p>
          <div className="ob-course-grid" role="group">
            {COURSES.filter((c) => c.id !== 'bass').map((c) => {
              const on = picked.includes(c.id);
              return (
                <button key={c.id} className={`ob-course ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => togglePick(c.id)} data-ob={`course-${c.id}`}>
                  <Glyph kind={c.glyph} color={c.color} size={44} />
                  <b>{c.name[lang]}</b>
                  {c.beta && <span className="beta-chip">{lang === 'he' ? 'בטא' : 'Beta'}</span>}
                </button>
              );
            })}
          </div>
          {/* 0.66 (owner): a course's need, shown once it is picked (drums: an e-kit by MIDI is recommended). */}
          {COURSES.filter((c) => c.note && picked.includes(c.id)).map((c) => (
            <p key={c.id} className="kit-notice ob-course-note" data-course-note={c.id}>
              <b>{c.id === 'drums' ? KIT_NOTICE[lang] : c.note![lang]}</b>
            </p>
          ))}
          <button className="btn primary ob-next" disabled={!picked.length} onClick={finish} data-ob="courses-next">
            {lang === 'he' ? 'המשך' : 'Continue'}
          </button>
        </section>
      )}
    </main>
  );
}
