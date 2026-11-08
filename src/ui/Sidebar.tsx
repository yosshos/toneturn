// The side menu on a computer or tablet (SPEC-DESKTOP §3.1): replaces the phone's bottom tab bar and the menu sheet from
// 700 px wide. Sections with children expand in place (one at a time, following the current screen); Tools and Check
// yourself group what the menu sheet held. The start side follows the language (right in Hebrew, left in English) —
// all positioning is logical. Below 1100 px (or when collapsed) it is a narrow rail of icons with tooltips.
import { useEffect, useState } from 'react';
import { TAB_ICONS, type TabId } from './Arcade';
import { Logo } from './bits';

export type NavId =
  | TabId
  | 'songs' | 'drills' | 'learned' | 'pieces' | 'charts'
  | 'insights' | 'achievements'
  | 'tuner' | 'metronome' | 'drone' | 'groove' | 'slowdown' | 'mixer' | 'log'
  | 'placement' | 'diagnostics' | 'settings';

type L = { en: string; he: string };
interface Item {
  id: NavId;
  label: L;
}
interface Section extends Item {
  icon: React.ReactNode;
  children?: Item[];
  /** A heading only (no screen of its own): clicking it opens / closes the children. */
  group?: boolean;
}

const I = (d: React.ReactNode) => d;
const ICON = {
  tools: I(<path d="M14.5 6.5l3-3 3 3-3 3zM4 20l9.5-9.5M14 14l5.5 5.5-1.5 1.5L12.5 15.5" />),
  check: I(
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>,
  ),
  mic: I(
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>,
  ),
  gear: I(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>,
  ),
  chevron: I(<path d="M9 6l6 6-6 6" />),
  collapse: I(<path d="M15 6l-6 6 6 6M20 4v16" />),
};

const SECTIONS: Section[] = [
  { id: 'home', label: { en: 'Today', he: 'היום' }, icon: TAB_ICONS.home },
  { id: 'path', label: { en: 'Path', he: 'מסלול' }, icon: TAB_ICONS.path },
  {
    id: 'arcade',
    label: { en: 'Practice', he: 'תרגול' },
    icon: TAB_ICONS.arcade,
    children: [
      { id: 'songs', label: { en: 'Songs', he: 'שירים' } },
      { id: 'drills', label: { en: 'Technique', he: 'טכניקה' } },
      { id: 'learned', label: { en: 'Lessons', he: 'שיעורים' } },
      { id: 'pieces', label: { en: 'My pieces', he: 'היצירות שלי' } },
      { id: 'charts', label: { en: 'Chord charts', he: 'מהלכים' } },
    ],
  },
  {
    id: 'skills',
    label: { en: 'Progress', he: 'התקדמות' },
    icon: TAB_ICONS.skills,
    children: [
      { id: 'insights', label: { en: 'Insights', he: 'תובנות' } },
      { id: 'achievements', label: { en: 'Achievements', he: 'הישגים' } },
    ],
  },
  { id: 'friends', label: { en: 'Community', he: 'קהילה' }, icon: TAB_ICONS.friends },
];
const TOOLS: Section = {
  id: 'tuner',
  group: true,
  label: { en: 'Tools', he: 'כלים' },
  icon: ICON.tools,
  children: [
    { id: 'tuner', label: { en: 'Tuner', he: 'טיונר' } },
    { id: 'metronome', label: { en: 'Metronome', he: 'מטרונום' } },
    { id: 'drone', label: { en: 'Drone', he: 'צליל רקע' } },
    { id: 'groove', label: { en: 'Groove trainer', he: 'מאמן גרוב' } },
    { id: 'slowdown', label: { en: 'Slow down', he: 'האטה' } },
    { id: 'mixer', label: { en: 'Mixer', he: 'מיקסר' } },
    { id: 'log', label: { en: 'Practice log', he: 'רישום אימון' } },
  ],
};

/** Which section a screen belongs to (for the highlight and the open section). */
export function sectionOf(route: string): NavId | 'tools' | null {
  for (const s of SECTIONS) if (s.id === route || s.children?.some((c) => c.id === route)) return s.id;
  if (TOOLS.children!.some((c) => c.id === route)) return 'tools';
  if (route === 'settings' || route === 'diagnostics') return route;
  return null;
}

const COLLAPSE_KEY = 'tt.side.collapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

