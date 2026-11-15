// The neutral "your teacher here" mascot set for partner builds (docs/SPEC-PARTNER-PITCH.md: no teachers' faces or
// likenesses). A rounded portrait frame with a placeholder silhouette; each of Toni's 12 states is a frame colour and a
// small badge, so each teacher could later get their own set of 12 portraits. Pure SVG.
import type { ToniState } from '../ui/Toni';

type Lang = 'en' | 'he';
export const TEACHER_STATES: ToniState[] = ['idle', 'listen', 'think', 'hint', 'correct', 'streak', 'wrong', 'close', 'wow', 'sleepy', 'draw', 'bye'];

export const STATE_NAME: Record<ToniState, { en: string; he: string }> = {
  idle: { en: 'Ready', he: 'מוכן' },
  listen: { en: 'Listening', he: 'מקשיב' },
  think: { en: 'Thinking', he: 'חושב' },
  hint: { en: 'Hint', he: 'רמז' },
  correct: { en: 'Correct', he: 'נכון' },
  streak: { en: 'On a streak', he: 'ברצף' },
  wrong: { en: 'Not yet', he: 'עוד לא' },
  close: { en: 'Close', he: 'קרוב' },
  wow: { en: 'Wow', he: 'וואו' },
  sleepy: { en: 'Missed you', he: 'התגעגענו' },
  draw: { en: 'Welcome', he: 'ברוכים הבאים' },
  bye: { en: 'See you', he: 'להתראות' },
};

/** Frame colour per state (CSS colours from the active theme). */
const FRAME: Record<ToniState, string> = {
  idle: 'var(--line-strong)',
  listen: 'var(--sky)',
  think: 'var(--lilac)',
  hint: 'var(--now)',
  correct: 'var(--ok)',
  streak: 'var(--accent)',
  wrong: 'var(--bad)',
  close: 'var(--near)',
  wow: 'var(--lilac)',
  sleepy: 'var(--line-strong)',
  draw: 'var(--accent)',
  bye: 'var(--line-strong)',
};

function Badge({ state }: { state: ToniState }) {
  const s = { fill: 'none', stroke: 'var(--ink-c)', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (state) {
    case 'listen':
      return <path d="M-3 -5 Q3 0 -3 5 M1 -8 Q10 0 1 8" {...s} />;
    case 'think':
      return (
        <g fill="var(--ink-c)">
          <circle cx={-5} cy={0} r={2} />
          <circle cx={0} cy={0} r={2} />
          <circle cx={5} cy={0} r={2} />
        </g>
      );
    case 'hint':
      return <path d="M0 -7 L0 2 M0 6 L0 6.5" {...s} />;
    case 'correct':
      return <path d="M-6 0 L-2 4 L6 -5" {...s} />;
    case 'streak':
      return <path d="M-6 4 L-2 -2 L1 1 L6 -6" {...s} />;
    case 'wrong':
      return <path d="M-5 -5 L5 5 M5 -5 L-5 5" {...s} />;
    case 'close':
      return <path d="M-6 0 L6 0" {...s} />;
    case 'wow':
      return <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="var(--ink-c)" />;
    case 'sleepy':
      return <path d="M-5 -4 L4 -4 L-5 4 L4 4" {...s} />;
    case 'draw':
      return <path d="M-6 2 Q0 -8 6 2" {...s} />;
    case 'bye':
      return <path d="M-6 -1 L0 5 L6 -1" {...s} />;
    default:
      return <circle r={3} fill="var(--ink-c)" />;
  }
}

const docLang = (): Lang => (typeof document !== 'undefined' && document.documentElement.lang === 'he' ? 'he' : 'en');

/** The placeholder portrait in a state. Same props as <Toni>; big frames carry the "your teacher here" caption. */
export function TeacherFrame({ state = 'idle', size = 120, label, caption = size >= 100, lang = docLang() }: { state?: ToniState; size?: number; label?: string; caption?: boolean; lang?: Lang }) {
  const c = FRAME[state];
  const name = lang === 'he' ? 'המורה שלך כאן' : 'Your teacher here';
  return (
    <span className={`teacher-frame tf-${state}`} style={{ width: size, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-teacher-frame={state}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <rect x={6} y={6} width={108} height={108} rx={26} fill="var(--card-2)" stroke={c} strokeWidth={6} />
        <clipPath id={`tf-clip-${state}`}>
          <rect x={9} y={9} width={102} height={102} rx={23} />
        </clipPath>
        <g clipPath={`url(#tf-clip-${state})`} fill="var(--ink-dim)" opacity={0.35}>
          <circle cx={60} cy={50} r={20} />
          <path d="M18 116 C 22 86, 40 76, 60 76 C 80 76, 98 86, 102 116 Z" />
        </g>
        <g transform="translate(98 22)">
          <circle r={13} fill={c} stroke="var(--card)" strokeWidth={3} />
          <Badge state={state} />
        </g>
      </svg>
      {caption && (
        <small className="tf-caption" style={{ fontWeight: 600, color: 'var(--ink-dim)', fontSize: Math.max(12, size / 12) }}>
          {name}
        </small>
      )}
    </span>
  );
}
