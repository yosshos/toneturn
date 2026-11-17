// The side menu on a computer or tablet (SPEC-DESKTOP §3.1): replaces the phone's bottom tab bar and the menu sheet from
// 700 px wide. Sections with children expand in place (one at a time, following the current screen); Tools and Check
// yourself group what the menu sheet held. The start side follows the language (right in Hebrew, left in English) —
// all positioning is logical. Below 1100 px (or when collapsed) it is a narrow rail of icons with tooltips.
import { CourseChip } from './CourseSwitcher';
import { useCourse } from './courseContext';
import { useEffect, useState, type ReactNode } from 'react';
import { NavIcon, type TabId } from './Arcade';
import { Logo } from './brand/Logo';
import { Icon } from './icons';

export type NavId =
  | TabId
  | 'songs' | 'repertoire' | 'drills' | 'learned' | 'pieces' | 'charts' | 'improv' | 'puzzle' | 'exams' | 'gamelist'
  | 'insights' | 'achievements' | 'diary' | 'recordings'
  | 'tuner' | 'metronome' | 'drone' | 'groove' | 'slowdown' | 'mixer' | 'log' | 'chordfinder' | 'chordbuilder'
  | 'placement' | 'diagnostics' | 'settings'
  | 'encore';

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


// 0.61 (SPEC-REDESIGN NavMap): the four screens of the active course first (their contents follow the course), then
// what every course shares, then the tools. Songs, pieces, charts, technique… now live inside Practice, per course.
const SECTIONS: Section[] = [
  { id: 'home', label: { en: 'Today', he: 'היום' }, icon: <NavIcon id="home" size={22} /> },
  { id: 'path', label: { en: 'Path', he: 'מסלול' }, icon: <NavIcon id="path" size={22} /> },
  // Encore (SPEC-PHRASE-STUDIO §17): "הדרן" under Practice.
  { id: 'arcade', label: { en: 'Practice', he: 'תרגול' }, icon: <NavIcon id="arcade" size={22} />, children: [{ id: 'encore', label: { en: 'Encore', he: 'הדרן' } }] },
  {
    id: 'skills',
    label: { en: 'Progress', he: 'התקדמות' },
    icon: <NavIcon id="skills" size={22} />,
    children: [
      { id: 'insights', label: { en: 'Insights', he: 'תובנות' } },
      // AUDIT-5: measured practice time, the quality ledger and the journal.
      { id: 'diary', label: { en: 'Practice diary', he: 'יומן אימון' } },
      // SPEC-PHRASE-STUDIO §6 / §17: every take, kept on the device.
      { id: 'recordings', label: { en: 'My recordings', he: 'ההקלטות שלי' } },
    ],
  },
];
const SHARED: Section[] = [
  { id: 'friends', label: { en: 'Community & league', he: 'קהילה וליגה' }, icon: <NavIcon id="friends" size={22} /> },
  { id: 'achievements', label: { en: 'Achievements', he: 'הישגים' }, icon: <NavIcon id="achievements" size={22} /> },
];
const TOOLS: Section = {
  id: 'tuner',
  group: true,
  label: { en: 'Tools', he: 'כלים' },
  icon: <NavIcon id="tools" size={22} />,
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

/** The guitar course adds the chord finder (GUITAR_DEEPENING §6.3) after the tuner. */
const CHORD_BUILDER = { id: 'chordbuilder' as const, label: { en: 'Chord builder', he: 'בונה אקורדים' } };
const TOOLS_GUITAR: Section = { ...TOOLS, children: [TOOLS.children![0], { id: 'chordfinder', label: { en: 'Chord finder', he: 'מאתר אקורדים' } }, CHORD_BUILDER, ...TOOLS.children!.slice(1)] };
/** The keys course adds the chord & cadence builder after the tuner. */
const TOOLS_KEYS: Section = { ...TOOLS, children: [TOOLS.children![0], CHORD_BUILDER, ...TOOLS.children!.slice(1)] };

/** Which section a screen belongs to (for the highlight and the open section). */
export function sectionOf(route: string): NavId | 'tools' | null {
  for (const s of [...SECTIONS, ...SHARED]) if (s.id === route || s.children?.some((c) => c.id === route)) return s.id;
  if (['games', 'songs', 'repertoire', 'pieces', 'charts', 'drills', 'improv', 'licks', 'transcribe', 'transcribe-coach', 'learned', 'exams', 'puzzle', 'vocal', 'singalong'].includes(route)) return 'arcade';
  if (TOOLS.children!.some((c) => c.id === route) || route === 'chordfinder' || route === 'chordbuilder') return 'tools';
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

export function Sidebar({ route, lang, onNav, badges, me, extra }: { route: string; lang: 'en' | 'he'; onNav: (id: NavId) => void; badges?: Partial<Record<NavId, number | boolean>>; me: { name: string | null; streak: number; onOpen: () => void }; extra?: ReactNode }) {
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
            data-nav={s.group ? `group:${key}` : s.id}
          >
            {s.icon}
            <span className="sn-label">{L(s.label)}</span>
            {badge(s.id)}
          </button>
          {s.children && !s.group && (
            <button className="sn-chev" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} aria-label={L(s.label)}>
              <Icon k="fwd" size={20} />
            </button>
          )}
          {s.group && <span className="sn-chev passive" aria-hidden="true"><Icon k="fwd" size={20} /></span>}
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
  const course = useCourse();
  return (
    <nav className={`side-nav ${collapsed ? 'collapsed' : ''}`} aria-label={lang === 'he' ? 'ניווט' : 'Navigation'} data-side-nav="1">
      <div className="sn-brand" dir="ltr">
        <span className="sn-logo" aria-hidden="true">
          <Logo size={32} />
        </span>
        <span className="sn-label sn-word">
          The 7<span className="wordmark-th">th</span> Sense
        </span>
      </div>
      {!collapsed && <CourseChip active={course.active} lang={lang} onOpen={course.open} variant="side" />}
      <button className="sn-search sn-label-wrap" onClick={() => dispatchEvent(new Event('tt-open-search'))} title={lang === 'he' ? 'חיפוש (Ctrl K)' : 'Search (Ctrl K)'} data-nav-search="1">
        <Icon k="search" size={16} />
        <span className="sn-label">{lang === 'he' ? 'חיפוש' : 'Search'}</span>
        <kbd className="sn-label">Ctrl K</kbd>
      </button>
      <div className="sn-list">
        <div className="sn-cap">{lang === 'he' ? 'הקורס' : 'Course'}</div>
        {SECTIONS.map((s) => section(s, s.id))}
        <div className="sn-cap">{lang === 'he' ? 'של כולם' : 'Shared'}</div>
        {SHARED.map((s) => section(s, s.id))}
        <div className="sn-hr" />
        {section(course.active === 'guitar' ? TOOLS_GUITAR : course.active === 'keys' ? TOOLS_KEYS : TOOLS, 'tools')}
        <div className="sn-hr" />
        <div className={`sn-sec ${lit === 'settings' ? 'on' : ''}`}>
          <div className="sn-row">
            <button className={`sn-item ${route === 'settings' ? 'current' : ''}`} onClick={() => onNav('settings')} title={lang === 'he' ? 'הגדרות' : 'Settings'} data-nav="settings">
              <Icon k="settings" size={20} />
              <span className="sn-label">{lang === 'he' ? 'הגדרות' : 'Settings'}</span>
            </button>
          </div>
        </div>
      </div>
      {extra && <div className="sn-extra">{extra}</div>}
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
          <Icon k="sidebar" size={20} />
        </button>
      </div>
    </nav>
  );
}
