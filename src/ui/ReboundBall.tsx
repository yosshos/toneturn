// Rebound Ball (drums): even strokes against the click. Each stroke bounces a ball whose height is its loudness, so
// an uneven stroke shows at once; the evenness meter fills after the lap. Engine: src/engine/reboundBall.ts; the
// screen is the beginner shell (BeginnerShell.tsx).

import { evenness, REBOUND_LEVELS, reboundCheck, reboundJudge, reboundLap } from '../engine/reboundBall';
import type { BCheck, BLap, BMatch } from '../engine/beginnerRun';
import type { GameScreenProps } from './gameProps';
import { BeginnerShell, type BeginnerCfg } from './BeginnerShell';

const WHY: Record<string, { en: [string, string]; he: [string, string] }> = {
  uneven: { en: ['Uneven strokes', 'Let the stick bounce back to the same height every time; the wrist leads, the grip stays loose.'], he: ['מכות לא אחידות', 'נותנים למקל לקפוץ חזרה לאותו גובה בכל פעם; פרק היד מוביל, האחיזה רפויה.'] },
  accent: { en: ['The accents did not stand out', 'Lift the stick high for the accent, keep the taps low and close to the head.'], he: ['ההטעמות לא בלטו', 'מרימים את המקל גבוה להטעמה, ומשאירים את המכות הרגילות נמוכות וקרובות לעור.'] },
  swell: { en: ['The swell did not grow and fade', 'Start soft, grow to loud through bar 1, come back to soft through bar 2.'], he: ['הקרשנדו לא גדל ודעך', 'מתחילים חלש, מתחזקים עד חזק לאורך תיבה 1, וחוזרים לחלש לאורך תיבה 2.'] },
  extra: { en: ['Extra strokes', 'One stroke per note: let the stick rebound once and catch it.'], he: ['מכות מיותרות', 'מכה אחת לכל תו: נותנים למקל לקפוץ פעם אחת ותופסים אותו.'] },
  few: { en: ['Almost nothing was heard', 'Play every stroke on its click, from the count-in on.'], he: ['כמעט לא נשמעו מכות', 'מנגנים כל מכה על הקליק שלה, מיד אחרי הספירה.'] },
  time: { en: ['Strokes off the click', 'Each stroke lands with its click; count the beats out loud.'], he: ['מכות לא על הקליק', 'כל מכה נוחתת יחד עם הקליק שלה; סופרים את הפעמות בקול.'] },
};

const CFG: BeginnerCfg = {
  game: 'rebound',
  title: { en: 'Rebound Ball', he: 'הכדור הקופץ' },
  blurb: {
    en: 'Strokes on the click, all the same height: every stroke bounces the ball. Quarters, eighths, accents, doubles, sixteenths, a swell.',
    he: 'מכות על הקליק, כולן באותו גובה: כל מכה מקפיצה את הכדור. רבעים, שמיניות, הטעמות, כפולות, שש־עשריות וקרשנדו.',
  },
  inputs: ['midi', 'mic'],
  capture: 'hits',
  checkMode: (i) => (i === 'midi' ? 'drum-midi' : 'drum-mic'),
  lapOf: (seed, level, lap, run) => reboundLap(seed, level, lap, run),
  judge: () => reboundJudge,
  check: (lap, m, input) => reboundCheck(lap, m, input),
  board: ({ lap, match, now, check, lang }) => <BounceBoard lap={lap} m={match} now={now} check={check} lang={lang} />,
  why: ({ o, lang }) => {
    const k = o.check && !o.check.ok ? (o.check.why ?? 'uneven') : 'time';
    const w = WHY[k] ?? WHY.time;
    return { line: w[lang][0], why: w[lang][1] };
  },
};

function BounceBoard({ lap, m, now, check, lang }: { lap: BLap; m: BMatch | null; now: number; check: BCheck | null; lang: 'he' | 'en' }) {
  const L = REBOUND_LEVELS[lap.level];
  const vels = lap.targets.map((_, i) => (m?.marks[i] === 'hit' ? (m.got[i]?.vel ?? 0) : null));
  const live = vels.filter((v): v is number => v !== null);
  const meter = check?.meter ?? (live.length >= 2 ? evenness(live) : null);
  const label = L.swell ? (lang === 'he' ? 'מעקב אחרי הקרשנדו' : 'Swell follow') : lang === 'he' ? 'אחידות' : 'Evenness';
  return (
    <div className="bg-bounce">
      <div className={`bg-balls n${lap.targets.length}`} dir="ltr" aria-hidden="true">
        {lap.targets.map((t, i) => {
          const v = vels[i];
          const mark = m?.marks[i];
          const h = v === null ? 0 : Math.max(6, Math.round((v / 127) * 100));
          const want = t.level !== undefined ? Math.round(t.level * 100) : t.accent ? 90 : 60;
          return (
            <span key={i} className={`bg-ball ${i === now ? 'now' : ''} ${mark ?? ''} ${t.accent ? 'acc' : ''}`}>
              <i className="bg-want" style={{ insetBlockEnd: `${want}%` }} />
              {v !== null && <b style={{ insetBlockEnd: `${h}%` }} />}
              {lap.targets.length <= 16 && <small>{t.label}</small>}
            </span>
          );
        })}
      </div>
      <div className="bg-meter">
        <span>{label}</span>
        <span className="bg-meter-bar" aria-hidden="true">
          <i style={{ inlineSize: `${meter ?? 0}%` }} />
        </span>
        <b dir="ltr">{meter === null ? '–' : `${meter}`}</b>
      </div>
    </div>
  );
}

export const ReboundBall = (p: GameScreenProps) => <BeginnerShell cfg={CFG} {...p} />;