export function Sidebar({ route, lang, onNav, badges, me }: { route: string; lang: 'en' | 'he'; onNav: (id: NavId) => void; badges?: Partial<Record<NavId, number | boolean>>; me: { name: string | null; streak: number; onOpen: () => void } }) {
  const here = sectionOf(route);
  // Screens outside the menu (a lesson, a game) keep the last section lit.
  const [last, setLast] = useState<NavId | 'tools' | null>(here ?? 'home');
  useEffect(() => {
    if (here) setLast(here);
  }, [here]);
  const lit = here ?? last;
  const [open, setOpen] = useState<string | null>(lit === 'tools' ? 'tools' : (lit as string));
  useEffect(() => {
    if (lit) setOpen(lit);
  }, [lit]);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // The rail (tablet width, or collapsed) has no room for nested items: a group opens the Practice hub, which holds them.
  const [wide, setWide] = useState(() => typeof matchMedia === 'undefined' || matchMedia('(min-width: 1100px)').matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia('(min-width: 1100px)');
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  const rail = collapsed || !wide;
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !c;
    });
  };
  const L = (x: L) => x[lang];
  const svg = (d: React.ReactNode) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
  const badge = (id: NavId) => {
    const b = badges?.[id];
    if (!b) return null;
    return <span className="sn-badge">{typeof b === 'number' ? b : ''}</span>;
  };
  const section = (s: Section, key: string) => {
    const isOpen = open === key && !!s.children;
    const on = lit === key;
    return (
      <div key={key} className={`sn-sec ${on ? 'on' : ''} ${isOpen ? 'open' : ''}`}>
        <div className="sn-row">
          <button
            className={`sn-item ${on && route === s.id && !s.group ? 'current' : ''}`}
            onClick={() => (s.group ? (rail ? onNav('arcade') : setOpen(isOpen ? null : key)) : onNav(s.id))}
            aria-current={!s.group && route === s.id ? 'page' : undefined}
            aria-expanded={s.group ? isOpen : undefined}
            title={L(s.label)}
            data-nav={s.group ? key : s.id}
          >
            {svg(s.icon)}
            <span className="sn-label">{L(s.label)}</span>
            {badge(s.id)}
          </button>
          {s.children && !s.group && (
            <button className="sn-chev" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} aria-label={L(s.label)}>
              {svg(ICON.chevron)}
            </button>
          )}
          {s.group && <span className="sn-chev passive" aria-hidden="true">{svg(ICON.chevron)}</span>}
        </div>
        {isOpen && (
          <div className="sn-sub" role="group" aria-label={L(s.label)}>
            {s.children!.map((c) => (
              <button key={c.id} className={`sn-subitem ${route === c.id ? 'current' : ''}`} onClick={() => onNav(c.id)} aria-current={route === c.id ? 'page' : undefined} data-nav={c.id}>
                {L(c.label)}
                {badge(c.id)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  return (
    <nav className={`side-nav ${collapsed ? 'collapsed' : ''}`} aria-label={lang === 'he' ? 'ניווט' : 'Navigation'} data-side-nav="1">
      <div className="sn-brand" dir="ltr">
        <span className="sn-logo" aria-hidden="true">
          <Logo bare size={32} />
        </span>
        <span className="sn-label sn-word">
          The 7<span className="wordmark-th">th</span> Sense
        </span>
      </div>
      <div className="sn-list">
        {SECTIONS.map((s) => section(s, s.id))}
        <div className="sn-hr" />
        {section(TOOLS, 'tools')}
        <div className="sn-sec">
          <div className="sn-row">
            <button className="sn-item" onClick={() => onNav('placement')} title={lang === 'he' ? 'בדיקת רמה' : 'Find my level'} data-nav="placement">
              {svg(ICON.check)}
              <span className="sn-label">{lang === 'he' ? 'בדיקת רמה' : 'Find my level'}</span>
            </button>
          </div>
        </div>
        <div className={`sn-sec ${lit === 'diagnostics' ? 'on' : ''}`}>
          <div className="sn-row">
            <button className={`sn-item ${route === 'diagnostics' ? 'current' : ''}`} onClick={() => onNav('diagnostics')} title={lang === 'he' ? 'בדיקת מיקרופון וצליל' : 'Mic & sound check'} data-nav="diagnostics">
              {svg(ICON.mic)}
              <span className="sn-label">{lang === 'he' ? 'בדיקת מיקרופון וצליל' : 'Mic & sound check'}</span>
            </button>
          </div>
        </div>
        <div className="sn-hr" />
        <div className={`sn-sec ${lit === 'settings' ? 'on' : ''}`}>
          <div className="sn-row">
            <button className={`sn-item ${route === 'settings' ? 'current' : ''}`} onClick={() => onNav('settings')} title={lang === 'he' ? 'הגדרות' : 'Settings'} data-nav="settings">
              {svg(ICON.gear)}
              <span className="sn-label">{lang === 'he' ? 'הגדרות' : 'Settings'}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="sn-foot">
        <button className="sn-me" onClick={me.onOpen} title={me.name ?? (lang === 'he' ? 'הפרופיל שלי' : 'My profile')}>
          <span className="sn-avatar" aria-hidden="true">
            {(me.name ?? '♪').slice(0, 1)}
          </span>
          <span className="sn-label sn-me-text">
            <b>{me.name ?? (lang === 'he' ? 'הפרופיל שלי' : 'My profile')}</b>
            <small>{lang === 'he' ? `רצף: ${me.streak} ימים` : `${me.streak}-day streak`}</small>
          </span>
        </button>
        <button className="sn-collapse" onClick={toggleCollapsed} aria-label={lang === 'he' ? (collapsed ? 'להרחיב את התפריט' : 'לכווץ את התפריט') : collapsed ? 'Expand the menu' : 'Collapse the menu'} aria-pressed={collapsed}>
          {svg(ICON.collapse)}
        </button>
      </div>
    </nav>
  );
}
